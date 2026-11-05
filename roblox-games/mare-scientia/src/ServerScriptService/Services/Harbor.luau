--!nonstrict
-- 항구 시설: 교역소 투자(발전 단계)와 주점 소문.

return function(D, S)
	local H = D.Harbor
	local T = D.TradeMath
	local handlers = {}

	local function invested(state, portId)
		return state.harbor[portId or state.portId] or 0
	end

	local function levelAt(state, portId)
		return H.level(invested(state, portId))
	end

	-- 현재 항구에서 적용되는 보너스
	local function sellBonus(state)
		return H.SELL_BONUS[levelAt(state)]
	end

	local function costMult(state)
		return 1 - H.COST_DISCOUNT[levelAt(state)]
	end

	function handlers.Invest(state, p)
		local amount = p.amount
		if type(amount) ~= "number" or not table.find(H.OPTIONS, amount) then
			return false, "잘못된 투자 금액이에요"
		end
		if amount > state.coins then
			return false, "코인이 부족해요"
		end
		local before = levelAt(state)
		state.coins -= amount
		state.harbor[state.portId] = invested(state) + amount
		local msgs = { string.format("%s에 %d코인을 투자했다", D.Ports.Ports[state.portId].name, amount) }
		local fame = math.floor(amount / 100)
		state.fame += fame
		table.insert(msgs, string.format("명성 +%d", fame))
		local after = levelAt(state)
		if after > before then
			table.insert(msgs, string.format("항구가 '%s'(으)로 발전했다!", H.NAMES[after]))
		end
		S.Perk.gainSpec(state, "trade", math.floor(amount / 40), msgs)
		return true, table.concat(msgs, "\n")
	end

	-- 주점 소문: 지금 이 항구에서 사서 다른 항구에 팔면 가장 남는 상품 3가지
	function handlers.Rumor(state, _p, ctx)
		if state.coins < H.RUMOR_COST then
			return false, "코인이 부족해요"
		end
		local here = state.portId
		local rate = S.Trade.sellRateFor(state)
		local deals = {}
		for goodId, good in D.Ports.Goods do
			local buy = T.getPrice(here, goodId, ctx.market:get(here, goodId), ctx.market:eventMult(here, goodId))
			for portId, port in D.Ports.Ports do
				if portId ~= here then
					local sell = T.sellPrice(portId, goodId, ctx.market:get(portId, goodId), rate, ctx.market:eventMult(portId, goodId))
					table.insert(deals, { text = string.format("%s: %s에서 팔면 개당 %+d", good.name, port.name, sell - buy), profit = sell - buy })
				end
			end
		end
		table.sort(deals, function(a, b)
			return a.profit > b.profit
		end)
		state.coins -= H.RUMOR_COST
		local msgs = { string.format("술값 %d코인. 뱃사람이 귀띔한다:", H.RUMOR_COST) }
		local seen = {}
		for _, d in deals do
			local key = d.text:match("^[^:]+")
			if not seen[key] and #msgs < 4 then
				seen[key] = true
				table.insert(msgs, "· " .. d.text)
			end
		end
		return true, table.concat(msgs, "\n")
	end

	return {
		handlers = handlers,
		level = levelAt,
		sellBonus = sellBonus,
		costMult = costMult,
		invested = invested,
	}
end
