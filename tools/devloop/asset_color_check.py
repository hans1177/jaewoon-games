#!/usr/bin/env python3
"""256색(팔레트·저색상) 이미지 자산 차단 검사 (2026-11-24 오너 지시: 256색 자산 절대 등록 금지).
사용: asset_color_check.py <게임폴더> [--write-legacy]
- 차단: PNG 팔레트(P)·1비트 모드, 또는 128×128 이상인데 실제 색이 256개 이하인 그림.
- 이미 등록된 옛 256색 자산은 <게임폴더>/docs/assets/legacy_256color.txt 에 '교체 대상'으로만 남긴다.
  이 목록에 없는 256색 자산이 하나라도 있으면 실패(종료 코드 1). 목록은 줄이기만 하고 늘리지 않는다."""
import glob, os, sys

EXT = (".png", ".jpg", ".jpeg")

def color_problem(path):
    """256색 자산이면 이유 문자열, 아니면 None. PIL 이 없으면 검사 불가로 실패시킨다."""
    from PIL import Image
    with Image.open(path) as im:
        w, h = im.size
        if im.mode in ("P", "1"):
            return f"256색 팔레트 이미지(mode={im.mode}) — 풀컬러(RGB/RGBA 24·32비트)로 다시 저장"
        if w * h >= 128 * 128 and im.convert("RGB").getcolors(maxcolors=256) is not None:
            return "실제 색이 256개 이하 — 감색·디더링된 그림. 풀컬러 원본으로 교체"
    return None

def scan(root):
    out = {}
    for f in sorted(glob.glob(os.path.join(root, "assets", "**", "*"), recursive=True)):
        if os.path.isfile(f) and f.lower().endswith(EXT) and "/inbox/" not in f:
            why = color_problem(f)
            if why:
                out[os.path.relpath(f, root)] = why
    return out

if __name__ == "__main__":
    root = next((a for a in sys.argv[1:] if not a.startswith("--")), "roblox-games/mare-essentia")
    legacy_path = os.path.join(root, "docs", "assets", "legacy_256color.txt")
    found = scan(root)
    if "--write-legacy" in sys.argv:
        os.makedirs(os.path.dirname(legacy_path), exist_ok=True)
        with open(legacy_path, "w", encoding="utf-8") as f:
            f.write("# 옛 256색 자산 — 교체 대상 목록 (늘리기 금지, 풀컬러로 교체하면 줄에서 지운다)\n")
            for k, why in found.items():
                f.write(f"{k}\t{why}\n")
        print(f"교체 대상 {len(found)}건 기록")
        sys.exit(0)
    legacy = set()
    if os.path.exists(legacy_path):
        for line in open(legacy_path, encoding="utf-8"):
            if line.strip() and not line.startswith("#"):
                legacy.add(line.split("\t")[0].strip())
    new = [k for k in found if k not in legacy]
    print(f"COLOR256 교체대상 {len(found)}건 (목록 {len(legacy)}건) · 신규 위반 {len(new)}건")
    for k in new:
        print(f"  거부: {k} — {found[k]}")
    sys.exit(1 if new else 0)
