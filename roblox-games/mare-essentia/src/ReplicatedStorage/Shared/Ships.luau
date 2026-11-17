--!strict
-- 선박 데이터. steam = true 인 배는 석탄(화물칸의 coal)을 태운다.

export type ShipDef = {
	id: string,
	name: string,
	steam: boolean,
	price: number,
	cargo: number, -- 화물칸
	speed: number, -- 노트
	hull: number, -- 내구도
	cannons: number,
	crew: number, -- 최대 선원
	fuelPerDay: number, -- 증기선 하루 석탄 소모
	techReq: string?, -- 구매에 필요한 기술
	class: number, -- 배 등급 (1~4). 등급 2 이상은 항만청 면허가 필요하다
	summary: string,
	regions: { string }?, -- 이 문화권(CultureRegions)의 조선소에서만 살 수 있다 (없으면 어디서나)
	nation: string?, -- 이 나라 주인공만 살 수 있는 전용 배 (어느 조선소에서나)
	visual: string?, -- 입체 모델·그림을 빌려 올 기본 배 id
	tint: { number }?, -- 선체 색 {r,g,b} (지역·나라의 특징)
	rowed: boolean?, -- 노로 움직이는 배: 바람이 없어도 속도를 잃지 않는다
	-- 선박의 역할별 고유 운용 성능. 기존 저장 키·기본 능력치는 변경하지 않는다.
	trait: { role: string, weak: string, sail: number?, wind: number?, supplies: number?,
		cargo: number?, cannon: number?, melee: number?, storm: number?, repair: number?,
		tariff: number?, explore: number?, long: number? }?,
	specialPort: string?, -- 미지 대륙 선박은 기존 태평양 외항의 비밀 조선소에서만 등장
	minAdventure: number?, -- 기존 모험 경험/해역 해금 요구치
	newRegional: boolean?, -- 지역 판매 신설 선박 여부: 모바일 진열에서 해당 조선소만 표시
}

local Ships: { [string]: ShipDef } = {
	caravel = {
		id = "caravel", class = 1, name = "캐러벨", steam = false, price = 0,
		cargo = 20, speed = 7, hull = 100, cannons = 4, crew = 20, fuelPerDay = 0,
		summary = "시작 배. 균형형 범선",
	},
	fluyt = {
		id = "fluyt", class = 1, name = "플루트선", steam = false, price = 1800,
		cargo = 45, speed = 6, hull = 120, cannons = 4, crew = 15, fuelPerDay = 0,
		summary = "화물이 많은 교역형 범선",
	},
	frigate = {
		id = "frigate", class = 2, name = "프리깃", steam = false, price = 5000,
		cargo = 25, speed = 9, hull = 170, cannons = 12, crew = 36, fuelPerDay = 0,
		summary = "빠르고 포가 많은 전투형 범선",
	},
	galleon = {
		id = "galleon", class = 2, name = "갈레온", steam = false, price = 6000,
		cargo = 40, speed = 6, hull = 220, cannons = 10, crew = 38, fuelPerDay = 0,
		summary = "튼튼한 대형 범선",
	},

	-- ───── 지역 전통 배 (그 문화권 조선소에서만 판매) ─────
	galley = { id = "galley", class = 1, name = "갤리선", steam = false, price = 2200, cargo = 28, speed = 8, hull = 110, cannons = 6, crew = 40, fuelPerDay = 0,
		regions = { "mediterranean" }, visual = "caravel", tint = { 150, 60, 40 }, rowed = true, summary = "[지중해] 노로 움직이는 배. 무풍에도 빠르고 노잡이가 많다" },
	xebec = { id = "xebec", class = 2, name = "제벡", steam = false, price = 4200, cargo = 30, speed = 9, hull = 150, cannons = 10, crew = 34, fuelPerDay = 0,
		regions = { "mediterranean", "red_sea" }, visual = "frigate", tint = { 70, 90, 120 }, summary = "[지중해·홍해] 삼각돛과 노를 함께 쓰는 날쌘 해적·상선" },
	cog = { id = "cog", class = 1, name = "코그선", steam = false, price = 1500, cargo = 50, speed = 5, hull = 130, cannons = 3, crew = 14, fuelPerDay = 0,
		regions = { "north_sea" }, visual = "fluyt", tint = { 96, 82, 60 }, summary = "[북해] 둥글고 깊은 짐배. 느리지만 화물이 많다" },
	carrack = { id = "carrack", class = 2, name = "캐랙", steam = false, price = 5200, cargo = 62, speed = 5, hull = 200, cannons = 8, crew = 36, fuelPerDay = 0,
		regions = { "atlantic_europe" }, visual = "galleon", tint = { 100, 64, 40 }, summary = "[대서양 유럽] 높은 선수루의 대형 원양 화물선" },
	brigantine = { id = "brigantine", class = 1, name = "브리간틴", steam = false, price = 2600, cargo = 32, speed = 8, hull = 105, cannons = 6, crew = 22, fuelPerDay = 0,
		regions = { "americas" }, visual = "caravel", tint = { 80, 100, 70 }, summary = "[아메리카] 카리브해를 누비는 빠르고 다재다능한 배" },
	dhow = { id = "dhow", class = 1, name = "다우선", steam = false, price = 1400, cargo = 36, speed = 7, hull = 90, cannons = 2, crew = 14, fuelPerDay = 0,
		regions = { "red_sea", "south_asia", "east_africa" }, visual = "caravel", tint = { 190, 160, 110 }, summary = "[인도양] 삼각돛 하나로 계절풍을 타고 먼 거리를 간다" },
	baghlah = { id = "baghlah", class = 2, name = "바글라", steam = false, price = 3600, cargo = 56, speed = 6, hull = 140, cannons = 6, crew = 28, fuelPerDay = 0,
		regions = { "red_sea", "south_asia" }, visual = "fluyt", tint = { 160, 120, 70 }, summary = "[홍해·인도] 큰 다우. 향신료와 커피를 가득 싣는다" },
	mtepe = { id = "mtepe", class = 1, name = "음테페", steam = false, price = 1200, cargo = 30, speed = 7, hull = 80, cannons = 1, crew = 12, fuelPerDay = 0,
		regions = { "east_africa" }, visual = "caravel", tint = { 205, 175, 120 }, summary = "[동아프리카] 못 없이 끈으로 엮어 만든 스와힐리 배" },
	pirogue = { id = "pirogue", class = 1, name = "대형 카누", steam = false, price = 900, cargo = 22, speed = 7, hull = 70, cannons = 1, crew = 16, fuelPerDay = 0,
		regions = { "west_africa" }, visual = "caravel", tint = { 130, 90, 50 }, summary = "[서아프리카] 통나무를 파서 만든 연안 카누. 얕은 강어귀에 강하다" },
	junk = { id = "junk", class = 2, name = "정크선", steam = false, price = 3800, cargo = 58, speed = 6, hull = 190, cannons = 6, crew = 30, fuelPerDay = 0,
		regions = { "east_asia" }, visual = "galleon", tint = { 140, 40, 30 }, summary = "[동아시아] 칸막이 선창과 대나무 돛. 구멍이 나도 잘 가라앉지 않는다" },
	geobukseon = { id = "geobukseon", class = 2, name = "거북선", steam = false, price = 5500, cargo = 15, speed = 6, hull = 260, cannons = 14, crew = 60, fuelPerDay = 0,
		regions = { "east_asia" }, visual = "galleon", tint = { 70, 76, 70 }, rowed = true, summary = "[동아시아] 지붕을 씌운 돌격선. 단단하고 포가 많다" },
	prau = { id = "prau", class = 1, name = "프라우", steam = false, price = 1100, cargo = 18, speed = 10, hull = 70, cannons = 2, crew = 10, fuelPerDay = 0,
		regions = { "southeast_asia" }, visual = "caravel", tint = { 200, 120, 60 }, summary = "[동남아] 한쪽에 부재를 단 날렵한 배. 아주 빠르다" },
	pattamar = { id = "pattamar", class = 1, name = "파타마르", steam = false, price = 1900, cargo = 34, speed = 8, hull = 95, cannons = 3, crew = 16, fuelPerDay = 0,
		regions = { "south_asia" }, visual = "caravel", tint = { 120, 150, 110 }, summary = "[인도 서해안] 말라바르의 빠른 연안 상선" },

	-- ───── 나라 전용 배 (그 나라 주인공만, 어느 조선소에서나) ─────
	privateer = { id = "privateer", class = 1, name = "사략선", steam = false, price = 2800, cargo = 20, speed = 8, hull = 100, cannons = 8, crew = 24, fuelPerDay = 0,
		nation = "england", visual = "caravel", tint = { 40, 50, 80 }, summary = "[영국 전용] 포가 많은 날쌘 무장 상선" },
	east_indiaman = { id = "east_indiaman", class = 2, name = "동인도선", steam = false, price = 5200, cargo = 70, speed = 5, hull = 190, cannons = 8, crew = 36, fuelPerDay = 0,
		nation = "netherlands", visual = "fluyt", tint = { 60, 70, 100 }, summary = "[네덜란드 전용] 화물이 가장 많은 대형 무역선" },
	corvette = { id = "corvette", class = 1, name = "코르벳", steam = false, price = 3000, cargo = 24, speed = 9, hull = 100, cannons = 8, crew = 26, fuelPerDay = 0,
		nation = "france", visual = "frigate", tint = { 200, 200, 210 }, summary = "[프랑스 전용] 작지만 빠르고 포가 있는 호위선" },
	nau = { id = "nau", class = 2, name = "인도 항로 나우", steam = false, price = 5400, cargo = 66, speed = 6, hull = 210, cannons = 10, crew = 40, fuelPerDay = 0,
		nation = "portugal", visual = "galleon", tint = { 180, 40, 40 }, summary = "[포르투갈 전용] 희망봉을 도는 튼튼한 원양 대형선" },
	kadirga = { id = "kadirga", class = 2, name = "카디르가", steam = false, price = 3800, cargo = 22, speed = 8, hull = 150, cannons = 10, crew = 50, fuelPerDay = 0,
		nation = "ottoman", visual = "frigate", tint = { 120, 30, 40 }, rowed = true, summary = "[오스만 전용] 노잡이가 많은 술탄의 갤리" },
	jahazi = { id = "jahazi", class = 1, name = "자하지", steam = false, price = 1700, cargo = 40, speed = 7, hull = 100, cannons = 3, crew = 18, fuelPerDay = 0,
		nation = "swahili", visual = "fluyt", tint = { 220, 190, 130 }, summary = "[스와힐리 전용] 계절풍을 타는 큰 돛배" },
	kotia = { id = "kotia", class = 1, name = "코티아", steam = false, price = 2000, cargo = 40, speed = 7, hull = 110, cannons = 4, crew = 18, fuelPerDay = 0,
		nation = "malabar", visual = "fluyt", tint = { 110, 140, 90 }, summary = "[말라바르 전용] 후추 무역용 튼튼한 상선" },
	sekibune = { id = "sekibune", class = 1, name = "세키부네", steam = false, price = 2600, cargo = 28, speed = 8, hull = 120, cannons = 6, crew = 36, fuelPerDay = 0,
		nation = "japan", visual = "caravel", tint = { 60, 60, 66 }, rowed = true, summary = "[일본 전용] 방패 판자를 두른 빠른 노선" },
	manila_galleon = { id = "manila_galleon", class = 2, name = "마닐라 갈레온", steam = false, price = 6500, cargo = 85, speed = 5, hull = 240, cannons = 8, crew = 40, fuelPerDay = 0,
		nation = "new_spain", visual = "galleon", tint = { 150, 110, 40 }, summary = "[누에바 에스파냐 전용] 태평양을 건너는 은과 비단의 거대 화물선" },
	paddle_steamer = {
		id = "paddle_steamer", class = 3, name = "외륜 증기선", steam = true, price = 9000,
		cargo = 35, speed = 8, hull = 200, cannons = 10, crew = 34, fuelPerDay = 1, techReq = "steam_paddle",
		summary = "바람을 타지 않는 증기선. 석탄 소모",
	},
	ironclad_frigate = {
		id = "ironclad_frigate", class = 4, name = "철갑 증기 프리깃", steam = true, price = 20000,
		cargo = 30, speed = 10, hull = 380, cannons = 16, crew = 50, fuelPerDay = 2, techReq = "steam_boiler",
		summary = "최강 전투형 증기선. 석탄을 많이 태운다",
	},
}

-- [7대륙 선박 제작설계] 카드배틀 6대륙과 가상 미지의 땅. 실물 3D 원본 확보 전 설계 전용.
-- [항행 고증] 신대륙 주력 1~5단계는 아메리카에서 실제 운용된 대서양·태평양 항해 범선(식민지기 포함).
-- 토착 카누·뗏목은 고유 문화 유산 카드로 존중해 유지하며 원양선으로 오분류하지 않는다. 카드 도감의 기존 토착 선박은 유지.
-- 단계는 역할·규모 구분이며 모든 문화권의 역사적 개발 연대를 뜻하지 않는다.
-- [36척 함종 제작] 일반 6대륙 × 5척 + 신화 제7대륙 6척. 설계 수치는 게임의 구매·보상·저장에 영향 없음.
local BlueprintFactions = {
	{ id="europe", name="유럽" },
	{ id="east_asia", name="동아시아" },
	{ id="new_world", name="신대륙" },
	{ id="middle_east", name="중동" },
	{ id="southeast_asia", name="남·동남아" },
	{ id="africa", name="아프리카" },
	{ id="lost", name="미지의 땅" },
}
local Blueprints = {
	{ id="cog", name="코그선", faction="europe", stage=1, targetLengthStuds=32, targetBeamStuds=12, targetMastHeightStuds=22, era="12~15세기", hull="깊고 둥근 북해 화물선체", rig="중앙 사각돛 1개", deck="선수·선미 방어루", remodel="높은 선루와 둥근 화물창을 전용 메시로 개조", card="eu_04", existingId="cog", sailingZone="북해·연안", proposedEdge=nil },
	{ id="caravel", name="캐러벨", faction="europe", stage=2, targetLengthStuds=34, targetBeamStuds=10, targetMastHeightStuds=28, era="15~16세기", hull="얕은 흘수의 탐사 선체", rig="삼각돛·사각돛 혼합", deck="낮은 선수루", remodel="가벼운 선체와 경사 돛대를 고증 개조", card="eu_01", existingId="caravel", sailingZone="대서양 원양", proposedEdge=nil },
	{ id="carrack", name="캐랙", faction="europe", stage=3, targetLengthStuds=46, targetBeamStuds=16, targetMastHeightStuds=38, era="15~17세기", hull="깊은 대형 원양 선체", rig="앞 사각돛·뒤 삼각돛", deck="높은 선수루·선미루", remodel="깊은 선창·선미루·혼합 범장 개조", card="eu_02", existingId="carrack", sailingZone="대양 횡단", proposedEdge=nil },
	{ id="galleon", name="갈레온", faction="europe", stage=4, targetLengthStuds=52, targetBeamStuds=17, targetMastHeightStuds=42, era="16~18세기", hull="길고 높은 무장 원양 선체", rig="다중 사각돛", deck="양현 함포갑판·후미 지휘부", remodel="포문열·장식 선미·삭구 실물 개조", card="eu_03", existingId="galleon", sailingZone="대양 횡단", proposedEdge=nil },
	{ id="ship_of_line", name="전열함", faction="europe", stage=5, targetLengthStuds=54, targetBeamStuds=17, targetMastHeightStuds=43, era="17~19세기", hull="폭넓은 복층 전투 선체", rig="세 돛대 사각범장", deck="다층 함포갑판", remodel="다층 포문열과 거대 범장을 전용 개조", card="eu_10", existingId=nil, sailingZone="원양 함대", proposedEdge=nil },
	{ id="kobaya", name="고바야", faction="east_asia", stage=1, targetLengthStuds=28, targetBeamStuds=8, targetMastHeightStuds=17, era="16~17세기", hull="가벼운 일본 연안 전투 선체", rig="노·작은 보조돛", deck="경량 방호판", remodel="좁은 노좌와 낮은 선측 개조", card="ea_10", existingId=nil, sailingZone="일본 연안", proposedEdge=nil },
	{ id="sekibune", name="세키부네", faction="east_asia", stage=2, targetLengthStuds=38, targetBeamStuds=11, targetMastHeightStuds=23, era="16~17세기", hull="길고 빠른 일본식 노선", rig="양측 노열·보조돛", deck="병사 갑판·높은 방패판", remodel="일본식 방호판과 노 위치 재구성", card="ea_09", existingId="sekibune", sailingZone="연안·내해", proposedEdge=nil },
	{ id="panokseon", name="판옥선", faction="east_asia", stage=3, targetLengthStuds=42, targetBeamStuds=14, targetMastHeightStuds=25, era="16~17세기", hull="넓은 평저형 목조 전선", rig="다수 노·보조돛", deck="노잡이 하갑판·화포 상갑판", remodel="평저·이층 갑판·화포자리 전용 고증", card="ea_01", existingId=nil, sailingZone="한반도 연안", proposedEdge=nil },
	{ id="geobukseon", name="거북선", faction="east_asia", stage=4, targetLengthStuds=46, targetBeamStuds=16, targetMastHeightStuds=27, era="16세기 말", hull="폭넓고 견고한 평저 전선", rig="다수 노·보조돛", deck="덮개형 전투 갑판", remodel="덮개·용두·측면 포구 구조 전면 개조", card="ea_02", existingId="geobukseon", sailingZone="한반도 연안", proposedEdge=nil },
	{ id="treasure_ship", name="명나라 보선", faction="east_asia", stage=5, targetLengthStuds=54, targetBeamStuds=19, targetMastHeightStuds=44, era="15세기", hull="격벽이 있는 대형 원양 수송선", rig="다중 돛대·댓살 돛", deck="대형 선창·후미 조타부", remodel="중국식 격벽·범장·조타 장치 전용 제작", card="ea_07", existingId=nil, sailingZone="인도양 원양", proposedEdge=nil },
	{ id="bermuda_sloop", name="버뮤다 슬루프", faction="new_world", stage=1, targetLengthStuds=30, targetBeamStuds=9.2, targetMastHeightStuds=25, era="17~18세기", hull="버뮤다 삼나무로 건조한 가볍고 날렵한 대서양 교역 선체", rig="돛대 하나·대형 종범장·선수 삼각돛", deck="작은 화물창·후미 조타갑판", remodel="버뮤다형 슬루프의 선수 선형·돛대·돛 비율을 실물 원본 기준으로 재구성", card=nil, existingId=nil, sailingZone="카리브·대서양 외양", proposedEdge=nil },
	{ id="new_england_ketch", name="뉴잉글랜드 케치", faction="new_world", stage=2, targetLengthStuds=38, targetBeamStuds=12, targetMastHeightStuds=29, era="17세기", hull="튼튼하고 넓은 선체의 대서양 어업·교역용 목조 범선", rig="두 돛대·종범장·선수 보조돛", deck="선수 갑판·갑판 아래 화물창", remodel="17세기 뉴잉글랜드 케치의 선미·폭·두 돛대 배치를 실제 선형대로 검수", card=nil, existingId=nil, sailingZone="북대서양 외양·원양", proposedEdge=nil },
	{ id="chesapeake_schooner", name="체서피크 스쿠너", faction="new_world", stage=3, targetLengthStuds=42, targetBeamStuds=12, targetMastHeightStuds=33, era="18~19세기", hull="북아메리카 동부 해안용 날렵한 이중 돛대 목조 선체", rig="두 돛대의 종범장·선수 삼각돛", deck="교역 화물창·후미 조타석", remodel="체서피크 실존 스쿠너 자료 대조 후 선수 선형·돛대·갑판을 전용 실물 모델로 개조", card=nil, existingId=nil, sailingZone="대서양 연안·외양", proposedEdge=nil },
	{ id="atlantic_brigantine", name="아메리카 브리간틴", faction="new_world", stage=4, targetLengthStuds=46, targetBeamStuds=15, targetMastHeightStuds=36.55, era="17~19세기", hull="북미·카리브 항로용 세장형 목조 범선체", rig="앞돛대 사각돛·뒤돛대 종범장", deck="중앙 화물창·소형 함포갑판", remodel="브리간틴 전용 두 돛대·혼합 범장·선체 원본 개조", card=nil, existingId="brigantine", sailingZone="대서양 원양", proposedEdge=nil },
	{ id="manila_galleon", name="마닐라 갈레온", faction="new_world", stage=5, targetLengthStuds=52, targetBeamStuds=17, targetMastHeightStuds=42, era="16~19세기", hull="누에바 에스파냐–마닐라 장거리 대형 선체", rig="다중 사각돛·후방 삼각돛", deck="대형 은·비단 화물창·상갑판 포문", remodel="실제 원양 갈레온 원본으로 큰 선창·높은 선미루·범장 고증", card=nil, existingId="manila_galleon", sailingZone="태평양 대양 횡단", proposedEdge=nil },
	{ id="zaruk", name="자루크", faction="middle_east", stage=1, targetLengthStuds=26, targetBeamStuds=7, targetMastHeightStuds=18, era="근세 인도양", hull="작고 얕은 어로 선체", rig="소형 삼각돛·노", deck="열린 연안 작업갑판", remodel="곡선 선수·삼각돛 비율 개조", card="me_09", existingId=nil, sailingZone="연안 어로", proposedEdge=nil },
	{ id="sambuk", name="삼부크", faction="middle_east", stage=2, targetLengthStuds=34, targetBeamStuds=10, targetMastHeightStuds=26, era="16~19세기", hull="곡선이 큰 중형 선체", rig="경사 돛대·삼각돛", deck="화물갑판", remodel="돛대 각도·굽은 뱃머리 고증", card="me_04", existingId=nil, sailingZone="홍해·근해", proposedEdge=nil },
	{ id="dhow", name="아라비아 다우선", faction="middle_east", stage=3, targetLengthStuds=38, targetBeamStuds=11.5, targetMastHeightStuds=31, era="중세~19세기", hull="높은 선수·깊은 화물 선체", rig="대형 삼각돛", deck="향신료 선창·선미 조타", remodel="긴 삼각범장·곡선 선미 전용 개조", card="me_01", existingId="dhow", sailingZone="인도양 교역", proposedEdge=nil },
	{ id="baghlah", name="바글라", faction="middle_east", stage=4, targetLengthStuds=44, targetBeamStuds=14.5, targetMastHeightStuds=34, era="18~19세기", hull="크고 넓은 다우 화물선", rig="대형 삼각돛 2매", deck="장식 선미·넓은 화물창", remodel="장식 선미·경사 돛대·적재부 고증", card="me_02", existingId="baghlah", sailingZone="인도양 원양", proposedEdge=nil },
	{ id="oman_boom", name="아라비아 붐 상선", faction="middle_east", stage=5, targetLengthStuds=46, targetBeamStuds=14, targetMastHeightStuds=36, era="18~20세기", hull="돌출 선수와 깊은 인도양 장거리 상선체", rig="경사 돛대 2개·대형 사다리꼴 삼각범", deck="장거리 교역 선창·선미 조타부", remodel="전용 붐 상선의 돌출 선수·특유 선미·돛대 고증", card=nil, existingId=nil, sailingZone="인도양 원양", proposedEdge=nil },
	{ id="prau", name="말레이 프라우", faction="southeast_asia", stage=1, targetLengthStuds=30, targetBeamStuds=9, targetMastHeightStuds=21, era="전통~19세기", hull="낮고 빠른 열도형 선체", rig="비대칭돛·노", deck="측면 부력 부재", remodel="아웃리거와 비대칭돛 고증", card="sa_01", existingId="prau", sailingZone="열도 연안", proposedEdge=nil },
	{ id="pattamar", name="말라바르 쾌속선", faction="southeast_asia", stage=2, targetLengthStuds=36, targetBeamStuds=11, targetMastHeightStuds=28, era="17~19세기", hull="인도 서해안 세장형 선체", rig="경사 범장", deck="화물갑판·후미 조타", remodel="장대형 범장·인도식 선체 개조", card="sa_06", existingId="pattamar", sailingZone="인도 연안·근해", proposedEdge=nil },
	{ id="coracora", name="코라코라 전선", faction="southeast_asia", stage=3, targetLengthStuds=42, targetBeamStuds=10, targetMastHeightStuds=23, era="16~19세기", hull="길고 넓은 다인승 전투선", rig="집단 노·보조돛", deck="양현 노좌·중앙 병력갑판", remodel="열도식 다인승 노열과 지지대 제작", card="sa_05", existingId=nil, sailingZone="열도 사이", proposedEdge=nil },
	{ id="chola_warship", name="촐라 전함", faction="southeast_asia", stage=4, targetLengthStuds=47, targetBeamStuds=14, targetMastHeightStuds=34, era="11~13세기", hull="남인도 원정용 목조 선체", rig="범장·노 병용", deck="병력·보급 공간", remodel="사료 선형 검수 후 선체·범장 개조", card="sa_02", existingId=nil, sailingZone="벵골만 원정", proposedEdge=nil },
	{ id="javanese_jong", name="자바 종 대형 교역선", faction="southeast_asia", stage=5, targetLengthStuds=55, targetBeamStuds=18, targetMastHeightStuds=43, era="14~16세기", hull="여러 판재층과 목재 결구를 사용한 대형 원양 선체", rig="다수 돛대·동남아식 사다리꼴 돛", deck="장거리 향신료 대형 화물창", remodel="실존 자바 종 자료의 목재 결구·선체 비율·범장 검수 후 개조", card="sa_09", existingId=nil, sailingZone="인도양 원양", proposedEdge=nil },
	{ id="nile_papyrus", name="나일 파피루스배", faction="africa", stage=1, targetLengthStuds=24, targetBeamStuds=7, targetMastHeightStuds=14, era="고대~근세", hull="묶은 파피루스 부력 선체", rig="노·소형 돛", deck="가벼운 탑승부", remodel="갈대 다발 실물 메시 확보 필수", card="af_04", existingId=nil, sailingZone="나일강 내륙", proposedEdge=nil },
	{ id="pirogue", name="세네갈 피로그", faction="africa", stage=2, targetLengthStuds=31, targetBeamStuds=7.5, targetMastHeightStuds=14, era="전통~19세기", hull="긴 단목 연안선", rig="집단 노·삿대", deck="열린 어업갑판", remodel="단목 선형·노좌 고증 개조", card="af_06", existingId="pirogue", sailingZone="서아프리카 연안", proposedEdge=nil },
	{ id="mtepe", name="스와힐리 므테페", faction="africa", stage=3, targetLengthStuds=39, targetBeamStuds=12, targetMastHeightStuds=31, era="중세~19세기", hull="봉합한 목조 판재 선체", rig="큰 삼각돛", deck="연안 화물갑판", remodel="봉합식 판재와 삼각범장 전용 고증", card="af_01", existingId="mtepe", sailingZone="동아프리카 연안", proposedEdge=nil },
	{ id="zanzibar_dhow", name="잔지바르 다우선", faction="africa", stage=4, targetLengthStuds=44, targetBeamStuds=12.5, targetMastHeightStuds=35, era="17~19세기", hull="동아프리카 중형 화물선", rig="장대형 삼각돛", deck="향신료 선창·후미 조타", remodel="동아프리카형 선미·삼각돛 개조", card="af_02", existingId=nil, sailingZone="인도양 교역", proposedEdge=nil },
	{ id="zanzibar_jahazi", name="잔지바르 자하즈", faction="africa", stage=5, targetLengthStuds=55, targetBeamStuds=18.8, targetMastHeightStuds=43.55, era="17~19세기", hull="동아프리카 장거리 교역용 깊은 목조 선체", rig="높은 경사 돛대·대형 인도양식 삼각범", deck="대량 화물창·후미 조타부", remodel="스와힐리식 자하즈 실물 선형·선미·범장 전용 고증", card=nil, existingId="jahazi", sailingZone="인도양 원양", proposedEdge=nil },
	{ id="mu_voyager", name="무 대륙 항해선", faction="lost", stage=1, era="가상 1단계", hull="얕고 빠른 태평양 항해 선체", rig="청록 댓살돛·삼각 보조돛", deck="해류 관측갑판", remodel="무 대륙 파도무늬·관측나침반·고유 선체", card="lo_02", existingId=nil, targetLengthStuds=30, targetBeamStuds=9.5, targetMastHeightStuds=22, sailingZone="가상 원양", proposedEdge=nil },
	{ id="mist_seeker", name="안개 해도 탐사선", faction="lost", stage=2, era="가상 2단계", hull="가늘고 빠른 원양 탐사선", rig="낮은 혼합돛", deck="별도 관측실·해도갑판", remodel="안개 관측장치와 길잡이 문양 개조", card="lo_24", existingId=nil, targetLengthStuds=38, targetBeamStuds=11.5, targetMastHeightStuds=27, sailingZone="가상 원양", proposedEdge=0.03 },
	{ id="lemuria_scout", name="레무리아 풍향선", faction="lost", stage=3, era="가상 3단계", hull="폭풍 대응 세장형 선체", rig="경사 삼각돛 다수", deck="보조 조타대·풍향 관측부", remodel="바람 관측대와 가상 문양 개조", card="lo_04", existingId=nil, targetLengthStuds=42, targetBeamStuds=12.5, targetMastHeightStuds=35, sailingZone="가상 원양", proposedEdge=0.04 },
	{ id="atlantis_carrier", name="아틀란티스 탐사 기함", faction="lost", stage=4, era="가상 4단계", hull="넓은 유적 탐사 대형선", rig="복합 범장", deck="유물창·관측 갑판", remodel="청동 장식·고대 문양 선미 개조", card="lo_01", existingId=nil, targetLengthStuds=50, targetBeamStuds=16, targetMastHeightStuds=38, sailingZone="가상 원양", proposedEdge=0.05 },
	{ id="flying_dutchman", name="플라잉 더치맨", faction="lost", stage=5, era="가상 5단계", hull="낡은 무장 원양 범선", rig="손상된 다중 사각돛", deck="파손 포구·선미루", remodel="기존 등록 유령선 모델 기반 고증 개조", card="lo_21", existingId=nil, targetLengthStuds=46, targetBeamStuds=14, targetMastHeightStuds=38, sailingZone="가상 원양", proposedEdge=0.06 },
	{ id="astheria_flagship", name="아스테리아 해도함", faction="lost", stage=6, era="가상 6단계", hull="대형 장거리 미지 탐사선", rig="다중 혼합돛", deck="천문 관측대·최종 해도실", remodel="일곱 해역 문양·고유 돛대 구조 개조", card="lo_25", existingId=nil, targetLengthStuds=56, targetBeamStuds=17, targetMastHeightStuds=45, sailingZone="가상 원양", proposedEdge=0.08 },
}

-- [36척 역할 성능] 설계도 한 척당 고유 주특화·약점. 모든 보정은 기존 서버 책임 함수가 사용한다.
-- 종전 선박의 기초 수치·가격·등급·저장 키는 바꾸지 않는다.
local ShipPerformance = {
	cog = { role = "북해 화물", weak = "기동·백병 약세", cargo = 0.1, sail = -0.05, storm = 0.05, melee = -0.04 },
	caravel = { role = "탐사·역풍", weak = "적재량 약세", wind = 0.08, explore = 0.08, cargo = -0.03 },
	carrack = { role = "원양 장거리", weak = "선회·수리 부담", long = 0.08, supplies = -0.1, repair = 0.06, sail = -0.04 },
	galleon = { role = "포격·호위", weak = "유지비 부담", cannon = 0.06, storm = 0.04, repair = 0.08 },
	ship_of_line = { role = "일제포격", weak = "보급·교역 부담", cannon = 0.1, supplies = 0.15, tariff = -0.02, repair = 0.12 },
	kobaya = { role = "연안 기동", weak = "내구·적재 약세", sail = 0.1, storm = -0.06, cargo = -0.04 },
	sekibune = { role = "접현·노선", weak = "원양 보급 부담", melee = 0.08, wind = 0.05, supplies = 0.07 },
	panokseon = { role = "화포·접현 방어", weak = "원양 속도 약세", cannon = 0.08, storm = 0.06, sail = -0.05 },
	geobukseon = { role = "접현 돌격", weak = "원양·적재 약세", melee = 0.15, cannon = 0.05, sail = -0.08, cargo = -0.04 },
	treasure_ship = { role = "대량 원양 운송", weak = "기동·함포 약세", cargo = 0.15, long = 0.05, cannon = -0.07, sail = -0.04 },
	bermuda_sloop = { role = "순풍 고속 항해", weak = "적재·방어 약세", sail = 0.12, wind = 0.06, cargo = -0.05, storm = -0.04 },
	new_england_ketch = { role = "원양 안정·보급", weak = "함포 약세", long = 0.08, supplies = -0.06, cannon = -0.05 },
	chesapeake_schooner = { role = "연안 경쾌 항해", weak = "대양 폭풍 약세", sail = 0.1, explore = 0.04, storm = -0.05 },
	atlantic_brigantine = { role = "원양 기동 호위", weak = "적재 제한", long = 0.08, sail = 0.04, cargo = -0.05 },
	manila_galleon = { role = "태평양 대량 교역", weak = "느린 기동·수리", cargo = 0.12, tariff = 0.08, sail = -0.08, repair = 0.08 },
	zaruk = { role = "얕은 연안·소형 교역", weak = "외양 폭풍 약세", sail = 0.06, tariff = 0.06, storm = -0.12 },
	sambuk = { role = "계절풍 항해", weak = "낮은 내구", wind = 0.08, sail = 0.04, storm = -0.05 },
	dhow = { role = "인도양 저비용 교역", weak = "화력 약세", long = 0.06, supplies = -0.1, cannon = -0.05 },
	baghlah = { role = "향신료 대량 교역", weak = "느린 선회", cargo = 0.1, tariff = 0.08, sail = -0.05 },
	oman_boom = { role = "원양 항속·보급", weak = "화력·기동 약세", long = 0.12, supplies = -0.1, cannon = -0.05, sail = -0.05 },
	prau = { role = "열도 기동", weak = "외해·내구 약세", sail = 0.12, wind = 0.05, storm = -0.09 },
	pattamar = { role = "계절풍 쾌속 교역", weak = "포격 취약", wind = 0.08, tariff = 0.05, cannon = -0.06 },
	coracora = { role = "연안 접현 기습", weak = "원양 보급 부담", melee = 0.1, sail = 0.06, supplies = 0.08 },
	chola_warship = { role = "원정·백병전 호위", weak = "높은 보급 비용", melee = 0.1, storm = 0.04, supplies = 0.09 },
	javanese_jong = { role = "대량 적재·화물 보호", weak = "느린 기동·수리", cargo = 0.15, storm = 0.07, sail = -0.08, repair = 0.08 },
	nile_papyrus = { role = "강·얕은 연안", weak = "외해 폭풍 약세", sail = 0.05, storm = -0.15, cargo = -0.04 },
	pirogue = { role = "연안 강어귀", weak = "대양 항해 약세", sail = 0.1, storm = -0.12 },
	mtepe = { role = "연안 저비용 교역", weak = "포격 약세", tariff = 0.08, supplies = -0.04, cannon = -0.04 },
	zanzibar_dhow = { role = "향신료 항로·풍향", weak = "접현 방어 약세", wind = 0.08, long = 0.05, tariff = 0.04, melee = -0.05 },
	zanzibar_jahazi = { role = "원양 대량 보급", weak = "기동 약세", long = 0.1, supplies = -0.12, cargo = 0.06, sail = -0.05 },
	mu_voyager = { role = "해류 탐사", weak = "적재 제한", explore = 0.06, sail = 0.04, cargo = -0.04 },
	mist_seeker = { role = "안개 해도 탐사", weak = "함포 약세", explore = 0.08, storm = 0.04, cannon = -0.05 },
	lemuria_scout = { role = "풍향·폭풍 대응", weak = "내구·적재 약세", wind = 0.1, storm = 0.08, sail = 0.04, cargo = -0.05 },
	atlantis_carrier = { role = "유적·장거리 탐사", weak = "수리비 부담", long = 0.08, explore = 0.08, repair = 0.1 },
	flying_dutchman = { role = "해무 전투·생존", weak = "교역 비효율", cannon = 0.08, storm = 0.1, tariff = -0.05 },
	astheria_flagship = { role = "천문 원양 탐사", weak = "높은 유지비", long = 0.08, explore = 0.08, wind = 0.06, repair = 0.15 },
}
-- [신규 23척의 기준 함종값] 이미 등록·승인된 전용 3D 모델과 설계가 있는 함종만 확장한다.
-- 옛 28척은 이 표로 덮어쓰지 않고, 기존 판매·수리·국가 제한을 그대로 유지한다.
local NewShipStats = {
	ship_of_line = { class = 4, price = 15000, cargo = 24, speed = 5, hull = 340, cannons = 18, crew = 65 },
	kobaya = { class = 1, price = 1500, cargo = 14, speed = 9, hull = 85, cannons = 2, crew = 22, rowed = true },
	panokseon = { class = 2, price = 5100, cargo = 20, speed = 6, hull = 215, cannons = 11, crew = 44, rowed = true },
	treasure_ship = { class = 2, price = 10500, cargo = 95, speed = 5, hull = 245, cannons = 5, crew = 40 },
	bermuda_sloop = { class = 1, price = 2100, cargo = 22, speed = 10, hull = 85, cannons = 3, crew = 16 },
	new_england_ketch = { class = 1, price = 3000, cargo = 38, speed = 7, hull = 125, cannons = 4, crew = 20 },
	chesapeake_schooner = { class = 2, price = 4700, cargo = 30, speed = 10, hull = 135, cannons = 6, crew = 24 },
	atlantic_brigantine = { class = 2, price = 5400, cargo = 35, speed = 9, hull = 165, cannons = 8, crew = 30 },
	zaruk = { class = 1, price = 1100, cargo = 18, speed = 8, hull = 65, cannons = 1, crew = 9, rowed = true },
	sambuk = { class = 1, price = 2600, cargo = 33, speed = 8, hull = 100, cannons = 3, crew = 18 },
	oman_boom = { class = 2, price = 8200, cargo = 78, speed = 5, hull = 225, cannons = 5, crew = 34 },
	coracora = { class = 2, price = 4800, cargo = 26, speed = 8, hull = 165, cannons = 7, crew = 48, rowed = true },
	chola_warship = { class = 2, price = 7600, cargo = 29, speed = 7, hull = 240, cannons = 12, crew = 58, rowed = true },
	javanese_jong = { class = 2, price = 10200, cargo = 96, speed = 4, hull = 255, cannons = 5, crew = 38 },
	nile_papyrus = { class = 1, price = 850, cargo = 14, speed = 5, hull = 55, cannons = 1, crew = 9, rowed = true },
	zanzibar_dhow = { class = 2, price = 6500, cargo = 64, speed = 7, hull = 185, cannons = 5, crew = 26 },
	zanzibar_jahazi = { class = 2, price = 9200, cargo = 82, speed = 6, hull = 235, cannons = 7, crew = 34 },
	mu_voyager = { class = 1, price = 2400, cargo = 22, speed = 8, hull = 95, cannons = 3, crew = 16 },
	mist_seeker = { class = 1, price = 4200, cargo = 28, speed = 9, hull = 110, cannons = 4, crew = 22 },
	lemuria_scout = { class = 2, price = 6300, cargo = 31, speed = 10, hull = 160, cannons = 6, crew = 26 },
	atlantis_carrier = { class = 2, price = 10000, cargo = 60, speed = 7, hull = 240, cannons = 10, crew = 42 },
	flying_dutchman = { class = 4, price = 15500, cargo = 28, speed = 8, hull = 310, cannons = 16, crew = 55 },
	astheria_flagship = { class = 4, price = 24000, cargo = 66, speed = 9, hull = 360, cannons = 14, crew = 60 },
}
local BlueprintSaleRegions = {
	europe = { "north_sea", "atlantic_europe", "mediterranean" },
	east_asia = { "east_asia" },
	new_world = { "americas" },
	middle_east = { "red_sea" },
	southeast_asia = { "south_asia", "southeast_asia" },
	africa = { "west_africa", "east_africa" },
}
for _, blueprint in Blueprints do
	local perf = ShipPerformance[blueprint.id]
	assert(perf, "missing ship trait " .. blueprint.id)
	if not Ships[blueprint.id] then
		local stats = NewShipStats[blueprint.id]
		assert(stats, "missing new ship stats " .. blueprint.id)
		Ships[blueprint.id] = {
			id = blueprint.id, name = blueprint.name, steam = false,
			price = stats.price, cargo = stats.cargo, speed = stats.speed,
			hull = stats.hull, cannons = stats.cannons, crew = stats.crew,
			fuelPerDay = 0, class = stats.class,
			rowed = stats.rowed,
			-- 기존 지역 조선소만 판매. 미지대륙은 기존 호놀룰루 외항을 전용 거점으로 사용한다.
			regions = if blueprint.id == "nile_papyrus" then { "red_sea" }
				elseif blueprint.id == "zanzibar_dhow" or blueprint.id == "zanzibar_jahazi" then { "east_africa" }
				else BlueprintSaleRegions[blueprint.faction],
			specialPort = if blueprint.faction == "lost" then "honolulu" else nil,
			newRegional = true,
			minAdventure = if blueprint.faction == "lost" then 6 + blueprint.stage * 4 else nil,
			summary = blueprint.hull .. " · " .. perf.role,
		}
	end
	Ships[blueprint.id].trait = perf
end
-- [연관 기존 선박] 별도 신규 선박 ID가 있는 설계는 기존 원본의 수치를 변경하지 않는다.
-- 기존 국가 전용선·증기선·호위선도 28척의 저장/경제 구조 그대로 운용한다.

-- 항만청 면허: 등급 N+1 배를 사려면 면허 N단계가 필요하다.
local Licenses = {
	{ name = "연안 항해 면허", fame = 30, fee = 300 },
	{ name = "원양 항해 면허", fame = 150, fee = 1500 },
	{ name = "제독 면허", fame = 400, fee = 5000 },
}
local ClassNames = { "소형 상선", "중형선", "대형 증기선", "주력함" }

-- 대포 교체: mult는 대포 위력 보너스, weight는 화물칸이 줄어드는 비율.
export type Cannon = { id: string, name: string, price: number, mult: number, weight: number, techReq: string?, storyReq: string?, summary: string }
local Cannons: { Cannon } = {
	{ id = "basic", name = "철제 6파운드포", price = 0, mult = 0, weight = 0, summary = "기본 대포" },
	{ id = "culverin", name = "장거리 컬버린", price = 1200, mult = 0.08, weight = 0.02, summary = "멀리 나가는 긴 포신" },
	{ id = "demi", name = "데미 캐논", price = 3500, mult = 0.18, weight = 0.05, summary = "무겁고 강한 중포" },
	{ id = "carronade", name = "카로네이드", price = 6000, mult = 0.30, weight = 0.07, storyReq = "smith_1", summary = "짧고 굵은 근거리 대포 (스톡홀름 주조공의 비법)" },
	{ id = "steam_gun", name = "증기 압축포", price = 12000, mult = 0.50, weight = 0.10, techReq = "steam_cannon", summary = "증기압으로 쏘는 신형 대포" },
}
local CannonById: { [string]: Cannon } = {}
for _, c in Cannons do
	CannonById[c.id] = c
end

-- 선체 보강: 레벨이 오를수록 내구도가 늘고 무거워진다.
local Plating = {
	{ name = "목재 보강", price = 800, hull = 0.08, weight = 0.01, speed = 0 },
	{ name = "구리 피복", price = 2500, hull = 0.16, weight = 0.02, speed = 0.03 },
	{ name = "철판 장갑", price = 7000, hull = 0.30, weight = 0.06, speed = -0.04, techReq = "steam_boiler" },
}

-- 개조가 반영된 배 정보를 돌려준다 (기본 상태면 원본 그대로).
local function refit(def: ShipDef, cannonId: string?, plating: number?): ShipDef
	local cn = CannonById[cannonId or "basic"] or CannonById.basic
	local pl = Plating[plating or 0]
	if cn.id == "basic" and not pl then
		return def
	end
	local out = table.clone(def)
	local weight = cn.weight + (if pl then pl.weight else 0)
	out.cargo = math.floor(def.cargo * (1 - weight))
	if pl then
		out.hull = math.floor(def.hull * (1 + pl.hull))
		out.speed = def.speed * (1 + pl.speed)
	end
	return out
end

-- 조선소에 진열되는 순서
local Order = {
	"caravel", "fluyt", "frigate", "galleon",
	"galley", "xebec", "cog", "carrack", "brigantine", "dhow", "baghlah", "mtepe", "pirogue", "junk", "geobukseon", "prau", "pattamar",
	"privateer", "east_indiaman", "corvette", "nau", "kadirga", "jahazi", "kotia", "sekibune", "manila_galleon",
	"paddle_steamer", "ironclad_frigate",
	-- [7대륙 신규 23척] 기존 판매 진열에만 추가. 별도 상점·저장 구조는 만들지 않는다.
	"ship_of_line", "kobaya", "panokseon", "treasure_ship",
	"bermuda_sloop", "new_england_ketch", "chesapeake_schooner", "atlantic_brigantine",
	"zaruk", "sambuk", "oman_boom", "coracora", "chola_warship", "javanese_jong",
	"nile_papyrus", "zanzibar_dhow", "zanzibar_jahazi",
	"mu_voyager", "mist_seeker", "lemuria_scout", "atlantis_carrier", "flying_dutchman", "astheria_flagship",
}

-- 이 배를 지금 살 수 없는 이유 (살 수 있으면 nil). regionId = 현재 항구의 문화권, nationId = 주인공 나라.
local RegionNames: { [string]: string } = {
	mediterranean = "지중해", red_sea = "홍해·중동", north_sea = "북해·발트", atlantic_europe = "대서양 유럽", americas = "아메리카",
	west_africa = "서아프리카", east_africa = "동아프리카", south_asia = "남아시아", southeast_asia = "동남아·오세아니아", east_asia = "동아시아",
}
local function saleBlock(def: ShipDef, regionId: string?, nationId: string?, portId: string?, adventureLevel: number?): string?
	if def.specialPort and def.specialPort ~= portId then
		return "특수 제작 선박: 호놀룰루 조선소에서만 취급해요"
	end
	if def.minAdventure and (adventureLevel or 0) < def.minAdventure then
		return string.format("모험 레벨 %d부터 구매 가능해요", def.minAdventure)
	end
	if def.nation and def.nation ~= nationId then
		return "다른 나라 전용 배예요"
	end
	if def.regions and (regionId == nil or not table.find(def.regions, regionId)) then
		local names = {}
		for _, r in def.regions do
			table.insert(names, RegionNames[r] or r)
		end
		return "이 지역 조선소에서는 팔지 않아요 (" .. table.concat(names, "·") .. "에서 판매)"
	end
	return nil
end

-- 입체 모델·그림을 빌려 올 기본 배 id
local function visualOf(shipId: string): string
	local d = Ships[shipId]
	return if d and d.visual then d.visual else shipId
end

return {
	Ships = Ships,
	Order = Order,
	BlueprintFactions = BlueprintFactions,
	Blueprints = Blueprints,
	Licenses = Licenses,
	ClassNames = ClassNames,
	Cannons = Cannons,
	CannonById = CannonById,
	Plating = Plating,
	refit = refit,
	saleBlock = saleBlock,
	RegionNames = RegionNames,
	visualOf = visualOf,
}
