--!strict
-- Weapons.luau · 무기·출신 지역·경력별 기본 장비. 주인공 자유 교체, 동료는 실제 이력에 따라 선택.
-- motion = CommonMotion 무기 프로필 id. model = 전용 실물 메시 이름(미등록·권한 미확인 시 장착하지 않음).

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
	region: string?, -- 지역형 구분(저장키와 무관한 전투 연출 데이터)
}

local Weapons = {}

Weapons.List = {
	{ id = "fist", name = "맨손 격투", motion = nil, family = "fist", ranged = false, range = 3, speed = 1.3, power = 0.8, model = nil, note = "빠른 연타·발차기, 막기 쉽다" },
	{ id = "sword", name = "검", motion = "SWORD", family = "blade", ranged = false, range = 5, speed = 1.15, power = 1, model = "weapon-sword", note = "균형형: 베기·찌르기" },
	{ id = "dagger", name = "단검", motion = "DAGGER", family = "dagger", ranged = false, range = 3.5, speed = 1.4, power = 0.7, model = "weapon-dagger", note = "가장 빠름, 뒤를 잘 찌름" },
	{ id = "axe", name = "도끼", motion = "WAR_AXE", family = "axe", ranged = false, range = 5, speed = 0.9, power = 1.35, model = "weapon-axe", note = "느리지만 묵직한 일격" },
	{ id = "spear", name = "창", motion = "SPEAR", family = "spear", ranged = false, range = 8, speed = 1, power = 1, model = "weapon-spear", note = "긴 사거리 찌르기" },
	{ id = "mace", name = "철퇴", motion = "MACE", family = "blunt", ranged = false, range = 4.5, speed = 1.05, power = 1.2, model = "weapon-mace", note = "기절(경직)을 잘 준다" },
	{ id = "crossbow", name = "석궁", motion = "CROSSBOW", family = "firearm", ranged = true, range = 26, speed = 1.1, power = 1.25, model = "weapon-crossbow", note = "강한 한 발, 장전이 필요" },
	{ id = "bow", name = "활", motion = "BOW", family = "bow", ranged = true, range = 26, speed = 1.1, power = 1.25, model = "weapon-bow", note = "지역별 활의 기본형" },
	{ id = "gun", name = "총", motion = "PISTOL", family = "firearm", ranged = true, range = 22, speed = 1.25, power = 1.1, model = nil, note = "빠른 사격, 소음으로 적이 깬다" },
} :: { Weapon }

local byId: { [string]: Weapon } = {}
for _, w in Weapons.List do
	byId[w.id] = w
end

function Weapons.get(id: string?): Weapon
	return byId[id or "fist"] or byId.fist
end

-- [지역별 무기] 기존 기본 9종의 사거리·피해·속도를 그대로 물려받아 저장/전투 밸런스를 건드리지 않는다.
-- 실제 3D 에셋이 없는 무기는 모델을 거짓으로 연결하지 않는다. 공용 모션 프로필은 실존하는 것만 사용.
local regionalDefs = {
	{ "rapier", "레이피어", "sword", "RAPIER", "europe", "유럽 도시의 검술 교육" },
	{ "cutlass", "선상도", "sword", "SABRE", "sea", "선원·해상 상인의 짧은 외날검", "weapon-cutlass" },
	{ "katana", "일본도", "sword", "KATANA", "japan", "일본 무가 출신" },
	{ "hwando", "환도", "sword", "SABRE", "korea", "조선 수군·무인" },
	{ "dao", "도", "sword", "SABRE", "china", "중국 상인·무인" },
	{ "shamshir", "샴시르", "sword", "SCIMITAR", "west_asia", "서아시아의 곡도" },
	{ "talwar", "탈와르", "sword", "SCIMITAR", "south_asia", "남아시아의 곡도" },
	{ "english_longbow", "잉글랜드 장궁", "bow", "LONGBOW", "england", "잉글랜드식 장궁" },
	{ "japanese_yumi", "일본 화궁", "bow", "LONGBOW", "japan", "일본 전통 장궁" },
	{ "korean_gakgung", "조선 각궁", "bow", "BOW", "korea", "조선 복합궁" },
	{ "chinese_recurve", "중국 각궁", "bow", "BOW", "china", "중국 복합궁" },
	{ "ottoman_composite", "오스만 복합궁", "bow", "BOW", "west_asia", "오스만 궁술" },
	{ "indian_composite", "인도 복합궁", "bow", "BOW", "south_asia", "남아시아의 복합궁" },
	{ "african_hunting_bow", "아프리카 사냥활", "bow", "BOW", "africa", "지역 사냥 전통에 따른 활" },
	{ "american_hunting_bow", "아메리카 사냥활", "bow", "BOW", "americas", "지역 사냥 전통에 따른 활" },
	{ "matchlock_musket", "화승식 장총", "gun", "RIFLE", "early_firearm", "화승식 발화·재장전" },
	{ "flintlock_musket", "수석식 장총", "gun", "RIFLE", "late_firearm", "수석식 발화·재장전", "weapon-flintlock-musket" },
	{ "tanegashima", "다네가시마 조총", "gun", "RIFLE", "japan", "일본 화승총" },
	{ "wheellock_pistol", "륜발식 권총", "gun", "PISTOL", "early_firearm", "고가의 기계식 발화 권총" },
	{ "flintlock_pistol", "수석식 권총", "gun", "PISTOL", "late_firearm", "수석식 발화 권총", "weapon-flintlock-pistol" },
	{ "ottoman_kubur", "오스만 쿠부르 권총", "gun", "PISTOL", "west_asia", "오스만 지역의 호신·기병용 권총" },
	{ "ship_pistol", "선상 권총", "gun", "PISTOL", "sea", "배 위에서 사용하는 짧은 총신의 권총", "weapon-pirate-pistol" },
	{ "dueling_pistol", "결투용 권총", "gun", "PISTOL", "europe", "18세기 유럽 결투용 권총" },
	-- [기존 등록 실물] weapon-hammer는 이미 승인된 Relics 모델. 철퇴와 피해·속도·사거리를 공유한다.
	{ "warhammer", "전투 망치", "mace", "MACE", "europe", "실물 전투망치 병종", "weapon-hammer" },
	-- [CC0 해적 실물] 원본 도끼의 공격력·속도·사거리를 물려받고 외형만 쌍날 도끼로 구분한다.
	{ "doubleaxe", "쌍날 도끼", "axe", "WAR_AXE", "sea", "해상 정예용 쌍날 도끼", "weapon-doubleaxe" },
}
Weapons.Regional = {} :: { Weapon }
for _, v in regionalDefs do
	local base = byId[v[3]]
	if base then
		local item: Weapon = {
			id = v[1], name = v[2], motion = v[4], family = base.family,
			ranged = base.ranged, range = base.range, speed = base.speed,
			power = base.power, model = v[7], region = v[5], note = v[6],
		}
		byId[item.id] = item
		table.insert(Weapons.Regional, item)
	end
end

-- [화약 투척병] 해적용 CC0 실물 폭탄. 기존 플레이어 무기 순환·무기 숙련·저장 키에 추가하지 않는다.
-- 모델은 원본 등록/로블록스 권한 확인 후에만 적 생성 명세에서 사용한다.
local bomb: Weapon = {
	id = "bomb", name = "화약 폭탄", family = "explosive", motion = nil, ranged = true,
	range = 18, speed = 1, power = 1, model = "weapon-bomb",
	note = "투척 위치가 예고되고, 착탄 지점에서만 피해를 준다", region = "sea",
}
byId[bomb.id] = bomb

-- [직업 기본] 역사적으로 모든 학자·성직자·의사가 무장한 것은 아니다.
-- 같은 직업이라도 출신지·과거 경력·시대가 있으면 아래 함수가 별도 무기를 골라 준다.
Weapons.AllyByCategory = {
	warrior = "sword",
	gunner = "gun",
	navigator = "axe",
	clergy = "fist",
	doctor = "rapier",
	healer = "rapier", -- 오래된 분류 호환
	scholar = "rapier",
	merchant = "cutlass",
} :: { [string]: string }

export type AllyHistory = {
	job: string?,
	nation: string?,
	background: string?,
	year: number?,
}

function Weapons.allyWeapon(category: string?, history: AllyHistory?): Weapon
	local cat = category or "warrior"
	local base = Weapons.AllyByCategory[cat] or "sword"
	if not history then return Weapons.get(base) end
	local nation = history.nation or ""
	local past = (history.background or "") .. " " .. (history.job or "")
	local year = history.year or 1650
	local function lived(word: string): boolean
		return string.find(past, word, 1, true) ~= nil
	end
	local sword = if nation == "japan" then "katana"
		elseif nation == "korea" then "hwando"
		elseif nation == "china" then "dao"
		elseif nation == "ottoman" or nation == "persia" then "shamshir"
		elseif nation == "malabar" or nation == "india" then "talwar"
		else "sword"
	local bow = if nation == "japan" then "japanese_yumi"
		elseif nation == "korea" then "korean_gakgung"
		elseif nation == "china" then "chinese_recurve"
		elseif nation == "ottoman" or nation == "persia" then "ottoman_composite"
		elseif nation == "malabar" or nation == "india" then "indian_composite"
		elseif nation == "swahili" or nation == "kongo" then "african_hunting_bow"
		elseif nation == "new_spain" or nation == "inca" then "american_hunting_bow"
		elseif nation == "england" then "english_longbow"
		else "bow"
	local firearm = if year >= 1680 then "flintlock_musket"
		elseif nation == "japan" then "tanegashima"
		else "matchlock_musket"
	local pistol = if nation == "ottoman" and year >= 1650 then "ottoman_kubur"
		elseif year >= 1700 and lived("결투") then "dueling_pistol"
		elseif year >= 1680 and (lived("선상") or lived("해군") or lived("해적")) then "ship_pistol"
		elseif year >= 1680 then "flintlock_pistol" else "wheellock_pistol"
	if cat == "warrior" then
		if lived("격투") or lived("권투") then return Weapons.get("fist") end
		return Weapons.get(sword)
	elseif cat == "gunner" then
		if lived("기병") or lived("권총") then return Weapons.get(pistol) end
		return Weapons.get(firearm)
	elseif cat == "navigator" then
		if lived("탐험") or lived("사냥") then return Weapons.get(bow) end
		if lived("해적") or lived("수군") then return Weapons.get(sword) end
	elseif cat == "scholar" then
		if lived("여행") or lived("탐험") or lived("박물") or lived("야외") or lived("사냥") then return Weapons.get(bow) end
		if nation == "japan" or nation == "korea" or nation == "china" then return Weapons.get(bow) end
		return Weapons.get("rapier")
	elseif cat == "merchant" then
		if lived("호위") or lived("용병") or lived("퇴역") then return Weapons.get(pistol) end
		if nation == "ottoman" or nation == "persia" or nation == "malabar" or nation == "india" or nation == "japan" or nation == "korea" or nation == "china" then
			return Weapons.get(sword)
		end
		return Weapons.get("cutlass")
	elseif cat == "clergy" then
		if lived("무장") or lived("기사단") or lived("전사") then return Weapons.get(if nation == "" then "mace" else sword) end
		return Weapons.get("fist")
	elseif cat == "doctor" or cat == "healer" then
		if lived("군의관") or lived("해군") or lived("외과") or lived("선상") then return Weapons.get("cutlass") end
		if nation == "japan" or nation == "korea" or nation == "china" then return Weapons.get(sword) end
		return Weapons.get("rapier")
	end
	return Weapons.get(base)
end

-- [집안별 시작 무기] 새 상태 필드를 만들지 않고 기존 State.origin 값을 전투 연출의 기본 장비로 사용한다.
-- 등록된 실물 무기만 고른다. 기존 능력치·출신 보너스·저장/이전 게임은 그대로 둔다.
local ORIGIN_WEAPONS: { [string]: string } = {
	farmer = "axe", noble = "sword", merchant = "dagger", sailor = "sword",
	soldier = "crossbow", scholar = "bow", cook = "dagger", doctor = "mace",
	craftsman = "mace", clergy = "fist",
}

-- [출신별 보조 무기] 기존 집안 ID만 읽는 두 번째 장비. 새 저장 키·능력치 변경 없음.
local ORIGIN_SIDEARMS: { [string]: string } = {
	farmer = "bow", noble = "crossbow", merchant = "bow", sailor = "bow",
	soldier = "sword", scholar = "dagger", cook = "bow", doctor = "bow",
	craftsman = "crossbow", clergy = "bow",
}

function Weapons.originSidearm(originId: string?, year: number?): Weapon
	local primaryId = ORIGIN_WEAPONS[originId or ""] or "sword"
	local secondaryId = ORIGIN_SIDEARMS[originId or ""] or "bow"
	if originId == "soldier" and (year or 1517) >= 1680 then primaryId = "flintlock_musket" end
	if primaryId == secondaryId then secondaryId = if primaryId == "bow" then "sword" else "bow" end
	return Weapons.get(secondaryId)
end

function Weapons.originWeapon(originId: string?, year: number?): Weapon
	local id = ORIGIN_WEAPONS[originId or ""] or "sword"
	-- 수석식 총기는 실제 발화 시대와 등록된 모델이 모두 맞을 때에만 초기 장비로 선택한다.
	if originId == "soldier" and (year or 1517) >= 1680 then
		id = "flintlock_musket"
	end
	return Weapons.get(id)
end

export type ActionDesign = {
	basic: string, heavy: string, sweep: string,
	heavyName: string, sweepName: string, cadence: string,
	heavyBeat: number, sweepBeat: number,
}

-- [탐험 전투: 무기별 모션·스킬 명세]
-- 기존 피해량, 사거리, 기력, 재사용 시간은 ActionCombat/Weapons 원본을 그대로 사용한다.
-- 평타는 한 번의 입력에 한 번만 판정하고, 숙련 연타 2~3타는 기존 R15 무기 동작으로만 재생한다. 숙련도 자체는 최대 5단계다.
Weapons.ActionDesign = {
	fist = { basic = "잽", heavy = "승룡", sweep = "회축", heavyName = "승룡 어퍼컷", sweepName = "회전 발차기", cadence = "잽·크로스·훅·회전훅·앞차기·역돌려차기·팔꿈치·회피주먹·공중차기·회전마무리", heavyBeat = 1, sweepBeat = 2 },
	blade = { basic = "베기", heavy = "강참", sweep = "반월", heavyName = "내려 베기", sweepName = "반월 베기", cadence = "좌베기·우베기·전진찌르기·낮은베기·상승베기·역선회·반월베기·교차베기·도약베기·회전마무리", heavyBeat = 4, sweepBeat = 2 },
	dagger = { basic = "찌르기", heavy = "급습", sweep = "난무", heavyName = "급소 찌르기", sweepName = "역수 연격", cadence = "역수·교차찌르기·낮은훑기·돌아치기·몸비틀기·쌍역수·교차회전·측면급습·공중교차·그림자마무리", heavyBeat = 1, sweepBeat = 2 },
	axe = { basic = "찍기", heavy = "분쇄", sweep = "광풍", heavyName = "도끼 내려찍기", sweepName = "휩쓸기", cadence = "내려찍기·대각찍기·횡베기·역횡베기·상승도끼·회전베기·낮은선회·전진찍기·도약찍기·회전마무리", heavyBeat = 4, sweepBeat = 3 },
	spear = { basic = "찌르기", heavy = "관통", sweep = "봉쇄", heavyName = "긴 창 찌르기", sweepName = "창 휩쓸기", cadence = "빠른찌르기·긴찌르기·창자루·횡휩쓸기·교차찌르기·역선회·낮은관통·전진찌르기·도약찌르기·회전관통", heavyBeat = 2, sweepBeat = 4 },
	blunt = { basic = "타격", heavy = "강격", sweep = "충격", heavyName = "철퇴 내려찍기", sweepName = "철퇴 휩쓸기", cadence = "횡타·역타·올려치기·내려찍기·몸통회전·낮은타격·대각강타·전진타·회전상승·회전강타", heavyBeat = 4, sweepBeat = 2 },
	bow = { basic = "궁술", heavy = "집중", sweep = "견제", heavyName = "정밀 사격 자세", sweepName = "견제 활쏘기", cadence = "사선사격·측면스텝·낮은사격·교차사격·회전속사·역회전·도약사격·연속격발·공중회전·공중마무리", heavyBeat = 1, sweepBeat = 2 },
	firearm = { basic = "사격", heavy = "정조준", sweep = "견제", heavyName = "정밀 조준 자세", sweepName = "견제 사격 자세", cadence = "스냅사격·측면스텝·낮은선회·역회전·교차사격·측면발포·슬라이드·연속격발·공중사격·회전마무리", heavyBeat = 1, sweepBeat = 2 },
} :: { [string]: ActionDesign }
function Weapons.actionDesign(w: Weapon): ActionDesign
	return Weapons.ActionDesign[w.family] or Weapons.ActionDesign.blade
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
