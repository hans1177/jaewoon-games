-- 파일명: roblox-games/simple-rpg/client/Game.client.luau
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")
local ContextActionService = game:GetService("ContextActionService")
local player = Players.LocalPlayer
-- 시대별 연출은 각 플레이어 화면에서만 적용한다.
-- 서버 전역 Lighting 시간/날씨는 건드리지 않아 멀티플레이어의 시대 차이를 유지한다.
local eraLighting = game:GetService("Lighting")
local eraColor = eraLighting:FindFirstChild("CivilizationEraColor")
if not eraColor or not eraColor:IsA("ColorCorrectionEffect") then
  eraColor = Instance.new("ColorCorrectionEffect")
  eraColor.Name = "CivilizationEraColor"
  eraColor.Parent = eraLighting
end
local eraThemes = {
  [1] = {TintColor = Color3.fromRGB(223, 205, 239), Saturation = -0.08, Contrast = 0.08},
  [2] = {TintColor = Color3.fromRGB(214, 234, 206), Saturation = 0.04, Contrast = 0.06},
  [3] = {TintColor = Color3.fromRGB(247, 220, 182), Saturation = 0.05, Contrast = 0.08},
  [4] = {TintColor = Color3.fromRGB(211, 213, 225), Saturation = -0.06, Contrast = 0.12},
  [5] = {TintColor = Color3.fromRGB(255, 238, 191), Saturation = 0.09, Contrast = 0.09},
}
local eraVisualTween = nil
local function applyLocalEraTheme()
  local era = math.clamp(math.floor(tonumber(player:GetAttribute("CivEra")) or 1), 1, 5)
  local theme = eraThemes[era]
  if eraVisualTween then eraVisualTween:Cancel() end
  eraVisualTween = game:GetService("TweenService"):Create(
    eraColor, TweenInfo.new(1.2, Enum.EasingStyle.Sine, Enum.EasingDirection.Out), theme)
  eraVisualTween:Play()
end
player:GetAttributeChangedSignal("CivEra"):Connect(applyLocalEraTheme)
task.defer(applyLocalEraTheme)
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
  CHARACTER = "APPLIED_PROCEDURAL",
  CREATURE = "APPLIED_PROCEDURAL",
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

-- Existing Roblox Animator motion blending applies to every playable character.
do
-- Roblox character animation / motion adaptation.
local function syncVerifiedLearningCharacterMotion(character)
  local humanoid = character:FindFirstChildOfClass("Humanoid") or character:WaitForChild("Humanoid", 5)
  if not humanoid then return end
  local animator = humanoid:FindFirstChildOfClass("Animator") or humanoid:WaitForChild("Animator", 5)
  if not animator then return end
  -- 공식 Roblox Knight R15 모션 에셋: 기본 Animate 책임을 그대로 사용한다.
  if humanoid.RigType == Enum.HumanoidRigType.R15 then
    local animate = character:FindFirstChild("Animate") or character:WaitForChild("Animate", 5)
    if animate then
      local motionIds = {
        run = {"RunAnim", 657564596},
        walk = {"WalkAnim", 657552124},
        jump = {"JumpAnim", 658409194},
        fall = {"FallAnim", 657600338},
        climb = {"ClimbAnim", 658360781},
        swim = {"Swim", 657560551},
        swimidle = {"SwimIdle", 657557095},
      }
      for folder, entry in pairs(motionIds) do
        local state = animate:FindFirstChild(folder)
        local clip = state and state:FindFirstChild(entry[1])
        if clip and clip:IsA("Animation") then
          local assetId = "rbxassetid://" .. tostring(entry[2])
          if clip.AnimationId ~= assetId then
            clip.AnimationId = assetId
          end
        end
      end
      local idle = animate:FindFirstChild("idle")
      if idle then
        for index, id in ipairs({657595757, 657568135, 885499184}) do
          local clip = idle:FindFirstChild("Animation" .. index)
          if clip and clip:IsA("Animation") then
            clip.AnimationId = "rbxassetid://" .. tostring(id)
          end
        end
      end
    end
  end
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
  -- 원본 로블록스 에셋 지면/목재 텍스처를 문명 HUD 장식으로 재사용한다.
  if background then
    local parchment = Instance.new("ImageLabel")
    parchment.Name = "ParchmentAssetSurface"
    parchment.BackgroundTransparency = 1
    parchment.Size = UDim2.fromScale(1, 1)
    parchment.Image = "rbxassetid://128886287832599"
    parchment.ImageColor3 = Color3.fromRGB(235, 213, 170)
    parchment.ImageTransparency = 0.78
    parchment.ScaleType = Enum.ScaleType.Crop
    parchment.ZIndex = label.ZIndex
    parchment.Parent = label
    local edges = Instance.new("UICorner")
    edges.CornerRadius = UDim.new(0, 7)
    edges.Parent = parchment
  end
  return label
end
local function civButton(parent, name, text, size, pos, callback)
  local button = Instance.new("TextButton")
  button.Name = name
  button.Size = size
  button.Position = pos
  button.BackgroundColor3 = Color3.fromRGB(113, 75, 47)
  button.TextColor3 = Color3.fromRGB(250, 231, 185)
  button.TextWrapped = true
  button.TextSize = 14
  button.Font = Enum.Font.GothamBold
  button.BorderSizePixel = 0
  button.Text = text
  button.AutoButtonColor = true
  button.ZIndex = (parent:IsA("ScreenGui") or parent.Name == "CivilizationMenu") and 5 or 12
  button.Parent = parent
  local corner = Instance.new("UICorner")
  corner.CornerRadius = UDim.new(0, 7)
  corner.Parent = button
  local shading = Instance.new("UIGradient")
  shading.Rotation = 90
  shading.Color = ColorSequence.new(Color3.fromRGB(153, 106, 64), Color3.fromRGB(84, 53, 35))
  shading.Parent = button
  local grain = Instance.new("ImageLabel")
  grain.Name = "WoodAssetGrain"
  grain.BackgroundTransparency = 1
  grain.Size = UDim2.fromScale(1, 1)
  grain.Image = "rbxassetid://124882110895040"
  grain.ImageTransparency = 0.78
  grain.ImageColor3 = Color3.fromRGB(222, 185, 129)
  grain.ScaleType = Enum.ScaleType.Crop
  grain.ZIndex = button.ZIndex
  grain.Parent = button
  local grainCorner = Instance.new("UICorner")
  grainCorner.CornerRadius = UDim.new(0, 7)
  grainCorner.Parent = grain
  local woodBorder = Instance.new("UIStroke")
  woodBorder.Name = "OakBorder"
  woodBorder.Color = Color3.fromRGB(198, 151, 86)
  woodBorder.Thickness = 1.5
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
civMessage.BackgroundColor3 = Color3.fromRGB(43, 34, 26)
-- Fantasy HUD: compact centered sign and parchment resource board.
civTitle.AnchorPoint = Vector2.new(0.5, 0)
civTitle.Position = UDim2.new(0.5, 0, 0, 4)
civTitle.Size = UDim2.new(0.42, 0, 0, 28)
civTitle.BackgroundColor3 = Color3.fromRGB(55, 37, 26)
civTitle.TextColor3 = Color3.fromRGB(232, 213, 168)
civTitle.TextSize = 18
civStatus.AnchorPoint = Vector2.new(0.5, 0)
civStatus.Position = UDim2.new(0.5, 0, 0, 35)
civStatus.Size = UDim2.new(0.62, 0, 0, 31)
civStatus.BackgroundColor3 = Color3.fromRGB(232, 213, 168)
civStatus.TextWrapped = true
civStatus.TextSize = 11
civStatus.TextColor3 = Color3.fromRGB(66, 44, 30)
civMessage.AnchorPoint = Vector2.new(0.5, 0)
civMessage.Position = UDim2.new(0.5, 0, 0, 70)
civMessage.Size = UDim2.new(0.48, 0, 0, 24)
civMessage.Visible = false
civMessage.TextSize = 13
for _, panel in ipairs({civTitle, civStatus, civMessage}) do
  local corner = Instance.new("UICorner")
  corner.CornerRadius = UDim.new(0, 5)
  corner.Parent = panel
  local border = Instance.new("UIStroke")
  border.Color = Color3.fromRGB(184, 135, 70)
  border.Thickness = 2
  border.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
  border.Parent = panel
end
-- 모바일 화면에서는 제목·자원·전투 알림을 작은 좌측 카드로 쌓아 시야를 확보한다.
if nativeTouchEnabled then
  civTitle.AnchorPoint = Vector2.new(0, 0)
  civTitle.Position = UDim2.fromOffset(8, 8)
  civTitle.Size = UDim2.fromOffset(170, 24)
  civTitle.TextSize = 16
  civTitle.TextColor3 = Color3.fromRGB(255, 242, 202)
  civStatus.AnchorPoint = Vector2.new(0, 0)
  civStatus.Position = UDim2.fromOffset(8, 36)
  civStatus.Size = UDim2.fromOffset(235, 34)
  civStatus.TextSize = 12
  civMessage.AnchorPoint = Vector2.new(0, 0)
  civMessage.Position = UDim2.fromOffset(8, 74)
  civMessage.Size = UDim2.fromOffset(235, 26)
  civMessage.TextSize = 11
end
-- Compact era and raid readout; not an interactive right-side control.
local eraReadout = civLabel(civGui, "CurrentEraReadout", "신화 시대",
  UDim2.fromOffset(118, 25), UDim2.fromOffset(8, 6), true)
eraReadout.TextSize = 12
if nativeTouchEnabled then
  eraReadout.Position = UDim2.fromOffset(8, 103)
  eraReadout.Size = UDim2.fromOffset(110, 22)
  eraReadout.TextSize = 11
end
eraReadout.BackgroundColor3 = Color3.fromRGB(58, 44, 59)
local bossReadout = civLabel(civGui, "RaidBossPhase", "",
  UDim2.new(0.5, 0, 0, 28), UDim2.new(0.5, 0, 0, 108), true)
bossReadout.AnchorPoint = Vector2.new(0.5, 0)
bossReadout.BackgroundColor3 = Color3.fromRGB(66, 39, 43)
bossReadout.TextSize = 12
bossReadout.Visible = false
if nativeTouchEnabled then
  bossReadout.AnchorPoint = Vector2.new(0, 0)
  bossReadout.Position = UDim2.fromOffset(8, 129)
  bossReadout.Size = UDim2.fromOffset(235, 25)
end
local eraNames = {"신화 시대", "석기 시대", "청동기 시대", "철기 시대", "영웅 시대"}
local function refreshEraReadout()
  local era = player:GetAttribute("CivEra")
  if typeof(era) ~= "number" or era % 1 ~= 0 or not eraNames[era] then era = 1 end
  eraReadout.Text = eraNames[era]
end
player:GetAttributeChangedSignal("CivEra"):Connect(refreshEraReadout)
refreshEraReadout()
task.spawn(function()
  while civGui.Parent do
    task.wait(0.6)
    local character = player.Character
    local root = character and character:FindFirstChild("HumanoidRootPart")
    local folder = workspace:FindFirstChild("CivilizationWorlds")
    local closest, distance = nil, 60
    if root and folder then
      for _, enemy in ipairs(folder:GetChildren()) do
        if enemy:IsA("Model") and enemy:GetAttribute("IsRaidBoss") == true then
          local part = enemy:FindFirstChild("HumanoidRootPart")
          local humanoid = enemy:FindFirstChildOfClass("Humanoid")
          if part and humanoid and humanoid.Health > 0 then
            local d = (part.Position - root.Position).Magnitude
            if d < distance then closest, distance = enemy, d end
          end
        end
      end
    end
    bossReadout.Visible = closest ~= nil
    if closest then
      local phase = closest:GetAttribute("BossPhase")
      local index = phase == "Phase3" and 3 or phase == "Phase2" and 2 or 1
      bossReadout.Text = closest.Name .. " · 페이즈 " .. index
    end
  end
end)
local civPanel = Instance.new("Frame")
civPanel.Name = "CivilizationPanel"
civPanel.AnchorPoint = Vector2.new(0.5, 0.5)
civPanel.Position = UDim2.new(0.5, 0, 0.5, 58)
civPanel.Size = UDim2.new(0.78, 0, 0.76, 0)
civPanel.ClipsDescendants = true
civPanel.BackgroundColor3 = Color3.fromRGB(63, 43, 30)
civPanel.BackgroundTransparency = 0.04
civPanel.ZIndex = 10
civPanel.BorderSizePixel = 0
civPanel.Visible = false
civPanel.Parent = civGui
-- 공용 패널 아톰의 기존 UI 책임을 유지하며 실제 목재 에셋으로 메뉴 표면을 구성한다.
local panelSurface = Instance.new("ImageLabel")
panelSurface.Name = "CivilizationAssetPanelSurface"
panelSurface.Size = UDim2.fromScale(1, 1)
panelSurface.BackgroundTransparency = 1
panelSurface.Image = "rbxassetid://124882110895040"
panelSurface.ImageColor3 = Color3.fromRGB(167, 124, 83)
panelSurface.ImageTransparency = 0.42
panelSurface.ScaleType = Enum.ScaleType.Crop
panelSurface.ZIndex = civPanel.ZIndex
panelSurface.Parent = civPanel
local panelSurfaceCorner = Instance.new("UICorner")
panelSurfaceCorner.CornerRadius = UDim.new(0, 12)
panelSurfaceCorner.Parent = panelSurface
local panelCorner = Instance.new("UICorner")
panelCorner.CornerRadius = UDim.new(0, 12)
panelCorner.Parent = civPanel
local panelBorder = Instance.new("UIStroke")
panelBorder.Name = "CivilizationFrameBorder"
panelBorder.Color = Color3.fromRGB(203, 159, 90)
panelBorder.Thickness = 2
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
civMenuRail.Position = UDim2.fromOffset(10, nativeTouchEnabled and 204 or 150)
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
-- 전투 중 시야를 가리지 않도록 메뉴는 기본 접힘으로 시작한다.
local civMenuToggle = civButton(civGui, "CivilizationMenuToggle", "☰ 메뉴",
  UDim2.fromOffset(100, 44), UDim2.fromOffset(10, nativeTouchEnabled and 164 or 110), function()
    civMenuRail.Visible = not civMenuRail.Visible
  end)
civMenuRail.Visible = false
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
  local railTop = nativeTouchEnabled and 204 or 150
  local availableHeight = math.max(0, viewport.Y - railTop - reservedBottom)
  -- 메뉴 높이가 바뀌어도 이전 스크롤 위치가 범위를 벗어나지 않도록 보정한다.
  local menuHeight = math.floor(math.min(440, availableHeight))
  local maxScroll = math.max(0, civMenuRail.AbsoluteCanvasSize.Y - menuHeight)
  if civMenuRail.CanvasPosition.Y > maxScroll then
    civMenuRail.CanvasPosition = Vector2.new(0, maxScroll)
  end
  civMenuRail.Size = UDim2.fromOffset(
    math.floor(math.min(100, math.max(72, viewport.X * 0.17))),
    menuHeight
  )
  -- Keep the central parchment window inside the screen and outside the left menu.
  local railRight = civMenuRail.Visible and (civMenuRail.Position.X.Offset + civMenuRail.Size.X.Offset) or 0
  local panelLeft = railRight + 10
  local panelWidth = math.max(1, math.floor(viewport.X - panelLeft - 12))
  local panelTop = math.min(108, math.floor(viewport.Y * 0.23))
  local panelHeight = math.max(1, math.floor(viewport.Y - panelTop - 12))
  civPanel.AnchorPoint = Vector2.new(0, 0)
  civPanel.Size = UDim2.fromOffset(panelWidth, panelHeight)
  civPanel.Position = UDim2.fromOffset(panelLeft, panelTop)
end
civMenuToggle.Activated:Connect(resizeCivMenuRail)
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
      -- 32칸 슬롯은 기존 목재 이미지 에셋을 바탕으로 금속 테두리와 자원 표식을 더한다.
      local inset = Instance.new("UIStroke")
      inset.Name = "InventoryMetalInlay"
      inset.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
      inset.Color = amount > 0 and Color3.fromRGB(241, 204, 131) or Color3.fromRGB(122, 103, 82)
      inset.Thickness = 1
      inset.Transparency = 0.34
      inset.Parent = label
      local grain = label:FindFirstChild("ParchmentAssetSurface")
      if grain and grain:IsA("ImageLabel") then
        grain.Image = "rbxassetid://124882110895040"
        grain.ImageColor3 = Color3.fromRGB(192, 149, 101)
        grain.ImageTransparency = amount > 0 and 0.78 or 0.86
      end
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
      local equipmentGrain = preview:FindFirstChild("ParchmentAssetSurface")
      if equipmentGrain and equipmentGrain:IsA("ImageLabel") then
        equipmentGrain.Image = "rbxassetid://124882110895040"
        equipmentGrain.ImageColor3 = gear[3] and Color3.fromRGB(204, 184, 126) or Color3.fromRGB(164, 150, 131)
        equipmentGrain.ImageTransparency = 0.80
      end
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
  elseif mode == "Regions" then
    panelTitle.Text = "모험 시작"
    local adventure = civButton(civList, "StartAdventure", "모험 시작",
      UDim2.new(1, -9, 0, 52), UDim2.new(), function()
        if (player:GetAttribute("CivRaceID") or 0) <= 0 then
          civMessage.Text = "게임 데이터를 불러오는 중이야."
          civMessage.Visible = true
          return
        end
        remote:FireServer("CivTravel", player:GetAttribute("CivRaceID"))
        civPanel.Visible = false
        civMenuRail.Visible = false
      end)
    adventure.LayoutOrder = 1
    local lobby = civButton(civList, "ReturnToLobby", "중앙 로비로 이동",
      UDim2.new(1, -9, 0, 48), UDim2.new(), function()
        remote:FireServer("CivTravel", "Lobby")
        civPanel.Visible = false
        civMenuRail.Visible = false
      end)
    lobby.LayoutOrder = 2
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
        local ageEureka = (id == 15 and (player:GetAttribute("CivBoarKills") or 0) >= 1)
          or (id == 29 and (player:GetAttribute("CivBronzeSmelts") or 0) >= 5)
          or (id == 45 and (player:GetAttribute("CivIronKnightKills") or 0) >= 1)
        local factor = (eureka or ageEureka) and 0.5 or 1
        local race = RaceData.GetRace(selected)
        if race and race.ID == 15 and (player:GetAttribute("CivDangunAltar") or 0) >= 1 then factor *= 0.85 end
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
          table.concat(items, " / "), tech.EurekaCondition, (eureka or ageEureka) and "✓" or "미달성")
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
updateTechEvent.OnClientEvent:Connect(function(techID, era, eurekaDiscountApplied)
  if typeof(techID) ~= "number" or not TechTreeData.GetTech(techID) then return end
  if typeof(era) ~= "number" or era < 1 or era > 5 then return end
  if eurekaDiscountApplied == true then
    local originalColor = civMessage.BackgroundColor3
    civMessage.Text = "✦ 유레카! 연구 비용 할인 적용 ✦"
    civMessage.BackgroundColor3 = Color3.fromRGB(180, 125, 42)
    local glow = Instance.new("UIStroke")
    glow.Name = "ResearchEurekaGlow"
    glow.Color = Color3.fromRGB(255, 222, 122)
    glow.Thickness = 3
    glow.Parent = civMessage
    task.delay(1.6, function()
      if glow.Parent then glow:Destroy() end
      if civMessage.Parent then civMessage.BackgroundColor3 = originalColor end
    end)
  end
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
-- Mobile auto-combat keeps its existing server setting without a right-side HUD button.
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
civButton(civMenuRail, "RegionMapMenu", "모험 이동",
  UDim2.new(1, -8, 0, 45), UDim2.new(), function() civOpen("Regions") end)
civButton(civMenuRail, "InventoryMenu", "가방",
  UDim2.new(1, -8, 0, 45), UDim2.new(), function() civOpen("Inventory") end)
civButton(civMenuRail, "CraftMenu", "제작",
  UDim2.new(1, -8, 0, 45), UDim2.new(), function() civOpen("Crafts") end)
civButton(civMenuRail, "BuildingMenu", "건축",
  UDim2.new(1, -8, 0, 45), UDim2.new(), function() civOpen("Buildings") end)
civButton(civMenuRail, "CompanionMenu", "AI 동료",
  UDim2.new(1, -8, 0, 45), UDim2.new(), function() civOpen("Companions") end)
civButton(civMenuRail, "TechMenu", "연구",
  UDim2.new(1, -8, 0, 45), UDim2.new(), function() civOpen("Techs") end)
civButton(civMenuRail, "Travel", "로비 복귀",
  UDim2.new(1, -8, 0, 45), UDim2.new(), function()
    civPanel.Visible = false
    civMenuRail.Visible = false
    remote:FireServer("CivTravel", "Lobby")
  end)
civButton(civMenuRail, "Legacy", "기존 RPG",
  UDim2.new(1, -8, 0, 45), UDim2.new(), function()
    gui.Enabled = not gui.Enabled
    civPanel.Visible = false
  end)
-- Keep the player's main navigation consistent even when content is created in another order.
for index, name in ipairs({
  "TechMenu", "InventoryMenu", "CraftMenu", "BuildingMenu",
  "CompanionMenu", "TradeMenu", "RegionMapMenu", "Travel", "Legacy",
}) do
  local menuItem = civMenuRail:FindFirstChild(name)
  if menuItem and menuItem:IsA("GuiButton") then menuItem.LayoutOrder = index end
end
local actionTweenService = game:GetService("TweenService")
local commonMotion = require(Shared:WaitForChild("CommonMotion"))
local studioMotionPreviewEnabled = game:GetService("RunService"):IsStudio()
local actionMotionToken = 0
-- 연속 입력 중 이전 동작의 임시 관절 각도가 다음 동작의 기준으로 누적되지 않게 한다.
local actionJointBases = setmetatable({}, {__mode = "k"})
local actionJointTweens = setmetatable({}, {__mode = "k"})
local actionCameraTweens = setmetatable({}, {__mode = "k"})
local actionCameraBases = setmetatable({}, {__mode = "k"})
local actionButtonEffects = setmetatable({}, {__mode = "k"})
local attackCombo = 0
local lastAttackMotionAt = 0
local function civActionMotion(actionId, button)
  local now = os.clock()
  if actionId == "CivAttack" then
    attackCombo = now - lastAttackMotionAt <= 0.9 and (attackCombo % 3 + 1) or 1
    lastAttackMotionAt = now
  end
  actionMotionToken += 1
  local token = actionMotionToken
  if button then
    local state = actionButtonEffects[button]
    if not state then
      state = {baseColor = button.BackgroundColor3, generation = 0}
      actionButtonEffects[button] = state
    end
    state.generation += 1
    local generation = state.generation
    if state.tween then state.tween:Cancel() end
    local flash = actionId == "CivGuard" and Color3.fromRGB(100, 170, 205)
      or actionId == "CivDodge" and Color3.fromRGB(130, 178, 98)
      or Color3.fromRGB(232, 163, 61)
    state.tween = actionTweenService:Create(button, TweenInfo.new(0.09, Enum.EasingStyle.Quad),
      {BackgroundColor3 = flash})
    state.tween:Play()
    task.delay(0.16, function()
      if button.Parent and state.generation == generation then
        if state.tween then state.tween:Cancel() end
        state.tween = actionTweenService:Create(button, TweenInfo.new(0.18, Enum.EasingStyle.Quad),
          {BackgroundColor3 = state.baseColor})
        state.tween:Play()
      end
    end)
  end
  -- Animate the actual avatar joints without uploading unverified animation asset IDs.
  local character = player.Character
  local humanoid = character and character:FindFirstChildOfClass("Humanoid")
  if humanoid and humanoid.Health > 0 then
    -- 공용 원본 모션은 Studio 임시 미리보기로만 사용한다. 게시 버전은 기존 모션을 유지한다.
    if studioMotionPreviewEnabled and humanoid.RigType == Enum.HumanoidRigType.R15 then
      local animator = humanoid:FindFirstChildOfClass("Animator")
      if animator then
        local atom = actionId == "CivAttack" and (attackCombo == 3 and "HEAVY_ATTACK_1" or "LIGHT_ATTACK_1")
          or actionId == "CivGuard" and "PARRY_PERFECT"
          or actionId == "CivDodge" and "DODGE_RIGHT"
          or nil
        if atom then
          local ok, track, animation, sequence = pcall(commonMotion.PlayPreview, animator, atom, {fadeTime = 0.08})
          if ok then
            local motion = commonMotion.Describe(atom)
            task.delay(motion.duration + 0.2, function()
              if track then track:Stop(0.12); track:Destroy() end
              if animation then animation:Destroy() end
              if sequence then sequence:Destroy() end
            end)
          end
        end
      end
    end
    local torso = character:FindFirstChild("UpperTorso") or character:FindFirstChild("Torso")
    local shoulder = torso and (torso:FindFirstChild("RightShoulder") or torso:FindFirstChild("Right Shoulder"))
    local waist = torso and torso:FindFirstChild("Waist")
    local joint = shoulder and shoulder:IsA("Motor6D") and shoulder or nil
    if joint then
      local previousJointTween = actionJointTweens[joint]
      if previousJointTween then previousJointTween:Cancel() end
      local startC0 = actionJointBases[joint] or joint.C0
      actionJointBases[joint] = startC0
      local swing = actionId == "CivAttack" and CFrame.Angles(math.rad(attackCombo == 3 and -145 or -105), math.rad(attackCombo == 2 and -46 or 24), math.rad(attackCombo == 2 and -52 or 28))
        or actionId == "CivGuard" and CFrame.Angles(math.rad(-48), 0, math.rad(-30))
        or CFrame.Angles(math.rad(25), 0, math.rad(35))
      if actionId == "CivAttack" then
        -- 준비 자세를 짧게 거쳐 내려베기로 연결한다. 판정·피해량은 서버가 담당한다.
        joint.C0 = startC0 * CFrame.Angles(math.rad(attackCombo == 3 and 60 or 42), math.rad(attackCombo == 2 and 35 or -28), math.rad(attackCombo == 2 and -22 or 22))
        local swingTween = actionTweenService:Create(joint, TweenInfo.new(attackCombo == 3 and 0.18 or 0.11, Enum.EasingStyle.Quart, Enum.EasingDirection.Out),
          {C0 = startC0 * swing * CFrame.Angles(0, math.rad(40), 0)})
        actionJointTweens[joint] = swingTween
        swingTween:Play()
        local hand = character:FindFirstChild("RightHand") or character:FindFirstChild("Right Arm")
        if hand and hand:IsA("BasePart") then
          local low = Instance.new("Attachment")
          low.Position = Vector3.new(0, -hand.Size.Y * 0.4, 0)
          low.Parent = hand
          local high = Instance.new("Attachment")
          high.Position = Vector3.new(0, hand.Size.Y * 0.5, 0)
          high.Parent = hand
          local trail = Instance.new("Trail")
          trail.Attachment0 = low
          trail.Attachment1 = high
          -- 콤보 1·2타와 강한 3타의 궤적을 구별한다.
          trail.Color = attackCombo == 3
            and ColorSequence.new(Color3.fromRGB(255, 247, 199), Color3.fromRGB(255, 112, 42))
            or attackCombo == 2
              and ColorSequence.new(Color3.fromRGB(175, 223, 255), Color3.fromRGB(92, 157, 255))
              or ColorSequence.new(Color3.fromRGB(255, 228, 165), Color3.fromRGB(231, 154, 62))
          trail.Transparency = NumberSequence.new(0.2, 1)
          trail.Lifetime = attackCombo == 3 and 0.24 or 0.17
          trail.WidthScale = NumberSequence.new({
            NumberSequenceKeypoint.new(0, 0.2),
            NumberSequenceKeypoint.new(0.3, attackCombo == 3 and 1.7 or 1.25),
            NumberSequenceKeypoint.new(1, 0),
          })
          trail.LightEmission = 0.85
          trail.Parent = hand
          task.delay(attackCombo == 3 and 0.28 or 0.20, function()
            trail.Enabled = false
            task.delay(0.2, function()
              trail:Destroy()
              low:Destroy()
              high:Destroy()
            end)
          end)
        end
      else
        local guardTween = actionTweenService:Create(joint, TweenInfo.new(0.1, Enum.EasingStyle.Quad),
          {C0 = startC0 * swing})
        actionJointTweens[joint] = guardTween
        guardTween:Play()
      end
      task.delay(actionId == "CivAttack" and (attackCombo == 3 and 0.24 or 0.17) or 0.15, function()
        if token == actionMotionToken and joint.Parent and character == player.Character then
          local restoreTween = actionTweenService:Create(joint, TweenInfo.new(0.16, Enum.EasingStyle.Quad),
            {C0 = startC0})
          actionJointTweens[joint] = restoreTween
          restoreTween.Completed:Connect(function()
            if actionJointTweens[joint] == restoreTween then
              actionJointTweens[joint] = nil
              actionJointBases[joint] = nil
            end
          end)
          restoreTween:Play()
        end
      end)
    end
    -- 짧은 로컬 방어/회피 피드백: 서버 이동·무적·피해 판정에는 영향이 없다.
    if actionId == "CivDodge" or actionId == "CivGuard" then
      local root = character:FindFirstChild("HumanoidRootPart")
      if root and root:IsA("BasePart") then
        local burst = Instance.new("ParticleEmitter")
        burst.Name = "CivActionBurst"
        burst.Enabled = false
        burst.Rate = 0
        burst.Lifetime = NumberRange.new(0.18, 0.32)
        burst.Speed = NumberRange.new(2, 5)
        burst.Drag = 7
        burst.SpreadAngle = Vector2.new(65, 65)
        burst.Size = NumberSequence.new(0.24, 0)
        burst.Transparency = NumberSequence.new(0.2, 1)
        burst.Color = ColorSequence.new(actionId == "CivGuard"
          and Color3.fromRGB(135, 206, 255) or Color3.fromRGB(178, 171, 145))
        burst.LightEmission = actionId == "CivGuard" and 0.7 or 0.15
        burst.Parent = root
        burst:Emit(actionId == "CivGuard" and 8 or 5)
        task.delay(0.45, function()
          burst:Destroy()
        end)
      end
    end
    if waist and waist:IsA("Motor6D") then
      local previousWaistTween = actionJointTweens[waist]
      if previousWaistTween then previousWaistTween:Cancel() end
      local startWaist = actionJointBases[waist] or waist.C0
      actionJointBases[waist] = startWaist
      local lean = actionId == "CivDodge" and 30 or actionId == "CivAttack" and (attackCombo == 3 and -28 or -22) or 12
      local leanTween = actionTweenService:Create(waist, TweenInfo.new(0.1),
        {C0 = startWaist * CFrame.Angles(math.rad(lean), 0, 0)})
      actionJointTweens[waist] = leanTween
      leanTween:Play()
      task.delay(actionId == "CivAttack" and (attackCombo == 3 and 0.23 or 0.15) or 0.12, function()
        if token == actionMotionToken and waist.Parent and character == player.Character then
          local waistRestore = actionTweenService:Create(waist, TweenInfo.new(0.16), {C0 = startWaist})
          actionJointTweens[waist] = waistRestore
          waistRestore.Completed:Connect(function()
            if actionJointTweens[waist] == waistRestore then
              actionJointTweens[waist] = nil
              actionJointBases[waist] = nil
            end
          end)
          waistRestore:Play()
        end
      end)
    end
  end
  local camera = workspace.CurrentCamera
  if not camera then return end
  local priorCameraTween = actionCameraTweens[camera]
  if priorCameraTween then priorCameraTween:Cancel() end
  local baseFov = actionCameraBases[camera] or camera.FieldOfView
  actionCameraBases[camera] = baseFov
  local offset = actionId == "CivDodge" and 7 or actionId == "CivAttack" and (attackCombo == 3 and 5 or 3) or -2
  local cameraPulse = actionTweenService:Create(camera, TweenInfo.new(0.12, Enum.EasingStyle.Quad, Enum.EasingDirection.Out),
    {FieldOfView = math.clamp(baseFov + offset, 40, 100)})
  actionCameraTweens[camera] = cameraPulse
  cameraPulse:Play()
  task.delay(0.15, function()
    if token ~= actionMotionToken or workspace.CurrentCamera ~= camera then return end
    local cameraRestore = actionTweenService:Create(camera, TweenInfo.new(0.2, Enum.EasingStyle.Quad),
      {FieldOfView = baseFov})
    actionCameraTweens[camera] = cameraRestore
    cameraRestore.Completed:Connect(function(state)
      if actionCameraTweens[camera] == cameraRestore then
        actionCameraTweens[camera] = nil
        actionCameraBases[camera] = nil
      end
    end)
    cameraRestore:Play()
  end)
end
-- 동료 및 몬스터의 기존 파츠를 클라이언트에서만 움직인다. 서버 판정과 위치는 그대로 둔다.
local creatureMotionRunService = game:GetService("RunService")
local creatureMotionPhase = 0
local creatureMotionAccumulator = 0
local creatureMotionSearchAt = 0
local creatureMotionModels = {}
local creatureMotionLimbNames = {"Left Arm", "Right Arm", "Left Leg", "Right Leg", "LeftLimb", "RightLimb"}
local creatureMotionLimbBases = setmetatable({}, {__mode = "k"})
local creatureMotionJointChecks = setmetatable({}, {__mode = "k"})
local creatureTelegraphHighlights = setmetatable({}, {__mode = "k"})
local creatureImportedRig = setmetatable({}, {__mode = "k"})
local creatureRootMotion = setmetatable({}, {__mode = "k"})
local creatureMotionLastSearchPosition = nil
local creatureMotionLastSearchCharacter = nil
local creatureMotionLastSearchRoot = nil
local creatureMotionQueryParams = OverlapParams.new()
creatureMotionQueryParams.FilterType = Enum.RaycastFilterType.Exclude
creatureMotionRunService.RenderStepped:Connect(function(dt)
  -- 화면 멈춤이나 앱 전환 뒤의 큰 dt가 모션 시계를 급격히 건너뛰지 않게 한다.
  creatureMotionAccumulator += math.min(dt, 0.1)
  if creatureMotionAccumulator < 1 / 20 then return end
  creatureMotionPhase += creatureMotionAccumulator
  creatureMotionAccumulator = 0
  local character = player.Character
  local viewer = character and character:FindFirstChild("HumanoidRootPart")
  if not viewer then
    -- 부활 중 이전 캐릭터의 몬스터 목록을 남기지 않는다.
    creatureMotionLastSearchCharacter = nil
    creatureMotionLastSearchRoot = nil
    creatureMotionLastSearchPosition = nil
    creatureMotionSearchAt = 0
    table.clear(creatureMotionModels)
    return
  end
  local movedSinceSearch = creatureMotionLastSearchPosition and (viewer.Position - creatureMotionLastSearchPosition).Magnitude > 35
  local characterChanged = creatureMotionLastSearchCharacter ~= character or creatureMotionLastSearchRoot ~= viewer
  if creatureMotionPhase >= creatureMotionSearchAt or movedSinceSearch or characterChanged then
    creatureMotionSearchAt = creatureMotionPhase + 2
    creatureMotionLastSearchPosition = viewer.Position
    creatureMotionLastSearchCharacter = character
    creatureMotionLastSearchRoot = viewer
    table.clear(creatureMotionModels)
    -- 플레이어의 새 캐릭터는 제외하고, 대시/포털 이동 직후 즉시 주변 대상을 갱신한다.
    creatureMotionQueryParams.FilterDescendantsInstances = {character}
    local nearbyParts = workspace:GetPartBoundsInRadius(viewer.Position, 85, creatureMotionQueryParams)
    local seen = {}
    for _, part in ipairs(nearbyParts) do
      -- 몬스터 내부 장비/리그가 별도 Model로 감싸져 있어도 상위 소유 모델을 찾는다.
      local model = part:FindFirstAncestorOfClass("Model")
      while model and model ~= workspace do
        if model:GetAttribute("CivilizationEnemy") == true
          or model:GetAttribute("CompanionOwnerUserId") ~= nil then
          if not seen[model] then
            seen[model] = true
            table.insert(creatureMotionModels, model)
          end
          break
        end
        local parent = model.Parent
        model = parent and (parent:IsA("Model") and parent or parent:FindFirstAncestorOfClass("Model"))
      end
    end
    -- 검색 갱신 때만 가까운 모델 순서로 정렬한다.
    -- 가까운 모델부터 처리해 30마리 제한에 걸려도 먼 몬스터가 먼저 선택되지 않는다.
    local creatureDistanceSq = {}
    for _, model in ipairs(creatureMotionModels) do
      local root = model.PrimaryPart or model:FindFirstChild("HumanoidRootPart") or model:FindFirstChild("Root")
      if root and root:IsA("BasePart") then
        local offset = viewer.Position - root.Position
        creatureDistanceSq[model] = offset:Dot(offset)
      else
        creatureDistanceSq[model] = math.huge
      end
    end
    table.sort(creatureMotionModels, function(a, b)
      return creatureDistanceSq[a] < creatureDistanceSq[b]
    end)
  end
  -- 화면 밖으로 나가거나 공격 준비가 끝난 적의 강조 이펙트를 즉시 정리한다.
  for core, highlight in pairs(creatureTelegraphHighlights) do
    local owner = core.Parent
    if not owner or not owner.Parent or owner:GetAttribute("IsPreparingAttack") ~= true
      or owner:GetAttribute("AIState") == "Stunned" then
      highlight:Destroy()
      creatureTelegraphHighlights[core] = nil
    else
      local health = owner:FindFirstChildOfClass("Humanoid")
      if health and health.Health <= 0 then
        highlight:Destroy()
        creatureTelegraphHighlights[core] = nil
      end
    end
  end
  local visible = 0
  local camera = workspace.CurrentCamera
  local viewportSize = camera and camera.ViewportSize
  for _, model in ipairs(creatureMotionModels) do
    if visible >= 30 then break end
    if model.Parent and
      (model:GetAttribute("CivilizationEnemy") == true or model:GetAttribute("CompanionOwnerUserId") ~= nil) then
      -- 일부 몬스터 모델은 PrimaryPart가 없으므로 실제 루트 파츠로도 모션을 구동한다.
      local rootPart = model.PrimaryPart or model:FindFirstChild("HumanoidRootPart") or model:FindFirstChild("Root")
      local onScreen = false
      if camera and rootPart and rootPart:IsA("BasePart") then
        local viewportPoint = camera:WorldToViewportPoint(rootPart.Position)
        -- 화면 가장자리 48px 여유로 몬스터 팔다리 모션이 갑자기 켜지고 꺼지는 현상을 줄인다.
        onScreen = viewportPoint.Z > 0
          and viewportPoint.X >= -48 and viewportPoint.X <= viewportSize.X + 48
          and viewportPoint.Y >= -48 and viewportPoint.Y <= viewportSize.Y + 48
      end
      if rootPart and rootPart:IsA("BasePart") and onScreen and (viewer.Position - rootPart.Position).Magnitude <= 85 then
        visible += 1
        -- 서버 AI가 Combat 상태라도 제자리 공격 중이면 걷지 않는다.
        -- 서버가 실제로 이동시킨 루트 좌표를 기준으로 보행 상태를 판정한다.
        local oldRootMotion = creatureRootMotion[rootPart]
        local rootPosition = rootPart.Position
        local realMoving = false
        if oldRootMotion then
          local displacement = rootPosition - oldRootMotion.position
          local planar = Vector3.new(displacement.X, 0, displacement.Z).Magnitude
          realMoving = planar > 0.025 and planar < 8
        end
        creatureRootMotion[rootPart] = {position = rootPosition}
        local moving = realMoving and (model:GetAttribute("MotionState") == "Walk"
          or model:GetAttribute("AIState") == "Chase"
          or model:GetAttribute("AIState") == "Combat")
        -- Studio에서 가져온 MeshPart 모델을 적 루트 위치에 붙여 이동 중에도 따라오게 한다.
        -- 기본 모형·서버 히트박스는 건드리지 않고 표시 모델만 클라이언트에서 이동.
        local importedVisual = model:FindFirstChild("ImportedCreatureVisual")
        if importedVisual and importedVisual:IsA("Model")
          and importedVisual:GetAttribute("ImportedVisualFollowRoot") == true then
          -- 가져온 외형은 루트 좌표를 따라가며 걷기/공격 예고/기절 자세를 표시한다.
          -- 실제 위치·공격 판정은 서버 몬스터 루트에서만 결정한다.
          local state = model:GetAttribute("AIState")
          local windingUp = model:GetAttribute("IsPreparingAttack") == true
          local humanoid = model:FindFirstChildOfClass("Humanoid")
          local down = humanoid and humanoid.Health <= 0
          local clock = creatureMotionPhase * 8
          local stride = moving and not down and math.sin(clock) * 0.12 or 0
          local roll = moving and not down and math.sin(clock) * 0.055 or 0
          local pitch = down and math.rad(65) or state == "Stunned" and math.rad(20)
            or windingUp and math.rad(-16) or 0
          -- 시작 포즈의 높이/회전을 보존해서 실제 메시가 루트 안에 파묻히지 않게 한다.
          local visualPose = importedVisual:GetAttribute("VisualPivotOffset")
          if typeof(visualPose) ~= "CFrame" then visualPose = CFrame.new() end
          importedVisual:PivotTo(rootPart.CFrame * CFrame.new(0, stride, 0)
            * CFrame.Angles(pitch, 0, roll) * visualPose)
          -- 가져온 스킨드/리그 모델의 Motor6D 다리를 좌우 교대로 구동한다.
          -- 원본 C0는 보존하고 20Hz 클라이언트 시각 효과만 수정한다.
          local joints = creatureImportedRig[importedVisual]
          if not joints then
            joints = {}
            for _, item in ipairs(importedVisual:GetDescendants()) do
              if item:IsA("Motor6D") then
                local lower = string.lower(item.Name)
                local limb = item.Part1 and string.lower(item.Part1.Name) or ""
                local label = lower .. " " .. limb
                if string.find(label, "leg", 1, true) or string.find(label, "thigh", 1, true)
                  or string.find(label, "hip", 1, true) then
                  local left = string.find(label, "left", 1, true) or string.find(label, "_l", 1, true)
                  local right = string.find(label, "right", 1, true) or string.find(label, "_r", 1, true)
                  if left or right then
                    table.insert(joints, {joint=item, base=item.C0, side=left and 1 or -1})
                  end
                end
              end
            end
            creatureImportedRig[importedVisual] = joints
          end
          local walking = moving and not down and state ~= "Stunned" and not windingUp
          for _, leg in ipairs(joints) do
            if leg.joint.Parent then
              local angle = walking and math.sin(clock) * leg.side * 0.38 or 0
              leg.joint.C0 = leg.base * CFrame.Angles(angle, 0, 0)
            end
          end
        end
        local preparing = model:GetAttribute("IsPreparingAttack") == true
        local amplitude = moving and 0.22 or 0.035
        if preparing then amplitude = 0.08 end
        local enemyHumanoid = model:FindFirstChildOfClass("Humanoid")
        local defeated = enemyHumanoid and enemyHumanoid.Health <= 0
        local stunned = model:GetAttribute("AIState") == "Stunned"
        if defeated or stunned then amplitude = 0 end
        -- 몬스터 공격 예고·기절·사망을 서로 다른 실루엣으로 표시한다.
        -- 판정과 이동은 기존 서버 AI가 그대로 담당한다.
        local motionClock = creatureMotionPhase * (moving and 8 or 2.1)
        local swing = math.sin(motionClock) * amplitude
        if defeated then
          swing = 0.9
        elseif stunned then
          swing = 0.18
        elseif preparing then
          swing = -0.48 + math.sin(creatureMotionPhase * 13) * 0.045
        end
        -- 공격 예고 중인 적의 중심부를 짧게 점멸시켜 모바일에서도 타이밍을 읽기 쉽게 한다.
        -- 적 서버 판정/히트박스/자원은 변경하지 않는다.
        local core = model:FindFirstChild("SpiritCore") or model:FindFirstChild("HumanoidRootPart")
        if core and core:IsA("BasePart") then
          local existing = creatureTelegraphHighlights[core]
          if preparing and not defeated and not stunned then
            if not existing then
              local highlight = Instance.new("Highlight")
              highlight.Name = "LocalAttackTelegraph"
              highlight.Adornee = model
              highlight.FillColor = Color3.fromRGB(242, 130, 54)
              highlight.OutlineColor = Color3.fromRGB(255, 213, 118)
              highlight.FillTransparency = 0.83
              highlight.OutlineTransparency = 0.35
              highlight.DepthMode = Enum.HighlightDepthMode.Occluded
              highlight.Parent = model
              creatureTelegraphHighlights[core] = highlight
            end
          elseif existing then
            existing:Destroy()
            creatureTelegraphHighlights[core] = nil
          end
        end
        for _, name in ipairs(creatureMotionLimbNames) do
          local part = model:FindFirstChild(name)
          -- Motor6D로 연결된 실제 R15/R6 관절은 애니메이터가 담당한다.
          -- 수동 CFrame 연출은 별도 관절이 없는 로우폴리 몬스터 파츠에만 적용한다.
          local animatedJoint = false
          if part and part:IsA("BasePart") then
            local cached = creatureMotionJointChecks[part]
            -- 관절이 나중에 연결되거나 제거될 수 있으므로 결과를 짧게만 보관한다.
            if not cached or creatureMotionPhase >= cached.expiresAt then
              local hasMotor = false
              for _, joint in ipairs(part:GetJoints()) do
                if joint:IsA("Motor6D") then
                  hasMotor = true
                  break
                end
              end
              cached = {hasMotor = hasMotor, expiresAt = creatureMotionPhase + 0.5}
              creatureMotionJointChecks[part] = cached
            end
            animatedJoint = cached.hasMotor
          end
          -- 물리/리그 관절은 건드리지 않고 별도 연출 허용 파츠에만 적용한다.
          -- 고정 파츠라도 서버 월드 장식이면 명시적 opt-in 없이는 움직이지 않는다.
          if part and part:IsA("BasePart") and part.Anchored and not animatedJoint
            and #part:GetJoints() == 0 and part:GetAttribute("AllowClientLimbMotion") == true then
            local sign = (name == "Left Arm" or name == "Left Leg" or name == "LeftLimb") and 1 or -1
            -- 서버에 복제되는 Attribute를 매 프레임 모션 캐시로 쓰지 않는다.
            -- 루트 파츠가 교체되면 기존 기준 자세도 다시 산출한다.
            local state = creatureMotionLimbBases[part]
            -- 기존 서버 기준 오프셋이 설정돼 있으면 우선 사용한다.
            -- 없을 때만 현재 위치에서 기준 자세를 계산한다.
            if not state or state.root ~= rootPart then
              local storedBase = part:GetAttribute("MotionBaseOffset")
              local base = typeof(storedBase) == "CFrame"
                and storedBase or rootPart.CFrame:ToObjectSpace(part.CFrame)
              state = {root = rootPart, base = base, lastAnimatedAt = creatureMotionPhase}
              creatureMotionLimbBases[part] = state
            elseif creatureMotionPhase - state.lastAnimatedAt > 0.25 then
              -- 화면 밖에서 오랫동안 갱신되지 않았다면 현재 서버 기준 자세로 복귀한다.
              local storedBase = part:GetAttribute("MotionBaseOffset")
              if typeof(storedBase) == "CFrame" then
                state.base = storedBase
              end
            end
            state.lastAnimatedAt = creatureMotionPhase
            local base = state.base
            local leg = name == "Left Leg" or name == "Right Leg"
            local angle = leg and -sign * swing or sign * swing
            part.CFrame = rootPart.CFrame * base * CFrame.Angles(angle, 0, 0)
          end
        end
      end
    end
  end
end)
-- Touch combat/harvesting is handled by world taps instead of four fixed HUD buttons.
if nativeTouchEnabled then
  UserInputService.TouchTapInWorld:Connect(function(position, processedByUI)
    if processedByUI or civPanel.Visible or player:GetAttribute("CivReady") ~= true then return end
    local camera = workspace.CurrentCamera
    if not camera then return end
    local ray = camera:ViewportPointToRay(position.X, position.Y)
    local params = RaycastParams.new()
    params.FilterType = Enum.RaycastFilterType.Exclude
    if player.Character then params.FilterDescendantsInstances = {player.Character} end
    local result = workspace:Raycast(ray.Origin, ray.Direction * 350, params)
    if not result then return end
    local part = result.Instance
    local resourceType = part:GetAttribute("CivilizationResourceType")
    if typeof(resourceType) == "string" then
      remote:FireServer("CivGather", resourceType)
      return
    end
    local model = part:FindFirstAncestorOfClass("Model")
    if model and model:GetAttribute("CivilizationEnemy") == true then
      civActionMotion("CivAttack")
      autoCombatEvent:FireServer("AutoAttack", model)
    end
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
-- 터치/PC 공용 건축 선택 패널. 설치 위치와 부모 소켓은 서버에서 재검증한다.
local housingPanel = Instance.new("Frame")
housingPanel.Name = "HousingBuildPanel"
housingPanel.Size = UDim2.fromOffset(218, 445)
housingPanel.Position = UDim2.new(1, -226, 0.5, -222)
housingPanel.BackgroundColor3 = Color3.fromRGB(39, 43, 40)
housingPanel.Visible = false
housingPanel.Parent = civGui
local housingScroll = Instance.new("ScrollingFrame")
housingScroll.Name = "HousingChoices"
housingScroll.Position = UDim2.fromOffset(0,42)
housingScroll.Size = UDim2.new(1,0,1,-194)
housingScroll.BackgroundTransparency = 1
housingScroll.BorderSizePixel = 0
housingScroll.AutomaticCanvasSize = Enum.AutomaticSize.Y
housingScroll.ScrollBarThickness = 5
housingScroll.Parent = housingPanel
local housingLayout = Instance.new("UIListLayout")
housingLayout.Padding = UDim.new(0, 2)
housingLayout.Parent = housingScroll
local housingFooter = Instance.new("Frame")
housingFooter.Name = "HousingActions"
housingFooter.Position = UDim2.new(0,0,1,-150)
housingFooter.Size = UDim2.new(1,0,0,150)
housingFooter.BackgroundTransparency = 1
housingFooter.Parent = housingPanel
local housingFooterLayout = Instance.new("UIListLayout")
housingFooterLayout.Padding = UDim.new(0,3)
housingFooterLayout.Parent = housingFooter
local housingSelected = "SquareFoundation"
local housingKeys = {"SquareFoundation","TriangleFoundation","Wall","WindowWall","Doorframe","FlatRoof","Pillar","Stairs",
  "Ceiling","TriangleCeiling","SlopedRoof","RoofCorner","FenceBase","GateFrame","Railing","Ladder"}
local housingNames = {"정사각 토대","삼각 토대","벽","창문 벽","문틀","평지붕","기둥","계단",
  "천장","삼각 천장","경사 지붕","지붕 모서리","울타리 기초","성문틀","난간","사다리"}
local housingInfo = civLabel(housingPanel,"HousingHint","부품을 선택하고 설치 버튼을 누르세요.",UDim2.new(1, -8, 0, 40),UDim2.new(),true)
housingInfo.TextSize = 12
for index,key in ipairs(housingKeys) do
  civButton(housingScroll,"HousingChoice"..key,housingNames[index],
    UDim2.new(1,-8,0,26),UDim2.new(),function()
      housingSelected=key
      housingInfo.Text="선택: "..housingNames[index]
    end)
end
local housingRotation = 0
local housingPreview = Instance.new("Part")
housingPreview.Name = "LocalHousingPlacementPreview"
housingPreview.Anchored = true
housingPreview.CanCollide = false
housingPreview.CanTouch = false
housingPreview.CanQuery = false
housingPreview.Material = Enum.Material.ForceField
housingPreview.Color = Color3.fromRGB(99, 220, 158)
housingPreview.Transparency = 1
housingPreview.Parent = workspace
local housingSizes = {
  SquareFoundation=Vector3.new(8,1,8), TriangleFoundation=Vector3.new(8,1,8),
  Wall=Vector3.new(8,7,1), WindowWall=Vector3.new(8,7,1),
  Doorframe=Vector3.new(8,7,1), FlatRoof=Vector3.new(8,1,8),
  Pillar=Vector3.new(1,8,1), Stairs=Vector3.new(8,1,3),
  Ceiling=Vector3.new(8,1,8), TriangleCeiling=Vector3.new(8,1,8),
  SlopedRoof=Vector3.new(8,3,8), RoofCorner=Vector3.new(8,3,8),
  FenceBase=Vector3.new(8,1,2), GateFrame=Vector3.new(8,7,2),
  Railing=Vector3.new(8,3,1), Ladder=Vector3.new(3,8,1),
}
local housingRayParams = RaycastParams.new()
housingRayParams.FilterType = Enum.RaycastFilterType.Exclude
local function housingTarget()
  local camera = workspace.CurrentCamera
  local character = player.Character
  if not camera then return nil,nil end
  housingRayParams.FilterDescendantsInstances = character and {character,housingPreview} or {housingPreview}
  local hit = workspace:Raycast(camera.CFrame.Position,camera.CFrame.LookVector*45,housingRayParams)
  if not hit then return nil,nil end
  local target = hit.Instance
  -- 공용 비주얼 모델을 조준해도 실제 서버 판정 부품으로 승격한다.
  local current = target
  while current and current ~= workspace do
    if current:IsA("BasePart") and current:GetAttribute("HousingPiece") == true then
      target = current
      break
    end
    current = current.Parent
  end
  return hit.Position,target
end
game:GetService("RunService").RenderStepped:Connect(function()
  if not housingPanel.Visible then housingPreview.Transparency=1 return end
  local position,parentPart = housingTarget()
  if not position then housingPreview.Transparency=1 return end
  local raceId=player:GetAttribute("CivRaceID") or 0
  local angle=math.pi*2*(raceId-1)/24
  local worldRadius=Config.Civilization and Config.Civilization.WorldRadius or 220
  local center=Vector3.new(math.cos(angle)*worldRadius,0,math.sin(angle)*worldRadius)
  local x=math.round((position.X-center.X)/8)*8
  local z=math.round((position.Z-center.Z)/8)*8
  local base=housingSelected=="SquareFoundation" or housingSelected=="TriangleFoundation" or housingSelected=="FenceBase"
  local level=base and 0 or math.clamp(math.round((position.Y-center.Y)/8),0,3)
  local size=housingSizes[housingSelected]
  housingPreview.Size=size
  housingPreview.CFrame=CFrame.new(center+Vector3.new(x,level*8+size.Y/2,z))*CFrame.Angles(0,math.rad(housingRotation),0)
  local character=player.Character
  local root=character and character:FindFirstChild("HumanoidRootPart")
  local placementBase=center+Vector3.new(x,level*8,z)
  local validParent=parentPart and parentPart:GetAttribute("HousingPiece")==true
    and parentPart:GetAttribute("CivOwnerUserId")==player.UserId
    and (parentPart.Position-placementBase).Magnitude<=12
    and (tonumber(parentPart:GetAttribute("Stability")) or 0)>20
  local allowed=raceId>0 and math.abs(x)<=32 and math.abs(z)<=32
    and root~=nil and (root.Position-placementBase).Magnitude<=23
    and (base or validParent)
  if allowed then
    local params=OverlapParams.new()
    params.FilterType=Enum.RaycastFilterType.Exclude
    params.FilterDescendantsInstances=character and {character,housingPreview} or {housingPreview}
    local hits=workspace:GetPartBoundsInBox(housingPreview.CFrame,
      size-Vector3.new(0.12,0.12,0.12),params)
    for _,hit in ipairs(hits) do
      if hit:IsA("BasePart") and hit.CanCollide then
        local isOwnSupport=hit==parentPart and not base
        local isGround=hit:GetAttribute("WalkableGround")==true
        local isContinent=hit.Name=="문명 대륙"
        if not isOwnSupport and not isGround and not isContinent then
          allowed=false
          break
        end
      end
    end
  end
  housingPreview.Color=allowed and Color3.fromRGB(90,220,140) or Color3.fromRGB(235,90,90)
  housingPreview.Transparency=0.57
end)
civButton(housingFooter,"HousingRotate","회전 90도",
  UDim2.new(1,-8,0,30),UDim2.new(),function()
    housingRotation=(housingRotation+90)%360
  end)
local function housingTryPlace()
  local character=player.Character
  local root=character and character:FindFirstChild("HumanoidRootPart")
  local camera=workspace.CurrentCamera
  if not root or not camera then return end
  local pos,parentPart=housingTarget()
  if not pos then housingInfo.Text="건축 위치를 바라봐." return end
  -- 건축 소켓에 직접 조준했을 때만 상단 부품이 연결된다.
  remote:FireServer("CivBuildHousing",{Key=housingSelected,Position=pos,ParentPart=parentPart,Rotation=housingRotation})
end
civButton(housingFooter,"HousingPlace","선택한 부품 설치",
  UDim2.new(1,-8,0,34),UDim2.new(),housingTryPlace)
civButton(housingFooter,"HousingRemove","조준한 내 건축물 철거",
  UDim2.new(1,-8,0,30),UDim2.new(),function()
    local _, target = housingTarget()
    if target and target:GetAttribute("HousingPiece") == true
      and target:GetAttribute("CivOwnerUserId") == player.UserId then
      remote:FireServer("CivRemoveHousing",target)
    else
      housingInfo.Text="자신의 건축 부품을 조준해."
    end
  end)
civButton(housingFooter,"HousingDoorToggle","조준한 내 문 열기 / 닫기",
  UDim2.new(1,-8,0,29),UDim2.new(),function()
    local _,target=housingTarget()
    if target and target:GetAttribute("HousingPiece")==true
      and target.Name:match("^Doorframe")
      and target:GetAttribute("CivOwnerUserId")==player.UserId then
      remote:FireServer("CivToggleHousingDoor",target)
    else
      housingInfo.Text="자신의 문틀을 조준해."
    end
  end)
local housingToggle=civButton(civGui,"HousingToggle","건축",
  UDim2.fromOffset(76,36),UDim2.new(1,-88,0,110),function()
    housingPanel.Visible=not housingPanel.Visible
  end)
housingToggle.ZIndex=15
-- 건축은 기존 왼쪽 메뉴에서 접근하며 별도 고정 버튼은 표시하지 않는다.
housingToggle.Visible=false
-- 기존 하우징 패널은 접이식 메뉴에서 열 수 있게 연결한다.
local housingMenuButton = civButton(civMenuRail, "HousingMenu", "집짓기",
  UDim2.new(1, -8, 0, 45), UDim2.new(), function()
    civPanel.Visible = false
    housingPanel.Visible = not housingPanel.Visible
    civMenuRail.Visible = false
  end)
housingMenuButton.LayoutOrder = 6
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
    civMessage.Visible = true
    task.delay(3.5, function() if civMessage.Text == payload then civMessage.Visible = false end end)
  elseif kind == "CIV_TELEGRAPH" then
    civMessage.Text = "⚠ 공격 예고! 맞기 직전 패링(F) 또는 회피(Shift)!"
    civMessage.TextColor3 = Color3.fromRGB(255, 129, 97)
    civMessage.Visible = true
  elseif kind == "CIV_PARRY" then
    civMessage.Text = "PERFECT PARRY! STUNNED · 적 2초 기절"
    civMessage.TextColor3 = Color3.fromRGB(255, 228, 118)
    civMessage.Visible = true
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
    -- 실제 서버 적중 결과에만 표시하는 로컬 타격 그래픽.
    local character = player.Character
    local rootPart = character and character:FindFirstChild("HumanoidRootPart")
    if rootPart then
      local nearest, distance = nil, 14
      for _, model in ipairs(workspace:GetDescendants()) do
        if model:IsA("Model") and model:GetAttribute("CivilizationEnemy") == true
          and model.Name == tostring(payload.Enemy) then
          local pivot = model.PrimaryPart
          if pivot then
            local d = (pivot.Position - rootPart.Position).Magnitude
            if d < distance then nearest, distance = model, d end
          end
        end
      end
      if nearest then
        local impact = Instance.new("Highlight")
        impact.Name = "CombatHitFlash"
        impact.FillColor = Color3.fromRGB(255, 201, 108)
        impact.OutlineColor = Color3.fromRGB(255, 244, 214)
        impact.FillTransparency = 0.25
        impact.OutlineTransparency = 0.1
        impact.DepthMode = Enum.HighlightDepthMode.Occluded
        impact.Adornee = nearest
        impact.Parent = nearest
        actionTweenService:Create(impact, TweenInfo.new(0.18), {
          FillTransparency = 1, OutlineTransparency = 1
        }):Play()
        task.delay(0.2, function() impact:Destroy() end)
      end
    end
    civMessage.TextColor3 = Color3.fromRGB(250, 235, 191)
    civMessage.Text = tostring(payload.Enemy) .. "에게 " .. tostring(payload.Damage) .. " 피해!"
    local hitCamera = workspace.CurrentCamera
    if hitCamera then
      local originalFov = hitCamera.FieldOfView
      actionTweenService:Create(hitCamera, TweenInfo.new(0.06, Enum.EasingStyle.Quad, Enum.EasingDirection.Out),
        {FieldOfView = math.clamp(originalFov - 1.5, 40, 100)}):Play()
      task.delay(0.065, function()
        if workspace.CurrentCamera == hitCamera then
          actionTweenService:Create(hitCamera, TweenInfo.new(0.14, Enum.EasingStyle.Quad),
            {FieldOfView = originalFov}):Play()
        end
      end)
    end
  end
end)
UserInputService.InputBegan:Connect(function(input, consumed)
  if consumed or UserInputService:GetFocusedTextBox() then return end
  if input.KeyCode == Enum.KeyCode.F then
    civActionMotion("CivGuard")
    parryEvent:FireServer()
  elseif input.KeyCode == Enum.KeyCode.LeftShift then
    civActionMotion("CivDodge")
    dodgeEvent:FireServer()
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
    civActionMotion("CivAttack")
    remote:FireServer("CivAttack")
  end
end)
-- 기존 기능은 삭제하지 않고 별도 메뉴를 통해 접근한다.
gui.Enabled = false
-- Main lobby: parchment first-entry screen, no right-side combat controls.
local lobbyScreen = Instance.new("Frame")
lobbyScreen.Name = "AncientCivilizationLobby"
lobbyScreen.Size = UDim2.fromScale(1, 1)
lobbyScreen.BackgroundColor3 = Color3.fromRGB(20, 27, 25)
lobbyScreen.BackgroundTransparency = 0.16
lobbyScreen.BorderSizePixel = 0
lobbyScreen.ZIndex = 30
lobbyScreen.Visible = false
lobbyScreen.Parent = civGui
local lobbyCard = Instance.new("Frame")
lobbyCard.Name = "ParchmentWelcome"
lobbyCard.AnchorPoint = Vector2.new(0.5, 0.5)
lobbyCard.Position = UDim2.fromScale(0.5, 0.5)
lobbyCard.Size = UDim2.new(0.8, 0, 0.72, 0)
lobbyCard.BackgroundColor3 = Color3.fromRGB(75, 53, 36)
lobbyCard.BorderSizePixel = 0
lobbyCard.ZIndex = 31
lobbyCard.Parent = lobbyScreen
local lobbyCorner = Instance.new("UICorner")
lobbyCorner.CornerRadius = UDim.new(0, 12)
lobbyCorner.Parent = lobbyCard
local lobbyStroke = Instance.new("UIStroke")
lobbyStroke.Color = Color3.fromRGB(208, 163, 93)
lobbyStroke.Thickness = 3
lobbyStroke.Parent = lobbyCard
local lobbyHeading = civLabel(lobbyCard, "LobbyHeading", "대충알피지", UDim2.new(1, -24, 0, 46), UDim2.fromOffset(12, 13), false)
lobbyHeading.ZIndex = 32
lobbyHeading.TextSize = 28
lobbyHeading.TextColor3 = Color3.fromRGB(255, 227, 163)
local lobbySubtitle = civLabel(lobbyCard, "LobbySubtitle",
  "광장에서 모험을 준비하고 탐험을 시작해", UDim2.new(1, -28, 0, 44), UDim2.fromOffset(14, 65), false)
lobbySubtitle.ZIndex = 32
lobbySubtitle.TextSize = 14
local lobbyDescription = civLabel(lobbyCard, "LobbyDescription",
  "로비 → 지역 이동 → 채집과 전투 → 연구와 건축", UDim2.new(1, -28, 0, 54), UDim2.fromOffset(14, 115), false)
lobbyDescription.ZIndex = 32
lobbyDescription.TextSize = 13
local lobbyTravelPending = false
local lobbyRequestedDestination = nil
local lobbyPreviousAck = 0
local lobbyPlay = civButton(lobbyCard, "LobbyPlay", "모험 시작", UDim2.new(1, -36, 0, 48), UDim2.new(0, 18, 1, -115), function()
  if player:GetAttribute("CivSaveAvailable") ~= true then
    lobbyDescription.Visible = true
    lobbyDescription.Text = player:GetAttribute("CivReady") == true
      and "저장 데이터를 불러오지 못했어. 재접속해서 다시 시도해."
      or "저장 데이터를 확인 중이야. 잠시 후 다시 눌러줘."
    return
  end
  if player:GetAttribute("CivReady") ~= true or (player:GetAttribute("CivRaceID") or 0) <= 0 then
    lobbyDescription.Visible = true
    lobbyDescription.Text = "게임 데이터를 준비 중이야. 잠시 후 다시 눌러줘."
    return
  end
  if lobbyTravelPending then return end
  lobbyTravelPending = true
  lobbyRequestedDestination = player:GetAttribute("CivRaceID")
  lobbyPreviousAck = player:GetAttribute("CivTravelAck") or 0
  lobbyDescription.Visible = true
  lobbyDescription.Text = "모험 지역으로 이동 중이야..."
  remote:FireServer("CivTravel", lobbyRequestedDestination)
  task.delay(4, function()
    if not lobbyTravelPending then return end
    local confirmed = (player:GetAttribute("CivTravelAck") or 0) > lobbyPreviousAck
      and player:GetAttribute("CivTravelDestination") == lobbyRequestedDestination
    lobbyTravelPending = false
    lobbyRequestedDestination = nil
    if confirmed then
      lobbyScreen.Visible = false
      civMenuRail.Visible = false
    else
      lobbyDescription.Visible = true
      lobbyDescription.Text = "이동하지 못했어. 캐릭터 상태를 확인하고 다시 눌러줘."
    end
  end)
end)
lobbyPlay.ZIndex = 33
player:GetAttributeChangedSignal("CivTravelAck"):Connect(function()
  if not lobbyTravelPending or (player:GetAttribute("CivTravelAck") or 0) <= lobbyPreviousAck
    or player:GetAttribute("CivTravelDestination") ~= lobbyRequestedDestination then return end
  lobbyTravelPending = false
  lobbyScreen.Visible = false
  civMenuRail.Visible = false
end)
local lobbyExplore = civButton(lobbyCard, "LobbyExplore", "로비 광장 둘러보기", UDim2.new(1, -36, 0, 40), UDim2.new(0, 18, 1, -59), function()
  lobbyScreen.Visible = false
  civMenuRail.Visible = false
  remote:FireServer("CivTravel", "Lobby")
end)
lobbyExplore.ZIndex = 33
-- 로비는 기기 회전·화면 크기에 맞춰 버튼과 안내문을 다시 배치한다.
local function resizeLobby()
  local camera = workspace.CurrentCamera
  local viewport = camera and camera.ViewportSize or Vector2.new(390, 720)
  local width = math.max(1, math.min(480, viewport.X - 24))
  local height = math.max(1, math.min(360, viewport.Y - 24))
  lobbyCard.Size = UDim2.fromOffset(width, height)
  local compact = height < 310
  -- 화면이 매우 낮을 때 설명문을 접어 시작 버튼의 터치 영역을 확보한다.
  local saveFailed = player:GetAttribute("CivSaveAvailable") == false
  lobbyDescription.Visible = height >= 250 or saveFailed
  lobbySubtitle.Visible = height >= 190 and not (saveFailed and height < 250)
  lobbyHeading.TextSize = compact and 22 or 28
  lobbyHeading.Position = UDim2.fromOffset(12, compact and 7 or 13)
  lobbySubtitle.Position = UDim2.fromOffset(14, compact and 49 or 65)
  lobbySubtitle.Size = UDim2.new(1, -28, 0, compact and 33 or 44)
  lobbyDescription.Position = UDim2.fromOffset(14, compact and 81 or 115)
  lobbyDescription.Size = UDim2.new(1, -28, 0, compact and 36 or 54)
  -- 버튼은 카드 아래쪽을 기준으로 배치해 작은 화면에서도 겹치지 않게 한다.
  local lowerButtonHeight = math.max(24, math.min(40, height * 0.14))
  local upperButtonHeight = math.max(28, math.min(48, height * 0.17))
  lobbyExplore.Size = UDim2.new(1, -36, 0, lowerButtonHeight)
  lobbyExplore.Position = UDim2.new(0, 18, 1, -lowerButtonHeight - 12)
  lobbyPlay.Size = UDim2.new(1, -36, 0, upperButtonHeight)
  lobbyPlay.Position = UDim2.new(0, 18, 1, -lowerButtonHeight - upperButtonHeight - 21)
end
local lobbyViewportConnection
local function bindLobbyViewport()
  if lobbyViewportConnection then lobbyViewportConnection:Disconnect() end
  local camera = workspace.CurrentCamera
  if camera then lobbyViewportConnection = camera:GetPropertyChangedSignal("ViewportSize"):Connect(resizeLobby) end
  resizeLobby()
end
workspace:GetPropertyChangedSignal("CurrentCamera"):Connect(bindLobbyViewport)
bindLobbyViewport()
local function openLobby()
  civPanel.Visible = false
  housingPanel.Visible = false
  civMenuRail.Visible = false
  lobbyScreen.Visible = true
  lobbyTravelPending = false
  lobbyRequestedDestination = nil
  lobbyPreviousAck = player:GetAttribute("CivTravelAck") or 0
  lobbyPlay.Text = "모험 시작"
  local saveState = player:GetAttribute("CivSaveAvailable")
  lobbyDescription.Text = saveState == false
    and "저장 데이터를 불러오지 못했어. 재접속해서 다시 시도해."
    or (saveState ~= true and "저장 데이터를 확인 중이야. 잠시 후 다시 눌러줘."
      or "로비 → 모험 → 채집과 전투 → 연구와 건축")
  resizeLobby()
end
local lobbyMenu = civButton(civMenuRail, "LobbyWelcomeMenu", "로비 안내",
  UDim2.new(1, -8, 0, 45), UDim2.new(), openLobby)
lobbyMenu.LayoutOrder = 0
player:GetAttributeChangedSignal("CivSaveAvailable"):Connect(function()
  if not lobbyScreen.Visible then return end
  local state = player:GetAttribute("CivSaveAvailable")
  if state == false then
    lobbyDescription.Text = "저장 데이터를 불러오지 못했어. 재접속해서 다시 시도해."
  elseif state == true then
    lobbyDescription.Text = "로비 → 모험 → 채집과 전투 → 연구와 건축"
  end
  resizeLobby()
end)
local lobbyShown = false
player:GetAttributeChangedSignal("CivReady"):Connect(function()
  if player:GetAttribute("CivReady") == true and not lobbyShown
    and not civPanel.Visible and not housingPanel.Visible then
    lobbyShown = true
    openLobby()
  end
end)
task.defer(function()
  if player:GetAttribute("CivReady") == true and not lobbyShown
    and not civPanel.Visible and not housingPanel.Visible then
    lobbyShown = true
    openLobby()
  end
end)

