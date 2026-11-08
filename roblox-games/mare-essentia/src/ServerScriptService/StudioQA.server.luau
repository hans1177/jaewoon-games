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
	for i = 1, #ids, 40 do
		local batch, lookup = {}, {}
		for j = i, math.min(i + 39, #ids) do
			local inst = Instance.new("Decal")
			inst.Texture = ids[j].url
			table.insert(batch, inst)
			lookup[inst] = ids[j]
		end
		ContentProvider:PreloadAsync(batch, function(contentId, status)
			if status ~= Enum.AssetFetchStatus.Success then
				bad += 1
				fail("asset " .. tostring(contentId) .. " status=" .. tostring(status))
			end
		end)
	end
	if bad == 0 then
		ok("assets preloaded: " .. #ids)
	end
end)

-- 2) 진행: 새 게임 → 퀘스트 수락 → 사냥/전투 → 교역 → 항해 → 수리, 오류 응답 확인
task.spawn(function()
	local remote = ReplicatedStorage:WaitForChild("GameAction", 60)
	local player = Players:GetPlayers()[1] or Players.PlayerAdded:Wait()
	if not remote then
		fail("GameAction missing")
		return
	end
	local function call(action, payload)
		local success, result = pcall(remote.OnServerInvoke, player, action, payload or {})
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
	local r = call("NewGame", { nationId = nationId, startYear = 1650, restart = true })
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
	step("Repair", "Repair")
	step("Rumor", "Rumor")
	step("Hunt", "Hunt")
	step("ResolveBattle", "ResolveBattle", { flee = false })
	step("WaitDay", "WaitDay")
	local dest
	for id in Ports.Ports do
		if id ~= (r.view.portId or "") then
			dest = id
			break
		end
	end
	step("Sail", "Sail", { portId = dest })
	step("VoyageChoice", "VoyageChoice", { index = 1 })
	print(string.format("[QA] DONE ok=%d fail=%d", oks, fails))
end)
