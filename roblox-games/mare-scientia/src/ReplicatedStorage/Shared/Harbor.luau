--!strict
-- 항구 투자(교역소)와 주점 소문. 항구에 코인을 투자하면 그 항구의 발전 단계가 오르고,
-- 단계마다 그 항구에서 팔 때 비율, 수리·고용·보급 비용 할인을 얻는다.

local Harbor = {}

Harbor.NAMES = { "작은 정박지", "교역 거점", "활기찬 항구", "번영하는 항구", "무역 중심지" }
Harbor.THRESHOLDS = { 0, 500, 2000, 6000, 15000 } -- 단계별 누적 투자액
Harbor.SELL_BONUS = { 0, 0.01, 0.02, 0.03, 0.04 }
Harbor.COST_DISCOUNT = { 0, 0.05, 0.10, 0.15, 0.20 }
Harbor.OPTIONS = { 300, 1000, 3000 } -- 한 번에 투자할 수 있는 금액
Harbor.RUMOR_COST = 40
Harbor.MAX_LEVEL = #Harbor.THRESHOLDS

function Harbor.level(invested: number): number
	local lv = 1
	for i, need in Harbor.THRESHOLDS do
		if invested >= need then
			lv = i
		end
	end
	return lv
end

return Harbor
