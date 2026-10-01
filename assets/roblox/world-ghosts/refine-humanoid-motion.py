# 파일명: assets/roblox/world-ghosts/refine-humanoid-motion.py
"""기존 스킨드 GLB를 보존한 채 공용 휴머노이드 고퀄 모션 파생본을 만든다.

원본 메시/재질/스킨은 수정하지 않는다. 이 스크립트는 기존 GLB를 Blender로 불러온 뒤
표준 휴머노이드 관절에 새 액션을 굽고 별도 GLB와 evidence.json을 출력한다.
게임플레이 이동, 데미지, 히트박스, 쿨다운 권한은 포함하지 않는다.
"""
import argparse
import hashlib
import json
import math
import struct
import sys
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parent
PARSER = argparse.ArgumentParser()
PARSER.add_argument('--source', type=Path, default=ROOT / 'native' / 'mesh' / 'bride.glb')
PARSER.add_argument('--output', type=Path, default=ROOT / 'native' / 'mesh' / 'bride-motion-v2')
PARSER.add_argument('--render-dir', type=Path)
_argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else None
ARGS = PARSER.parse_args(_argv)
ARGS.output.mkdir(parents=True, exist_ok=True)

FPS = 30
CLIPS = {
    'hero_idle_hq': 3.60,
    'hero_walk_hq': 1.05,
    'hero_run_hq': 0.72,
    'hero_start_hq': 0.75,
    'hero_stop_hq': 0.66,
    'hero_turn_90_hq': 0.78,
}
REQUIRED_BONES = {
    'Hips','Spine','Chest','Head',
    'UpperArmL','UpperArmR','ForearmL','ForearmR',
    'ThighL','ThighR','ShinL','ShinR','FootL','FootR'
}
PRIMARY_QA_BONES = (
    'Hips','Spine','Chest','Head',
    'UpperArmL','UpperArmR','ForearmL','ForearmR',
    'ThighL','ThighR','ShinL','ShinR','FootL','FootR'
)
SECONDARY_QA_BONES = tuple(
    [f'Hair{i}_{j}' for i in range(12) for j in range(3)]
    + [f'Hem{i}' for i in range(8)]
    + [f'Tie{i}' for i in range(3)]
)
LOOP_CLIPS = ('hero_idle_hq','hero_walk_hq','hero_run_hq')
QA_THRESHOLDS = {
    'loopRotationMaxRad': 0.015,
    'loopLocationMax': 0.004,
    'transitionRotationMaxRad': 0.025,
    'rootRotationMaxRad': 1e-7,
    'rootLocationMax': 1e-7,
    'maxEulerRad': 1.60,
    'leftRightPhaseErrorRad': 0.020,
    'footContactLateralVerticalDriftNormalizedMax': 0.035,
    'secondaryRotationRangeMinRad': 0.010,
    'primaryJointRotationRangeMinRad': {
        'Hips': 0.045,
        'Spine': 0.025,
        'Chest': 0.025,
        'Head': 0.025,
        'UpperArmL': 0.18,
        'UpperArmR': 0.18,
        'ThighL': 0.35,
        'ThighR': 0.35,
        'ShinL': 0.18,
        'ShinR': 0.18,
    },
}


def clamp01(value):
    return max(0.0, min(1.0, float(value)))


def smoothstep(value):
    value = clamp01(value)
    return value * value * (3.0 - 2.0 * value)


def curve(t, keys):
    """비균일 키포즈 사이를 부드럽게 보간한다. 단순 주기 사인으로 본체를 흔들지 않는다."""
    if t <= keys[0][0]:
        return keys[0][1]
    if t >= keys[-1][0]:
        return keys[-1][1]
    for (a, va), (b, vb) in zip(keys, keys[1:]):
        if a <= t <= b:
            u = smoothstep((t - a) / max(1e-8, b - a))
            return va + (vb - va) * u
    return keys[-1][1]


def phase_curve(t, keys):
    return curve(t % 1.0, keys)


def glb_document(path):
    raw = path.read_bytes()
    magic, version, total = struct.unpack_from('<4sII', raw, 0)
    assert magic == b'glTF' and version == 2 and total == len(raw)
    offset = 12
    document = None
    while offset < total:
        length, kind = struct.unpack_from('<II', raw, offset)
        offset += 8
        chunk = raw[offset:offset + length]
        offset += length
        if kind == 0x4E4F534A:
            document = json.loads(chunk.decode('utf-8').rstrip('\x00 '))
    assert document is not None
    return document


source = ARGS.source.resolve()
assert source.is_file(), f'SOURCE_GLB_MISSING:{source}'
source_hash = hashlib.sha256(source.read_bytes()).hexdigest()

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(source))

armatures = [obj for obj in bpy.context.scene.objects if obj.type == 'ARMATURE']
assert armatures, 'SOURCE_ARMATURE_MISSING'
RIG = max(armatures, key=lambda obj: len(obj.pose.bones))
bone_names = {bone.name for bone in RIG.pose.bones}
missing = sorted(REQUIRED_BONES - bone_names)
assert not missing, 'SOURCE_STANDARD_BONES_MISSING:' + ','.join(missing)

# 기존 GLB의 액션은 원본 파일에 그대로 남아 있다. 파생본에는 새 공용 모션만 굽는다.
if RIG.animation_data:
    RIG.animation_data.action = None
for action in list(bpy.data.actions):
    bpy.data.actions.remove(action)

SCENE = bpy.context.scene
SCENE.render.fps = FPS
RIG['MotionDerivative'] = 'HERO_FOUNDATION_HQ_V2'
RIG['SourceSha256'] = source_hash
RIG['ProductionVerified'] = False


def reset_pose():
    for pose_bone in RIG.pose.bones:
        pose_bone.rotation_mode = 'XYZ'
        pose_bone.rotation_euler = (0.0, 0.0, 0.0)
        pose_bone.location = (0.0, 0.0, 0.0)
        pose_bone.scale = (1.0, 1.0, 1.0)


def rot(name, x=0.0, y=0.0, z=0.0):
    bone = RIG.pose.bones.get(name)
    if bone:
        bone.rotation_euler = (x, y, z)


def loc(name, x=0.0, y=0.0, z=0.0):
    bone = RIG.pose.bones.get(name)
    if bone:
        bone.location = (x, y, z)


def pose_snapshot(names=None):
    selected = names or tuple(bone.name for bone in RIG.pose.bones)
    out = {}
    for name in selected:
        bone = RIG.pose.bones.get(name)
        if not bone:
            continue
        out[name] = {
            'r': tuple(float(v) for v in bone.rotation_euler),
            'l': tuple(float(v) for v in bone.location),
        }
    return out


def apply_snapshot(snapshot):
    for name, row in snapshot.items():
        bone = RIG.pose.bones.get(name)
        if not bone:
            continue
        bone.rotation_mode = 'XYZ'
        bone.rotation_euler = row['r']
        bone.location = row['l']


def blend_snapshots(a, b, weight):
    weight = smoothstep(weight)
    names = set(a) | set(b)
    out = {}
    for name in names:
        ar = a.get(name, {'r': (0,0,0), 'l': (0,0,0)})
        br = b.get(name, {'r': (0,0,0), 'l': (0,0,0)})
        out[name] = {
            'r': tuple(ar['r'][i] + (br['r'][i] - ar['r'][i]) * weight for i in range(3)),
            'l': tuple(ar['l'][i] + (br['l'][i] - ar['l'][i]) * weight for i in range(3)),
        }
    return out


def snapshot_distance(a, b, names=PRIMARY_QA_BONES):
    max_rotation = 0.0
    max_location = 0.0
    for name in names:
        if name not in a or name not in b:
            continue
        max_rotation = max(
            max_rotation,
            max(abs(a[name]['r'][i] - b[name]['r'][i]) for i in range(3))
        )
        max_location = max(
            max_location,
            max(abs(a[name]['l'][i] - b[name]['l'][i]) for i in range(3))
        )
    return {'rotationMaxRad': max_rotation, 'locationMax': max_location}


def detail_face_and_hands(t, moving=0.0, alert=0.0):
    # 눈/손이 완전히 정지한 마네킹처럼 보이지 않게 작은 비주기 키포즈를 추가한다.
    blink = curve(t, [
        (0.00,0.0),(0.17,0.0),(0.205,1.0),(0.235,0.0),
        (0.61,0.0),(0.645,0.78),(0.675,0.0),(1.00,0.0)
    ])
    gaze = curve(t, [(0.00,-0.06),(0.22,-0.015),(0.46,0.045),(0.72,0.018),(1.00,-0.06)])
    for side, sign in [('L',-1),('R',1)]:
        eye = RIG.pose.bones.get('Eye' + side)
        if eye:
            eye.rotation_euler.y = gaze * (0.65 + alert * 0.25)
        lid = RIG.pose.bones.get('Lid' + side)
        if lid:
            lid.rotation_euler.x = blink * (0.82 - moving * 0.18)
        hand = RIG.pose.bones.get('Hand' + side)
        if hand:
            hand.rotation_euler.z += -sign * (0.012 + 0.010 * alert)
        for i in range(4):
            finger = RIG.pose.bones.get(f'Finger{side}{i}')
            if finger:
                finger.rotation_euler.x = 0.045 + i * 0.006 + moving * 0.018 + alert * 0.020
        thumb = RIG.pose.bones.get('Thumb' + side)
        if thumb:
            thumb.rotation_euler.x = 0.035 + moving * 0.014


def apply_secondary(t, drive=1.0, turn=0.0, braking=0.0):
    # 머리카락/치마/끈은 본체보다 한 박자 늦게 따라오도록 시간 지연 키 곡선을 사용한다.
    trail = phase_curve(t, [(0.00,0.0),(0.16,0.55),(0.38,-0.35),(0.63,0.62),(0.84,-0.28),(1.00,0.0)])
    settle = phase_curve(t, [(0.00,0.0),(0.24,-0.32),(0.52,0.18),(0.78,-0.08),(1.00,0.0)])
    for i in range(12):
        for j in range(3):
            gain = drive * (0.020 + j * 0.010)
            delay = (i * 0.037 + j * 0.055) % 1.0
            local = phase_curve((t - delay) % 1.0, [(0.00,0.0),(0.20,0.52),(0.46,-0.42),(0.71,0.34),(1.00,0.0)])
            rot(f'Hair{i}_{j}', gain * local + braking * 0.025 * settle, gain * 0.45 * trail, turn * (0.018 + j * 0.009) * local)
    for i in range(8):
        local = phase_curve((t - i * 0.06) % 1.0, [(0.00,0.0),(0.22,0.42),(0.50,-0.36),(0.74,0.25),(1.00,0.0)])
        rot(f'Hem{i}', drive * 0.020 * local + braking * 0.035 * settle, turn * 0.022 * local, drive * 0.016 * trail)
    for i in range(3):
        local = phase_curve((t - i * 0.09) % 1.0, [(0.00,0.0),(0.25,0.58),(0.53,-0.44),(0.78,0.26),(1.00,0.0)])
        rot(f'Tie{i}', drive * (0.035 + i * 0.018) * local + braking * 0.05 * settle, turn * 0.025 * local, 0.0)


def idle_pose(t):
    # 완전 대칭 반복을 피하고 좌우 체중 이동 시점을 비균일하게 배치한다.
    weight = curve(t, [(0.00,-0.10),(0.18,-0.05),(0.43,0.09),(0.67,0.13),(0.86,-0.02),(1.00,-0.10)])
    breathe = curve(t, [(0.00,0.00),(0.21,0.55),(0.47,1.00),(0.72,0.36),(1.00,0.00)])
    head_follow = curve(t, [(0.00,-0.02),(0.30,0.01),(0.57,0.055),(0.78,0.025),(1.00,-0.02)])
    loc('Hips', weight * 0.016, 0.0, breathe * 0.018)
    rot('Hips', 0.0, weight * 0.055, weight * 0.035)
    rot('Spine', breathe * 0.018, -weight * 0.038, -weight * 0.028)
    rot('Chest', -breathe * 0.012, -weight * 0.024, weight * 0.040)
    rot('Head', -0.018 + breathe * 0.014, head_follow, -weight * 0.018)
    for side, sign in [('L', -1), ('R', 1)]:
        rot('UpperArm' + side, 0.020 + sign * weight * 0.018, sign * 0.025, -sign * 0.025)
        rot('Forearm' + side, -0.045 - breathe * 0.010, sign * 0.012, 0.0)
        rot('Hand' + side, 0.030 + breathe * 0.012, 0.0, -sign * 0.035)
        rot('Thigh' + side, sign * weight * 0.022, 0.0, -sign * weight * 0.030)
        rot('Shin' + side, max(0.0, -sign * weight) * 0.035, 0.0, 0.0)
    detail_face_and_hands(t, moving=0.0, alert=0.15)
    apply_secondary(t, drive=0.55, turn=weight)


def gait_pose(t, running=False):
    # 접지-하강-통과-상승의 키포즈. 좌우 발은 정확히 반주기 차이로 움직인다.
    amp = 0.58 if running else 0.38
    arm_amp = 0.46 if running else 0.30
    forward_lean = 0.15 if running else 0.045
    lift = 0.26 if running else 0.16
    hip_drop = 0.045 if running else 0.028
    # 골반 수직 이동은 양발 접지 순간 낮고 통과 순간 높다.
    body_y = phase_curve(t, [(0.00,-1.0),(0.14,-0.25),(0.28,0.62),(0.50,-0.86),(0.66,-0.12),(0.80,0.72),(1.00,-1.0)])
    yaw = phase_curve(t, [(0.00,-1.0),(0.25,0.10),(0.50,1.0),(0.75,-0.08),(1.00,-1.0)])
    loc('Hips', 0.0, 0.0, hip_drop * body_y)
    rot('Hips', forward_lean * 0.30, yaw * 0.085, yaw * 0.030)
    rot('Spine', forward_lean * 0.30, -yaw * 0.050, -yaw * 0.022)
    rot('Chest', forward_lean * 0.40, -yaw * 0.048, yaw * 0.025)
    rot('Head', -forward_lean * 0.52, yaw * 0.020, -yaw * 0.015)
    for side, sign in [('L', -1), ('R', 1)]:
        p = (t + (0.5 if side == 'R' else 0.0)) % 1.0
        thigh = phase_curve(p, [(0.00,0.90),(0.12,0.68),(0.32,-0.35),(0.50,-0.80),(0.68,-0.40),(0.84,0.56),(1.00,0.90)])
        knee = phase_curve(p, [(0.00,0.12),(0.12,0.03),(0.34,0.10),(0.52,0.66),(0.70,0.95),(0.84,0.38),(1.00,0.12)])
        foot = phase_curve(p, [(0.00,-0.08),(0.16,0.02),(0.38,0.12),(0.56,-0.20),(0.76,-0.38),(0.90,-0.12),(1.00,-0.08)])
        arm = phase_curve(p, [(0.00,-0.84),(0.22,-0.35),(0.50,0.78),(0.75,0.32),(1.00,-0.84)])
        rot('Thigh' + side, thigh * amp, 0.0, -sign * yaw * 0.020)
        rot('Shin' + side, max(0.0, knee) * lift * 2.7, 0.0, 0.0)
        rot('Foot' + side, foot * (0.55 if running else 0.42), 0.0, sign * 0.010)
        rot('UpperArm' + side, arm * arm_amp, sign * 0.035, -sign * 0.035)
        rot('Forearm' + side, -0.12 - max(0.0, -arm) * (0.22 if running else 0.12), sign * 0.015, 0.0)
        rot('Hand' + side, 0.035 + max(0.0, arm) * 0.05, 0.0, -sign * 0.040)
    detail_face_and_hands(t, moving=1.0 if running else 0.72, alert=0.35 if running else 0.18)
    apply_secondary(t, drive=1.55 if running else 1.05, turn=yaw * 0.3)


def start_pose(t):
    crouch = curve(t, [(0.00,0.0),(0.18,1.0),(0.34,0.82),(0.58,0.20),(1.00,0.0)])
    push = curve(t, [(0.00,0.0),(0.18,-0.18),(0.38,1.0),(0.66,0.42),(1.00,0.0)])
    loc('Hips', 0.0, 0.0, -0.10 * crouch + 0.025 * push)
    rot('Hips', 0.16 * crouch - 0.08 * push, 0.0, 0.0)
    rot('Spine', 0.12 * crouch - 0.03 * push, 0.0, 0.0)
    rot('Chest', 0.08 * crouch, 0.0, 0.0)
    rot('Head', -0.11 * crouch, 0.0, 0.0)
    rot('ThighL', 0.28 * crouch - 0.22 * push)
    rot('ShinL', 0.38 * crouch)
    rot('FootL', -0.16 * crouch)
    rot('ThighR', -0.18 * crouch + 0.42 * push)
    rot('ShinR', 0.22 * crouch + 0.15 * push)
    rot('FootR', -0.10 * crouch)
    rot('UpperArmL', -0.16 * push)
    rot('UpperArmR', 0.22 * push)
    detail_face_and_hands(t, moving=0.65, alert=0.22)
    apply_secondary(t, drive=0.8 + push * 0.8, braking=-push)


def stop_pose(t):
    brake = curve(t, [(0.00,0.0),(0.16,0.72),(0.34,1.0),(0.62,0.48),(0.82,0.15),(1.00,0.0)])
    settle = curve(t, [(0.00,0.0),(0.38,0.0),(0.64,1.0),(0.82,-0.34),(1.00,0.0)])
    loc('Hips', 0.0, 0.0, -0.075 * brake + 0.018 * settle)
    rot('Hips', -0.12 * brake + 0.025 * settle, 0.0, 0.0)
    rot('Spine', -0.10 * brake + 0.018 * settle, 0.0, 0.0)
    rot('Chest', -0.06 * brake, 0.0, 0.0)
    rot('Head', 0.10 * brake - 0.02 * settle, 0.0, 0.0)
    rot('ThighL', 0.28 * brake)
    rot('ShinL', 0.42 * brake)
    rot('FootL', -0.18 * brake)
    rot('ThighR', -0.16 * brake)
    rot('ShinR', 0.22 * brake)
    rot('FootR', 0.08 * brake)
    rot('UpperArmL', 0.12 * brake)
    rot('UpperArmR', -0.15 * brake)
    detail_face_and_hands(t, moving=0.42, alert=0.10)
    apply_secondary(t, drive=0.65, braking=brake)


def turn_pose(t):
    # Root 회전은 게임플레이 소유다. 애니메이션은 발 플랜트와 몸통 선행/후행만 표현한다.
    load = curve(t, [(0.00,0.0),(0.18,1.0),(0.34,0.72),(0.55,0.15),(1.00,0.0)])
    turn = curve(t, [(0.00,0.0),(0.18,0.08),(0.42,0.48),(0.62,1.0),(0.82,0.38),(1.00,0.0)])
    settle = curve(t, [(0.00,0.0),(0.62,0.0),(0.79,1.0),(0.90,-0.30),(1.00,0.0)])
    loc('Hips', 0.0, 0.0, -0.055 * load + 0.012 * settle)
    rot('Hips', 0.035 * load, 0.54 * turn, 0.055 * load)
    rot('Spine', 0.0, 0.23 * turn, -0.045 * load)
    rot('Chest', 0.0, 0.14 * turn, -0.025 * load)
    rot('Head', 0.0, 0.18 * curve(t, [(0.00,0.0),(0.12,0.55),(0.36,1.0),(0.72,0.45),(1.00,0.0)]), 0.0)
    # 왼발 축, 오른발 재배치.
    rot('ThighL', 0.10 * load, -0.10 * turn, -0.05 * load)
    rot('ShinL', 0.22 * load)
    rot('FootL', -0.12 * load, -0.08 * turn, 0.0)
    rot('ThighR', -0.12 * load + 0.22 * turn, 0.18 * turn, 0.04 * load)
    rot('ShinR', 0.18 * load + 0.20 * turn)
    rot('FootR', -0.06 * load, 0.16 * turn, 0.0)
    rot('UpperArmL', 0.08 * turn)
    rot('UpperArmR', -0.12 * turn)
    detail_face_and_hands(t, moving=0.28, alert=0.30)
    apply_secondary(t, drive=0.8, turn=turn, braking=settle)


def animate(name, normalized_time):
    reset_pose()
    t = clamp01(normalized_time)
    if name == 'hero_idle_hq':
        idle_pose(t)
    elif name == 'hero_walk_hq':
        gait_pose(t, running=False)
    elif name == 'hero_run_hq':
        gait_pose(t, running=True)
    elif name == 'hero_start_hq':
        start_pose(t)
        # 시작 끝은 걷기 첫 접지 포즈와 직접 이어져야 한다.
        if t >= 0.70:
            authored = pose_snapshot()
            reset_pose()
            gait_pose(0.0, running=False)
            handoff = pose_snapshot()
            apply_snapshot(blend_snapshots(authored, handoff, (t - 0.70) / 0.30))
    elif name == 'hero_stop_hq':
        stop_pose(t)
        authored = pose_snapshot()
        if t <= 0.24:
            reset_pose()
            gait_pose(0.0, running=False)
            incoming = pose_snapshot()
            apply_snapshot(blend_snapshots(incoming, authored, t / 0.24))
        elif t >= 0.76:
            reset_pose()
            idle_pose(0.0)
            idle = pose_snapshot()
            apply_snapshot(blend_snapshots(authored, idle, (t - 0.76) / 0.24))
    elif name == 'hero_turn_90_hq':
        turn_pose(t)
        authored = pose_snapshot()
        if t <= 0.18:
            reset_pose()
            idle_pose(0.0)
            idle = pose_snapshot()
            apply_snapshot(blend_snapshots(idle, authored, t / 0.18))
        elif t >= 0.78:
            reset_pose()
            idle_pose(0.0)
            idle = pose_snapshot()
            apply_snapshot(blend_snapshots(authored, idle, (t - 0.78) / 0.22))
    else:
        raise AssertionError('UNKNOWN_CLIP:' + name)


for clip_name, duration in CLIPS.items():
    action = bpy.data.actions.new(clip_name)
    RIG.animation_data_create()
    RIG.animation_data.action = action
    frame_count = round(duration * FPS)
    for frame in range(frame_count + 1):
        animate(clip_name, frame / max(1, frame_count))
        for pose_bone in RIG.pose.bones:
            if pose_bone.name == 'Root':
                continue
            pose_bone.keyframe_insert('rotation_euler', frame=frame)
            if pose_bone.name == 'Hips':
                pose_bone.keyframe_insert('location', frame=frame)
    action.use_fake_user = True
    for curve_data in action.fcurves:
        for point in curve_data.keyframe_points:
            point.interpolation = 'BEZIER'

# 실제 관절 샘플 기반 QA. 이름만 있는 모션은 통과시키지 않는다.
def sampled_snapshot(clip_name, t):
    animate(clip_name, t)
    bpy.context.view_layer.update()
    return pose_snapshot()


def rotation_activity(clip_name, bone_name, samples=33):
    values=[]
    for index in range(samples):
        snap=sampled_snapshot(clip_name,index/(samples-1))
        row=snap.get(bone_name)
        if row:
            values.append(row['r'])
    if not values:
        return 0.0
    return max(
        max(row[axis] for row in values)-min(row[axis] for row in values)
        for axis in range(3)
    )


def bone_world_position(clip_name, t, bone_name):
    animate(clip_name,t)
    bpy.context.view_layer.update()
    bone=RIG.pose.bones[bone_name]
    point=RIG.matrix_world @ bone.matrix.translation
    return (float(point.x),float(point.y),float(point.z))


def contact_drift(clip_name, bone_name, start, end, samples=9):
    rows=[bone_world_position(clip_name,start+(end-start)*i/(samples-1),bone_name) for i in range(samples)]
    base=rows[0]
    # 전진축(Y)은 in-place 속도 동기화에서 보정되므로, 접지 중 측면(X)/수직(Z) 이탈만 측정한다.
    return max(math.hypot(row[0]-base[0],row[2]-base[2]) for row in rows)


def rig_height():
    heads=[RIG.matrix_world @ bone.head_local for bone in RIG.data.bones]
    if not heads:
        return 1.0
    return max(.001,max(v.z for v in heads)-min(v.z for v in heads))


def finite_snapshot(snapshot):
    return all(
        math.isfinite(value)
        for row in snapshot.values()
        for key in ('r','l')
        for value in row[key]
    )


loop_metrics={}
for clip_name in LOOP_CLIPS:
    loop_metrics[clip_name]=snapshot_distance(
        sampled_snapshot(clip_name,0.0),
        sampled_snapshot(clip_name,1.0)
    )

transition_metrics={
    'startToWalk':snapshot_distance(sampled_snapshot('hero_start_hq',1.0),sampled_snapshot('hero_walk_hq',0.0)),
    'stopFromWalk':snapshot_distance(sampled_snapshot('hero_stop_hq',0.0),sampled_snapshot('hero_walk_hq',0.0)),
    'stopToIdle':snapshot_distance(sampled_snapshot('hero_stop_hq',1.0),sampled_snapshot('hero_idle_hq',0.0)),
    'turnFromIdle':snapshot_distance(sampled_snapshot('hero_turn_90_hq',0.0),sampled_snapshot('hero_idle_hq',0.0)),
    'turnToIdle':snapshot_distance(sampled_snapshot('hero_turn_90_hq',1.0),sampled_snapshot('hero_idle_hq',0.0)),
}

phase_metrics={}
for clip_name in ('hero_walk_hq','hero_run_hq'):
    left0=sampled_snapshot(clip_name,0.0)['ThighL']['r'][0]
    right_half=sampled_snapshot(clip_name,0.5)['ThighR']['r'][0]
    phase_metrics[clip_name]=abs(left0-right_half)

height=rig_height()
foot_contact_metrics={
    'hero_walk_hq':{
        'left':contact_drift('hero_walk_hq','FootL',0.00,0.30)/height,
        'right':contact_drift('hero_walk_hq','FootR',0.50,0.80)/height,
    },
    'hero_run_hq':{
        'left':contact_drift('hero_run_hq','FootL',0.00,0.22)/height,
        'right':contact_drift('hero_run_hq','FootR',0.50,0.72)/height,
    },
}

primary_activity={
    clip_name:{bone:rotation_activity(clip_name,bone) for bone in QA_THRESHOLDS['primaryJointRotationRangeMinRad']}
    for clip_name in ('hero_walk_hq','hero_run_hq')
}
secondary_candidates=[bone for bone in SECONDARY_QA_BONES if bone in RIG.pose.bones]
secondary_activity=max(
    [rotation_activity('hero_run_hq',bone) for bone in secondary_candidates] or [0.0]
)

root_metrics={'rotationMaxRad':0.0,'locationMax':0.0}
max_euler=0.0
all_finite=True
for clip_name in CLIPS:
    for index in range(25):
        snap=sampled_snapshot(clip_name,index/24)
        all_finite=all_finite and finite_snapshot(snap)
        root=snap.get('Root',{'r':(0,0,0),'l':(0,0,0)})
        root_metrics['rotationMaxRad']=max(root_metrics['rotationMaxRad'],*(abs(v) for v in root['r']))
        root_metrics['locationMax']=max(root_metrics['locationMax'],*(abs(v) for v in root['l']))
        max_euler=max(max_euler,*[abs(v) for row in snap.values() for v in row['r']])

qa_failures=[]
for clip_name,row in loop_metrics.items():
    if row['rotationMaxRad']>QA_THRESHOLDS['loopRotationMaxRad'] or row['locationMax']>QA_THRESHOLDS['loopLocationMax']:
        qa_failures.append('LOOP_CONTINUITY:'+clip_name)
for name,row in transition_metrics.items():
    if row['rotationMaxRad']>QA_THRESHOLDS['transitionRotationMaxRad']:
        qa_failures.append('TRANSITION_POP:'+name)
if root_metrics['rotationMaxRad']>QA_THRESHOLDS['rootRotationMaxRad'] or root_metrics['locationMax']>QA_THRESHOLDS['rootLocationMax']:
    qa_failures.append('ROOT_AUTHORITY_INTRUSION')
if max_euler>QA_THRESHOLDS['maxEulerRad'] or not all_finite:
    qa_failures.append('INVALID_OR_EXTREME_ROTATION')
for clip_name,value in phase_metrics.items():
    if value>QA_THRESHOLDS['leftRightPhaseErrorRad']:
        qa_failures.append('LEFT_RIGHT_PHASE:'+clip_name)
for clip_name,feet in foot_contact_metrics.items():
    for side,value in feet.items():
        if value>QA_THRESHOLDS['footContactLateralVerticalDriftNormalizedMax']:
            qa_failures.append(f'FOOT_CONTACT_DRIFT:{clip_name}:{side}')
for clip_name,rows in primary_activity.items():
    for bone,minimum in QA_THRESHOLDS['primaryJointRotationRangeMinRad'].items():
        if rows[bone]<minimum:
            qa_failures.append(f'PRIMARY_JOINT_ACTIVITY:{clip_name}:{bone}')
if secondary_activity<QA_THRESHOLDS['secondaryRotationRangeMinRad']:
    qa_failures.append('SECONDARY_MOTION_ACTIVITY')

qa_metrics={
    'thresholds':QA_THRESHOLDS,
    'loop':loop_metrics,
    'transitions':transition_metrics,
    'leftRightPhaseErrorRad':phase_metrics,
    'footContactLateralVerticalDriftNormalized':foot_contact_metrics,
    'primaryJointRotationRangeRad':primary_activity,
    'secondaryRotationRangeMaxRad':secondary_activity,
    'root':root_metrics,
    'maxEulerRad':max_euler,
    'allSamplesFinite':all_finite,
    'rigHeight':height,
    'failures':qa_failures,
    'staticMotionQaPass':not qa_failures,
}
assert not qa_failures, 'MOTION_STATIC_QA_FAILED:'+'|'.join(qa_failures)

# 새 파생 GLB에는 새 6모션만 포함한다.
RIG.animation_data.action = bpy.data.actions['hero_idle_hq']
bpy.context.scene.frame_set(0)

bpy.ops.object.select_all(action='DESELECT')
RIG.select_set(True)
for obj in bpy.context.scene.objects:
    if obj.type == 'MESH':
        obj.select_set(True)
bpy.context.view_layer.objects.active = RIG

output_glb = ARGS.output / 'bride-motion-v2.glb'
bpy.ops.export_scene.gltf(
    filepath=str(output_glb),
    export_format='GLB',
    use_selection=True,
    export_animations=True,
    export_animation_mode='ACTIONS',
    export_skins=True,
    export_yup=True,
    export_materials='EXPORT',
    export_extras=True,
    export_all_influences=False,
)

document = glb_document(output_glb)
animation_names = [row.get('name') for row in document.get('animations', [])]
expected = list(CLIPS)
assert set(animation_names) == set(expected), (animation_names, expected)
assert document.get('skins'), 'DERIVED_SKIN_MISSING'

derived_hash = hashlib.sha256(output_glb.read_bytes()).hexdigest()
assert derived_hash != source_hash, 'DERIVATIVE_IDENTICAL_TO_SOURCE'

evidence = {
    'assetId': 'gwisin-bride-humanoid-motion-v2',
    'kind': 'DERIVED_SKINNED_HUMANOID_MOTION_GLTF',
    'sourceAsset': str(ARGS.source.as_posix()),
    'sourceSha256': source_hash,
    'derivedArtifact': 'bride-motion-v2.glb',
    'derivedSha256': derived_hash,
    'rigObject': RIG.name,
    'boneCount': len(RIG.pose.bones),
    'foundationMotionCount': len(CLIPS),
    'foundationMotions': expected,
    'durations': CLIPS,
    'qualityIntent': [
        'KEY_POSE_DRIVEN_NO_ROOT_ONLY_LOCOMOTION',
        'PELVIS_SPINE_CHEST_DELAYED_CHAIN',
        'FOOT_PLANT_AND_KNEE_COMPRESSION',
        'HEEL_TOE_PITCH_AND_COUNTER_SWING',
        'START_STOP_WEIGHT_TRANSFER',
        'TURN_PLANT_WITH_GAMEPLAY_ROOT_AUTHORITY_PRESERVED',
        'ASYMMETRIC_IDLE_GAZE_BLINK_AND_HAND_DETAIL',
        'HAIR_HEM_TIE_SECONDARY_FOLLOW_THROUGH',
        'BEZIER_INTERPOLATION',
        'MEASURED_STATIC_MOTION_QA'
    ],
    'staticMotionQa': qa_metrics,
    'platformTargets': ['UNITY', 'ROBLOX'],
    'directCrossPlatformBinaryReuseForbidden': True,
    'sourceOriginalPreserved': True,
    'gameplayAuthorityChanged': False,
    'nativeStudioVerified': False,
    'unityRuntimeVerified': False,
    'productionVerified': False,
}
(ARGS.output / 'evidence.json').write_text(
    json.dumps(evidence, ensure_ascii=False, indent=2) + '\n',
    encoding='utf-8'
)

# 프리뷰는 실제 파생 리그를 렌더한다. 게임 런타임 PASS를 대신하지 않는다.
if ARGS.render_dir:
    ARGS.render_dir.mkdir(parents=True,exist_ok=True)
    world=bpy.data.worlds.new('MotionPreviewWorld')
    world.use_nodes=True
    world.node_tree.nodes['Background'].inputs[0].default_value=(0.025,0.035,0.05,1)
    world.node_tree.nodes['Background'].inputs[1].default_value=0.35
    SCENE.world=world
    def add_area(name,location,power,size):
        data=bpy.data.lights.new(name,'AREA');data.energy=power;data.size=size
        obj=bpy.data.objects.new(name,data);SCENE.collection.objects.link(obj);obj.location=location
        obj.rotation_euler=((RIG.location + Vector((0,0,1.8)))-obj.location).to_track_quat('-Z','Y').to_euler()
    add_area('MotionKey',(-3,-4,5),650,4)
    add_area('MotionFill',(3,-2,3),280,3)
    add_area('MotionRim',(0,4,5),520,3)
    cam_data=bpy.data.cameras.new('MotionPreviewCamera')
    camera=bpy.data.objects.new('MotionPreviewCamera',cam_data)
    SCENE.collection.objects.link(camera);SCENE.camera=camera
    camera.location=(4.6,-7.8,3.2)
    target=RIG.location + Vector((0,0,1.8))
    camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler()
    cam_data.type='ORTHO';cam_data.ortho_scale=4.2
    SCENE.render.engine='BLENDER_EEVEE'
    SCENE.render.resolution_x=700;SCENE.render.resolution_y=700;SCENE.render.resolution_percentage=100
    SCENE.render.image_settings.file_format='PNG'
    preview_times={
        'hero_idle_hq':0.44,'hero_walk_hq':0.12,'hero_run_hq':0.12,
        'hero_start_hq':0.34,'hero_stop_hq':0.36,'hero_turn_90_hq':0.58
    }
    preview_files=[]
    for clip_name,t in preview_times.items():
        animate(clip_name,t);bpy.context.view_layer.update()
        output=ARGS.render_dir/(clip_name+'.png')
        SCENE.render.filepath=str(output);bpy.ops.render.render(write_still=True)
        preview_files.append(str(output.name))
    evidence['previewFiles']=preview_files
    evidence['previewIsRuntimeProof']=False
    (ARGS.output / 'evidence.json').write_text(
        json.dumps(evidence, ensure_ascii=False, indent=2) + '\n',
        encoding='utf-8'
    )

print(json.dumps(evidence, ensure_ascii=False), flush=True)
