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
  CHARACTER = "NOT_APPLICABLE",
  CREATURE = "APPLIED",
  BUILDING = "NOT_APPLICABLE",
  ENVIRONMENT = "NOT_APPLICABLE",
  WEAPON = "NOT_APPLICABLE",
  SKILL = "NOT_APPLICABLE",
  MATERIAL = "APPLIED",
  AUDIO = "NOT_APPLICABLE",
  VFX = "NOT_APPLICABLE",
  UI = "APPLIED",
  MOTION = "APPLIED",
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
  if not(approvedScope:find("ATTACK",1,true)or approvedScope:find("SKILL",1,true)or approvedScope:find("HIT",1,true)or approvedScope:find("COMBAT",1,true))then return end

  if verifiedLearningSemanticVariant == "MOVEMENT_SPATIAL" or verifiedLearningSemanticVariant == "DEFENSE_WAVE" or verifiedLearningSemanticVariant == "OBJECTIVE_GOAL" or verifiedLearningSemanticVariant == "SOCIAL_CONTEXT" or verifiedLearningSemanticVariant == "SURVIVAL_RISK" then
  local camera = workspace.CurrentCamera
  if camera then
    local baseFov = camera.FieldOfView
    verifiedLearningTweenService:Create(camera, TweenInfo.new(0.08, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {FieldOfView = math.clamp(baseFov + 3, 40, 100)}):Play()
    task.delay(0.09, function()
      if camera then verifiedLearningTweenService:Create(camera, TweenInfo.new(0.12, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {FieldOfView = baseFov}):Play() end
    end)
  end
  end

  if verifiedLearningSemanticVariant == "COMBAT_IMPACT" or verifiedLearningSemanticVariant == "SURVIVAL_RISK" then
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
  -- ApprovedCombatMotion is the per-hit server-authorized sequence.
  -- Avoid a duplicate VFX burst from LastApprovedScope's coarse state.
  verifiedLearningLastControl = nil
end)
verifiedLearningPlayer:GetAttributeChangedSignal("ApprovedCombatMotion"):Connect(function()
  playVerifiedLearningActionFeedback(verifiedLearningLastControl,true)
  verifiedLearningLastControl=nil
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
local actionGrid=Instance.new("UIGridLayout")
actionGrid.Name="NativeActionGrid"
actionGrid.SortOrder=Enum.SortOrder.LayoutOrder
actionGrid.CellSize=UDim2.new(.5,-5,0,54)
actionGrid.CellPadding=UDim2.new(0,6,0,6)
actionGrid.Parent=list
local actionButtons={}
for index, action in ipairs(Config.Actions) do
  local button = CommonUI.CreatePrimaryButton({minWidth=44,minHeight=52})
  button.Name = "ScopeAction" .. index
  button.LayoutOrder = index
  button.Size=UDim2.new(.5,-5,0,54) -- UIGridLayout owns actual position
  button.BackgroundColor3 = Color3.fromRGB(235, 242, 255)
  button.TextColor3 = Color3.fromRGB(16, 24, 40)
  button.TextWrapped = true
  button.TextScaled = false;button.TextSize=15
  button.Text = CommonUI.ActionLabel(action,index)
  button.Parent = list
  actionButtons[action.Id]=button
  button.Activated:Connect(function() remote:FireServer(action.Id) end)
end
-- Every mobile skill is directly reachable, with server-time cooldowns.
local readyClock=0
game:GetService("RunService").Heartbeat:Connect(function(dt)
  readyClock+=dt
  if readyClock<.2 then return end
  readyClock=0
  local now=workspace:GetServerTimeNow()
  for _,action in ipairs(Config.Actions) do
    local button=actionButtons[action.Id]
    if button then
      local deadline=player:GetAttribute("MeadowReady_"..action.Id)
      local remains=typeof(deadline)=="number" and math.max(0,deadline-now) or 0
      button.Text=action.Label..(remains>.05 and ("  ·  "..math.ceil(remains).."초") or "")
      button.BackgroundColor3=remains>.05 and Color3.fromRGB(83,90,100) or
        (action.Kind=="SKILL" and Color3.fromRGB(176,218,195) or Color3.fromRGB(235,242,255))
      button.Active=remains<=.05
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
local telegraphNames={WOLF_BITE="초원 늑대 · 물어뜯기",BEE_SWEEP="초원 벌 · 급강하",GOLEM_SLAM="돌 골렘 · 내려찍기"}
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
    status.Text ..= "\\nR15 아바타 설정 필요"
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
      remote:FireServer(primaryCombatAction.Id)
    end
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

CommonUI.AdaptActionMenu(gui,root,list,title,status,nil,multiplayerStatus,primaryCombatAction and{label="공격",activate=function()remote:FireServer(primaryCombatAction.Id)end}or nil)

-- Source-bound Roblox SKILL / VFX packages. Server approval is the only trigger.
-- UI actions never apply local damage, healing, knockback, cooldown or inventory.
local meadowSkillPresentation=nil
local meadowCommonVFX=nil
for _,pair in ipairs({
  {"RobloxCommonSkillPresentation","skill"},{"RobloxCommonVFX","vfx"},
}) do
  local module=Shared:FindFirstChild(pair[1])
  if module and module:IsA("ModuleScript") then
    local ok,value=pcall(require,module)
    if ok and type(value)=="table" then
      if pair[2]=="skill" then meadowSkillPresentation=value else meadowCommonVFX=value end
    end
  end
end
local actionsById={}
for _,action in ipairs(Config.Actions) do actionsById[action.Id]=action end
local debris=game:GetService("Debris")
local function playApprovedMeadowEffect(actionId,overrideVfx)
  local action=actionsById[actionId]
  if not action then return end
  local character=player.Character
  local rootPart=character and character:FindFirstChild("HumanoidRootPart")
  if not rootPart then return end
  local position=player:GetAttribute("ApprovedActionTarget")
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
  if meadowCommonVFX and selectedFx then
    local ok,err=pcall(meadowCommonVFX.Create,selectedFx,settings)
    if not ok then warn("마력숲 VFX source unavailable: "..tostring(err)) end
  end
  if meadowSkillPresentation and not overrideVfx and action.SkillAtom then
    local ok,result,controller=pcall(meadowSkillPresentation.Create,action.SkillAtom,settings)
    if ok then
      if action.SkillAtom=="SHIELD_SHELL" and typeof(result)=="Instance" then
        debris:AddItem(result,2.8)
      elseif action.SkillAtom=="DASH_STREAK" and controller then
        task.delay(.65,function() pcall(function()controller.Destroy() end) end)
      end
    else
      warn("마력숲 skill source unavailable: "..tostring(result))
    end
  end
end
player:GetAttributeChangedSignal("ApprovedActionFX"):Connect(function()
  local id,seq=tostring(player:GetAttribute("ApprovedActionFX") or ""):match("^([^:]+):(%d+)$")
  if id and seq then playApprovedMeadowEffect(id) end
end)
remote.OnClientEvent:Connect(function(kind,payload)
  if kind=="MEADOW_REACTION" and payload=="PARRY" then
    playApprovedMeadowEffect("skill-meadow-parry","PARRY_PERFECT_FLASH")
  end
end)

-- [모션·액션] 서버가 승인한 기존 COMBAT 입력만 R15 공용 관절 애니메이션에 연결한다.
-- 서버 피해·이동·콤보 판정, 원래 Animator, 저장값은 수정하지 않는다.
-- 이 경로는 미게시 원본 포즈를 직접 합성하며 실제 재생 QA 전까지 인증된 AnimationTrack이 아니다.
local combatMotionSource = nil
local combatMotionModule = Shared:FindFirstChild("RobloxCommonMotion")
if combatMotionModule then
  local ok, source = pcall(require, combatMotionModule)
  if ok and type(source) == "table" and source.CreateCombatCombo and source.SampleCombatCombo
    and source.MapCombatPoseToR15 and source.BindJointPose then combatMotionSource = source end
end
local RunService = game:GetService("RunService")
local authorizedCombatScopes = {}
for _, action in ipairs(Config.Actions) do
  if action.Kind == "COMBAT" then authorizedCombatScopes[action.Id] = true end
end
local activeCombatCharacter = nil
local activeCombatController = nil
local activeCombatCombo = nil
local activeNativeActionState=nil
local activeNativeActionDuration=0
local activeNativeAvailableJoints={}
local activeCombatStartedAt = 0
local combatPoseTargets = {}
local combatR15Targets = {}
-- 상체 공격만 소유하고 하체의 기존 걷기·달리기 Animator는 유지한다.
local combatUpperJoints = {Waist=true, Neck=true, LeftShoulder=true, RightShoulder=true,
  LeftElbow=true, RightElbow=true, LeftWrist=true, RightWrist=true}
local combatRecoveryUntil = nil
local function finishNativeCombatMotion()
  if activeCombatController then activeCombatController.Destroy(true) end
  if activeCombatCharacter and activeCombatCharacter.Parent then
    activeCombatCharacter:SetAttribute("NativeCombatMotionState", "IDLE")
  end
  activeCombatController = nil
  combatRecoveryUntil = nil
  activeCombatCombo = nil
  activeNativeActionState=nil
  activeNativeActionDuration=0
  table.clear(activeNativeAvailableJoints)
  activeCombatCharacter = nil
  table.clear(combatPoseTargets)
  table.clear(combatR15Targets)
end
player.CharacterAdded:Connect(function() finishNativeCombatMotion() end)
local function startApprovedNativeAction(approved,combatOnly)
  local approvedScope,approvedEvent=tostring(approved or ""):match("^([^:]+):(%d+)$")
  if not approvedEvent then return end
  local action=actionsById[approvedScope]
  if not action then return end
  if combatOnly~=true and action.Kind=="COMBAT" then return end -- avoid duplicate deliveries
  if combatOnly==true and not authorizedCombatScopes[approvedScope] then return end
  local character=player.Character
  local humanoid=character and character:FindFirstChildOfClass("Humanoid")
  if not combatMotionSource or not humanoid or humanoid.Health<=0 then return end
  if humanoid.RigType~=Enum.HumanoidRigType.R15 then
    character:SetAttribute("NativeCombatMotionState","R15_REQUIRED")
    return
  end
  -- Only existing Roblox source authored motion atoms, never synthesized bones.
  local motionAtom=action.MotionAtom or "LIGHT_ATTACK_1"
  if action.Kind=="COMBAT" and not hasStudioAssetAtom("MOTION","ATTACK_LIGHT_1") then
    character:SetAttribute("NativeCombatMotionState","APPROVED_MOTION_ATOM_REQUIRED")
    return
  end
  local motionOk,authoredMotion=pcall(combatMotionSource.Describe,motionAtom)
  if not motionOk or not authoredMotion or authoredMotion.rig~="R15" then
    character:SetAttribute("NativeCombatMotionState","R15_MOTION_SOURCE_REQUIRED")
    return
  end
  local joints={}
  for _,descendant in ipairs(character:GetDescendants()) do
    if descendant:IsA("Motor6D") and descendant.Part0 and descendant.Part1
      and combatUpperJoints[descendant.Name] then
      joints[descendant.Name]=descendant
    end
  end
  if not (joints.Waist and joints.LeftShoulder and joints.RightShoulder
    and joints.LeftElbow and joints.RightElbow) then
    character:SetAttribute("NativeCombatMotionState","COMPATIBLE_R15_JOINTS_REQUIRED")
    return
  end
  if activeCombatCharacter~=character then finishNativeCombatMotion() end
  local compiled=nil
  local sourceState=nil
  if action.Kind=="COMBAT" or approvedScope=="skill-meadow-heavy" or
    approvedScope=="skill-meadow-sweep" then
    local tool=character:FindFirstChildOfClass("Tool")
    local equipment=tool and (tool:GetAttribute("WeaponMotionProfile") or tool.Name) or nil
    local weaponProfile=equipment and combatMotionSource.ResolveWeaponProfile(equipment) or nil
    -- No weapon is a valid, fully animated R15 fighting state. A gathering
    -- tool or unknown equipment does not lock the player out of barehand moves.
    local profile=weaponProfile or "UNARMED"
    local unarmedMoves=nil
    if profile=="UNARMED" then
      if approvedScope=="skill-meadow-heavy" then
        unarmedMoves={"U:UPPERCUT_RIGHT"}
      elseif approvedScope=="skill-meadow-sweep" then
        unarmedMoves={"U:HOOK_LEFT"}
      elseif approvedScope=="scope-coreloop-0-9b2d4dfbc6" then
        unarmedMoves={"U:CROSS_RIGHT"}
      elseif approvedScope=="scope-mobileux-5acfb2eaa6" then
        unarmedMoves={"U:FRONT_KICK_L"}
      else
        unarmedMoves={"U:JAB_LEFT"}
      end
    end
    local ok,combo=pcall(combatMotionSource.CreateCombatCombo,profile,unarmedMoves)
    if not ok or not combo or not combo.steps or #combo.steps==0 then return end
    -- The company source returns frozen combo tables. Select a single actual
    -- server-approved strike without mutating those shared source definitions.
    local index=approvedScope=="skill-meadow-heavy" and #combo.steps or
      approvedScope=="skill-meadow-sweep" and math.min(2,#combo.steps) or
      1+(math.max(0,tonumber(approvedEvent) or 1)-1)%#combo.steps
    local step=table.clone(combo.steps[index])
    step.start=0
    compiled={profileId=combo.profileId,guard=combo.guard,
      steps={step},duration=step.duration,fadeDuration=combo.fadeDuration}
  else
    -- Native actor motion sampler consumes only actual R15 Motor6Ds.
    -- There is no temporary AnimationTrack or fabricated model.
    local states={
      GATHER_SWING="INTERACT",CRAFT_LOOP="INTERACT",INTERACT_USE="INTERACT",
      EMOTE_WAVE="GESTURE",SPRINT="START",CHANNEL_LOOP="GESTURE",
      CAST_BURST="ATTACK",DODGE_LEFT="GESTURE",DODGE_RIGHT="GESTURE",
      BLOCK_HOLD="INTERACT",PARRY_PERFECT="ATTACK",
    }
    sourceState=states[motionAtom]
    if not sourceState or not combatMotionSource.SampleProceduralActorMotion then return end
  end
  activeCombatCharacter=character
  activeCombatCombo=compiled
  activeNativeActionState=sourceState
  activeNativeActionDuration=math.clamp(tonumber(authoredMotion.duration) or .6,.25,1.5)
  activeCombatStartedAt=os.clock()
  combatRecoveryUntil=nil
  table.clear(activeNativeAvailableJoints)
  for name,joint in pairs(joints) do
    if joint then
      local map={Waist="Spine",Neck="Head",LeftShoulder="UpperArmL",
        RightShoulder="UpperArmR",LeftElbow="ForearmL",RightElbow="ForearmR",
        LeftWrist="HandL",RightWrist="HandR"}
      if map[name] then activeNativeAvailableJoints[map[name]]=true end
    end
  end
  if joints.Waist then activeNativeAvailableJoints.Chest=true end
  activeCombatController=activeCombatController or combatMotionSource.BindJointPose(joints,{
    followAnimator=true,response=math.clamp(32*(.46/activeNativeActionDuration),22,42),
  })
  character:SetAttribute("NativeCombatMotionAtom",motionAtom)
  character:SetAttribute("NativeCombatMotionProfile",compiled and compiled.profileId or "R15_ACTOR_SOURCE")
  character:SetAttribute("NativeCombatMotionState","SOURCE_POSE_PLAYING_UNVERIFIED")
end
player:GetAttributeChangedSignal("ApprovedCombatMotion"):Connect(function()
  startApprovedNativeAction(player:GetAttribute("ApprovedCombatMotion"),true)
end)
player:GetAttributeChangedSignal("ApprovedActionMotion"):Connect(function()
  startApprovedNativeAction(player:GetAttribute("ApprovedActionMotion"),false)
end)
RunService.PreSimulation:Connect(function(dt)
  if not (activeCombatController and activeCombatCharacter
    and (activeCombatCombo or activeNativeActionState)) then return end
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
  local finished=false
  if activeCombatCombo then
    local _, _, sampledFinished = combatMotionSource.SampleCombatCombo(
      activeCombatCombo, os.clock() - activeCombatStartedAt, combatPoseTargets
    )
    finished=sampledFinished
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
        comboContinuity = #activeCombatCombo.steps > 1 and .32 or 0,
        intensity = 1, secondary = .55,
      })
    end

  else
    local elapsed=os.clock()-activeCombatStartedAt
    local phase=math.clamp(elapsed/math.max(.1,activeNativeActionDuration),0,1)
    local sampled,matched=combatMotionSource.SampleProceduralActorMotion(
      activeNativeActionState,phase,{
        bodyPlan="BIPED",actorClass="PLAYER",
        availableJoints=activeNativeAvailableJoints,
        mobileTier=nativeTouchEnabled and "LOW" or "HIGH",
        intensity=1,secondary=.55,
      },combatPoseTargets)
    if matched~=true then finishNativeCombatMotion();return end
    finished=elapsed>=activeNativeActionDuration
  end
  combatMotionSource.MapCombatPoseToR15(combatPoseTargets, combatR15Targets)
  activeCombatController.Step(combatR15Targets, dt)
  if finished then combatRecoveryUntil = os.clock() + .18 end
end)

