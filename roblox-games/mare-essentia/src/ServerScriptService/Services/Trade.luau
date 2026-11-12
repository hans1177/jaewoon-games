--!nonstrict
-- 교역: 사고팔기. 평균 매입가 대비 이익이 교역 경험치가 된다.

return function(D, S)
	local T = D.TradeMath
	local handlers = {}
	local MAX_AMOUNT = 20

	local function parseAmount(value)
		if type(value) ~= "number" or value ~= value then
			return nil
		end
		local n = math.floor(value)
		if n < 1 or n > MAX_AMOUNT then
			return nil
		end
		return n
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
		return math.max(0, 0.05 - (state.rep[port.country] or 0) / 100 * 0.05)
	end

	local function sellRateFor(state)
		local nation = D.Ports.Nations[state.nationId]
		return T.sellRate(D.Careers.sellBonus(state.careers.trade.level) + nation.sellBonus + S.Perk.sellBonus(state) + S.Harbor.sellBonus(state) + S.Order.sellBonus(state) + S.Facility.titleBonus(state) + repBonus(state) + S.Build.sellBonus(state))
	end

	function handlers.Buy(state, p, ctx)
		local goodId, amount = p.goodId, parseAmount(p.amount)
		if type(goodId) ~= "string" or not D.Ports.Goods[goodId] or not amount then
			return false, "잘못된 요청"
		end
		if amount > S.State.cargoCapacity(state) - S.State.cargoUsed(state) then
			return false, "화물칸이 부족해요"
		end
		local mult = ctx.market:get(state.portId, goodId)
		local ev = (ctx.market:eventMult(state.portId, goodId) * S.History.mult(state, state.portId, goodId))
		local total = 0
		for _ = 1, amount do
			total += T.getPrice(state.portId, goodId, mult, ev * S.Knowledge.supplyMult(state, state.portId, goodId))
			mult = T.nextStockMult(mult, 1, true)
		end
		-- 흥정으로 받은 할인은 같은 항구·같은 물건의 다음 구매 한 번에만 적용된다
		local h = state.haggle
		if h and h.deal and h.deal.goodId == goodId and h.portId == state.portId then
			total = math.max(1, math.floor(total * h.deal.mult))
			h.deal = nil
		end
		if total > state.coins then
			return false, "코인이 부족해요"
		end
		state.coins -= total
		local owned = state.cargo[goodId] or 0
		local basis = state.basis[goodId] or 0
		state.basis[goodId] = (basis * owned + total) / (owned + amount)
		state.cargo[goodId] = owned + amount
		ctx.market:set(state.portId, goodId, mult)
		state.harborTrade = state.harborTrade or {}
		state.harborTrade[state.portId] = (state.harborTrade[state.portId] or 0) + amount
		return true, string.format("%s %d개 구매 (-%d)", D.Ports.Goods[goodId].name, amount, total)
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
		local goodId, amount = p.goodId, parseAmount(p.amount)
		if type(goodId) ~= "string" or not D.Ports.Goods[goodId] or not amount then
			return false, "잘못된 요청"
		end
		local owned = state.cargo[goodId] or 0
		if owned < amount then
			return false, "가진 수량이 부족해요"
		end
		local rate = sellRateFor(state)
		local mult = ctx.market:get(state.portId, goodId)
		local ev = (ctx.market:eventMult(state.portId, goodId) * S.History.mult(state, state.portId, goodId))
		local revenue = 0
		for _ = 1, amount do
			revenue += T.sellPrice(state.portId, goodId, mult, rate * S.Knowledge.goodsMult(state, goodId), ev)
			mult = T.nextStockMult(mult, 1, false)
		end
		local tariff = math.floor(revenue * tariffRate(state))
		revenue -= tariff
		local profit = revenue - (state.basis[goodId] or 0) * amount
		state.coins += revenue
		S.State.removeCargo(state, goodId, amount)
		ctx.market:set(state.portId, goodId, mult)

		local msgs = { string.format("%s %d개 판매 (+%d)%s", D.Ports.Goods[goodId].name, amount, revenue, if tariff > 0 then string.format(" · 관세 -%d", tariff) else "") }
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
		if profit > 0 then
			S.State.gainXp(state, "trade", math.floor(profit / 8) + 1, msgs)
			S.Perk.gainSpec(state, "trade", math.floor(profit / 10) + 1, msgs)
		end
		return true, table.concat(msgs, "\n")
	end

	-- 암시장: 관세 없이 10% 더 받지만 들키면 압수·벌금. 우호도가 높을수록 덜 들킨다.
	function handlers.Smuggle(state, p, ctx)
		local goodId, amount = p.goodId, parseAmount(p.amount)
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
		local ev = (ctx.market:eventMult(state.portId, goodId) * S.History.mult(state, state.portId, goodId))
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
