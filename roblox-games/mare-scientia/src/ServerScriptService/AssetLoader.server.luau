-- 등록된 CC0 모델을 ReplicatedStorage/MareAssets 아래로 불러온다 (클라이언트 PortScene이 여기서 찾는다).
local InsertService = game:GetService("InsertService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local library = ReplicatedStorage:WaitForChild("MareAssets")
local ok, ids = pcall(function()
	return require(ReplicatedStorage:WaitForChild("Shared"):WaitForChild("AssetIds"))
end)
if not ok or type(ids) ~= "table" then
	ReplicatedStorage:SetAttribute("MareAssetsReady", true)
	return
end

local pending, loaded, failed = 0, 0, 0
for key, assetId in ids do
	local kind, name = string.match(key, "^(%w+)/(.+)$")
	if kind and name then
		pending += 1
		task.spawn(function()
			local good, container = pcall(InsertService.LoadAsset, InsertService, assetId)
			if good and container then
				local model = container:FindFirstChildWhichIsA("Model") or container
				model.Name = name
				model.Parent = library:FindFirstChild(kind) or library
				loaded += 1
			else
				failed += 1
				warn("[MareScientia] 모델 불러오기 실패", key, assetId, container)
			end
			pending -= 1
		end)
	end
end

local deadline = os.clock() + 25
while pending > 0 and os.clock() < deadline do
	task.wait(0.25)
end
print(string.format("[MareScientia] 모델 %d개 불러옴, %d개 실패", loaded, failed))
ReplicatedStorage:SetAttribute("MareAssetsReady", true)
