-- 파일명: assets/roblox/common-vfx-v1/RobloxCommonVFX.luau
-- 역할: 모든 Roblox 게임에서 재사용하는 회사 공용 VFX 베이스 8종
-- 원칙: 시각 표현만 소유한다. 데미지/히트박스/쿨다운/이동/네트워크 권한은 게임 코드가 소유한다.

local TweenService = game:GetService("TweenService")
local Debris = game:GetService("Debris")

local RobloxCommonVFX = {}

local DEFAULT = table.freeze({
  Color = Color3.fromRGB(238, 244, 255),
  Accent = Color3.fromRGB(118, 179, 255),
  Duration = 0.34,
  TrailLifetime = 0.16,
  TrailWidth = 0.34,
  BurstCount = 8,
  BurstDistance = 4.2,
})

local function clamp(value, minValue, maxValue)
  return math.max(minValue, math.min(maxValue, tonumber(value) or minValue))
end

local function tag(instance, atomId)
  instance:SetAttribute("StudioAssetId", atomId)
  instance:SetAttribute("StudioAssetPack", "roblox-common-vfx-v1")
  instance:SetAttribute("StudioAssetFamily", "VFX")
  instance:SetAttribute("CompanyCommonBase", true)
  instance:SetAttribute("CompatibleGameScope", "ALL_ROBLOX_GAMES_WHEN_ROLE_STYLE_AND_PLATFORM_MATCH")
  instance:SetAttribute("ThemeAdaptationRequiredPerGame", true)
  instance:SetAttribute("ProductionVerified", false)
  instance:SetAttribute("RuntimeVerificationState", "PENDING_STUDIO")
  instance:SetAttribute("GameplayAuthority", false)
  instance:SetAttribute("OwnsDamageAuthority", false)
  instance:SetAttribute("OwnsHitboxAuthority", false)
  instance:SetAttribute("OwnsCooldownAuthority", false)
end

local function visualPart(name, size, color, shape)
  local part = Instance.new("Part")
  part.Name = name
  part.Anchored = true
  part.CanCollide = false
  part.CanTouch = false
  part.CanQuery = false
  part.CastShadow = false
  part.Material = Enum.Material.Neon
  part.Color = color
  part.Size = size
  part.Transparency = 0.10
  if shape == "BALL" then
    part.Shape = Enum.PartType.Ball
  elseif shape == "CYLINDER" then
    part.Shape = Enum.PartType.Cylinder
  end
  return part
end

function RobloxCommonVFX.CreateImpactFlash(options)
  options = options or {}
  local parent = options.parent or workspace
  local cframe = typeof(options.cframe) == "CFrame" and options.cframe or CFrame.new()
  local duration = clamp(options.duration or DEFAULT.Duration, 0.08, 0.80)
  local color = typeof(options.color) == "Color3" and options.color or DEFAULT.Color
  local accent = typeof(options.accent) == "Color3" and options.accent or DEFAULT.Accent
  local scale = clamp(options.scale or 1, 0.25, 4)

  local folder = Instance.new("Folder")
  folder.Name = "CommonImpactFlash"
  tag(folder, "IMPACT_FLASH")
  folder.Parent = parent

  local core = visualPart("Core", Vector3.new(0.65, 0.65, 0.65) * scale, color, "BALL")
  core.CFrame = cframe
  core.Parent = folder
  tag(core, "IMPACT_FLASH")

  local ring = visualPart("Ring", Vector3.new(0.12, 2.4, 2.4) * scale, accent, "CYLINDER")
  ring.CFrame = cframe * CFrame.Angles(0, 0, math.rad(90))
  ring.Transparency = 0.22
  ring.Parent = folder
  tag(ring, "IMPACT_FLASH")

  TweenService:Create(core, TweenInfo.new(duration, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {
    Size = core.Size * 3.2,
    Transparency = 1,
  }):Play()
  TweenService:Create(ring, TweenInfo.new(duration * 1.15, Enum.EasingStyle.Quart, Enum.EasingDirection.Out), {
    Size = Vector3.new(ring.Size.X, ring.Size.Y * 2.8, ring.Size.Z * 2.8),
    Transparency = 1,
  }):Play()

  Debris:AddItem(folder, duration * 1.25 + 0.08)
  return folder
end

function RobloxCommonVFX.AttachShortTrail(hostPart, options)
  options = options or {}
  assert(typeof(hostPart) == "Instance" and hostPart:IsA("BasePart"), "COMMON_TRAIL_HOST_PART_REQUIRED")

  local lifetime = clamp(options.lifetime or DEFAULT.TrailLifetime, 0.05, 0.45)
  local width = clamp(options.width or DEFAULT.TrailWidth, 0.05, 1.5)
  local color = typeof(options.color) == "Color3" and options.color or DEFAULT.Accent
  local axis = typeof(options.axis) == "Vector3" and options.axis or Vector3.new(0, 0, 1)
  if axis.Magnitude < 0.001 then
    axis = Vector3.new(0, 0, 1)
  end
  axis = axis.Unit
  local half = clamp(options.length or 1.0, 0.15, 4.0) * 0.5

  local a0 = Instance.new("Attachment")
  a0.Name = "CommonTrailA"
  a0.Position = axis * -half
  a0.Parent = hostPart
  tag(a0, "TRAIL_SHORT")

  local a1 = Instance.new("Attachment")
  a1.Name = "CommonTrailB"
  a1.Position = axis * half
  a1.Parent = hostPart
  tag(a1, "TRAIL_SHORT")

  local trail = Instance.new("Trail")
  trail.Name = "CommonShortTrail"
  trail.Attachment0 = a0
  trail.Attachment1 = a1
  trail.Lifetime = lifetime
  trail.MinLength = 0.05
  trail.FaceCamera = true
  trail.LightEmission = 0.75
  trail.LightInfluence = 0
  trail.Color = ColorSequence.new({
    ColorSequenceKeypoint.new(0, color:Lerp(Color3.new(1,1,1), 0.18)),
    ColorSequenceKeypoint.new(1, color),
  })
  trail.Transparency = NumberSequence.new({
    NumberSequenceKeypoint.new(0, 0.08),
    NumberSequenceKeypoint.new(0.70, 0.24),
    NumberSequenceKeypoint.new(1, 1),
  })
  trail.WidthScale = NumberSequence.new({
    NumberSequenceKeypoint.new(0, width),
    NumberSequenceKeypoint.new(1, 0),
  })
  trail.Parent = hostPart
  tag(trail, "TRAIL_SHORT")

  local controller = {}

  function controller.SetEnabled(enabled)
    trail.Enabled = enabled == true
  end

  function controller.Destroy()
    trail:Destroy()
    a0:Destroy()
    a1:Destroy()
  end

  return trail, controller
end

function RobloxCommonVFX.CreateShapeBurst(options)
  options = options or {}
  local parent = options.parent or workspace
  local cframe = typeof(options.cframe) == "CFrame" and options.cframe or CFrame.new()
  local duration = clamp(options.duration or 0.42, 0.12, 0.90)
  local color = typeof(options.color) == "Color3" and options.color or DEFAULT.Accent
  local accent = typeof(options.accent) == "Color3" and options.accent or DEFAULT.Color
  local count = math.floor(clamp(options.count or DEFAULT.BurstCount, 4, 12))
  local distance = clamp(options.distance or DEFAULT.BurstDistance, 1.5, 8.0)
  local scale = clamp(options.scale or 1, 0.25, 3.0)

  local folder = Instance.new("Folder")
  folder.Name = "CommonShapeBurst"
  tag(folder, "SHAPE_BURST")
  folder.Parent = parent

  for i = 1, count do
    local angle = (i - 1) * math.pi * 2 / count
    local dir = Vector3.new(math.cos(angle), 0.18 + (i % 2) * 0.14, math.sin(angle)).Unit
    local shard = visualPart(
      "Shard_" .. tostring(i),
      Vector3.new(0.18, 0.18, 1.2) * scale,
      i % 2 == 0 and accent or color
    )
    shard.CFrame = cframe * CFrame.lookAt(Vector3.zero, dir)
    shard.Parent = folder
    tag(shard, "SHAPE_BURST")

    local targetPosition = cframe.Position + dir * distance * (0.82 + (i % 3) * 0.10)
    local targetCFrame = CFrame.lookAt(targetPosition, targetPosition + dir)
    TweenService:Create(shard, TweenInfo.new(duration, Enum.EasingStyle.Quart, Enum.EasingDirection.Out), {
      CFrame = targetCFrame,
      Size = Vector3.new(0.05, 0.05, 0.38) * scale,
      Transparency = 1,
    }):Play()
  end

  local center = visualPart("Center", Vector3.new(0.5, 0.5, 0.5) * scale, accent, "BALL")
  center.CFrame = cframe
  center.Parent = folder
  tag(center, "SHAPE_BURST")
  TweenService:Create(center, TweenInfo.new(duration * 0.65, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {
    Size = center.Size * 2.2,
    Transparency = 1,
  }):Play()

  Debris:AddItem(folder, duration + 0.12)
  return folder
end


local function createCombatPulse(atomId,options,profile)
  options=options or {}
  local parent=options.parent or workspace
  local cframe=typeof(options.cframe)=="CFrame" and options.cframe or CFrame.new()
  local duration=clamp(options.duration or profile.duration,0.08,1.20)
  local scale=clamp(options.scale or 1,0.25,4)
  local color=typeof(options.color)=="Color3" and options.color or profile.color
  local accent=typeof(options.accent)=="Color3" and options.accent or profile.accent

  local folder=Instance.new("Folder")
  folder.Name="Common"..atomId
  tag(folder,atomId)
  folder:SetAttribute("PresentationRole",profile.role)
  folder:SetAttribute("OwnsParryTimingAuthority",false)
  folder:SetAttribute("OwnsBlockAuthority",false)
  folder:SetAttribute("OwnsStunAuthority",false)
  folder:SetAttribute("OwnsStaminaAuthority",false)
  folder.Parent=parent

  local ring=visualPart("Ring",Vector3.new(0.10,profile.ringSize,profile.ringSize)*scale,accent,"CYLINDER")
  ring.CFrame=cframe*CFrame.Angles(0,0,math.rad(90))
  ring.Transparency=profile.ringTransparency or 0.18
  ring.Parent=folder
  tag(ring,atomId)
  TweenService:Create(ring,TweenInfo.new(duration,Enum.EasingStyle.Quart,Enum.EasingDirection.Out),{
    Size=Vector3.new(ring.Size.X,ring.Size.Y*profile.expand,ring.Size.Z*profile.expand),
    Transparency=1,
  }):Play()

  local core=visualPart("Core",Vector3.new(profile.coreSize,profile.coreSize,profile.coreSize)*scale,color,"BALL")
  core.CFrame=cframe
  core.Transparency=profile.coreTransparency or 0.05
  core.Parent=folder
  tag(core,atomId)
  TweenService:Create(core,TweenInfo.new(duration*0.72,Enum.EasingStyle.Quad,Enum.EasingDirection.Out),{
    Size=core.Size*(profile.coreExpand or 2.2),
    Transparency=1,
  }):Play()

  local shardCount=math.floor(clamp(profile.shards or 6,0,12))
  for i=1,shardCount do
    local angle=(i-1)*math.pi*2/math.max(1,shardCount)
    local dir=Vector3.new(math.cos(angle),profile.vertical or 0.08,math.sin(angle)).Unit
    local shard=visualPart("Shard"..i,Vector3.new(0.10,0.10,profile.shardLength or 0.85)*scale,i%2==0 and accent or color)
    shard.CFrame=cframe*CFrame.lookAt(Vector3.zero,dir)
    shard.Parent=folder
    tag(shard,atomId)
    local pos=cframe.Position+dir*(profile.distance or 2.8)*scale
    TweenService:Create(shard,TweenInfo.new(duration,Enum.EasingStyle.Quart,Enum.EasingDirection.Out),{
      CFrame=CFrame.lookAt(pos,pos+dir),
      Size=Vector3.new(0.04,0.04,0.24)*scale,
      Transparency=1,
    }):Play()
  end

  Debris:AddItem(folder,duration+0.15)
  return folder
end

function RobloxCommonVFX.CreateBlockImpact(options)
  return createCombatPulse("BLOCK_IMPACT",options,{
    role="BLOCK_CONTACT",duration=0.24,ringSize=1.8,expand=2.0,coreSize=0.42,coreExpand=1.8,shards=4,distance=1.8,shardLength=0.65,
    color=Color3.fromRGB(210,224,236),accent=Color3.fromRGB(124,162,196)
  })
end

function RobloxCommonVFX.CreatePerfectParryFlash(options)
  return createCombatPulse("PARRY_PERFECT_FLASH",options,{
    role="PERFECT_PARRY_CONFIRMATION",duration=0.30,ringSize=2.1,expand=3.2,coreSize=0.58,coreExpand=2.8,shards=10,distance=3.6,shardLength=1.05,
    color=Color3.fromRGB(255,249,214),accent=Color3.fromRGB(123,219,255)
  })
end

function RobloxCommonVFX.CreateGuardBreakBurst(options)
  return createCombatPulse("GUARD_BREAK_BURST",options,{
    role="GUARD_BREAK_WARNING",duration=0.48,ringSize=2.3,expand=2.5,coreSize=0.70,coreExpand=3.2,shards=8,distance=4.0,vertical=0.22,shardLength=1.20,
    color=Color3.fromRGB(255,188,119),accent=Color3.fromRGB(235,88,72)
  })
end

function RobloxCommonVFX.CreateAttackTelegraphPulse(options)
  return createCombatPulse("ATTACK_TELEGRAPH_PULSE",options,{
    role="ATTACK_TELEGRAPH_PRESENTATION",duration=0.52,ringSize=2.4,expand=2.1,coreSize=0.22,coreExpand=1.4,shards=0,distance=0,
    color=Color3.fromRGB(255,219,161),accent=Color3.fromRGB(242,132,80),ringTransparency=0.30,coreTransparency=0.35
  })
end

function RobloxCommonVFX.CreateCounterReadyPulse(options)
  return createCombatPulse("COUNTER_READY_PULSE",options,{
    role="COUNTER_WINDOW_PRESENTATION",duration=0.34,ringSize=1.6,expand=2.6,coreSize=0.34,coreExpand=2.0,shards=6,distance=2.5,shardLength=0.72,
    color=Color3.fromRGB(214,255,219),accent=Color3.fromRGB(94,218,157)
  })
end

function RobloxCommonVFX.Create(atomId, options)
  local id = string.upper(tostring(atomId or ""))
  if id == "IMPACT_FLASH" then
    return RobloxCommonVFX.CreateImpactFlash(options)
  elseif id == "TRAIL_SHORT" then
    assert(options and options.hostPart, "COMMON_TRAIL_OPTIONS_HOST_PART_REQUIRED")
    return RobloxCommonVFX.AttachShortTrail(options.hostPart, options)
  elseif id == "SHAPE_BURST" then
    return RobloxCommonVFX.CreateShapeBurst(options)
  elseif id == "BLOCK_IMPACT" then
    return RobloxCommonVFX.CreateBlockImpact(options)
  elseif id == "PARRY_PERFECT_FLASH" then
    return RobloxCommonVFX.CreatePerfectParryFlash(options)
  elseif id == "GUARD_BREAK_BURST" then
    return RobloxCommonVFX.CreateGuardBreakBurst(options)
  elseif id == "ATTACK_TELEGRAPH_PULSE" then
    return RobloxCommonVFX.CreateAttackTelegraphPulse(options)
  elseif id == "COUNTER_READY_PULSE" then
    return RobloxCommonVFX.CreateCounterReadyPulse(options)
  end
  error("UNKNOWN_COMMON_VFX_ATOM: " .. tostring(atomId))
end

function RobloxCommonVFX.Audit()
  return table.freeze({
    version = 2,
    packId = "roblox-common-vfx-v1",
    atoms = table.freeze({"IMPACT_FLASH", "TRAIL_SHORT", "SHAPE_BURST", "BLOCK_IMPACT", "PARRY_PERFECT_FLASH", "GUARD_BREAK_BURST", "ATTACK_TELEGRAPH_PULSE", "COUNTER_READY_PULSE"}),
    atomCount = 8,
    companyCommonBase = true,
    compatibleGameScope = "ALL_ROBLOX_GAMES_WHEN_ROLE_STYLE_AND_PLATFORM_MATCH",
    gameplayAuthority = false,
    ownsDamageAuthority = false,
    ownsHitboxAuthority = false,
    ownsCooldownAuthority = false,
    productionVerified = false,
    runtimeVerificationRequired = true,
    mobileBurstCap = 12,
  })
end

return table.freeze(RobloxCommonVFX)
