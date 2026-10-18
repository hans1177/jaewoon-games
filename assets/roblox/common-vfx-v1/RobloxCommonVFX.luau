-- 파일명: assets/roblox/common-vfx-v1/RobloxCommonVFX.luau
-- 역할: 모든 Roblox 게임에서 재사용하는 회사 공용 VFX 베이스 27종
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


function RobloxCommonVFX.CreateCriticalBurst(options)
  return createCombatPulse("CRITICAL_BURST",options,{
    role="CRITICAL",duration=0.36,ringSize=2.0,expand=3.3,coreSize=0.62,coreExpand=3.0,shards=10,distance=3.8,shardLength=1.10,
    color=Color3.fromRGB(255,244,180),accent=Color3.fromRGB(255,154,76)
  })
end

function RobloxCommonVFX.CreateDodgeEvasionPulse(options)
  return createCombatPulse("DODGE_EVASION_PULSE",options,{
    role="DODGE",duration=0.26,ringSize=1.5,expand=3.6,coreSize=0.22,coreExpand=1.8,shards=4,distance=2.8,shardLength=1.35,
    color=Color3.fromRGB(205,239,255),accent=Color3.fromRGB(103,190,255),ringTransparency=0.42,coreTransparency=0.40
  })
end

function RobloxCommonVFX.CreateHealPulse(options)
  return createCombatPulse("HEAL_PULSE",options,{
    role="HEAL",duration=0.54,ringSize=1.8,expand=2.8,coreSize=0.50,coreExpand=2.5,shards=6,distance=2.5,vertical=0.35,shardLength=0.65,
    color=Color3.fromRGB(201,255,217),accent=Color3.fromRGB(84,221,147)
  })
end

function RobloxCommonVFX.CreateBuffPulse(options)
  return createCombatPulse("BUFF_PULSE",options,{
    role="BUFF",duration=0.46,ringSize=1.7,expand=2.7,coreSize=0.44,coreExpand=2.3,shards=8,distance=2.9,vertical=0.18,shardLength=0.78,
    color=Color3.fromRGB(224,244,255),accent=Color3.fromRGB(112,176,255)
  })
end

function RobloxCommonVFX.CreateDebuffPulse(options)
  return createCombatPulse("DEBUFF_PULSE",options,{
    role="DEBUFF",duration=0.52,ringSize=1.8,expand=2.3,coreSize=0.48,coreExpand=2.4,shards=7,distance=2.4,vertical=-0.04,shardLength=0.82,
    color=Color3.fromRGB(230,193,255),accent=Color3.fromRGB(153,89,207)
  })
end

function RobloxCommonVFX.CreateStatusPulse(options)
  return createCombatPulse("STATUS_PULSE",options,{
    role="STATUS",duration=0.42,ringSize=1.45,expand=2.4,coreSize=0.34,coreExpand=2.0,shards=5,distance=2.1,shardLength=0.62,
    color=Color3.fromRGB(233,236,244),accent=Color3.fromRGB(146,161,188)
  })
end

function RobloxCommonVFX.CreateLootCommonBurst(options)
  return createCombatPulse("LOOT_COMMON_BURST",options,{
    role="LOOT_COMMON",duration=0.34,ringSize=1.4,expand=2.5,coreSize=0.36,coreExpand=2.0,shards=5,distance=2.3,vertical=0.25,shardLength=0.58,
    color=Color3.fromRGB(235,240,245),accent=Color3.fromRGB(171,185,196)
  })
end

function RobloxCommonVFX.CreateLootRareBurst(options)
  return createCombatPulse("LOOT_RARE_BURST",options,{
    role="LOOT_RARE",duration=0.42,ringSize=1.7,expand=2.9,coreSize=0.44,coreExpand=2.4,shards=8,distance=3.0,vertical=0.28,shardLength=0.82,
    color=Color3.fromRGB(205,231,255),accent=Color3.fromRGB(89,155,255)
  })
end

function RobloxCommonVFX.CreateLootLegendaryBurst(options)
  return createCombatPulse("LOOT_LEGENDARY_BURST",options,{
    role="LOOT_LEGENDARY",duration=0.56,ringSize=2.0,expand=3.4,coreSize=0.58,coreExpand=2.8,shards=12,distance=4.1,vertical=0.35,shardLength=1.05,
    color=Color3.fromRGB(255,244,187),accent=Color3.fromRGB(255,170,70)
  })
end

function RobloxCommonVFX.CreateUpgradeBurst(options)
  return createCombatPulse("UPGRADE_BURST",options,{
    role="UPGRADE",duration=0.50,ringSize=1.9,expand=3.0,coreSize=0.50,coreExpand=2.6,shards=9,distance=3.4,vertical=0.30,shardLength=0.92,
    color=Color3.fromRGB(221,255,236),accent=Color3.fromRGB(96,224,178)
  })
end

function RobloxCommonVFX.CreateCraftSparks(options)
  return createCombatPulse("CRAFT_SPARKS",options,{
    role="CRAFT",duration=0.40,ringSize=1.35,expand=2.2,coreSize=0.30,coreExpand=1.8,shards=10,distance=2.6,vertical=0.40,shardLength=0.54,
    color=Color3.fromRGB(255,225,175),accent=Color3.fromRGB(239,139,65)
  })
end

function RobloxCommonVFX.CreateDismantleShards(options)
  return createCombatPulse("DISMANTLE_SHARDS",options,{
    role="DISMANTLE",duration=0.44,ringSize=1.45,expand=2.6,coreSize=0.30,coreExpand=1.7,shards=9,distance=3.1,vertical=0.12,shardLength=0.95,
    color=Color3.fromRGB(216,225,236),accent=Color3.fromRGB(111,132,158)
  })
end

function RobloxCommonVFX.CreateQuestUpdatePulse(options)
  return createCombatPulse("QUEST_UPDATE_PULSE",options,{
    role="QUEST_UPDATE",duration=0.38,ringSize=1.55,expand=2.6,coreSize=0.38,coreExpand=2.0,shards=6,distance=2.5,vertical=0.24,shardLength=0.68,
    color=Color3.fromRGB(255,247,203),accent=Color3.fromRGB(91,199,202)
  })
end

function RobloxCommonVFX.CreateInteractionPulse(options)
  return createCombatPulse("INTERACTION_PULSE",options,{
    role="INTERACTION",duration=0.34,ringSize=1.35,expand=2.3,coreSize=0.28,coreExpand=1.8,shards=4,distance=1.9,shardLength=0.52,
    color=Color3.fromRGB(232,245,255),accent=Color3.fromRGB(111,190,226)
  })
end

function RobloxCommonVFX.CreateEnvironmentMotePulse(options)
  return createCombatPulse("ENVIRONMENT_MOTE_PULSE",options,{
    role="ENVIRONMENT",duration=0.72,ringSize=1.9,expand=2.4,coreSize=0.24,coreExpand=1.7,shards=8,distance=3.8,vertical=0.42,shardLength=0.46,
    color=Color3.fromRGB(222,238,224),accent=Color3.fromRGB(124,173,131),ringTransparency=0.48,coreTransparency=0.42
  })
end

function RobloxCommonVFX.CreateWeatherGustPulse(options)
  return createCombatPulse("WEATHER_GUST_PULSE",options,{
    role="WEATHER",duration=0.62,ringSize=2.1,expand=3.1,coreSize=0.18,coreExpand=1.4,shards=7,distance=4.5,vertical=0.08,shardLength=1.35,
    color=Color3.fromRGB(220,234,242),accent=Color3.fromRGB(154,186,204),ringTransparency=0.58,coreTransparency=0.62
  })
end

function RobloxCommonVFX.CreateDestructionBurst(options)
  return createCombatPulse("DESTRUCTION_BURST",options,{
    role="DESTRUCTION",duration=0.50,ringSize=1.8,expand=2.8,coreSize=0.52,coreExpand=2.8,shards=12,distance=4.0,vertical=0.22,shardLength=1.20,
    color=Color3.fromRGB(224,198,161),accent=Color3.fromRGB(146,116,87)
  })
end

function RobloxCommonVFX.CreateBossWarningPulse(options)
  return createCombatPulse("BOSS_WARNING_PULSE",options,{
    role="BOSS",duration=0.68,ringSize=2.6,expand=3.4,coreSize=0.48,coreExpand=2.7,shards=8,distance=4.6,vertical=0.18,shardLength=1.20,
    color=Color3.fromRGB(255,211,188),accent=Color3.fromRGB(221,72,72),ringTransparency=0.26,coreTransparency=0.24
  })
end

function RobloxCommonVFX.CreateMobileDensityPulse(options)
  options=options or {}
  local lowDensity=options.lowDensity~=false
  return createCombatPulse("MOBILE_DENSITY_PULSE",options,{
    role="MOBILE_DENSITY",duration=lowDensity and 0.28 or 0.38,ringSize=1.3,expand=2.2,coreSize=0.26,coreExpand=1.7,
    shards=lowDensity and 2 or 5,distance=lowDensity and 1.7 or 2.4,shardLength=lowDensity and 0.42 or 0.62,
    color=Color3.fromRGB(225,238,248),accent=Color3.fromRGB(124,174,209),ringTransparency=0.44,coreTransparency=0.38
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
  elseif id == "CRITICAL_BURST" then
    return RobloxCommonVFX.CreateCriticalBurst(options)
  elseif id == "DODGE_EVASION_PULSE" then
    return RobloxCommonVFX.CreateDodgeEvasionPulse(options)
  elseif id == "HEAL_PULSE" then
    return RobloxCommonVFX.CreateHealPulse(options)
  elseif id == "BUFF_PULSE" then
    return RobloxCommonVFX.CreateBuffPulse(options)
  elseif id == "DEBUFF_PULSE" then
    return RobloxCommonVFX.CreateDebuffPulse(options)
  elseif id == "STATUS_PULSE" then
    return RobloxCommonVFX.CreateStatusPulse(options)
  elseif id == "LOOT_COMMON_BURST" then
    return RobloxCommonVFX.CreateLootCommonBurst(options)
  elseif id == "LOOT_RARE_BURST" then
    return RobloxCommonVFX.CreateLootRareBurst(options)
  elseif id == "LOOT_LEGENDARY_BURST" then
    return RobloxCommonVFX.CreateLootLegendaryBurst(options)
  elseif id == "UPGRADE_BURST" then
    return RobloxCommonVFX.CreateUpgradeBurst(options)
  elseif id == "CRAFT_SPARKS" then
    return RobloxCommonVFX.CreateCraftSparks(options)
  elseif id == "DISMANTLE_SHARDS" then
    return RobloxCommonVFX.CreateDismantleShards(options)
  elseif id == "QUEST_UPDATE_PULSE" then
    return RobloxCommonVFX.CreateQuestUpdatePulse(options)
  elseif id == "INTERACTION_PULSE" then
    return RobloxCommonVFX.CreateInteractionPulse(options)
  elseif id == "ENVIRONMENT_MOTE_PULSE" then
    return RobloxCommonVFX.CreateEnvironmentMotePulse(options)
  elseif id == "WEATHER_GUST_PULSE" then
    return RobloxCommonVFX.CreateWeatherGustPulse(options)
  elseif id == "DESTRUCTION_BURST" then
    return RobloxCommonVFX.CreateDestructionBurst(options)
  elseif id == "BOSS_WARNING_PULSE" then
    return RobloxCommonVFX.CreateBossWarningPulse(options)
  elseif id == "MOBILE_DENSITY_PULSE" then
    return RobloxCommonVFX.CreateMobileDensityPulse(options)
  end
  error("UNKNOWN_COMMON_VFX_ATOM: " .. tostring(atomId))
end

function RobloxCommonVFX.Audit()
  return table.freeze({
    version = 3,
    packId = "roblox-common-vfx-v1",
    atoms = table.freeze({
      "IMPACT_FLASH", "TRAIL_SHORT", "SHAPE_BURST", "BLOCK_IMPACT", "PARRY_PERFECT_FLASH", "GUARD_BREAK_BURST", "ATTACK_TELEGRAPH_PULSE", "COUNTER_READY_PULSE",
      "CRITICAL_BURST", "DODGE_EVASION_PULSE", "HEAL_PULSE", "BUFF_PULSE", "DEBUFF_PULSE", "STATUS_PULSE",
      "LOOT_COMMON_BURST", "LOOT_RARE_BURST", "LOOT_LEGENDARY_BURST", "UPGRADE_BURST", "CRAFT_SPARKS", "DISMANTLE_SHARDS",
      "QUEST_UPDATE_PULSE", "INTERACTION_PULSE", "ENVIRONMENT_MOTE_PULSE", "WEATHER_GUST_PULSE", "DESTRUCTION_BURST", "BOSS_WARNING_PULSE", "MOBILE_DENSITY_PULSE"
    }),
    atomCount = 27,
    companyCommonBase = true,
    compatibleGameScope = "ALL_ROBLOX_GAMES_WHEN_ROLE_STYLE_AND_PLATFORM_MATCH",
    gameplayAuthority = false,
    ownsDamageAuthority = false,
    ownsHitboxAuthority = false,
    ownsCooldownAuthority = false,
    productionVerified = false,
    runtimeVerificationRequired = true,
    mobileBurstCap = 12,
    mobileDensityVariantAvailable = true,
  })
end

return table.freeze(RobloxCommonVFX)
