#!/usr/bin/env python3
"""에셋 inbox 등록: <게임>/assets/inbox/<종류>/<파일> + <파일>.license.json 을 검사해 assets/<종류>/ 로 옮기고 SOURCES.md 에 기록한다.
사용: register_asset.py <게임폴더(roblox-games/mare-scientia)> [--dry-run]
차단: 라이선스 누락·허용 목록 밖, 출처 URL 없음, 이미 차단된 해시(company-learning/platform-release-roadmap.json), 중복 해시."""
import json, os, sys, shutil, hashlib, glob
args = [a for a in sys.argv[1:] if not a.startswith("--")]
dry = "--dry-run" in sys.argv
root = args[0] if args else "roblox-games/mare-scientia"
OK = {"CC0-1.0", "CC-BY-3.0", "CC-BY-4.0", "PUBLIC-DOMAIN", "PROJECT_ORIGINAL_ART"}
EXT = {".glb", ".fbx", ".png", ".jpg", ".jpeg"}
blocked = set()
try:
    rm = json.load(open("company-learning/platform-release-roadmap.json", encoding="utf-8"))
    for row in rm["livingMotionVisualQualityContract"]["assetAdaptation"]["contentSafety"]["blockedAssets"]:
        blocked |= set(row.get("sha256") or [])
except Exception:
    pass
def sha(p): return hashlib.sha256(open(p, "rb").read()).hexdigest()
known = {}
for f in glob.glob(os.path.join(root, "assets", "*", "*")):
    if os.path.isfile(f) and os.path.splitext(f)[1].lower() in EXT and "/inbox/" not in f:
        known[sha(f)] = f
inbox = os.path.join(root, "assets", "inbox")
done, bad = [], []
for kind in sorted(d for d in os.listdir(inbox) if os.path.isdir(os.path.join(inbox, d))):
    for fn in sorted(os.listdir(os.path.join(inbox, kind))):
        p = os.path.join(inbox, kind, fn)
        if fn.endswith(".license.json") or os.path.splitext(fn)[1].lower() not in EXT:
            continue
        meta_p = p + ".license.json"
        why = None
        if not os.path.exists(meta_p): why = "license.json 없음"
        else:
            m = json.load(open(meta_p, encoding="utf-8"))
            if m.get("license") not in OK: why = f"허용되지 않은 라이선스: {m.get('license')}"
            elif not str(m.get("source", "")).startswith("http") and m.get("license") != "PROJECT_ORIGINAL_ART": why = "출처 URL 없음"
            elif not m.get("author"): why = "제작자(author) 없음"
        h = sha(p)
        if not why and h in blocked: why = "차단된 해시"
        if not why and h in known: why = f"중복(이미 {known[h]})"
        if why:
            bad.append((p, why)); continue
        dest_dir = os.path.join(root, "assets", kind.lower() if os.path.isdir(os.path.join(root, "assets", kind.lower())) else kind)
        done.append((p, os.path.join(dest_dir, fn), m, h))
for p, why in bad: print(f"거부: {p} — {why}")
for src, dst, m, h in done:
    print(("[시험] " if dry else "") + f"등록: {src} → {dst}  ({m['license']}, {h[:10]})")
    if dry: continue
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    shutil.move(src, dst); os.remove(src + ".license.json")
    with open(os.path.join(root, "assets", "SOURCES.md"), "a", encoding="utf-8") as s:
        s.write(f"| `{os.path.basename(os.path.dirname(dst))}/` | {os.path.basename(dst)} | {m.get('author','')} · {m['license']} | {m.get('source','')} |\n")
print(f"등록 {len(done)}건, 거부 {len(bad)}건" + (" (시험 실행)" if dry else "") + ("" if dry or not done else " → 다음: owner-mare-scientia-assets 워크플로로 업로드"))
sys.exit(1 if bad else 0)
