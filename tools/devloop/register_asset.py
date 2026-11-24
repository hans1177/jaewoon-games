#!/usr/bin/env python3
"""에셋 inbox 등록: <게임>/assets/inbox/<종류>/<파일> + <파일>.license.json 을 검사해 assets/<종류>/ 로 옮기고 SOURCES.md 에 기록한다.
사용: register_asset.py <게임폴더(roblox-games/mare-essentia)> [--dry-run] [--kind=Town --prefix=london_]
차단: 라이선스 누락·허용 목록 밖, 출처 URL 없음, 이미 차단된 해시(company-learning/platform-release-roadmap.json), 중복 해시,
      256색(팔레트·저색상) 이미지 — 2026-11-24 오너 지시로 절대 등록 금지(asset_color_check.py)."""
import json, os, sys, shutil, hashlib, glob, struct, re
args = [a for a in sys.argv[1:] if not a.startswith("--")]
dry = "--dry-run" in sys.argv
root = args[0] if args else "roblox-games/mare-essentia"
kind_filter = next((x.split("=", 1)[1] for x in sys.argv[1:] if x.startswith("--kind=")), None)
prefix_filter = next((x.split("=", 1)[1] for x in sys.argv[1:] if x.startswith("--prefix=")), None)
scoped_london = kind_filter == "Town" and prefix_filter == "london_"
scoped_vegetation = kind_filter == "Terrain" and prefix_filter == "veg_"
scoped_derived = scoped_london or scoped_vegetation
# 정식 등록 워크플로만 개별 합격분을 먼저 처리한다. 수동 시험은 계속 엄격 실패한다.
partial = scoped_vegetation or (scoped_london and not dry and "--allow-partial" in sys.argv)
if scoped_derived:
    with open(os.path.join(root, "assets-registered.json"), encoding="utf-8") as f:
        registered = json.load(f)["assets"]
    approved_sources = {v["source"] for v in registered.values() if v.get("license") == "CC0-1.0" and v.get("usePermissionGranted") is True and v.get("source")}
OK = {"CC0-1.0", "CC-BY-3.0", "CC-BY-4.0", "PUBLIC-DOMAIN", "PROJECT_ORIGINAL_ART"}
EXT = {".glb", ".fbx", ".png", ".jpg", ".jpeg"}
blocked = set()
try:
    rm = json.load(open("company-learning/platform-release-roadmap.json", encoding="utf-8"))
    for row in rm["livingMotionVisualQualityContract"]["assetAdaptation"]["contentSafety"]["blockedAssets"]:
        blocked |= set(row.get("sha256") or [])
except Exception:
    if scoped_derived:
        raise
def sha(p): return hashlib.sha256(open(p, "rb").read()).hexdigest()
known = {}
for f in glob.glob(os.path.join(root, "assets", "*", "*")):
    if os.path.isfile(f) and os.path.splitext(f)[1].lower() in EXT and "/inbox/" not in f:
        known[sha(f)] = f
inbox = os.path.join(root, "assets", "inbox")
done, bad = [], []
for kind in sorted(d for d in os.listdir(inbox) if os.path.isdir(os.path.join(inbox, d))):
    if kind_filter and kind != kind_filter: continue
    for fn in sorted(os.listdir(os.path.join(inbox, kind))):
        if prefix_filter and not fn.startswith(prefix_filter): continue
        p = os.path.join(inbox, kind, fn)
        if fn.endswith(".license.json") or os.path.splitext(fn)[1].lower() not in EXT:
            continue
        meta_p = p + ".license.json"
        why = None
        if not os.path.exists(meta_p): why = "license.json 없음"
        else:
            try:
                with open(meta_p, encoding="utf-8") as meta_file:
                    m = json.load(meta_file)
                if not isinstance(m, dict): raise ValueError("invalid metadata")
            except (ValueError, OSError) as exc:
                if not scoped_derived: raise
                why = f"라이선스 증빙 읽기 실패: {type(exc).__name__}"
            if not why:
                if m.get("license") not in OK: why = f"허용되지 않은 라이선스: {m.get('license')}"
                elif not str(m.get("source", "")).startswith("http") and m.get("license") != "PROJECT_ORIGINAL_ART": why = "출처 URL 없음"
                elif not m.get("author"): why = "제작자(author) 없음"
        h = sha(p)
        if not why and h in blocked: why = "차단된 해시"
        if not why and h in known: why = f"중복(이미 {known[h]})"
        if not why and fn.lower().endswith((".png", ".jpg", ".jpeg")):
            # [256색 금지] 팔레트·감색 그림은 카드 원화·UI 모두 등록 거부
            sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
            from asset_color_check import color_problem
            why = color_problem(p)
        if not why and scoped_derived:
            # [건축·식생 원본] 증빙·해시·GLB 실측을 대조하고 정확한 실패 단계를 기록한다.
            try:
                if not fn.endswith(".glb") or m.get("license") != "CC0-1.0":
                    raise ValueError("ASSET_GLB_CC0_REQUIRED")
                if m.get("sha256") != h or m.get("bytes") != os.path.getsize(p):
                    raise ValueError("ASSET_BINARY_HASH_OR_SIZE_MISMATCH")
                with open(p, "rb") as f: data = f.read()
                if len(data) < 20 or struct.unpack_from("<4sII", data) != (b"glTF", 2, m["bytes"]):
                    raise ValueError("ASSET_GLB_HEADER_INVALID")
                if scoped_vegetation and m.get("derived") is False:
                    # 무변형 원본은 고정 미러의 원본 blob 및 라이선스 증빙으로 검증한다.
                    if m.get("commercialUseAllowed") is not True or m.get("sourceLicense") != "https://creativecommons.org/publicdomain/zero/1.0/":
                        raise ValueError("ASSET_CC0_EVIDENCE_INVALID")
                    pinned = re.fullmatch(r"(https://github\.com/[^/]+/[^/]+/blob/[0-9a-f]{40})/.+\.glb", m.get("downloadSource", ""))
                    if not pinned or not str(m.get("mirrorLicenseEvidence", "")).startswith(pinned.group(1) + "/") or not str(m.get("source", "")).startswith("https://"):
                        raise ValueError("ASSET_PINNED_SOURCE_INVALID")
                    if hashlib.sha1(("blob %d\0" % len(data)).encode() + data).hexdigest() != m.get("sourceGitBlobSha1"):
                        raise ValueError("ASSET_SOURCE_BLOB_MISMATCH")
                else:
                    if m.get("derived") is not True or not m.get("originalFiles") or not m.get("modification"):
                        raise ValueError("ASSET_DERIVATION_EVIDENCE_MISSING")
                    for original in m["originalFiles"]:
                        source = original["repositoryPath"]
                        if source not in approved_sources or original.get("license") != "CC0-1.0":
                            raise ValueError("ASSET_ORIGINAL_RIGHTS_UNVERIFIED:" + source)
                        if not str(original.get("originalUrl", "")).startswith("https://"):
                            raise ValueError("ASSET_ORIGINAL_URL_INVALID:" + source)
                        with open(source, "rb") as f: original_data = f.read()
                        if hashlib.sha256(original_data).hexdigest() != original["sha256"] or original["sha256"] in blocked:
                            raise ValueError("ASSET_ORIGINAL_HASH_INVALID:" + source)
                        if hashlib.sha1(("blob %d\0" % len(original_data)).encode() + original_data).hexdigest() != original["gitBlobSha1"]:
                            raise ValueError("ASSET_ORIGINAL_BLOB_MISMATCH:" + source)
                if os.path.exists(os.path.join(root, "assets", kind.lower(), fn)):
                    raise ValueError("ASSET_DESTINATION_EXISTS")
                # 건축과 식생 모두 동일한 실제 GLB 삼각형 수와 증빙 일치를 요구한다.
                # 내부 일률 상한은 두지 않으며 Roblox 런타임 품질 승인과는 구분한다.
                if type(m.get("triangles")) is not int or m["triangles"] <= 0:
                    raise ValueError("ASSET_TRIANGLE_EVIDENCE_INVALID")
                size, tag = struct.unpack_from("<II", data, 12)
                if tag != 0x4e4f534a or 20 + size >= len(data):
                    raise ValueError("ASSET_GLB_JSON_CHUNK_INVALID")
                glb = json.loads(data[20:20+size])
                actual_triangles = 0
                for node in glb["nodes"]:
                    if "mesh" not in node: continue
                    for pr in glb["meshes"][node["mesh"]]["primitives"]:
                        count = glb["accessors"][pr["indices"]]["count"]
                        if pr.get("mode", 4) != 4 or type(count) is not int or count <= 0 or count % 3:
                            raise ValueError("ASSET_TRIANGLE_LAYOUT_INVALID")
                        actual_triangles += count // 3
                if actual_triangles != m["triangles"]:
                    raise ValueError(f"ASSET_TRIANGLE_COUNT_MISMATCH:expected={m['triangles']}:actual={actual_triangles}")
            except (KeyError, OSError, TypeError, ValueError, IndexError, struct.error) as exc:
                why = f"승인 원본·GLB·해시 검증 실패: {type(exc).__name__}: {exc}"
        if why:
            bad.append((p, why)); continue
        dest_dir = os.path.join(root, "assets", kind.lower() if os.path.isdir(os.path.join(root, "assets", kind.lower())) else kind)
        done.append((p, os.path.join(dest_dir, fn), m, h))
        if scoped_derived: known[h] = p
for p, why in bad: print(f"거부: {p} — {why}")
if scoped_derived and bad and not partial:
    sys.exit(1)
if partial and bad:
    scope = "LONDON" if scoped_london else "VEGETATION"
    print(f"MARE_{scope}_STAGING_PARTIAL: ready={len(done)} rejected={len(bad)}")
for src, dst, m, h in done:
    print(("[시험] " if dry else "") + f"등록: {src} → {dst}  ({m['license']}, {h[:10]})")
    if dry: continue
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    shutil.move(src, dst); shutil.move(src + ".license.json", dst + ".license.json")
    # 건축·식생 출처 장부는 실제 번호·사용권 확인 후 기존 승격 단계에서 기록한다.
    if not scoped_derived:
        with open(os.path.join(root, "assets", "SOURCES.md"), "a", encoding="utf-8") as s:
            s.write(f"| `{os.path.basename(os.path.dirname(dst))}/` | {os.path.basename(dst)} | {m.get('author','')} · {m['license']} | {m.get('source','')} |\n")
print(f"등록 {len(done)}건, 거부 {len(bad)}건" + (" (시험 실행)" if dry else "") + ("" if dry or not done else " → 다음: owner-mare-essentia-assets 워크플로로 업로드"))
# 개별 거부분은 inbox에 남고 기존 최종 승격 단계에서 미등록 실패로 기록한다.
sys.exit(1 if bad and not partial else 0)
