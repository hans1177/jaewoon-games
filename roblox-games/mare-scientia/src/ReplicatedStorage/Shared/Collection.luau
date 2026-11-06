--!strict
-- 도감 완성 보상: 분야별로 모은 비율이 25/50/75/100%에 이를 때마다 한 번씩, 전체 진행도에도 별도 보상.

local Collection = {}

-- 분야별 단계 { 비율(%), 코인, 명성 }
Collection.FIELD_TIERS = {
	{ pct = 25, coins = 200, fame = 10 },
	{ pct = 50, coins = 500, fame = 25 },
	{ pct = 75, coins = 1000, fame = 50 },
	{ pct = 100, coins = 2500, fame = 120 },
}

-- 전체 도감 단계와 칭호
Collection.OVERALL_TIERS = {
	{ pct = 10, coins = 500, fame = 20, title = "견습 수집가" },
	{ pct = 25, coins = 1500, fame = 60, title = "탐구하는 항해자" },
	{ pct = 50, coins = 4000, fame = 150, title = "박물학자" },
	{ pct = 75, coins = 9000, fame = 300, title = "대학자" },
	{ pct = 100, coins = 25000, fame = 800, title = "세계 백과의 완성자" },
}

-- total개 중 pct% 이상이 되려면 필요한 개수
function Collection.need(total: number, pct: number): number
	return math.max(1, math.ceil(total * pct / 100))
end

return Collection
