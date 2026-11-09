# 파일명: tools/vibe_light_search.py
# CC0 모델 하나를 여러 조명 조합(해 높이·방향·색온도·세기·주변광)으로 렌더한다. (Blender 또는 pip bpy, Cycles CPU 저해상도)
# 사용: blender --background --python tools/vibe_light_search.py -- --parent model.obj --jobs lights.json --out build/light-search
# lights.json: [{"id":"c01","elevation":35,"azimuth":120,"sun_color":[1,0.9,0.8],"sun_strength":3,"ambient":[0.3,0.3,0.4],"ambient_strength":0.6}]
# 채점은 tools/vibe_aesthetic_score.py 가 한다. 이 파일은 그리기만 한다. 새 도형은 만들지 않는다(바닥판 하나만 둔다).
import bpy, sys, os, json, math, argparse
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ap = argparse.ArgumentParser()
ap.add_argument('--parent', required=True)
ap.add_argument('--jobs', required=True)
ap.add_argument('--out', required=True)
ap.add_argument('--res', type=int, default=192)
ap.add_argument('--samples', type=int, default=8)
args = ap.parse_args(argv)
os.makedirs(args.out, exist_ok=True)


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


def build_scene(parts):
    bpy.ops.object.select_all(action='DESELECT')
    for o in parts:
        o.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    if len(parts) > 1:
        bpy.ops.object.join()
    obj = bpy.context.view_layer.objects.active
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    lo = Vector((1e9,) * 3)
    hi = Vector((-1e9,) * 3)
    for v in obj.bound_box:
        w = obj.matrix_world @ Vector(v)
        for i in range(3):
            lo[i] = min(lo[i], w[i])
            hi[i] = max(hi[i], w[i])
    size = max(hi[i] - lo[i] for i in range(3)) or 1.0
    obj.scale = (1.0 / size,) * 3
    bpy.ops.object.transform_apply(scale=True)
    lo = Vector((1e9,) * 3)
    hi = Vector((-1e9,) * 3)
    for v in obj.bound_box:
        for i in range(3):
            lo[i] = min(lo[i], v[i])
            hi[i] = max(hi[i], v[i])
    obj.location = (-(lo.x + hi.x) / 2, -(lo.y + hi.y) / 2, -lo.z)
    bpy.ops.object.transform_apply(location=True)
    return obj, hi.z - lo.z


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    parts = import_parent(args.parent)
    if not parts:
        raise RuntimeError('NO_MESH_IN_PARENT')
    obj, height = build_scene(parts)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = args.samples
    sc.cycles.use_denoising = False
    sc.render.resolution_x = sc.render.resolution_y = args.res
    sc.render.image_settings.file_format = 'PNG'
    sc.view_settings.view_transform = 'Standard'
    # 바닥판(풀색 중간 회색): 그림자가 떨어질 곳
    bpy.ops.mesh.primitive_plane_add(size=6)
    ground = bpy.context.active_object
    gm = bpy.data.materials.new('ground')
    gm.use_nodes = True
    gm.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.32, 0.36, 0.27, 1)
    ground.data.materials.append(gm)
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
    sc.collection.objects.link(cam)
    sc.camera = cam
    cam.data.type = 'ORTHO'
    cam.data.ortho_scale = 1.55
    cam.location = (1.6, -1.6, 1.35)
    cam.rotation_euler = (Vector((0, 0, 0.45)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
    sun_data = bpy.data.lights.new('sun', 'SUN')
    sun = bpy.data.objects.new('sun', sun_data)
    sc.collection.objects.link(sun)
    world = bpy.data.worlds.new('w')
    world.use_nodes = True
    sc.world = world
    bg = world.node_tree.nodes['Background']
    done = 0
    for job in json.load(open(args.jobs, encoding='utf8')):
        el = math.radians(float(job['elevation']))
        az = math.radians(float(job['azimuth']))
        sun.rotation_euler = (math.pi / 2 - el, 0, az)
        sun_data.energy = float(job['sun_strength'])
        sun_data.color = tuple(job['sun_color'])
        sun_data.angle = math.radians(float(job.get('softness', 4)))
        bg.inputs['Color'].default_value = tuple(job['ambient']) + (1,)
        bg.inputs['Strength'].default_value = float(job['ambient_strength'])
        sc.render.filepath = os.path.join(args.out, job['id'] + '.png')
        bpy.ops.render.render(write_still=True)
        done += 1
    print('VIBE_LIGHT_SEARCH_DONE', done)


main()
