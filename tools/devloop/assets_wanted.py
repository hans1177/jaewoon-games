#!/usr/bin/env python3
# 파일명: tools/devloop/assets_wanted.py
# 임포트
import hashlib
import json
import os
import re
import struct
import subprocess
import sys

# 메인: 기존 부족 자산 장부 생성 책임 보존
root = sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith("--") else "roblox-games/mare-essentia"
verify_goods = "--verify-goods" in sys.argv
here = os.path.dirname(os.path.abspath(__file__))
seed_path = os.path.join(root, "assets-wanted.seed.json")
seed = []
if os.path.isfile(seed_path):
    with open(seed_path, encoding="utf-8") as f:
        seed = json.load(f)
check = subprocess.run([sys.executable, os.path.join(here, "asset_check.py"), root],
                       capture_output=True, text=True)
missing = sorted(set(re.findall(r"^\s+(\S+): (\w+/[\w\-\.]+)$", check.stdout, re.M)))
counts = re.search(r"사용 (\d+)종 / 등록 (\d+)종 / 미사용 (\d+)종", check.stdout)
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
    visual_restricted = set(excluded) | {"wine", "rum", "tobacco"}
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
    "codeReferencesNotRegistered": [{"file": file, "asset": asset} for file, asset in missing],
    "registry": {"used": int(counts[1]), "registered": int(counts[2]), "unused": int(counts[3])} if counts else None,
    "inboxWaiting": pending,
}
if audit:
    out["tradeGoodsPractice"] = audit
if audit_3d:
    out["tradeGoods3DPractice"] = audit_3d
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
