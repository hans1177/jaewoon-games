--!nonstrict
-- 교역: 사고팔기. 평균 매입가 대비 이익이 교역 경험치가 된다.

return function(D, S)
	local T = D.TradeMath
	local handlers = {}
	local MAX_AMOUNT = 20

	-- 한 번 주문 상한: 교역 경험이 오를수록 커진다 (시뮬이 없으면 20)
	local function orderCap(state)
		return if S.Econ and S.Econ.orderCap then S.Econ.orderCap(state) else MAX_AMOUNT
	end

	local function parseAmount(value, state)
		if type(value) ~= "number" or value ~= value then
			return nil
		end
		local n = math.floor(value)
		if n < 1 or n > orderCap(state) then
			return nil
		end
		return n
	end

	local function limits(state, goodId)
		return S.Econ and S.Econ.limits and S.Econ.limits(state, state.portId, goodId)
	end

	-- 국가 우호도: 그 나라 항구에서 거래할수록 오른다. 우호도 100이면 관세 우대로 되파는 비율 +3%.
	local function repBonus(state)
		local port = D.Ports.Ports[state.portId]
		return math.min(0.03, (state.rep[port.country] or 0) / 100 * 0.03)
	end

	-- 관세: 다른 나라 항구에서 팔 때 붙는다. 우호도가 오를수록 줄어 100이면 0%.
	local function tariffRate(state)
		local port = D.Ports.Ports[state.portId]
		if port.country == state.nationId then
			return 0
		end
		-- [상선 교역 특화] 매매가격·재고·판매율 상한은 유지하고 외국 항구 관세만 최대 ±8% 상대 보정.
		local base = math.max(0, 0.05 - (state.rep[port.country] or 0) / 100 * 0.05)
		local trait = S.State.shipDef(state).trait or {}
		local rate = math.max(0, base * (1 - (trait.tariff or 0)))
		-- [국가 시뮬 연결] 항구 주인의 입장(동맹·중립·적대)과 식민지 독점에 따라 배율을 곱한다. 최대 12%.
		local policy = S.Econ and S.Econ.tariffPolicy and S.Econ.tariffPolicy(state, state.portId)
		if policy then rate = math.min(0.12, rate * policy.mult) end
		return rate
	end

	-- 금수: 본국과 전쟁 중이고 관계가 크게 나쁜 나라의 항구는 정식 거래가 막힌다 (암시장은 가능).
	local function embargoed(state)
		local policy = S.Econ and S.Econ.tariffPolicy and S.Econ.tariffPolicy(state, state.portId)
		return policy ~= nil and policy.closed == true
	end

	local function sellRateFor(state)
		local nation = D.Ports.Nations[state.nationId]
		return T.sellRate(D.Careers.sellBonus(state.careers.trade.level) + nation.sellBonus + S.Perk.sellBonus(state) + S.Harbor.sellBonus(state) + S.Order.sellBonus(state) + S.Facility.titleBonus(state) + repBonus(state) + S.Build.sellBonus(state))
	end

	-- 시세 수첩: 직접 거래한 물건은 그 항구의 팔값을 적어 둔다 (동료 없이도 나중에 비교할 수 있다)
	local function noteBook(state, ctx, goodId)
		local m = ctx.market:get(state.portId, goodId)
		local e = (ctx.market:eventMult(state.portId, goodId) * S.History.mult(state, state.portId, goodId) * (if S.Econ and S.Econ.marketFactor then S.Econ.marketFactor(state, state.portId, goodId) else 1))
		state.priceBook = state.priceBook or {}
		state.priceBook[goodId] = state.priceBook[goodId] or {}
		state.priceBook[goodId][state.portId] = { sell = T.sellPrice(state.portId, goodId, m, sellRateFor(state), e), day = state.day }
	end

	-- [특산품 단계 잠금 · 2026-11-28 오너 지시] 처음부터 특산품을 마음대로 살 수 없다.
	-- [오너 결정 2026-11-28: 어렵게, 이야기를 진행할수록 열리게 · 기존 거래 기록 예외 없음(초기화)]
	-- 일반품: 언제나 · 특산품: 우호도 25 이상 / 항구 투자 2단계 / 길드 허가증 중 하나 (시작 항구만 처음부터)
	-- 명품(그 항구 특산 중 가장 비싼 것, 특산 2개 이상일 때): 길드 허가증 + (우호도 50 또는 투자 3단계)
	-- 길드 허가증 의뢰는 시작 국가 서막을 마친 뒤 열린다(이야기 진행에 묶임).
	local SPECIAL_REP, PREMIUM_REP, PREMIUM_LEVEL, SPECIAL_LEVEL = 25, 50, 3, 2
	local function premiumOf(port)
		if type(port.produces) ~= "table" or #port.produces < 2 then return nil end
		local best, price = nil, -1
		for _, g in port.produces do
			local def = D.Ports.Goods[g]
			if def and (def.basePrice or 0) > price then best, price = g, def.basePrice or 0 end
		end
		return best
	end
	local function lockOf(state, portId, goodId)
		local port = D.Ports.Ports[portId]
		if not port or type(port.produces) ~= "table" or not table.find(port.produces, goodId) then return nil end
		local rep = state.rep[port.country] or 0
		local level = S.Harbor.level(state, portId)
		local permit = state.stats and state.stats.permits and state.stats.permits[portId] == true
		local nation = D.Ports.Nations[state.nationId]
		local home = nation and nation.startPort == portId
		local permitQuest = D.Quests.ById["permit_" .. portId]
		local questName = permitQuest and permitQuest.name or nil
		if goodId == premiumOf(port) then
			if permit and (rep >= PREMIUM_REP or level >= PREMIUM_LEVEL) then return nil end
			return { tier = "premium", tierName = "명품", rep = rep, needRep = PREMIUM_REP, level = level, needLevel = PREMIUM_LEVEL, quest = questName,
				text = string.format("명품 · 길드 허가증%s + (우호도 %d/%d 또는 투자 %d/%d단계)", if permit then "✔" else "✘", rep, PREMIUM_REP, level, PREMIUM_LEVEL) }
		end
		if home or permit or rep >= SPECIAL_REP or level >= SPECIAL_LEVEL then return nil end
		return { tier = "special", tierName = "특산품", rep = rep, needRep = SPECIAL_REP, level = level, needLevel = SPECIAL_LEVEL, quest = questName,
			text = string.format("특산품 · 우호도 %d/%d 또는 투자 %d단계 또는 길드 허가증", rep, SPECIAL_REP, SPECIAL_LEVEL) }
	end

	function handlers.Buy(state, p, ctx)
		local goodId, amount = p.goodId, parseAmount(p.amount, state)
		if type(goodId) ~= "string" or not D.Ports.Goods[goodId] or not amount then
			return false, "잘못된 요청"
		end
		if embargoed(state) then
			return false, "전쟁 중인 나라의 항구라 정식 거래가 막혔어요 (암시장은 가능해요)"
		end
		local lock = lockOf(state, state.portId, goodId)
		if lock then
			return false, string.format("🔒 %s 아직 못 사요 — %s%s", D.Ports.Goods[goodId].name, lock.text,
				if lock.quest then " · 주점 의뢰 「" .. lock.quest .. "」" else "")
		end
		local lim = limits(state, goodId)
		if lim and amount > lim.supply then
			return false, if lim.supply <= 0 then "이 항구에 팔 물건이 없어요. 생산될 때까지 기다려 보세요" else string.format("이 항구 재고는 %d개뿐이에요", lim.supply)
		end
		if amount > S.State.cargoCapacity(state) - S.State.cargoUsed(state) then
			return false, "화물칸이 부족해요"
		end
		local mult = ctx.market:get(state.portId, goodId)
		local ev = (ctx.market:eventMult(state.portId, goodId) * S.History.mult(state, state.portId, goodId) * (if S.Econ and S.Econ.marketFactor then S.Econ.marketFactor(state, state.portId, goodId) else 1))
		local total = 0
		for _ = 1, amount do
			total += T.getPrice(state.portId, goodId, mult, ev * S.Knowledge.supplyMult(state, state.portId, goodId))
			mult = T.nextStockMult(mult, 1, true)
		end
		-- [자동 흥정] 기존 동료 장사 감각·상인 전문을 갖추면 구매 순간 자동 시도.
		-- 항구/상품별 1회, 원래 성공확률과 할인율을 그대로 유지한다.
		local h = state.haggle
		local intel = S.Harbor.intel(state)
		local skilled = intel >= 1 or state.specialty == "merchant" or state.subSpecialty == "merchant"
		if total > state.coins and (not skilled or math.floor(total * 0.92) > state.coins)
			and not (h and h.portId == state.portId and h.deal and h.deal.goodId == goodId) then
			return false, "코인이 부족해요"
		end
		local effect = ""
		local appliedDeal = false
		local autoAttempt = false
		if h and h.portId == state.portId and h.deal and h.deal.goodId == goodId then
			total = math.max(1, math.floor(total * h.deal.mult))
			appliedDeal = true
		elseif skilled and not (h and h.portId == state.portId and h.tried and h.tried[goodId]) then
			-- [구매 확정 전] 잔액 부족으로 거래가 취소되면 흥정 기회를 소비하지 않는다.
			autoAttempt = true
			local port = D.Ports.Ports[state.portId]
				local chance = math.clamp(0.35 + 0.1 * intel + (state.rep[port.country] or 0) / 100 * 0.2, 0.2, 0.9)
				if ctx.rng() < chance then
					local discount = 0.04 + ctx.rng() * 0.04
					local before = total
					total = math.max(1, math.floor(total * (1 - discount)))
					effect = string.format(" · 자동 흥정 성공! %d코인 절약", before - total)
			else
				effect = " · 자동 흥정 실패 (정가)"
			end
		end
		if total > state.coins then
			return false, "코인이 부족해요" .. effect
		end
		if autoAttempt then
			if not h or h.portId ~= state.portId then
				h = { portId = state.portId, tried = {} }
				state.haggle = h
			end
			h.tried = h.tried or {}
			h.tried[goodId] = true
		end
		if appliedDeal then h.deal = nil end
		state.coins -= total
		local owned = state.cargo[goodId] or 0
		local basis = state.basis[goodId] or 0
		state.basis[goodId] = (basis * owned + total) / (owned + amount)
		state.cargo[goodId] = owned + amount
		ctx.market:set(state.portId, goodId, mult)
		if lim then S.Econ.take(state, state.portId, goodId, amount) end
		state.harborTrade = state.harborTrade or {}
		state.harborTrade[state.portId] = (state.harborTrade[state.portId] or 0) + amount
		noteBook(state, ctx, goodId)
		return true, string.format("%s %d개 구매 (-%d)%s", D.Ports.Goods[goodId].name, amount, total, effect)
	end

	-- [흥정 미니게임 · 오너 확정 5종] 서버 무작위 출제, 판정 및 할인. 표정·타이밍 게임 제외.
	local HAGGLE_GAMES = { "coin", "quiz", "balance", "cargo", "memory" }
	local function haggleState(state)
		local h = state.haggle
		if not h or h.portId ~= state.portId then
			h = { portId = state.portId, tried = {} }
			state.haggle = h
		end
		return h
	end
	local function quizFor(state, goodId, rng)
		local yes, no = {}, {}
		for id, port in D.Ports.Ports do
			if type(port.produces) == "table" then
				if table.find(port.produces, goodId) then table.insert(yes, id) else table.insert(no, id) end
			end
		end
		if #yes == 0 or #no < 3 then return nil end
		table.sort(yes); table.sort(no)
		local right = yes[math.floor(rng() * #yes) + 1]
		local options = { right }
		while #options < 4 do
			local index = math.floor(rng() * #no) + 1
			table.insert(options, table.remove(no, index))
		end
		for i = #options, 2, -1 do
			local j = math.floor(rng() * i) + 1
			options[i], options[j] = options[j], options[i]
		end
		local names = {}
		for i, id in options do names[i] = D.Ports.Ports[id].name end
		return { question = string.format("%s은(는) 어느 항구의 특산품일까?", D.Ports.Goods[goodId].name), options = names, answer = table.find(options, right) }
	end

	function handlers.HaggleStart(state, p, ctx)
		local goodId = p.goodId
		if type(goodId) ~= "string" or not D.Ports.Goods[goodId] then return false, "잘못된 요청" end
		if embargoed(state) or lockOf(state, state.portId, goodId) then return false, "지금은 거래할 수 없어요" end
		local h = haggleState(state)
		if h.tried[goodId] then return false, "이미 흥정해 봤어요. 다음 항구에서 다시 해 봐요" end
		if h.deal and h.deal.goodId == goodId then return false, "이미 흥정한 값이 있어요. 먼저 사세요" end
		local port = D.Ports.Ports[state.portId]
		local ease = math.clamp(S.Harbor.intel(state) * 0.12 + (state.rep[port.country] or 0) / 100 * 0.15, 0, 0.4)
		local quiz = quizFor(state, goodId, ctx.rng)
		local games = table.clone(HAGGLE_GAMES)
		if not quiz then table.remove(games, 2) end -- 생산지 자료 없는 품목에는 정답 없는 문제를 내지 않는다.
		local game = games[math.floor(ctx.rng() * #games) + 1]
		local pending = { goodId = goodId, game = game, ease = ease, started = workspace:GetServerTimeNow() }
		if game == "coin" then
			pending.count = if ease >= 0.2 then 3 else 4
			pending.real = math.floor(ctx.rng() * pending.count) + 1
		elseif game == "quiz" then
			pending.quiz = quiz
		elseif game == "balance" then
			-- 다섯 추 중 임의 부분집합의 합: 항상 정확한 균형을 만들 수 있다.
			pending.weights = { 1, 2, 3, 5, 8 }
			pending.target = 0
			for _, weight in pending.weights do
				if ctx.rng() < 0.5 then pending.target += weight end
			end
			if pending.target == 0 or pending.target == 19 then pending.target = 9 end
			pending.duration = 15
		elseif game == "cargo" then
			-- 4×3 직사각형을 다섯 조각으로 분할한다. 섞고 회전해도 원래 배치는 항상 해답이다.
			local pieces = { { w = 4, h = 3 } }
			while #pieces < 5 do
				local candidates = {}
				for i, piece in pieces do if piece.w > 1 or piece.h > 1 then table.insert(candidates, i) end end
				local index = candidates[math.floor(ctx.rng() * #candidates) + 1]
				local piece = table.remove(pieces, index)
				if piece.w > 1 and (piece.h == 1 or ctx.rng() < 0.5) then
					local n = math.floor(ctx.rng() * (piece.w - 1)) + 1
					table.insert(pieces, { w = n, h = piece.h })
					table.insert(pieces, { w = piece.w - n, h = piece.h })
				else
					local n = math.floor(ctx.rng() * (piece.h - 1)) + 1
					table.insert(pieces, { w = piece.w, h = n })
					table.insert(pieces, { w = piece.w, h = piece.h - n })
				end
			end
			for i = #pieces, 2, -1 do
				local j = math.floor(ctx.rng() * i) + 1
				pieces[i], pieces[j] = pieces[j], pieces[i]
			end
			for _, piece in pieces do if ctx.rng() < 0.5 then piece.w, piece.h = piece.h, piece.w end end
			pending.pieces = pieces
			pending.duration = 20
		else
			local pool = {}
			for id in D.Ports.Goods do table.insert(pool, id) end
			table.sort(pool)
			pending.goods = {}
			for i = 1, 5 do
				local index = math.floor(ctx.rng() * #pool) + 1
				local id = table.remove(pool, index)
				pending.goods[i] = { id = id, name = D.Ports.Goods[id].name }
			end
			pending.sequence = { 1, 2, 3, 4, 5 }
			for i = 5, 2, -1 do
				local j = math.floor(ctx.rng() * i) + 1
				pending.sequence[i], pending.sequence[j] = pending.sequence[j], pending.sequence[i]
			end
			pending.duration = 18 -- 3초 공개 + 15초 입력
		end
		-- 시작 자체가 한 번의 도전이다. 창 닫기·재요청으로 문제를 바꿀 수 없다.
		h.tried[goodId] = true
		h.pending = pending
		return true, "흥정을 시작해요"
	end

	function handlers.HagglePlay(state, p, ctx)
		local h = state.haggle
		local pend = h and h.portId == state.portId and h.pending
		if not pend or pend.goodId ~= p.goodId then return false, "흥정을 먼저 시작해요" end
		h.pending = nil
		h.tried[pend.goodId] = true
		local pct = 0
		local elapsed = if pend.started then math.max(0, workspace:GetServerTimeNow() - pend.started) else math.huge
		local function integer(n, lo, hi)
			return type(n) == "number" and n >= lo and n <= hi and n == math.floor(n)
		end
		local function timedPct()
			return math.clamp(4 + math.floor(8 * (1 - elapsed / pend.duration) + 0.5), 4, 12)
		end
		if pend.game == "coin" then
			if integer(p.pick, 1, pend.count) and p.pick == pend.real then pct = 8 + math.floor(pend.ease * 10) end
		elseif pend.game == "quiz" then
			if pend.quiz and integer(p.pick, 1, 4) and p.pick == pend.quiz.answer then pct = 10 end
		elseif pend.game == "balance" and elapsed <= pend.duration + 2 then
			if type(p.weights) == "table" and #p.weights <= #pend.weights then
				local used, total, valid = {}, 0, true
				for _, index in p.weights do
					if not integer(index, 1, #pend.weights) or used[index] then valid = false; break end
					used[index] = true
					total += pend.weights[index]
				end
				if valid and total == pend.target then pct = timedPct() end
			end
		elseif pend.game == "cargo" and elapsed <= pend.duration + 2 then
			if type(p.placements) == "table" and #p.placements == #pend.pieces then
				local occupied, valid, count = {}, true, 0
				for i, piece in pend.pieces do
					local pos = p.placements[i]
					if type(pos) ~= "table" or not integer(pos.x, 1, 4) or not integer(pos.y, 1, 3) or type(pos.rot) ~= "boolean" then valid = false; break end
					local w, ht = if pos.rot then piece.h else piece.w, if pos.rot then piece.w else piece.h
					if pos.x + w - 1 > 4 or pos.y + ht - 1 > 3 then valid = false; break end
					for y = pos.y, pos.y + ht - 1 do
						for x = pos.x, pos.x + w - 1 do
							local cell = (y - 1) * 4 + x
							if occupied[cell] then valid = false end
							occupied[cell] = true; count += 1
						end
					end
				end
				if valid and count == 12 then pct = timedPct() end
			end
		elseif pend.game == "memory" and elapsed >= 3 and elapsed <= pend.duration + 2 then
			if type(p.sequence) == "table" and #p.sequence == 5 then
				local correct, used, valid = 0, {}, true
				for i = 1, 5 do
					local index = p.sequence[i]
					if not integer(index, 1, 5) or used[index] then valid = false; break end
					used[index] = true
					if index == pend.sequence[i] then correct += 1 end
				end
				if valid and correct == 5 then pct = math.max(8, timedPct()) elseif valid and correct == 4 then pct = 4 end
			end
		end
		pct = math.clamp(pct, 0, 12)
		local name = D.Ports.Goods[pend.goodId].name
		if pct > 0 then
			h.deal = { goodId = pend.goodId, mult = 1 - pct / 100 }
			return true, string.format("흥정 성공! %s 다음 구매가 %d%% 싸져요", name, pct)
		end
		return false, "정가대로 사요 (손해는 없어요)"
	end

	-- 흥정: 물건마다 항구에서 한 번만 시도할 수 있다. 성공하면 다음 구매가 4~8% 싸진다.
	-- 동료의 장사 감각(intel)과 그 나라 우호도가 높을수록 잘 통한다.
	function handlers.Haggle(state, p, ctx)
		local goodId = p.goodId
		if type(goodId) ~= "string" or not D.Ports.Goods[goodId] then
			return false, "잘못된 요청"
		end
		local h = state.haggle
		if not h or h.portId ~= state.portId then
			h = { portId = state.portId, tried = {} }
			state.haggle = h
		end
		if h.tried[goodId] then
			return false, "이미 흥정해 봤어요. 다음에 들러 보세요"
		end
		h.tried[goodId] = true
		local port = D.Ports.Ports[state.portId]
		local intel = S.Harbor.intel(state)
		local chance = math.clamp(0.35 + 0.1 * intel + (state.rep[port.country] or 0) / 100 * 0.2, 0.2, 0.9)
		if ctx.rng() < chance then
			local mult = 1 - (0.04 + ctx.rng() * 0.04)
			h.deal = { goodId = goodId, mult = mult }
			return true, string.format("흥정 성공! %s 다음 구매가 %d%% 싸져요", D.Ports.Goods[goodId].name, math.floor((1 - mult) * 100 + 0.5))
		end
		return false, "상인이 고개를 젓네요. 정가대로 사야 해요"
	end

	function handlers.Sell(state, p, ctx)
		local goodId, amount = p.goodId, parseAmount(p.amount, state)
		if type(goodId) ~= "string" or not D.Ports.Goods[goodId] or not amount then
			return false, "잘못된 요청"
		end
		local owned = state.cargo[goodId] or 0
		if owned < amount then
			return false, "가진 수량이 부족해요"
		end
		if embargoed(state) then
			return false, "전쟁 중인 나라의 항구라 정식 거래가 막혔어요 (암시장은 가능해요)"
		end
		local lim = limits(state, goodId)
		if lim and amount > lim.absorb then
			return false, if lim.absorb <= 0 then "이 항구는 이 물건이 넘쳐서 더 사지 않아요. 다른 항구에 팔아 보세요" else string.format("이 항구는 지금 %d개까지만 사줘요", lim.absorb)
		end
		local rate = sellRateFor(state)
		local mult = ctx.market:get(state.portId, goodId)
		local ev = (ctx.market:eventMult(state.portId, goodId) * S.History.mult(state, state.portId, goodId) * (if S.Econ and S.Econ.marketFactor then S.Econ.marketFactor(state, state.portId, goodId) else 1))
		local revenue = 0
		for _ = 1, amount do
			revenue += T.sellPrice(state.portId, goodId, mult, rate * S.Knowledge.goodsMult(state, goodId), ev)
			mult = T.nextStockMult(mult, 1, false)
		end
		local TF = D.TradeFun
		local tariff = math.floor(revenue * tariffRate(state) * (if TF then TF.tariffMult(state) else 1))
		revenue -= tariff
		-- [교역 재미] 신상품·축제·라이벌·상회 등급·희귀 화물 보너스
		local fun = if TF then TF.sellBonus(state, D.Ports, D.Regions, state.portId, goodId, amount, revenue) else nil
		if fun then revenue = math.max(0, revenue + fun.bonus) end
		local profit = revenue - (state.basis[goodId] or 0) * amount
		state.coins += revenue
		S.State.removeCargo(state, goodId, amount)
		ctx.market:set(state.portId, goodId, mult)
		if lim then S.Econ.give(state, state.portId, goodId, amount) end

		local msgs = { string.format("%s %d개 판매 (+%d)%s", D.Ports.Goods[goodId].name, amount, revenue, if tariff > 0 then string.format(" · 관세 -%d", tariff) else "") }
		if fun then
			for _, line in fun.lines do table.insert(msgs, line) end
			local up = TF.commitSell(state, fun, profit, goodId, amount)
			if up then table.insert(msgs, up) end
		end
		do
			local country = D.Ports.Ports[state.portId].country
			local gain = math.min(3, math.floor(revenue / 150))
			if gain > 0 then
				local before = state.rep[country] or 0
				state.rep[country] = math.min(100, before + gain)
				if math.floor(state.rep[country] / 25) > math.floor(before / 25) then
					table.insert(msgs, "이 나라와의 우호도가 올랐다 (관세 우대 확대)")
				end
			end
		end
		state.harborTrade = state.harborTrade or {}
		state.harborTrade[state.portId] = (state.harborTrade[state.portId] or 0) + (tonumber(amount) or 0)
		noteBook(state, ctx, goodId)
		if profit > 0 then
			S.State.gainXp(state, "trade", math.floor(profit / 8) + 1, msgs)
			S.Perk.gainSpec(state, "trade", math.floor(profit / 10) + 1, msgs)
		end
		return true, table.concat(msgs, "\n")
	end

	-- [교역 재미 7] 희귀 화물: 이 항구에 뜬 한정 화물을 통째로 산다. 지정 항구에 팔아야 이익.
	function handlers.BuyRareLot(state, _p, _ctx)
		local TF = D.TradeFun
		if not TF then return false, "지금은 살 수 없어요" end
		local lot: any = TF.rareLot(D.Ports, D.Regions, state.portId, state.day or 0)
		if not lot then return false, "이 항구에는 지금 희귀 화물이 없어요" end
		if TF.get(state).lots[lot.key] then return false, "이미 산 화물이에요" end
		if lot.qty > S.State.cargoCapacity(state) - S.State.cargoUsed(state) then return false, "화물칸이 부족해요" end
		local total: number = math.floor(tonumber(lot.unitPrice * lot.qty) or 0)
		if total > state.coins then return false, "코인이 부족해요" end
		state.coins -= total
		local owned = state.cargo[lot.goodId] or 0
		local basis = state.basis[lot.goodId] or 0
		state.basis[lot.goodId] = (basis * owned + total) / (owned + lot.qty)
		state.cargo[lot.goodId] = owned + lot.qty
		TF.commitRareBuy(state, lot)
		local names = {}
		for _, id in lot.targets do table.insert(names, D.Ports.Ports[id].name) end
		return true, string.format("희귀 %s %d개 구매 (-%d)\n%d일 안에 %s 중 한 곳에 팔면 %.1f배!", D.Ports.Goods[lot.goodId].name, lot.qty, total, TF.RARE_KEEP, table.concat(names, "·"), TF.RARE_SELL)
	end

	-- 암시장: 관세 없이 10% 더 받지만 들키면 압수·벌금. 우호도가 높을수록 덜 들킨다.
	function handlers.Smuggle(state, p, ctx)
		local goodId, amount = p.goodId, parseAmount(p.amount, state)
		if type(goodId) ~= "string" or not D.Ports.Goods[goodId] or not amount then
			return false, "잘못된 요청"
		end
		if (state.cargo[goodId] or 0) < amount then
			return false, "가진 수량이 부족해요"
		end
		local port = D.Ports.Ports[state.portId]
		local caught = 0.25 - (state.rep[port.country] or 0) * 0.002
		if ctx.rng() < caught then
			S.State.removeCargo(state, goodId, amount)
			local fine = math.min(state.coins, 150)
			state.coins -= fine
			state.rep[port.country] = math.max(0, (state.rep[port.country] or 0) - 8)
			return true, string.format("세관에 들켰다! %s %d개 압수, 벌금 %d, 우호도 -8", D.Ports.Goods[goodId].name, amount, fine)
		end
		local rate = sellRateFor(state)
		local mult = ctx.market:get(state.portId, goodId)
		local ev = (ctx.market:eventMult(state.portId, goodId) * S.History.mult(state, state.portId, goodId) * (if S.Econ and S.Econ.marketFactor then S.Econ.marketFactor(state, state.portId, goodId) else 1))
		local revenue = 0
		for _ = 1, amount do
			revenue += T.sellPrice(state.portId, goodId, mult, rate * S.Knowledge.goodsMult(state, goodId), ev)
			mult = T.nextStockMult(mult, 1, false)
		end
		revenue = math.floor(revenue * 1.1)
		state.coins += revenue
		S.State.removeCargo(state, goodId, amount)
		ctx.market:set(state.portId, goodId, mult)
		return true, string.format("%s %d개를 몰래 팔았다 (+%d, 관세 없음)", D.Ports.Goods[goodId].name, amount, revenue)
	end

	return { handlers = handlers, sellRateFor = sellRateFor, repBonus = repBonus, tariffRate = tariffRate, lockOf = lockOf }
end
