--!strict
-- 항구별 시설. 중요 도시에만 은행·길드·왕궁이 있다.
-- bank: 예금/대출, guild: 길드 계약(운송 의뢰), palace: 알현과 작위.

local Facilities = {
	bank = { "lubeck", "cadiz", "london", "amsterdam", "genoa", "venice", "hamburg", "seville" },
	guild = { "rotterdam", "glasgow", "lubeck", "porto", "london", "amsterdam", "antwerp", "hamburg", "venice", "lisbon", "bergen", "marseille", "gdansk" },
	harbormaster = { "plymouth", "rotterdam", "lubeck", "oslo", "cadiz", "porto", "london", "amsterdam", "venice", "lisbon", "seville", "copenhagen", "bergen", "marseille", "hamburg", "stockholm" },
	palace = { "istanbul", "london", "amsterdam", "copenhagen", "stockholm", "venice", "lisbon", "seville", "naples" },
}

Facilities.NAMES = { bank = "은행", guild = "상인 길드", palace = "왕궁", harbormaster = "항만청" }
Facilities.INSURANCE_RATE = 0.08 -- 배 값 대비 보험료 (최소 100)
Facilities.PALACE_NAMES = {
	london = "잉글랜드 왕궁", amsterdam = "총독 관저", copenhagen = "덴마크 왕궁", stockholm = "스웨덴 왕궁",
	st_petersburg = "러시아 황궁", istanbul = "술탄의 궁전", venice = "총독궁", lisbon = "포르투갈 왕궁", seville = "스페인 궁정", naples = "나폴리 왕궁",
}

-- 은행
Facilities.BANK = {
	PERIOD_DAYS = 30,
	DEPOSIT_RATE = 0.005, -- 30일마다 예금 이자
	LOAN_RATE = 0.02, -- 30일마다 대출 이자
	LOAN_BASE = 1000,
	LOAN_PER_FAME = 50,
}

-- 왕궁 작위: 명성이 충분하면 알현에서 받는다.
Facilities.TITLES = {
	{ name = "기사", fame = 50, coins = 300 },
	{ name = "준남작", fame = 150, coins = 900 },
	{ name = "남작", fame = 400, coins = 2400 },
	{ name = "백작", fame = 900, coins = 6000 },
}
-- 작위당 판매 비율 보너스 (항구 투자·직업과 합쳐 판매 상한이 있다)
Facilities.TITLE_SELL_BONUS = 0.005

-- 길드 계약
Facilities.GUILD = {
	OFFERS = 3,
	REFRESH_DAYS = 10,
	DEADLINE_DAYS = 45,
	PREMIUM = 1.6, -- 상품 기준가 대비 보상 배율
}

-- 항구 발전도(1~5)에 따른 은행: 3단계부터는 목록에 없는 항구에도 은행이 생긴다.
Facilities.BANK_OPEN_LEVEL = 3
Facilities.PALACE_OPEN_LEVEL = 5 -- 무역 중심지(5단계)에는 왕궁이 없어도 총독 관저가 생긴다
Facilities.BANK_LEVELS = {
	name = { "환전상", "환전상", "은행", "은행·증권소", "국제 은행" },
	depositRate = { 0.005, 0.006, 0.0075, 0.009, 0.011 },
	loanRate = { 0.02, 0.0185, 0.017, 0.0155, 0.014 },
	loanMult = { 1, 1.2, 1.5, 2, 3 },
}

function Facilities.has(kind: string, portId: string, level: number?): boolean
	if table.find((Facilities :: any)[kind], portId) ~= nil then
		return true
	end
	if kind == "palace" then
		return (level or 1) >= Facilities.PALACE_OPEN_LEVEL
	end
	return kind == "bank" and (level or 1) >= Facilities.BANK_OPEN_LEVEL
end

function Facilities.palaceName(portId: string): string
	return (Facilities.PALACE_NAMES :: any)[portId] or "총독 관저"
end

function Facilities.bankAt(level: number)
	local L = Facilities.BANK_LEVELS
	local lv = math.clamp(math.floor(level or 1), 1, #L.name)
	return { name = L.name[lv], depositRate = L.depositRate[lv], loanRate = L.loanRate[lv], loanMult = L.loanMult[lv], level = lv }
end

return Facilities
