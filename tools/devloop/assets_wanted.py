#!/usr/bin/env python3
# 파일명: tools/devloop/assets_wanted.py
# 임포트
import csv
import hashlib
import io
import math
import tarfile
import zipfile
import json
import os
import re
import struct
import subprocess
import sys
import tempfile

# 메인: 기존 부족 자산 장부 생성 책임 보존
root = sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith("--") else "roblox-games/mare-essentia"
verify_goods = "--verify-goods" in sys.argv
here = os.path.dirname(os.path.abspath(__file__))
seed_path = os.path.join(root, "assets-wanted.seed.json")
seed = []
if os.path.isfile(seed_path):
    with open(seed_path, encoding="utf-8") as f:
        seed = json.load(f)
# 게임별 기존 검사기를 호출한다. 정적 참조 결과는 실제 화면 배치 증거가 아니다.
check_path = os.path.join(root, "tools", "devloop", "asset_check.py")
check = subprocess.run([sys.executable, check_path, root],
                       capture_output=True, text=True)
missing = sorted(set(re.findall(r"^\s+(\S+): (\w+/[\w\-\.]+)$", check.stdout, re.M)))
counts = re.search(r"사용 (\d+)종 / 등록 (\d+)종 / 미사용 (\d+)종", check.stdout)
registry_audit = {
    "state": ("STATIC_SCAN_OK" if counts and check.returncode == 0 and not missing
              else "MISSING_REFERENCES" if counts and check.returncode == 1 and missing
              else "SCAN_ERROR"),
    "scope": "STATIC_LITERAL_REFERENCES_ONLY",
    "nativeRuntimeVerified": False,
}
if registry_audit["state"] == "SCAN_ERROR":
    print("MARE_ASSET_REFERENCE_SCAN_ERROR", check.returncode, file=sys.stderr)
    counts = None
inbox = os.path.join(root, "assets", "inbox")
pending = sorted(os.path.join(d, f) for d, _, files in os.walk(inbox)
                 for f in files if not f.endswith((".md", ".license.json"))) if os.path.isdir(inbox) else []

# 유틸: 원본의 형식·크기만 확인한다. 실제 64px 시각 가독성이나 Studio 렌더를 통과했다고 주장하지 않는다.
def read_json(file):
    with open(file, encoding="utf-8") as handle:
        return json.load(handle)


def png_dimensions(file):
    with open(file, "rb") as f:
        data = f.read(33)
    if (len(data) != 33 or data[:8] != b"\x89PNG\r\n\x1a\n"
            or data[12:16] != b"IHDR" or struct.unpack(">I", data[8:12])[0] != 13):
        return None
    width, height = struct.unpack(">II", data[16:24])
    return [width, height] if 64 <= width <= 2048 and 64 <= height <= 2048 else None


# 메인: 새 그림을 만들지 않고 승인된 교역품 이미지만 기존 등록기와 대조한다.
def trade_goods_practice():
    goal = next((row for row in seed if row.get("id") == "trade-goods-icons-missing"), {})
    goods, excluded = goal.get("goods", []), goal.get("blockedGoods", [])
    if not goods:
        return None, [], None
    if (len(goods) != len(set(goods)) or set(goods) & set(excluded) or
            any(not re.fullmatch("[a-z][a-z0-9_]*", name) for name in goods + excluded)):
        raise RuntimeError("TRADE_GOODS_TARGETS_INVALID")
    policy = read_json("company-learning/platform-release-roadmap.json")
    safety = policy["livingMotionVisualQualityContract"]["assetAdaptation"]["contentSafety"]
    if safety.get("enabled") is not True or safety.get("autonomousVibeReview", {}).get("enabled") is not True:
        raise RuntimeError("TRADE_GOODS_SAFETY_NOT_ENABLED")
    forbidden_paths = set()
    forbidden_hashes = set()
    forbidden_ids = set()
    for row in safety["blockedAssets"]:
        forbidden_paths.update(row.get("sourcePaths") or [])
        forbidden_hashes.update(row.get("sha256") or [])
        forbidden_ids.update(str(v) for v in row.get("assetIds") or [])
    approved = read_json(os.path.join(root, "assets", "APPROVED_IMAGES.json"))["approved"]
    registered = read_json(os.path.join(root, "assets-registered.json"))["assets"]
    ports = os.path.join(root, "src", "ReplicatedStorage", "Shared", "Ports.luau")
    with open(ports, encoding="utf-8") as f:
        text = f.read()
    # [교역품 범위] Ports.luau에는 항구·국가도 동일한 id 패턴이 있어 Goods 섹션만 분리한다.
    parts = text.split("local Goods:", 1)
    if len(parts) != 2 or "\nlocal Ports:" not in parts[1]:
        raise RuntimeError("TRADE_GOODS_SOURCE_SECTION_UNVERIFIED")
    goods_source = parts[1].split("\nlocal Ports:", 1)[0]
    game_goods = set(re.findall(r'^\s*([a-z][a-z0-9_]*)\s*=\s*\{\s*id\s*=\s*"\1"',
                            goods_source, re.M))
    rows, errors = [], []
    for good in goods + excluded:
        key = "Goods/" + good
        file = os.path.join(root, "assets", "goods", good + ".png")
        original_sha = None
        dimensions = None
        if os.path.isfile(file):
            with open(file, "rb") as f:
                original_sha = hashlib.file_digest(f, "sha256").hexdigest()
            dimensions = png_dimensions(file)
        row = registered.get(key) or {}
        id = str(row.get("assetId") or "")
        approved_source = original_sha is not None and approved.get(key) == original_sha
        prohibited = (good in excluded or file in forbidden_paths or original_sha in forbidden_hashes
                      or bool(id and id in forbidden_ids))
        in_game = good in game_goods
        if prohibited:
            state = "BLOCKED_BY_POLICY"
            if id and good in excluded:
                errors.append(key + ":PROHIBITED_GOOD_REGISTERED")
        elif not in_game:
            state = "NOT_IN_GAME"
            errors.append(key + ":NOT_IN_GAME")
        elif original_sha is None:
            state = "MISSING_SOURCE"
        elif dimensions is None:
            state = "INVALID_PNG_OR_SIZE"
            errors.append(key + ":INVALID_PNG_OR_SIZE")
        elif not approved_source:
            state = "UNAPPROVED_SOURCE"
            if id:
                errors.append(key + ":REGISTERED_SOURCE_APPROVAL_MISMATCH")
        elif id:
            if (not re.fullmatch("[1-9][0-9]*", id) or row.get("source") != file
                    or row.get("license") not in ("CC0-1.0", "PROJECT_ORIGINAL_ART")):
                state = "REGISTERED_METADATA_MISMATCH"
                errors.append(key + ":REGISTERED_METADATA_MISMATCH")
            else:
                state = "REGISTERED_RIGHTS_CONFIRMED" if row.get("usePermissionGranted") is True else "PERMISSION_PENDING"
        else:
            state = "READY_TO_REGISTER"
        rows.append({
            "id": good, "state": state,
            "assetId": id if state == "REGISTERED_RIGHTS_CONFIRMED" else None,
            "sourceSha256": original_sha if approved_source and not prohibited else None,
            "dimensions": dimensions if not prohibited else None,
            "sourceFingerprintRecorded": bool(original_sha and row.get("sourceSha256") == original_sha),
            "approved": bool(approved_source and not prohibited),
            "nativeStudioDisplayVerified": False,
            "gamePublishedFromPractice": False,
        })
    stats = {
        "targetCount": len(goods), "excludedCount": len(excluded),
        "registeredWithRights": sum(r["state"] == "REGISTERED_RIGHTS_CONFIRMED" for r in rows),
        "readyToRegister": sum(r["state"] == "READY_TO_REGISTER" for r in rows),
        "permissionPending": sum(r["state"] == "PERMISSION_PENDING" for r in rows),
        "blocked": sum(r["state"] == "BLOCKED_BY_POLICY" for r in rows),
        "invalid": len(errors),
    }
    # [교역품 3D 실물 연습] 기존 게임 상품 전체를 기존 모델·권한·원본 GLB와 비교한다.
    # 외형이 같은 상품에만 직접 연결한다. 미완성은 후보/부족으로 두고 게시나 QA PASS로 승격하지 않는다.
    client_file = os.path.join(root, "src", "StarterPlayer", "Game.client.luau")
    with open(client_file, encoding="utf-8") as f:
        client = f.read()
    mapping_match = re.search(
        r'for goodsId, cargoAsset in \{(.*?)\}\s*do\s*if AssetIds\["Cargo/"',
        client, re.S)
    if not mapping_match or 'for goodsId in PortData.Goods do' not in client:
        raise RuntimeError("TRADE_GOODS_3D_EXISTING_BINDING_MISSING")
    source_mappings = dict(re.findall(r'\b([a-z][a-z0-9_]*)\s*=\s*"([a-z][a-z0-9_-]*)"',
                                      mapping_match.group(1)))
    if len(source_mappings) != len(re.findall(r'\b[a-z][a-z0-9_]*\s*=\s*"[a-z][a-z0-9_-]*"',
                                             mapping_match.group(1))):
        raise RuntimeError("TRADE_GOODS_3D_DUPLICATE_MAPPING")
    # [보호] 기존 승인된 원료 아이콘 및 제한 표현은 3D 모델 자동 교체에서 제외한다.
    visual_restricted = set(excluded) | {"wine", "rum"}
    three_d = []
    for good in sorted(game_goods):
        model_name = good if "Cargo/" + good in registered else source_mappings.get(good)
        key = "Cargo/" + model_name if model_name else None
        asset = registered.get(key) if key else None
        good_image = registered.get("Goods/" + good)
        source = asset.get("source", "") if isinstance(asset, dict) else ""
        source_path = os.path.normpath(source) if isinstance(source, str) else ""
        expected_prefix = os.path.normpath(os.path.join(root, "assets", "cargo")) + os.sep
        verified_source = (bool(source_path) and source_path.startswith(expected_prefix)
                           and os.path.isfile(source_path) and source_path.endswith(".glb"))
        source_hash = None
        glb_valid = False
        if verified_source:
            with open(source_path, "rb") as f:
                header = f.read(12)
                source_hash = hashlib.sha256(header + f.read()).hexdigest()
            glb_valid = (len(header) == 12 and header[:4] == b"glTF"
                         and struct.unpack("<I", header[4:8])[0] == 2)
        registry_valid = (bool(asset) and bool(re.fullmatch(r"[1-9][0-9]*", str(asset.get("assetId") or "")))
                          and asset.get("assetType") == "Model"
                          and asset.get("license") in ("CC0-1.0", "PROJECT_ORIGINAL_ART")
                          and (asset.get("license") != "PROJECT_ORIGINAL_ART"
                               or asset.get("sourceSha256") == source_hash)
                          and asset.get("usePermissionGranted") is True)
        goods_rights = (bool(good_image) and good_image.get("assetType") == "Image"
                        and good_image.get("usePermissionGranted") is True)
        if good in visual_restricted:
            state = "VISUAL_POLICY_RESTRICTED"
        elif not model_name:
            state = "MISSING_EXACT_MODEL"
        elif not registry_valid or not verified_source or not glb_valid or not goods_rights:
            state = "MODEL_OR_RIGHTS_UNVERIFIED"
            errors.append("Cargo/" + model_name + ":3D_SOURCE_OR_RIGHTS_UNVERIFIED")
        else:
            state = "REGISTERED_SOURCE_CHECKED_RUNTIME_PENDING"
        three_d.append({
            "id": good, "state": state, "cargoAsset": model_name if state == "REGISTERED_SOURCE_CHECKED_RUNTIME_PENDING" else None,
            "assetId": str(asset["assetId"]) if state == "REGISTERED_SOURCE_CHECKED_RUNTIME_PENDING" else None,
            "source": source if state == "REGISTERED_SOURCE_CHECKED_RUNTIME_PENDING" else None,
            "sourceSha256": source_hash if state == "REGISTERED_SOURCE_CHECKED_RUNTIME_PENDING" else None,
            "license": asset.get("license") if state == "REGISTERED_SOURCE_CHECKED_RUNTIME_PENDING" else None,
            "nativeRuntimeVerified": False, "visualQualityPass": False,
        })
    counts_3d = {
        "targetCount": len(game_goods), "visualRestricted": sum(x["state"] == "VISUAL_POLICY_RESTRICTED" for x in three_d),
        "registeredSourceChecked": sum(x["state"] == "REGISTERED_SOURCE_CHECKED_RUNTIME_PENDING" for x in three_d),
        "missingExactModel": sum(x["state"] == "MISSING_EXACT_MODEL" for x in three_d),
        "unverified": sum(x["state"] == "MODEL_OR_RIGHTS_UNVERIFIED" for x in three_d),
        "runtimeVerified": 0,
    }
    three_d_audit = {
        "authority": "EXISTING_MARE_ASSET_PIPELINE_PRACTICE_ONLY",
        "method": "EXACT_GOOD_ROLE_REGISTERED_CC0_OR_PROJECT_ORIGINAL_GLB_SOURCE_HASH_UNIVERSE_RIGHTS",
        "autoUpdateTrigger": "EXISTING_ASSET_REGISTER_WORKFLOW_ON_APPROVED_SOURCE_CHANGE",
        "nativeRuntimeVerified": False, "automaticRuntimePromotionAllowed": False,
        "noUnconditionalSelfRequeue": True, "noNewPipeline": True,
        "stats": counts_3d, "goods": three_d,
    }
    return {
        "authority": "EXISTING_MARE_ASSET_PIPELINE_PRACTICE_ONLY",
        "method": "PNG_HEADER_MIN_64PX_APPROVAL_SHA256_LICENSE_REGISTERED_RIGHTS",
        "visualLegibilityMeasured": False, "nativeRuntimeVerified": False,
        "runtimePromotionAllowed": False, "stats": stats, "goods": rows,
    }, errors, three_d_audit



# [원본 내부 검사] 압축을 디스크에 풀지 않고 제한된 멤버만 읽는다.
def inspect_animal_archive(data, filename, target):
    model_extensions = {".glb", ".gltf", ".fbx", ".blend", ".obj"}
    max_member = 5_000_000
    max_total = 30_000_000
    candidates = []
    def safe_name(name):
        parts = name.replace("\\", "/").split("/")
        return (not name.startswith(("/", "\\")) and not re.match(r"^[A-Za-z]:", name)
                and "\\" not in name and all(p not in ("..", "") for p in parts))
    def member(name, size, read):
        if not safe_name(name) or not 0 <= size <= max_member:
            raise ValueError("SOURCE_ARCHIVE_UNSAFE_MEMBER")
        ext = os.path.splitext(name)[1].lower()
        stem = os.path.splitext(os.path.basename(name))[0].lower().replace("-", "_").replace(" ", "_")
        # 파일명은 검수 후보 선별에만 사용하고 종 일치나 시각 승인 증거로 사용하지 않는다.
        if ext not in model_extensions or stem not in (target, target + "_model", target + "_animated"):
            return
        body = read()
        if len(body) != size or not body:
            raise ValueError("SOURCE_ARCHIVE_MEMBER_LENGTH")
        if ext == ".glb":
            if (len(body) < 20 or body[:4] != b"glTF"
                    or struct.unpack("<II", body[4:12]) != (2, len(body))
                    or body[16:20] != b"JSON"
                    or not 0 < struct.unpack("<I", body[12:16])[0] <= len(body)-20):
                raise ValueError("SOURCE_ARCHIVE_INVALID_GLB")
        elif ext == ".blend" and not (body.startswith(b"BLENDER") or body.startswith(b"\x1f\x8b") or body.startswith(b"\x28\xb5\x2f\xfd")):
            raise ValueError("SOURCE_ARCHIVE_INVALID_BLEND")
        elif ext == ".gltf":
            doc = json.loads(body)
            if doc.get("asset", {}).get("version") != "2.0":
                raise ValueError("SOURCE_ARCHIVE_INVALID_GLTF")
        candidates.append({"member": name, "format": ext[1:].upper(),
                           "bytes": len(body), "sha256": hashlib.sha256(body).hexdigest()})
    if filename.endswith(".zip"):
        with zipfile.ZipFile(io.BytesIO(data)) as archive:
            items = archive.infolist()
            if len(items) > 512 or sum(i.file_size for i in items) > max_total:
                raise ValueError("SOURCE_ARCHIVE_EXPANSION_LIMIT")
            for info in items:
                mode = (info.external_attr >> 16) & 0o170000
                if mode not in (0, 0o100000, 0o040000) or info.flag_bits & 1:
                    raise ValueError("SOURCE_ARCHIVE_UNSAFE_MEMBER")
                if info.is_dir():
                    if not safe_name(info.filename.rstrip("/")):
                        raise ValueError("SOURCE_ARCHIVE_UNSAFE_MEMBER")
                    continue
                member(info.filename, info.file_size, lambda i=info: archive.read(i))
    else:
        with tarfile.open(fileobj=io.BytesIO(data), mode="r|gz") as archive:
            total = count = 0
            for info in archive:
                count += 1
                total += info.size
                if count > 512 or total > max_total:
                    raise ValueError("SOURCE_ARCHIVE_EXPANSION_LIMIT")
                if not safe_name(info.name.rstrip("/")) or not (info.isdir() or info.isfile()):
                    raise ValueError("SOURCE_ARCHIVE_UNSAFE_MEMBER")
                if info.isfile():
                    member(info.name, info.size, lambda i=info: archive.extractfile(i).read(max_member + 1))
    return sorted(candidates, key=lambda row: row["member"])


# [보관 GLB 원본 품질] 실제 위치 및 인덱스 데이터, 모바일 삼각면·관절 예산을 대조한다.
# 시각 검수·종 판정·로블록스 권한은 이 기하 검사와 별개다.
def inspect_held_animal_glb(data):
    if (len(data) < 28 or data[:4] != b"glTF"
            or struct.unpack_from("<II", data, 4) != (2, len(data))
            or data[16:20] != b"JSON"):
        raise ValueError("GLB_HEADER")
    end = 20 + struct.unpack_from("<I", data, 12)[0]
    if end < 24 or end + 8 > len(data) or data[end+4:end+8] != b"BIN\x00":
        raise ValueError("GLB_CHUNKS")
    if end + 8 + struct.unpack_from("<I", data, end)[0] != len(data):
        raise ValueError("GLB_BINARY_LENGTH")
    model = json.loads(data[20:end])
    binary = memoryview(data)[end+8:]
    buffers = model.get("buffers", [])
    if (model.get("asset", {}).get("version") != "2.0" or len(buffers) != 1
            or buffers[0].get("uri") or not 0 < buffers[0]["byteLength"] <= len(binary)
            or any(image.get("uri") for image in model.get("images", []))):
        raise ValueError("GLB_EXTERNAL_OR_INVALID_BUFFER")

    def accessor(index, allowed_types, shape):
        if type(index) is not int or not 0 <= index < len(model["accessors"]):
            raise ValueError("GLB_ACCESSOR_INDEX")
        a = model["accessors"][index]
        view_index = a["bufferView"]
        if type(view_index) is not int or not 0 <= view_index < len(model["bufferViews"]):
            raise ValueError("GLB_BUFFER_VIEW_INDEX")
        v = model["bufferViews"][view_index]
        typ = a["componentType"]
        count = a["count"]
        if (a.get("sparse") is not None or typ not in allowed_types or a["type"] != shape
                or type(count) is not int or not 0 < count <= 100000 or v.get("buffer") != 0):
            raise ValueError("GLB_UNSUPPORTED_ACCESSOR")
        fmt, component = {5121: ("B", 1), 5123: ("H", 2), 5125: ("I", 4), 5126: ("f", 4)}[typ]
        width = component * (3 if shape == "VEC3" else 1)
        stride = v.get("byteStride", width)
        offset = a.get("byteOffset", 0)
        start = v.get("byteOffset", 0)
        length = v["byteLength"]
        if (any(type(x) is not int for x in (start, length, stride, offset))
                or min(start, offset) < 0 or length <= 0 or stride < width
                or start + length > buffers[0]["byteLength"]
                or offset + (count-1)*stride + width > length):
            raise ValueError("GLB_ACCESSOR_RANGE")
        return count, (struct.unpack_from("<" + fmt*(3 if shape == "VEC3" else 1),
                                           binary, start+offset+i*stride) for i in range(count))

    triangles = inspected_vertices = 0
    minimum = [math.inf]*3
    maximum = [-math.inf]*3
    for mesh in model["meshes"]:
        for primitive in mesh["primitives"]:
            if primitive.get("mode", 4) != 4:
                raise ValueError("GLB_NON_TRIANGLE")
            vertices, positions = accessor(primitive["attributes"]["POSITION"], {5126}, "VEC3")
            inspected_vertices += vertices
            if inspected_vertices > 1_000_000:
                raise ValueError("GLB_GEOMETRY_INSPECTION_LIMIT")
            for pos in positions:
                if not all(math.isfinite(x) for x in pos):
                    raise ValueError("GLB_NONFINITE_POSITION")
                for axis, x in enumerate(pos):
                    minimum[axis] = min(minimum[axis], x)
                    maximum[axis] = max(maximum[axis], x)
            if "indices" in primitive:
                count, indices = accessor(primitive["indices"], {5121, 5123, 5125}, "SCALAR")
                if any(i[0] >= vertices for i in indices):
                    raise ValueError("GLB_INDEX_RANGE")
            else:
                count = vertices
            if count % 3:
                raise ValueError("GLB_TRIANGLE_LAYOUT")
            triangles += count//3
            if triangles > 1_000_000:
                raise ValueError("GLB_GEOMETRY_INSPECTION_LIMIT")
    if triangles <= 0 or any(not math.isfinite(x) for x in minimum+maximum) or not any(b>a for a,b in zip(minimum,maximum)):
        raise ValueError("GLB_EMPTY_GEOMETRY")
    skins = model.get("skins", [])
    joint_count = len({joint for skin in skins for joint in skin["joints"]})
    if any(type(joint) is not int or not 0 <= joint < len(model.get("nodes", []))
           for skin in skins for joint in skin["joints"]):
        raise ValueError("GLB_INVALID_JOINT")
    animations = model.get("animations", [])
    for clip in animations:
        channels = clip.get("channels", [])
        samplers = clip.get("samplers", [])
        if not channels or not samplers:
            raise ValueError("GLB_EMPTY_ANIMATION")
        for channel in channels:
            target = channel.get("target", {})
            index, node = channel.get("sampler"), target.get("node")
            if (type(index) is not int or not 0 <= index < len(samplers)
                    or type(node) is not int or not 0 <= node < len(model.get("nodes", []))):
                raise ValueError("GLB_ANIMATION_CHANNEL")
        for sampler in samplers:
            if any(type(sampler.get(key)) is not int or not 0 <= sampler[key] < len(model["accessors"])
                   for key in ("input", "output")):
                raise ValueError("GLB_ANIMATION_SAMPLER")
    return {"triangles": triangles, "jointCount": joint_count,
            "animationCount": len(animations),
            "mobileGeometryWithinBudget": 1000 <= triangles <= 3000 and joint_count <= 50,
            "speciesVerified": False, "visualQualityApproved": False}


# [동물 원본 충원] 회사에 이미 확보된 CC0 원본부터 가져온다. 복제 저장하지 않고
# 기존 부족 장부에 실제 원본 경로·해시·검수 대기 상태를 기록한다.
# [원본 복구] 메인에 남아 있는 출처·라이선스·정확한 원본 해시가 모두 맞는 경우만
# 고정 공개 GitHub 원본을 재확보한다. 리다이렉트/인증/임의 외부 호스트/새로운 승인 금지.
def restore_pinned_animal_glb(proof, source):
    import http.client
    pinned = re.fullmatch(
        r"https://(?:raw\.githubusercontent\.com/([\w.-]+)/([\w.-]+)/|"
        r"github\.com/([\w.-]+)/([\w.-]+)/blob/)([a-f0-9]{40})/([\w./%()-]+\.glb)",
        str(proof.get("source", "")))
    if not pinned or os.path.lexists(source):
        raise ValueError("HELD_SOURCE_RESTORE_NOT_PINNED_OR_EXISTS")
    owner, repo = (pinned[1], pinned[2]) if pinned[1] else (pinned[3], pinned[4])
    if any(part in ("", ".", "..") for part in pinned[6].split("/")) or "%" in pinned[6]:
        raise ValueError("HELD_SOURCE_RESTORE_PATH")
    size = proof["bytes"]
    if (proof.get("license") != "CC0-1.0" or proof.get("commercialUseAllowed") is not True
            or type(size) is not int or not 0 < size <= 5_000_000
            or not re.fullmatch(r"[a-f0-9]{64}", str(proof.get("sourceSha256", "")))
            or proof.get("originalSha256") != proof["sourceSha256"]
            or not re.fullmatch(r"[a-f0-9]{40}", str(proof.get("pinnedBlobSha", "")))):
        raise ValueError("HELD_SOURCE_RESTORE_PROVENANCE")
    conn = http.client.HTTPSConnection("raw.githubusercontent.com", timeout=25)
    try:
        conn.request("GET", "/" + "/".join((owner, repo, pinned[5], pinned[6])),
                     headers={"Accept-Encoding": "identity", "User-Agent": "Mare-CC0-source-recovery"})
        response = conn.getresponse()
        if response.status != 200:
            raise ValueError("HELD_SOURCE_RESTORE_HTTP")
        data = response.read(size + 1)
    except http.client.HTTPException as error:
        raise ValueError("HELD_SOURCE_RESTORE_HTTP") from error
    finally:
        conn.close()
    if (len(data) != size or hashlib.sha256(data).hexdigest() != proof["sourceSha256"]
            or hashlib.sha1(("blob %d\0" % size).encode() + data).hexdigest() != proof["pinnedBlobSha"]):
        raise ValueError("HELD_SOURCE_RESTORE_HASH")
    geometry = inspect_held_animal_glb(data)
    if proof.get("triangles") != geometry["triangles"]:
        raise ValueError("HELD_SOURCE_RESTORE_GEOMETRY")
    # x 모드: 기존 파일 또는 동시 복구 결과를 덮지 않는다.
    with open(source, "xb") as handle:
        handle.write(data)
    return data


# [제작자 공개 무료 목록] 고정 호스트의 공개 CC0 목록과 실제 원본만 읽는다.
# 원본 외부 버전은 고정되지 않았으므로 관찰 후보로만 보관하고 등록 승인은 생성하지 않는다.
def read_gobkit_free(path, limit, scene=False):
    import http.client
    pack = r"[A-Za-z0-9_-]+" if scene else r"(?:animal[A-Za-z0-9]*|birds[A-Za-z0-9]*)"
    if path != "/api/free" and not re.fullmatch(r"/freebies/" + pack + r"/[A-Za-z0-9_-]+\.glb", path):
        raise ValueError("PUBLISHER_SOURCE_PATH")
    conn = http.client.HTTPSConnection("gobkit.com", timeout=25)
    try:
        conn.request("GET", path, headers={"Accept-Encoding": "identity", "User-Agent": "Mare-CC0-source-discovery"})
        response = conn.getresponse()
        if response.status != 200:
            raise ValueError("PUBLISHER_SOURCE_HTTP")
        data = response.read(limit+1)
    except http.client.HTTPException as error:
        raise ValueError("PUBLISHER_SOURCE_HTTP") from error
    finally:
        conn.close()
    if not 0 < len(data) <= limit:
        raise ValueError("PUBLISHER_SOURCE_SIZE")
    return data


def gobkit_animal_sources(manifest, targets, scene=False):
    if manifest.get("schemaVersion") != 2 or not isinstance(manifest.get("packs"), list):
        raise ValueError("PUBLISHER_MANIFEST_SCHEMA")
    listed = set(manifest.get("glbs", []))
    selected = {}
    pack_path = r"[A-Za-z0-9_-]+" if scene else r"(?:animal[A-Za-z0-9]*|birds[A-Za-z0-9]*)"
    target_names = {}
    for target in sorted(targets):
        key = target.replace("-", "_") if scene else target.replace("_", "").replace("-", "")
        target_names.setdefault(key, []).append(target)
    for pack in manifest["packs"]:
        for model in pack.get("models", []):
            name = model.get("name", "")
            url = model.get("url", "")
            license_text = model.get("license", "")
            if (not isinstance(name,str) or not re.fullmatch(r"[A-Za-z0-9 _-]{1,80}",name)
                    or not isinstance(url,str)
                    or not re.fullmatch(r"https://gobkit\.com/freebies/" + pack_path + r"/[A-Za-z0-9_-]+\.glb",url)
                    or url not in listed or model.get("format") != "glb"
                    or license_text != "CC0 1.0 (public domain) — free for any use, commercial or personal, no attribution required."):
                continue
            normalized = (re.sub(r"[ -]+", "_", name.lower()) if scene
                          else re.sub(r"[^a-z0-9]", "", name.lower()))
            # 여러 자산 키로 해석되는 제작자 이름은 후보로 고르지 않는다.
            matches = target_names.get(normalized, [])
            if len(matches) != 1:
                continue
            target = matches[0]
            entry = {"name":name,"url":url,"license":license_text}
            if target not in selected or url < selected[target]["url"]:
                selected[target] = entry
    return selected


# [항구·전투 원본] 제작 지시서의 정확한 자산 키만 확보 대상으로 사용한다.
def scene_source_targets(registry, progress=None, battle_progress=None):
    docs = os.path.join(root, "docs")
    ports_dir = os.path.join(docs, "ports")
    with open(os.path.join(ports_dir, "README.md"), encoding="utf-8") as handle:
        ports = sorted(set(re.findall(r"^\| \[[^\n]+?\]\(([a-z0-9_]+)\.md\)", handle.read(), re.M)))
    targets = {}
    port_assets = {port: {} for port in ports}
    for port in ports:
        with open(os.path.join(ports_dir, port + ".md"), encoding="utf-8") as handle:
            brief = handle.read()
        pattern = r"^#### " + chr(96) + "(" + re.escape(port) + r"_[a-z0-9_]+)" + chr(96) + r"[^\n]*\n(?:- [^\n]*?· ([1-5])단계\b)?"
        for asset, tier in re.findall(pattern, brief, re.M):
            targets[asset] = "Town"
            port_assets[port][asset] = int(tier) if tier else None
    with open(os.path.join(docs, "port_asset_prompts.csv"), encoding="utf-8", newline="") as handle:
        for row in csv.DictReader(handle):
            port, asset = row["port_id"], row["asset_id"]
            if port in port_assets and re.fullmatch(re.escape(port) + r"_[a-z0-9_]+", asset):
                targets[asset] = "Town"
                if port_assets[port].get(asset) is None and row.get("tier") in ("1", "2", "3", "4", "5"):
                    port_assets[port][asset] = int(row["tier"])
                else:
                    port_assets[port].setdefault(asset, None)
    battle_docs = os.path.join(docs, "battle_backdrops")
    battle_csv = os.path.join(battle_docs, "backdrop_prompts.csv")
    naval_assets, field_assets = {}, {}
    with open(battle_csv, encoding="utf-8", newline="") as handle:
        for row in csv.DictReader(handle):
            category, asset = row["category"], row["asset_id"]
            if re.fullmatch(r"[a-z0-9_]+", asset):
                if category in ("naval-near", "naval-mid", "naval-far"):
                    targets[asset] = "Naval"
                    layer = category.removeprefix("naval-")
                    match = re.fullmatch(r"sea_([a-z0-9_]+)_" + layer, asset)
                    if match:
                        naval_assets.setdefault(match.group(1), {})[layer] = asset
                elif category == "field":
                    targets[asset] = "Terrain"
                    match = re.fullmatch(r"field_([a-z0-9_]+)", asset)
                    if match:
                        field_assets[match.group(1)] = asset
    # 주민 외형은 실제 조립 코드와 미등록 자산 참조에서만 가져온다.
    shared = os.path.join(root, "src", "ReplicatedStorage", "Shared")
    with open(os.path.join(shared, "Pose.luau"), encoding="utf-8") as handle:
        for asset in re.findall(r'"((?:hair|outfit|acc)_[a-z0-9_]+)"', handle.read()):
            targets.setdefault(asset, "People")
    for _, asset_key in missing:
        kind, _, asset = asset_key.partition("/")
        if kind in ("People", "Outfits", "Monsters", "Animals") and re.fullmatch(r"[a-z0-9_-]+", asset):
            targets.setdefault(asset, kind)

    # 공용 R15 동작은 재수집하지 않는다. 직업별 작업 동작과 동물별 리그·클립만 찾는다.
    with open(os.path.join(docs, "residents", "jobs.md"), encoding="utf-8") as handle:
        for job in re.findall(r"^\| [^\n|]+? \(`([a-z0-9_]+)`\)", handle.read(), re.M):
            targets.setdefault(job + "_work", "Motion")
    for name in ("rig_f", "rig_m"):
        if not os.path.isfile(os.path.join(root, "assets", "people", name + ".glb")):
            targets.setdefault(name, "Rig")

    animal_goal = next((row for row in seed if row.get("id") == "mare-farm-animals"), {})
    species = set(animal_goal.get("missing", [])) | set(animal_goal.get("sourceReady", []))
    with open(os.path.join(docs, "discoveries", "MISSING.md"), encoding="utf-8") as handle:
        species.update(re.findall(r"^- (?:am|pac|zoo)_([a-z0-9_]+) ", handle.read(), re.M))
    species.update(key.split("/", 1)[1] for key in registry if key.startswith(("Animals/", "Monsters/")))
    for name in sorted(species):
        if not re.fullmatch(r"[a-z0-9_-]+", name):
            continue
        targets.setdefault(name + "_rig", "Rig")
        for action in ("idle", "idle_look", "walk", "run", "alert", "flee_start", "threat",
                       "attack", "hit", "death"):
            targets.setdefault(name + "_" + action, "Motion")
    def registered(asset, kind):
        row = registry.get(kind + "/" + asset, {})
        asset_id = str(row.get("assetId") or "")
        return (row.get("assetType") == "Model" and re.fullmatch(r"[1-9][0-9]*", asset_id) is not None
                and row.get("usePermissionGranted") is True)
    outstanding = {asset: kind for asset, kind in targets.items() if not registered(asset, kind)}
    if progress is not None:
        rows = []
        for port in ports:
            stages = {str(i): {"planned": 0, "registeredModelRights": 0} for i in range(1, 6)}
            stages["unspecified"] = {"planned": 0, "registeredModelRights": 0}
            held = 0
            missing_assets = []
            for asset, tier in sorted(port_assets[port].items(), key=lambda pair: (pair[1] or 6, pair[0])):
                bucket = stages[str(tier) if tier else "unspecified"]
                bucket["planned"] += 1
                if registered(asset, "Town"):
                    bucket["registeredModelRights"] += 1
                    continue
                path = os.path.join(root, "assets", "inbox-hold", "Town", "gobkit-free-" + asset + ".glb")
                # 존재만으로 라이선스나 승인 성공을 표시하지 않는다.
                if (os.path.isfile(path) and os.path.isfile(path + ".license.json")
                        and not os.path.islink(path) and not os.path.islink(path + ".license.json")):
                    held += 1
                else:
                    missing_assets.append({"assetKey": "Town/" + asset, "tier": tier})
            planned = len(port_assets[port])
            rights = sum(v["registeredModelRights"] for v in stages.values())
            rows.append({"portId": port, "planned": planned, "registeredModelRights": rights,
                         "heldUnverified": held, "missingOriginal": len(missing_assets),
                         "stages": stages, "nextMissing": missing_assets[:3]})
        progress.update({"state": "BRIEF_SOURCE_COVERAGE_ONLY",
                         "portCount": len(rows),
                         "planned": sum(row["planned"] for row in rows),
                         "registeredModelRights": sum(row["registeredModelRights"] for row in rows),
                         "heldUnverified": sum(row["heldUnverified"] for row in rows),
                         "missingOriginal": sum(row["missingOriginal"] for row in rows),
                         "nativeRuntimeVerified": False, "visualQualityApproved": False,
                         "ports": rows})
    if battle_progress is not None:
        # [퀘스트·탐험·해전] 제작 지시서의 실제 ID만 사용한다.
        # 등록 권한과 장면 렌더 성공은 서로 다른 증거다.
        def model_status(asset, kind):
            path = os.path.join(root, "assets", "inbox-hold", kind, "gobkit-free-" + asset + ".glb")
            if registered(asset, kind):
                state = "REGISTERED_MODEL_RIGHTS"
            elif (os.path.isfile(path) and os.path.isfile(path + ".license.json")
                  and not os.path.islink(path) and not os.path.islink(path + ".license.json")):
                state = "HELD_UNVERIFIED"
            else:
                state = "MISSING_ORIGINAL"
            return {"assetKey": kind + "/" + asset, "state": state}
        sea_rows = [{"seaId": sea, "layers": {
                         layer: model_status(assets[layer], "Naval") if layer in assets
                         else {"state": "BRIEF_LAYER_UNSPECIFIED"}
                         for layer in ("near", "mid", "far")}}
                    for sea, assets in sorted(naval_assets.items())]
        field_rows = [{"siteId": site, **model_status(asset, "Terrain")}
                      for site, asset in sorted(field_assets.items())]
        quest_rows = []
        with open(os.path.join(battle_docs, "quests.md"), encoding="utf-8") as handle:
            for line in handle:
                match = re.fullmatch(r"\|[^|\n]*\(\x60([a-z0-9_]+)\x60\)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*", line.rstrip("\n"))
                if not match:
                    continue
                quest_id, kind, brief = match.groups()
                refs = sorted(set(re.findall(r"naval/([a-z0-9_]+)\.md", brief)) & set(naval_assets))
                if kind == "field":
                    route = "CURRENT_EXPLORATION_SITE"
                elif kind == "landmark":
                    route = "CURRENT_PORT_LANDMARK"
                elif kind in ("win", "war_clear", "함대전"):
                    route = "CURRENT_BATTLE_SEA"
                else:
                    route = "UNRESOLVED_BRIEF_ROUTE"
                quest_rows.append({"questId": quest_id, "kind": kind, "route": route,
                                   "explicitSeaCandidates": refs,
                                   "runtimeRouteVerified": False})
        states = [v["state"] for row in sea_rows for v in row["layers"].values()
                  if v["state"] != "BRIEF_LAYER_UNSPECIFIED"] + [row["state"] for row in field_rows]
        battle_progress.update({"state": "BRIEF_SOURCE_COVERAGE_ONLY",
                                "seaCount": len(sea_rows), "siteCount": len(field_rows),
                                "questBriefCount": len(quest_rows), "planned": len(states),
                                "registeredModelRights": states.count("REGISTERED_MODEL_RIGHTS"),
                                "heldUnverified": states.count("HELD_UNVERIFIED"),
                                "missingOriginal": states.count("MISSING_ORIGINAL"),
                                "nativeRuntimeVerified": False, "visualQualityApproved": False,
                                "seas": sea_rows, "sites": field_rows, "quests": quest_rows})
        print("MARE_BATTLE_BRIEF_COVERAGE", json.dumps({
            key: battle_progress[key] for key in ("seaCount", "siteCount", "questBriefCount", "planned",
                                                   "registeredModelRights", "heldUnverified", "missingOriginal")},
            sort_keys=True))
    print("MARE_SCENE_SOURCE_TARGETS",
          json.dumps({"ports": len(ports), **{kind: sum(v == kind for v in outstanding.values())
                                            for kind in sorted(set(targets.values()))}}, sort_keys=True))
    return outstanding


def animal_source_practice():
    goal = next((row for row in seed if row.get("id") == "mare-farm-animals"), None)
    if not goal:
        return None
    registry = read_json(os.path.join(root, "assets-registered.json"))["assets"]
    with open(os.path.join(root, "docs", "discoveries", "MISSING.md"), encoding="utf-8") as handle:
        discovery = re.findall(r"^- ((?:am|pac|zoo)_([a-z0-9_]+)) ", handle.read(), re.M)
    targets = {}
    for name in goal.get("missing", []):
        if not registry.get("Animals/" + name, {}).get("assetId"):
            targets.setdefault(name.replace("-", "_"), []).append("farm:" + name)
    acquired_cards = set()
    for name, row in registry.items():
        if not name.startswith("Animals/") or not row.get("assetId"):
            continue
        model = os.path.join(root, "assets", "animals", name.split("/", 1)[1] + ".glb")
        proof_path = model + ".license.json"
        if os.path.isfile(proof_path):
            proof = read_json(proof_path)
            if (row.get("sourceSha256") and row.get("sourceSha256") == proof.get("sourceSha256")
                    and row.get("assetType") == "Model" and row.get("license") == "CC0-1.0"
                    and row.get("usePermissionGranted") is True and proof.get("discoveryCardId")):
                acquired_cards.add(proof["discoveryCardId"])
    for card, name in discovery:
        if card not in acquired_cards:
            targets.setdefault(name, []).append(card)

    report = {"authority": "EXISTING_MARE_ASSET_PIPELINE_PRACTICE_ONLY",
              "method": "COMPANY_ARCHIVE_EXACT_NAME_CC0_AND_PINNED_SOURCE_BYTES",
              "nativeRuntimeVerified": False, "automaticRuntimePromotionAllowed": False,
              "targetCount": len(targets), "candidates": [], "rejected": [],
              "archiveInventoryState": "UNAVAILABLE"}
    if not targets:
        report["archiveInventoryState"] = "NO_MISSING_TARGETS"

    # 기존 sparse checkout에서 빠진 회사 공용 원본도 동일 체크아웃 HEAD에서만 읽는다.
    # 외부 코드를 실행하거나 압축을 풀지 않는다. 선택된 부족 목표만 요청한다.
    def pinned_file(name, max_bytes):
        size = int(subprocess.check_output(
            ["git", "cat-file", "-s", "HEAD:" + name], timeout=30, stderr=subprocess.DEVNULL))
        if not 0 < size <= max_bytes:
            raise ValueError("SOURCE_SIZE_LIMIT")
        data = subprocess.check_output(["git", "show", "HEAD:" + name],
                                       timeout=45, stderr=subprocess.DEVNULL)
        if len(data) != size:
            raise ValueError("SOURCE_SIZE_MISMATCH")
        return data

    try:
        safety = read_json("company-learning/platform-release-roadmap.json")[
            "livingMotionVisualQualityContract"]["assetAdaptation"]["contentSafety"]
        if safety.get("enabled") is not True:
            raise ValueError("SOURCE_SAFETY_POLICY_DISABLED")
        blocked_hashes = {h for row in safety["blockedAssets"] for h in (row.get("sha256") or [])}
        blocked_paths = {p for row in safety["blockedAssets"] for p in (row.get("sourcePaths") or [])}
        blocked_ids = {str(i) for row in safety["blockedAssets"] for i in (row.get("assetIds") or [])}
    except (OSError, ValueError, KeyError, TypeError):
        return report

    # 보관 원본은 외부 재검색보다 먼저 확인하되 검수 승인 증거를 생성하지 않는다.
    seen = set()
    restored = []
    restore_attempts = 0
    report["restoredOriginals"] = restored
    hold = os.path.join(root, "assets", "inbox-hold", "Animals")
    wanted_cards = {card: name for name, cards in targets.items() for card in cards}
    if os.path.isdir(hold) and not os.path.islink(hold):
        for name in sorted(os.listdir(hold)):
            if not re.fullmatch(r"[a-zA-Z0-9_-]+\.glb\.license\.json", name):
                continue
            proof_path = os.path.join(hold, name)
            source = proof_path.removesuffix(".license.json")
            try:
                proof = read_json(proof_path)
                card = proof.get("discoveryCardId") or proof.get("candidateDiscoveryCardId")
                publisher = proof.get("sourceAcquisition") == "PUBLISHER_FREE_CATALOG_HELD_ONLY"
                if publisher:
                    cards = proof.get("candidateTargetIds",[])
                    if not isinstance(cards,list) or not cards or not all(isinstance(c,str) for c in cards):
                        continue
                    valid_cards = [c for c in cards if c in wanted_cards]
                    if not valid_cards:
                        continue
                    card = valid_cards[0]
                    entry = proof.get("publisherEntry",{})
                    if (proof.get("externalRevisionPinned") is not False
                            or proof.get("sourcePage") != "https://gobkit.com/api/free"
                            or not re.fullmatch(r"[a-f0-9]{64}",str(proof.get("publisherManifestSha256","")))
                            or gobkit_animal_sources({"schemaVersion":2,"glbs":[entry.get("url")],
                                "packs":[{"models":[{**entry,"format":"glb"}]}]},[wanted_cards[card]]) == {}
                            or entry.get("url") != proof.get("source")
                            or any(wanted_cards[c] != wanted_cards[card] for c in valid_cards)):
                        raise ValueError("HELD_PUBLISHER_SOURCE_EVIDENCE")
                    blob_sha = proof.get("downloadedBlobSha","")
                else:
                    valid_cards = [card] if card in wanted_cards else []
                    if not valid_cards:
                        continue
                    blob_sha = proof.get("pinnedBlobSha","")
                digest = proof.get("sourceSha256", "")
                size = proof.get("bytes")
                if (proof.get("license") != "CC0-1.0" or proof.get("commercialUseAllowed") is not True
                        or not proof.get("author") or not str(proof.get("source", "")).startswith("https://")
                        or not str(proof.get("sourcePage", "")).startswith("https://")
                        or not re.fullmatch(r"[a-f0-9]{64}", digest) or proof.get("originalSha256") != digest
                        or not re.fullmatch(r"[a-f0-9]{40}", str(blob_sha))
                        or type(size) is not int or not 0 < size <= 5_000_000
                        or digest in blocked_hashes or source in blocked_paths or os.path.islink(source)
                        or os.path.islink(proof_path)):
                    raise ValueError("HELD_SOURCE_POLICY_OR_PROVENANCE_INVALID")
                if digest in seen:
                    continue
                if any(str(row.get("assetId")) in blocked_ids for row in registry.values()
                       if row.get("sourceSha256") == digest):
                    raise ValueError("HELD_SOURCE_BLOCKED_ASSET_ID")
                # 일반 장부 조회는 읽기 전용. 실제 정기/수동 시각 검사에서만
                # 검증된 출처의 누락 원본을 최대 세 개 복구한다.
                recovered = False
                if (not publisher and not os.path.lexists(source) and restore_attempts < 3
                        and any(arg.startswith("--animal-preview-dir=") for arg in sys.argv)):
                    restore_attempts += 1
                    data = restore_pinned_animal_glb(proof, source)
                    recovered = True
                else:
                    if os.path.getsize(source) != size:
                        raise ValueError("HELD_SOURCE_SIZE_MISMATCH")
                    with open(source, "rb") as handle:
                        data = handle.read(5_000_001)
                if (len(data) != size or hashlib.sha256(data).hexdigest() != digest
                        or hashlib.sha1(("blob %d\0" % size).encode()+data).hexdigest() != blob_sha):
                    raise ValueError("HELD_SOURCE_HASH_MISMATCH")
                geometry = inspect_held_animal_glb(data)
                if proof.get("triangles") != geometry["triangles"]:
                    raise ValueError("HELD_SOURCE_TRIANGLE_EVIDENCE_MISMATCH")
            except (OSError, ValueError, TypeError, KeyError, IndexError, AttributeError, struct.error) as error:
                report["rejected"].append({"name": name, "state": "HELD_SOURCE_UNVERIFIED"})
                continue
            seen.add(digest)
            if recovered:
                restored.append(source)
                print("MARE_ANIMAL_HELD_ORIGINAL_RESTORED", name, digest)
            report["candidates"].append({
                "name": wanted_cards[card], "targets": valid_cards, "source": source,
                "directModel": True,
                "modelMembers": [{"member": os.path.basename(source), "format": "GLB",
                                  "bytes": size, "sha256": digest}],
                "sourceSha256": digest, "bytes": size, "license": proof["license"],
                "sourceUrl": proof["source"], "licenseEvidenceUrl": proof["sourcePage"],
                "geometry": geometry, "speciesVerified": False, "visualQualityApproved": False,
                "registrationApproved": False, "actualRobloxRuntimeVerified": False,
                "state": ("HELD_GLB_GEOMETRY_VERIFIED_VISUAL_REVIEW_PENDING" if geometry["mobileGeometryWithinBudget"]
                          else "HELD_GLB_GEOMETRY_OUTSIDE_MOBILE_BUDGET"),
            })
    try:
        manifest = json.loads(pinned_file("assets/asset-manifest.json", 8_000_000))
        archives = manifest["sharedOriginalArchives"]["packs"]
    except (OSError, subprocess.SubprocessError, ValueError, KeyError, TypeError):
        return report
    report["archiveInventoryState"] = "AVAILABLE"
    for pack in archives:
        file = pack.get("file", "")
        if not re.fullmatch(r"[a-zA-Z0-9_-]+\.(?:tar\.gz|zip)", file):
            continue
        name = re.sub(r"\.(?:tar\.gz|zip)$", "", file).lower().replace("-", "_")
        if name not in targets:
            continue
        source = pack.get("sourcePath", "")
        digest = pack.get("sha256", "")
        size = pack.get("bytes")
        if (pack.get("licenseDeclared") not in ("CC0", "CC0-1.0")
                or pack.get("sourceOnly") is not True
                or not re.fullmatch(r"assets/external/[a-zA-Z0-9_./-]+", source)
                or any(part in ("", ".", "..") for part in source.split("/"))
                or os.path.basename(source) != file
                or not re.fullmatch(r"[a-f0-9]{64}", digest)
                or type(size) is not int or not 0 < size <= 5_000_000
                or not str(pack.get("licenseEvidenceUrl", "")).startswith("https://")
                or not str(pack.get("sourceUrl", "")).startswith("https://")
                or digest in blocked_hashes or source in blocked_paths):
            report["rejected"].append({"name": name, "state": "SOURCE_POLICY_OR_PROVENANCE_INVALID"})
            continue
        if digest in seen:
            continue
        seen.add(digest)
        try:
            data = pinned_file(source, size)
            if len(data) != size or hashlib.sha256(data).hexdigest() != digest:
                raise ValueError("SOURCE_HASH_MISMATCH")
            if not (data.startswith(b"PK\x03\x04") if file.endswith(".zip") else data.startswith(b"\x1f\x8b")):
                raise ValueError("SOURCE_ARCHIVE_HEADER_INVALID")
            members = inspect_animal_archive(data, file, name)
        except (OSError, subprocess.SubprocessError, ValueError, TypeError, AttributeError,
                EOFError, zipfile.BadZipFile, tarfile.TarError):
            report["rejected"].append({"name": name, "state": "SOURCE_BYTES_OR_ARCHIVE_UNVERIFIED"})
            continue
        report["candidates"].append({
            "name": name, "targets": sorted(targets[name]), "source": source,
            "sourceSha256": digest, "bytes": size, "license": pack["licenseDeclared"],
            "sourceUrl": pack["sourceUrl"], "licenseEvidenceUrl": pack["licenseEvidenceUrl"],
            "modelMembers": members,
            "state": ("MODEL_MEMBER_BYTES_VERIFIED_SPECIES_VISUAL_REVIEW_PENDING" if members
                      else "ORIGINAL_ARCHIVE_BYTES_VERIFIED_MODEL_MEMBER_UNRESOLVED"),
            "speciesVerified": False, "visualQualityApproved": False,
            "registrationApproved": False, "actualRobloxRuntimeVerified": False,
        })
    # 회사 보관 원본과 기존 게임 원본에서 확보하지 못한 종만 제작자 무료 목록에 요청한다.
    report["newOriginals"] = []
    report["downloadAttempts"] = restore_attempts
    report["publisherSearchState"] = "NOT_REQUESTED"
    # 일반 자산 등록이나 5분 원본 탐색에서도 같은 지시서 장부를 갱신한다.
    report["portImplementation"] = {}
    report["battleImplementation"] = {}
    scene_targets = scene_source_targets(registry, report["portImplementation"], report["battleImplementation"])
    if (not any(arg.startswith("--animal-preview-dir=") for arg in sys.argv)
            or os.path.islink(os.path.dirname(hold)) or os.path.islink(hold)):
        return report
    covered = {row["name"] for row in report["candidates"]}
    missing = sorted(set(targets)-covered)
    if not missing and not scene_targets:
        report["publisherSearchState"] = "NO_MISSING_SOURCE_TARGETS"
        return report
    try:
        manifest_bytes = read_gobkit_free("/api/free", 4_000_000)
        manifest = json.loads(manifest_bytes)
        catalog = gobkit_animal_sources(manifest, missing)
        scene_catalog = gobkit_animal_sources(manifest, scene_targets, scene=True)
    except (OSError,ValueError,TypeError,KeyError,AttributeError) as error:
        report["publisherSearchState"] = "PUBLISHER_CATALOG_RETRY"
        print("MARE_ANIMAL_PUBLISHER_CATALOG_RETRY")
        return report
    report["publisherSearchState"] = "PUBLISHER_CATALOG_CHECKED"
    report["publisherExactNameCandidates"] = len(catalog)
    report["scenePublisherExactNameCandidates"] = len(scene_catalog)
    # 항구 전용 이름이 없는 제작자 원본도 지시서의 건물 역할 이름과 정확히 같으면
    # 지역별 가공 전의 원본 후보로만 보관한다. 완성 건물/전용 랜드마크로 승인하지 않는다.
    import time
    slot = int(time.time() // 300)
    role_targets = {}
    for asset, kind in sorted(scene_targets.items()):
        if kind != "Town" or asset in scene_catalog:
            continue
        match = re.fullmatch(r"[a-z0-9_]+_bld_([a-z0-9_]+)", asset)
        if match and match.group(1) not in ("house", "building", "tower", "wall", "gate"):
            role_targets.setdefault(match.group(1), []).append(asset)
    # [자연 부품] 완성 지시서 ID와 제작자 부품명은 다르다. 실제 지시서 본문의 역할만 연결한다.
    # 공통 프롬프트(재질·출처 설명)는 검색에서 제외하고 지역 전용 모델로 승인하지 않는다.
    component_patterns = {
        "bush": r"\b(?:bush(?:es)?|shrubs?|hedgerows?)\b",
        "cliff": r"\bcliffs?\b", "grass": r"\b(?:grass|grassland|grasses)\b",
        "hill": r"\bhills?\b", "hillsand": r"\b(?:sand dunes?|dunes?)\b",
        "mountain": r"\bmountains?\b", "mountainfar": r"\bmountains?\b",
        "reed": r"\breeds?\b", "rock": r"\b(?:rocks?|boulders?|standing stones?)\b",
        "stalactite": r"\bstalactites?\b",
        "treehigh": r"\b(?:trees?|forest|woodland)\b",
        "treemed": r"\b(?:trees?|forest|woodland)\b",
        "treelow": r"\b(?:trees?|forest|woodland)\b",
        "cloud": r"\bclouds?\b",
    }
    component_targets = {role: [] for role in component_patterns}
    for csv_path in (os.path.join(root, "docs", "port_asset_prompts.csv"),
                     os.path.join(root, "docs", "battle_backdrops", "backdrop_prompts.csv")):
        with open(csv_path, encoding="utf-8", newline="") as handle:
            for row in csv.DictReader(handle):
                asset = row["asset_id"]
                if scene_targets.get(asset) not in ("Town", "Naval", "Terrain") or asset in scene_catalog:
                    continue
                body = row.get("prompt_en", "").partition("so colors can be tinted in-engine.")[2]
                if "as derived." in body:
                    body = body.partition("as derived.")[2]
                for role, pattern in component_patterns.items():
                    if re.search(pattern, body, re.I):
                        component_targets[role].append(asset)
    component_roles = set()
    for pack in manifest["packs"]:
        if pack.get("id") != "gobkit-nature-kit":
            continue
        for model in pack.get("models", []):
            name = model.get("name", "")
            if not isinstance(name, str):
                continue
            key = re.sub(r"[ -]+", "_", name.lower())
            match = re.fullmatch(r"([a-z]+)_[0-9]{3}", key)
            if not match or not component_targets.get(match.group(1)):
                continue
            if not re.fullmatch(r"https://gobkit\.com/freebies/environment/[A-Za-z0-9_-]+\.glb", model.get("url", "")):
                continue
            role_targets[key] = sorted(set(component_targets[match.group(1)]))
            component_roles.add(key)
    role_catalog = gobkit_animal_sources(manifest, role_targets, scene=True)
    held_urls = set()
    for kind in ("Town", "Naval", "Terrain", "People", "Outfits", "Monsters", "Rig", "Motion", "Animals"):
        directory = os.path.join(os.path.dirname(hold), kind)
        if not os.path.isdir(directory) or os.path.islink(directory):
            continue
        for filename in sorted(os.listdir(directory)):
            if not filename.endswith(".glb.license.json"):
                continue
            path = os.path.join(directory, filename)
            if os.path.islink(path) or os.path.islink(path.removesuffix(".license.json")):
                continue
            try:
                proof = read_json(path)
                if (proof.get("sourceAcquisition") == "PUBLISHER_FREE_CATALOG_HELD_ONLY"
                        and os.path.isfile(path.removesuffix(".license.json"))):
                    held_urls.add(proof["source"])
            except (OSError, ValueError, KeyError, TypeError):
                continue
    held_urls.update(row.get("source") for row in registry.values() if isinstance(row, dict))
    chosen_urls = {entry["url"] for entry in scene_catalog.values()} | {entry["url"] for entry in catalog.values()}
    role_candidates = 0
    for role, entry in sorted(role_catalog.items()):
        if entry["url"] in held_urls or entry["url"] in chosen_urls:
            continue
        is_component = role in component_roles
        if is_component and not re.fullmatch(r"https://gobkit\.com/freebies/environment/[A-Za-z0-9_-]+\.glb", entry["url"]):
            continue
        options = []
        for asset in role_targets[role]:
            if asset in scene_catalog:
                continue
            kind = scene_targets[asset]
            candidate = os.path.join(os.path.dirname(hold), kind, "gobkit-free-" + asset + ".glb")
            if os.path.lexists(candidate + ".license.json") or os.path.lexists(candidate) or candidate in blocked_paths:
                continue
            options.append(asset)
        if not options:
            continue
        target = options[slot % len(options)]
        scene_catalog[target] = {**entry, "matchMode": ("BRIEF_SCENE_COMPONENT_CANDIDATE_ONLY" if is_component
                                                        else "BRIEF_BUILDING_ROLE_CANDIDATE_ONLY"),
                                 "sourceRole": role, "regionalAdaptationRequired": True}
        chosen_urls.add(entry["url"])
        role_candidates += 1
    report["scenePublisherRoleCandidates"] = role_candidates
    print("MARE_SCENE_PUBLISHER_SEARCH", json.dumps({
        "exact": report["scenePublisherExactNameCandidates"], "roleCandidates": role_candidates,
        "animalExact": report["publisherExactNameCandidates"]}, sort_keys=True))
    # 실제 역할에 맞는 원본 후보만 최대 세 개 받는다. 지역별 가공과 검수는 별도다.
    import time
    # 5분마다 항구·해전·지상 탐험·동물의 우선순위를 순환한다.
    # 총 다운로드 시도 3건 상한과 기존 검증·보관 경로는 유지한다.
    picks = sorted([(False, name) for name in catalog] + [(True, name) for name in scene_catalog])
    if not picks:
        return report
    from concurrent.futures import ThreadPoolExecutor
    start = slot * 3
    picks = picks[start % len(picks):] + picks[:start % len(picks)]
    # 분야마다 먼저 한 자리를 배정한다. 세 자리에서 밀린 분야는 다음 회차에 먼저 본다.
    fields = ("harbor", "wildlife", "field", "naval")
    fields = fields[slot % len(fields):] + fields[:slot % len(fields)]
    field_for_kind = {"Town": "harbor", "People": "harbor", "Outfits": "harbor",
                      "Naval": "naval", "Terrain": "field"}
    batch = []
    remaining = 3 - report["downloadAttempts"]
    for scene, name in picks:
        if remaining <= 0:
            break
        kind = scene_targets[name] if scene else "Animals"
        path = os.path.join(os.path.dirname(hold), kind, "gobkit-free-" + name + ".glb")
        proof_path = path + ".license.json"
        if (os.path.islink(os.path.dirname(path)) or os.path.islink(path)
                or path in blocked_paths or proof_path in blocked_paths or os.path.lexists(proof_path)):
            continue
        batch.append((field_for_kind.get(kind, "wildlife"), scene, name))
    batch.sort(key=lambda pair: fields.index(pair[0]))
    primary, extra = [], []
    selected_fields = set()
    for field, scene, name in batch:
        if field in selected_fields:
            extra.append((scene, name))
        else:
            selected_fields.add(field)
            primary.append((scene, name))
    picks = (primary + extra)[:remaining]
    if not picks:
        return report
    # 내려받기만 병렬로 실행하고 파일·증빙·중복 검사 상태는 아래 한 곳에서 갱신한다.
    with ThreadPoolExecutor(max_workers=len(picks)) as workers:
        downloads = {
            (scene, name): workers.submit(read_gobkit_free,
                (scene_catalog if scene else catalog)[name]["url"].removeprefix("https://gobkit.com"),
                5_000_000, scene=scene)
            for scene, name in picks
        }
    for scene, name in picks:
        if report["downloadAttempts"] >= 3:
            break
        entry = (scene_catalog if scene else catalog)[name]
        source_kind = scene_targets[name] if scene else "Animals"
        target_ids = [source_kind + "/" + name] if scene else sorted(targets[name])
        source_dir = os.path.join(os.path.dirname(hold), source_kind)
        source = os.path.join(source_dir, "gobkit-free-" + name + ".glb")
        if os.path.islink(source_dir):
            continue
        proof_path = source+".license.json"
        if (source in blocked_paths or proof_path in blocked_paths
                or os.path.lexists(proof_path) or os.path.islink(source)):
            continue
        report["downloadAttempts"] += 1
        try:
            data = downloads[(scene, name)].result()
            digest = hashlib.sha256(data).hexdigest()
            if (digest in blocked_hashes or digest in seen
                    or any(row.get("sourceSha256")==digest for row in registry.values())):
                raise ValueError("PUBLISHER_SOURCE_DUPLICATE_OR_BLOCKED")
            geometry = inspect_held_animal_glb(data)
            if source_kind in ("Rig", "Motion") and geometry["jointCount"] == 0:
                raise ValueError("PUBLISHER_SOURCE_RIG_REQUIRED")
            if source_kind == "Motion" and geometry["animationCount"] == 0:
                raise ValueError("PUBLISHER_SOURCE_ANIMATION_REQUIRED")
            proof = {"license":"CC0-1.0","commercialUseAllowed":True,"author":"Gobkit / Alsomind Tech Co., Ltd.",
                     "source":entry["url"],"sourcePage":"https://gobkit.com/api/free",
                     "sourceAcquisition":"PUBLISHER_FREE_CATALOG_HELD_ONLY",
                     "publisherEntry":entry,"publisherManifestSha256":hashlib.sha256(manifest_bytes).hexdigest(),
                     "externalRevisionPinned":False,"sourceSha256":digest,"originalSha256":digest,
                     "downloadedBlobSha":hashlib.sha1(("blob %d\0"%len(data)).encode()+data).hexdigest(),
                     "bytes":len(data),"triangles":geometry["triangles"],
                     "jointCount":geometry["jointCount"],"animationCount":geometry["animationCount"],
                     "candidateTargetIds":target_ids,"speciesVerified":False,
                     "originalModelHandcraftedVerified":False,"registration":"PENDING_SOURCE_AND_VISUAL_REVIEW",
                     "actualRobloxRuntimeVerified":False,"visualQualityApproved":False}
            if entry.get("regionalAdaptationRequired") is True:
                proof["sourceMatchMode"] = entry["matchMode"]
                proof["sourceRole"] = entry["sourceRole"]
                proof["regionalAdaptationRequired"] = True
            os.makedirs(source_dir, exist_ok=True)
            if os.path.exists(source):
                with open(source,"rb") as handle:
                    if handle.read(5_000_001)!=data:
                        raise ValueError("PUBLISHER_SOURCE_EXISTING_CONFLICT")
            else:
                with open(source,"xb") as handle:
                    handle.write(data)
            with open(proof_path,"x",encoding="utf8") as handle:
                json.dump(proof,handle,ensure_ascii=False,indent=2)
                handle.write("\n")
        except (OSError,ValueError,TypeError,KeyError,IndexError,AttributeError,struct.error):
            report["rejected"].append({"name":name,"state":"PUBLISHER_SOURCE_UNVERIFIED"})
            print("MARE_ANIMAL_PUBLISHER_SOURCE_RETRY",name)
            continue
        seen.add(digest)
        report["newOriginals"].append(source)
        if scene:
            print("MARE_SCENE_PUBLISHER_ORIGINAL_HELD", target_ids[0], digest)
            continue
        report["candidates"].append({
            "name":name,"targets":sorted(targets[name]),"source":source,
            "directModel":True,"modelMembers":[{"member":os.path.basename(source),"format":"GLB",
                "bytes":len(data),"sha256":digest}],"sourceSha256":digest,"bytes":len(data),"license":"CC0-1.0",
            "sourceUrl":entry["url"],"licenseEvidenceUrl":proof["sourcePage"],"geometry":geometry,
            "speciesVerified":False,"visualQualityApproved":False,"registrationApproved":False,
            "actualRobloxRuntimeVerified":False,"state":"HELD_PUBLISHER_GLB_GEOMETRY_VERIFIED_VISUAL_REVIEW_PENDING"})
        print("MARE_ANIMAL_PUBLISHER_ORIGINAL_HELD",name,digest)
    return report


# [시각 검수 준비] 이미 원본 무결성이 검증된 회사 보관 압축·직접 GLB 모델만 실제 렌더한다.
# 파일명/렌더/형상은 승인이 아니다. 기존 시각 검수 권한을 우회하지 않는다.
def materialize_animal_review_member(data, filename, target, member, dest):
    matches = inspect_animal_archive(data, filename, target)
    if member not in matches or member["format"] not in ("GLB", "BLEND"):
        raise ValueError("SOURCE_PREVIEW_MEMBER_UNVERIFIED")
    name = member["member"]
    # 검증된 아카이브 안의 동일 폴더 텍스처만 원래 파일명으로 복원한다.
    # 다른 디렉터리, 실행 파일, 외부 참조는 여전히 허용하지 않는다.
    folder = os.path.dirname(name)
    def collect(entries, read):
        images = {}
        for entry in entries:
            if os.path.dirname(entry) != folder:
                continue
            ext = os.path.splitext(entry)[1].lower()
            if ext not in (".png", ".jpg", ".jpeg"):
                continue
            base = os.path.basename(entry)
            if not re.fullmatch(r"[a-zA-Z0-9_. -]+\.(?i:png|jpg|jpeg)", base) or base in images:
                raise ValueError("SOURCE_PREVIEW_TEXTURE_NAME")
            image = read(entry)
            valid = (image.startswith(b"\x89PNG\r\n\x1a\n") if ext == ".png"
                     else image.startswith(b"\xff\xd8\xff") and image.endswith(b"\xff\xd9"))
            if not valid or not 0 < len(image) <= 5_000_000:
                raise ValueError("SOURCE_PREVIEW_TEXTURE_INVALID")
            images[base] = image
        if len(images) > 16 or sum(map(len, images.values())) > 15_000_000:
            raise ValueError("SOURCE_PREVIEW_TEXTURE_BUDGET")
        return images
    if filename.endswith(".zip"):
        with zipfile.ZipFile(io.BytesIO(data)) as archive:
            body = archive.read(name)
            images = collect([info.filename for info in archive.infolist() if not info.is_dir()], archive.read)
    else:
        with tarfile.open(fileobj=io.BytesIO(data), mode="r:gz") as archive:
            body = archive.extractfile(name).read(5_000_001)
            images = collect([info.name for info in archive.getmembers() if info.isfile()],
                             lambda entry: archive.extractfile(entry).read(5_000_001))
    if len(body) != member["bytes"] or hashlib.sha256(body).hexdigest() != member["sha256"]:
        raise ValueError("SOURCE_PREVIEW_MEMBER_HASH_MISMATCH")
    source = os.path.join(dest, os.path.basename(name))
    with open(source, "wb") as handle:
        handle.write(body)
    for base, image in images.items():
        with open(os.path.join(dest, base), "wb") as handle:
            handle.write(image)
    return source


def render_animal_review_candidates(report, out):
    candidates = [row for row in report["candidates"] if row.get("modelMembers")]
    # 기존 메인 장부의 동일 원본 관찰만 순환 우선순위에 사용한다. 승인이나 현재 렌더 증거로 승격하지 않는다.
    try:
        previous_audit = json.loads(subprocess.check_output(
            ["git", "show", "HEAD:" + os.path.join(root, "assets-wanted.json")],
            timeout=30, stderr=subprocess.DEVNULL))["animalSourcePractice"]
        previous = previous_audit["candidates"]
        last = previous_audit.get("lastPreviewRun")
        if isinstance(last, dict):
            # 과거 실행 요약만 보존하며 신규 다운로드·렌더 승인으로 재사용하지 않는다.
            report["lastPreviewRun"] = last
    except (OSError, ValueError, KeyError, TypeError, subprocess.SubprocessError):
        previous = []
    prior = {(r.get("name"), r.get("sourceSha256"), tuple(m.get("sha256") for m in r.get("modelMembers", []))): r
             for r in previous if isinstance(r, dict)}
    for row in candidates:
        identity = (row["name"], row["sourceSha256"], tuple(m["sha256"] for m in row["modelMembers"]))
        old = prior.get(identity, {})
        observation = old.get("sourceVisualObservation", {})
        if (observation.get("state") in ("SOURCE_VISUAL_RETRY_REQUIRED", "SOURCE_VISUAL_OBSERVED_ONLY",
                "VISUAL_OBSERVATION_UNCERTAIN", "VISUAL_CONTENT_BLOCKED", "VISUAL_IDENTITY_REPAIR_REQUIRED")
                and observation.get("registrationApproved") is False
                and observation.get("visualQualityApproved") is False):
            row["sourceVisualObservation"] = observation
        # 이전 개선 비교는 기록만 보존하고 현재 파일/렌더 또는 승인으로 사용하지 않는다.
        previous_quality = old.get("qualityCandidate", {})
        comparison = previous_quality.get("comparison") or old.get("lastQualityComparison")
        if (isinstance(comparison, dict) and len(row["modelMembers"]) == 1
                and comparison.get("sourceMemberSha256") == row["modelMembers"][0]["sha256"]
                and comparison.get("registrationApproved") is False
                and comparison.get("visualQualityApproved") is False
                and comparison.get("nativeRuntimeVerified") is False):
            row["lastQualityComparison"] = comparison
        if old.get("priorRenderRetry") is True or old.get("sourcePreview", {}).get("state") == "RENDER_FAILED_RETRY":
            row["priorRenderRetry"] = True
            reason = old.get("sourcePreview", {}).get("failureReason") or old.get("priorRenderFailureReason")
            if isinstance(reason, str) and re.fullmatch(r"SOURCE_PREVIEW_[A-Z_]+", reason):
                row["priorRenderFailureReason"] = reason
        geometry = row.get("geometry", {})
        if type(geometry.get("triangles")) is int:
            row["geometryQualityState"] = ("MOBILE_BUDGET_MET" if geometry.get("mobileGeometryWithinBudget") is True
                                           else "SOURCE_GEOMETRY_REPAIR_REQUIRED")
    report["sourcePreviewState"] = "NOT_REQUESTED" if not out else "NO_MODEL_CANDIDATES"
    if not out or not candidates:
        return
    import shutil
    blender = shutil.which("blender")
    if not blender:
        report["sourcePreviewState"] = "BLENDER_UNAVAILABLE"
        return
    out = os.path.abspath(out)
    os.makedirs(out, exist_ok=True)
    report["sourcePreviewState"] = "RENDER_EVIDENCE_ONLY"
    # 한 번에 세 건씩만 순환하고 원본별 렌더 시간을 제한한다.
    import time
    slot = int(time.time() // 300) * 3
    ordered = candidates[slot % len(candidates):] + candidates[:slot % len(candidates)]
    retry = [row for row in ordered if row.get("priorRenderRetry") or
             row.get("sourceVisualObservation", {}).get("state") == "SOURCE_VISUAL_RETRY_REQUIRED"]
    # 동일 종의 손상된 구형 압축 원본이 반복 검사 자리를 독점하지 않게 한다.
    # 이미 해시·GLB 구조를 검증한 다른 원본이 있으면 먼저 시각 검사한다.
    # 기존 원본 자체의 실패는 별도로 남기고 승인·수리 완료로 표시하지 않는다.
    deferred = []
    for row in list(retry):
        if (row.get("directModel") is True
                or row.get("priorRenderFailureReason") != "SOURCE_PREVIEW_EXTERNAL_OR_MISSING_TEXTURE"):
            continue
        alternatives = [other for other in ordered
                        if other.get("directModel") is True and other["name"] == row["name"]
                        and set(other["targets"]) == set(row["targets"])
                        and other.get("license") == "CC0-1.0"
                        and (other.get("geometry", {}).get("triangles") or 0) > 0
                        and other.get("priorRenderFailureReason") != "SOURCE_PREVIEW_EXTERNAL_OR_MISSING_TEXTURE"
                        and other.get("sourceVisualObservation", {}).get("state")
                            not in ("VISUAL_CONTENT_BLOCKED", "VISUAL_IDENTITY_REPAIR_REQUIRED")]
        if alternatives:
            replacement = alternatives[0]
            retry.remove(row)
            deferred.append(row)
            row["sourcePreview"] = {"state": "RENDER_FAILED_RETRY",
                                    "failureReason": row["priorRenderFailureReason"],
                                    "registrationApproved": False, "visualQualityApproved": False}
            row["alternateSourceState"] = "VERIFIED_GLB_PRIORITY_ORIGINAL_TEXTURE_UNRESOLVED"
            observation = replacement.get("sourceVisualObservation", {})
            already_observed = (
                observation.get("state") == "SOURCE_VISUAL_OBSERVED_ONLY"
                and len(replacement["modelMembers"]) == 1
                and observation.get("sourceMemberSha256") == replacement["modelMembers"][0]["sha256"]
                and observation.get("contentSafe") is True
                and observation.get("speciesMatch") is True
                and observation.get("uncertain") is False)
            # 검수된 대체 원본은 일반 품질 수리 순환에 맡겨 다른 종의 재시도를 막지 않는다.
            if not already_observed:
                if replacement in retry:
                    retry.remove(replacement)
                retry.insert(0, replacement)
                print("MARE_ANIMAL_TEXTURE_ALTERNATE_PRIORITY", row["name"])
    fresh = [row for row in ordered if not row.get("sourceVisualObservation") and not row.get("priorRenderRetry")]
    preferred = [row for row in fresh if row.get("geometryQualityState") != "SOURCE_GEOMETRY_REPAIR_REQUIRED"]
    # 한 자리만 실제 수리에 배정하고 기존 신규·재시도 순환도 유지한다.
    quality = [row for row in ordered if row.get("license") == "CC0-1.0"
               and row.get("directModel") is True
               and row.get("geometryQualityState") == "SOURCE_GEOMETRY_REPAIR_REQUIRED"
               and 0 < (row.get("geometry", {}).get("triangles") or 0) < 1000
               and len(row["modelMembers"]) == 1 and row["modelMembers"][0]["format"] == "GLB"
               and row.get("lastQualityComparison", {}).get("state") not in (
                   "QUALITY_COMPARISON_OBSERVED_ONLY", "QUALITY_COMPARISON_CONTENT_BLOCKED")
               and row.get("sourceVisualObservation", {}).get("state") == "SOURCE_VISUAL_OBSERVED_ONLY"
               and row["sourceVisualObservation"].get("sourceMemberSha256") == row["modelMembers"][0]["sha256"]
               and row["sourceVisualObservation"].get("contentSafe") is True
               and row["sourceVisualObservation"].get("speciesMatch") is True
               and row["sourceVisualObservation"].get("uncertain") is False]
    selected = []
    for pool, limit in ((retry, 1), (quality, 1), (preferred, 1), (fresh, 3), (retry, 3), (ordered, 3)):
        for row in pool:
            if len(selected) >= 3 or limit <= 0:
                break
            if row not in selected and row not in deferred:
                selected.append(row)
                limit -= 1
    quality_selected = next((row for row in selected if row in quality), None)
    for row in selected:
        row.pop("priorRenderRetry", None)
        row.pop("priorRenderFailureReason", None)
        row["sourcePreview"] = {"state": "UNVERIFIED", "registrationApproved": False,
                                "visualQualityApproved": False}
        members = [m for m in row["modelMembers"] if m["format"] in ("BLEND", "GLB")]
        if len(members) != 1:
            continue
        member = members[0]
        key = row["sourceSha256"][:16] + "-" + member["sha256"][:16]
        frame_dir = os.path.join(out, key)
        try:
            if row.get("directModel") is True:
                if os.path.islink(row["source"]):
                    raise ValueError("SOURCE_PREVIEW_DIRECT_PATH")
                size = os.path.getsize(row["source"])
                if size != row["bytes"] or not 0 < size <= 5_000_000:
                    raise ValueError("SOURCE_PREVIEW_SIZE")
                with open(row["source"], "rb") as handle:
                    data = handle.read(5_000_001)
            else:
                size = int(subprocess.check_output(["git", "cat-file", "-s", "HEAD:" + row["source"]],
                                                  timeout=30, stderr=subprocess.DEVNULL))
                if size != row["bytes"] or not 0 < size <= 5_000_000:
                    raise ValueError("SOURCE_PREVIEW_SIZE")
                data = subprocess.check_output(["git", "show", "HEAD:" + row["source"]],
                                               timeout=45, stderr=subprocess.DEVNULL)
            if len(data) != size or hashlib.sha256(data).hexdigest() != row["sourceSha256"]:
                raise ValueError("SOURCE_PREVIEW_ARCHIVE_HASH")
            with tempfile.TemporaryDirectory(prefix="mare-animal-review-") as temp:
                if row.get("directModel") is True:
                    if (member["sha256"] != row["sourceSha256"] or member["bytes"] != size
                            or member["format"] != "GLB" or member["member"] != os.path.basename(row["source"])):
                        raise ValueError("SOURCE_PREVIEW_DIRECT_EVIDENCE")
                    inspect_held_animal_glb(data)
                    source = os.path.join(temp, "original.glb")
                    with open(source, "xb") as handle:
                        handle.write(data)
                else:
                    source = materialize_animal_review_member(data, os.path.basename(row["source"]),
                                                              row["name"], member, temp)
                audit_path = os.path.join(temp, "audit.json")
                # 외부 모델을 여는 파서는 자동 스크립트를 실행하지 않고 인증 환경도 넘기지 않는다.
                safe_env = {"PATH": os.environ.get("PATH", ""), "HOME": temp, "TMPDIR": temp,
                            "LANG": "C.UTF-8", "LIBGL_ALWAYS_SOFTWARE": "1"}
                os.makedirs(frame_dir, exist_ok=True)
                quality_path = os.path.join(frame_dir, "quality.glb")
                repair_args = (["--animal-quality-candidate", "--candidate-output", quality_path]
                               if row is quality_selected else [])
                with tempfile.TemporaryFile() as diagnostic:
                    completed = subprocess.run([blender, "--background", "--factory-startup", "--disable-autoexec",
                                    "--python-exit-code", "1", "--python",
                                    os.path.abspath("tools/vibe_mesh_audit.py"), "--",
                                    "--input", source, "--output", audit_path,
                                    "--source-preview-dir", frame_dir] + repair_args, cwd=temp, env=safe_env,
                                   timeout=600, check=False, stdout=diagnostic, stderr=subprocess.STDOUT)
                    if completed.returncode:
                        # 원본 모델의 임의 텍스트나 경로를 기록하지 않는다. 고정 단계·오류 종류·코드 위치만 남긴다.
                        diagnostic.seek(max(0, diagnostic.tell()-65536))
                        tail = diagnostic.read(65536).decode("utf-8", errors="replace")
                        reasons = ("SOURCE_PREVIEW_EXTERNAL_OR_MISSING_TEXTURE", "SOURCE_PREVIEW_EXTERNAL_LIBRARY",
                                   "SOURCE_PREVIEW_NO_FINITE_MESH", "SOURCE_PREVIEW_EMPTY_BOUNDS",
                                   "SOURCE_PREVIEW_INVALID_IMAGE")
                        stages = re.findall(r"(?m)^MARE_SOURCE_PREVIEW_STAGE (IMPORT|MEASURE|TEXTURE|SCENE|RENDER_FRONT|RENDER_REAR|RENDER_SIDE|OUTPUT)\s*$", tail)
                        locations = re.findall(r'(?m)^\s*File "[^"\r\n]*/vibe_mesh_audit\.py", line ([0-9]{1,5}),', tail)
                        types = re.findall(r"(?m)^(AttributeError|TypeError|ValueError|RuntimeError|ImportError|ModuleNotFoundError|OSError|NameError|KeyError|MemoryError|SystemError):", tail)
                        gpu = bool(re.search(r"(?i)(EGL_NOT_INITIALIZED|EGL_BAD_[A-Z_]+|failed to create (?:an? )?(?:EGL|OpenGL) context|unable to open a display|GPU context creation failed)", tail))
                        reason = next((reason for reason in reasons if reason in tail), None)
                        if reason is None:
                            reason = ("SOURCE_PREVIEW_GPU_CONTEXT" if gpu else
                                      "SOURCE_PREVIEW_PROCESS_SIGNAL" if completed.returncode < 0 else
                                      "SOURCE_PREVIEW_PYTHON_EXCEPTION" if types else "SOURCE_PREVIEW_BLENDER_FAILED")
                        evidence = {"stage": stages[-1] if stages else "STARTUP",
                                    "exitCode": completed.returncode,
                                    "exceptionType": types[-1] if types else "UNKNOWN",
                                    "scriptLine": int(locations[-1]) if locations else None}
                        row["sourcePreview"]["failureDiagnostic"] = evidence
                        print("MARE_ANIMAL_RENDER_DIAGNOSTIC", row["name"], json.dumps(evidence, sort_keys=True))
                        raise ValueError(reason)
                audit = read_json(audit_path)
                preview = audit["sourcePreview"]
                if preview["sourceSha256"] != member["sha256"] or len(preview["frames"]) != 3:
                    raise ValueError("SOURCE_PREVIEW_EVIDENCE")
                frames = []
                for frame in preview["frames"]:
                    if frame["name"] not in ("front.png", "rear.png", "side.png"):
                        raise ValueError("SOURCE_PREVIEW_FRAME_NAME")
                    with open(os.path.join(frame_dir, frame["name"]), "rb") as handle:
                        blob = handle.read(5_000_001)
                    if (len(blob) != frame["bytes"] or len(blob) > 5_000_000
                            or hashlib.sha256(blob).hexdigest() != frame["sha256"]
                            or not blob.startswith(b"\x89PNG\r\n\x1a\n")):
                        raise ValueError("SOURCE_PREVIEW_FRAME_HASH")
                    frames.append(frame)
                if len({f["name"] for f in frames}) != 3:
                    raise ValueError("SOURCE_PREVIEW_FRAME_DUPLICATE")
                row["geometryQualityState"] = ("MOBILE_BUDGET_MET" if 1000 <= audit["triangles"] <= 3000
                                               and sum(a["bones"] for a in audit["armatures"]) <= 50
                                               else "SOURCE_GEOMETRY_REPAIR_REQUIRED")
                row["sourcePreview"] = {"state": "RENDERED_AWAITING_VISUAL_REVIEW",
                                        "artifactDirectory": key, "sourceMemberSha256": member["sha256"],
                                        "triangles": audit["triangles"], "frames": frames,
                                        "renderer": preview["renderer"],
                                        "ignoredReferenceImages": preview["ignoredReferenceImages"],
                                        "restoredTextureReferences": preview.get("restoredTextureReferences", 0),
                                        "registrationApproved": False, "visualQualityApproved": False}
                if repair_args:
                    repair = audit.get("candidate", {})
                    quality_evidence = {"state": "QUALITY_CANDIDATE_RETRY_REQUIRED",
                                        "sourceMemberSha256": member["sha256"],
                                        "registrationApproved": False, "visualQualityApproved": False,
                                        "nativeRuntimeVerified": False, "originalPreserved": True}
                    row["qualityCandidate"] = quality_evidence
                    quality_frames_dir = os.path.join(frame_dir, "quality")
                    try:
                        if repair.get("created") is not True:
                            raise ValueError(repair.get("reason", "ANIMAL_QUALITY_CANDIDATE_FAILED"))
                        with open(quality_path, "rb") as handle:
                            derived = handle.read(5_000_001)
                        digest = hashlib.sha256(derived).hexdigest()
                        if (len(derived) > 5_000_000 or digest != repair.get("sha256")
                                or repair.get("sourceSha256") != member["sha256"] or digest == member["sha256"]):
                            raise ValueError("ANIMAL_QUALITY_CANDIDATE_HASH")
                        before_geometry = inspect_held_animal_glb(data)
                        after_geometry = inspect_held_animal_glb(derived)
                        if (after_geometry["mobileGeometryWithinBudget"] is not True
                                or after_geometry["triangles"] != repair["trianglesAfter"]
                                or after_geometry["jointCount"] != before_geometry["jointCount"]
                                or after_geometry["animationCount"] != before_geometry["animationCount"]):
                            raise ValueError("ANIMAL_QUALITY_CANDIDATE_STRUCTURE")
                        before_doc = json.loads(data[20:20 + struct.unpack_from("<I", data, 12)[0]])
                        after_doc = json.loads(derived[20:20 + struct.unpack_from("<I", derived, 12)[0]])
                        # 다시 내보낼 때 재압축은 허용하지만 재질·이미지·동작의 소실은 허용하지 않는다.
                        for field in ("materials", "images", "textures"):
                            if len(after_doc.get(field, [])) < len(before_doc.get(field, [])):
                                raise ValueError("ANIMAL_QUALITY_CANDIDATE_MATERIAL_LOSS")
                        candidate_audit_path = os.path.join(temp, "quality-audit.json")
                        subprocess.run([blender, "--background", "--factory-startup", "--disable-autoexec",
                                        "--python-exit-code", "1", "--python", os.path.abspath("tools/vibe_mesh_audit.py"),
                                        "--", "--input", quality_path, "--output", candidate_audit_path,
                                        "--source-preview-dir", quality_frames_dir], cwd=temp, env=safe_env,
                                       timeout=600, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                        checked = read_json(candidate_audit_path)
                        if (sorted(sorted(a["boneNames"]) for a in checked["armatures"]) !=
                                sorted(sorted(a["boneNames"]) for a in audit["armatures"])
                                or sorted((a["name"], a["frames"], a["movingBoneCurves"]) for a in checked["actions"]) !=
                                sorted((a["name"], a["frames"], a["movingBoneCurves"]) for a in audit["actions"])
                                or checked["triangles"] != after_geometry["triangles"]
                                or abs(checked["height"] - audit["height"]) > max(0.0001, 0.1 * audit["height"])
                                or abs(checked["groundOffsetRatio"] - audit["groundOffsetRatio"]) > 0.1):
                            raise ValueError("ANIMAL_QUALITY_CANDIDATE_REGRESSION")
                        candidate_preview = checked["sourcePreview"]
                        candidate_frames = candidate_preview["frames"]
                        if (candidate_preview["sourceSha256"] != digest or len(candidate_frames) != 3
                                or {f["name"] for f in candidate_frames} != {"front.png", "rear.png", "side.png"}):
                            raise ValueError("ANIMAL_QUALITY_CANDIDATE_FRAME_EVIDENCE")
                        for frame in candidate_frames:
                            with open(os.path.join(quality_frames_dir, frame["name"]), "rb") as handle:
                                blob = handle.read(5_000_001)
                            if (len(blob) != frame["bytes"] or not 128 <= len(blob) <= 5_000_000
                                    or not blob.startswith(b"\x89PNG\r\n\x1a\n")
                                    or hashlib.sha256(blob).hexdigest() != frame["sha256"]):
                                raise ValueError("ANIMAL_QUALITY_CANDIDATE_FRAME_HASH")
                        quality_evidence.update(state="QUALITY_CANDIDATE_RENDERED_AWAITING_COMPARISON",
                                                sha256=digest, bytes=len(derived), method=repair["method"],
                                                trianglesBefore=before_geometry["triangles"],
                                                trianglesAfter=after_geometry["triangles"],
                                                jointCount=after_geometry["jointCount"],
                                                animationCount=after_geometry["animationCount"],
                                                artifactDirectory=key + "/quality", frames=candidate_frames)
                        print("MARE_ANIMAL_QUALITY_CANDIDATE_RENDERED", row["name"],
                              before_geometry["triangles"], after_geometry["triangles"])
                    except (OSError, ValueError, KeyError, TypeError, subprocess.SubprocessError) as error:
                        if os.path.isfile(quality_path):
                            os.remove(quality_path)
                        shutil.rmtree(quality_frames_dir, ignore_errors=True)
                        reason = str(error)
                        quality_evidence["failureReason"] = (reason if re.fullmatch(r"ANIMAL_QUALITY_[A-Z_]+", reason)
                                                             else "ANIMAL_QUALITY_CANDIDATE_RECHECK_FAILED")
                        print("MARE_ANIMAL_QUALITY_CANDIDATE_RETRY", row["name"], quality_evidence["failureReason"])
        except (OSError, ValueError, KeyError, TypeError, subprocess.SubprocessError,
                tarfile.TarError, zipfile.BadZipFile) as error:
            shutil.rmtree(frame_dir, ignore_errors=True)
            row["sourcePreview"]["state"] = "RENDER_FAILED_RETRY"
            message = str(error)
            reason = (message if re.fullmatch(r"SOURCE_PREVIEW_[A-Z_]+", message)
                      else "SOURCE_PREVIEW_TIMEOUT" if isinstance(error, subprocess.TimeoutExpired)
                      else "SOURCE_PREVIEW_BLENDER_FAILED" if isinstance(error, subprocess.CalledProcessError)
                      else "SOURCE_PREVIEW_UNCLASSIFIED")
            row["sourcePreview"]["failureReason"] = reason
            print("MARE_ANIMAL_PREVIEW_RETRY", row["name"], reason)
    print("MARE_ANIMAL_SOURCE_PREVIEWS=" + str(sum(
        row.get("sourcePreview", {}).get("state") == "RENDERED_AWAITING_VISUAL_REVIEW" for row in candidates)))


audit, failures, audit_3d = trade_goods_practice()
if audit_3d:
    goal_3d = next((row for row in seed if row.get("id") == "trade-goods-3d-models"), None)
    if goal_3d:
        goal_3d["status"] = ("registered-models-runtime-qa-pending"
                             if audit_3d["stats"]["missingExactModel"] == 0 and audit_3d["stats"]["unverified"] == 0
                             else "missing-models-auto-practice")
if audit:
    goal = next(x for x in seed if x.get("id") == "trade-goods-icons-missing")
    if audit["stats"]["registeredWithRights"] == audit["stats"]["targetCount"]:
        goal["status"] = "registered-rights-confirmed-game-qa-pending"
    elif audit["stats"]["readyToRegister"] or audit["stats"]["permissionPending"]:
        goal["status"] = "approved-awaiting-registration-or-rights"
    else:
        goal["status"] = "missing-or-review-blocked"
out = {
    "game": os.path.basename(root), "wanted": seed,
    "codeReferencesNotRegistered": [{"file": file, "asset": asset} for file, asset in missing] if counts else None,
    "registryAudit": registry_audit,
    "registry": {"used": int(counts[1]), "registered": int(counts[2]), "unused": int(counts[3])} if counts else None,
    "inboxWaiting": pending,
}
if audit:
    out["tradeGoodsPractice"] = audit
if audit_3d:
    out["tradeGoods3DPractice"] = audit_3d
animal_audit = animal_source_practice()
if animal_audit:
    preview_arg = next((arg.split("=", 1)[1] for arg in sys.argv if arg.startswith("--animal-preview-dir=")), "")
    render_animal_review_candidates(animal_audit, preview_arg)
    if preview_arg:
        animal_audit["lastPreviewRun"] = {
            "runId": os.environ.get("GITHUB_RUN_ID", ""),
            "publisherSearchState": animal_audit.get("publisherSearchState"),
            "publisherExactNameCandidates": animal_audit.get("publisherExactNameCandidates", 0),
            "scenePublisherExactNameCandidates": animal_audit.get("scenePublisherExactNameCandidates", 0),
            "scenePublisherRoleCandidates": animal_audit.get("scenePublisherRoleCandidates", 0),
            "downloadAttempts": animal_audit.get("downloadAttempts", 0),
            "newOriginalCount": len(animal_audit.get("newOriginals", [])),
            "sourcePreviewState": animal_audit.get("sourcePreviewState"),
            "renderedCount": sum(row.get("sourcePreview", {}).get("state") == "RENDERED_AWAITING_VISUAL_REVIEW"
                                 for row in animal_audit.get("candidates", [])),
            "renderFailures": [{"name": row["name"], "reason": row["sourcePreview"].get("failureReason")}
                               for row in animal_audit.get("candidates", [])
                               if row.get("sourcePreview", {}).get("state") == "RENDER_FAILED_RETRY"][:3],
            "registrationApproved": False, "nativeRuntimeVerified": False,
        }
    out["animalSourcePractice"] = animal_audit
    print("MARE_ANIMAL_COMPANY_ARCHIVE_CANDIDATES=" + str(len(animal_audit["candidates"])))
    print("MARE_ANIMAL_COMPANY_ARCHIVE_INVENTORY=" + animal_audit["archiveInventoryState"])
with open(os.path.join(root, "assets-wanted.json"), "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, indent=1)
    f.write("\n")
print(f"부족 목표 {len(seed)}건 / 코드의 미등록 참조 {len(missing)}건 / inbox 대기 {len(pending)}건")
if audit:
    for name, value in audit["stats"].items():
        print("TRADE_GOODS_PRACTICE_" + name.upper() + "=" + str(value))
    print("TRADE_GOODS_NATIVE_STUDIO_VERIFIED=NO")
if audit_3d:
    for name, value in audit_3d["stats"].items():
        print("TRADE_GOODS_3D_" + name.upper() + "=" + str(value))
    print("TRADE_GOODS_3D_NATIVE_RUNTIME_VERIFIED=NO")
for item in seed:
    print(f"  [{item['status']}] {item['id']}: {item['purpose']}")
if verify_goods and failures:
    for failure in failures:
        print("TRADE_GOODS_PRACTICE_REJECTED=" + failure, file=sys.stderr)
    sys.exit(1)
