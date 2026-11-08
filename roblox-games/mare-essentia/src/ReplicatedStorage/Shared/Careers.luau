--!strict
-- 3대 직업(커리어): 교역 / 모험 / 전투. 각각 경험치와 레벨을 가진다.

export type Career = { level: number, xp: number }

local Careers = {}

Careers.IDS = { "trade", "adventure", "battle" }
Careers.NAMES = { trade = "교역", adventure = "모험", battle = "전투" }
Careers.MAX_LEVEL = 30

function Careers.xpForNext(level: number): number
	return math.floor(60 * level ^ 1.4)
end

function Careers.new(): { [string]: Career }
	return {
		trade = { level = 1, xp = 0 },
		adventure = { level = 1, xp = 0 },
		battle = { level = 1, xp = 0 },
	}
end

-- 경험치를 더하고 오른 레벨 수를 돌려준다.
function Careers.addXp(careers: { [string]: Career }, id: string, amount: number): number
	local c = careers[id]
	if c == nil or amount <= 0 then
		return 0
	end
	local gained = 0
	c.xp += math.floor(amount)
	while c.level < Careers.MAX_LEVEL and c.xp >= Careers.xpForNext(c.level) do
		c.xp -= Careers.xpForNext(c.level)
		c.level += 1
		gained += 1
	end
	if c.level >= Careers.MAX_LEVEL then
		c.xp = 0
	end
	return gained
end

-- 교역 레벨: 되파는 비율 보너스 (최대 +7%)
function Careers.sellBonus(level: number): number
	return math.min(0.07, 0.005 * (level - 1))
end

-- 전투 레벨: 장착 가능한 자동스킬 수 (3~6)
function Careers.loadoutSlots(level: number): number
	return math.min(6, 3 + math.floor(level / 6))
end

-- 모험 레벨: 발견 확률 보너스
function Careers.discoverBonus(level: number): number
	return math.min(0.3, 0.02 * (level - 1))
end

return Careers
