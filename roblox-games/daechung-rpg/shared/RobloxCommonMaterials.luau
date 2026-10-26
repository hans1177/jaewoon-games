-- 파일명: shared/RobloxCommonMaterials.luau
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
  -- Block/toy worlds opt in through an explicit SurfaceRole; not a global art style override.
  TOY_PLASTIC = table.freeze({
    defaultVariant = "COBALT",
    variants = table.freeze({
      COBALT = table.freeze({material = Enum.Material.SmoothPlastic, color = Color3.fromRGB(54, 119, 238), reflectance = 0.07}),
      POP_RED = table.freeze({material = Enum.Material.SmoothPlastic, color = Color3.fromRGB(229, 73, 67), reflectance = 0.06}),
      SUNNY = table.freeze({material = Enum.Material.SmoothPlastic, color = Color3.fromRGB(246, 197, 62), reflectance = 0.07}),
      MINT = table.freeze({material = Enum.Material.SmoothPlastic, color = Color3.fromRGB(64, 195, 153), reflectance = 0.06}),
    }),
  }),
  TOY_STUDDED = table.freeze({
    defaultVariant = "COBALT",
    variants = table.freeze({
      COBALT = table.freeze({material = Enum.Material.Plastic, color = Color3.fromRGB(54, 119, 238), reflectance = 0.04}),
      POP_RED = table.freeze({material = Enum.Material.Plastic, color = Color3.fromRGB(229, 73, 67), reflectance = 0.04}),
      SUNNY = table.freeze({material = Enum.Material.Plastic, color = Color3.fromRGB(246, 197, 62), reflectance = 0.04}),
      MINT = table.freeze({material = Enum.Material.Plastic, color = Color3.fromRGB(64, 195, 153), reflectance = 0.04}),
    }),
  }),
  BRICK = table.freeze({
    defaultVariant = "RED",
    variants = table.freeze({
      RED = table.freeze({material = Enum.Material.Brick, color = Color3.fromRGB(142, 86, 67), reflectance = 0.00}),
      DARK = table.freeze({material = Enum.Material.Brick, color = Color3.fromRGB(88, 66, 58), reflectance = 0.00}),
      PALE = table.freeze({material = Enum.Material.Brick, color = Color3.fromRGB(176, 145, 121), reflectance = 0.00}),
      WEATHERED = table.freeze({material = Enum.Material.Brick, color = Color3.fromRGB(122, 104, 92), reflectance = 0.00}),
    }),
  }),
  ICE = table.freeze({
    defaultVariant = "CLEAR_BLUE",
    variants = table.freeze({
      CLEAR_BLUE = table.freeze({material = Enum.Material.Ice, color = Color3.fromRGB(151, 206, 229), reflectance = 0.10}),
      PALE = table.freeze({material = Enum.Material.Ice, color = Color3.fromRGB(205, 232, 239), reflectance = 0.12}),
      DEEP = table.freeze({material = Enum.Material.Glacier, color = Color3.fromRGB(107, 164, 201), reflectance = 0.08}),
      FROSTED = table.freeze({material = Enum.Material.Snow, color = Color3.fromRGB(226, 235, 237), reflectance = 0.02}),
    }),
  }),
  ASPHALT = table.freeze({
    defaultVariant = "ROAD",
    variants = table.freeze({
      ROAD = table.freeze({material = Enum.Material.Asphalt, color = Color3.fromRGB(65, 68, 70), reflectance = 0.00}),
      DARK = table.freeze({material = Enum.Material.Asphalt, color = Color3.fromRGB(42, 45, 47), reflectance = 0.00}),
      WORN = table.freeze({material = Enum.Material.Asphalt, color = Color3.fromRGB(89, 88, 83), reflectance = 0.00}),
      PALE = table.freeze({material = Enum.Material.Pavement, color = Color3.fromRGB(128, 126, 119), reflectance = 0.00}),
    }),
  }),
  SKIN = table.freeze({
    defaultVariant = "WARM",
    variants = table.freeze({
      WARM = table.freeze({material = Enum.Material.SmoothPlastic, color = Color3.fromRGB(196, 151, 122), reflectance = 0.00}),
      PALE = table.freeze({material = Enum.Material.SmoothPlastic, color = Color3.fromRGB(224, 192, 167), reflectance = 0.00}),
      DEEP = table.freeze({material = Enum.Material.SmoothPlastic, color = Color3.fromRGB(111, 75, 57), reflectance = 0.00}),
      COOL = table.freeze({material = Enum.Material.SmoothPlastic, color = Color3.fromRGB(173, 139, 132), reflectance = 0.00}),
    }),
  }),
  BONE = table.freeze({
    defaultVariant = "NATURAL",
    variants = table.freeze({
      NATURAL = table.freeze({material = Enum.Material.SmoothPlastic, color = Color3.fromRGB(218, 210, 184), reflectance = 0.00}),
      AGED = table.freeze({material = Enum.Material.Limestone, color = Color3.fromRGB(178, 165, 132), reflectance = 0.00}),
      PALE = table.freeze({material = Enum.Material.SmoothPlastic, color = Color3.fromRGB(238, 232, 212), reflectance = 0.00}),
      CHARRED = table.freeze({material = Enum.Material.Rock, color = Color3.fromRGB(83, 78, 69), reflectance = 0.00}),
    }),
  }),
  WATER = table.freeze({
    defaultVariant = "CLEAR",
    variants = table.freeze({
      CLEAR = table.freeze({material = Enum.Material.Glass, color = Color3.fromRGB(121, 190, 214), reflectance = 0.08, transparency = 0.38}),
      DEEP = table.freeze({material = Enum.Material.Glass, color = Color3.fromRGB(54, 116, 158), reflectance = 0.10, transparency = 0.32}),
      SWAMP = table.freeze({material = Enum.Material.Glass, color = Color3.fromRGB(94, 125, 89), reflectance = 0.04, transparency = 0.42}),
      FROZEN = table.freeze({material = Enum.Material.Ice, color = Color3.fromRGB(187, 224, 236), reflectance = 0.10, transparency = 0.16}),
    }),
  }),
  MUD = table.freeze({
    defaultVariant = "WET",
    variants = table.freeze({
      WET = table.freeze({material = Enum.Material.Mud, color = Color3.fromRGB(83, 67, 49), reflectance = 0.02}),
      DARK = table.freeze({material = Enum.Material.Mud, color = Color3.fromRGB(56, 49, 41), reflectance = 0.01}),
      RED = table.freeze({material = Enum.Material.Mud, color = Color3.fromRGB(119, 72, 48), reflectance = 0.01}),
      DRYING = table.freeze({material = Enum.Material.Ground, color = Color3.fromRGB(132, 111, 82), reflectance = 0.00}),
    }),
  }),
  SAND = table.freeze({
    defaultVariant = "DRY",
    variants = table.freeze({
      DRY = table.freeze({material = Enum.Material.Sand, color = Color3.fromRGB(207, 185, 136), reflectance = 0.00}),
      PALE = table.freeze({material = Enum.Material.Sand, color = Color3.fromRGB(229, 211, 166), reflectance = 0.00}),
      RED = table.freeze({material = Enum.Material.Sand, color = Color3.fromRGB(185, 126, 82), reflectance = 0.00}),
      WET = table.freeze({material = Enum.Material.Sand, color = Color3.fromRGB(145, 126, 96), reflectance = 0.01}),
    }),
  }),
  SNOW = table.freeze({
    defaultVariant = "FRESH",
    variants = table.freeze({
      FRESH = table.freeze({material = Enum.Material.Snow, color = Color3.fromRGB(238, 243, 244), reflectance = 0.02}),
      PACKED = table.freeze({material = Enum.Material.Snow, color = Color3.fromRGB(211, 222, 226), reflectance = 0.02}),
      DIRTY = table.freeze({material = Enum.Material.Snow, color = Color3.fromRGB(178, 177, 165), reflectance = 0.00}),
      ICED = table.freeze({material = Enum.Material.Glacier, color = Color3.fromRGB(175, 214, 230), reflectance = 0.08}),
    }),
  }),
  MOSS = table.freeze({
    defaultVariant = "GREEN",
    variants = table.freeze({
      GREEN = table.freeze({material = Enum.Material.Grass, color = Color3.fromRGB(74, 104, 61), reflectance = 0.00}),
      DEEP = table.freeze({material = Enum.Material.Grass, color = Color3.fromRGB(46, 72, 43), reflectance = 0.00}),
      PALE = table.freeze({material = Enum.Material.Grass, color = Color3.fromRGB(115, 128, 83), reflectance = 0.00}),
      DAMP = table.freeze({material = Enum.Material.Grass, color = Color3.fromRGB(58, 88, 59), reflectance = 0.01}),
    }),
  }),
  EMISSIVE = table.freeze({
    defaultVariant = "COOL",
    variants = table.freeze({
      COOL = table.freeze({material = Enum.Material.Neon, color = Color3.fromRGB(98, 193, 255), reflectance = 0.04}),
      WARM = table.freeze({material = Enum.Material.Neon, color = Color3.fromRGB(255, 185, 92), reflectance = 0.04}),
      TOXIC = table.freeze({material = Enum.Material.Neon, color = Color3.fromRGB(150, 245, 102), reflectance = 0.04}),
      VOID = table.freeze({material = Enum.Material.Neon, color = Color3.fromRGB(177, 102, 255), reflectance = 0.04}),
    }),
  }),
  CORROSION = table.freeze({
    defaultVariant = "RUST_LIGHT",
    variants = table.freeze({
      RUST_LIGHT = table.freeze({material = Enum.Material.Metal, color = Color3.fromRGB(143, 88, 56), reflectance = 0.01}),
      RUST_HEAVY = table.freeze({material = Enum.Material.Metal, color = Color3.fromRGB(99, 58, 42), reflectance = 0.00}),
      OXIDIZED = table.freeze({material = Enum.Material.Metal, color = Color3.fromRGB(75, 120, 111), reflectance = 0.01}),
      SALT_WORN = table.freeze({material = Enum.Material.Metal, color = Color3.fromRGB(153, 151, 137), reflectance = 0.02}),
    }),
  }),
  DIRT = table.freeze({
    defaultVariant = "DUST",
    variants = table.freeze({
      DUST = table.freeze({material = Enum.Material.Ground, color = Color3.fromRGB(150, 130, 98), reflectance = 0.00}),
      SOOT = table.freeze({material = Enum.Material.Ground, color = Color3.fromRGB(65, 61, 57), reflectance = 0.00}),
      ASH = table.freeze({material = Enum.Material.Ground, color = Color3.fromRGB(125, 126, 121), reflectance = 0.00}),
      CLAY = table.freeze({material = Enum.Material.Ground, color = Color3.fromRGB(151, 91, 64), reflectance = 0.00}),
    }),
  }),
  WET_DRY = table.freeze({
    defaultVariant = "DRY",
    variants = table.freeze({
      DRY = table.freeze({material = Enum.Material.Ground, color = Color3.fromRGB(139, 122, 91), reflectance = 0.00}),
      DAMP = table.freeze({material = Enum.Material.Ground, color = Color3.fromRGB(104, 91, 70), reflectance = 0.01}),
      WET = table.freeze({material = Enum.Material.Mud, color = Color3.fromRGB(75, 66, 57), reflectance = 0.04}),
      SOAKED = table.freeze({material = Enum.Material.Mud, color = Color3.fromRGB(53, 51, 48), reflectance = 0.07}),
    }),
  }),
  DAMAGE = table.freeze({
    defaultVariant = "WORN",
    variants = table.freeze({
      WORN = table.freeze({material = Enum.Material.Slate, color = Color3.fromRGB(113, 108, 99), reflectance = 0.00}),
      SCRATCHED = table.freeze({material = Enum.Material.Metal, color = Color3.fromRGB(132, 132, 126), reflectance = 0.04}),
      CRACKED = table.freeze({material = Enum.Material.Rock, color = Color3.fromRGB(101, 96, 90), reflectance = 0.00}),
      SCORCHED = table.freeze({material = Enum.Material.Slate, color = Color3.fromRGB(55, 51, 48), reflectance = 0.00}),
    }),
  }),
  WEATHERING = table.freeze({
    defaultVariant = "AGED",
    variants = table.freeze({
      AGED = table.freeze({material = Enum.Material.WoodPlanks, color = Color3.fromRGB(115, 102, 83), reflectance = 0.00}),
      SUN_BLEACHED = table.freeze({material = Enum.Material.WoodPlanks, color = Color3.fromRGB(165, 148, 120), reflectance = 0.00}),
      RAIN_DARKENED = table.freeze({material = Enum.Material.WoodPlanks, color = Color3.fromRGB(82, 73, 63), reflectance = 0.01}),
      MINERAL_STAIN = table.freeze({material = Enum.Material.Rock, color = Color3.fromRGB(127, 111, 92), reflectance = 0.00}),
    }),
  }),
  STYLE_VARIANT = table.freeze({
    defaultVariant = "FANTASY",
    variants = table.freeze({
      FANTASY = table.freeze({material = Enum.Material.Fabric, color = Color3.fromRGB(104, 92, 133), reflectance = 0.01}),
      INDUSTRIAL = table.freeze({material = Enum.Material.DiamondPlate, color = Color3.fromRGB(95, 101, 106), reflectance = 0.06}),
      COZY = table.freeze({material = Enum.Material.WoodPlanks, color = Color3.fromRGB(154, 112, 76), reflectance = 0.00}),
      HORROR = table.freeze({material = Enum.Material.Slate, color = Color3.fromRGB(61, 57, 62), reflectance = 0.00}),
    }),
  })

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
  part:SetAttribute("MaterialAssetId",atomId)
  part:SetAttribute("MaterialAssetVariant",variantId)
  part:SetAttribute("MaterialAssetPack","roblox-common-materials-v1")
  part:SetAttribute("MaterialProductionVerified",false)
  part:SetAttribute("MaterialRuntimeVerificationState","PENDING_STUDIO")
  part:SetAttribute("PreservesPhysicalProperties",true)
  -- A material must not overwrite the mesh/weapon/character's source identity.
  if part:GetAttribute("StudioAssetId")==nil then
    part:SetAttribute("StudioAssetId",atomId)
    part:SetAttribute("StudioAssetVariant",variantId)
    part:SetAttribute("StudioAssetPack","roblox-common-materials-v1")
    part:SetAttribute("StudioAssetFamily","MATERIAL")
    part:SetAttribute("ProductionVerified",false)
    part:SetAttribute("RuntimeVerificationState","PENDING_STUDIO")
  end
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

  local originalMaterial = part.Material
  if options.clearMaterialVariant == true then part.MaterialVariant = "" end
  part.Material = options.preserveBaseMaterial and originalMaterial or preset.material

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

  if preset.transparency ~= nil or options.transparency ~= nil then
    part.Transparency = clamp(options.transparency ~= nil and options.transparency or preset.transparency, 0, 0.85)
  end

  if preservePhysics and physicalBefore then
    part.CustomPhysicalProperties = physicalBefore
  end

  -- Map properties belong to imported MaterialVariant instances, not runtime scripts.
  local pbr=options.materialVariant
  if type(pbr)=="string" and pbr~="" then
    local variant=game:GetService("MaterialService"):FindFirstChild(pbr)
    if variant and variant:IsA("MaterialVariant") and variant.BaseMaterial==part.Material then
      part.MaterialVariant=pbr
      part:SetAttribute("PBRBindingState","NATIVE_VARIANT_BOUND_REVIEW_PENDING")
    else
      part:SetAttribute("PBRBindingState","NATIVE_VARIANT_REQUIRED")
    end
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

-- Imported mesh PBR and atlas UVs remain authoritative for those objects.
local ROLE_MATERIALS={Wood="WOOD",WoodPlanks="WOOD",Slate="STONE",Rock="STONE",Limestone="STONE",Cobblestone="STONE",Concrete="STONE",Marble="STONE",Brick="BRICK",Metal="METAL",CorrodedMetal="CORROSION",DiamondPlate="METAL",Fabric="FABRIC",Ground="GROUND",Grass="MOSS",LeafyGrass="MOSS",Mud="MUD",Sand="SAND",Sandstone="SAND",Snow="SNOW",Ice="ICE",Glacier="ICE",Asphalt="ASPHALT",Pavement="ASPHALT"}
local PBR_SOURCES={Wood="Wood062",WoodPlanks="WoodFloor051",Slate="Rock035",Rock="Rock030",Limestone="Rock030",Cobblestone="Rock035",Concrete="Concrete034",Marble="Marble012",Brick="Bricks059",Metal="Metal046A",CorrodedMetal="Metal032",DiamondPlate="MetalPlates006",Fabric="Fabric026",Ground="Ground037",Grass="Grass001",LeafyGrass="Grass001",Mud="Ground054"}
function RobloxCommonMaterials.ApplyAuthoredSurface(part,style)
 if not part:IsA("BasePart") or part.Transparency>=1 or part:GetAttribute("PreserveAuthoredMaterial")==true then return false end
 if part:IsA("MeshPart") and (part:FindFirstChildOfClass("SurfaceAppearance") or part.TextureID~="")then return false end
 local mesh=part:FindFirstChildOfClass("SpecialMesh")
 if mesh and mesh.TextureId~=""then return false end
 local explicitRole=part:GetAttribute("SurfaceRole")
 local toyRequested=explicitRole=="TOY_PLASTIC" or explicitRole=="TOY_STUDDED"
 if part.MaterialVariant~=""and not toyRequested then return false end
 local materialName=part.Material.Name
 local atom=part:GetAttribute("SurfaceRole") or ROLE_MATERIALS[materialName]
 if not atom or not PRESETS[atom]then return false end
 -- An explicit toy-stud surface is cosmetic, and only a standard Part supports native studs.
 local studRequested=atom=="TOY_STUDDED" and part:GetAttribute("SurfaceStudsEnabled")==true
   and part:IsA("Part") and part.Shape==Enum.PartType.Block and part.Anchored
 if atom=="TOY_STUDDED" and not studRequested then return false end
 local source=PBR_SOURCES[materialName]
 if style=="HORROR"then
  if materialName=="WoodPlanks"then source="Wood062"elseif materialName=="Concrete"then source="Concrete046"elseif materialName=="Brick"then source="Bricks079"end
 elseif style=="COZY" and materialName=="Fabric"then source="Fabric030"end
 local name=string.lower(part.Name)
 if atom=="FABRIC" and (name:find("boot",1,true) or name:find("pouch",1,true) or name:find("belt",1,true))then atom="LEATHER_LIKE";source=style=="HORROR"and"Leather026"or"Leather008"end
 local transparency=part.Transparency
 local toy=atom=="TOY_PLASTIC" or atom=="TOY_STUDDED"
 if toy then source=nil end
 local preserveTint=not toy or part:GetAttribute("PreserveAuthoredTint")==true
 RobloxCommonMaterials.Apply(part,atom,{
   variant=toy and part:GetAttribute("SurfacePaletteVariant") or nil,
   tint=preserveTint and part.Color or nil,tintStrength=1,preservePhysics=true,
   preserveBaseMaterial=not toy,clearMaterialVariant=toy,
   materialVariant=source and ("Vibe_"..materialName.."_"..source) or nil})
 if studRequested then
  -- 반복 빌드업에서도 최초 표면 정보를 보존하며 네이티브 스터드만 표현한다.
  if part.TopSurface~=Enum.SurfaceType.Studs then
   part:SetAttribute("PreviousTopSurfaceName",part.TopSurface.Name)
  end
  part.TopSurface=Enum.SurfaceType.Studs
  part:SetAttribute("NativeStudsApplied",true)
  part:SetAttribute("ToyStudRuntimeVerified",false)
 end
 part.Transparency=transparency
 part:SetAttribute("MaterialSourceId",source)
 part:SetAttribute("MaterialStyle",style)
 return true
end

function RobloxCommonMaterials.Audit()
  return table.freeze({
    version = 5,
    packId = "roblox-common-materials-v1",
    atoms = table.freeze({
      "WOOD", "STONE", "METAL", "GLASS", "FABRIC", "LEATHER_LIKE", "GROUND", "MAGIC_CRYSTAL", "BRICK", "TOY_PLASTIC", "TOY_STUDDED", "ICE", "ASPHALT",
      "SKIN", "BONE", "WATER", "MUD", "SAND", "SNOW", "MOSS", "EMISSIVE", "CORROSION", "DIRT", "WET_DRY", "DAMAGE", "WEATHERING", "STYLE_VARIANT"
    }),
    atomCount = 27,
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
