--!nonstrict
-- 지상 탐험 턴제 전술(파이어 엠블럼식)의 데이터: 지형, 병종, 스킬, 적 종류, 목표 종류.
-- 규칙은 Tactics.luau, 맵은 TacticsMaps.luau. 새 병종·스킬·적은 여기에 표 한 줄만 더하면 된다.

local Data = {}

-- 지형 글자 → 이동 비용(nil 이면 지나갈 수 없음), 방어 보너스, 이름
Data.Terrain = {
	["."] = { name = "평지", cost = 1, def = 0 },
	f = { name = "숲", cost = 2, def = 1 },
	h = { name = "언덕", cost = 2, def = 1 },
	s = { name = "모래", cost = 1, def = 0 },
	w = { name = "얕은 물", cost = 2, def = 0 },
	["~"] = { name = "늪", cost = 3, def = 0 },
	r = { name = "폐허", cost = 1, def = 1 },
	["+"] = { name = "거점", cost = 1, def = 2, heal = 5 },
	x = { name = "조사 지점", cost = 1, def = 0, search = true },
	G = { name = "도착 지점", cost = 1, def = 0, goal = true },
	["#"] = { name = "절벽·벽", cost = nil, def = 0, solid = true },
	W = { name = "깊은 물", cost = nil, def = 0, water = true },
	m = { name = "광맥 바닥", cost = 1, def = 0 },
	l = { name = "용암 굳은 땅", cost = 2, def = 0 },
}

-- 무기 상성: 검 > 도끼 > 창 > 검 (유리하면 공격 +2, 불리하면 -2)
Data.WeaponBeats = { sword = "axe", axe = "spear", spear = "sword" }
Data.TriangleBonus = 2

-- 병종: hp·atk·def·spd·move 는 기본값이고 레벨에 따라 커진다. range = {최소, 최대}
Data.Classes = {
	swordsman = { name = "검사", weapon = "sword", hp = 20, atk = 7, def = 3, spd = 6, move = 5, range = { 1, 1 }, summary = "균형 잡힌 근접 병종" },
	lancer = { name = "창병", weapon = "spear", hp = 22, atk = 7, def = 4, spd = 4, move = 4, range = { 1, 1 }, summary = "검에 약하고 도끼에 강하다" },
	axeman = { name = "도끼병", weapon = "axe", hp = 25, atk = 8, def = 3, spd = 3, move = 4, range = { 1, 1 }, summary = "힘이 세지만 느리다" },
	archer = { name = "궁수", weapon = "bow", hp = 18, atk = 6, def = 2, spd = 5, move = 5, range = { 2, 2 }, summary = "멀리서 쏜다 (바로 옆은 못 쏨)" },
	gunner = { name = "총병", weapon = "gun", hp = 19, atk = 9, def = 2, spd = 3, move = 4, range = { 2, 3 }, pierce = 2, summary = "상대 방어를 2 무시" },
	scholar = { name = "학자", weapon = "staff", hp = 16, atk = 3, def = 1, spd = 5, move = 5, range = { 1, 2 }, heal = 8, summary = "아군을 치료한다" },
	rider = { name = "기마병", weapon = "sword", hp = 24, atk = 7, def = 3, spd = 7, move = 7, range = { 1, 1 }, summary = "멀리 달린다" },
	knight = { name = "갑주병", weapon = "spear", hp = 28, atk = 6, def = 7, spd = 2, move = 3, range = { 1, 1 }, summary = "단단하지만 느리다" },
	rogue = { name = "척후병", weapon = "sword", hp = 17, atk = 5, def = 1, spd = 9, move = 6, range = { 1, 1 }, summary = "빠르고 연속 공격에 능하다" },
	wolf = { name = "늑대", weapon = "fang", hp = 16, atk = 6, def = 1, spd = 8, move = 6, range = { 1, 1 }, beast = true, summary = "빠른 짐승" },
	bear = { name = "곰", weapon = "fang", hp = 34, atk = 9, def = 4, spd = 3, move = 4, range = { 1, 1 }, beast = true, summary = "튼튼한 큰 짐승" },
}

-- 병종별 승급과 개인 장비. 항해 장비와 별개로 지상전 유닛에만 적용한다.
Data.PromotionLevel = 5
Data.MasteryPerLevel = 25
Data.MaxMastery = 475
Data.Promotions = {
	swordsman = { name = "검성", skill = "riposte" },
	lancer = { name = "근위 창병", skill = "bulwark" },
	axeman = { name = "돌격 도끼병", skill = "charge" },
	archer = { name = "명궁", skill = "aim" },
	gunner = { name = "정예 총병", skill = "hawkeye" },
	scholar = { name = "군의학자", skill = "field_medic" },
	rider = { name = "중기병", skill = "charge" },
	knight = { name = "철벽 근위병", skill = "bulwark" },
	rogue = { name = "정예 정찰병", skill = "lucky" },
}
Data.Weapons = {
	sword = "검", spear = "창", axe = "도끼", bow = "활", gun = "총", staff = "지팡이",
}
Data.PersonalGear = {
	weapon = {
		{ name = "기본 무기", price = 0, level = 1, atk = 0, heal = 0 },
		{ name = "정제 무기", price = 180, level = 3, atk = 2, heal = 2 },
		{ name = "정예 무기", price = 420, level = 5, atk = 4, heal = 4 },
	},
	armor = {
		{ name = "기본 복장", price = 0, level = 1, def = 0, move = 0 },
		{ name = "가죽 방어구", price = 140, level = 2, def = 1, move = 0 },
		{ name = "사슬 방어구", price = 300, level = 4, def = 3, move = -1 },
	},
}

-- 스킬(패시브). 효과 이름은 Tactics.luau 가 읽는다.
Data.Skills = {
	charge = { name = "돌격", summary = "3칸 이상 움직인 뒤 공격하면 공격 +3" },
	bulwark = { name = "철벽", summary = "숲·언덕·폐허·거점 위에서 방어 +2" },
	aim = { name = "조준", summary = "활·총의 사거리 +1" },
	riposte = { name = "반격", summary = "반격할 때 공격 +3" },
	first_aid = { name = "응급처치", summary = "대기하면 옆 아군을 4 치료" },
	field_medic = { name = "군의관", summary = "치료량 +4" },
	scout = { name = "정찰", summary = "이동 +1" },
	hawkeye = { name = "약점 간파", summary = "평지에 선 적에게 공격 +3" },
	herbalist = { name = "약초학", summary = "턴이 시작될 때 숲에 서 있으면 3 회복" },
	naturalist = { name = "동물학", summary = "짐승에게 공격 +3, 받는 피해 -2" },
	geologist = { name = "광물학", summary = "상대 방어를 2 무시" },
	lucky = { name = "행운", summary = "첫 공격이 연속 공격이 된다" },
}

-- 전문 분야·동료의 능력(Specialties.luau 의 perk)을 전술 스킬로 바꾸는 표
Data.SpecialtySkill = {
	botanist = "herbalist",
	zoologist = "naturalist",
	collector = "hawkeye",
	cartographer = "scout",
	physician = "first_aid",
	gunner = "aim",
	navigator = "scout",
	geologist = "geologist",
}

-- 적 종류: 병종 + 스킬 + 행동 방식(ai) + 이름. boss 면 두목.
Data.Enemies = {
	bandit = { name = "산적", class = "axeman", ai = "aggressive", skills = {} },
	bandit_archer = { name = "산적 궁수", class = "archer", ai = "aggressive", skills = {} },
	deserter = { name = "탈영병", class = "lancer", ai = "aggressive", skills = { "bulwark" } },
	bandit_chief = { name = "산적 두목", class = "knight", ai = "guard", boss = true, skills = { "riposte", "bulwark" }, power = 1.15 },
	pirate = { name = "해적", class = "swordsman", ai = "aggressive", skills = { "charge" } },
	smuggler = { name = "밀수꾼", class = "rogue", ai = "aggressive", skills = {} },
	pirate_gunner = { name = "해적 총잡이", class = "gunner", ai = "guard", skills = {} },
	pirate_captain = { name = "해적 두목", class = "swordsman", ai = "guard", boss = true, skills = { "riposte", "charge" }, power = 1.2 },
	poacher = { name = "밀렵꾼", class = "archer", ai = "aggressive", skills = { "aim" } },
	hunter = { name = "숲의 사냥꾼", class = "rogue", ai = "aggressive", skills = { "hawkeye" } },
	wolf = { name = "늑대", class = "wolf", ai = "aggressive", skills = {} },
	bear = { name = "큰곰", class = "bear", ai = "guard", boss = true, skills = {}, power = 1.2 },
	miner = { name = "광산 도적", class = "rogue", ai = "aggressive", skills = {} },
	foreman = { name = "갱 감독", class = "knight", ai = "guard", skills = { "bulwark" } },
	mine_boss = { name = "도적 두목", class = "axeman", ai = "guard", boss = true, skills = { "charge", "riposte" }, power = 1.2 },
	grave_robber = { name = "도굴꾼", class = "swordsman", ai = "aggressive", skills = { "hawkeye" } },
	relic_guard = { name = "유물 지킴이", class = "knight", ai = "guard", skills = { "bulwark" } },
	raider = { name = "약탈자", class = "rider", ai = "aggressive", skills = { "charge" } },
	raider_chief = { name = "약탈 대장", class = "rider", ai = "guard", boss = true, skills = { "charge", "riposte" }, power = 1.35 },
}

-- 승리 목표 종류
Data.Objectives = {
	rout = { name = "적을 모두 물리치기" },
	boss = { name = "적 두목을 쓰러뜨리기" },
	survive = { name = "정해진 턴까지 버티기" },
	reach = { name = "도착 지점에 닿기" },
}

-- 클리어 등급: 걸린 턴이 limit 이하일 때. 등급이 높으면 보상 배율이 크다.
Data.RankMult = { S = 1.5, A = 1.25, B = 1.0 }

return Data
