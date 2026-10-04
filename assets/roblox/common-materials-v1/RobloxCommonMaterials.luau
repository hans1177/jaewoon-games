-- 파일명: assets/roblox/common-materials-v1/RobloxCommonMaterials.luau
-- 역할: 모든 Roblox 게임에서 재사용하는 회사 공용 재질 베이스
-- 원칙: 시각 재질을 바꾸더라도 기존 물리 속성(밀도/마찰/탄성)은 기본적으로 보존한다.

local RobloxCommonMaterials = {}

local PRESETS = table.freeze({
  WOOD = table.freeze({
    defaultVariant = "NATURAL",
    variants = table.freeze({
      NATURAL = table.freeze({material = Enum.Material.WoodPlanks, color = Color3.fromRGB(123, 83, 49), reflectance = 0.00}),
      DARK = table.freeze({material = Enum.Material.WoodPlanks, color = Color3.fromRGB(73, 48, 32), reflectance = 0.00}),
      WEATHERED = table.freeze({material = Enum.Material.WoodPlanks, color = Color3.fromRGB(111, 98, 78), reflectance = 0.00}),
      PALE = table.freeze({material = Enum.Material.WoodPlanks, color = Color3.fromRGB(166, 132, 91), reflectance = 0.00}),
    }),
  }),
  STONE = table.freeze({
    defaultVariant = "NATURAL",
    variants = table.freeze({
      NATURAL = table.freeze({material = Enum.Material.Slate, color = Color3.fromRGB(111, 116, 115), reflectance = 0.00}),
      DARK = table.freeze({material = Enum.Material.Slate, color = Color3.fromRGB(66, 71, 73), reflectance = 0.00}),
      PALE = table.freeze({material = Enum.Material.Limestone, color = Color3.fromRGB(170, 167, 151), reflectance = 0.00}),
      WEATHERED = table.freeze({material = Enum.Material.Rock, color = Color3.fromRGB(124, 117, 101), reflectance = 0.00}),
    }),
  }),
  METAL = table.freeze({
    defaultVariant = "BRUSHED",
    variants = table.freeze({
      BRUSHED = table.freeze({material = Enum.Material.Metal, color = Color3.fromRGB(112, 119, 124), reflectance = 0.06}),
      DARK = table.freeze({material = Enum.Material.Metal, color = Color3.fromRGB(56, 62, 66), reflectance = 0.04}),
      LIGHT = table.freeze({material = Enum.Material.Metal, color = Color3.fromRGB(167, 174, 178), reflectance = 0.10}),
      INDUSTRIAL = table.freeze({material = Enum.Material.DiamondPlate, color = Color3.fromRGB(95, 101, 104), reflectance = 0.05}),
    }),
  }),
  GLASS = table.freeze({
    defaultVariant = "CLEAR",
    variants = table.freeze({
      CLEAR = table.freeze({material = Enum.Material.Glass, color = Color3.fromRGB(190, 215, 220), reflectance = 0.08}),
      COOL = table.freeze({material = Enum.Material.Glass, color = Color3.fromRGB(139, 187, 210), reflectance = 0.10}),
      WARM = table.freeze({material = Enum.Material.Glass, color = Color3.fromRGB(222, 199, 160), reflectance = 0.08}),
      SMOKED = table.freeze({material = Enum.Material.Glass, color = Color3.fromRGB(79, 91, 96), reflectance = 0.06}),
    }),
  }),
  FABRIC = table.freeze({
    defaultVariant = "NATURAL",
    variants = table.freeze({
      NATURAL = table.freeze({material = Enum.Material.Fabric, color = Color3.fromRGB(122, 118, 105), reflectance = 0.00}),
      PALE = table.freeze({material = Enum.Material.Fabric, color = Color3.fromRGB(188, 178, 153), reflectance = 0.00}),
      DARK = table.freeze({material = Enum.Material.Fabric, color = Color3.fromRGB(61, 64, 65), reflectance = 0.00}),
      DYED = table.freeze({material = Enum.Material.Fabric, color = Color3.fromRGB(91, 111, 139), reflectance = 0.00}),
    }),
  }),
  LEATHER_LIKE = table.freeze({
    defaultVariant = "BROWN",
    variants = table.freeze({
      BROWN = table.freeze({material = Enum.Material.Fabric, color = Color3.fromRGB(96, 65, 45), reflectance = 0.01}),
      DARK = table.freeze({material = Enum.Material.Fabric, color = Color3.fromRGB(55, 43, 37), reflectance = 0.01}),
      TAN = table.freeze({material = Enum.Material.Fabric, color = Color3.fromRGB(150, 108, 72), reflectance = 0.01}),
      WEATHERED = table.freeze({material = Enum.Material.Fabric, color = Color3.fromRGB(112, 89, 69), reflectance = 0.00}),
    }),
  }),
  GROUND = table.freeze({
    defaultVariant = "EARTH",
    variants = table.freeze({
      EARTH = table.freeze({material = Enum.Material.Ground, color = Color3.fromRGB(91, 78, 60), reflectance = 0.00}),
      MUD = table.freeze({material = Enum.Material.Mud, color = Color3.fromRGB(74, 65, 52), reflectance = 0.00}),
      SAND = table.freeze({material = Enum.Material.Sand, color = Color3.fromRGB(180, 158, 116), reflectance = 0.00}),
      PALE = table.freeze({material = Enum.Material.Ground, color = Color3.fromRGB(143, 128, 101), reflectance = 0.00}),
    }),
  }),
  MAGIC_CRYSTAL = table.freeze({
    defaultVariant = "ARCANE_BLUE",
    variants = table.freeze({
      ARCANE_BLUE = table.freeze({material = Enum.Material.Neon, color = Color3.fromRGB(102, 175, 238), reflectance = 0.04}),
      HEALING_GREEN = table.freeze({material = Enum.Material.Neon, color = Color3.fromRGB(103, 211, 153), reflectance = 0.04}),
      FIRE_ORANGE = table.freeze({material = Enum.Material.Neon, color = Color3.fromRGB(239, 143, 67), reflectance = 0.04}),
      VOID_PURPLE = table.freeze({material = Enum.Material.Neon, color = Color3.fromRGB(151, 105, 220), reflectance = 0.04}),
    }),
  }),
})

local function clamp(value, minValue, maxValue)
  return math.max(minValue, math.min(maxValue, tonumber(value) or minValue))
end

local function clonePhysicalProperties(properties)
  if not properties then
    return nil
  end
  return PhysicalProperties.new(
    properties.Density,
    properties.Friction,
    properties.Elasticity,
    properties.FrictionWeight,
    properties.ElasticityWeight
  )
end

local function resolvePreset(atomId, variant)
  local id = string.upper(tostring(atomId or ""))
  local family = PRESETS[id]
  assert(family, "UNKNOWN_COMMON_MATERIAL_ATOM: " .. tostring(atomId))
  local variantId = string.upper(tostring(variant or family.defaultVariant))
  local preset = family.variants[variantId]
  assert(preset, "UNKNOWN_COMMON_MATERIAL_VARIANT: " .. id .. ":" .. variantId)
  return id, variantId, preset
end

local function tag(part, atomId, variantId)
  part:SetAttribute("StudioAssetId", atomId)
  part:SetAttribute("StudioAssetVariant", variantId)
  part:SetAttribute("StudioAssetPack", "roblox-common-materials-v1")
  part:SetAttribute("StudioAssetFamily", "MATERIAL")
  part:SetAttribute("CompanyCommonBase", true)
  part:SetAttribute("CompatibleGameScope", "ALL_ROBLOX_GAMES_WHEN_ROLE_STYLE_AND_PLATFORM_MATCH")
  part:SetAttribute("ThemeAdaptationRequiredPerGame", true)
  part:SetAttribute("ProductionVerified", false)
  part:SetAttribute("RuntimeVerificationState", "PENDING_STUDIO")
  part:SetAttribute("GameplayAuthority", false)
  part:SetAttribute("PreservesPhysicalProperties", true)
end

function RobloxCommonMaterials.Describe(atomId)
  local id = string.upper(tostring(atomId or ""))
  local row = PRESETS[id]
  assert(row, "UNKNOWN_COMMON_MATERIAL_ATOM: " .. tostring(atomId))
  local variants = {}
  for variantId in pairs(row.variants) do
    table.insert(variants, variantId)
  end
  table.sort(variants)
  return table.freeze({
    atomId = id,
    defaultVariant = row.defaultVariant,
    variants = table.freeze(variants),
    companyCommonBase = true,
    gameplayAuthority = false,
  })
end

function RobloxCommonMaterials.Apply(part, atomId, options)
  options = options or {}
  assert(typeof(part) == "Instance" and part:IsA("BasePart"), "COMMON_MATERIAL_BASEPART_REQUIRED")

  local id, variantId, preset = resolvePreset(atomId, options.variant)
  local preservePhysics = options.preservePhysics ~= false
  local physicalBefore = preservePhysics and clonePhysicalProperties(part.CurrentPhysicalProperties) or nil

  part.Material = preset.material

  local baseColor = preset.color
  if typeof(options.tint) == "Color3" then
    local tintStrength = clamp(options.tintStrength or 0.35, 0, 1)
    baseColor = baseColor:Lerp(options.tint, tintStrength)
  end
  part.Color = baseColor

  local reflectance = preset.reflectance
  if options.reflectance ~= nil then
    reflectance = clamp(options.reflectance, 0, 0.35)
  end
  part.Reflectance = reflectance

  if preservePhysics and physicalBefore then
    part.CustomPhysicalProperties = physicalBefore
  end

  tag(part, id, variantId)
  part:SetAttribute("PhysicalPropertiesCapturedBeforeVisualMaterial", preservePhysics and physicalBefore ~= nil)
  return part
end

function RobloxCommonMaterials.ApplyMany(parts, atomId, options)
  local applied = {}
  for _, part in ipairs(parts or {}) do
    if typeof(part) == "Instance" and part:IsA("BasePart") then
      table.insert(applied, RobloxCommonMaterials.Apply(part, atomId, options))
    end
  end
  return table.freeze(applied)
end

function RobloxCommonMaterials.Audit()
  return table.freeze({
    version = 2,
    packId = "roblox-common-materials-v1",
    atoms = table.freeze({"WOOD", "STONE", "METAL", "GLASS", "FABRIC", "LEATHER_LIKE", "GROUND", "MAGIC_CRYSTAL"}),
    atomCount = 8,
    companyCommonBase = true,
    compatibleGameScope = "ALL_ROBLOX_GAMES_WHEN_ROLE_STYLE_AND_PLATFORM_MATCH",
    gameplayAuthority = false,
    physicalPropertiesPreservedByDefault = true,
    collisionMutationAllowed = false,
    productionVerified = false,
    runtimeVerificationRequired = true,
  })
end

return table.freeze(RobloxCommonMaterials)
