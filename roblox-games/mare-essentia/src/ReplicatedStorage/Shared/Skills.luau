--!strict
-- 자동 전투 스킬. 장착 순서가 곧 우선순위이고, 쿨타임이 돌아온 첫 스킬이 자동 발동한다.

export type Skill = {
	id: string,
	name: string,
	phase: string, -- "ranged" | "boarding" | "any"
	cooldown: number, -- 라운드
	steamOnly: boolean, -- 증기선 전용
	techReq: string?, -- 필요한 기술
	grantedLevel: number?, -- 전문 분야 스킬이면 필요한 전문 레벨
	grantedBy: string?, -- 이 전문 분야이거나 이 동료와 함께일 때만 쓸 수 있다 (Specialties.luau 의 id)
	summary: string,
}

local Skills: { [string]: Skill } = {
	broadside = {
		id = "broadside", name = "일제 사격", phase = "ranged", cooldown = 2, steamOnly = false,
		summary = "모든 포를 한꺼번에 쏴 선체에 큰 피해",
	},
	chain_shot = {
		id = "chain_shot", name = "사슬탄", phase = "ranged", cooldown = 3, steamOnly = false,
		summary = "돛을 찢어 적 속도를 낮춘다",
	},
	grapeshot = {
		id = "grapeshot", name = "산탄", phase = "ranged", cooldown = 3, steamOnly = false,
		summary = "갑판의 적 선원을 노린다",
	},
	ram = {
		id = "ram", name = "충각 돌진", phase = "ranged", cooldown = 5, steamOnly = false,
		summary = "속도가 빠를수록 큰 선체 피해",
	},
	repair = {
		id = "repair", name = "응급 수리", phase = "any", cooldown = 4, steamOnly = false,
		summary = "선체를 일부 수리",
	},
	rally = {
		id = "rally", name = "사기 고양", phase = "boarding", cooldown = 3, steamOnly = false,
		summary = "다음 두 라운드 백병전 공격력 +25%",
	},
	cutlass_flurry = {
		id = "cutlass_flurry", name = "베기 연타", phase = "boarding", cooldown = 2, steamOnly = false,
		summary = "검사들이 연속으로 벤다",
	},
	pistol_volley = {
		id = "pistol_volley", name = "총병 연사", phase = "boarding", cooldown = 2, steamOnly = false,
		summary = "총병이 방어를 무시하고 사격",
	},
	surgeon = {
		id = "surgeon", name = "군의관 치료", phase = "boarding", cooldown = 3, steamOnly = false,
		summary = "부상한 선원을 일부 회복",
	},
	steam_burst = {
		id = "steam_burst", name = "증기 분사", phase = "ranged", cooldown = 4, steamOnly = true,
		summary = "보일러 압력을 터뜨려 큰 피해 (석탄 소모)",
	},
	steam_hook = {
		id = "steam_hook", name = "증기 갈고리", phase = "boarding", cooldown = 6, steamOnly = false,
		techReq = "steam_hook",
		summary = "갈고리로 적을 붙잡아 한 라운드 행동 불능",
	},
	herbal_remedy = {
		id = "herbal_remedy", grantedLevel = 3, name = "약초 치료", phase = "boarding", cooldown = 3, steamOnly = false,
		grantedBy = "botanist", summary = "약초로 부상한 선원을 크게 회복 (식물학자)",
	},
	predator_decoy = {
		id = "predator_decoy", grantedLevel = 3, name = "맹수 울음", phase = "ranged", cooldown = 4, steamOnly = false,
		grantedBy = "zoologist", summary = "적 선원이 겁먹어 컨디션이 떨어진다 (동물학자)",
	},
	relic_ward = {
		id = "relic_ward", grantedLevel = 3, name = "유물의 가호", phase = "any", cooldown = 5, steamOnly = false,
		grantedBy = "collector", summary = "수집한 유물의 힘으로 선체를 크게 수리 (유물수집가)",
	},
	chart_course = {
		id = "chart_course", grantedLevel = 3, name = "해도 항로 차단", phase = "ranged", cooldown = 4, steamOnly = false,
		grantedBy = "cartographer", summary = "얕은 곳으로 몰아 적 속도를 크게 낮춘다 (지도제작자)",
	},
	bribe_gunners = {
		id = "bribe_gunners", grantedLevel = 3, name = "뇌물 공작", phase = "boarding", cooldown = 7, steamOnly = false,
		grantedBy = "merchant", summary = "적 일부를 매수해 한 라운드 행동 불능 (무역가)",
	},
	star_fix = {
		id = "star_fix", name = "별자리 조준", phase = "ranged", cooldown = 4, steamOnly = false,
		grantedBy = "c_halley", summary = "천문 계산으로 정밀 사격, 큰 선체 피해 (동료 핼리)",
	},
	pressure_valve = {
		id = "pressure_valve", name = "압력 밸브 방출", phase = "ranged", cooldown = 5, steamOnly = false,
		grantedBy = "c_papin", summary = "압력솥의 증기를 뿜어 큰 피해, 석탄 불필요 (동료 파팽)",
	},
}

local Order = {
	"broadside", "chain_shot", "grapeshot", "ram", "repair",
	"rally", "cutlass_flurry", "pistol_volley", "surgeon", "steam_burst", "steam_hook",
	"herbal_remedy", "predator_decoy", "relic_ward", "chart_course", "bribe_gunners", "star_fix", "pressure_valve",
}

local DefaultLoadout = { "broadside", "grapeshot", "cutlass_flurry", "pistol_volley" }

return {
	Skills = Skills,
	Order = Order,
	DefaultLoadout = DefaultLoadout,
}
