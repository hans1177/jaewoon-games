--!strict
-- 탐험 지점. 항구에서 탐험하면 pool 안의 카드를 발견할 수 있다 (이미 발견한 카드는 제외).

export type Site = {
	id: string,
	name: string,
	portId: string,
	minLevel: number, -- 모험 레벨
	days: number, -- 탐험에 걸리는 날
	pool: { string }, -- 카드 id
}

local Sites: { Site } = {
	{ id = "london_fields", name = "런던 근교 들판", portId = "london", minLevel = 1, days = 1, pool = { "bot_oak", "bot_foxglove", "min_chalk" } },
	{ id = "salisbury_plain", name = "솔즈베리 평원", portId = "london", minLevel = 3, days = 3, pool = { "site_stonehenge" } },
	{ id = "royal_archive", name = "왕립학회 기록 보관소", portId = "london", minLevel = 4, days = 2, pool = { "phy_papin_digester", "phy_savery_pump", "phy_newcomen_engine" } },
	{ id = "amsterdam_gardens", name = "암스테르담 정원", portId = "amsterdam", minLevel = 1, days = 1, pool = { "bot_tulip", "bot_oak" } },
	{ id = "antwerp_cabinet", name = "수집가의 진열실", portId = "antwerp", minLevel = 2, days = 1, pool = { "relic_aeolipile" } },
	{ id = "rouen_coast", name = "노르망디 해안", portId = "rouen", minLevel = 1, days = 1, pool = { "min_chalk", "bot_foxglove" } },
	{ id = "brittany_stones", name = "브르타뉴 선돌 밭", portId = "bordeaux", minLevel = 3, days = 3, pool = { "site_carnac" } },
	{ id = "copenhagen_shore", name = "외레순 해안", portId = "copenhagen", minLevel = 1, days = 1, pool = { "min_amber", "zoo_puffin" } },
	{ id = "copenhagen_observatory", name = "코펜하겐 천문대", portId = "copenhagen", minLevel = 3, days = 1, pool = { "ast_comet", "ast_jupiter_moons" } },
	{ id = "gothenburg_forest", name = "서스웨덴 숲", portId = "gothenburg", minLevel = 1, days = 1, pool = { "zoo_reindeer", "bot_oak" } },
	{ id = "runestone_field", name = "룬석 들판", portId = "gothenburg", minLevel = 2, days = 2, pool = { "relic_runestone" } },
	{ id = "bergen_cliffs", name = "베르겐 해안 절벽", portId = "bergen", minLevel = 2, days = 1, pool = { "zoo_puffin", "zoo_reindeer" } },
	{ id = "boyne_valley", name = "보인 계곡", portId = "dublin", minLevel = 3, days = 3, pool = { "site_newgrange" } },
	{ id = "stockholm_woods", name = "스톡홀름 군도 숲", portId = "stockholm", minLevel = 1, days = 1, pool = { "zoo_elk", "ast_aurora" } },
	{ id = "falun_mine", name = "팔룬 광산", portId = "stockholm", minLevel = 3, days = 3, pool = { "min_falun_copper" } },
	{ id = "giants_causeway", name = "북동 해안 바위길", portId = "dublin", minLevel = 4, days = 3, pool = { "site_giants_causeway" } },
	{ id = "orkney_village", name = "오크니 신석기 마을", portId = "edinburgh", minLevel = 4, days = 3, pool = { "site_skara_brae" } },
	{ id = "viking_harbor", name = "옛 바이킹 항구", portId = "bergen", minLevel = 2, days = 1, pool = { "relic_viking_ship", "ast_aurora" } },
	{ id = "seville_groves", name = "과달키비르 강변 숲", portId = "seville", minLevel = 1, days = 1, pool = { "bot_cork_oak", "geo_canary_current" } },
	{ id = "marseille_calanques", name = "칼랑크 해안", portId = "marseille", minLevel = 1, days = 1, pool = { "geo_mistral", "bot_citrus" } },
	{ id = "genoa_gardens", name = "리구리아 언덕 정원", portId = "genoa", minLevel = 1, days = 1, pool = { "bot_citrus" } },
	{ id = "venice_arsenal", name = "베네치아 조선소 자료실", portId = "venice", minLevel = 2, days = 1, pool = { "relic_arsenal" } },
	{ id = "venice_lagoon", name = "베네치아 석호", portId = "venice", minLevel = 1, days = 1, pool = { "zoo_lagoon_birds" } },
	{ id = "livorno_lab", name = "토스카나 실험실", portId = "livorno", minLevel = 2, days = 1, pool = { "zoo_redi_experiment" } },
	{ id = "vesuvius_slopes", name = "베수비오 기슭", portId = "naples", minLevel = 3, days = 2, pool = { "min_vesuvius" } },
	{ id = "pompeii_ruins", name = "폼페이 발굴지", portId = "naples", minLevel = 4, days = 3, pool = { "site_pompeii" } },
	{ id = "provence_fields", name = "프로방스 라벤더 밭", portId = "marseille", minLevel = 1, days = 1, pool = { "bot_lavender" } },
	{ id = "marseille_salt", name = "카마르그 염전", portId = "marseille", minLevel = 2, days = 1, pool = { "min_rock_salt" } },
	{ id = "pont_du_gard", name = "론 강변 로마 유적", portId = "marseille", minLevel = 4, days = 3, pool = { "site_pont_du_gard" } },
	{ id = "genoa_olive", name = "리구리아 올리브 밭", portId = "genoa", minLevel = 1, days = 1, pool = { "bot_olive" } },
	{ id = "genoa_instruments", name = "제노바 항해기구 공방", portId = "genoa", minLevel = 2, days = 1, pool = { "relic_compass", "phy_barometer" } },
	{ id = "carrara_quarry", name = "카라라 채석장", portId = "livorno", minLevel = 2, days = 2, pool = { "min_marble" } },
	{ id = "naples_coins", name = "나폴리 발굴 창고", portId = "naples", minLevel = 2, days = 1, pool = { "relic_roman_coin" } },
	{ id = "seville_cathedral", name = "세비야 대성당", portId = "seville", minLevel = 3, days = 1, pool = { "site_giralda", "relic_astrolabe" } },
	{ id = "gibraltar_rock", name = "남쪽 바위산", portId = "seville", minLevel = 3, days = 2, pool = { "zoo_barbary_ape" } },
	{ id = "lisbon_navigators", name = "리스본 항해자 기록실", portId = "lisbon", minLevel = 2, days = 1, pool = { "geo_trade_winds", "relic_astrolabe" } },
	{ id = "dublin_potatoes", name = "아일랜드 감자밭", portId = "dublin", minLevel = 1, days = 1, pool = { "bot_potato" } },
	{ id = "edinburgh_coast", name = "포스 만 해안", portId = "edinburgh", minLevel = 1, days = 1, pool = { "zoo_seal", "zoo_salmon" } },
	{ id = "hadrian_hills", name = "북쪽 로마 방벽", portId = "edinburgh", minLevel = 4, days = 3, pool = { "site_hadrian_wall" } },
	{ id = "edinburgh_hospital", name = "에든버러 병원", portId = "edinburgh", minLevel = 3, days = 1, pool = { "med_lime_scurvy", "phi_empiricism" } },
	{ id = "london_hospital", name = "런던 병원", portId = "london", minLevel = 2, days = 1, pool = { "med_inoculation" } },
	{ id = "london_lab", name = "왕립학회 실험실", portId = "london", minLevel = 3, days = 1, pool = { "phy_boyle_law", "ast_halley_comet" } },
	{ id = "amsterdam_garden", name = "암스테르담 식물원", portId = "amsterdam", minLevel = 2, days = 1, pool = { "bot_tea_plant" } },
	{ id = "amsterdam_polder", name = "네덜란드 간척지", portId = "amsterdam", minLevel = 1, days = 1, pool = { "geo_polder" } },
	{ id = "amsterdam_telescope", name = "암스테르담 관측대", portId = "amsterdam", minLevel = 3, days = 1, pool = { "ast_saturn_rings" } },
	{ id = "bergen_whale", name = "베르겐 앞바다", portId = "bergen", minLevel = 2, days = 2, pool = { "zoo_whale" } },
	{ id = "stockholm_mine", name = "스톡홀름 철광", portId = "stockholm", minLevel = 2, days = 2, pool = { "min_swedish_iron" } },
	{ id = "hamburg_lab", name = "함부르크 연금술 공방", portId = "hamburg", minLevel = 2, days = 1, pool = { "chem_phosphorus" } },
	{ id = "rouen_powder", name = "루앙 화약 공방", portId = "rouen", minLevel = 1, days = 1, pool = { "chem_gunpowder_refine" } },
	{ id = "amsterdam_fog", name = "안개 낀 부두", portId = "amsterdam", minLevel = 5, days = 1, pool = { "myth_dutchman" } },
	{ id = "lisbon_legend", name = "리스본 항구 전설", portId = "lisbon", minLevel = 4, days = 1, pool = { "myth_atlantis" } },
	{ id = "edinburgh_legend", name = "해안 전설", portId = "edinburgh", minLevel = 3, days = 1, pool = { "myth_selkie" } },
	{ id = "lisbon_apothecary", name = "리스본 약재상", portId = "lisbon", minLevel = 2, days = 1, pool = { "med_cinchona" } },
	{ id = "hamburg_docks", name = "함부르크 항구 도서관", portId = "hamburg", minLevel = 2, days = 1, pool = { "phy_pendulum" } },
}

return {
	Sites = Sites,
}
