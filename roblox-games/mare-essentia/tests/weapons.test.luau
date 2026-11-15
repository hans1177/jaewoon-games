--!strict
local W = require("./Shared/Weapons")
local J = require("./Shared/JobSkills")
local passed, failed = 0, 0
local function check(name: string, ok: boolean)
	if ok then
		passed += 1
	else
		failed += 1
		print("실패: " .. name)
	end
end
check("무기가 8종 이상", #W.List >= 8)
local ids: { [string]: boolean } = {}
local dup = false
for _, w in W.List do
	if ids[w.id] then dup = true end
	ids[w.id] = true
end
check("무기 id 중복 없음", not dup)
check("맨손·검·도끼·석궁·총 모두 있다", ids.fist and ids.sword and ids.axe and ids.crossbow and ids.gun)
check("원거리는 석궁·총", W.get("crossbow").ranged and W.get("gun").ranged and not W.get("sword").ranged)
check("없는 id 는 맨손", W.get("nope").id == "fist")
-- 동료: 모든 직업 분류가 석궁·총·검·도끼 중 하나로 고정된다
local allowed = { sword = true, gun = true, axe = true, crossbow = true }
local allOk = true
for catId in J.Categories do
	local w = W.allyWeapon(catId)
	if not allowed[w.id] then allOk = false end
end
check("동료 무기는 석궁·총·검·도끼만", allOk)
check("포수=총, 무인=검", W.allyWeapon("gunner").id == "gun" and W.allyWeapon("warrior").id == "sword")
check("순환: 마지막 다음은 처음", W.cycle(W.List[#W.List].id, 1).id == W.List[1].id)
check("순환: 처음 이전은 마지막", W.cycle(W.List[1].id, -1).id == W.List[#W.List].id)
check("빠른 무기는 동작이 짧다", W.swingDuration(W.get("dagger"), 1) < W.swingDuration(W.get("axe"), 1))
check("도끼가 맨손보다 세다", W.damage(W.get("axe"), 10) > W.damage(W.get("fist"), 10))
print(string.format("무기 테스트: 통과 %d, 실패 %d", passed, failed))
if failed > 0 then error("무기 테스트 실패") end
