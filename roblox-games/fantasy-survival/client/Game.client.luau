local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")
local ContextActionService = game:GetService("ContextActionService")

local player = Players.LocalPlayer
local Shared = ReplicatedStorage:WaitForChild("Shared")
local Config = require(Shared:WaitForChild("GameConfig"))
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
  ENVIRONMENT = "NOT_APPLICABLE",
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

local gui = Instance.new("ScreenGui")
gui.Name = "ApprovedScopeHud"
gui.ResetOnSpawn = false
gui.Parent = player:WaitForChild("PlayerGui")
local root = Instance.new("Frame")
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
local verifiedLearningSemanticVariant = "SURVIVAL_RISK"
local verifiedLearningSemanticDomain = "CORE_GAMEPLAY_FEEL"
local verifiedLearningSemanticColor = Color3.fromRGB(255, 112, 112)
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

if hasStudioAssetAtom("FRAME_PANEL") then
  local studioAssetStroke = Instance.new("UIStroke")
  studioAssetStroke.Name = "StudioAssetFramePanel"
  studioAssetStroke.Thickness = 1
  studioAssetStroke.Transparency = 0.55
  studioAssetStroke.Color = Color3.fromRGB(210, 225, 255)
  studioAssetStroke.Parent = root
end
root:SetAttribute("StudioAssetBindingVersion", STUDIO_ASSET_BINDING_VERSION)
root:SetAttribute("StudioAssetAtoms", table.concat(studioAssetFamily("UI"), ","))

root.Name = "Root"
root.AnchorPoint = Vector2.new(0.5, 1)
root.Position = UDim2.fromScale(0.5, 0.98)
root.Size = UDim2.new(1, -24, 0.54, 0)
root.BackgroundTransparency = 0.15
root.BackgroundColor3 = Color3.fromRGB(18, 28, 48)
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
list.ScrollBarThickness = 4
list.ClipsDescendants = true
list.Parent = root
for index, action in ipairs(Config.Actions) do
  local button = CommonUI.CreatePrimaryButton({minWidth=44,minHeight=52})
  button.Name = "ScopeAction" .. index
  button.LayoutOrder = index
  local column = (index - 1) % 2
  local row = math.floor((index - 1) / 2)
  button.Size = UDim2.new(0.5, -4, 0, 44)
  button.Position = UDim2.new(column * 0.5, column == 0 and 0 or 4, 0, row * 50)
  button.BackgroundColor3 = Color3.fromRGB(235, 242, 255)
  button.TextColor3 = Color3.fromRGB(16, 24, 40)
  button.TextWrapped = true
  button.TextScaled = false;button.TextSize=15
  button.Text = CommonUI.ActionLabel(action,index)
  button.Parent = list
  button.Activated:Connect(function() remote:FireServer(action.Id) end)
end
local watched = {"Score","Coins","Level","Progress","Health","Wave","Position","Objective","Combo","EnemyHealth","PuzzleChain","Towers","BaseHealth","SocialBond","SharedObjective","RoundScore","LastApprovedScope"}
local function render()
  status.Text = string.format("Score %d · Lv %d · Progress %d · HP %d · Wave %d", player:GetAttribute("Score") or 0, player:GetAttribute("Level") or 1, player:GetAttribute("Progress") or 0, player:GetAttribute("Health") or 100, player:GetAttribute("Wave") or 1)
end
for _, name in ipairs(watched) do player:GetAttributeChangedSignal(name):Connect(render) end
render()

if #Config.Actions > 0 then
  ContextActionService:BindAction("VibePrimaryAction", function(_, inputState)
    if inputState == Enum.UserInputState.Begin and gui:GetAttribute("GameMenuOpen")~=true then remote:FireServer(Config.Actions[1].Id) end
    return Enum.ContextActionResult.Sink
  end, false, Enum.KeyCode.Space, Enum.KeyCode.ButtonA)
end


-- native-foundation-sentinel-v1 client readiness
local nativeFoundationInput = game:GetService("UserInputService")
local nativeTouchEnabled = nativeFoundationInput.TouchEnabled
local nativeFoundationRemote = ReplicatedStorage:WaitForChild("RuntimeFoundationReport")
local nativeFoundationCamera = workspace.CurrentCamera
local function reportNativeFoundationReady()
  local character = player.Character or player.CharacterAdded:Wait()
  local humanoid = character:WaitForChild("Humanoid")
  if nativeFoundationCamera and nativeFoundationCamera.CameraSubject == humanoid then
    nativeFoundationRemote:FireServer("CAMERA_READY")
  end
  nativeFoundationRemote:FireServer(nativeTouchEnabled and "INPUT_READY_TOUCH" or "INPUT_READY")
end
task.defer(reportNativeFoundationReady)


-- 세계수 지역 · 모바일 전투, 상태, 지역 지도, 환각은 기존 HUD와 기존 RemoteEvent에서 처리
local worldTreeHud = Instance.new("Frame")
worldTreeHud.Name = "WorldTreeHud"
worldTreeHud.BackgroundColor3 = Color3.fromRGB(15, 33, 25)
worldTreeHud.BackgroundTransparency = 0.15
worldTreeHud.AnchorPoint = Vector2.new(1, 0)
worldTreeHud.Position = UDim2.new(1, -12, 0, 12)
worldTreeHud.Size = UDim2.fromOffset(220, 93)
worldTreeHud.Visible = false
worldTreeHud.Parent = gui
local worldTreeCorner = Instance.new("UICorner")
worldTreeCorner.CornerRadius = UDim.new(0, 11)
worldTreeCorner.Parent = worldTreeHud
local worldTreeTitle = Instance.new("TextLabel")
worldTreeTitle.Name = "Region"
worldTreeTitle.Size = UDim2.new(1, -12, 0, 31)
worldTreeTitle.Position = UDim2.fromOffset(6, 2)
worldTreeTitle.BackgroundTransparency = 1
worldTreeTitle.TextScaled = true
worldTreeTitle.TextColor3 = Color3.fromRGB(235, 224, 177)
worldTreeTitle.Text = "세계수"
worldTreeTitle.Parent = worldTreeHud
local worldTreeInfo = Instance.new("TextLabel")
worldTreeInfo.Name = "State"
worldTreeInfo.Size = UDim2.new(1, -12, 0, 26)
worldTreeInfo.Position = UDim2.fromOffset(6, 32)
worldTreeInfo.BackgroundTransparency = 1
worldTreeInfo.TextScaled = true
worldTreeInfo.TextColor3 = Color3.fromRGB(208, 238, 210)
worldTreeInfo.Text = "뿌리 0"
worldTreeInfo.Parent = worldTreeHud
local worldTreeMapButton = Instance.new("TextButton")
worldTreeMapButton.Name = "WorldTreeMapButton"
worldTreeMapButton.Text = "지역 지도"
worldTreeMapButton.TextScaled = true
worldTreeMapButton.TextColor3 = Color3.fromRGB(241, 252, 221)
worldTreeMapButton.BackgroundColor3 = Color3.fromRGB(43, 92, 66)
worldTreeMapButton.Size = UDim2.new(1, -12, 0, 30)
worldTreeMapButton.Position = UDim2.fromOffset(6, 61)
worldTreeMapButton.Parent = worldTreeHud
Instance.new("UICorner", worldTreeMapButton).CornerRadius = UDim.new(0, 7)

local worldTreeAttackButton = Instance.new("TextButton")
worldTreeAttackButton.Name = "WorldTreeAttackButton"
worldTreeAttackButton.AnchorPoint = Vector2.new(1, 1)
worldTreeAttackButton.Position = UDim2.new(1, -12, 0.44, 0)
worldTreeAttackButton.Size = UDim2.fromOffset(86, 66)
worldTreeAttackButton.BackgroundColor3 = Color3.fromRGB(154, 74, 44)
worldTreeAttackButton.TextColor3 = Color3.fromRGB(255, 252, 227)
worldTreeAttackButton.TextScaled = true
worldTreeAttackButton.Text = "공격"
worldTreeAttackButton.Visible = false
worldTreeAttackButton.Parent = gui
Instance.new("UICorner", worldTreeAttackButton).CornerRadius = UDim.new(0, 14)
worldTreeAttackButton.Activated:Connect(function()
  if player:GetAttribute("WorldTreeArea") ~= "surface" then
    remote:FireServer("worldtree-attack")
  end
end)

local worldTreeMap = Instance.new("Frame")
worldTreeMap.Name = "WorldTreeMap"
worldTreeMap.AnchorPoint = Vector2.new(1, 0)
worldTreeMap.Position = UDim2.new(1, -12, 0, 116)
worldTreeMap.Size = UDim2.fromOffset(220, 185)
worldTreeMap.BackgroundColor3 = Color3.fromRGB(20, 46, 31)
worldTreeMap.Visible = false
worldTreeMap.Parent = gui
Instance.new("UICorner", worldTreeMap).CornerRadius = UDim.new(0, 11)
local mapCopy = Instance.new("TextLabel")
mapCopy.Name = "WorldTreeMapContent"
mapCopy.BackgroundTransparency = 1
mapCopy.Size = UDim2.new(1, -20, 1, -16)
mapCopy.Position = UDim2.fromOffset(10, 8)
mapCopy.TextColor3 = Color3.fromRGB(220, 245, 200)
mapCopy.TextXAlignment = Enum.TextXAlignment.Left
mapCopy.TextYAlignment = Enum.TextYAlignment.Top
mapCopy.TextWrapped = true
mapCopy.TextScaled = true
mapCopy.Parent = worldTreeMap

local worldTreeNotice = Instance.new("TextLabel")
worldTreeNotice.Name = "WorldTreeNotice"
worldTreeNotice.AnchorPoint = Vector2.new(0.5, 0)
worldTreeNotice.Position = UDim2.new(0.5, 0, 0, 13)
worldTreeNotice.Size = UDim2.new(0.65, 0, 0, 44)
worldTreeNotice.BackgroundColor3 = Color3.fromRGB(25, 39, 28)
worldTreeNotice.BackgroundTransparency = 0.12
worldTreeNotice.TextColor3 = Color3.fromRGB(255, 239, 174)
worldTreeNotice.TextWrapped = true
worldTreeNotice.TextScaled = true
worldTreeNotice.Visible = false
worldTreeNotice.Parent = gui
Instance.new("UICorner", worldTreeNotice).CornerRadius = UDim.new(0, 11)
local worldNoticeSequence = 0

local function refreshWorldTreeHud()
  local area = player:GetAttribute("WorldTreeArea") or "surface"
  local inside = area == "interior" or area == "underground"
  worldTreeHud.Visible = inside
  worldTreeAttackButton.Visible = inside
  if not inside then worldTreeMap.Visible = false end
  worldTreeTitle.Text = area == "interior" and "세계수 내부" or "세계수 지하"
  local bound = player:GetAttribute("WorldTreeRooted") == true
  local roots = player:GetAttribute("WorldTreeRoots") or 0
  worldTreeInfo.Text = string.format("뿌리 %d | %s", roots, bound and "속박 · 공격 가능" or "이동 가능")
  if area == "interior" then
    mapCopy.Text = "세계수 내부\n북쪽: 지하로 내려가는 뿌리문\n남쪽: 지상으로 나가는 문\n중앙: 거대 꽃, 골렘, 뱀\n\n골렘은 먼저 공격하지 않아."
  elseif area == "underground" then
    mapCopy.Text = "세계수 지하\n북쪽: 고대 뿌리와 봉인 제단\n남쪽: 내부로 돌아가는 문\n뿌리 1개로 녹스바르 소환\n\n보스 처치: " .. tostring(player:GetAttribute("WorldTreeBossClears") or 0)
  end
end
worldTreeMapButton.Activated:Connect(function()
  worldTreeMap.Visible = worldTreeHud.Visible and not worldTreeMap.Visible
end)
for _, attribute in ipairs({"WorldTreeArea", "WorldTreeRoots", "WorldTreeRooted", "WorldTreeBossClears"}) do
  player:GetAttributeChangedSignal(attribute):Connect(refreshWorldTreeHud)
end
refreshWorldTreeHud()

remote.OnClientEvent:Connect(function(kind, payload)
  if kind == "WORLD_TREE_NOTICE" and type(payload) == "string" then
    worldNoticeSequence += 1
    local sequence = worldNoticeSequence
    worldTreeNotice.Text = payload
    worldTreeNotice.Visible = true
    task.delay(2.4, function()
      if sequence == worldNoticeSequence then worldTreeNotice.Visible = false end
    end)
  elseif kind == "WORLD_TREE_HIT" and type(payload) == "table" then
    worldTreeInfo.Text = string.format("%s | 체력 %d/%d", tostring(payload.name), payload.hp or 0, payload.maxHp or 1)
    task.delay(0.7, refreshWorldTreeHud)
  elseif kind == "WORLD_TREE_HALLUCINATION" then
    -- 뿌리를 뱀으로 잘못 인식하는 착시. 클라이언트 효과로만 존재하며 타격/드랍/저장 불가
    local character = player.Character
    local rootPart = character and character:FindFirstChild("HumanoidRootPart")
    if not rootPart or player:GetAttribute("WorldTreeArea") ~= "interior" then return end
    local count = math.clamp(tonumber(payload and payload.count) or 5, 1, 6)
    local seconds = math.clamp(tonumber(payload and payload.seconds) or 3, 0.5, 4)
    for i = 1, count do
      local angle = i * math.pi * 2 / count
      local at = rootPart.Position + Vector3.new(math.cos(angle) * 13, -2, math.sin(angle) * 13)
      local illusion = Instance.new("Part")
      illusion.Name = "RootSnakeIllusion"
      illusion.Size = Vector3.new(2.7, 2.7, 8)
      illusion.CFrame = CFrame.lookAt(at, rootPart.Position)
      illusion.Anchored = true
      illusion.CanCollide = false
      illusion.CanTouch = false
      illusion.CanQuery = false
      illusion.Material = Enum.Material.Neon
      illusion.Color = Color3.fromRGB(80, 178, 103)
      illusion.Transparency = 0.27
      illusion.Parent = workspace
      verifiedLearningTweenService:Create(illusion, TweenInfo.new(seconds), {Transparency=1, Color=Color3.fromRGB(95, 68, 51)}):Play()
      game:GetService("Debris"):AddItem(illusion, seconds + 0.15)
    end
  end
end)


CommonUI.AdaptActionMenu(gui,root,list,title,status,nil,multiplayerStatus,Config.Actions[1]and{label=CommonUI.ActionLabel(Config.Actions[1],1),activate=function()remote:FireServer(Config.Actions[1].Id)end}or nil)
