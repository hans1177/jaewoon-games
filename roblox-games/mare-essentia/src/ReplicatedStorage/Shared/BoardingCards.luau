--!nonstrict
-- 접현 카드 전투 규칙 (Roblox API 없음: Luau CLI에서 그대로 시험한다).
-- 두 배가 맞닿으면 갑판 위 부대를 카드로 늘어놓고 겨룬다. 3줄(근접·사격·포) × 3판 2선승.
--   병종 상성: 근접 > 포 (접현하면 포는 쓸모없다) / 포 > 사격 (포탄이 총병 무리를 쓸어낸다) / 사격 > 근접 (다가오는 칼잡이를 쏜다)
--   유리한 상대 줄이 있으면 내 줄 합계 ×1.3, 나를 이기는 상대 줄이 있으면 ×0.85
--   무기 상성(근접끼리): 검 > 도끼 > 창 > 검, 유리하면 +1 / 불리하면 -1
--   능력: 결속(같은 이름끼리 곱) · 사기(같은 줄 +1) · 첩자(적 줄에 놓고 2장 뽑기) · 치료(버린 카드 되살림) · 영웅(날씨·소각·사기 면역)
--   특수: 소각(가장 센 비영웅 제거) · 안개/폭풍/혼전(줄 하나를 1로) · 맑음(날씨 해제)
local B = {}

B.ROWS = { "melee", "ranged", "cannon" }
B.ROW_NAME = { melee = "근접", ranged = "사격", cannon = "포" }
B.ROW_BEATS = { melee = "cannon", cannon = "ranged", ranged = "melee" }
B.WEAPON_BEATS = { sword = "axe", axe = "spear", spear = "sword" }
B.ADV, B.DIS = 1.3, 0.85
B.HAND = 10

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
-- 지도자 능력 (한 판당 한 번)
B.Leaders = {
	draw = { id = "draw", name = "지휘", text = "카드 한 장을 더 뽑는다" },
	clear = { id = "clear", name = "항로 개척", text = "날씨를 걷어 낸다" },
	snipe = { id = "snipe", name = "저격", text = "적의 가장 센 비영웅 카드 하나를 쓰러뜨린다" },
}

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
B.Units.eu_01 = { id="eu_01", name="카라벨", category="선박", lore="포르투갈 원양 탐사의 기동성 높은 소형 범선", stage={ art="CardArt/event_title_ship", motion="wind", scene="카라벨", prop={"Naval","ship-small"} }, row="ranged", power=4, weapon="gun", ability="spy" }
B.Units.eu_02 = { id="eu_02", name="카라크", category="선박", lore="먼바다 무역과 장거리 항해에 쓰인 대형 범선", stage={ art="CardArt/event_title_ship", motion="fire", scene="카라크" }, row="cannon", power=5, weapon="cannon", ability="bond" }
B.Units.eu_03 = { id="eu_03", name="갈레온", category="선박", lore="함포 배치를 강화한 대서양 대형 군선", stage={ art="CardArt/event_title_ship", motion="fire", scene="갈레온", prop={"Naval","ship-pirate-large"} }, row="cannon", power=6, weapon="cannon", ability="armor" }
B.Units.eu_04 = { id="eu_04", name="코그", category="선박", lore="중세 북유럽과 발트해의 상선", stage={ art="CardArt/event_title_ship", motion="board", scene="코그" }, row="melee", power=5, weapon="sword", ability="bond" }
B.Units.eu_05 = { id="eu_05", name="플루이트", category="선박", lore="네덜란드의 화물 적재 중심 범선", stage={ art="CardArt/event_title_ship", motion="wind", scene="플루이트", prop={"Naval","ship-medium"} }, row="ranged", power=4, weapon="gun", ability="spy" }
B.Units.eu_06 = { id="eu_06", name="프리깃", category="선박", lore="정찰과 기동전에 뛰어난 유럽 군함", stage={ art="CardArt/event_title_ship", motion="fire", scene="프리깃", prop={"Naval","ship-large"} }, row="cannon", power=7, weapon="cannon", ability="bond" }
B.Units.eu_07 = { id="eu_07", name="브리간틴", category="선박", lore="유럽의 선박 유산 · 브리간틴", stage={ art="CardArt/event_title_ship", motion="board", scene="브리간틴" }, row="melee", power=5, weapon="sword", ability="morale" }
B.Units.eu_08 = { id="eu_08", name="피나스", category="선박", lore="유럽의 선박 유산 · 피나스", stage={ art="CardArt/event_title_ship", motion="wind", scene="피나스" }, row="ranged", power=4, weapon="gun", ability="spy" }
B.Units.eu_09 = { id="eu_09", name="지중해 갤리선", category="선박", lore="유럽의 선박 유산 · 지중해 갤리선", stage={ art="CardArt/event_title_ship", motion="board", scene="지중해 갤리선" }, row="melee", power=6, weapon="spear" }
B.Units.eu_10 = { id="eu_10", name="전열함", category="선박", lore="측면 함포를 층층이 배치한 대형 군함", stage={ art="CardArt/event_title_ship", motion="fire", scene="전열함" }, row="cannon", power=9, hero=true }
B.Units.eu_11 = { id="eu_11", name="포르투갈 항해용 천문반", category="유물", lore="유럽의 유물 유산 · 포르투갈 항해용 천문반", stage={ art="CardArt/event_chart_west_europe", motion="scout", scene="포르투갈 항해용 천문반" }, row="ranged", power=3, weapon="gun", ability="spy" }
B.Units.eu_12 = { id="eu_12", name="무라노 유리", category="유물", lore="유럽의 유물 유산 · 무라노 유리", stage={ art="CardArt/event_chart_west_europe", motion="scout", scene="무라노 유리" }, row="melee", power=4, weapon="axe", ability="morale" }
B.Units.eu_13 = { id="eu_13", name="스페인 레알 은화", category="유물", lore="유럽의 유물 유산 · 스페인 레알 은화", stage={ art="CardArt/event_chart_west_europe", motion="scout", scene="스페인 레알 은화" }, row="ranged", power=4, weapon="gun", ability="morale" }
B.Units.eu_14 = { id="eu_14", name="델프트 청화도기", category="유물", lore="유럽의 유물 유산 · 델프트 청화도기", stage={ art="CardArt/event_chart_west_europe", motion="scout", scene="델프트 청화도기" }, row="melee", power=4, weapon="sword", ability="armor" }
B.Units.eu_15 = { id="eu_15", name="로마 군단 방패", category="유물", lore="유럽의 유물 유산 · 로마 군단 방패", stage={ art="CardArt/event_chart_west_europe", motion="scout", scene="로마 군단 방패" }, row="cannon", power=5, weapon="cannon", ability="bond" }
B.Units.eu_16 = { id="eu_16", name="켈트 황금 토크", category="유물", lore="유럽의 유물 유산 · 켈트 황금 토크", stage={ art="CardArt/event_chart_west_europe", motion="scout", scene="켈트 황금 토크" }, row="ranged", power=3, weapon="gun", ability="spy" }
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
B.Units.eu_28 = { id="eu_28", name="베네치아 운하", category="지형·원더", lore="유럽의 지형·원더 유산 · 베네치아 운하", stage={ art="CardArt/event_canal_opened", motion="clear", scene="베네치아 운하" }, row="ranged", power=4, weapon="gun" }
B.Units.eu_29 = { id="eu_29", name="노르웨이 피오르", category="지형·원더", lore="유럽의 지형·원더 유산 · 노르웨이 피오르", stage={ art="CardArt/event_chart_west_europe", motion="clear", scene="노르웨이 피오르" }, row="melee", power=5, weapon="spear" }
B.Specials.eu_30 = { id="eu_30", name="북해 안개", category="지형·원더", lore="북해 항로의 시야를 가리는 안개", stage={ art="CardArt/event_calm_seas", motion="storm", scene="북해 안개" }, special="weather", text="해당 전투 줄의 일반 카드 전투력을 1로 낮춘다", row="ranged" }
B.Units.ea_01 = { id="ea_01", name="판옥선", category="선박", lore="넓은 갑판과 함포를 갖춘 조선 수군 전투선", stage={ art="CardArt/event_chart_east_asia", motion="fire", scene="판옥선" }, row="cannon", power=4, weapon="cannon", ability="spy" }
B.Units.ea_02 = { id="ea_02", name="거북선", category="선박", lore="덮개형 상갑판이 특징인 조선 전투선", stage={ art="CardArt/event_chart_east_asia", motion="fire", scene="거북선" }, row="cannon", power=5, weapon="cannon", ability="bond" }
B.Units.ea_03 = { id="ea_03", name="조선 세견선", category="선박", lore="동아시아의 선박 유산 · 조선 세견선", stage={ art="CardArt/event_chart_east_asia", motion="wind", scene="조선 세견선" }, row="ranged", power=6, weapon="gun", ability="armor" }
B.Units.ea_04 = { id="ea_04", name="명나라 복선", category="선박", lore="동아시아의 선박 유산 · 명나라 복선", stage={ art="CardArt/event_chart_east_asia", motion="fire", scene="명나라 복선" }, row="cannon", power=5, weapon="cannon", ability="bond" }
B.Units.ea_05 = { id="ea_05", name="명나라 사선", category="선박", lore="동아시아의 선박 유산 · 명나라 사선", stage={ art="CardArt/event_chart_east_asia", motion="wind", scene="명나라 사선" }, row="ranged", power=4, weapon="gun", ability="spy" }
B.Units.ea_06 = { id="ea_06", name="중국 정크선", category="선박", lore="동아시아의 전통적인 돛살 범선", stage={ art="CardArt/event_chart_east_asia", motion="wind", scene="중국 정크선" }, row="ranged", power=7, weapon="gun", ability="bond" }
B.Units.ea_07 = { id="ea_07", name="명나라 보선", category="선박", lore="명대 대규모 원양항해에 쓰인 선박", stage={ art="CardArt/event_chart_east_asia", motion="wind", scene="명나라 보선" }, row="ranged", power=5, weapon="gun", ability="morale" }
B.Units.ea_08 = { id="ea_08", name="아타케부네", category="선박", lore="일본 전국시대의 대형 전투선", stage={ art="CardArt/event_chart_east_asia", motion="board", scene="아타케부네" }, row="melee", power=4, weapon="axe", ability="spy" }
B.Units.ea_09 = { id="ea_09", name="세키부네", category="선박", lore="일본 전국시대의 중형 전투선", stage={ art="CardArt/event_chart_east_asia", motion="board", scene="세키부네" }, row="melee", power=6, weapon="spear" }
B.Units.ea_10 = { id="ea_10", name="고바야", category="선박", lore="일본의 빠른 소형 전투선", stage={ art="CardArt/event_chart_east_asia", motion="wind", scene="고바야" }, row="ranged", power=9, hero=true }
B.Units.ea_11 = { id="ea_11", name="고려 청자", category="유물", lore="동아시아의 유물 유산 · 고려 청자", stage={ art="CardArt/event_chart_east_asia", motion="scout", scene="고려 청자" }, row="ranged", power=3, weapon="gun", ability="spy" }
B.Units.ea_12 = { id="ea_12", name="조선 백자 달항아리", category="유물", lore="동아시아의 유물 유산 · 조선 백자 달항아리", stage={ art="CardArt/event_chart_east_asia", motion="scout", scene="조선 백자 달항아리" }, row="melee", power=4, weapon="axe", ability="morale" }
B.Units.ea_13 = { id="ea_13", name="명대 청화백자", category="유물", lore="동아시아의 유물 유산 · 명대 청화백자", stage={ art="CardArt/event_chart_east_asia", motion="scout", scene="명대 청화백자" }, row="ranged", power=4, weapon="gun", ability="morale" }
B.Units.ea_14 = { id="ea_14", name="일본 칠기함", category="유물", lore="동아시아의 유물 유산 · 일본 칠기함", stage={ art="CardArt/event_chart_east_asia", motion="scout", scene="일본 칠기함" }, row="melee", power=4, weapon="sword", ability="armor" }
B.Units.ea_15 = { id="ea_15", name="중국 옥벽", category="유물", lore="동아시아의 유물 유산 · 중국 옥벽", stage={ art="CardArt/event_chart_east_asia", motion="scout", scene="중국 옥벽" }, row="cannon", power=5, weapon="cannon", ability="bond" }
B.Units.ea_16 = { id="ea_16", name="류큐 칠기", category="유물", lore="동아시아의 유물 유산 · 류큐 칠기", stage={ art="CardArt/event_chart_east_asia", motion="scout", scene="류큐 칠기" }, row="ranged", power=3, weapon="gun", ability="spy" }
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
B.Units.me_01 = { id="me_01", name="아라비아 다우선", category="선박", lore="아라비아해의 전통적인 삼각돛 목선", stage={ art="CardArt/event_chart_mediterranean", motion="wind", scene="아라비아 다우선" }, row="ranged", power=4, weapon="gun", ability="spy" }
B.Units.me_02 = { id="me_02", name="바갈라", category="선박", lore="페르시아만과 인도양을 누비던 대형 교역선", stage={ art="CardArt/event_chart_mediterranean", motion="wind", scene="바갈라" }, row="ranged", power=5, weapon="gun", ability="bond" }
B.Units.me_03 = { id="me_03", name="붐선", category="선박", lore="페르시아만의 장거리 화물 범선", stage={ art="CardArt/event_chart_mediterranean", motion="wind", scene="붐선" }, row="ranged", power=6, weapon="gun", ability="armor" }
B.Units.me_04 = { id="me_04", name="삼부크", category="선박", lore="홍해·아라비아해 연안의 교역선", stage={ art="CardArt/event_chart_mediterranean", motion="wind", scene="삼부크" }, row="ranged", power=5, weapon="gun", ability="bond" }
B.Units.me_05 = { id="me_05", name="잘붓", category="선박", lore="중동의 선박 유산 · 잘붓", stage={ art="CardArt/event_chart_mediterranean", motion="wind", scene="잘붓" }, row="ranged", power=4, weapon="gun", ability="spy" }
B.Units.me_06 = { id="me_06", name="간자", category="선박", lore="중동의 선박 유산 · 간자", stage={ art="CardArt/event_chart_mediterranean", motion="wind", scene="간자" }, row="ranged", power=7, weapon="gun", ability="bond" }
B.Units.me_07 = { id="me_07", name="오스만 갤리선", category="선박", lore="노와 돛을 병용한 오스만 해군 전투선", stage={ art="CardArt/event_chart_mediterranean", motion="fire", scene="오스만 갤리선" }, row="cannon", power=5, weapon="cannon", ability="morale" }
B.Units.me_08 = { id="me_08", name="세벡선", category="선박", lore="지중해에서 활약한 날렵한 삼각돛 선박", stage={ art="CardArt/event_chart_mediterranean", motion="fire", scene="세벡선" }, row="cannon", power=4, weapon="cannon", ability="spy" }
B.Units.me_09 = { id="me_09", name="자루크", category="선박", lore="중동의 선박 유산 · 자루크", stage={ art="CardArt/event_chart_mediterranean", motion="board", scene="자루크" }, row="melee", power=6, weapon="spear" }
B.Units.me_10 = { id="me_10", name="바텔라", category="선박", lore="중동의 선박 유산 · 바텔라", stage={ art="CardArt/event_chart_mediterranean", motion="wind", scene="바텔라" }, row="ranged", power=9, hero=true }
B.Units.me_11 = { id="me_11", name="페르시아 황동 천문반", category="유물", lore="중동의 유물 유산 · 페르시아 황동 천문반", stage={ art="CardArt/event_chart_mediterranean", motion="scout", scene="페르시아 황동 천문반" }, row="ranged", power=3, weapon="gun", ability="spy" }
B.Units.me_12 = { id="me_12", name="이즈니크 타일", category="유물", lore="중동의 유물 유산 · 이즈니크 타일", stage={ art="CardArt/event_chart_mediterranean", motion="scout", scene="이즈니크 타일" }, row="melee", power=4, weapon="axe", ability="morale" }
B.Units.me_13 = { id="me_13", name="다마스쿠스 강철검", category="유물", lore="중동의 유물 유산 · 다마스쿠스 강철검", stage={ art="CardArt/event_chart_mediterranean", motion="scout", scene="다마스쿠스 강철검" }, row="ranged", power=4, weapon="gun", ability="morale" }
B.Units.me_14 = { id="me_14", name="페르시아 양탄자", category="유물", lore="중동의 유물 유산 · 페르시아 양탄자", stage={ art="CardArt/event_chart_mediterranean", motion="scout", scene="페르시아 양탄자" }, row="melee", power=4, weapon="sword", ability="armor" }
B.Units.me_15 = { id="me_15", name="오스만 도자기 향로", category="유물", lore="중동의 유물 유산 · 오스만 도자기 향로", stage={ art="CardArt/event_chart_mediterranean", motion="scout", scene="오스만 도자기 향로" }, row="cannon", power=5, weapon="cannon", ability="bond" }
B.Units.me_16 = { id="me_16", name="사산 왕조 은접시", category="유물", lore="중동의 유물 유산 · 사산 왕조 은접시", stage={ art="CardArt/event_chart_mediterranean", motion="scout", scene="사산 왕조 은접시" }, row="ranged", power=3, weapon="gun", ability="spy" }
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
B.Units.nw_01 = { id="nw_01", name="카리브 전투 카누", category="선박", lore="카리브해의 해상 기동용 노젓는 카누", stage={ art="CardArt/event_chart_south_america", motion="board", scene="카리브 전투 카누" }, row="melee", power=4, weapon="sword", ability="spy" }
B.Units.nw_02 = { id="nw_02", name="카리브 대형 카누", category="선박", lore="신대륙의 선박 유산 · 카리브 대형 카누", stage={ art="CardArt/event_chart_south_america", motion="wind", scene="카리브 대형 카누" }, row="ranged", power=5, weapon="gun", ability="spy" }
B.Units.nw_03 = { id="nw_03", name="마야 교역 카누", category="선박", lore="중앙아메리카 연안과 하천을 오가던 교역 카누", stage={ art="CardArt/event_chart_south_america", motion="wind", scene="마야 교역 카누" }, row="ranged", power=6, weapon="gun", ability="bond" }
B.Units.nw_04 = { id="nw_04", name="아즈텍 전투 카누", category="선박", lore="멕시코 고원 호수에서 사용한 전투용 카누", stage={ art="CardArt/event_chart_south_america", motion="board", scene="아즈텍 전투 카누" }, row="melee", power=5, weapon="sword", ability="morale" }
B.Units.nw_05 = { id="nw_05", name="잉카 발사 뗏목", category="선박", lore="발사나무로 만든 안데스 해안의 교역 뗏목", stage={ art="CardArt/event_chart_south_america", motion="wind", scene="잉카 발사 뗏목" }, row="ranged", power=4, weapon="gun" }
B.Units.nw_06 = { id="nw_06", name="티티카카 갈대배", category="선박", lore="안데스 고원 호수의 갈대 선박", stage={ art="CardArt/event_chart_south_america", motion="board", scene="티티카카 갈대배" }, row="melee", power=7, weapon="spear" }
B.Units.nw_07 = { id="nw_07", name="아마존 통나무배", category="선박", lore="신대륙의 선박 유산 · 아마존 통나무배", stage={ art="CardArt/event_chart_south_america", motion="wind", scene="아마존 통나무배", prop={"Terrain","canoe"} }, row="ranged", power=5, weapon="gun" }
B.Units.nw_08 = { id="nw_08", name="마푸체 카누", category="선박", lore="신대륙의 선박 유산 · 마푸체 카누", stage={ art="CardArt/event_chart_south_america", motion="board", scene="마푸체 카누" }, row="melee", power=4, weapon="axe" }
B.Units.nw_09 = { id="nw_09", name="이누이트 카약", category="선박", lore="북극권에서 사냥과 이동에 쓰인 소형 배", stage={ art="CardArt/event_chart_south_america", motion="wind", scene="이누이트 카약" }, row="ranged", power=6, weapon="gun", ability="spy" }
B.Units.nw_10 = { id="nw_10", name="북서해안 삼나무 카누", category="선박", lore="신대륙의 선박 유산 · 북서해안 삼나무 카누", stage={ art="CardArt/event_chart_south_america", motion="board", scene="북서해안 삼나무 카누" }, row="melee", power=9, hero=true }
B.Units.nw_11 = { id="nw_11", name="아즈텍 태양석", category="유물", lore="신대륙의 유물 유산 · 아즈텍 태양석", stage={ art="CardArt/event_chart_south_america", motion="scout", scene="아즈텍 태양석" }, row="ranged", power=3, weapon="gun", ability="spy" }
B.Units.nw_12 = { id="nw_12", name="마야 비취 가면", category="유물", lore="신대륙의 유물 유산 · 마야 비취 가면", stage={ art="CardArt/event_chart_south_america", motion="scout", scene="마야 비취 가면" }, row="melee", power=4, weapon="axe", ability="morale" }
B.Units.nw_13 = { id="nw_13", name="잉카 키푸", category="유물", lore="신대륙의 유물 유산 · 잉카 키푸", stage={ art="CardArt/event_chart_south_america", motion="scout", scene="잉카 키푸" }, row="ranged", power=4, weapon="gun", ability="morale" }
B.Units.nw_14 = { id="nw_14", name="모체 금가면", category="유물", lore="신대륙의 유물 유산 · 모체 금가면", stage={ art="CardArt/event_chart_south_america", motion="scout", scene="모체 금가면" }, row="melee", power=4, weapon="sword", ability="armor" }
B.Units.nw_15 = { id="nw_15", name="올메카 거대 석두", category="유물", lore="신대륙의 유물 유산 · 올메카 거대 석두", stage={ art="CardArt/event_chart_south_america", motion="scout", scene="올메카 거대 석두" }, row="cannon", power=5, weapon="cannon", ability="bond" }
B.Units.nw_16 = { id="nw_16", name="나스카 직물", category="유물", lore="신대륙의 유물 유산 · 나스카 직물", stage={ art="CardArt/event_chart_south_america", motion="scout", scene="나스카 직물" }, row="ranged", power=3, weapon="gun", ability="spy" }
B.Specials.nw_17 = { id="nw_17", name="안데스 전령 나팔", category="유물", lore="신대륙의 유물 유산 · 안데스 전령 나팔", stage={ art="CardArt/event_chart_south_america", motion="scout", scene="안데스 전령 나팔" }, special="horn", text="내 가장 센 줄의 일반 카드 점수가 두 배" }
B.Units.nw_18 = { id="nw_18", name="재규어", category="동물", lore="신대륙의 동물 유산 · 재규어", stage={ art="CardArt/event_chart_south_america", motion="pounce", scene="재규어" }, row="melee", power=7, weapon="sword" }
B.Units.nw_19 = { id="nw_19", name="라마", category="동물", lore="신대륙의 동물 유산 · 라마", stage={ art="CardArt/event_chart_south_america", motion="gallop", scene="라마", prop={"Animals","llama"} }, row="melee", power=5, weapon="axe", ability="morale" }
B.Units.nw_20 = { id="nw_20", name="아메리카들소", category="동물", lore="신대륙의 동물 유산 · 아메리카들소", stage={ art="CardArt/event_chart_south_america", motion="pounce", scene="아메리카들소" }, row="ranged", power=4, weapon="gun", ability="spy" }
B.Units.nw_21 = { id="nw_21", name="큰부리새", category="동물", lore="신대륙의 동물 유산 · 큰부리새", stage={ art="CardArt/event_chart_south_america", motion="gallop", scene="큰부리새" }, row="melee", power=6, weapon="sword" }
B.Units.nw_22 = { id="nw_22", name="카피바라", category="동물", lore="신대륙의 동물 유산 · 카피바라", stage={ art="CardArt/event_chart_south_america", motion="pounce", scene="카피바라" }, row="melee", power=5, weapon="axe", ability="armor" }
B.Units.nw_23 = { id="nw_23", name="안데스콘도르", category="동물", lore="신대륙의 동물 유산 · 안데스콘도르", stage={ art="CardArt/event_chart_south_america", motion="gallop", scene="안데스콘도르" }, row="ranged", power=4, weapon="gun", ability="bond" }
B.Units.nw_24 = { id="nw_24", name="마추픽추", category="지형·원더", lore="안데스 고산에 남은 잉카의 석조 도시", stage={ art="CardArt/event_machu_picchu", motion="clear", scene="마추픽추" }, row="melee", power=9, hero=true }
B.Units.nw_25 = { id="nw_25", name="치첸이트사", category="지형·원더", lore="유카탄반도의 마야 도시 유적", stage={ art="CardArt/event_chichen", motion="clear", scene="치첸이트사" }, row="melee", power=5, weapon="axe", ability="armor" }
B.Units.nw_26 = { id="nw_26", name="테오티우아칸", category="지형·원더", lore="신대륙의 지형·원더 유산 · 테오티우아칸", stage={ art="CardArt/event_chart_south_america", motion="clear", scene="테오티우아칸" }, row="cannon", power=5, weapon="cannon", ability="morale" }
B.Specials.nw_27 = { id="nw_27", name="아마존 강", category="지형·원더", lore="남아메리카 대륙을 가로지르는 대하천", stage={ art="CardArt/event_chart_south_america", motion="wind", scene="아마존 강" }, special="wind", text="날씨를 걷어 내고 카드를 한 장 뽑는다" }
B.Units.nw_28 = { id="nw_28", name="이과수 폭포", category="지형·원더", lore="신대륙의 지형·원더 유산 · 이과수 폭포", stage={ art="CardArt/event_chart_south_america", motion="clear", scene="이과수 폭포" }, row="ranged", power=4, weapon="gun" }
B.Units.nw_29 = { id="nw_29", name="안데스산맥", category="지형·원더", lore="신대륙의 지형·원더 유산 · 안데스산맥", stage={ art="CardArt/event_chart_south_america", motion="clear", scene="안데스산맥" }, row="melee", power=5, weapon="spear" }
B.Specials.nw_30 = { id="nw_30", name="카리브 허리케인", category="지형·원더", lore="열대 해역의 항해와 포격을 방해하는 폭풍", stage={ art="CardArt/event_hurricane", motion="storm", scene="카리브 허리케인" }, special="weather", text="해당 전투 줄의 일반 카드 전투력을 1로 낮춘다", row="cannon" }
B.Units.af_01 = { id="af_01", name="스와힐리 므테페", category="선박", lore="동아프리카 해안의 전통적인 돛배", stage={ art="CardArt/event_chart_west_africa", motion="board", scene="스와힐리 므테페" }, row="melee", power=4, weapon="sword", ability="spy" }
B.Units.af_02 = { id="af_02", name="잔지바르 다우선", category="선박", lore="스와힐리 연안과 인도양을 잇는 무역선", stage={ art="CardArt/event_zanzibar", motion="wind", scene="잔지바르 다우선" }, row="ranged", power=5, weapon="gun", ability="spy" }
B.Units.af_03 = { id="af_03", name="나일 펠루카", category="선박", lore="이집트 나일강의 작은 삼각돛배", stage={ art="CardArt/event_chart_west_africa", motion="wind", scene="나일 펠루카" }, row="ranged", power=6, weapon="gun", ability="bond" }
B.Units.af_04 = { id="af_04", name="나일 파피루스배", category="선박", lore="파피루스로 엮어 만든 고대 이집트 배", stage={ art="CardArt/event_chart_west_africa", motion="board", scene="나일 파피루스배" }, row="melee", power=5, weapon="sword", ability="morale" }
B.Units.af_05 = { id="af_05", name="누비아 돛배", category="선박", lore="아프리카의 선박 유산 · 누비아 돛배", stage={ art="CardArt/event_chart_west_africa", motion="board", scene="누비아 돛배" }, row="melee", power=4, weapon="axe" }
B.Units.af_06 = { id="af_06", name="세네갈 피로그", category="선박", lore="서아프리카 연안의 긴 카누", stage={ art="CardArt/event_chart_west_africa", motion="wind", scene="세네갈 피로그" }, row="ranged", power=7, weapon="gun" }
B.Units.af_07 = { id="af_07", name="기니만 전투 카누", category="선박", lore="아프리카의 선박 유산 · 기니만 전투 카누", stage={ art="CardArt/event_chart_west_africa", motion="board", scene="기니만 전투 카누" }, row="melee", power=5, weapon="sword" }
B.Units.af_08 = { id="af_08", name="콩고 강 카누", category="선박", lore="콩고강의 강상 이동에 쓰는 통나무배", stage={ art="CardArt/event_chart_west_africa", motion="wind", scene="콩고 강 카누", prop={"Terrain","canoe"} }, row="ranged", power=4, weapon="gun" }
B.Units.af_09 = { id="af_09", name="마다가스카르 아웃리거", category="선박", lore="아프리카의 선박 유산 · 마다가스카르 아웃리거", stage={ art="CardArt/event_chart_west_africa", motion="wind", scene="마다가스카르 아웃리거" }, row="ranged", power=6, weapon="gun", ability="spy" }
B.Units.af_10 = { id="af_10", name="동아프리카 무역 다우", category="선박", lore="아프리카의 선박 유산 · 동아프리카 무역 다우", stage={ art="CardArt/event_chart_west_africa", motion="fire", scene="동아프리카 무역 다우" }, row="cannon", power=9, hero=true }
B.Units.af_11 = { id="af_11", name="베냉 청동판", category="유물", lore="아프리카의 유물 유산 · 베냉 청동판", stage={ art="CardArt/event_chart_west_africa", motion="scout", scene="베냉 청동판" }, row="ranged", power=3, weapon="gun", ability="spy" }
B.Units.af_12 = { id="af_12", name="아샨티 금추", category="유물", lore="아프리카의 유물 유산 · 아샨티 금추", stage={ art="CardArt/event_chart_west_africa", motion="scout", scene="아샨티 금추" }, row="melee", power=4, weapon="axe", ability="morale" }
B.Units.af_13 = { id="af_13", name="에티오피아 석십자가", category="유물", lore="아프리카의 유물 유산 · 에티오피아 석십자가", stage={ art="CardArt/event_chart_west_africa", motion="scout", scene="에티오피아 석십자가" }, row="ranged", power=4, weapon="gun", ability="morale" }
B.Units.af_14 = { id="af_14", name="이집트 파피루스 두루마리", category="유물", lore="아프리카의 유물 유산 · 이집트 파피루스 두루마리", stage={ art="CardArt/event_chart_west_africa", motion="scout", scene="이집트 파피루스 두루마리" }, row="melee", power=4, weapon="sword", ability="armor" }
B.Units.af_15 = { id="af_15", name="요루바 구슬 왕관", category="유물", lore="아프리카의 유물 유산 · 요루바 구슬 왕관", stage={ art="CardArt/event_chart_west_africa", motion="scout", scene="요루바 구슬 왕관" }, row="cannon", power=5, weapon="cannon", ability="bond" }
B.Units.af_16 = { id="af_16", name="누비아 금장식", category="유물", lore="아프리카의 유물 유산 · 누비아 금장식", stage={ art="CardArt/event_chart_west_africa", motion="scout", scene="누비아 금장식" }, row="ranged", power=3, weapon="gun", ability="spy" }
B.Specials.af_17 = { id="af_17", name="아샨티 의장 북", category="유물", lore="아프리카의 유물 유산 · 아샨티 의장 북", stage={ art="CardArt/event_chart_west_africa", motion="scout", scene="아샨티 의장 북" }, special="horn", text="내 가장 센 줄의 일반 카드 점수가 두 배" }
B.Units.af_18 = { id="af_18", name="아프리카 코끼리", category="동물", lore="아프리카의 동물 유산 · 아프리카 코끼리", stage={ art="CardArt/event_chart_west_africa", motion="pounce", scene="아프리카 코끼리", prop={"Animals","elephant"} }, row="melee", power=7, weapon="sword" }
B.Units.af_19 = { id="af_19", name="아프리카사자", category="동물", lore="아프리카의 동물 유산 · 아프리카사자", stage={ art="CardArt/event_chart_west_africa", motion="gallop", scene="아프리카사자" }, row="melee", power=5, weapon="axe", ability="morale" }
B.Units.af_20 = { id="af_20", name="기린", category="동물", lore="아프리카의 동물 유산 · 기린", stage={ art="CardArt/event_chart_west_africa", motion="pounce", scene="기린" }, row="ranged", power=4, weapon="gun", ability="spy" }
B.Units.af_21 = { id="af_21", name="하마", category="동물", lore="아프리카의 동물 유산 · 하마", stage={ art="CardArt/event_chart_west_africa", motion="gallop", scene="하마" }, row="melee", power=6, weapon="sword" }
B.Units.af_22 = { id="af_22", name="검은코뿔소", category="동물", lore="아프리카의 동물 유산 · 검은코뿔소", stage={ art="CardArt/event_chart_west_africa", motion="pounce", scene="검은코뿔소" }, row="melee", power=5, weapon="axe", ability="armor" }
B.Units.af_23 = { id="af_23", name="얼룩말", category="동물", lore="아프리카의 동물 유산 · 얼룩말", stage={ art="CardArt/event_chart_west_africa", motion="gallop", scene="얼룩말" }, row="ranged", power=4, weapon="gun", ability="bond" }
B.Units.af_24 = { id="af_24", name="기자 피라미드", category="지형·원더", lore="고대 이집트 왕국의 거대한 왕릉", stage={ art="CardArt/event_giza", motion="clear", scene="기자 피라미드" }, row="melee", power=9, hero=true }
B.Units.af_25 = { id="af_25", name="그레이트 짐바브웨", category="지형·원더", lore="남부 아프리카의 거대한 석조 도시 유적", stage={ art="CardArt/event_zimbabwe", motion="clear", scene="그레이트 짐바브웨" }, row="melee", power=5, weapon="axe", ability="armor" }
B.Units.af_26 = { id="af_26", name="빅토리아 폭포", category="지형·원더", lore="아프리카의 지형·원더 유산 · 빅토리아 폭포", stage={ art="CardArt/event_chart_west_africa", motion="clear", scene="빅토리아 폭포" }, row="cannon", power=5, weapon="cannon", ability="morale" }
B.Specials.af_27 = { id="af_27", name="사하라 사막", category="지형·원더", lore="아프리카의 지형·원더 유산 · 사하라 사막", stage={ art="CardArt/event_chart_west_africa", motion="storm", scene="사하라 사막" }, special="weather", text="해당 전투 줄의 일반 카드 전투력을 1로 낮춘다", row="melee" }
B.Units.af_28 = { id="af_28", name="킬리만자로", category="지형·원더", lore="아프리카의 지형·원더 유산 · 킬리만자로", stage={ art="CardArt/event_chart_west_africa", motion="clear", scene="킬리만자로" }, row="ranged", power=4, weapon="gun" }
B.Specials.af_29 = { id="af_29", name="벵겔라 해류", category="지형·원더", lore="아프리카 남서 해안을 따라 흐르는 찬 해류", stage={ art="CardArt/event_chart_west_africa", motion="wind", scene="벵겔라 해류" }, special="wind", text="날씨를 걷어 내고 카드를 한 장 뽑는다" }
B.Specials.af_30 = { id="af_30", name="하르마탄 바람", category="지형·원더", lore="서아프리카에 먼지와 건조한 공기를 보내는 바람", stage={ art="CardArt/event_drought", motion="storm", scene="하르마탄 바람" }, special="weather", text="해당 전투 줄의 일반 카드 전투력을 1로 낮춘다", row="ranged" }

-- [다국어 카드 도감] 카드 ID와 전투 규칙은 불변. 원본 한국어 이름/설명은 카드 데이터에 보존한다.
-- 다른 국가 공용 화면에서 사용하는 영어 제목/설명. 이미지에는 문자를 넣지 않는다.
B.CardEnglish = {
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
	eu_15 = { name = "Roman Legionary Shield", lore = "A curved military shield associated with ancient Roman legions." },
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
	eu_28 = { name = "Venetian Canals", lore = "Waterways linking the islands and trading quarters of Venice." },
	eu_29 = { name = "Norwegian Fjords", lore = "Deep glacial inlets cut into Norway's rugged coast." },
	eu_30 = { name = "North Sea Fog", lore = "A blanket of sea fog that obscures the northern trade routes." },
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
	nw_13 = { name = "Inca Quipu", lore = "An arrangement of knotted cords used to record information." },
	nw_14 = { name = "Moche Gold Mask", lore = "An elaborate metal mask of ancient coastal Peru." },
	nw_15 = { name = "Olmec Colossal Head", lore = "A monumental stone head carved by the Olmec civilization." },
	nw_16 = { name = "Nazca Textile", lore = "A woven textile made by ancient artisans of coastal Peru." },
	nw_17 = { name = "Andean Messenger Trumpet", lore = "A ceremonial horn used to sound signals across the Andes." },
	nw_18 = { name = "Jaguar", lore = "A powerful spotted cat of the tropical Americas." },
	nw_19 = { name = "Llama", lore = "A hardy domesticated camelid of the Andes." },
	nw_20 = { name = "American Bison", lore = "A massive grazing animal of North American grasslands." },
	nw_21 = { name = "Toucan", lore = "A tropical bird recognized by its large colorful bill." },
	nw_22 = { name = "Capybara", lore = "A large semi-aquatic rodent of South America." },
	nw_23 = { name = "Andean Condor", lore = "A great soaring bird of the high Andes." },
	nw_24 = { name = "Machu Picchu", lore = "An Inca stone citadel high in the Andes." },
	nw_25 = { name = "Chichen Itza", lore = "The monumental Maya city on the Yucatan Peninsula." },
	nw_26 = { name = "Teotihuacan", lore = "An ancient city with towering pyramids in central Mexico." },
	nw_27 = { name = "Amazon River", lore = "The vast river system that crosses northern South America." },
	nw_28 = { name = "Iguazu Falls", lore = "A mighty series of waterfalls on the South American borderlands." },
	nw_29 = { name = "Andes Mountains", lore = "The great mountain chain running along western South America." },
	nw_30 = { name = "Caribbean Hurricane", lore = "A fierce tropical cyclone that disrupts sailing and cannon fire." },
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
	af_18 = { name = "African Elephant", lore = "The giant long-tusked elephant of the African savanna." },
	af_19 = { name = "African Lion", lore = "A powerful big cat of the African grasslands." },
	af_20 = { name = "Giraffe", lore = "A tall browsing mammal with a long neck and spotted coat." },
	af_21 = { name = "Hippopotamus", lore = "A massive semi-aquatic animal found in African rivers." },
	af_22 = { name = "Black Rhinoceros", lore = "A hook-lipped rhinoceros native to Africa." },
	af_23 = { name = "Zebra", lore = "A striped equid of the African grasslands." },
	af_24 = { name = "Pyramids of Giza", lore = "The great royal tombs built beside ancient Memphis." },
	af_25 = { name = "Great Zimbabwe", lore = "The monumental stone ruins of a southern African city." },
	af_26 = { name = "Victoria Falls", lore = "An immense waterfall on the Zambezi River." },
	af_27 = { name = "Sahara Desert", lore = "A vast desert stretching across North Africa." },
	af_28 = { name = "Mount Kilimanjaro", lore = "A towering volcanic mountain of East Africa." },
	af_29 = { name = "Benguela Current", lore = "A cold ocean current flowing along southwestern Africa." },
	af_30 = { name = "Harmattan Wind", lore = "A dry dusty wind blowing across West Africa." },
}

-- 두목 전용 영웅: 두목을 쓰러뜨린 뒤 보상 후보에만 나온다 (일반 뽑기에는 나오지 않는다)
B.Units.boss_kraken = { id = "boss_kraken", name = "크라켄의 촉수", row = "cannon", power = 8, weapon = "cannon", hero = true }
B.Units.boss_serpent = { id = "boss_serpent", name = "바다뱀의 이빨", row = "melee", power = 8, weapon = "spear", hero = true }
B.Units.boss_siren = { id = "boss_siren", name = "세이렌의 노래", row = "ranged", power = 5, weapon = "gun", hero = true, ability = "spy" }
B.Factions = {
	europe = { id = "europe", name = "유럽 연합", passive = "판을 이기면 카드 한 장을 더 뽑는다", leader = "draw",
		roster = {"eu_01", "eu_02", "eu_03", "eu_04", "eu_05", "eu_06", "eu_07", "eu_08", "eu_09", "eu_10", "eu_11", "eu_12", "eu_13", "eu_14", "eu_15", "eu_16", "eu_17", "eu_18", "eu_19", "eu_20", "eu_21", "eu_22", "eu_23", "eu_24", "eu_25", "eu_26", "eu_27", "eu_28", "eu_29", "eu_30"} },
	east_asia = { id = "east_asia", name = "동아시아", passive = "첫 판 선공, 사기 효과가 2배", leader = "snipe",
		roster = {"ea_01", "ea_02", "ea_03", "ea_04", "ea_05", "ea_06", "ea_07", "ea_08", "ea_09", "ea_10", "ea_11", "ea_12", "ea_13", "ea_14", "ea_15", "ea_16", "ea_17", "ea_18", "ea_19", "ea_20", "ea_21", "ea_22", "ea_23", "ea_24", "ea_25", "ea_26", "ea_27", "ea_28", "ea_29", "ea_30"} },
	new_world = { id = "new_world", name = "신대륙", passive = "점수가 같으면 우리가 판을 이기고, 첩자는 카드 3장, 시작 손패 +1", leader = "clear",
		roster = {"nw_01", "nw_02", "nw_03", "nw_04", "nw_05", "nw_06", "nw_07", "nw_08", "nw_09", "nw_10", "nw_11", "nw_12", "nw_13", "nw_14", "nw_15", "nw_16", "nw_17", "nw_18", "nw_19", "nw_20", "nw_21", "nw_22", "nw_23", "nw_24", "nw_25", "nw_26", "nw_27", "nw_28", "nw_29", "nw_30"} },
	middle_east = { id = "middle_east", name = "중동", passive = "판이 끝나도 점수 5 이하의 가장 센 일반 카드 하나가 남는다", leader = "snipe",
		roster = {"me_01", "me_02", "me_03", "me_04", "me_05", "me_06", "me_07", "me_08", "me_09", "me_10", "me_11", "me_12", "me_13", "me_14", "me_15", "me_16", "me_17", "me_18", "me_19", "me_20", "me_21", "me_22", "me_23", "me_24", "me_25", "me_26", "me_27", "me_28", "me_29", "me_30"} },
	southeast_asia = { id = "southeast_asia", name = "남·동남아", passive = "시작 손패가 한 장 더 많다", leader = "draw",
		roster = { "raider", "raider", "raider", "swordsman", "pikeman", "surgeon", "surgeon", "musketeer", "scout", "sniper", "swivel", "swivel", "swivel", "gunner", "wind", "ironclad", "decoy" } },
	africa = { id = "africa", name = "아프리카", passive = "시작 손패가 한 장 더 많다", leader = "draw",
		roster = { "af_01", "af_02", "af_03", "af_04", "af_05", "af_06", "af_07", "af_08", "af_09", "af_10", "af_11", "af_12", "af_13", "af_14", "af_15", "af_16", "af_17", "af_18", "af_19", "af_20", "af_21", "af_22", "af_23", "af_24", "af_25", "af_26", "af_27", "af_28", "af_29", "af_30" } },
}
B.FactionOrder = { "europe", "east_asia", "new_world", "middle_east", "africa" }
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
		local card = copy(B.Units[id] or B.Specials[id])
		local tier = book and book.tier and book.tier[id] or 1
		if tier > 1 and card.power and not card.hero then
			card.power += tier - 1
		end
		card.tier = tier
		table.insert(out, card)
	end
	local leader = if fac then fac.leader else "draw"
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
		table.insert(out, copy(B.Units[id] or B.Specials[id]))
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
	if rng() < 0.5 then
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

-- 줄 합계: 날씨 → 결속 → 사기 → 무기 상성 → 병종 상성 순으로 계산한다
function B.cardPower(m: any, side, row, idx)
	local list = m.rows[side][row]
	local c = list[idx]
	if not c then
		return 0
	end
	local p = c.power
	if not c.hero then
		if m.weather[row] and c.ability ~= "armor" then
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
		if m.horn and m.horn[side][row] then
			p *= 2
		end
	end
	return p
end

function B.rowRaw(m: any, side, row)
	local sum = 0
	for i in m.rows[side][row] do
		sum += B.cardPower(m, side, row, i)
	end
	return sum
end

-- 병종 상성: 내 줄이 이길 수 있는 상대 줄에 카드가 있으면 ×1.3, 나를 이기는 줄이 있으면 ×0.85
function B.rowMatchup(m: any, side, row)
	local foe = m.rows[other(side)]
	local adv = #foe[B.ROW_BEATS[row]] > 0
	local dis = false
	for r, beaten in B.ROW_BEATS do
		if beaten == row and #foe[r] > 0 then
			dis = true
		end
	end
	local mult = 1
	if adv then
		mult *= B.ADV
	end
	if dis then
		mult *= B.DIS
	end
	return mult, adv, dis
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

local function removeHits(m: any, hits)
	-- 뒤에서부터 지워야 번호가 어긋나지 않는다
	table.sort(hits, function(a, b)
		if a[1] ~= b[1] or a[2] ~= b[2] then
			return false
		end
		return a[3] > b[3]
	end)
	for _, h in hits do
		local c = table.remove(m.rows[h[1]][h[2]], h[3])
		if c then
			table.insert(m.grave[h[1]], c)
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
		m.weather[m.sea.row] = true
	end
end
B.applySea = applySea

local function roundEnd(m: any)
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
					table.insert(m.grave[side], c)
				end
			end
			m.rows[side][row] = {}
		end
		if keep and not (m.wins.me >= 2 or m.wins.foe >= 2 or m.round >= 3) then
			table.insert(m.rows[side][keepRow], keep)
		elseif keep then
			table.insert(m.grave[side], keep)
		end
		m.passed[side] = false
	end
	m.weather = { melee = false, ranged = false, cannon = false }
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
		-- 한 판 지날 때마다 카드 한 장씩 보충
		drawCards(m, "me", 1)
		drawCards(m, "foe", 1)
		-- 유럽: 판을 이기면 한 장 더
		if winner and m.faction and m.faction[winner] == "europe" then
			drawCards(m, winner, 1)
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
			if not c.hero then
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
	local msg
	if c.special == "scorch" then
		local best, hits = strongestNonHero(m, { "me", "foe" })
		if best >= 6 then
			removeHits(m, hits)
			msg = string.format("소각! 가장 센 카드(%d)가 쓰러졌다", best)
		else
			msg = "소각 — 쓰러뜨릴 만한 카드가 없었다"
		end
		table.insert(m.grave[side], c)
	elseif c.special == "weather" then
		m.weather[c.row] = true
		msg = string.format("%s! %s 줄이 모두 약해졌다", c.name, B.ROW_NAME[c.row])
		table.insert(m.grave[side], c)
	elseif c.special == "clear" then
		m.weather = { melee = false, ranged = false, cannon = false }
		msg = "날씨가 걷혔다"
		table.insert(m.grave[side], c)
	elseif c.special == "wind" then
		m.weather = { melee = false, ranged = false, cannon = false }
		drawCards(m, side, 1)
		msg = "순풍! 날씨가 걷히고 카드를 한 장 뽑았다"
		table.insert(m.grave[side], c)
	elseif c.special == "horn" then
		local row = bestHornRow(m, side)
		if row then
			m.horn[side][row] = true
			msg = string.format("군기! %s 줄 점수가 두 배", B.ROW_NAME[row])
		else
			msg = "군기 — 높일 줄이 없었다"
		end
		table.insert(m.grave[side], c)
	elseif c.special == "decoy" then
		local pick = decoyTarget(m, side)
		if pick then
			local back = table.remove(m.rows[side][pick.row], pick.i)
			table.insert(m.hand[side], back)
			msg = string.format("회군! %s을(를) 손으로 되돌렸다", back.name)
		else
			msg = "회군 — 되돌릴 카드가 없었다"
		end
		table.insert(m.grave[side], c)
	else
		local target = side
		if c.ability == "spy" then
			target = other(side)
		end
		table.insert(m.rows[target][c.row], c)
		msg = string.format("%s을(를) %s 줄에 냈다", c.name, B.ROW_NAME[c.row])
		if c.ability == "spy" then
			local n = if m.faction and m.faction[side] == "new_world" then 3 else 2
			drawCards(m, side, n)
			msg ..= string.format(" (첩자: 카드 %d장을 뽑았다)", n)
		elseif c.ability == "snipe" then
			local fside, frow, fi = snipeTarget(m, side)
			if fside then
				local dead = table.remove(m.rows[fside][frow], fi)
				table.insert(m.grave[fside], dead)
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
				table.insert(m.rows[side][best.row], best)
				msg ..= string.format(" (치료: %s 되살림)", best.name)
			end
		end
	end
	logLine(m, (if side == "me" then "우리: " else "해적: ") .. msg)
	nextTurn(m, side)
	local act = { "p", handIdx }
	local result = nil
	if #m.hand[side] == 0 and not m.passed[side] then
		-- 손패가 없으면 자동으로 멈춘다
		m.passed[side] = true
		if m.passed[other(side)] then
			result = roundEnd(m)
		else
			m.turn = other(side)
		end
	end
	return true, msg, result, act, c
end

function B.pass(m: any, side)
	if m.over or m.turn ~= side or m.passed[side] then
		return false, "지금은 멈출 수 없어요"
	end
	m.passed[side] = true
	logLine(m, (if side == "me" then "우리: " else "해적: ") .. "이번 판은 여기까지")
	if m.passed[other(side)] then
		return true, "양쪽이 멈췄다", roundEnd(m), { "s" }
	end
	m.turn = other(side)
	return true, "멈췄다", nil, { "s" }
end

function B.useLeader(m: any, side)
	if m.over or m.turn ~= side or m.leaderUsed[side] then
		return false, "지금은 쓸 수 없어요"
	end
	local id = m.leader[side]
	m.leaderUsed[side] = true
	local msg
	if id == "draw" then
		drawCards(m, side, 1)
		msg = "지휘: 카드를 한 장 더 뽑았다"
	elseif id == "clear" then
		m.weather = { melee = false, ranged = false, cannon = false }
		msg = "항로 개척: 날씨가 걷혔다"
	else
		local best, hits = strongestNonHero(m, { other(side) })
		if best > 0 then
			-- 동점이면 첫 하나만
			removeHits(m, { hits[1] })
			msg = string.format("저격: 상대의 가장 센 카드(%d)를 쓰러뜨렸다", best)
		else
			msg = "저격 — 맞힐 카드가 없었다"
		end
	end
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
		local prev = m.weather[c.row] -- 미리 계산하다 이미 깔린 날씨를 지우지 않도록 원래 값으로 되돌린다
		m.weather[c.row] = true
		local after = B.total(m, side) - B.total(m, foe)
		m.weather[c.row] = prev
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
	elseif c.special == "decoy" then
		local pick = decoyTarget(m, side)
		gain = if pick and pick.score >= 100 then 3 else -4
	else
		local target = if c.ability == "spy" then foe else side
		local before = B.total(m, side) - B.total(m, foe)
		table.insert(m.rows[target][c.row], c)
		local after = B.total(m, side) - B.total(m, foe)
		table.remove(m.rows[target][c.row])
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
		return B.useLeader(m, side)
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
	boarding = { melee = "근접", ranged = "사격", cannon = "포" },
	gunnery = { melee = "충각", ranged = "소포", cannon = "주포" },
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
	local rows = { melee = 0, ranged = 0, cannon = 0 }
	for _, c in deck do
		if c.row and c.power then rows[c.row] += c.power end
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
		weakRow = weak, weakName = B.ROW_NAME[weak], counterRow = ({ melee = "ranged", ranged = "cannon", cannon = "melee" })[weak],
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
			if c and not c.special then table.insert(m.rows.foe[c.row], c) end
		end
		-- 내 판: 이미 깔린 카드 1~2장
		for _ = 1, 1 + math.floor(rng() * 2) do
			local c = copyUnit(pick())
			if c and not c.special then table.insert(m.rows.me[c.row], c) end
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
