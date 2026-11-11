--!nonstrict
-- 증권거래소: 주식 사고팔기와 배당. 시세는 Stocks.price (날짜로 계산).

return function(D, S)
	local SK = D.Stocks
	local handlers = {}

	local function st(state)
		state.stocks = state.stocks or { held = {}, cost = {}, next = state.day + SK.DIV_DAYS, divTotal = 0, trades = 0 }
		return state.stocks
	end

	local function yearF(state, day)
		return state.startYear + (day or state.day) / 365
	end

	local function priceOf(state, stock, day)
		return SK.price(stock, yearF(state, day))
	end

	-- 거래 수수료: 3%에서 시작해 상업·경제학 지식을 이해할수록 줄어든다 (최저 0.5%)
	local function feeRate(state)
		local n = 0
		for id, v in state.reported or {} do
			local node = v == true and D.KnowledgeTree.ById[id]
			if node and node.disc == "commerce" then
				n += 1
			end
		end
		return math.max(0.005, 0.03 - 0.0025 * n)
	end

	local function openHere(state)
		return SK.EXCHANGES[state.portId] ~= nil
	end

	local function find(id)
		return type(id) == "string" and SK.ById[id]
	end

	-- 분기마다 배당: 오래 항해하다 돌아오면 밀린 분기를 한꺼번에 받는다
	local function tick(state)
		local s = state.stocks
		if not s then
			return
		end
		local guard = 0
		while s.next <= state.day and guard < 40 do
			guard += 1
			local total = 0
			for id, n in s.held do
				local stock = SK.ById[id]
				local p = stock and priceOf(state, stock, s.next)
				if p and n > 0 then
					total += math.floor(n * p * stock.dividend / (365 / SK.DIV_DAYS))
				end
			end
			if total > 0 then
				state.coins += total
				s.divTotal += total
			end
			s.next += SK.DIV_DAYS
		end
	end

	function handlers.StockBuy(state, p)
		if not openHere(state) then
			return false, "증권거래소가 있는 항구(암스테르담·런던)에서만 거래해요"
		end
		local stock = find(p.id)
		local n = type(p.amount) == "number" and math.floor(p.amount)
		if not stock or not n or n < 1 or n > 100 then
			return false, "잘못된 요청"
		end
		local price = priceOf(state, stock)
		if not price then
			return false, string.format("%s은(는) 아직 상장되지 않았어요 (%d년 상장)", stock.name, stock.since)
		end
		local s = st(state)
		if (s.held[stock.id] or 0) + n > SK.MAX_HELD then
			return false, string.format("한 종목은 %d주까지 들 수 있어요", SK.MAX_HELD)
		end
		local cost = math.ceil(price * n * (1 + feeRate(state)))
		if cost > state.coins then
			return false, string.format("%d코인이 필요해요", cost)
		end
		state.coins -= cost
		s.held[stock.id] = (s.held[stock.id] or 0) + n
		s.cost[stock.id] = (s.cost[stock.id] or 0) + cost
		s.trades += 1
		return true, string.format("%s %d주를 주당 %d코인에 샀다 (수수료 포함 %d코인)", stock.name, n, price, cost)
	end

	function handlers.StockSell(state, p)
		if not openHere(state) then
			return false, "증권거래소가 있는 항구(암스테르담·런던)에서만 거래해요"
		end
		local stock = find(p.id)
		local s = st(state)
		local have = stock and s.held[stock.id] or 0
		local n = type(p.amount) == "number" and math.floor(p.amount)
		if not stock or not n or n < 1 then
			return false, "잘못된 요청"
		end
		n = math.min(n, have)
		if n < 1 then
			return false, "가진 주식이 없어요"
		end
		local price = priceOf(state, stock)
		local gain = math.floor(price * n * (1 - feeRate(state)))
		local costPart = math.floor((s.cost[stock.id] or 0) * n / have)
		s.cost[stock.id] = (s.cost[stock.id] or 0) - costPart
		s.held[stock.id] = have - n
		if s.held[stock.id] == 0 then
			s.held[stock.id] = nil
			s.cost[stock.id] = nil
		end
		state.coins += gain
		s.trades += 1
		local profit = gain - costPart
		return true, string.format("%s %d주를 주당 %d코인에 팔았다 (%s%d코인)", stock.name, n, price, if profit >= 0 then "이익 +" else "손실 ", profit)
	end

	local function viewOf(state)
		if not openHere(state) then
			return nil
		end
		local s = st(state)
		local rows = {}
		for _, stock in SK.Stocks do
			local price = priceOf(state, stock)
			local prev = price and priceOf(state, stock, state.day - 30)
			local held = s.held[stock.id] or 0
			table.insert(rows, {
				id = stock.id, name = stock.name, summary = stock.summary, since = stock.since, listed = price ~= nil,
				price = price, change = if price and prev then math.floor((price - prev) / prev * 100 + 0.5) else 0,
				held = held, avg = if held > 0 then math.floor((s.cost[stock.id] or 0) / held) else 0,
				dividend = math.floor(stock.dividend * 100 + 0.5),
			})
		end
		return {
			name = SK.EXCHANGES[state.portId], rows = rows, fee = math.floor(feeRate(state) * 1000 + 0.5) / 10,
			nextDividend = math.max(0, s.next - state.day), divTotal = s.divTotal, trades = s.trades,
		}
	end

	return { handlers = handlers, tick = tick, viewOf = viewOf }
end
