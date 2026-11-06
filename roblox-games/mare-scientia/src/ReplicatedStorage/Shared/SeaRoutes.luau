--!strict
-- 항구 사이 바닷길(경유점). 실제 해안선에서 계산한 경로를 SeaRoutes1..N 조각에 압축해 두었다.
-- 키: "항구A>항구B"(알파벳순), 값: 위도·경도를 0.05도 단위 정수로 바꾼 차이값 목록.

local CHUNKS: { { [string]: string } } = {
	require(script.Parent.SeaRoutes1),
	require(script.Parent.SeaRoutes2),
	require(script.Parent.SeaRoutes3),
}

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

local M = {}

-- 두 항구 사이 경로를 출발→도착 순서로 돌려준다 (양 끝은 항구 좌표, 없으면 직선).
function M.path(fromId: string, toId: string, ports: any): { { number } }
	local key = if fromId < toId then fromId .. ">" .. toId else toId .. ">" .. fromId
	local r = lookup(key)
	local a, b = ports[fromId], ports[toId]
	local out = { { a.lat, a.lon } }
	if r then
		if fromId < toId then
			for _, p in r do
				table.insert(out, p)
			end
		else
			for i = #r, 1, -1 do
				table.insert(out, r[i])
			end
		end
	end
	table.insert(out, { b.lat, b.lon })
	return out
end

-- 바닷길 길이(km). 경유점 사이 대권거리의 합에 약간의 우회(5%)를 더한다.
function M.lengthKm(fromId: string, toId: string, ports: any): number
	local path = M.path(fromId, toId, ports)
	local total = 0
	for i = 1, #path - 1 do
		local a, b = path[i], path[i + 1]
		local p1, p2 = math.rad(a[1]), math.rad(b[1])
		local dp, dl = math.rad(b[1] - a[1]), math.rad(b[2] - a[2])
		local h = math.sin(dp / 2) ^ 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ^ 2
		total += 2 * 6371 * math.asin(math.min(1, math.sqrt(h)))
	end
	return total * 1.05
end

return M
