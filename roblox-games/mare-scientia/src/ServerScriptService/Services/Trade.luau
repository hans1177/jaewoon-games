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

	local function sellRateFor(state)
		local nation = D.Ports.Nations[state.nationId]
		return T.sellRate(D.Careers.sellBonus(state.careers.trade.level) + nation.sellBonus + S.Perk.sellBonus(state) + S.Harbor.sellBonus(state) + S.Facility.titleBonus(state))
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
		local ev = ctx.market:eventMult(state.portId, goodId)
		local total = 0
		for _ = 1, amount do
			total += T.getPrice(state.portId, goodId, mult, ev)
			mult = T.nextStockMult(mult, 1, true)
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
		return true, string.format("%s %d개 구매 (-%d)", D.Ports.Goods[goodId].name, amount, total)
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
		local ev = ctx.market:eventMult(state.portId, goodId)
		local revenue = 0
		for _ = 1, amount do
			revenue += T.sellPrice(state.portId, goodId, mult, rate, ev)
			mult = T.nextStockMult(mult, 1, false)
		end
		local profit = revenue - (state.basis[goodId] or 0) * amount
		state.coins += revenue
		S.State.removeCargo(state, goodId, amount)
		ctx.market:set(state.portId, goodId, mult)

		local msgs = { string.format("%s %d개 판매 (+%d)", D.Ports.Goods[goodId].name, amount, revenue) }
		if profit > 0 then
			S.State.gainXp(state, "trade", math.floor(profit / 8) + 1, msgs)
			S.Perk.gainSpec(state, "trade", math.floor(profit / 10) + 1, msgs)
		end
		return true, table.concat(msgs, "\n")
	end

	return { handlers = handlers, sellRateFor = sellRateFor }
end
