#!/usr/bin/env python3
"""바이브 미적 점수기 (외부 AI 없음): 캡처 화면을 픽셀 통계로만 재서 0~100점과 고칠 점을 돌려준다.
측정 항목: 노출, 명암 폭(대비), 채도, 색 개수·조화, 피사체 분리(중앙 대 가장자리), 세부(윤곽)량, 평평한 면 비율.
시뮬레이션: 룩 프리셋의 색보정(밝기·대비·채도·틴트)을 화면에 '추정 적용'해서 어떤 프리셋이 점수가 가장 오르는지 고른다.
  (추정이다: 블룸·안개·그림자 같은 3D 효과는 흉내 내지 않는다. 실제 스튜디오 캡처로 다시 확인해야 한다.)
사용: vibe_aesthetic_score.py --dir <프레임폴더> [--looks assets/roblox/common-look-v1/look-presets.json]
결과는 JSON 한 줄. numpy/Pillow가 없으면 {"available":false}."""
import sys, json, os, glob, argparse, math

ap = argparse.ArgumentParser()
ap.add_argument("--dir", required=True)
ap.add_argument("--looks")
ap.add_argument("--scene-composition", action="store_true", help="실제 장면 캡처의 시선 집중도를 화면 격자로 측정")
ap.add_argument("--max", type=int, default=24)
ap.add_argument("--reference", help="오너 레퍼런스/스케치 이미지 폴더: 이 화면들과 얼마나 닮았는지도 잰다")
a = ap.parse_args()
try:
    import numpy as np
    from PIL import Image
except Exception:
    print(json.dumps({"available": False}))
    sys.exit(0)

W, H = 320, 180


def load(path):
    return np.asarray(Image.open(path).convert("RGB").resize((W, H)), dtype=np.float32) / 255.0


def rgb_to_hsv(img):
    mx = img.max(2)
    mn = img.min(2)
    d = mx - mn
    s = np.where(mx > 1e-6, d / np.maximum(mx, 1e-6), 0)
    r, g, b = img[..., 0], img[..., 1], img[..., 2]
    h = np.zeros_like(mx)
    m = d > 1e-6
    rc = np.where(m, (mx - r) / np.maximum(d, 1e-6), 0)
    gc = np.where(m, (mx - g) / np.maximum(d, 1e-6), 0)
    bc = np.where(m, (mx - b) / np.maximum(d, 1e-6), 0)
    h = np.where(r == mx, bc - gc, np.where(g == mx, 2.0 + rc - bc, 4.0 + gc - rc))
    h = (h / 6.0) % 1.0
    return h, s, mx


def band(x, lo, hi, soft):
    """lo~hi 안이면 1, 벗어나면 soft 폭 안에서 0까지 선형 감점."""
    if lo <= x <= hi:
        return 1.0
    dist = (lo - x) if x < lo else (x - hi)
    return max(0.0, 1.0 - dist / soft)


def score_image(img):
    lum = 0.2126 * img[..., 0] + 0.7152 * img[..., 1] + 0.0722 * img[..., 2]
    h, s, v = rgb_to_hsv(img)
    mean = float(lum.mean())
    p5, p95 = float(np.percentile(lum, 5)), float(np.percentile(lum, 95))
    rng = p95 - p5
    dark = float((lum < 0.06).mean())
    blown = float((lum > 0.96).mean())
    sat = float(s[v > 0.15].mean()) if (v > 0.15).any() else 0.0

    # 색 조화: 채도 있는 픽셀의 색상 분포 → 실질 색상 수(엔트로피)
    mask = (s > 0.18) & (v > 0.2)
    if mask.sum() > 50:
        hist, _ = np.histogram(h[mask], bins=12, range=(0, 1), weights=s[mask])
        p = hist / max(hist.sum(), 1e-9)
        p = p[p > 1e-9]
        eff_hues = float(math.exp(-(p * np.log(p)).sum()))
    else:
        eff_hues = 0.0

    # 피사체 분리: 중앙 대 가장자리의 밝기·채도 차이, 위·아래 차이
    cy0, cy1, cx0, cx1 = H // 4, H * 3 // 4, W // 4, W * 3 // 4
    center = np.zeros((H, W), bool)
    center[cy0:cy1, cx0:cx1] = True
    sep = abs(float(lum[center].mean() - lum[~center].mean())) + 0.5 * abs(float(s[center].mean() - s[~center].mean()))
    vert = abs(float(lum[: H // 3].mean() - lum[-H // 3:].mean()))

    # 세부량: 윤곽 밀도, 평평한 면 비율
    gx = np.abs(np.diff(lum, axis=1))[:-1, :]
    gy = np.abs(np.diff(lum, axis=0))[:, :-1]
    mag = gx + gy
    edge = float((mag > 0.08).mean())
    flat = float((mag < 0.008).mean())

    focus = min(1.0, (sep + vert) / 0.18)
    composition = {}
    if a.scene_composition:
        # 한 방향의 수평선이나 세로줄만으로는 시선이 모이는 지점으로 판단하지 않는다.
        # 화면을 3×3으로 나눠 가로·세로 윤곽이 함께 모인 곳을 찾는다.
        grid = []
        for rows in np.array_split(np.arange(gx.shape[0]), 3):
            for cols in np.array_split(np.arange(gx.shape[1]), 3):
                tile = np.ix_(rows, cols)
                grid.append(min(float((gx[tile] > 0.07).mean()), float((gy[tile] > 0.07).mean())))
        strongest = int(np.argmax(grid))
        peak = grid[strongest]
        surrounding = float(np.median(grid))
        focus = min(1.0, max(0.0, peak - surrounding) / 0.035)
        composition = {"focusColumn": strongest % 3 + 1 if focus > 0 else None,
                       "focusRow": strongest // 3 + 1 if focus > 0 else None,
                       "focusEdgeSeparation": round(max(0.0, peak - surrounding), 4)}

    sub = {
        "exposure": band(mean, 0.22, 0.62, 0.22),
        "contrast": band(rng, 0.6, 0.92, 0.25),
        "clipping": 1.0 - min(1.0, (max(0.0, dark - 0.15) + max(0.0, blown - 0.05)) * 3),
        "saturation": band(sat, 0.3, 0.6, 0.18),
        "harmony": band(eff_hues, 1.0, 4.5, 3.0) if eff_hues > 0 else 0.6,
        "focus": focus,
        "detail": band(edge, 0.09, 0.22, 0.05),
        "flatness": 1.0 - max(0.0, min(1.0, (flat - 0.35) / 0.3)),
    }
    weights = {"exposure": 1.4, "contrast": 1.8, "clipping": 1.0, "saturation": 1.4, "harmony": 1.0, "focus": 1.2, "detail": 1.0, "flatness": 1.2}
    total = sum(weights.values())
    score = 100.0 * sum(sub[k] * weights[k] for k in sub) / total
    return score, sub, {"meanLuma": round(mean, 3), "range": round(rng, 3), "saturation": round(sat, 3),
                        "effectiveHues": round(eff_hues, 2), "edge": round(edge, 3), "flat": round(flat, 3), **composition}


def features(img):
    """레퍼런스 비교용 특징: 밝기·대비·채도·윤곽·평평함 + 가중 색상 히스토그램(12칸)."""
    _, _, raw = score_image(img)
    h, sat, v = rgb_to_hsv(img)
    mask = (sat > 0.18) & (v > 0.2)
    if mask.sum() > 50:
        hist, _ = np.histogram(h[mask], bins=12, range=(0, 1), weights=sat[mask])
        hist = hist / max(hist.sum(), 1e-9)
    else:
        hist = np.zeros(12)
    return raw, hist


SCALARS = {"meanLuma": 0.35, "range": 0.4, "saturation": 0.35, "edge": 0.12, "flat": 0.4}
LABEL = {"meanLuma": "밝기", "range": "명암 폭", "saturation": "채도", "edge": "윤곽·세부량", "flat": "평평한 면 비율"}


def profile(imgs):
    raws, hists = zip(*[features(i) for i in imgs])
    return {k: float(np.mean([r[k] for r in raws])) for k in SCALARS}, np.mean(hists, axis=0)


def reference_match(img_profile, ref_profile):
    (rs, rh), (ps, ph) = ref_profile, img_profile
    diffs = {k: ps[k] - rs[k] for k in SCALARS}
    scalar = sum(min(1.0, abs(diffs[k]) / SCALARS[k]) for k in SCALARS) / len(SCALARS)
    hue = 1.0 - float(np.minimum(rh, ph).sum()) if (rh.sum() > 0 and ph.sum() > 0) else 0.5
    dist = 0.7 * scalar + 0.3 * hue
    return round(100.0 * (1.0 - dist), 1), diffs


ADVICE = {
    "exposure": "밝기가 적정 범위를 벗어났다 → 조명 Brightness/ExposureCompensation 조정",
    "contrast": "명암 폭이 좁다(밋밋함) → ColorCorrection Contrast↑, 그림자·환경 대비 강화",
    "clipping": "검게 죽거나 하얗게 날아간 영역이 많다 → 조명·Bloom Threshold 조정",
    "saturation": "채도가 너무 낮거나 높다 → ColorCorrection Saturation 조정",
    "harmony": "색이 너무 많이 흩어져 있다 → 룩 프리셋 틴트로 색 통일",
    "focus": ("화면에 윤곽이 모이는 지점이 약하다 → 랜드마크 주변의 배경 복잡도와 카메라 구도 확인"
              if a.scene_composition else "중앙과 배경이 구분되지 않는다 → 피사계 심도·비네트·주인공 대비"),
    "detail": "윤곽·질감이 너무 적거나 많다 → 재질·텍스처 디테일 점검",
    "flatness": "평평한 단색 면이 넓다(도형 느낌) → 진짜 에셋·질감·그라데이션 필요",
}


def grade(img, cc, bloom=None):
    """ColorCorrection 추정 적용: 밝기·대비·채도·틴트."""
    out = img + cc.get("Brightness", 0.0)
    out = (out - 0.5) * (1.0 + cc.get("Contrast", 0.0)) + 0.5
    gray = out.mean(2, keepdims=True)
    out = gray + (out - gray) * (1.0 + cc.get("Saturation", 0.0))
    tint = np.array(cc.get("TintColor", [255, 255, 255]), dtype=np.float32) / 255.0
    out = out * tint
    return np.clip(out, 0, 1)


files = sorted(glob.glob(os.path.join(a.dir, "*.jpg")) + glob.glob(os.path.join(a.dir, "*.png")))[: a.max]
frames = []
imgs = []
for f in files:
    try:
        img = load(f)
    except Exception:
        continue
    sc, sub, raw = score_image(img)
    frames.append({"file": os.path.basename(f), "score": round(sc, 1), "sub": {k: round(v, 2) for k, v in sub.items()}, "raw": raw})
    imgs.append(img)

result = {"available": True, "checked": len(frames)}
if frames:
    mean_score = sum(fr["score"] for fr in frames) / len(frames)
    agg = {k: sum(fr["sub"][k] for fr in frames) / len(frames) for k in frames[0]["sub"]}
    weak = sorted(agg.items(), key=lambda kv: kv[1])[:3]
    result.update({
        "score": round(mean_score, 1),
        "worst": min(fr["score"] for fr in frames),
        "sub": {k: round(v, 2) for k, v in agg.items()},
        "advice": [{"axis": k, "value": round(v, 2), "text": ADVICE[k]} for k, v in weak if v < 0.75],
        "frames": frames,
    })
    ref_prof = None
    if a.reference:
        rfiles = sorted(glob.glob(os.path.join(a.reference, "*.jpg")) + glob.glob(os.path.join(a.reference, "*.png")) + glob.glob(os.path.join(a.reference, "*.webp")))[:12]
        rimgs = []
        for f in rfiles:
            try:
                rimgs.append(load(f))
            except Exception:
                pass
        if rimgs:
            ref_prof = profile(rimgs)
            rscore, diffs = reference_match(profile(imgs), ref_prof)
            worst = sorted(diffs.items(), key=lambda kv: -abs(kv[1]) / SCALARS[kv[0]])[:3]
            result["reference"] = {"files": len(rimgs), "score": rscore,
                                   "deviations": [{"axis": LABEL[k], "diff": round(v, 3), "text": f"레퍼런스보다 {LABEL[k]}이(가) {'높다' if v > 0 else '낮다'} ({v:+.2f})"} for k, v in worst if abs(v) / SCALARS[k] > 0.25]}
    if a.looks:
        table = json.load(open(a.looks, encoding="utf8"))
        ranking = []
        for p in table["presets"]:
            cc = p.get("colorCorrection", {})
            graded = [grade(im, cc) for im in imgs]
            scs = [score_image(g)[0] for g in graded]
            row = {"id": p["id"], "score": round(sum(scs) / len(scs), 1), "gain": round(sum(scs) / len(scs) - mean_score, 1),
                   "minGain": round(min(sc2 - fr["score"] for sc2, fr in zip(scs, frames)), 1)}  # 가장 손해 본 프레임의 이득(모든 화면이 좋아져야 자동 적용)
            if ref_prof is not None:
                row["referenceScore"] = reference_match(profile(graded), ref_prof)[0]
            ranking.append(row)
        # 레퍼런스가 있으면 레퍼런스 근접도(취향)를 우선, 없으면 기술 점수
        ranking.sort(key=lambda r: -(r.get("referenceScore", 0) * 0.7 + r["score"] * 0.3) if ref_prof is not None else -r["score"])
        result["lookSimulation"] = {"estimated": True, "baseline": round(mean_score, 1), "ranking": ranking}
print(json.dumps(result, ensure_ascii=False))
