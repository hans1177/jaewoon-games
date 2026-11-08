#!/usr/bin/env python3
"""실존 인물 초상 자동 수집(위키미디어 공용). CI 러너에서 돌린다 (로컬 샌드박스는 외부 접속이 막혀 있다).
사용: fetch_commons.py <게임폴더> [--selftest]
- <게임>/famous-figures.json 의 인물마다 Commons 를 검색하고, 라이선스가 퍼블릭 도메인/CC0 로 표시된 그림만 고른다.
- 결과: assets/portraits/<kind>_<id>.jpg + .license.json(원본 URL·제작자·라이선스) + assets/portraits/portraits-report.json
- 이미 받은 인물은 건너뛴다. 하나라도 못 받아도 종료 코드는 0 (있는 것만 쓴다)."""
import json, os, re, sys, time, io, urllib.parse, urllib.request
UA = "MareScientiaAssetBot/1.0 (https://github.com/hans1177/jaewoon-games; license-verified portrait fetch)"
API = "https://commons.wikimedia.org/w/api.php"
PD = re.compile(r"public domain|^pd\b|^pd-|cc0|cc-zero", re.I)

def http(url, tries=5):
    last = None
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=40) as r:
                return r.read()
        except Exception as e:
            last = e
            time.sleep(2 ** (i + 1))
    raise RuntimeError(f"요청 실패: {url[:90]} ({last})")

def pick(pages, fig, avoid, min_w=300):
    """검색 결과(페이지 목록)에서 라이선스·형식·크기·제외어를 통과한 첫 그림을 고른다."""
    toks = re.sub(r"[^\w ]", "", fig["name"]).lower().split()
    surname, given = toks[-1], toks[0]  # 이름·성이 모두 있어야 한다 (동성 다른 사람 방지: 예 Thomas Savery ≠ Thomas Fairfax)
    for pg in sorted(pages, key=lambda p: p.get("index", 0)):
        ii = (pg.get("imageinfo") or [{}])[0]
        title = pg.get("title", "")
        meta = ii.get("extmetadata", {})
        lic = (meta.get("LicenseShortName") or {}).get("value", "")
        if not PD.search(lic): continue
        if ii.get("mime") not in ("image/jpeg", "image/png"): continue
        if ii.get("width", 0) < min_w: continue
        low = title.lower()
        if any(a in low for a in avoid): continue
        desc = re.sub(r"<[^>]+>", "", (meta.get("ImageDescription") or {}).get("value", "")).lower()
        hay = low + " " + desc
        if surname not in hay or given not in hay: continue
        if any(a.lower() in low for a in fig.get("avoid", [])): continue
        if (meta.get("Restrictions") or {}).get("value"): continue
        artist = re.sub(r"<[^>]+>", "", (meta.get("Artist") or {}).get("value", "")).strip()[:120] or "unknown"
        return {"title": title, "license": lic, "author": artist, "page": ii.get("descriptionurl", ""), "thumb": ii.get("thumburl") or ii.get("url")}
    return None

def selftest():
    fig = {"id": "newton", "name": "Isaac Newton"}
    pages = [
        {"title": "File:Newton statue.jpg", "index": 1, "imageinfo": [{"mime": "image/jpeg", "width": 800, "extmetadata": {"LicenseShortName": {"value": "CC BY-SA 4.0"}}}]},
        {"title": "File:Portrait of Isaac Newton.jpg", "index": 2, "imageinfo": [{"mime": "image/jpeg", "width": 800, "descriptionurl": "https://commons.wikimedia.org/wiki/File:X", "thumburl": "u", "extmetadata": {"LicenseShortName": {"value": "Public domain"}, "Artist": {"value": "<a>Kneller</a>"}}}]},
        {"title": "File:Isaac Newton bust.jpg", "index": 3, "imageinfo": [{"mime": "image/jpeg", "width": 800, "extmetadata": {"LicenseShortName": {"value": "Public domain"}}}]},
    ]
    pages.insert(0, {"title": "File:Sir William Newcomen.jpg", "index": 0, "imageinfo": [{"mime": "image/jpeg", "width": 800, "extmetadata": {"LicenseShortName": {"value": "Public domain"}}}]})
    assert pick(pages[:1], {"id": "n", "name": "Thomas Newcomen"}, []) is None  # 다른 Newcomen
    r = pick(pages, fig, ["statue", "bust"])
    assert r and r["title"].endswith("Portrait of Isaac Newton.jpg") and r["author"] == "Kneller", r
    assert pick(pages[:1], fig, []) is None
    print("selftest OK")

def main():
    root = [a for a in sys.argv[1:] if not a.startswith("--")][0]
    cfg = json.load(open(os.path.join(root, "famous-figures.json"), encoding="utf-8"))
    out_dir = os.path.join(root, "assets", "portraits")
    os.makedirs(out_dir, exist_ok=True)
    rep_p = os.path.join(out_dir, "portraits-report.json")
    report = json.load(open(rep_p, encoding="utf-8")) if os.path.exists(rep_p) else {}
    from PIL import Image
    got = 0
    for fig in cfg["figures"]:
        name = f'{cfg["kind"]}_{fig["id"]}'
        dest = os.path.join(out_dir, name + ".jpg")
        if os.path.exists(dest):
            continue
        try:
            q = urllib.parse.urlencode({"action": "query", "format": "json", "generator": "search", "gsrsearch": fig["query"] + " filetype:bitmap",
                                        "gsrnamespace": 6, "gsrlimit": 15, "prop": "imageinfo", "iiprop": "url|extmetadata|size|mime", "iiurlwidth": 420})
            data = json.loads(http(API + "?" + q))
            chosen = pick(list((data.get("query") or {}).get("pages", {}).values()), fig, cfg.get("avoid", []))
            if not chosen:
                report[fig["id"]] = {"status": "no-public-domain-match", "query": fig["query"]}
                print("없음:", fig["id"]); continue
            im = Image.open(io.BytesIO(http(chosen["thumb"]))).convert("RGB")
            w, h = im.size
            # 초상화는 위쪽(얼굴) 중심으로 3:4 비율에 맞춰 자른다
            box_w, box_h = int(min(w, h * 0.75)), int(min(h, w / 0.75))
            left, top = (w - box_w) // 2, int(max(0, min(h - box_h, h * 0.04)))
            im = im.crop((left, top, left + box_w, top + box_h)).resize((288, 384))
            im.save(dest, quality=90, optimize=True)
            meta = {"license": "PUBLIC-DOMAIN", "author": chosen["author"], "source": chosen["page"], "commonsLicense": chosen["license"], "title": chosen["title"]}
            json.dump(meta, open(dest + ".license.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
            report[fig["id"]] = {"status": "ok", **meta}
            got += 1
            print("받음:", fig["id"], "<-", chosen["title"])
        except Exception as e:
            report[fig["id"]] = {"status": "error", "error": str(e)[:160]}
            print("오류:", fig["id"], e)
        time.sleep(1.5)
    json.dump(report, open(rep_p, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"초상 새로 받음 {got}건 / 인물 {len(cfg['figures'])}명")

if "--selftest" in sys.argv: selftest()
else: main()
