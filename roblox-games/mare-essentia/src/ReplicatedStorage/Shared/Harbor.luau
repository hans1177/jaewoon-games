--!nonstrict
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

-- 특산품 해금: 처음엔 그 땅의 토착 특산 2가지뿐이고, 항구가 발전(기술·시설·교역 축적)할 때마다 하나씩 더 생긴다.
-- produces 목록은 토착 → 후발 순서로 적혀 있다.
Harbor.NATIVE_COUNT = 2
Harbor.UNLOCK_LEVEL = { 2, 3, 4 } -- 3번째 특산은 2단계, 4번째는 3단계, 그 이상은 4단계
function Harbor.unlockLevel(index: number): number
	if index <= Harbor.NATIVE_COUNT then
		return 1
	end
	return Harbor.UNLOCK_LEVEL[index - Harbor.NATIVE_COUNT] or 4
end
function Harbor.activeProduces(produces: { string }, level: number): { string }
	local out = {}
	for i, g in produces do
		if level >= Harbor.unlockLevel(i) then
			table.insert(out, g)
		end
	end
	return out
end
-- 사실 근거: 교역품마다 원산 지역이 있고, 다른 지역에서는 이식된 해부터 난다 (사탕수수→신대륙 1550, 커피→자바·카리브 1700대 등).
-- 원산이 적혀 있지 않은 품목(소금·목재·가죽·생선 등)은 어디서나 난다.
Harbor.ORIGIN = {
	spice = { "indian", "far_east" }, pepper = { "indian", "far_east" }, cloves = { "far_east" }, nutmeg = { "far_east" }, cinnamon = { "indian" },
	silk = { "far_east", "indian" }, porcelain = { "far_east" }, tea = { "far_east" }, lacquer = { "far_east" }, camphor = { "far_east" },
	sake = { "far_east" }, jade = { "far_east" }, sugar = { "indian", "far_east" }, coffee = { "indian" }, carpet = { "indian", "far_east" },
	incense = { "indian", "w_africa" }, dates = { "indian", "w_africa" }, saffron = { "europe", "indian" }, indigo = { "indian" },
	pearls = { "indian", "new_world" }, gems = { "indian", "new_world" }, ivory = { "w_africa", "indian" }, ebony = { "w_africa", "indian" },
	gold = { "w_africa", "new_world" }, palm_oil = { "w_africa" }, gum_arabic = { "w_africa", "indian" }, cotton = { "indian", "w_africa", "new_world", "far_east" },
	silver = { "new_world", "europe", "far_east" }, cocoa = { "new_world" }, mahogany = { "new_world" }, logwood = { "new_world" }, maize = { "new_world" },
	vanilla = { "new_world" }, cochineal = { "new_world" }, brazilwood = { "new_world", "far_east" }, feathers = { "new_world", "pacific" },
	kauri = { "pacific" }, sealskin = { "pacific", "new_world", "europe" }, sandalwood = { "indian", "pacific" }, sandalwood_hi = { "pacific" },
	pearl_shell = { "pacific", "indian" }, rum = { "new_world" }, ginseng = { "far_east", "new_world" },
	wool = { "europe" }, coal = { "europe" }, cheese = { "europe" }, wine = { "europe" }, amber = { "europe" }, glass = { "europe" }, beer = { "europe" },
	olive_oil = { "europe", "indian" }, whale_oil = { "europe", "new_world" }, tin = { "europe", "far_east" }, marble = { "europe", "indian" },
	coral = { "europe", "indian" }, raisins = { "europe", "indian" }, linen = { "europe" }, fur = { "europe", "new_world" },
	rice = { "far_east", "indian" }, copper = { "europe", "far_east", "new_world" },
}
-- 이식·전파: 이 해부터 해당 지역에서도 난다
Harbor.TRANSPLANT = {
	sugar = { new_world = 1550, w_africa = 1520, europe = 1500 },
	coffee = { far_east = 1700, new_world = 1720, w_africa = 1750 },
	rice = { new_world = 1690, europe = 1500, w_africa = 1500 },
	cotton = { europe = 1790, pacific = 1800 },
	wine = { new_world = 1560, w_africa = 1650, indian = 1650, pacific = 1800 },
	wool = { pacific = 1797, new_world = 1600 },
	cocoa = { w_africa = 1700, far_east = 1780 },
	porcelain = { europe = 1710 },
	silk = { europe = 1500 },
	indigo = { new_world = 1600, w_africa = 1650 },
	rum = { europe = 1700, indian = 1700 },
	maize = { europe = 1550, w_africa = 1550, far_east = 1550, indian = 1550 },
	tea = { indian = 1830 },
	cloth = {},
}
local function nativeIn(goodId: string, region: string, year: number): boolean
	local o = Harbor.ORIGIN[goodId]
	if not o or table.find(o, region) then
		return true
	end
	local t = Harbor.TRANSPLANT[goodId]
	return t ~= nil and t[region] ~= nil and year >= t[region]
end
Harbor.isLocal = nativeIn

-- 그 항구가 그 해에 낼 수 있는 특산품: 토착(원산 지역) 먼저, 이식된 것은 뒤. 원산이 맞지 않는 품목은 제외.
function Harbor.producesOf(produces: { string }, region: string, year: number): { string }
	local native, later = {}, {}
	for _, g in produces do
		local o = Harbor.ORIGIN[g]
		if not o or table.find(o, region) then
			table.insert(native, g)
		elseif nativeIn(g, region, year) then
			table.insert(later, g)
		end
	end
	for _, g in later do
		table.insert(native, g)
	end
	return native
end

-- 교역품(수요): 지역 간 교역은 같은 물건도 오가므로(영국 양모→네덜란드 직조업) 원산 필터 없이,
-- 그 항구가 스스로 내는 특산품만 뺀다.
function Harbor.demandsOf(demands: { string }, region: string, year: number, produces: { string }?): { string }
	local out = {}
	local own = if produces then Harbor.producesOf(produces, region, year) else {}
	for _, g in demands do
		if not table.find(own, g) then
			table.insert(out, g)
		end
	end
	return out
end

-- 발전도에 따라 열린 목록 (특산·교역품 공통: 2개로 시작해 항구가 크면 늘어난다)
function Harbor.openList(list: { string }, level: number): { string }
	return Harbor.activeProduces(list, level)
end

-- 이 항구에서 이 상품이 지금 맡는 역할: "produce"(싸다) · "demand"(비싸다) · nil
function Harbor.role(port, region: string, year: number, level: number, goodId: string): string?
	if table.find(Harbor.openList(Harbor.producesOf(port.produces, region, year), level), goodId) then
		return "produce"
	end
	if table.find(Harbor.openList(Harbor.demandsOf(port.demands, region, year, port.produces), level), goodId) then
		return "demand"
	end
	return nil
end

-- 교역품 분류: 경제 국면은 분류마다 다르게 작용한다 (전쟁엔 전략물자↑·사치품↓, 호황엔 사치품·향신료↑).
Harbor.CATEGORY_NAMES = { food = "식량", luxury = "사치품", precious = "귀금속", spice = "향신료", colonial = "기호품", textile = "섬유", dye = "염료", strategic = "전략물자", raw = "원자재" }
Harbor.CATEGORY = {}
for cat, list in {
	food = { "cheese", "fish", "salt", "rice", "maize", "dates", "raisins", "olive_oil", "beer" },
	luxury = { "silk", "porcelain", "pearls", "ivory", "jade", "lacquer", "glass", "carpet", "gems", "amber", "coral", "pearl_shell", "ebony", "feathers" },
	precious = { "gold", "silver" },
	spice = { "spice", "pepper", "cloves", "nutmeg", "cinnamon", "saffron", "vanilla", "incense", "sandalwood", "sandalwood_hi", "camphor" },
	colonial = { "sugar", "tea", "coffee", "cocoa", "rum", "wine", "sake", "ginseng", "gum_arabic" },
	textile = { "wool", "cloth", "linen", "cotton", "leather", "fur" },
	dye = { "indigo", "cochineal", "logwood", "brazilwood" },
	strategic = { "iron", "copper", "tin", "timber", "coal", "whale_oil" },
} do
	for _, g in list do
		Harbor.CATEGORY[g] = cat
	end
end
function Harbor.categoryOf(goodId: string): string
	return Harbor.CATEGORY[goodId] or "raw"
end

-- 거시경제 국면: 연도마다 호황·불황·인플레·디플레가 돈다. 같은 국면도 지역마다 세기가 다르다.
-- growth: 중심 지역의 항구 성장 배율(0.5 미만이면 쇠퇴), price: 물가 배율(인플레 > 1, 디플레 < 1)
-- reach: 지역별 영향 세기 (없는 지역은 0.2), cat: 분류별 가격 배율
-- 앞에 있는 항목이 먼저 맞는다 (짧은 버블·붕괴를 긴 국면보다 앞에 둔다).
Harbor.REGIMES = {
	{ from = 1634, to = 1637, id = "tulip_mania", name = "튤립 광풍", kind = "bubble", growth = 1.9, price = 1.05, reach = { europe = 1 }, cat = { luxury = 1.12, textile = 1.05, colonial = 1.05 }, note = "네덜란드 항구에 투기 자금이 몰린다" },
	{ from = 1637, to = 1641, id = "tulip_crash", name = "버블 붕괴", kind = "bust", growth = 0.1, price = 0.94, reach = { europe = 1 }, cat = { luxury = 0.84, colonial = 0.92, food = 1.03 }, note = "투기꾼이 파산해 공사가 멈춘다" },
	{ from = 1720, to = 1721, id = "south_sea", name = "남해 버블", kind = "bubble", growth = 1.8, price = 1.05, reach = { europe = 1, new_world = 0.6, indian = 0.4 }, cat = { precious = 1.08, colonial = 1.1, textile = 1.05 }, note = "주식 열풍으로 항구가 들썩인다" },
	{ from = 1721, to = 1726, id = "bubble_burst", name = "버블 붕괴 불황", kind = "bust", growth = 0.1, price = 0.93, reach = { europe = 1, new_world = 0.5 }, cat = { luxury = 0.86, colonial = 0.9, food = 1.04 }, note = "상점이 줄줄이 문을 닫는다" },
	{ from = 1500, to = 1560, id = "price_revolution", name = "가격 혁명 (인플레이션)", kind = "inflation", growth = 1.1, price = 1.05, reach = { europe = 1, new_world = 0.8, w_africa = 0.5, indian = 0.4 }, cat = { precious = 0.9, food = 1.12, textile = 1.06 }, note = "신대륙 금은으로 물가가 오른다" },
	{ from = 1560, to = 1618, id = "silver_boom", name = "은 유입 대호황", kind = "boom", growth = 1.6, price = 1.03, reach = { europe = 1, new_world = 1, far_east = 0.8, indian = 0.7, w_africa = 0.5 }, cat = { luxury = 1.06, spice = 1.08, precious = 0.95, colonial = 1.05 }, note = "대항해 교역이 절정에 이른다" },
	{ from = 1618, to = 1648, id = "thirty_years", name = "30년 전쟁 대불황", kind = "depression", growth = 0.2, price = 0.95, reach = { europe = 1, new_world = 0.3 }, cat = { strategic = 1.15, food = 1.1, luxury = 0.88, spice = 0.95 }, note = "전쟁으로 유럽 교역이 막힌다" },
	{ from = 1648, to = 1680, id = "deflation", name = "디플레이션 (소비 위축)", kind = "deflation", growth = 0.6, price = 0.96, reach = { europe = 1, new_world = 0.5 }, cat = { food = 0.92, luxury = 0.9, strategic = 0.97 }, note = "물가가 내리고 돈이 돌지 않는다" },
	{ from = 1680, to = 1756, id = "mercantile", name = "중상주의 확장", kind = "normal", growth = 1.25, price = 1.0, reach = { europe = 1, indian = 0.9, new_world = 0.9, w_africa = 0.8, far_east = 0.6 }, cat = { colonial = 1.08, textile = 1.04, spice = 1.02 }, note = "식민 교역이 꾸준히 늘어난다" },
	{ from = 1756, to = 1763, id = "seven_years", name = "7년 전쟁 (전시 인플레)", kind = "recession", growth = 0.45, price = 1.05, reach = { europe = 1, new_world = 0.9, indian = 0.8 }, cat = { strategic = 1.18, food = 1.08, luxury = 0.95 }, note = "군수품 값이 치솟는다" },
	{ from = 1763, to = 1900, id = "expansion", name = "교역 팽창기", kind = "boom", growth = 1.35, price = 1.02, reach = { europe = 1, indian = 0.9, new_world = 0.9, far_east = 0.8, w_africa = 0.6, pacific = 0.6 }, cat = { textile = 1.06, dye = 1.06, colonial = 1.04 }, note = "세계 교역이 다시 커진다" },
}
local NORMAL = { id = "normal", name = "평온한 시기", kind = "normal", growth = 1.0, price = 1.0, reach = {}, cat = {}, note = "" }

function Harbor.regime(year: number)
	for _, r in Harbor.REGIMES do
		if year >= r.from and year < r.to then
			return r
		end
	end
	return NORMAL
end

local function reachOf(regime, region: string): number
	return regime.reach[region] or 0.2
end

-- 이 지역에서 이 분류가 받는 가격 배율
local function catMult(regime, region: string, cat: string): number
	local m = regime.cat[cat] or 1
	return 1 + (m - 1) * reachOf(regime, region)
end

-- 그 지역 항구의 하루당 성장 배율. 국면 세기(지역별) × 특산품 분류가 유리한 만큼 × 최근 교역량. 0.5 미만이면 쇠퇴.
function Harbor.vitality(regime, region: string, produces: { string }, activity: number): number
	local base = 1 + (regime.growth - 1) * reachOf(regime, region)
	local fav = 0
	for _, g in produces do
		if catMult(regime, region, Harbor.categoryOf(g)) > 1.03 then
			fav += 1
		end
	end
	return base * (1 + 0.3 * math.min(fav, 2)) * (1 + 0.8 * math.clamp(activity, 0, 1))
end

-- 물가 배율: 국면 전체 물가(인플레·디플레) × 분류별 변동, 둘 다 지역 세기만큼만.
function Harbor.priceMult(regime, region: string, goodId: string): number
	local general = 1 + (regime.price - 1) * reachOf(regime, region)
	return general * catMult(regime, region, Harbor.categoryOf(goodId))
end

-- 항구의 경제 성격: 특산품 분류 중 가장 많은 것
function Harbor.portType(produces: { string }): string
	local counts, best, bestN = {}, "raw", 0
	for _, g in produces do
		local c = Harbor.categoryOf(g)
		counts[c] = (counts[c] or 0) + 1
		if counts[c] > bestN then
			best, bestN = c, counts[c]
		end
	end
	return Harbor.CATEGORY_NAMES[best] .. " 항구"
end

return Harbor
