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
P.Recipes = {
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
}

P.ById = {}
for _, r in P.Recipes do
	P.ById[r.id] = r
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

return P
