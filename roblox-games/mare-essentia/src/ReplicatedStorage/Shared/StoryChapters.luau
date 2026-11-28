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
	rewardCoins = 0, rewardFame = 0, rewardXp = 40 })
HAND["ch1_4"] = { "해적 선장 브로디는 고개를 들지 못한다. \"벌은 받겠소. 다만 우리 선원들은 시키는 대로 한 것뿐이오.\" 법대로 넘기면 항구는 안심한다. 받아 주면 바다를 아는 손 하나가 생긴다. 어느 쪽도 틀리지 않았다.",
	"당신의 결정이 부두에 퍼졌다. 어떤 이는 고개를 끄덕였고, 어떤 이는 혀를 찼다. 그러나 모두가 하나는 알았다. 이제 이 바다엔 결정을 내리는 선장이 있다는 것." }

table.insert(Q, { id = "ch1_5a", name = "순찰선이 지키는 길", chapter = CH1, guide = GUIDE1, afterPrologue = true, strand = "main", after = "ch1_4", needChoice = "ch1_captain=law",
	summary = "제1장 · 막힌 항로 — 열린 항로로 양모 10개를 암스테르담에 납품", kind = "deliver", goodId = "wool", portId = "amsterdam", amount = 10,
	problem = "한 달 밀린 주문 때문에 직조소에 양모가 아직 모자란다.",
	cause = "항로가 막혀 있던 동안 주문이 쌓였다.",
	result = "직조소가 밤낮으로 돌고, 암스테르담 양모값이 내려간다. 얀센의 추천으로 암스테르담 길드 허가증을 받는다(특산품·명품 거래).", rewardPermit = "amsterdam",
	speaker = "얀센", speakerRole = "양모 상인", line = "항만청 순찰선이 붙었다네! 이제 마음 놓고 실어 오게.",
	rewardCoins = 1500, rewardFame = 35, rewardCareer = "trade", rewardXp = 220 })
HAND["ch1_5a"] = { "항만청이 현상금과 함께 순찰선 두 척을 북해에 붙였다. 이제 양모선이 줄지어 들어올 수 있다. 밀린 주문을 채우려면 양모 열 짐이 더 필요하다.",
	"직조소 굴뚝에서 다시 연기가 올랐다. 얀센이 길드 추천서에 도장을 찍었다. \"자네가 아니었으면 이 도시의 겨울옷이 없었을 걸세.\" 북해 항로에는 이제 당신 이름이 붙었다." }

table.insert(Q, { id = "ch1_5b", name = "해적이 알려 준 지름길", chapter = CH1, guide = GUIDE1, afterPrologue = true, strand = "main", after = "ch1_4", needChoice = "ch1_captain=crew",
	summary = "제1장 · 막힌 항로 — 브로디의 지름길로 양모 10개를 암스테르담에 납품", kind = "deliver", goodId = "wool", portId = "amsterdam", amount = 10,
	problem = "한 달 밀린 주문 때문에 직조소에 양모가 아직 모자란다.",
	cause = "항로가 막혀 있던 동안 주문이 쌓였다.",
	result = "직조소가 다시 돌고, 브로디의 옛 선원들도 상선 일을 얻는다. 얀센의 추천으로 암스테르담 길드 허가증을 받는다(특산품·명품 거래).", rewardPermit = "amsterdam",
	speaker = "브로디", speakerRole = "전직 해적 선장", line = "모래톱 사이 물길은 우리만 알았소. 이번엔 양모를 싣고 지나가 봅시다.",
	rewardCoins = 1500, rewardFame = 35, rewardCareer = "trade", rewardXp = 220 })
HAND["ch1_5b"] = { "브로디가 해도에 연필로 선을 그었다. 모래톱 사이 좁은 물길, 해적들만 쓰던 지름길이다. 밀린 주문을 채우려면 양모 열 짐이 더 필요하다. 이번엔 그 길이 훔치는 길이 아니라 나르는 길이 된다.",
	"지름길 덕에 양모선이 이틀 일찍 닿았다. 브로디의 옛 선원들이 부두에서 짐을 내리며 처음으로 정당한 품삯을 받았다. 얀센이 길드 추천서에 도장을 찍었다. \"사람을 살린 선택이었네.\"" }

return { Quests = Q, Hand = HAND, Chapters = { { id = "ch1", title = CH1, guide = GUIDE1, first = "ch1_1", last = { "ch1_5a", "ch1_5b" } } } }
