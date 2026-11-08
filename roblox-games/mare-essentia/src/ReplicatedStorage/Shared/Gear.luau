--!strict
-- 항해 장비: 사서 장착한다 (최대 3개). 효과는 숫자 보너스로만 표현한다.

export type GearItem = { id: string, name: string, price: number, minFame: number, summary: string, perk: { [string]: number } }

local Gear: { GearItem } = {
	{ id = "sextant", name = "육분의", price = 400, minFame = 10, summary = "항해 속도 +4%", perk = { speedMult = 0.04 } },
	{ id = "brass_telescope", name = "황동 망원경", price = 350, minFame = 15, summary = "포격 +5% (먼 적선을 먼저 본다)", perk = { cannonMult = 0.05 } },
	{ id = "ledger", name = "가죽 장부", price = 300, minFame = 10, summary = "되파는 비율 +1.5%", perk = { sellBonus = 0.015 } },
	{ id = "medicine_chest", name = "약상자", price = 350, minFame = 20, summary = "열병·괴혈병·사기 하락 -30%", perk = { healMult = 0.3 } },
	{ id = "lucky_charm", name = "행운의 부적", price = 500, minFame = 40, summary = "항해 속도 +2%, 사기 하락 -15%", perk = { speedMult = 0.02, healMult = 0.15 } },
	{ id = "naval_chart", name = "정밀 해도", price = 700, minFame = 60, summary = "항해 속도 +6%", perk = { speedMult = 0.06 } },
}

local ById: { [string]: GearItem } = {}
for _, g in Gear do
	ById[g.id] = g
end

return { Items = Gear, ById = ById, SLOTS = 3 }
