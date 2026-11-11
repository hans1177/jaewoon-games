--!nonstrict
-- 역사 사건: 게임 날짜가 실제 역사 사건의 해에 닿으면 사건이 닥치고, 선택지에 따라 코인·명성·도감 카드·지역 시세가 달라진다.
-- 한 번에 한 사건만 기다린다(pending). 고르기 전에도 다른 행동은 계속할 수 있다.

return function(D, S)
	local E = D.HistoryEvents
	local handlers = {}

	local function hist(state)
		state.history = state.history or { seen = {}, fx = {} }
		state.history.seen = state.history.seen or {}
		state.history.fx = state.history.fx or {}
		return state.history
	end

	-- 날짜가 되었는데 아직 겪지 않은 가장 이른 사건을 기다리게 한다.
	local function tick(state)
		local h = hist(state)
		-- 끝난 시세 효과를 치운다
		for i = #h.fx, 1, -1 do
			if h.fx[i].untilDay < state.day then
				table.remove(h.fx, i)
			end
		end
		if h.pending then
			return h.pending
		end
		local best, bestDay = nil, math.huge
		for _, ev in E.Events do
			if ev.year >= state.startYear and h.seen[ev.id] == nil then
				local d = E.dayOf(ev, state.startYear)
				if d <= state.day and d < bestDay then
					best, bestDay = ev, d
				end
			end
		end
		if best then
			h.pending = best.id
		end
		return h.pending
	end

	-- 지역 시세 효과: 사건을 겪은 뒤 일정 기간 그 지역 항구의 값이 달라진다 (플레이어마다 따로).
	local function mult(state, portId, goodId)
		local h = state.history
		if not h or #h.fx == 0 then
			return 1
		end
		local port = D.Ports.Ports[portId]
		if not port then
			return 1
		end
		local region = D.Regions.of(port).id
		local m = 1
		for _, f in h.fx do
			if f.untilDay >= state.day and table.find(f.goods, goodId) and table.find(f.regions, region) then
				m *= f.mult
			end
		end
		return m
	end

	local function regionNames(ids)
		local names = {}
		for _, id in ids do
			for _, r in D.Regions.List do
				if r.id == id then
					table.insert(names, r.name)
				end
			end
		end
		return table.concat(names, ", ")
	end

	function handlers.HistoryChoose(state, p, ctx)
		local h = hist(state)
		local ev = h.pending and E.ById[h.pending]
		if not ev then
			return false, "지금 닥친 사건이 없어요"
		end
		local idx = type(p) == "table" and p.choice
		local ch = type(idx) == "number" and ev.choices[math.floor(idx)]
		if not ch then
			return false, "잘못된 선택"
		end
		local cost = if ch.coins and ch.coins < 0 then -ch.coins else 0
		if cost > state.coins then
			return false, string.format("%d코인이 필요해요", cost)
		end
		local msgs = { string.format("[%d년 · %s] %s", ev.year, ev.title, ch.label) }
		local function apply(fx)
			if fx.coins then
				state.coins += fx.coins
			end
			if fx.fame then
				state.fame = math.max(0, state.fame + fx.fame)
			end
		end
		if ch.chance then
			apply(ch)
			local rng = ctx and ctx.rng or math.random
			if rng() < ch.chance.p then
				apply(ch.chance.win)
				table.insert(msgs, string.format("결과: 성공! +%d코인", ch.chance.win.coins or 0))
			else
				apply(ch.chance.lose)
				table.insert(msgs, "결과: 실패. 투자금을 잃었다")
			end
		else
			apply(ch)
			if ch.coins and ch.coins ~= 0 then
				table.insert(msgs, string.format("%+d코인", ch.coins))
			end
			if ch.fame and ch.fame ~= 0 then
				table.insert(msgs, string.format("명성 %+d", ch.fame))
			end
		end
		for _, id in ch.cards or {} do
			if not state.discovered[id] then
				state.discovered[id] = true
				local c = D.Cards.ById[id]
				table.insert(msgs, "도감 발견: " .. (c and c.name or id))
			end
		end
		if ch.price then
			table.insert(h.fx, { goods = ch.price.goods, regions = ch.price.regions, mult = ch.price.mult, untilDay = state.day + ch.price.days, title = ev.title })
			local names = {}
			for _, g in ch.price.goods do
				table.insert(names, D.Ports.Goods[g] and D.Ports.Goods[g].name or g)
			end
			table.insert(msgs, string.format("%s 일대에서 %s 값이 %d일 동안 %s", regionNames(ch.price.regions), table.concat(names, "·"), ch.price.days, if ch.price.mult > 1 then "오른다" else "내린다"))
		end
		h.seen[ev.id] = math.floor(idx)
		h.pending = nil
		h.count = nil
		-- 다음 사건이 이미 와 있으면 이어서 기다리게 한다
		tick(state)
		return true, table.concat(msgs, "\n")
	end

	-- 화면용: 기다리는 사건, 지난 사건 몇 개, 진행 중인 시세 효과
	local function viewOf(state)
		local h = hist(state)
		local out = { pending = nil, recent = {}, effects = {}, total = #E.Events }
		local ev = h.pending and E.ById[h.pending]
		if ev then
			local choices = {}
			for i, ch in ev.choices do
				table.insert(choices, { index = i, label = ch.label, hint = ch.hint, cost = if ch.coins and ch.coins < 0 then -ch.coins else 0 })
			end
			out.pending = { id = ev.id, year = ev.year, title = ev.title, tag = ev.tag, text = ev.text, choices = choices }
		end
		local seenList = {}
		for id, idx in h.seen do
			local e = E.ById[id]
			if e then
				table.insert(seenList, { year = e.year, title = e.title, choice = e.choices[idx] and e.choices[idx].label or "" })
			end
		end
		table.sort(seenList, function(a, b)
			return a.year > b.year
		end)
		for i = 1, math.min(5, #seenList) do
			out.recent[i] = seenList[i]
		end
		out.seenCount = #seenList
		for _, f in h.fx do
			if f.untilDay >= state.day then
				table.insert(out.effects, { title = f.title, left = f.untilDay - state.day, mult = f.mult })
			end
		end
		return out
	end

	return { handlers = handlers, tick = tick, mult = mult, viewOf = viewOf }
end
