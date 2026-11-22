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
	}
	for _, k in ipairs(N.FIELDS) do S.dev[k] = 25 + (S.bias[k] or 0) * 60 end
	S.focus = targetFocus(S)
	return S
end

-- ───────── 초기화 ─────────
function N.init(w)
	local st = { schema = N.SCHEMA, seed = math.floor(w.seed or 1), day = w.day or 0, startYear = w.startYear or 1650,
		states = {}, liege = {}, log = {}, ranks = {}, adjacency = {} }
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
	return st
end

-- ───────── 월 단위 갱신 ─────────
local function aggregate(st, w)
	for _, S in pairs(st.states) do S.metrics = { pop = 0, gdp = 0, trade = 0, towns = 0, stab = 0, tech = 0, treasury = 0, stage = 0 } end
	for _, id in ipairs(w.order) do
		local t = w.towns[id]
		local owner = st.liege[t.country] or t.country
		local S = st.states[owner]
		if S then
			local m = S.metrics
			m.pop += t.pop or 0
			m.gdp += t.gdp or 0
			m.trade += (t.tradeOut or 0) + (t.tradeIn or 0)
			m.towns += 1
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
	logEvent(st, S.id, "succession", string.format("%s %s 교체 (%s → %s)", S.id, reason, old.name, new.name))
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
	local target = clamp(m.stab * 0.6 + S.legit * 0.3 + reg.stab + regent + civil + (S.war and -0.05 or 0.02), 0, 1)
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
	-- 재정: 전쟁과 행정이 약하면 빚이 늘고, 평시에는 갚는다
	local spend = S.fin.income * (0.75 + S.focus.mil * 0.6 + S.focus.navy * 0.3 + (S.war and 0.25 or 0))
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
	return (S.dev.mil * 0.6 + S.dev.navy * 0.4) * math.log(1 + S.metrics.pop) / 10 * (0.6 + S.stab * 0.4)
end

local function stepDiplomacy(st)
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
		-- 동맹: 관계가 충분히 좋고 공통의 적이 있을 때
		for other, v in pairs(S.rel) do
			if v > 45 and not S.allies[other] and st.states[other] and roll(st, id .. other .. "al") < 0.02 then
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
			if not foe or S.war.months > 6 + math.floor(roll(st, id .. "peace") * 14) or S.stab < 0.2 then
				logEvent(st, id, "peace", string.format("%s 와 %s 휴전", id, S.war.foe))
				if foe and foe.war and foe.war.foe == id then foe.war = nil end
				S.war = nil
			end
		elseif S.stab > 0.4 and st.day > 365 then
			local worst, worstV = nil, 0
			for other, v in pairs(S.rel) do
				if v < worstV and st.states[other] and not S.allies[other] and not st.states[other].war then worst, worstV = other, v end
			end
			if worst and worstV < -40 and militaryPower(S) > militaryPower(st.states[worst]) * 1.15
				and roll(st, id .. "warroll") < 0.03 * (N.REGIMES[S.regime].mods.mil or 1) then
				S.war = { foe = worst, months = 0 }
				st.states[worst].war = { foe = id, months = 0 }
				S.rel[worst] = clamp(S.rel[worst] - 20, -100, 100)
				st.states[worst].rel[id] = clamp((st.states[worst].rel[id] or 0) - 20, -100, 100)
				logEvent(st, id, "war", string.format("%s 가 %s 에 선전포고", id, worst))
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
		local score = (militaryPower(S) * 0.25 + S.dev.trade * math.log(1 + m.trade) / 12 * 0.25
			+ S.dev.sci * 0.15 + S.dev.culture * 0.15 + S.dev.learn * 0.1 + math.log(1 + m.pop) * 0.1)
		table.insert(rows, { id = id, score = score })
	end
	table.sort(rows, function(a, b) if a.score ~= b.score then return a.score > b.score end return a.id < b.id end)
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
	stepDiplomacy(st)
	stepVassals(st, w)
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
	}
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
		states = st.states, liege = st.liege, log = st.log,
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
	S.stab = clamp(tonumber(S.stab) or 0.5, 0, 1)
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
	N.rank(st)
	return true
end

return N
