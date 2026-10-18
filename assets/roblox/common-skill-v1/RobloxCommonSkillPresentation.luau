-- 파일명: assets/roblox/common-skill-v1/RobloxCommonSkillPresentation.luau
-- 역할: 모든 Roblox 게임에서 재사용하는 회사 공용 스킬 연출 베이스
-- 원칙: 표현만 소유한다. 데미지/범위판정/쿨다운/콤보/이동/네트워크 권한은 게임 코드가 소유한다.

local TweenService = game:GetService("TweenService")
local Debris = game:GetService("Debris")

local RobloxCommonSkillPresentation = {}

local DEFAULT = table.freeze({
  Color = Color3.fromRGB(126, 190, 255),
  Accent = Color3.fromRGB(232, 247, 255),
  Duration = 0.45,
  TelegraphRadius = 5,
  TelegraphSegments = 16,
})

local function clamp(value, minValue, maxValue)
  return math.max(minValue, math.min(maxValue, tonumber(value) or minValue))
end

local function tag(instance, atomId)
  instance:SetAttribute("StudioAssetId", atomId)
  instance:SetAttribute("StudioAssetPack", "roblox-common-skill-v1")
  instance:SetAttribute("StudioAssetFamily", "SKILL")
  instance:SetAttribute("CompanyCommonBase", true)
  instance:SetAttribute("CompatibleGameScope", "ALL_ROBLOX_GAMES_WHEN_ROLE_STYLE_AND_PLATFORM_MATCH")
  instance:SetAttribute("ThemeAdaptationRequiredPerGame", true)
  instance:SetAttribute("ProductionVerified", false)
  instance:SetAttribute("RuntimeVerificationState", "PENDING_STUDIO")
  instance:SetAttribute("GameplayAuthority", false)
  instance:SetAttribute("OwnsDamageAuthority", false)
  instance:SetAttribute("OwnsRangeAuthority", false)
  instance:SetAttribute("OwnsCooldownAuthority", false)
  instance:SetAttribute("OwnsMovementAuthority", false)
  instance:SetAttribute("OwnsAudioPlaybackAuthority", false)
  instance:SetAttribute("OwnsCameraAuthority", false)
end

local function neonPart(name, size, color)
  local part = Instance.new("Part")
  part.Name = name
  part.Size = size
  part.Material = Enum.Material.Neon
  part.Color = color
  part.Transparency = 0.08
  part.CanCollide = false
  part.CanTouch = false
  part.CanQuery = false
  part.CastShadow = false
  part.Massless = true
  return part
end


local function createSkillRing(atomId, options)
  options = options or {}
  local parent = options.parent or workspace
  local cframe = typeof(options.cframe) == "CFrame" and options.cframe or CFrame.new()
  local color = typeof(options.color) == "Color3" and options.color or DEFAULT.Color
  local accent = typeof(options.accent) == "Color3" and options.accent or DEFAULT.Accent
  local radius = clamp(options.radius or 3.5, 0.8, 24)
  local count = math.floor(clamp(options.segments or 12, 6, 20))
  local duration = clamp(options.duration or 0.50, 0.12, 3.0)
  local folder = Instance.new("Folder")
  folder.Name = "Common" .. atomId
  tag(folder, atomId)
  folder.Parent = parent
  for i = 1, count do
    local angle = (i - 1) * math.pi * 2 / count
    local nextAngle = i * math.pi * 2 / count
    local arcLength = radius * (nextAngle - angle) * 0.82
    local centerAngle = (angle + nextAngle) * 0.5
    local position = cframe.Position + Vector3.new(math.cos(centerAngle) * radius, options.height or 0.08, math.sin(centerAngle) * radius)
    local segment = neonPart("Segment_" .. tostring(i), Vector3.new(0.10, 0.07, math.max(0.18, arcLength)), i % 2 == 0 and accent or color)
    segment.Anchored = true
    segment.Transparency = clamp(options.transparency or 0.28, 0, 0.85)
    segment.CFrame = CFrame.lookAt(position, position + Vector3.new(-math.sin(centerAngle), 0, math.cos(centerAngle)))
    segment.Parent = folder
    tag(segment, atomId)
    TweenService:Create(segment, TweenInfo.new(duration, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut), {
      Transparency = math.min(1, segment.Transparency + 0.42),
    }):Play()
  end
  folder:SetAttribute("PresentationRadius", radius)
  folder:SetAttribute("PresentationDuration", duration)
  if options.autoCleanup ~= false then Debris:AddItem(folder, duration + 0.15) end
  return folder
end

function RobloxCommonSkillPresentation.AttachCastHand(hostPart, options)
  options = options or {}
  assert(typeof(hostPart) == "Instance" and hostPart:IsA("BasePart"), "COMMON_CAST_HAND_HOST_PART_REQUIRED")

  local color = typeof(options.color) == "Color3" and options.color or DEFAULT.Color
  local accent = typeof(options.accent) == "Color3" and options.accent or DEFAULT.Accent
  local scale = clamp(options.scale or 1, 0.35, 2.5)

  local model = Instance.new("Model")
  model.Name = "CommonCastHand"
  tag(model, "CAST_HAND")
  model.Parent = hostPart

  local core = neonPart("CastCore", Vector3.new(0.34, 0.34, 0.34) * scale, accent)
  core.Shape = Enum.PartType.Ball
  core.Anchored = false
  core.CFrame = hostPart.CFrame
  core.Parent = model
  tag(core, "CAST_HAND")

  local weld = Instance.new("WeldConstraint")
  weld.Name = "CastCoreWeld"
  weld.Part0 = hostPart
  weld.Part1 = core
  weld.Parent = core

  local light = Instance.new("PointLight")
  light.Name = "CastGlow"
  light.Color = color
  light.Brightness = clamp(options.brightness or 1.35, 0.1, 4)
  light.Range = clamp(options.range or 6, 2, 12)
  light.Shadows = false
  light.Parent = core
  tag(light, "CAST_HAND")

  local a0 = Instance.new("Attachment")
  a0.Name = "CastArcA"
  a0.Position = Vector3.new(-0.34, 0, 0) * scale
  a0.Parent = hostPart
  tag(a0, "CAST_HAND")

  local a1 = Instance.new("Attachment")
  a1.Name = "CastArcB"
  a1.Position = Vector3.new(0.34, 0, 0) * scale
  a1.Parent = hostPart
  tag(a1, "CAST_HAND")

  local trail = Instance.new("Trail")
  trail.Name = "CastArc"
  trail.Attachment0 = a0
  trail.Attachment1 = a1
  trail.Lifetime = 0.12
  trail.MinLength = 0.02
  trail.FaceCamera = true
  trail.LightEmission = 0.85
  trail.Color = ColorSequence.new({
    ColorSequenceKeypoint.new(0, accent),
    ColorSequenceKeypoint.new(1, color),
  })
  trail.Transparency = NumberSequence.new({
    NumberSequenceKeypoint.new(0, 0.08),
    NumberSequenceKeypoint.new(1, 1),
  })
  trail.WidthScale = NumberSequence.new({
    NumberSequenceKeypoint.new(0, 0.22 * scale),
    NumberSequenceKeypoint.new(1, 0),
  })
  trail.Parent = hostPart
  tag(trail, "CAST_HAND")

  local controller = {}

  function controller.SetEnabled(enabled)
    local active = enabled == true
    core.Transparency = active and 0.08 or 1
    light.Enabled = active
    trail.Enabled = active
  end

  function controller.Destroy()
    if model.Parent then model:Destroy() end
    if trail.Parent then trail:Destroy() end
    if a0.Parent then a0:Destroy() end
    if a1.Parent then a1:Destroy() end
  end

  return model, controller
end

function RobloxCommonSkillPresentation.CreateTelegraphCircle(options)
  options = options or {}
  local parent = options.parent or workspace
  local cframe = typeof(options.cframe) == "CFrame" and options.cframe or CFrame.new()
  local color = typeof(options.color) == "Color3" and options.color or DEFAULT.Color
  local accent = typeof(options.accent) == "Color3" and options.accent or DEFAULT.Accent
  local radius = clamp(options.radius or DEFAULT.TelegraphRadius, 1.5, 24)
  local count = math.floor(clamp(options.segments or DEFAULT.TelegraphSegments, 8, 20))
  local duration = clamp(options.duration or DEFAULT.Duration, 0.15, 2.5)

  local folder = Instance.new("Folder")
  folder.Name = "CommonTelegraphCircle"
  tag(folder, "TELEGRAPH_CIRCLE")
  folder.Parent = parent

  for i = 1, count do
    local angle = (i - 1) * math.pi * 2 / count
    local nextAngle = i * math.pi * 2 / count
    local arcLength = radius * (nextAngle - angle) * 0.84
    local centerAngle = (angle + nextAngle) * 0.5
    local position = cframe.Position + Vector3.new(math.cos(centerAngle) * radius, 0.06, math.sin(centerAngle) * radius)

    local segment = neonPart(
      "Segment_" .. tostring(i),
      Vector3.new(0.12, 0.08, math.max(0.22, arcLength)),
      i % 2 == 0 and accent or color
    )
    segment.Anchored = true
    segment.Transparency = 0.24
    segment.CFrame = CFrame.lookAt(position, position + Vector3.new(-math.sin(centerAngle), 0, math.cos(centerAngle)))
    segment.Parent = folder
    tag(segment, "TELEGRAPH_CIRCLE")

    TweenService:Create(segment, TweenInfo.new(duration, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut), {
      Transparency = 0.62,
    }):Play()
  end

  folder:SetAttribute("PresentationRadius", radius)
  folder:SetAttribute("SegmentCount", count)
  folder:SetAttribute("PresentationDuration", duration)

  if options.autoCleanup ~= false then
    Debris:AddItem(folder, duration + 0.12)
  end
  return folder
end

function RobloxCommonSkillPresentation.CreateImpactSmall(options)
  options = options or {}
  local vfx = options.vfx
  assert(type(vfx) == "table" and type(vfx.CreateImpactFlash) == "function", "COMMON_VFX_MODULE_REQUIRED")
  return vfx.CreateImpactFlash({
    parent = options.parent,
    cframe = options.cframe,
    color = options.color,
    accent = options.accent,
    duration = clamp(options.duration or 0.22, 0.08, 0.50),
    scale = clamp(options.scale or 0.55, 0.20, 1.25),
  })
end


function RobloxCommonSkillPresentation.CreateProjectileOrb(options)
  options = options or {}
  local parent = options.parent or workspace
  local cframe = typeof(options.cframe) == "CFrame" and options.cframe or CFrame.new()
  local color = typeof(options.color) == "Color3" and options.color or DEFAULT.Color
  local scale = clamp(options.scale or 1, 0.25, 4)
  local orb = neonPart("CommonProjectileOrb", Vector3.new(0.72, 0.72, 0.72) * scale, color)
  orb.Shape = Enum.PartType.Ball
  orb.Anchored = true
  orb.CFrame = cframe
  orb.Parent = parent
  tag(orb, "PROJECTILE_ORB")
  orb:SetAttribute("ProjectileMotionAuthority", false)
  orb:SetAttribute("VisualTravelHintOnly", true)
  return orb
end

function RobloxCommonSkillPresentation.AttachSkillTrail(hostPart, options)
  options = options or {}
  assert(typeof(hostPart) == "Instance" and hostPart:IsA("BasePart"), "COMMON_SKILL_TRAIL_HOST_PART_REQUIRED")
  local color = typeof(options.color) == "Color3" and options.color or DEFAULT.Color
  local width = clamp(options.width or 0.28, 0.05, 1.4)
  local lifetime = clamp(options.lifetime or 0.16, 0.05, 0.45)
  local a0 = Instance.new("Attachment")
  a0.Name = "SkillTrailA"
  a0.Position = Vector3.new(0, 0, -0.5)
  a0.Parent = hostPart
  tag(a0, "SKILL_TRAIL")
  local a1 = Instance.new("Attachment")
  a1.Name = "SkillTrailB"
  a1.Position = Vector3.new(0, 0, 0.5)
  a1.Parent = hostPart
  tag(a1, "SKILL_TRAIL")
  local trail = Instance.new("Trail")
  trail.Name = "CommonSkillTrail"
  trail.Attachment0 = a0
  trail.Attachment1 = a1
  trail.Lifetime = lifetime
  trail.FaceCamera = true
  trail.LightEmission = 0.8
  trail.Color = ColorSequence.new(color)
  trail.Transparency = NumberSequence.new({NumberSequenceKeypoint.new(0,0.08),NumberSequenceKeypoint.new(1,1)})
  trail.WidthScale = NumberSequence.new({NumberSequenceKeypoint.new(0,width),NumberSequenceKeypoint.new(1,0)})
  trail.Parent = hostPart
  tag(trail, "SKILL_TRAIL")
  return trail,{Destroy=function() trail:Destroy();a0:Destroy();a1:Destroy() end}
end

function RobloxCommonSkillPresentation.CreateAreaField(options)
  options = options or {}
  options.radius = options.radius or 5.5
  options.duration = options.duration or 0.72
  return createSkillRing("AREA_FIELD", options)
end

function RobloxCommonSkillPresentation.CreateChannelRing(options)
  options = options or {}
  options.radius = options.radius or 2.5
  options.duration = options.duration or 1.2
  return createSkillRing("CHANNEL_RING", options)
end

function RobloxCommonSkillPresentation.CreateBeamLine(options)
  options = options or {}
  local parent = options.parent or workspace
  local startPos = typeof(options.startPosition) == "Vector3" and options.startPosition or (typeof(options.cframe)=="CFrame" and options.cframe.Position or Vector3.zero)
  local endPos = typeof(options.endPosition) == "Vector3" and options.endPosition or startPos + Vector3.new(0,0,-clamp(options.length or 8,1,40))
  local delta = endPos - startPos
  local length = math.max(0.1, delta.Magnitude)
  local beam = neonPart("CommonBeamLine", Vector3.new(clamp(options.width or 0.22,0.05,1.2),clamp(options.width or 0.22,0.05,1.2),length), typeof(options.color)=="Color3" and options.color or DEFAULT.Color)
  beam.Anchored = true
  local mid = startPos + delta * 0.5
  beam.CFrame = CFrame.lookAt(mid,endPos)
  beam.Parent = parent
  tag(beam,"BEAM_LINE")
  beam:SetAttribute("DamageAuthority",false)
  beam:SetAttribute("HitDetectionAuthority",false)
  if options.autoCleanup ~= false then Debris:AddItem(beam,clamp(options.duration or 0.30,0.08,2.0)) end
  return beam
end

function RobloxCommonSkillPresentation.CreateSummonMarker(options)
  options = options or {}
  options.radius = options.radius or 3.2
  options.duration = options.duration or 0.85
  local folder=createSkillRing("SUMMON_MARKER",options)
  folder:SetAttribute("SpawnAuthority",false)
  folder:SetAttribute("SummonPresentationOnly",true)
  return folder
end

function RobloxCommonSkillPresentation.AttachDashStreak(hostPart, options)
  options = options or {}
  options.width = options.width or 0.42
  options.lifetime = options.lifetime or 0.12
  local trail,controller=RobloxCommonSkillPresentation.AttachSkillTrail(hostPart,options)
  tag(trail,"DASH_STREAK")
  trail:SetAttribute("MovementAuthority",false)
  return trail,controller
end

function RobloxCommonSkillPresentation.CreateShieldShell(options)
  options = options or {}
  local parent = options.parent or workspace
  local color = typeof(options.color)=="Color3" and options.color or Color3.fromRGB(141,204,255)
  local scale = clamp(options.scale or 1,0.4,5)
  local shell=neonPart("CommonShieldShell",Vector3.new(4.2,4.2,4.2)*scale,color)
  shell.Shape=Enum.PartType.Ball
  shell.Transparency=clamp(options.transparency or 0.68,0.25,0.90)
  shell.Anchored=true
  shell.CFrame=typeof(options.cframe)=="CFrame" and options.cframe or CFrame.new()
  shell.Parent=parent
  tag(shell,"SHIELD_SHELL")
  shell:SetAttribute("DamageReductionAuthority",false)
  return shell
end

function RobloxCommonSkillPresentation.CreateHealField(options)
  options=options or {}
  options.color=options.color or Color3.fromRGB(145,255,188)
  options.accent=options.accent or Color3.fromRGB(225,255,237)
  options.radius=options.radius or 4
  options.duration=options.duration or 0.72
  local folder=createSkillRing("HEAL_FIELD",options)
  folder:SetAttribute("HealingAuthority",false)
  return folder
end

function RobloxCommonSkillPresentation.CreateAuraRing(options)
  options=options or {}
  options.radius=options.radius or 3.6
  options.duration=options.duration or 1.0
  local folder=createSkillRing("AURA_RING",options)
  folder:SetAttribute("AuraEffectAuthority",false)
  return folder
end

function RobloxCommonSkillPresentation.CreateStatusApplyMark(options)
  options=options or {}
  options.radius=options.radius or 1.8
  options.duration=options.duration or 0.42
  local folder=createSkillRing("STATUS_APPLY_MARK",options)
  folder:SetAttribute("StatusAuthority",false)
  return folder
end

function RobloxCommonSkillPresentation.CreateStatusCleanseBurst(options)
  options=options or {}
  options.color=options.color or Color3.fromRGB(226,248,255)
  options.accent=options.accent or Color3.fromRGB(119,218,201)
  options.radius=options.radius or 2.2
  options.duration=options.duration or 0.46
  local folder=createSkillRing("STATUS_CLEANSE_BURST",options)
  folder:SetAttribute("StatusCleanseAuthority",false)
  return folder
end

function RobloxCommonSkillPresentation.CreateInterruptFlash(options)
  options=options or {}
  options.color=options.color or Color3.fromRGB(255,219,163)
  options.accent=options.accent or Color3.fromRGB(245,103,91)
  options.radius=options.radius or 1.6
  options.duration=options.duration or 0.26
  local folder=createSkillRing("INTERRUPT_FLASH",options)
  folder:SetAttribute("InterruptAuthority",false)
  return folder
end

function RobloxCommonSkillPresentation.CreateSkillIconBadge(options)
  options=options or {}
  local root=Instance.new("Frame")
  root.Name="CommonSkillIconBadge"
  root.Size=options.size or UDim2.fromOffset(56,56)
  root.BackgroundColor3=typeof(options.color)=="Color3" and options.color or Color3.fromRGB(42,58,76)
  root.BackgroundTransparency=0.08
  root.BorderSizePixel=0
  tag(root,"SKILL_ICON_BADGE")
  local corner=Instance.new("UICorner")
  corner.CornerRadius=UDim.new(0,12)
  corner.Parent=root
  local symbol=Instance.new("TextLabel")
  symbol.Name="Symbol"
  symbol.Size=UDim2.fromScale(1,1)
  symbol.BackgroundTransparency=1
  symbol.Text=tostring(options.symbol or "◆")
  symbol.TextScaled=true
  symbol.TextColor3=typeof(options.accent)=="Color3" and options.accent or DEFAULT.Accent
  symbol.Parent=root
  tag(symbol,"SKILL_ICON_BADGE")
  root.Parent=options.parent
  return root
end

function RobloxCommonSkillPresentation.CreateAudioRoleMarker(options)
  options=options or {}
  local folder=Instance.new("Folder")
  folder.Name="CommonSkillAudioRole"
  tag(folder,"AUDIO_ROLE_MARKER")
  folder:SetAttribute("RequestedAudioRole",tostring(options.audioRole or "SKILL_CAST"))
  folder:SetAttribute("AudioPlaybackAuthority",false)
  folder.Parent=options.parent
  return folder
end

function RobloxCommonSkillPresentation.CreateCameraRoleMarker(options)
  options=options or {}
  local folder=Instance.new("Folder")
  folder.Name="CommonSkillCameraRole"
  tag(folder,"CAMERA_ROLE_MARKER")
  folder:SetAttribute("RequestedCameraRole",tostring(options.cameraRole or "SUBTLE_RESPONSE"))
  folder:SetAttribute("CameraMutationAuthority",false)
  folder.Parent=options.parent
  return folder
end

function RobloxCommonSkillPresentation.CreateMobileDensityVariant(options)
  options=options or {}
  options.segments=math.min(8,math.floor(clamp(options.segments or 8,6,8)))
  options.radius=options.radius or 2.8
  options.duration=options.duration or 0.32
  local folder=createSkillRing("MOBILE_DENSITY_VARIANT",options)
  folder:SetAttribute("MobileDensityTier","LOW")
  folder:SetAttribute("SegmentCap",8)
  return folder
end

function RobloxCommonSkillPresentation.Create(atomId, options)
  local id = string.upper(tostring(atomId or ""))
  options = options or {}
  if id == "CAST_HAND" then
    assert(options.hostPart, "COMMON_CAST_HAND_OPTIONS_HOST_PART_REQUIRED")
    return RobloxCommonSkillPresentation.AttachCastHand(options.hostPart, options)
  elseif id == "TELEGRAPH_CIRCLE" then
    return RobloxCommonSkillPresentation.CreateTelegraphCircle(options)
  elseif id == "IMPACT_SMALL" then
    return RobloxCommonSkillPresentation.CreateImpactSmall(options)
  elseif id == "PROJECTILE_ORB" then
    return RobloxCommonSkillPresentation.CreateProjectileOrb(options)
  elseif id == "SKILL_TRAIL" then
    assert(options.hostPart, "COMMON_SKILL_TRAIL_OPTIONS_HOST_PART_REQUIRED")
    return RobloxCommonSkillPresentation.AttachSkillTrail(options.hostPart, options)
  elseif id == "AREA_FIELD" then
    return RobloxCommonSkillPresentation.CreateAreaField(options)
  elseif id == "CHANNEL_RING" then
    return RobloxCommonSkillPresentation.CreateChannelRing(options)
  elseif id == "BEAM_LINE" then
    return RobloxCommonSkillPresentation.CreateBeamLine(options)
  elseif id == "SUMMON_MARKER" then
    return RobloxCommonSkillPresentation.CreateSummonMarker(options)
  elseif id == "DASH_STREAK" then
    assert(options.hostPart, "COMMON_DASH_STREAK_OPTIONS_HOST_PART_REQUIRED")
    return RobloxCommonSkillPresentation.AttachDashStreak(options.hostPart, options)
  elseif id == "SHIELD_SHELL" then
    return RobloxCommonSkillPresentation.CreateShieldShell(options)
  elseif id == "HEAL_FIELD" then
    return RobloxCommonSkillPresentation.CreateHealField(options)
  elseif id == "AURA_RING" then
    return RobloxCommonSkillPresentation.CreateAuraRing(options)
  elseif id == "STATUS_APPLY_MARK" then
    return RobloxCommonSkillPresentation.CreateStatusApplyMark(options)
  elseif id == "STATUS_CLEANSE_BURST" then
    return RobloxCommonSkillPresentation.CreateStatusCleanseBurst(options)
  elseif id == "INTERRUPT_FLASH" then
    return RobloxCommonSkillPresentation.CreateInterruptFlash(options)
  elseif id == "SKILL_ICON_BADGE" then
    return RobloxCommonSkillPresentation.CreateSkillIconBadge(options)
  elseif id == "AUDIO_ROLE_MARKER" then
    return RobloxCommonSkillPresentation.CreateAudioRoleMarker(options)
  elseif id == "CAMERA_ROLE_MARKER" then
    return RobloxCommonSkillPresentation.CreateCameraRoleMarker(options)
  elseif id == "MOBILE_DENSITY_VARIANT" then
    return RobloxCommonSkillPresentation.CreateMobileDensityVariant(options)
  end
  error("UNKNOWN_COMMON_SKILL_ATOM: " .. tostring(atomId))
end

function RobloxCommonSkillPresentation.Audit()
  return table.freeze({
    version = 2,
    packId = "roblox-common-skill-v1",
    atoms = table.freeze({
      "CAST_HAND","TELEGRAPH_CIRCLE","IMPACT_SMALL","PROJECTILE_ORB","SKILL_TRAIL","AREA_FIELD","CHANNEL_RING","BEAM_LINE",
      "SUMMON_MARKER","DASH_STREAK","SHIELD_SHELL","HEAL_FIELD","AURA_RING","STATUS_APPLY_MARK","STATUS_CLEANSE_BURST",
      "INTERRUPT_FLASH","SKILL_ICON_BADGE","AUDIO_ROLE_MARKER","CAMERA_ROLE_MARKER","MOBILE_DENSITY_VARIANT"
    }),
    atomCount = 20,
    companyCommonBase = true,
    compatibleGameScope = "ALL_ROBLOX_GAMES_WHEN_ROLE_STYLE_AND_PLATFORM_MATCH",
    dependencyPackIds = table.freeze({"roblox-common-vfx-v1"}),
    impactSmallReusesCommonVfx = true,
    gameplayAuthority = false,
    ownsDamageAuthority = false,
    ownsRangeAuthority = false,
    ownsCooldownAuthority = false,
    ownsMovementAuthority = false,
    productionVerified = false,
    runtimeVerificationRequired = true,
    mobileTelegraphSegmentCap = 20,
    mobileDensitySegmentCap = 8,
    audioPlaybackAuthority = false,
    cameraAuthority = false,
  })
end

return table.freeze(RobloxCommonSkillPresentation)
