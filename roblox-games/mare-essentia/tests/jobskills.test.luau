local J = require("./Shared/JobSkills")
local passed, failed = 0, 0
local function check(name, cond, detail)
	if cond then passed += 1 else failed += 1; print("FAIL: " .. name .. (detail and (" -> " .. tostring(detail)) or "")) end
end

check("상한: 주인공 3, 동료 2", J.MAX_PLAYER_SKILLS == 3 and J.MAX_ALLY_SKILLS == 2)

-- 모든 분류의 스킬은 정의돼 있고 동료 상한을 넘지 않는다
for id, cat in J.Categories do
	check("분류 " .. id .. " 스킬 ≤ 2", #cat.skills <= 2 and #cat.skills >= 1, #cat.skills)
	for _, sk in cat.skills do check("스킬 정의 " .. sk, J.Skills[sk] ~= nil and J.Skills[sk].cooldown > 0) end
end

-- 직업 이름 → 분류 (실제 동료 role 값들)
local cases = {
	["성직자"] = "healer", ["수녀"] = "healer", ["의사"] = "healer", ["pilgrim"] = "healer",
	["포수"] = "gunner", ["갤리온 포수"] = "gunner", ["포술장"] = "gunner",
	["해류 학자"] = "scholar", ["관측 조수"] = "scholar", ["필사자"] = "scholar",
	["항해사"] = "navigator", ["조타수"] = "navigator", ["explorer"] = "navigator",
	["merchant"] = "merchant", ["회계사"] = "merchant", ["향신료 상인"] = "merchant",
	["soldier"] = "warrior", ["낭인 무사"] = "warrior", ["pirate"] = "warrior", ["privateer"] = "warrior",
}
for job, want in cases do
	local got = J.categoryOf(job)
	check("직업 " .. job .. " → " .. want, got == want, got)
end
check("모르는 직업/없음은 무인", J.categoryOf("???") == "warrior" and J.categoryOf(nil) == "warrior")

-- 동료 스킬은 항상 최대 2개
for job in cases do
	local sk = J.allySkills(job)
	check("동료 스킬 ≤ 2: " .. job, #sk >= 1 and #sk <= 2, #sk)
end
check("성직자는 치료·보호", table.concat(J.allySkills("성직자"), ",") == "heal,armor")
check("포수는 사격·저격", table.concat(J.allySkills("포수"), ",") == "volley,snipe")

-- 주인공 장착: 최대 3, 중복·없는 것 제외, 요청 순서 우선
local avail = { "heavy", "sweep", "card1", "card2", "card3" }
check("기본 3개", #J.playerLoadout(nil, avail) == 3 and J.playerLoadout(nil, avail)[1] == "heavy")
local l = J.playerLoadout({ "card2", "card2", "nope", "card1", "heavy", "sweep" }, avail)
check("요청 순서·중복 제외·3개 상한", #l == 3 and l[1] == "card2" and l[2] == "card1" and l[3] == "heavy", table.concat(l, ","))
check("쓸 수 있는 게 1개면 1개", #J.playerLoadout(nil, { "heavy" }) == 1)
check("없으면 0개", #J.playerLoadout({ "x" }, {}) == 0)

-- 해금: 처음 2칸, 전투 Lv.5에 3칸
check("Lv1 은 2칸", J.playerSlots(1) == 2 and J.playerSlots(nil) == 2 and J.playerSlots(4) == 2)
check("Lv5 부터 3칸", J.playerSlots(5) == 3 and J.playerSlots(30) == 3)
check("2칸이면 2개만 장착", #J.playerLoadout(nil, avail, 2) == 2 and J.playerLoadout(nil, avail, 2)[2] == "sweep")
check("칸 수는 3을 못 넘는다", #J.playerLoadout(nil, avail, 9) == 3)
check("0칸이면 비어 있다", #J.playerLoadout(nil, avail, 0) == 0)

print(string.format("jobskills: %d passed, %d failed", passed, failed))
if failed > 0 then error("jobskills tests failed") end
