--!nonstrict
-- 증권거래소: 암스테르담(1602년 동인도회사 주식을 거래한 세계 첫 거래소)과 런던(조너선 커피하우스)에서 주식을 사고판다.
-- 시세는 실제 역사의 흐름을 따라 연도별 값(curve)을 이어 만들고 여기에 잔물결을 더한다 (저장하지 않고 날짜로 계산).
-- 값과 연도는 게임 설정이며 구현 전 출처 확인이 필요하다 (docs/CATALOG.md).

local S = {}

S.EXCHANGES = { amsterdam = "암스테르담 증권거래소", london = "런던 조너선 커피하우스" }
S.MAX_HELD = 200
S.DIV_DAYS = 90

-- curve: { 연도, 주가 }를 이은 선. since: 상장 연도. dividend: 연 배당률(주가 대비)
S.Stocks = {
	{ id = "voc", name = "네덜란드 동인도회사", since = 1602, dividend = 0.10, seed = 1.3, summary = "향신료 무역의 최강자. 오래 안정적이지만 점점 기운다.",
		curve = { { 1602, 540 }, { 1630, 1500 }, { 1650, 1100 }, { 1680, 1250 }, { 1700, 950 }, { 1720, 800 }, { 1750, 500 }, { 1790, 300 } } },
	{ id = "eic", name = "영국 동인도회사", since = 1600, dividend = 0.08, seed = 2.1, summary = "인도 직물과 차 무역으로 뒤늦게 크는 회사.",
		curve = { { 1600, 100 }, { 1650, 200 }, { 1690, 420 }, { 1700, 260 }, { 1720, 300 }, { 1730, 170 }, { 1750, 190 }, { 1790, 360 } } },
	{ id = "boe", name = "영란은행", since = 1694, dividend = 0.06, seed = 0.7, summary = "정부 빚을 맡은 은행. 느리지만 꾸준하다.",
		curve = { { 1694, 100 }, { 1700, 115 }, { 1720, 150 }, { 1750, 130 }, { 1790, 190 } } },
	{ id = "south_sea", name = "남해 회사", since = 1711, dividend = 0.03, seed = 3.4, summary = "스페인령 아메리카 독점 무역을 약속한 회사. 1720년의 거품으로 유명하다.",
		curve = { { 1711, 100 }, { 1719, 120 }, { 1720.0, 200 }, { 1720.5, 1000 }, { 1720.75, 150 }, { 1721, 100 }, { 1750, 95 } } },
	{ id = "mississippi", name = "미시시피 회사", since = 1717, dividend = 0, seed = 4.9, summary = "프랑스 존 로의 회사. 루이지애나 개발을 내세워 치솟았다 무너진다.",
		curve = { { 1717, 150 }, { 1719, 600 }, { 1719.9, 3000 }, { 1720.4, 300 }, { 1721, 50 } } },
}

S.ById = {}
for _, st in S.Stocks do
	S.ById[st.id] = st
end

-- 그 시점(연도, 소수)의 주가. 상장 전이면 nil.
function S.price(stock, yearF)
	if yearF < stock.since then
		return nil
	end
	local c = stock.curve
	local base
	if yearF <= c[1][1] then
		base = c[1][2]
	elseif yearF >= c[#c][1] then
		base = c[#c][2]
	else
		for i = 1, #c - 1 do
			local a, b = c[i], c[i + 1]
			if yearF >= a[1] and yearF <= b[1] then
				base = a[2] + (b[2] - a[2]) * (yearF - a[1]) / (b[1] - a[1])
				break
			end
		end
	end
	-- 잔물결: 날짜에 따라 부드럽게 흔들린다 (거품기엔 더 크게)
	local d = yearF * 365
	local wobble = 1 + 0.08 * math.sin(d / 9 + stock.seed) + 0.05 * math.sin(d / 23 + stock.seed * 2) + 0.03 * math.sin(d / 3.7 + stock.seed * 3)
	return math.max(1, math.floor(base * wobble + 0.5))
end

return S
