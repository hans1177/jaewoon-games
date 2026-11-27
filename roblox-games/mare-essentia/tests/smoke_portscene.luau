-- 파일명: roblox-games/mare-essentia/tests/smoke_portscene.luau
-- 항구 장면 스모크 빌드: 엔진 목업 위에서 모든 문화권 대표 항구를 발전도 1~5로 지어 본다.
-- 런타임 오류(nil 접근·오타)와 '등록되지 않은 에셋 요청'을 배포 전에 잡는다.
local State = require("./mockstate")
local PortScene = require("./PortScene")
local Cultures = require("./PortCultures")
-- 일부 대표 항구만 테스트하던 기존 사각지대 제거: 실제 등록 항구 181곳 전수를 검증한다.
local Ports = require("./Ports")
local ports = {}
for id in Ports.Ports do table.insert(ports, id) end
table.sort(ports)
-- [181개 항구 전수 회귀] 항구별 경관 변경이 등록 항구·문화권 연결을 누락하면 실패한다.
if #ports ~= 181 then error("항구 목록 181곳 불일치: " .. tostring(#ports)) end
local PortIdentity = require("./PortIdentity")
local landmarkPlans = 0
for _, id in ports do
	local identity = PortIdentity.get(id)
	if identity then
		landmarkPlans += 1
		if not identity.landmark or not identity.landmark.id then
			error("항구 상징 원본 계획 누락: " .. id)
		end
	end
end
if landmarkPlans < 15 then error("항구 상징 건물 계획 15곳 누락") end
for _, id in ports do
	if not Cultures.REGION[id] then error("문화권 미등록 항구: " .. id) end
end
-- [문화권 외관 회귀] 상업/저장 수치는 그대로 유지한 채 건물 몸체가 지역마다 달라지는지 확인.
local regionForms = {
	ottoman = "courtyard", swahili = "carved", wafrica = "flat",
	seasia = "stilt", pacific = "stilt", japan = "eastasia", china = "eastasia", korea = "eastasia",
	hanse = "stepped", italy = "loggia", britain = "timber",
	iberia = "arcade", france = "mansard", colonial = "veranda", malabar = "coastal",
}
for region, expected in regionForms do
	local profile = Cultures.STYLE[region] and Cultures.STYLE[region].house
	if not profile or profile.form ~= expected then
		error(("문화권 건축형태 누락: %s → %s"):format(region, expected))
	end
end
local fails, built = 0, 0
local Registered = require("./AssetIds")
local allUsed = State.used
-- [동적 자산 참조 감사] 항구별 1~5단계 전체 요청을 별도로 수집한다.
-- 등록 원본 부품·조건부 외형은 무조건 배치해야 한다고 가정하지 않는다.
for _, id in ports do
	State.used = {}
	for lvl = 1, 5 do
		local ok, err = pcall(function()
			PortScene.build({ portId = id, portName = id, level = lvl, shipId = "galleon", hasShipyard = true, facilities = { "bank", "guild", "harbormaster", "market" }, storyCount = 0, companions = {} }, function() end)
		end)
		if ok then built += 1 else fails += 1 print(("실패: %s L%d — %s"):format(id, lvl, tostring(err))) end
	end
	local requested, unrequested, sourceUnrequested = {}, {}, {}
	local underscore, hyphen = "Town/" .. id .. "_", "Town/" .. id .. "-"
	for assetKey in Registered do
		if assetKey:sub(1, #underscore) == underscore or assetKey:sub(1, #hyphen) == hyphen then
			if State.used[assetKey] then table.insert(requested, assetKey)
			elseif assetKey:sub(-7) == "-source" then table.insert(sourceUnrequested, assetKey)
			else table.insert(unrequested, assetKey) end
		end
	end
	if #requested + #unrequested + #sourceUnrequested > 0 then
		table.sort(unrequested)
		table.sort(sourceUnrequested)
		print(("PORT_ASSET_REQUEST_AUDIT port=%s registered=%d requested=%d unrequested=%d sourceUnrequested=%d scope=MOCK_NOT_RUNTIME"):format(
			id, #requested + #unrequested + #sourceUnrequested, #requested, #unrequested, #sourceUnrequested))
		if #unrequested > 0 then print("PORT_ASSET_UNREQUESTED " .. id .. " " .. table.concat(unrequested, ";")) end
		if #sourceUnrequested > 0 then print("PORT_ASSET_SOURCE_UNREQUESTED " .. id .. " " .. table.concat(sourceUnrequested, ";")) end
	end
	for assetKey in State.used do allUsed[assetKey] = true end
end
State.used = allUsed
-- 점령 연도 경계 전후도 실제 장면 생성 경로로 확인한다. 스모크는 형태의 렌더링 품질을 보장하지 않는다.
local eraBuilt = 0
for _, entry in {
	{ id = "rhodes", before = 1521, after = 1522 },
	{ id = "famagusta", before = 1570, after = 1571 },
} do
	for _, year in { entry.before, entry.after } do
		local ok, err = pcall(function()
			PortScene.build({
				portId = entry.id, portName = entry.id, level = 3, year = year,
				shipId = "galleon", hasShipyard = true,
				facilities = { "bank", "guild", "harbormaster", "market" },
				storyCount = 0, companions = {},
			}, function() end)
		end)
		if ok then
			eraBuilt += 1
		else
			fails += 1
			print(("시대별 항구 실패: %s %d년 — %s"):format(entry.id, year, tostring(err)))
		end
	end
end
-- [경제-도시-목장] 초안 PR의 실제 공사·지형, 신규 대형 목장·오리, 왕궁 도시를 함께 빌드한다.
local visualScenarios = {
	{ id = "venice", level = 3, farm = 18, workshop = 8, school = 2 },
	{ id = "lisbon", level = 5, farm = 40, workshop = 22, school = 7, palace = true },
	{ id = "amsterdam", level = 4, farm = 27, workshop = 12, school = 4 },
	{ id = "nagasaki", level = 2, farm = 7, workshop = 3, school = 0 },
	-- [지역 항만 필지] 조선소 없는 해안, 인도양, 북유럽도 현지 생산품·경계 표식 빌드.
	{ id = "busan", level = 3, farm = 10, workshop = 2, school = 1, shipyard = false },
	{ id = "zanzibar", level = 4, farm = 14, workshop = 6, school = 2, shipyard = false },
	{ id = "calicut", level = 3, farm = 12, workshop = 6, school = 1, shipyard = false },
	{ id = "stockholm", level = 3, farm = 6, workshop = 4, school = 1, shipyard = false },
}
local visualsBuilt = 0
for _, scenario in visualScenarios do
	local sim = {
		stage = scenario.level, year = 1700, pop = 9500, residents = 44, prosperity = 116, mood = "steady",
		jobs = { farmer = 2300, fisher = 300, craftsman = 2600, merchant = 800, sailor = 800, guard = 500, official = 700, clergy = 100, laborer = 600 },
		technology = { rows = {} },
		-- [실제 원료 연결] 승인된 유리 원료의 3단계 브랜드 공방 외형을 함께 검사한다.
		industries = if scenario.id == "venice" then {
			{ id = "venice_glass", name = "베네치아 유리공방", source = "glass", processed = "유리 제품", stage = 3,
				rawStock = 15, processedStock = 8, produced = 1.4, exported = 0.5 },
		} else {},
		specialties = {},
		buildings = { house = 300, farm = scenario.farm, workshop = scenario.workshop, dock = 10,
			market = 5, warehouse = 7, school = scenario.school, hall = 2 },
		construction = { active = scenario.level >= 3, spending = 30, workshop = 4, house = 12 },
	}
	local ok, err = pcall(function()
		PortScene.build({
			portId = scenario.id, portName = scenario.id, level = scenario.level,
			shipId = "galleon", hasShipyard = scenario.shipyard ~= false,
			facilities = if scenario.palace then { "bank", "guild", "palace", "harbormaster" } else { "bank", "guild", "harbormaster" },
			storyCount = 0, companions = {}, year = 1700, day = 1000,
			development = { level = scenario.level, blocks = 110 },
			builtLandmarks = { academy = true }, sim = sim,
		}, function() end)
	end)
	if ok then visualsBuilt += 1 else
		fails += 1
		print(("경제·목장 도시 장면 실패: %s — %s"):format(scenario.id, tostring(err)))
	end
end
print(("경제·목장 시각 연동 스모크: %d/%d"):format(visualsBuilt, #visualScenarios))
local miss = {}
for k in State.missing do table.insert(miss, k) end
table.sort(miss)
for _, k in miss do fails += 1 print("등록되지 않은 에셋 요청: " .. k) end
-- 회귀: 숲의 참나무·소나무·야자가 실제로 요청돼야 한다 (find 패턴 버그로 한때 조용히 빠졌다)
for _, must in {
	"Terrain/tree-oak", "Terrain/tree-pinedefaulta", "Naval/palm-detailed-straight", "Town/house",
	-- [마을 시각회귀] 유일한 경제/시설 책임 장면이 실제 CC0 실내·브랜드 원료를 배치해야 한다.
	"Town/floor_base", "Town/kenney_wood_wall_01", "Town/kenney_roof_straight_green_01",
	"Interior/tablecross", "Interior/bookcaseopenlow", "Cargo/glass",
	-- [항만 발전 스모크] 등록된 실제 잔교/선박/신호/하역기/경비탑이 단계별 건설 경로에서 쓰여야 한다.
	"Naval/structure-platform-dock-small", "Naval/boat-sail-a", "Naval/pulley-crate",
	"Naval/flag-high-pennant", "Naval/tower-complete-small",
	-- [실제 필지/문화권 회귀] 출항 부표·경계 표지와 해당 지역 생산품 요청.
	"Naval/buoy", "Town/fence_post", "Cargo/rice", "Cargo/ivory",
} do
	if not State.used[must] then fails += 1 print("회귀 실패: 요청되지 않음 " .. must) end
end
-- [CC0 배경 회귀] AssetIds에 등록된 모델만 항구 문화권별로 요청되어야 한다.
-- [항구별 지시서 시설] 실제 등록된 전용 모델만 해당 항구의 기존 1~5단계 빌드에서 요청한다.
-- 등록되지 않은 원본을 테스트용 실제 자산으로 만들거나 런타임 성공으로 표시하지 않는다.
for _, portId in ports do
	for _, kind in { "trade", "tavern", "harbor", "bank", "guild", "scholar" } do
		for tier = 1, 3 do
			local assetId = "Town/" .. portId .. "_" .. kind .. "_" .. tostring(tier)
			if Registered[assetId] and portId == "london" and not State.used[assetId] then
				fails += 1
				print("회귀 실패: 런던 지시서 등록 방문 시설 요청되지 않음 " .. assetId)
			end
		end
	end
end
for _, id in { "Naval/rocks-sand-a", "Naval/rocks-sand-b", "Naval/rocks-sand-c",
	"Naval/rocks-a", "Naval/rocks-b", "Naval/patch-sand-foliage", "Castle/ground-hills",
	"Terrain/Grass_Small", "Terrain/Bush_Small", "Terrain/Rock_2" } do
	if Registered[id] and not State.used[id] then
		fails += 1
		print("회귀 실패: 등록된 해안 배경 요청되지 않음 " .. id)
	end
end
-- [실제 Roblox 이벤트 계약] 항구 장면이 People 신규 에셋 연결을 등록했는지 확인한다.
if State.peopleChildAddedConnections == 0 then
	fails += 1
	print("회귀 실패: 항구 People.ChildAdded 에셋 갱신 이벤트 연결 없음")
end
local used = 0 for _ in State.used do used += 1 end
print(("스모크 빌드: 항구 %d곳 × 5단계 중 %d건 성공, 시대 전환 %d/4건, 에셋 %d종 요청, 실패 %d"):format(#ports, built, eraBuilt, used, fails))
if fails > 0 then error("스모크 빌드 실패") end
