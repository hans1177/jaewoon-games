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
  AUDIO = "NOT_APPLICABLE",
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
  -- 공격/수동 회피 버튼은 이중 노출하지 않고 전용 반원형 도크에서 관리한다.
  local hidden=action.Kind=="COMBAT" or action.Id=="skill-meadow-heavy"
    or action.Id=="skill-meadow-sweep" or action.Id=="skill-meadow-bolt"
    or action.Id=="skill-meadow-guard" or action.Id=="skill-meadow-parry"
    or action.Id=="skill-meadow-dodge-left" or action.Id=="skill-meadow-dodge-right"
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
-- Telegraphs are read from actual server-authored enemy models, never predicted hits.
local meadowPatternBanner=Instance.new("TextLabel")
meadowPatternBanner.Name="MeadowAttackTelegraph"
meadowPatternBanner.AnchorPoint=Vector2.new(.5,0)
meadowPatternBanner.Position=UDim2.fromScale(.5,.09)
meadowPatternBanner.Size=UDim2.new(.83,0,0,46)
meadowPatternBanner.BackgroundColor3=Color3.fromRGB(76,28,28)
meadowPatternBanner.BackgroundTransparency=.17
meadowPatternBanner.TextColor3=Color3.fromRGB(255,233,211)
meadowPatternBanner.TextSize=19
meadowPatternBanner.Font=Enum.Font.GothamBold
meadowPatternBanner.TextWrapped=true
meadowPatternBanner.Visible=false
meadowPatternBanner.Parent=gui
local telegraphCorner=Instance.new("UICorner")
telegraphCorner.CornerRadius=UDim.new(0,12)
telegraphCorner.Parent=meadowPatternBanner
-- 서버가 사용하는 여섯 공격 패턴을 모두 같은 예고 UI에 연결한다.
local telegraphNames={
  WOLF_BITE="초원 늑대 · 물어뜯기",WOLF_LUNGE="초원 늑대 · 도약",
  BEE_SWEEP="초원 벌 · 급강하",BEE_STING="초원 벌 · 독침",
  GOLEM_SLAM="돌 골렘 · 내려찍기",GOLEM_SHOCKWAVE="돌 골렘 · 충격파",
  BOAR_CHARGE="사나운 멧돼지 · 돌진",BOAR_TUSK="사나운 멧돼지 · 엄니",
  BAT_DIVE="황혼 박쥐 · 급강하",BAT_SWEEP="황혼 박쥐 · 날개치기",
  MUSHROOM_SPORES="포자 버섯 · 포자 공격",MUSHROOM_BASH="포자 버섯 · 몸통치기",
  SKELETON_THRUST="초원 해골 · 찌르기",SKELETON_CLEAVE="초원 해골 · 내려베기",
}
local telegraphElapsed=0
game:GetService("RunService").Heartbeat:Connect(function(dt)
  telegraphElapsed+=dt
  if telegraphElapsed<.22 then return end
  telegraphElapsed=0
  local character=player.Character
  local rootPart=character and character:FindFirstChild("HumanoidRootPart")
  local world=workspace:FindFirstChild("FantasySurvivalWorld")
  if not rootPart or not world then meadowPatternBanner.Visible=false;return end
  local closest,distance=nil,50
  for _,model in ipairs(world:GetChildren()) do
    if model:IsA("Model") and model:GetAttribute("AttackState")=="ANTICIPATION" then
      local pattern=model:GetAttribute("AttackPattern")
      if telegraphNames[pattern] then
        local d=(rootPart.Position-model:GetPivot().Position).Magnitude
        if d<distance then closest=pattern;distance=d end
      end
    end
  end
  meadowPatternBanner.Visible=closest~=nil
  if closest then meadowPatternBanner.Text="위험! "..telegraphNames[closest].." 공격 예고" end
end)

local watched = {"Score","Coins","Level","Progress","Health","Wave","CurrentWave","AliveEnemies","RunPhase","XP","Wood","Stone","WeaponTier","Bosses","SharedObjective","RoundScore","LastApprovedScope","ProfileReady","SaveStatus"}
local function render()
  status.Text = string.format("HP %d · Lv %d · 웨이브 %d · 적 %d\nXP %d · 나무 %d · 돌 %d · 강화 %d · 점수 %d",
    player:GetAttribute("Health") or 100, player:GetAttribute("Level") or 1,
    player:GetAttribute("CurrentWave") or 0, player:GetAttribute("AliveEnemies") or 0,
    player:GetAttribute("XP") or 0, player:GetAttribute("Wood") or 0,
    player:GetAttribute("Stone") or 0, player:GetAttribute("WeaponTier") or 0,
    player:GetAttribute("RoundScore") or 0)
  local character=player.Character
  local humanoid=character and character:FindFirstChildOfClass("Humanoid")
  if humanoid and humanoid.RigType~=Enum.HumanoidRigType.R15 then
    status.Text ..= "\nR15 아바타 적용 대기 · 재접속 필요"
  end
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

CommonUI.AdaptActionMenu(gui,root,list,title,status,nil,multiplayerStatus,{compact=true,hideButton=true})

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

-- [모바일 전투 UI] 실제 공격 스킬 2개와 막기를 오른쪽 반원형으로 배치한다.
local meadowSkillDock=Instance.new("Frame")
meadowSkillDock.Name="MeadowR15SkillDock"
meadowSkillDock.AnchorPoint=Vector2.new(1,1)
meadowSkillDock.Position=UDim2.new(1,-14,1,-142)
meadowSkillDock.Size=UDim2.fromOffset(139,139)
meadowSkillDock.BackgroundTransparency=1
meadowSkillDock.Parent=gui
local meleeSkills={
  {"meadow-unarmed-rush","연속권",Color3.fromRGB(247,192,101)},
  {"skill-meadow-guard","막기",Color3.fromRGB(114,215,229)},
  {"meadow-unarmed-uppercut","승룡권",Color3.fromRGB(249,118,79)},
}
local meadowSkillButtons={}
for index,skill in ipairs(meleeSkills) do
  local button=Instance.new("TextButton")
  button.Name="R15Skill"..index
  button.Size=UDim2.fromOffset(58,58)
  button.BackgroundColor3=Color3.fromRGB(28,39,45)
  button.BorderSizePixel=0
  button.TextColor3=Color3.fromRGB(252,251,245)
  button.TextSize=12
  button.TextWrapped=true
  button.Font=Enum.Font.GothamBold
  button.Text=skill[2]
  button.AutoButtonColor=true
  button.Parent=meadowSkillDock
  local buttonCorner=Instance.new("UICorner")
  buttonCorner.CornerRadius=UDim.new(1,0)
  buttonCorner.Parent=button
  local buttonStroke=Instance.new("UIStroke")
  buttonStroke.Thickness=2
  buttonStroke.Color=skill[3]
  buttonStroke.Transparency=.08
  buttonStroke.Parent=button
  local buttonGradient=Instance.new("UIGradient")
  buttonGradient.Rotation=90
  buttonGradient.Color=ColorSequence.new(Color3.fromRGB(58,71,76),Color3.fromRGB(17,27,36))
  buttonGradient.Parent=button
  meadowSkillButtons[index]=button
  button.Activated:Connect(function()
    local character=player.Character
    if not character then return end
    if skill[1]~="skill-meadow-guard" and character:FindFirstChildOfClass("Tool") then return end
    activateMeadowAction(skill[1])
  end)
end
-- [반원 배치] 조이스틱과 기본 점프 영역을 피해 오른쪽 중단에 3개 버튼 배치.
local function layoutMeadowCombatUi()
  local v=gui.AbsoluteSize
  if v.X<=0 or v.Y<=0 then return end
  local short=v.Y<440
  local buttonSize=short and 47 or (v.X<370 and 51 or 59)
  local inset=6
  local dockWidth=buttonSize*2+44
  local dockHeight=buttonSize*3+18
  meadowSkillDock.Size=UDim2.fromOffset(dockWidth,dockHeight)
  meadowSkillDock.Position=UDim2.new(1,-(v.X<390 and 8 or 15),1,-(short and 100 or 142))
  -- 오른쪽 가장자리를 따라 왼쪽을 향해 굽은 반원.
  local centers={
    Vector2.new(dockWidth-buttonSize*.62,buttonSize*.55),
    Vector2.new(dockWidth-buttonSize*1.43,dockHeight*.5),
    Vector2.new(dockWidth-buttonSize*.62,dockHeight-buttonSize*.55),
  }
  for index,button in ipairs(meadowSkillButtons) do
    button.Position=UDim2.fromOffset(centers[index].X-buttonSize/2,centers[index].Y-buttonSize/2)
    button.Size=UDim2.fromOffset(buttonSize,buttonSize)
    button.TextSize=short and 11 or 14
    button.ZIndex=6
  end
  meadowPatternBanner.Position=UDim2.new(.5,0,0,short and 108 or 130)
  meadowPatternBanner.Size=UDim2.fromOffset(math.max(130,math.min(v.X-24,short and 300 or 400)),short and 34 or 42)
  meadowPatternBanner.TextSize=short and 13 or 16
end
gui:GetPropertyChangedSignal("AbsoluteSize"):Connect(layoutMeadowCombatUi)
layoutMeadowCombatUi()
gui:GetAttributeChangedSignal("GameMenuOpen"):Connect(function()
  meadowSkillDock.Visible=gui:GetAttribute("GameMenuOpen")~=true
end)
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
remote.OnClientEvent:Connect(function(kind,payload)
  if kind~="MEADOW_IMPACT" or typeof(payload)~="table"
    or typeof(payload.position)~="Vector3" then return end
  if not combatVFX then return end
  local color=payload.boss and Color3.fromRGB(255,164,91)
    or payload.species=="bee" and Color3.fromRGB(255,234,124)
    or Color3.fromRGB(128,250,201)
  combatVFX.CreateImpactFlash({
    cframe=CFrame.new(payload.position+Vector3.new(0,2,0)),
    color=color,accent=Color3.fromRGB(255,255,237),
    reducedMotion=nativeTouchEnabled,count=nativeTouchEnabled and 8 or 18,
    scale=payload.boss and 2.05 or 1.48,
  })
  -- [실제 명중 타격음] Roblox 기본 내장 효과음만 사용 (외부 오디오 권한 불필요).
  local myCharacter=player.Character
  local soundRoot=myCharacter and (myCharacter:FindFirstChild("HumanoidRootPart") or myCharacter.PrimaryPart)
  if soundRoot then
    local impact=Instance.new("Sound")
    impact.Name="MeadowConfirmedHit"
    impact.SoundId="rbxasset://sounds/swordlunge.wav"
    impact.Volume=payload.finisher and 1.55 or (payload.boss and 1.4 or 1.15)
    impact.PlaybackSpeed=payload.finisher and .78 or 1.05
    impact.RollOffMaxDistance=55
    impact.Parent=soundRoot
    impact:Play()
    game:GetService("Debris"):AddItem(impact,2)
  end
  local hitFlash=Instance.new("Frame")
  hitFlash.Name="MeadowHitScreenFeedback"
  hitFlash.Size=UDim2.fromScale(1,1)
  hitFlash.BackgroundColor3=payload.finisher and Color3.fromRGB(255,202,110)
    or Color3.fromRGB(240,250,224)
  hitFlash.BackgroundTransparency=payload.finisher and .86 or .94
  hitFlash.BorderSizePixel=0
  hitFlash.ZIndex=2
  hitFlash.Parent=gui
  game:GetService("TweenService"):Create(hitFlash,TweenInfo.new(.16),{
    BackgroundTransparency=1
  }):Play()
  game:GetService("Debris"):AddItem(hitFlash,.22)
  if payload.finisher and type(combatVFX.CreateCriticalBurst)=="function" then
    combatVFX.CreateCriticalBurst({
      cframe=CFrame.new(payload.position+Vector3.new(0,2.5,0)),
      reducedMotion=nativeTouchEnabled,count=nativeTouchEnabled and 6 or 12,
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
player.CharacterAdded:Connect(finishMeadowSkillPose)
player:GetAttributeChangedSignal("ApprovedCombatMotion"):Connect(finishMeadowSkillPose)
player:GetAttributeChangedSignal("ApprovedActionMotion"):Connect(function()
  local id,serial=tostring(player:GetAttribute("ApprovedActionMotion") or ""):match("^([^:]+):(%d+)$")
  local action=id and actionsById[id]
  if not serial or not action or action.Kind=="COMBAT" or not action.MotionAtom then return end
  local character=player.Character
  local humanoid=character and character:FindFirstChildOfClass("Humanoid")
  if not humanoid or humanoid.Health<=0 or humanoid.RigType~=Enum.HumanoidRigType.R15
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
  if not (skillMotionJoints.Waist and skillMotionJoints.LeftShoulder and
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
  combatMotionSource.MapCombatPoseToR15(skillMotionTargets,skillMotionR15Targets)
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
  ANTICIPATION="ATTACK",ATTACK="ATTACK",RECOVERY="HIT",HIT="HIT",DEATH="DEATH",
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
local function mobVfx(pattern,where,stage)
  if not combatVFX or typeof(where)~="Vector3" then return end
  local boss=pattern=="GOLEM_SLAM" or pattern=="GOLEM_SHOCKWAVE"
  local bee=pattern=="BEE_SWEEP" or pattern=="BEE_STING"
    or pattern=="BAT_DIVE" or pattern=="BAT_SWEEP"
  local tint=boss and Color3.fromRGB(255,114,84) or
    bee and Color3.fromRGB(246,226,117) or Color3.fromRGB(190,238,167)
  local effect=stage=="DEATH" and "DESTRUCTION_BURST" or
    stage=="ANTICIPATION" and (boss and "BOSS_WARNING_PULSE" or "ATTACK_TELEGRAPH_PULSE") or
    stage=="IMPACT" and "IMPACT_FLASH" or "STATUS_PULSE"
  local ok,err=pcall(combatVFX.Create,effect,{
    cframe=CFrame.new(where),parent=workspace,color=tint,
    accent=Color3.fromRGB(255,239,214),
    scale=boss and 1.4 or .8,duration=.45,reducedMotion=nativeTouchEnabled,
    count=nativeTouchEnabled and 4 or 9,
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
  local bounds,size=model:GetBoundingBox()
  for _,joint in ipairs(model:GetDescendants()) do
    local motor=(joint:IsA("Motor6D") or joint:IsA("AnimationConstraint"))
      and joint.Part0 and joint.Part1
    if motor or joint:IsA("Bone") then
      local raw=joint.Name:lower()
      local key=raw:gsub("[^%w]","")
      local name=nativeMobJointAlias[joint.Name] or joint.Name
      local location=joint:IsA("Bone") and joint.WorldPosition or joint.Part1.Position
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
        if species=="golem" then
          name=(lower or foot) and ("Shin"..side) or ("Thigh"..side)
        else
          local front=key:find("front",1,true) or key:find("fore",1,true)
          local rear=key:find("rear",1,true) or key:find("hind",1,true)
            or key:find("back",1,true)
          local position=front and "F" or rear and "B" or relative.Z<0 and "F" or "B"
          name=position..side..(foot and "Ankle" or lower and "Knee" or "Hip")
        end
      elseif not sourceChannels[name] and species=="bee" then
        if key:find("wing",1,true) and side then name="Wing"..side end
      elseif not sourceChannels[name] and species=="golem" then
        if (key:find("arm",1,true) or key:find("shoulder",1,true)) and side then
          name="UpperArm"..side
        end
      end
      if sourceChannels[name] and not joints[name] then
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
  local actualRig=count>=2 and movingJoints==true
  local controller=actualRig and meadowMobMotion and meadowMobMotion.BindJointPose(joints,{
    followAnimator=true,response=26,
  }) or nil
  local row={controller=controller,available=available,plan=bodyPlan,
    species=species,phase=0,poses={},lastMode=nil,motionStartedAt=os.clock()}
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
      if mode~=row.lastMode then
        row.lastMode=mode
        row.motionStartedAt=os.clock()
        row.phase=0
      end
      local epoch=model:GetAttribute("NativeMobMotionStartedAt")
      local serverAge=typeof(epoch)=="number" and math.max(0,workspace:GetServerTimeNow()-epoch) or nil
      if serverAge then row.phase=serverAge else row.phase+=math.min(dt,.12) end
      local repeating=mode=="IDLE" or mode=="WALK" or mode=="RUN" or mode=="FLY"
      local duration=mode=="DEATH" and 1.32 or mode=="ATTACK" and .75
        or mode=="HIT" and .46 or mode=="START" and .36
        or mode=="RUN" and .82 or 1.15
      local phase=repeating and (row.phase%duration)/duration
        or math.clamp((os.clock()-row.motionStartedAt)/duration,0,1)
      if not repeating and serverAge then phase=math.clamp(serverAge/duration,0,1) end
      table.clear(row.poses)
      local _,matched=meadowMobMotion.SampleProceduralActorMotion(mode,
        phase,{
          bodyPlan=row.plan,actorClass=model:GetAttribute("Boss") and "BOSS" or "CREATURE",
          availableJoints=row.available,mobileTier=nativeTouchEnabled and "LOW" or "HIGH",
          secondary=.7,intensity=1.24,
          profile={limbArc=1.3,footContact=1.28,attackStrike=1.22},
        },row.poses)
      if matched then
        -- 실제 원본 관절이 있는 몹에만 종별 공격·추적 동작을 크게 합성한다.
        local gain=mode=="ATTACK" and (row.species=="golem" and 1.75 or 1.6)
          or mode=="RUN" and 1.42 or 1.10
        for joint,pose in pairs(row.poses) do
          if typeof(pose)=="CFrame" then
            local axis,angle=pose:ToAxisAngle()
            if angle>.001 then
              row.poses[joint]=CFrame.fromAxisAngle(axis,math.min(angle*gain,math.rad(112)))
            end
          end
        end
        row.controller.Step(row.poses,dt)
      end
    end
  end
end)
remote.OnClientEvent:Connect(function(kind,payload)
  if typeof(payload)~="table" or typeof(payload.position)~="Vector3" then return end
  if kind=="MEADOW_MOB_ATTACK" then mobVfx(payload.pattern,payload.position,"IMPACT")
  elseif kind=="MEADOW_MOB_DEATH" then
    mobVfx(payload.pattern,payload.position,"DEATH")
  end
end)

