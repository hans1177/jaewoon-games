--!nonstrict
-- 접현 카드 전투 규칙 (Roblox API 없음: Luau CLI에서 그대로 시험한다).
-- 두 배가 맞닿으면 갑판 위 부대를 카드로 늘어놓고 겨룬다. 3줄(근접·사격·포) × 3판 2선승.
--   병종 상성: 근접 > 포 (접현하면 포는 쓸모없다) / 포 > 사격 (포탄이 총병 무리를 쓸어낸다) / 사격 > 근접 (다가오는 칼잡이를 쏜다)
--   유리한 상대 줄이 있으면 내 줄 합계 ×1.3, 나를 이기는 상대 줄이 있으면 ×0.85
--   무기 상성(근접끼리): 검 > 도끼 > 창 > 검, 유리하면 +1 / 불리하면 -1
--   능력: 결속(같은 이름끼리 곱) · 사기(같은 줄 +1) · 첩자(적 줄에 놓고 2장 뽑기) · 치료(버린 카드 되살림) · 영웅(날씨·소각·사기 면역)
--   특수: 소각(가장 센 비영웅 제거) · 안개/폭풍/혼전(줄 하나를 1로) · 맑음(날씨 해제)
local B = {}

B.ROWS = { "melee", "ranged", "cannon" }
B.ROW_NAME = { melee = "근접", ranged = "사격", cannon = "포" }
B.ROW_BEATS = { melee = "cannon", cannon = "ranged", ranged = "melee" }
B.WEAPON_BEATS = { sword = "axe", axe = "spear", spear = "sword" }
B.ADV, B.DIS = 1.3, 0.85
B.HAND = 10

-- 병종: row, power, weapon, ability
B.Units = {
	swordsman = { id = "swordsman", name = "검객", row = "melee", power = 4, weapon = "sword" },
	axeman = { id = "axeman", name = "도끼병", row = "melee", power = 5, weapon = "axe" },
	pikeman = { id = "pikeman", name = "창병", row = "melee", power = 3, weapon = "spear", ability = "bond" },
	shieldman = { id = "shieldman", name = "방패병", row = "melee", power = 2, weapon = "sword", ability = "morale" },
	boatswain = { id = "boatswain", name = "갑판장", row = "melee", power = 3, weapon = "sword", ability = "morale" },
	surgeon = { id = "surgeon", name = "선의", row = "melee", power = 1, weapon = "sword", ability = "medic" },
	musketeer = { id = "musketeer", name = "총병", row = "ranged", power = 5, weapon = "gun", ability = "bond" },
	sharpshooter = { id = "sharpshooter", name = "명사수", row = "ranged", power = 6, weapon = "gun" },
	scout = { id = "scout", name = "척후병", row = "ranged", power = 2, weapon = "gun", ability = "spy" },
	gunner = { id = "gunner", name = "포수", row = "cannon", power = 4, weapon = "cannon", ability = "bond" },
	swivel = { id = "swivel", name = "회전포", row = "cannon", power = 3, weapon = "cannon", ability = "bond" },
	culverin = { id = "culverin", name = "장포", row = "cannon", power = 8, weapon = "cannon" },
	-- 영웅 (주인공·동료·이름난 사람들): 날씨·소각·사기의 영향을 받지 않는다
	hero_blade = { id = "hero_blade", name = "백전노장", row = "melee", power = 9, weapon = "sword", hero = true },
	hero_marksman = { id = "hero_marksman", name = "신사수", row = "ranged", power = 9, weapon = "gun", hero = true },
	hero_cannon = { id = "hero_cannon", name = "포술장", row = "cannon", power = 9, weapon = "cannon", hero = true },
	hero_spy = { id = "hero_spy", name = "밀정", row = "ranged", power = 4, weapon = "gun", hero = true, ability = "spy" },
	hero_medic = { id = "hero_medic", name = "명의", row = "melee", power = 3, weapon = "sword", hero = true, ability = "medic" },
	hero_captain = { id = "hero_captain", name = "선장", row = "melee", power = 10, weapon = "sword", hero = true },
	beast = { id = "beast", name = "맹수", row = "melee", power = 7, weapon = "axe" },
}
-- 특수 카드
B.Specials = {
	scorch = { id = "scorch", name = "소각", special = "scorch", text = "가장 센 비영웅 카드를 모두 쓰러뜨린다" },
	fog = { id = "fog", name = "안개", special = "weather", row = "ranged", text = "사격 줄이 모두 1로 줄어든다" },
	storm = { id = "storm", name = "폭풍", special = "weather", row = "cannon", text = "포 줄이 모두 1로 줄어든다" },
	melee_fog = { id = "melee_fog", name = "혼전", special = "weather", row = "melee", text = "근접 줄이 모두 1로 줄어든다" },
	clear = { id = "clear", name = "맑음", special = "clear", text = "모든 날씨를 걷어 낸다" },
}
-- 지도자 능력 (한 판당 한 번)
B.Leaders = {
	draw = { id = "draw", name = "지휘", text = "카드 한 장을 더 뽑는다" },
	clear = { id = "clear", name = "항로 개척", text = "날씨를 걷어 낸다" },
	snipe = { id = "snipe", name = "저격", text = "적의 가장 센 비영웅 카드 하나를 쓰러뜨린다" },
}

local function copy(def)
	local c = {}
	for k, v in def do
		c[k] = v
	end
	return c
end

-- 카드 스킬(해전 카드 패의 skill) → 전투 카드
local SKILL_CARD = {
	command = "hero_captain", volley = "hero_cannon", heal = "hero_medic", focus = "hero_spy", rally = "boatswain", analyze = "scout",
	scout = "scout", beast = "beast", ward = "clear", luck = "scorch", insight = "fog",
}
B.SkillCard = SKILL_CARD
-- 카드 스킬 설명 (개인 카드 창에서 보여 준다)
B.SkillInfo = {
	command = { name = "지휘", text = "카드전에서 영웅 '선장'(10)이 된다" },
	volley = { name = "일제사격", text = "카드전에서 영웅 포(9)가 된다. 지도자 능력: 저격" },
	heal = { name = "응급처치", text = "카드전에서 치료 능력의 영웅이 된다" },
	focus = { name = "기동", text = "카드전에서 첩자 영웅이 된다. 지도자 능력: 항로 개척" },
	rally = { name = "사기 고취", text = "카드전에서 사기 +1을 주는 갑판장이 된다" },
	analyze = { name = "약점 분석", text = "카드전에서 첩자(카드 2장 뽑기)가 된다" },
	scout = { name = "정찰", text = "카드전에서 첩자가 된다" },
	beast = { name = "맹수의 기세", text = "카드전에서 근접 7의 맹수가 된다" },
	ward = { name = "수호", text = "카드전에서 '맑음'(날씨 해제) 특수 카드가 된다" },
	luck = { name = "행운", text = "카드전에서 '소각'(가장 센 비영웅 제거) 특수 카드가 된다" },
	insight = { name = "통찰", text = "카드전에서 '안개'(사격 줄 약화) 특수 카드가 된다" },
}
local SKILL_SPECIAL = { ward = "clear", luck = "scorch", insight = "fog" }

local BASE_ROSTER = { "swordsman", "swordsman", "axeman", "pikeman", "pikeman", "shieldman", "surgeon", "musketeer", "musketeer", "scout", "gunner", "gunner", "swivel", "culverin" }

local function shuffle(list, rng)
	for i = #list, 2, -1 do
		local j = math.floor(rng() * i) + 1
		list[i], list[j] = list[j], list[i]
	end
	return list
end

-- 내 덱: 기본 부대 + 게임에서 얻은 카드(deckCards = view.deck.cards)가 영웅·특수 카드가 된다
function B.playerDeck(deckCards, rng)
	local out = {}
	for _, id in BASE_ROSTER do
		table.insert(out, copy(B.Units[id]))
	end
	local leader = "draw"
	for i, c in deckCards or {} do
		local id = SKILL_CARD[c.skill]
		if id then
			local def = B.Units[id] or B.Specials[id]
			local card = copy(def)
			if card.special then
				card.name = def.name .. "(" .. (c.name or "") .. ")"
			else
				card.name = c.name or card.name
			end
			table.insert(out, card)
		end
		if c.skill == "volley" and leader == "draw" then
			leader = "snipe"
		elseif c.skill == "focus" or c.skill == "scout" then
			leader = if leader == "draw" then "clear" else leader
		end
	end
	return shuffle(out, rng), leader
end

-- 해적 덱: 두목이면 영웅과 대포가 더 많다
function B.enemyDeck(isBoss, rng)
	local ids = { "swordsman", "swordsman", "axeman", "axeman", "pikeman", "pikeman", "pikeman", "surgeon", "musketeer", "musketeer", "sharpshooter", "scout", "scout", "gunner", "gunner", "swivel", "culverin" }
	local out = {}
	for _, id in ids do
		table.insert(out, copy(B.Units[id]))
	end
	table.insert(out, copy(B.Specials.storm))
	if isBoss then
		local boss = copy(B.Units.hero_blade)
		boss.name = "해적 두목"
		boss.power = 11
		table.insert(out, boss)
		table.insert(out, copy(B.Units.culverin))
		table.insert(out, copy(B.Specials.scorch))
	else
		table.insert(out, copy(B.Units.beast))
	end
	return shuffle(out, rng), if isBoss then "snipe" else "draw"
end

local function other(side)
	return if side == "me" then "foe" else "me"
end
B.other = other

function B.newMatch(myDeck, myLeader, foeDeck, foeLeader, rng)
	local m = {
		rows = { me = { melee = {}, ranged = {}, cannon = {} }, foe = { melee = {}, ranged = {}, cannon = {} } },
		hand = { me = {}, foe = {} },
		deck = { me = myDeck, foe = foeDeck },
		grave = { me = {}, foe = {} },
		weather = { melee = false, ranged = false, cannon = false },
		wins = { me = 0, foe = 0 },
		passed = { me = false, foe = false },
		leader = { me = myLeader or "draw", foe = foeLeader or "draw" },
		leaderUsed = { me = false, foe = false },
		turn = "me",
		round = 1,
		over = false,
		winner = nil,
		rng = rng,
		log = {},
	}
	for _, side in { "me", "foe" } do
		for _ = 1, B.HAND do
			local c = table.remove(m.deck[side])
			if c then
				table.insert(m.hand[side], c)
			end
		end
	end
	if rng() < 0.5 then
		m.turn = "foe"
	end
	return m
end

local function logLine(m, text)
	table.insert(m.log, text)
end

-- 줄 합계: 날씨 → 결속 → 사기 → 무기 상성 → 병종 상성 순으로 계산한다
function B.cardPower(m, side, row, idx)
	local list = m.rows[side][row]
	local c = list[idx]
	if not c then
		return 0
	end
	local p = c.power
	if not c.hero then
		if m.weather[row] then
			p = 1
		end
		if c.ability == "bond" then
			local n = 0
			for _, o in list do
				if o.id == c.id then
					n += 1
				end
			end
			p *= math.min(n, 3)
		end
		for j, o in list do
			if j ~= idx and o.ability == "morale" and not o.hero then
				p += 1
			end
		end
		-- 근접끼리 무기 상성
		if row == "melee" and c.weapon and B.WEAPON_BEATS[c.weapon] then
			local foeRow = m.rows[other(side)].melee
			local beats, beaten = false, false
			for _, o in foeRow do
				if o.weapon == B.WEAPON_BEATS[c.weapon] then
					beats = true
				elseif B.WEAPON_BEATS[o.weapon or ""] == c.weapon then
					beaten = true
				end
			end
			if beats and not beaten then
				p += 1
			elseif beaten and not beats then
				p = math.max(1, p - 1)
			end
		end
	end
	return p
end

function B.rowRaw(m, side, row)
	local sum = 0
	for i in m.rows[side][row] do
		sum += B.cardPower(m, side, row, i)
	end
	return sum
end

-- 병종 상성: 내 줄이 이길 수 있는 상대 줄에 카드가 있으면 ×1.3, 나를 이기는 줄이 있으면 ×0.85
function B.rowMatchup(m, side, row)
	local foe = m.rows[other(side)]
	local adv = #foe[B.ROW_BEATS[row]] > 0
	local dis = false
	for r, beaten in B.ROW_BEATS do
		if beaten == row and #foe[r] > 0 then
			dis = true
		end
	end
	local mult = 1
	if adv then
		mult *= B.ADV
	end
	if dis then
		mult *= B.DIS
	end
	return mult, adv, dis
end

function B.rowTotal(m, side, row)
	local raw = B.rowRaw(m, side, row)
	if raw == 0 then
		return 0
	end
	-- 영웅 점수는 상성에 흔들리지 않는다
	local heroSum = 0
	for i, c in m.rows[side][row] do
		if c.hero then
			heroSum += B.cardPower(m, side, row, i)
		end
	end
	local mult = B.rowMatchup(m, side, row)
	return heroSum + math.floor((raw - heroSum) * mult + 0.5)
end

function B.total(m, side)
	local sum = 0
	for _, row in B.ROWS do
		sum += B.rowTotal(m, side, row)
	end
	return sum
end

local function strongestNonHero(m, sides)
	local best, hits = 0, {}
	for _, side in sides do
		for _, row in B.ROWS do
			for i, c in m.rows[side][row] do
				if not c.hero then
					local p = B.cardPower(m, side, row, i)
					if p > best then
						best, hits = p, { { side, row, i } }
					elseif p == best then
						table.insert(hits, { side, row, i })
					end
				end
			end
		end
	end
	return best, hits
end

local function removeHits(m, hits)
	-- 뒤에서부터 지워야 번호가 어긋나지 않는다
	table.sort(hits, function(a, b)
		if a[1] ~= b[1] or a[2] ~= b[2] then
			return false
		end
		return a[3] > b[3]
	end)
	for _, h in hits do
		local c = table.remove(m.rows[h[1]][h[2]], h[3])
		if c then
			table.insert(m.grave[h[1]], c)
		end
	end
end

local function drawCards(m, side, n)
	for _ = 1, n do
		local c = table.remove(m.deck[side])
		if c then
			table.insert(m.hand[side], c)
		end
	end
end

local function nextTurn(m, side)
	if m.over then
		return
	end
	if m.passed[other(side)] then
		m.turn = side
	else
		m.turn = other(side)
	end
end

local function roundEnd(m)
	local a, b = B.total(m, "me"), B.total(m, "foe")
	local winner = nil
	if a > b then
		winner = "me"
		m.wins.me += 1
	elseif b > a then
		winner = "foe"
		m.wins.foe += 1
	else
		m.wins.me += 1
		m.wins.foe += 1
	end
	logLine(m, string.format("%d판 종료: %d 대 %d — %s", m.round, a, b, if winner == "me" then "우리가 이겼다" elseif winner == "foe" then "해적이 이겼다" else "무승부"))
	for _, side in { "me", "foe" } do
		for _, row in B.ROWS do
			for _, c in m.rows[side][row] do
				table.insert(m.grave[side], c)
			end
			m.rows[side][row] = {}
		end
		m.passed[side] = false
	end
	m.weather = { melee = false, ranged = false, cannon = false }
	local result = { round = m.round, me = a, foe = b, winner = winner }
	if m.wins.me >= 2 or m.wins.foe >= 2 or m.round >= 3 then
		m.over = true
		m.winner = if m.wins.me > m.wins.foe then "me" elseif m.wins.foe > m.wins.me then "foe" else "draw"
	else
		m.round += 1
		-- 이긴 쪽이 다음 판 선공 (무승부면 그대로)
		m.turn = winner or m.turn
		-- 한 판 지날 때마다 카드 한 장씩 보충
		drawCards(m, "me", 1)
		drawCards(m, "foe", 1)
	end
	return result
end

-- 카드 내기: 부대는 자기 줄에 (첩자는 적 줄에), 특수 카드는 즉시 발동한다. 반환: ok, 설명, 판이 끝났으면 그 결과
function B.play(m, side, handIdx)
	if m.over or m.turn ~= side or m.passed[side] then
		return false, "지금은 낼 수 없어요"
	end
	local c = m.hand[side][handIdx]
	if not c then
		return false, "그 카드가 없어요"
	end
	table.remove(m.hand[side], handIdx)
	local msg
	if c.special == "scorch" then
		local best, hits = strongestNonHero(m, { "me", "foe" })
		if best >= 6 then
			removeHits(m, hits)
			msg = string.format("소각! 가장 센 카드(%d)가 쓰러졌다", best)
		else
			msg = "소각 — 쓰러뜨릴 만한 카드가 없었다"
		end
		table.insert(m.grave[side], c)
	elseif c.special == "weather" then
		m.weather[c.row] = true
		msg = string.format("%s! %s 줄이 모두 약해졌다", c.name, B.ROW_NAME[c.row])
		table.insert(m.grave[side], c)
	elseif c.special == "clear" then
		m.weather = { melee = false, ranged = false, cannon = false }
		msg = "날씨가 걷혔다"
		table.insert(m.grave[side], c)
	else
		local target = side
		if c.ability == "spy" then
			target = other(side)
		end
		table.insert(m.rows[target][c.row], c)
		msg = string.format("%s을(를) %s 줄에 냈다", c.name, B.ROW_NAME[c.row])
		if c.ability == "spy" then
			drawCards(m, side, 2)
			msg ..= " (첩자: 카드 2장을 뽑았다)"
		elseif c.ability == "medic" then
			local best, bi = nil, nil
			for i, g in m.grave[side] do
				if not g.hero and not g.special and (not best or g.power > best.power) then
					best, bi = g, i
				end
			end
			if best then
				table.remove(m.grave[side], bi)
				table.insert(m.rows[side][best.row], best)
				msg ..= string.format(" (치료: %s 되살림)", best.name)
			end
		end
	end
	logLine(m, (if side == "me" then "우리: " else "해적: ") .. msg)
	nextTurn(m, side)
	local act = { "p", handIdx }
	local result = nil
	if #m.hand[side] == 0 and not m.passed[side] then
		-- 손패가 없으면 자동으로 멈춘다
		m.passed[side] = true
		if m.passed[other(side)] then
			result = roundEnd(m)
		else
			m.turn = other(side)
		end
	end
	return true, msg, result, act
end

function B.pass(m, side)
	if m.over or m.turn ~= side or m.passed[side] then
		return false, "지금은 멈출 수 없어요"
	end
	m.passed[side] = true
	logLine(m, (if side == "me" then "우리: " else "해적: ") .. "이번 판은 여기까지")
	if m.passed[other(side)] then
		return true, "양쪽이 멈췄다", roundEnd(m), { "s" }
	end
	m.turn = other(side)
	return true, "멈췄다", nil, { "s" }
end

function B.useLeader(m, side)
	if m.over or m.turn ~= side or m.leaderUsed[side] then
		return false, "지금은 쓸 수 없어요"
	end
	local id = m.leader[side]
	m.leaderUsed[side] = true
	local msg
	if id == "draw" then
		drawCards(m, side, 1)
		msg = "지휘: 카드를 한 장 더 뽑았다"
	elseif id == "clear" then
		m.weather = { melee = false, ranged = false, cannon = false }
		msg = "항로 개척: 날씨가 걷혔다"
	else
		local best, hits = strongestNonHero(m, { other(side) })
		if best > 0 then
			-- 동점이면 첫 하나만
			removeHits(m, { hits[1] })
			msg = string.format("저격: 상대의 가장 센 카드(%d)를 쓰러뜨렸다", best)
		else
			msg = "저격 — 맞힐 카드가 없었다"
		end
	end
	logLine(m, (if side == "me" then "우리 " else "해적 ") .. msg)
	return true, msg, nil, { "l" }
end

-- 컴퓨터(해적)의 한 수: 이기고 있으면 멈추고, 지고 있으면 가장 효율 좋은 카드를 낸다
function B.ai(m, side)
	if m.over or m.turn ~= side or m.passed[side] then
		return nil
	end
	local foe = other(side)
	local mine, theirs = B.total(m, side), B.total(m, foe)
	-- 상대가 멈췄고 내가 앞서면 바로 멈춰 이긴다
	if m.passed[foe] and mine > theirs then
		return B.pass(m, side)
	end
	-- 두 판을 이겼거나 카드가 아깝다면 크게 앞설 때 멈춘다
	if mine > theirs + 14 and m.wins[side] + m.wins[foe] > 0 then
		return B.pass(m, side)
	end
	if not m.leaderUsed[side] and #m.hand[side] <= 4 and not m.passed[foe] then
		return B.useLeader(m, side)
	end
	-- 점수를 가장 많이 올리는 카드 찾기 (미리 내 보고 계산한 뒤 되돌린다)
	local bestI, bestGain = nil, -1e9
	for i, c in m.hand[side] do
		local gain
		if c.special == "scorch" then
			local best, hits = strongestNonHero(m, { "me", "foe" })
			local lost = 0
			for _, h in hits do
				lost += (if h[1] == side then -1 else 1) * B.cardPower(m, h[1], h[2], h[3])
			end
			gain = if best >= 6 then lost else -5
		elseif c.special == "weather" then
			local before = B.total(m, side) - B.total(m, foe)
			local prev = m.weather[c.row] -- 미리 계산하다 이미 깔린 날씨를 지우지 않도록 원래 값으로 되돌린다
			m.weather[c.row] = true
			local after = B.total(m, side) - B.total(m, foe)
			m.weather[c.row] = prev
			gain = after - before
		elseif c.special == "clear" then
			local before = B.total(m, side) - B.total(m, foe)
			local saved = { melee = m.weather.melee, ranged = m.weather.ranged, cannon = m.weather.cannon }
			m.weather = { melee = false, ranged = false, cannon = false }
			local after = B.total(m, side) - B.total(m, foe)
			m.weather = saved
			gain = after - before
		else
			local target = if c.ability == "spy" then foe else side
			local before = B.total(m, side) - B.total(m, foe)
			table.insert(m.rows[target][c.row], c)
			local after = B.total(m, side) - B.total(m, foe)
			table.remove(m.rows[target][c.row])
			gain = after - before
			if c.ability == "spy" then
				gain += 4 -- 카드 2장을 뽑는 값
			end
			-- 센 카드는 아끼고 작은 카드부터 쓴다 (앞서고 있을 때)
			if mine >= theirs then
				gain -= c.power * 0.4
			end
		end
		if gain > bestGain then
			bestI, bestGain = i, gain
		end
	end
	if not bestI then
		return B.pass(m, side)
	end
	if mine > theirs and bestGain <= 0 then
		return B.pass(m, side)
	end
	return B.play(m, side, bestI)
end


-- ── 해전 카드: 포격전(선체 대 선체)과 접현전을 같은 규칙으로 치른다 ─────────────────────
-- 시드 난수: 클라이언트와 서버가 같은 패·같은 선공으로 시작해, 서버가 기록(actions)만 보고 승패를 다시 계산한다.
function B.seeded(seed)
	local s = (math.floor(tonumber(seed) or 1) % 2147483646) + 1
	return function()
		s = (s * 48271) % 2147483647
		return (s - 1) / 2147483646
	end
end

local ROW_NAMES = {
	boarding = { melee = "근접", ranged = "사격", cannon = "포" },
	gunnery = { melee = "충각", ranged = "소포", cannon = "주포" },
}
-- 화면에 쓰는 줄 이름을 전투 종류에 맞게 바꾼다
function B.useKind(kind)
	for row, name in ROW_NAMES[kind] or ROW_NAMES.boarding do
		B.ROW_NAME[row] = name
	end
end

-- 포격전 덱: 배의 능력(함포 수·포 위력·승조원·충각)이 곧 카드가 된다.
-- f = { cannons, cannonMult, crew, hull, level }
function B.gunneryDeck(f, deckCards, rng, isBoss)
	local out = {}
	local function add(def, n, power, name)
		for _ = 1, n do
			local c = copy(def)
			if power then c.power = power end
			if name then c.name = name end
			table.insert(out, c)
		end
	end
	local cannons = math.max(1, f.cannons or 4)
	local mult = f.cannonMult or 1
	local lvBonus = math.floor((f.level or 1) / 6)
	local gun = math.clamp(math.floor(2 + mult * 2 + lvBonus), 3, 9)
	add(B.Units.gunner, math.clamp(math.floor(cannons / 4 + 0.5), 3, 8), gun, "함포")
	add(B.Units.swivel, 2, math.clamp(gun - 1, 2, 8), "선회포")
	if cannons >= 16 then add(B.Units.culverin, if cannons >= 40 then 2 else 1, gun * 2, "장거리포") end
	local crew = f.crew or 20
	add(B.Units.musketeer, math.clamp(math.floor(crew / 18 + 0.5), 2, 5), 4 + lvBonus, "소총수")
	add(B.Units.sharpshooter, 1, 6 + lvBonus, "저격수")
	add(B.Units.scout, 2, nil, "망루병")
	add(B.Units.swordsman, 2, 5 + lvBonus, "충각 돌격")
	add(B.Units.surgeon, 1, nil, "응급 수리공")
	add(B.Units.shieldman, 1, nil, "방패 갑판병")
	table.insert(out, copy(B.Specials.storm))
	table.insert(out, copy(B.Specials.fog))
	table.insert(out, copy(B.Specials.clear))
	local leader = "draw"
	if deckCards then
		-- 게임에서 얻은 카드(영웅·특수)도 그대로 들어온다
		local extra, lead = B.playerDeck(deckCards, rng)
		for _, c in extra do
			if c.hero or c.special then table.insert(out, c) end
		end
		leader = lead
	end
	if isBoss then
		add(B.Units.culverin, 1, gun * 2 + 2, "괴수의 일격")
		table.insert(out, copy(B.Specials.scorch))
		leader = "snipe"
	end
	return shuffle(out, rng), leader
end

-- 한 판의 시작: 클라이언트(화면)와 서버(검증)가 똑같이 부른다. 시드가 같으면 패·선공이 같다.
--   kind: "gunnery" | "boarding"   my = { fighter, deckCards }   foe = { fighter, boss }
function B.build(kind, seed, my, foe)
	local rng = B.seeded(seed)
	local myDeck, myLeader, foeDeck, foeLeader
	if kind == "gunnery" then
		myDeck, myLeader = B.gunneryDeck(my.fighter or {}, my.deckCards, B.seeded(seed + 7), false)
		foeDeck, foeLeader = B.gunneryDeck(foe.fighter or {}, nil, B.seeded(seed + 13), foe.boss == true)
	else
		myDeck, myLeader = B.playerDeck(my.deckCards, B.seeded(seed + 7))
		foeDeck, foeLeader = B.enemyDeck(foe.boss == true, B.seeded(seed + 13))
	end
	return B.newMatch(shuffle(myDeck, rng), myLeader, shuffle(foeDeck, rng), foeLeader, rng)
end

-- 서버 검증: 시드와 플레이어의 행동 기록으로 한 판을 처음부터 다시 돌린다.
-- 규칙에 어긋나거나 끝나지 않으면 nil. 반환: { winner = "me"|"foe"|"draw", wins = {me, foe} }
function B.replay(kind, seed, my, foe, actions)
	local m = B.build(kind, seed, my, foe)
	local i, guard = 1, 0
	while not m.over do
		guard += 1
		if guard > 400 then return nil end
		if m.turn == "foe" then
			if not B.ai(m, "foe") then return nil end
		else
			local a = actions[i]
			i += 1
			if type(a) ~= "table" then return nil end
			local ok
			if a[1] == "p" then ok = B.play(m, "me", math.floor(tonumber(a[2]) or 0))
			elseif a[1] == "s" then ok = B.pass(m, "me")
			elseif a[1] == "l" then ok = B.useLeader(m, "me")
			end
			if not ok then return nil end
		end
	end
	if actions[i] ~= nil then return nil end
	return { winner = m.winner, wins = { me = m.wins.me, foe = m.wins.foe } }
end

return B
