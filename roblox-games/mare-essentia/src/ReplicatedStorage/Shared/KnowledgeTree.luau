--!nonstrict
-- 지식 트리(인과 관계): 발견한 도감 카드를 학자에게 "보고"하면 그 지식을 이해한 것으로 인정된다.
-- 선행 지식(needs)을 모두 이해해야 다음 지식을 보고할 수 있고, 이해한 지식은 항해·화력·교역품 값에 실제 효과를 준다.
-- 새 학문·지식은 표에 줄만 더하면 된다. 카드 id 는 KnowledgeCards 에 있어야 한다 (테스트가 검사).

local K = {}

-- 학문 계통도: parent 는 그 학문이 갈라져 나온 뿌리. openAt 이 있으면 parent 학문에서 지식을 그만큼 이해해야 열린다
-- (없으면 처음부터 열려 있다). 인류가 발전하며 학문이 갈라지는 과정을 그대로 따른다.
--   철학 → 물리학 → 천문학 → 지리·항해학 → 기상학
--                 ↘ 화학 → 의학, 광물학
--                 ↘ 건축학 → 조선학
--   철학 → 식물학 → 동물학
--   철학 → 언어학 → 고고학(유물) → 신화·민속학, 역사·유적학
--   철학 → 상업·경제학        천문학 → 항해술        예술(독립)
K.Disciplines = {
	{ id = "philosophy", name = "철학", field = "Philosophy", era = "고대~", summary = "세계를 이성과 경험으로 따져 묻는 일. 모든 학문의 뿌리라 새 학문(식물학)이 여기서 갈라져 나온다." },
	{ id = "physics", name = "물리학", field = "Physics", era = "근세", parent = "philosophy", summary = "빛과 힘과 증기의 법칙. 광학·기계·증기 기관으로 이어져 광물·유리 교역품 값이 오른다." },
	{ id = "astronomy", name = "천문학", field = "Astronomy", era = "근세", parent = "physics", summary = "별을 읽으면 바다에서 길을 잃지 않는다. 항해 속도에 효과가 있다." },
	{ id = "chemistry", name = "화학", field = "Chemistry", era = "근세", parent = "physics", summary = "물질을 다루는 기술. 염료·유리·화약·비료로 교역품이 개량된다." },
	{ id = "geography", name = "지리·항해학", field = "Geography", era = "대항해", parent = "astronomy", openAt = 3, summary = "바람과 해류, 해협을 읽고 해도를 고친다. 항해 속도와 향신료 교역품에 효과가 있다." },
	{ id = "medicine", name = "의학", field = "Medicine", era = "근세", parent = "chemistry", openAt = 2, summary = "해부와 약, 검역. 선원의 건강으로 항해가 빨라지고 약재 교역품 값이 오른다." },
	{ id = "botany", name = "식물학", field = "Botany", era = "근세", parent = "philosophy", openAt = 3, summary = "식물을 채집하고 이름 붙이는 학문. 차·향신료 같은 식물성 교역품이 개량된다." },
	{ id = "zoology", name = "동물학", field = "Zoology", era = "근세", parent = "botany", openAt = 3, summary = "동물을 관찰하고 분류한다. 고래기름·상아·진주 같은 동물성 교역품이 개량된다." },
	{ id = "architecture", name = "건축학", field = "Architecture", era = "근세", parent = "physics", openAt = 2, summary = "하중과 구조를 다루는 학문. 크레인·돔·요새로 이어져 목재·대리석 교역품과 포대가 개량된다." },
	{ id = "shipbuilding", name = "조선학", field = "Shipbuilding", era = "대항해", parent = "architecture", openAt = 2, summary = "선체 설계와 건조 기술. 새 설계와 구리 피복으로 항해 속도가 오른다." },
	{ id = "mineralogy", name = "광물학", field = "Mineral", era = "근세", parent = "chemistry", openAt = 2, summary = "광석과 보석을 가려내고 캐낸다. 구리·주석·철 교역품과 화약이 개량된다." },
	{ id = "meteorology", name = "기상학", field = "Weather", era = "근세", parent = "geography", openAt = 2, summary = "구름과 바람, 폭풍의 징조를 읽는다. 폭풍을 미리 알면 항해가 빨라진다." },
	{ id = "linguistics", name = "언어학", field = "Language", era = "고대~", parent = "philosophy", openAt = 2, summary = "문자와 말, 인쇄. 공용어가 퍼지면 교역이 쉬워지고 먼 나라의 기록을 읽을 수 있다." },
	{ id = "archaeology", name = "고고학", field = "Relic", era = "근세", parent = "linguistics", openAt = 2, summary = "옛 유물과 기록을 모아 읽는다. 오래된 해도와 관측기에서 항해 지식을 되살린다." },
	{ id = "mythology", name = "신화·민속학", field = "Myth", era = "고대~", parent = "archaeology", openAt = 2, summary = "바다 괴물과 전설을 모으고 견주어 본다. 이야기가 보물 수요와 항해 용기가 된다." },
	{ id = "navigation", name = "항해술", field = "Navigation", era = "대항해", parent = "astronomy", openAt = 3, summary = "나침반과 관측기, 해도와 시계. 위도·경도를 알면 먼 바다에서도 길을 잃지 않아 항해 속도가 오른다." },
	{ id = "commerce", name = "상업·경제학", field = "Goods", era = "근세", parent = "philosophy", openAt = 3, summary = "교역품의 산지와 값을 따지고 거래를 체계화한다. 후추·설탕·비단 같은 교역품이 개량된다." },
	{ id = "history", name = "역사·유적학", field = "Site", era = "고대~", parent = "archaeology", openAt = 2, summary = "성곽과 신전, 거석 유적을 답사하고 기록한다. 옛 도시의 역사에서 교훈을 얻는다." },
	{ id = "art", name = "예술", field = "Art", era = "고대~", summary = "그림·음악·공예. 거장과 함께 발표하면 항구의 문화가 자라 사치 교역품(대리석·도자기·비단)이 풍부해진다." },
}

-- 이 학자는 어느 학문의 보고를 받는가
K.ScholarDisciplines = {
	huygens = { "astronomy", "physics" }, halley = { "astronomy", "geography", "navigation" }, romer = { "astronomy", "physics" },
	newton = { "philosophy", "physics", "astronomy" }, boyle = { "chemistry", "physics", "medicine" }, leeuwenhoek = { "physics" },
	papin = { "physics" }, savery = { "physics" }, newcomen = { "physics" }, celsius = { "physics" },
	leibniz = { "philosophy", "physics", "chemistry" }, descartes = { "philosophy", "physics", "astronomy" },
	-- 예술가 (그림·음악·판화)
	-- 철학·박물학·의학·지리
	galileo = { "astronomy", "physics" }, harvey = { "medicine" }, torricelli = { "physics", "meteorology" }, hooke = { "physics", "medicine" },
	spinoza = { "philosophy" }, lind = { "medicine" }, harrison = { "geography", "navigation" }, blaeu = { "navigation", "geography" }, sloane = { "botany", "medicine" },
	banks = { "botany", "geography" }, linnaeus = { "botany", "zoology" }, malpighi = { "botany", "medicine" }, redi = { "zoology" },
	wren = { "architecture" }, vancampen = { "architecture" }, witsen = { "shipbuilding" }, chapman = { "shipbuilding" },
	cronstedt = { "mineralogy" }, steno = { "mineralogy" }, franklin = { "meteorology", "physics" }, fahrenheit = { "meteorology" },
	johnson = { "linguistics" }, worm = { "archaeology", "linguistics", "mythology" }, pontoppidan = { "mythology", "zoology" },
	rembrandt = { "art" }, vermeer = { "art" }, rubens = { "art" }, velazquez = { "art" }, vandevelde = { "art" },
	canaletto = { "art" }, hogarth = { "art" }, handel = { "art" }, buxtehude = { "art" }, merian = { "art", "zoology", "botany" },
}

-- 노드: id(카드 id), disc, needs(선행 카드), 효과 { speed=, cannon=, goods={ids}, goodsMult=, label= }
K.Nodes = {} :: { any }
local function n(id: string, disc: string, needs: { string }, fx: any)
	table.insert(K.Nodes, { id = id, disc = disc, needs = needs, fx = fx })
end

	-- 천문학
n("ast_polaris", "astronomy", {}, { speed = 0.015, label = "북극성으로 위도를 잰다" })
n("ast_moon_phases", "astronomy", {}, nil)
n("ast_orion", "astronomy", {}, nil)
n("ast_old_observer", "astronomy", { "ast_polaris", "ast_orion" }, { speed = 0.02, label = "관측 기록으로 항로를 다듬는다" })
n("ast_solar_eclipse", "astronomy", { "ast_moon_phases" }, nil)
n("ast_venus", "astronomy", { "ast_moon_phases", "phy_refraction" }, nil)
n("ast_jupiter_moons", "astronomy", { "ast_old_observer", "phy_lens_grinding" }, { speed = 0.04, label = "목성의 달로 경도를 가늠한다" })
n("ast_saturn_rings", "astronomy", { "ast_jupiter_moons" }, nil)
n("ast_light_speed", "astronomy", { "ast_jupiter_moons" }, nil)
n("ast_comet", "astronomy", { "ast_old_observer" }, nil)
n("ast_halley_prediction", "astronomy", { "ast_comet", "phy_gravity" }, { speed = 0.02, label = "하늘의 법칙을 믿고 먼 바다로 나선다" })
n("ast_halley_comet", "astronomy", { "ast_halley_prediction" }, nil)
	-- 물리학
n("phy_buoyancy", "physics", {}, nil)
n("phy_lever", "physics", {}, { goods = { "timber", "marble" }, goodsMult = 0.03, label = "지레와 도르래로 무거운 짐을 다룬다" })
n("phy_pendulum", "physics", {}, nil)
n("phy_barometer", "physics", {}, nil)
n("phy_refraction", "physics", {}, nil)
n("phy_magnetism", "physics", {}, { speed = 0.02, label = "나침반이 정확해진다" })
n("phy_lens_grinding", "physics", { "phy_refraction" }, { goods = { "glass" }, goodsMult = 0.06, label = "렌즈용 유리가 비싸게 팔린다" })
n("phy_microscope", "physics", { "phy_lens_grinding" }, nil)
n("phy_gravity", "physics", { "phy_pendulum", "phy_lever" }, nil)
n("phy_thermometer", "physics", { "phy_barometer" }, nil)
n("che_air_pump", "physics", { "phy_barometer" }, nil)
n("phy_boyle_law", "physics", { "phy_barometer", "che_air_pump" }, nil)
n("phy_papin_digester", "physics", { "phy_boyle_law" }, nil)
n("phy_safety_valve", "physics", { "phy_papin_digester" }, nil)
n("phy_savery_pump", "physics", { "phy_papin_digester" }, { goods = { "coal", "tin" }, goodsMult = 0.05, label = "증기 펌프로 광산이 마르지 않는다" })
n("phy_newcomen_engine", "physics", { "phy_savery_pump", "phy_safety_valve" }, { goods = { "coal", "tin", "copper", "iron" }, goodsMult = 0.05, label = "증기 기관이 광물 생산을 키운다" })
	-- 화학
n("chem_saltpeter", "chemistry", {}, { goods = { "nitrate", "guano" }, goodsMult = 0.08, label = "초석·구아노가 비료와 화약 재료로 쓰인다" })
n("chem_distillation", "chemistry", {}, { goods = { "camphor", "whale_oil" }, goodsMult = 0.05, label = "증류로 기름과 향료를 정제한다" })
n("chem_dye", "chemistry", {}, { goods = { "indigo", "cochineal", "logwood", "brazilwood" }, goodsMult = 0.04, label = "염료 가공이 늘어 염료 재료 값이 오른다" })
n("chem_gunpowder_refine", "chemistry", { "chem_saltpeter" }, { cannon = 0.03, label = "정제한 화약으로 포격이 강해진다" })
n("chem_acid_base", "chemistry", { "chem_distillation" }, nil)
n("chem_vitriol", "chemistry", { "chem_acid_base" }, { goods = { "leather", "sealskin" }, goodsMult = 0.05, label = "황산염으로 가죽을 무두질한다" })
n("chem_indigo", "chemistry", { "chem_dye" }, { goods = { "indigo" }, goodsMult = 0.1, label = "쪽빛 염료가 고급품이 된다" })
n("chem_glass", "chemistry", { "chem_acid_base" }, { goods = { "glass" }, goodsMult = 0.1, label = "투명한 유리를 만든다" })
n("chem_oxygen", "chemistry", { "che_air_pump", "chem_acid_base" }, nil)
n("chem_phosphorus", "chemistry", { "chem_distillation" }, nil)
	-- 예술 (화학의 안료, 물리의 광학과 이어진다)
n("art_woodcut", "art", {}, nil)
n("art_still_life", "art", {}, nil)
n("art_portrait", "art", {}, nil)
n("art_landscape", "art", {}, nil)
n("art_theater", "art", {}, nil)
n("art_baroque_music", "art", {}, nil)
n("art_engraving", "art", { "art_woodcut" }, nil)
n("art_oil_painting", "art", { "chem_dye", "art_still_life" }, { goods = { "cochineal", "indigo" }, goodsMult = 0.04, label = "유화 물감을 만들려는 화가들이 안료를 찾는다" })
n("art_tapestry", "art", { "art_portrait" }, { goods = { "silk" }, goodsMult = 0.05, label = "태피스트리 공방이 비단을 찾는다" })
n("art_delft_tile", "art", { "art_still_life", "chem_glass" }, { goods = { "porcelain" }, goodsMult = 0.05, label = "푸른 유약 타일이 도자기 값을 올린다" })
n("art_marine_painting", "art", { "art_landscape" }, nil)
n("art_map_painting", "art", { "art_engraving", "art_marine_painting" }, { speed = 0.01, label = "정교한 지도로 항로 판단이 쉬워진다" })
n("art_violin", "art", { "art_baroque_music" }, { goods = { "ebony" }, goodsMult = 0.04, label = "악기 공방이 흑단을 찾는다" })
n("art_organ", "art", { "art_baroque_music", "phy_barometer" }, nil)
n("art_masterpiece", "art", { "art_oil_painting", "art_portrait", "art_landscape" }, { goods = { "marble", "porcelain", "silk", "lacquer" }, goodsMult = 0.05, label = "걸작이 사치품 수요를 키운다" })
	-- 철학
n("phi_skepticism", "philosophy", {}, nil)
n("phi_atomism", "philosophy", {}, nil)
n("phi_utopia", "philosophy", {}, nil)
n("phi_natural_law", "philosophy", {}, nil)
n("phi_empiricism", "philosophy", { "phi_skepticism" }, nil)
n("phi_rationalism", "philosophy", { "phi_skepticism" }, nil)
n("phi_cogito", "philosophy", { "phi_rationalism" }, nil)
n("phi_vacuum", "philosophy", { "phi_atomism" }, nil)
n("phi_mechanical", "philosophy", { "phi_atomism", "phi_rationalism" }, nil)
n("phi_ethics", "philosophy", { "phi_rationalism" }, nil)
n("phi_monad", "philosophy", { "phi_rationalism" }, nil)
n("phi_social_contract", "philosophy", { "phi_natural_law" }, nil)
n("phi_scientific_method", "philosophy", { "phi_empiricism", "phi_mechanical" }, nil)
n("phi_enlightenment", "philosophy", { "phi_scientific_method", "phi_social_contract" }, nil)
	-- 식물학
n("bot_herbarium", "botany", {}, nil)
n("bot_new_seeds", "botany", {}, nil)
n("bot_tea_plant", "botany", { "bot_new_seeds" }, { goods = { "tea" }, goodsMult = 0.06, label = "차 재배법이 퍼져 찻값이 오른다" })
n("bot_clove_tree", "botany", { "bot_new_seeds" }, { goods = { "cloves" }, goodsMult = 0.05, label = "정향 재배가 체계화된다" })
n("bot_nutmeg_tree", "botany", { "bot_new_seeds" }, { goods = { "nutmeg" }, goodsMult = 0.05, label = "육두구 재배가 체계화된다" })
n("bot_vanilla", "botany", { "bot_new_seeds" }, { goods = { "vanilla" }, goodsMult = 0.05, label = "바닐라 가공법이 알려진다" })
n("bot_ginseng_root", "botany", { "bot_herbarium" }, { goods = { "ginseng" }, goodsMult = 0.05, label = "인삼의 품질 구분이 생긴다" })
n("am_cinchona", "botany", { "bot_herbarium" }, nil)
n("bot_binomial", "botany", { "bot_herbarium" }, nil)
n("bot_plant_anatomy", "botany", { "bot_herbarium", "phy_microscope" }, nil)
n("bot_pacific_plants", "botany", { "bot_binomial" }, nil)
n("bot_systema_naturae", "botany", { "bot_binomial", "bot_plant_anatomy" }, nil)
	-- 동물학
n("zoo_redi_experiment", "zoology", {}, nil)
n("zoo_metamorphosis", "zoology", {}, nil)
n("zoo_surinam_insects", "zoology", { "zoo_metamorphosis" }, nil)
n("zoo_whale", "zoology", {}, nil)
n("zoo_sperm_whale", "zoology", { "zoo_whale" }, { goods = { "whale_oil" }, goodsMult = 0.06, label = "고래 생태를 알고 포경 기름 생산이 늘어난다" })
n("zoo_orca", "zoology", { "zoo_whale" }, nil)
n("zoo_pearl_oyster", "zoology", {}, { goods = { "pearls", "pearl_shell" }, goodsMult = 0.05, label = "진주조개 양식법이 알려진다" })
n("zoo_nautilus", "zoology", { "zoo_pearl_oyster" }, nil)
n("zoo_elephant", "zoology", {}, { goods = { "ivory" }, goodsMult = 0.05, label = "코끼리 생태를 알고 상아 수급이 안정된다" })
n("zoo_bird_paradise", "zoology", {}, { goods = { "feathers" }, goodsMult = 0.05, label = "새 깃털 분류가 정리된다" })
	-- 의학
n("med_herb_garden", "medicine", {}, nil)
n("med_anatomy", "medicine", {}, nil)
n("med_bloodletting", "medicine", {}, nil)
n("med_ship_surgeon", "medicine", { "med_anatomy" }, nil)
n("med_surgery", "medicine", { "med_anatomy" }, nil)
n("med_circulation", "medicine", { "med_anatomy" }, nil)
n("med_cell_observation", "medicine", { "med_anatomy", "phy_microscope" }, nil)
n("med_pharmacy", "medicine", { "med_herb_garden", "chem_distillation" }, { goods = { "camphor", "ginseng" }, goodsMult = 0.04, label = "약방이 약재 수요를 키운다" })
n("med_cinchona", "medicine", { "am_cinchona", "med_pharmacy" }, nil)
n("med_lime_scurvy", "medicine", { "med_ship_surgeon" }, { speed = 0.015, label = "괴혈병을 막아 선원이 건강하게 오래 항해한다" })
n("med_hospital", "medicine", { "med_surgery" }, nil)
n("med_plague_quarantine", "medicine", { "med_hospital" }, nil)
n("med_inoculation", "medicine", { "med_plague_quarantine", "med_cinchona" }, { speed = 0.01, label = "전염병 걱정이 줄어 먼 항로를 택한다" })
	-- 지리·항해학
n("geo_tides", "geography", {}, nil)
n("geo_trade_winds", "geography", {}, nil)
n("geo_gulfstream", "geography", { "geo_trade_winds" }, { speed = 0.015, label = "멕시코 만류를 타고 대서양을 건넌다" })
n("geo_monsoon", "geography", { "geo_trade_winds" }, { speed = 0.015, label = "계절풍 시기를 맞춰 인도양을 건넌다" })
n("geo_cape_good_hope", "geography", { "geo_trade_winds" }, nil)
n("geo_straits_magellan", "geography", { "geo_cape_good_hope" }, nil)
n("geo_cape_horn", "geography", { "geo_straits_magellan" }, nil)
n("nav_compass_rose", "navigation", {}, nil)
n("nav_dead_reckoning", "navigation", {}, nil)
n("nav_log_line", "navigation", { "nav_dead_reckoning" }, { speed = 0.01, label = "측정줄로 속도를 재어 추측 항법이 정확해진다" })
n("nav_lead_line", "navigation", {}, nil)
n("nav_cross_staff", "navigation", { "nav_compass_rose", "ast_polaris" }, { speed = 0.015, label = "십자 관측기로 별 높이를 잰다" })
n("nav_backstaff", "navigation", { "nav_cross_staff" }, { speed = 0.01, label = "백스태프로 해를 등지고 정확히 잰다" })
n("nav_octant", "navigation", { "nav_backstaff" }, { speed = 0.015, label = "팔분의로 흔들리는 배 위에서도 잰다" })
n("nav_portolan", "navigation", { "nav_compass_rose" }, nil)
n("nav_chronometer", "navigation", { "nav_longitude_problem", "phy_pendulum" }, { speed = 0.03, label = "해상 시계로 경도를 정확히 안다" })
n("good_pepper", "commerce", {}, { goods = { "pepper" }, goodsMult = 0.04, label = "후추 거래가 체계화된다" })
n("good_cinnamon", "commerce", {}, { goods = { "cinnamon" }, goodsMult = 0.04, label = "계피 거래가 체계화된다" })
n("good_sugar", "commerce", {}, { goods = { "sugar" }, goodsMult = 0.05, label = "설탕 정제업이 자리 잡는다" })
n("good_coffee", "commerce", {}, { goods = { "coffee" }, goodsMult = 0.04, label = "커피하우스가 늘어 커피값이 오른다" })
n("good_silk", "commerce", {}, { goods = { "silk" }, goodsMult = 0.04, label = "비단길 거래가 체계화된다" })
n("good_wine", "commerce", {}, nil)
n("good_cheese", "commerce", {}, nil)
n("good_herring", "commerce", {}, { goods = { "fish" }, goodsMult = 0.04, label = "청어 절임 유통이 늘어난다" })
n("good_amber_trade", "commerce", { "good_herring" }, { goods = { "amber" }, goodsMult = 0.05, label = "호박 무역로가 정리된다" })
n("good_cocoa", "commerce", { "good_sugar" }, { goods = { "cocoa" }, goodsMult = 0.05, label = "초콜릿 음료가 유행한다" })
n("good_tea", "commerce", { "good_sugar", "good_coffee" }, { goods = { "tea" }, goodsMult = 0.05, label = "차 거래가 커피와 겨룬다" })
n("geo_southern_cross", "geography", { "ast_polaris" }, { speed = 0.01, label = "남반구에서도 별로 위도를 잰다" })
n("geo_malacca_strait", "geography", { "geo_monsoon" }, nil)
n("geo_spice_islands", "geography", { "geo_monsoon" }, { goods = { "cloves", "nutmeg", "pepper" }, goodsMult = 0.03, label = "향신료 제도 항로가 정리된다" })
n("nav_mercator", "navigation", { "geo_trade_winds", "ast_polaris" }, { speed = 0.02, label = "메르카토르 도법 해도로 항로를 곧게 긋는다" })
n("nav_longitude_problem", "navigation", { "nav_mercator", "ast_jupiter_moons" }, { speed = 0.03, label = "경도를 알면 먼 바다에서도 길을 잃지 않는다" })
	-- 건축학
n("arch_town_hall", "architecture", {}, nil)
n("arch_canal_house", "architecture", {}, nil)
n("arch_cathedral", "architecture", {}, nil)
n("arch_stave_church", "architecture", {}, nil)
n("arch_harbor_crane", "architecture", {}, { goods = { "timber" }, goodsMult = 0.04, label = "항만 크레인으로 목재 하역이 빨라진다" })
n("arch_arsenal", "architecture", { "arch_harbor_crane" }, nil)
n("arch_baroque", "architecture", { "arch_cathedral" }, nil)
n("arch_dome", "architecture", { "arch_cathedral", "phy_lever" }, { goods = { "marble" }, goodsMult = 0.05, label = "돔 건축이 대리석 수요를 키운다" })
n("arch_star_fort", "architecture", { "arch_town_hall" }, { cannon = 0.02, label = "별 모양 요새 설계로 포대 배치가 좋아진다" })
n("arch_garden_palace", "architecture", { "arch_baroque" }, nil)
	-- 조선학
n("ship_lateen", "shipbuilding", {}, nil)
n("ship_figurehead", "shipbuilding", {}, nil)
n("ship_longship", "shipbuilding", {}, nil)
n("ship_galleon_design", "shipbuilding", { "ship_lateen" }, nil)
n("ship_fluyt_design", "shipbuilding", { "ship_lateen" }, { speed = 0.02, label = "플루트선 설계로 적은 인원으로도 빠르게 간다" })
n("ship_dry_dock", "shipbuilding", { "arch_arsenal", "ship_galleon_design" }, { speed = 0.01, label = "건선거에서 선체를 자주 손본다" })
n("ship_copper_sheathing", "shipbuilding", { "ship_dry_dock" }, { speed = 0.02, goods = { "copper" }, goodsMult = 0.04, label = "구리 피복으로 선체가 매끄럽고 구리 수요가 는다" })
n("ship_steam_engine", "shipbuilding", { "ship_copper_sheathing", "phy_newcomen_engine" }, { speed = 0.03, goods = { "coal" }, goodsMult = 0.04, label = "선박용 증기기관, 석탄 수요가 커진다" })
	-- 광물학
n("min_marble", "mineralogy", {}, nil)
n("min_tin", "mineralogy", {}, nil)
n("min_swedish_iron", "mineralogy", {}, nil)
n("min_jet", "mineralogy", {}, nil)
n("min_amber", "mineralogy", {}, nil)
n("min_diamond_raw", "mineralogy", {}, nil)
n("min_tin_ore", "mineralogy", { "min_tin" }, { goods = { "tin" }, goodsMult = 0.05, label = "주석 광맥을 찾아 주석 값이 오른다" })
n("min_falun_copper", "mineralogy", { "min_swedish_iron" }, { goods = { "copper", "iron" }, goodsMult = 0.05, label = "광산 기술로 구리·철 공급이 늘어난다" })
n("min_lodestone", "mineralogy", { "phy_magnetism" }, { goods = { "iron" }, goodsMult = 0.03, label = "자철석 가공으로 나침반 철이 쓰인다" })
n("min_alum", "mineralogy", { "chem_acid_base" }, { goods = { "cloth" }, goodsMult = 0.04, label = "명반이 염색 고정제로 쓰여 옷감 값이 오른다" })
n("min_sulfur", "mineralogy", { "chem_saltpeter" }, { cannon = 0.02, label = "유황을 정제해 화약이 좋아진다" })
	-- 기상학
n("wx_cumulus", "meteorology", {}, nil)
n("wx_fog", "meteorology", {}, nil)
n("wx_sea_breeze", "meteorology", {}, nil)
n("wx_thunderstorm", "meteorology", { "wx_cumulus" }, nil)
n("wx_monsoon", "meteorology", { "wx_sea_breeze" }, { speed = 0.01, label = "계절풍 달력을 만든다" })
n("wx_doldrums", "meteorology", { "wx_sea_breeze" }, nil)
n("wx_storm_glass", "meteorology", { "phy_barometer", "wx_cumulus" }, { speed = 0.01, label = "폭풍 유리로 폭풍을 미리 알아챈다" })
n("wx_waterspout", "meteorology", { "wx_thunderstorm" }, nil)
n("wx_hurricane", "meteorology", { "wx_thunderstorm" }, nil)
n("wx_great_storm", "meteorology", { "wx_hurricane", "wx_storm_glass" }, nil)
	-- 언어학
n("lang_runes", "linguistics", {}, nil)
n("lang_hanse_trade", "linguistics", {}, nil)
n("lang_flag_signals", "linguistics", {}, { speed = 0.01, label = "깃발 신호로 선단이 흩어지지 않는다" })
n("lang_old_norse", "linguistics", { "lang_runes" }, nil)
n("lang_ogham", "linguistics", { "lang_runes" }, nil)
n("lang_lingua_franca", "linguistics", { "lang_hanse_trade" }, nil)
n("lang_translation", "linguistics", { "lang_lingua_franca" }, nil)
n("lang_dictionary", "linguistics", { "lang_translation" }, nil)
n("lang_printing_press", "linguistics", { "lang_dictionary" }, nil)
n("lang_cipher", "linguistics", { "lang_translation" }, nil)
n("lang_hieroglyph", "linguistics", { "lang_translation", "lang_ogham" }, nil)
	-- 고고학(유물)
n("relic_runestone", "archaeology", { "lang_runes" }, nil)
n("relic_viking_ship", "archaeology", { "relic_runestone" }, nil)
n("relic_thor_hammer", "archaeology", { "relic_runestone" }, nil)
n("relic_hansa_cog", "archaeology", {}, nil)
n("relic_hanseatic_seal", "archaeology", { "relic_hansa_cog" }, nil)
n("relic_ship_log", "archaeology", {}, nil)
n("relic_compass", "archaeology", {}, nil)
n("relic_astrolabe", "archaeology", { "relic_compass", "ast_polaris" }, { speed = 0.015, label = "옛 관측기로 위도 재는 법을 되살린다" })
n("relic_sextant", "archaeology", { "relic_astrolabe" }, { speed = 0.015, label = "육분의 쓰는 법이 정리된다" })
n("relic_lostchart_1", "archaeology", {}, nil)
n("relic_lostchart_2", "archaeology", {}, nil)
n("relic_lostchart_3", "archaeology", {}, nil)
n("relic_lostchart", "archaeology", { "relic_lostchart_1", "relic_lostchart_2", "relic_lostchart_3" }, { speed = 0.02, label = "잃어버린 해도를 되살려 옛 항로를 연다" })
	-- 신화·민속학
n("myth_mermaid", "mythology", {}, nil)
n("myth_selkie", "mythology", {}, nil)
n("myth_sea_monk", "mythology", {}, nil)
n("myth_st_elmo", "mythology", {}, nil)
n("myth_ys", "mythology", {}, nil)
n("myth_lyonesse", "mythology", { "myth_ys" }, nil)
n("myth_atlantis", "mythology", { "myth_ys", "myth_lyonesse" }, { goods = { "pearls", "coral" }, goodsMult = 0.03, label = "전설의 대륙 이야기가 보물 수요를 키운다" })
n("myth_brendan", "mythology", { "myth_atlantis" }, { speed = 0.01, label = "전설의 항해자를 본받아 먼 바다로 나선다" })
n("myth_siren", "mythology", { "myth_mermaid" }, nil)
n("myth_charybdis", "mythology", { "myth_siren" }, nil)
n("myth_sea_serpent", "mythology", { "myth_siren" }, nil)
n("myth_kraken", "mythology", { "myth_sea_serpent" }, nil)
n("myth_leviathan", "mythology", { "myth_kraken" }, nil)
n("myth_dutchman", "mythology", { "myth_st_elmo" }, nil)

K.ById = {}
for _, node in K.Nodes do
	K.ById[node.id] = node
end
K.DisciplineById = {}
for _, d in K.Disciplines do
	K.DisciplineById[d.id] = d
end

-- ───────── 인류 학문 분류 (7대 분류 · 끝없이 늘릴 수 있는 스킬 트리) ─────────
-- 분류(Domain) 아래에 학문이 뿌리-가지로 이어진다. 이미 게임에서 연구할 수 있는 학문(위 Disciplines)은 "active",
-- 아직 구현 전인 학문은 "연구 예정(planned)" 줄로 미리 자리를 잡아 둔다. 새 학문은 아래 표에 한 줄만 더하면 된다:
--   p("id", "이름", "분류id", "부모학문id 또는 nil", "한 줄 설명")
-- 부모는 active 학문이거나 다른 planned 학문이어도 되고, 다른 분류에 있어도 된다(학문 간 파생).
K.Domains = {
	{ id = "formal", name = "형식학문", summary = "수·논리·정보처럼 세계를 기호와 증명으로 다루는 학문" },
	{ id = "natural", name = "자연과학", summary = "물질·생명·우주의 법칙을 관찰과 실험으로 밝히는 학문" },
	{ id = "applied", name = "응용·공학·의약", summary = "지식을 배·건물·약·기계 같은 쓸모로 바꾸는 학문" },
	{ id = "humanities", name = "인문학", summary = "말과 글, 역사와 신화, 생각과 믿음을 다루는 학문" },
	{ id = "social", name = "사회과학", summary = "사람 사이의 거래·법·제도·마음을 다루는 학문" },
	{ id = "arts", name = "예술", summary = "그림·음악·글·공연으로 아름다움을 만드는 일" },
	{ id = "practical", name = "실용·생활", summary = "먹고 입고 짓고 기르는 삶의 기술" },
}
K.DomainById = {}
for _, dm in K.Domains do
	K.DomainById[dm.id] = dm
end

-- 이미 연구할 수 있는 학문이 속한 분류
K.DomainOf = {
	philosophy = "humanities", linguistics = "humanities", archaeology = "humanities", mythology = "humanities", history = "humanities",
	physics = "natural", astronomy = "natural", chemistry = "natural", geography = "natural", meteorology = "natural",
	botany = "natural", zoology = "natural", mineralogy = "natural",
	medicine = "applied", architecture = "applied", shipbuilding = "applied", navigation = "applied",
	commerce = "social", art = "arts",
}

-- 연구 예정 학문 (아직 지식 노드·효과가 없는 자리표시)
K.Planned = {}
local function p(id: string, name: string, domain: string, parent: string?, summary: string)
	table.insert(K.Planned, { id = id, name = name, domain = domain, parent = parent, summary = summary, planned = true })
end
-- 형식학문
p("mathematics", "수학", "formal", nil, "수와 도형, 증명. 모든 계산 학문의 뿌리.")
p("logic", "논리학", "formal", "philosophy", "옳은 추론의 규칙.")
p("algebra", "대수학", "formal", "mathematics", "미지수와 방정식.")
p("geometry", "기하학", "formal", "mathematics", "도형과 공간. 측량과 건축의 바탕.")
p("trigonometry", "삼각법", "formal", "geometry", "각과 거리. 천문 항법의 바탕.")
p("probability", "확률론", "formal", "mathematics", "우연을 셈하는 학문. 보험과 도박의 바탕.")
p("statistics", "통계학", "formal", "probability", "자료를 모아 읽는 학문.")
p("calculus", "해석학", "formal", "algebra", "변화를 셈하는 미적분.")
p("computer_science", "정보·컴퓨터과학", "formal", "logic", "계산과 정보의 학문.")
p("cryptography", "암호학", "formal", "mathematics", "비밀을 지키고 푸는 학문.")
-- 자연과학
p("biology", "생물학", "natural", "zoology", "생명 전반의 원리.")
p("ecology", "생태학", "natural", "biology", "생물과 환경의 관계.")
p("genetics", "유전학", "natural", "biology", "대물림의 원리.")
p("microbiology", "미생물학", "natural", "biology", "보이지 않는 작은 생명.")
p("geology", "지질학", "natural", "mineralogy", "땅의 역사와 지층.")
p("oceanography", "해양학", "natural", "geography", "바다의 흐름·깊이·생물.")
p("optics", "광학", "natural", "physics", "빛과 렌즈.")
p("mechanics", "역학", "natural", "physics", "힘과 운동.")
p("thermodynamics", "열역학", "natural", "physics", "열과 증기의 법칙.")
p("electromagnetism", "전자기학", "natural", "physics", "전기와 자기.")
p("organic_chemistry", "유기화학", "natural", "chemistry", "생명 물질의 화학.")
p("cosmology", "우주론", "natural", "astronomy", "우주의 구조와 기원.")
p("climatology", "기후학", "natural", "meteorology", "오랜 날씨의 흐름.")
-- 응용·공학·의약
p("civil_engineering", "토목공학", "applied", "architecture", "다리·운하·항구를 짓는 기술.")
p("mechanical_engineering", "기계공학", "applied", "mechanics", "기계와 증기 기관.")
p("metallurgy", "야금학", "applied", "mineralogy", "광석에서 금속을 뽑는 기술.")
p("pharmacology", "약학", "applied", "medicine", "약재와 처방.")
p("surgery", "외과학", "applied", "medicine", "수술과 부상 치료.")
p("public_health", "보건학", "applied", "medicine", "검역과 위생.")
p("agronomy", "농학", "applied", "botany", "작물과 농사법.")
p("veterinary", "수의학", "applied", "zoology", "가축과 동물의 치료.")
p("cartography", "지도학", "applied", "geography", "지도와 해도 제작.")
p("military_science", "군사학", "applied", "mechanics", "지역마다 다른 병종과 전술, 화포를 다루는 학문. 카드 배틀과 해전의 힘이 된다.")
p("infantry_tactics", "보병술", "applied", "military_science", "방진과 대열로 싸우는 보병의 전술.")
p("cavalry_tactics", "기병술", "applied", "military_science", "말과 낙타, 코끼리를 부리는 기동전.")
p("archery", "궁술·사격술", "applied", "military_science", "활·쇠뇌·화승총으로 멀리서 쏘는 기술.")
p("siegecraft", "공성술", "applied", "military_science", "투석기·충차·공성탑으로 성을 무너뜨리는 기술.")
p("fortification", "축성학", "applied", "military_science", "성벽과 요새를 짓는 학문.")
p("gunnery", "포술", "applied", "military_science", "화약과 대포를 다루는 기술.")
p("naval_warfare", "해전술", "applied", "military_science", "접현과 포격으로 바다에서 싸우는 전술.")
p("strategy", "병법", "applied", "military_science", "전쟁 전체를 읽고 계획하는 학문.")
p("logistics", "병참학", "applied", "military_science", "식량과 무기를 제때 대는 일.")
p("espionage", "첩보술", "applied", "military_science", "정보를 모으고 막는 기술.")
-- 인문학
p("literature", "문학", "humanities", "linguistics", "이야기와 시.")
p("historiography", "역사학", "humanities", "history", "기록을 비판하고 해석하는 학문.")
p("ethics", "윤리학", "humanities", "philosophy", "옳고 그름을 묻는 학문.")
p("aesthetics", "미학", "humanities", "philosophy", "아름다움을 묻는 학문.")
p("theology", "신학", "humanities", "philosophy", "신과 믿음에 대한 학문.")
p("religious_studies", "종교학", "humanities", "mythology", "여러 종교를 견주어 보는 학문.")
p("philology", "문헌학", "humanities", "linguistics", "옛 글을 읽고 바로잡는 학문.")
-- 사회과학
p("economics", "경제학", "social", "commerce", "돈과 시장의 법칙.")
p("law", "법학", "social", "ethics", "법과 계약.")
p("political_science", "정치학", "social", "law", "권력과 나라의 운영.")
p("sociology", "사회학", "social", "philosophy", "사회의 구조와 변화.")
p("anthropology", "인류학", "social", "archaeology", "여러 민족의 삶과 문화.")
p("psychology", "심리학", "social", "philosophy", "마음과 행동.")
p("education", "교육학", "social", "psychology", "가르치고 배우는 일.")
p("human_geography", "인문지리학", "social", "geography", "사람과 땅의 관계.")
-- 예술
p("music", "음악", "arts", "art", "소리의 예술.")
p("painting", "회화", "arts", "art", "그림.")
p("sculpture", "조각", "arts", "art", "돌과 청동으로 빚는 형상.")
p("theater", "연극", "arts", "literature", "무대 위의 이야기.")
p("printmaking", "판화", "arts", "painting", "찍어 내는 그림.")
-- 실용·생활
p("cooking", "요리", "practical", "agronomy", "먹거리를 다루는 기술.")
p("brewing", "양조", "practical", "chemistry", "술과 식초를 빚는 기술.")
p("textiles", "직물·복식", "practical", "botany", "실을 잣고 옷감을 짜는 기술.")
p("crafts", "공예", "practical", "art", "도자기·유리·금속 세공.")
p("sailing_craft", "선원 기술", "practical", "navigation", "매듭·돛 조작·밧줄 다루기.")
p("trade_craft", "장사 기술", "practical", "commerce", "흥정과 장부.")

-- 전체 분류표: active + planned 를 한 표로 (id → { id, name, domain, parent, planned })
K.Taxonomy = {}
K.TaxonomyById = {}
for _, d in K.Disciplines do
	local row = { id = d.id, name = d.name, domain = K.DomainOf[d.id], parent = d.parent, summary = d.summary, planned = false }
	table.insert(K.Taxonomy, row)
	K.TaxonomyById[d.id] = row
end
for _, row in K.Planned do
	table.insert(K.Taxonomy, row)
	K.TaxonomyById[row.id] = row
end

-- 이 학문에서 갈라져 나온 학문들(분류표 기준)
function K.taxonomyChildren(parentId: string?): { any }
	local out = {}
	for _, row in K.Taxonomy do
		if row.parent == parentId then
			table.insert(out, row)
		end
	end
	return out
end

-- 학문이 발달한 항구에서 값이 싸지는(공급이 늘어나는) 관련 교역품
K.DisciplineGoods = {
	astronomy = {},
	physics = { "glass", "iron", "copper", "tin", "coal" },
	chemistry = { "indigo", "cochineal", "logwood", "glass", "nitrate", "guano", "camphor", "leather" },
	art = { "marble", "porcelain", "silk", "lacquer", "ebony" },
	philosophy = {}, linguistics = {}, meteorology = {}, archaeology = {},
	architecture = { "timber", "marble" },
	shipbuilding = { "timber", "copper", "coal", "iron" },
	mineralogy = { "copper", "tin", "iron", "cloth" },
	mythology = { "pearls", "coral" },
	botany = { "tea", "cloves", "nutmeg", "vanilla", "ginseng", "sandalwood" },
	zoology = { "whale_oil", "pearls", "pearl_shell", "ivory", "feathers" },
	medicine = { "camphor", "ginseng" },
	geography = { "cloves", "nutmeg", "pepper", "cinnamon" },
}

K.SPEED_CAP = 0.15

-- 인류의 시대: 이해한 지식이 쌓일수록 항구와 세계가 함께 다음 시대로 넘어간다 (르네상스 → 산업 혁명).
-- 시대가 오르면 항해·연구 성과가 조금씩 커지고, 전환할 때마다 보상과 이야기가 따른다.
K.Eras = {
	{ id = "renaissance", name = "르네상스", need = 0, reward = 0, story = "인쇄기와 원근법이 퍼지고, 항구 도시의 상인들이 학문과 예술을 후원하기 시작했다." },
	{ id = "discovery", name = "대항해 시대", need = 12, reward = 1, story = "항로가 바다 너머로 뻗는다. 항해사의 관측과 지도 제작자의 도법이 새 세계를 그려 낸다." },
	{ id = "revolution", name = "과학 혁명", need = 40, reward = 2, story = "하위헌스의 렌즈, 보일의 공기 펌프, 뉴턴의 중력. 실험과 수학이 옛 믿음을 하나씩 바꾼다." },
	{ id = "enlightenment", name = "계몽의 시대", need = 90, reward = 3, story = "린네가 자연에 이름을 붙이고 프랭클린이 번개를 길들인다. 학회와 사전, 병원이 도시마다 들어선다." },
	{ id = "industrial", name = "산업 혁명", need = 150, reward = 4, story = "증기가 물을 퍼 올리고 배를 민다. 공장과 항구 크레인이 도시의 모습을 바꾼다." },
}

function K.understoodCount(state)
	local n = 0
	for id, v in state.reported or {} do
		if v == true and K.ById[id] then
			n += 1
		end
	end
	return n
end

-- 지금의 시대 번호 (1~5)
function K.eraIndex(state)
	local n, idx = K.understoodCount(state), 1
	for i, era in K.Eras do
		if n >= era.need then
			idx = i
		end
	end
	return idx
end

-- 문명식 해금: 먼 바다는 항해 기술을 이해해야 갈 수 있다 (모험 레벨과 함께 필요).
-- 이미 그 해역 이상에 있는 항구에서는 그대로 오갈 수 있다.
K.RegionGates = {
	new_world = { "nav_cross_staff" },
	indian = { "geo_cape_good_hope", "nav_backstaff" },
	far_east = { "geo_monsoon", "nav_log_line" },
	pacific = { "nav_longitude_problem" },
}

-- 특수 건축물: 항구가 발전하고 학문 기술이 오르면 그 항구에 지을 수 있다 (항구마다 따로).
-- harbor: 필요한 교역소 단계, disc/level: 그 학문의 항구 기술 단계(disc 가 "any" 이면 어느 학문이든), research: 항구 연구 성과 가산
-- expoSlots/expoMult: 박람회, speed: 항해 속도(지은 곳 수만큼), jointFast/jointMult: 공동 발표
K.Landmarks = {
	{ id = "museum", name = "박물관", cost = 2500, harbor = 3, disc = "any", level = 1, research = 0.02, expoSlots = 2, expoMult = 1.15,
		summary = "발견물을 상설 전시한다. 박람회 전시 자리 +2, 박람회 점수 +15%." },
	{ id = "observatory", name = "천문대", cost = 3000, harbor = 3, disc = "astronomy", level = 1, research = 0.02, speed = 0.02,
		summary = "밤하늘 관측소. 항해 속도 +2% (여러 곳에 지으면 겹친다)." },
	{ id = "laboratory", name = "연구소", cost = 3000, harbor = 3, disc = "chemistry", level = 1, research = 0.04,
		summary = "실험 설비를 갖춘 연구소. 이 항구의 연구 성과가 크게 오른다." },
	{ id = "gallery", name = "미술관", cost = 2500, harbor = 3, disc = "art", level = 1, research = 0.04,
		summary = "화가와 공방이 모이는 곳. 이 항구의 연구 성과(예술 교역품 공급)가 오른다." },
	{ id = "hall", name = "학술원", cost = 8000, harbor = 4, disc = "any", level = 2, research = 0.03, jointFast = 30, jointMult = 1.5,
		summary = "학자들의 모임터. 공동 발표 쿨타임 30일, 기술 점수 +50%." },
}
K.LandmarkById = {}
for _, lm in K.Landmarks do
	K.LandmarkById[lm.id] = lm
end

function K.hasLandmark(state, portId, id)
	local t = state.landmarks and state.landmarks[portId]
	return t ~= nil and t[id] == true
end

-- 이해한(보고한) 지식인가
function K.understood(state, id)
	return state.reported ~= nil and state.reported[id] == true
end

-- 지식 카드 중 트리에 아직 없는 것을 학문별로 채운다 (카드의 분야 → 학문). 쉬운 카드는 선행 없이, 희귀한 카드는 그 학문의 첫 지식을 이해해야 한다.
-- Knowledge 서비스가 시작할 때 한 번 부른다.
function K.autofill(cards: { any })
	if K.filled then
		return
	end
	K.filled = true
	local byField = {}
	for _, d in K.Disciplines do
		byField[d.field] = d.id
	end
	local roots = {}
	for _, node in K.Nodes do
		if #node.needs == 0 and not roots[node.disc] then
			roots[node.disc] = node.id
		end
	end
	for _, c in cards do
		local disc = byField[c.field]
		if disc and not K.ById[c.id] then
			local needs = {}
			if (c.rarity == "Rare" or c.rarity == "Epic" or c.rarity == "Legendary") and roots[disc] then
				needs = { roots[disc] }
			end
			local node = { id = c.id, disc = disc, needs = needs, fx = nil, auto = true }
			table.insert(K.Nodes, node)
			K.ById[c.id] = node
		end
	end
end

-- 학문이 열려 있는가: 뿌리 학문에서 지식을 openAt 개 이해했거나, 이미 이 학문의 지식을 이해했으면 열려 있다.
function K.disciplineOpen(state, discId)
	local d = K.DisciplineById[discId]
	if not d or not d.openAt then
		return true
	end
	local parentDone, ownDone = 0, 0
	for _, node in K.Nodes do
		if state.reported and state.reported[node.id] then
			if node.disc == d.parent then
				parentDone += 1
			elseif node.disc == discId then
				ownDone += 1
			end
		end
	end
	return parentDone >= d.openAt or ownDone > 0, parentDone
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
	if not K.disciplineOpen(state, node.disc) then
		return "closed", {}
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
	for portId, t in state.landmarks or {} do
		for id in t do
			local lm = K.LandmarkById[id]
			if lm and lm.speed then
				total += lm.speed
			end
		end
	end
	total += 0.005 * (K.eraIndex(state) - 1)
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
