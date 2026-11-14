--!nonstrict
-- 지식 카드 = 전투 카드. 백과사전 카드 하나하나가 전투 능력(줄·위력·능력)을 가진다.
-- 능력은 카드의 분야·희귀도·id 로만 정해져서(무작위 없음) 저장 데이터가 필요 없고 서버·클라이언트가 똑같이 계산한다.
local KC = require(script.Parent.KnowledgeCards)
local Military = require(script.Parent.MilitaryCards)

local KB = {}

-- 분야 → 전투 줄: 인문·사회 = 근접, 자연과학 = 사격, 응용·공학 = 포
KB.FIELD_ROW = {
	Military = "melee", Philosophy = "melee", Language = "melee", Myth = "melee", Art = "melee", Relic = "melee", Site = "melee", Goods = "melee",
	Astronomy = "ranged", Physics = "ranged", Chemistry = "ranged", Geography = "ranged", Weather = "ranged", Botany = "ranged", Zoology = "ranged", Mineral = "ranged",
	Medicine = "cannon", Architecture = "cannon", Shipbuilding = "cannon", Navigation = "cannon",
}
-- 분야 고유 능력 (위력이 낮은 보조형). 같은 이름끼리 쓰는 결속은 지식 카드가 모두 다른 이름이라 쓰지 않는다.
KB.FIELD_ABILITY = { Medicine = "medic", Language = "spy", Geography = "spy", Philosophy = "morale", Architecture = "armor", Art = "morale" }
-- 희귀한(Rare 이상) 카드 일부는 즉시 효과 카드가 된다 (여섯 장까지 덱에 넣을 수 있다)
KB.FIELD_SPECIAL = { Relic = "scorch", Site = "horn", Navigation = "wind", Weather = "clear", Philosophy = "decoy", Chemistry = "scorch", Astronomy = "wind", Myth = "horn" }
KB.POWER = { Common = { 2, 3, 4 }, Uncommon = { 3, 4, 5 }, Rare = { 5, 6, 6 }, Epic = { 7, 8, 8 }, Legendary = { 9, 10, 10 } }
local WEAPONS = { melee = { "sword", "axe", "spear" }, ranged = { "gun" }, cannon = { "cannon" } }

local function hash(id: string): number
	local h = 7
	for i = 1, #id do
		h = (h * 31 + string.byte(id, i)) % 100003
	end
	return h
end

-- specialTexts: { [kind] = 설명 } (BoardingCards.Specials 에서 가져온다)
function KB.derive(specialTexts: any): (any, any)
	local units, specials = {}, {}
	for _, c in KC.Cards do
		local mil = Military.ById[c.id]
		local row = if mil then mil.row else (KB.FIELD_ROW[c.field] or "ranged")
		local h = hash(c.id)
		local tbl = KB.POWER[c.rarity] or KB.POWER.Common
		local power = tbl[h % #tbl + 1]
		local rare = c.rarity == "Rare" or c.rarity == "Epic" or c.rarity == "Legendary"
		local kind = KB.FIELD_SPECIAL[c.field]
		if mil then
			-- 군사학 카드: 줄·무기·위력·능력을 표에서 그대로 쓴다
			units[c.id] = { id = c.id, name = c.name, row = mil.row, power = mil.power, weapon = mil.weapon, ability = mil.ability,
				hero = c.rarity == "Legendary" or nil, knowledge = true, field = c.field, rarity = c.rarity, region = mil.region }
		elseif kind and rare and c.rarity ~= "Legendary" and h % 7 == 0 then
			specials[c.id] = { id = c.id, name = c.name, special = kind, text = specialTexts[kind], knowledge = true, field = c.field, rarity = c.rarity }
		else
			local weapons = WEAPONS[row]
			local u = { id = c.id, name = c.name, row = row, power = power, weapon = weapons[h % #weapons + 1], knowledge = true, field = c.field, rarity = c.rarity }
			if c.rarity == "Legendary" then
				u.hero = true
			end
			local ab = KB.FIELD_ABILITY[c.field]
			if ab and not u.hero and power <= 5 then
				u.ability = ab
				if ab == "medic" or ab == "spy" then u.power = math.min(power, 3) end
			elseif c.field == "Astronomy" and rare and not u.hero then
				u.ability = "snipe" -- 천문 관측 = 먼 곳의 가장 센 적을 맞힌다
			end
			units[c.id] = u
		end
	end
	return units, specials
end

-- 시작 카드: 흔한 카드를 줄마다 6장씩 18장 (누구나 같은 출발)
function KB.starter(): { string }
	local per, out = { melee = 0, ranged = 0, cannon = 0 }, {}
	for _, c in KC.Cards do
		local row = KB.FIELD_ROW[c.field]
		if c.rarity == "Common" and row and per[row] < 6 and c.field ~= "Military" then
			per[row] += 1
			table.insert(out, c.id)
		end
	end
	return out
end

-- 문화권으로 시작하면 처음부터 가지는 군사학 카드 (줄마다 한 장씩)
function KB.regionStarter(factionId: string?): { string }
	return Military.Starters[factionId or ""] or {}
end

-- 보상 풀(등급별 id 목록, 카드 표 순서 그대로)
function KB.pools(): any
	local p = { common = {}, rare = {}, hero = {}, byField = {} }
	for _, c in KC.Cards do
		local g = if c.rarity == "Legendary" then "hero" elseif c.rarity == "Rare" or c.rarity == "Epic" then "rare" else "common"
		table.insert(p[g], c.id)
		p.byField[c.field] = p.byField[c.field] or {}
		table.insert(p.byField[c.field], c.id)
	end
	return p
end

return KB
