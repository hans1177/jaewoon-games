--!nonstrict
-- 세계 이벤트: 20일마다 세계 어딘가에서 재해나 행운이 일어난다(결정적 난수 — 저장된 시드로 이어서 굴린다).
-- 재해와 행운이 번갈아 오도록 직전 것과 같은 종류는 덜 뽑힌다. 시세 효과는 History 의 fx 에 함께 들어간다.
-- 내가 그 지역 항구에 있을 때만 코인 피해/이득을 받고, 지식(학문)과 방어 건물이 재해 피해를 줄인다. 재해 지역에서는 구호로 명성을 얻는다.

return function(D, S)
	local W = D.WorldEvents
	local K = D.KnowledgeTree
	local handlers = {}

	local ROLL_DAYS, ROLL_CHANCE = 20, 0.8
	local AID_COST = 150
	local LOG_MAX, FX_MAX = 15, 40

	local function world(state)
		if not state.world then
			state.world = { rng = (state.startYear * 7 + state.day * 31) % 2147483646 + 1, nextDay = state.day + 15, cool = {}, active = {}, log = {}, aided = 0, queue = {}, done = {} }
		end
		return state.world
	end

	local function rand(w)
		w.rng = (w.rng * 16807) % 2147483647
		return w.rng / 2147483647
	end

	local function regionName(id)
		for _, r in D.Regions.List do
			if r.id == id then
				return r.name
			end
		end
		return id
	end

	local function hereRegion(state)
		local port = D.Ports.Ports[state.portId]
		return port and D.Regions.of(port).id
	end

	-- 재해 완화: 그 학문을 이해한 지식 1개당 2%(최대 50%) + 이 항구 방어 건물 1단계당 8%(최대 40%), 합쳐서 80%까지
	local function mitigation(state, guard)
		local n = 0
		for _, nd in K.Nodes do
			if nd.disc == guard and state.reported and state.reported[nd.id] == true then
				n += 1
			end
		end
		local stages = state.portStages and state.portStages[state.portId] and state.portStages[state.portId].guard or 0
		-- 이 항구 학자들의 기술: 의학→역병, 건축→지진·화재, 지리·항해→폭풍·해적 같은 대비가 현지에서 나온다
		local local_ = S.Knowledge and S.Knowledge.techLevel(state, state.portId, guard) or 0
		return math.min(0.8, math.min(0.24, local_ * 0.06) + math.min(0.5, n * 0.02) + math.min(0.4, stages * 0.08) + math.min(0.1, S.People.discCount(state, guard) * 0.01))
	end

	local function validGoods(list)
		local out = {}
		for _, g in list do
			if D.Ports.Goods[g] then
				table.insert(out, g)
			end
		end
		return out
	end

	local function fmt(s, region)
		return (string.gsub(s, "{r}", region))
	end

	-- 사건 하나를 일으킨다. 알림 문장 목록을 돌려준다.
	local function fire(state, ev, region, cause)
		local w = world(state)
		local rname = regionName(region)
		local title = fmt(ev.title, rname)
		local msgs = { string.format("[%s] %s — %s%s", if ev.kind == "disaster" then "재해" else "행운", title, fmt(ev.text, rname), if cause then string.format(" (%s의 여파)", cause) else "") }
		local wid = state.day * 100 + #w.log
		table.insert(w.active, { id = ev.id, wid = wid, region = region, title = title, text = fmt(ev.text, rname), kind = ev.kind, startDay = state.day, endDay = state.day + ev.days })
		w.cool[ev.id] = state.day
		-- 시세 효과 (History 와 공용)
		local h = state.history
		local goods = validGoods(ev.goods)
		if #goods > 0 and ev.mult ~= 1 then
			table.insert(h.fx, { goods = goods, regions = { region }, mult = ev.mult, untilDay = state.day + ev.days, title = title, wid = wid })
			while #h.fx > FX_MAX do
				table.remove(h.fx, 1)
			end
		end
		-- 내가 그 지역에 있으면 피해/이득
		local result = "먼 곳의 소식"
		-- 이어질 사건 예약 (전쟁 뒤 기근, 기근 뒤 풍작 ...)
		for _, f in ev.follow or {} do
			local fr = if state.room then D.RoomClock.hash01(S.Room.seed(), ev.id .. ":" .. f.id .. ":" .. region, state.day) else rand(w)
			if W.ById[f.id] and fr < f.p then
				table.insert(w.queue, { id = f.id, day = state.day + f.after, region = region, cause = title })
			end
		end
		local exposed = if ev.port then state.portId == ev.port else hereRegion(state) == region
		if exposed then
			if ev.kind == "disaster" then
				S.Order.shock(state, state.portId)
				local cut = mitigation(state, ev.guard)
				local loss = math.min(math.floor(state.coins * ev.pct * (1 - cut)), ev.mx)
				loss = math.max(0, loss)
				state.coins -= loss
				result = string.format("피해 -%d코인 (대비로 %d%% 줄임)", loss, math.floor(cut * 100 + 0.5))
				table.insert(msgs, result)
			else
				local k = 0
				for _, nd in K.Nodes do
					if nd.disc == "commerce" and state.reported and state.reported[nd.id] == true then
						k += 1
					end
				end
				local gain = math.min(math.floor((state.coins * ev.pct + 60) * (1 + math.min(0.3, k * 0.01))), ev.mx)
				state.coins += gain
				state.fame += ev.fame
				result = string.format("+%d코인, 명성 +%d", gain, ev.fame)
				table.insert(msgs, result)
			end
		end
		table.insert(w.log, 1, { day = state.day, year = math.floor(state.startYear + state.day / 365), title = title, kind = ev.kind, region = rname, result = result })
		while #w.log > LOG_MAX do
			table.remove(w.log)
		end
		return msgs
	end

	local function pickEvent(state, w, rand_)
		local year = state.startYear + state.day / 365
		local last = w.log[1] and w.log[1].kind
		local pool, total = {}, 0
		for _, ev in W.Events do
			local cool = w.cool[ev.id]
			if not ev.year and year >= ev.frm and year <= ev.to and (not cool or state.day - cool >= 180) then
				local wt = ev.w
				if last and last == ev.kind then
					wt *= 0.6
				end
				total += wt
				table.insert(pool, { ev = ev, wt = wt })
			end
		end
		if #pool == 0 then
			return nil
		end
		local r, acc = rand_() * total, 0
		local pick = pool[#pool].ev
		for _, it in pool do
			acc += it.wt
			if r <= acc then
				pick = it.ev
				break
			end
		end
		local region = pick.regions[math.floor(rand_() * #pick.regions) + 1] or pick.regions[1]
		return pick, region
	end

	-- k: 방 시계 안에서 이 추첨의 번호. 같은 방 사람들은 같은 번호에 같은 결과를 받는다.
	local function roll(state, k)
		local w = world(state)
		local n = 0
		local function rnd()
			if k then
				n += 1
				return D.RoomClock.hash01(S.Room.seed(), "r" .. n, k)
			end
			return rand(w)
		end
		if k then
			local rec = S.Room.roll(k, function()
				local ev, reg = pickEvent(state, w, rnd)
				return ev and { id = ev.id, region = reg } or nil
			end)
			if rec and W.ById[rec.id] then
				return fire(state, W.ById[rec.id], rec.region)
			end
			return {}
		end
		local ev, reg = pickEvent(state, w, rnd)
		if not ev then
			return {}
		end
		return fire(state, ev, reg)
	end

	-- 지금 날짜까지 쌓인 사건을 굴리고 끝난 사건을 치운다. 알림 문장을 돌려준다(최대 3번까지 몰아서).
	local function tick(state)
		local w = world(state)
		for i = #w.active, 1, -1 do
			if w.active[i].endDay < state.day then
				table.remove(w.active, i)
			end
		end
		local msgs = {}
		-- 실제 역사 속 재해·호재는 그 해가 되면 한 번 일어난다
		for _, ev in W.Events do
			if ev.year and not w.done[ev.id] and state.startYear + state.day / 365 >= ev.year + ((ev.month or 6) - 1) / 12 then
				w.done[ev.id] = true
				-- 시작 연도보다 한참 전의 일은 건너뛴다 (밀린 사건이 한꺼번에 쏟아지지 않게)
				if ev.year + 1 >= state.startYear then
					for _, m in fire(state, ev, ev.regions[1]) do
						table.insert(msgs, m)
					end
				end
			end
		end
		-- 예약된 후속 사건
		for i = #w.queue, 1, -1 do
			local q = w.queue[i]
			if q.day <= state.day then
				table.remove(w.queue, i)
				local ev = W.ById[q.id]
				local dup = false
				for _, a in w.active do
					if a.id == q.id and a.region == q.region then dup = true end
				end
				if ev and not dup then
					for _, m in fire(state, ev, q.region, q.cause) do
						table.insert(msgs, m)
					end
				end
			end
		end
		local n = 0
		if state.room and w.nextDay % ROLL_DAYS ~= 0 then
			w.nextDay = (math.floor(state.day / ROLL_DAYS) + 1) * ROLL_DAYS
		end
		while state.day >= w.nextDay and n < 3 do
			local k = math.floor(w.nextDay / ROLL_DAYS)
			w.nextDay += ROLL_DAYS
			n += 1
			local chance = if state.room then D.RoomClock.hash01(S.Room.seed(), "chance", k) else rand(w)
			if chance < ROLL_CHANCE then
				for _, m in roll(state, if state.room then k else nil) do
					table.insert(msgs, m)
				end
			end
		end
		if state.day >= w.nextDay then
			w.nextDay = state.day + ROLL_DAYS
		end
		return msgs
	end

	-- 구호: 재해를 겪는 지역 항구에서 코인을 내면 명성을 얻고, 그 재해의 시세 충격이 절반으로 짧아진다.
	function handlers.WorldAid(state, p)
		local w = world(state)
		local a = type(p) == "table" and type(p.index) == "number" and w.active[math.floor(p.index)]
		if not a or a.kind ~= "disaster" then
			return false, "구호할 재해가 아니에요"
		end
		if a.aided then
			return false, "이미 구호했어요"
		end
		if W.ById[a.id] and W.ById[a.id].aid == false then
			return false, "이 재해는 구호로 달랠 수 없어요"
		end
		if hereRegion(state) ~= a.region then
			return false, "그 지역의 항구에서만 구호할 수 있어요"
		end
		if state.coins < AID_COST then
			return false, string.format("%d코인이 필요해요", AID_COST)
		end
		state.coins -= AID_COST
		state.fame += 8
		a.aided = true
		local left = math.max(1, math.floor((a.endDay - state.day) / 2))
		a.endDay = state.day + left
		for _, f in state.history.fx do
			if f.wid == a.wid then
				f.untilDay = math.min(f.untilDay, state.day + left)
			end
		end
		state.world.aided += 1
		return true, string.format("%s 구호 물자를 나눴다. 명성 +8 (재해가 %d일 뒤 가라앉는다)", a.title, left)
	end

	local function viewOf(state)
		local w = world(state)
		local here = hereRegion(state)
		local out = { active = {}, log = w.log, aided = w.aided, aidCost = AID_COST }
		for i, a in w.active do
			local tpl = W.ById[a.id]
			table.insert(out.active, {
				index = i, title = a.title, text = a.text, kind = a.kind, region = regionName(a.region), left = a.endDay - state.day, here = a.region == here,
				canAid = a.kind == "disaster" and a.region == here and not a.aided and not (tpl and tpl.aid == false), aided = a.aided == true,
				cut = if a.kind == "disaster" and tpl then math.floor(mitigation(state, tpl.guard) * 100 + 0.5) else nil,
			})
		end
		return out
	end

	return { handlers = handlers, tick = tick, viewOf = viewOf, mitigation = mitigation }
end
