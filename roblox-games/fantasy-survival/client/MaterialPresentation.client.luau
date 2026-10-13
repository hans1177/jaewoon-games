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
    -- 기존 PBR/원본 재질 보호 계약을 먼저 적용한다.
    local applied = Materials.ApplyAuthoredSurface(part, style)
    -- 설정에서 선택한 재질만 실제 공용 렌더링 경로로 소비한다.
    -- 색·기본 재질·물리 특성은 원래 값을 보존한다.
    local family = materialFamily[part.Material.Name]
    if applied and family and selectedMaterial[family] then
     Materials.Apply(part, family, {
      tint = part.Color, tintStrength = 1,
      preserveBaseMaterial = true, preservePhysics = true,
     })
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
