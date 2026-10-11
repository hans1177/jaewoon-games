local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")

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
  MATERIAL = "NOT_APPLICABLE",
  AUDIO = "NOT_APPLICABLE",
  VFX = "NOT_APPLICABLE",
  UI = "APPLIED",
  MOTION = "NOT_APPLICABLE",
  PROP = "NOT_APPLICABLE",
}
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
local verifiedLearningSemanticVariant = "DEFENSE_WAVE"
local verifiedLearningSemanticDomain = "CORE_GAMEPLAY_FEEL"
local verifiedLearningSemanticColor = Color3.fromRGB(255, 148, 74)
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
verifiedLearningRoot:SetAttribute("VerifiedLearningProgressionRiskCue", verifiedLearningSemanticVariant)

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
  local button = CommonUI.CreatePrimaryButton({minWidth=44,minHeight=52})
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

-- 전선 정보는 위에, 전투 명령은 오른손 위치에 둔다.
local commandDock=Instance.new("Frame");commandDock.Name="CommandDock";commandDock.BackgroundTransparency=1;commandDock.Parent=gui
local commandButtons={}
for _,child in ipairs(root:GetChildren())do if child:IsA("TextButton")then table.insert(commandButtons,child)end end
table.sort(commandButtons,function(a,b)return a.Position.X.Scale<b.Position.X.Scale end)
for _,button in ipairs(commandButtons)do button.Parent=commandDock;button.TextScaled=false;button.TextSize=14;button.TextWrapped=true end
local function layoutOrders()
 local v=gui.AbsoluteSize;if v.X<=0 or v.Y<=0 then return end
 gui.ScreenInsets=Enum.ScreenInsets.CoreUISafeInsets
 local landscape=v.X>v.Y
 root.AnchorPoint=Vector2.zero;root.Position=UDim2.fromOffset(8,8);root.Size=UDim2.fromOffset(landscape and v.X-184 or v.X-16,120)
 status.Position=UDim2.fromOffset(8,6);status.Size=UDim2.new(1,-16,0,54);status.TextScaled=false;status.TextSize=13
 order.Position=UDim2.fromOffset(8,64);order.Size=UDim2.new(1,-16,0,24);order.TextScaled=false;order.TextSize=13;order.TextTruncate=Enum.TextTruncate.AtEnd
 multiplayerStatus.Position=UDim2.fromOffset(8,92);multiplayerStatus.Size=UDim2.new(1,-16,0,20);multiplayerStatus.TextScaled=false;multiplayerStatus.TextSize=12
 hint.Visible=false
 commandDock.AnchorPoint=Vector2.new(1,1);commandDock.Position=UDim2.new(1,-8,1,-104);commandDock.Size=UDim2.fromOffset(160,112)
 for i,b in ipairs(commandButtons)do b.Size=UDim2.fromOffset(76,52);b.Position=UDim2.fromOffset(((i-1)%2)*84,math.floor((i-1)/2)*60)end
end
gui:GetPropertyChangedSignal("AbsoluteSize"):Connect(layoutOrders);layoutOrders()

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
