local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")
local ContextActionService = game:GetService("ContextActionService")
local TweenService = game:GetService("TweenService")

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
  ENVIRONMENT = "APPLIED",
  WEAPON = "NOT_APPLICABLE",
  SKILL = "NOT_APPLICABLE",
  MATERIAL = "APPLIED",
  AUDIO = "NOT_APPLICABLE",
  VFX = "APPLIED",
  UI = "APPLIED",
  MOTION = "APPLIED",
  PROP = "APPLIED",
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
local VERIFIED_EXTERNAL_LEARNING_NATIVE_BINDING_VERSION = 7
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

-- Roblox studio-grade native character motion binding.
local verifiedLearningRunService = game:GetService("RunService")
local verifiedLearningWorkspace = game:GetService("Workspace")
local verifiedLearningUserInputService = game:GetService("UserInputService")
local verifiedLearningMotionStates = {}
local verifiedLearningMotionFps = 60

local function verifiedLearningHorizontal(v)
  return Vector3.new(v.X, 0, v.Z)
end

local function verifiedLearningBindTrack(state, track)
  if state.tracks[track] then return end
  state.tracks[track] = true
  state.maxTrackCount = math.max(state.maxTrackCount, #state.animator:GetPlayingAnimationTracks())
  for _, markerName in ipairs({ "Impact", "Hit", "Contact" }) do
    local ok, signal = pcall(function()
      return track:GetMarkerReachedSignal(markerName)
    end)
    if ok and signal then
      signal:Connect(function()
        state.contactMarkers += 1
        state.character:SetAttribute("JaewoonMotionLastContactMarker", markerName)
        state.character:SetAttribute("JaewoonMotionContactCount", state.contactMarkers)
      end)
    end
  end
end

local function verifiedLearningCreateFootIk(state, side)
  if state.humanoid.RigType ~= Enum.HumanoidRigType.R15 then return end
  local upper = state.character:FindFirstChild(side .. "UpperLeg", true)
  local foot = state.character:FindFirstChild(side .. "Foot", true)
  if not upper or not foot or not upper:IsA("BasePart") or not foot:IsA("BasePart") then return end

  local target = Instance.new("Attachment")
  target.Name = "JaewoonMotion" .. side .. "FootTarget"
  target.Parent = state.root

  local control = Instance.new("IKControl")
  control.Name = "JaewoonMotion" .. side .. "FootIK"
  control.Type = Enum.IKControlType.Position
  control.ChainRoot = upper
  control.EndEffector = foot
  control.Target = target
  control.SmoothTime = 0.055
  control.Weight = 0
  control.Priority = 1
  control.Parent = state.humanoid

  table.insert(state.feet, {
    foot = foot,
    target = target,
    control = control,
    lastPosition = nil,
  })
end

local function verifiedLearningBindMotionActor(character)
  if verifiedLearningMotionStates[character] or not character:IsA("Model") then return end
  local humanoid = character:FindFirstChildOfClass("Humanoid")
  local rootPart = character:FindFirstChild("HumanoidRootPart")
  if not humanoid or not rootPart or not rootPart:IsA("BasePart") then return end
  local animator = humanoid:FindFirstChildOfClass("Animator")
  if not animator then return end

  local state = {
    character = character,
    humanoid = humanoid,
    root = rootPart,
    animator = animator,
    feet = {},
    tracks = {},
    elapsed = 0,
    updateClock = 0,
    lastRootPosition = rootPart.Position,
    lastJointTransform = nil,
    jointSamples = 0,
    locomotionSamples = 0,
    footSlideSamples = 0,
    footSlideNormalizedMax = 0,
    maxTrackCount = 0,
    hitReactionCount = 0,
    contactMarkers = 0,
    hitKick = 0,
    reported = false,
    motorCount = 0,
    motionJoint = nil,
    isLocalPlayer = verifiedLearningPlayers:GetPlayerFromCharacter(character) == verifiedLearningPlayer,
  }

  for _, descendant in ipairs(character:GetDescendants()) do
    if descendant:IsA("Motor6D") then
      state.motorCount += 1
      if not state.motionJoint or descendant.Name == "Waist" then
        state.motionJoint = descendant
      end
    end
  end

  local params = RaycastParams.new()
  params.FilterType = Enum.RaycastFilterType.Exclude
  params.FilterDescendantsInstances = { character }
  state.raycastParams = params

  verifiedLearningCreateFootIk(state, "Left")
  verifiedLearningCreateFootIk(state, "Right")
  verifiedLearningMotionStates[character] = state

  for _, track in ipairs(animator:GetPlayingAnimationTracks()) do
    verifiedLearningBindTrack(state, track)
  end
  animator.AnimationPlayed:Connect(function(track)
    verifiedLearningBindTrack(state, track)
  end)

  humanoid.Running:Connect(function(speed)
    local ratio = speed > 0.1 and math.clamp(speed / math.max(humanoid.WalkSpeed, 1), 0.72, 1.35) or 1
    for _, track in ipairs(animator:GetPlayingAnimationTracks()) do
      state.maxTrackCount = math.max(state.maxTrackCount, #animator:GetPlayingAnimationTracks())
      if track.Priority == Enum.AnimationPriority.Movement then
        track:AdjustSpeed(ratio)
      end
    end
  end)

  local lastHealth = humanoid.Health
  humanoid.HealthChanged:Connect(function(health)
    if health + 0.01 < lastHealth then
      state.hitKick = 1
      state.hitReactionCount += 1
      character:SetAttribute("JaewoonMotionHitReactionCount", state.hitReactionCount)
    end
    lastHealth = health
  end)

  character:SetAttribute("JaewoonNativeMotionBound", true)
  character:SetAttribute("JaewoonNativeMotionAnimator", true)
  character:SetAttribute("JaewoonNativeMotionMotorCount", state.motorCount)
  character:SetAttribute("JaewoonNativeMotionFootIkCount", #state.feet)

  if state.isLocalPlayer then
    print("ROBLOX_CHARACTER_MOTION_RUNTIME=START actor=PLAYER animator=YES motors=" .. state.motorCount .. " ik=" .. #state.feet)
  end
end

local function verifiedLearningMotionFailureReason(state)
  if state.motorCount < 3 then return "ARTICULATED_RIG_REQUIRED" end
  if state.maxTrackCount < 1 then return "ANIMATION_TRACK_REQUIRED" end
  if state.jointSamples < 3 then return "JOINT_ACTIVITY_REQUIRED" end
  if state.humanoid.RigType == Enum.HumanoidRigType.R15 and #state.feet < 2 then return "FOOT_IK_REQUIRED" end
  if state.locomotionSamples < 3 then return "LOCOMOTION_SAMPLE_REQUIRED" end
  if state.footSlideSamples < 2 then return "FOOT_CONTACT_SAMPLE_REQUIRED" end
  if state.footSlideNormalizedMax > 0.035 then return "FOOT_SLIDE_EXCEEDED" end
  if verifiedLearningMotionFps < 27 then return "MOBILE_FRAME_FLOOR_30_FAILED" end
  return nil
end

verifiedLearningRunService.RenderStepped:Connect(function(dt)
  dt = math.min(dt, 0.1)
  local instantFps = 1 / math.max(dt, 1 / 240)
  verifiedLearningMotionFps += (instantFps - verifiedLearningMotionFps) * math.clamp(dt * 3, 0, 1)

  for character, state in pairs(verifiedLearningMotionStates) do
    if not character.Parent or state.humanoid.Health <= 0 then
      if not character.Parent then verifiedLearningMotionStates[character] = nil end
    else
      state.elapsed += dt

      if state.motionJoint then
        local currentTransform = state.motionJoint.Transform
        if state.lastJointTransform then
          local delta = state.lastJointTransform:ToObjectSpace(currentTransform)
          local rx, ry, rz = delta:ToOrientation()
          if delta.Position.Magnitude > 0.001 or math.abs(rx) + math.abs(ry) + math.abs(rz) > math.rad(0.2) then
            state.jointSamples += 1
          end
        end
        state.lastJointTransform = currentTransform
        if state.hitKick > 0.001 then
          state.motionJoint.Transform = currentTransform * CFrame.Angles(math.rad(-5) * state.hitKick, 0, 0)
          state.hitKick *= math.exp(-dt * 10)
        end
      end

      state.updateClock += dt
      local updateHz = 60
      if verifiedLearningUserInputService.TouchEnabled then
        updateHz = verifiedLearningMotionFps >= 50 and 60 or (verifiedLearningMotionFps >= 27 and 30 or 15)
      end

      if state.updateClock >= 1 / updateHz then
        state.updateClock = 0
        local rootPosition = state.root.Position
        local rootDelta = (verifiedLearningHorizontal(rootPosition) - verifiedLearningHorizontal(state.lastRootPosition)).Magnitude
        local rootSpeed = verifiedLearningHorizontal(state.root.AssemblyLinearVelocity).Magnitude
        local slideMin = nil

        for _, footState in ipairs(state.feet) do
          local foot = footState.foot
          local hit = verifiedLearningWorkspace:Raycast(
            foot.Position + Vector3.new(0, 0.65, 0),
            Vector3.new(0, -1.8, 0),
            state.raycastParams
          )
          if hit then
            local groundGap = math.abs((foot.Position.Y - foot.Size.Y * 0.5) - hit.Position.Y)
            footState.target.WorldCFrame = CFrame.new(hit.Position + hit.Normal * (foot.Size.Y * 0.5 + 0.02))
            footState.control.Weight = groundGap <= 0.35 and (rootSpeed < 1 and 0.5 or 0.32) or 0.12
            if footState.lastPosition and rootDelta > 0.02 and groundGap <= 0.12 then
              local footDelta = (verifiedLearningHorizontal(foot.Position) - verifiedLearningHorizontal(footState.lastPosition)).Magnitude
              local normalized = footDelta / math.max(state.humanoid.HipHeight + 2, 4)
              slideMin = slideMin and math.min(slideMin, normalized) or normalized
            end
          else
            footState.control.Weight = 0
          end
          footState.lastPosition = foot.Position
        end

        if rootDelta > 0.02 then
          state.locomotionSamples += 1
          if slideMin then
            state.footSlideSamples += 1
            state.footSlideNormalizedMax = math.max(state.footSlideNormalizedMax, slideMin)
          end
        end
        state.lastRootPosition = rootPosition
        state.character:SetAttribute("JaewoonNativeMotionFps", math.floor(verifiedLearningMotionFps + 0.5))
        state.character:SetAttribute("JaewoonNativeMotionFootSlide", state.footSlideNormalizedMax)
        state.character:SetAttribute("JaewoonNativeMotionTier", updateHz)
      end

      if state.isLocalPlayer and not state.reported then
        local readyToReport = state.elapsed >= 5 and state.locomotionSamples >= 3
        local forcedReport = state.elapsed >= 8
        if readyToReport or forcedReport then
          state.reported = true
          local reason = verifiedLearningMotionFailureReason(state)
          local fields = " fps=" .. string.format("%.1f", verifiedLearningMotionFps)
            .. " tier=" .. tostring(verifiedLearningUserInputService.TouchEnabled and (verifiedLearningMotionFps >= 50 and 60 or (verifiedLearningMotionFps >= 27 and 30 or 15)) or 60)
            .. " motors=" .. state.motorCount
            .. " tracks=" .. state.maxTrackCount
            .. " joints=" .. state.jointSamples
            .. " ik=" .. #state.feet
            .. " slide=" .. string.format("%.4f", state.footSlideNormalizedMax)
            .. " slideSamples=" .. state.footSlideSamples
            .. " contacts=" .. state.contactMarkers
            .. " hits=" .. state.hitReactionCount
          if reason then
            print("ROBLOX_CHARACTER_MOTION_RUNTIME=FAIL reason=" .. reason .. fields)
          else
            print("ROBLOX_CHARACTER_MOTION_RUNTIME=PASS" .. fields)
          end
        end
      end
    end
  end
end)

local function verifiedLearningTryBindMotionInstance(instance)
  if instance:IsA("Humanoid") and instance.Parent and instance.Parent:IsA("Model") then
    task.defer(verifiedLearningBindMotionActor, instance.Parent)
  elseif instance:IsA("Model") and instance:FindFirstChildOfClass("Humanoid") then
    task.defer(verifiedLearningBindMotionActor, instance)
  end
end

if verifiedLearningPlayer.Character then
  task.defer(verifiedLearningBindMotionActor, verifiedLearningPlayer.Character)
end
verifiedLearningPlayer.CharacterAdded:Connect(function(character)
  task.defer(verifiedLearningBindMotionActor, character)
end)
for _, descendant in ipairs(verifiedLearningWorkspace:GetDescendants()) do
  if descendant:IsA("Humanoid") and descendant.Parent and descendant.Parent:IsA("Model") then
    task.defer(verifiedLearningBindMotionActor, descendant.Parent)
  end
end
verifiedLearningWorkspace.DescendantAdded:Connect(verifiedLearningTryBindMotionInstance)

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
root:SetAttribute("StudioAssetAtoms", table.concat(studioAssetFamily("UI"), ","))

root.Name = "Root"
root.AnchorPoint = Vector2.new(0.5, 1)
root.Position = UDim2.fromScale(0.5, 0.98)
root.Size = UDim2.new(1, -24, 0, 360)
root.BackgroundTransparency = 0.15
root.BackgroundColor3 = Color3.fromRGB(18, 28, 48)
root.Parent = gui

-- 생존 시스템에서 선택된 내부 자산 계열을 실제 Roblox 표현 소비자로 연결한다.
local function applySurvivalCharacterPresentation(character)
  if #studioAssetFamily("CHARACTER") == 0 then return end
  local humanoid = character:FindFirstChildOfClass("Humanoid")
  local torso = character:FindFirstChild("UpperTorso") or character:FindFirstChild("Torso")
  if humanoid and torso and torso:IsA("BasePart") then
    torso.Material = Enum.Material.Fabric
  end
end

local function applySurvivalCreaturePresentation(enemy)
  if #studioAssetFamily("CREATURE") == 0 or not enemy:IsA("Model") then return end
  local humanoid = enemy:FindFirstChildOfClass("Humanoid")
  local rootPart = enemy:FindFirstChild("HumanoidRootPart")
  if humanoid and rootPart and rootPart:IsA("BasePart") then
    rootPart.Material = Enum.Material.SmoothPlastic
  end
end

task.defer(function()
  local survivalWorld = workspace:FindFirstChild("SurvivalWorld") or workspace:WaitForChild("SurvivalWorld", 5)
  if not survivalWorld then return end

  local camp = survivalWorld:FindFirstChild("SurvivalLandmarkCamp")
  if #studioAssetFamily("ENVIRONMENT") > 0 and camp and camp:IsA("BasePart") then
    camp.Material = Enum.Material.Slate
  end

  local workbench = survivalWorld:FindFirstChild("SurvivalObjectiveWorkbench")
  if #studioAssetFamily("PROP") > 0 and workbench and workbench:IsA("BasePart") then
    workbench.Material = Enum.Material.WoodPlanks
  end
  if #studioAssetFamily("MATERIAL") > 0 and workbench and workbench:IsA("BasePart") then
    workbench.Material = Enum.Material.Wood
  end

  local enemies = survivalWorld:FindFirstChild("Enemies")
  if enemies then
    for _, enemy in ipairs(enemies:GetChildren()) do applySurvivalCreaturePresentation(enemy) end
    enemies.ChildAdded:Connect(applySurvivalCreaturePresentation)
  end

  if #studioAssetFamily("MOTION") > 0 then
    local settledPosition = root.Position
    root.Position = UDim2.new(settledPosition.X.Scale, settledPosition.X.Offset, 1.03, 0)
    TweenService:Create(
      root,
      TweenInfo.new(0.22, Enum.EasingStyle.Quint, Enum.EasingDirection.Out),
      { Position = settledPosition }
    ):Play()
  end
end)

if player.Character then task.defer(applySurvivalCharacterPresentation, player.Character) end
player.CharacterAdded:Connect(applySurvivalCharacterPresentation)
local title = Instance.new("TextLabel")
title.Name = "Title"
title.Size = UDim2.new(1, -20, 0, 44)
title.Position = UDim2.fromOffset(10, 8)
title.BackgroundTransparency = 1
title.TextColor3 = Color3.fromRGB(245, 248, 255)
title.TextScaled = true
title.Text = string.format("%s · %s · %s", Config.GameName, Config.Genre, Config.PlayMode)
title.Parent = root
local status = Instance.new("TextLabel")
status.Name = "Status"
status.Size = UDim2.new(1, -20, 0, 48)
status.Position = UDim2.fromOffset(10, 54)
status.BackgroundColor3 = Color3.fromRGB(10, 17, 30)
status.TextColor3 = Color3.fromRGB(220, 232, 250)
status.TextScaled = true
status.Parent = root

local list = Instance.new("ScrollingFrame")
list.Name = "ApprovedActions"
list.Size = UDim2.new(1, -20, 1, -112)
list.Position = UDim2.fromOffset(10, 106)
list.BackgroundTransparency = 1
list.BorderSizePixel = 0
list.AutomaticCanvasSize = Enum.AutomaticSize.Y
list.CanvasSize = UDim2.new()
list.ScrollBarThickness = 6
list.Parent = root
local layout = Instance.new("UIListLayout")
layout.Padding = UDim.new(0, 8)
layout.SortOrder = Enum.SortOrder.LayoutOrder
layout.Parent = list
for index, action in ipairs(Config.Actions) do
  local button = Instance.new("TextButton")
  button.Name = "ScopeAction" .. index
  button.LayoutOrder = index
  button.Size = UDim2.new(1, -4, 0, 56)
  button.BackgroundColor3 = Color3.fromRGB(235, 242, 255)
  button.TextColor3 = Color3.fromRGB(16, 24, 40)
  button.TextWrapped = true
  button.TextScaled = true
  button.Text = string.format("%d. %s [%s]", index, action.Label, action.Kind)
  button.Parent = list
  button.Activated:Connect(function() remote:FireServer(action.Id) end)
end
local watched = {"Score","Coins","Level","Progress","Health","Wave","Position","Objective","Combo","EnemyHealth","PuzzleChain","Towers","BaseHealth","SocialBond","SharedObjective","RoundScore","CurrentDay","DayPhase","ResourceWood","ResourceStone","InventoryItems","EquippedToolTier","RecipeUnlock","SurvivalRecord","EnemyKills","LastApprovedScope"}
local function render()
  local phase = (player:GetAttribute("DayPhase") or 0) == 1 and "밤" or "낮"
  status.Text = string.format(
    "%d일 %s · HP %d · Wave %d · 목재 %d / 돌 %d · 장비 T%d",
    player:GetAttribute("CurrentDay") or 1,
    phase,
    player:GetAttribute("Health") or 100,
    player:GetAttribute("Wave") or 1,
    player:GetAttribute("ResourceWood") or 0,
    player:GetAttribute("ResourceStone") or 0,
    player:GetAttribute("EquippedToolTier") or 0
  )
end
for _, name in ipairs(watched) do player:GetAttributeChangedSignal(name):Connect(render) end
render()

if #Config.Actions > 0 then
  ContextActionService:BindAction("VibePrimaryAction", function(_, inputState)
    if inputState == Enum.UserInputState.Begin then remote:FireServer(Config.Actions[1].Id) end
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
