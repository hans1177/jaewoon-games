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
  BUILDING = "APPLIED",
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
  -- [회피 입력] 기존 회피 버튼 한 개로 모바일 스틱/키보드의 좌우 방향을 선택한다.
  -- 카메라 기준 수평 이동만 읽으며, 중립 입력은 기존 왼쪽 회피를 유지한다.
  if actionId=="skill-meadow-dodge-left" or actionId=="skill-meadow-dodge-right" then
    local character=player.Character
    local human=character and character:FindFirstChildOfClass("Humanoid")
    local camera=workspace.CurrentCamera
    if human and camera then
      local right=camera.CFrame.RightVector
      local horizontal=Vector3.new(right.X,0,right.Z)
      if horizontal.Magnitude>.01 then
        local stick=human.MoveDirection:Dot(horizontal.Unit)
        if stick>.2 then actionId="skill-meadow-dodge-right"
        elseif stick<-.2 then actionId="skill-meadow-dodge-left" end
      end
    end
  end
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
-- [오른쪽 아이콘] 외부 다운로드 후 등록 승인된 5종 + 물약·가방 원본 보존
local meadowRealActionIcons={
  fist="rbxassetid://127661757924412",
  dodge="rbxassetid://121029196724745",
  guard="rbxassetid://85078081802173",
  potion="rbxassetid://120656085154237",
  interact="rbxassetid://116646806670052",
  sprint="rbxassetid://115039637258925",
  bag="rbxassetid://127437456512278"
} -- CC0_REAL_ACTION_ICONS
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
  if meadowActionButtons.refreshSkills and gui:GetAttribute("GameMenuOpen")==true then meadowActionButtons.refreshSkills() end
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
local watched = {"Score","Coins","CombatProficiency","CookingProficiency","CraftingProficiency","GatheringProficiency","BuildingProficiency","HuntingProficiency","AlchemyProficiency","Progress","Health","Wave","CurrentWave","AliveEnemies","RunPhase","MeadowStamina","Wood","Stone","WeaponTier","Bosses","SharedObjective","RoundScore","LastApprovedScope","ProfileReady","SaveStatus"}
local function render()
  status.Text = string.format("오픈월드 · 주변 몬스터 %d",player:GetAttribute("AliveEnemies") or 0)
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

-- [공유 HUD 참조] 메뉴 구성 구역 밖의 모바일 버튼·자원바에서 같은 실제 GUI를 사용한다.
local meadowVitalsGui, meadowPages, meadowMenu, energyFill, energyLabel

do
-- [게임 메뉴] 현재 서버 상태만 읽는 캐릭터·소지품·저널과 실제 동작하는 옵션.
meadowPages={}
local meadowLabels={}
local meadowPageNames={"캐릭터","인벤토리","저널","옵션","도우미","동료","스킬"}
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
-- [캐릭터창] 메뉴 생성과 전투 렌더에 필요한 외부 변수만 유지한다.
local meadowGold=Color3.fromRGB(201,169,105)
local meadowParchment=Color3.fromRGB(238,225,197)
local renderWitcherCharacter=(function()
local meadowDim=Color3.fromRGB(174,169,151)
local characterHero=Instance.new("Frame")
characterHero.Name="WitcherCharacterPortrait";characterHero.LayoutOrder=1
characterHero.Size=UDim2.new(1,-8,0,158)
characterHero.BackgroundColor3=Color3.fromRGB(27,27,29)
characterHero.BorderSizePixel=0;characterHero.Parent=meadowPages[1]
local characterHeroOutline=Instance.new("UIStroke")
characterHeroOutline.Color=meadowGold;characterHeroOutline.Transparency=.24;characterHeroOutline.Parent=characterHero
local characterPortrait=Instance.new("ImageLabel")
characterPortrait.Name="PlayerPortrait"
characterPortrait.Size=UDim2.fromOffset(126,142);characterPortrait.Position=UDim2.fromOffset(8,8)
characterPortrait.BackgroundColor3=Color3.fromRGB(49,41,38);characterPortrait.BorderSizePixel=0
characterPortrait.ScaleType=Enum.ScaleType.Fit
characterPortrait.Image=meadowAvatar.Image;characterPortrait.Parent=characterHero
task.spawn(function()
  local ok,image=pcall(function()
    return Players:GetUserThumbnailAsync(player.UserId,Enum.ThumbnailType.AvatarThumbnail,Enum.ThumbnailSize.Size420x420)
  end)
  if ok and typeof(image)=="string" and characterPortrait.Parent then characterPortrait.Image=image end
end)
-- [캐릭터창 3D] 사용자 실제 Roblox 아바타/기존 Tool을 월드 모델로 미리보기.
-- 외부 등록이 없는 게임 방어구를 가짜 메시로 표시하지 않는다. 오른쪽 HUD와 무관하다.
local characterViewport=Instance.new("ViewportFrame")
characterViewport.Name="NativeAvatarPreview";characterViewport.BackgroundTransparency=1
characterViewport.Ambient=Color3.fromRGB(190,176,158)
characterViewport.LightColor=Color3.fromRGB(255,229,194)
characterViewport.LightDirection=Vector3.new(-.8,-1,-.5)
characterViewport.Size=characterPortrait.Size;characterViewport.Position=characterPortrait.Position
characterViewport.Visible=false;characterViewport.Parent=characterHero
local previewWorld=Instance.new("WorldModel")
previewWorld.Name="AvatarWorld";previewWorld.Parent=characterViewport
local previewCamera=Instance.new("Camera")
previewCamera.Name="AvatarCamera";previewCamera.FieldOfView=38
previewCamera.Parent=characterViewport;characterViewport.CurrentCamera=previewCamera
local lastPreviewCharacter,lastPreviewTool,lastPreviewGearRevision=nil,nil,nil
local function redrawNativeAvatar(character,tool,force)
  local gearRevision=player:GetAttribute("MeadowGearRevision") or 0
  if not force and character==lastPreviewCharacter and tool==lastPreviewTool
    and gearRevision==lastPreviewGearRevision then return end
  lastPreviewCharacter,lastPreviewTool,lastPreviewGearRevision=character,tool,gearRevision
  previewWorld:ClearAllChildren()
  characterViewport.Visible=false
  characterPortrait.Visible=true
  if not character or not character.Parent then return end
  local originalArchivable=character.Archivable
  character.Archivable=true
  local ok,clone=pcall(function()return character:Clone()end)
  character.Archivable=originalArchivable
  if not ok or not clone or not clone:IsA("Model") then return end
  for _,part in ipairs(clone:GetDescendants())do
    if part:IsA("Script") or part:IsA("LocalScript") or part:IsA("ModuleScript") then
      part:Destroy()
    elseif part:IsA("BasePart") then
      part.Anchored=true;part.CanCollide=false;part.CanTouch=false;part.CanQuery=false
    elseif part:IsA("ParticleEmitter") or part:IsA("Trail") then
      part.Enabled=false
    end
  end
  clone.Parent=previewWorld
  clone:PivotTo(CFrame.new(0,0,0))
  local bounds,size=clone:GetBoundingBox()
  if size.Magnitude<.1 then clone:Destroy();return end
  local focus=bounds.Position+Vector3.new(0,size.Y*.04,0)
  local distance=math.max(size.X*1.6,size.Y*1.25,size.Z*1.8,7)
  previewCamera.CFrame=CFrame.lookAt(focus+Vector3.new(distance*.42,distance*.12,distance),focus)
  characterPortrait.Visible=false
  characterViewport.Visible=true
end
local characterHeroName=Instance.new("TextLabel")
characterHeroName.Name="HeroName";characterHeroName.Position=UDim2.fromOffset(144,14)
characterHeroName.Size=UDim2.new(1,-156,0,35)
characterHeroName.BackgroundTransparency=1;characterHeroName.Font=Enum.Font.GothamBold;characterHeroName.TextSize=20
characterHeroName.TextColor3=meadowParchment;characterHeroName.TextXAlignment=Enum.TextXAlignment.Left
characterHeroName.TextTruncate=Enum.TextTruncate.AtEnd;characterHeroName.Parent=characterHero
local characterHeroSummary=Instance.new("TextLabel")
characterHeroSummary.Name="HeroStatus";characterHeroSummary.Position=UDim2.fromOffset(144,50)
characterHeroSummary.Size=UDim2.new(1,-154,0,92)
characterHeroSummary.BackgroundTransparency=1;characterHeroSummary.Font=Enum.Font.GothamMedium;characterHeroSummary.TextSize=13
characterHeroSummary.TextColor3=meadowDim;characterHeroSummary.TextWrapped=true
characterHeroSummary.TextXAlignment=Enum.TextXAlignment.Left;characterHeroSummary.Parent=characterHero
-- [모바일 크기] 가로 메뉴는 좌우 배치, 좁은 메뉴는 3D 인물 아래 상태 표시.
local function layoutNativeAvatar()
  local width=characterHero.AbsoluteSize.X
  if width<=0 then return end
  local narrow=width<460
  characterHero.Size=UDim2.new(1,-8,0,narrow and 377 or 248)
  local avatarSize=narrow and math.min(220,width-18) or 217
  characterPortrait.Size=UDim2.fromOffset(avatarSize,narrow and 260 or 231)
  characterPortrait.Position=narrow
    and UDim2.new(.5,-avatarSize/2,0,8) or UDim2.fromOffset(8,8)
  characterViewport.Size=characterPortrait.Size
  characterViewport.Position=characterPortrait.Position
  characterHeroName.Position=narrow and UDim2.fromOffset(12,274) or UDim2.fromOffset(238,28)
  characterHeroName.Size=narrow and UDim2.new(1,-24,0,34) or UDim2.new(1,-250,0,34)
  characterHeroSummary.Position=narrow and UDim2.fromOffset(12,310) or UDim2.fromOffset(238,74)
  characterHeroSummary.Size=narrow and UDim2.new(1,-24,0,62) or UDim2.new(1,-250,0,140)
end
characterHero:GetPropertyChangedSignal("AbsoluteSize"):Connect(layoutNativeAvatar)
task.defer(layoutNativeAvatar)
local equipmentHeading=Instance.new("TextLabel")
equipmentHeading.Name="EquipmentHeading";equipmentHeading.LayoutOrder=2
equipmentHeading.Size=UDim2.new(1,-8,0,30);equipmentHeading.BackgroundTransparency=1
equipmentHeading.Font=Enum.Font.GothamBold;equipmentHeading.TextSize=17
equipmentHeading.Text="장  비  /  EQUIPMENT";equipmentHeading.TextColor3=meadowGold
equipmentHeading.TextXAlignment=Enum.TextXAlignment.Left;equipmentHeading.Parent=meadowPages[1]
local function characterEquipmentSlot(label,order,iconCell)
  local slot=Instance.new("Frame")
  slot.Name="EquipmentSlot"..order;slot.LayoutOrder=order
  slot.Size=UDim2.new(1,-8,0,60);slot.BackgroundColor3=Color3.fromRGB(31,31,34)
  slot.BorderSizePixel=0;slot.Parent=meadowPages[1]
  local border=Instance.new("UIStroke");border.Color=Color3.fromRGB(105,89,65)
  border.Transparency=.3;border.Parent=slot
  local icon=Instance.new("ImageLabel")
  icon.Name="EquipmentIcon";icon.Position=UDim2.fromOffset(8,7);icon.Size=UDim2.fromOffset(44,44)
  icon.BackgroundTransparency=1;icon.Image=meadowIconAtlas
  icon.ImageRectOffset=Vector2.new(iconCell*64,0);icon.ImageRectSize=Vector2.new(64,64);icon.Parent=slot
  local caption=Instance.new("TextLabel")
  caption.Name="SlotName";caption.Position=UDim2.fromOffset(62,5);caption.Size=UDim2.new(1,-70,0,21)
  caption.BackgroundTransparency=1;caption.TextColor3=meadowGold;caption.Font=Enum.Font.GothamMedium
  caption.TextSize=12;caption.Text=label;caption.TextXAlignment=Enum.TextXAlignment.Left;caption.Parent=slot
  local value=Instance.new("TextLabel")
  value.Name="SlotValue";value.Position=UDim2.fromOffset(62,26);value.Size=UDim2.new(1,-70,0,28)
  value.BackgroundTransparency=1;value.TextColor3=meadowParchment;value.Font=Enum.Font.GothamBold
  value.TextSize=15;value.TextXAlignment=Enum.TextXAlignment.Left
  value.TextTruncate=Enum.TextTruncate.AtEnd;value.Parent=slot
  return value
end
local equippedWeapon=characterEquipmentSlot("주 무기",3,2)
local equippedSecondary=characterEquipmentSlot("장갑",4,3)
local equippedArmor=characterEquipmentSlot("흉갑",5,3)
local equippedLegs=characterEquipmentSlot("바지",6,3)
local equippedFeet=characterEquipmentSlot("장화",7,3)
local equippedAccessory=characterEquipmentSlot("장신구",8,6)
local masteryHeading=Instance.new("TextLabel")
masteryHeading.Name="MasteryHeading";masteryHeading.LayoutOrder=9
masteryHeading.Size=UDim2.new(1,-8,0,30);masteryHeading.BackgroundTransparency=1
masteryHeading.Font=Enum.Font.GothamBold;masteryHeading.TextSize=17
masteryHeading.Text="숙  련  /  MASTERIES";masteryHeading.TextColor3=meadowGold
masteryHeading.TextXAlignment=Enum.TextXAlignment.Left;masteryHeading.Parent=meadowPages[1]
meadowLabels[1].LayoutOrder=10
meadowLabels[1].TextColor3=meadowParchment
meadowLabels[1].TextSize=14
return function(character,humanoid,tool,force)
  -- [실제 착용 외형] 장비 수정, 아바타 외형 로딩 및 장착 도구 교체 시에만 복제한다.
  redrawNativeAvatar(character,tool,force)
  characterHeroName.Text=player.DisplayName
  characterHeroSummary.Text=string.format("체력 %d/%d · 기력 %d/100\n장비 공격 +%d · 방어 +%d\n무기 강화 +%d · 보스 %d",
    humanoid and humanoid.Health or 0,humanoid and humanoid.MaxHealth or 100,
    player:GetAttribute("MeadowStamina") or 0,player:GetAttribute("MeadowGearAttack") or 0,
    player:GetAttribute("MeadowGearDefense") or 0,player:GetAttribute("WeaponTier") or 0,player:GetAttribute("Bosses") or 0)
  local catalog=Config.MeadowEquipment or {}
  local function equippedName(slot)
    local index=player:GetAttribute("MeadowEquip"..slot)
    local item=typeof(index)=="number" and catalog[index] or nil
    return item and item.Name or "비어 있음"
  end
  equippedWeapon.Text=equippedName("Weapon")..(tool and (" · "..tool.Name) or "")
  equippedSecondary.Text=equippedName("Hands")
  equippedArmor.Text=equippedName("Chest")
  equippedLegs.Text=equippedName("Legs")
  equippedFeet.Text=equippedName("Feet")
  equippedAccessory.Text=equippedName("Accessory")
end
end)()
local previewNeedsRefresh=false
local function renderMeadowPages()
  local character=player.Character
  local humanoid=character and character:FindFirstChildOfClass("Humanoid")
  local tool=character and character:FindFirstChildOfClass("Tool")
  -- [캐릭터 숙련도] 이전 전투 숙련도 값을 유지하고 일곱 분야를 독립 표시한다.
  -- 사냥은 실제 늑대·박쥐 처치, 채집은 실제 수확, 제작은 장비 강화 성공에서만 증가한다.
  local proficiencyLines={}
  for _,entry in ipairs(Config.Proficiencies or {}) do
    proficiencyLines[#proficiencyLines+1]=string.format("%s  %d",
      entry.Name,math.floor(player:GetAttribute(entry.Key) or 0))
  end
  renderWitcherCharacter(character,humanoid,tool,previewNeedsRefresh)
  previewNeedsRefresh=false
  meadowLabels[1].Text=string.format("%s\n\n전투 강화  +%d  ·  보스 처치  %d\n\n※ 요리·건축·연금술은 실제 제작 기능 연결 전에는 오르지 않아.",
    table.concat(proficiencyLines,"\n"),player:GetAttribute("WeaponTier") or 0,player:GetAttribute("Bosses") or 0)
  meadowLabels[2].Text=string.format("소지품 · 서버 기록\n숙련도 %d  ·  장착 %s\n저장 %s",
    math.floor(player:GetAttribute("CombatProficiency") or 0),tool and tool.Name or "맨손",
    tostring(player:GetAttribute("SaveStatus") or "불러오는 중"))
  meadowLabels[3].Text=string.format("초원 탐험 저널\n\n현재 지역 몬스터  %d\n\n%s\n\n관찰 기록은 이번 접속 중 발견한 단서야.",
    player:GetAttribute("AliveEnemies") or 0,
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
for _,key in ipairs({"MeadowEquipWeapon","MeadowEquipChest","MeadowEquipHands","MeadowEquipLegs",
  "MeadowEquipFeet","MeadowEquipAccessory","MeadowGearAttack","MeadowGearDefense"})do
  player:GetAttributeChangedSignal(key):Connect(renderMeadowPages)
end
player:GetAttributeChangedSignal("MeadowGearRevision"):Connect(renderMeadowPages)
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
-- [캐릭터창 실제 3D] 이전 캐릭터 감시를 정리하고 승인된 아바타 외형 변화만 다시 렌더링한다.
local meadowCharacterConnections={}
local function bindMeadowMenuCharacter(character)
  for _,connection in ipairs(meadowCharacterConnections)do connection:Disconnect() end
  table.clear(meadowCharacterConnections)
  if character~=player.Character then return end
  previewNeedsRefresh=true
  local human=character:WaitForChild("Humanoid",8)
  if character~=player.Character then return end
  if human then
    meadowCharacterConnections[#meadowCharacterConnections+1]=human.HealthChanged:Connect(function()
      render();renderMeadowPages()
    end)
    meadowCharacterConnections[#meadowCharacterConnections+1]=human:GetPropertyChangedSignal("MaxHealth"):Connect(function()
      render();renderMeadowPages()
    end)
  end
  local function onCharacterChildChanged(child)
    if child:IsA("Tool") or child:IsA("Accessory") or child:IsA("Shirt")
      or child:IsA("Pants") or child:IsA("ShirtGraphic") or child:IsA("BodyColors") then
      previewNeedsRefresh=true
    end
    renderMeadowPages()
  end
  meadowCharacterConnections[#meadowCharacterConnections+1]=character.ChildAdded:Connect(onCharacterChildChanged)
  meadowCharacterConnections[#meadowCharacterConnections+1]=character.ChildRemoved:Connect(onCharacterChildChanged)
  renderMeadowPages()
end
player.CharacterAppearanceLoaded:Connect(function(character)
  if character~=player.Character then return end
  previewNeedsRefresh=true
  renderMeadowPages()
end)
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
-- [라이선스] 외부 전투 아이콘 저작자 표기를 옵션 화면에 제공한다.
local iconCredits=Instance.new("TextLabel")
iconCredits.Name="ActionIconCredits"
iconCredits.LayoutOrder=8
iconCredits.Size=UDim2.new(1,-8,0,56)
iconCredits.BackgroundTransparency=1
iconCredits.TextWrapped=true
iconCredits.TextSize=11
iconCredits.Font=Enum.Font.Gotham
iconCredits.TextColor3=Color3.fromRGB(202,211,205)
iconCredits.Text="액션 아이콘: Lorc · DarkZaitzev · Delapouite (CC BY 3.0)\ngame-icons.net"
iconCredits.Parent=meadowPages[4]
renderMeadowPages()
-- [메뉴 전용 위쳐풍] 기존 왼쪽 메뉴와 중앙 팝업만 변경. 오른쪽 액션/조이스틱 HUD는 그대로 둔다.
root.BackgroundColor3=Color3.fromRGB(21,21,24)
meadowPanelGradient.Color=ColorSequence.new(Color3.fromRGB(41,34,34),Color3.fromRGB(15,16,19))
local menuBorder=root:FindFirstChild("WitcherMenuBorder") or Instance.new("UIStroke")
menuBorder.Name="WitcherMenuBorder";menuBorder.Color=meadowGold
menuBorder.Thickness=2;menuBorder.Transparency=.08;menuBorder.Parent=root
meadowMenu=CommonUI.AdaptActionMenu(gui,root,list,title,status,nil,multiplayerStatus,{
  compact=true,hideButton=true,menuLeft=true,witcherStyle=true,tabOrder={0,1,2,7,3,4,5,6},
  pages=meadowPages,pageNames=meadowPageNames,
  onPageChanged=function(index)
    renderMeadowPages()
    if index==7 and meadowActionButtons.refreshSkills then meadowActionButtons.refreshSkills() end
  end,
})
local menuHeading=root:FindFirstChild("MeadowMenuHeading")
if menuHeading then
  menuHeading.Text="마력숲  ·  인물과 장비"
  menuHeading.TextColor3=meadowGold
end
local witcherTabs=root:FindFirstChild("MeadowMenuTabs")
if witcherTabs then
  for _,button in ipairs(witcherTabs:GetChildren())do
    if button:IsA("TextButton") then
      button.TextColor3=meadowParchment
      button.Font=Enum.Font.GothamBold
      local index=button:GetAttribute("FilterIndex")
      if typeof(index)=="number" and index>1 then
        local atlasCell=({3,4,2,5,6,7,3})[index-1]
        if atlasCell then
          local icon=Instance.new("ImageLabel")
          icon.Name="CC0MenuIcon";icon.BackgroundTransparency=1
          icon.Image=meadowIconAtlas;icon.ImageRectOffset=Vector2.new(atlasCell*64,0)
          icon.ImageRectSize=Vector2.new(64,64)
          icon.Size=UDim2.fromOffset(20,20);icon.Position=UDim2.fromOffset(6,13)
          icon.ZIndex=46;icon.Parent=button
          button.Text="     "..button.Text
        end
      end
      local underline=button:FindFirstChild("SelectedUnderline")
      if underline and underline:IsA("Frame") then underline.BackgroundColor3=meadowGold end
    end
  end
end
UserInputService.InputBegan:Connect(function(input,processed)
  if processed or UserInputService:GetFocusedTextBox() then return end
  if input.KeyCode==Enum.KeyCode.C then meadowMenu.open(1)
  elseif input.KeyCode==Enum.KeyCode.I then meadowMenu.open(2)
  elseif input.KeyCode==Enum.KeyCode.K then meadowMenu.open(7)
  end
end)
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
meadowVitalsGui=Instance.new("ScreenGui")
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
energyFill=Instance.new("Frame")
energyFill.Name="StaminaFill";energyFill.Size=UDim2.fromScale(1,1)
energyFill.BackgroundColor3=Color3.fromRGB(42,169,232)
energyFill.BorderSizePixel=0;energyFill.ZIndex=10;energyFill.Parent=meadowEnergy
local energyFillCorner=Instance.new("UICorner")
energyFillCorner.CornerRadius=UDim.new(1,0);energyFillCorner.Parent=energyFill
energyLabel=Instance.new("TextLabel")
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
-- [인벤토리·스킬창] 위쳐식 분류·선택·상세 패널. 실제 서버 수치와 Roblox Tool만 사용한다.
-- [저장·밸런스 보존] 새로운 아이템, 효과, 드랍률, 스킬 포인트/잠금 상태를 만들지 않는다.
local renderWitcherInventory=(function()
local parchment=meadowParchment
local gold=meadowGold
local stone=Color3.fromRGB(40,38,40)
local muted=Color3.fromRGB(163,163,157)
local categories={"전체","무기","갑옷","장신구","소모품","재료","기록","재화"}
local data={
  {key="Wood",name="나무",category="재료",icon=4,color=Color3.fromRGB(194,146,83),description="초원에서 채집한 나무. 기존 무기 강화에 사용돼."},
  {key="Stone",name="돌",category="재료",icon=4,color=Color3.fromRGB(169,191,200),description="바위에서 채집한 돌. 기존 무기 강화에 사용돼."},
  {key="ResearchRecords",name="연구 일지",category="기록",icon=5,color=Color3.fromRGB(221,183,111),description="메인 의뢰에서 발견한 연구 기록. 획득한 내용은 저널에 보관돼."},
  {key="Coins",name="소지금",category="재화",icon=4,color=Color3.fromRGB(226,191,92),description="서버에 기록된 현재 소지금."},
}
-- [장비 도감] 모든 제작법을 현재 가방에 표시하고 소유/장착은 서버 속성만 신뢰한다.
for index,gear in ipairs(Config.MeadowEquipment or {})do
  data[#data+1]={key="rpg-gear:"..gear.Id,name=gear.Name,category=gear.Category,icon=gear.Icon or 3,
    color=gear.Attack>0 and Color3.fromRGB(218,145,111) or Color3.fromRGB(167,197,222),
    description=gear.Desc,gear=gear,index=index}
end
for _,tonic in ipairs(Config.MeadowConsumables or {})do
  data[#data+1]={key="rpg-tonic:"..tonic.Id,name=tonic.Name,category="소모품",icon=tonic.Icon or 7,
    color=Color3.fromRGB(136,207,150),description=tonic.Desc,tonic=tonic}
end
local backpack=player:FindFirstChildOfClass("Backpack") or player:FindFirstChild("Backpack")
local filterBar,filterButtons=CommonUI.CreateFilterBar({name="WitcherItemCategories",filters=categories,selectedIndex=1})
filterBar.LayoutOrder=2;filterBar.Size=UDim2.new(1,-8,0,48);filterBar.Parent=meadowPages[2]
local inventoryGrid=Instance.new("Frame")
inventoryGrid.Name="MeadowInventoryGrid";inventoryGrid.LayoutOrder=3
inventoryGrid.Size=UDim2.new(1,-8,0,100);inventoryGrid.BackgroundTransparency=1;inventoryGrid.Parent=meadowPages[2]
local gridLayout=Instance.new("UIGridLayout")
gridLayout.SortOrder=Enum.SortOrder.LayoutOrder;gridLayout.CellPadding=UDim2.fromOffset(8,8)
gridLayout.Parent=inventoryGrid
local detail=Instance.new("Frame")
detail.Name="WitcherItemDetails";detail.LayoutOrder=4
detail.Size=UDim2.new(1,-8,0,214);detail.BorderSizePixel=0;detail.BackgroundColor3=stone
detail.Parent=meadowPages[2]
local border=Instance.new("UIStroke")
border.Color=gold;border.Transparency=.16;border.Thickness=1.4;border.Parent=detail
local title=Instance.new("TextLabel")
title.Name="SelectedItem";title.Position=UDim2.fromOffset(12,8)
title.Size=UDim2.new(1,-24,0,28);title.BackgroundTransparency=1
title.TextColor3=gold;title.Font=Enum.Font.GothamBold;title.TextSize=17
title.TextXAlignment=Enum.TextXAlignment.Left;title.Parent=detail
local description=Instance.new("TextLabel")
description.Name="SelectedItemDescription";description.Position=UDim2.fromOffset(12,40)
description.Size=UDim2.new(1,-24,0,112);description.BackgroundTransparency=1
description.Font=Enum.Font.GothamMedium;description.TextColor3=parchment;description.TextSize=13
description.TextWrapped=true;description.TextXAlignment=Enum.TextXAlignment.Left
description.TextYAlignment=Enum.TextYAlignment.Top;description.Parent=detail
local equip=CommonUI.CreatePrimaryButton({name="WitcherEquipTool",text="선택 장비 착용",minHeight=48})
equip.Position=UDim2.fromOffset(12,158);equip.Size=UDim2.new(.5,-16,0,48)
equip.BackgroundColor3=Color3.fromRGB(91,62,44);equip.Visible=false;equip.Parent=detail
local secondary=CommonUI.CreatePrimaryButton({name="WitcherSecondaryItemAction",text="소모품 조합",minHeight=48})
secondary.Position=UDim2.new(.5,4,0,158);secondary.Size=UDim2.new(.5,-16,0,48)
secondary.BackgroundColor3=Color3.fromRGB(67,72,62);secondary.Visible=false;secondary.Parent=detail
local itemCards={}
local itemRows={}
local selectedKey="Wood"
local category="전체"
local function owned(item)
  if item.gear then
    local mask=math.max(0,tonumber(player:GetAttribute("MeadowGearOwned")) or 0)
    return bit32.band(mask,bit32.lshift(1,item.index-1))~=0 and 1 or 0
  end
  if item.tonic then
    local key=item.tonic.Id=="herbal_tonic" and "MeadowPotionHealth" or "MeadowPotionStamina"
    return math.max(0,tonumber(player:GetAttribute(key)) or 0)
  end
  if typeof(item.key)=="Instance" then return item.key.Parent~=nil and 1 or 0 end
  return math.max(0,tonumber(player:GetAttribute(item.key)) or 0)
end
local function itemValue(item)
  if item.gear then
    return owned(item)>0 and (player:GetAttribute("MeadowEquip"..item.gear.Slot)==item.index and "장착 중" or "보유") or "제작 가능"
  end
  if item.tonic then return tostring(math.floor(owned(item))).."개" end
  if typeof(item.key)=="Instance" then return item.key.Parent==player.Character and "장착 중" or "보유" end
  if item.key=="ResearchRecords" then return tostring(math.min(owned(item),#(Config.StoryRecords or {}))).."/"..tostring(#(Config.StoryRecords or {})) end
  return tostring(math.floor(owned(item)))
end
local function redrawSelection()
  local item=itemRows[selectedKey]
  if not item then
    title.Text="선택된 아이템 없음";description.Text="해당 분류에 보유 중인 아이템이 없어."
    equip.Visible=false;secondary.Visible=false
    return
  end
  title.Text=item.name.."  /  "..item.category
  local recipe=item.gear or item.tonic
  local cost=recipe and string.format("제작: 나무 %d · 돌 %d · 재화 %d",recipe.Wood or 0,recipe.Stone or 0,recipe.Coins or 0) or ""
  local stats=item.gear and string.format("공격 +%d  ·  방어 +%d\n",item.gear.Attack or 0,item.gear.Defense or 0) or ""
  local feedback=player:GetAttribute("MeadowGearMessage")
  description.Text="소지 / 상태   "..itemValue(item).."\n"..stats..(cost~="" and cost.."\n" or "")..
    item.description..(recipe and typeof(feedback)=="string" and ("\n"..feedback) or "")
  secondary.Visible=item.tonic~=nil
  for key,card in pairs(itemCards)do
    card.border.Color=key==selectedKey and gold or Color3.fromRGB(92,83,68)
    card.border.Thickness=key==selectedKey and 2 or 1
  end
  equip.Visible=item.gear~=nil or item.tonic~=nil or typeof(item.key)=="Instance"
  if equip.Visible then
    if item.gear then
      local has=owned(item)>0
      local worn=player:GetAttribute("MeadowEquip"..item.gear.Slot)==item.index
      equip.Text=not has and "장비 제작" or worn and "장착 해제" or "장착"
      equip.Active=player:GetAttribute("ProfileReady")==true
    elseif item.tonic then
      equip.Text="물약 사용"
      equip.Active=owned(item)>0 and player:GetAttribute("ProfileReady")==true
    else
      local equipped=item.key.Parent==player.Character
      equip.Text=equipped and "현재 장착 중" or "장착"
      equip.Active=not equipped and player:GetAttribute("ProfileReady")==true
    end
    equip.AutoButtonColor=equip.Active
  end
end
local function makeCard(item)
  local card=Instance.new("TextButton")
  card.Name="OwnedItemSlot";card.Text="";card.AutoButtonColor=true
  card.BackgroundColor3=Color3.fromRGB(30,29,32);card.BorderSizePixel=0;card.Parent=inventoryGrid
  local outline=Instance.new("UIStroke");outline.Color=Color3.fromRGB(92,83,68);outline.Parent=card
  local icon=Instance.new("ImageLabel")
  icon.Name="ExistingAssetIcon";icon.BackgroundTransparency=1;icon.Image=meadowIconAtlas
  icon.ImageRectOffset=Vector2.new(item.icon*64,0);icon.ImageRectSize=Vector2.new(64,64)
  icon.Size=UDim2.fromOffset(44,44);icon.AnchorPoint=Vector2.new(.5,0)
  icon.Position=UDim2.new(.5,0,0,4);icon.Parent=card
  local name=Instance.new("TextLabel")
  name.Name="ItemName";name.Position=UDim2.new(0,3,0,53);name.Size=UDim2.new(1,-6,0,20)
  name.BackgroundTransparency=1;name.Font=Enum.Font.GothamBold;name.TextSize=12;name.TextColor3=parchment
  name.TextXAlignment=Enum.TextXAlignment.Center;name.TextTruncate=Enum.TextTruncate.AtEnd;name.Parent=card
  local value=Instance.new("TextLabel")
  value.Name="OwnedCount";value.Position=UDim2.new(0,3,0,74);value.Size=UDim2.new(1,-6,0,24)
  value.BackgroundTransparency=1;value.Font=Enum.Font.GothamBold;value.TextSize=13
  value.TextXAlignment=Enum.TextXAlignment.Center;value.TextColor3=item.color;value.Parent=card
  card.Activated:Connect(function()
    selectedKey=item.key
    redrawSelection()
  end)
  return {button=card,name=name,count=value,border=outline}
end
local function layoutGrid()
  local width=inventoryGrid.AbsoluteSize.X
  if width<=0 then return end
  local columns=math.clamp(math.floor((width+8)/118),2,6)
  local cell=math.floor((width-(columns-1)*8-8)/columns)
  gridLayout.CellSize=UDim2.fromOffset(math.max(76,cell),104)
end
inventoryGrid:GetPropertyChangedSignal("AbsoluteSize"):Connect(layoutGrid)
gridLayout:GetPropertyChangedSignal("AbsoluteContentSize"):Connect(function()
  inventoryGrid.Size=UDim2.new(1,-8,0,math.max(110,gridLayout.AbsoluteContentSize.Y+4))
end)
local function renderInventory()
  local actual={}
  for _,item in ipairs(data)do actual[#actual+1]=item end
  local function collectTools(holder)
    if not holder then return end
    for _,tool in ipairs(holder:GetChildren())do
      if tool:IsA("Tool") then
        actual[#actual+1]={key=tool,name=tool.Name,category="무기",icon=2,
          color=Color3.fromRGB(194,208,230),description="실제 가방 또는 캐릭터에 존재하는 장비. 착용은 Roblox 기존 장착 기능을 사용해."}
      end
    end
  end
  backpack=player:FindFirstChildOfClass("Backpack") or player:FindFirstChild("Backpack") or backpack
  collectTools(player.Character)
  collectTools(backpack)
  local present={}
  local order=0
  local firstVisible=nil
  for _,item in ipairs(actual)do
    if not present[item.key] then
      present[item.key]=true;order+=1
      itemRows[item.key]=item
      local card=itemCards[item.key]
      if not card then
        card=makeCard(item);itemCards[item.key]=card
      end
      card.button.LayoutOrder=order
      card.name.Text=item.name
      card.count.Text=itemValue(item)
      card.count.TextColor3=item.color
      local show=(category=="전체" or category==item.category) and (item.gear~=nil or item.tonic~=nil or typeof(item.key)=="Instance" or owned(item)>0 or category=="전체")
      card.button.Visible=show
      card.button.BackgroundColor3=owned(item)>0 and Color3.fromRGB(38,36,39) or Color3.fromRGB(25,25,27)
      if show and not firstVisible then firstVisible=item.key end
    end
  end
  for key,card in pairs(itemCards)do
    if not present[key] then card.button:Destroy();itemCards[key]=nil;itemRows[key]=nil end
  end
  if not selectedKey or not present[selectedKey] or not itemCards[selectedKey].button.Visible then
    selectedKey=firstVisible
  end
  redrawSelection()
  layoutGrid()
end
for index,button in ipairs(filterButtons)do
  button.Activated:Connect(function()
    category=categories[index]
    for i,tab in ipairs(filterButtons)do
      tab.BackgroundColor3=i==index and Color3.fromRGB(105,70,45) or Color3.fromRGB(35,33,34)
    end
    renderInventory()
  end)
  button.BackgroundColor3=index==1 and Color3.fromRGB(105,70,45) or Color3.fromRGB(35,33,34)
end
equip.Activated:Connect(function()
  if player:GetAttribute("ProfileReady")~=true then return end
  local item=itemRows[selectedKey]
  if not item then return end
  if item.gear then
    local op=owned(item)<1 and "craft" or
      (player:GetAttribute("MeadowEquip"..item.gear.Slot)==item.index and "unequip" or "equip")
    remote:FireServer("meadow:rpg:gear:"..op..":"..item.gear.Id)
  elseif item.tonic then
    remote:FireServer("meadow:rpg:tonic:use:"..item.tonic.Id)
  else
    local tool=selectedKey
    if typeof(tool)~="Instance" or not tool:IsA("Tool") or not backpack or tool.Parent~=backpack then return end
    local human=player.Character and player.Character:FindFirstChildOfClass("Humanoid")
    if human and human.Health>0 then human:EquipTool(tool) end
  end
  renderInventory()
end)
secondary.Activated:Connect(function()
  local item=itemRows[selectedKey]
  if item and item.tonic and player:GetAttribute("ProfileReady")==true then
    remote:FireServer("meadow:rpg:tonic:craft:"..item.tonic.Id)
  end
end)
local function watchBackpack(bag)
  if not bag or not bag:IsA("Backpack") then return end
  bag.ChildAdded:Connect(renderInventory)
  bag.ChildRemoved:Connect(renderInventory)
end
watchBackpack(backpack)
player.ChildAdded:Connect(function(child)
  if child:IsA("Backpack") then backpack=child;watchBackpack(child);renderInventory() end
end)
player.CharacterAdded:Connect(function(character)
  character.ChildAdded:Connect(renderInventory)
  character.ChildRemoved:Connect(renderInventory)
  renderInventory()
end)
if player.Character then
  player.Character.ChildAdded:Connect(renderInventory)
  player.Character.ChildRemoved:Connect(renderInventory)
end
for _,name in ipairs({"Wood","Stone","Coins","ResearchRecords","ProfileReady","MeadowGearOwned",
  "MeadowEquipWeapon","MeadowEquipChest","MeadowEquipHands","MeadowEquipLegs","MeadowEquipFeet",
  "MeadowEquipAccessory","MeadowPotionHealth","MeadowPotionStamina","MeadowGearRevision"})do
  player:GetAttributeChangedSignal(name):Connect(renderInventory)
end
renderInventory()

-- [스킬창] 위쳐식 계열 카드. 기존 실제 Config.Actions만 사용하며 서버 기술을 재구현하지 않는다.
meadowLabels[7].LayoutOrder=1
meadowLabels[7].Text="마력숲 전투 기술  ·  실제 사용 가능 기술\n기술 카드 선택 → 설명 확인 → 사용"
meadowLabels[7].TextColor3=parchment
meadowLabels[7].Font=Enum.Font.GothamBold
local skillCategories={"전체","무예","마력","방어","기동","기타"}
local skillColors={
  ["무예"]=Color3.fromRGB(194,83,76),["마력"]=Color3.fromRGB(91,161,216),
  ["방어"]=Color3.fromRGB(213,175,92),["기동"]=Color3.fromRGB(110,182,144),
  ["기타"]=Color3.fromRGB(182,171,159),
}
local skillInfo={
  ["skill-meadow-heavy"]={"무예","근거리 강타. 7칸 내 적에게 강화된 단일 공격을 가해.",2},
  ["skill-meadow-sweep"]={"무예","10칸 안의 적 최대 5마리를 공격하는 회전 베기.",2},
  ["skill-meadow-bolt"]={"마력","시야가 닿는 32칸 안의 적에게 마력 탄환을 발사해.",7},
  ["skill-meadow-guard"]={"방어","2.8초 방어 자세. 시작 직후 0.28초는 완벽 방어 구간이야.",3},
  ["skill-meadow-parry"]={"방어","짧은 0.42초 동안 공격을 정확하게 튕겨내는 타이밍 기술.",3},
  ["skill-meadow-dodge-left"]={"기동","적을 주시하며 왼쪽으로 빠지는 회피 동작.",6},
  ["skill-meadow-dodge-right"]={"기동","적을 주시하며 오른쪽으로 빠지는 회피 동작.",6},
  ["skill-meadow-sprint"]={"기동","기존 서버 질주로 거리를 빠르게 좁히거나 벌려.",6},
  ["skill-meadow-heal"]={"마력","기존 서버의 회복 기술. 위험할 때 체력을 회복해.",7},
  ["skill-meadow-focus"]={"마력","기존 서버 마력 집중 효과를 발동해.",7},
  ["skill-meadow-emote"]={"기타","인사 모션을 재생해. 전투 피해는 발생하지 않아.",5},
  ["meadow-unarmed-rush"]={"무예","잽과 훅을 연속으로 사용하는 맨손 공격.",2},
  ["meadow-unarmed-uppercut"]={"무예","적을 향해 크게 올려치는 승룡 어퍼컷.",2},
  ["meadow-unarmed-kick"]={"무예","회전 발차기를 사용하는 기존 맨손 공격.",2},
  ["meadow-unarmed-elbow"]={"무예","팔꿈치와 무릎을 이용한 근접 연계 공격.",2},
}
-- [스킬 성장] 숙련도 50마다 1점. 기존 공격·저장 구조를 변경하지 않고 계열당 3단계.
local talentPanel=Instance.new("Frame")
talentPanel.Name="WitcherTalents";talentPanel.LayoutOrder=2
talentPanel.Size=UDim2.new(1,-8,0,194);talentPanel.BackgroundTransparency=1;talentPanel.Parent=meadowPages[7]
local talentHeader=Instance.new("TextLabel")
talentHeader.Name="TalentPoints";talentHeader.Size=UDim2.new(1,0,0,30)
talentHeader.BackgroundTransparency=1;talentHeader.Font=Enum.Font.GothamBold;talentHeader.TextSize=16
talentHeader.TextColor3=gold;talentHeader.TextXAlignment=Enum.TextXAlignment.Left
talentHeader.Parent=talentPanel
local talentGrid=Instance.new("Frame")
talentGrid.Name="TalentBranches";talentGrid.Position=UDim2.fromOffset(0,34)
talentGrid.Size=UDim2.new(1,0,0,156);talentGrid.BackgroundTransparency=1;talentGrid.Parent=talentPanel
local talentLayout=Instance.new("UIGridLayout")
talentLayout.SortOrder=Enum.SortOrder.LayoutOrder
talentLayout.CellPadding=UDim2.fromOffset(8,8);talentLayout.Parent=talentGrid
local talentButtons={}
for index,branch in ipairs(Config.MeadowTalentSchools or {})do
  local b=Instance.new("TextButton")
  b.Name="Talent_"..branch.Id;b.LayoutOrder=index;b.TextWrapped=true
  b.Font=Enum.Font.GothamBold;b.TextSize=13;b.TextColor3=parchment
  b.BackgroundColor3=Color3.fromRGB(37,36,40);b.BorderSizePixel=0;b.Parent=talentGrid
  local stroke=Instance.new("UIStroke")
  stroke.Color=skillColors[branch.Category] or gold;stroke.Parent=b
  talentButtons[#talentButtons+1]={button=b,branch=branch}
  b.Activated:Connect(function()
    if player:GetAttribute("ProfileReady")==true then
      remote:FireServer("meadow:rpg:talent:learn:"..branch.Id)
    end
  end)
end
local function layoutTalents()
  local w=talentGrid.AbsoluteSize.X
  if w<=0 then return end
  local columns=w>=560 and 4 or 2
  talentLayout.CellSize=UDim2.fromOffset(math.floor((w-(columns-1)*8)/columns),columns==4 and 143 or 70)
end
talentGrid:GetPropertyChangedSignal("AbsoluteSize"):Connect(layoutTalents)
local function renderTalents()
  local spent=0
  for _,entry in ipairs(talentButtons)do
    local level=math.clamp(tonumber(player:GetAttribute("MeadowTalent"..entry.branch.Id)) or 0,0,3)
    spent+=level
    entry.button.Text=entry.branch.Name.."  "..level.."/3\n"..entry.branch.Desc
  end
  local points=math.floor(math.max(0,tonumber(player:GetAttribute("CombatProficiency")) or 0)/50)
  talentHeader.Text="전투 숙련 보상 · 남은 기술 점수 "..math.max(0,points-spent)
  talentPanel.Size=UDim2.new(1,-8,0,talentGrid.AbsoluteSize.X>=560 and 190 or 194)
end
for _,name in ipairs({"CombatProficiency","MeadowTalentMartial","MeadowTalentSigns",
  "MeadowTalentDefense","MeadowTalentAgility","MeadowGearRevision"})do
  player:GetAttributeChangedSignal(name):Connect(renderTalents)
end
renderTalents()
layoutTalents()
local skillBar,skillButtons=CommonUI.CreateFilterBar({name="WitcherSkillCategories",filters=skillCategories,selectedIndex=1})
skillBar.LayoutOrder=3;skillBar.Size=UDim2.new(1,-8,0,48);skillBar.Parent=meadowPages[7]
local skillGrid=Instance.new("Frame")
skillGrid.Name="WitcherSkillTree";skillGrid.LayoutOrder=4
skillGrid.Size=UDim2.new(1,-8,0,100);skillGrid.BackgroundTransparency=1;skillGrid.Parent=meadowPages[7]
local skillLayout=Instance.new("UIGridLayout")
skillLayout.SortOrder=Enum.SortOrder.LayoutOrder
skillLayout.CellPadding=UDim2.fromOffset(8,8);skillLayout.Parent=skillGrid
skillLayout:GetPropertyChangedSignal("AbsoluteContentSize"):Connect(function()
  skillGrid.Size=UDim2.new(1,-8,0,math.max(108,skillLayout.AbsoluteContentSize.Y+4))
end)
local function layoutSkills()
  local width=skillGrid.AbsoluteSize.X
  if width<=0 then return end
  local columns=math.clamp(math.floor((width+8)/146),2,5)
  skillLayout.CellSize=UDim2.fromOffset(math.max(90,math.floor((width-(columns-1)*8-8)/columns)),110)
end
skillGrid:GetPropertyChangedSignal("AbsoluteSize"):Connect(layoutSkills)
local skillDetail=Instance.new("Frame")
skillDetail.Name="WitcherSkillDetails";skillDetail.LayoutOrder=5
skillDetail.Size=UDim2.new(1,-8,0,194);skillDetail.BorderSizePixel=0
skillDetail.BackgroundColor3=stone;skillDetail.Parent=meadowPages[7]
local skillBorder=Instance.new("UIStroke");skillBorder.Color=gold
skillBorder.Transparency=.18;skillBorder.Parent=skillDetail
local skillTitle=Instance.new("TextLabel")
skillTitle.Name="SelectedSkillTitle";skillTitle.Position=UDim2.fromOffset(12,7)
skillTitle.Size=UDim2.new(1,-24,0,30);skillTitle.BackgroundTransparency=1
skillTitle.TextColor3=gold;skillTitle.Font=Enum.Font.GothamBold
skillTitle.TextSize=18;skillTitle.TextXAlignment=Enum.TextXAlignment.Left;skillTitle.Parent=skillDetail
local skillText=Instance.new("TextLabel")
skillText.Name="SkillDescription";skillText.Position=UDim2.fromOffset(12,38)
skillText.Size=UDim2.new(1,-24,0,92);skillText.BackgroundTransparency=1
skillText.TextColor3=parchment;skillText.Font=Enum.Font.GothamMedium;skillText.TextSize=13
skillText.TextXAlignment=Enum.TextXAlignment.Left;skillText.TextYAlignment=Enum.TextYAlignment.Top
skillText.TextWrapped=true;skillText.Parent=skillDetail
local skillUse=CommonUI.CreatePrimaryButton({name="UseWitcherSkill",text="기술 사용",minHeight=52})
skillUse.Position=UDim2.fromOffset(12,134);skillUse.Size=UDim2.new(1,-24,0,52)
skillUse.BackgroundColor3=Color3.fromRGB(98,65,45);skillUse.Parent=skillDetail
local skillRows={}
local selectedSkill=nil
local skillCategory="전체"
for _,action in ipairs(Config.Actions)do
  local info=skillInfo[action.Id]
  if info and (action.Kind=="SKILL" or action.Kind=="COMBAT") then
    local card=Instance.new("TextButton")
    card.Name="WitcherSkill_"..action.Id;card.LayoutOrder=action.Order or 100
    card.Size=UDim2.fromOffset(110,110)
    card.BackgroundColor3=Color3.fromRGB(33,30,32);card.BorderSizePixel=0;card.Text=""
    card.Parent=skillGrid
    local outline=Instance.new("UIStroke")
    outline.Color=skillColors[info[1]];outline.Thickness=1.2;outline.Transparency=.15;outline.Parent=card
    local symbol=Instance.new("ImageLabel")
    symbol.Name="SkillIcon";symbol.Position=UDim2.new(.5,-21,0,5)
    symbol.Size=UDim2.fromOffset(42,42);symbol.BackgroundTransparency=1
    symbol.Image=meadowIconAtlas;symbol.ImageRectOffset=Vector2.new(info[3]*64,0)
    symbol.ImageRectSize=Vector2.new(64,64);symbol.Parent=card
    local name=Instance.new("TextLabel")
    name.Name="SkillName";name.Position=UDim2.new(0,3,0,49)
    name.Size=UDim2.new(1,-6,0,40);name.BackgroundTransparency=1
    name.TextWrapped=true;name.Text=action.Label;name.TextColor3=parchment
    name.Font=Enum.Font.GothamBold;name.TextSize=12;name.Parent=card
    local state=Instance.new("TextLabel")
    state.Name="SkillReady";state.Position=UDim2.new(0,3,1,-21)
    state.Size=UDim2.new(1,-6,0,17);state.BackgroundTransparency=1
    state.Font=Enum.Font.GothamBold;state.TextSize=11;state.TextColor3=skillColors[info[1]]
    state.Parent=card
    skillRows[#skillRows+1]={action=action,button=card,outline=outline,state=state,category=info[1],description=info[2]}
    if not selectedSkill then selectedSkill=action end
    card.Activated:Connect(function()
      selectedSkill=action
      if meadowActionButtons.refreshSkills then meadowActionButtons.refreshSkills() end
      local page=meadowPages[7]
      page.CanvasPosition=Vector2.new(0,math.max(0,page.AbsoluteCanvasSize.Y-page.AbsoluteSize.Y))
    end)
  end
end
meadowActionButtons.refreshSkills=function()
  if not selectedSkill then return end
  local now=workspace:GetServerTimeNow()
  local current=nil
  for _,row in ipairs(skillRows)do
    local deadline=player:GetAttribute("MeadowReady_"..row.action.Id)
    local remaining=typeof(deadline)=="number" and math.max(0,deadline-now) or 0
    row.button.Visible=skillCategory=="전체" or row.category==skillCategory
    row.state.Text=remaining>.05 and (math.ceil(remaining).."초") or "준비"
    row.outline.Thickness=row.action==selectedSkill and 3 or 1.2
    row.button.BackgroundColor3=row.action==selectedSkill and Color3.fromRGB(68,50,42) or Color3.fromRGB(33,30,32)
    if row.action==selectedSkill then current=row end
  end
  if not current then return end
  local deadline=player:GetAttribute("MeadowReady_"..selectedSkill.Id)
  local remaining=typeof(deadline)=="number" and math.max(0,deadline-now) or 0
  local human=player.Character and player.Character:FindFirstChildOfClass("Humanoid")
  local available=player:GetAttribute("ProfileReady")==true and human~=nil and human.Health>0 and remaining<=.05
  skillTitle.Text=selectedSkill.Label.."  /  "..current.category
  skillTitle.TextColor3=skillColors[current.category]
  local cooldown=selectedSkill.Cooldown
  local cooldownText=typeof(cooldown)=="number" and (tostring(cooldown).."초") or "기본 공격 판정"
  skillText.Text=current.description.."\n\n재사용 대기시간: "..cooldownText..
    "\n현재: "..(remaining>.05 and (math.ceil(remaining).."초 남음") or (available and "사용 가능" or "캐릭터 대기"))
  skillUse.Text=available and ("사용  ·  "..selectedSkill.Label) or "사용 대기"
  skillUse.Active=available;skillUse.AutoButtonColor=available
  skillUse.BackgroundColor3=available and Color3.fromRGB(107,70,45) or Color3.fromRGB(60,55,55)
end
for index,button in ipairs(skillButtons)do
  button.Activated:Connect(function()
    skillCategory=skillCategories[index]
    for _,row in ipairs(skillRows)do
      if skillCategory=="전체" or row.category==skillCategory then
        selectedSkill=row.action
        break
      end
    end
    for i,tab in ipairs(skillButtons)do
      tab.BackgroundColor3=i==index and Color3.fromRGB(105,70,45) or Color3.fromRGB(35,33,34)
    end
    meadowActionButtons.refreshSkills()
  end)
  button.BackgroundColor3=index==1 and Color3.fromRGB(105,70,45) or Color3.fromRGB(35,33,34)
end
skillUse.Activated:Connect(function()
  if not selectedSkill or player:GetAttribute("ProfileReady")~=true then return end
  local human=player.Character and player.Character:FindFirstChildOfClass("Humanoid")
  if not human or human.Health<=0 then return end
  local deadline=player:GetAttribute("MeadowReady_"..selectedSkill.Id)
  if typeof(deadline)=="number" and deadline>workspace:GetServerTimeNow() then return end
  if meadowMenu then meadowMenu.close() end
  activateMeadowAction(selectedSkill.Id)
end)
meadowActionButtons.refreshSkills()
return renderInventory
end)()

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
      local witness=bit32.lshift(1,contract.Witness-1)
      local found=(bit32.band(villageMask,witness)~=0 and 1 or 0)
        +(bit32.band(villageMask,8)~=0 and 1 or 0)
        +(bit32.band(villageMask,64)~=0 and 1 or 0)
      villageLines[#villageLines+1]="【"..(villagePhase==0 and "수락 대기" or villagePhase==2 and "결정 대기" or "조사 중").."】 "..contract.Name..
        "\n"..contract.Summary.."\n진행 "..found.."/3 · "..contract.WitnessName.." 진술 · 현장 1곳 · "..contract.EnemyName.." 처치."
    end
  end
  if villageIndex>#Config.VillageContracts then villageLines[#villageLines+1]="마을 의뢰 모두 완료" end
  villageContractRow.Text=table.concat(villageLines,"\n\n")
  trackerTitle.Text=quest and ("메인  "..quest.Name.."  ▸") or "메인  초원 조사 기록 완료  ▸"
  trackerDetail.Text=quest and string.format("%s  (%d/%d)",quest.Instruction,progress,quest.Goal)
    or "연구 기록을 메뉴의 인벤토리에서 다시 볼 수 있어"
  inventoryRow.Text="획득한 아이템 · 수량은 서버 기록 기준"
  renderWitcherInventory()
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

-- [첫 화면] 기존 초원 월드·R15 캐릭터·음향을 그대로 배경에 사용한다.
-- 새로운 3D 파츠나 배경용 가짜 월드를 만들지 않고, 시작 선택 뒤 기존 HUD를 복원한다.
do
  local ContentProvider=game:GetService("ContentProvider")
  local TweenService=game:GetService("TweenService")
  local arrivalGui=Instance.new("ScreenGui")
  arrivalGui.Name="MeadowArrivalScreen"
  arrivalGui.ResetOnSpawn=false
  arrivalGui.IgnoreGuiInset=true
  arrivalGui.DisplayOrder=100
  arrivalGui.Parent=player.PlayerGui
  local backdrop=Instance.new("Frame")
  backdrop.Name="ArrivalBackdrop"
  backdrop.Size=UDim2.fromScale(1,1)
  backdrop.BackgroundColor3=Color3.fromRGB(8,20,17)
  backdrop.BackgroundTransparency=.32
  backdrop.BorderSizePixel=0
  backdrop.Active=true
  backdrop.Parent=arrivalGui
  local shade=Instance.new("UIGradient")
  shade.Color=ColorSequence.new({
    ColorSequenceKeypoint.new(0,Color3.fromRGB(17,32,28)),
    ColorSequenceKeypoint.new(.5,Color3.fromRGB(65,77,64)),
    ColorSequenceKeypoint.new(1,Color3.fromRGB(12,24,22)),
  })
  shade.Rotation=90
  shade.Parent=backdrop
  local function panel(name,width,height)
    local frame=Instance.new("Frame")
    frame.Name=name
    frame.AnchorPoint=Vector2.new(.5,.5)
    frame.Position=UDim2.fromScale(.5,.5)
    frame.Size=UDim2.new(.9,0,0,height)
    frame.BackgroundColor3=Color3.fromRGB(22,34,28)
    frame.BackgroundTransparency=.10
    frame.BorderSizePixel=0
    frame.Parent=backdrop
    local sizeLimit=Instance.new("UISizeConstraint")
    sizeLimit.MaxSize=Vector2.new(width,height)
    sizeLimit.Parent=frame
    local corner=Instance.new("UICorner")
    corner.CornerRadius=UDim.new(0,15)
    corner.Parent=frame
    local stroke=Instance.new("UIStroke")
    stroke.Color=Color3.fromRGB(192,157,98)
    stroke.Thickness=2
    stroke.Parent=frame
    return frame
  end
  local function label(parent,name,value,y,height,size,color)
    local t=Instance.new("TextLabel")
    t.Name=name
    t.Position=UDim2.new(0,10,0,y)
    t.Size=UDim2.new(1,-20,0,height)
    t.BackgroundTransparency=1
    t.Text=value
    t.Font=Enum.Font.GothamBold
    t.TextSize=size
    t.TextColor3=color or Color3.fromRGB(247,226,176)
    t.TextWrapped=true
    t.Parent=parent
    return t
  end
  local function button(parent,name,value,y)
    local b=Instance.new("TextButton")
    b.Name=name
    b.Position=UDim2.new(0,22,0,y)
    b.Size=UDim2.new(1,-44,0,42)
    b.BackgroundColor3=Color3.fromRGB(85,66,44)
    b.TextColor3=Color3.fromRGB(255,246,216)
    b.Font=Enum.Font.GothamBold
    b.TextSize=17
    b.Text=value
    b.AutoButtonColor=true
    b.Parent=parent
    local corner=Instance.new("UICorner")
    corner.CornerRadius=UDim.new(0,9)
    corner.Parent=b
    return b
  end
  local titlePanel=panel("MeadowTitle",390,306)
  label(titlePanel,"GameName","마 력 숲",21,54,35)
  label(titlePanel,"GameSubtitle","안개가 걷히면, 또 다른 이야기가 시작된다",76,31,13,Color3.fromRGB(211,221,196))
  local continueButton=button(titlePanel,"Continue","이어하기",116)
  local newButton=button(titlePanel,"NewGame","새 게임",168)
  local settingButton=button(titlePanel,"Settings","설정",220)
  local titleStatus=label(titlePanel,"SaveState","저장 기록 확인 중",266,29,12,Color3.fromRGB(203,214,195))

  local options=panel("MeadowTitleSettings",390,268)
  options.Visible=false
  label(options,"SettingsTitle","환경 설정",18,44,25)
  local effectsButton=button(options,"Effects","효과음",83)
  local ambienceButton=button(options,"Ambience","환경음",135)
  local settingsBack=button(options,"Back","돌아가기",193)
  local function refreshArrivalOptions()
    effectsButton.Text="효과음  "..math.floor(meadowEffectsGroup.Volume*100+.5).."%"
    ambienceButton.Text="환경음  "..math.floor(meadowAmbienceGroup.Volume*100+.5).."%"
  end
  effectsButton.Activated:Connect(function()
    meadowEffectsGroup.Volume=meadowEffectsGroup.Volume>.9 and 0 or math.min(1,meadowEffectsGroup.Volume+.25)
    refreshArrivalOptions()
  end)
  ambienceButton.Activated:Connect(function()
    meadowAmbienceGroup.Volume=meadowAmbienceGroup.Volume>.9 and 0 or math.min(1,meadowAmbienceGroup.Volume+.25)
    refreshArrivalOptions()
  end)
  settingButton.Activated:Connect(function()
    refreshArrivalOptions()
    titlePanel.Visible=false
    options.Visible=true
  end)
  settingsBack.Activated:Connect(function()
    options.Visible=false
    titlePanel.Visible=true
  end)

  local confirmPanel=panel("MeadowNewGameConfirm",390,244)
  confirmPanel.Visible=false
  label(confirmPanel,"Warning","기존 진행도를 삭제할까?",18,46,24)
  label(confirmPanel,"Details","숙련도·재화·의뢰·탐험 기록이 처음부터 시작돼.\n기존 저장은 되돌릴 수 없어.",68,54,14,Color3.fromRGB(251,218,185))
  local confirmButton=button(confirmPanel,"Confirm","삭제 확인 · 새 게임 시작",130)
  local cancelButton=button(confirmPanel,"Cancel","취소",182)
  cancelButton.Activated:Connect(function()
    confirmPanel.Visible=false
    titlePanel.Visible=true
  end)

  -- [로딩 화면] 허구의 발견 지도/구역 배지/안개 표식 대신 제목과 실제 진행만 표시.
  local loadPanel=panel("MeadowMapLoading",390,178)
  loadPanel.Visible=false
  loadPanel.BackgroundColor3=Color3.fromRGB(24,43,34)
  label(loadPanel,"LoadingGameTitle","마력숲",20,48,29,Color3.fromRGB(242,226,177))
  local loadingStatus=label(loadPanel,"LoadingStatus","서버 확인 중",69,30,14,Color3.fromRGB(216,227,205))
  local progressTrack=Instance.new("Frame")
  progressTrack.Name="ProgressTrack"
  progressTrack.Position=UDim2.new(0,24,0,118)
  progressTrack.Size=UDim2.new(1,-48,0,10)
  progressTrack.BackgroundColor3=Color3.fromRGB(60,70,57)
  progressTrack.BorderSizePixel=0
  progressTrack.Parent=loadPanel
  local progressCorner=Instance.new("UICorner")
  progressCorner.CornerRadius=UDim.new(0,5)
  progressCorner.Parent=progressTrack
  local progressFill=Instance.new("Frame")
  progressFill.Name="VerifiedProgress"
  progressFill.Size=UDim2.fromScale(0,1)
  progressFill.BackgroundColor3=Color3.fromRGB(166,196,117)
  progressFill.BorderSizePixel=0
  progressFill.Parent=progressTrack
  local fillCorner=Instance.new("UICorner")
  fillCorner.CornerRadius=UDim.new(0,5)
  fillCorner.Parent=progressFill

  local introPanel=Instance.new("Frame")
  introPanel.Name="FirstArrivalScene"
  introPanel.Size=UDim2.fromScale(1,1)
  introPanel.BackgroundTransparency=1
  introPanel.Visible=false
  introPanel.Parent=backdrop
  local regionIntro=label(introPanel,"RegionReveal","초원 지역",24,60,32)
  regionIntro.Position=UDim2.fromScale(0,.17)
  regionIntro.Size=UDim2.fromScale(1,.14)
  label(introPanel,"OpeningText","새벽의 안개 너머로 숲의 울음이 들린다.",105,40,16)
  local skipButton=button(introPanel,"Skip","건너뛰기",170)
  skipButton.AnchorPoint=Vector2.new(1,1)
  skipButton.Position=UDim2.new(1,-20,1,-25)
  skipButton.Size=UDim2.fromOffset(115,40)

  local entranceOpen=true
  local openingCamera=workspace.CurrentCamera
  local originalCameraType=openingCamera and openingCamera.CameraType
  local originalSubject=openingCamera and openingCamera.CameraSubject
  local activeTween=nil
  local runToken=0
  local function arrivalControls(enabled)
    local scripts=player:FindFirstChild("PlayerScripts")
    local module=scripts and scripts:FindFirstChild("PlayerModule")
    if module then
      pcall(function()
        local controls=require(module):GetControls()
        if enabled then controls:Enable() else controls:Disable() end
      end)
    end
  end
  local function restoreCamera()
    if activeTween then activeTween:Cancel();activeTween=nil end
    if openingCamera and openingCamera.Parent then
      openingCamera.CameraType=Enum.CameraType.Custom
      local character=player.Character
      local humanoid=character and character:FindFirstChildOfClass("Humanoid")
      if humanoid then openingCamera.CameraSubject=humanoid
      elseif originalSubject and originalSubject.Parent then openingCamera.CameraSubject=originalSubject end
    end
  end
  local function closeArrival()
    if not entranceOpen then return end
    entranceOpen=false
    runToken+=1
    remote:FireServer("meadow:enter-world")
    restoreCamera()
    gui.Enabled=true
    meadowVitalsGui.Enabled=true
    arrivalControls(true)
    arrivalGui:Destroy()
  end
  local function showArrivalCamera()
    openingCamera=workspace.CurrentCamera
    if not openingCamera then return end
    originalCameraType=openingCamera.CameraType
    originalSubject=openingCamera.CameraSubject
    openingCamera.CameraType=Enum.CameraType.Scriptable
    openingCamera.CFrame=CFrame.lookAt(Vector3.new(31,26,44),Vector3.new(0,5,-70))
  end
  gui.Enabled=false
  meadowVitalsGui.Enabled=false
  arrivalControls(false)
  showArrivalCamera()
  player.CharacterAdded:Connect(function()
    if entranceOpen then task.defer(function()
      if entranceOpen and titlePanel.Visible then showArrivalCamera() end
    end) end
  end)
  local function updateTitleStatus()
    local ready=player:GetAttribute("ProfileReady")==true
    local saved=player:GetAttribute("MeadowProfileHadSave")==true
    local sessionOnly=player:GetAttribute("SaveStatus")=="SESSION_ONLY"
    continueButton.Text=saved and "이어하기" or "모험 시작"
    titleStatus.Text=not ready and "저장 기록 확인 중"
      or sessionOnly and "임시 플레이 · 저장소 연결 실패"
      or saved and "저장된 진행도 확인됨" or "새로운 모험 준비 완료"
    -- 프로필 지연 중에도 시작 입력은 받고 실제 입장만 서버 승인 후 수행한다.
    continueButton.Active=true
    newButton.Active=not sessionOnly
    continueButton.BackgroundTransparency=ready and 0 or .25
    newButton.BackgroundTransparency=(ready and not sessionOnly) and 0 or .25
  end
  player:GetAttributeChangedSignal("ProfileReady"):Connect(updateTitleStatus)
  player:GetAttributeChangedSignal("SaveStatus"):Connect(updateTitleStatus)
  player:GetAttributeChangedSignal("MeadowProfileHadSave"):Connect(updateTitleStatus)
  updateTitleStatus()

  -- [로딩 상태] 가짜 지역 등록과 발견 배지를 생성하지 않는다.
  local function setProgress(done,total,message)
    local ratio=total>0 and math.clamp(done/total,0,1) or 0
    progressFill.Size=UDim2.fromScale(ratio,1)
    loadingStatus.Text=message.." · "..math.floor(ratio*100+.5).."%"
  end
  local function startIntro(isFresh)
    loadPanel.Visible=false
    introPanel.Visible=isFresh
    if not isFresh then closeArrival();return end
    local token=runToken
    local character=player.Character
    local rootPart=character and character:FindFirstChild("HumanoidRootPart")
    if openingCamera and rootPart then
      openingCamera.CameraType=Enum.CameraType.Scriptable
      openingCamera.CFrame=CFrame.lookAt(rootPart.Position+Vector3.new(14,12,17),
        rootPart.Position+Vector3.new(0,2,-15))
      activeTween=TweenService:Create(openingCamera,TweenInfo.new(4,Enum.EasingStyle.Sine),
        {CFrame=CFrame.lookAt(rootPart.Position+Vector3.new(-8,6,11),
          rootPart.Position+Vector3.new(0,3,-12))})
      activeTween:Play()
    end
    regionIntro.Text="초원 지역"
    local finished=false
    local function finish()
      if finished or token~=runToken then return end
      finished=true
      closeArrival()
    end
    skipButton.Activated:Once(finish)
    task.delay(4.3,finish)
  end
  local function loadRegion(isFresh)
    if not entranceOpen then return end
    runToken+=1
    local token=runToken
    titlePanel.Visible=false
    options.Visible=false
    confirmPanel.Visible=false
    loadPanel.Visible=true
    setProgress(0,0,"서버 및 저장 기록 확인")
    task.spawn(function()
      -- 실제 서버 프로필 및 클라이언트 스트리밍된 캐릭터가 준비될 때만 다음 단계로 이동한다.
      local profileDeadline=os.clock()+35
      while entranceOpen and token==runToken and player:GetAttribute("ProfileReady")~=true
        and os.clock()<profileDeadline do task.wait(.1) end
      if not entranceOpen or token~=runToken then return end
      if player:GetAttribute("ProfileReady")~=true then
        loadPanel.Visible=false
        titlePanel.Visible=true
        titleStatus.Text="서버 저장 정보 연결 지연 · 다시 시도해"
        return
      end
      setProgress(0,0,"저장 데이터 확인")
      local resumeDeadline=os.clock()+26
      while entranceOpen and token==runToken
        and player:GetAttribute("MeadowResumeReady")==false
        and os.clock()<resumeDeadline do task.wait(.15) end
      if not entranceOpen or token~=runToken then return end
      if player:GetAttribute("MeadowResumeReady")==false then
        loadPanel.Visible=false
        titlePanel.Visible=true
        titleStatus.Text="이전 위치 복원 확인 중 · 다시 시도해"
        return
      end
      local world=workspace:WaitForChild("FantasySurvivalWorld",20)
      local character=player.Character or player.CharacterAdded:Wait()
      local rootPart=character and character:WaitForChild("HumanoidRootPart",12)
      if not entranceOpen or token~=runToken then return end
      if not world or not rootPart then
        loadPanel.Visible=false
        titlePanel.Visible=true
        titleStatus.Text="월드 준비 실패 · 다시 시도해"
        return
      end
      local assets={}
      for _,descendant in ipairs(world:GetDescendants()) do
        if descendant:IsA("MeshPart") or descendant:IsA("Decal")
          or descendant:IsA("Texture") then
          assets[#assets+1]=descendant
          if #assets>=20 then break end
        end
      end
      -- [정확한 로딩] 완료된 원본 자산 처리 건수에 비례하여 진행한다.
      local total=1+#assets
      local loaded=0
      setProgress(loaded,total,"초원 지형 및 캐릭터 준비")
      local failed=0
      -- 진행 숫자는 실제 완료된 원본 파일의 PreloadAsync 호출 수로만 증가한다.
      for _,asset in ipairs(assets) do
        if not entranceOpen or token~=runToken then return end
        local ok=pcall(function() ContentProvider:PreloadAsync({asset}) end)
        if not ok then failed+=1 end
        loaded+=1
        setProgress(loaded,total,failed>0 and "일부 자산 로딩 실패" or "원본 모델 불러오는 중")
        task.wait()
      end
      if not entranceOpen or token~=runToken then return end
      loaded+=1
      setProgress(loaded,total,failed>0 and "일부 자산은 접속 후 다시 로드돼" or "월드 준비 완료")
      task.wait(.18)
      startIntro(isFresh)
    end)
  end
  continueButton.Activated:Connect(function()
    -- 이어하기는 서버 준비를 기다리되 입력 자체를 무시하지 않는다.
    loadRegion(player:GetAttribute("MeadowProfileHadSave")~=true)
  end)
  local newGameWaiting=false
  newButton.Activated:Connect(function()
    if newGameWaiting or not entranceOpen then return end
    newGameWaiting=true
    task.spawn(function()
      if player:GetAttribute("ProfileReady")~=true then
        titleStatus.Text="저장 정보 연결 중 · 새 게임 준비"
        local deadline=os.clock()+35
        while entranceOpen and player:GetAttribute("ProfileReady")~=true
          and os.clock()<deadline do task.wait(.1) end
      end
      newGameWaiting=false
      if not entranceOpen then return end
      if player:GetAttribute("ProfileReady")~=true then
        titleStatus.Text="서버 저장 정보 연결 지연 · 다시 시도해"
        return
      end
      if player:GetAttribute("SaveStatus")=="SESSION_ONLY" then
        titleStatus.Text="저장 연결 실패 · 기존 데이터 초기화 불가"
        return
      end
      if player:GetAttribute("MeadowProfileHadSave")~=true then
        loadRegion(true)
      else
        titlePanel.Visible=false
        confirmPanel.Visible=true
      end
    end)
  end)
  confirmButton.Activated:Connect(function()
    if player:GetAttribute("ProfileReady")~=true then return end
    confirmButton.Active=false
    confirmButton.Text="서버에서 기존 저장 초기화 중"
    remote:FireServer("meadow:new-game:confirm")
  end)
  player:GetAttributeChangedSignal("MeadowNewGameResult"):Connect(function()
    if not entranceOpen then return end
    local result=player:GetAttribute("MeadowNewGameResult")
    if result=="SUCCESS" then
      confirmButton.Active=true
      confirmButton.Text="삭제 확인 · 새 게임 시작"
      loadRegion(true)
    elseif result=="SAVE_FAILED" or result=="UNAVAILABLE" then
      confirmButton.Active=true
      confirmButton.Text="다시 시도"
      local warning=confirmPanel:FindFirstChild("Details")
      if warning then warning.Text="저장소가 초기화를 승인하지 않았어.\n기존 진행도는 보존했어." end
    end
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
  local storyScroll=Instance.new("ScrollingFrame")
  storyScroll.Name="VillageStoryScroll"
  storyScroll.Position=UDim2.fromOffset(14,49)
  storyScroll.Size=UDim2.new(1,-28,0,136)
  storyScroll.BackgroundTransparency=1
  storyScroll.BorderSizePixel=0
  storyScroll.ScrollBarThickness=3
  storyScroll.AutomaticCanvasSize=Enum.AutomaticSize.Y
  storyScroll.CanvasSize=UDim2.new()
  storyScroll.ScrollingDirection=Enum.ScrollingDirection.Y
  storyScroll.ZIndex=71
  storyScroll.Parent=dialog
  local story=Instance.new("TextLabel")
  story.Name="DialogueText"
  story.Position=UDim2.fromOffset(0,2)
  story.Size=UDim2.new(1,-7,0,0)
  story.AutomaticSize=Enum.AutomaticSize.Y
  story.BackgroundTransparency=1
  story.TextColor3=Color3.fromRGB(237,241,224)
  story.Font=Enum.Font.GothamMedium
  story.TextSize=14
  story.TextWrapped=true
  story.TextYAlignment=Enum.TextYAlignment.Top
  story.TextXAlignment=Enum.TextXAlignment.Left
  story.ZIndex=71
  story.Parent=storyScroll
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
  local choiceActions={}
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
    button.Activated:Connect(function()
      local action=choiceActions[i]
      if action and dialog.Visible then
        dialog.Visible=false
        choiceActions[1]=nil
        choiceActions[2]=nil
        remote:FireServer(action)
      end
    end)
  end
  local function layoutDialogue()
    local v=gui.AbsoluteSize
    if v.Y>0 then
      local h=math.clamp(v.Y-36,230,320)
      dialog.Size=UDim2.new(.9,0,0,h)
      storyScroll.Size=UDim2.new(1,-28,0,h-178)
      for i,button in ipairs(choices)do
        button.Position=UDim2.new(0,14,0,h-128+(i-1)*56)
        button.Size=UDim2.new(1,-28,0,50)
      end
    end
  end
  gui:GetPropertyChangedSignal("AbsoluteSize"):Connect(layoutDialogue)
  layoutDialogue()
  remote.OnClientEvent:Connect(function(kind,payload)
    if kind~="MEADOW_VILLAGE_DIALOG" or typeof(payload)~="table" then return end
    title.Text=tostring(payload.title or "마을 의뢰")
    story.Text=tostring(payload.message or "")
    storyScroll.CanvasPosition=Vector2.zero
    for i,button in ipairs(choices)do
      local option=typeof(payload.options)=="table" and payload.options[i] or nil
      local action=option and option.action
      local permitted=action=="village:accept" or action=="village:resolve:1" or action=="village:resolve:2"
      button.Visible=permitted
      choiceActions[i]=permitted and action or nil
      if permitted then button.Text=tostring(option.label or "선택") end
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
  local lastBossModel=nil
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
    if kind=="MEADOW_BOSS_INTRO" and typeof(payload)=="table"
      and typeof(payload.model)=="Instance" and payload.model~=lastBossModel then
      lastBossModel=payload.model;showIntro(payload)
    end
  end)
  player.CharacterAdded:Connect(closeIntro)
  player:GetAttributeChangedSignal("Health"):Connect(function()if sceneCamera then closeIntro()end end)
  player:GetAttributeChangedSignal("ProfileReady"):Connect(showIntro)
  gui:GetAttributeChangedSignal("GameMenuOpen"):Connect(function()if gui:GetAttribute("GameMenuOpen")==true then closeIntro()end end)
  task.defer(showIntro)
end

-- [모바일 전체 화면 입력] 게임 월드 탭은 공격, 주민·의뢰판·단서 탭은 원본 대화 프롬프트를 사용한다.
-- 메뉴·대화 선택지·조이스틱·오른쪽 기술 버튼을 누른 터치는 공격으로 바꾸지 않는다.
local shownMeadowPrompts={}
local lastMeadowWorldTap=0
local function activateNearbyMeadowInteraction(screenPosition)
  local character=player.Character
  local rootPart=character and character:FindFirstChild("HumanoidRootPart")
  local camera=workspace.CurrentCamera
  if not rootPart then return false end
  local target,bestDistance=nil,math.huge
  for prompt in pairs(shownMeadowPrompts) do
    local host=prompt.Parent
    if prompt.Name=="MeadowVillageInteraction" and prompt.Enabled
      and host and host:IsA("BasePart") and prompt:IsDescendantOf(workspace) then
      local distance=(host.Position-rootPart.Position).Magnitude
      if distance<=prompt.MaxActivationDistance and distance<16 then
        local score=distance
        if screenPosition then
          if not camera then continue end
          local projected,visible=camera:WorldToViewportPoint(host.Position)
          if not visible or projected.Z<=0 then continue end
          local offset=(Vector2.new(projected.X,projected.Y)-screenPosition).Magnitude
          if offset>65 then continue end
          score=offset+distance*.5
        end
        if score<bestDistance then target,bestDistance=prompt,score end
      end
    end
  end
  if not target then return false end
  -- [기존 상호작용] 임의의 클라이언트 대화/보상 없이 서버 ProximityPrompt.Triggered를 그대로 사용한다.
  target:InputHoldBegin()
  task.delay(math.max(.05,target.HoldDuration)+.08,function()
    if target.Parent then target:InputHoldEnd() end
  end)
  return true
end
local function isMeadowWorldTapBlocked(point)
  if gui.Enabled~=true or gui:GetAttribute("GameMenuOpen")==true then return true end
  local dialogue=gui:FindFirstChild("MeadowVillageDialogue")
  if dialogue and dialogue.Visible then return true end
  for _,control in ipairs(player.PlayerGui:GetGuiObjectsAtPosition(point.X,point.Y)) do
    if control:FindFirstAncestor("TouchGui") or control:IsA("GuiButton")
      or control:IsA("TextBox") or control:FindFirstAncestor("MeadowStoryIntro") then
      return true
    end
  end
  return false
end
local function activateMeadowWorldTap(point)
  if typeof(point)~="Vector2" or isMeadowWorldTapBlocked(point) then return end
  local now=os.clock()
  if now-lastMeadowWorldTap<.13 then return end
  lastMeadowWorldTap=now
  if activateNearbyMeadowInteraction(point) then return end
  if primaryCombatAction then activateMeadowAction(primaryCombatAction.Id) end
end
-- 원본 월드 탭은 유지하고, 투명 HUD가 입력을 처리한 경우 TouchTap으로 정상 공격을 복구한다.
UserInputService.TouchTapInWorld:Connect(function(position,processedByUI)
  if processedByUI or gui:GetAttribute("GameMenuOpen")==true then return end
  -- 공식 이벤트는 배열이 아닌 단일 Vector2를 전달한다.
  activateMeadowWorldTap(position)
end)
UserInputService.TouchTap:Connect(function(positions)
  -- 전체 화면 터치 이벤트만 Vector2 배열이며, 실제 UI/조이스틱은 기존 필터가 제외한다.
  if positions and #positions==1 then activateMeadowWorldTap(positions[1]) end
end)
UserInputService.InputBegan:Connect(function(input,processed)
  if processed or UserInputService.TouchEnabled or gui:GetAttribute("GameMenuOpen")==true then return end
  if input.UserInputType==Enum.UserInputType.MouseButton1 then
    activateMeadowWorldTap(Vector2.new(input.Position.X,input.Position.Y))
  end
end)

-- [전투 UI] 상단 네 버튼: 연타 주먹·발 회피·막기·회복 물약. 기존 서버 액션을 그대로 사용한다.
-- 하단 상호작용·질주·가방은 고정하고, 상단 네 버튼만 옵션에서 위치를 조정한다.
local meadowSkillDock=Instance.new("Frame")
meadowSkillDock.Name="MeadowR15SkillDock"
meadowSkillDock.BackgroundTransparency=1
meadowSkillDock.ZIndex=35 -- [오른쪽 버튼] 일반 HUD 위에 실동작 터치 버튼을 배치.
meadowSkillDock.AnchorPoint=Vector2.new(1,1)
meadowSkillDock.Parent=gui
-- 외부 CC0 등록 아틀라스의 실제 의미가 맞는 아이콘만 매칭한다.
local meleeSkills={
  {"meadow-unarmed-rush","연타",Color3.fromRGB(243,87,46),nil,"fist"},
  {"skill-meadow-dodge-left","회피",Color3.fromRGB(246,179,73),nil,"dodge"},
  {"skill-meadow-guard","막기",Color3.fromRGB(71,160,246),nil,"guard"},
  {"skill-meadow-heal","물약",Color3.fromRGB(224,85,94),nil,"potion"},
}
-- 네 위치는 기존 세이브의 별도 UI 문자열에만 보존한다. 전투·재화 값에는 영향이 없다.
-- [기본 삼각 편대] 연타·막기 원형의 하단을 작은 물약 원형의 하단과 정확히 일치시킨다.
-- 회피·물약 및 하단 상호작용·질주·가방은 기존 위치를 유지한다.
local alignedCombatY=.395-(74-46)/(2*260)
local meadowTopDefaults={{.160,alignedCombatY},{.500,.120},{.840,alignedCombatY},{.500,.395}}
local meadowTopPositions={}
for index,p in ipairs(meadowTopDefaults) do meadowTopPositions[index]={p[1],p[2]} end
local alignMeadowRadar
local function readMeadowTopLayout(value)
  if typeof(value)~="string" or #value>40 or not value:match("^%d+,%d+,%d+,%d+,%d+,%d+,%d+,%d+$") then return false end
  -- [기존 UI 저장 보존] 이전 기본 배치를 저장한 사용자는 새 기본 배치로만 옮기고,
  -- 사용자가 직접 변경한 버튼 위치와 저장 키는 그대로 유지한다.
  if value=="235,275,500,120,800,275,500,510"
    or value=="200,300,500,300,800,300,500,550"
    or value=="160,540,500,120,840,540,500,395" then
    for index,p in ipairs(meadowTopDefaults) do meadowTopPositions[index]={p[1],p[2]} end
    return true
  end
  local values={}
  for digit in value:gmatch("%d+") do values[#values+1]=tonumber(digit) end
  if #values~=8 then return false end
  for index=1,4 do
    local x,y=values[index*2-1],values[index*2]
    if x<120 or x>880 or y<100 or y>550 then return false end
  end
  -- [버튼 겹침 방지] 이전 저장 위치가 중첩되어 다른 버튼을 가리지 않도록 기본 배치를 사용한다.
  for index=1,3 do
    for other=index+1,4 do
      local dx=(values[index*2-1]-values[other*2-1])*235/1000
      local dy=(values[index*2]-values[other*2])*260/1000
      local minDistance=37+(other==4 and 23 or 37)+8
      if dx*dx+dy*dy<minDistance*minDistance then return false end
    end
  end
  for index=1,4 do meadowTopPositions[index]={values[index*2-1]/1000,values[index*2]/1000} end
  return true
end
readMeadowTopLayout(player:GetAttribute("MeadowTopButtonsLayout"))
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
  button.Active=true;button.Interactable=true -- [모바일 입력] 실제 버튼만 터치를 처리한다.
  local corner=Instance.new("UICorner")
  corner.CornerRadius=UDim.new(1,0);corner.Parent=button
  local border=Instance.new("UIStroke")
  border.Name="GoldSkillRim"
  border.Color=color
  border.Thickness=3.2;border.Transparency=.02;border.Parent=button
  -- [광택 금속 이중 링] 이미지가 아니라 실제 버튼 형태의 테두리만 강화한다.
  local inner=Instance.new("Frame")
  inner.Name="PolishedInnerRing"
  inner.AnchorPoint=Vector2.new(.5,.5)
  inner.Position=UDim2.fromScale(.5,.5)
  inner.Size=UDim2.fromScale(.89,.89)
  inner.BackgroundTransparency=1
  inner.ZIndex=15
  inner.Parent=button
  local innerCorner=Instance.new("UICorner")
  innerCorner.CornerRadius=UDim.new(1,0);innerCorner.Parent=inner
  local innerStroke=Instance.new("UIStroke")
  innerStroke.Color=Color3.fromRGB(255,235,202)
  innerStroke.Thickness=1.4
  innerStroke.Transparency=.41
  innerStroke.Parent=inner
  local gradient=Instance.new("UIGradient")
  gradient.Rotation=110
  gradient.Color=ColorSequence.new({
    ColorSequenceKeypoint.new(0,color:Lerp(Color3.fromRGB(255,218,165),.22)),
    ColorSequenceKeypoint.new(.32,color:Lerp(Color3.fromRGB(21,32,38),.65)),
    ColorSequenceKeypoint.new(1,Color3.fromRGB(6,14,23))
  })
  gradient.Parent=button
end
-- [오른쪽 전용 그림 아이콘] 연타·회피·막기·상호작용·질주는 승인된 전용 그림으로 교체한다.
-- 물약과 가방은 현재 등록된 개별 CC0 이미지를 그대로 사용하고, 서버 액션 바인딩은 유지한다.
local function applyMeadowRightActionImage(button,role)
  local imageId=meadowRealActionIcons[role]
  if not imageId then return false end
  local icon=Instance.new("ImageLabel")
  icon.Name="OriginalRightActionIcon"
  icon.BackgroundTransparency=1
  icon.Image=imageId
  icon.ScaleType=Enum.ScaleType.Fit
  icon.AnchorPoint=Vector2.new(.5,.5)
  icon.Position=UDim2.fromScale(.5,.45)
  icon.Size=UDim2.fromScale(.76,.76)
  icon.ZIndex=20
  icon.Active=false;icon.Interactable=false
  icon.Parent=button
  return true
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
    icon.Position=UDim2.fromScale(.5,.07)
    icon.Size=UDim2.fromScale(.78,.73)
    icon.ScaleType=Enum.ScaleType.Fit
    icon.ZIndex=16
    icon.ImageColor3=index==2 and Color3.fromRGB(255,225,188) or Color3.fromRGB(213,235,255)
    icon.Parent=button
    -- 어퍼컷은 CC0 장갑 원본, 막기는 CC0 방패 원본을 사용한다.
  end
  -- 전투 3종은 전용 아틀라스, 회복은 기존 붉은 물약 이미지를 사용한다.
  applyMeadowRightActionImage(button,skill[5])
  local nameplate=Instance.new("TextLabel")
  nameplate.Name="SkillNameplate"..index
  nameplate.BackgroundColor3=Color3.fromRGB(18,17,15)
  nameplate.BackgroundTransparency=.11
  nameplate.BorderSizePixel=0
  nameplate.Text=skill[2]
  nameplate.TextColor3=Color3.fromRGB(255,237,188)
  nameplate.TextStrokeColor3=Color3.fromRGB(15,11,8)
  nameplate.TextStrokeTransparency=.55
  nameplate.Font=Enum.Font.GothamBold
  nameplate.TextSize=13;nameplate.ZIndex=17
  nameplate.Active=false;nameplate.Interactable=false
  nameplate.Visible=true
  nameplate.Parent=meadowSkillDock
  local plateCorner=Instance.new("UICorner")
  plateCorner.CornerRadius=UDim.new(1,0);plateCorner.Parent=nameplate
  local plateStroke=Instance.new("UIStroke")
  plateStroke.Color=skill[3]
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
  cooldown.ZIndex=22;cooldown.Active=false;cooldown.Interactable=false -- 스킬 표시가 터치를 가리지 않는다.
  cooldown.Parent=button
  local cooldownCorner=Instance.new("UICorner")
  cooldownCorner.CornerRadius=UDim.new(1,0)
  cooldownCorner.Parent=cooldown
  meadowSkillButtons[index]=button
  meadowSkillCooldowns[index]=cooldown
  local skillActionId=skill[1] -- [오른쪽 터치] 각 버튼의 서버 기술 ID를 자기 입력에 고정한다.
  button.Activated:Connect(function()
    if gui:GetAttribute("GameMenuOpen")==true then return end
    activateMeadowAction(skillActionId)
  end)
end
-- 기본 공격은 기존 화면 터치/키보드로 계속 사용하고 별도 공격 버튼은 제거한다.
-- [오른쪽 보조 버튼] 기존 회피·질주·채집과 인벤토리 탭을 시안의 4개 원형 버튼에 연결.
local meadowUtilityActions={
  {"scope-coreloop-1-6ebe58f496","상호작용",Color3.fromRGB(216,216,200),"",nil,nil,"interact"},
  {"skill-meadow-sprint","질주",Color3.fromRGB(58,173,230),"",nil,nil,"sprint"},
  {"MEADOW_INVENTORY","가방",Color3.fromRGB(219,184,124),"",nil,nil,"bag"},
}
local meadowSprintAuto=false
local meadowUtilityButtons={}
for index,info in ipairs(meadowUtilityActions)do
  local button=Instance.new("TextButton")
  button.Name="MeadowUtility"..index
  button.Text=info[4]
  button.TextSize=25
  button.TextYAlignment=Enum.TextYAlignment.Top
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
  applyMeadowRightActionImage(button,info[7])
  -- [이름표] 작은 하단 버튼에서도 조작 종류가 읽히도록 버튼 안에 표기.
  local label=Instance.new("TextLabel")
  label.Name="UtilityCaption"
  label.AnchorPoint=Vector2.new(.5,1)
  label.Position=UDim2.fromScale(.5,.96)
  label.Size=UDim2.new(1,-2,0,13)
  label.BackgroundTransparency=1
  label.Text=info[2]
  label.Visible=true
  label.TextColor3=Color3.fromRGB(255,245,222)
  label.TextStrokeColor3=Color3.fromRGB(5,8,13)
  label.TextStrokeTransparency=.25
  label.Font=Enum.Font.GothamBold
  label.TextScaled=true
  label.ZIndex=23
  label.Active=false;label.Interactable=false
  label.Parent=button
  button.Activated:Connect(function()
    if gui:GetAttribute("GameMenuOpen")==true then return end
    if info[1]=="MEADOW_INVENTORY" then meadowMenu.open(2)
    elseif info[1]=="skill-meadow-sprint" then meadowSprintAuto=not meadowSprintAuto
    elseif not activateNearbyMeadowInteraction(nil) then activateMeadowAction(info[1]) end
  end)
  meadowUtilityButtons[index]=button
end
-- [오른쪽 터치 UI] 아래 3개는 고정. 상단 4개만 저장된 사용자 위치를 사용한다.
local function layoutMeadowCombatUi()
  local v=gui.AbsoluteSize
  if v.X<=0 or v.Y<=0 then return end
  local landscape=v.X>v.Y
  -- [좁은 가로 화면] 미니맵 충돌 보정은 기존 도크 기준으로 계산한다.
  -- [오른쪽 버튼 전체] 보정 후 도크를 실제로 위로 올려, 기존 보정이 이동량을 상쇄하지 않게 한다.
  local scale=landscape and math.clamp((v.Y-20)/370,.76,1.12) or math.clamp(v.X/390,.76,1)
  local dockLift=math.floor(40*scale)
  local dockHeight=math.floor(260*scale)
  local utilityTop=140 -- [보조 버튼] 상호작용·질주·가방 3개를 같은 가로선에서 위로 이동한다.
  local bottomInset=math.floor((landscape and (v.Y<350 and 12 or 14) or 116)*scale)
  local compactLandscape=landscape and v.Y<450
  local mapDiameter=compactLandscape and (v.Y<350 and 80 or 88) or v.X<480 and 96 or math.floor(math.clamp(v.Y*.17,98,124))
  local dodgeTop=v.Y-bottomInset-dockHeight+math.floor((260*meadowTopPositions[2][2]-37)*scale)
  local radarTop=landscape and 12 or 38 -- 중앙 체력바 상단과 같은 높이.
  local mapBottom=radarTop+mapDiameter+40
  local utilityBottom=v.Y-bottomInset-dockHeight+math.floor(utilityTop*scale)+math.max(44,math.floor(45*scale))
  local availableShift=math.max(0,v.Y-8-utilityBottom)
  local shift=compactLandscape and math.min(availableShift,math.max(0,mapBottom+8-dodgeTop)) or 0
  meadowSkillDock.Size=UDim2.fromOffset(math.floor(235*scale),dockHeight)
  meadowSkillDock.Position=UDim2.new(1,-math.floor(2*scale),1,-bottomInset-dockLift+math.floor(shift))
  for index,button in ipairs(meadowSkillButtons) do
    local p=meadowTopPositions[index]
    local originalSize=index==4 and 46 or 74
    local size=math.floor(originalSize*scale)
    local cx,cy=235*p[1],260*p[2]
    button.Size=UDim2.fromOffset(size,size)
    button.Position=UDim2.fromOffset(math.floor((cx-originalSize/2)*scale),math.floor((cy-originalSize/2)*scale))
    local nameplate=meadowSkillNameplates[index]
    nameplate.Size=UDim2.fromOffset(math.floor((originalSize+3)*scale),math.floor(19*scale))
    nameplate.Position=UDim2.fromOffset(math.floor((cx-(originalSize+3)/2)*scale),
      math.floor((cy+originalSize/2-12)*scale))
    nameplate.TextSize=math.max(9,math.floor(12*scale))
  end
  -- [보조 버튼] 위치는 위로만 이동하고 크기·순서·터치 기능은 그대로 유지한다.
  for index,button in ipairs(meadowUtilityButtons) do
    local size=math.max(44,math.floor(45*scale)) -- [터치 크기] 작은 가로 화면에서도 버튼 최소 크기를 유지한다.
    button.Size=UDim2.fromOffset(size,size)
    button.Position=UDim2.fromOffset(math.floor((50+(index-1)*66-22.5)*scale),
      math.floor(utilityTop*scale))
    button.TextSize=math.max(15,math.floor(22*scale))
  end
  -- Roblox 기본 점프 아이콘만 제거한다.
  if UserInputService.TouchEnabled then
    local touchGui=player.PlayerGui:FindFirstChild("TouchGui")
    local jump=touchGui and touchGui:FindFirstChild("JumpButton",true)
    if jump and jump:IsA("GuiButton") then
      jump.Visible=false
      jump.Active=false
      if jump:GetAttribute("MeadowJumpHidden")~=true then
        jump:SetAttribute("MeadowJumpHidden",true)
        jump:GetPropertyChangedSignal("Visible"):Connect(function()
          if jump.Visible then jump.Visible=false end
        end)
      end
    end
  end
end
gui:GetPropertyChangedSignal("AbsoluteSize"):Connect(layoutMeadowCombatUi)
-- 기본 모바일 JumpButton은 늦게 생기거나 리스폰 시 재생성되므로 해당 버튼만 숨긴다.
player.PlayerGui.DescendantAdded:Connect(function(descendant)
  if UserInputService.TouchEnabled and descendant.Name=="JumpButton" and descendant:IsA("GuiButton") then
    task.defer(layoutMeadowCombatUi)
  end
end)
layoutMeadowCombatUi()
-- [옵션] 상단 4개 버튼만 터치/마우스로 개별 이동한다. 하단 3개는 고정.
local editLayoutButton=CommonUI.CreatePrimaryButton({
  name="MeadowEditActionLayout",text="상단 4개 버튼 위치 변경",minHeight=52
})
editLayoutButton.LayoutOrder=4
editLayoutButton.Size=UDim2.new(1,-8,0,52)
editLayoutButton.Parent=meadowPages[4]
local editLayoutPreview=Instance.new("Frame")
editLayoutPreview.Name="MeadowTopActionPreview"
editLayoutPreview.LayoutOrder=5
editLayoutPreview.Size=UDim2.new(1,-8,0,220)
editLayoutPreview.BackgroundColor3=Color3.fromRGB(24,36,34)
editLayoutPreview.BorderSizePixel=0
editLayoutPreview.Visible=false
editLayoutPreview.Parent=meadowPages[4]
local previewCorner=Instance.new("UICorner")
previewCorner.CornerRadius=UDim.new(0,12)
previewCorner.Parent=editLayoutPreview
local previewHint=Instance.new("TextLabel")
previewHint.Name="EditorInstructions"
previewHint.BackgroundTransparency=1
previewHint.Size=UDim2.new(1,-12,0,28)
previewHint.Position=UDim2.fromOffset(6,3)
previewHint.Font=Enum.Font.Gotham
previewHint.TextColor3=Color3.fromRGB(228,237,219)
previewHint.TextSize=12
previewHint.Text="네 버튼을 누른 채 이동 · 아래 3개는 고정"
previewHint.Parent=editLayoutPreview
local previewCanvas=Instance.new("Frame")
previewCanvas.Name="EditableTopFour"
previewCanvas.BackgroundTransparency=1
previewCanvas.Position=UDim2.new(0,6,0,33)
previewCanvas.Size=UDim2.new(1,-12,1,-39)
previewCanvas.Parent=editLayoutPreview
local previewHandles={}
local function refreshTopEditor()
  for index,button in ipairs(previewHandles) do
    local p=meadowTopPositions[index]
    button.Position=UDim2.fromScale(p[1],p[2]/.66)
  end
  layoutMeadowCombatUi()
  if alignMeadowRadar then alignMeadowRadar() end
end
local activeDrag=nil
local dragInput=nil
for index,skill in ipairs(meleeSkills) do
  local handle=Instance.new("TextButton")
  handle.Name="EditableButton"..index
  handle.AnchorPoint=Vector2.new(.5,.5)
  handle.Size=UDim2.fromOffset(index==4 and 47 or 60,index==4 and 47 or 60)
  handle.BackgroundColor3=Color3.fromRGB(32,46,47)
  handle.Text=skill[2]
  handle.Font=Enum.Font.GothamBold
  handle.TextSize=12
  handle.TextColor3=Color3.fromRGB(247,246,231)
  handle.ZIndex=6
  handle.Parent=previewCanvas
  local corner=Instance.new("UICorner")
  corner.CornerRadius=UDim.new(1,0)
  corner.Parent=handle
  local border=Instance.new("UIStroke")
  border.Color=skill[3]
  border.Thickness=2
  border.Parent=handle
  previewHandles[index]=handle
  handle.InputBegan:Connect(function(input)
    if not editLayoutPreview.Visible then return end
    if input.UserInputType~=Enum.UserInputType.Touch
      and input.UserInputType~=Enum.UserInputType.MouseButton1 then return end
    activeDrag=index
    dragInput=input
    meadowPages[4].ScrollingEnabled=false
  end)
end
UserInputService.InputChanged:Connect(function(input)
  if not activeDrag or not editLayoutPreview.Visible then return end
  if dragInput.UserInputType==Enum.UserInputType.Touch and input~=dragInput then return end
  if dragInput.UserInputType==Enum.UserInputType.MouseButton1
    and input.UserInputType~=Enum.UserInputType.MouseMovement then return end
  local canvasSize=previewCanvas.AbsoluteSize
  if canvasSize.X<=0 or canvasSize.Y<=0 then return end
  local p=meadowTopPositions[activeDrag]
  local x=math.clamp((input.Position.X-previewCanvas.AbsolutePosition.X)/canvasSize.X,.12,.88)
  local y=math.clamp((input.Position.Y-previewCanvas.AbsolutePosition.Y)/canvasSize.Y*.66,.10,.55)
  -- [이동 편집] 실제 오른쪽 버튼 크기까지 고려해서 원래 다른 기술을 덮는 이동을 차단한다.
  local free=true
  for index,other in ipairs(meadowTopPositions) do
    if index~=activeDrag then
      local dx=(x-other[1])*235
      local dy=(y-other[2])*260
      local minDistance=(activeDrag==4 and 23 or 37)+(index==4 and 23 or 37)+8
      if dx*dx+dy*dy<minDistance*minDistance then free=false;break end
    end
  end
  if free then p[1],p[2]=x,y;refreshTopEditor() end
end)
UserInputService.InputEnded:Connect(function(input)
  if not activeDrag then return end
  if dragInput.UserInputType==Enum.UserInputType.Touch and input~=dragInput then return end
  if dragInput.UserInputType==Enum.UserInputType.MouseButton1
    and input.UserInputType~=Enum.UserInputType.MouseButton1 then return end
  activeDrag=nil
  dragInput=nil
  meadowPages[4].ScrollingEnabled=true
end)
local saveLayoutButton=CommonUI.CreatePrimaryButton({
  name="MeadowSaveActionLayout",text="버튼 배치 저장",minHeight=48
})
saveLayoutButton.LayoutOrder=6
saveLayoutButton.Size=UDim2.new(1,-8,0,48)
saveLayoutButton.Parent=meadowPages[4]
saveLayoutButton.Visible=false
local resetLayoutButton=CommonUI.CreatePrimaryButton({
  name="MeadowResetActionLayout",text="기본 배치로 되돌리기",minHeight=48
})
resetLayoutButton.LayoutOrder=7
resetLayoutButton.Size=UDim2.new(1,-8,0,48)
resetLayoutButton.Parent=meadowPages[4]
resetLayoutButton.Visible=false
editLayoutButton.Activated:Connect(function()
  local show=not editLayoutPreview.Visible
  editLayoutPreview.Visible=show
  saveLayoutButton.Visible=show
  resetLayoutButton.Visible=show
  editLayoutButton.Text=show and "버튼 위치 편집 닫기" or "상단 4개 버튼 위치 변경"
  if show then refreshTopEditor() end
end)
saveLayoutButton.Activated:Connect(function()
  if player:GetAttribute("ProfileReady")~=true then
    saveLayoutButton.Text="저장 정보 연결 중"
    return
  end
  local values={}
  for _,p in ipairs(meadowTopPositions) do
    values[#values+1]=tostring(math.floor(p[1]*1000+.5))
    values[#values+1]=tostring(math.floor(p[2]*1000+.5))
  end
  remote:FireServer("meadow:ui-layout:"..table.concat(values,","))
  saveLayoutButton.Text="배치 저장 요청 완료"
end)
resetLayoutButton.Activated:Connect(function()
  for index,p in ipairs(meadowTopDefaults) do meadowTopPositions[index]={p[1],p[2]} end
  refreshTopEditor()
  saveLayoutButton.Text="기본 위치 적용 · 저장을 눌러 확정"
end)
player:GetAttributeChangedSignal("MeadowTopButtonsLayout"):Connect(function()
  if readMeadowTopLayout(player:GetAttribute("MeadowTopButtonsLayout")) then
    refreshTopEditor()
    saveLayoutButton.Text="버튼 배치 저장 완료"
  end
end)
gui:GetAttributeChangedSignal("GameMenuOpen"):Connect(function()
  meadowSkillDock.Visible=gui:GetAttribute("GameMenuOpen")~=true
end)
-- [미니맵] 실제 플레이어 좌표와 발견한 숲 지점만 표시한다.
-- 체력바와 같은 전체 화면 좌표계를 사용해 Roblox 기본 상단 UI 여백으로 인한 아래 밀림을 없앤다.
local meadowRadar=Instance.new("Frame")
meadowRadar.Name="MeadowExplorerRadar"
meadowRadar.AnchorPoint=Vector2.new(1,0)
meadowRadar.Size=UDim2.fromOffset(128,151)
meadowRadar.BackgroundColor3=Color3.fromRGB(13,30,28)
meadowRadar.BackgroundTransparency=1
meadowRadar.BorderSizePixel=0
meadowRadar.ZIndex=8
meadowRadar.Parent=meadowVitalsGui
local radarCorner=Instance.new("UICorner")
radarCorner.CornerRadius=UDim.new(0,13)
radarCorner.Parent=meadowRadar
local radarStroke=Instance.new("UIStroke")
radarStroke.Color=Color3.fromRGB(220,176,91)
radarStroke.Thickness=2.5
radarStroke.Transparency=1
radarStroke.Parent=meadowRadar
local radarTitle=Instance.new("TextLabel")
radarTitle.Name="Area"
radarTitle.Position=UDim2.fromOffset(5,116)
radarTitle.Size=UDim2.new(1,-10,0,24)
radarTitle.BackgroundColor3=Color3.fromRGB(27,30,28)
radarTitle.BackgroundTransparency=.06
radarTitle.Text="초원지역"
radarTitle.TextColor3=Color3.fromRGB(251,231,186)
radarTitle.TextSize=10
radarTitle.Font=Enum.Font.Gotham
radarTitle.ZIndex=9
radarTitle.Parent=meadowRadar
local radarTitleCorner=Instance.new("UICorner")
radarTitleCorner.CornerRadius=UDim.new(1,0);radarTitleCorner.Parent=radarTitle
local radarTitleStroke=Instance.new("UIStroke")
radarTitleStroke.Color=Color3.fromRGB(216,174,102)
radarTitleStroke.Thickness=1.3;radarTitleStroke.Transparency=1;radarTitleStroke.Parent=radarTitle
local radarField=Instance.new("Frame")
radarField.Name="NearbyPlayers"
radarField.Position=UDim2.fromOffset(9,5)
radarField.Size=UDim2.fromOffset(110,110)
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
radarFieldStroke.Color=Color3.fromRGB(221,184,110)
radarFieldStroke.Thickness=3
radarFieldStroke.Transparency=.06
radarFieldStroke.Parent=radarField
-- 실제 서버의 흙길과 유적, 근처 몬스터만 지도에 표시한다.
local radarTrails={}
for route=1,36 do
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
-- [초원 전체 탐험 지도] 서버의 오솔길과 외곽 길 36개를 동일 좌표로 표시한다.
-- 기존 8개 마을/숲 길 + 누락된 4개 숲 분기 + 네 모서리 연결 24개.
local radarTrailEndpoints={
  {-51,-48,-177,-176},
  {58,-49,183,-177},
  {-54,62,-184,188},
  {56,63,192,196},
  {-177,-176,-228,-219},
  {183,-177,231,-228},
  {-184,188,-234,233},
  {192,196,236,238}, -- 기존 표시 구간
  {-132,-126,-231,-93},
  {128,-128,226,-91},
  {-126,139,-220,211},
  {134,139,219,215}, -- 기존 숲 분기
  {-228,-219,-315,-193},
  {-233,-193,-315,-193},
  {-315,-193,-319,-94},
  {-315,-193,-319,-308},
  {-319,-308,-240,-315},
  {231,-228,316,-195},
  {235,-195,316,-195},
  {316,-195,319,-94},
  {316,-195,319,-308},
  {319,-308,241,-316},
  {-234,233,-309,308},
  {236,238,309,308},
  {-309,308,-155,316},
  {-155,316,0,317},
  {0,317,155,316},
  {155,316,309,308},
  {-309,308,-315,204},
  {-315,204,-315,100},
  {-315,100,-319,-3},
  {-319,-3,-319,-94},
  {309,308,315,204},
  {315,204,315,100},
  {315,100,319,-3},
  {319,-3,319,-94},
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
-- [나침반] S 표시를 미니맵 원의 정중앙 하단에 고정한다.
local south=Instance.new("TextLabel")
south.Name="South"
south.AnchorPoint=Vector2.new(.5,1)
south.Position=UDim2.new(.5,0,1,-2)
south.Size=UDim2.fromOffset(16,16)
south.BackgroundTransparency=1
south.Text="S"
south.TextColor3=Color3.fromRGB(242,216,154)
south.TextSize=12
south.Font=Enum.Font.GothamBold
south.ZIndex=11
south.Parent=radarField
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
  -- 기존 발견 지점 4곳 + 같은 저장 비트를 공유하는 맵 네 모서리 조사 지점.
  {-258,-206,1},{261,-219,2},{-270,220,4},{258,240,8},
  {-318,-312,1},{318,-313,2},{-318,313,4},{317,312,8},
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
radarCoordinates.Position=UDim2.fromOffset(7,138)
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
-- [마을·의뢰 지도] 기존 미니맵에 실제 마을 중심 및 현재 계약 조사 좌표만 표시.
local radarVillage=Instance.new("TextLabel")
radarVillage.Name="MeadowVillageMarker"
radarVillage.BackgroundTransparency=1
radarVillage.AnchorPoint=Vector2.new(.5,.5)
radarVillage.Size=UDim2.fromOffset(23,23)
radarVillage.Text="⌂"
radarVillage.TextSize=21
radarVillage.TextColor3=Color3.fromRGB(252,221,145)
radarVillage.TextStrokeTransparency=.3
radarVillage.ZIndex=12
radarVillage.Visible=false
radarVillage.Parent=radarField
-- [주민 길찾기] 기존 네 명의 실제 R15 NPC 위치를 미니맵에 표시한다.
-- 추가 NPC/저장 필드 없이 기존 마을 배치와 움직이는 주민의 현재 위치만 읽는다.
local radarVillagers={}
for _,entry in ipairs({
  {"Elder","촌"},{"Herbalist","약"},{"Tracker","추"},{"Guard","경"},
}) do
  local marker=Instance.new("TextLabel")
  marker.Name="MeadowResidentMarker"..entry[1]
  marker.BackgroundTransparency=1
  marker.AnchorPoint=Vector2.new(.5,.5)
  marker.Size=UDim2.fromOffset(16,16)
  marker.Text=entry[2]
  marker.TextSize=12
  marker.Font=Enum.Font.GothamBold
  marker.TextColor3=Color3.fromRGB(255,237,186)
  marker.TextStrokeTransparency=.27
  marker.ZIndex=12
  marker.Visible=false
  marker.Parent=radarField
  radarVillagers[#radarVillagers+1]={id=entry[1],view=marker}
end
local radarContractSites={}
for index=1,2 do
  local marker=Instance.new("TextLabel")
  marker.Name=index==1 and "VillageClueMarker1" or "VillageCombatMarker"
  marker.BackgroundTransparency=1
  marker.AnchorPoint=Vector2.new(.5,.5)
  marker.Size=UDim2.fromOffset(19,19)
  marker.Text=index==1 and "?" or "⚔"
  marker.TextSize=19
  marker.Font=Enum.Font.GothamBold
  marker.TextColor3=Color3.fromRGB(247,207,125)
  marker.TextStrokeTransparency=.35
  marker.ZIndex=12
  marker.Visible=false
  marker.Parent=radarField
  radarContractSites[index]=marker
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
  -- [현재 위치 이름] 실제 생성된 마을·유적과 기존 숲 좌표에만 대응한다.
  -- 실물이 없는 던전은 지어내지 않고 기본 초원지역으로 표시한다.
  local areaName="초원지역"
  if world then
    local x,z=mainRoot.Position.X,mainRoot.Position.Z
    if (world:GetAttribute("MeadowVillageNPCCount") or 0)>0
      and x>=-280 and x<=280 and z>=-351 and z<=-42 then
      areaName=z<-250 and "초원 마을 · 농경지"
        or math.abs(x)>155 and "초원 마을 · 외곽 길목" or "초원 마을"
    else
      for index,site in ipairs(radarRuinSites) do
        local dx,dz=x-site[1],z-site[2]
        if world:FindFirstChild("Meadow_Ruin_"..index) and dx*dx+dz*dz<48*48 then
          areaName="오래된 유적"
          break
        end
      end
      if areaName=="초원지역" then
        -- [구역별 위치 안내] 네 모서리·북쪽 능선·외곽 늑대 길목을 실제 좌표로 식별.
        if x<=-275 and z<=-245 then areaName="북서 숲 외곽"
        elseif x>=275 and z<=-245 then areaName="북동 숲 외곽"
        elseif x<=-275 and z>=245 then areaName="남서 깊은 숲"
        elseif x>=275 and z>=245 then areaName="남동 깊은 숲"
        elseif z>=280 then areaName="남쪽 숲 능선"
        elseif x<=-280 and z<0 then areaName="서쪽 늑대 숲길"
        elseif x>=280 and z<0 then areaName="동쪽 물길 외곽"
        else
          for _,site in ipairs(grovePoints) do
            local dx,dz=x-site[1],z-site[2]
            if dx*dx+dz*dz<78*78 then
              areaName="숲 가장자리"
              break
            end
          end
        end
      end
    end
  end
  radarTitle.Text=areaName
  local trailsReady=world and (world:GetAttribute("MeadowNativeTrails") or 0)>=36
  local mapSize=radarField.AbsoluteSize
  local radarSpan=270 -- 플레이어 주위 실제 135스터드 반경
  local radarHalf=radarSpan*.5
  local villageDx=0-mainRoot.Position.X
  local villageDz=-111-mainRoot.Position.Z
  radarVillage.Visible=world~=nil and (world:GetAttribute("MeadowVillageNPCCount") or 0)>0
    and villageDx*villageDx+villageDz*villageDz<radarHalf*radarHalf
  if radarVillage.Visible then
    radarVillage.Position=UDim2.fromScale(.5+villageDx/radarSpan,.5+villageDz/radarSpan)
  end
  -- [NPC 위치] 실제 현재 위치를 따라가므로 길목 순찰 중에도 위치를 잘못 안내하지 않는다.
  for _,row in ipairs(radarVillagers) do
    local npc=world and world:FindFirstChild("Meadow_Villager_"..row.id)
    local npcPosition=npc and npc:GetPivot().Position
    local dx=npcPosition and npcPosition.X-mainRoot.Position.X or math.huge
    local dz=npcPosition and npcPosition.Z-mainRoot.Position.Z or math.huge
    row.view.Visible=npcPosition~=nil and dx*dx+dz*dz<radarHalf*radarHalf
    if row.view.Visible then
      row.view.Position=UDim2.fromScale(.5+dx/radarSpan,.5+dz/radarSpan)
    end
  end
  local activeContract=Config.VillageContracts[player:GetAttribute("VillageContractIndex") or 1]
  local contractEvidence=player:GetAttribute("VillageContractEvidence") or 0
  for index,marker in ipairs(radarContractSites) do
    local site=activeContract and (index==1 and activeContract.Sites[1] or activeContract.EnemySite)
    local dx=site and site[1]-mainRoot.Position.X or math.huge
    local dz=site and site[2]-mainRoot.Position.Z or math.huge
    local requiredBit=index==1 and 8 or 64
    marker.Visible=site~=nil
      and (player:GetAttribute("VillageContractPhase") or 0)==1
      and bit32.band(contractEvidence,requiredBit)==0
      and dx*dx+dz*dz<radarHalf*radarHalf
    if marker.Visible then marker.Position=UDim2.fromScale(.5+dx/radarSpan,.5+dz/radarSpan) end
  end
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
  -- [미니맵 정렬] 추정 좌표 대신 회피 버튼과 체력바의 실제 화면 좌표로 맞춘다.
  -- ScreenGui 안전영역이 다른 두 HUD를 연결할 때는 부모의 실제 좌표만 빼서 보정한다.
  local mapDiameter=compactLandscape and (v.Y<350 and 80 or 88) or small and 96 or math.floor(math.clamp(v.Y*.17,98,124))
  local dodgeButton=meadowSkillButtons[2]
  local dodgeSize=dodgeButton.AbsoluteSize
  if dodgeSize.X<=0 or dodgeSize.Y<=0 then return end
  local radarOrigin=meadowVitalsGui.AbsolutePosition
  local dodgeCenter=dodgeButton.AbsolutePosition.X+dodgeSize.X*.5
  local healthTop=meadowHealthTrack.AbsolutePosition.Y
  local mapWidth=mapDiameter+14
  meadowRadar.Size=UDim2.fromOffset(mapWidth,mapDiameter+40)
  meadowRadar.AnchorPoint=Vector2.new(.5,0)
  meadowRadar.Position=UDim2.fromOffset(
    math.floor(dodgeCenter-radarOrigin.X+.5),
    math.floor(healthTop-radarOrigin.Y+.5)
  )
  radarField.AnchorPoint=Vector2.new(.5,0)
  radarField.Position=UDim2.new(.5,0,0,1)
  radarField.Size=UDim2.fromOffset(mapDiameter,mapDiameter)
  radarTitle.Position=UDim2.fromOffset(3,mapDiameter+7)
  radarTitle.Size=UDim2.new(1,-6,0,18)
  radarTitle.TextSize=10
  radarCoordinates.Position=UDim2.fromOffset(3,mapDiameter+25)
  radarCoordinates.Size=UDim2.new(1,-6,0,13)
  radarCoordinates.TextSize=9
  meadowRadar.Visible=gui:GetAttribute("GameMenuOpen")~=true
end
gui:GetPropertyChangedSignal("AbsoluteSize"):Connect(layoutMeadowRadar)
meadowVitalsGui:GetPropertyChangedSignal("AbsoluteSize"):Connect(layoutMeadowRadar)
meadowVitalsGui:GetPropertyChangedSignal("AbsolutePosition"):Connect(layoutMeadowRadar)
meadowHealthTrack:GetPropertyChangedSignal("AbsolutePosition"):Connect(layoutMeadowRadar)
meadowSkillButtons[2]:GetPropertyChangedSignal("AbsolutePosition"):Connect(layoutMeadowRadar)
meadowSkillButtons[2]:GetPropertyChangedSignal("AbsoluteSize"):Connect(layoutMeadowRadar)
gui:GetAttributeChangedSignal("GameMenuOpen"):Connect(layoutMeadowRadar)
alignMeadowRadar=layoutMeadowRadar
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
    local cost=0 -- 위치 재배치는 기존 기술의 서버 스테미너·쿨다운을 바꾸지 않는다.
    -- [기술 터치] 재사용 대기 중에도 버튼 입력을 막지 않고 서버에서 쿨다운을 검증한다.
    -- 비활성화된 GUI 버튼이 터치 자체를 삼켜 기술이 고장 난 것처럼 보이던 문제를 제거한다.
    button.Active=true -- [터치] 서버에서 프로필·스테미너·쿨다운을 검증한다.
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
    button.Active=true -- [터치] 가방·상호작용·질주의 입력 차단 금지.
    button.Text=info[4]
    button.TextTransparency=button.Active and 0 or .3
    if info[1]=="skill-meadow-sprint" then
      local caption=button:FindFirstChild("UtilityCaption")
      if caption then caption.Text=meadowSprintAuto and "질주 ON" or "질주 OFF" end
      if meadowSprintAuto and ready and remains<=.05 then
        local character=player.Character
        local human=character and character:FindFirstChildOfClass("Humanoid")
        if human and human.Health>0 and human.MoveDirection.Magnitude>.1 then
          activateMeadowAction(info[1]) -- 기존 8초 재사용 대기·3초 효과를 그대로 사용한다.
        end
      end
    end
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
local worldPrompts=workspace:FindFirstChild("FantasySurvivalWorld")
if worldPrompts then
  -- 최초 접속 때 이미 생성된 대화 프롬프트와 나중에 스트리밍되는 프롬프트를 모두 추적한다.
  for _,descendant in ipairs(worldPrompts:GetDescendants()) do
    if descendant:IsA("ProximityPrompt") and descendant.Name=="MeadowVillageInteraction" then
      shownMeadowPrompts[descendant]=true
    end
  end
  worldPrompts.DescendantAdded:Connect(function(descendant)
    if descendant:IsA("ProximityPrompt") and descendant.Name=="MeadowVillageInteraction" then
      shownMeadowPrompts[descendant]=true
    end
  end)
end
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
-- [검 3단계] 실제 연속 입력별 포즈 순서만 추적한다. 공격력·서버 판정·저장값과 무관하다.
local swordComboStage=0
local swordComboAt=0
local swordComboProfile=nil
local swordComboCharacter=nil
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
  -- [방어 이펙트] 승인된 방어만 청백색 팔 궤적·빛·대형 방어 파동을 재생한다.
  if actionId=="skill-meadow-guard" then
    local tweenService=game:GetService("TweenService")
    for _,side in ipairs({"Left","Right"}) do
      local arm=character:FindFirstChild(side.."LowerArm") or character:FindFirstChild(side.." Arm")
      local hand=character:FindFirstChild(side.."Hand") or arm
      if arm and arm:IsA("BasePart")
        and meadowCommonVFX and type(meadowCommonVFX.AttachShortTrail)=="function" then
        local ok,trail,controller=pcall(meadowCommonVFX.AttachShortTrail,arm,{
          lifetime=reducedEffects and .18 or .38,
          width=reducedEffects and .55 or 1,
          axis=Vector3.new(0,1,0),length=math.max(.9,arm.Size.Y*1.4),
          color=Color3.fromRGB(93,200,255),
        })
        if ok and trail and controller then
          trail.Name="MeadowGuardCrossSlash"..side
          task.delay(.85,function() pcall(controller.Destroy) end)
        end
      end
      if hand and hand:IsA("BasePart") then
        local glow=Instance.new("PointLight")
        glow.Name="MeadowGuardFistGlow"..side
        glow.Color=Color3.fromRGB(100,215,255)
        glow.Range=reducedEffects and 4 or 8
        glow.Brightness=reducedEffects and .65 or 3
        glow.Shadows=false;glow.Parent=hand
        task.delay(.5,function()
          if glow.Parent then
            tweenService:Create(glow,TweenInfo.new(.35),{
              Brightness=reducedEffects and .35 or 1.1,
            }):Play()
          end
        end)
        task.delay(2.43,function()
          if glow.Parent then tweenService:Create(glow,TweenInfo.new(.3),{Brightness=0}):Play() end
        end)
        debris:AddItem(glow,2.8)
      end
    end
    -- [푸른 에너지 실루엣] 기존 캐릭터만 강조하며 별도 방패 모델은 생성하지 않는다.
    local aura=Instance.new("Highlight")
    aura.Name="MeadowGuardBodyAura"
    aura.Adornee=character
    aura.DepthMode=Enum.HighlightDepthMode.Occluded
    aura.FillColor=Color3.fromRGB(80,181,255)
    aura.FillTransparency=reducedEffects and .92 or .76
    aura.OutlineColor=Color3.fromRGB(201,244,255)
    aura.OutlineTransparency=reducedEffects and .4 or .06
    aura.Parent=character
    task.delay(.7,function()
      if aura.Parent then
        tweenService:Create(aura,TweenInfo.new(.4),{
          FillTransparency=.95,OutlineTransparency=.5,
        }):Play()
      end
    end)
    task.delay(2.45,function()
      if aura.Parent then
        tweenService:Create(aura,TweenInfo.new(.3),{
          FillTransparency=1,OutlineTransparency=1,
        }):Play()
      end
    end)
    debris:AddItem(aura,2.8)
    -- [2연속 파동] 방어 자세가 완성되는 순간과 바로 뒤 잔광을 공용 에셋으로 출력.
    if meadowCommonVFX and type(meadowCommonVFX.Create)=="function"
      and hasStudioAssetAtom("VFX","IMPACT_FLASH") then
      for index,delaySec in ipairs({.20,.53}) do
        task.delay(delaySec,function()
          if not rootPart.Parent or not character.Parent then return end
          local ok,err=pcall(meadowCommonVFX.Create,index==1 and "BLOCK_IMPACT" or "SHAPE_BURST",{
            parent=workspace,cframe=rootPart.CFrame*CFrame.new(0,1.55,-1.35),
            color=index==1 and Color3.fromRGB(233,252,255) or Color3.fromRGB(112,209,255),
            accent=index==1 and Color3.fromRGB(67,156,255) or Color3.fromRGB(246,240,180),
            duration=reducedEffects and .25 or .48,
            startDiameter=index==1 and 2 or 2.9,
            endDiameter=reducedEffects and 4 or (index==1 and 8.3 or 6.5),
            startSize=.7,endSize=reducedEffects and 1.4 or 3.3,
            count=reducedEffects and 3 or (index==1 and 12 or 9),
            reducedMotion=reducedEffects,
          })
          if not ok then warn("마력숲 방어 파동 오류: "..tostring(err)) end
        end)
      end
    end
    return
  end
  local isDodge=actionId=="skill-meadow-dodge-left" or actionId=="skill-meadow-dodge-right"
  local leadingSide=actionId=="skill-meadow-dodge-left" and "Left" or "Right"
  local hostPart=(isDodge and (
    character:FindFirstChild(leadingSide.."Foot")
    or character:FindFirstChild(leadingSide.."LowerLeg")
    or character:FindFirstChild(leadingSide.." Leg")))
    or character:FindFirstChild("RightHand") or rootPart
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
  -- [회피 바람] 1단·2단·3단의 팔·다리 궤적을 기존 공용 광선 텍스처로 강조한다.
  if isDodge then
    if meadowCommonVFX and type(meadowCommonVFX.AttachShortTrail)=="function" then
      for _,side in ipairs({"Left","Right"}) do
        for _,limb in ipairs({"LowerLeg","LowerArm"}) do
          local part=character:FindFirstChild(side..limb)
            or (limb=="LowerLeg" and character:FindFirstChild(side.." Leg"))
            or (limb=="LowerArm" and character:FindFirstChild(side.." Arm"))
          if part and part:IsA("BasePart") then
            local ok,trail,controller=pcall(meadowCommonVFX.AttachShortTrail,part,{
              lifetime=reducedEffects and .16 or .34,
              width=reducedEffects and .4 or .92,
              axis=limb=="LowerLeg" and Vector3.new(1,0,0) or Vector3.new(0,1,0),
              length=math.max(.65,part.Size.Y*1.1),
              color=side==leadingSide and Color3.fromRGB(82,204,255)
                or Color3.fromRGB(251,198,103),
            })
            if ok and trail and controller then
              trail.Name="MeadowDodgeCinemaTrail"..side..limb
              task.delay(1.17,function() pcall(controller.Destroy) end)
            end
          end
        end
      end
    end
    local aura=Instance.new("Highlight")
    aura.Name="MeadowDodgeSpinAura"
    aura.Adornee=character
    aura.DepthMode=Enum.HighlightDepthMode.Occluded
    aura.FillColor=Color3.fromRGB(96,181,255)
    aura.FillTransparency=reducedEffects and .94 or .84
    aura.OutlineColor=Color3.fromRGB(244,218,147)
    aura.OutlineTransparency=reducedEffects and .65 or .19
    aura.Parent=character
    debris:AddItem(aura,1.12)
    -- [1단 파랑/2단 황금/3단 착지 충격] 공용 회피 링과 파편 폭발을 단계별로 방출.
    if meadowCommonVFX and type(meadowCommonVFX.Create)=="function"
      and hasStudioAssetAtom("VFX","IMPACT_FLASH") then
      for index,delaySec in ipairs({.06,.36,.82}) do
        task.delay(delaySec,function()
          if not rootPart.Parent or not character.Parent then return end
          local color=index==2 and Color3.fromRGB(255,210,127) or Color3.fromRGB(117,214,255)
          local accent=index==2 and Color3.fromRGB(255,153,77) or Color3.fromRGB(239,249,255)
          local ok,err=pcall(meadowCommonVFX.Create,
            index==3 and "SHAPE_BURST" or "DODGE_EVASION_PULSE",{
              parent=workspace,cframe=rootPart.CFrame*CFrame.new(0,-1.55,0),
              duration=reducedEffects and .21 or .35,
              color=color,accent=accent,
              startDiameter=index==3 and 2.2 or 1.1,
              endDiameter=reducedEffects and 3.4 or (index==3 and 8.4 or 5.3),
              startSize=.42,endSize=reducedEffects and .9 or 2.1,
              count=reducedEffects and 2 or (index==3 and 11 or 7),
              reducedMotion=reducedEffects,
            })
          if not ok then warn("마력숲 회피 파동 오류: "..tostring(err)) end
        end)
      end
    end
  end
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
  swordComboStage=0
  swordComboAt=0
  swordComboProfile=nil
  swordComboCharacter=nil
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
  -- 기존 장검·철검 도구를 공용 SWORD 원본 모션에 연결한다. 도구 실물을 새로 만들지 않는다.
  if equipment=="장검" or equipment=="철검" then equipment="SWORD" end
  local profile = equipment == "UNARMED" and "UNARMED" or combatMotionSource.ResolveWeaponProfile(equipment)
  if not profile then
    character:SetAttribute("NativeCombatMotionState", "MATCHING_WEAPON_MOTION_REQUIRED")
    return
  end
  -- [공식 Roblox 관절·자산 계약] 원본 3단계 검술과 맨손은 각각 승인된 실제 자산을 요구한다.
  -- 공용 R15 포즈는 Animator를 덮지 않고 PreSimulation에서 기존 Transform 위에 섞는다.
  local swordProfile=profile=="SWORD" or profile=="LONGSWORD" or profile=="GREATSWORD"
  if not hasStudioAssetAtom("MOTION", "ATTACK_LIGHT_1") then
    character:SetAttribute("NativeCombatMotionState", "APPROVED_MOTION_ATOM_REQUIRED")
    return
  end
  if swordProfile and (not hasStudioAssetAtom("MOTION","ATTACK_LIGHT_2")
    or not hasStudioAssetAtom("MOTION","ATTACK_LIGHT_3")) then
    character:SetAttribute("NativeCombatMotionState", "APPROVED_MOTION_ATOM_REQUIRED")
    return
  end
  if profile=="UNARMED" then
    if not hasStudioAssetAtom("CHARACTER","HAND_BARE") then return end
  elseif swordProfile then
    local bladeAtom=profile=="GREATSWORD" and "BLADE_HEAVY" or "BLADE_LONG"
    if not hasStudioAssetAtom("WEAPON",bladeAtom) then
      character:SetAttribute("NativeCombatMotionState", "APPROVED_WEAPON_ATOM_REQUIRED")
      return
    end
  end
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
  -- [검 1·2·3타] 같은 검으로 1.15초 이내 이어 누르면 오른베기→왼베기→찌르기.
  -- 타격 요청은 기존 공격 입력 1회당 1회만 보내며 서버의 .42초 재사용 시간을 따른다.
  local swordStage=0
  if swordProfile then
    swordStage=(swordComboCharacter==character and swordComboProfile==profile
      and os.clock()-swordComboAt<=1.15) and (swordComboStage%3+1) or 1
  end
  local martialTrack=profile=="UNARMED" and martialSkillTracks[approvedScope] or nil
  if martialTrack then
    -- 각 버튼의 1~5타는 고정된 영화식 연출. 승인 시퀀스가 순서를 섞지 않는다.
    for i,beat in ipairs(martialTrack.beats) do chosenMoves[i]=beat.id end
  elseif profile=="UNARMED" then
    local offset=(approvedIndex-1)%#basicUnarmedMoves
    for i=1,5 do chosenMoves[i]=basicUnarmedMoves[(offset+i-1)%#basicUnarmedMoves+1] end
  else
    -- 검은 연속 입력 순서에 맞는 원본 키포즈 1개를 재생한다. 다른 무기는 기존 선택을 유지한다.
    local routeOk,route=pcall(combatMotionSource.CreateCombatCombo,profile)
    if not routeOk or not route or #route.steps==0 then return end
    if swordProfile and #route.steps<3 then return end
    chosenMoves[1]=route.steps[swordProfile and swordStage or ((approvedIndex-1)%#route.steps+1)].id
  end
  -- 공용 CreateCombatCombo는 불변 객체다. 기존 맨손 5타와 검 1타별 포즈를 재사용한다.
  local ok,combo=pcall(combatMotionSource.CreateCombatCombo,
    profile,chosenMoves,{speed=martialTrack and martialTrack.speed or (profile=="UNARMED" and 1.22 or 1)})
  if not ok or not combo or not combo.steps or #combo.steps~=#chosenMoves then return end
  if swordProfile then
    swordComboStage=swordStage
    swordComboAt=os.clock()
    swordComboProfile=profile
    swordComboCharacter=character
  elseif swordComboProfile then
    swordComboStage=0
    swordComboAt=0
    swordComboProfile=nil
    swordComboCharacter=nil
  end
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
  character:SetAttribute("NativeSwordComboStage",swordStage)
  character:SetAttribute("NativeCombatStyle", swordProfile and "SWORD_THREE_STRIKES"
    or martialTrack and martialTrack.name or "BASIC")
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
  Root="FlipRoot",RootJoint="Spine",["Left Shoulder"]="UpperArmL",["Right Shoulder"]="UpperArmR",
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
  -- [액션 모션 유지] 공격 승인 신호는 방어·회피·스킬 포즈의 종료 신호가 아니다.
  -- 서버가 승인한 액션별 연출 시간 동안 기존 모션을 끊지 않는다.
  if skillMotionR15 and (os.clock()>=skillMotionDeadline
    or (skillMotionCharacter
      and (skillMotionCharacter:GetAttribute("NativeSkillActionId")=="skill-meadow-dodge-left"
        or skillMotionCharacter:GetAttribute("NativeSkillActionId")=="skill-meadow-dodge-right")
      and os.clock()>=dodgePoseUntil)) then
    finishMeadowSkillPose()
  end
end)
player:GetAttributeChangedSignal("ApprovedActionMotion"):Connect(function()
  local id,serial=tostring(player:GetAttribute("ApprovedActionMotion") or ""):match("^([^:]+):(%d+)$")
  local action=id and actionsById[id]
  if not serial or not action or action.Kind=="COMBAT" or not action.MotionAtom then return end
  local isDodge=id=="skill-meadow-dodge-left" or id=="skill-meadow-dodge-right"
  local isGuard=id=="skill-meadow-guard"
  local isParry=id=="skill-meadow-parry"
  -- [막기 복구] 회피 중·회피 직후에도 서버가 승인한 방어는 즉시 새 자세로 전환한다.
  -- 회피 우선권은 일반 공격에만 남기고 방어와 완벽 막기에는 잘못 적용하지 않는다.
  if os.clock()<dodgePoseUntil and not (isDodge or isGuard or isParry) then return end
  if isGuard or isParry then dodgePoseUntil=0 end
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
    if not (skillMotionJoints.RootJoint and skillMotionJoints["Left Shoulder"]
      and skillMotionJoints["Right Shoulder"]) then return end
  elseif not (skillMotionJoints.Waist and skillMotionJoints.LeftShoulder and
    skillMotionJoints.RightShoulder and skillMotionJoints.LeftElbow and
    skillMotionJoints.RightElbow) then return end
  skillMotionAvailable.Chest=true
  -- Roblox 공식 Transform 방식: Animator 위에 PreSimulation 관절만 혼합한다.
  skillMotionR15=combatMotionSource.BindJointPose(skillMotionJoints,{
    followAnimator=true,response=27,responseByJoint={Root=110,RootJoint=110},
  })
  skillMotionCharacter=character
  skillMotionState=state
  skillMotionStart=os.clock()
  -- [연속 회피 연출] 시각 모션만 1.06초, 서버 회피 판정 .46초는 불변.
  -- 기존 공격 잠금도 .46+.12초만 유지한다.
  skillMotionDuration=isGuard and 2.8 or isParry and .42 or isDodge and 1.06
    or math.clamp(tonumber(meta.duration) or .7,.25,1.4)
  skillMotionDeadline=skillMotionStart+skillMotionDuration+(isGuard and 0 or .12)
  if isDodge then dodgePoseUntil=skillMotionStart+.46+.12 end
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
  local actionId=skillMotionCharacter:GetAttribute("NativeSkillActionId")
  local isDodge=actionId=="skill-meadow-dodge-left" or actionId=="skill-meadow-dodge-right"
  local isGuard=actionId=="skill-meadow-guard"
  local isParry=actionId=="skill-meadow-parry"
  -- [회피 전용 관절 포즈] 일반 손짓 제스처를 섞지 않고 원본 R15 몸통·팔·양다리만 구동한다.
  -- 서버가 회피를 승인했을 때만 실행하며 실제 위치·피해·무적 판정은 서버 소유.
  if isDodge then
    local sign=actionId=="skill-meadow-dodge-left" and -1 or 1
    local leadLeft=sign<0
    -- [5단 회피 스킬] 1 슬립 → 2 역방향 페인트 → 3 크로스 스텝 → 4 낮은 위빙 → 5 덤블링 착지.
    -- 단일 승인 기술의 연속 동작. 기존 서버 7스터드·.48초 무적·4초 쿨타임 그대로.
    local first=math.sin(math.pi*math.clamp(phase/.23,0,1))
    local second=math.sin(math.pi*math.clamp((phase-.17)/.24,0,1))
    local third=math.sin(math.pi*math.clamp((phase-.37)/.24,0,1))
    local fourth=math.sin(math.pi*math.clamp((phase-.57)/.23,0,1))
    local flip=math.clamp((phase-.79)/.18,0,1)
    local flipping=math.sin(math.pi*flip)
    local finish=math.clamp((phase-.95)/.05,0,1)
    finish=finish*finish*(3-2*finish)
    local anticipation=math.sin(math.pi*math.clamp(phase/.10,0,1))
    -- 기존 루트 관절만 회전하고 실제 HumanoidRootPart 위치는 수정하지 않는다.
    skillMotionTargets.FlipRoot=CFrame.new(0,.14*second+.20*third+.22*fourth+1.12*flipping,0)
      *CFrame.Angles(-2*math.pi*flip,-sign*.16*third,sign*(.26*first-.24*second+.32*fourth))
    skillMotionTargets.Spine=CFrame.new(0,-.10*anticipation+.12*third-.13*fourth-.04*finish,0)
      *CFrame.Angles(-.30*first+.20*second+.18*third-.34*fourth,sign*(-.52*second+.65*third),sign*(-.38*first+.37*second-.32*fourth))
    skillMotionTargets.Chest=CFrame.Angles(-.08*first+.21*third-.22*fourth,sign*(-.31*second+.38*third),sign*(-.18*first+.18*second))
    skillMotionTargets.Head=CFrame.Angles(.22*first-.12*third+.30*fourth,sign*.23*third,0)
    -- 다리: 1단 접기 / 2단 최대 펴기 / 3단 공중제비 무릎 당기기.
    local leadHip=-.95*first+.46*second-.96*third-.64*fourth-1.18*flipping+.12*finish
    local backHip=.48*first-.90*second+.71*third+.45*fourth-1.24*flipping+.08*finish
    local leadKnee=.35*first+.24*second+.48*fourth+1.9*flipping
    local backKnee=.64*second+.28*third+.60*fourth+1.9*flipping
    skillMotionTargets.ThighL=CFrame.Angles(leadLeft and leadHip or backHip,0,
      leadLeft and -.22*second+.27*third or .32*second-.26*third)
    skillMotionTargets.ThighR=CFrame.Angles(leadLeft and backHip or leadHip,0,
      leadLeft and -.32*second+.26*third or .22*second-.27*third)
    skillMotionTargets.ShinL=CFrame.Angles(leadLeft and leadKnee or backKnee,0,0)
    skillMotionTargets.ShinR=CFrame.Angles(leadLeft and backKnee or leadKnee,0,0)
    skillMotionTargets.FootL=CFrame.Angles(-.24*second-.25*fourth-.26*flipping+.1*finish,0,0)
    skillMotionTargets.FootR=CFrame.Angles(-.29*second-.26*flipping+.1*finish,0,0)
    -- 팔: 반대 방향 반동 → 양팔 전개 → 덤블링 시 모아 회전.
    skillMotionTargets.UpperArmL=CFrame.Angles(
      leadLeft and (-1.19*first-.44*second+.36*third-.75*fourth-.86*flipping)
        or (.62*first-.83*second-.65*third-.78*fourth-.86*flipping),
      0,-.31*first+.30*second-.69*third+.26*fourth+.18*flipping)
    skillMotionTargets.UpperArmR=CFrame.Angles(
      leadLeft and (.62*first-.83*second-.65*third-.78*fourth-.86*flipping)
        or (-1.19*first-.44*second+.36*third-.75*fourth-.86*flipping),
      0,.31*first-.30*second+.69*third-.26*fourth-.18*flipping)
    skillMotionTargets.ForearmL=CFrame.Angles(-.37*first-.28*second-.32*third-1.04*fourth-1.24*flipping,0,0)
    skillMotionTargets.ForearmR=CFrame.Angles(-.37*first-.28*second-1.24*flipping,0,0)
    skillMotionTargets.HandL=CFrame.Angles(-.12*flipping,0,0)
    skillMotionTargets.HandR=CFrame.Angles(-.12*flipping,0,0)
  elseif isGuard or isParry then
    -- [방어 동작] 오른팔을 머리 위까지 확실하게 들어 공격 방향을 가리는 한팔 하이 가드.
    -- 짧은 들어올리기 → 머리 위 유지 → 자연스러운 자세 복귀.
    -- 캐릭터를 움직이거나 외형 파츠/무기를 생성하지 않는다.
    local rise=math.clamp(phase/(isParry and .22 or .09),0,1)
    rise=rise*rise*(3-2*rise)
    local release=math.clamp((1-phase)/(isParry and .45 or .08),0,1)
    release=release*release*(3-2*release)
    local guard=rise*release
    local counter=isParry and math.sin(math.pi*phase) or 0
    if isGuard then
      -- [서서 막기] 엉덩이 내리기와 무릎 굽히기를 없앤 직립 양팔 X가드.
      local open=math.sin(math.pi*math.clamp(phase/.13,0,1))
      local close=math.clamp((phase-.045)/.12,0,1)
      close=close*close*(3-2*close)
      local brace=close*release
      local impact=math.sin(math.pi*math.clamp((phase-.065)/.09,0,1))
      local breath=math.sin((os.clock()-skillMotionStart)*4.3)*.012*brace
      skillMotionTargets.Spine=CFrame.new(0,.09*open+.035*impact+breath,0)
        *CFrame.Angles(.075*open-.055*brace,0,0)
      skillMotionTargets.Chest=CFrame.Angles(.045*open-.035*brace,0,0)
      skillMotionTargets.Head=CFrame.Angles(-.15*brace,0,0)
      -- 양팔을 옆으로 크게 펼쳤다가 얼굴 앞에서 동시에 엑스자로 접는다.
      skillMotionTargets.UpperArmL=CFrame.Angles(-.68*open-1.68*brace-.16*impact,
        -.26*brace,-1.12*open+.56*brace)
      skillMotionTargets.ForearmL=CFrame.Angles(-.36*open-1.52*brace,0,-.24*brace)
      skillMotionTargets.HandL=CFrame.Angles(-.18*brace,0,-.12*brace)
      skillMotionTargets.UpperArmR=CFrame.Angles(-.68*open-1.68*brace-.16*impact,
        .26*brace,1.12*open-.56*brace)
      skillMotionTargets.ForearmR=CFrame.Angles(-.36*open-1.52*brace,0,.24*brace)
      skillMotionTargets.HandR=CFrame.Angles(-.18*brace,0,.12*brace)
      -- 어깨 너비의 발 지지, 몸높이와 무릎 관절 유지.
      skillMotionTargets.ThighL=CFrame.Angles(.025*brace,0,-.10*brace)
      skillMotionTargets.ThighR=CFrame.Angles(.025*brace,0,.10*brace)
      skillMotionTargets.ShinL=CFrame.identity
      skillMotionTargets.ShinR=CFrame.identity
      skillMotionTargets.FootL=CFrame.Angles(0,0,-.035*brace)
      skillMotionTargets.FootR=CFrame.Angles(0,0,.035*brace)
    else
      skillMotionTargets.Spine=CFrame.new(0,-.06*guard,0)
        *CFrame.Angles(-.14*guard+.08*counter,-.10*guard,.07*guard)
      skillMotionTargets.Chest=CFrame.Angles(-.11*guard,-.08*guard,0)
      skillMotionTargets.Head=CFrame.Angles(.12*guard,.1*guard,0)
      skillMotionTargets.UpperArmL=CFrame.Angles(-1.12*guard-.18*counter,-.17*guard,-.28*guard)
      skillMotionTargets.UpperArmR=CFrame.Angles(-1.24*guard-.24*counter,.20*guard,.28*guard)
      skillMotionTargets.ForearmL=CFrame.Angles(-1.08*guard,0,-.12*guard)
      skillMotionTargets.ForearmR=CFrame.Angles(-1.16*guard,0,.12*guard)
      skillMotionTargets.HandL=CFrame.Angles(-.12*guard,0,0)
      skillMotionTargets.HandR=CFrame.Angles(-.12*guard,0,0)
      skillMotionTargets.ThighL=CFrame.Angles(.12*guard,0,-.09*guard)
      skillMotionTargets.ThighR=CFrame.Angles(.16*guard,0,.09*guard)
      skillMotionTargets.ShinL=CFrame.Angles(.19*guard,0,0)
      skillMotionTargets.ShinR=CFrame.Angles(.17*guard,0,0)
    end
  else
    local _,matched=combatMotionSource.SampleProceduralActorMotion(skillMotionState,phase,{
      bodyPlan="BIPED",actorClass="PLAYER",availableJoints=skillMotionAvailable,
      mobileTier=nativeTouchEnabled and "LOW" or "HIGH",secondary=.65,
    },skillMotionTargets)
    if not matched then finishMeadowSkillPose();return end
  end
  if humanoid.RigType==Enum.HumanoidRigType.R6 then
    -- [구형 아바타 회피] 기존 실제 몸통·팔·다리 관절에 같은 좌우 피하기 포즈를 연결한다.
    skillMotionR15Targets.RootJoint=skillMotionTargets.FlipRoot
      and (skillMotionTargets.FlipRoot*skillMotionTargets.Spine) or skillMotionTargets.Spine
    skillMotionR15Targets["Left Shoulder"]=skillMotionTargets.UpperArmL
    skillMotionR15Targets["Right Shoulder"]=skillMotionTargets.UpperArmR
    skillMotionR15Targets["Left Hip"]=skillMotionTargets.ThighL
    skillMotionR15Targets["Right Hip"]=skillMotionTargets.ThighR
  else
    combatMotionSource.MapCombatPoseToR15(skillMotionTargets,skillMotionR15Targets)
    -- R15 기존 루트 관절만 활용하는 전신 시각 회전.
    if skillMotionJoints.Root and skillMotionTargets.FlipRoot then
      skillMotionR15Targets.Root=skillMotionTargets.FlipRoot
    end
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
  -- [연타 잔상] 맨손 5타 및 검 1·2·3단계에 기존 짧은 궤적을 재사용한다.
  if strikeIndex~=activeStrikeTrailIndex then
    activeStrikeTrailIndex=strikeIndex
    if activeCombatCharacter then
      activeCombatCharacter:SetAttribute("NativeCombatStrikeIndex",strikeIndex)
    end
    stopStrikeTrail()
    local swordSwing=activeCombatCombo.profileId=="SWORD"
      or activeCombatCombo.profileId=="LONGSWORD" or activeCombatCombo.profileId=="GREATSWORD"
    if combatVFX and (activeCombatCombo.profileId=="UNARMED" or swordSwing)
      and timeInAction<activeCombatCombo.duration then
      local chosenMove=currentStep.id
      local leg=chosenMove:find("KICK",1,true) or chosenMove:find("KNEE",1,true)
      local left=chosenMove:find("LEFT",1,true) or chosenMove:match("_L$")
      local hostName=leg and (left and "LeftFoot" or "RightFoot")
        or (left and "LeftHand" or "RightHand")
      local equipped=character:FindFirstChildOfClass("Tool")
      local swordHandle=swordSwing and equipped and equipped:FindFirstChild("Handle")
      local host=swordHandle and swordHandle:IsA("BasePart") and swordHandle
        or character:FindFirstChild(swordSwing and "RightHand" or hostName)
      if host and host:IsA("BasePart") then
        local style=activeCombatMartialTrack
        local color=style and style.color or swordSwing and
          (swordComboStage==3 and Color3.fromRGB(255,221,174) or Color3.fromRGB(195,214,219))
          or (leg and Color3.fromRGB(124,245,220) or Color3.fromRGB(255,207,112))
        local ok,_,controller=pcall(combatVFX.AttachShortTrail,host,{
          color=color,lifetime=nativeTouchEnabled and .19 or .32,
          width=style and style.trailWidth or swordSwing and .52 or (nativeTouchEnabled and .6 or .76),
          length=style and 3.2 or swordSwing and (swordComboStage==3 and 2.8 or 1.9) or 1.3,
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


-- [원본 몹 모션] 관련 상태·이벤트를 단일 책임 함수에 격리해 Luau 로컬 레지스터 상한 준수.
local function initializeMeadowNativeMobMotion()
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
  -- [실제 보행] 네 발의 접지가 1/4주기씩 어긋난다. 질주는 기존 대각 발 트로트.
  {"FL",0,0},{"FR",.5,.5},{"BL",.75,.5},{"BR",.25,0},
}
-- [늑대 질주] 뒷발 추진 → 앞발 착지 순서. 트로트처럼 두 발을 동시에 찍지 않는다.
local wolfGallopOffsets={FL=.52,FR=.60,BL=.04,BR=.12}
-- [사슴 원본 질주] 뒷발 추진 다음 앞발 착지: 걷기용 트로트와 다른 실제 4족 갤럽.
local deerGallopOffsets={FL=.60,FR=.67,BL=.06,BR=.13}
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
  local tint=boss and Color3.fromRGB(255,131,91)
    or flying and Color3.fromRGB(243,224,123)
    or wolf and Color3.fromRGB(173,217,245)
    or boar and Color3.fromRGB(210,157,119)
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
    textureKey=wolf and stage=="IMPACT" and "slash" or nil,
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
    and species~="bat" then return end
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
    WingL=true,WingR=true,WingL2=true,WingR2=true,WingL3=true,WingR3=true,
    WingL4=true,WingR4=true,Tail=true,Chest=true,Spine=true,
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
  -- [46본 사슴] GLB 원본 명칭을 실제 스킨 관절에 직접 연결한다.
  -- IK와 End 뼈는 구동하지 않고 어깨/골반 위쪽 원본 뼈만 고관절로 사용한다.
  local deerSourceChannels={
    torso="Spine",torso2="Chest",neck1="Neck",tail1="Tail",
    frontupperlegl="FLHip",frontupperlegr="FRHip",
    frontlowerlegl="FLKnee",frontlowerlegr="FRKnee",
    backupperlegl="BLHip",backupperlegr="BRHip",
    backlowerlegl="BLKnee",backlowerlegr="BRKnee",
  }
  local bounds,size=model:GetBoundingBox()
  for _,joint in ipairs(model:GetDescendants()) do
    -- 실제 관절 종류별 연결점을 읽는다. AnimationConstraint는 Attachment를 우선한다.
    local motor=joint:IsA("Motor6D") and joint.Part0 and joint.Part1
    local constraint=joint:IsA("AnimationConstraint") and joint.Attachment0 and joint.Attachment1
    if motor or constraint or joint:IsA("Bone") then
      local raw=joint.Name:lower()
      local key=raw:gsub("[^%w]","")
      local name=(species=="wolf" and wolfSourceChannels[key])
        or (species=="deer" and deerSourceChannels[key])
        or nativeMobJointAlias[joint.Name] or joint.Name
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
      -- [박쥐 실제 FBX 뼈] Wing1.L~Wing4.R 8마디를 각각 독립 채널로 연결한다.
      -- 날개 뼈를 다리나 만들어 낸 관절로 잘못 분류하지 않는다.
      local batWingSegment=species=="bat" and key:match("wing([1-4])") or nil
      if batWingSegment and side then
        name="Wing"..side..(batWingSegment=="1" and "" or batWingSegment)
      elseif species=="bat" and key=="bodyroot" then
        name="Spine"
      elseif species=="bat" and key=="body" then
        name="Chest"
      elseif species=="bat" and limb and side then
        name=(key:find("lower",1,true) and "Shin" or "Thigh")..side
      elseif not sourceChannels[name] and limb and side then
        local lower=key:find("knee",1,true) or key:find("shin",1,true)
          or key:find("calf",1,true) or key:find("lowerleg",1,true)
        local foot=key:find("foot",1,true) or key:find("paw",1,true)
          or key:find("ankle",1,true)
        if species=="golem" then
          name=(lower or foot) and ("Shin"..side) or ("Thigh"..side)
        else
          local front=key:find("front",1,true) or key:find("fore",1,true)
          local rear=key:find("rear",1,true) or key:find("hind",1,true)
            or key:find("back",1,true)
          -- [실제 사슴 관절] 원본 46관절 앞·뒷다리 이름을 우선하고 좌표는 폴백으로만 쓴다.
          local position=front and "F" or rear and "B"
            or ((species=="deer") == (relative.Z>0)) and "F" or "B"
          name=position..side..(foot and "Ankle" or lower and "Knee" or "Hip")
        end
      elseif not sourceChannels[name] and (species=="bee" or species=="bat") then
        if key:find("wing",1,true) and side then name="Wing"..side end
      elseif not sourceChannels[name] and species=="golem" then
        if (key:find("arm",1,true) or key:find("shoulder",1,true)) and side then
          name="UpperArm"..side
        end
      end
      if sourceChannels[name] and (not joints[name] or constraint
        or (species=="wolf" and joint:IsA("Bone") and not joints[name]:IsA("Bone"))
        or (species=="deer" and deerSourceChannels[key] and joint:IsA("Bone"))) then
        -- [원본 스킨 우선] 같은 이름의 연결부가 중복되면 늑대 메시를 실제로 변형하는 Bone을 사용한다.
        -- 다리를 새로 만들지 않고 기존 정규화된 원본 스킨 관절을 재사용한다.
        joints[name]=joint
        available[name]=true
      end
    end
  end
  local count=0
  for _ in pairs(joints) do count+=1 end
  local bodyPlan=(species=="bee" or species=="bat") and "FLYER" or
    species=="golem" and "GIANT" or "QUADRUPED"
  local movingJoints=(species=="bee" or species=="bat") and
      (available.WingL or available.WingR or available.UpperArmL or available.UpperArmR)
    or species=="golem" and
      (available.ThighL or available.ThighR or available.UpperArmL or available.UpperArmR)
    or (available.FLHip or available.FRHip or available.BLHip or available.BRHip)
  -- [실제 원본 사슴·늑대 모션] 등록된 AnimationId가 있으면 저작된 걷기/달리기를 우선한다.
  -- 단순 뼈 회전은 원본 애니메이션을 찾지 못할 때만 기존 책임 관절에 적용한다.
  local nativeAnimations={}
  if species=="deer" or species=="wolf" or species=="bat" then
    for _,animation in ipairs(model:GetDescendants()) do
      if animation:IsA("Animation") and animation.AnimationId:match("^rbxassetid://[1-9]%d*$") then
        -- [공식 Animator] 이름에 Idle_HitReact가 포함되어도 대기 클립으로 잘못 선택하지 않는다.
        -- 저작 GLB 애니메이션은 Roblox AnimationId로 독립 게시된 경우에만 재생한다.
        local key=animation.Name:lower():match("[^|]+$") or animation.Name:lower()
        local mode=key=="idle" and "IDLE"
          or key=="walk" and "WALK"
          or (key=="gallop" or key=="run") and "RUN"
          or key=="fly" and "FLY"
          or (key:find("hitreact",1,true) or key=="hit") and "HIT"
          or key:find("attack",1,true) and "ATTACK"
          or (key=="dead" or key=="death") and "DEATH" or nil
        if mode and not nativeAnimations[mode] then nativeAnimations[mode]=animation end
      end
    end
  end
  local nativeTracks=nil
  if (nativeAnimations.IDLE and nativeAnimations.WALK)
    or (species=="bat" and nativeAnimations.FLY and nativeAnimations.ATTACK) then
    local animationController=model:FindFirstChildWhichIsA("AnimationController",true)
    if not animationController then
      animationController=Instance.new("AnimationController")
      animationController.Name="OriginalWildlifeAnimationController"
      animationController.Parent=model
    end
    local animator=animationController:FindFirstChildOfClass("Animator")
    if not animator then animator=Instance.new("Animator");animator.Parent=animationController end
    local tracks={}
    for mode,animation in pairs(nativeAnimations) do
      local ok,track=pcall(function()return animator:LoadAnimation(animation)end)
      if ok and track then
        track.Looped=mode=="WALK" or mode=="RUN" or mode=="IDLE" or mode=="FLY"
        -- [공식 우선순위] 대기 < 이동 < 공격/피격/사망.
        track.Priority=(mode=="ATTACK" or mode=="HIT" or mode=="DEATH")
          and Enum.AnimationPriority.Action
          or mode=="IDLE" and Enum.AnimationPriority.Idle
          or Enum.AnimationPriority.Movement
        tracks[mode]=track
      end
    end
    if (tracks.IDLE and tracks.WALK)
      or (species=="bat" and tracks.FLY and tracks.ATTACK) then nativeTracks=tracks end
  end
  -- [실제 원본 4족 관절] 네 고관절 또는 원본 걷기 애니메이션이 있어야 정상 모션으로 인정.
  local wolfFourLegRig=species~="wolf" or
    (available.FLHip and available.FRHip and available.BLHip and available.BRHip)
  local deerFourLegRig=species~="deer" or
    (available.FLHip and available.FRHip and available.BLHip and available.BRHip)
  -- 좌우 원본 날개가 네 마디씩 실제로 존재해야 박쥐를 정상 리깅으로 인정한다.
  local batEightWingRig=species~="bat" or (available.WingL and available.WingR
    and available.WingL2 and available.WingR2 and available.WingL3 and available.WingR3
    and available.WingL4 and available.WingR4)
  local actualRig=count>=2 and movingJoints==true and wolfFourLegRig==true
    and deerFourLegRig==true and batEightWingRig==true
  -- [모션 복구] 정식 AnimationTrack이 로딩 실패/빈 클립이면 같은 원본 관절로 즉시 이어갈 수 있게 준비한다.
  -- 정상 원본 클립 재생 중에는 공용 포즈를 절대 덮지 않는다.
  local controller=actualRig and meadowMobMotion and meadowMobMotion.BindJointPose(joints,{
    followAnimator=true,response=26,
  }) or nil
  local row={controller=controller,nativeTracks=nativeTracks,available=available,plan=bodyPlan,
    species=species,phase=0,poses={},lastMode=nil,motionStartedAt=os.clock(),
    lastPosition=model:GetPivot().Position,travel=0,groundSpeed=0,renderAccumulator=0,
    lastHeading=model:GetPivot().LookVector,turnLean=0,
    originalTrackWaitStartedAt=os.clock(),
    -- [모션] 실제 관절의 직전 포즈를 저장해 정지·추적·공격 사이를 매끄럽게 잇는다.
    transitionFrom={},renderedPoses={},transitionStartedAt=0,transitionDuration=0}
  model:SetAttribute("NativeCreatureRigMode",nativeTracks and "ORIGINAL_ANIMATION_TRACKS"
    or actualRig and "ORIGINAL_JOINT_RIG" or "UNRIGGED_SOURCE_MESH_NEEDS_ANIMATED_ASSET")
  if not actualRig and not nativeTracks and not meadowMobRigWarnings[species] then
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
    if nativeTracks then for _,track in pairs(nativeTracks) do track:Stop(0) end end
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
  if row.nativeTracks then for _,track in pairs(row.nativeTracks) do track:Stop(0) end end
  meadowMobControllers[model]=nil
end)
game:GetService("RunService").PreSimulation:Connect(function(dt)
  for model,row in pairs(meadowMobControllers) do
    if model.Parent and (row.controller or row.nativeTracks) then
      local requested=model:GetAttribute("NativeMobMotion")
      -- 상태값을 먼저 보존하고, 서버 상태가 없을 때만 종별 기본 모션을 사용한다.
      local mode=nativeMobMotionMap[requested]
      if not mode then
        local wildlife=row.species=="deer" or row.species=="boar" or row.species=="rabbit"
        mode=wildlife and "WALK" or "IDLE"
      end
      -- [박쥐 비행] 걷기/질주/대기도 지상 발구르기 대신 원본 날개 비행으로 재생한다.
      if row.species=="bat" and (mode=="IDLE" or mode=="WALK" or mode=="RUN") then
        mode="FLY"
      end
      -- [원본 애니메이션] Idle/Walk/Run/Attack 클립은 실제 메쉬의 Animator가 구동한다.
      -- 질주 클립이 없는 사슴은 걷기 클립을 빠르게 재생한다. 합성 관절은 동시에 구동하지 않는다.
      if row.nativeTracks then
        -- [늑대 동작 복구] 원본 걷기/달리기 클립은 유지하고,
        -- 공격 예고·피격·회복 또는 공격 클립이 없는 경우 기존 원본 뼈의 절차 모션을 재사용한다.
        -- [사슴·늑대] 저작 클립이 없는 예고/회복은 Idle로 덮지 않고 실제 관절로 연출한다.
        local quadrupedAction=(row.species=="wolf" or row.species=="deer") and row.controller
          and (mode=="ANTICIPATION" or mode=="RECOVERY"
            or (mode=="HIT" and not row.nativeTracks.HIT)
            or (mode=="ATTACK" and not row.nativeTracks.ATTACK))
        if quadrupedAction then
          if row.playingTrack then row.playingTrack:Stop(.1);row.playingTrack=nil end
        else
          local track=row.nativeTracks[mode] or
            (row.species=="bat" and row.nativeTracks.FLY)
            or (mode=="RUN" and row.nativeTracks.WALK)
            or (mode=="ANTICIPATION" or mode=="RECOVERY" or mode=="HIT") and row.nativeTracks.IDLE
            or row.nativeTracks.IDLE
          if track and track~=row.playingTrack then
            if row.playingTrack then row.playingTrack:Stop(.16) end
            track:Play(.16,1,mode=="RUN" and not row.nativeTracks.RUN and 1.55 or 1)
            row.playingTrack=track
          end
          if track and track.IsPlaying then
            track:AdjustSpeed(mode=="RUN" and not row.nativeTracks.RUN and 1.55 or 1)
          end
          -- 원본 클립이 실행 불가/길이 0이면 기존 4족 본 모션으로 전환한다.
          local missing=not track or not track.IsPlaying or track.Length<=0
          if (row.species=="wolf" or row.species=="deer") and row.controller and missing
            and os.clock()-row.originalTrackWaitStartedAt>=2.5 then
            for _,original in pairs(row.nativeTracks) do original:Stop(.12) end
            row.nativeTracks=nil
            row.playingTrack=nil
            model:SetAttribute("NativeCreatureRigMode","ORIGINAL_JOINT_RIG")
          else
            continue
          end
        end
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
      -- [늑대 회전 관성] 서버가 실제로 바라보는 방향과 전진축의 차이만 관절에 부드럽게 전달.
      if row.species=="wolf" then
        local heading=model:GetPivot().LookVector
        local previous=row.lastHeading or heading
        local bend=math.clamp(previous:Cross(heading).Y*2.2,-.28,.28)
        row.turnLean+=(bend-row.turnLean)*math.min(1,dt*9)
        row.lastHeading=heading
      end
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
        or mode=="RUN" and .82 or mode=="FLY" and .86 or 1.15
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
          -- [종별 대기] 사슴은 귀를 기울이는 목·머리의 경계 동작, 늑대는 코로 흔적을 찾는다.
          -- 실제 Bone만 구동하고 AI/탐지거리/공격 판정은 절대 변경하지 않는다.
          if row.species=="deer" then
            local look=math.sin(cycle*.55)
            if row.available.Neck then row.poses.Neck=CFrame.Angles(-.035+math.sin(cycle)*.065,look*.045,0) end
            if row.available.Head then row.poses.Head=CFrame.Angles(.045+math.sin(cycle*.7)*.09,look*.13,0) end
            if row.available.Tail then row.poses.Tail=CFrame.Angles(0,look*.10,0) end
          elseif row.species=="wolf" then
            local scent=math.sin(cycle*.8)
            if row.available.Neck then row.poses.Neck=CFrame.Angles(.045+scent*.08,0,0) end
            if row.available.Head then row.poses.Head=CFrame.Angles(-.04+scent*.10,math.sin(cycle*.4)*.11,0) end
          end
          -- [4족 대기] 호흡에 맞춰 어깨와 뒷다리에 체중을 번갈아 실어 생명감을 준다.
          if row.plan=="QUADRUPED" then
            local weight=math.sin(cycle*.5)*(row.species=="boar" and .035 or .055)
            for _,foot in ipairs(quadrupedFootPhases) do
              local key=foot[1]
              local front=key:sub(1,1)=="F"
              if row.available[key.."Hip"] then
                row.poses[key.."Hip"]=CFrame.Angles((front and -.035 or .025)+weight*(front and 1 or -.6),0,0)
              end
              if row.available[key.."Knee"] then
                row.poses[key.."Knee"]=CFrame.Angles(.045+math.abs(weight)*.35,0,0)
              end
            end
          end
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
          -- [4족 피격·사망] 앞다리 버팀과 뒷다리 주저앉기를 서로 다르게 연출한다.
          if row.plan=="QUADRUPED" then
            for _,foot in ipairs(quadrupedFootPhases) do
              local key=foot[1]
              local front=key:sub(1,1)=="F"
              if row.available[key.."Hip"] then
                row.poses[key.."Hip"]=CFrame.Angles(reaction*(front and -.20 or .24),0,0)
              end
              if row.available[key.."Knee"] then
                row.poses[key.."Knee"]=CFrame.Angles(reaction*(front and .34 or .56),0,0)
              end
              if row.available[key.."Ankle"] then
                row.poses[key.."Ankle"]=CFrame.Angles(-reaction*(front and .08 or .17),0,0)
              end
            end
            if row.available.Spine then row.poses.Spine=CFrame.Angles(-reaction*.16,0,reaction*.07) end
          end
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
        -- [황혼 박쥐 8마디 실제 날개] 원본 Bat.fbx의 좌·우 Wing1~Wing4 뼈를 연속 구동한다.
        -- 날갯짓 파동은 몸쪽에서 날개 끝으로 늦게 전달된다. 서버 피해/충돌과 무관하다.
        if row.species=="bat" then
          local cycle=phase*math.pi*2
          local ready=mode=="ANTICIPATION" and math.sin(phase*math.pi*.5) or 0
          local strike=mode=="ATTACK" and math.sin(phase*math.pi) or 0
          local recover=mode=="RECOVERY" and 1-phase or 0
          local hit=mode=="HIT" and math.sin(phase*math.pi) or 0
          local death=mode=="DEATH" and math.sin(phase*math.pi*.5) or 0
          local flapStrength=mode=="FLY" and .74 or mode=="IDLE" and .35
            or mode=="ANTICIPATION" and .22 or mode=="RECOVERY" and .28 or .12
          for _,side in ipairs({"L","R"}) do
            local direction=side=="L" and 1 or -1
            for segment=1,4 do
              local channel="Wing"..side..(segment==1 and "" or tostring(segment))
              if row.available[channel] then
                local lag=(segment-1)*.31
                local wave=math.sin(cycle-lag)
                local spread=flapStrength*wave*(1-(segment-1)*.13)
                local fold=.42*ready-.52*strike+.24*recover-.25*hit-.62*death
                local extension=(segment-1)*(.065*math.cos(cycle-lag)-.11*strike)
                row.poses[channel]=CFrame.Angles(.04*wave*(segment-1),extension,
                  direction*(spread+fold))
              end
            end
          end
          if row.available.Chest then
            row.poses.Chest=CFrame.Angles(-.12*ready+.24*strike-.10*recover,0,0)
          end
          if row.available.Neck then
            row.poses.Neck=CFrame.Angles(.12*ready-.22*strike,0,0)
          end
          if row.available.Head then
            row.poses.Head=CFrame.Angles(.15*ready-.30*strike+.08*recover,0,0)
          end
          if row.available.ThighL then row.poses.ThighL=CFrame.Angles(.25+.14*strike,0,0) end
          if row.available.ThighR then row.poses.ThighR=CFrame.Angles(.25+.14*strike,0,0) end
          if row.available.ShinL then row.poses.ShinL=CFrame.Angles(-.18,0,0) end
          if row.available.ShinR then row.poses.ShinR=CFrame.Angles(-.18,0,0) end
        end
        -- [4족 걷기/질주] 실제 발의 지지·회수·공중 구간을 원본 관절로만 연출한다.
        -- 서버 속도/피해/접촉 판정은 변경하지 않고 원본 Bone의 로컬 회전만 갱신한다.
        if row.plan=="QUADRUPED" then
          if mode=="WALK" or mode=="RUN" then
            local running=mode=="RUN"
            local wolf=row.species=="wolf"
            local heavy=row.species=="boar"
            local pace=math.clamp(row.groundSpeed/(running and 7 or 3),.35,1)
            local amplitude=(running and (wolf and .61 or .52) or heavy and .30 or .36)*pace
            local stance=running and (wolf and .34 or .43) or heavy and .67 or .61
            local cycle=phase*math.pi*2
            for _,foot in ipairs(quadrupedFootPhases) do
              local key=foot[1]
              local front=key:sub(1,1)=="F"
              local offset=running
                and (wolf and wolfGallopOffsets[key]
                  or row.species=="deer" and deerGallopOffsets[key] or foot[3])
                or foot[2]
              local legPhase=(phase+offset)%1
              local hip,knee,ankle
              if legPhase<stance then
                -- 착지 후 지지: 발목이 뒤로 미끄러지지 않게 무릎을 펴고 체중을 전달.
                local p=legPhase/stance
                local load=math.sin(math.pi*p)
                hip=amplitude*(1-p*2)
                knee=.015+load*(wolf and .065 or heavy and .065 or .040)
                ankle=-.018+load*(wolf and .09 or .042)
                if wolf and running then
                  -- 지지 구간 말미 뒷발로 추진하고 앞발이 충격을 흡수한다.
                  knee+=front and .08*load or -.035*load
                  ankle+=front and -.08*load or .14*math.sin(p*math.pi*.5)
                end
              else
                -- 회수: 어깨/고관절 스윙, 무릎 접힘, 발끝 끌림 방지.
                local p=(legPhase-stance)/(1-stance)
                local lift=math.sin(math.pi*p)
                local ease=p*p*(3-2*p)
                hip=-amplitude*(1-2*ease)
                knee=lift*(running and (wolf and (front and .68 or .79) or .68)
                  or heavy and .38 or .48)
                ankle=-lift*(running and (wolf and .28 or .22) or .15)
              end
              if not front then hip*=heavy and .83 or wolf and .97 or .92 end
              if row.available[key.."Hip"] then
                row.poses[key.."Hip"]=CFrame.Angles(hip,0,wolf and (key:sub(2)=="L" and 1 or -1)*.028*pace or 0)
              end
              if row.available[key.."Knee"] then row.poses[key.."Knee"]=CFrame.Angles(knee,0,0) end
              if row.available[key.."Ankle"] then row.poses[key.."Ankle"]=CFrame.Angles(ankle,0,0) end
            end
            -- 네 발의 힘이 척추·어깨·목·꼬리를 따라 전달된다.
            local suspension=math.sin(cycle*(running and 2 or 1))
            local deerRun=row.species=="deer" and running
            local bounce=suspension*(running and (wolf and .075 or deerRun and .072 or .057)
              or heavy and .020 or .030)*pace
            local roll=math.sin(cycle)*(running and .027 or .034)*pace
            local chestPitch=wolf and running and -.055*math.cos(cycle)
              or deerRun and -.085*math.cos(cycle-.25)*pace or bounce
            local waistPitch=wolf and running and .11*math.cos(cycle-.48)
              or deerRun and .10*math.cos(cycle-.65)*pace or -bounce*.46
            local turn=wolf and row.turnLean or 0
            if row.available.Chest then
              row.poses.Chest=CFrame.Angles(chestPitch,turn*.24,roll+turn*.33)
            end
            if row.available.Spine then
              row.poses.Spine=CFrame.Angles(waistPitch,-turn*.16,-roll*.65+turn*.17)
            end
            if row.available.Neck then
              row.poses.Neck=CFrame.Angles(-chestPitch*.72,turn*.21,-roll*.34-turn*.21)
            end
            if row.available.Head then
              row.poses.Head=CFrame.Angles(-chestPitch*.50,-turn*.38,-roll*.20-turn*.15)
            end
            if row.available.Tail then
              row.poses.Tail=CFrame.Angles(-waistPitch*.26,
                math.sin(cycle-.55)*.12*pace-turn*.35,0)
            end
          elseif row.species=="wolf" and (mode=="ANTICIPATION" or mode=="ATTACK" or mode=="RECOVERY") then
            -- [늑대 공격] 뒷다리에 체중을 실어 웅크림 → 전방 돌진 → 목/턱 물기 → 자세 회복.
            local windup=mode=="ANTICIPATION" and math.sin(phase*math.pi*.5) or 0
            local bite=mode=="ATTACK" and math.sin(math.pi*phase) or 0
            local settle=mode=="RECOVERY" and (1-phase) or 0
            local lunge=model:GetAttribute("AttackPattern")=="WOLF_LUNGE" and 1.25 or 1
            if row.available.Chest then row.poses.Chest=CFrame.Angles(-.17*windup-.36*bite*lunge+.13*settle,0,0) end
            if row.available.Spine then row.poses.Spine=CFrame.Angles(.21*windup-.21*bite*lunge,0,0) end
            if row.available.Neck then row.poses.Neck=CFrame.Angles(.22*windup-.48*bite*lunge+.13*settle,0,0) end
            if row.available.Head then row.poses.Head=CFrame.Angles(.29*windup-.56*bite*lunge+.18*settle,0,0) end
            if row.available.Jaw then row.poses.Jaw=CFrame.Angles(.22*windup+.70*bite,0,0) end
            if row.available.Tail then row.poses.Tail=CFrame.Angles(.16*windup-.18*bite,0,0) end
            for _,key in ipairs({"FL","FR"}) do
              if row.available[key.."Hip"] then row.poses[key.."Hip"]=CFrame.Angles(-.24*windup+.37*bite*lunge,0,0) end
              if row.available[key.."Knee"] then row.poses[key.."Knee"]=CFrame.Angles(.25*windup+.16*bite,0,0) end
              if row.available[key.."Ankle"] then row.poses[key.."Ankle"]=CFrame.Angles(-.07*windup-.16*bite,0,0) end
            end
            for _,key in ipairs({"BL","BR"}) do
              if row.available[key.."Hip"] then row.poses[key.."Hip"]=CFrame.Angles(.21*windup-.31*bite*lunge,0,0) end
              if row.available[key.."Knee"] then row.poses[key.."Knee"]=CFrame.Angles(.35*windup+.09*bite,0,0) end
              if row.available[key.."Ankle"] then row.poses[key.."Ankle"]=CFrame.Angles(-.15*windup+.12*bite,0,0) end
            end
          elseif mode=="ANTICIPATION" or mode=="ATTACK" or mode=="RECOVERY" then
            -- [기존 초식동물] 사슴·멧돼지·토끼의 공격 연출은 그대로 유지한다.
            local ready=mode=="ANTICIPATION" and math.sin(phase*math.pi*.5) or 0
            local strike=mode=="ATTACK" and math.sin(phase*math.pi) or 0
            local recover=mode=="RECOVERY" and 1-phase or 0
            local charge=row.species=="boar" and 1.20 or row.species=="deer" and .95 or .72
            if row.available.Spine then row.poses.Spine=CFrame.Angles(.12*ready-.23*strike*charge+.10*recover,0,0) end
            if row.available.Neck then row.poses.Neck=CFrame.Angles(.17*ready-.32*strike*charge+.10*recover,0,0) end
            if row.available.Head then row.poses.Head=CFrame.Angles(.22*ready-.40*strike*charge+.14*recover,0,0) end
            if row.available.Tail then row.poses.Tail=CFrame.Angles(-.10*ready+.18*strike,0,0) end
            for _,key in ipairs({"FL","FR","BL","BR"}) do
              local front=key:sub(1,1)=="F"
              if row.available[key.."Hip"] then
                row.poses[key.."Hip"]=CFrame.Angles((front and -.25 or .21)*ready
                  +(front and .31 or -.29)*strike*charge,0,0)
              end
              if row.available[key.."Knee"] then
                row.poses[key.."Knee"]=CFrame.Angles((front and .24 or .31)*ready
                  +(front and .08 or .19)*strike,0,0)
              end
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


end
initializeMeadowNativeMobMotion()

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


