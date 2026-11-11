--!nonstrict
-- 지식 트리(인과 관계): 발견한 도감 카드를 학자에게 "보고"하면 그 지식을 이해한 것으로 인정된다.
-- 선행 지식(needs)을 모두 이해해야 다음 지식을 보고할 수 있고, 이해한 지식은 항해·화력·교역품 값에 실제 효과를 준다.
-- 새 학문·지식은 표에 줄만 더하면 된다. 카드 id 는 KnowledgeCards 에 있어야 한다 (테스트가 검사).

local K = {}

K.Disciplines = {
	{ id = "astronomy", name = "천문학", field = "Astronomy", summary = "별을 읽으면 바다에서 길을 잃지 않는다. 항해 속도에 효과가 있다." },
	{ id = "physics", name = "물리학", field = "Physics", summary = "빛과 힘과 증기의 법칙. 광학·기계·증기 기관으로 이어져 광물·유리 교역품 값이 오른다." },
	{ id = "chemistry", name = "화학", field = "Chemistry", summary = "물질을 다루는 기술. 염료·유리·화약·비료로 교역품이 개량된다." },
}

-- 이 학자는 어느 학문의 보고를 받는가
K.ScholarDisciplines = {
	huygens = { "astronomy", "physics" }, halley = { "astronomy" }, romer = { "astronomy", "physics" },
	newton = { "physics", "astronomy" }, boyle = { "chemistry", "physics" }, leeuwenhoek = { "physics" },
	papin = { "physics" }, savery = { "physics" }, newcomen = { "physics" }, celsius = { "physics" },
	leibniz = { "physics", "chemistry" }, descartes = { "physics", "astronomy" },
}

-- 노드: id(카드 id), disc, needs(선행 카드), 효과 { speed=, cannon=, goods={ids}, goodsMult=, label= }
local function n(id, disc, needs, fx)
	return { id = id, disc = disc, needs = needs, fx = fx }
end

K.Nodes = {
	-- 천문학
	n("ast_polaris", "astronomy", {}, { speed = 0.015, label = "북극성으로 위도를 잰다" }),
	n("ast_moon_phases", "astronomy", {}, nil),
	n("ast_orion", "astronomy", {}, nil),
	n("ast_old_observer", "astronomy", { "ast_polaris", "ast_orion" }, { speed = 0.02, label = "관측 기록으로 항로를 다듬는다" }),
	n("ast_solar_eclipse", "astronomy", { "ast_moon_phases" }, nil),
	n("ast_venus", "astronomy", { "ast_moon_phases", "phy_refraction" }, nil),
	n("ast_jupiter_moons", "astronomy", { "ast_old_observer", "phy_lens_grinding" }, { speed = 0.04, label = "목성의 달로 경도를 가늠한다" }),
	n("ast_saturn_rings", "astronomy", { "ast_jupiter_moons" }, nil),
	n("ast_light_speed", "astronomy", { "ast_jupiter_moons" }, nil),
	n("ast_comet", "astronomy", { "ast_old_observer" }, nil),
	n("ast_halley_prediction", "astronomy", { "ast_comet", "phy_gravity" }, { speed = 0.02, label = "하늘의 법칙을 믿고 먼 바다로 나선다" }),
	n("ast_halley_comet", "astronomy", { "ast_halley_prediction" }, nil),
	-- 물리학
	n("phy_buoyancy", "physics", {}, nil),
	n("phy_lever", "physics", {}, { goods = { "timber", "marble" }, goodsMult = 0.03, label = "지레와 도르래로 무거운 짐을 다룬다" }),
	n("phy_pendulum", "physics", {}, nil),
	n("phy_barometer", "physics", {}, nil),
	n("phy_refraction", "physics", {}, nil),
	n("phy_magnetism", "physics", {}, { speed = 0.02, label = "나침반이 정확해진다" }),
	n("phy_lens_grinding", "physics", { "phy_refraction" }, { goods = { "glass" }, goodsMult = 0.06, label = "렌즈용 유리가 비싸게 팔린다" }),
	n("phy_microscope", "physics", { "phy_lens_grinding" }, nil),
	n("phy_gravity", "physics", { "phy_pendulum", "phy_lever" }, nil),
	n("phy_thermometer", "physics", { "phy_barometer" }, nil),
	n("che_air_pump", "physics", { "phy_barometer" }, nil),
	n("phy_boyle_law", "physics", { "phy_barometer", "che_air_pump" }, nil),
	n("phy_papin_digester", "physics", { "phy_boyle_law" }, nil),
	n("phy_safety_valve", "physics", { "phy_papin_digester" }, nil),
	n("phy_savery_pump", "physics", { "phy_papin_digester" }, { goods = { "coal", "tin" }, goodsMult = 0.05, label = "증기 펌프로 광산이 마르지 않는다" }),
	n("phy_newcomen_engine", "physics", { "phy_savery_pump", "phy_safety_valve" }, { goods = { "coal", "tin", "copper", "iron" }, goodsMult = 0.05, label = "증기 기관이 광물 생산을 키운다" }),
	-- 화학
	n("chem_saltpeter", "chemistry", {}, { goods = { "nitrate", "guano" }, goodsMult = 0.08, label = "초석·구아노가 비료와 화약 재료로 쓰인다" }),
	n("chem_distillation", "chemistry", {}, { goods = { "camphor", "whale_oil" }, goodsMult = 0.05, label = "증류로 기름과 향료를 정제한다" }),
	n("chem_dye", "chemistry", {}, { goods = { "indigo", "cochineal", "logwood", "brazilwood" }, goodsMult = 0.04, label = "염료 가공이 늘어 염료 재료 값이 오른다" }),
	n("chem_gunpowder_refine", "chemistry", { "chem_saltpeter" }, { cannon = 0.03, label = "정제한 화약으로 포격이 강해진다" }),
	n("chem_acid_base", "chemistry", { "chem_distillation" }, nil),
	n("chem_vitriol", "chemistry", { "chem_acid_base" }, { goods = { "leather", "sealskin" }, goodsMult = 0.05, label = "황산염으로 가죽을 무두질한다" }),
	n("chem_indigo", "chemistry", { "chem_dye" }, { goods = { "indigo" }, goodsMult = 0.1, label = "쪽빛 염료가 고급품이 된다" }),
	n("chem_glass", "chemistry", { "chem_acid_base" }, { goods = { "glass" }, goodsMult = 0.1, label = "투명한 유리를 만든다" }),
	n("chem_oxygen", "chemistry", { "che_air_pump", "chem_acid_base" }, nil),
	n("chem_phosphorus", "chemistry", { "chem_distillation" }, nil),
}

K.ById = {}
for _, node in K.Nodes do
	K.ById[node.id] = node
end
K.DisciplineById = {}
for _, d in K.Disciplines do
	K.DisciplineById[d.id] = d
end

-- 학문이 발달한 항구에서 값이 싸지는(공급이 늘어나는) 관련 교역품
K.DisciplineGoods = {
	astronomy = {},
	physics = { "glass", "iron", "copper", "tin", "coal" },
	chemistry = { "indigo", "cochineal", "logwood", "glass", "nitrate", "guano", "camphor", "leather" },
}

K.SPEED_CAP = 0.15

-- 이해한(보고한) 지식인가
function K.understood(state, id)
	return state.reported ~= nil and state.reported[id] == true
end

-- 이 노드를 지금 보고할 수 있는가: 발견했고, 아직 안 했고, 선행을 모두 이해했다.
-- 돌려주는 값: "locked"(발견 전), "blocked"(선행 부족), "ready", "done", 그리고 부족한 선행 목록
function K.status(state, node)
	if K.understood(state, node.id) then
		return "done", {}
	end
	if not state.discovered[node.id] then
		return "locked", {}
	end
	local missing = {}
	for _, need in node.needs do
		if not K.understood(state, need) then
			table.insert(missing, need)
		end
	end
	if #missing > 0 then
		return "blocked", missing
	end
	return "ready", {}
end

-- 효과 합계
function K.speedBonus(state)
	local total = 0
	for _, node in K.Nodes do
		if node.fx and node.fx.speed and K.understood(state, node.id) then
			total += node.fx.speed
		end
	end
	return math.min(total, K.SPEED_CAP)
end

function K.cannonBonus(state)
	local total = 0
	for _, node in K.Nodes do
		if node.fx and node.fx.cannon and K.understood(state, node.id) then
			total += node.fx.cannon
		end
	end
	return total
end

-- 이 교역품에 붙은 개량 배율(곱셈). 1 이면 개량 없음.
function K.goodsMult(state, goodId)
	local total = 0
	for _, node in K.Nodes do
		local fx = node.fx
		if fx and fx.goods and K.understood(state, node.id) and table.find(fx.goods, goodId) then
			total += fx.goodsMult
		end
	end
	return 1 + math.min(total, 0.4)
end

return K
