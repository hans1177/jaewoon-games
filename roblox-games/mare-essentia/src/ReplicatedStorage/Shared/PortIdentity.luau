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
	reflow: { lane: number, plaza: number, side: number, landmarkX: number, landmarkZ: number, district: number, facility: number }?, -- [항구별 재배치] 기존 필지·모델 좌표만 조정
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
		signature = { "왕립 거래소", "양조장", "해군 공창" }, facade = { 146, 84, 67 }, roofTint = { 79, 83, 91 },
		reflow = { lane = -9, plaza = -11, side = 1, landmarkX = -7, landmarkZ = 6, district = -9, facility = 1 } },
	amsterdam = { landmark = { id = "lm_amsterdam_canal", name = "운하 수문과 계량소", kind = "canal_gate", fallback = "warehouse" },
		roof = "gable", wall = "brick", balcony = "iron", layout = "canal", plaza = "quay",
		street = { "plank", "brick", "brick", "brick", "paved" }, lamp = "oil_lantern", ground = "mud", weatherGround = "puddles",
		signature = { "동인도회사 상관", "풍차 제분소", "거래소" }, facade = { 166, 78, 62 }, roofTint = { 91, 63, 60 },
		reflow = { lane = 9, plaza = -15, side = 1, landmarkX = 7, landmarkZ = -7, district = 8, facility = 2 } },
	rouen = { landmark = { id = "lm_rouen_cathedral", name = "고딕 대성당 첨탑", kind = "spire", fallback = "church" },
		roof = "hip", wall = "stone", balcony = nil, layout = "organic", plaza = "fountain",
		street = { "dirt", "gravel", "cobble", "flagstone", "paved" }, lamp = "oil_lantern", ground = "grass", weatherGround = "puddles",
		signature = { "직물 시장", "대시계 문루", "포도주 저장고" }, facade = { 213, 193, 164 }, roofTint = { 70, 76, 91 },
		reflow = { lane = -6, plaza = 5, side = -1, landmarkX = -3, landmarkZ = 7, district = -3, facility = 3 } },
	copenhagen = { landmark = { id = "lm_copenhagen_tower", name = "원형 천문탑", kind = "tower", fallback = "tower" },
		roof = "gable", wall = "wood", balcony = nil, layout = "canal", plaza = "quay",
		street = { "dirt", "gravel", "gravel", "cobble", "paved" }, lamp = "oil_lantern", ground = "grass", weatherGround = "snow",
		signature = { "해협 세관", "증권거래소", "목조 창고" }, facade = { 227, 191, 129 }, roofTint = { 88, 104, 94 },
		reflow = { lane = 4, plaza = -8, side = 1, landmarkX = 4, landmarkZ = -5, district = 5, facility = 4 } },
	gothenburg = { landmark = { id = "lm_gothenburg_fort", name = "언덕 위 왕관 요새", kind = "fort", fallback = "fort" },
		roof = "gable", wall = "wood", balcony = nil, layout = "canal", plaza = "quay",
		street = { "dirt", "gravel", "gravel", "cobble", "paved" }, lamp = "oil_lantern", ground = "grass", weatherGround = "snow",
		signature = { "동인도회사 창고", "제재소", "목조 교회" }, facade = { 171, 65, 57 }, roofTint = { 72, 78, 76 },
		reflow = { lane = -4, plaza = 7, side = -1, landmarkX = -4, landmarkZ = 5, district = -8, facility = 5 } },
	venice = { landmark = { id = "lm_venice_campanile", name = "광장 종탑", kind = "campanile", fallback = "tower" },
		roof = "hip", wall = "stucco", balcony = "loggia", layout = "canal", plaza = "fountain",
		street = { "dirt", "flagstone", "flagstone", "flagstone", "flagstone" }, lamp = "oil_lantern", ground = "mud", weatherGround = "puddles",
		signature = { "유리 공방", "검역소", "베네치아 공창" }, facade = { 220, 173, 147 }, roofTint = { 164, 88, 66 },
		reflow = { lane = 12, plaza = -5, side = 1, landmarkX = 5, landmarkZ = -4, district = 4, facility = 6 } },
	istanbul = { landmark = { id = "lm_istanbul_mosque", name = "대모스크 돔과 첨탑", kind = "dome", fallback = "temple" },
		roof = "dome", wall = "stone", balcony = "mashrabiya", layout = "terrace", plaza = "temple_court",
		street = { "dirt", "gravel", "cobble", "flagstone", "flagstone" }, lamp = "mosque_lamp", ground = "red_earth", weatherGround = "dust",
		signature = { "그랜드 바자르", "함맘", "카라반사라이" }, facade = { 215, 197, 165 }, roofTint = { 158, 103, 88 },
		reflow = { lane = -8, plaza = 8, side = 1, landmarkX = -6, landmarkZ = 7, district = 6, facility = 2 } },
	zanzibar = { landmark = { id = "lm_zanzibar_house", name = "산호석 궁전과 조각문", kind = "palace", fallback = "palace" },
		roof = "flat", wall = "coral", balcony = "wood_lattice", layout = "organic", plaza = "quay",
		street = { "sand", "sand", "gravel", "flagstone", "flagstone" }, lamp = "oil_lantern", ground = "sand", weatherGround = "monsoon_mud",
		signature = { "정향 창고", "다우선 선착장", "산호석 모스크" }, facade = { 229, 217, 188 }, roofTint = { 172, 142, 104 },
		reflow = { lane = 6, plaza = -4, side = -1, landmarkX = 7, landmarkZ = -6, district = -7, facility = 1 } },
	calicut = { landmark = { id = "lm_calicut_temple", name = "목조 사원 고푸람", kind = "gopuram", fallback = "temple" },
		roof = "eave", wall = "plaster", balcony = "wood_lattice", layout = "organic", plaza = "market",
		street = { "red_earth", "red_earth", "gravel", "flagstone", "paved" }, lamp = "oil_lantern", ground = "red_earth", weatherGround = "monsoon_mud",
		signature = { "후추 교역소", "면직 공방", "조선 작업장" }, facade = { 184, 144, 104 }, roofTint = { 143, 87, 64 },
		reflow = { lane = -7, plaza = 10, side = -1, landmarkX = -4, landmarkZ = 4, district = 9, facility = 3 } },
	nagasaki = { landmark = { id = "lm_nagasaki_dejima", name = "데지마 부채꼴 상관", kind = "island_post", fallback = "warehouse" },
		roof = "eave", wall = "wood", balcony = "wood_lattice", layout = "terrace", plaza = "quay",
		street = { "dirt", "gravel", "gravel", "flagstone", "flagstone" }, lamp = "stone_lantern", ground = "grass", weatherGround = "puddles",
		signature = { "도자기 가마", "쌀 창고", "신사 도리이" }, facade = { 117, 99, 76 }, roofTint = { 77, 78, 79 },
		reflow = { lane = 9, plaza = -7, side = 1, landmarkX = 6, landmarkZ = -8, district = 7, facility = 4 } },
	veracruz = { landmark = { id = "lm_veracruz_fort", name = "산후안 데 울루아 요새", kind = "fort", fallback = "fort" },
		roof = "flat", wall = "stucco", balcony = "iron", layout = "grid", plaza = "parade",
		street = { "sand", "dirt", "gravel", "cobble", "paved" }, lamp = "oil_lantern", ground = "sand", weatherGround = "dust",
		signature = { "은 선적 부두", "세관", "대성당" }, facade = { 220, 190, 156 }, roofTint = { 183, 100, 75 },
		reflow = { lane = -5, plaza = -13, side = 1, landmarkX = -5, landmarkZ = 4, district = -4, facility = 5 } },
	canton = { landmark = { id = "lm_canton_hongs", name = "십삼행 상관 거리", kind = "trade_row", fallback = "warehouse" },
		roof = "eave", wall = "brick", balcony = "wood_lattice", layout = "grid", plaza = "quay",
		street = { "dirt", "gravel", "flagstone", "flagstone", "paved" }, lamp = "paper_lantern", ground = "rice_paddy", weatherGround = "monsoon_mud",
		signature = { "차 시장", "도자기 상점", "관창" }, facade = { 174, 168, 154 }, roofTint = { 58, 71, 69 },
		reflow = { lane = 11, plaza = -9, side = 1, landmarkX = 8, landmarkZ = -7, district = 8, facility = 6 } },
	seville = { landmark = { id = "lm_seville_giralda", name = "히랄다 종탑", kind = "campanile", fallback = "tower" },
		roof = "hip", wall = "stucco", balcony = "iron", layout = "organic", plaza = "fountain",
		street = { "dirt", "gravel", "cobble", "flagstone", "paved" }, lamp = "oil_lantern", ground = "red_earth", weatherGround = "dust",
		signature = { "인도 무역원", "올리브 압착소", "황금탑 부두" }, facade = { 239, 227, 204 }, roofTint = { 180, 91, 61 },
		reflow = { lane = -11, plaza = 6, side = -1, landmarkX = -6, landmarkZ = 6, district = -9, facility = 2 } },
	busan = { landmark = { id = "lm_busan_fort", name = "왜관과 진성", kind = "fort", fallback = "fort" },
		roof = "eave", wall = "plaster", balcony = nil, layout = "terrace", plaza = "market",
		street = { "dirt", "dirt", "gravel", "flagstone", "flagstone" }, lamp = "paper_lantern", ground = "grass", weatherGround = "snow",
		signature = { "판옥선 조선소", "장시", "향교" }, facade = { 222, 216, 201 }, roofTint = { 66, 71, 81 },
		reflow = { lane = 7, plaza = -11, side = 1, landmarkX = 4, landmarkZ = -6, district = 7, facility = 1 } },
	lisbon = { landmark = { id = "lm_lisbon_belem", name = "벨렝 탑", kind = "tower", fallback = "tower" },
		roof = "hip", wall = "stucco", balcony = "iron", layout = "terrace", plaza = "fountain",
		street = { "dirt", "gravel", "cobble", "flagstone", "paved" }, lamp = "oil_lantern", ground = "red_earth", weatherGround = "puddles",
		signature = { "항해 학교", "향신료 창고", "수도원" }, facade = { 224, 200, 174 }, roofTint = { 161, 91, 66 },
		reflow = { lane = -6, plaza = 11, side = 1, landmarkX = -4, landmarkZ = 8, district = -7, facility = 3 } },
	-- [항구별 외관] 시드니 코브: 등록된 현지 원본만 사용하고 없는 집회소는 미등록으로 남긴다.
	sydney = { landmark = { id = "lm_sydney_meeting_house", name = "시드니 코브 집회소", kind = "meeting_house", fallback = "warehouse" },
		roof = "thatch", wall = "wood", balcony = nil, layout = "organic", plaza = "quay",
		street = { "sand", "sand", "gravel", "plank", "paved" }, lamp = "torch", ground = "grass", weatherGround = "dust",
		signature = { "직물 공방", "염색 작업장", "목재 선창" }, facade = { 186, 158, 120 }, roofTint = { 135, 112, 78 },
		reflow = { lane = 8, plaza = -12, side = 1, landmarkX = 7, landmarkZ = -5, district = 9, facility = 5 } },
	-- [항구별 외관] 카르타헤나 데 인디아스: 지중해 카르타헤나와 구별되는 카리브 식민항.
	cartagena_indias = { landmark = { id = "lm_cartagena_indias_cathedral", name = "바로크 대성당 정면", kind = "cathedral", fallback = "church" },
		roof = "flat", wall = "stucco", balcony = "iron", layout = "grid", plaza = "parade",
		street = { "sand", "dirt", "gravel", "cobble", "paved" }, lamp = "oil_lantern", ground = "sand", weatherGround = "monsoon_mud",
		signature = { "광석 선적 부두", "성벽 세관", "대성당" }, facade = { 233, 215, 187 }, roofTint = { 180, 99, 73 },
		reflow = { lane = -8, plaza = -7, side = 1, landmarkX = -8, landmarkZ = 6, district = -5, facility = 4 } },
	-- [항구별 지시서] 스웨덴 스톡홀름: 붉은 목조 가옥·자갈길·선창. 고유 목조 첨탑은 원본 등록 전까지 누락으로 둔다.
	stockholm = { landmark = { id = "lm_stockholm_stave_tower", name = "목조 교회와 구리 첨탑", kind = "spire", fallback = "church" },
		roof = "gable", wall = "wood", balcony = nil, layout = "organic", plaza = "quay",
		street = { "dirt", "gravel", "gravel", "cobble", "paved" }, lamp = "oil_lantern", ground = "snowmelt", weatherGround = "snow",
		signature = { "철광석 선창", "목조 상관", "금속 공방" }, facade = { 174, 79, 66 }, roofTint = { 84, 81, 74 },
		reflow = { lane = -10, plaza = 8, side = -1, landmarkX = -5, landmarkZ = 7, district = 8, facility = 3 } },
	-- [항구별 지시서] 노르웨이 베르겐: 목조 어시장·염장 항만. 브뤼겐 전용 교회 원본은 미등록.
	bergen = { landmark = { id = "lm_bergen_stave_church", name = "목조 교회와 첨탑", kind = "spire", fallback = "church" },
		roof = "gable", wall = "wood", balcony = nil, layout = "organic", plaza = "quay",
		street = { "dirt", "gravel", "gravel", "cobble", "paved" }, lamp = "oil_lantern", ground = "snowmelt", weatherGround = "snow",
		signature = { "생선 건조장", "염장 창고", "어시장" }, facade = { 185, 91, 60 }, roofTint = { 87, 82, 69 },
		reflow = { lane = -4, plaza = -9, side = -1, landmarkX = 5, landmarkZ = -6, district = -8, facility = 2 } },
	-- [항구별 지시서] 함부르크: 붉은 벽돌 상관·직물 시장·운하 도시. 쌍탑 성문 원본은 미등록.
	hamburg = { landmark = { id = "lm_hamburg_city_gate", name = "고딕 벽돌 쌍탑 성문", kind = "city_gate", fallback = "gate" },
		roof = "gable", wall = "brick", balcony = nil, layout = "canal", plaza = "market",
		street = { "dirt", "cobble", "cobble", "cobble", "paved" }, lamp = "oil_lantern", ground = "mud", weatherGround = "puddles",
		signature = { "직물 회관", "적벽돌 상관", "무역 창고" }, facade = { 152, 76, 64 }, roofTint = { 84, 70, 66 },
		reflow = { lane = 12, plaza = 11, side = -1, landmarkX = 7, landmarkZ = 5, district = 6, facility = 6 } },
	-- [항구별 지시서] 포르투: 언덕길·흰 회벽·포도주 선창. 전용 성당 종탑은 미등록.
	porto = { landmark = { id = "lm_porto_cathedral_tower", name = "성당 종탑과 구시가 요새", kind = "campanile", fallback = "tower" },
		roof = "hip", wall = "stucco", balcony = "iron", layout = "terrace", plaza = "fountain",
		street = { "dirt", "gravel", "cobble", "flagstone", "paved" }, lamp = "oil_lantern", ground = "grass", weatherGround = "puddles",
		signature = { "포도주 저장고", "올리브 압착소", "포구 시장" }, facade = { 225, 201, 165 }, roofTint = { 167, 99, 69 },
		reflow = { lane = -9, plaza = 10, side = -1, landmarkX = -5, landmarkZ = 8, district = 9, facility = 5 } },
	-- [항구별 지시서] 에든버러: 언덕 구시가·석판으로 성장하는 대로. 시계 교회 전용 원본은 미등록.
	edinburgh = { landmark = { id = "lm_edinburgh_clock_church", name = "고딕 교구 교회 시계탑", kind = "clock_tower", fallback = "church" },
		roof = "gable", wall = "brick", balcony = nil, layout = "terrace", plaza = "market",
		street = { "dirt", "gravel", "cobble", "cobble", "paved" }, lamp = "oil_lantern", ground = "grass", weatherGround = "snow",
		signature = { "석탄 선창", "양모 작업장", "아마 직물 창고" }, facade = { 164, 132, 118 }, roofTint = { 80, 84, 88 },
		reflow = { lane = 5, plaza = -7, side = -1, landmarkX = -7, landmarkZ = 6, district = -6, facility = 4 } },
	-- [항구별 지시서] 발레타: 석판 도로·황토 회벽·지중해 어시장. 전용 종탑 원본은 미등록.
	valletta = { landmark = { id = "lm_valletta_campanile", name = "돔 성당 옆 벽돌 종탑", kind = "campanile", fallback = "tower" },
		roof = "hip", wall = "stucco", balcony = "loggia", layout = "grid", plaza = "fountain",
		street = { "dirt", "flagstone", "flagstone", "flagstone", "flagstone" }, lamp = "oil_lantern", ground = "sand", weatherGround = "dust",
		signature = { "어시장", "생선 염장소", "선창 창고" }, facade = { 215, 180, 141 }, roofTint = { 157, 100, 68 },
		reflow = { lane = 7, plaza = -12, side = 1, landmarkX = 6, landmarkZ = -5, district = 8, facility = 2 } },
	-- [항구별 지시서] 제노바: 계단식 항구·비단 상점·지중해 회벽. 전용 종탑 원본은 미등록.
	genoa = { landmark = { id = "lm_genoa_campanile", name = "돔 성당 곁 벽돌 종탑", kind = "campanile", fallback = "tower" },
		roof = "hip", wall = "stucco", balcony = "loggia", layout = "terrace", plaza = "fountain",
		street = { "dirt", "flagstone", "flagstone", "flagstone", "flagstone" }, lamp = "oil_lantern", ground = "red_earth", weatherGround = "puddles",
		signature = { "비단 직물 시장", "올리브 압착소", "산호 상관" }, facade = { 221, 176, 146 }, roofTint = { 169, 96, 68 },
		reflow = { lane = -8, plaza = 7, side = -1, landmarkX = -5, landmarkZ = 7, district = -8, facility = 1 } },
	-- [항구별 지시서] 하바나: 파스텔 목조 가옥·열대 선창·식민지 광장. 전용 요새 원본은 미등록.
	havana = { landmark = { id = "lm_havana_signal_fort", name = "해안 석조 요새와 신호탑", kind = "fort", fallback = "fort" },
		roof = "hip", wall = "wood", balcony = "wood_lattice", layout = "grid", plaza = "parade",
		street = { "sand", "dirt", "gravel", "brick", "paved" }, lamp = "oil_lantern", ground = "sand", weatherGround = "monsoon_mud",
		signature = { "설탕 저장고", "럼주 증류소", "마호가니 선창" }, facade = { 218, 184, 153 }, roofTint = { 157, 103, 77 },
		reflow = { lane = 10, plaza = -8, side = 1, landmarkX = 7, landmarkZ = -7, district = 6, facility = 3 } },
	-- [추가 항구 배치] bordeaux: 지시서의 기후·주택·도로·광장·특산 구역만 기존 모델과 필지에 적용.
	bordeaux = { landmark = { id = "lm_bordeaux_spire", name = "고딕 석조 성당 첨탑", kind = "spire", fallback = "none" },
		roof = "hip", wall = "stone", balcony = "iron", layout = "organic", plaza = "fountain",
		street = { "dirt", "gravel", "cobble", "flagstone", "paved" }, lamp = "oil_lantern", ground = "grass", weatherGround = "puddles",
		signature = { "와인 저장고", "강변 생선 시장", "소금 창고" }, facade = { 210, 198, 177 }, roofTint = { 86, 92, 104 },
		reflow = { lane = -3, plaza = 12, side = -1, landmarkX = -6, landmarkZ = 6, district = 5, facility = 5 } },
	-- [추가 항구 배치] marseille: 지시서의 기후·주택·도로·광장·특산 구역만 기존 모델과 필지에 적용.
	marseille = { landmark = { id = "lm_marseille_fort", name = "해안 성채와 성당 첨탑", kind = "fort", fallback = "none" },
		roof = "hip", wall = "stone", balcony = "iron", layout = "organic", plaza = "fountain",
		street = { "dirt", "gravel", "cobble", "flagstone", "paved" }, lamp = "oil_lantern", ground = "grass", weatherGround = "puddles",
		signature = { "염장 어시장", "올리브 교역소", "항만 창고" }, facade = { 229, 209, 170 }, roofTint = { 157, 110, 84 },
		reflow = { lane = 10, plaza = -14, side = 1, landmarkX = 5, landmarkZ = -5, district = 8, facility = 2 } },
	-- [추가 항구 배치] naples: 지시서의 기후·주택·도로·광장·특산 구역만 기존 모델과 필지에 적용.
	naples = { landmark = { id = "lm_naples_campanile", name = "돔 성당과 종탑", kind = "campanile", fallback = "none" },
		roof = "hip", wall = "stucco", balcony = "loggia", layout = "terrace", plaza = "fountain",
		street = { "dirt", "flagstone", "flagstone", "flagstone", "flagstone" }, lamp = "oil_lantern", ground = "red_earth", weatherGround = "puddles",
		signature = { "비단 시장", "포도주 선창", "산호 상관" }, facade = { 226, 184, 145 }, roofTint = { 165, 91, 62 },
		reflow = { lane = -11, plaza = 9, side = -1, landmarkX = -3, landmarkZ = 8, district = -7, facility = 4 } },
	-- [추가 항구 배치] athens: 지시서의 기후·주택·도로·광장·특산 구역만 기존 모델과 필지에 적용.
	athens = { landmark = { id = "lm_athens_dome", name = "돔과 가는 첨탑이 있는 사원", kind = "dome", fallback = "none" },
		roof = "dome", wall = "stone", balcony = "mashrabiya", layout = "terrace", plaza = "temple_court",
		street = { "dirt", "gravel", "cobble", "flagstone", "flagstone" }, lamp = "mosque_lamp", ground = "red_earth", weatherGround = "dust",
		signature = { "올리브 압착소", "대리석 상관", "직물 시장" }, facade = { 212, 195, 165 }, roofTint = { 144, 99, 81 },
		reflow = { lane = 6, plaza = 14, side = -1, landmarkX = 4, landmarkZ = 6, district = 2, facility = 6 } },
	-- [추가 항구 배치] goa: 지시서의 기후·주택·도로·광장·특산 구역만 기존 모델과 필지에 적용.
	goa = { landmark = { id = "lm_goa_gopuram", name = "층층 지붕의 사원 문루", kind = "gopuram", fallback = "none" },
		roof = "eave", wall = "plaster", balcony = "wood_lattice", layout = "organic", plaza = "market",
		street = { "red_earth", "red_earth", "gravel", "flagstone", "paved" }, lamp = "oil_lantern", ground = "red_earth", weatherGround = "monsoon_mud",
		signature = { "향신료 창고", "보석 상관", "쌀 교역소" }, facade = { 226, 193, 149 }, roofTint = { 133, 79, 66 },
		reflow = { lane = -8, plaza = -15, side = 1, landmarkX = -7, landmarkZ = -4, district = -4, facility = 3 } },
	-- [추가 항구 배치] manila: 지시서의 기후·주택·도로·광장·특산 구역만 기존 모델과 필지에 적용.
	manila = { landmark = { id = "lm_manila_cathedral", name = "쌍탑 바로크 식민지 대성당", kind = "cathedral", fallback = "none" },
		roof = "flat", wall = "stucco", balcony = "iron", layout = "grid", plaza = "parade",
		street = { "sand", "dirt", "gravel", "cobble", "paved" }, lamp = "oil_lantern", ground = "sand", weatherGround = "monsoon_mud",
		signature = { "은 선적 부두", "설탕 창고", "쌀 시장" }, facade = { 226, 212, 176 }, roofTint = { 166, 100, 78 },
		reflow = { lane = 11, plaza = 8, side = 1, landmarkX = 8, landmarkZ = -6, district = 9, facility = 1 } },
	-- [추가 항구 배치] osaka: 지시서의 기후·주택·도로·광장·특산 구역만 기존 모델과 필지에 적용.
	osaka = { landmark = { id = "lm_osaka_castle", name = "석단 위 성곽 천수각", kind = "castle", fallback = "none" },
		roof = "eave", wall = "wood", balcony = "wood_lattice", layout = "terrace", plaza = "quay",
		street = { "dirt", "gravel", "gravel", "flagstone", "flagstone" }, lamp = "stone_lantern", ground = "grass", weatherGround = "puddles",
		signature = { "쌀 교역소", "동 주조소", "칠기 공방" }, facade = { 147, 124, 96 }, roofTint = { 73, 77, 73 },
		reflow = { lane = -5, plaza = -10, side = 1, landmarkX = 6, landmarkZ = 4, district = -9, facility = 6 } },
	-- [추가 항구 배치] cape_town: 지시서의 기후·주택·도로·광장·특산 구역만 기존 모델과 필지에 적용.
	cape_town = { landmark = { id = "lm_cape_town_chapel", name = "언덕 위 예배당과 종루", kind = "chapel", fallback = "none" },
		roof = "flat", wall = "stucco", balcony = "wood_lattice", layout = "grid", plaza = "fountain",
		street = { "dirt", "gravel", "flagstone", "flagstone", "paved" }, lamp = "oil_lantern", ground = "grass", weatherGround = "dust",
		signature = { "어시장", "포도주 선창", "양모 창고" }, facade = { 229, 220, 197 }, roofTint = { 99, 123, 146 },
		reflow = { lane = 12, plaza = 13, side = -1, landmarkX = -4, landmarkZ = -7, district = -7, facility = 2 } },

	-- [항구별 재배치 34~50] alexandria: 기존 승인 모델과 지시서 기반 공간 배치.
	alexandria = { landmark = { id = "lm_alexandria_mosque", name = "항만 대모스크의 돔과 첨탑", kind = "mosque", fallback = "none" },
		roof = "dome", wall = "stone", balcony = "mashrabiya", layout = "terrace", plaza = "temple_court",
		street = { "dirt", "gravel", "cobble", "flagstone", "flagstone" }, lamp = "mosque_lamp", ground = "red_earth", weatherGround = "dust",
		signature = { "직물 염색 공방", "향신료 상관", "면직물 시장" }, facade = { 211, 188, 156 }, roofTint = { 154, 109, 86 },
		reflow = { lane = -12, plaza = 7, side = 1, landmarkX = -8, landmarkZ = 5, district = -11, facility = 2 } },
	-- [항구별 재배치 34~50] algiers: 기존 승인 모델과 지시서 기반 공간 배치.
	algiers = { landmark = { id = "lm_algiers_mosque", name = "카스바 언덕 모스크 돔", kind = "mosque", fallback = "none" },
		roof = "dome", wall = "stone", balcony = "mashrabiya", layout = "organic", plaza = "temple_court",
		street = { "dirt", "gravel", "cobble", "flagstone", "flagstone" }, lamp = "mosque_lamp", ground = "sand", weatherGround = "dust",
		signature = { "올리브 압착소", "산호 교역소", "양모 창고" }, facade = { 226, 209, 181 }, roofTint = { 149, 110, 90 },
		reflow = { lane = 5, plaza = -14, side = -1, landmarkX = 6, landmarkZ = -5, district = 4, facility = 3 } },
	-- [항구별 재배치 34~50] antwerp: 기존 승인 모델과 지시서 기반 공간 배치.
	antwerp = { landmark = { id = "lm_antwerp_belfry", name = "직물 회관의 벽돌 종탑", kind = "belfry", fallback = "none" },
		roof = "gable", wall = "brick", balcony = "iron", layout = "canal", plaza = "quay",
		street = { "plank", "brick", "brick", "brick", "paved" }, lamp = "oil_lantern", ground = "mud", weatherGround = "puddles",
		signature = { "직물 회관", "유리 공방", "운하 창고" }, facade = { 174, 81, 68 }, roofTint = { 93, 71, 65 },
		reflow = { lane = 11, plaza = -13, side = 1, landmarkX = 7, landmarkZ = 8, district = -6, facility = 4 } },
	-- [항구별 재배치 34~50] barcelona: 기존 승인 모델과 지시서 기반 공간 배치.
	barcelona = { landmark = { id = "lm_barcelona_campanile", name = "대성당의 종탑과 성곽", kind = "campanile", fallback = "none" },
		roof = "hip", wall = "stucco", balcony = "iron", layout = "terrace", plaza = "fountain",
		street = { "dirt", "gravel", "cobble", "flagstone", "paved" }, lamp = "oil_lantern", ground = "red_earth", weatherGround = "dust",
		signature = { "올리브 압착소", "양모 시장", "포도주 선창" }, facade = { 234, 216, 188 }, roofTint = { 176, 100, 72 },
		reflow = { lane = -9, plaza = 12, side = -1, landmarkX = -5, landmarkZ = 7, district = 7, facility = 5 } },
	-- [항구별 재배치 34~50] beirut: 기존 승인 모델과 지시서 기반 공간 배치.
	beirut = { landmark = { id = "lm_beirut_mosque", name = "산비탈의 돔과 가는 첨탑", kind = "mosque", fallback = "none" },
		roof = "dome", wall = "stone", balcony = "mashrabiya", layout = "organic", plaza = "temple_court",
		street = { "dirt", "gravel", "cobble", "flagstone", "flagstone" }, lamp = "mosque_lamp", ground = "red_earth", weatherGround = "dust",
		signature = { "비단 직물 공방", "면화 창고", "향신료 시장" }, facade = { 212, 194, 167 }, roofTint = { 142, 109, 85 },
		reflow = { lane = 4, plaza = 15, side = 1, landmarkX = 3, landmarkZ = -8, district = -8, facility = 6 } },
	-- [항구별 재배치 34~50] boston: 기존 승인 모델과 지시서 기반 공간 배치.
	boston = { landmark = { id = "lm_boston_fort", name = "석조 항만 요새 감시탑", kind = "fort", fallback = "none" },
		roof = "hip", wall = "stone", balcony = nil, layout = "grid", plaza = "parade",
		street = { "dirt", "gravel", "cobble", "flagstone", "paved" }, lamp = "oil_lantern", ground = "grass", weatherGround = "puddles",
		signature = { "생선 염장소", "목재 선창", "고래 기름 창고" }, facade = { 177, 169, 157 }, roofTint = { 88, 93, 105 },
		reflow = { lane = -10, plaza = -12, side = 1, landmarkX = -7, landmarkZ = -7, district = 6, facility = 1 } },
	-- [항구별 재배치 34~50] buenos_aires: 기존 승인 모델과 지시서 기반 공간 배치.
	buenos_aires = { landmark = { id = "lm_buenos_aires_cathedral", name = "쌍탑 식민지 대성당", kind = "cathedral", fallback = "none" },
		roof = "flat", wall = "stucco", balcony = "iron", layout = "grid", plaza = "parade",
		street = { "sand", "dirt", "gravel", "cobble", "paved" }, lamp = "oil_lantern", ground = "red_earth", weatherGround = "dust",
		signature = { "은 선적 부두", "가죽 상관", "양모 시장" }, facade = { 226, 203, 176 }, roofTint = { 175, 101, 78 },
		reflow = { lane = 12, plaza = 4, side = -1, landmarkX = 8, landmarkZ = 6, district = -3, facility = 2 } },
	-- [항구별 재배치 34~50] cadiz: 기존 승인 모델과 지시서 기반 공간 배치.
	cadiz = { landmark = { id = "lm_cadiz_campanile", name = "해안 대성당 종탑", kind = "campanile", fallback = "none" },
		roof = "hip", wall = "stucco", balcony = "iron", layout = "grid", plaza = "fountain",
		street = { "dirt", "gravel", "cobble", "flagstone", "paved" }, lamp = "oil_lantern", ground = "sand", weatherGround = "dust",
		signature = { "소금 저장고", "향신료 선창", "포도주 상관" }, facade = { 242, 225, 196 }, roofTint = { 172, 113, 77 },
		reflow = { lane = -6, plaza = -9, side = 1, landmarkX = -5, landmarkZ = -5, district = 10, facility = 3 } },
	-- [항구별 재배치 34~50] colombo: 기존 승인 모델과 지시서 기반 공간 배치.
	colombo = { landmark = { id = "lm_colombo_gopuram", name = "층층 지붕 사원 문루", kind = "gopuram", fallback = "none" },
		roof = "eave", wall = "plaster", balcony = "wood_lattice", layout = "terrace", plaza = "market",
		street = { "red_earth", "red_earth", "gravel", "flagstone", "paved" }, lamp = "oil_lantern", ground = "red_earth", weatherGround = "monsoon_mud",
		signature = { "계피 창고", "보석 감정소", "진주 시장" }, facade = { 225, 205, 164 }, roofTint = { 136, 91, 66 },
		reflow = { lane = 8, plaza = 11, side = -1, landmarkX = 4, landmarkZ = 7, district = -10, facility = 4 } },
	-- [항구별 재배치 34~50] dakar: 기존 승인 모델과 지시서 기반 공간 배치.
	dakar = { landmark = { id = "lm_dakar_mosque", name = "진흙벽 모스크와 목조 들보", kind = "mosque", fallback = "none" },
		roof = "thatch", wall = "adobe", balcony = nil, layout = "organic", plaza = "market",
		street = { "red_earth", "red_earth", "gravel", "flagstone", "paved" }, lamp = "torch", ground = "sand", weatherGround = "monsoon_mud",
		signature = { "생선 건조장", "아라비아고무 창고", "상아 상관" }, facade = { 172, 130, 92 }, roofTint = { 113, 92, 67 },
		reflow = { lane = -3, plaza = -15, side = -1, landmarkX = -2, landmarkZ = -6, district = -12, facility = 5 } },
	-- [항구별 재배치 34~50] dublin: 기존 승인 모델과 지시서 기반 공간 배치.
	dublin = { landmark = { id = "lm_dublin_clock_tower", name = "시계가 달린 교구 교회 첨탑", kind = "clock_tower", fallback = "none" },
		roof = "gable", wall = "brick", balcony = nil, layout = "organic", plaza = "market",
		street = { "dirt", "gravel", "cobble", "cobble", "paved" }, lamp = "oil_lantern", ground = "grass", weatherGround = "puddles",
		signature = { "양모 직물 공방", "맥주 양조장", "상인 시장" }, facade = { 151, 110, 91 }, roofTint = { 79, 90, 95 },
		reflow = { lane = 7, plaza = -6, side = 1, landmarkX = 6, landmarkZ = 6, district = 2, facility = 6 } },
	-- [항구별 재배치 34~50] edo: 기존 승인 모델과 지시서 기반 공간 배치.
	edo = { landmark = { id = "lm_edo_castle", name = "석단 위 에도 성 천수각", kind = "castle", fallback = "none" },
		roof = "eave", wall = "wood", balcony = "wood_lattice", layout = "terrace", plaza = "quay",
		street = { "dirt", "gravel", "gravel", "flagstone", "flagstone" }, lamp = "stone_lantern", ground = "grass", weatherGround = "puddles",
		signature = { "쌀 도매 시장", "칠기 공방", "비단 창고" }, facade = { 155, 130, 105 }, roofTint = { 73, 76, 82 },
		reflow = { lane = -12, plaza = 14, side = 1, landmarkX = -6, landmarkZ = 8, district = 11, facility = 1 } },
	-- [항구별 재배치 34~50] incheon: 기존 승인 모델과 지시서 기반 공간 배치.
	incheon = { landmark = { id = "lm_incheon_gate", name = "석축 위 조선 진성 문루", kind = "gate", fallback = "none" },
		roof = "eave", wall = "plaster", balcony = nil, layout = "organic", plaza = "market",
		street = { "dirt", "dirt", "gravel", "flagstone", "flagstone" }, lamp = "paper_lantern", ground = "grass", weatherGround = "snow",
		signature = { "인삼 시장", "쌀 창고", "비단 공방" }, facade = { 224, 213, 186 }, roofTint = { 75, 85, 92 },
		reflow = { lane = 3, plaza = -13, side = -1, landmarkX = 5, landmarkZ = -7, district = -4, facility = 2 } },
	-- [항구별 재배치 34~50] jeddah: 기존 승인 모델과 지시서 기반 공간 배치.
	jeddah = { landmark = { id = "lm_jeddah_mosque", name = "마당과 사각 첨탑을 둔 모스크", kind = "mosque", fallback = "none" },
		roof = "flat", wall = "adobe", balcony = "mashrabiya", layout = "grid", plaza = "market",
		street = { "sand", "dirt", "gravel", "flagstone", "flagstone" }, lamp = "mosque_lamp", ground = "sand", weatherGround = "dust",
		signature = { "커피 볶음 공방", "유향 창고", "진주 상관" }, facade = { 216, 190, 151 }, roofTint = { 157, 127, 94 },
		reflow = { lane = -7, plaza = 5, side = 1, landmarkX = -3, landmarkZ = 6, district = 12, facility = 3 } },
	-- [항구별 재배치 34~50] kilwa: 기존 승인 모델과 지시서 기반 공간 배치.
	kilwa = { landmark = { id = "lm_kilwa_mosque", name = "산호석 모스크와 조각문", kind = "mosque", fallback = "none" },
		roof = "flat", wall = "coral", balcony = "wood_lattice", layout = "organic", plaza = "quay",
		street = { "sand", "sand", "gravel", "flagstone", "flagstone" }, lamp = "oil_lantern", ground = "sand", weatherGround = "monsoon_mud",
		signature = { "금 계량소", "상아 선창", "흑단 목재 창고" }, facade = { 228, 215, 180 }, roofTint = { 157, 131, 103 },
		reflow = { lane = 10, plaza = -11, side = -1, landmarkX = 8, landmarkZ = -8, district = 9, facility = 4 } },
	-- [항구별 재배치 34~50] malacca: 기존 승인 모델과 지시서 기반 공간 배치.
	malacca = { landmark = { id = "lm_malacca_gopuram", name = "계단식 지붕의 사원 문루", kind = "gopuram", fallback = "none" },
		roof = "eave", wall = "plaster", balcony = "wood_lattice", layout = "canal", plaza = "market",
		street = { "red_earth", "red_earth", "gravel", "flagstone", "paved" }, lamp = "oil_lantern", ground = "red_earth", weatherGround = "monsoon_mud",
		signature = { "후추 창고", "정향 선별장", "육두구 시장" }, facade = { 193, 170, 130 }, roofTint = { 122, 83, 69 },
		reflow = { lane = -4, plaza = 13, side = 1, landmarkX = -7, landmarkZ = 4, district = 3, facility = 5 } },
	-- [항구별 재배치 34~50] new_york: 기존 승인 모델과 지시서 기반 공간 배치.
	new_york = { landmark = { id = "lm_new_york_fort", name = "석조 항만 요새와 첨탑", kind = "fort", fallback = "none" },
		roof = "hip", wall = "stone", balcony = "iron", layout = "grid", plaza = "parade",
		street = { "dirt", "gravel", "cobble", "flagstone", "paved" }, lamp = "oil_lantern", ground = "grass", weatherGround = "puddles",
		signature = { "모피 상관", "목재 선창", "고래 기름 창고" }, facade = { 191, 181, 164 }, roofTint = { 84, 93, 100 },
		reflow = { lane = 6, plaza = -8, side = -1, landmarkX = 2, landmarkZ = -5, district = -2, facility = 6 } },

	-- [항구별 재배치 51~67] acapulco: 지시서 기반 기존 승인 모델 및 필지 직접 재배치.
	acapulco = { landmark = { id = "lm_acapulco_cathedral", name = "쌍탑 식민지 대성당", kind = "cathedral", fallback = "none" },
		roof = "flat", wall = "stucco", balcony = "iron", layout = "grid", plaza = "parade",
		street = { "sand", "dirt", "gravel", "cobble", "paved" }, lamp = "oil_lantern", ground = "sand", weatherGround = "dust",
		signature = { "은 선적 창고", "카카오 선창", "붉은 염료 시장" }, facade = { 226, 207, 184 }, roofTint = { 169, 109, 76 },
		reflow = { lane = -10, plaza = 14, side = 1, landmarkX = -6, landmarkZ = 8, district = 9, facility = 4 } },
	-- [항구별 재배치 51~67] acre: 지시서 기반 기존 승인 모델 및 필지 직접 재배치.
	acre = { landmark = { id = "lm_acre_mosque", name = "해안 성벽의 둥근 돔 모스크", kind = "mosque", fallback = "none" },
		roof = "dome", wall = "stone", balcony = "mashrabiya", layout = "organic", plaza = "temple_court",
		street = { "dirt", "gravel", "cobble", "flagstone", "flagstone" }, lamp = "mosque_lamp", ground = "red_earth", weatherGround = "dust",
		signature = { "비단 상관", "향신료 창고", "올리브 압착소" }, facade = { 213, 190, 159 }, roofTint = { 149, 105, 84 },
		reflow = { lane = 6, plaza = -12, side = -1, landmarkX = 5, landmarkZ = -7, district = -5, facility = 1 } },
	-- [항구별 재배치 51~67] aden: 지시서 기반 기존 승인 모델 및 필지 직접 재배치.
	aden = { landmark = { id = "lm_aden_mosque", name = "산호석 해안 모스크와 첨탑", kind = "mosque", fallback = "none" },
		roof = "flat", wall = "coral", balcony = "wood_lattice", layout = "terrace", plaza = "quay",
		street = { "sand", "sand", "gravel", "flagstone", "flagstone" }, lamp = "oil_lantern", ground = "sand", weatherGround = "dust",
		signature = { "커피 볶음 공방", "유향 상관", "아라비아고무 창고" }, facade = { 228, 213, 182 }, roofTint = { 153, 130, 107 },
		reflow = { lane = -8, plaza = 9, side = 1, landmarkX = -7, landmarkZ = 6, district = 4, facility = 5 } },
	-- [항구별 재배치 51~67] agadir: 지시서 기반 기존 승인 모델 및 필지 직접 재배치.
	agadir = { landmark = { id = "lm_agadir_mosque", name = "사각 첨탑과 안뜰 모스크", kind = "mosque", fallback = "none" },
		roof = "flat", wall = "adobe", balcony = "mashrabiya", layout = "organic", plaza = "market",
		street = { "sand", "dirt", "gravel", "flagstone", "flagstone" }, lamp = "mosque_lamp", ground = "sand", weatherGround = "dust",
		signature = { "생선 건조장", "소금 창고", "대추야자 시장" }, facade = { 210, 175, 138 }, roofTint = { 151, 115, 83 },
		reflow = { lane = 11, plaza = -14, side = -1, landmarkX = 8, landmarkZ = -8, district = -9, facility = 2 } },
	-- [항구별 재배치 51~67] ajaccio: 지시서 기반 기존 승인 모델 및 필지 직접 재배치.
	ajaccio = { landmark = { id = "lm_ajaccio_spire", name = "코르시카 해안 석조 첨탑", kind = "spire", fallback = "none" },
		roof = "hip", wall = "stone", balcony = "iron", layout = "terrace", plaza = "fountain",
		street = { "dirt", "gravel", "cobble", "flagstone", "paved" }, lamp = "oil_lantern", ground = "grass", weatherGround = "puddles",
		signature = { "포도주 저장고", "목재 선창", "올리브 압착소" }, facade = { 221, 206, 183 }, roofTint = { 99, 105, 112 },
		reflow = { lane = -5, plaza = 6, side = 1, landmarkX = -4, landmarkZ = 5, district = 11, facility = 6 } },
	-- [항구별 재배치 51~67] ambon: 지시서 기반 기존 승인 모델 및 필지 직접 재배치.
	ambon = { landmark = { id = "lm_ambon_pagoda", name = "항만의 겹지붕 왕실 회관", kind = "pagoda", fallback = "none" },
		roof = "thatch", wall = "wood", balcony = "wood_lattice", layout = "organic", plaza = "market",
		street = { "mud", "dirt", "gravel", "plank", "paved" }, lamp = "paper_lantern", ground = "mud", weatherGround = "monsoon_mud",
		signature = { "정향 선별장", "육두구 창고", "백단향 선창" }, facade = { 185, 148, 112 }, roofTint = { 128, 92, 63 },
		reflow = { lane = 8, plaza = -10, side = -1, landmarkX = 6, landmarkZ = -6, district = -4, facility = 3 } },
	-- [항구별 재배치 51~67] amoy: 지시서 기반 기존 승인 모델 및 필지 직접 재배치.
	amoy = { landmark = { id = "lm_amoy_pagoda", name = "해안 회색 벽돌 탑과 문루", kind = "pagoda", fallback = "none" },
		roof = "eave", wall = "brick", balcony = "wood_lattice", layout = "canal", plaza = "quay",
		street = { "dirt", "gravel", "flagstone", "flagstone", "paved" }, lamp = "paper_lantern", ground = "rice_paddy", weatherGround = "monsoon_mud",
		signature = { "차 상관", "도자기 창고", "설탕 시장" }, facade = { 157, 146, 135 }, roofTint = { 65, 74, 78 },
		reflow = { lane = -11, plaza = 13, side = 1, landmarkX = -8, landmarkZ = 7, district = 7, facility = 1 } },
	-- [항구별 재배치 51~67] ancona: 지시서 기반 기존 승인 모델 및 필지 직접 재배치.
	ancona = { landmark = { id = "lm_ancona_campanile", name = "돔 성당 곁 벽돌 종탑", kind = "campanile", fallback = "none" },
		roof = "hip", wall = "stucco", balcony = "loggia", layout = "terrace", plaza = "fountain",
		street = { "dirt", "flagstone", "flagstone", "flagstone", "flagstone" }, lamp = "oil_lantern", ground = "red_earth", weatherGround = "puddles",
		signature = { "올리브 압착소", "포도주 창고", "양모 상관" }, facade = { 230, 190, 155 }, roofTint = { 170, 97, 70 },
		reflow = { lane = 3, plaza = -7, side = -1, landmarkX = 4, landmarkZ = -4, district = -8, facility = 4 } },
	-- [항구별 재배치 51~67] auckland: 지시서 기반 기존 승인 모델 및 필지 직접 재배치.
	auckland = { landmark = { id = "lm_auckland_meeting_house", name = "조각 기둥이 있는 해안 집회소", kind = "meeting_house", fallback = "none" },
		roof = "thatch", wall = "wood", balcony = nil, layout = "organic", plaza = "quay",
		street = { "sand", "sand", "gravel", "plank", "paved" }, lamp = "torch", ground = "grass", weatherGround = "puddles",
		signature = { "카우리 목재 선창", "제재소", "배 수리장" }, facade = { 171, 148, 115 }, roofTint = { 117, 103, 78 },
		reflow = { lane = -7, plaza = -15, side = 1, landmarkX = -5, landmarkZ = -8, district = 5, facility = 2 } },
	-- [항구별 재배치 51~67] banda: 지시서 기반 기존 승인 모델 및 필지 직접 재배치.
	banda = { landmark = { id = "lm_banda_pagoda", name = "향신료 마을의 겹지붕 회관", kind = "pagoda", fallback = "none" },
		roof = "thatch", wall = "wood", balcony = "wood_lattice", layout = "organic", plaza = "market",
		street = { "mud", "dirt", "gravel", "plank", "paved" }, lamp = "paper_lantern", ground = "sand", weatherGround = "monsoon_mud",
		signature = { "육두구 건조장", "정향 창고", "향신료 시장" }, facade = { 176, 139, 105 }, roofTint = { 119, 82, 57 },
		reflow = { lane = 12, plaza = 8, side = -1, landmarkX = 7, landmarkZ = 6, district = -11, facility = 5 } },
	-- [항구별 재배치 51~67] bandar_abbas: 지시서 기반 기존 승인 모델 및 필지 직접 재배치.
	bandar_abbas = { landmark = { id = "lm_bandar_abbas_mosque", name = "석조 광장의 사각 첨탑 모스크", kind = "mosque", fallback = "none" },
		roof = "flat", wall = "adobe", balcony = "mashrabiya", layout = "grid", plaza = "market",
		street = { "sand", "dirt", "gravel", "flagstone", "flagstone" }, lamp = "mosque_lamp", ground = "sand", weatherGround = "dust",
		signature = { "양탄자 직조 공방", "진주 상관", "비단 창고" }, facade = { 229, 199, 158 }, roofTint = { 159, 125, 89 },
		reflow = { lane = -3, plaza = 10, side = 1, landmarkX = -3, landmarkZ = 6, district = 2, facility = 3 } },
	-- [항구별 재배치 51~67] bangkok: 지시서 기반 기존 승인 모델 및 필지 직접 재배치.
	bangkok = { landmark = { id = "lm_bangkok_pagoda", name = "수로 옆 겹지붕 왕실 누각", kind = "pagoda", fallback = "none" },
		roof = "thatch", wall = "wood", balcony = "wood_lattice", layout = "canal", plaza = "market",
		street = { "mud", "dirt", "gravel", "plank", "paved" }, lamp = "paper_lantern", ground = "rice_paddy", weatherGround = "monsoon_mud",
		signature = { "보석 감정소", "상아 교역소", "쌀 선창" }, facade = { 195, 166, 112 }, roofTint = { 131, 95, 61 },
		reflow = { lane = 9, plaza = -6, side = -1, landmarkX = 8, landmarkZ = -5, district = 9, facility = 6 } },
	-- [항구별 재배치 51~67] basra: 지시서 기반 기존 승인 모델 및 필지 직접 재배치.
	basra = { landmark = { id = "lm_basra_mosque", name = "중정 모스크와 사각 첨탑", kind = "mosque", fallback = "none" },
		roof = "flat", wall = "adobe", balcony = "mashrabiya", layout = "grid", plaza = "market",
		street = { "sand", "dirt", "gravel", "flagstone", "flagstone" }, lamp = "mosque_lamp", ground = "sand", weatherGround = "dust",
		signature = { "대추야자 창고", "양탄자 시장", "진주 상관" }, facade = { 216, 184, 143 }, roofTint = { 145, 113, 83 },
		reflow = { lane = -12, plaza = -9, side = 1, landmarkX = -7, landmarkZ = -6, district = -5, facility = 4 } },
	-- [항구별 재배치 51~67] batavia: 지시서 기반 기존 승인 모델 및 필지 직접 재배치.
	batavia = { landmark = { id = "lm_batavia_pagoda", name = "운하 안쪽의 겹지붕 회관", kind = "pagoda", fallback = "none" },
		roof = "thatch", wall = "wood", balcony = "wood_lattice", layout = "canal", plaza = "market",
		street = { "mud", "dirt", "gravel", "plank", "paved" }, lamp = "paper_lantern", ground = "mud", weatherGround = "monsoon_mud",
		signature = { "후추 창고", "정향 선별장", "설탕 가공소" }, facade = { 176, 149, 117 }, roofTint = { 116, 86, 66 },
		reflow = { lane = 5, plaza = 12, side = -1, landmarkX = 3, landmarkZ = 8, district = 11, facility = 1 } },
	-- [항구별 재배치 51~67] belem: 지시서 기반 기존 승인 모델 및 필지 직접 재배치.
	belem = { landmark = { id = "lm_belem_cathedral", name = "강변 식민지 대성당 정면", kind = "cathedral", fallback = "none" },
		roof = "flat", wall = "stucco", balcony = "iron", layout = "grid", plaza = "parade",
		street = { "sand", "dirt", "gravel", "cobble", "paved" }, lamp = "oil_lantern", ground = "grass", weatherGround = "monsoon_mud",
		signature = { "카카오 창고", "브라질목 선창", "쌀 시장" }, facade = { 229, 202, 171 }, roofTint = { 164, 95, 68 },
		reflow = { lane = -9, plaza = -11, side = 1, landmarkX = -6, landmarkZ = -7, district = -6, facility = 5 } },
	-- [항구별 재배치 51~67] benghazi: 지시서 기반 기존 승인 모델 및 필지 직접 재배치.
	benghazi = { landmark = { id = "lm_benghazi_mosque", name = "백색 안뜰과 사각 첨탑", kind = "mosque", fallback = "none" },
		roof = "flat", wall = "adobe", balcony = "mashrabiya", layout = "terrace", plaza = "market",
		street = { "sand", "dirt", "gravel", "flagstone", "flagstone" }, lamp = "mosque_lamp", ground = "sand", weatherGround = "dust",
		signature = { "양모 상관", "올리브 압착소", "소금 창고" }, facade = { 218, 189, 154 }, roofTint = { 154, 114, 82 },
		reflow = { lane = 7, plaza = 7, side = -1, landmarkX = 5, landmarkZ = 5, district = 3, facility = 2 } },
	-- [항구별 재배치 51~67] benguela: 지시서 기반 기존 승인 모델 및 필지 직접 재배치.
	benguela = { landmark = { id = "lm_benguela_fort", name = "해안 성채와 진흙벽 마을 문루", kind = "fort", fallback = "none" },
		roof = "thatch", wall = "adobe", balcony = nil, layout = "organic", plaza = "market",
		street = { "red_earth", "red_earth", "gravel", "flagstone", "paved" }, lamp = "torch", ground = "red_earth", weatherGround = "dust",
		signature = { "생선 건조장", "소금 창고", "상아 선창" }, facade = { 177, 141, 107 }, roofTint = { 116, 90, 62 },
		reflow = { lane = -4, plaza = -13, side = 1, landmarkX = -5, landmarkZ = -5, district = -10, facility = 6 } },

	-- [항구별 재배치 68~84] bissau: 승인된 지형·주택과 기존 방문시설만 독립 재배치.
	bissau = { landmark = { id = "lm_bissau_fort", name = "해안 진흙벽 성채와 교역 문루", kind = "fort", fallback = "none" },
		roof = "thatch", wall = "adobe", balcony = nil, layout = "organic", plaza = "market",
		street = { "red_earth", "red_earth", "gravel", "flagstone", "paved" }, lamp = "torch", ground = "red_earth", weatherGround = "monsoon_mud",
		signature = { "면화 직물 공방", "야자 기름 창고", "상아 선창" }, facade = { 171, 134, 104 }, roofTint = { 110, 89, 67 },
		reflow = { lane = 9, plaza = -14, side = 1, landmarkX = 7, landmarkZ = -7, district = 8, facility = 4 } },
	-- [항구별 재배치 68~84] bone: 승인된 지형·주택과 기존 방문시설만 독립 재배치.
	bone = { landmark = { id = "lm_bone_mosque", name = "해안 중정과 사각 첨탑", kind = "mosque", fallback = "none" },
		roof = "flat", wall = "adobe", balcony = "mashrabiya", layout = "terrace", plaza = "market",
		street = { "sand", "dirt", "gravel", "flagstone", "flagstone" }, lamp = "mosque_lamp", ground = "sand", weatherGround = "dust",
		signature = { "산호 교역소", "양모 시장", "피혁 창고" }, facade = { 217, 185, 147 }, roofTint = { 153, 119, 90 },
		reflow = { lane = -6, plaza = 10, side = -1, landmarkX = -4, landmarkZ = 7, district = -10, facility = 1 } },
	-- [항구별 재배치 68~84] bridgetown: 승인된 지형·주택과 기존 방문시설만 독립 재배치.
	bridgetown = { landmark = { id = "lm_bridgetown_fort", name = "신호탑이 있는 해안 석조 요새", kind = "fort", fallback = "none" },
		roof = "hip", wall = "wood", balcony = "wood_lattice", layout = "grid", plaza = "parade",
		street = { "sand", "dirt", "gravel", "brick", "paved" }, lamp = "oil_lantern", ground = "sand", weatherGround = "monsoon_mud",
		signature = { "설탕 압착소", "럼주 선적 창고", "면화 시장" }, facade = { 227, 193, 153 }, roofTint = { 142, 91, 67 },
		reflow = { lane = 12, plaza = -8, side = 1, landmarkX = 8, landmarkZ = -6, district = 5, facility = 6 } },
	-- [항구별 재배치 68~84] brunei: 승인된 지형·주택과 기존 방문시설만 독립 재배치.
	brunei = { landmark = { id = "lm_brunei_royal_hall", name = "수상마을의 겹지붕 왕실 회관", kind = "royal_hall", fallback = "none" },
		roof = "thatch", wall = "wood", balcony = "wood_lattice", layout = "canal", plaza = "market",
		street = { "mud", "dirt", "gravel", "plank", "paved" }, lamp = "paper_lantern", ground = "rice_paddy", weatherGround = "monsoon_mud",
		signature = { "장뇌 향료 창고", "후추 선별장", "흑단 선창" }, facade = { 173, 136, 99 }, roofTint = { 118, 81, 57 },
		reflow = { lane = -11, plaza = 12, side = -1, landmarkX = -5, landmarkZ = 8, district = 11, facility = 2 } },
	-- [항구별 재배치 68~84] calabar: 승인된 지형·주택과 기존 방문시설만 독립 재배치.
	calabar = { landmark = { id = "lm_calabar_fort", name = "해안 성채와 붉은 벽돌 문루", kind = "fort", fallback = "none" },
		roof = "thatch", wall = "adobe", balcony = nil, layout = "organic", plaza = "market",
		street = { "red_earth", "red_earth", "gravel", "flagstone", "paved" }, lamp = "torch", ground = "red_earth", weatherGround = "monsoon_mud",
		signature = { "야자 기름 압착소", "흑단 목재 선창", "후추 시장" }, facade = { 184, 145, 107 }, roofTint = { 113, 84, 63 },
		reflow = { lane = 3, plaza = -15, side = 1, landmarkX = 5, landmarkZ = -8, district = -7, facility = 5 } },
	-- [항구별 재배치 68~84] calcutta: 승인된 지형·주택과 기존 방문시설만 독립 재배치.
	calcutta = { landmark = { id = "lm_calcutta_gopuram", name = "석조 사원 층층 지붕 문루", kind = "gopuram", fallback = "none" },
		roof = "eave", wall = "plaster", balcony = "wood_lattice", layout = "grid", plaza = "market",
		street = { "red_earth", "red_earth", "gravel", "flagstone", "paved" }, lamp = "oil_lantern", ground = "red_earth", weatherGround = "monsoon_mud",
		signature = { "면직물 공방", "인디고 염색소", "비단 상관" }, facade = { 207, 183, 143 }, roofTint = { 123, 88, 69 },
		reflow = { lane = -8, plaza = -9, side = -1, landmarkX = -6, landmarkZ = -6, district = 10, facility = 3 } },
	-- [항구별 재배치 68~84] callao: 승인된 지형·주택과 기존 방문시설만 독립 재배치.
	callao = { landmark = { id = "lm_callao_cathedral", name = "은 선적항의 쌍탑 대성당", kind = "cathedral", fallback = "none" },
		roof = "flat", wall = "stucco", balcony = "iron", layout = "grid", plaza = "parade",
		street = { "sand", "dirt", "gravel", "cobble", "paved" }, lamp = "oil_lantern", ground = "sand", weatherGround = "dust",
		signature = { "은 선적 부두", "금 계량소", "면화 창고" }, facade = { 234, 215, 184 }, roofTint = { 175, 104, 74 },
		reflow = { lane = 7, plaza = 9, side = 1, landmarkX = 4, landmarkZ = 6, district = -11, facility = 6 } },
	-- [항구별 재배치 68~84] campeche: 승인된 지형·주택과 기존 방문시설만 독립 재배치.
	campeche = { landmark = { id = "lm_campeche_cathedral", name = "성벽 안쪽 바로크 대성당", kind = "cathedral", fallback = "none" },
		roof = "flat", wall = "stucco", balcony = "iron", layout = "grid", plaza = "parade",
		street = { "sand", "dirt", "gravel", "cobble", "paved" }, lamp = "oil_lantern", ground = "sand", weatherGround = "monsoon_mud",
		signature = { "염료목 목재 선창", "마호가니 제재소", "면화 시장" }, facade = { 227, 198, 167 }, roofTint = { 164, 99, 70 },
		reflow = { lane = -10, plaza = 4, side = -1, landmarkX = -7, landmarkZ = 5, district = 7, facility = 3 } },
	-- [항구별 재배치 68~84] candia: 승인된 지형·주택과 기존 방문시설만 독립 재배치.
	candia = { landmark = { id = "lm_candia_campanile", name = "항만 돔 성당과 붉은 종탑", kind = "campanile", fallback = "none" },
		roof = "hip", wall = "stucco", balcony = "loggia", layout = "terrace", plaza = "fountain",
		street = { "dirt", "flagstone", "flagstone", "flagstone", "flagstone" }, lamp = "oil_lantern", ground = "red_earth", weatherGround = "dust",
		signature = { "올리브 압착소", "포도주 상관", "건포도 창고" }, facade = { 225, 189, 149 }, roofTint = { 156, 101, 70 },
		reflow = { lane = 5, plaza = -13, side = 1, landmarkX = 3, landmarkZ = -7, district = -9, facility = 2 } },
	-- [항구별 재배치 68~84] cartagena: 승인된 지형·주택과 기존 방문시설만 독립 재배치.
	cartagena = { landmark = { id = "lm_cartagena_campanile", name = "지중해 석조 성당 종탑", kind = "campanile", fallback = "none" },
		roof = "hip", wall = "stucco", balcony = "iron", layout = "terrace", plaza = "fountain",
		street = { "dirt", "gravel", "cobble", "flagstone", "paved" }, lamp = "oil_lantern", ground = "red_earth", weatherGround = "dust",
		signature = { "소금 염장소", "피혁 상관", "비단 시장" }, facade = { 226, 207, 174 }, roofTint = { 174, 102, 79 },
		reflow = { lane = -3, plaza = 15, side = -1, landmarkX = -5, landmarkZ = 8, district = 4, facility = 5 } },
	-- [항구별 재배치 68~84] casablanca: 승인된 지형·주택과 기존 방문시설만 독립 재배치.
	casablanca = { landmark = { id = "lm_casablanca_mosque", name = "구시가지 사각 첨탑과 안뜰", kind = "mosque", fallback = "none" },
		roof = "flat", wall = "adobe", balcony = "mashrabiya", layout = "organic", plaza = "market",
		street = { "sand", "dirt", "gravel", "flagstone", "flagstone" }, lamp = "mosque_lamp", ground = "sand", weatherGround = "dust",
		signature = { "어시장", "피혁 창고", "해염 선창" }, facade = { 221, 191, 153 }, roofTint = { 144, 114, 91 },
		reflow = { lane = 11, plaza = -10, side = 1, landmarkX = 6, landmarkZ = -5, district = -8, facility = 4 } },
	-- [항구별 재배치 68~84] charleston: 승인된 지형·주택과 기존 방문시설만 독립 재배치.
	charleston = { landmark = { id = "lm_charleston_fort", name = "해안 석조 요새와 신호탑", kind = "fort", fallback = "none" },
		roof = "hip", wall = "wood", balcony = "wood_lattice", layout = "grid", plaza = "parade",
		street = { "sand", "dirt", "gravel", "brick", "paved" }, lamp = "oil_lantern", ground = "grass", weatherGround = "monsoon_mud",
		signature = { "쌀 교역소", "인디고 염색 공방", "면화 선창" }, facade = { 223, 198, 163 }, roofTint = { 145, 101, 76 },
		reflow = { lane = -12, plaza = 6, side = -1, landmarkX = -8, landmarkZ = 5, district = 12, facility = 1 } },
	-- [항구별 재배치 68~84] cochin: 승인된 지형·주택과 기존 방문시설만 독립 재배치.
	cochin = { landmark = { id = "lm_cochin_gopuram", name = "항만 목조 사원 문루", kind = "gopuram", fallback = "none" },
		roof = "eave", wall = "plaster", balcony = "wood_lattice", layout = "canal", plaza = "market",
		street = { "red_earth", "red_earth", "gravel", "flagstone", "paved" }, lamp = "oil_lantern", ground = "red_earth", weatherGround = "monsoon_mud",
		signature = { "후추 분류소", "계피 시장", "흑단 목재 선창" }, facade = { 206, 168, 120 }, roofTint = { 131, 87, 63 },
		reflow = { lane = 8, plaza = -11, side = 1, landmarkX = 5, landmarkZ = -8, district = -6, facility = 2 } },
	-- [항구별 재배치 68~84] corfu: 승인된 지형·주택과 기존 방문시설만 독립 재배치.
	corfu = { landmark = { id = "lm_corfu_campanile", name = "연안 돔 성당과 종탑", kind = "campanile", fallback = "none" },
		roof = "hip", wall = "stucco", balcony = "loggia", layout = "terrace", plaza = "fountain",
		street = { "dirt", "flagstone", "flagstone", "flagstone", "flagstone" }, lamp = "oil_lantern", ground = "grass", weatherGround = "puddles",
		signature = { "올리브 압착소", "해염 창고", "포도주 시장" }, facade = { 224, 196, 165 }, roofTint = { 158, 104, 76 },
		reflow = { lane = -7, plaza = 13, side = -1, landmarkX = -6, landmarkZ = 7, district = 9, facility = 6 } },
	-- [항구별 재배치 68~84] damietta: 승인된 지형·주택과 기존 방문시설만 독립 재배치.
	damietta = { landmark = { id = "lm_damietta_mosque", name = "강변 둥근 돔과 가는 첨탑", kind = "mosque", fallback = "none" },
		roof = "dome", wall = "stone", balcony = "mashrabiya", layout = "canal", plaza = "temple_court",
		street = { "dirt", "gravel", "cobble", "flagstone", "flagstone" }, lamp = "mosque_lamp", ground = "red_earth", weatherGround = "dust",
		signature = { "면직물 공방", "대추야자 시장", "설탕 창고" }, facade = { 211, 192, 163 }, roofTint = { 150, 107, 87 },
		reflow = { lane = 4, plaza = 8, side = 1, landmarkX = 2, landmarkZ = 6, district = 1, facility = 3 } },
	-- [항구별 재배치 68~84] darwin: 승인된 지형·주택과 기존 방문시설만 독립 재배치.
	darwin = { landmark = { id = "lm_darwin_meeting_house", name = "조각 기둥이 있는 항만 집회소", kind = "meeting_house", fallback = "none" },
		roof = "thatch", wall = "wood", balcony = nil, layout = "organic", plaza = "quay",
		street = { "sand", "sand", "gravel", "plank", "paved" }, lamp = "torch", ground = "sand", weatherGround = "monsoon_mud",
		signature = { "진주조개 시장", "흑단 선창", "교역 창고" }, facade = { 166, 143, 107 }, roofTint = { 111, 98, 72 },
		reflow = { lane = -9, plaza = -14, side = -1, landmarkX = -4, landmarkZ = -6, district = -3, facility = 5 } },
	-- [항구별 재배치 68~84] diu: 승인된 지형·주택과 기존 방문시설만 독립 재배치.
	diu = { landmark = { id = "lm_diu_gopuram", name = "층층 지붕 사원 문루", kind = "gopuram", fallback = "none" },
		roof = "eave", wall = "plaster", balcony = "wood_lattice", layout = "organic", plaza = "market",
		street = { "red_earth", "red_earth", "gravel", "flagstone", "paved" }, lamp = "oil_lantern", ground = "red_earth", weatherGround = "dust",
		signature = { "인디고 염료 공방", "면화 상관", "보석 감정소" }, facade = { 212, 182, 140 }, roofTint = { 130, 88, 68 },
		reflow = { lane = 6, plaza = 12, side = 1, landmarkX = 7, landmarkZ = 8, district = -10, facility = 1 } },

	-- [항구별 재배치 85~101] cagliari: 기존 원본 건축과 필지·방문 시설의 고유 좌표 지정.
	cagliari = { landmark = { id = "lm_cagliari_campanile", name = "카글리아리 항만 돔 성당 종탑", kind = "campanile", fallback = "none" },
		roof = "hip", wall = "stucco", balcony = "loggia", layout = "terrace", plaza = "fountain",
		street = { "dirt", "flagstone", "flagstone", "flagstone", "flagstone" }, lamp = "oil_lantern", ground = "red_earth", weatherGround = "dust",
		signature = { "소금 건조장", "양모 창고", "올리브 압착소" }, facade = { 228, 189, 148 }, roofTint = { 173, 104, 72 },
		reflow = { lane = -8, plaza = 14, side = 1, landmarkX = -7, landmarkZ = 8, district = 11, facility = 4 } },
	-- [항구별 재배치 85~101] elmina: 기존 원본 건축과 필지·방문 시설의 고유 좌표 지정.
	elmina = { landmark = { id = "lm_elmina_fort", name = "금 해안 석조 무역 성채", kind = "fort", fallback = "none" },
		roof = "thatch", wall = "adobe", balcony = nil, layout = "organic", plaza = "market",
		street = { "red_earth", "red_earth", "gravel", "flagstone", "paved" }, lamp = "torch", ground = "red_earth", weatherGround = "monsoon_mud",
		signature = { "금 계량소", "상아 선창", "야자기름 공방" }, facade = { 187, 152, 112 }, roofTint = { 119, 91, 69 },
		reflow = { lane = 4, plaza = -10, side = -1, landmarkX = 6, landmarkZ = -7, district = -9, facility = 3 } },
	-- [항구별 재배치 85~101] famagusta: 기존 원본 건축과 필지·방문 시설의 고유 좌표 지정.
	famagusta = { landmark = { id = "lm_famagusta_campanile", name = "성벽 항만의 돔 성당 종탑", kind = "campanile", fallback = "none" },
		roof = "hip", wall = "stucco", balcony = "loggia", layout = "grid", plaza = "fountain",
		street = { "dirt", "flagstone", "flagstone", "flagstone", "flagstone" }, lamp = "oil_lantern", ground = "red_earth", weatherGround = "dust",
		signature = { "해염 건조장", "설탕 창고", "비단 시장" }, facade = { 225, 194, 161 }, roofTint = { 158, 98, 72 },
		reflow = { lane = 9, plaza = 6, side = 1, landmarkX = 3, landmarkZ = 5, district = 7, facility = 5 } },
	-- [항구별 재배치 85~101] freetown: 기존 원본 건축과 필지·방문 시설의 고유 좌표 지정.
	freetown = { landmark = { id = "lm_freetown_fort", name = "해안 석조 성채와 교역 문루", kind = "fort", fallback = "none" },
		roof = "thatch", wall = "adobe", balcony = nil, layout = "organic", plaza = "market",
		street = { "red_earth", "red_earth", "gravel", "flagstone", "paved" }, lamp = "torch", ground = "grass", weatherGround = "monsoon_mud",
		signature = { "귀중품 계량소", "흑단 창고", "야자 기름 선창" }, facade = { 178, 144, 108 }, roofTint = { 116, 89, 68 },
		reflow = { lane = -5, plaza = -13, side = -1, landmarkX = -8, landmarkZ = -6, district = -11, facility = 2 } },
	-- [항구별 재배치 85~101] funchal: 기존 원본 건축과 필지·방문 시설의 고유 좌표 지정.
	funchal = { landmark = { id = "lm_funchal_bell_tower", name = "마데이라 항만 석조 종탑", kind = "bell_tower", fallback = "none" },
		roof = "hip", wall = "stucco", balcony = "iron", layout = "terrace", plaza = "fountain",
		street = { "dirt", "gravel", "cobble", "flagstone", "paved" }, lamp = "oil_lantern", ground = "grass", weatherGround = "puddles",
		signature = { "포도주 숙성 창고", "설탕 압착소", "화산섬 상관" }, facade = { 236, 213, 175 }, roofTint = { 178, 105, 77 },
		reflow = { lane = 11, plaza = -5, side = 1, landmarkX = 7, landmarkZ = -4, district = 9, facility = 6 } },
	-- [항구별 재배치 85~101] gdansk: 기존 원본 건축과 필지·방문 시설의 고유 좌표 지정.
	gdansk = { landmark = { id = "lm_gdansk_city_gate", name = "발트 고딕 양탑 도시 문루", kind = "city_gate", fallback = "none" },
		roof = "gable", wall = "brick", balcony = nil, layout = "grid", plaza = "market",
		street = { "dirt", "cobble", "cobble", "cobble", "paved" }, lamp = "oil_lantern", ground = "grass", weatherGround = "snow",
		signature = { "호박 보석 시장", "목재 선창", "맥주 창고" }, facade = { 166, 103, 83 }, roofTint = { 100, 73, 67 },
		reflow = { lane = -12, plaza = 11, side = -1, landmarkX = -5, landmarkZ = 6, district = 10, facility = 1 } },
	-- [항구별 재배치 85~101] gibraltar: 기존 원본 건축과 필지·방문 시설의 고유 좌표 지정.
	gibraltar = { landmark = { id = "lm_gibraltar_fort", name = "해협 성벽의 고대 석조 요새", kind = "fort", fallback = "none" },
		roof = "hip", wall = "stucco", balcony = "iron", layout = "terrace", plaza = "fountain",
		street = { "dirt", "gravel", "cobble", "flagstone", "paved" }, lamp = "oil_lantern", ground = "sand", weatherGround = "dust",
		signature = { "소금 선창", "어시장", "피혁 상관" }, facade = { 225, 202, 164 }, roofTint = { 151, 104, 80 },
		reflow = { lane = 6, plaza = -15, side = 1, landmarkX = 8, landmarkZ = -8, district = -7, facility = 4 } },
	-- [항구별 재배치 85~101] glasgow: 기존 원본 건축과 필지·방문 시설의 고유 좌표 지정.
	glasgow = { landmark = { id = "lm_glasgow_clock_tower", name = "강변 고딕 교회 시계탑", kind = "clock_tower", fallback = "none" },
		roof = "gable", wall = "brick", balcony = nil, layout = "grid", plaza = "market",
		street = { "dirt", "gravel", "cobble", "cobble", "paved" }, lamp = "oil_lantern", ground = "grass", weatherGround = "puddles",
		signature = { "석탄 선적소", "철 광석 창고", "아마 직물 시장" }, facade = { 169, 156, 148 }, roofTint = { 90, 101, 107 },
		reflow = { lane = -7, plaza = 10, side = -1, landmarkX = -6, landmarkZ = 7, district = 3, facility = 2 } },
	-- [항구별 재배치 85~101] guam: 기존 원본 건축과 필지·방문 시설의 고유 좌표 지정.
	guam = { landmark = { id = "lm_guam_meeting_house", name = "해안 조각 기둥 집회소", kind = "meeting_house", fallback = "none" },
		roof = "thatch", wall = "wood", balcony = nil, layout = "organic", plaza = "quay",
		street = { "sand", "sand", "gravel", "plank", "paved" }, lamp = "torch", ground = "sand", weatherGround = "monsoon_mud",
		signature = { "백단향 창고", "진주조개 시장", "은 선적소" }, facade = { 182, 154, 112 }, roofTint = { 124, 99, 72 },
		reflow = { lane = 3, plaza = -9, side = 1, landmarkX = 4, landmarkZ = -6, district = 12, facility = 5 } },
	-- [항구별 재배치 85~101] guayaquil: 기존 원본 건축과 필지·방문 시설의 고유 좌표 지정.
	guayaquil = { landmark = { id = "lm_guayaquil_cathedral", name = "과야킬 강변 식민지 쌍탑 성당", kind = "cathedral", fallback = "none" },
		roof = "flat", wall = "stucco", balcony = "iron", layout = "canal", plaza = "parade",
		street = { "sand", "dirt", "gravel", "cobble", "paved" }, lamp = "oil_lantern", ground = "mud", weatherGround = "monsoon_mud",
		signature = { "카카오 교역소", "목재 선창", "쌀 시장" }, facade = { 229, 203, 167 }, roofTint = { 168, 103, 73 },
		reflow = { lane = -9, plaza = -6, side = -1, landmarkX = -7, landmarkZ = -7, district = -8, facility = 1 } },
	-- [항구별 재배치 85~101] hakodate: 기존 원본 건축과 필지·방문 시설의 고유 좌표 지정.
	hakodate = { landmark = { id = "lm_hakodate_castle", name = "하코다테 해안 석축 성곽 천수", kind = "castle", fallback = "none" },
		roof = "eave", wall = "wood", balcony = "wood_lattice", layout = "organic", plaza = "quay",
		street = { "dirt", "gravel", "gravel", "flagstone", "flagstone" }, lamp = "stone_lantern", ground = "snowmelt", weatherGround = "snow",
		signature = { "어시장", "목재 상관", "모피 창고" }, facade = { 211, 199, 179 }, roofTint = { 85, 92, 98 },
		reflow = { lane = 8, plaza = 15, side = 1, landmarkX = 6, landmarkZ = 7, district = 5, facility = 3 } },
	-- [항구별 재배치 85~101] halifax: 기존 원본 건축과 필지·방문 시설의 고유 좌표 지정.
	halifax = { landmark = { id = "lm_halifax_fort", name = "항만 석조 성채의 전망 탑", kind = "fort", fallback = "none" },
		roof = "hip", wall = "stone", balcony = nil, layout = "grid", plaza = "parade",
		street = { "dirt", "gravel", "cobble", "flagstone", "paved" }, lamp = "oil_lantern", ground = "grass", weatherGround = "snow",
		signature = { "어류 염장 창고", "목재 선창", "모피 상관" }, facade = { 178, 174, 164 }, roofTint = { 99, 104, 111 },
		reflow = { lane = -4, plaza = -12, side = -1, landmarkX = -4, landmarkZ = -5, district = -5, facility = 6 } },
	-- [항구별 재배치 85~101] helsinki: 기존 원본 건축과 필지·방문 시설의 고유 좌표 지정.
	helsinki = { landmark = { id = "lm_helsinki_spire", name = "북해 항만 목조 교회 첨탑", kind = "spire", fallback = "none" },
		roof = "gable", wall = "wood", balcony = "wood_lattice", layout = "grid", plaza = "quay",
		street = { "dirt", "gravel", "gravel", "cobble", "paved" }, lamp = "oil_lantern", ground = "snowmelt", weatherGround = "snow",
		signature = { "철 광석 창고", "목재 선창", "어시장" }, facade = { 200, 171, 129 }, roofTint = { 103, 79, 71 },
		reflow = { lane = 12, plaza = 7, side = 1, landmarkX = 8, landmarkZ = 6, district = 11, facility = 1 } },
	-- [항구별 재배치 85~101] hobart: 기존 원본 건축과 필지·방문 시설의 고유 좌표 지정.
	hobart = { landmark = { id = "lm_hobart_meeting_house", name = "목각 기둥이 있는 해안 집회소", kind = "meeting_house", fallback = "none" },
		roof = "thatch", wall = "wood", balcony = nil, layout = "organic", plaza = "quay",
		street = { "sand", "sand", "gravel", "plank", "paved" }, lamp = "torch", ground = "grass", weatherGround = "puddles",
		signature = { "물개가죽 시장", "고래기름 창고", "목재 선창" }, facade = { 185, 156, 115 }, roofTint = { 122, 100, 77 },
		reflow = { lane = -10, plaza = -14, side = -1, landmarkX = -6, landmarkZ = -8, district = -4, facility = 5 } },
	-- [항구별 재배치 85~101] hoi_an: 기존 원본 건축과 필지·방문 시설의 고유 좌표 지정.
	hoi_an = { landmark = { id = "lm_hoi_an_pagoda", name = "수로 마을 겹지붕 교역 회관", kind = "pagoda", fallback = "none" },
		roof = "thatch", wall = "wood", balcony = "wood_lattice", layout = "canal", plaza = "market",
		street = { "mud", "dirt", "gravel", "plank", "paved" }, lamp = "paper_lantern", ground = "rice_paddy", weatherGround = "monsoon_mud",
		signature = { "실크 직조 공방", "계피 창고", "흑단 목재 상관" }, facade = { 207, 174, 125 }, roofTint = { 138, 93, 62 },
		reflow = { lane = 5, plaza = -7, side = 1, landmarkX = 7, landmarkZ = -3, district = 6, facility = 2 } },
	-- [항구별 재배치 85~101] honolulu: 기존 원본 건축과 필지·방문 시설의 고유 좌표 지정.
	honolulu = { landmark = { id = "lm_honolulu_meeting_house", name = "태평양 해변 조각 기둥 집회소", kind = "meeting_house", fallback = "none" },
		roof = "thatch", wall = "wood", balcony = nil, layout = "organic", plaza = "quay",
		street = { "sand", "sand", "gravel", "plank", "paved" }, lamp = "torch", ground = "sand", weatherGround = "puddles",
		signature = { "백단향 창고", "진주조개 시장", "고래기름 선창" }, facade = { 192, 160, 117 }, roofTint = { 133, 98, 66 },
		reflow = { lane = -6, plaza = 13, side = -1, landmarkX = -8, landmarkZ = 8, district = 9, facility = 3 } },
	-- [항구별 재배치 85~101] hull: 기존 원본 건축과 필지·방문 시설의 고유 좌표 지정.
	hull = { landmark = { id = "lm_hull_clock_tower", name = "북해 항구 고딕 교회 시계탑", kind = "clock_tower", fallback = "none" },
		roof = "gable", wall = "brick", balcony = nil, layout = "grid", plaza = "market",
		street = { "dirt", "gravel", "cobble", "cobble", "paved" }, lamp = "oil_lantern", ground = "grass", weatherGround = "puddles",
		signature = { "양모 상관", "석탄 선창", "고래기름 창고" }, facade = { 181, 166, 143 }, roofTint = { 89, 93, 101 },
		reflow = { lane = 10, plaza = -11, side = 1, landmarkX = 5, landmarkZ = -7, district = -10, facility = 4 } },

	-- [항구별 재배치 102~118] kingston: 지시서와 기존 승인 실물에 따라 항만 필지·광장·시설 위치 분리.
	kingston = { landmark = { id = "lm_kingston_fort", name = "신호탑이 있는 킹스턴 해안 석조 요새", kind = "fort", fallback = "none" },
		roof = "hip", wall = "wood", balcony = "wood_lattice", layout = "grid", plaza = "parade",
		street = { "sand", "dirt", "gravel", "brick", "paved" }, lamp = "oil_lantern", ground = "grass", weatherGround = "monsoon_mud",
		signature = { "설탕 압착소", "럼주 저장 창고", "마호가니 선창" }, facade = { 227, 196, 166 }, roofTint = { 142, 96, 73 },
		reflow = { lane = -11, plaza = 9, side = 1, landmarkX = -6, landmarkZ = 7, district = -8, facility = 4 } },
	-- [항구별 재배치 102~118] koenigsberg: 지시서와 기존 승인 실물에 따라 항만 필지·광장·시설 위치 분리.
	koenigsberg = { landmark = { id = "lm_koenigsberg_city_gate", name = "쾨니히스베르크 붉은 벽돌 양탑 문루", kind = "city_gate", fallback = "none" },
		roof = "gable", wall = "brick", balcony = nil, layout = "grid", plaza = "market",
		street = { "dirt", "cobble", "cobble", "cobble", "paved" }, lamp = "oil_lantern", ground = "grass", weatherGround = "snow",
		signature = { "호박 시장", "목재 부두", "아마 상관" }, facade = { 167, 112, 90 }, roofTint = { 93, 78, 72 },
		reflow = { lane = 4, plaza = -14, side = -1, landmarkX = 6, landmarkZ = -5, district = 12, facility = 2 } },
	-- [항구별 재배치 102~118] la_guaira: 지시서와 기존 승인 실물에 따라 항만 필지·광장·시설 위치 분리.
	la_guaira = { landmark = { id = "lm_la_guaira_cathedral", name = "라과이라 식민지 쌍탑 성당", kind = "cathedral", fallback = "none" },
		roof = "flat", wall = "stucco", balcony = "iron", layout = "terrace", plaza = "parade",
		street = { "sand", "dirt", "gravel", "cobble", "paved" }, lamp = "oil_lantern", ground = "sand", weatherGround = "puddles",
		signature = { "카카오 창고", "피혁 시장", "진주 선적소" }, facade = { 233, 210, 182 }, roofTint = { 174, 106, 77 },
		reflow = { lane = 12, plaza = 5, side = 1, landmarkX = 7, landmarkZ = 5, district = 10, facility = 5 } },
	-- [항구별 재배치 102~118] la_rochelle: 지시서와 기존 승인 실물에 따라 항만 필지·광장·시설 위치 분리.
	la_rochelle = { landmark = { id = "lm_la_rochelle_fort", name = "라로셸 해안 석조 방어 성곽", kind = "fort", fallback = "none" },
		roof = "hip", wall = "stone", balcony = "iron", layout = "terrace", plaza = "fountain",
		street = { "dirt", "gravel", "cobble", "flagstone", "paved" }, lamp = "oil_lantern", ground = "grass", weatherGround = "puddles",
		signature = { "소금 염장소", "포도주 상관", "올리브 압착소" }, facade = { 210, 204, 188 }, roofTint = { 103, 108, 118 },
		reflow = { lane = -8, plaza = -11, side = -1, landmarkX = -5, landmarkZ = -7, district = 3, facility = 6 } },
	-- [항구별 재배치 102~118] lagos: 지시서와 기존 승인 실물에 따라 항만 필지·광장·시설 위치 분리.
	lagos = { landmark = { id = "lm_lagos_fort", name = "라고스 해안 요새와 붉은 벽돌 문루", kind = "fort", fallback = "none" },
		roof = "thatch", wall = "adobe", balcony = nil, layout = "organic", plaza = "market",
		street = { "red_earth", "red_earth", "gravel", "flagstone", "paved" }, lamp = "torch", ground = "red_earth", weatherGround = "monsoon_mud",
		signature = { "야자 기름 압착소", "상아 시장", "흑단 선창" }, facade = { 190, 150, 104 }, roofTint = { 117, 87, 61 },
		reflow = { lane = 7, plaza = 13, side = 1, landmarkX = 5, landmarkZ = 7, district = -10, facility = 3 } },
	-- [항구별 재배치 102~118] las_palmas: 지시서와 기존 승인 실물에 따라 항만 필지·광장·시설 위치 분리.
	las_palmas = { landmark = { id = "lm_las_palmas_bell_tower", name = "라스팔마스 해안 성당 종탑", kind = "bell_tower", fallback = "none" },
		roof = "hip", wall = "stucco", balcony = "iron", layout = "terrace", plaza = "fountain",
		street = { "dirt", "gravel", "cobble", "flagstone", "paved" }, lamp = "oil_lantern", ground = "sand", weatherGround = "dust",
		signature = { "포도주 저장고", "설탕 압착소", "해염 시장" }, facade = { 241, 220, 187 }, roofTint = { 168, 105, 75 },
		reflow = { lane = -5, plaza = -15, side = -1, landmarkX = -8, landmarkZ = -8, district = 9, facility = 1 } },
	-- [항구별 재배치 102~118] livorno: 지시서와 기존 승인 실물에 따라 항만 필지·광장·시설 위치 분리.
	livorno = { landmark = { id = "lm_livorno_campanile", name = "리보르노 붉은 벽돌 종탑", kind = "campanile", fallback = "none" },
		roof = "hip", wall = "stucco", balcony = "loggia", layout = "grid", plaza = "fountain",
		street = { "dirt", "flagstone", "flagstone", "flagstone", "flagstone" }, lamp = "oil_lantern", ground = "grass", weatherGround = "puddles",
		signature = { "올리브 압착소", "포도주 상관", "대리석 선창" }, facade = { 235, 195, 155 }, roofTint = { 166, 94, 69 },
		reflow = { lane = 10, plaza = -8, side = 1, landmarkX = 8, landmarkZ = -5, district = -6, facility = 4 } },
	-- [항구별 재배치 102~118] luanda: 지시서와 기존 승인 실물에 따라 항만 필지·광장·시설 위치 분리.
	luanda = { landmark = { id = "lm_luanda_fort", name = "루안다 석조 해안 성채", kind = "fort", fallback = "none" },
		roof = "thatch", wall = "adobe", balcony = nil, layout = "organic", plaza = "market",
		street = { "red_earth", "red_earth", "gravel", "flagstone", "paved" }, lamp = "torch", ground = "red_earth", weatherGround = "dust",
		signature = { "면직물 공방", "설탕 창고", "흑단 목재 선창" }, facade = { 180, 142, 105 }, roofTint = { 108, 84, 66 },
		reflow = { lane = -12, plaza = 7, side = -1, landmarkX = -7, landmarkZ = 6, district = -12, facility = 5 } },
	-- [항구별 재배치 102~118] lubeck: 지시서와 기존 승인 실물에 따라 항만 필지·광장·시설 위치 분리.
	lubeck = { landmark = { id = "lm_lubeck_city_gate", name = "뤼베크 고딕 양탑 도시 문루", kind = "city_gate", fallback = "none" },
		roof = "gable", wall = "brick", balcony = nil, layout = "grid", plaza = "market",
		street = { "dirt", "cobble", "cobble", "cobble", "paved" }, lamp = "oil_lantern", ground = "grass", weatherGround = "snow",
		signature = { "해염 창고", "맥주 시장", "목재 상관" }, facade = { 181, 107, 86 }, roofTint = { 100, 77, 74 },
		reflow = { lane = 2, plaza = 11, side = 1, landmarkX = 3, landmarkZ = 8, district = 7, facility = 2 } },
	-- [항구별 재배치 102~118] macau: 지시서와 기존 승인 실물에 따라 항만 필지·광장·시설 위치 분리.
	macau = { landmark = { id = "lm_macau_city_gate", name = "마카오 회색 벽돌 해안 문루", kind = "city_gate", fallback = "none" },
		roof = "eave", wall = "brick", balcony = "wood_lattice", layout = "canal", plaza = "quay",
		street = { "dirt", "gravel", "flagstone", "flagstone", "paved" }, lamp = "paper_lantern", ground = "rice_paddy", weatherGround = "monsoon_mud",
		signature = { "차 상관", "도자기 시장", "비단 창고" }, facade = { 169, 151, 139 }, roofTint = { 63, 73, 82 },
		reflow = { lane = -9, plaza = -13, side = -1, landmarkX = -6, landmarkZ = -6, district = 11, facility = 6 } },
	-- [항구별 재배치 102~118] madras: 지시서와 기존 승인 실물에 따라 항만 필지·광장·시설 위치 분리.
	madras = { landmark = { id = "lm_madras_gopuram", name = "마드라스 층층 지붕 사원 문루", kind = "gopuram", fallback = "none" },
		roof = "eave", wall = "plaster", balcony = "wood_lattice", layout = "grid", plaza = "market",
		street = { "red_earth", "red_earth", "gravel", "flagstone", "paved" }, lamp = "oil_lantern", ground = "red_earth", weatherGround = "monsoon_mud",
		signature = { "면화 시장", "인디고 염색소", "보석 계량소" }, facade = { 211, 173, 129 }, roofTint = { 127, 92, 72 },
		reflow = { lane = 6, plaza = 15, side = 1, landmarkX = 5, landmarkZ = 8, district = 1, facility = 3 } },
	-- [항구별 재배치 102~118] makassar: 지시서와 기존 승인 실물에 따라 항만 필지·광장·시설 위치 분리.
	makassar = { landmark = { id = "lm_makassar_royal_hall", name = "마카사르 향신료 항만 겹지붕 회관", kind = "royal_hall", fallback = "none" },
		roof = "thatch", wall = "wood", balcony = "wood_lattice", layout = "organic", plaza = "market",
		street = { "mud", "dirt", "gravel", "plank", "paved" }, lamp = "paper_lantern", ground = "mud", weatherGround = "monsoon_mud",
		signature = { "육두구 선별장", "정향 창고", "백단향 선창" }, facade = { 190, 156, 111 }, roofTint = { 121, 85, 58 },
		reflow = { lane = -7, plaza = -7, side = -1, landmarkX = -4, landmarkZ = -4, district = -9, facility = 1 } },
	-- [항구별 재배치 102~118] malaga: 지시서와 기존 승인 실물에 따라 항만 필지·광장·시설 위치 분리.
	malaga = { landmark = { id = "lm_malaga_bell_tower", name = "말라가 석조 성당 종탑", kind = "bell_tower", fallback = "none" },
		roof = "hip", wall = "stucco", balcony = "iron", layout = "terrace", plaza = "fountain",
		street = { "dirt", "gravel", "cobble", "flagstone", "paved" }, lamp = "oil_lantern", ground = "red_earth", weatherGround = "dust",
		signature = { "건포도 창고", "올리브 압착소", "포도주 시장" }, facade = { 237, 213, 172 }, roofTint = { 164, 105, 78 },
		reflow = { lane = 11, plaza = 10, side = 1, landmarkX = 8, landmarkZ = 7, district = 12, facility = 5 } },
	-- [항구별 재배치 102~118] messina: 지시서와 기존 승인 실물에 따라 항만 필지·광장·시설 위치 분리.
	messina = { landmark = { id = "lm_messina_campanile", name = "메시나 해안 돔 성당 종탑", kind = "campanile", fallback = "none" },
		roof = "hip", wall = "stucco", balcony = "loggia", layout = "terrace", plaza = "fountain",
		street = { "dirt", "flagstone", "flagstone", "flagstone", "flagstone" }, lamp = "oil_lantern", ground = "grass", weatherGround = "puddles",
		signature = { "비단 직조 공방", "포도주 상관", "산호 시장" }, facade = { 225, 188, 162 }, roofTint = { 170, 99, 74 },
		reflow = { lane = -4, plaza = 14, side = -1, landmarkX = -3, landmarkZ = 6, district = 4, facility = 2 } },
	-- [항구별 재배치 102~118] mocha: 지시서와 기존 승인 실물에 따라 항만 필지·광장·시설 위치 분리.
	mocha = { landmark = { id = "lm_mocha_mosque", name = "모카 산호석 해안 모스크", kind = "mosque", fallback = "none" },
		roof = "flat", wall = "coral", balcony = "wood_lattice", layout = "organic", plaza = "quay",
		street = { "sand", "sand", "gravel", "flagstone", "flagstone" }, lamp = "oil_lantern", ground = "sand", weatherGround = "dust",
		signature = { "커피 볶음 공방", "대추야자 창고", "아라비아고무 상관" }, facade = { 231, 212, 171 }, roofTint = { 143, 116, 85 },
		reflow = { lane = 9, plaza = -15, side = 1, landmarkX = 7, landmarkZ = -8, district = -11, facility = 4 } },
	-- [항구별 재배치 102~118] mogadishu: 지시서와 기존 승인 실물에 따라 항만 필지·광장·시설 위치 분리.
	mogadishu = { landmark = { id = "lm_mogadishu_mosque", name = "모가디슈 해안 산호석 첨탑 모스크", kind = "mosque", fallback = "none" },
		roof = "flat", wall = "coral", balcony = "wood_lattice", layout = "grid", plaza = "quay",
		street = { "sand", "sand", "gravel", "flagstone", "flagstone" }, lamp = "oil_lantern", ground = "sand", weatherGround = "dust",
		signature = { "용연향 계량소", "유향 창고", "상아 선창" }, facade = { 222, 202, 174 }, roofTint = { 135, 117, 94 },
		reflow = { lane = -10, plaza = 6, side = -1, landmarkX = -8, landmarkZ = 4, district = 8, facility = 3 } },
	-- [항구별 재배치 102~118] mombasa: 지시서와 기존 승인 실물에 따라 항만 필지·광장·시설 위치 분리.
	mombasa = { landmark = { id = "lm_mombasa_mosque", name = "몸바사 해안 산호석 중정 모스크", kind = "mosque", fallback = "none" },
		roof = "flat", wall = "coral", balcony = "wood_lattice", layout = "organic", plaza = "quay",
		street = { "sand", "sand", "gravel", "flagstone", "flagstone" }, lamp = "oil_lantern", ground = "sand", weatherGround = "monsoon_mud",
		signature = { "정향 선별장", "상아 시장", "대추야자 선창" }, facade = { 217, 193, 161 }, roofTint = { 149, 120, 87 },
		reflow = { lane = 5, plaza = -12, side = 1, landmarkX = 6, landmarkZ = -7, district = -7, facility = 6 } },

	-- [항구별 재배치 119~181] montevideo: 항구 지시서의 건축·기후·시장 특색 및 개별 필지 좌표.
	montevideo = { landmark = { id = "lm_montevideo_cathedral", name = "몬테비데오 Baroque colonial cathedral facade with twin towers", kind = "cathedral", fallback = "none" },
		roof = "flat", wall = "stucco", balcony = "iron", layout = "grid", plaza = "parade",
		street = { "sand", "dirt", "gravel", "cobble", "paved" }, lamp = "oil_lantern", ground = "sand", weatherGround = "puddles",
		signature = { "가죽 시장", "소금 공방", "양모 선창" }, facade = { 234, 207, 175 }, roofTint = { 174, 95, 77 },
		reflow = { lane = -11, plaza = -15, side = -1, landmarkX = -8, landmarkZ = 1, district = -11, facility = 5 } },

	-- [항구별 재배치 119~181] mozambique: 항구 지시서의 건축·기후·시장 특색 및 개별 필지 좌표.
	mozambique = { landmark = { id = "lm_mozambique_mosque", name = "모잠비크 coral-stone mosque with mihrab and simple minaret", kind = "mosque", fallback = "none" },
		roof = "flat", wall = "coral", balcony = "wood_lattice", layout = "organic", plaza = "quay",
		street = { "sand", "sand", "gravel", "flagstone", "flagstone" }, lamp = "oil_lantern", ground = "sand", weatherGround = "monsoon_mud",
		signature = { "상아 시장", "금 공방", "흑단 선창" }, facade = { 229, 220, 173 }, roofTint = { 152, 130, 107 },
		reflow = { lane = -9, plaza = -6, side = -1, landmarkX = 2, landmarkZ = -7, district = -5, facility = 1 } },

	-- [항구별 재배치 119~181] muscat: 항구 지시서의 건축·기후·시장 특색 및 개별 필지 좌표.
	muscat = { landmark = { id = "lm_muscat_mosque", name = "무스카트 coral-stone mosque with mihrab and simple minaret", kind = "mosque", fallback = "none" },
		roof = "flat", wall = "coral", balcony = "wood_lattice", layout = "organic", plaza = "quay",
		street = { "sand", "sand", "gravel", "flagstone", "flagstone" }, lamp = "oil_lantern", ground = "sand", weatherGround = "puddles",
		signature = { "대추야자 시장", "진주 공방", "유향 선창" }, facade = { 235, 218, 178 }, roofTint = { 159, 129, 96 },
		reflow = { lane = 0, plaza = -6, side = 1, landmarkX = 3, landmarkZ = -5, district = -8, facility = 2 } },

	-- [항구별 재배치 119~181] nassau: 항구 지시서의 건축·기후·시장 특색 및 개별 필지 좌표.
	nassau = { landmark = { id = "lm_nassau_fort", name = "나소 coastal stone fort with signal tower", kind = "fort", fallback = "none" },
		roof = "hip", wall = "wood", balcony = "wood_lattice", layout = "grid", plaza = "parade",
		street = { "sand", "dirt", "gravel", "brick", "paved" }, lamp = "oil_lantern", ground = "sand", weatherGround = "puddles",
		signature = { "소금 시장", "럼주 공방", "용연향 선창" }, facade = { 218, 180, 161 }, roofTint = { 156, 98, 84 },
		reflow = { lane = -2, plaza = -6, side = 1, landmarkX = -8, landmarkZ = 1, district = -11, facility = 4 } },

	-- [항구별 재배치 119~181] new_orleans: 항구 지시서의 건축·기후·시장 특색 및 개별 필지 좌표.
	new_orleans = { landmark = { id = "lm_new_orleans_fort", name = "뉴올리언스 coastal stone fort with signal tower", kind = "fort", fallback = "none" },
		roof = "hip", wall = "wood", balcony = "wood_lattice", layout = "grid", plaza = "parade",
		street = { "sand", "dirt", "gravel", "brick", "paved" }, lamp = "oil_lantern", ground = "sand", weatherGround = "puddles",
		signature = { "모피 시장", "면화 공방", "설탕 선창" }, facade = { 223, 185, 149 }, roofTint = { 161, 103, 72 },
		reflow = { lane = 11, plaza = -4, side = 1, landmarkX = -1, landmarkZ = 8, district = -9, facility = 6 } },

	-- [항구별 재배치 119~181] ningbo: 항구 지시서의 건축·기후·시장 특색 및 개별 필지 좌표.
	ningbo = { landmark = { id = "lm_ningbo_city_gate", name = "닝보 multi-storey pagoda or city gate tower", kind = "city_gate", fallback = "none" },
		roof = "eave", wall = "brick", balcony = "wood_lattice", layout = "grid", plaza = "quay",
		street = { "dirt", "gravel", "flagstone", "flagstone", "paved" }, lamp = "paper_lantern", ground = "grass", weatherGround = "puddles",
		signature = { "차 시장", "비단 공방", "도자기 선창" }, facade = { 163, 158, 141 }, roofTint = { 55, 78, 82 },
		reflow = { lane = 8, plaza = -1, side = 1, landmarkX = 8, landmarkZ = 0, district = 8, facility = 6 } },

	-- [항구별 재배치 119~181] oran: 항구 지시서의 건축·기후·시장 특색 및 개별 필지 좌표.
	oran = { landmark = { id = "lm_oran_mosque", name = "오랑 mosque with square minaret and courtyard", kind = "mosque", fallback = "none" },
		roof = "flat", wall = "adobe", balcony = "mashrabiya", layout = "organic", plaza = "market",
		street = { "sand", "dirt", "gravel", "flagstone", "flagstone" }, lamp = "mosque_lamp", ground = "sand", weatherGround = "dust",
		signature = { "양모 시장", "소금 공방", "올리브유 선창" }, facade = { 214, 192, 158 }, roofTint = { 154, 128, 100 },
		reflow = { lane = -5, plaza = 11, side = -1, landmarkX = 7, landmarkZ = -2, district = 0, facility = 1 } },

	-- [항구별 재배치 119~181] oslo: 항구 지시서의 건축·기후·시장 특색 및 개별 필지 좌표.
	oslo = { landmark = { id = "lm_oslo_church", name = "오슬로 tall wooden stave-style church or copper-spired tower", kind = "church", fallback = "none" },
		roof = "gable", wall = "wood", balcony = nil, layout = "organic", plaza = "quay",
		street = { "dirt", "gravel", "gravel", "cobble", "paved" }, lamp = "oil_lantern", ground = "snowmelt", weatherGround = "snow",
		signature = { "목재 시장", "생선 공방", "철 선창" }, facade = { 222, 199, 133 }, roofTint = { 83, 112, 98 },
		reflow = { lane = -10, plaza = 5, side = 1, landmarkX = 0, landmarkZ = 8, district = 4, facility = 6 } },

	-- [항구별 재배치 119~181] ouidah: 항구 지시서의 건축·기후·시장 특색 및 개별 필지 좌표.
	ouidah = { landmark = { id = "lm_ouidah_mosque", name = "위다 mud-brick mosque with wooden torons or coastal castle", kind = "mosque", fallback = "none" },
		roof = "thatch", wall = "adobe", balcony = nil, layout = "organic", plaza = "market",
		street = { "red_earth", "red_earth", "gravel", "flagstone", "paved" }, lamp = "torch", ground = "red_earth", weatherGround = "monsoon_mud",
		signature = { "야자유 시장", "면화 공방", "상아 선창" }, facade = { 189, 137, 103 }, roofTint = { 119, 77, 60 },
		reflow = { lane = 10, plaza = -2, side = -1, landmarkX = -8, landmarkZ = 1, district = 2, facility = 1 } },

	-- [항구별 재배치 119~181] palermo: 항구 지시서의 건축·기후·시장 특색 및 개별 필지 좌표.
	palermo = { landmark = { id = "lm_palermo_campanile", name = "팔레르모 brick campanile beside a domed church", kind = "campanile", fallback = "none" },
		roof = "hip", wall = "stucco", balcony = "loggia", layout = "terrace", plaza = "fountain",
		street = { "dirt", "flagstone", "flagstone", "flagstone", "flagstone" }, lamp = "oil_lantern", ground = "grass", weatherGround = "puddles",
		signature = { "포도주 시장", "소금 공방", "올리브유 선창" }, facade = { 223, 175, 140 }, roofTint = { 156, 103, 75 },
		reflow = { lane = 10, plaza = 8, side = -1, landmarkX = 1, landmarkZ = -7, district = 8, facility = 5 } },

	-- [항구별 재배치 119~181] palma: 항구 지시서의 건축·기후·시장 특색 및 개별 필지 좌표.
	palma = { landmark = { id = "lm_palma_fort", name = "팔마 bell tower over a cathedral or Moorish-era fortress", kind = "fort", fallback = "none" },
		roof = "hip", wall = "stucco", balcony = "iron", layout = "terrace", plaza = "fountain",
		street = { "dirt", "gravel", "cobble", "flagstone", "paved" }, lamp = "oil_lantern", ground = "grass", weatherGround = "puddles",
		signature = { "올리브유 시장", "소금 공방", "포도주 선창" }, facade = { 216, 165, 151 }, roofTint = { 171, 91, 64 },
		reflow = { lane = 3, plaza = -1, side = 1, landmarkX = -4, landmarkZ = 5, district = 0, facility = 2 } },

	-- [항구별 재배치 119~181] panama: 항구 지시서의 건축·기후·시장 특색 및 개별 필지 좌표.
	panama = { landmark = { id = "lm_panama_cathedral", name = "파나마 Baroque colonial cathedral facade with twin towers", kind = "cathedral", fallback = "none" },
		roof = "flat", wall = "stucco", balcony = "iron", layout = "grid", plaza = "parade",
		street = { "sand", "dirt", "gravel", "cobble", "paved" }, lamp = "oil_lantern", ground = "sand", weatherGround = "monsoon_mud",
		signature = { "금 시장", "은 공방", "진주 선창" }, facade = { 214, 188, 158 }, roofTint = { 184, 105, 67 },
		reflow = { lane = 3, plaza = -2, side = -1, landmarkX = -8, landmarkZ = 1, district = -2, facility = 1 } },

	-- [항구별 재배치 119~181] paramaribo: 항구 지시서의 건축·기후·시장 특색 및 개별 필지 좌표.
	paramaribo = { landmark = { id = "lm_paramaribo_fort", name = "파라마리보 coastal stone fort with signal tower", kind = "fort", fallback = "none" },
		roof = "hip", wall = "wood", balcony = "wood_lattice", layout = "grid", plaza = "parade",
		street = { "sand", "dirt", "gravel", "brick", "paved" }, lamp = "oil_lantern", ground = "sand", weatherGround = "monsoon_mud",
		signature = { "설탕 시장", "cocoa 공방", "쌀 선창" }, facade = { 233, 189, 164 }, roofTint = { 142, 100, 65 },
		reflow = { lane = -6, plaza = -3, side = -1, landmarkX = 8, landmarkZ = -1, district = -6, facility = 5 } },

	-- [항구별 재배치 119~181] perth: 항구 지시서의 건축·기후·시장 특색 및 개별 필지 좌표.
	perth = { landmark = { id = "lm_perth_meeting_house", name = "퍼스 great meeting house with carved posts", kind = "meeting_house", fallback = "none" },
		roof = "thatch", wall = "wood", balcony = nil, layout = "organic", plaza = "quay",
		street = { "sand", "sand", "gravel", "plank", "paved" }, lamp = "torch", ground = "sand", weatherGround = "puddles",
		signature = { "양모 시장", "진주조개 공방", "백단향 선창" }, facade = { 159, 149, 108 }, roofTint = { 111, 94, 80 },
		reflow = { lane = 7, plaza = 7, side = 1, landmarkX = 4, landmarkZ = -4, district = -12, facility = 2 } },

	-- [항구별 재배치 119~181] philadelphia: 항구 지시서의 건축·기후·시장 특색 및 개별 필지 좌표.
	philadelphia = { landmark = { id = "lm_philadelphia_fort", name = "필라델피아 stone fortress tower with onion or needle spire", kind = "fort", fallback = "none" },
		roof = "hip", wall = "stone", balcony = nil, layout = "terrace", plaza = "parade",
		street = { "dirt", "gravel", "cobble", "flagstone", "paved" }, lamp = "oil_lantern", ground = "grass", weatherGround = "puddles",
		signature = { "옥수수 시장", "목재 공방", "철 선창" }, facade = { 181, 169, 153 }, roofTint = { 80, 98, 106 },
		reflow = { lane = 10, plaza = 14, side = 1, landmarkX = 1, landmarkZ = -8, district = -8, facility = 2 } },

	-- [항구별 재배치 119~181] plymouth: 항구 지시서의 건축·기후·시장 특색 및 개별 필지 좌표.
	plymouth = { landmark = { id = "lm_plymouth_church", name = "플리머스 Gothic parish church tower with clock", kind = "church", fallback = "none" },
		roof = "gable", wall = "brick", balcony = nil, layout = "organic", plaza = "market",
		street = { "dirt", "gravel", "cobble", "cobble", "paved" }, lamp = "oil_lantern", ground = "grass", weatherGround = "puddles",
		signature = { "주석 시장", "생선 공방", "소금 선창" }, facade = { 149, 77, 70 }, roofTint = { 87, 77, 61 },
		reflow = { lane = -1, plaza = -11, side = -1, landmarkX = 4, landmarkZ = -5, district = 3, facility = 1 } },

	-- [항구별 재배치 119~181] ponta_delgada: 지시서 건축·기후·시장·방문 구역에 따른 개별 배치.
	ponta_delgada = { landmark = { id = "lm_ponta_delgada_fort", name = "퐁타델가다 bell tower over a cathedral or Moorish-era fortress", kind = "fort", fallback = "none" },
		roof = "hip", wall = "stucco", balcony = "iron", layout = "terrace", plaza = "fountain",
		street = { "dirt", "gravel", "cobble", "flagstone", "paved" }, lamp = "oil_lantern", ground = "grass", weatherGround = "puddles",
		signature = { "생선 시장", "포도주 공방", "소금 선창" }, facade = { 227, 200, 157 }, roofTint = { 143, 109, 80 },
		reflow = { lane = 11, plaza = 4, side = 1, landmarkX = -8, landmarkZ = 1, district = 1, facility = 4 } },

	-- [항구별 재배치 119~181] port_louis: 지시서 건축·기후·시장·방문 구역에 따른 개별 배치.
	port_louis = { landmark = { id = "lm_port_louis_fort", name = "포트루이 trading-post fort with flag tower", kind = "fort", fallback = "none" },
		roof = "hip", wall = "plaster", balcony = "wood_lattice", layout = "organic", plaza = "quay",
		street = { "sand", "dirt", "gravel", "plank", "paved" }, lamp = "oil_lantern", ground = "sand", weatherGround = "monsoon_mud",
		signature = { "흑단 시장", "설탕 공방", "쌀 선창" }, facade = { 224, 177, 150 }, roofTint = { 162, 95, 73 },
		reflow = { lane = -12, plaza = 4, side = -1, landmarkX = 1, landmarkZ = -7, district = 2, facility = 5 } },

	-- [항구별 재배치 119~181] port_moresby: 지시서 건축·기후·시장·방문 구역에 따른 개별 배치.
	port_moresby = { landmark = { id = "lm_port_moresby_meeting_house", name = "포트모르즈비 great meeting house with carved posts", kind = "meeting_house", fallback = "none" },
		roof = "thatch", wall = "wood", balcony = nil, layout = "organic", plaza = "quay",
		street = { "sand", "sand", "gravel", "plank", "paved" }, lamp = "torch", ground = "sand", weatherGround = "monsoon_mud",
		signature = { "깃털 시장", "백단향 공방", "진주조개 선창" }, facade = { 186, 154, 108 }, roofTint = { 132, 103, 72 },
		reflow = { lane = 5, plaza = -14, side = 1, landmarkX = 1, landmarkZ = -8, district = -10, facility = 2 } },

	-- [항구별 재배치 119~181] port_of_spain: 지시서 건축·기후·시장·방문 구역에 따른 개별 배치.
	port_of_spain = { landmark = { id = "lm_port_of_spain_fort", name = "포트오브스페인 coastal stone fort with signal tower", kind = "fort", fallback = "none" },
		roof = "hip", wall = "wood", balcony = "wood_lattice", layout = "grid", plaza = "parade",
		street = { "sand", "dirt", "gravel", "brick", "paved" }, lamp = "oil_lantern", ground = "sand", weatherGround = "monsoon_mud",
		signature = { "cocoa 시장", "설탕 공방", "cocoa 선창" }, facade = { 229, 181, 168 }, roofTint = { 137, 108, 68 },
		reflow = { lane = -5, plaza = 0, side = 1, landmarkX = 5, landmarkZ = -3, district = -4, facility = 4 } },

	-- [항구별 재배치 119~181] portobelo: 지시서 건축·기후·시장·방문 구역에 따른 개별 배치.
	portobelo = { landmark = { id = "lm_portobelo_cathedral", name = "포르토벨로 Baroque colonial cathedral facade with twin towers", kind = "cathedral", fallback = "none" },
		roof = "flat", wall = "stucco", balcony = "iron", layout = "grid", plaza = "parade",
		street = { "sand", "dirt", "gravel", "cobble", "paved" }, lamp = "oil_lantern", ground = "sand", weatherGround = "monsoon_mud",
		signature = { "금 시장", "은 공방", "진주 선창" }, facade = { 233, 191, 165 }, roofTint = { 157, 96, 72 },
		reflow = { lane = 8, plaza = -6, side = -1, landmarkX = 5, landmarkZ = -4, district = 5, facility = 3 } },

	-- [항구별 재배치 119~181] praia: 지시서 건축·기후·시장·방문 구역에 따른 개별 배치.
	praia = { landmark = { id = "lm_praia_mosque", name = "프라이아 mud-brick mosque with wooden torons or coastal castle", kind = "mosque", fallback = "none" },
		roof = "thatch", wall = "adobe", balcony = nil, layout = "organic", plaza = "market",
		street = { "red_earth", "red_earth", "gravel", "flagstone", "paved" }, lamp = "torch", ground = "red_earth", weatherGround = "monsoon_mud",
		signature = { "소금 시장", "면화 공방", "생선 선창" }, facade = { 174, 136, 112 }, roofTint = { 118, 87, 61 },
		reflow = { lane = 7, plaza = -9, side = 1, landmarkX = -7, landmarkZ = 2, district = -8, facility = 2 } },

	-- [항구별 재배치 119~181] quebec: 지시서 건축·기후·시장·방문 구역에 따른 개별 배치.
	quebec = { landmark = { id = "lm_quebec_fort", name = "퀘벡 stone fortress tower with onion or needle spire", kind = "fort", fallback = "none" },
		roof = "hip", wall = "stone", balcony = nil, layout = "terrace", plaza = "parade",
		street = { "dirt", "gravel", "cobble", "flagstone", "paved" }, lamp = "oil_lantern", ground = "grass", weatherGround = "puddles",
		signature = { "모피 시장", "목재 공방", "생선 선창" }, facade = { 185, 173, 156 }, roofTint = { 90, 91, 98 },
		reflow = { lane = 2, plaza = -1, side = 1, landmarkX = -8, landmarkZ = 1, district = -12, facility = 4 } },

	-- [항구별 재배치 119~181] ragusa: 지시서 건축·기후·시장·방문 구역에 따른 개별 배치.
	ragusa = { landmark = { id = "lm_ragusa_campanile", name = "라구사 brick campanile beside a domed church", kind = "campanile", fallback = "none" },
		roof = "hip", wall = "stucco", balcony = "loggia", layout = "terrace", plaza = "fountain",
		street = { "dirt", "flagstone", "flagstone", "flagstone", "flagstone" }, lamp = "oil_lantern", ground = "grass", weatherGround = "puddles",
		signature = { "소금 시장", "포도주 공방", "올리브유 선창" }, facade = { 231, 203, 172 }, roofTint = { 157, 83, 70 },
		reflow = { lane = -12, plaza = -8, side = 1, landmarkX = 7, landmarkZ = -1, district = -5, facility = 6 } },

	-- [항구별 재배치 119~181] rangoon: 지시서 건축·기후·시장·방문 구역에 따른 개별 배치.
	rangoon = { landmark = { id = "lm_rangoon_pagoda", name = "양곤 stupa/pagoda or tiered-roof royal hall", kind = "pagoda", fallback = "none" },
		roof = "thatch", wall = "wood", balcony = "wood_lattice", layout = "organic", plaza = "market",
		street = { "mud", "dirt", "gravel", "plank", "paved" }, lamp = "paper_lantern", ground = "mud", weatherGround = "monsoon_mud",
		signature = { "쌀 시장", "보석 공방", "상아 선창" }, facade = { 173, 140, 107 }, roofTint = { 126, 76, 57 },
		reflow = { lane = 6, plaza = -6, side = -1, landmarkX = -4, landmarkZ = 5, district = -11, facility = 5 } },

	-- [항구별 재배치 119~181] recife: 지시서 건축·기후·시장·방문 구역에 따른 개별 배치.
	recife = { landmark = { id = "lm_recife_cathedral", name = "헤시피 Baroque colonial cathedral facade with twin towers", kind = "cathedral", fallback = "none" },
		roof = "flat", wall = "stucco", balcony = "iron", layout = "grid", plaza = "parade",
		street = { "sand", "dirt", "gravel", "cobble", "paved" }, lamp = "oil_lantern", ground = "sand", weatherGround = "monsoon_mud",
		signature = { "설탕 시장", "브라질목 공방", "면화 선창" }, facade = { 227, 213, 189 }, roofTint = { 175, 98, 76 },
		reflow = { lane = -10, plaza = -11, side = -1, landmarkX = 2, landmarkZ = -6, district = 11, facility = 5 } },

	-- [항구별 재배치 119~181] rhodes: 지시서 건축·기후·시장·방문 구역에 따른 개별 배치.
	rhodes = { landmark = { id = "lm_rhodes_chapel", name = "로도스 hilltop chapel with bell gable", kind = "chapel", fallback = "none" },
		roof = "flat", wall = "stucco", balcony = "iron", layout = "terrace", plaza = "fountain",
		street = { "dirt", "gravel", "flagstone", "flagstone", "paved" }, lamp = "oil_lantern", ground = "grass", weatherGround = "puddles",
		signature = { "올리브유 시장", "포도주 공방", "비단 선창" }, facade = { 230, 217, 189 }, roofTint = { 93, 130, 148 },
		reflow = { lane = 2, plaza = -3, side = 1, landmarkX = 6, landmarkZ = -2, district = -8, facility = 4 } },

	-- [항구별 재배치 119~181] riga: 지시서 건축·기후·시장·방문 구역에 따른 개별 배치.
	riga = { landmark = { id = "lm_riga_city_gate", name = "리가 brick Gothic city gate (Holstentor-style) with twin towers", kind = "city_gate", fallback = "none" },
		roof = "gable", wall = "brick", balcony = nil, layout = "grid", plaza = "market",
		street = { "dirt", "cobble", "cobble", "cobble", "paved" }, lamp = "oil_lantern", ground = "snowmelt", weatherGround = "snow",
		signature = { "목재 시장", "모피 공방", "아마포 선창" }, facade = { 183, 105, 79 }, roofTint = { 107, 80, 72 },
		reflow = { lane = 4, plaza = -6, side = 1, landmarkX = -5, landmarkZ = 4, district = 3, facility = 6 } },

	-- [항구별 재배치 119~181] rio: 지시서 건축·기후·시장·방문 구역에 따른 개별 배치.
	rio = { landmark = { id = "lm_rio_cathedral", name = "리우데자네이루 Baroque colonial cathedral facade with twin towers", kind = "cathedral", fallback = "none" },
		roof = "flat", wall = "stucco", balcony = "iron", layout = "grid", plaza = "parade",
		street = { "sand", "dirt", "gravel", "cobble", "paved" }, lamp = "oil_lantern", ground = "sand", weatherGround = "monsoon_mud",
		signature = { "설탕 시장", "금 공방", "보석 선창" }, facade = { 228, 205, 178 }, roofTint = { 166, 101, 61 },
		reflow = { lane = 5, plaza = 6, side = -1, landmarkX = 5, landmarkZ = -3, district = 8, facility = 3 } },

	-- [항구별 재배치 119~181] rotterdam: 지시서 건축·기후·시장·방문 구역에 따른 개별 배치.
	rotterdam = { landmark = { id = "lm_rotterdam_belfry", name = "로테르담 brick belfry tower over a cloth hall", kind = "belfry", fallback = "none" },
		roof = "gable", wall = "brick", balcony = "iron", layout = "canal", plaza = "quay",
		street = { "plank", "brick", "brick", "brick", "paved" }, lamp = "oil_lantern", ground = "grass", weatherGround = "puddles",
		signature = { "치즈 시장", "아마포 공방", "맥주 선창" }, facade = { 169, 80, 71 }, roofTint = { 98, 63, 61 },
		reflow = { lane = -1, plaza = 8, side = -1, landmarkX = -8, landmarkZ = 1, district = 0, facility = 1 } },

	-- [항구별 재배치 119~181] safi: 지시서 건축·기후·시장·방문 구역에 따른 개별 배치.
	safi = { landmark = { id = "lm_safi_mosque", name = "사피 mosque with square minaret and courtyard", kind = "mosque", fallback = "none" },
		roof = "flat", wall = "adobe", balcony = "mashrabiya", layout = "organic", plaza = "market",
		street = { "sand", "dirt", "gravel", "flagstone", "flagstone" }, lamp = "mosque_lamp", ground = "sand", weatherGround = "dust",
		signature = { "가죽 시장", "대추야자 공방", "양탄자 선창" }, facade = { 220, 187, 148 }, roofTint = { 148, 121, 84 },
		reflow = { lane = -2, plaza = -7, side = 1, landmarkX = -1, landmarkZ = 8, district = 10, facility = 6 } },

	-- [항구별 재배치 119~181] saint_louis: 지시서 건축·기후·시장·방문 구역에 따른 개별 배치.
	saint_louis = { landmark = { id = "lm_saint_louis_mosque", name = "생루이 mud-brick mosque with wooden torons or coastal castle", kind = "mosque", fallback = "none" },
		roof = "thatch", wall = "adobe", balcony = nil, layout = "organic", plaza = "market",
		street = { "red_earth", "red_earth", "gravel", "flagstone", "paved" }, lamp = "torch", ground = "red_earth", weatherGround = "monsoon_mud",
		signature = { "아라비아고무 시장", "가죽 공방", "깃털 선창" }, facade = { 195, 147, 111 }, roofTint = { 118, 94, 76 },
		reflow = { lane = 8, plaza = -5, side = -1, landmarkX = 4, landmarkZ = -4, district = 1, facility = 5 } },

	-- [항구별 재배치 119~181] salvador: 지시서 건축·기후·시장·방문 구역에 따른 개별 배치.
	salvador = { landmark = { id = "lm_salvador_cathedral", name = "살바도르 Baroque colonial cathedral facade with twin towers", kind = "cathedral", fallback = "none" },
		roof = "flat", wall = "stucco", balcony = "iron", layout = "grid", plaza = "parade",
		street = { "sand", "dirt", "gravel", "cobble", "paved" }, lamp = "oil_lantern", ground = "sand", weatherGround = "monsoon_mud",
		signature = { "설탕 시장", "브라질목 공방", "금 선창" }, facade = { 238, 215, 171 }, roofTint = { 182, 90, 77 },
		reflow = { lane = -8, plaza = -8, side = -1, landmarkX = 3, landmarkZ = -6, district = -1, facility = 1 } },

	-- [항구별 재배치 119~181] san_francisco: 지시서 건축·기후·시장·방문 구역에 따른 개별 배치.
	san_francisco = { landmark = { id = "lm_san_francisco_fort", name = "샌프란시스코 stone fortress tower with onion or needle spire", kind = "fort", fallback = "none" },
		roof = "hip", wall = "stone", balcony = nil, layout = "terrace", plaza = "parade",
		street = { "dirt", "gravel", "cobble", "flagstone", "paved" }, lamp = "oil_lantern", ground = "grass", weatherGround = "puddles",
		signature = { "모피 시장", "물개가죽 공방", "목재 선창" }, facade = { 185, 169, 164 }, roofTint = { 91, 88, 90 },
		reflow = { lane = 9, plaza = -11, side = 1, landmarkX = 1, landmarkZ = -8, district = -5, facility = 4 } },

	-- [항구별 재배치 119~181] san_juan: 지시서 건축·기후·시장·방문 구역에 따른 개별 배치.
	san_juan = { landmark = { id = "lm_san_juan_cathedral", name = "산후안 Baroque colonial cathedral facade with twin towers", kind = "cathedral", fallback = "none" },
		roof = "flat", wall = "stucco", balcony = "iron", layout = "grid", plaza = "parade",
		street = { "sand", "dirt", "gravel", "cobble", "paved" }, lamp = "oil_lantern", ground = "sand", weatherGround = "monsoon_mud",
		signature = { "설탕 시장", "럼주 공방", "설탕 선창" }, facade = { 234, 211, 192 }, roofTint = { 182, 107, 72 },
		reflow = { lane = 7, plaza = -4, side = 1, landmarkX = -3, landmarkZ = 6, district = -7, facility = 6 } },

	-- [항구별 재배치 119~181] santo_domingo: 지시서 건축·기후·시장·방문 구역에 따른 개별 배치.
	santo_domingo = { landmark = { id = "lm_santo_domingo_cathedral", name = "산토도밍고 Baroque colonial cathedral facade with twin towers", kind = "cathedral", fallback = "none" },
		roof = "flat", wall = "stucco", balcony = "iron", layout = "grid", plaza = "parade",
		street = { "sand", "dirt", "gravel", "cobble", "paved" }, lamp = "oil_lantern", ground = "sand", weatherGround = "monsoon_mud",
		signature = { "설탕 시장", "가죽 공방", "마호가니 선창" }, facade = { 235, 208, 176 }, roofTint = { 179, 107, 74 },
		reflow = { lane = 5, plaza = -1, side = 1, landmarkX = 3, landmarkZ = -6, district = -4, facility = 6 } },

	-- [항구별 재배치 119~181] sao_tome: 지시서 건축·기후·시장·방문 구역에 따른 개별 배치.
	sao_tome = { landmark = { id = "lm_sao_tome_mosque", name = "상투메 mud-brick mosque with wooden torons or coastal castle", kind = "mosque", fallback = "none" },
		roof = "thatch", wall = "adobe", balcony = nil, layout = "organic", plaza = "market",
		street = { "red_earth", "red_earth", "gravel", "flagstone", "paved" }, lamp = "torch", ground = "red_earth", weatherGround = "monsoon_mud",
		signature = { "설탕 시장", "설탕 공방", "설탕 선창" }, facade = { 188, 149, 104 }, roofTint = { 120, 88, 61 },
		reflow = { lane = 6, plaza = 12, side = 1, landmarkX = -3, landmarkZ = 6, district = 12, facility = 6 } },

	-- [항구별 재배치 119~181] shanghai: 지시서 건축·기후·시장·방문 구역에 따른 개별 배치.
	shanghai = { landmark = { id = "lm_shanghai_city_gate", name = "상하이 multi-storey pagoda or city gate tower", kind = "city_gate", fallback = "none" },
		roof = "eave", wall = "brick", balcony = "wood_lattice", layout = "grid", plaza = "quay",
		street = { "dirt", "gravel", "flagstone", "flagstone", "paved" }, lamp = "paper_lantern", ground = "grass", weatherGround = "puddles",
		signature = { "비단 시장", "면화 공방", "차 선창" }, facade = { 172, 162, 160 }, roofTint = { 66, 75, 68 },
		reflow = { lane = -11, plaza = -10, side = 1, landmarkX = -6, landmarkZ = 3, district = -5, facility = 6 } },

	-- [항구별 재배치 119~181] singapore: 지시서 건축·기후·시장·방문 구역에 따른 개별 배치.
	singapore = { landmark = { id = "lm_singapore_pagoda", name = "싱가포르 stupa/pagoda or tiered-roof royal hall", kind = "pagoda", fallback = "none" },
		roof = "thatch", wall = "wood", balcony = "wood_lattice", layout = "organic", plaza = "market",
		street = { "mud", "dirt", "gravel", "plank", "paved" }, lamp = "paper_lantern", ground = "mud", weatherGround = "monsoon_mud",
		signature = { "후추 시장", "육두구 공방", "정향 선창" }, facade = { 171, 138, 108 }, roofTint = { 122, 89, 51 },
		reflow = { lane = 4, plaza = -8, side = -1, landmarkX = -5, landmarkZ = 4, district = -1, facility = 5 } },

	-- [항구별 재배치 119~181] sitka: 지시서 건축·기후·시장·방문 구역에 따른 개별 배치.
	sitka = { landmark = { id = "lm_sitka_church", name = "싯카 tall wooden stave-style church or copper-spired tower", kind = "church", fallback = "none" },
		roof = "gable", wall = "wood", balcony = nil, layout = "organic", plaza = "quay",
		street = { "dirt", "gravel", "gravel", "cobble", "paved" }, lamp = "oil_lantern", ground = "snowmelt", weatherGround = "snow",
		signature = { "모피 시장", "물개가죽 공방", "생선 선창" }, facade = { 224, 205, 127 }, roofTint = { 76, 109, 100 },
		reflow = { lane = -1, plaza = 9, side = -1, landmarkX = -3, landmarkZ = 5, district = -2, facility = 3 } },

	-- [항구별 재배치 119~181] smyrna: 지시서 건축·기후·시장·방문 구역에 따른 개별 배치.
	smyrna = { landmark = { id = "lm_smyrna_mosque", name = "이즈미르 domed mosque with slender pencil minarets", kind = "mosque", fallback = "none" },
		roof = "dome", wall = "stone", balcony = "mashrabiya", layout = "terrace", plaza = "temple_court",
		street = { "dirt", "gravel", "cobble", "flagstone", "flagstone" }, lamp = "mosque_lamp", ground = "grass", weatherGround = "puddles",
		signature = { "비단 시장", "향신료 공방", "올리브유 선창" }, facade = { 204, 185, 158 }, roofTint = { 160, 102, 84 },
		reflow = { lane = 0, plaza = -11, side = -1, landmarkX = 0, landmarkZ = 8, district = 12, facility = 5 } },

	-- [항구별 재배치 119~181] split: 지시서 건축·기후·시장·방문 구역에 따른 개별 배치.
	split = { landmark = { id = "lm_split_campanile", name = "스플리트 brick campanile beside a domed church", kind = "campanile", fallback = "none" },
		roof = "hip", wall = "stucco", balcony = "loggia", layout = "terrace", plaza = "fountain",
		street = { "dirt", "flagstone", "flagstone", "flagstone", "flagstone" }, lamp = "oil_lantern", ground = "grass", weatherGround = "puddles",
		signature = { "포도주 시장", "올리브유 공방", "소금 선창" }, facade = { 230, 192, 141 }, roofTint = { 165, 95, 54 },
		reflow = { lane = 1, plaza = 5, side = -1, landmarkX = 4, landmarkZ = -5, district = -2, facility = 5 } },

	-- [항구별 재배치 119~181] st_helena: 지시서 건축·기후·시장·방문 구역에 따른 개별 배치.
	st_helena = { landmark = { id = "lm_st_helena_mosque", name = "세인트헬레나 mud-brick mosque with wooden torons or coastal castle", kind = "mosque", fallback = "none" },
		roof = "thatch", wall = "adobe", balcony = nil, layout = "organic", plaza = "market",
		street = { "red_earth", "red_earth", "gravel", "flagstone", "paved" }, lamp = "torch", ground = "red_earth", weatherGround = "monsoon_mud",
		signature = { "생선 시장", "소금 공방", "생선 선창" }, facade = { 176, 150, 108 }, roofTint = { 113, 80, 55 },
		reflow = { lane = 12, plaza = 1, side = 1, landmarkX = 7, landmarkZ = -2, district = 7, facility = 4 } },

	-- [항구별 재배치 119~181] st_johns: 지시서 건축·기후·시장·방문 구역에 따른 개별 배치.
	st_johns = { landmark = { id = "lm_st_johns_fort", name = "세인트존스 stone fortress tower with onion or needle spire", kind = "fort", fallback = "none" },
		roof = "hip", wall = "stone", balcony = nil, layout = "terrace", plaza = "parade",
		street = { "dirt", "gravel", "cobble", "flagstone", "paved" }, lamp = "oil_lantern", ground = "grass", weatherGround = "puddles",
		signature = { "생선 시장", "모피 공방", "생선 선창" }, facade = { 179, 175, 151 }, roofTint = { 89, 98, 98 },
		reflow = { lane = 11, plaza = -14, side = -1, landmarkX = -6, landmarkZ = 2, district = 4, facility = 3 } },

	-- [항구별 재배치 119~181] st_petersburg: 지시서 건축·기후·시장·방문 구역에 따른 개별 배치.
	st_petersburg = { landmark = { id = "lm_st_petersburg_fort", name = "상트페테르부르크 stone fortress tower with onion or needle spire", kind = "fort", fallback = "none" },
		roof = "hip", wall = "stone", balcony = nil, layout = "terrace", plaza = "parade",
		street = { "dirt", "gravel", "cobble", "flagstone", "paved" }, lamp = "oil_lantern", ground = "snowmelt", weatherGround = "snow",
		signature = { "모피 시장", "목재 공방", "철 선창" }, facade = { 175, 176, 156 }, roofTint = { 74, 105, 109 },
		reflow = { lane = 6, plaza = -12, side = 1, landmarkX = -1, landmarkZ = 7, district = 3, facility = 4 } },

	-- [항구별 재배치 119~181] surat: 지시서 건축·기후·시장·방문 구역에 따른 개별 배치.
	surat = { landmark = { id = "lm_surat_landmark", name = "수라트 Hindu temple gateway with tiered roof or Indo-Islamic domed tomb", kind = "landmark", fallback = "none" },
		roof = "eave", wall = "plaster", balcony = "wood_lattice", layout = "organic", plaza = "market",
		street = { "red_earth", "red_earth", "gravel", "flagstone", "paved" }, lamp = "oil_lantern", ground = "grass", weatherGround = "monsoon_mud",
		signature = { "면화 시장", "남색염료 공방", "비단 선창" }, facade = { 190, 146, 101 }, roofTint = { 148, 88, 60 },
		reflow = { lane = -11, plaza = 7, side = 1, landmarkX = 6, landmarkZ = -2, district = 2, facility = 4 } },

	-- [항구별 재배치 119~181] suva: 지시서 건축·기후·시장·방문 구역에 따른 개별 배치.
	suva = { landmark = { id = "lm_suva_meeting_house", name = "수바 great meeting house with carved posts", kind = "meeting_house", fallback = "none" },
		roof = "thatch", wall = "wood", balcony = nil, layout = "organic", plaza = "quay",
		street = { "sand", "sand", "gravel", "plank", "paved" }, lamp = "torch", ground = "sand", weatherGround = "monsoon_mud",
		signature = { "백단향 시장", "진주조개 공방", "백단향 선창" }, facade = { 186, 154, 128 }, roofTint = { 138, 111, 72 },
		reflow = { lane = 2, plaza = -9, side = 1, landmarkX = 7, landmarkZ = -1, district = -11, facility = 2 } },

	-- [항구별 재배치 119~181] syracuse: 지시서 건축·기후·시장·방문 구역에 따른 개별 배치.
	syracuse = { landmark = { id = "lm_syracuse_campanile", name = "시라쿠사 brick campanile beside a domed church", kind = "campanile", fallback = "none" },
		roof = "hip", wall = "stucco", balcony = "loggia", layout = "terrace", plaza = "fountain",
		street = { "dirt", "flagstone", "flagstone", "flagstone", "flagstone" }, lamp = "oil_lantern", ground = "grass", weatherGround = "puddles",
		signature = { "올리브유 시장", "포도주 공방", "소금 선창" }, facade = { 230, 208, 192 }, roofTint = { 168, 105, 72 },
		reflow = { lane = 2, plaza = -7, side = 1, landmarkX = 5, landmarkZ = -3, district = 5, facility = 2 } },

	-- [항구별 재배치 119~181] tahiti: 지시서 건축·기후·시장·방문 구역에 따른 개별 배치.
	tahiti = { landmark = { id = "lm_tahiti_meeting_house", name = "파페에테 great meeting house with carved posts", kind = "meeting_house", fallback = "none" },
		roof = "thatch", wall = "wood", balcony = nil, layout = "organic", plaza = "quay",
		street = { "sand", "sand", "gravel", "plank", "paved" }, lamp = "torch", ground = "sand", weatherGround = "monsoon_mud",
		signature = { "진주조개 시장", "백단향 공방", "진주조개 선창" }, facade = { 185, 166, 119 }, roofTint = { 131, 92, 73 },
		reflow = { lane = 8, plaza = 2, side = 1, landmarkX = -5, landmarkZ = 3, district = -1, facility = 6 } },

	-- [항구별 재배치 119~181] tainan: 지시서 건축·기후·시장·방문 구역에 따른 개별 배치.
	tainan = { landmark = { id = "lm_tainan_city_gate", name = "타이난 multi-storey pagoda or city gate tower", kind = "city_gate", fallback = "none" },
		roof = "eave", wall = "brick", balcony = "wood_lattice", layout = "grid", plaza = "quay",
		street = { "dirt", "gravel", "flagstone", "flagstone", "paved" }, lamp = "paper_lantern", ground = "grass", weatherGround = "monsoon_mud",
		signature = { "설탕 시장", "쌀 공방", "장뇌 선창" }, facade = { 164, 159, 143 }, roofTint = { 56, 79, 84 },
		reflow = { lane = -8, plaza = -10, side = 1, landmarkX = -8, landmarkZ = 1, district = -3, facility = 4 } },

	-- [항구별 재배치 119~181] tallinn: 지시서 건축·기후·시장·방문 구역에 따른 개별 배치.
	tallinn = { landmark = { id = "lm_tallinn_city_gate", name = "탈린 brick Gothic city gate (Holstentor-style) with twin towers", kind = "city_gate", fallback = "none" },
		roof = "gable", wall = "brick", balcony = nil, layout = "grid", plaza = "market",
		street = { "dirt", "cobble", "cobble", "cobble", "paved" }, lamp = "oil_lantern", ground = "snowmelt", weatherGround = "snow",
		signature = { "목재 시장", "모피 공방", "생선 선창" }, facade = { 166, 115, 97 }, roofTint = { 89, 78, 76 },
		reflow = { lane = 6, plaza = -8, side = -1, landmarkX = 1, landmarkZ = -7, district = -3, facility = 1 } },

	-- [항구별 재배치 119~181] tangier: 지시서 건축·기후·시장·방문 구역에 따른 개별 배치.
	tangier = { landmark = { id = "lm_tangier_mosque", name = "탕헤르 mosque with square minaret and courtyard", kind = "mosque", fallback = "none" },
		roof = "flat", wall = "adobe", balcony = "mashrabiya", layout = "organic", plaza = "market",
		street = { "sand", "dirt", "gravel", "flagstone", "flagstone" }, lamp = "mosque_lamp", ground = "sand", weatherGround = "dust",
		signature = { "올리브유 시장", "소금 공방", "생선 선창" }, facade = { 221, 186, 157 }, roofTint = { 158, 136, 96 },
		reflow = { lane = -6, plaza = -8, side = -1, landmarkX = 4, landmarkZ = -5, district = -11, facility = 5 } },

	-- [항구별 재배치 119~181] ternate: 지시서 건축·기후·시장·방문 구역에 따른 개별 배치.
	ternate = { landmark = { id = "lm_ternate_pagoda", name = "테르나테 stupa/pagoda or tiered-roof royal hall", kind = "pagoda", fallback = "none" },
		roof = "thatch", wall = "wood", balcony = "wood_lattice", layout = "organic", plaza = "market",
		street = { "mud", "dirt", "gravel", "plank", "paved" }, lamp = "paper_lantern", ground = "mud", weatherGround = "monsoon_mud",
		signature = { "정향 시장", "육두구 공방", "용연향 선창" }, facade = { 193, 160, 119 }, roofTint = { 135, 95, 57 },
		reflow = { lane = 2, plaza = -8, side = 1, landmarkX = 2, landmarkZ = -7, district = 2, facility = 4 } },

	-- [항구별 재배치 119~181] thessaloniki: 지시서 건축·기후·시장·방문 구역에 따른 개별 배치.
	thessaloniki = { landmark = { id = "lm_thessaloniki_mosque", name = "테살로니키 domed mosque with slender pencil minarets", kind = "mosque", fallback = "none" },
		roof = "dome", wall = "stone", balcony = "mashrabiya", layout = "terrace", plaza = "temple_court",
		street = { "dirt", "gravel", "cobble", "flagstone", "flagstone" }, lamp = "mosque_lamp", ground = "grass", weatherGround = "puddles",
		signature = { "비단 시장", "양모 공방", "건포도 선창" }, facade = { 219, 183, 156 }, roofTint = { 147, 107, 90 },
		reflow = { lane = 11, plaza = -2, side = -1, landmarkX = -4, landmarkZ = 5, district = 0, facility = 5 } },

	-- [항구별 재배치 119~181] tianjin: 지시서 건축·기후·시장·방문 구역에 따른 개별 배치.
	tianjin = { landmark = { id = "lm_tianjin_city_gate", name = "톈진 multi-storey pagoda or city gate tower", kind = "city_gate", fallback = "none" },
		roof = "eave", wall = "brick", balcony = "wood_lattice", layout = "grid", plaza = "quay",
		street = { "dirt", "gravel", "flagstone", "flagstone", "paved" }, lamp = "paper_lantern", ground = "grass", weatherGround = "puddles",
		signature = { "옥 시장", "인삼 공방", "비단 선창" }, facade = { 177, 155, 139 }, roofTint = { 66, 72, 77 },
		reflow = { lane = 11, plaza = -3, side = 1, landmarkX = 3, landmarkZ = -6, district = -10, facility = 4 } },

	-- [항구별 재배치 119~181] toulon: 지시서 건축·기후·시장·방문 구역에 따른 개별 배치.
	toulon = { landmark = { id = "lm_toulon_fort", name = "툴롱 Gothic cathedral spire or Vauban star fort", kind = "fort", fallback = "none" },
		roof = "hip", wall = "stone", balcony = "iron", layout = "terrace", plaza = "fountain",
		street = { "dirt", "gravel", "cobble", "flagstone", "paved" }, lamp = "oil_lantern", ground = "grass", weatherGround = "puddles",
		signature = { "포도주 시장", "소금 공방", "올리브유 선창" }, facade = { 224, 217, 173 }, roofTint = { 158, 107, 76 },
		reflow = { lane = -12, plaza = 1, side = 1, landmarkX = 3, landmarkZ = -5, district = 12, facility = 2 } },

	-- [항구별 재배치 119~181] trieste: 지시서 건축·기후·시장·방문 구역에 따른 개별 배치.
	trieste = { landmark = { id = "lm_trieste_campanile", name = "트리에스테 brick campanile beside a domed church", kind = "campanile", fallback = "none" },
		roof = "hip", wall = "stucco", balcony = "loggia", layout = "terrace", plaza = "fountain",
		street = { "dirt", "flagstone", "flagstone", "flagstone", "flagstone" }, lamp = "oil_lantern", ground = "grass", weatherGround = "puddles",
		signature = { "유리 시장", "소금 공방", "포도주 선창" }, facade = { 237, 186, 139 }, roofTint = { 167, 101, 48 },
		reflow = { lane = 11, plaza = -14, side = -1, landmarkX = -3, landmarkZ = 6, district = 10, facility = 3 } },

	-- [항구별 재배치 119~181] tripoli: 지시서 건축·기후·시장·방문 구역에 따른 개별 배치.
	tripoli = { landmark = { id = "lm_tripoli_mosque", name = "트리폴리 domed mosque with slender pencil minarets", kind = "mosque", fallback = "none" },
		roof = "dome", wall = "stone", balcony = "mashrabiya", layout = "terrace", plaza = "temple_court",
		street = { "dirt", "gravel", "cobble", "flagstone", "flagstone" }, lamp = "mosque_lamp", ground = "grass", weatherGround = "puddles",
		signature = { "올리브유 시장", "소금 공방", "대추야자 선창" }, facade = { 212, 190, 170 }, roofTint = { 162, 103, 83 },
		reflow = { lane = -12, plaza = -4, side = 1, landmarkX = -7, landmarkZ = 2, district = 9, facility = 6 } },

	-- [항구별 재배치 119~181] tunis: 지시서 건축·기후·시장·방문 구역에 따른 개별 배치.
	tunis = { landmark = { id = "lm_tunis_mosque", name = "튀니스 domed mosque with slender pencil minarets", kind = "mosque", fallback = "none" },
		roof = "dome", wall = "stone", balcony = "mashrabiya", layout = "terrace", plaza = "temple_court",
		street = { "dirt", "gravel", "cobble", "flagstone", "flagstone" }, lamp = "mosque_lamp", ground = "grass", weatherGround = "puddles",
		signature = { "올리브유 시장", "소금 공방", "생선 선창" }, facade = { 212, 190, 175 }, roofTint = { 145, 108, 79 },
		reflow = { lane = 3, plaza = -1, side = 1, landmarkX = 4, landmarkZ = -4, district = 7, facility = 2 } },

	-- [항구별 재배치 119~181] valencia: 지시서 건축·기후·시장·방문 구역에 따른 개별 배치.
	valencia = { landmark = { id = "lm_valencia_fort", name = "발렌시아 bell tower over a cathedral or Moorish-era fortress", kind = "fort", fallback = "none" },
		roof = "hip", wall = "stucco", balcony = "iron", layout = "terrace", plaza = "fountain",
		street = { "dirt", "gravel", "cobble", "flagstone", "paved" }, lamp = "oil_lantern", ground = "grass", weatherGround = "puddles",
		signature = { "올리브유 시장", "비단 공방", "소금 선창" }, facade = { 241, 220, 204 }, roofTint = { 173, 110, 70 },
		reflow = { lane = 0, plaza = 5, side = 1, landmarkX = -2, landmarkZ = 6, district = -10, facility = 6 } },

	-- [항구별 재배치 119~181] valparaiso: 지시서 건축·기후·시장·방문 구역에 따른 개별 배치.
	valparaiso = { landmark = { id = "lm_valparaiso_cathedral", name = "발파라이소 Baroque colonial cathedral facade with twin towers", kind = "cathedral", fallback = "none" },
		roof = "flat", wall = "stucco", balcony = "iron", layout = "grid", plaza = "parade",
		street = { "sand", "dirt", "gravel", "cobble", "paved" }, lamp = "oil_lantern", ground = "sand", weatherGround = "puddles",
		signature = { "초석 시장", "구리 공방", "양모 선창" }, facade = { 233, 219, 179 }, roofTint = { 176, 99, 78 },
		reflow = { lane = 9, plaza = -11, side = -1, landmarkX = 7, landmarkZ = -2, district = 10, facility = 3 } },

	-- [항구별 재배치 119~181] vancouver: 지시서 건축·기후·시장·방문 구역에 따른 개별 배치.
	vancouver = { landmark = { id = "lm_vancouver_church", name = "밴쿠버 tall wooden stave-style church or copper-spired tower", kind = "church", fallback = "none" },
		roof = "gable", wall = "wood", balcony = nil, layout = "organic", plaza = "quay",
		street = { "dirt", "gravel", "gravel", "cobble", "paved" }, lamp = "oil_lantern", ground = "grass", weatherGround = "puddles",
		signature = { "모피 시장", "목재 공방", "생선 선창" }, facade = { 176, 77, 59 }, roofTint = { 89, 82, 70 },
		reflow = { lane = -3, plaza = -9, side = 1, landmarkX = -6, landmarkZ = 3, district = -12, facility = 2 } },

	-- [항구별 재배치 119~181] visby: 지시서 건축·기후·시장·방문 구역에 따른 개별 배치.
	visby = { landmark = { id = "lm_visby_fort", name = "비스뷔 stone fortress tower with onion or needle spire", kind = "fort", fallback = "none" },
		roof = "hip", wall = "stone", balcony = nil, layout = "terrace", plaza = "parade",
		street = { "dirt", "gravel", "cobble", "flagstone", "paved" }, lamp = "oil_lantern", ground = "snowmelt", weatherGround = "snow",
		signature = { "생선 시장", "소금 공방", "양모 선창" }, facade = { 175, 163, 163 }, roofTint = { 95, 96, 103 },
		reflow = { lane = -5, plaza = 10, side = 1, landmarkX = -5, landmarkZ = 4, district = -10, facility = 6 } },

}

local M = {}
M.Tier = Tier
M.Ports = P
M.ROOFS = { gable = true, flat = true, dome = true, eave = true, hip = true, thatch = true }
M.WALLS = { brick = true, timber = true, stone = true, stucco = true, coral = true, adobe = true, wood = true, plaster = true }
M.LAYOUTS = { grid = true, canal = true, terrace = true, radial = true, organic = true }
M.PLAZAS = { fountain = true, market = true, temple_court = true, quay = true, parade = true }
M.STREETS = { dirt = true, gravel = true, cobble = true, flagstone = true, paved = true, plank = true, brick = true, sand = true, red_earth = true, mud = true }
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
	mud = { "Mud", 105, 89, 70 },
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

-- [전체 항구 고유 외형] 항구별 지시서가 등록된 181개 항구는 지정 색을 그대로 쓰고,
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
