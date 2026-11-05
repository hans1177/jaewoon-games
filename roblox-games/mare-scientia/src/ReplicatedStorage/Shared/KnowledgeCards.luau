--!strict
-- 지식 카드(세계 백과). 새 항목은 이 테이블에 추가만 하면 도감이 늘어난다.

export type Rarity = "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary"

export type Card = {
	id: string,
	name: string,
	field: string, -- Botany, Zoology, Mineral, Relic, Site, Astronomy, Chemistry, Physics, Geography, Philosophy, Medicine
	rarity: Rarity,
	description: string,
	source: string, -- 발견 방법 (표시용)
	reward: { fame: number, coins: number },
}

local function card(id: string, name: string, field: string, rarity: Rarity, description: string, source: string, fame: number, coins: number): Card
	return {
		id = id,
		name = name,
		field = field,
		rarity = rarity,
		description = description,
		source = source,
		reward = { fame = fame, coins = coins },
	}
end

local Cards: { Card } = {
	card("bot_oak", "유럽 참나무", "Botany", "Common", "서유럽 숲의 대표 활엽수. 목재는 조선과 건축에 쓰인다.", "숲 채집", 5, 10),
	card("bot_foxglove", "폭스글러브", "Botany", "Uncommon", "약용으로 연구된 식물. 독성이 있어 사용에 주의가 필요하다.", "들판 채집", 15, 30),
	card("bot_tulip", "튤립", "Botany", "Uncommon", "17세기 네덜란드에서 구근 값이 폭등할 만큼 유행한 꽃.", "정원 관찰", 15, 40),
	card("bot_binomial", "이명법", "Botany", "Epic", "속명과 종명 두 단어로 생물 이름을 붙이는 분류 방식. 린네가 정리했다.", "학자 방문", 80, 200),
	card("zoo_reindeer", "순록", "Zoology", "Uncommon", "북유럽 툰드라에 사는 사슴과 동물.", "북방 관찰 스케치", 15, 30),
	card("zoo_puffin", "퍼핀", "Zoology", "Uncommon", "북대서양 바닷새. 알록달록한 부리가 특징이다.", "해안 관찰", 15, 30),
	card("zoo_metamorphosis", "곤충의 변태 기록", "Zoology", "Rare", "애벌레에서 성충까지의 변화를 정밀하게 그려 남긴 관찰 기록.", "학자 방문", 45, 120),
	card("min_chalk", "백악 절벽", "Mineral", "Common", "영국 남부 해안의 하얀 석회질 절벽.", "해안 채집", 5, 15),
	card("min_amber", "발트 호박", "Mineral", "Rare", "수지가 굳어 만들어진 화석. 장신구와 교역품으로 귀하게 여겨졌다.", "발트해 해안 채집", 30, 80),
	card("relic_runestone", "룬석", "Relic", "Rare", "룬 문자를 새긴 북유럽의 기념 비석.", "북방 유적 탐사", 30, 90),
	card("relic_aeolipile", "헤론의 증기구 (기록)", "Relic", "Rare", "고대 알렉산드리아의 헤론이 기록한 증기 회전 장치. 유럽 학자들이 번역본으로 연구했다.", "수집가의 진열실", 40, 120),
	card("site_stonehenge", "스톤헨지", "Site", "Epic", "잉글랜드 남부의 거석 유적. 용도는 지금도 연구 중인 수수께끼이다.", "유적 탐험", 100, 300),
	card("site_carnac", "카르나크 열석", "Site", "Epic", "프랑스 브르타뉴에 줄지어 선 수천 개의 선돌.", "유적 탐험", 90, 260),
	card("site_newgrange", "뉴그레인지", "Site", "Epic", "아일랜드의 신석기 시대 무덤. 동지 무렵 햇빛이 통로 안쪽까지 들어온다.", "유적 탐험", 90, 260),
	card("ast_comet", "혜성", "Astronomy", "Rare", "긴 꼬리를 가진 천체. 핼리는 같은 혜성이 주기적으로 돌아온다고 예측했다.", "밤하늘 관측", 40, 100),
	card("ast_jupiter_moons", "목성의 위성", "Astronomy", "Rare", "망원경으로 목성 곁에서 발견된 네 개의 큰 달.", "천문대 관측", 40, 100),
	card("ast_saturn_rings", "토성의 고리", "Astronomy", "Rare", "토성을 둘러싼 얇은 고리. 하위헌스가 그 형태를 설명했다.", "학자 방문", 45, 120),
	card("che_phosphorus", "인", "Chemistry", "Rare", "어둠에서 빛나는 물질. 연금술 실험 중 발견되었다.", "학자 방문", 40, 100),
	card("phy_pendulum", "진자의 법칙", "Physics", "Uncommon", "진자의 흔들림 주기는 줄 길이로 정해진다. 시계 제작의 바탕이 되었다.", "진자 실험", 20, 40),
	card("phy_gravity", "만유인력", "Physics", "Epic", "모든 물체가 서로 끌어당긴다는 원리. 뉴턴이 『프린키피아』에서 정리했다.", "학자 방문", 100, 300),
	card("phy_microscope", "현미경 관찰", "Physics", "Rare", "렌즈로 작은 생물을 관찰해 미생물의 세계를 열었다.", "학자 방문", 45, 120),
	card("phy_papin_digester", "파팽의 압력솥", "Physics", "Rare", "밀폐한 솥에서 증기 압력을 높이는 장치. 증기 기관 연구의 출발점 중 하나.", "학자 방문", 50, 140),
	card("phy_savery_pump", "세이버리의 증기 펌프", "Physics", "Epic", "증기의 힘으로 물을 퍼 올리는 장치. 광산 배수에 쓰이도록 고안되었다.", "학자 방문", 80, 220),
	card("phy_newcomen_engine", "뉴커먼 기관", "Physics", "Epic", "증기를 식혀 생기는 압력 차로 피스톤을 움직이는 대기압 기관.", "학자 방문", 100, 280),
	card("phi_cogito", "방법적 회의", "Philosophy", "Rare", "모든 것을 의심하는 데서 출발해 확실한 지식을 찾으려는 데카르트의 방법.", "학자 방문", 40, 90),
	card("phi_monad", "단자론", "Philosophy", "Epic", "세계가 더 나눌 수 없는 단위로 이루어져 있다고 보는 라이프니츠의 사상.", "학자 방문", 80, 200),
	card("med_cinchona", "기나나무 껍질", "Medicine", "Rare", "열병 치료에 쓰인 남미 원산 나무껍질.", "항구 약재상", 35, 100),
	card("myth_kraken", "크라켄", "Myth", "Legendary", "북유럽 뱃사람들이 전하는 거대 촉수 괴물. 섬으로 착각할 만큼 크다고 한다.", "신화 보스 격파", 150, 400),
	card("myth_sea_serpent", "바다뱀", "Myth", "Legendary", "대서양에서 목격담이 이어지는 길고 거대한 바다 괴물. 실체는 알려지지 않았다.", "신화 보스 격파", 100, 300),
	card("geo_gulfstream", "멕시코 만류", "Geography", "Rare", "대서양을 따라 북유럽까지 따뜻한 물을 나르는 해류.", "항해 기록", 35, 90),
}

local ById: { [string]: Card } = {}
for _, c in Cards do
	ById[c.id] = c
end

return {
	Cards = Cards,
	ById = ById,
}
