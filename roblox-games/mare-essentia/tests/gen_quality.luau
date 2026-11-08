--!nonstrict
-- 항구별 콘텐츠 점수표. 실행: tests/run.sh quality > docs/devloop/QUALITY.md
-- 낮은 항구부터 보강한다 (특산품, 수요, 탐험지, 이야기, 퀘스트의 풍부함).
local Ports = require("./Shared/Ports")
local Sites = require("./Shared/Sites")
local Story = require("./Shared/Story")
local Quests = require("./Shared/Quests")

local sites, story, quests = {}, {}, {}
for _, s in Sites.Sites do sites[s.portId] = (sites[s.portId] or 0) + 1 end
for _, e in Story.Events do story[e.portId] = (story[e.portId] or 0) + 1 end
for _, q in Quests.Quests do if q.portId then quests[q.portId] = (quests[q.portId] or 0) + 1 end end

local rows = {}
for id, p in Ports.Ports do
	local score = math.min(#p.produces, 4) * 10 + math.min(#p.demands, 4) * 5 + math.min(sites[id] or 0, 3) * 12 + math.min(story[id] or 0, 2) * 12 + math.min(quests[id] or 0, 2) * 8
	table.insert(rows, { id = id, name = p.name, score = score, produces = #p.produces, demands = #p.demands, sites = sites[id] or 0, story = story[id] or 0, quests = quests[id] or 0 })
end
table.sort(rows, function(a, b)
	if a.score ~= b.score then return a.score < b.score end
	return a.id < b.id
end)
print("# 항구 품질표 (낮은 순)")
print()
print("> `tests/gen_quality.luau` 가 자동 생성. 점수 만점 100. 낮은 항구부터 보강한다.")
print()
print("| 항구 | 점수 | 특산 | 수요 | 탐험지 | 이야기 | 퀘스트 |")
print("|---|---|---|---|---|---|---|")
local total = 0
for _, r in rows do
	total += r.score
	print(string.format("| %s (%s) | %d | %d | %d | %d | %d | %d |", r.name, r.id, r.score, r.produces, r.demands, r.sites, r.story, r.quests))
end
print()
print(string.format("평균 %.1f / 항구 %d곳", total / #rows, #rows))
