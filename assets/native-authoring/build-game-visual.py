# build-game-visual.py — deterministic project-original Blender authoring for Vibe GRAPHICS_PRODUCTION.
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
PARSER.add_argument('--target', choices=['roblox','unity'], required=True)
ARGV = sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
ARGS = PARSER.parse_args(ARGV)
ARGS.output.mkdir(parents=True, exist_ok=True)

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

seed = hashlib.sha256(f'{ARGS.asset_id}|{ARGS.profile}|{ARGS.target}'.encode()).digest()
hue = seed[0] / 255.0
accent_hue = (hue + 0.34 + (seed[1] / 255.0) * 0.18) % 1.0

def rgb(h, s, v):
    return colorsys.hsv_to_rgb(h, s, v)

def material(name, color, roughness=.48, metallic=.0, emission=None):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1.0)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1.0)
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = metallic
    if emission:
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
        mod.width = bevel
        mod.segments = 2
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

if ARGS.profile in ('background','environment'):
    environment_asset()
elif ARGS.profile in ('item','weapon'):
    weapon_asset()
else:
    prop_asset()

# Deterministic metadata on actual exported objects.
for obj in ASSET_OBJECTS:
    obj['vibeAssetId']=ARGS.asset_id
    obj['vibeProfile']=ARGS.profile
    obj['vibeTarget']=ARGS.target
    obj['vibeProjectOriginal']=True

# Export only authored asset objects.
bpy.ops.object.select_all(action='DESELECT')
for obj in ASSET_OBJECTS:
    obj.select_set(True)
if ASSET_OBJECTS:
    bpy.context.view_layer.objects.active=ASSET_OBJECTS[0]

glb=ARGS.output/'asset.glb'
bpy.ops.export_scene.gltf(
    filepath=str(glb),
    export_format='GLB',
    use_selection=True,
    export_materials='EXPORT',
    export_extras=True,
    export_yup=True
)

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
target=Vector((0,0,1.55 if ARGS.profile in ('background','environment') else 1.25))
cam.rotation_euler=(target-Vector(cam.location)).to_track_quat('-Z','Y').to_euler()
cam_data.lens=52
SCENE.camera=cam

preview=ARGS.output/'preview.png'
SCENE.render.filepath=str(preview)
SCENE.render.resolution_x=512; SCENE.render.resolution_y=512
bpy.ops.render.render(write_still=True)

source_hash=hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
artifact_hash=hashlib.sha256(glb.read_bytes()).hexdigest()
preview_hash=hashlib.sha256(preview.read_bytes()).hexdigest()
evidence={
    'version':1,
    'assetId':ARGS.asset_id,
    'profile':ARGS.profile,
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
    'outputs':['asset.glb','preview.png','evidence.json']
}
(ARGS.output/'evidence.json').write_text(json.dumps(evidence,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('VIBE_NATIVE_GAME_ASSET='+ARGS.asset_id)
print('VIBE_NATIVE_GAME_ASSET_PROFILE='+ARGS.profile)
print('VIBE_NATIVE_GAME_ASSET_TARGET='+ARGS.target)
