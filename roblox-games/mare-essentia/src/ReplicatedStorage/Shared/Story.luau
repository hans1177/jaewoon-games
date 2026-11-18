--!strict
-- 이야기 이벤트. 항구에서 일러스트 장면(art)과 대화(lines)로 보여 주고, 선택지(choices)에 따라 보상이 갈린다.
-- 일러스트는 지금은 코드로 그린 장면이고, 나중에 art 이름에 맞는 이미지로 바꿀 수 있다.
-- requires: 먼저 끝내야 하는 이벤트 { id, choice? }.

export type Effect = { coins: number?, fame: number?, cardId: string?, affinity: number? }
export type Choice = { text: string, minFame: number?, cost: number?, effect: Effect, result: string }
export type Event = {
	id: string,
	title: string,
	chapter: string?, -- 연작 이름
	portId: string,
	art: string, -- palace | tavern | harbor | ruins | observatory | storm | library
	npc: string,
	lines: { string },
	choices: { Choice },
	minFame: number?,
	minYear: number?,
	major: boolean?, -- 중요 사건만 항구 도착 시 자동 장면
	evidence: string?, -- documented / legend / fictionalNarrative
	continent: string?,
	requiresQuests: { string }?, -- 완료된 연속 퀘스트
	requires: { { id: string, choice: number? } }?,
	requiresCards: { string }?,
	nation: string?, -- 이 나라 주인공만 볼 수 있다
}

local Events: { Event } = {
	-- [대항해 연대기] 실제 역사·전설·가상 사건 구분, 완수 조건이 갖춰진 중요 사건만 연다.
	{
		id = "epic_pirate",
		chapter = "대항해 연대기 · pirate",
		title = "검은 돛이 지킨 이름",
		portId = "veracruz",
		art = "harbor",
		npc = "실종 선원의 아들",
		major = true,
		evidence = "fictionalNarrative",
		continent = "대서사",
		requiresQuests = { "q_saga_pirate_2" },
		lines = {
			"[가상 사건 · 실제 시대/항해 지식을 바탕으로 재구성]",
			"검은 돛이 훔친 상자에는 황금이 아니라 탈출선 생존자 명단이 있었다. 명단이 공개되면 왕실의 거짓말이 드러나지만 생존자도 추적당한다.",
			"소년은 젖은 명단을 품에 안았다. \"아버지는 해적이었나요, 영웅이었나요?\"",
		},
		choices = {
			{ text = "왕실의 은폐 기록을 공개한다", effect = { fame = 16 }, result = "항만청 앞에서 소년이 아버지의 이름을 낭독했다." },
			{ text = "명단을 봉인하고 생존자부터 피신시킨다", effect = { fame = 12 }, result = "구조선이 밤바다로 출항했다. 소년은 기다리는 이들의 이름을 지켰다." },
		},
	},
	{
		id = "epic_navy",
		chapter = "대항해 연대기 · navy",
		title = "포성이 멈춘 밤",
		portId = "stockholm",
		art = "harbor",
		npc = "북해 함대 장교",
		major = true,
		evidence = "fictionalNarrative",
		continent = "대서사",
		requiresQuests = { "q_saga_navy_2" },
		lines = {
			"[가상 사건 · 실제 시대/항해 지식을 바탕으로 재구성]",
			"함대의 마지막 포탄이 장전됐다. 성벽을 무너뜨리면 승전이다. 그러나 성벽 아래에는 피난민 수백 명이 갇혀 있다.",
			"장교는 명령서를 불에 가져다 댄다. \"명령을 지키면 나라가 나를 용서할 겁니다. 사람들은요?\"",
		},
		choices = {
			{ text = "민간인 구조를 먼저 명령한다", effect = { fame = 16 }, result = "포성이 그치자 주민들은 부두로 달려 나왔다." },
			{ text = "적 함대에 정전 신호를 보낸다", effect = { fame = 12 }, result = "깃발 신호를 받은 적 함대가 사격을 멈췄다." },
		},
	},
	{
		id = "epic_trade",
		chapter = "대항해 연대기 · trade",
		title = "바람이 가져온 빈 갑판",
		portId = "zanzibar",
		art = "harbor",
		npc = "향신료 선단 상인",
		major = true,
		evidence = "fictionalNarrative",
		continent = "대서사",
		requiresQuests = { "q_saga_trade_2" },
		lines = {
			"[가상 사건 · 실제 시대/항해 지식을 바탕으로 재구성]",
			"잔지바르에 표류선이 들어왔다. 찢어진 돛 아래에는 향신료만 있고 선원은 없다. 보험업자는 물건 값만 묻는다.",
			"상인이 빈 갑판을 바라본다. \"사라진 사람들은 누가 셉니까?\"",
		},
		choices = {
			{ text = "실종 선원 수색에 배를 보낸다", effect = { fame = 16 }, result = "등대가 몇 차례 깜박인 뒤 구조선이 생존자를 태우고 돌아왔다." },
			{ text = "계절풍 기록을 모든 항해사에게 공개한다", effect = { fame = 12 }, result = "다음 선단은 바람의 계절을 기다렸다. 항구의 침몰 기록이 줄어들기 시작했다." },
		},
	},
	{
		id = "epic_guild",
		chapter = "대항해 연대기 · guild",
		title = "일곱 인장의 밀약",
		portId = "venice",
		art = "harbor",
		npc = "길드 회계사",
		major = true,
		evidence = "fictionalNarrative",
		continent = "대서사",
		requiresQuests = { "q_saga_guild_2" },
		lines = {
			"[가상 사건 · 실제 시대/항해 지식을 바탕으로 재구성]",
			"서로 경쟁하던 일곱 상단의 인장이 한 장의 보험 계약서에 찍혀 있었다. 배가 침몰할 때 이익을 얻는 사람들이 있다.",
			"회계사가 탁자에 불탄 환어음을 놓는다. \"이 숫자에는 죽은 선원의 몫이 없어요.\"",
		},
		choices = {
			{ text = "계약 조작을 폭로한다", effect = { fame = 16 }, result = "보상이 가야 할 사람들에게 돈이 돌아갔다." },
			{ text = "계약에 선원 구호 조항을 넣는다", effect = { fame = 12 }, result = "일곱 인장은 처음으로 서로의 손실을 나누는 약속이 됐다." },
		},
	},
	{
		id = "epic_scholar",
		chapter = "대항해 연대기 · scholar",
		title = "별을 훔친 사람들",
		portId = "london",
		art = "harbor",
		npc = "젊은 천문 관측자",
		major = true,
		evidence = "fictionalNarrative",
		continent = "대서사",
		requiresQuests = { "q_saga_scholar_2" },
		lines = {
			"[가상 사건 · 실제 시대/항해 지식을 바탕으로 재구성]",
			"왕립학회 강당에서 원고의 저자를 놓고 다툼이 벌어진다. 누군가 관측자의 이름을 지우고 귀족의 이름을 적었다.",
			"목성 곁의 네 빛점은 거짓말을 하지 않는다. 관측자는 당신의 항해일지를 바라본다.",
		},
		choices = {
			{ text = "원본 관측 기록의 작성자를 증언한다", effect = { fame = 16 }, result = "학회 서기는 지워졌던 이름을 논문 첫 줄에 다시 적었다." },
			{ text = "모든 연구 동료의 이름을 함께 적는다", effect = { fame = 12 }, result = "연구는 한 사람의 영광이 아니라 모두의 기록으로 남았다." },
		},
	},
	{
		id = "epic_explorer",
		chapter = "대항해 연대기 · explorer",
		title = "최초 발견자의 거짓말",
		portId = "zanzibar",
		art = "harbor",
		npc = "스와힐리 도선사",
		major = true,
		evidence = "fictionalNarrative",
		continent = "대서사",
		requiresQuests = { "q_saga_explorer_2" },
		lines = {
			"[가상 사건 · 실제 시대/항해 지식을 바탕으로 재구성]",
			"외국 지도 제작자가 새 항로를 발견했다고 선언한다. 그러나 그 항로는 현지 도선사들이 여러 세대 전에 그어 놓은 선이었다.",
			"도선사는 웃지 않는다. \"길을 처음 본 건 당신이 아닙니다. 당신은 처음 적을 뿐이지요.\"",
		},
		choices = {
			{ text = "현지 도선사의 이름을 지도에 남긴다", effect = { fame = 16 }, result = "지도 한 장에 여러 세대의 이름이 나란히 적혔다." },
			{ text = "옛 해도와 새 해도를 함께 보관한다", effect = { fame = 12 }, result = "두 항해 기록이 한 서가에서 다음 항해자를 기다렸다." },
		},
	},
	{
		id = "epic_diplomat",
		chapter = "대항해 연대기 · diplomat",
		title = "성벽 밖에도 왕국은 있다",
		portId = "manila",
		art = "harbor",
		npc = "마닐라 통역사",
		major = true,
		evidence = "fictionalNarrative",
		continent = "대서사",
		requiresQuests = { "q_saga_diplomat_2" },
		lines = {
			"[가상 사건 · 실제 시대/항해 지식을 바탕으로 재구성]",
			"성벽 안에서는 무역 조약을 맺지만 성벽 밖의 사람들은 자신들의 언어로 문서를 읽을 수조차 없다.",
			"통역사가 쪽지를 쥐여 준다. \"사람들이 사는 항구를 왕실 문서만으로 나눌 수는 없어요.\"",
		},
		choices = {
			{ text = "주민 대표의 발언권을 요구한다", effect = { fame = 16 }, result = "서명란 아래 새로운 줄이 생겼다." },
			{ text = "협정문을 여러 언어로 공개한다", effect = { fame = 12 }, result = "누구도 조약의 뜻을 혼자 독점할 수 없게 됐다." },
		},
	},
	{
		id = "epic_shipwright",
		chapter = "대항해 연대기 · shipwright",
		title = "부서진 배를 다시 띄우는 사람들",
		portId = "sydney",
		art = "harbor",
		npc = "남쪽 항구 조선공",
		major = true,
		evidence = "fictionalNarrative",
		continent = "대서사",
		requiresQuests = { "q_saga_shipwright_2" },
		minYear = 1788,
		lines = {
			"[가상 사건 · 실제 시대/항해 지식을 바탕으로 재구성]",
			"폭풍에 밀려 좌초한 배에서 아이들의 목소리가 들린다. 선주는 손실부터 계산하지만 현지 길잡이는 구조 가능한 물길을 찾았다.",
			"조선공이 낡은 설계도를 접는다. \"이 배를 고치기 전 사람부터 꺼내야 합니다.\"",
		},
		choices = {
			{ text = "현지 길잡이와 함께 배를 인양한다", effect = { fame = 16 }, result = "설계도에는 길을 알려 준 사람들의 이름이 새겨졌다." },
			{ text = "먼저 선원과 주민을 구조한다", effect = { fame = 12 }, result = "난파선에서 사람들이 무사히 돌아왔다. 배는 뒤따라 구조됐다." },
		},
	},
	{
		id = "epic_navigator",
		chapter = "대항해 연대기 · navigator",
		title = "빙벽이 부순 황금의 꿈",
		portId = "hobart",
		art = "harbor",
		npc = "극지 항해 기록관",
		major = true,
		evidence = "fictionalNarrative",
		continent = "대서사",
		requiresQuests = { "q_saga_navigator_2" },
		minYear = 1804,
		lines = {
			"[가상 사건 · 실제 시대/항해 지식을 바탕으로 재구성]",
			"1773년 남극권을 넘은 항해대의 일지가 호바트 서고에 도착했다. 선박의 앞을 막은 것은 바다에 떠다니는 거대한 해빙이었다.",
			"기록관이 말한다. \"전설 속 남방의 황금 땅은 보지 못했습니다. 하지만 얼음의 바다는 분명히 보았습니다.\"",
		},
		choices = {
			{ text = "해빙을 관측해 백과사전에 기록한다", effect = { fame = 16, cardId = "geo_antarctic_pack_ice" }, result = "남극 해빙 카드가 서재에 기록됐다. 빈칸이 줄어들수록 새로운 질문이 늘었다." },
			{ text = "남방 대륙 가설과 항해 기록을 비교한다", effect = { fame = 12 }, result = "지도에는 전설과 관측이 서로 다른 색의 글자로 남았다." },
		},
	},
	{
		id = "epic_culture",
		chapter = "대항해 연대기 · culture",
		title = "황금을 찾는 자와 이름을 지키는 자",
		portId = "valparaiso",
		art = "harbor",
		npc = "안데스 기록자",
		major = true,
		evidence = "fictionalNarrative",
		continent = "대서사",
		requiresQuests = { "q_saga_culture_2" },
		lines = {
			"[가상 사건 · 실제 시대/항해 지식을 바탕으로 재구성]",
			"엘도라도를 찾겠다는 원정대가 산으로 향한다. 발파라이소의 기록자는 지도에 없는 마을들의 이름을 불러 준다.",
			"그는 묻는다. \"금을 가져가면 무엇이 남습니까? 이 길을 알려 준 사람들은 어디에 기록됩니까?\"",
		},
		choices = {
			{ text = "지역 공동체의 구전 역사를 먼저 기록한다", effect = { fame = 16 }, result = "황금은 없었지만 사람들의 이름이 이어진 지도가 남았다." },
			{ text = "확인된 지리와 전설을 나눠 그린다", effect = { fame = 12 }, result = "산과 강은 실선, 전설은 점선으로 남겼다." },
		},
	},
	{
		id = "case_fire",
		chapter = "역사 기록과 미스터리",
		title = "불길 뒤에 숨은 거짓 고발",
		portId = "amsterdam",
		art = "library",
		npc = "외교 서기관",
		major = true,
		evidence = "documented",
		continent = "세계 역사",
		requiresQuests = { "q_case_fire_2" },
		minYear = 1666,
		lines = {
			"[역사 기록 · 사실/의혹 구분]",
			"1666년 런던 대화재 뒤 전쟁 중이던 외국인과 종교 집단을 범인으로 지목하는 소문이 돌았다.",
			"일부 자백도 실제 기록과 맞지 않았다. 당시 의회 조사는 사고라고 결론 내렸다. 누가 공포를 정치에 이용했는가.",
		},
		choices = {
			{ text = "당시의 조사 기록을 공개한다", effect = { fame = 16, cardId = "history_fire_rumor_1666" }, result = "거짓 고발장이 걷히고 실제 피해자의 이름이 남았다." },
			{ text = "비난과 조사 결과를 나누어 전시한다", effect = { fame = 12 }, result = "소문을 보존하되 사실이 아니라고 분명히 적었다." },
		},
	},
	{
		id = "case_tulip",
		chapter = "역사 기록과 미스터리",
		title = "튤립 한 알이 나라를 망쳤다고?",
		portId = "london",
		art = "library",
		npc = "무역 장부 조사관",
		major = true,
		evidence = "documented",
		continent = "세계 역사",
		requiresQuests = { "q_case_tulip_2" },
		minYear = 1637,
		lines = {
			"[역사 기록 · 사실/의혹 구분]",
			"한 송이 튤립 값에 저택을 팔았다는 극적인 비극이 유럽의 선술집을 떠돈다.",
			"1637년 당시 거래 장부와 후대의 과장된 이야기는 다르다. 투기 자체는 있었지만 온 나라가 무너졌다는 증거는 없다.",
		},
		choices = {
			{ text = "계약서와 지불 증거를 공개한다", effect = { fame = 16 }, result = "이야기는 덜 화려해졌지만 실제 피해의 원인이 드러났다." },
			{ text = "당시 기록과 후대 전설을 분리한다", effect = { fame = 12 }, result = "투기의 위험을 알리는 정확한 기록이 남았다." },
		},
	},
	{
		id = "case_roanoke",
		chapter = "역사 기록과 미스터리",
		title = "크로아토안의 마지막 단서",
		portId = "london",
		art = "library",
		npc = "존 화이트의 기록관",
		major = true,
		evidence = "documented",
		continent = "세계 역사",
		requiresQuests = { "q_case_roanoke_2" },
		minYear = 1590,
		lines = {
			"[역사 기록 · 사실/의혹 구분]",
			"1590년 귀환한 존 화이트는 비어 있는 로어노크 정착지에서 크로아토안이라는 표식을 발견했다.",
			"이주설은 중요한 가능성이지만 최종 행방은 여전히 확인되지 않았다. 괴물과 저주 이야기는 증거가 아니다.",
		},
		choices = {
			{ text = "이주 가설과 반증을 나란히 적는다", effect = { fame = 16 }, result = "실종의 결말은 미해결로 남았다. 단서는 더욱 정확해졌다." },
			{ text = "원주민 사회의 역사도 함께 조사한다", effect = { fame = 12 }, result = "정착지 사람들의 기록과 이웃 공동체의 역사가 함께 남았다." },
		},
	},
	{
		id = "case_salem",
		chapter = "역사 기록과 미스터리",
		title = "마녀라는 이름의 재판",
		portId = "plymouth",
		art = "library",
		npc = "법정 기록관",
		major = true,
		evidence = "documented",
		continent = "세계 역사",
		requiresQuests = { "q_case_salem_2" },
		minYear = 1692,
		lines = {
			"[역사 기록 · 사실/의혹 구분]",
			"1692년 세일럼 재판에서 사람들은 초자연적 공격을 했다는 혐의를 받았다. 여러 무고한 사람이 처형됐다.",
			"눈에 보이지 않는 영혼의 증언은 검증할 수 없었다. 공포와 정치·종교적 갈등은 법정의 판단을 흐렸다.",
		},
		choices = {
			{ text = "재판의 증거 기준을 비판한다", effect = { fame = 16 }, result = "기록은 혐의보다 사람의 생명을 먼저 기억했다." },
			{ text = "희생자의 기록을 복원한다", effect = { fame = 12 }, result = "지워진 이름들이 연대기로 돌아왔다." },
		},
	},
	{
		id = "case_southsea",
		chapter = "역사 기록과 미스터리",
		title = "주식 뒤편의 정치",
		portId = "amsterdam",
		art = "library",
		npc = "금융 서기관",
		major = true,
		evidence = "documented",
		continent = "세계 역사",
		requiresQuests = { "q_case_southsea_2" },
		minYear = 1720,
		lines = {
			"[역사 기록 · 사실/의혹 구분]",
			"1720년 남해회사 주가가 급락했다. 계약과 국채, 정치적 이해관계가 한꺼번에 얽혀 있었다.",
			"항구에는 누군가 비밀리에 온 세계 주가를 지배한다는 소문이 돈다. 무엇이 실제 거래였을까.",
		},
		choices = {
			{ text = "정치인과 회사의 계약을 조사한다", effect = { fame = 16 }, result = "사람이 만든 제도와 선택의 책임이 드러났다." },
			{ text = "음모설과 확인된 금융 문제를 나눈다", effect = { fame = 12 }, result = "거대한 음모보다 구체적인 계약의 함정이 남았다." },
		},
	},
	{
		id = "case_lisbon",
		chapter = "역사 기록과 미스터리",
		title = "하늘의 벌인가, 땅의 움직임인가",
		portId = "seville",
		art = "library",
		npc = "지진 기록 학자",
		major = true,
		evidence = "documented",
		continent = "세계 역사",
		requiresQuests = { "q_case_lisbon_2" },
		minYear = 1755,
		lines = {
			"[역사 기록 · 사실/의혹 구분]",
			"1755년 11월 1일 리스본에 지진과 해일, 화재가 연달아 일어났다. 무너진 도시는 도움을 기다린다.",
			"재난을 신의 벌로 단정하는 설교와 자연의 원인을 찾는 연구가 충돌한다. 설명보다 생명이 먼저다.",
		},
		choices = {
			{ text = "피해 기록을 모아 복구에 제공한다", effect = { fame = 16 }, result = "폐허에서 다시 도시를 만드는 사람들이 모였다." },
			{ text = "재건을 위한 실증 지식을 공유한다", effect = { fame = 12 }, result = "지진의 피해가 자세히 기록돼 다음 세대에 전해졌다." },
		},
	},
	{
		id = "case_boston",
		chapter = "역사 기록과 미스터리",
		title = "342개 차 상자의 정치",
		portId = "london",
		art = "library",
		npc = "영국 의회 서기관",
		major = true,
		evidence = "documented",
		continent = "세계 역사",
		requiresQuests = { "q_case_boston_2" },
		minYear = 1773,
		lines = {
			"[역사 기록 · 사실/의혹 구분]",
			"1773년 12월 16일 보스턴의 항구에서 동인도회사 차 342상자가 바다에 던져졌다.",
			"차법과 독점, 과세와 정치적 대표권이 충돌했다. 어떤 기록에는 반란, 다른 기록에는 저항이라 적혔다.",
		},
		choices = {
			{ text = "항구 주민의 요구를 기록한다", effect = { fame = 16 }, result = "의회 문서에 지워졌던 항구 사람들의 주장이 남았다." },
			{ text = "독점권과 과세 정책을 따로 살핀다", effect = { fame = 12 }, result = "상자 하나마다 제국의 균열이 적혀 있었다." },
		},
	},
	{
		id = "case_dejima",
		chapter = "역사 기록과 미스터리",
		title = "닫힌 문 너머로 전해진 책",
		portId = "manila",
		art = "library",
		npc = "동아시아 무역 기록관",
		major = true,
		evidence = "documented",
		continent = "세계 역사",
		requiresQuests = { "q_case_dejima_2" },
		minYear = 1641,
		lines = {
			"[역사 기록 · 사실/의혹 구분]",
			"1641년 네덜란드 상관이 나가사키 데지마로 옮겨졌다. 바다 문이 닫혔다는 소문이 번졌다.",
			"그러나 무역과 지식은 제한된 통로로 계속 흘렀다. 완전한 고립이라는 단순한 설명은 기록과 맞지 않는다.",
		},
		choices = {
			{ text = "데지마 상관의 무역 기록을 정리한다", effect = { fame = 16 }, result = "작은 인공섬은 서로 다른 세계가 닿은 증거가 됐다." },
			{ text = "교역 제한과 실제 교류를 나누어 적는다", effect = { fame = 12 }, result = "닫힌 문 뒤에서도 사람과 책이 오갔다." },
		},
	},
	{
		id = "case_atlantis",
		chapter = "역사 기록과 미스터리",
		title = "플라톤의 섬을 찾아서",
		portId = "lisbon",
		art = "library",
		npc = "고전 문헌 학자",
		major = true,
		evidence = "legend",
		continent = "세계 역사",
		requiresQuests = { "q_case_atlantis_2" },
		minYear = 1517,
		lines = {
			"[전설 · 실재 미확인]",
			"리스본 수집가는 아틀란티스의 위치가 적혔다는 낡은 지도를 내민다.",
			"플라톤의 대화편에는 아틀란티스 이야기가 있지만 실제 섬이 존재했다는 확증은 없다. 수집가는 출처를 숨긴다.",
		},
		choices = {
			{ text = "원전과 후대 해도를 비교한다", effect = { fame = 16 }, result = "황금 도시는 발견되지 않았지만 문헌의 이야기는 제자리를 찾았다." },
			{ text = "실재 여부 미확인으로 분류한다", effect = { fame = 12 }, result = "전설은 사라지지 않았다. 사실이라는 이름만 빼앗겼다." },
		},
	},
	{
		id = "case_hybrasil",
		chapter = "역사 기록과 미스터리",
		title = "안개 속에서 나타나는 섬",
		portId = "lisbon",
		art = "library",
		npc = "고지도 수집가",
		major = true,
		evidence = "legend",
		continent = "세계 역사",
		requiresQuests = { "q_case_hybrasil_2" },
		minYear = 1517,
		lines = {
			"[전설 · 실재 미확인]",
			"아일랜드 서쪽에 나타난다는 하이 브라실이 오래된 해도마다 다른 모습으로 그려져 있다.",
			"지도 제작자들은 이전 지도를 베꼈고 항해자들은 안개를 이야기했다. 누가 실제로 그 섬을 보았을까.",
		},
		choices = {
			{ text = "시대별 지도를 비교한다", effect = { fame = 16 }, result = "실재가 확인되지 않은 섬은 고지도 속에서만 남았다." },
			{ text = "항해 증언과 전설을 분리한다", effect = { fame = 12 }, result = "전설은 남고 항로의 안전은 더 높아졌다." },
		},
	},
	{
		id = "case_kraken",
		chapter = "역사 기록과 미스터리",
		title = "괴물인가 바다가 만든 환영인가",
		portId = "london",
		art = "library",
		npc = "해양 전승 수집가",
		major = true,
		evidence = "legend",
		continent = "세계 역사",
		requiresQuests = { "q_case_kraken_2" },
		minYear = 1517,
		lines = {
			"[전설 · 실재 미확인]",
			"크라켄과 리바이어던 그림이 같은 책에서 합쳐졌다. 선원들의 공포는 진짜지만 목격담은 제각각이다.",
			"거대한 해양 생물의 관찰과 종교적 상징은 다른 이야기다. 실제로 무엇을 보았을까.",
		},
		choices = {
			{ text = "목격담을 동물 기록과 대조한다", effect = { fame = 16 }, result = "거대한 짐승을 단정하지 않고 목격의 한계를 기록했다." },
			{ text = "각 문화의 전승을 별도로 보관한다", effect = { fame = 12 }, result = "전설의 힘을 인정하되 실재는 확인되지 않았다고 표시했다." },
		},
	},
	{
		id = "epic_finale",
		chapter = "일곱 대륙, 하나의 바다",
		title = "사라진 세계해도의 진실",
		portId = "lisbon",
		art = "library",
		npc = "왕립 지도 제작자",
		major = true,
		evidence = "fictionalNarrative",
		continent = "일곱 대륙",
		requiresQuests = { "q_saga_convergence" },
		lines = {
			"[대항해 연대기 · 대륙을 잇는 최종 장]",
			"리스본 지도실의 일곱 서랍이 열렸다. 서로 다른 직업과 지역에서 얻은 기록이 하나의 해도를 가리킨다.",
			"현실의 일곱 대륙과 전설 속 가상 대륙 아스테리아는 다른 종류의 지식이다. 지도 제작자는 묻는다. \"무엇을 역사로 남기시겠습니까?\"",
		},
		choices = {
			{ text = "실제 역사의 항로와 증거를 완성한다", effect = { fame = 16 }, result = "현실의 일곱 대륙을 잇는 해도가 완성됐다. 가상의 대륙은 별도로 기록됐다." },
			{ text = "아스테리아를 신화의 비밀 장으로 보존한다", effect = { fame = 12 }, result = "아스테리아는 전설의 장에 남았다. 모든 기록의 출처가 서재에서 확인된다." },
		},
	},
	{
		id = "h_england_1", chapter = "주점의 사람들", title = "엘리너 렌의 사연", portId = "london", art = "tavern", npc = "엘리너 렌", minFame = 10,
		lines = {
			"비 내리는 런던 부두. 선술집 창가에서 한 여자가 젖은 해류도를 난로 불빛에 말리고 있다.",
			"탁자 위에는 붉은 도장이 찍힌 서한 한 장. '근거 불충분. 반려.' 그녀는 그 글자를 손가락으로 천천히 문지른다.",
			"\"십 년을 모았어요. 병에 담긴 쪽지 삼백 장, 선원들의 증언, 제 손으로 그린 흐름들. 그래도 학회는 '바다에서 직접 재 오라'더군요.\"",
			"그녀가 고개를 든다. 눈가가 붉지만 목소리는 떨리지 않는다. \"배가 없어요. 돈도 없고요. 있는 건 이 지도와, 틀리지 않았다는 확신뿐이에요.\"",
			"\"다음 달 학회 모임이 마지막 기회예요. 그 전에 세 바다의 해류를 재 올 수 있다면... 저를 태워 주시겠어요?\"",
		},
		choices = {
			{ text = "논문의 첫 증인이 되겠다고 약속한다", effect = { fame = 4 }, result = "\"좋아요. 증거는 우리가 가져옵시다.\" 엘리너가 처음으로 웃었다. 젖은 해류도 위로 눈물 한 방울이 떨어졌다. (주점에서 동료로 영입할 수 있게 되었다)" },
			{ text = "관측 기구 값을 대신 치러 준다", cost = 100, effect = { fame = 6 }, result = "엘리너가 기구 상자를 끌어안았다. \"이 눈금 하나하나가 약속이에요. 반드시 갚을게요.\" (주점에서 동료로 영입할 수 있게 되었다)" },
		},
	},
	{
		id = "h_netherlands_1", chapter = "주점의 사람들", title = "얀 데 흐로트의 사연", portId = "amsterdam", art = "tavern", npc = "얀 데 흐로트", minFame = 10,
		lines = {
			"암스테르담 운하 위로 저녁 종소리가 번진다. 선술집 구석에서 한 청년이 장부를 펴 놓고 숫자를 짚고 있다.",
			"문이 열리고 길드 완장을 찬 사내 둘이 들어온다. 청년의 장부를 힐끗 보고는 비웃으며 지나간다. \"서기 아들 주제에.\"",
			"얀은 입술을 깨물고 장부를 덮는다. \"아버지는 평생 길드의 숫자를 적어 주고도 이름 한 줄 남기지 못했어요.\"",
			"\"길드는 독점으로 항로를 막았죠. 그래도 숫자는 독점할 수 없어요. 제 계산으로는, 남쪽 항로만 열면 첫 해에 이문이 세 배예요.\"",
			"그가 장부를 밀어 보인다. 첫 장 맨 위가 비어 있다. \"상사의 이름을 쓸 칸이에요. 당신 배에서 배우며 이 칸을 채우고 싶습니다.\"",
		},
		choices = {
			{ text = "빈 칸에 첫 줄을 함께 적어 준다", effect = { fame = 4 }, result = "얀의 손이 떨렸다. \"...이 장부에서 가장 먼저 지킬 약속이 생겼네요.\" (주점에서 동료로 영입할 수 있게 되었다)" },
			{ text = "독립 상사의 첫 출자금을 건넨다", cost = 100, effect = { fame = 6 }, result = "얀이 장부 첫 줄에 출자자의 이름을 적었다. \"이 줄은 평생 지워지지 않을 겁니다.\" (주점에서 동료로 영입할 수 있게 되었다)" },
		},
	},
	{
		id = "h_france_1", chapter = "주점의 사람들", title = "마리온 델라크루아의 사연", portId = "rouen", art = "tavern", npc = "마리온 델라크루아", minFame = 12,
		lines = {
			"루앙 포구의 안개 낀 아침. 낡았지만 단정한 드레스의 여인이 선술집 구석에서 은화를 세어 본다.",
			"세 번 세어도 같은 숫자다. 그녀는 조용히 손바닥으로 동전을 덮는다. \"천이백. 영지의 빚은 이만이에요.\"",
			"\"어젯밤 채권자가 문장 깃발을 내렸어요. 칠 대째 걸려 있던 깃발이 마차에 실려 가는 걸, 저는 서서 지켜봤답니다.\"",
			"그녀의 목소리는 우아하게 정돈되어 있다. 그래서 더 아프다. \"울지 않았어요. 가문의 딸은 문 앞에서 울지 않으니까요.\"",
			"\"신대륙의 설탕과 모피가 길이라고 들었어요. 저는 계산과 예절을 알아요. 깃발을 되찾을 때까지, 당신의 배에서 쓸모가 되겠어요.\"",
		},
		choices = {
			{ text = "영지 이야기를 끝까지 들어 준다", effect = { fame = 4 }, result = "마리온이 눈을 감았다. 오랜만에 누군가 끝까지 들어 주었다는 듯 어깨의 힘이 풀렸다. \"고마워요, 선장님.\" (주점에서 동료로 영입할 수 있게 되었다)" },
			{ text = "깃발 수선 값을 먼저 건넨다", cost = 100, effect = { fame = 6 }, result = "마리온이 은화를 받아 쥐고 깊이 인사했다. \"이 빚은 은화가 아니라 깃발로 갚겠어요.\" (주점에서 동료로 영입할 수 있게 되었다)" },
		},
	},
	{
		id = "h_ottoman_1", chapter = "주점의 사람들", title = "레일라 하미디의 사연", portId = "istanbul", art = "tavern", npc = "레일라 하미디", minFame = 10,
		lines = {
			"이스탄불 선술집, 계피와 몰약 냄새 속에 한 여인이 후추 한 알을 손바닥에서 굴린다.",
			"\"이게 마지막 후추예요. 창고는 비었고, 거래처는 삼 대째 이어 온 약속을 취소하겠다는 편지를 보냈어요.\"",
			"홍해 길목이 막혔다는 소문이 시장을 휩쓸고 지나갔다. 그 여파로 하미디 가문의 가게는 이번 달 안에 문을 닫을 위기다.",
			"\"할아버지는 낙타 대상으로, 아버지는 배로, 저는... 길을 새로 열어야 하는 세대인가 봐요.\"",
			"그녀가 후추를 당신 손에 쥐여 준다. \"흥정은 제가 맡을게요. 이 향기가 사라지기 전에 다시 가게 문을 열어 주세요.\"",
		},
		choices = {
			{ text = "후추 한 자루를 제값에 사 준다", effect = { fame = 4 }, result = "레일라가 처음으로 환하게 웃었다. \"좋은 거래네요. 이 값은 잊지 않겠어요.\" (주점에서 동료로 영입할 수 있게 되었다)" },
			{ text = "가문 가게의 빚을 일부 갚아 준다", cost = 100, effect = { fame = 6 }, result = "레일라의 손이 떨렸다. \"...삼 대째 이어진 문을 닫지 않게 해 주셨네요. 평생 갚을게요.\" (주점에서 동료로 영입할 수 있게 되었다)" },
		},
	},
	{
		id = "h_swahili_1", chapter = "주점의 사람들", title = "아민 살림의 사연", portId = "zanzibar", art = "tavern", npc = "아민 살림", minFame = 10,
		lines = {
			"잔지바르 해변의 해 질 녘. 젊은 선장이 모래 위에 바람 화살표를 그리고 있다.",
			"수평선에는 낯선 깃발의 배들이 하나둘 닻을 내린다. 아민은 그쪽을 한참 바라보다가 모래 그림을 발로 지운다.",
			"\"저 배들은 우리 바다를 지도에 그려 놓고 자기 것이라 부르죠. 하지만 바람의 길을 먼저 안 건 우리 할아버지들이에요.\"",
			"\"노인들은 바람에 이름을 붙여 줬어요. 북동풍 카스카지, 남서풍 쿠시. 그 이름이 잊히면 길도 사라져요.\"",
			"\"계절풍 표를 완성해서 후배들에게 남기고 싶어요. 그러려면 먼 바다까지 나가야 해요. 함께 가 주시겠어요?\"",
		},
		choices = {
			{ text = "계절풍 표 작성을 돕겠다고 한다", effect = { fame = 4 }, result = "아민이 모래 위에 새 화살표를 그렸다. \"카스카지가 우리 편이 되겠네요. 이 표의 첫 장에 당신 이름을 쓸게요.\" (주점에서 동료로 영입할 수 있게 되었다)" },
			{ text = "새 돛천 값을 보태 준다", cost = 100, effect = { fame = 6 }, result = "아민이 돛천을 어깨에 걸치고 웃었다. \"이 돛에 바람의 노래를 담아 올게요.\" (주점에서 동료로 영입할 수 있게 되었다)" },
		},
	},
	{
		id = "h_malabar_1", chapter = "주점의 사람들", title = "라마 나이르의 사연", portId = "calicut", art = "tavern", npc = "라마 나이르", minFame = 10,
		lines = {
			"캘리컷 시장 끝, 햇볕에 그을린 청년이 후추 자루를 지키고 앉아 있다. 자루마다 흙먼지가 묻어 있다.",
			"상인 하나가 다가와 값을 부르고, 청년은 고개를 젓는다. 상인이 비웃으며 값을 반으로 깎는다. \"싫으면 썩혀라.\"",
			"\"풍년이었어요. 마을 사람 모두 한 해를 걸어 키웠는데, 값은 작년의 반이에요. 풍년이 재앙이 되는 세상이에요.\"",
			"\"배를 몰 줄은 몰라요. 그래도 제 손으로 팔러 가야겠다고 결심했어요. 마을 사람들이 제 어깨에 후추 한 줌씩 얹어 줬거든요.\"",
			"\"값을 지키는 법은 흙에서 배웠어요. 바다에서 배우고 싶습니다.\"",
		},
		choices = {
			{ text = "제값을 쳐서 후추를 산다", effect = { fame = 4 }, result = "라마의 눈이 젖었다. \"제값이라는 말을 오랜만에 들었어요. 마을에 전하면 모두 울 거예요.\" (주점에서 동료로 영입할 수 있게 되었다)" },
			{ text = "마을 창고 수리비를 보탠다", cost = 100, effect = { fame = 6 }, result = "라마가 손을 맞잡았다. \"이 창고가 바로 서면 후추는 썩지 않아요. 평생 잊지 않겠습니다.\" (주점에서 동료로 영입할 수 있게 되었다)" },
		},
	},
	{
		id = "h_japan_1", chapter = "주점의 사람들", title = "사쿠라이 하루카의 사연", portId = "nagasaki", art = "tavern", npc = "사쿠라이 하루카", minFame = 12,
		lines = {
			"오사카 항구, 비 갠 오후. 선술집 창가의 여인이 붓으로 항구 밖 이국 배의 윤곽을 그린다.",
			"붓끝은 정확한데 표정은 쓸쓸하다. 창밖의 배는 곧 닻을 올릴 참이다.",
			"\"저 배는 내일 떠나요. 저 배가 오면 책 한 권, 약초 한 포기, 별자리표 한 장이 들어와요. 저는 그걸 받는 쪽이었죠.\"",
			"\"가고 싶었어요. 하지만 이 항구는 밖으로 가는 길이 좁아요. 그래서 배우기로 했죠. 가는 법이 아니라, 돌아오는 법을.\"",
			"\"바다 너머의 지식을 가지고 돌아오고 싶어요. 조용히 지켜보고 기록하겠습니다. 동행을 허락해 주시겠어요?\"",
		},
		choices = {
			{ text = "붓과 종이를 선물한다", effect = { fame = 4 }, result = "하루카가 붓을 두 손으로 받았다. \"이 붓으로 쓴 첫 줄은, 당신께 보내는 감사가 될 거예요.\" (주점에서 동료로 영입할 수 있게 되었다)" },
			{ text = "이국 서적 값을 보탠다", cost = 100, effect = { fame = 6 }, result = "하루카가 눈을 크게 떴다. \"이 책의 첫 페이지를 펼치는 날, 당신 이름을 먼저 부르겠어요.\" (주점에서 동료로 영입할 수 있게 되었다)" },
		},
	},
	{
		id = "h_new_spain_1", chapter = "주점의 사람들", title = "페르난도 모랄레스의 사연", portId = "veracruz", art = "tavern", npc = "페르난도 모랄레스", minFame = 12,
		lines = {
			"베라크루스 부두. 그을린 얼굴의 사내가 선술집 구석에서 은 조각을 손끝으로 굴린다. 손가락 마디마다 굳은살이다.",
			"\"산에서 파낸 은이 이 부두에서 배에 실리죠. 그리고 한 번도 돌아오지 않아요. 마을에 남는 건 갱도의 먼지뿐입니다.\"",
			"그는 은 조각을 탁자에 내려놓는다. 소리가 무겁다. \"작년에 갱도가 무너졌어요. 열한 명이 묻혔죠. 위로금은 은 한 자루였소.\"",
			"\"저는 살아남았고, 그래서 약속했소. 은이 마을로 돌아오는 길을 꼭 만들겠다고. 갱도에서 어둠 속 길 찾는 법은 배웠소. 바다도 비슷할 거요.\"",
			"\"나를 태워 주시오. 쓸모없는 짐이 되지 않겠소.\"",
		},
		choices = {
			{ text = "끝까지 이야기를 들어 준다", effect = { fame = 4 }, result = "페르난도가 은 조각을 쥐었다. 오래 닫혀 있던 얼굴이 풀렸다. \"들어 주는 사람이 있다는 것만으로도 갱도에서 한 발 나온 기분이오.\" (주점에서 동료로 영입할 수 있게 되었다)" },
			{ text = "갱도 보수 비용을 보탠다", cost = 100, effect = { fame = 6 }, result = "페르난도가 모자를 벗었다. \"이 돈은 열한 개의 이름 앞에 올리겠소. 평생 은혜를 기억하겠소.\" (주점에서 동료로 영입할 수 있게 되었다)" },
		},
	},
	{
		id = "h_portugal_1", chapter = "주점의 사람들", title = "이네스 카브랄의 사연", portId = "lisbon", art = "tavern", npc = "이네스 카브랄", minFame = 10,
		lines = {
			"리스본 선술집. 막 받은 졸업장을 탁자 위에 놓고, 낡은 항해 일지를 펼쳐 보는 여인이 있다.",
			"일지의 마지막 페이지는 찢어진 듯 끊겨 있다. 그녀는 그 가장자리를 엄지로 쓸어 본다. \"서안에서 끊겼어요. 선배들이 돌아오지 못한 곳이죠.\"",
			"\"학교에서 가장 먼저 배우는 건 '돌아오는 법'이에요. 그런데 이 일지의 주인은 돌아오지 않았어요. 아무도 그 이유를 이야기하지 않아요.\"",
			"\"저는 수석 졸업생이에요. 배울 건 다 배웠다고들 하죠. 하지만 이 일지의 다음 쪽은 누구도 가르쳐 주지 않았어요.\"",
			"\"끊긴 일지를 인도까지 이어 쓰고 싶어요. 그 첫 줄을, 당신의 배에서 쓰게 해 주세요.\"",
		},
		choices = {
			{ text = "일지의 새 쪽을 함께 쓰자고 한다", effect = { fame = 4 }, result = "이네스가 펜을 들었다. \"첫 줄은 이렇게 쓸게요. '새 선장이 서안을 넘었다.'\" (주점에서 동료로 영입할 수 있게 되었다)" },
			{ text = "항해 도구 값을 보탠다", cost = 100, effect = { fame = 6 }, result = "이네스가 새 육분의를 가슴에 안았다. \"이걸로 끊긴 선배들의 길을 이어 보겠어요.\" (주점에서 동료로 영입할 수 있게 되었다)" },
		},
	},
	{
		id = "lc_1", chapter = "잃어버린 해도", title = "왕립학회의 밀사", portId = "london", art = "palace", npc = "학회 밀사",
		lines = {
			"런던의 한 응접실. 두꺼운 외투를 입은 사내가 문을 닫고 목소리를 낮춘다.",
			"\"옛 항해 기록에 세 조각으로 쪼개진 해도가 있다고 하오. 대서양 너머로 이어지는 항로가 적혀 있다더군.\"",
			"\"학회는 조각을 모아 줄 모험가를 찾고 있소. 보수는 넉넉히 드리겠소.\"",
		},
		choices = {
			{ text = "의뢰를 받는다", effect = { coins = 200, fame = 5 }, result = "밀사가 사례금을 건넸다. 첫 조각은 리스본에 있다고 한다." },
			{ text = "정중히 거절한다", effect = { fame = 1 }, result = "밀사는 아쉬운 얼굴로 물러났다. 마음이 바뀌면 다시 찾아오라고 한다." },
		},
	},
	{
		id = "lc_2", chapter = "잃어버린 해도", title = "리스본 선술집의 늙은 항해사", portId = "lisbon", art = "tavern", npc = "늙은 항해사",
		requires = { { id = "lc_1", choice = 1 } },
		lines = {
			"항구 선술집 구석에서 한쪽 눈이 흐릿한 노인이 파도 소리를 닮은 목소리로 말한다.",
			"\"해도 조각? 허허, 아직도 그 얘기를 하는 사람이 있었군.\"",
			"\"젊을 땐 바다 끝이 궁금했지. 이 조각이 너를 거기까지 데려다 줄지도 모르겠네.\"",
		},
		choices = {
			{ text = "술 한 잔을 대접한다 (30코인)", cost = 30, effect = { cardId = "relic_lostchart_1", affinity = 1 }, result = "노인이 낡은 양피지를 꺼내 건넸다. 해도의 첫 조각이다!" },
			{ text = "경의를 표하고 이야기를 듣는다", effect = { cardId = "relic_lostchart_1", fame = 3 }, result = "노인은 오래도록 항해 이야기를 들려주고 조각을 내주었다." },
		},
	},
	{
		id = "lc_3", chapter = "잃어버린 해도", title = "총독궁의 수집가", portId = "venice", art = "library", npc = "귀족 수집가",
		requires = { { id = "lc_2" } }, minFame = 40,
		lines = {
			"베네치아 총독궁 가까운 서재. 유리 장식장 속에 지도와 나침반이 빼곡하다.",
			"\"세 조각 해도라... 둘째는 내 장식장에 있소. 하지만 거저 줄 순 없지.\"",
		},
		choices = {
			{ text = "500코인을 내고 산다", cost = 500, effect = { cardId = "relic_lostchart_2" }, result = "거래가 끝났다. 수집가가 정중히 조각을 포장해 주었다." },
			{ text = "명성을 걸고 설득한다 (명성 80 필요)", minFame = 80, effect = { cardId = "relic_lostchart_2", fame = 5 }, result = "당신의 이름을 알아본 수집가가 흔쾌히 조각을 내주었다." },
		},
	},
	{
		id = "lc_4", chapter = "잃어버린 해도", title = "화산 아래의 집터", portId = "naples", art = "ruins", npc = "발굴 책임자",
		requires = { { id = "lc_3" } }, minFame = 60,
		lines = {
			"나폴리 인근 발굴지. 검은 재 속에서 벽화가 드러나 있다.",
			"\"이 집 서재에서 지도 조각이 나왔소. 학회에서 온 사람에게만 보여 주기로 했지.\"",
		},
		choices = {
			{ text = "학회 이름으로 조각을 받는다", effect = { cardId = "relic_lostchart_3", fame = 5 }, result = "셋째 조각을 손에 넣었다. 이제 세 조각이 모였다!" },
			{ text = "발굴을 돕고 보수로 받는다", effect = { cardId = "relic_lostchart_3", coins = -100 }, result = "하루 종일 삽질을 도운 끝에 조각을 받았다." },
		},
	},
	{
		id = "lc_5", chapter = "잃어버린 해도", title = "세 조각이 맞물릴 때", portId = "amsterdam", art = "harbor", npc = "지도 제작자",
		requires = { { id = "lc_4" } }, requiresCards = { "relic_lostchart_1", "relic_lostchart_2", "relic_lostchart_3" },
		lines = {
			"암스테르담 항구가 보이는 제도실. 지도 제작자가 세 조각을 탁자 위에 맞춘다.",
			"\"이어졌소! 이 항로의 끝은… 지도에 없는 바다요. 당신이 첫 항해자가 되겠구려.\"",
		},
		choices = {
			{ text = "해도를 학회에 기증한다", effect = { cardId = "relic_lostchart", fame = 60, coins = 1500 }, result = "학회가 후한 사례를 했고, 당신의 이름이 해도의 서문에 실렸다." },
			{ text = "해도를 사본으로 남기고 간직한다", effect = { cardId = "relic_lostchart", fame = 20, coins = 400 }, result = "사본 한 부를 학회에 넘기고, 원본은 선장실에 걸었다." },
		},
	},
	{
		id = "hm_1", chapter = "항만청 사건부", title = "수상한 화물 명세서", portId = "london", art = "harbor", npc = "항만청 서기",
		lines = {
			"부두 옆 항만청 사무실. 서기가 장부 한 장을 탁자에 펼친다.",
			"\"명세서와 실제 화물이 맞지 않는 배가 있소. 누군가 세금을 빼돌린 것 같은데, 당신이 입회해 주겠소?\"",
		},
		choices = {
			{ text = "입회해서 장부를 대조한다", effect = { fame = 8, coins = 150 }, result = "대조 끝에 밀수 정황이 드러났다. 항만청이 사례금을 건넸다." },
			{ text = "바쁘다며 사양한다", effect = { fame = 1 }, result = "서기는 아쉬운 듯 장부를 덮었다." },
		},
	},
	{
		id = "smith_1", chapter = "조선소와 대포", title = "스톡홀름의 주조공", portId = "stockholm", art = "tavern", npc = "늙은 주조공",
		lines = {
			"쇳물 냄새가 가득한 주조장. 그을린 얼굴의 노인이 짧고 굵은 포신을 두드려 보인다.",
			"\"긴 대포만 대포인 줄 아나? 가까이서 쏘면 이 녀석이 훨씬 무섭소.\"",
			"\"쓰는 법을 아는 선장에게만 이걸 팔겠소.\"",
		},
		choices = {
			{ text = "주조 과정을 지켜보며 배운다", effect = { fame = 5 }, result = "주조공이 비법을 일러 주었다. 이제 카로네이드를 살 수 있다!" },
			{ text = "술 한 잔 사며 부탁한다 (40코인)", cost = 40, effect = { affinity = 1 }, result = "주조공이 웃으며 카로네이드 제작을 허락했다." },
		},
	},
	{
		id = "royal_1", chapter = "왕궁의 의뢰", title = "해협 측량 의뢰", portId = "copenhagen", art = "palace", npc = "왕실 서기관", minFame = 60,
		lines = {
			"덴마크 왕궁의 회랑. 서기관이 양피지 두루마리를 펼친다.",
			"\"이 좁은 해협은 나라의 목줄이오. 수심과 암초를 정확히 재어 주면 왕께서 크게 치하하시겠소.\"",
		},
		choices = {
			{ text = "측량을 맡아 해도를 만든다", effect = { cardId = "geo_sound_survey", fame = 10, coins = 300 }, result = "며칠에 걸쳐 측량을 마쳤다. 왕실이 후한 포상을 내렸다." },
			{ text = "측량은 사양하고 자문만 한다", effect = { fame = 3, coins = 50 }, result = "의견만 남기고 물러났다." },
		},
	},
	{
		id = "royal_2", chapter = "왕궁의 의뢰", title = "북쪽 바다의 소문", portId = "stockholm", art = "palace", npc = "궁정 학자", minFame = 90,
		lines = {
			"스웨덴 왕궁 도서실. 학자가 북쪽 해안에서 온 보고서를 내민다.",
			"\"얼음 낀 바다와 오로라, 그리고 한낮에도 어두운 하늘... 이 기록을 정리해 줄 사람이 필요하오.\"",
		},
		choices = {
			{ text = "기록을 정리하고 해석한다", effect = { cardId = "geo_north_notes", fame = 10 }, result = "기록을 해석해 학회에 보낼 보고서를 완성했다." },
			{ text = "사례만 받고 사본을 챙긴다", effect = { cardId = "geo_north_notes", coins = 200 }, result = "사본 한 부를 얻고 사례를 받았다." },
		},
	},
	{
		id = "royal_3", chapter = "왕궁의 의뢰", title = "학회 후원 증서", portId = "london", art = "palace", npc = "왕실 후원관", minFame = 150,
		lines = {
			"잉글랜드 왕궁의 접견실. 후원관이 봉랍 찍힌 증서를 두 손으로 든다.",
			"\"왕실은 지식을 찾는 자를 후원합니다. 당신의 이름을 증서에 올려도 되겠소?\"",
		},
		choices = {
			{ text = "영광스럽게 받는다", effect = { cardId = "relic_royal_charter", fame = 20, coins = 800 }, result = "후원 증서와 후원금이 내려왔다. 왕실의 눈에 들었다." },
			{ text = "학회에 대신 넘긴다", effect = { cardId = "relic_royal_charter", fame = 35 }, result = "증서를 학회에 기증해 학자들 사이에서 이름을 높였다." },
		},
	},
	{
		id = "npc_gardener", title = "세비야의 정원사", portId = "seville", art = "library", npc = "정원사",
		lines = {
			"햇살 가득한 정원. 흙 묻은 손으로 정원사가 작은 천 꾸러미를 흔든다.",
			"\"먼 항구에서 온 씨앗들이라오. 싹이 틀지는 모르지만, 키워 줄 사람을 찾고 있소.\"",
		},
		choices = {
			{ text = "씨앗을 받아 도감에 기록한다", effect = { cardId = "bot_new_seeds" }, result = "낯선 씨앗들을 꼼꼼히 기록했다." },
			{ text = "정원 일을 도와준다", effect = { cardId = "bot_new_seeds", fame = 3 }, result = "땀 흘려 도운 끝에 씨앗을 나눠 받았다." },
		},
	},
	{
		id = "npc_pirate", title = "마르세유의 퇴역 해적", portId = "marseille", art = "tavern", npc = "퇴역 해적", minFame = 30,
		lines = {
			"구석 자리에서 흉터 난 사내가 컵을 비운다.",
			"\"이제는 칼 대신 술잔만 든다오. 그래도 매복하기 좋은 바다는 눈 감고도 그리지.\"",
		},
		choices = {
			{ text = "해역 이야기를 기록한다", effect = { cardId = "geo_pirate_waters", fame = 3 }, result = "해적이 알려 준 위험 해역을 해도에 표시했다." },
			{ text = "술을 사 주고 친구가 된다 (30코인)", cost = 30, effect = { cardId = "geo_pirate_waters", affinity = 2 }, result = "해적이 껄껄 웃으며 비밀 항로까지 알려 주었다." },
		},
	},
	{
		id = "npc_observer", title = "천문대의 노학자", portId = "copenhagen", art = "observatory", npc = "노학자", minFame = 20,
		lines = {
			"한밤의 천문대. 큰 관측 기구 옆에서 백발의 학자가 하늘을 올려다본다.",
			"\"별은 거짓말을 하지 않는다네. 매일 밤 적은 기록이 항해자의 길이 되지.\"",
		},
		choices = {
			{ text = "기록을 베껴 가도 되는지 묻는다", effect = { cardId = "ast_old_observer", affinity = 1 }, result = "노학자가 웃으며 관측 기록 한 권을 빌려 주었다." },
			{ text = "별 이야기를 밤새 듣는다", effect = { fame = 5, cardId = "ast_old_observer" }, result = "새벽이 올 때까지 이야기를 듣고 기록의 사본을 받았다." },
		},
	},
	{
		id = "npc_fisher", title = "베르겐의 어부", portId = "bergen", art = "storm", npc = "늙은 어부",
		lines = {
			"비바람이 몰아치는 부두. 그물을 손보던 어부가 먼 바다를 가리킨다.",
			"\"깊은 바다엔 배보다 큰 그림자가 산다네. 그것이 지나가면 물이 소용돌이친다지.\"",
		},
		choices = {
			{ text = "그림자 이야기를 자세히 기록한다", effect = { cardId = "geo_fisherman_tale", fame = 3 }, result = "어부들의 오래된 이야기를 수첩에 옮겼다." },
			{ text = "생선 한 바구니를 사 준다 (20코인)", cost = 20, effect = { cardId = "geo_fisherman_tale", affinity = 1 }, result = "어부가 고마워하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_tulip_trader", title = "로테르담의 튤립 상인", portId = "rotterdam", art = "garden", npc = "튤립 상인",
		lines = {
			"\"이 알뿌리 하나가 집 한 채 값이라니, 미친 세상이지요?\"",
			"상인이 비단 천에 싼 알뿌리를 보여 준다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "bot_tulip", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "bot_tulip", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_plymouth_captain", title = "플리머스의 늙은 선장", portId = "plymouth", art = "storm", npc = "늙은 선장",
		lines = {
			"\"대서양을 건너려면 먼저 이 만의 바람부터 읽을 줄 알아야 하네.\"",
			"선장이 낡은 항해 일지를 내민다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "geo_dogger_bank", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "geo_dogger_bank", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_hull_whaler", title = "헐의 포경선 선원", portId = "hull", art = "storm", npc = "포경선 선원",
		lines = {
			"\"북쪽 얼음 사이에서 뿔 달린 고래를 봤어. 거짓말 아니야!\"",
			"선원이 흥분해서 손짓을 한다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "zoo_narwhal", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "zoo_narwhal", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_glasgow_weaver", title = "글래스고의 직공", portId = "glasgow", art = "market", npc = "리넨 직공",
		lines = {
			"\"클라이드 강물로 헹구면 리넨이 더 하얘진다오.\"",
			"직공이 막 짠 천을 펼쳐 보인다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "bot_flax", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "bot_flax", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_lubeck_clerk", title = "뤼베크의 한자 서기", portId = "lubeck", art = "library", npc = "한자 서기",
		lines = {
			"\"우리 도시들은 칼 대신 계약으로 바다를 지키지요.\"",
			"서기가 납 인장이 찍힌 문서를 보여 준다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "relic_hansa_seal", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "relic_hansa_seal", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_oslo_smith", title = "오슬로의 대장장이", portId = "oslo", art = "forge", npc = "대장장이",
		lines = {
			"\"옛 조상들의 투구 모양을 본떠 만든 거라오. 눈가리개가 멋지지?\"",
			"대장장이가 쇠를 두드리다 고개를 든다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "relic_viking_helm", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "relic_viking_helm", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_rochelle_salter", title = "라로셸의 염전 일꾼", portId = "la_rochelle", art = "market", npc = "염전 일꾼",
		lines = {
			"\"바닷물을 가두고 해를 기다리면 하얀 보석이 된다우.\"",
			"일꾼이 소금 한 줌을 손에 쥐어 준다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "geo_tidal_flat", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "geo_tidal_flat", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_porto_vintner", title = "포르투의 포도주 장인", portId = "porto", art = "tavern", npc = "포도주 장인",
		lines = {
			"\"배에 오래 실어도 상하지 않게 브랜디를 섞는 비법이지요.\"",
			"장인이 오크통을 두드려 보인다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "bot_grape", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "bot_grape", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_cadiz_pilot", title = "카디스의 도선사", portId = "cadiz", art = "storm", npc = "도선사",
		lines = {
			"\"보물 함대는 이 만에서 닻을 올렸지. 모래톱 위치는 아무에게나 안 알려 주네.\"",
			"도선사가 낡은 해도를 접는다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "relic_astrolabe", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "relic_astrolabe", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_barcelona_shipwright", title = "바르셀로나의 조선공", portId = "barcelona", art = "forge", npc = "조선공",
		lines = {
			"\"갤리선이든 범선이든, 뼈대가 곧 배의 목숨이오.\"",
			"조선공이 거대한 용골 앞에서 손을 털었다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "site_dry_dock", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "site_dry_dock", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_algiers_corsair", title = "알제의 옛 사략선원", portId = "algiers", art = "tavern", npc = "옛 사략선원",
		lines = {
			"\"바다에서 제일 무서운 건 폭풍이 아니라 깃발 없는 배지.\"",
			"그가 낮은 목소리로 웃었다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "relic_cutlass", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "relic_cutlass", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_tunis_digger", title = "튀니스의 발굴꾼", portId = "tunis", art = "ruins", npc = "발굴꾼",
		lines = {
			"\"모래 아래엔 아직도 옛 도시가 잠들어 있소.\"",
			"발굴꾼이 깨진 항아리 조각을 건넨다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "relic_carthage_coin", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "relic_carthage_coin", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_palermo_monk", title = "팔레르모의 수도사", portId = "palermo", art = "library", npc = "수도사",
		lines = {
			"\"이곳엔 세 문명의 책이 한 서가에 꽂혀 있지요.\"",
			"수도사가 두꺼운 필사본을 펼친다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "relic_mosaic", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "relic_mosaic", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_valletta_knight", title = "발레타의 기사", portId = "valletta", art = "palace", npc = "성채 기사",
		lines = {
			"\"이 성채는 바다를 지키려고 바위를 깎아 세웠다오.\"",
			"기사가 투구를 벗고 인사한다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "site_valletta_walls", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "site_valletta_walls", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_ragusa_merchant", title = "라구사의 상인", portId = "ragusa", art = "market", npc = "라구사 상인",
		lines = {
			"\"우리는 누구와도 싸우지 않고 모두와 거래하지요.\"",
			"상인이 소금 가마를 가리킨다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "min_rock_salt", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "min_rock_salt", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_athens_scholar", title = "아테네의 학자", portId = "athens", art = "ruins", npc = "학자",
		lines = {
			"\"이 돌기둥들은 아직도 철학자들의 말소리를 기억한다오.\"",
			"학자가 대리석 조각을 쓰다듬는다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "site_parthenon", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "site_parthenon", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_istanbul_trader", title = "이스탄불의 향신료 상인", portId = "istanbul", art = "market", npc = "향신료 상인",
		lines = {
			"\"동쪽의 길은 이 도시를 지나야만 서쪽으로 이어지지요.\"",
			"상인이 향신료 자루를 열어 향을 맡게 한다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "site_bazaar_grand", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "site_bazaar_grand", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_alexandria_sage", title = "알렉산드리아의 현자", portId = "alexandria", art = "library", npc = "현자",
		lines = {
			"\"불타 사라진 책들도 사람들의 기억 속에는 남았다네.\"",
			"현자가 별자리 그림을 펼친다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "site_pharos", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "site_pharos", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_tangier_guide", title = "탕헤르의 길잡이", portId = "tangier", art = "harbor", npc = "길잡이",
		lines = {
			"\"헤라클레스의 기둥을 지나면 이제 바다가 끝없이 이어지지.\"",
			"길잡이가 수평선을 가리킨다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "geo_strait_gibraltar", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "geo_strait_gibraltar", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_riga_timber", title = "리가의 목재상", portId = "riga", art = "market", npc = "목재상",
		lines = {
			"\"이 돛대감은 발트의 숲에서 강을 타고 내려온 것이오.\"",
			"목재상이 곧게 뻗은 통나무를 두드린다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "bot_birch", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "bot_birch", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_tallinn_watch", title = "탈린의 파수꾼", portId = "tallinn", art = "palace", npc = "파수꾼",
		lines = {
			"\"성벽 위에서 보면 상인의 배와 해적의 배가 한눈에 구분되지.\"",
			"파수꾼이 망원경을 건넨다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "relic_hansa_seal", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "relic_hansa_seal", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_helsinki_pilot", title = "헬싱키의 군도 도선사", portId = "helsinki", art = "storm", npc = "군도 도선사",
		lines = {
			"\"수천 개의 섬 사이를 지나려면 바위 이름을 모두 외워야 하오.\"",
			"도선사가 손으로 섬들을 헤아린다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "geo_skerries", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "geo_skerries", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_petersburg_tsar", title = "페테르부르크의 건설 감독", portId = "st_petersburg", art = "palace", npc = "건설 감독",
		lines = {
			"\"늪 위에 도시를 세우다니, 황제의 고집은 못 말리지.\"",
			"감독이 설계도를 펼친다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "geo_estuary", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "geo_estuary", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_koenigsberg_amber", title = "쾨니히스베르크의 호박 세공사", portId = "koenigsberg", art = "market", npc = "호박 세공사",
		lines = {
			"\"이 안에 갇힌 벌레는 수천 년 전부터 그대로라오.\"",
			"세공사가 호박을 빛에 비춘다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "min_amber_raw", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "min_amber_raw", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_visby_monk", title = "비스뷔의 수도사", portId = "visby", art = "ruins", npc = "수도사",
		lines = {
			"\"무너진 성당들은 이곳이 얼마나 부유했는지 말해 주지요.\"",
			"수도사가 돌 부스러기를 쓸어낸다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "relic_rune_stone", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "relic_rune_stone", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_palmas_sailor", title = "라스팔마스의 항해사", portId = "las_palmas", art = "harbor", npc = "항해사",
		lines = {
			"\"여기서 서쪽으로 닷새만 가면 새로운 땅이 있다는 소문이 있소.\"",
			"항해사가 서쪽 수평선을 가리킨다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "geo_trade_winds", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "geo_trade_winds", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_funchal_vintner", title = "푼샬의 포도주 상인", portId = "funchal", art = "tavern", npc = "포도주 상인",
		lines = {
			"\"배에서 흔들릴수록 맛이 깊어지는 술이라오.\"",
			"상인이 잔을 기울인다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "bot_dragon_tree", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "bot_dragon_tree", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_azores_whaler", title = "아조레스의 고래잡이", portId = "ponta_delgada", art = "storm", npc = "고래잡이",
		lines = {
			"\"산 위 망루에서 고래를 보면 종을 울리지.\"",
			"고래잡이가 작살을 어깨에 멘다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "zoo_sperm_whale", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "zoo_sperm_whale", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_palma_fisher", title = "팔마의 어부", portId = "palma", art = "harbor", npc = "어부",
		lines = {
			"\"문어는 항아리에 숨는 걸 좋아해서 쉽게 잡힌다오.\"",
			"어부가 토기 항아리를 보여 준다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "zoo_octopus", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "zoo_octopus", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_cagliari_saltman", title = "카글리아리의 염부", portId = "cagliari", art = "market", npc = "염부",
		lines = {
			"\"홍학이 오면 소금이 잘 익은 거라오.\"",
			"염부가 소금 산을 가리킨다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "zoo_flamingo", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "zoo_flamingo", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_ajaccio_shepherd", title = "코르시카의 양치기", portId = "ajaccio", art = "ruins", npc = "양치기",
		lines = {
			"\"이 섬의 관목숲은 도망자들의 오랜 은신처지.\"",
			"양치기가 지팡이에 기대어 웃는다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "bot_cork_oak", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "bot_cork_oak", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_toulon_shipwright", title = "툴롱의 선박 목수", portId = "toulon", art = "forge", npc = "선박 목수",
		lines = {
			"\"송진이 마르기 전에 틈을 메워야 한다오.\"",
			"목수가 역청 통을 휘젓는다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "bot_pine_resin", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "bot_pine_resin", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_syracuse_actor", title = "시라쿠사의 배우", portId = "syracuse", art = "ruins", npc = "늙은 배우",
		lines = {
			"\"이 돌 객석에서 수천 년 전에도 박수가 터졌소.\"",
			"배우가 극장 무대 위에서 인사한다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "relic_greek_vase", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "relic_greek_vase", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_ancona_notary", title = "안코나의 공증인", portId = "ancona", art = "library", npc = "공증인",
		lines = {
			"\"계약서는 바다가 변해도 변하지 않는 유일한 약속이오.\"",
			"공증인이 잉크병을 정리한다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "nav_portolan", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "nav_portolan", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_split_mason", title = "스플리트의 석공", portId = "split", art = "forge", npc = "석공",
		lines = {
			"\"황제의 궁전 안에 사람들이 집을 짓고 사는 곳이오.\"",
			"석공이 대리석 조각을 쓰다듬는다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "min_marble", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "min_marble", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_salonica_priest", title = "테살로니키의 사제", portId = "thessaloniki", art = "library", npc = "사제",
		lines = {
			"\"이 도시의 성화는 천 년 동안 바뀌지 않았소.\"",
			"사제가 촛불을 켠다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "relic_icon", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "relic_icon", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_candia_diver", title = "칸디아의 잠수부", portId = "candia", art = "harbor", npc = "해면 잠수부",
		lines = {
			"\"바닷속에는 옛 항아리가 가득 쌓여 있지요.\"",
			"잠수부가 젖은 항아리 조각을 건넨다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "relic_amphora", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "relic_amphora", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_rhodes_knight", title = "로도스의 기사", portId = "rhodes", art = "palace", npc = "기사",
		lines = {
			"\"한때 이 항구 입구에 청동 거인이 서 있었다고 하오.\"",
			"기사가 항구 입구를 가리킨다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "site_castle_ruin", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "site_castle_ruin", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_cyprus_miner", title = "키프로스의 광부", portId = "famagusta", art = "forge", npc = "광부",
		lines = {
			"\"구리라는 말이 이 섬 이름에서 나왔다오.\"",
			"광부가 구릿빛 돌을 쥐어 준다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "min_copper_ore", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "min_copper_ore", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_smyrna_dealer", title = "이즈미르의 융단 상인", portId = "smyrna", art = "market", npc = "융단 상인",
		lines = {
			"\"한 땀 한 땀 짠 융단이니 값을 깎지 마시오.\"",
			"상인이 붉은 융단을 펼친다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "relic_sundial", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "relic_sundial", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_acre_templar", title = "아크레의 옛 기사", portId = "acre", art = "palace", npc = "옛 기사",
		lines = {
			"\"성벽은 무너져도 이 땅을 지키려던 맹세는 남았소.\"",
			"기사가 낡은 십자 문장을 만진다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "relic_icon", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "relic_icon", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_oran_potter", title = "오랑의 도공", portId = "oran", art = "market", npc = "도공",
		lines = {
			"\"붉은 흙을 구우면 이렇게 단단한 항아리가 되지요.\"",
			"도공이 물레를 멈춘다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "relic_amphora", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "relic_amphora", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_benghazi_nomad", title = "벵가지의 유목민", portId = "benghazi", art = "ruins", npc = "유목민",
		lines = {
			"\"사막의 모래 아래엔 옛 그리스인의 도시가 잠들어 있소.\"",
			"유목민이 낙타 고삐를 쥔다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "zoo_camel", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "zoo_camel", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_malaga_raisin", title = "말라가의 건포도 농부", portId = "malaga", art = "market", npc = "농부",
		lines = {
			"\"햇볕에 말린 포도는 먼 북쪽에서도 귀한 대접을 받지요.\"",
			"농부가 건포도 한 줌을 건넨다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "bot_grape", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "bot_grape", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_gibraltar_guard", title = "지브롤터의 경비병", portId = "gibraltar", art = "palace", npc = "경비병",
		lines = {
			"\"이 바위가 지켜보는 한 해협은 아무도 몰래 지나갈 수 없소.\"",
			"경비병이 해협 쪽을 가리킨다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "geo_strait_gibraltar", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "geo_strait_gibraltar", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_cartagena_miner", title = "카르타헤나의 광부", portId = "cartagena", art = "forge", npc = "광부",
		lines = {
			"\"로마 시절 갱도가 아직도 산속에 이어져 있다오.\"",
			"광부가 등불을 높이 든다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "min_lead", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "min_lead", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_trieste_clerk", title = "트리에스테의 서기", portId = "trieste", art = "library", npc = "서기",
		lines = {
			"\"항구에 닿는 화물은 모두 장부에 한 줄씩 남지요.\"",
			"서기가 장부를 넘긴다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "site_customs_house", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "site_customs_house", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_messina_fisher", title = "메시나의 창고기잡이", portId = "messina", art = "harbor", npc = "어부",
		lines = {
			"\"좁은 해협에서는 거대한 물고기를 작살로 잡소.\"",
			"어부가 긴 작살을 보여 준다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "zoo_tuna", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "zoo_tuna", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_corfu_priest", title = "코르푸의 사제", portId = "corfu", art = "library", npc = "사제",
		lines = {
			"\"섬의 성인은 이 항구를 몇 번이나 지켰다고 하오.\"",
			"사제가 성화 앞에 촛불을 켠다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "relic_icon", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "relic_icon", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_beirut_cedar", title = "베이루트의 삼나무 장수", portId = "beirut", art = "market", npc = "나무 장수",
		lines = {
			"\"배의 돛대는 레바논의 삼나무가 제일이지.\"",
			"장수가 향긋한 나무토막을 건넨다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "bot_cedar_lebanon", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "bot_cedar_lebanon", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_damietta_farmer", title = "다미에타의 농부", portId = "damietta", art = "garden", npc = "농부",
		lines = {
			"\"강물이 불어났다 빠지면 땅이 저절로 기름지다오.\"",
			"농부가 진흙 묻은 손을 턴다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "bot_papyrus", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "bot_papyrus", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_bone_coral", title = "본의 산호 채취꾼", portId = "bone", art = "harbor", npc = "산호 채취꾼",
		lines = {
			"\"붉은 산호는 바닷속 보석이라 귀부인들이 탐내지요.\"",
			"채취꾼이 붉은 가지를 보여 준다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "zoo_octopus", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "zoo_octopus", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_casablanca_merchant", title = "카사블랑카의 곡물 상인", portId = "casablanca", art = "market", npc = "곡물 상인",
		lines = {
			"\"대서양 쪽 항구는 사하라 대상의 마지막 목적지지요.\"",
			"상인이 낙타 짐 보따리를 풀어 보인다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "site_casablanca_mosque", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "site_casablanca_mosque", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_safi_potter", title = "사피의 도공", portId = "safi", art = "market", npc = "도공",
		lines = {
			"\"푸른 유약은 바다색을 훔친 거라오.\"",
			"도공이 갓 구운 접시를 건넨다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "relic_astrolabe_arab", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "relic_astrolabe_arab", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_agadir_herder", title = "아가디르의 염소지기", portId = "agadir", art = "garden", npc = "염소지기",
		lines = {
			"\"아르간 열매를 먹은 염소가 나무 위에 올라간다오.\"",
			"염소지기가 나무를 가리킨다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "bot_acacia", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "bot_acacia", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_praia_sailor", title = "프라이아의 늙은 항해사", portId = "praia", art = "harbor", npc = "늙은 항해사",
		lines = {
			"\"여기서 서쪽 바다는 아무도 끝을 본 적이 없다네.\"",
			"항해사가 수평선을 오래 바라본다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "geo_canary_current", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "geo_canary_current", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_stlouis_trader", title = "생루이의 고무 상인", portId = "saint_louis", art = "market", npc = "고무 상인",
		lines = {
			"\"아카시아 수액이 이렇게 비싸게 팔릴 줄 누가 알았겠소.\"",
			"상인이 투명한 덩어리를 보여 준다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "bot_acacia", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "bot_acacia", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_dakar_fisher", title = "다카르의 어부", portId = "dakar", art = "harbor", npc = "어부",
		lines = {
			"\"바다는 풍성하지만 물살은 거칠고 무자비하오.\"",
			"어부가 형형색색 카누를 가리킨다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "geo_canary_current", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "geo_canary_current", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_bissau_guide", title = "비사우의 강 안내인", portId = "bissau", art = "garden", npc = "강 안내인",
		lines = {
			"\"맹그로브 숲은 길을 잃기 딱 좋은 미로라오.\"",
			"안내인이 긴 장대를 들어 보인다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "bot_mangrove", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "bot_mangrove", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_freetown_doctor", title = "프리타운의 의사", portId = "freetown", art = "library", npc = "의사",
		lines = {
			"\"이 땅의 열병은 약초와 인내로만 이길 수 있소.\"",
			"의사가 말린 약초 다발을 건넨다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "bot_kola", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "bot_kola", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_elmina_factor", title = "엘미나의 상관장", portId = "elmina", art = "palace", npc = "상관장",
		lines = {
			"\"금가루 한 줌의 무게가 곧 이 성의 가치요.\"",
			"상관장이 작은 저울을 만진다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "relic_gold_weights", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "relic_gold_weights", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_ouidah_priest", title = "위다의 사제", portId = "ouidah", art = "ruins", npc = "사제",
		lines = {
			"\"숲에는 조상의 목소리가 깃들어 있다오.\"",
			"사제가 가면을 쓰다듬는다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "relic_mask", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "relic_mask", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_lagos_weaver", title = "라고스의 직공", portId = "lagos", art = "market", npc = "직공",
		lines = {
			"\"우리 천은 한 가닥도 같은 무늬가 없지요.\"",
			"직공이 직물을 펼친다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "relic_kente", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "relic_kente", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_calabar_pilot", title = "칼라바르의 강 도선사", portId = "calabar", art = "harbor", npc = "도선사",
		lines = {
			"\"삼각주의 물길은 매 계절 모양이 달라진다오.\"",
			"도선사가 손으로 물길을 그린다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "geo_niger_delta", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "geo_niger_delta", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_saotome_planter", title = "상투메의 농장주", portId = "sao_tome", art = "garden", npc = "농장주",
		lines = {
			"\"화산토에서는 사탕수수가 두 배로 자라지요.\"",
			"농장주가 밭을 가리킨다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "bot_kola", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "bot_kola", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_luanda_trader", title = "루안다의 상인", portId = "luanda", art = "market", npc = "상인",
		lines = {
			"\"내륙의 구리와 상아가 이 항구로 모입니다.\"",
			"상인이 구릿빛 돌을 쥐여 준다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "min_copper_ore", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "min_copper_ore", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_benguela_hunter", title = "벵겔라의 사냥꾼", portId = "benguela", art = "ruins", npc = "사냥꾼",
		lines = {
			"\"타조 깃털은 사막에서 가장 가벼운 재산이오.\"",
			"사냥꾼이 깃털 다발을 보여 준다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "zoo_ostrich", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "zoo_ostrich", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_helena_keeper", title = "세인트헬레나의 등대지기", portId = "st_helena", art = "harbor", npc = "등대지기",
		lines = {
			"\"이 섬은 바다 한가운데 유일한 쉼터라오.\"",
			"등대지기가 차를 따라 준다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "geo_doldrums", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "geo_doldrums", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_cape_pilot", title = "케이프타운의 도선사", portId = "cape_town", art = "storm", npc = "도선사",
		lines = {
			"\"두 대양이 만나는 곶에서는 파도가 산처럼 일지요.\"",
			"도선사가 먼 곶을 가리킨다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "geo_cape_good_hope", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "geo_cape_good_hope", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_mozambique_gov", title = "모잠비크의 총독", portId = "mozambique", art = "palace", npc = "총독",
		lines = {
			"\"이 성은 인도로 가는 모든 배의 중간 기착지요.\"",
			"총독이 항구를 내려다본다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "geo_mozambique_channel", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "geo_mozambique_channel", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_kilwa_chronicler", title = "킬와의 기록관", portId = "kilwa", art = "library", npc = "기록관",
		lines = {
			"\"한때 이 도시의 금이 바다 건너까지 소문났다오.\"",
			"기록관이 낡은 두루마리를 펼친다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "relic_swahili_door", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "relic_swahili_door", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_mombasa_dhow", title = "몸바사의 다우선 선장", portId = "mombasa", art = "harbor", npc = "다우선 선장",
		lines = {
			"\"겨울 계절풍을 타면 인도까지 한 달이오.\"",
			"선장이 삼각돛을 가리킨다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "geo_monsoon", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "geo_monsoon", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_zanzibar_clove", title = "잔지바르의 정향 농부", portId = "zanzibar", art = "garden", npc = "정향 농부",
		lines = {
			"\"꽃봉오리가 붉어지기 전에 따야 향이 좋다오.\"",
			"농부가 말린 꽃봉오리를 쥐여 준다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "bot_clove_tree", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "bot_clove_tree", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_mogadishu_trader", title = "모가디슈의 상인", portId = "mogadishu", art = "market", npc = "상인",
		lines = {
			"\"용연향 한 조각이 배 한 척 값이라오.\"",
			"상인이 회색 덩어리를 보여 준다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "relic_dhow_model", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "relic_dhow_model", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_aden_guard", title = "아덴의 경비병", portId = "aden", art = "palace", npc = "경비병",
		lines = {
			"\"홍해로 드나드는 배는 모두 이 문을 지나야 하오.\"",
			"경비병이 바위 절벽을 가리킨다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "geo_red_sea", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "geo_red_sea", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_mocha_merchant", title = "모카의 커피 상인", portId = "mocha", art = "market", npc = "커피 상인",
		lines = {
			"\"우리 커피 열매는 한 알도 밖으로 못 나가던 보물이었소.\"",
			"상인이 볶은 열매를 건넨다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "relic_astrolabe_arab", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "relic_astrolabe_arab", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_jeddah_pilgrim", title = "제다의 순례자", portId = "jeddah", art = "ruins", npc = "순례자",
		lines = {
			"\"먼 곳에서 온 이들이 이 항구에서 첫 기도를 올린다오.\"",
			"순례자가 염주를 만진다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "relic_prayer_beads", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "relic_prayer_beads", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_muscat_diver", title = "무스카트의 진주잠수부", portId = "muscat", art = "harbor", npc = "진주 잠수부",
		lines = {
			"\"숨을 오래 참을수록 큰 진주를 만나지요.\"",
			"잠수부가 조개를 쥔다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "zoo_pearl_oyster", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "zoo_pearl_oyster", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_hormuz_navigator", title = "호르무즈의 항해사", portId = "bandar_abbas", art = "storm", npc = "항해사",
		lines = {
			"\"좁은 입구에서는 바람보다 해류가 무섭지요.\"",
			"항해사가 해도를 펼친다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "geo_persian_gulf", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "geo_persian_gulf", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_basra_gardener", title = "바스라의 정원사", portId = "basra", art = "garden", npc = "정원사",
		lines = {
			"\"대추야자는 발은 물에, 머리는 불 속에 둔다고들 하지요.\"",
			"정원사가 야자를 올려다본다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "bot_date_palm", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "bot_date_palm", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_diu_captain", title = "디우의 요새 대장", portId = "diu", art = "palace", npc = "요새 대장",
		lines = {
			"\"이 요새는 바다 위의 마지막 방벽이었소.\"",
			"대장이 성벽을 두드린다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "relic_dhow_model", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "relic_dhow_model", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_surat_banker", title = "수라트의 환전상", portId = "surat", art = "market", npc = "환전상",
		lines = {
			"\"먼 나라 돈도 이 저울 위에서는 모두 같지요.\"",
			"환전상이 금화를 저울에 올린다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "min_saltpeter", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "min_saltpeter", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_goa_priest", title = "고아의 신부", portId = "goa", art = "library", npc = "신부",
		lines = {
			"\"이 땅의 향신료 냄새가 기도 속에도 스며든다오.\"",
			"신부가 성당 문을 연다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "site_goa_church", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "site_goa_church", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_calicut_zamorin", title = "캘리컷의 상인 대표", portId = "calicut", art = "market", npc = "상인 대표",
		lines = {
			"\"후추 한 자루에 수많은 항로가 얽혀 있다오.\"",
			"대표가 후추 열매를 건넨다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "bot_pepper_vine", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "bot_pepper_vine", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_cochin_fisher", title = "코친의 어부", portId = "cochin", art = "harbor", npc = "어부",
		lines = {
			"\"이 거대한 그물은 여러 사람이 함께 내려야 하오.\"",
			"어부가 지렛대를 가리킨다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "site_cochin_nets", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "site_cochin_nets", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_colombo_gem", title = "콜롬보의 보석상", portId = "colombo", art = "market", npc = "보석상",
		lines = {
			"\"사파이어는 빛을 받아야 속살을 보여 준다오.\"",
			"보석상이 푸른 돌을 빛에 비춘다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "min_sapphire", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "min_sapphire", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_madras_weaver", title = "마드라스의 직공", portId = "madras", art = "market", npc = "직공",
		lines = {
			"\"한 폭의 천에 꽃밭이 들어 있지요.\"",
			"직공이 인쇄 천을 펼친다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "bot_indigo_plant", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "bot_indigo_plant", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_calcutta_clerk", title = "캘커타의 서기", portId = "calcutta", art = "library", npc = "서기",
		lines = {
			"\"강물처럼 장부도 끝없이 이어진다오.\"",
			"서기가 붓을 내려놓는다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "geo_ganges_delta", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "geo_ganges_delta", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_malacca_harbor", title = "말라카의 항만 관리", portId = "malacca", art = "palace", npc = "항만 관리",
		lines = {
			"\"동서의 모든 배가 이 좁은 물길에서 만나지.\"",
			"관리가 해협을 가리킨다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "geo_malacca_strait", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "geo_malacca_strait", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_louis_sailor", title = "포트루이의 선원", portId = "port_louis", art = "harbor", npc = "선원",
		lines = {
			"\"이 섬에는 날지 못하는 커다란 새가 살았다고 하오.\"",
			"선원이 해변을 가리킨다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "geo_mozambique_channel", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "geo_mozambique_channel", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_manila_friar", title = "마닐라의 수도사", portId = "manila", art = "library", npc = "수도사",
		lines = {
			"\"갈레온은 해마다 은을 싣고 태평양을 건너오지요.\"",
			"수도사가 낡은 해도를 편다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "site_manila_intramuros", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "site_manila_intramuros", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_macau_trader", title = "마카오의 무역상", portId = "macau", art = "market", npc = "무역상",
		lines = {
			"\"도자기와 차는 이 작은 반도에서 서쪽으로 흘러가오.\"",
			"무역상이 푸른 접시를 올려놓는다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "relic_ming_vase", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "relic_ming_vase", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_canton_hong", title = "광저우의 행상인", portId = "canton", art = "market", npc = "행상인",
		lines = {
			"\"서양 상인은 이 열세 개 상관 안에서만 거래할 수 있소.\"",
			"행상인이 장부를 넘긴다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "relic_lacquer_box", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "relic_lacquer_box", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_amoy_junk", title = "샤먼의 정크선 선장", portId = "amoy", art = "harbor", npc = "정크선 선장",
		lines = {
			"\"우리 배는 대나무 돛으로 바람을 비스듬히도 탄다오.\"",
			"선장이 돛을 가리킨다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "geo_south_china_sea", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "geo_south_china_sea", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_ningbo_monk", title = "닝보의 승려", portId = "ningbo", art = "ruins", npc = "승려",
		lines = {
			"\"차 한 잔의 시간이 바다 몇 날보다 길 때도 있지요.\"",
			"승려가 찻잔을 건넨다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "bot_tea_plant", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "bot_tea_plant", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_shanghai_weaver", title = "상하이의 직공", portId = "shanghai", art = "market", npc = "직공",
		lines = {
			"\"누에가 천천히 뽑은 실이 빛나는 천이 되지요.\"",
			"직공이 비단을 펼친다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "bot_mulberry", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "bot_mulberry", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_tianjin_boatman", title = "톈진의 뱃사공", portId = "tianjin", art = "harbor", npc = "뱃사공",
		lines = {
			"\"이 물길로 쌀과 비단이 황제의 도성까지 올라가오.\"",
			"뱃사공이 노를 짚는다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "site_great_wall", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "site_great_wall", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_nagasaki_interpreter", title = "나가사키의 통역관", portId = "nagasaki", art = "library", npc = "통역관",
		lines = {
			"\"서양 책은 이 작은 섬을 통해서만 들어옵니다.\"",
			"통역관이 네덜란드 책을 보여 준다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "site_dejima", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "site_dejima", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_osaka_merchant", title = "오사카의 쌀 상인", portId = "osaka", art = "market", npc = "쌀 상인",
		lines = {
			"\"이 도시에서는 쌀 한 가마가 곧 돈이오.\"",
			"상인이 쌀 영수증을 흔든다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "bot_rice_paddy", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "bot_rice_paddy", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_edo_samurai", title = "에도의 무사", portId = "edo", art = "palace", npc = "무사",
		lines = {
			"\"검은 마음을 지키기 위해 허리에 찬다오.\"",
			"무사가 조용히 인사한다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "relic_samurai_helm", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "relic_samurai_helm", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_hakodate_fisher", title = "하코다테의 어부", portId = "hakodate", art = "storm", npc = "어부",
		lines = {
			"\"북쪽 바다는 오징어가 달처럼 떠오르지요.\"",
			"어부가 등불을 흔든다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "zoo_squid_giant", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "zoo_squid_giant", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_busan_envoy", title = "부산의 왜관 관리", portId = "busan", art = "palace", npc = "왜관 관리",
		lines = {
			"\"인삼이 이 길로 바다를 건너가지요.\"",
			"관리가 인삼 뿌리를 보여 준다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "bot_ginseng_root", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "bot_ginseng_root", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_busan_whaler", title = "부산의 고래잡이", portId = "busan", art = "harbor", npc = "고래잡이",
		lines = {
			"\"겨울이면 동해로 큰 고래가 지나갑니다. 배보다 더 큰 놈이지요.\"",
			"고래잡이가 작살 자국이 남은 오래된 뼈를 보여 준다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "zoo_whale", fame = 3 }, result = "수첩에 고래 이야기를 옮겨 적었다. 고래 카드를 얻었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "zoo_whale", affinity = 1 }, result = "고래잡이가 기뻐하며 바다 이야기를 더 들려주었다." },
		},
	},
	{
		id = "npc_incheon_clam", title = "인천의 조개잡이", portId = "incheon", art = "harbor", npc = "조개잡이",
		lines = {
			"\"썰물에 갯벌이 드러나면 온 마을이 나서지요.\"",
			"조개잡이가 호미를 든다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "zoo_crane", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "zoo_crane", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_tainan_planter", title = "타이난의 농장주", portId = "tainan", art = "garden", npc = "농장주",
		lines = {
			"\"사탕수수와 장뇌가 이 섬의 재산이오.\"",
			"농장주가 밭을 가리킨다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "bot_bamboo", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "bot_bamboo", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_hoian_lantern", title = "호이안의 등불 장수", portId = "hoi_an", art = "market", npc = "등불 장수",
		lines = {
			"\"밤이 되면 강 전체가 등불 바다가 된다오.\"",
			"장수가 색색 등을 흔든다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "relic_lacquer_box", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "relic_lacquer_box", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_bangkok_abbot", title = "방콕의 주지", portId = "bangkok", art = "ruins", npc = "주지",
		lines = {
			"\"사원의 금은 이 땅 사람들의 믿음이라오.\"",
			"주지가 합장한다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "relic_buddha_head", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "relic_buddha_head", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_rangoon_pilgrim", title = "양곤의 순례자", portId = "rangoon", art = "ruins", npc = "순례자",
		lines = {
			"\"황금 탑은 멀리서도 길을 알려 주지요.\"",
			"순례자가 탑을 올려다본다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "site_shwedagon", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "site_shwedagon", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_singapore_harbor", title = "싱가포르의 항만 관리", portId = "singapore", art = "harbor", npc = "항만 관리",
		lines = {
			"\"여기는 동서 항로의 목구멍 같은 곳이오.\"",
			"관리가 해협을 가리킨다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "geo_malacca_strait", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "geo_malacca_strait", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_batavia_burgher", title = "바타비아의 시민", portId = "batavia", art = "palace", npc = "시민",
		lines = {
			"\"고향의 운하를 열대에 옮겨 놓았지요.\"",
			"시민이 운하를 가리킨다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "site_batavia_canal", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "site_batavia_canal", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_makassar_sailor", title = "마카사르의 부기 선원", portId = "makassar", art = "harbor", npc = "선원",
		lines = {
			"\"우리는 바람을 읽는 데 평생을 쓴다오.\"",
			"선원이 별을 올려다본다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "zoo_pearl_oyster", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "zoo_pearl_oyster", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_ternate_sultan", title = "테르나테의 술탄 사자", portId = "ternate", art = "palace", npc = "술탄의 사자",
		lines = {
			"\"정향은 이 작은 섬의 하늘이 준 선물이오.\"",
			"사자가 정향 가지를 보여 준다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "bot_clove_tree", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "bot_clove_tree", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_ambon_farmer", title = "암본의 농부", portId = "ambon", art = "garden", npc = "농부",
		lines = {
			"\"꽃봉오리를 따는 아침이 일 년 중 가장 바쁘지요.\"",
			"농부가 광주리를 든다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "bot_nutmeg_tree", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "bot_nutmeg_tree", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_banda_planter", title = "반다의 농장주", portId = "banda", art = "garden", npc = "농장주",
		lines = {
			"\"한 알의 씨앗이 금보다 귀한 섬이라오.\"",
			"농장주가 육두구를 건넨다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "bot_nutmeg_tree", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "bot_nutmeg_tree", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_brunei_boatman", title = "브루나이의 뱃사공", portId = "brunei", art = "harbor", npc = "뱃사공",
		lines = {
			"\"우리는 물 위에 집을 짓고 산다오.\"",
			"뱃사공이 수상 가옥을 가리킨다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "zoo_orangutan", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "zoo_orangutan", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_halifax_fisher", title = "핼리팩스의 어부", portId = "halifax", art = "harbor", npc = "어부",
		lines = {
			"\"대구는 안개 속에서 가장 많이 잡히지요.\"",
			"어부가 그물을 풀어 보인다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "am_cod_grand", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "am_cod_grand", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_stjohns_skipper", title = "세인트존스의 선장", portId = "st_johns", art = "storm", npc = "어선 선장",
		lines = {
			"\"빙산이 오면 그해 고기잡이는 끝이오.\"",
			"선장이 먼 수평선을 가리킨다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "geo_labrador_current", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "geo_labrador_current", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_quebec_trapper", title = "퀘벡의 사냥꾼", portId = "quebec", art = "market", npc = "모피 사냥꾼",
		lines = {
			"\"비버 가죽 한 장이 여기서는 장화 한 켤레 값이오.\"",
			"사냥꾼이 가죽을 펼친다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "am_beaver", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "am_beaver", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_boston_printer", title = "보스턴의 인쇄공", portId = "boston", art = "library", npc = "인쇄공",
		lines = {
			"\"이 작은 활자가 바다 건너 소식을 실어 나르오.\"",
			"인쇄공이 잉크 묻은 손을 턴다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "site_old_north_church", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "site_old_north_church", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_newyork_trader", title = "뉴욕의 모피 상인", portId = "new_york", art = "market", npc = "모피 상인",
		lines = {
			"\"허드슨 강을 따라 내륙의 가죽이 모두 이리로 내려오오.\"",
			"상인이 장부를 펼친다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "am_beaver", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "am_beaver", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_philly_printer", title = "필라델피아의 학자", portId = "philadelphia", art = "library", npc = "학자",
		lines = {
			"\"이 도시는 책과 토론으로 자랐소.\"",
			"학자가 서가를 정리한다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "site_independence_hall", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "site_independence_hall", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_charleston_planter", title = "찰스턴의 농장주", portId = "charleston", art = "garden", npc = "농장주",
		lines = {
			"\"쌀과 인디고가 이 땅을 먹여 살리오.\"",
			"농장주가 논을 가리킨다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "am_tomato", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "am_tomato", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_neworleans_trader", title = "뉴올리언스의 상인", portId = "new_orleans", art = "market", npc = "상인",
		lines = {
			"\"강물이 모든 물건을 이 항구로 데려오지요.\"",
			"상인이 강을 가리킨다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "geo_mississippi", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "geo_mississippi", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_nassau_pirate", title = "나소의 늙은 해적", portId = "nassau", art = "tavern", npc = "늙은 해적",
		lines = {
			"\"깃발 아래서는 모두가 평등했지, 몫도 똑같았고.\"",
			"해적이 럼 잔을 들어 보인다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "am_pirate_code", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "am_pirate_code", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_havana_guard", title = "아바나의 요새 경비", portId = "havana", art = "palace", npc = "경비병",
		lines = {
			"\"보물 함대는 이 항구에서 모여 함께 출발하오.\"",
			"경비병이 쇠사슬을 가리킨다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "site_castillo_havana", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "site_castillo_havana", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_veracruz_clerk", title = "베라크루스의 서기", portId = "veracruz", art = "library", npc = "서기",
		lines = {
			"\"은 한 상자가 도착할 때마다 장부가 한 장 늘지요.\"",
			"서기가 붓을 든다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "am_aztec_calendar", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "am_aztec_calendar", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_campeche_cutter", title = "캄페체의 벌목꾼", portId = "campeche", art = "forge", npc = "로그우드 벌목꾼",
		lines = {
			"\"이 나무는 붉은색보다 더 짙은 보라를 낸다오.\"",
			"벌목꾼이 톱을 내려놓는다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "am_logwood_tree", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "am_logwood_tree", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_kingston_merchant", title = "킹스턴의 상인", portId = "kingston", art = "market", npc = "상인",
		lines = {
			"\"설탕과 럼이 이 섬의 통화라오.\"",
			"상인이 럼 통을 두드린다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "site_port_royal", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "site_port_royal", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_santodomingo_monk", title = "산토도밍고의 수사", portId = "santo_domingo", art = "library", npc = "수사",
		lines = {
			"\"신대륙에서 가장 먼저 세워진 도시지요.\"",
			"수사가 오래된 성당을 가리킨다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "am_amber_dominican", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "am_amber_dominican", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_sanjuan_gunner", title = "산후안의 포병", portId = "san_juan", art = "palace", npc = "포병",
		lines = {
			"\"이 요새는 몇 번의 포위에도 무너지지 않았소.\"",
			"포병이 대포를 쓰다듬는다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "site_fortress_morro", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "site_fortress_morro", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_bridgetown_planter", title = "브리지타운의 농장주", portId = "bridgetown", art = "garden", npc = "농장주",
		lines = {
			"\"설탕 한 통이 금 한 통과 같다오.\"",
			"농장주가 사탕수수를 꺾는다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "site_sugar_mill", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "site_sugar_mill", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_trinidad_guide", title = "포트오브스페인의 안내인", portId = "port_of_spain", art = "garden", npc = "안내인",
		lines = {
			"\"이 섬엔 카카오가 숲처럼 자란다오.\"",
			"안내인이 열매를 건넨다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "am_cacao_pod", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "am_cacao_pod", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_laguaira_diver", title = "라과이라의 진주잠수부", portId = "la_guaira", art = "harbor", npc = "진주 잠수부",
		lines = {
			"\"카리브 진주는 바다의 눈물이라 불리지요.\"",
			"잠수부가 조개를 쥔다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "am_pearl_carib", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "am_pearl_carib", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_cartagena_gov", title = "카르타헤나의 총독", portId = "cartagena_indias", art = "palace", npc = "총독",
		lines = {
			"\"보물 함대가 이 성벽 아래서 쉬어 갑니다.\"",
			"총독이 성벽을 가리킨다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "site_cartagena_walls", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "site_cartagena_walls", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_portobelo_factor", title = "포르토벨로의 상관장", portId = "portobelo", art = "market", npc = "상관장",
		lines = {
			"\"해마다 한 번 장터가 열리면 도시가 일어서지요.\"",
			"상관장이 은화를 센다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "am_silver_ore_potosi", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "am_silver_ore_potosi", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_paramaribo_guide", title = "파라마리보의 길잡이", portId = "paramaribo", art = "garden", npc = "길잡이",
		lines = {
			"\"밀림에는 길이 없어서 물길이 곧 길이오.\"",
			"길잡이가 노를 내민다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "am_jaguar", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "am_jaguar", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_belem_rubber", title = "벨렝의 고무 채취꾼", portId = "belem", art = "garden", npc = "채취꾼",
		lines = {
			"\"흰 수액을 모으면 공처럼 튀는 물건이 되오.\"",
			"채취꾼이 고무 공을 튕긴다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "am_rubber_tree", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "am_rubber_tree", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_recife_sailor", title = "헤시피의 뱃사람", portId = "recife", art = "harbor", npc = "뱃사람",
		lines = {
			"\"여기서 아프리카까지는 바람만 타면 금방이오.\"",
			"뱃사람이 동쪽을 가리킨다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "am_turtle_green", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "am_turtle_green", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_salvador_priest", title = "살바도르의 신부", portId = "salvador", art = "library", npc = "신부",
		lines = {
			"\"이 도시는 한때 신대륙의 수도였소.\"",
			"신부가 종탑을 가리킨다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "am_brazilwood_tree", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "am_brazilwood_tree", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_rio_fisher", title = "리우의 어부", portId = "rio", art = "harbor", npc = "어부",
		lines = {
			"\"이 만은 1월에 발견되어 강 이름이 붙었지요.\"",
			"어부가 설탕빵 산을 가리킨다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "geo_sugarloaf", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "geo_sugarloaf", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_montevideo_gaucho", title = "몬테비데오의 가우초", portId = "montevideo", art = "market", npc = "가우초",
		lines = {
			"\"끝없는 초원에서 말과 소가 곧 재산이오.\"",
			"가우초가 말고삐를 당긴다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "geo_rio_plata", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "geo_rio_plata", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_ba_trader", title = "부에노스아이레스의 상인", portId = "buenos_aires", art = "market", npc = "상인",
		lines = {
			"\"가죽과 은이 이 항구를 통해 바다를 건너지요.\"",
			"상인이 가죽 더미를 가리킨다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "am_colonial_deed", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "am_colonial_deed", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_pac_sydney", title = "시드니의 안내인", portId = "sydney", art = "harbor", npc = "안내인",
		lines = {
			"\"이곳 바다는 처음 오는 이에게는 낯설지만, 알고 나면 보물창고이지요.\"",
			"안내인이 해도 한 장을 펼쳐 보인다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "pac_kangaroo", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "pac_kangaroo", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_pac_hobart", title = "호바트의 안내인", portId = "hobart", art = "harbor", npc = "안내인",
		lines = {
			"\"이곳 바다는 처음 오는 이에게는 낯설지만, 알고 나면 보물창고이지요.\"",
			"안내인이 해도 한 장을 펼쳐 보인다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "pac_emu", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "pac_emu", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_pac_perth", title = "퍼스의 안내인", portId = "perth", art = "harbor", npc = "안내인",
		lines = {
			"\"이곳 바다는 처음 오는 이에게는 낯설지만, 알고 나면 보물창고이지요.\"",
			"안내인이 해도 한 장을 펼쳐 보인다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "pac_eucalyptus", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "pac_eucalyptus", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_pac_darwin", title = "다윈의 안내인", portId = "darwin", art = "harbor", npc = "안내인",
		lines = {
			"\"이곳 바다는 처음 오는 이에게는 낯설지만, 알고 나면 보물창고이지요.\"",
			"안내인이 해도 한 장을 펼쳐 보인다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "geo_great_barrier", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "geo_great_barrier", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_pac_auckland", title = "오클랜드의 안내인", portId = "auckland", art = "harbor", npc = "안내인",
		lines = {
			"\"이곳 바다는 처음 오는 이에게는 낯설지만, 알고 나면 보물창고이지요.\"",
			"안내인이 해도 한 장을 펼쳐 보인다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "pac_kiwi", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "pac_kiwi", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_pac_port_moresby", title = "포트모르즈비의 안내인", portId = "port_moresby", art = "harbor", npc = "안내인",
		lines = {
			"\"이곳 바다는 처음 오는 이에게는 낯설지만, 알고 나면 보물창고이지요.\"",
			"안내인이 해도 한 장을 펼쳐 보인다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "zoo_bird_paradise", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "zoo_bird_paradise", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_pac_suva", title = "수바의 안내인", portId = "suva", art = "harbor", npc = "안내인",
		lines = {
			"\"이곳 바다는 처음 오는 이에게는 낯설지만, 알고 나면 보물창고이지요.\"",
			"안내인이 해도 한 장을 펼쳐 보인다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "pac_hibiscus", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "pac_hibiscus", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_pac_tahiti", title = "타히티의 안내인", portId = "tahiti", art = "harbor", npc = "안내인",
		lines = {
			"\"이곳 바다는 처음 오는 이에게는 낯설지만, 알고 나면 보물창고이지요.\"",
			"안내인이 해도 한 장을 펼쳐 보인다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "pac_bounty_nail", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "pac_bounty_nail", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_pac_honolulu", title = "호놀룰루의 안내인", portId = "honolulu", art = "harbor", npc = "안내인",
		lines = {
			"\"이곳 바다는 처음 오는 이에게는 낯설지만, 알고 나면 보물창고이지요.\"",
			"안내인이 해도 한 장을 펼쳐 보인다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "pac_sandalwood_hawaii", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "pac_sandalwood_hawaii", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_pac_guam", title = "괌의 안내인", portId = "guam", art = "harbor", npc = "안내인",
		lines = {
			"\"이곳 바다는 처음 오는 이에게는 낯설지만, 알고 나면 보물창고이지요.\"",
			"안내인이 해도 한 장을 펼쳐 보인다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "pac_coral_white", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "pac_coral_white", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_pac_acapulco", title = "아카풀코의 안내인", portId = "acapulco", art = "harbor", npc = "안내인",
		lines = {
			"\"이곳 바다는 처음 오는 이에게는 낯설지만, 알고 나면 보물창고이지요.\"",
			"안내인이 해도 한 장을 펼쳐 보인다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "site_acapulco_fort", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "site_acapulco_fort", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_pac_panama", title = "파나마의 안내인", portId = "panama", art = "harbor", npc = "안내인",
		lines = {
			"\"이곳 바다는 처음 오는 이에게는 낯설지만, 알고 나면 보물창고이지요.\"",
			"안내인이 해도 한 장을 펼쳐 보인다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "site_panama_viejo", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "site_panama_viejo", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_pac_guayaquil", title = "과야킬의 안내인", portId = "guayaquil", art = "harbor", npc = "안내인",
		lines = {
			"\"이곳 바다는 처음 오는 이에게는 낯설지만, 알고 나면 보물창고이지요.\"",
			"안내인이 해도 한 장을 펼쳐 보인다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "am_cacao_pod", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "am_cacao_pod", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_pac_callao", title = "카야오의 안내인", portId = "callao", art = "harbor", npc = "안내인",
		lines = {
			"\"이곳 바다는 처음 오는 이에게는 낯설지만, 알고 나면 보물창고이지요.\"",
			"안내인이 해도 한 장을 펼쳐 보인다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "am_inca_quipu", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "am_inca_quipu", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_pac_valparaiso", title = "발파라이소의 안내인", portId = "valparaiso", art = "harbor", npc = "안내인",
		lines = {
			"\"이곳 바다는 처음 오는 이에게는 낯설지만, 알고 나면 보물창고이지요.\"",
			"안내인이 해도 한 장을 펼쳐 보인다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "geo_humboldt", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "geo_humboldt", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_pac_san_francisco", title = "샌프란시스코의 안내인", portId = "san_francisco", art = "harbor", npc = "안내인",
		lines = {
			"\"이곳 바다는 처음 오는 이에게는 낯설지만, 알고 나면 보물창고이지요.\"",
			"안내인이 해도 한 장을 펼쳐 보인다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "site_golden_gate", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "site_golden_gate", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_pac_sitka", title = "싯카의 안내인", portId = "sitka", art = "harbor", npc = "안내인",
		lines = {
			"\"이곳 바다는 처음 오는 이에게는 낯설지만, 알고 나면 보물창고이지요.\"",
			"안내인이 해도 한 장을 펼쳐 보인다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "site_sitka_church", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "site_sitka_church", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
	{
		id = "npc_pac_vancouver", title = "밴쿠버의 안내인", portId = "vancouver", art = "harbor", npc = "안내인",
		lines = {
			"\"이곳 바다는 처음 오는 이에게는 낯설지만, 알고 나면 보물창고이지요.\"",
			"안내인이 해도 한 장을 펼쳐 보인다.",
		},
		choices = {
			{ text = "이야기를 기록한다", effect = { cardId = "geo_inside_passage", fame = 3 }, result = "수첩에 귀한 이야기를 옮겨 적었다." },
			{ text = "작은 선물을 건넨다 (20코인)", cost = 20, effect = { cardId = "geo_inside_passage", affinity = 1 }, result = "상대가 기뻐하며 더 많은 이야기를 들려주었다." },
		},
	},
}

-- 나라마다 다른 주인공 이야기. nation 이 같은 사람만 본다. 앞 장면을 봐야 다음이 열린다.
local NationStories: { [string]: { chapter: string, events: { { any } } } } = {
	england = { chapter = "엘리너 렌의 항해", events = {
		{ "england_lon", "london", "palace", "학회 서기", "거절당한 논문", 0, { "런던 왕립학회 계단. 서기가 엘리너의 논문을 되돌려 준다.", "\"여성이 쓴 해류 관측이라니, 증거가 부족합니다. 바다에서 직접 재 오시지요.\"", "엘리너는 종이를 말아 쥐었다. 증거를 가져오겠다. 바다 끝까지라도." }, { { "관측 기구를 사 들고 출항한다 (50코인)", "서기가 말없이 눈을 피했다. 엘리너는 첫 관측 기구를 배에 실었다.", 3, 0, 1, 50 }, { "논문을 다시 쓰며 후원자를 찾는다", "후원자 한 명이 이름을 적어 보냈다. 이것이 첫 걸음이다.", 2, 60, 0, 0 } } },
		{ "england_cdz", "cadiz", "harbor", "스페인 도선사", "대서양의 첫 측정", 30, { "카디스 부두. 도선사가 엘리너의 해류병을 신기한 듯 들여다본다.", "\"이 병을 띄우면 어디로 흘러가는지 안다고? 선원들이 웃을 걸세. 하지만 나는 안 웃네.\"", "첫 해류병이 서쪽으로 흘러갔다. 증거의 시작이다." }, { { "매일 기록을 남긴다", "관측 일지가 두툼해졌다. 엘리너의 손끝이 단단해졌다.", 3, 0, 2, 0 }, { "도선사에게 사례한다 (30코인)", "도선사가 해류가 빠른 철을 일러 주었다.", 2, 0, 1, 30 } } },
		{ "england_cap", "cape_town", "storm", "등대지기", "폭풍의 곶에서", 110, { "케이프타운 등대. 폭풍의 곶이 포효한다.", "\"저기를 건너려면 배 한 척 값은 각오하시오. 학회 학자 중에도 돌아온 이가 없소.\"", "엘리너는 관측 기구를 단단히 묶으며 말했다. '그래서 저기가 중요한 거예요.'" }, { { "폭풍 속에서 관측을 강행한다", "거센 파도 속에서도 기록은 끝났다. 선원들의 눈빛이 달라졌다.", 6, 0, 2, 0 }, { "안전한 날을 기다린다 (80코인)", "기다림은 길었지만 자료는 더 정확했다.", 4, 0, 1, 80 } } },
		{ "england_cal", "calicut", "library", "인도 천문학자", "별과 해류", 220, { "캘리컷 천문대. 학자가 엘리너의 기록을 별판에 겹쳐 본다.", "\"해류와 별이 한 장의 그림 안에 있군요. 당신은 바다를 읽는 법을 새로 쓰고 있소.\"", "엘리너는 처음으로 논문 속 문장이 자신 있게 느껴졌다." }, { { "공동 연구를 제안한다", "학자가 기꺼이 동의했다. 지식은 나눌수록 넓어진다.", 7, 0, 2, 0 }, { "기록 사본을 교환한다 (100코인)", "서로의 기록이 맞물려 정확도가 크게 높아졌다.", 6, 0, 1, 100 } } },
		{ "england_syd", "sydney", "library", "시드니 항해사", "증거를 들고", 400, { "시드니 항. 수평선 너머로 지구의 곡선이 느껴진다.", "엘리너의 일지는 이제 세 바다의 해류를 담았다. 학회에 가져갈 증거다.", "\"이걸 제출하면 그들도 인정할 거예요.\" 엘리너가 미소 지었다." }, { { "논문을 학회에 부친다", "에필로그: 몇 달 뒤 학회에서 답장이 왔다. '당신을 초대합니다.'", 20, 300, 3, 0 }, { "먼저 더 멀리 간다", "에필로그: 엘리너는 증명보다 더 큰 질문을 향해 키를 돌렸다.", 20, 0, 5, 0 } } },
	} },
	netherlands = { chapter = "얀 데 흐로트의 장부", events = {
		{ "netherlands_ams", "amsterdam", "market", "상인 길드장", "길드의 문전박대", 0, { "암스테르담 상인 길드. 길드장이 팔짱을 낀다.", "\"서기의 아들이 독립 상사를? 장부는 잘 써도 바다는 못 쓰네.\"", "얀은 낡은 장부를 가슴에 안았다. 바다에서 증명하겠다." }, { { "작은 거래부터 시작한다", "첫 거래에서 소소한 이문이 남았다.", 3, 80, 0, 0 }, { "길드에 도전장을 낸다", "길드장이 코웃음을 쳤지만 소문은 퍼졌다.", 2, 0, 1, 0 } } },
		{ "netherlands_lis", "lisbon", "market", "포르투갈 중개상", "향신료 시세의 비밀", 30, { "리스본 부두. 중개상이 향신료 값을 속삭인다.", "\"인도에서 사 온 후추가 여기선 열 배요. 하지만 선단 없이는 소용없소.\"", "얀의 눈에서 숫자가 춤추기 시작했다." }, { { "시세표를 만든다", "얀의 장부가 한 권 더 늘었다. 거래 감이 날카로워졌다.", 3, 0, 2, 0 }, { "중개상에게 수수료를 낸다 (40코인)", "중개상이 숨은 항로를 슬쩍 알려 주었다.", 2, 0, 1, 40 } } },
		{ "netherlands_cap", "cape_town", "market", "케이프 상인", "중간 기착지", 110, { "케이프타운 시장. 상인이 신선한 식량을 쌓아 둔다.", "\"여기를 거치지 않고는 동인도에 못 가오. 이 항구가 곧 길목이오.\"", "얀은 길목의 값어치를 장부에 적었다." }, { { "식량 계약을 맺는다 (80코인)", "안정적인 보급로가 생겼다.", 5, 0, 1, 80 }, { "선원들과 함께 쉰다", "선원들의 사기가 올랐다.", 4, 0, 2, 0 } } },
		{ "netherlands_bat", "batavia", "market", "동인도 회사 직원", "독점의 벽", 220, { "바타비아 상관. 직원이 계약서를 밀어낸다.", "\"독립 상인은 이 바다에서 설 자리가 없소. 회사에 들어오시오.\"", "얀은 계약서를 읽고 천천히 고개를 저었다." }, { { "독립을 고수한다", "직원이 놀란 눈으로 물러났다. 소문이 번졌다.", 7, 0, 2, 0 }, { "조건을 협상한다 (100코인)", "타협안이 나왔다. 독립 상선의 길이 열렸다.", 6, 0, 1, 100 } } },
		{ "netherlands_nag", "nagasaki", "harbor", "데지마 통역관", "독립 상사의 깃발", 400, { "나가사키 데지마. 통역관이 상관 입구를 가리킨다.", "\"한 곳에서만 장사하는 이는 없소. 당신은 세계를 장부로 삼는구려.\"", "얀의 상사에 첫 깃발이 걸렸다." }, { { "깃발을 올린다", "에필로그: '흐로트 상사'가 설립되었다. 길드는 더는 코웃음치지 않았다.", 20, 300, 3, 0 }, { "동료들에게 지분을 나눈다", "에필로그: 선원들이 주주가 되었다. 상사는 가족처럼 자랐다.", 20, 0, 5, 0 } } },
	} },
	france = { chapter = "마리온 델라크루아의 영지", events = {
		{ "france_rou", "rouen", "palace", "공증인", "빼앗긴 영지", 0, { "루앙 공증인 사무실. 서류가 책상에 펼쳐진다.", "\"영지는 빚 대신 넘어갔습니다. 되찾으려면 은화 이만을 한 번에 내야 합니다.\"", "마리온은 서류를 접고 조용히 말했다. '그럼 벌어 오겠어요.'" }, { { "바다로 나갈 배를 산다 (60코인)", "첫 배에 가문의 문장을 달았다.", 3, 0, 1, 60 }, { "옛 영지 사람들을 찾는다", "옛 소작인들이 선원으로 합류하겠다고 나섰다.", 2, 40, 1, 0 } } },
		{ "france_cdz", "cadiz", "tavern", "스페인 상인", "설탕의 길", 30, { "카디스 선술집. 상인이 설탕 항로를 그린다.", "\"카리브의 설탕이 유럽에선 금값이오. 위험하지만 이문이 크지.\"", "마리온의 눈에 처음으로 불이 켜졌다." }, { { "카리브행을 결심한다", "마리온은 키를 서쪽으로 돌렸다.", 3, 0, 2, 0 }, { "보험을 든다 (50코인)", "상인이 믿을 만한 보험사를 소개했다.", 2, 0, 1, 50 } } },
		{ "france_hav", "havana", "market", "설탕 농장주", "신대륙의 이문", 110, { "아바나 항구. 농장주가 달콤한 향을 풍기는 자루를 내민다.", "\"계약은 계약이오. 하지만 당신 같은 선장에게는 선금을 걸겠소.\"", "마리온의 배 안이 설탕 자루로 가득 찼다." }, { { "고가에 사들인다 (100코인)", "귀국 후 이문이 클 것 같다.", 5, 0, 1, 100 }, { "농장주와 장기 계약을 맺는다", "안정적 공급선이 생겼다.", 6, 60, 2, 0 } } },
		{ "france_tah", "tahiti", "garden", "섬의 장로", "잊힌 정원", 220, { "타히티 섬. 장로가 마리온에게 꽃 한 송이를 꽂아 준다.", "\"당신은 영지를 찾아 여기까지 왔구려. 땅은 돈으로만 사는 게 아니오.\"", "마리온은 처음으로 영지가 아닌 '땅'의 의미를 생각했다." }, { { "섬의 이야기를 듣는다", "마리온의 목표가 조금 더 넓어졌다.", 6, 0, 2, 0 }, { "섬 사람들과 거래한다 (80코인)", "진귀한 물건을 얻었다.", 5, 0, 1, 80 } } },
		{ "france_rou2", "rouen", "palace", "공증인", "영지를 되찾다", 400, { "루앙 공증인 사무실. 마리온이 금화 자루를 책상에 올린다.", "\"... 이만 은화가 맞군요. 서류에 서명하시지요.\"", "마리온은 펜을 들었다. 손이 떨리지 않았다." }, { { "영지를 되찾는다", "에필로그: 델라크루아의 영지에 다시 깃발이 올랐다.", 20, 300, 3, 0 }, { "영지를 소작인들에게 나눈다", "에필로그: 마리온은 땅을 나누고 다시 바다로 떠났다.", 20, 0, 5, 0 } } },
	} },
	ottoman = { chapter = "레일라 하미디의 향신료", events = {
		{ "ottoman_ist", "istanbul", "market", "그랜드 바자르 상인", "끊긴 향신료 길", 0, { "이스탄불 그랜드 바자르. 상인이 텅 빈 향신료 가판대를 가리킨다.", "\"홍해 길목이 막혀 후추가 안 들어온 지 석 달이오. 하미디 가문 상점도 곧 문을 닫소.\"", "레일라는 빈 자루를 접었다. 길이 막혔다면 직접 열 것이다." }, { { "배를 빌려 출항한다 (50코인)", "낡은 배 한 척이 레일라를 기다렸다.", 3, 0, 1, 50 }, { "가문 상인들에게 투자를 청한다", "몇몇 상인이 소액을 보탰다.", 2, 60, 0, 0 } } },
		{ "ottoman_ale", "alexandria", "harbor", "이집트 도선사", "홍해로 가는 길", 30, { "알렉산드리아 항. 도선사가 지도를 펼친다.", "\"홍해 입구에서 해적이 설치고 있소. 하지만 돌아가면 이문이 반으로 줄지.\"", "레일라는 지도의 한 점을 손가락으로 짚었다." }, { { "해적 소굴을 피해 우회한다", "안전한 우회로를 찾았다.", 3, 0, 2, 0 }, { "도선사를 고용한다 (40코인)", "도선사가 길을 안내했다.", 2, 0, 1, 40 } } },
		{ "ottoman_ade", "beirut", "market", "대상 중개상", "후추의 관문", 110, { "베이루트 항. 중개상이 후추 자루를 건넨다.", "\"당신 같은 상인에게 먼저 팔고 싶었소. 가문 이름을 들었소.\"", "레일라의 배가 향신료로 가득 찼다." }, { { "크게 사들인다 (100코인)", "이스탄불에서 높은 이문이 남을 것이다.", 5, 0, 1, 100 }, { "중개상과 우정을 쌓는다", "중개상이 동방 소식을 알려 주었다.", 5, 0, 2, 0 } } },
		{ "ottoman_mal", "venice", "market", "베네치아 중개상", "서쪽의 큰 시장", 220, { "베네치아 부두. 중개상이 정향 자루를 쓰다듬는다.", "\"이 정향은 본토 값의 열 배요. 하지만 선단 없이는 못 가져가오.\"", "레일라는 장부에 가장 큰 숫자를 적었다." }, { { "선단 후원자를 찾는다", "후원자를 구해 선단을 꾸렸다.", 7, 0, 2, 0 }, { "직접 모험을 걸어 본다 (100코인)", "위험을 감수한 대가로 큰 이문이 났다.", 6, 200, 1, 100 } } },
		{ "ottoman_ist2", "istanbul", "market", "그랜드 바자르 상인", "다시 향기로운 바자르", 400, { "이스탄불 그랜드 바자르. 가판대가 다시 향신료로 차오른다.", "\"하미디 가문이 돌아왔소!\" 상인들이 환호한다.", "레일라는 첫 번째 자루를 풀어 향을 맡았다." }, { { "가문 상점을 되살린다", "에필로그: 하미디 향신료 상점이 제국에서 가장 큰 가게가 되었다.", 20, 300, 3, 0 }, { "무역로를 모두에게 나눈다", "에필로그: 레일라의 항로는 모두의 길이 되었다.", 20, 0, 5, 0 } } },
	} },
	swahili = { chapter = "아민 살림의 계절풍", events = {
		{ "swahili_zan", "zanzibar", "harbor", "늙은 선장", "계절풍의 아이", 0, { "잔지바르 항구. 늙은 선장이 모래 위에 바람 방향을 그린다.", "\"아민, 오늘은 동쪽 바람이다. 하지만 거긴 이미 포르투갈 배가 지키고 있다.\"", "아민은 바람 소리에 귀를 기울였다. 바람은 편을 가리지 않는다." }, { { "계절풍 표를 만든다", "바람표가 한 장 늘었다. 항해 감이 날카로워졌다.", 3, 0, 2, 0 }, { "선원을 모집한다 (30코인)", "젊은 선원들이 모여들었다.", 2, 0, 1, 30 } } },
		{ "swahili_kil", "kilwa", "market", "킬와 상인", "금과 상아", 30, { "킬와 시장. 상인이 상아를 쓰다듬는다.", "\"인도 상인들이 상아를 목마르게 찾소. 당신 배가 건너 주면 좋겠소.\"", "아민은 상아를 배에 실었다. 첫 외해 항해다." }, { { "인도로 출항한다", "바람이 도왔다. 항해가 순조로웠다.", 3, 0, 2, 0 }, { "상인에게 선금을 건넨다 (40코인)", "상인이 감사하며 부두를 열었다.", 2, 0, 1, 40 } } },
		{ "swahili_ade", "aden", "market", "홍해 중개상", "문 열린 홍해", 110, { "아덴 항. 중개상이 아랍 지도를 보여 준다.", "\"당신의 계절풍 표는 우리에게도 값지오. 거래합시다.\"", "아민은 처음으로 자신의 지식을 팔았다." }, { { "계절풍 표를 거래한다", "지식도 상품이 된다는 것을 알았다.", 5, 150, 1, 0 }, { "지도를 교환한다", "귀한 지도 한 장을 얻었다.", 6, 0, 2, 0 } } },
		{ "swahili_goa", "goa", "palace", "포르투갈 관리", "낯선 깃발 아래서", 220, { "고아 총독부. 관리가 거만하게 내려다본다.", "\"이 바다는 포르투갈의 허가가 필요하오. 통행증 값을 내시오.\"", "아민은 조용히 고개를 들었다. 바다는 누구의 것도 아니다." }, { { "통행증을 사고 항해를 이어 간다 (100코인)", "돈은 나갔지만 자유는 얻었다.", 6, 0, 1, 100 }, { "정중히 항의한다", "관리는 곤란한 표정을 지었다. 소문이 번졌다.", 7, 0, 2, 0 } } },
		{ "swahili_zan2", "zanzibar", "harbor", "늙은 선장", "바람의 이름", 400, { "잔지바르 항구. 늙은 선장이 모래 위에 마지막 방향을 그린다.", "\"아민, 이제 이 바다의 바람은 네 이름으로 불릴 것이다.\"", "아민은 모래 위에 자신의 항로를 새겼다." }, { { "바람의 노래를 가르친다", "에필로그: 아민의 항해술이 해안 모든 항구에 전해졌다.", 20, 300, 3, 0 }, { "먼 바다로 새로 떠난다", "에필로그: 아민은 바람을 따라 세상 끝으로 떠났다.", 20, 0, 5, 0 } } },
	} },
	malabar = { chapter = "라마 나이르의 후추", events = {
		{ "malabar_cal", "calicut", "market", "후추 농부", "이문 없는 풍년", 0, { "캘리컷 시장. 후추 농부가 한숨을 쉰다.", "\"올해는 풍년인데 값이 반토막이오. 중개상들이 값을 후려치오.\"", "라마는 후추 한 줌을 손에 쥐었다. 직접 팔아야 한다." }, { { "직접 항해에 나선다 (50코인)", "라마의 첫 항해가 시작되었다.", 3, 0, 1, 50 }, { "농부들과 힘을 합친다", "농부들이 후추를 맡겼다.", 2, 50, 1, 0 } } },
		{ "malabar_coc", "cochin", "harbor", "코친 선주", "배를 빌리다", 30, { "코친 부두. 선주가 낡은 배를 가리킨다.", "\"이 배, 한 번만 쓰겠소? 값은 후추로 치르시오.\"", "라마는 배에 후추를 가득 실었다." }, { { "조건을 협상한다", "선주가 한발 물러섰다.", 3, 0, 2, 0 }, { "선금을 낸다 (40코인)", "선주가 선원까지 붙여 주었다.", 2, 0, 1, 40 } } },
		{ "malabar_mal", "zanzibar", "market", "잔지바르 중개상", "서쪽의 값", 110, { "잔지바르 항. 중개상이 후추 값을 부른다.", "\"여기선 값이 두 배요. 하지만 아랍 상인과 직접 거래하면 세 배요.\"", "라마의 머릿속에서 숫자가 맞춰지기 시작했다." }, { { "아랍 상인을 만난다", "새 거래선이 열렸다.", 5, 0, 2, 0 }, { "수수료를 내고 소개받는다 (80코인)", "확실한 거래선을 얻었다.", 5, 0, 1, 80 } } },
		{ "malabar_can", "aden", "market", "아덴 상인", "유향과 커피", 220, { "아덴 시장. 상인이 유향을 보여 준다.", "\"후추와 유향을 교환합시다. 서쪽에서 유향은 금값이오.\"", "라마의 배가 유향으로 가득 찼다." }, { { "교환 계약을 맺는다 (100코인)", "장기 계약이 성사되었다.", 7, 0, 1, 100 }, { "우정의 선물로 후추를 건넨다", "상인의 호의를 샀다.", 6, 0, 2, 0 } } },
		{ "malabar_cal2", "calicut", "market", "후추 농부", "값을 되찾다", 400, { "캘리컷 시장. 농부들이 환호한다.", "\"라마 덕에 이문이 세 배요! 중개상도 이제 우릴 얕보지 못하오.\"", "라마는 농부들 앞에 서서 말했다." }, { { "협동조합을 만든다", "에필로그: 말라바르 후추 조합이 생겼다. 농부들의 삶이 바뀌었다.", 20, 300, 3, 0 }, { "새 항로를 열러 떠난다", "에필로그: 라마의 배는 더 먼 바다로 나갔다.", 20, 0, 5, 0 } } },
	} },
	japan = { chapter = "사쿠라이 하루카의 바다", events = {
		{ "japan_nag", "nagasaki", "harbor", "도선사", "닫힌 바다 앞에서", 0, { "나가사키 항. 도선사가 먼 수평선을 가리킨다.", "\"이 바다 너머에는 은과 비단과 지식이 있소. 하지만 이 나라는 아직 문을 열지 않았소.\"", "하루카는 배의 키를 어루만졌다. 그래도 가 볼 것이다." }, { { "허가를 받아 소규모 항해에 나선다 (50코인)", "작은 배로 첫 항해가 시작되었다.", 3, 0, 1, 50 }, { "조용히 출항 준비를 한다", "선원 몇이 합류했다.", 2, 40, 1, 0 } } },
		{ "japan_osa", "osaka", "market", "오사카 상인", "은과 비단", 30, { "오사카 시장. 상인이 은괴를 보여 준다.", "\"이 은은 중국에서 비단과 바뀌오. 위험하지만 이문은 크오.\"", "하루카의 배에 은괴가 실렸다." }, { { "중국으로 향한다", "순풍이 불었다.", 3, 0, 2, 0 }, { "상인에게 보증을 선다 (40코인)", "상인의 신뢰를 얻었다.", 2, 0, 1, 40 } } },
		{ "japan_can", "canton", "market", "광둥 상인", "바다 건너의 지식", 110, { "광둥 시장. 학자가 책을 건넨다.", "\"이 책은 별 보는 법이오. 배에도 쓸모가 있을 거요.\"", "하루카의 눈에 새 세계가 열렸다." }, { { "책을 번역한다", "항해술이 한 단계 올랐다.", 5, 0, 2, 0 }, { "책값을 치른다 (80코인)", "귀한 책 한 권을 얻었다.", 5, 0, 1, 80 } } },
		{ "japan_mal", "malacca", "tavern", "해협의 중개상", "서쪽 상인들", 220, { "말라카 선술집. 서양 선원들이 시끄럽게 떠든다.", "\"이쪽 바다는 이제 우리 거요.\" \"그건 모를 일이지.\"", "하루카는 조용히 술잔을 기울였다." }, { { "대화에 끼어든다", "서양 선원이 항로 지식을 풀어 주었다.", 7, 0, 2, 0 }, { "정보를 사들인다 (100코인)", "귀한 정보를 얻었다.", 6, 0, 1, 100 } } },
		{ "japan_edo", "edo", "palace", "쇼군의 사자", "열린 바다", 400, { "에도 성. 사자가 하루카를 불러 세운다.", "\"당신이 본 바다 이야기를 들려주시오. 막부가 귀 기울이고 있소.\"", "하루카는 선원들과 지도를 펼쳤다." }, { { "항해 지식을 나눈다", "에필로그: 하루카의 항해록이 일본 항해술의 새 출발이 되었다.", 20, 300, 3, 0 }, { "먼 바다로 다시 떠난다", "에필로그: 하루카는 바다 너머의 바다로 향했다.", 20, 0, 5, 0 } } },
	} },
	new_spain = { chapter = "디에고 모랄레스의 은", events = {
		{ "new_spain_ver", "veracruz", "harbor", "은 감독관", "은광의 바다", 0, { "베라크루스 항. 감독관이 은괴를 세어 본다.", "\"은은 본국으로 가지만 이 항구에는 먼지만 남소. 우리 쪽 상인이 직접 팔 길이 필요하오.\"", "디에고는 은괴를 손에 쥐었다. 길은 바다에 있다." }, { { "배를 마련한다 (50코인)", "디에고의 첫 배가 닻을 올렸다.", 3, 0, 1, 50 }, { "광산 사람들을 선원으로 모은다", "억센 사내들이 합류했다.", 2, 40, 1, 0 } } },
		{ "new_spain_hav", "havana", "tavern", "쿠바 선장", "카리브의 규칙", 30, { "아바나 술집. 선장이 건배를 청한다.", "\"이 바다에서 은 실은 배는 해적 눈에 띄오. 호위가 필요하오.\"", "디에고는 선장의 잔을 받았다." }, { { "선장과 함께 항해한다", "든든한 동료가 생겼다.", 3, 0, 2, 0 }, { "호위비를 낸다 (40코인)", "안전한 호위를 얻었다.", 2, 0, 1, 40 } } },
		{ "new_spain_cad", "cadiz", "market", "스페인 상인", "본국의 시장", 110, { "카디스 시장. 상인이 은괴를 저울에 올린다.", "\"이 순도는 최고요. 하지만 왕실이 세금을 걷어 가오.\"", "디에고는 세금과 이문을 장부에 적었다." }, { { "세금을 내고 정직하게 판다 (80코인)", "정직한 거래로 신뢰를 샀다.", 5, 0, 1, 80 }, { "길드와 새 계약을 맺는다", "길드의 보호가 생겼다.", 5, 0, 2, 0 } } },
		{ "new_spain_aca", "cartagena", "harbor", "콜롬비아 선원", "남쪽 바다 건너편", 220, { "카르타헤나 항. 선원이 에메랄드 자루를 내려놓는다.", "\"콜롬비아에서 온 에메랄드요. 은 한 자루와 바꾸면 이문이 열 배요.\"", "디에고의 눈이 남쪽 바다 너머를 바라보았다." }, { { "남쪽 바다 항로에 도전한다", "새로운 바다의 문이 열렸다.", 7, 0, 2, 0 }, { "에메랄드 거래를 시작한다 (100코인)", "첫 에메랄드 거래가 성사되었다.", 6, 0, 1, 100 } } },
		{ "new_spain_ver2", "veracruz", "harbor", "은 감독관", "은이 가는 길", 400, { "베라크루스 항. 감독관이 눈을 크게 뜬다.", "\"당신의 배가 처음으로 이 항구에서 은을 팔았소.\"", "디에고는 항구 사람들 앞에서 말했다." }, { { "항구 상인 조합을 만든다", "에필로그: 베라크루스 상인 조합이 생겨 은이 이곳에서 팔리게 되었다.", 20, 300, 3, 0 }, { "남쪽 바다로 더 나아간다", "에필로그: 디에고는 은과 보석의 길을 끝까지 이었다.", 20, 0, 5, 0 } } },
	} },
	portugal = { chapter = "이네스 카브랄의 일지", events = {
		{ "portugal_lis", "lisbon", "library", "항해학교 교관", "낡은 항해 일지", 0, { "리스본 항해학교 서고. 교관이 먼지 쌓인 일지를 내민다.", "\"선대 항해사들이 남긴 기록이오. 하지만 끝이 이어지지 않소. 누군가 이어 써야 하오.\"", "이네스는 일지를 펼쳤다. 마지막 장은 아프리카 서안에서 끊겨 있었다." }, { { "일지를 들고 출항한다 (50코인)", "낡은 일지가 이네스의 첫 길잡이가 되었다.", 3, 0, 1, 50 }, { "학교 동기들을 선원으로 모은다", "동기 몇이 의기투합해 합류했다.", 2, 40, 1, 0 } } },
		{ "portugal_elm", "elmina", "market", "황금 상인", "황금 해안의 기록", 30, { "엘미나 시장. 상인이 이네스의 일지를 보고 놀란다.", "\"이 필체는 내 아버지와 거래하던 선장의 것이오. 이곳까지 왔었군.\"", "이네스는 비어 있던 해안 한 칸을 채웠다." }, { { "해안선을 정확히 그려 넣는다", "일지가 한 장 두터워졌다. 항해 감이 올랐다.", 3, 0, 2, 0 }, { "상인에게 선물을 건넨다 (40코인)", "상인이 선원 한 명을 도선사로 붙여 주었다.", 2, 0, 1, 40 } } },
		{ "portugal_cap", "cape_town", "storm", "등대지기", "폭풍의 곶을 돌며", 110, { "케이프타운 등대. 거센 바람이 일지를 흔든다.", "\"여기를 돌아간 배의 절반은 돌아오지 못했소.\"", "이네스는 일지를 옷 속에 넣고 키를 잡았다." }, { { "폭풍 속 항해를 강행한다", "배는 흔들렸지만 곶을 넘었다. 선원들이 환호했다.", 6, 0, 2, 0 }, { "날씨가 가라앉길 기다린다 (80코인)", "시간은 걸렸지만 안전하게 건넜다.", 4, 0, 1, 80 } } },
		{ "portugal_cal", "calicut", "market", "인도 상인", "후추의 바다", 220, { "캘리컷 시장. 상인이 이네스를 반긴다.", "\"서쪽에서 온 배를 처음 보오. 당신이 이어 쓴 항로가 곧 이 항구를 세계에 잇겠구려.\"", "이네스는 일지의 마지막 칸에 이 항구를 적어 넣었다." }, { { "무역 협정을 맺는다 (100코인)", "리스본과 캘리컷을 잇는 첫 계약이 성사되었다.", 7, 0, 1, 100 }, { "후추를 한 자루 선물받는다", "상인의 호의로 귀한 후추를 얻었다.", 6, 0, 2, 0 } } },
		{ "portugal_lis2", "lisbon", "library", "항해학교 교관", "완성된 일지", 400, { "리스본 항해학교 서고. 이네스가 일지를 책상에 올린다.", "\"... 끝까지 이어졌군. 이제 후배들이 이 길을 따라가겠소.\"", "이네스는 마지막 장에 자신의 이름을 적었다." }, { { "항해학교에 일지를 기증한다", "에필로그: 이네스의 일지는 대대로 항해사들의 교본이 되었다.", 20, 300, 3, 0 }, { "새 항로를 열러 다시 떠난다", "에필로그: 이네스의 배는 아직 지도에 없는 바다로 나아갔다.", 20, 0, 5, 0 } } },
	} },
}
local Allies: { [string]: string } = { england = "조수 윌", netherlands = "장부원 피터", france = "시종 로랑", portugal = "도선사 페드루", ottoman = "대상 상인 카심", swahili = "젊은 선원 주마", malabar = "후추 농부 쿠티", japan = "사무라이 겐지", new_spain = "광부 출신 마테오" }
for _, nid in { "england", "netherlands", "france", "ottoman", "swahili", "malabar", "japan", "new_spain", "portugal" } do
	local def = NationStories[nid]
	for i, f in def.events do
		local ch = {}
		local lines = table.clone(f[7])
		if i == #def.events then
			local ally = Allies[nid]
			table.insert(lines, if ally then string.format("석양 아래 갑판에는 %s과(와) 선원들이 모여 있다. 이야기는 여기서 끝나지 않고, 항해는 계속된다.", ally) else "석양 아래 갑판에 선원들이 모여 있다. 항해는 계속된다.")
		end
		for _, c in f[8] do
			local eff: Effect = { fame = c[3], coins = if c[4] > 0 then c[4] else nil, affinity = if c[5] > 0 then c[5] else nil }
			table.insert(ch, { text = c[1], effect = eff, result = c[2], cost = if c[6] > 0 then c[6] else nil })
		end
		table.insert(Events, {
			id = f[1], chapter = def.chapter, title = f[5], portId = f[2], art = if i == #def.events then "epilogue" else f[3], npc = f[4],
			lines = lines, choices = ch, minFame = f[6], nation = nid,
			requires = if i > 1 then { { id = def.events[i - 1][1] } } else nil,
		})
	end
end


-- [7대륙 지역 사건] 중요한 조사 15편에서만 독립 선택형 역사/신화 장면을 연다.
	{
		id = "region_event_eu_pompeii", title = "화산재 아래의 마지막 하루", chapter = "지역 연대기 · eu_pompeii", portId = "livorno", art = "ruins", npc = "나폴리 발굴 책임자", major = true, evidence = "documented", requiresQuests = { "q_region_eu_pompeii_2" },
		lines = { "유물의 소유권과 피해자 기록 중 무엇을 먼저 살필 것인가?", "조사한 두 항구의 기록이 이곳에서 합쳐졌다." },
		choices = {
			{ text = "발굴된 물건의 원래 위치를 복원한다", effect = { fame = 15 }, result = "유물에 남은 일상의 흔적이 역사로 되살아났다." },
			{ text = "주민들의 일상과 이름을 먼저 기록한다", effect = { fame = 12 }, result = "기념품보다 사람들의 삶이 먼저 연대기에 실렸다." },
		},
	},
	{
		id = "region_event_eu_brittany", title = "바다에서 울린다는 종", chapter = "지역 연대기 · eu_brittany", portId = "rouen", art = "storm", npc = "브르타뉴의 늙은 어부", major = true, evidence = "legend", requiresQuests = { "q_region_eu_brittany_2" },
		lines = { "거석은 눈앞에 있다. 이스의 종소리는 아직 증언뿐이다.", "조사한 두 항구의 기록이 이곳에서 합쳐졌다." },
		choices = {
			{ text = "거석 유산을 실측해 기록한다", effect = { fame = 15 }, result = "선사시대 유산의 기록과 그림이 완성됐다." },
			{ text = "이스의 전설은 전설로 남긴다", effect = { fame = 12 }, result = "신화의 아름다움은 남았지만 사실로 둔갑하지 않았다." },
		},
	},
	{
		id = "region_event_as_malacca", title = "해협의 주인은 누구인가", chapter = "지역 연대기 · as_malacca", portId = "batavia", art = "harbor", npc = "말라카의 도선사", major = true, evidence = "documented", requiresQuests = { "q_region_as_malacca_2" },
		lines = { "항구를 지나려는 선박들이 서로 다른 통행권을 주장한다.", "조사한 두 항구의 기록이 이곳에서 합쳐졌다." },
		choices = {
			{ text = "옛 항로 지도를 모두에게 공개한다", effect = { fame = 15 }, result = "해협에서 길을 잃는 배가 줄어들었다." },
			{ text = "독점 계약의 실제 문서를 조사한다", effect = { fame = 12 }, result = "상인의 소문보다 계약의 실체가 드러났다." },
		},
	},
	{
		id = "region_event_as_korea", title = "바다를 읽는 사람들", chapter = "지역 연대기 · as_korea", portId = "incheon", art = "harbor", npc = "조선의 수군 기록관", major = true, evidence = "documented", requiresQuests = { "q_region_as_korea_2" },
		lines = { "군사 기록에는 포와 화차가 있지만 바다의 물때도 같은 만큼 중요했다.", "조사한 두 항구의 기록이 이곳에서 합쳐졌다." },
		choices = {
			{ text = "조수와 바람의 기록을 보존한다", effect = { fame = 15 }, result = "바다 지형을 읽는 지식이 다음 항해자에게 전해졌다." },
			{ text = "당대 무기와 전술의 증거를 정리한다", effect = { fame = 12 }, result = "영웅담보다 무기의 실제 구조가 정확히 기록됐다." },
		},
	},
	{
		id = "region_event_as_spice", title = "향신료보다 무거운 계약", chapter = "지역 연대기 · as_spice", portId = "ternate", art = "market", npc = "테르나테의 상인 대표", major = true, evidence = "documented", requiresQuests = { "q_region_as_spice_2" },
		lines = { "섬의 향신료 값은 올랐지만 생산자의 삶은 나아지지 않았다.", "조사한 두 항구의 기록이 이곳에서 합쳐졌다." },
		choices = {
			{ text = "현지 상인의 목소리를 장부에 기록한다", effect = { fame = 15 }, result = "가격표 뒤에 있던 사람들의 이야기가 역사에 남았다." },
			{ text = "독점 거래의 실제 조건을 검증한다", effect = { fame = 12 }, result = "누구의 계약이었는지 확인됐다. 의혹은 더는 소문만이 아니었다." },
		},
	},
	{
		id = "region_event_af_goree", title = "이름 없는 항해 기록", chapter = "지역 연대기 · af_goree", portId = "bissau", art = "library", npc = "역사 기록 조사관", major = true, evidence = "documented", requiresQuests = { "q_region_af_goree_2" },
		lines = { "부두의 장부는 사람을 숫자로 적었다. 희생된 이들의 이름을 어떻게 돌려놓을까?", "조사한 두 항구의 기록이 이곳에서 합쳐졌다." },
		choices = {
			{ text = "생존자와 후손의 증언을 보존한다", effect = { fame = 15 }, result = "숫자가 아닌 사람의 이름을 다시 읽었다." },
			{ text = "강제 이송의 기록을 사실대로 공개한다", effect = { fame = 12 }, result = "바다 건너 강제 이송의 역사가 지워지지 않게 됐다." },
		},
	},
	{
		id = "region_event_af_elmina", title = "요새의 열쇠가 가리킨 곳", chapter = "지역 연대기 · af_elmina", portId = "ouidah", art = "ruins", npc = "요새 기록관", major = true, evidence = "documented", requiresQuests = { "q_region_af_elmina_2" },
		lines = { "오래된 쇠열쇠의 주인이 아니라, 그 문 너머에 있던 사람들을 기억해야 한다.", "조사한 두 항구의 기록이 이곳에서 합쳐졌다." },
		choices = {
			{ text = "피해자와 지역사회의 증언을 먼저 적는다", effect = { fame = 15 }, result = "유물은 인간의 고통을 증언하는 역사 자료가 됐다." },
			{ text = "요새 문서의 책임과 거래를 조사한다", effect = { fame = 12 }, result = "권력의 장부에 남은 폭력이 사실대로 기록됐다." },
		},
	},
	{
		id = "region_event_na_maya", title = "종말을 예언한다는 돌", chapter = "지역 연대기 · na_maya", portId = "campeche", art = "ruins", npc = "마야 문자 연구자", major = true, evidence = "documented", requiresQuests = { "q_region_na_maya_2" },
		lines = { "태양석과 석비를 두고 세상의 끝이 적혀 있다는 소문이 떠돈다.", "조사한 두 항구의 기록이 이곳에서 합쳐졌다." },
		choices = {
			{ text = "유물의 달력과 문자를 해석한다", effect = { fame = 15 }, result = "고대 문명의 실제 천문·기록 지식이 보존됐다." },
			{ text = "후대의 종말 소문을 따로 분류한다", effect = { fame = 12 }, result = "증명되지 않은 예언은 미확인으로 표시했다." },
		},
	},
	{
		id = "region_event_na_pirates", title = "해적과 가라앉은 도시", chapter = "지역 연대기 · na_pirates", portId = "kingston", art = "harbor", npc = "킹스턴의 잠수부", major = true, evidence = "documented", requiresQuests = { "q_region_na_pirates_2" },
		lines = { "바다 아래에 남은 포트로열의 유적은 보물 소문보다 많은 것을 말한다.", "조사한 두 항구의 기록이 이곳에서 합쳐졌다." },
		choices = {
			{ text = "1692년 재난의 실제 기록을 남긴다", effect = { fame = 15 }, result = "지진의 피해와 도시의 역사가 기록됐다." },
			{ text = "해적의 유물과 전설의 출처를 비교한다", effect = { fame = 12 }, result = "유물은 실재하고 무한한 보물 이야기는 미확인이었다." },
		},
	},
	{
		id = "region_event_na_republic", title = "누구의 독립인가", chapter = "지역 연대기 · na_republic", portId = "philadelphia", art = "palace", npc = "독립기록 서기관", major = true, evidence = "documented", requiresQuests = { "q_region_na_republic_2" },
		lines = { "같은 회의장에 서로 다른 시민의 희망과 불안이 남았다.", "조사한 두 항구의 기록이 이곳에서 합쳐졌다." },
		choices = {
			{ text = "정치 문서의 원문을 공개한다", effect = { fame = 15 }, result = "사건의 시기와 정책이 정확하게 보존됐다." },
			{ text = "당시 주민들의 서로 다른 증언을 기록한다", effect = { fame = 12 }, result = "역사는 하나의 목소리가 아닌 여러 기록으로 남았다." },
		},
	},
	{
		id = "region_event_sa_inca", title = "매듭 속에 숨겨진 기억", chapter = "지역 연대기 · sa_inca", portId = "callao", art = "ruins", npc = "안데스의 기록자", major = true, evidence = "documented", requiresQuests = { "q_region_sa_inca_2" },
		lines = { "매듭과 돌로 만든 기록을 단순한 보물 지도로 보는 사람도 있다.", "조사한 두 항구의 기록이 이곳에서 합쳐졌다." },
		choices = {
			{ text = "키푸의 기록 방식을 연구한다", effect = { fame = 15 }, result = "잉카의 기록체계가 학문의 한 장에 실렸다." },
			{ text = "유적을 남긴 공동체의 역사를 보존한다", effect = { fame = 12 }, result = "황금 전설 대신 사람의 생활과 도시가 기록됐다." },
		},
	},
	{
		id = "region_event_sa_silver", title = "은광석의 무게", chapter = "지역 연대기 · sa_silver", portId = "portobelo", art = "harbor", npc = "포르토벨로의 운송 서기관", major = true, evidence = "documented", requiresQuests = { "q_region_sa_silver_2" },
		lines = { "장부에는 은의 무게만 있고 그것을 캐낸 사람들의 이름은 없다.", "조사한 두 항구의 기록이 이곳에서 합쳐졌다." },
		choices = {
			{ text = "광산 노동자들의 기록을 복원한다", effect = { fame = 15 }, result = "수익 뒤에 감춰진 노동의 역사도 남았다." },
			{ text = "식민지 은 무역의 흐름을 밝힌다", effect = { fame = 12 }, result = "은의 이동 경로와 무역 권력이 확인됐다." },
		},
	},
	{
		id = "region_event_oc_islands", title = "섬의 이름을 지킨 사람들", chapter = "지역 연대기 · oc_islands", portId = "suva", art = "harbor", npc = "수바의 식물학 안내인", major = true, evidence = "documented", requiresQuests = { "q_region_oc_islands_2" },
		lines = { "같은 식물에도 지역마다 이름이 다르다. 누가 먼저 기록했는지를 기억해야 한다.", "조사한 두 항구의 기록이 이곳에서 합쳐졌다." },
		choices = {
			{ text = "주민의 식물 이름을 함께 보존한다", effect = { fame = 15 }, result = "지역사회의 지식이 백과사전에 함께 실렸다." },
			{ text = "식물의 분류와 서식지를 검증한다", effect = { fame = 12 }, result = "식물학적 특징과 현지 명칭이 나란히 기록됐다." },
		},
	},
	{
		id = "region_event_oc_moai", title = "돌 얼굴을 만든 사람들", chapter = "지역 연대기 · oc_moai", portId = "honolulu", art = "ruins", npc = "라파누이 유물 조사관", major = true, evidence = "documented", requiresQuests = { "q_region_oc_moai_2" },
		lines = { "소문은 외계인을 말하지만 석상은 실제 사람들이 만든 문화유산이다.", "조사한 두 항구의 기록이 이곳에서 합쳐졌다." },
		choices = {
			{ text = "현지 공동체의 설명을 기록한다", effect = { fame = 15 }, result = "라파누이 사람들의 이름이 유산의 주인으로 기록됐다." },
			{ text = "유물의 제작과 이동 근거를 조사한다", effect = { fame = 12 }, result = "미확인설과 실제 제작 기술이 구분됐다." },
		},
	},
	{
		id = "region_event_an_ice", title = "지도 끝의 얼음벽", chapter = "지역 연대기 · an_ice", portId = "hobart", art = "storm", npc = "남극권 항해 기록관", major = true, evidence = "documented", requiresQuests = { "q_region_an_ice_2" },
		lines = { "남방 대륙의 황금 전설과 실제 1773년 남극권 항해를 같은 기록으로 적을 수는 없다.", "조사한 두 항구의 기록이 이곳에서 합쳐졌다." },
		choices = {
			{ text = "실제 남극권 항해를 역사로 남긴다", effect = { fame = 15 }, result = "남극권 항해가 실증 자료로 분류됐다." },
			{ text = "황금 대륙 가설과 관측을 비교한다", effect = { fame = 12 }, result = "전설은 남았지만 실재 대륙의 사실과 혼동되지 않았다." },
		},
	},

local ById: { [string]: Event } = {}
for _, e in Events do
	ById[e.id] = e
end

return {
	Events = Events,
	ById = ById,
}
