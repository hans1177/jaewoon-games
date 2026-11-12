-- 항구 장면 스모크 빌드: 엔진 목업 위에서 모든 문화권 대표 항구를 발전도 1~5로 지어 본다.
-- 런타임 오류(nil 접근·오타)와 '등록되지 않은 에셋 요청'을 배포 전에 잡는다.
local State = require("./mockstate")
local PortScene = require("./PortScene")
local Cultures = require("./PortCultures")
local ports = { "london", "amsterdam", "rouen", "lisbon", "istanbul", "zanzibar", "calicut", "nagasaki", "veracruz", "venice", "hamburg", "bergen", "sydney", "aden", "cape_town", "canton", "osaka", "alexandria", "havana", "goa", "malacca", "rio", "valletta", "seville", "genoa", "shanghai", "batavia", "manila", "cartagena_indias", "edinburgh", "macau", "salvador", "edo" }
-- 문화권마다 최소 한 곳은 반드시 포함
local seen = {}
for _, id in ports do seen[Cultures.REGION[id] or "?"] = true end
for id, key in Cultures.REGION do
	if not seen[key] then seen[key] = true table.insert(ports, id) end
end
local fails, built = 0, 0
for _, id in ports do
	for lvl = 1, 5 do
		local ok, err = pcall(function()
			PortScene.build({ portId = id, portName = id, level = lvl, shipId = "galleon", hasShipyard = true, facilities = { "bank", "guild", "harbormaster", "market" }, storyCount = 0, companions = {} }, function() end)
		end)
		if ok then built += 1 else fails += 1 print(("실패: %s L%d — %s"):format(id, lvl, tostring(err))) end
	end
end
local miss = {}
for k in State.missing do table.insert(miss, k) end
table.sort(miss)
for _, k in miss do fails += 1 print("등록되지 않은 에셋 요청: " .. k) end
-- 회귀: 숲의 참나무·소나무·야자가 실제로 요청돼야 한다 (find 패턴 버그로 한때 조용히 빠졌다)
for _, must in { "Terrain/tree-oak", "Terrain/tree-pinedefaulta", "Naval/palm-detailed-straight", "Town/house" } do
	if not State.used[must] then fails += 1 print("회귀 실패: 요청되지 않음 " .. must) end
end
-- [CC0 배경 회귀] AssetIds에 등록된 모델만 항구 문화권별로 요청되어야 한다.
local Registered = require("./AssetIds")
for _, id in { "Naval/rocks-sand-a", "Naval/rocks-sand-b", "Naval/rocks-sand-c",
	"Naval/rocks-a", "Naval/rocks-b", "Naval/patch-sand-foliage", "Castle/ground-hills" } do
	if Registered[id] and not State.used[id] then
		fails += 1
		print("회귀 실패: 등록된 해안 배경 요청되지 않음 " .. id)
	end
end
local used = 0 for _ in State.used do used += 1 end
print(("스모크 빌드: 항구 %d곳 × 5단계 중 %d건 성공, 에셋 %d종 요청, 실패 %d"):format(#ports, built, used, fails))
if fails > 0 then error("스모크 빌드 실패") end
