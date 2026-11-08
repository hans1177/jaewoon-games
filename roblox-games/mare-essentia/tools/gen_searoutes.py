"""실제 해안선(Natural Earth 50m 육지)을 0.125도 래스터로 만들고, 모든 항구 쌍의 바닷길을 A*로 찾아
SeaRoutes.luau(경유점 목록)로 저장한다. 사용: python3 tools/gen_searoutes.py /tmp/land50.json"""
import json, sys, heapq, math, re
from PIL import Image, ImageDraw, ImageFilter
LON0, LON1, LAT0, LAT1 = -12, 22, 35, 62
S = 8
W, H = (LON1 - LON0) * S, (LAT1 - LAT0) * S
img = Image.new("L", (W, H), 0); d = ImageDraw.Draw(img)
j = json.load(open(sys.argv[1]))
pr = lambda ring: [((x - LON0) * S, (LAT1 - y) * S) for x, y in ring]
for f in j["features"]:
    g = f["geometry"]
    for p in (g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]):
        d.polygon(pr(p[0]), fill=255)
        for h in p[1:]: d.polygon(pr(h), fill=0)
land = img.load()
# 항구 목록
src = open("src/ReplicatedStorage/Shared/Ports.luau").read()
ports = {m[0]: (float(m[1]), float(m[2])) for m in re.findall(r'id = "(\w+)", name = "[^"]*", country = "\w+", lat = ([\d.-]+), lon = ([\d.-]+)', src)}
def px(lat, lon): return int((lon - LON0) * S), int((LAT1 - lat) * S)
def ll(x, y): return (LAT1 - (y + 0.5) / S, LON0 + (x + 0.5) / S)
def isw(x, y): return 0 <= x < W and 0 <= y < H and land[x, y] == 0
# 좁은 해협 보정: 래스터가 너무 거칠어 막힌 해협을 물길로 뚫는다
def carve(points, width=2):
    for (la, lo), (lb, lob) in zip(points, points[1:]):
        n = 60
        for i in range(n + 1):
            x, y = px(la + (lb - la) * i / n, lo + (lob - lo) * i / n)
            for dx in range(-width, width + 1):
                for dy in range(-width, width + 1):
                    if 0 <= x + dx < W and 0 <= y + dy < H: land[x + dx, y + dy] = 0
carve([(36.3, -6.4), (35.97, -5.6), (36.0, -4.8)])               # 지브롤터
carve([(56.3, 12.4), (55.9, 12.7), (55.4, 12.8), (54.9, 13.2)])  # 외레순
carve([(57.0, 11.0), (55.6, 10.8), (55.2, 10.8), (54.8, 10.8), (54.6, 11.8), (54.8, 13.2)])  # 벨트 해협
carve([(38.5, 15.5), (38.0, 15.65), (37.6, 15.4)])               # 메시나
def flood(seed):
    seen = {seed}; st = [seed]
    while st:
        n = st.pop()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            m = (n[0] + dx, n[1] + dy)
            if m not in seen and isw(*m): seen.add(m); st.append(m)
    return seen
OCEAN = flood(px(50.0, -10.0))
def nearest_water(x, y):
    for r in range(0, 40):
        best = None
        for dx in range(-r, r + 1):
            for dy in range(-r, r + 1):
                if max(abs(dx), abs(dy)) == r and (x + dx, y + dy) in OCEAN:
                    dd = dx * dx + dy * dy
                    if best is None or dd < best[0]: best = (dd, x + dx, y + dy)
        if best: return best[1], best[2]
cosf = math.cos(math.radians(48))
def astar(a, b):
    h = lambda n: math.hypot(n[0] - b[0], (n[1] - b[1]) / cosf if False else n[1] - b[1])
    openq = [(0, a)]; g = {a: 0}; prev = {}
    while openq:
        _, n = heapq.heappop(openq)
        if n == b: break
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                if dx == dy == 0: continue
                m = (n[0] + dx, n[1] + dy)
                if not isw(*m): continue
                if dx and dy and not (isw(n[0] + dx, n[1]) and isw(n[0], n[1] + dy)): continue
                c = g[n] + math.hypot(dx, dy)
                if c < g.get(m, 1e18):
                    g[m] = c; prev[m] = n
                    heapq.heappush(openq, (c + math.hypot(m[0] - b[0], m[1] - b[1]), m))
    if b not in prev and a != b: return None
    path = [b]
    while path[-1] != a: path.append(prev[path[-1]])
    return path[::-1]
def los(a, b):
    n = int(max(abs(a[0] - b[0]), abs(a[1] - b[1]))) * 2 + 1
    return all(isw(round(a[0] + (b[0] - a[0]) * i / n), round(a[1] + (b[1] - a[1]) * i / n)) for i in range(n + 1))
def smooth(path):
    out = [path[0]]; i = 0
    while i < len(path) - 1:
        j2 = len(path) - 1
        while j2 > i + 1 and not los(path[i], path[j2]): j2 -= 1
        out.append(path[j2]); i = j2
    return out
ids = sorted(ports)
start = {p: nearest_water(*px(*ports[p])) for p in ids}
routes = {}
for i, a in enumerate(ids):
    for b in ids[i + 1:]:
        path = astar(start[a], start[b])
        if not path: print("NO ROUTE", a, b); continue
        pts = smooth(path)
        routes[a + ">" + b] = [ll(*p) for p in pts]
out = "--!strict\n-- 항구 사이 바닷길(경유점). tools/gen_searoutes.py가 실제 해안선에서 계산해 만든다. 키: \"항구A>항구B\"(알파벳순), 값: { 위도, 경도 } 목록.\n\nlocal SeaRoutes: { [string]: { { number } } } = {\n"
for k, v in routes.items():
    out += '\t["%s"] = { %s },\n' % (k, ", ".join("{ %.2f, %.2f }" % p for p in v))
out += "}\n\nlocal M = {}\n\n-- 두 항구 사이 경로를 출발→도착 순서로 돌려준다 (없으면 직선).\nfunction M.path(fromId: string, toId: string, ports: any): { { number } }\n\tlocal key = if fromId < toId then fromId .. \">\" .. toId else toId .. \">\" .. fromId\n\tlocal r = SeaRoutes[key]\n\tif not r then\n\t\tlocal a, b = ports[fromId], ports[toId]\n\t\treturn { { a.lat, a.lon }, { b.lat, b.lon } }\n\tend\n\tif fromId < toId then\n\t\treturn r\n\tend\n\tlocal rev = {}\n\tfor i = #r, 1, -1 do\n\t\ttable.insert(rev, r[i])\n\tend\n\treturn rev\nend\n\nreturn M\n"
open("src/ReplicatedStorage/Shared/SeaRoutes.luau", "w").write(out)
print(len(routes), "routes;", sum(len(v) for v in routes.values()), "points")
