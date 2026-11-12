--!nonstrict
-- 지상 탐험 턴제 전술 테스트: 맵 데이터 검사, 규칙(이동·공격·반격·상성·지형·스킬), 승패, 그리고 자동 플레이로 모든 맵이 깰 수 있는지.
local Data = require("./Shared/TacticsData")
local Maps = require("./Shared/TacticsMaps")
local T = require("./Shared/Tactics")
local Sites = require("./Shared/Sites")

local passed, failed = 0, 0
local function check(name, cond, detail)
	if cond then
		passed += 1
	else
		failed += 1
		print("FAIL: " .. name .. (detail and (" -> " .. tostring(detail)) or ""))
	end
end

local function defaultParty(level)
	return {
		{ id = "p1", name = "주인공", class = "swordsman", level = level, skills = { "charge" }, lead = true },
		{ id = "p2", name = "선원 창병", class = "lancer", level = level, skills = { "bulwark" } },
		{ id = "p3", name = "선원 궁수", class = "archer", level = level, skills = { "aim" } },
		{ id = "p4", name = "포수", class = "gunner", level = level, skills = {} },
		{ id = "p5", name = "의사", class = "scholar", level = level, skills = { "first_aid" } },
	}
end

-- 1. 맵 데이터 -------------------------------------------------------------
local function reachableFrom(map, sx, sy)
	local seen = { [sx .. "," .. sy] = true }
	local q = { { sx, sy } }
	while #q > 0 do
		local c = table.remove(q)
		for _, d in { { 1, 0 }, { -1, 0 }, { 0, 1 }, { 0, -1 } } do
			local nx, ny = c[1] + d[1], c[2] + d[2]
			local row = map.rows[ny]
			if row and nx >= 1 and nx <= #row then
				local ch = string.sub(row, nx, nx)
				local t = Data.Terrain[ch]
				local passable = (t and t.cost ~= nil) or string.match(ch, "[%d%u]") ~= nil
				if passable and not seen[nx .. "," .. ny] then
					seen[nx .. "," .. ny] = true
					table.insert(q, { nx, ny })
				end
			end
		end
	end
	return seen
end

check("맵이 12개 이상", #Maps.List >= 12, #Maps.List)
local biomes = {}
for _, m in Maps.List do
	local w = #m.rows[1]
	for y, row in m.rows do
		check(m.id .. " 가로 길이 일정 (줄 " .. y .. ")", #row == w, #row)
	end
	check(m.id .. " 목표 종류가 있음", Data.Objectives[m.objective] ~= nil)
	local slots, searches, goal, foes = 0, 0, 0, 0
	local sx, sy
	for y, row in m.rows do
		for x = 1, #row do
			local ch = string.sub(row, x, x)
			if string.match(ch, "%d") then
				slots += 1
				sx, sy = sx or x, sy or y
			elseif Data.Terrain[ch] == nil then
				if string.match(ch, "%u") then
					foes += 1
					check(m.id .. " 적 글자 " .. ch .. " 정의됨", m.foes[ch] ~= nil and Data.Enemies[m.foes[ch]] ~= nil, ch)
				else
					check(m.id .. " 알 수 없는 글자 " .. ch, false)
				end
			elseif Data.Terrain[ch].search then
				searches += 1
			elseif Data.Terrain[ch].goal then
				goal += 1
			end
		end
	end
	check(m.id .. " 시작 칸 5개", slots == 5, slots)
	check(m.id .. " 조사 지점 3개 이상", searches >= 3, searches)
	check(m.id .. " 적이 있음", foes >= 3, foes)
	if m.objective == "reach" then
		check(m.id .. " 도착 지점이 있음", goal >= 1, goal)
	end
	if m.objective == "boss" then
		local hasBoss = false
		for _, id in m.foes do
			if Data.Enemies[id].boss then
				hasBoss = true
			end
		end
		check(m.id .. " 두목이 있음", hasBoss)
	end
	local seen = reachableFrom(m, sx, sy)
	for y, row in m.rows do
		for x = 1, #row do
			local ch = string.sub(row, x, x)
			if ch == "x" or ch == "G" or string.match(ch, "%u") then
				check(m.id .. " " .. ch .. "(" .. x .. "," .. y .. ") 에 닿을 수 있음", seen[x .. "," .. y] == true)
			end
		end
	end
	biomes[m.biome] = true
end
local nb = 0
for _ in biomes do
	nb += 1
end
check("장소 종류 12가지", nb >= 12, nb)

-- 탐험 지점 연결: 전술 맵이 열리는 지점이 충분하고, 건물 안·바다 지점은 열리지 않는다
local open, closed = 0, 0
for _, site in Sites.Sites do
	if Maps.forSite(site) then
		open += 1
	else
		closed += 1
	end
end
check("전술 탐험이 가능한 지점이 20곳 이상", open >= 20, open)
check("건물 안 지점은 닫혀 있음", closed >= 10, closed)
for _, id in { "london_hospital", "bergen_whale", "gibraltar_strait", "london_lab" } do
	for _, site in Sites.Sites do
		if site.id == id then
			check(id .. " 는 전술 탐험 불가", Maps.forSite(site) == nil)
		end
	end
end
for id, mapId in Maps.SiteOverride do
	local ok = false
	for _, site in Sites.Sites do
		if site.id == id then
			ok = true
		end
	end
	check("특별 지점이 실제 지점 " .. id, ok)
	check("특별 맵이 실제 맵 " .. mapId, Maps.ById[mapId] ~= nil)
end

-- 2. 규칙 ------------------------------------------------------------------
local function emptyBattle(rows, objective)
	local map = { id = "t", name = "t", intro = "", rows = rows, foes = { A = "bandit", B = "bandit_chief", C = "wolf" }, objective = objective or "rout", turnLimit = 10 }
	return T.newBattle(map, defaultParty(1), { enemyLevel = 1, pool = { "c1", "c2" } })
end

do
	local b = emptyBattle({
		"1....A",
		"2.ff..",
		"3.#...",
		"4.....",
		"5.....",
	})
	local lead = T.getUnit(b, "p1")
	local reach = T.reachable(b, lead)
	check("이동: 제자리 포함", reach["1,1"] == 0)
	check("이동: 평지 4칸(이동 5)", reach["5,1"] == 4)
	check("이동: 숲은 비용 2", reach["2,2"] == 2 and reach["3,2"] == 4 and reach["4,2"] == 5, tostring(reach["3,2"]) .. "/" .. tostring(reach["4,2"]))
	check("이동: 벽은 못 감", reach["3,3"] == nil)
	check("이동: 이동력 밖은 못 감", reach["6,1"] == nil)
	local lancer = T.getUnit(b, "p2")
	check("이동: 아군이 선 칸에는 못 멈춤", T.reachable(b, lancer)["1,1"] == nil)
	local corridor = emptyBattle({ "1####", "2....", "3####", "4####", "5####" })
	local rc = T.reachable(corridor, T.getUnit(corridor, "p1"))
	check("이동: 아군 칸은 지나갈 수 있고 멈출 수는 없음", rc["1,2"] == nil and rc["2,2"] == 2, tostring(rc["2,2"]))
end

do
	-- 공격·반격·상성·지형
	local b = emptyBattle({
		"1.A..",
		"2....",
		"3....",
		"4....",
		"5....",
	})
	local sw, ax = T.getUnit(b, "p1"), T.getUnit(b, "e1")
	check("적: 산적은 도끼병", ax.class == "axeman" and ax.team == "enemy")
	ax.x, ax.y = 2, 1
	local dmgSwordVsAxe = T.damage(b, sw, ax, false)
	local lanc = T.getUnit(b, "p2")
	local dmgSpearVsAxe = T.damage(b, lanc, ax, false)
	check("상성: 검은 도끼에 유리(+2)", dmgSwordVsAxe == math.max(1, sw.atk + 2 - ax.def))
	check("상성: 창은 도끼에 불리(-2)", dmgSpearVsAxe == math.max(1, lanc.atk - 2 - ax.def))
	check("상성: 도끼는 창에 유리", T.damage(b, ax, lanc, false) == math.max(1, ax.atk + 2 - lanc.def))
	local ok, msg = T.act(b, "p1", { kind = "attack", targetId = "e1" })
	check("공격: 인접 적 공격 성공", ok, msg)
	check("공격: 적이 피해를 입음", ax.hp < ax.maxHp)
	check("반격: 근접 반격으로 내가 피해", sw.hp < sw.maxHp)
	check("행동 후 다시 행동 불가", select(1, T.act(b, "p1", { kind = "wait" })) == false)
	check("공격 사거리 밖은 거부", select(1, T.act(b, "p2", { kind = "attack", targetId = "e1" })) == false)
	check("거부된 공격은 위치를 바꾸지 않음", lanc.x == 1 and lanc.y == 2)
	-- 지형 방어
	ax.hp, ax.maxHp = 100, 100
	local plain = T.damage(b, sw, ax, false)
	b.tiles[1] = ".h..."
	check("지형: 언덕 위 적은 피해가 줄어듦", T.damage(b, sw, ax, false) == plain - 1 or plain == 1)
end

do
	-- 궁수는 바로 옆을 못 쏘고, 총병은 방어를 무시
	local b = emptyBattle({
		"1.A..",
		"2....",
		"3....",
		"4....",
		"5....",
	})
	local ar, gu, ax = T.getUnit(b, "p3"), T.getUnit(b, "p4"), T.getUnit(b, "e1")
	ax.x, ax.y = 3, 3
	check("궁수: 사거리 2 에서 쏠 수 있음", #T.targetsFrom(b, ar, 1, 3) == 1)
	check("궁수: 바로 옆(1)은 못 쏨", #T.targetsFrom(b, ar, 2, 3) == 0)
	check("총병: 사거리 3", #T.targetsFrom(b, gu, 1, 3) == 1)
	local base = gu.atk - ax.def
	check("총병: 상대 방어 2 무시", T.damage(b, gu, ax, false) == math.max(1, gu.atk - math.max(0, ax.def - 2)), base)
	local doc = T.getUnit(b, "p5")
	check("학자: 적은 공격 못 함", #T.targetsFrom(b, doc, 3, 2) == 0)
	T.getUnit(b, "p2").hp = 5
	T.getUnit(b, "p2").x, T.getUnit(b, "p2").y = 2, 5
	doc.x, doc.y = 1, 5
	local ok = T.act(b, "p5", { kind = "heal", targetId = "p2" })
	check("학자: 아군 치료", ok and T.getUnit(b, "p2").hp > 5)
end

do
	-- 스킬
	local b = emptyBattle({
		"1....",
		"2.A..",
		"3....",
		"4....",
		"5....",
	})
	local sw, e = T.getUnit(b, "p1"), T.getUnit(b, "e1")
	e.x, e.y = 5, 1
	sw.movedDist = 0
	local noCharge = T.damage(b, sw, e, false)
	sw.movedDist = 3
	check("돌격: 3칸 이상 움직이면 공격 +3", T.damage(b, sw, e, false) == noCharge + 3 or noCharge + 3 > sw.atk + 2)
	local wolf = T.makeUnit({ id = "w", class = "wolf", team = "enemy", level = 1 })
	local nat = T.makeUnit({ id = "n", class = "swordsman", team = "player", level = 1, skills = { "naturalist" } })
	local plainSw = T.makeUnit({ id = "n2", class = "swordsman", team = "player", level = 1, skills = {} })
	wolf.x, wolf.y = 3, 3
	check("동물학: 짐승에게 더 큰 피해", T.damage(b, nat, wolf, false) == T.damage(b, plainSw, wolf, false) + 3)
	check("동물학: 짐승에게 덜 맞음", T.damage(b, wolf, nat, false) <= T.damage(b, wolf, plainSw, false))
	local sc = T.makeUnit({ id = "s", class = "swordsman", team = "player", level = 1, skills = { "scout" } })
	check("정찰: 이동 +1", sc.move == plainSw.move + 1)
	local aim = T.makeUnit({ id = "a", class = "archer", team = "player", level = 1, skills = { "aim" } })
	check("조준: 사거리 +1", aim.rangeMax == 3)
end

do
	-- 조사 지점과 도감 발견, 승리 조건
	local b = emptyBattle({
		"1x...",
		"2....",
		"3....",
		"4....",
		"5...A",
	})
	local ok = T.act(b, "p2", { kind = "wait" })
	check("조사 지점에 서지 않으면 발견 없음", ok and #b.found == 0)
	local lead = T.getUnit(b, "p1")
	local ok2 = T.act(b, "p1", { kind = "wait", x = 2, y = 1 })
	check("조사 지점에서 대기하면 카드 발견", ok2 and #b.found == 1 and b.found[1] == "c1", #b.found)
	check("같은 조사 지점은 다시 못 씀", (function()
		lead.acted = false
		T.act(b, "p1", { kind = "wait" })
		return #b.found == 1
	end)())
	check("승리: 적을 모두 처치하면 won", (function()
		for _, u in T.alive(b, "enemy") do
			u.hp = 0
		end
		return T.checkEnd(b) == "won"
	end)())
end

do
	local b = emptyBattle({
		"1....",
		"2....",
		"3....",
		"4....",
		"5...A",
	})
	T.getUnit(b, "p1").hp = 0
	check("패배: 주인공이 쓰러지면 lost", T.checkEnd(b) == "lost")
	local b2 = emptyBattle({ "1.G..", "2....", "3....", "4....", "5...A" }, "reach")
	T.getUnit(b2, "p1").x = 3
	T.getUnit(b2, "p1").y = 1
	T.getUnit(b2, "p1").acted = false
	check("도착 목표: 닿으면 won", (function()
		T.act(b2, "p1", { kind = "wait" })
		return b2.status == "won"
	end)())
	local b3 = emptyBattle({ "1....", "2....", "3....", "4....", "5...A" }, "survive")
	b3.turnLimit = 2
	T.endTurn(b3)
	check("버티기: 제한 턴 안에서는 진행 중", b3.status == "active")
	T.endTurn(b3)
	check("버티기: 제한 턴을 넘기면 won", b3.status == "won")
	local b4 = emptyBattle({ "1....", "2....", "3....", "4....", "5...A" }, "rout")
	b4.turnLimit = 1
	T.endTurn(b4)
	check("제한 턴을 넘기면 lost(섬멸전)", b4.status == "lost")
end

do
	-- 적 턴: 다가오고, 공격하고, 두목은 가만히 기다린다
	local b = emptyBattle({
		"1.........",
		"2.........",
		"3.........",
		"4.........",
		"5........A",
	})
	local e = T.getUnit(b, "e1")
	local d0 = math.abs(e.x - 1) + math.abs(e.y - 3)
	T.endTurn(b)
	check("적 턴: 적이 아군 쪽으로 다가옴", math.abs(e.x - 1) + math.abs(e.y - 3) < d0, e.x .. "," .. e.y)
	check("적 턴 뒤에 다시 플레이어 턴, 턴 번호 증가", b.phase == "player" and b.turn == 2)
	check("새 턴에 행동 가능으로 돌아옴", T.getUnit(b, "p1").acted == false)
	local b2 = emptyBattle({
		"1.........",
		"2.........",
		"3.........",
		"4.........",
		"5........B",
	})
	local boss = T.getUnit(b2, "e1")
	check("두목은 적 두목", boss.boss and boss.ai == "guard")
	T.endTurn(b2)
	check("두목은 멀리 있으면 가만히 있음", boss.x == 10 and boss.y == 5)
	local b3 = emptyBattle({
		"1A........",
		"2.........",
		"3.........",
		"4.........",
		"5.........",
	})
	local near = T.getUnit(b3, "e1")
	T.endTurn(b3)
	local damaged = false
	for _, u in T.alive(b3, "player") do
		if u.hp < u.maxHp then
			damaged = true
		end
	end
	check("적 턴: 가까운 아군을 공격", damaged and near.hp > 0 or damaged)
end

-- 3. 자동 플레이: 모든 맵이 균형 있게 깰 수 있어야 한다 -----------------------
local function dist(ax, ay, bx, by)
	return math.abs(ax - bx) + math.abs(ay - by)
end

local function threatAt(b, x, y)
	local n = 0
	for _, e in T.alive(b, "enemy") do
		if e.ai ~= "guard" or dist(e.x, e.y, x, y) <= e.move + e.rangeMax then
			if dist(e.x, e.y, x, y) <= e.move + e.rangeMax then
				n += 1
			end
		end
	end
	return n
end

local function botTurn(b)
	local order = T.alive(b, "player")
	table.sort(order, function(p, q)
		if p.lead ~= q.lead then
			return not p.lead -- 주인공은 마지막에 움직인다
		end
		return p.id < q.id
	end)
	for _, u in order do
		if b.status ~= "active" then
			return
		end
		local reach = T.reachable(b, u)
		local best, bestScore = nil, -1e9
		for k, c in reach do
			local xs, ys = string.match(k, "^(%d+),(%d+)$")
			local x, y = tonumber(xs), tonumber(ys)
			for _, o in T.targetsFrom(b, u, x, y) do
				local ox, oy, om = u.x, u.y, u.movedDist
				u.x, u.y, u.movedDist = x, y, c
				local score
				if u.heal then
					score = (o.maxHp - o.hp) + 1
				else
					local dmg = T.damage(b, u, o, false)
					local back = 0
					local dd = dist(x, y, o.x, o.y)
					if o.hp > dmg and dd >= o.rangeMin and dd <= o.rangeMax then
						back = T.damage(b, o, u, true)
					end
					local t = T.terrainAt(b, x, y)
					score = math.min(dmg, o.hp) + (if dmg >= o.hp then 50 else 0) - back * 0.8 + (t and t.def or 0) - threatAt(b, x, y) * (if u.lead then 4 else 1.2)
				end
				u.x, u.y, u.movedDist = ox, oy, om
				if score > bestScore then
					bestScore, best = score, { x = x, y = y, kind = if u.heal then "heal" else "attack", targetId = o.id }
				end
			end
		end
		if best then
			T.act(b, u.id, best)
		else
			-- 가장 가까운 적(또는 목표)에 다가간다. 조사 지점도 노린다.
			local goals = {}
			for _, e in T.alive(b, "enemy") do
				table.insert(goals, { e.x, e.y })
			end
			for y = 1, b.h do
				for x = 1, b.w do
					local t = T.terrainAt(b, x, y)
					if t and ((t.goal and b.objective == "reach") or (t.search and not b.searched[x .. "," .. y] and #b.poolLeft > 0 and b.turn > 2 and u.lead == false)) then
						table.insert(goals, { x, y })
					end
				end
			end
			local bk, bd = nil, 1e9
			if u.lead then
				goals = {}
				for _, f in T.alive(b, "player") do
					if f ~= u and not f.heal then
						table.insert(goals, { f.x, f.y })
					end
				end
			end
			for k, _ in reach do
				local xs, ys = string.match(k, "^(%d+),(%d+)$")
				local x, y = tonumber(xs), tonumber(ys)
				for _, g in goals do
					local d = dist(x, y, g[1], g[2])
					if d < bd then
						bd, bk = d, { x = x, y = y }
					end
				end
			end
			if b.objective == "survive" then
				bk = nil
			end
			T.act(b, u.id, { kind = "wait", x = bk and bk.x, y = bk and bk.y })
		end
	end
	if b.status == "active" then
		T.endTurn(b)
	end
end

local winLevels = {}
for _, m in Maps.List do
	local wins, total = 0, 0
	for _, lv in { 1, 3, 5 } do
		local b = T.newBattle(m, defaultParty(lv + 1), { enemyLevel = lv, pool = { "a", "b", "c" } })
		local guard = 0
		while b.status == "active" and guard < 60 do
			botTurn(b)
			guard += 1
		end
		total += 1
		if b.status == "won" then
			wins += 1
		end
		check(m.id .. " Lv" .. lv .. " 전투가 끝남", b.status ~= "active", b.status)
	end
	winLevels[m.id] = wins
	check(m.id .. " 레벨보다 약간 높은 부대로 자동 플레이하면 깰 수 있음", wins >= 2, wins .. "/" .. total)
	if wins < 3 then
		for _, lv in { 1, 3, 5 } do
			local b = T.newBattle(m, defaultParty(lv + 1), { enemyLevel = lv, pool = { "a" } })
			local g = 0
			while b.status == "active" and g < 60 do
				botTurn(b)
				g += 1
			end
			local en = {}
			for _, e in T.alive(b, "enemy") do table.insert(en, e.name .. e.hp) end
			print(string.format("  debug %s Lv%d %s turn=%d alive=%d enemies=%s", m.id, lv, b.status, b.turn, T.survivors(b), table.concat(en, ",")))
		end
	end
	print(string.format("  info: %s 자동 플레이 승리 %d/%d", m.id, wins, total))
end

-- 같은 입력이면 같은 결과(무작위 없음)
do
	local function play()
		local b = T.newBattle(Maps.ById.plain_road, defaultParty(3), { enemyLevel = 2, pool = { "a" } })
		local g = 0
		while b.status == "active" and g < 60 do
			botTurn(b)
			g += 1
		end
		return b.status .. ":" .. b.turn .. ":" .. T.survivors(b)
	end
	check("결정적: 같은 판을 두 번 해도 결과가 같음", play() == play())
end

-- 6. 전투 카드 ------------------------------------------------------------
do
	local BCt = require("./Shared/BoardingCards")
	local allOk = true
	for id in BCt.Units do if not T.cardFx(id, 1) then allOk = false end end
	for id in BCt.Specials do if not T.cardFx(id, 1) then allOk = false end end
	check("카드: 효과표가 모든 카드에 있다", allOk)
	check("카드: 금 단계가 더 강하다", T.cardFx("swordsman", 3).n > T.cardFx("swordsman", 1).n)
	local map = Maps.List[1]
	local b = T.newBattle(map, defaultParty(3), { enemyLevel = 1, pool = {} })
	local deck = { "swordsman", "musketeer", "gunner", "surgeon", "horn", "decoy", "wind", "shieldman", "sniper", "hero_blade", "scout", "scorch", "swivel", "pikeman", "culverin" }
	T.initCards(b, deck, {}, 7)
	check("카드: 손패 5장, 에너지 3", #b.hand == 5 and b.energy == 3 and #b.pile == 10)
	local b2 = T.newBattle(map, defaultParty(3), { enemyLevel = 1, pool = {} })
	T.initCards(b2, deck, {}, 7)
	check("카드: 같은 시드는 같은 손패", table.concat(b.hand, ",") == table.concat(b2.hand, ","))
	b.hand = { "swordsman", "musketeer", "surgeon", "horn" }
	b.energy = 3
	local hero = T.getUnit(b, "p1")
	local foe = T.alive(b, "enemy")[1]
	local base = T.damage(b, hero, foe, false)
	check("카드: 적에게 근접 강화는 못 쓴다", select(1, T.playCard(b, 1, foe.id)) == false)
	check("카드: 근접 카드로 공격 +2", select(1, T.playCard(b, 1, hero.id)) == true and T.damage(b, hero, foe, false) == base + 2 and b.energy == 2 and #b.hand == 3)
	local hp = foe.hp
	check("카드: 사격 카드는 적에게 피해", select(1, T.playCard(b, 1, foe.id)) == true and foe.hp < hp)
	hero.hp = 1
	check("카드: 치료 카드", select(1, T.playCard(b, 1, hero.id)) == true and hero.hp > 1)
	check("카드: 에너지가 모자라면 거절", select(1, T.playCard(b, 1)) == false)
	T.endTurn(b)
	check("카드: 새 턴에 에너지 회복·손패 5장·버프 해제", b.energy == 3 and #b.hand == 5 and hero.buffAtk == nil)
end

print(string.format("전술 테스트: 통과 %d, 실패 %d", passed, failed))
if failed > 0 then
	error("tactics tests failed")
end
