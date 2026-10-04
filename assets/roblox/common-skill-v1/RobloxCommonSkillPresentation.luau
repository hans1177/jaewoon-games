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
  end
  error("UNKNOWN_COMMON_SKILL_ATOM: " .. tostring(atomId))
end

function RobloxCommonSkillPresentation.Audit()
  return table.freeze({
    version = 1,
    packId = "roblox-common-skill-v1",
    atoms = table.freeze({"CAST_HAND", "TELEGRAPH_CIRCLE", "IMPACT_SMALL"}),
    atomCount = 3,
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
  })
end

return table.freeze(RobloxCommonSkillPresentation)
