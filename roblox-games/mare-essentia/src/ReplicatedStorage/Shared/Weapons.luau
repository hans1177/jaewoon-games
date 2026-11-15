--!strict
-- 무기 체계. 주인공은 모든 무기를 쓸 수 있고(탐험 중 바꿔 듦), 동료는 직업에 따라 무기가 고정된다(석궁·총·검·도끼).
-- motion = CommonMotion 의 무기 프로필 id(마력숲과 같은 동작 원본). model = 승인·등록된 3D 모델 에셋(없으면 nil: 모델이 등록될 때까지 맨손 쥠으로 보인다).

export type Weapon = {
	id: string,
	name: string,
	motion: string?, -- CommonMotion 무기 프로필(맨손은 nil)
	family: string, -- blade | axe | spear | blunt | dagger | bow | firearm | fist
	ranged: boolean,
	range: number, -- 규칙 거리 단위
	speed: number, -- 동작 속도 배율
	power: number, -- 피해 배율
	model: string?, -- Relics 그룹의 모델 이름
	note: string,
}

local Weapons = {}

Weapons.List = {
	{ id = "fist", name = "맨손 격투", motion = nil, family = "fist", ranged = false, range = 3, speed = 1.3, power = 0.8, model = nil, note = "빠른 연타·발차기, 막기 쉽다" },
	{ id = "sword", name = "검", motion = "SWORD", family = "blade", ranged = false, range = 5, speed = 1.15, power = 1, model = "weapon-sword", note = "균형형: 베기·찌르기" },
	{ id = "dagger", name = "단검", motion = "DAGGER", family = "dagger", ranged = false, range = 3.5, speed = 1.4, power = 0.7, model = nil, note = "가장 빠름, 뒤를 잘 찌름" },
	{ id = "axe", name = "도끼", motion = "WAR_AXE", family = "axe", ranged = false, range = 5, speed = 0.9, power = 1.35, model = nil, note = "느리지만 묵직, 방패를 깬다" },
	{ id = "spear", name = "창", motion = "SPEAR", family = "spear", ranged = false, range = 8, speed = 1, power = 1, model = "weapon-spear", note = "긴 사거리 찌르기" },
	{ id = "mace", name = "철퇴", motion = "MACE", family = "blunt", ranged = false, range = 4.5, speed = 1.05, power = 1.2, model = nil, note = "기절(경직)을 잘 준다" },
	{ id = "crossbow", name = "석궁", motion = "CROSSBOW", family = "firearm", ranged = true, range = 26, speed = 1.1, power = 1.25, model = nil, note = "강한 한 발, 장전이 필요" },
	{ id = "gun", name = "총", motion = "PISTOL", family = "firearm", ranged = true, range = 22, speed = 1.25, power = 1.1, model = nil, note = "빠른 사격, 소음으로 적이 깬다" },
} :: { Weapon }

local byId: { [string]: Weapon } = {}
for _, w in Weapons.List do
	byId[w.id] = w
end

function Weapons.get(id: string?): Weapon
	return byId[id or "fist"] or byId.fist
end

-- 동료 직업 분류(JobSkills.categoryOf 결과)마다 고정 무기: 무인=검, 포수=총, 항해=도끼, 학자·성직·상인=석궁
Weapons.AllyByCategory = {
	warrior = "sword",
	gunner = "gun",
	navigator = "axe",
	healer = "crossbow",
	scholar = "crossbow",
	merchant = "crossbow",
} :: { [string]: string }

function Weapons.allyWeapon(category: string?): Weapon
	return Weapons.get(Weapons.AllyByCategory[category or "warrior"] or "sword")
end

-- 주인공은 전부 쓸 수 있다. 다만 모델이 없는 무기는 모델이 등록되기 전까지 맨손 쥠으로 보인다.
function Weapons.playerChoices(): { Weapon }
	return Weapons.List
end

-- 다음/이전 무기(탐험 중 전환 버튼용)
function Weapons.cycle(current: string?, dir: number?): Weapon
	local idx = 1
	for i, w in Weapons.List do
		if w.id == current then
			idx = i
		end
	end
	local n = #Weapons.List
	return Weapons.List[((idx - 1 + (dir or 1)) % n) + 1]
end

-- 무기별 공격 속도(동작 시간)와 피해: 기본값에 배율을 곱한다
function Weapons.swingDuration(w: Weapon, base: number): number
	return base / math.max(0.3, w.speed)
end

function Weapons.damage(w: Weapon, base: number): number
	return math.max(1, math.floor(base * w.power + 0.5))
end

return Weapons
