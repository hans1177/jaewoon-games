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
local Shared = ReplicatedStorage:WaitForChild("Shared")

local fails, oks = 0, 0
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
	for _, moduleName in { "AssetIds", "AudioIds" } do
		local m = Shared:FindFirstChild(moduleName)
		local success, data = pcall(function()
			return require(m)
		end)
		if success and type(data) == "table" then
			for key, value in data do
				local url = type(value) == "number" and ("rbxassetid://" .. value) or tostring(value)
				if string.find(url, "rbxassetid://") then
					table.insert(ids, { key = moduleName .. "." .. tostring(key), url = url })
				end
			end
		else
			fail("module " .. moduleName .. " load error")
		end
	end
	local bad = 0
	local items = {}
	for _, it in ids do
		local kind = nil
		if string.find(it.key, "AudioIds") then
			kind = "Sound"
		elseif string.find(it.key, ".Menu/", 1, true) or string.find(it.key, ".Goods/", 1, true) or string.find(it.key, ".Portraits/", 1, true) then
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
	for i = 1, #items, 30 do
		local batch = {}
		for j = i, math.min(i + 29, #items) do
			table.insert(batch, items[j].inst)
		end
		ContentProvider:PreloadAsync(batch, function(contentId, status)
			if status ~= Enum.AssetFetchStatus.Success then
				bad += 1
				local key = "?"
				for _, row in items do
					if row.it.url == contentId then
						key = row.it.key
					end
				end
				fail("asset " .. key .. " " .. tostring(contentId) .. " status=" .. tostring(status))
			end
		end)
	end
	if bad == 0 then
		ok("images/sounds preloaded: " .. #items)
	else
		print("[QA] ASSET_FAIL_COUNT " .. bad .. "/" .. #items)
	end
end)

-- 2) 진행: 새 게임 → 퀘스트 수락 → 사냥/전투 → 교역 → 항해 → 수리, 오류 응답 확인
task.spawn(function()
	local remote = game:GetService("ServerStorage"):WaitForChild("StudioQAInvoke", 60)
	local player = Players:GetPlayers()[1] or Players.PlayerAdded:Wait()
	if not remote then
		fail("StudioQAInvoke missing")
		return
	end
	local function call(action, payload)
		local success, result = pcall(function()
			return remote:Invoke(player, action, payload or {})
		end)
		if not success then
			fail("action " .. action .. " threw: " .. tostring(result))
			return nil
		end
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
		fail("NewGame " .. tostring(r and r.message))
		return
	end
	ok("NewGame " .. tostring(nationId))
	task.wait(1.1)
	local function step(name, action, payload)
		task.wait(1.1) -- 서버의 요청 간격 제한을 피한다
		local res = call(action, payload)
		if not res then
			return nil
		end
		if res.message == "오류가 발생했어요" or res.message == "알 수 없는 요청" then
			fail("action " .. name .. " -> " .. res.message)
		else
			ok(name .. " -> " .. tostring(res.message):sub(1, 40))
		end
		return res
	end
	local portId = r.view.portId or r.view.port and r.view.port.id
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
			if res and (res.message == "오류가 발생했어요" or res.message == "알 수 없는 요청") then
				fail(label .. " " .. id .. " -> " .. res.message)
			elseif res and res.view == nil and res.ok then
				fail(label .. " " .. id .. " no view")
			end
		end
		ok(label .. " swept " .. n)
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
	local sailFail = 0
	for _, id in portIds do
		task.wait(0.1) -- 쉬지 않고 돌리면 Studio가 시간 초과로 멈춘다
		local res = call("Sail", { portId = id })
		if res and res.message == "오류가 발생했어요" then
			sailFail += 1
			fail("Sail " .. id .. " -> error")
		end
		call("VoyageChoice", { index = 1 })
		call("VoyageBonus", { index = 1 })
	end
	ok("Sail swept " .. #portIds .. " ports")
	print(string.format("[QA] DONE ok=%d fail=%d", oks, fails))
end)
