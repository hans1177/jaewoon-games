--!nonstrict
-- 인물 백과: 항구를 방문하거나 학자를 만나거나 역사 사건을 겪으면 인물이 기록된다. 기록한 수에 따라 보상(한 번씩).
-- 아직 모르는 인물은 이름 대신 '어떻게 알 수 있는지' 힌트만 보여 준다.

return function(D, S)
	local PD = D.People
	local K = D.KnowledgeTree
	local handlers = {}
	local all, byId = {}, {}

	local function add(p)
		if not byId[p.id] then
			byId[p.id] = p
			table.insert(all, p)
		end
	end
	for _, p in PD.Curated do
		add(p)
	end
	-- 학자 NPC 는 자동으로 백과에 들어간다
	for _, sc in D.Scholars.Scholars do
		local discs = K.ScholarDisciplines[sc.id] or {}
		local cat = "science"
		for _, d in discs do
			if d == "art" then cat = "art" break end
			if d == "philosophy" then cat = "thought" end
			if d == "history" or d == "linguistics" or d == "mythology" then cat = "letters" end
			if d == "commerce" then cat = "merchant" end
		end
		local card = D.Cards.ById[sc.cardId]
		add({ id = sc.id, name = sc.name, from = sc.fromYear, to = sc.toYear, cat = cat, scholar = true,
			bio = sc.line, legacy = if card then "전해 준 지식: " .. card.name else "", via = { scholar = sc.id } })
	end

	local function year(state)
		return state.startYear + state.day / 365
	end

	local function known(state, p)
		local v = p.via or {}
		if v.scholar and state.scholarsMet and state.scholarsMet[v.scholar] then
			return true
		end
		if v.event and state.history and state.history.seen and state.history.seen[v.event] ~= nil then
			return true
		end
		if v.port and state.stats.visited[v.port] and year(state) >= (p.born or 0) + 25 then
			return true
		end
		return false
	end

	local function knownCount(state)
		local n = 0
		for _, p in all do
			if known(state, p) then
				n += 1
			end
		end
		return n
	end

	local function hint(state, p)
		local v = p.via or {}
		local parts = {}
		if v.port then
			local port = D.Ports.Ports[v.port]
			if p.born and year(state) < p.born + 25 then
				table.insert(parts, string.format("%d년경부터 %s에서 알 수 있어요", p.born + 25, port and port.name or v.port))
			else
				table.insert(parts, string.format("%s 항구를 방문하면 알 수 있어요", port and port.name or v.port))
			end
		end
		if v.scholar then
			local sc
			for _, s in D.Scholars.Scholars do
				if s.id == v.scholar then sc = s end
			end
			if sc and sc.id == p.id then
				local port = D.Ports.Ports[sc.portId]
				table.insert(parts, string.format("%s에서 %d~%d년에 만날 수 있어요", port and port.name or sc.portId, sc.fromYear, sc.toYear))
			elseif sc then
				table.insert(parts, string.format("학자 %s을(를) 만나면 알 수 있어요", sc.name))
			end
		end
		if v.event then
			local ev = D.HistoryEvents.ById[v.event]
			table.insert(parts, string.format("역사 사건 「%s」를 겪으면 알 수 있어요", ev and ev.title or v.event))
		end
		return table.concat(parts, " · ")
	end

	function handlers.PeopleClaim(state, p)
		local need = type(p) == "table" and type(p.need) == "number" and math.floor(p.need)
		local tier
		for _, t in PD.Tiers do
			if t.need == need then tier = t end
		end
		if not tier then
			return false, "잘못된 보상"
		end
		state.peopleClaimed = state.peopleClaimed or {}
		if state.peopleClaimed[tostring(need)] then
			return false, "이미 받았어요"
		end
		if knownCount(state) < need then
			return false, string.format("인물 %d명을 기록해야 해요", need)
		end
		state.peopleClaimed[tostring(need)] = true
		state.coins += tier.coins
		state.fame += tier.fame
		return true, string.format("인물 백과 %d명 달성! +%d코인, 명성 +%d", need, tier.coins, tier.fame)
	end

	local function viewOf(state)
		local claimed = state.peopleClaimed or {}
		local cats, byCat = {}, {}
		for _, c in PD.Cats do
			local e = { id = c.id, name = c.name, known = 0, total = 0 }
			byCat[c.id] = e
			table.insert(cats, e)
		end
		local list, n = {}, 0
		for _, p in all do
			local ok = known(state, p)
			local c = byCat[p.cat]
			if c then
				c.total += 1
				if ok then c.known += 1 end
			end
			if ok then
				n += 1
				local rel = nil
				local v = p.via or {}
				if v.event and D.HistoryEvents.ById[v.event] then
					rel = "관련 사건: " .. D.HistoryEvents.ById[v.event].title
				end
				local years = if p.born then string.format("%d~%d", p.born, p.died) else string.format("활동 %d~%d", p.from, p.to)
				table.insert(list, { id = p.id, cat = p.cat, known = true, name = p.name, years = years, bio = p.bio, legacy = p.legacy, rel = rel })
			else
				table.insert(list, { id = p.id, cat = p.cat, known = false, hint = hint(state, p) })
			end
		end
		local tiers = {}
		for _, t in PD.Tiers do
			table.insert(tiers, { need = t.need, coins = t.coins, fame = t.fame, claimed = claimed[tostring(t.need)] == true, ready = n >= t.need and not claimed[tostring(t.need)] })
		end
		return { total = #all, known = n, cats = cats, list = list, tiers = tiers }
	end

	return { handlers = handlers, viewOf = viewOf, known = known, knownCount = knownCount, all = all }
end
