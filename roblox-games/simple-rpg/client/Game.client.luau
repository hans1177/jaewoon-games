-- 파일명: roblox-games/simple-rpg/client/Game.client.luau
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")
local ContextActionService = game:GetService("ContextActionService")
local player = Players.LocalPlayer
local Shared = ReplicatedStorage:WaitForChild("Shared")
local Config = require(Shared:WaitForChild("GameConfig"))
local RaceData = require(Shared:WaitForChild("RaceData"))
local TechTreeData = require(Shared:WaitForChild("TechTreeData"))
local ProgressionData = require(Shared:WaitForChild("ProgressionData"))
local CraftingRecipeData = require(Shared:WaitForChild("CraftingRecipeData"))
local TradeMarketData = require(Shared:WaitForChild("TradeMarketData"))
local CommonUI = require(game:GetService("ReplicatedStorage"):WaitForChild("Shared"):WaitForChild("RobloxCommonUI"))
-- VERIFIED_EXTERNAL_LEARNING_CLIENT_CONTEXT_BEGIN
local verifiedExternalLearningContext = Config.VerifiedExternalLearning or Config.LearningContext or {}
local verifiedExternalLearningIds = verifiedExternalLearningContext.VerifiedExternalLearningIds or {}
local verifiedExternalLearningPrinciples = verifiedExternalLearningContext.ApplicationPrinciples or {}
local verifiedExternalGameDevelopmentPrinciples = verifiedExternalLearningContext.GameDevelopmentPrinciples or {}
local verifiedExternalLearningMappings = verifiedExternalLearningContext.GameSpecificSemanticMappings or {}
local verifiedExternalLearningDispositions = verifiedExternalLearningContext.LearningDispositions or {}
-- VERIFIED_EXTERNAL_LEARNING_CLIENT_CONTEXT_END

-- STUDIO_ASSET_BINDING_CLIENT_BEGIN
local STUDIO_ASSET_BINDING_VERSION = 2
local studioAssetConfig = Config.StudioAssets or {}
local studioAssetFamilies = studioAssetConfig.Families or {}
local studioAssetSelectionFingerprint = studioAssetConfig.SelectionFingerprint or ""
local function studioAssetFamily(family)
  local atoms = studioAssetFamilies[family]
  return type(atoms) == "table" and atoms or {}
end
local function hasStudioAssetAtom(familyOrAtom, atom)
  local family = atom == nil and "UI" or familyOrAtom
  local assetAtom = atom == nil and familyOrAtom or atom
  return table.find(studioAssetFamily(family), assetAtom) ~= nil
end
local STUDIO_ASSET_SELECTION = {
  CHARACTER = studioAssetFamily("CHARACTER"),
  CREATURE = studioAssetFamily("CREATURE"),
  BUILDING = studioAssetFamily("BUILDING"),
  ENVIRONMENT = studioAssetFamily("ENVIRONMENT"),
  WEAPON = studioAssetFamily("WEAPON"),
  SKILL = studioAssetFamily("SKILL"),
  MATERIAL = studioAssetFamily("MATERIAL"),
  AUDIO = studioAssetFamily("AUDIO"),
  VFX = studioAssetFamily("VFX"),
  UI = studioAssetFamily("UI"),
  MOTION = studioAssetFamily("MOTION"),
  PROP = studioAssetFamily("PROP"),
}
local STUDIO_ASSET_FAMILY_STATUS = {
  CHARACTER = "NOT_APPLICABLE",
  CREATURE = "NOT_APPLICABLE",
  BUILDING = "NOT_APPLICABLE",
  ENVIRONMENT = "APPLIED",
  WEAPON = "NOT_APPLICABLE",
  SKILL = "NOT_APPLICABLE",
  MATERIAL = "APPLIED",
  AUDIO = "NOT_APPLICABLE",
  VFX = "NOT_APPLICABLE",
  UI = "APPLIED",
  MOTION = "NOT_APPLICABLE",
  PROP = "NOT_APPLICABLE",
}
-- STUDIO_ASSET_BINDING_CLIENT_END
local remote = ReplicatedStorage:WaitForChild(Config.RemoteName)
local remotesFolder = ReplicatedStorage:WaitForChild("Remotes")
local parryEvent = remotesFolder:WaitForChild("ParryEvent")
local dodgeEvent = remotesFolder:WaitForChild("DodgeEvent")
local updateTechEvent = remotesFolder:WaitForChild("UpdateTechEvent")
local syncInventoryEvent = remotesFolder:WaitForChild("SyncInventoryEvent")
local unlockTechRequest = remotesFolder:WaitForChild("UnlockTechRequest")
local craftRequestRemote = remotesFolder:WaitForChild("CraftRequestRemote")
local portalTeleportEvent = remotesFolder:WaitForChild("PortalTeleportEvent")
local autoCombatEvent = remotesFolder:WaitForChild("AutoCombatEvent")
local tradeRequestRemote = remotesFolder:WaitForChild("TradeRequestRemote")
local marketUpdateEvent = remotesFolder:WaitForChild("MarketUpdateEvent")
local foundationRemote = ReplicatedStorage:WaitForChild("RuntimeFoundationReport")
local nativeTouchEnabled = UserInputService.TouchEnabled
local nativeFoundationCamera = workspace.CurrentCamera
local function reportNativeFoundationReady()
  local character = player.Character or player.CharacterAdded:Wait()
  local humanoid = character:WaitForChild("Humanoid")
  if nativeFoundationCamera and nativeFoundationCamera.CameraSubject == humanoid then
    foundationRemote:FireServer("CAMERA_READY")
  end
  foundationRemote:FireServer(nativeTouchEnabled and "INPUT_READY_TOUCH" or "INPUT_READY")
end
task.defer(reportNativeFoundationReady)

local gui = Instance.new("ScreenGui")
-- VERIFIED_EXTERNAL_LEARNING_CLIENT_RUNTIME_BEGIN
gui:SetAttribute("VerifiedExternalLearningCoveragePct", verifiedExternalLearningContext.CoveragePct or 0)
gui:SetAttribute("VerifiedExternalLearningContentComplete", verifiedExternalLearningContext.ContentComplete == true)
gui:SetAttribute("VerifiedExternalLearningCount", #verifiedExternalLearningIds)
gui:SetAttribute("VerifiedExternalLearningPrincipleCount", #verifiedExternalLearningPrinciples)
gui:SetAttribute("VerifiedExternalLearningFingerprint", verifiedExternalLearningContext.MemoryFingerprint or "")
gui:SetAttribute("VerifiedExternalGameDevelopmentPrincipleCount", #verifiedExternalGameDevelopmentPrinciples)
gui:SetAttribute("VerifiedExternalLearningSemanticMappingVersion", verifiedExternalLearningContext.SemanticMappingVersion or 0)
gui:SetAttribute("VerifiedExternalLearningSemanticMappingFingerprint", verifiedExternalLearningContext.SemanticMappingFingerprint or "")
gui:SetAttribute("VerifiedExternalLearningDispositionCount", #verifiedExternalLearningDispositions)
gui:SetAttribute("VerifiedExternalLearningMappingCount", #verifiedExternalLearningMappings)
gui:SetAttribute("VerifiedLearningSemanticVariant", verifiedExternalLearningContext.SemanticVariant or "")
-- VERIFIED_EXTERNAL_LEARNING_CLIENT_RUNTIME_END

gui.Name = "ApprovedScopeHud"
gui.ResetOnSpawn = false
gui.Parent = player:WaitForChild("PlayerGui")
local root = Instance.new("Frame")
if hasStudioAssetAtom("UI", "FRAME_PANEL") then
  local studioAssetStroke = Instance.new("UIStroke")
  studioAssetStroke.Name = "StudioAssetFramePanel"
  studioAssetStroke.Thickness = 1
  studioAssetStroke.Transparency = 0.55
  studioAssetStroke.Color = Color3.fromRGB(210, 225, 255)
  studioAssetStroke.Parent = root
end

root.Name = "Root"
root.AnchorPoint = Vector2.new(0.5, 1)
root.Position = UDim2.fromScale(0.5, 0.98)
root.Size = UDim2.new(1, -24, 0, 360)
root.BackgroundTransparency = 0.15
local studioAssetFamilies = Config.StudioAssets and Config.StudioAssets.Families or {}
local function studioAssetFamily(family)
  local atoms = studioAssetFamilies[family]
  return type(atoms) == "table" and atoms or {}
end
local function hasStudioAtom(familyOrAtom, atom)
  local family = atom == nil and "UI" or familyOrAtom
  local assetAtom = atom == nil and familyOrAtom or atom
  return table.find(studioAssetFamily(family), assetAtom) ~= nil
end
local studioUi = STUDIO_ASSET_SELECTION.UI
root.BackgroundColor3 = hasStudioAtom("UI", "FRAME_PANEL") and Color3.fromRGB(22, 34, 58) or Color3.fromRGB(18, 28, 48)
root:SetAttribute("StudioAssetBindingVersion", STUDIO_ASSET_BINDING_VERSION)
root:SetAttribute("StudioAssetSelectionFingerprint", Config.StudioAssets and Config.StudioAssets.SelectionFingerprint or "")
root:SetAttribute("StudioAssetAtoms", table.concat(studioAssetFamily("UI"), ","))
root.Parent = gui
local title = Instance.new("TextLabel")
title.Name = "Title"
title.Size = UDim2.new(1, -20, 0, 44)
title.Position = UDim2.fromOffset(10, 8)
title.BackgroundTransparency = 1
title.TextColor3 = Color3.fromRGB(245, 248, 255)
title.TextScaled = true
title.Text = Config.GameName
title.Parent = root
local status = Instance.new("TextLabel")
status.Name = "Status"
status.Size = UDim2.new(1, -20, 0, 48)
status.Position = UDim2.fromOffset(10, 54)
status.BackgroundColor3 = Color3.fromRGB(10, 17, 30)
status.TextColor3 = Color3.fromRGB(220, 232, 250)
status.TextScaled = true
status.Parent = root

local multiplayerStatus = Instance.new("TextLabel")
multiplayerStatus.Name = "MultiplayerStatus"
multiplayerStatus.Size = UDim2.new(1, -20, 0, 36)
multiplayerStatus.Position = UDim2.fromOffset(10, 104)
multiplayerStatus.BackgroundTransparency = 1
multiplayerStatus.TextColor3 = Color3.fromRGB(180, 230, 255)
multiplayerStatus.TextScaled = true
multiplayerStatus.Text = "Multiplayer sync ready"
multiplayerStatus.Parent = root
remote.OnClientEvent:Connect(function(kind, payload)
  if kind ~= "MULTIPLAYER_SYNC" or typeof(payload) ~= "table" then return end
  multiplayerStatus.Text = string.format("Players %d · Shared %d · Round %d", payload.ParticipantCount or 0, payload.SharedObjective or 0, payload.RoundScore or 0)
end)

local list = Instance.new("ScrollingFrame")
list.Name = "ApprovedActions"
list.Size = UDim2.new(1, -20, 1, -150)
list.Position = UDim2.fromOffset(10, 142)
list.BackgroundTransparency = 1
list.BorderSizePixel = 0
list.AutomaticCanvasSize = Enum.AutomaticSize.Y
list.CanvasSize = UDim2.new()
list.ScrollBarThickness = 6
list.Parent = root
local layout = Instance.new("UIListLayout")
layout.Padding = UDim.new(0, 8)
layout.SortOrder = Enum.SortOrder.LayoutOrder
layout.Parent = list
for index, action in ipairs(Config.Actions) do
  local button = CommonUI.CreatePrimaryButton({minWidth=52,minHeight=56})
  button.Name = "ScopeAction" .. index
  button.LayoutOrder = index
  button.Size = UDim2.new(1, -4, 0, 56)
  button.BackgroundColor3 = hasStudioAtom("UI", "BUTTON_PRIMARY") and Color3.fromRGB(224, 236, 255) or Color3.fromRGB(235, 242, 255)
  button.TextColor3 = Color3.fromRGB(16, 24, 40)
  button.TextWrapped = true
  button.TextScaled = false;button.TextSize=15
  button.Text = CommonUI.ActionLabel(action,index)
  button.Parent = list
  button.Activated:Connect(function() remote:FireServer(action.Id) end)
end
local healthTrack = Instance.new("Frame")
healthTrack.Name = "StudioHealthTrack"
healthTrack.Size = UDim2.new(1, -20, 0, 10)
healthTrack.Position = UDim2.fromOffset(10, 98)
healthTrack.BackgroundColor3 = Color3.fromRGB(70, 78, 92)
healthTrack.BorderSizePixel = 0
healthTrack.Visible = hasStudioAtom("UI", "BAR_HEALTH")
healthTrack.Parent = root
local healthFill = Instance.new("Frame")
healthFill.Name = "StudioHealthFill"
healthFill.Size = UDim2.fromScale(1, 1)
healthFill.BackgroundColor3 = Color3.fromRGB(92, 205, 118)
healthFill.BorderSizePixel = 0
healthFill.Parent = healthTrack
local watched = {"Score","Coins","Level","Progress","Health","Wave","Position","Objective","Combo","EnemyHealth","PuzzleChain","Towers","BaseHealth","SocialBond","SharedObjective","RoundScore","LastApprovedScope"}
local function render()
  status.Text = string.format("Score %d · Lv %d · Progress %d · HP %d · Wave %d", player:GetAttribute("Score") or 0, player:GetAttribute("Level") or 1, player:GetAttribute("Progress") or 0, player:GetAttribute("Health") or 100, player:GetAttribute("Wave") or 1)
  healthFill.Size = UDim2.fromScale(math.clamp((player:GetAttribute("Health") or 100) / 100, 0, 1), 1)
end
for _, name in ipairs(watched) do player:GetAttributeChangedSignal(name):Connect(render) end
render()
-- VERIFIED_EXTERNAL_LEARNING_ROBLOX_NATIVE_BEGIN
local verifiedLearningPlayers = game:GetService("Players")
local verifiedLearningTweenService = game:GetService("TweenService")
local verifiedLearningLighting = game:GetService("Lighting")
local verifiedLearningPlayer = verifiedLearningPlayers.LocalPlayer
local verifiedLearningContext = Config.VerifiedExternalLearning or Config.LearningContext or {}
local verifiedLearningPrinciples = verifiedLearningContext.ApplicationPrinciples or {}
local verifiedLearningAxes = verifiedLearningContext.ApplyAxes or {}
local VERIFIED_EXTERNAL_LEARNING_NATIVE_BINDING_VERSION = 6
local verifiedLearningRoot = gui
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


if #Config.Actions > 0 then
  ContextActionService:BindAction("VibePrimaryAction", function(_, inputState)
    if inputState == Enum.UserInputState.Begin and gui:GetAttribute("GameMenuOpen")~=true then remote:FireServer(Config.Actions[1].Id) end
    return Enum.ContextActionResult.Sink
  end, false, Enum.KeyCode.Space, Enum.KeyCode.ButtonA)
end

CommonUI.AdaptActionMenu(gui,root,list,title,status,healthTrack,multiplayerStatus,Config.Actions[1]and{
 label=CommonUI.ActionLabel(Config.Actions[1],1),activate=function()remote:FireServer(Config.Actions[1].Id)end
}or nil)

-- 문명 멀티버스 주 화면: 기존 RPG 기능은 별도 '기존 RPG' 버튼으로 유지한다.
local civGui = Instance.new("ScreenGui")
civGui.Name = "CivilizationHud"
civGui.ZIndexBehavior = Enum.ZIndexBehavior.Global
civGui.ResetOnSpawn = false
civGui.DisplayOrder = 12
civGui.IgnoreGuiInset = false
civGui.Parent = player:WaitForChild("PlayerGui")
local function civLabel(parent, name, text, size, pos, background)
  local label = Instance.new("TextLabel")
  label.Name = name
  label.Text = text
  label.TextColor3 = Color3.fromRGB(232, 213, 168)
  label.TextSize = 15
  label.TextWrapped = true
  label.Font = Enum.Font.GothamBold
  label.TextXAlignment = Enum.TextXAlignment.Center
  label.BackgroundColor3 = Color3.fromRGB(107, 74, 47)
  label.BackgroundTransparency = background and 0.15 or 1
  label.BorderSizePixel = 0
  label.Size = size
  label.Position = pos
  label.ZIndex = parent:IsA("ScreenGui") and 5 or 12
  label.Parent = parent
  return label
end
local function civButton(parent, name, text, size, pos, callback)
  local button = Instance.new("TextButton")
  button.Name = name
  button.Size = size
  button.Position = pos
  button.BackgroundColor3 = Color3.fromRGB(138, 90, 56)
  button.TextColor3 = Color3.fromRGB(232, 213, 168)
  button.TextWrapped = true
  button.TextSize = 16
  button.Font = Enum.Font.GothamBold
  button.BorderSizePixel = 0
  button.Text = text
  button.AutoButtonColor = true
  button.ZIndex = (parent:IsA("ScreenGui") or parent.Name == "CivilizationMenu") and 5 or 12
  button.Parent = parent
  local corner = Instance.new("UICorner")
  corner.CornerRadius = UDim.new(0, 8)
  corner.Parent = button
  local woodBorder = Instance.new("UIStroke")
  woodBorder.Name = "OakBorder"
  woodBorder.Color = Color3.fromRGB(107, 74, 47)
  woodBorder.Thickness = 2
  woodBorder.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
  woodBorder.Parent = button
  button.Activated:Connect(callback)
  return button
end
local civTitle = civLabel(civGui, "CivilizationTitle", "대충알피지",
  UDim2.new(1, -20, 0, 35), UDim2.fromOffset(10, 0), true)
local civStatus = civLabel(civGui, "CivilizationStatus", "",
  UDim2.new(1, -20, 0, 54), UDim2.fromOffset(10, 39), true)
civStatus.TextSize = 13
local civMessage = civLabel(civGui, "CombatNotice", "",
  UDim2.new(1, -134, 0, 43), UDim2.fromOffset(10, 97), true)
civMessage.TextSize = 14
civMessage.BackgroundColor3 = Color3.fromRGB(62, 47, 34)
local civPanel = Instance.new("Frame")
civPanel.Name = "CivilizationPanel"
civPanel.AnchorPoint = Vector2.new(0.5, 0.5)
civPanel.Position = UDim2.new(0.5, 0, 0.5, 58)
civPanel.Size = UDim2.new(1, -28, 1, -176)
civPanel.BackgroundColor3 = Color3.fromRGB(107, 74, 47)
civPanel.BackgroundTransparency = 0.04
civPanel.ZIndex = 10
civPanel.BorderSizePixel = 0
civPanel.Visible = false
civPanel.Parent = civGui
local panelCorner = Instance.new("UICorner")
panelCorner.CornerRadius = UDim.new(0, 12)
panelCorner.Parent = civPanel
local panelBorder = Instance.new("UIStroke")
panelBorder.Name = "CivilizationFrameBorder"
panelBorder.Color = Color3.fromRGB(138, 90, 56)
panelBorder.Thickness = 3
panelBorder.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
panelBorder.Parent = civPanel
local panelTitle = civLabel(civPanel, "PanelTitle", "문명 선택",
  UDim2.new(1, -92, 0, 46), UDim2.fromOffset(10, 8), false)
panelTitle.TextSize = 20
panelTitle.TextXAlignment = Enum.TextXAlignment.Left
local civCloseButton = civButton(civPanel, "Close", "닫기", UDim2.fromOffset(60, 45),
  UDim2.new(1, -65, 0, 6), function() civPanel.Visible = false end)
civCloseButton.ZIndex = 13
local civList = Instance.new("ScrollingFrame")
civList.Name = "CivilizationList"
civList.Size = UDim2.new(1, -24, 1, -67)
civList.Position = UDim2.fromOffset(12, 60)
civList.BackgroundTransparency = 1
civList.BorderSizePixel = 0
civList.ScrollBarThickness = 6
civList.ZIndex = 11
civList.ScrollingDirection = Enum.ScrollingDirection.Y
civList.AutomaticCanvasSize = Enum.AutomaticSize.Y
civList.CanvasSize = UDim2.new()
civList.Parent = civPanel
local civLayout = Instance.new("UIListLayout")
civLayout.Padding = UDim.new(0, 8)
civLayout.SortOrder = Enum.SortOrder.LayoutOrder
civLayout.Parent = civList
-- Left-side civilization controls use one scrollable layout; world/combat buttons keep their own positions.
-- Never add UIListLayout to arbitrary Frames (inventory uses an independent UIGridLayout).
local civMenuRail = Instance.new("ScrollingFrame")
civMenuRail.Name = "CivilizationMenu"
civMenuRail.Position = UDim2.fromOffset(10, 146)
civMenuRail.Size = UDim2.fromOffset(104, 250)
civMenuRail.BackgroundTransparency = 1
civMenuRail.BorderSizePixel = 0
civMenuRail.ZIndex = 2
civMenuRail.Active = true
civMenuRail.ScrollBarThickness = 4
civMenuRail.ScrollingDirection = Enum.ScrollingDirection.Y
civMenuRail.AutomaticCanvasSize = Enum.AutomaticSize.Y
civMenuRail.CanvasSize = UDim2.new()
civMenuRail.ClipsDescendants = true
civMenuRail.Parent = civGui
local civMenuLayout = Instance.new("UIListLayout")
civMenuLayout.SortOrder = Enum.SortOrder.LayoutOrder
civMenuLayout.Padding = UDim.new(0, 8)
civMenuLayout.Parent = civMenuRail

local function resizeCivMenuRail()
  local camera = workspace.CurrentCamera
  local viewport = camera and camera.ViewportSize or Vector2.new(390, 720)
  -- 작은 모바일 화면에서도 하단 전투 조작 영역을 침범하지 않도록 메뉴 높이를 제한한다.
  local reservedBottom = nativeTouchEnabled and math.min(244, math.floor(viewport.Y * 0.34))
    or math.min(164, math.floor(viewport.Y * 0.24))
  local availableHeight = math.max(0, viewport.Y - 146 - reservedBottom)
  -- 메뉴 높이가 바뀌어도 이전 스크롤 위치가 범위를 벗어나지 않도록 보정한다.
  local menuHeight = math.floor(math.min(440, availableHeight))
  local maxScroll = math.max(0, civMenuRail.AbsoluteCanvasSize.Y - menuHeight)
  if civMenuRail.CanvasPosition.Y > maxScroll then
    civMenuRail.CanvasPosition = Vector2.new(0, maxScroll)
  end
  civMenuRail.Size = UDim2.fromOffset(
    math.floor(math.min(108, math.max(72, viewport.X * 0.28))),
    menuHeight
  )
end
local civMenuViewportConnection
local function bindCivMenuViewport()
  if civMenuViewportConnection then
    civMenuViewportConnection:Disconnect()
    civMenuViewportConnection = nil
  end
  local camera = workspace.CurrentCamera
  if camera then
    civMenuViewportConnection = camera:GetPropertyChangedSignal("ViewportSize"):Connect(resizeCivMenuRail)
  end
  resizeCivMenuRail()
end
workspace:GetPropertyChangedSignal("CurrentCamera"):Connect(bindCivMenuViewport)
bindCivMenuViewport()
local civPanelMode = "Races"
local civTechEra = 1
local inventorySnapshot = {}
local researchRequestPending = false
-- Native touch players opt in by default. PC controls and manual action buttons are unchanged.
local autoCombatEnabled = nativeTouchEnabled
local marketSnapshot = {}
local tradeCurrency = "Silver"
-- 24문명별 저비용 블록형 미리보기. 실제 R15 아바타/구매 에셋을 가장하지 않는다.
local civPreviewStyles = {
  {Color3.fromRGB(144, 64, 57), Color3.fromRGB(211, 166, 83), "crest"},
  {Color3.fromRGB(210, 174, 98), Color3.fromRGB(237, 209, 103), "crown"},
  {Color3.fromRGB(70, 108, 145), Color3.fromRGB(189, 143, 82), "helmet"},
  {Color3.fromRGB(169, 67, 60), Color3.fromRGB(231, 185, 76), "cap"},
  {Color3.fromRGB(120, 88, 66), Color3.fromRGB(198, 149, 86), "crown"},
  {Color3.fromRGB(117, 75, 120), Color3.fromRGB(223, 179, 82), "crown"},
  {Color3.fromRGB(180, 117, 72), Color3.fromRGB(239, 205, 113), "turban"},
  {Color3.fromRGB(70, 130, 90), Color3.fromRGB(211, 164, 61), "feathers"},
  {Color3.fromRGB(175, 83, 69), Color3.fromRGB(236, 189, 65), "sun"},
  {Color3.fromRGB(56, 138, 136), Color3.fromRGB(219, 177, 84), "feathers"},
  {Color3.fromRGB(79, 117, 73), Color3.fromRGB(151, 108, 64), "hood"},
  {Color3.fromRGB(62, 95, 127), Color3.fromRGB(178, 182, 172), "helmet"},
  {Color3.fromRGB(146, 112, 70), Color3.fromRGB(202, 165, 112), "fur"},
  {Color3.fromRGB(153, 57, 58), Color3.fromRGB(65, 65, 71), "kabuto"},
  {Color3.fromRGB(62, 102, 116), Color3.fromRGB(203, 151, 69), "sun"},
  {Color3.fromRGB(112, 75, 118), Color3.fromRGB(180, 146, 82), "hat"},
  {Color3.fromRGB(192, 156, 106), Color3.fromRGB(235, 218, 162), "turban"},
  {Color3.fromRGB(84, 123, 82), Color3.fromRGB(218, 181, 95), "cross"},
  {Color3.fromRGB(76, 140, 144), Color3.fromRGB(185, 211, 177), "band"},
  {Color3.fromRGB(126, 100, 62), Color3.fromRGB(212, 192, 127), "feathers"},
  {Color3.fromRGB(119, 123, 137), Color3.fromRGB(179, 70, 65), "helmet"},
  {Color3.fromRGB(70, 99, 168), Color3.fromRGB(222, 180, 92), "plume"},
  {Color3.fromRGB(90, 97, 105), Color3.fromRGB(172, 160, 134), "helmet"},
  {Color3.fromRGB(125, 68, 74), Color3.fromRGB(184, 175, 160), "fur"},
}
local civPreviewTone = 1
local civSkinTones = {Color3.fromRGB(190, 148, 114), Color3.fromRGB(225, 184, 145), Color3.fromRGB(145, 100, 70), Color3.fromRGB(98, 68, 49)}
local function civBuildCharacterPreview(viewport, raceId)
  local style = civPreviewStyles[raceId]
  if not style then return end
  for _, child in ipairs(viewport:GetChildren()) do
    if child:IsA("WorldModel") or child:IsA("Camera") then child:Destroy() end
  end
  local world = Instance.new("WorldModel")
  world.Parent = viewport
  local function block(name, size, position, color, shape)
    local part = Instance.new("Part")
    part.Name = name
    part.Size = size
    part.CFrame = CFrame.new(position)
    part.Color = color
    part.Material = Enum.Material.SmoothPlastic
    part.Anchored = true
    part.CanCollide = false
    part.CanTouch = false
    part.CanQuery = false
    if shape then part.Shape = shape end
    part.Parent = world
    return part
  end
  local cloth, metal, headwear = style[1], style[2], style[3]
  local skin = civSkinTones[civPreviewTone]
  block("Torso", Vector3.new(1.8, 1.85, 0.9), Vector3.new(0, 2.85, 0), cloth)
  block("Waist", Vector3.new(1.7, 0.4, 0.85), Vector3.new(0, 1.9, 0), metal)
  for _, side in ipairs({-1, 1}) do
    block("Arm" .. side, Vector3.new(0.65, 1.7, 0.76), Vector3.new(side * 1.22, 2.82, 0), cloth)
    block("Leg" .. side, Vector3.new(0.75, 1.7, 0.8), Vector3.new(side * 0.48, 0.9, 0), cloth)
  end
  block("Head", Vector3.new(1.18, 1.14, 1.1), Vector3.new(0, 4.38, 0), skin)
  block("ChestEmblem", Vector3.new(0.65, 0.6, 0.12), Vector3.new(0, 3.1, 0.52), metal)
  if headwear == "turban" or headwear == "fur" or headwear == "hood" then
    block("Wrap", Vector3.new(1.42, 0.56, 1.3), Vector3.new(0, 4.96, 0), metal)
    block("CrownWrap", Vector3.new(1.2, 0.38, 1.14), Vector3.new(0, 5.24, 0), cloth)
  elseif headwear == "feathers" or headwear == "plume" or headwear == "crest" then
    block("Headband", Vector3.new(1.4, 0.35, 1.24), Vector3.new(0, 5.02, 0), metal)
    for _, side in ipairs({-1, 0, 1}) do
      block("Plume" .. side, Vector3.new(0.22, 0.85 + (1 - math.abs(side)) * 0.35, 0.25),
        Vector3.new(side * 0.33, 5.66, 0), cloth)
    end
  elseif headwear == "crown" or headwear == "sun" or headwear == "cross" then
    block("CrownBase", Vector3.new(1.38, 0.33, 1.2), Vector3.new(0, 5.02, 0), metal)
    block("CrownEmblem", Vector3.new(0.37, 0.77, 0.2), Vector3.new(0, 5.44, 0.36), metal)
  else
    block("Helmet", Vector3.new(1.45, 0.55, 1.33), Vector3.new(0, 5.03, 0), metal)
    block("HelmetRidge", Vector3.new(1.1, 0.25, 0.2), Vector3.new(0, 5.37, 0), cloth)
  end
  local camera = Instance.new("Camera")
  camera.CFrame = CFrame.lookAt(Vector3.new(8.6, 5.0, 13), Vector3.new(0, 2.75, 0))
  camera.Parent = viewport
  viewport.CurrentCamera = camera
  viewport.Ambient = Color3.fromRGB(210, 193, 160)
  viewport.LightColor = Color3.fromRGB(255, 243, 196)
  viewport.LightDirection = Vector3.new(-1, -1, -1)
end
local function civOpen(mode)
  if civPanel.Visible and civPanelMode == mode then
    civPanel.Visible = false
    return
  end
  if mode == "Techs" and civPanelMode ~= "Techs" then
    local nextTech = TechTreeData.GetTech(math.min(72, (player:GetAttribute("CivTech") or 0) + 1))
    civTechEra = nextTech and nextTech.Era or 5
  end
  civPanelMode = mode
  -- 연구 화면은 양피지, 기타 화면은 원목 톤을 유지한다.
  civPanel.BackgroundColor3 = mode == "Techs" and Color3.fromRGB(232, 213, 168) or Color3.fromRGB(107, 74, 47)
  panelTitle.TextColor3 = mode == "Techs" and Color3.fromRGB(107, 74, 47) or Color3.fromRGB(232, 213, 168)
  panelBorder.Color = mode == "Techs" and Color3.fromRGB(200, 154, 91) or Color3.fromRGB(138, 90, 56)
  civPanel.Visible = true
  for _, item in ipairs(civList:GetChildren()) do
    if item:IsA("GuiObject") then item:Destroy() end
  end
  local selected = player:GetAttribute("CivRaceID") or 0
  if mode == "Races" then
    panelTitle.Text = selected == 0 and "24개 문명 중 하나를 선택해" or "24개 문명 정보"
    -- 한 번에 하나의 ViewportFrame만 렌더링하여 모바일 메모리/드로우콜을 제한한다.
    local racePreview = Instance.new("Frame")
    racePreview.Name = "CivilizationCharacterPreview"
    racePreview.Size = UDim2.new(1, -9, 0, 318)
    racePreview.BackgroundColor3 = Color3.fromRGB(107, 74, 47)
    racePreview.BorderSizePixel = 0
    racePreview.LayoutOrder = 0
    racePreview.Parent = civList
    local previewTitle = civLabel(racePreview, "PreviewTitle", "24문명 전사 · 블록형 3D 미리보기",
      UDim2.new(1, -12, 0, 30), UDim2.fromOffset(6, 3), false)
    previewTitle.TextSize = 14
    local viewport = Instance.new("ViewportFrame")
    viewport.Name = "OneCharacterViewport"
    viewport.Size = UDim2.new(1, -152, 0, 130)
    viewport.Position = UDim2.new(0, 76, 0, 33)
    viewport.BackgroundColor3 = Color3.fromRGB(44, 74, 110)
    viewport.BorderSizePixel = 0
    viewport.ZIndex = 12
    viewport.Parent = racePreview
    local previewInfo = civLabel(racePreview, "PreviewRaceInfo", "",
      UDim2.new(1, -16, 0, 82), UDim2.new(0, 8, 1, -89), true)
    previewInfo.TextSize = 13
    previewInfo.TextWrapped = true
    previewInfo.TextYAlignment = Enum.TextYAlignment.Top
    previewInfo.TextColor3 = Color3.fromRGB(232, 213, 168)
    local previewBorder = Instance.new("UIStroke")
    previewBorder.Name = "ParchmentPreviewBorder"
    previewBorder.Color = Color3.fromRGB(200, 154, 91)
    previewBorder.Thickness = 2
    previewBorder.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
    previewBorder.Parent = racePreview
    local currentPreviewId = selected > 0 and selected or 1
    local function showPreview(raceId)
      currentPreviewId = (raceId - 1) % 24 + 1
      local display = RaceData.GetRace(currentPreviewId)
      if not display then return end
      civBuildCharacterPreview(viewport, currentPreviewId)
      previewInfo.Text = display.Name .. " · " .. display.Visual .. "\n" .. display.Landmark .. "\n특성: " .. display.Passive
    end
    civButton(racePreview, "PreviousRacePreview", "◀", UDim2.fromOffset(60, 54),
      UDim2.fromOffset(7, 70), function() showPreview(currentPreviewId - 1) end)
    civButton(racePreview, "NextRacePreview", "▶", UDim2.fromOffset(60, 54),
      UDim2.new(1, -67, 0, 70), function() showPreview(currentPreviewId + 1) end)
    local toneButton
    toneButton = civButton(racePreview, "SkinTonePreview", "외형 미리보기 · 피부색 변경",
      UDim2.new(1, -16, 0, 38), UDim2.fromOffset(8, 178), function()
        civPreviewTone = civPreviewTone % #civSkinTones + 1
        remote:FireServer("CivSkinTone", civPreviewTone)
        toneButton.Text = "피부색 " .. tostring(civPreviewTone) .. "/" .. tostring(#civSkinTones) .. " · 변경"
        showPreview(currentPreviewId)
      end)
    toneButton.TextSize = 13
    toneButton.BackgroundColor3 = Color3.fromRGB(44, 74, 110)
    local toneAccent = Instance.new("UIStroke")
    toneAccent.Name = "SkinToneAccent"
    toneAccent.Color = Color3.fromRGB(232, 163, 61)
    toneAccent.Thickness = 2
    toneAccent.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
    toneAccent.Parent = toneButton
    -- 현재 서버에 저장된 피부색을 화면에 표시한다. 직업 선택은 만들지 않는다.
    local function refreshToneLabel()
      toneButton.Text = "피부색 " .. tostring(civPreviewTone) .. "/" .. tostring(#civSkinTones) .. " · 변경"
    end
    civPreviewTone = math.clamp(player:GetAttribute("CivSkinTone") or 1, 1, #civSkinTones)
    refreshToneLabel()
    -- 서버 저장 상태가 갱신되면 미리보기와 버튼도 동일한 색상으로 복원한다.
    local toneChangedConnection
    toneChangedConnection = player:GetAttributeChangedSignal("CivSkinTone"):Connect(function()
      if not racePreview.Parent then
        toneChangedConnection:Disconnect()
        return
      end
      local savedTone = player:GetAttribute("CivSkinTone")
      if typeof(savedTone) == "number" and savedTone % 1 == 0 and civSkinTones[savedTone] then
        civPreviewTone = savedTone
        refreshToneLabel()
        showPreview(currentPreviewId)
      end
    end)
    racePreview.Destroying:Once(function()
      toneChangedConnection:Disconnect()
    end)
    showPreview(currentPreviewId)
    for id = 1, 24 do
      local race = RaceData.GetRace(id)
      local text = string.format("%02d. %s / %s\n%s\n외형: %s", id, race.Name, race.Landmark, race.Passive, race.Visual)
      local button = civButton(civList, "Race" .. id, text,
        UDim2.new(1, -9, 0, 96), UDim2.new(), function()
          if selected == 0 then
            remote:FireServer("CivSelect", id)
            civPanel.Visible = false
          else
            civMessage.Text = race.Name .. " / " .. race.SpecialResources
          end
        end)
      button.LayoutOrder = id
      button.TextSize = 13
      if selected == id then button.BackgroundColor3 = Color3.fromRGB(119, 94, 41) end
    end
  elseif mode == "Inventory" then
    panelTitle.Text = "인벤토리 4×8 · 자원/장비 현황"
    local weaponNames = {"맨손", "돌창", "청동검", "철제 대검"}
    local equipId = math.clamp(player:GetAttribute("CivEquippedWeapon") or 0, 0, 3)
    local statusLine = civLabel(civList, "InventoryEquipped",
      "장착 무기: " .. weaponNames[equipId + 1] .. " | 제작 메뉴에서 변경 가능",
      UDim2.new(1, -9, 0, 43), UDim2.new(), false)
    statusLine.LayoutOrder = 0
    local container = Instance.new("Frame")
    container.Name = "Inventory32Slots"
    container.Size = UDim2.new(1, -9, 0, 464)
    container.BackgroundTransparency = 1
    container.LayoutOrder = 1
    container.Parent = civList
    local grid = Instance.new("UIGridLayout")
    grid.Name = "FourColumnsEightRows"
    grid.FillDirectionMaxCells = 4
    grid.CellSize = UDim2.new(0.25, -6, 0, 51)
    grid.CellPadding = UDim2.fromOffset(5, 7)
    grid.SortOrder = Enum.SortOrder.LayoutOrder
    grid.Parent = container
    local fields = {
      {"CivWood", "목재"}, {"CivStone", "석재"}, {"CivBronze", "청동"}, {"CivIron", "철"},
      {"CivCopperOre", "구리"}, {"CivTinOre", "주석"}, {"CivIronOre", "철광석"}, {"CivCoal", "석탄"},
      {"CivBronzeIngot", "청동 주괴"}, {"CivIronIngot", "철 주괴"}, {"CivHide", "가죽"}, {"CivCoreCrystal", "코어"},
      {"CivDarkIron", "다크 아이언"}, {"CivStoneSpear", "돌창"}, {"CivStoneAxe", "석기 도끼"}, {"CivBronzeSword", "청동검"}, {"CivIronGreatsword", "대검"},
      {"CivFood", "식량"}, {"CivSilver", "은화"}, {"CivGold", "골드"},
      {"CivMarble", "대리석"}, {"CivGoldOre", "금 특산품"}, {"CivSpice", "향신료"},
      {"CivResearch", "연구력"},
      {"CivStoneWall", "성벽"}, {"CivDangunAltar", "단군 제단"}, {"CivPyramid", "피라미드"},
      {"CivColosseum", "콜로세움"}, {"CivDrakkarShipyard", "드라카르 조선소"},
    }
    for slot = 1, 32 do
      local item = fields[slot]
      local amount = item and (inventorySnapshot[item[1]] or player:GetAttribute(item[1]) or 0) or 0
      local label = civLabel(container, "Slot" .. slot,
        item and (item[2] .. "\n×" .. tostring(amount)) or "빈 칸",
        UDim2.fromScale(1, 1), UDim2.new(), true)
      label.LayoutOrder = slot
      label.TextSize = 12
      -- 모바일 가방: 빈 칸과 보유 자원을 명암·텍스트로 구분한다.
      label.TextWrapped = true
      label.TextColor3 = amount > 0 and Color3.fromRGB(255, 243, 218) or Color3.fromRGB(205, 187, 158)
      label.BackgroundColor3 = amount > 0 and Color3.fromRGB(105, 67, 42) or Color3.fromRGB(138, 90, 56)
      local slotCorner = Instance.new("UICorner")
      slotCorner.CornerRadius = UDim.new(0, 5)
      slotCorner.Parent = label
      local slotBorder = Instance.new("UIStroke")
      slotBorder.Color = amount > 0 and Color3.fromRGB(200, 154, 91) or Color3.fromRGB(107, 74, 47)
      slotBorder.Thickness = amount > 0 and 2 or 1
      slotBorder.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
      slotBorder.Parent = label
    end
    -- 장비 시각화는 현재 서버 속성만 표시한다. 미지원 부위는 장착/저장 기능을 만들지 않는다.
    local gearTitle = civLabel(civList, "EquipmentPreviewTitle", "장비 현황 · 무기만 장착 가능",
      UDim2.new(1, -9, 0, 36), UDim2.new(), false)
    gearTitle.LayoutOrder = 2
    gearTitle.TextSize = 14
    local gearFrame = Instance.new("Frame")
    gearFrame.Name = "EquipmentPreview"
    gearFrame.Size = UDim2.new(1, -9, 0, 167)
    gearFrame.BackgroundTransparency = 1
    gearFrame.LayoutOrder = 3
    gearFrame.Parent = civList
    local gearGrid = Instance.new("UIGridLayout")
    gearGrid.Name = "TwoColumnsThreeRows"
    gearGrid.FillDirectionMaxCells = 2
    gearGrid.CellSize = UDim2.new(0.5, -5, 0, 49)
    gearGrid.CellPadding = UDim2.fromOffset(6, 7)
    gearGrid.SortOrder = Enum.SortOrder.LayoutOrder
    gearGrid.Parent = gearFrame
    local gearSlots = {
      {"무기", weaponNames[equipId + 1], true},
      {"방패", "미지원", false}, {"투구", "미지원", false},
      {"갑옷", "미지원", false}, {"장신구", "미지원", false}, {"신발", "미지원", false},
    }
    for index, gear in ipairs(gearSlots) do
      local preview = civLabel(gearFrame, "Gear" .. index, gear[1] .. "\n" .. gear[2],
        UDim2.fromScale(1, 1), UDim2.new(), true)
      preview.LayoutOrder = index
      preview.TextSize = 13
      preview.BackgroundColor3 = gear[3] and Color3.fromRGB(95, 110, 60) or Color3.fromRGB(90, 79, 66)
      preview.BackgroundTransparency = 0.08
      local corner = Instance.new("UICorner")
      corner.CornerRadius = UDim.new(0, 5)
      corner.Parent = preview
      local border = Instance.new("UIStroke")
      border.Color = Color3.fromRGB(200, 154, 91)
      border.Thickness = 1
      border.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
      border.Parent = preview
    end
  elseif mode == "Crafts" or mode == "Buildings" then
    panelTitle.Text = mode == "Crafts" and "제작·제련 | 석기→청동→철기" or "영지 건축·문명 랜드마크"
    local keys = mode == "Crafts" and ProgressionData.RecipeKeys() or ProgressionData.StructureKeys()
    local selectedRace = player:GetAttribute("CivRaceID") or 0
    local techCount = player:GetAttribute("CivTech") or 0
    for index, key in ipairs(keys) do
      local row = mode == "Crafts" and ProgressionData.GetRecipe(key) or ProgressionData.GetStructure(key)
      if row then
        local resources = {}
        local missing = false
        for resource, count in pairs(row.Costs) do
          table.insert(resources, resource:gsub("^Civ", "") .. " " .. count)
          if (player:GetAttribute(resource) or 0) < count then missing = true end
        end
        table.sort(resources)
        local requiresMilestone = row.RequiredMetric ~= nil and (player:GetAttribute(row.RequiredMetric) or 0) < 1
        local locked = techCount < row.MinimumTech or requiresMilestone
          or (row.RequiredRace ~= nil and row.RequiredRace ~= 0 and row.RequiredRace ~= selectedRace)
        local owned = mode == "Buildings" and (player:GetAttribute("Civ" .. key) or 0) >= 1
        local label = string.format("%s%s | %s\\n%s | 연구 %d 필요%s",
          row.Label, owned and " [건설 완료]" or "", row.Station or "영지",
          table.concat(resources, " / "), row.MinimumTech,
          locked and " [잠김]" or missing and " [자원 부족]" or "")
        local button = civButton(civList, "Production" .. key, label,
          UDim2.new(1, -9, 0, 82), UDim2.new(), function()
            if mode == "Crafts" then remote:FireServer("CivCraft", key)
            else remote:FireServer("CivBuild", key) end
          end)
        button.LayoutOrder = index
        button.TextSize = 13
        if locked or missing or owned then button.BackgroundColor3 = Color3.fromRGB(85, 86, 84) end
      end
    end
    if mode == "Crafts" then
      -- 소유자 지정 제작 시간은 별도 서버 큐가 처리하며 UI는 요청만 보낸다.
      for _, recipeID in ipairs(CraftingRecipeData.RecipeIDs()) do
        local recipe = CraftingRecipeData.GetRecipe(recipeID)
        if recipe then
          local materials = {}
          local missing = false
          for field, cost in pairs(recipe.Ingredients) do
            table.insert(materials, field:gsub("^Civ", "") .. " " .. cost)
            if (player:GetAttribute(field) or 0) < cost then missing = true end
          end
          table.sort(materials)
          local locked = techCount < recipe.RequiredTechID
          local label = string.format("%s · 제작 %d초\\n%s | 연구 %d 필요%s",
            recipe.ItemName, recipe.CraftTime, table.concat(materials, " / "),
            recipe.RequiredTechID, locked and " [잠김]" or missing and " [자원 부족]" or "")
          local btn = civButton(civList, "TimedCraft" .. recipeID, label,
            UDim2.new(1, -9, 0, 78), UDim2.new(), function()
              craftRequestRemote:FireServer(recipeID)
            end)
          btn.LayoutOrder = 20 + recipeID
          btn.TextSize = 13
          if locked or missing then btn.BackgroundColor3 = Color3.fromRGB(85, 86, 84) end
        end
      end
      for index, key in ipairs({"StoneSpear", "BronzeSword", "IronGreatsword"}) do
        local owned = player:GetAttribute("Civ" .. key) or 0
        if owned > 0 then
          local btn = civButton(civList, "Equip" .. key, "장착하기: " .. key,
            UDim2.new(1, -9, 0, 50), UDim2.new(), function()
              remote:FireServer("CivEquip", key)
            end)
          btn.LayoutOrder = 10 + index
          btn.TextSize = 14
        end
      end
    end
  elseif mode == "Companions" then
    panelTitle.Text = "AI 부족원 · 행동 명령"
    local current = player:GetAttribute("CivCompanionMode") or "Dismissed"
    local status = civLabel(civList, "CompanionStatus", "현재 상태: " .. tostring(current),
      UDim2.new(1, -9, 0, 42), UDim2.new(), false)
    status.LayoutOrder = 0
    local commands = {
      {"Summon", "부족원 소환 · 나를 따라와"},
      {"Follow", "따라오기 · 플레이어 추적"},
      {"Attack", "전투 지원 · 가까운 몬스터 공격"},
      {"Gather", "목재 채집 · 주변 나무에서 보조"},
      {"Guard", "현재 위치 경계 · 주변 적 방어"},
      {"Dismiss", "부족원 해산"},
    }
    for index, item in ipairs(commands) do
      local button = civButton(civList, "Companion" .. item[1], item[2],
        UDim2.new(1, -9, 0, 60), UDim2.new(), function()
          remote:FireServer("CivCompanion", item[1])
          civPanel.Visible = false
        end)
      button.LayoutOrder = index
      button.TextSize = 14
    end
  elseif mode == "Trade" then
    panelTitle.Text = "24문명 무역 · 서버 실시간 시세"
    local silver = player:GetAttribute("CivSilver") or 0
    local gold = player:GetAttribute("CivGold") or 0
    local balances = civLabel(civList, "TradeBalances",
      string.format("은화 %d · 골드 %d | 결제 %s", silver, gold,
        tradeCurrency == "Silver" and "은화" or "골드"),
      UDim2.new(1, -9, 0, 44), UDim2.new(), true)
    balances.LayoutOrder = 0
    local toggle = civButton(civList, "TradeCurrency",
      tradeCurrency == "Silver" and "결제: 은화 → 골드로 변경" or "결제: 골드 → 은화로 변경",
      UDim2.new(1, -9, 0, 44), UDim2.new(), function()
        tradeCurrency = tradeCurrency == "Silver" and "Gold" or "Silver"
        civPanel.Visible = false
        civOpen("Trade")
      end)
    toggle.LayoutOrder = 1
    for index, itemID in ipairs(TradeMarketData.ItemIDs()) do
      local item = TradeMarketData.GetItem(itemID)
      if item then
        local price = marketSnapshot[itemID] or {}
        local buySilver = price.SilverBuy or item.BasePrice
        local sellSilver = price.SilverSell or math.floor(item.BasePrice * 0.9)
        local buy = tradeCurrency == "Gold" and math.ceil(buySilver / 10) or buySilver
        local sell = tradeCurrency == "Gold" and math.floor(sellSilver / 10) or sellSilver
        local currencyLabel = tradeCurrency == "Silver" and "은화" or "골드"
        local row = civLabel(civList, "MarketItem" .. itemID,
          string.format("%s · 보유 %d · 재고 %d\\n매입 %d%s / 판매 %d%s (1개)",
            item.Label, player:GetAttribute(item.ItemField) or 0, price.Supply or item.InitialSupply,
            buy, currencyLabel, sell, currencyLabel),
          UDim2.new(1, -9, 0, 60), UDim2.new(), true)
        row.LayoutOrder = index * 10
        local selectedItem = itemID
        local buyOne = civButton(civList, "TradeBuy" .. itemID,
          "1개 매입", UDim2.new(1, -9, 0, 36), UDim2.new(), function()
            tradeRequestRemote:FireServer(selectedItem, 1, true, tradeCurrency)
          end)
        buyOne.LayoutOrder = index * 10 + 1
        local buyFive = civButton(civList, "TradeBuyFive" .. itemID,
          "5개 매입", UDim2.new(1, -9, 0, 36), UDim2.new(), function()
            tradeRequestRemote:FireServer(selectedItem, 5, true, tradeCurrency)
          end)
        buyFive.LayoutOrder = index * 10 + 2
        local sellOne = civButton(civList, "TradeSell" .. itemID,
          "1개 판매", UDim2.new(1, -9, 0, 36), UDim2.new(), function()
            tradeRequestRemote:FireServer(selectedItem, 1, false, tradeCurrency)
          end)
        sellOne.LayoutOrder = index * 10 + 3
      end
    end
    local buyGold = civButton(civList, "ExchangeToGold",
      "환전: 은화 11 → 골드 1", UDim2.new(1, -9, 0, 44), UDim2.new(), function()
        tradeRequestRemote:FireServer("Currency", 1, true, "Silver")
      end)
    buyGold.LayoutOrder = 40
    local sellGold = civButton(civList, "ExchangeToSilver",
      "환전: 골드 1 → 은화 9", UDim2.new(1, -9, 0, 44), UDim2.new(), function()
        tradeRequestRemote:FireServer("Currency", 1, false, "Gold")
      end)
    sellGold.LayoutOrder = 41
    local hint = civLabel(civList, "TradeStallRequired",
      "거래는 가까운 문명 무역소 16칸 이내에서만 가능해.",
      UDim2.new(1, -9, 0, 38), UDim2.new(), false)
    hint.LayoutOrder = 42
  elseif mode == "Portals" then
    local unlocked = (player:GetAttribute("CivTech") or 0) >= 72
    panelTitle.Text = unlocked and "영웅 시대 · 24개 차원 포털" or "차원 포털 · 최종 연구 72 필요"
    for id = 1, 24 do
      local race = RaceData.GetRace(id)
      local destination = id
      local btn = civButton(civList, "Multiverse" .. id,
        string.format("%02d. %s · %s%s", id, race.Name, race.Landmark,
          unlocked and "" or " [잠김]"),
        UDim2.new(1, -9, 0, 52), UDim2.new(), function()
          if (player:GetAttribute("CivTech") or 0) < 72 then
            civMessage.Text = "72번 최종 연구를 해금한 뒤 이동할 수 있어."
          else
            portalTeleportEvent:FireServer(destination)
            civMessage.Text = "전용 차원 서버 이동 요청 중..."
          end
        end)
      btn.LayoutOrder = id
      btn.TextSize = 13
      if not unlocked then btn.BackgroundColor3 = Color3.fromRGB(85, 86, 84) end
    end
  else
    panelTitle.Text = "파피루스 테크트리 · 72개"
    local techCount = player:GetAttribute("CivTech") or 0
    local unlocked = civLabel(civList, "Unlocked", "연구 완료 " .. techCount .. "/72",
      UDim2.new(1, -9, 0, 36), UDim2.new(), false)
    unlocked.LayoutOrder = 0
    unlocked.TextColor3 = Color3.fromRGB(107, 74, 47)
    -- 연구는 서버의 기존 선형 순서를 유지하고, 화면에서만 시대별로 묶는다.
    for era = 1, 5 do
      local selectedEra = era
      local total, completed = 0, 0
      for _, node in ipairs(TechTreeData.All()) do
        if node.Era == selectedEra then
          total += 1
          if node.TechID <= techCount then completed += 1 end
        end
      end
      local eraButton = civButton(civList, "TechEra" .. era,
        string.format("%s · %d/%d", TechTreeData.EraName(era), completed, total),
        UDim2.new(1, -9, 0, 44), UDim2.new(), function()
          civTechEra = selectedEra
          civPanel.Visible = false
          civOpen("Techs")
        end)
      eraButton.LayoutOrder = era
      eraButton.TextSize = 14
      if selectedEra == civTechEra then
        eraButton.BackgroundColor3 = Color3.fromRGB(232, 163, 61)
        eraButton.TextColor3 = Color3.fromRGB(62, 47, 34)
      end
    end
    -- 5개 시대 배너: 기존 연구 순서는 유지하며 시각적 테마만 표시한다.
    local eraScenes = {
      "룬 바위 · 신비의 불꽃 · 원시 오두막",
      "뗀석기 · 모닥불 · 가죽 천막",
      "청동 제련로 · 청동검과 방패 · 범선",
      "고로 · 투석기 · 철갑 기사",
      "황금 랜드마크 · 수호자 · 멀티버스 포털",
    }
    local eraColors = {
      Color3.fromRGB(95, 110, 60),
      Color3.fromRGB(93, 101, 106),
      Color3.fromRGB(44, 74, 110),
      Color3.fromRGB(78, 81, 86),
      Color3.fromRGB(232, 163, 61),
    }
    local eraBanner = civLabel(civList, "CurrentEraBanner",
      TechTreeData.EraName(civTechEra) .. "\n" .. eraScenes[civTechEra],
      UDim2.new(1, -9, 0, 70), UDim2.new(), true)
    eraBanner.LayoutOrder = 6
    eraBanner.TextSize = 15
    eraBanner.BackgroundColor3 = eraColors[civTechEra]
    eraBanner.BackgroundTransparency = 0
    eraBanner.TextColor3 = civTechEra == 5 and Color3.fromRGB(62, 47, 34) or Color3.fromRGB(232, 213, 168)
    local bannerCorner = Instance.new("UICorner")
    bannerCorner.CornerRadius = UDim.new(0, 8)
    bannerCorner.Parent = eraBanner
    for _, tech in ipairs(TechTreeData.All()) do
      if tech.Era == civTechEra then
        local id = tech.TechID
        local items = {}
        local missing = false
        local eureka = (player:GetAttribute(tech.EurekaMetric) or 0) >= tech.EurekaCount
        local factor = eureka and 0.5 or 1
        local race = RaceData.GetRace(selected)
        if race and race.PassiveType == "Research" then factor *= 0.85 end
        if race and race.PassiveType == "MythDiscount" and tech.Era == 1 then factor *= 0.8 end
        if race and race.PassiveType == "AgeDiscount" and (id == 15 or id == 29 or id == 45 or id == 61) then factor *= 0.85 end
        for _, resource in ipairs({"Wood", "Stone", "Bronze", "Iron", "Research"}) do
          local price = tech.RequiredResources[resource]
          if price then
            local cost = math.ceil(price * factor)
            table.insert(items, resource .. " " .. cost)
            if (player:GetAttribute("Civ" .. resource) or 0) < cost then missing = true end
          end
        end
        local complete = id <= techCount
        local label = string.format("#%02d %s · %s\n%s\n유레카: %s %s",
          id, tech.Name, TechTreeData.EraName(tech.Era),
          table.concat(items, " / "), tech.EurekaCondition, eureka and "✓" or "미달성")
        local button = civButton(civList, "Tech" .. id, label, UDim2.new(1, -9, 0, 88), UDim2.new(),
          function()
            if id == (player:GetAttribute("CivTech") or 0) + 1 then
              if researchRequestPending then return end
              researchRequestPending = true
              local pendingNode = civList:FindFirstChild("Tech" .. id)
              local previousNodeColor = pendingNode and pendingNode.BackgroundColor3
              if pendingNode and pendingNode:IsA("TextButton") then
                pendingNode.BackgroundColor3 = Color3.fromRGB(232, 163, 61)
                pendingNode.TextColor3 = Color3.fromRGB(107, 74, 47)
              end
              task.spawn(function()
                local ok, success, message = pcall(function()
                  return unlockTechRequest:InvokeServer(id)
                end)
                researchRequestPending = false
                if pendingNode and pendingNode.Parent then
                  pendingNode.BackgroundColor3 = (ok and success == true) and Color3.fromRGB(95, 110, 60) or previousNodeColor
                  pendingNode.TextColor3 = Color3.fromRGB(232, 213, 168)
                end
                if not ok then
                  civMessage.Text = "서버 연구 요청에 실패했어. 다시 시도해."
                elseif typeof(success) == "boolean" and typeof(message) == "string" then
                  civMessage.Text = message
                end
              end)
            else civMessage.Text = "선행 기술을 먼저 연구해야 해." end
          end)
        button.LayoutOrder = id + 6
        button.TextSize = 13
        if complete then button.BackgroundColor3 = Color3.fromRGB(95, 110, 60)
        elseif missing or id ~= techCount + 1 then button.BackgroundColor3 = Color3.fromRGB(115, 110, 103)
        else button.BackgroundColor3 = Color3.fromRGB(44, 74, 110) end
      end
    end
  end
end
-- 실제 서버 연구 결과와 본인 인벤토리 복제 이벤트만 UI에 반영한다.
updateTechEvent.OnClientEvent:Connect(function(techID, era)
  if typeof(techID) ~= "number" or not TechTreeData.GetTech(techID) then return end
  if typeof(era) ~= "number" or era < 1 or era > 5 then return end
  if civPanel.Visible and civPanelMode == "Techs" then
    civPanel.Visible = false
    civOpen("Techs")
  end
end)
marketUpdateEvent.OnClientEvent:Connect(function(quotes, openTrade)
  if typeof(quotes) ~= "table" then return end
  marketSnapshot = quotes
  if openTrade == true or (civPanel.Visible and civPanelMode == "Trade") then
    civPanel.Visible = false
    civOpen("Trade")
  end
end)
syncInventoryEvent.OnClientEvent:Connect(function(updatedInventory)
  if typeof(updatedInventory) ~= "table" then return end
  local snapshot = {}
  for key, value in pairs(updatedInventory) do
    if typeof(key) == "string" and key:sub(1, 3) == "Civ"
      and typeof(value) == "number" and value == value then
      snapshot[key] = value
    end
  end
  inventorySnapshot = snapshot
  if civPanel.Visible and civPanelMode == "Inventory" then
    civPanel.Visible = false
    civOpen("Inventory")
  end
end)
-- Touch-only auto-combat toggle: the server owns actual damage and guard timing.
local autoCombatToggle
 autoCombatToggle = civButton(civGui, "AutoCombatToggle", "자동 전투 ON",
  UDim2.fromOffset(104, 45), UDim2.new(1, -112, 0, 94), function()
    autoCombatEnabled = not autoCombatEnabled
    autoCombatToggle.Text = autoCombatEnabled and "자동 전투 ON" or "자동 전투 OFF"
    if player:GetAttribute("CivReady") == true then
      autoCombatEvent:FireServer("SetEnabled", autoCombatEnabled)
    end
  end)
autoCombatToggle.Visible = nativeTouchEnabled
local function syncAutoCombatSetting()
  if player:GetAttribute("CivReady") == true then
    autoCombatEvent:FireServer("SetEnabled", autoCombatEnabled)
  end
end
player:GetAttributeChangedSignal("CivReady"):Connect(syncAutoCombatSetting)
task.defer(syncAutoCombatSetting)

-- Roblox's built-in mobile joystick remains the primary movement control.
-- World-space lower-center swipe=dodge, double-tap=manual parry; GUI presses are excluded.
local touchStart = {}
local lastTouchTapAt = -1e9
if nativeTouchEnabled then
  UserInputService.TouchStarted:Connect(function(input, processed)
    if processed or civPanel.Visible then return end
    local camera = workspace.CurrentCamera
    if not camera then return end
    local size = camera.ViewportSize
    local at = input.Position
    if at.X < size.X * 0.34 or at.X > size.X * 0.7 or at.Y < size.Y * 0.52 then return end
    touchStart[input] = {Position = at, At = os.clock()}
  end)
  UserInputService.TouchEnded:Connect(function(input, processed)
    local gesture = touchStart[input]
    touchStart[input] = nil
    if not gesture or processed or civPanel.Visible then return end
    if player:GetAttribute("CivReady") ~= true then return end
    local duration = os.clock() - gesture.At
    if duration > 0.5 then return end
    local distance = (Vector2.new(input.Position.X, input.Position.Y)
      - Vector2.new(gesture.Position.X, gesture.Position.Y)).Magnitude
    if distance >= 70 then
      dodgeEvent:FireServer()
    elseif distance <= 25 then
      local now = os.clock()
      if now - lastTouchTapAt <= 0.32 then parryEvent:FireServer() end
      lastTouchTapAt = now
    end
  end)
end

-- Target only server-tagged civilization enemies. No client-side damage or currency mutation.
task.spawn(function()
  while civGui.Parent do
    task.wait(0.4)
    if nativeTouchEnabled and autoCombatEnabled and not civPanel.Visible
      and player:GetAttribute("CivReady") == true and (player:GetAttribute("CivRaceID") or 0) > 0 then
      local character = player.Character
      local rootPart = character and character:FindFirstChild("HumanoidRootPart")
      local humanoid = character and character:FindFirstChildOfClass("Humanoid")
      local civWorldFolder = workspace:FindFirstChild("CivilizationWorlds")
      if rootPart and rootPart:IsA("BasePart") and humanoid and humanoid.Health > 0 and civWorldFolder then
        local nearest = nil
        local shortest = 15.0
        for _, obj in ipairs(civWorldFolder:GetChildren()) do
          if obj:IsA("Model") and obj:GetAttribute("CivilizationEnemy") == true then
            local enemyRoot = obj:FindFirstChild("HumanoidRootPart")
            local enemyHumanoid = obj:FindFirstChildOfClass("Humanoid")
            if enemyRoot and enemyRoot:IsA("BasePart") and enemyHumanoid and enemyHumanoid.Health > 0 then
              local distance = (enemyRoot.Position - rootPart.Position).Magnitude
              if distance < shortest then nearest = obj; shortest = distance end
            end
          end
        end
        if nearest then autoCombatEvent:FireServer("AutoAttack", nearest) end
      end
    end
  end
end)

civButton(civMenuRail, "TradeMenu", "무역",
  UDim2.new(1, -8, 0, 45), UDim2.new(), function()
    civOpen("Trade")
    tradeRequestRemote:FireServer("Snapshot", 0, false, "Silver")
  end)
civButton(civMenuRail, "MultiverseMenu", "차원 포털",
  UDim2.new(1, -8, 0, 45), UDim2.new(), function() civOpen("Portals") end)
civButton(civMenuRail, "InventoryMenu", "가방",
  UDim2.new(1, -8, 0, 45), UDim2.new(), function() civOpen("Inventory") end)
civButton(civMenuRail, "CraftMenu", "제작",
  UDim2.new(1, -8, 0, 45), UDim2.new(), function() civOpen("Crafts") end)
civButton(civMenuRail, "BuildingMenu", "건축",
  UDim2.new(1, -8, 0, 45), UDim2.new(), function() civOpen("Buildings") end)
civButton(civMenuRail, "CompanionMenu", "AI 동료",
  UDim2.new(1, -8, 0, 45), UDim2.new(), function() civOpen("Companions") end)
local civRaceButton = civButton(civMenuRail, "RaceMenu", "문명",
  UDim2.new(1, -8, 0, 45), UDim2.new(), function() civOpen("Races") end)
civButton(civMenuRail, "TechMenu", "연구",
  UDim2.new(1, -8, 0, 45), UDim2.new(), function() civOpen("Techs") end)
civButton(civMenuRail, "Travel", "영지/로비",
  UDim2.new(1, -8, 0, 45), UDim2.new(), function()
    remote:FireServer("CivTravel")
  end)
civButton(civMenuRail, "Legacy", "기존 RPG",
  UDim2.new(1, -8, 0, 45), UDim2.new(), function()
    gui.Enabled = not gui.Enabled
    civPanel.Visible = false
  end)
-- Keep the player's main navigation consistent even when content is created in another order.
for index, name in ipairs({
  "RaceMenu", "TechMenu", "InventoryMenu", "CraftMenu", "BuildingMenu",
  "CompanionMenu", "TradeMenu", "MultiverseMenu", "Travel", "Legacy",
}) do
  local menuItem = civMenuRail:FindFirstChild(name)
  if menuItem and menuItem:IsA("GuiButton") then menuItem.LayoutOrder = index end
end
local actionTweenService = game:GetService("TweenService")
local actionMotionToken = 0
local function civActionMotion(actionId, button)
  actionMotionToken += 1
  local token = actionMotionToken
  local originalColor = button.BackgroundColor3
  local flash = actionId == "CivGuard" and Color3.fromRGB(100, 170, 205)
    or actionId == "CivDodge" and Color3.fromRGB(130, 178, 98)
    or Color3.fromRGB(232, 163, 61)
  actionTweenService:Create(button, TweenInfo.new(0.09, Enum.EasingStyle.Quad),
    {BackgroundColor3 = flash}):Play()
  task.delay(0.16, function()
    if button.Parent then
      actionTweenService:Create(button, TweenInfo.new(0.18, Enum.EasingStyle.Quad),
        {BackgroundColor3 = originalColor}):Play()
    end
  end)
  -- Animate the actual avatar joints without uploading unverified animation asset IDs.
  local character = player.Character
  local humanoid = character and character:FindFirstChildOfClass("Humanoid")
  if humanoid and humanoid.Health > 0 then
    local torso = character:FindFirstChild("UpperTorso") or character:FindFirstChild("Torso")
    local shoulder = torso and (torso:FindFirstChild("RightShoulder") or torso:FindFirstChild("Right Shoulder"))
    local waist = torso and torso:FindFirstChild("Waist")
    local joint = shoulder and shoulder:IsA("Motor6D") and shoulder or nil
    if joint then
      local startC0 = joint.C0
      local swing = actionId == "CivAttack" and CFrame.Angles(math.rad(-75), 0, math.rad(15))
        or actionId == "CivGuard" and CFrame.Angles(math.rad(-48), 0, math.rad(-30))
        or CFrame.Angles(math.rad(25), 0, math.rad(35))
      actionTweenService:Create(joint, TweenInfo.new(0.1, Enum.EasingStyle.Quad),
        {C0 = startC0 * swing}):Play()
      task.delay(0.12, function()
        if token == actionMotionToken and joint.Parent and character == player.Character then
          actionTweenService:Create(joint, TweenInfo.new(0.16, Enum.EasingStyle.Quad),
            {C0 = startC0}):Play()
        end
      end)
    end
    if waist and waist:IsA("Motor6D") then
      local startWaist = waist.C0
      local lean = actionId == "CivDodge" and 25 or actionId == "CivAttack" and -18 or 8
      actionTweenService:Create(waist, TweenInfo.new(0.1),
        {C0 = startWaist * CFrame.Angles(math.rad(lean), 0, 0)}):Play()
      task.delay(0.12, function()
        if token == actionMotionToken and waist.Parent and character == player.Character then
          actionTweenService:Create(waist, TweenInfo.new(0.16), {C0 = startWaist}):Play()
        end
      end)
    end
  end
  local camera = workspace.CurrentCamera
  if not camera then return end
  local baseFov = camera.FieldOfView
  local offset = actionId == "CivDodge" and 7 or actionId == "CivAttack" and 3 or -2
  actionTweenService:Create(camera, TweenInfo.new(0.12, Enum.EasingStyle.Quad, Enum.EasingDirection.Out),
    {FieldOfView = math.clamp(baseFov + offset, 40, 100)}):Play()
  task.delay(0.15, function()
    if token ~= actionMotionToken or workspace.CurrentCamera ~= camera then return end
    actionTweenService:Create(camera, TweenInfo.new(0.2, Enum.EasingStyle.Quad),
      {FieldOfView = baseFov}):Play()
  end)
end
local civButtons = {
  {"Attack", "공격", "CivAttack", 94, 105},
  {"Guard", "패링", "CivGuard", 94, 172},
  {"Dodge", "회피", "CivDodge", 94, 239},
  {"Gather", "채집", "CivGather", 178, 105},
}
for _, entry in ipairs(civButtons) do
  civButton(civGui, entry[1], entry[2], UDim2.fromOffset(78, 60),
    UDim2.new(1, -entry[4], 1, -entry[5]), function()
      if entry[3] ~= "CivGather" then
        local button = civGui:FindFirstChild(entry[1])
        if button and button:IsA("GuiButton") then civActionMotion(entry[3], button) end
      end
      if entry[3] == "CivGuard" then parryEvent:FireServer()
      elseif entry[3] == "CivDodge" then dodgeEvent:FireServer()
      else remote:FireServer(entry[3]) end
    end)
end
local civWatched = {
  "CivRaceID", "CivEra", "CivTech", "CivWood", "CivStone",
  "CivBronze", "CivIron", "CivResearch", "CivKills", "CivParries",
  "CivDodges", "CivGather",
  "CivCopperOre", "CivTinOre", "CivIronOre", "CivCoal",
  "CivHide", "CivCoreCrystal", "CivDarkIron", "CivBronzeIngot", "CivIronIngot",
  "CivStoneSpear", "CivStoneAxe", "CivBronzeSword", "CivIronGreatsword", "CivEquippedWeapon",
  "CivSilver", "CivGold", "CivMarble", "CivGoldOre", "CivSpice",
  "CivBoarKills", "CivBronzeSmelts", "CivIronKnightKills",
  "CivStoneWall", "CivDangunAltar", "CivPyramid", "CivColosseum", "CivDrakkarShipyard",
}
local function civRender()
  local id = player:GetAttribute("CivRaceID") or 0
  local race = RaceData.GetRace(id)
  local era = player:GetAttribute("CivEra") or 1
  local unlocked = player:GetAttribute("CivTech") or 0
  civStatus.Text = string.format("%s · %s · 연구 %d/72\n목재 %d / 석재 %d / 청동 %d / 철 %d / 연구력 %d",
    race and race.Name or "문명 미선택", TechTreeData.EraName(era), unlocked,
    player:GetAttribute("CivWood") or 0, player:GetAttribute("CivStone") or 0,
    player:GetAttribute("CivBronze") or 0, player:GetAttribute("CivIron") or 0,
    player:GetAttribute("CivResearch") or 0)
  civRaceButton.Text = race and race.Name or "문명 선택"
end
for _, name in ipairs(civWatched) do
  player:GetAttributeChangedSignal(name):Connect(function()
    civRender()
    if civPanel.Visible and (civPanelMode == "Techs" or civPanelMode == "Crafts" or civPanelMode == "Buildings" or civPanelMode == "Inventory" or civPanelMode == "Portals" or civPanelMode == "Trade") then
      local currentMode = civPanelMode
      civPanel.Visible = false
      civOpen(currentMode)
    end
  end)
end
civRender()
remote.OnClientEvent:Connect(function(kind, payload)
  if kind == "CIV_MESSAGE" and typeof(payload) == "string" then
    civMessage.TextColor3 = Color3.fromRGB(250, 235, 191)
    civMessage.Text = payload
  elseif kind == "CIV_TELEGRAPH" then
    civMessage.Text = "⚠ 공격 예고! 맞기 직전 패링(F) 또는 회피(Shift)!"
    civMessage.TextColor3 = Color3.fromRGB(255, 129, 97)
  elseif kind == "CIV_PARRY" then
    civMessage.Text = "PERFECT PARRY! STUNNED · 적 2초 기절"
    civMessage.TextColor3 = Color3.fromRGB(255, 228, 118)
    local character = player.Character
    local rootPart = character and character:FindFirstChild("HumanoidRootPart")
    if rootPart and rootPart:IsA("BasePart") then
      local spark = Instance.new("ParticleEmitter")
      spark.Name = "PerfectParrySparks"
      spark.Color = ColorSequence.new(Color3.fromRGB(255, 217, 93))
      spark.LightEmission = 1
      spark.Size = NumberSequence.new(0.45, 0)
      spark.Lifetime = NumberRange.new(0.14, 0.27)
      spark.Speed = NumberRange.new(7, 12)
      spark.Rate = 0
      spark.SpreadAngle = Vector2.new(140, 140)
      spark.Parent = rootPart
      spark:Emit(16)
      game:GetService("Debris"):AddItem(spark, 0.6)
    end
    local camera = workspace.CurrentCamera
    if camera and camera.CameraType ~= Enum.CameraType.Scriptable then
      local formerType = camera.CameraType
      local formerFrame = camera.CFrame
      camera.CameraType = Enum.CameraType.Scriptable
      camera.CFrame = formerFrame * CFrame.new(math.random(-3, 3) / 100, math.random(-3, 3) / 100, 0)
      task.delay(0.05, function()
        if workspace.CurrentCamera == camera then camera.CameraType = formerType end
      end)
    end
  elseif kind == "CIV_HIT" and typeof(payload) == "table" then
    civMessage.TextColor3 = Color3.fromRGB(250, 235, 191)
    civMessage.Text = tostring(payload.Enemy) .. "에게 " .. tostring(payload.Damage) .. " 피해!"
  end
end)
UserInputService.InputBegan:Connect(function(input, consumed)
  if consumed or UserInputService:GetFocusedTextBox() then return end
  if input.KeyCode == Enum.KeyCode.F then parryEvent:FireServer()
  elseif input.KeyCode == Enum.KeyCode.LeftShift then dodgeEvent:FireServer()
  elseif input.KeyCode == Enum.KeyCode.E then remote:FireServer("CivGather")
  elseif input.KeyCode == Enum.KeyCode.T then civOpen("Techs")
  elseif input.KeyCode == Enum.KeyCode.C then civOpen("Companions")
  elseif input.KeyCode == Enum.KeyCode.V then civOpen("Crafts")
  elseif input.KeyCode == Enum.KeyCode.B then civOpen("Buildings")
  elseif input.KeyCode == Enum.KeyCode.I then civOpen("Inventory")
  elseif input.KeyCode == Enum.KeyCode.M then
    civOpen("Trade")
    tradeRequestRemote:FireServer("Snapshot", 0, false, "Silver")
  elseif input.UserInputType == Enum.UserInputType.MouseButton1 and not civPanel.Visible then
    remote:FireServer("CivAttack")
  end
end)
-- 기존 기능은 삭제하지 않고 별도 메뉴를 통해 접근한다.
gui.Enabled = false
local function civShowRaceSelection()
  if player:GetAttribute("CivReady") == true and (player:GetAttribute("CivRaceID") or 0) == 0 and civGui.Parent then
    if not civPanel.Visible then civOpen("Races") end
  end
end
player:GetAttributeChangedSignal("CivReady"):Connect(civShowRaceSelection)
task.defer(civShowRaceSelection)

