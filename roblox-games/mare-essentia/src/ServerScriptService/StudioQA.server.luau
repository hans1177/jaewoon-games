--!nonstrict
-- Studio 전용 자동 점검(바이브가 스스로 화면·진행 오류를 찾는 용도). 라이브 서버에서는 아무것도 하지 않는다.
-- 결과는 Output 에 "[QA]" 로 시작하는 줄로 남긴다: [QA] FAIL = 고쳐야 함, [QA] OK = 통과.
local RunService = game:GetService("RunService")
if not RunService:IsStudio() then
	return
end
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local ContentProvider = game:GetService("ContentProvider")
local HttpService = game:GetService("HttpService")
local Shared = ReplicatedStorage:WaitForChild("Shared")

local fails, oks = 0, 0
-- [증거] 기존 Studio 실행기가 실제 자산·기능 검사 완료 여부를 읽는다.
ReplicatedStorage:SetAttribute("MareQAAssetStatus", "RUNNING")
ReplicatedStorage:SetAttribute("MareQAAssetTotals", "")
ReplicatedStorage:SetAttribute("MareQAFeatureStatus", "RUNNING")
ReplicatedStorage:SetAttribute("MareQAFeatureTotals", "")
local function ok(msg)
	oks += 1
	print("[QA] OK " .. msg)
end
local function fail(msg)
	fails += 1
	warn("[QA] FAIL " .. msg)
end

-- 1) 자산: 모든 이미지·모델·소리 ID가 이 체험에서 실제로 불러와지는지
task.spawn(function()
	local ids = {}
	local moduleErrors, modelReferences = 0, 0
	for _, moduleName in { "AssetIds", "AudioIds" } do
		local m = Shared:FindFirstChild(moduleName)
		local success, data = pcall(function()
			return require(m)
		end)
		if success and type(data) == "table" then
			for key, value in data do
				local url = type(value) == "number" and ("rbxassetid://" .. value) or tostring(value)
				if string.find(url, "rbxassetid://", 1, true) then
					table.insert(ids, { key = moduleName .. "." .. tostring(key), url = url })
					if moduleName == "AssetIds" and not (string.find(key, "Menu/", 1, true) or string.find(key, "Goods/", 1, true) or string.find(key, "Portraits/", 1, true) or string.find(key, "CardArt/", 1, true)) then
						modelReferences += 1
					end
				else
					moduleErrors += 1
					fail("invalid asset id " .. moduleName .. "." .. tostring(key))
				end
			end
		else
			moduleErrors += 1
			fail("module " .. moduleName .. " load error")
		end
	end
	local bad = 0
	-- [자산 감사] 실제 로딩 콜백·실패 자산·진행 위치를 보존한다.
	local mediaStarted = os.clock()
	local mediaCallbacks, currentBatch, timedOutMedia = 0, 0, 0
	local serverPreloadUnresponsive = false
	local failedMedia = {}
	local items = {}
	for _, it in ids do
		local kind = nil
		if string.find(it.key, "AudioIds") then
			kind = "Sound"
		elseif string.find(it.key, ".Menu/", 1, true) or string.find(it.key, ".Goods/", 1, true) or string.find(it.key, ".Portraits/", 1, true) or string.find(it.key, ".CardArt/", 1, true) then
			kind = "ImageLabel"
		end
		if kind then
			local inst = Instance.new(kind)
			if kind == "Sound" then
				inst.SoundId = it.url
			else
				inst.Image = it.url
			end
			table.insert(items, { inst = inst, it = it })
		end
	end
	-- [진단] 로블록스 콘텐츠 서버가 응답하지 않아도 종료 결과를 남기며 성공으로 간주하지 않는다.
	task.delay(140, function()
		if ReplicatedStorage:GetAttribute("MareQAAssetStatus") ~= "RUNNING" then return end
		ReplicatedStorage:SetAttribute("MareQAAssetTotals", HttpService:JSONEncode({
			registered = #ids, imagesSounds = #items, models = modelReferences,
			fetchCallbacks = mediaCallbacks, currentBatch = currentBatch,
			failed = bad + moduleErrors, failedMedia = failedMedia,
			serverPreloadUnresponsive = serverPreloadUnresponsive,
			elapsedSeconds = math.floor(os.clock() - mediaStarted), timedOut = true,
		}))
		ReplicatedStorage:SetAttribute("MareQAAssetStatus", "FAIL")
		fail("asset preload timed out at batch " .. currentBatch .. " callbacks=" .. mediaCallbacks .. "/" .. #items)
	end)
	-- [이미지·음원] 30개 묶음의 단일 PreloadAsync가 멈추면 누락 원인을 알 수 없다.
	-- 기존 ContentProvider 경로에서 ID별로 로드하고 12개씩 병렬 진행해 한 개의 정지가 전체 검사를 막지 못하게 한다.
	table.sort(items, function(a, b) return a.it.key < b.it.key end)
	for i = 1, #items, 12 do
		if ReplicatedStorage:GetAttribute("MareQAAssetStatus") ~= "RUNNING" then break end
		currentBatch = i
		local remaining = math.min(12, #items - i + 1)
		for j = i, math.min(i + 11, #items) do
			local row = items[j]
			local finished, fetchStatus = false, nil
			-- [실패 증거] 한 ID의 타임아웃·콜백·실패를 한 번만 확정한다.
			local function complete(status)
				if finished then return end
				finished = true
				remaining -= 1
				row.inst:Destroy()
				if status == "SUCCESS" then return end
				if status == "TIMEOUT_16S" then timedOutMedia += 1 end
				bad += 1
				if #failedMedia < 128 then
					table.insert(failedMedia, { key = row.it.key, id = row.it.url, status = status })
				end
				fail("asset " .. row.it.key .. " " .. row.it.url .. " status=" .. status)
			end
			task.spawn(function()
				local preloaded, preloadError = pcall(ContentProvider.PreloadAsync, ContentProvider, { row.inst }, function(_, status)
					if finished then return end
					mediaCallbacks += 1
					if status ~= Enum.AssetFetchStatus.Success or fetchStatus == nil then
						fetchStatus = status
					end
				end)
				if not preloaded then
					complete("PRELOAD_ERROR:" .. tostring(preloadError):sub(1, 95))
				elseif fetchStatus == Enum.AssetFetchStatus.Success then
					complete("SUCCESS")
				else
					complete(if fetchStatus then tostring(fetchStatus) else "NO_CALLBACK")
				end
			end)
			-- [개별 제한] ContentProvider 호출이 반환되지 않아도 다음 등록 ID 검사를 계속한다.
			task.delay(16, function()
				complete("TIMEOUT_16S")
			end)
		end
		while remaining > 0 and ReplicatedStorage:GetAttribute("MareQAAssetStatus") == "RUNNING" do
			task.wait(0.2)
		end
		-- [서버 로딩 장애] 첫 12건 모두 콜백 없이 시간 초과면 같은 서버 선로딩을 반복하지 않는다.
		-- 전체 등록 목록은 유지하고 FAIL을 기록한다. 기존 Studio Client 전수 IsLoaded 검증만 PASS를 확정한다.
		if i == 1 and mediaCallbacks == 0 and timedOutMedia == math.min(12, #items) then
			serverPreloadUnresponsive = true
			print("[QA] SERVER_PRELOAD_UNRESPONSIVE client validation required")
			break
		end
	end
	-- [전체 자산] 모든 배치가 실제로 끝났을 때만 통과 처리한다. 시간 초과 기록을 덮어쓰지 않는다.
	local timedOut = ReplicatedStorage:GetAttribute("MareQAAssetStatus") == "FAIL"
	ReplicatedStorage:SetAttribute("MareQAAssetTotals", HttpService:JSONEncode({
		registered = #ids, imagesSounds = #items, models = modelReferences,
		fetchCallbacks = mediaCallbacks, currentBatch = currentBatch,
		failed = bad + moduleErrors, failedMedia = failedMedia,
		serverPreloadUnresponsive = serverPreloadUnresponsive,
		elapsedSeconds = math.floor(os.clock() - mediaStarted), timedOut = timedOut,
	}))
	ReplicatedStorage:SetAttribute("MareQAAssetStatus",
		if not timedOut and bad == 0 and moduleErrors == 0 and #ids > 0 then "PASS" else "FAIL")
	if not timedOut and bad == 0 and moduleErrors == 0 and #ids > 0 then
		ok("images/sounds preloaded: " .. #items)
	else
		print("[QA] ASSET_FAIL_COUNT " .. (bad + moduleErrors) .. "/" .. #items)
	end
end)

-- 2) 진행: 새 게임 → 퀘스트 수락 → 사냥/전투 → 교역 → 항해 → 수리, 오류 응답 확인
task.spawn(function()
	local featureFails, featureCalls, accepted, rejected = 0, 0, 0, 0
	local issues = {}
	local coverage, observed = {}, {}
	local previousView
	local function featureFail(msg)
		featureFails += 1
		if #issues < 24 then table.insert(issues, msg:sub(1, 150)) end
		ReplicatedStorage:SetAttribute("MareQAFeatureStatus", "FAIL")
		fail(msg)
	end
	local function grade(name, res, quiet)
		if type(res) ~= "table" then
			featureFail("FEATURE_RESPONSE_INVALID " .. name)
			return
		end
		local message = tostring(res.message or "")
		if message == "알 수 없는 요청" or message == "오류가 발생했어요"
			or string.find(message, "미구현", 1, true) or string.find(string.lower(message), "not implemented", 1, true) then
			featureFail("FEATURE_UNIMPLEMENTED_OR_ERROR " .. name .. ": " .. message)
		elseif res.ok == false then
			rejected += 1
			-- [기능 검사] 거절 응답에 view가 있더라도 구현 성공으로 오인하지 않는다.
			if not quiet then print("[QA] REJECTED " .. name .. " -> " .. message:sub(1, 60)) end
		elseif res.ok == true and res.view == nil then
			featureFail("FEATURE_NO_VIEW " .. name)
		elseif res.ok == true or res.view ~= nil then
			accepted += 1
			if not quiet then ok("FEATURE " .. name .. " -> " .. message:sub(1, 40)) end
		elseif message ~= "" then
			rejected += 1
			if not quiet then print("[QA] REJECTED " .. name .. " -> " .. message:sub(1, 60)) end
		else
			featureFail("FEATURE_RESPONSE_UNKNOWN " .. name)
		end
	end
	local remote = game:GetService("ServerStorage"):WaitForChild("StudioQAInvoke", 60)
	local player = Players:GetPlayers()[1] or Players.PlayerAdded:Wait()
	if not remote then
		featureFail("StudioQAInvoke missing")
		return
	end
	local function call(action, payload)
		featureCalls += 1
		local row = coverage[action]
		if not row then
			row = { calls = 0, accepted = 0, rejected = 0, invalid = 0 }
			coverage[action] = row
		end
		row.calls += 1
		local success, result = pcall(function()
			return remote:Invoke(player, action, payload or {})
		end)
		if not success then
			row.invalid += 1
			featureFail("action " .. action .. " threw: " .. tostring(result))
			return nil
		end
		if type(result) ~= "table" or type(result.ok) ~= "boolean" then
			row.invalid += 1
			featureFail("FEATURE_RESPONSE_INVALID " .. action)
			return nil
		end
		if result.ok then
			row.accepted += 1
		else
			row.rejected += 1
		end
		local view = result.view
		if result.ok and view then
			local function observe(name, valid)
				if valid then
					observed[name] = (observed[name] or 0) + 1
				else
					featureFail("FEATURE_STATE_NOT_OBSERVED " .. name)
				end
			end
			if action == "Accept" then
				local active = false
				for _, quest in view.quests.active do
					if quest.id == payload.questId then active = true; break end
				end
				local doneBefore = previousView and previousView.quests and previousView.quests.doneCount or 0
				observe("quest-accepted", active or view.quests.doneCount > doneBefore)
			elseif action == "Hunt" then
				local battle = view.lastBattle
				observe("naval-encounter", battle and battle.pending == true and type(battle.log) == "table" and #battle.log > 0)
			elseif action == "ResolveBattle" then
				observe("naval-resolved", view.lastBattle and view.lastBattle.pending == false)
			elseif action == "Sail" then
				observe("voyage-arrived", view.player and view.player.portId == payload.portId)
			elseif action == "Explore" then
				observe("exploration-advanced", previousView and previousView.player and view.player
					and (view.player.year ~= previousView.player.year or view.player.day ~= previousView.player.day))
			elseif action == "TacticsStart" then
				observe("land-battle-started", view.tactics and view.tactics.siteId == payload.siteId and view.tactics.status == "active")
			elseif action == "TacticsEnd" then
				local before = previousView and previousView.tactics
				observe("land-battle-turn", before and view.tactics and (view.tactics.turn > before.turn or view.tactics.status ~= before.status))
			elseif action == "TacticsLeave" then
				observe("land-battle-left", view.tactics == nil)
			end
		end
		if view then previousView = view end
		return result
	end
	for _ = 1, 40 do
		local r = call("State")
		if r and not r.loading then
			break
		end
		task.wait(1)
	end
	local Ports = require(Shared:WaitForChild("Ports"))
	local Quests = require(Shared:WaitForChild("Quests"))
	local nationId = next(Ports.Nations)
	player:SetAttribute("ManualHelm", true) -- 점검 뒤 화면에서 수동 항해를 바로 눌러 볼 수 있게 한다
	local r
	for _ = 1, 8 do
		task.wait(1.5)
		r = call("NewGame", { nationId = nationId, startYear = 1650, restart = true })
		if r and r.message ~= "너무 빨라요" and not r.loading then
			break
		end
	end
	if not (r and r.ok and r.view) then
		featureFail("NewGame " .. tostring(r and r.message))
		return
	end
	accepted += 1
	ok("NewGame " .. tostring(nationId))
	task.wait(1.1)
	local function step(name, action, payload)
		task.wait(1.1) -- 서버의 요청 간격 제한을 피한다
		local res = call(action, payload)
		if not res then
			return nil
		end
		grade(name, res, false)
		return res
	end
	local landAttempted, checkedSites = false, {}
	local function checkLandBattle(view)
		if landAttempted or not view or view.tactics then return end
		for _, site in view.sites or {} do
			if site.unlocked and site.tactics and site.left > 0 and not checkedSites[site.id] then
				checkedSites[site.id] = true
				local battle = call("TacticsStart", { siteId = site.id })
				if battle then grade("TacticsStart " .. site.id, battle, true) end
				if battle and battle.ok then
					landAttempted = true
					local turn = call("TacticsEnd")
					if turn then grade("TacticsEnd", turn, true) end
					local leave = call("TacticsLeave")
					if leave then grade("TacticsLeave", leave, true) end
				end
				return
			end
		end
	end
	checkLandBattle(r.view)
	-- 퀘스트: 보이는 모든 퀘스트를 수락해 본다 (수락 조건 때문에 거절되는 것은 정상)
	for i, q in Quests.Quests do
		if i > 8 then
			break
		end
		step("Quest.Accept " .. q.id, "Accept", { questId = q.id })
	end
	for _, goodId in { "wheat", "spice", "silk" } do
		if Ports.Goods[goodId] then
			step("Buy " .. goodId, "Buy", { goodId = goodId, amount = 1 })
			step("Sell " .. goodId, "Sell", { goodId = goodId, amount = 1 })
			break
		end
	end
	local function idsOf(list)
		local out = {}
		if type(list) == "table" then
			for _, e in list do
				if type(e) == "string" then
					table.insert(out, e)
				elseif type(e) == "table" and type(e.id) == "string" then
					table.insert(out, e.id)
				end
			end
		end
		return out
	end
	local function sweep(label, action, key, ids, extra)
		local n = 0
		for _, id in ids do
			local payload = { [key] = id }
			if extra then
				for k, v in extra do
					payload[k] = v
				end
			end
			task.wait(0.05)
			local res = call(action, payload)
			n += 1
			if res then grade(label .. " " .. tostring(id), res, true) end
		end
		-- [기능 전수검사] 0건 실행은 검사 통과가 아니다.
		if n == 0 then
			featureFail("FEATURE_NO_CASES " .. label)
		else
			print("[QA] FEATURE_COVERED " .. label .. " cases=" .. n)
		end
	end
	call("QAGrant")
	local Shared2 = Shared
	local Ships = require(Shared2:WaitForChild("Ships"))
	local Tech = require(Shared2:WaitForChild("Tech"))
	local Spec = require(Shared2:WaitForChild("Specialties"))
	local Gear = require(Shared2:WaitForChild("Gear"))
	local Sites = require(Shared2:WaitForChild("Sites"))
	local Scholars = require(Shared2:WaitForChild("Scholars"))
	local Bosses = require(Shared2:WaitForChild("Bosses"))
	local Story = require(Shared2:WaitForChild("Story"))
	local goods = {}
	for id in Ports.Goods do
		table.insert(goods, id)
	end
	-- 교역: 모든 물건 구매/흥정/판매
	sweep("Buy", "Buy", "goodId", goods, { amount = 1 })
	sweep("Haggle", "Haggle", "goodId", goods)
	sweep("Sell", "Sell", "goodId", goods, { amount = 1 })
	-- 조선소: 모든 배·대포 + 선원·보급·수리
	sweep("BuyShip", "BuyShip", "shipId", Ships.Order)
	sweep("BuyFleetShip", "BuyFleetShip", "shipId", Ships.Order)
	sweep("BuyCannon", "BuyCannon", "cannonId", idsOf(Ships.Cannons))
	for _, a in { "BuyPlating", "Repair", "BuyEscort", "DismissEscort" } do
		step(a, a)
	end
	step("HireCrew", "HireCrew", { amount = 1 })
	step("BuySupplies", "BuySupplies", { amount = 1 })
	-- 연구·동료·장비·탐험·학자·보스·이야기
	sweep("Research", "Research", "techId", Tech.Order)
	local comp = idsOf(Spec.Companions)
	sweep("Recruit", "Recruit", "companionId", comp)
	sweep("Talk", "Talk", "companionId", comp)
	step("TalkChoice", "TalkChoice", { index = 1 })
	sweep("SetSpecialty", "SetSpecialty", "specialtyId", idsOf(Spec.Specialties))
	sweep("BuyGear", "BuyGear", "gearId", idsOf(Gear.Items))
	sweep("ToggleGear", "ToggleGear", "gearId", idsOf(Gear.Items))
	sweep("Explore", "Explore", "siteId", idsOf(Sites.Sites))
	sweep("Visit", "Visit", "scholarId", idsOf(Scholars.Scholars))
	sweep("ChallengeBoss", "ChallengeBoss", "bossId", idsOf(Bosses.Bosses))
	sweep("PlayStory", "PlayStory", "eventId", idsOf(Story.Events), { choice = 1 })
	for _, a in { "Deposit", "Withdraw", "Borrow", "Repay", "BuyLicense", "BuyInsurance", "Audience", "Feast", "Rumor", "BuyMap", "Hunt", "ResolveBattle", "WaitDay" } do
		step(a, a, { amount = 10, crew = 1 })
	end
	-- 항해: 모든 항구로 이동 + 항해 선택
	local portIds = {}
	for id in Ports.Ports do
		table.insert(portIds, id)
	end
	for _, id in portIds do
		task.wait(0.1) -- 쉬지 않고 돌리면 Studio가 시간 초과로 멈춘다
		local res = call("Sail", { portId = id })
		if res then
			grade("Sail " .. tostring(id), res, true)
			if res.ok then checkLandBattle(res.view) end
		end
		local choice = call("VoyageChoice", { index = 1 })
		if choice then grade("VoyageChoice", choice, true) end
		local bonus = call("VoyageBonus", { index = 1 })
		if bonus then grade("VoyageBonus", bonus, true) end
	end
	if #portIds == 0 then featureFail("FEATURE_NO_CASES Sail") end
	print("[QA] FEATURE_COVERED Sail cases=" .. #portIds)
	ReplicatedStorage:SetAttribute("MareQAFeatureTotals", HttpService:JSONEncode({
		calls = featureCalls, accepted = accepted, rejected = rejected, failed = featureFails, issues = issues,
		coverage = coverage, observed = observed,
	}))
	ReplicatedStorage:SetAttribute("MareQAFeatureStatus", if featureFails == 0 and accepted > 0 then "PASS" else "FAIL")
	print(string.format("[QA] DONE calls=%d accepted=%d rejected=%d featureFails=%d", featureCalls, accepted, rejected, featureFails))
end)
