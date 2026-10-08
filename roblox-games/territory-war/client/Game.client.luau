local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")

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

-- STUDIO_ASSET_BINDING_CLIENT_BEGIN
local STUDIO_ASSET_BINDING_VERSION = 1
local studioAssetConfig = Config.StudioAssets or {}
local studioAssetFamilies = studioAssetConfig.Families or {}
local studioUi = studioAssetFamilies.UI or {}
local function hasStudioAssetAtom(atom)
  return table.find(studioUi, atom) ~= nil
end
-- STUDIO_ASSET_BINDING_CLIENT_END

local remote = ReplicatedStorage:WaitForChild(Config.RemoteName)

local gui = Instance.new("ScreenGui")
gui.Name = "TerritoryWarHud"
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

if hasStudioAssetAtom("FRAME_PANEL") then
  local studioAssetStroke = Instance.new("UIStroke")
  studioAssetStroke.Name = "StudioAssetFramePanel"
  studioAssetStroke.Thickness = 1
  studioAssetStroke.Transparency = 0.55
  studioAssetStroke.Color = Color3.fromRGB(210, 225, 255)
  studioAssetStroke.Parent = root
end
root:SetAttribute("StudioAssetBindingVersion", STUDIO_ASSET_BINDING_VERSION)
root:SetAttribute("StudioAssetAtoms", table.concat(studioUi, ","))

root.AnchorPoint = Vector2.new(0.5, 1)
root.Position = UDim2.fromScale(0.5, 0.98)
root.Size = UDim2.new(1, -24, 0, 320)
root.BackgroundColor3 = Color3.fromRGB(31, 34, 46)
root.BackgroundTransparency = 0.06
root.Parent = gui

local status = Instance.new("TextLabel")
status.Size = UDim2.new(1, -20, 0, 72)
status.Position = UDim2.fromOffset(10, 8)
status.BackgroundTransparency = 1
status.TextColor3 = Color3.fromRGB(245, 246, 250)
status.TextWrapped = true
status.TextScaled = true
status.Parent = root

local order = Instance.new("TextLabel")
order.Size = UDim2.new(1, -20, 0, 38)
order.Position = UDim2.fromOffset(10, 82)
order.BackgroundTransparency = 1
order.TextColor3 = Color3.fromRGB(214, 222, 240)
order.TextScaled = true
order.Parent = root

local actions = {
  {id = Config.Actions.SCOUT, text = "정찰"},
  {id = Config.Actions.ATTACK, text = "공격"},
  {id = Config.Actions.REINFORCE, text = "증원"},
  {id = Config.Actions.ECONOMY, text = "경제"},
}
for index, action in ipairs(actions) do
  local button = Instance.new("TextButton")
  button.Name = action.id
  button.Size = UDim2.new(0.235, 0, 0, 78)
  button.Position = UDim2.new(0.015 + (index - 1) * 0.245, 0, 0, 138)
  button.BackgroundColor3 = Color3.fromRGB(232, 235, 244)
  button.TextColor3 = Color3.fromRGB(27, 30, 40)
  button.TextScaled = true
  button.Text = action.text
  button.Parent = root
  button.Activated:Connect(function()
    remote:FireServer(action.id)
  end)
end

local hint = Instance.new("TextLabel")
hint.Size = UDim2.new(1, -20, 0, 34)
hint.Position = UDim2.fromOffset(10, 232)
hint.BackgroundTransparency = 1
hint.TextColor3 = Color3.fromRGB(190, 198, 218)
hint.TextScaled = true
hint.Text = UserInputService.TouchEnabled and "전선 상태를 보고 터치 명령을 선택해" or "전선 상태를 보고 명령을 선택해"
hint.Parent = root

local multiplayerStatus = Instance.new("TextLabel")
multiplayerStatus.Size = UDim2.new(1, -20, 0, 28)
multiplayerStatus.Position = UDim2.fromOffset(10, 270)
multiplayerStatus.BackgroundTransparency = 1
multiplayerStatus.TextColor3 = Color3.fromRGB(166, 211, 255)
multiplayerStatus.TextScaled = true
multiplayerStatus.Parent = root

local function render()
  status.Text = string.format(
    "영토 %d  병력 %d  자원 %d  경제 Lv.%d  점수 %d  턴 %d",
    player:GetAttribute("Territories") or 1,
    player:GetAttribute("Troops") or 12,
    player:GetAttribute("Resources") or 20,
    player:GetAttribute("EconomyLevel") or 1,
    player:GetAttribute("RoundScore") or 0,
    player:GetAttribute("CampaignTurn") or 1
  )
  order.Text = "결과: " .. tostring(player:GetAttribute("LastOrder") or "READY")
  if player:GetAttribute("MultiplayerActive") == true then
    multiplayerStatus.Text = string.format("경쟁전 동기화 · %d명 · 상대 %s", player:GetAttribute("SyncedParticipantCount") or 2, tostring(player:GetAttribute("OpponentUserId") or 0))
  else
    multiplayerStatus.Text = "솔로 전선 · AI 상대"
  end
end

for _, name in ipairs({"Territories","Troops","Resources","EconomyLevel","EnemyPressure","CampaignTurn","RoundScore","MultiplayerActive","OpponentUserId","LastOrder"}) do
  player:GetAttributeChangedSignal(name):Connect(render)
end

remote.OnClientEvent:Connect(function(kind, snapshot)
  if kind ~= "MULTIPLAYER_SYNC" or typeof(snapshot) ~= "table" then return end
  player:SetAttribute("SyncedParticipantCount", tonumber(snapshot.ParticipantCount) or 1)
  render()
end)

render()
