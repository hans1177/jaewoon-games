--!nonstrict
-- 세계 연대기: 실제 역사 속 지역 사건과 그 곳의 소문(미신·음모론·전설)을 항구별로 모았다.
-- 그 해(또는 몇 해 뒤)에 그 항구에 도착하면 학자가 불러 세워 "역사의 현장"을 보여 준다.
-- 사실(fact)은 기록으로 확인된 내용만, 소문(lore)은 당시 사람들이 믿거나 퍼뜨린 이야기로 따로 표시한다.
-- kind: sci(관측·발견) | nature(재해) | war(전쟁) | politics(정치) | trade(교역) | faith(신앙·문화)
-- voice: 지역 문화의 말투. europe | islam | china | japan | india | americas | sea

local C = {}

C.Rows = {
	{ id = "c_venice_plague", year = 1630, month = 10, ports = { "venice" }, voice = "europe", kind = "nature", title = "베네치아의 역병과 서약",
		fact = "1630년 여름부터 번진 역병이 베네치아 시민의 상당수를 앗아 갔다. 원로원은 병이 물러나면 성모께 큰 성당을 바치겠다고 서약했고, 훗날 살루테 성당이 세워졌다.",
		lore = "사람들은 도시의 죄 때문에 병이 왔다고 속삭이며 행렬을 지어 걸었다.", loreTag = "미신", scholar = "의사 마르코" },
	{ id = "c_plymouth_mayflower", year = 1620, month = 9, ports = { "plymouth" }, voice = "europe", kind = "politics", title = "메이플라워호의 출항",
		fact = "1620년 9월, 순례자와 일반 이주민 백여 명을 태운 배가 플리머스에서 대서양을 향해 떠났다. 겨울 폭풍 속의 긴 항해 끝에 그들은 북아메리카 해안에 닿았다.",
		lore = "부두의 사람들은 겨울 앞바다로 떠나는 그 배가 돌아오지 못할 것이라고 수군거렸다.", loreTag = "소문", scholar = "부두 서기 헨리" },
	{ id = "c_cape_town_founding", year = 1652, month = 4, ports = { "cape_town" }, voice = "sea", kind = "trade", title = "희망봉의 보급 기지",
		fact = "1652년 4월, 네덜란드 동인도회사의 얀 판 리베이크가 테이블 만에 상륙해 보급 기지를 세웠다. 동방으로 가는 배들이 채소와 신선한 고기를 얻는 길목이 되었다.",
		lore = "선원들은 이 곶을 돌 때 폭풍의 유령선이 나타난다고 입을 모았다.", loreTag = "전설", scholar = "항해 서기 얀" },
	{ id = "c_edo_meireki", year = 1657, month = 1, ports = { "edo" }, voice = "japan", kind = "nature", title = "메이레키 대화재",
		fact = "1657년 1월, 에도에서 사흘 가까이 번진 큰불이 성과 시가지 대부분을 태웠다. 이후 막부는 방화 구획과 넓은 길을 만들며 도시를 다시 짰다.",
		lore = "불길이 저주받은 후리소데 때문이라는 이야기가 퍼졌다. 실제 원인은 건조한 바람과 빽빽한 목조 가옥이었다.", loreTag = "전설", scholar = "난학 학자 겐파쿠" },
	{ id = "c_nagasaki_dejima", year = 1641, month = 5, ports = { "nagasaki" }, voice = "japan", kind = "trade", title = "데지마의 네덜란드 상관",
		fact = "1641년 네덜란드 상관이 히라도에서 나가사키의 작은 인공섬 데지마로 옮겨졌다. 이후 오랫동안 유럽과 일본을 잇는 거의 유일한 창구가 되었다.",
		lore = "상인들은 좁은 섬에 갇힌 서양인들이 책과 약품을 몰래 팔아 학문을 퍼뜨린다고 수군거렸다.", loreTag = "소문", scholar = "통역관 모토키" },
	{ id = "c_smyrna_quake", year = 1688, month = 7, ports = { "smyrna" }, voice = "islam", kind = "nature", title = "이즈미르 대지진",
		fact = "1688년 7월 소아시아 서해안의 큰 지진이 항구 도시를 무너뜨리고 큰 화재를 일으켰다. 상인과 선원 가운데 많은 이가 목숨을 잃었다.",
		lore = "거리에는 하늘의 경고라며 이 도시가 사치와 교만으로 흔들렸다는 설교가 번졌다.", loreTag = "미신", scholar = "의원 하산" },
	{ id = "c_port_royal_quake", year = 1692, month = 6, ports = { "kingston" }, voice = "americas", kind = "nature", title = "포트 로열의 침몰",
		fact = "1692년 6월 자메이카의 포트 로열이 큰 지진과 해일로 바다 쪽으로 무너져 내렸다. 해적 소굴로 이름난 부유한 항구는 순식간에 폐허가 되었다.",
		lore = "살아남은 사람들은 이 도시가 죄악 때문에 심판받았다고 말했다. 지진은 지층이 흘러내려 일어난 일이다.", loreTag = "미신", scholar = "의사 로버트" },
	{ id = "c_st_petersburg_founding", year = 1703, month = 5, ports = { "st_petersburg" }, voice = "europe", kind = "politics", title = "늪 위의 새 수도",
		fact = "1703년 5월 표트르 대제가 네바 강 하구의 늪지에 요새를 세우며 새 도시를 시작했다. 수많은 노동자가 배수와 축조에 동원되었고 이곳은 러시아의 바다 창문이 되었다.",
		lore = "도시가 노동자의 뼈 위에 세워졌다는 이야기가 거리마다 전해진다.", loreTag = "전설", scholar = "측량사 이반" },
	{ id = "c_istanbul_inoculation", year = 1717, month = 4, ports = { "istanbul" }, voice = "islam", kind = "sci", title = "천연두 접종의 편지",
		fact = "1717년 영국 대사 부인 메리 워틀리 몬터규는 콘스탄티노플에서 천연두 접종을 보고 편지로 알렸다. 이 방법은 훗날 영국에 전해져 예방 의학의 발전을 이끌었다.",
		lore = "일부 설교자는 병을 일부러 몸에 넣는 일이 신의 뜻을 거스른다고 반대했다.", loreTag = "미신", scholar = "의원 하산 에펜디" },
	{ id = "c_messina_plague", year = 1743, month = 5, ports = { "messina" }, voice = "europe", kind = "nature", title = "메시나의 마지막 역병",
		fact = "1743년 메시나에 퍼진 역병은 서유럽에서 마지막 큰 페스트 유행 중 하나였다. 항구에는 검역 방벽이 쳐졌고, 도시는 오랫동안 고립되었다.",
		lore = "수도원 종소리와 행렬만이 병을 물리친다고 믿는 이들이 거리를 메웠다.", loreTag = "미신", scholar = "검역관 줄리오" },
	{ id = "c_lisbon_quake", year = 1755, month = 11, ports = { "lisbon" }, voice = "europe", kind = "nature", title = "리스본 대지진",
		fact = "1755년 11월 1일 만성절 아침, 리스본에 큰 지진과 해일, 화재가 겹쳤다. 도시 대부분이 무너졌고 이후 재건 계획이 근대 도시 설계의 한 사례로 남았다.",
		lore = "일부 설교는 이 재앙을 하늘의 벌로 해석했다. 한편 지진의 원인을 자연에서 찾으려는 학자들도 나타났다.", loreTag = "미신과 논쟁", scholar = "학자 안토니우" },
	{ id = "c_quebec_1759", year = 1759, month = 9, ports = { "quebec" }, voice = "americas", kind = "war", title = "아브라함 평원 전투",
		fact = "1759년 9월 영국군이 퀘벡 성 앞 평원에서 프랑스군을 꺾었다. 이 전투는 북아메리카에서 프랑스 세력이 물러나는 큰 전환점이 되었다.",
		lore = "성벽 안에서는 배신자가 절벽 샛길을 알려 줬다는 소문이 돌았다.", loreTag = "소문", scholar = "군의관 앙투안" },
	{ id = "c_havana_1762", year = 1762, month = 8, ports = { "havana" }, voice = "americas", kind = "war", title = "영국의 하바나 점령",
		fact = "1762년 8월 영국군은 두 달 넘는 공방 끝에 하바나를 점령했다. 이듬해 파리 조약에서 도시는 스페인에 돌아갔고 대신 플로리다가 영국 몫이 되었다.",
		lore = "부두에서는 도시가 큰 은과 맞바꿔졌다는 이야기가 오래 돌았다.", loreTag = "소문", scholar = "의사 호세" },
	{ id = "c_tahiti_venus", year = 1769, month = 6, ports = { "tahiti" }, voice = "sea", kind = "sci", title = "금성이 해를 지나가다",
		fact = "1769년 6월 3일 제임스 쿡의 일행은 타히티에서 금성이 태양 앞을 지나는 모습을 관측했다. 같은 현상을 여러 곳에서 재면 지구와 태양 사이의 거리를 구할 수 있다고 보았다.",
		lore = "섬 사람들은 하늘에 장비를 세우는 낯선 손님들을 호기심 어린 눈으로 지켜보았다.", loreTag = "소문", scholar = "천문 관측가 그린" },
	{ id = "c_boston_tea", year = 1773, month = 12, ports = { "boston" }, voice = "americas", kind = "politics", title = "보스턴 차 사건",
		fact = "1773년 12월 보스턴 시민들은 항구에 정박한 배에서 차 상자를 바다에 던졌다. 차에 대한 세금과 독점에 대한 반발이었고, 이 사건은 식민지와 본국의 갈등을 키웠다.",
		lore = "다음 날 부두에서는 차 냄새가 바닷가에 진동했고 사람들은 이를 두고 말을 보탰다.", loreTag = "소문", scholar = "인쇄공 새뮤얼" },
	{ id = "c_gibraltar_siege", year = 1779, month = 6, ports = { "gibraltar" }, voice = "europe", kind = "war", title = "지브롤터 대공성",
		fact = "1779년 여름부터 스페인과 프랑스 연합군이 지브롤터를 몇 해에 걸쳐 포위했다. 영국 수비대는 버텼고, 이 공성은 근대 해상·요새 전투의 본보기로 남았다.",
		lore = "성채 안에서는 바위 속 지하 통로로 비밀 보급이 들어온다는 소문이 돌았다.", loreTag = "소문", scholar = "공병 장교 엘리엇" },
	{ id = "c_haiti_1791", year = 1791, month = 8, ports = { "santo_domingo", "kingston", "havana" }, voice = "americas", kind = "politics", title = "생도맹그의 봉기",
		fact = "1791년 8월 프랑스령 생도맹그에서 노예들의 대규모 봉기가 일어났다. 긴 싸움 끝에 아이티가 세워져, 대서양 세계의 노예제와 식민 체제를 뒤흔들었다.",
		lore = "항구에서는 불길이 곧 이 섬을 넘어 번질 것이라는 불안한 소문이 돌았다.", loreTag = "소문", scholar = "서기 아마디" },
	{ id = "c_toulon_1793", year = 1793, month = 12, ports = { "toulon" }, voice = "europe", kind = "war", title = "툴롱 포위전",
		fact = "1793년 12월 프랑스 혁명군은 영국 해군이 점거한 툴롱을 되찾았다. 이 전투에서 젊은 포병 장교 보나파르트가 이름을 알렸다.",
		lore = "선술집에서는 이 젊은 장교가 장차 나라를 쥐게 될 거라는 농담이 돌았다.", loreTag = "소문", scholar = "포술 교관 장" },
	{ id = "c_trafalgar", year = 1805, month = 10, ports = { "cadiz", "gibraltar" }, voice = "europe", kind = "war", title = "트라팔가르 해전",
		fact = "1805년 10월 21일 트라팔가르 곶 앞바다에서 영국 함대가 프랑스·스페인 연합 함대를 크게 이겼다. 이 승리로 영국의 제해권이 굳어졌다.",
		lore = "부두에서는 한 제독의 마지막 말과 최후에 대한 이야기가 사람들 입에 오르내렸다.", loreTag = "소문", scholar = "항해사 프란시스코" },
	{ id = "c_tambora", year = 1815, month = 4, ports = { "makassar", "batavia", "singapore" }, voice = "sea", kind = "nature", title = "탐보라 화산 대폭발",
		fact = "1815년 4월 숨바와 섬의 탐보라 화산이 근대 기록상 가장 큰 폭발을 일으켰다. 화산재가 하늘을 덮어 이듬해 북반구 여러 곳에서 이상 저온과 흉작이 이어졌다.",
		lore = "어부들은 바다 끝에서 들린 천둥소리를 신령이 노했다는 신호로 받아들였다.", loreTag = "미신", scholar = "식물학자 라플레스의 제자 아담" },
	{ id = "c_beagle_hobart", year = 1836, month = 2, ports = { "hobart", "sydney" }, voice = "sea", kind = "sci", title = "비글호의 방문",
		fact = "1836년 초 측량선 비글호가 태즈메이니아와 시드니에 기항했다. 젊은 박물학자 찰스 다윈은 항해 중 모은 표본과 관찰을 정리했고, 이는 훗날 진화 이론의 바탕이 되었다.",
		lore = "항구 사람들은 조용히 돌과 새를 줍는 청년을 두고 괴짜 수집가라 불렀다.", loreTag = "소문", scholar = "자연사 학자 로버트" },
	{ id = "c_opium_canton", year = 1839, month = 3, ports = { "canton", "macau" }, voice = "china", kind = "politics", title = "광저우의 아편 몰수",
		fact = "1839년 3월 흠차대신 임칙서는 광저우에서 외국 상인들의 아편을 몰수해 폐기했다. 이 사건은 이후 청과 영국 사이의 전쟁으로 이어졌다.",
		lore = "상인 거리에는 몰수된 아편 상자가 바다에 던져지자 물고기가 취했다는 이야기가 돌았다.", loreTag = "소문", scholar = "관청 서기 장" },
	{ id = "c_snow_cholera", year = 1854, month = 9, ports = { "london" }, voice = "europe", kind = "sci", title = "브로드 스트리트의 우물",
		fact = "1854년 런던 소호에서 콜레라가 번지자 의사 존 스노는 환자 집의 위치를 지도에 표시해 한 공동 우물 둘레에 몰려 있음을 보였다. 그의 지도는 질병의 전파 경로를 추적하는 방법의 모범이 되었다.",
		lore = "당시에는 나쁜 공기가 병을 옮긴다는 생각이 널리 퍼져 있었다.", loreTag = "당시의 통념", scholar = "의사 존의 조수 윌리엄" },
	{ id = "c_perry_edo", year = 1853, month = 7, ports = { "edo", "hakodate", "osaka" }, voice = "japan", kind = "politics", title = "구로후네의 내항",
		fact = "1853년 7월 미국 페리 제독의 검은 증기선 함대가 에도 만에 나타나 개항을 요구했다. 이 방문은 일본의 오랜 쇄국 체제가 흔들리는 신호가 되었다.",
		lore = "마을에서는 연기를 뿜는 검은 배를 두고 바다 괴물이라는 이야기까지 퍼졌다.", loreTag = "소문", scholar = "난학 학자 겐사이" },
	{ id = "c_gold_rush_sf", year = 1849, month = 6, ports = { "san_francisco" }, voice = "americas", kind = "trade", title = "금광의 소문과 샌프란시스코",
		fact = "1848년 캘리포니아에서 금이 발견되자 이듬해 전 세계에서 사람들이 몰려들었다. 작은 마을이던 샌프란시스코는 항구와 상업 도시로 급성장했다.",
		lore = "부두에는 강바닥에서 금이 눈앞에 널려 있다는 이야기가 퍼졌으나, 대부분은 큰 부를 얻지 못했다.", loreTag = "소문", scholar = "측량사 윌리엄" },
	{ id = "c_krakatoa", year = 1883, month = 8, ports = { "batavia", "singapore", "colombo" }, voice = "sea", kind = "nature", title = "크라카타우 대폭발",
		fact = "1883년 8월 순다 해협의 크라카타우 화산이 폭발하며 거대한 해일을 일으켰다. 폭발음은 수천 킬로미터 밖에서도 들렸고, 화산재는 세계 하늘의 붉은 노을을 오래 남겼다.",
		lore = "해안 마을에는 바다 깊은 곳의 신령이 깨어났다고 믿는 이들이 많았다.", loreTag = "미신", scholar = "지질학자 판 데어" },
}

-- 문화권별 장면 문장 (소문은 사실과 분리해 보여 준다)
C.Voice = {
	europe = { open = "성당 종소리가 들리는 부두", ask = "\"이 일을 정확한 기록으로 남기고 싶습니다. 학회에 보낼 노트를 함께 채워 주시겠습니까?\"" },
	islam = { open = "향신료와 책이 뒤섞인 시장 골목", ask = "\"눈으로 본 것을 그대로 적는 것이 학자의 일이지요. 이 일을 함께 기록해 주시겠습니까?\"" },
	china = { open = "관청 깃발이 늘어선 항구 거리", ask = "\"역사는 기록하는 사람이 있어야 남습니다. 이 일을 직접 적어 주시겠습니까?\"" },
	japan = { open = "상관과 통역관이 오가는 부두", ask = "\"보고 들은 것을 한 글자도 빼지 않고 적어 두려 합니다. 거들어 주시겠습니까?\"" },
	india = { open = "무역선이 줄지어 닿는 포구", ask = "\"후세를 위한 기록을 만들려 합니다. 함께 증언해 주시겠습니까?\"" },
	americas = { open = "새 항구에 사람이 몰리는 부두", ask = "\"이 일은 곧 잊힐 겁니다. 제대로 된 기록을 함께 남겨 주시겠습니까?\"" },
	sea = { open = "바람 냄새가 짙은 섬의 항구", ask = "\"배에서 본 것을 정확히 적어 두는 게 항해자의 몫이지요. 함께 기록해 주시겠습니까?\"" },
}

C.KindGain = { sci = { fame = 6, coins = 80, note = 2 }, nature = { fame = 4, coins = 40, note = 1 }, war = { fame = 4, coins = 60, note = 1 },
	politics = { fame = 5, coins = 60, note = 1 }, trade = { fame = 3, coins = 120, note = 1 }, faith = { fame = 4, coins = 40, note = 1 } }

C.KindName = { sci = "관측·발견", nature = "재난", war = "전쟁", politics = "정치", trade = "교역", faith = "신앙·문화" }

-- 대량 추가분: tools/chronicle_import.py 가 assets/data/chronicle/*.csv 를 읽어 WorldChronicleBulk.luau 를 만든다.
do
	local ok, bulk = pcall(function() return require(script.Parent.WorldChronicleBulk) end)
	if ok and type(bulk) == "table" then
		for _, r in bulk do
			table.insert(C.Rows, r)
		end
	end
end

C.ById = {}
for _, r in C.Rows do
	C.ById[r.id] = r
end

-- 인물 백과(People)의 실존 인물에서 현장 장면을 만든다. 태어난 지 25년 뒤부터 세상을 떠날 때까지 그 항구에서 만날 수 있다.
local CAT_KIND = { ruler = "politics", explorer = "sci", military = "war", science = "sci", inventor = "sci", thought = "sci", art = "faith", letters = "faith", merchant = "trade", pirate = "war", faith = "faith" }
local VOICE_BY_PORT = {
	istanbul = "islam", smyrna = "islam", algiers = "islam", tunis = "islam", alexandria = "islam", damietta = "islam", jeddah = "islam", mocha = "islam", basra = "islam", muscat = "islam", aden = "islam", bandar_abbas = "islam", tripoli = "islam",
	canton = "china", macau = "china", shanghai = "china", amoy = "china", ningbo = "china", tianjin = "china", tainan = "china", busan = "china", incheon = "china",
	edo = "japan", nagasaki = "japan", osaka = "japan", hakodate = "japan",
	calcutta = "india", surat = "india", goa = "india", cochin = "india", madras = "india", calicut = "india", colombo = "india", diu = "india",
	havana = "americas", boston = "americas", new_york = "americas", philadelphia = "americas", charleston = "americas", quebec = "americas", new_orleans = "americas", veracruz = "americas", cartagena_indias = "americas", salvador = "americas", rio = "americas",
}

function C.fromPeople(people, ports)
	local out = {}
	for _, p in people do
		local port = p.via and p.via.port
		if port and p.born and p.died and ports[port] then
			table.insert(out, {
				id = "p_" .. p.id, year = p.born + 25, untilYear = p.died, person = p, ports = { port }, voice = VOICE_BY_PORT[port] or "europe",
				kind = CAT_KIND[p.cat] or "politics", title = p.name .. "을(를) 만나다", scholar = p.name,
				fact = p.bio .. (if p.legacy then " " .. p.legacy else ""), generated = true,
			})
		end
	end
	return out
end

C.GeneratedGain = { fame = 2, coins = 30, note = 1 }

-- 장면 대사 만들기: 배경 → 사실 → 소문(출처 표시) → 학자의 부탁 → 기록
function C.lines(row, portName: string?): { string }
	local v = C.Voice[row.voice] or C.Voice.sea
	local out = {
		string.format("%d년 %d월, %s. %s 한쪽에 %s이(가) 서 있다.", row.year, row.month or 1, portName or "항구", v.open, row.scholar),
		row.fact,
	}
	if row.lore then
		table.insert(out, string.format("(%s) %s", row.loreTag or "소문", row.lore))
	end
	table.insert(out, string.format("%s이(가) 당신을 불러 세운다. %s", row.scholar, v.ask))
	table.insert(out, "당신은 그 자리에서 본 것을 관찰 노트에 한 줄씩 옮겨 적었다.")
	return out
end

return C
