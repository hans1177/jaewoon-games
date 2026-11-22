--!strict
-- KnowledgeWiki.luau · 백과 카드 상세용 '위키백과급' 확장 해설 (추가 전용 데이터)
-- 기존 KnowledgeCards.Articles(짧은 본문)는 그대로 두고, 이 표에 있는 카드만 한 줄 요약과 접는 섹션을 더 보여 준다.
-- 본문은 위키백과 해당 항목을 참고해 직접 요약·재서술했다(문장 복사 없음). 카드 id·저장·보상은 건드리지 않는다.
-- 출처 표기: 위키백과 영문판 항목(CC BY-SA 4.0). source 의 topic 은 Articles 와 같은 제목을 쓴다.

export type WikiSection = { title: string, body: string }
export type WikiQuestion = { q: string, options: { string }, answer: number }
export type WikiEntry = { summary: string, sections: { WikiSection }, topic: string, quiz: { WikiQuestion }? }

-- 읽기 퀴즈: 3문제를 모두 맞히면 카드당 한 번 보상(서버가 정답·중복을 판정한다). 정답은 1부터 센 보기 번호.
local QUIZ_REWARD = { coins = 30, fame = 1 }

local Wiki: { [string]: WikiEntry } = {
	nav_portolan = {
		topic = "Portolan_chart",
		summary = "항구와 해안선, 방위선을 촘촘히 그린 가장 오래된 형태의 항해용 해도.",
		sections = {
			{ title = "개요", body = "포르톨란 해도는 양피지에 잉크로 손수 그린 항해용 해도다. 이름은 항구 안내서를 뜻하는 이탈리아어 포르톨라노에서 왔고, 19세기 말에야 학자들이 이 해도들을 그렇게 부르기 시작했다. 해안선 묘사가 매우 사실적이라는 점이 큰 특징이다." },
			{ title = "기원과 범위", body = "현존하는 가장 오래된 해도는 1280년 무렵의 카르타 피사나로, 이미 완성도가 높아 그 이전에도 해도 제작 전통이 있었음을 짐작하게 한다. 주로 지중해와 흑해, 대서양 연안의 서유럽과 북서아프리카를 다루었고, 15~16세기에는 기니만까지 넓어졌다." },
			{ title = "읽는 법", body = "해도에는 여러 중심점에서 사방으로 뻗는 방위선망이 그려져 있다. 선원은 이 선으로 출발지와 목적지 사이의 나침반 방위를 읽었다. 초기에는 16방위였고 15세기 중엽부터 32방위가 쓰였다. 1375년의 카탈루냐 아틀라스는 나침반 장미를 처음 선보인 해도로 꼽힌다." },
			{ title = "한계와 논쟁", body = "지구의 곡률을 반영하지 않아 먼바다 항해에는 적합하지 않았고, 이후 메르카토르 도법의 해도가 이를 대신했다. 이 해도가 실제 항해용이었는지 과시용 장식품이었는지에 대해서는 지금도 의견이 갈린다." },
		},
		quiz = {
			{ q = "가장 오래된 현존 포르톨란 해도로 꼽히는 것은?", options = { "카탈루냐 아틀라스", "카르타 피사나", "메르카토르 해도", "톨레미 지도" }, answer = 2 },
			{ q = "포르톨란 해도에서 나침반 방위를 읽는 데 쓴 선은?", options = { "경도선", "등고선", "방위선", "항로 표지선" }, answer = 3 },
			{ q = "포르톨란 해도를 대신하게 된 해도의 도법은?", options = { "메르카토르 도법", "원통 도법", "구면 도법", "등거리 도법" }, answer = 1 },
		},
	},
	nav_dead_reckoning = {
		topic = "Dead_reckoning",
		summary = "확인된 위치에서 속도·침로·시간으로 현재 위치를 계산하는 항법.",
		sections = {
			{ title = "개요", body = "추측항법은 마지막으로 확인한 위치에서 출발해 속도, 가는 방향, 지난 시간을 이용해 지금의 위치를 계산하는 방법이다. 거리는 속도에 시간을 곱해서 얻는다. 생물학에서는 비슷한 능력을 경로 적분이라고 부른다." },
			{ title = "항해에서의 쓰임", body = "배에서는 칩 로그나 프로펠러 회전수로 속도를 쟀다. 18세기에 존 해리슨의 해상 크로노미터와 월거법이 쓰이기 전까지, 콜럼버스나 존 캐벗 같은 항해가들은 경도를 이 방법으로 가늠했다. 20세기에도 1919년 올콕과 브라운의 대서양 무착륙 횡단, 1927년 린드버그의 파리 비행에 쓰였다." },
			{ title = "오차와 보완", body = "작은 오차도 계속 더해져서 오래 달릴수록 위치가 어긋난다. 그래서 육지의 목표물이나 천체를 관측해 새로운 기준점을 얻어 위치를 바로잡아야 한다. 오늘날에는 GPS와 관성항법장치 등과 함께 쓰인다." },
		},
		quiz = {
			{ q = "추측항법에서 거리를 구하는 식은?", options = { "속도 × 시간", "속도 ÷ 시간", "침로 × 시간", "시간 ÷ 속도" }, answer = 1 },
			{ q = "추측항법의 가장 큰 약점은?", options = { "속도를 잴 수 없다", "오차가 계속 쌓인다", "나침반이 필요 없다", "바다에서만 쓴다" }, answer = 2 },
			{ q = "오차를 바로잡기 위해 필요한 것은?", options = { "새 기준점", "더 빠른 배", "더 많은 선원", "더 긴 항해" }, answer = 1 },
		},
	},
	nav_compass_rose = {
		topic = "Compass_rose",
		summary = "동서남북과 그 사이 방위를 한눈에 보여 주는 방위 도표.",
		sections = {
			{ title = "개요", body = "나침반 장미는 동·서·남·북과 그 사이의 방위를 한 도표에 나타낸 것이다. 나침반, 지도, 해도는 물론 오늘날 위성항법 장치에도 쓰인다." },
			{ title = "방위의 나눔", body = "방위점은 4방위(90도), 8방위(45도), 16방위(22.5도), 32방위(11.25도) 등으로 나뉜다. 고대 그리스에는 천체를 기준으로 한 방위와 바람 이름이 따로 있었고, 점차 하나의 체계로 합쳐졌다. 티모스테네스는 12방위, 에라토스테네스는 8방위 장미를 만든 인물로 전해진다. 중세 지중해 선원은 8방위를, 14세기에는 32방위를 썼다." },
			{ title = "해도 속의 장미", body = "1375년 마요르카의 크레스케스 아브라함이 카탈루냐 아틀라스에 장식된 나침반 장미를 처음 그려 넣었다. 북쪽을 가리키는 백합 문양은 페드로 레이넬이 도입했다고 한다. 현대의 장미는 보통 두 겹의 원으로, 바깥은 진북을, 안쪽은 자북을 가리킨다." },
		},
		quiz = {
			{ q = "32방위 나침반 장미에서 방위점 사이의 각도는?", options = { "22.5도", "11.25도", "45도", "90도" }, answer = 2 },
			{ q = "최초로 장식된 나침반 장미를 그린 해도는?", options = { "카르타 피사나", "카탈루냐 아틀라스", "메르카토르 해도", "피리 레이스 지도" }, answer = 2 },
			{ q = "현대 나침반 장미에서 바깥 원이 가리키는 북쪽은?", options = { "자북", "진북", "도북", "별북" }, answer = 2 },
		},
	},
	nav_chronometer = {
		topic = "Marine_chronometer",
		summary = "배 위에서 경도를 구하기 위해 만든 정밀 시계.",
		sections = {
			{ title = "개요", body = "해상 크로노미터는 배에 실어 천체 관측으로 경도를 구하는 데 쓰는 정밀 시계다. 현지 시각과 그리니치 평균시를 비교하면 그 시차로 경도를 계산할 수 있다." },
			{ title = "경도 문제", body = "1750년대 중반까지 바다 위에서 경도를 정확히 재는 일은 풀리지 않은 숙제였다. 1714년 영국 정부가 경도상을 내걸자, 요크셔의 목수 존 해리슨이 31년에 걸쳐 H1부터 H4까지를 만들었다. H1과 H2는 1741년에 완성되었고, H4는 1761년 경도상 심사에 제출되었다." },
			{ title = "보급", body = "이후 르루아, 언셔, 아놀드 등이 기술을 다듬었다. 그리니치 천문대는 1820년부터 크로노미터를 시험했고, 영국 해군은 1825년 무렵부터 함선에 크로노미터를 정기적으로 보급했다. 1960년대 이후 전자시계로 대체되었지만, 오늘날의 항해사도 위성항법과 함께 천체 항법을 익힌다." },
		},
		quiz = {
			{ q = "해상 크로노미터로 구하는 것은?", options = { "위도", "경도", "수심", "풍속" }, answer = 2 },
			{ q = "영국 정부가 경도상을 내건 해는?", options = { "1714년", "1761년", "1825년", "1942년" }, answer = 1 },
			{ q = "경도 계산에 쓰는 두 시각은 현지 시각과 무엇인가?", options = { "일출 시각", "그리니치 평균시", "정오 시각", "만조 시각" }, answer = 2 },
		},
	},
	nav_log_line = {
		topic = "Chip_log",
		summary = "매듭 줄을 바다에 던져 배의 속도를 재던 도구. '노트'라는 속도 단위의 어원.",
		sections = {
			{ title = "개요", body = "칩 로그는 배가 물 위를 얼마나 빨리 가는지 어림하는 항해 도구로, 로그 라인이라고도 부른다. 배의 속도 단위인 노트(시간당 해리)는 이 방법에서 나왔다." },
			{ title = "구조와 쓰임", body = "줄에는 일정한 간격으로 매듭이 묶여 있고, 끝에는 아랫부분에 납을 단 나무판이 달려 있다. 판은 물속에서 똑바로 서서 제자리에 머물기 때문에, 배가 나아가면 줄이 풀려 나간다. 모래시계로 정한 시간 동안 풀려 나간 매듭의 수를 세어 속도를 알았다." },
			{ title = "기록과 쇠퇴", body = "1574년 윌리엄 본이 『바다를 위한 지침』에서 이 도구를 처음 인쇄물로 설명했다. 18세기에 고안되어 19세기에 널리 쓰인 태프레일 로그가 칩 로그를 대신했고, 오늘날에는 전자식 로그와 GPS가 쓰인다." },
		},
		quiz = {
			{ q = "칩 로그로 재는 것은?", options = { "수심", "배의 속도", "바람 방향", "경도" }, answer = 2 },
			{ q = "속도 단위 '노트'가 유래한 것은?", options = { "줄에 묶은 매듭", "돛의 수", "닻의 무게", "별의 밝기" }, answer = 1 },
			{ q = "칩 로그를 인쇄물로 처음 설명한 사람은?", options = { "존 해리슨", "윌리엄 본", "콜럼버스", "존 캐벗" }, answer = 2 },
		},
	},
}

-- 서버 판정. 서비스 쪽 타입 추론 부담을 줄이려고 이 모듈에 둔다.
local function grade(state: any, p: any): (boolean, string)
	local id = if type(p) == "table" then p.id else nil
	local wiki = if type(id) == "string" then Wiki[id] else nil
	if not wiki or not wiki.quiz or not state.discovered[id] then
		return false, "발견한 지식의 퀴즈만 풀 수 있어요"
	end
	state.wikiQuiz = state.wikiQuiz or {}
	if state.wikiQuiz[id] then
		return false, "이 카드의 퀴즈 보상은 이미 받았어요"
	end
	local answers = p.answers
	if type(answers) ~= "table" then
		return false, "답을 골라 주세요"
	end
	for i, q in wiki.quiz do
		local a = answers[i]
		if type(a) ~= "number" or a < 1 or a > #q.options or a ~= math.floor(a) then
			return false, "모든 문제에 답을 골라 주세요"
		end
	end
	for i, q in wiki.quiz do
		if answers[i] ~= q.answer then
			return false, "틀린 문제가 있어요. 해설을 다시 읽고 도전해 보세요"
		end
	end
	state.wikiQuiz[id] = true
	state.coins += QUIZ_REWARD.coins
	state.fame += QUIZ_REWARD.fame
	return true, string.format("퀴즈 통과! +%d코인, 명성 +%d", QUIZ_REWARD.coins, QUIZ_REWARD.fame)
end

return { Wiki = Wiki, QuizReward = QUIZ_REWARD, Grade = grade }
