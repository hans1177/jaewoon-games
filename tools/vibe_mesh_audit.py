# 파일명: tools/vibe_mesh_audit.py
# 캐릭터 .blend/.glb 의 메쉬·리그 품질을 숫자로 검사한다. (Blender 또는 pip bpy 필요)
# 사용: blender --background --python tools/vibe_mesh_audit.py -- --input hero.blend --output audit.json
# 판정은 tools/vibe-mesh-audit.mjs 가 한다. 이 파일은 측정만 한다.
import bpy, sys, json, argparse, math, re
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ap = argparse.ArgumentParser()
ap.add_argument('--input', required=True)
ap.add_argument('--output', required=True)
args = ap.parse_args(argv)

if args.input.lower().endswith(('.glb', '.gltf')):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=args.input)
else:
    bpy.ops.wm.open_mainfile(filepath=args.input)

# 저장 시점의 포즈가 아니라 기본 자세(rest)에서 측정한다.
for _a in bpy.data.objects:
    if _a.type == 'ARMATURE':
        _a.data.pose_position = 'REST'
bpy.context.view_layer.update()
dg = bpy.context.evaluated_depsgraph_get()
meshes = [o for o in bpy.data.objects if o.type == 'MESH']
arms = [o for o in bpy.data.objects if o.type == 'ARMATURE']

# 기본 UV 구/큐브/원기둥이 만드는 정점·면 수 (bpy.ops.mesh.primitive_* 기본값과 흔한 변형)
PRIMITIVE_SIGNATURES = {(8, 6), (362, 384), (482, 512), (114, 112), (26, 24), (42, 40), (50, 48), (98, 96), (32, 34), (64, 66)}


def world_bbox(obj):
    ev = obj.evaluated_get(dg)
    me = ev.to_mesh()
    pts = [ev.matrix_world @ v.co for v in me.vertices]
    ev.to_mesh_clear()
    if not pts:
        return None
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    return lo, hi


def gap(a, b):
    # 두 상자 사이 최단 거리(겹치면 0)
    d = 0.0
    for i in range(3):
        d += max(0.0, a[0][i] - b[1][i], b[0][i] - a[1][i]) ** 2
    return math.sqrt(d)


rows, boxes = [], {}
for o in meshes:
    me = o.data
    bb = world_bbox(o)
    if bb:
        boxes[o.name] = bb
    n_groups = len(o.vertex_groups)
    unweighted = 0
    max_infl = 0
    off_norm = 0
    if n_groups:
        for v in me.vertices:
            ws = [g.weight for g in v.groups if g.weight > 1e-6]
            if not ws:
                unweighted += 1
                continue
            max_infl = max(max_infl, len(ws))
            if abs(sum(ws) - 1.0) > 0.02:
                off_norm += 1
    has_armature_mod = any(m.type == 'ARMATURE' for m in o.modifiers)
    bone_parented = o.parent is not None and o.parent.type == 'ARMATURE' and o.parent_type == 'BONE'
    rows.append({
        'name': o.name,
        'vertices': len(me.vertices),
        'faces': len(me.polygons),
        'vertexGroups': n_groups,
        'unweightedVertices': unweighted if n_groups else None,
        'maxInfluences': max_infl,
        'unnormalizedVertices': off_norm,
        'armatureModifier': has_armature_mod,
        'boneParented': bone_parented,
        'shapeKeys': len(me.shape_keys.key_blocks) if me.shape_keys else 0,
        'primitiveLike': (len(me.vertices), len(me.polygons)) in PRIMITIVE_SIGNATURES,
        'materials': len(me.materials),
        # 뼈에 묶이지 않은 메쉬: 애니메이션되지 않고 제자리에 남는다
        'orphan': not (has_armature_mod and n_groups) and not bone_parented,
    })

# 전체 키·바닥 접촉
all_lo = Vector((1e9, 1e9, 1e9))
all_hi = Vector((-1e9, -1e9, -1e9))
for lo, hi in boxes.values():
    for i in range(3):
        all_lo[i] = min(all_lo[i], lo[i])
        all_hi[i] = max(all_hi[i], hi[i])
height = max(1e-6, all_hi.z - all_lo.z)

# 떠 있는 부품: 가장 가까운 다른 메쉬와의 간격
for r in rows:
    others = [b for n, b in boxes.items() if n != r['name']]
    r['nearestGap'] = round(min((gap(boxes[r['name']], b) for b in others), default=0.0), 5) if r['name'] in boxes else None
    r['nearestGapRatio'] = round(r['nearestGap'] / height, 5) if r['nearestGap'] is not None else None

# 좌우 대칭: L_/R_ 쌍의 크기와 X 위치가 거울상인지
by_name = {r['name']: r for r in rows}
pairs = []
for n in list(boxes):
    if n.startswith('L_') and ('R_' + n[2:]) in boxes:
        a, b = boxes[n], boxes['R_' + n[2:]]
        da = a[1] - a[0]
        db = b[1] - b[0]
        size_err = max(abs(da[i] - db[i]) / max(da[i], db[i], 1e-6) for i in range(3))
        ca = (a[0] + a[1]) / 2
        cb = (b[0] + b[1]) / 2
        pos_err = abs(ca.x + cb.x) / height  # 중심 X가 서로 반대여야 함 (몸 중심이 x=0 이라고 가정)
        z_err = abs(ca.z - cb.z) / height
        pairs.append({'pair': [n, 'R_' + n[2:]], 'sizeErr': round(size_err, 4), 'posErr': round(pos_err, 4), 'zErr': round(z_err, 4)})

# [실제 모션 채널 검사] 클립 이름만으로 동작 품질을 통과시키지 않는다.
# 구형 F-curve와 신형 Layer/Channelbag 모두 원본 키프레임을 읽기만 한다.
# 이 검사는 정적 곡선 구조 증거이며 엔진 런타임 재생/충돌 성공은 아니다.
acts = []
rig_bones = {bone.name for arm in arms for bone in arm.data.bones}
for action in bpy.data.actions:
    fr = action.frame_range
    curves = []
    try:
        curves = list(getattr(action, 'fcurves', []))
    except (AttributeError, TypeError):
        pass
    if not curves:
        try:
            for layer in getattr(action, 'layers', []):
                for strip in layer.strips:
                    if hasattr(strip, 'channelbags'):
                        for bag in strip.channelbags:
                            curves.extend(list(bag.fcurves))
                    elif hasattr(strip, 'channelbag'):
                        for slot in getattr(action, 'slots', []):
                            bag = strip.channelbag(slot, ensure=False)
                            if bag:
                                curves.extend(list(bag.fcurves))
        except (AttributeError, TypeError, RuntimeError):
            curves = []
    all_keys = bone_curves = valid_bone_curves = moving_bone_curves = invalid_curves = 0
    for curve in curves:
        try:
            keys = list(curve.keyframe_points)
            values = [float(k.co[1]) for k in keys]
            positions = [float(k.co[0]) for k in keys]
            if any(not math.isfinite(x) for x in values + positions):
                invalid_curves += 1
                continue
            all_keys += len(keys)
            target = re.search(r'pose\.bones\["([^"]+)"\]', str(curve.data_path))
            if not target:
                continue
            bone_curves += 1
            if target.group(1) in rig_bones:
                valid_bone_curves += 1
                if len(values) >= 2 and max(values) - min(values) > 1e-4:
                    moving_bone_curves += 1
        except (AttributeError, TypeError, ValueError, OverflowError):
            invalid_curves += 1
    acts.append({
        'name': action.name,
        'frames': [int(fr[0]), int(fr[1])],
        'curvesInspected': bool(curves),
        'curveCount': len(curves),
        'keyframeCount': all_keys,
        'boneCurves': bone_curves,
        'validBoneCurves': valid_bone_curves,
        'movingBoneCurves': moving_bone_curves,
        'invalidCurves': invalid_curves,
    })

result = {
    'input': args.input,
    'bpyVersion': bpy.app.version_string,
    'armatures': [{'name': a.name, 'bones': len(a.data.bones), 'roots': sum(1 for b in a.data.bones if b.parent is None),
                   'boneNames': [b.name for b in a.data.bones]} for a in arms],
    'height': round(height, 4),
    'groundOffsetRatio': round(all_lo.z / height, 4),
    'meshes': rows,
    'symmetry': pairs,
    'actions': acts,
    'triangles': sum(sum(max(1, len(p.vertices) - 2) for p in o.data.polygons) for o in meshes),
}
with open(args.output, 'w', encoding='utf8') as f:
    json.dump(result, f, ensure_ascii=False, indent=1)
print('VIBE_MESH_AUDIT_MEASURED', len(rows))
