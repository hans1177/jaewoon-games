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
	healMult: number?, -- 열병·괴혈병·사기 하락 감소 (0.5 = 절반)
}

export type Specialty = { id: string, name: string, summary: string, perk: Perk, xpOn: { string } } -- xpOn: 경험치를 주는 카드 분야 또는 "voyage"/"trade"

export type Companion = {
	id: string,
	name: string,
	scholarId: string, -- 먼저 이 학자를 만나 지식을 전수받아야 한다 ("" = 주점에서 바로 영입)
	role: string?, -- 항해사·포수·회계사·의사 (주점 동료)
	fee: number, -- 영입 비용
	minFame: number,
	summary: string,
	perk: Perk,
	battleLine: string, -- 전투가 시작될 때 하는 말
	winLine: string, -- 이겼을 때 하는 말
	nation: string?, -- 이 나라 주인공의 동료 (첫 항해에서 자동 합류)
}

local Specialties: { Specialty } = {
	{ id = "botanist", name = "식물학자", summary = "식물·약용·의학 카드 발견 확률 +25%",
		perk = { discoverFields = { "Botany", "Medicine" }, discoverBonus = 0.25 }, xpOn = { "Botany", "Medicine" } },
	{ id = "zoologist", name = "동물학자", summary = "동물 카드 발견 확률 +25%",
		perk = { discoverFields = { "Zoology" }, discoverBonus = 0.25 }, xpOn = { "Zoology" } },
	{ id = "collector", name = "유물수집가", summary = "유물·유적·광물·예술·건축·언어 카드 등록 코인 +50%",
		perk = { coinFields = { "Relic", "Site", "Mineral", "Art", "Architecture", "Language" }, coinMult = 0.5 }, xpOn = { "Relic", "Site", "Mineral", "Art", "Architecture", "Language" } },
	{ id = "cartographer", name = "지도제작자", summary = "항해 속도 +10%",
		perk = { speedMult = 0.1 }, xpOn = { "voyage", "Geography", "Astronomy", "Navigation", "Weather", "Shipbuilding" } },
	{ id = "merchant", name = "무역가", summary = "되파는 비율 +2%",
		perk = { sellBonus = 0.02 }, xpOn = { "trade", "Goods" } },
}

local Companions: { Companion } = {
	{ id = "c_merian", name = "마리아 메리안", scholarId = "merian", fee = 300, minFame = 60,
		summary = "곤충·식물을 정밀하게 그리는 박물화가. 동물·식물 카드 발견 +15%",
		perk = { discoverFields = { "Zoology", "Botany" }, discoverBonus = 0.15 },
		battleLine = "적 배 갑판 위의 벌레까지 그리고 싶지만... 지금은 몸부터 지켜요!",
		winLine = "무사해서 다행이에요. 이 장면도 스케치해 둘게요." },
	{ id = "c_halley", name = "에드먼드 핼리", scholarId = "halley", fee = 500, minFame = 80,
		summary = "천문·항해에 밝은 학자. 항해 속도 +8%, 천문·지리 카드 발견 +15%",
		perk = { speedMult = 0.08, discoverFields = { "Astronomy", "Geography" }, discoverBonus = 0.15 },
		battleLine = "풍향과 별을 계산했네. 지금 쏘면 맞을 걸세!",
		winLine = "계산대로군. 오늘 밤 하늘 관측도 기대되는걸." },
	{ id = "c_leeuwenhoek", name = "안톤 판 레이우엔훅", scholarId = "leeuwenhoek", fee = 400, minFame = 70,
		summary = "현미경 관찰의 대가. 물리·화학·의학 카드 발견 +15%",
		perk = { discoverFields = { "Physics", "Chemistry", "Medicine" }, discoverBonus = 0.15 },
		battleLine = "렌즈 상자는 안전한 곳에 두었다오. 어서 싸웁시다!",
		winLine = "전투 중에 튄 물방울도 현미경으로 봐야겠소." },
	{ id = "c_linnaeus", name = "카를 린네", scholarId = "linnaeus", fee = 600, minFame = 120,
		summary = "식물 분류의 아버지. 식물·광물·동물 카드 발견 +20%",
		perk = { discoverFields = { "Botany", "Mineral", "Zoology" }, discoverBonus = 0.2 },
		battleLine = "전투 중에도 분류는 계속된다네. 저 배는 '해적속'이지.",
		winLine = "해적속 하나를 정리했군. 다음엔 식물 차례일세." },
	{ id = "c_boyle", name = "로버트 보일", scholarId = "boyle", fee = 450, minFame = 60,
		summary = "실험 화학자. 화학 카드 발견 +20%, 유리·와인 교역 이문에 밝아 되파는 비율 +1%",
		perk = { discoverFields = { "Chemistry" }, discoverBonus = 0.2, sellBonus = 0.01 },
		battleLine = "화약의 연소를 직접 볼 기회군. 침착하게 합시다.",
		winLine = "결과는 실험으로 확인되었소. 우리가 이겼소." },
	{ id = "c_papin", name = "드니 파팽", scholarId = "papin", fee = 500, minFame = 60,
		summary = "증기 장치 기술자. 포격 +5%",
		perk = { cannonMult = 0.05 },
		battleLine = "압력 게이지를 확인했소. 증기는 언제든 준비되어 있소!",
		winLine = "압력이 아주 잘 버텨 줬소. 뿌듯하군." },
	-- 주점에서 영입하는 직능 동료 (학자 전수 불필요)
	{ id = "t_navigator", name = "항해사 마르코", scholarId = "", role = "항해사", fee = 250, minFame = 20,
		summary = "별과 바람을 읽는 노련한 항해사. 항해 속도 +6%",
		perk = { speedMult = 0.06 },
		battleLine = "바람을 등지게 키를 돌리겠습니다!", winLine = "항로는 흔들리지 않았습니다, 선장님." },
	{ id = "t_gunner", name = "포수 아나", scholarId = "", role = "포수", fee = 300, minFame = 30,
		summary = "포대를 지휘하는 베테랑 포수. 포격 +8%",
		perk = { cannonMult = 0.08 },
		battleLine = "장전 완료! 신호만 주세요!", winLine = "적선 돛대가 부러지는 소리, 언제 들어도 좋군요." },
	{ id = "t_purser", name = "회계사 얀", scholarId = "", role = "회계사", fee = 280, minFame = 25,
		summary = "장부에 밝은 사무장. 되파는 비율 +2%",
		perk = { sellBonus = 0.02 },
		battleLine = "전투 비용은 나중에 청구하겠습니다... 지금은 숨으세요!", winLine = "노획품 목록은 제가 정리하겠습니다." },
	{ id = "t_surgeon", name = "의사 엘레나", scholarId = "", role = "의사", fee = 320, minFame = 35,
		summary = "선상 외과의. 열병·괴혈병 피해와 사기 하락이 절반",
		perk = { healMult = 0.5 },
		battleLine = "다친 사람은 제게 데려오세요!", winLine = "부상자 모두 무사합니다. 오늘은 운이 좋았어요." },
	{ id = "n_england", name = "조수 윌", scholarId = "", role = "관측 조수", fee = 0, minFame = 0, nation = "england",
		summary = "관측 기구를 든 어린 조수. 항해 속도 +4%",
		perk = { speedMult = 0.04 },
		battleLine = "바람 방향 기록했습니다, 선장님!", winLine = "관측 값이 정확했어요. 논문에 넣을 수 있겠어요." },
	{ id = "n_netherlands", name = "장부원 피터", scholarId = "", role = "장부원", fee = 0, minFame = 0, nation = "netherlands",
		summary = "숫자에 밝은 젊은 장부원. 되파는 비율 +2%",
		perk = { sellBonus = 0.02 },
		battleLine = "전투 비용은 제가 기록하겠습니다!", winLine = "노획품 정리는 제 몫이죠." },
	{ id = "n_france", name = "시종 로랑", scholarId = "", role = "옛 영지 시종", fee = 0, minFame = 0, nation = "france",
		summary = "가문을 모시던 충직한 시종. 열병·사기 하락 30% 감소",
		perk = { healMult = 0.3 },
		battleLine = "아가씨, 제 뒤로 서세요!", winLine = "아가씨가 무사하시니 그걸로 충분합니다." },
	{ id = "n_portugal", name = "도선사 페드루", scholarId = "", role = "동기 도선사", fee = 0, minFame = 0, nation = "portugal",
		summary = "항해학교 동기 도선사. 항해 속도 +5%",
		perk = { speedMult = 0.05 },
		battleLine = "키는 제게 맡겨!", winLine = "우리가 해냈어, 이네스!" },
	{ id = "n_ottoman", name = "대상 상인 카심", scholarId = "", role = "베테랑 대상 상인", fee = 0, minFame = 0, nation = "ottoman",
		summary = "사막과 바다를 오간 노련한 상인. 되파는 비율 +2%",
		perk = { sellBonus = 0.02 },
		battleLine = "상인이라고 칼을 못 쥐는 건 아니오!", winLine = "전리품은 공정하게 나눕시다." },
	{ id = "n_swahili", name = "젊은 선원 주마", scholarId = "", role = "다우선 선원", fee = 0, minFame = 0, nation = "swahili",
		summary = "계절풍을 몸으로 아는 선원. 항해 속도 +5%",
		perk = { speedMult = 0.05 },
		battleLine = "돛을 올려라! 바람이 우리 편이다!", winLine = "바람이 우릴 지켜줬어!" },
	{ id = "n_malabar", name = "후추 농부 쿠티", scholarId = "", role = "농부 대표", fee = 0, minFame = 0, nation = "malabar",
		summary = "마을의 후추를 맡긴 농부 대표. 되파는 비율 +3%",
		perk = { sellBonus = 0.03 },
		battleLine = "고향 마을을 생각하면 겁날 게 없소!", winLine = "이 후추 한 알에 마을의 희망이 있소." },
	{ id = "n_japan", name = "사무라이 겐지", scholarId = "", role = "낭인 무사", fee = 0, minFame = 0, nation = "japan",
		summary = "항구에서 만난 낭인 무사. 포격 +8%",
		perk = { cannonMult = 0.08 },
		battleLine = "칼은 바다에서도 무뎌지지 않소!", winLine = "승패는 병가지상사. 하지만 오늘은 이겼소." },
	{ id = "n_new_spain", name = "광부 출신 마테오", scholarId = "", role = "광산 출신 선원", fee = 0, minFame = 0, nation = "new_spain",
		summary = "광산에서 단련된 힘센 선원. 포격 +6%",
		perk = { cannonMult = 0.06 },
		battleLine = "곡괭이 대신 대포를 잡아도 힘은 같소!", winLine = "이 정도면 광산 폭발보다 쉽소." },
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
	MAX_AFFINITY = 100,
	-- 호감도 단계: 0~29 낯선 사이(x1.0), 30~69 믿는 사이(x1.15), 70 이상 오랜 벗(x1.3)
	affinityTier = function(affinity: number): number
		if affinity >= 70 then
			return 3
		elseif affinity >= 30 then
			return 2
		end
		return 1
	end,
	affinityMult = function(affinity: number): number
		if affinity >= 70 then
			return 1.3
		elseif affinity >= 30 then
			return 1.15
		end
		return 1
	end,
	MAX_LEVEL = 5,
	SKILL_LEVEL = 3, -- 전문 분야 전용 스킬이 열리는 전문 레벨
	-- 전문 레벨 L 의 보너스 배율: 1.0, 1.2, 1.4, 1.6, 1.8
	levelMult = function(level: number): number
		return 1 + 0.2 * (math.clamp(level, 1, 5) - 1)
	end,
	xpForNext = function(level: number): number
		return math.floor(40 * level ^ 1.5)
	end,
	CHANGE_FEE = 200, -- 전문 분야를 바꿀 때의 비용 (처음 고를 때는 무료)
	MAX_COMPANIONS = 2,
}
