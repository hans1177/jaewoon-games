# 파일명: assets/shared/humanoid-motion-v1/author-motion.py
"""원본과 엔진에 독립적인 공용 휴머노이드 3D 모션 원본을 1개 대상·1개 클립 단위로 제작한다.

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
from mathutils import Matrix, Vector

ROOT = Path(__file__).resolve().parent
PARSER = argparse.ArgumentParser()
PARSER.add_argument('--source', type=Path, default=ROOT / 'base-skinned-humanoid.glb')
PARSER.add_argument('--output', type=Path, default=None)
PARSER.add_argument('--focus', type=str, default='common_light_attack_1_hq')
PARSER.add_argument('--render-dir', type=Path)
_argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else None
ARGS = PARSER.parse_args(_argv)
ARGS.output = ARGS.output or (ROOT / 'derived' / ARGS.focus)
ARGS.output.mkdir(parents=True, exist_ok=True)

FPS = 30
CLIPS = {
    'common_idle_hq': 3.60,
    'common_walk_hq': 1.05,
    'common_jog_hq': 0.86,
    'common_run_hq': 0.72,
    'common_sprint_hq': 0.60,
    'common_start_hq': 0.75,
    'common_stop_hq': 0.66,
    'common_strafe_left_hq': 0.92,
    'common_strafe_right_hq': 0.92,
    'common_backward_hq': 1.02,
    'common_turn_45_hq': 0.62,
    'common_turn_90_hq': 0.78,
    'common_turn_180_hq': 0.96,
    'common_jump_start_hq': 0.48,
    'common_jump_air_hq': 0.62,
    'common_land_hq': 0.58,
    'common_crouch_hq': 2.40,
    'common_light_attack_1_hq': 0.56,
    'common_light_attack_2_hq': 0.64,
    'common_light_attack_3_hq': 0.77,
    'common_heavy_attack_1_hq': 1.06,
    'common_heavy_attack_2_hq': 1.15,
    'common_guard_raise_hq': 0.35,
    'common_guard_hold_hq': 1.12,
    'common_parry_hq': 0.42,
    'common_dodge_left_hq': 0.64,
    'common_dodge_right_hq': 0.64,
    'common_hit_front_hq': 0.62,
    'common_hit_back_hq': 0.66,
    'common_death_front_hq': 1.72,
    'common_cast_burst_hq': 0.84,
    'common_samurai_iaido_hq': 0.87,
    'common_samurai_parry_hq': 0.51,
    'common_spear_lunge_hq': 0.74,
    'common_bow_draw_hq': 1.12,
    'common_bow_release_hq': 0.55,
    'common_rogue_backstab_hq': 0.78,
    'common_caster_channel_hq': 1.24,
    'common_healer_ritual_hq': 1.34,
    'common_summon_call_hq': 1.40,
    'common_forge_hammer_hq': 0.94,
    'common_build_place_hq': 1.04,
    'common_farm_harvest_hq': 1.08,
    'common_command_rally_hq': 0.92,
    'common_merchant_trade_hq': 1.07,
    'common_vehicle_steer_hq': 1.26,
    'common_fishing_cast_hq': 1.16,
    'common_potion_mix_hq': 1.35,
}
FOUNDATION_TARGET_MOTION_COUNT = 64
# 공용 직업별 모션: 실제 본의 가중치가 다른 준비·발동 두 키포즈를 굽는다.
CLASS_ACTION_POSES = {
    'common_samurai_iaido_hq': {'duration': 0.87, 'anticipation': {'Hips':(0.16,0.26),'Spine':(0.15,-0.16),'Chest':(-0.22,-0.34),'Head':(0.07,0.09),'UpperArmL':(-0.38,0.22,-0.15),'UpperArmR':(-0.53,-0.26,0.2),'ForearmL':(-0.56),'ForearmR':(-0.78),'ThighL':(0.31),'ThighR':(-0.22),'ShinL':(0.35)}, 'release': {'Hips':(-0.22,-0.38),'Spine':(-0.3,0.29),'Chest':(0.4,0.46),'Head':(-0.15,-0.18),'UpperArmL':(0.91,0.1,0.15),'UpperArmR':(1.3,0.08,0.26),'ForearmL':(0.28),'ForearmR':(0.38),'ThighL':(-0.27),'ThighR':(0.16),'ShinL':(-0.12)}},
    'common_samurai_parry_hq': {'duration': 0.51, 'anticipation': {'Hips':(0.12,-0.16),'Spine':(-0.14,0.14),'Chest':(-0.19,0.25),'Head':(0.09,-0.05),'UpperArmL':(-0.43,0.14,-0.11),'UpperArmR':(-0.81,-0.15,0.23),'ForearmL':(-0.57),'ForearmR':(-0.71),'ThighL':(0.23),'ThighR':(-0.19)}, 'release': {'Hips':(-0.11,0.21),'Spine':(0.23,-0.18),'Chest':(0.31,-0.36),'Head':(-0.12,0.09),'UpperArmL':(0.55,-0.1,-0.12),'UpperArmR':(0.76,0.12,0.32),'ForearmL':(0.19),'ForearmR':(0.29),'ThighL':(-0.16),'ThighR':(0.12)}},
    'common_spear_lunge_hq': {'duration': 0.74, 'anticipation': {'Hips':(-0.12,0.21),'Spine':(-0.21,-0.16),'Chest':(-0.28,-0.16),'Head':(0.11),'UpperArmL':(-0.43,0.31),'UpperArmR':(-0.72,-0.28),'ForearmL':(-0.63),'ForearmR':(-0.81),'ThighL':(0.41),'ThighR':(-0.31),'ShinL':(0.43)}, 'release': {'Hips':(0.18,-0.29),'Spine':(0.31,0.2),'Chest':(0.45,0.32),'Head':(-0.14),'UpperArmL':(0.49,-0.15),'UpperArmR':(0.93,0.1),'ForearmL':(0.25),'ForearmR':(0.36),'ThighL':(-0.35),'ThighR':(0.2),'ShinL':(-0.22)}},
    'common_bow_draw_hq': {'duration': 1.12, 'anticipation': {'Hips':(-0.04,0.04),'Spine':(-0.1,-0.08),'Chest':(-0.14,0.14),'Head':(0.07,-0.06),'UpperArmL':(-0.48,-0.15,-0.2),'UpperArmR':(-0.32,-0.12,0.18),'ForearmL':(-0.19),'ForearmR':(-0.34),'ThighL':(0.11),'ThighR':(-0.08)}, 'release': {'Hips':(-0.07,0.1),'Spine':(-0.16,-0.12),'Chest':(-0.23,0.22),'Head':(0.06,-0.12),'UpperArmL':(-1,-0.16,-0.3),'UpperArmR':(-0.73,-0.36,0.34),'ForearmL':(-0.28),'ForearmR':(-1.12),'ThighL':(0.14),'ThighR':(-0.12)}},
    'common_bow_release_hq': {'duration': 0.55, 'anticipation': {'Hips':(-0.07,0.1),'Spine':(-0.16,-0.12),'Chest':(-0.23,0.22),'Head':(0.06,-0.12),'UpperArmL':(-1,-0.16,-0.3),'UpperArmR':(-0.73,-0.36,0.34),'ForearmL':(-0.28),'ForearmR':(-1.12),'ThighL':(0.14),'ThighR':(-0.12)}, 'release': {'Hips':(0.05,-0.09),'Spine':(0.09,0.11),'Chest':(0.21,-0.13),'Head':(-0.06,0.05),'UpperArmL':(-0.56,-0.06),'UpperArmR':(0.25,0.23,-0.11),'ForearmL':(-0.14),'ForearmR':(0.4),'ThighL':(0.08),'ThighR':(-0.04)}},
    'common_rogue_backstab_hq': {'duration': 0.78, 'anticipation': {'Hips':(-0.25,-0.31),'Spine':(-0.3,0.24),'Chest':(-0.33,0.29),'Head':(0.13,-0.16),'UpperArmL':(-0.28,-0.09),'UpperArmR':(-0.62,0.14,0.12),'ForearmL':(-0.24),'ForearmR':(-0.59),'ThighL':(0.51),'ThighR':(0.43),'ShinL':(0.54),'ShinR':(0.46)}, 'release': {'Hips':(0.13,0.32),'Spine':(0.34,-0.27),'Chest':(0.49,-0.37),'Head':(-0.17,0.1),'UpperArmL':(0.22,-0.09),'UpperArmR':(1.19,0.23,0.22),'ForearmL':(0.11),'ForearmR':(0.44),'ThighL':(-0.32),'ThighR':(-0.24),'ShinL':(0.16)}},
    'common_caster_channel_hq': {'duration': 1.24, 'anticipation': {'Hips':(-0.05,0.02),'Spine':(-0.17,0.08),'Chest':(-0.18,-0.05),'Head':(0.12),'UpperArmL':(-0.47,-0.19,0.12),'UpperArmR':(-0.48,0.22,-0.1),'ForearmL':(-0.41),'ForearmR':(-0.43),'ThighL':(0.11),'ThighR':(0.1)}, 'release': {'Hips':(-0.09,0.06),'Spine':(-0.24,0.14),'Chest':(-0.27,-0.12),'Head':(0.2),'UpperArmL':(-1.02,-0.23,0.29),'UpperArmR':(-0.95,0.26,-0.25),'ForearmL':(-0.67),'ForearmR':(-0.69),'ThighL':(0.17),'ThighR':(0.15)}},
    'common_healer_ritual_hq': {'duration': 1.34, 'anticipation': {'Hips':(-0.08),'Spine':(-0.19),'Chest':(-0.22),'Head':(0.14),'UpperArmL':(-0.34,-0.14,-0.12),'UpperArmR':(-0.36,0.15,0.12),'ForearmL':(-0.44),'ForearmR':(-0.45),'ThighL':(0.16),'ThighR':(0.15)}, 'release': {'Hips':(0.04),'Spine':(0.17),'Chest':(0.27),'Head':(-0.18),'UpperArmL':(-1.1,-0.27,0.42),'UpperArmR':(-1.08,0.24,-0.39),'ForearmL':(-0.81),'ForearmR':(-0.78),'ThighL':(0.1),'ThighR':(0.09)}},
    'common_summon_call_hq': {'duration': 1.40, 'anticipation': {'Hips':(-0.1,0.08),'Spine':(-0.21,-0.13),'Chest':(-0.24,-0.16),'Head':(0.16),'UpperArmL':(-0.53,-0.21,-0.24),'UpperArmR':(-0.51,0.19,0.22),'ForearmL':(-0.49),'ForearmR':(-0.51),'ThighL':(0.21),'ThighR':(-0.12)}, 'release': {'Hips':(0.12,-0.14),'Spine':(0.34,0.22),'Chest':(0.39,0.28),'Head':(-0.2),'UpperArmL':(-0.89,-0.34,0.61),'UpperArmR':(-1.24,0.33,-0.62),'ForearmL':(-0.72),'ForearmR':(-0.75),'ThighL':(-0.16),'ThighR':(0.16)}},
    'common_forge_hammer_hq': {'duration': 0.94, 'anticipation': {'Hips':(-0.15,0.24),'Spine':(-0.22,-0.15),'Chest':(-0.31,-0.23),'Head':(0.12),'UpperArmL':(-0.52,0.22),'UpperArmR':(-0.97,-0.24,0.17),'ForearmL':(-0.46),'ForearmR':(-0.74),'ThighL':(0.35),'ThighR':(0.15)}, 'release': {'Hips':(0.25,-0.28),'Spine':(0.34,0.25),'Chest':(0.48,0.31),'Head':(-0.21),'UpperArmL':(0.49,-0.12),'UpperArmR':(1.21,0.18,-0.13),'ForearmL':(0.26),'ForearmR':(0.46),'ThighL':(-0.24),'ThighR':(-0.19)}},
    'common_build_place_hq': {'duration': 1.04, 'anticipation': {'Hips':(-0.18,-0.13),'Spine':(-0.23,0.11),'Chest':(-0.17,0.05),'Head':(0.15),'UpperArmL':(-0.45,-0.18),'UpperArmR':(-0.43,0.17),'ForearmL':(-0.52),'ForearmR':(-0.44),'ThighL':(0.38),'ThighR':(0.26)}, 'release': {'Hips':(0.09,0.14),'Spine':(0.2,-0.15),'Chest':(0.32,-0.24),'Head':(-0.15),'UpperArmL':(-0.94,-0.1,-0.22),'UpperArmR':(-0.93,0.14,0.18),'ForearmL':(-0.66),'ForearmR':(-0.62),'ThighL':(0.11),'ThighR':(-0.14)}},
    'common_farm_harvest_hq': {'duration': 1.08, 'anticipation': {'Hips':(-0.24,-0.1),'Spine':(-0.36,0.08),'Chest':(-0.23,0.07),'Head':(0.23),'UpperArmL':(0.08,-0.19),'UpperArmR':(0.01,0.21),'ForearmL':(-0.36),'ForearmR':(-0.34),'ThighL':(0.45),'ThighR':(0.43),'ShinL':(0.37),'ShinR':(0.35)}, 'release': {'Hips':(0.21,0.12),'Spine':(0.22,-0.13),'Chest':(0.17,-0.18),'Head':(-0.13),'UpperArmL':(-0.69,-0.18),'UpperArmR':(-0.74,0.21),'ForearmL':(-0.79),'ForearmR':(-0.75),'ThighL':(0.09),'ThighR':(0.14),'ShinL':(-0.11)}},
    'common_command_rally_hq': {'duration': 0.92, 'anticipation': {'Hips':(0.07,-0.13),'Spine':(0.11,0.16),'Chest':(-0.12,-0.18),'Head':(-0.07,0.06),'UpperArmL':(-0.21,0.1),'UpperArmR':(-0.31,0.13),'ForearmL':(-0.13),'ForearmR':(-0.31),'ThighL':(0.14),'ThighR':(-0.15)}, 'release': {'Hips':(-0.11,0.18),'Spine':(-0.26,-0.22),'Chest':(0.23,0.32),'Head':(0.13,-0.1),'UpperArmL':(-0.4,-0.09),'UpperArmR':(-1.26,0.27,0.55),'ForearmL':(-0.32),'ForearmR':(-0.56),'ThighL':(-0.17),'ThighR':(0.21)}},
    'common_merchant_trade_hq': {'duration': 1.07, 'anticipation': {'Hips':(-0.05,0.05),'Spine':(-0.06,-0.05),'Chest':(-0.12,0.12),'Head':(0.08,-0.09),'UpperArmL':(-0.29,-0.16),'UpperArmR':(-0.41,0.14),'ForearmL':(-0.25),'ForearmR':(-0.32),'ThighL':(0.12),'ThighR':(-0.1)}, 'release': {'Hips':(0.08,-0.09),'Spine':(0.12,0.09),'Chest':(0.22,-0.13),'Head':(-0.11,0.06),'UpperArmL':(-0.65,-0.21,0.12),'UpperArmR':(-0.89,0.27,-0.11),'ForearmL':(-0.86),'ForearmR':(-0.81),'ThighL':(-0.12),'ThighR':(0.11)}},
    'common_vehicle_steer_hq': {'duration': 1.26, 'anticipation': {'Hips':(-0.04,0.05),'Spine':(-0.13,-0.11),'Chest':(-0.17,0.12),'Head':(0.07,-0.05),'UpperArmL':(-0.49,-0.22),'UpperArmR':(-0.49,0.19),'ForearmL':(-0.8),'ForearmR':(-0.82),'ThighL':(0.44),'ThighR':(0.42),'ShinL':(-0.32),'ShinR':(-0.31)}, 'release': {'Hips':(-0.04,-0.12),'Spine':(-0.15,0.25),'Chest':(-0.13,-0.32),'Head':(0.08,0.11),'UpperArmL':(-0.58,-0.19,-0.3),'UpperArmR':(-0.31,0.32,0.36),'ForearmL':(-0.7),'ForearmR':(-0.64),'ThighL':(0.45),'ThighR':(0.43),'ShinL':(-0.32),'ShinR':(-0.31)}},
    'common_fishing_cast_hq': {'duration': 1.16, 'anticipation': {'Hips':(0.16,0.24),'Spine':(0.13,-0.16),'Chest':(-0.29,-0.27),'Head':(0.12),'UpperArmL':(-0.37,0.16),'UpperArmR':(-1.01,-0.15,0.2),'ForearmL':(-0.53),'ForearmR':(-0.74),'ThighL':(0.23),'ThighR':(-0.24)}, 'release': {'Hips':(-0.2,-0.27),'Spine':(-0.33,0.2),'Chest':(0.41,0.36),'Head':(-0.13),'UpperArmL':(-0.25,-0.12),'UpperArmR':(1.17,0.26,-0.15),'ForearmL':(0.17),'ForearmR':(0.36),'ThighL':(-0.13),'ThighR':(0.18)}},
    'common_potion_mix_hq': {'duration': 1.35, 'anticipation': {'Hips':(-0.07,0.06),'Spine':(-0.13,-0.09),'Chest':(-0.19,-0.13),'Head':(0.17),'UpperArmL':(-0.36,-0.16),'UpperArmR':(-0.4,0.18),'ForearmL':(-0.52),'ForearmR':(-0.48),'ThighL':(0.13),'ThighR':(0.14)}, 'release': {'Hips':(0.06,-0.09),'Spine':(0.1,0.14),'Chest':(0.25,0.21),'Head':(-0.16),'UpperArmL':(-0.75,-0.19,-0.19),'UpperArmR':(-0.96,0.28,0.23),'ForearmL':(-0.8),'ForearmR':(-0.92),'ThighL':(-0.09),'ThighR':(-0.1)}},
}

ACTION_CLIPS = tuple(k for k in CLIPS if k.startswith('common_') and any(t in k for t in ('attack_', 'guard_', 'parry_', 'dodge_', 'hit_', 'death_', 'cast_', 'samurai_', 'spear_lunge', 'bow_', 'rogue_', 'caster_', 'healer_', 'summon_', 'forge_', 'build_', 'farm_', 'command_', 'merchant_', 'vehicle_', 'fishing_', 'potion_')))
assert ARGS.focus in CLIPS, 'UNKNOWN_COMMON_MOTION_CLIP:'+ARGS.focus
EXPORT_CLIPS = {ARGS.focus:CLIPS[ARGS.focus]}
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
LOOP_CLIPS = (
    'common_idle_hq','common_walk_hq','common_jog_hq','common_run_hq','common_sprint_hq',
    'common_strafe_left_hq','common_strafe_right_hq','common_backward_hq','common_crouch_hq',
    'common_guard_hold_hq'
)
LOCOMOTION_QA_CLIPS = (
    'common_walk_hq','common_jog_hq','common_run_hq','common_sprint_hq',
    'common_strafe_left_hq','common_strafe_right_hq','common_backward_hq'
)
DYNAMIC_SECONDARY_QA_CLIPS = (
    'common_walk_hq','common_jog_hq','common_run_hq','common_sprint_hq',
    'common_strafe_left_hq','common_strafe_right_hq','common_backward_hq',
    'common_turn_180_hq','common_jump_start_hq','common_jump_air_hq','common_land_hq'
)
QA_THRESHOLDS = {
    'loopRotationMaxRad': 0.015,
    'loopLocationMax': 0.004,
    'transitionRotationMaxRad': 0.025,
    'speedBlendRotationMaxRad': 0.42,
    'rootRotationMaxRad': 1e-7,
    'rootLocationMax': 1e-7,
    'maxEulerRad': 1.60,
    'leftRightPhaseErrorRad': 0.020,
    'footContactLateralVerticalDriftNormalizedMaxByClip': {
        'common_walk_hq': 0.035,
        'common_jog_hq': 0.045,
        'common_run_hq': 0.050,
        'common_sprint_hq': 0.060,
        'common_backward_hq': 0.045,
        'common_strafe_left_hq': 0.075,
        'common_strafe_right_hq': 0.075,
    },
    'secondaryRotationRangeMinRad': 0.010,
    'primaryJointRotationRangeMinRad': {
        'Hips': 0.040,
        'Spine': 0.025,
        'Chest': 0.025,
        'Head': 0.025,
        'UpperArmL': 0.16,
        'UpperArmR': 0.16,
        'ThighL': 0.30,
        'ThighR': 0.30,
        'ShinL': 0.16,
        'ShinR': 0.16,
    },
    'mobileArtifactSizeMaxBytes': 48 * 1024 * 1024,
    'mobileJointCountMax': 256,
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
RIG['MotionDerivative'] = 'COMMON_HUMANOID_MOTION_V1_ONE_CLIP_PER_WORK_UNIT'
RIG['SourceSha256'] = source_hash
RIG['ProductionVerified'] = False
RIG['SharedSourceRole'] = 'PLATFORM_NEUTRAL_SKINNED_MOTION_DONOR'


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


def gait_pose(t, pace='walk'):
    profiles = {
        'walk': {'amp':0.38,'arm':0.30,'lean':0.045,'lift':0.16,'drop':0.028,'secondary':1.05,'alert':0.18,'reverse':1.0,'stance':0.30},
        'jog': {'amp':0.47,'arm':0.37,'lean':0.085,'lift':0.20,'drop':0.035,'secondary':1.28,'alert':0.24,'reverse':1.0,'stance':0.27},
        'run': {'amp':0.58,'arm':0.46,'lean':0.150,'lift':0.26,'drop':0.045,'secondary':1.55,'alert':0.35,'reverse':1.0,'stance':0.22},
        'sprint': {'amp':0.70,'arm':0.58,'lean':0.235,'lift':0.31,'drop':0.055,'secondary':1.90,'alert':0.48,'reverse':1.0,'stance':0.18},
        'backward': {'amp':0.34,'arm':0.26,'lean':-0.055,'lift':0.15,'drop':0.030,'secondary':0.96,'alert':0.32,'reverse':-0.88,'stance':0.28},
    }
    cfg = profiles[pace]
    stance = cfg['stance']
    body_y = phase_curve(t, [(0.00,-1.0),(0.14,-0.25),(0.28,0.62),(0.50,-0.86),(0.66,-0.12),(0.80,0.72),(1.00,-1.0)])
    yaw = phase_curve(t, [
        (0.00,-0.88),(stance,-0.78),(0.50,0.88),
        (0.50 + stance,0.78),(1.00,-0.88)
    ])
    lateral = phase_curve(t, [(0.00,-0.24),(0.22,0.08),(0.50,0.24),(0.76,-0.06),(1.00,-0.24)])
    loc('Hips', lateral * (0.010 if pace in ('run','sprint') else 0.006), 0.0, cfg['drop'] * body_y)
    rot('Hips', cfg['lean'] * 0.30, yaw * 0.085, yaw * 0.030)
    rot('Spine', cfg['lean'] * 0.30, -yaw * 0.050, -yaw * 0.022)
    rot('Chest', cfg['lean'] * 0.40, -yaw * 0.048, yaw * 0.025)
    rot('Head', -cfg['lean'] * 0.52, yaw * 0.020, -yaw * 0.015)
    for side_name, sign in [('L', -1), ('R', 1)]:
        p = (t + (0.5 if side_name == 'R' else 0.0)) % 1.0
        thigh = phase_curve(p, [
            (0.00,0.72),(stance * 0.50,0.72),(stance,0.72),
            (min(0.48, stance + 0.14),0.08),(0.56,-0.82),
            (0.72,-0.42),(0.88,0.38),(1.00,0.72)
        ]) * cfg['reverse']
        knee = phase_curve(p, [
            (0.00,0.10),(stance * 0.55,0.10),(stance,0.10),
            (min(0.50, stance + 0.16),0.48),(0.66,0.96),
            (0.82,0.44),(0.92,0.18),(1.00,0.10)
        ])
        foot = phase_curve(p, [
            (0.00,-0.18),(stance * 0.35,-0.08),(stance * 0.72,0.10),(stance,0.18),
            (min(0.54, stance + 0.18),0.06),(0.68,-0.34),(0.84,-0.24),(1.00,-0.18)
        ]) * cfg['reverse']
        arm = phase_curve(p, [(0.00,-0.84),(0.22,-0.35),(0.50,0.78),(0.75,0.32),(1.00,-0.84)])
        if pace == 'sprint':
            knee += phase_curve(p, [(0.00,0.04),(0.18,0.0),(0.48,0.18),(0.72,0.28),(1.00,0.04)])
        rot('Thigh' + side_name, thigh * cfg['amp'], 0.0, -sign * yaw * (0.028 if pace == 'sprint' else 0.020))
        rot('Shin' + side_name, max(0.0, knee) * cfg['lift'] * 2.7, 0.0, 0.0)
        rot('Foot' + side_name, foot * (0.60 if pace == 'sprint' else 0.48 if pace in ('jog','run') else 0.42), 0.0, sign * 0.010)
        rot('UpperArm' + side_name, arm * cfg['arm'], sign * (0.045 if pace == 'sprint' else 0.035), -sign * 0.035)
        rot('Forearm' + side_name, -0.12 - max(0.0, -arm) * (0.27 if pace == 'sprint' else 0.22 if pace in ('run','jog') else 0.12), sign * 0.015, 0.0)
        rot('Hand' + side_name, 0.035 + max(0.0, arm) * 0.055, 0.0, -sign * 0.040)
    detail_face_and_hands(t, moving=0.72 if pace == 'walk' else 0.82 if pace in ('jog','backward') else 1.0, alert=cfg['alert'])
    apply_secondary(t, drive=cfg['secondary'], turn=yaw * 0.3)


def strafe_pose(t, direction):
    shift = phase_curve(t, [(0.00,-0.82),(0.20,-0.24),(0.38,0.64),(0.50,0.86),(0.72,-0.08),(1.00,-0.82)])
    lift = phase_curve(t, [(0.00,0.10),(0.20,0.02),(0.42,0.72),(0.62,0.92),(0.82,0.26),(1.00,0.10)])
    counter = phase_curve(t, [(0.00,-0.70),(0.25,0.08),(0.50,0.68),(0.76,-0.10),(1.00,-0.70)])
    loc('Hips', direction * 0.022 * shift, 0.0, -0.024 + 0.020 * abs(counter))
    rot('Hips', 0.025, direction * 0.055 * counter, -direction * 0.105 * shift)
    rot('Spine', 0.018, -direction * 0.050 * counter, direction * 0.082 * shift)
    rot('Chest', 0.018, -direction * 0.040 * counter, direction * 0.056 * shift)
    rot('Head', -0.020, direction * 0.070 * counter, -direction * 0.034 * shift)
    lead = 'R' if direction > 0 else 'L'
    support = 'L' if direction > 0 else 'R'
    sign_lead = 1 if lead == 'R' else -1
    sign_support = -sign_lead
    rot('Thigh' + lead, 0.15 * counter, -direction * 0.12 * shift, -sign_lead * 0.22 * shift)
    rot('Shin' + lead, 0.20 + 0.26 * max(0.0, lift), 0.0, 0.0)
    rot('Foot' + lead, -0.08 - 0.10 * lift, direction * 0.05 * counter, sign_lead * 0.035)
    rot('Thigh' + support, -0.10 * counter, direction * 0.07 * shift, -sign_support * 0.22 * shift)
    rot('Shin' + support, 0.16 + 0.34 * max(0.0, -counter), 0.0, 0.0)
    rot('Foot' + support, -0.04 + 0.05 * counter, -direction * 0.03 * counter, sign_support * 0.018)
    rot('UpperArmL', -direction * 0.22 * counter, -0.03, 0.08 * shift)
    rot('UpperArmR', direction * 0.22 * counter, 0.03, -0.08 * shift)
    rot('ForearmL', -0.15 - 0.08 * abs(counter), 0.0, 0.0)
    rot('ForearmR', -0.15 - 0.08 * abs(counter), 0.0, 0.0)
    detail_face_and_hands(t, moving=0.74, alert=0.30)
    apply_secondary(t, drive=1.12, turn=direction * counter * 0.45)


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


def turn_pose(t, angle_scale=1.0):
    load = curve(t, [(0.00,0.0),(0.18,1.0),(0.34,0.72),(0.55,0.15),(1.00,0.0)])
    turn = curve(t, [(0.00,0.0),(0.18,0.08),(0.42,0.48),(0.62,1.0),(0.82,0.38),(1.00,0.0)])
    settle = curve(t, [(0.00,0.0),(0.62,0.0),(0.79,1.0),(0.90,-0.30),(1.00,0.0)])
    scale = max(0.45, min(1.55, angle_scale))
    loc('Hips', 0.0, 0.0, -0.055 * load + 0.012 * settle)
    rot('Hips', 0.035 * load, 0.54 * turn * scale, 0.055 * load)
    rot('Spine', 0.0, 0.23 * turn * scale, -0.045 * load)
    rot('Chest', 0.0, 0.14 * turn * scale, -0.025 * load)
    rot('Head', 0.0, 0.18 * scale * curve(t, [(0.00,0.0),(0.12,0.55),(0.36,1.0),(0.72,0.45),(1.00,0.0)]), 0.0)
    rot('ThighL', 0.10 * load, -0.10 * turn * scale, -0.05 * load)
    rot('ShinL', 0.22 * load)
    rot('FootL', -0.12 * load, -0.08 * turn * scale, 0.0)
    rot('ThighR', -0.12 * load + 0.22 * turn, 0.18 * turn * scale, 0.04 * load)
    rot('ShinR', 0.18 * load + 0.20 * turn)
    rot('FootR', -0.06 * load, 0.16 * turn * scale, 0.0)
    rot('UpperArmL', 0.08 * turn * scale)
    rot('UpperArmR', -0.12 * turn * scale)
    detail_face_and_hands(t, moving=0.28, alert=0.30 + 0.08 * (scale - 1.0))
    apply_secondary(t, drive=0.8 + 0.22 * (scale - 1.0), turn=turn * scale, braking=settle)


def jump_start_pose(t):
    compress = curve(t, [(0.00,0.0),(0.18,0.36),(0.42,1.0),(0.62,0.74),(0.82,0.20),(1.00,0.0)])
    launch = curve(t, [(0.00,0.0),(0.38,0.0),(0.58,0.22),(0.78,1.0),(1.00,0.82)])
    loc('Hips', 0.0, 0.0, -0.13 * compress + 0.075 * launch)
    rot('Hips', 0.12 * compress - 0.05 * launch, 0.0, 0.0)
    rot('Spine', 0.08 * compress - 0.035 * launch, 0.0, 0.0)
    rot('Chest', 0.06 * compress - 0.025 * launch, 0.0, 0.0)
    rot('Head', -0.07 * compress + 0.025 * launch, 0.0, 0.0)
    for side, sign in [('L',-1),('R',1)]:
        rot('Thigh'+side, 0.34 * compress - 0.10 * launch, 0.0, -sign * 0.025 * compress)
        rot('Shin'+side, 0.52 * compress - 0.12 * launch, 0.0, 0.0)
        rot('Foot'+side, -0.20 * compress + 0.10 * launch, 0.0, 0.0)
        rot('UpperArm'+side, -0.24 * compress + 0.34 * launch, sign * 0.03, -sign * 0.04)
        rot('Forearm'+side, -0.18 * compress - 0.08 * launch, 0.0, 0.0)
    detail_face_and_hands(t, moving=0.82, alert=0.44)
    apply_secondary(t, drive=0.72 + 0.95 * launch, braking=-launch)


def jump_air_pose(t):
    arc = curve(t, [(0.00,0.72),(0.20,0.94),(0.50,1.0),(0.78,0.88),(1.00,0.58)])
    tuck = curve(t, [(0.00,0.22),(0.24,0.62),(0.58,0.48),(0.82,0.28),(1.00,0.18)])
    reach = curve(t, [(0.00,0.34),(0.32,0.52),(0.62,0.22),(1.00,-0.08)])
    loc('Hips', 0.0, 0.0, 0.085 + 0.045 * arc)
    rot('Hips', -0.055 + 0.03 * arc, 0.035 * (arc - 0.7), 0.02 * (tuck - 0.3))
    rot('Spine', 0.055 - 0.03 * arc, -0.025 * (arc - 0.7), -0.015 * (tuck - 0.3))
    rot('Chest', 0.035, -0.018 * (arc - 0.7), 0.018 * (tuck - 0.3))
    rot('Head', -0.035, 0.025 * (0.5 - t), 0.0)
    rot('ThighL', 0.24 + 0.25 * tuck, 0.0, -0.025)
    rot('ShinL', 0.36 + 0.30 * tuck, 0.0, 0.0)
    rot('FootL', -0.12 - 0.10 * tuck, 0.0, 0.0)
    rot('ThighR', 0.18 + 0.20 * tuck, 0.0, 0.025)
    rot('ShinR', 0.30 + 0.24 * tuck, 0.0, 0.0)
    rot('FootR', -0.10 - 0.08 * tuck, 0.0, 0.0)
    rot('UpperArmL', 0.18 + 0.18 * reach, -0.03, -0.05)
    rot('UpperArmR', 0.11 + 0.16 * reach, 0.03, 0.05)
    rot('ForearmL', -0.18 - 0.10 * tuck, 0.0, 0.0)
    rot('ForearmR', -0.16 - 0.08 * tuck, 0.0, 0.0)
    detail_face_and_hands(t, moving=0.95, alert=0.48)
    apply_secondary(t, drive=1.45, turn=0.18 * (0.5 - t), braking=-0.18 * arc)


def land_pose(t):
    impact = curve(t, [(0.00,0.18),(0.10,0.84),(0.22,1.0),(0.42,0.58),(0.66,0.12),(1.00,0.0)])
    settle = curve(t, [(0.00,0.0),(0.38,0.0),(0.58,0.34),(0.74,-0.18),(0.90,0.06),(1.00,0.0)])
    loc('Hips', 0.0, 0.0, -0.125 * impact + 0.012 * settle)
    rot('Hips', 0.14 * impact - 0.025 * settle, 0.0, 0.0)
    rot('Spine', 0.105 * impact - 0.020 * settle, 0.0, 0.0)
    rot('Chest', 0.072 * impact - 0.018 * settle, 0.0, 0.0)
    rot('Head', -0.090 * impact + 0.024 * settle, 0.0, 0.0)
    for side, sign in [('L',-1),('R',1)]:
        asym = 1.0 if side == 'L' else 0.92
        rot('Thigh'+side, 0.36 * impact * asym, 0.0, -sign * 0.024 * impact)
        rot('Shin'+side, 0.58 * impact * asym, 0.0, 0.0)
        rot('Foot'+side, -0.22 * impact + 0.04 * settle, 0.0, 0.0)
        rot('UpperArm'+side, -0.20 * impact + 0.08 * settle, sign * 0.025, -sign * 0.035)
        rot('Forearm'+side, -0.16 * impact, 0.0, 0.0)
    detail_face_and_hands(t, moving=0.46, alert=0.26)
    apply_secondary(t, drive=0.78, braking=impact)


def crouch_pose(t):
    breathe = phase_curve(t, [(0.00,0.0),(0.22,0.54),(0.48,1.0),(0.74,0.30),(1.00,0.0)])
    weight = phase_curve(t, [(0.00,-0.18),(0.20,-0.06),(0.46,0.15),(0.72,0.09),(1.00,-0.18)])
    loc('Hips', 0.010 * weight, 0.0, -0.145 + 0.012 * breathe)
    rot('Hips', 0.16, 0.035 * weight, 0.045 * weight)
    rot('Spine', 0.10 + 0.014 * breathe, -0.030 * weight, -0.035 * weight)
    rot('Chest', 0.055 - 0.012 * breathe, -0.020 * weight, 0.028 * weight)
    rot('Head', -0.10 + 0.014 * breathe, 0.040 * weight, -0.015 * weight)
    for side, sign in [('L',-1),('R',1)]:
        rot('Thigh'+side, 0.46 + sign * 0.020 * weight, 0.0, -sign * 0.025)
        rot('Shin'+side, 0.66 + max(0.0,-sign * weight) * 0.035, 0.0, 0.0)
        rot('Foot'+side, -0.24 + 0.012 * breathe, 0.0, sign * 0.010)
        rot('UpperArm'+side, 0.06 + sign * 0.020 * weight, sign * 0.025, -sign * 0.030)
        rot('Forearm'+side, -0.12 - 0.018 * breathe, 0.0, 0.0)
    detail_face_and_hands(t, moving=0.12, alert=0.24)
    apply_secondary(t, drive=0.52, turn=weight * 0.22)



# 실제 접지 보정: 관절 키포즈를 보존하고 지면을 디딘 발의 횡(X)/수직(Z)
# 지점만 유지한다. Root/Hips의 게임 이동, 전진(Y) 거리는 수정하지 않는다.
# 임의의 QA 한도 완화나 검증 생략이 아니라 실제 FootL/FootR 위치 키를 굽는다.
GAIT_STANCE_BY_PACE = {
    'walk': 0.30, 'jog': 0.27, 'run': 0.22, 'sprint': 0.18, 'backward': 0.28,
}
GAIT_NAME_TO_PACE = {
    'common_walk_hq': 'walk',
    'common_jog_hq': 'jog',
    'common_run_hq': 'run',
    'common_sprint_hq': 'sprint',
    'common_backward_hq': 'backward',
}
GAIT_CONTACT_ANCHORS = {}
for _pace in GAIT_STANCE_BY_PACE:
    for _foot, _phase in [('FootL', 0.0), ('FootR', 0.5)]:
        reset_pose()
        gait_pose(_phase, _pace)
        bpy.context.view_layer.update()
        _joint = RIG.pose.bones[_foot]
        GAIT_CONTACT_ANCHORS[(_pace, _foot)] = RIG.matrix_world @ _joint.matrix.translation
reset_pose()


def stabilize_planted_feet(t, pace):
    """Keep lateral/vertical foot contact while allowing authored forward in-place gait."""
    stance = GAIT_STANCE_BY_PACE[pace]
    for side, phase_offset in [('L', 0.0), ('R', 0.5)]:
        phase = (t + phase_offset) % 1.0
        if phase <= stance:
            pin_weight = 1.0
        elif phase < stance + 0.12:
            pin_weight = 1.0 - smoothstep((phase - stance) / 0.12)
        elif phase > 0.85:
            pin_weight = smoothstep((phase - 0.85) / 0.15)
        else:
            continue
        if pin_weight <= 1e-7:
            continue

        bone_name = 'Foot' + side
        bone = RIG.pose.bones[bone_name]
        original_location = bone.location.copy()
        bpy.context.view_layer.update()
        current = RIG.matrix_world @ bone.matrix.translation
        desired = GAIT_CONTACT_ANCHORS[(pace, bone_name)]
        # Allow forward motion (Y), but preserve planted lateral (X) and height (Z).
        delta_world = Vector((desired.x - current.x, 0.0, desired.z - current.z)) * pin_weight
        if delta_world.length <= 1e-8:
            continue

        # Solve a real local-space foot translation from the evaluated animated rig.
        # Do not assume foot-parent axes align with global axes.
        basis = []
        step = 0.001
        for axis in range(3):
            offset = Vector((0.0, 0.0, 0.0))
            offset[axis] = step
            bone.location = original_location + offset
            bpy.context.view_layer.update()
            after = RIG.matrix_world @ bone.matrix.translation
            basis.append((after - current) / step)
        local_to_world = Matrix((
            (basis[0].x, basis[1].x, basis[2].x),
            (basis[0].y, basis[1].y, basis[2].y),
            (basis[0].z, basis[1].z, basis[2].z),
        ))
        if abs(local_to_world.determinant()) < 1e-8:
            raise AssertionError('FOOT_PLANT_LOCAL_AXES_SINGULAR:'+pace+':'+side)
        bone.location = original_location + local_to_world.inverted() @ delta_world
        bpy.context.view_layer.update()



# 기본 공용 공격·방어·피격: 각 클립은 별도 무게 중심, 어깨/팔꿈치,
# 지지발/회복 곡선을 사용한다. 속도 배율만 바꾼 파생 모션으로 세지 않는다.
# 이동/피격/쿨다운 판정 권한은 여전히 소비 게임 엔진에 남는다.
def action_pose(name, t):
    wind = curve(t, [(0.0,0.0),(0.11,0.42),(0.24,1.0),(0.33,0.72),
                     (0.47,0.08),(0.66,0.0),(1.0,0.0)])
    impact = curve(t, [(0.0,0.0),(0.27,0.0),(0.39,0.65),(0.46,1.0),
                       (0.54,0.62),(0.72,0.0),(1.0,0.0)])
    settle = curve(t, [(0.0,0.0),(0.46,0.0),(0.63,0.22),(0.76,0.84),
                       (0.88,-0.18),(1.0,0.0)])
    if name.startswith('common_light_attack_'):
        step = {'common_light_attack_1_hq':1,
                'common_light_attack_2_hq':2,
                'common_light_attack_3_hq':3}[name]
        left_lead = step == 2
        sign = -1 if left_lead else 1
        main = 'L' if left_lead else 'R'
        guard = 'R' if left_lead else 'L'
        # Combo1: right diagonal jab, Combo2: left hook, Combo3: overhead cleave.
        overhead = step == 3
        hip_coil = (0.19 + (0.06 if overhead else 0.0)) * wind
        hip_fire = (-0.27 if overhead else -0.18) * impact
        loc('Hips', sign * (0.018*wind-0.032*impact), 0.0,
            -0.055*wind + 0.028*impact - 0.012*settle)
        rot('Hips', 0.08*wind-0.16*impact, sign*(hip_coil+hip_fire), 0.05*settle)
        rot('Spine', 0.12*wind-0.24*impact, sign*(-0.15*wind+0.20*impact), 0.03*settle)
        rot('Chest', -0.10*wind+0.23*impact, sign*(-0.18*wind+0.31*impact), -sign*0.045*settle)
        rot('Head', 0.04*wind-0.12*impact, -sign*0.07*impact, 0.0)
        swing = 0.60*wind - (1.03 if overhead else 0.88)*impact
        shoulder_lift = -0.35*wind - (0.19 if overhead else -0.12)*impact
        rot('UpperArm'+main, swing, sign*0.24*(wind+impact), -sign*shoulder_lift)
        rot('Forearm'+main, -0.38*wind + (0.50 if overhead else 0.26)*impact)
        rot('Hand'+main, 0.16*wind-0.34*impact)
        rot('UpperArm'+guard, -0.16*wind+0.20*impact,-sign*0.10,sign*0.19)
        rot('Forearm'+guard, -0.21-0.12*wind)
        rot('Thigh'+main, 0.24*wind-0.18*impact)
        rot('Shin'+main, 0.16*wind+0.28*impact)
        rot('Foot'+main, -0.12*wind+0.09*impact)
        rot('Thigh'+guard, -0.18*wind+0.12*settle)
        rot('Shin'+guard, 0.11+0.13*settle)
        detail_face_and_hands(t, moving=0.9, alert=0.55)
        apply_secondary(t, drive=1.5, turn=sign*(wind-impact))
    elif name.startswith('common_heavy_attack_'):
        sweep = name == 'common_heavy_attack_2_hq'
        sign = -1 if sweep else 1
        preload = curve(t,[(0,0),(.12,.55),(.34,1.0),(.47,.92),(.57,.08),(.78,0),(1,0)])
        smash = curve(t,[(0,0),(.46,0),(.60,1.0),(.67,.76),(.80,0),(1,0)])
        loc('Hips',sign*0.035*preload,0,-0.12*preload+0.065*smash)
        rot('Hips',0.20*preload-0.30*smash, sign*(0.27*preload-0.39*smash),0.06*settle)
        rot('Spine',0.16*preload-0.40*smash,-sign*0.18*preload+sign*0.31*smash)
        rot('Chest',-0.25*preload+0.37*smash,-sign*0.22*preload+sign*0.38*smash)
        rot('Head',0.11*preload-0.16*smash,-sign*0.10*smash)
        rot('UpperArmR',-0.60*preload+1.12*smash,sign*0.23,-0.29*preload)
        rot('UpperArmL',-0.49*preload+0.89*smash,-sign*0.21,0.32*preload)
        rot('ForearmR',-0.52*preload+0.34*smash)
        rot('ForearmL',-0.36*preload+0.38*smash)
        rot('HandR',0.22*preload-0.33*smash)
        rot('HandL',0.18*preload-0.26*smash)
        rot('ThighL',0.26*preload-0.22*smash)
        rot('ThighR',-0.23*preload+0.25*smash)
        rot('ShinL',0.38*preload)
        rot('ShinR',0.24*smash)
        rot('FootL',-0.18*preload+0.08*smash)
        detail_face_and_hands(t,moving=0.85,alert=0.70)
        apply_secondary(t,drive=1.9,turn=sign*(preload-smash),braking=smash)
    elif name in ('common_guard_raise_hq','common_guard_hold_hq'):
        if name == 'common_guard_raise_hq':
            shield=curve(t,[(0,0),(.16,.28),(.43,1.0),(.72,1.0),(1,1.0)])
        else:
            shield=1.0
        breathe=phase_curve(t,[(0,0),(.22,.15),(.48,-.08),(.76,.14),(1,0)])
        loc('Hips',0,0,-0.038*shield+0.008*breathe)
        rot('Hips',.07*shield,-0.035*breathe,0)
        rot('Spine',-.05*shield+.032*breathe,0,.02*breathe)
        rot('Chest',-.10*shield+.028*breathe,.05*breathe,0)
        rot('Head',.06*shield,-.035*breathe,0)
        rot('UpperArmL',-.39*shield+.035*breathe,-.28*shield,-.20*shield)
        rot('UpperArmR',-.42*shield-.032*breathe,.29*shield,.22*shield)
        rot('ForearmL',-.73*shield,.04,-.12*shield)
        rot('ForearmR',-.68*shield,-.04,.10*shield)
        rot('HandL',-.15*shield);rot('HandR',-.14*shield)
        rot('ThighL',.12*shield);rot('ThighR',.11*shield)
        rot('ShinL',.18*shield);rot('ShinR',.16*shield)
        detail_face_and_hands(t,moving=0.12,alert=0.8)
        apply_secondary(t,drive=.35,turn=breathe*.13)
    elif name == 'common_parry_hq':
        react=curve(t,[(0,0),(.13,.4),(.28,1),(.38,.3),(.55,-.20),(.77,0),(1,0)])
        loc('Hips',-.018*react,0,-.035*abs(react))
        rot('Hips',.13*react,-.19*react)
        rot('Spine',-.10*react,.23*react)
        rot('Chest',-.18*react,.27*react)
        rot('Head',-.08*react,-.10*react)
        rot('UpperArmR',-.72*react,.39*react,.31*react)
        rot('ForearmR',-.45*react)
        rot('HandR',-.30*react)
        rot('UpperArmL',-.22*react,-.18*react,-.22*react)
        rot('ThighL',.24*react)
        rot('ThighR',-.18*react)
        rot('ShinL',.18*abs(react))
        detail_face_and_hands(t,moving=.6,alert=.95)
        apply_secondary(t,drive=1.2,turn=react)
    elif name in ('common_dodge_left_hq','common_dodge_right_hq'):
        sign = -1 if 'left' in name else 1
        load=curve(t,[(0,0),(.12,.85),(.26,.95),(.39,0),(.55,0),(1,0)])
        launch=curve(t,[(0,0),(.25,0),(.40,1),(.58,.72),(.77,0),(1,0)])
        loc('Hips',sign*(.035*load+.065*launch),0,-.13*load+.07*launch)
        rot('Hips',-.16*load+0.12*launch,sign*.12*launch,-sign*.20*launch)
        rot('Spine',-.18*load+0.15*launch,-sign*.12*launch,sign*.16*launch)
        rot('Chest',-.12*load+.12*launch,-sign*.15*launch,sign*.12*launch)
        rot('Head',.08*load-.08*launch,sign*.08*launch)
        rot('ThighL',(.41 if sign<0 else -.20)*load-.32*launch)
        rot('ThighR',(.41 if sign>0 else -.20)*load-.29*launch)
        rot('ShinL',.45*load+.12*launch)
        rot('ShinR',.40*load+.16*launch)
        rot('FootL',-.19*load+.14*launch)
        rot('FootR',-.17*load+.12*launch)
        rot('UpperArmL',sign*.31*launch-.14*load)
        rot('UpperArmR',-sign*.34*launch-.12*load)
        rot('ForearmL',-.17*load);rot('ForearmR',-.18*load)
        detail_face_and_hands(t,moving=.93,alert=.86)
        apply_secondary(t,drive=1.42,turn=sign*launch,braking=load)
    elif name in ('common_hit_front_hq','common_hit_back_hq'):
        sign=1 if 'front' in name else -1
        recoil=curve(t,[(0,0),(.08,.58),(.22,1),(.34,.64),(.48,.16),(.68,-.14),(.85,0),(1,0)])
        loc('Hips',0,0,-.07*abs(recoil))
        rot('Hips',sign*.24*recoil,.07*recoil,.06*recoil)
        rot('Spine',sign*.34*recoil,-.09*recoil)
        rot('Chest',sign*.39*recoil,.10*recoil)
        rot('Head',-sign*.28*recoil,-.07*recoil)
        rot('UpperArmL',-sign*.44*recoil,-.13*recoil,.16*recoil)
        rot('UpperArmR',-sign*.39*recoil,.11*recoil,-.14*recoil)
        rot('ForearmL',-.36*abs(recoil));rot('ForearmR',-.33*abs(recoil))
        rot('ThighL',.25*abs(recoil));rot('ThighR',-.22*recoil)
        rot('ShinL',.25*abs(recoil));rot('ShinR',.27*abs(recoil))
        detail_face_and_hands(t,moving=.45,alert=.85)
        apply_secondary(t,drive=1.25,braking=recoil)
    elif name == 'common_death_front_hq':
        fall=curve(t,[(0,0),(.10,.11),(.29,.32),(.55,.91),(.70,1),(1,1)])
        stagger=curve(t,[(0,0),(.18,.66),(.33,-.22),(.55,0),(1,0)])
        loc('Hips',0,0,-.48*fall)
        rot('Hips',.93*fall+.10*stagger,.05*stagger)
        rot('Spine',.24*fall-.09*stagger)
        rot('Chest',.27*fall-.12*stagger)
        rot('Head',-.28*fall+.06*stagger)
        rot('UpperArmL',-.31*fall+.13*stagger,.11,.28*fall)
        rot('UpperArmR',-.32*fall-.12*stagger,-.10,-.29*fall)
        rot('ForearmL',-.47*fall);rot('ForearmR',-.40*fall)
        rot('ThighL',-.38*fall);rot('ThighR',-.29*fall)
        rot('ShinL',.57*fall);rot('ShinR',.51*fall)
        detail_face_and_hands(t,moving=.08,alert=.22*(1-fall))
        apply_secondary(t,drive=.8*(1-fall),braking=stagger)
    elif name == 'common_cast_burst_hq':
        gather=curve(t,[(0,0),(.18,.42),(.33,1),(.45,.85),(.57,.12),(.82,0),(1,0)])
        release=curve(t,[(0,0),(.41,0),(.57,1),(.68,.38),(.81,0),(1,0)])
        loc('Hips',0,0,-.026*gather+.025*release)
        rot('Hips',-.08*gather+.10*release,0)
        rot('Spine',-.18*gather+.14*release,.06*gather)
        rot('Chest',-.22*gather+.27*release,-.08*gather)
        rot('Head',.09*gather-.16*release)
        rot('UpperArmL',-.82*gather+1.12*release,-.27*gather,.22*gather)
        rot('UpperArmR',-.78*gather+1.08*release,.29*gather,-.24*gather)
        rot('ForearmL',-.36*gather+.14*release)
        rot('ForearmR',-.39*gather+.16*release)
        rot('HandL',.23*gather-.37*release)
        rot('HandR',.25*gather-.36*release)
        rot('ThighL',.12*gather);rot('ThighR',.10*gather)
        detail_face_and_hands(t,moving=.45,alert=.91)
        apply_secondary(t,drive=1.65,braking=release)
    elif name in CLASS_ACTION_POSES:
        # 관절별 서로 다른 준비/발동 키포즈: 직업 실루엣과 체중 이동을 보존한다.
        profile = CLASS_ACTION_POSES[name]
        incoming = curve(t, [(0,0),(.12,.25),(.29,1),(.36,1),(.49,0),(.70,0),(1,0)])
        contact = curve(t, [(0,0),(.31,0),(.48,.34),(.58,1),(.68,.78),(.87,0),(1,0)])
        recoil = curve(t, [(0,0),(.57,0),(.73,.5),(.84,-.16),(1,0)])
        bones = set(profile['anticipation']) | set(profile['release'])
        for bone_name in bones:
            first = profile['anticipation'].get(bone_name, ())
            second = profile['release'].get(bone_name, ())
            angles = [
                (first[axis] if axis<len(first) else 0) * incoming +
                (second[axis] if axis<len(second) else 0) * contact +
                (second[axis] if axis<len(second) else 0) * .08 * recoil
                for axis in range(3)
            ]
            rot(bone_name,*angles)
        # Root는 게임 전용 권한이므로 항상 고정하고, Hips만 국부 체중을 이동한다.
        loc('Hips', .019*incoming-.027*contact,0,-.057*incoming+.029*contact)
        detail_face_and_hands(t,moving=.75,alert=.86)
        apply_secondary(t,drive=1.3,turn=incoming-contact,braking=contact)
    else:
        raise AssertionError('UNKNOWN_COMMON_ACTION:'+name)


def animate(name, normalized_time):
    reset_pose()
    t = clamp01(normalized_time)
    if name in LOOP_CLIPS and t >= 1.0 - 1e-9:
        t = 0.0
    if name == 'common_idle_hq':
        idle_pose(t)
    elif name == 'common_walk_hq':
        gait_pose(t, 'walk')
    elif name == 'common_jog_hq':
        gait_pose(t, 'jog')
    elif name == 'common_run_hq':
        gait_pose(t, 'run')
    elif name == 'common_sprint_hq':
        gait_pose(t, 'sprint')
    elif name == 'common_start_hq':
        start_pose(t)
        if t >= 0.70:
            authored = pose_snapshot()
            reset_pose(); gait_pose(0.0, 'walk'); handoff = pose_snapshot()
            apply_snapshot(blend_snapshots(authored, handoff, (t - 0.70) / 0.30))
    elif name == 'common_stop_hq':
        stop_pose(t)
        authored = pose_snapshot()
        if t <= 0.24:
            reset_pose(); gait_pose(0.0, 'walk'); incoming = pose_snapshot()
            apply_snapshot(blend_snapshots(incoming, authored, t / 0.24))
        elif t >= 0.76:
            reset_pose(); idle_pose(0.0); idle = pose_snapshot()
            apply_snapshot(blend_snapshots(authored, idle, (t - 0.76) / 0.24))
    elif name == 'common_strafe_left_hq':
        strafe_pose(t, -1)
    elif name == 'common_strafe_right_hq':
        strafe_pose(t, 1)
    elif name == 'common_backward_hq':
        gait_pose(t, 'backward')
    elif name in ('common_turn_45_hq','common_turn_90_hq','common_turn_180_hq'):
        scale = {'common_turn_45_hq':0.55,'common_turn_90_hq':1.0,'common_turn_180_hq':1.55}[name]
        turn_pose(t, scale)
        authored = pose_snapshot()
        if t <= 0.18:
            reset_pose(); idle_pose(0.0); idle = pose_snapshot()
            apply_snapshot(blend_snapshots(idle, authored, t / 0.18))
        elif t >= 0.78:
            reset_pose(); idle_pose(0.0); idle = pose_snapshot()
            apply_snapshot(blend_snapshots(authored, idle, (t - 0.78) / 0.22))
    elif name == 'common_jump_start_hq':
        jump_start_pose(t)
        authored = pose_snapshot()
        if t <= 0.16:
            reset_pose(); idle_pose(0.0); idle = pose_snapshot()
            apply_snapshot(blend_snapshots(idle, authored, t / 0.16))
        elif t >= 0.78:
            reset_pose(); jump_air_pose(0.0); air = pose_snapshot()
            apply_snapshot(blend_snapshots(authored, air, (t - 0.78) / 0.22))
    elif name == 'common_jump_air_hq':
        jump_air_pose(t)
        authored = pose_snapshot()
        if t >= 0.82:
            reset_pose(); land_pose(0.0); landing = pose_snapshot()
            apply_snapshot(blend_snapshots(authored, landing, (t - 0.82) / 0.18))
    elif name == 'common_land_hq':
        land_pose(t)
        authored = pose_snapshot()
        if t >= 0.74:
            reset_pose(); idle_pose(0.0); idle = pose_snapshot()
            apply_snapshot(blend_snapshots(authored, idle, (t - 0.74) / 0.26))
    elif name == 'common_crouch_hq':
        crouch_pose(t)
    elif name in ACTION_CLIPS:
        action_pose(name,t)
    else:
        raise AssertionError('UNKNOWN_CLIP:' + name)
    if name in GAIT_NAME_TO_PACE:
        stabilize_planted_feet(t, GAIT_NAME_TO_PACE[name])


for clip_name, duration in EXPORT_CLIPS.items():
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
            if pose_bone.name in ('Hips', 'FootL', 'FootR'):
                pose_bone.keyframe_insert('location', frame=frame)
    action.use_fake_user = True
    for curve_data in action.fcurves:
        for point in curve_data.keyframe_points:
            point.interpolation = 'BEZIER'

# 실제 관절 샘플 기반 QA. 이름만 있는 모션은 통과시키지 않는다.
def sampled_snapshot(clip_name, t):
    animate(clip_name, t)
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
    loop_metrics[clip_name]=snapshot_distance(sampled_snapshot(clip_name,0.0),sampled_snapshot(clip_name,1.0))

transition_metrics={
    'startToWalk':snapshot_distance(sampled_snapshot('common_start_hq',1.0),sampled_snapshot('common_walk_hq',0.0)),
    'stopFromWalk':snapshot_distance(sampled_snapshot('common_stop_hq',0.0),sampled_snapshot('common_walk_hq',0.0)),
    'stopToIdle':snapshot_distance(sampled_snapshot('common_stop_hq',1.0),sampled_snapshot('common_idle_hq',0.0)),
    'turn45FromIdle':snapshot_distance(sampled_snapshot('common_turn_45_hq',0.0),sampled_snapshot('common_idle_hq',0.0)),
    'turn45ToIdle':snapshot_distance(sampled_snapshot('common_turn_45_hq',1.0),sampled_snapshot('common_idle_hq',0.0)),
    'turn90FromIdle':snapshot_distance(sampled_snapshot('common_turn_90_hq',0.0),sampled_snapshot('common_idle_hq',0.0)),
    'turn90ToIdle':snapshot_distance(sampled_snapshot('common_turn_90_hq',1.0),sampled_snapshot('common_idle_hq',0.0)),
    'turn180FromIdle':snapshot_distance(sampled_snapshot('common_turn_180_hq',0.0),sampled_snapshot('common_idle_hq',0.0)),
    'turn180ToIdle':snapshot_distance(sampled_snapshot('common_turn_180_hq',1.0),sampled_snapshot('common_idle_hq',0.0)),
    'jumpStartFromIdle':snapshot_distance(sampled_snapshot('common_jump_start_hq',0.0),sampled_snapshot('common_idle_hq',0.0)),
    'jumpStartToAir':snapshot_distance(sampled_snapshot('common_jump_start_hq',1.0),sampled_snapshot('common_jump_air_hq',0.0)),
    'airToLand':snapshot_distance(sampled_snapshot('common_jump_air_hq',1.0),sampled_snapshot('common_land_hq',0.0)),
    'landToIdle':snapshot_distance(sampled_snapshot('common_land_hq',1.0),sampled_snapshot('common_idle_hq',0.0)),
}
speed_blend_metrics={}
for first,second in (('common_walk_hq','common_jog_hq'),('common_jog_hq','common_run_hq'),('common_run_hq','common_sprint_hq')):
    speed_blend_metrics[first+'->'+second]=max(snapshot_distance(sampled_snapshot(first,p),sampled_snapshot(second,p))['rotationMaxRad'] for p in (0.0,0.5))
phase_metrics={}
for clip_name in ('common_walk_hq','common_jog_hq','common_run_hq','common_sprint_hq','common_backward_hq'):
    phase_metrics[clip_name]=abs(sampled_snapshot(clip_name,0.0)['ThighL']['r'][0]-sampled_snapshot(clip_name,0.5)['ThighR']['r'][0])

height=rig_height()
contact_windows={
    'common_walk_hq':((0.00,0.30),(0.50,0.80)),
    'common_jog_hq':((0.00,0.27),(0.50,0.77)),
    'common_run_hq':((0.00,0.22),(0.50,0.72)),
    'common_sprint_hq':((0.00,0.18),(0.50,0.68)),
    'common_backward_hq':((0.00,0.28),(0.50,0.78)),
    'common_strafe_left_hq':((0.00,0.20),(0.50,0.70)),
    'common_strafe_right_hq':((0.00,0.20),(0.50,0.70)),
}
foot_contact_metrics={}
for clip_name,(left_window,right_window) in contact_windows.items():
    foot_contact_metrics[clip_name]={
        'left':contact_drift(clip_name,'FootL',*left_window)/height,
        'right':contact_drift(clip_name,'FootR',*right_window)/height,
    }
primary_activity={
    clip_name:{bone:rotation_activity(clip_name,bone) for bone in QA_THRESHOLDS['primaryJointRotationRangeMinRad']}
    for clip_name in LOCOMOTION_QA_CLIPS
}
secondary_candidates=[bone for bone in SECONDARY_QA_BONES if bone in RIG.pose.bones]
secondary_activity={
    clip_name:max([rotation_activity(clip_name,bone) for bone in secondary_candidates] or [0.0])
    for clip_name in DYNAMIC_SECONDARY_QA_CLIPS
}
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

# Source-only action articulation QA; only the focused authored clip can be promoted.
focused_action_joint_activity = {
    bone: rotation_activity(ARGS.focus,bone)
    for bone in ('Hips','Spine','Chest','UpperArmL','UpperArmR','ThighL','ThighR')
} if ARGS.focus in ACTION_CLIPS else {}
focused_action_activity_max = max(focused_action_joint_activity.values(),default=0.0)
qa_failures=[]
for clip_name,row in loop_metrics.items():
    if row['rotationMaxRad']>QA_THRESHOLDS['loopRotationMaxRad'] or row['locationMax']>QA_THRESHOLDS['loopLocationMax']:
        qa_failures.append('LOOP_CONTINUITY:'+clip_name)
for name,row in transition_metrics.items():
    if row['rotationMaxRad']>QA_THRESHOLDS['transitionRotationMaxRad']:
        qa_failures.append('TRANSITION_POP:'+name)
for name,value in speed_blend_metrics.items():
    if value>QA_THRESHOLDS['speedBlendRotationMaxRad']:
        qa_failures.append('SPEED_BLEND_POSE_GAP:'+name)
if root_metrics['rotationMaxRad']>QA_THRESHOLDS['rootRotationMaxRad'] or root_metrics['locationMax']>QA_THRESHOLDS['rootLocationMax']:
    qa_failures.append('ROOT_AUTHORITY_INTRUSION')
if max_euler>QA_THRESHOLDS['maxEulerRad'] or not all_finite:
    qa_failures.append('INVALID_OR_EXTREME_ROTATION')
if ARGS.focus in ACTION_CLIPS:
    min_activity = 0.005 if ARGS.focus == 'common_guard_hold_hq' else 0.20
    if focused_action_activity_max < min_activity:
        qa_failures.append('COMMON_ACTION_ARTICULATION_STATIC:'+ARGS.focus)
    if ARGS.focus.startswith(('common_light_attack_','common_heavy_attack_','common_cast_')):
        if max(focused_action_joint_activity['UpperArmL'],focused_action_joint_activity['UpperArmR'])<0.30:
            qa_failures.append('COMMON_ACTION_ARM_SWING_MISSING:'+ARGS.focus)
for clip_name,value in phase_metrics.items():
    if value>QA_THRESHOLDS['leftRightPhaseErrorRad']:
        qa_failures.append('LEFT_RIGHT_PHASE:'+clip_name)
for clip_name,feet in foot_contact_metrics.items():
    maximum=QA_THRESHOLDS['footContactLateralVerticalDriftNormalizedMaxByClip'][clip_name]
    for side,value in feet.items():
        if value>maximum:
            qa_failures.append(f'FOOT_CONTACT_DRIFT:{clip_name}:{side}')
for clip_name,rows in primary_activity.items():
    for bone,minimum in QA_THRESHOLDS['primaryJointRotationRangeMinRad'].items():
        if rows[bone]<minimum:
            qa_failures.append(f'PRIMARY_JOINT_ACTIVITY:{clip_name}:{bone}')
for clip_name,value in secondary_activity.items():
    if value<QA_THRESHOLDS['secondaryRotationRangeMinRad']:
        qa_failures.append('SECONDARY_MOTION_ACTIVITY:'+clip_name)
qa_metrics={
    'thresholds':QA_THRESHOLDS,
    'loop':loop_metrics,
    'transitions':transition_metrics,
    'speedBlendRotationMaxRad':speed_blend_metrics,
    'leftRightPhaseErrorRad':phase_metrics,
    'footContactLateralVerticalDriftNormalized':foot_contact_metrics,
    'primaryJointRotationRangeRad':primary_activity,
    'secondaryRotationRangeMaxRadByClip':secondary_activity,
    'root':root_metrics,
    'maxEulerRad':max_euler,
    'allSamplesFinite':all_finite,
    'focusedClip':ARGS.focus,
    'focusedActionJointRotationRangeRad':focused_action_joint_activity,
    'focusedActionActivityMaxRad':focused_action_activity_max,
    'rigHeight':height,
    'failures':qa_failures,
    'staticMotionQaPass':not qa_failures,
}
assert not qa_failures, 'MOTION_STATIC_QA_FAILED:'+'|'.join(qa_failures)

# 새 파생 GLB에는 공용 기초 이동·회전·점프·웅크리기 17모션만 포함한다.
RIG.animation_data.action = bpy.data.actions[ARGS.focus]
bpy.context.scene.frame_set(0)

bpy.ops.object.select_all(action='DESELECT')
RIG.select_set(True)
for obj in bpy.context.scene.objects:
    if obj.type == 'MESH':
        obj.select_set(True)
bpy.context.view_layer.objects.active = RIG

output_glb = ARGS.output / 'common-humanoid-motion-v1.glb'
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
expected = list(EXPORT_CLIPS)
assert set(animation_names) == set(expected), (animation_names, expected)
assert document.get('skins'), 'DERIVED_SKIN_MISSING'
source_hash_after = hashlib.sha256(source.read_bytes()).hexdigest()
assert source_hash_after == source_hash, 'SOURCE_BINARY_CHANGED_DURING_BUILD'
derived_hash = hashlib.sha256(output_glb.read_bytes()).hexdigest()
assert derived_hash != source_hash, 'DERIVATIVE_IDENTICAL_TO_SOURCE'
nodes=document.get('nodes',[])
skins=document.get('skins',[])
all_targets_valid=True
animation_channel_count=0
max_channels_per_clip=0
for animation in document.get('animations',[]):
    channels=animation.get('channels',[])
    animation_channel_count+=len(channels)
    max_channels_per_clip=max(max_channels_per_clip,len(channels))
    for channel in channels:
        target=channel.get('target',{})
        node=target.get('node')
        path=target.get('path')
        if not isinstance(node,int) or node<0 or node>=len(nodes) or path not in {'rotation','translation','scale','weights'}:
            all_targets_valid=False
skin_joint_count=max((len(skin.get('joints',[])) for skin in skins),default=0)
node_names={row.get('name') for row in nodes}
platform_conversion_qa={
    'skinPresent':bool(skins),
    'skinJointCount':skin_joint_count,
    'requiredStandardBoneNodesPresent':REQUIRED_BONES.issubset(node_names),
    'inverseBindMatricesPresent':all('inverseBindMatrices' in skin for skin in skins),
    'allAnimationChannelTargetsValid':all_targets_valid,
    'rootAuthorityIntrusionFree':root_metrics['rotationMaxRad']<=QA_THRESHOLDS['rootRotationMaxRad'] and root_metrics['locationMax']<=QA_THRESHOLDS['rootLocationMax'],
    'sourceOriginalHashStable':source_hash_after==source_hash,
}
platform_conversion_qa['pass']=all(platform_conversion_qa.values())
mobile_budget={
    'artifactSizeBytes':output_glb.stat().st_size,
    'artifactSizeMaxBytes':QA_THRESHOLDS['mobileArtifactSizeMaxBytes'],
    'jointCount':skin_joint_count,
    'jointCountMax':QA_THRESHOLDS['mobileJointCountMax'],
    'animationCount':len(animation_names),
    'animationChannelCount':animation_channel_count,
    'maxChannelsPerClip':max_channels_per_clip,
    'targetFps':FPS,
}
mobile_budget['pass']=mobile_budget['artifactSizeBytes']<=mobile_budget['artifactSizeMaxBytes'] and mobile_budget['jointCount']<=mobile_budget['jointCountMax']
assert platform_conversion_qa['pass'], 'PLATFORM_CONVERSION_QA_FAILED:'+json.dumps(platform_conversion_qa,sort_keys=True)
assert mobile_budget['pass'], 'MOBILE_BUDGET_FAILED:'+json.dumps(mobile_budget,sort_keys=True)

evidence = {
    'assetId': 'shared-humanoid-motion-v1-' + ARGS.focus,
    'kind': 'CROSS_PLATFORM_SKINNED_HUMANOID_MOTION_MASTER_GLTF',
    'sourceAsset': str(ARGS.source.as_posix()),
    'sourceSha256': source_hash,
    'sourceSha256AfterBuild': source_hash_after,
    'derivedArtifact': 'common-humanoid-motion-v1.glb',
    'derivedSha256': derived_hash,
    'rigObject': RIG.name,
    'boneCount': len(RIG.pose.bones),
    'foundationTargetMotionCount': FOUNDATION_TARGET_MOTION_COUNT,
    'foundationMotionCount': len(EXPORT_CLIPS),
    'foundationRemainingMotionCount': FOUNDATION_TARGET_MOTION_COUNT - len(EXPORT_CLIPS),
    'foundationStage': 'SHARED_BASE_ACTION_ONE_CLIP_PER_WORK_UNIT',
    'foundationMotions': expected,
    'durations': EXPORT_CLIPS,
    'qualityIntent': [
        'KEY_POSE_DRIVEN_NO_ROOT_ONLY_LOCOMOTION',
        'WALK_JOG_RUN_SPRINT_SPEED_FAMILY',
        'LATERAL_STRAFE_AND_BACKWARD_LOCOMOTION',
        'PELVIS_SPINE_CHEST_DELAYED_CHAIN',
        'FOOT_PLANT_AND_KNEE_COMPRESSION',
        'HEEL_TOE_PITCH_AND_COUNTER_SWING',
        'START_STOP_WEIGHT_TRANSFER',
        'TURN_45_90_180_WITH_PLANTED_PIVOT',
        'JUMP_COMPRESSION_AIR_POSE_AND_LANDING_SETTLE',
        'CROUCH_BREATHING_AND_WEIGHT_SHIFT',
        'ASYMMETRIC_IDLE_GAZE_BLINK_AND_HAND_DETAIL',
        'HAIR_HEM_TIE_SECONDARY_FOLLOW_THROUGH',
        'BEZIER_INTERPOLATION',
        'MEASURED_STATIC_MOTION_QA'
    ],
    'staticMotionQa': qa_metrics,
    'platformConversionQa': platform_conversion_qa,
    'mobileBudget': mobile_budget,
    'platformTargets': ['UNITY', 'ROBLOX', 'WEB_GLTF_CONSUMER'],
    'platformNativeAdapters': {'ROBLOX':'PENDING_SEPARATE_NATIVE_RETARGET','UNITY':'PENDING_SEPARATE_NATIVE_RETARGET','WEB':'PENDING_INTEGRATION'},
    'directCrossPlatformBinaryReuseForbidden': True,
    'sourceOriginalPreserved': True,
    'gameplayAuthorityChanged': False,
    'nativeStudioVerified': False,
    'oneObjectOneClipWorkUnit': {'objectCount':1,'motionCount':1,'activeModificationBudgetMinutes':60,'verifiedActualMinutes':None,'focusClip':ARGS.focus},
    'actionSourceFamilyDefined': list(ACTION_CLIPS),
    'assetPreparationScope':'PLATFORM_NEUTRAL_GLB_MASTER_SOURCE_ONLY',
    'gameRuntimeBound':False,
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
    SCENE.render.resolution_x=512;SCENE.render.resolution_y=512;SCENE.render.resolution_percentage=100
    SCENE.render.image_settings.file_format='PNG'
    # Only the selected object/clip is reviewed in this one-hour work unit.
    preview_times={ARGS.focus:0.5}
    reset_pose();bpy.context.view_layer.update()
    baseline=ARGS.render_dir/'source-bind-reference.png'
    SCENE.render.filepath=str(baseline);bpy.ops.render.render(write_still=True)
    preview_files=[]
    for clip_name,t in preview_times.items():
        animate(clip_name,t);bpy.context.view_layer.update()
        output=ARGS.render_dir/(clip_name+'.png')
        SCENE.render.filepath=str(output);bpy.ops.render.render(write_still=True)
        preview_files.append(str(output.name))
    evidence['previewFiles']=preview_files
    evidence['baselinePreviewFile']='source-bind-reference.png'
    evidence['previewComparisonAxes']=['READABILITY','MOTION_CONTINUITY','WEIGHT_TRANSFER','CONTACT','SECONDARY_MOTION']
    evidence['previewIsRuntimeProof']=False
    (ARGS.output / 'evidence.json').write_text(
        json.dumps(evidence, ensure_ascii=False, indent=2) + '\n',
        encoding='utf-8'
    )

print(json.dumps(evidence, ensure_ascii=False), flush=True)
