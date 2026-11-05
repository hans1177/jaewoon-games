#!/usr/bin/env python3
"""마력숲 스킬 아이콘 시트(2.5D) 생성기. 5x5 칸 x 200px = 1000x1000.
칸 순서는 client meadowArt.skillCell 과 같다. 외부 모델/자산 없이 직접 그린 오너 승인 UI 아이콘."""
import math, sys
import numpy as np
from scipy import ndimage
from PIL import Image, ImageDraw, ImageFilter, ImageChops

def relief(im, height=20.0, soft=8, spec=.85):
    """알파 경계에서 안쪽으로 볼록하게 솟는 높이맵 → 법선 → 좌상단 조명(난반사+정반사+림).
    평면 도형을 돌출된 2.5D 금속/에나멜 조각처럼 보이게 한다."""
    arr = np.asarray(im).astype(np.float32) / 255
    a = arr[..., 3]
    inside = a > .5
    if not inside.any():
        return im.copy()
    d = ndimage.distance_transform_edt(inside)
    h = 1 - np.exp(-d / max(1, soft))          # 가장자리 둥근 베벨
    # 같은 층 안의 밝기 차이(그라데이션)도 약간 높이로 반영해 결을 살린다.
    lum = arr[..., :3].mean(axis=2)
    h = h * height + ndimage.gaussian_filter(lum, 2) * height * .18
    h = ndimage.gaussian_filter(h, 1.6)
    gy, gx = np.gradient(h)
    n = np.dstack([-gx, -gy, np.ones_like(h)])
    n /= np.linalg.norm(n, axis=2, keepdims=True)
    L = np.array([-.55, -.62, .56]); L /= np.linalg.norm(L)
    V = np.array([0, 0, 1.0])
    H = (L + V); H /= np.linalg.norm(H)
    diff = np.clip((n * L).sum(2), 0, 1)
    specv = np.clip((n * H).sum(2), 0, 1) ** 38 * spec
    rim = (1 - n[..., 2]) ** 2 * .25
    ao = 1 - np.clip(ndimage.gaussian_filter((~inside).astype(np.float32), 6) * .55, 0, .5) * inside
    rgb = arr[..., :3] * (.42 + .78 * diff[..., None]) * ao[..., None] + specv[..., None] + rim[..., None] * .35
    out = np.dstack([np.clip(rgb, 0, 1), a])
    return Image.fromarray((out * 255).astype(np.uint8), "RGBA")

S = 800  # 칸당 작업 해상도(최종 200으로 줄임)
U = S / 100.0
LIGHT = (-0.7, -0.7)

def lerp(a, b, t): return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))
def shade(c, k): return tuple(max(0, min(255, int(v * k))) for v in c)

class Cell:
    def __init__(self, tint):
        self.tint = tint
        self.img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
        self.build_medallion()
        # [2.5D] 메달리온은 base, 그림(도형)은 별도 층에 그려 높이맵 조명을 입힌다.
        self.base = self.img
        self.img = Image.new("RGBA", (S, S), (0, 0, 0, 0))

    # ---------- 메달리온 ----------
    def build_medallion(self):
        im = self.img
        cx = cy = S / 2
        R = S * 0.485
        # 외곽 그림자
        sh = Image.new("RGBA", (S, S), (0, 0, 0, 0))
        ImageDraw.Draw(sh).ellipse((cx - R, cy - R + 14, cx + R, cy + R + 14), fill=(0, 0, 0, 150))
        im.alpha_composite(sh.filter(ImageFilter.GaussianBlur(10)))
        # 테두리(위=밝게, 아래=어둡게 세로 그라데이션)
        ring = Image.new("RGBA", (S, S), (0, 0, 0, 0))
        g = Image.new("RGB", (S, S))
        gd = ImageDraw.Draw(g)
        top, bot = shade(self.tint, 1.45), shade(self.tint, .5)
        for y in range(S):
            gd.line((0, y, S, y), fill=lerp(top, bot, y / S))
        m = Image.new("L", (S, S), 0)
        ImageDraw.Draw(m).ellipse((cx - R, cy - R, cx + R, cy + R), fill=255)
        ring.paste(g, (0, 0), m)
        im.alpha_composite(ring)
        d = ImageDraw.Draw(im)
        # 테두리 입체 선(좌상 하이라이트 / 우하 음영)
        d.arc((cx - R, cy - R, cx + R, cy + R), 180, 270, fill=(255, 245, 215, 230), width=7)
        d.arc((cx - R, cy - R, cx + R, cy + R), 0, 90, fill=(0, 0, 0, 150), width=7)
        # 안쪽 금테
        r2 = R * 0.86
        d.ellipse((cx - r2, cy - r2, cx + r2, cy + r2), fill=(70, 50, 28, 255))
        r3 = R * 0.83
        gold = Image.new("RGB", (S, S))
        gdd = ImageDraw.Draw(gold)
        for y in range(S):
            gdd.line((0, y, S, y), fill=lerp((250, 215, 140), (120, 80, 36), y / S))
        m3 = Image.new("L", (S, S), 0)
        ImageDraw.Draw(m3).ellipse((cx - r3, cy - r3, cx + r3, cy + r3), fill=255)
        im.paste(gold, (0, 0), m3)
        # 어두운 바닥판 + 방사 그라데이션
        r4 = R * 0.77
        disc = Image.new("RGB", (S, S))
        px = disc.load()
        base = shade(self.tint, .22)
        glow = shade(self.tint, .62)
        for y in range(S):
            for x in range(0, S, 1):
                dd = math.hypot(x - cx * 0.95, y - cy * 1.12) / (S * .5)
                px[x, y] = lerp(glow, (10, 12, 14), min(1, dd * 1.05)) if dd < 1 else (10, 12, 14)
        m4 = Image.new("L", (S, S), 0)
        ImageDraw.Draw(m4).ellipse((cx - r4, cy - r4, cx + r4, cy + r4), fill=255)
        im.paste(disc, (0, 0), m4)
        # 안쪽 음영(위쪽이 파인 느낌)
        inner = Image.new("RGBA", (S, S), (0, 0, 0, 0))
        ImageDraw.Draw(inner).arc((cx - r4, cy - r4, cx + r4, cy + r4), 180, 360, fill=(0, 0, 0, 170), width=10)
        im.alpha_composite(inner.filter(ImageFilter.GaussianBlur(4)))
        self.glyph_r = r4

    # ---------- 도형 ----------
    def P(self, pts):
        return [(x * U, y * U) for x, y in pts]

    def poly(self, pts, c1, c2, depth=3, outline=True, shadow=True):
        """위(c1)→아래(c2) 그라데이션 + 압출 두께 + 좌상 하이라이트 모서리."""
        pts = self.P(pts)
        layer = Image.new("RGBA", (S, S), (0, 0, 0, 0))
        dl = ImageDraw.Draw(layer)
        side = shade(c2, .45)
        for k in range(int(depth * U * .5), 0, -1):
            dl.polygon([(x + k * .55, y + k) for x, y in pts], fill=side + (255,))
        ys = [p[1] for p in pts]
        y0, y1 = min(ys), max(ys)
        g = Image.new("RGB", (S, S))
        gd = ImageDraw.Draw(g)
        for y in range(int(y0), int(y1) + 1):
            gd.line((0, y, S, y), fill=lerp(c1, c2, (y - y0) / max(1, y1 - y0)))
        m = Image.new("L", (S, S), 0)
        ImageDraw.Draw(m).polygon(pts, fill=255)
        layer.paste(g, (0, 0), m)
        if outline:
            n = len(pts)
            for i in range(n):
                a, b = pts[i], pts[(i + 1) % n]
                ex, ey = b[0] - a[0], b[1] - a[1]
                ln = math.hypot(ex, ey) or 1
                nx, ny = ey / ln, -ex / ln  # 바깥 법선(시계방향 가정 아님: 양쪽 시험)
                lit = abs(nx * LIGHT[0] + ny * LIGHT[1])
                dot = nx * LIGHT[0] + ny * LIGHT[1]
                col = (255, 250, 230, 230) if dot > .25 else ((0, 0, 0, 200) if dot < -.25 else (30, 25, 20, 200))
                dl.line((a, b), fill=col, width=int(1.4 * U * .5) + 1)
        if shadow:
            sh = Image.new("RGBA", (S, S), (0, 0, 0, 0))
            ImageDraw.Draw(sh).polygon([(x + 5, y + 9) for x, y in pts], fill=(0, 0, 0, 140))
            self.img.alpha_composite(sh.filter(ImageFilter.GaussianBlur(6)))
        self.img.alpha_composite(layer)

    def circle(self, cx, cy, r, c1, c2, glow=None):
        cx, cy, r = cx * U, cy * U, r * U
        if glow:
            gl = Image.new("RGBA", (S, S), (0, 0, 0, 0))
            ImageDraw.Draw(gl).ellipse((cx - r * 1.9, cy - r * 1.9, cx + r * 1.9, cy + r * 1.9), fill=glow + (120,))
            self.img.alpha_composite(gl.filter(ImageFilter.GaussianBlur(r * .8)))
        layer = Image.new("RGB", (S, S))
        px = layer.load()
        x0, x1, y0, y1 = int(cx - r), int(cx + r) + 1, int(cy - r), int(cy + r) + 1
        for y in range(max(0, y0), min(S, y1)):
            for x in range(max(0, x0), min(S, x1)):
                dd = math.hypot(x - (cx - r * .35), y - (cy - r * .4)) / (r * 1.5)
                px[x, y] = lerp(c1, c2, min(1, dd))
        m = Image.new("L", (S, S), 0)
        ImageDraw.Draw(m).ellipse((cx - r, cy - r, cx + r, cy + r), fill=255)
        self.img.paste(layer, (0, 0), m)
        d = ImageDraw.Draw(self.img)
        d.arc((cx - r, cy - r, cx + r, cy + r), 180, 270, fill=(255, 255, 255, 230), width=4)
        d.arc((cx - r, cy - r, cx + r, cy + r), 0, 90, fill=(0, 0, 0, 160), width=4)
        d.ellipse((cx - r * .55, cy - r * .62, cx - r * .15, cy - r * .3), fill=(255, 255, 255, 210))

    def line(self, a, b, col, w):
        d = ImageDraw.Draw(self.img)
        d.line((a[0] * U, a[1] * U, b[0] * U, b[1] * U), fill=col, width=max(1, int(w * U * .5)))

    def arc(self, c, r, a0, a1, col, w):
        d = ImageDraw.Draw(self.img)
        d.arc(((c[0] - r) * U, (c[1] - r) * U, (c[0] + r) * U, (c[1] + r) * U), a0, a1, fill=col, width=max(1, int(w * U * .5)))

    def spark(self, x, y, r, col=(255, 244, 200, 255)):
        d = ImageDraw.Draw(self.img)
        x, y, r = x * U, y * U, r * U
        d.polygon([(x, y - r), (x + r * .25, y - r * .25), (x + r, y), (x + r * .25, y + r * .25),
                   (x, y + r), (x - r * .25, y + r * .25), (x - r, y), (x - r * .25, y - r * .25)], fill=col)

    def out(self, glyph_only=False):
        glyph = relief(self.img, height=26.0, soft=10)
        # 그림자: 오른쪽 아래로 떨어지는 부드러운 그림자(떠 있는 느낌)
        a = np.asarray(self.img)[..., 3].astype(np.float32) / 255
        sh = ndimage.gaussian_filter(ndimage.shift(a, (22, 14), order=0), 12) * .62
        shadow = np.zeros((S, S, 4), np.uint8); shadow[..., 3] = (sh * 255).clip(0, 255).astype(np.uint8)
        out = Image.new("RGBA", (S, S), (0, 0, 0, 0)) if glyph_only else relief(self.base, height=14.0, soft=6, spec=.55)
        out.alpha_composite(Image.fromarray(shadow, "RGBA"))
        out.alpha_composite(glyph)
        return out.resize((200, 200), Image.LANCZOS)

STEEL = ((235, 242, 250), (120, 140, 165))
GOLD = ((255, 226, 150), (176, 122, 48))
WOOD = ((150, 100, 60), (80, 48, 28))
SKIN = ((250, 214, 168), (196, 140, 96))
GHOST = ((120, 220, 190), (50, 130, 110))

# ---------- 도형 모음 ----------
def sword(c, x=50, y=50, ang=-45, scale=1.0, glow=None):
    """대각선 검. ang 는 칼끝 방향 각도."""
    a = math.radians(ang)
    ux, uy = math.cos(a), math.sin(a)
    px, py = -uy, ux
    def pt(t, s): return (x + (ux * t + px * s) * scale, y + (uy * t + py * s) * scale)
    blade = [pt(-6, -4), pt(34, -4), pt(42, 0), pt(34, 4), pt(-6, 4)]
    c.poly(blade, *STEEL, depth=3)
    c.poly([pt(-4, -1), pt(32, -1), pt(32, 1), pt(-4, 1)], (170, 190, 215), (110, 130, 155), depth=0, outline=False, shadow=False)
    c.poly([pt(-8, -12), pt(-4, -12), pt(-4, 12), pt(-8, 12)], *GOLD, depth=3)
    c.poly([pt(-24, -3), pt(-8, -3), pt(-8, 3), pt(-24, 3)], *WOOD, depth=2)
    c.circle(*pt(-27, 0), 4.2 * scale, (255, 236, 170), (170, 120, 50))

def shield(c, cx=50, cy=50, s=1.0, emblem="cross"):
    pts = [(cx - 22 * s, cy - 24 * s), (cx + 22 * s, cy - 24 * s), (cx + 22 * s, cy + 6 * s),
           (cx + 12 * s, cy + 20 * s), (cx, cy + 28 * s), (cx - 12 * s, cy + 20 * s), (cx - 22 * s, cy + 6 * s)]
    c.poly(pts, *GOLD, depth=4)
    inner = [(cx - 17 * s, cy - 19 * s), (cx + 17 * s, cy - 19 * s), (cx + 17 * s, cy + 4 * s),
             (cx + 9 * s, cy + 16 * s), (cx, cy + 22 * s), (cx - 9 * s, cy + 16 * s), (cx - 17 * s, cy + 4 * s)]
    c.poly(inner, (96, 138, 214), (34, 58, 130), depth=0, shadow=False)
    if emblem == "cross":
        c.poly([(cx - 3 * s, cy - 15 * s), (cx + 3 * s, cy - 15 * s), (cx + 3 * s, cy + 16 * s), (cx - 3 * s, cy + 16 * s)], (255, 240, 190), (230, 180, 90), depth=0, shadow=False)
        c.poly([(cx - 13 * s, cy - 6 * s), (cx + 13 * s, cy - 6 * s), (cx + 13 * s, cy), (cx - 13 * s, cy)], (255, 240, 190), (230, 180, 90), depth=0, shadow=False)

def runner(c, x, y, s=1.0, flip=1, col=GHOST, ghosts=3):
    """달리는 사람 실루엣 + 잔상."""
    for i in range(ghosts, 0, -1):
        o = -flip * i * 7 * s
        a = int(70 / i) + 30
        gcol = (shade(col[0], .9), shade(col[1], .9))
        c.poly([(x + o - 5 * s, y - 9 * s), (x + o + 5 * s, y - 9 * s), (x + o + 8 * s, y + 18 * s), (x + o - 8 * s, y + 18 * s)],
               shade(col[0], 1 - i * .18), shade(col[1], 1 - i * .18), depth=0, outline=False, shadow=False)
    c.circle(x, y - 16 * s, 6.5 * s, (230, 250, 240), (110, 180, 160))
    c.poly([(x - 6 * s, y - 8 * s), (x + 6 * s, y - 8 * s), (x + 9 * s, y + 20 * s), (x - 9 * s, y + 20 * s)], (225, 250, 240), (90, 170, 150), depth=3)
    for i in range(3):
        yy = y - 6 + i * 9
        c.line((x - flip * 14 * s, yy), (x - flip * 30 * s, yy), (200, 245, 225, 200), 1.6)

def fist(c, x=50, y=52, s=1.0, flip=1):
    pts = [(x - 15 * s, y - 8 * s), (x + 15 * s, y - 8 * s), (x + 17 * s, y + 8 * s), (x + 6 * s, y + 20 * s), (x - 12 * s, y + 20 * s), (x - 17 * s, y + 6 * s)]
    c.poly(pts, *SKIN, depth=4)
    for i in range(4):
        xx = x - 11 * s + i * 7.5 * s
        c.line((xx, y - 7 * s), (xx, y + 3 * s), (150, 96, 60, 255), 1.6)
    c.poly([(x - 17 * s, y - 2 * s), (x - 24 * s, y + 4 * s), (x - 18 * s, y + 10 * s)], *SKIN, depth=2)

def orb(c, x, y, r, rays=True):
    if rays:
        for i in range(8):
            a = i * math.pi / 4 + .2
            c.line((x + math.cos(a) * (r + 4), y + math.sin(a) * (r + 4)), (x + math.cos(a) * (r + 13), y + math.sin(a) * (r + 13)), (190, 225, 255, 230), 1.8)
    c.circle(x, y, r, (235, 248, 255), (50, 110, 210), glow=(90, 150, 255))

def cross_plus(c):
    c.poly([(42, 28), (58, 28), (58, 42), (72, 42), (72, 58), (58, 58), (58, 72), (42, 72), (42, 58), (28, 58), (28, 42), (42, 42)],
           (190, 255, 205), (40, 170, 90), depth=4)

# ---------- 아이콘 정의 ----------
TINT = {"war": (196, 96, 80), "mag": (96, 150, 220), "def": (214, 176, 96), "mob": (110, 184, 146), "etc": (190, 180, 170)}

def icon(i, glyph_only=False):
    k = {0: "war", 1: "war", 2: "mag", 3: "def", 4: "def", 5: "mob", 6: "mob", 7: "mob", 8: "mag", 9: "mag", 10: "etc",
         11: "war", 12: "war", 13: "war", 14: "war", 15: "war", 16: "mag", 17: "def", 18: "mob"}[i]
    c = Cell(TINT[k])
    if i in (0, 15):
        sword(c, 54, 66, -50, 1.05)
        for j in range(3): c.line((22, 62 - j * 6), (36 - j * 2, 56 - j * 6), (255, 220, 180, 200), 1.6)
        c.spark(72, 28, 7)
    elif i == 1:
        c.arc((50, 50), 31, 20, 330, (255, 190, 100, 255), 3.2)
        c.poly([(70, 30), (80, 42), (66, 44)], (255, 210, 130), (230, 140, 50), depth=1)
        sword(c, 54, 62, -45, .85)
    elif i in (2, 16):
        orb(c, 52, 48, 15)
        if i == 16: c.arc((50, 50), 30, 20, 160, (190, 225, 255, 255), 2.6)
        c.line((22, 76), (40, 62), (190, 225, 255, 210), 2)
    elif i in (3, 17):
        shield(c, 50, 50, 1.05)
    elif i == 4:
        shield(c, 50, 54, .95, emblem=None)
        sword(c, 40, 62, -62, .62)
        sword(c, 62, 62, -118, .62)
        c.spark(72, 26, 6)
    elif i == 5:
        runner(c, 58, 52, 1.0, flip=-1)
    elif i in (6, 18):
        runner(c, 42, 52, 1.0, flip=1)
    elif i == 7:
        c.poly([(40, 30), (62, 30), (62, 56), (76, 62), (76, 74), (36, 74), (36, 56)], (240, 250, 255), (120, 150, 175), depth=4)
        c.poly([(24, 38), (40, 34), (40, 50), (24, 56)], (255, 255, 255), (170, 210, 230), depth=1)
        for j in range(3): c.line((14, 40 + j * 8), (28, 40 + j * 8), (190, 235, 220, 220), 1.6)
    elif i == 8:
        cross_plus(c)
        c.spark(74, 30, 6); c.spark(26, 70, 5, (200, 255, 215, 255))
    elif i == 9:
        c.arc((50, 50), 30, 0, 360, (190, 225, 255, 255), 2.4)
        c.arc((50, 50), 20, 0, 360, (150, 200, 255, 255), 2.4)
        c.circle(50, 50, 8, (235, 248, 255), (60, 120, 220), glow=(90, 150, 255))
        for a in (0, 90, 180, 270):
            r = math.radians(a)
            c.line((50 + math.cos(r) * 34, 50 + math.sin(r) * 34), (50 + math.cos(r) * 42, 50 + math.sin(r) * 42), (220, 240, 255, 255), 2)
    elif i == 10:
        c.poly([(34, 46), (42, 28), (46, 30), (46, 44), (50, 24), (55, 25), (54, 44), (59, 28), (63, 30), (60, 48), (68, 36), (72, 40), (66, 62), (58, 74), (42, 74), (32, 58)], *SKIN, depth=3)
        c.arc((50, 44), 32, 200, 330, (230, 230, 230, 230), 2)
    elif i == 11:
        fist(c, 52, 54, 1.0)
        for j in range(3): c.line((14, 44 + j * 8), (30, 44 + j * 8), (255, 225, 170, 220), 1.6)
        c.spark(76, 30, 6)
    elif i == 12:
        fist(c, 50, 50, 1.0)
        c.arc((50, 46), 30, 200, 340, (255, 205, 120, 255), 3)
        for j in range(3): c.line((38 + j * 12, 78), (38 + j * 12, 88), (255, 225, 170, 220), 1.6)
        c.spark(50, 16, 6)
    elif i == 13:
        c.poly([(34, 58), (54, 40), (70, 48), (62, 62), (46, 74), (30, 72)], *SKIN, depth=4)
        c.poly([(60, 40), (78, 46), (68, 56)], (255, 240, 220), (220, 170, 130), depth=2)
        c.arc((50, 50), 34, 200, 320, (255, 205, 120, 255), 3)
        c.spark(76, 30, 6)
    elif i == 14:
        c.poly([(24, 66), (48, 48), (64, 60), (40, 76)], *SKIN, depth=4)
        c.poly([(64, 52), (78, 42), (84, 58), (72, 66)], (110, 90, 80), (60, 44, 40), depth=3)
        c.arc((46, 56), 28, 220, 330, (255, 205, 120, 255), 3)
        c.spark(28, 30, 6)
    return c.out(glyph_only)

# [2.5D 원화 통일] 화면 HUD와 같은 오너 승인 원화 시트(illustrated-icons.png)의 칸을 그대로 재사용한다.
# (x, y, 좌우반전) — 원화가 없는 스킬(맨손·응수·집중·인사)은 위 생성기에 높이맵 조명을 입혀 쓴다.
PAINTED = {0: (0, 800, False), 15: (0, 800, False), 1: (0, 800, True),
           2: (400, 600, False), 16: (400, 600, False),
           3: (200, 800, False), 17: (200, 800, False),
           5: (600, 600, True), 6: (600, 600, False),
           7: (200, 600, False), 18: (200, 600, False), 8: (0, 400, False)}

def painted(i, src):
    x, y, flip = PAINTED[i]
    cell = src.crop((x, y, x + 200, y + 200))
    return cell.transpose(Image.FLIP_LEFT_RIGHT) if flip else cell

def main(path):
    import os
    src = Image.open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "roblox-games", "fantasy-survival", "illustrated-icons.png")).convert("RGBA")
    sheet = Image.new("RGBA", (1000, 1000), (0, 0, 0, 0))
    # 원화의 금속 원형 테두리만 빌려 빈 틀을 만든다(안쪽은 원화와 같은 어두운 남색 바닥).
    frame = src.crop((200, 600, 400, 800)).copy()
    yy, xx = np.mgrid[0:200, 0:200]
    dist = np.hypot(xx - 100, yy - 100)
    inner = dist < 71
    bg = np.asarray(frame).astype(np.float32)
    glow = np.clip(1 - np.hypot(xx - 92, yy - 86) / 80, 0, 1)[..., None]
    base = np.array([14, 16, 22, 255], np.float32) + glow * np.array([22, 30, 44, 0], np.float32)
    bg[inner] = base[inner]
    frame = Image.fromarray(bg.clip(0, 255).astype(np.uint8), "RGBA")
    for i in range(19):
        if i in PAINTED:
            art = painted(i, src)
        else:
            art = frame.copy()
            art.alpha_composite(icon(i, glyph_only=True))
        sheet.alpha_composite(art, ((i % 5) * 200, (i // 5) * 200))
    sheet.save(path, optimize=True)
    print("saved", path)

if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "skill-icons.png")
