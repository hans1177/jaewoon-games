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

function CommonEnvironment.Audit()
  local ids={}
  for id in pairs(BIOMES) do table.insert(ids,id) end
  table.sort(ids)
  return table.freeze({
    version=1,
    packId="roblox-common-environment-v1",
    biomes=table.freeze(ids),
    biomeCount=#ids,
    roles=table.freeze({"BIOME_KIT","TERRAIN","GROUND_DETAIL","PATH_ROAD","CLIFF","WATER","LANDMARK","SET_DRESSING"}),
    gameSpecificVariationFields=table.freeze({"PALETTE","MATERIAL","VEGETATION_MIX","WEATHERING","DENSITY","LANDMARK_DETAIL","LIGHTING"}),
    gameplayAuthority=false,
    productionVerified=false
  })
end

return table.freeze(CommonEnvironment)
