--!nonstrict
-- 마을 발전: 학문을 이해할수록(지식 노드) 학문별 단계가 오르고, 단계가 모이면 마을 레벨이 오른다.
-- 마을 레벨과 학문 단계가 충분하면 그 학문과 이어진 경제 건물(EconomyBuildings)이 마을에 들어선다.
-- 학문 단계: 이해한 지식 수 1/3/6/10 → 1~4단계.  마을 레벨 1~6: 단계 합계 0/3/8/14/22/32 이상.

return function(D, S)
	local K, EB = D.KnowledgeTree, D.EconomyBuildings
	local V = {}

	local TIER_AT = { 1, 3, 6, 10 }
	local LEVEL_AT = { 0, 3, 8, 14, 22, 32 }
	local TIER_NAME = { "시작", "발전", "성숙", "정점" }
	local LEVEL_NAME = { "어촌·장터", "마을", "항구 마을", "항구 도시", "학술 도시", "대도시" }
	-- 건물 레벨 → 필요한 학문 단계
	local NEED_TIER = { [1] = 0, [2] = 1, [3] = 1, [4] = 2, [5] = 3, [6] = 3 }

	local function understoodByDisc(state)
		local counts = {}
		for id in (state.reported or {}) do
			local node = K.ById[id]
			if node then
				counts[node.disc] = (counts[node.disc] or 0) + 1
			end
		end
		return counts
	end

	local function tierOf(n)
		local t = 0
		for i, need in TIER_AT do
			if n >= need then t = i end
		end
		return t
	end

	function V.levelOf(score)
		local lv = 1
		for i, need in LEVEL_AT do
			if score >= need then lv = i end
		end
		return lv
	end

	function V.tiers(state)
		local counts = understoodByDisc(state)
		local tiers, score = {}, 0
		for _, d in K.Disciplines do
			local t = tierOf(counts[d.id] or 0)
			tiers[d.id] = t
			score += t
		end
		return tiers, score, counts
	end

	-- 지금 마을에 들어선 경제 건물 목록
	function V.buildings(state)
		local tiers, score = V.tiers(state)
		local level = V.levelOf(score)
		local out = {}
		for _, b in EB.List do
			if level >= b.minLevel then
				local ok = true
				for _, d in b.disc do
					if tiers[d] ~= nil and tiers[d] < NEED_TIER[b.minLevel] then
						ok = false
					end
				end
				if ok then table.insert(out, b) end
			end
		end
		return out, level
	end

	function V.view(state)
		local tiers, score, counts = V.tiers(state)
		local built, level = V.buildings(state)
		local nextAt = LEVEL_AT[level + 1]
		local byCat = {}
		for _, b in built do
			byCat[b.category] = (byCat[b.category] or 0) + 1
		end
		local cats = {}
		for _, c in EB.Categories do
			table.insert(cats, { id = c.id, name = c.name, built = byCat[c.id] or 0, total = #(EB.ByCategory[c.id] or {}) })
		end
		local discs = {}
		for _, d in K.Disciplines do
			local t = tiers[d.id]
			if t > 0 then
				table.insert(discs, { id = d.id, name = d.name, tier = t, tierName = TIER_NAME[t], count = counts[d.id] or 0 })
			end
		end
		table.sort(discs, function(a, b) return a.tier > b.tier end)
		return {
			level = level, name = LEVEL_NAME[level], score = score, nextAt = nextAt, nextName = LEVEL_NAME[level + 1],
			built = #built, total = #EB.List, cats = cats, discs = discs,
		}
	end

	return V
end
