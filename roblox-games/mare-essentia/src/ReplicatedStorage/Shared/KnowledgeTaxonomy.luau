--!strict
-- KnowledgeTaxonomy.luau · 지구/인류 백과사전 분류: 7대 학문분류 → 기존 21주학문 + 확장 21세부 학문
--   대분류 = KnowledgeTree.Domains   (형식·자연·응용·인문·사회·예술·실용)
--   중분류 = 기존 21주학문 (기존 Field/보고/저장/보상 변경 없음)
--   소분류 = 21개 활성 세부학문 + 연구 예정학문. 카드의 classification.related, BranchesByCard 및 SubOf로 연결.
-- 새 카드 추가 순서는 docs/KNOWLEDGE_TAXONOMY.md 참고.
local K = require(script.Parent.KnowledgeTree)
local Cards = require(script.Parent.KnowledgeCards)

local T = {}

-- 카드 id → 소분류(학문 id). 없으면 중분류 직속. 새 카드는 여기에 한 줄 추가.
T.SubOf = {
	bot_tulip = "agronomy",
	zoo_reindeer = "veterinary",
}

-- Field → 중분류 학문 id (연구 노드가 있는 학문 + 아직 노드 없는 군사학)
T.DisciplineOfField = { Military = "military_science" }
for _, d in K.Disciplines do
	-- 실제로 존재하는 원래 카드 Field만 1:1 매핑한다. 분화 학문에는 Field가 없고 카드에 다중 연결된다.
	if d.field then T.DisciplineOfField[d.field] = d.id end
end

-- 카드 하나의 분류 경로: { domain, discipline, sub }  (모두 id, 못 찾으면 nil)
function T.path(cardId: string)
	local c = Cards.ById[cardId]
	local disc = c and T.DisciplineOfField[c.field]
	local row = disc and K.TaxonomyById[disc]
	local subs, seen = {}, {}
	local function include(id: string?)
		if id and id ~= disc and K.TaxonomyById[id] and not seen[id] then
			seen[id] = true
			table.insert(subs, id)
		end
	end
	include(T.SubOf[cardId])
	for _, id in (c and c.classification and c.classification.related) or {} do include(id) end
	for id in K.BranchesByCard[cardId] or {} do include(id) end
	table.sort(subs)
	return { domain = row and row.domain or nil, discipline = disc, sub = T.SubOf[cardId], related = subs }
end

-- 점검: 모든 카드가 학문·대분류에 연결되고, 소분류가 분류표에 있는지 확인. 문제 목록 반환.
function T.audit(): { string }
	local bad = {}
	for _, c in Cards.Cards do
		local p = T.path(c.id)
		if not p.discipline then
			table.insert(bad, c.id .. ": Field '" .. tostring(c.field) .. "' 에 학문 없음")
		elseif not p.domain then
			table.insert(bad, c.id .. ": 학문 '" .. p.discipline .. "' 에 대분류 없음")
		end
	end
	for id, sub in T.SubOf do
		if not Cards.ById[id] then
			table.insert(bad, id .. ": 없는 카드")
		elseif not K.TaxonomyById[sub] then
			table.insert(bad, id .. ": 소분류 '" .. sub .. "' 가 분류표에 없음")
		end
	end
	return bad
end

return T
