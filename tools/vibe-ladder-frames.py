#!/usr/bin/env python3
"""비주얼 래더용 캡처 프레임 검사기: 프레임별 밝기·대비를 재서 '검거나 하얗거나 단색인 깨진 화면'을 찾고,
승급 기록용 작은 썸네일을 저장한다. 사용: vibe-ladder-frames.py --dir <프레임폴더> [--save <폴더> --max 4]
결과는 JSON 한 줄로 출력한다. Pillow가 없으면 {"available":false}를 출력하고 정상 종료한다."""
import sys, json, os, glob, argparse
ap = argparse.ArgumentParser()
ap.add_argument("--dir", required=True)
ap.add_argument("--save")
ap.add_argument("--max", type=int, default=4)
a = ap.parse_args()
try:
    from PIL import Image, ImageStat
except Exception:
    print(json.dumps({"available": False})); sys.exit(0)
files = sorted(glob.glob(os.path.join(a.dir, "*.jpg")) + glob.glob(os.path.join(a.dir, "*.png")))
rows = []
for f in files:
    try:
        im = Image.open(f).convert("L").resize((160, 90))
        st = ImageStat.Stat(im)
        mean, std = st.mean[0], st.stddev[0]
        rows.append({"file": os.path.basename(f), "mean": round(mean, 1), "std": round(std, 1),
                     "bad": bool(mean < 10 or mean > 245 or std < 5)})
    except Exception:
        rows.append({"file": os.path.basename(f), "mean": 0, "std": 0, "bad": True})
saved = []
if a.save and files:
    os.makedirs(a.save, exist_ok=True)
    good = [r["file"] for r in rows if not r["bad"]] or [r["file"] for r in rows]
    step = max(1, len(good) // max(1, a.max))
    for name in good[::step][: a.max]:
        im = Image.open(os.path.join(a.dir, name)).convert("RGB")
        w = 480
        im = im.resize((w, max(1, int(im.height * w / im.width))))
        out = os.path.splitext(name)[0] + ".jpg"
        im.save(os.path.join(a.save, out), quality=68)
        saved.append(out)
bad = [r for r in rows if r["bad"]]
print(json.dumps({"available": True, "checked": len(rows), "bad": len(bad),
                  "ratio": round(len(bad) / len(rows), 2) if rows else 0, "badFiles": [r["file"] for r in bad][:8], "saved": saved}))
