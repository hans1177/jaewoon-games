# 파일명: assets/native-authoring/build-game-visual.py
# 기존 GRAPHICS_PRODUCTION의 원본 보존 제작·분석·최적화 책임.
# This is an asset recipe inside the existing pipeline, not a separate graphics pipeline.
import argparse
import colorsys
import hashlib
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parent
PARSER = argparse.ArgumentParser()
PARSER.add_argument('--output', type=Path, required=True)
PARSER.add_argument('--asset-id', required=True)
PARSER.add_argument('--profile', choices=['background','environment','prop','item','weapon'], required=True)
PARSER.add_argument('--target', choices=['web','roblox','unity'], required=True)
PARSER.add_argument('--subject', choices=['generic','rock','crate'], default='generic')
PARSER.add_argument('--style-json', default='{}')
PARSER.add_argument('--genre', default='')
ARGV = sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
ARGS = PARSER.parse_args(ARGV)
ARGS.output.mkdir(parents=True, exist_ok=True)
STYLE = json.loads(ARGS.style_json)
AXES = STYLE.get('axes', {})
FAMILY = str(STYLE.get('sourceStyleFamily', 'STYLIZED_FANTASY')).upper()
SOFT = AXES.get('SHAPE_TEMPER') == 'ROUND' or any(v in FAMILY for v in ('COZY','CARTOON','CHIBI'))
LOW_POLY = 'LOW_POLY' in FAMILY or 'VOXEL' in FAMILY or 'PAPER' in FAMILY
TECH = any(v in FAMILY for v in ('SCI_FI','CYBERPUNK','MECHANICAL','SPACE_OPERA'))
MUTED = AXES.get('COLOR_ENERGY') in ('MUTED','NATURAL')
WORN = AXES.get('DAMAGE_WEAR') in ('HEAVY_WORN','LIGHT_WORN')
DETAIL = 2 if LOW_POLY else 3 if SOFT else 4

bpy.ops.wm.read_factory_settings(use_empty=True)
SCENE = bpy.context.scene
SCENE.render.resolution_x = 512
SCENE.render.resolution_y = 512
SCENE.render.resolution_percentage = 100
SCENE.render.image_settings.file_format = 'PNG'
SCENE.render.film_transparent = False
SCENE.unit_settings.system = 'METRIC'
SCENE.unit_settings.scale_length = 1.0
try:
    SCENE.render.engine = 'BLENDER_EEVEE_NEXT'
except Exception:
    try:
        SCENE.render.engine = 'BLENDER_EEVEE'
    except Exception:
        pass

seed = hashlib.sha256(f'{ARGS.asset_id}|{ARGS.profile}|{ARGS.subject}'.encode()).digest()
hue = seed[0] / 255.0
accent_hue = (hue + 0.34 + (seed[1] / 255.0) * 0.18) % 1.0

def rgb(h, s, v):
    return colorsys.hsv_to_rgb(h, s, v)

def material(name, color, roughness=.48, metallic=.0, emission=None):
    mat = bpy.data.materials.new(name)
    if MUTED:
        gray=sum(color)/3; color=tuple(gray*.5+c*.5 for c in color)
    if SOFT: color=tuple(c*.75+.12 for c in color)
    if not TECH and name != 'Game_Metal': metallic=0.0
    if SOFT or LOW_POLY: roughness=max(.65,roughness)
    mat.diffuse_color = (*color, 1.0)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1.0)
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = metallic
    if emission and TECH:
        socket = bsdf.inputs.get('Emission Color') or bsdf.inputs.get('Emission')
        strength = bsdf.inputs.get('Emission Strength')
        if socket: socket.default_value = (*emission, 1.0)
        if strength: strength.default_value = 2.4
    return mat

BASE = material('Game_Base', rgb(hue, .46, .34), .62, .05)
MID = material('Game_Mid', rgb(hue, .54, .58), .46, .08)
ACCENT = material('Game_Accent', rgb(accent_hue, .72, .88), .35, .16)
DARK = material('Game_Dark', rgb((hue+.04)%1, .38, .15), .72, .02)
METAL = material('Game_Metal', (.28,.31,.35), .28, .72)
GLOW_RGB = rgb(accent_hue, .62, 1.0)
GLOW = material('Game_Glow', tuple(v*.55 for v in GLOW_RGB), .30, .18, GLOW_RGB)

ASSET_OBJECTS = []

def finish(obj, mat, bevel=.06):
    obj.data.materials.append(mat)
    if bevel > 0:
        mod = obj.modifiers.new('AuthoredEdge','BEVEL')
        mod.width = bevel*(1.4 if SOFT else .6 if LOW_POLY else 1)
        mod.segments = 1 if LOW_POLY else 3 if SOFT else 2
    ASSET_OBJECTS.append(obj)
    return obj

def box(name, loc, scale, mat, rot=(0,0,0), bevel=.06):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    obj=bpy.context.object; obj.name=name; obj.scale=scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(obj,mat,bevel)

def cylinder(name, loc, radius, depth, mat, vertices=20, rot=(0,0,0), bevel=.035):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc, rotation=rot)
    obj=bpy.context.object; obj.name=name
    return finish(obj,mat,bevel)

def cone(name, loc, r1, r2, depth, mat, vertices=20, rot=(0,0,0), bevel=.025):
    bpy.ops.mesh.primitive_cone_add(vertices=vertices, radius1=r1, radius2=r2, depth=depth, location=loc, rotation=rot)
    obj=bpy.context.object; obj.name=name
    return finish(obj,mat,bevel)

def torus(name, loc, major, minor, mat, rot=(0,0,0)):
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor, major_segments=28, minor_segments=10, location=loc, rotation=rot)
    obj=bpy.context.object; obj.name=name
    return finish(obj,mat,0)

def environment_asset():
    box('Foundation',(0,0,.22),(2.45,1.55,.22),DARK,bevel=.12)
    box('RaisedDeck',(0,0,.55),(2.12,1.28,.16),BASE,bevel=.11)
    for sx in (-1,1):
        x=sx*1.62
        box(f'Pylon_{sx}',(x,0,1.72),(.30,.46,1.10),MID,bevel=.10)
        box(f'PylonInset_{sx}',(x,-.47,1.72),(.18,.06,.74),ACCENT,bevel=.025)
        cylinder(f'Lamp_{sx}',(x,-.58,2.35),.15,.28,GLOW,18,rot=(math.radians(90),0,0),bevel=.018)
    box('CrossBeam',(0,0,2.62),(1.88,.36,.22),MID,bevel=.11)
    box('SignPanel',(0,-.43,2.56),(1.02,.08,.34),DARK,bevel=.05)
    torus('IdentityRing',(0,-.54,2.56),.35,.055,GLOW,rot=(math.radians(90),0,0))
    for sx in (-1,1):
        box(f'CanopyWing_{sx}',(sx*.98,.18,3.02),(.92,.82,.09),ACCENT,rot=(0,sx*math.radians(10),sx*math.radians(4)),bevel=.08)
    cylinder('CenterMast',(0,.20,2.86),.10,1.00,METAL,20,bevel=.025)
    cone('TopMarker',(0,.20,3.58),.34,.04,.72,ACCENT,20,bevel=.025)
    for i in range(4):
        a=math.tau*i/4
        cylinder(f'Bollard_{i}',(math.cos(a)*1.98,math.sin(a)*1.02,.72),.12,.66,METAL,16,bevel=.025)
        torus(f'BollardGlow_{i}',(math.cos(a)*1.98,math.sin(a)*1.02,.96),.13,.025,GLOW)

def prop_asset():
    box('Foot',(0,0,.16),(1.08,.88,.16),DARK,bevel=.12)
    box('Housing',(0,0,.86),(.82,.66,.62),BASE,bevel=.16)
    box('FrontInset',(0,-.68,.92),(.58,.06,.36),MID,bevel=.06)
    box('ControlFace',(0,-.77,1.05),(.34,.035,.20),DARK,bevel=.025)
    for sx in (-1,1):
        cylinder(f'SidePost_{sx}',(sx*.73,0,.96),.10,1.28,METAL,16,bevel=.02)
        torus(f'SideRing_{sx}',(sx*.73,0,1.45),.17,.04,ACCENT,rot=(math.radians(90),0,0))
    cylinder('Core',(0,0,1.60),.34,.54,ACCENT,24,bevel=.04)
    torus('CoreHalo',(0,-.38,1.60),.36,.055,GLOW,rot=(math.radians(90),0,0))
    cone('TopCap',(0,0,2.02),.48,.22,.42,MID,24,bevel=.04)
    for i in range(3):
        box(f'FunctionalTrim_{i}',((-0.46+i*.46),-.75,.58),(.15,.04,.07),GLOW,bevel=.015)

def weapon_asset():
    cylinder('Grip',(0,0,.25),.13,1.18,DARK,18,bevel=.025)
    torus('Pommel',(0,0,-.34),.18,.055,ACCENT)
    box('Guard',(0,0,.83),(.72,.13,.10),METAL,bevel=.06)
    box('BladeCore',(0,0,1.86),(.18,.07,.98),MID,rot=(0,0,math.radians(2)),bevel=.07)
    box('BladeEdge',(0,-.08,1.92),(.08,.018,.88),ACCENT,bevel=.018)
    cone('BladeTip',(0,0,3.02),.22,.025,.62,ACCENT,18,bevel=.025)
    for z in (1.18,1.72,2.26):
        torus(f'EnergyBand_{z}',(0,0,z),.21,.025,GLOW)
    box('IdentityPlate',(0,-.16,.54),(.24,.04,.16),GLOW,bevel=.025)

def rock_asset():
    # Primary silhouette before secondary fracture planes. No random per-vertex noise.
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=DETAIL, radius=1)
    obj=bpy.context.object; obj.name='Rock_PrimaryMass'
    phase=seed[2]/255*math.tau
    for vertex in obj.data.vertices:
        x,y,z=vertex.co
        broad=1+.13*math.sin(x*2.1+y*1.8+phase)+.08*math.cos(y*3.2-z*1.7)
        strata=.025*math.sin(z*12+phase) if WORN and not SOFT else 0
        vertex.co=Vector((x*broad*1.25,y*(broad+strata)*.9,max(z*(.65 if SOFT else .85),-.55)))
    stone=material('Stone_Substrate',(.32,.29,.25) if not SOFT else (.46,.43,.38),.88,0)
    sediment=material('Stone_ExposedStrata',(.43,.39,.32),.92,0)
    finish(obj,stone,0);obj.data.materials.append(sediment)
    for face in obj.data.polygons:
        center=sum((obj.data.vertices[i].co for i in face.vertices),Vector())/len(face.vertices)
        face.material_index=1 if WORN and -.16<center.z<-.04 else 0
        face.use_smooth=SOFT
    # Detail exists in a supported glTF texture, not an unexportable procedural shader.
    size=128 if LOW_POLY else 256
    image=bpy.data.images.new('Stone_Color',width=size,height=size)
    pixels=[]
    for y in range(size):
        for x in range(size):
            u=x/size;v=y/size
            band=math.sin(v*math.tau*5+.45*math.sin(u*math.tau*2))
            fine=math.sin(u*math.tau*37)*math.sin(v*math.tau*29)
            detail=(.012 if SOFT or LOW_POLY else .035)*band+(0 if LOW_POLY else .008)*fine
            base=stone.diffuse_color
            pixels.extend([max(0,min(1,base[c]+detail)) for c in range(3)]+[1])
    image.pixels.foreach_set(pixels);image.pack()
    node=stone.node_tree.nodes.new('ShaderNodeTexImage');node.image=image
    stone.node_tree.links.new(node.outputs['Color'],stone.node_tree.nodes['Principled BSDF'].inputs['Base Color'])

def crate_asset():
    wood=material('Wood_GrainDirection',(.31,.19,.09),.86,0)
    edge=material('Wood_EndGrain',(.19,.115,.05),.91,0)
    for i in range(5):
        z=.12+i*.22
        for side in (-1,1):
            box(f'LongPlank_{i}_{side}',(0,side*.5,z),(1.1,.09,.19),wood,bevel=.015)
            box(f'EndPlank_{i}_{side}',(side*.54,0,z),(.09,.95,.19),edge,bevel=.015)
    for side in (-1,1):
        box(f'ContactRunner_{side}',(side*.37,0,-.04),(.16,1.04,.16),edge,bevel=.025)
        for face in (-1,1):
            box(f'Brace_{side}_{face}',(side*.38,face*.56,.55),(.10,.06,1.15),METAL if TECH else edge,bevel=.01)
    for i in range(5):box(f'Lid_{i}',(-.44+i*.22,0,1.14),(.19,1.08,.08),wood,bevel=.012)

if ARGS.subject=='rock':
    rock_asset()
elif ARGS.subject=='crate' or ARGS.profile=='prop' and not TECH:
    crate_asset()
elif ARGS.profile in ('background','environment'):
    environment_asset()
elif ARGS.profile in ('item','weapon'):
    weapon_asset()
else:
    prop_asset()

# Apply authored geometry before measuring it. Smart UVs include bevel faces.
for obj in ASSET_OBJECTS:
    bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
    for modifier in list(obj.modifiers):bpy.ops.object.modifier_apply(modifier=modifier.name)
    bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(66),island_margin=.025)
    bpy.ops.object.mode_set(mode='OBJECT')
bpy.context.view_layer.update()
# Match the GLB inspector: rotated bounding-box corners are not mesh contact.
points=[obj.matrix_world@vertex.co for obj in ASSET_OBJECTS for vertex in obj.data.vertices]
lo=Vector(tuple(min(p[i] for p in points) for i in range(3)))
hi=Vector(tuple(max(p[i] for p in points) for i in range(3)))
shift=Vector((-(lo.x+hi.x)/2,-(lo.y+hi.y)/2,-lo.z))
for obj in ASSET_OBJECTS:obj.location+=shift
bpy.context.view_layer.update()
BOUNDS_SIZE=list(hi-lo)

# Deterministic metadata on actual exported objects.
for obj in ASSET_OBJECTS:
    obj['vibeAssetId']=ARGS.asset_id
    obj['vibeProfile']=ARGS.profile
    obj['vibeStyleFamily']=FAMILY
    obj['vibeGenre']=ARGS.genre
    obj['vibeUnit']='meter'
    obj['vibePivot']='ground-centered'
    obj['vibeProjectOriginal']=True

# Export only authored asset objects.
bpy.ops.object.select_all(action='DESELECT')
for obj in ASSET_OBJECTS:
    obj.select_set(True)
if ASSET_OBJECTS:
    bpy.context.view_layer.objects.active=ASSET_OBJECTS[0]

# 원본 GLB를 먼저 보존한 뒤 동일한 메시 데이터만 공유한다.
# 스케일·피벗·재질·UV·스무딩·노드 이름은 바꾸지 않는다.
master=ARGS.output/'master.glb'
bpy.ops.export_scene.gltf(filepath=str(master),export_format='GLB',use_selection=True,
    export_materials='EXPORT',export_extras=True,export_yup=True)
original_meshes=[obj.data for obj in ASSET_OBJECTS]
mesh_cache={}
for obj in ASSET_OBJECTS:
    mesh=obj.data
    signature=json.dumps({
        'vertices':[list(v.co) for v in mesh.vertices],
        'edges':[(list(e.vertices),e.use_edge_sharp) for e in mesh.edges],
        'polygons':[(list(f.vertices),f.material_index,f.use_smooth) for f in mesh.polygons],
        'uv':[[list(v.uv) for v in layer.data] for layer in mesh.uv_layers],
        'materials':[m.name if m else None for m in mesh.materials]
    },sort_keys=True,separators=(',',':'))
    key=hashlib.sha256(signature.encode()).hexdigest()
    if key in mesh_cache: obj.data=mesh_cache[key]
    else: mesh_cache[key]=mesh
optimized_meshes=[obj.data for obj in ASSET_OBJECTS]
reused_meshes=len(original_meshes)-len(mesh_cache)
glb=ARGS.output/'asset.glb'
bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',use_selection=True,
    export_materials='EXPORT',export_extras=True,export_yup=True)
# 압축이 이익이 없으면 원본 바이트를 유지한다. 품질을 낮춰 크기를 맞추지 않는다.
if glb.stat().st_size>master.stat().st_size:
    glb.write_bytes(master.read_bytes())
    for obj,mesh in zip(ASSET_OBJECTS,original_meshes): obj.data=mesh
    optimized_meshes=original_meshes[:]
    reused_meshes=0

# 통계물리 입력: 균일 표면 껍질의 면적 분포·관성. 정점 개수 가중치 금지.
# 실제 재료 밀도/마찰/복원계수 및 동적 안정성은 별도 관찰·실행 검증 대상이다.
def surface_distribution():
    area=0.;first=[0.,0.,0.];second=[0.]*9;orientation=[0.]*3;count=0;degenerate=0
    origin=[-BOUNDS_SIZE[0]/2,0.,-BOUNDS_SIZE[1]/2]
    for obj in ASSET_OBJECTS:
        obj.data.calc_loop_triangles()
        for triangle in obj.data.loop_triangles:
            points=[obj.matrix_world@obj.data.vertices[i].co for i in triangle.vertices]
            points=[[p.x,p.z,-p.y] for p in points]
            p=[[v[i]-origin[i] for i in range(3)] for v in points]
            a=[p[1][i]-p[0][i] for i in range(3)];b=[p[2][i]-p[0][i] for i in range(3)]
            cross=[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]
            length=math.sqrt(sum(x*x for x in cross));weight=length/2
            if not weight>0: degenerate+=1;continue
            area+=weight;count+=1;total=[sum(v[i] for v in p) for i in range(3)]
            for i in range(3):
                first[i]+=weight*total[i]/3;orientation[i]+=weight*(cross[i]/length)**2
                for j in range(3): second[i*3+j]+=weight*(total[i]*total[j]+sum(v[i]*v[j] for v in p))/12
    center=[v/area for v in first]
    covariance=[v/area-center[i//3]*center[i%3] for i,v in enumerate(second)]
    trace=covariance[0]+covariance[4]+covariance[8]
    return {'version':1,'status':'MEASURED_GEOMETRY','method':'EXACT_TRIANGLE_AREA_MOMENTS',
        'coordinateSystem':'GLTF_RIGHT_HANDED_Y_UP_METERS','massModel':'UNIFORM_SURFACE_SHELL_ONLY',
        'surfaceAreaM2':area,'centroidMeters':[v+origin[i] for i,v in enumerate(center)],
        'covarianceM2':covariance,'inertiaPerUnitMassM2':[(trace if i//3==i%3 else 0)-v for i,v in enumerate(covariance)],
        'normalAxisSecondMoment':[v/area for v in orientation],'triangleCount':count,'degenerateCount':degenerate,
        'physicalDensityKgM3':None,'friction':None,'restitution':None,'dynamicStabilityVerified':False}
physical_analysis=surface_distribution()


# 플랫폼 재질은 내보낸 GLB 값과 동기화한다. 텍스처 입력에 가려진
# Blender 소켓 기본색을 다시 곱하면 원본보다 어두워진다.
glb_bytes=glb.read_bytes()
glb_document=json.loads(glb_bytes[20:20+int.from_bytes(glb_bytes[12:16],'little')])
materials=[]
for index,mat in enumerate(glb_document.get('materials',[])):
    pbr=mat.get('pbrMetallicRoughness',{})
    rough=pbr.get('roughnessFactor',1);metal=pbr.get('metallicFactor',1)
    materials.append({'sourceMaterialIndex':index,'name':mat.get('name',f'material-{index}'),'baseColorFactor':pbr.get('baseColorFactor',[1,1,1,1]),
        'roughnessFactor':rough,'metallicFactor':metal,
        'web':{'metalness':metal,'roughness':rough,'colorSpace':'SRGB_BASE_COLOR_LINEAR_DATA'},
        'unity':{'metallic':metal,'smoothness':1-rough,'texturePacking':'METALLIC_R_SMOOTHNESS_A'},
        'roblox':{'metalness':metal,'roughness':rough,'texturePacking':'SEPARATE_GRAYSCALE_METALNESS_AND_ROUGHNESS','requires':'MeshPart_SurfaceAppearance_supported_import'}})
application={'version':1,'masterSha256':hashlib.sha256(glb.read_bytes()).hexdigest(),
    'sourceUnits':'METERS','sourceUp':'Y','boundsSizeMeters':[BOUNDS_SIZE[0],BOUNDS_SIZE[2],BOUNDS_SIZE[1]],
    'pivot':'GROUND_CENTER','surfaceDistribution':physical_analysis,'style':STYLE,'genre':ARGS.genre,'subject':ARGS.subject,'materials':materials,
    'optimization':{'method':'EXACT_MESH_DATA_REUSE','originalFile':'master.glb','originalSha256':hashlib.sha256(master.read_bytes()).hexdigest(),'originalBytes':master.stat().st_size,'deploymentBytes':glb.stat().st_size,'reusedMeshCount':reused_meshes,'runtimeMemoryBytes':None,'loadingTimeMs':None,'drawCalls':None,'runtimeVerified':False},
    'target':ARGS.target,'nativeRuntimeVerified':False,'automaticPromotionAllowed':False,
    'importRequirements':['EXPLICIT_PROJECT_UNITS_PER_METER','PRESERVE_PIVOT_AND_HANDEDNESS_ONCE','MATERIAL_SLOT_NAME_MATCH','NATIVE_LIGHTING_AND_GAME_CAMERA_REVIEW','INDEPENDENT_COLLISION_AND_SPAWN_CONTACT']}
(ARGS.output/'application.json').write_text(json.dumps(application,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

# Preview stage is not part of the exported model.
bpy.ops.object.select_all(action='DESELECT')
bpy.ops.mesh.primitive_plane_add(size=18, location=(0,0,0))
floor=bpy.context.object
floor.name='PreviewFloor'
floor.data.materials.append(material('PreviewFloorMat',(.025,.03,.04),.82,.0))

world=bpy.data.worlds.new('PreviewWorld')
world.use_nodes=True
world.node_tree.nodes['Background'].inputs[0].default_value=(.018,.022,.03,1)
world.node_tree.nodes['Background'].inputs[1].default_value=.35
SCENE.world=world

def area(name, loc, energy, size, color):
    data=bpy.data.lights.new(name,'AREA'); data.energy=energy; data.shape='DISK'; data.size=size; data.color=color
    obj=bpy.data.objects.new(name,data); SCENE.collection.objects.link(obj); obj.location=loc
    direction=Vector((0,0,1.2))-obj.location
    obj.rotation_euler=direction.to_track_quat('-Z','Y').to_euler()

area('Key',(4.8,-5.0,6.4),950,5.2,(1.0,.82,.68))
area('Fill',(-4.2,-2.0,3.6),620,4.0,(.50,.68,1.0))
area('Rim',(0,4.3,5.0),720,3.0,(.65,.80,1.0))

cam_data=bpy.data.cameras.new('PreviewCamera')
cam=bpy.data.objects.new('PreviewCamera',cam_data); SCENE.collection.objects.link(cam)
cam.location=(6.1,-7.2,5.0) if ARGS.profile in ('background','environment') else (4.5,-5.7,3.6)
target=Vector((0,0,BOUNDS_SIZE[2]*.5))
cam.location=target+Vector((1.5,-1.9,1.25))*max(BOUNDS_SIZE)
cam.rotation_euler=(target-Vector(cam.location)).to_track_quat('-Z','Y').to_euler()
cam_data.lens=52
SCENE.camera=cam

# GLB를 각각 다시 수입해 실제 내보내기 결과를 같은 카메라로 비교한다.
# Blender 내부 원본 씬만 비교하면 익스포터의 재질/좌표 손실을 놓칠 수 있다.
for obj in ASSET_OBJECTS: obj.hide_render=True
SCENE.render.image_settings.color_mode='RGBA'
SCENE.render.image_settings.color_depth='8'
preview_master=ARGS.output/'preview-master.png'
preview=ARGS.output/'preview.png'
rendered_pixels=[]
for source,destination in [(master,preview_master),(glb,preview)]:
    existing=set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(source))
    imported=[obj for obj in bpy.data.objects if obj not in existing]
    try:
        bpy.context.view_layer.update()
        SCENE.render.filepath=str(destination)
        bpy.ops.render.render(write_still=True)
        image=bpy.data.images.load(str(destination),check_existing=False)
        rendered_pixels.append(list(image.pixels))
        bpy.data.images.remove(image)
    finally:
        for obj in imported: bpy.data.objects.remove(obj,do_unlink=True)
before_pixels,after_pixels=rendered_pixels
if not before_pixels or len(before_pixels)!=len(after_pixels): raise RuntimeError('OPTIMIZATION_RENDER_COMPARISON_MISSING')
max_pixel_error=max(abs(a-b) for a,b in zip(before_pixels,after_pixels))
application['optimization']['previewComparison']={'method':'REIMPORTED_GLB_SAME_CAMERA_RGBA','before':'preview-master.png','after':'preview.png','maxPixelError':max_pixel_error,'sampleCount':len(after_pixels)}
if max_pixel_error>1e-5: raise RuntimeError('LOSSLESS_OPTIMIZATION_CHANGED_RENDER')
(ARGS.output/'application.json').write_text(json.dumps(application,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

source_hash=hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
artifact_hash=hashlib.sha256(glb.read_bytes()).hexdigest()
preview_hash=hashlib.sha256(preview.read_bytes()).hexdigest()
evidence={
    'version':1,
    'assetId':ARGS.asset_id,
    'profile':ARGS.profile,
    'subject':ARGS.subject,
    'styleFamily':FAMILY,
    'styleExpression':STYLE,
    'genre':ARGS.genre,
    'boundsSizeMeters':application['boundsSizeMeters'],
    'triangleCount':sum(sum(len(face.vertices)-2 for face in obj.data.polygons) for obj in ASSET_OBJECTS),
    'uvLayersVerified':all(bool(obj.data.uv_layers) for obj in ASSET_OBJECTS),
    'materialApplicationFile':'application.json',
    'family':('ENVIRONMENT' if ARGS.profile in ('background','environment') else 'WEAPON' if ARGS.profile in ('item','weapon') else 'PROP'),
    'generator':'assets/native-authoring/build-game-visual.py',
    'sourceHash':source_hash,
    'artifactHash':artifact_hash,
    'previewHash':preview_hash,
    'license':'project-original',
    'targetPlatforms':[ARGS.target.upper()],
    'runtimeVerificationState':'STATIC_BLENDER_QA_PASS_NATIVE_RUNTIME_PENDING',
    'productionVerified':False,
    'companyPromotionEligible':False,
    'meshObjectCount':len(ASSET_OBJECTS),
    'surfaceDistribution':physical_analysis,
    'optimization':application['optimization'],
    'outputs':['asset.glb','master.glb','preview.png','preview-master.png','application.json','evidence.json']
}
(ARGS.output/'evidence.json').write_text(json.dumps(evidence,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('VIBE_NATIVE_GAME_ASSET='+ARGS.asset_id)
print('VIBE_NATIVE_GAME_ASSET_PROFILE='+ARGS.profile)
print('VIBE_NATIVE_GAME_ASSET_TARGET='+ARGS.target)
