--!nonstrict
-- 데이터 모듈에서 docs/CATALOG.md 를 만든다. 실행: tests/run.sh catalog > docs/CATALOG.md
-- 코드가 원본이고 문서는 여기서 나온다. 문서를 직접 고치지 말고 데이터를 고친 뒤 다시 만든다.

local Ports = require("./Shared/Ports")
local Ships = require("./Shared/Ships")
local Tech = require("./Shared/Tech")
local Skills = require("./Shared/Skills")
local Cards = require("./Shared/KnowledgeCards")
local Sites = require("./Shared/Sites")
local Scholars = require("./Shared/Scholars")
local Quests = require("./Shared/Quests")

local FIELD_NAMES = {
	Botany = "식물", Zoology = "동물", Mineral = "광물", Relic = "유물", Site = "유적", Astronomy = "천문",
	Chemistry = "화학", Physics = "물리", Geography = "지리", Philosophy = "철학", Medicine = "의학",
}

local function sortedKeys(t)
	local keys = {}
	for k in t do
		table.insert(keys, k)
	end
	table.sort(keys)
	return keys
end

local function goodNames(list)
	local names = {}
	for _, id in list do
		table.insert(names, Ports.Goods[id].name)
	end
	return table.concat(names, ", ")
end

local out = {}
local function w(line)
	table.insert(out, line or "")
end

w("# 게임 카탈로그")
w()
w("> 이 문서는 `tests/gen_catalog.luau` 가 코드 데이터에서 자동으로 만든다. 직접 고치지 말고 `src/ReplicatedStorage/Shared` 의 데이터를 고친 뒤 `tests/run.sh catalog > docs/CATALOG.md` 로 다시 만든다.")
w()

w("## 나라")
w("| ID | 나라 | 시작 항구 | 보너스 |")
w("|---|---|---|---|")
for _, id in sortedKeys(Ports.Nations) do
	local n = Ports.Nations[id]
	w(string.format("| %s | %s | %s | %s |", n.id, n.name, Ports.Ports[n.startPort].name, n.summary))
end
w()

w("## 항구 (" .. #sortedKeys(Ports.Ports) .. "곳)")
w("| ID | 항구 | 소속 | 특산품 | 수요 품목 | 조선소 |")
w("|---|---|---|---|---|---|")
for _, id in sortedKeys(Ports.Ports) do
	local p = Ports.Ports[id]
	w(string.format("| %s | %s | %s | %s | %s | %s |", p.id, p.name, p.country, goodNames(p.produces), goodNames(p.demands), if p.shipyard then "있음" else "-"))
end
w()

w("## 상품 (" .. #sortedKeys(Ports.Goods) .. "종)")
w("| ID | 이름 | 기준가 |")
w("|---|---|---|")
for _, id in sortedKeys(Ports.Goods) do
	local g = Ports.Goods[id]
	w(string.format("| %s | %s | %d |", g.id, g.name, g.basePrice))
end
w()

w("## 선박")
w("| ID | 이름 | 종류 | 가격 | 화물 | 속도 | 선체 | 포 | 선원 | 필요 연구 |")
w("|---|---|---|---|---|---|---|---|---|---|")
for _, id in Ships.Order do
	local s = Ships.Ships[id]
	w(string.format("| %s | %s | %s | %d | %d | %d | %d | %d | %d | %s |", s.id, s.name, if s.steam then "증기" else "범선",
		s.price, s.cargo, s.speed, s.hull, s.cannons, s.crew, if s.techReq then Tech.Tech[s.techReq].name else "-"))
end
w()

w("## 증기 연구")
w("| 기술 | 비용 | 필요 지식 카드 | 선행 기술 | 효과 |")
w("|---|---|---|---|---|")
for _, id in Tech.Order do
	local t = Tech.Tech[id]
	local cards, prereq = {}, {}
	for _, c in t.requiresCards do
		table.insert(cards, Cards.ById[c].name)
	end
	for _, p in t.requiresTech do
		table.insert(prereq, Tech.Tech[p].name)
	end
	w(string.format("| %s | %d | %s | %s | %s |", t.name, t.cost, table.concat(cards, ", "),
		if #prereq > 0 then table.concat(prereq, ", ") else "-", t.summary))
end
w()

w("## 자동 전투 스킬")
w("| 스킬 | 단계 | 쿨타임 | 조건 | 설명 |")
w("|---|---|---|---|---|")
local PHASE = { ranged = "포격", boarding = "백병전", any = "공통" }
for _, id in Skills.Order do
	local s = Skills.Skills[id]
	local cond = "-"
	if s.steamOnly then
		cond = "증기선 + 석탄"
	elseif s.techReq then
		cond = "연구: " .. Tech.Tech[s.techReq].name
	end
	w(string.format("| %s | %s | %d | %s | %s |", s.name, PHASE[s.phase], s.cooldown, cond, s.summary))
end
w()

w("## 지식 카드 / 세계 백과 (" .. #Cards.Cards .. "장)")
w("| 분야 | 이름 | 희귀도 | 설명 | 발견 방법 |")
w("|---|---|---|---|---|")
for _, c in Cards.Cards do
	w(string.format("| %s | %s | %s | %s | %s |", FIELD_NAMES[c.field] or c.field, c.name, c.rarity, c.description, c.source))
end
w()

w("## 탐험 지점")
w("| 항구 | 지점 | 모험 레벨 | 소요일 | 발견 가능 카드 |")
w("|---|---|---|---|---|")
for _, s in Sites.Sites do
	local names = {}
	for _, cid in s.pool do
		table.insert(names, Cards.ById[cid].name)
	end
	w(string.format("| %s | %s | %d | %d | %s |", Ports.Ports[s.portId].name, s.name, s.minLevel, s.days, table.concat(names, ", ")))
end
w()

w("## 실존 학자 NPC")
w("활동 시기와 장소는 게임 설정이다. **구현 전 출처로 확인이 필요하다.** 뉴커먼은 증기 대체 역사 설정에 맞춰 등장 시기를 앞당겼다.")
w()
w("| 학자 | 항구 | 등장 연도 | 필요 명성 | 전수하는 지식 |")
w("|---|---|---|---|---|")
for _, s in Scholars.Scholars do
	w(string.format("| %s | %s | %d~%d | %d | %s |", s.name, Ports.Ports[s.portId].name, s.fromYear, s.toYear, s.minFame, Cards.ById[s.cardId].name))
end
w()

w("## 퀘스트")
w("| 이름 | 내용 | 보상 |")
w("|---|---|---|")
for _, q in Quests.Quests do
	w(string.format("| %s | %s | %d코인, 명성 %d |", q.name, q.summary, q.rewardCoins, q.rewardFame))
end
w()

print(table.concat(out, "\n"))
