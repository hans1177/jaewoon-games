# 파일명: tools/vibe_normal_bake.py
# CC0 모델(고폴리)을 가볍게 줄이고(저폴리 복사본), 줄이며 잃은 요철을 노멀맵으로 구워 입힌다. (Blender 또는 pip bpy, Cycles CPU)
# 사용: blender --background --python tools/vibe_normal_bake.py -- --parent model.obj --out build/bake --ratio 0.25 --size 256
# 결과: <out>/<name>_low.glb, <out>/<name>_normal.png, <out>/bake.json (삼각형 수, 노멀맵 변화량). 새 도형을 만들지 않는다: 부모를 줄인 것이다.
import bpy, sys, os, json, math, argparse
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ap = argparse.ArgumentParser()
ap.add_argument('--parent', required=True)
ap.add_argument('--out', required=True)
ap.add_argument('--ratio', type=float, default=0.25)
ap.add_argument('--size', type=int, default=256)
args = ap.parse_args(argv)
os.makedirs(args.out, exist_ok=True)


def tris(o):
    return sum(max(1, len(p.vertices) - 2) for p in o.data.polygons)


def import_parent(path):
    ext = os.path.splitext(path)[1].lower()
    before = set(bpy.data.objects)
    if ext == '.obj':
        bpy.ops.wm.obj_import(filepath=path)
    elif ext in ('.glb', '.gltf'):
        bpy.ops.import_scene.gltf(filepath=path)
    else:
        raise RuntimeError('UNSUPPORTED_PARENT_FORMAT')
    return [o for o in bpy.data.objects if o not in before and o.type == 'MESH']


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    parts = import_parent(args.parent)
    if not parts:
        raise RuntimeError('NO_MESH_IN_PARENT')
    bpy.ops.object.select_all(action='DESELECT')
    for o in parts:
        o.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    if len(parts) > 1:
        bpy.ops.object.join()
    high = bpy.context.view_layer.objects.active
    high.name = 'high'
    name = os.path.splitext(os.path.basename(args.parent))[0]
    rec = {'parent': os.path.basename(args.parent), 'trianglesHigh': tris(high), 'ok': False}
    # 저폴리 복사본: 줄이기 + 펼치기
    low = high.copy()
    low.data = high.data.copy()
    low.name = 'low'
    bpy.context.scene.collection.objects.link(low)
    bpy.ops.object.select_all(action='DESELECT')
    low.select_set(True)
    bpy.context.view_layer.objects.active = low
    dec = low.modifiers.new('GymDecimate', 'DECIMATE')
    dec.ratio = max(0.02, min(1.0, args.ratio))
    bpy.ops.object.modifier_apply(modifier=dec.name)
    rec['trianglesLow'] = tris(low)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.02)
    bpy.ops.object.mode_set(mode='OBJECT')
    # 굽기 대상 이미지와 재질
    img = bpy.data.images.new('normal', args.size, args.size, alpha=False)
    img.colorspace_settings.name = 'Non-Color'
    mat = bpy.data.materials.new('baked')
    mat.use_nodes = True
    nt = mat.node_tree
    tex = nt.nodes.new('ShaderNodeTexImage')
    tex.image = img
    nt.nodes.active = tex
    low.data.materials.clear()
    low.data.materials.append(mat)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = 1
    sc.render.bake.use_selected_to_active = True
    sc.render.bake.cage_extrusion = 0.03
    sc.render.bake.margin = 4
    bpy.ops.object.select_all(action='DESELECT')
    high.select_set(True)
    low.select_set(True)
    bpy.context.view_layer.objects.active = low
    bpy.ops.object.bake(type='NORMAL')
    png = os.path.join(args.out, name + '_normal.png')
    img.filepath_raw = png
    img.file_format = 'PNG'
    img.save()
    # 노멀맵 변화량: 평평한 파란색(0.5,0.5,1)에서 얼마나 벗어났나(0이면 구워진 게 없다)
    px = list(img.pixels)
    n = len(px) // 4
    dev = 0.0
    for i in range(0, n * 4, 4):
        dev += abs(px[i] - 0.5) + abs(px[i + 1] - 0.5)
    rec['normalDeviation'] = round(dev / max(1, n), 4)
    # 노멀맵을 재질에 연결해 GLB로 내보낸다(저폴리 + 노멀맵)
    b = nt.nodes['Principled BSDF']
    nm = nt.nodes.new('ShaderNodeNormalMap')
    nt.links.new(tex.outputs['Color'], nm.inputs['Color'])
    nt.links.new(nm.outputs['Normal'], b.inputs['Normal'])
    bpy.data.objects.remove(high, do_unlink=True)
    glb = os.path.join(args.out, name + '_low.glb')
    bpy.ops.export_scene.gltf(filepath=glb, export_format='GLB')
    rec.update({'png': png, 'glb': glb, 'ok': True})
    json.dump(rec, open(os.path.join(args.out, 'bake.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)
    print('VIBE_NORMAL_BAKE_DONE', rec['trianglesHigh'], '->', rec['trianglesLow'], rec['normalDeviation'])


main()
