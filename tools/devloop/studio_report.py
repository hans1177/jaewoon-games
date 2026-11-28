#!/usr/bin/env python3
"""Studio 실행 한 번 → 화면 검수 보고서 한 장 (바이브 엔진 시각 검수 · 2026-11-29).

오너: "스튜디오 스샷 한 번 찍을 때 많이·자세히", "항구가 다 비슷", "검증 안 된 결과 완료 처리 금지".
이 도구가 하는 일:
  1. 프레임(jpg/png)과 STUDIO_STEP_OUT 숫자를 모은다 (GitHub 실행 번호 또는 로컬 폴더).
  2. 항구(장면)마다 12각도 묶음 시트를 만든다 (studio_shots.py 각도 이름 기준).
  3. 이상 화면(너무 어두움/밝음/단색/빈 화면)을 표시한다.
  4. **항구끼리 같은 각도 사진이 너무 비슷하면 경고**한다(색 분포+구도 유사도). "다 똑같다"를 숫자로 잡는다.
  5. --prev 를 주면 같은 이름 사진을 전/후로 나란히 붙인다.
  6. REPORT.md 에 표로 정리한다 → PR 본문 "검증" 칸에 그대로 붙인다.

사용:
  studio_report.py <실행번호|프레임폴더> [--prev <실행번호|폴더>] [--out <폴더>] [--repo owner/name]
종료 코드: 이상 화면이 있으면 1 (비슷함 경고는 0, 보고서에만 적음)
"""
import glob
import os
import re
import subprocess
import sys

from PIL import Image, ImageChops, ImageDraw, ImageStat

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "roblox-games", "mare-essentia", "tools", "devloop"))
try:
    from studio_shots import ANGLES  # noqa: E402
    ANGLE_NAMES = [a[0] for a in ANGLES]
except Exception:  # 다른 게임에서도 쓸 수 있게
    ANGLE_NAMES = []

SIMILAR = 0.93  # 이 이상이면 "너무 비슷"


def font(size=14):
    """한글 라벨용 글꼴(없으면 기본). GitHub 러너·로컬 어디서든 깨지지 않게 후보를 차례로 찾는다."""
    from PIL import ImageFont
    for p in ("/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc", "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc",
              "/usr/share/fonts/truetype/nanum/NanumGothic.ttf", "C:/Windows/Fonts/malgun.ttf"):
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                pass
    return ImageFont.load_default()


def arg(name, default=None):
    if name in sys.argv:
        i = sys.argv.index(name)
        return sys.argv[i + 1]
    return default


def fetch(src, out, repo):
    """실행 번호면 내려받고, 폴더면 그대로. (프레임 폴더, 단계 출력 목록)"""
    if os.path.isdir(src):
        steps = []
        p = os.path.join(src, "steps.txt")
        if os.path.exists(p):
            steps = open(p, encoding="utf-8").read().splitlines()
        return src, steps
    d = os.path.join(out, "frames_" + src)
    os.makedirs(d, exist_ok=True)
    subprocess.run(["gh", "run", "download", src, "-R", repo, "-D", d], check=False, capture_output=True)
    log = subprocess.run(["gh", "run", "view", src, "-R", repo, "--log"], capture_output=True, text=True).stdout
    steps = sorted(set(m.group(1) for m in re.finditer(r"STUDIO_STEP_OUT=(\d+:[^\r\n]*)", log)),
                   key=lambda s: int(s.split(":", 1)[0]))
    open(os.path.join(d, "steps.txt"), "w", encoding="utf-8").write("\n".join(steps))
    return d, steps


def frames_of(d):
    fs = [f for ext in ("jpg", "jpeg", "png") for f in glob.glob(os.path.join(d, "**", "*." + ext), recursive=True)]
    return sorted(f for f in fs if not os.path.basename(f).startswith(("sheet_", "compare_")))


def split_name(path):
    """'.../xxx_london_animal_side.jpg' → ('london', 'animal_side')"""
    stem = re.sub(r"-\d+$", "", os.path.splitext(os.path.basename(path))[0])
    for a in sorted(ANGLE_NAMES, key=len, reverse=True):
        if stem.endswith("_" + a):
            head = stem[: -len(a) - 1]
            return head or "scene", a
    parts = stem.rsplit("_", 1)
    return (parts[0], parts[1]) if len(parts) == 2 else (stem, "shot")


def health(im):
    g = im.convert("L")
    st = ImageStat.Stat(g)
    mean, std = st.mean[0], st.stddev[0]
    small = g.resize((320, 180))
    flat = sum(1 for ty in range(9) for tx in range(16)
               if ImageStat.Stat(small.crop((tx * 20, ty * 20, tx * 20 + 20, ty * 20 + 20))).stddev[0] < 4) / 144
    flag = "너무 어두움" if mean < 25 else "너무 밝음" if mean > 235 else "단색(장면 없음?)" if std < 12 else ""
    return flag, flat


def signature(im):
    """색 분포(32칸×3) + 32×18 밝기 구도(평균 뺀 값). 0~1 유사도 비교용."""
    rgb = im.convert("RGB").resize((96, 54))
    hist = []
    for ch in rgb.split():
        h = ch.histogram()
        bins = [sum(h[i:i + 8]) for i in range(0, 256, 8)]
        tot = float(sum(bins)) or 1.0
        hist += [b / tot for b in bins]
    layout = list(rgb.convert("L").resize((32, 18)).tobytes())
    m = sum(layout) / len(layout)
    layout = [v - m for v in layout]
    return hist, layout


def similarity(a, b):
    """색이 같아도 건물·길 배치가 다르면 낮게: 색 40% + 구도 상관계수 60%."""
    ha, la = a
    hb, lb = b
    color = 1 - 0.5 * sum(abs(x - y) for x, y in zip(ha, hb)) / 3
    na = sum(x * x for x in la) ** 0.5
    nb = sum(y * y for y in lb) ** 0.5
    corr = sum(x * y for x, y in zip(la, lb)) / (na * nb) if na > 0 and nb > 0 else (1.0 if na == nb else 0.0)
    return 0.4 * color + 0.6 * max(0.0, corr)


def sheet(paths, out, title):
    W, H, COLS = 400, 225, 4
    rows = (len(paths) + COLS - 1) // COLS
    img = Image.new("RGB", (W * COLS, (H + 18) * rows + 24), (20, 20, 24))
    d = ImageDraw.Draw(img)
    d.text((6, 3), title, fill=(255, 230, 160), font=font(16))
    for i, (label, p, flag) in enumerate(paths):
        x, y = (i % COLS) * W, 24 + (i // COLS) * (H + 18)
        img.paste(Image.open(p).convert("RGB").resize((W, H)), (x, y + 18))
        d.text((x + 4, y + 3), label + (" ⚠ " + flag if flag else ""), fill=(255, 120, 120) if flag else (220, 220, 220), font=font(13))
    img.save(out)


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return 2
    repo = arg("--repo", "hans1177/jaewoon-games")
    out = arg("--out", os.path.join(os.getcwd(), "studio_report"))
    os.makedirs(out, exist_ok=True)
    cur, steps = fetch(sys.argv[1], out, repo)
    prev_dir = None
    if arg("--prev"):
        prev_dir, _ = fetch(arg("--prev"), out, repo)
    files = frames_of(cur)
    if not files:
        print("프레임 없음")
        return 1
    ports, sigs, bad, warns = {}, {}, [], []
    for f in files:
        port, angle = split_name(f)
        im = Image.open(f)
        flag, flat = health(im)
        if flag:
            bad.append((port, angle, flag))
        elif flat >= 0.3 and angle not in ("top",):
            warns.append((port, angle, f"빈 영역 {flat:.0%}"))
        ports.setdefault(port, []).append((angle, f, flag))
        sigs.setdefault(angle, {})[port] = signature(im)
    for port, items in ports.items():
        order = {a: i for i, a in enumerate(ANGLE_NAMES)}
        items.sort(key=lambda t: order.get(t[0], 99))
        sheet(items, os.path.join(out, f"sheet_{port}.png"), f"{port} · {len(items)}장")
    # 항구끼리 비슷함
    similar = []
    pairs = []
    angle_avg = {}
    for angle, by in sigs.items():
        names = sorted(by)
        vals = []
        for i in range(len(names)):
            for j in range(i + 1, len(names)):
                s = similarity(by[names[i]], by[names[j]])
                vals.append(s)
                pairs.append((angle, names[i], names[j], s))
                if s >= SIMILAR:
                    similar.append((angle, names[i], names[j], s))
        if vals:
            angle_avg[angle] = sum(vals) / len(vals)
    # 전/후
    compared = 0
    if prev_dir:
        before = {os.path.basename(p): p for p in frames_of(prev_dir)}
        for f in files:
            b = before.get(os.path.basename(f))
            if not b:
                continue
            a_im, b_im = Image.open(b).convert("RGB").resize((480, 270)), Image.open(f).convert("RGB").resize((480, 270))
            diff = ImageStat.Stat(ImageChops.difference(a_im.convert("L"), b_im.convert("L"))).mean[0]
            pair = Image.new("RGB", (960, 290), (20, 20, 24))
            pair.paste(a_im, (0, 20))
            pair.paste(b_im, (480, 20))
            ImageDraw.Draw(pair).text((6, 4), f"전 | 후  {os.path.basename(f)}  변화 {diff:.1f}", fill=(255, 230, 160), font=font(14))
            pair.save(os.path.join(out, "compare_" + os.path.splitext(os.path.basename(f))[0] + ".png"))
            compared += 1
    # 보고서
    L = [f"# Studio 화면 검수 보고서", "", f"- 사진 {len(files)}장 · 장면 {len(ports)}곳 · 이상 {len(bad)} · 경고 {len(warns)} · 비슷함 {len(similar)}"
         + (f" · 전후 비교 {compared}장" if prev_dir else ""), ""]
    if angle_avg:
        L += ["## 항구끼리 얼마나 다른가 (같은 각도 평균 유사도, 낮을수록 다름)", "", "| 각도 | 평균 유사도 |", "|---|---|"]
        L += [f"| {a} | {v:.2f} |" for a, v in sorted(angle_avg.items(), key=lambda t: -t[1])]
        L += [""]
    if pairs:
        L += ["## 가장 비슷한 항구 쌍 10 (0.85↑ 주의, 0.93↑ 경고)", "", "| 각도 | 항구 A | 항구 B | 유사도 |", "|---|---|---|---|"]
        L += [f"| {a} | {x} | {y} | {s:.2f}{' ⚠' if s >= SIMILAR else (' △' if s >= 0.85 else '')} |" for a, x, y, s in sorted(pairs, key=lambda t: -t[3])[:10]]
        L += [""]
    if similar:
        L += [f"## ⚠ 너무 비슷 (≥{SIMILAR})", "", "| 각도 | 항구 A | 항구 B | 유사도 |", "|---|---|---|---|"]
        L += [f"| {a} | {x} | {y} | {s:.2f} |" for a, x, y, s in sorted(similar, key=lambda t: -t[3])[:40]]
        L += [""]
    if bad or warns:
        L += ["## 이상·경고", "", "| 장면 | 각도 | 내용 |", "|---|---|---|"]
        L += [f"| {p} | {a} | ❌ {t} |" for p, a, t in bad] + [f"| {p} | {a} | ⚠ {t} |" for p, a, t in warns]
        L += [""]
    if steps:
        L += ["## 단계 출력 (STUDIO_STEP_OUT)", "", "```"] + [s[:400] for s in steps if not s.split(":", 1)[1].startswith(("SHOT", "bound"))][:250] + ["```", ""]
    L += ["## 시트", ""] + [f"- `sheet_{p}.png` ({len(v)}장)" for p, v in sorted(ports.items())]
    open(os.path.join(out, "REPORT.md"), "w", encoding="utf-8").write("\n".join(L) + "\n")
    print("\n".join(L[:3]))
    print(f"보고서: {os.path.join(out, 'REPORT.md')}")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
