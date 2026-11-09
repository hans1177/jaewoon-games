# 파일명: tools/vibe_variation_gym.py
# CC0 부모 3D 모델(OBJ/GLB)을 변형 연산자로 바꿔 자식 GLB와 미리보기 PNG를 만든다. (Blender 또는 pip bpy)
# 사용: blender --background --python tools/vibe_variation_gym.py -- --jobs jobs.json --out build/gym
# jobs.json: [{"id":"bench-a__hue_shift__0","parent":"assets/.../bench_A.obj","op":"hue_shift","params":{"degrees":40}}]
# 새 도형을 만들지 않는다: 부모 메쉬를 바꾸거나(비율·모서리 다듬기) 재질을 바꾸거나(색) 부모를 복제해 외곽선 껍질을 입힌다.
# 판정·채점은 tools/vibe_object_score.py 와 tools/vibe-variation-gym.mjs 가 한다. 이 파일은 만들고 측정만 한다.
import bpy, sys, os, json, math, argparse
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ap = argparse.ArgumentParser()
ap.add_argument('--jobs', required=True)
ap.add_argument('--out', required=True)
args = ap.parse_args(argv)
os.makedirs(args.out, exist_ok=True)


def clear():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def import_parent(path):
    low = path.lower()
    before = set(bpy.context.scene.objects)
    if low.endswith('.obj'):
        bpy.ops.wm.obj_import(filepath=path)
    elif low.endswith(('.glb', '.gltf')):
        bpy.ops.import_scene.gltf(filepath=path)
    else:
        raise RuntimeError('UNSUPPORTED_PARENT_FORMAT ' + path)
    return [o for o in bpy.context.scene.objects if o not in before and o.type == 'MESH']


def join(objs):
    for o in bpy.context.scene.objects:
        o.select_set(False)
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    if len(objs) > 1:
        bpy.ops.object.join()
    return bpy.context.view_layer.objects.active


def bbox(obj):
    pts = [obj.matrix_world @ Vector(c) for c in obj.bound_box]
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    return lo, hi


def normalize(obj):
    """키 1.0, 바닥 z=0, 가운데 정렬(변형 전후 비교를 공정하게)."""
    lo, hi = bbox(obj)
    h = max(1e-6, max(hi.z - lo.z, (hi.x - lo.x), (hi.y - lo.y)))
    obj.scale = obj.scale * (1.0 / h)
    bpy.context.view_layer.update()
    lo, hi = bbox(obj)
    obj.location.x -= (lo.x + hi.x) / 2
    obj.location.y -= (lo.y + hi.y) / 2
    obj.location.z -= lo.z
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)


def principled(mat):
    mat.use_nodes = True
    for n in mat.node_tree.nodes:
        if n.type == 'BSDF_PRINCIPLED':
            return n
    return None


def adjust_rgb(rgb, hue_shift_turns=0.0, sat=1.0, val=1.0, contrast=0.0):
    import colorsys
    r, g, b = rgb
    h, sv, v = colorsys.rgb_to_hsv(max(0, min(1, r)), max(0, min(1, g)), max(0, min(1, b)))
    h = (h + hue_shift_turns) % 1.0
    sv = max(0.0, min(1.0, sv * sat))
    v = max(0.0, min(1.0, v * val))
    r, g, b = colorsys.hsv_to_rgb(h, sv, v)
    if abs(contrast) > 1e-6:
        k = 1.0 + contrast
        r, g, b = [max(0.0, min(1.0, (c - 0.5) * k + 0.5)) for c in (r, g, b)]
    return (r, g, b)


def color_adjust(obj, hue_shift_turns=0.0, sat=1.0, val=1.0, contrast=0.0):
    """재질 기본색을 직접 바꾼다(단색 재질). 텍스처가 연결된 재질은 노드를 끼운다."""
    for slot in obj.material_slots:
        mat = slot.material
        if not mat:
            continue
        bsdf = principled(mat)
        if not bsdf:
            continue
        inp = bsdf.inputs['Base Color']
        if inp.is_linked:
            nt = mat.node_tree
            hs = nt.nodes.new('ShaderNodeHueSaturation')
            hs.inputs['Hue'].default_value = (0.5 + hue_shift_turns) % 1.0
            hs.inputs['Saturation'].default_value = sat
            hs.inputs['Value'].default_value = val
            nt.links.new(inp.links[0].from_socket, hs.inputs['Color'])
            nt.links.new(hs.outputs['Color'], inp)
        else:
            c = adjust_rgb(tuple(inp.default_value[:3]), hue_shift_turns, sat, val, contrast)
            inp.default_value = (c[0], c[1], c[2], 1.0)


def sync_preview_colors(obj):
    """미리보기 엔진이 보는 표시색을 재질 기본색과 맞춘다."""
    for slot in obj.material_slots:
        mat = slot.material
        if not mat:
            continue
        bsdf = principled(mat)
        if bsdf and not bsdf.inputs['Base Color'].is_linked:
            mat.diffuse_color = tuple(bsdf.inputs['Base Color'].default_value)


def op_hue_shift(obj, p):
    color_adjust(obj, hue_shift_turns=float(p.get('degrees', 40)) / 360.0, sat=float(p.get('saturation', 1.0)))


def op_saturate_contrast(obj, p):
    color_adjust(obj, sat=float(p.get('saturation', 1.25)), val=float(p.get('value', 1.0)), contrast=float(p.get('contrast', 0.2)))


def op_proportion(obj, p):
    obj.scale = (float(p.get('x', 1.0)), float(p.get('y', 1.0)), float(p.get('z', 1.0)))
    bpy.ops.object.transform_apply(scale=True)
    normalize(obj)


def op_bevel(obj, p):
    m = obj.modifiers.new('GymBevel', 'BEVEL')
    m.width = float(p.get('width', 0.012))
    m.segments = int(p.get('segments', 2))
    m.limit_method = 'ANGLE'
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=m.name)
    bpy.ops.object.shade_smooth()
    wn = obj.modifiers.new('GymNormals', 'WEIGHTED_NORMAL')
    bpy.ops.object.modifier_apply(modifier=wn.name)


def op_outline(obj, p):
    """부모를 복제해 뒤집힌 얇은 껍질에 어두운 재질을 입힌다(만화풍 외곽선)."""
    shell = obj.copy()
    shell.data = obj.data.copy()
    bpy.context.scene.collection.objects.link(shell)
    shell.name = obj.name + '_outline'
    mat = bpy.data.materials.new('GymOutline')
    mat.use_nodes = True
    b = principled(mat)
    b.inputs['Base Color'].default_value = tuple(p.get('color', (0.04, 0.03, 0.05))) + (1.0,)
    b.inputs['Roughness'].default_value = 1.0
    mat.use_backface_culling = True
    mat.diffuse_color = tuple(p.get('color', (0.04, 0.03, 0.05))) + (1.0,)
    shell.data.materials.clear()
    shell.data.materials.append(mat)
    sol = shell.modifiers.new('GymSolid', 'SOLIDIFY')
    sol.thickness = abs(float(p.get('thickness', 0.014)))
    sol.use_flip_normals = True
    sol.offset = 1.0
    bpy.context.view_layer.objects.active = shell
    bpy.ops.object.modifier_apply(modifier=sol.name)
    return shell


ATTACH = {}


def world_tree(obj):
    from mathutils.bvhtree import BVHTree
    dg2 = bpy.context.evaluated_depsgraph_get()
    ev = obj.evaluated_get(dg2)
    me = ev.to_mesh()
    verts = [ev.matrix_world @ v.co for v in me.vertices]
    polys = [tuple(pl.vertices) for pl in me.polygons]
    tree = BVHTree.FromPolygons(verts, polys)
    ev.to_mesh_clear()
    return tree, verts


def settle(host, part, direction, step=0.01, limit=0.8):
    """부품을 direction 방향으로 조금씩 옮겨 호스트와 겹치는 순간 멈춘다(떠 있지 않게). 닿았는지 돌려준다."""
    for i in range(int(limit / step)):
        bpy.context.view_layer.update()
        ht, _ = world_tree(host)
        pt, _ = world_tree(part)
        if ht.overlap(pt):
            part.location += direction * 0.015  # 살짝 파묻어 단단히 붙여 보이게
            bpy.context.view_layer.update()
            return True
        part.location += direction * step
    return False


def attach_gap(host, part):
    """부품 정점에서 호스트 표면까지 최단 거리(키 1.0 기준)."""
    ht, _ = world_tree(host)
    _, pv = world_tree(part)
    best = 1e9
    for v in pv:
        hit = ht.find_nearest(v)
        if hit and hit[0] is not None:
            best = min(best, (hit[0] - v).length)
    return best


def op_kitbash(obj, p):
    """승인된 CC0 부품 하나를 부모에 붙인다(위 또는 옆). 새 도형이 아니라 CC0 두 개의 조합이다. 실제로 닿을 때까지 내려놓는다."""
    parts = import_parent(p['part'])
    if not parts:
        raise RuntimeError('NO_MESH_IN_PART')
    part = join(parts)
    normalize(part)
    s = float(p.get('scale', 0.3))
    part.scale = (s, s, s)
    bpy.context.view_layer.objects.active = part
    part.select_set(True)
    bpy.ops.object.transform_apply(scale=True)
    hl, hh = bbox(obj)
    pl, ph = bbox(part)
    if p.get('mode', 'top') == 'top':
        part.location += Vector(((hl.x + hh.x) / 2 - (pl.x + ph.x) / 2, (hl.y + hh.y) / 2 - (pl.y + ph.y) / 2, hh.z - pl.z + 0.05))
        direction = Vector((0, 0, -1))
    else:
        part.location += Vector((hh.x - pl.x + 0.1, (hl.y + hh.y) / 2 - (pl.y + ph.y) / 2, hl.z - pl.z))
        direction = Vector((-1, 0, 0))
    touched = settle(obj, part, direction)
    gap = attach_gap(obj, part) if not touched else 0.0
    ATTACH.update({'touched': touched, 'gap': round(gap, 4)})
    for o in bpy.context.scene.objects:
        o.select_set(False)
    obj.select_set(True)
    part.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.join()
    normalize(bpy.context.view_layer.objects.active)


# ---- 확장 연산: 새 도형을 만들지 않고 부모 표면을 바꾼다(표면 질감·재질 구역·패널) ----
def _new_mat(name, rgb):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    b = principled(mat)
    b.inputs['Base Color'].default_value = (rgb[0], rgb[1], rgb[2], 1.0)
    b.inputs['Roughness'].default_value = 0.9
    mat.diffuse_color = (rgb[0], rgb[1], rgb[2], 1.0)
    return mat


def _assign_faces(obj, predicate, mat):
    me = obj.data
    me.materials.append(mat)
    idx = len(me.materials) - 1
    n = 0
    for poly in me.polygons:
        if predicate(poly):
            poly.material_index = idx
            n += 1
    return n


def op_moss(obj, p):
    """위쪽을 보는 면 일부에 이끼 재질을 입힌다(오래된 느낌)."""
    import random
    rnd = random.Random(int(p.get('seed', 1)))
    thr = float(p.get('threshold', 0.7))
    cover = float(p.get('coverage', 0.7))
    n = _assign_faces(obj, lambda f: f.normal.z > thr and rnd.random() < cover, _new_mat('GymMoss', (0.18, 0.36, 0.12)))
    if n == 0:
        raise RuntimeError('NO_UP_FACE_FOR_MOSS')


def op_wear(obj, p):
    """바닥 가까운 면에 흙때 재질을 입힌다(닳은 느낌)."""
    lo, hi = bbox(obj)
    limit = lo.z + (hi.z - lo.z) * float(p.get('height', 0.2))
    vs = obj.data.vertices
    n = _assign_faces(obj, lambda f: sum(vs[i].co.z for i in f.vertices) / len(f.vertices) <= limit, _new_mat('GymDirt', (0.17, 0.12, 0.09)))
    if n == 0:
        raise RuntimeError('NO_LOW_FACE_FOR_WEAR')


def op_noise_displace(obj, p):
    """표면을 구름 노이즈로 살짝 울퉁불퉁하게(돌·나무 결). 삼각형이 너무 많으면 세분하지 않는다."""
    bpy.context.view_layer.objects.active = obj
    if sum(max(1, len(q.vertices) - 2) for q in obj.data.polygons) < 12000:
        sub = obj.modifiers.new('GymSub', 'SUBSURF')
        sub.subdivision_type = 'SIMPLE'
        sub.levels = 1
        bpy.ops.object.modifier_apply(modifier=sub.name)
    tex = bpy.data.textures.new('GymNoise', 'CLOUDS')
    tex.noise_scale = float(p.get('scale', 0.25))
    d = obj.modifiers.new('GymDisp', 'DISPLACE')
    d.texture = tex
    d.strength = float(p.get('strength', 0.03))
    d.mid_level = 0.5
    bpy.ops.object.modifier_apply(modifier=d.name)
    bpy.ops.object.shade_smooth()


def op_inset_panel(obj, p):
    """위쪽 큰 면을 안으로 들여 패널 홈을 판다(입체감)."""
    import bmesh
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bm.faces.ensure_lookup_table()
    faces = [f for f in bm.faces if f.normal.z > 0.7 and f.calc_area() > 0.004]
    if not faces:
        bm.free()
        raise RuntimeError('NO_TOP_FACE_FOR_PANEL')
    bmesh.ops.inset_region(bm, faces=faces, thickness=float(p.get('thickness', 0.03)), depth=-abs(float(p.get('depth', 0.02))), use_even_offset=True)
    bm.to_mesh(obj.data)
    bm.free()
    obj.data.update()


OPS = {'moss': op_moss, 'wear': op_wear, 'noise_displace': op_noise_displace, 'inset_panel': op_inset_panel, 'kitbash': op_kitbash, 'hue_shift': op_hue_shift, 'saturate_contrast': op_saturate_contrast, 'proportion': op_proportion,
       'bevel': op_bevel, 'outline': op_outline, 'identity': lambda o, p: None}


def setup_render(res=320):
    sc = bpy.context.scene
    sc.render.engine = 'BLENDER_WORKBENCH'
    sc.render.film_transparent = True
    sc.render.resolution_x = sc.render.resolution_y = res
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode = 'RGBA'
    sc.display.shading.light = 'STUDIO'
    sc.display.shading.color_type = 'MATERIAL'
    sc.display.shading.show_cavity = False
    sc.display.shading.show_backface_culling = True
    sc.display.shading.show_shadows = True
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
    sc.collection.objects.link(cam)
    sc.camera = cam
    cam.data.type = 'ORTHO'
    cam.data.ortho_scale = 1.55
    cam.location = (1.6, -1.6, 1.35)
    d = Vector((0, 0, 0.45)) - cam.location
    cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()  # 3/4 시점


def measure(objs):
    tris = 0
    mats = set()
    lo = Vector((1e9,) * 3)
    hi = Vector((-1e9,) * 3)
    for o in objs:
        me = o.data
        tris += sum(max(1, len(p.vertices) - 2) for p in me.polygons)
        mats.update(m.name for m in me.materials if m)
        l, h = bbox(o)
        for i in range(3):
            lo[i] = min(lo[i], l[i])
            hi[i] = max(hi[i], h[i])
    return {'triangles': tris, 'materials': len(mats), 'size': [round(hi[i] - lo[i], 4) for i in range(3)]}


results = []
for job in json.load(open(args.jobs, encoding='utf8')):
    rec = {'id': job['id'], 'op': job['op'], 'params': job.get('params', {}), 'parent': job['parent'], 'ok': False}
    try:
        clear()
        parts = import_parent(job['parent'])
        if not parts:
            raise RuntimeError('NO_MESH_IN_PARENT')
        obj = join(parts)
        normalize(obj)
        ATTACH.clear()
        extra = OPS[job['op']](obj, job.get('params', {}))
        objs = [obj] + ([extra] if extra is not None and hasattr(extra, 'type') else [])
        rec.update(measure(objs))
        if ATTACH:
            rec['attach'] = dict(ATTACH)
        for o in objs:
            sync_preview_colors(o)
        setup_render()
        png = os.path.join(args.out, job['id'] + '.png')
        bpy.context.scene.render.filepath = png
        bpy.ops.render.render(write_still=True)
        glb = os.path.join(args.out, job['id'] + '.glb')
        bpy.ops.export_scene.gltf(filepath=glb, export_format='GLB')
        rec.update({'png': png, 'glb': glb, 'ok': True})
    except Exception as e:
        rec['error'] = str(e)[:300]
    results.append(rec)
json.dump(results, open(os.path.join(args.out, 'results.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)
print('VIBE_VARIATION_GYM_DONE', sum(1 for r in results if r['ok']), '/', len(results))
