#!/usr/bin/env python3
"""캡처 PNG 폴더를 읽어 (1) 한 장짜리 비교 시트를 만들고 (2) 이상 화면(너무 어둡거나 단색)을 표시한다.
사용: visual_lint.py <프레임폴더> [출력시트.png]   이상이 있으면 종료 코드 1"""
import sys, glob, os
from PIL import Image, ImageDraw, ImageStat
src = sys.argv[1]
out = sys.argv[2] if len(sys.argv) > 2 else os.path.join(src, "contact_sheet.png")
files = sorted(glob.glob(os.path.join(src, "*.png")))
files = [f for f in files if os.path.abspath(f) != os.path.abspath(out)]
if not files:
    print("프레임 없음"); sys.exit(1)
W, H, COLS = 480, 270, 3
rows = (len(files) + COLS - 1) // COLS
sheet = Image.new("RGB", (W * COLS, (H + 18) * rows), (20, 20, 24))
d = ImageDraw.Draw(sheet)
bad = []
for i, f in enumerate(files):
    im = Image.open(f).convert("RGB")
    st = ImageStat.Stat(im.convert("L"))
    mean, std = st.mean[0], st.stddev[0]
    flag = ""
    if mean < 25: flag = "너무 어두움"
    elif mean > 235: flag = "너무 밝음"
    elif std < 12: flag = "단색(장면 없음?)"
    if flag: bad.append((os.path.basename(f), flag))
    t = im.resize((W, H))
    x, y = (i % COLS) * W, (i // COLS) * (H + 18)
    sheet.paste(t, (x, y + 18))
    d.text((x + 4, y + 3), os.path.basename(f) + (" ⚠ " + flag if flag else ""), fill=(255, 120, 120) if flag else (220, 220, 220))
sheet.save(out)
print(f"비교 시트: {out} ({len(files)}장)")
for n, fl in bad: print(f"  이상: {n} — {fl}")
sys.exit(1 if bad else 0)
