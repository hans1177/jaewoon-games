--!nonstrict
-- 지상 탐험 턴제 전술 규칙(순수 계산). Roblox API 를 쓰지 않아서 서버·클라이언트·테스트가 같은 규칙을 쓴다.
-- 전투 상태(battle)는 숫자·문자·표로만 이루어져 있어 그대로 저장하거나 전송할 수 있다.
-- 무작위 요소가 없다: 같은 입력이면 항상 같은 결과가 나온다 (그래서 미리 보기와 검증이 정확하다).

local Data = require(script.Parent.TacticsData)
local BC = (require(script.Parent.BoardingCards) :: any)

local T = {}

local DIRS = { { 1, 0 }, { -1, 0 }, { 0, 1 }, { 0, -1 } }

local function key(x, y)
	return x .. "," .. y
end

function T.hasSkill(unit, id)
	for _, s in unit.skills do
		if s == id then
			return true
		end
	end
	return false
end

-- 유닛 능력치. level 이 오르면 조금씩 강해진다. power 는 두목 같은 적의 보정(체력·공격).
function T.makeUnit(spec)
	local c = Data.Classes[spec.class]
	assert(c, "unknown class " .. tostring(spec.class))
	local lv = math.max(1, math.floor(spec.level or 1))
	local power = spec.power or 1
	local weapon = Data.PersonalGear.weapon[spec.weaponTier or 1]
	local armor = Data.PersonalGear.armor[spec.armorTier or 1]
	local promotionBonus = if spec.promoted then 1 else 0
	local hp = math.floor((c.hp + 2 * (lv - 1)) * power)
	local unit = {
		id = spec.id,
		name = spec.name or c.name,
		class = spec.class,
		team = spec.team,
		level = lv,
		memberId = spec.memberId,
		hp = hp,
		maxHp = hp,
		atk = math.floor((c.atk + math.floor((lv - 1) * 0.6)) * power) + weapon.atk + promotionBonus,
		def = c.def + armor.def + promotionBonus + math.floor((lv - 1) * 0.4),
		spd = c.spd + math.floor((lv - 1) * 0.3),
		move = math.max(1, c.move + armor.move),
		rangeMin = c.range[1],
		rangeMax = c.range[2],
		weapon = c.weapon,
		skills = table.clone(spec.skills or {}),
		x = spec.x or 0,
		y = spec.y or 0,
		acted = false,
		movedDist = 0,
		boss = spec.boss == true,
		ai = spec.ai,
		beast = c.beast == true,
		heal = if c.heal then c.heal + weapon.heal else nil,
		pierce = c.pierce or 0,
		lead = spec.lead == true,
	}
	if unit.lead then
		-- 주인공이 쓰러지면 패배라서 조금 더 튼튼하다
		unit.maxHp += 10
		unit.hp += 10
		unit.def += 1
	end
	if T.hasSkill(unit, "scout") then
		unit.move += 1
	end
	if T.hasSkill(unit, "aim") and (unit.weapon == "bow" or unit.weapon == "gun") then
		unit.rangeMax += 1
	end
	return unit
end

local function tileAt(b, x, y)
	local row = b.tiles[y]
	if not row then
		return nil
	end
	return string.sub(row, x, x) ~= "" and string.sub(row, x, x) or nil
end

function T.inBounds(b, x, y)
	return x >= 1 and y >= 1 and x <= b.w and y <= b.h
end

function T.terrainAt(b, x, y)
	local ch = tileAt(b, x, y)
	return ch and Data.Terrain[ch] or nil
end

function T.unitAt(b, x, y)
	for _, u in b.units do
		if u.hp > 0 and u.x == x and u.y == y then
			return u
		end
	end
	return nil
end

-- 맵과 편성으로 새 전투를 만든다.
-- map: TacticsMaps 항목, party: {{id,name,class,level,skills,lead}}, opts: {enemyLevel, pool}
function T.newBattle(map, party, opts)
	opts = opts or {}
	local b = {
		mapId = map.id,
		name = map.name,
		intro = map.intro,
		w = #map.rows[1],
		h = #map.rows,
		tiles = {},
		units = {},
		turn = 1,
		phase = "player",
		status = "active",
		objective = map.objective,
		turnLimit = map.turnLimit,
		searched = {},
		found = {},
		poolLeft = table.clone(opts.pool or {}),
		bonusCoins = 0,
		log = {},
	}
	local slots, foes = {}, {}
	for y, row in map.rows do
		local out = {}
		for x = 1, #row do
			local ch = string.sub(row, x, x)
			if string.match(ch, "%d") then
				slots[tonumber(ch)] = { x = x, y = y }
				ch = "."
			elseif string.match(ch, "%u") and Data.Terrain[ch] == nil then
				table.insert(foes, { x = x, y = y, letter = ch })
				ch = "."
			end
			out[x] = ch
		end
		b.tiles[y] = table.concat(out)
	end
	for i, spec in party do
		local slot = slots[i]
		if slot then
			local u = T.makeUnit({
				id = spec.id, name = spec.name, class = spec.class, team = "player", level = spec.level,
				skills = spec.skills, x = slot.x, y = slot.y, lead = spec.lead,
				memberId = spec.memberId, weaponTier = spec.weaponTier, armorTier = spec.armorTier, promoted = spec.promoted,
			})
			table.insert(b.units, u)
		end
	end
	local n = 0
	for _, f in foes do
		local kind = Data.Enemies[map.foes[f.letter]]
		assert(kind, "unknown foe " .. tostring(f.letter) .. " in " .. map.id)
		n += 1
		local u = T.makeUnit({
			id = "e" .. n, name = kind.name, class = kind.class, team = "enemy", level = opts.enemyLevel or 1,
			skills = kind.skills, x = f.x, y = f.y, boss = kind.boss, ai = kind.ai, power = kind.power,
		})
		table.insert(b.units, u)
	end
	return b
end

function T.getUnit(b, id)
	for _, u in b.units do
		if u.id == id then
			return u
		end
	end
	return nil
end

function T.alive(b, team)
	local out = {}
	for _, u in b.units do
		if u.hp > 0 and (team == nil or u.team == team) then
			table.insert(out, u)
		end
	end
	return out
end

-- 갈 수 있는 칸: 칸 → 든 이동력. 적 유닛이 선 칸은 지나갈 수 없고, 아군이 선 칸은 지나갈 수만 있다(멈출 수 없다).
function T.reachable(b, unit)
	local best = { [key(unit.x, unit.y)] = 0 }
	local frontier = { { unit.x, unit.y, 0 } }
	local stop = {}
	while #frontier > 0 do
		-- 비용이 가장 작은 칸부터 (칸 수가 적어서 단순 탐색으로 충분하다)
		local bi = 1
		for i = 2, #frontier do
			if frontier[i][3] < frontier[bi][3] then
				bi = i
			end
		end
		local cur = table.remove(frontier, bi)
		local cx, cy, cc = cur[1], cur[2], cur[3]
		if cc <= (best[key(cx, cy)] or 1e9) then
			for _, d in DIRS do
				local nx, ny = cx + d[1], cy + d[2]
				local t = T.inBounds(b, nx, ny) and T.terrainAt(b, nx, ny)
				if t and t.cost then
					local occ = T.unitAt(b, nx, ny)
					if not occ or occ.team == unit.team then
						local nc = cc + t.cost
						if nc <= unit.move and nc < (best[key(nx, ny)] or 1e9) then
							best[key(nx, ny)] = nc
							table.insert(frontier, { nx, ny, nc })
						end
					end
				end
			end
		end
	end
	for k, c in best do
		local xs, ys = string.match(k, "^(%d+),(%d+)$")
		local x, y = tonumber(xs), tonumber(ys)
		local occ = T.unitAt(b, x, y)
		if not occ or occ == unit then
			stop[k] = c
		end
	end
	return stop
end

local function dist(ax, ay, bx, by)
	return math.abs(ax - bx) + math.abs(ay - by)
end

-- (x,y)에서 공격(또는 치료)할 수 있는 대상 목록
function T.targetsFrom(b, unit, x, y)
	local out = {}
	for _, o in b.units do
		if o.hp > 0 and o ~= unit then
			local d = dist(x, y, o.x, o.y)
			if d >= unit.rangeMin and d <= unit.rangeMax then
				if unit.heal then
					if o.team == unit.team and o.hp < o.maxHp then
						table.insert(out, o)
					end
				elseif o.team ~= unit.team then
					table.insert(out, o)
				end
			end
		end
	end
	return out
end

local function triangle(a, d)
	if Data.WeaponBeats[a.weapon] == d.weapon then
		return Data.TriangleBonus
	elseif Data.WeaponBeats[d.weapon] == a.weapon then
		return -Data.TriangleBonus
	end
	return 0
end

-- 한 번 공격이 주는 피해. isCounter 는 반격 여부. 맞는 쪽의 지형을 반영한다.
function T.damage(b, a, d, isCounter)
	local atk = a.atk + triangle(a, d) + (a.buffAtk or 0)
	if T.hasSkill(a, "charge") and not isCounter and a.movedDist >= 3 then
		atk += 3
	end
	if T.hasSkill(a, "riposte") and isCounter then
		atk += 3
	end
	local dt = T.terrainAt(b, d.x, d.y)
	if T.hasSkill(a, "hawkeye") and dt and dt.def == 0 and not dt.solid then
		atk += 3
	end
	if T.hasSkill(a, "naturalist") and d.beast then
		atk += 3
	end
	local def = d.def + (dt and dt.def or 0) + (d.buffDef or 0)
	if T.hasSkill(d, "bulwark") and dt and dt.def > 0 then
		def += 2
	end
	if T.hasSkill(d, "naturalist") and a.beast then
		def += 2
	end
	local pierce = a.pierce
	if T.hasSkill(a, "geologist") then
		pierce = math.max(pierce, 2)
	end
	def = math.max(0, def - pierce)
	return math.max(1, atk - def)
end

local function addLog(b, text)
	table.insert(b.log, text)
	if #b.log > 80 then
		table.remove(b.log, 1)
	end
end

-- 공격 한 번 + 반격 + 추가타. 일어난 일을 줄글로 돌려준다.
local function resolveAttack(b, a, d)
	local lines = {}
	local function hit(from, to, isCounter)
		local dmg = T.damage(b, from, to, isCounter)
		to.hp = math.max(0, to.hp - dmg)
		table.insert(lines, string.format("%s → %s %d 피해%s", from.name, to.name, dmg, if to.hp <= 0 then " (쓰러짐)" else ""))
	end
	local function canCounter(from, to)
		local dd = dist(from.x, from.y, to.x, to.y)
		return to.hp > 0 and to.atk > 0 and dd >= to.rangeMin and dd <= to.rangeMax and not to.heal
	end
	hit(a, d, false)
	if canCounter(a, d) then
		hit(d, a, true)
	end
	if a.hp > 0 and d.hp > 0 then
		local aFast = a.spd >= d.spd + 4 or T.hasSkill(a, "lucky")
		if aFast then
			hit(a, d, false)
		elseif d.spd >= a.spd + 4 and canCounter(a, d) then
			hit(d, a, true)
		end
	end
	return lines
end

local function reveal(b, unit, msgs)
	local ch = tileAt(b, unit.x, unit.y)
	local t = ch and Data.Terrain[ch]
	if unit.team ~= "player" or not t or not t.search then
		return
	end
	local k = key(unit.x, unit.y)
	if b.searched[k] then
		return
	end
	b.searched[k] = true
	local cardId = table.remove(b.poolLeft, 1)
	if cardId then
		table.insert(b.found, cardId)
		table.insert(msgs, string.format("%s: 조사 지점에서 무언가를 발견했다!", unit.name))
	else
		b.bonusCoins += 20
		table.insert(msgs, string.format("%s: 조사 지점에서 약간의 노잣돈을 찾았다 (+20코인)", unit.name))
	end
end

local function healTarget(unit, target)
	local amount = (unit.heal or 0) + (if T.hasSkill(unit, "field_medic") then 4 else 0)
	local before = target.hp
	target.hp = math.min(target.maxHp, target.hp + amount)
	return target.hp - before
end

-- 승패 판정. 이기거나 졌으면 status 를 바꾼다.
function T.checkEnd(b)
	if b.status ~= "active" then
		return b.status
	end
	local players, enemies = T.alive(b, "player"), T.alive(b, "enemy")
	local leadAlive = false
	for _, u in players do
		if u.lead then
			leadAlive = true
		end
	end
	if #players == 0 or not leadAlive then
		b.status = "lost"
		return b.status
	end
	if b.objective == "rout" and #enemies == 0 then
		b.status = "won"
	elseif b.objective == "boss" then
		local bossAlive = false
		for _, u in enemies do
			if u.boss then
				bossAlive = true
			end
		end
		if not bossAlive then
			b.status = "won"
		end
	elseif b.objective == "reach" then
		for _, u in players do
			local t = T.terrainAt(b, u.x, u.y)
			if t and t.goal then
				b.status = "won"
			end
		end
	end
	if b.status == "active" and b.turn > b.turnLimit then
		b.status = if b.objective == "survive" then "won" else "lost"
	end
	return b.status
end

-- 플레이어 유닛 한 명의 행동: 이동(선택) 후 공격·치료·대기 중 하나. 한 번 행동하면 그 턴은 끝난다.
-- action = { x=, y= (이동할 칸, 없으면 제자리), kind = "attack"|"heal"|"wait", targetId = }
function T.act(b, unitId, action)
	if b.status ~= "active" or b.phase ~= "player" then
		return false, "지금은 행동할 수 없어요"
	end
	local unit = T.getUnit(b, unitId)
	if not unit or unit.team ~= "player" or unit.hp <= 0 then
		return false, "그 유닛은 움직일 수 없어요"
	end
	if unit.acted then
		return false, "이미 행동했어요"
	end
	local kind = action.kind
	if kind ~= "attack" and kind ~= "heal" and kind ~= "wait" then
		return false, "잘못된 행동이에요"
	end
	local tx, ty = unit.x, unit.y
	if action.x ~= nil or action.y ~= nil then
		if type(action.x) ~= "number" or type(action.y) ~= "number" then
			return false, "잘못된 위치예요"
		end
		tx, ty = math.floor(action.x), math.floor(action.y)
	end
	local reach = T.reachable(b, unit)
	local cost = reach[key(tx, ty)]
	if cost == nil then
		return false, "그 칸으로는 갈 수 없어요"
	end
	local msgs = {}
	local startX, startY = unit.x, unit.y
	unit.x, unit.y = tx, ty
	unit.movedDist = cost
	if kind == "attack" or kind == "heal" then
		local target = type(action.targetId) == "string" and T.getUnit(b, action.targetId)
		local ok = false
		if target and target.hp > 0 then
			for _, o in T.targetsFrom(b, unit, tx, ty) do
				if o == target then
					ok = true
				end
			end
		end
		if not ok or (kind == "heal") ~= (unit.heal ~= nil) then
			unit.x, unit.y, unit.movedDist = startX, startY, 0
			return false, "그 대상은 공격할 수 없어요"
		end
		if kind == "heal" then
			local healed = healTarget(unit, target)
			table.insert(msgs, string.format("%s가 %s를 치료했다 (+%d)", unit.name, target.name, healed))
		else
			for _, line in resolveAttack(b, unit, target) do
				table.insert(msgs, line)
			end
		end
	elseif T.hasSkill(unit, "first_aid") then
		for _, o in T.alive(b, "player") do
			if o ~= unit and dist(o.x, o.y, unit.x, unit.y) == 1 and o.hp < o.maxHp then
				local before = o.hp
				o.hp = math.min(o.maxHp, o.hp + 4)
				table.insert(msgs, string.format("%s의 응급처치: %s +%d", unit.name, o.name, o.hp - before))
			end
		end
	end
	if unit.hp > 0 then
		unit.acted = true
		reveal(b, unit, msgs)
	end
	for _, m in msgs do
		addLog(b, m)
	end
	T.checkEnd(b)
	return true, table.concat(msgs, "\n")
end

local function allActed(b)
	for _, u in T.alive(b, "player") do
		if not u.acted then
			return false
		end
	end
	return true
end

function T.allActed(b)
	return allActed(b)
end

-- 모든 플레이어 유닛까지의 이동 비용 지도 (적 AI 가 접근 방향을 정할 때 쓴다. 유닛은 무시하고 지형만 본다)
local function distanceField(b, team)
	local field = {}
	local frontier = {}
	for _, u in b.units do
		if u.hp > 0 and u.team == team then
			field[key(u.x, u.y)] = 0
			table.insert(frontier, { u.x, u.y, 0 })
		end
	end
	while #frontier > 0 do
		local bi = 1
		for i = 2, #frontier do
			if frontier[i][3] < frontier[bi][3] then
				bi = i
			end
		end
		local cur = table.remove(frontier, bi)
		for _, d in DIRS do
			local nx, ny = cur[1] + d[1], cur[2] + d[2]
			local t = T.inBounds(b, nx, ny) and T.terrainAt(b, nx, ny)
			if t and t.cost then
				local nc = cur[3] + t.cost
				if nc < (field[key(nx, ny)] or 1e9) then
					field[key(nx, ny)] = nc
					table.insert(frontier, { nx, ny, nc })
				end
			end
		end
	end
	return field
end

local function enemyAct(b, e, field)
	local reach = T.reachable(b, e)
	local bestScore, bestTile, bestTarget = -1e9, nil, nil
	for k, _ in reach do
		local xs, ys = string.match(k, "^(%d+),(%d+)$")
		local x, y = tonumber(xs), tonumber(ys)
		for _, o in T.targetsFrom(b, e, x, y) do
			local ox, oy = e.x, e.y
			e.x, e.y, e.movedDist = x, y, reach[k]
			local dmg = T.damage(b, e, o, false)
			local back = 0
			local dd = dist(x, y, o.x, o.y)
			if o.hp > dmg and dd >= o.rangeMin and dd <= o.rangeMax then
				back = T.damage(b, o, e, true)
			end
			local t = T.terrainAt(b, x, y)
			e.x, e.y, e.movedDist = ox, oy, 0
			local score = math.min(dmg, o.hp) + (if dmg >= o.hp then 100 else 0) + (if o.lead then 6 else 0) - back * 0.6 + (t and t.def or 0) * 0.7 - reach[k] * 0.05
			if score > bestScore then
				bestScore, bestTile, bestTarget = score, { x, y, reach[k] }, o
			end
		end
	end
	if bestTarget then
		e.x, e.y, e.movedDist = bestTile[1], bestTile[2], bestTile[3]
		for _, line in resolveAttack(b, e, bestTarget) do
			addLog(b, line)
		end
		return
	end
	if e.ai == "guard" then
		return
	end
	-- 가까이 갈 수 없으면 가장 가까운 아군 쪽으로 이동
	local bestD, bestTileMove = field[key(e.x, e.y)] or 1e9, nil
	for k, c in reach do
		local d = field[k] or 1e9
		if d < bestD then
			bestD, bestTileMove = d, k
		end
	end
	if bestTileMove then
		local xs, ys = string.match(bestTileMove, "^(%d+),(%d+)$")
		e.x, e.y = tonumber(xs), tonumber(ys)
	end
end

local function startTurn(b)
	for _, u in b.units do
		if u.buffMove then
			u.move -= u.buffMove
		end
		u.buffAtk, u.buffDef, u.buffMove = nil, nil, nil
	end
	for _, u in T.alive(b, "player") do
		u.acted = false
		u.movedDist = 0
	end
	if b.pile then
		b.energy = T.ENERGY
	end
	T.drawCards(b)
	for _, u in b.units do
		if u.hp > 0 then
			local t = T.terrainAt(b, u.x, u.y)
			if t and t.heal and u.hp < u.maxHp then
				u.hp = math.min(u.maxHp, u.hp + t.heal)
			end
			if T.hasSkill(u, "herbalist") and tileAt(b, u.x, u.y) == "f" and u.hp < u.maxHp then
				u.hp = math.min(u.maxHp, u.hp + 3)
			end
		end
	end
end


-- ── 전투 카드 (해전과 같은 수집책 덱을 지상전 행동으로 쓴다) ────────────────────────────────
-- 손패 5장, 매 턴 에너지 3. 카드는 유닛의 일반 행동(이동·공격)에 더해 쓰는 보조 행동이다.
T.HAND, T.ENERGY = 5, 3

-- 카드 효과표: 줄·능력·특수 카드에 따라 정해진다. tier(1~3)마다 효과 +1.
function T.cardFx(id, tier)
	local d = BC.Units[id] or BC.Specials[id]
	if not d then
		return nil
	end
	local t = math.clamp(tier or 1, 1, 3) - 1
	if d.special == "horn" then
		return { cost = 2, target = "none", text = "모든 아군 공격 +" .. (2 + t), kind = "horn", n = 2 + t, name = d.name }
	elseif d.special == "wind" then
		return { cost = 1, target = "ally", text = "이동 +" .. (2 + t), kind = "wind", n = 2 + t, name = d.name }
	elseif d.special == "decoy" then
		return { cost = 1, target = "ally", text = "한 번 더 행동", kind = "again", n = 1, name = d.name }
	elseif d.special == "scorch" then
		return { cost = 2, target = "none", text = "가장 센 적에게 " .. (6 + 2 * t) .. " 피해", kind = "scorch", n = 6 + 2 * t, name = d.name }
	elseif d.special then
		return { cost = 1, target = "none", text = "안개: 적 방어 -1 (이번 턴)", kind = "fog", n = 1, name = d.name }
	end
	if d.ability == "medic" then
		return { cost = 1, target = "ally", text = "체력 +" .. (6 + 2 * t), kind = "heal", n = 6 + 2 * t, name = d.name }
	elseif d.ability == "morale" then
		return { cost = 1, target = "ally", text = "방어 +" .. (3 + t), kind = "guard", n = 3 + t, name = d.name }
	elseif d.ability == "spy" then
		return { cost = 1, target = "none", text = "카드 2장을 뽑는다", kind = "draw", n = 2, name = d.name }
	elseif d.ability == "armor" then
		return { cost = 1, target = "ally", text = "방어 +" .. (3 + t), kind = "guard", n = 3 + t, name = d.name }
	end
	if d.hero then
		return { cost = 2, target = "enemy", text = (d.power) .. " 피해 (방어 무시)", kind = "smite", n = d.power + t, name = d.name }
	elseif d.row == "melee" then
		return { cost = 1, target = "ally", text = "공격 +" .. (2 + t), kind = "rally", n = 2 + t, name = d.name }
	elseif d.row == "ranged" then
		return { cost = 1, target = "enemy", text = (3 + t) .. " 피해 (어디서나)", kind = "shot", n = 3 + t, name = d.name }
	else
		return { cost = 2, target = "enemy", text = "대상과 옆 적에게 " .. (3 + t) .. " 피해", kind = "blast", n = 3 + t, name = d.name }
	end
end

local function nextRand(b)
	b.cardSeed = (b.cardSeed * 1103515245 + 12345) % 2147483648
	return b.cardSeed / 2147483648
end

-- 덱을 섞어 전투에 붙인다. deckIds: 카드 id 목록, tiers: id -> 단계
function T.initCards(b, deckIds, tiers, seed)
	b.cardSeed = (seed or 12345) % 2147483648
	b.tiers = tiers or {}
	local pile = {}
	for _, id in deckIds do
		if BC.Units[id] or BC.Specials[id] then
			table.insert(pile, id)
		end
	end
	for i = #pile, 2, -1 do
		local j = 1 + math.floor(nextRand(b) * i)
		pile[i], pile[j] = pile[j], pile[i]
	end
	b.pile, b.hand, b.discard = pile, {}, {}
	b.energy = T.ENERGY
	T.drawCards(b, T.HAND)
end

function T.drawCards(b, count)
	if not b.pile then
		return
	end
	count = count or (T.HAND - #b.hand)
	for _ = 1, math.max(0, count) do
		if #b.hand >= 8 then
			break
		end
		if #b.pile == 0 then
			b.pile, b.discard = b.discard, {}
			for i = #b.pile, 2, -1 do
				local j = 1 + math.floor(nextRand(b) * i)
				b.pile[i], b.pile[j] = b.pile[j], b.pile[i]
			end
		end
		local id = table.remove(b.pile)
		if not id then
			break
		end
		table.insert(b.hand, id)
	end
end

-- 카드 한 장 쓰기. target: 유닛 id (카드 효과표의 target 이 ally/enemy 일 때)
function T.playCard(b, index, targetId)
	if b.status ~= "active" or b.phase ~= "player" or not b.hand then
		return false, "지금은 카드를 쓸 수 없어요"
	end
	local id = b.hand[index]
	if not id then
		return false, "그 카드가 없어요"
	end
	local fx = T.cardFx(id, b.tiers and b.tiers[id])
	if b.energy < fx.cost then
		return false, "에너지가 모자라요"
	end
	local target
	if fx.target ~= "none" then
		target = type(targetId) == "string" and T.getUnit(b, targetId)
		if not target or target.hp <= 0 then
			return false, "대상을 골라 주세요"
		end
		if (fx.target == "ally") ~= (target.team == "player") then
			return false, if fx.target == "ally" then "아군을 골라야 해요" else "적을 골라야 해요"
		end
	end
	local msg
	if fx.kind == "rally" then
		target.buffAtk = (target.buffAtk or 0) + fx.n
		msg = string.format("%s: %s 공격 +%d", fx.name, target.name, fx.n)
	elseif fx.kind == "guard" then
		target.buffDef = (target.buffDef or 0) + fx.n
		msg = string.format("%s: %s 방어 +%d", fx.name, target.name, fx.n)
	elseif fx.kind == "heal" then
		local before = target.hp
		target.hp = math.min(target.maxHp, target.hp + fx.n)
		msg = string.format("%s: %s 체력 +%d", fx.name, target.name, target.hp - before)
	elseif fx.kind == "wind" then
		target.move += fx.n
		target.buffMove = (target.buffMove or 0) + fx.n
		msg = string.format("%s: %s 이동 +%d", fx.name, target.name, fx.n)
	elseif fx.kind == "again" then
		if not target.acted then
			return false, "이미 행동한 아군에게만 쓸 수 있어요"
		end
		target.acted = false
		target.movedDist = 0
		msg = string.format("%s: %s가 한 번 더 움직인다", fx.name, target.name)
	elseif fx.kind == "horn" then
		for _, u in T.alive(b, "player") do
			u.buffAtk = (u.buffAtk or 0) + fx.n
		end
		msg = string.format("%s: 아군 모두 공격 +%d", fx.name, fx.n)
	elseif fx.kind == "fog" then
		for _, u in T.alive(b, "enemy") do
			u.buffDef = (u.buffDef or 0) - fx.n
		end
		msg = string.format("%s: 적 방어 -%d", fx.name, fx.n)
	elseif fx.kind == "draw" then
		table.remove(b.hand, index)
		table.insert(b.discard, id)
		b.energy -= fx.cost
		T.drawCards(b, fx.n)
		addLog(b, string.format("%s: 카드 %d장을 뽑았다", fx.name, fx.n))
		return true, string.format("%s: 카드 %d장을 뽑았다", fx.name, fx.n), true
	else
		-- 직접 피해: shot / blast / smite / scorch
		local victims = {}
		if fx.kind == "scorch" then
			local best
			for _, e in T.alive(b, "enemy") do
				if not best or e.hp > best.hp then
					best = e
				end
			end
			if best then
				victims = { best }
			end
		elseif fx.kind == "blast" then
			for _, e in T.alive(b, "enemy") do
				if e == target or dist(e.x, e.y, target.x, target.y) == 1 then
					table.insert(victims, e)
				end
			end
		else
			victims = { target }
		end
		local lines = {}
		for _, v in victims do
			local dmg = if fx.kind == "smite" then fx.n else math.max(1, fx.n - math.max(0, v.def - 4))
			v.hp = math.max(0, v.hp - dmg)
			table.insert(lines, string.format("%s: %s에게 %d 피해%s", fx.name, v.name, dmg, if v.hp <= 0 then " (쓰러짐)" else ""))
		end
		msg = table.concat(lines, "\n")
	end
	table.remove(b.hand, index)
	table.insert(b.discard, id)
	b.energy -= fx.cost
	for line in string.gmatch(msg, "[^\n]+") do
		addLog(b, line)
	end
	T.checkEnd(b)
	return true, msg
end

-- 플레이어 턴을 끝내고 적 턴을 진행한 뒤 다음 턴을 연다.
function T.endTurn(b)
	if b.status ~= "active" or b.phase ~= "player" then
		return false, "지금은 턴을 넘길 수 없어요"
	end
	b.phase = "enemy"
	addLog(b, string.format("— 적의 턴 (%d턴) —", b.turn))
	local field = distanceField(b, "player")
	for _, e in T.alive(b, "enemy") do
		if e.hp > 0 and b.status == "active" then
			enemyAct(b, e, field)
			T.checkEnd(b)
			field = distanceField(b, "player")
		end
	end
	b.turn += 1
	b.phase = "player"
	T.checkEnd(b)
	if b.status == "active" then
		startTurn(b)
		addLog(b, string.format("— %d턴 —", b.turn))
	end
	return true, ""
end

-- 클리어 등급: 제한 턴의 절반 이하 S, 4분의 3 이하 A, 그 밖에 B
function T.rank(b)
	local used = b.turn - 1
	if used <= math.ceil(b.turnLimit * 0.5) then
		return "S"
	elseif used <= math.ceil(b.turnLimit * 0.75) then
		return "A"
	end
	return "B"
end

function T.survivors(b)
	return #T.alive(b, "player")
end

return T
