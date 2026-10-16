--!strict
-- 대충알피지: delete old Vibe/basic Roblox GUI visuals, never synthesize placeholder UI.
-- Display only an imported, licensed, owner-reviewed high-quality external ScreenGui.
-- Gameplay remotes, saved attributes, combat input and imported creature follow are kept.
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")
local ContextActionService = game:GetService("ContextActionService")
local RunService = game:GetService("RunService")

local player = Players.LocalPlayer
local Shared = ReplicatedStorage:WaitForChild("Shared")
local Config = require(Shared:WaitForChild("GameConfig"))
local remote = ReplicatedStorage:WaitForChild(Config.RemoteName)
local remotes = ReplicatedStorage:WaitForChild("Remotes")
local parry = remotes:WaitForChild("ParryEvent")
local dodge = remotes:WaitForChild("DodgeEvent")
local autoCombat = remotes:WaitForChild("AutoCombatEvent")
local trade = remotes:WaitForChild("TradeRequestRemote")
local craftRequestRemote = remotes:WaitForChild("CraftRequestRemote")
local portalTeleportRemote = remotes:WaitForChild("PortalTeleportEvent")
local marketUpdate = remotes:WaitForChild("MarketUpdateEvent")
local inventoryUpdate = remotes:WaitForChild("SyncInventoryEvent")
local techUpdate = remotes:WaitForChild("UpdateTechEvent")
local research = remotes:WaitForChild("UnlockTechRequest")
local foundation = ReplicatedStorage:WaitForChild("RuntimeFoundationReport")

-- ScreenGui assets must be imported into Shared.CuratedUiTemplates.MainHUD.
-- No unverified IDs, homemade primitives, builtin fallback panels, or UI factories.
local hud: ScreenGui? = nil
local uiTemplates = Shared:FindFirstChild("CuratedUiTemplates")
local allowedActions = {
  CivAttack = true, CivGather = true, CivCompanion = true, CivCraft = true,
  CivBuild = true, CivEquip = true, CivTravel = true, CivSelect = true,
  CivSkinTone = true, CivGuard = true, CivDodge = true,
}
local function findUi(name: string): Instance?
  if not hud then return nil end
  return hud:FindFirstChild(name, true)
end

local function updateNumbers(): ()
  if not hud then return end
  for _, key in ipairs({"CivEra", "CivTech", "CivRaceID", "CivWood",
      "CivStone", "CivResearch", "CivSilver", "CivGold", "CivReady",
      "CivSaveAvailable", "CivEquippedWeapon", "Health"}) do
    local value = player:GetAttribute(key)
    if value ~= nil and (type(value) == "number" or type(value) == "boolean") then
      hud:SetAttribute(key, value)
    end
  end
  local status = findUi("CivilizationStatus")
  if status and status:IsA("TextLabel") then
    status.Text = string.format("시대 %d · 연구 %d · 은화 %d",
      tonumber(player:GetAttribute("CivEra")) or 1,
      tonumber(player:GetAttribute("CivTech")) or 0,
      tonumber(player:GetAttribute("CivSilver")) or 0)
  end
end

local function showNotice(message: string): ()
  if not hud then return end
  hud:SetAttribute("GameNotice", message)
  local label = findUi("CombatNotice")
  if label and label:IsA("TextLabel") then label.Text = message end
end

local function togglePanel(name: string): ()
  local panel = findUi(name)
  if panel and panel:IsA("GuiObject") then panel.Visible = not panel.Visible end
end

local function invokeExternalAction(action: string, value: any): ()
  if action == "CivResearch" then
    local id = tonumber(value)
    if id and id % 1 == 0 and id >= 1 and id <= 72 then
      task.spawn(function()
        local ok, succeeded = pcall(function() return research:InvokeServer(id) end)
        if not ok or succeeded ~= true then showNotice("연구 요청 실패") end
      end)
    end
  elseif action == "CivTimedCraft" then
    local recipeId = tonumber(value)
    if recipeId and recipeId % 1 == 0 and recipeId >= 1 and recipeId <= 200 then
      craftRequestRemote:FireServer(recipeId)
    end
  elseif action == "CivPortalTeleport" then
    local destination = tonumber(value)
    if destination and destination % 1 == 0 and destination >= 1 and destination <= 24 then
      portalTeleportRemote:FireServer(destination)
    end
  elseif action == "CivTradeSnapshot" then
    trade:FireServer("Snapshot", 0, false, "Silver")
  elseif action == "CivTradeCurrencyBuy" or action == "CivTradeCurrencySell" then
    trade:FireServer("Currency", 1, action == "CivTradeCurrencyBuy", "Silver")
  elseif action == "CivTradeBuy" or action == "CivTradeSell" then
    if typeof(value) == "string" and #value <= 40 then
      trade:FireServer(value, 1, action == "CivTradeBuy", "Silver")
    end
  elseif action == "CivParry" then
    parry:FireServer()
  elseif action == "CivDodge" then
    dodge:FireServer()
  elseif action == "CivAutoCombat" then
    if typeof(value) == "boolean" then autoCombat:FireServer("SetEnabled", value) end
  elseif action == "CivPanel" then
    if typeof(value) == "string" and #value <= 35 then togglePanel(value) end
  elseif action == "CivBuildHousing" and typeof(value) == "table" then
    if typeof(value.Key) == "string" and #value.Key <= 32
      and typeof(value.Position) == "Vector3" then
      remote:FireServer(action, {
        Key = value.Key, Position = value.Position,
        ParentPart = value.ParentPart, Rotation = value.Rotation,
      })
    end
  elseif (action == "CivRemoveHousing" or action == "CivToggleHousingDoor")
    and typeof(value) == "Instance" and value:IsA("BasePart") then
    remote:FireServer(action, value)
  elseif allowedActions[action] then
    if action == "CivGuard" then
      parry:FireServer()
    elseif action == "CivTravel" then
      local destination = if value == "Lobby" then "Lobby"
        else tonumber(player:GetAttribute("CivRaceID"))
      if destination == "Lobby" or (destination and destination >= 1 and destination <= 24) then
        remote:FireServer("CivTravel", destination)
      end
    elseif action == "CivSelect" then
      local raceId = tonumber(value)
      if raceId and raceId % 1 == 0 and raceId >= 1 and raceId <= 24 then
        remote:FireServer(action, raceId)
      end
    elseif action == "CivSkinTone" then
      local tone = tonumber(value)
      if tone and tone % 1 == 0 and tone >= 1 and tone <= 4 then
        remote:FireServer(action, tone)
      end
    elseif value == nil or typeof(value) == "string" or typeof(value) == "number" then
      remote:FireServer(action, value)
    end
  end
end

local function bindExternalButton(descendant: Instance): ()
  if not descendant:IsA("GuiButton") then return end
  if descendant:GetAttribute("GameUiBound") then return end
  descendant:SetAttribute("GameUiBound", true)
  descendant.Activated:Connect(function()
    local action = descendant:GetAttribute("GameAction")
    if typeof(action) == "string" then
      local argument: any = descendant:GetAttribute("GameArgument")
      if action == "CivBuildHousing" then
        argument = {
          Key = descendant:GetAttribute("GameHousingPiece"),
          Position = descendant:GetAttribute("GamePlacement"),
          Rotation = descendant:GetAttribute("GameRotation"),
          ParentPart = descendant:GetAttribute("GameParentPart"),
        }
      end
      invokeExternalAction(action, argument)
    end
  end)
end

local function validUiTemplate(template: Instance): boolean
  if not template:IsA("ScreenGui") then return false end
  if template:GetAttribute("CuratedExternalAsset") ~= true
    or template:GetAttribute("VisualQualityApproved") ~= true
    or template:GetAttribute("LicenseVerified") ~= true
    or (tonumber(template:GetAttribute("VerifiedRobloxAssetId")) or 0) <= 0 then
    return false
  end
  -- A bare Roblox UI made of Frames/TextButtons is not an external art asset.
  for _, descendant in ipairs(template:GetDescendants()) do
    if descendant:IsA("ImageLabel") or descendant:IsA("ImageButton") then
      if descendant.Image ~= "" and descendant.Image ~= "rbxassetid://0" then
        return true
      end
    end
  end
  return false
end

local function attachExternalHud(template: Instance): ()
  if hud or not validUiTemplate(template) or not template:IsA("ScreenGui") then return end
  local imported = template:Clone()
  imported.Name = "CuratedExternalHUD"
  imported.ResetOnSpawn = false
  imported.Parent = player:WaitForChild("PlayerGui")
  hud = imported
  for _, descendant in ipairs(imported:GetDescendants()) do
    bindExternalButton(descendant)
  end
  imported.DescendantAdded:Connect(bindExternalButton)
  updateNumbers()
end

if uiTemplates then
  local template = uiTemplates:FindFirstChild("MainHUD")
  if template then attachExternalHud(template) end
  uiTemplates.ChildAdded:Connect(function(child)
    if child.Name == "MainHUD" then attachExternalHud(child) end
  end)
end
Shared.ChildAdded:Connect(function(child)
  if child.Name == "CuratedUiTemplates" and child:IsA("Folder") then
    uiTemplates = child
    local template = child:FindFirstChild("MainHUD")
    if template then attachExternalHud(template) end
    child.ChildAdded:Connect(function(nextTemplate)
      if nextTemplate.Name == "MainHUD" then attachExternalHud(nextTemplate) end
    end)
  end
end)

for _, key in ipairs({"CivEra", "CivTech", "CivRaceID", "CivWood",
    "CivStone", "CivResearch", "CivSilver", "CivGold", "CivReady",
    "CivSaveAvailable", "CivEquippedWeapon", "Health"}) do
  player:GetAttributeChangedSignal(key):Connect(updateNumbers)
end

remote.OnClientEvent:Connect(function(kind, payload)
  if kind == "CIV_MESSAGE" and typeof(payload) == "string" then
    showNotice(payload)
  elseif kind == "CIV_TELEGRAPH" then
    showNotice("공격 예고: F 패링 또는 Shift 회피")
  elseif kind == "CIV_PARRY" then
    showNotice("패링 성공")
  elseif kind == "CIV_HIT" and typeof(payload) == "table" then
    showNotice(tostring(payload.Enemy) .. " · " .. tostring(payload.Damage) .. " 피해")
  elseif kind == "MULTIPLAYER_SYNC" and typeof(payload) == "table" and hud then
    hud:SetAttribute("ParticipantCount", tonumber(payload.ParticipantCount) or 0)
  end
end)
techUpdate.OnClientEvent:Connect(function(id)
  if hud then hud:SetAttribute("LastCompletedTech", tonumber(id) or 0) end
end)
marketUpdate.OnClientEvent:Connect(function(_, openTrade)
  if hud then hud:SetAttribute("MarketUpdated", os.clock()) end
  if openTrade then togglePanel("Trade") end
end)
inventoryUpdate.OnClientEvent:Connect(function()
  if hud then hud:SetAttribute("InventoryUpdated", os.clock()) end
end)

-- Preserve the native Roblox movement controls; render no homemade mobile HUD.
local touch = UserInputService.TouchEnabled
local autoCombatEnabled = touch
local function reportFoundation(): ()
  local character = player.Character or player.CharacterAdded:Wait()
  local humanoid = character:WaitForChild("Humanoid", 10)
  local root = character:WaitForChild("HumanoidRootPart", 10)
  if not humanoid or not root then return end
  local camera = workspace.CurrentCamera
  if camera and camera.CameraSubject == humanoid then foundation:FireServer("CAMERA_READY") end
  foundation:FireServer(touch and "INPUT_READY_TOUCH" or "INPUT_READY")
end
task.defer(reportFoundation)
player.CharacterAdded:Connect(function() task.defer(reportFoundation) end)

local function syncAutoCombat(): ()
  if player:GetAttribute("CivReady") == true then
    autoCombat:FireServer("SetEnabled", autoCombatEnabled)
  end
end
player:GetAttributeChangedSignal("CivReady"):Connect(syncAutoCombat)
task.defer(syncAutoCombat)

if #Config.Actions > 0 then
  ContextActionService:BindAction("RpgPrimaryAction", function(_, state)
    if state == Enum.UserInputState.Begin then
      remote:FireServer(Config.Actions[1].Id)
    end
    return Enum.ContextActionResult.Sink
  end, false, Enum.KeyCode.Space, Enum.KeyCode.ButtonA)
end

UserInputService.InputBegan:Connect(function(input, processed)
  if processed or UserInputService:GetFocusedTextBox() then return end
  local key = input.KeyCode
  if key == Enum.KeyCode.F then
    parry:FireServer()
  elseif key == Enum.KeyCode.LeftShift then
    dodge:FireServer()
  elseif key == Enum.KeyCode.E then
    remote:FireServer("CivGather")
  elseif key == Enum.KeyCode.T then
    togglePanel("Techs")
  elseif key == Enum.KeyCode.C then
    togglePanel("Companions")
  elseif key == Enum.KeyCode.V then
    togglePanel("Crafts")
  elseif key == Enum.KeyCode.B then
    togglePanel("Buildings")
  elseif key == Enum.KeyCode.I then
    togglePanel("Inventory")
  elseif key == Enum.KeyCode.M then
    trade:FireServer("Snapshot", 0, false, "Silver")
    togglePanel("Trade")
  elseif input.UserInputType == Enum.UserInputType.MouseButton1 then
    remote:FireServer("CivAttack")
  end
end)

local touchStart: {[InputObject]: {Position: Vector2, At: number}} = {}
local lastTapAt = -1e9
if touch then
  UserInputService.TouchStarted:Connect(function(input, processed)
    if processed then return end
    local camera = workspace.CurrentCamera
    if not camera then return end
    local screen = camera.ViewportSize
    local at = input.Position
    if at.X < screen.X * 0.34 or at.X > screen.X * 0.7 or at.Y < screen.Y * 0.52 then return end
    touchStart[input] = {Position = Vector2.new(at.X, at.Y), At = os.clock()}
  end)
  UserInputService.TouchEnded:Connect(function(input, processed)
    local gesture = touchStart[input]
    touchStart[input] = nil
    if processed or not gesture or player:GetAttribute("CivReady") ~= true then return end
    if os.clock() - gesture.At > 0.5 then return end
    local distance = (Vector2.new(input.Position.X, input.Position.Y) - gesture.Position).Magnitude
    if distance >= 70 then
      dodge:FireServer()
    elseif distance <= 25 then
      local now = os.clock()
      if now - lastTapAt <= 0.32 then parry:FireServer() end
      lastTapAt = now
    end
  end)
  UserInputService.TouchTapInWorld:Connect(function(position, processed)
    if processed or player:GetAttribute("CivReady") ~= true then return end
    local camera = workspace.CurrentCamera
    if not camera then return end
    local ray = camera:ViewportPointToRay(position.X, position.Y)
    local exclude = RaycastParams.new()
    exclude.FilterType = Enum.RaycastFilterType.Exclude
    if player.Character then exclude.FilterDescendantsInstances = {player.Character} end
    local hit = workspace:Raycast(ray.Origin, ray.Direction * 350, exclude)
    if not hit then return end
    local resource = hit.Instance:GetAttribute("CivilizationResourceType")
    if typeof(resource) == "string" then
      remote:FireServer("CivGather", resource)
      return
    end
    local model = hit.Instance:FindFirstAncestorOfClass("Model")
    if model and model:GetAttribute("CivilizationEnemy") == true then
      autoCombat:FireServer("AutoAttack", model)
    end
  end)
end

task.spawn(function()
  while player.Parent do
    task.wait(0.4)
    if touch and autoCombatEnabled and player:GetAttribute("CivReady") == true
      and (tonumber(player:GetAttribute("CivRaceID")) or 0) > 0 then
      local character = player.Character
      local root = character and character:FindFirstChild("HumanoidRootPart")
      local hum = character and character:FindFirstChildOfClass("Humanoid")
      local world = workspace:FindFirstChild("CivilizationWorlds")
      if root and root:IsA("BasePart") and hum and hum.Health > 0 and world then
        local nearest: Model? = nil
        local distance = 15
        for _, obj in ipairs(world:GetChildren()) do
          if obj:IsA("Model") and obj:GetAttribute("CivilizationEnemy") == true then
            local targetRoot = obj:FindFirstChild("HumanoidRootPart")
            local targetHumanoid = obj:FindFirstChildOfClass("Humanoid")
            if targetRoot and targetRoot:IsA("BasePart") and targetHumanoid
              and targetHumanoid.Health > 0 then
              local d = (root.Position - targetRoot.Position).Magnitude
              if d < distance then nearest = obj; distance = d end
            end
          end
        end
        if nearest then autoCombat:FireServer("AutoAttack", nearest) end
      end
    end
  end
end)

-- Imported mesh positioning only. Original creator-authored rig poses stay intact.
local observed: {[Model]: {Visual: Model, Root: BasePart}} = {}
local at = 0
local scanAt = 0
RunService.RenderStepped:Connect(function(dt)
  at += math.min(dt, 0.1)
  if at >= scanAt then
    scanAt = at + 1.5
    table.clear(observed)
    local world = workspace:FindFirstChild("CivilizationWorlds")
    local character = player.Character
    local viewer = character and character:FindFirstChild("HumanoidRootPart")
    if world and viewer and viewer:IsA("BasePart") then
      for _, enemy in ipairs(world:GetDescendants()) do
        if enemy:IsA("Model") and enemy:GetAttribute("CivilizationEnemy") == true
          and enemy:GetAttribute("CreatureAssetSource") == "StudioImported"
          and (tonumber(enemy:GetAttribute("CreatureVisualAssetId")) or 0) > 0 then
          local visual = enemy:FindFirstChild("ImportedCreatureVisual")
          local core = enemy:FindFirstChild("HumanoidRootPart")
          if visual and visual:IsA("Model") and core and core:IsA("BasePart")
            and (core.Position - viewer.Position).Magnitude < 110 then
            observed[enemy] = {Visual = visual, Root = core}
          end
        end
      end
    end
  end
  for enemy, entry in pairs(observed) do
    if not enemy.Parent or not entry.Visual.Parent or not entry.Root.Parent then
      observed[enemy] = nil
    else
      local offset = entry.Visual:GetAttribute("VisualPivotOffset")
      if typeof(offset) ~= "CFrame" then offset = CFrame.new() end
      entry.Visual:PivotTo(entry.Root.CFrame * offset)
    end
  end
end)
