local Eco = require("./Shared/Economy")
local Regions = require("./Shared/Regions")
local w = Eco.newWorld({ seed = 1, year = 1650 })
local function row(label, a) return string.format("%-14s 인구 %8d  GDP/일 %9d  1인당 %5.1f  물가 %4.2f  교역 %8d  기술 %4.2f  안정 %3.2f", label, a.pop, a.gdp, a.gdpPerCap, a.priceIdx, a.tradeOut, a.techAvg, a.stability) end
for _, yr in ipairs({ 0, 10, 25 }) do
	Eco.run(w, yr == 0 and 1 or (yr == 10 and 3650 or 5475))
	print(string.format("== %.0f년 | 경기 %.2f ==", Eco.year(w), w.cycle.x))
	print(row("세계", Eco.aggregate(w, "world")))
	for _, r in ipairs(Regions.List) do print(row(r.name, Eco.aggregate(w, "region", r.id))) end
end
local list = {}
for _, id in ipairs(w.order) do table.insert(list, w.towns[id]) end
table.sort(list, function(a, b) return a.pop > b.pop end)
print("== 인구 상위 마을 ==")
for i = 1, 8 do local t = list[i]; print(string.format("%-8s %-8s 인구 %7d 단계 %d(%s) 번영 %.2f 임금 %.2f 안정 %.2f", t.name, t.country, t.pop, t.stage, Eco.STAGE_NAMES[t.stage], t.prosperity, t.wage, t.stability)) end
local mn, mx = list[#list], list[1]
print("최소 마을", mn.name, math.floor(mn.pop))
local cnt = {}
for _, l in ipairs(w.log) do
	local k = l.id:match("^unrest_") and "민란" or l.title
	cnt[k] = (cnt[k] or 0) + 1
end
local parts = {}
for k, v in pairs(cnt) do table.insert(parts, k .. "×" .. v) end
table.sort(parts)
print("사건:", table.concat(parts, " / "))
