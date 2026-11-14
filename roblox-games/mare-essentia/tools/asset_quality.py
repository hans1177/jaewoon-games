#!/usr/bin/env python3
"""자산 품질 연습장: 한 회차에 이미지 몇 장을 심사(점수)하고, 점수가 낮은 것은 결정론적으로 다듬어 후보를 만든다.

- main 의 자산은 절대 바꾸지 않는다. 점수표·후보·상태는 전용 브랜치(상태 디렉터리)에만 쌓는다.
- 승인은 사람이 한다. 후보는 candidates/ 에 놓고, 점수가 실제로 오른 것만 남긴다.
- 사용: asset_quality.py --assets <assets 폴더> --state <상태 디렉터리> [--batch 40]
"""
import argparse, json, os, sys, time
from PIL import Image, ImageFilter, ImageStat

EXT = {".png", ".webp", ".jpg", ".jpeg"}
# 분류별 기대 규격: (정사각 여부, 최소 변, 투명 배경 기대)
RULES = {
    "icons": (True, 128, True), "goods": (True, 128, True), "cargo": (True, 128, True),
    "portraits": (False, 128, False), "cardart": (False, 128, False), "relics": (True, 128, True),
    "people": (False, 96, False), "naval": (True, 128, True), "animals": (True, 128, True),
}
DEFAULT_RULE = (False, 64, False)


def rule_for(path):
    parts = path.replace("\\", "/").split("/")
    for p in parts:
        if p in RULES:
            return RULES[p]
    return DEFAULT_RULE


def ahash(im, n=8):
    g = im.convert("L").resize((n, n), Image.LANCZOS)
    px = list(g.tobytes())
    avg = sum(px) / len(px)
    bits = 0
    for i, v in enumerate(px):
        if v >= avg:
            bits |= 1 << i
    return f"{bits:016x}"


def bbox_alpha(im):
    a = im.getchannel("A")
    return a.point(lambda v: 255 if v > 24 else 0).getbbox()


def score_image(path, im):
    """0~100 점과 지적 사항 목록을 돌려준다."""
    square, min_side, want_alpha = rule_for(path)
    w, h = im.size
    issues, score = [], 100.0
    if min(w, h) < min_side:
        score -= 25; issues.append(f"작음 {w}x{h} (<{min_side})")
    if square and abs(w - h) > max(2, 0.03 * max(w, h)):
        score -= 15; issues.append(f"정사각 아님 {w}x{h}")
    rgba = im.convert("RGBA")
    has_alpha = rgba.getchannel("A").getextrema()[0] < 250
    if want_alpha:
        if not has_alpha:
            score -= 15; issues.append("투명 배경 없음")
        else:
            bb = bbox_alpha(rgba)
            if bb is None:
                score -= 60; issues.append("비어 있음")
            else:
                l, t, r, b = bb
                if l <= 1 or t <= 1 or r >= w - 1 or b >= h - 1:
                    score -= 15; issues.append("그림이 가장자리에 닿아 잘림")
                cx, cy = (l + r) / 2 / w, (t + b) / 2 / h
                if abs(cx - 0.5) > 0.06 or abs(cy - 0.5) > 0.06:
                    score -= 10; issues.append("가운데에서 치우침")
                fill = max((r - l) / w, (b - t) / h)
                if fill < 0.6:
                    score -= 10; issues.append(f"그림이 너무 작음 ({fill:.0%})")
    # 선명도: 가장자리 응답의 분산(낮을수록 흐림). 크기에 덜 민감하도록 256으로 맞춰 잰다.
    g = im.convert("L").resize((256, 256), Image.LANCZOS).filter(ImageFilter.FIND_EDGES)
    sharp = ImageStat.Stat(g).var[0]
    if sharp < 40:
        score -= 20; issues.append(f"흐림 (선명도 {sharp:.0f})")
    elif sharp < 120:
        score -= 8; issues.append(f"다소 흐림 (선명도 {sharp:.0f})")
    return max(0.0, score), issues, sharp


def fix_icon(im, size=256, margin=0.1):
    """결정론적 다듬기: 여백 제거 → 정사각 캔버스 가운데 정렬 → 규격 크기로 맞춤."""
    rgba = im.convert("RGBA")
    bb = bbox_alpha(rgba)
    if bb is None:
        return None
    crop = rgba.crop(bb)
    cw, ch = crop.size
    inner = int(size * (1 - 2 * margin))
    scale = inner / max(cw, ch)
    crop = crop.resize((max(1, round(cw * scale)), max(1, round(ch * scale))), Image.LANCZOS)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.paste(crop, ((size - crop.size[0]) // 2, (size - crop.size[1]) // 2), crop)
    return canvas


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--assets", required=True)
    ap.add_argument("--state", required=True)
    ap.add_argument("--batch", type=int, default=40)
    a = ap.parse_args()
    os.makedirs(a.state, exist_ok=True)
    sp = os.path.join(a.state, "scores.json")
    data = json.load(open(sp, encoding="utf-8")) if os.path.exists(sp) else {"cursor": 0, "round": 0, "items": {}, "hashes": {}}

    files = []
    for root, _, names in os.walk(a.assets):
        if "inbox" in root.split(os.sep)[-1] or "node_modules" in root:
            continue
        for n in names:
            if os.path.splitext(n)[1].lower() in EXT:
                files.append(os.path.relpath(os.path.join(root, n), a.assets).replace("\\", "/"))
    files.sort()
    if not files:
        print("이미지 없음"); return 0
    cur = data["cursor"] % len(files)
    batch = [files[(cur + i) % len(files)] for i in range(min(a.batch, len(files)))]
    data["cursor"] = (cur + len(batch)) % len(files)
    if cur + len(batch) >= len(files):
        data["round"] += 1

    improved = tried = 0
    for rel in batch:
        try:
            im = Image.open(os.path.join(a.assets, rel)); im.load()
        except Exception as e:  # 깨진 파일
            data["items"][rel] = {"score": 0, "issues": [f"열 수 없음: {e}"], "at": int(time.time())}
            continue
        sc, issues, sharp = score_image(rel, im)
        h = ahash(im)
        data["hashes"].setdefault(h, [])
        if rel not in data["hashes"][h]:
            data["hashes"][h].append(rel)
        dupes = [x for x in data["hashes"][h] if x != rel]
        if dupes:
            sc = max(0.0, sc - 10); issues.append("거의 같은 그림: " + ", ".join(dupes[:2]))
        item = {"score": round(sc, 1), "issues": issues, "size": list(im.size), "at": int(time.time())}
        square, _, want_alpha = rule_for(rel)
        if sc < 85 and want_alpha and im.mode in ("RGBA", "LA", "P"):
            tried += 1
            fixed = fix_icon(im)
            if fixed is not None:
                fs, fi, _ = score_image(rel, fixed)
                if fs > sc + 3:
                    out = os.path.join(a.state, "candidates", rel)
                    os.makedirs(os.path.dirname(out), exist_ok=True)
                    fixed.save(os.path.splitext(out)[0] + ".png")
                    item["candidate"] = {"score": round(fs, 1), "remaining": fi}
                    improved += 1
        data["items"][rel] = item

    scores = [v["score"] for v in data["items"].values()]
    low = sorted(((v["score"], k) for k, v in data["items"].items() if v["score"] < 70))
    by_cat = {}
    for k, v in data["items"].items():
        c = k.split("/")[0]
        by_cat.setdefault(c, []).append(v["score"])
    report = {
        "round": data["round"], "checked": len(scores), "total": len(files),
        "average": round(sum(scores) / len(scores), 1) if scores else 0,
        "byCategory": {c: {"n": len(v), "avg": round(sum(v) / len(v), 1)} for c, v in sorted(by_cat.items())},
        "lowest": [{"path": k, "score": s, "issues": data["items"][k]["issues"]} for s, k in low[:30]],
        "candidates": sum(1 for v in data["items"].values() if "candidate" in v),
        "updated": int(time.time()),
    }
    json.dump(data, open(sp, "w", encoding="utf-8"), ensure_ascii=False)
    json.dump(report, open(os.path.join(a.state, "report.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"이번 회차 {len(batch)}장 심사, 보정 시도 {tried}건 중 개선 {improved}건 · 누적 {len(scores)}/{len(files)}장 평균 {report['average']}점")
    return 0


if __name__ == "__main__":
    sys.exit(main())
