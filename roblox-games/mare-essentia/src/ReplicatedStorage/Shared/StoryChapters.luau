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
	problem = "북해 양모선이 사라져 직조소가 멈췄고 셀키 괴담이 퍼진다.",
	cause = "선원들의 마지막 편지에 포스 만의 이상한 목소리가 기록돼 있다.",
	result = "직조소가 다시 돌고, 얀센이 '배가 사라지는 물길'을 알려 준다.",
	speaker = "얀센", speakerRole = "양모 상인", line = "셀키 소문이 돌지만 배가 사라진 까닭부터 알아야 하네.",
	rewardCoins = 500, rewardFame = 10, rewardCareer = "trade", rewardXp = 80 })
HAND["ch1_1"] = { "북해 섬들에는 물범이 사람의 모습을 취한다는 셀키 전승이 있다. 암스테르담의 양모 상인 얀센은 실종된 배의 선원이 남긴 편지를 읽는다. 마지막 문장은 안개 속에서 사람 목소리를 들었다는 말이었다. 멈춘 베틀을 살릴 양모 여섯 짐을 먼저 구하자.",
	"베틀이 돌아가자 얀센은 실종 선박의 기록을 펼쳤다. 마지막으로 목격된 곳은 에든버러의 포스 만이었다. 셀키 이야기인지 사람의 속임수인지, 물범이 떠난 해안을 찾아보자." }

table.insert(Q, { id = "ch1_2", name = "물범이 떠난 물길", chapter = CH1, guide = GUIDE1, afterPrologue = true, strand = "main", after = "ch1_1",
	summary = "제1장 · 막힌 항로 — 에든버러 포스 만 해안을 탐험해 물범 발견", kind = "discover_card", exploreSite = "edinburgh_coast", portId = "edinburgh", cardId = "zoo_seal", amount = 1,
	problem = "셀키 괴담 때문에 어부들이 포스 만에 접근하지 않는다.",
	cause = "물범이 떠난 뒤 바위에서 이상한 소리와 사람의 흔적이 발견됐다.",
	result = "물범 서식지 뒤편에서 숨겨 둔 배의 밧줄 자국을 찾는다 — 해적의 은신처다.",
	speaker = "얀센", speakerRole = "양모 상인", line = "셀키는 전설일세. 물범이 떠난 곳에 남은 흔적을 찾아보게.",
	rewardCoins = 600, rewardFame = 12, rewardCareer = "adventure", rewardXp = 100 })
HAND["ch1_2"] = { "포스 만의 어부는 물범이 사라진 밤마다 바위 사이에서 노랫소리가 들렸다고 한다. 북쪽 섬에서 전해 온 셀키 이야기와 닮았지만 어부도 진실을 알지 못한다. 물범의 새로운 서식지를 관찰하고 바위 뒤편의 흔적을 살피자. 전설은 단서일 뿐 증거가 아니다.",
	"물범은 바깥 바위에 살아 있었다. 빈 서식지 뒤에는 밧줄에 쓸린 흔적과 사람의 발자국이 남아 있었다. 실종을 셀키 탓으로 돌린 것은 해적이었다. 이제 상선을 지킬 차례다." }

table.insert(Q, { id = "ch1_3", name = "숨은 돛을 쫓아라", chapter = CH1, guide = GUIDE1, afterPrologue = true, strand = "main", after = "ch1_2",
	summary = "제1장 · 막힌 항로 — 해전에서 2번 승리해 은신처의 해적선 쫓아내기", kind = "win", amount = 2,
	problem = "포스 만에 숨은 해적선이 양모선을 노린다.",
	cause = "은신처가 들킨 해적들이 먼저 상선을 덮치려 한다.",
	result = "해적선이 물러나 북해 양모 항로가 다시 열린다.",
	speaker = "얀센", speakerRole = "양모 상인", line = "은신처를 들켰으니 놈들이 먼저 움직일 거야. 바다에서 끝내 주게.",
	rewardCoins = 900, rewardFame = 20, rewardCareer = "battle", rewardXp = 160 })
HAND["ch1_3"] = { "안개를 이용하던 해적들의 은신처가 드러났다. 얀센은 실종된 선박의 가족들이 여전히 부두에서 기다린다고 전한다. 해적선과 두 차례 싸워 양모 항로를 확보하자. 이번 항해의 상대는 전설 속 존재가 아니라 사람이다.",
	"두 번째 해적선이 물러나고 붙잡힌 선장 브로디가 굶주린 고향 이야기를 꺼냈다. 전설을 악용한 죄와 선원들의 생계가 한 사람의 운명에 얽혔다. 이제 그의 처분을 정해야 한다." }

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
HAND["ch1_4"] = { "브로디는 자신이 셀키 소문을 퍼뜨렸다고 털어놓는다. 피해 상인들은 항만청의 재판을 원한다. 그와 함께했던 선원들은 다시 일할 기회를 바란다. 법의 책임과 재기의 가능성 사이에서 결정하자.",
	"결정이 부두에 전해졌다. 이제 소문 대신 실제 항로의 안전을 증명할 마지막 양모 운송이 남았다." }

table.insert(Q, { id = "ch1_5a", name = "순찰선이 지키는 길", chapter = CH1, guide = GUIDE1, afterPrologue = true, strand = "main", after = "ch1_4", needChoice = "ch1_captain=law",
	summary = "제1장 · 막힌 항로 — 열린 항로로 양모 10개를 암스테르담에 납품", kind = "deliver", goodId = "wool", portId = "amsterdam", amount = 10,
	problem = "한 달 밀린 주문 때문에 직조소에 양모가 아직 모자란다.",
	cause = "항로가 막혀 있던 동안 주문이 쌓였다.",
	result = "직조소가 밤낮으로 돌고, 암스테르담 양모값이 내려간다. 얀센의 추천으로 암스테르담 길드 허가증을 받는다(특산품·명품 거래).", rewardPermit = "amsterdam",
	speaker = "얀센", speakerRole = "양모 상인", line = "항만청 순찰선이 붙었다네! 이제 마음 놓고 실어 오게.",
	rewardCoins = 1500, rewardFame = 35, rewardCareer = "trade", rewardXp = 220 })
HAND["ch1_5a"] = { "항만청은 브로디를 인계받고 순찰을 늘렸다. 실종을 두려워하던 양모 상인들이 다시 운송에 나섰다. 양모 열 짐을 실어 암스테르담의 밀린 주문을 마치자.",
	"직조공들은 겨울옷을 만들기 시작했다. 얀센은 길드 추천서에 도장을 찍고, 셀키 전설과 실제 사건을 구분해 기록했다. 이어 무라노의 유리 장인이 보낸 봉인된 편지를 건넸다." }

table.insert(Q, { id = "ch1_5b", name = "해적이 알려 준 지름길", chapter = CH1, guide = GUIDE1, afterPrologue = true, strand = "main", after = "ch1_4", needChoice = "ch1_captain=crew",
	summary = "제1장 · 막힌 항로 — 브로디의 지름길로 양모 10개를 암스테르담에 납품", kind = "deliver", goodId = "wool", portId = "amsterdam", amount = 10,
	problem = "한 달 밀린 주문 때문에 직조소에 양모가 아직 모자란다.",
	cause = "항로가 막혀 있던 동안 주문이 쌓였다.",
	result = "직조소가 다시 돌고, 브로디의 옛 선원들도 상선 일을 얻는다. 얀센의 추천으로 암스테르담 길드 허가증을 받는다(특산품·명품 거래).", rewardPermit = "amsterdam",
	speaker = "브로디", speakerRole = "전직 해적 선장", line = "모래톱 사이 물길은 우리만 알았소. 이번엔 양모를 싣고 지나가 봅시다.",
	rewardCoins = 1500, rewardFame = 35, rewardCareer = "trade", rewardXp = 220 })
HAND["ch1_5b"] = { "브로디는 옛 선원들과 함께 상선 일을 시작했다. 그는 안개가 걷힐 때 확인할 수 있는 모래톱의 물길을 알려 주었다. 양모 열 짐을 실어 그들의 첫 정직한 운송을 마치자.",
	"양모선이 항구에 닿고 옛 해적들은 품삯을 받았다. 얀센은 길드 추천서에 도장을 찍었다. 그는 베네치아의 유리 장인이 보낸 봉인된 편지를 건넸다." }


-- 제2~4장: 기존 퀘스트 종류·보상·선택 저장 구조만 사용한다.
local CH2 = "제2장 · 지중해의 꺼진 불"
local GUIDE2 = "엘레나(베네치아 유리 장인)"

table.insert(Q, { id = "ch2_1", name = "꺼져 가는 유리 화로", chapter = CH2, guide = GUIDE2, afterPrologue = true, strand = "main", afterAny = { "ch1_5a", "ch1_5b" },
	summary = "제2장 · 지중해의 꺼진 불 — 유리 6개를 베네치아에 납품", kind = "deliver", amount = 6, goodId = "glass", portId = "venice",
	problem = "무라노 공방의 화로가 꺼지고 제작 비밀을 요구하는 편지가 도착했다.",
	cause = "원료선이 끊긴 시점과 협박 편지의 도착 시점이 겹친다.",
	result = "급한 주문을 처리하고 원료 선단의 행방을 추적할 단서를 얻는다.",
	speaker = "엘레나", speakerRole = "유리 장인", line = "유리 여섯 짐이면 주문은 살려요. 하지만 누군가 공방의 비밀을 노려요.",
	rewardCoins = 800, rewardFame = 15, rewardCareer = "trade", rewardXp = 120 })
HAND["ch2_1"] = { "1291년 베네치아는 화재 위험을 줄이기 위해 유리 화로를 무라노로 옮기도록 했다. 이 역사에서 출발한 가상의 사건에서 장인 엘레나의 공방은 원료선이 끊겨 불을 끄고 있다. 익명의 편지는 공방의 비밀을 넘기면 운송을 재개해 주겠다고 협박한다. 먼저 유리 여섯 짐을 마련해 밀린 주문을 막자.",
	"급한 주문을 처리한 엘레나는 편지와 원료 장부를 건넸다. 봉인의 문양이 무라노 하역장의 기록과 닮았다. 석영과 장부를 대조할 차례다." }

table.insert(Q, { id = "ch2_2", name = "모래에 남은 봉인", chapter = CH2, guide = GUIDE2, afterPrologue = true, strand = "main", after = "ch2_1",
	summary = "제2장 · 지중해의 꺼진 불 — 무라노 원료 하역장에서 석영 발견", kind = "discover_card", amount = 1, portId = "venice", exploreSite = "venice_murano", cardId = "min_quartz", loreCardId = "min_quartz", loreText = "무라노 공방의 원료 하역장에서 석영과 선단 장부를 비교했다. 원료 부족은 산지 고갈이 아니라 가상의 항로 봉쇄 때문이었다.",
	problem = "협박 편지의 봉인과 원료선 실종이 관련 있는지 밝혀야 한다.",
	cause = "정상적인 석영은 남아 있는데 라구사로 이어지는 운송 장부에 이상이 있다.",
	result = "원료 공급지가 아니라 해상 봉쇄가 문제라는 증거를 찾는다.",
	speaker = "엘레나", speakerRole = "유리 장인", line = "석영과 장부를 대조해요. 편지의 봉인도 확인해 줘요.",
	rewardCoins = 1000, rewardFame = 17, rewardCareer = "adventure", rewardXp = 160 })
HAND["ch2_2"] = { "무라노 하역장에는 정상적인 석영이 남아 있다. 엘레나는 협박 편지의 봉인과 원료선의 기록을 비교해 달라고 부탁한다. 원료가 부족한 것이 아니라 누군가 운송을 막는다면 장부의 빈칸을 설명할 수 있다. 라구사에서 돌아온 상인의 증언도 확인하자.",
	"석영은 정상이고 장부에는 라구사 앞바다에서 요구한 통행료가 남아 있었다. 공방의 비밀을 노린 협박과 해상 봉쇄가 하나의 사건으로 이어졌다. 봉쇄 함대를 막아야 한다." }

table.insert(Q, { id = "ch2_3", name = "유리 항로의 봉쇄선", chapter = CH2, guide = GUIDE2, afterPrologue = true, strand = "main", after = "ch2_2",
	summary = "제2장 · 지중해의 꺼진 불 — 라구사에서 이야기 봉쇄 함대전 완수", kind = "war_clear", amount = 1, portId = "ragusa", warId = "war_ch2", backdrop = "med_east",
	problem = "사략 함대가 원료선을 막아 베네치아 공방을 멈추게 했다.",
	cause = "봉쇄선이 상선의 통행을 독점하고 과도한 통행료를 요구한다.",
	result = "무라노 원료선이 돌아올 수 있는 항로를 연다.",
	speaker = "엘레나", speakerRole = "유리 장인", line = "라구사에서 길을 열어 줘요. 화로를 다시 지피고 싶어요.",
	rewardCoins = 1200, rewardFame = 23, rewardCareer = "battle", rewardXp = 220 })
HAND["ch2_3"] = { "라구사 앞바다의 가상 사략 함대가 통행료와 장인들의 비밀을 요구한다. 원료선은 공방의 기술을 빼앗기지 않으려고 항구 밖에서 기다리고 있다. 전투 본부의 이야기 함대전에서 봉쇄를 풀자.",
	"원료선은 길을 되찾았다. 길드 대표 마르코와 감찰관 비토는 장인의 기술과 생계를 어떻게 지킬지 서로 다른 제안을 한다. 엘레나는 결정을 맡긴다." }

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
HAND["ch2_4"] = { "마르코는 장인들이 공동 운송과 상호 보호를 맡자고 제안한다. 비토는 통행료 장부를 공개하되 장인의 제작 비법은 보호하겠다고 한다. 두 사람의 의견은 생계와 공정한 거래를 위한 서로 다른 해법이다. 마지막 운송 방식을 선택하자.",
	"결정이 공방에 전해졌다. 장인의 비밀을 지키면서 밀린 주문을 채울 마지막 유리 선단이 준비된다." }

table.insert(Q, { id = "ch2_5a", name = "함께 나르는 유리", chapter = CH2, guide = GUIDE2, afterPrologue = true, strand = "main", after = "ch2_4",
	summary = "제2장 · 지중해의 꺼진 불 — 길드의 공동 운송으로 유리 10개를 베네치아에 납품", kind = "deliver", amount = 10, goodId = "glass", portId = "venice", needChoice = "ch2_patron=guild",
	problem = "작은 공방들은 아직 밀린 주문을 감당하지 못한다.",
	cause = "봉쇄 기간에 운송비와 미처리 주문이 쌓였다.",
	result = "길드의 공동 운송으로 공방 주문을 채우고 인도양 후추 상인의 편지를 받는다.",
	speaker = "마르코", speakerRole = "상인 길드 대표", line = "여러 공방의 몫을 한꺼번에 나릅시다. 이번에는 작은 장인도 빠뜨리지 않겠소.",
	rewardCoins = 1800, rewardFame = 40, rewardCareer = "trade", rewardXp = 250 })
HAND["ch2_5a"] = { "마르코는 작은 공방도 비용을 나눠 낼 수 있도록 공동 운송 장부를 작성했다. 엘레나와 장인들은 유리 제작의 비밀을 간직한 채 다시 일할 준비를 한다. 유리 열 짐을 납품해 약속을 마치자.",
	"화로마다 불이 켜지고 엘레나는 협박 편지를 사건 기록에 남겼다. 인도양에서 도착한 다음 편지에는 후추 자루에 찍힌 기이한 새 문양이 그려져 있었다." }

table.insert(Q, { id = "ch2_5b", name = "공개 장부의 첫 선단", chapter = CH2, guide = GUIDE2, afterPrologue = true, strand = "main", after = "ch2_4",
	summary = "제2장 · 지중해의 꺼진 불 — 공화국의 검사로 유리 10개를 베네치아에 납품", kind = "deliver", amount = 10, goodId = "glass", portId = "venice", needChoice = "ch2_patron=republic",
	problem = "상인들이 새 항로에서도 부당한 통행료를 걱정한다.",
	cause = "예전 봉쇄 때문에 장부와 운송 계약을 믿지 못한다.",
	result = "공개 검사로 마지막 주문을 채우고 인도양 후추 상인의 편지를 받는다.",
	speaker = "비토", speakerRole = "공화국 감찰관", line = "검사 장부는 누구나 보게 하겠소. 유리 선단을 안심하고 보내 주시오.",
	rewardCoins = 1800, rewardFame = 40, rewardCareer = "trade", rewardXp = 250 })
HAND["ch2_5b"] = { "비토는 통행료와 화물의 기록을 공개하고 장인의 기술 자체는 공개하지 않기로 했다. 작은 공방도 같은 검사 기준으로 선적한다. 유리 열 짐을 납품해 새 약속을 마치자.",
	"공방의 불빛이 석호에 비쳤다. 엘레나는 캘리컷에서 온 편지와 후추 자루의 기이한 새 문양을 보여 주었다. 이번에는 인도양의 수수께끼가 기다린다." }
local CH3 = "제3장 · 인도양의 검은 향신료"
local GUIDE3 = "미라(캘리컷 후추 상인)"

table.insert(Q, { id = "ch3_1", name = "팔리지 않는 검은 금", chapter = CH3, guide = GUIDE3, afterPrologue = true, strand = "main", afterAny = { "ch2_5a", "ch2_5b" },
	summary = "제3장 · 인도양의 검은 향신료 — 후추 8개를 캘리컷 공동 창고에 납품", kind = "deliver", amount = 8, goodId = "pepper", portId = "calicut",
	problem = "후추 값이 폭락하고 거대한 새 로크가 배를 삼켰다는 소문이 돈다.",
	cause = "구매 선단이 끊겼고 후추 자루에 정체불명의 새 표식이 찍혔다.",
	result = "공동 창고의 첫 물량을 모아 농가의 주문을 확보한다.",
	speaker = "미라", speakerRole = "후추 상인", line = "신밧드 이야기 같은 소문이 돌아요. 농가의 물량부터 모아 줘요.",
	rewardCoins = 1100, rewardFame = 20, rewardCareer = "trade", rewardXp = 180 })
HAND["ch3_1"] = { "말라바르의 후추 교역은 계절풍과 여러 항구의 상인들을 잇는 실제 역사에 뿌리를 둔다. 가상의 상인 미라는 후추 구매선이 끊기자 선원들이 신밧드 항해담의 거대한 새 로크를 두려워한다고 전한다. 사라진 선단의 표식이 그 새와 닮았다는 것이다. 우선 공동 창고의 후추 여덟 짐을 채우자.",
	"공동 창고의 계약이 시작됐다. 미라는 농부가 본 새 문양과 수확 장부를 비교해 달라고 한다. 말라바르의 후추밭으로 향하자." }

table.insert(Q, { id = "ch3_2", name = "덩굴 아래의 거래 흔적", chapter = CH3, guide = GUIDE3, afterPrologue = true, strand = "main", after = "ch3_1",
	summary = "제3장 · 인도양의 검은 향신료 — 말라바르 해안의 캘리컷 후추밭에서 후추 덩굴 발견", kind = "discover_card", amount = 1, portId = "calicut", exploreSite = "calicut_pepper", cardId = "bot_pepper_vine", loreCardId = "bot_pepper_vine", loreText = "말라바르 후추 농가에서 덩굴과 수확 장부를 확인했다. 가상의 해적이 항로 정보를 숨겨 농가와 상선의 거래를 막고 있었다.",
	problem = "후추밭은 정상인데 로크 소문 때문에 구매선이 오지 않는다.",
	cause = "중개상이 새 문양을 사용해 실제 항로 기록을 숨겼다.",
	result = "후추 수확과 거래 장부를 대조해 해적 중개상의 속임수를 밝힌다.",
	speaker = "미라", speakerRole = "후추 상인", line = "로크는 항해담 속 새예요. 덩굴과 장부에서 진짜 단서를 찾아요.",
	rewardCoins = 1300, rewardFame = 22, rewardCareer = "adventure", rewardXp = 220 })
HAND["ch3_2"] = { "신밧드의 로크는 오래된 항해 문학에 등장하는 상상의 새다. 말라바르 후추밭의 농부는 그 새를 그린 거래 표식을 내놓는다. 덩굴과 수확 기록을 살펴보면 후추가 모자라지 않다는 것을 확인할 수 있다. 장부에서 구매선의 이름이 지워진 까닭을 찾아보자.",
	"수확은 정상이고 새 문양은 중개상이 쓰는 표식이었다. 신밧드의 이야기를 빌려 항로를 감춘 가상의 해적 선장이 드러났다. 그는 장부를 걸고 카드 대결을 제안한다." }

table.insert(Q, { id = "ch3_3", name = "해적 선장의 카드판", chapter = CH3, guide = GUIDE3, afterPrologue = true, strand = "main", after = "ch3_2",
	summary = "제3장 · 인도양의 검은 향신료 — 캘리컷 해적 선장의 라자라자 지도자 덱에 승리", kind = "duel_leader", amount = 1, portId = "calicut", leaderId = "rajaraja", duelFaction = "southeast_asia", backdrop = "malabar",
	problem = "해적 선장이 구매 선단의 항로를 독점한다.",
	cause = "숨긴 항로를 이용해 농가에는 낮은 가격만 제시했다.",
	result = "카드 대결에서 이겨 항로 기록을 되찾는다.",
	speaker = "미라", speakerRole = "후추 상인", line = "그 선장은 라자라자 지도자 덱을 쓰더군요. 이기고 항로 장부를 받아 와요.",
	rewardCoins = 1500, rewardFame = 28, rewardCareer = "battle", rewardXp = 280 })
HAND["ch3_3"] = { "가상의 해적 선장은 로크 표식이 찍힌 장부를 탁자에 올렸다. 그는 촐라 왕조의 라자라자 지도자 카드를 사용하는 전략가이지 실존 왕 자신이 아니다. 미라는 항로 장부를 걸고 정식 카드 대결을 제안한다. 일지의 대결 버튼에서 승부를 끝내자.",
	"선장은 약속대로 구매선의 항로 장부를 건넸다. 미라와 아룬은 농가와 상선을 함께 살릴 방법을 놓고 의견을 나눈다. 누가 다음 교역을 맡을지 정하자." }

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
HAND["ch3_4"] = { "미라는 농가가 공동으로 계약해야 다음 수확을 지킬 수 있다고 말한다. 아룬은 계절풍을 따라 오는 여러 선단에 기회를 열어야 독점이 되살아나지 않는다고 답한다. 로크의 전설을 이용한 거짓말이 반복되지 않을 거래 방식을 선택하자.",
	"선택이 부두에 전해졌다. 코친에서 새 계약의 첫 후추 선적을 기다린다." }

table.insert(Q, { id = "ch3_5a", name = "농가의 공동 선적", chapter = CH3, guide = GUIDE3, afterPrologue = true, strand = "main", after = "ch3_4",
	summary = "제3장 · 인도양의 검은 향신료 — 공동 계약 후추 12개를 코친에 납품", kind = "deliver", amount = 12, goodId = "pepper", portId = "cochin", needChoice = "ch3_market=coop",
	problem = "농가의 공동 계약 물량이 아직 채워지지 않았다.",
	cause = "거래가 중단된 동안 농가마다 운송 약속이 흩어졌다.",
	result = "공동 선적을 마치고 나가사키 교역 금지령 소식을 듣는다.",
	speaker = "미라", speakerRole = "후추 상인", line = "농가들이 함께 계약했어요. 코친으로 후추를 보내요.",
	rewardCoins = 2400, rewardFame = 50, rewardCareer = "trade", rewardXp = 320 })
HAND["ch3_5a"] = { "미라는 농가별 몫이 기록된 공동 계약서를 준비했다. 후추 열두 짐을 코친에 보내면 계절풍에 맞춰 새 거래를 시작할 수 있다. 농부들이 스스로 다음 수확을 준비하게 하자.",
	"후추 선단의 장부에서 로크 문양은 더 이상 협박의 표식이 아니었다. 미라는 나가사키에서 도착한 편지를 건넸다. 거기에는 안개 속에서 보았다는 이름 없는 배가 그려져 있었다." }

table.insert(Q, { id = "ch3_5b", name = "다시 열린 후추 항로", chapter = CH3, guide = GUIDE3, afterPrologue = true, strand = "main", after = "ch3_4",
	summary = "제3장 · 인도양의 검은 향신료 — 열린 시장 후추 12개를 코친에 납품", kind = "deliver", amount = 12, goodId = "pepper", portId = "cochin", needChoice = "ch3_market=open",
	problem = "새로 참여한 상선들이 첫 계약을 기다리고 있다.",
	cause = "독점 중개상이 숨겨 온 항로 때문에 구매자가 떠났다.",
	result = "다시 열린 후추 항로의 첫 납품을 마치고 나가사키 소식을 듣는다.",
	speaker = "아룬", speakerRole = "항해자", line = "장부를 모두에게 보여 줬소. 코친으로 첫 후추를 보냅시다.",
	rewardCoins = 2400, rewardFame = 50, rewardCareer = "trade", rewardXp = 320 })
HAND["ch3_5b"] = { "아룬은 여러 구매자의 항로 기록을 공유하고 후추 선단을 준비했다. 코친으로 열두 짐을 보내 새 거래의 첫 기록을 남기자. 상인들이 더는 한 중개상의 소문에 의존하지 않게 된다.",
	"코친의 상선들이 계절풍을 타고 떠났다. 아룬은 나가사키의 통역관이 보낸 편지를 건넸다. 편지 속 그림에는 깃발도 이름도 없는 배가 있었다." }
local CH4 = "제4장 · 동아시아의 닫힌 문"
local GUIDE4 = "하루(나가사키 통역관)"

table.insert(Q, { id = "ch4_1", name = "데지마에 멈춘 상자", chapter = CH4, guide = GUIDE4, afterPrologue = true, strand = "main", afterAny = { "ch3_5a", "ch3_5b" },
	summary = "제4장 · 동아시아의 닫힌 문 — 설탕 6개를 나가사키의 허가 창고에 납품", kind = "deliver", amount = 6, goodId = "sugar", portId = "nagasaki",
	problem = "위조 항해 기록으로 허가 화물이 멈추고 유령선 괴담이 퍼진다.",
	cause = "같은 선박이 서로 다른 날짜에 나타났다는 기록 때문에 관리가 출입을 의심한다.",
	result = "허가 창고의 주문을 채우고 서적과 지도 기록을 조사할 허락을 얻는다.",
	speaker = "하루", speakerRole = "통역관", line = "후나유레이 소문도 있지만, 먼저 허가 화물과 실제 장부를 확인해요.",
	rewardCoins = 1500, rewardFame = 28, rewardCareer = "trade", rewardXp = 240 })
HAND["ch4_1"] = { "1641년 네덜란드 상관이 나가사키 데지마로 옮겨진 것은 실제 역사다. 이곳의 가상 사건에서 통역관 하루는 항해 기록이 위조돼 정상 화물의 입항까지 막혔다고 말한다. 어부들 사이에는 난파자의 혼령을 이야기하는 일본 해양 전승 후나유레이 소문이 퍼지고 있다. 허가된 설탕 여섯 짐부터 창고에 납품하자.",
	"설탕이 도착한 뒤 하루는 같은 선박이 서로 다른 날짜에 입항했다는 두 기록을 보여 주었다. 괴담보다 먼저 데지마의 목판 자료와 해도를 확인할 차례다." }

table.insert(Q, { id = "ch4_2", name = "두 문서의 다른 인장", chapter = CH4, guide = GUIDE4, afterPrologue = true, strand = "main", after = "ch4_1",
	summary = "제4장 · 동아시아의 닫힌 문 — 데지마에서 목판 인쇄 자료를 발견해 서적·지도 조사", kind = "discover_card", amount = 1, portId = "nagasaki", exploreSite = "nagasaki_dejima", cardId = "relic_woodblock", loreCardId = "relic_woodblock", loreText = "데지마의 목판 인쇄 자료와 항해 지도를 비교한 가상의 사건. 서적의 기록과 위조된 항해 문서의 출처가 서로 달랐다.",
	problem = "유령선 소문과 서로 다른 입항 기록의 관계를 밝혀야 한다.",
	cause = "위조 문서가 정상 인쇄 자료의 인장을 흉내 내 혼란을 일으켰다.",
	result = "목판 자료와 지도의 차이에서 위조 선단의 흔적을 찾는다.",
	speaker = "하루", speakerRole = "통역관", line = "괴담은 전승이에요. 목판의 인장과 항해 기록을 비교해요.",
	rewardCoins = 1700, rewardFame = 30, rewardCareer = "adventure", rewardXp = 280 })
HAND["ch4_2"] = { "하루는 목판 인쇄 자료와 항해 기록의 인장을 펼친다. 어부가 본 유령선의 소문과 입항 기록이 같은 날짜를 가리키는지 살펴보자. 괴담을 그대로 믿지 않고 원본과 위조본의 차이를 조사한다. 두 기록 사이에서 해협의 무장 선단을 가리키는 단서가 나온다.",
	"유령선 소문을 퍼뜨린 가상의 위조 선단이 드러났다. 항만 관리는 정상 상선을 지키기 위한 해협 작전에 동의한다. 괴담 뒤의 실제 사건을 해결하자." }

table.insert(Q, { id = "ch4_3", name = "해협의 위조 깃발", chapter = CH4, guide = GUIDE4, afterPrologue = true, strand = "main", after = "ch4_2",
	summary = "제4장 · 동아시아의 닫힌 문 — 나가사키에서 이야기 해협 함대전 완수", kind = "war_clear", amount = 1, portId = "nagasaki", warId = "war_ch4", backdrop = "east_china",
	problem = "위조 문서를 이용한 무장 선단이 정상 상선의 출입을 방해한다.",
	cause = "거짓 허가증으로 통행을 가장한 선단이 해협에 남아 있다.",
	result = "해협에서 무장 선단을 몰아내 정상 화물의 통행 조건을 마련한다.",
	speaker = "하루", speakerRole = "통역관", line = "나가사키 전투 본부에서 해협 작전을 맡아 주세요. 정상 상선이 기다려요.",
	rewardCoins = 1900, rewardFame = 36, rewardCareer = "battle", rewardXp = 340 })
HAND["ch4_3"] = { "해협의 무장 선단은 정체를 감추고 정상 상선의 입항을 방해해 왔다. 하루는 실종 소문으로 겁먹은 선원들의 편지를 가져왔다. 전투 본부의 이야기 함대전에서 위조 선단을 물러나게 하자.",
	"정상 선단이 입항할 길을 되찾았다. 하루는 두 언어의 공동 기록을, 관리 겐은 공식 허가를 중심으로 검사를 다시 시작하자고 제안한다. 어느 방식으로 신뢰를 회복할지 정하자." }

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
HAND["ch4_4"] = { "하루는 두 언어의 기록을 대조하면 위조를 발견하기 쉽다고 말한다. 겐은 항만의 공식 허가를 확인해야 상인과 선원 모두가 보호된다고 말한다. 둘 다 데지마의 기존 교역 제한을 존중하면서 정상 화물을 지키려 한다. 마지막 선적의 검사 방식을 선택하자.",
	"두 사람은 결정을 받아들였다. 허가된 화물이 입항하면 소문 대신 실제 기록으로 사건을 마무리할 수 있다." }

table.insert(Q, { id = "ch4_5a", name = "두 언어의 선적 장부", chapter = CH4, guide = GUIDE4, afterPrologue = true, strand = "main", after = "ch4_4",
	summary = "제4장 · 동아시아의 닫힌 문 — 공동 기록에 따라 설탕 10개를 나가사키에 납품", kind = "deliver", amount = 10, goodId = "sugar", portId = "nagasaki", needChoice = "ch4_treaty=records",
	problem = "교역 재개를 증명할 첫 공동 장부가 아직 비어 있다.",
	cause = "정상 상선의 거래 기록이 위조 문서와 함께 막혀 있었다.",
	result = "공동 검수의 첫 선적을 끝내고 네 장의 항해 일지를 완성한다.",
	speaker = "하루", speakerRole = "통역관", line = "설탕을 보내 줘요. 두 언어의 장부에 같은 기록을 남길게요.",
	rewardCoins = 3200, rewardFame = 65, rewardCareer = "trade", rewardXp = 420 })
HAND["ch4_5a"] = { "하루는 두 언어로 된 공동 장부를 준비했다. 허가된 설탕 열 짐의 선적을 기록해 양쪽 상인들이 같은 내용을 확인하도록 하자. 유령선의 이야기는 해양 전승으로 남기되 위조 사건의 기록과 구분한다.",
	"공동 장부가 채워졌다. 하루는 북해의 셀키, 무라노의 비밀, 인도양의 로크, 데지마의 유령선 사건을 묶었다. 사실과 전설, 그리고 네가 내린 선택은 각각 다른 기록으로 항해 일지에 남았다." }

table.insert(Q, { id = "ch4_5b", name = "허가된 구리 선단", chapter = CH4, guide = GUIDE4, afterPrologue = true, strand = "main", after = "ch4_4",
	summary = "제4장 · 동아시아의 닫힌 문 — 공식 허가에 따라 구리 10개를 나가사키에 납품", kind = "deliver", amount = 10, goodId = "copper", portId = "nagasaki", needChoice = "ch4_treaty=permit",
	problem = "허가된 화물도 첫 정상 검사를 통과해야 한다.",
	cause = "위조 사건 뒤 정상적인 거래를 다시 증명해야 한다.",
	result = "공식 검사의 첫 선적을 끝내고 네 장의 항해 일지를 완성한다.",
	speaker = "겐", speakerRole = "항만 관리", line = "허가증을 확인했소. 구리 선단을 정해진 창고로 보내 주시오.",
	rewardCoins = 3200, rewardFame = 65, rewardCareer = "trade", rewardXp = 420 })
HAND["ch4_5b"] = { "겐은 공식 허가 장부를 열고 구리 선단의 기록을 확인한다. 허가된 구리 열 짐의 납품을 마쳐 항만의 정상 거래를 증명하자. 하루는 유령선 소문의 출처와 확인된 사실을 구분해 기록한다.",
	"정상 화물이 기록되고 창고가 열렸다. 하루는 네 바다에서 찾아낸 진실과 전설, 그리고 선장의 결정을 항해 일지에 묶었다. 다음 항해에서도 그 기록이 길잡이가 된다." }

return { Quests = Q, Hand = HAND, Chapters = {
	{ id = "ch1", title = CH1, guide = GUIDE1, first = "ch1_1", last = { "ch1_5a", "ch1_5b" } },
	{ id = "ch2", title = CH2, guide = GUIDE2, first = "ch2_1", last = { "ch2_5a", "ch2_5b" } },
	{ id = "ch3", title = CH3, guide = GUIDE3, first = "ch3_1", last = { "ch3_5a", "ch3_5b" } },
	{ id = "ch4", title = CH4, guide = GUIDE4, first = "ch4_1", last = { "ch4_5a", "ch4_5b" } },
} }

