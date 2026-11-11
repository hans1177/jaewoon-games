# 파일명: tools/vibe_mesh_audit.py
# 캐릭터 .blend/.glb 의 메쉬·리그 품질을 숫자로 검사한다. (Blender 또는 pip bpy 필요)
# 사용: blender --background --python tools/vibe_mesh_audit.py -- --input hero.blend --output audit.json
# 판정은 tools/vibe-mesh-audit.mjs 가 한다. 이 파일은 측정만 한다.
import bpy, sys, json, argparse, math, re, struct
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ap = argparse.ArgumentParser()
ap.add_argument('--input', required=True)
ap.add_argument('--output', required=True)
ap.add_argument('--candidate-output', default=None)
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
        # [바닥 원인 증거] 오브젝트별 월드 공간 최저점. 품질 통과 판정에는 사용하지 않는다.
        'minZ': round(bb[0].z, 5) if bb else None,
        'maxZ': round(bb[1].z, 5) if bb else None,
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

# [접지 증거] 전체 최저점과 실제 리그에 연결된 메쉬 최저점을 분리한다.
# 보조/독립 메쉬가 바닥을 끌어내렸는지 측정할 뿐, 불합격 기준은 절대 완화하지 않는다.
all_bottoms = sorted((box[0].z, name) for name, box in boxes.items())
bound_names = {row['name'] for row in rows if not row['orphan']}
bound_bottoms = sorted((z, name) for z, name in all_bottoms if name in bound_names)
lowest = all_bottoms[0] if all_bottoms else None
bound_lowest = bound_bottoms[0] if bound_bottoms else None
ground_evidence = {
    'lowestMesh': lowest[1] if lowest else None,
    'lowestMeshMinZ': round(lowest[0], 5) if lowest else None,
    'lowestBoundMesh': bound_lowest[1] if bound_lowest else None,
    'lowestBoundMeshMinZ': round(bound_lowest[0], 5) if bound_lowest else None,
    'boundGroundOffsetRatio': round(bound_lowest[0] / height, 4) if bound_lowest else None,
    'orphanMeshesBelowBoundGround': [
        name for z, name in all_bottoms
        if name not in bound_names and bound_lowest and z < bound_lowest[0] - 0.03 * height
    ][:16],
}

# 떠 있는 부품: 가장 가까운 다른 메쉬와의 간격
for r in rows:
    neighbors = sorted(
        (gap(boxes[r['name']], box), name)
        for name, box in boxes.items() if name != r['name']
    ) if r['name'] in boxes else []
    r['nearestGap'] = round(neighbors[0][0], 5) if neighbors else (0.0 if r['name'] in boxes else None)
    r['nearestMesh'] = neighbors[0][1] if neighbors else None
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
    'groundEvidence': ground_evidence,
    'meshes': rows,
    'symmetry': pairs,
    'actions': acts,
    'triangles': sum(sum(max(1, len(p.vertices) - 2) for p in o.data.polygons) for o in meshes),
}
# [격리 수리 연습] 원본은 읽기만 한다. 메쉬 한 개가 독립된 바닥 외부 보조체임이
# 계측으로 입증된 경우에만 별도 GLB 후보를 만들고, 실제 합격은 재검사에 맡긴다.
# Icosphere라는 이름만으로 임의 삭제하지 않는다. 게임 적용/승격 권한은 없다.
if args.candidate_output:
    candidate = {'attempted': True, 'created': False, 'reason': 'UNSAFE_OR_UNPROVEN_STRAY_MESH',
                 'originalPreserved': True, 'nativeRuntimeVerified': False,
                 'gameApplied': False, 'productionPromotionAllowed': False}
    orphan_rows = [r for r in rows if r['orphan']]
    suspected = orphan_rows[0] if len(orphan_rows) == 1 else None
    eligible = (
        len(arms) == 1 and suspected is not None and
        suspected['name'] == 'Icosphere' and lowest and
        lowest[1] == suspected['name'] and bound_lowest is not None and
        suspected['name'] in ground_evidence['orphanMeshesBelowBoundGround'] and
        len(result['actions']) > 0
    )
    if eligible:
        orphan_obj = bpy.data.objects.get(suspected['name'])
        eligible = (orphan_obj is not None and orphan_obj.type == 'MESH' and
                    not orphan_obj.vertex_groups and not orphan_obj.modifiers and
                    not orphan_obj.data.shape_keys and orphan_obj.parent is None)
    if eligible:
        from pathlib import Path
        target = Path(args.candidate_output).resolve()
        origin = Path(args.input).resolve()
        if origin.suffix.lower() != '.glb' or target == origin or target.suffix.lower() != '.glb' or not target.parent.is_dir() or target.exists():
            candidate['reason'] = 'INVALID_OR_EXISTING_CANDIDATE_PATH'
        else:
            try:
                # [원본 애니메이션 보존] Blender GLB 재수출은 클립을 잃을 수 있다.
                # 검증된 독립 노드 하나만 GLB 장면 그래프에서 제외한다.
                # BIN 데이터, 애니메이션 sampler/channel, 스킨 가중치는 재작성하지 않는다.
                blob = origin.read_bytes()
                if len(blob) < 28 or len(blob) > 256 * 1024 * 1024:
                    raise ValueError('INVALID_GLB_SIZE')
                magic, version, total = struct.unpack_from('<4sII', blob)
                if magic != b'glTF' or version != 2 or total != len(blob):
                    raise ValueError('INVALID_GLB_HEADER')
                chunks = []
                pos = 12
                while pos < len(blob):
                    if pos + 8 > len(blob):
                        raise ValueError('INVALID_GLB_CHUNK_HEADER')
                    size, kind = struct.unpack_from('<I4s', blob, pos)
                    pos += 8
                    if size % 4 or pos + size > len(blob):
                        raise ValueError('INVALID_GLB_CHUNK_SIZE')
                    chunks.append((kind, blob[pos:pos + size]))
                    pos += size
                if len(chunks) != 2 or chunks[0][0] != b'JSON' or chunks[1][0] != b'BIN\x00':
                    raise ValueError('UNSUPPORTED_GLB_CHUNKS')
                doc = json.loads(chunks[0][1].decode('utf8').rstrip(' \x00'))
                safe_extensions = {'KHR_materials_unlit', 'KHR_texture_transform',
                                   'KHR_materials_pbrSpecularGlossiness', 'KHR_materials_emissive_strength',
                                   'KHR_materials_specular', 'KHR_materials_clearcoat'}
                if set(doc.get('extensionsUsed', [])) - safe_extensions:
                    raise ValueError('UNKNOWN_NODE_INDEX_EXTENSION')
                nodes = doc.get('nodes', [])
                matches = [i for i, n in enumerate(nodes) if n.get('name') == suspected['name']]
                if len(matches) != 1:
                    raise ValueError('HELPER_GLB_NODE_NOT_UNIQUE')
                victim = matches[0]
                node = nodes[victim]
                if 'mesh' not in node or 'skin' in node or node.get('children'):
                    raise ValueError('HELPER_IS_SKINNED_OR_PARENT')
                if sum(n.get('mesh') == node['mesh'] for n in nodes) != 1:
                    raise ValueError('HELPER_MESH_SHARED')
                if any(victim in n.get('children', []) for n in nodes):
                    raise ValueError('HELPER_HAS_PARENT_NODE')
                scenes = doc.get('scenes', [])
                if sum(scene.get('nodes', []).count(victim) for scene in scenes) != 1:
                    raise ValueError('HELPER_NOT_SINGLE_SCENE_ROOT')
                skins = doc.get('skins', [])
                if any(victim in skin.get('joints', []) or skin.get('skeleton') == victim for skin in skins):
                    raise ValueError('HELPER_REFERENCED_BY_SKIN')
                animations = doc.get('animations', [])
                if not animations or not sum(len(anim.get('channels', [])) for anim in animations):
                    raise ValueError('NO_ORIGINAL_ANIMATION_CHANNELS')
                for anim in animations:
                    for channel in anim.get('channels', []):
                        index = channel.get('target', {}).get('node')
                        if not isinstance(index, int) or index == victim:
                            raise ValueError('HELPER_OR_UNSUPPORTED_ANIMATION_TARGET')
                if abs(bound_lowest[0] / height) > 0.03:
                    raise ValueError('BOUND_GROUND_NOT_NEAR_ZERO')
                def remap(index):
                    return index - 1 if index > victim else index
                # [연결 정합성] node 배열을 하나 줄이고 glTF 표준 인덱스를 전부 갱신한다.
                # 모션 채널의 타임라인·샘플·바이너리는 그대로이므로 재압축이나 새 보간이 없다.
                doc['nodes'] = [n for i, n in enumerate(nodes) if i != victim]
                for scene in scenes:
                    scene['nodes'] = [remap(i) for i in scene.get('nodes', []) if i != victim]
                for n in doc['nodes']:
                    if 'children' in n:
                        n['children'] = [remap(i) for i in n['children']]
                for skin in skins:
                    skin['joints'] = [remap(i) for i in skin.get('joints', [])]
                    if 'skeleton' in skin:
                        skin['skeleton'] = remap(skin['skeleton'])
                for anim in animations:
                    for channel in anim['channels']:
                        channel['target']['node'] = remap(channel['target']['node'])
                new_json = json.dumps(doc, ensure_ascii=False, separators=(',', ':')).encode('utf8')
                new_json += b' ' * (-len(new_json) % 4)
                binary_chunk = struct.pack('<I4s', len(chunks[1][1]), chunks[1][0]) + chunks[1][1]
                size = 12 + 8 + len(new_json) + len(binary_chunk)
                with target.open('xb') as output_file:
                    output_file.write(struct.pack('<4sII', b'glTF', 2, size))
                    output_file.write(struct.pack('<I4s', len(new_json), b'JSON'))
                    output_file.write(new_json)
                    output_file.write(binary_chunk)
                candidate.update({'created': True, 'reason': 'ISOLATED_GLB_NODE_REMOVED_WITH_MOTION_BYTES_PRESERVED',
                                  'removedMesh': suspected['name'], 'originShiftZ': 0.0,
                                  'animationChannelsKept': sum(len(anim['channels']) for anim in animations)})
            except (RuntimeError, ValueError, TypeError, KeyError, OSError, struct.error) as exc:
                candidate['reason'] = 'GLB_SAFE_EDIT_REJECTED:' + str(exc)[:64]
                try:
                    target.unlink(missing_ok=True)
                except OSError:
                    pass
    result['candidate'] = candidate
with open(args.output, 'w', encoding='utf8') as f:
    json.dump(result, f, ensure_ascii=False, indent=1)
print('VIBE_MESH_AUDIT_MEASURED', len(rows))
