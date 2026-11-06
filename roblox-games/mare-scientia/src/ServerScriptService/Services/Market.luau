--!nonstrict
-- 항구별 재고 계수 (서버 전체 공유). 사면 오르고 팔면 내리고, 시간이 지나면 1.0으로 돌아온다.

return function(D)
	local Market = {}
	Market.__index = Market

	function Market.new()
		return setmetatable({ stock = {}, events = {} }, Market)
	end

	function Market:get(portId, goodId)
		local p = self.stock[portId]
		return (p and p[goodId]) or 1.0
	end

	function Market:set(portId, goodId, value)
		local p = self.stock[portId]
		if not p then
			p = {}
			self.stock[portId] = p
		end
		p[goodId] = if math.abs(value - 1) < 1e-6 then nil else value
	end

	function Market:recover(dt)
		for _, p in self.stock do
			for goodId, mult in p do
				local nextMult = D.TradeMath.recover(mult, dt)
				p[goodId] = if math.abs(nextMult - 1) < 1e-6 then nil else nextMult
			end
		end
	end

	-- 시장 사건 (풍년·흉작·전쟁 수요 등): 한동안 특정 항구의 특정 품목 가격이 움직인다.
	local KINDS = {
		{ mult = 0.7, text = "풍년으로 %s 값이 떨어졌다" },
		{ mult = 1.4, text = "흉작으로 %s 값이 올랐다" },
		{ mult = 1.3, text = "전쟁 소문으로 %s 수요가 늘었다" },
		{ mult = 0.8, text = "대량 입항으로 %s 재고가 넘친다" },
	}
	Market.MAX_EVENTS = 4
	Market.EVENT_TICKS = 10 -- tickEvents 를 부른 횟수 기준 지속 시간

	function Market:eventMult(portId, goodId)
		local m = 1
		for _, e in self.events do
			if e.portId == portId and e.goodId == goodId then
				m *= e.mult
			end
		end
		return m
	end

	-- 지금 진행 중인 사건 목록 (복사본)
	function Market:activeEvents()
		local list = {}
		for _, e in self.events do
			table.insert(list, { portId = e.portId, goodId = e.goodId, mult = e.mult, text = e.text, ticks = e.ticks })
		end
		return list
	end

	-- 주기적으로 호출한다. 기간이 끝난 사건을 지우고, 자리가 있으면 새 사건을 만든다.
	function Market:tickEvents(rng, portIds, goodIds)
		for i = #self.events, 1, -1 do
			self.events[i].ticks -= 1
			if self.events[i].ticks <= 0 then
				table.remove(self.events, i)
			end
		end
		if #self.events < Market.MAX_EVENTS and rng() < 0.6 then
			local portId = portIds[1 + math.floor(rng() * #portIds) % #portIds]
			local goodId = goodIds[1 + math.floor(rng() * #goodIds) % #goodIds]
			local kind = KINDS[1 + math.floor(rng() * #KINDS) % #KINDS]
			if self:eventMult(portId, goodId) == 1 then
				table.insert(self.events, {
					portId = portId,
					goodId = goodId,
					mult = kind.mult,
					text = kind.text,
					ticks = Market.EVENT_TICKS,
				})
			end
		end
	end

	return Market
end
