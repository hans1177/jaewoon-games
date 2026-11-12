--!strict
-- 교역 가격 계산. 서버에서만 결과를 신뢰한다.

local Data = require(script.Parent.Ports)

local TradeMath = {}

local PRODUCE_MULT = 0.7 -- 특산품은 싸다
TradeMath.PRODUCE_MULT = PRODUCE_MULT
TradeMath.DEMAND_MULT = 1.4
local DEMAND_MULT = 1.4 -- 수요 품목은 비싸다
local STEP = 0.02 -- 한 개 거래당 재고 계수 변동
local MIN_STOCK_MULT = 0.5
local MAX_STOCK_MULT = 2.0

-- 되팔 때 받는 비율. 최대치를 0.95로 묶어서 같은 항구에서 사고 바로 팔아 이득 보는 것을 막는다.
TradeMath.BASE_SELL_RATE = 0.88
TradeMath.MAX_SELL_RATE = 0.95

function TradeMath.sellRate(bonus: number): number
	return math.clamp(TradeMath.BASE_SELL_RATE + bonus, TradeMath.BASE_SELL_RATE, TradeMath.MAX_SELL_RATE)
end

-- stockMult: 항구 재고 계수. 1.0이 기준, 사면 오르고 팔면 내린다.
function TradeMath.getPrice(portId: string, goodId: string, stockMult: number?, eventMult: number?): number
	local port = Data.Ports[portId]
	local good = Data.Goods[goodId]
	assert(port, "unknown port: " .. portId)
	assert(good, "unknown good: " .. goodId)

	local mult = 1.0
	if table.find(port.produces, goodId) then
		mult = PRODUCE_MULT
	elseif table.find(port.demands, goodId) then
		mult = DEMAND_MULT
	end

	local stock = math.clamp(stockMult or 1.0, MIN_STOCK_MULT, MAX_STOCK_MULT)
	local event = eventMult or 1.0

	return math.max(1, math.floor(good.basePrice * mult * stock * event + 0.5))
end

function TradeMath.sellPrice(portId: string, goodId: string, stockMult: number?, rate: number, eventMult: number?): number
	return math.max(1, math.floor(TradeMath.getPrice(portId, goodId, stockMult, eventMult) * rate))
end

-- 사면 재고 계수가 오른다 (가격 상승), 팔면 내린다.
function TradeMath.nextStockMult(current: number, amount: number, isBuying: boolean): number
	local delta = STEP * amount
	local nextValue = if isBuying then current + delta else current - delta
	return math.clamp(nextValue, MIN_STOCK_MULT, MAX_STOCK_MULT)
end

-- 시간이 지나면 기준값 1.0으로 회복
function TradeMath.recover(current: number, dt: number): number
	local rate = 0.01 * dt
	if current > 1 then
		return math.max(1, current - rate)
	end
	return math.min(1, current + rate)
end

return TradeMath
