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
civGui.ResetOnSpawn = false
civGui.DisplayOrder = 12
civGui.IgnoreGuiInset = false
civGui.Parent = player:WaitForChild("PlayerGui")
local function civLabel(parent, name, text, size, pos, background)
  local label = Instance.new("TextLabel")
  label.Name = name
  label.Text = text
  label.TextColor3 = Color3.fromRGB(250, 235, 191)
  label.TextSize = 15
  label.TextWrapped = true
  label.Font = Enum.Font.GothamBold
  label.TextXAlignment = Enum.TextXAlignment.Center
  label.BackgroundColor3 = Color3.fromRGB(38, 43, 42)
  label.BackgroundTransparency = background and 0.15 or 1
  label.BorderSizePixel = 0
  label.Size = size
  label.Position = pos
  label.Parent = parent
  return label
end
local function civButton(parent, name, text, size, pos, callback)
  local button = Instance.new("TextButton")
  button.Name = name
  button.Size = size
  button.Position = pos
  button.BackgroundColor3 = Color3.fromRGB(93, 75, 54)
  button.TextColor3 = Color3.fromRGB(255, 243, 215)
  button.TextWrapped = true
  button.TextSize = 16
  button.Font = Enum.Font.GothamBold
  button.BorderSizePixel = 0
  button.Text = text
  button.AutoButtonColor = true
  button.Parent = parent
  local corner = Instance.new("UICorner")
  corner.CornerRadius = UDim.new(0, 8)
  corner.Parent = button
  button.Activated:Connect(callback)
  return button
end
local civTitle = civLabel(civGui, "CivilizationTitle", "대충알피지",
  UDim2.new(1, -20, 0, 35), UDim2.fromOffset(10, 0), true)
local civStatus = civLabel(civGui, "CivilizationStatus", "",
  UDim2.new(1, -20, 0, 54), UDim2.fromOffset(10, 39), true)
civStatus.TextSize = 13
local civMessage = civLabel(civGui, "CombatNotice", "",
  UDim2.new(1, -100, 0, 43), UDim2.fromOffset(10, 97), true)
civMessage.TextSize = 14
civMessage.BackgroundColor3 = Color3.fromRGB(62, 47, 34)
local civPanel = Instance.new("Frame")
civPanel.Name = "CivilizationPanel"
civPanel.AnchorPoint = Vector2.new(0.5, 0.5)
civPanel.Position = UDim2.fromScale(0.5, 0.52)
civPanel.Size = UDim2.new(1, -28, 0.70, 0)
civPanel.BackgroundColor3 = Color3.fromRGB(49, 47, 39)
civPanel.BackgroundTransparency = 0.04
civPanel.BorderSizePixel = 0
civPanel.Visible = false
civPanel.Parent = civGui
local panelCorner = Instance.new("UICorner")
panelCorner.CornerRadius = UDim.new(0, 12)
panelCorner.Parent = civPanel
local panelTitle = civLabel(civPanel, "PanelTitle", "문명 선택",
  UDim2.new(1, -64, 0, 46), UDim2.fromOffset(10, 8), false)
panelTitle.TextSize = 20
civButton(civPanel, "Close", "닫기", UDim2.fromOffset(60, 45),
  UDim2.new(1, -65, 0, 6), function() civPanel.Visible = false end)
local civList = Instance.new("ScrollingFrame")
civList.Name = "CivilizationList"
civList.Size = UDim2.new(1, -24, 1, -67)
civList.Position = UDim2.fromOffset(12, 60)
civList.BackgroundTransparency = 1
civList.BorderSizePixel = 0
civList.ScrollBarThickness = 6
civList.AutomaticCanvasSize = Enum.AutomaticSize.Y
civList.CanvasSize = UDim2.new()
civList.Parent = civPanel
local civLayout = Instance.new("UIListLayout")
civLayout.Padding = UDim.new(0, 7)
civLayout.SortOrder = Enum.SortOrder.LayoutOrder
civLayout.Parent = civList
local civPanelMode = "Races"
local function civOpen(mode)
  if civPanel.Visible and civPanelMode == mode then
    civPanel.Visible = false
    return
  end
  civPanelMode = mode
  civPanel.Visible = true
  for _, item in ipairs(civList:GetChildren()) do
    if item:IsA("GuiObject") then item:Destroy() end
  end
  local selected = player:GetAttribute("CivRaceID") or 0
  if mode == "Races" then
    panelTitle.Text = selected == 0 and "24개 문명 중 하나를 선택해" or "24개 문명 정보"
    for id = 1, 24 do
      local race = RaceData.GetRace(id)
      local text = string.format("%02d. %s / %s\n%s", id, race.Name, race.Landmark, race.Passive)
      local button = civButton(civList, "Race" .. id, text,
        UDim2.new(1, -9, 0, 70), UDim2.new(), function()
          if selected == 0 then
            remote:FireServer("CivSelect", id)
            civPanel.Visible = false
          else
            civMessage.Text = race.Name .. " / " .. race.SpecialResources
          end
        end)
      button.LayoutOrder = id
      button.TextSize = 14
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
      {"CivDarkIron", "다크 아이언"}, {"CivStoneSpear", "돌창"}, {"CivBronzeSword", "청동검"}, {"CivIronGreatsword", "대검"},
      {"CivFood", "식량"}, {"CivSilver", "은화"}, {"CivResearch", "연구력"},
      {"CivStoneWall", "성벽"}, {"CivDangunAltar", "단군 제단"}, {"CivPyramid", "피라미드"},
      {"CivColosseum", "콜로세움"}, {"CivDrakkarShipyard", "드라카르 조선소"},
    }
    for slot = 1, 32 do
      local item = fields[slot]
      local amount = item and (player:GetAttribute(item[1]) or 0) or 0
      local label = civLabel(container, "Slot" .. slot,
        item and (item[2] .. "\\n×" .. tostring(amount)) or "빈 칸",
        UDim2.fromScale(1, 1), UDim2.new(), true)
      label.LayoutOrder = slot
      label.TextSize = 12
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
  else
    panelTitle.Text = "파피루스 테크트리 · 72개"
    local techCount = player:GetAttribute("CivTech") or 0
    local unlocked = civLabel(civList, "Unlocked", "연구 완료 " .. techCount .. "/72",
      UDim2.new(1, -9, 0, 36), UDim2.new(), false)
    unlocked.LayoutOrder = 0
    for id = math.max(1, techCount - 1), math.min(72, techCount + 6) do
      local tech = TechTreeData.GetTech(id)
      if tech then
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
            if id == (player:GetAttribute("CivTech") or 0) + 1 then remote:FireServer("CivResearch")
            else civMessage.Text = "선행 기술을 먼저 연구해야 해." end
          end)
        button.LayoutOrder = id
        button.TextSize = 13
        if complete then button.BackgroundColor3 = Color3.fromRGB(126, 101, 44)
        elseif missing or id ~= techCount + 1 then button.BackgroundColor3 = Color3.fromRGB(85, 86, 84) end
      end
    end
  end
end
civButton(civGui, "CraftMenu", "제작",
  UDim2.fromOffset(78, 45), UDim2.fromOffset(92, 200), function() civOpen("Crafts") end)
civButton(civGui, "BuildingMenu", "건축",
  UDim2.fromOffset(78, 45), UDim2.fromOffset(174, 200), function() civOpen("Buildings") end)
civButton(civGui, "CompanionMenu", "AI 동료",
  UDim2.fromOffset(78, 45), UDim2.fromOffset(10, 200), function() civOpen("Companions") end)
local civRaceButton = civButton(civGui, "RaceMenu", "문명",
  UDim2.fromOffset(78, 45), UDim2.fromOffset(10, 148), function() civOpen("Races") end)
civButton(civGui, "TechMenu", "연구",
  UDim2.fromOffset(78, 45), UDim2.fromOffset(92, 148), function() civOpen("Techs") end)
civButton(civGui, "Travel", "영지/로비",
  UDim2.fromOffset(90, 45), UDim2.fromOffset(174, 148), function()
    remote:FireServer("CivTravel")
  end)
civButton(civGui, "Legacy", "기존 RPG",
  UDim2.fromOffset(93, 40), UDim2.new(1, -101, 0, 148), function()
    gui.Enabled = not gui.Enabled
    civPanel.Visible = false
  end)
local civButtons = {
  {"Attack", "공격", "CivAttack", 94, 105},
  {"Guard", "패링", "CivGuard", 94, 172},
  {"Dodge", "회피", "CivDodge", 94, 239},
  {"Gather", "채집", "CivGather", 178, 105},
}
for _, entry in ipairs(civButtons) do
  civButton(civGui, entry[1], entry[2], UDim2.fromOffset(78, 60),
    UDim2.new(1, -entry[4], 1, -entry[5]), function() remote:FireServer(entry[3]) end)
end
local civWatched = {
  "CivRaceID", "CivEra", "CivTech", "CivWood", "CivStone",
  "CivBronze", "CivIron", "CivResearch", "CivKills", "CivParries",
  "CivDodges", "CivGather",
  "CivCopperOre", "CivTinOre", "CivIronOre", "CivCoal",
  "CivHide", "CivCoreCrystal", "CivDarkIron", "CivBronzeIngot", "CivIronIngot",
  "CivStoneSpear", "CivBronzeSword", "CivIronGreatsword",
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
    if civPanel.Visible and (civPanelMode == "Techs" or civPanelMode == "Crafts" or civPanelMode == "Buildings") then
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
  if input.KeyCode == Enum.KeyCode.F then remote:FireServer("CivGuard")
  elseif input.KeyCode == Enum.KeyCode.LeftShift then remote:FireServer("CivDodge")
  elseif input.KeyCode == Enum.KeyCode.E then remote:FireServer("CivGather")
  elseif input.KeyCode == Enum.KeyCode.T then civOpen("Techs")
  elseif input.KeyCode == Enum.KeyCode.C then civOpen("Companions")
  elseif input.KeyCode == Enum.KeyCode.V then civOpen("Crafts")
  elseif input.KeyCode == Enum.KeyCode.B then civOpen("Buildings")
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

