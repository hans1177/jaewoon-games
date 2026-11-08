#!/usr/bin/env python3
"""도감 카드 그림 자동 수집·가공(CI 러너용). 한국어 위키백과 문서의 대표 이미지를 받아 라이선스를 검증하고,
원본 그대로가 아니라 도감 풍으로 수정(자르기·채도 낮춤·따뜻한 색조·비네팅·가장자리 테두리)해 저장한다.
사용: fetch_card_art.py <게임폴더> [--limit N] [--selftest]
- 허용 라이선스: 퍼블릭 도메인 / CC0 / CC BY(출처 표기, 카드 상세에 표시). CC BY-SA·ND·NC 는 쓰지 않는다.
- 결과(스케치 변환·위험 이미지 자동 제외): assets/cardart/<card_id>.jpg, src/ReplicatedStorage/Shared/CardArtCredits.luau, assets/cardart/cardart-report.json
- 이미 받은 카드는 건너뛰고, 한 번에 N장(기본 80)만 새로 받는다. 못 받아도 종료 코드는 0."""
import io, json, os, re, sys, time, urllib.parse, urllib.request
UA = "MareScientiaAssetBot/1.0 (https://github.com/hans1177/jaewoon-games; license-verified card art fetch)"
API = "https://ko.wikipedia.org/w/api.php"
OK_LIC = re.compile(r"public domain|^pd\b|^pd-|cc0|cc-zero|^cc[- ]by[- ]\d", re.I)
BAD_LIC = re.compile(r"\b(sa|nd|nc)\b|-sa-|-nd-|-nc-|fair use|non-?free", re.I)
# [안전 검사] 선정적·폭력적·사람 얼굴 이미지는 자동으로 거른다. 통과해도 사람 눈 확인 + 승인 목록 등록이 있어야 업로드된다.
RISKY_WORDS = re.compile(r"nude|naked|nudity|erotic|sex|aphrodite|venus|bath|bathing|mermaid|siren|odalisque|bikini|lingerie|breast|torso|"
                         r"corpse|dead|death|blood|gore|wound|massacre|execution|torture|crucifi|battle|war\b|slaughter|beheading|skull|"
                         r"누드|나체|알몸|목욕|인어|전투|전쟁|시체|처형|학살|살해", re.I)
RISKY_CATS = re.compile(r"nude|nudity|erotic|sex|violence|death|war|battle|killing|execution|torture|corpse|genitalia|breast|bath", re.I)
BAD_TITLE = re.compile(r"flag|logo|map of|locator|icon|symbol|coat of arms|signature|svg", re.I)

def http(url, tries=4):
    last = None
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=40) as r:
                return r.read()
        except Exception as e:
            last = e
            time.sleep(2 ** (i + 1))
    raise RuntimeError(f"요청 실패: {url[:80]} ({last})")

def api(**kw):
    kw["format"] = "json"
    return json.loads(http(API + "?" + urllib.parse.urlencode(kw)))

def license_ok(meta):
    lic = (meta.get("LicenseShortName") or {}).get("value", "")
    if not lic or BAD_LIC.search(lic) or not OK_LIC.search(lic): return None
    if (meta.get("Restrictions") or {}).get("value"): return None
    return lic

def clean(s): return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", s or "")).strip()

def parse_cards(path):
    out = []
    for m in re.finditer(r'^\s*\{\s*"([a-z0-9_]+)",\s*"([^"]+)",\s*"(\w+)"', open(path, encoding="utf-8").read(), re.M):
        out.append({"id": m[1], "name": m[2], "field": m[3]})
    return out

def lead_image(name):
    """한국어 위키백과 문서 → (파일 제목, 라이선스, 제작자, 원본 페이지, 썸네일 URL, 가로)"""
    d = api(action="query", titles=name, redirects=1, prop="pageimages", piprop="name")
    pages = list((d.get("query") or {}).get("pages", {}).values())
    fname = next((p.get("pageimage") for p in pages if p.get("pageimage")), None)
    if not fname:
        s = api(action="query", list="search", srsearch=name, srlimit=1)
        hits = (s.get("query") or {}).get("search", [])
        if not hits: return None
        d = api(action="query", titles=hits[0]["title"], redirects=1, prop="pageimages", piprop="name")
        fname = next((p.get("pageimage") for p in (d.get("query") or {}).get("pages", {}).values() if p.get("pageimage")), None)
        if not fname: return None
    if BAD_TITLE.search(fname) or RISKY_WORDS.search(fname) or RISKY_WORDS.search(name): return None
    cats = api(action="query", titles="File:" + fname, prop="categories", cllimit=50)
    for p in (cats.get("query") or {}).get("pages", {}).values():
        if any(RISKY_CATS.search(c.get("title", "")) for c in p.get("categories", [])): return None
    d = api(action="query", titles="File:" + fname, prop="imageinfo", iiprop="url|extmetadata|size|mime", iiurlwidth=700)
    for p in (d.get("query") or {}).get("pages", {}).values():
        ii = (p.get("imageinfo") or [{}])[0]
        lic = license_ok(ii.get("extmetadata", {}))
        if not lic or ii.get("mime") not in ("image/jpeg", "image/png") or ii.get("width", 0) < 300: return None
        meta = ii["extmetadata"]
        return {"file": fname, "license": lic, "author": clean((meta.get("Artist") or {}).get("value"))[:100] or "unknown",
                "page": ii.get("descriptionurl", ""), "thumb": ii.get("thumburl") or ii.get("url")}
    return None

def image_risky(img):
    """픽셀 검사: 사람 얼굴이 보이거나 살색 비율이 높으면 위험으로 본다."""
    import numpy as np, cv2
    a = cv2.cvtColor(np.array(img.convert("RGB")), cv2.COLOR_RGB2BGR)
    ycc = cv2.cvtColor(a, cv2.COLOR_BGR2YCrCb)
    skin = cv2.inRange(ycc, (0, 135, 85), (255, 180, 135))
    if skin.mean() / 255 > 0.18: return "skin"
    g = cv2.cvtColor(a, cv2.COLOR_BGR2GRAY)
    f = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    if f.empty(): return "no-face-detector"  # 검사기를 못 읽으면 안전하게 제외
    if len(f.detectMultiScale(g, 1.1, 5, minSize=(40, 40))): return "face"
    return None

def sketchify(img, W=512, H=384):
    """연필 스케치로 바꾼다(원본 그대로 쓰지 않음). 양피지색 바탕 + 잉크색 선 + 안쪽 테두리."""
    import numpy as np, cv2
    from PIL import Image, ImageOps, ImageDraw
    img = ImageOps.fit(img.convert("RGB"), (W, H), method=Image.LANCZOS, centering=(0.5, 0.45))
    gray = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2GRAY)
    inv = 255 - cv2.GaussianBlur(gray, (0, 0), 7)
    sk = cv2.divide(gray, 255 - inv, scale=256).astype(np.float32)
    sk = np.clip((sk - 40) * 1.25, 0, 255) / 255
    sk = sk ** 1.6
    paper = np.array([238, 222, 196], np.float32); ink = np.array([70, 52, 40], np.float32)
    out = Image.fromarray((ink + (paper - ink) * sk[..., None]).astype(np.uint8))
    ImageDraw.Draw(out).rectangle((6, 6, W - 7, H - 7), outline=(150, 112, 56), width=2)
    return out

def stylize(img):
    """원본을 그대로 쓰지 않도록 도감 풍으로 수정: 4:3 자르기, 채도↓, 따뜻한 색조, 비네팅, 안쪽 테두리."""
    from PIL import Image, ImageEnhance, ImageOps, ImageDraw, ImageFilter, ImageChops
    W, H = 512, 384
    img = ImageOps.fit(img.convert("RGB"), (W, H), method=Image.LANCZOS, centering=(0.5, 0.45))
    img = ImageEnhance.Color(img).enhance(0.78)
    img = ImageEnhance.Contrast(img).enhance(1.08)
    img = ImageOps.autocontrast(img, cutoff=1)
    warm = Image.new("RGB", img.size, (255, 232, 196))
    img = Image.blend(img, ImageChops.multiply(img, warm), 0.4)
    mask = Image.new("L", img.size, 0)
    ImageDraw.Draw(mask).ellipse((-W * 0.25, -H * 0.25, W * 1.25, H * 1.25), fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(70))
    img = Image.composite(img, Image.new("RGB", img.size, (20, 16, 12)), mask.point(lambda v: 150 + v * 105 // 255))
    d = ImageDraw.Draw(img)
    d.rectangle((6, 6, W - 7, H - 7), outline=(214, 170, 82), width=2)
    return img

def write_credits(path, credits):
    lines = ["--!strict", "-- 자동 생성: tools/devloop/fetch_card_art.py (직접 고치지 말 것). 카드 그림 출처·라이선스.",
             "local Credits: { [string]: { credit: string, license: string } } = {"]
    for cid in sorted(credits):
        c = credits[cid]
        esc = lambda s: s.replace("\\", "/").replace('"', "'")
        lines.append(f'\t{cid} = {{ credit = "{esc(c["credit"])}", license = "{esc(c["license"])}" }},')
    lines += ["}", "return Credits", ""]
    open(path, "w", encoding="utf-8").write("\n".join(lines))

def selftest():
    assert license_ok({"LicenseShortName": {"value": "Public domain"}}) == "Public domain"
    assert license_ok({"LicenseShortName": {"value": "CC BY 4.0"}}) == "CC BY 4.0"
    assert license_ok({"LicenseShortName": {"value": "CC BY-SA 4.0"}}) is None
    assert license_ok({"LicenseShortName": {"value": "CC BY-NC 2.0"}}) is None
    assert license_ok({"LicenseShortName": {"value": "Fair use"}}) is None
    from PIL import Image
    im = sketchify(Image.new("RGB", (900, 600), (90, 140, 90)))
    assert im.size == (512, 384)
    assert RISKY_WORDS.search("Venus bathing.jpg") and RISKY_WORDS.search("Battle of X") and not RISKY_WORDS.search("Oak tree.jpg")
    assert image_risky(Image.new("RGB", (400, 300), (225, 170, 140))) == "skin"
    assert image_risky(Image.new("RGB", (400, 300), (90, 140, 90))) in (None, "no-face-detector")
    import tempfile
    t = tempfile.mkdtemp(); p = os.path.join(t, "c.luau")
    write_credits(p, {"bot_oak": {"credit": 'A "B" / https://x', "license": "CC BY 4.0"}})
    assert 'bot_oak = { credit = "A \'B\' / https://x"' in open(p, encoding="utf-8").read()
    print("selftest OK")

def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    root = args[0]
    limit = int(sys.argv[sys.argv.index("--limit") + 1]) if "--limit" in sys.argv else 80
    if str(limit) in args: args.remove(str(limit))
    from PIL import Image
    shared = os.path.join(root, "src", "ReplicatedStorage", "Shared")
    cards = parse_cards(os.path.join(shared, "KnowledgeCards.luau"))
    out_dir = os.path.join(root, "assets", "cardart")
    os.makedirs(out_dir, exist_ok=True)
    rep_p = os.path.join(out_dir, "cardart-report.json")
    report = json.load(open(rep_p, encoding="utf-8")) if os.path.exists(rep_p) else {}
    credits = {}
    new = 0
    for c in cards:
        dest = os.path.join(out_dir, c["id"] + ".jpg")
        r = report.get(c["id"], {})
        if os.path.exists(dest) and r.get("status") == "ok":
            credits[c["id"]] = {"credit": f'{r["author"]} · {r["page"]} · 도감용으로 수정함', "license": r["license"]}
            continue
        if r.get("status") in ("no-image", "license-rejected"): continue
        if new >= limit: continue
        try:
            li = lead_image(c["name"])
            if not li:
                report[c["id"]] = {"status": "no-image"}; print("없음:", c["id"], c["name"]); time.sleep(0.8); continue
            raw = Image.open(io.BytesIO(http(li["thumb"])))
            risk = image_risky(raw)
            if risk:
                report[c["id"]] = {"status": "license-rejected", "reason": "risky-" + risk}; print("위험 이미지 제외:", c["id"], risk); time.sleep(0.8); continue
            img = sketchify(raw)
            img.save(dest, quality=88, optimize=True)
            report[c["id"]] = {"status": "ok", "name": c["name"], **li}
            credits[c["id"]] = {"credit": f'{li["author"]} · {li["page"]} · 도감용으로 수정함', "license": li["license"]}
            new += 1
            print("받음:", c["id"], "<-", li["file"], f'({li["license"]})')
        except Exception as e:
            report[c["id"]] = {"status": "error", "error": str(e)[:140]}; print("오류:", c["id"], e)
        time.sleep(1.0)
    json.dump(report, open(rep_p, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    write_credits(os.path.join(shared, "CardArtCredits.luau"), credits)
    ok = sum(1 for v in report.values() if v.get("status") == "ok")
    print(f"카드 그림: 새로 {new}장, 누적 {ok}/{len(cards)}장")

if "--selftest" in sys.argv: selftest()
else: main()
