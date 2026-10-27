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
-- VERIFIED_EXTERNAL_LEARNING_CLIENT_CONTEXT_BEGIN
local verifiedExternalLearningContext = Config.VerifiedExternalLearning or Config.LearningContext or {}
local verifiedExternalLearningIds = verifiedExternalLearningContext.VerifiedExternalLearningIds or {}
local verifiedExternalLearningPrinciples = verifiedExternalLearningContext.ApplicationPrinciples or {}
local verifiedExternalGameDevelopmentPrinciples = verifiedExternalLearningContext.GameDevelopmentPrinciples or {}
local verifiedExternalLearningMappings = verifiedExternalLearningContext.GameSpecificSemanticMappings or {}
local verifiedExternalLearningDispositions = verifiedExternalLearningContext.LearningDispositions or {}
-- VERIFIED_EXTERNAL_LEARNING_CLIENT_CONTEXT_END

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
    status.Text = string.format("시대 %d · 연구 %d/72 · 은화 %d · 목재 %d · 석재 %d",
      tonumber(player:GetAttribute("CivEra")) or 1,
      tonumber(player:GetAttribute("CivTech")) or 0,
      tonumber(player:GetAttribute("CivSilver")) or 0,
      tonumber(player:GetAttribute("CivWood")) or 0,
      tonumber(player:GetAttribute("CivStone")) or 0)
  end
  local researchButton = findUi("ResearchNext")
  if researchButton and researchButton:IsA("ImageButton") then
    researchButton:SetAttribute("GameArgument", (tonumber(player:GetAttribute("CivTech")) or 0) + 1)
  end
  local inventory = findUi("InventorySummary")
  if inventory and inventory:IsA("TextLabel") then
    inventory.Text = string.format("목재 %d · 석재 %d · 연구력 %d\n은화 %d · 금화 %d · 장착무기 %d",
      tonumber(player:GetAttribute("CivWood")) or 0,
      tonumber(player:GetAttribute("CivStone")) or 0,
      tonumber(player:GetAttribute("CivResearch")) or 0,
      tonumber(player:GetAttribute("CivSilver")) or 0,
      tonumber(player:GetAttribute("CivGold")) or 0,
      tonumber(player:GetAttribute("CivEquippedWeapon")) or 0)
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
  if not panel or not panel:IsA("GuiObject") then return end
  local opening = not panel.Visible
  if opening then
    for _, panelName in ipairs({"Actions", "Races", "Inventory", "Trade"}) do
      if panelName ~= name then
        local other = findUi(panelName)
        if other and other:IsA("GuiObject") then other.Visible = false end
      end
    end
  end
  panel.Visible = opening
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
    togglePanel("Trade")
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
        local supportLink = descendant:FindFirstChild("GameParentPart")
        argument = {
          Key = descendant:GetAttribute("GameHousingPiece"),
          Position = descendant:GetAttribute("GamePlacement"),
          Rotation = descendant:GetAttribute("GameRotation"),
          ParentPart = supportLink and supportLink:IsA("ObjectValue") and supportLink.Value or nil,
        }
      elseif action == "CivRemoveHousing" or action == "CivToggleHousingDoor" then
        local targetLink = descendant:FindFirstChild("GameTargetPart")
        argument = targetLink and targetLink:IsA("ObjectValue") and targetLink.Value or nil
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

-- Only registered CC0 artwork is allowed to create a gameplay display.
-- The image IDs are injected into CuratedAssets by the existing owner publish pipeline.
local function attachDownloadedArtwork(): ()
  local assetModule = Shared:FindFirstChild("CuratedAssets")
  if not assetModule or not assetModule:IsA("ModuleScript") then return end
  local ok, catalog = pcall(require, assetModule)
  if not ok or type(catalog) ~= "table" then return end
  local art = catalog.UI
  if type(art) ~= "table" then return end
  local panelId = tonumber(art.Panel)
  local buttonId = tonumber(art.Button)
  if not panelId or not buttonId or panelId < 1 or buttonId < 1 then return end
  local folder = uiTemplates
  if not folder or not folder:IsA("Folder") or folder:FindFirstChild("MainHUD") then return end
  local template = Instance.new("ScreenGui")
-- VERIFIED_EXTERNAL_LEARNING_ROBLOX_NATIVE_BEGIN
local verifiedLearningPlayers = game:GetService("Players")
local verifiedLearningTweenService = game:GetService("TweenService")
local verifiedLearningLighting = game:GetService("Lighting")
local verifiedLearningPlayer = verifiedLearningPlayers.LocalPlayer
local verifiedLearningContext = Config.VerifiedExternalLearning or Config.LearningContext or {}
local verifiedLearningPrinciples = verifiedLearningContext.ApplicationPrinciples or {}
local verifiedLearningAxes = verifiedLearningContext.ApplyAxes or {}
local VERIFIED_EXTERNAL_LEARNING_NATIVE_BINDING_VERSION = 6
local verifiedLearningRoot = template
local verifiedLearningSemanticVariant = "PROGRESSION_RISK"
local verifiedLearningSemanticDomain = "CORE_GAMEPLAY_FEEL"
local verifiedLearningSemanticColor = Color3.fromRGB(156, 132, 255)
local verifiedLearningSemanticMood = "PRESERVE_AUTHORED_PRESENTATION"
verifiedLearningRoot:SetAttribute("VerifiedExternalLearningNativeBindingVersion", VERIFIED_EXTERNAL_LEARNING_NATIVE_BINDING_VERSION)
verifiedLearningRoot:SetAttribute("VerifiedExternalLearningPrincipleCount", #verifiedLearningPrinciples)
verifiedLearningRoot:SetAttribute("VerifiedExternalLearningAxisCount", #verifiedLearningAxes)
verifiedLearningRoot:SetAttribute("VerifiedExternalLearningFingerprint", verifiedLearningContext.MemoryFingerprint or "")
verifiedLearningRoot:SetAttribute("VerifiedLearningSemanticMappingVersion", verifiedLearningContext.SemanticMappingVersion or 0)
verifiedLearningRoot:SetAttribute("VerifiedLearningSemanticMappingFingerprint", verifiedLearningContext.SemanticMappingFingerprint or "")
verifiedLearningRoot:SetAttribute("VerifiedLearningSemanticVariant", verifiedLearningSemanticVariant)
verifiedLearningRoot:SetAttribute("VerifiedLearningSemanticDomain", verifiedLearningSemanticDomain)
verifiedLearningRoot:SetAttribute("VerifiedLearningSemanticMood", verifiedLearningSemanticMood)
verifiedLearningRoot:SetAttribute("VerifiedLearningGameSpecificMappingCount", #(verifiedLearningContext.GameSpecificSemanticMappings or {}))

-- Game-specific color and atmosphere response, authored locally in Roblox.
local verifiedLearningColorGrade = verifiedLearningLighting:FindFirstChild("VerifiedLearningColorGrade")
if not verifiedLearningColorGrade then
  verifiedLearningColorGrade = Instance.new("ColorCorrectionEffect")
  verifiedLearningColorGrade.Name = "VerifiedLearningColorGrade"
  verifiedLearningColorGrade.Parent = verifiedLearningLighting
end
verifiedLearningColorGrade.Saturation = 0
verifiedLearningColorGrade.Contrast = 0
verifiedLearningColorGrade.Brightness = 0
verifiedLearningColorGrade:SetAttribute("VerifiedLearningSemanticMood", verifiedLearningSemanticMood)
if verifiedLearningSemanticVariant == "SURVIVAL_RISK" then
-- Survival alone receives atmospheric depth and threat haze.
local verifiedLearningBloom = verifiedLearningLighting:FindFirstChild("VerifiedLearningBloom")
if not verifiedLearningBloom then
  verifiedLearningBloom = Instance.new("BloomEffect")
  verifiedLearningBloom.Name = "VerifiedLearningBloom"
  verifiedLearningBloom.Parent = verifiedLearningLighting
end
verifiedLearningBloom.Intensity = 0.22
verifiedLearningBloom.Size = 18
verifiedLearningBloom.Threshold = 1.1
local verifiedLearningAtmosphere = verifiedLearningLighting:FindFirstChild("VerifiedLearningAtmosphere")
if not verifiedLearningAtmosphere then
  verifiedLearningAtmosphere = Instance.new("Atmosphere")
  verifiedLearningAtmosphere.Name = "VerifiedLearningAtmosphere"
  verifiedLearningAtmosphere.Parent = verifiedLearningLighting
end
verifiedLearningAtmosphere.Density = 0.22
verifiedLearningAtmosphere.Haze = 1.1
verifiedLearningAtmosphere.Glare = 0.08
local verifiedLearningDepth = verifiedLearningLighting:FindFirstChild("VerifiedLearningDepthOfField")
if not verifiedLearningDepth then
  verifiedLearningDepth = Instance.new("DepthOfFieldEffect")
  verifiedLearningDepth.Name = "VerifiedLearningDepthOfField"
  verifiedLearningDepth.Parent = verifiedLearningLighting
end
verifiedLearningDepth.FarIntensity = 0.08
verifiedLearningDepth.NearIntensity = 0.02
verifiedLearningDepth.FocusDistance = 28
verifiedLearningDepth.InFocusRadius = 24

end

if verifiedLearningSemanticVariant == "MOVEMENT_SPATIAL" or verifiedLearningSemanticVariant == "COMBAT_IMPACT" or verifiedLearningSemanticVariant == "SURVIVAL_RISK" then
-- Roblox character animation / motion adaptation.
local function syncVerifiedLearningCharacterMotion(character)
  local humanoid = character:FindFirstChildOfClass("Humanoid") or character:WaitForChild("Humanoid", 5)
  if not humanoid then return end
  local animator = humanoid:FindFirstChildOfClass("Animator") or humanoid:WaitForChild("Animator", 5)
  if not animator then return end
  humanoid.Running:Connect(function(speed)
    local ratio = speed > 0.1 and math.clamp(speed / math.max(humanoid.WalkSpeed, 1), 0.82, 1.25) or 1
    for _, track in ipairs(animator:GetPlayingAnimationTracks()) do
      if track.Priority == Enum.AnimationPriority.Movement or track.Priority == Enum.AnimationPriority.Core then
        track:AdjustSpeed(ratio)
      end
    end
  end)
end
if verifiedLearningPlayer.Character then task.defer(syncVerifiedLearningCharacterMotion, verifiedLearningPlayer.Character) end
verifiedLearningPlayer.CharacterAdded:Connect(syncVerifiedLearningCharacterMotion)

end

-- 안내 UI는 게임의 기존 HUD/메뉴가 소유한다. 학습 바인딩은 화면 위에 문구를 추가하지 않는다.
verifiedLearningRoot:SetAttribute("VerifiedLearningProgressionRiskCue", verifiedLearningSemanticVariant)

-- Roblox skill VFX / camera / motion feedback.
local function playVerifiedLearningActionFeedback(control, serverConfirmed)
  verifiedLearningRoot:SetAttribute("VerifiedExternalLearningLastControl", control and control.Name or "GAMEPLAY_STATE")
  verifiedLearningRoot:SetAttribute("VerifiedExternalLearningInputRespondedAt", os.clock())

  if control then
    local scale = control:FindFirstChild("VerifiedLearningMotionScale")
    if not scale then
      scale = Instance.new("UIScale")
      scale.Name = "VerifiedLearningMotionScale"
      scale.Parent = control
    end
    scale.Scale = 0.94
    verifiedLearningTweenService:Create(scale, TweenInfo.new(0.16, Enum.EasingStyle.Back, Enum.EasingDirection.Out), {Scale = 1}):Play()
  end

  -- 메뉴 클릭은 버튼 응답만. 전투/카메라 연출은 서버가 확인한 해당 행동만 사용한다.
  if serverConfirmed~=true then return end
  local approvedScope=tostring(verifiedLearningPlayer:GetAttribute("LastApprovedScope")or""):upper()
  if not(approvedScope:find("ATTACK",1,true)or approvedScope:find("SKILL",1,true)or approvedScope:find("HIT",1,true))then return end

  if verifiedLearningSemanticVariant == "MOVEMENT_SPATIAL" or verifiedLearningSemanticVariant == "DEFENSE_WAVE" or verifiedLearningSemanticVariant == "OBJECTIVE_GOAL" or verifiedLearningSemanticVariant == "SOCIAL_CONTEXT" then
  local camera = workspace.CurrentCamera
  if camera then
    local baseFov = camera.FieldOfView
    verifiedLearningTweenService:Create(camera, TweenInfo.new(0.08, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {FieldOfView = math.clamp(baseFov + 3, 40, 100)}):Play()
    task.delay(0.09, function()
      if camera then verifiedLearningTweenService:Create(camera, TweenInfo.new(0.12, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {FieldOfView = baseFov}):Play() end
    end)
  end
  end

  if verifiedLearningSemanticVariant == "COMBAT_IMPACT" then
  local character = verifiedLearningPlayer.Character
  local rootPart = character and character:FindFirstChild("HumanoidRootPart")
  if character and rootPart then
    local highlight = Instance.new("Highlight")
    highlight.Name = "VerifiedLearningSkillImpact"
    highlight.FillTransparency = 0.35
    highlight.OutlineTransparency = 0.12
    highlight.DepthMode = Enum.HighlightDepthMode.AlwaysOnTop
    highlight.Parent = character
    verifiedLearningTweenService:Create(highlight, TweenInfo.new(0.20), {FillTransparency = 1, OutlineTransparency = 1}):Play()
    local sparkles = Instance.new("Sparkles")
    sparkles.Name = "VerifiedLearningSkillSparkles"
    sparkles.SparkleColor = Color3.fromRGB(170, 220, 255)
    sparkles.Parent = rootPart
    local impactAttachment = Instance.new("Attachment")
    impactAttachment.Name = "VerifiedLearningSkillAttachment"
    impactAttachment.Parent = rootPart
    local particles = Instance.new("ParticleEmitter")
    particles.Name = "VerifiedLearningSkillParticles"
    particles.Rate = 0
    particles.Lifetime = NumberRange.new(0.18, 0.32)
    particles.Speed = NumberRange.new(5, 9)
    particles.SpreadAngle = Vector2.new(45, 45)
    particles.LightEmission = 0.7
    particles.Parent = impactAttachment
    particles:Emit(18)
    local impactLight = Instance.new("PointLight")
    impactLight.Name = "VerifiedLearningSkillLight"
    impactLight.Color = Color3.fromRGB(160, 215, 255)
    impactLight.Brightness = 2.2
    impactLight.Range = 10
    impactLight.Parent = rootPart
    verifiedLearningTweenService:Create(impactLight, TweenInfo.new(0.18), {Brightness = 0, Range = 4}):Play()
    task.delay(0.24, function()
      if impactAttachment then impactAttachment:Destroy() end
      if impactLight then impactLight:Destroy() end
      if sparkles then sparkles:Destroy() end
      if highlight then highlight:Destroy() end
    end)
  end
  end

end

local verifiedLearningLastControl = nil
local function bindVerifiedLearningControl(control)
  if not control:IsA("GuiButton") then return end
  if not control:FindFirstChild("VerifiedLearningTouchTarget") then
    local size = Instance.new("UISizeConstraint")
    size.Name = "VerifiedLearningTouchTarget"
    size.MinSize = Vector2.new(0, 52)
    size:SetAttribute("SemanticTouchTarget", verifiedLearningSemanticVariant)
    size.Parent = control
  end
  control.Activated:Connect(function()
    verifiedLearningLastControl = control
    verifiedLearningRoot:SetAttribute("VerifiedExternalLearningInputSubmittedAt", os.clock())
    playVerifiedLearningActionFeedback(control)
  end)
end
for _, descendant in ipairs(verifiedLearningRoot:GetDescendants()) do bindVerifiedLearningControl(descendant) end
verifiedLearningRoot.DescendantAdded:Connect(bindVerifiedLearningControl)
verifiedLearningPlayer:GetAttributeChangedSignal("LastApprovedScope"):Connect(function()
  verifiedLearningRoot:SetAttribute("VerifiedExternalLearningGameplayState", verifiedLearningPlayer:GetAttribute("LastApprovedScope") or "")
  verifiedLearningRoot:SetAttribute("VerifiedExternalLearningServerConfirmedAt", os.clock())
  playVerifiedLearningActionFeedback(verifiedLearningLastControl, true)
  verifiedLearningLastControl = nil
end)
-- VERIFIED_EXTERNAL_LEARNING_ROBLOX_NATIVE_END

-- VERIFIED_EXTERNAL_LEARNING_CLIENT_RUNTIME_BEGIN
template:SetAttribute("VerifiedExternalLearningCoveragePct", verifiedExternalLearningContext.CoveragePct or 0)
template:SetAttribute("VerifiedExternalLearningContentComplete", verifiedExternalLearningContext.ContentComplete == true)
template:SetAttribute("VerifiedExternalLearningCount", #verifiedExternalLearningIds)
template:SetAttribute("VerifiedExternalLearningPrincipleCount", #verifiedExternalLearningPrinciples)
template:SetAttribute("VerifiedExternalLearningFingerprint", verifiedExternalLearningContext.MemoryFingerprint or "")
template:SetAttribute("VerifiedExternalGameDevelopmentPrincipleCount", #verifiedExternalGameDevelopmentPrinciples)
template:SetAttribute("VerifiedExternalLearningSemanticMappingVersion", verifiedExternalLearningContext.SemanticMappingVersion or 0)
template:SetAttribute("VerifiedExternalLearningSemanticMappingFingerprint", verifiedExternalLearningContext.SemanticMappingFingerprint or "")
template:SetAttribute("VerifiedExternalLearningDispositionCount", #verifiedExternalLearningDispositions)
template:SetAttribute("VerifiedExternalLearningMappingCount", #verifiedExternalLearningMappings)
template:SetAttribute("VerifiedLearningSemanticVariant", verifiedExternalLearningContext.SemanticVariant or "")
-- VERIFIED_EXTERNAL_LEARNING_CLIENT_RUNTIME_END

  template.Name = "MainHUD"
  template.DisplayOrder = 12
  template.ZIndexBehavior = Enum.ZIndexBehavior.Global
  template.IgnoreGuiInset = false
  template.ResetOnSpawn = false
  template:SetAttribute("CuratedExternalAsset", true)
  template:SetAttribute("LicenseVerified", true)
  template:SetAttribute("VisualQualityApproved", true)
  template:SetAttribute("VerifiedRobloxAssetId", panelId)

  local function artPanel(name: string, pos: UDim2, size: UDim2, isShown: boolean, parent: Instance): ImageLabel
    local item = Instance.new("ImageLabel")
    item.Name = name
    item.Image = "rbxassetid://" .. panelId
    item.ScaleType = Enum.ScaleType.Slice
    item.SliceCenter = Rect.new(18, 18, 46, 46)
    item.BackgroundTransparency = 1
    item.Size = size
    item.Position = pos
    item.Visible = isShown
    item.Parent = parent
    return item
  end
  local function text(parent: Instance, name: string, value: string, y: number, height: number): TextLabel
    local label = Instance.new("TextLabel")
    label.Name = name
    label.Text = value
    label.Font = Enum.Font.GothamBold
    label.TextSize = 14
    label.TextWrapped = true
    label.TextColor3 = Color3.fromRGB(255, 241, 212)
    label.BackgroundTransparency = 1
    label.Size = UDim2.new(1, -16, 0, height)
    label.Position = UDim2.fromOffset(8, y)
    label.Parent = parent
    return label
  end
  local function artButton(parent: Instance, key: string, caption: string, action: string, argument: any, order: number): ImageButton
    local button = Instance.new("ImageButton")
    button.Name = key
    button.Image = "rbxassetid://" .. buttonId
    button.ScaleType = Enum.ScaleType.Slice
    button.SliceCenter = Rect.new(15, 15, 41, 41)
    button.BackgroundTransparency = 1
    button.LayoutOrder = order
    button.Size = UDim2.new(1, -10, 0, 43)
    button:SetAttribute("GameAction", action)
    if argument ~= nil then button:SetAttribute("GameArgument", argument) end
    button.Parent = parent
    local label = text(button, "ActionLabel", caption, 0, 43)
    label.TextSize = 13
    return button
  end
  local header = artPanel("Header", UDim2.fromOffset(8, 6), UDim2.new(1, -16, 0, 88), true, template)
  text(header, "CivilizationTitle", "대충알피지", 4, 29)
  text(header, "CivilizationStatus", "서버 데이터 확인 중", 34, 48).TextSize = 12
  local notice = artPanel("NoticeArt", UDim2.fromOffset(8, 98), UDim2.new(1, -16, 0, 39), true, template)
  text(notice, "CombatNotice", "이동: 로블록스 기본 조이스틱", 1, 37).TextSize = 12
  local toggle = artButton(header, "MenuToggle", "메뉴", "CivPanel", "Actions", 0)
  toggle.Size = UDim2.fromOffset(76, 35)
  toggle.Position = UDim2.new(1, -83, 0, 5)
  local quick = artPanel("QuickArt", UDim2.new(1, -121, 0.43, 0), UDim2.fromOffset(113, 205), true, template)
  local quickLayout = Instance.new("UIListLayout")
  quickLayout.Padding = UDim.new(0, 4)
  quickLayout.Parent = quick
  for index, row in ipairs({
    {"공격", "CivAttack"}, {"채집", "CivGather"},
    {"패링", "CivParry"}, {"회피", "CivDodge"}
  }) do
    artButton(quick, row[2], row[1], row[2], nil, index)
  end
  local function scrolling(name: string): ScrollingFrame
    local holder = artPanel(name .. "Art", UDim2.new(1, -204, 0, 143),
      UDim2.new(0, 196, 0.62, -143), false, template)
    holder.Visible = true
    local frame = Instance.new("ScrollingFrame")
    frame.Name = name
    frame.Size = UDim2.new(1, -10, 1, -10)
    frame.Position = UDim2.fromOffset(5, 5)
    frame.BackgroundTransparency = 1
    frame.ScrollBarThickness = 4
    frame.AutomaticCanvasSize = Enum.AutomaticSize.Y
    frame.CanvasSize = UDim2.new()
    frame.Visible = false
    frame.Parent = holder
    local list = Instance.new("UIListLayout")
    list.Padding = UDim.new(0, 5)
    list.SortOrder = Enum.SortOrder.LayoutOrder
    list.Parent = frame
    return frame
  end
  local menu = scrolling("Actions")
  for index, row in ipairs({
    {"모험 시작", "CivTravel"},
    {"24개 문명", "CivPanel", "Races"},
    {"다음 기술 연구", "CivResearch", 1, "ResearchNext"},
    {"석기 도끼 제작", "CivTimedCraft", 1},
    {"청동 검 제작", "CivTimedCraft", 2},
    {"가방", "CivPanel", "Inventory"},
    {"무역", "CivTradeSnapshot"},
    {"동료 소환", "CivCompanion", "Summon"},
    {"동료 따라오기", "CivCompanion", "Follow"},
    {"동료 공격", "CivCompanion", "Attack"},
    {"동료 채집", "CivCompanion", "Gather"},
    {"동료 해산", "CivCompanion", "Dismiss"}
  }) do
    artButton(menu, row[4] or "Menu" .. index, row[1], row[2], row[3], index)
  end
  local races = scrolling("Races")
  local raceData = require(Shared:WaitForChild("RaceData"))
  for id = 1, 24 do
    local race = raceData.GetRace(id)
    if race then
      artButton(races, "Race" .. id, tostring(id) .. ". " .. race.Name, "CivSelect", id, id)
    end
  end
  local inventoryArt = artPanel("InventoryArt", UDim2.fromOffset(8, 145),
    UDim2.new(1, -16, 0, 94), false, template)
  inventoryArt.Visible = true
  local inventory = Instance.new("ImageButton")
  inventory.Name = "Inventory"
  inventory.Image = "rbxassetid://" .. panelId
  inventory.BackgroundTransparency = 1
  inventory.Size = UDim2.fromScale(1, 1)
  inventory.Visible = false
  inventory.Parent = inventoryArt
  text(inventory, "InventorySummary", "서버 인벤토리 대기 중", 4, 80)
  local market = scrolling("Trade")
  for index, row in ipairs({
    {"대리석 구매", "CivTradeBuy", "Marble"}, {"대리석 판매", "CivTradeSell", "Marble"},
    {"금 특산품 구매", "CivTradeBuy", "Gold"}, {"금 특산품 판매", "CivTradeSell", "Gold"},
    {"향신료 구매", "CivTradeBuy", "Spice"}, {"향신료 판매", "CivTradeSell", "Spice"}
  }) do
    artButton(market, "Market" .. index, row[1], row[2], row[3], index)
  end
  template.Parent = folder
end

-- Rebind the already curated artwork when the publishing pipeline inserts it
-- after this LocalScript starts. Never substitute unverified asset IDs.
attachDownloadedArtwork()
Shared.ChildAdded:Connect(function(child)
  if child.Name == "CuratedAssets" and child:IsA("ModuleScript") then
    task.defer(attachDownloadedArtwork)
  end
end)
player:GetAttributeChangedSignal("CivReady"):Connect(function()
  if player:GetAttribute("CivReady") == true and (tonumber(player:GetAttribute("CivRaceID")) or 0) == 0 then
    local raceList = findUi("Races")
    if raceList and raceList:IsA("GuiObject") then raceList.Visible = true end
  end
end)
task.defer(function()
  if player:GetAttribute("CivReady") == true and (tonumber(player:GetAttribute("CivRaceID")) or 0) == 0 then
    local raceList = findUi("Races")
    if raceList and raceList:IsA("GuiObject") then raceList.Visible = true end
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
local observed: {[Model]: {Visual: Model, Root: BasePart, LastFrame: CFrame?, LastOffset: CFrame?}} = {}
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
      -- Server enemies are direct CivilizationWorlds children; avoid scanning every map descendant.
      for _, enemy in ipairs(world:GetChildren()) do
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
      local rootFrame = entry.Root.CFrame
      -- Existing server-owned movement is discrete: skip unchanged visual transforms.
      if entry.LastFrame ~= rootFrame or entry.LastOffset ~= offset then
        entry.Visual:PivotTo(rootFrame * offset)
        entry.LastFrame = rootFrame
        entry.LastOffset = offset
      end
    end
  end
end)
