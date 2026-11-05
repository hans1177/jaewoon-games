--!nonstrict
-- 항구별 재고 계수 (서버 전체 공유). 사면 오르고 팔면 내리고, 시간이 지나면 1.0으로 돌아온다.

return function(D)
	local Market = {}
	Market.__index = Market

	function Market.new()
		return setmetatable({ stock = {} }, Market)
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

	return Market
end
