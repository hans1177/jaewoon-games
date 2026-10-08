-- 파일명: roblox-games/star-frontier/client/Game.client.luau
-- 역할: 별길 개척자 모바일 우선 HUD / 우주선 조작 / 카메라

-- =========================================================
-- 서비스 / 설정
-- =========================================================
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")
local RunService = game:GetService("RunService")
local Workspace = game:GetService("Workspace")

local player = Players.LocalPlayer
local camera = Workspace.CurrentCamera
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

pcall(function()
    local playerModule = require(player:WaitForChild("PlayerScripts"):WaitForChild("PlayerModule"))
    playerModule:GetControls():Disable()
end)

local worldRoot = Workspace:WaitForChild("StarFrontierWorld")
local shipFolder = worldRoot:WaitForChild("PlayerShips")
local ship = shipFolder:WaitForChild(tostring(player.UserId))
while not ship.PrimaryPart do
    ship:GetPropertyChangedSignal("PrimaryPart"):Wait()
end

-- =========================================================
-- UI 유틸
-- =========================================================
local gui = Instance.new("ScreenGui")
gui.Name = "StarFrontierHud"
gui.ResetOnSpawn = false
gui.IgnoreGuiInset = false
gui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
gui.Parent = player:WaitForChild("PlayerGui")

local function corner(instance, radius)
    local uiCorner = Instance.new("UICorner")
    uiCorner.CornerRadius = UDim.new(0, radius)
    uiCorner.Parent = instance
end

local function stroke(instance, color, transparency)
    local uiStroke = Instance.new("UIStroke")
    uiStroke.Thickness = 1.5
    uiStroke.Color = color
    uiStroke.Transparency = transparency or 0
    uiStroke.Parent = instance
end

local function makeLabel(parent, name, size, position, text, textSize, alignment)
    local label = Instance.new("TextLabel")
    label.Name = name
    label.Size = size
    label.Position = position
    label.BackgroundTransparency = 1
    label.TextColor3 = Color3.fromRGB(236, 245, 255)
    label.TextSize = textSize
    label.Font = Enum.Font.GothamBold
    label.TextXAlignment = alignment or Enum.TextXAlignment.Left
    label.Text = text
    label.Parent = parent
    return label
end

local function makeButton(parent, name, text, size, position, color)
    local button = Instance.new("TextButton")
    button.Name = name
    button.Size = size
    button.Position = position
    button.BackgroundColor3 = color
    button.AutoButtonColor = true
    button.TextColor3 = Color3.fromRGB(248, 251, 255)
    button.TextSize = 18
    button.Font = Enum.Font.GothamBold
    button.TextWrapped = true
    button.Text = text
    corner(button, 12)
    stroke(button, Color3.fromRGB(215, 238, 255), 0.55)
    button.Parent = parent
    return button
end

-- =========================================================
-- 상단 상태 HUD
-- =========================================================
local topPanel = Instance.new("Frame")
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
local verifiedLearningSemanticVariant = "OBJECTIVE_GOAL"
local verifiedLearningSemanticDomain = "CORE_GAMEPLAY_FEEL"
local verifiedLearningSemanticColor = Color3.fromRGB(255, 220, 124)
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

-- Roblox UI / touch / progression guidance.
local verifiedLearningGuidance = Instance.new("TextLabel")
verifiedLearningGuidance.Name = "VerifiedLearningGuidance"
verifiedLearningGuidance.Size = UDim2.new(1, -20, 0, 30)
verifiedLearningGuidance.Position = UDim2.fromOffset(10, 8)
verifiedLearningGuidance.BackgroundTransparency = 1
verifiedLearningGuidance.TextWrapped = true
verifiedLearningGuidance.TextScaled = true
verifiedLearningGuidance.TextColor3 = verifiedLearningSemanticColor
verifiedLearningGuidance:SetAttribute("VerifiedLearningSemanticMood", verifiedLearningSemanticMood)
if verifiedLearningSemanticVariant == "PUZZLE_STATE" then
  verifiedLearningGuidance.Text = "퍼즐 보드와 현재 이동을 함께 확인"
elseif verifiedLearningSemanticVariant == "DEFENSE_WAVE" then
  verifiedLearningGuidance.Text = "웨이브와 기지 상태를 보며 배치"
elseif verifiedLearningSemanticVariant == "COMBAT_IMPACT" then
  verifiedLearningGuidance.Text = "공격 방향과 타격 응답을 확인"
elseif verifiedLearningSemanticVariant == "PROGRESSION_RISK" then
  verifiedLearningGuidance.Text = "레벨과 다음 성장 조건을 확인"
elseif verifiedLearningSemanticVariant == "ECONOMY_RESOURCE" then
  verifiedLearningGuidance.Text = "자원과 업그레이드 상태를 확인"
elseif verifiedLearningSemanticVariant == "SURVIVAL_RISK" then
  verifiedLearningGuidance.Text = "체력과 위협 상태를 확인"
elseif verifiedLearningSemanticVariant == "MOVEMENT_SPATIAL" then
  verifiedLearningGuidance.Text = "이동 방향과 공간 응답을 확인"
elseif verifiedLearningSemanticVariant == "SOCIAL_CONTEXT" then
  verifiedLearningGuidance.Text = "공유 세션과 내 역할을 확인"
else
  verifiedLearningGuidance.Text = "현재 목표와 다음 행동을 확인"
end
verifiedLearningGuidance.Parent = verifiedLearningRoot
local verifiedLearningRiskCue = Instance.new("TextLabel")
verifiedLearningRiskCue.Name = "VerifiedLearningProgressionRiskCue"
verifiedLearningRiskCue.Size = UDim2.new(1, -20, 0, 26)
verifiedLearningRiskCue.Position = UDim2.fromOffset(10, 40)
verifiedLearningRiskCue.BackgroundTransparency = 1
verifiedLearningRiskCue.TextWrapped = true
verifiedLearningRiskCue.TextScaled = true
verifiedLearningRiskCue.TextColor3 = verifiedLearningSemanticColor
if verifiedLearningSemanticVariant == "DEFENSE_WAVE" then
  verifiedLearningRiskCue.Text = "배치 전 웨이브·기지 위험 확인"
elseif verifiedLearningSemanticVariant == "SURVIVAL_RISK" then
  verifiedLearningRiskCue.Text = "행동 전 체력·위협 위험 확인"
elseif verifiedLearningSemanticVariant == "PROGRESSION_RISK" then
  verifiedLearningRiskCue.Text = "행동 전 레벨·성장 조건 확인"
else
  verifiedLearningRiskCue.Text = "현재 상태와 다음 행동 확인"
end
verifiedLearningRiskCue.Visible = verifiedLearningSemanticVariant == "DEFENSE_WAVE" or verifiedLearningSemanticVariant == "SURVIVAL_RISK" or verifiedLearningSemanticVariant == "PROGRESSION_RISK"
verifiedLearningRiskCue.Parent = verifiedLearningRoot

-- Roblox skill VFX / camera / motion feedback.
local function playVerifiedLearningActionFeedback(control)
  verifiedLearningRoot:SetAttribute("VerifiedExternalLearningLastControl", control and control.Name or "GAMEPLAY_STATE")
  verifiedLearningRoot:SetAttribute("VerifiedExternalLearningInputRespondedAt", os.clock())
  verifiedLearningGuidance.Visible = false

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

  if verifiedLearningSemanticVariant == "ECONOMY_RESOURCE" or verifiedLearningSemanticVariant == "PUZZLE_STATE" or verifiedLearningSemanticVariant == "PROGRESSION_RISK" then
    verifiedLearningRiskCue.Visible = true
    verifiedLearningRiskCue.TextColor3 = verifiedLearningSemanticColor
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
  playVerifiedLearningActionFeedback(verifiedLearningLastControl)
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

topPanel.Name = "TopPanel"
topPanel.Position = UDim2.fromOffset(12, 10)
topPanel.Size = UDim2.new(0, 330, 0, 156)
topPanel.BackgroundColor3 = Color3.fromRGB(10, 17, 34)
topPanel.BackgroundTransparency = 0.12
corner(topPanel, 16)
stroke(topPanel, Color3.fromRGB(74, 195, 255), 0.35)
topPanel.Parent = gui

local titleLabel = makeLabel(topPanel, "Title", UDim2.new(1, -20, 0, 30), UDim2.fromOffset(10, 8), "별길 개척자", 22)
titleLabel.TextColor3 = Color3.fromRGB(122, 222, 255)
local sectorLabel = makeLabel(topPanel, "Sector", UDim2.new(1, -20, 0, 24), UDim2.fromOffset(10, 40), "성역", 16)
local moneyLabel = makeLabel(topPanel, "Money", UDim2.new(1, -20, 0, 24), UDim2.fromOffset(10, 66), "", 16)
local shipLabel = makeLabel(topPanel, "Ship", UDim2.new(1, -20, 0, 24), UDim2.fromOffset(10, 92), "", 16)
local hullLabel = makeLabel(topPanel, "Hull", UDim2.new(1, -20, 0, 24), UDim2.fromOffset(10, 118), "", 16)

local noticeLabel = makeLabel(gui, "Notice", UDim2.new(0.72, 0, 0, 46), UDim2.new(0.14, 0, 0, 176), "운석을 채굴해서 정거장에 판매해.", 17, Enum.TextXAlignment.Center)
noticeLabel.BackgroundTransparency = 0.18
noticeLabel.BackgroundColor3 = Color3.fromRGB(11, 21, 43)
noticeLabel.TextWrapped = true
corner(noticeLabel, 13)
stroke(noticeLabel, Color3.fromRGB(106, 205, 255), 0.48)

-- =========================================================
-- 좌측 이동 패드
-- =========================================================
local movePanel = Instance.new("Frame")
movePanel.Name = "MovePanel"
movePanel.AnchorPoint = Vector2.new(0, 1)
movePanel.Position = UDim2.new(0, 14, 1, -16)
movePanel.Size = UDim2.fromOffset(220, 214)
movePanel.BackgroundColor3 = Color3.fromRGB(8, 14, 29)
movePanel.BackgroundTransparency = 0.35
corner(movePanel, 18)
movePanel.Parent = gui

local forwardButton = makeButton(movePanel, "Forward", "▲", UDim2.fromOffset(66, 58), UDim2.fromOffset(77, 8), Color3.fromRGB(42, 95, 145))
local leftButton = makeButton(movePanel, "Left", "◀", UDim2.fromOffset(66, 58), UDim2.fromOffset(8, 69), Color3.fromRGB(42, 95, 145))
local rightButton = makeButton(movePanel, "Right", "▶", UDim2.fromOffset(66, 58), UDim2.fromOffset(146, 69), Color3.fromRGB(42, 95, 145))
local backButton = makeButton(movePanel, "Back", "▼", UDim2.fromOffset(66, 58), UDim2.fromOffset(77, 130), Color3.fromRGB(42, 95, 145))
local upButton = makeButton(movePanel, "Up", "상승", UDim2.fromOffset(62, 42), UDim2.fromOffset(8, 166), Color3.fromRGB(57, 80, 126))
local downButton = makeButton(movePanel, "Down", "하강", UDim2.fromOffset(62, 42), UDim2.fromOffset(150, 166), Color3.fromRGB(57, 80, 126))

-- =========================================================
-- 우측 액션 패드
-- =========================================================
local actionPanel = Instance.new("Frame")
actionPanel.Name = "ActionPanel"
actionPanel.AnchorPoint = Vector2.new(1, 1)
actionPanel.Position = UDim2.new(1, -14, 1, -16)
actionPanel.Size = UDim2.fromOffset(236, 214)
actionPanel.BackgroundColor3 = Color3.fromRGB(8, 14, 29)
actionPanel.BackgroundTransparency = 0.35
corner(actionPanel, 18)
actionPanel.Parent = gui

local mineButton = makeButton(actionPanel, "Mine", "채굴", UDim2.fromOffset(108, 62), UDim2.fromOffset(8, 8), Color3.fromRGB(26, 137, 157))
local fireButton = makeButton(actionPanel, "Fire", "레이저", UDim2.fromOffset(108, 62), UDim2.fromOffset(120, 8), Color3.fromRGB(174, 54, 83))
local boostButton = makeButton(actionPanel, "Boost", "부스트", UDim2.fromOffset(108, 54), UDim2.fromOffset(8, 78), Color3.fromRGB(93, 66, 182))
local repairButton = makeButton(actionPanel, "Repair", "수리", UDim2.fromOffset(108, 54), UDim2.fromOffset(120, 78), Color3.fromRGB(72, 117, 93))
local sellButton = makeButton(actionPanel, "Sell", "광석 판매", UDim2.fromOffset(108, 66), UDim2.fromOffset(8, 140), Color3.fromRGB(170, 119, 42))
local upgradeButton = makeButton(actionPanel, "Upgrade", "업그레이드", UDim2.fromOffset(108, 66), UDim2.fromOffset(120, 140), Color3.fromRGB(58, 112, 181))

-- =========================================================
-- 업그레이드 창
-- =========================================================
local upgradePanel = Instance.new("Frame")
upgradePanel.Name = "UpgradePanel"
upgradePanel.AnchorPoint = Vector2.new(0.5, 0.5)
upgradePanel.Position = UDim2.fromScale(0.5, 0.52)
upgradePanel.Size = UDim2.new(0, 320, 0, 230)
upgradePanel.BackgroundColor3 = Color3.fromRGB(11, 20, 39)
upgradePanel.Visible = false
corner(upgradePanel, 18)
stroke(upgradePanel, Color3.fromRGB(95, 192, 255), 0.28)
upgradePanel.Parent = gui

local upgradeTitle = makeLabel(upgradePanel, "Title", UDim2.new(1, -60, 0, 38), UDim2.fromOffset(18, 12), "정거장 업그레이드", 20)
local closeUpgrade = makeButton(upgradePanel, "Close", "×", UDim2.fromOffset(42, 42), UDim2.new(1, -52, 0, 8), Color3.fromRGB(92, 60, 76))
local shipUpgrade = makeButton(upgradePanel, "ShipUpgrade", "우주선 강화", UDim2.new(1, -36, 0, 66), UDim2.fromOffset(18, 68), Color3.fromRGB(46, 96, 151))
local laserUpgrade = makeButton(upgradePanel, "LaserUpgrade", "레이저 강화", UDim2.new(1, -36, 0, 66), UDim2.fromOffset(18, 146), Color3.fromRGB(151, 61, 92))

-- =========================================================
-- 입력 상태
-- =========================================================
local held = {
    Forward = false,
    Back = false,
    Left = false,
    Right = false,
    Up = false,
    Down = false,
    Boost = false,
}

local keyMap = {
    [Enum.KeyCode.W] = "Forward",
    [Enum.KeyCode.S] = "Back",
    [Enum.KeyCode.A] = "Left",
    [Enum.KeyCode.D] = "Right",
    [Enum.KeyCode.E] = "Up",
    [Enum.KeyCode.Q] = "Down",
    [Enum.KeyCode.LeftShift] = "Boost",
    [Enum.KeyCode.ButtonL2] = "Boost",
}

local function bindHold(button, stateName)
    button.InputBegan:Connect(function(input)
        if input.UserInputType == Enum.UserInputType.Touch or input.UserInputType == Enum.UserInputType.MouseButton1 then
            held[stateName] = true
        end
    end)
    button.InputEnded:Connect(function(input)
        if input.UserInputType == Enum.UserInputType.Touch or input.UserInputType == Enum.UserInputType.MouseButton1 then
            held[stateName] = false
        end
    end)
end

bindHold(forwardButton, "Forward")
bindHold(backButton, "Back")
bindHold(leftButton, "Left")
bindHold(rightButton, "Right")
bindHold(upButton, "Up")
bindHold(downButton, "Down")
bindHold(boostButton, "Boost")

UserInputService.InputBegan:Connect(function(input, processed)
    if processed then
        return
    end
    local stateName = keyMap[input.KeyCode]
    if stateName then
        held[stateName] = true
    elseif input.KeyCode == Enum.KeyCode.F then
        remote:FireServer("FIRE")
    elseif input.KeyCode == Enum.KeyCode.R then
        remote:FireServer("MINE")
    end
end)

UserInputService.InputEnded:Connect(function(input)
    local stateName = keyMap[input.KeyCode]
    if stateName then
        held[stateName] = false
    end
end)

mineButton.Activated:Connect(function()
    remote:FireServer("MINE")
end)

fireButton.Activated:Connect(function()
    remote:FireServer("FIRE")
end)

sellButton.Activated:Connect(function()
    remote:FireServer("SELL")
end)

repairButton.Activated:Connect(function()
    remote:FireServer("REPAIR")
end)

upgradeButton.Activated:Connect(function()
    if player:GetAttribute("Docked") then
        upgradePanel.Visible = not upgradePanel.Visible
    else
        noticeLabel.Text = "정거장 도킹 범위에서만 업그레이드할 수 있어."
    end
end)

closeUpgrade.Activated:Connect(function()
    upgradePanel.Visible = false
end)

shipUpgrade.Activated:Connect(function()
    remote:FireServer("UPGRADE_SHIP")
end)

laserUpgrade.Activated:Connect(function()
    remote:FireServer("UPGRADE_LASER")
end)

-- =========================================================
-- 상태 렌더링
-- =========================================================
local function shipUpgradeText()
    local tier = player:GetAttribute("ShipTier") or 1
    local cost = Config.Economy.ShipUpgradeCosts[tier]
    if cost then
        return string.format("우주선 T%d → T%d\n%d 크레딧", tier, tier + 1, cost)
    end
    return string.format("우주선 T%d\n최고 티어", tier)
end

local function laserUpgradeText()
    local level = player:GetAttribute("LaserLevel") or 1
    local cost = Config.Economy.LaserUpgradeCosts[level]
    if cost then
        return string.format("레이저 Lv.%d → Lv.%d\n%d 크레딧", level, level + 1, cost)
    end
    return string.format("레이저 Lv.%d\n최고 레벨", level)
end

local function renderHud()
    local credits = player:GetAttribute("Credits") or 0
    local ore = player:GetAttribute("Ore") or 0
    local cargo = player:GetAttribute("CargoCapacity") or Config.Mining.CargoBase
    local tier = player:GetAttribute("ShipTier") or 1
    local laser = player:GetAttribute("LaserLevel") or 1
    local hull = player:GetAttribute("Hull") or Config.Ship.BaseHull
    local hullMax = player:GetAttribute("HullMax") or Config.Ship.BaseHull
    local energy = player:GetAttribute("Energy") or Config.Ship.MaxEnergy
    local sectorName = player:GetAttribute("SectorName") or "청람 성역"
    local docked = player:GetAttribute("Docked") == true

    sectorLabel.Text = string.format("%s%s", sectorName, docked and " · 도킹" or "")
    moneyLabel.Text = string.format("크레딧 %d   ·   광석 %d/%d", credits, ore, cargo)
    shipLabel.Text = string.format("우주선 T%d   ·   레이저 Lv.%d   ·   에너지 %d", tier, laser, energy)
    hullLabel.Text = string.format("선체 %d / %d", hull, hullMax)
    sellButton.BackgroundColor3 = docked and Color3.fromRGB(170, 119, 42) or Color3.fromRGB(72, 70, 74)
    repairButton.BackgroundColor3 = docked and Color3.fromRGB(72, 117, 93) or Color3.fromRGB(65, 67, 70)
    upgradeButton.BackgroundColor3 = docked and Color3.fromRGB(58, 112, 181) or Color3.fromRGB(65, 67, 70)
    if not docked then
        upgradePanel.Visible = false
    end
    shipUpgrade.Text = shipUpgradeText()
    laserUpgrade.Text = laserUpgradeText()
end

for _, attributeName in ipairs({
    "Credits",
    "Ore",
    "CargoCapacity",
    "ShipTier",
    "LaserLevel",
    "Hull",
    "HullMax",
    "Energy",
    "SectorName",
    "Docked",
}) do
    player:GetAttributeChangedSignal(attributeName):Connect(renderHud)
end
renderHud()

local noticeSerial = 0
remote.OnClientEvent:Connect(function(kind, payload)
    if kind ~= "NOTICE" then
        return
    end
    noticeSerial += 1
    local serial = noticeSerial
    noticeLabel.Text = tostring(payload)
    task.delay(3.2, function()
        if serial == noticeSerial then
            noticeLabel.Text = "채굴 · 판매 · 강화 · 더 먼 성역 탐험"
        end
    end)
end)

-- =========================================================
-- 카메라 / 조작 전송
-- =========================================================
camera.CameraType = Enum.CameraType.Scriptable
local lastControlSend = 0

local function controlAxes()
    local throttle = 0
    local turn = 0
    local vertical = 0
    if held.Forward then throttle += 1 end
    if held.Back then throttle -= 1 end
    if held.Right then turn -= 1 end
    if held.Left then turn += 1 end
    if held.Up then vertical += 1 end
    if held.Down then vertical -= 1 end
    return throttle, turn, vertical
end

RunService.RenderStepped:Connect(function()
    if not ship.Parent or not ship.PrimaryPart then
        return
    end
    local shipCFrame = ship.PrimaryPart.CFrame
    local desiredPosition = (shipCFrame * CFrame.new(0, 22, 40)).Position
    local focus = ship.PrimaryPart.Position + shipCFrame.LookVector * 18
    local desired = CFrame.lookAt(desiredPosition, focus)
    camera.CFrame = camera.CFrame:Lerp(desired, 0.14)

    local now = os.clock()
    if now - lastControlSend >= 0.08 then
        lastControlSend = now
        local throttle, turn, vertical = controlAxes()
        remote:FireServer("CONTROL", {
            Throttle = throttle,
            Turn = turn,
            Vertical = vertical,
            Boost = held.Boost,
        })
    end
end)
