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

	function handlers.Buy(state, p, ctx)
		local goodId, amount = p.goodId, parseAmount(p.amount, state)
		if type(goodId) ~= "string" or not D.Ports.Goods[goodId] or not amount then
			return false, "잘못된 요청"
		end
		if embargoed(state) then
			return false, "전쟁 중인 나라의 항구라 정식 거래가 막혔어요 (암시장은 가능해요)"
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

	return { handlers = handlers, sellRateFor = sellRateFor, repBonus = repBonus, tariffRate = tariffRate }
end
