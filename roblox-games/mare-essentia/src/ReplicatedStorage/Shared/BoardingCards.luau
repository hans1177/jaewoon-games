--!nonstrict
-- 접현 카드 전투 규칙 (Roblox API 없음: Luau CLI에서 그대로 시험한다).
-- 두 배가 맞닿으면 갑판 위 부대를 카드로 늘어놓고 겨룬다. 3줄(근접·사격·포) × 3판 2선승.
--   병종 상성: 근접 > 포 (접현하면 포는 쓸모없다) / 포 > 사격 (포탄이 총병 무리를 쓸어낸다) / 사격 > 근접 (다가오는 칼잡이를 쏜다)
--   유리한 상대 줄이 있으면 내 줄 합계 ×1.3, 나를 이기는 상대 줄이 있으면 ×0.85
--   무기 상성(근접끼리): 검 > 도끼 > 창 > 검, 유리하면 +1 / 불리하면 -1
--   능력: 결속(같은 이름끼리 곱) · 사기(같은 줄 +1) · 첩자(적 줄에 놓고 2장 뽑기) · 치료(버린 카드 되살림) · 영웅(날씨·소각·사기 면역)
--   특수: 소각(가장 센 비영웅 제거) · 안개/폭풍/혼전(줄 하나를 1로) · 맑음(날씨 해제)
local B = {}

B.ROWS = { "melee", "ranged" } -- 줄은 전열(근접)과 후열(사격·포) 둘뿐이다. 카드의 병종(row)은 그대로 남는다.
B.ROUND_CARDS = 5 -- 한 판에 낼 수 있는 카드 수 (판을 빠르게)
B.ROUND_DRAW = 3 -- 판이 끝날 때마다 뽑는 카드 수
B.HAND_MAX = 10
-- 카드가 놓이는 줄
local function lane(c: any): string
	return if c.row == "melee" then "melee" else "ranged"
end
B.lane = lane
B.ROW_NAME = { melee = "전열", ranged = "후열", cannon = "후열" }
-- 지역 전술: 같은 문화권 군사학 카드가 한 줄에 모이면 그 지역의 전술이 살아난다 (영웅·'any' 지역 제외)
-- 같은 지역 동료 1장 이상 +1, 3장 이상 +2
B.TACTICS = {
	europe = { name = "방진", text = "유럽 병종이 어깨를 맞대 대열을 이룬다" },
	east_asia = { name = "일제 사격", text = "동아시아 병종이 신호에 맞춰 함께 쏜다" },
	new_world = { name = "기습", text = "신대륙 병종이 숲과 계곡에서 한꺼번에 덮친다" },
	middle_east = { name = "기병 돌격", text = "중동 병종이 속도로 전열을 흔든다" },
	africa = { name = "매복", text = "아프리카 병종이 지형을 이용해 허를 찌른다" },
}
function B.tacticBonus(list: any, idx: number): number
	local c = list[idx]
	if not c or c.hero or not c.region or not B.TACTICS[c.region] then
		return 0
	end
	local mates = 0
	for j, o in list do
		if j ~= idx and not o.hero and o.region == c.region then
			mates += 1
		end
	end
	return if mates >= 3 then 2 elseif mates >= 1 then 1 else 0
end

-- 한 줄에서 발동 중인 전술 이름 (동료가 가장 많은 지역 하나, 없으면 nil)
function B.activeTactic(list: any): string?
	local best, bestN = nil, 0
	for idx in list do
		local c = list[idx]
		if B.tacticBonus(list, idx) > 0 then
			local n = 0
			for _, o in list do
				if not o.hero and o.region == c.region then
					n += 1
				end
			end
			if n > bestN then
				best, bestN = c.region, n
			end
		end
	end
	return if best then B.TACTICS[best].name else nil
end

B.WEAPON_BEATS = { sword = "axe", axe = "spear", spear = "sword" }
B.ADV, B.DIS = 1.3, 0.85
B.HAND = 10
B.MULLIGAN = 3 -- 첫 판에서 카드를 내기 전에 손패를 바꿀 수 있는 장수

-- 병종: row, power, weapon, ability
B.Units = {
	swordsman = { id = "swordsman", name = "검객", row = "melee", power = 4, weapon = "sword" },
	axeman = { id = "axeman", name = "도끼병", row = "melee", power = 5, weapon = "axe" },
	pikeman = { id = "pikeman", name = "창병", row = "melee", power = 3, weapon = "spear", ability = "bond" },
	shieldman = { id = "shieldman", name = "방패병", row = "melee", power = 2, weapon = "sword", ability = "morale" },
	boatswain = { id = "boatswain", name = "갑판장", row = "melee", power = 3, weapon = "sword", ability = "morale" },
	surgeon = { id = "surgeon", name = "선의", row = "melee", power = 1, weapon = "sword", ability = "medic" },
	musketeer = { id = "musketeer", name = "총병", row = "ranged", power = 5, weapon = "gun", ability = "bond" },
	sharpshooter = { id = "sharpshooter", name = "명사수", row = "ranged", power = 6, weapon = "gun" },
	scout = { id = "scout", name = "척후병", row = "ranged", power = 2, weapon = "gun", ability = "spy" },
	gunner = { id = "gunner", name = "포수", row = "cannon", power = 4, weapon = "cannon", ability = "bond" },
	swivel = { id = "swivel", name = "회전포", row = "cannon", power = 3, weapon = "cannon", ability = "bond" },
	culverin = { id = "culverin", name = "장포", row = "cannon", power = 8, weapon = "cannon" },
	-- 영웅 (주인공·동료·이름난 사람들): 날씨·소각·사기의 영향을 받지 않는다
	hero_blade = { id = "hero_blade", name = "백전노장", row = "melee", power = 9, weapon = "sword", hero = true },
	hero_marksman = { id = "hero_marksman", name = "신사수", row = "ranged", power = 9, weapon = "gun", hero = true },
	hero_cannon = { id = "hero_cannon", name = "포술장", row = "cannon", power = 9, weapon = "cannon", hero = true },
	hero_spy = { id = "hero_spy", name = "밀정", row = "ranged", power = 4, weapon = "gun", hero = true, ability = "spy" },
	hero_medic = { id = "hero_medic", name = "명의", row = "melee", power = 3, weapon = "sword", hero = true, ability = "medic" },
	hero_captain = { id = "hero_captain", name = "선장", row = "melee", power = 10, weapon = "sword", hero = true },
	ironclad = { id = "ironclad", name = "철갑병", row = "melee", power = 4, weapon = "spear", ability = "armor" },
	sniper = { id = "sniper", name = "저격수", row = "ranged", power = 4, weapon = "gun", ability = "snipe" },
	beast = { id = "beast", name = "맹수", row = "melee", power = 7, weapon = "axe" },
}
-- 특수 카드
B.Specials = {
	scorch = { id = "scorch", name = "소각", special = "scorch", text = "가장 센 비영웅 카드를 모두 쓰러뜨린다" },
	fog = { id = "fog", name = "안개", special = "weather", row = "ranged", text = "사격 줄이 모두 1로 줄어든다" },
	storm = { id = "storm", name = "폭풍", special = "weather", row = "cannon", text = "포 줄이 모두 1로 줄어든다" },
	melee_fog = { id = "melee_fog", name = "혼전", special = "weather", row = "melee", text = "근접 줄이 모두 1로 줄어든다" },
	clear = { id = "clear", name = "맑음", special = "clear", text = "모든 날씨를 걷어 낸다" },
	wind = { id = "wind", name = "순풍", special = "wind", text = "날씨를 걷어 내고 카드 한 장을 뽑는다" },
	horn = { id = "horn", name = "군기", special = "horn", text = "내 가장 센 줄의 일반 카드 점수가 두 배" },
	decoy = { id = "decoy", name = "회군", special = "decoy", text = "내 필드의 약한 카드를 손으로 되돌린다 (치료병 우선)" },
}
-- 지식 카드 = 전투 카드: 백과사전 797장이 모두 전투 카드로 쓰인다 (능력은 KnowledgeBattle 규칙으로 정해진다)
do
	local KB = require(script.Parent.KnowledgeBattle)
	local texts = {}
	for _, kind in { "scorch", "wind", "clear", "horn", "decoy" } do
		texts[kind] = B.Specials[kind].text
	end
	local units, specials = KB.derive(texts)
	for id, d in units do B.Units[id] = d end
	for id, d in specials do B.Specials[id] = d end
end
-- 지도자 능력 (한 판당 한 번)
B.Leaders = {
	draw = { id = "draw", name = "지휘", text = "카드 한 장을 더 뽑는다", provision = 10 },
	clear = { id = "clear", name = "항로 개척", text = "날씨를 걷어 낸다", provision = 15 },
	snipe = { id = "snipe", name = "저격", text = "적의 가장 센 비영웅 카드 하나를 쓰러뜨린다", provision = 5 },
	-- 유럽 정복자 지도자: 필드 밖에 서서 한 판에 한 번 능력을 쓴다
	napoleon = { fx = "hornRanged", id = "napoleon", name = "나폴레옹", text = "이번 판 후열(사격·포) 점수가 두 배", provision = 10, faction = "europe", era = "정복자" },
	caesar = { fx = "draw2", id = "caesar", name = "카이사르", text = "카드를 두 장 뽑는다", provision = 12, faction = "europe", era = "정복자" },
	alexander = { fx = "bonusMelee", id = "alexander", name = "알렉산드로스", text = "이번 판 전열 일반 카드가 모두 +1", provision = 10, faction = "europe", era = "정복자" },
	charlemagne = { fx = "restore", id = "charlemagne", name = "샤를마뉴", text = "반증으로 끊긴 내 연쇄를 모두 되살린다", provision = 8, faction = "europe", era = "정복자" },
	elizabeth = { fx = "armadaVolley", id = "elizabeth", name = "엘리자베스 1세", text = "함대 연쇄포격: 후열 함선마다 상대 후열 일반 유닛을 한 장씩 −2, 최대 3장. 후열 갈레온이 있으면 상대 전열 한 장도 −1", textEn = "Fleet Volley: For each allied ranged ship, weaken a different enemy ranged non-hero by 2, up to three. A ranged Galleon also strikes one enemy melee non-hero for 1", provision = 15, faction = "europe", era = "해양" },
	-- 동아시아
	genghis = { fx = "bonusMelee", id = "genghis", name = "칭기즈 칸", text = "이번 판 전열 일반 카드가 모두 +1", provision = 10, faction = "east_asia", era = "정복자" },
	qinshi = { fx = "hornMelee", id = "qinshi", name = "진시황", text = "이번 판 전열 점수가 두 배", provision = 10, faction = "east_asia", era = "통일" },
	nobunaga = { fx = "hornRanged", id = "nobunaga", name = "오다 노부나가", text = "이번 판 후열(사격·포) 점수가 두 배", provision = 10, faction = "east_asia", era = "통일" },
	yisunsin = { fx = "snipe", id = "yisunsin", name = "이순신", text = "적의 가장 센 비영웅 카드 하나를 쓰러뜨린다", provision = 5, faction = "east_asia", era = "해양" },
	-- 신대륙
	pachacuti = { fx = "draw2", id = "pachacuti", name = "파차쿠텍", text = "카드를 두 장 뽑는다", provision = 12, faction = "new_world", era = "정복자" },
	montezuma = { fx = "hornMelee", id = "montezuma", name = "몬테수마 2세", text = "이번 판 전열 점수가 두 배", provision = 10, faction = "new_world", era = "제국" },
	sittingbull = { fx = "clearBonusRanged", id = "sittingbull", name = "시팅 불", text = "날씨를 걷고 이번 판 후열 일반 카드가 모두 +1", provision = 15, faction = "new_world", era = "수호" },
	-- 중동
	saladin = { fx = "mercy", id = "saladin", name = "살라딘", text = "자비: 버린 카드 더미에서 기본 전투력이 가장 높은 일반 아군 한 장을 손패로 돌려받는다", textEn = "Mercy: Return the highest-base-power ordinary ally from your discard pile to your hand", provision = 5, faction = "middle_east", era = "수호" },
	suleiman = { fx = "hornRanged", id = "suleiman", name = "술레이만 대제", text = "이번 판 후열(사격·포) 점수가 두 배", provision = 10, faction = "middle_east", era = "제국" },
	cyrus = { fx = "release", id = "cyrus", name = "키루스 대왕", text = "귀환 허용: 봉인 또는 이동 제한에 걸린 가장 약한 일반 아군을 풀어 반대 열로 옮긴다", textEn = "Release: Free your weakest sealed or anchored ordinary ally and move it to the other row", provision = 8, faction = "middle_east", era = "정복자" },
	-- 남·동남아
	rajaraja = { fx = "clearBonusRanged", id = "rajaraja", name = "라자라자 1세", text = "날씨를 걷고 이번 판 후열 일반 카드가 모두 +1", provision = 15, faction = "southeast_asia", era = "해양" },
	tranhungdao = { fx = "snipe", id = "tranhungdao", name = "쩐흥다오", text = "적의 가장 센 비영웅 카드 하나를 쓰러뜨린다", provision = 5, faction = "southeast_asia", era = "수호" },
	akbar = { fx = "hornRanged", id = "akbar", name = "악바르", text = "이번 판 후열(사격·포) 점수가 두 배", provision = 10, faction = "southeast_asia", era = "통일" },
	-- 아프리카
	mansa = { fx = "draw2", id = "mansa", name = "만사 무사", text = "카드를 두 장 뽑는다", provision = 12, faction = "africa", era = "부유" },
	hannibal = { fx = "snipe", id = "hannibal", name = "한니발", text = "적의 가장 센 비영웅 카드 하나를 쓰러뜨린다", provision = 5, faction = "africa", era = "정복자" },
	shaka = { fx = "bonusMelee", id = "shaka", name = "샤카 줄루", text = "이번 판 전열 일반 카드가 모두 +1", provision = 10, faction = "africa", era = "정복자" },
}

-- 보급 비용: 덱의 카드 비용 합이 한도(CardBook.PROVISION_BASE + 지도자 보너스)를 넘지 못한다.
-- 점수가 곧 기본 비용이고 능력·영웅·특수 카드는 값이 붙는다. 4 아래로 내려가지 않는다. 미지의 땅 카드는 변수가 커서 +1.
function B.cost(card: any): number
	if card.special then
		return if card.special == "horn" then 5 elseif card.special == "scorch" then 6 else 4
	end
	local v = (card.power or 0) + (if card.ability then 1 else 0) + (if card.hero then 3 else 0) + (if card.cause then 1 else 0) + (if card.fuse then 2 else 0)
	if type(card.id) == "string" and string.sub(card.id, 1, 3) == "lo_" then
		v += 1
	end
	return math.max(4, v)
end

local function copy(def)
	local c = {}
	for k, v in def do
		c[k] = v
	end
	return c
end

-- 카드 스킬(해전 카드 패의 skill) → 전투 카드
local SKILL_CARD = {
	command = "hero_captain", volley = "hero_cannon", heal = "hero_medic", focus = "hero_spy", rally = "boatswain", analyze = "scout",
	scout = "scout", beast = "beast", ward = "clear", luck = "scorch", insight = "fog",
	banner = "horn", retreat = "decoy", wind = "wind", snipe = "sniper", armor = "ironclad",
}
B.SkillCard = SKILL_CARD
-- 카드 스킬 설명 (개인 카드 창에서 보여 준다)
B.SkillInfo = {
	command = { name = "지휘", text = "카드전에서 영웅 '선장'(10)이 된다" },
	volley = { name = "일제사격", text = "카드전에서 영웅 포(9)가 된다. 지도자 능력: 저격" },
	heal = { name = "응급처치", text = "카드전에서 치료 능력의 영웅이 된다" },
	focus = { name = "기동", text = "카드전에서 첩자 영웅이 된다. 지도자 능력: 항로 개척" },
	rally = { name = "사기 고취", text = "카드전에서 사기 +1을 주는 갑판장이 된다" },
	analyze = { name = "약점 분석", text = "카드전에서 첩자(카드 2장 뽑기)가 된다" },
	scout = { name = "정찰", text = "카드전에서 첩자가 된다" },
	beast = { name = "맹수의 기세", text = "카드전에서 근접 7의 맹수가 된다" },
	ward = { name = "수호", text = "카드전에서 '맑음'(날씨 해제) 특수 카드가 된다" },
	luck = { name = "행운", text = "카드전에서 '소각'(가장 센 비영웅 제거) 특수 카드가 된다" },
	banner = { name = "군기", text = "카드전에서 '군기'(가장 센 줄 점수 두 배) 특수 카드가 된다" },
	retreat = { name = "회군", text = "카드전에서 '회군'(필드 카드를 손으로 되돌림) 특수 카드가 된다" },
	wind = { name = "순풍", text = "카드전에서 '순풍'(날씨 해제 + 카드 한 장 뽑기) 특수 카드가 된다" },
	snipe = { name = "저격", text = "카드전에서 점수 10 이상 줄을 노리는 저격수가 된다" },
	armor = { name = "철갑", text = "카드전에서 날씨에 점수가 줄지 않는 철갑병이 된다" },
	insight = { name = "통찰", text = "카드전에서 '안개'(사격 줄 약화) 특수 카드가 된다" },
}
local SKILL_SPECIAL = { ward = "clear", luck = "scorch", insight = "fog" }

local BASE_ROSTER = { "swordsman", "swordsman", "axeman", "pikeman", "pikeman", "shieldman", "surgeon", "musketeer", "musketeer", "scout", "gunner", "gunner", "swivel", "culverin", "ironclad", "sniper", "horn", "decoy", "sharpshooter", "axeman", "pikeman", "musketeer" }

-- 문화권 덱: 나라마다 부대 구성과 고유 능력(패시브)이 다르다
B.Units.samurai = { id = "samurai", name = "사무라이", row = "melee", power = 6, weapon = "sword" }
B.Units.firelance = { id = "firelance", name = "화창병", row = "ranged", power = 3, weapon = "gun", ability = "bond" }
B.Units.jaguar = { id = "jaguar", name = "재규어 전사", row = "melee", power = 5, weapon = "axe" }
B.Units.janissary = { id = "janissary", name = "예니체리", row = "ranged", power = 4, weapon = "gun", ability = "bond" }
B.Units.camel = { id = "camel", name = "낙타 기병", row = "melee", power = 5, weapon = "spear" }
B.Units.raider = { id = "raider", name = "해상 습격대", row = "melee", power = 4, weapon = "sword", ability = "bond" }
-- [지역 해전 오브젝트] 5개 지역 × 30장. 기존 전투 판정·세이브 ID·기존 카드 유지.
B.Units.eu_01 = { id="eu_01", name="카라벨", category="선박", lore="포르투갈 원양 탐사의 기동성 높은 소형 범선", stage={ art="CardArt/event_title_ship", motion="wind", scene="카라벨", prop={"Naval","ship-small"} }, row="ranged", power=4, weapon="gun", ability="spy", cause="eu_35" }
B.Units.eu_02 = { id="eu_02", name="카라크", category="선박", lore="먼바다 무역과 장거리 항해에 쓰인 대형 범선", stage={ art="CardArt/event_title_ship", motion="fire", scene="카라크" }, row="cannon", power=5, weapon="cannon", ability="bond" }
B.Units.eu_03 = { id="eu_03", name="갈레온", category="선박", lore="함포 배치를 강화한 대서양 대형 군선", stage={ art="CardArt/event_title_ship", motion="fire", scene="갈레온", prop={"Naval","ship-pirate-large"} }, row="cannon", power=6, weapon="cannon", ability="armor", cause="eu_34" }
B.Units.eu_04 = { id="eu_04", name="코그", category="선박", lore="중세 북유럽과 발트해의 상선", stage={ art="CardArt/event_title_ship", motion="board", scene="코그" }, row="melee", power=5, weapon="sword", ability="bond" }
B.Units.eu_05 = { id="eu_05", name="플루이트", category="선박", lore="네덜란드의 화물 적재 중심 범선", stage={ art="CardArt/event_title_ship", motion="wind", scene="플루이트", prop={"Naval","ship-medium"} }, row="ranged", power=4, weapon="gun", ability="spy" }
B.Units.eu_06 = { id="eu_06", name="프리깃", category="선박", lore="정찰과 기동전에 뛰어난 유럽 군함", stage={ art="CardArt/event_title_ship", motion="fire", scene="프리깃", prop={"Naval","ship-large"} }, row="cannon", power=7, weapon="cannon", ability="bond" }
B.Units.eu_07 = { id="eu_07", name="브리간틴", category="선박", lore="유럽의 선박 유산 · 브리간틴", stage={ art="CardArt/event_title_ship", motion="board", scene="브리간틴" }, row="melee", power=5, weapon="sword", ability="morale" }
B.Units.eu_08 = { id="eu_08", name="피나스", category="선박", lore="유럽의 선박 유산 · 피나스", stage={ art="CardArt/event_title_ship", motion="wind", scene="피나스" }, row="ranged", power=4, weapon="gun", ability="spy" }
B.Units.eu_09 = { id="eu_09", name="지중해 갤리선", category="선박", lore="유럽의 선박 유산 · 지중해 갤리선", stage={ art="CardArt/event_title_ship", motion="board", scene="지중해 갤리선" }, row="melee", power=6, weapon="spear" }
B.Units.eu_10 = { id="eu_10", name="전열함", category="선박", lore="측면 함포를 층층이 배치한 대형 군함", stage={ art="CardArt/event_title_ship", motion="fire", scene="전열함" }, row="cannon", power=9, hero=true }
B.Units.eu_11 = { id="eu_11", name="포르투갈 항해용 천문반", category="유물", lore="유럽의 유물 유산 · 포르투갈 항해용 천문반", stage={ art="CardArt/event_chart_west_europe", motion="scout", scene="포르투갈 항해용 천문반" }, row="ranged", power=3, weapon="gun", ability="spy" }
B.Units.eu_12 = { id="eu_12", name="무라노 유리", category="유물", lore="유럽의 유물 유산 · 무라노 유리", stage={ art="Goods/glass", motion="scout", scene="무라노 유리" }, row="melee", power=4, weapon="axe", ability="morale" }
B.Units.eu_13 = { id="eu_13", name="스페인 레알 은화", category="유물", lore="유럽의 유물 유산 · 스페인 레알 은화", stage={ art="Goods/silver", motion="scout", scene="스페인 레알 은화" }, row="ranged", power=4, weapon="gun", ability="morale" }
B.Units.eu_14 = { id="eu_14", name="델프트 청화도기", category="유물", lore="유럽의 유물 유산 · 델프트 청화도기", stage={ art="CardArt/event_chart_west_europe", motion="scout", scene="델프트 청화도기" }, row="melee", power=4, weapon="sword", ability="armor" }
B.Units.eu_15 = { id="eu_15", name="로마 군단 방패", category="유물", lore="유럽의 유물 유산 · 로마 군단 방패", stage={ art="CardArt/event_chart_west_europe", motion="scout", scene="로마 군단 방패", prop={"Relics","shield-rectangle"} }, row="melee", power=5, ability="rome", text="교대로 전열에서 물러났다가 교대로 복귀하면 이 방패 +3. 라운드당 한 번." }
B.Units.eu_16 = { id="eu_16", name="켈트 황금 토크", category="유물", lore="유럽의 유물 유산 · 켈트 황금 토크", stage={ art="Goods/gold", motion="scout", scene="켈트 황금 토크" }, row="ranged", power=3, weapon="gun", ability="spy" }
B.Specials.eu_17 = { id="eu_17", name="영국 해군 신호기", category="유물", lore="유럽의 유물 유산 · 영국 해군 신호기", stage={ art="CardArt/event_chart_west_europe", motion="scout", scene="영국 해군 신호기", prop={"Naval","flag-high"} }, special="horn", text="내 가장 센 줄의 일반 카드 점수가 두 배" }
B.Units.eu_18 = { id="eu_18", name="유럽들소", category="동물", lore="유럽의 동물 유산 · 유럽들소", stage={ art="CardArt/event_chart_west_europe", motion="pounce", scene="유럽들소" }, row="melee", power=7, weapon="sword" }
B.Units.eu_19 = { id="eu_19", name="붉은사슴", category="동물", lore="유럽의 동물 유산 · 붉은사슴", stage={ art="CardArt/event_chart_west_europe", motion="gallop", scene="붉은사슴" }, row="melee", power=5, weapon="axe", ability="morale" }
B.Units.eu_20 = { id="eu_20", name="검독수리", category="동물", lore="유럽의 동물 유산 · 검독수리", stage={ art="CardArt/event_chart_west_europe", motion="pounce", scene="검독수리" }, row="ranged", power=4, weapon="gun", ability="spy" }
B.Units.eu_21 = { id="eu_21", name="유럽불곰", category="동물", lore="유럽의 동물 유산 · 유럽불곰", stage={ art="CardArt/event_chart_west_europe", motion="gallop", scene="유럽불곰" }, row="melee", power=6, weapon="sword" }
B.Units.eu_22 = { id="eu_22", name="유라시아스라소니", category="동물", lore="유럽의 동물 유산 · 유라시아스라소니", stage={ art="CardArt/event_chart_west_europe", motion="pounce", scene="유라시아스라소니" }, row="melee", power=5, weapon="axe", ability="armor" }
B.Units.eu_23 = { id="eu_23", name="유럽늑대", category="동물", lore="유럽의 동물 유산 · 유럽늑대", stage={ art="CardArt/event_chart_west_europe", motion="gallop", scene="유럽늑대" }, row="ranged", power=4, weapon="gun", ability="bond" }
B.Units.eu_24 = { id="eu_24", name="스톤헨지", category="지형·원더", lore="영국 솔즈베리 평원의 선사시대 거석 유적", stage={ art="CardArt/event_stonehenge", motion="clear", scene="스톤헨지" }, row="melee", power=9, hero=true }
B.Units.eu_25 = { id="eu_25", name="콜로세움", category="지형·원더", lore="유럽의 지형·원더 유산 · 콜로세움", stage={ art="CardArt/event_chart_west_europe", motion="clear", scene="콜로세움" }, row="melee", power=5, weapon="axe", ability="armor" }
B.Units.eu_26 = { id="eu_26", name="알프스", category="지형·원더", lore="유럽의 지형·원더 유산 · 알프스", stage={ art="CardArt/event_chart_west_europe", motion="clear", scene="알프스" }, row="cannon", power=5, weapon="cannon", ability="morale" }
B.Specials.eu_27 = { id="eu_27", name="지브롤터 해협", category="지형·원더", lore="대서양과 지중해를 연결하는 핵심 해상 통로", stage={ art="CardArt/event_chart_mediterranean", motion="wind", scene="지브롤터 해협" }, special="wind", text="날씨를 걷어 내고 카드를 한 장 뽑는다" }
B.Units.eu_28 = { id="eu_28", name="베네치아 운하", category="지형·원더", lore="유럽의 지형·원더 유산 · 베네치아 운하", stage={ art="CardArt/event_canal_opened", motion="clear", scene="베네치아 운하" }, row="ranged", power=4, weapon="gun", ability="canal", text="아군이 전열에서 후열로 이동하면 그 유닛 +2. 라운드당 한 번." }
B.Units.eu_29 = { id="eu_29", name="노르웨이 피오르", category="지형·원더", lore="유럽의 지형·원더 유산 · 노르웨이 피오르", stage={ art="CardArt/event_chart_west_europe", motion="clear", scene="노르웨이 피오르" }, row="melee", power=5, weapon="spear" }
B.Specials.eu_30 = { id="eu_30", name="북해 안개", category="지형·원더", lore="북해 항로의 시야를 가리는 안개", stage={ art="CardArt/event_calm_seas", motion="storm", scene="북해 안개" }, special="weather", text="해당 전투 줄의 일반 카드 전투력을 1로 낮춘다", row="ranged" }
B.Units.eu_31 = { id="eu_31", name="백년전쟁", category="사건", lore="잉글랜드와 프랑스가 1세기 가까이 싸운 전쟁", stage={ art="CardArt/event_chart_west_europe", motion="board", scene="백년전쟁" }, row="melee", power=4, weapon="axe" }
B.Units.eu_32 = { id="eu_32", name="대항해 시대", category="사건", lore="유럽이 바다 너머로 뻗어 나간 탐험의 시대", stage={ art="CardArt/event_chart_west_europe", motion="wind", scene="대항해 시대" }, row="ranged", power=3, weapon="gun", cause="eu_35" }
B.Units.eu_33 = { id="eu_33", name="산업혁명", category="사건", lore="증기와 기계가 세상을 바꾼 대변화", stage={ art="CardArt/event_industrial_start", motion="fire", scene="산업혁명" }, row="cannon", power=4, weapon="cannon" }
B.Units.eu_34 = { id="eu_34", name="화약", category="기술", lore="중국에서 건너와 전쟁을 바꾼 폭발 가루", stage={ art="CardArt/event_chart_west_europe", motion="fire", scene="화약", prop={"Naval","cannon"} }, row="cannon", power=3, weapon="cannon" }
B.Units.eu_35 = { id="eu_35", name="나침반", category="기술", lore="먼바다에서 방향을 잡게 해 준 도구", stage={ art="CardArt/event_chart_west_europe", motion="scout", scene="나침반", prop={"Relics","compass-base"} }, row="ranged", power=3, weapon="gun" }
B.Units.eu_36 = { id="eu_36", name="잔 다르크", category="인물", lore="백년전쟁에서 프랑스를 이끈 소녀 지도자", stage={ art="CardArt/event_chart_west_europe", motion="board", scene="잔 다르크" }, row="melee", power=5, weapon="sword", ability="orleans", text="낼 때: 같은 열에서 전투력 감소가 가장 큰 아군을 회복하고, 가장 강한 상대 전열 일반 유닛 −2. 백년전쟁이 같은 열에 있으면 −3. 발동 후 소멸." }
B.Units.eu_37 = { id="eu_37", name="콜럼버스", category="인물", lore="대서양을 건너 신대륙에 닿은 항해가", stage={ art="CardArt/event_chart_west_europe", motion="wind", scene="콜럼버스" }, row="ranged", power=5, weapon="gun", cause="eu_32" }
B.Units.eu_38 = { id="eu_38", name="웰링턴 공작", category="인물", lore="워털루에서 나폴레옹을 꺾은 영국 장군", stage={ art="CardArt/event_chart_west_europe", motion="fire", scene="웰링턴 공작" }, row="cannon", power=6, weapon="cannon", cause="eu_34" }
B.Units.eu_39 = { id="eu_39", name="넬슨 제독", category="인물", lore="갈레온을 이은 함대로 트라팔가르를 이긴 제독", stage={ art="CardArt/event_chart_west_europe", motion="fire", scene="넬슨 제독" }, row="cannon", power=6, weapon="cannon", cause="eu_03" }
B.Units.eu_40 = { id="eu_40", name="창병 방진", category="병종", lore="창을 촘촘히 세워 기병을 막은 보병 진형", stage={ art="CardArt/event_chart_west_europe", motion="board", scene="창병 방진" }, row="melee", power=4, weapon="spear", ability="relay", text="전술 교대: 전열·후열의 첫 일반 유닛을 교대한다. 전열 도착 +2, 후열 도착 +1. 전열에 도착한 유닛에 엄호: 다음 전투력 감소를 2까지 막는다." }
B.Specials.eu_41 = { id="eu_41", name="휴전 협정", category="사건", lore="전쟁을 멈추게 한 협정", stage={ art="CardArt/event_chart_west_europe", motion="storm", scene="휴전 협정" }, special="truce", text="가장 약한 아군 일반 유닛을 엄호한다. 다음 전투력 감소를 2까지 막는다." }
B.Specials.eu_42 = { id="eu_42", name="암살", category="인물", lore="핵심 인물을 노린 은밀한 공격", stage={ art="CardArt/event_chart_west_europe", motion="storm", scene="암살" }, special="assassinate", text="상대 전열에서 가장 강한 일반 유닛의 전투력 −2." }
B.Specials.eu_43 = { id="eu_43", name="봉쇄", category="기술", lore="기술과 물자가 들어오는 길을 막는 작전", stage={ art="CardArt/event_chart_west_europe", motion="storm", scene="봉쇄" }, special="refute", refuteKind="기술", text="상대 카드 중 기술에서 이어진 연쇄 보너스를 끊는다" }
B.Units.eu_44 = { id="eu_44", name="머스킷 부대", category="병종", lore="화약 무기로 무장한 보병 부대", stage={ art="CardArt/event_chart_west_europe", motion="fire", scene="머스킷 부대" }, row="ranged", power=3, weapon="gun", fuse={"eu_34","eu_40"}, ability="lastOrder", text="최후 명령: 직접 패스하면 가장 약한 아군 일반 유닛 +3." }
B.Units.eu_45 = { id="eu_45", name="철갑 함대", category="선박", lore="산업혁명이 낳은 강철 군함 함대", stage={ art="CardArt/event_chart_west_europe", motion="fire", scene="철갑 함대" }, row="cannon", power=3, weapon="cannon", fuse={"eu_33","eu_06"}, ability="counter", text="역습: 상대 행동으로 한 열의 점수가 내려가면 다른 열의 가장 약한 아군 일반 유닛 +2. 라운드당 한 번. 철갑: 라운드마다 처음 받는 전투력 감소를 2까지 막는다." }
B.Units.ea_01 = { id="ea_01", name="판옥선", category="선박", lore="넓은 갑판과 함포를 갖춘 조선 수군 전투선", stage={ art="CardArt/event_chart_east_asia", motion="fire", scene="판옥선" }, row="cannon", power=4, weapon="cannon", ability="spy" }
B.Units.ea_02 = { id="ea_02", name="거북선", category="선박", lore="덮개형 상갑판이 특징인 조선 전투선", stage={ art="CardArt/event_chart_east_asia", motion="fire", scene="거북선" }, row="cannon", power=5, weapon="cannon", ability="bond", cause="ea_01" }
B.Units.ea_03 = { id="ea_03", name="조선 세견선", category="선박", lore="동아시아의 선박 유산 · 조선 세견선", stage={ art="CardArt/event_chart_east_asia", motion="wind", scene="조선 세견선" }, row="ranged", power=6, weapon="gun", ability="armor" }
B.Units.ea_04 = { id="ea_04", name="명나라 복선", category="선박", lore="동아시아의 선박 유산 · 명나라 복선", stage={ art="CardArt/event_chart_east_asia", motion="fire", scene="명나라 복선" }, row="cannon", power=5, weapon="cannon", ability="bond" }
B.Units.ea_05 = { id="ea_05", name="명나라 사선", category="선박", lore="동아시아의 선박 유산 · 명나라 사선", stage={ art="CardArt/event_chart_east_asia", motion="wind", scene="명나라 사선" }, row="ranged", power=4, weapon="gun", ability="spy" }
B.Units.ea_06 = { id="ea_06", name="중국 정크선", category="선박", lore="동아시아의 전통적인 돛살 범선", stage={ art="CardArt/event_chart_east_asia", motion="wind", scene="중국 정크선" }, row="ranged", power=7, weapon="gun", ability="bond" }
B.Units.ea_07 = { id="ea_07", name="명나라 보선", category="선박", lore="명대 대규모 원양항해에 쓰인 선박", stage={ art="CardArt/event_chart_east_asia", motion="wind", scene="명나라 보선" }, row="ranged", power=5, weapon="gun", ability="morale", cause="ea_33" }
B.Units.ea_08 = { id="ea_08", name="아타케부네", category="선박", lore="일본 전국시대의 대형 전투선", stage={ art="CardArt/event_chart_east_asia", motion="board", scene="아타케부네" }, row="melee", power=4, weapon="axe", ability="spy" }
B.Units.ea_09 = { id="ea_09", name="세키부네", category="선박", lore="일본 전국시대의 중형 전투선", stage={ art="CardArt/event_chart_east_asia", motion="board", scene="세키부네" }, row="melee", power=6, weapon="spear" }
B.Units.ea_10 = { id="ea_10", name="고바야", category="선박", lore="일본의 빠른 소형 전투선", stage={ art="CardArt/event_chart_east_asia", motion="wind", scene="고바야" }, row="ranged", power=9, hero=true }
B.Units.ea_11 = { id="ea_11", name="고려 청자", category="유물", lore="동아시아의 유물 유산 · 고려 청자", stage={ art="CardArt/event_chart_east_asia", motion="scout", scene="고려 청자" }, row="ranged", power=3, weapon="gun", ability="spy" }
B.Units.ea_12 = { id="ea_12", name="조선 백자 달항아리", category="유물", lore="동아시아의 유물 유산 · 조선 백자 달항아리", stage={ art="Goods/porcelain", motion="scout", scene="조선 백자 달항아리" }, row="melee", power=4, weapon="axe", ability="morale" }
B.Units.ea_13 = { id="ea_13", name="명대 청화백자", category="유물", lore="동아시아의 유물 유산 · 명대 청화백자", stage={ art="Goods/porcelain", motion="scout", scene="명대 청화백자" }, row="ranged", power=4, weapon="gun", ability="morale" }
B.Units.ea_14 = { id="ea_14", name="일본 칠기함", category="유물", lore="동아시아의 유물 유산 · 일본 칠기함", stage={ art="Goods/lacquer", motion="scout", scene="일본 칠기함" }, row="melee", power=4, weapon="sword", ability="armor" }
B.Units.ea_15 = { id="ea_15", name="중국 옥벽", category="유물", lore="동아시아의 유물 유산 · 중국 옥벽", stage={ art="Goods/jade", motion="scout", scene="중국 옥벽" }, row="cannon", power=5, weapon="cannon", ability="bond" }
B.Units.ea_16 = { id="ea_16", name="류큐 칠기", category="유물", lore="동아시아의 유물 유산 · 류큐 칠기", stage={ art="Goods/lacquer", motion="scout", scene="류큐 칠기" }, row="ranged", power=3, weapon="gun", ability="spy" }
B.Specials.ea_17 = { id="ea_17", name="조선 함대 군기", category="유물", lore="동아시아의 유물 유산 · 조선 함대 군기", stage={ art="CardArt/event_chart_east_asia", motion="scout", scene="조선 함대 군기", prop={"Naval","flag-high"} }, special="horn", text="내 가장 센 줄의 일반 카드 점수가 두 배" }
B.Units.ea_18 = { id="ea_18", name="시베리아호랑이", category="동물", lore="동아시아의 동물 유산 · 시베리아호랑이", stage={ art="CardArt/event_chart_east_asia", motion="pounce", scene="시베리아호랑이" }, row="melee", power=7, weapon="sword" }
B.Units.ea_19 = { id="ea_19", name="대왕판다", category="동물", lore="동아시아의 동물 유산 · 대왕판다", stage={ art="CardArt/event_chart_east_asia", motion="gallop", scene="대왕판다" }, row="melee", power=5, weapon="axe", ability="morale" }
B.Units.ea_20 = { id="ea_20", name="두루미", category="동물", lore="동아시아의 동물 유산 · 두루미", stage={ art="CardArt/event_chart_east_asia", motion="pounce", scene="두루미" }, row="ranged", power=4, weapon="gun", ability="spy" }
B.Units.ea_21 = { id="ea_21", name="일본원숭이", category="동물", lore="동아시아의 동물 유산 · 일본원숭이", stage={ art="CardArt/event_chart_east_asia", motion="gallop", scene="일본원숭이" }, row="melee", power=6, weapon="sword" }
B.Units.ea_22 = { id="ea_22", name="사향노루", category="동물", lore="동아시아의 동물 유산 · 사향노루", stage={ art="CardArt/event_chart_east_asia", motion="pounce", scene="사향노루" }, row="melee", power=5, weapon="axe", ability="armor" }
B.Units.ea_23 = { id="ea_23", name="황금들창코원숭이", category="동물", lore="동아시아의 동물 유산 · 황금들창코원숭이", stage={ art="CardArt/event_chart_east_asia", motion="gallop", scene="황금들창코원숭이" }, row="ranged", power=4, weapon="gun", ability="bond" }
B.Units.ea_24 = { id="ea_24", name="만리장성", category="지형·원더", lore="중국 북부에 이어진 거대한 성벽 유산", stage={ art="CardArt/event_great_wall", motion="clear", scene="만리장성" }, row="melee", power=9, hero=true }
B.Units.ea_25 = { id="ea_25", name="경복궁", category="지형·원더", lore="동아시아의 지형·원더 유산 · 경복궁", stage={ art="CardArt/event_chart_east_asia", motion="clear", scene="경복궁" }, row="melee", power=5, weapon="axe", ability="armor" }
B.Units.ea_26 = { id="ea_26", name="히메지성", category="지형·원더", lore="동아시아의 지형·원더 유산 · 히메지성", stage={ art="CardArt/event_chart_east_asia", motion="clear", scene="히메지성" }, row="cannon", power=5, weapon="cannon", ability="morale" }
B.Specials.ea_27 = { id="ea_27", name="황산", category="지형·원더", lore="동아시아의 지형·원더 유산 · 황산", stage={ art="CardArt/event_chart_east_asia", motion="clear", scene="황산" }, special="clear", text="모든 날씨를 걷어 낸다" }
B.Units.ea_28 = { id="ea_28", name="후지산", category="지형·원더", lore="동아시아의 지형·원더 유산 · 후지산", stage={ art="CardArt/event_chart_east_asia", motion="clear", scene="후지산" }, row="ranged", power=4, weapon="gun" }
B.Units.ea_29 = { id="ea_29", name="태산", category="지형·원더", lore="동아시아의 지형·원더 유산 · 태산", stage={ art="CardArt/event_chart_east_asia", motion="clear", scene="태산" }, row="melee", power=5, weapon="spear" }
B.Specials.ea_30 = { id="ea_30", name="동중국해 계절풍", category="지형·원더", lore="계절에 따라 항로의 방향과 속도를 바꾸는 바람", stage={ art="CardArt/event_chart_east_asia", motion="wind", scene="동중국해 계절풍" }, special="wind", text="날씨를 걷어 내고 카드를 한 장 뽑는다" }
B.Specials.ea_31 = { id="ea_31", name="해상 봉쇄령", category="선박", lore="조정이 바닷길을 닫아 배의 이동을 막은 명령", stage={ art="CardArt/event_chart_world", motion="storm", scene="해상 봉쇄령" }, special="refute", refuteKind="선박", text="상대 카드 중 선박에서 이어진 연쇄 보너스를 끊는다" }
B.Units.ea_32 = { id="ea_32", name="정화의 원정", category="사건", lore="명나라 함대가 인도양까지 일곱 번 항해한 대원정", stage={ art="CardArt/event_chart_east_asia", motion="wind", scene="정화의 원정" }, row="ranged", power=3, weapon="gun" }
B.Units.ea_33 = { id="ea_33", name="정화", category="인물", lore="대원정을 이끈 명나라의 환관 제독", stage={ art="CardArt/event_chart_east_asia", motion="board", scene="정화" }, row="melee", power=5, weapon="sword", cause="ea_32" }
B.Units.ea_34 = { id="ea_34", name="화약 무기", category="기술", lore="중국에서 시작돼 동아시아 전쟁을 바꾼 화약 무기", stage={ art="CardArt/event_chart_east_asia", motion="fire", scene="화약 무기" }, row="cannon", power=4, weapon="cannon" }
B.Units.me_01 = { id="me_01", name="아라비아 다우선", category="선박", lore="아라비아해의 전통적인 삼각돛 목선", stage={ art="CardArt/event_chart_mediterranean", motion="wind", scene="아라비아 다우선" }, row="ranged", power=4, weapon="gun", ability="spy" }
B.Units.me_02 = { id="me_02", name="바갈라", category="선박", lore="페르시아만과 인도양을 누비던 대형 교역선", stage={ art="CardArt/event_chart_mediterranean", motion="wind", scene="바갈라" }, row="ranged", power=5, weapon="gun", ability="bond" }
B.Units.me_03 = { id="me_03", name="붐선", category="선박", lore="페르시아만의 장거리 화물 범선", stage={ art="CardArt/event_chart_mediterranean", motion="wind", scene="붐선" }, row="ranged", power=6, weapon="gun", ability="armor" }
B.Units.me_04 = { id="me_04", name="삼부크", category="선박", lore="홍해·아라비아해 연안의 교역선", stage={ art="CardArt/event_chart_mediterranean", motion="wind", scene="삼부크" }, row="ranged", power=5, weapon="gun", ability="bond" }
B.Units.me_05 = { id="me_05", name="잘붓", category="선박", lore="중동의 선박 유산 · 잘붓", stage={ art="CardArt/event_chart_mediterranean", motion="wind", scene="잘붓" }, row="ranged", power=4, weapon="gun", ability="spy", cause="me_04" }
B.Units.me_06 = { id="me_06", name="간자", category="선박", lore="중동의 선박 유산 · 간자", stage={ art="CardArt/event_chart_mediterranean", motion="wind", scene="간자" }, row="ranged", power=7, weapon="gun", ability="bond" }
B.Units.me_07 = { id="me_07", name="오스만 갤리선", category="선박", lore="노와 돛을 병용한 오스만 해군 전투선", stage={ art="CardArt/event_chart_mediterranean", motion="fire", scene="오스만 갤리선" }, row="cannon", power=5, weapon="cannon", ability="morale" }
B.Units.me_08 = { id="me_08", name="세벡선", category="선박", lore="지중해에서 활약한 날렵한 삼각돛 선박", stage={ art="CardArt/event_chart_mediterranean", motion="fire", scene="세벡선" }, row="cannon", power=4, weapon="cannon", ability="spy" }
B.Units.me_09 = { id="me_09", name="자루크", category="선박", lore="중동의 선박 유산 · 자루크", stage={ art="CardArt/event_chart_mediterranean", motion="board", scene="자루크" }, row="melee", power=6, weapon="spear" }
B.Units.me_10 = { id="me_10", name="바텔라", category="선박", lore="중동의 선박 유산 · 바텔라", stage={ art="CardArt/event_chart_mediterranean", motion="wind", scene="바텔라" }, row="ranged", power=9, hero=true }
B.Units.me_11 = { id="me_11", name="페르시아 황동 천문반", category="유물", lore="중동의 유물 유산 · 페르시아 황동 천문반", stage={ art="CardArt/event_chart_mediterranean", motion="scout", scene="페르시아 황동 천문반" }, row="ranged", power=3, weapon="gun", ability="spy" }
B.Units.me_12 = { id="me_12", name="이즈니크 타일", category="유물", lore="중동의 유물 유산 · 이즈니크 타일", stage={ art="CardArt/event_chart_mediterranean", motion="scout", scene="이즈니크 타일" }, row="melee", power=4, weapon="axe", ability="morale" }
B.Units.me_13 = { id="me_13", name="다마스쿠스 강철검", category="유물", lore="중동의 유물 유산 · 다마스쿠스 강철검", stage={ art="CardArt/event_chart_mediterranean", motion="scout", scene="다마스쿠스 강철검" }, row="ranged", power=4, weapon="gun", ability="morale" }
B.Units.me_14 = { id="me_14", name="페르시아 양탄자", category="유물", lore="중동의 유물 유산 · 페르시아 양탄자", stage={ art="Goods/carpet", motion="scout", scene="페르시아 양탄자" }, row="melee", power=4, weapon="sword", ability="armor" }
B.Units.me_15 = { id="me_15", name="오스만 도자기 향로", category="유물", lore="중동의 유물 유산 · 오스만 도자기 향로", stage={ art="CardArt/event_chart_mediterranean", motion="scout", scene="오스만 도자기 향로" }, row="cannon", power=5, weapon="cannon", ability="bond" }
B.Units.me_16 = { id="me_16", name="사산 왕조 은접시", category="유물", lore="중동의 유물 유산 · 사산 왕조 은접시", stage={ art="Goods/silver", motion="scout", scene="사산 왕조 은접시" }, row="ranged", power=3, weapon="gun", ability="spy" }
B.Specials.me_17 = { id="me_17", name="오스만 함대 군기", category="유물", lore="중동의 유물 유산 · 오스만 함대 군기", stage={ art="CardArt/event_chart_mediterranean", motion="scout", scene="오스만 함대 군기", prop={"Naval","flag-high"} }, special="horn", text="내 가장 센 줄의 일반 카드 점수가 두 배" }
B.Units.me_18 = { id="me_18", name="단봉낙타", category="동물", lore="중동의 동물 유산 · 단봉낙타", stage={ art="CardArt/event_chart_mediterranean", motion="pounce", scene="단봉낙타" }, row="melee", power=7, weapon="sword" }
B.Units.me_19 = { id="me_19", name="아라비아오릭스", category="동물", lore="중동의 동물 유산 · 아라비아오릭스", stage={ art="CardArt/event_chart_mediterranean", motion="gallop", scene="아라비아오릭스" }, row="melee", power=5, weapon="axe", ability="morale" }
B.Units.me_20 = { id="me_20", name="아라비아 모래고양이", category="동물", lore="중동의 동물 유산 · 아라비아 모래고양이", stage={ art="CardArt/event_chart_mediterranean", motion="pounce", scene="아라비아 모래고양이" }, row="ranged", power=4, weapon="gun", ability="spy" }
B.Units.me_21 = { id="me_21", name="페르시아표범", category="동물", lore="중동의 동물 유산 · 페르시아표범", stage={ art="CardArt/event_chart_mediterranean", motion="gallop", scene="페르시아표범" }, row="melee", power=6, weapon="sword" }
B.Units.me_22 = { id="me_22", name="아라비아늑대", category="동물", lore="중동의 동물 유산 · 아라비아늑대", stage={ art="CardArt/event_chart_mediterranean", motion="pounce", scene="아라비아늑대" }, row="melee", power=5, weapon="axe", ability="armor" }
B.Units.me_23 = { id="me_23", name="아라비아타르", category="동물", lore="중동의 동물 유산 · 아라비아타르", stage={ art="CardArt/event_chart_mediterranean", motion="gallop", scene="아라비아타르" }, row="ranged", power=4, weapon="gun", ability="bond" }
B.Units.me_24 = { id="me_24", name="페트라", category="지형·원더", lore="사암 절벽을 깎아 만든 요르단 고대 도시", stage={ art="CardArt/event_petra", motion="clear", scene="페트라" }, row="melee", power=9, hero=true }
B.Units.me_25 = { id="me_25", name="페르세폴리스", category="지형·원더", lore="중동의 지형·원더 유산 · 페르세폴리스", stage={ art="CardArt/event_chart_mediterranean", motion="clear", scene="페르세폴리스" }, row="melee", power=5, weapon="axe", ability="armor" }
B.Units.me_26 = { id="me_26", name="카파도키아", category="지형·원더", lore="중동의 지형·원더 유산 · 카파도키아", stage={ art="CardArt/event_chart_mediterranean", motion="clear", scene="카파도키아" }, row="cannon", power=5, weapon="cannon", ability="morale" }
B.Specials.me_27 = { id="me_27", name="호르무즈 해협", category="지형·원더", lore="중동의 지형·원더 유산 · 호르무즈 해협", stage={ art="CardArt/event_chart_mediterranean", motion="wind", scene="호르무즈 해협" }, special="wind", text="날씨를 걷어 내고 카드를 한 장 뽑는다" }
B.Specials.me_28 = { id="me_28", name="루브알할리 사막", category="지형·원더", lore="아라비아반도 남부의 광대한 모래사막", stage={ art="CardArt/event_drought", motion="storm", scene="루브알할리 사막" }, special="weather", text="해당 전투 줄의 일반 카드 전투력을 1로 낮춘다", row="melee" }
B.Units.me_29 = { id="me_29", name="바빌론 유적", category="지형·원더", lore="중동의 지형·원더 유산 · 바빌론 유적", stage={ art="CardArt/event_chart_mediterranean", motion="clear", scene="바빌론 유적" }, row="melee", power=5, weapon="spear" }
B.Specials.me_30 = { id="me_30", name="샤말 바람", category="지형·원더", lore="페르시아만에 부는 강한 북서풍", stage={ art="CardArt/event_storm", motion="wind", scene="샤말 바람" }, special="wind", text="날씨를 걷어 내고 카드를 한 장 뽑는다" }
B.Specials.me_31 = { id="me_31", name="사막 약탈", category="유물", lore="대상을 덮쳐 귀한 물건을 빼앗는 약탈", stage={ art="CardArt/event_chart_world", motion="storm", scene="사막 약탈" }, special="refute", refuteKind="유물", text="상대 카드 중 유물에서 이어진 연쇄 보너스를 끊는다" }
B.Units.me_32 = { id="me_32", name="콘스탄티노폴리스 함락", category="사건", lore="오스만이 거대한 성벽 도시를 무너뜨린 1453년의 포위전", stage={ art="CardArt/event_chart_mediterranean", motion="fire", scene="콘스탄티노폴리스 함락" }, row="cannon", power=4, weapon="cannon", cause="me_34" }
B.Units.me_33 = { id="me_33", name="메흐메트 2세", category="인물", lore="콘스탄티노폴리스를 함락한 오스만의 젊은 술탄", stage={ art="CardArt/event_chart_mediterranean", motion="board", scene="메흐메트 2세" }, row="melee", power=6, weapon="sword", cause="me_32" }
B.Units.me_34 = { id="me_34", name="거대 대포", category="기술", lore="성벽을 부수려고 만든 거대한 청동 대포", stage={ art="CardArt/event_chart_mediterranean", motion="fire", scene="거대 대포", prop={"Naval","cannon"} }, row="cannon", power=4, weapon="cannon" }
B.Units.nw_01 = { id="nw_01", name="카리브 전투 카누", category="선박", lore="카리브해의 해상 기동용 노젓는 카누", stage={ art="CardArt/event_chart_south_america", motion="board", scene="카리브 전투 카누", prop={"Terrain","canoe"} }, row="melee", power=4, weapon="sword", ability="spy" }
B.Units.nw_02 = { id="nw_02", name="카리브 대형 카누", category="선박", lore="신대륙의 선박 유산 · 카리브 대형 카누", stage={ art="CardArt/event_chart_south_america", motion="wind", scene="카리브 대형 카누", prop={"Terrain","canoe"} }, row="ranged", power=5, weapon="gun", ability="spy", cause="nw_01" }
B.Units.nw_03 = { id="nw_03", name="마야 교역 카누", category="선박", lore="중앙아메리카 연안과 하천을 오가던 교역 카누", stage={ art="CardArt/event_chart_south_america", motion="wind", scene="마야 교역 카누", prop={"Terrain","canoe"} }, row="ranged", power=6, weapon="gun", ability="bond" }
B.Units.nw_04 = { id="nw_04", name="아즈텍 전투 카누", category="선박", lore="멕시코 고원 호수에서 사용한 전투용 카누", stage={ art="CardArt/event_chart_south_america", motion="board", scene="아즈텍 전투 카누", prop={"Terrain","canoe"} }, row="melee", power=5, weapon="sword", ability="morale" }
B.Units.nw_05 = { id="nw_05", name="잉카 발사 뗏목", category="선박", lore="발사나무로 만든 안데스 해안의 교역 뗏목", stage={ art="CardArt/event_chart_south_america", motion="wind", scene="잉카 발사 뗏목" }, row="ranged", power=4, weapon="gun" }
B.Units.nw_06 = { id="nw_06", name="티티카카 갈대배", category="선박", lore="안데스 고원 호수의 갈대 선박", stage={ art="CardArt/event_chart_south_america", motion="board", scene="티티카카 갈대배" }, row="melee", power=7, weapon="spear" }
B.Units.nw_07 = { id="nw_07", name="아마존 통나무배", category="선박", lore="신대륙의 선박 유산 · 아마존 통나무배", stage={ art="CardArt/event_chart_south_america", motion="wind", scene="아마존 통나무배", prop={"Terrain","canoe"} }, row="ranged", power=5, weapon="gun" }
B.Units.nw_08 = { id="nw_08", name="마푸체 카누", category="선박", lore="신대륙의 선박 유산 · 마푸체 카누", stage={ art="CardArt/event_chart_south_america", motion="board", scene="마푸체 카누", prop={"Terrain","canoe"} }, row="melee", power=4, weapon="axe" }
B.Units.nw_09 = { id="nw_09", name="이누이트 카약", category="선박", lore="북극권에서 사냥과 이동에 쓰인 소형 배", stage={ art="CardArt/event_chart_south_america", motion="wind", scene="이누이트 카약" }, row="ranged", power=6, weapon="gun", ability="spy" }
B.Units.nw_10 = { id="nw_10", name="북서해안 삼나무 카누", category="선박", lore="신대륙의 선박 유산 · 북서해안 삼나무 카누", stage={ art="CardArt/event_chart_south_america", motion="board", scene="북서해안 삼나무 카누", prop={"Terrain","canoe"} }, row="melee", power=9, hero=true }
B.Units.nw_11 = { id="nw_11", name="아즈텍 태양석", category="유물", lore="신대륙의 유물 유산 · 아즈텍 태양석", stage={ art="CardArt/event_chart_south_america", motion="scout", scene="아즈텍 태양석" }, row="ranged", power=3, weapon="gun", ability="spy" }
B.Units.nw_12 = { id="nw_12", name="마야 비취 가면", category="유물", lore="신대륙의 유물 유산 · 마야 비취 가면", stage={ art="CardArt/event_chart_south_america", motion="scout", scene="마야 비취 가면" }, row="melee", power=4, weapon="axe", ability="morale" }
B.Units.nw_13 = { id="nw_13", name="잉카 키푸", category="유물", lore="신대륙의 유물 유산 · 잉카 키푸", stage={ art="CardArt/event_chart_south_america", motion="scout", scene="잉카 키푸" }, row="ranged", power=4, weapon="gun", ability="quipu", text="배치한 뒤 일반 유닛을 세 번 연속 번갈아 배치하면 마지막 유닛 +3. 라운드당 한 번." }
B.Units.nw_14 = { id="nw_14", name="모체 금가면", category="유물", lore="신대륙의 유물 유산 · 모체 금가면", stage={ art="CardArt/event_chart_south_america", motion="scout", scene="모체 금가면" }, row="melee", power=4, weapon="sword", ability="armor" }
B.Units.nw_15 = { id="nw_15", name="올메카 거대 석두", category="유물", lore="신대륙의 유물 유산 · 올메카 거대 석두", stage={ art="CardArt/event_chart_south_america", motion="scout", scene="올메카 거대 석두", prop={"Terrain","statue-head"} }, row="cannon", power=5, weapon="cannon", ability="bond" }
B.Units.nw_16 = { id="nw_16", name="나스카 직물", category="유물", lore="신대륙의 유물 유산 · 나스카 직물", stage={ art="Goods/cloth", motion="scout", scene="나스카 직물" }, row="ranged", power=3, weapon="gun", ability="spy" }
B.Specials.nw_17 = { id="nw_17", name="안데스 전령 나팔", category="유물", lore="신대륙의 유물 유산 · 안데스 전령 나팔", stage={ art="CardArt/event_chart_south_america", motion="scout", scene="안데스 전령 나팔" }, special="dispatch", text="전령 나팔을 불어 덱 위 두 장 중 일반 유닛을 한 장 가져온다." }
B.Units.nw_18 = { id="nw_18", name="재규어", category="동물", lore="신대륙의 동물 유산 · 재규어", stage={ art="CardArt/event_chart_south_america", motion="pounce", scene="재규어" }, row="melee", power=7, weapon="sword", ability="amazonJaguar", text="다음 내 턴 시작: 상대 전열 일반 유닛이 한 장뿐이면 그 유닛 −3. 배치당 한 번." }
B.Units.nw_19 = { id="nw_19", name="라마", category="동물", lore="신대륙의 동물 유산 · 라마", stage={ art="CardArt/event_chart_south_america", motion="gallop", scene="라마", prop={"Animals","llama"} }, row="melee", power=5, weapon="axe", ability="morale", cause="nw_29" }
B.Units.nw_20 = { id="nw_20", name="아메리카들소", category="동물", lore="신대륙의 동물 유산 · 아메리카들소", stage={ art="CardArt/event_chart_south_america", motion="pounce", scene="아메리카들소" }, row="ranged", power=4, weapon="gun", ability="spy" }
B.Units.nw_21 = { id="nw_21", name="큰부리새", category="동물", lore="신대륙의 동물 유산 · 큰부리새", stage={ art="CardArt/event_chart_south_america", motion="gallop", scene="큰부리새" }, row="melee", power=6, weapon="sword", cause="nw_27" }
B.Units.nw_22 = { id="nw_22", name="카피바라", category="동물", lore="신대륙의 동물 유산 · 카피바라", stage={ art="CardArt/event_chart_south_america", motion="pounce", scene="카피바라" }, row="melee", power=5, weapon="axe", ability="armor" }
B.Units.nw_23 = { id="nw_23", name="안데스콘도르", category="동물", lore="신대륙의 동물 유산 · 안데스콘도르", stage={ art="CardArt/event_chart_south_america", motion="gallop", scene="안데스콘도르" }, row="ranged", power=4, weapon="gun", ability="bond", cause="nw_29" }
B.Units.nw_24 = { id="nw_24", name="마추픽추", category="지형·원더", lore="안데스 고산에 남은 잉카의 석조 도시", stage={ art="CardArt/event_machu_picchu", motion="clear", scene="마추픽추" }, row="melee", power=9, hero=true }
B.Units.nw_25 = { weatherArmor=true, id="nw_25", name="치첸이트사", category="지형·원더", lore="유카탄반도의 마야 도시 유적", stage={ art="CardArt/event_chichen", motion="clear", scene="치첸이트사" }, row="melee", power=5, weapon="axe", ability="highGround", text="날씨에 강하다. 고지 엄호: 내 후열 첫 일반 유닛이 배치 중 받는 첫 약화를 막는다. 라운드당 한 번." }
B.Units.nw_26 = { id="nw_26", name="테오티우아칸", category="지형·원더", lore="신대륙의 지형·원더 유산 · 테오티우아칸", stage={ art="CardArt/event_chart_south_america", motion="clear", scene="테오티우아칸" }, row="cannon", power=5, weapon="cannon", ability="morale" }
B.Specials.nw_27 = { id="nw_27", name="아마존 강", category="지형·원더", lore="남아메리카 대륙을 가로지르는 대하천", stage={ art="CardArt/event_chart_south_america", motion="wind", scene="아마존 강" }, special="riverRoute", text="내 전열의 가장 약한 일반 유닛 하나를 후열로 옮긴다." }
B.Units.nw_28 = { id="nw_28", name="이과수 폭포", category="지형·원더", lore="신대륙의 지형·원더 유산 · 이과수 폭포", stage={ art="CardArt/event_chart_south_america", motion="clear", scene="이과수 폭포", prop={"Terrain","land-waterfall"} }, row="ranged", power=4, weapon="gun" }
B.Units.nw_29 = { id="nw_29", name="안데스산맥", category="지형·원더", lore="신대륙의 지형·원더 유산 · 안데스산맥", stage={ art="CardArt/event_chart_south_america", motion="clear", scene="안데스산맥" }, row="melee", power=5, weapon="spear" }
B.Specials.nw_30 = { id="nw_30", name="카리브 허리케인", category="지형·원더", lore="열대 해역의 항해와 포격을 방해하는 폭풍", stage={ art="CardArt/event_hurricane", motion="storm", scene="카리브 허리케인" }, special="weather", text="해당 전투 줄의 일반 카드 전투력을 1로 낮춘다", row="cannon" }
B.Specials.nw_31 = { id="nw_31", name="산사태", category="지형·원더", lore="산비탈이 무너져 길과 유적을 덮친 재해", stage={ art="CardArt/event_chart_world", motion="storm", scene="산사태" }, special="refute", refuteKind="지형·원더", text="상대 카드 중 지형·원더에서 이어진 연쇄 보너스를 끊는다" }
B.Units.nw_32 = { id="nw_32", name="잉카 도로망", category="기술", lore="안데스 산맥을 가로질러 제국을 이은 길", stage={ art="CardArt/event_chart_south_america", motion="scout", scene="잉카 도로망" }, row="melee", power=4, weapon="spear", ability="chaski", text="직전에 낸 내 일반 유닛과 다른 열에 내면 카드 1장 뽑기. 전령 인계: 전열에서 후열로 이동한 아군의 강화 1점을 다른 후열 아군에게 넘긴다. 라운드당 한 번." }
B.Units.nw_33 = { id="nw_33", name="잉카 제국의 확장", category="사건", lore="길과 역참으로 안데스 전역을 하나로 묶은 시기", stage={ art="CardArt/event_chart_south_america", motion="wind", scene="잉카 제국의 확장" }, row="ranged", power=3, weapon="gun", cause="nw_32" }
B.Units.nw_34 = { id="nw_34", name="아타우알파", category="인물", lore="잉카 제국의 마지막 황제", stage={ art="CardArt/event_chart_south_america", motion="board", scene="아타우알파" }, row="melee", power=6, weapon="axe", cause="nw_33" }
B.Units.af_01 = { id="af_01", name="스와힐리 므테페", category="선박", lore="동아프리카 해안의 전통적인 돛배", stage={ art="CardArt/event_chart_west_africa", motion="board", scene="스와힐리 므테페" }, row="melee", power=4, weapon="sword", ability="spy" }
B.Units.af_02 = { id="af_02", name="잔지바르 다우선", category="선박", lore="스와힐리 연안과 인도양을 잇는 무역선", stage={ art="CardArt/event_zanzibar", motion="wind", scene="잔지바르 다우선" }, row="ranged", power=5, weapon="gun", ability="spy" }
B.Units.af_03 = { id="af_03", name="나일 펠루카", category="선박", lore="이집트 나일강의 작은 삼각돛배", stage={ art="CardArt/event_chart_west_africa", motion="wind", scene="나일 펠루카" }, row="ranged", power=6, weapon="gun", ability="bond", cause="af_04" }
B.Units.af_04 = { id="af_04", name="나일 파피루스배", category="선박", lore="파피루스로 엮어 만든 고대 이집트 배", stage={ art="CardArt/event_chart_west_africa", motion="board", scene="나일 파피루스배" }, row="melee", power=5, weapon="sword", ability="morale" }
B.Units.af_05 = { id="af_05", name="누비아 돛배", category="선박", lore="아프리카의 선박 유산 · 누비아 돛배", stage={ art="CardArt/event_chart_west_africa", motion="board", scene="누비아 돛배" }, row="melee", power=4, weapon="axe" }
B.Units.af_06 = { id="af_06", name="세네갈 피로그", category="선박", lore="서아프리카 연안의 긴 카누", stage={ art="CardArt/event_chart_west_africa", motion="wind", scene="세네갈 피로그", prop={"Terrain","canoe"} }, row="ranged", power=7, weapon="gun" }
B.Units.af_07 = { id="af_07", name="기니만 전투 카누", category="선박", lore="아프리카의 선박 유산 · 기니만 전투 카누", stage={ art="CardArt/event_chart_west_africa", motion="board", scene="기니만 전투 카누", prop={"Terrain","canoe"} }, row="melee", power=5, weapon="sword" }
B.Units.af_08 = { id="af_08", name="콩고 강 카누", category="선박", lore="콩고강의 강상 이동에 쓰는 통나무배", stage={ art="CardArt/event_chart_west_africa", motion="wind", scene="콩고 강 카누", prop={"Terrain","canoe"} }, row="ranged", power=4, weapon="gun" }
B.Units.af_09 = { id="af_09", name="마다가스카르 아웃리거", category="선박", lore="아프리카의 선박 유산 · 마다가스카르 아웃리거", stage={ art="CardArt/event_chart_west_africa", motion="wind", scene="마다가스카르 아웃리거" }, row="ranged", power=6, weapon="gun", ability="spy" }
B.Units.af_10 = { id="af_10", name="동아프리카 무역 다우", category="선박", lore="아프리카의 선박 유산 · 동아프리카 무역 다우", stage={ art="CardArt/event_chart_west_africa", motion="fire", scene="동아프리카 무역 다우" }, row="cannon", power=9, hero=true }
B.Units.af_11 = { id="af_11", name="베냉 청동판", category="유물", lore="아프리카의 유물 유산 · 베냉 청동판", stage={ art="CardArt/event_chart_west_africa", motion="scout", scene="베냉 청동판" }, row="ranged", power=3, weapon="gun", ability="spy" }
B.Units.af_12 = { id="af_12", name="아샨티 금추", category="유물", lore="아프리카의 유물 유산 · 아샨티 금추", stage={ art="Goods/gold", motion="scout", scene="아샨티 금추" }, row="melee", power=4, weapon="axe", ability="morale" }
B.Units.af_13 = { id="af_13", name="에티오피아 석십자가", category="유물", lore="아프리카의 유물 유산 · 에티오피아 석십자가", stage={ art="CardArt/event_chart_west_africa", motion="scout", scene="에티오피아 석십자가" }, row="ranged", power=4, weapon="gun", ability="morale" }
B.Units.af_14 = { id="af_14", name="이집트 파피루스 두루마리", category="유물", lore="아프리카의 유물 유산 · 이집트 파피루스 두루마리", stage={ art="CardArt/event_chart_west_africa", motion="scout", scene="이집트 파피루스 두루마리" }, row="melee", power=4, weapon="sword", ability="armor" }
B.Units.af_15 = { id="af_15", name="요루바 구슬 왕관", category="유물", lore="아프리카의 유물 유산 · 요루바 구슬 왕관", stage={ art="CardArt/event_chart_west_africa", motion="scout", scene="요루바 구슬 왕관" }, row="cannon", power=5, weapon="cannon", ability="bond" }
B.Units.af_16 = { id="af_16", name="누비아 금장식", category="유물", lore="아프리카의 유물 유산 · 누비아 금장식", stage={ art="Goods/gold", motion="scout", scene="누비아 금장식" }, row="ranged", power=3, weapon="gun", ability="spy" }
B.Specials.af_17 = { id="af_17", name="아샨티 의장 북", category="유물", lore="아프리카의 유물 유산 · 아샨티 의장 북", stage={ art="CardArt/event_chart_west_africa", motion="scout", scene="아샨티 의장 북" }, special="horn", text="내 가장 센 줄의 일반 카드 점수가 두 배" }
B.Units.af_18 = { id="af_18", name="아프리카 코끼리", category="동물", lore="아프리카의 동물 유산 · 아프리카 코끼리", stage={ art="CardArt/event_chart_west_africa", motion="pounce", scene="아프리카 코끼리", prop={"Animals","elephant"} }, row="melee", power=7, weapon="sword", savanna=true, ability="savannaElephant", text="낼 때: 같은 열의 다른 사바나 동물 한 장에 엄호. 없으면 자신에 엄호." }
B.Units.af_19 = { id="af_19", name="아프리카사자", category="동물", lore="아프리카의 동물 유산 · 아프리카사자", stage={ art="CardArt/event_chart_west_africa", motion="gallop", scene="아프리카사자" }, row="melee", power=5, weapon="axe", savanna=true, ability="savannaLion", text="낼 때: 가장 강한 상대 전열 일반 유닛 −2. 다른 아군 사바나 동물이 있으면 −3." }
B.Units.af_20 = { id="af_20", name="기린", category="동물", lore="아프리카의 동물 유산 · 기린", stage={ art="CardArt/event_chart_west_africa", motion="pounce", scene="기린" }, row="ranged", power=4, weapon="gun", savanna=true, ability="savannaGiraffe", text="낼 때: 덱 위 두 장에서 사바나 동물 한 장을 손패로 가져온다." }
B.Units.af_21 = { id="af_21", name="하마", category="동물", lore="아프리카의 동물 유산 · 하마", stage={ art="CardArt/event_chart_west_africa", motion="gallop", scene="하마" }, row="melee", power=6, weapon="sword", cause="af_26" }
B.Units.af_22 = { id="af_22", name="검은코뿔소", category="동물", lore="아프리카의 동물 유산 · 검은코뿔소", stage={ art="CardArt/event_chart_west_africa", motion="pounce", scene="검은코뿔소" }, row="melee", power=5, weapon="axe", ability="armor" }
B.Units.af_23 = { id="af_23", name="얼룩말", category="동물", lore="아프리카의 동물 유산 · 얼룩말", stage={ art="CardArt/event_chart_west_africa", motion="gallop", scene="얼룩말" }, row="ranged", power=4, weapon="gun", savanna=true, ability="savannaZebra", text="낼 때: 같은 열에 다른 아군 사바나 동물이 있으면 자신과 그 동물 한 장 +1." }
B.Units.af_24 = { id="af_24", name="기자 피라미드", category="지형·원더", lore="고대 이집트 왕국의 거대한 왕릉", stage={ art="CardArt/event_giza", motion="clear", scene="기자 피라미드" }, row="melee", power=9, hero=true }
B.Units.af_25 = { id="af_25", name="그레이트 짐바브웨", category="지형·원더", lore="남부 아프리카의 거대한 석조 도시 유적", stage={ art="CardArt/event_zimbabwe", motion="clear", scene="그레이트 짐바브웨" }, row="melee", power=5, weapon="axe", ability="armor" }
B.Units.af_26 = { id="af_26", name="빅토리아 폭포", category="지형·원더", lore="아프리카의 지형·원더 유산 · 빅토리아 폭포", stage={ art="CardArt/event_chart_west_africa", motion="clear", scene="빅토리아 폭포", prop={"Terrain","land-waterfall"} }, row="cannon", power=5, weapon="cannon", ability="morale" }
B.Specials.af_27 = { id="af_27", name="사하라 사막", category="지형·원더", lore="아프리카의 지형·원더 유산 · 사하라 사막", stage={ art="CardArt/event_chart_west_africa", motion="storm", scene="사하라 사막" }, special="weather", text="해당 전투 줄의 일반 카드 전투력을 1로 낮춘다", row="melee" }
B.Units.af_28 = { id="af_28", name="킬리만자로", category="지형·원더", lore="아프리카의 지형·원더 유산 · 킬리만자로", stage={ art="CardArt/event_chart_west_africa", motion="clear", scene="킬리만자로" }, row="ranged", power=4, weapon="gun" }
B.Specials.af_29 = { id="af_29", name="벵겔라 해류", category="지형·원더", lore="아프리카 남서 해안을 따라 흐르는 찬 해류", stage={ art="CardArt/event_chart_west_africa", motion="wind", scene="벵겔라 해류" }, special="wind", text="날씨를 걷어 내고 카드를 한 장 뽑는다" }
B.Specials.af_30 = { id="af_30", name="하르마탄 바람", category="지형·원더", lore="서아프리카에 먼지와 건조한 공기를 보내는 바람", stage={ art="CardArt/event_drought", motion="storm", scene="하르마탄 바람" }, special="weather", text="해당 전투 줄의 일반 카드 전투력을 1로 낮춘다", row="ranged" }
B.Specials.af_31 = { id="af_31", name="도굴", category="유물", lore="무덤과 유적에서 보물을 훔치는 범죄", stage={ art="CardArt/event_chart_world", motion="storm", scene="도굴" }, special="refute", refuteKind="유물", text="상대 카드 중 유물에서 이어진 연쇄 보너스를 끊는다" }
B.Units.af_32 = { id="af_32", name="사하라 대상", category="기술", lore="낙타를 줄지어 사막을 건너 금과 소금을 나르던 교역대", stage={ art="CardArt/event_chart_west_africa", motion="gallop", scene="사하라 대상" }, row="melee", power=4, weapon="spear" }
B.Units.af_33 = { id="af_33", name="말리 제국의 번영", category="사건", lore="금과 소금 교역으로 서아프리카가 부유해진 시기", stage={ art="CardArt/event_chart_west_africa", motion="wind", scene="말리 제국의 번영" }, row="ranged", power=3, weapon="gun", cause="af_32" }
B.Units.af_34 = { id="af_34", name="아흐메드 바바", category="인물", lore="팀북투에서 이름을 떨친 서아프리카의 학자", stage={ art="CardArt/event_chart_west_africa", motion="scout", scene="아흐메드 바바" }, row="melee", power=5, weapon="sword", cause="af_33" }
B.Units.sa_01 = { id="sa_01", name="말레이 프라우", category="선박", lore="말레이 해역을 누비던 날렵한 쌍돛배", stage={ art="CardArt/event_chart_southeast_asia", motion="wind", scene="말레이 프라우" }, row="ranged", power=4, weapon="gun", ability="spy" }
B.Units.sa_02 = { id="sa_02", name="촐라 전함", category="선박", lore="인도양을 건너 동남아까지 닿은 남인도 해군의 큰 배", stage={ art="CardArt/event_chart_southeast_asia", motion="fire", scene="촐라 전함" }, row="cannon", power=6, weapon="cannon", ability="armor", cause="sa_32" }
B.Units.sa_03 = { id="sa_03", name="아랍 다우", category="선박", lore="계절풍을 타고 인도양을 오간 삼각돛 무역선", stage={ art="CardArt/event_chart_southeast_asia", motion="wind", scene="아랍 다우" }, row="ranged", power=5, weapon="gun", ability="bond" }
B.Units.sa_04 = { id="sa_04", name="중국 정크", category="선박", lore="대나무 돛과 칸막이 선창으로 유명한 큰 범선", stage={ art="CardArt/event_chart_southeast_asia", motion="board", scene="중국 정크" }, row="melee", power=5, weapon="sword", ability="morale" }
B.Units.sa_05 = { id="sa_05", name="코라코라 전선", category="선박", lore="필리핀과 말루쿠 해역의 노 젓는 전투선", stage={ art="CardArt/event_chart_southeast_asia", motion="board", scene="코라코라 전선" }, row="melee", power=5, weapon="axe", ability="bond" }
B.Units.sa_06 = { id="sa_06", name="말라바르 쾌속선", category="선박", lore="남인도 서해안의 빠른 무역·해적 대응선", stage={ art="CardArt/event_chart_southeast_asia", motion="wind", scene="말라바르 쾌속선" }, row="ranged", power=4, weapon="gun", ability="spy" }
B.Units.sa_07 = { id="sa_07", name="무굴 상선", category="선박", lore="구자라트 항구에서 출항한 무굴 제국의 무역선", stage={ art="CardArt/event_chart_southeast_asia", motion="fire", scene="무굴 상선" }, row="cannon", power=5, weapon="cannon", ability="morale" }
B.Units.sa_08 = { id="sa_08", name="대형 바지선", category="선박", lore="강과 운하로 군량을 나르던 평저선", stage={ art="CardArt/event_chart_southeast_asia", motion="board", scene="대형 바지선" }, row="melee", power=6, weapon="spear" }
B.Units.sa_09 = { id="sa_09", name="향신료 대선단", category="선박", lore="정향과 후추를 가득 싣고 바다를 가로지르던 거대 선단", stage={ art="CardArt/event_chart_southeast_asia", motion="fire", scene="향신료 대선단" }, row="cannon", power=9, weapon="cannon", hero=true }
B.Units.sa_10 = { id="sa_10", name="앙코르 청동종", category="유물", lore="크메르 사원에서 울리던 큰 종", stage={ art="CardArt/event_chart_southeast_asia", motion="scout", scene="앙코르 청동종" }, row="melee", power=4, weapon="axe", ability="morale" }
B.Units.sa_11 = { id="sa_11", name="청화 자기", category="유물", lore="바닷길을 따라 퍼진 푸른 무늬 도자기", stage={ art="Goods/porcelain", motion="scout", scene="청화 자기" }, row="melee", power=4, weapon="sword", ability="armor" }
B.Units.sa_12 = { id="sa_12", name="후추 자루", category="유물", lore="말라바르 해안의 값비싼 검은 후추", stage={ art="Goods/pepper", motion="scout", scene="후추 자루" }, row="ranged", power=3, weapon="gun", ability="spy" }
B.Units.sa_13 = { id="sa_13", name="정향 상자", category="유물", lore="말루쿠 제도에서만 나던 귀한 향신료", stage={ art="Goods/cloves", motion="scout", scene="정향 상자" }, row="ranged", power=4, weapon="gun", ability="morale" }
B.Units.sa_14 = { id="sa_14", name="힌두 청동상", category="유물", lore="남인도 장인이 만든 춤추는 신의 청동상", stage={ art="CardArt/event_chart_southeast_asia", motion="scout", scene="힌두 청동상" }, row="melee", power=5, weapon="spear", ability="bond" }
B.Specials.sa_15 = { id="sa_15", name="마자파힛 깃발", category="유물", lore="섬 제국이 군사를 모으려 내건 큰 깃발", stage={ art="CardArt/event_chart_southeast_asia", motion="scout", scene="마자파힛 깃발" }, special="rallyFlag", text="이번 라운드에 같은 열 아군이 적에게 다음으로 제거되면 그 열에 지원병 한 장을 부른다." }
B.Units.sa_16 = { id="sa_16", name="인도코끼리", category="동물", lore="전투와 운반에 쓰인 거대한 코끼리", stage={ art="CardArt/event_chart_southeast_asia", motion="gallop", scene="인도코끼리" }, row="melee", power=8, weapon="sword" }
B.Units.sa_17 = { id="sa_17", name="벵골호랑이", category="동물", lore="갠지스 삼각주의 맹수", stage={ art="CardArt/event_chart_southeast_asia", motion="pounce", scene="벵골호랑이" }, row="melee", power=6, weapon="axe" }
B.Units.sa_18 = { id="sa_18", name="코모도왕도마뱀", category="동물", lore="인도네시아 섬에 사는 거대한 도마뱀", stage={ art="CardArt/event_chart_southeast_asia", motion="pounce", scene="코모도왕도마뱀" }, row="melee", power=5, weapon="spear", ability="armor" }
B.Units.sa_19 = { id="sa_19", name="인도코뿔소", category="동물", lore="두꺼운 가죽으로 몸을 지키는 큰 짐승", stage={ art="CardArt/event_chart_southeast_asia", motion="gallop", scene="인도코뿔소" }, row="melee", power=7, weapon="sword" }
B.Units.sa_20 = { id="sa_20", name="오랑우탄", category="동물", lore="보르네오와 수마트라 숲의 붉은 유인원", stage={ art="CardArt/event_chart_southeast_asia", motion="pounce", scene="오랑우탄" }, row="melee", power=5, weapon="axe", ability="morale" }
B.Units.sa_21 = { id="sa_21", name="인도공작", category="동물", lore="남아시아의 화려한 깃털 새", stage={ art="CardArt/event_chart_southeast_asia", motion="pounce", scene="인도공작" }, row="ranged", power=4, weapon="gun", ability="bond" }
B.Units.sa_22 = { id="sa_22", name="앙코르와트", category="지형·원더", lore="크메르 제국이 세운 거대한 힌두 사원", stage={ art="CardArt/event_angkor", motion="clear", scene="앙코르와트" }, row="melee", power=9, hero=true }
B.Units.sa_23 = { id="sa_23", name="보로부두르", category="지형·원더", lore="자바 섬의 거대한 불교 사원", stage={ art="CardArt/event_chart_southeast_asia", motion="clear", scene="보로부두르" }, row="melee", power=5, weapon="axe", ability="armor" }
B.Specials.sa_24 = { id="sa_24", name="말라카 해협", category="지형·원더", lore="인도양과 태평양을 잇는 좁은 바닷길", stage={ art="CardArt/event_chart_southeast_asia", motion="wind", scene="말라카 해협" }, special="strait", text="다음 내 턴 시작에 상대 후열에서 가장 강한 일반 유닛 −3." }
B.Specials.sa_25 = { id="sa_25", name="몬순 폭우", category="지형·원더", lore="바닷길을 때리는 계절 폭풍", stage={ art="CardArt/event_chart_southeast_asia", motion="storm", scene="몬순 폭우" }, special="weather", text="해당 전투 줄의 일반 카드 전투력을 1로 낮춘다", row="ranged" }
B.Units.sa_26 = { id="sa_26", name="하롱베이", category="지형·원더", lore="바다 위에 기암이 솟은 베트남의 만", stage={ art="CardArt/event_chart_southeast_asia", motion="clear", scene="하롱베이" }, row="ranged", power=4, weapon="gun" }
B.Units.sa_27 = { id="sa_27", name="타지마할", category="지형·원더", lore="무굴 황제가 세운 흰 대리석 묘당", stage={ art="CardArt/event_chart_southeast_asia", motion="clear", scene="타지마할" }, row="ranged", power=9, weapon="gun", hero=true }
B.Units.sa_28 = { id="sa_28", name="향신료 무역", category="사건", lore="동남아 향신료가 세계 무역을 바꾼 흐름", stage={ art="CardArt/event_chart_southeast_asia", motion="wind", scene="향신료 무역" }, row="ranged", power=3, weapon="gun", cause="sa_31" }
B.Units.sa_29 = { id="sa_29", name="말라카 술탄", category="인물", lore="말라카 해협을 지배한 해상 왕국의 군주", stage={ art="CardArt/event_chart_southeast_asia", motion="board", scene="말라카 술탄" }, row="melee", power=5, weapon="sword", cause="sa_28" }
B.Specials.sa_30 = { id="sa_30", name="향신료 독점", category="기술", lore="물자가 오가는 길을 쥐어 상대를 말려 죽이는 수", stage={ art="CardArt/event_chart_southeast_asia", motion="storm", scene="향신료 독점" }, special="refute", refuteKind="기술", text="상대 카드 중 기술에서 이어진 연쇄 보너스를 끊는다" }
B.Units.sa_31 = { id="sa_31", name="계절풍 항법", category="기술", lore="계절풍의 방향을 읽어 인도양을 건너던 항해 지식", stage={ art="CardArt/event_chart_southeast_asia", motion="scout", scene="계절풍 항법" }, row="ranged", power=3, weapon="gun" }
B.Units.sa_32 = { id="sa_32", name="촐라의 해상 원정", category="사건", lore="촐라 함대가 벵골만을 건너 동남아 항구를 친 원정", stage={ art="CardArt/event_chart_southeast_asia", motion="fire", scene="촐라의 해상 원정" }, row="cannon", power=4, weapon="cannon" }
B.Units.sa_33 = { id="sa_33", name="라젠드라 1세", category="인물", lore="해상 원정으로 촐라의 영향력을 넓힌 왕", stage={ art="CardArt/event_chart_southeast_asia", motion="board", scene="라젠드라 1세" }, row="melee", power=6, weapon="sword", cause="sa_32" }
B.Units.lo_01 = { id="lo_01", name="아틀란티스", category="지형·원더", lore="플라톤이 전한, 바다 속으로 가라앉았다는 전설의 섬나라", stage={ art="CardArt/event_chart_mediterranean", motion="wind", scene="아틀란티스" }, row="ranged", power=9, weapon="gun", hero=true }
B.Units.lo_02 = { id="lo_02", name="무 대륙", category="지형·원더", lore="태평양에 가라앉았다고 전해지는 잃어버린 대륙", stage={ art="CardArt/event_calm_seas", motion="wind", scene="무 대륙" }, row="cannon", power=9, weapon="cannon", hero=true }
B.Units.lo_03 = { id="lo_03", name="엘도라도", category="지형·원더", lore="남미 밀림 깊숙이 숨었다는 황금의 도시", stage={ art="CardArt/event_machu_picchu", motion="clear", scene="엘도라도" }, row="melee", power=9, weapon="axe", hero=true }
B.Units.lo_04 = { id="lo_04", name="레무리아", category="지형·원더", lore="인도양 어딘가에 있었다는 전설의 땅", stage={ art="CardArt/event_chart_east_asia", motion="wind", scene="레무리아" }, row="ranged", power=6, weapon="gun", ability="bond" }
B.Units.lo_05 = { id="lo_05", name="샹그릴라", category="지형·원더", lore="산속에 숨은 이상향 이야기", stage={ art="CardArt/event_great_wall", motion="clear", scene="샹그릴라" }, row="melee", power=5, weapon="sword", ability="armor" }
B.Units.lo_06 = { id="lo_06", name="바벨탑", category="유물", lore="하늘에 닿으려다 무너졌다는 탑 이야기", stage={ art="CardArt/event_giza", motion="clear", scene="바벨탑" }, row="cannon", power=6, weapon="cannon", ability="morale" }
B.Units.lo_07 = { id="lo_07", name="실종된 로아노크 식민지", category="미스터리", lore="흔적 없이 사라진 식민지의 수수께끼", stage={ art="CardArt/event_chart_west_europe", motion="scout", scene="실종된 로아노크 식민지" }, row="melee", power=4, weapon="sword", ability="spy" }
B.Units.lo_08 = { id="lo_08", name="프레스터 존의 왕국", category="미스터리", lore="동방 어딘가에 있다는 기독교 왕국의 소문", stage={ art="CardArt/event_chart_east_asia", motion="scout", scene="프레스터 존의 왕국" }, row="ranged", power=5, weapon="gun", ability="morale" }
B.Units.lo_09 = { id="lo_09", name="메로에 왕국의 비밀", category="지형·원더", lore="잊힌 문명의 유적 이야기", stage={ art="CardArt/event_zimbabwe", motion="clear", scene="메로에 왕국의 비밀" }, row="melee", power=5, weapon="axe", ability="bond" }
B.Units.lo_10 = { id="lo_10", name="이스터섬의 거인상", category="지형·원더", lore="누가 왜 세웠는지 알 수 없는 거대한 석상", stage={ art="CardArt/event_moai", motion="clear", scene="이스터섬의 거인상", prop={"Terrain","statue-head"} }, row="melee", power=6, weapon="axe", ability="armor" }
B.Units.lo_11 = { id="lo_11", name="마추픽추의 비밀 창고", category="지형·원더", lore="잉카 유적에 숨겨졌다는 보물 이야기", stage={ art="CardArt/event_machu_picchu", motion="clear", scene="마추픽추의 비밀 창고" }, row="cannon", power=4, weapon="cannon", ability="bond" }
B.Units.lo_12 = { id="lo_12", name="지하 도시 데린쿠유", category="지형·원더", lore="땅속 깊이 숨은 고대 도시", stage={ art="CardArt/event_petra", motion="clear", scene="지하 도시 데린쿠유" }, row="melee", power=5, weapon="axe", ability="armor" }
B.Units.lo_13 = { id="lo_13", name="고대 신전의 수호상", category="유물", lore="잊힌 신전을 지킨다는 돌 수호자", stage={ art="CardArt/event_petra", motion="clear", scene="고대 신전의 수호상" }, row="melee", power=5, weapon="axe", ability="armor" }
B.Units.lo_14 = { id="lo_14", name="크라켄", category="전설 생물", lore="배를 통째로 끌어내린다는 거대한 바다 괴물", stage={ art="CardArt/event_storm", motion="fire", scene="크라켄" }, row="cannon", power=10, weapon="cannon", hero=true }
B.Units.lo_15 = { id="lo_15", name="용", category="전설 생물", lore="불을 뿜는 날개 달린 거대한 짐승", stage={ art="CardArt/event_hurricane", motion="fire", scene="용" }, row="ranged", power=10, weapon="gun", hero=true }
B.Units.lo_16 = { id="lo_16", name="불사조", category="전설 생물", lore="재에서 다시 태어난다는 불꽃의 새", stage={ art="CardArt/event_drought", motion="clear", scene="불사조" }, row="ranged", power=8, weapon="gun", hero=true }
B.Units.lo_17 = { id="lo_17", name="바다뱀", category="전설 생물", lore="뱃길을 막고 나타난다는 거대한 뱀", stage={ art="CardArt/myth_sea_serpent", motion="pounce", scene="바다뱀" }, row="melee", power=6, weapon="sword", ability="morale" }
B.Units.lo_18 = { id="lo_18", name="인어", category="전설 생물", lore="노래로 선원을 홀린다는 바다의 존재", stage={ art="CardArt/event_calm_seas", motion="scout", scene="인어" }, row="ranged", power=4, weapon="gun", ability="spy" }
B.Units.lo_19 = { id="lo_19", name="그리폰", category="전설 생물", lore="독수리와 사자가 합쳐진 하늘의 수호자", stage={ art="CardArt/event_great_wall", motion="gallop", scene="그리폰" }, row="ranged", power=6, weapon="gun", ability="bond" }
B.Units.lo_20 = { id="lo_20", name="해마 기병", category="전설 생물", lore="파도를 가르는 전설의 말", stage={ art="CardArt/event_chart_mediterranean", motion="gallop", scene="해마 기병" }, row="melee", power=5, weapon="spear", ability="morale" }
B.Units.lo_21 = { id="lo_21", name="유령선 플라잉 더치맨", category="미스터리", lore="영원히 바다를 떠돈다는 저주받은 배", stage={ art="CardArt/event_title_ship", motion="wind", scene="유령선 플라잉 더치맨" }, row="cannon", power=7, weapon="cannon", ability="armor" }
B.Units.lo_22 = { id="lo_22", name="사이렌의 노래", category="전설 생물", lore="듣는 이의 마음을 끌어당기는 노래", stage={ art="CardArt/event_calm_seas", motion="scout", scene="사이렌의 노래" }, row="ranged", power=3, weapon="gun", ability="spy" }
B.Units.lo_23 = { id="lo_23", name="고대 거인", category="전설 생물", lore="돌산처럼 우뚝 선 옛이야기 속의 거인", stage={ art="CardArt/event_stonehenge", motion="pounce", scene="고대 거인" }, row="melee", power=7, weapon="axe", ability="armor" }
B.Units.lo_24 = { id="lo_24", name="안개의 정령", category="전설 생물", lore="안개 속에서 길을 흐리는 존재", stage={ art="CardArt/event_calm_seas", motion="scout", scene="안개의 정령" }, row="ranged", power=3, weapon="gun", ability="bond" }
B.Units.lo_46 = { id="lo_46", name="묠니르", category="유물", lore="북유럽 신화에서 천둥의 신 토르가 쓰는 망치.", row="melee", power=4, ability="legacy", text="전우의 유언: 상대 효과로 제거되면 같은 열의 가장 약한 아군 일반 유닛 +2." }
B.Specials.lo_25 = { id="lo_25", name="엑스칼리버", category="유물", lore="아서왕 전설에서 아서가 호수의 여인에게 받은 검", special="horn", text="내 가장 센 줄의 일반 카드 점수가 두 배" }
B.Specials.lo_26 = { id="lo_26", name="현자의 돌", category="유물", lore="금속을 금으로 바꾸고 생명의 영약을 만드는 데 쓰인다는 연금술 전승의 물질", special="echo", text="따라 하기: 상대가 이번 라운드에 마지막으로 낸 전술의 효과를 복제한다." }
B.Specials.lo_27 = { id="lo_27", name="저주의 안개", category="미스터리", lore="시야를 가리고 힘을 앗아 가는 짙은 안개", stage={ art="CardArt/event_calm_seas", motion="storm", scene="저주의 안개" }, special="weather", text="해당 전투 줄의 일반 카드 전투력을 1로 낮춘다", row="melee", }
B.Specials.lo_28 = { id="lo_28", name="불의 폭풍", category="미스터리", lore="하늘을 붉게 물들이는 폭풍", stage={ art="CardArt/event_hurricane", motion="storm", scene="불의 폭풍" }, special="weather", text="해당 전투 줄의 일반 카드 전투력을 1로 낮춘다", row="ranged", }
B.Specials.lo_29 = { id="lo_29", name="깊은 바다의 소용돌이", category="미스터리", lore="모든 것을 삼키는 거대한 소용돌이", stage={ art="CardArt/event_storm", motion="storm", scene="깊은 바다의 소용돌이" }, special="weather", text="해당 전투 줄의 일반 카드 전투력을 1로 낮춘다", row="cannon", }
B.Specials.lo_30 = { id="lo_30", name="신비한 등불", category="유물", lore="어둠 속에서 길을 비추는 불빛", stage={ art="CardArt/event_calm_seas", motion="scout", scene="신비한 등불" }, special="horn", text="내 가장 센 줄의 일반 카드 점수가 두 배", }

-- [다국어 카드 도감] 카드 ID와 전투 규칙은 불변. 원본 한국어 이름/설명은 카드 데이터에 보존한다.
-- 다른 국가 공용 화면에서 사용하는 영어 제목/설명. 이미지에는 문자를 넣지 않는다.
B.Units.eu_46 = { id="eu_46", name="마라톤의 전령", category="인물", lore="마라톤에서 아테네까지 승전 소식을 전했다는 전령의 전설", row="melee", ability="marathon", power=3, text="다음 내 턴에 전열에서 살아 있으면 후열로 이동. 다른 후열 아군 최대 둘에 +1." }
B.Specials.me_35 = { id="me_35", name="함무라비의 판결", category="사건", lore="함무라비 법전에서 착안한 판결 전술", row="melee", special="seal", text="능력이 있는 가장 강한 상대 일반 유닛을 상대의 다음 행동까지 봉인." }
B.Specials.ea_35 = { id="ea_35", name="한신의 배수진", category="사건", lore="한신이 강을 등지고 싸웠다는 전투에서 착안한 매복 전술", row="melee", special="ambush", text="다음에 적이 전열에 내려놓는 일반 유닛의 전투력 −2." }
B.Units.eu_47 = { id="eu_47", name="아르키메데스의 투석기", category="기술", lore="시라쿠사 방어에 쓰인 공성 장비를 소재로 한 전술", row="ranged", ability="charge", power=3, text="내 카드 사용으로 턴을 세 번 마치면 같은 열의 일반 아군 전체 +2." }
B.Specials.ea_36 = { id="ea_36", name="공성계", category="사건", lore="삼국지연의에서 적이 의심하도록 유도한 계책", row="melee", special="falseOrder", text="상대 다음 일반 유닛이 후열이면 아군 교대, 전열이면 가장 약한 후열 일반 아군 +1." }
B.Units.ea_37 = { id="ea_37", name="황개의 거짓 투항", category="사건", lore="적벽의 거짓 투항 이야기에서 착안한 전술", row="melee", ability="feigned", power=2, text="상대 전열에 들어간다. 다음 내 턴에 살아 있으면 내 후열로 돌아온다." }

B.Units.ea_38 = { id="ea_38", name="손빈의 감조계", category="전술", row="melee", power=3, ability="falseRetreat", text="내 행동으로 내 전열 점수가 내려가면 다음 상대 전열 일반 유닛 −3. 라운드당 한 번. 동요: 대상의 다음 턴 종료까지 첫 강화를 막는다." }

B.Units.me_36 = { id="me_36", name="대상단의 보급", category="전술", row="ranged", power=3, ability="supply", text="전장에 남긴 채 라운드를 끝내면 다음 라운드 전열·후열의 첫 일반 유닛 각각 +1. 재정비: 배치 시 걸린 약화와 이동 제한을 지운다." }

B.Units.af_35 = { id="af_35", name="줄루 황소뿔 좌익", category="전술", row="melee", power=3, ability="leftHorn", text="같은 열의 우익과 함께 있으면 +2. 합류 시 가장 강한 상대 일반 유닛 −2. 포위는 라운드당 한 번. 포위 대상은 다음 자기 턴 종료까지 이동할 수 없다." }

B.Units.af_36 = { id="af_36", name="줄루 황소뿔 우익", category="전술", row="ranged", power=3, ability="rightHorn", text="같은 열의 좌익과 함께 있으면 +2. 합류 시 가장 강한 상대 일반 유닛 −2. 포위는 라운드당 한 번. 포위 대상은 다음 자기 턴 종료까지 이동할 수 없다." }

B.Units.sa_34 = { id="sa_34", name="박당강의 말뚝", category="전술", row="ranged", power=3, ability="stakes", text="상대가 같은 열에 연속으로 낸 두 번째 일반 유닛 −2. 그 열에 내 일반 유닛이 없으면 −4. 라운드당 한 번. 좌초: 대상은 다음 자기 턴 종료까지 이동할 수 없다." }


B.Specials.lo_47 = { id="lo_47", name="인형의 저주", category="전설", special="dollCurse", text="상대 후열에서 가장 강한 일반 유닛 −2. 다음 자기 행동까지 첫 강화를 막는다." }

B.Units.lo_48 = { id="lo_48", name="첫째 마녀", category="문학", row="ranged", power=3, ability="witchCurse", text="낼 때: 상대 후열 일반 유닛 하나 −1. 세 마녀가 모이면 다음 내 턴에 예언의 환영을 소환한다. 라운드당 한 번." }
B.Units.lo_49 = { id="lo_49", name="둘째 마녀", category="문학", row="ranged", power=3, ability="witchBind", text="낼 때: 상대 후열 일반 유닛 하나의 다음 강화 1회를 막는다. 세 마녀가 모이면 다음 내 턴에 예언의 환영을 소환한다. 라운드당 한 번." }
B.Units.lo_50 = { id="lo_50", name="셋째 마녀", category="문학", row="ranged", power=3, ability="witchGuard", text="낼 때: 같은 열의 다른 마녀 한 명에 엄호를 건다. 세 마녀가 모이면 다음 내 턴에 예언의 환영을 소환한다. 라운드당 한 번." }
B.Units.lo_51 = { id="lo_51", name="손오공", category="문학", row="melee", power=3, ability="monkeyStrike", text="낼 때: 상대 전열 일반 유닛 하나 −2. 세 제자가 모이면 다음 내 턴에 가장 약한 다른 아군을 구출한다. 라운드당 한 번." }
B.Units.lo_52 = { id="lo_52", name="저팔계", category="문학", row="melee", power=3, ability="pigGuard", text="낼 때: 다른 가장 약한 일반 아군에게 엄호를 건다. 세 제자가 모이면 다음 내 턴에 가장 약한 다른 아군을 구출한다. 라운드당 한 번." }
B.Units.lo_53 = { id="lo_53", name="사오정", category="문학", row="ranged", power=3, ability="sandCleanse", text="낼 때: 다른 가장 약한 일반 아군의 약화와 이동 제한, 강화 차단을 해제한다. 세 제자가 모이면 다음 내 턴에 가장 약한 다른 아군을 구출한다. 라운드당 한 번." }

B.Units.lo_54 = { id="lo_54", name="오디세우스", category="문학", journey=true, row="melee", power=5, hero=true, ability="homecoming", text="이번 라운드에 다른 여정 카드 2종을 냈다면, 내 턴 시작에 가장 약한 일반 아군을 회수하고 1장 뽑는다. 라운드당 한 번." }
B.Units.lo_55 = { id="lo_55", name="키클롭스", category="문학", journey=true, row="melee", power=6, ability="cyclops", text="같은 열의 다른 아군이 받을 첫 단일 공격을 대신 맞는다. 라운드당 한 번." }
B.Units.lo_56 = { id="lo_56", name="페넬로페", category="문학", journey=true, row="ranged", power=3, ability="unweave", text="낼 때: 상대가 예고한 말라카 기습 또는 촐라 포격 하나를 한 턴 늦춘다." }
B.Units.lo_57 = { id="lo_57", name="키르케", category="문학", journey=true, row="ranged", power=3, ability="pigHex", text="낼 때: 가장 강한 후열 일반 적을 전투력 1의 돼지로 바꾼다. 상대 다음 행동이 끝나면 해제." }
B.Units.lo_58 = { id="lo_58", name="세이렌", category="문학", journey=true, row="ranged", power=3, ability="sirenSong", text="낼 때: 상대 전열과 후열의 모든 유닛에 전투력 −1." }
B.Specials.lo_59 = { id="lo_59", name="이타카의 활", category="문학", journey=true, special="ithacaBow", maxCopies=1, text="가장 강한 상대 일반 유닛 한 장을 즉시 제거한다. 덱당 한 장." }

B.Units.ea_40 = { id="ea_40", name="제갈량", category="문학", row="ranged", power=3, ability="eastWind", lore="삼국지연의에서 동남풍을 빌었다는 장면", text="낼 때: 전열·후열의 악천후를 걷는다. 전장에 있는 동안 화공선이 후열의 가장 강한 일반 적에게 추가 피해 1." }
B.Units.ea_41 = { id="ea_41", name="주유", category="인물", row="ranged", power=4, ability="fireCommand", text="전장에 있는 동안 화공선이 전열의 가장 강한 일반 적에게 추가 피해 1을 준다." }
B.Specials.ea_42 = { id="ea_42", name="적벽의 화공선", category="사건", special="redCliffFire", text="가장 강한 상대 전열 일반 유닛 −2. 이번 판 황개가 귀환했다면 가장 강한 후열 유닛도 −2. 주유와 제갈량이 추가 공격을 돕는다." }

B.Units.eu_48 = { id="eu_48", name="달타냥", category="문학", row="melee", power=4, ability="dartagnan", text="다른 총사가 대신 맞으면 다음 내 턴에 상대 전열 일반 유닛 −2." }
B.Units.eu_49 = { id="eu_49", name="아토스", category="문학", row="melee", power=4, ability="musketeerGuard", text="같은 열 동료 총사가 받을 단일 공격을 대신 맞는다. 라운드당 한 번." }
B.Units.eu_50 = { id="eu_50", name="포르토스", category="문학", row="melee", power=5, ability="musketeerShield", text="같은 열 동료 총사가 받을 단일 공격을 대신 맞는다. 라운드당 한 번." }
B.Units.eu_51 = { id="eu_51", name="아라미스", category="문학", row="melee", power=3, ability="musketeerAid", text="낼 때: 같은 열 다른 총사에게 엄호." }
B.Units.eu_52 = { id="eu_52", name="하멜른의 피리꾼", category="문학", row="ranged", power=3, ability="piper", text="쥐 떼가 있으면 다음 내 턴에 상대 전열의 일반 유닛을 최대 두 장 후열로 유인한다. 라운드당 한 번." }
B.Units.eu_53 = { id="eu_53", name="하멜른의 쥐 떼", category="문학", row="melee", power=2, ability="rats", text="낼 때: 후열의 가장 약한 일반 적 하나를 전열로 유인한다." }
B.Specials.eu_54 = { id="eu_54", name="하멜른의 약속", category="문학", special="piperPact", text="덱 위 두 장에서 피리꾼이나 쥐 떼를 찾아 한 장 가져온다." }
B.Units.eu_55 = { id="eu_55", name="돈키호테", category="문학", row="melee", power=4, ability="quixote", text="낼 때: 상대 전열을 돌격해 가장 강한 일반 적 −2. 상대 풍차가 있으면 풍차에 돌격한다." }
B.Units.eu_56 = { id="eu_56", name="산초 판사", category="문학", row="ranged", power=3, ability="sancho", text="다음 내 턴에 살아 있는 아군 돈키호테를 손패로 회수한다. 라운드당 한 번." }
B.Units.eu_57 = { id="eu_57", name="풍차", category="문학", row="melee", power=3, ability="windmill", text="상대 돈키호테의 돌격을 끌어들인다." }
B.Units.eu_58 = { id="eu_58", name="로시난테", category="문학", row="melee", power=3, ability="rocinante", text="전장에 있으면 돈키호테의 돌격 피해가 1 늘어난다." }

B.Specials.eu_59 = { id="eu_59", name="루비콘 도하", category="서사", special="rubicon", text="후열의 가장 약한 일반 아군을 전열로 옮겨 +3. 이번 라운드에는 손패로 돌아갈 수 없다." }
B.Specials.eu_60 = { id="eu_60", name="젤라 전투", category="서사", special="zela", text="낼 때: 상대 후열에서 가장 강한 일반 유닛 −3." }
B.Units.ea_43 = { id="ea_43", name="도쿠가와 이에야스", category="서사", row="melee", power=4, ability="tokugawa", text="전장에 있으면 고바야카와가 내 전열로 넘어올 때 그에게 +2." }
B.Units.ea_44 = { id="ea_44", name="이시다 미쓰나리", category="서사", row="ranged", power=3, ability="ishida", text="낼 때: 상대 진영에서 넘어올 준비를 하는 가장 약한 일반 유닛 −2. 그런 적이 없으면 내 전열 아군 하나를 엄호." }
B.Units.ea_45 = { id="ea_45", name="고바야카와 히데아키", category="서사", row="melee", power=3, ability="defect", text="상대 전열에 들어가고 다음 내 턴까지 살아 있으면 내 전열로 넘어온다." }
B.Units.me_37 = { id="me_37", name="길가메시", category="서사", row="melee", power=5, ability="gilgamesh", text="낼 때: 엔키두가 전장에 있으면 서로 엄호한다." }
B.Units.me_38 = { id="me_38", name="엔키두", category="서사", row="melee", power=4, ability="enkidu", text="낼 때: 길가메시가 전장에 있으면 서로 엄호한다." }
B.Units.me_39 = { id="me_39", name="삼나무 숲의 훔바바", category="서사", row="melee", power=5, ability="humbaba", text="낼 때: 상대 전열의 가장 강한 일반 유닛을 공격해 전투력 −3." }
B.Specials.me_40 = { id="me_40", name="불사의 풀", category="서사", special="lifePlant", text="가장 약한 일반 아군의 전투력 감소를 회복하고 이동 제한과 강화 차단을 해제한다." }
B.Specials.me_41 = { id="me_41", name="하틴의 포위", category="서사", special="hattin", text="상대 전열의 가장 강한 일반 유닛 −2. 살라딘을 지도자로 골랐다면 대상은 자기 턴이 끝날 때까지 이동할 수 없다." }
B.Units.me_42 = { id="me_42", name="살라딘의 기병대", category="서사", row="melee", power=4, ability="saladinCavalry", text="낼 때: 이번 라운드에 하틴의 포위를 당했거나 이동 제한에 걸린 가장 강한 상대 전열 일반 유닛 −2." }

B.Units.sa_35 = { id="sa_35", name="박당강의 유인선", category="선박", row="ranged", power=3, ability="bachDangLure", text="낼 때: 상대 전열에서 이동 가능한 가장 약한 일반 유닛을 후열로 옮겨 유인 표식을 남긴다." }
B.Specials.sa_36 = { id="sa_36", name="박당강의 썰물", category="사건", special="bachDangTide", text="박당강의 말뚝이 아군 전장에 있으면, 후열에 남은 유인 대상 하나 −3 및 다음 행동까지 이동 제한. 말뚝과 공유해 라운드당 한 번." }

B.Units.nw_35 = { id="nw_35", name="산정 제단", category="전술", row="ranged", power=3, ability="mountainAltar", text="카파코차 의례를 치를 수 있게 한다." }
B.Specials.nw_36 = { id="nw_36", name="카파코차 의례", category="전술", special="capacocha", text="제단이 있으면 손패의 가장 오른쪽 카드 한 장 소멸. 아군 약화 해제, 카드 한 장 뽑기, 상대 일반 유닛 −3 중 하나가 무작위 발동." }
B.Units.nw_37 = { id="nw_37", name="아나콘다", category="동물", row="melee", power=3, ability="anaconda", text="낼 때: 가장 강한 상대 전열 일반 유닛을 다음 행동까지 이동하지 못하게 한다." }
B.Units.nw_38 = { id="nw_38", name="전기뱀장어", category="동물", row="ranged", power=3, ability="electricEel", text="상대가 홀로 있던 전열 일반 유닛에 일반 유닛을 추가하면 새 유닛 −1. 라운드당 한 번." }
B.Units.nw_39 = { id="nw_39", name="코만치 기병", category="병종", row="ranged", power=4, ability="comanche", text="후열에서 전열로 이동할 때 상대 전열 일반 유닛 하나 −2. 라운드당 한 번." }
B.Units.nw_40 = { id="nw_40", name="라코타 기병", category="병종", row="ranged", power=3, ability="lakota", text="상대 카드나 지도자 능력으로 약화된 전열 아군을 후열로 빼낸다. 라운드당 한 번." }
B.Units.nw_41 = { id="nw_41", name="아파치 정찰대", category="병종", row="ranged", power=3, ability="apache", text="낼 때: 상대의 예고 공격을 전투 기록에 표시하고, 가장 약한 이동 가능한 다른 아군을 반대 열로 옮긴다." }

B.Units.sa_37 = { id="sa_37", name="라푸라푸", category="인물", row="melee", power=4, ability="lapulapu", text="얕은 여울이 적 포격을 막았다면 다음 내 턴 시작에 가장 강한 상대 전열 일반 유닛 −3." }
B.Units.sa_38 = { id="sa_38", name="막탄 방어대", category="병종", row="melee", power=3, ability="mactanGuard", text="낼 때: 전열의 가장 약한 다른 일반 아군에 엄호. 대상이 없으면 자신을 엄호." }
B.Specials.sa_39 = { id="sa_39", name="막탄의 얕은 여울", category="사건", special="mactanShoal", text="이번 라운드에 다음 말라카 기습 또는 촐라 포격을 한 번 차단한다." }

B.Units.me_43 = { id="me_43", name="우르의 군기", category="서사", row="melee", power=3, ability="urStandard", text="전열에서는 전쟁 면, 후열에서는 평화 면. 전열에 배치되며 교대로 면을 바꾼다." }
B.Units.me_44 = { id="me_44", name="수메르 전차대", category="서사", row="melee", power=4, ability="urChariot", text="낼 때: 가장 강한 상대 전열 일반 유닛 −1. 군기가 전열에 있으면 −3." }
B.Specials.me_45 = { id="me_45", name="우르의 연회", category="서사", special="urFeast", text="전투력 감소가 가장 큰 일반 아군을 회복. 군기가 후열에 있으면 그 아군에 엄호." }
B.Units.sa_40 = { id="sa_40", name="가자 마다", category="서사", row="ranged", power=4, ability="gajahMada", text="전장에 있는 동안 이번 라운드에 처음 낸 이름이 다른 아군 함선마다 맹세 표식 1개." }
B.Specials.sa_41 = { id="sa_41", name="팔라파 맹세", category="서사", special="palapa", text="가자 마다가 있고 표식이 2개 이상이면 2개를 써서 후열 함선 최대 두 척을 전열로 옮기고 각각 +1." }

B.Units.af_37 = { id="af_37", name="아난시", category="전설", row="ranged", power=3, ability="anansi", lore="가나 아칸 설화에 등장하는 꾀 많은 거미", text="낼 때: 아직 발동하지 않은 상대 전술을 하나 훔친다. 말라카 기습 → 마자파힛 깃발 → 전열 매복 순." }

B.Units.af_38 = { id="af_38", name="람세스 2세", category="인물", row="melee", power=5, hero=true, ability="ramesses", text="전장에 있는 동안 이집트 전차대가 돌격하면 상대 후열 일반 유닛 한 장도 −1." }
B.Units.af_39 = { id="af_39", name="이집트 전차대", category="병종", row="melee", power=4, ability="egyptChariot", text="낼 때: 가장 강한 상대 전열 일반 유닛 −2. 람세스 2세가 있으면 후열 일반 유닛 한 장도 −1." }
B.Units.af_40 = { id="af_40", name="히타이트 전차대", category="병종", row="melee", power=4, ability="hittiteChariot", text="상대 행동으로 아군 열 점수가 내려가면 가장 강한 상대 전열 일반 유닛 −2. 라운드당 한 번." }
B.Specials.af_41 = { id="af_41", name="이집트·히타이트 평화조약", category="사건", special="kadeshTreaty", text="이번 라운드에 양쪽의 다음 전차대 반격 또는 철갑 함대 역습을 한 번씩 막는다." }

B.CardEnglish = {
	af_38 = { name="Ramesses II", text="While deployed, Egyptian Chariots also weaken an enemy ranged non-hero by 1." },
	af_39 = { name="Egyptian Chariots", text="Deploy: Weaken the strongest enemy melee non-hero by 2. With Ramesses II deployed, also weaken a ranged enemy by 1." },
	af_40 = { name="Hittite Chariots", text="Once per round, when an enemy action lowers an allied row score, weaken the strongest enemy melee non-hero by 2." },
	af_41 = { name="Egyptian–Hittite Peace Treaty", text="Block each side’s next chariot retaliation or Ironclad Fleet counter this round." },
	af_37 = { name="Anansi", text="Deploy: Steal one pending enemy tactic, in this order: Malacca Strike, Majapahit Flag, then melee Ambush." },
	me_43 = { name="Standard of Ur", text="Deploy in melee on the War side. Rotate into ranged to show Peace." },
	me_44 = { name="Sumerian Chariots", text="Deploy: Weaken the strongest enemy melee non-hero by 1, or by 3 with the Standard in melee." },
	me_45 = { name="Feast of Ur", text="Restore the ally with the largest power penalty. With the Standard in ranged, also give that ally cover." },
	sa_40 = { name="Gajah Mada", text="While deployed, gain one oath mark for each different allied ship played this round." },
	sa_41 = { name="Palapa Oath", text="With Gajah Mada deployed, spend 2 oath marks to move up to two ranged ships to melee and boost each by 1." },
	sa_37 = { name="Lapulapu", text="If Shallows blocked a bombardment, weaken the strongest enemy melee non-hero by 3 at your next turn start." },
	sa_38 = { name="Mactan Defenders", text="Deploy: Give your weakest other melee non-hero cover, or cover yourself if none is present." },
	sa_39 = { name="Mactan Shallows", text="Block the next Malacca strike or Chola bombardment this round." },
	nw_35 = { name="Mountain Altar", text="Enables the Capacocha Rite while on the board." },
	nw_36 = { name="Capacocha Rite", text="With an altar, banish the rightmost remaining card in hand. Randomly cleanse an ally, draw a card, or weaken the strongest enemy non-hero by 3." },
	nw_37 = { name="Anaconda", text="Deploy: Anchor the strongest enemy melee non-hero through its next action." },
	nw_38 = { name="Electric Eel", text="When a second enemy melee non-hero joins a lone unit, give the newcomer −1, once per round." },
	nw_39 = { name="Comanche Cavalry", text="When moving from ranged to melee, weaken one melee enemy non-hero by 2 once per round." },
	nw_40 = { name="Lakota Cavalry", text="After an enemy play or leader ability weakens a melee ally, pull it into ranged once per round." },
	nw_41 = { name="Apache Scouts", text="Deploy: Report pending enemy attacks and move your weakest other eligible ally to the other row." },
	sa_35 = { name="Bach Dang Decoy Boat", text="Deploy: Move the weakest eligible enemy melee non-hero to ranged and mark it as lured." },
	sa_36 = { name="Ebb Tide at Bach Dang", text="With Stakes deployed, weaken a marked enemy still in ranged by 3 and anchor it through its next action. Shares the Stakes trigger once per round." },
	eu_59 = { name="Crossing the Rubicon", text="Move your weakest eligible ranged non-hero to melee and boost by 3. It cannot be recalled this round." },
	eu_60 = { name="Battle of Zela", text="Deploy: Weaken the strongest enemy ranged non-hero by 3." },
	ea_43 = { name="Tokugawa Ieyasu", text="When Kobayakawa defects to your melee row, boost him by 2 if Tokugawa is deployed." },
	ea_44 = { name="Ishida Mitsunari", text="Deploy: Weaken one unit preparing to defect from your side by 2, or cover an allied melee unit." },
	ea_45 = { name="Kobayakawa Hideaki", text="Deploy in enemy melee. Defect to your own melee row next turn if still in play." },
	me_37 = { name="Gilgamesh", text="Deploy: If Enkidu is deployed, they cover each other." },
	me_38 = { name="Enkidu", text="Deploy: If Gilgamesh is deployed, they cover each other." },
	me_39 = { name="Humbaba of the Cedar Forest", text="Deploy: Weaken the strongest enemy melee non-hero by 3." },
	me_40 = { name="Plant of Life", text="Cleanse power penalties, movement lock and boost block from your weakest non-hero ally." },
	me_41 = { name="Encirclement at Hattin", text="Weaken the strongest enemy melee non-hero by 2. With Saladin as leader, it is also anchored through its turn." },
	me_42 = { name="Saladin’s Cavalry", text="Deploy: Weaken the strongest enemy melee non-hero that is anchored or was hit by Hattin this round by 2." },
	eu_48 = { name="D’Artagnan", text="When another musketeer intercepts, weaken an enemy melee unit by 2 on your next turn." },
	eu_49 = { name="Athos", text="Intercept a single attack on another musketeer in this row, once per round." },
	eu_50 = { name="Porthos", text="Intercept a single attack on another musketeer in this row, once per round." },
	eu_51 = { name="Aramis", text="Deploy: Give another musketeer in this row cover." },
	eu_52 = { name="Pied Piper of Hamelin", text="If rats are present, lure up to two enemy melee non-heroes into ranged at your next turn start, once per round." },
	eu_53 = { name="Hamelin Rats", text="Deploy: Lure the weakest eligible enemy ranged non-hero into melee." },
	eu_54 = { name="Hamelin’s Promise", text="Draw a Piper or Rats from your top two cards." },
	eu_55 = { name="Don Quixote", text="Deploy: Charge the strongest enemy melee non-hero for −2, or charge the enemy windmill if present." },
	eu_56 = { name="Sancho Panza", text="Recall a surviving allied Don Quixote at your turn start, once per round." },
	eu_57 = { name="Windmill", text="Redirect the opposing Don Quixote’s charge to this windmill." },
	eu_58 = { name="Rocinante", text="While deployed, Don Quixote’s charge deals 1 extra power loss." },
	ea_40 = { name="Zhuge Liang", text="Deploy: Clear weather on both rows. While deployed, Red Cliffs Fire Ships also weaken the strongest enemy ranged non-hero by 1." },
	ea_41 = { name="Zhou Yu", text="While deployed, Red Cliffs Fire Ships deal 1 extra power loss to the strongest enemy melee non-hero." },
	ea_42 = { name="Red Cliffs Fire Ships", text="Weaken the strongest enemy melee non-hero by 2. If Huang Gai returned this round, do the same to the strongest enemy ranged non-hero. Zhou Yu and Zhuge Liang add attacks." },
	lo_54 = { name="Odysseus", text="After two different journey cards this round, recall your weakest non-hero and draw one on your turn start, once per round." },
	lo_55 = { name="Cyclops", text="Intercept the first single-target attack on another ally in this row each round." },
	lo_56 = { name="Penelope", text="Deploy: Delay one pending Malacca strike or Chola bombardment by a turn." },
	lo_57 = { name="Circe", text="Deploy: Transform the strongest enemy ranged non-hero into a 1-power pig through its next action." },
	lo_58 = { name="Siren", text="Deploy: Weaken every enemy unit in both rows by 1." },
	lo_59 = { name="Bow of Ithaca", text="Immediately destroy the strongest enemy non-hero. One copy per deck." },
	lo_48 = { name="First Witch", text="Deploy: Weaken one enemy ranged non-hero by 1. Gather all three witches to summon a 4-power apparition next turn, once per round." },
	lo_49 = { name="Second Witch", text="Deploy: Block one enemy ranged non-hero’s first boost through its next action. Gather all three witches to summon a 4-power apparition next turn, once per round." },
	lo_50 = { name="Third Witch", text="Deploy: Give another witch in this row cover. Gather all three witches to summon a 4-power apparition next turn, once per round." },
	lo_51 = { name="Sun Wukong", text="Deploy: Weaken one enemy melee non-hero by 2. Gather all three disciples to rescue the weakest other ally next turn, once per round." },
	lo_52 = { name="Zhu Bajie", text="Deploy: Give your weakest other non-hero cover. Gather all three disciples to rescue the weakest other ally next turn, once per round." },
	lo_53 = { name="Sha Wujing", text="Deploy: Cleanse penalties, move restrictions and boost block from your weakest other non-hero. Gather all three disciples to rescue the weakest other ally next turn, once per round." },
	apparition = { name = "Prophetic Apparition" },
	lo_47 = { name="Doll’s Curse", text="Weaken the strongest enemy ranged non-hero by 2 and block its first boost through its next action." },
	sa_34 = { name="Bach Dang Stakes", text = "Once per round, give the enemy’s second consecutive non-hero in a row −2, or −4 if you have no non-heroes there. The grounded unit cannot move through its next turn." },
	af_36 = { name="Zulu Right Horn", text = "Gain +2 alongside the left horn. Joining the pair gives the strongest opposing non-hero in that row −2 once per round. The encircled unit cannot move through its next turn." },
	af_35 = { name="Zulu Left Horn", text = "Gain +2 alongside the right horn. Joining the pair gives the strongest opposing non-hero in that row −2 once per round. The encircled unit cannot move through its next turn." },
	me_36 = { name="Caravan Supplies", text = "If this survives the round, boost your first non-hero deployment in each row next round by 1. The supplied unit clears deployment penalties and restrictions." },
	ea_38 = { name="Sun Bin’s Feigned Retreat", text="When your action lowers your melee score, give the next enemy non-hero deployed in melee −3, once per round. Shaken blocks the target’s first boost through its next turn." },
	eu_46 = { name="Marathon Messenger", text="If still in melee at your next turn, move to ranged and give up to two other allies there +1." },
	me_35 = { name="Hammurabi’s Verdict", text="Seal the strongest enemy non-hero with an ability through the opponent’s next action." },
	ea_35 = { name="Han Xin’s River Formation", text="Give the next non-hero unit the opponent plays in melee −2." },
	eu_47 = { name="Archimedes’ Catapult", text="After you finish three turns by playing cards, give each non-hero ally in this row +2." },
	ea_36 = { name="Empty Fort Strategy", text = "On the next enemy non-hero deployment, rotate allies if ranged, or give the weakest ranged non-hero +1 if melee." },
	ea_37 = { name="Huang Gai’s Feigned Surrender", text="Deploy in enemy melee. If alive at the start of your next turn, return to your ranged row." },
	eu_01 = { name = "Caravel", lore = "A nimble Portuguese sailing vessel used for ocean exploration." },
	eu_02 = { name = "Carrack", lore = "A large sailing ship used for long-distance trade and voyages." },
	eu_03 = { name = "Galleon", lore = "A powerful Atlantic warship built to carry heavy broadside cannon." },
	eu_04 = { name = "Cog", lore = "A merchant vessel of medieval Northern Europe and the Baltic Sea." },
	eu_05 = { name = "Fluyt", lore = "A Dutch trading ship designed to carry large cargoes." },
	eu_06 = { name = "Frigate", lore = "A swift European warship suited to scouting and maneuver." },
	eu_07 = { name = "Brigantine", lore = "A versatile European sailing vessel with mixed rigging." },
	eu_08 = { name = "Pinnace", lore = "A light European vessel used for coastal journeys and dispatches." },
	eu_09 = { name = "Mediterranean Galley", lore = "An oared warship adapted to the enclosed Mediterranean Sea." },
	eu_10 = { name = "Ship of the Line", lore = "A heavily armed European battleship built for broadside combat." },
	eu_11 = { name = "Portuguese Mariners Astrolabe", lore = "A brass instrument used by Portuguese navigators to measure altitude at sea." },
	eu_12 = { name = "Murano Glass", lore = "Fine glassware crafted in the Venetian island workshops of Murano." },
	eu_13 = { name = "Spanish Real Coin", lore = "Silver currency circulated across the Spanish maritime empire." },
	eu_14 = { name = "Delft Blue Pottery", lore = "Blue-and-white ceramics associated with Dutch Delft." },
	eu_15 = { text = "When rotated back to melee after rotating out, gain +3 once per round.", name = "Roman Legionary Shield", lore = "A curved military shield associated with ancient Roman legions." },
	eu_16 = { name = "Celtic Gold Torc", lore = "A rigid gold neck ring made by ancient Celtic metalworkers." },
	eu_17 = { name = "Royal Navy Signal Flag", lore = "A naval signal flag used to convey orders between vessels." },
	eu_18 = { name = "European Bison", lore = "Europe's largest surviving wild land mammal." },
	eu_19 = { name = "Red Deer", lore = "A great stag found in European forests and highlands." },
	eu_20 = { name = "Golden Eagle", lore = "A powerful raptor soaring over the mountains of Europe." },
	eu_21 = { name = "European Brown Bear", lore = "A large bear inhabiting forests and mountain valleys." },
	eu_22 = { name = "Eurasian Lynx", lore = "A solitary wild cat of Europe's northern woodlands." },
	eu_23 = { name = "European Wolf", lore = "A pack-hunting canid of the European wilderness." },
	eu_24 = { name = "Stonehenge", lore = "Prehistoric standing stones on Salisbury Plain in Britain." },
	eu_25 = { name = "Colosseum", lore = "The great amphitheater built in ancient Rome." },
	eu_26 = { name = "The Alps", lore = "The high mountain chain spanning the heart of Europe." },
	eu_27 = { name = "Strait of Gibraltar", lore = "The narrow sea passage joining the Atlantic and the Mediterranean." },
	eu_28 = { name = "Venetian Canals", lore = "Waterways linking the islands and trading quarters of Venice.", text = "Once per round, give the first ally moving from melee to ranged +2." },
	eu_29 = { name = "Norwegian Fjords", lore = "Deep glacial inlets cut into Norway's rugged coast." },
	eu_30 = { name = "North Sea Fog", lore = "A blanket of sea fog that obscures the northern trade routes." },
	eu_31 = { name = "Hundred Years' War", lore = "A long war between England and France lasting over a century." },
	eu_32 = { name = "Age of Discovery", lore = "An era when Europe sailed far across the oceans to explore." },
	eu_33 = { name = "Industrial Revolution", lore = "A great change as steam and machines reshaped the world." },
	eu_34 = { name = "Gunpowder", lore = "An explosive powder that changed warfare across the world." },
	eu_35 = { name = "Compass", lore = "A tool that let sailors keep their bearing on the open sea." },
	eu_36 = { text = "Deploy: Restore the ally with the largest power penalty in this row. Weaken the strongest enemy melee non-hero by 2, or by 3 with Hundred Years’ War in this row. Then vanish.", name = "Joan of Arc", lore = "A young leader who rallied France during the Hundred Years' War." },
	eu_37 = { name = "Columbus", lore = "A navigator who crossed the Atlantic and reached the New World." },
	eu_38 = { name = "Duke of Wellington", lore = "The British general who defeated Napoleon at Waterloo." },
	eu_39 = { name = "Admiral Nelson", lore = "An admiral who won at Trafalgar with a galleon-descended fleet." },
	eu_40 = { text = "Rotation: Swap the oldest non-hero units in melee and ranged. Arrivals gain +2 in melee or +1 in ranged. The melee arrival also blocks up to 2 of its next power penalty.", name = "Pike Square", lore = "A dense infantry formation of pikes that stopped cavalry." },
	eu_41 = { text = "Give your weakest non-hero cover against up to 2 of its next power penalty.", name = "Armistice", lore = "An agreement that brought a war to a halt." },
	eu_42 = { text = "Weaken the strongest enemy melee non-hero by 2.", name = "Assassination", lore = "A covert strike aimed at a key figure." },
	eu_43 = { name = "Blockade", lore = "An operation that cuts off the routes of tech and supplies." },
	eu_44 = { text = "Last order: When you pass manually, boost your weakest non-hero unit by 3.", name = "Musket Regiment", lore = "An infantry regiment armed with gunpowder weapons." },
	eu_45 = { text = "Counter: If an enemy action lowers an allied row score, boost the weakest non-hero in another row by 2. Once per round. Armor blocks up to 2 of the first power penalty each round.", name = "Ironclad Fleet", lore = "A fleet of steel warships born of the Industrial Revolution." },
	ea_01 = { name = "Panokseon", lore = "A Korean naval warship with a wide upper deck and mounted cannon." },
	ea_02 = { name = "Turtle Ship", lore = "A Joseon fighting vessel known for its covered upper deck." },
	ea_03 = { name = "Joseon Segyeonseon", lore = "A Korean diplomatic vessel used for maritime journeys." },
	ea_04 = { name = "Ming Fuchuan", lore = "A sturdy Chinese seagoing ship with traditional junk rigging." },
	ea_05 = { name = "Ming Shachuan", lore = "A Chinese shallow-draft sailing vessel suited to coastal waters." },
	ea_06 = { name = "Chinese Junk", lore = "A traditional East Asian sailing ship with battened sails." },
	ea_07 = { name = "Ming Treasure Ship", lore = "A large vessel associated with Ming maritime expeditions." },
	ea_08 = { name = "Atakebune", lore = "A large Japanese warship of the Sengoku period." },
	ea_09 = { name = "Sekibune", lore = "A medium Japanese fighting vessel of the Sengoku period." },
	ea_10 = { name = "Kobaya", lore = "A small fast Japanese warship used for coastal raids." },
	ea_11 = { name = "Goryeo Celadon", lore = "Glazed Korean stoneware admired for its jade-green finish." },
	ea_12 = { name = "Joseon Moon Jar", lore = "A large rounded white porcelain vessel of Joseon Korea." },
	ea_13 = { name = "Ming Blue-and-White Porcelain", lore = "Chinese porcelain decorated in cobalt-blue patterns." },
	ea_14 = { name = "Japanese Lacquer Box", lore = "A decorated box finished with layers of Japanese lacquer." },
	ea_15 = { name = "Chinese Jade Bi Disc", lore = "A circular ritual jade object from ancient China." },
	ea_16 = { name = "Ryukyu Lacquerware", lore = "Decorated lacquer objects from the Ryukyu island kingdom." },
	ea_17 = { name = "Joseon Naval War Banner", lore = "A military standard carried by the Joseon fleet." },
	ea_18 = { name = "Siberian Tiger", lore = "A striped predator of northeastern Asian forests." },
	ea_19 = { name = "Giant Panda", lore = "The black-and-white bear native to central China." },
	ea_20 = { name = "Red-Crowned Crane", lore = "A tall crane associated with East Asian wetlands." },
	ea_21 = { name = "Japanese Macaque", lore = "A mountain-dwelling monkey native to Japan." },
	ea_22 = { name = "Musk Deer", lore = "A small antlerless deer of eastern Asian forests." },
	ea_23 = { name = "Golden Snub-Nosed Monkey", lore = "A distinctive mountain primate native to China." },
	ea_24 = { name = "Great Wall of China", lore = "A vast series of fortified walls across northern China." },
	ea_25 = { name = "Gyeongbokgung Palace", lore = "A royal palace built in Joseon-era Seoul." },
	ea_26 = { name = "Himeji Castle", lore = "A white-plastered Japanese fortress with layered roofs." },
	ea_27 = { name = "Huangshan Mountains", lore = "Granite peaks rising through cloud seas in China." },
	ea_28 = { name = "Mount Fuji", lore = "Japan's iconic volcanic mountain." },
	ea_29 = { name = "Mount Tai", lore = "A sacred mountain of northeastern China." },
	ea_30 = { name = "East China Sea Monsoon", lore = "Seasonal winds that shift the direction of East Asian sea routes." },
	ea_31 = { name = "Maritime Ban", lore = "An edict that closes the sea lanes and halts ship movement." },
	ea_32 = { name = "Zheng He's Voyages", lore = "Seven great Ming fleet voyages that reached the Indian Ocean." },
	ea_33 = { name = "Zheng He", lore = "The Ming admiral who led the great treasure voyages." },
	ea_34 = { name = "Gunpowder Weapons", lore = "Weapons that began in China and changed warfare in East Asia." },
	me_01 = { name = "Arabian Dhow", lore = "A traditional lateen-rigged wooden ship of the Arabian Sea." },
	me_02 = { name = "Baghlah", lore = "A large trading vessel of the Persian Gulf and Indian Ocean." },
	me_03 = { name = "Boom Dhow", lore = "A deep-sea cargo sailing ship of the Persian Gulf." },
	me_04 = { name = "Sambuk", lore = "A coastal trading dhow found along the Red and Arabian seas." },
	me_05 = { name = "Jalboot", lore = "A small traditional vessel of the Arabian Gulf." },
	me_06 = { name = "Ghanjah", lore = "An ornate sailing dhow used for Indian Ocean trade." },
	me_07 = { name = "Ottoman Galley", lore = "An Ottoman warship driven by both oars and sails." },
	me_08 = { name = "Xebec", lore = "A fast Mediterranean vessel fitted with lateen sails." },
	me_09 = { name = "Zaruq", lore = "A light traditional sailing craft of the Arabian coast." },
	me_10 = { name = "Battil", lore = "A slender trading boat used in Gulf waters." },
	me_11 = { name = "Persian Brass Astrolabe", lore = "A finely engraved astronomical measuring instrument." },
	me_12 = { name = "Iznik Tiles", lore = "Painted Ottoman ceramic tiles made in the town of Iznik." },
	me_13 = { name = "Damascus Steel Sword", lore = "A patterned blade associated with Middle Eastern metalworking." },
	me_14 = { name = "Persian Carpet", lore = "An intricately knotted textile from Persian workshops." },
	me_15 = { name = "Ottoman Ceramic Incense Burner", lore = "An ornate vessel designed to hold burning incense." },
	me_16 = { name = "Sasanian Silver Plate", lore = "A decorated silver dish from the ancient Sasanian realm." },
	me_17 = { name = "Ottoman Fleet Standard", lore = "A military banner flown by Ottoman naval forces." },
	me_18 = { name = "Dromedary Camel", lore = "A one-humped camel adapted to hot and arid lands." },
	me_19 = { name = "Arabian Oryx", lore = "A pale desert antelope with long straight horns." },
	me_20 = { name = "Arabian Sand Cat", lore = "A small desert cat adapted to sandy habitats." },
	me_21 = { name = "Persian Leopard", lore = "A powerful spotted cat of western Asian mountains." },
	me_22 = { name = "Arabian Wolf", lore = "A lean wolf adapted to the Arabian Peninsula." },
	me_23 = { name = "Arabian Tahr", lore = "A nimble wild goat of rocky Arabian highlands." },
	me_24 = { name = "Petra", lore = "An ancient city carved into sandstone cliffs in Jordan." },
	me_25 = { name = "Persepolis", lore = "The monumental ceremonial capital of ancient Persia." },
	me_26 = { name = "Cappadocia", lore = "A volcanic landscape famous for its carved rock formations." },
	me_27 = { name = "Strait of Hormuz", lore = "The narrow passage linking the Persian Gulf to the Arabian Sea." },
	me_28 = { name = "Rub al Khali Desert", lore = "Vast dunes covering the southern Arabian Peninsula." },
	me_29 = { name = "Ruins of Babylon", lore = "Remains of an ancient Mesopotamian city." },
	me_30 = { name = "Shamal Wind", lore = "A strong northwesterly wind sweeping across the Persian Gulf." },
	me_31 = { name = "Desert Raid", lore = "A raid on a caravan that seizes precious goods." },
	me_32 = { name = "Fall of Constantinople", lore = "The 1453 siege in which the Ottomans broke a great walled city." },
	me_33 = { name = "Mehmed II", lore = "The young Ottoman sultan who conquered Constantinople." },
	me_34 = { name = "Great Bombard", lore = "A huge bronze cannon built to batter city walls." },
	nw_01 = { name = "Caribbean War Canoe", lore = "A swift paddled fighting canoe used in the Caribbean." },
	nw_02 = { name = "Large Caribbean Canoe", lore = "A broad dugout vessel for coastal voyages and carrying cargo." },
	nw_03 = { name = "Maya Trading Canoe", lore = "A trading canoe used along Central American coasts and rivers." },
	nw_04 = { name = "Aztec War Canoe", lore = "A fighting canoe used on the lakes of central Mexico." },
	nw_05 = { name = "Inca Balsa Raft", lore = "A Pacific trading raft built from lightweight balsa logs." },
	nw_06 = { name = "Lake Titicaca Reed Boat", lore = "A traditional craft woven from reeds on a high Andean lake." },
	nw_07 = { name = "Amazon Dugout Canoe", lore = "A hollowed-log boat made for the Amazon waterways." },
	nw_08 = { name = "Mapuche Canoe", lore = "A traditional indigenous canoe of southern South America." },
	nw_09 = { name = "Inuit Kayak", lore = "A narrow Arctic craft used for travel and hunting." },
	nw_10 = { name = "Northwest Coast Cedar Canoe", lore = "A carved cedar canoe used by Pacific Northwest peoples." },
	nw_11 = { name = "Aztec Sun Stone", lore = "A monumental carved stone of the Mexica world." },
	nw_12 = { name = "Maya Jade Mask", lore = "A ceremonial face mask crafted from precious green jade." },
	nw_13 = { name = "Inca Quipu", lore = "An arrangement of knotted cords used to record information.", text = "After deployment, alternate rows over three consecutive non-hero plays to give the last unit +3, once per round." },
	nw_14 = { name = "Moche Gold Mask", lore = "An elaborate metal mask of ancient coastal Peru." },
	nw_15 = { name = "Olmec Colossal Head", lore = "A monumental stone head carved by the Olmec civilization." },
	nw_16 = { name = "Nazca Textile", lore = "A woven textile made by ancient artisans of coastal Peru." },
	nw_17 = { text = "Draw a non-hero unit from the top two cards of your deck.", name = "Andean Messenger Trumpet", lore = "A ceremonial horn used to sound signals across the Andes." },
	nw_18 = { text = "At your next turn start, weaken a lone enemy melee non-hero by 3, once per deployment.", name = "Jaguar", lore = "A powerful spotted cat of the tropical Americas." },
	nw_19 = { name = "Llama", lore = "A hardy domesticated camelid of the Andes." },
	nw_20 = { name = "American Bison", lore = "A massive grazing animal of North American grasslands." },
	nw_21 = { name = "Toucan", lore = "A tropical bird recognized by its large colorful bill." },
	nw_22 = { name = "Capybara", lore = "A large semi-aquatic rodent of South America." },
	nw_23 = { name = "Andean Condor", lore = "A great soaring bird of the high Andes." },
	nw_24 = { name = "Machu Picchu", lore = "An Inca stone citadel high in the Andes." },
	nw_25 = { text = "High ground: Once per round, protect your first ranged non-hero deployment from its first deployment penalty. Also resists weather.", name = "Chichen Itza", lore = "The monumental Maya city on the Yucatan Peninsula." },
	nw_26 = { name = "Teotihuacan", lore = "An ancient city with towering pyramids in central Mexico." },
	nw_27 = { text = "Move your weakest eligible melee non-hero to ranged.", name = "Amazon River", lore = "The vast river system that crosses northern South America." },
	nw_28 = { name = "Iguazu Falls", lore = "A mighty series of waterfalls on the South American borderlands." },
	nw_29 = { name = "Andes Mountains", lore = "The great mountain chain running along western South America." },
	nw_30 = { name = "Caribbean Hurricane", lore = "A fierce tropical cyclone that disrupts sailing and cannon fire." },
	nw_31 = { name = "Landslide", lore = "A disaster where a mountainside collapses over trails and ruins." },
	nw_32 = { text = "Draw 1 if your previous non-hero deployment this round was in the other row. Once per round, transfer 1 boost from an ally moving from melee to ranged to another ranged ally.", name = "Inca Road System", lore = "Roads that tied the empire together across the Andes." },
	nw_33 = { name = "Inca Expansion", lore = "An era when roads and way stations united the Andes." },
	nw_34 = { name = "Atahualpa", lore = "The last emperor of the Inca Empire." },
	af_01 = { name = "Swahili Mtepe", lore = "A traditional sewn-plank sailing vessel of East Africa." },
	af_02 = { name = "Zanzibar Dhow", lore = "A trade vessel crossing between the Swahili coast and Indian Ocean ports." },
	af_03 = { name = "Nile Felucca", lore = "A small lateen-sailed boat used on the Nile River." },
	af_04 = { name = "Nile Papyrus Boat", lore = "An ancient Egyptian craft bound from papyrus reeds." },
	af_05 = { name = "Nubian Sailboat", lore = "A traditional sailing vessel associated with the Nile Valley." },
	af_06 = { name = "Senegal Pirogue", lore = "A long narrow fishing canoe of the West African coast." },
	af_07 = { name = "Gulf of Guinea War Canoe", lore = "A large paddled fighting canoe of West Africa." },
	af_08 = { name = "Congo River Canoe", lore = "A dugout craft used along the great Congo River." },
	af_09 = { name = "Madagascar Outrigger Canoe", lore = "A canoe stabilized by an outrigger float." },
	af_10 = { name = "East African Trading Dhow", lore = "A sailing vessel serving the Indian Ocean trade routes." },
	af_11 = { name = "Benin Bronze Plaque", lore = "A cast metal relief made by the royal artisans of Benin." },
	af_12 = { name = "Ashanti Goldweight", lore = "A small brass weight used in Akan gold trading." },
	af_13 = { name = "Ethiopian Stone Cross", lore = "A carved Christian stone cross from Ethiopian highlands." },
	af_14 = { name = "Egyptian Papyrus Scroll", lore = "An ancient writing scroll made from papyrus." },
	af_15 = { name = "Yoruba Beaded Crown", lore = "A ceremonial crown decorated with intricate beadwork." },
	af_16 = { name = "Nubian Gold Ornament", lore = "A gold adornment made in the kingdoms of Nubia." },
	af_17 = { name = "Ashanti Ceremonial Drum", lore = "A decorated drum used in Akan ceremonies." },
	af_18 = { text = "Deploy: Give another Savanna animal in this row cover, or cover yourself.", name = "African Elephant", lore = "The giant long-tusked elephant of the African savanna." },
	af_19 = { text = "Deploy: Weaken the strongest enemy melee non-hero by 2, or 3 if another allied Savanna animal is deployed.", name = "African Lion", lore = "A powerful big cat of the African grasslands." },
	af_20 = { text = "Deploy: Draw one Savanna animal from the top two cards of your deck.", name = "Giraffe", lore = "A tall browsing mammal with a long neck and spotted coat." },
	af_21 = { name = "Hippopotamus", lore = "A massive semi-aquatic animal found in African rivers." },
	af_22 = { name = "Black Rhinoceros", lore = "A hook-lipped rhinoceros native to Africa." },
	af_23 = { text = "Deploy: If another Savanna animal shares this row, give it and this unit +1.", name = "Zebra", lore = "A striped equid of the African grasslands." },
	af_24 = { name = "Pyramids of Giza", lore = "The great royal tombs built beside ancient Memphis." },
	af_25 = { name = "Great Zimbabwe", lore = "The monumental stone ruins of a southern African city." },
	af_26 = { name = "Victoria Falls", lore = "An immense waterfall on the Zambezi River." },
	af_27 = { name = "Sahara Desert", lore = "A vast desert stretching across North Africa." },
	af_28 = { name = "Mount Kilimanjaro", lore = "A towering volcanic mountain of East Africa." },
	af_29 = { name = "Benguela Current", lore = "A cold ocean current flowing along southwestern Africa." },
	af_30 = { name = "Harmattan Wind", lore = "A dry dusty wind blowing across West Africa." },
	af_31 = { name = "Tomb Robbing", lore = "The crime of stealing treasure from tombs and ruins." },
	af_32 = { name = "Sahara Caravan", lore = "Camel trains that crossed the desert carrying gold and salt." },
	af_33 = { name = "Rise of Mali", lore = "An era when gold and salt trade made West Africa wealthy." },
	af_34 = { name = "Ahmed Baba", lore = "A scholar of Timbuktu famed across West Africa." },
	sa_01 = { name = "Malay Prau", lore = "A swift outrigger sailing boat of the Malay seas." },
	sa_02 = { name = "Chola Warship", lore = "A large South Indian naval vessel that reached Southeast Asia." },
	sa_03 = { name = "Arab Dhow", lore = "A lateen-sail trade ship that rode the monsoon across the ocean." },
	sa_04 = { name = "Chinese Junk", lore = "A big sailing ship known for its battened sails and bulkheads." },
	sa_05 = { name = "Korakora War Canoe", lore = "An oared war vessel of the Philippine and Maluku waters." },
	sa_06 = { name = "Malabar Cutter", lore = "A fast trade and anti-pirate ship of the south Indian coast." },
	sa_07 = { name = "Mughal Merchantman", lore = "A trading ship that sailed from Gujarati ports for the Mughals." },
	sa_08 = { name = "Great Barge", lore = "A flat-bottomed barge that carried supplies along rivers and canals." },
	sa_09 = { name = "Spice Armada", lore = "A huge fleet carrying cloves and pepper across the sea." },
	sa_10 = { name = "Angkor Bronze Bell", lore = "A large bell that once rang in Khmer temples." },
	sa_11 = { name = "Blue-and-White Porcelain", lore = "Blue patterned ceramics spread along the sea routes." },
	sa_12 = { name = "Pepper Sacks", lore = "The valuable black pepper of the Malabar coast." },
	sa_13 = { name = "Clove Chest", lore = "A precious spice that grew only in the Maluku islands." },
	sa_14 = { name = "Hindu Bronze Statue", lore = "A bronze statue of a dancing god made by South Indian artisans." },
	sa_15 = { text = "The next allied non-hero destroyed by the enemy this round calls a reinforcement into its row.", name = "Majapahit Banner", lore = "A great banner raised to rally an island empire." },
	sa_16 = { name = "Indian Elephant", lore = "A huge elephant used in war and for carrying loads." },
	sa_17 = { name = "Bengal Tiger", lore = "A fierce big cat of the Ganges delta." },
	sa_18 = { name = "Komodo Dragon", lore = "A giant lizard that lives on islands of Indonesia." },
	sa_19 = { name = "Indian Rhinoceros", lore = "A large beast that guards itself with thick hide." },
	sa_20 = { name = "Orangutan", lore = "A red ape of the forests of Borneo and Sumatra." },
	sa_21 = { name = "Indian Peafowl", lore = "A showy feathered bird of South Asia." },
	sa_22 = { name = "Angkor Wat", lore = "A vast Hindu temple built by the Khmer Empire." },
	sa_23 = { name = "Borobudur", lore = "A massive Buddhist temple on the island of Java." },
	sa_24 = { text = "At the start of your next turn, weaken the strongest enemy ranged non-hero by 3.", name = "Strait of Malacca", lore = "The narrow sea lane linking the Indian Ocean and the Pacific." },
	sa_25 = { name = "Monsoon Rains", lore = "Seasonal storms that batter the sea lanes of the region." },
	sa_26 = { name = "Ha Long Bay", lore = "A Vietnamese bay with limestone peaks rising from the sea." },
	sa_27 = { name = "Taj Mahal", lore = "A white marble mausoleum built by a Mughal emperor." },
	sa_28 = { name = "Spice Trade", lore = "The flow of spices that reshaped world commerce." },
	sa_29 = { name = "Sultan of Malacca", lore = "The ruler of a maritime kingdom that held the Malacca Strait." },
	sa_30 = { name = "Spice Monopoly", lore = "A scheme to seize control of the routes that carry tech and goods." },
	sa_31 = { name = "Monsoon Navigation", lore = "Knowledge of reading the monsoon winds to cross the Indian Ocean." },
	sa_32 = { name = "Chola Naval Expedition", lore = "A Chola fleet crossed the Bay of Bengal to strike Southeast Asian ports." },
	sa_33 = { name = "Rajendra I", lore = "A king who widened Chola influence through naval expeditions." },
	lo_01 = { name = "Atlantis", lore = "A legendary island nation said to have sunk beneath the sea." },
	lo_02 = { name = "Land of Mu", lore = "A lost continent said to lie beneath the Pacific." },
	lo_03 = { name = "El Dorado", lore = "A city of gold hidden deep in the South American jungle." },
	lo_04 = { name = "Lemuria", lore = "A legendary land once said to lie in the Indian Ocean." },
	lo_05 = { name = "Shangri-La", lore = "A hidden paradise from tales set deep in the mountains." },
	lo_06 = { name = "Tower of Babel", lore = "A tale of a tower raised to touch the sky." },
	lo_07 = { name = "Lost Colony of Roanoke", lore = "A colony that vanished without a trace." },
	lo_08 = { name = "Kingdom of Prester John", lore = "A rumored Christian kingdom far in the East." },
	lo_09 = { name = "Secrets of Meroe", lore = "Tales of a forgotten civilization's ruins." },
	lo_10 = { name = "Moai of Easter Island", lore = "Giant stone statues whose makers and purpose remain unclear." },
	lo_11 = { name = "Hidden Vault of Machu Picchu", lore = "Tales of treasure hidden in Inca ruins." },
	lo_12 = { name = "Derinkuyu Underground City", lore = "An ancient city hidden deep underground." },
	lo_13 = { name = "Temple Guardian Statue", lore = "A stone guardian said to watch over a forgotten temple." },
	lo_14 = { name = "Kraken", lore = "A giant sea monster said to drag whole ships under." },
	lo_15 = { name = "Dragon", lore = "A great winged beast that breathes fire." },
	lo_16 = { name = "Phoenix", lore = "A bird of flame said to be reborn from its ashes." },
	lo_17 = { name = "Sea Serpent", lore = "A giant serpent said to bar sailors' paths." },
	lo_18 = { name = "Mermaid", lore = "A sea being said to enchant sailors with song." },
	lo_19 = { name = "Griffin", lore = "A sky guardian with an eagle's head and lion's body." },
	lo_20 = { name = "Hippocampus Rider", lore = "A legendary steed that rides the waves." },
	lo_21 = { name = "Flying Dutchman", lore = "A cursed ship said to sail the seas forever." },
	lo_22 = { name = "Song of the Sirens", lore = "A song that pulls at the hearts of all who hear it." },
	lo_23 = { name = "Ancient Giant", lore = "A giant from old tales who stands like a mountain." },
	lo_24 = { name = "Mist Spirit", lore = "A being that clouds the way within the fog." },
	lo_25 = { name = "Excalibur", lore = "The sword Arthur receives from the Lady of the Lake." },
	lo_26 = { text = "Echo: Copy the last non-Echo tactic the opponent played this round.", name = "Philosopher's Stone", lore = "An alchemical substance said to transmute metals into gold and produce an elixir of life." },
	lo_27 = { name = "Cursed Fog", lore = "A thick fog that dims sight and saps strength." },
	lo_28 = { name = "Firestorm", lore = "A storm that turns the sky red." },
	lo_29 = { name = "Abyssal Whirlpool", lore = "A vast whirlpool that swallows everything." },
	lo_30 = { name = "Mystic Lantern", lore = "A light that shows the way in darkness." },
	lo_46 = { text = "Legacy: When removed by the opponent, boost the weakest non-hero in this row by 2.", name = "Mjolnir", lore = "The hammer wielded by Thor, the Norse god of thunder." },
}

-- 두목 전용 영웅: 두목을 쓰러뜨린 뒤 보상 후보에만 나온다 (일반 뽑기에는 나오지 않는다)
B.Units.boss_kraken = { id = "boss_kraken", name = "크라켄의 촉수", row = "cannon", power = 8, weapon = "cannon", hero = true }
B.Units.boss_serpent = { id = "boss_serpent", name = "바다뱀의 이빨", row = "melee", power = 8, weapon = "spear", hero = true }
B.Units.boss_siren = { id = "boss_siren", name = "세이렌의 노래", row = "ranged", power = 5, weapon = "gun", hero = true, ability = "spy" }
B.StorySeries = {}
for _, story in {
	{ "박당강 전투", "Bach Dang", "sa_34", "sa_35", "sa_36" },
	{ "막탄 전투", "Mactan", "sa_37", "sa_38", "sa_39" },
	{ "마자파힛", "Majapahit", "sa_15", "sa_40", "sa_41" },
	{ "적벽대전", "Red Cliffs", "ea_37", "ea_40", "ea_41", "ea_42" },
	{ "세키가하라", "Sekigahara", "ea_43", "ea_44", "ea_45" },
	{ "달타냥과 삼총사", "The Three Musketeers", "eu_48", "eu_49", "eu_50", "eu_51" },
	{ "하멜른", "Hamelin", "eu_52", "eu_53", "eu_54" },
	{ "돈키호테", "Don Quixote", "eu_55", "eu_56", "eu_57", "eu_58" },
	{ "카이사르", "Caesar", "eu_59", "eu_60" },
	{ "오를레앙 구원", "Relief of Orleans", "eu_31", "eu_36" },
	{ "길가메시", "Gilgamesh", "me_37", "me_38", "me_39", "me_40" },
	{ "우르", "Ur", "me_43", "me_44", "me_45" },
	{ "살라딘과 하틴", "Saladin at Hattin", "saladin", "me_41", "me_42" },
	{ "아난시 설화", "Tales of Anansi", "af_37" },
	{ "함대 연쇄포격", "Fleet Volley", "elizabeth", "eu_03" },
	{ "카데시", "Kadesh", "af_38", "af_39", "af_40", "af_41" },
	{ "사바나", "Savanna", "af_18", "af_19", "af_20", "af_23" },
	{ "잉카 의례", "Inca Rite", "nw_35", "nw_36" },
	{ "아마존 동물", "Amazon Wildlife", "nw_18", "nw_37", "nw_38" },
	{ "북미 기동", "North American Maneuvers", "nw_39", "nw_40", "nw_41" },
	{ "맥베스", "Macbeth", "lo_48", "lo_49", "lo_50" },
	{ "서유기", "Journey to the West", "lo_51", "lo_52", "lo_53" },
	{ "오디세우스의 귀환", "Odysseus Returns", "lo_54", "lo_55", "lo_56", "lo_57", "lo_58", "lo_59" },
} do
	for i = 3, #story do B.StorySeries[story[i]] = story end
end
-- 역사 인용문 대신 캐릭터와 발동 상황에 맞춘 게임 내 창작 대사.
B.CardLines = {
	ea_37 = { "돌아왔다. 이제 불을 올려.", "I’m back. Now light the fires." },
	ea_40 = { "바람이 돌아섰어. 지금이다.", "The wind has turned. Now." },
	ea_45 = { "내 깃발은 저쪽에 선다.", "My banner goes to the other side." },
	eu_48 = { "동료를 건드렸으니, 이젠 내 차례야.", "You struck my friend. Now it’s my turn." },
	eu_52 = { "피리 소리를 따라와.", "Follow the sound of my pipe." },
	eu_55 = { "산초, 저 거인이 보이느냐?", "Sancho, do you see that giant?" },
	eu_59 = { "건너면 물러설 길은 없다.", "Once across, there is no turning back." },
	me_37 = { "엔키두, 네 곁은 내가 지킬게.", "Enkidu, I will guard your flank." },
	me_43 = { "군기를 돌려라. 전쟁의 면이다.", "Turn the standard. Show the face of war." },
	me_42 = { "포위망이 닫힌다. 기병대, 앞으로.", "The ring is closing. Cavalry, forward." },
	saladin = { "그를 풀어 주어라. 살아 돌아가게.", "Release him. Let him return alive." },
	cyrus = { "결박을 풀어라. 대열로 돌아가게.", "Undo the bonds. Let them rejoin the ranks." },
	af_38 = { "전차대, 내 깃발을 따라라.", "Chariots, follow my standard." },
	af_37 = { "그 계획, 내가 먼저 써도 되겠지?", "You won’t mind if I use that plan first, will you?" },
	af_19 = { "풀숲이 흔들리면 이미 늦었다.", "When the grass stirs, it is already too late." },
	nw_36 = { "봉헌을 마쳤다. 이제 징조를 기다려.", "The offering is made. Now we await the omen." },
	nw_18 = { "혼자 남은 발소리가 들린다.", "One set of footsteps remains." },
	nw_39 = { "전열이 열렸다. 달려!", "The front is open. Ride!" },
	sa_37 = { "포성이 멎었다. 이제 우리가 간다.", "The guns have fallen silent. Now we go." },
	sa_40 = { "함대가 모이면 맹세를 지킨다.", "When the fleet gathers, we fulfill the oath." },
	lo_48 = { "셋이 모이면, 솥이 답하리라.", "When three gather, the cauldron will answer." },
	lo_51 = { "사오정, 저팔계! 다친 동료부터 챙겨.", "Sha Wujing, Bajie! Get the wounded first." },
	lo_54 = { "멀리 돌아왔지만, 이타카에 닿았다.", "It was a long way round, but Ithaca is home." },
	eu_36 = { "길을 열겠어. 다친 이들을 데려와.", "I will clear the way. Bring the wounded." },
	sa_36 = { "물이 빠졌다. 지금이야!", "The tide is out. Now!" },
	elizabeth = { "함대, 차례로 포격!", "Fleet, fire in succession!" },
}

B.Factions = {
	europe = { id = "europe", name = "유럽 연합", passive = "판을 이기면 카드 한 장을 더 뽑는다", leader = "napoleon", specialty = "선박", leaders = { "napoleon", "caesar", "alexander", "charlemagne", "elizabeth" },
		roster = {"eu_01", "eu_02", "eu_03", "eu_04", "eu_05", "eu_06", "eu_07", "eu_08", "eu_09", "eu_10", "eu_11", "eu_12", "eu_13", "eu_14", "eu_15", "eu_16", "eu_17", "eu_18", "eu_19", "eu_20", "eu_21", "eu_22", "eu_23", "eu_24", "eu_25", "eu_26", "eu_27", "eu_28", "eu_29", "eu_30", "eu_31", "eu_32", "eu_33", "eu_34", "eu_35", "eu_36", "eu_37", "eu_38", "eu_39", "eu_40", "eu_41", "eu_42", "eu_43", "eu_44", "eu_45", "eu_46", "eu_47", "eu_48", "eu_49", "eu_50", "eu_51", "eu_52", "eu_53", "eu_54", "eu_55", "eu_56", "eu_57", "eu_58", "eu_59", "eu_60"} },
	east_asia = { id = "east_asia", name = "동아시아", passive = "첫 판 선공, 사기 효과가 2배", leader = "genghis", specialty = "유물", leaders = { "genghis", "qinshi", "nobunaga", "yisunsin" },
		roster = {"ea_01", "ea_02", "ea_03", "ea_04", "ea_05", "ea_06", "ea_07", "ea_08", "ea_09", "ea_10", "ea_11", "ea_12", "ea_13", "ea_14", "ea_15", "ea_16", "ea_17", "ea_18", "ea_19", "ea_20", "ea_21", "ea_22", "ea_23", "ea_24", "ea_25", "ea_26", "ea_27", "ea_28", "ea_29", "ea_30", "ea_31", "ea_32", "ea_33", "ea_34", "ea_35", "ea_36", "ea_37", "ea_38", "ea_40", "ea_41", "ea_42", "ea_43", "ea_44", "ea_45"} },
	new_world = { id = "new_world", name = "신대륙", passive = "점수가 같으면 우리가 판을 이기고, 첩자는 카드 3장, 시작 손패 +1", leader = "pachacuti", specialty = "동물", leaders = { "pachacuti", "montezuma", "sittingbull" },
		roster = {"nw_01", "nw_02", "nw_03", "nw_04", "nw_05", "nw_06", "nw_07", "nw_08", "nw_09", "nw_10", "nw_11", "nw_12", "nw_13", "nw_14", "nw_15", "nw_16", "nw_17", "nw_18", "nw_19", "nw_20", "nw_21", "nw_22", "nw_23", "nw_24", "nw_25", "nw_26", "nw_27", "nw_28", "nw_29", "nw_30", "nw_31", "nw_32", "nw_33", "nw_34", "nw_35", "nw_36", "nw_37", "nw_38", "nw_39", "nw_40", "nw_41"} },
	middle_east = { id = "middle_east", name = "중동", passive = "판이 끝나도 점수 5 이하의 가장 센 일반 카드 하나가 남는다", leader = "saladin", specialty = "지형·원더", leaders = { "saladin", "suleiman", "cyrus" },
		roster = {"me_01", "me_02", "me_03", "me_04", "me_05", "me_06", "me_07", "me_08", "me_09", "me_10", "me_11", "me_12", "me_13", "me_14", "me_15", "me_16", "me_17", "me_18", "me_19", "me_20", "me_21", "me_22", "me_23", "me_24", "me_25", "me_26", "me_27", "me_28", "me_29", "me_30", "me_31", "me_32", "me_33", "me_34", "me_35", "me_36", "me_37", "me_38", "me_39", "me_40", "me_41", "me_42", "me_43", "me_44", "me_45"} },
	southeast_asia = { id = "southeast_asia", name = "남·동남아", passive = "시작 손패가 한 장 더 많다", leader = "rajaraja", specialty = "동물", leaders = { "rajaraja", "tranhungdao", "akbar" },
		roster = {"sa_01", "sa_02", "sa_03", "sa_04", "sa_05", "sa_06", "sa_07", "sa_08", "sa_09", "sa_10", "sa_11", "sa_12", "sa_13", "sa_14", "sa_15", "sa_16", "sa_17", "sa_18", "sa_19", "sa_20", "sa_21", "sa_22", "sa_23", "sa_24", "sa_25", "sa_26", "sa_27", "sa_28", "sa_29", "sa_30", "sa_31", "sa_32", "sa_33", "sa_34", "sa_35", "sa_36", "sa_37", "sa_38", "sa_39", "sa_40", "sa_41"} },
	lost = { id = "lost", name = "미지의 땅", passive = "판을 지면 다음 판에 카드를 두 장 더 뽑는다", leader = "clear",
		roster = {"lo_01", "lo_02", "lo_03", "lo_04", "lo_05", "lo_06", "lo_07", "lo_08", "lo_09", "lo_10", "lo_11", "lo_12", "lo_13", "lo_14", "lo_15", "lo_16", "lo_17", "lo_18", "lo_19", "lo_20", "lo_21", "lo_22", "lo_23", "lo_24", "lo_25", "lo_26", "lo_27", "lo_28", "lo_29", "lo_30", "lo_46", "lo_47", "lo_48", "lo_49", "lo_50", "lo_51", "lo_52", "lo_53", "lo_54", "lo_55", "lo_56", "lo_57", "lo_58", "lo_59"} },
	africa = { id = "africa", name = "아프리카", passive = "시작 손패가 한 장 더 많다", leader = "mansa", specialty = "지형·원더", leaders = { "mansa", "hannibal", "shaka" },
		roster = { "af_01", "af_02", "af_03", "af_04", "af_05", "af_06", "af_07", "af_08", "af_09", "af_10", "af_11", "af_12", "af_13", "af_14", "af_15", "af_16", "af_17", "af_18", "af_19", "af_20", "af_21", "af_22", "af_23", "af_24", "af_25", "af_26", "af_27", "af_28", "af_29", "af_30", "af_31", "af_32", "af_33", "af_34", "af_35", "af_36", "af_37", "af_38", "af_39", "af_40", "af_41" } },
}
B.FactionOrder = { "europe", "east_asia", "new_world", "middle_east", "southeast_asia", "africa", "lost" }
-- 설화·소설 카드는 기존 ID로 저장하되 중립 기본 목록과 보상에서 다룬다.
local neutralStoryCards = {
	eu_46 = true,
	eu_48 = true, eu_49 = true, eu_50 = true, eu_51 = true,
	eu_52 = true, eu_53 = true, eu_54 = true,
	eu_55 = true, eu_56 = true, eu_57 = true, eu_58 = true,
	ea_36 = true,
	me_37 = true, me_38 = true, me_39 = true, me_40 = true,
	af_37 = true,
}
function B.cardRegionPrefix(id: string): string?
	if neutralStoryCards[id] then return "lo" end
	return string.match(id, "^(%a%a)_%d%d$")
end
for _, factionId in B.FactionOrder do
	if factionId == "lost" then continue end
	local roster = B.Factions[factionId].roster
	local regional = {}
	for _, id in roster do
		if neutralStoryCards[id] then table.insert(B.Factions.lost.roster, id)
		else table.insert(regional, id) end
	end
	B.Factions[factionId].roster = regional
end

-- 기본덱의 빈 역할을 병종과 소재에 맞춰 채운다. 기존 능력·연쇄·합치기는 유지한다.
local starterRoles = {
	eu_03 = "armadaGalleon",
	eu_44 = "coverFire",
	me_11 = "survey",
	me_13 = "pierce",
	af_32 = "evacuate",
	nw_04 = "raid",
	sa_02 = "bombard",
	sa_10 = "reinforce",
}
B.StarterText = {
	armadaGalleon = { "엘리자베스 1세가 연쇄포격을 발동할 때 후열에 있으면 상대 전열 한 장도 −1.", "Elizabeth I’s Fleet Volley also strikes an enemy melee non-hero for 1 while this card is in ranged." },
	coverFire = { "교대로 후열에 도착할 때: 상대 전열 일반 유닛 하나 −2.", "On rotating into ranged: Weaken one enemy melee non-hero by 2." },
	survey = { "낼 때: 덱 위 두 장 중 기본 전투력이 높은 카드를 가져온다.", "Deploy: Draw the higher-base-power card of your top two." },
	pierce = { "낼 때: 상대 전열 일반 유닛 하나의 보호를 벗기고 −2.", "Deploy: Strip protection from one enemy melee non-hero and weaken it by 2." },
	evacuate = { "낼 때: 약화된 아군 한 장을 손패로 회수한다.", "Deploy: Return one weakened ally to hand." },
	raid = { "매 내 턴 시작: 상대 전열 일반 유닛 하나 −1. 최대 두 번.", "Your turn start: Weaken one melee enemy by 1, up to twice." },
	bombard = { "다음 내 턴 시작: 후열의 상대 일반 유닛 하나 −3.", "Next turn start: Weaken one ranged enemy by 3." },
	reinforce = { "같은 열 아군이 적에게 처음 제거될 때: 전투력 2 지원병 소환.", "First allied destruction by the enemy in this row: Summon a 2-power reinforcement." },
	vanguard = { "낼 때: 상대 전열 일반 유닛 하나 −1.", "Deploy: Weaken one enemy melee non-hero by 1." },
	rearGuard = { "낼 때: 같은 열 다른 일반 아군 한 장에 첫 약화 2까지 막는 엄호.", "Deploy: Give another non-hero in this row cover against up to 2 of its next penalty." },
	rally = { "낼 때: 같은 열 다른 일반 아군 한 장 +1.", "Deploy: Boost another non-hero in this row by 1." },
	mobilize = { "낼 때: 아군 열이 비어 있으면 이 카드 +1.", "Deploy: Gain 1 if your other row is empty." },
}
for _, factionId in B.FactionOrder do
	if factionId == "lost" then continue end
	for _, id in B.Factions[factionId].roster do
		local card = B.Units[id]
		if card then
			card.starterRole = starterRoles[id]
			if id == "me_11" then card.ability = nil end
			if not (card.starterRole or card.ability or card.cause or card.fuse or card.hero) then
				card.starterRole = if card.category == "병종" then (if lane(card) == "melee" then "vanguard" else "rearGuard")
					elseif card.category == "지형·원더" then "rearGuard"
					elseif card.category == "선박" or card.category == "동물" then "mobilize" else "rally"
			end
		end
	end
end

B.NationFaction = {
	england = "europe", netherlands = "europe", france = "europe", denmark = "europe", sweden = "europe", venice = "europe", spain = "europe", portugal = "europe",
	ottoman = "middle_east", swahili = "africa",
	japan = "east_asia", china = "east_asia", korea = "east_asia",
	malabar = "southeast_asia", new_spain = "new_world",
}
function B.factionOf(nationId)
	return B.NationFaction[nationId or ""] or "europe"
end

local function shuffle(list, rng)
	for i = #list, 2, -1 do
		local j = math.floor(rng() * i) + 1
		list[i], list[j] = list[j], list[i]
	end
	return list
end

-- 내 덱: 기본 부대 + 게임에서 얻은 카드(deckCards = view.deck.cards)가 영웅·특수 카드가 된다
-- book = { ids = 덱 카드 id 목록, tier = { id → 1~3 } } 이면 그 덱을 쓴다 (수집책). 부대는 단계마다 점수 +1.
function B.playerDeck(deckCards, rng, factionId, book)
	local out = {}
	local fac = B.Factions[factionId or ""]
	for _, id in (if book and book.ids then book.ids elseif fac then fac.roster else BASE_ROSTER) do
		local def = B.Units[id] or B.Specials[id]
		if not def then continue end
		local card = copy(def)
		local tier = book and book.tier and book.tier[id] or 1
		if tier > 1 and card.power and not card.hero then
			card.power += tier - 1
		end
		card.tier = tier
		if fac and fac.specialty and card.category == fac.specialty and card.power and not card.hero then
			card.power += 1 -- 대륙 특징: 그 대륙의 대표 분류 카드는 조금 더 강하다
		end
		table.insert(out, card)
	end
	local leader = if fac then fac.leader else "draw"
	if fac and fac.leaders and book and book.leader and table.find(fac.leaders, book.leader) then
		leader = book.leader
	end
	for i, c in deckCards or {} do
		local id = SKILL_CARD[c.skill]
		if id then
			local def = B.Units[id] or B.Specials[id]
			local card = copy(def)
			if c.tier and c.tier > 1 and card.power then
				card.power += c.tier - 1
				card.tier = c.tier
			end
			if card.special then
				card.name = def.name .. "(" .. (c.name or "") .. ")"
			else
				card.name = c.name or card.name
			end
			table.insert(out, card)
		end
		if c.skill == "volley" and leader == "draw" then
			leader = "snipe"
		elseif c.skill == "focus" or c.skill == "scout" then
			leader = if leader == "draw" then "clear" else leader
		end
	end
	return shuffle(out, rng), leader
end

-- 해적 덱: 두목이면 영웅과 대포가 더 많다
function B.enemyDeck(isBoss, rng, factionId)
	local ids = { "swordsman", "swordsman", "axeman", "axeman", "pikeman", "pikeman", "pikeman", "surgeon", "musketeer", "musketeer", "sharpshooter", "scout", "scout", "gunner", "gunner", "swivel", "culverin", "ironclad", "sniper" }
	local fac = B.Factions[factionId or ""]
	if fac and not isBoss then
		ids = fac.roster
	end
	local out = {}
	for _, id in ids do
		local card = copy(B.Units[id] or B.Specials[id])
		if fac and not isBoss and fac.specialty and card.category == fac.specialty and card.power and not card.hero then
			card.power += 1
		end
		table.insert(out, card)
	end
	table.insert(out, copy(B.Specials.storm))
	if isBoss then
		table.insert(out, copy(B.Specials.horn))
		local boss = copy(B.Units.hero_blade)
		boss.name = "해적 두목"
		boss.power = 11
		table.insert(out, boss)
		table.insert(out, copy(B.Units.culverin))
		table.insert(out, copy(B.Specials.scorch))
	end
	return shuffle(out, rng), if isBoss then "snipe" elseif fac then fac.leader else "draw"
end

-- 적 문화권: 시드로 정한다 (클라이언트와 서버가 같은 값을 얻는다). 두목은 따로 정하지 않는다.
function B.foeFaction(seed)
	return B.FactionOrder[(math.floor(seed) % #B.FactionOrder) + 1]
end

local function other(side)
	return if side == "me" then "foe" else "me"
end
B.other = other

-- 해역 규칙: 시드로 정한다. 그 줄은 매 판 약해진 채 시작한다 ('맑음'·'순풍' 카드로 걷어 낼 수 있다)
B.SEA_RULES = {
	{ id = "calm", name = "잔잔한 바다", text = "특별한 규칙이 없어요" },
	{ id = "storm", name = "폭풍 해역", row = "cannon", text = "포 줄이 매 판 약해진 채 시작해요" },
	{ id = "fog", name = "안개 해역", row = "ranged", text = "사격 줄이 매 판 약해진 채 시작해요" },
	{ id = "melee", name = "혼전 해역", row = "melee", text = "근접 줄이 매 판 약해진 채 시작해요" },
}
function B.seaRule(seed)
	local r = (math.floor(seed / 7) % 8)
	return B.SEA_RULES[if r < 4 then 1 elseif r < 6 then 2 elseif r < 7 then 3 else 4]
end
-- 적 성격: 돌격형은 끝까지 카드를 내고, 신중형은 앞서면 일찍 멈춘다
B.STYLES = {
	rush = { name = "돌격형", margin = 24, text = "앞서도 멈추지 않고 몰아쳐요" },
	steady = { name = "균형형", margin = 14, text = "보통으로 싸워요" },
	careful = { name = "신중형", margin = 7, text = "앞서면 카드를 아끼며 일찍 멈춰요" },
}
function B.foeStyle(seed)
	local r = math.floor(seed / 3) % 3
	return if r == 0 then "rush" elseif r == 1 then "steady" else "careful"
end

function B.newMatch(myDeck, myLeader, foeDeck, foeLeader, rng, myFaction, foeFaction)
	local m = {
		faction = { me = myFaction, foe = foeFaction },
		style = { foe = "steady" },
		sea = nil,
		rows = { me = { melee = {}, ranged = {}, cannon = {} }, foe = { melee = {}, ranged = {}, cannon = {} } },
		hand = { me = {}, foe = {} },
		deck = { me = myDeck, foe = foeDeck },
		grave = { me = {}, foe = {} },
		weather = { melee = false, ranged = false, cannon = false },
		horn = { me = {}, foe = {} },
		wins = { me = 0, foe = 0 },
		passed = { me = false, foe = false },
		leader = { me = myLeader or "draw", foe = foeLeader or "draw" },
		leaderUsed = { me = false, foe = false },
		turn = "me",
		played = { me = 0, foe = 0 },
		refuted = { me = {}, foe = {} },
		rowBonus = { me = {}, foe = {} },
		mulligan = { me = B.MULLIGAN, foe = 0 },
		round = 1,
		over = false,
		winner = nil,
		rng = rng,
		log = {},
	}
	for _, side in { "me", "foe" } do
		for _ = 1, B.HAND + (if m.faction[side] == "southeast_asia" or m.faction[side] == "new_world" or m.faction[side] == "africa" then 1 else 0) do
			local c = table.remove(m.deck[side])
			if c then
				table.insert(m.hand[side], c)
			end
		end
	end
	local openingRoll = rng()
	m.omenState = math.floor(openingRoll * 2147483646) + 1
	if openingRoll < 0.5 then
		m.turn = "foe"
	end
	-- 동아시아: 첫 판 선공 (양쪽 모두 같으면 그대로)
	if (m.faction.me == "east_asia") ~= (m.faction.foe == "east_asia") then
		m.turn = if m.faction.me == "east_asia" then "me" else "foe"
	end
	return m
end

local function logLine(m: any, text)
	table.insert(m.log, text)
end

-- 연쇄: 원인 카드가 내 필드에 있고, 그 분류가 반증으로 끊기지 않았을 때만 켜진다
local function defOf(id)
	return B.Units[id] or B.Specials[id]
end

function B.chainActive(m: any, side, c: any): boolean
	if not c.cause then
		return false
	end
	local def = defOf(c.cause)
	if not def or (m.refuted and m.refuted[side] and m.refuted[side][def.category or ""]) then
		return false
	end
	for _, row in B.ROWS do
		for _, o in m.rows[side][row] do
			if o ~= c and o.id == c.cause then
				return true
			end
		end
	end
	return false
end

local function hasTactic(m: any, side, ability)
	for _, row in B.ROWS do
		for _, card in m.rows[side][row] do
			if card.ability == ability then return true end
		end
	end
	return false
end

-- 줄 합계: 날씨 → 결속 → 사기 → 무기 상성 → 병종 상성 순으로 계산한다
function B.cardPower(m: any, side, row, idx)
	local list = m.rows[side][row]
	local c = list[idx]
	if not c then
		return 0
	end
	if c.pigForm then return 1 end
	local p = c.power
	if not c.hero then
		if m.weather[row] and c.ability ~= "armor" and not (c.weatherArmor and not c.sealedAbility) then
			p = 1
		end
		if c.ability == "bond" then
			local n = 0
			for _, o in list do
				if o.id == c.id then
					n += 1
				end
			end
			p *= math.min(n, 3)
		end
		for j, o in list do
			if j ~= idx and o.ability == "morale" and not o.hero then
				p += (if m.faction and m.faction[side] == "east_asia" then 2 else 1)
			end
		end
		if c.cause and B.chainActive(m, side, c) then
			p += 2
		end
		p += B.tacticBonus(list, idx)
		if m.rowBonus and m.rowBonus[side][row] then
			p += m.rowBonus[side][row]
		end
		-- 근접끼리 무기 상성
		if row == "melee" and c.weapon and B.WEAPON_BEATS[c.weapon] then
			local foeRow = m.rows[other(side)].melee
			local beats, beaten = false, false
			for _, o in foeRow do
				if o.weapon == B.WEAPON_BEATS[c.weapon] then
					beats = true
				elseif B.WEAPON_BEATS[o.weapon or ""] == c.weapon then
					beaten = true
				end
			end
			if beats and not beaten then
				p += 1
			elseif beaten and not beats then
				p = math.max(1, p - 1)
			end
		end
		if c.ability == "leftHorn" or c.ability == "rightHorn" then
			local partner = if c.ability == "leftHorn" then "rightHorn" else "leftHorn"
			for _, ally in list do
				if ally.ability == partner then p += 2; break end
			end
		end
		p = math.max(0, p + (c.tacticPower or 0))
		if m.horn and m.horn[side][row] then
			p *= 2
		end
	end
	return math.max(0, p + (if c.hero then c.tacticPower or 0 else 0))
end

function B.rowRaw(m: any, side, row)
	local sum = 0
	for i in m.rows[side][row] do
		sum += B.cardPower(m, side, row, i)
	end
	return sum
end

function B.rowMatchup(_m: any, _side, _row)
	-- 줄 상성은 없앴다 (줄이 둘뿐이고, 다양성은 카드 능력으로 낸다). 화면 호환을 위해 함수는 남긴다.
	return 1, false, false
end

function B.rowTotal(m: any, side, row)
	local raw = B.rowRaw(m, side, row)
	if raw == 0 then
		return 0
	end
	-- 영웅 점수는 상성에 흔들리지 않는다
	local heroSum = 0
	for i, c in m.rows[side][row] do
		if c.hero then
			heroSum += B.cardPower(m, side, row, i)
		end
	end
	local mult = B.rowMatchup(m, side, row)
	return heroSum + math.floor((raw - heroSum) * mult + 0.5)
end

function B.total(m: any, side)
	local sum = 0
	for _, row in B.ROWS do
		sum += B.rowTotal(m, side, row)
	end
	return sum
end

local function strongestNonHero(m: any, sides)
	local best, hits = 0, {}
	for _, side in sides do
		for _, row in B.ROWS do
			for i, c in m.rows[side][row] do
				if not c.hero then
					local p = B.cardPower(m, side, row, i)
					if p > best then
						best, hits = p, { { side, row, i } }
					elseif p == best then
						table.insert(hits, { side, row, i })
					end
				end
			end
		end
	end
	return best, hits
end

local function weakestAlly(m: any, side, onlyRow, excludeRow)
	local pick, power
	for _, row in B.ROWS do
		if (not onlyRow or onlyRow == row) and row ~= excludeRow then
			for i, card in m.rows[side][row] do
				local current = B.cardPower(m, side, row, i)
				if not card.hero and (not power or current < power) then
					pick, power = card, current
				end
			end
		end
	end
	return pick
end

local function boostCard(card, amount)
	if amount > 0 and card.shaken then
		card.shaken = nil
		return
	end
	if amount < 0 then
		if card.deployCover then
			card.blockedPower = (card.blockedPower or 0) - amount
			card.deployCover = nil
			return
		end
		if card.cover then
			local blocked = math.min(2, -amount)
			card.blockedPower = (card.blockedPower or 0) + blocked
			amount += blocked
			card.cover = nil
		elseif card.id == "eu_45" and not card.ironUsed and not card.sealedAbility then
			card.ironUsed = true
			local blocked = math.min(2, -amount)
			card.blockedPower = (card.blockedPower or 0) + blocked
			amount += blocked
		end
	end
	card.tacticPower = (card.tacticPower or 0) + amount
end

local function counterScores(m: any, side)
	local state = m.tactics and m.tactics[side]
	local fleetReady = not (m.counterRound and m.counterRound[side] == m.round) and hasTactic(m, side, "counter")
	local chariotReady = not (state and state.hittite == m.round) and hasTactic(m, side, "hittiteChariot")
	if not fleetReady and not chariotReady then return nil end
	local scores = { fleet = fleetReady, chariot = chariotReady }
	for _, row in B.ROWS do scores[row] = B.rowTotal(m, side, row) end
	return scores
end

local function isMusketeer(card)
	return card.id == "eu_48" or card.id == "eu_49" or card.id == "eu_50" or card.id == "eu_51"
end

local function interceptAttack(m: any, side, row, index)
	local units = m.rows[side][row]
	if units[index].ability == "cyclops" then return index end
	for i, ally in units do
		local guard = (ally.ability == "musketeerGuard" or ally.ability == "musketeerShield") and isMusketeer(units[index])
		if i ~= index and (guard or ally.ability == "cyclops") and ally.starterUsed ~= m.round then
			ally.starterUsed = m.round
			if guard and m.tactics then m.tactics[side].musketeerCounter = m.round end
			logLine(m, ally.name .. ": 대신 맞았다")
			return i
		end
	end
	return index
end

local function strongestInRow(m: any, side, row, attack)
	local target, power, index
	for i, card in m.rows[side][row] do
		local current = B.cardPower(m, side, row, i)
		if not card.hero and (not power or current > power) then target, power, index = card, current, i end
	end
	if attack and index then return m.rows[side][row][interceptAttack(m, side, row, index)] end
	return target
end

local function resolveCounter(m: any, side, scores)
	if not scores then return false end
	for _, row in B.ROWS do
		if B.rowTotal(m, side, row) >= scores[row] then continue end
		local chariot = scores.chariot and hasTactic(m, side, "hittiteChariot") and strongestInRow(m, other(side), "melee")
		local fleet = scores.fleet and weakestAlly(m, side, nil, row)
		if not chariot and not fleet then continue end
		m.tactics = m.tactics or { me = {}, foe = {} }
		local state = m.tactics[side]
		if state.kadeshTreaty == m.round then
			state.kadeshTreaty = nil
			logLine(m, "이집트·히타이트 평화조약: 반격 차단")
			return false
		end
		if chariot then
			state.hittite = m.round
			boostCard(strongestInRow(m, other(side), "melee", true), -2)
			logLine(m, "히타이트 전차대: 반격 −2")
		end
		if fleet then
			boostCard(fleet, 2)
			m.counterRound = m.counterRound or {}
			m.counterRound[side] = m.round
		end
		return true
	end
	return false
end

local function removeHits(m: any, hits, source)
	local legacies, losses = {}, { me = {}, foe = {} }
	-- 뒤에서부터 지워야 번호가 어긋나지 않는다
	table.sort(hits, function(a, b)
		if a[1] ~= b[1] then return a[1] < b[1] end
		if a[2] ~= b[2] then return a[2] < b[2] end
		return a[3] > b[3]
	end)
	for _, h in hits do
		local index = if #hits == 1 and h[1] ~= source and h.single then interceptAttack(m, h[1], h[2], h[3]) else h[3]
		local c = table.remove(m.rows[h[1]][h[2]], index)
		if c then
			table.insert(m.grave[h[1]], c)
			if h[1] ~= source and not c.hero then losses[h[1]][h[2]] = true end
			c.starterUsed, c.bombardDelayed = nil, nil
			if h[1] ~= source and c.ability == "legacy" then table.insert(legacies, h) end
			c.pendingReturn, c.charges = nil, nil
			if c.sealedAbility then c.ability, c.sealedAbility = (if c.sealedAbility == "starterOnly" then nil else c.sealedAbility), nil; c.pigForm = nil end
			c.tacticPower = nil
			c.cover, c.anchored, c.shaken, c.ironUsed = nil, nil, nil, nil
		end
	end
	for _, h in legacies do
		local target = weakestAlly(m, h[1], h[2], nil)
		if target then boostCard(target, 2) end
	end
	for _, side in { "me", "foe" } do
		for _, row in B.ROWS do
			if not losses[side][row] then continue end
			local state = m.tactics and m.tactics[side]
			if state and state.rallyFlag == m.round then
				state.rallyFlag = nil
				table.insert(m.rows[side][row], { id = "reinforcement", name = "지원병", row = row, power = 2 })
				logLine(m, "마자파힛 깃발: 지원병 소집")
			end
			for _, card in m.rows[side][row] do
				if card.starterRole == "reinforce" and not card.starterUsed and not card.sealedAbility then
					card.starterUsed = 1
					table.insert(m.rows[side][row], { id = "reinforcement", name = "지원병", row = row, power = 2 })
					logLine(m, "앙코르 청동종: 지원병 소집")
					break
				end
			end
		end
	end
end

local function drawCards(m: any, side, n)
	for _ = 1, n do
		local c = table.remove(m.deck[side])
		if c then
			table.insert(m.hand[side], c)
		end
	end
end

local function canalArrival(m: any, side, card)
	local state = m.tactics and m.tactics[side]
	if state and state.dispatch ~= m.round and (card.tacticPower or 0) > 0 and hasTactic(m, side, "chaski") then
		local target
		for _, ally in m.rows[side].ranged do
			if ally ~= card and not ally.hero and (not target or ally.power < target.power) then target = ally end
		end
		if target then
			state.dispatch = m.round
			card.tacticPower -= 1
			boostCard(target, 1)
		end
	end
	if m.tactics and m.tactics[side].canal ~= m.round and hasTactic(m, side, "canal") then
		m.tactics[side].canal = m.round
		boostCard(card, 2)
		logLine(m, "베네치아 운하: " .. card.name .. " +2")
	end
end

local function resolveHorns(m: any, side, row)
	local state = m.tactics and m.tactics[side]
	if not state or state.horns == m.round then return end
	local left, right = false, false
	for _, unit in m.rows[side][row] do
		left = left or unit.ability == "leftHorn"
		right = right or unit.ability == "rightHorn"
	end
	if not (left and right) then return end
	local foe = other(side)
	local target, power
	for i, unit in m.rows[foe][row] do
		local current = B.cardPower(m, foe, row, i)
		if not unit.hero and (not power or current > power) then target, power = unit, current end
	end
	if target then
		state.horns = m.round
		boostCard(target, -2)
		target.anchored = true
		logLine(m, "황소뿔 포위: " .. target.name .. " −2")
	end
end

local function cavalryArrival(m: any, side, card)
	if card.ability ~= "comanche" or card.starterUsed == m.round then return end
	local target = strongestInRow(m, other(side), "melee", true)
	if target then
		card.starterUsed = m.round
		boostCard(target, -2)
		logLine(m, "코만치 기병: 돌격 −2")
	end
end

local function lakotaSnapshot(m: any, side)
	local state = m.tactics and m.tactics[side]
	if (state and state.lakota == m.round) or not hasTactic(m, side, "lakota") then return nil end
	local before = {}
	for _, ally in m.rows[side].melee do
		if not ally.hero and not ally.pendingReturn then before[ally] = ally.tacticPower or 0 end
	end
	return before
end

local function lakotaRetreat(m: any, side, before)
	if not before or not hasTactic(m, side, "lakota") then return end
	for i, ally in m.rows[side].melee do
		if before[ally] == nil or (ally.tacticPower or 0) >= before[ally] or ally.anchored then continue end
		m.tactics = m.tactics or { me = {}, foe = {} }
		m.tactics[side].lakota = m.round
		table.insert(m.rows[side].ranged, table.remove(m.rows[side].melee, i))
		canalArrival(m, side, ally)
		resolveHorns(m, side, "ranged")
		logLine(m, "라코타 기병: " .. ally.name .. " 후열 엄호 이동")
		break
	end
end

local function swapFormation(m: any, side)
	local front, back = m.rows[side].melee, m.rows[side].ranged
	local fi, bi
	for i, unit in front do if not unit.hero and not unit.anchored then fi = i; break end end
	for i, unit in back do if not unit.hero and not unit.anchored then bi = i; break end end
	if not fi or not bi then return false end
	front[fi], back[bi] = back[bi], front[fi]
	boostCard(front[fi], 2)
	cavalryArrival(m, side, front[fi])
	if hasTactic(m, side, "relay") then front[fi].cover = true end
	boostCard(back[bi], 1)
	if back[bi].starterRole == "coverFire" and not back[bi].sealedAbility then
		local target = strongestInRow(m, other(side), "melee", true)
		if target then boostCard(target, -2); logLine(m, "머스킷 부대: 엄호 사격") end
	end
	canalArrival(m, side, back[bi])
	resolveHorns(m, side, "melee")
	resolveHorns(m, side, "ranged")
	if back[bi].ability == "rome" then back[bi].romanRetreat = m.round end
	if front[fi].ability == "rome" and front[fi].romanRetreat == m.round and front[fi].romanReturn ~= m.round then
		front[fi].romanReturn = m.round
		boostCard(front[fi], 3)
		logLine(m, "로마 군단 방패: 전열 복귀 +3")
	end
	return true
end

local function cleanseTactic(card)
	card.anchored, card.shaken = nil, nil
	if (card.tacticPower or 0) < 0 then card.tacticPower = nil end
end

local function resolveLiteraryCombos(m: any, side, state)
	if not state then return end
	if state.witches ~= m.round and hasTactic(m, side, "witchCurse")
		and hasTactic(m, side, "witchBind") and hasTactic(m, side, "witchGuard") then
		state.witches = m.round
		table.insert(m.rows[side].ranged, { id = "apparition", name = "예언의 환영", row = "ranged", power = 4 })
		logLine(m, "마녀의 회합: 예언의 환영 소환")
	end
	if state.pilgrims == m.round or not hasTactic(m, side, "monkeyStrike")
		or not hasTactic(m, side, "pigGuard") or not hasTactic(m, side, "sandCleanse") then return end
	local target, targetRow, targetIndex, power
	for _, row in B.ROWS do
		for index, card in m.rows[side][row] do
			local current = B.cardPower(m, side, row, index)
			if not card.hero and card.id ~= "lo_51" and card.id ~= "lo_52" and card.id ~= "lo_53"
				and (not power or current < power) then
				target, targetRow, targetIndex, power = card, row, index, current
			end
		end
	end
	if target then
		state.pilgrims = m.round
		cleanseTactic(target)
		if targetRow == "melee" then
			table.insert(m.rows[side].ranged, table.remove(m.rows[side].melee, targetIndex))
			canalArrival(m, side, target)
		end
		logLine(m, "서유기 삼제자: " .. target.name .. " 구출")
	end
end

local function blockMactanBombardment(m: any, defender)
	local state = m.tactics and m.tactics[defender]
	if not state or state.mactanShoal ~= m.round or not strongestInRow(m, defender, "ranged") then return false end
	state.mactanShoal = nil
	if state.mactanCounterUsed ~= m.round then state.mactanCounter = m.round end
	logLine(m, "막탄의 얕은 여울: 포격 차단")
	return true
end

local function beginTurn(m: any, side)
	m.turn = side
	local state = m.tactics and m.tactics[side]
	if state and state.strait == m.round and not state.straitDelayed then
		state.strait = nil
		if not blockMactanBombardment(m, other(side)) then
			local target = strongestInRow(m, other(side), "ranged", true)
			if target then boostCard(target, -3); logLine(m, "말라카 해협: 후열 기습 −3") end
		end
	end
	if state then
		if state.mactanCounter == m.round then
			state.mactanCounter = nil
			if hasTactic(m, side, "lapulapu") then
				local target = strongestInRow(m, other(side), "melee", true)
				if target then
					state.mactanCounterUsed = m.round
					boostCard(target, -3)
					logLine(m, "라푸라푸: 막탄 반격 −3")
				end
			end
		end
		state.straitDelayed = nil
		if (state.journeyCount or 0) >= 2 and state.homecoming ~= m.round and hasTactic(m, side, "homecoming") then
			local ally = weakestAlly(m, side, nil, nil)
			if ally and ally.rubiconRound ~= m.round and #m.hand[side] < B.HAND_MAX then
				for _, row in B.ROWS do
					local idx = table.find(m.rows[side][row], ally)
					if not idx then continue end
					table.remove(m.rows[side][row], idx)
					local recalled = copy(B.Units[ally.id] or ally)
					recalled.power, recalled.tier = ally.power, ally.tier
					table.insert(m.hand[side], recalled)
					drawCards(m, side, 1)
					state.homecoming = m.round
					logLine(m, "오디세우스: 귀환")
					break
				end
			end
		end
	end
	local back = m.rows[side].ranged
	for _, owner in { side, other(side) } do
		local front = m.rows[owner].melee
		for i = #front, 1, -1 do
			local card = front[i]
			if card.pendingReturn == side and not card.anchored and not card.sealedAbility then
				card.pendingReturn = nil
				if card.ability == "defect" then
					table.insert(m.rows[side].melee, table.remove(front, i))
					if hasTactic(m, side, "tokugawa") then boostCard(card, 2) end
					logLine(m, "세키가하라: 고바야카와가 전열로 합류")
					continue
				end
				table.insert(back, table.remove(front, i))
				if card.ability == "marathon" then
					canalArrival(m, side, card)
					local delivered = 0
					for _, ally in back do
						if ally ~= card and not ally.hero then
							boostCard(ally, 1)
							delivered += 1
							if delivered == 2 then break end
						end
					end
					logLine(m, "마라톤의 전령: 승전 소식 도착")
				else
					if state and card.id == "ea_37" then state.huangReturned = m.round end
					logLine(m, "거짓 투항: " .. card.name .. " 귀환")
				end
			end
		end
	end
	for _, row in B.ROWS do
		for _, card in m.rows[side][row] do
			if card.sealedAbility then continue end
			if card.bombardDelayed then card.bombardDelayed = nil; continue end
			if card.ability == "amazonJaguar" and not card.starterUsed then
				card.starterUsed = 1
				local count = 0
				for _, enemy in m.rows[other(side)].melee do if not enemy.hero then count += 1 end end
				if count == 1 then
					local prey = strongestInRow(m, other(side), "melee", true)
					if prey then boostCard(prey, -3); logLine(m, "재규어: 고립된 적 습격") end
				end
			end
			local used = card.starterUsed or 0
			local attack = if card.starterRole == "bombard" and used == 0 then 3
				elseif card.starterRole == "raid" and row == "melee" and used < 2 then 1 else nil
			if attack then
				card.starterUsed = used + 1
				if attack == 3 and blockMactanBombardment(m, other(side)) then continue end
				local target = strongestInRow(m, other(side), if attack == 3 then "ranged" else "melee", true)
				if target then
					boostCard(target, -attack)
					logLine(m, card.name .. ": " .. target.name .. " −" .. tostring(attack))
				end
			end
		end
	end
	if state then
		if state.musketeerCounter == m.round then
			state.musketeerCounter = nil
			if hasTactic(m, side, "dartagnan") then
				local target = strongestInRow(m, other(side), "melee", true)
				if target then boostCard(target, -2); logLine(m, "달타냥: 반격 −2") end
			end
		end
		if state.piper ~= m.round and hasTactic(m, side, "piper") and hasTactic(m, side, "rats") then
			local foe = other(side)
			local front = m.rows[foe].melee
			local moved = 0
			for i = #front, 1, -1 do
				local target = front[i]
				if not target.hero and not target.anchored and not target.pendingReturn then
					table.insert(m.rows[foe].ranged, table.remove(front, i))
					moved += 1
					if moved == 2 then break end
				end
			end
			if moved > 0 then state.piper = m.round; logLine(m, "하멜른: 피리 유인") end
		end
		if state.sancho ~= m.round and hasTactic(m, side, "sancho") and #m.hand[side] < B.HAND_MAX then
			for i, ally in m.rows[side].melee do
				if ally.ability == "quixote" and ally.rubiconRound ~= m.round then
					state.sancho = m.round
					local recalled = copy(B.Units[ally.id])
					recalled.power, recalled.tier = ally.power, ally.tier
					table.remove(m.rows[side].melee, i)
					table.insert(m.hand[side], recalled)
					logLine(m, "산초 판사: 돈키호테 회수")
					break
				end
			end
		end
	end
	resolveLiteraryCombos(m, side, state)
end

local function finishTactics(m: any, side, playedCard)
	for _, row in B.ROWS do
		for _, card in m.rows[side][row] do
			if card ~= playedCard then card.anchored, card.shaken = nil, nil end
			if card.sealedAbility then
				card.ability, card.sealedAbility = (if card.sealedAbility == "starterOnly" then nil else card.sealedAbility), nil; card.pigForm = nil
			elseif playedCard and card.ability == "charge" then
				card.charges = (card.charges or 0) + 1
				if card.charges == 3 then
					for _, ally in m.rows[side][row] do
						if not ally.hero then boostCard(ally, 2) end
					end
					logLine(m, "축적: " .. card.name .. " 발동")
				end
			end
		end
	end
end

local function nextTurn(m: any, side)
	if m.over then
		return
	end
	if m.passed[other(side)] then
		m.turn = side
	else
		m.turn = other(side)
	end
end

local function applySea(m: any)
	if m.sea and m.sea.row then
		m.weather[lane({ row = m.sea.row })] = true
	end
end
B.applySea = applySea

local function roundEnd(m: any)
	m.tactics = {
		me = { supply = hasTactic(m, "me", "supply") },
		foe = { supply = hasTactic(m, "foe", "supply") },
	}
	local a, b = B.total(m, "me"), B.total(m, "foe")
	local winner = nil
	if a > b then
		winner = "me"
		m.wins.me += 1
	elseif b > a then
		winner = "foe"
		m.wins.foe += 1
	else
		local meNw, foeNw = m.faction and m.faction.me == "new_world", m.faction and m.faction.foe == "new_world"
		if meNw and not foeNw then
			winner = "me"
			m.wins.me += 1
		elseif foeNw and not meNw then
			winner = "foe"
			m.wins.foe += 1
		else
			m.wins.me += 1
			m.wins.foe += 1
		end
	end
	logLine(m, string.format("%d판 종료: %d 대 %d — %s", m.round, a, b, if winner == "me" then "우리가 이겼다" elseif winner == "foe" then "해적이 이겼다" else "무승부"))
	for _, side in { "me", "foe" } do
		-- 중동: 가장 센 일반 카드 하나는 판이 끝나도 필드에 남는다
		local keep, keepRow = nil, nil
		if m.faction and m.faction[side] == "middle_east" then
			local bp = 0
			for _, row in B.ROWS do
				for i, c in m.rows[side][row] do
					if not c.hero and c.power > bp and c.power <= 5 then
						keep, keepRow, bp = c, row, c.power
					end
				end
			end
		end
		for _, row in B.ROWS do
			for _, c in m.rows[side][row] do
				if c ~= keep then
					c.tacticPower, c.pendingReturn, c.charges, c.starterUsed = nil, nil, nil, nil
					c.cover, c.anchored, c.shaken, c.ironUsed = nil, nil, nil, nil
					if c.sealedAbility then c.ability, c.sealedAbility = (if c.sealedAbility == "starterOnly" then nil else c.sealedAbility), nil; c.pigForm = nil end
					table.insert(m.grave[side], c)
				end
			end
			m.rows[side][row] = {}
		end
		if keep then
			keep.tacticPower, keep.pendingReturn, keep.charges, keep.starterUsed = nil, nil, nil, nil
			keep.cover, keep.anchored, keep.shaken, keep.ironUsed = nil, nil, nil, nil
			if keep.sealedAbility then keep.ability, keep.sealedAbility = (if keep.sealedAbility == "starterOnly" then nil else keep.sealedAbility), nil; keep.pigForm = nil end
		end
		if keep and not (m.wins.me >= 2 or m.wins.foe >= 2 or m.round >= 3) then
			table.insert(m.rows[side][keepRow], keep)
		elseif keep then
			table.insert(m.grave[side], keep)
		end
		m.passed[side] = false
	end
	m.weather = { melee = false, ranged = false, cannon = false }
	m.refuted = { me = {}, foe = {} }
	m.rowBonus = { me = {}, foe = {} }
	applySea(m)
	m.horn = { me = {}, foe = {} }
	local result = { round = m.round, me = a, foe = b, winner = winner }
	if m.wins.me >= 2 or m.wins.foe >= 2 or m.round >= 3 then
		m.over = true
		m.winner = if m.wins.me > m.wins.foe then "me" elseif m.wins.foe > m.wins.me then "foe" else "draw"
	else
		m.round += 1
		-- 이긴 쪽이 다음 판 선공 (무승부면 그대로)
		m.turn = winner or m.turn
		-- 한 판 지날 때마다 카드를 보충한다 (손패는 열 장까지)
		for _, side in { "me", "foe" } do
			drawCards(m, side, math.max(0, math.min(B.ROUND_DRAW, B.HAND_MAX - #m.hand[side])))
			m.played[side] = 0
		end
		-- 유럽: 판을 이기면 한 장 더
		if winner and m.faction and m.faction[winner] == "europe" then
			drawCards(m, winner, 1)
		end
		-- 미지의 땅: 판을 지면 두 장 더 (역전의 단서)
		if winner and m.faction then
			local loser = if winner == "me" then "foe" else "me"
			if m.faction[loser] == "lost" then
				drawCards(m, loser, 2)
			end
		end
	end
	return result
end

-- 군기: 일반 카드 점수가 가장 큰 줄(동점이면 근접·사격·포 순)
local function bestHornRow(m: any, side)
	local bestRow, bestSum = nil, 0
	for _, row in B.ROWS do
		if not m.horn[side][row] then
			local sum = 0
			for i, c in m.rows[side][row] do
				if not c.hero then
					sum += B.cardPower(m, side, row, i)
				end
			end
			if sum > bestSum then
				bestRow, bestSum = row, sum
			end
		end
	end
	return bestRow, bestSum
end

-- 저격수: 적의 점수 합이 10 이상인 줄 가운데 가장 센 줄에서 가장 센 일반 카드를 쓰러뜨린다
local function snipeTarget(m: any, side)
	local foe = other(side)
	local bestRow, bestTotal = nil, 9
	for _, row in B.ROWS do
		local t = B.rowTotal(m, foe, row)
		if t > bestTotal then
			bestRow, bestTotal = row, t
		end
	end
	if not bestRow then
		return nil
	end
	local bi, bp = nil, 0
	for i, c in m.rows[foe][bestRow] do
		if not c.hero then
			local p = B.cardPower(m, foe, bestRow, i)
			if p > bp then
				bi, bp = i, p
			end
		end
	end
	if bi then
		return foe, bestRow, bi, bp
	end
	return nil
end

-- 회군: 치료병이 필드에 있으면 그 카드, 없으면 가장 약한 일반 카드를 손으로 되돌린다
local function decoyTarget(m: any, side)
	local pick
	for _, row in B.ROWS do
		for i, c in m.rows[side][row] do
			if not c.hero and c.rubiconRound ~= m.round then
				local score = (if c.ability == "medic" then 100 else 0) - c.power
				if not pick or score > pick.score then
					pick = { row = row, i = i, score = score }
				end
			end
		end
	end
	return pick
end

-- 카드 내기: 부대는 자기 줄에 (첩자는 적 줄에), 특수 카드는 즉시 발동한다. 반환: ok, 설명, 판이 끝났으면 그 결과
function B.play(m: any, side, handIdx)
	if m.over or m.turn ~= side or m.passed[side] then
		return false, "지금은 낼 수 없어요"
	end
	local c = m.hand[side][handIdx]
	if not c then
		return false, "그 카드가 없어요"
	end
	table.remove(m.hand[side], handIdx)
	local played = c
	local foe = other(side)
	local scores = counterScores(m, foe)
	local mobility = lakotaSnapshot(m, foe)
	m.tactics = m.tactics or { me = {}, foe = {} }
	local tactics, enemyTactics = m.tactics[side], m.tactics[foe]
	local frontScore = if tactics.retreat ~= m.round and hasTactic(m, side, "falseRetreat") then B.rowTotal(m, side, "melee") else nil
	local previousDeployment = tactics.lastDeployment
	if c.journey and c.id ~= "lo_54" and not tactics[c.id] then
		tactics[c.id] = true
		tactics.journeyCount = (tactics.journeyCount or 0) + 1
	end
	if c.special == "echo" then
		local prior = m.lastTactic and m.lastTactic[foe]
		if prior and prior.round == m.round then c = prior.card end
	elseif c.special then
		m.lastTactic = m.lastTactic or {}
		m.lastTactic[side] = { round = m.round, card = c }
	end
	local msg
	if c.special == "kadeshTreaty" then
		tactics.kadeshTreaty, enemyTactics.kadeshTreaty = m.round, m.round
		table.insert(m.grave[side], played)
		msg = "이집트·히타이트 평화조약: 양측 반격 억제"
	elseif c.special == "urFeast" then
		local target, loss
		for _, row in B.ROWS do
			for _, ally in m.rows[side][row] do
				local penalty = ally.tacticPower or 0
				if not ally.hero and penalty < (loss or 0) then target, loss = ally, penalty end
			end
		end
		if target then
			cleanseTactic(target)
			for _, ally in m.rows[side].ranged do
				if ally.ability == "urStandard" then target.cover = true; break end
			end
		end
		table.insert(m.grave[side], played)
		msg = if target then "우르의 연회: 아군 회복" else "우르의 연회 — 회복할 아군 없음"
	elseif c.special == "palapa" then
		local moved = 0
		if (tactics.palapaMarks or 0) >= 2 and hasTactic(m, side, "gajahMada") then
			local back = m.rows[side].ranged
			for index = #back, 1, -1 do
				local ship = back[index]
				if ship.category ~= "선박" or ship.hero or ship.anchored or ship.pendingReturn or ship.pigForm then continue end
				table.insert(m.rows[side].melee, table.remove(back, index))
				boostCard(ship, 1)
				moved += 1
				if moved == 2 then break end
			end
			if moved > 0 then tactics.palapaMarks -= 2 end
		end
		table.insert(m.grave[side], played)
		msg = if moved > 0 then "팔라파 맹세: 함대 전열 진군" else "팔라파 맹세 — 발동 조건 미충족"
	elseif c.special == "mactanShoal" then
		tactics.mactanShoal = m.round
		table.insert(m.grave[side], played)
		msg = "막탄의 얕은 여울: 포격 방어 준비"
	elseif c.special == "capacocha" then
		local offering = if hasTactic(m, side, "mountainAltar") then table.remove(m.hand[side]) else nil
		if offering then
			m.omenState = ((m.omenState or 1) * 48271) % 2147483647
			local omen = m.omenState % 3
			if omen == 0 then
				local weakest, loss
				for _, row in B.ROWS do
					for _, ally in m.rows[side][row] do
						local penalty = ally.tacticPower or 0
						if not ally.hero and penalty < (loss or 0) then weakest, loss = ally, penalty end
					end
				end
				if weakest then cleanseTactic(weakest) end
				msg = "카파코차 징조: 아군 회복"
			elseif omen == 1 then
				drawCards(m, side, 1)
				msg = "카파코차 징조: 카드 한 장 뽑기"
			else
				local _, hits = strongestNonHero(m, { foe })
				if hits[1] then
					local hit = hits[1]
					boostCard(m.rows[foe][hit[2]][interceptAttack(m, foe, hit[2], hit[3])], -3)
				end
				msg = "카파코차 징조: 적 약화 −3"
			end
		else
			msg = "카파코차 의례 — 제단 또는 제물이 없음"
		end
		table.insert(m.grave[side], played)
	elseif c.special == "bachDangTide" then
		local struck = false
		if tactics.stakes ~= m.round and hasTactic(m, side, "stakes") then
			for _, target in m.rows[foe].ranged do
				if target.bachDangRound ~= m.round or target.bachDangSide ~= side then continue end
				target.bachDangRound, target.bachDangSide = nil, nil
				tactics.stakes = m.round
				boostCard(target, -3)
				target.anchored = true
				struck = true
				break
			end
		end
		table.insert(m.grave[side], played)
		msg = if struck then "박당강의 썰물: 말뚝 발동" else "박당강의 썰물 — 발동 조건 미충족"
	elseif c.special == "rubicon" then
		local back = m.rows[side].ranged
		local index, power
		for i, ally in back do
			local current = B.cardPower(m, side, "ranged", i)
			if not ally.hero and not ally.anchored and not ally.pendingReturn and (not power or current < power) then index, power = i, current end
		end
		if index then
			local ally = table.remove(back, index)
			table.insert(m.rows[side].melee, ally)
			ally.rubiconRound = m.round
			boostCard(ally, 3)
			resolveHorns(m, side, "melee")
		end
		table.insert(m.grave[side], played)
		msg = if index then "루비콘 도하: 주사위는 던져졌다" else "루비콘 도하 — 대상 없음"
	elseif c.special == "zela" or c.special == "hattin" then
		local target = strongestInRow(m, foe, if c.special == "zela" then "ranged" else "melee", true)
		if target then
			boostCard(target, if c.special == "zela" then -3 else -2)
			if c.special == "hattin" then
				target.hattinRound = m.round
				if m.leader[side] == "saladin" then target.anchored = true end
			end
		end
		table.insert(m.grave[side], played)
		msg = c.name
	elseif c.special == "lifePlant" then
		local target = weakestAlly(m, side, nil, nil)
		if target then cleanseTactic(target) end
		table.insert(m.grave[side], played)
		msg = c.name
	elseif c.special == "piperPact" then
		local deck = m.deck[side]
		for i = #deck, math.max(1, #deck - 1), -1 do
			local card = deck[i]
			if (card.id == "eu_52" or card.id == "eu_53") and #m.hand[side] < B.HAND_MAX then
				table.insert(m.hand[side], table.remove(deck, i))
				break
			end
		end
		table.insert(m.grave[side], played)
		msg = "하멜른의 약속"
	elseif c.special == "redCliffFire" then
		local front = strongestInRow(m, foe, "melee", true)
		local rearDamage = (if tactics.huangReturned == m.round then 2 else 0) + (if hasTactic(m, side, "eastWind") then 1 else 0)
		if front then boostCard(front, -(if hasTactic(m, side, "fireCommand") then 3 else 2)) end
		if rearDamage > 0 then
			local rear = strongestInRow(m, foe, "ranged", true)
			if rear then boostCard(rear, -rearDamage) end
		end
		table.insert(m.grave[side], played)
		msg = "적벽의 화공선"
	elseif c.special == "ithacaBow" then
		local _, hits = strongestNonHero(m, { foe })
		if hits[1] then
			hits[1].single = true
			removeHits(m, { hits[1] }, side)
		end
		table.insert(m.grave[side], played)
		msg = if hits[1] then "이타카의 활: 즉시 저격" else "이타카의 활 — 대상 없음"
	elseif c.special == "truce" then
		local ally = weakestAlly(m, side, nil, nil)
		if ally then ally.cover = true end
		msg = if ally then "휴전 협정: " .. ally.name .. " 엄호" else "휴전 협정 — 대상 없음"
	elseif c.special == "assassinate" then
		local target = strongestInRow(m, foe, "melee", true)
		if target then boostCard(target, -2) end
		msg = if target then "암살: " .. target.name .. " −2" else "암살 — 대상 없음"
	elseif c.special == "dollCurse" then
		local target = strongestInRow(m, foe, "ranged")
		if target then
			boostCard(target, -2)
			target.shaken = true
		end
		msg = if target then "인형의 저주: " .. target.name else "인형의 저주 — 대상 없음"
	elseif c.special == "dispatch" then
		local deck = m.deck[side]
		for i = #deck, math.max(1, #deck - 1), -1 do
			local card = deck[i]
			if not card.hero and not card.special and #m.hand[side] < B.HAND_MAX then
				table.insert(m.hand[side], table.remove(deck, i))
				break
			end
		end
		msg = "안데스 전령 나팔"
	elseif c.special == "riverRoute" then
		local from = m.rows[side].melee
		local idx, power
		for i, ally in from do
			local current = B.cardPower(m, side, "melee", i)
			if not ally.hero and not ally.anchored and not ally.pendingReturn and (not power or current < power) then idx, power = i, current end
		end
		if idx then
			local ally = table.remove(from, idx)
			table.insert(m.rows[side].ranged, ally)
			canalArrival(m, side, ally)
			resolveHorns(m, side, "ranged")
		end
		msg = if idx then "아마존 강: 아군 후열 이동" else "아마존 강 — 대상 없음"
	elseif c.special == "rallyFlag" or c.special == "strait" then
		tactics[c.special] = m.round
		msg = if c.special == "strait" then "말라카 해협: 다음 턴 후열 기습 예고" else "마자파힛 깃발: 지원 대기"
	elseif c.special == "seal" then
		local target, power
		for _, row in B.ROWS do
			for i, enemy in m.rows[foe][row] do
				local current = B.cardPower(m, foe, row, i)
				if not enemy.hero and (enemy.ability or enemy.starterRole) and not enemy.sealedAbility and (not power or current > power) then
					target, power = enemy, current
				end
			end
		end
		if target then target.sealedAbility, target.ability = target.ability or "starterOnly", nil end
		msg = if target then "봉인: " .. target.name else "봉인 — 대상 없음"
		table.insert(m.grave[side], played)
	elseif c.special == "ambush" or c.special == "falseOrder" then
		m.plans = m.plans or { me = {}, foe = {} }
		m.plans[side][c.special] = m.round
		msg = if c.special == "ambush" then "전열에 매복을 준비했다" else "후열에 거짓 명령 표식을 공개했다"
		table.insert(m.grave[side], played)
	elseif c.special == "scorch" then
		local best, hits = strongestNonHero(m, { "me", "foe" })
		if best >= 6 then
			removeHits(m, hits, side)
			msg = string.format("소각! 가장 센 카드(%d)가 쓰러졌다", best)
		else
			msg = "소각 — 쓰러뜨릴 만한 카드가 없었다"
		end
		table.insert(m.grave[side], played)
	elseif c.special == "weather" then
		m.weather[lane(c)] = true
		msg = string.format("%s! %s 줄이 모두 약해졌다", c.name, B.ROW_NAME[lane(c)])
		table.insert(m.grave[side], played)
	elseif c.special == "clear" then
		m.weather = { melee = false, ranged = false, cannon = false }
		msg = "날씨가 걷혔다"
		table.insert(m.grave[side], played)
	elseif c.special == "wind" then
		m.weather = { melee = false, ranged = false, cannon = false }
		drawCards(m, side, 1)
		msg = "순풍! 날씨가 걷히고 카드를 한 장 뽑았다"
		table.insert(m.grave[side], played)
	elseif c.special == "horn" then
		local row = bestHornRow(m, side)
		if row then
			m.horn[side][row] = true
			msg = string.format("군기! %s 줄 점수가 두 배", B.ROW_NAME[row])
		else
			msg = "군기 — 높일 줄이 없었다"
		end
		table.insert(m.grave[side], played)
	elseif c.special == "refute" then
		m.refuted = m.refuted or { me = {}, foe = {} }
		m.refuted[other(side)][c.refuteKind or ""] = true
		msg = string.format("반증! 상대의 %s 연쇄가 끊겼다", c.refuteKind or "")
		table.insert(m.grave[side], played)
	elseif c.special == "decoy" then
		local pick = decoyTarget(m, side)
		if pick then
			local back = table.remove(m.rows[side][pick.row], pick.i)
			back.tacticPower = nil
			back.cover, back.anchored, back.shaken, back.ironUsed = nil, nil, nil, nil
			back.pendingReturn, back.charges, back.starterUsed = nil, nil, nil
			if back.sealedAbility then back.ability, back.sealedAbility = (if back.sealedAbility == "starterOnly" then nil else back.sealedAbility), nil; back.pigForm = nil end
			table.insert(m.hand[side], back)
			msg = string.format("회군! %s을(를) 손으로 되돌렸다", back.name)
		else
			msg = "회군 — 되돌릴 카드가 없었다"
		end
		table.insert(m.grave[side], played)
	elseif c.special == "echo" then
		msg = "따라 하기 — 복제할 전술이 없었다"
		table.insert(m.grave[side], played)
	else
		local target = side
		if c.ability == "spy" or c.ability == "feigned" or c.ability == "defect" then
			target = other(side)
		end
		local fused = false
		if c.fuse then
			local parts = {}
			for _, id in c.fuse do
				for _, row in B.ROWS do
					for _, o in m.rows[side][row] do
						if o.id == id and not o.hero and not parts[id] then
							parts[id] = { card = o, row = row }
						end
					end
				end
			end
			if parts[c.fuse[1]] and parts[c.fuse[2]] then
				local sum = 0
				for _, part in parts do
					sum += part.card.power
					table.remove(m.rows[side][part.row], table.find(m.rows[side][part.row], part.card))
					part.card.tacticPower = nil
					part.card.cover, part.card.anchored, part.card.shaken, part.card.ironUsed = nil, nil, nil, nil
					table.insert(m.grave[side], part.card)
				end
				c.power = sum + 3
				c.fused = true
				fused = true
			end
		end
		table.insert(m.rows[target][lane(c)], c)
		if c.ability == "marathon" or c.ability == "feigned" or c.ability == "defect" then c.pendingReturn = side end
		if target == side and not c.hero then
			local row = lane(c)
			if row == "melee" and enemyTactics.eel ~= m.round and hasTactic(m, foe, "electricEel") then
				local count = 0
				for _, ally in m.rows[side].melee do if not ally.hero then count += 1 end end
				if count == 2 then
					enemyTactics.eel = m.round
					boostCard(c, -1)
					logLine(m, "전기뱀장어: 지원 유닛 −1")
				end
			end
			if row == "ranged" and not tactics.rangedDeployed then
				tactics.rangedDeployed = true
				c.deployCover = hasTactic(m, side, "highGround")
			end
			if tactics.supply and not tactics["supplied_" .. row] then
				tactics["supplied_" .. row] = true
				c.reorganize = true
				boostCard(c, 1)
				logLine(m, "대상단의 보급: " .. c.name .. " +1")
			end
			if row == "melee" and enemyTactics.retreat == m.round and not enemyTactics.retreatUsed then
				enemyTactics.retreatUsed = true
				boostCard(c, -3)
				c.shaken = true
				logLine(m, "감조계: " .. c.name .. " −3")
			end
			if previousDeployment == row and enemyTactics.stakes ~= m.round and hasTactic(m, foe, "stakes") then
				enemyTactics.stakes = m.round
				local penalty = if weakestAlly(m, foe, row, nil) then 2 else 4
				boostCard(c, -penalty)
				c.anchored = true
				logLine(m, "박당강의 말뚝: " .. c.name .. " −" .. tostring(penalty))
			end
			tactics.lastDeployment = row
			if c.ability == "quipu" then
				tactics.quipuCount, tactics.quipuRow = 0, nil
			elseif tactics.quipu ~= m.round and hasTactic(m, side, "quipu") then
				tactics.quipuCount = if tactics.quipuRow and tactics.quipuRow ~= row then (tactics.quipuCount or 0) + 1 else 1
				tactics.quipuRow = row
				if tactics.quipuCount == 3 then
					tactics.quipu = m.round
					boostCard(c, 3)
					logLine(m, "잉카 키푸: " .. c.name .. " +3")
				end
			end
			if c.ability == "leftHorn" or c.ability == "rightHorn" then resolveHorns(m, side, row) end
		end
		local plans = m.plans and m.plans[foe]
		if target == side and plans then
			if lane(c) == "melee" and not c.hero and plans.ambush == m.round then
				plans.ambush = nil
				boostCard(c, -2)
				logLine(m, "매복: " .. c.name .. " −2")
			end
			if not c.hero and plans.falseOrder == m.round then
				plans.falseOrder = nil
				if lane(c) == "ranged" then
					if swapFormation(m, foe) then logLine(m, "거짓 명령: 전술 교대!") end
				else
					local ally = weakestAlly(m, foe, "ranged", nil)
					if ally then boostCard(ally, 1); logLine(m, "공성계: 후열 지원 +1") end
				end
			end
		end
		if tactics.supply and tactics["supplied_" .. lane(c)] and target == side and c.reorganize then
			c.tacticPower = math.max(c.tacticPower or 0, 1)
			c.anchored, c.shaken, c.reorganize = nil, nil, nil
		end
		c.deployCover = nil
		msg = string.format("%s을(를) %s 줄에 냈다", c.name, B.ROW_NAME[lane(c)])
		if fused then
			msg ..= " (합치기! 재료 둘이 하나가 됐다. 낸 카드 수에 세지 않는다)"
		elseif c.cause and B.chainActive(m, side, c) then
			msg ..= " (연쇄! 점수 +2)"
		end
		local role = c.starterRole
		if role == "pierce" or role == "vanguard" then
			local enemy = strongestInRow(m, foe, "melee", true)
			if enemy then
				if role == "pierce" then enemy.cover, enemy.deployCover, enemy.ironUsed = nil, nil, true end
				boostCard(enemy, if role == "pierce" then -2 else -1)
			end
		elseif role == "rearGuard" or role == "rally" then
			for _, ally in m.rows[side][lane(c)] do
				if ally ~= c and not ally.hero then
					if role == "rearGuard" then ally.cover = true else boostCard(ally, 1) end
					break
				end
			end
		elseif role == "mobilize" then
			local otherRow = if lane(c) == "melee" then "ranged" else "melee"
			if #m.rows[side][otherRow] == 0 then boostCard(c, 1) end
		elseif role == "evacuate" and #m.hand[side] < B.HAND_MAX then
			for _, row in B.ROWS do
				local picked = false
				for index, ally in m.rows[side][row] do
					if not ally.hero and ally.rubiconRound ~= m.round and (ally.tacticPower or 0) < 0 then
						ally.tacticPower, ally.anchored, ally.shaken, ally.pendingReturn = nil, nil, nil, nil
						ally.cover, ally.ironUsed, ally.charges, ally.starterUsed = nil, nil, nil, nil
						if ally.sealedAbility then ally.ability, ally.sealedAbility = (if ally.sealedAbility == "starterOnly" then nil else ally.sealedAbility), nil; ally.pigForm = nil end
						table.insert(m.hand[side], table.remove(m.rows[side][row], index))
						msg ..= " (대상단 회수: " .. ally.name .. ")"
						picked = true
						break
					end
				end
				if picked then break end
			end
		elseif role == "survey" and #m.hand[side] < B.HAND_MAX then
			local deck = m.deck[side]
			local count = #deck
			if count > 0 then
				local index = if count > 1 and (deck[count - 1].power or 0) > (deck[count].power or 0) then count - 1 else count
				table.insert(m.hand[side], table.remove(deck, index))
			end
		end
		if target == side and c.category == "선박" and hasTactic(m, side, "gajahMada") then
			local key = "palapa_" .. c.id
			if not tactics[key] then
				tactics[key] = true
				tactics.palapaMarks = (tactics.palapaMarks or 0) + 1
				logLine(m, "가자 마다: 맹세 " .. tostring(tactics.palapaMarks))
			end
		end
		if c.ability == "egyptChariot" then
			local front = strongestInRow(m, foe, "melee", true)
			if front then boostCard(front, -2) end
			if hasTactic(m, side, "ramesses") then
				local rear = strongestInRow(m, foe, "ranged", true)
				if rear then boostCard(rear, -1) end
			end
		elseif c.ability == "anansi" then
			local stolen
			if enemyTactics.strait == m.round and tactics.strait ~= m.round then
				tactics.strait, enemyTactics.strait = enemyTactics.strait, nil
				tactics.straitDelayed, enemyTactics.straitDelayed = enemyTactics.straitDelayed, nil
				stolen = "말라카 기습"
			elseif enemyTactics.rallyFlag == m.round and tactics.rallyFlag ~= m.round then
				tactics.rallyFlag, enemyTactics.rallyFlag = enemyTactics.rallyFlag, nil
				stolen = "마자파힛 깃발"
			elseif m.plans and m.plans[foe].ambush == m.round and m.plans[side].ambush ~= m.round then
				m.plans[side].ambush, m.plans[foe].ambush = m.round, nil
				stolen = "전열 매복"
			end
			if stolen then msg ..= " (아난시가 " .. stolen .. "을 가로챘다)" end
		elseif c.ability == "savannaElephant" or c.ability == "savannaZebra" then
			local partner
			for _, ally in m.rows[side][lane(c)] do
				if ally ~= c and ally.savanna and not ally.pigForm then partner = ally; break end
			end
			if c.ability == "savannaElephant" then
				local protected = partner or c
				protected.cover = true
			elseif partner then
				boostCard(c, 1)
				boostCard(partner, 1)
			end
		elseif c.ability == "savannaLion" then
			local damage = 2
			for _, row in B.ROWS do
				for _, ally in m.rows[side][row] do
					if ally ~= c and ally.savanna and not ally.pigForm then damage = 3; break end
				end
			end
			local enemy = strongestInRow(m, foe, "melee", true)
			if enemy then boostCard(enemy, -damage) end
		elseif c.ability == "savannaGiraffe" then
			local deck = m.deck[side]
			for index = #deck, math.max(1, #deck - 1), -1 do
				if deck[index].savanna and #m.hand[side] < B.HAND_MAX then
					table.insert(m.hand[side], table.remove(deck, index))
					break
				end
			end
		elseif c.ability == "urChariot" then
			local damage = 1
			for _, ally in m.rows[side].melee do
				if ally.ability == "urStandard" then damage = 3; break end
			end
			local enemy = strongestInRow(m, foe, "melee", true)
			if enemy then boostCard(enemy, -damage) end
		elseif c.ability == "mactanGuard" then
			local target, power = c, nil
			for index, ally in m.rows[side].melee do
				local current = B.cardPower(m, side, "melee", index)
				if ally ~= c and not ally.hero and (not power or current < power) then target, power = ally, current end
			end
			target.cover = true
		elseif c.ability == "anaconda" then
			local target = strongestInRow(m, foe, "melee", true)
			if target then target.anchored = true end
		elseif c.ability == "apache" then
			local forecast = enemyTactics.strait == m.round
			for _, ship in m.rows[foe].ranged do
				if ship.starterRole == "bombard" and not ship.starterUsed and not ship.sealedAbility then forecast = true end
			end
			logLine(m, if forecast then "아파치 정찰대: 상대 후열 포격 예고" else "아파치 정찰대: 예고 포격 없음")
			local target, source, index, power
			for _, row in B.ROWS do
				for i, ally in m.rows[side][row] do
					if ally == c or ally.hero or ally.anchored or ally.pendingReturn then continue end
					local current = B.cardPower(m, side, row, i)
					if not power or current < power then target, source, index, power = ally, row, i, current end
				end
			end
			if target then
				local destination = if source == "melee" then "ranged" else "melee"
				table.insert(m.rows[side][destination], table.remove(m.rows[side][source], index))
				if destination == "melee" then cavalryArrival(m, side, target)
				else canalArrival(m, side, target) end
				resolveHorns(m, side, destination)
			end
		elseif c.ability == "bachDangLure" then
			local front = m.rows[foe].melee
			local index, power
			for i, target in front do
				if target.hero or target.anchored or target.pendingReturn then continue end
				local current = B.cardPower(m, foe, "melee", i)
				if not power or current < power then index, power = i, current end
			end
			if index then
				local target = table.remove(front, index)
				target.bachDangRound, target.bachDangSide = m.round, side
				table.insert(m.rows[foe].ranged, target)
				msg ..= " (적을 후열로 유인)"
			end
		elseif c.ability == "gilgamesh" or c.ability == "enkidu" then
			local partner = if c.ability == "gilgamesh" then "enkidu" else "gilgamesh"
			for _, row in B.ROWS do
				for _, ally in m.rows[side][row] do
					if ally.ability == partner then ally.cover, c.cover = true, true end
				end
			end
		elseif c.ability == "orleans" then
			local row = m.rows[side][lane(c)]
			local wounded, loss, attack = nil, 0, 2
			for _, ally in row do
				if ally.id == "eu_31" and not ally.sealedAbility then attack = 3 end
				local penalty = ally.tacticPower or 0
				if ally ~= c and not ally.hero and penalty < loss then wounded, loss = ally, penalty end
			end
			if wounded then wounded.tacticPower = nil end
			local target = strongestInRow(m, foe, "melee", true)
			if target then boostCard(target, -attack) end
			table.remove(row, table.find(row, c))
			msg = "오를레앙 구원: 치유와 약화 후 소멸"
		elseif c.ability == "humbaba" then
			local target = strongestInRow(m, foe, "melee", true)
			if target then boostCard(target, -3) end
		elseif c.ability == "saladinCavalry" then
			local target, power
			for i, enemy in m.rows[foe].melee do
				local current = B.cardPower(m, foe, "melee", i)
				if not enemy.hero and (enemy.anchored or enemy.hattinRound == m.round) and (not power or current > power) then target, power = enemy, current end
			end
			if target then boostCard(target, -2) end
		elseif c.ability == "ishida" then
			local target, power
			for i, enemy in m.rows[side].melee do
				local current = B.cardPower(m, side, "melee", i)
				if enemy.pendingReturn == foe and (not power or current < power) then target, power = enemy, current end
			end
			if target then boostCard(target, -2)
			else
				local ally = weakestAlly(m, side, "melee", nil)
				if ally then ally.cover = true end
			end
		elseif c.ability == "eastWind" then
			m.weather = { melee = false, ranged = false, cannon = false }
			msg ..= " (동남풍: 악천후 해제)"
		elseif c.ability == "musketeerAid" then
			for _, ally in m.rows[side][lane(c)] do
				if ally ~= c and isMusketeer(ally) then ally.cover = true; break end
			end
		elseif c.ability == "rats" then
			local back = m.rows[foe].ranged
			local index, power
			for i, ally in back do
				local current = B.cardPower(m, foe, "ranged", i)
				if not ally.hero and not ally.anchored and not ally.pendingReturn and (not power or current < power) then index, power = i, current end
			end
			if index then table.insert(m.rows[foe].melee, table.remove(back, index)) end
		elseif c.ability == "quixote" then
			local front = m.rows[foe].melee
			local target
			for _, enemy in front do
				if enemy.ability == "windmill" then target = enemy; break end
			end
			target = target or strongestInRow(m, foe, "melee", true)
			if target then boostCard(target, if hasTactic(m, side, "rocinante") then -3 else -2) end
		elseif c.ability == "pigHex" then
			local target = strongestInRow(m, foe, "ranged")
			if target and not target.pigForm then
				target.sealedAbility = target.sealedAbility or target.ability or "starterOnly"
				target.ability, target.pigForm = nil, true
			end
		elseif c.ability == "sirenSong" then
			for _, row in B.ROWS do
				for _, enemy in m.rows[foe][row] do boostCard(enemy, -1) end
			end
		elseif c.ability == "unweave" then
			if enemyTactics.strait == m.round then
				enemyTactics.straitDelayed = true
			else
				for _, enemy in m.rows[foe].ranged do
					if enemy.starterRole == "bombard" and not enemy.starterUsed then
						enemy.bombardDelayed = true
						break
					end
				end
			end
		elseif c.ability == "witchCurse" or c.ability == "witchBind" or c.ability == "monkeyStrike" then
			local target = strongestInRow(m, foe, if c.ability == "monkeyStrike" then "melee" else "ranged", c.ability ~= "witchBind")
			if target then
				if c.ability == "witchBind" then target.shaken = true
				else boostCard(target, if c.ability == "monkeyStrike" then -2 else -1) end
			end
		elseif c.ability == "witchGuard" or c.ability == "pigGuard" or c.ability == "sandCleanse" then
			local ally, power
			for _, row in B.ROWS do
				for index, candidate in m.rows[side][row] do
					local current = B.cardPower(m, side, row, index)
					local eligible = c.ability ~= "witchGuard" or (row == lane(c) and (candidate.id == "lo_48" or candidate.id == "lo_49" or candidate.id == "lo_50"))
					if eligible and candidate ~= c and not candidate.hero and (not power or current < power) then ally, power = candidate, current end
				end
			end
			if ally then
				if c.ability == "sandCleanse" then cleanseTactic(ally)
				else ally.cover = true end
			end
		elseif c.ability == "relay" then
			if swapFormation(m, side) then msg ..= " (전술 교대!)" end
		elseif c.ability == "chaski" then
			if previousDeployment and previousDeployment ~= lane(c) then
				drawCards(m, side, 1)
				msg ..= " (잉카 도로망: 전령이 카드 한 장을 가져왔다)"
			end
		elseif c.ability == "spy" then
			local n = if m.faction and m.faction[side] == "new_world" then 3 else 2
			drawCards(m, side, n)
			msg ..= string.format(" (첩자: 카드 %d장을 뽑았다)", n)
		elseif c.ability == "snipe" then
			local fside, frow, fi = snipeTarget(m, side)
			if fside then
				local dead = m.rows[fside][frow][fi]
				removeHits(m, { { fside, frow, fi, single = true } }, side)
				msg ..= string.format(" (저격: %s 쓰러뜨림)", dead.name)
			end
		elseif c.ability == "medic" then
			local best, bi = nil, nil
			for i, g in m.grave[side] do
				if not g.hero and not g.special and (not best or g.power > best.power) then
					best, bi = g, i
				end
			end
			if best then
				table.remove(m.grave[side], bi)
				table.insert(m.rows[side][lane(best)], best)
				msg ..= string.format(" (치료: %s 되살림)", best.name)
			end
		end
	end
	if c.special == "truce" or c.special == "assassinate" or c.special == "dispatch"
		or c.special == "riverRoute" or c.special == "rallyFlag" or c.special == "strait" or c.special == "dollCurse" then
		table.insert(m.grave[side], played)
	end
	if played ~= c then msg = "따라 하기: " .. msg end
	if played.special or played.hero or played.ability == "spy" or played.ability == "feigned" then
		tactics.lastDeployment, tactics.quipuCount, tactics.quipuRow = nil, nil, nil
	end
	if frontScore and B.rowTotal(m, side, "melee") < frontScore then
		tactics.retreat = m.round
		msg ..= " (감조계 준비!)"
	end
	lakotaRetreat(m, foe, mobility)
	if resolveCounter(m, foe, scores) then msg ..= " (상대 역습!)" end
	finishTactics(m, side, played)
	logLine(m, (if side == "me" then "우리: " else "해적: ") .. msg)
	nextTurn(m, side)
	local act = { "p", handIdx }
	local result = nil
	m.played[side] = (m.played[side] or 0) + (if c.fused then 0 else 1)
	if (#m.hand[side] == 0 or m.played[side] >= B.ROUND_CARDS) and not m.passed[side] then
		-- 손패가 없거나 한 판 카드 수를 다 쓰면 자동으로 멈춘다
		m.passed[side] = true
		if m.passed[other(side)] then
			result = roundEnd(m)
		else
			m.turn = other(side)
		end
	end
	if not result then beginTurn(m, m.turn) end
	return true, msg, result, act, played
end

function B.pass(m: any, side)
	if m.over or m.turn ~= side or m.passed[side] then
		return false, "지금은 멈출 수 없어요"
	end
	m.passed[side] = true
	for _, row in B.ROWS do
		for _, c in m.rows[side][row] do
			if c.ability == "lastOrder" then
				local target = weakestAlly(m, side, nil, nil)
				if target then
					boostCard(target, 3)
					logLine(m, "최후 명령: " .. target.name .. " +3")
				end
			end
		end
	end
	finishTactics(m, side, false)
	logLine(m, (if side == "me" then "우리: " else "해적: ") .. "이번 판은 여기까지")
	if m.passed[other(side)] then
		return true, "양쪽이 멈췄다", roundEnd(m), { "s" }
	end
	beginTurn(m, other(side))
	return true, "멈췄다", nil, { "s" }
end

-- 멀리건: 첫 판에서 카드를 내기 전에 손패 한 장을 덱 맨 아래로 돌려보내고 새로 한 장 뽑는다 (총 B.MULLIGAN장)
function B.mulligan(m: any, side, handIdx)
	if m.over or m.round ~= 1 or (m.played[side] or 0) > 0 then
		return false, "지금은 바꿀 수 없어요"
	end
	if ((m.mulligan or {})[side] or 0) <= 0 then
		return false, "바꿀 수 있는 장수를 다 썼어요"
	end
	local c = m.hand[side][handIdx]
	if not c or #m.deck[side] == 0 then
		return false, "바꿀 카드가 없어요"
	end
	table.remove(m.hand[side], handIdx)
	table.insert(m.deck[side], 1, c) -- 덱 맨 아래 (뽑는 쪽은 끝)
	drawCards(m, side, 1)
	m.mulligan[side] -= 1
	local msg = string.format("손패 교체: %s을(를) 돌려보내고 새 카드를 뽑았다 (남은 교체 %d장)", c.name, m.mulligan[side])
	logLine(m, (if side == "me" then "우리: " else "해적: ") .. msg)
	return true, msg, nil, { "m", handIdx }
end

function B.useLeader(m: any, side)
	if m.over or m.turn ~= side or m.leaderUsed[side] then
		return false, "지금은 쓸 수 없어요"
	end
	local id = m.leader[side]
	local ld = B.Leaders[id]
	local fx = if ld and ld.fx then ld.fx else id
	local nm = if ld then ld.name else id
	local opponent = other(side)
	local scores = counterScores(m, opponent)
	local mobility = lakotaSnapshot(m, opponent)
	local msg
	if fx == "mercy" then
		if #m.hand[side] >= B.HAND_MAX then return false, "손패가 가득 찼어요" end
		local pile = m.grave[side]
		local index, power
		for i, card in pile do
			if not card.hero and not card.special and B.Units[card.id] and (not power or card.power > power) then
				index, power = i, card.power
			end
		end
		if not index then return false, "돌려받을 일반 유닛이 없어요" end
		local fallen = table.remove(pile, index)
		local recalled = copy(B.Units[fallen.id])
		recalled.power, recalled.tier = fallen.power, fallen.tier
		table.insert(m.hand[side], recalled)
		msg = "살라딘의 자비: " .. recalled.name .. " 회수"
	elseif fx == "release" then
		local target, sourceRow, index, power
		for _, row in B.ROWS do
			for i, card in m.rows[side][row] do
				if card.hero or (card.pendingReturn and card.pendingReturn ~= side)
					or not (card.sealedAbility or card.anchored) then continue end
				local current = B.cardPower(m, side, row, i)
				if not power or current < power then target, sourceRow, index, power = card, row, i, current end
			end
		end
		if not target then return false, "봉인되거나 이동이 제한된 아군이 없어요" end
		if target.sealedAbility then
			target.ability = if target.sealedAbility == "starterOnly" then nil else target.sealedAbility
			target.sealedAbility, target.pigForm = nil, nil
		end
		target.anchored = nil
		local destination = if sourceRow == "melee" then "ranged" else "melee"
		table.insert(m.rows[side][destination], table.remove(m.rows[side][sourceRow], index))
		if destination == "ranged" then canalArrival(m, side, target) end
		resolveHorns(m, side, destination)
		msg = "키루스의 귀환 허용: " .. target.name .. " 이동"
	elseif fx == "draw" then
		drawCards(m, side, 1)
		msg = "지휘: 카드를 한 장 더 뽑았다"
	elseif fx == "clear" then
		m.weather = { melee = false, ranged = false, cannon = false }
		msg = "항로 개척: 날씨가 걷혔다"
	elseif fx == "hornRanged" or fx == "hornMelee" then
		local row = if fx == "hornRanged" then "ranged" else "melee"
		m.horn[side][row] = true
		msg = string.format("%s: %s 점수가 두 배!", nm, B.ROW_NAME[row])
	elseif fx == "draw2" then
		drawCards(m, side, 2)
		msg = nm .. ": 카드를 두 장 뽑았다"
	elseif fx == "bonusMelee" then
		m.rowBonus[side].melee = (m.rowBonus[side].melee or 0) + 1
		msg = nm .. ": 전열이 모두 +1"
	elseif fx == "restore" then
		m.refuted[side] = {}
		msg = nm .. ": 끊긴 연쇄가 되살아났다"
	elseif fx == "armadaVolley" then
		local fleet, galleon = {}, nil
		for _, ally in m.rows[side].ranged do
			if ally.category == "선박" and not ally.pigForm then
				table.insert(fleet, ally)
				if ally.starterRole == "armadaGalleon" and not ally.sealedAbility then galleon = ally end
			end
		end
		if #fleet == 0 then return false, "후열에 함선이 없어요" end
		local targets = {}
		for i, enemy in m.rows[opponent].ranged do
			if not enemy.hero then
				table.insert(targets, { index = i, power = B.cardPower(m, opponent, "ranged", i) })
			end
		end
		table.sort(targets, function(a, b)
			if a.power == b.power then return a.index < b.index end
			return a.power > b.power
		end)
		local front = if galleon then strongestInRow(m, opponent, "melee") else nil
		if #targets == 0 and not front then return false, "포격할 상대 유닛이 없어요" end
		local shots = {}
		for i = 1, math.min(#fleet, 3, #targets) do
			local target = m.rows[opponent].ranged[targets[i].index]
			boostCard(target, -2)
			table.insert(shots, { ship = fleet[i], target = target })
		end
		if front then
			local target = strongestInRow(m, opponent, "melee", true)
			boostCard(target, -1)
			table.insert(shots, { ship = galleon, target = target })
		end
		m.armadaShots = shots
		msg = "엘리자베스 1세: 함대 연쇄포격"
	elseif fx == "clearBonusRanged" then
		m.weather = { melee = false, ranged = false, cannon = false }
		m.rowBonus[side].ranged = (m.rowBonus[side].ranged or 0) + 1
		msg = nm .. ": 날씨가 걷히고 후열이 +1"
	else
		local best, hits = strongestNonHero(m, { other(side) })
		if best > 0 then
			-- 동점이면 첫 하나만
			hits[1].single = true
			removeHits(m, { hits[1] }, side)
			msg = string.format("%s: 상대의 가장 센 카드(%d)를 쓰러뜨렸다", if fx == "snipe" and nm ~= "snipe" then nm else "저격", best)
		else
			msg = "저격 — 맞힐 카드가 없었다"
		end
	end
	m.leaderUsed[side] = true
	lakotaRetreat(m, opponent, mobility)
	if resolveCounter(m, opponent, scores) then msg ..= " (상대 역습!)" end
	logLine(m, (if side == "me" then "우리 " else "해적 ") .. msg)
	return true, msg, nil, { "l" }
end

-- 컴퓨터(해적)의 한 수: 이기고 있으면 멈추고, 지고 있으면 가장 효율 좋은 카드를 낸다
-- 카드 한 장을 내면 (내 점수 - 상대 점수)가 얼마나 달라질지 미리 계산한다 (AI 판단과 '추천 수' 표시가 같이 쓴다)
function B.gainOf(m: any, side, c)
	local foe = other(side)
	local mine, theirs = B.total(m, side), B.total(m, foe)
	local gain
	if c.special == "scorch" then
		local best, hits = strongestNonHero(m, { "me", "foe" })
		local lost = 0
		for _, h in hits do
			lost += (if h[1] == side then -1 else 1) * B.cardPower(m, h[1], h[2], h[3])
		end
		gain = if best >= 6 then lost else -5
	elseif c.special == "weather" then
		local before = B.total(m, side) - B.total(m, foe)
		local prev = m.weather[lane(c)] -- 미리 계산하다 이미 깔린 날씨를 지우지 않도록 원래 값으로 되돌린다
		m.weather[lane(c)] = true
		local after = B.total(m, side) - B.total(m, foe)
		m.weather[lane(c)] = prev
		gain = after - before
	elseif c.special == "clear" then
		local before = B.total(m, side) - B.total(m, foe)
		local saved = { melee = m.weather.melee, ranged = m.weather.ranged, cannon = m.weather.cannon }
		m.weather = { melee = false, ranged = false, cannon = false }
		local after = B.total(m, side) - B.total(m, foe)
		m.weather = saved
		gain = after - before
	elseif c.special == "wind" then
		local before = B.total(m, side) - B.total(m, foe)
		local saved = { melee = m.weather.melee, ranged = m.weather.ranged, cannon = m.weather.cannon }
		m.weather = { melee = false, ranged = false, cannon = false }
		local after = B.total(m, side) - B.total(m, foe)
		m.weather = saved
		gain = after - before + 2
	elseif c.special == "horn" then
		local row = bestHornRow(m, side)
		if row then
			local before = B.total(m, side) - B.total(m, foe)
			m.horn[side][row] = true
			local after = B.total(m, side) - B.total(m, foe)
			m.horn[side][row] = nil
			gain = after - before
		else
			gain = -5
		end
	elseif c.special == "refute" then
		m.refuted = m.refuted or { me = {}, foe = {} }
		local kind = c.refuteKind or ""
		local before = B.total(m, side) - B.total(m, foe)
		local prev = m.refuted[foe][kind]
		m.refuted[foe][kind] = true
		local after = B.total(m, side) - B.total(m, foe)
		m.refuted[foe][kind] = prev
		gain = if after > before then after - before else -3
	elseif c.special == "decoy" then
		local pick = decoyTarget(m, side)
		gain = if pick and pick.score >= 100 then 3 else -4
	elseif c.special == "redCliffFire" then
		local state = m.tactics and m.tactics[side]
		local front = if strongestInRow(m, foe, "melee") then (if hasTactic(m, side, "fireCommand") then 3 else 2) else 0
		local rear = if strongestInRow(m, foe, "ranged") then
			(if state and state.huangReturned == m.round then 2 else 0) + (if hasTactic(m, side, "eastWind") then 1 else 0)
			else 0
		gain = if front + rear > 0 then front + rear else -3
	elseif c.special == "assassinate" then
		gain = if strongestInRow(m, foe, "melee") then 2 else -3
	elseif c.special == "strait" then
		gain = if strongestInRow(m, foe, "ranged") and #m.hand[side] > 1 then 2 else 0
	elseif c.special == "dispatch" then
		local deck = m.deck[side]
		gain = -3
		for i = #deck, math.max(1, #deck - 1), -1 do
			if not deck[i].hero and not deck[i].special then gain = 2; break end
		end
	elseif c.special then
		gain = 0
	else
		local target = if c.ability == "spy" or c.ability == "feigned" or c.ability == "defect" then foe else side
		local before = B.total(m, side) - B.total(m, foe)
		table.insert(m.rows[target][lane(c)], c)
		local after = B.total(m, side) - B.total(m, foe)
		table.remove(m.rows[target][lane(c)])
		gain = after - before
		if c.ability == "spy" then
			gain += 4 -- 카드 2장을 뽑는 값
		elseif c.ability == "snipe" then
			local fside, _, _, bp = snipeTarget(m, side)
			if fside then
				gain += bp
			end
		end
		-- 센 카드는 아끼고 작은 카드부터 쓴다 (앞서고 있을 때)
		if mine >= theirs then
			gain -= c.power * 0.4
		end
	end
	return gain
end

function B.ai(m: any, side)
	if m.over or m.turn ~= side or m.passed[side] then
		return nil
	end
	local foe = other(side)
	local mine, theirs = B.total(m, side), B.total(m, foe)
	-- 상대가 멈췄고 내가 앞서면 바로 멈춰 이긴다
	if m.passed[foe] and mine > theirs then
		return B.pass(m, side)
	end
	-- 두 판을 이겼거나 카드가 아깝다면 크게 앞설 때 멈춘다
	local margin = (B.STYLES[m.style and m.style[side] or "steady"] or B.STYLES.steady).margin
	if mine > theirs + margin and m.wins[side] + m.wins[foe] > 0 then
		return B.pass(m, side)
	end
	if not m.leaderUsed[side] and #m.hand[side] <= 4 and not m.passed[foe] then
		local ok, message, result, action = B.useLeader(m, side)
		if ok then return ok, message, result, action end
	end
	-- 점수를 가장 많이 올리는 카드 찾기 (미리 내 보고 계산한 뒤 되돌린다)
	local bestI, bestGain = nil, -1e9
	for i, c in m.hand[side] do
		local gain = B.gainOf(m, side, c)
		if gain > bestGain then
			bestI, bestGain = i, gain
		end
	end
	if not bestI then
		return B.pass(m, side)
	end
	if mine > theirs and bestGain <= 0 then
		return B.pass(m, side)
	end
	return B.play(m, side, bestI)
end


-- ── 해전 카드: 포격전(선체 대 선체)과 접현전을 같은 규칙으로 치른다 ─────────────────────
-- 시드 난수: 클라이언트와 서버가 같은 패·같은 선공으로 시작해, 서버가 기록(actions)만 보고 승패를 다시 계산한다.
function B.seeded(seed)
	local s = (math.floor(tonumber(seed) or 1) % 2147483646) + 1
	return function()
		s = (s * 48271) % 2147483647
		return (s - 1) / 2147483646
	end
end

local ROW_NAMES = {
	boarding = { melee = "전열", ranged = "후열", cannon = "후열" },
	gunnery = { melee = "충각", ranged = "포격", cannon = "포격" },
}
-- 화면에 쓰는 줄 이름을 전투 종류에 맞게 바꾼다
function B.useKind(kind)
	for row, name in ROW_NAMES[kind] or ROW_NAMES.boarding do
		B.ROW_NAME[row] = name
	end
end

-- 포격전 덱: 배의 능력(함포 수·포 위력·승조원·충각)이 곧 카드가 된다.
-- f = { cannons, cannonMult, crew, hull, level }
function B.gunneryDeck(f, deckCards, rng, isBoss)
	local out = {}
	local function add(def, n, power, name)
		for _ = 1, n do
			local c = copy(def)
			if power then c.power = power end
			if name then c.name = name end
			table.insert(out, c)
		end
	end
	local cannons = math.max(1, f.cannons or 4)
	local mult = f.cannonMult or 1
	local lvBonus = math.floor((f.level or 1) / 6)
	local gun = math.clamp(math.floor(2 + mult * 2 + lvBonus), 3, 9)
	add(B.Units.gunner, math.clamp(math.floor(cannons / 4 + 0.5), 3, 8), gun, "함포")
	add(B.Units.swivel, 2, math.clamp(gun - 1, 2, 8), "선회포")
	if cannons >= 16 then add(B.Units.culverin, if cannons >= 40 then 2 else 1, gun * 2, "장거리포") end
	local crew = f.crew or 20
	add(B.Units.musketeer, math.clamp(math.floor(crew / 18 + 0.5), 2, 5), 4 + lvBonus, "소총수")
	add(B.Units.sharpshooter, 1, 6 + lvBonus, "저격수")
	add(B.Units.scout, 2, nil, "망루병")
	add(B.Units.swordsman, 2, 5 + lvBonus, "충각 돌격")
	add(B.Units.surgeon, 1, nil, "응급 수리공")
	add(B.Units.shieldman, 1, nil, "방패 갑판병")
	table.insert(out, copy(B.Specials.storm))
	table.insert(out, copy(B.Specials.fog))
	table.insert(out, copy(B.Specials.clear))
	local leader = "draw"
	if deckCards then
		-- 게임에서 얻은 카드(영웅·특수)도 그대로 들어온다
		local extra, lead = B.playerDeck(deckCards, rng)
		for _, c in extra do
			if c.hero or c.special then table.insert(out, c) end
		end
		leader = lead
	end
	if isBoss then
		add(B.Units.culverin, 1, gun * 2 + 2, "괴수의 일격")
		table.insert(out, copy(B.Specials.scorch))
		leader = "snipe"
	end
	return shuffle(out, rng), leader
end

-- 한 판의 시작: 클라이언트(화면)와 서버(검증)가 똑같이 부른다. 시드가 같으면 패·선공이 같다.
--   kind: "gunnery" | "boarding"   my = { fighter, deckCards }   foe = { fighter, boss }
function B.build(kind, seed, my, foe)
	local rng = B.seeded(seed)
	local foeFac = foe.faction or (if foe.boss then nil else B.foeFaction(seed))
	local myDeck, myLeader, foeDeck, foeLeader
	if kind == "gunnery" then
		myDeck, myLeader = B.gunneryDeck(my.fighter or {}, my.deckCards, B.seeded(seed + 7), false)
		foeDeck, foeLeader = B.gunneryDeck(foe.fighter or {}, nil, B.seeded(seed + 13), foe.boss == true)
	else
		myDeck, myLeader = B.playerDeck(my.deckCards, B.seeded(seed + 7), my.faction, my.book)
		foeDeck, foeLeader = B.enemyDeck(foe.boss == true, B.seeded(seed + 13), foeFac)
	end
	-- 학문 숙련 보너스: 지식 카드를 모은 만큼 같은 계열 병종 카드의 부대 점수가 오른다 (영웅·특수 카드는 제외)
	local kb = my.book and my.book.bonus
	if kb then
		for _, c in myDeck do
			if c.power and not c.hero and not c.special and kb[c.row] then
				c.power += kb[c.row]
			end
		end
	end
	local m = B.newMatch(shuffle(myDeck, rng), myLeader, shuffle(foeDeck, rng), foeLeader, rng, my.faction, foeFac)
	m.sea = B.seaRule(seed)
	m.style.foe = B.foeStyle(seed)
	applySea(m)
	return m
end

-- 서버 검증: 시드와 플레이어의 행동 기록으로 한 판을 처음부터 다시 돌린다.
-- 규칙에 어긋나거나 끝나지 않으면 nil. 반환: { winner = "me"|"foe"|"draw", wins = {me, foe} }
function B.replay(kind, seed, my, foe, actions)
	local m = B.build(kind, seed, my, foe)
	local i, guard = 1, 0
	while not m.over do
		guard += 1
		if guard > 400 then return nil end
		if m.turn == "foe" then
			if not B.ai(m, "foe") then return nil end
		else
			local a = actions[i]
			i += 1
			if type(a) ~= "table" then return nil end
			local ok
			if a[1] == "p" then ok = B.play(m, "me", math.floor(tonumber(a[2]) or 0))
			elseif a[1] == "s" then ok = B.pass(m, "me")
			elseif a[1] == "l" then ok = B.useLeader(m, "me")
			elseif a[1] == "m" then ok = B.mulligan(m, "me", math.floor(tonumber(a[2]) or 0))
			end
			if not ok then return nil end
		end
	end
	if actions[i] ~= nil then return nil end
	return { winner = m.winner, wins = { me = m.wins.me, foe = m.wins.foe } }
end


-- ── 도움말: 추천 수, 적 정찰, 동료 조언 ───────────────────────────────────────────
-- 손패 번호 → 그 카드를 냈을 때 점수 차(내 점수 - 상대 점수) 변화. 추천 수 표시에 쓴다.
function B.hint(m: any, side)
	local out, bestI, bestGain = {}, nil, -1e9
	for i, c in m.hand[side] do
		local g = B.gainOf(m, side, c)
		out[i] = math.floor(g + 0.5)
		if g > bestGain then bestI, bestGain = i, g end
	end
	return out, bestI
end

-- 출항 전 정찰: 적의 문화권·성격·해역 규칙·약한 줄을 알려 준다
function B.scout(seed, foe)
	local foeFac = foe and foe.faction or (if foe and foe.boss then nil else B.foeFaction(seed))
	local deck = B.enemyDeck(foe and foe.boss == true, B.seeded(seed + 13), foeFac)
	local rows = { melee = 0, ranged = 0 }
	for _, c in deck do
		if c.row and c.power then rows[lane(c)] += c.power end
	end
	local weak, weakV = "melee", 1e9
	for _, r in B.ROWS do
		if rows[r] < weakV then weak, weakV = r, rows[r] end
	end
	local sea = B.seaRule(seed)
	local style = B.STYLES[B.foeStyle(seed)]
	return {
		faction = foeFac and B.Factions[foeFac] and B.Factions[foeFac].name or "해적 두목",
		style = style.name, styleText = style.text, sea = sea.name, seaText = sea.text,
		weakRow = weak, weakName = B.ROW_NAME[weak], counterRow = if weak == "melee" then "ranged" else "melee",
	}
end

-- 동료 조언: 지금 상황에 맞는 한마디 (없으면 nil). 한 판에 한 번만 보이도록 부르는 쪽이 조절한다.
function B.advice(m: any, side)
	if m.over or m.turn ~= side or m.passed[side] then return nil end
	local foe = other(side)
	local mine, theirs = B.total(m, side), B.total(m, foe)
	local _, bestI = B.hint(m, side)
	if m.passed[foe] and mine > theirs then
		return "상대가 멈췄어요. 지금 멈추면 이번 판은 우리 거예요!"
	end
	if m.passed[foe] and mine <= theirs and #m.hand[side] > 0 then
		return "상대가 멈췄어요. 이기려면 지금 점수를 넘겨야 해요."
	end
	if theirs > mine + 12 then
		for _, c in m.hand[side] do
			if c.special == "scorch" or c.ability == "snipe" then
				return "많이 밀려요. 소각이나 저격수로 가장 센 카드를 노려 보세요."
			end
		end
		return "점수가 크게 밀려요. 이번 판을 버리고 다음 판을 노리는 것도 방법이에요."
	end
	for _, row in B.ROWS do
		local _, adv, dis = B.rowMatchup(m, side, row)
		if dis and #m.rows[side][row] > 0 then
			return string.format("%s 줄이 상성에서 밀려요. 상성이 맞는 줄에 카드를 내 보세요.", B.ROW_NAME[row])
		end
	end
	if bestI and #m.hand[side] <= 3 and m.wins[side] + m.wins[foe] == 0 then
		return "손패가 얼마 안 남았어요. 첫 판은 아끼고 멈추는 것도 좋아요."
	end
	return nil
end

local function copyUnit(id)
	local d = B.Units[id] or B.Specials[id]
	if not d then return nil end
	return copy(d)
end

-- ── 오늘의 해전 퍼즐: 상대가 이미 멈춘 판에서, 정해진 패로 카드 몇 장 안에 이겨라 ──────────────────
local function copyMatch(m)
	local function cloneCard(c) return table.clone(c) end
	local function cloneList(l)
		local out = {}
		for i, c in l do out[i] = cloneCard(c) end
		return out
	end
	local n = table.clone(m)
	n.lastTactic = table.clone(m.lastTactic or {})
	n.counterRound = table.clone(m.counterRound or {})
	n.tactics = { me = table.clone((m.tactics or {}).me or {}), foe = table.clone((m.tactics or {}).foe or {}) }
	n.plans = { me = table.clone((m.plans or {}).me or {}), foe = table.clone((m.plans or {}).foe or {}) }
	n.rows, n.hand, n.deck, n.grave = {}, {}, {}, {}
	for _, side in { "me", "foe" } do
		n.rows[side] = {}
		for _, row in B.ROWS do n.rows[side][row] = cloneList(m.rows[side][row]) end
		n.hand[side] = cloneList(m.hand[side])
		n.deck[side] = cloneList(m.deck[side])
		n.grave[side] = cloneList(m.grave[side])
	end
	n.weather = table.clone(m.weather)
	n.horn = { me = table.clone(m.horn.me), foe = table.clone(m.horn.foe) }
	n.wins, n.passed, n.leaderUsed = table.clone(m.wins), table.clone(m.passed), table.clone(m.leaderUsed)
	n.played = table.clone(m.played or { me = 0, foe = 0 })
	n.mulligan = table.clone(m.mulligan or { me = 0, foe = 0 })
	n.rowBonus = { me = table.clone((m.rowBonus or {}).me or {}), foe = table.clone((m.rowBonus or {}).foe or {}) }
	n.refuted = { me = table.clone((m.refuted or {}).me or {}), foe = table.clone((m.refuted or {}).foe or {}) }
	n.log = {}
	return n
end

local PUZZLE_POOL = { "swordsman", "axeman", "pikeman", "pikeman", "shieldman", "boatswain", "surgeon", "musketeer", "musketeer", "sharpshooter", "gunner", "gunner", "swivel", "culverin", "ironclad", "sniper", "horn", "wind", "scorch", "scout" }

-- 하루 하나. 같은 날이면 모두 같은 문제 (day = 1970년부터 센 날수)
function B.puzzle(day: number)
	for attempt = 0, 120 do
		local rng = B.seeded(day * 7919 + 13 + attempt * 104729)
		local function pick() return PUZZLE_POOL[math.floor(rng() * #PUZZLE_POOL) + 1] end
		local m = B.newMatch({}, "draw", {}, "draw", rng, nil, nil)
		m.turn = "me"
		-- 상대 판: 카드 3~5장을 이미 깔고 멈췄다
		for _ = 1, 3 + math.floor(rng() * 3) do
			local c = copyUnit(pick())
			if c and not c.special then table.insert(m.rows.foe[lane(c)], c) end
		end
		-- 내 판: 이미 깔린 카드 1~2장
		for _ = 1, 1 + math.floor(rng() * 2) do
			local c = copyUnit(pick())
			if c and not c.special then table.insert(m.rows.me[lane(c)], c) end
		end
		for _ = 1, 5 do
			local c = copyUnit(pick())
			if c then table.insert(m.hand.me, c) end
		end
		m.passed.foe = true
		m.round, m.wins = 3, { me = 1, foe = 1 } -- 이 판이 끝나면 전투 끝
		-- 풀이 찾기: 손패 순서를 모두 시도해 가장 적은 장수를 구한다
		local best = nil
		local function search(state, used)
			if best and used >= best then return end
			if B.total(state, "me") > B.total(state, "foe") and used > 0 then
				best = used
				return
			end
			if used >= 3 then return end
			for i = 1, #state.hand.me do
				local nm = copyMatch(state)
				nm.turn = "me"
				local ok = B.play(nm, "me", i)
				if ok then search(nm, used + 1) end
			end
		end
		if B.total(m, "me") <= B.total(m, "foe") then
			search(m, 0)
			if best and best >= 2 then
				m.puzzle = { day = day, limit = best }
				return m, best
			end
		end
	end
	return nil, 0
end

-- 서버 확인: 오늘 문제에 대한 행동 기록이 규칙을 지키고 제한 안에서 이겼는가
function B.puzzleReplay(day: number, actions: { any }): boolean
	local m, limit = B.puzzle(day)
	if not m then return false end
	local plays = 0
	for _, a in actions do
		if type(a) ~= "table" then return false end
		if a[1] == "p" then
			plays += 1
			if plays > limit then return false end
			if not B.play(m, "me", math.floor(tonumber(a[2]) or 0)) then return false end
		elseif a[1] == "s" then
			if not B.pass(m, "me") then return false end
		else
			return false
		end
		if m.over then break end
	end
	if not m.over then
		B.pass(m, "me")
	end
	return m.over == true and m.winner == "me"
end

return B
