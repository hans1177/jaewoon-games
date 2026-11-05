--!strict
-- 전문 분야(직업 성향)와 동료(실존 학자·박물학자) 데이터. 효과는 숫자 보너스로만 표현한다.
-- 전문 분야는 한 번에 하나를 고르고, 동료는 최대 슬롯 수만큼 함께 항해한다.

export type Perk = {
	discoverFields: { string }?, -- 이 분야 카드를 찾을 확률 보너스를 받는 카드 분야
	discoverBonus: number?, -- 위 분야 발견 확률 +
	coinFields: { string }?, -- 이 분야 카드 등록 코인 보너스
	coinMult: number?, -- 위 분야 등록 코인 배율 (0.5 = +50%)
	speedMult: number?, -- 항해 속도 +
	sellBonus: number?, -- 되파는 비율 +
	cannonMult: number?, -- 포격 +
}

export type Specialty = { id: string, name: string, summary: string, perk: Perk }

export type Companion = {
	id: string,
	name: string,
	scholarId: string, -- 먼저 이 학자를 만나 지식을 전수받아야 한다
	fee: number, -- 영입 비용
	minFame: number,
	summary: string,
	perk: Perk,
}

local Specialties: { Specialty } = {
	{ id = "botanist", name = "식물학자", summary = "식물·약용·의학 카드 발견 확률 +25%",
		perk = { discoverFields = { "Botany", "Medicine" }, discoverBonus = 0.25 } },
	{ id = "zoologist", name = "동물학자", summary = "동물 카드 발견 확률 +25%",
		perk = { discoverFields = { "Zoology" }, discoverBonus = 0.25 } },
	{ id = "collector", name = "유물수집가", summary = "유물·유적·광물 카드 등록 코인 +50%",
		perk = { coinFields = { "Relic", "Site", "Mineral" }, coinMult = 0.5 } },
	{ id = "cartographer", name = "지도제작자", summary = "항해 속도 +10%",
		perk = { speedMult = 0.1 } },
	{ id = "merchant", name = "무역가", summary = "되파는 비율 +2%",
		perk = { sellBonus = 0.02 } },
}

local Companions: { Companion } = {
	{ id = "c_merian", name = "마리아 메리안", scholarId = "merian", fee = 300, minFame = 60,
		summary = "곤충·식물을 정밀하게 그리는 박물화가. 동물·식물 카드 발견 +15%",
		perk = { discoverFields = { "Zoology", "Botany" }, discoverBonus = 0.15 } },
	{ id = "c_halley", name = "에드먼드 핼리", scholarId = "halley", fee = 500, minFame = 80,
		summary = "천문·항해에 밝은 학자. 항해 속도 +8%, 천문·지리 카드 발견 +15%",
		perk = { speedMult = 0.08, discoverFields = { "Astronomy", "Geography" }, discoverBonus = 0.15 } },
	{ id = "c_leeuwenhoek", name = "안톤 판 레이우엔훅", scholarId = "leeuwenhoek", fee = 400, minFame = 70,
		summary = "현미경 관찰의 대가. 물리·화학·의학 카드 발견 +15%",
		perk = { discoverFields = { "Physics", "Chemistry", "Medicine" }, discoverBonus = 0.15 } },
	{ id = "c_linnaeus", name = "카를 린네", scholarId = "linnaeus", fee = 600, minFame = 120,
		summary = "식물 분류의 아버지. 식물·광물·동물 카드 발견 +20%",
		perk = { discoverFields = { "Botany", "Mineral", "Zoology" }, discoverBonus = 0.2 } },
	{ id = "c_boyle", name = "로버트 보일", scholarId = "boyle", fee = 450, minFame = 60,
		summary = "실험 화학자. 화학 카드 발견 +20%, 유리·와인 교역 이문에 밝아 되파는 비율 +1%",
		perk = { discoverFields = { "Chemistry" }, discoverBonus = 0.2, sellBonus = 0.01 } },
	{ id = "c_papin", name = "드니 파팽", scholarId = "papin", fee = 500, minFame = 60,
		summary = "증기 장치 기술자. 포격 +5%",
		perk = { cannonMult = 0.05 } },
}

local SpecialtyById: { [string]: Specialty } = {}
for _, s in Specialties do
	SpecialtyById[s.id] = s
end
local CompanionById: { [string]: Companion } = {}
for _, c in Companions do
	CompanionById[c.id] = c
end

return {
	Specialties = Specialties,
	SpecialtyById = SpecialtyById,
	Companions = Companions,
	CompanionById = CompanionById,
	CHANGE_FEE = 200, -- 전문 분야를 바꿀 때의 비용 (처음 고를 때는 무료)
	MAX_COMPANIONS = 2,
}
