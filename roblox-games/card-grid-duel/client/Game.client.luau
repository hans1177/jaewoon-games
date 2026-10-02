-- 파일명: roblox-games/card-grid-duel/client/Game.client.luau
-- 역할: 모바일 우선 5×5 보드/손패 UI와 터치 입력

local VerifiedExternalLearningConfig = require(game:GetService("ReplicatedStorage"):WaitForChild("Shared"):WaitForChild("GameConfig"))
-- VERIFIED_EXTERNAL_LEARNING_CLIENT_CONTEXT_BEGIN
local verifiedExternalLearningContext = VerifiedExternalLearningConfig.VerifiedExternalLearning or VerifiedExternalLearningConfig.LearningContext or {}
local verifiedExternalLearningIds = verifiedExternalLearningContext.VerifiedExternalLearningIds or {}
local verifiedExternalLearningPrinciples = verifiedExternalLearningContext.ApplicationPrinciples or {}
local verifiedExternalGameDevelopmentPrinciples = verifiedExternalLearningContext.GameDevelopmentPrinciples or {}
local verifiedExternalLearningMappings = verifiedExternalLearningContext.GameSpecificSemanticMappings or {}
local verifiedExternalLearningDispositions = verifiedExternalLearningContext.LearningDispositions or {}
-- VERIFIED_EXTERNAL_LEARNING_CLIENT_CONTEXT_END

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")

local player = Players.LocalPlayer
player:SetAttribute("JaewoonTouchEnabled", UserInputService.TouchEnabled)

local remotes = ReplicatedStorage:WaitForChild("CardGridRemotes")
local actionRemote = remotes:WaitForChild("Action")
local stateRemote = remotes:WaitForChild("State")
local toastRemote = remotes:WaitForChild("Toast")
local requestState = remotes:WaitForChild("RequestState")

local currentState = nil
local selectedUnitId = nil
local selectedCardIndex = nil
local cellButtons = {}
local handButtons = {}

local function newTextLabel(parent, name, text, size, position)
    local label = Instance.new("TextLabel")
    label.Name = name
    label.BackgroundTransparency = 1
    label.Text = text
    label.TextColor3 = Color3.fromRGB(238, 242, 255)
    label.TextScaled = true
    label.Font = Enum.Font.GothamBold
    label.Size = size
    label.Position = position
    label.Parent = parent

    local constraint = Instance.new("UITextSizeConstraint")
    constraint.MinTextSize = 10
    constraint.MaxTextSize = 22
    constraint.Parent = label

    return label
end

local function round(frame, radius)
    local corner = Instance.new("UICorner")
    corner.CornerRadius = UDim.new(0, radius)
    corner.Parent = frame
end

local gui = Instance.new("ScreenGui")
gui.Name = "CardGridDuelGui"
gui.ResetOnSpawn = false
gui.IgnoreGuiInset = false
gui.Parent = player:WaitForChild("PlayerGui")

local root = Instance.new("Frame")
-- VERIFIED_EXTERNAL_LEARNING_ROBLOX_NATIVE_BEGIN
local verifiedLearningPlayers = game:GetService("Players")
local verifiedLearningTweenService = game:GetService("TweenService")
local verifiedLearningLighting = game:GetService("Lighting")
local verifiedLearningPlayer = verifiedLearningPlayers.LocalPlayer
local verifiedLearningContext = VerifiedExternalLearningConfig.VerifiedExternalLearning or VerifiedExternalLearningConfig.LearningContext or {}
local verifiedLearningPrinciples = verifiedLearningContext.ApplicationPrinciples or {}
local verifiedLearningAxes = verifiedLearningContext.ApplyAxes or {}
local VERIFIED_EXTERNAL_LEARNING_NATIVE_BINDING_VERSION = 6
local verifiedLearningRoot = gui
local verifiedLearningSemanticVariant = "OBJECTIVE_GOAL"
local verifiedLearningSemanticDomain = "CORE_GAMEPLAY_FEEL"
local verifiedLearningSemanticColor = Color3.fromRGB(255, 220, 124)
local verifiedLearningSemanticMood = "READABLE_EXPLORATION"
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
verifiedLearningColorGrade.Saturation = 0.07
verifiedLearningColorGrade.Contrast = 0.05
verifiedLearningColorGrade.Brightness = 0.01
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

root.Name = "Root"
root.Size = UDim2.fromScale(1, 1)
root.BackgroundColor3 = Color3.fromRGB(13, 18, 28)
root.BorderSizePixel = 0
root.Parent = gui

local title = newTextLabel(root, "Title", "카드 격자전", UDim2.fromScale(0.58, 0.055), UDim2.fromScale(0.03, 0.02))
title.TextXAlignment = Enum.TextXAlignment.Left

local turnLabel = newTextLabel(root, "Turn", "상대 기다리는 중", UDim2.fromScale(0.36, 0.055), UDim2.fromScale(0.61, 0.02))
turnLabel.TextXAlignment = Enum.TextXAlignment.Right

local playersLabel = newTextLabel(root, "Players", "", UDim2.fromScale(0.94, 0.035), UDim2.fromScale(0.03, 0.075))
playersLabel.TextXAlignment = Enum.TextXAlignment.Left
playersLabel.TextColor3 = Color3.fromRGB(170, 184, 210)

local statusLabel = newTextLabel(root, "Status", "1대1 매칭 중...", UDim2.fromScale(0.94, 0.045), UDim2.fromScale(0.03, 0.11))
statusLabel.TextColor3 = Color3.fromRGB(255, 219, 120)

local boardFrame = Instance.new("Frame")
boardFrame.Name = "Board"
boardFrame.AnchorPoint = Vector2.new(0.5, 0)
boardFrame.Position = UDim2.fromScale(0.5, 0.165)
boardFrame.Size = UDim2.fromScale(0.92, 0.55)
boardFrame.BackgroundColor3 = Color3.fromRGB(36, 44, 59)
boardFrame.BorderSizePixel = 0
boardFrame.Parent = root
round(boardFrame, 14)

local boardAspect = Instance.new("UIAspectRatioConstraint")
boardAspect.AspectRatio = 1
boardAspect.DominantAxis = Enum.DominantAxis.Width
boardAspect.Parent = boardFrame

local boardPadding = Instance.new("UIPadding")
boardPadding.PaddingTop = UDim.new(0, 6)
boardPadding.PaddingBottom = UDim.new(0, 6)
boardPadding.PaddingLeft = UDim.new(0, 6)
boardPadding.PaddingRight = UDim.new(0, 6)
boardPadding.Parent = boardFrame

local boardGrid = Instance.new("UIGridLayout")
boardGrid.CellPadding = UDim2.new(0.012, 0, 0.012, 0)
boardGrid.CellSize = UDim2.new(0.1904, 0, 0.1904, 0)
boardGrid.FillDirectionMaxCells = 5
boardGrid.SortOrder = Enum.SortOrder.LayoutOrder
boardGrid.Parent = boardFrame

local handFrame = Instance.new("Frame")
handFrame.Name = "Hand"
handFrame.AnchorPoint = Vector2.new(0.5, 1)
handFrame.Position = UDim2.fromScale(0.5, 0.91)
handFrame.Size = UDim2.fromScale(0.94, 0.18)
handFrame.BackgroundColor3 = Color3.fromRGB(24, 31, 44)
handFrame.BorderSizePixel = 0
handFrame.Parent = root
round(handFrame, 12)

local handPadding = Instance.new("UIPadding")
handPadding.PaddingTop = UDim.new(0, 7)
handPadding.PaddingBottom = UDim.new(0, 7)
handPadding.PaddingLeft = UDim.new(0, 7)
handPadding.PaddingRight = UDim.new(0, 7)
handPadding.Parent = handFrame

local handLayout = Instance.new("UIListLayout")
handLayout.FillDirection = Enum.FillDirection.Horizontal
handLayout.HorizontalAlignment = Enum.HorizontalAlignment.Center
handLayout.VerticalAlignment = Enum.VerticalAlignment.Center
handLayout.Padding = UDim.new(0.012, 0)
handLayout.Parent = handFrame

local endTurnButton = Instance.new("TextButton")
endTurnButton.Name = "EndTurn"
endTurnButton.AnchorPoint = Vector2.new(1, 1)
endTurnButton.Position = UDim2.fromScale(0.97, 0.985)
endTurnButton.Size = UDim2.fromScale(0.27, 0.06)
endTurnButton.BackgroundColor3 = Color3.fromRGB(69, 99, 255)
endTurnButton.TextColor3 = Color3.new(1, 1, 1)
endTurnButton.Font = Enum.Font.GothamBold
endTurnButton.Text = "턴 종료"
endTurnButton.TextScaled = true
endTurnButton.BorderSizePixel = 0
endTurnButton.Parent = root
round(endTurnButton, 10)

local endConstraint = Instance.new("UITextSizeConstraint")
endConstraint.MinTextSize = 11
endConstraint.MaxTextSize = 20
endConstraint.Parent = endTurnButton

local helpLabel = newTextLabel(root, "Help", "유닛 선택 → 빈칸 이동 / 적 선택 공격", UDim2.fromScale(0.64, 0.05), UDim2.fromScale(0.03, 0.935))
helpLabel.TextXAlignment = Enum.TextXAlignment.Left
helpLabel.TextColor3 = Color3.fromRGB(142, 156, 183)

local function makeCell(index)
    local button = Instance.new("TextButton")
    button.Name = "Cell" .. index
    button.LayoutOrder = index
    button.AutoButtonColor = false
    button.BackgroundColor3 = Color3.fromRGB(52, 62, 80)
    button.BorderSizePixel = 0
    button.Text = ""
    button.TextWrapped = true
    button.TextScaled = true
    button.Font = Enum.Font.GothamBold
    button.TextColor3 = Color3.new(1, 1, 1)
    button.Parent = boardFrame
    round(button, 8)

    local stroke = Instance.new("UIStroke")
    stroke.Name = "SelectionStroke"
    stroke.Thickness = 2
    stroke.Transparency = 1
    stroke.Color = Color3.fromRGB(255, 222, 105)
    stroke.Parent = button

    local textConstraint = Instance.new("UITextSizeConstraint")
    textConstraint.MinTextSize = 9
    textConstraint.MaxTextSize = 18
    textConstraint.Parent = button

    cellButtons[index] = button
end

for i = 1, 25 do
    makeCell(i)
end

local function indexFor(row, col)
    return (row - 1) * 5 + col
end

local function findUnitAt(row, col)
    if not currentState or not currentState.units then
        return nil
    end
    for _, unit in ipairs(currentState.units) do
        if unit.row == row and unit.col == col then
            return unit
        end
    end
    return nil
end

local function findUnitById(unitId)
    if not currentState or not currentState.units then
        return nil
    end
    for _, unit in ipairs(currentState.units) do
        if unit.id == unitId then
            return unit
        end
    end
    return nil
end

local function clearHandButtons()
    for _, button in ipairs(handButtons) do
        button:Destroy()
    end
    table.clear(handButtons)
end

local function setStatus(text)
    statusLabel.Text = text
end

local function isMyTurn()
    return currentState
        and not currentState.waiting
        and not currentState.winnerSide
        and currentState.currentSide == currentState.youSide
end

local function renderHand()
    clearHandButtons()

    if not currentState or currentState.waiting then
        handFrame.Visible = false
        return
    end

    handFrame.Visible = true
    local hand = currentState.hand or {}
    for index, card in ipairs(hand) do
        local button = Instance.new("TextButton")
        button.Name = "Card" .. index
        button.Size = UDim2.new(0.185, 0, 0.9, 0)
        button.BackgroundColor3 = index == selectedCardIndex
            and Color3.fromRGB(178, 137, 48)
            or Color3.fromRGB(46, 57, 76)
        button.BorderSizePixel = 0
        button.AutoButtonColor = true
        button.TextColor3 = Color3.new(1, 1, 1)
        button.Font = Enum.Font.GothamBold
        button.TextWrapped = true
        button.TextScaled = true
        button.Text = card.name
            .. "\nHP " .. card.hp
            .. "  공격 " .. card.damage
            .. "\n사거리 " .. card.range
        button.Parent = handFrame
        round(button, 8)

        local constraint = Instance.new("UITextSizeConstraint")
        constraint.MinTextSize = 8
        constraint.MaxTextSize = 15
        constraint.Parent = button

        button.Activated:Connect(function()
            if not isMyTurn() then
                setStatus("지금은 상대 턴이야.")
                return
            end
            if currentState.summonUsed then
                setStatus("이번 턴에는 이미 소환했어.")
                return
            end
            selectedUnitId = nil
            selectedCardIndex = index
            setStatus(card.name .. " 선택 · 자기 진영 첫 줄의 빈칸을 눌러")
            renderHand()
            for cellIndex, cellButton in ipairs(cellButtons) do
                local row = math.floor((cellIndex - 1) / 5) + 1
                local stroke = cellButton:FindFirstChild("SelectionStroke")
                if stroke then
                    stroke.Transparency = row == currentState.homeRow and not findUnitAt(row, ((cellIndex - 1) % 5) + 1) and 0 or 1
                end
            end
        end)

        table.insert(handButtons, button)
    end
end

local function renderBoard()
    for index, button in ipairs(cellButtons) do
        local row = math.floor((index - 1) / 5) + 1
        local col = ((index - 1) % 5) + 1
        local unit = findUnitAt(row, col)
        local stroke = button:FindFirstChild("SelectionStroke")

        if unit then
            local isMine = currentState and unit.side == currentState.youSide
            if unit.side == "BLUE" then
                button.BackgroundColor3 = Color3.fromRGB(52, 91, 165)
            else
                button.BackgroundColor3 = Color3.fromRGB(153, 65, 69)
            end

            local flags = ""
            if unit.frozen then
                flags ..= "\n봉인"
            elseif unit.id == selectedUnitId then
                flags ..= "\n선택"
            elseif unit.moved and unit.attacked then
                flags ..= "\n행동완료"
            end

            button.Text = unit.short
                .. "  " .. unit.hp .. "/" .. unit.maxHp
                .. "\n공" .. unit.damage .. "  사" .. unit.range
                .. flags
            button.TextTransparency = isMine and 0 or 0.02
        else
            if currentState and row == currentState.homeRow then
                button.BackgroundColor3 = Color3.fromRGB(57, 74, 68)
            else
                button.BackgroundColor3 = Color3.fromRGB(52, 62, 80)
            end
            button.Text = ""
        end

        if stroke then
            stroke.Transparency = unit and unit.id == selectedUnitId and 0 or 1
        end
    end
end

local function renderHeader()
    if not currentState or currentState.waiting then
        turnLabel.Text = "매칭 대기"
        playersLabel.Text = "상대를 찾는 중..."
        endTurnButton.Visible = false
        return
    end

    local blueName = currentState.players and currentState.players.BLUE or "파랑"
    local redName = currentState.players and currentState.players.RED or "빨강"
    playersLabel.Text = "파랑 " .. blueName .. "  VS  빨강 " .. redName
    endTurnButton.Visible = not currentState.winnerSide

    if currentState.winnerSide then
        turnLabel.Text = "대전 종료"
        setStatus((currentState.winnerName or "") .. " 승리")
        return
    end

    local myTurn = currentState.currentSide == currentState.youSide
    turnLabel.Text = "턴 " .. tostring(currentState.turn) .. (myTurn and " · 내 턴" or " · 상대 턴")

    if myTurn then
        if selectedCardIndex then
            setStatus("카드 선택됨 · 자기 진영 첫 줄에 소환")
        elseif selectedUnitId then
            local unit = findUnitById(selectedUnitId)
            if unit then
                setStatus(unit.name .. " 선택 · 1칸 이동하거나 사거리 안 적을 공격")
            else
                selectedUnitId = nil
                setStatus("내 턴")
            end
        else
            setStatus("내 턴 · 카드 소환 또는 유닛 선택")
        end
    else
        selectedCardIndex = nil
        selectedUnitId = nil
        setStatus("상대 행동을 기다리는 중...")
    end
end

local function render()
    renderHeader()
    renderBoard()
    renderHand()
end

local function clickCell(row, col)
    if not currentState or currentState.waiting or currentState.winnerSide then
        return
    end
    if not isMyTurn() then
        setStatus("지금은 상대 턴이야.")
        return
    end

    local unit = findUnitAt(row, col)

    if selectedCardIndex then
        if row ~= currentState.homeRow then
            setStatus("자기 진영 첫 줄에만 소환할 수 있어.")
            return
        end
        if unit then
            setStatus("이미 유닛이 있는 칸이야.")
            return
        end

        actionRemote:FireServer({
            type = "SUMMON",
            cardIndex = selectedCardIndex,
            row = row,
            col = col,
        })
        selectedCardIndex = nil
        return
    end

    if unit and unit.side == currentState.youSide then
        selectedUnitId = unit.id
        setStatus(unit.name .. " 선택")
        render()
        return
    end

    if not selectedUnitId then
        setStatus("먼저 내 유닛이나 카드를 선택해.")
        return
    end

    if unit then
        actionRemote:FireServer({
            type = "ATTACK",
            unitId = selectedUnitId,
            targetUnitId = unit.id,
        })
    else
        actionRemote:FireServer({
            type = "MOVE",
            unitId = selectedUnitId,
            row = row,
            col = col,
        })
    end
end

for index, button in ipairs(cellButtons) do
    button.Activated:Connect(function()
        local row = math.floor((index - 1) / 5) + 1
        local col = ((index - 1) % 5) + 1
        clickCell(row, col)
    end)
end

endTurnButton.Activated:Connect(function()
    if isMyTurn() then
        selectedUnitId = nil
        selectedCardIndex = nil
        actionRemote:FireServer({
            type = "END_TURN",
        })
    else
        setStatus("지금은 상대 턴이야.")
    end
end)

stateRemote.OnClientEvent:Connect(function(snapshot)
    if type(snapshot) ~= "table" then
        return
    end
    currentState = snapshot

    if selectedUnitId and not findUnitById(selectedUnitId) then
        selectedUnitId = nil
    end
    if selectedCardIndex and currentState.hand and selectedCardIndex > #currentState.hand then
        selectedCardIndex = nil
    end

    render()
end)

toastRemote.OnClientEvent:Connect(function(message)
    if type(message) == "string" then
        setStatus(message)
    end
end)

local ok, snapshot = pcall(function()
    return requestState:InvokeServer()
end)

if ok and type(snapshot) == "table" then
    currentState = snapshot
end

render()
