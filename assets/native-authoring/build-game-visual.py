# 파일명: assets/native-authoring/build-game-visual.py
# 기존 GRAPHICS_PRODUCTION의 원본 보존 제작·분석·최적화 책임.
# This is an asset recipe inside the existing pipeline, not a separate graphics pipeline.
import argparse
from array import array
import colorsys
import hashlib
import json
import math
import os
import subprocess
import sys
import tempfile
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
PARSER.add_argument('--source-image', default='')
PARSER.add_argument('--source-license', default='')
PARSER.add_argument('--source-credit', default='')
PARSER.add_argument('--module', choices=['auto','mesh-ai','human','clothing','object','design','medical','animation','video'], default='auto')
PARSER.add_argument('--source-model', default='')
PARSER.add_argument('--object-kind', choices=['generic','rock','crate','chair','table','door','tree','machine','weapon','lamp'], default='generic')
PARSER.add_argument('--motion-kind', choices=['sway','turntable','bounce'], default='sway')
PARSER.add_argument('--mesh-model', choices=['auto','trellis2','triposr'], default='auto')
PARSER.add_argument('--source-sanitized', choices=['yes','no'], default='no')
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
IMAGE_PROVENANCE = None
MODULE_PROVENANCE = None
SOURCE_PROVENANCE = None
ASSET_ARMATURES = []
# 기존 실행기 안에서만 사용하는 오픈소스 기능. 설치되지 않은 외부 엔진의 PASS를 만들지 않는다.
OPEN_SOURCE_MODULES = {
    'mesh-ai': {'source': 'https://github.com/microsoft/TRELLIS.2', 'baselineSource': 'https://github.com/VAST-AI-Research/TripoSR', 'engine': 'TRELLIS.2_4B_OR_TRIPOSR', 'license': 'MIT'},
    'human': {'source': 'https://github.com/makehumancommunity/mpfb2', 'engine': 'MPFB2', 'license': 'GPL-3.0-or-later', 'assetLicense': 'CC0'},
    'object': {'source': 'https://github.com/blender/blender', 'engine': 'BlenderNativeGeometry', 'license': 'GPL-2.0-or-later'},
    'clothing': {'source': 'https://github.com/blender/blender', 'engine': 'BlenderMeshAndCloth', 'license': 'GPL-2.0-or-later'},
    'design': {'source': 'https://github.com/blender/blender', 'engine': 'BlenderParametricGeometry', 'license': 'GPL-2.0-or-later'},
    'medical': {'source': 'https://github.com/Slicer/Slicer', 'engine': 'SlicerCompatibleSurfaceImportAndBlender', 'license': 'BSD-style-Slicer-GPL-Blender'},
    'animation': {'source': 'https://github.com/blender/blender', 'engine': 'BlenderKeyframesAndNLA', 'license': 'GPL-2.0-or-later'},
    'video': {'source': 'https://ffmpeg.org', 'engine': 'BlenderFramesAndFFmpeg', 'license': 'LGPL-2.1-or-later-or-GPL-depending-on-build'},
}
if ARGS.module == 'medical' and (ARGS.source_image or not ARGS.source_model):
    raise RuntimeError('MEDICAL_SOURCE_SURFACE_MODEL_REQUIRED')
if ARGS.module == 'mesh-ai' and not ARGS.source_image:
    raise RuntimeError('IMAGE_TO_MESH_LOCAL_IMAGE_REQUIRED')
if ARGS.source_image and ARGS.source_model:
    raise RuntimeError('SOURCE_IMAGE_MODEL_MUTUALLY_EXCLUSIVE')

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

# 메인: 기존 GRAPHICS_PRODUCTION Blender 제작기에 오픈소스 TripoSR 추론을 직접 연결한다.
# 실제 추론이 불가능하면 기존 형상으로 대체하지 않고 실패 처리한다.
def image_mesh_asset():
    global IMAGE_PROVENANCE
    source = Path(ARGS.source_image).resolve()
    source_license = ARGS.source_license.strip()
    if not source.is_file() or source.suffix.lower() not in ('.png', '.jpg', '.jpeg', '.webp'):
        raise RuntimeError('IMAGE_TO_MESH_LOCAL_IMAGE_REQUIRED')
    if source.stat().st_size <= 0 or source.stat().st_size > 25 * 1024 * 1024:
        raise RuntimeError('IMAGE_TO_MESH_IMAGE_SIZE_INVALID')
    if source_license.lower() not in ('project-original', 'cc0', 'cc-by'):
        raise RuntimeError('IMAGE_TO_MESH_SOURCE_RIGHTS_REQUIRED')
    if source_license.lower() == 'cc-by' and not ARGS.source_credit.strip():
        raise RuntimeError('IMAGE_TO_MESH_ATTRIBUTION_REQUIRED')

    # 기존 Blender 제작 책임 함수에서 실행 능력에 따라 실제 설치된 모델만 선택한다.
    # TRELLIS.2는 고품질 로컬 CUDA 24GiB 이상일 때 사용하며 추론 오류를 조용히 하위 품질로 대체하지 않는다.
    requested = ARGS.mesh_model
    trellis_env = ('VIBE_TRELLIS2_HOME', 'VIBE_TRELLIS2_MODEL_DIR')
    trellis_requested = requested == 'trellis2' or (requested == 'auto' and any(os.environ.get(k) for k in trellis_env))
    model_engine = 'microsoft/TRELLIS.2' if trellis_requested else 'VAST-AI-Research/TripoSR'
    source_file_hash = ''
    weights_sha = ''
    model_license = 'MIT'
    with tempfile.TemporaryDirectory(prefix='vibe-image-mesh-') as temporary:
        result_mesh = Path(temporary) / 'mesh.glb'
        offline_environment = dict(os.environ)
        offline_environment.update({
            'HF_HUB_OFFLINE': '1',
            'TRANSFORMERS_OFFLINE': '1',
            'HF_DATASETS_OFFLINE': '1',
            'HF_HUB_DISABLE_TELEMETRY': '1',
            'OPENCV_IO_ENABLE_OPENEXR': '1',
        })
        if trellis_requested:
            if not all(os.environ.get(k) for k in trellis_env):
                raise RuntimeError('IMAGE_TO_MESH_TRELLIS2_LOCAL_CONFIG_REQUIRED')
            engine_home = Path(os.environ['VIBE_TRELLIS2_HOME']).expanduser().resolve()
            model_home = Path(os.environ['VIBE_TRELLIS2_MODEL_DIR']).expanduser().resolve()
            entry = engine_home / 'example.py'
            pipeline = engine_home / 'trellis2' / 'pipelines' / 'trellis2_image_to_3d.py'
            license_file = engine_home / 'LICENSE'
            config = model_home / 'pipeline.json'
            if not entry.is_file() or not pipeline.is_file() or not license_file.is_file():
                raise RuntimeError('IMAGE_TO_MESH_TRELLIS2_SOURCE_REQUIRED')
            if 'MIT License' not in license_file.read_text(encoding='utf-8'):
                raise RuntimeError('IMAGE_TO_MESH_TRELLIS2_LICENSE_UNVERIFIED')
            if not config.is_file():
                raise RuntimeError('IMAGE_TO_MESH_TRELLIS2_OFFLINE_WEIGHTS_REQUIRED')
            # 모든 로컬 체크포인트를 스트림으로 해시해 승인된 정확한 모델 스냅샷만 실행한다.
            checkpoints = sorted(f for f in model_home.rglob('*') if f.is_file()
                                 and f.suffix.lower() in ('.safetensors', '.bin', '.ckpt', '.pt'))
            if not checkpoints or len(checkpoints) > 96:
                raise RuntimeError('IMAGE_TO_MESH_TRELLIS2_WEIGHTS_INCOMPLETE')
            expected_source = os.environ.get('VIBE_TRELLIS2_EXPECTED_SOURCE_SHA256', '').lower()
            expected_weights = os.environ.get('VIBE_TRELLIS2_EXPECTED_WEIGHTS_SHA256', '').lower()
            for pin in (expected_source, expected_weights):
                if len(pin) != 64 or any(char not in '0123456789abcdef' for char in pin):
                    raise RuntimeError('IMAGE_TO_MESH_TRELLIS2_PIN_REQUIRED')
            source_file_hash = hashlib.sha256(entry.read_bytes()).hexdigest()
            if source_file_hash != expected_source:
                raise RuntimeError('IMAGE_TO_MESH_TRELLIS2_SOURCE_HASH_MISMATCH')
            manifest = hashlib.sha256()
            for checkpoint in checkpoints:
                manifest.update(checkpoint.relative_to(model_home).as_posix().encode('utf-8') + b'\0')
                with checkpoint.open('rb') as stream:
                    for chunk in iter(lambda: stream.read(8 * 1024 * 1024), b''):
                        manifest.update(chunk)
            weights_sha = manifest.hexdigest()
            if weights_sha != expected_weights:
                raise RuntimeError('IMAGE_TO_MESH_TRELLIS2_WEIGHTS_HASH_MISMATCH')
            # 외부 서비스를 호출하지 않고 공개된 TRELLIS.2 원본 파이프라인을 그대로 실행한다.
            inference = """
import sys, torch
from PIL import Image
import o_voxel
from trellis2.pipelines import Trellis2ImageTo3DPipeline
if not torch.cuda.is_available():
    raise RuntimeError('TRELLIS2_NVIDIA_CUDA_GPU_REQUIRED')
if torch.cuda.get_device_properties(0).total_memory < 24 * 1024 ** 3:
    raise RuntimeError('TRELLIS2_24G_GPU_REQUIRED')
pipeline = Trellis2ImageTo3DPipeline.from_pretrained(sys.argv[1])
pipeline.cuda()
mesh = pipeline.run(Image.open(sys.argv[2]).convert('RGBA'))[0]
mesh.simplify(16777216)
glb = o_voxel.postprocess.to_glb(
    vertices=mesh.vertices, faces=mesh.faces, attr_volume=mesh.attrs,
    coords=mesh.coords, attr_layout=mesh.layout, voxel_size=mesh.voxel_size,
    aabb=[[-0.5,-0.5,-0.5],[0.5,0.5,0.5]],
    decimation_target=180000, texture_size=2048, remesh=True,
    remesh_band=1, remesh_project=0, verbose=False)
glb.export(sys.argv[3], extension_webp=False)
"""
            cmd = [os.environ.get('VIBE_TRELLIS2_PYTHON', 'python3'), '-c',
                   inference, str(model_home), str(source), str(result_mesh)]
            offline_environment['PYTHONPATH'] = str(engine_home) + os.pathsep + offline_environment.get('PYTHONPATH', '')
            error_marker = 'IMAGE_TO_MESH_TRELLIS2_INFERENCE_FAILED'
            chosen_model = 'microsoft/TRELLIS.2-4B'
            module_source = 'https://github.com/microsoft/TRELLIS.2'
        else:
            engine_var = os.environ.get('VIBE_TRIPOSR_HOME')
            model_var = os.environ.get('VIBE_TRIPOSR_MODEL_DIR')
            if not engine_var or not model_var:
                raise RuntimeError('IMAGE_TO_MESH_TRIPOSR_LOCAL_INSTALL_REQUIRED')
            engine_home = Path(engine_var).expanduser().resolve()
            model_home = Path(model_var).expanduser().resolve()
            entry = engine_home / 'run.py'
            engine_source = engine_home / 'tsr' / 'system.py'
            license_file = engine_home / 'LICENSE'
            config = model_home / 'config.yaml'
            weights = model_home / 'model.ckpt'
            if not entry.is_file() or not engine_source.is_file() or not license_file.is_file():
                raise RuntimeError('IMAGE_TO_MESH_TRIPOSR_ENGINE_NOT_INSTALLED')
            if 'MIT License' not in license_file.read_text(encoding='utf-8'):
                raise RuntimeError('IMAGE_TO_MESH_ENGINE_LICENSE_UNVERIFIED')
            if not config.is_file() or not weights.is_file():
                raise RuntimeError('IMAGE_TO_MESH_TRIPOSR_LOCAL_WEIGHTS_REQUIRED')
            expected_source = os.environ.get('VIBE_TRIPOSR_EXPECTED_SOURCE_SHA256', '').lower()
            expected_weights = os.environ.get('VIBE_TRIPOSR_EXPECTED_WEIGHTS_SHA256', '').lower()
            for pin in (expected_source, expected_weights):
                if len(pin) != 64 or any(char not in '0123456789abcdef' for char in pin):
                    raise RuntimeError('IMAGE_TO_MESH_PINNED_SOURCE_AND_WEIGHTS_REQUIRED')
            source_file_hash = hashlib.sha256(entry.read_bytes()).hexdigest()
            if source_file_hash != expected_source:
                raise RuntimeError('IMAGE_TO_MESH_ENGINE_SOURCE_HASH_MISMATCH')
            with weights.open('rb') as stream:
                weights_sha = hashlib.file_digest(stream, 'sha256').hexdigest()
            if weights_sha != expected_weights:
                raise RuntimeError('IMAGE_TO_MESH_MODEL_WEIGHTS_HASH_MISMATCH')
            output_dir = Path(temporary) / 'triposr'
            cmd = [os.environ.get('VIBE_TRIPOSR_PYTHON', 'python3'), str(entry),
                   str(source), '--output-dir', str(output_dir), '--model-save-format', 'glb',
                   '--mc-resolution', '256', '--pretrained-model-name-or-path', str(model_home)]
            error_marker = 'IMAGE_TO_MESH_TRIPOSR_INFERENCE_FAILED'
            chosen_model = 'stabilityai/TripoSR'
            module_source = 'https://github.com/VAST-AI-Research/TripoSR'
        try:
            subprocess.run(cmd, cwd=str(engine_home), env=offline_environment, check=True,
                           stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, timeout=480)
        except (OSError, subprocess.CalledProcessError, subprocess.TimeoutExpired) as exc:
            raise RuntimeError(error_marker) from exc
        if not trellis_requested:
            result_mesh = output_dir / '0' / 'mesh.glb'
        if not result_mesh.is_file() or result_mesh.stat().st_size <= 1024:
            raise RuntimeError('IMAGE_TO_MESH_GENERATED_GLB_MISSING')
        before = set(bpy.data.objects)
        bpy.ops.import_scene.gltf(filepath=str(result_mesh))
        imported = [obj for obj in bpy.data.objects if obj not in before and obj.type == 'MESH']
        triangles = sum(sum(len(face.vertices) - 2 for face in obj.data.polygons) for obj in imported)
        if not imported or triangles < 8 or triangles > 450000:
            raise RuntimeError('IMAGE_TO_MESH_GENERATED_GEOMETRY_INVALID')
        for obj in imported:
            if not obj.data.materials:
                obj.data.materials.append(MID)
            ASSET_OBJECTS.append(obj)

    IMAGE_PROVENANCE = {
        'engine': model_engine,
        'engineLicense': model_license,
        'engineSource': module_source,
        'engineSourceSha256': source_file_hash,
        'model': chosen_model,
        'modelWeightSha256': weights_sha,
        'offlineInference': True,
        'modelTier': 'HIGH_FIDELITY' if trellis_requested else 'BASELINE',
        'inputPath': ARGS.source_image,
        'inputSha256': hashlib.sha256(source.read_bytes()).hexdigest(),
        'sourceLicense': source_license,
        'sourceCredit': ARGS.source_credit.strip() or None,
        'generatedGeometry': True,
        'rigged': False,
        'originalImageImmutable': True,
        'runtimeVerified': False,
    }

# 메인: 블렌더 오픈소스 패턴을 사용해 실제 입체 의류 패널과 소매를 제작한다.
# 메인: MPFB2의 CC0 인체 베이스와 실제 아마추어 리그를 사용한다. 애드온이 없으면 실패한다.
def human_asset():
    global MODULE_PROVENANCE
    addon_home=os.environ.get('VIBE_MPFB_HOME','')
    home=Path(addon_home).expanduser().resolve() if addon_home else None
    if home is None or not (home/'src'/'mpfb'/'__init__.py').is_file():
        raise RuntimeError('HUMAN_MPFB_ADDON_NOT_INSTALLED')
    code_file=home/'LICENSE.CODE.md'
    assets_file=home/'LICENSE.ASSETS.md'
    if not code_file.is_file() or not assets_file.is_file():
        raise RuntimeError('HUMAN_MPFB_LICENSE_FILES_REQUIRED')
    if 'gnu general public license' not in code_file.read_text(encoding='utf-8',errors='replace').lower() or 'cc0' not in assets_file.read_text(encoding='utf-8',errors='replace').lower():
        raise RuntimeError('HUMAN_MPFB_SOURCE_LICENSE_UNVERIFIED')
    if str(home/'src') not in sys.path:sys.path.insert(0,str(home/'src'))
    try:
        from mpfb.services.humanservice import HumanService
        body=HumanService.create_human(scale=.1,feet_on_ground=True)
        rig=HumanService.add_builtin_rig(body,'game_engine')
    except Exception as exc:
        raise RuntimeError('HUMAN_MPFB_REAL_MODEL_AND_RIG_FAILED') from exc
    if not body or body.type!='MESH' or not rig or rig.type!='ARMATURE':
        raise RuntimeError('HUMAN_MPFB_ARMATURE_REQUIRED')
    if not any(mod.type=='ARMATURE' for mod in body.modifiers):
        raise RuntimeError('HUMAN_MPFB_WEIGHT_BINDING_REQUIRED')
    body.name='VibeHumanBody'
    rig.name='VibeHumanRig'
    if not body.data.materials:body.data.materials.append(BASE)
    ASSET_OBJECTS.append(body)
    ASSET_ARMATURES.append(rig)
    human_motion(rig)
    MODULE_PROVENANCE={'kind':'human','source':OPEN_SOURCE_MODULES['human'],
        'method':'MPFB2_CC0_BASE_MESH_AND_GAME_RIG_WITH_BONE_ANIMATION',
        'generatedGeometry':True,'hasRig':True,'clinicalUseApproved':False,'runtimeVerified':False}


# 헬퍼: 인체 스킨 뼈에 직접 시각적 기본 모션 키를 기록한다. 게임 판정·체력·저장과 무관하다.
def human_motion(rig):
    bones=list(rig.pose.bones)
    if len(bones)<10:raise RuntimeError('HUMAN_RIG_BONE_COUNT_INVALID')
    groups={
        'arm':[b for b in bones if any(v in b.name.lower() for v in ('arm','shoulder'))],
        'leg':[b for b in bones if any(v in b.name.lower() for v in ('thigh','leg','calf'))],
        'spine':[b for b in bones if any(v in b.name.lower() for v in ('spine','chest','torso'))],
        'head':[b for b in bones if any(v in b.name.lower() for v in ('head','neck'))],
    }
    movers=groups['arm'][:2]+groups['leg'][:2]+groups['spine'][:1]+groups['head'][:1]
    if not movers:raise RuntimeError('HUMAN_RIG_ANIMATABLE_BONES_REQUIRED')
    scene=bpy.context.scene
    clips={'IDLE':(.028,0,.025),'WALK':(.26,.48,.06),'ATTACK':(.48,.07,.18),
           'HIT':(-.20,.04,.17),'DEATH':(.38,.26,.42)}
    rig.animation_data_create()
    for clip,axes in clips.items():
        rig.animation_data.action=None
        action=bpy.data.actions.new(clip)
        rig.animation_data.action=action
        for frame,sign in ((1,-1),(13,1),(25,-1)):
            scene.frame_set(frame)
            for idx,bone in enumerate(movers):
                bone.rotation_mode='XYZ'
                direction=sign*(1 if idx%2==0 else -1)
                value=axes[0] if bone in groups['arm'] else axes[1] if bone in groups['leg'] else axes[2]
                bone.rotation_euler=(value*direction,value*.28,0)
                bone.keyframe_insert(data_path='rotation_euler',frame=frame,group=bone.name)
        track=rig.animation_data.nla_tracks.new()
        track.name=clip
        track.strips.new(clip,1,action)
    rig.animation_data.action=None
    scene.frame_set(1)


def clothing_asset():
    global MODULE_PROVENANCE
    verts, faces = [], []
    segments = 24
    sections = [(0.12,0.56,0.37),(0.32,0.55,0.36),(0.72,0.46,0.32),(1.14,0.52,0.34),(1.55,0.64,0.38),(1.78,0.49,0.30)]
    for z, rx, ry in sections:
        for idx in range(segments):
            angle = idx * math.tau / segments
            verts.append((rx*math.cos(angle),ry*math.sin(angle),z+0.035*math.cos(angle*6)))
    for idx in range(len(sections)-1):
        for segment in range(segments):
            nxt=(segment+1)%segments
            faces.append((idx*segments+segment,idx*segments+nxt,(idx+1)*segments+nxt,(idx+1)*segments+segment))
    mesh = bpy.data.meshes.new('ClothingPatternMesh')
    mesh.from_pydata(verts,[],faces); mesh.update()
    obj=bpy.data.objects.new('TailoredGarment',mesh)
    SCENE.collection.objects.link(obj)
    finish(obj,MID,0)
    thick=obj.modifiers.new('GarmentFabricThickness','SOLIDIFY')
    thick.thickness=0.045
    for side in (-1,1):
        cylinder(f'GarmentSleeve_{side}',(side*.73,0,1.49),.33,.58,BASE,vertices=24,
                 rot=(0,math.pi/2,0),bevel=.025)
        torus(f'GarmentCuff_{side}',(side*.99,0,1.49),.31,.045,ACCENT,
              rot=(0,math.pi/2,0))
    torus('ClothingCollar',(0,0,1.76),.48,.047,ACCENT)
    for side in (-1,1):
        box(f'GarmentSeam_{side}',(side*.32,-.345,.85),(.028,.025,.56),DARK,bevel=.008)
    MODULE_PROVENANCE={'kind':'clothing','source':OPEN_SOURCE_MODULES['clothing'],
                       'method':'BLENDER_MESH_PATTERN_SOLIDIFY_AND_MATERIAL',
                       'generatedGeometry':True,'runtimeVerified':False}


# 메인: 블렌더 형상·베벨·재질을 활용한 파라메트릭 설계용 입체 메시.
def design_asset():
    global MODULE_PROVENANCE
    box('DesignMainFrame',(0,0,.78),(1.15,.85,.60),BASE,bevel=.14)
    box('DesignTopPanel',(0,0,1.44),(1.0,.74,.12),MID,bevel=.075)
    box('DesignInset',(0,-.865,.92),(.75,.035,.32),ACCENT,bevel=.04)
    for side in (-1,1):
        cylinder(f'DesignSupport_{side}',(side*.92,0,.80),.12,1.22,METAL,vertices=32)
        torus(f'DesignMount_{side}',(side*.92,-.02,1.41),.20,.045,ACCENT)
    box('DesignHandle',(0,-.98,1.14),(.39,.18,.08),DARK,bevel=.035)
    for index in range(5):
        cylinder(f'DesignDial_{index}',(-.55+index*.28,-.94,.77),.075,.035,GLOW,vertices=16,
                 rot=(math.pi/2,0,0),bevel=.012)
    MODULE_PROVENANCE={'kind':'design','source':OPEN_SOURCE_MODULES['design'],
                       'method':'BLENDER_PARAMETRIC_BEVEL_UV_AND_MATERIAL',
                       'generatedGeometry':True,'runtimeVerified':False}


# 메인: FreeCAD 또는 3D Slicer의 비민감 메시 산출물을 원본 보존 방식으로 가져온다.
# 영상·의료진단·환자 메타데이터는 읽거나 생성하지 않는다.
# 메인: 기존 Blender 메쉬 제작 책임에서 게임 오브젝트를 유형별로 자동 조립한다.
def object_asset():
    global MODULE_PROVENANCE
    kind=ARGS.object_kind
    if kind=='rock':rock_asset()
    elif kind=='crate':crate_asset()
    elif kind=='weapon':weapon_asset()
    elif kind=='machine':design_asset()
    elif kind=='tree':
        cylinder('TreeTrunk',(0,0,.93),.26,1.86,BASE,24)
        for level,side in enumerate((-1,1,0)):
            cone(f'TreeFoliage_{level}',(side*.34,0,1.82+level*.30),
                 .85-.11*level,.04,1.34,MID,24)
    elif kind=='table':
        box('TableTop',(0,0,1.07),(1.50,.86,.12),MID,bevel=.045)
        for x in (-.58,.58):
            for y in (-.32,.32):box(f'TableLeg_{x}_{y}',(x,y,.52),(.12,.12,.52),BASE)
    elif kind=='chair':
        box('ChairSeat',(0,0,.64),(.68,.66,.12),MID)
        box('ChairBack',(0,.31,1.12),(.68,.10,.55),BASE)
        for x in (-.28,.28):
            for y in (-.28,.28):box(f'ChairLeg_{x}_{y}',(x,y,.28),(.09,.09,.28),DARK)
    elif kind=='door':
        box('DoorFrame',(0,0,1.04),(.83,.18,1.04),DARK)
        box('DoorPanel',(0,-.13,1.04),(.67,.10,.89),BASE,bevel=.03)
        cylinder('DoorKnob',(.49,-.26,1.00),.065,.12,METAL,16,rot=(math.pi/2,0,0))
    elif kind=='lamp':
        cylinder('LampBase',(0,0,.10),.40,.20,BASE)
        cylinder('LampStem',(0,0,.98),.08,1.63,METAL)
        cone('LampShade',(0,0,1.89),.55,.16,.54,ACCENT)
        cylinder('LampLight',(0,0,1.71),.20,.08,GLOW)
    else:design_asset()
    MODULE_PROVENANCE={'kind':'object','source':OPEN_SOURCE_MODULES['object'],
        'method':'BLENDER_NATIVE_AUTHORED_'+kind.upper(),'generatedGeometry':True,
        'runtimeVerified':False}


def import_source_surface():
    global MODULE_PROVENANCE, SOURCE_PROVENANCE
    src=Path(ARGS.source_model).resolve()
    rights=ARGS.source_license.strip().lower()
    if not src.is_file() or src.suffix.lower() not in ('.obj','.stl','.glb'):
        raise RuntimeError('OPEN_SOURCE_SURFACE_MODEL_REQUIRED')
    if src.stat().st_size<=0 or src.stat().st_size>64*1024*1024:
        raise RuntimeError('OPEN_SOURCE_SURFACE_MODEL_SIZE_INVALID')
    if rights not in ('project-original','cc0','cc-by'):
        raise RuntimeError('OPEN_SOURCE_SURFACE_RIGHTS_REQUIRED')
    if rights=='cc-by' and not ARGS.source_credit.strip():
        raise RuntimeError('OPEN_SOURCE_SURFACE_ATTRIBUTION_REQUIRED')
    if ARGS.module=='medical' and ARGS.source_sanitized!='yes':
        raise RuntimeError('MEDICAL_SOURCE_SANITIZED_CONFIRMATION_REQUIRED')
    before=set(bpy.data.objects)
    if src.suffix.lower()=='.glb':
        bpy.ops.import_scene.gltf(filepath=str(src))
    elif src.suffix.lower()=='.stl':
        if hasattr(bpy.ops.wm,'stl_import'): bpy.ops.wm.stl_import(filepath=str(src))
        else: bpy.ops.import_mesh.stl(filepath=str(src))
    else:
        if hasattr(bpy.ops.wm,'obj_import'): bpy.ops.wm.obj_import(filepath=str(src))
        else: bpy.ops.import_scene.obj(filepath=str(src))
    imported=[obj for obj in bpy.data.objects if obj not in before and obj.type=='MESH']
    rigs=[obj for obj in bpy.data.objects if obj not in before and obj.type=='ARMATURE']
    faces=sum(sum(max(0,len(poly.vertices)-2) for poly in obj.data.polygons) for obj in imported)
    if not imported or not 4<=faces<=450000:
        raise RuntimeError('OPEN_SOURCE_SURFACE_GEOMETRY_INVALID')
    for index,obj in enumerate(imported):
        if ARGS.module=='medical':
            # 수입한 표면에서 민감해질 수 있는 문자열과 텍스처 정보를 제거한다.
            obj.name=f'MedicalSurface_{index}'
            obj.data.name=f'MedicalSurfaceGeometry_{index}'
            for key in list(obj.keys()): del obj[key]
            for key in list(obj.data.keys()): del obj.data[key]
            obj.data.materials.clear()
            obj.data.materials.append(MID)
        elif not obj.data.materials:obj.data.materials.append(MID)
        ASSET_OBJECTS.append(obj)
    if ARGS.module=='human':
        if not rigs or not any(mod.type=='ARMATURE' for obj in imported for mod in obj.modifiers):
            raise RuntimeError('HUMAN_IMPORTED_RIG_AND_WEIGHTS_REQUIRED')
        ASSET_ARMATURES.extend(rigs)
        for rig in rigs:
            if not rig.animation_data or not rig.animation_data.nla_tracks:
                human_motion(rig)
    SOURCE_PROVENANCE={
        'sourcePath':ARGS.source_model,'sourceSha256':hashlib.sha256(src.read_bytes()).hexdigest(),
        'license':ARGS.source_license,'attribution':ARGS.source_credit.strip() or None,
        'sanitizedAsserted':ARGS.source_sanitized=='yes','sourceFileImmutable':True
    }
    kind=ARGS.module if ARGS.module!='auto' else 'design'
    MODULE_PROVENANCE={
        'kind':kind,'source':OPEN_SOURCE_MODULES[kind],
        'method':'LICENSE_VERIFIED_EXTERNAL_SURFACE_IMPORT',
        'sourcePlatform':'3D_SLICER_OR_FREECAD_USER_EXPORTED_SURFACE',
        'generatedGeometry':False,'deidentifiedAssertionOnly':kind=='medical',
        'clinicalUseApproved':False,'clinicalDiagnosisAllowed':False,'runtimeVerified':False
    }


if ARGS.source_model:
    import_source_surface()
elif ARGS.source_image:
    image_mesh_asset()
    if ARGS.module in ('clothing','design'):
        MODULE_PROVENANCE={'kind':ARGS.module,'source':OPEN_SOURCE_MODULES[ARGS.module],
                           'method':'TRIPOSR_IMAGE_MESH_THEN_BLENDER_RECONSTRUCTION',
                           'generatedGeometry':True,'runtimeVerified':False}
    else:
        MODULE_PROVENANCE={'kind':'mesh-ai','source':OPEN_SOURCE_MODULES['mesh-ai'],
                           'method':'LOCAL_TRIPOSR_INFERENCE','generatedGeometry':True,
                           'runtimeVerified':False}
elif ARGS.module == 'human':
    human_asset()
elif ARGS.module == 'clothing':
    clothing_asset()
elif ARGS.module == 'object':
    object_asset()
elif ARGS.module == 'design':
    design_asset()
elif ARGS.module in ('animation','video'):
    object_asset()
elif ARGS.subject=='rock':
    rock_asset()
elif ARGS.subject=='crate' or ARGS.profile=='prop' and not TECH:
    crate_asset()
elif ARGS.profile in ('background','environment'):
    environment_asset()
elif ARGS.profile in ('item','weapon'):
    weapon_asset()
else:
    prop_asset()

# 애니메이션·영상 내장 모듈: 실제 메시/관절에 프레임별 키를 넣고 GLB에 포함한다.
# 포즈 이동은 시각 표현으로만 사용하고 게임의 데미지·물리 판정을 변경하지 않는다.
MOTION_CLIPS=[]
if ARGS.module in ('animation','video'):
    if ARGS.module=='video' and ARGS.source_sanitized=='yes':
        raise RuntimeError('MEDICAL_VIDEO_EXPORT_NOT_SUPPORTED')
    if not ASSET_ARMATURES:
        for mesh in ASSET_OBJECTS:
            mesh.rotation_mode='XYZ'
            original_rotation=tuple(mesh.rotation_euler)
            original_height=float(mesh.location.z)
            action=bpy.data.actions.new('ASSET_SHOWCASE_'+ARGS.motion_kind.upper())
            mesh.animation_data_create()
            mesh.animation_data.action=action
            for frame,phase in ((1,0),(13,1),(25,0)):
                if ARGS.motion_kind=='turntable':
                    mesh.rotation_euler.z=original_rotation[2]+math.tau*(frame-1)/24
                    mesh.keyframe_insert(data_path='rotation_euler',frame=frame)
                elif ARGS.motion_kind=='bounce':
                    mesh.location.z=original_height+phase*.11
                    mesh.keyframe_insert(data_path='location',frame=frame)
                else:
                    mesh.rotation_euler.y=original_rotation[1]+phase*.10
                    mesh.keyframe_insert(data_path='rotation_euler',frame=frame)
            track=mesh.animation_data.nla_tracks.new()
            track.name='SHOWCASE'
            track.strips.new('SHOWCASE',1,action)
            mesh.animation_data.action=None
            mesh.rotation_euler=original_rotation
            mesh.location.z=original_height
        MOTION_CLIPS.append('SHOWCASE')
    else:
        for rig in ASSET_ARMATURES:
            if not rig.animation_data or not rig.animation_data.nla_tracks:
                human_motion(rig)
            MOTION_CLIPS.extend([track.name for track in rig.animation_data.nla_tracks])
    MODULE_PROVENANCE={'kind':ARGS.module,'source':OPEN_SOURCE_MODULES[ARGS.module],
        'method':'BLENDER_KEYFRAMED_NATIVE_GLTF_PLUS_FFMPEG_MP4_PREVIEW',
        'generatedGeometry':not bool(SOURCE_PROVENANCE),
        'clipNames':MOTION_CLIPS,
        'videoEncoding':'FFMPEG_MPEG4_LGPL_PATH' if ARGS.module=='video' else None,
        'runtimeVerified':False}

# Apply authored geometry before measuring it. Smart UVs include bevel faces.
for obj in ASSET_OBJECTS:
    bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
    # 인체 리그 바인딩을 유지하며 기존 정적 메쉬의 모디파이어 처리만 유지한다.
    if not ASSET_ARMATURES:
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
for obj in ASSET_OBJECTS:
    if obj.parent not in ASSET_ARMATURES:obj.location+=shift
for rig in ASSET_ARMATURES:rig.location+=shift
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
    obj['vibeProjectOriginal']=(IMAGE_PROVENANCE['sourceLicense'].lower()=='project-original') if IMAGE_PROVENANCE else (SOURCE_PROVENANCE['license'].lower()=='project-original' if SOURCE_PROVENANCE else not (MODULE_PROVENANCE and MODULE_PROVENANCE['kind']=='human'))
    if IMAGE_PROVENANCE:
        obj['vibeSourceImageSha256']=IMAGE_PROVENANCE['inputSha256']
        obj['vibeSourceLicense']=IMAGE_PROVENANCE['sourceLicense']
    if SOURCE_PROVENANCE:
        obj['vibeSourceMeshSha256']=SOURCE_PROVENANCE['sourceSha256']
        obj['vibeSourceLicense']=SOURCE_PROVENANCE['license']

# Export only authored asset objects.
bpy.ops.object.select_all(action='DESELECT')
for obj in ASSET_OBJECTS:
    obj.select_set(True)
for rig in ASSET_ARMATURES:
    rig.select_set(True)
if ASSET_OBJECTS:
    bpy.context.view_layer.objects.active=ASSET_OBJECTS[0]

# 원본 GLB를 먼저 보존한 뒤 동일한 메시 데이터만 공유한다.
# 스케일·피벗·재질·UV·스무딩·노드 이름은 바꾸지 않는다.
master=ARGS.output/'master.glb'
bpy.ops.export_scene.gltf(filepath=str(master),export_format='GLB',use_selection=True,
    export_materials='EXPORT',export_extras=True,export_yup=True)
original_meshes=[obj.data for obj in ASSET_OBJECTS]
mesh_cache={}
for obj in ([] if ASSET_ARMATURES else ASSET_OBJECTS):
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
reused_meshes=0 if ASSET_ARMATURES else len(original_meshes)-len(mesh_cache)
glb=ARGS.output/'asset.glb'
bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',use_selection=True,
    export_materials='EXPORT',export_extras=True,export_yup=True)
# 압축이 이익이 없으면 원본 바이트를 유지한다. 품질을 낮춰 크기를 맞추지 않는다.
if ASSET_ARMATURES or glb.stat().st_size>master.stat().st_size:
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
    if not area>0: raise RuntimeError('NATIVE_GLB_EMPTY_TRIANGLE_SURFACE')
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
# 기존 geometrySurface와 2차 surfaceDistribution은 같은 삼각형 적분 결과를 공유한다.
# 모델 표면은 물리 질량·충돌 판정의 권위가 아니다.
geometry_surface={
    'areaSquareMeters':physical_analysis['surfaceAreaM2'],
    'centroidMeters':physical_analysis['centroidMeters'],
    'nonAuthoritative':True
}

application={'version':1,'masterSha256':hashlib.sha256(glb.read_bytes()).hexdigest(),
    'sourceUnits':'METERS','sourceUp':'Y','boundsSizeMeters':[BOUNDS_SIZE[0],BOUNDS_SIZE[2],BOUNDS_SIZE[1]],
    'pivot':'GROUND_CENTER','surfaceDistribution':physical_analysis,'style':STYLE,'genre':ARGS.genre,'subject':ARGS.subject,'materials':materials,'geometrySurface':geometry_surface,
    'imageToMesh':IMAGE_PROVENANCE,
    'openSourceModule':MODULE_PROVENANCE,
    'sourceMesh':SOURCE_PROVENANCE,
    'target':ARGS.target,'nativeRuntimeVerified':False,'automaticPromotionAllowed':False,
    'importRequirements':['EXPLICIT_PROJECT_UNITS_PER_METER','PRESERVE_PIVOT_AND_HANDEDNESS_ONCE','MATERIAL_SLOT_NAME_MATCH','NATIVE_LIGHTING_AND_GAME_CAMERA_REVIEW','INDEPENDENT_COLLISION_AND_SPAWN_CONTACT']}
if not ASSET_ARMATURES and not MOTION_CLIPS:
    application['optimization']={'method':'EXACT_MESH_DATA_REUSE','originalFile':'master.glb',
        'originalSha256':hashlib.sha256(master.read_bytes()).hexdigest(),'originalBytes':master.stat().st_size,
        'deploymentBytes':glb.stat().st_size,'byteMeasurementScope':'SELECTED_GLB_PAYLOAD_ONLY',
        'deploymentBundleBytes':None,'reusedMeshCount':reused_meshes,'runtimeMemoryBytes':None,
        'loadingTimeMs':None,'drawCalls':None,'runtimeVerified':False}
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
        pixels=array('f',[0.])*len(image.pixels)
        image.pixels.foreach_get(pixels)
        rendered_pixels.append(pixels)
        bpy.data.images.remove(image)
    finally:
        for obj in imported: bpy.data.objects.remove(obj,do_unlink=True)
before_pixels,after_pixels=rendered_pixels
if not before_pixels or len(before_pixels)!=len(after_pixels): raise RuntimeError('OPTIMIZATION_RENDER_COMPARISON_MISSING')
max_pixel_error=max(abs(a-b) for a,b in zip(before_pixels,after_pixels))
render_comparison={'method':'REIMPORTED_GLB_SAME_CAMERA_RGBA','before':'preview-master.png','after':'preview.png','maxPixelError':max_pixel_error,'sampleCount':len(after_pixels)}
if 'optimization' in application:
    application['optimization']['previewComparison']=render_comparison
else:
    application['visualComparison']=render_comparison
if max_pixel_error>1e-5: raise RuntimeError('LOSSLESS_OPTIMIZATION_CHANGED_RENDER')
(ARGS.output/'application.json').write_text(json.dumps(application,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

# 렌더: 이미지 기반 자산은 실제 GLB의 네 방향을 동일한 조명에서 추가 촬영한다.
# 이는 Blender 정적 증거이며 플랫폼 런타임 QA로 간주하지 않는다.
IMAGE_VIEW_OUTPUTS = []
if MODULE_PROVENANCE:
    old_camera = Vector(cam.location)
    existing = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(glb))
    imported = [obj for obj in bpy.data.objects if obj not in existing]
    try:
        for angle in (0, 90, 180, 270):
            radians = math.radians(angle)
            cam.location = target + Vector((1.8 * math.cos(radians), 1.8 * math.sin(radians), 1.20)) * max(BOUNDS_SIZE)
            cam.rotation_euler = (target - cam.location).to_track_quat('-Z', 'Y').to_euler()
            destination = ARGS.output / f'preview-angle-{angle:03d}.png'
            SCENE.render.filepath = str(destination)
            bpy.ops.render.render(write_still=True)
            if not destination.is_file() or destination.stat().st_size == 0:
                raise RuntimeError('IMAGE_TO_MESH_VIEW_RENDER_MISSING')
            IMAGE_VIEW_OUTPUTS.append(destination.name)
    finally:
        cam.location = old_camera
        cam.rotation_euler = (target - cam.location).to_track_quat('-Z', 'Y').to_euler()
        for obj in imported:
            bpy.data.objects.remove(obj, do_unlink=True)

# 영상: Blender로 실제 생성한 연속 프레임을 별도 FFmpeg 프로세스로 MP4로 인코딩한다.
# 영상과 NLA/키프레임은 모두 시각 연출이다. 게임 플랫폼의 런타임 애니 QA로 승격하지 않는다.
VIDEO_EXPORT = None
if ARGS.module in ('video','animation'):
    output_video=ARGS.output/'preview-motion.mp4'
    old_resolution=(SCENE.render.resolution_x,SCENE.render.resolution_y)
    old_frame=SCENE.frame_current
    old_camera=Vector(cam.location)
    existing=set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(glb))
    imported=[obj for obj in bpy.data.objects if obj not in existing]
    try:
        SCENE.render.resolution_x=320
        SCENE.render.resolution_y=320
        with tempfile.TemporaryDirectory(prefix='vibe-video-frames-') as video_work:
            frames_dir=Path(video_work)
            for idx in range(24):
                frame=idx+1
                SCENE.frame_set(frame)
                angle=(idx/24)*math.tau
                cam.location=target+Vector((2.0*math.cos(angle),2.0*math.sin(angle),1.3))*max(BOUNDS_SIZE)
                cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler()
                SCENE.render.filepath=str(frames_dir/f'frame-{idx:03d}.png')
                bpy.ops.render.render(write_still=True)
                if not Path(SCENE.render.filepath).is_file():
                    raise RuntimeError('VIDEO_BLENDER_FRAME_RENDER_MISSING')
            ffmpeg=os.environ.get('VIBE_FFMPEG_BINARY','ffmpeg')
            command=[ffmpeg,'-hide_banner','-loglevel','error','-nostdin','-y',
                     '-framerate','12','-i',str(frames_dir/'frame-%03d.png'),
                     '-frames:v','24','-c:v','mpeg4','-qscale:v','4',
                     '-pix_fmt','yuv420p','-movflags','+faststart',str(output_video)]
            try:
                subprocess.run(command,check=True,stdout=subprocess.DEVNULL,
                               stderr=subprocess.PIPE,timeout=45)
            except (OSError,subprocess.CalledProcessError,subprocess.TimeoutExpired) as exc:
                raise RuntimeError('VIDEO_FFMPEG_ENCODER_EXECUTION_FAILED') from exc
        if not output_video.is_file() or output_video.stat().st_size<1024:
            raise RuntimeError('VIDEO_FFMPEG_MP4_OUTPUT_MISSING')
        VIDEO_EXPORT={'source':'https://ffmpeg.org','license':'LGPL-2.1-or-later-or-GPL-depending-on-build',
            'path':'preview-motion.mp4','sha256':hashlib.sha256(output_video.read_bytes()).hexdigest(),
            'frames':24,'fps':12,'resolution':[320,320],
            'format':'MP4','codec':'MPEG4','sourceGlbSha256':hashlib.sha256(glb.read_bytes()).hexdigest(),
            'motionClips':MOTION_CLIPS,'actualFramesRendered':True,'runtimeVerified':False}
    finally:
        SCENE.render.resolution_x,SCENE.render.resolution_y=old_resolution
        SCENE.frame_set(old_frame)
        cam.location=old_camera
        cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler()
        for obj in imported:bpy.data.objects.remove(obj,do_unlink=True)

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
    'geometrySurface':geometry_surface,
    'triangleCount':sum(sum(len(face.vertices)-2 for face in obj.data.polygons) for obj in ASSET_OBJECTS),
    'uvLayersVerified':all(bool(obj.data.uv_layers) for obj in ASSET_OBJECTS),
    'materialApplicationFile':'application.json',
    'family':('CHARACTER' if MODULE_PROVENANCE and MODULE_PROVENANCE['kind']=='human' else 'ENVIRONMENT' if ARGS.profile in ('background','environment') else 'WEAPON' if ARGS.profile in ('item','weapon') else 'PROP'),
    'generator':'assets/native-authoring/build-game-visual.py',
    'sourceHash':source_hash,
    'artifactHash':artifact_hash,
    'previewHash':preview_hash,
    'license':IMAGE_PROVENANCE['sourceLicense'] if IMAGE_PROVENANCE else SOURCE_PROVENANCE['license'] if SOURCE_PROVENANCE else 'CC0' if MODULE_PROVENANCE and MODULE_PROVENANCE['kind']=='human' else 'project-original',
    'imageToMesh':IMAGE_PROVENANCE,
    'openSourceModule':MODULE_PROVENANCE,
    'sourceMesh':SOURCE_PROVENANCE,
    'multiViewPreview':IMAGE_VIEW_OUTPUTS,
    'videoExport':VIDEO_EXPORT,
    'motionClips':MOTION_CLIPS,
    'targetPlatforms':[ARGS.target.upper()],
    'runtimeVerificationState':'STATIC_BLENDER_QA_PASS_NATIVE_RUNTIME_PENDING',
    'productionVerified':False,
    'companyPromotionEligible':False,
    'meshObjectCount':len(ASSET_OBJECTS),
    'surfaceDistribution':physical_analysis,
    **({'optimization':application['optimization']} if 'optimization' in application else {}),
    'outputs':['asset.glb','master.glb','preview.png','preview-master.png','application.json','evidence.json',*IMAGE_VIEW_OUTPUTS,*(['preview-motion.mp4'] if VIDEO_EXPORT else [])]
}
(ARGS.output/'evidence.json').write_text(json.dumps(evidence,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('VIBE_NATIVE_GAME_ASSET='+ARGS.asset_id)
print('VIBE_NATIVE_GAME_ASSET_PROFILE='+ARGS.profile)
print('VIBE_NATIVE_GAME_ASSET_TARGET='+ARGS.target)
