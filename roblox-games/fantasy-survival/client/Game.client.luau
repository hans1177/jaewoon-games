-- 파일명: roblox-games/fantasy-survival/client/Game.client.luau
-- 게시: 기존 오너 전용 비공개 게시 경로에서 이 게임의 수정본만 배포한다.
-- [Vibe 공용 프레젠테이션] 기존 버튼에만 TweenService/글로우 적용 (세이브·판정 불변).
task.defer(function()
  local player = game:GetService("Players").LocalPlayer
  if not player then return end
  local shared = game:GetService("ReplicatedStorage"):FindFirstChild("Shared") or game:GetService("ReplicatedStorage"):WaitForChild("Shared", 8)
  if not shared then return end
  local module = shared:FindFirstChild("RobloxCommonPresentation")
  if not module or not module:IsA("ModuleScript") then return end
  local ok, presentation = pcall(require, module)
  if ok and type(presentation.BindGameUiEffects) == "function" then presentation.BindGameUiEffects(player) end
end)
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
  CHARACTER = "APPLIED",
  CREATURE = "APPLIED",
  BUILDING = "NOT_APPLICABLE",
  ENVIRONMENT = "APPLIED",
  WEAPON = "NOT_APPLICABLE",
  SKILL = "APPLIED",
  MATERIAL = "APPLIED",
  AUDIO = "APPLIED",
  VFX = "APPLIED",
  UI = "APPLIED",
  MOTION = "APPLIED",
  PROP = "APPLIED",
}
-- STUDIO_ASSET_BINDING_CLIENT_END
local remote = ReplicatedStorage:WaitForChild(Config.RemoteName)
-- 입력: 모션은 즉시 재생하고 피해·보상은 기존 서버에만 요청한다.
local playNativeCombatMotion
local predictedCombatSequence=0
local predictedCombatUntil=0
local pendingCombatMotion={}
local function activateMeadowAction(actionId)
  local combat=false
  for _,action in ipairs(Config.Actions) do
    if action.Id==actionId then combat=action.Kind=="COMBAT";break end
  end
  if combat then
    local cost=actionId=="meadow-unarmed-uppercut" and 20 or actionId=="meadow-unarmed-kick" and 14 or 0
    if (player:GetAttribute("MeadowStamina") or 0)<cost then return end
    local character=player.Character
    local human=character and character:FindFirstChildOfClass("Humanoid")
    if not human or human.Health<=0 or player:GetAttribute("ProfileReady")~=true then return end
    local now=os.clock()
    if now<predictedCombatUntil then return end
    predictedCombatUntil=now+.42
    predictedCombatSequence+=1
    if playNativeCombatMotion then
      local ok,started=pcall(playNativeCombatMotion,actionId,predictedCombatSequence)
      if ok and started then pendingCombatMotion[actionId]=now
      elseif not ok then warn("마력숲 맨손 포즈 실행 실패: "..tostring(started)) end
    end
  end
  remote:FireServer(actionId)
end

local gui = Instance.new("ScreenGui")
gui.Name = "ApprovedScopeHud"
gui:SetAttribute("ClientActionRuntimeVersion",3)
gui.ResetOnSpawn = false
gui.Parent = player:WaitForChild("PlayerGui")
-- [단일 체력바] Roblox 기본 체력 UI와 전용 체력바의 이중 표시를 제거한다.
pcall(function() game:GetService("StarterGui"):SetCoreGuiEnabled(Enum.CoreGuiType.Health,false) end)
-- [마력숲 옵션] 접속 중 표시·음량만 조절하며 서버 저장 구조를 변경하지 않는다.
local meadowIconAtlas="rbxassetid://102668066491590" -- CC0_INTERFACE_ATLAS
local reducedEffects=game:GetService("UserInputService").TouchEnabled
local meadowEffectsGroup=Instance.new("SoundGroup")
meadowEffectsGroup.Name="MeadowEffects";meadowEffectsGroup.Volume=.75
meadowEffectsGroup.Parent=game:GetService("SoundService")
local meadowAmbienceGroup=Instance.new("SoundGroup")
meadowAmbienceGroup.Name="MeadowAmbience";meadowAmbienceGroup.Volume=.75
meadowAmbienceGroup.Parent=game:GetService("SoundService")
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
root.BackgroundColor3 = Color3.fromRGB(14, 28, 25)
local meadowPanelCorner=Instance.new("UICorner")
meadowPanelCorner.CornerRadius=UDim.new(0,18)
meadowPanelCorner.Parent=root
local meadowPanelGradient=Instance.new("UIGradient")
meadowPanelGradient.Rotation=90
meadowPanelGradient.Color=ColorSequence.new(Color3.fromRGB(26,53,46),Color3.fromRGB(9,18,25))
meadowPanelGradient.Parent=root
root.Parent = gui
local title = Instance.new("TextLabel")
title.Name = "Title"
title.Size = UDim2.new(1, -20, 0, 44)
title.Position = UDim2.fromOffset(10, 8)
title.BackgroundTransparency = 1
title.TextColor3 = Color3.fromRGB(245, 248, 255)
title.TextScaled = true
title.Text = "마력숲  ·  시작 초원"
title.TextXAlignment=Enum.TextXAlignment.Left
title.TextSize=19
title.TextScaled=false
title.Size=UDim2.new(1,-96,0,44)
title.Parent = root
local status = Instance.new("TextLabel")
status.Name = "Status"
status.Size = UDim2.new(1, -20, 0, 48)
status.Position = UDim2.fromOffset(10, 54)
status.BackgroundColor3 = Color3.fromRGB(10, 17, 30)
status.TextColor3 = Color3.fromRGB(220, 243, 222)
status.TextWrapped=true
status.TextSize=15
status.TextScaled=false
status.TextScaled = true
status.Parent = root

local multiplayerStatus = Instance.new("TextLabel")
multiplayerStatus.Name = "MultiplayerStatus"
multiplayerStatus.Size = UDim2.new(1, -20, 0, 36)
multiplayerStatus.Position = UDim2.fromOffset(10, 104)
multiplayerStatus.BackgroundTransparency = 1
multiplayerStatus.TextColor3 = Color3.fromRGB(180, 230, 255)
multiplayerStatus.TextScaled = true
multiplayerStatus.Text = "초원 생존 · 동료 연결 대기"
multiplayerStatus.TextXAlignment=Enum.TextXAlignment.Left
local meadowAvatar=Instance.new("ImageLabel")
meadowAvatar.Name="NativeR15Avatar"
meadowAvatar.Size=UDim2.fromOffset(58,58)
meadowAvatar.Position=UDim2.new(1,-70,0,7)
meadowAvatar.BackgroundColor3=Color3.fromRGB(43,68,53)
meadowAvatar.BorderSizePixel=0
meadowAvatar.ImageTransparency=0
meadowAvatar.Parent=root
local meadowAvatarCorner=Instance.new("UICorner")
meadowAvatarCorner.CornerRadius=UDim.new(1,0)
meadowAvatarCorner.Parent=meadowAvatar
task.spawn(function()
  local ok,thumbnail=pcall(function()
    return Players:GetUserThumbnailAsync(player.UserId,Enum.ThumbnailType.HeadShot,Enum.ThumbnailSize.Size150x150)
  end)
  if ok and type(thumbnail)=="string" and player.Parent then meadowAvatar.Image=thumbnail end
end)
multiplayerStatus.Parent = root
remote.OnClientEvent:Connect(function(kind, payload)
  if kind ~= "MULTIPLAYER_SYNC" or typeof(payload) ~= "table" then return end
  multiplayerStatus.Text = string.format("참여 %d명 · 공동 목표 %d · 개인 점수 %d", payload.ParticipantCount or 0, payload.SharedObjective or 0, payload.RoundScore or 0)
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
local meadowActionGrid=Instance.new("UIGridLayout")
meadowActionGrid.Name="NativeActionGrid"
meadowActionGrid.SortOrder=Enum.SortOrder.LayoutOrder
meadowActionGrid.CellSize=UDim2.new(.5,-5,0,54)
meadowActionGrid.CellPadding=UDim2.fromOffset(6,6)
meadowActionGrid.Parent=list
local meadowActionButtons={}
for index, action in ipairs(Config.Actions) do
  local button = CommonUI.CreatePrimaryButton({minWidth=44,minHeight=52})
  button.Name = "ScopeAction" .. index
  button.LayoutOrder = index
  button.Size=UDim2.new(.5,-5,0,54) -- UIGridLayout sets positions safely
  button.BackgroundColor3 = Color3.fromRGB(235, 242, 255)
  button.TextColor3 = Color3.fromRGB(16, 24, 40)
  button.TextWrapped = true
  button.TextScaled = false;button.TextSize=15
  button.Text = CommonUI.ActionLabel(action,index)
  -- 메인 전투 기술은 오른쪽 원형 도크에서만 표시하고, 기존 메뉴의 중복 버튼을 숨긴다.
  local hidden=action.Kind=="COMBAT" or action.Id=="skill-meadow-bolt"
    or action.Id=="skill-meadow-guard" or action.Id=="skill-meadow-parry"
    or action.Id=="skill-meadow-heal" or action.Id=="skill-meadow-dodge-left"
    or action.Id=="skill-meadow-dodge-right" or action.Id=="scope-coreloop-1-6ebe58f496"
  if hidden then
    button:Destroy()
  else
    button.Parent = list
    meadowActionButtons[action.Id]=button
    button.Activated:Connect(function() activateMeadowAction(action.Id) end)
  end
end
local readyCountdown=0
game:GetService("RunService").Heartbeat:Connect(function(dt)
  readyCountdown+=dt
  if readyCountdown<.24 then return end
  readyCountdown=0
  local now=workspace:GetServerTimeNow()
  for _,action in ipairs(Config.Actions) do
    local button=meadowActionButtons[action.Id]
    if button then
      local deadline=player:GetAttribute("MeadowReady_"..action.Id)
      local remains=typeof(deadline)=="number" and math.max(0,deadline-now) or 0
      button.Text=action.Label..(remains>.05 and "  ·  "..math.ceil(remains).."초" or "")
      button.Active=remains<=.05
      button.BackgroundColor3=remains>.05 and Color3.fromRGB(80,89,92) or
        (action.Kind=="SKILL" and Color3.fromRGB(173,232,198) or Color3.fromRGB(235,242,255))
    end
  end
end)
-- [생존 탐색 피드백] 4개 숲 관찰 지점·기존 동물 프롬프트에서 받은 서버 단서만 표시한다.
-- 6초 뒤 자동 사라지는 작은 알림. 기존 위험 예고·스킬·조이스틱을 가리지 않는다.
local meadowSurvivalHint=Instance.new("TextLabel")
meadowSurvivalHint.Name="MeadowSurvivalHint"
meadowSurvivalHint.AnchorPoint=Vector2.new(.5,0)
meadowSurvivalHint.Position=UDim2.new(.5,0,.255,0)
meadowSurvivalHint.Size=UDim2.new(.75,0,0,50)
meadowSurvivalHint.BackgroundColor3=Color3.fromRGB(21,47,37)
meadowSurvivalHint.BackgroundTransparency=.13
meadowSurvivalHint.TextColor3=Color3.fromRGB(241,248,225)
meadowSurvivalHint.TextSize=14
meadowSurvivalHint.TextWrapped=true
meadowSurvivalHint.Font=Enum.Font.GothamMedium
meadowSurvivalHint.BorderSizePixel=0
meadowSurvivalHint.Active=false
meadowSurvivalHint.ZIndex=8
meadowSurvivalHint.Visible=false
meadowSurvivalHint.Parent=gui
local meadowSurvivalHintCorner=Instance.new("UICorner")
meadowSurvivalHintCorner.CornerRadius=UDim.new(0,12)
meadowSurvivalHintCorner.Parent=meadowSurvivalHint
local meadowSurvivalHintToken=0
player:GetAttributeChangedSignal("MeadowSurvivalHintSerial"):Connect(function()
  local value=player:GetAttribute("MeadowSurvivalHint")
  if type(value)~="string" or #value==0 then return end
  meadowSurvivalHint.Text=value
  meadowSurvivalHint.Visible=true
  meadowSurvivalHintToken+=1
  local token=meadowSurvivalHintToken
  task.delay(6,function()
    if token==meadowSurvivalHintToken then meadowSurvivalHint.Visible=false end
  end)
end)

-- [전투 HUD] 실제 휴머노이드 최대 체력을 기준으로 표시한다.
local meadowHealthTrack,meadowHealthControl=CommonUI.CreateHealthBar({name="MeadowHealth",text="체력",textSize=11})
meadowHealthTrack.Parent=root
local watched = {"Score","Coins","CombatProficiency","Progress","Health","Wave","CurrentWave","AliveEnemies","RunPhase","MeadowStamina","Wood","Stone","WeaponTier","Bosses","SharedObjective","RoundScore","LastApprovedScope","ProfileReady","SaveStatus"}
local function render()
  status.Text = string.format("웨이브 %d · 적 %d",
    player:GetAttribute("CurrentWave") or 0,
    player:GetAttribute("AliveEnemies") or 0)
  local character=player.Character
  local humanoid=character and character:FindFirstChildOfClass("Humanoid")
  local hp=humanoid and humanoid.Health or (player:GetAttribute("Health") or 0)
  local maxHp=humanoid and humanoid.MaxHealth or 100
  meadowHealthControl.SetRatio(maxHp>0 and hp/maxHp or 0,string.format("체력 %d / %d",hp,maxHp))
  local saveStatus = player:GetAttribute("SaveStatus")
  if player:GetAttribute("ProfileReady") ~= true then
    status.Text = "프로필 불러오는 중 · 전투 잠시 대기"
  elseif saveStatus == "SESSION_ONLY" then
    status.Text ..= "\n임시 플레이 · 이번 접속의 진행은 저장되지 않음"
  elseif saveStatus == "SAVE_FAILED" then
    status.Text ..= "\n저장 실패 · 기존 저장 데이터 보호 중"
  end
end
for _, name in ipairs(watched) do player:GetAttributeChangedSignal(name):Connect(render) end
render()

-- 키보드 스페이스/게임패드 A는 안내용 생존 시작이 아니라 실제 전투 버튼에 연결한다.
local primaryCombatAction = nil
for _, action in ipairs(Config.Actions) do
  if action.Kind == "COMBAT" then primaryCombatAction = action; break end
end
primaryCombatAction = primaryCombatAction or Config.Actions[1]
if primaryCombatAction then
  ContextActionService:BindAction("VibePrimaryAction", function(_, inputState)
    if inputState == Enum.UserInputState.Begin and gui:GetAttribute("GameMenuOpen")~=true then
      activateMeadowAction(primaryCombatAction.Id)
    end
    return Enum.ContextActionResult.Sink
  end, false, Enum.KeyCode.Space, Enum.KeyCode.ButtonA)
end


-- native-foundation-sentinel-v1 client readiness
local nativeFoundationInput = game:GetService("UserInputService")
local nativeTouchEnabled = nativeFoundationInput.TouchEnabled
local nativeFoundationRemote = ReplicatedStorage:FindFirstChild("RuntimeFoundationReport")
local nativeFoundationCamera = workspace.CurrentCamera
local function reportNativeFoundationReady()
  -- Readiness reporting must never suspend skill buttons or combat animation.
  local endpoint=nativeFoundationRemote or ReplicatedStorage:WaitForChild("RuntimeFoundationReport",12)
  if not endpoint or not endpoint:IsA("RemoteEvent") then return end
  local character = player.Character or player.CharacterAdded:Wait()
  local humanoid = character:WaitForChild("Humanoid")
  if nativeFoundationCamera and nativeFoundationCamera.CameraSubject == humanoid then
    endpoint:FireServer("CAMERA_READY")
  end
  endpoint:FireServer(nativeTouchEnabled and "INPUT_READY_TOUCH" or "INPUT_READY")
end
task.defer(reportNativeFoundationReady)

do
-- [게임 메뉴] 현재 서버 상태만 읽는 캐릭터·소지품·저널과 실제 동작하는 옵션.
local meadowPages={}
local meadowLabels={}
local meadowPageNames={"캐릭터","인벤토리","저널","옵션","도우미","동료"}
for index,name in ipairs(meadowPageNames) do
  local page=Instance.new("ScrollingFrame")
  page.Name="MeadowPage"..index;page.BackgroundTransparency=1;page.BorderSizePixel=0
  page.AutomaticCanvasSize=Enum.AutomaticSize.Y;page.CanvasSize=UDim2.new()
  page.ScrollBarThickness=3;page.ScrollingDirection=Enum.ScrollingDirection.Y
  page.Visible=false;page.Parent=root
  local layout=Instance.new("UIListLayout");layout.Padding=UDim.new(0,10)
  layout.SortOrder=Enum.SortOrder.LayoutOrder;layout.Parent=page
  meadowPages[index]=page
  if index<4 or index>=5 then
    local label=Instance.new("TextLabel")
    label.Name="LiveDetails";label.BackgroundTransparency=1
    label.Size=UDim2.new(1,-8,0,0);label.AutomaticSize=Enum.AutomaticSize.Y
    label.TextColor3=Color3.fromRGB(229,239,228);label.Font=Enum.Font.GothamMedium
    label.TextSize=15;label.TextWrapped=true;label.TextXAlignment=Enum.TextXAlignment.Left
    label.TextYAlignment=Enum.TextYAlignment.Top;label.Parent=page;meadowLabels[index]=label
  end
end
local meadowJournal={}
local meadowHelperButtons={}
local function renderMeadowPages()
  local character=player.Character
  local humanoid=character and character:FindFirstChildOfClass("Humanoid")
  local tool=character and character:FindFirstChildOfClass("Tool")
  meadowLabels[1].Text=string.format("%s\n\n전투 숙련도  %d\n체력  %d / %d\n장비  %s\n무기 강화  %d단계\n보스 처치  %d\n\n숙련도는 전투와 생존 행동으로 상승해.",
    player.DisplayName,math.floor(player:GetAttribute("CombatProficiency") or 0),humanoid and humanoid.Health or 0,
    humanoid and humanoid.MaxHealth or 100,tool and tool.Name or "맨손",player:GetAttribute("WeaponTier") or 0,player:GetAttribute("Bosses") or 0)
  meadowLabels[2].Text=string.format("소지품 · 서버 기록\n숙련도 %d  ·  장착 %s\n저장 %s",
    math.floor(player:GetAttribute("CombatProficiency") or 0),tool and tool.Name or "맨손",
    tostring(player:GetAttribute("SaveStatus") or "불러오는 중"))
  meadowLabels[3].Text=string.format("초원 탐험 저널\n\n현재 웨이브  %d\n남은 적  %d\n\n%s\n\n관찰 기록은 이번 접속 중 발견한 단서야.",
    player:GetAttribute("CurrentWave") or 0,player:GetAttribute("AliveEnemies") or 0,
    #meadowJournal>0 and table.concat(meadowJournal,"\n\n") or "주변 동물과 숲의 조사 지점을 살펴봐. 발견한 단서가 여기에 기록돼.")
  local groveMask=math.clamp(player:GetAttribute("ExplorationGroves") or 0,0,15)
  local explored=0
  for sector=0,3 do if bit32.band(groveMask,bit32.lshift(1,sector))~=0 then explored+=1 end end
  meadowLabels[3].Text..=string.format("\n\n숲 가장자리 발견  %d / 4\n새벽 흔적  %s\n밤의 숲 기록  %s",explored,
    (player:GetAttribute("DawnTraceFound") or 0)>0 and "발견" or "미발견",
    (player:GetAttribute("NightTraceFound") or 0)>0 and "발견" or "미발견")
  local ruinsMask=math.clamp(player:GetAttribute("RuinsDiscovered") or 0,0,7)
  local ruinsCount=0
  for index=0,2 do if bit32.band(ruinsMask,bit32.lshift(1,index))~=0 then ruinsCount+=1 end end
  meadowLabels[3].Text..=string.format("\n유적 조사  %d / 3",ruinsCount)
  local tier=player:GetAttribute("WeaponTier") or 0
  local cost=2+tier
  local ready=player:GetAttribute("ProfileReady")==true
  local save=player:GetAttribute("SaveStatus")
  local quest=Config.MainQuests and Config.MainQuests[player:GetAttribute("QuestStage") or 1]
  local suggestion=not ready and "프로필을 불러오고 있어. 잠시 기다려 줘."
    or save=="SESSION_ONLY" and "이번 접속은 임시 플레이야. 진행이 저장되지 않으니 재접속 후 상태를 확인해."
    or save=="SAVE_FAILED" and "저장에 실패했어. 기존 저장은 보호 중이야."
    or player:GetAttribute("RunActive")~=true and "생존 시작을 눌러 초원 전투를 시작해."
    or tier<10 and (player:GetAttribute("Wood") or 0)>=cost and (player:GetAttribute("Stone") or 0)>=cost
      and "강화 재료가 준비됐어. 아래 장비 강화를 누르면 서버가 비용을 확인해."
    or "나무와 돌 가까이에서 채집해. 전투 중에는 공격 예고에 맞춰 막으면 연타를 끊을 수 있어."
  meadowLabels[5].Text="지금 할 일\n\n"..(quest and quest.Instruction.."\n\n" or "")..suggestion..string.format("\n\n다음 강화 비용  나무 %d · 돌 %d\n\n조작 안내\n화면 탭: 기본 공격\n연속권·승룡권: 맨손 스킬\n막기 직후 적중: 완벽 막기\n어퍼컷: 스테미너 20 소모\n발차기: 스테미너 14 소모",cost,cost)
  local companionStage=player:GetAttribute("CompanionQuestStage") or 1
  local companionLines={"동료 통신 · 선택 의뢰","메인 퀘스트와 독립적으로 진행돼."}
  for index,request in ipairs(Config.CompanionRequests or {})do
    local unlocked=(player:GetAttribute("QuestStage") or 1)>=request.UnlockMainStage
    local status=index<companionStage and "완료" or index==companionStage and unlocked and "진행 중" or "대기"
    local progress=index<companionStage and request.Goal or index==companionStage and (player:GetAttribute("CompanionQuestProgress") or 0) or 0
    companionLines[#companionLines+1]=string.format("【%s】 %s\n%s\n%s  %d/%d",status,request.Name,request.Message,request.Instruction,progress,request.Goal)
  end
  meadowLabels[6].Text=table.concat(companionLines,"\n\n")
  for _,button in ipairs(meadowHelperButtons) do
    button.Active=ready
    button.TextTransparency=ready and 0 or .5
  end
end
for _,name in ipairs(watched) do player:GetAttributeChangedSignal(name):Connect(renderMeadowPages) end
player:GetAttributeChangedSignal("RunActive"):Connect(renderMeadowPages)
player:GetAttributeChangedSignal("QuestStage"):Connect(renderMeadowPages)
player:GetAttributeChangedSignal("CompanionQuestStage"):Connect(renderMeadowPages)
player:GetAttributeChangedSignal("CompanionQuestProgress"):Connect(renderMeadowPages)
for _,name in ipairs({"ExplorationGroves","DawnTraceFound","NightTraceFound","RuinsDiscovered"})do
  player:GetAttributeChangedSignal(name):Connect(renderMeadowPages)
end
for index,row in ipairs({{"생존 시작","genre-core"},{"가까운 자원 채집","scope-coreloop-1-6ebe58f496"},{"장비 강화","scope-coreloop-2-6c927cfa40"}})do
  local button=CommonUI.CreatePrimaryButton({name="MeadowHelper"..index,text=row[1],minHeight=52})
  button.LayoutOrder=index;button.Size=UDim2.new(1,-8,0,54);button.Parent=meadowPages[5]
  meadowHelperButtons[index]=button
  button.Activated:Connect(function()
    if player:GetAttribute("ProfileReady")==true then activateMeadowAction(row[2]) end
  end)
end
player:GetAttributeChangedSignal("MeadowSurvivalHintSerial"):Connect(function()
  local clue=player:GetAttribute("MeadowSurvivalHint")
  if typeof(clue)=="string" and clue~="" and not table.find(meadowJournal,clue) then
    table.insert(meadowJournal,1,clue)
    if #meadowJournal>24 then table.remove(meadowJournal) end
    renderMeadowPages()
  end
end)
local function bindMeadowMenuCharacter(character)
  local human=character:WaitForChild("Humanoid",8)
  if human then
    human.HealthChanged:Connect(function()render();renderMeadowPages()end)
    human:GetPropertyChangedSignal("MaxHealth"):Connect(function()render();renderMeadowPages()end)
  end
  character.ChildAdded:Connect(renderMeadowPages)
  character.ChildRemoved:Connect(renderMeadowPages)
  renderMeadowPages()
end
player.CharacterAdded:Connect(function(character)task.defer(bindMeadowMenuCharacter,character)end)
if player.Character then task.defer(bindMeadowMenuCharacter,player.Character) end
for index,name in ipairs({"효과음","환경음","타격 효과"}) do
  local button=CommonUI.CreatePrimaryButton({name="MeadowOption"..index,text=name,minHeight=52})
  button.Size=UDim2.new(1,-8,0,54);button.LayoutOrder=index;button.Parent=meadowPages[4]
  local function refreshOption()
    local value=index==1 and meadowEffectsGroup.Volume or meadowAmbienceGroup.Volume
    button.Text=index==3 and ("타격 효과  ·  "..(reducedEffects and "간소화" or "기본"))
      or name.."  ·  "..math.floor(value*100+.5).."%   눌러 조절"
  end
  button.Activated:Connect(function()
    if index==3 then reducedEffects=not reducedEffects
    else
      local group=index==1 and meadowEffectsGroup or meadowAmbienceGroup
      group.Volume=group.Volume>.9 and 0 or math.min(1,group.Volume+.25)
    end
    refreshOption()
  end)
  refreshOption()
end
renderMeadowPages()
local meadowMenu=CommonUI.AdaptActionMenu(gui,root,list,title,status,nil,multiplayerStatus,{
  compact=true,hideButton=true,menuLeft=true,pages=meadowPages,pageNames=meadowPageNames,onPageChanged=renderMeadowPages,iconAtlas=meadowIconAtlas,
})
local meadowHud=gui:FindFirstChild("MobileGameStatus")
if meadowHud then
  meadowAvatar.Parent=meadowHud;meadowAvatar.Visible=false
  title.Visible=false;multiplayerStatus.Visible=false
  meadowHud.Visible=false -- 레벨·웨이브 상태 패널 비표시
  meadowHud.BackgroundTransparency=1
  local border=meadowHud:FindFirstChildOfClass("UIStroke")
  if border then border.Enabled=false end
end
-- [화면 상단 HUD] 중앙 체력/스테미너는 CoreGui 안전영역에서 분리하고 기본 메뉴는 기존 터치 안전영역을 유지.
local meadowVitalsGui=Instance.new("ScreenGui")
meadowVitalsGui.Name="MeadowTopVitals"
meadowVitalsGui.ResetOnSpawn=false
meadowVitalsGui.ScreenInsets=Enum.ScreenInsets.None
meadowVitalsGui.DisplayOrder=gui.DisplayOrder+1
meadowVitalsGui.Parent=gui.Parent
meadowHealthTrack.Parent=meadowVitalsGui
meadowHealthTrack.AnchorPoint=Vector2.new(.5,0)
meadowHealthTrack.ZIndex=9
local meadowHealthFill=meadowHealthTrack:FindFirstChild("Fill")
if meadowHealthFill then meadowHealthFill.ZIndex=10 end
local meadowHealthText=meadowHealthTrack:FindFirstChild("Value")
if meadowHealthText then meadowHealthText.ZIndex=11 end
-- [중앙 최상단 HUD] 기존 체력바와 서버 스테미너를 같은 폭으로 연속 표시한다.
local meadowEnergy=Instance.new("Frame")
meadowEnergy.Name="MeadowStamina"
meadowEnergy.AnchorPoint=Vector2.new(.5,0)
meadowEnergy.BackgroundColor3=Color3.fromRGB(12,33,43)
meadowEnergy.BorderSizePixel=0;meadowEnergy.ZIndex=9;meadowEnergy.Parent=meadowVitalsGui
local energyCorner=Instance.new("UICorner")
energyCorner.CornerRadius=UDim.new(1,0);energyCorner.Parent=meadowEnergy
local energyFill=Instance.new("Frame")
energyFill.Name="StaminaFill";energyFill.Size=UDim2.fromScale(1,1)
energyFill.BackgroundColor3=Color3.fromRGB(42,169,232)
energyFill.BorderSizePixel=0;energyFill.ZIndex=10;energyFill.Parent=meadowEnergy
local energyFillCorner=Instance.new("UICorner")
energyFillCorner.CornerRadius=UDim.new(1,0);energyFillCorner.Parent=energyFill
local energyLabel=Instance.new("TextLabel")
energyLabel.Name="StaminaLabel";energyLabel.Size=UDim2.fromScale(1,1)
energyLabel.BackgroundTransparency=1;energyLabel.Text="스테미너 100 / 100"
energyLabel.TextColor3=Color3.fromRGB(248,253,255)
energyLabel.TextSize=12;energyLabel.Font=Enum.Font.GothamBold
energyLabel.ZIndex=11;energyLabel.Parent=meadowEnergy
local function layoutMeadowEnergy()
  local v=meadowVitalsGui.AbsoluteSize
  if v.X<=0 or v.Y<=0 then return end
  local width=math.floor(math.min(300,math.max(180,v.X*.28)))
  local top=v.X>v.Y and 12 or 38
  meadowHealthTrack.Size=UDim2.fromOffset(width,21)
  meadowHealthTrack.Position=UDim2.new(.5,0,0,top)
  meadowEnergy.Size=UDim2.fromOffset(width,21)
  meadowEnergy.Position=UDim2.new(.5,0,0,top+25)
  meadowHealthTrack.Visible=gui:GetAttribute("GameMenuOpen")~=true
  meadowEnergy.Visible=gui:GetAttribute("GameMenuOpen")~=true
end
meadowVitalsGui:GetPropertyChangedSignal("AbsoluteSize"):Connect(layoutMeadowEnergy)
gui:GetAttributeChangedSignal("GameMenuOpen"):Connect(layoutMeadowEnergy)
layoutMeadowEnergy()

local meadowMenuButton=gui:FindFirstChild("GameActionsMenu")
if meadowMenuButton then meadowMenuButton.Text="☰";meadowMenuButton.TextSize=22 end
-- [스토리·아이템 HUD] 실제 서버 퀘스트와 DataStore 소장 기록만 보여준다.
-- 중앙 게임 화면과 점프/전투 영역은 비워 두고 좌상단에 펼침 단추만 둔다.
local questTracker=Instance.new("TextButton")
questTracker.Name="MeadowMainQuest"
questTracker.Size=UDim2.fromOffset(290,64)
questTracker.Position=UDim2.fromOffset(10,130)
questTracker.BackgroundColor3=Color3.fromRGB(22,47,39)
questTracker.BackgroundTransparency=.08
questTracker.BorderSizePixel=0
questTracker.AutoButtonColor=true
questTracker.Text=""
questTracker.ZIndex=8
questTracker.Parent=gui
local trackerCorner=Instance.new("UICorner")
trackerCorner.CornerRadius=UDim.new(0,11)
trackerCorner.Parent=questTracker
local trackerStroke=Instance.new("UIStroke")
trackerStroke.Color=Color3.fromRGB(131,194,150)
trackerStroke.Transparency=.25
trackerStroke.Thickness=1.2
trackerStroke.Parent=questTracker
local trackerTitle=Instance.new("TextLabel")
trackerTitle.Name="QuestTitle"
trackerTitle.Position=UDim2.fromOffset(12,5)
trackerTitle.Size=UDim2.new(1,-22,0,25)
trackerTitle.BackgroundTransparency=1
trackerTitle.TextColor3=Color3.fromRGB(255,238,174)
trackerTitle.TextXAlignment=Enum.TextXAlignment.Left
trackerTitle.Font=Enum.Font.GothamBold
trackerTitle.TextSize=15
trackerTitle.ZIndex=9
trackerTitle.Parent=questTracker
if meadowIconAtlas~="" then
  local icon=Instance.new("ImageLabel");icon.Name="CC0QuestIcon";icon.BackgroundTransparency=1
  icon.Image=meadowIconAtlas;icon.ImageRectOffset=Vector2.new(320,0);icon.ImageRectSize=Vector2.new(64,64)
  icon.Size=UDim2.fromOffset(22,22);icon.Position=UDim2.fromOffset(8,7);icon.ZIndex=10;icon.Parent=questTracker
  trackerTitle.Position=UDim2.fromOffset(36,5);trackerTitle.Size=UDim2.new(1,-44,0,25)
end
local trackerDetail=Instance.new("TextLabel")
trackerDetail.Name="QuestObjective"
trackerDetail.Position=UDim2.fromOffset(12,30)
trackerDetail.Size=UDim2.new(1,-22,0,29)
trackerDetail.BackgroundTransparency=1
trackerDetail.TextColor3=Color3.fromRGB(233,250,238)
trackerDetail.TextXAlignment=Enum.TextXAlignment.Left
trackerDetail.Font=Enum.Font.GothamMedium
trackerDetail.TextSize=12
trackerDetail.TextWrapped=true
trackerDetail.ZIndex=9
trackerDetail.Parent=questTracker

local journalScroll=meadowPages[3]
local function journalRow(name,height)
  local row=Instance.new("TextLabel")
  row.Name=name
  row.Size=UDim2.new(1,0,0,height)
  row.BackgroundColor3=Color3.fromRGB(30,60,48)
  row.BackgroundTransparency=.08
  row.BorderSizePixel=0
  row.TextXAlignment=Enum.TextXAlignment.Left
  row.TextYAlignment=Enum.TextYAlignment.Center
  row.TextColor3=Color3.fromRGB(240,251,238)
  row.Font=Enum.Font.GothamMedium
  row.TextSize=14
  row.TextWrapped=true
  row.ZIndex=73
  row.Parent=journalScroll
  local corner=Instance.new("UICorner")
  corner.CornerRadius=UDim.new(0,9)
  corner.Parent=row
  local padding=Instance.new("UIPadding")
  padding.PaddingLeft=UDim.new(0,11)
  padding.PaddingRight=UDim.new(0,9)
  padding.Parent=row
  return row
end
local inventoryRow=journalRow("ResourceItems",52)
inventoryRow.Parent=meadowPages[2]
inventoryRow.LayoutOrder=1
-- [인벤토리] 기존 외부 CC0 장비·가방·책 아이콘으로 실제 서버 아이템만 표시한다.
-- 카드 수량은 플레이어 속성에서 매번 읽고 저장/보상/소비 판정을 만들지 않는다.
local inventoryGrid=Instance.new("Frame")
inventoryGrid.Name="MeadowInventoryGrid"
inventoryGrid.LayoutOrder=2
inventoryGrid.Size=UDim2.new(1,-8,0,246)
inventoryGrid.BackgroundTransparency=1
inventoryGrid.Parent=meadowPages[2]
local inventoryGridLayout=Instance.new("UIGridLayout")
inventoryGridLayout.CellSize=UDim2.new(.5,-5,0,76)
inventoryGridLayout.CellPadding=UDim2.fromOffset(8,8)
inventoryGridLayout.SortOrder=Enum.SortOrder.LayoutOrder
inventoryGridLayout.Parent=inventoryGrid
local inventoryData={
  {"나무","Wood",4,Color3.fromRGB(199,154,91)},
  {"돌","Stone",4,Color3.fromRGB(173,193,197)},
  {"연구 일지","ResearchRecords",5,Color3.fromRGB(229,195,120)},
  {"재화","Coins",4,Color3.fromRGB(238,201,92)},
  {"장착 장비","Equipment",3,Color3.fromRGB(144,202,232)},
  {"강화 단계","WeaponTier",2,Color3.fromRGB(183,151,243)},
}
local inventoryCards={}
for index,item in ipairs(inventoryData)do
  local card=Instance.new("Frame")
  card.Name="ItemSlot"..index
  card.LayoutOrder=index
  card.BackgroundColor3=Color3.fromRGB(20,39,40)
  card.BorderSizePixel=0
  card.Parent=inventoryGrid
  local corner=Instance.new("UICorner")
  corner.CornerRadius=UDim.new(0,11)
  corner.Parent=card
  local outline=Instance.new("UIStroke")
  outline.Color=item[4]
  outline.Thickness=1.2
  outline.Transparency=.32
  outline.Parent=card
  local icon=Instance.new("ImageLabel")
  icon.Name="CC0ItemIcon"
  icon.BackgroundTransparency=1
  icon.Image=meadowIconAtlas
  icon.ImageRectOffset=Vector2.new(item[3]*64,0)
  icon.ImageRectSize=Vector2.new(64,64)
  icon.Size=UDim2.fromOffset(45,45)
  icon.Position=UDim2.fromOffset(7,10)
  icon.ZIndex=45
  icon.Parent=card
  local title=Instance.new("TextLabel")
  title.Name="ItemName"
  title.Position=UDim2.fromOffset(56,8)
  title.Size=UDim2.new(1,-61,0,23)
  title.BackgroundTransparency=1
  title.Text=item[1]
  title.TextXAlignment=Enum.TextXAlignment.Left
  title.TextColor3=Color3.fromRGB(241,239,226)
  title.Font=Enum.Font.GothamBold
  title.TextSize=12
  title.TextTruncate=Enum.TextTruncate.AtEnd
  title.ZIndex=45
  title.Parent=card
  local count=Instance.new("TextLabel")
  count.Name="OwnedCount"
  count.Position=UDim2.fromOffset(56,33)
  count.Size=UDim2.new(1,-61,0,30)
  count.BackgroundTransparency=1
  count.Text="불러오는 중"
  count.TextXAlignment=Enum.TextXAlignment.Left
  count.TextColor3=item[4]
  count.Font=Enum.Font.GothamBold
  count.TextSize=14
  count.TextTruncate=Enum.TextTruncate.AtEnd
  count.ZIndex=45
  count.Parent=card
  inventoryCards[index]=count
end
-- [가방] 왼쪽 주머니 단축 아이콘 제거. 인벤토리는 기존 메뉴의 2번 탭에서 계속 이용한다.
local villageContractRow=journalRow("VillageContracts",166)
villageContractRow.LayoutOrder=9
local questRows={}
for index=1,#(Config.MainQuests or {}) do
  questRows[index]=journalRow("Quest"..index,146)
  questRows[index].LayoutOrder=10+index
end
local storyRows={}
for index=1,#(Config.StoryRecords or {}) do
  storyRows[index]=journalRow("ResearchRecord"..index,120)
  storyRows[index].LayoutOrder=30+index
end
local function renderMeadowJournal()
  local stage=math.clamp(player:GetAttribute("QuestStage") or 1,1,#Config.MainQuests+1)
  local progress=player:GetAttribute("QuestProgress") or 0
  local quest=Config.MainQuests[stage]
  -- [마을 의뢰 저널] 기존 메인 연구 기록과 별도로 저장되는 결과·단서를 표시한다.
  local villageIndex=math.clamp(player:GetAttribute("VillageContractIndex") or 1,1,#Config.VillageContracts+1)
  local villagePhase=player:GetAttribute("VillageContractPhase") or 0
  local villageMask=player:GetAttribute("VillageContractEvidence") or 0
  local villageLines={"초원 마을 · 의뢰 기록"}
  local outcomes=player:GetAttribute("VillageContractOutcomes") or 0
  for index,contract in ipairs(Config.VillageContracts) do
    local decision=bit32.band(bit32.rshift(outcomes,(index-1)*2),3)
    if decision==1 or decision==2 then
      villageLines[#villageLines+1]="【완료】 "..contract.Name.."\n"..contract.Choices[decision].Outcome
    elseif index==villageIndex then
      local found=0
      for bit=0,2 do if bit32.band(villageMask,bit32.lshift(1,bit))~=0 then found+=1 end end
      villageLines[#villageLines+1]="【"..(villagePhase==0 and "수락 대기" or villagePhase==2 and "결정 대기" or "조사 중").."】 "..contract.Name..
        "\n"..contract.Summary.."\n단서 "..found.."/3 · 남쪽 마을의 주민들과 이야기해."
    end
  end
  if villageIndex>#Config.VillageContracts then villageLines[#villageLines+1]="마을 의뢰 모두 완료" end
  villageContractRow.Text=table.concat(villageLines,"\n\n")
  trackerTitle.Text=quest and ("메인  "..quest.Name.."  ▸") or "메인  초원 조사 기록 완료  ▸"
  trackerDetail.Text=quest and string.format("%s  (%d/%d)",quest.Instruction,progress,quest.Goal)
    or "연구 기록을 메뉴의 인벤토리에서 다시 볼 수 있어"
  inventoryRow.Text="획득한 아이템 · 수량은 서버 기록 기준"
  local character=player.Character
  local tool=character and character:FindFirstChildOfClass("Tool")
  for index,item in ipairs(inventoryData)do
    local value=index==5 and (tool and tool.Name or "맨손")
      or index==3 and (tostring(math.clamp(player:GetAttribute(item[2]) or 0,0,3)).."/3")
      or tostring(player:GetAttribute(item[2]) or 0)
    inventoryCards[index].Text=index==5 and value or index==6 and ("+"..value.."단계") or value
  end
  for index,info in ipairs(Config.MainQuests) do
    local state=index<stage and "완료" or index==stage and "진행 중" or "잠김"
    local count=index<stage and info.Goal or index==stage and progress or 0
    questRows[index].Text=string.format("【%s】 %s\n%s  %d/%d\n\n%s",state,info.Name,info.Instruction,count,info.Goal,info.Story or "")
    questRows[index].TextColor3=index>stage and Color3.fromRGB(153,176,156) or Color3.fromRGB(246,251,236)
  end
  local owned=player:GetAttribute("ResearchRecords") or 0
  for index,record in ipairs(Config.StoryRecords) do
    local has=owned>=index
    storyRows[index].Text=has and ("【소장 아이템】 "..record.Title.."\n"..record.Text)
      or ("【미획득 연구 기록】 "..record.Title.."\n메인 퀘스트를 진행해 원본을 해금")
    storyRows[index].TextColor3=has and Color3.fromRGB(245,244,208) or Color3.fromRGB(161,180,164)
  end
end
-- [퀘스트 접기] 작은 아이콘을 눌러 원본 저널에서 진행도와 목표를 확인한다.
questTracker.Text="임무";questTracker.TextSize=11;questTracker.Font=Enum.Font.GothamBold
questTracker.TextColor3=Color3.fromRGB(246,244,222)
trackerTitle.Visible=false;trackerDetail.Visible=false
questTracker.Activated:Connect(function()meadowMenu.open(3)end)
gui:GetAttributeChangedSignal("GameMenuOpen"):Connect(function()
  questTracker.Visible=gui:GetAttribute("GameMenuOpen")~=true
end)
local function layoutMeadowJournal()
  local v=gui.AbsoluteSize
  if v.X<=0 or v.Y<=0 then return end
  local short=v.Y<440
  -- [왼쪽] 주머니 단축버튼 없이 메뉴와 접힌 임무만 유지한다.
  questTracker.Position=UDim2.fromOffset(9,74)
  questTracker.Size=UDim2.fromOffset(48,48)
  -- 체력·스테미너는 위 중앙 HUD에서만 배치한다.
end
gui:GetPropertyChangedSignal("AbsoluteSize"):Connect(layoutMeadowJournal)
layoutMeadowJournal()
for _,name in ipairs({"QuestStage","QuestProgress","QuestWood","QuestStone","ResearchRecords","Wood","Stone","Coins","WeaponTier",
  "VillageContractIndex","VillageContractPhase","VillageContractEvidence","VillageContractOutcomes"}) do
  player:GetAttributeChangedSignal(name):Connect(renderMeadowJournal)
end
renderMeadowJournal()
remote.OnClientEvent:Connect(function(kind,payload)
  if kind=="MEADOW_COMPANION_UPDATE" and typeof(payload)=="table" then
    meadowSurvivalHint.Text="동료 의뢰 완료 · "..tostring(payload.completed or "")
    meadowSurvivalHint.Visible=true
    meadowSurvivalHintToken+=1
    local token=meadowSurvivalHintToken
    task.delay(5,function()if token==meadowSurvivalHintToken then meadowSurvivalHint.Visible=false end end)
    renderMeadowPages()
    return
  end
  if kind~="MEADOW_QUEST_UPDATE" or typeof(payload)~="table" then return end
  meadowSurvivalHint.Text="메인 완료: "..tostring(payload.completed or "")
    ..(payload.record and ("  ·  연구 일지 "..payload.record.." 획득!") or "")
  meadowSurvivalHint.Visible=true
  meadowSurvivalHintToken+=1
  local token=meadowSurvivalHintToken
  task.delay(5,function()
    if token==meadowSurvivalHintToken then meadowSurvivalHint.Visible=false end
  end)
end)

end

-- [마을 NPC 대화] 작은 모바일 선택창. 서버에 있는 계약 ID·선택지만 전송한다.
do
  local dialog=Instance.new("Frame")
  dialog.Name="MeadowVillageDialogue"
  dialog.AnchorPoint=Vector2.new(.5,.5)
  dialog.Position=UDim2.fromScale(.5,.5)
  dialog.Size=UDim2.new(.9,0,0,320)
  dialog.BackgroundColor3=Color3.fromRGB(28,38,32)
  dialog.BorderSizePixel=0
  dialog.ZIndex=70
  dialog.Visible=false
  dialog.Parent=gui
  local sizeLimit=Instance.new("UISizeConstraint")
  sizeLimit.MaxSize=Vector2.new(440,320)
  sizeLimit.Parent=dialog
  local corner=Instance.new("UICorner")
  corner.CornerRadius=UDim.new(0,12)
  corner.Parent=dialog
  local stroke=Instance.new("UIStroke")
  stroke.Color=Color3.fromRGB(180,143,88)
  stroke.Thickness=2
  stroke.Parent=dialog
  local title=Instance.new("TextLabel")
  title.Name="Speaker"
  title.Position=UDim2.fromOffset(12,10)
  title.Size=UDim2.new(1,-64,0,36)
  title.BackgroundTransparency=1
  title.TextColor3=Color3.fromRGB(251,225,174)
  title.Font=Enum.Font.GothamBold
  title.TextSize=18
  title.TextXAlignment=Enum.TextXAlignment.Left
  title.TextTruncate=Enum.TextTruncate.AtEnd
  title.ZIndex=71
  title.Parent=dialog
  local story=Instance.new("TextLabel")
  story.Name="DialogueText"
  story.Position=UDim2.fromOffset(14,54)
  story.Size=UDim2.new(1,-28,0,129)
  story.BackgroundTransparency=1
  story.TextColor3=Color3.fromRGB(237,241,224)
  story.Font=Enum.Font.GothamMedium
  story.TextSize=14
  story.TextWrapped=true
  story.TextYAlignment=Enum.TextYAlignment.Top
  story.TextXAlignment=Enum.TextXAlignment.Left
  story.ZIndex=71
  story.Parent=dialog
  local close=Instance.new("TextButton")
  close.Name="Close"
  close.Position=UDim2.new(1,-42,0,9)
  close.Size=UDim2.fromOffset(32,34)
  close.BackgroundColor3=Color3.fromRGB(70,61,51)
  close.Text="×"
  close.TextSize=22
  close.TextColor3=Color3.fromRGB(255,250,227)
  close.ZIndex=72
  close.Parent=dialog
  close.Activated:Connect(function()dialog.Visible=false end)
  local choices={}
  for i=1,2 do
    local button=Instance.new("TextButton")
    button.Name="Choice"..i
    button.Position=UDim2.new(0,14,0,182+(i-1)*61)
    button.Size=UDim2.new(1,-28,0,54)
    button.BackgroundColor3=Color3.fromRGB(73,94,72)
    button.TextColor3=Color3.fromRGB(255,252,232)
    button.Font=Enum.Font.GothamBold
    button.TextSize=13
    button.TextWrapped=true
    button.ZIndex=72
    button.Visible=false
    button.Parent=dialog
    local rounded=Instance.new("UICorner")
    rounded.CornerRadius=UDim.new(0,8)
    rounded.Parent=button
    choices[i]=button
  end
  local function layoutDialogue()
    local v=gui.AbsoluteSize
    if v.Y>0 then
      local h=math.clamp(v.Y-36,230,320)
      dialog.Size=UDim2.new(.9,0,0,h)
      local upper=math.max(100,h-194)
      story.Size=UDim2.new(1,-28,0,upper)
      for i,button in ipairs(choices)do
        button.Position=UDim2.new(0,14,0,h-132+(i-1)*61)
      end
    end
  end
  gui:GetPropertyChangedSignal("AbsoluteSize"):Connect(layoutDialogue)
  layoutDialogue()
  remote.OnClientEvent:Connect(function(kind,payload)
    if kind~="MEADOW_VILLAGE_DIALOG" or typeof(payload)~="table" then return end
    title.Text=tostring(payload.title or "마을 의뢰")
    story.Text=tostring(payload.message or "")
    for i,button in ipairs(choices)do
      local option=typeof(payload.options)=="table" and payload.options[i] or nil
      local action=option and option.action
      local permitted=action=="village:accept" or action=="village:resolve:1" or action=="village:resolve:2"
      button.Visible=permitted
      if permitted then
        button.Text=tostring(option.label or "선택")
        button.Activated:Once(function()
          if not dialog.Visible then return end
          dialog.Visible=false
          remote:FireServer(action)
        end)
      end
    end
    dialog.Visible=true
  end)
  player.CharacterAdded:Connect(function()dialog.Visible=false end)
end

do
-- [초원 날씨 표시·네이티브 강수] 서버의 같은 날씨/시각을 모든 플레이어가 관측한다.
-- 날씨는 시각 효과 전용이다. 스킬 입력·몬스터 전투·저장/성장은 변경하지 않는다.
local meadowClimateWorld=workspace:WaitForChild("FantasySurvivalWorld",15)
local meadowClimateChip=Instance.new("TextLabel")
meadowClimateChip.Name="MeadowClimateStatus"
meadowClimateChip.Position=UDim2.fromOffset(9,203)
meadowClimateChip.Size=UDim2.fromOffset(202,28)
meadowClimateChip.BackgroundColor3=Color3.fromRGB(20,44,46)
meadowClimateChip.BackgroundTransparency=.13
meadowClimateChip.BorderSizePixel=0
meadowClimateChip.TextColor3=Color3.fromRGB(243,249,235)
meadowClimateChip.TextSize=13
meadowClimateChip.Font=Enum.Font.GothamBold
meadowClimateChip.TextXAlignment=Enum.TextXAlignment.Center
meadowClimateChip.Text="초원 날씨 불러오는 중"
meadowClimateChip.Active=false
meadowClimateChip.ZIndex=8
meadowClimateChip.Parent=gui
local climateCorner=Instance.new("UICorner")
climateCorner.CornerRadius=UDim.new(0,8)
climateCorner.Parent=meadowClimateChip
local climatePeriodNames={DAWN="새벽",DAY="낮",DUSK="저녁",NIGHT="밤"}
local climateWeatherNames={CLEAR="맑음",RAIN="비",FOG="안개",SNOW="눈",STORM="폭풍"}
local climateEmitter=nil
local climateLightningUntil=0
local climateNextLightningAt=os.clock()+19
local climateElapsed=0

-- 기존 아바타의 루트에 Roblox 네이티브 파티클만 붙인다. 도형 파츠·새 에셋 불필요.
local function bindMeadowRain(character)
  if climateEmitter and climateEmitter.Parent then climateEmitter:Destroy() end
  climateEmitter=nil
  local rootPart=character:WaitForChild("HumanoidRootPart",12)
  if not rootPart or not rootPart.Parent then return end
  local anchor=Instance.new("Attachment")
  anchor.Name="MeadowRainOrigin"
  anchor.Position=Vector3.new(0,17,0)
  anchor.Parent=rootPart
  local drops=Instance.new("ParticleEmitter")
  drops.Name="MeadowNativeRain"
  drops.Enabled=false
  drops.Rate=nativeTouchEnabled and 55 or 85
  drops.Lifetime=NumberRange.new(.42,.68)
  drops.Speed=NumberRange.new(42,56)
  drops.Acceleration=Vector3.new(3,-12,0)
  drops.SpreadAngle=Vector2.new(27,27)
  drops.EmissionDirection=Enum.NormalId.Bottom
  drops.Size=NumberSequence.new(.10)
  drops.Transparency=NumberSequence.new({
    NumberSequenceKeypoint.new(0,.38),
    NumberSequenceKeypoint.new(.8,.24),
    NumberSequenceKeypoint.new(1,1),
  })
  drops.Color=ColorSequence.new(Color3.fromRGB(179,213,234))
  drops.LightEmission=.12
  drops.LightInfluence=0
  drops.Parent=anchor
  climateEmitter=drops
end
if player.Character then task.defer(bindMeadowRain,player.Character) end
player.CharacterAdded:Connect(bindMeadowRain)
-- [숲 생명감] 원본 나무와 승인된 CC0 입자만 사용하고 근거리·개수 제한을 둔다.
local forestClimateRows={}
local function bindForestClimate(model)
  if not model:IsA("Model") or model:GetAttribute("MeadowScenery")~=true or forestClimateRows[model] then return end
  local row={pivot=model:GetPivot(),parts={},phase=model:GetPivot().Position.X*.13,lastWet=nil}
  for _,mesh in ipairs(model:GetDescendants())do
    if mesh:IsA("MeshPart") then row.parts[#row.parts+1]={mesh=mesh,reflectance=mesh.Reflectance,color=mesh.Color} end
  end
  local index=tonumber(model.Name:match("(%d+)$")) or 1
  local host=model:FindFirstChildWhichIsA("MeshPart",true)
  if host and index%8==0 then
    local anchor=Instance.new("Attachment");anchor.Name="ForestMagicSource";anchor.Parent=host
    local groundRay=RaycastParams.new();groundRay.FilterType=Enum.RaycastFilterType.Include;groundRay.FilterDescendantsInstances={workspace.Terrain}
    local pivot=model:GetPivot().Position
    local floor=workspace:Raycast(pivot+Vector3.new(0,30,0),Vector3.new(0,-90,0),groundRay)
    if floor then anchor.Position=host.CFrame:PointToObjectSpace(floor.Position+Vector3.new(0,.5,0))end
    local fireflies=Instance.new("ParticleEmitter");fireflies.Name="ForestFireflies"
    fireflies.Texture="rbxassetid://120799643869835";fireflies.Rate=0
    fireflies.Lifetime=NumberRange.new(1.8,3);fireflies.Speed=NumberRange.new(.2,.55)
    fireflies.Size=NumberSequence.new(.08);fireflies.LightEmission=.9
    fireflies.Color=ColorSequence.new(Color3.fromRGB(122,213,245),Color3.fromRGB(185,246,182))
    fireflies.Transparency=NumberSequence.new({NumberSequenceKeypoint.new(0,1),NumberSequenceKeypoint.new(.25,.25),NumberSequenceKeypoint.new(.7,.3),NumberSequenceKeypoint.new(1,1)})
    fireflies.SpreadAngle=Vector2.new(180,180);fireflies.Parent=anchor
    local mist=Instance.new("ParticleEmitter");mist.Name="ForestGroundMist"
    mist.Texture="rbxassetid://71208441396858";mist.Rate=0;mist.Lifetime=NumberRange.new(3,5)
    mist.Speed=NumberRange.new(.08,.2);mist.Size=NumberSequence.new(3,5)
    mist.Transparency=NumberSequence.new({NumberSequenceKeypoint.new(0,1),NumberSequenceKeypoint.new(.3,.94),NumberSequenceKeypoint.new(1,1)})
    mist.Color=ColorSequence.new(Color3.fromRGB(196,218,222));mist.SpreadAngle=Vector2.new(180,0);mist.Parent=anchor
    row.anchor=anchor;row.fireflies=fireflies;row.mist=mist
  end
  forestClimateRows[model]=row
end
if meadowClimateWorld then
  meadowClimateWorld.ChildAdded:Connect(function(model)task.defer(bindForestClimate,model)end)
  meadowClimateWorld.ChildRemoved:Connect(function(model)
    local row=forestClimateRows[model]
    if row and row.anchor then row.anchor:Destroy()end
    forestClimateRows[model]=nil
  end)
end
local function renderMeadowClimate()
  local v=gui.AbsoluteSize
  local short=v.Y>0 and v.Y<440
  meadowClimateChip.Position=UDim2.fromOffset(9,191)
  meadowClimateChip.Size=UDim2.fromOffset(125,24)
  meadowClimateChip.TextSize=10
  meadowClimateChip.Visible=gui:GetAttribute("GameMenuOpen")~=true
    and gui:GetAttribute("StoryJournalOpen")~=true
  if not meadowClimateWorld then return end
  local weather=meadowClimateWorld:GetAttribute("MeadowWeather") or "CLEAR"
  local period=meadowClimateWorld:GetAttribute("MeadowDayPhase") or "DAWN"
  local clock=meadowClimateWorld:GetAttribute("MeadowClockMinutes") or 315
  meadowClimateChip.Text=string.format("%s·%s %02d:%02d",
    climatePeriodNames[period] or "초원",climateWeatherNames[weather] or "맑음",
    math.floor(clock/60),clock%60)
  if climateEmitter then
    climateEmitter.Enabled=weather=="RAIN" or weather=="STORM" or weather=="SNOW"
    -- 한 에미터에서 실제 날씨에 맞춰 강수 모양·속도·밀도를 전환한다.
    if weather=="SNOW" then
      climateEmitter.Rate=nativeTouchEnabled and 22 or 38
      climateEmitter.Speed=NumberRange.new(5,9)
      climateEmitter.Lifetime=NumberRange.new(1.4,2.1)
      climateEmitter.Acceleration=Vector3.new(1,-2.5,0)
      climateEmitter.Size=NumberSequence.new(.22)
      climateEmitter.Color=ColorSequence.new(Color3.fromRGB(246,251,255))
    else
      climateEmitter.Rate=nativeTouchEnabled and 55 or 85
      climateEmitter.Speed=NumberRange.new(42,56)
      climateEmitter.Lifetime=NumberRange.new(.42,.68)
      climateEmitter.Acceleration=Vector3.new(3,-12,0)
      climateEmitter.Size=NumberSequence.new(.10)
      climateEmitter.Color=ColorSequence.new(Color3.fromRGB(179,213,234))
    end
  end
end
gui:GetPropertyChangedSignal("AbsoluteSize"):Connect(renderMeadowClimate)
gui:GetAttributeChangedSignal("GameMenuOpen"):Connect(renderMeadowClimate)
gui:GetAttributeChangedSignal("StoryJournalOpen"):Connect(renderMeadowClimate)
if meadowClimateWorld then
  for _,name in ipairs({"MeadowWeather","MeadowDayPhase","MeadowClockMinutes"}) do
    meadowClimateWorld:GetAttributeChangedSignal(name):Connect(renderMeadowClimate)
  end
end
renderMeadowClimate()
-- 기존 생존 대기·색보정 객체를 재활용하고 상태 변화는 부드럽게 보간한다.
game:GetService("RunService").Heartbeat:Connect(function(dt)
  climateElapsed+=dt
  if climateElapsed<.3 then return end
  climateElapsed=0
  if not meadowClimateWorld then return end
  local weather=meadowClimateWorld:GetAttribute("MeadowWeather") or "CLEAR"
  local period=meadowClimateWorld:GetAttribute("MeadowDayPhase") or "DAWN"
  if climateEmitter then climateEmitter.Enabled=weather=="RAIN" or weather=="STORM" or weather=="SNOW" end
  local atmosphere=verifiedLearningLighting:FindFirstChild("VerifiedLearningAtmosphere")
  local fog=weather=="FOG"
  local storm=weather=="STORM"
  local rainy=weather=="RAIN"
  local night=period=="NIGHT"
  local snow=weather=="SNOW"
  local targetDensity=fog and .40 or storm and .32 or rainy and .27 or snow and .25 or period=="DAWN" and .24 or .17
  local targetHaze=fog and 2.5 or storm and 1.65 or rainy and 1.35 or snow and 1.25 or .85
  if atmosphere and atmosphere:IsA("Atmosphere") then
    atmosphere.Density=atmosphere.Density+(targetDensity-atmosphere.Density)*.14
    atmosphere.Haze=atmosphere.Haze+(targetHaze-atmosphere.Haze)*.14
    atmosphere.Glare=atmosphere.Glare+((storm and .01 or .07)-atmosphere.Glare)*.14
  end
  local tint=night and Color3.fromRGB(176,193,226)
    or period=="DAWN" and Color3.fromRGB(255,222,183)
    or period=="DUSK" and Color3.fromRGB(255,210,177)
    or Color3.fromRGB(255,255,255)
  if storm then tint=tint:Lerp(Color3.fromRGB(183,199,212),.35)
  elseif rainy then tint=tint:Lerp(Color3.fromRGB(211,220,230),.20)
  elseif snow then tint=tint:Lerp(Color3.fromRGB(222,235,246),.25) end
  local now=os.clock()
  local camera=workspace.CurrentCamera
  local wet=rainy or storm
  local lights=0
  for _,model in ipairs(meadowClimateWorld:GetChildren())do bindForestClimate(model)end
  for model,row in pairs(forestClimateRows)do
    if model.Parent then
      local near=camera and (row.pivot.Position-camera.CFrame.Position).Magnitude<95
      if near then
        local amplitude=reducedEffects and .002 or storm and .013 or rainy and .008 or .004
        model:PivotTo(row.pivot*CFrame.Angles(math.sin(now*.8+row.phase)*amplitude,0,math.sin(now*.65+row.phase)*amplitude))
      end
      if row.lastWet~=wet then
        row.lastWet=wet
        for _,part in ipairs(row.parts)do
          if part.mesh.Parent then part.mesh.Reflectance=wet and .1 or part.reflectance;part.mesh.Color=wet and part.color:Lerp(Color3.new(0,0,0),.08) or part.color end
        end
      end
      if row.fireflies then
        local active=near and night and not storm and not rainy and lights<6
        row.fireflies.Rate=active and (reducedEffects and .5 or 1.4) or 0
        local morning=near and (period=="DAWN" or fog) and lights<6
        if row.mist then row.mist.Rate=morning and (reducedEffects and .12 or .3) or 0 end
        if active or morning then lights+=1 end
      end
    end
  end
  if storm and now>=climateNextLightningAt then
    climateLightningUntil=now+.18
    climateNextLightningAt=now+math.random(16,30)
  elseif not storm then
    climateNextLightningAt=now+19
    climateLightningUntil=0
  end
  verifiedLearningColorGrade.TintColor=verifiedLearningColorGrade.TintColor:Lerp(tint,.12)
  verifiedLearningColorGrade.Saturation=verifiedLearningColorGrade.Saturation
    +((fog and -.18 or storm and -.13 or -.02)-verifiedLearningColorGrade.Saturation)*.12
  local flash=storm and now<climateLightningUntil
  local brightness=flash and .34 or (night and -.035 or 0)
  verifiedLearningColorGrade.Brightness=verifiedLearningColorGrade.Brightness
    +(brightness-verifiedLearningColorGrade.Brightness)*(flash and .9 or .15)
end)


end

-- [짧은 인트로] 실제 시작 초원 위에 연구 일지의 첫 사건만 표시한다.
-- 이동·전투·카메라·저장에는 관여하지 않으며 입력 즉시 건너뛸 수 있다.
do
  local shown=false
  local lastBossWave=0
  local sceneCamera,sceneType,sceneSubject,sceneTween=nil,nil,nil,nil
  local intro=nil
  local inputConnection=nil
  local function closeIntro()
    if sceneTween then sceneTween:Cancel();sceneTween=nil end
    if sceneCamera and sceneCamera:GetAttribute("MeadowBossScene")==true then
      sceneCamera.CameraType=sceneType
      if sceneSubject and sceneSubject.Parent then sceneCamera.CameraSubject=sceneSubject end
      sceneCamera:SetAttribute("MeadowBossScene",nil)
    end
    sceneCamera=nil
    if inputConnection then inputConnection:Disconnect();inputConnection=nil end
    if intro then intro:Destroy();intro=nil end
  end
  local function showIntro(boss)
    local bossScene=typeof(boss)=="table"
    if (shown and not bossScene) or player:GetAttribute("ProfileReady")~=true then return end
    if not bossScene then shown=true end
    closeIntro()
    if gui:GetAttribute("GameMenuOpen")==true then return end
    intro=Instance.new("Frame");intro.Name="MeadowStoryIntro"
    intro.AnchorPoint=Vector2.new(.5,.5);intro.Position=UDim2.fromScale(.5,.43)
    intro.Size=UDim2.new(.76,0,0,146);intro.BackgroundColor3=Color3.fromRGB(12,29,27)
    intro.BackgroundTransparency=.13;intro.BorderSizePixel=0;intro.Active=false;intro.ZIndex=55;intro.Parent=gui
    local size=Instance.new("UISizeConstraint");size.MaxSize=Vector2.new(540,146);size.Parent=intro
    local corner=Instance.new("UICorner");corner.CornerRadius=UDim.new(0,14);corner.Parent=intro
    local heading=Instance.new("TextLabel");heading.BackgroundTransparency=1
    heading.Position=UDim2.fromOffset(16,12);heading.Size=UDim2.new(1,-32,0,26)
    heading.Font=Enum.Font.GothamBold;heading.TextSize=18;heading.TextColor3=Color3.fromRGB(245,229,181)
    heading.Text=bossScene and tostring(boss.name or "초원 수문장") or (Config.StoryRecords and Config.StoryRecords[1].Title or "마력숲 · 초원 탐사")
    heading.ZIndex=56;heading.Parent=intro
    local detail=Instance.new("TextLabel");detail.BackgroundTransparency=1
    detail.Position=UDim2.fromOffset(16,44);detail.Size=UDim2.new(1,-32,0,52)
    detail.Font=Enum.Font.GothamMedium;detail.TextSize=13;detail.TextWrapped=true
    detail.TextColor3=Color3.fromRGB(231,243,226)
    detail.Text=bossScene and "초원의 수문장이 깨어났다." or (Config.StoryRecords and Config.StoryRecords[1].Text or "초원의 단서를 따라 연구 기록을 모아 봐.")
    detail.ZIndex=56;detail.Parent=intro
    local skip=Instance.new("TextButton");skip.BackgroundTransparency=1
    skip.AnchorPoint=Vector2.new(1,1);skip.Position=UDim2.fromScale(1,1);skip.Size=UDim2.fromOffset(144,44)
    skip.Text="건너뛰기  ›";skip.TextSize=13;skip.Font=Enum.Font.GothamBold
    skip.TextColor3=Color3.fromRGB(170,221,190);skip.ZIndex=57;skip.Parent=intro
    skip.Activated:Connect(closeIntro)
    inputConnection=UserInputService.InputBegan:Connect(function(input,processed)
      if input.UserInputType==Enum.UserInputType.Touch or (not processed and (input.UserInputType==Enum.UserInputType.MouseButton1 or input.KeyCode==Enum.KeyCode.W
        or input.KeyCode==Enum.KeyCode.A or input.KeyCode==Enum.KeyCode.S or input.KeyCode==Enum.KeyCode.D
        or input.KeyCode==Enum.KeyCode.Space)) then closeIntro() end
    end)
    if bossScene then
      local model=boss.model
      local mesh=typeof(model)=="Instance" and model:IsDescendantOf(workspace) and model:FindFirstChildWhichIsA("MeshPart",true)
      local camera=workspace.CurrentCamera
      if mesh and camera and not reducedEffects then
        sceneCamera=camera;sceneType=camera.CameraType;sceneSubject=camera.CameraSubject
        camera:SetAttribute("MeadowBossScene",true);camera.CameraType=Enum.CameraType.Scriptable
        local focus=mesh.Position
        local eye=focus+Vector3.new(12,6,14)
        local ray=RaycastParams.new();ray.FilterType=Enum.RaycastFilterType.Exclude;ray.FilterDescendantsInstances={model,player.Character}
        local wall=workspace:Raycast(focus,eye-focus,ray)
        if wall then eye=wall.Position+(focus-wall.Position).Unit*1.5 end
        sceneTween=game:GetService("TweenService"):Create(camera,TweenInfo.new(.3),{CFrame=CFrame.lookAt(eye,focus)})
        sceneTween:Play()
      end
    end
    local current=intro
    task.delay(bossScene and 1.5 or 2.5,function()if intro==current then closeIntro()end end)
  end
  remote.OnClientEvent:Connect(function(kind,payload)
    if kind=="MEADOW_BOSS_INTRO" and typeof(payload)=="table" and typeof(payload.wave)=="number" and payload.wave>lastBossWave then
      lastBossWave=payload.wave;showIntro(payload)
    end
  end)
  player.CharacterAdded:Connect(closeIntro)
  player:GetAttributeChangedSignal("Health"):Connect(function()if sceneCamera then closeIntro()end end)
  player:GetAttributeChangedSignal("ProfileReady"):Connect(showIntro)
  gui:GetAttributeChangedSignal("GameMenuOpen"):Connect(function()if gui:GetAttribute("GameMenuOpen")==true then closeIntro()end end)
  task.defer(showIntro)
end

-- [화면 터치 공격] UI·조이스틱 터치는 제외하고 월드 빈 화면 탭만 기본 공격.
-- 로블록스 공식 TouchTapInWorld와 처리 여부를 사용해 버튼을 완전히 없앤다.
UserInputService.TouchTapInWorld:Connect(function(_,processedByUI)
  if processedByUI or gui:GetAttribute("GameMenuOpen")==true then return end
  if primaryCombatAction then activateMeadowAction(primaryCombatAction.Id) end
end)
UserInputService.InputBegan:Connect(function(input,processed)
  if processed or UserInputService.TouchEnabled or gui:GetAttribute("GameMenuOpen")==true then return end
  if input.UserInputType==Enum.UserInputType.MouseButton1 and primaryCombatAction then
    activateMeadowAction(primaryCombatAction.Id)
  end
end)

-- [전투 UI] 기존 CC0 장갑/방패 이미지와 발차기 표식을 쓰는 3개 원형 버튼.
-- 기존 서버 스킬 ID와 공격 판정·세이브 호환은 그대로 두고 스테미너 비용만 반영한다.
local meadowSkillDock=Instance.new("Frame")
meadowSkillDock.Name="MeadowR15SkillDock"
meadowSkillDock.BackgroundTransparency=1
meadowSkillDock.AnchorPoint=Vector2.new(1,1)
meadowSkillDock.Parent=gui
-- 외부 CC0 등록 아틀라스의 실제 의미가 맞는 아이콘만 매칭한다.
local meleeSkills={
  -- 실제 R15 발차기·어퍼컷과 서버 방어 스킬 ID에 각각 연결한다.
  {"meadow-unarmed-kick","발차기",Color3.fromRGB(244,179,105),nil},
  {"meadow-unarmed-uppercut","어퍼컷",Color3.fromRGB(94,178,255),0},
  {"skill-meadow-guard","막기",Color3.fromRGB(253,203,112),1},
}
local meadowSkillButtons={}
local meadowSkillCooldowns={}
-- [스킬 원형 테마] 처음 시안의 금빛 원형 테두리·검정 청동 배경을 기존 버튼에 직접 적용한다.
local function styleMeadowCombatButton(button,color)
  button.BackgroundColor3=Color3.fromRGB(24,25,23)
  button.TextColor3=Color3.fromRGB(255,242,207)
  button.BorderSizePixel=0
  button.AutoButtonColor=true
  button.Font=Enum.Font.GothamBold
  button.TextWrapped=true
  button.ZIndex=14
  local corner=Instance.new("UICorner")
  corner.CornerRadius=UDim.new(1,0);corner.Parent=button
  local border=Instance.new("UIStroke")
  border.Name="GoldSkillRim"
  border.Color=Color3.fromRGB(229,185,108)
  border.Thickness=3;border.Transparency=.04;border.Parent=button
  local gradient=Instance.new("UIGradient")
  gradient.Rotation=110
  gradient.Color=ColorSequence.new({
    ColorSequenceKeypoint.new(0,Color3.fromRGB(84,66,42)),
    ColorSequenceKeypoint.new(.32,Color3.fromRGB(27,34,37)),
    ColorSequenceKeypoint.new(1,Color3.fromRGB(6,14,23))
  })
  gradient.Parent=button
end
-- [시안 이름표] 어두운 화면에서도 스킬명이 가려지지 않도록 버튼 아래 별도 검정·금색 이름표를 둔다.
local meadowSkillNameplates={}
for index,skill in ipairs(meleeSkills)do
  local button=Instance.new("TextButton")
  button.Name="R15Skill"..index
  button.Text=""
  styleMeadowCombatButton(button,skill[3])
  button.Parent=meadowSkillDock
  if meadowIconAtlas~="" and skill[4]~=nil then
    local icon=Instance.new("ImageLabel")
    icon.Name="CC0SkillIcon"
    icon.Image=meadowIconAtlas
    icon.ImageRectOffset=Vector2.new(skill[4]*64,0)
    icon.ImageRectSize=Vector2.new(64,64)
    icon.BackgroundTransparency=1
    icon.AnchorPoint=Vector2.new(.5,0)
    icon.Position=UDim2.fromScale(.5,.11)
    icon.Size=UDim2.fromScale(.72,.72)
    icon.ScaleType=Enum.ScaleType.Fit
    icon.ZIndex=15
    icon.Parent=button
    -- 어퍼컷은 CC0 장갑 원본, 막기는 CC0 방패 원본을 사용한다.
  else
    -- 발차기는 아직 업로드/권한 검증된 장화 이미지가 없어 글자 대신 장화 이모지로 구분한다.
    local glyph=Instance.new("TextLabel")
    glyph.Name="SkillSymbol"
    glyph.BackgroundTransparency=1
    glyph.Position=UDim2.fromScale(.10,.09)
    glyph.Size=UDim2.fromScale(.8,.78)
    glyph.Text="🥾"
    glyph.TextColor3=skill[3]
    glyph.Font=Enum.Font.GothamBold
    glyph.TextScaled=true
    glyph.ZIndex=15
    glyph.Parent=button
  end
  local nameplate=Instance.new("TextLabel")
  nameplate.Name="SkillNameplate"..index
  nameplate.BackgroundColor3=Color3.fromRGB(18,17,15)
  nameplate.BackgroundTransparency=.04
  nameplate.BorderSizePixel=0
  nameplate.Text=skill[2]
  nameplate.TextColor3=Color3.fromRGB(255,237,188)
  nameplate.TextStrokeColor3=Color3.fromRGB(15,11,8)
  nameplate.TextStrokeTransparency=.55
  nameplate.Font=Enum.Font.GothamBold
  nameplate.TextSize=13;nameplate.ZIndex=17
  nameplate.Parent=meadowSkillDock
  local plateCorner=Instance.new("UICorner")
  plateCorner.CornerRadius=UDim.new(1,0);plateCorner.Parent=nameplate
  local plateStroke=Instance.new("UIStroke")
  plateStroke.Color=Color3.fromRGB(202,160,93)
  plateStroke.Thickness=1.4;plateStroke.Parent=nameplate
  meadowSkillNameplates[index]=nameplate
  local cooldown=Instance.new("TextLabel")
  cooldown.Name="Cooldown"
  cooldown.Size=UDim2.fromScale(1,1)
  cooldown.BackgroundColor3=Color3.fromRGB(5,10,16)
  cooldown.BackgroundTransparency=.35
  cooldown.TextColor3=Color3.fromRGB(255,242,197)
  cooldown.Font=Enum.Font.GothamBold
  cooldown.TextSize=17
  cooldown.Visible=false
  cooldown.ZIndex=16
  cooldown.Parent=button
  local cooldownCorner=Instance.new("UICorner")
  cooldownCorner.CornerRadius=UDim.new(1,0)
  cooldownCorner.Parent=cooldown
  meadowSkillButtons[index]=button
  meadowSkillCooldowns[index]=cooldown
  button.Activated:Connect(function()
    if gui:GetAttribute("GameMenuOpen")==true then return end
    activateMeadowAction(skill[1])
  end)
end
-- 기본 공격은 기존 화면 터치/키보드로 계속 사용하고 별도 공격 버튼은 제거한다.
-- [보조 버튼] 회피 제거. 서버 승인 질주와 채집만 둔다.
local meadowUtilityActions={
  {"skill-meadow-sprint","질주",Color3.fromRGB(112,185,244),"🏃"},
  {"scope-coreloop-1-6ebe58f496","채집",Color3.fromRGB(146,210,157),"",4},
}
local meadowUtilityButtons={}
for index,info in ipairs(meadowUtilityActions)do
  local button=Instance.new("TextButton")
  button.Name="MeadowUtility"..index
  button.Text=info[4]
  button.TextSize=26
  styleMeadowCombatButton(button,info[3])
  button.Parent=meadowSkillDock
  if info[5] and meadowIconAtlas~="" then
    local icon=Instance.new("ImageLabel")
    icon.Name="CC0UtilityIcon"
    icon.Image=meadowIconAtlas
    icon.ImageRectOffset=Vector2.new(info[5]*64,0)
    icon.ImageRectSize=Vector2.new(64,64)
    icon.BackgroundTransparency=1
    icon.Position=UDim2.fromScale(.16,.12)
    icon.Size=UDim2.fromScale(.68,.68)
    icon.ZIndex=15;icon.Parent=button
  end
  button.Activated:Connect(function()
    if gui:GetAttribute("GameMenuOpen")~=true then activateMeadowAction(info[1]) end
  end)
  meadowUtilityButtons[index]=button
end
-- [오른쪽 스킬 배치] 3개 기술을 겹치지 않는 가로열로 표시한다.
-- 작은 모바일 가로 화면에서는 자동 축소해서 미니맵·점프/이동 조작을 가리지 않는다.
-- [모바일 실제 배치] 시안: 메인 스킬 3개는 같은 가로열, 보조 2개는 그 아래.
-- 점프는 Roblox CoreGui 기본 버튼 그대로, 우측 맨 아래에 자리를 남긴다.
local function layoutMeadowCombatUi()
  local v=gui.AbsoluteSize
  if v.X<=0 or v.Y<=0 then return end
  local landscape=v.X>v.Y
  local scale=landscape and math.clamp(v.Y/690,.64,1.08) or math.clamp(v.X/440,.62,.87)
  if landscape then
    local width=408*scale
    local height=196*scale
    meadowSkillDock.Size=UDim2.fromOffset(math.floor(width),math.floor(height))
    meadowSkillDock.Position=UDim2.new(1,-math.floor(125*scale),1,-math.floor(55*scale))
    for index,button in ipairs(meadowSkillButtons)do
      local size=math.floor(101*scale)
      local centerX=(56+(index-1)*141)*scale
      button.Size=UDim2.fromOffset(size,size)
      button.Position=UDim2.fromOffset(math.floor(centerX-size/2),0)
      local nameplate=meadowSkillNameplates[index]
      nameplate.Size=UDim2.fromOffset(math.floor(94*scale),math.floor(28*scale))
      nameplate.Position=UDim2.fromOffset(math.floor(centerX-47*scale),math.floor(102*scale))
      nameplate.TextSize=math.max(11,math.floor(14*scale))
    end
    for index,button in ipairs(meadowUtilityButtons)do
      local size=math.floor(60*scale)
      button.Size=UDim2.fromOffset(size,size)
      button.Position=UDim2.fromOffset(math.floor((148+(index-1)*91)*scale),math.floor(135*scale))
      button.TextSize=math.floor(25*scale)
    end
  else
    -- 세로 화면에서도 HUD 및 점프와 겹치지 않는 우측 2열.
    meadowSkillDock.Size=UDim2.fromOffset(math.floor(180*scale),math.floor(276*scale))
    meadowSkillDock.Position=UDim2.new(1,-7,1,-math.floor(100*scale))
    for index,button in ipairs(meadowSkillButtons)do
      local size=math.floor(76*scale)
      local x=(index==2 and 93 or index==3 and 93 or 5)*scale
      local y=(index==3 and 87 or index==2 and 0 or 43)*scale
      button.Size=UDim2.fromOffset(size,size)
      button.Position=UDim2.fromOffset(math.floor(x),math.floor(y))
      local nameplate=meadowSkillNameplates[index]
      nameplate.Size=UDim2.fromOffset(math.floor(74*scale),math.floor(23*scale))
      nameplate.Position=UDim2.fromOffset(math.floor(x),math.floor(y+78*scale))
      nameplate.TextSize=11
    end
    for index,button in ipairs(meadowUtilityButtons)do
      local size=math.floor(52*scale)
      button.Size=UDim2.fromOffset(size,size)
      button.Position=UDim2.fromOffset(math.floor((27+(index-1)*72)*scale),math.floor(205*scale))
      button.TextSize=19
    end
  end
end
gui:GetPropertyChangedSignal("AbsoluteSize"):Connect(layoutMeadowCombatUi)
layoutMeadowCombatUi()
gui:GetAttributeChangedSignal("GameMenuOpen"):Connect(function()
  meadowSkillDock.Visible=gui:GetAttribute("GameMenuOpen")~=true
end)
-- [미니맵] 실제 플레이어 좌표와 이미 발견한 숲 지점만 표시하는 탐험 지도.
-- 임의의 지형·적 위치를 생성하지 않고 서버 탐험 기록과 기존 동료 위치를 사용한다.
local meadowRadar=Instance.new("Frame")
meadowRadar.Name="MeadowExplorerRadar"
meadowRadar.AnchorPoint=Vector2.new(1,0)
meadowRadar.Size=UDim2.fromOffset(178,145)
meadowRadar.BackgroundColor3=Color3.fromRGB(13,30,28)
meadowRadar.BackgroundTransparency=.06
meadowRadar.BorderSizePixel=0
meadowRadar.ZIndex=8
meadowRadar.Parent=gui
local radarCorner=Instance.new("UICorner")
radarCorner.CornerRadius=UDim.new(0,13)
radarCorner.Parent=meadowRadar
local radarStroke=Instance.new("UIStroke")
radarStroke.Color=Color3.fromRGB(220,176,91)
radarStroke.Thickness=2.5
radarStroke.Transparency=.12
radarStroke.Parent=meadowRadar
local radarTitle=Instance.new("TextLabel")
radarTitle.Name="Area"
radarTitle.Position=UDim2.fromOffset(9,3)
radarTitle.Size=UDim2.new(1,-18,0,24)
radarTitle.BackgroundTransparency=1
radarTitle.Text="초원 · 탐험 지도"
radarTitle.TextColor3=Color3.fromRGB(251,231,186)
radarTitle.TextSize=12
radarTitle.Font=Enum.Font.GothamBold
radarTitle.ZIndex=9
radarTitle.Parent=meadowRadar
local radarField=Instance.new("Frame")
radarField.Name="NearbyPlayers"
radarField.Position=UDim2.fromOffset(9,28)
radarField.Size=UDim2.new(1,-18,1,-53)
radarField.BackgroundColor3=Color3.fromRGB(26,58,47)
radarField.BorderSizePixel=0
radarField.ClipsDescendants=true
radarField.ZIndex=9
radarField.Parent=meadowRadar
local radarFieldCorner=Instance.new("UICorner")
radarFieldCorner.CornerRadius=UDim.new(1,0)
radarFieldCorner.Parent=radarField
local radarTint=Instance.new("UIGradient")
radarTint.Color=ColorSequence.new(Color3.fromRGB(41,83,58),Color3.fromRGB(15,43,40))
radarTint.Rotation=110
radarTint.Parent=radarField
local radarFieldStroke=Instance.new("UIStroke")
radarFieldStroke.Color=Color3.fromRGB(163,170,112)
radarFieldStroke.Transparency=.06
radarFieldStroke.Parent=radarField
-- 실제 서버의 흙길과 유적, 근처 몬스터만 지도에 표시한다.
local radarTrails={}
for route=1,8 do
  local segment=Instance.new("Frame")
  segment.Name="RealTrail"..route;segment.AnchorPoint=Vector2.new(.5,.5)
  segment.BorderSizePixel=0;segment.BackgroundColor3=Color3.fromRGB(239,211,142)
  segment.BackgroundTransparency=.06;segment.ZIndex=10;segment.Parent=radarField
  radarTrails[route]=segment
end
local radarRuinMarkers={}
for index=1,3 do
  local marker=Instance.new("TextLabel")
  marker.Name="RealRuin"..index;marker.BackgroundTransparency=1
  marker.AnchorPoint=Vector2.new(.5,.5);marker.Size=UDim2.fromOffset(15,15)
  marker.Font=Enum.Font.GothamBold;marker.Text="▣"
  marker.TextColor3=Color3.fromRGB(255,196,133);marker.TextSize=15
  marker.ZIndex=11;marker.Visible=false;marker.Parent=radarField
  radarRuinMarkers[index]=marker
end
local radarTrailEndpoints={
  {-51,-48,-177,-176},{58,-49,183,-177},{-54,62,-184,188},{56,63,192,196},
  {-177,-176,-228,-219},{183,-177,231,-228},{-184,188,-234,233},{192,196,236,238},
}
local radarRuinSites={{-122,-147},{137,139},{-154,122}}

for index=1,3 do
  local vertical=Instance.new("Frame")
  vertical.Name="GridVertical"..index
  vertical.Size=UDim2.new(0,1,1,0)
  vertical.Position=UDim2.fromScale(index/4,0)
  vertical.BackgroundColor3=Color3.fromRGB(146,192,137)
  vertical.BackgroundTransparency=.83
  vertical.BorderSizePixel=0
  vertical.ZIndex=9
  vertical.Parent=radarField
  local horizontal=Instance.new("Frame")
  horizontal.Name="GridHorizontal"..index
  horizontal.Size=UDim2.new(1,0,0,1)
  horizontal.Position=UDim2.fromScale(0,index/4)
  horizontal.BackgroundColor3=Color3.fromRGB(146,192,137)
  horizontal.BackgroundTransparency=.83
  horizontal.BorderSizePixel=0
  horizontal.ZIndex=9
  horizontal.Parent=radarField
end
local north=Instance.new("TextLabel")
north.Name="North"
north.Position=UDim2.fromOffset(3,2)
north.Size=UDim2.fromOffset(16,16)
north.BackgroundTransparency=1
north.Text="N"
north.TextColor3=Color3.fromRGB(242,216,154)
north.TextSize=12
north.Font=Enum.Font.GothamBold
north.ZIndex=11
north.Parent=radarField
local radarCenter=Instance.new("TextLabel")
radarCenter.Name="Facing"
radarCenter.BackgroundTransparency=1
radarCenter.AnchorPoint=Vector2.new(.5,.5)
radarCenter.Position=UDim2.fromScale(.5,.5)
radarCenter.Size=UDim2.fromOffset(19,19)
radarCenter.Text="▲"
radarCenter.TextColor3=Color3.fromRGB(255,229,145)
radarCenter.TextSize=19
radarCenter.Font=Enum.Font.GothamBold
radarCenter.ZIndex=12
radarCenter.Parent=radarField
local grovePoints={
  {-258,-206,1},{261,-219,2},{-270,220,4},{258,240,8},
}
local groveMarkers={}
for index=1,#grovePoints do
  local marker=Instance.new("TextLabel")
  marker.Name="DiscoveredGrove"..index
  marker.AnchorPoint=Vector2.new(.5,.5)
  marker.Size=UDim2.fromOffset(13,13)
  marker.BackgroundTransparency=1
  marker.Text="✦"
  marker.TextColor3=Color3.fromRGB(204,242,143)
  marker.TextSize=13
  marker.Visible=false
  marker.ZIndex=10
  marker.Parent=radarField
  groveMarkers[index]=marker
end
local radarCoordinates=Instance.new("TextLabel")
radarCoordinates.Name="Coordinates"
radarCoordinates.Position=UDim2.new(0,6,1,-24)
radarCoordinates.Size=UDim2.new(1,-12,0,21)
radarCoordinates.BackgroundTransparency=1
radarCoordinates.Text="위치 탐색 중"
radarCoordinates.TextColor3=Color3.fromRGB(219,238,219)
radarCoordinates.TextSize=10
radarCoordinates.Font=Enum.Font.Gotham
radarCoordinates.ZIndex=9
radarCoordinates.Parent=meadowRadar
-- 실제 스트리밍된 적 모델만 재사용 마커에 표시한다.
local radarEnemies={}
for index=1,12 do
  local marker=Instance.new("TextLabel")
  marker.Name="VisibleEnemy"..index;marker.BackgroundTransparency=1
  marker.AnchorPoint=Vector2.new(.5,.5);marker.Size=UDim2.fromOffset(14,14)
  marker.Text="●";marker.Font=Enum.Font.GothamBold
  marker.TextSize=14;marker.TextColor3=Color3.fromRGB(255,115,91)
  marker.Visible=false;marker.ZIndex=11;marker.Parent=radarField
  radarEnemies[index]=marker
end
local radarWoodlandMarkers={}
for index=1,20 do
  local marker=Instance.new("TextLabel")
  marker.Name="RealWoodland"..index
  marker.Size=UDim2.fromOffset(12,12)
  marker.AnchorPoint=Vector2.new(.5,.5)
  marker.BackgroundTransparency=1
  marker.Text="▲"
  marker.TextColor3=Color3.fromRGB(108,165,91)
  marker.TextSize=11;marker.Font=Enum.Font.GothamBold
  marker.ZIndex=10;marker.Visible=false
  marker.Parent=radarField
  radarWoodlandMarkers[index]=marker
end
local radarPeers={}
local radarElapsed=0
game:GetService("RunService").Heartbeat:Connect(function(dt)
  radarElapsed+=dt
  if radarElapsed<.3 then return end
  radarElapsed=0
  local character=player.Character
  local mainRoot=character and character:FindFirstChild("HumanoidRootPart")
  if not mainRoot then return end
  radarCoordinates.Text=string.format("위치 %d, %d  ·  동료 %d",
    math.floor(mainRoot.Position.X),math.floor(mainRoot.Position.Z),math.max(0,#Players:GetPlayers()-1))
  local facing=mainRoot.CFrame.LookVector
  radarCenter.Rotation=math.deg(math.atan2(facing.X,-facing.Z))
  local world=workspace:FindFirstChild("FantasySurvivalWorld")
  local trailsReady=world and (world:GetAttribute("MeadowNativeTrails") or 0)>=8
  local mapSize=radarField.AbsoluteSize
  local radarSpan=270 -- 플레이어 주위 실제 135스터드 반경
  local radarHalf=radarSpan*.5
  for index,route in ipairs(radarTrailEndpoints) do
    local frame=radarTrails[index]
    -- 기존 대각선 X 버그: 레이더 밖 끝점을 갖는 길은 표시하지 않는다.
    -- 좌표를 원 끝으로 강제 잘라 길 전체가 중앙을 관통하는 표시를 방지한다.
    local dx1=route[1]-mainRoot.Position.X
    local dz1=route[2]-mainRoot.Position.Z
    local dx2=route[3]-mainRoot.Position.X
    local dz2=route[4]-mainRoot.Position.Z
    frame.Visible=trailsReady and math.max(math.abs(dx1),math.abs(dz1),math.abs(dx2),math.abs(dz2))<=radarHalf
    if frame.Visible then
      local x1=.5+(route[1]-mainRoot.Position.X)/radarSpan
      local y1=.5+(route[2]-mainRoot.Position.Z)/radarSpan
      local x2=.5+(route[3]-mainRoot.Position.X)/radarSpan
      local y2=.5+(route[4]-mainRoot.Position.Z)/radarSpan
      local dx=(x2-x1)*mapSize.X
      local dy=(y2-y1)*mapSize.Y
      frame.Position=UDim2.fromScale((x1+x2)*.5,(y1+y2)*.5)
      frame.Size=UDim2.fromOffset(math.max(1,math.sqrt(dx*dx+dy*dy)),2)
      frame.Rotation=math.deg(math.atan2(dy,dx))
    end
  end
  for index,point in ipairs(radarRuinSites) do
    local marker=radarRuinMarkers[index]
    local ruin=world and world:FindFirstChild("Meadow_Ruin_"..index)
    local dx=point[1]-mainRoot.Position.X
    local dz=point[2]-mainRoot.Position.Z
    marker.Visible=ruin~=nil and dx*dx+dz*dz<=radarHalf*radarHalf
    if marker.Visible then marker.Position=UDim2.fromScale(math.clamp(.5+dx/radarSpan,.05,.95),math.clamp(.5+dz/radarSpan,.06,.94)) end
  end
  local discovered=player:GetAttribute("ExplorationGroves") or 0
  for index,point in ipairs(grovePoints)do
    local dx=point[1]-mainRoot.Position.X
    local dz=point[2]-mainRoot.Position.Z
    local marker=groveMarkers[index]
    local objective=(player:GetAttribute("QuestStage") or 1)==5
    marker.Visible=(objective or bit32.band(discovered,point[3])~=0) and dx*dx+dz*dz<=radarHalf*radarHalf
    marker.Text=objective and "◎" or "✦"
    marker.TextColor3=objective and Color3.fromRGB(255,228,125) or Color3.fromRGB(204,242,143)
    if marker.Visible then
      marker.Position=UDim2.fromScale(math.clamp(.5+dx/radarSpan,.05,.95),
        math.clamp(.5+dz/radarSpan,.06,.94))
    end
  end
  local visibleEnemies=0
  local visibleWoodlands=0
  if world then
    for _,model in ipairs(world:GetChildren()) do
      if model:IsA("Model") and visibleWoodlands<#radarWoodlandMarkers
        and model.Name:sub(1,16)=="Meadow_Woodland_" then
        local pos=model:GetPivot().Position
        local dx=pos.X-mainRoot.Position.X
        local dz=pos.Z-mainRoot.Position.Z
        if dx*dx+dz*dz<=radarHalf*radarHalf then
          visibleWoodlands+=1
          local marker=radarWoodlandMarkers[visibleWoodlands]
          marker.Visible=true;marker.Position=UDim2.fromScale(.5+dx/radarSpan,.5+dz/radarSpan)
        end
      end
      if visibleEnemies<#radarEnemies and model:IsA("Model") and typeof(model:GetAttribute("EnemyHealth"))=="number"
        and model:GetAttribute("EnemyHealth")>0 then
        local pos=model:GetPivot().Position
        local dx=pos.X-mainRoot.Position.X
        local dz=pos.Z-mainRoot.Position.Z
        if dx*dx+dz*dz<=radarHalf*radarHalf then
          visibleEnemies+=1
          local marker=radarEnemies[visibleEnemies]
          marker.Visible=true
          marker.Text=model:GetAttribute("Boss")==true and "◆" or "●"
          marker.TextColor3=model:GetAttribute("Boss")==true
            and Color3.fromRGB(255,207,104) or Color3.fromRGB(255,115,91)
          marker.Position=UDim2.fromScale(.5+dx/radarSpan,.5+dz/radarSpan)
        end
      end
    end
  end
  for index=visibleEnemies+1,#radarEnemies do radarEnemies[index].Visible=false end
  for index=visibleWoodlands+1,#radarWoodlandMarkers do radarWoodlandMarkers[index].Visible=false end
  local existing={}
  for _,peer in ipairs(Players:GetPlayers())do
    if peer~=player then
      local peerCharacter=peer.Character
      local peerRoot=peerCharacter and peerCharacter:FindFirstChild("HumanoidRootPart")
      if peerRoot and (peerRoot.Position-mainRoot.Position).Magnitude<radarHalf then
        local marker=radarPeers[peer]
        if not marker then
          marker=Instance.new("TextLabel")
          marker.Name="PlayerMarker"
          marker.BackgroundTransparency=1
          marker.AnchorPoint=Vector2.new(.5,.5)
          marker.Size=UDim2.fromOffset(14,14)
          marker.Text="◆"
          marker.TextColor3=Color3.fromRGB(144,220,251)
          marker.TextSize=14
          marker.ZIndex=11
          marker.Parent=radarField
          radarPeers[peer]=marker
        end
        local delta=peerRoot.Position-mainRoot.Position
        marker.Position=UDim2.fromScale(math.clamp(.5+delta.X/radarSpan,.05,.95),
          math.clamp(.5+delta.Z/radarSpan,.06,.94))
        existing[peer]=true
      end
    end
  end
  for peer,marker in pairs(radarPeers)do
    if not existing[peer] then marker:Destroy();radarPeers[peer]=nil end
  end
end)
local function layoutMeadowRadar()
  local v=gui.AbsoluteSize
  if v.X<=0 or v.Y<=0 then return end
  local compactLandscape=v.X>v.Y and v.Y<450
  local small=v.X<480
  -- [교체 지도] 원형 탐사면 안에 길·실제 유적·목표·동료를 유지한다.
  local mapDiameter=compactLandscape and 108 or small and 118 or math.floor(math.clamp(v.Y*.255,128,190))
  meadowRadar.Size=UDim2.fromOffset(mapDiameter+22,mapDiameter+53)
  meadowRadar.AnchorPoint=Vector2.new(1,0)
  meadowRadar.Position=UDim2.new(1,-10,0,12)
  radarTitle.TextSize=12
  radarTitle.Size=UDim2.new(1,-18,0,23)
  radarField.AnchorPoint=Vector2.new(.5,0)
  radarField.Position=UDim2.new(.5,0,0,28)
  radarField.Size=UDim2.fromOffset(mapDiameter,mapDiameter)
  radarCoordinates.Position=UDim2.new(0,6,1,-23)
  radarCoordinates.TextSize=10
  meadowRadar.Visible=gui:GetAttribute("GameMenuOpen")~=true
end
gui:GetPropertyChangedSignal("AbsoluteSize"):Connect(layoutMeadowRadar)
gui:GetAttributeChangedSignal("GameMenuOpen"):Connect(layoutMeadowRadar)
layoutMeadowRadar()
do
-- [전투 UI 상태] 서버가 제공한 실제 쿨다운만 표시한다. 임의 쿨다운은 없다.
local skillDisplayElapsed=0
game:GetService("RunService").Heartbeat:Connect(function(dt)
  skillDisplayElapsed+=dt
  if skillDisplayElapsed<.1 then return end
  skillDisplayElapsed=0
  local now=workspace:GetServerTimeNow()
  local ready=player:GetAttribute("ProfileReady")==true
  local stamina=math.clamp(player:GetAttribute("MeadowStamina") or 0,0,100)
  energyFill.Size=UDim2.fromScale(ready and stamina/100 or 0,1)
  energyLabel.Text=ready and string.format("스테미너 %d / 100",math.floor(stamina+.5)) or "스테미너 불러오는 중"
  for index,button in ipairs(meadowSkillButtons)do
    local skill=meleeSkills[index]
    local deadline=player:GetAttribute("MeadowReady_"..skill[1])
    local remaining=typeof(deadline)=="number" and math.max(0,deadline-now) or 0
    local cost=skill[1]=="meadow-unarmed-uppercut" and 20 or skill[1]=="meadow-unarmed-kick" and 14 or 0
    button.Active=ready and remaining<=.05 and stamina>=cost
    button.Text=""
    meadowSkillNameplates[index].TextTransparency=ready and 0 or .25
    local cooldown=meadowSkillCooldowns[index]
    cooldown.Visible=remaining>.05
    cooldown.Text=remaining>0 and string.format("%.1f",remaining) or ""
    button.BackgroundColor3=remaining>.05 and Color3.fromRGB(24,28,34) or Color3.fromRGB(30,31,29)
  end
  for index,button in ipairs(meadowUtilityButtons)do
    local info=meadowUtilityActions[index]
    local deadline=player:GetAttribute("MeadowReady_"..info[1])
    local remains=typeof(deadline)=="number" and math.max(0,deadline-now) or 0
    button.Active=ready and remains<=.05
    button.Text=info[4]
    button.TextTransparency=button.Active and 0 or .3
  end
end)
end
do
-- [상호작용 표시] 네이티브 프롬프트가 실제로 표시될 때만 대상 테두리를 강조한다.
local promptHighlight=Instance.new("Highlight")
promptHighlight.Name="MeadowInteractionTarget";promptHighlight.FillTransparency=1
promptHighlight.OutlineColor=Color3.fromRGB(150,231,182)
promptHighlight.OutlineTransparency=.12;promptHighlight.DepthMode=Enum.HighlightDepthMode.Occluded
promptHighlight.Enabled=false;promptHighlight.Parent=gui
local shownMeadowPrompts={}
local function updateMeadowPromptHighlight()
  promptHighlight.Enabled=false
  if gui:GetAttribute("GameMenuOpen")==true then return end
  for prompt in pairs(shownMeadowPrompts) do
    if prompt.Parent and prompt.Enabled then
      local host=prompt.Parent:IsA("Attachment") and prompt.Parent.Parent or prompt.Parent
      if host and (host:IsA("BasePart") or host:IsA("Model")) then
        promptHighlight.Adornee=host;promptHighlight.Enabled=true;return
      end
    end
  end
end
local promptService=game:GetService("ProximityPromptService")
promptService.PromptShown:Connect(function(prompt)
  local world=workspace:FindFirstChild("FantasySurvivalWorld")
  if world and prompt:IsDescendantOf(world) then shownMeadowPrompts[prompt]=true;updateMeadowPromptHighlight() end
end)
promptService.PromptHidden:Connect(function(prompt)
  shownMeadowPrompts[prompt]=nil;updateMeadowPromptHighlight()
end)
gui:GetAttributeChangedSignal("GameMenuOpen"):Connect(updateMeadowPromptHighlight)
end

-- [모션·액션] 서버가 승인한 기존 COMBAT 입력만 R15 공용 관절 애니메이션에 연결한다.
-- 서버 피해·이동·콤보 판정, 원래 Animator, 저장값은 수정하지 않는다.
-- 이 경로는 미게시 원본 포즈를 직접 합성하며 실제 재생 QA 전까지 인증된 AnimationTrack이 아니다.
local combatMotionSource = nil
local combatMotionModule = Shared:WaitForChild("RobloxCommonMotion",12)
if combatMotionModule then
  local ok, source = pcall(require, combatMotionModule)
  if ok and type(source) == "table" and source.CreateCombatCombo and source.SampleCombatCombo
    and source.MapCombatPoseToR15 and source.BindJointPose then combatMotionSource = source
  else warn("마력숲 맨손 모션 원본 로딩 실패: "..tostring(source)) end
end
local RunService = game:GetService("RunService")
local authorizedCombatScopes = {}
for _, action in ipairs(Config.Actions) do
  if action.Kind == "COMBAT" then authorizedCombatScopes[action.Id] = true end
end
local dodgePoseUntil=0
local activeCombatCharacter = nil
local activeCombatController = nil
local activeCombatCombo = nil
local activeCombatStartedAt = 0
local combatPoseTargets = {}
local combatR15Targets = {}
local combatVFX = nil
local vfxModule=Shared:FindFirstChild("RobloxCommonVFX")
if vfxModule then
  local ok,module=pcall(require,vfxModule)
  if ok and type(module)=="table" and type(module.CreateImpactFlash)=="function"
    and type(module.AttachShortTrail)=="function" then combatVFX=module end
end
-- Only server-authorized impact messages may trigger contact sparks.
local lastSoftHitAt=0
remote.OnClientEvent:Connect(function(kind,payload)
  if kind~="MEADOW_IMPACT" or typeof(payload)~="table"
    or typeof(payload.position)~="Vector3" then return end
  local color=payload.boss and Color3.fromRGB(255,164,91)
    or payload.species=="bee" and Color3.fromRGB(255,234,124)
    or Color3.fromRGB(128,250,201)
  if combatVFX then combatVFX.CreateImpactFlash({
    cframe=CFrame.new(payload.position+Vector3.new(0,2,0)),
    color=color,accent=Color3.fromRGB(255,255,237),
    reducedMotion=reducedEffects,count=reducedEffects and 4 or 10,
    scale=payload.boss and 1.4 or .85,
    textureKey="slash",hideRing=true,duration=.22,distance=1.8,
  }) end
  -- [부드러운 타격음] 날카로운 검 휘두르기 대신 기존 내장 착지 둔탁음의 작은 음량 사용.
  -- 연타 소리가 겹쳐 시끄러워지는 것을 0.11초 간격 제한으로 방지한다.
  local soundNow=os.clock()
  if soundNow-lastSoftHitAt>=.11 then
    lastSoftHitAt=soundNow
    local myCharacter=player.Character
    local soundRoot=myCharacter and (myCharacter:FindFirstChild("HumanoidRootPart") or myCharacter.PrimaryPart)
    if soundRoot then
      local impact=Instance.new("Sound")
      impact.Name="MeadowSoftImpact"
      impact.SoundId="rbxasset://sounds/action_jump_land.mp3"
      impact.Volume=payload.finisher and .26 or (payload.boss and .21 or .16)
      impact.PlaybackSpeed=payload.finisher and .88 or .98
      impact.RollOffMinDistance=4
      impact.RollOffMaxDistance=22
      impact.SoundGroup=meadowEffectsGroup
      impact.Parent=soundRoot
      impact:Play()
      game:GetService("Debris"):AddItem(impact,1.2)
    end
  end
  local hitFlash=Instance.new("Frame")
  hitFlash.Name="MeadowHitScreenFeedback"
  hitFlash.Size=UDim2.fromScale(1,1)
  hitFlash.BackgroundColor3=payload.finisher and Color3.fromRGB(255,202,110)
    or Color3.fromRGB(240,250,224)
  hitFlash.BackgroundTransparency=reducedEffects and 1 or (payload.finisher and .93 or .98)
  hitFlash.BorderSizePixel=0
  hitFlash.ZIndex=2
  hitFlash.Parent=gui
  game:GetService("TweenService"):Create(hitFlash,TweenInfo.new(.16),{
    BackgroundTransparency=1
  }):Play()
  game:GetService("Debris"):AddItem(hitFlash,.22)
  if payload.finisher and combatVFX and type(combatVFX.CreateCriticalBurst)=="function" then
    combatVFX.CreateCriticalBurst({
      cframe=CFrame.new(payload.position+Vector3.new(0,2.5,0)),
      reducedMotion=reducedEffects,count=reducedEffects and 3 or 8,
    })
  end
end)

-- Source-bound Roblox SKILL / VFX packages. Server approval is the only trigger.
-- UI actions never apply local damage, healing, knockback, cooldown or inventory.
local meadowSkillLoaded,meadowSkillPresentation=pcall(require,Shared:FindFirstChild("RobloxCommonSkillPresentation"))
local meadowVfxLoaded,meadowCommonVFX=pcall(require,Shared:FindFirstChild("RobloxCommonVFX"))
if not meadowSkillLoaded or type(meadowSkillPresentation)~="table" then meadowSkillPresentation=nil end
if not meadowVfxLoaded or type(meadowCommonVFX)~="table" then meadowCommonVFX=nil end
local actionsById={}
for _,action in ipairs(Config.Actions) do actionsById[action.Id]=action end
local debris=game:GetService("Debris")
local alreadyPlayedMeadowFX={}
local function playApprovedMeadowEffect(actionId,overrideVfx,actorUserId,targetPosition,sequence)
  local action=actionsById[actionId]
  actorUserId=typeof(actorUserId)=="number" and actorUserId or player.UserId
  if sequence~=nil then
    local key=tostring(actorUserId)..":"..tostring(sequence)
    if alreadyPlayedMeadowFX[key] then return end
    alreadyPlayedMeadowFX[key]=true
    task.delay(8,function()alreadyPlayedMeadowFX[key]=nil end)
  end
  if not action then return end
  local sourcePlayer=Players:GetPlayerByUserId(actorUserId)
  local character=sourcePlayer and sourcePlayer.Character
  local rootPart=character and character:FindFirstChild("HumanoidRootPart")
  if not rootPart then return end
  local position=typeof(targetPosition)=="Vector3" and targetPosition or
    (sourcePlayer and sourcePlayer:GetAttribute("ApprovedActionTarget"))
  if typeof(position)~="Vector3" or (position-rootPart.Position).Magnitude>45 then
    position=rootPart.Position
  end
  local hostPart=character:FindFirstChild("RightHand") or rootPart
  local warm=Color3.fromRGB(132,245,169)
  local accent=Color3.fromRGB(231,255,189)
  if actionId=="skill-meadow-bolt" then warm=Color3.fromRGB(128,197,255) end
  if actionId=="skill-meadow-heavy" or actionId=="skill-meadow-sweep" then
    warm=Color3.fromRGB(255,187,109)
  end
  local settings={
    parent=workspace,cframe=CFrame.new(position),hostPart=hostPart,
    startPosition=hostPart.Position,endPosition=position,
    color=warm,accent=accent,duration=.46,
    radius=actionId=="skill-meadow-sweep" and 10 or 4,
    scale=1,autoCleanup=true,reducedMotion=UserInputService.TouchEnabled,
    vfx=meadowCommonVFX,
  }
  local selectedFx=overrideVfx or action.VfxAtom
  if meadowCommonVFX and selectedFx and hasStudioAssetAtom("VFX","IMPACT_FLASH") then
    local ok,err=pcall(meadowCommonVFX.Create,selectedFx,settings)
    if not ok then warn("마력숲 VFX source unavailable: "..tostring(err)) end
  end
  if meadowSkillPresentation and not overrideVfx and action.SkillAtom and action.SkillAtom~="SKILL_ICON_BADGE" and hasStudioAssetAtom("SKILL","CAST_HAND") then
    local ok,result,controller=pcall(meadowSkillPresentation.Create,action.SkillAtom,settings)
    if ok then
      if action.SkillAtom=="SHIELD_SHELL" and typeof(result)=="Instance" then
        debris:AddItem(result,2.8)
      elseif (action.SkillAtom=="DASH_STREAK" or action.SkillAtom=="SKILL_TRAIL") and controller then
        task.delay(.65,function() pcall(function()controller.Destroy() end) end)
      end
    else
      warn("마력숲 skill source unavailable: "..tostring(result))
    end
  end
end
player:GetAttributeChangedSignal("ApprovedActionFX"):Connect(function()
  local id,seq=tostring(player:GetAttribute("ApprovedActionFX") or ""):match("^([^:]+):(%d+)$")
  if id and seq then playApprovedMeadowEffect(id,nil,player.UserId,nil,tonumber(seq)) end
end)
remote.OnClientEvent:Connect(function(kind,payload,actionId,sequence,targetPosition)
  if kind=="MEADOW_ACTION_FX" then
    playApprovedMeadowEffect(actionId,nil,payload,targetPosition,sequence)
  elseif kind=="MEADOW_REACTION" and payload=="PARRY" then
    playApprovedMeadowEffect("skill-meadow-parry","PARRY_PERFECT_FLASH",player.UserId)
  end
end)


-- [맨손 액션] 승인된 타격 이벤트 하나에 원본 R15 관절 포즈 5개를 연속 재생한다.
-- 연타는 순수 시각 효과이며 서버 피해·적중·보상·쿨다운은 기존 그대로 유지한다.
local basicUnarmedMoves={
  "U:JAB_LEFT","U:CROSS_RIGHT","U:HOOK_LEFT","U:ELBOW_RIGHT","U:FRONT_KICK_R",
}
-- [전신 무술] 4종 × 각 5타의 원본 키포즈를 관절별로 대폭 확장한다.
-- 허리·어깨·골반 회전 및 무릎과 공중 중심 이동만 조절한다. HRP/서버 물리 이동·피해량은 불변.
local function martialShot(key)
  local yaw,lean,twist,armL,armR,hipL,hipR,kneeL,kneeR,rise,elbowL,elbowR=unpack(key)
  local deg=math.rad
  return {
    Root=CFrame.new(0,math.clamp((rise or 0)*2.4,-.55,1.9),0)*
      CFrame.Angles(deg(lean*.47),deg(yaw*1.16),deg(twist*.23)),
    Spine=CFrame.Angles(deg(math.clamp(lean*1.43,-82,82)),deg(twist*1.32),deg(-twist*.40)),
    Chest=CFrame.Angles(deg(-lean*.49),deg(twist*.82),deg(twist*.27)),
    Head=CFrame.Angles(deg(-lean*.25),deg(-twist*.57),0),
    UpperArmL=CFrame.Angles(deg(math.clamp(armL*1.36,-166,150)),deg(-twist*.36),deg(-31-twist*.19)),
    UpperArmR=CFrame.Angles(deg(math.clamp(armR*1.36,-166,150)),deg(twist*.36),deg(31-twist*.19)),
    ForearmL=CFrame.Angles(deg(math.clamp((elbowL or -65)*1.16,-168,24)),0,deg(-17)),
    ForearmR=CFrame.Angles(deg(math.clamp((elbowR or -65)*1.16,-168,24)),0,deg(17)),
    ThighL=CFrame.Angles(deg(math.clamp(hipL*1.34,-162,125)),deg(twist*.24),deg(-15)),
    ThighR=CFrame.Angles(deg(math.clamp(hipR*1.34,-162,125)),deg(-twist*.24),deg(15)),
    ShinL=CFrame.Angles(deg(math.clamp(kneeL*1.11,-35,145)),0,0),
    ShinR=CFrame.Angles(deg(math.clamp(kneeR*1.11,-35,145)),0,0),
    FootL=CFrame.Angles(deg(-kneeL*.26),0,0),
    FootR=CFrame.Angles(deg(-kneeR*.26),0,0),
  }
end
-- 수치는 각 타격의 [루트회전, 전후기울기, 허리꼬임, 좌/우팔,
-- 좌/우허벅지, 좌/우무릎, 공중중심, 좌/우팔꿈치]를 지정한다.
-- 같은 동작을 다섯 번 복사하지 않고 총 40개의 독립된 영화식 키포즈를 저작한다.
local martialSkillTracks={
  ["meadow-unarmed-rush"]={
    name="FLASH_BOXING",speed=1.12,color=Color3.fromRGB(255,209,104),trailWidth=1.16,
    beats={
      {id="U:JAB_LEFT",
       load={-23,18,-31,-50,-58,27,-24,22,18,-.07,-78,-84},
       hit={28,-25,39,-122,-57,-32,30,8,28,.06,-10,-72}},
      {id="U:CROSS_RIGHT",
       load={35,15,42,-58,-67,-19,32,17,11,-.04,-81,-85},
       hit={-35,-29,-48,-48,-133,35,-31,30,7,.08,-78,-8}},
      {id="U:HOOK_LEFT",
       load={-39,12,-48,-72,-54,32,-26,24,16,-.08,-87,-79},
       hit={38,-25,55,-86,-45,-36,34,8,27,.07,-99,-69}},
      {id="U:HOOK_RIGHT",
       load={44,18,48,-54,-78,-23,35,16,23,-.06,-84,-92},
       hit={-41,-29,-54,-49,-98,36,-35,27,9,.10,-74,-102}},
      {id="U:BACKFIST_LEFT",
       load={-45,16,-47,-96,-53,35,-25,18,19,-.07,-110,-81},
       hit={49,-38,67,-128,-51,-38,44,8,32,.16,-23,-77}},
    },
  },
  ["meadow-unarmed-uppercut"]={
    name="RISING_DRAGON",speed=.92,color=Color3.fromRGB(255,151,105),trailWidth=1.24,
    beats={
      {id="U:UPPERCUT_RIGHT",
       load={-18,39,-23,-52,-24,50,48,68,71,-.18,-94,-119},
       hit={22,-34,32,-42,-136,-31,-41,8,5,.10,-73,-96}},
      {id="U:UPPERCUT_LEFT",
       load={25,43,28,-18,-65,46,49,74,80,-.17,-122,-97},
       hit={-27,-35,-38,-143,-44,-39,-34,7,8,.14,-93,-74}},
      {id="U:CROSS_RIGHT",
       load={-24,31,-29,-57,-35,39,47,68,58,-.16,-74,-98},
       hit={31,-31,48,-47,-132,-41,38,12,24,.14,-71,-9}},
      {id="U:UPPERCUT_LEFT",
       load={30,44,38,-33,-60,43,51,76,76,-.19,-127,-86},
       hit={-34,-42,-46,-151,-52,-44,-37,7,4,.23,-100,-63}},
      {id="U:UPPERCUT_RIGHT",
       load={-30,53,-47,-54,-34,54,55,91,92,-.21,-89,-124},
       hit={64,-65,76,-88,-169,-48,-56,24,27,.82,-64,-16}},
    },
  },
  ["meadow-unarmed-kick"]={
    name="TORNADO_TAEKWONDO",speed=.96,color=Color3.fromRGB(111,241,237),trailWidth=1.42,
    beats={
      {id="U:LOW_KICK_R",
       load={0,21,-33,-50,-43,26,51,17,85,-.08,-82,-87},
       hit={49,-22,43,-67,-83,23,-66,26,10,.06,-82,-79}},
      {id="U:ROUND_KICK_R",
       load={77,11,42,-58,-72,39,42,30,91,-.06,-80,-75},
       hit={152,-27,-65,-104,-38,45,-126,17,4,.56,-59,-75}},
      {id="U:SIDE_KICK_L",
       load={151,18,-49,-78,-48,59,30,94,25,-.09,-69,-78},
       hit={228,-33,65,-43,-119,-127,38,3,30,.71,-85,-76}},
      {id="U:FRONT_KICK_R",
       load={235,12,42,-67,-58,35,63,21,94,-.07,-65,-86},
       hit={312,-36,-61,-113,-48,39,-138,27,3,.87,-80,-75}},
      {id="U:ROUND_KICK_L",
       load={325,24,-64,-106,-51,75,27,74,27,.36,-68,-78},
       hit={432,-43,79,-43,-130,-149,47,2,30,1.19,-74,-81}},
    },
  },
  ["meadow-unarmed-elbow"]={
    name="CLOSE_QUARTERS_MUAY_THAI",speed=1.08,color=Color3.fromRGB(168,143,255),trailWidth=1.18,
    beats={
      {id="U:ELBOW_RIGHT",
       load={-37,24,-51,-71,-91,44,39,54,41,-.13,-113,-141},
       hit={29,-29,58,-48,-88,-36,39,6,41,.06,-112,-151}},
      {id="U:KNEE_LEFT",
       load={22,32,42,-91,-85,34,43,44,51,-.15,-119,-112},
       hit={-25,-25,-35,-133,-109,-110,47,118,36,.15,-128,-111}},
      {id="U:ELBOW_LEFT",
       load={-39,19,-48,-110,-89,39,45,37,52,-.13,-141,-111},
       hit={31,-29,56,-91,-44,42,-34,39,8,.10,-148,-104}},
      {id="U:KNEE_RIGHT",
       load={39,33,48,-78,-112,39,35,44,42,-.16,-118,-126},
       hit={-30,-26,-43,-114,-132,48,-116,32,121,.17,-108,-129}},
      {id="U:DIAGONAL_KNEE_LEFT",
       load={-44,29,-52,-119,-93,53,45,57,61,-.17,-127,-115},
       hit={43,-38,64,-147,-99,-119,55,125,41,.22,-142,-116}},
    },
  },
}
for _,style in pairs(martialSkillTracks) do
  for _,beat in ipairs(style.beats) do
    beat.loadPose=martialShot(beat.load)
    beat.hitPose=martialShot(beat.hit)
  end
end
-- 재생 중 다른 기술을 누르면 그 기술의 5연타를 마지막에 이어서 재생한다.
-- 새 서버 타격은 절대 만들지 않고 이미 승인된 입력의 시각 포즈만 예약한다.
local activeCombatMartialTrack=nil
local activeMartialScope=nil
local activeMartialApproved=false
local activeMartialFinisherPlayed=false
local queuedMartialAction=nil
local function filmEase(t)
  t=math.clamp(t,0,1)
  return t*t*(3-2*t)
end
local activeStrikeTrail=nil
local activeStrikeTrailIndex=0
local function stopStrikeTrail()
  if activeStrikeTrail then activeStrikeTrail.Destroy();activeStrikeTrail=nil end
end
-- Upper-body and real leg joints are both owned only while a melee pose plays.
-- The normal Roblox walk/run Animator is followed, not replaced.
local combatUpperJoints = {Root=true, Waist=true, Neck=true, LeftShoulder=true, RightShoulder=true,
  LeftElbow=true, RightElbow=true, LeftWrist=true, RightWrist=true,
  LeftHip=true,RightHip=true,LeftKnee=true,RightKnee=true,LeftAnkle=true,RightAnkle=true}
local combatRecoveryUntil = nil
local function finishNativeCombatMotion()
  stopStrikeTrail()
  if activeCombatController then activeCombatController.Destroy(true) end
  if activeCombatCharacter and activeCombatCharacter.Parent then
    activeCombatCharacter:SetAttribute("NativeCombatMotionState", "IDLE")
  end
  activeCombatController = nil
  activeStrikeTrailIndex = 0
  combatRecoveryUntil = nil
  activeCombatCombo = nil
  activeCombatMartialTrack = nil
  activeMartialScope = nil
  activeMartialApproved = false
  activeMartialFinisherPlayed = false
  queuedMartialAction = nil
  activeCombatCharacter = nil
  table.clear(combatPoseTargets)
  table.clear(combatR15Targets)
end
player.CharacterAdded:Connect(function()
  finishNativeCombatMotion()
  predictedCombatUntil=0
  table.clear(pendingCombatMotion)
end)
playNativeCombatMotion=function(approvedScope,approvedEvent,serverApproved)
  if os.clock()<dodgePoseUntil then return false end
  if not authorizedCombatScopes[approvedScope] then return false end
  local character = player.Character
  local humanoid = character and character:FindFirstChildOfClass("Humanoid")
  if not combatMotionSource or not humanoid or humanoid.Health <= 0 then return end
  local r6=humanoid.RigType==Enum.HumanoidRigType.R6
  local tool = character:FindFirstChildOfClass("Tool")
  local equipment = tool and (tool:GetAttribute("WeaponMotionProfile") or tool.Name) or "UNARMED"
  local profile = equipment == "UNARMED" and "UNARMED" or combatMotionSource.ResolveWeaponProfile(equipment)
  if not profile then
    character:SetAttribute("NativeCombatMotionState", "MATCHING_WEAPON_MOTION_REQUIRED")
    return
  end
  -- [공용 자산 실연결] 선택된 스튜디오 모션과 자사 R15 포즈 라이브러리의 동작 ID를 연결한다.
  -- 자산 카탈로그 ATTACK_LIGHT_1은 공용 포즈 원본 LIGHT_ATTACK_1에 대응한다.
  if not hasStudioAssetAtom("MOTION", "ATTACK_LIGHT_1") then
    character:SetAttribute("NativeCombatMotionState", "APPROVED_MOTION_ATOM_REQUIRED")
    return
  end
  -- 승인된 맨손 포즈를 기존 아바타의 실제 관절에만 적용한다.
  if not hasStudioAssetAtom("CHARACTER","HAND_BARE") then return end
  local motionOk, authoredMotion = pcall(combatMotionSource.Describe, "LIGHT_ATTACK_1")
  if not motionOk or not authoredMotion or authoredMotion.rig ~= "R15" then
    character:SetAttribute("NativeCombatMotionState", "R15_MOTION_SOURCE_REQUIRED")
    return
  end
  local joints = {}
  for _, descendant in ipairs(character:GetDescendants()) do
    -- Roblox Avatar Joint Upgrade uses AnimationConstraint for new R15 avatars.
    -- Prefer it over legacy Motor6D when both exist on an imported rig.
    local nativeJoint=descendant:IsA("AnimationConstraint") or descendant:IsA("Motor6D")
    local connected=nativeJoint and (
      (descendant:IsA("AnimationConstraint") and descendant.Attachment0 and descendant.Attachment1
        and descendant.Attachment0.Parent and descendant.Attachment1.Parent)
      or (descendant:IsA("Motor6D") and descendant.Part0 and descendant.Part1))
    if connected
      and (combatUpperJoints[descendant.Name] or (r6 and (descendant.Name=="RootJoint" or descendant.Name=="Left Shoulder" or descendant.Name=="Right Shoulder" or descendant.Name=="Left Hip" or descendant.Name=="Right Hip"))) then
      if not joints[descendant.Name] or descendant:IsA("AnimationConstraint") then
        joints[descendant.Name] = descendant
      end
    end
  end
  if not ((r6 and joints.RootJoint and joints["Left Shoulder"] and joints["Right Shoulder"])
    or (not r6 and joints.Waist and joints.LeftShoulder and joints.RightShoulder
    and joints.LeftElbow and joints.RightElbow)) then
    character:SetAttribute("NativeCombatMotionState", "COMPATIBLE_R15_JOINTS_REQUIRED")
    return
  end
  if activeCombatCharacter ~= character then finishNativeCombatMotion() end
  -- 이미 시작된 5타를 입력/서버 확인 이벤트가 중간에서 끊지 않는다.
  -- 입력 자체와 서버의 실제 명중·피해 처리는 계속 허용한다.
  if activeCombatCombo and activeCombatCharacter==character
    and os.clock()-activeCombatStartedAt < activeCombatCombo.duration then
    if profile=="UNARMED" and martialSkillTracks[approvedScope]
      and martialSkillTracks[approvedScope]~=activeCombatMartialTrack then
      queuedMartialAction={scope=approvedScope,sequence=approvedEvent,confirmed=serverApproved==true}
    elseif serverApproved==true and activeMartialScope==approvedScope then
      activeMartialApproved=true
    end
    return true
  end
  local approvedIndex=tonumber(approvedEvent) or 1
  local chosenMoves={}
  local martialTrack=profile=="UNARMED" and martialSkillTracks[approvedScope] or nil
  if martialTrack then
    -- 각 버튼의 1~5타는 고정된 영화식 연출. 승인 시퀀스가 순서를 섞지 않는다.
    for i,beat in ipairs(martialTrack.beats) do chosenMoves[i]=beat.id end
  elseif profile=="UNARMED" then
    local offset=(approvedIndex-1)%#basicUnarmedMoves
    for i=1,5 do chosenMoves[i]=basicUnarmedMoves[(offset+i-1)%#basicUnarmedMoves+1] end
  else
    -- 장착 무기는 기존 무기별 단타와 공격 밸런스를 그대로 유지한다.
    local routeOk,route=pcall(combatMotionSource.CreateCombatCombo,profile)
    if not routeOk or not route or #route.steps==0 then return end
    chosenMoves[1]=route.steps[(approvedIndex-1)%#route.steps+1].id
  end
  -- 공용 CreateCombatCombo는 불변 객체다. 실제 저작된 5개의 관절 포즈를 연결한다.
  local ok,combo=pcall(combatMotionSource.CreateCombatCombo,
    profile,chosenMoves,{speed=martialTrack and martialTrack.speed or (profile=="UNARMED" and 1.22 or 1)})
  if not ok or not combo or not combo.steps or #combo.steps~=#chosenMoves then return end
  combatRecoveryUntil = nil
  activeCombatCharacter = character
  activeCombatCombo = combo
  activeCombatMartialTrack = martialTrack
  activeMartialScope = martialTrack and approvedScope or nil
  activeMartialApproved = serverApproved==true
  activeMartialFinisherPlayed = false
  queuedMartialAction = nil
  activeCombatStartedAt = os.clock()
  activeCombatController = activeCombatController or combatMotionSource.BindJointPose(joints, {
    followAnimator = true,response = 42,
  })
  stopStrikeTrail()
  activeStrikeTrailIndex=0

  character:SetAttribute("NativeCombatJointCount",activeCombatController.jointCount)
  character:SetAttribute("NativeCombatMotionAtom", "LIGHT_ATTACK_1")
  character:SetAttribute("NativeCombatActionId", chosenMoves[1])
  character:SetAttribute("NativeCombatStrikeCount", #chosenMoves)
  character:SetAttribute("NativeCombatStyle", martialTrack and martialTrack.name or "BASIC")
  character:SetAttribute("NativeCombatMotionProfile", profile)
  character:SetAttribute("NativeCombatMotionState", "SOURCE_POSE_PLAYING_UNVERIFIED")
  return true
end
player:GetAttributeChangedSignal("ApprovedCombatMotion"):Connect(function()
  local scope,serial=tostring(player:GetAttribute("ApprovedCombatMotion") or ""):match("^([^:]+):(%d+)$")
  if not scope or not serial then return end
  local predictedAt=pendingCombatMotion[scope]
  pendingCombatMotion[scope]=nil
  -- 동일 입력의 서버 승인으로 모션을 두 번 시작하지 않는다.
  if predictedAt and os.clock()-predictedAt<1 then
    -- 예측 모션은 끊지 않고 서버 승인 사실만 동기화한다.
    if activeMartialScope==scope then activeMartialApproved=true end
    if queuedMartialAction and queuedMartialAction.scope==scope then
      queuedMartialAction.confirmed=true
    end
    return
  end
  playNativeCombatMotion(scope,tonumber(serial),true)
end)
-- Original Roblox 61-motion library: cast, guard, parry, dodge, craft,
-- gather and emote use only available R15 joints and server-approved actions.
-- Existing Animator continues driving walk/run/jump underneath visual overlays.
local skillMotionR15=nil
local skillMotionCharacter=nil
local skillMotionDeadline=0
local skillMotionState=nil
local skillMotionStart=0
local skillMotionDuration=0
local skillMotionJoints={}
local skillMotionAvailable={}
local skillMotionTargets={}
local skillMotionR15Targets={}
local skillMotionMapping={
  Waist="Spine",Neck="Head",LeftShoulder="UpperArmL",RightShoulder="UpperArmR",
  LeftElbow="ForearmL",RightElbow="ForearmR",LeftWrist="HandL",RightWrist="HandR",
  LeftHip="ThighL",RightHip="ThighR",LeftKnee="ShinL",RightKnee="ShinR",
  RootJoint="Spine",["Left Shoulder"]="UpperArmL",["Right Shoulder"]="UpperArmR",
  ["Left Hip"]="ThighL",["Right Hip"]="ThighR",
}
local skillMotionStates={
  INTERACT_USE="INTERACT",GATHER_SWING="INTERACT",CRAFT_LOOP="INTERACT",
  HEAVY_ATTACK_1="ATTACK",CAST_BURST="ATTACK",PARRY_PERFECT="ATTACK",
  DODGE_LEFT="GESTURE",DODGE_RIGHT="GESTURE",BLOCK_HOLD="INTERACT",
  CHANNEL_LOOP="GESTURE",SPRINT="START",EMOTE_WAVE="GESTURE",
  LIGHT_ATTACK_1="ATTACK",
}
local function finishMeadowSkillPose()
  if skillMotionR15 then skillMotionR15.Destroy(true) end
  skillMotionR15=nil
  skillMotionCharacter=nil
  skillMotionState=nil
  table.clear(skillMotionJoints)
  table.clear(skillMotionAvailable)
  table.clear(skillMotionTargets)
  table.clear(skillMotionR15Targets)
end
player.CharacterAdded:Connect(function()
  dodgePoseUntil=0
  finishMeadowSkillPose()
end)
player:GetAttributeChangedSignal("ApprovedCombatMotion"):Connect(function()
  if os.clock()>=dodgePoseUntil then finishMeadowSkillPose() end
end)
player:GetAttributeChangedSignal("ApprovedActionMotion"):Connect(function()
  local id,serial=tostring(player:GetAttribute("ApprovedActionMotion") or ""):match("^([^:]+):(%d+)$")
  local action=id and actionsById[id]
  if not serial or not action or action.Kind=="COMBAT" or not action.MotionAtom then return end
  local isDodge=id=="skill-meadow-dodge-left" or id=="skill-meadow-dodge-right"
  if os.clock()<dodgePoseUntil and not isDodge then return end
  local character=player.Character
  local humanoid=character and character:FindFirstChildOfClass("Humanoid")
  if not humanoid or humanoid.Health<=0
    or not combatMotionSource or not combatMotionSource.SampleProceduralActorMotion then return end
  local state=skillMotionStates[action.MotionAtom]
  if not state then return end
  local good,meta=pcall(combatMotionSource.Describe,action.MotionAtom)
  if not good or not meta or meta.rig~="R15" then return end
  finishMeadowSkillPose()
  finishNativeCombatMotion()
  for _,joint in ipairs(character:GetDescendants()) do
    -- Share the real R15 pose path with both legacy and upgraded avatar joints.
    local nativeJoint=joint:IsA("AnimationConstraint") or joint:IsA("Motor6D")
    local connected=nativeJoint and (
      (joint:IsA("AnimationConstraint") and joint.Attachment0 and joint.Attachment1
        and joint.Attachment0.Parent and joint.Attachment1.Parent)
      or (joint:IsA("Motor6D") and joint.Part0 and joint.Part1))
    if connected and skillMotionMapping[joint.Name] then
      if not skillMotionJoints[joint.Name] or joint:IsA("AnimationConstraint") then
        skillMotionJoints[joint.Name]=joint
      end
      skillMotionAvailable[skillMotionMapping[joint.Name]]=true
    end
  end
  local r6=humanoid.RigType==Enum.HumanoidRigType.R6
  if r6 then
    if not isDodge or not (skillMotionJoints.RootJoint and skillMotionJoints["Left Shoulder"]
      and skillMotionJoints["Right Shoulder"]) then return end
  elseif not (skillMotionJoints.Waist and skillMotionJoints.LeftShoulder and
    skillMotionJoints.RightShoulder and skillMotionJoints.LeftElbow and
    skillMotionJoints.RightElbow) then return end
  skillMotionAvailable.Chest=true
  skillMotionR15=combatMotionSource.BindJointPose(skillMotionJoints,{
    followAnimator=true,response=26,
  })
  skillMotionCharacter=character
  skillMotionState=state
  skillMotionStart=os.clock()
  skillMotionDuration=math.clamp(tonumber(meta.duration) or .7,.25,1.4)
  skillMotionDeadline=skillMotionStart+skillMotionDuration+.16
  if isDodge then dodgePoseUntil=skillMotionDeadline end
  character:SetAttribute("NativeSkillMotionAtom",action.MotionAtom)
  character:SetAttribute("NativeSkillActionId",id)
end)
RunService.PreSimulation:Connect(function(dt)
  if not skillMotionR15 or not skillMotionCharacter then return end
  local humanoid=skillMotionCharacter:FindFirstChildOfClass("Humanoid")
  if player.Character~=skillMotionCharacter or not humanoid or humanoid.Health<=0
    or os.clock()>=skillMotionDeadline then
    finishMeadowSkillPose()
    return
  end
  table.clear(skillMotionTargets)
  table.clear(skillMotionR15Targets)
  local phase=math.clamp((os.clock()-skillMotionStart)/skillMotionDuration,0,1)
  local _,matched=combatMotionSource.SampleProceduralActorMotion(skillMotionState,phase,{
    bodyPlan="BIPED",actorClass="PLAYER",availableJoints=skillMotionAvailable,
    mobileTier=nativeTouchEnabled and "LOW" or "HIGH",secondary=.65,
  },skillMotionTargets)
  if not matched then finishMeadowSkillPose();return end
  local actionId=skillMotionCharacter:GetAttribute("NativeSkillActionId")
  if actionId=="skill-meadow-dodge-left" or actionId=="skill-meadow-dodge-right" then
    -- [자동 회피 포즈] 서버가 회피에 성공한 경우 실제 골반·양다리를 옆으로 젖힌다.
    local sign=actionId=="skill-meadow-dodge-left" and -1 or 1
    local ease=math.sin(math.pi*phase)
    skillMotionTargets.Spine=CFrame.Angles(-.15*ease,sign*.18*ease,sign*.53*ease)
    skillMotionTargets.ThighL=CFrame.Angles(-.38*ease,0,sign*.32*ease)
    skillMotionTargets.ThighR=CFrame.Angles(.46*ease,0,sign*.42*ease)
    skillMotionTargets.ShinL=CFrame.Angles(.56*ease,0,0)
    skillMotionTargets.ShinR=CFrame.Angles(.42*ease,0,0)
    skillMotionTargets.UpperArmL=CFrame.Angles(-.45*ease,0,-sign*.35*ease)
    skillMotionTargets.UpperArmR=CFrame.Angles(-.55*ease,0,sign*.35*ease)
  end
  if humanoid.RigType==Enum.HumanoidRigType.R6 then
    -- [구형 아바타 회피] 기존 실제 몸통·팔·다리 관절에 같은 좌우 피하기 포즈를 연결한다.
    skillMotionR15Targets.RootJoint=skillMotionTargets.Spine
    skillMotionR15Targets["Left Shoulder"]=skillMotionTargets.UpperArmL
    skillMotionR15Targets["Right Shoulder"]=skillMotionTargets.UpperArmR
    skillMotionR15Targets["Left Hip"]=skillMotionTargets.ThighL
    skillMotionR15Targets["Right Hip"]=skillMotionTargets.ThighR
  else
    combatMotionSource.MapCombatPoseToR15(skillMotionTargets,skillMotionR15Targets)
  end
  skillMotionR15.Step(skillMotionR15Targets,dt)
end)

RunService.PreSimulation:Connect(function(dt)
  if not (activeCombatController and activeCombatCombo and activeCombatCharacter) then return end
  local character = player.Character
  local humanoid = character and character:FindFirstChildOfClass("Humanoid")
  if character ~= activeCombatCharacter or not humanoid or humanoid.Health <= 0 then
    finishNativeCombatMotion()
    return
  end
  table.clear(combatPoseTargets)
  table.clear(combatR15Targets)
  if combatRecoveryUntil then
    activeCombatController.Step(nil, dt) -- 중립 복귀는 공격 프레임 입력과 구분한다.
    if os.clock() >= combatRecoveryUntil then
      local queued=queuedMartialAction
      finishNativeCombatMotion()
      if queued then playNativeCombatMotion(queued.scope,queued.sequence,queued.confirmed) end
    end
    return
  end
  local timeInAction=os.clock()-activeCombatStartedAt
  local _,strikeIndex,finished=combatMotionSource.SampleCombatCombo(
    activeCombatCombo,timeInAction,combatPoseTargets
  )
  local currentStep=activeCombatCombo.steps[strikeIndex]
  local stepPhase=math.clamp((timeInAction-currentStep.start)/math.max(.05,currentStep.duration),0,1)
  if type(combatMotionSource.RefineActorCinematicPose)=="function" then
    combatMotionSource.RefineActorCinematicPose(combatPoseTargets,{
      actorClass="PLAYER",bodyPlan="BIPED",weaponStyle=activeCombatCombo.profileId,
      actionPhase=stepPhase,
      authorizedImpact=true,grounded=humanoid.FloorMaterial~=Enum.Material.Air,
      visualSpeed=humanoid.MoveDirection.Magnitude,
      mobileTier=nativeTouchEnabled and "LOW" or "HIGH",
      comboContinuity=#activeCombatCombo.steps==5 and .82 or 0,
      intensity=#activeCombatCombo.steps==5 and 1.5 or 1,secondary=.7,
    })
  end
  if activeCombatMartialTrack then
    -- 공통 잽/킥 반복 대신 4개 무술 × 5타의 독립된 실제 관절 키포즈를 샘플한다.
    -- 준비 자세에서 타격으로 폭발하고, 다음 타의 준비 자세로 연속 블렌딩한다.
    local beat=activeCombatMartialTrack.beats[strikeIndex]
    local elapsed=timeInAction-currentStep.start
    local fromPose,toPose,alpha
    if elapsed<currentStep.ready then
      fromPose=beat.loadPose;toPose=beat.loadPose;alpha=0
    elseif elapsed<currentStep.contact then
      fromPose=beat.loadPose;toPose=beat.hitPose
      alpha=filmEase((elapsed-currentStep.ready)/math.max(.001,currentStep.contact-currentStep.ready))
    elseif elapsed<currentStep.recoil then
      fromPose=beat.hitPose;toPose=beat.hitPose;alpha=0
    else
      local nextBeat=activeCombatMartialTrack.beats[strikeIndex+1]
      fromPose=beat.hitPose
      toPose=nextBeat and nextBeat.loadPose or nil
      alpha=filmEase((elapsed-currentStep.recoil)/math.max(.001,currentStep.duration-currentStep.recoil))
    end
    for joint,from in pairs(fromPose) do
      local target=from:Lerp(toPose and toPose[joint] or CFrame.identity,alpha)
      local source=combatPoseTargets[joint]
      -- 4개 무술의 저작된 팔·허리·다리 폭을 95% 이상 사용해 작은 기본 포즈에 묻히지 않게 한다.
      combatPoseTargets[joint]=joint=="Root" and target
        or (source and source:Lerp(target,.97) or target)
    end
    if activeCombatMartialTrack.name=="RISING_DRAGON" then
      -- 승룡권식 축회전과 공중 상승: R15 관절만 움직이고 실제 위치·피해 권한은 변경하지 않는다.
      local risePhase=filmEase(math.clamp(elapsed/math.max(.001,currentStep.duration),0,1))
      combatPoseTargets.Root=(combatPoseTargets.Root or CFrame.identity)*
        CFrame.Angles(math.rad(-24*risePhase),math.rad(75*risePhase),0)
    elseif activeCombatMartialTrack.name=="TORNADO_TAEKWONDO" then
      -- 각 타의 한 바퀴 회전을 포즈 보간에 맡기지 않고 프레임별로 구동한다.
      -- CFrame:Lerp는 360도 방향을 최단경로로 접으므로 회전 프레임은 별도로 누적한다.
      local sweep=filmEase(math.clamp(elapsed/math.max(.001,currentStep.duration),0,1))
      combatPoseTargets.Root=(combatPoseTargets.Root or CFrame.identity)*
        CFrame.Angles(0,math.rad(360*sweep),0)
    end
  elseif activeCombatCombo.profileId=="UNARMED" then
    -- 기본 공격은 기존 저작 포즈를 보존하되 팔·골반의 가시성을 높인다.
    for name,pose in pairs(combatPoseTargets) do
      if typeof(pose)=="CFrame" then
        local axis,angle=pose:ToAxisAngle()
        local gain=(name=="Spine" or name=="Chest") and 1.34
          or name=="Head" and 1.13
          or (name:find("Arm",1,true) or name:find("Thigh",1,true)) and 1.28
          or (name:find("Shin",1,true) or name:find("Forearm",1,true)) and 1.16
          or 1.1
        combatPoseTargets[name]=CFrame.fromAxisAngle(axis,math.min(angle*gain,math.rad(156)))
      end
    end
  end
  -- [연타 잔상] 5개의 실제 손·발 타격마다 원본 VFX를 교체한다.
  if strikeIndex~=activeStrikeTrailIndex then
    activeStrikeTrailIndex=strikeIndex
    if activeCombatCharacter then
      activeCombatCharacter:SetAttribute("NativeCombatStrikeIndex",strikeIndex)
    end
    stopStrikeTrail()
    if combatVFX and activeCombatCombo.profileId=="UNARMED"
      and timeInAction<activeCombatCombo.duration then
      local chosenMove=currentStep.id
      local leg=chosenMove:find("KICK",1,true) or chosenMove:find("KNEE",1,true)
      local left=chosenMove:find("LEFT",1,true) or chosenMove:match("_L$")
      local hostName=leg and (left and "LeftFoot" or "RightFoot")
        or (left and "LeftHand" or "RightHand")
      local host=character:FindFirstChild(hostName)
      if host and host:IsA("BasePart") then
        local style=activeCombatMartialTrack
        local color=style and style.color or
          (leg and Color3.fromRGB(124,245,220) or Color3.fromRGB(255,207,112))
        local ok,_,controller=pcall(combatVFX.AttachShortTrail,host,{
          color=color,lifetime=nativeTouchEnabled and .19 or .32,
          width=style and style.trailWidth or (nativeTouchEnabled and .6 or .76),
          length=style and 3.2 or 1.3,
        })
        if ok and controller then activeStrikeTrail=controller end
      end
    end
  end
  if activeStrikeTrail then
    local within=timeInAction-currentStep.start
    activeStrikeTrail.SetEnabled(within>=currentStep.ready*.4 and within<currentStep.recoil)
  end
  if humanoid.RigType==Enum.HumanoidRigType.R6 then
    -- 기존 R6 관절만 사용한다. 없는 팔꿈치·무릎을 생성하지 않는다.
    local torso=character:FindFirstChild("Torso")
    local mapping={RootJoint="Spine",Neck="Head",["Left Shoulder"]="UpperArmL",
      ["Right Shoulder"]="UpperArmR",["Left Hip"]="ThighL",["Right Hip"]="ThighR"}
    if torso then
      for _,joint in ipairs(character:GetDescendants()) do
        local channel=joint:IsA("Motor6D") and mapping[joint.Name]
        if channel then
          local pose=combatPoseTargets[channel] or CFrame.identity
          if channel=="Spine" then
            pose=(combatPoseTargets.Root or CFrame.identity)*pose*(combatPoseTargets.Chest or CFrame.identity)
          end
          local basis=joint.C0.Rotation
          combatR15Targets[joint.Name]=basis:Inverse()*pose*basis
        end
      end
    end
  else
    combatMotionSource.MapCombatPoseToR15(combatPoseTargets, combatR15Targets)
    if combatPoseTargets.Root then combatR15Targets.Root=combatPoseTargets.Root end
  end
  activeCombatController.Step(combatR15Targets, dt)
  -- [5타 막타] 서버 승인·다섯 번째 접촉에서 원본 손발에 곡선 Beam 연출을 만든다.
  -- 네모 입자 스프라이트 대신 빛의 곡선 궤적을 사용하고, 임의 메시/파트는 만들지 않는다.
  if activeCombatMartialTrack and activeMartialApproved and not activeMartialFinisherPlayed
    and strikeIndex==5 and timeInAction-currentStep.start>=currentStep.contact then
    activeMartialFinisherPlayed=true
    local style=activeCombatMartialTrack
    local limbName=style.name=="TORNADO_TAEKWONDO" and "LeftFoot"
      or style.name=="FLASH_BOXING" and "LeftHand"
      or style.name=="RISING_DRAGON" and "RightHand" or "LeftHand"
    local limb=character:FindFirstChild(limbName)
    local rootPart=character:FindFirstChild("HumanoidRootPart")
    if limb and limb:IsA("BasePart") and rootPart then
      for arc=1,4 do
        local a0=Instance.new("Attachment")
        a0.Name="MartialFinisherStart"
        a0.Position=Vector3.new(-1.8+(arc-1)*.65,-.5+(arc-1)*.35,-1.5)
        a0.CFrame=CFrame.Angles(0,math.rad((arc-1)*26),math.rad(20))
        a0.Parent=rootPart
        local a1=Instance.new("Attachment")
        a1.Name="MartialFinisherEnd"
        a1.Position=Vector3.new((arc-2)*.25,1.1+arc*.26,0)
        a1.CFrame=CFrame.Angles(0,math.rad(-25*arc),math.rad(-18))
        a1.Parent=limb
        local beam=Instance.new("Beam")
        beam.Name="MartialFinisherArc"
        beam.Attachment0=a0
        beam.Attachment1=a1
        beam.CurveSize0=style.name=="RISING_DRAGON" and 6.4 or 4.5
        beam.CurveSize1=style.name=="RISING_DRAGON" and -5.2 or -3.8
        beam.Segments=24
        beam.FaceCamera=true
        beam.LightEmission=1
        beam.LightInfluence=0
        beam.Width0=.08+arc*.11
        beam.Width1=arc==2 and 1.25 or .48
        beam.Color=ColorSequence.new(Color3.fromRGB(255,255,239),style.color)
        beam.Transparency=NumberSequence.new({
          NumberSequenceKeypoint.new(0,.88),
          NumberSequenceKeypoint.new(.18,.05),
          NumberSequenceKeypoint.new(.8,.13),
          NumberSequenceKeypoint.new(1,1),
        })
        beam.Parent=a0
        debris:AddItem(a0,.43)
        debris:AddItem(a1,.43)
      end
      local flash=Instance.new("Highlight")
      flash.Name="MartialFinisherGlow"
      flash.Adornee=character
      flash.FillColor=style.color
      flash.FillTransparency=.66
      flash.OutlineColor=Color3.fromRGB(255,245,211)
      flash.OutlineTransparency=.18
      flash.DepthMode=Enum.HighlightDepthMode.Occluded
      flash.Parent=character
      debris:AddItem(flash,.27)
    end
  end
  if finished then combatRecoveryUntil = os.clock() + .18 end
end)


-- Native 3D mob actions: existing CC0 MeshParts only. The game does not
-- invent limbs, bones or model parts. Server-owned attack states remain authoritative.
local meadowMobWorld=workspace:WaitForChild("FantasySurvivalWorld")
local meadowMobMotion=combatMotionSource
local meadowMobControllers={}
local meadowMobRigWarnings={}
local nativeMobMotionMap={
  IDLE="IDLE",CHASE="RUN",RUN="RUN",RETURN_TO_SPAWN="WALK",WALK="WALK",
  ANTICIPATION="ANTICIPATION",ATTACK="ATTACK",RECOVERY="RECOVERY",HIT="HIT",DEATH="DEATH",
}
-- [4족 애니메이션] 걷기는 네 발 순차 접지, 질주는 앞·뒷발 묶음 접지를 사용한다.
local quadrupedFootPhases={
  {"FL",0,0},{"FR",.5,.5},{"BL",.5,.5},{"BR",0,0},
}
-- [몹 실제 리깅] 기존 Bone/Motor6D/AnimationConstraint의 채널명을 재사용한다.
local nativeMobJointAlias={
  FrontLeftShoulder="FLHip",FrontRightShoulder="FRHip",
  FrontLeftHip="FLHip",FrontRightHip="FRHip",
  HindLeftHip="BLHip",HindRightHip="BRHip",
  RearLeftHip="BLHip",RearRightHip="BRHip",
  FrontLeftKnee="FLKnee",FrontRightKnee="FRKnee",
  RearLeftKnee="BLKnee",RearRightKnee="BRKnee",
  TailBaseJoint="Tail",ChestJoint="Chest",SpineJoint="Spine",
  NeckJoint="Neck",JawJoint="Jaw",TailBase="Tail",TailTip="Tail",
  WingLeft="WingL",WingRight="WingR",
}
-- [몬스터 공통 임팩트] 기존 공용 풀링 VFX만 사용한다. 피해·쿨다운·히트박스는 서버 전용.
local function mobVfx(pattern,where,stage,facing)
  if not combatVFX or typeof(where)~="Vector3" then return end
  local boss=pattern=="GOLEM_SLAM" or pattern=="GOLEM_SHOCKWAVE"
  local flying=pattern=="BEE_SWEEP" or pattern=="BEE_STING"
    or pattern=="BAT_DIVE" or pattern=="BAT_SWEEP"
  local wolf=pattern=="WOLF_BITE" or pattern=="WOLF_LUNGE"
  local boar=pattern=="BOAR_CHARGE" or pattern=="BOAR_TUSK"
  local skeleton=pattern=="SKELETON_CLEAVE" or pattern=="SKELETON_THRUST"
  local tint=boss and Color3.fromRGB(255,131,91)
    or flying and Color3.fromRGB(243,224,123)
    or wolf and Color3.fromRGB(173,217,245)
    or boar and Color3.fromRGB(210,157,119)
    or skeleton and Color3.fromRGB(188,176,232)
    or Color3.fromRGB(163,219,164)
  local accent=boss and Color3.fromRGB(255,222,168)
    or wolf and Color3.fromRGB(222,246,255)
    or Color3.fromRGB(244,241,219)
  local charge=pattern=="WOLF_LUNGE" or pattern=="BOAR_CHARGE"
    or pattern=="GOLEM_SLAM" or pattern=="GOLEM_SHOCKWAVE"
  local effect=stage=="DEATH" and "DESTRUCTION_BURST"
    or stage=="ANTICIPATION" and (boss and "BOSS_WARNING_PULSE" or "ATTACK_TELEGRAPH_PULSE")
    or stage=="IMPACT" and (charge and "SHAPE_BURST" or "IMPACT_FLASH")
    or "STATUS_PULSE"
  local forward=typeof(facing)=="Vector3"
    and Vector3.new(facing.X,0,facing.Z) or Vector3.zero
  if forward.Magnitude>.1 then forward=forward.Unit else forward=Vector3.zero end
  local impactPoint=where
  if stage=="IMPACT" and forward.Magnitude>.1 then
    impactPoint+=forward*(boss and 1.2 or wolf and 1.45 or 1.0)
      +Vector3.new(0,boss and 1.0 or flying and 1.7 or .85,0)
  end
  local ground=nil
  if boss then
    local ray=RaycastParams.new();ray.FilterType=Enum.RaycastFilterType.Include
    ray.FilterDescendantsInstances={workspace.Terrain}
    ground=workspace:Raycast(where+Vector3.new(0,24,0),Vector3.new(0,-80,0),ray)
  end
  if ground and stage=="ANTICIPATION" then impactPoint=ground.Position+Vector3.new(0,.08,0) end
  local cframe=forward.Magnitude>.1 and CFrame.lookAt(impactPoint,impactPoint+forward)
    or CFrame.new(impactPoint)
  local ok,err=pcall(combatVFX.Create,effect,{
    cframe=cframe,parent=workspace,color=tint,accent=accent,
    scale=boss and 1 or charge and .86 or .72,
    duration=stage=="ANTICIPATION" and (boss and .68 or .4)
      or stage=="DEATH" and .55 or .28,
    reducedMotion=reducedEffects,
    -- [공격 범위 의미] 실제 광역 판정은 기존 수문장 충격파에만 있다.
    startDiameter=boss and (pattern=="GOLEM_SHOCKWAVE" and 16.8 or 10.4) or nil,
    endDiameter=boss and (pattern=="GOLEM_SHOCKWAVE" and 16.8 or 10.4) or nil,
    textureKey=(wolf or skeleton) and stage=="IMPACT" and "slash" or nil,
    hideFlash=stage=="ANTICIPATION",
    hideRing=pattern=="GOLEM_SLAM" or stage=="IMPACT" and not charge,
    mist=stage=="DEATH" and not reducedEffects,
    count=reducedEffects and 2 or stage=="DEATH" and 7 or stage=="IMPACT" and 5 or 3,
  })
  if not ok then warn("Original mob VFX unavailable: "..tostring(err)) end
end
local function bindOriginalMob(model)
  if not model:IsA("Model") or meadowMobControllers[model] then return end
  local species=model:GetAttribute("Species") or model:GetAttribute("MeadowWildlife")
  if species==nil then
    -- Attribute replication can arrive after a source CC0 Model. Both enemy
    -- Species and passive MeadowWildlife are real server-authored roles.
    local function onceReady()
      if model.Parent and not meadowMobControllers[model] then bindOriginalMob(model) end
    end
    model:GetAttributeChangedSignal("Species"):Once(onceReady)
    model:GetAttributeChangedSignal("MeadowWildlife"):Once(onceReady)
    return
  end
  if species~="wolf" and species~="bee" and species~="golem"
    and species~="deer" and species~="boar" and species~="rabbit"
    and species~="bat" and species~="mushroom" and species~="skeleton" then return end
  -- [적 표시] 실제 서버 적 모델만 표시하고 벽 뒤·먼 거리의 화면 혼잡을 줄인다.
  if model:GetAttribute("Species") and not model:FindFirstChild("MeadowEnemyLabel") then
    local host=model.PrimaryPart or model:FindFirstChildWhichIsA("BasePart",true)
    if host then
      local _,bounds=model:GetBoundingBox()
      local plate=Instance.new("BillboardGui");plate.Name="MeadowEnemyLabel"
      plate.Adornee=host;plate.AlwaysOnTop=false;plate.MaxDistance=55
      plate.Size=UDim2.fromOffset(154,44);plate.StudsOffsetWorldSpace=Vector3.new(0,bounds.Y*.65+1,0)
      plate.Parent=model
      local name=Instance.new("TextLabel");name.Name="EnemyIdentity";name.BackgroundTransparency=1
      name.Size=UDim2.new(1,0,0,24);name.Font=Enum.Font.GothamBold;name.TextSize=13
      name.TextColor3=Color3.fromRGB(255,236,219);name.TextStrokeTransparency=.25;name.Parent=plate
      local bar,control=CommonUI.CreateHealthBar({name="EnemyHealth",textSize=10})
      bar.Position=UDim2.fromOffset(12,25);bar.Size=UDim2.new(1,-24,0,12);bar.Parent=plate
      local function updateEnemyLabel()
        local hp=model:GetAttribute("EnemyHealth") or 0
        local maximum=model:GetAttribute("EnemyMaxHealth") or math.max(1,hp)
        local state=model:GetAttribute("AttackState")
        plate.Enabled=hp>0
        name.Text=(model:GetAttribute("Boss") and "보스 · " or "")..model.Name
          ..(model:GetAttribute("BossPhase")==2 and " · 2단계" or "")
          ..(state=="STUNNED" and " · 기절" or "")
        control.SetRatio(hp/math.max(1,maximum),string.format("%d",hp))
      end
      model:GetAttributeChangedSignal("EnemyHealth"):Connect(updateEnemyLabel)
      model:GetAttributeChangedSignal("EnemyMaxHealth"):Connect(updateEnemyLabel)
      model:GetAttributeChangedSignal("BossPhase"):Connect(updateEnemyLabel)
      model:GetAttributeChangedSignal("AttackState"):Connect(updateEnemyLabel)
      updateEnemyLabel()
    end
  end
  -- [움직이는 원본 관절] 이름이 다르거나 Blender식 접미사가 붙어도 실제 메시의 뼈를 매핑한다.
  local joints,available={},{}
  local sourceChannels={
    FLHip=true,FRHip=true,BLHip=true,BRHip=true,
    FLKnee=true,FRKnee=true,BLKnee=true,BRKnee=true,
    FLAnkle=true,FRAnkle=true,BLAnkle=true,BRAnkle=true,
    WingL=true,WingR=true,Tail=true,Chest=true,Spine=true,
    Neck=true,Jaw=true,Head=true,ThighL=true,ThighR=true,
    ShinL=true,ShinR=true,UpperArmL=true,UpperArmR=true,
    ForearmL=true,ForearmR=true,
  }
  -- [늑대 원본 리그] 해시 확인 FBX의 실제 스킨 관절과 IK 기준으로 앞·뒤·좌·우를 연결한다.
  -- IK 조작용 뼈를 가짜 다리로 쓰지 않고 실제 가중치가 있는 Bone.008~019만 구동한다.
  local wolfSourceChannels={
    bone001="Chest",bone002="Neck",bone003="Head",bone004="Tail",
    bone014="FRHip",bone015="FRKnee",bone016="FRAnkle",
    bone017="FLHip",bone018="FLKnee",bone019="FLAnkle",
    bone008="BLHip",bone009="BLKnee",bone010="BLAnkle",
    bone011="BRHip",bone012="BRKnee",bone013="BRAnkle",
  }
  local bounds,size=model:GetBoundingBox()
  for _,joint in ipairs(model:GetDescendants()) do
    -- 실제 관절 종류별 연결점을 읽는다. AnimationConstraint는 Attachment를 우선한다.
    local motor=joint:IsA("Motor6D") and joint.Part0 and joint.Part1
    local constraint=joint:IsA("AnimationConstraint") and joint.Attachment0 and joint.Attachment1
    if motor or constraint or joint:IsA("Bone") then
      local raw=joint.Name:lower()
      local key=raw:gsub("[^%w]","")
      local name=(species=="wolf" and wolfSourceChannels[key]) or nativeMobJointAlias[joint.Name] or joint.Name
      local location=joint:IsA("Bone") and joint.WorldPosition
        or constraint and joint.Attachment1.WorldPosition or joint.Part1.Position
      local relative=bounds:PointToObjectSpace(location)
      local left=key:find("left",1,true) or raw:match("[._%-]l%d*$")
      local right=key:find("right",1,true) or raw:match("[._%-]r%d*$")
      local side=left and "L" or right and "R"
      if not side and math.abs(relative.X)>size.X*.09 then
        side=relative.X<0 and "L" or "R"
      end
      local limb=key:find("leg",1,true) or key:find("hip",1,true)
        or key:find("thigh",1,true) or key:find("shin",1,true)
        or key:find("knee",1,true) or key:find("paw",1,true)
        or key:find("foot",1,true) or key:find("ankle",1,true)
      if not limb and joint:IsA("Bone") then
        limb=relative.Y<-.08*size.Y and math.abs(relative.X)>.12*size.X
          and math.abs(relative.Z)>.12*size.Z
      end
      if not sourceChannels[name] and limb and side then
        local lower=key:find("knee",1,true) or key:find("shin",1,true)
          or key:find("calf",1,true)
        local foot=key:find("foot",1,true) or key:find("paw",1,true)
          or key:find("ankle",1,true)
        if species=="golem" or species=="mushroom" or species=="skeleton" then
          name=(lower or foot) and ("Shin"..side) or ("Thigh"..side)
        else
          local front=key:find("front",1,true) or key:find("fore",1,true)
          local rear=key:find("rear",1,true) or key:find("hind",1,true)
            or key:find("back",1,true)
          local position=front and "F" or rear and "B" or relative.Z<0 and "F" or "B"
          name=position..side..(foot and "Ankle" or lower and "Knee" or "Hip")
        end
      elseif not sourceChannels[name] and (species=="bee" or species=="bat") then
        if key:find("wing",1,true) and side then name="Wing"..side end
      elseif not sourceChannels[name] and (species=="golem" or species=="mushroom" or species=="skeleton") then
        if (key:find("arm",1,true) or key:find("shoulder",1,true)) and side then
          name="UpperArm"..side
        end
      end
      if sourceChannels[name] and (not joints[name] or constraint) then
        joints[name]=joint
        available[name]=true
      end
    end
  end
  local count=0
  for _ in pairs(joints) do count+=1 end
  local bodyPlan=(species=="bee" or species=="bat") and "FLYER" or
    species=="golem" and "GIANT" or
    (species=="mushroom" or species=="skeleton") and "BIPED" or "QUADRUPED"
  local movingJoints=(species=="bee" or species=="bat") and
      (available.WingL or available.WingR or available.UpperArmL or available.UpperArmR)
    or (species=="golem" or species=="mushroom" or species=="skeleton") and
      (available.ThighL or available.ThighR or available.UpperArmL or available.UpperArmR)
    or (available.FLHip or available.FRHip or available.BLHip or available.BRHip)
  -- [늑대 리그] 실제 네 고관절 없이는 정상 4족 리그로 처리하지 않는다.
  local wolfFourLegRig=species~="wolf" or
    (available.FLHip and available.FRHip and available.BLHip and available.BRHip)
  local actualRig=count>=2 and movingJoints==true and wolfFourLegRig==true
  local controller=actualRig and meadowMobMotion and meadowMobMotion.BindJointPose(joints,{
    followAnimator=true,response=26,
  }) or nil
  local row={controller=controller,available=available,plan=bodyPlan,
    species=species,phase=0,poses={},lastMode=nil,motionStartedAt=os.clock(),
    lastPosition=model:GetPivot().Position,travel=0,groundSpeed=0,renderAccumulator=0,
    -- [모션] 실제 관절의 직전 포즈를 저장해 정지·추적·공격 사이를 매끄럽게 잇는다.
    transitionFrom={},renderedPoses={},transitionStartedAt=0,transitionDuration=0}
  model:SetAttribute("NativeCreatureRigMode",actualRig and "ORIGINAL_JOINT_RIG"
    or "UNRIGGED_SOURCE_MESH_NEEDS_ANIMATED_ASSET")
  if not actualRig and not meadowMobRigWarnings[species] then
    meadowMobRigWarnings[species]=true
    warn("마력숲 원본 애니메이션 뼈 미연결: "..species..", 탐지 관절="..count)
  end
  meadowMobControllers[model]=row
  model:GetAttributeChangedSignal("AttackState"):Connect(function()
    if not model.Parent then return end
    if model:GetAttribute("AttackState")=="ANTICIPATION" then
      mobVfx(model:GetAttribute("AttackPattern"),model:GetPivot().Position,"ANTICIPATION")
    end
  end)
  model.Destroying:Connect(function()
    if controller then controller.Destroy(false) end
    meadowMobControllers[model]=nil
  end)
end
for _,model in ipairs(meadowMobWorld:GetChildren()) do bindOriginalMob(model) end
meadowMobWorld.ChildAdded:Connect(function(model)
  if model:IsA("Model") then
    bindOriginalMob(model)
    if not meadowMobControllers[model] then
      task.defer(function() if model.Parent then bindOriginalMob(model) end end)
    end
  end
end)
-- [거리별 로딩] Roblox 스트리밍으로 멀어진 몬스터가 사라지면 기존 관절 제어기를 정리한다.
-- 다시 근처로 오면 위 ChildAdded에서 새로 연결한다. 서버의 몬스터/보상 상태와 무관하다.
meadowMobWorld.ChildRemoved:Connect(function(model)
  local row=meadowMobControllers[model]
  if not row then return end
  if row.controller then row.controller.Destroy(false) end
  meadowMobControllers[model]=nil
end)
game:GetService("RunService").PreSimulation:Connect(function(dt)
  for model,row in pairs(meadowMobControllers) do
    if model.Parent and row.controller then
      local requested=model:GetAttribute("NativeMobMotion")
      -- 상태값을 먼저 보존하고, 서버 상태가 없을 때만 종별 기본 모션을 사용한다.
      local mode=nativeMobMotionMap[requested]
      if not mode then
        local wildlife=row.species=="deer" or row.species=="boar" or row.species=="rabbit"
        mode=wildlife and "WALK" or "IDLE"
      end
      -- 서버 적중시각으로 공격 충격과 복귀만 연출한다. 피해 판정은 서버가 유지한다.
      local forcedPhase=nil
      local impactAt=tonumber(model:GetAttribute("NativeMobLastImpact")) or 0
      local eventAt=tonumber(model:GetAttribute("NativeMobMotionStartedAt")) or 0
      local impactAge=workspace:GetServerTimeNow()-impactAt
      if requested=="RECOVERY" and impactAt>=eventAt and impactAge>=0 and impactAge<.56 then
        if impactAge<.20 then
          mode="ATTACK"
          forcedPhase=math.clamp(.38+impactAge/.20*.45,0,1)
        else
          mode="RECOVERY"
          forcedPhase=math.clamp((impactAge-.20)/.36,0,1)
        end
      end
      -- [4족 접지] 시간만으로 다리를 휘두르면 제자리에서도 발이 미끄러진다.
      -- 실제 서버 메시 피벗의 수평 이동거리로 보폭을 맞추고 멈추면 가볍게 정지한다.
      local position=model:GetPivot().Position
      local moved=Vector3.new(position.X-row.lastPosition.X,0,position.Z-row.lastPosition.Z)
      row.lastPosition=position
      local traveled=moved.Magnitude
      local step=math.clamp(dt,1/120,.12)
      local rawSpeed=traveled>5 and 0 or math.min(traveled/step,24)
      row.groundSpeed+=(rawSpeed-row.groundSpeed)*math.min(1,step*9)
      local footTravel=(mode=="WALK" or mode=="RUN") and row.plan=="QUADRUPED"
      if footTravel then
        if traveled>.015 and traveled<=5 then row.travel+=traveled end
        if row.groundSpeed<.35 then mode="IDLE" end
      end
      if mode~=row.lastMode then
        -- [모션 전환] 이전 원본 리그 포즈에서 새 행동으로 연속 보간한다.
        table.clear(row.transitionFrom)
        for joint,pose in pairs(row.renderedPoses) do
          row.transitionFrom[joint]=pose
        end
        row.transitionStartedAt=os.clock()
        row.transitionDuration=mode=="ATTACK" and .10
          or mode=="HIT" and .12 or mode=="DEATH" and .18 or .24
        row.lastMode=mode
        row.motionStartedAt=os.clock()
        row.phase=0
      end
      local epoch=model:GetAttribute("NativeMobMotionStartedAt")
      local serverAge=typeof(epoch)=="number" and math.max(0,workspace:GetServerTimeNow()-epoch) or nil
      if serverAge then row.phase=serverAge else row.phase+=math.min(dt,.12) end
      local repeating=mode=="IDLE" or mode=="WALK" or mode=="RUN" or mode=="FLY"
      local duration=mode=="DEATH" and 1.32 or mode=="ATTACK" and .75
        or mode=="ANTICIPATION" and .42 or mode=="RECOVERY" and .38
        or mode=="HIT" and .46 or mode=="START" and .36
        or mode=="RUN" and .82 or 1.15
      local authoredDuration=model:GetAttribute("NativeMobMotionDuration")
      if mode=="ANTICIPATION" and typeof(authoredDuration)=="number" then
        duration=math.max(.12,authoredDuration)
      end
      local phase=repeating and (row.phase%duration)/duration
        or math.clamp((os.clock()-row.motionStartedAt)/duration,0,1)
      if footTravel and mode~="IDLE" then
        -- 걷기/달리기 모두 실제 전진 거리당 한 걸음: 앞뒤 대각 발의 접지와 일치.
        local stride=mode=="RUN" and 5.5 or 3.9
        phase=(row.travel%stride)/stride
      end
      if not repeating and serverAge then phase=math.clamp(serverAge/duration,0,1) end
      if forcedPhase then phase=forcedPhase end
      -- [모바일 최적화] 멀리 있는 관절만 저주기로 갱신한다. 서버 AI/피해/표적 상태는 그대로 둔다.
      row.renderAccumulator+=dt
      local camera=workspace.CurrentCamera
      local visualDistance=camera and (camera.CFrame.Position-position).Magnitude or 0
      local sampleInterval=visualDistance>(nativeTouchEnabled and 90 or 150) and 1/18
        or visualDistance>55 and nativeTouchEnabled and 1/28 or 0
      if sampleInterval>0 and row.renderAccumulator<sampleInterval then continue end
      local poseDt=math.min(row.renderAccumulator,.12)
      row.renderAccumulator=0
      table.clear(row.poses)
      local _,matched=meadowMobMotion.SampleProceduralActorMotion(mode,
        phase,{
          bodyPlan=row.plan,actorClass=model:GetAttribute("Boss") and "BOSS" or "CREATURE",
          availableJoints=row.available,mobileTier=nativeTouchEnabled and "LOW" or "HIGH",
          secondary=.7,intensity=footTravel and 1.08 or 1.24,
          profile={limbArc=footTravel and 1.08 or 1.3,footContact=1.28,attackStrike=1.22},
        },row.poses)
      if matched then
        -- [공통 생동감] 원본 리그가 갖춘 관절만 사용한다. 정지·피격·죽음·예고를 종별로 보간한다.
        local cycle=phase*math.pi*2
        local heavy=row.species=="golem" or row.species=="boar"
        if mode=="IDLE" then
          local breath=math.sin(cycle)*(heavy and .018 or .032)
          if row.available.Chest then row.poses.Chest=CFrame.Angles(breath,0,0) end
          if row.available.Spine then row.poses.Spine=CFrame.Angles(breath*.65,0,0) end
          if row.available.Neck then row.poses.Neck=CFrame.Angles(-breath*.6,0,0) end
          if row.available.Head then row.poses.Head=CFrame.Angles(-breath*.55,math.sin(cycle*.5)*.065,0) end
          if row.available.Tail then row.poses.Tail=CFrame.Angles(0,math.sin(cycle*.7)*.105,0) end
          if row.plan=="FLYER" then
            local flap=math.sin(cycle*2)*.24
            if row.available.WingL then row.poses.WingL=CFrame.Angles(0,0,flap) end
            if row.available.WingR then row.poses.WingR=CFrame.Angles(0,0,-flap) end
          end
        elseif mode=="HIT" or mode=="DEATH" then
          local reaction=mode=="DEATH" and math.sin(math.min(phase,1)*math.pi*.5)
            or math.sin(phase*math.pi)
          if row.available.Chest then row.poses.Chest=CFrame.Angles(-reaction*(heavy and .18 or .28),0,reaction*.12) end
          if row.available.Head then row.poses.Head=CFrame.Angles(reaction*.23,0,-reaction*.16) end
          if row.available.Neck then row.poses.Neck=CFrame.Angles(reaction*.15,0,0) end
          if row.available.Tail then row.poses.Tail=CFrame.Angles(0,-reaction*.25,0) end
          if row.plan=="FLYER" then
            if row.available.WingL then row.poses.WingL=CFrame.Angles(0,0,reaction*.35) end
            if row.available.WingR then row.poses.WingR=CFrame.Angles(0,0,-reaction*.35) end
          end
        elseif row.species~="wolf" and (mode=="ANTICIPATION" or mode=="ATTACK" or mode=="RECOVERY") then
          local ready=mode=="ANTICIPATION" and math.sin(phase*math.pi*.5) or 0
          local strike=mode=="ATTACK" and math.sin(phase*math.pi) or 0
          local release=mode=="RECOVERY" and 1-phase or 0
          if row.available.Chest then
            row.poses.Chest=CFrame.Angles(-ready*.20+strike*(heavy and .40 or .30)-release*.08,0,0)
          end
          if row.available.Head then
            row.poses.Head=CFrame.Angles(ready*.16-strike*.26+release*.12,0,0)
          end
          if row.available.Neck then row.poses.Neck=CFrame.Angles(ready*.12-strike*.25,0,0) end
          if row.available.Jaw then row.poses.Jaw=CFrame.Angles(ready*.12+strike*.42,0,0) end
          if row.plan=="QUADRUPED" then
            for _,key in ipairs({"FL","FR"}) do
              if row.available[key.."Hip"] then row.poses[key.."Hip"]=CFrame.Angles(-ready*.20+strike*.28,0,0) end
              if row.available[key.."Knee"] then row.poses[key.."Knee"]=CFrame.Angles(ready*.17+strike*.10,0,0) end
            end
          elseif row.plan=="FLYER" then
            if row.available.WingL then row.poses.WingL=CFrame.Angles(0,0,ready*.40-strike*.48) end
            if row.available.WingR then row.poses.WingR=CFrame.Angles(0,0,-ready*.40+strike*.48) end
          else
            if row.available.UpperArmL then row.poses.UpperArmL=CFrame.Angles(-ready*.55+strike*.80,0,-ready*.20) end
            if row.available.UpperArmR then row.poses.UpperArmR=CFrame.Angles(-ready*.48+strike*.90,0,ready*.20) end
          end
        end
        -- [4족 걷기/질주] 원본 스킨 관절의 접지/회수 단계를 분리하고 속도에 따라 보폭을 조절한다.
        -- 공용 모션/서버 좌표/공격판정/보상/저장에는 영향을 주지 않는다.
        if row.plan=="QUADRUPED" then
          if mode=="WALK" or mode=="RUN" then
            local running=mode=="RUN"
            local amplitude=(running and .52 or .36)*math.clamp(row.groundSpeed/(running and 7 or 3),.5,1)
            local stance=running and .41 or .61
            for _,foot in ipairs(quadrupedFootPhases) do
              local key=foot[1]
              local legPhase=(phase+(running and foot[3] or foot[2]))%1
              local hip,knee,ankle
              if legPhase<stance then
                -- 접지 동안 무릎을 펴고 발로 땅을 뒤로 민다.
                local p=legPhase/stance
                hip=amplitude*(1-p*2)
                knee=.015
                ankle=.025
              else
                -- 발이 공중에 있을 때만 무릎을 굽혀 앞으로 회수한다.
                local p=(legPhase-stance)/(1-stance)
                local lift=math.sin(math.pi*p)
                hip=-amplitude*math.cos(math.pi*p)
                knee=lift*(running and .72 or .48)
                ankle=-lift*(running and .23 or .15)
              end
              if row.available[key.."Hip"] then row.poses[key.."Hip"]=CFrame.Angles(hip,0,0) end
              if row.available[key.."Knee"] then row.poses[key.."Knee"]=CFrame.Angles(knee,0,0) end
              if row.available[key.."Ankle"] then row.poses[key.."Ankle"]=CFrame.Angles(ankle,0,0) end
            end
            local cycle=phase*math.pi*2
            local bounce=math.sin(cycle*(running and 2 or 1))*(running and .050 or .025)
            if row.available.Chest then row.poses.Chest=CFrame.Angles(bounce,0,0) end
            if row.available.Neck then row.poses.Neck=CFrame.Angles(-bounce*.62,0,0) end
            if row.available.Head then row.poses.Head=CFrame.Angles(-bounce*.40,0,0) end
          elseif row.species=="wolf" and (mode=="ANTICIPATION" or mode=="ATTACK" or mode=="RECOVERY") then
            -- [늑대 전방 물기] 예비 자세 -> 목과 머리 전방 급습 -> 접촉 뒤 복귀.
            -- 실제 원본에 턱 관절이 있을 때만 개폐시키고 없으면 목/머리로 물기 동작을 연출한다.
            local windup=mode=="ANTICIPATION" and math.sin(phase*math.pi*.5) or 0
            local bite=mode=="ATTACK" and math.sin(math.pi*phase) or 0
            local settle=mode=="RECOVERY" and (1-phase) or 0
            if row.available.Chest then row.poses.Chest=CFrame.Angles(-.12*windup-.36*bite+.13*settle,0,0) end
            if row.available.Neck then row.poses.Neck=CFrame.Angles(.24*windup-.48*bite+.13*settle,0,0) end
            if row.available.Head then row.poses.Head=CFrame.Angles(.30*windup-.56*bite+.18*settle,0,0) end
            if row.available.Jaw then row.poses.Jaw=CFrame.Angles(.18*windup+.70*bite,0,0) end
            for _,key in ipairs({"FL","FR"}) do
              if row.available[key.."Hip"] then row.poses[key.."Hip"]=CFrame.Angles(-.23*windup+.26*bite,0,0) end
              if row.available[key.."Knee"] then row.poses[key.."Knee"]=CFrame.Angles(.20*windup+.10*bite,0,0) end
            end
            for _,key in ipairs({"BL","BR"}) do
              if row.available[key.."Hip"] then row.poses[key.."Hip"]=CFrame.Angles(.17*windup-.25*bite,0,0) end
              if row.available[key.."Knee"] then row.poses[key.."Knee"]=CFrame.Angles(.24*windup,0,0) end
            end
          end
        end
        -- [수문장 액션] 실제 원본 팔·다리만 큰 예비 동작과 충격 뒤 복귀에 연결한다.
        if row.species=="golem" and (mode=="ANTICIPATION" or mode=="ATTACK" or mode=="RECOVERY" or mode=="HIT") then
          local shock=model:GetAttribute("AttackPattern")=="GOLEM_SHOCKWAVE"
          local lift=(mode=="ANTICIPATION" or mode=="ATTACK") and math.sin(phase*math.pi*.5) or (1-phase)
          local pitch=(mode=="ANTICIPATION" or mode=="ATTACK") and -(shock and .75 or 1.35)*lift or .5*lift
          if row.available.UpperArmL then row.poses.UpperArmL=CFrame.Angles(pitch,0,-.22*lift) end
          if row.available.UpperArmR then row.poses.UpperArmR=CFrame.Angles(pitch,0,.22*lift) end
          if row.available.ThighL then row.poses.ThighL=CFrame.Angles(shock and -.32*lift or .12*lift,0,0) end
          if row.available.ThighR then row.poses.ThighR=CFrame.Angles(shock and .26*lift or .12*lift,0,0) end
        end
        -- 실제 원본 관절이 있는 몹에만 종별 공격·추적 동작을 크게 합성한다.
        local gain=mode=="ATTACK" and (row.species=="golem" and 1.75 or 1.6)
          or mode=="RUN" and (row.plan=="QUADRUPED" and 1.08 or 1.42)
          or 1.10
        for joint,pose in pairs(row.poses) do
          if typeof(pose)=="CFrame" then
            local axis,angle=pose:ToAxisAngle()
            if angle>.001 then
              row.poses[joint]=CFrame.fromAxisAngle(axis,math.min(angle*gain,math.rad(112)))
            end
          end
        end
        -- [관절 블렌딩] 공격/추적 전환 때 발·목·날개가 순간적으로 꺾이지 않게 한다.
        -- 새 모션에 없는 이전 관절도 중립 자세까지 부드럽게 복귀시킨다.
        local blend=math.clamp((os.clock()-row.transitionStartedAt)
          /math.max(.01,row.transitionDuration),0,1)
        blend=blend*blend*(3-2*blend)
        if blend<1 then
          for joint,previous in pairs(row.transitionFrom) do
            row.poses[joint]=previous:Lerp(row.poses[joint] or CFrame.identity,blend)
          end
        end
        table.clear(row.renderedPoses)
        for joint,pose in pairs(row.poses) do
          row.renderedPoses[joint]=pose
        end
        row.controller.Step(row.poses,poseDt)
      end
    end
  end
end)
remote.OnClientEvent:Connect(function(kind,payload)
  if typeof(payload)~="table" or typeof(payload.position)~="Vector3" then return end
  if kind=="MEADOW_MOB_ATTACK" then mobVfx(payload.pattern,payload.position,"IMPACT",payload.facing)
  elseif kind=="MEADOW_MOB_DEATH" then
    mobVfx(payload.pattern,payload.position,"DEATH")
  end
end)


-- [초원 자연 음향] Roblox Creator Store에서 배포하는 새소리·숲 음원만 사용한다.
-- 플레이어별 로컬 재생: 서버 전투/오디오 이벤트에 영향을 주지 않고 실제 소리가 허용되지 않으면 조용히 유지.
-- 잦은 재생/고음량을 피하고, 사슴·토끼 서식지와 숲 외곽에 가까울수록 새소리가 선명해진다.
task.delay(5,function()
  local soundService=game:GetService("SoundService")
  local forestBed=Instance.new("Sound")
  forestBed.Name="MeadowForestAmbience"
  forestBed.SoundId="rbxassetid://9116971475" -- Creator Store: Morning Forest Birds 4
  -- [오디오] 기존 숲 소리에 승인된 환경음 atom을 직접 적용한다.
  -- 선택값이 Sound.Volume까지 이어져야 패키지에서 실제 자산 사용으로 검증된다.
  local forestAudioEnabled=hasStudioAssetAtom("AUDIO","ENV_FOREST")
  forestBed.Volume=forestAudioEnabled and .045 or 0
  forestBed.Looped=true
  forestBed.PlaybackSpeed=.96
  forestBed.SoundGroup=meadowAmbienceGroup
  forestBed.Parent=soundService
  local birdChirp=Instance.new("Sound")
  birdChirp.Name="MeadowNearbyBirds"
  birdChirp.SoundId="rbxassetid://140708444684424" -- Creator Store: Birds Chirping SFX
  birdChirp.Volume=.14
  birdChirp.Looped=false
  birdChirp.SoundGroup=meadowAmbienceGroup
  birdChirp.Parent=soundService
  local groves={
    Vector2.new(-258,-206),Vector2.new(261,-219),
    Vector2.new(-270,220),Vector2.new(258,240),
  }
  forestBed:Play()
  local nextChirp=os.clock()+math.random(7,13)
  while forestBed.Parent and birdChirp.Parent do
    task.wait(1)
    local character=player.Character
    local rootPart=character and character:FindFirstChild("HumanoidRootPart")
    if rootPart then
      local distance=math.huge
      for _,grove in ipairs(groves) do
        local dx=rootPart.Position.X-grove.X
        local dz=rootPart.Position.Z-grove.Y
        distance=math.min(distance,math.sqrt(dx*dx+dz*dz))
      end
      local forestPresence=1-math.clamp((distance-25)/235,0,1)
      -- [시간·날씨 음향] 서버가 정한 실제 시간/날씨를 읽고 야간·우천 새소리만 줄인다.
      local climate=workspace:FindFirstChild("FantasySurvivalWorld")
      local phase=climate and climate:GetAttribute("MeadowDayPhase") or "DAY"
      local sky=climate and climate:GetAttribute("MeadowWeather") or "CLEAR"
      local quiet=phase=="NIGHT" or sky=="RAIN" or sky=="SNOW" or sky=="STORM"
      forestBed.Volume=forestAudioEnabled and ((.035+.085*forestPresence)*(quiet and .28 or 1)) or 0
      birdChirp.Volume=forestAudioEnabled and ((.085+.17*forestPresence)*(quiet and .18 or 1)) or 0
      if os.clock()>=nextChirp then
        if forestPresence>.12 and not quiet then
          birdChirp.PlaybackSpeed=.91+math.random()*.17
          birdChirp:Play()
        end
        nextChirp=os.clock()+math.random(17,29)
      end
    end
  end
end)
