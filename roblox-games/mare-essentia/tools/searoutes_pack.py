"""항로 데이터를 작은 모듈 여러 개(SeaRoutes1..N.luau)에 압축 문자열로 나눠 저장한다.
Roblox 스크립트 크기 한도와 형 검사 복잡도 한도를 피하기 위해서다.
사용: python3 tools/searoutes_pack.py [새항로.json]   (json: {"a>b": [[lat,lon],...]})
형식: 첫 점은 (위도*20, 경도*20) 정수, 이후는 이전 점과의 차이. 쉼표로 이어 붙인다."""
import re, sys, json, glob, os
D = "src/ReplicatedStorage/Shared/"
U = 20
def enc(pts):
    out = []; pl = pn = 0
    for la, lo in pts:
        a, b = round(la * U), round(lo * U)
        out += [a - pl, b - pn]; pl, pn = a, b
    return ",".join(map(str, out))
def dec(s):
    v = [int(x) for x in s.split(",")]
    pts = []; a = b = 0
    for i in range(0, len(v), 2):
        a += v[i]; b += v[i + 1]; pts.append([a / U, b / U])
    return pts
routes = {}
legacy = D + "SeaRoutes.luau"
txt = open(legacy, encoding="utf-8").read()
if "local SeaRoutes: { [string]: { { number } } } = {" in txt:
    for m in re.finditer(r'\["([a-z_>]+)"\] = \{ (.*?) \},\n', txt):
        pts = [[float(a), float(b)] for a, b in re.findall(r"\{ (-?[\d.]+), (-?[\d.]+) \}", m.group(2))]
        routes[m.group(1)] = pts
for f in sorted(glob.glob(D + "SeaRoutes[0-9]*.luau")):
    for m in re.finditer(r'\["([a-z_>]+)"\] = "([^"]*)"', open(f, encoding="utf-8").read()):
        routes[m.group(1)] = dec(m.group(2))
if len(sys.argv) > 1:
    routes.update(json.load(open(sys.argv[1])))
keys = sorted(routes)
N = 3200
chunks = [keys[i:i + N] for i in range(0, len(keys), N)]
for f in glob.glob(D + "SeaRoutes[0-9]*.luau"): os.remove(f)
for i, ch in enumerate(chunks, 1):
    body = "".join('\t["%s"] = "%s",\n' % (k, enc(routes[k])) for k in ch)
    open(D + "SeaRoutes%d.luau" % i, "w", encoding="utf-8").write(
        "--!strict\n-- 항로 데이터 조각(압축). tools/searoutes_pack.py 가 만든다. 직접 고치지 말 것.\nlocal R: { [string]: string } = {\n" + body + "}\n\nreturn R\n")
# 본체
head = txt[:txt.index("local M = {}")] if "local M = {}" in txt else None
body = txt[txt.index("local M = {}"):]
core = '''--!strict
-- 항구 사이 바닷길(경유점). 실제 해안선에서 계산한 경로를 SeaRoutes1..N 조각에 압축해 두었다.
-- 키: "항구A>항구B"(알파벳순), 값: 위도·경도를 0.05도 단위 정수로 바꾼 차이값 목록.

%s
local U = 20
local cache: { [string]: { { number } } } = {}

local function lookup(key: string): { { number } }?
	local hit = cache[key]
	if hit then
		return hit
	end
	for _, chunk in CHUNKS do
		local s = chunk[key]
		if s then
			local pts: { { number } } = {}
			local la, lo = 0, 0
			local vals = string.split(s, ",")
			for i = 1, #vals, 2 do
				la += tonumber(vals[i]) :: number
				lo += tonumber(vals[i + 1]) :: number
				table.insert(pts, { la / U, lo / U })
			end
			cache[key] = pts
			return pts
		end
	end
	return nil
end

''' % ("local CHUNKS: { { [string]: string } } = {\n" + "".join("\trequire(script.Parent.SeaRoutes%d),\n" % i for i in range(1, len(chunks) + 1)) + "}\n")
body = body.replace("local r = SeaRoutes[key]", "local r = lookup(key)")
open(legacy, "w", encoding="utf-8").write(core + body)
print(len(routes), "routes,", len(chunks), "chunks")
