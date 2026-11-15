local Eco = require("./Shared/Economy")
local passed, failed = 0, 0
local function check(name, cond, detail)
	if cond then passed += 1 else failed += 1; print("FAIL: " .. name .. (detail and (" -> " .. tostring(detail)) or "")) end
end

local w = Eco.newWorld({ seed = 7, year = 1650 })
local n = 0
for _ in pairs(w.towns) do n += 1 end
check("모든 항구가 마을로 생성", n > 150, n)
local pop0 = Eco.aggregate(w, "world").pop
Eco.run(w, 365 * 5)
local ag = Eco.aggregate(w, "world")
check("5년 뒤에도 수치가 유한", ag.pop == ag.pop and ag.gdp == ag.gdp and ag.pop > 0 and ag.pop < math.huge, ag.pop)
check("인구가 폭주/붕괴하지 않는다", ag.pop > pop0 * 0.5 and ag.pop < pop0 * 3, ag.pop / pop0)
local lo, hi = 9, 0
for _, t in pairs(w.towns) do
	for _, g in ipairs(t.goods) do
		local r = t.price[g] / (g == "grain" and 10 or require("./Shared/Ports").Goods[g].basePrice)
		lo = math.min(lo, r); hi = math.max(hi, r)
	end
end
check("가격이 범위 안", lo >= 0.39 and hi <= 3.01, lo .. "/" .. hi)
check("무역이 일어난다", ag.tradeIn > 0)
-- 결정적
local a, b = Eco.newWorld({ seed = 3 }), Eco.newWorld({ seed = 3 })
Eco.run(a, 200); Eco.run(b, 200)
check("같은 시드 → 같은 결과", math.abs(Eco.aggregate(a, "world").gdp - Eco.aggregate(b, "world").gdp) < 1e-6)
-- 기근 충격: 인구가 줄고 곡물 가격이 오른다
do
	local x, y = Eco.newWorld({ seed = 5, year = 1650 }), Eco.newWorld({ seed = 5, year = 1650 })
	Eco.run(x, 30); Eco.run(y, 30)
	Eco.addShock(x, { id = "t", title = "t", ports = { "london" }, food = 0.2, prod = 1, trade = 0.3, demand = 1, mort = 0.002, days = 300 })
	Eco.run(x, 300); Eco.run(y, 300)
	check("기근·역병 충격 → 인구 감소", x.towns.london.pop < y.towns.london.pop * 0.9, x.towns.london.pop .. " vs " .. y.towns.london.pop)
	check("곡물 값이 오른다", x.towns.london.price.grain > y.towns.london.price.grain)
end
-- 역사 사건: 시작 연도에 진행 중인 사건이 켜진다
do
	local h = Eco.newWorld({ year = 1625 })
	local found = false
	for _, s in ipairs(h.shocks) do if s.id == "thirty_years" then found = true end end
	check("1625년엔 30년 전쟁 진행 중", found)
	local z = Eco.newWorld({ year = 1664 })
	Eco.run(z, 366)
	local seen = false
	for _, l in ipairs(z.log) do if l.id == "london_plague" then seen = true end end
	check("1665년이 되면 런던 대역병 발생", seen)
end
-- 호황/불황 진동
do
	local c = { seed = 11, cycle = { x = 0, v = 0, lvl = {}, reg = { europe = { x = 0, v = 0 } } } }
	local mn, mx = 1, -1
	for _ = 1, 365 * 30 do Eco.stepCycle(c); mn = math.min(mn, c.cycle.x); mx = math.max(mx, c.cycle.x) end
	check("경기 순환이 오르내린다", mn < -0.1 and mx > 0.1, mn .. "/" .. mx)
end
-- 문명: 기술이 자라고 시설·안정도가 유한
do
	local t = w.towns.amsterdam
	check("기술이 시작값보다 오른다", t.tech.agri > 0.9 and t.civ > 0, t.tech.agri)
	local ag2 = Eco.aggregate(w, "world")
	check("집계: 기술·안정도", ag2.techAvg > 0.5 and ag2.stability > 0 and ag2.stability <= 1, ag2.stability)
	local sec = ag2.sector
	check("부문별 GDP 양수", sec.agri > 0 and sec.industry > 0 and sec.service > 0)
end
-- 직업·외형·집계
do
	local t = w.towns.london
	local jobs = Eco.jobs(t)
	local sum = 0
	for _, v in pairs(jobs) do sum += v end
	check("직업 합 = 인구", math.abs(sum - math.floor(t.pop)) <= 2, sum .. "/" .. t.pop)
	check("NPC 직업 배정", Eco.npcJob(t, 1, 20) == "farmer" and Eco.npcJob(t, 20, 20) == "laborer")
	local v = Eco.visual(t)
	check("외형 값", v.residents >= 6 and v.buildingScale > 0.8)
	check("시설에 농장·시장", table.find(Eco.facilities(t), "farm") ~= nil)
	check("국가 집계", Eco.aggregate(w, "country", "england").towns == 3)
	check("해역 집계", Eco.aggregate(w, "region", "europe").towns > 10)
end
-- 이벤트 변환
do
	local s = Eco.shockFromEvent({ id = "famine", tag = "기근", title = "흉작", days = 70 }, "europe")
	check("기근 이벤트 → 식량 충격", s.food < 1 and s.days == 70)
end
print(string.format("economy: %d passed, %d failed", passed, failed))
if failed > 0 then error("economy tests failed") end
