--!strict
-- StoryChapters.luau · 인과관계로 이어지는 장(章) 이야기 (2026-11-28 오너 지시: 퀘스트 인과·흐름·몰입)
-- 한 장 = 교역에서 문제 발견 → 지상 탐험으로 원인 확인 → 해상 전투로 해결 → 선택 → 결과가 항구에 보임.
-- 모든 단계에 problem(지금 무엇이 문제인가)·cause(왜 그렇게 됐나)·result(하면 무엇이 바뀌나)를 적는다.
-- 서막(시작 국가 4장)을 마친 플레이어에게 보인다(afterPrologue). 판정은 기존 퀘스트 종류를 그대로 쓴다.
-- 이야기·인물은 게임 속 창작. 다음 장은 docs/STORY_CAUSALITY.md 양식대로 이 파일에 이어 붙인다.
local Q: { any } = {}
local HAND: { [string]: { string } } = {}
local CH1 = "제1장 · 막힌 항로"
local GUIDE1 = "얀센(암스테르담 양모 상인)"

table.insert(Q, { id = "ch1_1", name = "멈춘 직조소", chapter = CH1, guide = GUIDE1, afterPrologue = true, strand = "main",
	summary = "제1장 · 막힌 항로 — 양모 6개를 암스테르담에 납품", kind = "deliver", goodId = "wool", portId = "amsterdam", amount = 6,
	problem = "암스테르담 직조소가 멈췄다. 북해 양모선이 한 달째 오지 않는다.",
	cause = "선원들은 에든버러 앞바다에서 배가 하나씩 사라진다고 수군댄다.",
	result = "직조소가 다시 돌고, 얀센이 '배가 사라지는 물길'을 알려 준다.",
	speaker = "얀센", speakerRole = "양모 상인", line = "양모만 오면 직조공 이백 명이 다시 일해. 근데 배가 자꾸 사라진다네…",
	rewardCoins = 500, rewardFame = 10, rewardCareer = "trade", rewardXp = 80 })
HAND["ch1_1"] = { "암스테르담 직조소의 베틀 이백 대가 한꺼번에 멈췄다. 양모 상인 얀센은 빈 창고 앞에서 장부만 넘긴다. \"북해 양모선이 한 달째 안 와. 에든버러 앞바다에서 배가 사라진다는 소문만 돌고.\" 당장 직조공들 끼니가 걸렸다. 어디서든 양모 여섯 짐만 구해 오면 베틀은 다시 돈다.",
	"베틀이 다시 덜컹거리기 시작했다. 얀센이 지도 한 귀퉁이에 동그라미를 쳤다. \"배가 사라진 곳은 전부 포스 만 근처야. 물범 떼가 떠난 그 물길 말일세. 누가 가서 봐 줘야 해.\"" }

table.insert(Q, { id = "ch1_2", name = "물범이 떠난 물길", chapter = CH1, guide = GUIDE1, afterPrologue = true, strand = "main", after = "ch1_1",
	summary = "제1장 · 막힌 항로 — 에든버러 포스 만 해안을 탐험해 물범 발견", kind = "discover_card", exploreSite = "edinburgh_coast", portId = "edinburgh", cardId = "zoo_seal", amount = 1,
	problem = "배가 사라지는 물길이 어디인지, 왜인지 아무도 모른다.",
	cause = "물범 떼가 떠난 만 안쪽은 배를 숨기기 좋은 깊은 물이다.",
	result = "물범 서식지 뒤편에서 숨겨 둔 배의 밧줄 자국을 찾는다 — 해적의 은신처다.",
	speaker = "얀센", speakerRole = "양모 상인", line = "포스 만에 가거든 물범이 어디로 갔는지부터 보게. 짐승은 사람보다 먼저 위험을 알아.",
	rewardCoins = 600, rewardFame = 12, rewardCareer = "adventure", rewardXp = 100 })
HAND["ch1_2"] = { "에든버러 어부들은 요즘 포스 만 안쪽에 그물을 치지 않는다. \"물범이 떠난 물엔 뭔가 있어.\" 해안을 직접 걸어 물범이 어디로 옮겨 갔는지, 그 빈자리에 무엇이 남았는지 살펴야 한다. 천천히 다가가야 짐승이 달아나지 않는다.",
	"물범 떼는 바깥 바위로 옮겨 가 있었다. 그리고 원래 서식지 뒤편 바위에는 굵은 밧줄이 쓸고 간 자국과 불 피운 흔적. 누군가 배를 숨겨 두고 있다. 사라진 양모선은 사고가 아니었다." }

table.insert(Q, { id = "ch1_3", name = "숨은 돛을 쫓아라", chapter = CH1, guide = GUIDE1, afterPrologue = true, strand = "main", after = "ch1_2",
	summary = "제1장 · 막힌 항로 — 해전에서 2번 승리해 은신처의 해적선 쫓아내기", kind = "win", amount = 2,
	problem = "포스 만에 숨은 해적선이 양모선을 노린다.",
	cause = "은신처가 들킨 해적들이 먼저 상선을 덮치려 한다.",
	result = "해적선이 물러나 북해 양모 항로가 다시 열린다.",
	speaker = "얀센", speakerRole = "양모 상인", line = "은신처를 들켰으니 놈들이 먼저 움직일 거야. 바다에서 끝내 주게.",
	rewardCoins = 900, rewardFame = 20, rewardCareer = "battle", rewardXp = 160 })
HAND["ch1_3"] = { "은신처를 들킨 해적들이 돛을 올렸다. 그대로 두면 다음 양모선이 또 사라진다. 해적 사냥에 나서 두 번 이겨 놈들을 북해에서 몰아내야 한다. 이번엔 상인들 대신 당신 배가 앞에 선다.",
	"두 번째 해적선이 깃발을 내렸다. 포로가 된 선장이 갑판에 무릎을 꿇었다. \"우리도 굶어서 그랬소. 고향 어장이 망했거든.\" 이 사람을 어떻게 할지 정해야 한다." }

table.insert(Q, { id = "ch1_4", name = "무릎 꿇은 선장", chapter = CH1, guide = GUIDE1, afterPrologue = true, strand = "main", after = "ch1_3",
	summary = "제1장 · 막힌 항로 — 붙잡은 해적 선장을 어떻게 할지 고르기", kind = "choice", amount = 1, choiceKey = "ch1_captain",
	choices = {
		{ value = "law", label = "항만청에 넘긴다 (법대로)", result = "항만청이 현상금을 주고 항로 순찰을 늘린다." },
		{ value = "crew", label = "내 배 선원으로 받아 준다 (두 번째 기회)", result = "선장이 해적들이 쓰던 지름길을 알려 준다." },
	},
	problem = "굶주림 때문에 해적이 된 선장이 처분을 기다린다.",
	cause = "고향 어장이 망해 먹고살 길이 없었다.",
	result = "고른 길에 따라 다음 이야기에서 돕는 사람이 달라진다.",
	speaker = "브로디", speakerRole = "해적 선장", line = "우리 선원들도 다시 일할 기회를 얻을 수 있겠소?",
	rewardCoins = 0, rewardFame = 0, rewardXp = 40 })
HAND["ch1_4"] = { "해적 선장 브로디는 고개를 들지 못한다. \"벌은 받겠소. 다만 우리 선원들은 시키는 대로 한 것뿐이오.\" 법대로 넘기면 항구는 안심한다. 받아 주면 바다를 아는 손 하나가 생긴다. 어느 쪽도 틀리지 않았다.",
	"당신의 결정이 부두에 퍼졌다. 어떤 이는 고개를 끄덕였고, 어떤 이는 혀를 찼다. 그러나 모두가 하나는 알았다. 이제 이 바다엔 결정을 내리는 선장이 있다는 것." }

table.insert(Q, { id = "ch1_5a", name = "순찰선이 지키는 길", chapter = CH1, guide = GUIDE1, afterPrologue = true, strand = "main", after = "ch1_4", needChoice = "ch1_captain=law",
	summary = "제1장 · 막힌 항로 — 열린 항로로 양모 10개를 암스테르담에 납품", kind = "deliver", goodId = "wool", portId = "amsterdam", amount = 10,
	problem = "한 달 밀린 주문 때문에 직조소에 양모가 아직 모자란다.",
	cause = "항로가 막혀 있던 동안 주문이 쌓였다.",
	result = "직조소가 밤낮으로 돌고, 암스테르담 양모값이 내려간다. 얀센이 당신을 길드에 추천한다.",
	speaker = "얀센", speakerRole = "양모 상인", line = "항만청 순찰선이 붙었다네! 이제 마음 놓고 실어 오게.",
	rewardCoins = 1500, rewardFame = 35, rewardCareer = "trade", rewardXp = 220 })
HAND["ch1_5a"] = { "항만청이 현상금과 함께 순찰선 두 척을 북해에 붙였다. 이제 양모선이 줄지어 들어올 수 있다. 밀린 주문을 채우려면 양모 열 짐이 더 필요하다.",
	"직조소 굴뚝에서 다시 연기가 올랐다. 얀센이 길드 추천서에 도장을 찍었다. \"자네가 아니었으면 이 도시의 겨울옷이 없었을 걸세.\" 북해 항로에는 이제 당신 이름이 붙었다. 얀센은 베네치아 유리 공방이 원료선 문제로 곤란하다는 편지를 건넸다." }

table.insert(Q, { id = "ch1_5b", name = "해적이 알려 준 지름길", chapter = CH1, guide = GUIDE1, afterPrologue = true, strand = "main", after = "ch1_4", needChoice = "ch1_captain=crew",
	summary = "제1장 · 막힌 항로 — 브로디의 지름길로 양모 10개를 암스테르담에 납품", kind = "deliver", goodId = "wool", portId = "amsterdam", amount = 10,
	problem = "한 달 밀린 주문 때문에 직조소에 양모가 아직 모자란다.",
	cause = "항로가 막혀 있던 동안 주문이 쌓였다.",
	result = "직조소가 다시 돌고, 브로디의 옛 선원들도 상선 일을 얻는다. 얀센이 당신을 길드에 추천한다.",
	speaker = "브로디", speakerRole = "전직 해적 선장", line = "모래톱 사이 물길은 우리만 알았소. 이번엔 양모를 싣고 지나가 봅시다.",
	rewardCoins = 1500, rewardFame = 35, rewardCareer = "trade", rewardXp = 220 })
HAND["ch1_5b"] = { "브로디가 해도에 연필로 선을 그었다. 모래톱 사이 좁은 물길, 해적들만 쓰던 지름길이다. 밀린 주문을 채우려면 양모 열 짐이 더 필요하다. 이번엔 그 길이 훔치는 길이 아니라 나르는 길이 된다.",
	"지름길 덕에 양모선이 이틀 일찍 닿았다. 브로디의 옛 선원들이 부두에서 짐을 내리며 처음으로 정당한 품삯을 받았다. 얀센이 길드 추천서에 도장을 찍었다. \"사람을 살린 선택이었네.\" 얀센은 베네치아 유리 공방에서 온 도움 요청을 건넸다." }


-- 제2~4장: 기존 퀘스트 종류·보상·선택 저장 구조만 사용한다.
local CH2 = "제2장 · 지중해의 꺼진 불"
local GUIDE2 = "엘레나(베네치아 유리 장인)"

table.insert(Q, { id = "ch2_1", name = "꺼져 가는 유리 화로", chapter = CH2, guide = GUIDE2, afterPrologue = true, strand = "main", afterAny = { "ch1_5a", "ch1_5b" },
	summary = "제2장 · 지중해의 꺼진 불 — 유리 6개를 베네치아에 납품", kind = "deliver", amount = 6, goodId = "glass", portId = "venice",
	problem = "무라노 공방의 유리가 바닥나 창문과 등불을 만들지 못한다.",
	cause = "원료를 실은 배가 석호에 닿지 않아 공방의 화로가 꺼졌다.",
	result = "급한 주문을 처리하고 원료 선단의 행방을 추적할 단서를 얻는다.",
	speaker = "엘레나", speakerRole = "유리 장인", line = "유리 여섯 짐이면 오늘 주문은 살려요. 원료선은 왜 안 오는 걸까요?",
	rewardCoins = 800, rewardFame = 15, rewardCareer = "trade", rewardXp = 120 })
HAND["ch2_1"] = { "베네치아의 유리 장인 엘레나는 텅 빈 진열대를 내려다본다. 공방마다 화로를 꺼 놓아 밤에도 굴뚝이 어둡다. 먼저 다른 항구의 유리를 구해 급한 주문을 막아야 한다. 그녀는 무라노 원료선의 장부를 내어 준다.",
	"급한 주문은 막았다. 장부의 마지막 기록은 무라노 원료 하역장이었다. 엘레나는 그곳에서 모래와 원료를 확인해 달라고 부탁한다." }

table.insert(Q, { id = "ch2_2", name = "모래에 남은 봉인", chapter = CH2, guide = GUIDE2, afterPrologue = true, strand = "main", after = "ch2_1",
	summary = "제2장 · 지중해의 꺼진 불 — 무라노 원료 하역장에서 석영 발견", kind = "discover_card", amount = 1, portId = "venice", exploreSite = "venice_murano", cardId = "min_quartz", loreCardId = "min_quartz", loreText = "무라노 공방의 원료 하역장에서 석영과 선단 장부를 비교했다. 원료 부족은 산지 고갈이 아니라 가상의 항로 봉쇄 때문이었다.",
	problem = "원료가 끊긴 까닭을 모르고 공방들은 서로를 의심한다.",
	cause = "정상적인 모래와 석영이 하역장에 남아 있는데 선단의 운송 장부만 비어 있다.",
	result = "원료 공급지가 아니라 해상 봉쇄가 문제라는 증거를 찾는다.",
	speaker = "엘레나", speakerRole = "유리 장인", line = "모래를 살펴봐요. 원료가 나쁜 게 아니라 배가 못 오는 거라면 이야기가 달라져요.",
	rewardCoins = 1000, rewardFame = 17, rewardCareer = "adventure", rewardXp = 160 })
HAND["ch2_2"] = { "무라노의 원료 하역장에는 아직 마른 모래가 남아 있다. 장인들이 쓰는 석영을 확인하고 운송 장부의 빈칸을 조사하자. 부두의 상인은 라구사 앞바다에서 사략선이 통행료를 요구했다고 귀띔한다.",
	"원료 자체는 이상이 없었다. 장부에는 라구사 앞바다의 봉쇄 표식이 반복돼 있었다. 이제 바다에서 통행을 되찾아야 한다." }

table.insert(Q, { id = "ch2_3", name = "유리 항로의 봉쇄선", chapter = CH2, guide = GUIDE2, afterPrologue = true, strand = "main", after = "ch2_2",
	summary = "제2장 · 지중해의 꺼진 불 — 라구사에서 이야기 봉쇄 함대전 완수", kind = "war_clear", amount = 1, portId = "ragusa", warId = "war_ch2", backdrop = "med_east",
	problem = "사략 함대가 원료선을 막아 베네치아 공방을 멈추게 했다.",
	cause = "봉쇄선이 상선의 통행을 독점하고 과도한 통행료를 요구한다.",
	result = "무라노 원료선이 돌아올 수 있는 항로를 연다.",
	speaker = "엘레나", speakerRole = "유리 장인", line = "라구사에서 길을 열어 줘요. 화로를 다시 지피고 싶어요.",
	rewardCoins = 1200, rewardFame = 23, rewardCareer = "battle", rewardXp = 220 })
HAND["ch2_3"] = { "라구사 앞바다에 봉쇄선이 버티고 있다. 원료를 싣고 돌아오는 상선들은 멀리서 돛을 내리고 기다린다. 전투 본부의 이야기 작전에서 봉쇄 함대를 몰아내자. 열린 길을 누가 지킬지도 정해야 한다.",
	"봉쇄선이 물러나고 기다리던 원료선이 돛을 올렸다. 상인 길드와 공화국 감찰관이 각자 항로 관리 방안을 내놓았다. 엘레나는 선장의 판단을 기다린다." }

table.insert(Q, { id = "ch2_4", name = "길드의 약속과 공화국의 봉인", chapter = CH2, guide = GUIDE2, afterPrologue = true, strand = "main", after = "ch2_3",
	summary = "제2장 · 지중해의 꺼진 불 — 상인 길드와 공화국 중 항로 관리 방안 선택", kind = "choice", amount = 1,
	problem = "열린 항로를 누가 지킬지 합의가 되지 않는다.",
	cause = "길드는 신속한 운송을, 감찰관은 공정한 검사와 질서를 원한다.",
	result = "선택한 상대가 마지막 납품을 돕고 공방의 새 거래 방식이 결정된다.",
	speaker = "엘레나", speakerRole = "유리 장인", line = "길드도 공화국도 일리가 있어요. 어느 쪽과 함께할까요?",
	choiceKey = "ch2_patron", choices = {
		{ value = "guild", label = "상인 길드와 공동 운송", result = "길드가 작은 공방들의 운송을 공동으로 맡는다." },
		{ value = "republic", label = "공화국의 공정 검사", result = "감찰관이 공개 장부와 순찰을 책임진다." },
	},
	rewardCoins = 0, rewardFame = 0, rewardXp = 40 })
HAND["ch2_4"] = { "길드 대표는 작은 공방이 한 배를 나누면 비용을 줄일 수 있다고 말한다. 공화국 감찰관은 검사 기준을 공개해야 새 독점이 생기지 않는다고 설명한다. 엘레나는 두 사람 모두 공방을 살리려 한다는 것을 안다. 당신의 선택이 마지막 운송을 결정한다.",
	"두 사람이 결정을 받아들였다. 남은 것은 멈췄던 공방의 주문을 채울 마지막 유리 선단이다." }

table.insert(Q, { id = "ch2_5a", name = "함께 나르는 유리", chapter = CH2, guide = GUIDE2, afterPrologue = true, strand = "main", after = "ch2_4",
	summary = "제2장 · 지중해의 꺼진 불 — 길드의 공동 운송으로 유리 10개를 베네치아에 납품", kind = "deliver", amount = 10, goodId = "glass", portId = "venice", needChoice = "ch2_patron=guild",
	problem = "작은 공방들은 아직 밀린 주문을 감당하지 못한다.",
	cause = "봉쇄 기간에 운송비와 미처리 주문이 쌓였다.",
	result = "길드의 공동 운송으로 공방 주문을 채우고 인도양 후추 상인의 편지를 받는다.",
	speaker = "마르코", speakerRole = "상인 길드 대표", line = "여러 공방의 몫을 한꺼번에 나릅시다. 이번에는 작은 장인도 빠뜨리지 않겠소.",
	rewardCoins = 1800, rewardFame = 40, rewardCareer = "trade", rewardXp = 250 })
HAND["ch2_5a"] = { "마르코는 길드의 공동 장부를 펼쳤다. 여러 공방이 한 선단의 화물을 나눠 받기로 했다. 마지막 유리 열 짐이 도착하면 밀린 주문이 풀린다.",
	"화로가 다시 밝아지고 장인들은 서로의 주문을 확인했다. 엘레나는 동방에서 온 편지를 건넸다. 캘리컷에서 후추 값이 무너져 재배 농가가 곤란하다고 한다." }

table.insert(Q, { id = "ch2_5b", name = "공개 장부의 첫 선단", chapter = CH2, guide = GUIDE2, afterPrologue = true, strand = "main", after = "ch2_4",
	summary = "제2장 · 지중해의 꺼진 불 — 공화국의 검사로 유리 10개를 베네치아에 납품", kind = "deliver", amount = 10, goodId = "glass", portId = "venice", needChoice = "ch2_patron=republic",
	problem = "상인들이 새 항로에서도 부당한 통행료를 걱정한다.",
	cause = "예전 봉쇄 때문에 장부와 운송 계약을 믿지 못한다.",
	result = "공개 검사로 마지막 주문을 채우고 인도양 후추 상인의 편지를 받는다.",
	speaker = "비토", speakerRole = "공화국 감찰관", line = "검사 장부는 누구나 보게 하겠소. 유리 선단을 안심하고 보내 주시오.",
	rewardCoins = 1800, rewardFame = 40, rewardCareer = "trade", rewardXp = 250 })
HAND["ch2_5b"] = { "감찰관 비토는 공개 장부에 통행료와 화물을 적었다. 작은 공방도 똑같이 검사받고 정해진 몫을 받는다. 마지막 유리 열 짐을 베네치아로 실어 오자.",
	"공방의 화로에 불이 돌아왔다. 엘레나는 캘리컷에서 온 상인의 편지를 읽어 주었다. 다음에는 후추 농가의 사정을 살펴야 한다." }
local CH3 = "제3장 · 인도양의 검은 향신료"
local GUIDE3 = "미라(캘리컷 후추 상인)"

table.insert(Q, { id = "ch3_1", name = "팔리지 않는 검은 금", chapter = CH3, guide = GUIDE3, afterPrologue = true, strand = "main", afterAny = { "ch2_5a", "ch2_5b" },
	summary = "제3장 · 인도양의 검은 향신료 — 후추 8개를 캘리컷 공동 창고에 납품", kind = "deliver", amount = 8, goodId = "pepper", portId = "calicut",
	problem = "후추 값이 무너져 재배 농가가 다음 수확을 준비할 수 없다.",
	cause = "바다의 구매 선단이 끊겨 후추가 부두에 쌓여 있다.",
	result = "공동 창고의 첫 물량을 모아 농가의 주문을 확보한다.",
	speaker = "미라", speakerRole = "후추 상인", line = "후추가 넘치는데 살 사람이 오지 않아요. 농가의 물량부터 모아 줘요.",
	rewardCoins = 1100, rewardFame = 20, rewardCareer = "trade", rewardXp = 180 })
HAND["ch3_1"] = { "캘리컷 부두에 검은 후추 자루가 쌓여 있다. 상인 미라는 수확을 마친 농가에게 줄 돈이 모자라다고 한다. 후추를 구해 공동 창고의 계약 물량을 채우면 농가가 숨을 돌릴 수 있다. 왜 선단이 오지 않는지도 찾아야 한다.",
	"첫 물량을 모아 농가에 주문을 돌렸다. 미라는 말라바르 후추밭에서 배를 기다리던 농부가 실종 선단의 단서를 보았다고 알려 준다." }

table.insert(Q, { id = "ch3_2", name = "덩굴 아래의 거래 흔적", chapter = CH3, guide = GUIDE3, afterPrologue = true, strand = "main", after = "ch3_1",
	summary = "제3장 · 인도양의 검은 향신료 — 말라바르 해안의 캘리컷 후추밭에서 후추 덩굴 발견", kind = "discover_card", amount = 1, portId = "calicut", exploreSite = "calicut_pepper", cardId = "bot_pepper_vine", loreCardId = "bot_pepper_vine", loreText = "말라바르 후추 농가에서 덩굴과 수확 장부를 확인했다. 가상의 해적이 항로 정보를 숨겨 농가와 상선의 거래를 막고 있었다.",
	problem = "농가의 수확은 정상인데 거래 선단이 나타나지 않는다.",
	cause = "중개상이 해적과 결탁해 다른 구매자의 항로 정보를 숨겼다.",
	result = "후추 수확과 거래 장부를 대조해 해적 중개상의 속임수를 밝힌다.",
	speaker = "미라", speakerRole = "후추 상인", line = "덩굴이 건강한지 직접 확인해요. 수확이 문제인지 항로가 문제인지 알아야 해요.",
	rewardCoins = 1300, rewardFame = 22, rewardCareer = "adventure", rewardXp = 220 })
HAND["ch3_2"] = { "말라바르 숲 가장자리에는 잘 자란 후추 덩굴이 줄지어 있다. 농부는 제때 도착할 선단의 이름이 거래 장부에서 사라졌다고 말한다. 덩굴을 관찰하고 수확량을 확인하자. 해적 중개상이 가진 항로 지도와 장부의 기록이 맞지 않는다.",
	"후추 덩굴은 건강했고 수확 기록도 정상이었다. 중개상의 거짓말을 들은 해적 선장이 카드 대결을 제안했다. 이기면 숨겨 놓은 항로 정보를 넘기겠다고 한다." }

table.insert(Q, { id = "ch3_3", name = "해적 선장의 카드판", chapter = CH3, guide = GUIDE3, afterPrologue = true, strand = "main", after = "ch3_2",
	summary = "제3장 · 인도양의 검은 향신료 — 캘리컷 해적 선장의 라자라자 지도자 덱에 승리", kind = "duel_leader", amount = 1, portId = "calicut", leaderId = "rajaraja", duelFaction = "southeast_asia", backdrop = "malabar",
	problem = "해적 선장이 구매 선단의 항로를 독점한다.",
	cause = "숨긴 항로를 이용해 농가에는 낮은 가격만 제시했다.",
	result = "카드 대결에서 이겨 항로 기록을 되찾는다.",
	speaker = "미라", speakerRole = "후추 상인", line = "그 선장은 라자라자 지도자 덱을 쓰더군요. 이기고 항로 장부를 받아 와요.",
	rewardCoins = 1500, rewardFame = 28, rewardCareer = "battle", rewardXp = 280 })
HAND["ch3_3"] = { "해적 선장은 주점 탁자에 지도자 덱을 펼쳐 놓았다. 그는 가상의 인물이며 라자라자의 카드를 전략으로 사용한다. 미라는 항로 장부를 걸고 정식 카드 대결을 요구한다. 일지의 대결 버튼에서 승부를 끝내자.",
	"해적 선장은 약속대로 항로 장부를 건넸다. 미라와 항해자 아룬이 후추 거래를 다시 여는 서로 다른 방안을 내놓았다." }

table.insert(Q, { id = "ch3_4", name = "농가의 계약과 열린 시장", chapter = CH3, guide = GUIDE3, afterPrologue = true, strand = "main", after = "ch3_3",
	summary = "제3장 · 인도양의 검은 향신료 — 공동 계약과 열린 시장 중 후추 거래 방안 선택", kind = "choice", amount = 1,
	problem = "되찾은 거래망을 어떤 방식으로 운영할지 의견이 갈린다.",
	cause = "농가는 안정된 계약을, 상선은 열린 경쟁을 바란다.",
	result = "선택에 따라 마지막 후추 운송을 돕는 인물이 달라진다.",
	speaker = "미라", speakerRole = "후추 상인", line = "농가의 안정도, 항구의 경쟁도 중요해요. 함께 결정해요.",
	choiceKey = "ch3_market", choices = {
		{ value = "coop", label = "농가 공동 계약", result = "미라가 재배 농가의 공동 계약을 맡는다." },
		{ value = "open", label = "여러 상선에 열린 거래", result = "아룬이 여러 구매자의 항로를 공개한다." },
	},
	rewardCoins = 0, rewardFame = 0, rewardXp = 40 })
HAND["ch3_4"] = { "미라는 농가가 공동으로 가격과 물량을 협상해야 한다고 주장한다. 항해자 아룬은 여러 선단이 참여해야 새 독점이 생기지 않는다고 답한다. 두 사람 모두 후추를 제대로 팔 수 있는 항구를 원한다. 마지막 운송 방식을 고르자.",
	"결정이 농가와 부두에 전해졌다. 코친의 상선들이 마지막 후추 계약 물량을 기다리기 시작했다." }

table.insert(Q, { id = "ch3_5a", name = "농가의 공동 선적", chapter = CH3, guide = GUIDE3, afterPrologue = true, strand = "main", after = "ch3_4",
	summary = "제3장 · 인도양의 검은 향신료 — 공동 계약 후추 12개를 코친에 납품", kind = "deliver", amount = 12, goodId = "pepper", portId = "cochin", needChoice = "ch3_market=coop",
	problem = "농가의 공동 계약 물량이 아직 채워지지 않았다.",
	cause = "거래가 중단된 동안 농가마다 운송 약속이 흩어졌다.",
	result = "공동 선적을 마치고 나가사키 교역 금지령 소식을 듣는다.",
	speaker = "미라", speakerRole = "후추 상인", line = "농가들이 함께 계약했어요. 코친으로 후추를 보내요.",
	rewardCoins = 2400, rewardFame = 50, rewardCareer = "trade", rewardXp = 320 })
HAND["ch3_5a"] = { "미라는 농가의 몫이 적힌 공동 계약서를 가져왔다. 후추 열두 짐을 코친의 선단에 보내면 계약이 시작된다. 농부들은 다음 수확을 준비할 수 있게 된다.",
	"코친의 선단에 후추가 실렸다. 미라는 동아시아에서 온 편지를 내밀었다. 나가사키의 데지마 교역이 멈췄다는 소식이었다." }

table.insert(Q, { id = "ch3_5b", name = "다시 열린 후추 항로", chapter = CH3, guide = GUIDE3, afterPrologue = true, strand = "main", after = "ch3_4",
	summary = "제3장 · 인도양의 검은 향신료 — 열린 시장 후추 12개를 코친에 납품", kind = "deliver", amount = 12, goodId = "pepper", portId = "cochin", needChoice = "ch3_market=open",
	problem = "새로 참여한 상선들이 첫 계약을 기다리고 있다.",
	cause = "독점 중개상이 숨겨 온 항로 때문에 구매자가 떠났다.",
	result = "다시 열린 후추 항로의 첫 납품을 마치고 나가사키 소식을 듣는다.",
	speaker = "아룬", speakerRole = "항해자", line = "장부를 모두에게 보여 줬소. 코친으로 첫 후추를 보냅시다.",
	rewardCoins = 2400, rewardFame = 50, rewardCareer = "trade", rewardXp = 320 })
HAND["ch3_5b"] = { "아룬은 여러 상선의 도착 순서를 부두에 알렸다. 후추 열두 짐을 코친으로 보내 첫 계약을 완료하자. 배마다 농가에서 온 물량이 정직하게 기록된다.",
	"새 구매 선단이 코친을 떠났다. 아룬은 나가사키에서 교역 금지령이 내려졌다는 편지를 보여 줬다. 이번에는 동아시아의 길을 찾아야 한다." }
local CH4 = "제4장 · 동아시아의 닫힌 문"
local GUIDE4 = "하루(나가사키 통역관)"

table.insert(Q, { id = "ch4_1", name = "데지마에 멈춘 상자", chapter = CH4, guide = GUIDE4, afterPrologue = true, strand = "main", afterAny = { "ch3_5a", "ch3_5b" },
	summary = "제4장 · 동아시아의 닫힌 문 — 설탕 6개를 나가사키의 허가 창고에 납품", kind = "deliver", amount = 6, goodId = "sugar", portId = "nagasaki",
	problem = "데지마의 가상 교역 금지령으로 허가 화물까지 멈춰 있다.",
	cause = "위조된 항해 기록 때문에 관리가 상선의 출입을 믿지 못한다.",
	result = "허가 창고의 주문을 채우고 서적과 지도 기록을 조사할 허락을 얻는다.",
	speaker = "하루", speakerRole = "통역관", line = "허가받은 설탕부터 창고에 넣어요. 장부의 진위를 알아봐야 해요.",
	rewardCoins = 1500, rewardFame = 28, rewardCareer = "trade", rewardXp = 240 })
HAND["ch4_1"] = { "나가사키 통역관 하루는 데지마 창고 앞에서 수입 장부를 번역하고 있다. 가상의 위조 문서 사건으로 정상 화물까지 멈췄다. 먼저 허가된 설탕을 납품해 창고의 급한 주문을 채우자. 하루는 진짜 서적과 항해 지도를 대조할 수 있다고 한다.",
	"설탕이 허가 창고에 도착했다. 하루는 데지마에 보관된 목판 인쇄 자료와 항해 기록을 확인해 달라고 부탁했다." }

table.insert(Q, { id = "ch4_2", name = "두 문서의 다른 인장", chapter = CH4, guide = GUIDE4, afterPrologue = true, strand = "main", after = "ch4_1",
	summary = "제4장 · 동아시아의 닫힌 문 — 데지마에서 목판 인쇄 자료를 발견해 서적·지도 조사", kind = "discover_card", amount = 1, portId = "nagasaki", exploreSite = "nagasaki_dejima", cardId = "relic_woodblock", loreCardId = "relic_woodblock", loreText = "데지마의 목판 인쇄 자료와 항해 지도를 비교한 가상의 사건. 서적의 기록과 위조된 항해 문서의 출처가 서로 달랐다.",
	problem = "상선의 진짜 항해 기록과 위조본을 구별하기 어렵다.",
	cause = "위조 문서가 정상 인쇄 자료의 인장을 흉내 냈다.",
	result = "목판 자료와 지도의 차이에서 위조 선단의 흔적을 찾는다.",
	speaker = "하루", speakerRole = "통역관", line = "인쇄된 선과 항해 지도부터 살펴요. 문서가 어디서 달라졌는지 보여요.",
	rewardCoins = 1700, rewardFame = 30, rewardCareer = "adventure", rewardXp = 280 })
HAND["ch4_2"] = { "데지마 창고에 남은 책과 목판 인쇄 자료를 하루가 펼친다. 항해 지도와 인장 위치를 비교해 위조 문서의 흔적을 찾자. 정상적인 교역 기록은 위조본과 달리 입항 순서를 분명히 남긴다. 해협의 위조 선단이 문서를 퍼뜨렸다는 단서가 나온다.",
	"기록 비교로 위조 선단의 흔적이 드러났다. 항만의 관리도 이제 해협을 수비하는 작전에 동의했다." }

table.insert(Q, { id = "ch4_3", name = "해협의 위조 깃발", chapter = CH4, guide = GUIDE4, afterPrologue = true, strand = "main", after = "ch4_2",
	summary = "제4장 · 동아시아의 닫힌 문 — 나가사키에서 이야기 해협 함대전 완수", kind = "war_clear", amount = 1, portId = "nagasaki", warId = "war_ch4", backdrop = "east_china",
	problem = "위조 문서를 이용한 무장 선단이 정상 상선의 출입을 방해한다.",
	cause = "거짓 허가증으로 통행을 가장한 선단이 해협에 남아 있다.",
	result = "해협에서 무장 선단을 몰아내 정상 화물의 통행 조건을 마련한다.",
	speaker = "하루", speakerRole = "통역관", line = "나가사키 전투 본부에서 해협 작전을 맡아 주세요. 정상 상선이 기다려요.",
	rewardCoins = 1900, rewardFame = 36, rewardCareer = "battle", rewardXp = 340 })
HAND["ch4_3"] = { "해협 바깥에는 위조 깃발을 쓰는 무장 선단이 대기한다. 정상 상선은 항만 밖에서 입항을 기다린다. 전투 본부의 이야기 함대전을 완수해 항로를 안전하게 열자. 이후 어떤 검사 방식으로 교역을 재개할지 결정해야 한다.",
	"위조 선단이 물러났다. 하루와 항만 관리가 서로 다른 교역 재개 방식을 제안한다. 어느 방식을 택할지 결정할 때다." }

table.insert(Q, { id = "ch4_4", name = "서적의 길과 항만의 약속", chapter = CH4, guide = GUIDE4, afterPrologue = true, strand = "main", after = "ch4_3",
	summary = "제4장 · 동아시아의 닫힌 문 — 공동 검수와 공식 허가 중심 교역 중 선택", kind = "choice", amount = 1,
	problem = "교역을 다시 열되 위조 문서가 반복되지 않게 해야 한다.",
	cause = "통역관은 공동 기록을, 항만 관리는 엄격한 허가 확인을 중시한다.",
	result = "고른 방식으로 마지막 선적을 완수하고 항해 일지를 마무리한다.",
	speaker = "하루", speakerRole = "통역관", line = "공동 기록도 허가 확인도 중요해요. 어떤 길을 택할까요?",
	choiceKey = "ch4_treaty", choices = {
		{ value = "records", label = "통역관의 공동 기록과 검수", result = "하루가 두 언어로 된 공동 장부를 맡는다." },
		{ value = "permit", label = "항만 관리의 공식 허가", result = "관리 겐이 허가와 검사를 책임진다." },
	},
	rewardCoins = 0, rewardFame = 0, rewardXp = 40 })
HAND["ch4_4"] = { "하루는 양쪽 상인이 함께 읽을 수 있는 장부를 제안한다. 항만 관리 겐은 공식 허가를 확인하는 절차가 안전하다고 설명한다. 두 사람은 서로 다른 방식으로 정상 교역을 지키려 한다. 당신은 마지막 선단의 방식을 고른다.",
	"새 교역 방안이 결정됐다. 이제 허가된 마지막 화물을 들여와 나가사키의 창고를 다시 열어야 한다." }

table.insert(Q, { id = "ch4_5a", name = "두 언어의 선적 장부", chapter = CH4, guide = GUIDE4, afterPrologue = true, strand = "main", after = "ch4_4",
	summary = "제4장 · 동아시아의 닫힌 문 — 공동 기록에 따라 설탕 10개를 나가사키에 납품", kind = "deliver", amount = 10, goodId = "sugar", portId = "nagasaki", needChoice = "ch4_treaty=records",
	problem = "교역 재개를 증명할 첫 공동 장부가 아직 비어 있다.",
	cause = "정상 상선의 거래 기록이 위조 문서와 함께 막혀 있었다.",
	result = "공동 검수의 첫 선적을 끝내고 네 장의 항해 일지를 완성한다.",
	speaker = "하루", speakerRole = "통역관", line = "설탕을 보내 줘요. 두 언어의 장부에 같은 기록을 남길게요.",
	rewardCoins = 3200, rewardFame = 65, rewardCareer = "trade", rewardXp = 420 })
HAND["ch4_5a"] = { "하루는 상선과 항만 관리가 함께 읽을 수 있는 장부를 준비했다. 설탕 열 짐을 나가사키에 보내 첫 교역을 기록하자. 창고 앞의 상인들이 오랜 기다림 끝에 화물을 받는다.",
	"공동 장부의 첫 줄이 채워졌다. 하루는 북해, 지중해, 인도양, 동아시아에서 모은 기록을 함께 묶었다. 새로운 항로의 이야기는 이제 플레이어의 다음 항해에서 이어진다." }

table.insert(Q, { id = "ch4_5b", name = "허가된 구리 선단", chapter = CH4, guide = GUIDE4, afterPrologue = true, strand = "main", after = "ch4_4",
	summary = "제4장 · 동아시아의 닫힌 문 — 공식 허가에 따라 구리 10개를 나가사키에 납품", kind = "deliver", amount = 10, goodId = "copper", portId = "nagasaki", needChoice = "ch4_treaty=permit",
	problem = "허가된 화물도 첫 정상 검사를 통과해야 한다.",
	cause = "위조 사건 뒤 정상적인 거래를 다시 증명해야 한다.",
	result = "공식 검사의 첫 선적을 끝내고 네 장의 항해 일지를 완성한다.",
	speaker = "겐", speakerRole = "항만 관리", line = "허가증을 확인했소. 구리 선단을 정해진 창고로 보내 주시오.",
	rewardCoins = 3200, rewardFame = 65, rewardCareer = "trade", rewardXp = 420 })
HAND["ch4_5b"] = { "겐은 공식 허가 장부를 열고 선적 기록을 확인한다. 구리 열 짐을 나가사키에 납품해 첫 정상 거래를 끝내자. 하루는 확인된 문서를 양쪽 상인에게 설명한다.",
	"창고의 문이 열리고 정상 화물이 기록됐다. 하루는 네 바다에서 이어진 선택과 결과를 항해 일지에 적었다. 그 일지는 다음 항해에서 다시 펼쳐진다." }

return { Quests = Q, Hand = HAND, Chapters = {
	{ id = "ch1", title = CH1, guide = GUIDE1, first = "ch1_1", last = { "ch1_5a", "ch1_5b" } },
	{ id = "ch2", title = CH2, guide = GUIDE2, first = "ch2_1", last = { "ch2_5a", "ch2_5b" } },
	{ id = "ch3", title = CH3, guide = GUIDE3, first = "ch3_1", last = { "ch3_5a", "ch3_5b" } },
	{ id = "ch4", title = CH4, guide = GUIDE4, first = "ch4_1", last = { "ch4_5a", "ch4_5b" } },
} }

