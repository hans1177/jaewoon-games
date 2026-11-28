--!nonstrict
-- DiscoveryForms.luau · 백과 실물 카드(식물·동물·광물·유물·유적)의 지상 탐험 외형 매핑표 (2026-11-24 오너 지시)
-- 항목마다 모델을 따로 만들지 않고 "대표 모양(archetype) + 변형(색·크기·무리)"으로 보여 준다.
-- 모델은 이미 등록·승인된 MareAssets 만 쓴다. 맞는 모델이 없으면 다른 종으로 때우지 않고
-- '관찰 기록 현장'(야영 흔적 + 카드 원화)으로 보여 주며, 부족 자산 목록(docs/discoveries/MISSING.md)에 올린다.
-- 순수 데이터·계산 모듈: 서버 보상·저장과 무관하다.

local DF = {}

-- [드롭박스 자동 배치] 카드 id 와 같은 이름으로 등록된 모델(예: Animals/zoo_tiger)이 있으면 그 카드 전용 실물로 쓴다.
-- 등록표(AssetIds)는 로블록스 쪽(DiscoveryStage)이 DF.assetIds 로 넣어 준다(로직 테스트에서는 없음).
DF.assetIds = nil :: any
local OWN_GROUPS = { "Animals", "Terrain", "Relics", "Town", "Castle", "Naval", "Monsters", "Interior", "Cargo" }
function DF.ownModel(cardId: string)
	local ids = DF.assetIds
	if type(ids) ~= "table" then return nil end
	for _, g in OWN_GROUPS do
		if ids[g .. "/" .. cardId] ~= nil then return { g, cardId } end
	end
	return nil
end

-- 대표 모양: 모델 후보 { 그룹, 이름 }, 기본 크기(스터드), 무리 수, 조사 방법, 장소 힌트
-- method: sketch(스케치·동물) / collect(채집·식물·광물) / rubbing(탁본·유적) / inspect(조사·유물)
DF.ARCHETYPES = {
	-- 식물
	tree_broadleaf = { kind = "plant", models = { { "Terrain", "tree-oak" }, { "Terrain", "tree-detailed" }, { "Terrain", "tree-default-fall" } }, size = 14, cluster = 3, method = "collect", place = "숲·들판" },
	tree_conifer = { kind = "plant", models = { { "Terrain", "tree-pinedefaulta" }, { "Terrain", "tree-pinetalla-detailed" }, { "Terrain", "north-pine-fall" } }, size = 15, cluster = 3, method = "collect", place = "북쪽 숲·산" },
	tree_palm = { kind = "plant", models = { { "Terrain", "tropical-palm-tall" }, { "Terrain", "tree-palmdetailedtall" }, { "Terrain", "kenney_tree_palmShort" } }, size = 13, cluster = 3, method = "collect", place = "열대 해안·오아시스" },
	tree_wetland = { kind = "plant", models = { { "Terrain", "tree-plateau" }, { "Terrain", "tree-thin" } }, size = 11, cluster = 4, method = "collect", place = "강가·습지·맹그로브" },
	tree_arid = { kind = "plant", models = { { "Terrain", "tree-plateau-fall" }, { "Terrain", "arid-cactus-tall" } }, size = 10, cluster = 2, method = "collect", place = "건조한 사바나·사막" },
	shrub = { kind = "plant", models = { { "Terrain", "plant-bushdetailed" }, { "Terrain", "forest-bush-detailed" }, { "Terrain", "plant-bushlarge" } }, size = 3.2, cluster = 5, method = "collect", place = "들판·언덕" },
	flower = { kind = "plant", models = { { "Terrain", "forest-flower-purple" }, { "Terrain", "forest-flower-yellow" } }, size = 2.2, cluster = 6, method = "collect", place = "꽃밭·초원", bloom = true },
	crop = { kind = "plant", models = { { "Terrain", "crops-wheatstageb" }, { "Terrain", "crops-cornstagec" }, { "Terrain", "crop-turnip" } }, size = 2.6, cluster = 6, method = "collect", place = "농지·마을 밖 밭" },
	vine = { kind = "plant", models = { { "Terrain", "hanging-moss" }, { "Terrain", "plant-flattall" } }, size = 4, cluster = 4, method = "collect", place = "덩굴진 숲·포도밭" },
	succulent = { kind = "plant", models = { { "Terrain", "arid-cactus-short" }, { "Terrain", "arid-cactus-tall" } }, size = 4, cluster = 4, method = "collect", place = "사막·건조 지대" },
	bamboo = { kind = "plant", models = { { "Terrain", "east-bamboo-grove" } }, size = 12, cluster = 2, method = "collect", place = "동아시아 숲" },
	mushroom = { kind = "plant", models = { { "Terrain", "kenney_mushroom_redGroup" }, { "Terrain", "kenney_mushroom_tanGroup" } }, size = 1.6, cluster = 4, method = "collect", place = "그늘진 숲 바닥", weather = "rain" },
	seaweed = { kind = "plant", models = { { "Naval", "grass-plant" }, { "Terrain", "coast-grass-patch" } }, size = 2.4, cluster = 5, method = "collect", place = "바닷가·갯바위" },
	-- 동물 (정확히 같은 종 모델이 있을 때만 실물. 없으면 관찰 기록 현장)
	animal_large = { kind = "animal", models = {}, size = 6, cluster = 1, method = "sketch", place = "초원·숲 가장자리" },
	animal_small = { kind = "animal", models = {}, size = 2, cluster = 2, method = "sketch", place = "덤불·굴 근처" },
	bird = { kind = "animal", models = {}, size = 1.6, cluster = 4, method = "sketch", place = "해안 절벽·물가" },
	marine = { kind = "animal", models = {}, size = 4, cluster = 1, method = "sketch", place = "해안·만" },
	fish = { kind = "animal", models = {}, size = 1.2, cluster = 5, method = "sketch", place = "강·어장" },
	reptile = { kind = "animal", models = {}, size = 2, cluster = 1, method = "sketch", place = "따뜻한 물가·바위" },
	insect = { kind = "animal", models = {}, size = 0.6, cluster = 6, method = "sketch", place = "꽃밭·숲" },
	-- 광물
	rock_outcrop = { kind = "mineral", models = { { "Terrain", "rock-largea" }, { "Terrain", "rock-tallc" }, { "Terrain", "kenney_rock_largeB" } }, size = 6, cluster = 2, method = "collect", place = "절벽·바위 언덕" },
	crystal = { kind = "mineral", models = { { "Terrain", "mystic-crystals" } }, size = 3, cluster = 2, method = "collect", place = "동굴·광맥" },
	ore = { kind = "mineral", models = { { "Terrain", "kenney_rock_tallE" }, { "Terrain", "rock-talld" } }, size = 5, cluster = 2, method = "collect", place = "광산·채석장", tools = { "Relics", "hammer" } },
	volcanic = { kind = "mineral", models = { { "Terrain", "rock-talli" }, { "Terrain", "kenney_rock_largeD" } }, size = 6, cluster = 2, method = "collect", place = "화산 지대", tint = { 58, 52, 50 } },
	salt = { kind = "mineral", models = { { "Terrain", "rock-largec" } }, size = 4, cluster = 3, method = "collect", place = "염전·건조한 호숫가", tint = { 236, 232, 222 } },
	resin = { kind = "mineral", models = { { "Terrain", "mystic-crystals" } }, size = 1.6, cluster = 3, method = "collect", place = "해안·숲 바닥", tint = { 220, 140, 40 } },
	clay = { kind = "mineral", models = { { "Terrain", "kenney_stone_largeB" } }, size = 3, cluster = 3, method = "collect", place = "강둑·점토층" },
	-- 유물
	coin = { kind = "relic", models = { { "Relics", "coin" } }, size = 1.4, cluster = 3, method = "inspect", place = "유적 바닥·난파선" },
	weapon = { kind = "relic", models = { { "Relics", "weapon-sword" }, { "Relics", "shield-round" }, { "Relics", "weapon-axe" } }, size = 3, cluster = 1, method = "inspect", place = "옛 전장·무덤" },
	instrument = { kind = "relic", models = { { "Relics", "compass-base" }, { "Relics", "drafting-compass" }, { "Relics", "magnifying-glass" } }, size = 1.8, cluster = 1, method = "inspect", place = "옛 관측소·서재 터" },
	document = { kind = "relic", models = { { "Relics", "map-rolled" }, { "Relics", "journal-open" }, { "Relics", "blueprint" } }, size = 1.8, cluster = 1, method = "inspect", place = "학자 야영지·기록 보관소" },
	vessel = { kind = "relic", models = { { "Relics", "pot" } }, size = 2, cluster = 2, method = "inspect", place = "무역항 터·무덤" },
	stone_relic = { kind = "relic", models = { { "Terrain", "altar-stone" }, { "Terrain", "statue-head" }, { "Terrain", "pillar-obelisk" } }, size = 4, cluster = 1, method = "rubbing", place = "고대 제단·석비" },
	ship_model = { kind = "relic", models = { { "Naval", "boat-sail-a" }, { "Naval", "boat-row-small" } }, size = 4, cluster = 1, method = "inspect", place = "옛 조선소·해안" },
	treasure = { kind = "relic", models = { { "Naval", "chest" } }, size = 2.4, cluster = 1, method = "inspect", place = "난파선·동굴" },
	-- 유적·건축 (멀리서 보이는 탐험 목표)
	ruin_classical = { kind = "site", models = { { "Terrain", "greek-ruins-a" }, { "Terrain", "greek-ruins-b" }, { "Terrain", "greek-column" } }, size = 22, cluster = 1, method = "rubbing", place = "지중해 언덕", landmark = true },
	ruin_meso = { kind = "site", models = {}, size = 22, cluster = 1, method = "rubbing", place = "중남미 밀림·고원", landmark = true },
	ruin_egypt = { kind = "site", models = { { "Terrain", "egypt-temple-arch-a" }, { "Terrain", "egypt-obelisk" }, { "Terrain", "egypt-column" } }, size = 22, cluster = 1, method = "rubbing", place = "강가 사막", landmark = true },
	stone_circle = { kind = "site", models = { { "Terrain", "statue-ring" }, { "Terrain", "altar-stone" } }, size = 18, cluster = 1, method = "rubbing", place = "평원·고지", landmark = true },
	fortress = { kind = "site", models = { { "Castle", "fortress" }, { "Castle", "tower-square-base" }, { "Castle", "wall-corner-half-tower" } }, size = 26, cluster = 1, method = "rubbing", place = "항구 언덕·해안 절벽", landmark = true },
	tower = { kind = "site", models = { { "Castle", "tower-hexagon-base" }, { "Terrain", "pillar-obelisk" } }, size = 22, cluster = 1, method = "rubbing", place = "해안·도시 가장자리", landmark = true },
	sacred = { kind = "site", models = { { "Town", "church" }, { "Town", "bell-tower" }, { "Town", "eastasia-bell" } }, size = 24, cluster = 1, method = "rubbing", place = "도시 중심·성지", landmark = true },
	amphitheater = { kind = "site", models = { { "Terrain", "greek-amphitheater" } }, size = 26, cluster = 1, method = "rubbing", place = "고대 도시", landmark = true },
	bridge = { kind = "site", models = { { "Terrain", "bridge-stone" }, { "Castle", "bridge-straight" } }, size = 18, cluster = 1, method = "rubbing", place = "강 건너", landmark = true },
	mound = { kind = "site", models = { { "Terrain", "platform-grass" }, { "Terrain", "crypt-large" } }, size = 16, cluster = 1, method = "rubbing", place = "평원 고분", landmark = true },
	harbor_site = { kind = "site", models = { { "Naval", "dock-side" }, { "Town", "cart-high" } }, size = 16, cluster = 1, method = "rubbing", place = "옛 부두·운하", landmark = true },
	natural_wonder = { kind = "site", models = { { "Terrain", "cliff-waterfall-rock" }, { "Terrain", "cliff-large-stone" }, { "Terrain", "land-waterfall" } }, size = 26, cluster = 1, method = "sketch", place = "해안 절벽·폭포", landmark = true },
	city_ruin = { kind = "site", models = { { "Terrain", "ruins-wall-arched" }, { "Terrain", "mystic-broken-wall" }, { "Terrain", "ruins-pillar-decorated" } }, size = 20, cluster = 1, method = "rubbing", place = "옛 도시 터", landmark = true },
}

-- 정확히 같은 종이 등록된 동물만 실물 모델로 보여 준다(다른 종 대체 금지). 카드 id 로만 지정한다.
-- 들소(am_bison)는 소(cow) 모델과 다른 종이라 넣지 않는다.
DF.EXACT_ANIMALS = {
	zoo_elephant = "elephant", zoo_indian_elephant = "elephant", am_llama = "llama",
}

-- 분류 규칙: 위에서부터 처음 맞는 것. 단어는 카드 이름(한국어)과 id 에서 찾는다.
local RULES = {
	-- 문헌·이론형(무형) 카드: 학자 야영지 기록으로
	{ "*", { "이명법", "체계", "해부", "분류", "실험", "변태", "연구", "기록", "표본", "도감", "notes", "systema", "binomial", "anatomy", "experiment", "herbarium", "metamorphosis", "theory", "층서", "지층", "rock_layers" }, "document" },
	-- 식물
	{ "Botany", { "야자", "palm" }, "tree_palm" },
	{ "Botany", { "소나무", "전나무", "가문비", "노간주", "삼나무", "편백", "pine", "juniper", "spruce", "cedar", "fir", "larch", "낙엽송" }, "tree_conifer" },
	{ "Botany", { "맹그로브", "버드나무", "willow", "mangrove", "연꽃", "lotus", "파피루스", "papyrus" }, "tree_wetland" },
	{ "Botany", { "바오바브", "아카시아", "용혈수", "baobab", "acacia", "dragon_tree", "유향", "몰약", "frankincense", "myrrh" }, "tree_arid" },
	{ "Botany", { "선인장", "알로에", "용설란", "cactus", "aloe", "agave" }, "succulent" },
	{ "Botany", { "대나무", "bamboo" }, "bamboo" },
	{ "Botany", { "버섯", "송로", "mushroom", "truffle" }, "mushroom" },
	{ "Botany", { "켈프", "해초", "사구", "kelp", "seaweed", "dune_grass" }, "seaweed" },
	{ "Botany", { "포도", "덩굴", "후추", "바닐라", "홉", "grape", "vine", "pepper", "vanilla", "hops" }, "vine" },
	{ "Botany", { "튤립", "폭스글러브", "라벤더", "프로테아", "장미", "백합", "양귀비", "사프란", "난초", "꽃", "tulip", "foxglove", "lavender", "protea", "rose", "lily", "poppy", "saffron", "orchid" }, "flower" },
	{ "Botany", { "감자", "호밀", "보리", "밀", "아마", "옥수수", "쌀", "벼", "사탕수수", "목화", "카사바", "토마토", "potato", "rye", "barley", "wheat", "flax", "maize", "rice", "sugar", "cotton", "cassava", "tomato" }, "crop" },
	{ "Botany", { "히스", "차나무", "크랜베리", "커피", "코카", "카카오", "콜라", "heather", "tea", "cranberry", "coffee", "coca", "cacao", "kola" }, "shrub" },
	{ "Botany", { "*" }, "tree_broadleaf" },
	-- 동물
	{ "Zoology", { "곤충", "나비", "벌", "개미", "누에", "반딧불", "insect", "butterfly", "bee", "silkworm", "firefly" }, "insect" },
	{ "Zoology", { "고래", "돌고래", "범고래", "바다표범", "바다사자", "바다코끼리", "바다소", "일각", "물범", "whale", "dolphin", "orca", "seal", "walrus", "manatee", "narwhal", "dugong" }, "marine" },
	{ "Zoology", { "연어", "대구", "청어", "고등어", "참치", "날치", "상어", "굴", "가재", "문어", "오징어", "산호", "fish", "salmon", "cod", "herring", "mackerel", "tuna", "shark", "oyster", "lobster", "octopus", "squid", "coral" }, "fish" },
	{ "Zoology", { "거북", "악어", "도마뱀", "이구아나", "뱀", "개구리", "turtle", "crocodile", "lizard", "iguana", "snake", "frog", "tortoise", "komodo" }, "reptile" },
	{ "Zoology", { "새", "퍼핀", "갈매기", "황새", "가넷", "솜털오리", "수리", "독수리", "홍학", "타조", "펭귄", "앵무", "공작", "알바트로스", "펠리컨", "도도", "키위", "올빼미", "부엉이", "벌새", "bird", "puffin", "gull", "stork", "gannet", "eider", "eagle", "flamingo", "ostrich", "penguin", "parrot", "peacock", "albatross", "pelican", "dodo", "kiwi", "owl", "hummingbird", "condor", "lagoon_birds" }, "bird" },
	{ "Zoology", { "여우", "비버", "토끼", "수달", "다람쥐", "원숭이", "나무늘보", "박쥐", "fox", "beaver", "rabbit", "otter", "squirrel", "monkey", "ape", "sloth", "bat", "lemur", "kangaroo", "koala", "platypus" }, "animal_small" },
	{ "Zoology", { "*" }, "animal_large" },
	-- 광물
	{ "Mineral", { "석영", "루비", "사파이어", "청금석", "옥", "다이아", "에메랄드", "자수정", "수정", "quartz", "ruby", "sapphire", "lapis", "jade", "diamond", "emerald", "amethyst", "crystal" }, "crystal" },
	{ "Mineral", { "호박", "흑옥", "진주", "amber", "jet", "pearl" }, "resin" },
	{ "Mineral", { "부석", "흑요석", "유황", "현무암", "베수비오", "화산", "pumice", "obsidian", "sulfur", "basalt", "vesuvius", "volcan" }, "volcanic" },
	{ "Mineral", { "암염", "소금", "초석", "명반", "salt", "saltpeter", "alum", "nitrate" }, "salt" },
	{ "Mineral", { "고령토", "점토", "이탄", "라테라이트", "kaolin", "clay", "peat", "laterite" }, "clay" },
	{ "Mineral", { "구리", "주석", "철", "은", "금", "납", "탄층", "석탄", "광석", "자철", "copper", "tin", "iron", "silver", "gold", "lead", "coal", "ore", "lodestone", "falun" }, "ore" },
	{ "Mineral", { "*" }, "rock_outcrop" },
	-- 유물
	{ "Relic", { "동전", "주화", "금화", "coin" }, "coin" },
	{ "Relic", { "검", "투구", "방패", "도끼", "망치", "창", "갑옷", "helm", "sword", "shield", "axe", "hammer", "spear", "armor" }, "weapon" },
	{ "Relic", { "아스트롤라베", "육분의", "나침반", "모래시계", "해시계", "망원경", "astrolabe", "sextant", "compass", "hourglass", "sundial", "telescope", "aeolipile", "기계" }, "instrument" },
	{ "Relic", { "해도", "지도", "일지", "칙허", "헌장", "문서", "서적", "필사본", "세밀화", "chart", "map", "log", "charter", "manuscript", "miniature", "codex", "scroll" }, "document" },
	{ "Relic", { "룬", "오검", "석비", "석상", "두상", "신상", "rune", "ogham", "stone", "statue", "head", "stele" }, "stone_relic" },
	{ "Relic", { "선박", "배", "코그", "다우", "ship", "cog", "dhow", "model" }, "ship_model" },
	{ "Relic", { "항아리", "암포라", "도자", "꽃병", "그릇", "접시", "amphora", "vase", "pot", "plate", "bowl" }, "vessel" },
	{ "Relic", { "*" }, "treasure" },
	-- 유적
	{ "Site", { "폭포", "주상절리", "자이언츠", "동굴", "협곡", "fall", "causeway", "cave", "canyon" }, "natural_wonder" },
	{ "Site", { "스톤헨지", "카르나크", "링", "열석", "stonehenge", "carnac", "brodgar", "circle" }, "stone_circle" },
	{ "Site", { "피라미드", "신전", "오벨리스크", "스핑크스", "pyramid", "giza", "temple", "obelisk", "karnak", "luxor", "abu_simbel" }, "ruin_egypt" },
	{ "Site", { "원형경기장", "아레나", "콜로세움", "amphitheater", "arena", "colosseum" }, "amphitheater" },
	{ "Site", { "파르테논", "파이스툼", "폼페이", "헤르쿨라네움", "로마", "그리스", "parthenon", "paestum", "pompeii", "herculaneum", "roman", "greek", "acropolis" }, "ruin_classical" },
	{ "Site", { "성당", "교회", "모스크", "사원", "탑사", "소피아", "cathedral", "church", "mosque", "shrine", "pagoda", "sophia", "abbey", "미셸" }, "sacred" },
	{ "Site", { "성", "요새", "성벽", "궁", "알함브라", "castle", "fort", "walls", "palace", "alhambra", "kronborg" }, "fortress" },
	{ "Site", { "탑", "등대", "파로스", "tower", "lighthouse", "pharos", "giralda" }, "tower" },
	{ "Site", { "다리", "수도교", "bridge", "aqueduct", "pont" }, "bridge" },
	{ "Site", { "고분", "봉분", "무덤", "mound", "newgrange", "tomb", "barrow" }, "mound" },
	{ "Site", { "부두", "운하", "크레인", "창고", "wharf", "canal", "crane", "quay", "speicher", "bryggen" }, "harbor_site" },
	{ "Site", { "*" }, "city_ruin" },
}

-- 이름으로 정확히 맞추는 예외(키워드 규칙이 헷갈리는 항목)
local NAME_OVERRIDE = {
	["가오리"] = "fish",
	["노랑가오리"] = "fish",
	["만타가오리"] = "fish",
	["고깔해파리"] = "fish",
	["바라쿠다"] = "fish",
	["피라냐"] = "fish",
	["비단잉어"] = "fish",
	["대왕조개"] = "fish",
	["해마"] = "fish",
	["해삼"] = "fish",
	["소라게"] = "fish",
	["만새기"] = "fish",
	["앵무조개"] = "fish",
	["가마우지"] = "bird",
	["두루미"] = "bird",
	["에뮤"] = "bird",
	["벌새"] = "bird",
	["아나콘다"] = "reptile",
	["카멜레온"] = "reptile",
	["모아의 뼈"] = "document",
	["쐐기문자 점토판"] = "document",
	["해적 계약서"] = "document",
	["정교회 성화"] = "document",
	["건선거"] = "harbor_site",
	["세관"] = "harbor_site",
	["수상 시장"] = "harbor_site",
	["수상 가옥"] = "harbor_site",
	["쉐다곤 파고다"] = "sacred",
	["바간"] = "sacred",
	["앙코르 와트"] = "sacred",
	["함피"] = "sacred",
	["바다 위 도리이"] = "sacred",
	["보로부두르"] = "sacred",
	["산치 대탑"] = "sacred",
	["테이블 산"] = "natural_wonder",
	["붉은 바위"] = "natural_wonder",
	["부유한 산"] = "natural_wonder",
	["코파카바나 해안"] = "natural_wonder",
	["골든게이트"] = "natural_wonder",
	["이스터 섬"] = "stone_relic",
	["모아이"] = "stone_relic",
	["아즈텍 태양석"] = "stone_relic",
	["델리의 철 기둥"] = "stone_relic",
	["오검 문자 돌"] = "stone_relic",
	["나스카 선"] = "mound",
	["염전"] = "salt",
	["암염 결정"] = "salt",
	["흑옥"] = "resin",
	["붉은 산호"] = "resin",
	["흰 산호"] = "resin",
	["퇴적암 지층"] = "rock_outcrop",
	["파르테논 신전"] = "ruin_classical",
	["파이스툼의 신전"] = "ruin_classical",
	["마야 계단 피라미드"] = "ruin_meso",
	["태양의 피라미드"] = "ruin_meso",
	["고추"] = "shrub",
	["인디고 풀"] = "shrub",
	["인삼"] = "shrub",
	["타임"] = "shrub",
	["타로"] = "shrub",
	["함초"] = "shrub",
	["히비스커스"] = "shrub",
	["파인애플"] = "shrub",
	["라플레시아"] = "flower",
	["코코넛"] = "tree_palm",
	["검은 수염의 깃발"] = "treasure",
	["배 종"] = "treasure",
	["해상 시계"] = "instrument",
	["사분의"] = "instrument",
	["지구의"] = "instrument",
	["부싯돌 권총"] = "weapon",
	["커틀러스"] = "weapon",
	["옛 대포"] = "weapon",
}

-- 시간·날씨 조건(외형만 바뀐다. 보상·진행은 막지 않는다)
local CONDITIONS = {
	{ { "올빼미", "부엉이", "박쥐", "반딧불", "owl", "bat", "firefly" }, { time = "night", text = "밤" } },
	{ { "개구리", "달팽이", "frog", "snail" }, { weather = "rain", text = "비 온 뒤" } },
	{ { "버섯", "mushroom" }, { weather = "rain", text = "비 온 뒤" } },
}

local FIELD_OF = { Botany = true, Zoology = true, Mineral = true, Relic = true, Site = true }

local function hits(text: string, words): boolean
	for _, w in words do
		if w == "*" or string.find(text, w, 1, true) then return true end
	end
	return false
end

local cache = {}

-- card: { id, name, field, meta? } → 외형 정보(없으면 nil: 실물 카드가 아님)
function DF.form(card)
	if type(card) ~= "table" or type(card.id) ~= "string" then return nil end
	local hit = cache[card.id]
	if hit and (hit.withIds or DF.assetIds == nil) then return hit end
	local field = card.field
	if field == "Botany" or field == "Zoology" or field == "Mineral" or field == "Relic" or field == "Site" or FIELD_OF[field] then
		-- ok
	else
		return nil
	end
	local text = string.lower(tostring(card.id)) .. " " .. tostring(card.name or "")
	local archetype = NAME_OVERRIDE[tostring(card.name or "")]
	for _, r in (if archetype then {} else RULES) do
		if (r[1] == "*" or r[1] == field) and hits(text, r[2]) then
			archetype = r[3]
			break
		end
	end
	local a = DF.ARCHETYPES[archetype or ""]
	if not a then return nil end
	local models = a.models
	local exact = nil
	if a.kind == "animal" then
		exact = DF.EXACT_ANIMALS[card.id]
		models = if exact then { { "Animals", exact } } else {}
	end
	local own = DF.ownModel(card.id)
	if own then
		models = { own }
		if a.kind == "animal" then exact = exact or card.id end
	end
	local cond = nil
	for _, c in CONDITIONS do
		if hits(text, c[1]) then cond = c[2]; break end
	end
	if not cond and a.weather then cond = { weather = a.weather, text = "비 온 뒤" } end
	local out = {
		archetype = archetype, kind = a.kind, models = models, size = a.size, cluster = a.cluster,
		method = a.method, place = a.place, landmark = a.landmark == true, bloom = a.bloom == true,
		tint = a.tint, tools = a.tools, condition = cond, exact = exact,
		missing = #models == 0,
		withIds = DF.assetIds ~= nil,
	}
	cache[card.id] = out
	return out
end

DF.METHOD_TEXT = { sketch = "스케치", collect = "채집", rubbing = "탁본", inspect = "조사" }

-- 백과 미발견 힌트 한 줄
function DF.hint(card): string?
	local f = DF.form(card)
	if not f then return nil end
	local s = "어디서: " .. f.place .. " · 방법: " .. (DF.METHOD_TEXT[f.method] or "조사")
	if f.condition then s ..= " · " .. f.condition.text .. "에 실물" end
	if f.bloom then s ..= " · 꽃은 봄·여름" end
	return s
end

-- 부족 자산 목록: 등록된 자산 키 집합(set["그룹/이름"]=true)을 받아 모델이 없는 카드·모양을 모은다.
function DF.missing(cards, registered)
	local byArchetype = {}
	for _, c in cards do
		local f = DF.form(c)
		if f then
			local ok = false
			for _, m in f.models do
				if registered[m[1] .. "/" .. m[2]] then ok = true; break end
			end
			if not ok then
				byArchetype[f.archetype] = byArchetype[f.archetype] or {}
				table.insert(byArchetype[f.archetype], c.id .. " " .. tostring(c.name))
			end
		end
	end
	return byArchetype
end

return DF
