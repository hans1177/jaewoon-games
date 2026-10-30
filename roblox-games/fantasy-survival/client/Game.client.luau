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
gui:SetAttribute("ClientActionRuntimeVersion",2)
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
  button.Parent = list
  meadowActionButtons[action.Id]=button
  button.Activated:Connect(function() activateMeadowAction(action.Id) end)
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
  status.Text = string.format("웨이브 %d · 적 %d · HP %d · Lv %d  |  경험치 %d\n나무 %d · 돌 %d · 무기 강화 %d · 처치 점수 %d",
    player:GetAttribute("CurrentWave") or 0, player:GetAttribute("AliveEnemies") or 0,
    player:GetAttribute("Health") or 100, player:GetAttribute("Level") or 1,
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

CommonUI.AdaptActionMenu(gui,root,list,title,status,nil,multiplayerStatus,primaryCombatAction and{label="공격",activate=function()activateMeadowAction(primaryCombatAction.Id)end}or nil)

-- Four direct Roblox-native martial skill buttons, visible without opening the menu.
-- Each sends an existing server-authorized COMBAT action; no client damage authority.
local meadowSkillDock=Instance.new("Frame")
meadowSkillDock.Name="MeadowR15SkillDock"
-- Stay above the existing primary attack/menu buttons and clear of the left joystick.
meadowSkillDock.AnchorPoint=Vector2.new(1,1)
meadowSkillDock.Position=UDim2.new(1,-8,1,-232)
meadowSkillDock.Size=UDim2.fromOffset(128,188)
meadowSkillDock.BackgroundTransparency=1
meadowSkillDock.Parent=gui
local meleeSkills={
  {"meadow-unarmed-rush","연속권"},
  {"meadow-unarmed-uppercut","어퍼컷"},
  {"meadow-unarmed-kick","회전차기"},
  {"meadow-unarmed-elbow","팔꿈치"},
}
for index,skill in ipairs(meleeSkills) do
  local button=Instance.new("TextButton")
  button.Name="R15Skill"..index
  button.Size=UDim2.new(1,0,0,43)
  button.Position=UDim2.fromOffset(0,(index-1)*47)
  button.BackgroundColor3=Color3.fromRGB(22,76,62)
  button.TextColor3=Color3.fromRGB(241,255,223)
  button.TextSize=15
  button.Font=Enum.Font.GothamBold
  button.Text=skill[2]
  button.AutoButtonColor=true
  button.Parent=meadowSkillDock
  local corner=Instance.new("UICorner")
  corner.CornerRadius=UDim.new(0,11)
  corner.Parent=button
  button.Activated:Connect(function()
    local character=player.Character
    if not character or character:FindFirstChildOfClass("Tool") then return end
    activateMeadowAction(skill[1])
  end)
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
    reducedMotion=nativeTouchEnabled,count=nativeTouchEnabled and 5 or 12,
    scale=payload.boss and 1.65 or 1.1,
  })
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


-- The shared Roblox R15 combat library already has real authored joints for
-- jab/cross/hook/uppercut/elbow/knee/kick. Route ONE confirmed hit to ONE strike.
local basicUnarmedMoves={
  "U:JAB_LEFT","U:CROSS_RIGHT","U:HOOK_LEFT","U:HOOK_RIGHT",
  "U:BACKFIST_LEFT","U:UPPERCUT_RIGHT","U:ELBOW_LEFT","U:LOW_KICK_R",
}
local skillUnarmedMoves={
  ["meadow-unarmed-rush"]={"U:JAB_LEFT","U:CROSS_RIGHT","U:HOOK_LEFT","U:HOOK_RIGHT"},
  ["meadow-unarmed-uppercut"]={"U:UPPERCUT_RIGHT","U:UPPERCUT_LEFT"},
  ["meadow-unarmed-kick"]={"U:ROUND_KICK_R","U:SIDE_KICK_L","U:FRONT_KICK_R"},
  ["meadow-unarmed-elbow"]={"U:ELBOW_RIGHT","U:KNEE_LEFT","U:ELBOW_LEFT","U:KNEE_RIGHT"},
}
local activeStrikeTrail=nil
local activeStrikeTrailToken=0
local function stopStrikeTrail()
  activeStrikeTrailToken+=1
  if activeStrikeTrail then activeStrikeTrail.Destroy();activeStrikeTrail=nil end
end
-- Upper-body and real leg joints are both owned only while a melee pose plays.
-- The normal Roblox walk/run Animator is followed, not replaced.
local combatUpperJoints = {Waist=true, Neck=true, LeftShoulder=true, RightShoulder=true,
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
  combatRecoveryUntil = nil
  activeCombatCombo = nil
  activeCombatCharacter = nil
  table.clear(combatPoseTargets)
  table.clear(combatR15Targets)
end
player.CharacterAdded:Connect(function()
  finishNativeCombatMotion()
  predictedCombatUntil=0
  table.clear(pendingCombatMotion)
end)
playNativeCombatMotion=function(approvedScope,approvedEvent)
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
  local approvedIndex=tonumber(approvedEvent) or 1
  local chosenMove=nil
  if profile=="UNARMED" then
    local moves=skillUnarmedMoves[approvedScope] or basicUnarmedMoves
    chosenMove=moves[(approvedIndex-1)%#moves+1]
  else
    -- Reuse the weapon-specific authored R15 action list, never a fake punch.
    local routeOk,route=pcall(combatMotionSource.CreateCombatCombo,profile)
    if not routeOk or not route or #route.steps==0 then return end
    chosenMove=route.steps[(approvedIndex-1)%#route.steps+1].id
  end
  -- CreateCombatCombo is immutable (table.freeze). Build a fresh ONE-strike
  -- presentation instead of mutating steps or playing unapproved fake hits.
  local ok,combo=pcall(combatMotionSource.CreateCombatCombo,
    profile,{chosenMove},{speed=profile=="UNARMED" and 1.08 or 1})
  if not ok or not combo or not combo.steps or #combo.steps~=1 then return end
  combatRecoveryUntil = nil
  activeCombatCharacter = character
  activeCombatCombo = combo
  activeCombatStartedAt = os.clock()
  activeCombatController = activeCombatController or combatMotionSource.BindJointPose(joints, {
    followAnimator = true,
    response = math.clamp(32 * (0.46 / math.max(authoredMotion.duration, 0.1)), 22, 42),
  })
  -- A real R15 hand/foot carries the short shared-mesh particle trail.
  stopStrikeTrail()
  if combatVFX and profile=="UNARMED" then
    local isLegStrike=chosenMove:find("KICK",1,true)~=nil
      or chosenMove:find("KNEE",1,true)~=nil
    local isLeftStrike=chosenMove:find("LEFT",1,true)~=nil
      or chosenMove:match("_L$")~=nil
    local hostName=isLegStrike
      and (isLeftStrike and "LeftFoot" or "RightFoot")
      or (isLeftStrike and "LeftHand" or "RightHand")
    local host=character:FindFirstChild(hostName)
    if host and host:IsA("BasePart") then
      local color=chosenMove:find("KICK",1,true) and Color3.fromRGB(124,245,220)
        or Color3.fromRGB(255,207,112)
      local trailOk,_,controller=pcall(combatVFX.AttachShortTrail,host,{
        color=color,lifetime=nativeTouchEnabled and .12 or .18,
        width=nativeTouchEnabled and .22 or .42,length=1.1,
      })
      if trailOk and controller then
        activeStrikeTrail=controller
        controller.SetEnabled(true)
        local token=activeStrikeTrailToken
        task.delay(.19,function()
          if activeStrikeTrailToken==token and activeStrikeTrail==controller then
            controller.SetEnabled(false)
          end
        end)
      end
    end
  end
  -- 저작된 포즈의 실제 길이로 관절 블렌드 반응을 결정한다. 피해·쿨다운은 서버가 소유한다.

  character:SetAttribute("NativeCombatMotionAtom", "LIGHT_ATTACK_1")
  character:SetAttribute("NativeCombatActionId", chosenMove)
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
  if predictedAt and os.clock()-predictedAt<1 then return end
  playNativeCombatMotion(scope,tonumber(serial))
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
    local sign=actionId=="skill-meadow-dodge-left" and -1 or 1
    skillMotionTargets.Spine=CFrame.Angles(0,0,sign*.25*math.sin(math.pi*phase))
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
    if os.clock() >= combatRecoveryUntil then finishNativeCombatMotion() end
    return
  end
  local _, _, finished = combatMotionSource.SampleCombatCombo(
    activeCombatCombo, os.clock() - activeCombatStartedAt, combatPoseTargets
  )
  if type(combatMotionSource.RefineActorCinematicPose) == "function" then
    local timeInAction = os.clock() - activeCombatStartedAt
    local currentStep = activeCombatCombo.steps[#activeCombatCombo.steps]
    for _, candidateStep in ipairs(activeCombatCombo.steps) do
      if timeInAction < candidateStep.start + candidateStep.duration then
        currentStep = candidateStep
        break
      end
    end
    local stepPhase = math.clamp((timeInAction - currentStep.start) / math.max(.05, currentStep.duration), 0, 1)
    combatMotionSource.RefineActorCinematicPose(combatPoseTargets, {
      actorClass = "PLAYER", bodyPlan = "BIPED", weaponStyle = activeCombatCombo.profileId,
      actionPhase = stepPhase,
      authorizedImpact = true, grounded = humanoid.FloorMaterial ~= Enum.Material.Air,
      visualSpeed = humanoid.MoveDirection.Magnitude,
      mobileTier = nativeTouchEnabled and "LOW" or "HIGH",
      comboContinuity = tonumber(player:GetAttribute("ActionSequence") or 0)%3~=0 and .32 or 0,
      intensity = 1, secondary = .55,
    })
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
          if channel=="Spine" then pose=pose*(combatPoseTargets.Chest or CFrame.identity) end
          local basis=joint.C0.Rotation
          combatR15Targets[joint.Name]=basis:Inverse()*pose*basis
        end
      end
    end
  else
    combatMotionSource.MapCombatPoseToR15(combatPoseTargets, combatR15Targets)
  end
  activeCombatController.Step(combatR15Targets, dt)
  if finished then combatRecoveryUntil = os.clock() + .18 end
end)


-- Native 3D mob actions: existing CC0 MeshParts only. The game does not
-- invent limbs, bones or model parts. Server-owned attack states remain authoritative.
local meadowMobWorld=workspace:WaitForChild("FantasySurvivalWorld")
local meadowMobMotion=combatMotionSource
local meadowMobControllers={}
local nativeMobMotionMap={
  IDLE="IDLE",CHASE="RUN",RUN="RUN",RETURN_TO_SPAWN="WALK",WALK="WALK",
  ANTICIPATION="ATTACK",ATTACK="ATTACK",RECOVERY="HIT",HIT="HIT",DEATH="DEATH",
}
local nativeMobJointAlias={
  FrontLeftShoulder="FLHip",FrontRightShoulder="FRHip",
  RearLeftHip="BLHip",RearRightHip="BRHip",
  TailBaseJoint="Tail",ChestJoint="Chest",SpineJoint="Spine",
  NeckJoint="Neck",JawJoint="Jaw",TailBase="Tail",TailTip="Tail",
  WingLeft="WingL",WingRight="WingR",
}
local function mobVfx(pattern,where,stage)
  if not combatVFX or typeof(where)~="Vector3" then return end
  local boss=pattern=="GOLEM_SLAM" or pattern=="GOLEM_SHOCKWAVE"
  local bee=pattern=="BEE_SWEEP" or pattern=="BEE_STING"
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
    and species~="deer" and species~="boar" and species~="rabbit" then return end
  local joints,available={},{}
  local sourceChannels={
    FLHip=true,FRHip=true,BLHip=true,BRHip=true,
    WingL=true,WingR=true,Tail=true,Chest=true,Spine=true,
    Neck=true,Jaw=true,Head=true,ThighL=true,ThighR=true,
    ShinL=true,ShinR=true,UpperArmL=true,UpperArmR=true,
    ForearmL=true,ForearmR=true,
  }
  for _,joint in ipairs(model:GetDescendants()) do
    -- Only genuine Motor6D or authored skinned-mesh Bones can move.
    -- Never synthesize joints from a static single-mesh animal.
    local liveMotor=joint:IsA("Motor6D") and joint.Part0 and joint.Part1
    if liveMotor or joint:IsA("Bone") then
      local name=nativeMobJointAlias[joint.Name] or joint.Name
      if sourceChannels[name] and not joints[name] then
        joints[name]=joint
        available[name]=true
      end
    end
  end
  local count=0
  for _ in pairs(joints) do count+=1 end
  local actualRig=count>=2
  local bodyPlan=species=="bee" and "FLYER" or
    species=="golem" and "GIANT" or "QUADRUPED"
  local controller=actualRig and meadowMobMotion and meadowMobMotion.BindJointPose(joints,{
    followAnimator=true,response=24,
  }) or nil
  local row={controller=controller,available=available,plan=bodyPlan,
    species=species,phase=0,poses={},lastMode=nil,motionStartedAt=os.clock()}
  model:SetAttribute("NativeCreatureRigMode",actualRig and "ORIGINAL_JOINT_RIG" or "SOURCE_MESH_PIVOT")
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
      row.phase+=math.min(dt,.12)
      local repeating=mode=="IDLE" or mode=="WALK" or mode=="RUN" or mode=="FLY"
      local duration=mode=="DEATH" and 1.32 or mode=="ATTACK" and .75
        or mode=="HIT" and .46 or mode=="START" and .36 or 1.15
      local phase=repeating and (row.phase%duration)/duration
        or math.clamp((os.clock()-row.motionStartedAt)/duration,0,1)
      table.clear(row.poses)
      local _,matched=meadowMobMotion.SampleProceduralActorMotion(mode,
        phase,{
          bodyPlan=row.plan,actorClass=model:GetAttribute("Boss") and "BOSS" or "CREATURE",
          availableJoints=row.available,mobileTier=nativeTouchEnabled and "LOW" or "HIGH",
          secondary=.55,
        },row.poses)
      if matched then row.controller.Step(row.poses,dt) end
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

