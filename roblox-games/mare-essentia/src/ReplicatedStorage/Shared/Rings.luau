--!strict
-- 파도타기 수동 항해: 항로를 따라 날아오는 바람 고리를 스틱으로 통과한다. 순수 계산이라 로직 테스트로 검증한다.
local Rings = {}

export type Ring = { at: number, lat: number, big: boolean, bonus: boolean, hazard: boolean?, rm: number?, kind: string? }

-- 사건이 나온 구간은 고리가 달라진다(암초=좁은 간격 좌우 지그재그, 폭풍=흔들림, 돌고래·고래=보너스 줄)
local PATTERN_SPAN = 0.16

-- rng: () -> 0~1. count 는 항해 길이에 비례. level 은 난이도 완화(0~1, 선원 숙련도 등).
function Rings.build(rng: () -> number, days: number, eventKind: string?, level: number?): { Ring }
	local count = math.clamp(math.floor(7 + days * 1.3), 8, 24)
	local list: { Ring } = {}
	local lat = 0
	for i = 1, count do
		local at = 0.1 + 0.82 * (i - 1) / math.max(count - 1, 1)
		-- 이전 고리에서 너무 멀지 않게(손가락 한 번에 닿을 거리) 옮긴다
		lat = math.clamp(lat + (rng() * 2 - 1) * 0.7, -0.8, 0.8)
		table.insert(list, { at = at, lat = lat, big = (level or 0) >= 0.5, bonus = false })
	end
	-- 암초: 고리 사이에 끼어 있다. 고리와 반대쪽에 두어 피할 수 있게 한다.
	local rings = #list
	for i = 1, rings - 1, 3 do
		local a, b = list[i], list[i + 1]
		-- 종류: 암초 → 표류 통 → 해적선 → 유령선(뒤로 갈수록 크고 아프다)
		local kinds = { "reef", "barrel", "pirate", "ghost" }
		local kind = kinds[((i - 1) // 3) % #kinds + 1]
		table.insert(list, { at = (a.at + b.at) / 2, lat = if a.lat > 0 then -0.6 else 0.6, big = false, bonus = false, hazard = true, kind = kind })
	end
	if eventKind == "dolphins" or eventKind == "whale" or eventKind == "wreck" or eventKind == "rainbow" then
		-- 가운데 구간에 보너스 고리 줄
		for i = 1, 5 do
			table.insert(list, { at = 0.45 + (i - 1) * 0.03, lat = math.sin(i * 0.9) * 0.5, big = true, bonus = true })
		end
	elseif eventKind == "reef" or eventKind == "storm" or eventKind == "vortex" then
		-- 가운데 구간 고리가 더 촘촘하고 좌우로 크게 흔들린다
		for _, r in list do
			if math.abs(r.at - 0.5) < PATTERN_SPAN then
				r.lat = (if r.lat >= 0 then 1 else -1) * 0.75
			end
		end
	end
	table.sort(list, function(a: Ring, b: Ring): boolean
		return a.at < b.at
	end)
	return list
end

-- 고리를 지났을 때 판정. 배의 옆 위치 shipLat(-1~1)이 고리 중심에서 반지름 안이면 통과.
function Rings.radius(r: Ring): number
	if r.hazard and (r.kind == "pirate" or r.kind == "ghost") then
		return 0.30
	end
	return (if r.big then 0.30 else 0.22) * (r.rm or 1) -- rm: 동료·항해가 효과로 넓어진 판정
end

function Rings.hit(r: Ring, shipLat: number): boolean
	return math.abs(shipLat - r.lat) <= Rings.radius(r)
end

-- 연속 통과(콤보)에 따른 속도 배율: 최대 1.4배. 놓치면 콤보가 끊기고 0.9배가 잠깐 적용된다.
function Rings.speedMult(combo: number): number
	return 1 + math.min(combo, 10) * 0.04
end

export type Tally = { hits: number, total: number, combo: number, best: number, points: number, crashes: number, stun: number, boost: number, items: number }

function Rings.newTally(): Tally
	return { hits = 0, total = 0, combo = 0, best = 0, points = 0, crashes = 0, stun = 0, boost = 0, items = 0 }
end

-- 암초(hazard)는 ok = 피했는가. 부딪히면 콤보가 끊기고 잠깐 느려진다(stun 초).
function Rings.record(t: Tally, r: Ring, ok: boolean)
	if r.hazard then
		if ok then
			t.points += 0.2
		else
			t.crashes += 1
			t.combo = 0
			t.stun = if r.kind == "ghost" then 1.8 elseif r.kind == "pirate" then 1.5 elseif r.kind == "barrel" then 0.8 else 1.2
		end
		return
	end
	t.total += 1
	if ok then
		t.hits += 1
		t.combo += 1
		t.best = math.max(t.best, t.combo)
		t.points += (if r.bonus then 3 else 1) * (1 + math.min(t.combo, 10) * 0.1)
	else
		t.combo = 0
	end
end

-- 줍는 물건: 고리 사이 25%·75% 지점에 놓인다. 점수에는 거의 영향 없고(작은 덤) 속도·회복·행운 연출을 준다.
export type Item = { at: number, lat: number, kind: string }

function Rings.items(rng: () -> number, list: { Ring }): { Item }
	local out: { Item } = {}
	local rings: { Ring } = {}
	for _, r in list do
		if not r.hazard then
			table.insert(rings, r)
		end
	end
	local pool = { "coin", "coin", "coin", "gem", "gem", "bottle", "buoy", "chest" }
	for i = 1, #rings - 1 do
		local a, b = rings[i], rings[i + 1]
		local lat = math.clamp((a.lat + b.lat) / 2 + (rng() * 2 - 1) * 0.45, -0.8, 0.8)
		table.insert(out, { at = a.at + (b.at - a.at) * (0.3 + rng() * 0.4), lat = lat, kind = pool[math.floor(rng() * #pool) + 1] })
	end
	table.sort(out, function(x: Item, y: Item): boolean
		return x.at < y.at
	end)
	return out
end

function Rings.hitItem(it: Item, shipLat: number): boolean
	return math.abs(shipLat - it.lat) <= 0.2
end

-- 물건을 주웠을 때. 점수(콤보 영향 없음)와 효과를 돌려준다: bottle=순풍 3초, buoy=충격 해제, chest=큰 점수
function Rings.pickup(t: Tally, it: Item)
	t.items += 1
	if it.kind == "coin" then
		t.points += 0.5
	elseif it.kind == "gem" then
		t.points += 1.5
	elseif it.kind == "chest" then
		t.points += 4
	elseif it.kind == "bottle" then
		t.boost = 3
	elseif it.kind == "buoy" then
		t.stun = 0
	end
end

-- 최종 점수 0~1
function Rings.score(t: Tally): number
	if t.total == 0 then
		return 0
	end
	return math.clamp(t.hits / t.total - t.crashes * 0.08 + math.min(0.06, t.items * 0.01), 0, 1)
end

-- 별 1~3개
function Rings.stars(score: number): number
	if score >= 0.9 then
		return 3
	elseif score >= 0.6 then
		return 2
	end
	return 1
end

-- 서버가 받는 점수의 보상: 코인 = 항해일수 × 점수² × 12 (상한 있음). 명성은 90% 이상일 때만 +1.
function Rings.reward(days: number, score: number): (number, number)
	local s = math.clamp(score, 0, 1)
	local coins = math.min(300, math.floor(days * s * s * 12))
	return coins, if s >= 0.9 then 1 else 0
end

return Rings
