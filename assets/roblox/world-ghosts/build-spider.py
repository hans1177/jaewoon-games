# build-spider.py — high-detail original spider creature asset for Unity/Roblox source use.
# Blender 3.4+ compatible. No downloaded model, texture, or generated-image dependency.
import argparse
import hashlib
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

# =============================================================================
# 설정
# =============================================================================
ROOT = Path(__file__).resolve().parent
PARSER = argparse.ArgumentParser()
PARSER.add_argument('--output', type=Path, default=ROOT / 'native' / 'spider')
PARSER.add_argument('--render', action='store_true')
PARSER.add_argument('--fbx', action='store_true')
_argv = sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else None
ARGS = PARSER.parse_args(_argv)
ARGS.output.mkdir(parents=True, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
SCENE = bpy.context.scene
SCENE.render.fps = 30
SCENE.unit_settings.system = 'METRIC'
SCENE.unit_settings.scale_length = 1.0

ASSET_ID = 'insect-spider-hd'
RIG_VERSION = 'SPIDER_HD_RIG_1'
PARTS = []
BONES = {}
LEG_CHAINS = []

# =============================================================================
# 재질
# =============================================================================
def make_material(name, color, roughness=.45, metallic=.0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1.0)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1.0)
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = metallic
    return mat

CHITIN = make_material('Chitin_black_brown', (0.055, 0.038, 0.032), .31, .08)
CHITIN_EDGE = make_material('Chitin_edge', (0.135, 0.075, 0.050), .39, .04)
JOINT = make_material('Joint_membrane', (0.025, 0.018, 0.020), .58, .0)
EYE = make_material('Spider_eye', (0.018, 0.025, 0.035), .10, .16)
EYE_GLOW = make_material('Spider_eye_glint', (0.45, 0.62, 0.72), .08, .12)
FANG = make_material('Fang_ivory', (0.36, 0.27, 0.20), .34, .03)
HAIR = make_material('Setae_dark', (0.018, 0.013, 0.012), .69, .0)
WEB = make_material('Spinneret_silk', (0.58, 0.60, 0.57), .48, .0)
MARK = make_material('Abdomen_mark', (0.20, 0.12, 0.075), .42, .02)

# =============================================================================
# 기본 메시 유틸
# =============================================================================
def active(obj):
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    return obj

def apply_transform(obj):
    bpy.ops.object.select_all(action='DESELECT')
    active(obj)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return obj

def smooth(obj):
    for p in obj.data.polygons:
        p.use_smooth = True
    return obj

def bind_rigid(obj, bone_name):
    vg = obj.vertex_groups.new(name=bone_name)
    vg.add(list(range(len(obj.data.vertices))), 1.0, 'REPLACE')
    mod = obj.modifiers.new('Armature', 'ARMATURE')
    mod.object = RIG
    PARTS.append(obj)
    return obj

def uv_sphere(name, loc, scale, mat, bone, seg=28, rings=18):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=rings, location=loc)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    apply_transform(obj)
    obj.data.materials.append(mat)
    smooth(obj)
    return bind_rigid(obj, bone)

def ico(name, loc, scale, mat, bone, subdivisions=2):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdivisions, radius=1.0, location=loc)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    apply_transform(obj)
    obj.data.materials.append(mat)
    smooth(obj)
    return bind_rigid(obj, bone)

def cylinder_between(name, a, b, radius, mat, bone, vertices=14, taper=.82):
    a, b = Vector(a), Vector(b)
    mid = (a+b)*.5
    d = b-a
    depth = d.length
    bpy.ops.mesh.primitive_cone_add(vertices=vertices, radius1=radius, radius2=radius*taper, depth=depth, location=mid)
    obj = bpy.context.object
    obj.name = name
    obj.rotation_euler = d.to_track_quat('Z','Y').to_euler()
    apply_transform(obj)
    obj.data.materials.append(mat)
    smooth(obj)
    return bind_rigid(obj, bone)

def cone_between(name, a, b, r0, r1, mat, bone, vertices=12):
    a, b = Vector(a), Vector(b)
    mid=(a+b)*.5
    d=b-a
    bpy.ops.mesh.primitive_cone_add(vertices=vertices, radius1=r0, radius2=r1, depth=d.length, location=mid)
    obj=bpy.context.object
    obj.name=name
    obj.rotation_euler=d.to_track_quat('Z','Y').to_euler()
    apply_transform(obj)
    obj.data.materials.append(mat)
    smooth(obj)
    return bind_rigid(obj,bone)

def torus(name, loc, major, minor, rot, mat, bone):
    bpy.ops.mesh.primitive_torus_add(major_segments=24, minor_segments=8, location=loc, major_radius=major, minor_radius=minor)
    obj=bpy.context.object
    obj.name=name
    obj.rotation_euler=rot
    apply_transform(obj)
    obj.data.materials.append(mat)
    smooth(obj)
    return bind_rigid(obj,bone)

def add_bone(name, head, tail, parent=None):
    BONES[name]=(Vector(head),Vector(tail),parent)

# =============================================================================
# 리그 정의
# =============================================================================
add_bone('Root',(0,0,.34),(0,0,.58))
add_bone('Thorax',(0,-.05,.76),(0,-.38,.80),'Root')
add_bone('Head',(0,-.42,.82),(0,-.79,.84),'Thorax')
add_bone('Abdomen',(0,.32,.90),(0,1.06,.98),'Thorax')
add_bone('Spinner',(0,1.12,.82),(0,1.39,.72),'Abdomen')

# 다리 8개 × 4관절
pair_y=[-.39,-.14,.13,.37]
pair_angle=[-1.02,-.42,.42,1.02]
for side,sx in [('L',-1),('R',1)]:
    for pair in range(4):
        y=pair_y[pair]
        ang=pair_angle[pair]
        # x축에서 앞/뒤로 펼쳐지는 거미 다리
        p0=Vector((sx*.28,y,.79))
        p1=Vector((sx*.72,y+math.sin(ang)*.22,1.02))
        p2=Vector((sx*1.37,y+math.sin(ang)*.72,1.09))
        p3=Vector((sx*1.98,y+math.sin(ang)*1.02,.59))
        p4=Vector((sx*2.45,y+math.sin(ang)*1.18,.14))
        names=[f'Leg{side}{pair+1}_{k}' for k in range(4)]
        pts=[p0,p1,p2,p3,p4]
        parent='Thorax'
        for k,n in enumerate(names):
            add_bone(n,pts[k],pts[k+1],parent)
            parent=n
        LEG_CHAINS.append((side,pair,names,pts))

# 촉지와 송곳니
for side,sx in [('L',-1),('R',1)]:
    add_bone(f'Palp{side}1',(sx*.16,-.62,.76),(sx*.31,-.85,.69),'Head')
    add_bone(f'Palp{side}2',(sx*.31,-.85,.69),(sx*.38,-1.03,.55),f'Palp{side}1')
    add_bone(f'Palp{side}3',(sx*.38,-1.03,.55),(sx*.29,-1.15,.40),f'Palp{side}2')
    add_bone(f'Fang{side}',(sx*.12,-.73,.71),(sx*.11,-1.00,.43),'Head')

# =============================================================================
# 암아처 생성
# =============================================================================
arm_data=bpy.data.armatures.new('SpiderSkeleton')
RIG=bpy.data.objects.new(ASSET_ID,arm_data)
SCENE.collection.objects.link(RIG)
bpy.context.view_layer.objects.active=RIG
RIG.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')
for name,(head,tail,parent) in BONES.items():
    eb=arm_data.edit_bones.new(name)
    eb.head=head
    eb.tail=tail
    if parent:
        eb.parent=arm_data.edit_bones[parent]
        eb.use_connect=False
bpy.ops.object.mode_set(mode='OBJECT')

# =============================================================================
# 고디테일 몸통
# =============================================================================
# 복부 / 흉부 / 머리 외골격
uv_sphere('Abdomen_main',(0,.69,.86),(.72,.91,.64),CHITIN,'Abdomen',36,24)
uv_sphere('Abdomen_upper_plate',(0,.55,1.15),(.57,.72,.18),CHITIN_EDGE,'Abdomen',32,16)
uv_sphere('Thorax_main',(0,-.12,.82),(.55,.58,.42),CHITIN,'Thorax',32,20)
uv_sphere('Carapace_plate',(0,-.28,1.04),(.49,.48,.14),CHITIN_EDGE,'Thorax',32,14)
uv_sphere('Head_shell',(0,-.55,.82),(.38,.38,.31),CHITIN,'Head',30,18)

# 복부 등판 무늬 / 갑각 링
for i,z in enumerate([.82,.97,1.10]):
    scale=max(.22,.46-i*.07)
    uv_sphere(f'Abdomen_mark_{i}',(0,.80+i*.04,z),(scale,.62,.045),MARK,'Abdomen',24,10)
for i,y in enumerate([.04,-.12,-.28]):
    torus(f'Thorax_ridge_{i}',(0,y,.91+i*.04),.42-i*.045,.018,(math.radians(90),0,0),CHITIN_EDGE,'Thorax')

# 눈 8개: 앞 중앙 4 + 측면 4
EYES=[
    (-.10,-.835,.91,.074),(.10,-.835,.91,.074),
    (-.22,-.79,.96,.057),(.22,-.79,.96,.057),
    (-.30,-.70,.93,.052),(.30,-.70,.93,.052),
    (-.31,-.63,.84,.045),(.31,-.63,.84,.045),
]
for i,(x,y,z,r) in enumerate(EYES):
    uv_sphere(f'Eye_{i}',(x,y,z),(r,r*.72,r),EYE,'Head',20,12)
    uv_sphere(f'Eye_glint_{i}',(x,y-.052,z+.018),(r*.23,r*.10,r*.23),EYE_GLOW,'Head',12,8)

# 송곳니 / 촉지
for side,sx in [('L',-1),('R',1)]:
    cylinder_between(f'Chelicera_{side}',(sx*.14,-.68,.74),(sx*.13,-.88,.62),.105,CHITIN_EDGE,f'Fang{side}',18,.72)
    cone_between(f'Fang_tip_{side}',(sx*.13,-.88,.61),(sx*.10,-1.08,.37),.075,.006,FANG,f'Fang{side}',18)
    palp_pts=[(sx*.16,-.62,.76),(sx*.31,-.85,.69),(sx*.38,-1.03,.55),(sx*.29,-1.15,.40)]
    radii=[.085,.070,.055]
    for k in range(3):
        cylinder_between(f'Palp_{side}_{k+1}',palp_pts[k],palp_pts[k+1],radii[k],CHITIN,f'Palp{side}{k+1}',14,.76)
        ico(f'Palp_joint_{side}_{k+1}',palp_pts[k+1],(radii[k]*1.12,)*3,JOINT,f'Palp{side}{k+1}',2)

# 배 끝 방적돌기 3개
for i,x in enumerate([-.13,0,.13]):
    cone_between(f'Spinneret_{i}',(x,1.20,.80),(x*.78,1.45,.63),.065,.028,WEB,'Spinner',12)

# =============================================================================
# 다리 메시 / 관절 / 가시
# =============================================================================
for side,pair,names,pts in LEG_CHAINS:
    side_sign=-1 if side=='L' else 1
    radii=[.115,.105,.085,.060]
    for k,n in enumerate(names):
        cylinder_between(f'{n}_segment',pts[k],pts[k+1],radii[k],CHITIN,n,16,.72)
        ico(f'{n}_joint',pts[k],(radii[k]*1.25,)*3,JOINT,n,2)
        # 각 마디 외골격 등판
        mid=(pts[k]+pts[k+1])*.5
        uv_sphere(f'{n}_armor',tuple(mid+Vector((0,0,.025))),(radii[k]*1.18,radii[k]*.82,radii[k]*.48),CHITIN_EDGE,n,16,9)
        # 양쪽 가시. 마지막 마디는 잔가시를 추가.
        d=(pts[k+1]-pts[k]).normalized()
        perp=Vector((-d.y,d.x,0))
        if perp.length<.01: perp=Vector((1,0,0))
        perp.normalize()
        for j,t in enumerate((.32,.58,.78)):
            base=pts[k].lerp(pts[k+1],t)
            outward=perp*(.09+.02*j)*side_sign
            cone_between(f'{n}_spike_{j}',base+outward*.1,base+outward+Vector((0,0,.045)),.020,.002,CHITIN_EDGE,n,8)
    # 발끝 발톱 2개
    foot=pts[-1]
    prev=pts[-2]
    d=(foot-prev).normalized()
    for c in (-1,1):
        tip=foot+Vector((c*.055,-.06,.0))+d*.11+Vector((0,0,-.035))
        cone_between(f'Claw_{side}_{pair}_{c}',foot,tip,.022,.001,FANG,names[-1],8)

# =============================================================================
# 세타(setae) 털 / 감각모 디테일
# =============================================================================
def add_hair(name, base, direction, length, bone, radius=.006):
    base=Vector(base); direction=Vector(direction).normalized()
    tip=base+direction*length
    cone_between(name,base,tip,radius,.001,HAIR,bone,6)

# 몸통 털
for ring in range(7):
    z=.62+ring*.105
    for i in range(18):
        a=math.tau*i/18 + ring*.13
        base=Vector((math.cos(a)*.57,.72+math.sin(a)*.73,z+.05*math.sin(a*2)))
        direction=Vector((math.cos(a),math.sin(a),.35))
        add_hair(f'Abd_hair_{ring}_{i}',base,direction,.11+(i%3)*.015,'Abdomen',.006)
# 다리 털: 마디당 4개씩
for side,pair,names,pts in LEG_CHAINS:
    for k,n in enumerate(names):
        for j,t in enumerate((.22,.42,.62,.82)):
            base=pts[k].lerp(pts[k+1],t)
            d=(pts[k+1]-pts[k]).normalized()
            perp=Vector((-d.y,d.x,.35)).normalized()
            if (j+pair)%2: perp.x*=-1; perp.y*=-1
            add_hair(f'{n}_hair_{j}',base,perp,.075+(k*.008),n,.0045)

# =============================================================================
# 애니메이션
# =============================================================================
CLIPS={
    'idle':3.2,
    'walk':2.4,
    'run':1.5,
    'strafe':2.0,
    'climb':2.4,
    'threat':2.0,
    'bite':1.2,
    'pounce':1.4,
    'web_cast':1.8,
    'hit':.8,
    'stagger':1.1,
    'death':2.2,
}

# 포즈 초기화
def reset_pose():
    for pb in RIG.pose.bones:
        pb.rotation_mode='XYZ'
        pb.rotation_euler=(0,0,0)
        pb.location=(0,0,0)
        pb.scale=(1,1,1)

def interp(t, keys):
    if t<=keys[0][0]: return keys[0][1]
    if t>=keys[-1][0]: return keys[-1][1]
    for (a,va),(b,vb) in zip(keys,keys[1:]):
        if a<=t<=b:
            u=(t-a)/(b-a)
            return va+(vb-va)*u
    return keys[-1][1]

def gait(time,speed=1.0,amp=1.0,lift=1.0,strafe=False,climb=False):
    phase=time*math.tau*speed
    for side,pair,names,pts in LEG_CHAINS:
        side_offset=0 if side=='L' else math.pi
        leg_phase=phase + pair*math.pi/2 + side_offset
        swing=math.sin(leg_phase)*.30*amp
        step=max(0,math.sin(leg_phase))*lift
        for k,n in enumerate(names):
            pb=RIG.pose.bones[n]
            pb.rotation_euler[1]=(swing*(.82 if k<2 else .58)) * (1 if side=='L' else -1)
            pb.rotation_euler[0]=(-.10+.14*k)+step*(.18 if k<2 else -.25)
            if strafe: pb.rotation_euler[2]+=math.sin(leg_phase)*.12*(1 if side=='L' else -1)
            if climb: pb.rotation_euler[0]+=.22*math.sin(leg_phase+.7*k)
    RIG.pose.bones['Thorax'].location.z=.025*math.sin(phase*2)*amp
    RIG.pose.bones['Abdomen'].rotation_euler[0]=.025*math.sin(phase*2+.5)

def animate(state,time):
    reset_pose()
    phase=time*math.tau/CLIPS[state]
    if state=='idle':
        RIG.pose.bones['Thorax'].location.z=.018*math.sin(phase*2)
        RIG.pose.bones['Abdomen'].rotation_euler[0]=.035*math.sin(phase)
        RIG.pose.bones['Head'].rotation_euler[2]=.025*math.sin(phase*.7)
        for side,pair,names,pts in LEG_CHAINS:
            for k,n in enumerate(names):
                RIG.pose.bones[n].rotation_euler[0]=.015*math.sin(phase+pair*.8+k*.3)
    elif state=='walk':
        gait(time,1.0,1.0,1.0)
    elif state=='run':
        gait(time,1.65,1.35,1.45)
        RIG.pose.bones['Thorax'].rotation_euler[0]=-.08
        RIG.pose.bones['Abdomen'].rotation_euler[0]=.09
    elif state=='strafe':
        gait(time,1.2,.85,.8,strafe=True)
        RIG.pose.bones['Thorax'].location.x=.05*math.sin(phase*2)
    elif state=='climb':
        gait(time,1.0,.85,1.25,climb=True)
        RIG.pose.bones['Thorax'].rotation_euler[0]=.16*math.sin(phase)
        RIG.pose.bones['Abdomen'].rotation_euler[0]=-.12*math.sin(phase)
    elif state=='threat':
        raisev=interp(time,[(0,0),(.35,1),(1.35,1),(2.0,0)])
        RIG.pose.bones['Thorax'].rotation_euler[0]=-.18*raisev
        RIG.pose.bones['Head'].rotation_euler[0]=-.14*raisev
        for side,pair,names,pts in LEG_CHAINS:
            if pair<2:
                for k,n in enumerate(names):
                    RIG.pose.bones[n].rotation_euler[0]=(-.55+.18*k)*raisev
                    RIG.pose.bones[n].rotation_euler[1]=(.18 if side=='L' else -.18)*raisev
        for side in ('L','R'):
            RIG.pose.bones[f'Fang{side}'].rotation_euler[1]=(.22 if side=='L' else -.22)*raisev
    elif state=='bite':
        snap=interp(time,[(0,0),(.25,.25),(.50,1),(.70,.15),(1.2,0)])
        RIG.pose.bones['Head'].rotation_euler[0]=-.32*snap
        RIG.pose.bones['Thorax'].rotation_euler[0]=-.12*snap
        for side in ('L','R'):
            RIG.pose.bones[f'Fang{side}'].rotation_euler[1]=(.68 if side=='L' else -.68)*snap
            RIG.pose.bones[f'Palp{side}1'].rotation_euler[0]=-.28*snap
    elif state=='pounce':
        crouch=interp(time,[(0,0),(.32,1),(.55,.1),(.84,.25),(1.4,0)])
        leap=interp(time,[(0,0),(.30,0),(.57,1),(.92,.2),(1.4,0)])
        RIG.pose.bones['Thorax'].location.y=-.52*leap
        RIG.pose.bones['Thorax'].location.z=-.16*crouch+.28*leap
        RIG.pose.bones['Abdomen'].rotation_euler[0]=.20*crouch-.12*leap
        for side,pair,names,pts in LEG_CHAINS:
            for k,n in enumerate(names):
                RIG.pose.bones[n].rotation_euler[0]=(.38 if k<2 else -.42)*crouch - .20*leap
    elif state=='web_cast':
        cast=interp(time,[(0,0),(.45,1),(1.0,.7),(1.45,1),(1.8,0)])
        RIG.pose.bones['Abdomen'].rotation_euler[0]=-.38*cast
        RIG.pose.bones['Spinner'].rotation_euler[0]=.52*cast
        for side,pair,names,pts in LEG_CHAINS:
            if pair>=2:
                RIG.pose.bones[names[0]].rotation_euler[0]=.18*cast
    elif state=='hit':
        recoil=interp(time,[(0,0),(.10,1),(.28,.45),(.8,0)])
        RIG.pose.bones['Thorax'].rotation_euler[2]=.25*recoil
        RIG.pose.bones['Head'].rotation_euler[1]=-.20*recoil
        RIG.pose.bones['Abdomen'].rotation_euler[2]=-.15*recoil
    elif state=='stagger':
        r=interp(time,[(0,0),(.15,1),(.45,-.55),(.72,.30),(1.1,0)])
        RIG.pose.bones['Thorax'].rotation_euler[2]=.38*r
        RIG.pose.bones['Abdomen'].rotation_euler[2]=-.24*r
        RIG.pose.bones['Thorax'].location.z=-.06*abs(r)
    elif state=='death':
        fall=interp(time,[(0,0),(.38,.15),(.92,.72),(1.65,1),(2.2,1)])
        RIG.pose.bones['Thorax'].location.z=-.48*fall
        RIG.pose.bones['Thorax'].rotation_euler[2]=.92*fall
        RIG.pose.bones['Abdomen'].rotation_euler[1]=-.35*fall
        for side,pair,names,pts in LEG_CHAINS:
            curl=(.65+.10*pair)*fall
            for k,n in enumerate(names):
                RIG.pose.bones[n].rotation_euler[0]=(curl*(1 if k%2==0 else -1))
                RIG.pose.bones[n].rotation_euler[1]=(.28 if side=='L' else -.28)*fall

# 액션 생성
for clip,duration in CLIPS.items():
    action=bpy.data.actions.new(clip)
    RIG.animation_data_create()
    RIG.animation_data.action=action
    frames=round(duration*30)
    for f in range(frames+1):
        animate(clip,f/30)
        for pb in RIG.pose.bones:
            pb.keyframe_insert('rotation_euler',frame=f)
            if pb.name in ('Thorax','Abdomen','Head','Spinner'):
                pb.keyframe_insert('location',frame=f)
    action.use_fake_user=True
    for fc in action.fcurves:
        for kp in fc.keyframe_points:
            kp.interpolation='BEZIER'
RIG.animation_data.action=bpy.data.actions['idle']
SCENE.frame_set(1)

# =============================================================================
# 내보내기
# =============================================================================
bpy.ops.object.select_all(action='DESELECT')
RIG.select_set(True)
for o in PARTS:
    o.select_set(True)
bpy.context.view_layer.objects.active=RIG

glb=ARGS.output/'spider.glb'
bpy.ops.export_scene.gltf(
    filepath=str(glb),
    export_format='GLB',
    use_selection=True,
    export_animations=True,
    export_animation_mode='ACTIONS',
    export_skins=True,
    export_yup=True,
    export_materials='EXPORT',
    export_extras=True,
)
fbx=ARGS.output/'spider.fbx'
if ARGS.fbx:
    bpy.ops.export_scene.fbx(
        filepath=str(fbx),
        use_selection=True,
        object_types={'ARMATURE','MESH'},
        add_leaf_bones=False,
        bake_anim=True,
        bake_anim_use_all_actions=True,
        bake_anim_use_nla_strips=False,
        bake_anim_simplify_factor=0,
        axis_forward='-Z',axis_up='Y'
    )

vertices=sum(len(o.data.vertices) for o in PARTS)
triangles=sum(sum(max(1,len(p.vertices)-2) for p in o.data.polygons) for o in PARTS)
report={
    'assetId':ASSET_ID,
    'rigVersion':RIG_VERSION,
    'kind':'AUTHORED_SKINNED_CREATURE_MESH',
    'meshObjects':len(PARTS),
    'vertices':vertices,
    'triangles':triangles,
    'bones':len(BONES),
    'legCount':8,
    'eyeCount':8,
    'motionCount':len(CLIPS),
    'clips':CLIPS,
    'sourceSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
    'nativeStudioVerified':False,
    'unityWebVerified':False,
    'productionVerified':False,
    'artifacts':[]
}
for p in [glb]+([fbx] if ARGS.fbx else []):
    report['artifacts'].append({'file':p.name,'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
(ARGS.output/'evidence.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

# =============================================================================
# 실제 모델 렌더 미리보기
# =============================================================================
if ARGS.render:
    stage=make_material('Stage',(0.012,.016,.020),.70)
    bpy.ops.mesh.primitive_plane_add(size=30,location=(0,0,.01))
    floor=bpy.context.object
    floor.data.materials.append(stage)

    world=bpy.data.worlds.new('World')
    world.use_nodes=True
    world.node_tree.nodes['Background'].inputs[0].default_value=(.012,.016,.022,1)
    world.node_tree.nodes['Background'].inputs[1].default_value=.32
    SCENE.world=world

    def area(name,loc,power,color,size):
        data=bpy.data.lights.new(name,'AREA')
        data.energy=power; data.color=color; data.size=size
        obj=bpy.data.objects.new(name,data); SCENE.collection.objects.link(obj); obj.location=loc
        obj.rotation_euler=(Vector((0,0,.75))-obj.location).to_track_quat('-Z','Y').to_euler()
    area('Key',(-4,-5,6),850,(1.0,.72,.52),4)
    area('Fill',(4,-2,3),480,(.35,.55,1.0),3)
    area('Rim',(0,4,5),950,(.30,.45,.75),3)

    cam_data=bpy.data.cameras.new('PreviewCamera')
    cam=bpy.data.objects.new('PreviewCamera',cam_data)
    SCENE.collection.objects.link(cam)
    SCENE.camera=cam
    cam.location=(4.8,-7.8,3.6)
    cam.rotation_euler=(Vector((0,0,.75))-cam.location).to_track_quat('-Z','Y').to_euler()
    cam_data.type='ORTHO'; cam_data.ortho_scale=5.8
    SCENE.render.resolution_x=1200;SCENE.render.resolution_y=900;SCENE.render.resolution_percentage=100
    SCENE.render.image_settings.file_format='PNG'
    SCENE.render.film_transparent=False
    SCENE.render.engine='CYCLES'
    SCENE.cycles.device='CPU'
    SCENE.cycles.samples=24
    SCENE.cycles.use_denoising=True
    SCENE.view_settings.view_transform='Filmic'
    SCENE.frame_set(18)
    SCENE.render.filepath=str(ARGS.output/'spider.png')
    bpy.ops.render.render(write_still=True)
    report['artifacts'].append({'file':'spider.png','bytes':(ARGS.output/'spider.png').stat().st_size,'sha256':hashlib.sha256((ARGS.output/'spider.png').read_bytes()).hexdigest()})
    (ARGS.output/'evidence.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

print(json.dumps(report,ensure_ascii=False),flush=True)
