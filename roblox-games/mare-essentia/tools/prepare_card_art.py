"""도감 카드 그림 준비 도구.
공개 도메인/CC0 이미지를 받아 카드 규격(4:3, 512x384)으로 자르고, 도감 전체가 한 화면처럼 보이도록
색감을 살짝 보정한다 (채도 낮춤 + 따뜻한 색조 + 가장자리 어둡게). 원본은 건드리지 않는다.

사용:  python3 tools/prepare_card_art.py 원본폴더 목록.csv 출력폴더
목록.csv 열: card_id,file,credit,license   (license 예: Public Domain / CC0 / CC BY 4.0)
결과: 출력폴더/<card_id>.png 와 CardArt.snippet.luau (에셋 ID는 업로드 후 채운다)
"""
import csv, sys, os
from PIL import Image, ImageEnhance, ImageOps, ImageDraw, ImageFilter

W, H = 512, 384

def grade(img):
    img = ImageOps.fit(img.convert("RGB"), (W, H), method=Image.LANCZOS, centering=(0.5, 0.45))
    img = ImageEnhance.Color(img).enhance(0.88)
    img = ImageEnhance.Contrast(img).enhance(1.06)
    warm = Image.new("RGB", img.size, (255, 238, 205))
    img = Image.blend(img, ImageChops_multiply(img, warm), 0.35)
    # 비네팅
    mask = Image.new("L", img.size, 0)
    d = ImageDraw.Draw(mask)
    d.ellipse((-W * 0.25, -H * 0.25, W * 1.25, H * 1.25), fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(70))
    dark = Image.new("RGB", img.size, (20, 16, 12))
    return Image.composite(img, dark, mask.point(lambda v: 150 + v * 105 // 255))

def ImageChops_multiply(a, b):
    from PIL import ImageChops
    return ImageChops.multiply(a, b)

def main(src, table, out):
    os.makedirs(out, exist_ok=True)
    lines = ["-- 업로드 후 image의 0을 실제 에셋 ID로 바꾼다.\n"]
    with open(table, encoding="utf-8") as f:
        for row in csv.DictReader(f):
            img = grade(Image.open(os.path.join(src, row["file"])))
            img.save(os.path.join(out, row["card_id"] + ".png"))
            lines.append('\t%s = { image = "rbxassetid://0", credit = "%s", license = "%s" },\n' % (row["card_id"], row["credit"].replace('"', "'"), row["license"]))
            print("ok", row["card_id"])
    open(os.path.join(out, "CardArt.snippet.luau"), "w", encoding="utf-8").write("".join(lines))

if __name__ == "__main__":
    main(*sys.argv[1:4])
