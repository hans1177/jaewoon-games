--!nonstrict
-- 항구 문화권 데이터 표: 건축 양식(STYLE), 마을 배치(PROFILE), 복식(OUTFIT), 항구→양식(REGION).
-- 새 문화권은 여기에 표 한 줄씩 추가한다. (PortScene 은 이 표를 읽어 마을을 짓는다)

local C = Color3.fromRGB

local MED = { cape_town = true, malaga = true, gibraltar = true, cartagena = true, trieste = true, messina = true, corfu = true, palma = true, cagliari = true, ajaccio = true, toulon = true, syracuse = true, ancona = true, split = true, thessaloniki = true, candia = true, rhodes = true, famagusta = true, smyrna = true, las_palmas = true, funchal = true, ponta_delgada = true, barcelona = true, valencia = true, palermo = true, valletta = true, ragusa = true, athens = true, cadiz = true, porto = true, lisbon = true, seville = true, marseille = true, genoa = true, venice = true, livorno = true, naples = true }

local STYLE = {
	north = {
		walls = { Color3.fromRGB(150, 74, 56), Color3.fromRGB(196, 170, 130), Color3.fromRGB(120, 90, 70), Color3.fromRGB(220, 210, 190), Color3.fromRGB(170, 110, 80) },
		roofs = { Color3.fromRGB(60, 52, 50), Color3.fromRGB(110, 50, 40), Color3.fromRGB(70, 70, 80) },
		roofPitch = 1.0,
		ground = Color3.fromRGB(96, 128, 72),
		street = Color3.fromRGB(120, 116, 110),
	},
	med = {
		walls = { Color3.fromRGB(240, 232, 214), Color3.fromRGB(226, 196, 140), Color3.fromRGB(214, 150, 100), Color3.fromRGB(246, 240, 230), Color3.fromRGB(200, 170, 120) },
		roofs = { Color3.fromRGB(184, 92, 60), Color3.fromRGB(170, 80, 54), Color3.fromRGB(196, 110, 70) },
		roofPitch = 0.45,
		ground = Color3.fromRGB(176, 160, 110),
		street = Color3.fromRGB(196, 186, 160),
	},
}

-- 지역별 마을 색: 네덜란드/한자는 붉은 벽돌, 북유럽은 색칠한 목조, 영국은 회색 돌과 갈색 벽돌
local function variant(base, walls, roofs, ground, street, pitch)
	return {
		walls = walls, roofs = roofs or base.roofs, roofPitch = pitch or base.roofPitch,
		ground = ground or base.ground, street = street or base.street,
	}
end
STYLE.brick = variant(STYLE.north,
	{ C(160, 70, 52), C(176, 84, 60), C(142, 62, 48), C(196, 150, 110), C(224, 214, 196) },
	{ C(70, 56, 52), C(52, 48, 50) }, nil, C(130, 112, 100), 1.25)
STYLE.nordic = variant(STYLE.north,
	{ C(168, 52, 44), C(226, 184, 70), C(236, 232, 222), C(70, 110, 140), C(190, 100, 60) },
	{ C(56, 50, 48), C(96, 52, 44) }, C(86, 120, 78), C(128, 124, 118), 1.15)
STYLE.stone = variant(STYLE.north,
	{ C(150, 148, 140), C(176, 168, 150), C(128, 120, 108), C(200, 192, 176), C(150, 110, 84) },
	{ C(78, 80, 88), C(60, 62, 70) }, C(92, 124, 76), C(118, 116, 112), 0.9)
STYLE.desert = variant(STYLE.med,
	{ C(226, 204, 160), C(214, 186, 140), C(238, 222, 190), C(200, 170, 124), C(244, 236, 214) },
	{ C(210, 180, 130), C(196, 164, 116) }, C(204, 184, 132), C(206, 190, 150), 0.12)
STYLE.tropic = variant(STYLE.med,
	{ C(184, 140, 96), C(160, 110, 74), C(204, 164, 112), C(140, 96, 64), C(226, 196, 150) },
	{ C(150, 120, 70), C(130, 100, 60) }, C(112, 150, 70), C(176, 150, 112), 0.55)

STYLE.china = variant(STYLE.med,
	{ C(176, 60, 48), C(206, 160, 70), C(226, 214, 190), C(120, 72, 52), C(150, 52, 44) },
	{ C(54, 62, 70), C(70, 74, 80), C(40, 90, 84) }, C(110, 140, 84), C(150, 138, 120), 0.85)
STYLE.seasia = variant(STYLE.med,
	{ C(150, 112, 72), C(176, 138, 88), C(124, 92, 60), C(204, 176, 120), C(96, 120, 76) },
	{ C(120, 100, 56), C(100, 120, 60), C(140, 112, 64) }, C(80, 138, 72), C(168, 146, 104), 1.2)
STYLE.pacific = variant(STYLE.med,
	{ C(214, 190, 140), C(196, 164, 112), C(232, 214, 170), C(170, 140, 96) },
	{ C(176, 150, 84), C(150, 130, 70) }, C(226, 212, 160), C(232, 218, 176), 0.9)
STYLE.wafrica = variant(STYLE.med,
	{ C(196, 128, 88), C(176, 108, 74), C(214, 156, 110), C(150, 92, 64), C(226, 190, 140) },
	{ C(160, 130, 76), C(140, 112, 64) }, C(176, 150, 96), C(190, 150, 110), 0.7)
STYLE.creole = variant(STYLE.med,
	{ C(120, 190, 200), C(244, 200, 110), C(236, 140, 150), C(160, 200, 140), C(246, 238, 214) },
	{ C(176, 84, 56), C(90, 100, 110) }, C(130, 164, 92), C(204, 190, 158), 0.5)

-- 유럽 문화권별 건축: 이베리아(회칠 벽·붉은 기와), 이탈리아(파스텔 벽·운하), 프랑스(크림색 석회암·청회색 지붕),
-- 영국(목골·회색 석재), 한자(가파른 붉은 벽돌 박공)
STYLE.iberia = variant(STYLE.med,
	{ C(246, 242, 232), C(240, 228, 200), C(232, 214, 176), C(226, 200, 150), C(250, 246, 238) },
	{ C(190, 96, 64), C(176, 84, 56) }, C(188, 168, 118), C(208, 192, 164), 0.42)
STYLE.italy = variant(STYLE.med,
	{ C(232, 190, 120), C(222, 150, 120), C(240, 226, 196), C(236, 176, 110), C(190, 196, 150) },
	{ C(176, 84, 56), C(160, 74, 50) }, C(170, 156, 112), C(200, 190, 168), 0.5)
STYLE.france = variant(STYLE.north,
	{ C(238, 228, 204), C(224, 210, 178), C(208, 198, 172), C(232, 220, 196) },
	{ C(66, 74, 92), C(56, 62, 78) }, C(104, 132, 84), C(176, 170, 156), 1.05)
STYLE.britain = variant(STYLE.stone,
	{ C(124, 102, 84), C(176, 168, 150), C(150, 148, 140), C(206, 196, 172), C(110, 90, 72) },
	{ C(88, 82, 76), C(112, 90, 60) }, C(86, 120, 70), C(122, 118, 112), 1.15)
STYLE.hanse = variant(STYLE.brick,
	{ C(150, 58, 44), C(136, 54, 42), C(170, 80, 56), C(120, 50, 40), C(188, 120, 84) },
	{ C(52, 44, 44), C(70, 52, 48) }, C(92, 118, 74), C(128, 112, 100), 1.55)
-- 비유럽 문화권: 오스만(흰 석회벽·납작 지붕), 스와힐리(산호석 흰벽), 말라바르(목조·가파른 기와/초가),
-- 일본(어두운 목조·회색 기와), 에스파냐 식민지(파스텔 아도비·붉은 기와)
STYLE.ottoman = variant(STYLE.med,
	{ C(240, 232, 212), C(232, 214, 176), C(222, 196, 150), C(246, 240, 226), C(214, 176, 130) },
	{ C(170, 90, 70), C(150, 84, 66), C(200, 190, 170) }, C(196, 176, 130), C(214, 200, 166), 0.22)
STYLE.swahili = variant(STYLE.med,
	{ C(248, 244, 232), C(240, 232, 214), C(232, 220, 196), C(224, 208, 176) },
	{ C(214, 190, 140), C(196, 170, 120) }, C(224, 208, 160), C(232, 218, 180), 0.1)
STYLE.malabar = variant(STYLE.med,
	{ C(150, 104, 70), C(176, 128, 84), C(132, 90, 60), C(200, 168, 120), C(226, 200, 150) },
	{ C(160, 70, 48), C(120, 96, 52), C(140, 110, 60) }, C(86, 140, 64), C(170, 140, 100), 1.0)
STYLE.japan = variant(STYLE.north,
	{ C(96, 70, 52), C(120, 88, 62), C(84, 62, 46), C(206, 192, 164), C(70, 54, 42) },
	{ C(74, 76, 84), C(60, 62, 70), C(88, 88, 92) }, C(92, 124, 76), C(140, 130, 112), 0.8)
STYLE.colonial = variant(STYLE.med,
	{ C(238, 196, 120), C(226, 150, 130), C(150, 200, 190), C(246, 232, 190), C(210, 130, 100) },
	{ C(176, 84, 56), C(160, 74, 50), C(190, 100, 62) }, C(150, 156, 90), C(196, 178, 140), 0.45)
local REGION = {
	-- 비유럽 문화권 (뒤에 오는 기존 항목을 덮어쓴다: 아래에서 다시 적용)
	-- 유럽 문화권
	lisbon = "iberia", porto = "iberia", seville = "iberia", cadiz = "iberia", malaga = "iberia", barcelona = "iberia", valencia = "iberia", cartagena = "iberia", funchal = "iberia", las_palmas = "iberia", ponta_delgada = "iberia", palma = "iberia", gibraltar = "iberia",
	genoa = "italy", venice = "italy", livorno = "italy", naples = "italy", palermo = "italy", messina = "italy", syracuse = "italy", trieste = "italy", ancona = "italy", ragusa = "italy", split = "italy", cagliari = "italy", corfu = "italy", candia = "italy", valletta = "italy", famagusta = "italy",
	rouen = "france", bordeaux = "france", la_rochelle = "france", marseille = "france", toulon = "france", ajaccio = "france",
	hamburg = "hanse", lubeck = "hanse", gdansk = "hanse", riga = "hanse", tallinn = "hanse", koenigsberg = "hanse",
	san_francisco = "stone", rhodes = "med",
	sitka = "nordic", vancouver = "nordic",
	sydney = "tropic", hobart = "tropic", perth = "tropic", darwin = "tropic", auckland = "tropic", port_moresby = "tropic", suva = "tropic", tahiti = "tropic", honolulu = "tropic", guam = "tropic", acapulco = "tropic", panama = "tropic", guayaquil = "tropic", callao = "tropic", valparaiso = "tropic",
	charleston = "tropic", new_orleans = "tropic", nassau = "tropic", havana = "tropic", veracruz = "tropic", campeche = "tropic", kingston = "tropic", santo_domingo = "tropic", san_juan = "tropic", bridgetown = "tropic", port_of_spain = "tropic", la_guaira = "tropic", cartagena_indias = "tropic", portobelo = "tropic", paramaribo = "tropic", belem = "tropic", recife = "tropic", salvador = "tropic", rio = "tropic", montevideo = "tropic", buenos_aires = "tropic",
	halifax = "stone", st_johns = "stone", boston = "stone", new_york = "stone", philadelphia = "stone", quebec = "stone",
	nagasaki = "brick", osaka = "brick", edo = "brick",
	hakodate = "nordic",
	macau = "stone", canton = "stone", amoy = "stone", ningbo = "stone", shanghai = "stone", tianjin = "stone", busan = "stone", incheon = "stone",
	manila = "tropic", hoi_an = "tropic", bangkok = "tropic", rangoon = "tropic", singapore = "tropic", batavia = "tropic", makassar = "tropic", ternate = "tropic", ambon = "tropic", banda = "tropic", brunei = "tropic", tainan = "tropic",
	aden = "desert", mocha = "desert", jeddah = "desert", muscat = "desert", bandar_abbas = "desert", basra = "desert",
	mozambique = "tropic", kilwa = "tropic", mombasa = "tropic", zanzibar = "tropic", mogadishu = "tropic", goa = "tropic", calicut = "tropic", cochin = "tropic", colombo = "tropic", madras = "tropic", calcutta = "tropic", malacca = "tropic", port_louis = "tropic", diu = "tropic", surat = "tropic",
	praia = "tropic", saint_louis = "tropic", dakar = "tropic", bissau = "tropic", freetown = "tropic", elmina = "tropic", ouidah = "tropic",
	lagos = "tropic", calabar = "tropic", sao_tome = "tropic", luanda = "tropic", benguela = "tropic", st_helena = "tropic",
	casablanca = "desert", safi = "desert", agadir = "desert", cape_town = "med",
	beirut = "desert", damietta = "desert", bone = "desert",
	acre = "desert", oran = "desert", benghazi = "desert",
	visby = "stone", helsinki = "nordic", st_petersburg = "stone",
	algiers = "desert", tunis = "desert", tripoli = "desert", alexandria = "desert", istanbul = "desert", tangier = "desert",
	amsterdam = "brick", rotterdam = "brick", antwerp = "brick",
	bergen = "nordic", oslo = "nordic", stockholm = "nordic", gothenburg = "nordic", copenhagen = "nordic",
	london = "britain", edinburgh = "britain", glasgow = "britain", dublin = "britain", plymouth = "britain", hull = "britain",
}
for key, list in {
	ottoman = { "istanbul", "beirut", "acre", "damietta", "alexandria", "smyrna", "tripoli", "algiers", "tunis", "athens", "thessaloniki" },
	swahili = { "zanzibar", "kilwa", "mombasa", "mogadishu", "mozambique", "aden", "mocha", "muscat" },
	malabar = { "calicut", "cochin", "goa", "colombo", "madras", "calcutta", "diu", "surat", "malacca" },
	japan = { "nagasaki", "osaka", "edo", "hakodate" },
	colonial = { "veracruz", "campeche", "santo_domingo", "cartagena_indias", "portobelo", "acapulco", "panama", "la_guaira", "callao", "guayaquil", "valparaiso", "montevideo", "buenos_aires", "rio", "salvador", "recife", "belem", "manila", "san_juan" },
	creole = { "havana", "kingston", "nassau", "bridgetown", "port_of_spain", "paramaribo", "new_orleans", "charleston" },
	china = { "macau", "canton", "amoy", "ningbo", "shanghai", "tianjin", "tainan", "hoi_an" },
	seasia = { "bangkok", "rangoon", "singapore", "batavia", "makassar", "ternate", "ambon", "banda", "brunei" },
	pacific = { "sydney", "hobart", "perth", "darwin", "auckland", "port_moresby", "suva", "tahiti", "honolulu", "guam" },
	wafrica = { "praia", "saint_louis", "dakar", "bissau", "freetown", "elmina", "ouidah", "lagos", "calabar", "sao_tome", "luanda", "benguela", "st_helena" },
} do
	for _, id in list do
		REGION[id] = key
	end
end


-- 15세기 말 문화권별 기본 머리쓰개. 후대 삼각모는 현재 시대에서만 유지한다.
-- 이 표는 역사적 배경에 맞는 기본 분류다. 정밀 R15 메시가 승인되면 같은 문화권 항목에 연결한다.
local HEADWEAR_15C = {
	iberia = "wide", italy = "wide", france = "wide", britain = "wide", hanse = "wide",
	north = "wide", stone = "wide", brick = "wide", nordic = "wide", med = "wide",
	ottoman = "turban", desert = "turban", malabar = "turban",
	swahili = "kofia", japan = "kasa", tropic = "straw", colonial = "straw",
	china = "kasa", seasia = "kasa", pacific = "straw", wafrica = "kofia", creole = "straw",
}

-- 문화권별 복식 (옷 색·모자). 주민·점원·이야기 인물이 같은 마을 사람처럼 보이게 한다.
local OC = Color3.fromRGB
local OUTFIT = {
	iberia = { coats = { OC(30, 28, 30), OC(128, 36, 40), OC(206, 170, 100), OC(236, 230, 214) }, hat = "wide", hats = { OC(28, 26, 28), OC(64, 44, 32) } },
	italy = { coats = { OC(120, 40, 56), OC(40, 90, 66), OC(222, 176, 70), OC(40, 56, 110) }, hat = "cap", hats = { OC(150, 36, 48), OC(44, 96, 70), OC(30, 30, 34) } },
	france = { coats = { OC(44, 70, 140), OC(130, 36, 56), OC(232, 222, 196), OC(96, 56, 120) }, hat = "plume", hats = { OC(36, 40, 70), OC(28, 26, 30) } },
	britain = { coats = { OC(110, 112, 118), OC(110, 82, 58), OC(40, 52, 90), OC(84, 96, 60) }, hat = "tricorn", hats = { OC(28, 26, 28), OC(70, 52, 38) } },
	brick = { coats = { OC(34, 32, 34), OC(70, 52, 40), OC(58, 60, 66), OC(40, 70, 56) }, hat = "wide", hats = { OC(26, 24, 26) }, trousers = { OC(40, 36, 36) } },
	hanse = { coats = { OC(54, 84, 60), OC(104, 76, 52), OC(110, 112, 116), OC(140, 70, 44) }, hat = "cap", hats = { OC(80, 60, 44), OC(30, 28, 30) } },
	nordic = { coats = { OC(52, 90, 140), OC(170, 52, 44), OC(120, 86, 60), OC(232, 226, 212) }, hat = "knit", hats = { OC(176, 48, 44), OC(60, 96, 148), OC(150, 150, 150) } },
	tropic = { coats = { OC(236, 228, 204), OC(222, 150, 70), OC(70, 160, 150), OC(200, 90, 80) }, hat = "straw", hats = { OC(196, 164, 100) } },
	desert = { coats = { OC(244, 238, 222), OC(228, 214, 180), OC(52, 70, 130), OC(120, 88, 60) }, hat = "turban", hats = { OC(248, 244, 232), OC(232, 220, 190) } },
	med = { coats = { OC(214, 170, 80), OC(240, 236, 224), OC(60, 130, 140) }, hat = "cap", hats = { OC(150, 50, 44), OC(40, 40, 46) } },
	ottoman = { coats = { OC(176, 44, 48), OC(48, 82, 150), OC(244, 240, 228), OC(52, 120, 84), OC(214, 170, 70) }, hat = "turban", hats = { OC(248, 244, 232), OC(190, 40, 44), OC(60, 100, 150) }, trousers = { OC(236, 230, 214), OC(60, 70, 110) } },
	swahili = { coats = { OC(250, 248, 240), OC(246, 240, 224), OC(60, 70, 130), OC(214, 160, 70) }, hat = "kofia", hats = { OC(250, 248, 240), OC(236, 226, 200) }, trousers = { OC(240, 234, 220) } },
	malabar = { coats = { OC(250, 246, 236), OC(236, 162, 54), OC(70, 140, 80), OC(200, 70, 60) }, hat = "turban", hats = { OC(246, 240, 226), OC(230, 150, 50) }, trousers = { OC(248, 244, 232) } },
	japan = { coats = { OC(54, 70, 120), OC(150, 52, 60), OC(70, 100, 80), OC(110, 96, 140), OC(210, 190, 130) }, hat = "kasa", hats = { OC(196, 164, 100), OC(170, 140, 84) }, trousers = { OC(48, 52, 70) } },
	china = { coats = { OC(176, 48, 44), OC(46, 96, 110), OC(214, 170, 60), OC(60, 60, 90), OC(236, 226, 200) }, hat = "kasa", hats = { OC(196, 164, 100), OC(40, 40, 46) }, trousers = { OC(40, 44, 60) } },
	seasia = { coats = { OC(220, 150, 50), OC(70, 130, 90), OC(176, 60, 80), OC(240, 232, 210) }, hat = "kasa", hats = { OC(206, 176, 110), OC(170, 140, 84) }, trousers = { OC(60, 70, 110), OC(120, 70, 50) } },
	pacific = { coats = { OC(240, 236, 224), OC(210, 90, 70), OC(60, 150, 170), OC(236, 190, 70) }, hat = "straw", hats = { OC(206, 176, 110) }, trousers = { OC(236, 230, 210) } },
	wafrica = { coats = { OC(214, 160, 50), OC(60, 100, 150), OC(190, 60, 50), OC(240, 232, 210), OC(70, 130, 80) }, hat = "kofia", hats = { OC(240, 232, 210), OC(214, 160, 50) }, trousers = { OC(236, 226, 200), OC(60, 70, 120) } },
	creole = { coats = { OC(240, 226, 190), OC(70, 150, 170), OC(220, 110, 130), OC(250, 210, 90), OC(120, 170, 110) }, hat = "wide", hats = { OC(236, 228, 200), OC(206, 176, 110) } },
	colonial = { coats = { OC(220, 120, 80), OC(236, 220, 170), OC(70, 150, 140), OC(176, 70, 90), OC(120, 90, 60) }, hat = "wide", hats = { OC(206, 176, 110), OC(120, 84, 56), OC(236, 228, 200) } },
}

-- 지역마다 길의 짜임·집 크기·간격·층수가 다르다.
-- streets: 세로 골목 x좌표, alley: 골목 폭, gap: 집 간격 배수, wMul: 집 폭 배수, dAdd: 집 깊이 가감,
-- flAdd/flMax: 층수 가감·상한, dens: 빈터 비율 배수, jz/jx: 앞뒤·좌우 흐트러짐 배수, canal: 운하, fence: 울타리 마을
local PROFILE = {
	iberia = { S = 15, gapf = 0.08, fl0 = 1, flGrow = 1, streets = { -52, -80, -108, -136, -164 }, alley = 3, gap = 1, wMul = 1, dAdd = 0, flAdd = 0, flMax = 2, dens = 1.05, jz = 1.2, jx = 1 },
	italy = { S = 14, gapf = 0.03, fl0 = 2, flGrow = 1, streets = { -48, -72, -96, -120, -144 }, alley = 3, gap = 1, wMul = 1, dAdd = 0, flAdd = 0, flMax = 3, dens = 1.05, jz = 0.8, jx = 0.8 },
	france = { S = 16, gapf = 0.35, fl0 = 2, flGrow = 1, streets = { -60, -110, -160 }, alley = 6, gap = 1, wMul = 1, dAdd = 0, flAdd = 0, flMax = 3, dens = 0.95, jz = 0.3, jx = 0.3 },
	britain = { S = 13, gapf = 0.12, fl0 = 1, flGrow = 1, streets = { -55, -85, -115, -145 }, alley = 3.5, gap = 1, wMul = 1, dAdd = 0, flAdd = 0, flMax = 3, dens = 1, jz = 2, jx = 1.5 },
	hanse = { S = 13, gapf = 0.05, fl0 = 2, flGrow = 1, streets = { -56, -86, -116, -146 }, alley = 4, gap = 1, wMul = 1, dAdd = 0, flAdd = 0, flMax = 3, dens = 1.1, jz = 0.4, jx = 0.4 },
	north = { S = 17, gapf = 0.25, fl0 = 1, flGrow = 1, streets = { -50, -90, -130 }, alley = 5, gap = 1, wMul = 1, dAdd = 0, flAdd = 0, flMax = 3, dens = 1, jz = 1, jx = 1 },
	stone = { S = 18, gapf = 0.3, fl0 = 1, flGrow = 2, streets = { -50, -90, -130 }, alley = 5, gap = 1.05, wMul = 1.1, dAdd = 1, flAdd = 0, flMax = 3, dens = 0.95, jz = 1, jx = 1 },
	brick = { S = 14, gapf = 0.04, fl0 = 2, flGrow = 1, streets = { -50, -76, -102, -130 }, alley = 4, gap = 0.72, wMul = 0.7, dAdd = 2, flAdd = 1, flMax = 3, dens = 1.05, jz = 0.4, jx = 0.4, canal = true },
	nordic = { S = 13.5, gapf = 1.0, fl0 = 1, flGrow = 1, streets = { -62, -122 }, alley = 4, gap = 1.5, wMul = 0.8, dAdd = -1, flAdd = 0, flMax = 2, dens = 0.75, jz = 2.4, jx = 1.6, fence = true },
	med = { S = 16, gapf = 0.1, fl0 = 2, flGrow = 1, streets = { -45, -70, -95, -120, -145 }, alley = 3, gap = 0.85, wMul = 1, dAdd = 0, flAdd = 1, flMax = 3, dens = 1, jz = 1.6, jx = 1.6 },
	desert = { S = 19, gapf = 0.06, fl0 = 1, flGrow = 1, streets = { -56, -86, -116, -146 }, alley = 3, gap = 0.78, wMul = 1.2, dAdd = 1, flAdd = 0, flMax = 2, dens = 1.05, jz = 0.4, jx = 0.5 },
	-- 오스만: 빽빽한 미로 골목, 낮은 흰 석조 집 / 스와힐리: 산호석 평지붕 밀집 / 말라바르: 야자 사이 드문 목조
	-- 일본: 좁은 격자 골목의 낮은 목조 / 식민지: 넓은 광장 둘레 반듯한 구획
	ottoman = { S = 15, gapf = 0.04, fl0 = 1, flGrow = 1, streets = { -48, -70, -92, -114, -136, -158 }, alley = 2.6, gap = 0.8, wMul = 1.1, dAdd = 1, flAdd = 0, flMax = 2, dens = 1.1, jz = 0.7, jx = 0.9 },
	swahili = { S = 14, gapf = 0.06, fl0 = 1, flGrow = 0, streets = { -52, -80, -108, -136 }, alley = 3, gap = 0.82, wMul = 1, dAdd = 0, flAdd = 0, flMax = 2, dens = 1, jz = 0.8, jx = 0.8 },
	malabar = { S = 14, gapf = 0.9, fl0 = 1, flGrow = 0, streets = { -64, -118 }, alley = 4.5, gap = 1.35, wMul = 0.9, dAdd = 0, flAdd = 0, flMax = 2, dens = 0.8, jz = 2, jx = 1.6 },
	japan = { S = 12, gapf = 0.05, fl0 = 1, flGrow = 1, streets = { -44, -62, -80, -98, -116, -134, -152 }, alley = 2.4, gap = 0.7, wMul = 0.85, dAdd = 1, flAdd = 0, flMax = 2, dens = 1.1, jz = 0.3, jx = 0.3 },
	colonial = { S = 17, gapf = 0.2, fl0 = 1, flGrow = 1, streets = { -56, -96, -136 }, alley = 5, gap = 1, wMul = 1.05, dAdd = 0, flAdd = 0, flMax = 2, dens = 0.95, jz = 0.5, jx = 0.5 },
	china = { S = 13, gapf = 0.04, fl0 = 1, flGrow = 1, streets = { -46, -66, -86, -106, -126, -146 }, alley = 2.6, gap = 0.7, wMul = 0.9, dAdd = 1, flAdd = 0, flMax = 2, dens = 1.1, jz = 0.3, jx = 0.3 },
	seasia = { S = 14, gapf = 1.0, fl0 = 1, flGrow = 0, streets = { -60, -110 }, alley = 5, gap = 1.5, wMul = 0.85, dAdd = -1, flAdd = 0, flMax = 1, dens = 0.75, jz = 2.2, jx = 1.8, fence = true },
	pacific = { S = 14, gapf = 1.6, fl0 = 1, flGrow = 0, streets = { -80 }, alley = 6, gap = 2.0, wMul = 0.8, dAdd = -1, flAdd = -1, flMax = 1, dens = 0.6, jz = 3, jx = 2.4, fence = true },
	wafrica = { S = 14, gapf = 0.5, fl0 = 1, flGrow = 0, streets = { -56, -100, -144 }, alley = 3.5, gap = 1.1, wMul = 0.9, dAdd = 0, flAdd = 0, flMax = 2, dens = 0.9, jz = 1.6, jx = 1.4 },
	creole = { S = 15, gapf = 0.15, fl0 = 1, flGrow = 1, streets = { -54, -92, -130 }, alley = 4.5, gap = 0.95, wMul = 1, dAdd = 0, flAdd = 0, flMax = 2, dens = 0.95, jz = 0.8, jx = 0.8 },
	tropic = { S = 14, gapf = 1.3, fl0 = 1, flGrow = 0, streets = { -72 }, alley = 5, gap = 1.7, wMul = 0.8, dAdd = -1, flAdd = -1, flMax = 1, dens = 0.7, jz = 2.6, jx = 2, fence = true },
}

STYLE.north.mat, STYLE.stone.mat, STYLE.brick.mat = Enum.Material.Brick, Enum.Material.Cobblestone, Enum.Material.Brick
STYLE.iberia.mat, STYLE.italy.mat, STYLE.france.mat, STYLE.britain.mat, STYLE.hanse.mat = Enum.Material.Concrete, Enum.Material.Concrete, Enum.Material.Limestone, Enum.Material.Slate, Enum.Material.Brick
STYLE.ottoman.mat, STYLE.swahili.mat, STYLE.malabar.mat, STYLE.japan.mat, STYLE.colonial.mat = Enum.Material.Limestone, Enum.Material.Concrete, Enum.Material.Wood, Enum.Material.WoodPlanks, Enum.Material.Concrete
STYLE.china.kit, STYLE.japan.kit = "eastasia", "eastasia"
STYLE.china.mat, STYLE.seasia.mat, STYLE.pacific.mat, STYLE.wafrica.mat, STYLE.creole.mat = Enum.Material.WoodPlanks, Enum.Material.Wood, Enum.Material.Wood, Enum.Material.Sand, Enum.Material.Concrete
STYLE.nordic.mat, STYLE.med.mat, STYLE.desert.mat, STYLE.tropic.mat =Enum.Material.WoodPlanks, Enum.Material.Concrete, Enum.Material.Sandstone, Enum.Material.Wood

-- 문화권별 실제 주택 구성. 기존 승인된 Town 메시로만 외벽·지붕·창호를 표현한다.
-- roof는 추가 지붕창/박공 요소이며, 슬라브·돔 등 전용 모델이 없는 지역에는 임의 대체 지붕을 얹지 않는다.
-- trim은 외벽에서 확인 가능한 소형 원본 창호/벽체 부품이다. 모든 주택에 반복 배치하지 않아 모바일 부하를 제한한다.
local HOUSE_ARCH = {
	north = { roof = "roof-gable", roofMat = Enum.Material.Slate, trim = "kenney_wood_wall_cross_01", trimMat = Enum.Material.WoodPlanks, chimney = true, annex = true, entry = "kenney_wood_door_round_01", entryMat = Enum.Material.WoodPlanks },
	med = { roof = "roof-gable-end", roofMat = Enum.Material.Brick, trim = "wall-window-shutters", trimMat = Enum.Material.WoodPlanks, balcony = true, annex = true, entry = "kenney_grey_door_round_01", entryMat = Enum.Material.Limestone },
	brick = { roof = "roof-gable", roofMat = Enum.Material.Slate, trim = "kenney_grey_window_narrow_01", chimney = true, annex = true, entry = "kenney_wood_door_square_01", entryMat = Enum.Material.WoodPlanks },
	nordic = { roof = "roof-gable", roofMat = Enum.Material.WoodPlanks, trim = "kenney_wood_window_square_01", trimMat = Enum.Material.WoodPlanks, chimney = true, entry = "kenney_wood_door_square_01", entryMat = Enum.Material.WoodPlanks },
	stone = { roof = "roof-high-window", roofMat = Enum.Material.Slate, trim = "kenney_grey_window_round_01", chimney = true, annex = true, entry = "kenney_grey_door_square_01", entryMat = Enum.Material.Cobblestone },
	desert = { trim = "kenney_grey_window_narrow_01", trimMat = Enum.Material.Sandstone, entry = "kenney_grey_door_round_01", entryMat = Enum.Material.Sandstone },
	tropic = { roof = "roof-gable", roofMat = Enum.Material.WoodPlanks, trim = "kenney_wood_window_square_01", trimMat = Enum.Material.WoodPlanks, balcony = true, entry = "kenney_wood_door_square_01", entryMat = Enum.Material.WoodPlanks },
	iberia = { roof = "roof-gable-end", roofMat = Enum.Material.Brick, trim = "wall-window-shutters", trimMat = Enum.Material.WoodPlanks, balcony = true, annex = true, entry = "kenney_grey_door_round_01", entryMat = Enum.Material.Limestone },
	italy = { roof = "roof-gable-end", roofMat = Enum.Material.Brick, trim = "wall-window-shutters", trimMat = Enum.Material.WoodPlanks, balcony = true, annex = true, entry = "kenney_grey_door_round_01", entryMat = Enum.Material.Limestone },
	france = { roof = "roof-high-window", roofMat = Enum.Material.Slate, trim = "kenney_grey_window_round_01", chimney = true, annex = true, entry = "kenney_grey_door_square_01", entryMat = Enum.Material.Limestone },
	britain = { roof = "roof-high-window", roofMat = Enum.Material.Slate, trim = "kenney_wood_wall_cross_01", trimMat = Enum.Material.WoodPlanks, chimney = true, annex = true, entry = "kenney_wood_door_square_01", entryMat = Enum.Material.WoodPlanks },
	hanse = { roof = "roof-gable-end", roofMat = Enum.Material.Brick, trim = "kenney_grey_window_narrow_01", chimney = true, annex = true, entry = "kenney_wood_door_round_01", entryMat = Enum.Material.WoodPlanks },
	ottoman = { trim = "kenney_grey_window_round_01", trimMat = Enum.Material.Limestone, entry = "kenney_grey_door_round_01", entryMat = Enum.Material.Limestone },
	swahili = { trim = "kenney_grey_window_round_01", trimMat = Enum.Material.Limestone, entry = "kenney_grey_door_round_01", entryMat = Enum.Material.Limestone },
	malabar = { roof = "roof-gable", roofMat = Enum.Material.WoodPlanks, trim = "kenney_wood_window_square_01", trimMat = Enum.Material.WoodPlanks, entry = "kenney_wood_door_square_01", entryMat = Enum.Material.WoodPlanks },
	japan = { roofMat = Enum.Material.Slate, eastAsiaEntry = true },
	china = { roofMat = Enum.Material.Slate, eastAsiaEntry = true },
	seasia = { roof = "roof-gable", roofMat = Enum.Material.WoodPlanks, trim = "kenney_wood_window_square_01", trimMat = Enum.Material.WoodPlanks, entry = "kenney_wood_door_square_01", entryMat = Enum.Material.WoodPlanks },
	pacific = { trim = "kenney_wood_window_square_01", trimMat = Enum.Material.WoodPlanks, entry = "kenney_wood_door_square_01", entryMat = Enum.Material.WoodPlanks },
	wafrica = { trim = "kenney_grey_window_narrow_01", trimMat = Enum.Material.Sandstone, entry = "kenney_grey_door_round_01", entryMat = Enum.Material.Sandstone },
	creole = { roof = "roof-high-window", roofMat = Enum.Material.Brick, trim = "wall-window-shutters", trimMat = Enum.Material.WoodPlanks, balcony = true, entry = "kenney_wood_door_round_01", entryMat = Enum.Material.WoodPlanks },
	colonial = { roof = "roof-gable-end", roofMat = Enum.Material.Brick, trim = "wall-window-shutters", trimMat = Enum.Material.WoodPlanks, balcony = true, annex = true, entry = "kenney_grey_door_round_01", entryMat = Enum.Material.Limestone },
}
for culture, architecture in HOUSE_ARCH do
	STYLE[culture].house = architecture
end


return { MED = MED, STYLE = STYLE, REGION = REGION, PROFILE = PROFILE, OUTFIT = OUTFIT, HEADWEAR_15C = HEADWEAR_15C }
