#!/usr/bin/env python3
"""화면 숫자 분석: 스크린샷을 눈으로 보지 않고 픽셀 통계로 이상 징후를 잡는다.
- 프레임마다 청록·회색(채도 낮은 중간 밝기)·어두운 곳·거의 흰색 비율을 잰다.
- 기준 파일(baseline)이 있으면 같은 이름의 프레임과의 평균 차이도 잰다. 크게 달라지면 알린다.
사용: scene_metrics.py <프레임 폴더> [--baseline baseline.json] [--out metrics.json]
"""
import argparse, colorsys, json, os, sys
from PIL import Image

LIMITS = {"teal": 0.08, "gray": 0.30, "dark": 0.20, "white": 0.18}  # 한 장에서 이 비율을 넘으면 경고
DIFF_LIMIT = 18.0  # 기준 프레임과의 평균 밝기 차이(0~255)


def analyze(path):
    im = Image.open(path).convert("RGB")
    im.thumbnail((160, 160))
    px = list(im.tobytes())
    n = len(px) // 3
    c = {"teal": 0, "gray": 0, "dark": 0, "white": 0}
    for i in range(n):
        r, g, b = px[3 * i] / 255, px[3 * i + 1] / 255, px[3 * i + 2] / 255
        h, s, v = colorsys.rgb_to_hsv(r, g, b)
        if 0.44 < h < 0.54 and s > 0.35 and v > 0.45:
            c["teal"] += 1
        if s < 0.12 and 0.25 < v < 0.65:
            c["gray"] += 1
        if v < 0.12:
            c["dark"] += 1
        if v > 0.94 and s < 0.08:
            c["white"] += 1
    return {k: round(v / n, 4) for k, v in c.items()}, [round(sum(px[j::3]) / n, 1) for j in range(3)], im


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("frames")
    ap.add_argument("--baseline")
    ap.add_argument("--out", default="metrics.json")
    a = ap.parse_args()
    base = json.load(open(a.baseline)) if a.baseline and os.path.exists(a.baseline) else {}
    res, flags = {}, []
    for f in sorted(os.listdir(a.frames)):
        if not f.lower().endswith((".jpg", ".png")) or "sparring" in f:
            continue
        ratios, mean, _ = analyze(os.path.join(a.frames, f))
        res[f] = {"ratios": ratios, "mean": mean}
        for k, lim in LIMITS.items():
            if ratios[k] > lim:
                flags.append(f"{f}: {k} {ratios[k]:.0%} (한계 {lim:.0%})")
        if f in base:
            d = sum(abs(x - y) for x, y in zip(mean, base[f]["mean"])) / 3
            res[f]["diff"] = round(d, 1)
            if d > DIFF_LIMIT:
                flags.append(f"{f}: 기준과 평균 밝기 차이 {d:.0f}")
    json.dump(res, open(a.out, "w"), ensure_ascii=False, indent=1)
    print(json.dumps({"frames": len(res), "flags": flags}, ensure_ascii=False, indent=1))
    return 1 if flags and os.environ.get("METRICS_STRICT") else 0


if __name__ == "__main__":
    sys.exit(main())
