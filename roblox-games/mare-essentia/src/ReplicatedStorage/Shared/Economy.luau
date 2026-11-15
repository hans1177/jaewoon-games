--!nonstrict
-- 마을 실물경제 시뮬레이션 (순수 로직, 가상 데이터).
-- 항구(마을)마다 인구·직업·생산·재고·가격이 있고, 하루 단위로 돈다.
--  · 식량: 농지(수확 체감) 한도 안에서 로지스틱(맬서스) 인구 성장, 흉작이면 굶어서 줄어든다.
--  · 가격: 초과수요 가격조정 (price *= 1 + k*(수요-공급)/(수요+공급)), 수요·생산은 가격에 탄력적.
--  · 무역: 중력모형 — 이웃 항구(질량/거리^γ 상위 N)끼리, 운송비를 넘는 가격차가 있으면 물량이 흐른다 (차익거래).
--  · 호황·불황: 세계 + 해역별 감쇠 진동자(확률 충격)로 수요·생산성이 오르내린다.
--  · 충격: 실제 역사 사건(전쟁·기근·역병·지진·거품)과 WorldEvents 를 shock 으로 넣는다.
--  · 발전도: 인구+번영도(1인당 GDP 이동평균)로 1~5단계. 단계가 마을 외형·주민 수·직업·생산시설을 정한다.
--  · 문명: 마을마다 기술 6분야(농업·공예·상업·항해·의료·통치)가 인구^0.5(케이머 식 아이디어 생산)로 쌓이고, 무역 이웃에게서 확산된다.
--  · 제도: 세금→국고→사회기반시설(자본) 투자, 안정도(굶주림·전쟁·불평등으로 하락) 낮으면 봉기, 실질임금 격차로 이주(중력 가중).
-- 연도·수치는 게임용 가상값이며 실제 사료와 다르다 (docs/CATALOG.md 의 출처 확인 방침과 같다).

local Data = require(script.Parent.Ports)
local Regions = require(script.Parent.Regions)

local E = {}

E.START_YEAR_HINT = 1650
E.TECH_FIELDS = { "agri", "craft", "commerce", "sea", "medicine", "gov" }
E.TECH_NAMES = { agri = "농업", craft = "공예", commerce = "상업", sea = "항해", medicine = "의료", gov = "통치" }
E.REGION_TECH = { europe = 1.0, w_africa = 0.8, new_world = 0.7, indian = 0.95, far_east = 1.0, pacific = 0.65 }
E.SEA_POWERS = { portugal = true, spain = true, netherlands = true, england = true, venice = true }
E.GRAIN = "grain"
E.GRAIN_PRICE = 10
E.TARGET_DAYS = 20 -- 재고가 이 일수치 수요일 때 가격이 안정
E.PRICE_K = 0.08
E.NEIGHBORS = 6
E.STAGE_POP = { 0, 1500, 5000, 15000, 40000, 250000 } -- 단계 진입 인구
E.STAGE_NAMES = { "촌락", "마을", "읍", "도시", "대도시", "메가시티" }

-- ───────── 난수 (결정적) ─────────
local function rnd(w)
	w.seed = (w.seed * 1103515245 + 12345) % 2147483648
	return w.seed / 2147483648
end
local function gauss(w)
	local u1, u2 = math.max(rnd(w), 1e-9), rnd(w)
	return math.sqrt(-2 * math.log(u1)) * math.cos(2 * math.pi * u2)
end
local function hash01(s)
	local h = 7
	for i = 1, #s do h = (h * 31 + string.byte(s, i)) % 100003 end
	return h / 100003
end

local function distKm(a, b)
	local r = math.rad
	local dlat, dlon = r(b.lat - a.lat), r(b.lon - a.lon)
	local x = math.sin(dlat / 2) ^ 2 + math.cos(r(a.lat)) * math.cos(r(b.lat)) * math.sin(dlon / 2) ^ 2
	return 6371 * 2 * math.asin(math.min(1, math.sqrt(x)))
end

-- ───────── 발전 단계 ─────────
function E.stageOfPop(pop)
	local s = 1
	for i, t in ipairs(E.STAGE_POP) do if pop >= t then s = i end end
	return s
end

local function jobShares(stage, t)
	-- 농민 비중은 발전할수록 줄고 수공업·상업·행정이 는다
	local farm = math.max(0.30, 0.62 - 0.065 * (stage - 1))
	local fish = (t.coastal and 0.07 or 0.0)
	local craft = 0.14 + 0.03 * (stage - 1)
	local merchant = 0.04 + 0.02 * (stage - 1)
	local sailor = t.shipyard and (0.05 + 0.01 * stage) or 0.03
	local guard = 0.03 + 0.005 * stage
	local official = 0.01 + 0.012 * (stage - 1)
	local clergy = 0.02 + 0.004 * stage
	local used = farm + fish + craft + merchant + sailor + guard + official + clergy
	local lab = math.max(0.04, 1 - used)
	local tot = used + lab -- 합이 1이 되도록 정규화
	return { farmer = farm / tot, fisher = fish / tot, craftsman = craft / tot, merchant = merchant / tot, sailor = sailor / tot, guard = guard / tot, official = official / tot, clergy = clergy / tot, laborer = lab / tot }
end
E.JOB_ORDER = { "farmer", "fisher", "craftsman", "merchant", "sailor", "guard", "official", "clergy", "laborer" }
E.JOB_NAMES = { farmer = "농부", fisher = "어부", craftsman = "장인", merchant = "상인", sailor = "선원", guard = "경비병", official = "관리", clergy = "성직자", laborer = "일꾼" }

-- ───────── 생성 ─────────
local function newTown(p, w)
	local h = hash01(p.id)
	local lat = math.abs(p.lat)
	local fert = (lat < 25 and 1.12) or (lat < 50 and 1.0) or (lat < 58 and 0.88) or 0.72
	fert = fert * (0.92 + 0.16 * h)
	local nGoods = #p.produces
	local pop0 = 900 + 650 * nGoods + (p.shipyard and 2200 or 0) + math.floor(1800 * h)
	local t = {
		id = p.id, name = p.name, country = p.country, region = Regions.of(p).id,
		lat = p.lat, lon = p.lon, shipyard = p.shipyard,
		coastal = true, fert = fert,
		pop = pop0, land = pop0 * 0.62 * fert * 1.25, -- 농지가 먹여 살리는 농민 수
		stage = E.stageOfPop(pop0), prosperity = 1, refGdp = 0,
		grain = 0, stock = {}, price = {}, out = {}, dem = {},
		gdp = 0, tradeIn = 0, tradeOut = 0, deaths = 0, births = 0,
		fx = { food = 1, prod = 1, trade = 1, demand = 1, mort = 0 },
		neighbors = {}, goods = {},
		tech = {}, infra = 0, infraRef = 0, treasury = 0, stability = 0.7, wage = 1, wageRef = 1,
		sector = { agri = 0, industry = 0, trade = 0, service = 0 }, migIn = 0, migOut = 0, unrestCd = 0, civ = 0,
	}
	local yf = 1 + (p.lat and (E.START_YEAR_HINT - 1500) / 400 or 0)
	local rmod = E.REGION_TECH[t.region] or 0.9
	if t.country == "china" or t.country == "japan" or t.country == "korea" then rmod = 1.05 end
	for _, f in ipairs(E.TECH_FIELDS) do
		t.tech[f] = yf * rmod * (0.9 + 0.2 * hash01(p.id .. f))
	end
	if E.SEA_POWERS[t.country] then t.tech.sea += 0.15 end
	t.infra = pop0 * 0.5
	t.infraRef = 0.5
	local set = { [E.GRAIN] = true }
	for _, g in ipairs(p.produces) do if Data.Goods[g] then set[g] = true end end
	for _, g in ipairs(p.demands) do if Data.Goods[g] then set[g] = true end end
	for g in pairs(set) do table.insert(t.goods, g) end
	table.sort(t.goods)
	t.produces, t.demands, t.nDem = {}, {}, #p.demands
	for _, g in ipairs(p.produces) do t.produces[g] = true end
	for _, g in ipairs(p.demands) do t.demands[g] = true end
	E.initBuildings(t)
	return t
end

-- 사회기반시설(인구 대비 자본)이 생산성에 주는 효과: 0.9~1.2
function E.infraFactor(t)
	local idx = t.infra / math.max(t.pop * t.infraRef, 1)
	return 0.9 + 0.3 * math.clamp((idx - 0.5) / 1.5, 0, 1)
end

-- ───────── 건축물 (심시티식): 주거·생산·소비(서비스) 시설이 인구에 맞춰 짓고 허물어진다 ─────────
-- jobs: 시설 하나가 쓰는 일꾼 수 / serves: 시설 하나가 감당하는 인구(서비스) / cost: 건설비(코인) / minStage: 열리는 단계
E.BUILDINGS = {
	{ id = "house", name = "주택", cost = 30 },
	{ id = "farm", name = "농장", jobs = 16, cost = 40 },
	{ id = "workshop", name = "공방", jobs = 10, cost = 60 },
	{ id = "dock", name = "부두", jobs = 14, cost = 120 },
	{ id = "market", name = "시장", jobs = 8, serves = 600, cost = 80, minStage = 2 },
	{ id = "warehouse", name = "창고", jobs = 6, serves = 900, cost = 70, minStage = 2 },
	{ id = "tavern", name = "선술집", jobs = 5, serves = 400, cost = 50 },
	{ id = "church", name = "교회", jobs = 4, serves = 800, cost = 90 },
	{ id = "guard", name = "경비소", jobs = 6, cost = 60 },
	{ id = "school", name = "학교", jobs = 3, serves = 1500, cost = 100, minStage = 3 },
	{ id = "hall", name = "관청", jobs = 6, serves = 3000, cost = 200, minStage = 3 },
}
E.BUILD_BY_ID = {}
for _, b in ipairs(E.BUILDINGS) do E.BUILD_BY_ID[b.id] = b end

-- 집 하나가 받는 주민 수: 발전할수록 큰 집
function E.perHouse(stage) return 4 + 1.2 * stage end

-- 지금 인구가 필요로 하는 시설 수
function E.buildingTargets(t)
	local sh = jobShares(t.stage, t)
	local n = 0
	for _ in pairs(t.produces) do n += 1 end
	local pop = t.pop
	local tg = {
		house = pop / E.perHouse(t.stage) * 1.05,
		farm = pop * sh.farmer / 16,
		workshop = pop * (sh.craftsman + sh.laborer * 0.5) / 10,
		dock = t.coastal and (pop * (sh.sailor + sh.fisher) / 14) or 0,
		guard = pop * sh.guard / 6,
	}
	for _, b in ipairs(E.BUILDINGS) do
		if b.serves then
			tg[b.id] = (t.stage >= (b.minStage or 1)) and (pop / b.serves) or 0
		end
	end
	return tg
end

function E.initBuildings(t)
	t.bld = {}
	for id, v in pairs(E.buildingTargets(t)) do t.bld[id] = v end
	t.cov = {}
	t.housingRatio, t.unemp, t.buildSpend = 1, 0.1, 0
end

-- 수용 가능 인구(주거), 일자리 수
function E.housingCap(t) return t.bld.house * E.perHouse(t.stage) end
function E.jobsCap(t)
	local j = 0
	for _, b in ipairs(E.BUILDINGS) do
		if b.jobs then j += t.bld[b.id] * b.jobs end
	end
	return j
end

-- 하루 건설: 예산 안에서 모자란 시설부터(주거→생산→서비스) 짓고, 남아도는 시설은 서서히 방치된다.
function E.stepBuildings(t, budget)
	local tg = E.buildingTargets(t)
	local spent = 0
	for _, b in ipairs(E.BUILDINGS) do
		local have, want = t.bld[b.id], tg[b.id] or 0
		if have < want then
			local n = math.min(want - have, math.max(0, budget - spent) / b.cost, math.max(0.05, want * 0.01))
			if n > 0 then t.bld[b.id] = have + n; spent += n * b.cost end
		elseif have > want * 1.25 + 0.5 then
			t.bld[b.id] = have - have * 0.002
		end
		-- 서비스 보급률 (시설/필요): 1 이상이면 충분
		t.cov[b.id] = if want > 0 then math.min(1.5, t.bld[b.id] / want) else 1
	end
	t.buildSpend = spent
	return spent
end

local function basePrice(g)
	if g == E.GRAIN then return E.GRAIN_PRICE end
	return Data.Goods[g].basePrice
end

-- 하루치 수요(개수). 가격이 비싸면 줄어든다(탄력 0.6).
local function demandOf(t, g, price)
	local per
	if g == E.GRAIN then per = 1.0
	elseif t.demands[g] then per = 0.0035 / math.max(1, t.nDem)
	elseif t.produces[g] then per = 0.0003
	else per = 0.0001 end
	local wealth = 0.7 + 0.3 * math.clamp(t.prosperity, 0.4, 1.8)
	local el = (basePrice(g) / math.max(price, 1)) ^ 0.6
	if g == E.GRAIN then return t.pop * per * math.clamp(el, 0.85, 1.05) * t.fx.demand end
	return t.pop * per * wealth * el * t.fx.demand
end

-- 하루치 생산. 가격이 높으면 일꾼이 몰린다(탄력 0.5).
local function productionOf(t, g, price, w)
	local sh = jobShares(t.stage, t)
	local lvl = w.cycle.lvl[t.region] or 0
	local mult = t.fx.prod * (1 + 0.1 * lvl)
	if g == E.GRAIN then
		local farmers = math.min(t.pop * sh.farmer, t.bld.farm * 16)
		local used = math.min(farmers, t.land) + 0.25 * math.max(0, farmers - t.land)
		local yield = 1.5 * (1 + 0.12 * (t.stage - 1)) * (t.tech.agri ^ 0.6) * E.infraFactor(t)
		local fish = t.pop * sh.fisher * 1.5
		return (used * yield + fish) * t.fx.food * (1 + 0.05 * lvl)
	end
	if not t.produces[g] then return 0 end
	local n = 0
	for _ in pairs(t.produces) do n += 1 end
	local workers = math.min(t.pop * (sh.craftsman + sh.laborer * 0.5), t.bld.workshop * 10) / math.max(1, n)
	local el = math.clamp((price / basePrice(g)) ^ 0.5, 0.5, 1.6)
	return workers * 0.02 * el * mult * (1 + 0.1 * (t.stage - 1)) * (t.tech.craft ^ 0.6) * E.infraFactor(t) * (1 + 0.1 * (t.stability - 0.5))
end

function E.newWorld(opts)
	opts = opts or {}
	E.START_YEAR_HINT = opts.year or 1650
	local w = {
		seed = opts.seed or 12345, day = 0, startYear = opts.year or 1650,
		towns = {}, order = {}, shocks = {}, fired = {}, log = {},
		cycle = { x = 0, v = 0, lvl = {}, reg = {} },
	}
	for _, r in ipairs(Regions.List) do w.cycle.reg[r.id] = { x = 0, v = 0 } end
	for id, p in pairs(Data.Ports) do
		w.towns[id] = newTown(p, w)
		table.insert(w.order, id)
	end
	table.sort(w.order)
	-- 중력모형 이웃: 질량/거리^1.5 가 큰 순
	for _, id in ipairs(w.order) do
		local a = w.towns[id]
		local cand = {}
		for _, jd in ipairs(w.order) do
			if jd ~= id then
				local b = w.towns[jd]
				local d = math.max(60, distKm(a, b))
				table.insert(cand, { id = jd, d = d, score = math.sqrt(b.pop) / (d ^ 1.5) })
			end
		end
		table.sort(cand, function(x, y) if x.score ~= y.score then return x.score > y.score end return x.id < y.id end)
		for i = 1, math.min(E.NEIGHBORS, #cand) do table.insert(a.neighbors, cand[i]) end
	end
	-- 초기 가격·재고·기준 GDP
	for _, id in ipairs(w.order) do
		local t = w.towns[id]
		for _, g in ipairs(t.goods) do
			local m = 1.0
			if t.produces[g] then m = Data.Goods[g] and 0.8 or 1 elseif t.demands[g] then m = 1.2 end
			t.price[g] = basePrice(g) * m
			local prod = productionOf(t, g, t.price[g], w)
			local dem = demandOf(t, g, t.price[g])
			t.stock[g] = math.max(dem, prod) * (t.produces[g] and 30 or 15)
		end
		t.grain = t.stock[E.GRAIN]
		local gdp = 0
		for _, g in ipairs(t.goods) do gdp += productionOf(t, g, t.price[g], w) * t.price[g] end
		local real0 = 0
		for _, g in ipairs(t.goods) do real0 += productionOf(t, g, basePrice(g), w) * basePrice(g) end
		t.refGdp = math.max(1, real0 / t.pop)
		t.wageRef = t.refGdp / (E.GRAIN_PRICE)
		t.treasury = gdp * 20
	end
	for _, h in ipairs(E.History) do
		if h.year <= w.startYear and w.startYear < h.year + h.years then E.addShock(w, E.shockFromHistory(h, (h.year + h.years - w.startYear) * 365)); w.fired[h.id] = true end
	end
	return w
end

-- ───────── 충격 ─────────
-- 역사 사건 (실제 사건에서 가져온 가상 수치). regions/countries/ports 중 하나로 범위를 지정한다.
E.History = {
	{ id = "smallpox_america", year = 1520, years = 3, title = "신대륙 천연두", regions = { "new_world" }, mort = 0.0014, demand = 0.8, prod = 0.8 },
	{ id = "armada_1588", year = 1588, years = 1, title = "무적함대 패배와 해상 긴장", regions = { "europe" }, trade = 0.85 },
	{ id = "famine_1590s", year = 1594, years = 4, title = "1590년대 유럽 대기근", regions = { "europe" }, food = 0.8, mort = 0.0002 },
	{ id = "little_ice_age", year = 1600, years = 100, title = "소빙기", regions = { "europe", "far_east" }, food = 0.94 },
	{ id = "thirty_years", year = 1618, years = 30, title = "30년 전쟁", countries = { "germany" }, food = 0.75, prod = 0.75, mort = 0.0003, trade = 0.7 },
	{ id = "plague_italy", year = 1630, years = 2, title = "이탈리아 역병", countries = { "venice", "tuscany", "sicily" }, mort = 0.0012, trade = 0.6 },
	{ id = "tulip_up", year = 1636, years = 1, title = "튤립 열풍", countries = { "netherlands" }, demand = 1.3 },
	{ id = "tulip_down", year = 1637, years = 3, title = "튤립 거품 붕괴", countries = { "netherlands" }, demand = 0.85 },
	{ id = "london_plague", year = 1665, years = 1, title = "런던 대역병", ports = { "london" }, mort = 0.0025, trade = 0.6 },
	{ id = "famine_1693", year = 1693, years = 2, title = "1693~94 대기근", countries = { "france", "scotland" }, food = 0.7, mort = 0.0005 },
	{ id = "northern_war", year = 1700, years = 21, title = "대북방전쟁", countries = { "sweden", "norway" }, food = 0.9, trade = 0.8 },
	{ id = "great_frost", year = 1709, years = 1, title = "대혹한", regions = { "europe" }, food = 0.75 },
	{ id = "bubble_up", year = 1719, years = 2, title = "남해·미시시피 거품", countries = { "england", "france" }, demand = 1.3 },
	{ id = "bubble_down", year = 1721, years = 3, title = "거품 붕괴", countries = { "england", "france" }, demand = 0.75, prod = 0.95 },
	{ id = "famine_1740", year = 1740, years = 2, title = "1740년 혹한과 흉작", regions = { "europe" }, food = 0.8, mort = 0.0002 },
	{ id = "lisbon_quake", year = 1755, years = 1, title = "리스본 대지진", ports = { "lisbon" }, mort = 0.002, prod = 0.5, trade = 0.6 },
	{ id = "lisbon_rebuild", year = 1756, years = 2, title = "리스본 재건 특수", ports = { "lisbon" }, demand = 1.3 },
	{ id = "seven_years", year = 1756, years = 7, title = "7년 전쟁", regions = { "europe", "new_world", "indian" }, trade = 0.8 },
	{ id = "bengal_famine", year = 1770, years = 2, title = "벵골 대기근", regions = { "indian" }, food = 0.7, mort = 0.0008 },
	{ id = "tenmei_famine", year = 1783, years = 5, title = "덴메이 대기근", countries = { "japan" }, food = 0.6, mort = 0.0005 },
}

-- 이벤트 정의 → shock. days 만큼 지속.
function E.shockFromHistory(h, days)
	return { id = h.id, title = h.title, regions = h.regions, countries = h.countries, ports = h.ports,
		food = h.food or 1, prod = h.prod or 1, trade = h.trade or 1, demand = h.demand or 1, mort = h.mort or 0,
		days = days or h.years * 365 }
end

-- WorldEvents/HistoryEvents 의 tag 를 경제 충격으로 바꾼다. regionId 는 일어난 해역.
local TAG_FX = {
	["기근"] = { food = 0.6, mort = 0.0006 },
	["전염병"] = { mort = 0.0015, trade = 0.8, demand = 0.9 },
	["자연재해"] = { food = 0.8, trade = 0.85 },
	["화재"] = { prod = 0.85 },
	["전쟁"] = { trade = 0.6, prod = 0.9, food = 0.9 },
	["해적"] = { trade = 0.75 },
	["정치"] = { trade = 0.8 },
	["행운"] = { demand = 1.2, prod = 1.1 },
	["호재"] = { demand = 1.2, prod = 1.1 },
}
function E.shockFromEvent(ev, regionId, days)
	local fx = TAG_FX[ev.tag or ""] or {}
	return { id = ev.id, title = ev.title or ev.id, regions = { regionId }, ports = ev.port and { ev.port } or nil,
		food = fx.food or 1, prod = fx.prod or 1, trade = fx.trade or 1, demand = fx.demand or 1, mort = fx.mort or 0,
		days = days or (ev.days or 50) }
end

function E.addShock(w, s)
	s.until_ = w.day + (s.days or 60)
	table.insert(w.shocks, s)
	table.insert(w.log, { day = w.day, id = s.id, title = s.title })
end

local function applies(s, t)
	if s.ports then return table.find(s.ports, t.id) ~= nil end
	if s.countries then return table.find(s.countries, t.country) ~= nil end
	if s.regions then return table.find(s.regions, t.region) ~= nil end
	return true
end

-- ───────── 하루 진행 ─────────
function E.stepCycle(w)
	local function osc(o, period, sigma)
		local om = 2 * math.pi / (period * 365)
		local z = 0.06
		o.v = o.v + (-om * om * o.x - 2 * z * om * o.v) + math.sqrt(4 * z * om ^ 3) * sigma * gauss(w)
		o.x = math.clamp(o.x + o.v, -1, 1)
	end
	osc(w.cycle, 9, 0.45)
	for id, o in pairs(w.cycle.reg) do
		osc(o, 6, 0.4)
		w.cycle.lvl[id] = math.clamp(0.6 * w.cycle.x + 0.4 * o.x, -1, 1)
	end
end

function E.year(w) return w.startYear + w.day / 365 end

function E.step(w)
	w.day += 1
	-- 연도 사건
	local y = math.floor(E.year(w))
	for _, h in ipairs(E.History) do
		if not w.fired[h.id] and y >= h.year then
			w.fired[h.id] = true
			if y < h.year + h.years then E.addShock(w, E.shockFromHistory(h)) end
		end
	end
	for i = #w.shocks, 1, -1 do if w.shocks[i].until_ <= w.day then table.remove(w.shocks, i) end end
	E.stepCycle(w)
	-- 마을별 충격 효과
	for _, id in ipairs(w.order) do
		local t = w.towns[id]
		local fx = { food = 1, prod = 1, trade = 1, demand = 1, mort = 0 }
		for _, s in ipairs(w.shocks) do
			if applies(s, t) then
				fx.food *= s.food; fx.prod *= s.prod; fx.trade *= s.trade; fx.demand *= s.demand; fx.mort += s.mort
			end
		end
		t.fx = fx
		t.tradeIn, t.tradeOut = 0, 0
	end
	-- 생산·소비·가격
	for _, id in ipairs(w.order) do
		local t = w.towns[id]
		local gdp, real = 0, 0
		local grainProd, grainCons = 0, 0
		for _, g in ipairs(t.goods) do
			local p = t.price[g]
			local prod = productionOf(t, g, p, w)
			local dem = demandOf(t, g, p)
			local have = t.stock[g] + prod
			local sold = math.min(have, dem)
			local stock = have - sold
			stock = stock * (g == E.GRAIN and 0.998 or 0.9995) -- 부패/손실
			stock = math.min(stock, math.max(dem, prod) * 90)
			t.stock[g] = stock
			t.out[g], t.dem[g] = prod, dem
			gdp += prod * p
			real += prod * basePrice(g)
			if g == E.GRAIN then grainProd, grainCons = prod, dem end
			-- 초과수요 가격조정: 재고 일수 대비
			local cover = stock / math.max(dem * E.TARGET_DAYS, 0.05)
			local excess = math.clamp(1 - cover, -1, 1)
			local np = p * (1 + E.PRICE_K * excess * 0.5)
			t.price[g] = math.clamp(np, basePrice(g) * 0.4, basePrice(g) * 3.0)
		end
		t.grain = t.stock[E.GRAIN]
		-- 인구: 로지스틱(식량 균형) + 기아 + 역병
		local bal = (grainProd + 0.02 * t.grain) / math.max(grainCons, 1)
		local r = 0.006 * math.clamp((bal - 1) / 0.3, -1, 1) / 365
		if r > 0 then r = r * math.clamp(t.housingRatio, 0, 1) end
		if bal >= 1 then r = r * (0.7 + 0.3 * math.clamp(t.prosperity, 0.4, 1.5)) end
		local starve = 0
		if t.grain < grainCons * 2 and grainProd < grainCons then
			starve = 0.002 * (1 - grainProd / math.max(grainCons, 1))
		end
		local d = t.pop * (r * (1 + 0.1 * (t.tech.medicine - 1)) - starve - t.fx.mort / (t.tech.medicine ^ 0.5) - (t.stability < 0.3 and 0.0002 or 0) - (t.housingRatio < 0.85 and 0.00005 or 0))
		t.pop = math.max(50, t.pop + d)
		if d >= 0 then t.births += d else t.deaths += -d end
		-- 번영도: 1인당 GDP 이동평균 (기준 대비)
		t.gdp = gdp
		local rel = (real / math.max(t.pop, 1)) / t.refGdp
		t.prosperity = t.prosperity + (rel - t.prosperity) * 0.01
		E.stepCivilization(w, t, gdp, grainProd, grainCons)
		-- 발전 단계 (오를 땐 번영도 0.9 이상, 내릴 땐 85% 인구 아래)
		local s = t.stage
		if s < #E.STAGE_POP and t.pop >= E.STAGE_POP[s + 1] and t.prosperity >= 0.9 then t.stage = s + 1
		elseif s > 1 and t.pop < E.STAGE_POP[s] * 0.85 then t.stage = s - 1 end
	end
	if w.day % 5 == 0 then E.stepMigration(w) end
	-- 무역 (중력모형 + 차익거래)
	for _, id in ipairs(w.order) do
		local a = w.towns[id]
		for _, nb in ipairs(a.neighbors) do
			local b = w.towns[nb.id]
			local tradeFx = math.min(a.fx.trade, b.fx.trade)
			local cost = (0.04 + nb.d / 20000 * 0.5) / math.max(tradeFx, 0.3) / (a.tech.sea ^ 0.3)
			local cap = 0.015 * math.sqrt(a.pop * b.pop) / ((1 + nb.d / 1500) ^ 1.2) * tradeFx * (a.tech.commerce ^ 0.5) * (0.7 + 0.3 * math.min(1, a.cov.market or 1))
			for _, g in ipairs(a.goods) do
				local pb = b.price[g]
				if pb then
					local pa = a.price[g]
					local gap = pb / pa - 1 - cost
					if gap > 0 then
						local reserve = a.dem[g] * 8
						local q = math.min(math.max(0, a.stock[g] - reserve), cap * math.min(1, gap * 2))
						if q > 0.001 then
							a.stock[g] -= q
							b.stock[g] += q * 0.97
							local v = q * pa
							a.tradeOut += v
							b.tradeIn += v
						end
					end
				end
			end
		end
	end
end

-- 마을 하루치 문명·제도: 세금·투자·안정도·기술·부문별 GDP·봉기
function E.stepCivilization(w, t, gdp, grainProd, grainCons)
	-- 부문별 GDP
	local grainV = grainProd * t.price[E.GRAIN]
	t.sector.agri = grainV
	t.sector.industry = gdp - grainV
	t.sector.trade = t.tradeOut * 0.12
	t.sector.service = gdp * 0.06 * t.stage
	-- 세금 → 국고 → 투자 (사회기반시설·곡물 비축·치안)
	local taxRate = 0.08 + 0.02 * (t.tech.gov - 1)
	taxRate = taxRate * (0.8 + 0.2 * math.min(1, t.cov.hall or 1))
	local tax = math.clamp(taxRate, 0.05, 0.2) * (gdp + t.sector.trade)
	t.treasury += tax
	-- 건설: 세수의 절반을 건축에 쓴다 (국고가 비면 못 짓는다)
	local bspend = E.stepBuildings(t, math.min(t.treasury, tax * 0.5))
	t.treasury -= bspend
	t.housingRatio = E.housingCap(t) / math.max(t.pop, 1)
	t.unemp = math.clamp(1 - E.jobsCap(t) / math.max(t.pop * 0.6, 1), 0, 0.6)
	local spend = math.min(t.treasury, tax * 0.9)
	t.treasury -= spend
	t.infra = t.infra * 0.9997 + spend * 0.6 / 40 -- 시설 1단위 = 40코인
	if t.grain < grainCons * 10 then
		local buy = math.min(spend * 0.3 / t.price[E.GRAIN], grainCons * 2)
		t.stock[E.GRAIN] += buy
	end
	-- 안정도: 굶주림·전쟁·불황에 내리고, 풍요·번영에 오른다
	local ds = 0
	if grainProd < grainCons and t.grain < grainCons * 5 then ds -= 0.004 end
	if t.fx.trade < 0.9 then ds -= 0.001 end
	local target = math.clamp(0.7 + 0.3 * (t.prosperity - 1), 0.1, 0.95)
	ds += (target - t.stability) * 0.003
	ds -= 0.0025 * math.max(0, t.unemp - 0.15) + 0.002 * math.max(0, 0.9 - t.housingRatio)
	ds += 0.0006 * (math.min(1, t.cov.church or 1) + math.min(1, t.cov.guard or 1) + math.min(1, t.cov.tavern or 1) - 2.4)
	t.stability = math.clamp(t.stability + ds, 0, 1)
	t.unrestCd = math.max(0, t.unrestCd - 1)
	if t.stability < 0.25 and t.unrestCd == 0 then
		t.unrestCd = 400
		E.addShock(w, { id = "unrest_" .. t.id, title = t.name .. " 민란", ports = { t.id }, food = 1, prod = 0.7, trade = 0.7, demand = 0.9, mort = 0.0002, days = 60 })
		t.stability = 0.4
	end
	-- 실질임금: 1인당 GDP / 곡물 값
	t.wage = (gdp / math.max(t.pop, 1)) / t.price[E.GRAIN] / t.wageRef
	-- 기술: 아이디어 생산 ~ sqrt(인구) / 기술^0.6 (케이머), 안정도·교육(통치)에 비례
	local open = 1 + math.min(1, (t.tradeIn + t.tradeOut) / math.max(gdp, 1))
	local base = (0.7 + 0.3 * math.min(1, t.cov.school or 1)) * 0.000002 * math.sqrt(t.pop / 1000) * open * (0.5 + t.stability)
	for _, f in ipairs(E.TECH_FIELDS) do
		local focus = 1
		if f == "agri" then focus = grainCons > grainProd and 1.6 or 1
		elseif f == "medicine" then focus = t.fx.mort > 0 and 2 or 1
		elseif f == "sea" then focus = t.shipyard and 1.5 or 1 end
		t.tech[f] += base * focus / (t.tech[f] ^ 0.6)
	end
	t.civ = E.civScore(t)
end

-- 이웃 확산(기술 따라잡기) + 이주(실질임금·안정도 격차, 중력 가중)
function E.stepMigration(w)
	local moves = {}
	for _, id in ipairs(w.order) do
		local a = w.towns[id]
		a.migIn, a.migOut = 0, 0
	end
	for _, id in ipairs(w.order) do
		local a = w.towns[id]
		local attA = a.wage * (0.5 + a.stability)
		for _, nb in ipairs(a.neighbors) do
			local b = w.towns[nb.id]
			-- 기술 확산: 교역량이 클수록 빠르다
			local flow = math.min(1, (a.tradeIn + b.tradeOut) / math.max(a.gdp, 1))
			for _, f in ipairs(E.TECH_FIELDS) do
				if b.tech[f] > a.tech[f] then a.tech[f] += (b.tech[f] - a.tech[f]) * 0.0007 * (0.3 + flow) end
			end
			-- 이주: 더 살기 좋은 가까운 이웃으로
			local attB = b.wage * (0.5 + b.stability)
			local diff = attB / math.max(attA, 0.05) - 1
			if diff > 0.1 and nb.d < 1500 then
				local m = math.min(0.004, 0.0008 * diff) * a.pop / (1 + nb.d / 400) * (1 + 0)
				table.insert(moves, { a, b, m })
			end
		end
	end
	for _, mv in ipairs(moves) do
		local a, b, m = mv[1], mv[2], mv[3]
		m = math.min(m, a.pop * 0.02)
		a.pop -= m; b.pop += m * 0.95
		a.migOut += m; b.migIn += m * 0.95
	end
end

-- 문명 점수(0~): 규모·기술·시설·안정
function E.civScore(t)
	local techAvg = 0
	for _, f in ipairs(E.TECH_FIELDS) do techAvg += t.tech[f] end
	techAvg /= #E.TECH_FIELDS
	return (math.log(t.pop, 10) - 2) * 0.8 + techAvg * 1.5 + E.infraFactor(t) + t.stability
end

function E.run(w, days) for _ = 1, days do E.step(w) end end

-- ───────── 조회 ─────────
-- 마을 NPC 직업 인원 (인구 → 직업별 명수)
function E.jobs(t)
	local sh = jobShares(t.stage, t)
	local out, left = {}, math.floor(t.pop)
	for _, j in ipairs(E.JOB_ORDER) do
		local n = math.floor(t.pop * sh[j] + 0.5)
		out[j] = n; left -= n
	end
	out.laborer = math.max(0, out.laborer + left)
	return out
end

-- i 번째 NPC 의 직업 (결정적, 직업 비율대로 배분)
function E.npcJob(t, i, count)
	local sh = jobShares(t.stage, t)
	local x = ((i - 0.5) / math.max(1, count))
	local acc = 0
	for _, j in ipairs(E.JOB_ORDER) do
		acc += sh[j]
		if x <= acc then return j end
	end
	return "laborer"
end

-- 생산시설: 발전 단계별로 열린다.
function E.facilities(t)
	local f = { "farm" }
	if t.coastal then table.insert(f, "dock") end
	for g in pairs(t.produces) do table.insert(f, "workshop:" .. g) end
	table.sort(f)
	if t.stage >= 2 then table.insert(f, "market") end
	if t.stage >= 3 then table.insert(f, "warehouse") end
	if t.shipyard and t.stage >= 3 then table.insert(f, "shipyard") end
	if t.stage >= 4 then table.insert(f, "guildhall") end
	if t.stage >= 5 then table.insert(f, "exchange") end
	return f
end

-- 마을 외형: 보이는 주민 수와 건물 크기
-- 구역: 큰 도시일수록 기능별로 나뉜다. 인구·집 수가 구역별로 배분된다(통계만, 인스턴스 아님).
local DISTRICTS = {
	{ id = "home", name = "주거구", share = 0.55, minStage = 1 },
	{ id = "market", name = "시장구", share = 0.12, minStage = 2 },
	{ id = "harbor", name = "항만구", share = 0.12, minStage = 2 },
	{ id = "craft", name = "공방구", share = 0.13, minStage = 3 },
	{ id = "civic", name = "관청구", share = 0.05, minStage = 4 },
	{ id = "slum", name = "빈민가", share = 0.03, minStage = 4 },
}
function E.districts(t)
	local list, total = {}, 0
	for _, d in ipairs(DISTRICTS) do
		if t.stage >= d.minStage then table.insert(list, d); total += d.share end
	end
	local out = {}
	local slump = math.clamp((1 - t.prosperity) * 0.5, 0, 0.15) -- 불황이면 빈민가가 커진다
	for _, d in ipairs(list) do
		local sh = d.share / total
		if d.id == "slum" then sh += slump elseif d.id == "home" then sh -= slump end
		table.insert(out, { id = d.id, name = d.name, pop = math.floor(t.pop * sh), houses = math.floor(t.bld.house * sh + 0.5) })
	end
	return out
end

function E.visual(t)
	-- 보이는 주민은 대표(표본)만: 인구가 커질수록 로그로 늘어 최대 60명. 한 명이 perNpc 명을 대표한다.
	local residents = math.clamp(math.floor(6 + 14 * math.log(math.max(t.pop, 300) / 300, 10) * 1.6), 6, 60)
	local scale = 0.8 + 0.08 * t.stage + 0.1 * math.clamp(t.prosperity - 1, -0.5, 0.5)
	return { stage = t.stage, name = E.STAGE_NAMES[t.stage], residents = residents, perNpc = math.floor(t.pop / residents), districts = E.districts(t), buildingScale = scale,
		houses = math.floor(t.bld.house + 0.5), mood = t.prosperity >= 1.1 and "boom" or (t.prosperity < 0.8 and "slump" or "steady") }
end

-- 집계: kind = "world" | "region" | "country" | "town"
function E.aggregate(w, kind, id)
	local a = { pop = 0, gdp = 0, towns = 0, tradeIn = 0, tradeOut = 0, priceIdx = 0, _n = 0, techAvg = 0, stability = 0, treasury = 0, migration = 0, civ = 0, sector = { agri = 0, industry = 0, trade = 0, service = 0 } }
	for _, tid in ipairs(w.order) do
		local t = w.towns[tid]
		if kind == "world" or (kind == "region" and t.region == id) or (kind == "country" and t.country == id) or (kind == "town" and t.id == id) then
			a.pop += t.pop; a.gdp += t.gdp; a.towns += 1
			a.tradeIn += t.tradeIn; a.tradeOut += t.tradeOut
			a.stability += t.stability * t.pop; a.treasury += t.treasury; a.migration += t.migIn; a.civ += t.civ * t.pop
			local ta = 0
			for _, f in ipairs(E.TECH_FIELDS) do ta += t.tech[f] end
			a.techAvg += ta / #E.TECH_FIELDS * t.pop
			for k, v in pairs(t.sector) do a.sector[k] += v end
			local idx, n = 0, 0
			for _, g in ipairs(t.goods) do idx += t.price[g] / basePrice(g); n += 1 end
			a.priceIdx += idx / math.max(n, 1); a._n += 1
		end
	end
	a.priceIdx = a._n > 0 and a.priceIdx / a._n or 1
	a.gdpPerCap = a.pop > 0 and a.gdp / a.pop or 0
	if a.pop > 0 then a.stability /= a.pop; a.techAvg /= a.pop; a.civ /= a.pop end
	a._n = nil
	a.cycle = kind == "region" and (w.cycle.lvl[id] or 0) or w.cycle.x
	return a
end

-- ===== 교역 한도: 플레이어 거래는 마을 시뮬의 재고·수요 안에서만 된다 (무한 거래 없음) =====
-- 한 번에 낼 수 있는 주문 크기: 교역 경험(레벨)이 오를수록 소량 → 대량.
function E.orderCap(level)
	local l = math.max(1, level or 1)
	return math.floor(20 + 6 * (l - 1) ^ 1.1)
end
-- 시뮬 단위(마을 하루 생산·소비량)를 플레이어 거래 단위로 바꾸는 배율. 특산품 한 번 재고가 수십~수백 개가 되게 맞춘다.
E.TRADE_SCALE = 12
-- 처음 레벨의 주문 한 번(20개)만큼은 어느 항구에서나 되팔 수 있다.
E.MIN_ABSORB = 20
-- 마을이 내놓을 수 있는 수량: 마을 자기 소비 비축(수요 5일치)은 남기고, 남는 재고의 일부(25%)만 한 번에.
function E.tradeSupply(t, g)
	local st = t.stock[g]
	if not st then return nil end
	local dem = t.dem[g] or 0
	return math.max(0, math.floor((st - dem * 5) * 0.25 * E.TRADE_SCALE))
end
-- 마을이 사줄 수 있는 수량: 재고가 수요 20일치(TARGET_DAYS)에 찰 때까지 + 하루치 소비. 특산품 마을에 같은 물건은 많이 못 판다.
function E.tradeAbsorb(t, g)
	local st = t.stock[g]
	if not st then return nil end
	local dem = t.dem[g] or 0
	return math.floor((math.max(0, dem * E.TARGET_DAYS - st) * 0.5 + dem) * E.TRADE_SCALE) + E.MIN_ABSORB
end
-- 실제 거래: 산 만큼 마을 재고가 줄고, 판 만큼 늘어난다 (가격은 다음 시뮬 날에 반응).
function E.tradeTake(t, g, n) if t.stock[g] then t.stock[g] = math.max(0, t.stock[g] - n) end end
function E.tradeGive(t, g, n) if t.stock[g] then t.stock[g] += n end end

return E
