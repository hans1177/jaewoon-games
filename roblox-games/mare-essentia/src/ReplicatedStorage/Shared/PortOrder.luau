--!strict
-- 항구 치안: 항구마다 0~100 의 치안 값이 있다. 해역마다 기본 값이 다르고(신대륙 개척지는 낮다),
-- 방어 계통 건물과 교역소 투자로 목표가 오른다. 값은 하루 0.5씩 목표로 다가가고, 순찰로 올리며, 재해가 닥치면 떨어진다.
-- 해역 기본 값·해적 소굴·시대 보정은 게임 설정이다 (docs/CATALOG.md).

local O = {}

O.BASE = { europe = 70, w_africa = 50, new_world = 40, indian = 55, far_east = 60, pacific = 45 } :: { [string]: number }
-- 해적과 밀수꾼의 소굴로 이름난 항구 (해적 황금기 1650~1730 에 더 낮아진다)
O.HAVENS = { nassau = true, kingston = true } :: { [string]: boolean }
O.HAVEN_MALUS = 10
O.PIRATE_ERA = { 1650, 1730 }
O.GUARD_STAGE_BONUS = 6
O.HARBOR_LEVEL_BONUS = 3
O.DRIFT_PER_DAY = 0.5
O.PATROL_COST = 200
O.PATROL_GAIN = 12
O.PATROL_COOLDOWN = 10 -- 일
O.DISASTER_SHOCK = 15
O.SELL_PER_POINT = 0.0004 -- 치안 50 이 기준, 1점당 판매 비율

O.LABELS = {
	{ below = 25, name = "무법" },
	{ below = 45, name = "불안" },
	{ below = 65, name = "보통" },
	{ below = 85, name = "안정" },
	{ below = 101, name = "평온" },
}

function O.labelOf(v: number): string
	for _, l in O.LABELS do
		if v < l.below then
			return l.name
		end
	end
	return "평온"
end

function O.target(regionId: string, portId: string, year: number, guardStage: number, harborLevel: number): number
	local t = (O.BASE[regionId] or 55) + guardStage * O.GUARD_STAGE_BONUS + (harborLevel - 1) * O.HARBOR_LEVEL_BONUS
	if O.HAVENS[portId] then
		t -= O.HAVEN_MALUS
		if year >= O.PIRATE_ERA[1] and year <= O.PIRATE_ERA[2] then
			t -= O.HAVEN_MALUS
		end
	end
	return math.max(5, math.min(100, t))
end

return O
