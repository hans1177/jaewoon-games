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


function RobloxCommonSkillPresentation.AttachCastAura(hostPart, options)
  options = options or {}
  assert(typeof(hostPart) == "Instance" and hostPart:IsA("BasePart"), "COMMON_CAST_AURA_HOST_PART_REQUIRED")
  local color = typeof(options.color) == "Color3" and options.color or DEFAULT.Color
  local scale = clamp(options.scale or 1, 0.4, 3.0)

  local model = Instance.new("Model")
  model.Name = "CommonCastAura"
  tag(model, "CAST_AURA")
  model.Parent = hostPart

  local ring = neonPart("AuraRing", Vector3.new(0.10, 3.2, 3.2) * scale, color)
  ring.Shape = Enum.PartType.Cylinder
  ring.Anchored = false
  ring.Transparency = 0.42
  ring.CFrame = hostPart.CFrame * CFrame.new(0, -1.6 * scale, 0) * CFrame.Angles(0, 0, math.rad(90))
  ring.Parent = model
  tag(ring, "CAST_AURA")

  local weld = Instance.new("WeldConstraint")
  weld.Name = "AuraWeld"
  weld.Part0 = hostPart
  weld.Part1 = ring
  weld.Parent = ring

  local light = Instance.new("PointLight")
  light.Name = "AuraGlow"
  light.Color = color
  light.Brightness = clamp(options.brightness or 0.8, 0.1, 3)
  light.Range = clamp(options.range or 7, 2, 14)
  light.Shadows = false
  light.Parent = ring
  tag(light, "CAST_AURA")

  local controller = {}
  function controller.SetEnabled(enabled)
    local active = enabled == true
    ring.Transparency = active and 0.42 or 1
    light.Enabled = active
  end
  function controller.Destroy()
    if model.Parent then model:Destroy() end
  end
  return model, controller
end

function RobloxCommonSkillPresentation.CreateProjectileOrb(options)
  options = options or {}
  local parent = options.parent or workspace
  local cframe = typeof(options.cframe) == "CFrame" and options.cframe or CFrame.new()
  local color = typeof(options.color) == "Color3" and options.color or DEFAULT.Color
  local accent = typeof(options.accent) == "Color3" and options.accent or DEFAULT.Accent
  local scale = clamp(options.scale or 1, 0.25, 3.0)

  local model = Instance.new("Model")
  model.Name = "CommonProjectileOrb"
  tag(model, "PROJECTILE_ORB")
  model.Parent = parent

  local core = neonPart("OrbCore", Vector3.new(0.72, 0.72, 0.72) * scale, accent)
  core.Shape = Enum.PartType.Ball
  core.Anchored = true
  core.CFrame = cframe
  core.Parent = model
  tag(core, "PROJECTILE_ORB")

  local halo = neonPart("OrbHalo", Vector3.new(1.08, 1.08, 1.08) * scale, color)
  halo.Shape = Enum.PartType.Ball
  halo.Anchored = true
  halo.CFrame = cframe
  halo.Transparency = 0.68
  halo.Parent = model
  tag(halo, "PROJECTILE_ORB")

  model.PrimaryPart = core
  model:SetAttribute("OwnsProjectileMovement", false)
  model:SetAttribute("OwnsProjectileCollision", false)
  return model
end

function RobloxCommonSkillPresentation.CreateAreaPulse(options)
  options = options or {}
  local vfx = options.vfx
  assert(type(vfx) == "table" and type(vfx.CreateShapeBurst) == "function", "COMMON_VFX_MODULE_REQUIRED")
  return vfx.CreateShapeBurst({
    parent = options.parent,
    cframe = options.cframe,
    color = options.color,
    accent = options.accent,
    duration = clamp(options.duration or 0.46, 0.14, 0.90),
    scale = clamp(options.scale or 0.85, 0.25, 2.0),
    count = math.floor(clamp(options.count or 8, 4, 12)),
    distance = clamp(options.distance or 4.0, 1.5, 7.0),
  })
end

function RobloxCommonSkillPresentation.CreateTelegraphFan(options)
  options = options or {}
  local parent = options.parent or workspace
  local cframe = typeof(options.cframe) == "CFrame" and options.cframe or CFrame.new()
  local color = typeof(options.color) == "Color3" and options.color or DEFAULT.Color
  local radius = clamp(options.radius or 6, 2, 18)
  local angleDegrees = clamp(options.angleDegrees or 70, 20, 160)
  local count = math.floor(clamp(options.segments or 9, 5, 15))
  local duration = clamp(options.duration or DEFAULT.Duration, 0.15, 2.5)

  local folder = Instance.new("Folder")
  folder.Name = "CommonTelegraphFan"
  tag(folder, "TELEGRAPH_FAN")
  folder.Parent = parent

  local half = math.rad(angleDegrees * 0.5)
  for i = 1, count do
    local t = count == 1 and 0.5 or (i - 1) / (count - 1)
    local angle = -half + t * half * 2
    local length = radius * (0.72 + 0.28 * math.sin(t * math.pi))
    local dir = Vector3.new(math.sin(angle), 0, -math.cos(angle))
    local center = cframe.Position + cframe:VectorToWorldSpace(dir) * length * 0.5 + Vector3.new(0, 0.06, 0)
    local segment = neonPart("FanSegment_" .. tostring(i), Vector3.new(0.10, 0.08, length), color)
    segment.Anchored = true
    segment.Transparency = 0.45
    segment.CFrame = CFrame.lookAt(center, center + cframe:VectorToWorldSpace(dir))
    segment.Parent = folder
    tag(segment, "TELEGRAPH_FAN")
    TweenService:Create(segment, TweenInfo.new(duration, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut), {
      Transparency = 0.70,
    }):Play()
  end

  folder:SetAttribute("PresentationRadius", radius)
  folder:SetAttribute("PresentationAngleDegrees", angleDegrees)
  folder:SetAttribute("SegmentCount", count)
  folder:SetAttribute("PresentationDuration", duration)
  if options.autoCleanup ~= false then
    Debris:AddItem(folder, duration + 0.12)
  end
  return folder
end

function RobloxCommonSkillPresentation.AttachTargetMarker(hostPart, options)
  options = options or {}
  assert(typeof(hostPart) == "Instance" and hostPart:IsA("BasePart"), "COMMON_TARGET_MARKER_HOST_PART_REQUIRED")
  local color = typeof(options.color) == "Color3" and options.color or Color3.fromRGB(255, 197, 92)
  local scale = clamp(options.scale or 1, 0.4, 2.5)

  local model = Instance.new("Model")
  model.Name = "CommonTargetMarker"
  tag(model, "TARGET_MARKER")
  model.Parent = hostPart

  local diamond = neonPart("MarkerDiamond", Vector3.new(0.52, 0.52, 0.18) * scale, color)
  diamond.Anchored = false
  diamond.CFrame = hostPart.CFrame * CFrame.new(0, 2.1 * scale, 0) * CFrame.Angles(0, 0, math.rad(45))
  diamond.Parent = model
  tag(diamond, "TARGET_MARKER")

  local weld = Instance.new("WeldConstraint")
  weld.Name = "MarkerWeld"
  weld.Part0 = hostPart
  weld.Part1 = diamond
  weld.Parent = diamond

  model:SetAttribute("OwnsTargetSelection", false)
  model:SetAttribute("OwnsLockOnAuthority", false)

  local controller = {}
  function controller.SetEnabled(enabled)
    diamond.Transparency = enabled == true and 0.08 or 1
  end
  function controller.Destroy()
    if model.Parent then model:Destroy() end
  end
  return model, controller
end


function RobloxCommonSkillPresentation.CreateTelegraphLine(options)
  options = options or {}
  local parent = options.parent or workspace
  local cframe = typeof(options.cframe) == "CFrame" and options.cframe or CFrame.new()
  local color = typeof(options.color) == "Color3" and options.color or DEFAULT.Color
  local length = clamp(options.length or 8, 2, 24)
  local width = clamp(options.width or 1.2, 0.25, 5)
  local duration = clamp(options.duration or DEFAULT.Duration, 0.15, 2.5)

  local folder = Instance.new("Folder")
  folder.Name = "CommonTelegraphLine"
  tag(folder, "TELEGRAPH_LINE")
  folder.Parent = parent

  local line = neonPart("Line", Vector3.new(width, 0.08, length), color)
  line.Anchored = true
  line.Transparency = 0.46
  line.CFrame = cframe * CFrame.new(0, 0.06, -length * 0.5)
  line.Parent = folder
  tag(line, "TELEGRAPH_LINE")

  local edge = neonPart("Edge", Vector3.new(math.max(0.08, width * 0.10), 0.10, length), DEFAULT.Accent)
  edge.Anchored = true
  edge.Transparency = 0.28
  edge.CFrame = cframe * CFrame.new(0, 0.08, -length * 0.5)
  edge.Parent = folder
  tag(edge, "TELEGRAPH_LINE")

  folder:SetAttribute("PresentationLength", length)
  folder:SetAttribute("PresentationWidth", width)
  folder:SetAttribute("PresentationDuration", duration)
  if options.autoCleanup ~= false then
    Debris:AddItem(folder, duration + 0.12)
  end
  return folder
end

function RobloxCommonSkillPresentation.AttachChannelRing(hostPart, options)
  options = options or {}
  assert(typeof(hostPart) == "Instance" and hostPart:IsA("BasePart"), "COMMON_CHANNEL_RING_HOST_PART_REQUIRED")
  local color = typeof(options.color) == "Color3" and options.color or DEFAULT.Color
  local scale = clamp(options.scale or 1, 0.4, 3.0)

  local model = Instance.new("Model")
  model.Name = "CommonChannelRing"
  tag(model, "CHANNEL_RING")
  model.Parent = hostPart

  local ring = neonPart("ChannelRing", Vector3.new(0.10, 2.8, 2.8) * scale, color)
  ring.Shape = Enum.PartType.Cylinder
  ring.Anchored = false
  ring.Transparency = 0.34
  ring.CFrame = hostPart.CFrame * CFrame.Angles(0, 0, math.rad(90))
  ring.Parent = model
  tag(ring, "CHANNEL_RING")

  local weld = Instance.new("WeldConstraint")
  weld.Name = "ChannelRingWeld"
  weld.Part0 = hostPart
  weld.Part1 = ring
  weld.Parent = ring

  model:SetAttribute("OwnsChannelState", false)
  model:SetAttribute("OwnsCooldownAuthority", false)

  local controller = {}
  function controller.SetEnabled(enabled)
    ring.Transparency = enabled == true and 0.34 or 1
  end
  function controller.Destroy()
    if model.Parent then model:Destroy() end
  end
  return model, controller
end

function RobloxCommonSkillPresentation.CreateBeamLink(options)
  options = options or {}
  local aPart = options.fromPart
  local bPart = options.toPart
  assert(typeof(aPart) == "Instance" and aPart:IsA("BasePart"), "COMMON_BEAM_LINK_FROM_PART_REQUIRED")
  assert(typeof(bPart) == "Instance" and bPart:IsA("BasePart"), "COMMON_BEAM_LINK_TO_PART_REQUIRED")
  local color = typeof(options.color) == "Color3" and options.color or DEFAULT.Color

  local a0 = Instance.new("Attachment")
  a0.Name = "CommonBeamFrom"
  a0.Parent = aPart
  tag(a0, "BEAM_LINK")

  local a1 = Instance.new("Attachment")
  a1.Name = "CommonBeamTo"
  a1.Parent = bPart
  tag(a1, "BEAM_LINK")

  local beam = Instance.new("Beam")
  beam.Name = "CommonBeamLink"
  beam.Attachment0 = a0
  beam.Attachment1 = a1
  beam.FaceCamera = true
  beam.LightEmission = 0.8
  beam.LightInfluence = 0
  beam.Width0 = clamp(options.width0 or 0.22, 0.04, 1.2)
  beam.Width1 = clamp(options.width1 or 0.12, 0.04, 1.2)
  beam.Color = ColorSequence.new(color)
  beam.Transparency = NumberSequence.new(0.12)
  beam.Parent = aPart
  tag(beam, "BEAM_LINK")

  beam:SetAttribute("OwnsTargetSelection", false)
  beam:SetAttribute("OwnsDamageAuthority", false)
  beam:SetAttribute("OwnsRangeAuthority", false)

  local controller = {}
  function controller.SetEnabled(enabled)
    beam.Enabled = enabled == true
  end
  function controller.Destroy()
    if beam.Parent then beam:Destroy() end
    if a0.Parent then a0:Destroy() end
    if a1.Parent then a1:Destroy() end
  end
  return beam, controller
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
  elseif id == "CAST_AURA" then
    assert(options.hostPart, "COMMON_CAST_AURA_OPTIONS_HOST_PART_REQUIRED")
    return RobloxCommonSkillPresentation.AttachCastAura(options.hostPart, options)
  elseif id == "PROJECTILE_ORB" then
    return RobloxCommonSkillPresentation.CreateProjectileOrb(options)
  elseif id == "AREA_PULSE" then
    return RobloxCommonSkillPresentation.CreateAreaPulse(options)
  elseif id == "TELEGRAPH_FAN" then
    return RobloxCommonSkillPresentation.CreateTelegraphFan(options)
  elseif id == "TARGET_MARKER" then
    assert(options.hostPart, "COMMON_TARGET_MARKER_OPTIONS_HOST_PART_REQUIRED")
    return RobloxCommonSkillPresentation.AttachTargetMarker(options.hostPart, options)
  elseif id == "TELEGRAPH_LINE" then
    return RobloxCommonSkillPresentation.CreateTelegraphLine(options)
  elseif id == "CHANNEL_RING" then
    assert(options.hostPart, "COMMON_CHANNEL_RING_OPTIONS_HOST_PART_REQUIRED")
    return RobloxCommonSkillPresentation.AttachChannelRing(options.hostPart, options)
  elseif id == "BEAM_LINK" then
    return RobloxCommonSkillPresentation.CreateBeamLink(options)
  end
  error("UNKNOWN_COMMON_SKILL_ATOM: " .. tostring(atomId))
end

function RobloxCommonSkillPresentation.Audit()
  return table.freeze({
    version = 3,
    packId = "roblox-common-skill-v1",
    atoms = table.freeze({"CAST_HAND", "TELEGRAPH_CIRCLE", "IMPACT_SMALL", "CAST_AURA", "PROJECTILE_ORB", "AREA_PULSE", "TELEGRAPH_FAN", "TARGET_MARKER", "TELEGRAPH_LINE", "CHANNEL_RING", "BEAM_LINK"}),
    atomCount = 11,
    companyCommonBase = true,
    compatibleGameScope = "ALL_ROBLOX_GAMES_WHEN_ROLE_STYLE_AND_PLATFORM_MATCH",
    dependencyPackIds = table.freeze({"roblox-common-vfx-v1"}),
    impactSmallReusesCommonVfx = true,
    areaPulseReusesCommonVfx = true,
    gameplayAuthority = false,
    ownsDamageAuthority = false,
    ownsRangeAuthority = false,
    ownsCooldownAuthority = false,
    ownsMovementAuthority = false,
    productionVerified = false,
    runtimeVerificationRequired = true,
    mobileTelegraphSegmentCap = 20,
  })
end

return table.freeze(RobloxCommonSkillPresentation)
