--!strict
-- [항구 정체성] 같은 문화권이라도 항구마다 다른 얼굴을 갖게 하는 데이터 표.
-- 발전 단계(1~5)에 따라 열리는 요소(TIER)와 항구별 상징·건축·구획·광장·길·조명·땅을 정한다.
-- 3D 원본은 docs/port_asset_prompts.csv 의 프롬프트로 제작·승인한 뒤 AssetIds 에 등록한다.
-- 없는 상징 원본은 임의 모델로 대체하지 않는다. 색상·주택·도로는 등록된 승인 모델만 활용한다.

export type Landmark = { id: string, name: string, kind: string, fallback: string }
export type Identity = {
	landmark: Landmark, -- 상징물 1개 (2단계 기초, 4단계 완성)
	roof: string, -- gable(박공) | flat(평지붕) | dome(돔) | eave(처마) | hip(모임지붕) | thatch(초가·이엉)
	wall: string, -- brick | timber | stone | stucco | coral | adobe | wood | plaster
	balcony: string?, -- 창·발코니 양식 (iron | mashrabiya | wood_lattice | loggia)
	layout: string, -- grid(바둑판) | canal(물길) | terrace(계단식) | radial(방사형) | organic(골목형)
	plaza: string, -- fountain | market | temple_court | quay | parade
	street: { string }, -- 1~5단계 길 재질 이름 (dirt | gravel | cobble | flagstone | paved | plank | brick)
	lamp: string, -- torch | oil_lantern | paper_lantern | mosque_lamp | stone_lantern | gas_lamp
	ground: string, -- 길 밖 땅: grass | sand | mud | snowmelt | red_earth | rice_paddy
	weatherGround: string, -- 비·계절 영향: puddles | dust | snow | monsoon_mud | none
	signature: { string }, -- 구역별 특산 건물 (3단계부터)
	facade: { number }, -- [항구별 원색] 승인된 무텍스처 주택에만 적용하는 벽 색 RGB
	roofTint: { number }, -- [항구별 지붕] 승인된 무텍스처 기와·지붕 색 RGB
}

local Tier = {
	-- 발전 단계별로 열리는 요소. 숫자는 PortScene 의 마을 단계(lvl)와 같다.
	[1] = { plots = 6, plaza = false, landmark = "none", districts = false, lampEvery = 0, outskirts = false },
	[2] = { plots = 10, plaza = true, landmark = "base", districts = false, lampEvery = 0, outskirts = false },
	[3] = { plots = 14, plaza = true, landmark = "base", districts = true, lampEvery = 3, outskirts = false },
	[4] = { plots = 18, plaza = true, landmark = "full", districts = true, lampEvery = 2, outskirts = false },
	[5] = { plots = 24, plaza = true, landmark = "full", districts = true, lampEvery = 1, outskirts = true },
}

local P: { [string]: Identity } = {
	london = { landmark = { id = "lm_london_bridge", name = "런던 다리와 상점가", kind = "bridge", fallback = "tower" },
		roof = "gable", wall = "brick", balcony = "iron", layout = "organic", plaza = "market",
		street = { "dirt", "gravel", "cobble", "cobble", "paved" }, lamp = "oil_lantern", ground = "grass", weatherGround = "puddles",
		signature = { "왕립 거래소", "양조장", "해군 공창" }, facade = { 146, 84, 67 }, roofTint = { 79, 83, 91 } },
	amsterdam = { landmark = { id = "lm_amsterdam_canal", name = "운하 수문과 계량소", kind = "canal_gate", fallback = "warehouse" },
		roof = "gable", wall = "brick", balcony = "iron", layout = "canal", plaza = "quay",
		street = { "plank", "brick", "brick", "brick", "paved" }, lamp = "oil_lantern", ground = "mud", weatherGround = "puddles",
		signature = { "동인도회사 상관", "풍차 제분소", "거래소" }, facade = { 166, 78, 62 }, roofTint = { 91, 63, 60 } },
	rouen = { landmark = { id = "lm_rouen_cathedral", name = "고딕 대성당 첨탑", kind = "spire", fallback = "church" },
		roof = "hip", wall = "stone", balcony = nil, layout = "organic", plaza = "fountain",
		street = { "dirt", "gravel", "cobble", "flagstone", "paved" }, lamp = "oil_lantern", ground = "grass", weatherGround = "puddles",
		signature = { "직물 시장", "대시계 문루", "포도주 저장고" }, facade = { 213, 193, 164 }, roofTint = { 70, 76, 91 } },
	copenhagen = { landmark = { id = "lm_copenhagen_tower", name = "원형 천문탑", kind = "tower", fallback = "tower" },
		roof = "gable", wall = "plaster", balcony = nil, layout = "canal", plaza = "quay",
		street = { "dirt", "gravel", "cobble", "cobble", "paved" }, lamp = "oil_lantern", ground = "grass", weatherGround = "snow",
		signature = { "해협 세관", "증권거래소", "목조 창고" }, facade = { 227, 191, 129 }, roofTint = { 88, 104, 94 } },
	gothenburg = { landmark = { id = "lm_gothenburg_fort", name = "언덕 위 왕관 요새", kind = "fort", fallback = "fort" },
		roof = "gable", wall = "wood", balcony = nil, layout = "canal", plaza = "quay",
		street = { "dirt", "gravel", "gravel", "cobble", "paved" }, lamp = "oil_lantern", ground = "grass", weatherGround = "snow",
		signature = { "동인도회사 창고", "제재소", "목조 교회" }, facade = { 171, 65, 57 }, roofTint = { 72, 78, 76 } },
	venice = { landmark = { id = "lm_venice_campanile", name = "광장 종탑", kind = "campanile", fallback = "tower" },
		roof = "hip", wall = "stucco", balcony = "loggia", layout = "canal", plaza = "fountain",
		street = { "plank", "flagstone", "flagstone", "flagstone", "flagstone" }, lamp = "oil_lantern", ground = "mud", weatherGround = "puddles",
		signature = { "유리 공방", "검역소", "베네치아 공창" }, facade = { 220, 173, 147 }, roofTint = { 164, 88, 66 } },
	istanbul = { landmark = { id = "lm_istanbul_mosque", name = "대모스크 돔과 첨탑", kind = "dome", fallback = "temple" },
		roof = "dome", wall = "stone", balcony = "mashrabiya", layout = "terrace", plaza = "temple_court",
		street = { "dirt", "gravel", "cobble", "flagstone", "flagstone" }, lamp = "mosque_lamp", ground = "red_earth", weatherGround = "dust",
		signature = { "그랜드 바자르", "함맘", "카라반사라이" }, facade = { 215, 197, 165 }, roofTint = { 158, 103, 88 } },
	zanzibar = { landmark = { id = "lm_zanzibar_house", name = "산호석 궁전과 조각문", kind = "palace", fallback = "palace" },
		roof = "flat", wall = "coral", balcony = "wood_lattice", layout = "organic", plaza = "quay",
		street = { "sand", "sand", "gravel", "flagstone", "flagstone" }, lamp = "oil_lantern", ground = "sand", weatherGround = "monsoon_mud",
		signature = { "정향 창고", "다우선 선착장", "산호석 모스크" }, facade = { 229, 217, 188 }, roofTint = { 172, 142, 104 } },
	calicut = { landmark = { id = "lm_calicut_temple", name = "목조 사원 고푸람", kind = "gopuram", fallback = "temple" },
		roof = "eave", wall = "plaster", balcony = "wood_lattice", layout = "organic", plaza = "market",
		street = { "red_earth", "red_earth", "gravel", "flagstone", "paved" }, lamp = "oil_lantern", ground = "red_earth", weatherGround = "monsoon_mud",
		signature = { "후추 교역소", "면직 공방", "조선 작업장" }, facade = { 184, 144, 104 }, roofTint = { 143, 87, 64 } },
	nagasaki = { landmark = { id = "lm_nagasaki_dejima", name = "데지마 부채꼴 상관", kind = "island_post", fallback = "warehouse" },
		roof = "eave", wall = "wood", balcony = "wood_lattice", layout = "terrace", plaza = "quay",
		street = { "dirt", "gravel", "gravel", "flagstone", "flagstone" }, lamp = "stone_lantern", ground = "grass", weatherGround = "puddles",
		signature = { "도자기 가마", "쌀 창고", "신사 도리이" }, facade = { 117, 99, 76 }, roofTint = { 77, 78, 79 } },
	veracruz = { landmark = { id = "lm_veracruz_fort", name = "산후안 데 울루아 요새", kind = "fort", fallback = "fort" },
		roof = "flat", wall = "stucco", balcony = "iron", layout = "grid", plaza = "parade",
		street = { "sand", "dirt", "gravel", "cobble", "paved" }, lamp = "oil_lantern", ground = "sand", weatherGround = "dust",
		signature = { "은 선적 부두", "세관", "대성당" }, facade = { 220, 190, 156 }, roofTint = { 183, 100, 75 } },
	canton = { landmark = { id = "lm_canton_hongs", name = "십삼행 상관 거리", kind = "trade_row", fallback = "warehouse" },
		roof = "eave", wall = "brick", balcony = "wood_lattice", layout = "grid", plaza = "quay",
		street = { "dirt", "gravel", "flagstone", "flagstone", "paved" }, lamp = "paper_lantern", ground = "rice_paddy", weatherGround = "monsoon_mud",
		signature = { "차 시장", "도자기 상점", "관창" }, facade = { 174, 168, 154 }, roofTint = { 58, 71, 69 } },
	seville = { landmark = { id = "lm_seville_giralda", name = "히랄다 종탑", kind = "campanile", fallback = "tower" },
		roof = "hip", wall = "stucco", balcony = "iron", layout = "organic", plaza = "fountain",
		street = { "dirt", "gravel", "cobble", "flagstone", "paved" }, lamp = "oil_lantern", ground = "red_earth", weatherGround = "dust",
		signature = { "인도 무역원", "올리브 압착소", "황금탑 부두" }, facade = { 239, 227, 204 }, roofTint = { 180, 91, 61 } },
	busan = { landmark = { id = "lm_busan_fort", name = "왜관과 진성", kind = "fort", fallback = "fort" },
		roof = "eave", wall = "plaster", balcony = nil, layout = "terrace", plaza = "market",
		street = { "dirt", "dirt", "gravel", "flagstone", "flagstone" }, lamp = "paper_lantern", ground = "grass", weatherGround = "snow",
		signature = { "판옥선 조선소", "장시", "향교" }, facade = { 222, 216, 201 }, roofTint = { 66, 71, 81 } },
	lisbon = { landmark = { id = "lm_lisbon_belem", name = "벨렝 탑", kind = "tower", fallback = "tower" },
		roof = "hip", wall = "stucco", balcony = "iron", layout = "terrace", plaza = "fountain",
		street = { "dirt", "gravel", "cobble", "flagstone", "paved" }, lamp = "oil_lantern", ground = "red_earth", weatherGround = "puddles",
		signature = { "항해 학교", "향신료 창고", "수도원" }, facade = { 224, 200, 174 }, roofTint = { 161, 91, 66 } },
	-- [항구별 외관] 시드니 코브: 등록된 현지 원본만 사용하고 없는 집회소는 미등록으로 남긴다.
	sydney = { landmark = { id = "lm_sydney_meeting_house", name = "시드니 코브 집회소", kind = "meeting_house", fallback = "warehouse" },
		roof = "thatch", wall = "wood", balcony = nil, layout = "organic", plaza = "quay",
		street = { "sand", "sand", "gravel", "plank", "paved" }, lamp = "torch", ground = "grass", weatherGround = "dust",
		signature = { "직물 공방", "염색 작업장", "목재 선창" }, facade = { 186, 158, 120 }, roofTint = { 135, 112, 78 } },
	-- [항구별 외관] 카르타헤나 데 인디아스: 지중해 카르타헤나와 구별되는 카리브 식민항.
	cartagena_indias = { landmark = { id = "lm_cartagena_indias_cathedral", name = "바로크 대성당 정면", kind = "cathedral", fallback = "church" },
		roof = "flat", wall = "stucco", balcony = "iron", layout = "grid", plaza = "parade",
		street = { "sand", "dirt", "gravel", "cobble", "paved" }, lamp = "oil_lantern", ground = "sand", weatherGround = "monsoon_mud",
		signature = { "광석 선적 부두", "성벽 세관", "대성당" }, facade = { 233, 215, 187 }, roofTint = { 180, 99, 73 } },
}

local M = {}
M.Tier = Tier
M.Ports = P
M.ROOFS = { gable = true, flat = true, dome = true, eave = true, hip = true, thatch = true }
M.WALLS = { brick = true, timber = true, stone = true, stucco = true, coral = true, adobe = true, wood = true, plaster = true }
M.LAYOUTS = { grid = true, canal = true, terrace = true, radial = true, organic = true }
M.PLAZAS = { fountain = true, market = true, temple_court = true, quay = true, parade = true }
M.STREETS = { dirt = true, gravel = true, cobble = true, flagstone = true, paved = true, plank = true, brick = true, sand = true, red_earth = true }
M.LAMPS = { torch = true, oil_lantern = true, paper_lantern = true, mosque_lamp = true, stone_lantern = true, gas_lamp = true }
M.GROUNDS = { grass = true, sand = true, mud = true, snowmelt = true, red_earth = true, rice_paddy = true }
M.WEATHER = { puddles = true, dust = true, snow = true, monsoon_mud = true, none = true }

-- 길 재질 → { Roblox 재질 이름, R, G, B } (PortScene 이 Enum.Material/Color3 로 바꾼다)
M.STREET_LOOK = {
	dirt = { "Ground", 122, 96, 70 },
	gravel = { "Pebble", 140, 132, 118 },
	cobble = { "Cobblestone", 128, 124, 118 },
	flagstone = { "Slate", 158, 150, 136 },
	paved = { "Pavement", 150, 146, 140 },
	plank = { "WoodPlanks", 120, 92, 64 },
	brick = { "Brick", 150, 82, 64 },
	sand = { "Sand", 206, 186, 140 },
	red_earth = { "Ground", 150, 92, 62 },
}
-- 길 밖 땅 → { 재질 이름, R, G, B }
M.GROUND_LOOK = {
	grass = { "Grass", 96, 128, 72 },
	sand = { "Sand", 214, 196, 150 },
	mud = { "Mud", 104, 90, 70 },
	snowmelt = { "Glacier", 210, 214, 218 },
	red_earth = { "Ground", 160, 104, 72 },
	rice_paddy = { "Mud", 96, 116, 78 },
}

function M.get(portId: string): Identity?
	return P[portId]
end

-- [전체 항구 고유 외형] 15개 원본 지시서는 지정 색을 그대로 쓰고,
-- 나머지 항구는 기존 문화권의 벽·지붕·도로 팔레트에서 항구 ID별 고정 변형을 만든다.
-- 어떤 모델도 새로 생성·선택하지 않으며 항구 데이터·저장·경제는 변경하지 않는다.
-- 같은 항구는 방문할 때마다 항상 같은 색이며 서로 다른 문화권의 재료색을 섞지 않는다.
function M.appearance(portId: string?, wall: any, roof: any, street: any, colorFactory: any): (any, any, any)
	if not portId then return wall, roof, street end
	local identity = P[portId]
	if identity then
		local facade = identity.facade
		local tiles = identity.roofTint
		return colorFactory.fromRGB(facade[1], facade[2], facade[3]),
			colorFactory.fromRGB(tiles[1], tiles[2], tiles[3]), street
	end
	local hash = 0
	for i = 1, #portId do
		hash = (hash * 31 + string.byte(portId, i)) % 2147483647
	end
	local hue, saturation, lightness = wall:ToHSV()
	local roofHue, roofSaturation, roofLightness = roof:ToHSV()
	local streetHue, streetSaturation, streetLightness = street:ToHSV()
	local wallTone = colorFactory.fromHSV((hue + ((hash % 43) - 21) / 1800) % 1,
		math.clamp(saturation * (0.84 + (math.floor(hash / 43) % 29) / 100), 0.04, 0.88),
		math.clamp(lightness * (0.86 + (math.floor(hash / 1247) % 28) / 100), 0.2, 0.99))
	local roofTone = colorFactory.fromHSV((roofHue + ((math.floor(hash / 107) % 37) - 18) / 2000) % 1,
		math.clamp(roofSaturation * (0.88 + (math.floor(hash / 3969) % 25) / 100), 0.04, 0.88),
		math.clamp(roofLightness * (0.85 + (math.floor(hash / 99225) % 29) / 100), 0.16, 0.96))
	local roadTone = colorFactory.fromHSV((streetHue + ((math.floor(hash / 31) % 25) - 12) / 2200) % 1,
		math.clamp(streetSaturation * (0.9 + (math.floor(hash / 775) % 21) / 100), 0.02, 0.65),
		math.clamp(streetLightness * (0.92 + (hash % 17) / 100), 0.2, 0.98))
	return wallTone, roofTone, roadTone
end

function M.tier(lvl: number): any
	return Tier[math.clamp(math.floor(lvl), 1, 5)]
end

-- 이 단계의 길 재질 이름
function M.streetAt(portId: string, lvl: number): string?
	local id = P[portId]
	if not id then
		return nil
	end
	return id.street[math.clamp(math.floor(lvl), 1, #id.street)]
end

return M
