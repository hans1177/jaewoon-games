--!nonstrict
-- Nations.luau · 국가·지도자·정치 체제 시뮬레이션 (순수 로직, 결정적)
-- 항구(마을)의 country 를 묶어 "국가"를 만들고, 국가마다 지도자가 있다.
--  · 시작(1650)은 실제 역사 인물과 체제. 그 뒤로는 시뮬: 수명·후계·섭정·내전·혁명·개혁.
--  · 정치 체제마다 장단점이 다르다 (결정 속도, 안정, 군사·무역·과학·학문·문화·행정 보정, 후계 방식).
--  · 국가는 군사·해군·무역·과학·학문·문화·행정 7분야에 힘을 나눠 쏟고, 지도자 능력과 체제가 방향을 정한다.
--  · 문화 투자 → 품질 → 특산품 → 브랜드 사슬이 국가 단위로 쌓인다.
--  · 국가끼리 관계도·동맹·경쟁·전쟁이 있고, 속국은 본국이 약하면 독립한다.
-- 이 모듈은 기존 경제 난수(w.seed)를 쓰지 않고 자체 해시 난수만 쓴다. 지금 단계에서는 경제 수치에 영향을 주지 않는다
-- (판단과 기록만 남긴다). 저장은 w.nations 한 곳에만 하며 기존 저장 키와 필드는 바꾸지 않는다.
-- 인물·연도는 게임용 값이며 시작 시점 이후는 실제 역사와 달라진다. 이름 없는 나라의 지도자는 가상 인물이다.

local Chains = require(script.Parent.ProductionChains)

local N = {}

N.SCHEMA = 1
N.STEP_DAYS = 30
N.LOG_MAX = 60
N.FIELDS = { "mil", "navy", "trade", "sci", "learn", "culture", "admin" }
N.FIELD_NAMES = { mil = "군사", navy = "해군", trade = "무역", sci = "과학", learn = "학문", culture = "문화", admin = "행정" }
N.BRAND_STEPS = { 60, 180, 400 } -- 문화 누적치: 품질 → 특산품 → 브랜드
N.BRAND_NAMES = { "없음", "품질 향상", "특산품", "브랜드" }

-- ───────── 정치 체제 ─────────
-- speed: 방향 전환 속도, stab: 안정 보정, legit: 기본 정통성, mods: 분야별 투자 효율, succ: 후계 방식
N.REGIMES = {
	absolute = { name = "절대왕정", speed = 0.9, stab = 0.00, legit = 0.70, succ = "hereditary",
		mods = { mil = 1.15, navy = 1.0, trade = 0.95, sci = 0.95, learn = 0.95, culture = 1.05, admin = 1.0 },
		pros = "결정이 빠르고 전쟁 동원이 쉽다", cons = "지도자 능력에 좌우되고 후계 분쟁이 잦다" },
	parliament = { name = "의회 군주정", speed = 0.45, stab = 0.08, legit = 0.65, succ = "hereditary",
		mods = { mil = 0.95, navy = 1.1, trade = 1.1, sci = 1.05, learn = 1.05, culture = 1.0, admin = 1.1 },
		pros = "안정도가 높고 세금이 효율적이다", cons = "개혁과 전쟁 결정이 느리다" },
	merchant_republic = { name = "상인 공화정", speed = 0.5, stab = 0.04, legit = 0.60, succ = "election",
		mods = { mil = 0.85, navy = 1.2, trade = 1.25, sci = 1.05, learn = 1.0, culture = 1.05, admin = 1.05 },
		pros = "교역과 금융, 해군에 강하다", cons = "육군이 약하고 파벌 다툼이 있다" },
	bureaucracy = { name = "관료 제국", speed = 0.55, stab = 0.06, legit = 0.72, succ = "hereditary",
		mods = { mil = 0.95, navy = 0.85, trade = 0.9, sci = 1.0, learn = 1.25, culture = 1.2, admin = 1.25 },
		pros = "행정과 학문이 강하고 땅이 넓어도 버틴다", cons = "해외 팽창과 개혁이 느리다" },
	military_shogun = { name = "무가 정권", speed = 0.7, stab = 0.05, legit = 0.68, succ = "hereditary",
		mods = { mil = 1.2, navy = 0.9, trade = 0.9, sci = 0.9, learn = 1.0, culture = 1.1, admin = 1.1 },
		pros = "질서가 잡히고 내전이 드물다", cons = "대외 교류와 기술 도입이 느리다" },
	sultanate = { name = "술탄 제국", speed = 0.75, stab = -0.02, legit = 0.66, succ = "strongman",
		mods = { mil = 1.2, navy = 0.95, trade = 1.0, sci = 0.95, learn = 1.0, culture = 1.1, admin = 0.9 },
		pros = "군사와 영토 확장에 강하다", cons = "지방 반란과 관료 부패, 왕위 다툼" },
	theocracy = { name = "교황령·신정", speed = 0.5, stab = 0.03, legit = 0.70, succ = "election",
		mods = { mil = 0.8, navy = 0.8, trade = 0.9, sci = 0.9, learn = 1.2, culture = 1.3, admin = 1.0 },
		pros = "학문과 문화 후원이 강하다", cons = "군사가 약하고 과학이 보수적이다" },
	elective = { name = "선출 군주정", speed = 0.4, stab = -0.04, legit = 0.55, succ = "election",
		mods = { mil = 1.05, navy = 0.9, trade = 1.0, sci = 1.0, learn = 1.0, culture = 1.0, admin = 0.85 },
		pros = "유능한 지도자가 뽑힐 수 있다", cons = "귀족 파벌이 강해 결정이 느리다" },
	tribal = { name = "부족 연합", speed = 0.85, stab = -0.03, legit = 0.60, succ = "council",
		mods = { mil = 1.1, navy = 1.0, trade = 0.85, sci = 0.8, learn = 0.8, culture = 1.05, admin = 0.7 },
		pros = "기동력이 좋고 지역 방어가 강하다", cons = "기술·금융·행정이 약하다" },
	military_republic = { name = "군사 공화정", speed = 0.8, stab = -0.02, legit = 0.50, succ = "strongman",
		mods = { mil = 1.25, navy = 1.1, trade = 1.0, sci = 1.0, learn = 0.95, culture = 0.9, admin = 1.05 },
		pros = "군사력 동원과 해군 확장이 빠르다", cons = "정통성이 약하고 지도자 사후 불안정" },
}
-- 체제 전환 후보 (혁명·개혁 때)
N.REVOLUTION_TO = {
	absolute = { "parliament", "military_republic" }, parliament = { "absolute", "merchant_republic" },
	merchant_republic = { "parliament", "military_republic" }, bureaucracy = { "military_shogun", "absolute" },
	military_shogun = { "bureaucracy", "absolute" }, sultanate = { "absolute", "military_republic" },
	theocracy = { "merchant_republic", "absolute" }, elective = { "absolute", "parliament" },
	tribal = { "sultanate", "absolute" }, military_republic = { "absolute", "parliament" },
}

-- ───────── 실제 역사 시작 지도자 (1650년 전후) ─────────
-- n 이름, t 칭호, b 출생연도, r 체제, d 왕조/가문, s 능력{군사,무역,과학,외교,카리스마}, bias 분야 성향
local REAL = {
	england = { n = "올리버 크롬웰", t = "호국경", b = 1599, r = "military_republic", d = "크롬웰", s = { 9, 6, 4, 6, 8 }, bias = { navy = 0.25, trade = 0.2 } },
	france = { n = "루이 14세", t = "국왕", b = 1638, r = "absolute", d = "부르봉", s = { 6, 5, 5, 7, 9 }, bias = { mil = 0.25, culture = 0.2 } },
	spain = { n = "펠리페 4세", t = "국왕", b = 1605, r = "absolute", d = "합스부르크", s = { 4, 4, 4, 5, 6 }, bias = { culture = 0.2, mil = 0.2 } },
	portugal = { n = "주앙 4세", t = "국왕", b = 1604, r = "absolute", d = "브라간사", s = { 5, 6, 5, 6, 7 }, bias = { navy = 0.3, trade = 0.25 } },
	netherlands = { n = "야코프 카츠", t = "대의장", b = 1577, r = "merchant_republic", d = "홀란트", s = { 3, 9, 6, 7, 6 }, bias = { trade = 0.35, navy = 0.25 } },
	venice = { n = "프란체스코 몰린", t = "도제", b = 1575, r = "merchant_republic", d = "몰린", s = { 4, 8, 5, 8, 5 }, bias = { trade = 0.3, navy = 0.25 } },
	ottoman = { n = "메흐메트 4세", t = "술탄", b = 1642, r = "sultanate", d = "오스만", s = { 5, 5, 4, 5, 6 }, bias = { mil = 0.3, navy = 0.15 } },
	russia = { n = "알렉세이 1세", t = "차르", b = 1629, r = "absolute", d = "로마노프", s = { 6, 4, 4, 6, 7 }, bias = { mil = 0.3, admin = 0.2 } },
	sweden = { n = "크리스티나", t = "여왕", b = 1626, r = "absolute", d = "바사", s = { 6, 5, 8, 7, 7 }, bias = { learn = 0.25, culture = 0.2, mil = 0.2 } },
	denmark = { n = "프레데리크 3세", t = "국왕", b = 1609, r = "absolute", d = "올덴부르크", s = { 5, 6, 5, 6, 6 }, bias = { trade = 0.25, navy = 0.2 } },
	poland = { n = "얀 2세 카지미에시", t = "국왕", b = 1609, r = "elective", d = "바사", s = { 6, 4, 4, 6, 6 }, bias = { mil = 0.25 } },
	prussia = { n = "프리드리히 빌헬름", t = "선제후", b = 1620, r = "absolute", d = "호엔촐레른", s = { 8, 5, 5, 7, 7 }, bias = { mil = 0.35, admin = 0.25 } },
	germany = { n = "페르디난트 3세", t = "황제", b = 1608, r = "elective", d = "합스부르크", s = { 5, 4, 5, 6, 5 }, bias = { culture = 0.2, admin = 0.15 } },
	scotland = { n = "찰스 2세", t = "국왕", b = 1630, r = "parliament", d = "스튜어트", s = { 4, 4, 4, 6, 8 }, bias = { culture = 0.2 } },
	papal = { n = "인노첸시오 10세", t = "교황", b = 1574, r = "theocracy", d = "팜필리", s = { 2, 4, 6, 8, 6 }, bias = { culture = 0.35, learn = 0.3 } },
	tuscany = { n = "페르디난도 2세 데 메디치", t = "대공", b = 1610, r = "absolute", d = "메디치", s = { 3, 7, 9, 6, 6 }, bias = { sci = 0.3, trade = 0.25, culture = 0.2 } },
	malta = { n = "장 폴 라스카리스", t = "기사단장", b = 1560, r = "theocracy", d = "구호기사단", s = { 7, 4, 4, 5, 6 }, bias = { navy = 0.35, mil = 0.25 } },
	china = { n = "순치제", t = "황제", b = 1638, r = "bureaucracy", d = "청", s = { 6, 4, 4, 5, 7 }, bias = { admin = 0.25, mil = 0.2, learn = 0.2 } },
	korea = { n = "효종", t = "국왕", b = 1619, r = "bureaucracy", d = "조선", s = { 7, 3, 5, 5, 6 }, bias = { learn = 0.3, mil = 0.2 } },
	japan = { n = "도쿠가와 이에미쓰", t = "쇼군", b = 1604, r = "military_shogun", d = "도쿠가와", s = { 7, 4, 4, 6, 7 }, bias = { admin = 0.3, mil = 0.2 } },
	vietnam = { n = "레 타인 똥", t = "황제", b = 1619, r = "bureaucracy", d = "후 레", s = { 4, 5, 4, 5, 5 }, bias = { learn = 0.25, mil = 0.2 } },
	siam = { n = "프라삿텅", t = "국왕", b = 1599, r = "absolute", d = "프라삿텅", s = { 6, 8, 4, 6, 6 }, bias = { trade = 0.35 } },
	burma = { n = "핀달레", t = "국왕", b = 1608, r = "absolute", d = "타웅우", s = { 5, 4, 4, 5, 5 }, bias = { mil = 0.25, culture = 0.2 } },
	malay = { n = "압둘 잘릴 3세", t = "술탄", b = 1590, r = "sultanate", d = "조호르", s = { 5, 8, 4, 6, 6 }, bias = { trade = 0.35, navy = 0.2 } },
	gujarat = { n = "샤 자한", t = "황제", b = 1592, r = "sultanate", d = "무굴", s = { 6, 6, 6, 6, 8 }, bias = { culture = 0.3, admin = 0.2 } },
	coromandel = { n = "압둘라 쿠트브 샤", t = "술탄", b = 1614, r = "sultanate", d = "쿠트브 샤히", s = { 4, 7, 4, 5, 5 }, bias = { trade = 0.3, culture = 0.2 } },
	malabar = { n = "자모린", t = "왕", b = 1605, r = "absolute", d = "칼리컷", s = { 4, 8, 4, 6, 5 }, bias = { trade = 0.4, navy = 0.2 } },
	ceylon = { n = "라자싱하 2세", t = "왕", b = 1608, r = "absolute", d = "캔디", s = { 6, 4, 4, 6, 6 }, bias = { mil = 0.25, trade = 0.2 } },
	persia = { n = "아바스 2세", t = "샤", b = 1633, r = "absolute", d = "사파비", s = { 6, 5, 5, 6, 6 }, bias = { culture = 0.3, admin = 0.2 } },
	oman = { n = "술탄 빈 사이프", t = "이맘", b = 1620, r = "absolute", d = "야루비", s = { 7, 7, 4, 5, 6 }, bias = { navy = 0.3, trade = 0.3 } },
	yemen = { n = "이스마일", t = "이맘", b = 1610, r = "theocracy", d = "카심", s = { 5, 5, 4, 5, 6 }, bias = { trade = 0.2, mil = 0.2 } },
	ireland = { n = "오먼드 후작", t = "총독", b = 1610, r = "absolute", d = "버틀러", s = { 6, 4, 4, 6, 6 }, bias = { mil = 0.25 } },
	dahomey = { n = "우에고바자", t = "왕", b = 1620, r = "absolute", d = "아자", s = { 7, 4, 3, 4, 6 }, bias = { mil = 0.35 } },
}

-- ───────── 속국·식민지 (본국 id) ─────────
local OVERLORD = {
	new_spain = "spain", panama = "spain", rio_de_la_plata = "spain", canary = "spain", mallorca = "spain",
	sardinia = "spain", naples = "spain", sicily = "spain", peru = "spain", quito = "spain", new_granada = "spain",
	venezuela = "spain", chile = "spain", cuba = "spain", hispaniola = "spain", puerto_rico = "spain",
	trinidad = "spain", philippines = "spain", marianas = "spain", jamaica = "spain", gibraltar = "spain",
	brazil = "portugal", angola = "portugal", madeira = "portugal", azores = "portugal", cape_verde = "portugal",
	sao_tome = "portugal", mozambique = "portugal", portuguese_india = "portugal", macau = "portugal",
	ireland = "england", barbados = "england", carolina = "england", pennsylvania = "england",
	new_england = "england", newfoundland = "england", bahamas = "england", st_helena = "england", suriname = "england",
	new_netherland = "netherlands", mauritius = "netherlands", cape = "netherlands", java = "netherlands",
	moluccas = "netherlands", formosa = "netherlands",
	new_france = "france", louisiana = "france", canada = "france",
	norway = "denmark", finland = "sweden", livonia = "sweden", estonia = "sweden", gotland = "sweden",
	algeria = "ottoman", tripoli = "ottoman", tunisia = "ottoman", egypt = "ottoman", levant = "ottoman",
	mesopotamia = "ottoman", greece = "ottoman", cyprus = "ottoman", rhodes = "ottoman", hejaz = "ottoman",
	russian_america = "russia", dalmatia = "venice", crete = "venice", austria = "germany", bengal = "gujarat",
}

-- ───────── 문화권별 가상 지도자 (이름 있는 지도자가 없는 나라) ─────────
local GROUP_OF = {
	italy = "europe", corsica = "europe", ragusa = "europe",
	morocco = "maghreb", somalia = "horn", swahili = "swahili", senegal = "west_africa", sierra_leone = "west_africa",
	guinea = "west_africa", gold_coast = "west_africa", benin = "west_africa", niger_delta = "west_africa",
	borneo = "se_asia", celebes = "se_asia", new_guinea = "pacific", fiji = "pacific", polynesia = "pacific",
	hawaii = "pacific", new_zealand = "pacific", tasmania = "pacific", australia = "pacific",
	california = "americas", pacific_northwest = "americas",
}
local GROUPS = {
	europe = { regime = "absolute", titles = { "공작", "총독", "도제" }, names = { "조반니", "알베르토", "마르코", "루도비코", "프란체스코" } },
	maghreb = { regime = "sultanate", titles = { "술탄", "총독" }, names = { "무함마드", "아흐마드", "알리", "하산", "이드리스" } },
	horn = { regime = "tribal", titles = { "술탄", "족장" }, names = { "아브디", "유수프", "후세인", "이사" } },
	swahili = { regime = "sultanate", titles = { "술탄", "셰이크" }, names = { "하미시", "술레이만", "사이드", "후세인" } },
	west_africa = { regime = "absolute", titles = { "왕", "오바", "다멜" }, names = { "오세이", "아자", "아마두", "코피", "나나" } },
	se_asia = { regime = "sultanate", titles = { "술탄", "라자" }, names = { "하산 우딘", "압둘", "이스칸다르", "마나르" } },
	pacific = { regime = "tribal", titles = { "족장", "아리키" }, names = { "카우", "타네", "마타", "와카" } },
	americas = { regime = "tribal", titles = { "족장", "대인" }, names = { "아타", "카누", "와쿠", "시마" } },
}
local DEFAULT_GROUP = "europe"

-- ───────── 난수·유틸 (결정적, 경제 난수와 분리) ─────────
local function hash01(s)
	local h = 7
	for i = 1, #s do h = (h * 131 + string.byte(s, i)) % 2147483629 end
	return (h % 1000003) / 1000003
end
local function roll(st, key)
	return hash01(tostring(st.seed) .. ":" .. tostring(st.day) .. ":" .. key)
end
local function clamp(x, lo, hi)
	if x < lo then return lo end
	if x > hi then return hi end
	return x
end
local function finite(x)
	return type(x) == "number" and x == x and x > -1e12 and x < 1e12
end
local function year(st) return st.startYear + st.day / 365 end

local function logEvent(st, id, kind, text)
	table.insert(st.log, { day = st.day, year = math.floor(year(st)), id = id, kind = kind, text = text })
	while #st.log > N.LOG_MAX do table.remove(st.log, 1) end
end

local function newSkills(st, key, base, spread)
	local s = {}
	local names = { "mil", "trade", "sci", "diplo", "cha" }
	for i, k in ipairs(names) do
		local v = (base and base[i]) or 5
		v = v + (roll(st, key .. k) - 0.5) * 2 * (spread or 0)
		s[k] = clamp(math.floor(v + 0.5), 1, 10)
	end
	return s
end

local function skillsFromList(list)
	return { mil = list[1], trade = list[2], sci = list[3], diplo = list[4], cha = list[5] }
end

-- 지도자가 가진 능력에 따른 분야 성향 (0~1 근처)
local function rulerBias(ruler)
	local s = ruler.skills
	return {
		mil = s.mil / 10, navy = (s.mil + s.trade) / 20, trade = s.trade / 10, sci = s.sci / 10,
		learn = (s.sci + s.diplo) / 20, culture = (s.cha + s.diplo) / 20, admin = (s.diplo + s.cha + s.sci) / 30,
	}
end

local function normalizeFocus(f)
	local sum = 0
	for _, k in ipairs(N.FIELDS) do
		f[k] = math.max(0.02, tonumber(f[k]) or 0.14)
		sum += f[k]
	end
	for _, k in ipairs(N.FIELDS) do f[k] = f[k] / sum end
end

-- ───────── 발견·연구 (실제 연구로 쌓이는 기술) ─────────
-- 나라는 시대 문턱이 아니라 "연구"로 발견을 얻는다. 발견마다 선행 발견·비용·분야가 있고,
-- 연구력(학문·과학 발전, 식자율, 지도자 능력, 경제 규모, 도시 기술)이 점수를 쌓아 발견을 완성한다.
-- 이미 아는 나라가 동맹·우호·인접이면 배우기 쉽고(확산), 세상에서 처음이면 "최초 발견" 기록이 남는다.
-- 효과는 식량·무기·조선·병종 전투력·재정·식자율·연구 속도 보정으로 이어진다 (경제 수치는 건드리지 않는다).
-- fx 의 값은 합산되어 (1 + 합) 배율이 된다.
N.TECHS = {
	{ id = "mathematics", name = "수학·대수", field = "sci", disc = "physics", cost = 24, req = {}, fx = { research = 0.03 }, init = 0.7 },
	{ id = "printing", name = "인쇄술", field = "learn", disc = "linguistics", cost = 34, req = {}, fx = { lit = 0.08, research = 0.04 }, init = 0.6 },
	{ id = "flintlock", name = "수석식 소총", field = "mil", disc = "chemistry", cost = 34, req = {}, fx = { unit_inf = 0.25, unit_militia = 0.1 }, init = 0.6 },
	{ id = "galleon", name = "대형 범선 설계", field = "navy", disc = "shipbuilding", cost = 36, req = {}, fx = { ships = 0.1, unit_frigate = 0.15, unit_transport = 0.15 }, init = 0.6 },
	{ id = "crop_rotation", name = "윤작", field = "admin", disc = "botany", cost = 38, req = {}, fx = { food = 0.12 }, init = 0.4 },
	{ id = "double_entry", name = "복식 부기", field = "trade", disc = "commerce", cost = 40, req = {}, fx = { income = 0.04 }, init = 0.5 },
	{ id = "quarantine", name = "검역 제도", field = "admin", disc = "medicine", cost = 44, req = {}, fx = { health = 0.1 }, init = 0.3 },
	{ id = "astronomy_tables", name = "항해 천문표", field = "navy", disc = "navigation", cost = 56, req = { "mathematics" }, fx = { ships = 0.06, trade = 0.03 }, init = 0.3 },
	{ id = "universities", name = "대학 제도", field = "learn", disc = "philosophy", cost = 62, req = { "printing" }, fx = { research = 0.08, lit = 0.05 }, init = 0.25 },
	{ id = "metallurgy", name = "고로 제철", field = "mil", disc = "mineralogy", cost = 66, req = {}, fx = { arms = 0.18 }, init = 0.25 },
	{ id = "bayonet", name = "총검", field = "mil", disc = "chemistry", cost = 70, req = { "flintlock" }, fx = { unit_inf = 0.2, doctrine = 0.04 }, init = 0.15 },
	{ id = "fortification", name = "능보식 요새", field = "mil", disc = "architecture", cost = 72, req = { "mathematics" }, fx = { manpower = 0.04, doctrine = 0.03 }, init = 0.2 },
	{ id = "naval_gunnery", name = "함포 사격술", field = "navy", disc = "physics", cost = 78, req = { "galleon", "metallurgy" }, fx = { unit_frigate = 0.12, unit_line = 0.12 }, init = 0.12 },
	{ id = "joint_stock", name = "주식회사", field = "trade", disc = "commerce", cost = 84, req = { "double_entry" }, fx = { income = 0.05, trade = 0.05 }, init = 0.12 },
	{ id = "bureaucratic_exams", name = "관료 선발 제도", field = "admin", disc = "political_science", cost = 86, req = {}, fx = { income = 0.03, manpower = 0.03, lit = 0.04 }, init = 0.2 },
	{ id = "chemistry", name = "근대 화학", field = "sci", disc = "chemistry", cost = 100, req = { "mathematics", "universities" }, fx = { powder = 0.2, research = 0.05 }, init = 0.04 },
	{ id = "scientific_method", name = "과학적 방법", field = "sci", disc = "philosophy", cost = 120, req = { "universities", "mathematics" }, fx = { research = 0.14 }, init = 0.04 },
	{ id = "ship_of_the_line", name = "전열함 설계", field = "navy", disc = "shipbuilding", cost = 120, req = { "naval_gunnery", "astronomy_tables" }, fx = { ships = 0.1, unit_line = 0.3 }, init = 0.05 },
	{ id = "linear_tactics", name = "선형 전술", field = "mil", disc = "history", cost = 124, req = { "bayonet" }, fx = { doctrine = 0.1, unit_inf = 0.12 }, init = 0.04 },
	{ id = "field_artillery", name = "야전포", field = "mil", disc = "physics", cost = 130, req = { "metallurgy", "chemistry" }, fx = { unit_art = 0.35 }, init = 0.03 },
	{ id = "central_bank", name = "중앙은행", field = "trade", disc = "economics", cost = 140, req = { "joint_stock", "bureaucratic_exams" }, fx = { income = 0.06, debt = 0.25 }, init = 0.02 },
	{ id = "standing_army", name = "상비군 제도", field = "mil", disc = "political_science", cost = 150, req = { "linear_tactics", "bureaucratic_exams" }, fx = { manpower = 0.15, unit_inf = 0.1 }, init = 0.02 },
	{ id = "academies", name = "학술원·학회", field = "learn", disc = "philosophy", cost = 160, req = { "scientific_method" }, fx = { research = 0.12, lit = 0.06 }, init = 0.01 },
	{ id = "chronometer", name = "해상 시계", field = "navy", disc = "navigation", cost = 170, req = { "scientific_method", "astronomy_tables" }, fx = { ships = 0.1, trade = 0.08 }, init = 0 },
	{ id = "inoculation", name = "종두법", field = "sci", disc = "medicine", cost = 190, req = { "quarantine", "scientific_method" }, fx = { health = 0.25 }, init = 0 },
	{ id = "copper_sheathing", name = "선체 동판", field = "navy", disc = "chemistry", cost = 200, req = { "chemistry", "ship_of_the_line" }, fx = { ships = 0.12, unit_line = 0.12 }, init = 0 },
	{ id = "column_tactics", name = "종대 전술", field = "mil", disc = "history", cost = 260, req = { "standing_army", "field_artillery" }, fx = { doctrine = 0.14, unit_inf = 0.18, unit_art = 0.15 }, init = 0 },
	{ id = "steam_engine", name = "증기 기관", field = "sci", disc = "physics", cost = 320, req = { "scientific_method", "metallurgy" }, fx = { arms = 0.15, ships = 0.1, research = 0.05 }, init = 0 },
}
N.TECH_BY_ID = {}
for _, tdef in ipairs(N.TECHS) do N.TECH_BY_ID[tdef.id] = tdef end

local function mm(S, key)
	return 1 + ((S.mods and S.mods[key]) or 0)
end

local function recomputeMods(S)
	local mods = {}
	for id in pairs(S.tech.known) do
		local def = N.TECH_BY_ID[id]
		if def then
			for k, v in pairs(def.fx) do mods[k] = (mods[k] or 0) + v end
		end
	end
	for _, tal in ipairs(S.talents or {}) do
		for k, v in pairs(tal.fx or {}) do mods[k] = (mods[k] or 0) + v end
	end
	S.mods = mods
end

-- 시작 시점: 발전도와 문화권 바탕으로 이미 가진 발견 (선행 발견이 있어야만 얻는다)
local function initTech(st, S)
	S.tech = { known = {}, cur = nil, prog = 0, count = 0 }
	for _, def in ipairs(N.TECHS) do
		local ok = true
		for _, r in ipairs(def.req) do if not S.tech.known[r] then ok = false end end
		local dev = (S.dev[def.field] or 25) / 100
		if ok and def.init > 0 and hash01(S.id .. ":init:" .. def.id) < def.init * (0.4 + dev * 1.4) then
			S.tech.known[def.id] = math.floor(st.startYear)
			S.tech.count += 1
		end
	end
	recomputeMods(S)
end

local function researchRate(S)
	local m = S.metrics
	local soc = S.soc or { literacy = 0.2 }
	local base = 0.35 + S.dev.learn / 160 + S.dev.sci / 160 + soc.literacy * 0.7 + S.ruler.skills.sci / 20
	local economy = clamp(math.log(1 + m.gdp) / 12, 0.3, 1.2)
	local city = clamp((m.tech or 1) / 2, 0.5, 1.4)
	local calm = if S.stab > 0.4 then 1 else 0.5
	local reg = (N.REGIMES[S.regime] or N.REGIMES.absolute).mods
	local focus = 0.7 + ((S.focus.sci or 0.14) + (S.focus.learn or 0.14)) * 1.8
	local crisis = (S.crisis and N.CRISIS[S.crisis.kind] and N.CRISIS[S.crisis.kind].research) or 0
	return base * economy * city * calm * focus * mm(S, "research") * (reg.sci or 1) * (S.war and 0.85 or 1) * (1 + crisis)
end

local function knownBy(st, S, techId)
	local n = 0
	for other, v in pairs(S.rel) do
		local O = st.states[other]
		if O and O.tech and O.tech.known[techId] and (S.allies[other] or v > 10 or (st.adjacency[S.id] and st.adjacency[S.id][other])) then n += 1 end
	end
	return n
end

local function pickTech(st, S)
	local best, bestScore = nil, -1
	for _, def in ipairs(N.TECHS) do
		if not S.tech.known[def.id] then
			local ok = true
			for _, r in ipairs(def.req) do if not S.tech.known[r] then ok = false break end end
			if ok then
				local f = S.focus[def.field] or 0.14
				local war = if S.war and (def.field == "mil" or def.field == "navy") then 0.08 else 0
				local score = f + war + hash01(S.id .. ":pick:" .. def.id .. ":" .. tostring(S.tech.count)) * 0.12 - def.cost / 4000 + knownBy(st, S, def.id) * 0.015
				if score > bestScore then best, bestScore = def, score end
			end
		end
	end
	return best
end

local function stepTech(st, S)
	local T = S.tech
	if not T.cur or T.known[T.cur] or not N.TECH_BY_ID[T.cur] then
		local def = pickTech(st, S)
		T.cur, T.prog = def and def.id or nil, 0
	end
	local def = T.cur and N.TECH_BY_ID[T.cur]
	if not def then return end
	local seen = knownBy(st, S, def.id)
	local first = st.firsts[def.id] == nil
	-- 아는 이웃이 많을수록 싸고(최대 40%), 세상에서 처음이면 20% 비싸다
	local cost = def.cost * (1 - math.min(4, seen) * 0.1) * (if first then 1.2 else 1)
	-- 우연한 번뜩임: 식자율이 높은 나라는 가끔 점수를 크게 얻는다
	local spark = if roll(st, S.id .. ":spark") < 0.02 * (0.5 + (S.soc and S.soc.literacy or 0.2) * 2) then 1.8 else 1
	T.prog += researchRate(S) * spark
	if T.prog >= cost then
		T.known[def.id] = math.floor(year(st))
		T.count += 1
		T.prog = 0
		T.cur = nil
		recomputeMods(S)
		if first then
			st.firsts[def.id] = { nation = S.id, year = math.floor(year(st)) }
			S.prestige = (S.prestige or 0) + 0.5
			logEvent(st, S.id, "discovery_first", string.format("%s 최초 발견: %s", S.id, def.name))
		else
			logEvent(st, S.id, "discovery", string.format("%s 발견: %s", S.id, def.name))
		end
	end
end

-- 현재 교리 이름 (병종·전술 발견으로 정해진다)
function N.doctrineName(S)
	local k = (S.tech and S.tech.known) or {}
	if k.column_tactics then return "종대 전술" end
	if k.standing_army then return "상비군 선형 전술" end
	if k.linear_tactics then return "선형 전술" end
	if k.bayonet then return "총검 보병" end
	if k.flintlock then return "총병·창병 혼성" end
	return "창병·기사 중심"
end

-- ───────── 자원·생산력·군사 편제 ─────────
-- 나라가 가진 항구의 특산 원자재(t.produces)와 발전도(단계·인구·기술)에서 자원 기반을 계산하고,
-- 그 기반 위에서 육군(보병·기병·포병·민병)·해군(전열함·프리깃·소형선·수송선)·상비군 규모가 자란다.
-- 계산 결과는 국가 기록(S.res / S.cap / S.forces)에만 남고 경제 수치(가격·생산·교역)는 바꾸지 않는다.
N.RES_KEYS = { "food", "timber", "iron", "copper", "coal", "nitrate", "animal", "fiber", "salt", "bullion", "ports", "yards" }
N.RES_NAMES = { food = "식량", timber = "목재", iron = "철", copper = "구리·주석", coal = "석탄", nitrate = "초석", animal = "목축·가죽", fiber = "섬유·돛천", salt = "소금", bullion = "금·은", ports = "항구", yards = "조선소" }
N.ARMY_KEYS = { "inf", "cav", "art", "militia" }
N.NAVY_KEYS = { "line", "frigate", "small", "transport" }
N.UNIT_NAMES = { inf = "보병", cav = "기병", art = "포병", militia = "민병", line = "전열함", frigate = "프리깃", small = "소형 군선", transport = "수송선" }
-- 병종 한 단위의 전투력 (천 명 / 척 기준)
local UNIT_POWER = { inf = 1, cav = 2.4, art = 3.6, militia = 0.3, line = 12, frigate = 4.5, small = 1.2, transport = 0.3 }

local RES_OF = { iron = "iron", copper = "copper", tin = "copper", coal = "coal", nitrate = "nitrate", salt = "salt", silver = "bullion", gold = "bullion",
	fish = "food", timber = "timber", wool = "animal", leather = "animal", fur = "animal", cotton = "fiber" }

local function emptyRes()
	local r = {}
	for _, k in ipairs(N.RES_KEYS) do r[k] = 0 end
	return r
end

local function addTownRes(S, t)
	local weight = 0.6 + 0.2 * (t.stage or 1)
	local r = S.res
	r.ports += 1
	if t.shipyard then r.yards += weight end
	for good in pairs(t.produces or {}) do
		local key = RES_OF[good]
		if not key then
			local class = Chains.ClassOf[good]
			if class == "forest" then key = "timber" elseif class == "farm" then key = "food" elseif class == "animal" then key = "animal" elseif class == "fiber" then key = "fiber" end
		end
		if key then r[key] += weight end
	end
	if t.coastal then r.food += 0.3 * weight end
end

local function capacities(S)
	local r, d, m = S.res, S.dev, S.metrics
	local tech = clamp((m.tech or 1) / 2, 0.3, 1.6)
	local sci = (d.learn * 0.5 + d.sci * 0.5) / 100
	local function sat(x, k) return x / (x + k) end -- 0..1, 자원이 많을수록 완만히 포화
	local cap = {}
	cap.food = clamp(r.food / math.max(1, m.towns) * 0.8 + 0.3, 0.2, 1.5)
	cap.arms = (sat(r.iron, 2) * 0.6 + sat(r.copper, 2) * 0.25 + sat(r.coal, 2) * 0.15) * tech * (0.6 + sci * 0.8)
	cap.powder = math.min(sat(r.nitrate, 1.5), sat(r.coal + 0.4 * r.salt, 2)) * tech * (0.6 + sci * 0.8)
	cap.ships = (sat(r.timber, 2) * 0.5 + sat(r.fiber, 2) * 0.2 + sat(r.yards, 1.2) * 0.3) * (0.6 + d.navy / 160) * (0.7 + sci * 0.5)
	cap.horse = sat(r.animal, 3) * (0.7 + d.mil / 200)
	cap.treasure = sat(r.bullion, 3)
	cap.food *= mm(S, "food")
	cap.arms *= mm(S, "arms")
	cap.powder *= mm(S, "powder")
	cap.ships *= mm(S, "ships")
	return cap
end

-- 목표 편제를 구하고 현재 편제를 한 걸음 가까이 움직인다
local function stepForces(st, S, instant)
	local m, r = S.metrics, S.res
	S.cap = capacities(S)
	local cap = S.cap
	local reg = N.REGIMES[S.regime] or N.REGIMES.absolute
	local mobil = (reg.mods.mil or 1) * (0.5 + S.stab * 0.5)
	local manpower = m.pop * 0.0045 * mobil * math.min(1.2, cap.food) * mm(S, "manpower") * (1 + ((S.crisis and N.CRISIS[S.crisis.kind] and N.CRISIS[S.crisis.kind].manpower) or 0)) -- 먹여 살릴 수 있는 만큼만 징집
	local milShare = S.focus.mil / math.max(0.05, S.focus.mil + S.focus.navy)
	local budget = S.fin.income * (0.35 + S.focus.mil * 1.2 + S.focus.navy * 0.8 + (S.war and 0.3 or 0))
	local armyBudget, navyBudget = budget * milShare, budget * (1 - milShare)
	-- 병종별 단가(한 단위 유지비) 와 자원 한도
	local tgt = {}
	tgt.inf = math.min(armyBudget * 0.55 / 40, manpower * 0.6) * (0.6 + cap.arms * 0.6)
	tgt.cav = math.min(armyBudget * 0.15 / 110, manpower * 0.1) * cap.horse * 2
	tgt.art = math.min(armyBudget * 0.2 / 180, manpower * 0.08) * cap.arms * cap.powder * 3
	tgt.militia = manpower * 0.25 * (1 - milShare * 0.3)
	tgt.line = math.min(navyBudget * 0.4 / 900, 0.012 * m.pop * 0.01) * cap.ships * 2.5
	tgt.frigate = math.min(navyBudget * 0.3 / 400, 0.02 * m.pop * 0.01) * cap.ships * 2.5
	tgt.small = math.min(navyBudget * 0.2 / 120, 0.04 * m.pop * 0.01) * (0.5 + cap.ships)
	tgt.transport = math.min(navyBudget * 0.1 / 150, 0.03 * m.pop * 0.01) * (0.4 + cap.ships)
	local F = S.forces
	local speed = if instant then 1 else 0.08 * (0.6 + (reg.speed or 1) * 0.4)
	for _, k in ipairs(N.ARMY_KEYS) do F[k] += (tgt[k] - F[k]) * speed end
	for _, k in ipairs(N.NAVY_KEYS) do F[k] += (tgt[k] - F[k]) * (if instant then 1 else speed * 0.7) end -- 배는 더디게 는다
	-- 전쟁의 손실
	if S.war and not instant then
		local foe = st.states[S.war.foe]
		local ratio = if foe then math.min(2, math.max(0.5, (foe.power or 1) / math.max(0.1, S.power or 1))) else 1
		for _, k in ipairs(N.ARMY_KEYS) do F[k] *= 1 - 0.012 * ratio end
		for _, k in ipairs(N.NAVY_KEYS) do F[k] *= 1 - 0.006 * ratio end
	end
	for _, k in ipairs(N.ARMY_KEYS) do F[k] = math.max(0, F[k]) end
	for _, k in ipairs(N.NAVY_KEYS) do F[k] = math.max(0, F[k]) end
	-- 전술·교리 수준: 군사 발전도 + 학문·과학
	F.doctrine = clamp((S.dev.mil * 0.5 + S.dev.learn * 0.25 + S.dev.sci * 0.25) / 100 + ((S.mods and S.mods.doctrine) or 0), 0, 1.2)
	-- 합산 전투력
	local army, navy = 0, 0
	for _, k in ipairs(N.ARMY_KEYS) do army += F[k] * UNIT_POWER[k] * mm(S, "unit_" .. k) end
	for _, k in ipairs(N.NAVY_KEYS) do navy += F[k] * UNIT_POWER[k] * mm(S, "unit_" .. k) end
	local quality = 0.7 + F.doctrine * 0.8
	S.armyPower = army * quality
	if S.merc and st.day < S.merc.untilDay then navy += S.merc.ships * UNIT_POWER.frigate * mm(S, "unit_frigate") end
	if S.merc and st.day >= S.merc.untilDay then S.merc = nil end
	S.navyPower = navy * quality
	S.power = (S.armyPower * 0.55 + S.navyPower * 0.45) * (0.6 + S.stab * 0.4)
	-- 상비군: 인구 대비 상비 병력 비율(군사비 부담)
	S.standing = (F.inf + F.cav + F.art) / math.max(1, m.pop * 0.01)
end

-- 자원 기반이 방향을 조금 바꾼다: 철·석탄이 풍부하면 군사, 목재·조선소가 많으면 해군, 식량이 모자라면 행정
local function resourceBias(S)
	local r, n = S.res, math.max(1, S.metrics.towns)
	local b = {}
	b.mil = clamp((r.iron + r.coal * 0.5 + r.copper * 0.5) / n * 0.12, 0, 0.15)
	b.navy = clamp((r.timber + r.yards * 1.5) / n * 0.1, 0, 0.15)
	b.trade = clamp(r.ports / n * 0.04 + r.bullion / n * 0.05, 0, 0.1)
	b.admin = if S.cap and S.cap.food and S.cap.food < 0.55 then 0.08 else 0
	return b
end

local function targetFocus(S)
	local reg = N.REGIMES[S.regime] or N.REGIMES.absolute
	local rb = rulerBias(S.ruler)
	local t = {}
	for _, k in ipairs(N.FIELDS) do
		t[k] = (0.35 + 0.65 * rb[k]) * (reg.mods[k] or 1) + (S.bias[k] or 0)
	end
	-- 전쟁 중에는 군사·해군에 쏠리고, 재정이 나쁘면 행정(징세 개혁)에 쏠린다
	if S.war then
		t.mil += 0.25
		t.navy += 0.1
	end
	if S.fin.debt > S.fin.income * 6 then t.admin += 0.2 end
	if S.res then
		for k, v in pairs(resourceBias(S)) do t[k] += v end
	end
	normalizeFocus(t)
	return t
end

-- ───────── 지도자 만들기 ─────────
local function pickFrom(list, st, key)
	return list[1 + math.floor(roll(st, key) * #list) % #list]
end

local function generatedRuler(st, id, group, why)
	local g = GROUPS[group] or GROUPS[DEFAULT_GROUP]
	return {
		name = pickFrom(g.names, st, id .. ":n" .. tostring(st.day)) .. " " .. tostring(1 + math.floor(roll(st, id .. ":g" .. tostring(st.day)) * 3)) .. "세",
		title = pickFrom(g.titles, st, id .. ":t" .. tostring(st.day)),
		age = 28 + math.floor(roll(st, id .. ":a" .. tostring(st.day)) * 22), dyn = id,
		skills = newSkills(st, id .. ":sk" .. tostring(st.day), { 5, 5, 5, 5, 5 }, 3), real = false, since = year(st), why = why,
	}
end

local function realRuler(st, id)
	local r = REAL[id]
	return {
		name = r.n, title = r.t, age = st.startYear - r.b, dyn = r.d,
		skills = skillsFromList(r.s), real = true, since = st.startYear - 3,
	}
end

local function groupOf(id)
	return GROUP_OF[id] or DEFAULT_GROUP
end

local function newState(st, id, regimeOverride)
	local real = REAL[id]
	local group = groupOf(id)
	local regime = regimeOverride or (real and real.r) or (GROUPS[group] and GROUPS[group].regime) or "absolute"
	local reg = N.REGIMES[regime]
	local ruler = if real and not regimeOverride then realRuler(st, id) else generatedRuler(st, id, group, "시작")
	local S = {
		id = id, regime = regime, ruler = ruler, bias = (real and real.bias) or {},
		legit = reg.legit, stab = 0.6, focus = {}, dev = {}, culture = { stock = 0, level = 1 },
		fin = { income = 1, debt = 0, treasury = 0 }, rel = {}, allies = {}, war = nil,
		regentUntil = 0, civilUntil = 0, metrics = { pop = 0, gdp = 0, trade = 0, towns = 0 },
		soc = { unrest = 0.1, literacy = 0.2, urban = 0, lastPop = 0 }, mods = {}, ship = { fleet = 10, lossFrac = 0, lost = 0, danger = 0, prizes = 0 }, spy = { net = 0.1 }, honor = 0.7, pacts = {}, talents = {},
		res = emptyRes(), cap = {}, power = 0, armyPower = 0, navyPower = 0, standing = 0,
		forces = { inf = 0, cav = 0, art = 0, militia = 0, line = 0, frigate = 0, small = 0, transport = 0, doctrine = 0 },
	}
	for _, k in ipairs(N.FIELDS) do S.dev[k] = 25 + (S.bias[k] or 0) * 60 end
	S.focus = targetFocus(S)
	initTech(st, S)
	return S
end

-- ───────── 항구: 문화권·언어·종교, 소유, 동화와 반란 ─────────
-- 항구마다 그 지역의 문화권(언어·종교)이 있다. 다른 문화권의 나라가 차지하면 동화가 더디고 반란 위험이 커진다.
N.FAMILIES = {
	latin = { name = "라틴·가톨릭권", lang = "로망스어", faith = "가톨릭" },
	germanic = { name = "게르만·개신교권", lang = "게르만어", faith = "개신교" },
	slavic = { name = "슬라브·정교권", lang = "슬라브어", faith = "정교회" },
	levant = { name = "중동·이슬람권", lang = "아랍어·튀르크어", faith = "이슬람" },
	persian = { name = "페르시아·이슬람권", lang = "페르시아어", faith = "이슬람" },
	indian = { name = "인도권", lang = "인도어", faith = "힌두·이슬람" },
	sea = { name = "동남아 해양권", lang = "말레이어", faith = "이슬람·불교" },
	east = { name = "동아시아 유교권", lang = "한문·동아시아어", faith = "유교·불교" },
	africa = { name = "아프리카권", lang = "아프리카 제어", faith = "토착·이슬람" },
	pacific = { name = "태평양 도서권", lang = "폴리네시아어", faith = "토착" },
	native = { name = "아메리카 원주민권", lang = "원주민어", faith = "토착" },
}
local FAMILY_OF_NATION = {
	england = "germanic", netherlands = "germanic", sweden = "germanic", denmark = "germanic", prussia = "germanic", germany = "germanic",
	russia = "slavic", poland = "slavic", ottoman = "levant", persia = "persian", china = "east", korea = "east", japan = "east", vietnam = "east",
	spain = "latin", portugal = "latin", france = "latin", venice = "latin", italy = "latin", malta = "latin",
}
local function familyOfTown(t)
	local lat, lon = t.lat or 0, t.lon or 0
	if FAMILY_OF_NATION[t.country] then return FAMILY_OF_NATION[t.country] end
	if lon < -30 then return "native" end
	if lat > 35 and lon > -15 and lon < 40 then return "latin" end
	if lat > 12 and lon >= 25 and lon < 60 then return "levant" end
	if lat > 20 and lon >= 60 and lon < 95 then return "indian" end
	if lat <= 20 and lon >= 60 and lon < 90 then return "indian" end
	if lat >= 22 and lon >= 100 and lon < 150 then return "east" end
	if lon >= 90 and lon < 135 then return "sea" end
	if lat < 12 and lon > -25 and lon < 60 then return "africa" end
	if lat > 12 and lon > -25 and lon < 25 then return "levant" end
	return "pacific"
end
local TOLERANCE = { merchant_republic = 1.4, parliament = 1.2, bureaucracy = 1.0, elective = 1.0, absolute = 0.9, sultanate = 1.0,
	military_shogun = 0.7, theocracy = 0.5, tribal = 1.0, military_republic = 0.8 }
local TARIFF_BASE = { merchant_republic = 0.03, parliament = 0.06, absolute = 0.10, sultanate = 0.08, bureaucracy = 0.12,
	military_shogun = 0.15, theocracy = 0.08, elective = 0.07, tribal = 0.05, military_republic = 0.09 }

local function nativeOwner(st, t)
	return st.liege[t.country] or t.country
end
local function ownerOf(st, id, t)
	local o = st.owner[id]
	if o and st.states[o] then return o end
	return nativeOwner(st, t)
end
-- 나라(state)의 대표 문화권: 소유 항구 중 가장 많은 쪽
local function nationFamily(st, w, nationId)
	local cnt, best, bestN = {}, "latin", -1
	for _, id in ipairs(w.order) do
		local t = w.towns[id]
		if nativeOwner(st, t) == nationId and not st.owner[id] then
			local f = familyOfTown(t)
			cnt[f] = (cnt[f] or 0) + 1
		end
	end
	for f, n in pairs(cnt) do
		if n > bestN or (n == bestN and f < best) then best, bestN = f, n end
	end
	return best
end

local function ensurePort(st, w, id, ownerId)
	local t = w.towns[id]
	local row = st.ports[id]
	local fam = familyOfTown(t)
	if not row then
		row = { fam = fam, assim = 1, unrest = 0.1 }
		st.ports[id] = row
		local S = st.states[ownerId]
		if S then
			S.fam = S.fam or nationFamily(st, w, ownerId)
			if S.fam ~= fam then row.assim = 0.35 end
		end
	end
	return row
end

local function stepPorts(st, w)
	for id, S in pairs(st.states) do S.fam = nationFamily(st, w, id) end
	local ids = {}
	for _, id in ipairs(w.order) do table.insert(ids, id) end
	for _, id in ipairs(ids) do
		local t = w.towns[id]
		local ownerId = ownerOf(st, id, t)
		local S = st.states[ownerId]
		if S then
			local row = ensurePort(st, w, id, ownerId)
			local foreign = S.fam ~= row.fam
			local colonial = ownerId ~= t.country and (st.owner[id] ~= nil or st.liege[t.country] == ownerId)
			local tol = TOLERANCE[S.regime] or 1
			if foreign then
				row.assim = clamp(row.assim + 0.006 * tol * (0.5 + (S.soc and S.soc.literacy or 0.2)), 0, 0.85)
			else
				row.assim = clamp(row.assim + 0.02, 0, 1)
			end
			local pressure = (1 - row.assim) * 0.5 + (S.soc and S.soc.unrest or 0.1) * 0.3 + (colonial and 0.05 or 0) + (S.war and 0.04 or 0)
			local relief = (S.dev.admin / 100) * 0.2 + (S.dev.mil / 100) * 0.1 + (S.legit or 0.5) * 0.15 + tol * 0.05
			row.unrest = clamp(row.unrest + (pressure - relief) * 0.15, 0, 1)
			if st.owner[id] and row.unrest > 0.85 and roll(st, id .. ":rebel") < 0.05 then
				st.owner[id] = nil
				row.unrest, row.assim = 0.3, 1
				logEvent(st, ownerId, "port_rebel", string.format("%s 항구 반란: %s 지배 종식", t.name or id, ownerId))
			end
		end
	end
end

local function aggregate(st, w)
	for _, S in pairs(st.states) do S.metrics = { pop = 0, gdp = 0, trade = 0, towns = 0, stab = 0, tech = 0, treasury = 0, stage = 0 }
		S.res = emptyRes()
	end
	for _, id in ipairs(w.order) do
		local t = w.towns[id]
		local owner = ownerOf(st, id, t)
		local S = st.states[owner]
		if S then
			local m = S.metrics
			m.pop += t.pop or 0
			m.gdp += t.gdp or 0
			m.trade += (t.tradeOut or 0) + (t.tradeIn or 0)
			m.towns += 1
			addTownRes(S, t)
			m.stab += t.stability or 0.5
			m.stage += t.stage or 1
			m.treasury += t.treasury or 0
			if t.tech then
				local sum, n = 0, 0
				for _, v in pairs(t.tech) do sum += v; n += 1 end
				if n > 0 then m.tech += sum / n end
			end
		end
	end
	for _, S in pairs(st.states) do
		local m = S.metrics
		if m.towns > 0 then
			m.stab /= m.towns
			m.tech /= m.towns
			m.stage /= m.towns
		else
			m.stab, m.tech, m.stage = 0.5, 1, 1
		end
		S.fin.income = math.max(1, m.gdp * 0.08)
		S.fin.treasury = m.treasury
	end
end

-- 시작 시점 편제: 자원·발전도에 맞춰 곧바로 채운다 (게임 시작부터 국가가 서로 다른 힘을 가진다)
local function seedForces(st, w)
	aggregate(st, w)
	for _, S in pairs(st.states) do
		S.focus = targetFocus(S)
		stepForces(st, S, true)
	end
end

-- ───────── 초기화 ─────────
function N.init(w)
	local st = { schema = N.SCHEMA, seed = math.floor(w.seed or 1), day = w.day or 0, startYear = w.startYear or 1650,
		states = {}, liege = {}, log = {}, ranks = {}, adjacency = {}, owner = {}, ports = {}, firsts = {} }
	local seen = {}
	for _, id in ipairs(w.order) do seen[w.towns[id].country] = true end
	local ids = {}
	for c in pairs(seen) do table.insert(ids, c) end
	table.sort(ids)
	for _, c in ipairs(ids) do
		if OVERLORD[c] and seen[OVERLORD[c]] then
			st.liege[c] = OVERLORD[c]
		end
	end
	for _, c in ipairs(ids) do
		if not st.liege[c] then st.states[c] = newState(st, c) end
	end
	-- 이웃 항구로 국가 인접도를 만든다
	for _, id in ipairs(w.order) do
		local a = w.towns[id]
		for _, nb in ipairs(a.neighbors or {}) do
			local b = w.towns[nb.id]
			if b then
				local ca, cb = st.liege[a.country] or a.country, st.liege[b.country] or b.country
				if ca ~= cb then
					st.adjacency[ca] = st.adjacency[ca] or {}
					st.adjacency[ca][cb] = (st.adjacency[ca][cb] or 0) + 1 / math.max(1, nb.d / 500)
				end
			end
		end
	end
	for id, S in pairs(st.states) do
		for other, weight in pairs(st.adjacency[id] or {}) do
			if st.states[other] then S.rel[other] = clamp(10 - weight * 2 + (hash01(id .. other) - 0.5) * 30, -60, 60) end
		end
	end
	local order = {}
	for id in pairs(st.states) do table.insert(order, id) end
	table.sort(order)
	for _, id in ipairs(order) do
		for techId in pairs(st.states[id].tech.known) do
			if not st.firsts[techId] then st.firsts[techId] = { nation = id, year = st.startYear } end
		end
	end
	seedForces(st, w)
	return st
end

-- ───────── 월 단위 갱신 ─────────
local function chooseRegimeAfter(st, S)
	local list = N.REVOLUTION_TO[S.regime] or { "absolute" }
	return list[1 + math.floor(roll(st, S.id .. ":rev") * #list) % #list]
end

local function succeed(st, S, reason)
	local reg = N.REGIMES[S.regime]
	local old = S.ruler
	local new = nil
	local group = groupOf(S.id)
	local key = S.id .. ":succ" .. tostring(st.day)
	if reg.succ == "hereditary" then
		local child = {
			name = pickFrom((GROUPS[group] or GROUPS[DEFAULT_GROUP]).names, st, key .. "n") .. " " .. tostring(2 + math.floor(roll(st, key .. "g") * 3)) .. "세",
			title = old.title, dyn = old.dyn, real = false, since = year(st),
		}
		child.age = if roll(st, key .. "age") < 0.18 then 6 + math.floor(roll(st, key .. "a2") * 9) else 20 + math.floor(roll(st, key .. "a3") * 20)
		local base = {}
		for i, k in ipairs({ "mil", "trade", "sci", "diplo", "cha" }) do base[i] = old.skills[k] end
		child.skills = newSkills(st, key .. "sk", base, 3 + (1 - S.dev.learn / 100) * 1.5)
		new = child
		if child.age < 16 then
			S.regentUntil = st.day + math.floor((16 - child.age) * 365)
			logEvent(st, S.id, "regency", string.format("%s 어린 %s 즉위, 섭정 정치", S.id, child.title))
		end
		if roll(st, key .. "war") < 0.08 then
			S.civilUntil = st.day + 540
			S.legit = clamp(S.legit - 0.2, 0.1, 1)
			logEvent(st, S.id, "civil_war", S.id .. " 후계 분쟁으로 내전")
		end
	elseif reg.succ == "election" then
		local bestScore = -1
		for i = 1, 3 do
			local cand = generatedRuler(st, S.id .. ":c" .. i, group, "선출")
			cand.title = old.title
			cand.dyn = S.id .. tostring(i)
			local score = cand.skills.diplo + cand.skills.cha + roll(st, key .. "e" .. i) * 4
			if score > bestScore then bestScore, new = score, cand end
		end
	elseif reg.succ == "strongman" then
		new = generatedRuler(st, S.id, group, "권력 투쟁")
		new.title = old.title
		new.skills.mil = clamp(new.skills.mil + 1, 1, 10)
		S.legit = clamp(S.legit - 0.1, 0.1, 1)
		if roll(st, key .. "war") < 0.25 then
			S.civilUntil = st.day + 365
			logEvent(st, S.id, "civil_war", S.id .. " 왕위 다툼")
		end
	else
		new = generatedRuler(st, S.id, group, "합의")
		new.title = old.title
	end
	S.ruler = new
	local oldName: any = old.name
	local newName: any = new.name
	logEvent(st, S.id, "succession", S.id .. " " .. reason .. " 교체 (" .. tostring(oldName) .. " → " .. tostring(newName) .. ")")
end

-- ───────── 사회·연결 ─────────
-- 인구·식량·세금·전쟁 피로가 불만(unrest)을 만들고, 학문·문화·도시화가 식자율(literacy)을 만든다.
-- 식자율은 과학 발전을 돕고, 불만은 안정도를 깎는다. 동맹·교역 상대에게서 기술이 퍼진다(확산).
local function stepSociety(st, S)
	local m = S.metrics
	local soc = S.soc
	local reg = N.REGIMES[S.regime] or N.REGIMES.absolute
	local pop = m.pop
	local growth = if soc.lastPop > 0 then (pop - soc.lastPop) / soc.lastPop else 0
	soc.lastPop = pop
	local foodShort = if S.cap and S.cap.food then math.max(0, 0.7 - S.cap.food) else 0
	local burden = S.fin.income > 0 and clamp(S.fin.debt / (S.fin.income * 12) * (1 - math.min(0.6, (S.mods and S.mods.debt) or 0)), 0, 1) or 0
	local pressure = foodShort * 0.8 + burden * 0.4 + (S.war and 0.15 or 0) + math.max(0, growth) * 6 + (S.standing or 0) * 0.02 - ((S.mods and S.mods.health) or 0) * 0.15
	local relief = (S.dev.admin / 100) * 0.25 + S.legit * 0.2 + (reg.stab or 0) * 0.5
	soc.unrest = clamp(soc.unrest + (pressure - relief) * 0.12, 0, 1)
	local urban = clamp((m.stage - 1) / 4, 0, 1)
	local litTarget = clamp((S.dev.learn * 0.5 + S.dev.culture * 0.3) / 100 + urban * 0.2 + ((S.mods and S.mods.lit) or 0), 0, 1)
	soc.literacy = clamp(soc.literacy + (litTarget - soc.literacy) * 0.05, 0, 1)
	soc.urban = urban
	-- 확산: 동맹·교역 상대의 발전도가 높으면 천천히 따라간다
	local best = {}
	for other in pairs(S.allies) do
		local O = st.states[other]
		if O then
			for _, k in ipairs(N.FIELDS) do best[k] = math.max(best[k] or 0, O.dev[k]) end
		end
	end
	for other, v in pairs(S.rel) do
		local O = st.states[other]
		if O and v > 10 and not S.allies[other] then
			for _, k in ipairs(N.FIELDS) do best[k] = math.max(best[k] or 0, O.dev[k] * 0.85) end
		end
	end
	for _, k in ipairs(N.FIELDS) do
		local b = best[k]
		if b and b > S.dev[k] then
			S.dev[k] = clamp(S.dev[k] + (b - S.dev[k]) * 0.015 * (0.5 + soc.literacy), 0, 100)
		end
	end
	-- 식자율은 과학·학문 성장을 돕는다
	S.dev.sci = clamp(S.dev.sci + soc.literacy * 0.08 * (1 - S.dev.sci / 100), 0, 100)
end

-- ───────── 위기 사건: 역병·흉년·종교 갈등 ─────────
-- 도시화·교역·인구 압박이 클수록, 보건·검역 발견이 약할수록 위기가 잘 온다. 위기는 일정 기간 불만·연구·징집에 영향을 준다.
N.CRISIS = {
	plague = { name = "역병", months = 8, unrest = 0.18, research = -0.3, manpower = -0.25 },
	famine = { name = "흉년", months = 10, unrest = 0.22, research = -0.1, manpower = -0.15 },
	strife = { name = "종교 분쟁", months = 14, unrest = 0.15, research = -0.15, manpower = -0.05 },
}
local function stepCrisis(st, S)
	local c = S.crisis
	if c and st.day >= c.untilDay then
		logEvent(st, S.id, "crisis_end", string.format("%s %s 종식", S.id, N.CRISIS[c.kind].name))
		S.crisis = nil
		c = nil
	end
	if c then return end
	local m = S.metrics
	local urban = clamp(((S.soc and S.soc.urban) or 0), 0, 1)
	local health = (S.mods and S.mods.health) or 0
	local plague = 0.0012 * (1 + urban * 1.5 + math.min(2, m.trade / math.max(1, m.pop) * 0.002)) * (1 - math.min(0.8, health))
	local famine = if S.cap and S.cap.food and S.cap.food < 0.55 then 0.01 * (0.7 - S.cap.food) * 10 else 0.0006
	local strife = 0.0008 + ((S.soc and S.soc.unrest) or 0) * 0.004
	local r = roll(st, S.id .. ":crisis")
	local kind = nil
	if r < plague then kind = "plague" elseif r < plague + famine then kind = "famine" elseif r < plague + famine + strife then kind = "strife" end
	if kind then
		S.crisis = { kind = kind, untilDay = st.day + N.CRISIS[kind].months * 30 }
		S.soc.unrest = clamp(S.soc.unrest + N.CRISIS[kind].unrest, 0, 1)
		logEvent(st, S.id, "crisis", string.format("%s %s 발생", S.id, N.CRISIS[kind].name))
	end
end

-- ───────── 3단계: 항로 안전·해적, 첩보, 인재 ─────────
-- 항로 안전: 전쟁 상대의 해군과 해적(불안정·약한 해군)이 상선단을 위협한다. 호위(자국 해군)가 강하면 안전하다.
-- 상선 손실은 재정(기록상의 수입)을 줄인다. 실제 플레이어 거래에는 N.seaDanger 로만 조회된다.
local function stepRaids(st, S)
	local m = S.metrics
	local ship = S.ship
	ship.fleet = 10 + math.log(1 + m.trade) * 5
	local foe = S.war and st.states[S.war.foe]
	local threat = foe and (foe.navyPower or 0) or 0
	local piracy = clamp(0.05 + (1 - S.stab) * 0.25 + (if (S.navyPower or 0) < 1 then 0.1 else 0), 0, 0.5)
	local escort = S.navyPower or 0
	local pirate = piracy * 2
	ship.danger = clamp((threat + pirate) / (threat + pirate + escort + 0.5), 0, 1)
	ship.lossFrac += (ship.danger * 0.15 - ship.lossFrac) * 0.3
	ship.lost += ship.fleet * ship.danger * 0.02
	if foe and foe.ship then foe.ship.prizes += ship.fleet * ship.danger * 0.01 end
end

-- 첩보: 행정·과학·지도자 외교 능력으로 첩보망이 자라고, 라이벌의 기술을 훔치거나 들켜 관계가 나빠진다.
local function stepSpy(st, S)
	local spy = S.spy
	spy.net = clamp(spy.net + ((S.dev.admin * 0.4 + S.ruler.skills.diplo * 6 + S.dev.sci * 0.2) / 100) * 0.05 - spy.net * 0.02, 0, 1)
	if spy.net < 0.35 or roll(st, S.id .. ":spy") >= 0.08 * spy.net then return end
	local target, gap = nil, 0
	local ids = {}
	for other in pairs(S.rel) do table.insert(ids, other) end
	table.sort(ids)
	for _, other in ipairs(ids) do
		local O = st.states[other]
		if O and O.tech and (S.rel[other] or 0) < 20 and O.tech.count - S.tech.count > gap then target, gap = O, O.tech.count - S.tech.count end
	end
	if not target then return end
	local caught = roll(st, S.id .. ":caught") < 0.3 * (target.dev.admin / 100 + 0.2)
	if caught then
		S.rel[target.id] = clamp((S.rel[target.id] or 0) - 15, -100, 100)
		target.rel[S.id] = clamp((target.rel[S.id] or 0) - 15, -100, 100)
		logEvent(st, S.id, "spy_caught", string.format("%s 첩자가 %s 에서 발각됨", S.id, target.id))
		return
	end
	local pick
	for _, def in ipairs(N.TECHS) do
		if target.tech.known[def.id] and not S.tech.known[def.id] then
			local ok = true
			for _, r in ipairs(def.req) do if not S.tech.known[r] then ok = false break end end
			if ok and (not pick or def.cost < pick.cost) then pick = def end
		end
	end
	if pick then
		S.tech.cur = pick.id
		S.tech.prog = math.max(S.tech.prog, pick.cost * 0.5)
		logEvent(st, S.id, "spy_steal", string.format("%s 가 %s 의 '%s' 기술을 빼돌림", S.id, target.id, pick.name))
	end
end

-- 인재: 학자·명장·거상이 나라에 나타나 연구·군사·재정을 돕고, 25년 뒤 물러나며, 불안한 나라에서는 이주한다.
N.TALENT = {
	scholar = { name = "학자", fx = { research = 0.05 } },
	general = { name = "명장", fx = { doctrine = 0.03, unit_inf = 0.05 } },
	merchant = { name = "거상", fx = { income = 0.02, trade = 0.02 } },
}
local TALENT_KINDS = { "scholar", "general", "merchant" }
local function stepTalents(st, S)
	local list = S.talents
	local changed = false
	for i = #list, 1, -1 do
		local tal = list[i]
		if st.day >= tal.untilDay then
			logEvent(st, S.id, "talent_retire", string.format("%s %s %s 은퇴", S.id, N.TALENT[tal.kind].name, tal.name))
			table.remove(list, i)
			changed = true
		elseif S.stab < 0.35 and roll(st, S.id .. ":mig" .. tal.name) < 0.02 then
			local best, bestScore = nil, -1
			local ids = {}
			for other in pairs(S.rel) do table.insert(ids, other) end
			table.sort(ids)
			for _, other in ipairs(ids) do
				local O = st.states[other]
				if O and #O.talents < 4 and O.stab > 0.5 and (O.prestige or 0) + O.stab > bestScore then best, bestScore = O, (O.prestige or 0) + O.stab end
			end
			if best then
				table.remove(list, i)
				table.insert(best.talents, tal)
				recomputeMods(best)
				changed = true
				logEvent(st, best.id, "talent_move", string.format("%s %s %s 이 %s 로 이주", S.id, N.TALENT[tal.kind].name, tal.name, best.id))
			end
		end
	end
	if #list < 4 then
		local lit = (S.soc and S.soc.literacy or 0.2) + 0.2
		local chance = { scholar = 0.004 * lit * (S.dev.learn / 50), general = 0.004 * (if S.war then 3 else 1) * (S.dev.mil / 50), merchant = 0.004 * (S.dev.trade / 50) }
		local r = roll(st, S.id .. ":talent")
		local acc = 0
		for _, kind in ipairs(TALENT_KINDS) do
			acc += chance[kind]
			if r < acc then
				local g = GROUPS[groupOf(S.id)] or GROUPS[DEFAULT_GROUP]
				local nm = pickFrom(g.names, st, S.id .. ":tn" .. tostring(st.day))
				table.insert(list, { kind = kind, name = nm, since = math.floor(year(st)), untilDay = st.day + 365 * 25, fx = N.TALENT[kind].fx })
				changed = true
				logEvent(st, S.id, "talent", string.format("%s 에 %s %s 등장", S.id, N.TALENT[kind].name, nm))
				break
			end
		end
	end
	if changed then recomputeMods(S) end
end

local function stepState(st, S)
	local reg = N.REGIMES[S.regime] or N.REGIMES.absolute
	local m = S.metrics
	-- 나이와 수명
	S.ruler.age += N.STEP_DAYS / 365
	local hazard = 0.0004 + math.max(0, S.ruler.age - 50) * 0.0006
	if roll(st, S.id .. ":die") < hazard then succeed(st, S, "사망") end
	-- 정통성과 안정
	local regent = if st.day < S.regentUntil then -0.12 else 0
	local civil = if st.day < S.civilUntil then -0.25 else 0
	local skill = (S.ruler.skills.cha + S.ruler.skills.diplo) / 20
	S.legit = clamp(S.legit + (reg.legit + (skill - 0.5) * 0.2 - S.legit) * 0.04, 0.1, 1)
	local target = clamp(m.stab * 0.6 + S.legit * 0.3 + reg.stab - (S.soc and S.soc.unrest or 0) * 0.2 + regent + civil + (S.war and -0.05 or 0.02), 0, 1)
	S.stab = clamp(S.stab + (target - S.stab) * 0.2, 0, 1)
	-- 투자 방향과 발전
	local tf = targetFocus(S)
	for _, k in ipairs(N.FIELDS) do
		S.focus[k] += (tf[k] - S.focus[k]) * reg.speed * 0.2
	end
	normalizeFocus(S.focus)
	local power = clamp(math.log(1 + m.gdp) / 14, 0.15, 1) * (0.6 + S.stab * 0.4)
	local skills = rulerBias(S.ruler)
	for _, k in ipairs(N.FIELDS) do
		local gain = 0.5 * S.focus[k] * 7 * power * (reg.mods[k] or 1) * (0.7 + skills[k] * 0.6)
		if S.war and (k == "trade" or k == "culture") then gain *= 0.8 end
		S.dev[k] = clamp(S.dev[k] + gain * (1 - S.dev[k] / 100), 0, 100)
	end
	stepSociety(st, S)
	stepCrisis(st, S)
	stepTech(st, S)
	stepSpy(st, S)
	stepTalents(st, S)
	stepRaids(st, S)
	S.honor = clamp(S.honor + (0.7 - S.honor) * 0.02, 0, 1)
	S.fin.income = S.fin.income * mm(S, "income") * (1 + 0.5 * ((S.mods and S.mods.trade) or 0)) * (1 - S.ship.lossFrac * 0.4)
	stepForces(st, S)
	-- 재정: 전쟁과 행정이 약하면 빚이 늘고, 평시에는 갚는다
	local spend = S.fin.income * (0.75 + S.focus.mil * 0.6 + S.focus.navy * 0.3 + (S.war and 0.25 or 0))
	if S.tribute and st.day > S.tribute.untilDay then S.tribute = nil end
	if S.tribute then spend += S.fin.income * 0.1 end
	local net = S.fin.income * (0.9 + S.dev.admin / 250) - spend
	S.fin.debt = math.max(0, S.fin.debt - net * 0.5)
	-- 문화 사슬: 투자 → 품질 → 특산품 → 브랜드
	S.culture.stock = math.max(0, S.culture.stock + S.focus.culture * 22 * power + S.focus.learn * 6 * power - S.culture.stock * 0.004)
	local level = 1
	for i, need in ipairs(N.BRAND_STEPS) do
		if S.culture.stock >= need then level = i + 1 end
	end
	if level > S.culture.level then
		logEvent(st, S.id, "culture", string.format("%s 문화 단계 상승: %s", S.id, N.BRAND_NAMES[level]))
	end
	S.culture.level = level
	-- 개혁·혁명
	if S.stab < 0.25 and roll(st, S.id .. ":revolt") < 0.04 then
		local old = reg.name
		S.regime = chooseRegimeAfter(st, S)
		S.ruler = generatedRuler(st, S.id, groupOf(S.id), "혁명")
		S.legit, S.stab = 0.5, 0.5
		S.civilUntil = 0
		logEvent(st, S.id, "revolution", string.format("%s 혁명: %s → %s", S.id, old, N.REGIMES[S.regime].name))
	elseif S.dev.learn > 55 and S.dev.admin > 50 and (S.regime == "absolute" or S.regime == "sultanate")
		and roll(st, S.id .. ":reform") < 0.006 then
		local old = reg.name
		S.regime = "parliament"
		S.legit = clamp(S.legit + 0.05, 0.1, 1)
		logEvent(st, S.id, "reform", string.format("%s 개혁: %s → %s", S.id, old, N.REGIMES[S.regime].name))
	end
end

local function militaryPower(S)
	return S.power or 0
end

-- ───────── 전쟁 후 종전 협상 ─────────
-- 전쟁 점수로 승패를 가르고, 이긴 쪽이 배상금·조공·항구 할양을 요구한다. 비기면 백지 휴전.
-- 할양된 항구는 st.owner 로 소유가 바뀌고 식민지(이질 문화권이면 동화·반란 문제)가 된다.
local function ceedablePort(st, w, loserId, winnerId)
	local bestId, bestScore = nil, -1
	local loserPorts = 0
	for _, id in ipairs(w.order) do
		if ownerOf(st, id, w.towns[id]) == loserId then loserPorts += 1 end
	end
	if loserPorts <= 1 then return nil end -- 마지막 항구는 빼앗지 않는다
	local capital, capPop = nil, -1
	for _, id in ipairs(w.order) do
		local t = w.towns[id]
		if ownerOf(st, id, t) == loserId and (t.pop or 0) > capPop then capital, capPop = id, t.pop or 0 end
	end
	for _, id in ipairs(w.order) do
		local t = w.towns[id]
		if id ~= capital and ownerOf(st, id, t) == loserId then
			local near = 0
			for _, nb in ipairs(t.neighbors or {}) do
				local o = w.towns[nb.id]
				if o and ownerOf(st, nb.id, o) == winnerId then near += 1 / math.max(1, nb.d / 500) end
			end
			local score = near * 2 + math.log(1 + (t.gdp or 0)) * 0.1 + hash01(id .. winnerId) * 0.01
			if score > bestScore then bestId, bestScore = id, score end
		end
	end
	return bestId
end

function N.treaty(st, w, S, foe)
	local sScore = (S.war and S.war.score) or 0
	local fScore = (foe.war and foe.war.score) or -sScore
	local diff = sScore - fScore
	local win, lose
	if diff > 2 then win, lose = S, foe elseif diff < -2 then win, lose = foe, S end
	if not win then
		logEvent(st, S.id, "peace", string.format("%s 와 %s 백지 휴전", S.id, foe.id))
		S.rel[foe.id] = clamp((S.rel[foe.id] or 0) + 10, -100, 100)
		foe.rel[S.id] = clamp((foe.rel[S.id] or 0) + 10, -100, 100)
		return "white"
	end
	local terms = {}
	-- 배상금: 승자의 연 수입 몇 배만큼 패자의 빚이 늘고 승자의 빚은 준다
	local indemnity = win.fin.income * math.min(4, 1 + math.abs(diff) * 0.4)
	lose.fin.debt += indemnity
	win.fin.debt = math.max(0, win.fin.debt - indemnity * 0.5)
	table.insert(terms, "배상금")
	-- 조공: 압승이면 일정 기간 수입의 일부를 바친다
	if math.abs(diff) > 5 then
		lose.tribute = { to = win.id, untilDay = st.day + 365 * 5 }
		table.insert(terms, "조공")
	end
	-- 항구 할양
	local ceded = nil
	if math.abs(diff) > 3.5 and roll(st, win.id .. lose.id .. ":cede") < 0.65 then
		local pid = ceedablePort(st, w, lose.id, win.id)
		if pid then
			st.owner[pid] = win.id
			st.ports[pid] = nil -- 새 주인 아래서 동화·불만을 다시 시작
			ceded = w.towns[pid].name or pid
			table.insert(terms, "항구 할양: " .. tostring(ceded))
		end
	end
	win.prestige = (win.prestige or 0) + 1
	lose.legit = clamp(lose.legit - 0.08, 0.1, 1)
	lose.rel[win.id] = clamp((lose.rel[win.id] or 0) - 15, -100, 100)
	win.rel[lose.id] = clamp((win.rel[lose.id] or 0) - 5, -100, 100)
	logEvent(st, win.id, "treaty", string.format("%s 승 · %s 패 종전 (%s)", win.id, lose.id, table.concat(terms, ", ")))
	return "win", win.id
end

-- ───────── 3단계: 식민 개척, 조약, 플레이어 개입 ─────────
-- 식민 개척: 해군이 강하고 안정된 나라가 약한 나라(부족·소국)의 항구를 전쟁 없이 확보한다. 쿨다운 2년.
local function stepColony(st, w, S)
	if (S.navyPower or 0) <= 0 or S.stab < 0.5 or st.day < 365 or st.day < (S.colonyUntil or 0) then return end
	if roll(st, S.id .. ":colon") >= 0.012 * (1 + S.focus.navy * 3) then return end
	local ids = {}
	for id in pairs(st.states) do table.insert(ids, id) end
	table.sort(ids)
	for _, id in ipairs(ids) do
		local O = st.states[id]
		if O and id ~= S.id and not S.allies[id] and not (S.pacts[id]) and (O.regime == "tribal" or O.power < S.power * 0.25) then
			local pid = ceedablePort(st, w, id, S.id)
			if pid then
				st.owner[pid] = S.id
				st.ports[pid] = nil
				S.colonyUntil = st.day + 720
				O.rel[S.id] = clamp((O.rel[S.id] or 0) - 30, -100, 100)
				S.prestige = (S.prestige or 0) + 0.3
				logEvent(st, S.id, "colonize", string.format("%s 가 %s 의 %s 항구를 식민지로 확보", S.id, id, w.towns[pid].name or pid))
				return
			end
		end
	end
end

-- 조약: 무역 협정(관세 인하)·통과권. 어기면 신용(honor)이 떨어지고 신용이 낮으면 동맹을 맺기 어렵다.
N.PACT_NAMES = { trade = "무역 협정", passage = "통과권 협정" }
local function formPact(st, a, b, kind)
	local untilDay = st.day + 365 * (3 + math.floor(hash01(a.id .. b.id .. tostring(st.day)) * 3))
	a.pacts[b.id] = { kind = kind, untilDay = untilDay }
	b.pacts[a.id] = { kind = kind, untilDay = untilDay }
	logEvent(st, a.id, "pact", string.format("%s ↔ %s %s 체결", a.id, b.id, N.PACT_NAMES[kind]))
end
local function breakPact(st, breaker, other)
	if not breaker.pacts[other.id] then return end
	local kind = breaker.pacts[other.id].kind
	breaker.pacts[other.id] = nil
	other.pacts[breaker.id] = nil
	breaker.honor = clamp(breaker.honor - 0.2, 0, 1)
	other.rel[breaker.id] = clamp((other.rel[breaker.id] or 0) - 20, -100, 100)
	logEvent(st, breaker.id, "pact_break", string.format("%s 가 %s 와의 %s 파기 (신용 하락)", breaker.id, other.id, N.PACT_NAMES[kind]))
end
local function stepPacts(st, S)
	for other, pact in pairs(S.pacts) do
		local O = st.states[other]
		if not O or st.day >= pact.untilDay then
			S.pacts[other] = nil
			if O then O.pacts[S.id] = nil end
			logEvent(st, S.id, "pact_end", string.format("%s ↔ %s %s 만료", S.id, other, N.PACT_NAMES[pact.kind] or "협정"))
		end
	end
	local ids = {}
	for other in pairs(S.rel) do table.insert(ids, other) end
	table.sort(ids)
	for _, other in ipairs(ids) do
		local O = st.states[other]
		if O and S.id < other and not S.pacts[other] and not S.war and not O.war and (S.rel[other] or 0) > 25 and (O.rel[S.id] or 0) > 10
			and S.honor > 0.4 and O.honor > 0.4 and roll(st, S.id .. other .. ":pact") < 0.01 then
			local kind = if st.adjacency[S.id] and st.adjacency[S.id][other] then "passage" else "trade"
			formPact(st, S, O, kind)
		end
	end
end

-- 플레이어 개입(군수 납품·중재·용병 해군). 반환: ok, 설명. 재화 차감은 호출한 쪽이 처리한다.
function N.aid(st, w, homeNation, kind, targetId, amount)
	local T = st.states[st.liege[targetId] or targetId]
	local H = st.states[st.liege[homeNation] or homeNation]
	amount = tonumber(amount) or 0
	if not T or amount <= 0 then return false, "대상이나 금액이 올바르지 않아요" end
	local scale = math.max(1, T.fin.income)
	if kind == "supply" then
		if not T.war then return false, "전쟁 중인 나라에만 군수 물자를 보낼 수 있어요" end
		local effect = clamp(amount / (scale * 2), 0, 1.5)
		T.war.score = (T.war.score or 0) + effect * 3
		if H then T.rel[H.id] = clamp((T.rel[H.id] or 0) + effect * 10, -100, 100) end
		return true, string.format("%s 에 군수 물자를 납품해 전쟁 점수 +%.1f", T.id, effect * 3)
	elseif kind == "mediate" then
		local foe = T.war and st.states[T.war.foe]
		if not foe then return false, "전쟁 중인 나라만 중재할 수 있어요" end
		local chance = clamp(0.3 + amount / (scale * 3) + (if H then (T.rel[H.id] or 0) / 400 else 0), 0.1, 0.9)
		if roll(st, "mediate" .. T.id .. foe.id) < chance then
			T.war, foe.war = nil, nil
			T.rel[foe.id] = clamp((T.rel[foe.id] or 0) + 10, -100, 100)
			foe.rel[T.id] = clamp((foe.rel[T.id] or 0) + 10, -100, 100)
			logEvent(st, T.id, "mediation", string.format("%s ↔ %s 중재로 휴전", T.id, foe.id))
			return true, string.format("중재 성공: %s 와 %s 가 휴전했어요", T.id, foe.id)
		end
		return false, "중재가 받아들여지지 않았어요"
	elseif kind == "mercenary" then
		local ships = clamp(amount / 400, 0.5, 4)
		T.merc = { ships = ships, untilDay = st.day + 180 }
		if H then T.rel[H.id] = clamp((T.rel[H.id] or 0) + 5, -100, 100) end
		return true, string.format("%s 에 용병 해군 %.1f척을 6개월간 빌려줬어요", T.id, ships)
	end
	return false, "알 수 없는 개입이에요"
end

local function stepDiplomacy(st, w)
	do
		local top, topP, second = nil, 0, 0
		for id, S in pairs(st.states) do
			local pw = S.power or 0
			if pw > topP or (pw == topP and top and id < top) then second, top, topP = topP, id, pw elseif pw > second then second = pw end
		end
		local prev = st.hegemon
		st.hegemon = if top and topP > second * 1.5 and topP > 0 then top else nil
		if st.hegemon and st.hegemon ~= prev then logEvent(st, st.hegemon, "hegemon", string.format("%s 패권국으로 부상 — 주변국이 견제를 시작", st.hegemon)) end
	end
	local ids = {}
	for id in pairs(st.states) do table.insert(ids, id) end
	table.sort(ids)
	for _, id in ipairs(ids) do
		local S = st.states[id]
		-- 관계도는 서서히 0으로 돌아오고, 경쟁(국력 비슷)이면 나빠지고, 동맹이면 좋아진다
		for other, v in pairs(S.rel) do
			local O = st.states[other]
			if O then
				local drift = -v * 0.02
				local rivalry = if math.abs(militaryPower(S) - militaryPower(O)) < 0.25 * math.max(militaryPower(S), militaryPower(O)) then -0.4 else 0
				local ally = if S.allies[other] then 1 else 0
				S.rel[other] = clamp(v + drift + rivalry + ally + (roll(st, id .. other .. "d") - 0.5) * 2, -100, 100)
			end
		end
		-- 종교·문화: 같은 문화권은 가까워지고, 믿음이 다른 인접국은 서서히 멀어진다
		for other in pairs(S.rel) do
			local O = st.states[other]
			if O and S.fam and O.fam and st.adjacency[id] and st.adjacency[id][other] then
				local same = S.fam == O.fam
				S.rel[other] = clamp(S.rel[other] + (if same then 0.3 else -0.2), -100, 100)
			end
		end
		-- 패권 견제: 가장 강한 나라가 둘째보다 크게 앞서면 나머지가 그 나라에 맞서 결집한다
		if st.hegemon and st.hegemon ~= id and S.rel[st.hegemon] then
			S.rel[st.hegemon] = clamp(S.rel[st.hegemon] - 0.5, -100, 100)
			for other in pairs(S.rel) do
				local O = st.states[other]
				if O and other ~= st.hegemon and (O.rel[st.hegemon] or 0) < 10 and S.rel[other] then
					S.rel[other] = clamp(S.rel[other] + 0.6, -100, 100)
				end
			end
		end
		-- 동맹: 관계가 충분히 좋고 공통의 적이 있을 때
		for other, v in pairs(S.rel) do
			if v > 45 and not S.allies[other] and st.states[other] and S.honor > 0.4 and st.states[other].honor > 0.4
				and roll(st, id .. other .. "al") < 0.02 then
				S.allies[other] = true
				st.states[other].allies[id] = true
				logEvent(st, id, "alliance", string.format("%s ↔ %s 동맹", id, other))
			elseif v < 5 and S.allies[other] then
				S.allies[other] = nil
				if st.states[other] then st.states[other].allies[id] = nil end
				logEvent(st, id, "alliance_end", string.format("%s ↔ %s 동맹 파기", id, other))
			end
		end
		-- 전쟁: 사이가 나쁘고 내가 더 강하면 선포, 장기전이면 피로로 휴전
		if S.war then
			local foe = st.states[S.war.foe]
			S.war.months += 1
			-- 전쟁 점수: 매달 힘의 우위만큼 쌓인다 (이기는 쪽이 +)
			if foe then
				local a, b = militaryPower(S), militaryPower(foe)
				S.war.score = (S.war.score or 0) + clamp((a - b) / math.max(0.1, a + b), -1, 1)
			end
			if not foe or S.war.months > 6 + math.floor(roll(st, id .. "peace") * 14) or S.stab < 0.2 then
				if foe and foe.war and foe.war.foe == id then
					N.treaty(st, w, S, foe)
					foe.war = nil
				else
					logEvent(st, id, "peace", string.format("%s 와 %s 휴전", id, S.war.foe))
				end
				S.war = nil
			end
		elseif S.stab > 0.4 and st.day > 365 then
			local worst, worstV = nil, 0
			for other, v in pairs(S.rel) do
				if v < worstV and st.states[other] and not S.allies[other] and not st.states[other].war then worst, worstV = other, v end
			end
			if worst and worstV < -40 and militaryPower(S) > militaryPower(st.states[worst]) * 1.15
				and roll(st, id .. "warroll") < 0.03 * (N.REGIMES[S.regime].mods.mil or 1) then
				if S.pacts[worst] then breakPact(st, S, st.states[worst]) end
				S.war = { foe = worst, months = 0 }
				st.states[worst].war = { foe = id, months = 0 }
				S.rel[worst] = clamp(S.rel[worst] - 20, -100, 100)
				st.states[worst].rel[id] = clamp((st.states[worst].rel[id] or 0) - 20, -100, 100)
				logEvent(st, id, "war", string.format("%s 가 %s 에 선전포고", id, worst))
				-- 동맹은 같은 편으로 참전한다 (관계가 좋을수록, 상대와 사이가 나쁠수록)
				for _, side in ipairs({ { id, worst }, { worst, id } }) do
					local mine, foeId = st.states[side[1]], side[2]
					for ally in pairs(mine.allies) do
						local A = st.states[ally]
						if A and not A.war and ally ~= foeId then
							if roll(st, ally .. foeId .. "join") < 0.35 then
								A.war = { foe = foeId, months = 0 }
								logEvent(st, ally, "join", string.format("%s 가 동맹 %s 편으로 %s 와 전쟁 참전", ally, side[1], foeId))
							else
								-- 참전 거부: 동맹의 신용이 깎이고 관계가 나빠진다
								A.honor = clamp(A.honor - 0.05, 0, 1)
								mine.rel[ally] = clamp((mine.rel[ally] or 0) - 5, -100, 100)
							end
						end
					end
				end
			end
		end
	end
end

local function stepVassals(st, w)
	for c, liege in pairs(st.liege) do
		local L = st.states[liege]
		if L then
			-- 본국이 불안정하고 식민지도 불안하면 독립
			local towns, stab = 0, 0
			for _, id in ipairs(w.order) do
				local t = w.towns[id]
				if t.country == c then towns += 1; stab += t.stability or 0.5 end
			end
			if towns > 0 and L.stab < 0.3 and stab / towns < 0.4 and roll(st, c .. ":indep") < 0.02 then
				st.liege[c] = nil
				st.states[c] = newState(st, c, "absolute")
				st.states[c].ruler = generatedRuler(st, c, groupOf(c), "독립")
				logEvent(st, c, "independence", string.format("%s 가 %s 에서 독립", c, liege))
			end
		end
	end
end

function N.rank(st)
	local rows = {}
	for id, S in pairs(st.states) do
		local m = S.metrics
		local score = (math.log(1 + militaryPower(S)) * 6 * 0.25 + S.dev.trade * math.log(1 + m.trade) / 12 * 0.25
			+ S.dev.sci * 0.15 + S.dev.culture * 0.15 + S.dev.learn * 0.1 + math.log(1 + m.pop) * 0.1)
		table.insert(rows, { id = id, score = score })
	end
	table.sort(rows, function(a, b)
		if a.score ~= b.score then return a.score > b.score end
		return a.id < b.id
	end)
	local ranks = {}
	for i, row in ipairs(rows) do ranks[row.id] = i end
	st.ranks = ranks
	return rows
end

function N.step(w)
	local st = w.nations
	if not st then return end
	st.day = w.day
	if st.day % N.STEP_DAYS ~= 0 then return end
	aggregate(st, w)
	local ids = {}
	for id in pairs(st.states) do table.insert(ids, id) end
	table.sort(ids)
	for _, id in ipairs(ids) do
		if st.states[id] then stepState(st, st.states[id]) end
	end
	stepDiplomacy(st, w)
	stepVassals(st, w)
	for _, id in ipairs(ids) do
		local S = st.states[id]
		if S then
			stepPacts(st, S)
			stepColony(st, w, S)
		end
	end
	stepPorts(st, w)
	N.rank(st)
end

-- ───────── 조회 ─────────
function N.view(st, id)
	local owner = st.liege[id] or id
	local S = st.states[owner]
	if not S then return nil end
	local reg = N.REGIMES[S.regime]
	local focus = {}
	for _, k in ipairs(N.FIELDS) do focus[k] = S.focus[k] end
	return {
		id = owner, vassal = st.liege[id] ~= nil, ruler = S.ruler, regime = reg.name, regimeId = S.regime,
		pros = reg.pros, cons = reg.cons, legit = S.legit, stab = S.stab, focus = focus, dev = S.dev,
		cultureLevel = S.culture.level, cultureName = N.BRAND_NAMES[S.culture.level], war = S.war and S.war.foe or nil,
		rank = st.ranks[owner], regent = st.day < S.regentUntil, civilWar = st.day < S.civilUntil,
		debt = S.fin.debt, income = S.fin.income,
		crisis = S.crisis and N.CRISIS[S.crisis.kind].name or nil, ship = S.ship, spy = S.spy, honor = S.honor, pacts = S.pacts, talents = S.talents, merc = S.merc, soc = S.soc, tech = S.tech, mods = S.mods, doctrine = N.doctrineName(S), prestige = S.prestige, res = S.res, cap = S.cap, forces = S.forces, power = S.power, armyPower = S.armyPower, navyPower = S.navyPower, standing = S.standing,
	}
end

-- ───────── 항구 조회·입장·관세 ─────────
-- 입장(stance): 플레이어의 본국(homeNation) 기준으로 항구 주인이 동맹/중립/적대/자국인지 가른다.
-- 관세: 체제 기본세 × 입장 보정 + 식민지 독점 가산. 적대 + 관계 악화면 금수(closed).
-- ※ 조회 전용: 실제 거래 수치(Trade)에는 아직 연결하지 않았다.
function N.portOwner(st, w, portId)
	local t = w.towns[portId]
	if not t then return nil end
	return ownerOf(st, portId, t)
end

function N.stance(st, w, portId, homeNation)
	local ownerId = N.portOwner(st, w, portId)
	if not ownerId then return "neutral" end
	local home = st.liege[homeNation] or homeNation
	if ownerId == home then return "home" end
	local S, H = st.states[ownerId], st.states[home]
	if not S or not H then return "neutral" end
	if (S.war and S.war.foe == home) or (H.war and H.war.foe == ownerId) then return "hostile" end
	if S.allies[home] then return "ally" end
	local r = S.rel[home] or 0
	if r < -40 then return "hostile" end
	if r > 40 then return "friendly" end
	return "neutral"
end

function N.tariff(st, w, portId, homeNation)
	local t = w.towns[portId]
	local ownerId = N.portOwner(st, w, portId)
	local S = ownerId and st.states[ownerId]
	if not t or not S then return { rate = 0.05, stance = "neutral", closed = false, colony = false } end
	local stance = N.stance(st, w, portId, homeNation)
	local base = TARIFF_BASE[S.regime] or 0.08
	local colony = (st.owner[portId] ~= nil) or (st.liege[t.country] == ownerId)
	local mult = ({ home = 0, ally = 0.5, friendly = 0.75, neutral = 1, hostile = 2 })[stance] or 1
	local homeS = st.states[st.liege[homeNation] or homeNation]
	if homeS and homeS.pacts[ownerId] and homeS.pacts[ownerId].kind == "trade" and stance ~= "home" then mult *= 0.6 end
	local rate = base * mult
	if colony and stance ~= "home" then rate += 0.06 end -- 식민지 본국 독점 가산
	rate -= (S.dev.admin / 100) * 0.01 -- 행정이 좋으면 탈세가 줄어 세율을 낮출 여유
	local closed = stance == "hostile" and (S.rel[st.liege[homeNation] or homeNation] or 0) < -60 and S.war ~= nil
	return { rate = clamp(rate, 0, 0.45), stance = stance, closed = closed, colony = colony, owner = ownerId }
end

function N.seaDanger(st, w, portId)
	local ownerId = N.portOwner(st, w, portId)
	local S = ownerId and st.states[ownerId]
	return S and S.ship and S.ship.danger or 0
end

-- 거래 연결용 관세 정책: 기존 관세(우호도 기반)에 곱하는 배율과 금수 여부.
-- 배율은 입장(자국 0 · 동맹 0.5 · 우호 0.75 · 중립 1 · 적대 1.8)에 식민지 독점(×1.25)을 곱한다. 상한 2.2배.
-- 금수(closed)는 "플레이어 본국과 전쟁 중 + 관계 -60 이하"인 항구만이며, 암시장은 그대로 쓸 수 있다.
local STANCE_MULT = { home = 0, ally = 0.5, friendly = 0.75, neutral = 1, hostile = 1.8 }
function N.tariffPolicy(st, w, portId, homeNation)
	local tf = N.tariff(st, w, portId, homeNation)
	local mult = (STANCE_MULT[tf.stance] or 1) * (if tf.colony and tf.stance ~= "home" then 1.25 else 1)
	return { mult = clamp(mult, 0, 2.2), closed = tf.closed == true, stance = tf.stance, colony = tf.colony }
end

function N.portView(st, w, portId)
	local t = w.towns[portId]
	if not t then return nil end
	local ownerId = ownerOf(st, portId, t)
	local row = ensurePort(st, w, portId, ownerId)
	local fam = N.FAMILIES[row.fam] or N.FAMILIES.latin
	local produces = {}
	for g in pairs(t.produces or {}) do table.insert(produces, g) end
	table.sort(produces)
	local techSum, techN = 0, 0
	for _, v in pairs(t.tech or {}) do techSum += v; techN += 1 end
	return {
		id = portId, owner = ownerId, colony = (st.owner[portId] ~= nil) or (st.liege[t.country] == ownerId),
		culture = fam.name, language = fam.lang, faith = fam.faith, assimilation = row.assim, unrest = row.unrest,
		pop = t.pop or 0, stage = t.stage or 1, tech = if techN > 0 then techSum / techN else 1, produces = produces,
	}
end

-- ───────── 화면용 요약 (문장 목록) ─────────
local function fmt1(x) return string.format("%.1f", x) end
local STANCE_NAME = { home = "자국", ally = "동맹", friendly = "우호", neutral = "중립", hostile = "적대" }
function N.summary(st, w, portId, homeNation)
	local t = w.towns[portId]
	if not t then return nil end
	local ownerId = ownerOf(st, portId, t)
	local S = st.states[ownerId]
	if not S then return nil end
	local v = N.view(st, ownerId)
	local pv = N.portView(st, w, portId)
	local lines = {}
	table.insert(lines, string.format("%s · %s%s", N.leaderLine(st, ownerId) or ownerId, "국력 " .. tostring(v.rank) .. "위", if st.hegemon == ownerId then " · 패권국" else ""))
	table.insert(lines, string.format("체제: %s — 강점 %s / 약점 %s", v.regime, v.pros or "-", v.cons or "-"))
	local F = S.forces
	table.insert(lines, string.format("육군 보병 %s·기병 %s·포병 %s·민병 %s (천 명) · 교리 %s", fmt1(F.inf), fmt1(F.cav), fmt1(F.art), fmt1(F.militia), v.doctrine))
	table.insert(lines, string.format("해군 전열함 %s·프리깃 %s·소형 %s·수송 %s (척)", fmt1(F.line), fmt1(F.frigate), fmt1(F.small), fmt1(F.transport)))
	local T = S.tech
	local cur = T.cur and N.TECH_BY_ID[T.cur]
	if cur then
		table.insert(lines, string.format("연구: %s (%d%%) · 발견 %d종", cur.name, math.floor(clamp(T.prog / cur.cost, 0, 1) * 100), T.count))
	else
		table.insert(lines, string.format("발견 %d종", T.count))
	end
	local extra = {}
	if S.war then table.insert(extra, "전쟁: " .. tostring(S.war.foe)) end
	if v.crisis then table.insert(extra, "위기: " .. v.crisis) end
	local allies = {}
	for a in pairs(S.allies) do table.insert(allies, a) end
	table.sort(allies)
	if #allies > 0 then table.insert(extra, "동맹: " .. table.concat(allies, ", ")) end
	if #extra > 0 then table.insert(lines, table.concat(extra, " · ")) end
	table.insert(lines, string.format("항로 위험 %d%% · 첩보망 %d%% · 신용 %d%%", math.floor(S.ship.danger * 100 + 0.5), math.floor(S.spy.net * 100 + 0.5), math.floor(S.honor * 100 + 0.5)))
	local ext = {}
	for other, pact in pairs(S.pacts) do table.insert(ext, string.format("%s(%s)", other, N.PACT_NAMES[pact.kind] or "협정")) end
	table.sort(ext)
	if #ext > 0 then table.insert(lines, "조약: " .. table.concat(ext, ", ")) end
	local tl = {}
	for _, tal in ipairs(S.talents) do table.insert(tl, string.format("%s %s", N.TALENT[tal.kind].name, tal.name)) end
	if #tl > 0 then table.insert(lines, "인재: " .. table.concat(tl, ", ")) end
	table.insert(lines, string.format("항구: %s · %s · %s%s — 동화 %d%% · 불만 %d%%", pv.culture, pv.language, pv.faith,
		if pv.colony then " · 식민지" else "", math.floor(pv.assimilation * 100 + 0.5), math.floor(pv.unrest * 100 + 0.5)))
	if homeNation and st.states[st.liege[homeNation] or homeNation] then
		local tf = N.tariff(st, w, portId, homeNation)
		table.insert(lines, string.format("입장: %s · 관세 %d%%%s", STANCE_NAME[tf.stance] or tf.stance, math.floor(tf.rate * 100 + 0.5), if tf.closed then " · 금수" else ""))
	end
	return { owner = ownerId, lines = lines }
end

-- 세계 정세 표: 국력 순위 상위 limit 개 (표시 전용)
function N.worldSummary(st, limit)
	local rows = N.rank(st)
	local out = {}
	for i = 1, math.min(limit or 8, #rows) do
		local id = rows[i].id
		local S = st.states[id]
		if S then
			local allies = 0
			for _ in pairs(S.allies) do allies += 1 end
			table.insert(out, {
				id = id, rank = i, leader = N.leaderLine(st, id) or id, regime = (N.REGIMES[S.regime] or N.REGIMES.absolute).name,
				army = S.armyPower or 0, navy = S.navyPower or 0, techs = (S.tech and S.tech.count) or 0,
				war = S.war and S.war.foe or nil, allies = allies, hegemon = st.hegemon == id,
			})
		end
	end
	return out
end

function N.leaderLine(st, id)
	local v = N.view(st, id)
	if not v then return nil end
	return string.format("%s %s · %s", v.ruler.title, v.ruler.name, v.regime)
end

-- ───────── 저장·복원 (w.nations 한 곳만) ─────────
local function clean(value, depth)
	local kind = type(value)
	if kind == "number" then
		if finite(value) then return value end
		return nil
	elseif kind == "string" then
		return string.sub(value, 1, 120)
	elseif kind == "boolean" then
		return value
	elseif kind == "table" and depth < 5 then
		local out = {}
		local n = 0
		for k, v in pairs(value) do
			n += 1
			if n > 400 then break end
			if type(k) == "string" or type(k) == "number" then
				local c = clean(v, depth + 1)
				if c ~= nil then out[k] = c end
			end
		end
		return out
	end
	return nil
end

function N.snapshot(st)
	if not st then return nil end
	return clean({
		schema = st.schema, seed = st.seed, day = st.day, startYear = st.startYear,
		states = st.states, liege = st.liege, log = st.log, owner = st.owner, ports = st.ports, firsts = st.firsts, hegemon = st.hegemon,
	}, 0)
end

local function repair(st, S)
	local reg = N.REGIMES[S.regime]
	if not reg then S.regime = "absolute" end
	if type(S.ruler) ~= "table" or type(S.ruler.skills) ~= "table" then S.ruler = generatedRuler(st, S.id, groupOf(S.id), "복구") end
	for _, k in ipairs({ "mil", "trade", "sci", "diplo", "cha" }) do
		S.ruler.skills[k] = clamp(tonumber(S.ruler.skills[k]) or 5, 1, 10)
	end
	S.ruler.name = tostring(S.ruler.name or S.id)
	S.ruler.title = tostring(S.ruler.title or "지도자")
	S.ruler.dyn = tostring(S.ruler.dyn or S.id)
	S.ruler.age = clamp(tonumber(S.ruler.age) or 35, 1, 110)
	S.bias = type(S.bias) == "table" and S.bias or {}
	S.focus = type(S.focus) == "table" and S.focus or {}
	S.dev = type(S.dev) == "table" and S.dev or {}
	for _, k in ipairs(N.FIELDS) do S.dev[k] = clamp(tonumber(S.dev[k]) or 25, 0, 100) end
	normalizeFocus(S.focus)
	S.culture = type(S.culture) == "table" and S.culture or {}
	S.culture.stock = math.max(0, tonumber(S.culture.stock) or 0)
	S.culture.level = clamp(math.floor(tonumber(S.culture.level) or 1), 1, #N.BRAND_NAMES)
	S.fin = type(S.fin) == "table" and S.fin or {}
	S.fin.income = math.max(1, tonumber(S.fin.income) or 1)
	S.fin.debt = math.max(0, tonumber(S.fin.debt) or 0)
	S.fin.treasury = tonumber(S.fin.treasury) or 0
	S.legit = clamp(tonumber(S.legit) or 0.6, 0.1, 1)
	S.prestige = math.max(0, tonumber(S.prestige) or 0)
	S.honor = clamp(tonumber(S.honor) or 0.7, 0, 1)
	S.colonyUntil = tonumber(S.colonyUntil) or 0
	S.ship = type(S.ship) == "table" and S.ship or {}
	for _, k in ipairs({ "fleet", "lossFrac", "lost", "danger", "prizes" }) do S.ship[k] = math.max(0, tonumber(S.ship[k]) or (if k == "fleet" then 10 else 0)) end
	S.ship.lossFrac, S.ship.danger = clamp(S.ship.lossFrac, 0, 1), clamp(S.ship.danger, 0, 1)
	S.spy = type(S.spy) == "table" and S.spy or {}
	S.spy.net = clamp(tonumber(S.spy.net) or 0.1, 0, 1)
	local pacts = {}
	if type(S.pacts) == "table" then
		for other, pact in pairs(S.pacts) do
			if type(other) == "string" and type(pact) == "table" and N.PACT_NAMES[pact.kind] then pacts[other] = { kind = pact.kind, untilDay = tonumber(pact.untilDay) or 0 } end
		end
	end
	S.pacts = pacts
	local talents = {}
	if type(S.talents) == "table" then
		for _, tal in ipairs(S.talents) do
			if type(tal) == "table" and N.TALENT[tal.kind] and #talents < 4 then
				table.insert(talents, { kind = tal.kind, name = tostring(tal.name or "?"), since = tonumber(tal.since) or st.startYear, untilDay = tonumber(tal.untilDay) or 0, fx = N.TALENT[tal.kind].fx })
			end
		end
	end
	S.talents = talents
	if type(S.merc) == "table" then S.merc = { ships = clamp(tonumber(S.merc.ships) or 0, 0, 4), untilDay = tonumber(S.merc.untilDay) or 0 } else S.merc = nil end
	if type(S.crisis) ~= "table" or not N.CRISIS[S.crisis.kind] then S.crisis = nil else S.crisis.untilDay = tonumber(S.crisis.untilDay) or 0 end
	if type(S.tech) ~= "table" or type(S.tech.known) ~= "table" then
		initTech(st, S)
	end
	local known, count = {}, 0
	for id, y in pairs(S.tech.known) do
		if N.TECH_BY_ID[id] then known[id] = math.floor(tonumber(y) or st.startYear); count += 1 end
	end
	S.tech.known, S.tech.count = known, count
	S.tech.prog = math.max(0, tonumber(S.tech.prog) or 0)
	if S.tech.cur ~= nil and (type(S.tech.cur) ~= "string" or not N.TECH_BY_ID[S.tech.cur]) then S.tech.cur = nil end
	recomputeMods(S)
	if type(S.tribute) ~= "table" or type(S.tribute.to) ~= "string" then S.tribute = nil else S.tribute.untilDay = tonumber(S.tribute.untilDay) or 0 end
	if type(S.fam) ~= "string" or not N.FAMILIES[S.fam] then S.fam = nil end
	S.stab = clamp(tonumber(S.stab) or 0.5, 0, 1)
	S.soc = type(S.soc) == "table" and S.soc or {}
	S.soc.unrest = clamp(tonumber(S.soc.unrest) or 0.1, 0, 1)
	S.soc.literacy = clamp(tonumber(S.soc.literacy) or 0.2, 0, 1)
	S.soc.urban = clamp(tonumber(S.soc.urban) or 0, 0, 1)
	S.soc.lastPop = math.max(0, tonumber(S.soc.lastPop) or 0)
	S.res = type(S.res) == "table" and S.res or emptyRes()
	for _, k in ipairs(N.RES_KEYS) do S.res[k] = math.max(0, tonumber(S.res[k]) or 0) end
	S.cap = type(S.cap) == "table" and S.cap or {}
	S.forces = type(S.forces) == "table" and S.forces or {}
	for _, k in ipairs(N.ARMY_KEYS) do S.forces[k] = math.max(0, tonumber(S.forces[k]) or 0) end
	for _, k in ipairs(N.NAVY_KEYS) do S.forces[k] = math.max(0, tonumber(S.forces[k]) or 0) end
	S.forces.doctrine = clamp(tonumber(S.forces.doctrine) or 0, 0, 1)
	S.power = math.max(0, tonumber(S.power) or 0)
	S.armyPower = math.max(0, tonumber(S.armyPower) or 0)
	S.navyPower = math.max(0, tonumber(S.navyPower) or 0)
	S.standing = math.max(0, tonumber(S.standing) or 0)
	S.rel = type(S.rel) == "table" and S.rel or {}
	S.allies = type(S.allies) == "table" and S.allies or {}
	S.regentUntil = tonumber(S.regentUntil) or 0
	S.civilUntil = tonumber(S.civilUntil) or 0
	if type(S.war) ~= "table" or type(S.war.foe) ~= "string" then
		S.war = nil
	else
		S.war.months = math.max(0, tonumber(S.war.months) or 0)
	end
	S.metrics = type(S.metrics) == "table" and S.metrics or { pop = 0, gdp = 0, trade = 0, towns = 0, stab = 0.5, tech = 1, treasury = 0, stage = 1 }
end

function N.restore(w, snap)
	if type(snap) ~= "table" or snap.schema ~= N.SCHEMA or type(snap.states) ~= "table" then return false end
	local st = w.nations
	if not st then return false end
	local data = clean(snap, 0)
	if type(data) ~= "table" or type(data.states) ~= "table" then return false end
	if finite(data.day) then st.day = data.day end
	if type(data.liege) == "table" then
		for c, liege in pairs(data.liege) do
			if type(liege) == "string" then st.liege[c] = liege end
		end
		for c in pairs(st.liege) do
			if data.liege[c] == nil then st.liege[c] = nil end
		end
	end
	st.owner, st.ports, st.firsts = {}, {}, {}
	if type(data.hegemon) == "string" and data.states[data.hegemon] then st.hegemon = data.hegemon else st.hegemon = nil end
	if type(data.firsts) == "table" then
		for id, row in pairs(data.firsts) do
			if N.TECH_BY_ID[id] and type(row) == "table" and type(row.nation) == "string" then st.firsts[id] = { nation = row.nation, year = math.floor(tonumber(row.year) or st.startYear) } end
		end
	end
	if type(data.owner) == "table" then
		for pid, o in pairs(data.owner) do
			if type(pid) == "string" and type(o) == "string" and w.towns[pid] and data.states[o] then st.owner[pid] = o end
		end
	end
	if type(data.ports) == "table" then
		for pid, row in pairs(data.ports) do
			if type(pid) == "string" and w.towns[pid] and type(row) == "table" and N.FAMILIES[row.fam] then
				st.ports[pid] = { fam = row.fam, assim = clamp(tonumber(row.assim) or 1, 0, 1), unrest = clamp(tonumber(row.unrest) or 0.1, 0, 1) }
			end
		end
	end
	for id, row in pairs(data.states) do
		if type(row) == "table" then
			row.id = id
			st.states[id] = row
		end
	end
	for id, S in pairs(st.states) do
		if S.id == nil then S.id = id end
		repair(st, S)
	end
	if type(data.log) == "table" then
		st.log = {}
		for i, e in ipairs(data.log) do
			if i > N.LOG_MAX then break end
			if type(e) == "table" and type(e.text) == "string" then table.insert(st.log, e) end
		end
	end
	local empty = true
	for _, S in pairs(st.states) do
		if (S.power or 0) > 0 then empty = false break end
	end
	if empty then seedForces(st, w) end
	N.rank(st)
	return true
end

return N
