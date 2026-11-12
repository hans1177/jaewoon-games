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
		state.harborPaid = state.harborPaid or {}
		state.harborPaid[state.portId] = (state.harborPaid[state.portId] or 0) + amount
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

	-- 항구는 스스로도 자란다: 항구에 도착하면 마지막으로 들른 뒤 흐른 날수만큼 도시가 저절로 발전한다.
	-- 이미 번영한 항구일수록 빨리 자라고, 큰 항구(4단계 이상)는 스스로 못 자라 투자가 필요하다.
	-- 투자한 항구는 번창한 만큼 세금 일부를 투자자(플레이어)에게 보내온다.
	local SELF_GROW_CAP = H.THRESHOLDS[4] - 1
	local function grow(state)
		local msgs = {}
		if state._growPort == state.portId then
			return msgs
		end
		local first = state._growPort == nil
		state._growPort = state.portId
		state.harborSeen = state.harborSeen or {}
		local seen = state.harborSeen[state.portId]
		state.harborSeen[state.portId] = state.day
		if first or not seen then
			return msgs
		end
		local elapsed = math.min(state.day - seen, 180)
		if elapsed <= 0 then
			state.harborSeen[state.portId] = seen
			return msgs
		end
		local inv = invested(state)
		local before = levelAt(state)
		local year = state.startYear + math.floor(state.day / 365)
		local regime = H.regime(year)
		local port = D.Ports.Ports[state.portId]
		state.harborTrade = state.harborTrade or {}
		local activity = (state.harborTrade[state.portId] or 0) / 150
		state.harborTrade[state.portId] = nil
		local region = D.Regions.of(port).id
		local vit = H.vitality(regime, region, port.produces, activity)
		if vit >= 0.5 and inv < SELF_GROW_CAP then
			local gain = math.floor(elapsed * (1.2 + before * 1.5) * vit)
			if gain > 0 then
				state.harbor[state.portId] = math.min(SELF_GROW_CAP, inv + gain)
				table.insert(msgs, string.format("%s가 %s 속에 스스로 자랐다 (+%d)", port.name, regime.name, gain))
			end
		elseif vit < 0.5 then
			-- 불황: 스스로 키운 몫만 줄고, 플레이어가 투자한 만큼은 지킨다.
			local floorAt = (state.harborPaid and state.harborPaid[state.portId]) or 0
			local loss = math.floor(elapsed * (0.8 + before * 0.6) * (0.5 - vit))
			if loss > 0 and inv > floorAt then
				state.harbor[state.portId] = math.max(floorAt, inv - loss)
				table.insert(msgs, string.format("%s: %s로 %s 상점이 문을 닫았다 (-%d)", regime.name, regime.note, port.name, math.min(loss, inv - floorAt)))
			end
		end
		local after = levelAt(state)
		if after > before then
			table.insert(msgs, string.format("항구가 '%s'(으)로 발전했다!", H.NAMES[after]))
		elseif after < before then
			table.insert(msgs, string.format("항구가 '%s'(으)로 위축됐다", H.NAMES[after]))
		end
		-- 투자한 항구의 세금 수익
		local stake = state.harbor[state.portId] or 0
		if stake >= H.OPTIONS[1] then
			local tax = math.floor(stake * 0.0006 * math.min(elapsed, 120))
			if tax > 0 then
				state.coins += tax
				table.insert(msgs, string.format("항구가 번창해 세금 일부를 보내왔다: %d코인", tax))
			end
		end
		return msgs
	end

	-- 길드 의뢰 보드
	local function sortedGoods()
		local ids = {}
		for id in D.Ports.Goods do
			table.insert(ids, id)
		end
		table.sort(ids)
		return ids
	end
	local function boardHere(state)
		return D.Bounties.board(state.portId, state.day, D.Ports.Goods, sortedGoods())
	end
	local function findBounty(state, id)
		for _, b in boardHere(state) do
			if b.id == id then
				return b
			end
		end
		return nil
	end

	function handlers.AcceptBounty(state, p)
		local b = type(p.bountyId) == "string" and findBounty(state, p.bountyId)
		if not b then
			return false, "게시판에 없는 의뢰예요"
		end
		if state.bounty.done[b.id] then
			return false, "이미 끝낸 의뢰예요"
		end
		if state.bounty.taken[b.id] then
			return false, "이미 맡은 의뢰예요"
		end
		local n = 0
		for _ in state.bounty.taken do
			n += 1
		end
		if n >= 5 then
			return false, "의뢰는 5건까지 맡을 수 있어요"
		end
		state.bounty.taken[b.id] = state.stats.battlesWon
		return true, "의뢰를 맡았다: " .. b.title
	end

	function handlers.TurnInBounty(state, p)
		local b = type(p.bountyId) == "string" and findBounty(state, p.bountyId)
		if not b or state.bounty.taken[b.id] == nil then
			return false, "맡은 의뢰가 아니에요"
		end
		if b.kind == "deliver" then
			if (state.cargo[b.goodId] or 0) < b.count then
				return false, string.format("%s %d개가 필요해요", D.Ports.Goods[b.goodId].name, b.count)
			end
			S.State.removeCargo(state, b.goodId, b.count)
		else
			if state.stats.battlesWon - state.bounty.taken[b.id] < b.count then
				return false, string.format("해전 승리 %d번이 더 필요해요", b.count - (state.stats.battlesWon - state.bounty.taken[b.id]))
			end
		end
		state.bounty.taken[b.id] = nil
		state.bounty.done[b.id] = true
		-- 오래된 완료 기록은 정리한다
		local week = math.floor(state.day / 7)
		for id in state.bounty.done do
			local w = tonumber(string.match(id, ":(%d+):"))
			if w and w < week - 3 then
				state.bounty.done[id] = nil
			end
		end
		state.coins += b.coins
		state.fame += b.fame
		return true, string.format("의뢰 완료! +%d코인, 명성 +%d", b.coins, b.fame)
	end

	-- 주점 회식: 선원 수 × 3코인으로 사기 +30
	function handlers.Feast(state)
		local cost = math.max(10, state.ship.crew * 3)
		if state.morale >= 100 then
			return false, "선원들의 사기는 이미 하늘을 찔러요"
		end
		if state.coins < cost then
			return false, string.format("회식에는 %d코인이 필요해요", cost)
		end
		state.coins -= cost
		state.morale = math.min(100, state.morale + 30)
		return true, string.format("선원들에게 한턱 냈다! 사기 +30 (-%d코인)", cost)
	end

	-- 거래 정보 수준: 동료의 장사 감각 + 무역가 전문 레벨. 0=감만, 1~2=대략, 3 이상=정확한 수치.
	local COMPANION_INTEL = { c_boyle = 3, c_halley = 2 }
	local function intel(state)
		local total = 0
		for _, id in state.companions do
			local base = COMPANION_INTEL[id] or 1
			total += base * D.Specialties.affinityMult(S.Perk.affinityOf(state, id))
		end
		if state.specialty == "merchant" then
			total += S.Perk.specLevel(state, "merchant")
		end
		return math.floor(total)
	end

	local function vagueProfit(profit)
		if profit >= 120 then
			return "큰 이문이 남는다고 한다"
		elseif profit >= 60 then
			return "쏠쏠하게 남는다고 한다"
		end
		return "조금은 남는다고 한다"
	end

	-- 주점 소문: 지금 이 항구에서 사서 다른 항구에 팔면 남는 상품.
	-- 동료가 없으면 어느 항구가 좋다는 정도의 힌트만, 있으면 범위, 장사 감각이 높으면 정확한 수치.
	function handlers.Rumor(state, _p, ctx)
		if state.coins < H.RUMOR_COST then
			return false, "코인이 부족해요"
		end
		local here = state.portId
		local rate = S.Trade.sellRateFor(state)
		local deals = {}
		for goodId, good in D.Ports.Goods do
			local buy = T.getPrice(here, goodId, ctx.market:get(here, goodId), (ctx.market:eventMult(here, goodId) * S.History.mult(state, here, goodId)) * S.Knowledge.supplyMult(state, here, goodId))
			for portId, port in D.Ports.Ports do
				if portId ~= here then
					local sell = T.sellPrice(portId, goodId, ctx.market:get(portId, goodId), rate * S.Knowledge.goodsMult(state, goodId), (ctx.market:eventMult(portId, goodId) * S.History.mult(state, portId, goodId)))
					table.insert(deals, { good = good.name, port = port.name, profit = sell - buy })
				end
			end
		end
		table.sort(deals, function(a, b)
			return a.profit > b.profit
		end)
		local level = intel(state)
		local limit = if level >= 3 then 5 elseif level >= 1 then 4 else 3
		state.coins -= H.RUMOR_COST
		local lines, seen = {}, {}
		for _, d in deals do
			if not seen[d.good] and #lines < limit then
				seen[d.good] = true
				local text
				if level >= 3 then
					text = string.format("%s: %s에서 팔면 개당 약 %+d", d.good, d.port, d.profit)
				elseif level >= 1 then
					local lo = math.floor(d.profit * 0.8 / 10) * 10
					text = string.format("%s: %s 쪽이 개당 %d~%d 남는다더라", d.good, d.port, lo, lo + math.max(20, math.floor(d.profit * 0.4 / 10) * 10))
				else
					text = string.format("%s: %s 쪽에서 %s", d.good, d.port, vagueProfit(d.profit))
				end
				table.insert(lines, text)
			end
		end
		state.rumor = { portId = here, level = level, lines = lines }
		local who = if level >= 3 then "동료가 장부를 펼치며 정확히 짚어 준다" elseif level >= 1 then "동료가 대강의 시세를 보태 준다" else "뱃사람이 취기에 귀띔한다 (동료가 있으면 더 정확해요)"
		return true, string.format("술값 %d코인. %s", H.RUMOR_COST, who)
	end

	return {
		handlers = handlers,
		level = levelAt,
		sellBonus = sellBonus,
		costMult = costMult,
		invested = invested,
		intel = intel,
		boardHere = boardHere,
		grow = grow,
	}
end
