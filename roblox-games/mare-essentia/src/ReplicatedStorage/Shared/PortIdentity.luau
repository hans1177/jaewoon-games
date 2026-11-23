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

-- [전체 항구 고유 외형] 항구별 지시서가 등록된 33개 항구는 지정 색을 그대로 쓰고,
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
