--!nonstrict
-- 전투 카드 수집책: 시작 자동 덱 → 퀘스트·발견·탐험·보물상자에서 새 카드 → 동·은·금 강화 → 덱 구성.
-- 순수 데이터와 규칙만 다룬다 (서버가 저장하고, 클라이언트는 같은 규칙으로 덱을 다시 짠다).
local BC = (require(script.Parent.BoardingCards) :: any)
local KB = (require(script.Parent.KnowledgeBattle) :: any)

local CB = {}

CB.TIER_NAME = { "동", "은", "금" }
CB.MIN_DECK, CB.MAX_DECK = 15, 30
CB.MAX_HEROES, CB.MAX_SPECIALS = 3, 6
-- 강화: 같은 카드의 남는 장수와 코인이 든다. 단계마다 부대 점수 +1.
CB.UPGRADE = { { copies = 2, coins = 120 }, { copies = 3, coins = 320 } } -- 동→은, 은→금

-- 카드는 모두 지식 카드(백과사전)다. 등급 풀: common = 흔함·보통, rare = 희귀·영웅급 아래, hero = 전설
local pools = KB.pools()
CB.BYFIELD = pools.byField
pools.byField = nil
CB.POOLS = pools
CB.STARTER = KB.starter()
-- 획득처마다 나오는 등급 가중치
CB.SOURCES = {
	discover = { common = 70, rare = 28, hero = 2 },
	explore = { common = 60, rare = 35, hero = 5 },
	quest = { common = 30, rare = 55, hero = 15 },
	chest = { common = 20, rare = 55, hero = 25 },
	boss = { common = 0, rare = 40, hero = 60 },
}
CB.SOURCE_NAME = { discover = "발견", explore = "탐험", quest = "퀘스트", chest = "보물상자", boss = "두목 격파" }

local function def(id: string): any
	return BC.Units[id] or BC.Specials[id]
end
CB.def = def

function CB.isHero(id: string): boolean
	local d = def(id)
	return d ~= nil and d.hero == true
end
function CB.isSpecial(id: string): boolean
	local d = BC.Specials[id]
	return d ~= nil
end

-- 시작 수집: 문화권 기본 덱을 그대로 가진다
function CB.new(factionId: string?): any
	local book = { owned = {}, tier = {}, deck = nil }
	for _, id in CB.STARTER do
		book.owned[id] = 1
	end
	return book
end

function CB.grant(book: any, id: string, n: number?)
	if not def(id) then return false end
	book.owned[id] = math.min(9, (book.owned[id] or 0) + (n or 1))
	return true
end

function CB.tierOf(book: any, id: string): number
	return math.clamp(book.tier[id] or 1, 1, 3)
end

-- 가중치에 따라 등급을 고른 뒤 그 등급에서 한 장 (이미 가진 카드는 되도록 피한다)
function CB.roll(source: string, rng: () -> number, book: any?, field: string?): string
	local w = CB.SOURCES[source] or CB.SOURCES.discover
	local total = w.common + w.rare + w.hero
	local r = rng() * total
	local grade = if r < w.common then "common" elseif r < w.common + w.rare then "rare" else "hero"
	local pool = CB.POOLS[grade]
	local pick = pool[math.min(#pool, math.floor(rng() * #pool) + 1)]
	for _ = 1, 12 do
		if not (book and (book.owned[pick] or 0) > 0) then break end
		pick = pool[math.min(#pool, math.floor(rng() * #pool) + 1)]
	end
	return pick
end

-- 새 카드 받기. 반환: 카드 id, 안내 문구
-- 발견한 분야의 지식 카드가 절반쯤 나온다 (천문을 발견하면 천문 카드)
local function fieldPick(book: any, field: string?, rng: () -> number): string?
	local list = field and CB.BYFIELD[field]
	if not list then return nil end
	local pick = list[math.min(#list, math.floor(rng() * #list) + 1)]
	for _ = 1, 12 do
		if (book.owned[pick] or 0) == 0 then return pick end
		pick = list[math.min(#list, math.floor(rng() * #list) + 1)]
	end
	return nil
end

function CB.drop(book: any, source: string, rng: () -> number, field: string?): (string, string)
	local flavored = if rng() < 0.5 then fieldPick(book, field, rng) else nil
	local id = flavored or CB.roll(source, rng, book)
	CB.grant(book, id, 1)
	book.lastGranted = id
	local d = def(id)
	return id, string.format("%s에서 지식 카드 「%s」를 얻었다", CB.SOURCE_NAME[source] or "보상", d.name)
end

-- 이긴 뒤 보상: 서로 다른 카드 3장을 보여 주고 1장을 고른다
CB.BOSS_CARD = { kraken = "boss_kraken", sea_serpent = "boss_serpent", siren = "boss_siren" }

function CB.offer(book: any, source: string, rng: () -> number, field: string?, extra: string?): { string }
	local ids = {}
	if extra and def(extra) then table.insert(ids, extra) end
	local tries = 0
	while #ids < 3 and tries < 60 do
		tries += 1
		local flavored = if #ids <= 1 and rng() < 0.5 then fieldPick(book, field, rng) else nil
		local id = flavored or CB.roll(source, rng, book)
		if not table.find(ids, id) then table.insert(ids, id) end
	end
	book.pick = { ids = ids, source = source }
	return ids
end

function CB.choose(book: any, index: number): (boolean, string)
	local pick = book.pick
	if not pick then return false, "고를 카드가 없어요" end
	local id = pick.ids[index]
	if not id then return false, "잘못된 선택이에요" end
	book.pick = nil
	CB.grant(book, id, 1)
	book.lastGranted = id
	return true, string.format("지식 카드 「%s」를 얻었다", def(id).name)
end

function CB.upgradeInfo(book: any, id: string): any
	local tier = CB.tierOf(book, id)
	local step = CB.UPGRADE[tier]
	if not step or CB.isHero(id) or CB.isSpecial(id) or (def(id) and def(id).knowledge) then
		return nil -- 영웅·특수 카드는 강화하지 않는다
	end
	return { fromTier = tier, copies = step.copies, coins = step.coins, have = book.owned[id] or 0 }
end

-- 강화: 같은 카드를 (필요 장수 + 1)장 가져야 하고, 필요 장수만큼 소모한다 (한 장은 남는다)
function CB.upgrade(book: any, id: string, coins: number): (boolean, string, number)
	local info = CB.upgradeInfo(book, id)
	if not info then return false, "더 강화할 수 없는 카드예요", 0 end
	if (book.owned[id] or 0) < info.copies + 1 then
		return false, string.format("같은 카드가 %d장 더 필요해요", info.copies + 1 - (book.owned[id] or 0)), 0
	end
	if coins < info.coins then return false, "코인이 부족해요", 0 end
	book.owned[id] -= info.copies
	book.tier[id] = info.fromTier + 1
	return true, string.format("%s을(를) %s 단계로 강화했다", def(id).name, CB.TIER_NAME[info.fromTier + 1]), info.coins
end

-- 덱 검사: 보유 장수 이내, 장수 범위, 영웅·특수 한도
function CB.validateDeck(book: any, ids: { string }): (boolean, string)
	if #ids < CB.MIN_DECK then return false, string.format("덱은 최소 %d장이에요", CB.MIN_DECK) end
	if #ids > CB.MAX_DECK then return false, string.format("덱은 최대 %d장이에요", CB.MAX_DECK) end
	local used, heroes, specials = {}, 0, 0
	for _, id in ids do
		if type(id) ~= "string" or not def(id) then return false, "알 수 없는 카드가 있어요" end
		used[id] = (used[id] or 0) + 1
		if used[id] > (book.owned[id] or 0) then return false, def(id).name .. "이(가) 모자라요" end
		if CB.isHero(id) then heroes += 1 end
		if CB.isSpecial(id) then specials += 1 end
	end
	if heroes > CB.MAX_HEROES then return false, string.format("영웅은 %d장까지예요", CB.MAX_HEROES) end
	if specials > CB.MAX_SPECIALS then return false, string.format("특수 카드는 %d장까지예요", CB.MAX_SPECIALS) end
	return true, "ok"
end

function CB.setDeck(book: any, ids: { string }): (boolean, string)
	local ok, msg = CB.validateDeck(book, ids)
	if ok then book.deck = table.clone(ids) end
	return ok, msg
end

-- 실제로 쓸 덱: 저장한 덱이 아직 유효하면 그것, 아니면 문화권 기본 덱(자동)
function CB.deckIds(book: any, factionId: string?): { string }
	if book and book.deck then
		local ok = CB.validateDeck(book, book.deck)
		if ok then return book.deck end
	end
	return CB.autoDeck(book)
end

-- 자동 덱: 가진 카드로 균형 잡힌 덱을 짠다 (모자라면 시작 카드)
function CB.autoDeck(book: any): { string }
	local ids = CB.recommend(book, "balance")
	if ids then return ids end
	return table.clone(CB.STARTER)
end

-- 저장 데이터 정리 (불러올 때): 모르는 카드·이상한 값은 버린다
function CB.sanitize(saved: any, factionId: string?): any
	local book = CB.new(factionId)
	if type(saved) ~= "table" then return book end
	if type(saved.owned) == "table" then
		book.owned = {}
		for id, n in saved.owned do
			local d = type(id) == "string" and def(id)
			if d and (d.knowledge or string.sub(id, 1, 5) == "boss_") and type(n) == "number" and n >= 0 then
				book.owned[id] = math.min(9, math.floor(n))
			end
		end
	end
	for _, id in CB.STARTER do
		book.owned[id] = math.max(1, book.owned[id] or 0)
	end
	if type(saved.tier) == "table" then
		for id, t in saved.tier do
			if type(id) == "string" and def(id) and type(t) == "number" then
				book.tier[id] = math.clamp(math.floor(t), 1, 3)
			end
		end
	end
	if type(saved.pick) == "table" and type(saved.pick.ids) == "table" then
		local ids = {}
		for _, id in saved.pick.ids do
			if type(id) == "string" and def(id) then table.insert(ids, id) end
		end
		if #ids >= 2 and #ids <= 3 then book.pick = { ids = ids, source = "boss" } end
	end
	if type(saved.puzzleDay) == "number" then book.puzzleDay = math.floor(saved.puzzleDay) end
	if saved.practiceDone == true then book.practiceDone = true end
	if type(saved.deck) == "table" then
		local ids = {}
		for _, id in saved.deck do
			if type(id) == "string" then table.insert(ids, id) end
		end
		if CB.validateDeck(book, ids) then book.deck = ids end
	end
	return book
end

-- ── 추천 덱 ──────────────────────────────────────────────────────────────────────
CB.RECOMMEND = {
	rush = { name = "돌격덱", text = "근접 위주. 군기와 무기 상성으로 몰아쳐요" },
	gun = { name = "포격덱", text = "사격·포 위주. 저격수와 장포로 센 카드를 노려요" },
	balance = { name = "운영덱", text = "첩자·치료·회군·순풍으로 오래 버티며 카드를 아껴요" },
}
local ABILITY_SCORE = { bond = 2, morale = 1, spy = 3, medic = 3, armor = 1, snipe = 4 }
local SPECIAL_SCORE = { horn = 6, scorch = 3, decoy = 2, wind = 3, clear = 1, weather = -2 }

local function recommendScore(id, tier, style)
	local d = def(id)
	local score = (d.power or 0) + (tier - 1)
	if d.hero then score += 6 end
	if d.special then score += SPECIAL_SCORE[d.special] or 0 end
	score += ABILITY_SCORE[d.ability or ""] or 0
	if style == "rush" then
		if d.row == "melee" then score += 3 end
		if id == "horn" then score += 2 end
	elseif style == "gun" then
		if d.row == "ranged" or d.row == "cannon" then score += 3 end
		if d.ability == "snipe" or id == "culverin" then score += 3 end
	else
		if d.ability == "spy" or d.ability == "medic" then score += 3 end
		if id == "decoy" or id == "wind" then score += 3 end
	end
	return score
end

-- 보유 카드에서 취향에 맞는 덱을 짠다 (영웅 3·특수 4까지). 카드가 15장도 안 되면 nil.
function CB.recommend(book: any, style: string): { string }?
	local pool = {}
	for id, n in book.owned do
		for k = 1, n do
			table.insert(pool, { id = id, score = recommendScore(id, CB.tierOf(book, id), style) - (k - 1) * 0.3 })
		end
	end
	table.sort(pool, function(a, b)
		if a.score ~= b.score then return a.score > b.score end
		return a.id < b.id
	end)
	local ids, heroes, specials = {}, 0, 0
	for _, c in pool do
		if #ids >= 22 then break end
		if CB.isHero(c.id) then
			if heroes < CB.MAX_HEROES then heroes += 1 table.insert(ids, c.id) end
		elseif CB.isSpecial(c.id) then
			if specials < 4 then specials += 1 table.insert(ids, c.id) end
		else
			table.insert(ids, c.id)
		end
	end
	if #ids < CB.MIN_DECK then return nil end
	return ids
end

-- 덱 저장 칸 3개
CB.SLOTS = 3
function CB.saveSlot(book: any, slot: number, name: string?, ids: { string }): (boolean, string)
	if slot < 1 or slot > CB.SLOTS then return false, "저장 칸이 없어요" end
	local ok, msg = CB.validateDeck(book, ids)
	if not ok then return false, msg end
	book.slots = book.slots or {}
	local label = if type(name) == "string" and utf8.len(name) and utf8.len(name) <= 8 and not string.match(name, "%c") and name ~= "" then name else string.format("덱 %d", slot)
	book.slots[slot] = { name = label, ids = table.clone(ids) }
	return true, string.format("「%s」 칸에 덱을 저장했다", label)
end
function CB.useSlot(book: any, slot: number): (boolean, string)
	local sl = book.slots and book.slots[slot]
	if not sl then return false, "비어 있는 칸이에요" end
	local ok, msg = CB.validateDeck(book, sl.ids)
	if not ok then return false, "그 덱은 지금 쓸 수 없어요: " .. msg end
	book.deck = table.clone(sl.ids)
	return true, string.format("「%s」 덱으로 바꿨다", sl.name)
end

-- ───── 학문 숙련 보너스: 지식 카드를 모을수록 같은 계열 병종 카드가 강해진다 ─────
-- 근접 = 인문·사회(철학·언어·신화·예술·유물·유적·교역품), 사격 = 자연과학, 포 = 응용·공학(의학·건축·조선·항해술)
CB.KNOWLEDGE_ROW_OLD = {
	Philosophy = "melee", Language = "melee", Myth = "melee", Art = "melee", Relic = "melee", Site = "melee", Goods = "melee",
	Astronomy = "ranged", Physics = "ranged", Chemistry = "ranged", Geography = "ranged", Weather = "ranged", Botany = "ranged", Zoology = "ranged", Mineral = "ranged",
	Medicine = "cannon", Architecture = "cannon", Shipbuilding = "cannon", Navigation = "cannon",
}
CB.KNOWLEDGE_ROW = KB.FIELD_ROW
CB.KNOWLEDGE_ROW_NAME = { melee = "인문·사회", ranged = "자연과학", cannon = "응용·공학" }
CB.KNOWLEDGE_STEPS = { 15, 40, 80 } -- 발견한 카드가 이만큼이면 줄 보너스 +1 / +2 / +3

-- discovered: { [cardId] = true }, cardsById: KnowledgeCards.ById
function CB.knowledgeCount(discovered, cardsById)
	local n = { melee = 0, ranged = 0, cannon = 0 }
	for id in discovered or {} do
		local card = cardsById[id]
		local row = card and CB.KNOWLEDGE_ROW[card.field]
		if row then
			n[row] += 1
		end
	end
	return n
end

function CB.knowledgeBonus(discovered, cardsById)
	local n = CB.knowledgeCount(discovered, cardsById)
	local bonus = {}
	for row, count in n do
		local b = 0
		for _, step in CB.KNOWLEDGE_STEPS do
			if count >= step then b += 1 end
		end
		bonus[row] = b
	end
	return bonus, n
end

return CB
