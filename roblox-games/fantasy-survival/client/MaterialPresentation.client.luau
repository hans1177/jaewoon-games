-- 파일명: roblox-games/fantasy-survival/client/MaterialPresentation.client.luau
-- 선택된 공용 재질을 실제 월드 파트에 적용한다. 기존 물리·게임 규칙은 유지한다.
local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local Config = require(Shared:WaitForChild("GameConfig"))
local Materials = require(Shared:WaitForChild("RobloxCommonMaterials"))

local selectedMaterial = {}
local familyList = Config.StudioAssets and Config.StudioAssets.Families and Config.StudioAssets.Families.MATERIAL or {}
for _, family in ipairs(familyList) do
 selectedMaterial[family] = true
end

-- 공용 재질 원자 이름과 Roblox 기본 재질 간 대응 관계.
local materialFamily = {
 Wood = "WOOD", WoodPlanks = "WOOD",
 Slate = "STONE", Rock = "STONE", Cobblestone = "STONE",
 Metal = "METAL", DiamondPlate = "METAL", CorrodedMetal = "METAL",
 Ice = "ICE"
}
local queue = {}
local scheduled = false
local style = "GENRE_AUTHORED"

local function flush()
 local head = 1
 while head <= #queue do
  local stop = math.min(#queue, head + 63)
  for i = head, stop do
   local part = queue[i]
   if part:IsDescendantOf(workspace) then
    -- 선택한 재질 계열은 기존 공용 적용 함수를 통해 한 번만 적용한다.
    -- 분류되지 않은 재질에는 기존 표현 방식을 그대로 유지한다.
    local family = materialFamily[part.Material.Name]
    if not family or selectedMaterial[family] then
     Materials.ApplyAuthoredSurface(part, style)
    end
   end
  end
  head = stop + 1
  if head <= #queue then task.wait() end
 end
 queue = {}
 scheduled = false
end

local function enqueue(instance)
 if not instance:IsA("BasePart") then return end
 table.insert(queue, instance)
 if not scheduled then scheduled = true; task.defer(flush) end
end
workspace.DescendantAdded:Connect(enqueue)
for _, part in ipairs(workspace:GetDescendants()) do enqueue(part) end
