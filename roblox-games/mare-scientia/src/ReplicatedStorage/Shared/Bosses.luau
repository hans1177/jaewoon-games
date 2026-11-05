--!strict
-- 신화 보스: 전설 속 바다 괴물. 일정 전투 레벨 이상에서 해당 해역 항구에서 도전할 수 있다.
-- 증기선은 엔진 소리 때문에 괴물을 자극한다 (steamRage 배율만큼 괴물이 더 세진다).

export type Boss = {
	id: string,
	name: string,
	summary: string,
	portIds: { string }, -- 도전 가능한 항구 (그 해역을 지나는 곳)
	minBattleLevel: number,
	cooldownDays: number,
	hull: number,
	crew: number, -- 촉수/몸통 "병력" 수치 (백병전에서 쓰인다)
	cannons: number, -- 공격력 환산 (포 개수와 같은 방식)
	cannonMult: number,
	meleeMult: number,
	steamRage: number, -- 상대가 증기선이면 공격 배율에 곱한다
	skills: { string },
	rewardCoins: number,
	rewardFame: number,
	rewardXp: number,
	cardId: string, -- 첫 격파 시 도감 등록
}

local Bosses: { Boss } = {
	{
		id = "kraken",
		name = "크라켄",
		summary = "북해 깊은 곳에서 배를 끌어내린다는 거대 촉수 괴물. 증기선 엔진 소리에 날뛴다.",
		portIds = { "bergen", "copenhagen", "gothenburg", "edinburgh" },
		minBattleLevel = 8,
		cooldownDays = 30,
		hull = 285,
		crew = 55,
		cannons = 16,
		cannonMult = 1,
		meleeMult = 1.2,
		steamRage = 1.2,
		skills = { "broadside", "grapeshot", "cutlass_flurry" },
		rewardCoins = 1500,
		rewardFame = 60,
		rewardXp = 400,
		cardId = "myth_kraken",
	},
	{
		id = "sea_serpent",
		name = "바다뱀",
		summary = "대서양 먼 바다에서 목격담이 이어지는 긴 몸의 괴물. 빠르게 휘감아 배를 부순다.",
		portIds = { "london", "dublin", "bordeaux" },
		minBattleLevel = 5,
		cooldownDays = 20,
		hull = 255,
		crew = 49,
		cannons = 14,
		cannonMult = 1,
		meleeMult = 1.1,
		steamRage = 1.1,
		skills = { "broadside", "cutlass_flurry" },
		rewardCoins = 900,
		rewardFame = 35,
		rewardXp = 260,
		cardId = "myth_sea_serpent",
	},
	{
		id = "siren",
		name = "세이렌",
		summary = "지중해 바위섬에서 노래로 뱃사람을 홀린다는 괴물. 홀리는 노래에 선원들이 흔들린다.",
		portIds = { "venice", "naples", "marseille", "genoa" },
		minBattleLevel = 6,
		cooldownDays = 25,
		hull = 230,
		crew = 46,
		cannons = 13,
		cannonMult = 1,
		meleeMult = 1.15,
		steamRage = 1.0,
		skills = { "broadside", "chain_shot", "cutlass_flurry" },
		rewardCoins = 1100,
		rewardFame = 45,
		rewardXp = 320,
		cardId = "myth_siren",
	},
}

local ById: { [string]: Boss } = {}
for _, b in Bosses do
	ById[b.id] = b
end

return { Bosses = Bosses, ById = ById }
