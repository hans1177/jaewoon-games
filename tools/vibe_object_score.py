#!/usr/bin/env python3
"""바이브 오브젝트 점수기 (외부 AI 없음): 투명 배경에 렌더한 3D 오브젝트 미리보기(PNG)를 물체 픽셀만 보고 0~100점으로 잰다.
항목: 명암 폭(형태가 읽히는가), 채도, 색 조화, 실루엣 흥미(너무 둥글고 단순하지 않은가), 세부량, 외곽선(어떤 배경에서도 읽히는가).
또 부모 렌더와의 '새로움'(색·형태 차이)을 재서 색만 살짝 바꾼 복제품을 가려낸다.
사용: vibe_object_score.py --png a.png [--parent parent.png]   (여러 번 --png 가능)  결과는 JSON 한 줄.
기준값은 Tiny Treats류 로우폴리 CC0로 맞춘 잠정값이다."""
import sys, json, math, argparse
ap = argparse.ArgumentParser()
ap.add_argument("--png", action="append", required=True)
ap.add_argument("--parent", help="부모(원본) 렌더 PNG: 새로움 계산용")
a = ap.parse_args()
try:
    import numpy as np
    from PIL import Image
except Exception:
    print(json.dumps({"available": False})); sys.exit(0)


def load(path):
    im = np.asarray(Image.open(path).convert("RGBA").resize((256, 256)), dtype=np.float32) / 255.0
    return im[..., :3], im[..., 3] > 0.5


def hsv(img):
    mx, mn = img.max(2), img.min(2)
    d = mx - mn
    s = np.where(mx > 1e-6, d / np.maximum(mx, 1e-6), 0)
    r, g, b = img[..., 0], img[..., 1], img[..., 2]
    h = np.where(r == mx, ((g - b) / np.maximum(d, 1e-6)) % 6, np.where(g == mx, (b - r) / np.maximum(d, 1e-6) + 2, (r - g) / np.maximum(d, 1e-6) + 4)) / 6.0
    return h % 1.0, s, mx


def band(x, lo, hi, soft):
    if lo <= x <= hi:
        return 1.0
    return max(0.0, 1.0 - ((lo - x) if x < lo else (x - hi)) / soft)


def score(path):
    img, m = load(path)
    n = int(m.sum())
    if n < 200:
        return {"score": 0.0, "sub": {}, "raw": {"pixels": n}, "empty": True}
    lum = (0.2126 * img[..., 0] + 0.7152 * img[..., 1] + 0.0722 * img[..., 2])
    h, s, v = hsv(img)
    L = lum[m]
    rng = float(np.percentile(L, 95) - np.percentile(L, 5))
    sat = float(s[m].mean())
    sel = m & (s > 0.15) & (v > 0.15)
    if sel.sum() > 30:
        hist, _ = np.histogram(h[sel], bins=12, range=(0, 1), weights=s[sel])
        p = hist / max(hist.sum(), 1e-9); p = p[p > 1e-9]
        eff = float(math.exp(-(p * np.log(p)).sum()))
    else:
        eff = 1.0
    # 실루엣: 경계 픽셀 수 = 마스크와 한 칸 침식 마스크의 차
    er = m.copy()
    er[1:-1, 1:-1] = m[1:-1, 1:-1] & m[:-2, 1:-1] & m[2:, 1:-1] & m[1:-1, :-2] & m[1:-1, 2:]
    edge_px = m & ~er
    perim = float(edge_px.sum())
    compact = perim ** 2 / (4 * math.pi * n)
    gx = np.abs(np.diff(lum, axis=1))[:-1, :]; gy = np.abs(np.diff(lum, axis=0))[:, :-1]
    mm = (m[:-1, :-1] & m[1:, 1:]) & er[:-1, :-1]
    detail = float(((gx + gy)[mm] > 0.05).mean()) if mm.sum() else 0.0
    contour_dark = float((lum[edge_px] < 0.22).mean()) if perim else 0.0
    sub = {
        "form": band(rng, 0.3, 0.75, 0.2),
        "saturation": band(sat, 0.15, 0.5, 0.15),
        "harmony": band(eff, 1.0, 3.5, 2.5),
        "silhouette": band(compact, 1.5, 4.5, 1.2),
        "detail": band(detail, 0.04, 0.25, 0.04),
        "contour": min(1.0, contour_dark / 0.5),
    }
    w = {"form": 1.6, "saturation": 1.2, "harmony": 0.8, "silhouette": 1.0, "detail": 1.0, "contour": 1.0}
    sc = 100 * sum(sub[k] * w[k] for k in sub) / sum(w.values())
    return {"score": round(sc, 1), "sub": {k: round(v, 2) for k, v in sub.items()},
            "raw": {"range": round(rng, 3), "saturation": round(sat, 3), "effectiveHues": round(eff, 2), "compactness": round(compact, 2), "detail": round(detail, 3), "contourDark": round(contour_dark, 2), "pixels": n}}


def novelty(path, parent):
    a_img, a_m = load(path); b_img, b_m = load(parent)
    u = a_m | b_m
    if not u.any():
        return 0.0
    # 물체가 있다가 없어진 곳은 최대 차이 1로 본다(형태 변화)
    diff = np.abs(a_img - b_img).mean(2)
    diff = np.where(a_m & b_m, diff, 1.0)
    return round(float(diff[u].mean()), 4)


out = {"available": True, "results": []}
par = score(a.parent) if a.parent else None
for p in a.png:
    r = score(p); r["file"] = p
    if a.parent:
        r["novelty"] = novelty(p, a.parent)
        r["parentScore"] = par["score"]
        r["gain"] = round(r["score"] - par["score"], 1)
    out["results"].append(r)
print(json.dumps(out, ensure_ascii=False))
