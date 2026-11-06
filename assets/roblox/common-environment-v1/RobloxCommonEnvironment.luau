-- 파일명: assets/roblox/common-environment-v1/RobloxCommonEnvironment.luau
-- 역할: 회사 공용 Roblox 환경/배경 조립 베이스
-- 원칙: 시각 자산만 생성한다. 자원량, 충돌 판정, 스폰, 전투, 저장, 네트워크 권한은 게임 코드가 소유한다.

local CommonEnvironment = {}

local BIOMES = table.freeze({
  FOREST={ground=Color3.fromRGB(66,83,48),secondary=Color3.fromRGB(92,112,62),rock=Color3.fromRGB(92,96,86),water=Color3.fromRGB(56,104,118),landmark="ANCIENT_TREE",dress={"FERN","LOG","MOSS_ROCK","STUMP","FLOWER_PATCH","FALLEN_BRANCH"}},
  SNOW={ground=Color3.fromRGB(210,220,228),secondary=Color3.fromRGB(168,186,196),rock=Color3.fromRGB(112,126,138),water=Color3.fromRGB(92,142,166),landmark="ICE_SPIRE",dress={"SNOW_DRIFT","PINE","ICE_CHUNK","FROST_ROCK","DEAD_BRANCH","SNOW_MOUND"}},
  DESERT={ground=Color3.fromRGB(187,145,91),secondary=Color3.fromRGB(156,111,69),rock=Color3.fromRGB(132,94,68),water=Color3.fromRGB(64,132,142),landmark="STONE_ARCH",dress={"DUNE","DRY_SHRUB","CACTUS_FORM","BONE_PILE","ERODED_ROCK","SAND_RIPPLE"}},
  SWAMP={ground=Color3.fromRGB(64,72,46),secondary=Color3.fromRGB(86,91,55),rock=Color3.fromRGB(70,76,64),water=Color3.fromRGB(62,92,73),landmark="ROOT_TOWER",dress={"ROOT","REED","MUD_PATCH","MOSS_STONE","DEAD_TREE","SPORE_CLUSTER"}},
  CAVE={ground=Color3.fromRGB(58,57,61),secondary=Color3.fromRGB(74,70,78),rock=Color3.fromRGB(91,88,96),water=Color3.fromRGB(48,84,104),landmark="CRYSTAL_CHAMBER",dress={"STALAGMITE","RUBBLE","CRYSTAL","LEDGE","CAVE_POOL","BROKEN_COLUMN"}},
  COAST={ground=Color3.fromRGB(178,164,116),secondary=Color3.fromRGB(96,122,92),rock=Color3.fromRGB(112,113,108),water=Color3.fromRGB(48,118,151),landmark="SEA_STACK",dress={"DRIFTWOOD","SHELL_CLUSTER","TIDE_POOL","COAST_ROCK","GRASS_TUFT","WASHED_CRATE"}},
  VILLAGE={ground=Color3.fromRGB(111,104,80),secondary=Color3.fromRGB(126,117,88),rock=Color3.fromRGB(104,101,93),water=Color3.fromRGB(60,108,126),landmark="TOWN_TREE",dress={"FENCE","CART","BARREL","LAMP","BENCH","SIGNPOST"}},
  CITY={ground=Color3.fromRGB(80,84,91),secondary=Color3.fromRGB(101,106,114),rock=Color3.fromRGB(104,108,116),water=Color3.fromRGB(55,96,120),landmark="CLOCK_TOWER",dress={"BOLLARD","PLANTER","STREET_LAMP","BENCH","SIGNAGE","UTILITY_BOX"}},
  RUINS={ground=Color3.fromRGB(102,94,72),secondary=Color3.fromRGB(119,110,84),rock=Color3.fromRGB(121,116,99),water=Color3.fromRGB(63,101,107),landmark="BROKEN_GATE",dress={"COLUMN","RUBBLE","CARVED_STONE","BROKEN_WALL","ALTAR","VINE_CLUSTER"}},
  DUNGEON={ground=Color3.fromRGB(53,50,54),secondary=Color3.fromRGB(72,65,62),rock=Color3.fromRGB(88,82,79),water=Color3.fromRGB(48,76,82),landmark="SEALED_DOOR",dress={"CHAIN","BRAZIER_BASE","BROKEN_CRATE","PILLAR","RUBBLE","WALL_RELIEF"}}
})

local COMPOSITIONS=table.freeze({
  ROLLING_HILLS={biome="FOREST",terrain={"HILL","HILL","HILL","MEADOW"},background="LAYERED_HILLS",poi="HILLTOP"},
  RIDGE_PASS={biome="SNOW",terrain={"RIDGE","RIDGE","PASS","CLIFF"},background="MOUNTAIN_RIDGE",poi="PASS_GATE"},
  RIVER_VALLEY={biome="FOREST",terrain={"HILL","VALLEY","RIVER","BANK"},background="VALLEY_DEPTH",poi="RIVER_CROSSING"},
  TERRACED_HILLS={biome="VILLAGE",terrain={"TERRACE","TERRACE","TERRACE","PATH"},background="FARM_HILLS",poi="TERRACE_LOOKOUT"},
  MEADOW_BASIN={biome="FOREST",terrain={"BASIN","MEADOW","HILL","HILL"},background="BASIN_RING",poi="MEADOW_CENTER"},
  FOREST_EDGE={biome="FOREST",terrain={"MEADOW","FOREST_EDGE","HILL","PATH"},background="TREE_WALL",poi="FOREST_GATE"},
  VILLAGE_HILL={biome="VILLAGE",terrain={"HILL","VILLAGE_CLUSTER","PATH","TERRACE"},background="HILL_VILLAGE",poi="VILLAGE_CENTER"},
  VILLAGE_CROSSROADS={biome="VILLAGE",terrain={"CROSSROADS","VILLAGE_CLUSTER","VILLAGE_CLUSTER","MEADOW"},background="OPEN_COUNTRYSIDE",poi="CROSSROADS_SQUARE"},
  FARM_HAMLET={biome="VILLAGE",terrain={"FARM_FIELD","VILLAGE_CLUSTER","CROP_TERRACE","PATH"},background="FARM_COUNTRYSIDE",poi="HAMLET_CENTER"},
  CLIFF_SETTLEMENT={biome="COAST",terrain={"CLIFF","TERRACE","VILLAGE_CLUSTER","STAIR_PATH"},background="CLIFF_DEPTH",poi="CLIFF_LOOKOUT"},
  COAST_VILLAGE={biome="COAST",terrain={"BEACH","VILLAGE_CLUSTER","HILL","WATER_EDGE"},background="SEA_HORIZON",poi="HARBOR"},
  RUINED_HIGHLAND={biome="RUINS",terrain={"PLATEAU","RIDGE","RUIN_CLUSTER","CLIFF"},background="HIGH_MOUNTAINS",poi="RUIN_CROWN"},
  MOUNTAIN_FOOT={biome="FOREST",terrain={"RIDGE","HILL","MEADOW","PATH"},background="MOUNTAIN_FOOT",poi="TRAILHEAD"},
  RIVER_TOWN={biome="VILLAGE",terrain={"RIVER","BANK","VILLAGE_CLUSTER","CROSSROADS"},background="RIVER_TOWN",poi="RIVER_SQUARE"},
  SNOW_HAMLET={biome="SNOW",terrain={"HILL","VILLAGE_CLUSTER","RIDGE","PATH"},background="SNOW_HAMLET",poi="WARM_LIGHTS"},
  OASIS_SETTLEMENT={biome="DESERT",terrain={"DUNE_RIDGE","WATER_EDGE","VILLAGE_CLUSTER","PATH"},background="DESERT_OASIS",poi="OASIS_CENTER"},
  WETLAND_HAMLET={biome="SWAMP",terrain={"WETLAND_ISLAND","WATER_EDGE","VILLAGE_CLUSTER","PATH"},background="WETLAND_DEPTH",poi="BOARDWALK_CENTER"},
  CAVE_OUTPOST={biome="CAVE",terrain={"LEDGE","CAVE_FLOOR","VILLAGE_CLUSTER","PASS"},background="CAVE_DEPTH",poi="OUTPOST_LIGHT"},
  CITY_OUTSKIRTS={biome="CITY",terrain={"ROAD_GRID","VILLAGE_CLUSTER","VILLAGE_CLUSTER","OPEN_LOT"},background="CITY_EDGE",poi="DISTRICT_GATE"},
  RUIN_VALLEY={biome="RUINS",terrain={"VALLEY","RUIN_CLUSTER","RIDGE","PATH"},background="RUIN_VALLEY",poi="FALLEN_MONUMENT"},
  ISLAND_TERRACES={biome="COAST",terrain={"TERRACE","HILL","BEACH","WATER_EDGE"},background="ISLAND_DEPTH",poi="ISLAND_LOOKOUT"},
  FOREST_GULLY={biome="FOREST",terrain={"GULLY","HILL","FOREST_EDGE","CREEK"},background="FOREST_GULLY",poi="CREEK_CROSSING"},
  DESERT_ESCARPMENT={biome="DESERT",terrain={"ESCARPMENT","DUNE_RIDGE","PATH","ROCK_FIELD"},background="DESERT_DEPTH",poi="ESCARPMENT_GATE"},
  SNOW_BASIN={biome="SNOW",terrain={"BASIN","RIDGE","MEADOW","PATH"},background="SNOW_BASIN",poi="FROST_BASIN"}
})



local ENVIRONMENT_STATES=table.freeze({
  CLEAR_DAY=table.freeze({
    cloudCover=0.12,cloudDensity=0.28,atmosphereDensity=0.24,haze=0.45,glare=0.18,
    atmosphereColor=Color3.fromRGB(199,220,235),decayColor=Color3.fromRGB(113,133,153),
    brightness=0.02,contrast=0.04,saturation=0.04,tint=Color3.fromRGB(255,252,245),
    bloomIntensity=0.12,bloomThreshold=1.15,sunRaysIntensity=0.10,sunRaysSpread=0.78,
    skyRole="CLEAR_DEEP_SKY",backgroundRole="HIGH_VISIBILITY_LAYERED_DISTANCE",surfaceRole="DRY",
    precipitationRole="NONE",windRole="LIGHT_BREEZE",visibilityRole="LONG_RANGE",celestialRole="NORMAL",
    soundscapeRoles=table.freeze({"WIND_LIGHT","BIRD_DAY","INSECT_DAY"})
  }),
  OVERCAST=table.freeze({
    cloudCover=0.72,cloudDensity=0.62,atmosphereDensity=0.34,haze=1.15,glare=0.05,
    atmosphereColor=Color3.fromRGB(184,194,202),decayColor=Color3.fromRGB(105,111,119),
    brightness=-0.04,contrast=-0.03,saturation=-0.12,tint=Color3.fromRGB(226,232,236),
    bloomIntensity=0.05,bloomThreshold=1.35,sunRaysIntensity=0.01,sunRaysSpread=0.55,
    skyRole="LAYERED_OVERCAST",backgroundRole="SOFTENED_DISTANCE",surfaceRole="DRY_TO_DAMP",
    precipitationRole="NONE",windRole="SOFT_VARIABLE",visibilityRole="MEDIUM_LONG",celestialRole="OBSCURED",
    soundscapeRoles=table.freeze({"WIND_SOFT","DISTANT_BIRD","TREE_LEAF_SOFT"})
  }),
  RAIN=table.freeze({
    cloudCover=0.84,cloudDensity=0.70,atmosphereDensity=0.40,haze=1.55,glare=0.02,
    atmosphereColor=Color3.fromRGB(162,179,190),decayColor=Color3.fromRGB(84,101,112),
    brightness=-0.08,contrast=0.02,saturation=-0.16,tint=Color3.fromRGB(205,220,229),
    bloomIntensity=0.05,bloomThreshold=1.40,sunRaysIntensity=0.00,sunRaysSpread=0.45,
    skyRole="RAIN_CEILING",backgroundRole="RAIN_VEIL_DISTANCE",surfaceRole="WET_REFLECTIVE",
    precipitationRole="RAIN_STREAKS_AND_SPLASH",windRole="WET_BREEZE",visibilityRole="MEDIUM",celestialRole="OBSCURED",
    soundscapeRoles=table.freeze({"RAIN_NEAR","RAIN_DISTANT","WIND_WET","WATER_RUNOFF"})
  }),
  HEAVY_RAIN=table.freeze({
    cloudCover=0.94,cloudDensity=0.84,atmosphereDensity=0.48,haze=2.20,glare=0.00,
    atmosphereColor=Color3.fromRGB(143,160,174),decayColor=Color3.fromRGB(69,82,96),
    brightness=-0.13,contrast=0.05,saturation=-0.22,tint=Color3.fromRGB(187,204,216),
    bloomIntensity=0.04,bloomThreshold=1.45,sunRaysIntensity=0.00,sunRaysSpread=0.35,
    skyRole="HEAVY_STORM_CEILING",backgroundRole="DENSE_RAIN_DEPTH",surfaceRole="SATURATED_WET",
    precipitationRole="HEAVY_RAIN_SPLASH_RUNOFF",windRole="GUSTY_WET",visibilityRole="SHORT_MEDIUM",celestialRole="OBSCURED",
    soundscapeRoles=table.freeze({"RAIN_HEAVY_GROUND","RAIN_HEAVY_ROOF","GUTTER_RUNOFF","WIND_GUST"})
  }),
  THUNDERSTORM=table.freeze({
    cloudCover=0.98,cloudDensity=0.90,atmosphereDensity=0.52,haze=2.65,glare=0.00,
    atmosphereColor=Color3.fromRGB(128,145,162),decayColor=Color3.fromRGB(58,66,82),
    brightness=-0.18,contrast=0.10,saturation=-0.24,tint=Color3.fromRGB(174,190,210),
    bloomIntensity=0.08,bloomThreshold=1.25,sunRaysIntensity=0.00,sunRaysSpread=0.28,
    skyRole="THUNDERHEAD_STACK",backgroundRole="STORM_FRONT_SILHOUETTE",surfaceRole="SATURATED_WET",
    precipitationRole="HEAVY_RAIN_WITH_LIGHTNING_CUE",windRole="GUST_FRONT",visibilityRole="SHORT_MEDIUM",celestialRole="OBSCURED",
    lightningPresentationRole="MULTI_DISTANCE_SKY_FLASH",soundscapeRoles=table.freeze({"RAIN_HEAVY_GROUND","WIND_GUST","THUNDER_NEAR_FAR","TREE_CREAK","STRUCTURE_RATTLE"})
  }),
  SNOW=table.freeze({
    cloudCover=0.82,cloudDensity=0.68,atmosphereDensity=0.42,haze=1.70,glare=0.03,
    atmosphereColor=Color3.fromRGB(211,220,228),decayColor=Color3.fromRGB(146,159,173),
    brightness=-0.01,contrast=-0.08,saturation=-0.28,tint=Color3.fromRGB(235,242,248),
    bloomIntensity=0.09,bloomThreshold=1.20,sunRaysIntensity=0.02,sunRaysSpread=0.62,
    skyRole="SNOW_OVERCAST",backgroundRole="SNOW_SOFT_DEPTH",surfaceRole="SNOW_ACCUMULATION",
    precipitationRole="SNOW_FLAKE_DEPTH_BANDS",windRole="COLD_BREEZE",visibilityRole="MEDIUM",celestialRole="OBSCURED",
    soundscapeRoles=table.freeze({"WIND_COLD","SNOW_HUSH","DISTANT_CROW"})
  }),
  BLIZZARD=table.freeze({
    cloudCover=0.96,cloudDensity=0.84,atmosphereDensity=0.62,haze=4.10,glare=0.00,
    atmosphereColor=Color3.fromRGB(220,226,232),decayColor=Color3.fromRGB(166,176,188),
    brightness=-0.06,contrast=-0.16,saturation=-0.38,tint=Color3.fromRGB(234,241,248),
    bloomIntensity=0.06,bloomThreshold=1.35,sunRaysIntensity=0.00,sunRaysSpread=0.30,
    skyRole="WHITEOUT_SKY",backgroundRole="WHITEOUT_OCCLUSION",surfaceRole="DEEP_SNOW_DRIFT",
    precipitationRole="SNOW_GUST_WHITEOUT",windRole="GALE_COLD",visibilityRole="VERY_SHORT",celestialRole="OBSCURED",
    soundscapeRoles=table.freeze({"WIND_GALE_COLD","SNOW_GUST","STRUCTURE_RATTLE","TREE_CREAK"})
  }),
  FOG=table.freeze({
    cloudCover=0.55,cloudDensity=0.48,atmosphereDensity=0.58,haze=4.60,glare=0.00,
    atmosphereColor=Color3.fromRGB(201,209,211),decayColor=Color3.fromRGB(151,160,164),
    brightness=-0.05,contrast=-0.20,saturation=-0.30,tint=Color3.fromRGB(222,227,225),
    bloomIntensity=0.04,bloomThreshold=1.40,sunRaysIntensity=0.00,sunRaysSpread=0.25,
    skyRole="FOG_CEILING",backgroundRole="FOG_LAYER_OCCLUSION",surfaceRole="DAMP",
    precipitationRole="MIST_OPTIONAL",windRole="CALM",visibilityRole="VERY_SHORT",celestialRole="OBSCURED",
    soundscapeRoles=table.freeze({"WIND_LOW","WATER_DRIP","DISTANT_WILDLIFE","AMBIENT_HUSH"})
  }),
  STRONG_WIND=table.freeze({
    cloudCover=0.44,cloudDensity=0.50,atmosphereDensity=0.30,haze=0.95,glare=0.10,
    atmosphereColor=Color3.fromRGB(184,205,219),decayColor=Color3.fromRGB(101,120,137),
    brightness=-0.02,contrast=0.06,saturation=-0.06,tint=Color3.fromRGB(230,239,244),
    bloomIntensity=0.07,bloomThreshold=1.30,sunRaysIntensity=0.05,sunRaysSpread=0.65,
    skyRole="FAST_CLOUD_BANDS",backgroundRole="WIND_SWEPT_DISTANCE",surfaceRole="DRY_OR_DAMP",
    precipitationRole="NONE",windRole="GALE_VARIABLE",visibilityRole="LONG",celestialRole="NORMAL",
    soundscapeRoles=table.freeze({"WIND_GALE","TREE_CREAK","CLOTH_FLAP","SIGN_RATTLE"})
  }),
  WHITE_NIGHT=table.freeze({
    cloudCover=0.22,cloudDensity=0.30,atmosphereDensity=0.26,haze=0.75,glare=0.22,
    atmosphereColor=Color3.fromRGB(205,219,235),decayColor=Color3.fromRGB(157,149,173),
    brightness=0.05,contrast=-0.04,saturation=-0.04,tint=Color3.fromRGB(235,229,242),
    bloomIntensity=0.12,bloomThreshold=1.10,sunRaysIntensity=0.08,sunRaysSpread=0.82,
    skyRole="POLAR_TWILIGHT_SKY",backgroundRole="LONG_TWILIGHT_GRADIENT",surfaceRole="COOL_DRY",
    precipitationRole="NONE",windRole="LIGHT_BREEZE",visibilityRole="LONG",celestialRole="LOW_HORIZON_DAYLIGHT",
    soundscapeRoles=table.freeze({"WIND_LIGHT","BIRD_LATE","INSECT_TWILIGHT"})
  }),
  SOLAR_ECLIPSE=table.freeze({
    cloudCover=0.18,cloudDensity=0.28,atmosphereDensity=0.32,haze=1.05,glare=0.02,
    atmosphereColor=Color3.fromRGB(124,142,159),decayColor=Color3.fromRGB(72,79,91),
    brightness=-0.24,contrast=0.16,saturation=-0.34,tint=Color3.fromRGB(163,178,199),
    bloomIntensity=0.03,bloomThreshold=1.45,sunRaysIntensity=0.00,sunRaysSpread=0.18,
    skyRole="ECLIPSE_TWILIGHT_RING",backgroundRole="ECLIPSE_SILHOUETTE_DEPTH",surfaceRole="COOL_DARKENED",
    precipitationRole="NONE",windRole="LOW_VARIABLE",visibilityRole="LONG_DARK",celestialRole="SOLAR_DISC_OCCLUSION",
    soundscapeRoles=table.freeze({"AMBIENT_HUSH","WIND_LOW","WILDLIFE_SILENCE_TRANSITION"})
  }),
  AURORA_NIGHT=table.freeze({
    cloudCover=0.08,cloudDensity=0.18,atmosphereDensity=0.22,haze=0.42,glare=0.06,
    atmosphereColor=Color3.fromRGB(88,122,145),decayColor=Color3.fromRGB(41,55,74),
    brightness=-0.12,contrast=0.10,saturation=0.02,tint=Color3.fromRGB(174,210,202),
    bloomIntensity=0.18,bloomThreshold=1.05,sunRaysIntensity=0.00,sunRaysSpread=0.20,
    skyRole="AURORA_CURTAIN",backgroundRole="NIGHT_LAYERED_SILHOUETTE",surfaceRole="COLD_DRY",
    precipitationRole="NONE",windRole="LIGHT_COLD",visibilityRole="LONG_NIGHT",celestialRole="AURORA_AND_STARS",
    soundscapeRoles=table.freeze({"WIND_LIGHT_COLD","NIGHT_INSECT","DISTANT_WILDLIFE"})
  }),
  SANDSTORM=table.freeze({
    cloudCover=0.66,cloudDensity=0.58,atmosphereDensity=0.66,haze=5.20,glare=0.01,
    atmosphereColor=Color3.fromRGB(191,153,104),decayColor=Color3.fromRGB(127,93,67),
    brightness=-0.09,contrast=-0.08,saturation=-0.14,tint=Color3.fromRGB(221,183,128),
    bloomIntensity=0.04,bloomThreshold=1.38,sunRaysIntensity=0.01,sunRaysSpread=0.28,
    skyRole="DUST_SKY",backgroundRole="SAND_OCCLUSION_DEPTH",surfaceRole="SAND_DRIFT",
    precipitationRole="AIRBORNE_SAND_DEBRIS",windRole="GALE_DRY",visibilityRole="VERY_SHORT",celestialRole="OBSCURED",
    soundscapeRoles=table.freeze({"WIND_SAND","DEBRIS_RATTLE","CLOTH_FLAP","SIGN_RATTLE"})
  }),
  HEAT_HAZE=table.freeze({
    cloudCover=0.05,cloudDensity=0.14,atmosphereDensity=0.20,haze=1.35,glare=0.42,
    atmosphereColor=Color3.fromRGB(230,203,159),decayColor=Color3.fromRGB(160,117,83),
    brightness=0.05,contrast=0.08,saturation=0.05,tint=Color3.fromRGB(255,231,191),
    bloomIntensity=0.15,bloomThreshold=1.08,sunRaysIntensity=0.15,sunRaysSpread=0.86,
    skyRole="HOT_CLEAR_SKY",backgroundRole="HEAT_SHIMMER_DISTANCE",surfaceRole="HOT_DRY",
    precipitationRole="NONE",windRole="THERMAL_LIGHT",visibilityRole="LONG_SHIMMER",celestialRole="HARSH_SUN",
    soundscapeRoles=table.freeze({"WIND_DRY_LIGHT","INSECT_DRY","DISTANT_BIRD"})
  })
})

local BIOME_SOUNDSCAPES=table.freeze({
  FOREST=table.freeze({"WIND_LEAF","BIRD_DAY","INSECT_DAY","WOOD_CREAK_SCATTER"}),
  SNOW=table.freeze({"WIND_COLD","DISTANT_CROW","SNOW_HUSH"}),
  DESERT=table.freeze({"WIND_DRY","INSECT_DRY","SAND_GRAIN_SCATTER"}),
  SWAMP=table.freeze({"FROG","INSECT_SWARM","WATER_BUBBLE","REED_RUSTLE"}),
  CAVE=table.freeze({"WATER_DRIP","CAVE_AIR","BAT_SCATTER","STONE_ECHO"}),
  COAST=table.freeze({"SURF_NEAR","SURF_DISTANT","GULL","COAST_WIND"}),
  VILLAGE=table.freeze({"WIND_SOFT","DISTANT_VOICE","ANIMAL_YARD","CART_WHEEL","TOOL_WORK"}),
  CITY=table.freeze({"DISTANT_VOICE","FOOTSTEP_SCATTER","CART_WHEEL","MACHINE_HUM","SIGN_RATTLE"}),
  RUINS=table.freeze({"WIND_RUIN","DISTANT_CROW","STONE_RATTLE","CLOTH_FLAP"}),
  DUNGEON=table.freeze({"WATER_DRIP","CHAIN_CREAK","TORCH_BURN","STONE_ECHO"})
})

local INTERACTION_ROLE_BY_DRESS=table.freeze({
  LOG="SIT_OR_INSPECT",STUMP="SIT_OR_INSPECT",FALLEN_BRANCH="GATHER_VISUAL",FERN="INSPECT_VISUAL",
  FLOWER_PATCH="GATHER_OR_INSPECT",MOSS_ROCK="CLIMB_OR_INSPECT",SNOW_DRIFT="TRACK_OR_INSPECT",
  ICE_CHUNK="HARVEST_OR_INSPECT",DRY_SHRUB="GATHER_VISUAL",BONE_PILE="INSPECT_VISUAL",CACTUS_FORM="HARVEST_OR_INSPECT",
  ROOT="CLIMB_OR_INSPECT",REED="GATHER_VISUAL",CRYSTAL="HARVEST_OR_INSPECT",CAVE_POOL="INSPECT_VISUAL",
  DRIFTWOOD="GATHER_OR_CARRY_VISUAL",SHELL_CLUSTER="GATHER_VISUAL",TIDE_POOL="INSPECT_VISUAL",
  CART="PUSH_OR_INSPECT",BARREL="OPEN_OR_INSPECT",LAMP="TOGGLE_VISUAL",BENCH="SIT_VISUAL",SIGNPOST="READ_VISUAL",
  PLANTER="INSPECT_VISUAL",UTILITY_BOX="INSPECT_OR_TOGGLE",ALTAR="INSPECT_VISUAL",CHAIN="INSPECT_VISUAL",
  STREET_LAMP="TOGGLE_OR_INSPECT",SIGNAGE="READ_VISUAL",BOLLARD="INSPECT_VISUAL",RUBBLE="INSPECT_OR_CLIMB",
  WALL_RELIEF="READ_OR_INSPECT",BRAZIER_BASE="TOGGLE_OR_INSPECT",WASHED_CRATE="OPEN_OR_INSPECT",BROKEN_CRATE="OPEN_OR_INSPECT"
})

local function tag(instance, biomeId, role)
  instance:SetAttribute("StudioAssetPack","roblox-common-environment-v1")
  instance:SetAttribute("StudioAssetFamily","ENVIRONMENT")
  instance:SetAttribute("BiomeId",biomeId)
  instance:SetAttribute("EnvironmentRole",role)
  instance:SetAttribute("CompanyCommonBase",true)
  instance:SetAttribute("ThemeAdaptationRequiredPerGame",true)
  instance:SetAttribute("GameplayAuthority",false)
  instance:SetAttribute("ProductionVerified",false)
  instance:SetAttribute("RuntimeVerificationState","PENDING_STUDIO")
end

local function makePart(parent,name,size,position,color,material)
  local p=Instance.new("Part")
  p.Name=name
  p.Anchored=true
  p.CanCollide=false
  p.Size=size
  p.Position=position
  p.Color=color
  p.Material=material or Enum.Material.SmoothPlastic
  p.TopSurface=Enum.SurfaceType.Smooth
  p.BottomSurface=Enum.SurfaceType.Smooth
  p.Parent=parent
  return p
end

local function dressCluster(parent,biomeId,recipe,origin,index)
  local angle=(index*47)%360
  local radius=8+(index%4)*5
  local offset=Vector3.new(math.cos(math.rad(angle))*radius,0,math.sin(math.rad(angle))*radius)
  local base=makePart(parent,recipe.."_"..index,Vector3.new(2+(index%3),1+(index%2),2+(index%3)),origin+offset,BIOMES[biomeId].secondary,Enum.Material.Slate)
  base.Orientation=Vector3.new(0,angle,index%2==0 and 0 or 8)
  tag(base,biomeId,"SET_DRESSING:"..recipe)
  base:SetAttribute("InteractionPresentationRole",INTERACTION_ROLE_BY_DRESS[recipe] or "INSPECT_VISUAL")
  base:SetAttribute("OwnsInteractionAuthority",false)
  return base
end

function CommonEnvironment.CreateBiomeKit(biomeId, options)
  options=options or {}
  biomeId=string.upper(tostring(biomeId or "FOREST"))
  local profile=BIOMES[biomeId]
  assert(profile,"UNKNOWN_COMMON_BIOME:"..biomeId)
  local origin=options.origin or Vector3.new()
  local scale=tonumber(options.scale) or 1

  local root=Instance.new("Folder")
  root.Name=options.name or ("CommonBiome_"..biomeId)
  tag(root,biomeId,"BIOME_KIT")

  local terrain=makePart(root,"TerrainPlate",Vector3.new(72,2,72)*scale,origin+Vector3.new(0,-1,0),profile.ground,Enum.Material.Ground)
  tag(terrain,biomeId,"TERRAIN")

  local road=makePart(root,"Road",Vector3.new(12,0.5,70)*scale,origin+Vector3.new(0,0.15,0),profile.secondary,Enum.Material.Slate)
  tag(road,biomeId,"PATH_ROAD")

  local cliff=makePart(root,"Cliff",Vector3.new(18,14,36)*scale,origin+Vector3.new(25,7,-8),profile.rock,Enum.Material.Rock)
  cliff.Orientation=Vector3.new(0,12,5)
  tag(cliff,biomeId,"CLIFF")

  local water=makePart(root,"WaterPlane",Vector3.new(22,0.35,26)*scale,origin+Vector3.new(-23,0.1,18),profile.water,Enum.Material.Glass)
  water.Transparency=0.32
  tag(water,biomeId,"WATER")

  local landmark=makePart(root,"Landmark_"..profile.landmark,Vector3.new(8,22,8)*scale,origin+Vector3.new(-18,11,-20),profile.rock,Enum.Material.Slate)
  tag(landmark,biomeId,"LANDMARK:"..profile.landmark)

  local dressing={}
  local count=math.clamp(tonumber(options.dressingCount) or 18,6,36)
  for i=1,count do
    local recipe=profile.dress[((i-1)%#profile.dress)+1]
    dressing[i]=dressCluster(root,biomeId,recipe,origin,i)
  end

  root:SetAttribute("VisualDetailTier",tostring(options.detailTier or "HIGH"))
  root:SetAttribute("StreamingOrLODRequired",true)
  root:SetAttribute("PreserveGameCollisionAuthority",true)
  root:SetAttribute("PreserveGameSpawnAuthority",true)
  root:SetAttribute("PreserveGameResourceAuthority",true)
  return root,{terrain=terrain,road=road,cliff=cliff,water=water,landmark=landmark,dressing=dressing}
end

function CommonEnvironment.GetBiomeProfile(biomeId)
  return BIOMES[string.upper(tostring(biomeId or ""))]
end


local function terrainMass(parent,biomeId,name,position,size,color,material,shape,rotation)
  local p=makePart(parent,name,size,position,color,material)
  if shape=="BALL" then p.Shape=Enum.PartType.Ball end
  if rotation then p.Orientation=rotation end
  tag(p,biomeId,"TERRAIN_COMPOSITION:"..name)
  p:SetAttribute("OwnsCollisionAuthority",false)
  p:SetAttribute("OwnsNavigationAuthority",false)
  return p
end

local function addVillageCluster(root,biomeId,origin,scale,index,profile)
  local cluster=Instance.new("Folder")
  cluster.Name="VillageCluster"..index
  cluster.Parent=root
  tag(cluster,biomeId,"VILLAGE_CLUSTER")
  local offsets={Vector3.new(-6,0,-4),Vector3.new(4,0,-2),Vector3.new(-1,0,5)}
  for i,off in ipairs(offsets) do
    local size=Vector3.new(5+(i%2)*2,3.8+i*0.6,4.5)*scale
    local base=terrainMass(cluster,biomeId,"HouseMass"..i,origin+off*scale+Vector3.new(0,size.Y/2,0),size,profile.secondary,Enum.Material.WoodPlanks,nil,Vector3.new(0,(i-2)*12,0))
    base:SetAttribute("BackgroundArchitectureOnly",true)
    base:SetAttribute("OwnsDoorOrInteriorAuthority",false)
  end
  return cluster
end

function CommonEnvironment.CreateTerrainComposition(compositionId,options)
  options=options or {}
  compositionId=string.upper(tostring(compositionId or "ROLLING_HILLS"))
  local recipe=COMPOSITIONS[compositionId]
  assert(recipe,"UNKNOWN_ENVIRONMENT_COMPOSITION:"..compositionId)
  local biomeId=string.upper(tostring(options.biomeId or recipe.biome))
  local profile=BIOMES[biomeId] or BIOMES[recipe.biome]
  local origin=options.origin or Vector3.new()
  local scale=math.clamp(tonumber(options.scale) or 1,0.35,4)

  local root=Instance.new("Folder")
  root.Name=options.name or ("EnvironmentComposition_"..compositionId)
  tag(root,biomeId,"TERRAIN_COMPOSITION")
  root:SetAttribute("CompositionId",compositionId)
  root:SetAttribute("BackgroundLanguage",recipe.background)
  root:SetAttribute("DiscoveryPoiRole",recipe.poi)
  root:SetAttribute("ForegroundMidgroundBackgroundRequired",true)
  root:SetAttribute("OwnsSpawnAuthority",false)
  root:SetAttribute("OwnsCollisionAuthority",false)
  root:SetAttribute("OwnsNavigationAuthority",false)

  local layers={foreground={},midground={},background={}}
  local villageIndex=0
  for i,kind in ipairs(recipe.terrain) do
    local x=(-18+(i-1)*12)*scale
    local z=((i%2==0) and 7 or -6)*scale
    if kind=="HILL" or kind=="BASIN" or kind=="PLATEAU" or kind=="MEADOW" or kind=="BEACH" or kind=="FARM_FIELD" or kind=="CROP_TERRACE" or kind=="TERRACE" or kind=="DUNE_RIDGE" or kind=="WETLAND_ISLAND" or kind=="OPEN_LOT" or kind=="ROCK_FIELD" or kind=="CAVE_FLOOR" then
      local height=kind=="HILL" and 8 or kind=="PLATEAU" and 6 or kind=="TERRACE" and 3.5 or kind=="DUNE_RIDGE" and 5 or kind=="WETLAND_ISLAND" and 2.5 or kind=="ROCK_FIELD" and 4 or 2.2
      local mass=terrainMass(root,biomeId,kind..i,origin+Vector3.new(x,height*0.30,z),Vector3.new(18,10,15)*scale,profile.ground,Enum.Material.Ground,"BALL")
      mass.Size=Vector3.new(18*scale,height*scale,15*scale)
      table.insert(i<=2 and layers.foreground or layers.midground,mass)
    elseif kind=="RIDGE" or kind=="CLIFF" or kind=="ESCARPMENT" or kind=="LEDGE" then
      local mass=terrainMass(root,biomeId,kind..i,origin+Vector3.new(x,6*scale,z),Vector3.new(16,12,7)*scale,profile.rock,Enum.Material.Rock,nil,Vector3.new(0,i*13,kind=="RIDGE" and 8 or 2))
      table.insert(layers.midground,mass)
    elseif kind=="VALLEY" or kind=="PASS" or kind=="PATH" or kind=="STAIR_PATH" or kind=="CROSSROADS" or kind=="ROAD_GRID" or kind=="GULLY" then
      local width=(kind=="CROSSROADS" or kind=="ROAD_GRID") and 20 or kind=="GULLY" and 12 or 8
      local mass=terrainMass(root,biomeId,kind..i,origin+Vector3.new(x,0.12,z),Vector3.new(width,0.35,24)*scale,profile.secondary,Enum.Material.Slate,nil,Vector3.new(0,i*7,0))
      table.insert(layers.foreground,mass)
    elseif kind=="RIVER" or kind=="WATER_EDGE" or kind=="CREEK" then
      local mass=terrainMass(root,biomeId,kind..i,origin+Vector3.new(x,0.08,z),Vector3.new(9,0.25,28)*scale,profile.water,Enum.Material.Glass,nil,Vector3.new(0,i*8,0))
      mass.Transparency=0.28
      table.insert(layers.foreground,mass)
    elseif kind=="BANK" or kind=="FOREST_EDGE" then
      local mass=terrainMass(root,biomeId,kind..i,origin+Vector3.new(x,1.2*scale,z),Vector3.new(14,2.5,16)*scale,profile.secondary,Enum.Material.Ground)
      table.insert(layers.midground,mass)
    elseif kind=="VILLAGE_CLUSTER" then
      villageIndex+=1
      table.insert(layers.midground,addVillageCluster(root,biomeId,origin+Vector3.new(x,0,z),scale,villageIndex,profile))
    elseif kind=="RUIN_CLUSTER" then
      local cluster=Instance.new("Folder");cluster.Name="RuinCluster";cluster.Parent=root;tag(cluster,biomeId,"RUIN_CLUSTER")
      for r=1,4 do terrainMass(cluster,biomeId,"RuinMass"..r,origin+Vector3.new(x+(r-2)*3,2+r*0.7,z+(r%2)*4),Vector3.new(2.2,4+r,2.2)*scale,profile.rock,Enum.Material.Slate,nil,Vector3.new(0,r*19,0)) end
      table.insert(layers.midground,cluster)
    end
  end

  for i=1,5 do
    local depth=-34-(i*18)
    local spread=22+i*8
    local back=terrainMass(root,biomeId,"BackgroundLayer"..i,origin+Vector3.new((i-3)*spread*0.55*scale,8+i*3.5,depth*scale),Vector3.new(28+i*8,10+i*5,8+i*2)*scale,profile.rock,Enum.Material.Slate,nil,Vector3.new(0,(i-3)*7,0))
    back.Transparency=0.16+i*0.09
    back:SetAttribute("DepthLayer","BACKGROUND_"..i)
    back:SetAttribute("ParallaxBand",i<=2 and "MID_FAR" or "FAR")
    table.insert(layers.background,back)
  end

  local poi=terrainMass(root,biomeId,"PoiMarker_"..recipe.poi,origin+Vector3.new(0,1.5*scale,0),Vector3.new(1.2,3,1.2)*scale,profile.secondary,Enum.Material.Neon)
  poi.Transparency=0.70
  poi:SetAttribute("DiscoveryPoiRole",recipe.poi)
  poi:SetAttribute("OwnsDiscoveryAuthority",false)

  return root,layers
end



local function tagEnvironmentPresentation(instance,stateId,role)
  instance:SetAttribute("StudioAssetPack","roblox-common-environment-v1")
  instance:SetAttribute("EnvironmentStateId",stateId)
  instance:SetAttribute("EnvironmentPresentationRole",role)
  instance:SetAttribute("OwnsWeatherAuthority",false)
  instance:SetAttribute("OwnsTimeAuthority",false)
  instance:SetAttribute("OwnsAudioPlaybackAuthority",false)
  instance:SetAttribute("ProductionVerified",false)
end

function CommonEnvironment.GetEnvironmentStateProfile(stateId)
  return ENVIRONMENT_STATES[string.upper(tostring(stateId or ""))]
end

function CommonEnvironment.GetBiomeSoundscape(biomeId)
  return BIOME_SOUNDSCAPES[string.upper(tostring(biomeId or ""))]
end

function CommonEnvironment.CreateEnvironmentPresentation(stateId,options)
  options=options or {}
  stateId=string.upper(tostring(stateId or "CLEAR_DAY"))
  local profile=ENVIRONMENT_STATES[stateId]
  assert(profile,"UNKNOWN_COMMON_ENVIRONMENT_STATE:"..stateId)

  local atmosphere=Instance.new("Atmosphere")
  atmosphere.Name="JG_CommonAtmosphere_"..stateId
  atmosphere.Density=profile.atmosphereDensity
  atmosphere.Haze=profile.haze
  atmosphere.Glare=profile.glare
  atmosphere.Color=profile.atmosphereColor
  atmosphere.Decay=profile.decayColor
  tagEnvironmentPresentation(atmosphere,stateId,"SKY_ATMOSPHERE")

  local correction=Instance.new("ColorCorrectionEffect")
  correction.Name="JG_CommonColor_"..stateId
  correction.Brightness=profile.brightness
  correction.Contrast=profile.contrast
  correction.Saturation=profile.saturation
  correction.TintColor=profile.tint
  tagEnvironmentPresentation(correction,stateId,"LIGHTING_PRESET")

  local bloom=Instance.new("BloomEffect")
  bloom.Name="JG_CommonBloom_"..stateId
  bloom.Intensity=profile.bloomIntensity
  bloom.Threshold=profile.bloomThreshold
  bloom.Size=24
  tagEnvironmentPresentation(bloom,stateId,"LIGHTING_PRESET")

  local rays=Instance.new("SunRaysEffect")
  rays.Name="JG_CommonSunRays_"..stateId
  rays.Intensity=profile.sunRaysIntensity
  rays.Spread=profile.sunRaysSpread
  tagEnvironmentPresentation(rays,stateId,"LIGHTING_PRESET")

  local clouds=Instance.new("Clouds")
  clouds.Name="JG_CommonClouds_"..stateId
  clouds.Cover=profile.cloudCover
  clouds.Density=profile.cloudDensity
  clouds.Color=profile.atmosphereColor
  tagEnvironmentPresentation(clouds,stateId,"SKY_CLOUD_LAYER")

  if options.lighting then
    assert(typeof(options.lighting)=="Instance","COMMON_ENVIRONMENT_LIGHTING_INSTANCE_REQUIRED")
    atmosphere.Parent=options.lighting
    correction.Parent=options.lighting
    bloom.Parent=options.lighting
    rays.Parent=options.lighting
  end
  if options.terrain then
    assert(typeof(options.terrain)=="Instance","COMMON_ENVIRONMENT_TERRAIN_INSTANCE_REQUIRED")
    clouds.Parent=options.terrain
  end

  return table.freeze({
    stateId=stateId,
    profile=profile,
    lightingEffects=table.freeze({atmosphere,correction,bloom,rays}),
    terrainClouds=clouds,
    weatherAuthority=false,
    timeAuthority=false,
    audioPlaybackAuthority=false
  })
end

function CommonEnvironment.BindEnvironmentState(root,stateId)
  assert(typeof(root)=="Instance","COMMON_ENVIRONMENT_ROOT_REQUIRED")
  stateId=string.upper(tostring(stateId or "CLEAR_DAY"))
  local profile=ENVIRONMENT_STATES[stateId]
  assert(profile,"UNKNOWN_COMMON_ENVIRONMENT_STATE:"..stateId)
  root:SetAttribute("EnvironmentStateId",stateId)
  root:SetAttribute("SkyPresentationRole",profile.skyRole)
  root:SetAttribute("BackgroundPresentationRole",profile.backgroundRole)
  root:SetAttribute("SurfacePresentationRole",profile.surfaceRole)
  root:SetAttribute("PrecipitationPresentationRole",profile.precipitationRole)
  root:SetAttribute("WindPresentationRole",profile.windRole)
  root:SetAttribute("VisibilityPresentationRole",profile.visibilityRole)
  root:SetAttribute("CelestialPresentationRole",profile.celestialRole)
  root:SetAttribute("SoundscapeRoles",table.concat(profile.soundscapeRoles,","))
  root:SetAttribute("OwnsWeatherAuthority",false)
  root:SetAttribute("OwnsTimeAuthority",false)
  root:SetAttribute("OwnsAudioPlaybackAuthority",false)
  return profile
end

function CommonEnvironment.ListCompositions()
  local ids={}
  for id in pairs(COMPOSITIONS) do table.insert(ids,id) end
  table.sort(ids)
  return table.freeze(ids)
end

function CommonEnvironment.Audit()
  local ids={}
  for id in pairs(BIOMES) do table.insert(ids,id) end
  table.sort(ids)
  return table.freeze({
    version=3,
    packId="roblox-common-environment-v1",
    biomes=table.freeze(ids),
    biomeCount=#ids,
    roles=table.freeze({"BIOME_KIT","TERRAIN","GROUND_DETAIL","PATH_ROAD","CLIFF","WATER","LANDMARK","SET_DRESSING","TERRAIN_COMPOSITION","VILLAGE_CLUSTER","RUIN_CLUSTER","DISCOVERY_POI","BACKGROUND_LAYER","INTERACTION_PRESENTATION","WEATHER_PRESENTATION","SKY_ATMOSPHERE","LIGHTING_PRESET","SOUNDSCAPE_ROLE"}),
    compositionCount=#CommonEnvironment.ListCompositions(),
    environmentStateCount=14,
    biomeSoundscapeCount=10,
    gameSpecificVariationFields=table.freeze({"PALETTE","MATERIAL","VEGETATION_MIX","WEATHERING","DENSITY","LANDMARK_DETAIL","LIGHTING"}),
    gameplayAuthority=false,
    productionVerified=false
  })
end

return table.freeze(CommonEnvironment)
