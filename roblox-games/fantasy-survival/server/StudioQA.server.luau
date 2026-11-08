--!nonstrict
-- Studio 전용 자동 점검(바이브가 스스로 자산 연결 오류를 찾는 용도). 라이브 서버에서는 아무것도 하지 않는다.
-- Output 에 "[QA]" 로 시작하는 줄을 남긴다: FAIL = 이 체험에서 못 불러오는 자산(이전 계정 소유 등).
local RunService = game:GetService("RunService")
if not RunService:IsStudio() then
	return
end
local InsertService = game:GetService("InsertService")
local ContentProvider = game:GetService("ContentProvider")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Shared = ReplicatedStorage:WaitForChild("Shared")

local function ok(msg)
	print("[QA] OK " .. msg)
end
local function fail(msg)
	warn("[QA] FAIL " .. msg)
end

task.wait(20) -- 게임이 먼저 뜨게 둔다

-- 1) 3D 모델: 이름→ID 가 실제로 이 체험에서 불러와지는지 (InsertService:LoadAsset)
task.spawn(function()
	local success, ids = pcall(function()
		return require(Shared:WaitForChild("VisualAssetIds"))
	end)
	if not success then
		fail("VisualAssetIds load error " .. tostring(ids))
		return
	end
	local names = {}
	for name in ids do
		table.insert(names, name)
	end
	table.sort(names)
	local good, bad, pending = 0, 0, 0
	local badNames = {}
	for i = 1, #names, 6 do
		pending = 0
		for j = i, math.min(i + 5, #names) do
			local name = names[j]
			pending += 1
			task.spawn(function()
				local loaded, result = pcall(function()
					return InsertService:LoadAsset(ids[name])
				end)
				if loaded then
					good += 1
					result:Destroy()
				else
					bad += 1
					table.insert(badNames, name)
					fail("model " .. name .. " " .. tostring(ids[name]) .. " " .. string.sub(tostring(result), 1, 80))
				end
				pending -= 1
			end)
		end
		while pending > 0 do
			task.wait(0.2)
		end
	end
	print(string.format("[QA] MODELS good=%d bad=%d total=%d", good, bad, #names))
	if bad > 0 then
		print("[QA] BAD_MODEL_NAMES " .. table.concat(badNames, ","))
	end
end)

-- 2) 이미지·소리: 오프닝 컷, 스킬 아이콘, 오프닝 음악
task.spawn(function()
	local items = {}
	for _, moduleName in { "OpeningAssetIds24", "SkillTreeIconIds", "OpeningAudioId" } do
		local m = Shared:FindFirstChild(moduleName)
		local success, data = pcall(function()
			return require(m)
		end)
		if success and type(data) == "table" then
			for key, value in data do
				local inst = if moduleName == "OpeningAudioId" then Instance.new("Sound") else Instance.new("ImageLabel")
				if moduleName == "OpeningAudioId" then
					inst.SoundId = tostring(value)
				else
					inst.Image = tostring(value)
				end
				table.insert(items, { inst = inst, name = moduleName .. "." .. tostring(key), url = tostring(value) })
			end
		else
			fail("module " .. moduleName .. " load error")
		end
	end
	local bad = 0
	for i = 1, #items, 25 do
		local batch = {}
		for j = i, math.min(i + 24, #items) do
			table.insert(batch, items[j].inst)
		end
		ContentProvider:PreloadAsync(batch, function(contentId, status)
			if status ~= Enum.AssetFetchStatus.Success then
				bad += 1
				local label = contentId
				for _, row in items do
					if row.url == contentId then
						label = row.name .. " " .. contentId
					end
				end
				fail("asset " .. label .. " status=" .. tostring(status))
			end
		end)
	end
	print(string.format("[QA] IMAGES_SOUNDS bad=%d total=%d", bad, #items))
end)
