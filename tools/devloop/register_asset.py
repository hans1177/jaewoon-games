#!/usr/bin/env python3
"""에셋 inbox 등록: <게임>/assets/inbox/<종류>/<파일> + <파일>.license.json 을 검사해 assets/<종류>/ 로 옮기고 SOURCES.md 에 기록한다.
사용: register_asset.py <게임폴더(roblox-games/mare-essentia)> [--dry-run] [--kind=Town --prefix=london_]
차단: 라이선스 누락·허용 목록 밖, 출처 URL 없음, 이미 차단된 해시(company-learning/platform-release-roadmap.json), 중복 해시,
      256색(팔레트·저색상) 이미지 — 2026-11-24 오너 지시로 절대 등록 금지(asset_color_check.py)."""
import json, os, sys, shutil, hashlib, glob, struct
args = [a for a in sys.argv[1:] if not a.startswith("--")]
dry = "--dry-run" in sys.argv
root = args[0] if args else "roblox-games/mare-essentia"
kind_filter = next((x.split("=", 1)[1] for x in sys.argv[1:] if x.startswith("--kind=")), None)
prefix_filter = next((x.split("=", 1)[1] for x in sys.argv[1:] if x.startswith("--prefix=")), None)
scoped_london = kind_filter == "Town" and prefix_filter == "london_"
scoped_vegetation = kind_filter == "Terrain" and prefix_filter == "veg_"
scoped_derived = scoped_london or scoped_vegetation
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
            except (ValueError, OSError):
                if not scoped_vegetation: raise
                why = "식생 라이선스 증빙 읽기 실패"
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
            # [런던 원본] 승인 원본과 바이너리 해시, GLB 구조를 실제 대조한다.
            try:
                assert fn.endswith(".glb") and m.get("license") == "CC0-1.0" and m.get("derived") is True
                assert m.get("sha256") == h and m.get("bytes") == os.path.getsize(p)
                assert m.get("originalFiles") and m.get("modification")
                with open(p, "rb") as f: header = f.read(12)
                assert len(header) == 12 and struct.unpack("<4sII", header) == (b"glTF", 2, m["bytes"])
                for original in m["originalFiles"]:
                    source = original["repositoryPath"]
                    assert source in approved_sources and original.get("license") == "CC0-1.0"
                    assert str(original.get("originalUrl", "")).startswith("https://")
                    with open(source, "rb") as f: data = f.read()
                    assert hashlib.sha256(data).hexdigest() == original["sha256"] and original["sha256"] not in blocked
                    assert hashlib.sha1(("blob %d\0" % len(data)).encode() + data).hexdigest() == original["gitBlobSha1"]
                assert not os.path.exists(os.path.join(root, "assets", kind.lower(), fn))
                if scoped_vegetation:
                    # 식생의 내부 일률 상한은 해제하되 실제 GLB 삼각형 수와 증빙 일치는 유지한다.
                    assert type(m.get("triangles")) is int and m["triangles"] > 0
                    with open(p, "rb") as f: data = f.read()
                    size, tag = struct.unpack_from("<II", data, 12)
                    assert tag == 0x4e4f534a and 20 + size < len(data)
                    glb = json.loads(data[20:20+size])
                    actual_triangles = 0
                    for node in glb["nodes"]:
                        if "mesh" not in node: continue
                        for pr in glb["meshes"][node["mesh"]]["primitives"]:
                            assert pr.get("mode", 4) == 4
                            count = glb["accessors"][pr["indices"]]["count"]
                            assert type(count) is int and count > 0 and count % 3 == 0
                            actual_triangles += count // 3
                    assert actual_triangles == m["triangles"]
            except (AssertionError, KeyError, OSError, TypeError, ValueError, IndexError, struct.error):
                why = "식생 승인 원본·GLB·해시 검증 실패" if scoped_vegetation else "런던 승인 원본·GLB·해시 검증 실패"
        if why:
            bad.append((p, why)); continue
        dest_dir = os.path.join(root, "assets", kind.lower() if os.path.isdir(os.path.join(root, "assets", kind.lower())) else kind)
        done.append((p, os.path.join(dest_dir, fn), m, h))
        if scoped_derived: known[h] = p
for p, why in bad: print(f"거부: {p} — {why}")
if scoped_derived and bad and not scoped_vegetation:
    sys.exit(1)
if scoped_vegetation and bad:
    print(f"MARE_VEGETATION_STAGING_PARTIAL: ready={len(done)} rejected={len(bad)}")
for src, dst, m, h in done:
    print(("[시험] " if dry else "") + f"등록: {src} → {dst}  ({m['license']}, {h[:10]})")
    if dry: continue
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    shutil.move(src, dst); shutil.move(src + ".license.json", dst + ".license.json")
    # 식생 출처 장부는 실제 자산 번호와 사용권 확인 후 기존 승격 단계에서 기록한다.
    if not scoped_vegetation:
        with open(os.path.join(root, "assets", "SOURCES.md"), "a", encoding="utf-8") as s:
            s.write(f"| `{os.path.basename(os.path.dirname(dst))}/` | {os.path.basename(dst)} | {m.get('author','')} · {m['license']} | {m.get('source','')} |\n")
print(f"등록 {len(done)}건, 거부 {len(bad)}건" + (" (시험 실행)" if dry else "") + ("" if dry or not done else " → 다음: owner-mare-essentia-assets 워크플로로 업로드"))
# 식생만 개별 거부를 기록하고 적격 자산의 공식 등록을 계속한다.
# 전체 미등록 여부는 기존 최종 승격 단계에서 실패로 기록한다.
sys.exit(1 if bad and not scoped_vegetation else 0)
