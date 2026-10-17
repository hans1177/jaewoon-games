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
local activeWorldTreeIllusion = nil
remote.OnClientEvent:Connect(function(kind, payload)
  if kind == "MULTIPLAYER_SYNC" and typeof(payload) == "table" then
    multiplayerStatus.Text = string.format("Players %d · Shared %d · Round %d", payload.ParticipantCount or 0, payload.SharedObjective or 0, payload.RoundScore or 0)
  elseif kind == "WORLD_TREE_NOTICE" and typeof(payload) == "string" then
    gui:SetAttribute("WorldTreeNotice", payload)
  elseif kind == "WORLD_TREE_HIT" and typeof(payload) == "table" then
    gui:SetAttribute("WorldTreeNotice", string.format("%s -%d · 남은 체력 %d/%d", payload.name or "적", payload.damage or 0, payload.hp or 0, payload.maxHp or 0))
  elseif kind == "WORLD_TREE_HALLUCINATION" and typeof(payload) == "table" and player:GetAttribute("WorldTreeArea") == "interior" then
    -- 환각은 기존 뿌리의 모습만 로컬에서 바꾼다. 서버 몬스터/타격/보상에는 영향이 없다.
    local character = player.Character
    local rootPart = character and character:FindFirstChild("HumanoidRootPart")
    local camera = workspace.CurrentCamera
    local world = workspace:FindFirstChild("MagicForestWorldTree")
    local interior = world and world:FindFirstChild("TrunkInterior")
    if not rootPart or not camera or not interior then return end
    local candidates = {}
    for _, part in ipairs(interior:GetDescendants()) do
      if part:IsA("BasePart") and part.Name:match("^AncientRoot") and (part.Position-rootPart.Position).Magnitude < 72 then
        local _, visible = camera:WorldToViewportPoint(part.Position)
        if visible then table.insert(candidates, part) end
      end
    end
    table.sort(candidates, function(a,b)
      return (a.Position-rootPart.Position).Magnitude < (b.Position-rootPart.Position).Magnitude
    end)
    -- 여러 뱀의 환각이 겹쳐도 먼저 끝나는 효과가 새 환각의 뿌리를 드러내지 않게 한다.
    if activeWorldTreeIllusion then
      for root, transparency in pairs(activeWorldTreeIllusion.hidden) do
        if root.Parent then root.LocalTransparencyModifier = transparency end
      end
      if activeWorldTreeIllusion.effects.Parent then activeWorldTreeIllusion.effects:Destroy() end
      activeWorldTreeIllusion = nil
    end
    local effects = Instance.new("Folder")
    effects.Name = "WorldTreeLocalHallucinations"
    effects.Parent = workspace
    local hidden = {}
    for i = 1, math.min(math.clamp(math.floor(tonumber(payload.count) or 0), 0, 8), #candidates) do
      local root = candidates[i]
      hidden[root] = root.LocalTransparencyModifier
      root.LocalTransparencyModifier = 1
      for segment = 1, 4 do
        local part = Instance.new("Part")
        part.Name = "IllusorySnake"
        part.Anchored = true
        part.CanCollide = false
        part.CanQuery = false
        part.CanTouch = false
        part.Shape = Enum.PartType.Ball
        part.Material = Enum.Material.Neon
        part.Color = Color3.fromRGB(99, 192, 111)
        part.Transparency = 0.48
        part.Size = Vector3.new(2.5, 2, 3)
        part.Position = root.Position + Vector3.new(math.sin(segment * 0.9) * 1.3, 2, segment * 2-5)
        part.Parent = effects
      end
    end
    local illusion = {hidden = hidden, effects = effects}
    activeWorldTreeIllusion = illusion
    gui:SetAttribute("WorldTreeNotice", "세계수 뱀의 환각 · 눈앞의 뿌리가 뱀처럼 보여")
    task.delay(math.clamp(tonumber(payload.seconds) or 3, 1, 5), function()
      if activeWorldTreeIllusion ~= illusion then return end
      for root, transparency in pairs(illusion.hidden) do
        if root.Parent then root.LocalTransparencyModifier = transparency end
      end
      if illusion.effects.Parent then illusion.effects:Destroy() end
      activeWorldTreeIllusion = nil
    end)
  end
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

-- 세계수 · 기존 HUD에 붙는 모바일 탐험·전투·지도 UI
local worldTreeMiniMap = Instance.new("Frame")
worldTreeMiniMap.Name = "WorldTreeMiniMap"
worldTreeMiniMap.AnchorPoint = Vector2.new(1, 0)
worldTreeMiniMap.Position = UDim2.new(1, -12, 0, 12)
worldTreeMiniMap.Size = UDim2.fromOffset(156, 126)
worldTreeMiniMap.BackgroundColor3 = Color3.fromRGB(15, 35, 26)
worldTreeMiniMap.BackgroundTransparency = 0.08
worldTreeMiniMap.BorderSizePixel = 0
worldTreeMiniMap.Visible = false
worldTreeMiniMap.Parent = gui
local worldTreeCorner = Instance.new("UICorner")
worldTreeCorner.CornerRadius = UDim.new(0, 12)
worldTreeCorner.Parent = worldTreeMiniMap
local worldTreeMapTitle = Instance.new("TextLabel")
worldTreeMapTitle.Name = "Region"
worldTreeMapTitle.BackgroundTransparency = 1
worldTreeMapTitle.Position = UDim2.fromOffset(8, 3)
worldTreeMapTitle.Size = UDim2.new(1, -16, 0, 29)
worldTreeMapTitle.Font = Enum.Font.GothamBold
worldTreeMapTitle.TextSize = 14
worldTreeMapTitle.TextXAlignment = Enum.TextXAlignment.Left
worldTreeMapTitle.TextColor3 = Color3.fromRGB(234, 229, 193)
worldTreeMapTitle.Parent = worldTreeMiniMap
local worldTreeMapArea = Instance.new("Frame")
worldTreeMapArea.Name = "Area"
worldTreeMapArea.BackgroundColor3 = Color3.fromRGB(53, 87, 58)
worldTreeMapArea.BorderSizePixel = 0
worldTreeMapArea.Position = UDim2.fromOffset(8, 35)
worldTreeMapArea.Size = UDim2.new(1, -16, 1, -43)
worldTreeMapArea.Parent = worldTreeMiniMap
local worldTreeMapRound = Instance.new("UICorner")
worldTreeMapRound.CornerRadius = UDim.new(1, 0)
worldTreeMapRound.Parent = worldTreeMapArea
local playerDot = Instance.new("Frame")
playerDot.Name = "Player"
playerDot.Size = UDim2.fromOffset(12, 12)
playerDot.AnchorPoint = Vector2.new(0.5, 0.5)
playerDot.Position = UDim2.fromScale(0.5, 0.5)
playerDot.BackgroundColor3 = Color3.fromRGB(246, 247, 180)
playerDot.BorderSizePixel = 0
playerDot.ZIndex = 5
playerDot.Parent = worldTreeMapArea
local dotRound = Instance.new("UICorner")
dotRound.CornerRadius = UDim.new(1, 0)
dotRound.Parent = playerDot
local worldTreeExitDot = Instance.new("TextLabel")
worldTreeExitDot.BackgroundTransparency = 1
worldTreeExitDot.Size = UDim2.fromOffset(45, 16)
worldTreeExitDot.Position = UDim2.fromScale(0.5, 0.82)
worldTreeExitDot.AnchorPoint = Vector2.new(0.5, 0.5)
worldTreeExitDot.Text = "출입구"
worldTreeExitDot.TextSize = 11
worldTreeExitDot.TextColor3 = Color3.fromRGB(237, 212, 143)
worldTreeExitDot.Parent = worldTreeMapArea

local worldTreeNotice = Instance.new("TextLabel")
worldTreeNotice.Name = "WorldTreeStatus"
worldTreeNotice.AnchorPoint = Vector2.new(0.5, 0)
worldTreeNotice.Position = UDim2.fromScale(0.5, 0.19)
worldTreeNotice.Size = UDim2.new(0.82, 0, 0, 52)
worldTreeNotice.BackgroundColor3 = Color3.fromRGB(17, 36, 25)
worldTreeNotice.BackgroundTransparency = 0.08
worldTreeNotice.TextWrapped = true
worldTreeNotice.TextScaled = true
worldTreeNotice.TextColor3 = Color3.fromRGB(249, 227, 169)
worldTreeNotice.Visible = false
worldTreeNotice.Parent = gui
local statusCorner = Instance.new("UICorner")
statusCorner.CornerRadius = UDim.new(0, 10)
statusCorner.Parent = worldTreeNotice

local worldTreeAttackButton = Instance.new("TextButton")
worldTreeAttackButton.Name = "WorldTreeAttack"
worldTreeAttackButton.AnchorPoint = Vector2.new(1, 0.5)
worldTreeAttackButton.Position = UDim2.new(1, -12, 0.62, 0)
worldTreeAttackButton.Size = UDim2.fromOffset(112, 64)
worldTreeAttackButton.BackgroundColor3 = Color3.fromRGB(113, 74, 44)
worldTreeAttackButton.Text = "세계수 공격"
worldTreeAttackButton.TextColor3 = Color3.new(1, 1, 1)
worldTreeAttackButton.TextScaled = true
worldTreeAttackButton.Font = Enum.Font.GothamBold
worldTreeAttackButton.Visible = false
worldTreeAttackButton.Parent = gui
local attackCorner = Instance.new("UICorner")
attackCorner.CornerRadius = UDim.new(0, 14)
attackCorner.Parent = worldTreeAttackButton
worldTreeAttackButton.Activated:Connect(function()
  if player:GetAttribute("WorldTreeArea") == "interior" or player:GetAttribute("WorldTreeArea") == "underground" then
    remote:FireServer("worldtree-attack")
  end
end)
ContextActionService:BindAction("WorldTreeNativeAttack", function(_, input)
  if input == Enum.UserInputState.Begin and worldTreeAttackButton.Visible then
    remote:FireServer("worldtree-attack")
    return Enum.ContextActionResult.Sink
  end
  return Enum.ContextActionResult.Pass
end, false, Enum.KeyCode.F, Enum.KeyCode.ButtonR2)
local noticeSequence = 0
gui:GetAttributeChangedSignal("WorldTreeNotice"):Connect(function()
  local message = gui:GetAttribute("WorldTreeNotice")
  if typeof(message) ~= "string" then return end
  noticeSequence += 1
  local sequence = noticeSequence
  worldTreeNotice.Text = message
  worldTreeNotice.Visible = true
  task.delay(3, function()
    if sequence == noticeSequence then worldTreeNotice.Visible = false end
  end)
end)
local function updateWorldTreeHud()
  local area = player:GetAttribute("WorldTreeArea")
  local inside = area == "interior" or area == "underground"
  worldTreeMiniMap.Visible = inside
  worldTreeAttackButton.Visible = inside
  worldTreeMapTitle.Text = area == "underground" and "세계수 지하 · 제단" or "세계수 내부"
  worldTreeExitDot.Text = area == "underground" and "출구 ↑" or "출구 / 지하"
  worldTreeAttackButton.Text = player:GetAttribute("WorldTreeRooted") and "속박 중 · 공격" or "세계수 공격"
end
player:GetAttributeChangedSignal("WorldTreeArea"):Connect(updateWorldTreeHud)
player:GetAttributeChangedSignal("WorldTreeRooted"):Connect(updateWorldTreeHud)
updateWorldTreeHud()
task.spawn(function()
  while gui.Parent do
    if worldTreeMiniMap.Visible then
      local character = player.Character
      local part = character and character:FindFirstChild("HumanoidRootPart")
      if part then
        local pos = part.Position
        local cave = player:GetAttribute("WorldTreeArea") == "underground"
        local radius = cave and 88 or (Config.WorldTree and Config.WorldTree.InteriorRadius or 102)
        local cx, cz = 650, cave and 305 or 600
        playerDot.Position = UDim2.fromScale(
          math.clamp(0.5 + (pos.X - cx) / (radius * 2), 0.08, 0.92),
          math.clamp(0.5 + (pos.Z - cz) / (radius * 2), 0.08, 0.92))
      end
    end
    task.wait(0.25)
  end
end)

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



CommonUI.AdaptActionMenu(gui,root,list,title,status,nil,multiplayerStatus,Config.Actions[1]and{label=CommonUI.ActionLabel(Config.Actions[1],1),activate=function()remote:FireServer(Config.Actions[1].Id)end}or nil)
