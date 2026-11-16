--!strict
-- 지식카드 분류 길잡이: 대분류(7) → 중분류(학문) → 소분류(세부 학문)
--   대분류 = KnowledgeTree.Domains   (형식·자연·응용·인문·사회·예술·실용)
--   중분류 = KnowledgeTree.Disciplines (카드의 Field 와 1:1 연결)
--   소분류 = KnowledgeTree.Planned 의 세부 학문 id (선택). SubOf[카드id] 로 붙인다.
-- 새 카드 추가 순서는 docs/KNOWLEDGE_TAXONOMY.md 참고.
local K = require(script.Parent.KnowledgeTree)
local Cards = require(script.Parent.KnowledgeCards)

local T = {}

-- 카드 id → 소분류(학문 id). 없으면 중분류 직속. 새 카드는 여기에 한 줄 추가.
T.SubOf = ({
	bot_tulip = "agronomy",
	zoo_reindeer = "veterinary",
} :: { [string]: string })

-- Field → 중분류 학문 id (연구 노드가 있는 학문 + 아직 노드 없는 군사학)
T.DisciplineOfField = ({ Military = "military_science" } :: { [string]: string })
for _, d in K.Disciplines do
	T.DisciplineOfField[d.field] = d.id
end

-- 카드 하나의 분류 경로: { domain, discipline, sub }  (모두 id, 못 찾으면 nil)
function T.path(cardId: string)
	local c = Cards.ById[cardId]
	local disc = c and ((c.meta and c.meta.discipline) or T.DisciplineOfField[c.field])
	local row: any = disc and (K.TaxonomyById :: any)[disc]
	-- [세계 백과] 기존 경로를 유지하면서 모든 카드에 존재 형태·시대·지역·교차 학문·선행 지식을 연결한다.
	local node = c and K.ById[cardId]
	local meta = c and c.meta
	local needs = node and node.needs or (c and c.research and c.research.reported) or {}
	return {
		domain = row and row.domain or nil, discipline = disc, sub = T.SubOf[cardId],
		entityType = c and Cards.entityTypeOf(c) or nil,
		era = meta and meta.era or nil,
		region = meta and (meta.region or c.visitPort) or (c and c.visitPort) or nil,
		relatedDisciplines = meta and meta.relatedDisciplines or K.CardRelatedDisciplines[cardId] or {},
		prerequisites = needs,
	}
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
	-- 메타데이터가 지정하는 주학문·교차 학문·선행 지식은 실제 존재해야 한다.
	for _, c in Cards.Cards do
		local meta = c.meta
		if meta then
			if meta.discipline and not (K.DisciplineById :: any)[meta.discipline] then
				table.insert(bad, c.id .. ": 활성 학문 없음 " .. meta.discipline)
			end
			for _, related in meta.relatedDisciplines or {} do
				if not (K.DisciplineById :: any)[related] then table.insert(bad, c.id .. ": 연관 학문 없음 " .. related) end
			end
		end
		for _, needId in (c.research and c.research.reported or {}) do
			if not Cards.ById[needId] then table.insert(bad, c.id .. ": 선행 지식 없음 " .. needId) end
		end
	end
	for id, sub in T.SubOf do
		if not Cards.ById[id] then
			table.insert(bad, id .. ": 없는 카드")
		elseif not (K.TaxonomyById :: any)[sub] then
			table.insert(bad, id .. ": 소분류 '" .. sub .. "' 가 분류표에 없음")
		end
	end
	return bad
end

return T
