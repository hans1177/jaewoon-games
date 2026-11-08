--!nonstrict
-- 파일명: AssetLoader.server.luau
-- 등록된 상업 이용 가능 모델을 기존 MareAssets 라이브러리에 로드한다.
-- 역할: 항구·시장 필수 모델을 우선, 동시 InsertService 호출을 제한한다.

local InsertService = game:GetService("InsertService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local library = ReplicatedStorage:WaitForChild("MareAssets")
local ok, ids = pcall(function()
	return require(ReplicatedStorage:WaitForChild("Shared"):WaitForChild("AssetIds"))
end)
if not ok or type(ids) ~= "table" then
	warn("[MareEssentia] 자산 등록번호를 불러올 수 없음")
	ReplicatedStorage:SetAttribute("MareAssetsReady", true)
	return
end

-- 메인 화면에서 쓰는 모델부터 로드하고, 나머지는 기존 폴더로 계속 채운다.
local order = { Town = 1, Naval = 2, Cargo = 3, Interior = 4, Terrain = 5, Castle = 6, Relics = 7, People = 8 }
local queue = {}
for key, assetId in ids do
	local kind, name = string.match(key, "^(%w+)/(.+)$")
	-- UI 이미지(메뉴·교역품·초상화)는 모델이 아니므로 InsertService 모델 로딩에서 제외한다.
	if kind and name and kind ~= "Menu" and kind ~= "Goods" and kind ~= "Portraits" and type(assetId) == "number" and assetId > 0 then
		table.insert(queue, { kind = kind, name = name, id = assetId, key = key })
	end
end
-- 시작 프롤로그에서 사용하는 승인된 실물 범선을 먼저 로드한다.
-- 항구 필수 모델을 제외하거나 기존 큐·동시성 구조를 변경하지 않는다.
table.sort(queue, function(a, b)
	local ap = if a.key == "Naval/ship-large" then -1 elseif a.key == "Naval/ship-medium" then 0 else order[a.kind] or 99
	local bp = if b.key == "Naval/ship-large" then -1 elseif b.key == "Naval/ship-medium" then 0 else order[b.kind] or 99
	if ap ~= bp then return ap < bp end
	return a.key < b.key
end)

local cursor = 1
local pending, loaded, failed = #queue, 0, 0
local priorityPending = 0
for _, asset in queue do
	if (order[asset.kind] or 99) <= 3 then priorityPending += 1 end
end

for _ = 1, 12 do
	task.spawn(function()
		while cursor <= #queue do
			local item = queue[cursor]
			cursor += 1
			local good, container = pcall(InsertService.LoadAsset, InsertService, item.id)
			if good and container then
				local model = container:FindFirstChildWhichIsA("Model") or container
				local group = library:FindFirstChild(item.kind)
				if model:IsA("Model") and model:FindFirstChildWhichIsA("BasePart", true) and group then
					model.Name = item.name
					model.Parent = group
					if model ~= container then container:Destroy() end
					loaded += 1
				else
					container:Destroy()
					failed += 1
					warn("[MareEssentia] 자산 모델 형식 오류", item.key, item.id)
				end
			else
				failed += 1
				warn("[MareEssentia] 모델 불러오기 실패", item.key, item.id, container)
			end
			pending -= 1
			if (order[item.kind] or 99) <= 3 then priorityPending -= 1 end
		end
	end)
end

local deadline = os.clock() + 30
while priorityPending > 0 and os.clock() < deadline do
	task.wait(0.25)
end
if priorityPending > 0 then
	warn("[MareEssentia] 우선 모델 불러오기 제한시간 도달", priorityPending)
end
print(string.format("[MareEssentia] 모델 초기 로드 %d개, 실패 %d개, 대기 %d개", loaded, failed, pending))
ReplicatedStorage:SetAttribute("MareAssetsReady", true)

