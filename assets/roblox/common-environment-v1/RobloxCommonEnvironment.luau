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
    roles=table.freeze({"BIOME_KIT","TERRAIN","GROUND_DETAIL","PATH_ROAD","CLIFF","WATER","LANDMARK","SET_DRESSING","TERRAIN_COMPOSITION","VILLAGE_CLUSTER","RUIN_CLUSTER","DISCOVERY_POI","BACKGROUND_LAYER","INTERACTION_PRESENTATION"}),
    compositionCount=#CommonEnvironment.ListCompositions(),
    gameSpecificVariationFields=table.freeze({"PALETTE","MATERIAL","VEGETATION_MIX","WEATHERING","DENSITY","LANDMARK_DETAIL","LIGHTING"}),
    gameplayAuthority=false,
    productionVerified=false
  })
end

return table.freeze(CommonEnvironment)
