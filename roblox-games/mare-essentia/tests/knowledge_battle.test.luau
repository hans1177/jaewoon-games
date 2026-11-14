--!nonstrict
-- 지식 카드 = 전투 카드 규칙 시험 (logic.test 가 타입 검사 한도에 가까워 따로 둔다)
local KC = require("./Shared/KnowledgeCards")
local BC = require("./Shared/BoardingCards")
local CB = require("./Shared/CardBook")
local KB = require("./Shared/KnowledgeBattle")

local D = {
	Ports = require("./Shared/Ports"),
	PortEras = require("./Shared/PortEras"),
	SeaCards = require("./Shared/SeaCards"),
	Ships = require("./Shared/Ships"),
	CultureRegions = require("./Shared/CultureRegions"),
	Tech = require("./Shared/Tech"),
	Skills = require("./Shared/Skills"),
	Cards = require("./Shared/KnowledgeCards"),
	Sites = require("./Shared/Sites"),
	Scholars = require("./Shared/Scholars"),
	Quests = require("./Shared/Quests"),
	TradeMath = require("./Shared/TradeMath"),
	Careers = require("./Shared/Careers"),
	Voyage = require("./Shared/Voyage"),
	Combat = require("./Shared/Combat"),
	BoardingCards = require("./Shared/BoardingCards"),
	CardBook = require("./Shared/CardBook"),
	Bosses = require("./Shared/Bosses"),
	Specialties = require("./Shared/Specialties"),
	CompanionTalk = require("./Shared/CompanionTalk"),
	Narrative = require("./Shared/Narrative"),
	Gear = require("./Shared/Gear"),
	Bounties = require("./Shared/Bounties"),
	Fields = require("./Shared/Fields"),
	Collection = require("./Shared/Collection"),
	CardArt = require("./Shared/CardArt"),
	Facilities = require("./Shared/Facilities"),
	Story = require("./Shared/Story"),
	Harbor = require("./Shared/Harbor"),
	SeaRoutes = require("./Shared/SeaRoutes"),
	Regions = require("./Shared/Regions"),
	TacticsData = require("./Shared/TacticsData"),
	Tactics = require("./Shared/Tactics"),
	TacticsMaps = require("./Shared/TacticsMaps"),
	KnowledgeTree = require("./Shared/KnowledgeTree"),
	HistoryEvents = require("./Shared/HistoryEvents"),
	Stocks = require("./Shared/Stocks"),
	WorldEvents = require("./Shared/WorldEvents"),
	People = require("./Shared/People"),
	PeopleTalk = require("./Shared/PeopleTalk"),
	PortOrder = require("./Shared/PortOrder"),
	RoomClock = require("./Shared/RoomClock"),
	WonderScenes = require("./Shared/WonderScenes"),
	PortBuildings = require("./Shared/PortBuildings"),
}
local Registry = require("./Services/Registry")(D)
local S = Registry.S
local ctx = { rng = math.random, market = S.MarketClass.new() }
local pass, fail = 0, 0
local function check(name, ok)
	if ok then pass += 1 else fail += 1 print("FAIL: " .. name) end
end

local allOk, heroes, legend, melee, ranged, cannon, specials = true, 0, 0, 0, 0, 0, 0
for _, c in KC.Cards do
	local d = BC.Units[c.id] or BC.Specials[c.id]
	if not d or not d.knowledge or d.name ~= c.name then allOk = false continue end
	if d.hero then heroes += 1 end
	if c.rarity == "Legendary" then legend += 1 end
	if BC.Specials[c.id] then specials += 1 end
	if d.row == "melee" then melee += 1 elseif d.row == "ranged" then ranged += 1 elseif d.row == "cannon" then cannon += 1 end
end
check("지식=전투: 모든 도감 카드가 전투 카드", allOk and #KC.Cards >= 700)
check("지식=전투: 전설 카드는 영웅", heroes == legend and legend > 0)
check("지식=전투: 세 줄이 모두 있다", melee > 50 and ranged > 50 and cannon > 20)
check("지식=전투: 즉시 효과 카드가 있다", specials > 5)
-- 규칙은 결정적이다: 같은 카드는 늘 같은 능력
local u1, s1 = KB.derive({ scorch = "a", wind = "a", clear = "a", horn = "a", decoy = "a" })
local sample = KC.Cards[10].id
local d1 = u1[sample] or s1[sample]
local d2 = BC.Units[sample] or BC.Specials[sample]
check("지식=전투: 능력이 결정적", d1.power == d2.power and d1.row == d2.row)
-- 보상은 지식 카드이고, 가진 카드는 되도록 피한다
local book = CB.new("europe")
local seed = 1
local function r() seed = (seed * 1103515245 + 12345) % 2147483648 return seed / 2147483648 end
local newOnes = 0
for _ = 1, 20 do
	local id = CB.drop(book, "quest", r, "Astronomy")
	if BC.Units[id] and BC.Units[id].knowledge or BC.Specials[id] and BC.Specials[id].knowledge then newOnes += 1 end
end
check("지식=전투: 보상은 모두 지식 카드", newOnes == 20)
check("지식=전투: 보상 후에도 덱이 유효", CB.validateDeck(book, CB.deckIds(book, "europe")))
local ids = CB.offer(book, "chest", r, nil, nil)
check("지식=전투: 3장 중 고르기", #ids == 3 and BC.Units[ids[1]] ~= nil or BC.Specials[ids[1]] ~= nil)

-- 해전 카드 지원: 덱의 지식 카드가 자동으로 거든다
do
	local stN = S.State.new("england", 1700)
	local sup = S.Cardbook.navalSupport(stN)
	check("해전 카드 지원: 시작 덱도 효과가 있다", sup.meleeMult > 0 and sup.cannonMult > 0 and #sup.lines >= 2)
	local f0 = S.Battle.playerFighter(stN)
	check("해전 카드 지원: 전투 능력에 반영", f0.meleeMult >= 1 + sup.meleeMult - 1e-9 and f0.cannonMult >= 1 + sup.cannonMult - 1e-9 and f0.cardSupport ~= nil)
	local cb = S.Cardbook.get(stN)
	for _, c in KC.Cards do
		if c.field == "Navigation" or c.field == "Medicine" then cb.owned[c.id] = 1 end
	end
	cb.deck = nil
	local sup2 = S.Cardbook.navalSupport(stN)
	check("해전 카드 지원: 상한을 넘지 않는다", sup2.cannonMult <= 0.12 and sup2.meleeMult <= 0.12 and sup2.medic <= 0.5 and sup2.speed <= 2)
	check("해전 카드 지원: 화면용 설명이 있다", #S.View.build(stN, ctx).navalSupport == #sup2.lines)
end

print(string.format("지식=전투 테스트: 통과 %d, 실패 %d", pass, fail))
if fail > 0 then error("지식=전투 테스트 실패") end
