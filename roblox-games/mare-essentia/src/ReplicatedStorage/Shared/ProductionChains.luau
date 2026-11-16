--!nonstrict
-- 생산 자원 체계: 원자재 → 가공품. 도시마다 나는 원자재(Ports.produces)를 종류별로 나누고,
-- 항구 발전 레벨과 건물이 갖춰지면 가공품(시세 배율↑)을 만들 수 있다는 기준 자료.
-- 원자재 종류(Class): mineral 광산물 | gem 보석·해산 | animal 목축·수렵·해산 | farm 농산 | forest 임산 | fiber 섬유·염료
-- building = EconomyBuildings 의 건물 이름, disc = 연결 학문 id, valueMult = 원료 대비 가공품 값 배율.
-- 새 원자재는 Class 에, 새 가공 공정은 Recipes 에 한 줄씩 추가한다 (무결성 검사가 연결을 확인).

local P = {}

P.Classes = {
	{ id = "mineral", name = "광산물" },
	{ id = "gem", name = "보석·해산물" },
	{ id = "animal", name = "목축·수렵" },
	{ id = "farm", name = "농산물" },
	{ id = "forest", name = "임산물" },
	{ id = "fiber", name = "섬유·염료" },
}

-- 원자재 id → 종류 (Ports.Goods 의 id)
P.ClassOf = {
	coal = "mineral", iron = "mineral", tin = "mineral", copper = "mineral", silver = "mineral", gold = "mineral",
	salt = "mineral", marble = "mineral", nitrate = "mineral", guano = "mineral",
	gems = "gem", jade = "gem", amber = "gem", pearls = "gem", coral = "gem", pearl_shell = "gem", ambergris = "gem",
	wool = "animal", fur = "animal", leather = "animal", ivory = "animal", whale_oil = "animal", sealskin = "animal",
	feathers = "animal", fish = "animal",
	spice = "farm", pepper = "farm", cloves = "farm", nutmeg = "farm", cinnamon = "farm", saffron = "farm", sugar = "farm",
	tea = "farm", coffee = "farm", cocoa = "farm", vanilla = "farm", rice = "farm", maize = "farm", dates = "farm",
	raisins = "farm", ginseng = "farm", palm_oil = "farm",
	timber = "forest", ebony = "forest", mahogany = "forest", sandalwood = "forest", sandalwood_hi = "forest", camphor = "forest",
	kauri = "forest", brazilwood = "forest", logwood = "forest", gum_arabic = "forest", incense = "forest",
	cotton = "fiber", indigo = "fiber", cochineal = "fiber",
}

-- 가공 공정: inputs 중 하나를 가공해 output(가공품 이름)을 만든다
-- [제작법 타입] 기존 레시피와 후대 브랜드 레시피를 같은 선택 필드로 관리한다.
type Recipe = {
	id: string,
	inputs: { string },
	output: string,
	building: string,
	disc: string,
	minLevel: number,
	valueMult: number,
	newIndustry: boolean?,
}
local recipes: { Recipe } = {
	{ id = "r_cloth_wool", inputs = { "wool" }, output = "직물(모직)", building = "양모 시장·직조 공방", disc = "textiles", minLevel = 2, valueMult = 1.5 },
	{ id = "r_cloth_cotton", inputs = { "cotton" }, output = "면직물", building = "면직 공방", disc = "textiles", minLevel = 2, valueMult = 1.5 },
	{ id = "r_dye", inputs = { "indigo", "cochineal", "brazilwood", "logwood" }, output = "염색 직물", building = "염색소", disc = "chemistry", minLevel = 3, valueMult = 1.7 },
	{ id = "r_leather", inputs = { "leather", "sealskin" }, output = "가죽 제품", building = "가죽 무두질 공방", disc = "chemistry", minLevel = 2, valueMult = 1.5 },
	{ id = "r_fur_goods", inputs = { "fur", "feathers" }, output = "모피·깃털 의류", building = "깃털·모피 교역소", disc = "zoology", minLevel = 3, valueMult = 1.6 },
	{ id = "r_smelt_iron", inputs = { "iron" }, output = "철제 공구·무기", building = "대장간", disc = "metallurgy", minLevel = 1, valueMult = 1.4 },
	{ id = "r_smelt_copper", inputs = { "copper", "tin" }, output = "청동 제품·화포", building = "제련소·광산", disc = "metallurgy", minLevel = 3, valueMult = 1.6 },
	{ id = "r_silver_coin", inputs = { "silver", "gold" }, output = "주화·세공품", building = "제련소·광산", disc = "metallurgy", minLevel = 3, valueMult = 1.4 },
	{ id = "r_gunpowder", inputs = { "nitrate", "coal" }, output = "화약", building = "화약 공방", disc = "chemistry", minLevel = 3, valueMult = 1.8 },
	{ id = "r_glass", inputs = { "salt", "coal" }, output = "유리 제품", building = "유리 공방", disc = "chemistry", minLevel = 3, valueMult = 1.6 },
	{ id = "r_marble_carving", inputs = { "marble" }, output = "대리석 조각·건축재", building = "석재 채석장", disc = "sculpture", minLevel = 2, valueMult = 1.5 },
	{ id = "r_jewelry", inputs = { "gems", "jade", "pearls", "coral" }, output = "보석 세공품", building = "제련소·광산", disc = "crafts", minLevel = 4, valueMult = 2.0 },
	{ id = "r_amber_craft", inputs = { "amber", "pearl_shell" }, output = "호박·자개 공예", building = "도자기 가마", disc = "crafts", minLevel = 3, valueMult = 1.7 },
	{ id = "r_ivory_carving", inputs = { "ivory" }, output = "상아 조각", building = "도자기 가마", disc = "crafts", minLevel = 3, valueMult = 1.8 },
	{ id = "r_whale_oil", inputs = { "whale_oil" }, output = "정제 등유·양초", building = "대장간", disc = "chemistry", minLevel = 2, valueMult = 1.4 },
	{ id = "r_perfume", inputs = { "ambergris", "incense", "sandalwood", "camphor" }, output = "향수·향료", building = "향신료 창고", disc = "chemistry", minLevel = 4, valueMult = 2.0 },
	{ id = "r_sugar_rum", inputs = { "sugar" }, output = "럼", building = "설탕 정제소", disc = "brewing", minLevel = 3, valueMult = 1.5 },
	{ id = "r_sake", inputs = { "rice" }, output = "청주·쌀 가공", building = "쌀 시장·도정소", disc = "brewing", minLevel = 2, valueMult = 1.4 },
	{ id = "r_wine", inputs = { "raisins", "dates" }, output = "와인·건과", building = "포도주 저장고·양조장", disc = "brewing", minLevel = 2, valueMult = 1.4 },
	{ id = "r_beer", inputs = { "maize" }, output = "맥주·옥수수 가공", building = "맥주 양조장", disc = "brewing", minLevel = 2, valueMult = 1.3 },
	{ id = "r_olive", inputs = { "palm_oil" }, output = "정제 식용유·비누", building = "올리브 압착소", disc = "cooking", minLevel = 2, valueMult = 1.4 },
	{ id = "r_fish_cure", inputs = { "fish" }, output = "염장·건어물", building = "어시장·염장소", disc = "cooking", minLevel = 1, valueMult = 1.5 },
	{ id = "r_spice_blend", inputs = { "pepper", "cloves", "nutmeg", "cinnamon", "saffron", "vanilla" }, output = "혼합 향신료", building = "향신료 창고", disc = "botany", minLevel = 3, valueMult = 1.5 },
	{ id = "r_tea_cure", inputs = { "tea", "coffee", "cocoa" }, output = "가공 차·커피·초콜릿", building = "차 시장·찻집", disc = "botany", minLevel = 3, valueMult = 1.5 },
	{ id = "r_timber_plank", inputs = { "timber", "kauri" }, output = "판재·선박 부재", building = "제재소(톱질 풍차)", disc = "shipbuilding", minLevel = 2, valueMult = 1.4 },
	{ id = "r_fine_wood", inputs = { "ebony", "mahogany", "sandalwood_hi" }, output = "고급 가구", building = "목조 주택·기와 가마", disc = "crafts", minLevel = 3, valueMult = 1.9 },
	{ id = "r_fertilizer", inputs = { "guano", "nitrate" }, output = "비료", building = "곡물 창고", disc = "agronomy", minLevel = 3, valueMult = 1.5 },
	{ id = "r_resin", inputs = { "gum_arabic" }, output = "아교·잉크", building = "인쇄소·신문사", disc = "chemistry", minLevel = 4, valueMult = 1.6 },
	-- [지역 브랜드 선행 가공] 기존 원료와 기존 산업 시설을 사용한다.
	{ id = "r_aged_cheese", inputs = { "cheese" }, output = "숙성 치즈", building = "치즈 공방", disc = "chemistry", minLevel = 2, newIndustry = true, valueMult = 1.35 },
	{ id = "r_fine_glass", inputs = { "glass" }, output = "세공 유리", building = "유리 공방", disc = "chemistry", minLevel = 3, newIndustry = true, valueMult = 1.5 },
	{ id = "r_vintage_wine", inputs = { "wine" }, output = "숙성 와인", building = "포도주 저장고·양조장", disc = "brewing", minLevel = 2, newIndustry = true, valueMult = 1.5 },
	{ id = "r_ginseng_medicine", inputs = { "ginseng" }, output = "정제 인삼 약재", building = "약방·한의원", disc = "pharmacology", minLevel = 3, newIndustry = true, valueMult = 1.6 },
	{ id = "r_aged_beer", inputs = { "beer" }, output = "숙성 맥주", building = "맥주 양조장", disc = "brewing", minLevel = 2, newIndustry = true, valueMult = 1.35 },
}

P.Recipes = recipes

P.ById = {}
for _, r in P.Recipes do
	P.ById[r.id] = r
end

-- 가공품은 실제 교역품이 된다: id = "p_" + 공정 이름, 기본 값 = 원료 평균값 × valueMult
function P.goodId(r)
	return "p_" .. string.sub(r.id, 3)
end

function P.processedGoods(goods: any)
	local out = {}
	for _, r in P.Recipes do
		local sum, n = 0, 0
		for _, inp in r.inputs do
			local g = goods[inp]
			if g then
				sum += g.basePrice
				n += 1
			end
		end
		if n > 0 then
			table.insert(out, { id = P.goodId(r), name = r.output, basePrice = math.floor(sum / n * r.valueMult + 0.5), recipe = r.id })
		end
	end
	return out
end

-- [지역 명품] 원료 → 기존 레시피 가공품 → 원산지 브랜드 → 국제 시장.
-- 고유 교역 ID는 항구와 레시피로 고정해 저장 호환성과 도감/시장 가격 ID를 보존한다.
P.ByGood = {}
for _, recipe in ipairs(P.Recipes) do P.ByGood[P.goodId(recipe)] = recipe end
P.Brands = {
	{ port = "london", recipe = "r_cloth_wool", source = "wool", name = "런던 왕립 모직", destinations = { "amsterdam", "lisbon", "venice", "goa" } },
	{ port = "amsterdam", recipe = "r_aged_cheese", source = "cheese", name = "암스테르담 숙성 치즈", destinations = { "london", "lisbon", "venice", "batavia" } },
	{ port = "venice", recipe = "r_fine_glass", source = "glass", name = "베네치아 장인 유리", destinations = { "london", "amsterdam", "lisbon", "nagasaki" } },
	{ port = "bordeaux", recipe = "r_vintage_wine", source = "wine", name = "보르도 명산 와인", destinations = { "london", "amsterdam", "lisbon", "havana" } },
	{ port = "calicut", recipe = "r_cloth_cotton", source = "cotton", name = "캘리컷 해양 면직물", destinations = { "london", "amsterdam", "lisbon", "batavia" } },
	{ port = "goa", recipe = "r_spice_blend", source = "pepper", name = "고아 왕실 혼합 향신료", destinations = { "lisbon", "london", "amsterdam", "venice" } },
	{ port = "busan", recipe = "r_ginseng_medicine", source = "ginseng", name = "부산 조선 인삼 약재", destinations = { "osaka", "nagasaki", "batavia", "lisbon" } },
	{ port = "osaka", recipe = "r_sake", source = "rice", name = "오사카 명문 청주", destinations = { "busan", "nagasaki", "batavia", "goa" } },
	{ port = "havana", recipe = "r_sugar_rum", source = "sugar", name = "아바나 사탕수수 럼", destinations = { "london", "amsterdam", "lisbon", "bordeaux" } },
	{ port = "bridgetown", recipe = "r_sugar_rum", source = "sugar", name = "브리지타운 섬 럼", destinations = { "london", "amsterdam", "lisbon", "seville" } },
	{ port = "batavia", recipe = "r_tea_cure", source = "coffee", name = "바타비아 선별 커피", destinations = { "amsterdam", "london", "lisbon", "venice" } },
	{ port = "nagasaki", recipe = "r_smelt_copper", source = "copper", name = "나가사키 청동 세공", destinations = { "busan", "osaka", "batavia", "amsterdam" } },
	{ port = "lisbon", recipe = "r_sugar_rum", source = "sugar", name = "리스본 대서양 럼", destinations = { "london", "amsterdam", "bordeaux", "goa" } },
	{ port = "seville", recipe = "r_leather", source = "leather", name = "세비야 가죽 명품", destinations = { "london", "amsterdam", "havana", "goa" } },
	{ port = "hamburg", recipe = "r_aged_beer", source = "beer", name = "함부르크 장기 숙성 맥주", destinations = { "london", "amsterdam", "venice", "lisbon" } },
}
function P.brandId(brand)
	return "b_" .. brand.port .. "_" .. string.sub(brand.recipe, 3)
end
P.BrandById, P.BrandsByPort, P.AddedForBrands = {}, {}, ({} :: { [string]: number })
for _, brand in ipairs(P.Brands) do
	brand.id = P.brandId(brand)
	P.BrandById[brand.id] = brand
	P.BrandsByPort[brand.port] = P.BrandsByPort[brand.port] or {}
	table.insert(P.BrandsByPort[brand.port], brand)
end

-- 항구가 만드는 원자재를 종류별로 센다 (producesList = Ports.produces)
function P.rawByClass(producesList)
	local out = {}
	for _, g in producesList do
		local c = P.ClassOf[g]
		if c then
			out[c] = (out[c] or 0) + 1
		end
	end
	return out
end

-- 항구가 만드는 원자재로 이 발전 레벨에서 가공할 수 있는 공정 목록
function P.craftable(producesList, level)
	local have = {}
	for _, g in producesList do
		have[g] = true
	end
	local out = {}
	for _, r in P.Recipes do
		if level >= r.minLevel then
			for _, inp in r.inputs do
				if have[inp] then
					table.insert(out, r)
					break
				end
			end
		end
	end
	return out
end

-- [지역 특산품 선별] 기존 원산지 브랜드의 원료를 우선하고, 서로 다른 원료군을 함께 보여 준다.
-- 실제 생산 가능한 품목 목록만 정렬하며 생산량·가격·저장 ID를 만들거나 수정하지 않는다.
function P.showcaseGoods(portId, producesList, limit)
	local goods = producesList or {}
	local maxItems = math.max(0, limit or #goods)
	local chosen, seen, usedClass = {}, {}, {}
	local function add(g)
		if #chosen >= maxItems or seen[g] then return end
		seen[g] = true
		usedClass[P.ClassOf[g] or g] = true
		table.insert(chosen, g)
	end
	for _, brand in P.BrandsByPort[portId] or {} do
		if table.find(goods, brand.source) then add(brand.source) end
	end
	for _, good in goods do
		if not usedClass[P.ClassOf[good] or good] then add(good) end
	end
	for _, good in goods do add(good) end
	return chosen
end

return P
