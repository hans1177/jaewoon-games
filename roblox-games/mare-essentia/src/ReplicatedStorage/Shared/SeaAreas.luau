--!nonstrict
-- SeaAreas.luau · 해역 구분(지시서 docs/battle_backdrops 해역 id)과 항구 → 해역 조회.
-- 자동 배치 규칙: Naval/sea_<해역>_near|mid|far (해전 배경), Naval/voyage_<해역>_near|mid|far (항해 배경, 없으면 sea_ 를 씀).
-- 해전과 항해가 함께 쓰는 기존 해역 배경 정본. 전투 수치·항해 거리에는 사용하지 않는다.
local SeaAreas = {}

SeaAreas.PORTS = {
	north_sea = "london amsterdam antwerp bergen edinburgh rotterdam plymouth hull glasgow",
	baltic = "copenhagen gothenburg hamburg stockholm gdansk lubeck oslo riga tallinn helsinki st_petersburg koenigsberg visby",
	channel = "rouen dublin",
	biscay = "bordeaux la_rochelle",
	iberian_atlantic = "lisbon porto cadiz casablanca safi agadir",
	med_west = "seville marseille livorno barcelona valencia algiers tunis tangier palma cagliari ajaccio toulon oran malaga gibraltar cartagena bone genoa",
	med_east = "naples tripoli palermo valletta ragusa athens istanbul alexandria syracuse thessaloniki candia rhodes famagusta smyrna acre benghazi messina corfu beirut damietta venice ancona split trieste",
	red_sea = "mocha jeddah",
	arabian = "aden muscat bandar_abbas basra",
	swahili = "mozambique kilwa mombasa zanzibar mogadishu port_louis",
	cape = "cape_town",
	malabar = "diu surat goa calicut cochin",
	bengal = "colombo madras calcutta rangoon",
	malacca = "malacca bangkok singapore batavia",
	spice_islands = "makassar ternate ambon banda",
	south_china = "manila macau canton tainan hoi_an brunei",
	east_china = "amoy ningbo shanghai tianjin nagasaki busan incheon",
	japan_sea = "osaka edo hakodate",
	caribbean = "nassau havana kingston santo_domingo san_juan bridgetown port_of_spain la_guaira cartagena_indias portobelo paramaribo panama",
	gulf_mexico = "new_orleans veracruz campeche",
	brazil = "belem recife salvador rio montevideo buenos_aires",
	pacific_south_america = "guayaquil callao valparaiso",
	north_atlantic_america = "halifax st_johns quebec boston new_york philadelphia charleston",
	west_africa = "praia saint_louis dakar bissau freetown elmina ouidah lagos calabar sao_tome luanda benguela",
	atlantic_islands = "las_palmas funchal ponta_delgada st_helena",
	south_pacific = "sydney hobart auckland port_moresby suva tahiti perth darwin honolulu guam",
	north_pacific = "sitka vancouver acapulco san_francisco",
}

local byPort = {}
for sea, ports in SeaAreas.PORTS do
	for port in string.gmatch(ports, "%S+") do
		byPort[port] = sea
	end
end

-- [해역 이야기 자막 · 2026-11-28] 해역에 들어설 때 보이는 이름과 한 줄 사연(지리 사실만).
SeaAreas.INFO = {
	north_sea = { "북해", "얕고 거친 바다. 청어와 양모, 석탄이 오가는 북유럽의 부엌이다." },
	baltic = { "발트해", "짠맛이 옅은 내해. 곡물·목재·대마가 한자 도시들을 오간다." },
	channel = { "영국 해협", "가장 좁은 곳은 30여 km. 조류가 빠르고 안개가 잦다." },
	biscay = { "비스케이만", "대서양의 큰 너울이 몰려와 거칠기로 이름난 만이다." },
	iberian_atlantic = { "이베리아 대서양", "대항해의 출발점. 북동 무역풍이 남쪽으로 배를 밀어 준다." },
	med_west = { "서지중해", "바람이 자주 바뀌는 바다. 갤리선과 범선이 함께 다닌다." },
	med_east = { "동지중해", "동방 무역의 길목. 비단과 향신료가 베네치아로 흘러간다." },
	red_sea = { "홍해", "산호초가 많은 좁은 바다. 커피가 모카 항구에서 실려 나간다." },
	arabian = { "아라비아해", "몬순의 바다. 바람이 반년마다 방향을 바꾼다." },
	swahili = { "스와힐리 해안", "다우선이 몬순을 타고 인도와 아라비아를 잇는다." },
	cape = { "희망봉", "두 대양이 만나는 곶. 폭풍과 높은 파도로 유명하다." },
	malabar = { "말라바르 해안", "후추의 고향. 비가 많은 서남 몬순이 해안을 적신다." },
	bengal = { "벵골만", "큰 강들이 흙을 실어 오는 바다. 사이클론이 잦다." },
	malacca = { "믈라카 해협", "인도양과 남중국해를 잇는 좁은 물길. 바람을 기다리는 항구가 늘어서 있다." },
	spice_islands = { "향료 제도", "정향과 육두구가 자라는 작은 섬들. 온 세계 상인이 노린다." },
	south_china = { "남중국해", "정크선과 갤리온이 비단·도자기·은을 주고받는다." },
	east_china = { "동중국해", "대륙과 섬나라 사이 바다. 쿠로시오 해류가 북쪽으로 흐른다." },
	japan_sea = { "일본 근해", "겨울 북서풍이 거세고 해안은 깊게 파였다." },
	caribbean = { "카리브해", "따뜻한 바다와 수많은 섬. 설탕과 해적의 바다다." },
	gulf_mexico = { "멕시코만", "은을 실은 함대가 모이는 곳. 여름에는 허리케인이 온다." },
	brazil = { "브라질 연안", "남동 무역풍과 브라질 해류. 설탕과 염료목이 실려 간다." },
	pacific_south_america = { "남아메리카 태평양", "차가운 훔볼트 해류가 북쪽으로 흐르고 고기가 많다." },
	north_atlantic_america = { "북대서양 아메리카", "대구가 넘치는 뱅크와 짙은 안개, 겨울엔 얼음." },
	west_africa = { "서아프리카 연안", "적도 무풍대가 가깝다. 바람이 멎으면 배가 며칠씩 서 있다." },
	atlantic_islands = { "대서양 섬들", "카나리아·마데이라·아조레스. 대양 횡단 전 마지막 보급지." },
	south_pacific = { "남태평양", "끝없는 바다와 산호섬. 별과 너울로 길을 찾는다." },
	north_pacific = { "북태평양", "차갑고 넓은 바다. 해달 모피를 찾아 배가 온다." },
}

function SeaAreas.seaOf(portId: string?): string?
	if not portId then return nil end
	return byPort[portId]
end

SeaAreas.BANDS = { "near", "mid", "far" }

return SeaAreas
