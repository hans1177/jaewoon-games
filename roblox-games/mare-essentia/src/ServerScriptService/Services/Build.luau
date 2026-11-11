--!nonstrict
-- 항구 건물 계통: 지금 항구에서 계통별 다음 단계를 지을 수 있는지 보고, 짓고, 효과를 합산한다.

return function(D, S)
	local B = D.PortBuildings
	local handlers = {}

	local function stagesAt(state, portId)
		local t = state.portStages and state.portStages[portId]
		return t or {}
	end

	local function stageOf(state, portId, chainId)
		return stagesAt(state, portId)[chainId] or 0
	end

	-- 다음 단계를 지을 수 있는가 (이유 포함)
	local function check(state, chain)
		local cur = stageOf(state, state.portId, chain.id)
		local st = chain.stages[cur + 1]
		if not st then
			return nil, false, "계통의 끝에 이르렀어요"
		end
		local lvl = D.Harbor.level(state.harbor[state.portId] or 0)
		if lvl < st.harbor then
			return st, false, string.format("교역소 %d단계 필요", st.harbor)
		end
		if S.Pace.effYear(state) < st.since then
			return st, false, string.format("%d년부터 지을 수 있어요 (발견·연구·퀘스트로 앞당길 수 있어요)", st.since)
		end
		if st.node and not D.KnowledgeTree.understood(state, st.node) then
			local c = D.Cards.ById[st.node]
			return st, false, "지식 필요: " .. tostring(c and c.name or st.node)
		end
		if st.era and D.KnowledgeTree.eraIndex(state) < st.era then
			return st, false, tostring(D.KnowledgeTree.Eras[st.era].name) .. " 이후에 지을 수 있어요"
		end
		return st, true, nil
	end

	function handlers.BuildStage(state, p)
		local chain = type(p) == "table" and type(p.chain) == "string" and B.ById[p.chain]
		if not chain then
			return false, "잘못된 계통"
		end
		local st, ok, why = check(state, chain)
		if not ok then
			return false, why
		end
		if state.coins < st.cost then
			return false, string.format("건축비 %d코인이 필요해요", st.cost)
		end
		state.coins -= st.cost
		state.portStages = state.portStages or {}
		state.portStages[state.portId] = state.portStages[state.portId] or {}
		state.portStages[state.portId][chain.id] = stageOf(state, state.portId, chain.id) + 1
		local fame = math.floor(st.cost / 100)
		state.fame += fame
		return true, string.format("%s에 %s이(가) 들어섰다! %s 명성 +%d", D.Ports.Ports[state.portId].name, st.name, st.lore, fame)
	end

	local function sum(state, field, onlyPort)
		local total = 0
		for portId, t in state.portStages or {} do
			if not onlyPort or portId == onlyPort then
				for chainId, n in t do
					local chain = B.ById[chainId]
					for i = 1, math.min(n, chain and #chain.stages or 0) do
						total += chain.stages[i][field] or 0
					end
				end
			end
		end
		return total
	end

	local function viewOf(state)
		local out = {}
		for _, chain in B.Chains do
			local cur = stageOf(state, state.portId, chain.id)
			local st, ok, why = check(state, chain)
			local built = {}
			for i = 1, cur do
				table.insert(built, chain.stages[i].name)
			end
			table.insert(out, {
				id = chain.id, name = chain.name, summary = chain.summary, stage = cur, total = #chain.stages, built = table.concat(built, " → "),
				next = st and { name = st.name, cost = st.cost, lore = st.lore, can = ok, why = why } or nil,
			})
		end
		return out
	end

	return {
		handlers = handlers,
		viewOf = viewOf,
		-- 지은 항구에서만 판매 비율 가산
		sellBonus = function(state) return sum(state, "sell", state.portId) end,
		speedBonus = function(state) return sum(state, "speed") end,
		cannonBonus = function(state) return sum(state, "cannon") end,
		researchBonus = function(state, portId) return sum(state, "research", portId) end,
		stageOf = stageOf,
	}
end
