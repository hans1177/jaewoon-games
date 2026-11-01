-- 파일명: roblox-games/fantasy-survival/server/Game.server.luau
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local DataStoreService = game:GetService("DataStoreService")
local store = nil
local storeOk, storeResult = pcall(function()
  return DataStoreService:GetDataStore("fantasy-survival-development-v1")
end)
if storeOk then store = storeResult end
local Shared = ReplicatedStorage:WaitForChild("Shared")
local Config = require(Shared:WaitForChild("GameConfig"))

-- Apply an actual selected MATERIAL atom to an existing visible spawn marker.
-- This does not change collision, movement, item economy, or saved player state.
local function studioAssetFamily(family)
  return (Config.StudioAssets and Config.StudioAssets.Families or {})[family] or {}
end
local studioMaterialAtoms = studioAssetFamily("MATERIAL")

local remote = ReplicatedStorage:FindFirstChild(Config.RemoteName)
if remote and not remote:IsA("RemoteEvent") then remote:Destroy(); remote = nil end
if not remote then
  remote = Instance.new("RemoteEvent")
  remote.Name = Config.RemoteName
  remote.Parent = ReplicatedStorage
end

local lastAction = {}
local function readNumber(player, name, fallback)
  local value = player:GetAttribute(name)
  if typeof(value) ~= "number" then return fallback end
  return value
end
local function setNumber(player, name, value)
  if typeof(value) ~= "number" then return end
  player:SetAttribute(name, math.floor(value))
end
local function initializePlayer(player)
  for key, value in pairs(Config.InitialState) do player:SetAttribute(key, value) end
  player:SetAttribute("LastApprovedScope", "ready")
  if Config.LearningContext and Config.LearningContext.Applied then
    player:SetAttribute("LearningOperator", Config.LearningContext.Operator)
    player:SetAttribute("LastLearningPattern", "")
    player:SetAttribute("ActionSequence", 0)
  end
end

-- 마력숲 생존기: 실제 게임 상태, 생물 파도, 수집 노드, 성장의 권한은 서버가 소유한다.
-- 공용 외형 라이브러리는 표현만 담당하고 데미지·드랍·저장은 이 게임에서 계산한다.
local RunService = game:GetService("RunService")
local Lighting = game:GetService("Lighting")
local FANTASY_NATIVE_CREATURES_VERSION = 1
local AssetService = game:GetService("AssetService")
local NativeCreatureAssets = require(Shared:WaitForChild("VisualAssetIds"))
local studioCreatureAtoms = studioAssetFamily("CREATURE")
local studioBuildingAtoms = studioAssetFamily("BUILDING")
local studioEnvironmentAtoms = studioAssetFamily("ENVIRONMENT")
local studioPropAtoms = studioAssetFamily("PROP")
local nativeCreatureTemplates = {}
local gameWorld = workspace:FindFirstChild("FantasySurvivalWorld")
if not gameWorld then
  gameWorld = Instance.new("Folder")
  gameWorld.Name = "FantasySurvivalWorld"
  gameWorld.Parent = workspace
end
local enemies = {}
local resourceNodes = {}
-- [오픈월드] 이전 저장 필드만 숫자 0으로 호환하며 웨이브 타이머는 폐기.
local CurrentWave = 0
local WaveState = "OPEN_WORLD"
local worldClock = 0
local attackCooldown = {}
local MAX_ENEMIES = 22
local nextEncounterCheck = 0
-- [지역 서식지] 마을 내부의 늑대를 외곽 숲으로 이동하고 골렘 출현 지점을 제거한다.
-- 기존 종별 체력·공격력·드랍·보상·저장 구조를 보존한다.
local meadowEncounterSites = {
  {id="wolf",atom="HEAD_CANINE",tier=1,height=3.15,position=Vector3.new(-324,3,-91)},
  {id="wolf",atom="HEAD_CANINE",tier=1,height=3.15,position=Vector3.new(324,3,-91)},
  {id="wolf",atom="HEAD_CANINE",tier=1,height=3.15,position=Vector3.new(-84,3,94)},
  {id="wolf",atom="HEAD_CANINE",tier=1,height=3.15,position=Vector3.new(81,3,96)},
  -- [사용자 제거] 버섯 몬스터 서식지 4곳 폐쇄. 나머지 지역·몬스터 배치는 유지.
  {id="bat",atom="WING_LEATHER",tier=4,height=3.15,position=Vector3.new(-254,3,-226)},
  {id="bat",atom="WING_LEATHER",tier=4,height=3.15,position=Vector3.new(248,3,-224)},
  {id="bat",atom="WING_LEATHER",tier=4,height=3.15,position=Vector3.new(239,3,236)},
  -- [사용자 제거] 해골 몬스터 서식지 3곳도 폐쇄. 저장·기존 나머지 몬스터 배치는 유지.
  -- [마을 의뢰] 우두머리 늑대는 마을 서쪽 외곽 숲에만 스폰한다.
  {id="wolf",atom="HEAD_CANINE",tier=1,height=4.8,position=Vector3.new(-321,3,-193),questIndex=1,alpha=true},
  {id="ghost",atom="HEAD_SKULL",tier=2,height=4.4,position=Vector3.new(15,3,-214),questIndex=2},
  {id="bandit",atom="HUMANOID",tier=3,height=5.5,position=Vector3.new(80,3,-236),questIndex=3},
}
-- [마을 안전 경계] 16채의 주거·농가·성문 주변을 포함하는 서버 소유 X/Z 구역.
-- 늑대만 제한하며 기존 원혼·도적 의뢰 전투는 그대로 허용한다.
local function meadowVillageContains(position)
  return position.X>=-280 and position.X<=280
    and position.Z>=-351 and position.Z<=-42
end
-- Roblox Terrain is native collidable terrain, never an assembled visual Part.
-- All meadow vegetation and animals must come from the game's registered CC0 meshes.
-- [숲 표면] 원본 CC0 메시·텍스처를 보존하는 공통 자연색 팔레트.
local meadowPalette={
  grass=Color3.fromRGB(100,151,97),leafyGrass=Color3.fromRGB(69,128,78),
  ground=Color3.fromRGB(124,102,79),rock=Color3.fromRGB(123,130,120),
  bark=Color3.fromRGB(112,87,66),leaves=Color3.fromRGB(88,154,91),
  wolf=Color3.fromRGB(144,136,121),boar=Color3.fromRGB(126,101,83),
  deer=Color3.fromRGB(157,125,102),rabbit=Color3.fromRGB(181,176,157),
  bee=Color3.fromRGB(217,177,106),bat=Color3.fromRGB(125,129,138),
  golem=Color3.fromRGB(129,138,126),
  ghost=Color3.fromRGB(131,210,226),bandit=Color3.fromRGB(111,76,67),
}
local meadowTerrain = workspace.Terrain
-- [초원 오픈월드] 플레이 시작 부분 312x312은 먼저 만들고 696x696 외곽은 이후 분할 생성한다.
-- 면적 약 4.98배. 시작/적/자원 좌표 및 전투 수치를 옮기지 않는다.
local meadowWorldSize=696
local function createStartingMeadow()
  meadowTerrain:FillBlock(CFrame.new(0, -4, 0), Vector3.new(312, 12, 312), Enum.Material.Grass)
  -- [마을 평탄지] 시작 초원에 산봉우리처럼 튀어나오던 Ridge/Knoll 지형을 만들지 않는다.
  -- 기존 채집 광맥 3곳·지표 잔디·몬스터/의뢰 좌표는 보존한다.
  for ix=-6,6 do
    for iz=-6,6 do
      local x=ix*17+math.sin(ix*2.7+iz)*4
      local z=iz*17+math.cos(iz*2.3-ix)*5
      local distance=math.sqrt(x*x+z*z)
      if distance>34 and distance<135 and (ix*3+iz*5)%4==0 then
        meadowTerrain:FillBall(Vector3.new(x,-6.2,z),9,Enum.Material.LeafyGrass)
      end
    end
  end
  -- [숲 색감] 초원·수풀·흙·돌을 같은 저채도 자연 팔레트로 맞춘다.
  meadowTerrain:SetMaterialColor(Enum.Material.Grass,meadowPalette.grass)
  meadowTerrain:SetMaterialColor(Enum.Material.LeafyGrass,meadowPalette.leafyGrass)
  meadowTerrain:SetMaterialColor(Enum.Material.Ground,meadowPalette.ground)
  meadowTerrain:SetMaterialColor(Enum.Material.Rock,meadowPalette.rock)
  -- Existing stone gathering sites are terrain outcrops, not fake rock parts.
  for _, pos in ipairs({Vector3.new(-35,2,31),Vector3.new(11,2,-39),Vector3.new(-7,2,43)}) do
    meadowTerrain:FillBall(pos-Vector3.new(0,4.5,0),5,Enum.Material.Rock)
  end
  Lighting.ClockTime = 10.5
  Lighting.Brightness = 2
  Lighting.Ambient = Color3.fromRGB(97,118,107)
  Lighting.OutdoorAmbient = Color3.fromRGB(155,176,149)
  Lighting.EnvironmentDiffuseScale=.83
  Lighting.EnvironmentSpecularScale=.16
  gameWorld:SetAttribute("StartingRegion", "MEADOW")
  gameWorld:SetAttribute("GroundVisualSource", "ROBLOX_NATIVE_TERRAIN")
  gameWorld:SetAttribute("MeadowVisualStyle", "SOFT_TOY_FOREST_CC0_MESH_V3")
  gameWorld:SetAttribute("MeadowRegionWidth",meadowWorldSize)
  gameWorld:SetAttribute("MeadowRegionAreaScale",math.floor((meadowWorldSize/312)^2*100)/100)
  gameWorld:SetAttribute("MeadowOuterRegionReady",false)
end
createStartingMeadow()
-- [서버 메인: 초원 날씨·새벽/낮/저녁/밤]
-- 기존 웨이브 갱신 틱에서 함께 실행한다. 날씨는 표현 전용이며 저장·전투를 변경하지 않는다.
-- 12분당 게임 내 하루, 날씨는 5분마다 바뀌며 모든 플레이어가 같은 상태를 관측한다.
local meadowWeatherSequence={"CLEAR","RAIN","CLEAR","FOG","SNOW","CLEAR","STORM","CLEAR"}
local meadowClouds=meadowTerrain:FindFirstChildOfClass("Clouds")
if not meadowClouds then
  meadowClouds=Instance.new("Clouds")
  meadowClouds.Name="MeadowNativeClouds"
  meadowClouds.Parent=meadowTerrain
end
-- [숲 공기감] 기존 Lighting에 원래 Roblox 안개 효과만 더한다.
-- 다른 월드용 파츠·이미지·후처리 중첩 없이 날씨 갱신 루프에서 그대로 관리한다.
local meadowAtmosphere=Lighting:FindFirstChildOfClass("Atmosphere")
if not meadowAtmosphere then
  meadowAtmosphere=Instance.new("Atmosphere")
  meadowAtmosphere.Name="MeadowForestAtmosphere"
  meadowAtmosphere.Parent=Lighting
end
meadowAtmosphere.Color=Color3.fromRGB(181,210,193)
meadowAtmosphere.Decay=Color3.fromRGB(98,121,108)
meadowAtmosphere.Glare=.10
local lastMeadowClimateTick=-1
local lastMeadowWeather=""

local function updateMeadowClimate()
  if worldClock-lastMeadowClimateTick<.7 then return end
  lastMeadowClimateTick=worldClock
  local hour=(5.25+worldClock*24/720)%24
  local period=hour>=5 and hour<8 and "DAWN"
    or hour>=8 and hour<17.5 and "DAY"
    or hour>=17.5 and hour<20.5 and "DUSK" or "NIGHT"
  local weather=meadowWeatherSequence[(math.floor(worldClock/300)%#meadowWeatherSequence)+1]
  local morning=math.clamp((hour-5.25)/2.5,0,1)
  local evening=math.clamp((20.5-hour)/2.5,0,1)
  local sun=math.min(morning,evening)
  local damp=weather=="STORM" and .66 or weather=="RAIN" and .79
    or weather=="FOG" and .88 or weather=="SNOW" and .86 or 1
  local brightness=math.max(.78,(.82+1.6*sun)*damp)
  local lightColor=Color3.fromRGB(79,103,111):Lerp(Color3.fromRGB(148,167,143),sun)
  local airColor=Color3.fromRGB(92,113,119):Lerp(Color3.fromRGB(169,188,165),sun)
  if weather=="STORM" or weather=="RAIN" then
    lightColor=lightColor:Lerp(Color3.fromRGB(83,102,118),weather=="STORM" and .5 or .25)
    airColor=airColor:Lerp(Color3.fromRGB(110,129,139),weather=="STORM" and .65 or .3)
  end
  Lighting.ClockTime=hour
  Lighting.Brightness=brightness
  Lighting.Ambient=lightColor
  Lighting.OutdoorAmbient=airColor
  Lighting.FogColor=airColor
  Lighting.FogStart=weather=="FOG" and 35 or weather=="STORM" and 55 or 110
  Lighting.FogEnd=weather=="FOG" and 210 or weather=="STORM" and 390
    or weather=="RAIN" and 680 or 1600
  -- [원근감] 수관 뒤는 옅게, 비/안개에는 서서히 짙게. 근처 적 시야는 보존한다.
  local forestAirDensity=weather=="FOG" and .39 or weather=="STORM" and .31
    or weather=="RAIN" and .26 or weather=="SNOW" and .22 or .17
  local forestHaze=weather=="FOG" and 2.0 or weather=="STORM" and 1.5 or .95
  meadowAtmosphere.Density+=(forestAirDensity-meadowAtmosphere.Density)*.12
  meadowAtmosphere.Haze+=(forestHaze-meadowAtmosphere.Haze)*.12
  meadowAtmosphere.Color=meadowAtmosphere.Color:Lerp(
    airColor:Lerp(meadowPalette.leaves,.11),.12)
  local cover=weather=="STORM" and .94 or weather=="RAIN" and .79
    or weather=="FOG" and .67 or weather=="SNOW" and .76 or .22
  local density=weather=="STORM" and .86 or weather=="RAIN" and .66
    or weather=="FOG" and .55 or weather=="SNOW" and .64 or .27
  local smooth=.12
  meadowClouds.Cover=meadowClouds.Cover+(cover-meadowClouds.Cover)*smooth
  meadowClouds.Density=meadowClouds.Density+(density-meadowClouds.Density)*smooth
  meadowClouds.Color=meadowClouds.Color:Lerp(
    weather=="STORM" and Color3.fromRGB(78,93,115)
      or weather=="RAIN" and Color3.fromRGB(151,166,177)
      or weather=="SNOW" and Color3.fromRGB(210,224,229)
      or Color3.fromRGB(241,246,236),smooth)
  gameWorld:SetAttribute("MeadowDayPhase",period)
  gameWorld:SetAttribute("MeadowClockMinutes",math.floor(hour*60))
  if weather~=lastMeadowWeather then
    lastMeadowWeather=weather
    gameWorld:SetAttribute("MeadowWeather",weather)
    gameWorld:SetAttribute("MeadowWeatherChangedAt",workspace:GetServerTimeNow())
  end
end
updateMeadowClimate()

-- [초원 외곽] 기존 중앙 지역 바깥에 겹치지 않는 Terrain 4구획을 순차적으로 생성한다.
-- 새 메시/Part는 만들지 않으며, 최초 입력과 플레이어 프로필/전투 이벤트 초기화를 막지 않는다.
task.defer(function()
  for _,section in ipairs({
    {x=-252,z=0,width=192,depth=696},
    {x=252,z=0,width=192,depth=696},
    {x=0,z=-252,width=312,depth=192},
    {x=0,z=252,width=312,depth=192},
  }) do
    meadowTerrain:FillBlock(CFrame.new(section.x,-4,section.z),
      Vector3.new(section.width,12,section.depth),Enum.Material.Grass)
    task.wait()
  end
  -- [평탄 외곽] 마을 가장자리까지 솟던 둥근 능선 8개를 생성하지 않는다.
  -- 바깥 지역 4구획은 그대로 유지해 실제 월드 크기/이동 가능 범위를 보존한다.
  gameWorld:SetAttribute("MeadowOuterRegionReady",true)
end)

local function worldAsset(id, location, targetHeight, heightAboveGround)
  local modelId = NativeCreatureAssets[id]
  if typeof(modelId) ~= "number" or modelId < 1 then
    warn("마력숲 등록된 CC0 초원 자산 없음: "..id)
    return nil
  end
  local ok, result = pcall(function()
    local template = nativeCreatureTemplates[modelId]
    if not template then
      template = AssetService:LoadAssetAsync(modelId)
      if not template:IsA("Model") or not template:FindFirstChildWhichIsA("MeshPart",true) then
        template:Destroy()
        error("MEADOW_ORIGINAL_NATIVE_MESH_REQUIRED")
      end
      for _, part in ipairs(template:GetDescendants()) do
        if part:IsA("LuaSourceContainer") or part:IsA("RemoteEvent")
          or part:IsA("RemoteFunction") or part:IsA("Tool") then
          part:Destroy()
        elseif part:IsA("BasePart") then
          part.Anchored=true
          part.CanCollide=false
          part.CanTouch=false
          part.CanQuery=false
        end
      end
      -- Keep the real source rig root anchored for server-pivot movement,
      -- but let genuine Motor6D child parts articulate. Bone-skinned
      -- single meshes remain anchored and animate through source Bones.
      for _,joint in ipairs(template:GetDescendants()) do
        if joint:IsA("Motor6D") and joint.Part0 and joint.Part1 then
          joint.Part1.Anchored=false
          joint.Part1.Massless=true
        end
      end
      template.Parent=nil
      nativeCreatureTemplates[modelId]=template
    end
    local clone=template:Clone()
    if not clone:IsA("Model") then return nil end
    -- 원본 래퍼/숨은 피벗 크기를 제외한 보이는 CC0 메시 높이로 원본 크기를 정한다.
    local meshMinY,meshMaxY=math.huge,-math.huge
    for _,mesh in ipairs(clone:GetDescendants()) do
      if mesh:IsA("MeshPart") and mesh.Transparency<.98 then
        local cf=mesh.CFrame
        local halfY=(math.abs(cf.RightVector.Y)*mesh.Size.X
          +math.abs(cf.UpVector.Y)*mesh.Size.Y
          +math.abs(cf.LookVector.Y)*mesh.Size.Z)*.5
        meshMinY=math.min(meshMinY,cf.Position.Y-halfY)
        meshMaxY=math.max(meshMaxY,cf.Position.Y+halfY)
      end
    end
    local originalHeight=meshMaxY-meshMinY
    if originalHeight <= .01 or originalHeight==math.huge then
      clone:Destroy();error("MEADOW_VISIBLE_MESH_BOUNDS_INVALID")
    end
    local nativeWorldScale=clone:GetScale()*(targetHeight or 5)/originalHeight
    if id=="tree" then
      -- 실제 등록된 채집 나무의 배경·자원 선택값을 같은 원본 메시 크기에 연결한다.
      local environmentScale=table.find(studioEnvironmentAtoms,"TREE_CROWN_ROUND") and nativeWorldScale or nil
      local propScale=table.find(studioPropAtoms,"RESOURCE_WOOD") and environmentScale or nil
      if not propScale then clone:Destroy();error("MEADOW_TREE_SELECTION_REQUIRED") end
      nativeWorldScale=propScale
    end
    clone:ScaleTo(nativeWorldScale)
    -- [원본 CC0 숲 표면] 새 파츠 없이 수목·야생동물을 같은 무광 팔레트로 맞춘다.
    -- 원본 MeshId/TextureID/리그 및 자원·저장·충돌은 수정하지 않는다.
    -- [새 사슴] 다운로드한 원본 암사슴의 실제 재질·색을 그대로 사용한다.
    -- 기존 오류 사슴 FBX의 강제 단색 재질 처리는 더 이상 적용하지 않는다.
    local animalTint=id=="boar" and meadowPalette.boar
      or id=="rabbit" and meadowPalette.rabbit or nil
    if animalTint or id=="tree" or id=="ruin" then
      for _,surface in ipairs(clone:GetDescendants()) do
        if surface:IsA("MeshPart") then
          if id=="ruin" then
            -- 수입 원본 유적 메시를 골렘·지형의 동일한 무광 석재로 연결한다.
            surface.Color=meadowPalette.rock
            surface.Material=Enum.Material.Slate
          elseif id=="tree" then
            -- [기존 CC0 나무 표면 교체] 원본 MeshId·모양·비율은 보존하고 복제본만 부드러운 토이 숲 재질로 변경한다.
            local name=surface.Name:lower()
            local bark=name:find("trunk",1,true) or name:find("bark",1,true)
              or name:find("stem",1,true) or name:find("branch",1,true)
              or name:find("wood",1,true)
            local tone=(math.sin(location.X*.28+location.Z*.19)+1)*.5
            local crown=meadowPalette.leaves:Lerp(Color3.fromRGB(151,184,107),tone*.40)
            if not bark then
              -- 과거 모서리/천 질감을 삭제하고 표면이 고르게 보이도록 직접 지정한다.
              local appearance=surface:FindFirstChildOfClass("SurfaceAppearance")
              if appearance then appearance:Destroy() end
              if surface.TextureID~="" then surface.TextureID="" end
            end
            surface.MaterialVariant=""
            surface.Color=bark and meadowPalette.bark or crown
            surface.Material=bark and Enum.Material.Wood or Enum.Material.SmoothPlastic
          else
            -- [야생동물 토이 표면] 자갈/천 직물 대신 유광을 억제한 장난감 플라스틱.
            -- 원본 모델, 메시·리그·판정은 그대로 유지한다.
            surface.Color=animalTint
            surface.Material=Enum.Material.Plastic
          end
          surface.Reflectance=0
        end
      end
    end
    clone:PivotTo(CFrame.new(location))
    -- 수입 FBX의 래퍼가 장식 본체에서 떨어져 있어도 나무/동물 중심을 원래 위치에 정렬.
    local minX,maxX,minZ,maxZ=math.huge,-math.huge,math.huge,-math.huge
    for _,mesh in ipairs(clone:GetDescendants()) do
      if mesh:IsA("MeshPart") and mesh.Transparency<.98 then
        local cf=mesh.CFrame
        local halfX=(math.abs(cf.RightVector.X)*mesh.Size.X
          +math.abs(cf.UpVector.X)*mesh.Size.Y
          +math.abs(cf.LookVector.X)*mesh.Size.Z)*.5
        local halfZ=(math.abs(cf.RightVector.Z)*mesh.Size.X
          +math.abs(cf.UpVector.Z)*mesh.Size.Y
          +math.abs(cf.LookVector.Z)*mesh.Size.Z)*.5
        minX=math.min(minX,cf.Position.X-halfX)
        maxX=math.max(maxX,cf.Position.X+halfX)
        minZ=math.min(minZ,cf.Position.Z-halfZ)
        maxZ=math.max(maxZ,cf.Position.Z+halfZ)
      end
    end
    if minX==math.huge then clone:Destroy();error("MEADOW_CC0_VISIBLE_MESH_MISSING") end
    clone:PivotTo(clone:GetPivot()
      +Vector3.new(location.X-(minX+maxX)*.5,0,location.Z-(minZ+maxZ)*.5))
    -- Align the original source mesh to a measured native Terrain hit.
    local rayParams=RaycastParams.new()
    rayParams.FilterType=Enum.RaycastFilterType.Include
    rayParams.FilterDescendantsInstances={meadowTerrain}
    local ground=workspace:Raycast(location+Vector3.new(0,44,0),Vector3.new(0,-110,0),rayParams)
    if not ground then clone:Destroy();error("MEADOW_ORIGINAL_MESH_GROUND_UNVERIFIED") end
    -- 실제 보이는 메시의 최저점을 지면에 맞춘다. 빈 루트/리그 기준 금지.
    local underside=math.huge
    for _,mesh in ipairs(clone:GetDescendants()) do
      if mesh:IsA("MeshPart") and mesh.Transparency<.98 then
        local cf=mesh.CFrame
        local halfY=(math.abs(cf.RightVector.Y)*mesh.Size.X
          +math.abs(cf.UpVector.Y)*mesh.Size.Y
          +math.abs(cf.LookVector.Y)*mesh.Size.Z)*.5
        underside=math.min(underside,cf.Position.Y-halfY)
      end
    end
    if underside==math.huge then clone:Destroy();error("MEADOW_VISIBLE_CC0_MESH_MISSING") end
    clone:PivotTo(clone:GetPivot()+Vector3.new(0,ground.Position.Y+.15-underside+(heightAboveGround or 0),0))
    clone:SetAttribute("MeadowSurfaceY",ground.Position.Y)
    clone.Name="Meadow_"..id
    clone.ModelStreamingMode=Enum.ModelStreamingMode.Atomic
    clone.Parent=gameWorld
    clone:SetAttribute("CC0SourceModelId",modelId)
    return clone
  end)
  if not ok then warn("마력숲 CC0 초원 자산 로딩/권한 실패: "..id..": "..tostring(result)) end
  return ok and result or nil
end

-- [초원 마을] 원래의 네이티브 Terrain·등록 CC0 석벽·Roblox R15 아바타만 이용한다.
-- 건축용 임의 Part/실린더를 만들지 않으며 원본 채집·몬스터 좌표와 저장키는 유지한다.
local villageSessions={}
local villageInteractionCooldown={}
-- 기존 단서 비트(0~5)는 보존하고 전투 완료에 6번 비트를 사용한다.
local villageCenter=Vector3.new(0,3,-111)
local function villageNear(player,position,radius)
  if player.Parent~=Players or player:GetAttribute("ProfileReady")~=true then return false end
  local character=player.Character
  local root=character and character:FindFirstChild("HumanoidRootPart")
  return root~=nil and (root.Position-position).Magnitude<=radius
end
local function villageCurrentContract(player)
  local index=math.clamp(readNumber(player,"VillageContractIndex",1),1,#Config.VillageContracts+1)
  return index,Config.VillageContracts[index]
end
local function villageDialogue(player,title,message,options)
  remote:FireClient(player,"MEADOW_VILLAGE_DIALOG",{
    title=title,message=message,options=options or {},
  })
end
local function villageBoardDialogue(player,sourcePosition)
  local index,contract=villageCurrentContract(player)
  if not contract then
    villageDialogue(player,"초원 마을 · 의뢰 완료","세 의뢰의 진상을 모두 기록했어. 메인 연구 일지는 그대로 이어져.")
    return
  end
  local phase=readNumber(player,"VillageContractPhase",0)
  villageSessions[player]={position=sourcePosition or villageCenter,expires=os.clock()+40}
  if phase==0 then
    villageDialogue(player,"의뢰판 · "..contract.Name,contract.Summary..
      "\n\n진술 1개, 현장 단서 1개, "..contract.EnemyName.." 처치가 필요해.",{
      {label="의뢰 수락",action="village:accept"},
    })
  elseif phase==1 then
    local mask=readNumber(player,"VillageContractEvidence",0)
    local witness=bit32.lshift(1,contract.Witness-1)
    local found=(bit32.band(mask,witness)~=0 and 1 or 0)
      +(bit32.band(mask,8)~=0 and 1 or 0)
      +(bit32.band(mask,64)~=0 and 1 or 0)
    villageDialogue(player,"진행 중 · "..contract.Name,contract.Summary..
      "\n\n진행 "..found.."/3 · "..contract.WitnessName.." 진술 1개 · 현장 1곳 · "..contract.EnemyName.." 처치.")
  else
    villageDialogue(player,"결정 · "..contract.Name,contract.Summary..
      "\n\n사건을 해결했어. 선택한 결과가 저장되고 보상은 한 번만 받아.",{
      {label=contract.Choices[1].Label,action="village:resolve:1"},
      {label=contract.Choices[2].Label,action="village:resolve:2"},
    })
  end
end
local function villageInvestigate(player,clueIndex,role,sceneContractIndex)
  local index,contract=villageCurrentContract(player)
  if sceneContractIndex and index~=sceneContractIndex then
    villageDialogue(player,role,"이 흔적은 다른 사건에 속해. 현재 마을 의뢰를 먼저 확인해.")
    return
  end
  if not contract then
    villageDialogue(player,role,"모든 마을 의뢰가 끝났어.")
    return
  end
  if readNumber(player,"VillageContractPhase",0)~=1 then
    villageDialogue(player,role,"먼저 마을 중앙의 촌장 나린 또는 의뢰판에서 의뢰를 확인해.")
    return
  end
  if clueIndex<=3 and clueIndex~=contract.Witness then
    villageDialogue(player,role,"이번 사건의 핵심 진술은 "..contract.WitnessName.."에게 들어봐.")
    return
  end
  if clueIndex>3 and clueIndex~=4 then return end
  local mask=readNumber(player,"VillageContractEvidence",0)
  local bit=bit32.lshift(1,clueIndex-1)
  if bit32.band(mask,bit)==0 then
    mask=bit32.bor(mask,bit)
    setNumber(player,"VillageContractEvidence",mask)
    local required=bit32.bor(bit32.lshift(1,contract.Witness-1),8,64)
    if bit32.band(mask,required)==required then setNumber(player,"VillageContractPhase",2) end
  end
  local clue=clueIndex<=3 and contract.Clues[1] or contract.Scenes[1]
  local required=bit32.bor(bit32.lshift(1,contract.Witness-1),8,64)
  local note=bit32.band(mask,required)==required
    and "\n\n전투까지 끝났어. 촌장에게 돌아가 사건을 마무리해."
    or "\n\n남은 진술·현장 단서·전투를 완료해."
  villageDialogue(player,role,clue..note)
end
local function villageChoose(player,actionId)
  if os.clock()-(villageInteractionCooldown[player] or 0)<.35 then return end
  local session=villageSessions[player]
  if not session or os.clock()>session.expires
    or not villageNear(player,session.position,16) then return end
  local index,contract=villageCurrentContract(player)
  if not contract then return end
  local phase=readNumber(player,"VillageContractPhase",0)
  if actionId=="village:accept" and phase==0 then
    setNumber(player,"VillageContractPhase",1)
    setNumber(player,"VillageContractEvidence",0)
    villageInteractionCooldown[player]=os.clock()
    villageSessions[player]=nil
    villageDialogue(player,"수락 · "..contract.Name,contract.WitnessName.." 진술과 현장 단서 1개를 찾은 뒤 "..contract.EnemyName.."을 처치해.")
    return
  end
  local selected=actionId=="village:resolve:1" and 1 or actionId=="village:resolve:2" and 2 or nil
  if selected and phase==2 then
    local mask=readNumber(player,"VillageContractEvidence",0)
    local required=bit32.bor(bit32.lshift(1,contract.Witness-1),8,64)
    -- 기존 6개 단서를 모두 수집한 저장(63/phase=2)은 소급 전투 요구 없이 마무리한다.
    if bit32.band(mask,required)~=required and mask~=63 then return end
    local choice=contract.Choices[selected]
    local previous=readNumber(player,"VillageContractOutcomes",0)
    local shift=(index-1)*2
    if bit32.band(bit32.rshift(previous,shift),3)~=0 then return end
    setNumber(player,"VillageContractOutcomes",bit32.bor(previous,bit32.lshift(selected,shift)))
    setNumber(player,"VillageContractIndex",index+1)
    setNumber(player,"VillageContractPhase",0)
    setNumber(player,"VillageContractEvidence",0)
    setNumber(player,"Coins",readNumber(player,"Coins",0)+choice.Reward)
    player:SetAttribute("LastApprovedScope","village-contract-conclusion")
    villageInteractionCooldown[player]=os.clock()
    villageSessions[player]=nil
    villageDialogue(player,"의뢰 해결 · "..contract.Name,choice.Outcome..
      "\n\n의뢰 보상 "..choice.Reward.."코인 · 선택 결과는 기존 저장 프로필에 기록돼.")
  end
end
local function villagePrompt(model,objectName,actionName,callback)
  local mesh=model and (model:FindFirstChild("Head",true) or model:FindFirstChildWhichIsA("MeshPart",true))
  if not mesh or not mesh:IsA("BasePart") then return false end
  local prompt=Instance.new("ProximityPrompt")
  prompt.Name="MeadowVillageInteraction"
  prompt.ObjectText=objectName
  prompt.ActionText=actionName
  prompt.MaxActivationDistance=12
  prompt.HoldDuration=.35
  prompt.RequiresLineOfSight=false
  prompt.Parent=mesh
  prompt.Triggered:Connect(function(player)
    if villageNear(player,mesh.Position,15) then callback(player,mesh.Position) end
  end)
  return true
end
local function villageNativeNpc(spec)
  -- Roblox 공식 R15 캐릭터 생성 기능을 사용한다. 임시 신체 Part 제작/타 게임 모델 전용 금지.
  local ok,npc=pcall(function()
    local desc=Instance.new("HumanoidDescription")
    desc.HeadColor=spec.skin
    desc.LeftArmColor=spec.skin
    desc.RightArmColor=spec.skin
    desc.TorsoColor=spec.cloth
    desc.LeftLegColor=spec.pants
    desc.RightLegColor=spec.pants
    local model=Players:CreateHumanoidModelFromDescriptionAsync(desc,Enum.HumanoidRigType.R15)
    desc:Destroy()
    return model
  end)
  if not ok or not npc then
    warn("마력숲 마을 NPC R15 생성 실패: "..spec.name..":"..tostring(npc))
    return nil
  end
  npc.Name="Meadow_Villager_"..spec.id
  npc:SetAttribute("MeadowVillageNPC",true)
  npc:SetAttribute("VillageRole",spec.role)
  local humanoid=npc:FindFirstChildOfClass("Humanoid")
  if humanoid then
    humanoid.DisplayDistanceType=Enum.HumanoidDisplayDistanceType.None
    humanoid.HealthDisplayType=Enum.HumanoidHealthDisplayType.AlwaysOff
  end
  for _,part in ipairs(npc:GetDescendants()) do
    if part:IsA("BasePart") then
      part.CanCollide=part.Name=="LowerTorso"
      part.CanTouch=false
    end
  end
  local root=npc:FindFirstChild("HumanoidRootPart")
  if not root then npc:Destroy();return nil end
  root.Anchored=true
  npc:PivotTo(CFrame.lookAt(spec.location,Vector3.new(0,spec.location.Y,-111)))
  npc.ModelStreamingMode=Enum.ModelStreamingMode.Atomic
  npc.Parent=gameWorld
  -- Roblox 공식 R15 기본 걷기/대기 동작. 로블록스 서버 NPC Animator에서 재생해 모든 플레이어에 복제한다.
  if humanoid then
    humanoid.WalkSpeed=5
    humanoid.AutoRotate=true
    local animator=humanoid:FindFirstChildOfClass("Animator") or Instance.new("Animator")
    animator.Parent=humanoid
    local tracks={}
    for name,asset in pairs({idle=507766388,walk=507777826}) do
      local anim=Instance.new("Animation")
      anim.Name="Village_"..name
      anim.AnimationId="rbxassetid://"..asset
      local loaded,track=pcall(function()return animator:LoadAnimation(anim) end)
      if loaded and track then
        track.Looped=true
        track.Priority=Enum.AnimationPriority.Idle
        tracks[name]=track
      end
      anim:Destroy()
    end
    if tracks.idle then tracks.idle:Play(.2) end
    humanoid.Running:Connect(function(speed)
      local moving=speed>1.2
      if tracks.walk and tracks.walk.IsPlaying~=moving then
        if moving then tracks.walk:Play(.15) else tracks.walk:Stop(.2) end
      end
      if tracks.idle and tracks.idle.IsPlaying==moving then
        if moving then tracks.idle:Stop(.15) else tracks.idle:Play(.2) end
      end
    end)
    -- 마을 NPC는 이 지역 안에서만 움직이며 다른 게임의 경로탐색/전투 권한을 건드리지 않는다.
    root.Anchored=false
    pcall(function()root:SetNetworkOwner(nil)end)
    local home=spec.location
    task.spawn(function()
      local offsets={Vector3.new(3,0,2),Vector3.new(-3,0,1),Vector3.new(0,0,0)}
      while npc.Parent==gameWorld and humanoid.Health>0 do
        for _,offset in ipairs(offsets) do
          if npc.Parent~=gameWorld or humanoid.Health<=0 then break end
          local phase=gameWorld:GetAttribute("MeadowDayPhase")
          local destination=phase=="NIGHT" and home or home+offset
          -- [마을 주민] 실제 걸어갈 방향을 향한 채 서버가 이동시킨다. 루트 정면과 발걸음의 옆걸음 불일치 방지.
          local origin=root.Position
          local heading=Vector3.new(destination.X-origin.X,0,destination.Z-origin.Z)
          if heading.Magnitude>.5 then npc:PivotTo(CFrame.lookAt(origin,origin+heading.Unit)) end
          humanoid:MoveTo(destination)
          humanoid.MoveToFinished:Wait()
          task.wait(2.4)
        end
      end
    end)
  end
  local head=npc:FindFirstChild("Head",true)
  if head then
    local label=Instance.new("BillboardGui")
    label.Name="MeadowVillagerName"
    label.Adornee=head
    label.Size=UDim2.fromOffset(180,34)
    label.StudsOffset=Vector3.new(0,2.2,0)
    label.MaxDistance=42
    label.AlwaysOnTop=false
    label.Parent=head
    local text=Instance.new("TextLabel")
    text.Size=UDim2.fromScale(1,1)
    text.BackgroundTransparency=1
    text.Text=spec.name
    text.TextColor3=Color3.fromRGB(246,224,180)
    text.TextStrokeTransparency=.42
    text.Font=Enum.Font.GothamBold
    text.TextScaled=true
    text.Parent=label
  end
  return npc
end
local function createMeadowVillage()
  -- 외곽 지형 생성이 끝나고 조사 흔적을 배치해야 월드 확장에 흔적이 묻히지 않는다.
  while gameWorld:GetAttribute("MeadowOuterRegionReady")~=true do task.wait(.15) end
  -- [마을 평탄화] 초원 자체에 만들어진 봉우리와 뒤늦게 남는 울퉁불퉁한 언덕을 제거한다.
  -- 마을 구역의 Terrain만 고르게 정리하며 바위 채집/의뢰/모델 개체와 세이브는 손대지 않는다.
  -- 동쪽 외곽 개울과 북쪽의 원래 초원은 제외한다.
  for _,district in ipairs({
    {-180,-205,190,272},{0,-205,190,272},{180,-205,190,272},
  }) do
    meadowTerrain:FillBlock(CFrame.new(district[1],34,district[2]),
      Vector3.new(district[3],62,district[4]),Enum.Material.Air)
    meadowTerrain:FillBlock(CFrame.new(district[1],-4,district[2]),
      Vector3.new(district[3],12,district[4]),Enum.Material.Grass)
    task.wait()
  end
  gameWorld:SetAttribute("MeadowVillageFlatGroundReady",true)
  -- [확장된 숲마을 길] 기존 시작점, 의뢰판, NPC와 단서 좌표를 보존한 채 외곽 생활구역으로 길을 뻗는다.
  -- 기본 파츠 대신 네이티브 Terrain만 사용한다. 곡선과 가지길로 규칙적인 격자 배열을 피한다.
  for _,path in ipairs({
    {0,-86,25,45},{-3,-145,27,69},{3,-213,29,73},{-2,-284,27,91},
    {-68,-122,141,13},{66,-124,135,12},
    {-80,-190,159,14},{81,-194,163,13},
    {-92,-263,182,14},{96,-268,191,13},
    {-154,-165,12,101},{157,-170,12,104},
    {-194,-266,11,98},{197,-270,11,96},
  }) do
    meadowTerrain:FillBlock(CFrame.new(path[1],1.5,path[2]),
      Vector3.new(path[3],1.4,path[4]),Enum.Material.Ground)
  end
  -- [구불구불한 골목] 두 생활구역 사이의 걸어서 갈 수 있는 지름길.
  for _,lane in ipairs({
    {-55,-85,-102,-96},{58,-85,111,-93},
    {-76,-145,-119,-161},{76,-146,126,-160},
    {-90,-209,-95,-227},{91,-210,110,-230},
    {-162,-218,-186,-253},{167,-220,194,-251},
    {-98,-286,-106,-306},{95,-291,123,-310},
    {-158,-300,-215,-318},{163,-300,218,-320},
  }) do
    for step=0,8 do
      local t=step/8
      meadowTerrain:FillBall(Vector3.new(
        lane[1]+(lane[3]-lane[1])*t,-1.6,lane[2]+(lane[4]-lane[2])*t),
        4.5,Enum.Material.Ground)
    end
    task.wait()
  end
  -- [공동 광장] 공고 게시판과 주민 이동 중심은 원래 자리에 남는다.
  for _,plaza in ipairs({
    {0,-111,42,30},{3,-157,41,32},{-7,-238,36,24},
  }) do
    meadowTerrain:FillBlock(CFrame.new(plaza[1],1.55,plaza[2]),
      Vector3.new(plaza[3],1.4,plaza[4]),Enum.Material.Cobblestone)
  end
  -- [실제 건물] 기둥/벽/지붕/문은 저장소 Kenney 원본 3D GLB 등록본만 사용한다.
  -- 마력숲 Universe의 모델 등록·사용 권한이 없으면 임의 파츠 집으로 대체하지 않는다.
  local villagePrefabKeys={"villageWall","villageDoor","villageWindow","villageRoof",
    "villageRoofEnd","villageStall","villageFountain","villageFence","villageLantern","villageCart"}
  -- [원본 건물] 승인된 BUILDING 선택값과 실제 Kenney 모델 ID를 모두 확인한다.
  local nativeVillageReady=table.find(studioBuildingAtoms,"WALL_SOLID")~=nil
    and table.find(studioBuildingAtoms,"DOOR_SINGLE")~=nil
    and table.find(studioBuildingAtoms,"ROOF_GABLE")~=nil
  for _,key in ipairs(villagePrefabKeys) do
    if typeof(NativeCreatureAssets[key])~="number" or NativeCreatureAssets[key]<1 then
      nativeVillageReady=false;break
    end
  end
  -- [확장 모델] 9종은 실제 모델 ID가 등록·권한 부여된 경우에만 사용한다.
  -- 새 업로드가 아직 승인되지 않아도 기존 10종으로 이루어진 16개 집과 의뢰는 지운다거나 바꾸지 않는다.
  local villageDetailReady=nativeVillageReady
  for _,key in ipairs({"villageStoneWall","villageFlatRoof","villageChimney",
    "villagePillar","villageArch","villageRuinWall","villageRoad",
    "villageTallTree","villageCrookedTree"}) do
    if typeof(NativeCreatureAssets[key])~="number" or NativeCreatureAssets[key]<1 then
      villageDetailReady=false;break
    end
  end
  -- [완성형 집 4종] 원본 .blend에서 내보낸 실제 CC0 집만 사용한다.
  -- 게임별 Model ID 등록 전에는 기존 16개 조립형 집을 그대로 유지한다.
  local villageWholeHouseReady=nativeVillageReady
  for _,key in ipairs({"villageHouseA","villageHouseB","villageHouseC","villageHouseD"}) do
    if typeof(NativeCreatureAssets[key])~="number" or NativeCreatureAssets[key]<1 then
      villageWholeHouseReady=false;break
    end
  end
  -- [중세 숲마을 건축] 위처 3의 비대칭 농촌 배치만 참고하고 실제 CC0 모듈 외형은 유지한다.
  -- 기존 6동을 보존하되 생활·상업·농경·외곽 구역에 배치하고 서로 다른 실루엣을 만든다.
  local villageArchitectureScale=2.35
  local villageBuildings=0
  local villageProps=0
  local expectedVillageBuildings=16
  if nativeVillageReady then
    -- [집 유형] 짧은 초가, 긴 농가/공방, 이층 여관/회관. 문 방향은 광장·골목을 향하게 한다.
    -- 원래 등장한 건물 이름을 유지해서 기존 컨텐츠 참조에 영향이 없게 한다.
    local houses={
      {x=-99,z=-90,angle=0,name="Village_HealerHouse",label="약초상 · 의원",scale=.96,length=2,storeys=1,roofPitch=.93,doorZ=-2.7,sideWindow=true,porch=1,lantern=true,chimney=true,wing=-1,wingZ=2.7,
       timber=Color3.fromRGB(125,107,88),roof=Color3.fromRGB(82,91,78)},
      {x=112,z=-93,angle=math.pi,name="Village_Guesthouse",label="마을 여관",scale=1.15,length=3,storeys=2,roofPitch=1.09,doorZ=0,sideWindow=true,porch=2,lantern=true,prefab="villageHouseA",masonry=true,chimney=true,archway=true,balcony=true,
       timber=Color3.fromRGB(151,117,88),roof=Color3.fromRGB(96,72,66)},
      {x=-116,z=-160,angle=0,name="Village_Workshop",label="대장간 · 공방",scale=1.02,length=3,storeys=1,roofPitch=.85,doorZ=0,sideWindow=false,porch=1,lantern=true,masonry=true,chimney=true,wing=-1,wingZ=5.4,
       timber=Color3.fromRGB(106,94,83),roof=Color3.fromRGB(73,79,79)},
      {x=125,z=-158,angle=math.pi,name="Village_WardenHall",label="마을 회관",scale=1.24,length=3,storeys=2,roofPitch=1.13,doorZ=0,sideWindow=true,porch=2,lantern=true,prefab="villageHouseB",masonry=true,chimney=true,archway=true,balcony=true,wing=-1,wingZ=5.4,
       timber=Color3.fromRGB(146,119,91),roof=Color3.fromRGB(92,70,59)},
      {x=-96,z=-226,angle=0,name="Village_ResidentHouseWest",label="서쪽 주민집",scale=.87,length=2,storeys=1,roofPitch=.85,doorZ=2.7,sideWindow=false,porch=0,lantern=false,chimney=true,wing=-1,wingZ=-2.7,
       timber=Color3.fromRGB(153,132,107),roof=Color3.fromRGB(105,89,74)},
      {x=109,z=-229,angle=math.pi,name="Village_ResidentHouseEast",label="동쪽 주민집",scale=.96,length=2,storeys=1,roofPitch=1.09,doorZ=-2.7,sideWindow=true,porch=1,lantern=false,flatRoof=true,wing=-1,wingZ=2.7,
       timber=Color3.fromRGB(116,102,87),roof=Color3.fromRGB(92,104,92)},
      {x=-198,z=-89,angle=math.pi*.1,name="Village_WoodcutterHome",label="벌목꾼의 집",scale=.86,length=2,storeys=1,roofPitch=.96,doorZ=2.7,sideWindow=false,porch=0,lantern=false,chimney=true,wing=-1,wingZ=2.7,
       timber=Color3.fromRGB(119,103,80),roof=Color3.fromRGB(91,82,67)},
      {x=201,z=-104,angle=math.pi*.91,name="Village_WoodsmanHome",label="숲지기 오두막",scale=.91,length=2,storeys=1,roofPitch=1.08,doorZ=-2.7,sideWindow=true,porch=1,lantern=false,flatRoof=true,leanTo=true,
       timber=Color3.fromRGB(111,108,91),roof=Color3.fromRGB(85,95,76)},
      {x=-198,z=-163,angle=math.pi*.12,name="Village_CarpenterHome",label="목수 작업집",scale=.94,length=3,storeys=1,roofPitch=.91,doorZ=0,sideWindow=true,porch=1,lantern=true,masonry=true,chimney=true,wing=-1,wingZ=-5.4,
       timber=Color3.fromRGB(134,109,88),roof=Color3.fromRGB(97,86,70)},
      {x=207,z=-177,angle=math.pi*.87,name="Village_BakerHome",label="빵 굽는 집",scale=.91,length=2,storeys=1,roofPitch=1.05,doorZ=2.7,sideWindow=true,porch=1,lantern=true,masonry=true,chimney=true,leanTo=true,
       timber=Color3.fromRGB(162,126,96),roof=Color3.fromRGB(109,88,75)},
      {x=-189,z=-250,angle=-math.pi*.06,name="Village_Granary",label="곡물 창고",scale=1.04,length=3,storeys=1,roofPitch=1.13,doorZ=0,sideWindow=false,porch=0,lantern=false,prefab="villageHouseC",masonry=true,flatRoof=true,leanTo=true,
       timber=Color3.fromRGB(129,107,81),roof=Color3.fromRGB(98,91,68)},
      {x=196,z=-251,angle=math.pi*1.05,name="Village_Farmstead",label="농가 · 마구간",scale=1.02,length=3,storeys=1,roofPitch=.82,doorZ=0,sideWindow=false,porch=1,lantern=false,prefab="villageHouseD",masonry=true,flatRoof=true,wing=-1,wingZ=5.4,
       timber=Color3.fromRGB(117,98,75),roof=Color3.fromRGB(91,84,74)},
      {x=-104,z=-309,angle=.08,name="Village_SouthCottageWest",label="남쪽 농가",scale=.89,length=2,storeys=1,roofPitch=.92,doorZ=-2.7,sideWindow=true,porch=0,lantern=false,chimney=true,wing=-1,wingZ=-2.7,
       timber=Color3.fromRGB(148,126,102),roof=Color3.fromRGB(89,86,77)},
      {x=121,z=-309,angle=math.pi-.12,name="Village_SouthCottageEast",label="길가 주민집",scale=.92,length=2,storeys=1,roofPitch=1.02,doorZ=2.7,sideWindow=false,porch=1,lantern=false,flatRoof=true,leanTo=true,
       timber=Color3.fromRGB(112,98,82),roof=Color3.fromRGB(91,77,65)},
      {x=-228,z=-320,angle=-.18,name="Village_OrchardHome",label="과수원 농가",scale=.84,length=2,storeys=1,roofPitch=.87,doorZ=2.7,sideWindow=true,porch=0,lantern=false,chimney=true,leanTo=true,
       timber=Color3.fromRGB(133,121,98),roof=Color3.fromRGB(100,90,69)},
      {x=219,z=-320,angle=math.pi+.17,name="Village_EastFarmhouse",label="동쪽 농가",scale=.94,length=2,storeys=1,roofPitch=1.08,doorZ=-2.7,sideWindow=true,porch=1,lantern=false,flatRoof=true,wing=-1,wingZ=2.7,
       timber=Color3.fromRGB(123,102,87),roof=Color3.fromRGB(90,101,88)},
    }
    for houseIndex,house in ipairs(houses) do
      -- [서로 다른 완성형 건물] 기존 여관·회관·창고·농가를 각각 별개 중세 모델로 구성.
      -- 등록·로드 실패 시 해당 건물은 기존 조립형으로 남기고 저장 및 의뢰 좌표를 보존한다.
      local hasOriginalHouse=false
      if house.prefab and villageWholeHouseReady then
        local houseModel=worldAsset(house.prefab,Vector3.new(house.x,3,house.z),
          10.2*villageArchitectureScale*house.scale)
        if houseModel then
          houseModel.Name=house.name.."_OriginalCC0House"
          houseModel:SetAttribute("MeadowVillageScenery",true)
          houseModel:SetAttribute("VillageBuilding",house.name)
          houseModel:SetAttribute("VillageDistrict",houseIndex<=4 and "CENTRAL" or "FARMLAND")
          houseModel:PivotTo(houseModel:GetPivot()*CFrame.Angles(0,house.angle,0))
          local signMesh=houseModel:FindFirstChildWhichIsA("MeshPart",true)
          if signMesh then
            for _,mesh in ipairs(houseModel:GetDescendants()) do
              if mesh:IsA("MeshPart") then mesh.CanCollide=true end
            end
            local sign=Instance.new("BillboardGui")
            sign.Name="MeadowVillageHouseSign"
            sign.Adornee=signMesh
            sign.Size=UDim2.fromOffset(158,28)
            sign.StudsOffsetWorldSpace=Vector3.new(0,10.5,0)
            sign.MaxDistance=72
            sign.Parent=signMesh
            local caption=Instance.new("TextLabel")
            caption.Size=UDim2.fromScale(1,1)
            caption.BackgroundTransparency=1
            caption.Font=Enum.Font.GothamBold
            caption.TextSize=14
            caption.TextStrokeTransparency=.3
            caption.TextColor3=Color3.fromRGB(246,216,163)
            caption.Text=house.label
            caption.Parent=sign
            villageBuildings+=1
            hasOriginalHouse=true
          else
            houseModel:Destroy()
          end
        end
      end
      if not hasOriginalHouse then
      -- [기존 Kenney 건물 모듈] 길이 2/3칸, 층수 1/2의 실제 문·창·벽·박공지붕으로 외형을 다르게 구성한다.
      local rowCount=house.length
      local roofRows=rowCount==3 and {-5.4,0,5.4} or {-2.7,2.7}
      local endZ=rowCount*2.7
      local roofLift=house.storeys==2 and 9.65 or 4.65
      local pieces={}
      for rowIndex,z in ipairs(roofRows) do
        pieces[#pieces+1]={asset=z==house.doorZ and "villageDoor"
          or (house.masonry and villageDetailReady and rowIndex%2==1 and "villageStoneWall")
          or (rowIndex%2==0 and "villageWindow" or "villageWall"),
          x=6,z=z,height=5,lift=0}
        pieces[#pieces+1]={asset=house.masonry and villageDetailReady and "villageStoneWall"
          or (house.sideWindow and "villageWindow" or "villageWall"),
          x=-6,z=z,height=5,lift=0}
        if house.storeys==2 then
          pieces[#pieces+1]={asset="villageWindow",x=6,z=z,height=5,lift=5}
          pieces[#pieces+1]={asset=rowIndex%2==0 and "villageWall" or "villageWindow",x=-6,z=z,height=5,lift=5}
        end
        pieces[#pieces+1]={asset=house.flatRoof and villageDetailReady and "villageFlatRoof" or "villageRoof",
          x=0,z=z,height=3.7,lift=roofLift}
      end
      for _,sideZ in ipairs({-endZ,endZ}) do
        for _,sideX in ipairs({-2.7,2.7}) do
          pieces[#pieces+1]={asset=house.masonry and villageDetailReady and "villageStoneWall"
            or (house.sideWindow and sideX<0 and "villageWindow" or "villageWall"),
            x=sideX,z=sideZ,height=5,lift=0,angle=math.pi*.5}
          if house.storeys==2 then
            pieces[#pieces+1]={asset=sideX<0 and "villageWindow" or "villageWall",
              x=sideX,z=sideZ,height=5,lift=5,angle=math.pi*.5}
          end
        end
        pieces[#pieces+1]={asset="villageRoofEnd",x=0,z=sideZ,height=3.7,
          lift=roofLift,angle=sideZ>0 and math.pi or 0}
      end
      -- [완성형 건축 디테일] 기존 창/문 배치를 유지한 채 원본 굴뚝·석주·아치를 더한다.
      -- Kenney 등록 모델 외의 단순 파츠·원형 장식은 사용하지 않는다.
      if villageDetailReady then
        if house.chimney then
          pieces[#pieces+1]={asset="villageChimney",x=-3.1,z=house.length==3 and 2.7 or 0,
            height=3.2,lift=roofLift+1.55,decoration=true}
        end
        if house.masonry then
          for _,offset in ipairs({-3.1,3.1}) do
            pieces[#pieces+1]={asset="villagePillar",x=8,z=house.doorZ+offset,
              height=3.7,lift=0,decoration=true}
          end
        end
        if house.archway then
          pieces[#pieces+1]={asset="villageArch",x=9.8,z=house.doorZ,
            height=4.9,lift=0,angle=math.pi*.5,decoration=true}
        end
      end
      -- [ㄱ자 집 / 마당 작업동] 기존에 다운로드·검증해 등록한 Kenney CC0 벽·문·지붕을
      -- 본채 측면에 직각으로 연결한다. 단색 집을 복제하지 않고 실제 외곽 실루엣을 바꾼다.
      -- 현관 반대편에 붙여 원래 문·NPC 동선을 가리지 않는다.
      if house.wing then
        local w=house.wing
        local wingZ=house.wingZ or 0
        for rowIndex,offset in ipairs({-2.7,2.7}) do
          pieces[#pieces+1]={asset="villageRoof",x=w*11.4,z=wingZ+offset,
            height=3.5,lift=4.65,angle=math.pi*.5}
          pieces[#pieces+1]={asset=rowIndex==1 and "villageDoor" or "villageWindow",
            x=w*16.2,z=wingZ+offset,height=5,lift=0,secondary=true}
          pieces[#pieces+1]={asset="villageWall",
            x=w*11.4,z=wingZ+offset*2,height=5,lift=0,angle=math.pi*.5}
        end
        pieces[#pieces+1]={asset="villageRoofEnd",x=w*16.2,z=wingZ,
          height=3.5,lift=4.65,angle=w<0 and -math.pi*.5 or math.pi*.5}
      end
      -- [헛간·오두막] 낮은 측면 창고 차양. 원본 지붕 부재를 이용하고 빈 파츠는 만들지 않는다.
      if house.leanTo then
        for _,offset in ipairs({-2.7,2.7}) do
          pieces[#pieces+1]={asset="villageRoof",x=-8.1,z=offset,
            height=2.55,lift=3.15,angle=math.pi*.5,decoration=true}
        end
      end
      -- [큰 건물 전면 회랑] 여관·회관의 2층 처마를 넓게 이어 단층 주택과 구별한다.
      if house.balcony and house.storeys==2 then
        for _,offset in ipairs({-5.4,0,5.4}) do
          pieces[#pieces+1]={asset="villageRoof",x=7.65,z=offset,
            height=2.15,lift=5.1,angle=math.pi*.5,decoration=true}
        end
      end
      -- [차양] 집의 원본 지붕 메시를 재사용하며 단순 Part를 새로 생성하지 않는다.
      for porchIndex=1,house.porch do
        local porchZ=house.porch==1 and house.doorZ
          or (porchIndex==1 and house.doorZ-2.7 or house.doorZ+2.7)
        pieces[#pieces+1]={asset="villageRoof",x=7.75,z=porchZ,height=2.2,
          lift=3.25,angle=math.pi*.5,decoration=true}
      end
      local created=0
      for partIndex,piece in ipairs(pieces) do
        local houseScale=villageArchitectureScale*house.scale
        local rot=house.angle
        local x=house.x+piece.x*houseScale*math.cos(rot)-piece.z*houseScale*math.sin(rot)
        local z=house.z+piece.x*houseScale*math.sin(rot)+piece.z*houseScale*math.cos(rot)
        local roofPitch=(piece.asset=="villageRoof" or piece.asset=="villageRoofEnd" or piece.asset=="villageFlatRoof")
          and (piece.decoration and 1 or house.roofPitch) or 1
        local model=worldAsset(piece.asset,Vector3.new(x,3,z),
          piece.height*houseScale*roofPitch,piece.lift*houseScale)
        if model then
          model.Name=house.name.."_"..partIndex
          model:SetAttribute("MeadowVillageScenery",true)
          model:SetAttribute("VillageBuilding",house.name)
          model:SetAttribute("VillageDistrict",houseIndex<=4 and "CENTRAL" or houseIndex<=10 and "RESIDENTIAL" or "FARMLAND")
          model:PivotTo(model:GetPivot()*CFrame.Angles(0,rot+(piece.angle or 0),0))
          for _,mesh in ipairs(model:GetDescendants()) do
            if mesh:IsA("MeshPart") then
              mesh.CanCollide=piece.lift==0
              if piece.asset=="villageRoof" or piece.asset=="villageRoofEnd" or piece.asset=="villageFlatRoof" then
                mesh.Color=house.roof:Lerp(Color3.fromRGB(73,76,71),(partIndex%3)*.06)
                mesh.Material=Enum.Material.Slate
              elseif piece.asset=="villageStoneWall" or piece.asset=="villagePillar" or piece.asset=="villageArch" then
                mesh.Color=Color3.fromRGB(137,133,117)
                mesh.Material=Enum.Material.Slate
              elseif piece.asset=="villageWall" then
                mesh.Color=house.timber:Lerp(Color3.fromRGB(91,85,73),(partIndex%4)*.06)
                mesh.Material=Enum.Material.Wood
              end
            end
          end
          if piece.asset=="villageDoor" and not piece.secondary then
            local front=model:FindFirstChildWhichIsA("MeshPart",true)
            if front then
              local sign=Instance.new("BillboardGui")
              sign.Name="MeadowVillageHouseSign"
              sign.Adornee=front
              sign.Size=UDim2.fromOffset(158,28)
              sign.StudsOffsetWorldSpace=Vector3.new(0,7.8,0)
              sign.MaxDistance=72
              sign.Parent=front
              local caption=Instance.new("TextLabel")
              caption.Size=UDim2.fromScale(1,1)
              caption.BackgroundTransparency=1
              caption.Font=Enum.Font.GothamBold
              caption.TextSize=14
              caption.TextStrokeTransparency=.3
              caption.TextColor3=Color3.fromRGB(246,216,163)
              caption.Text=house.label
              caption.Parent=sign
            end
          end
          created+=1
        end
        if partIndex%4==0 then task.wait(.03) end
      end
      if created==#pieces then villageBuildings+=1 end
      end -- 완성형 집과 조립형 집 중복 배치 금지
      if house.lantern then
        local scale=villageArchitectureScale*house.scale
        local sideX,sideZ=7.9*scale,house.doorZ*scale
        local x=house.x+sideX*math.cos(house.angle)-sideZ*math.sin(house.angle)
        local z=house.z+sideX*math.sin(house.angle)+sideZ*math.cos(house.angle)
        local entryLantern=worldAsset("villageLantern",Vector3.new(x,3,z),1.9,3.3*scale)
        if entryLantern then
          entryLantern.Name=house.name.."_EntranceLantern"
          entryLantern:SetAttribute("MeadowVillageScenery",true)
        end
      end
      task.wait(.04)
    end
    -- [시장·생활 마당] 식탁처럼 보이던 가판대를 늘리지 않고 두 장터만 유지한다.
    -- 기존 CC0 카트·울타리·등불을 농가와 골목에 비대칭 분산 배치한다.
    local furnishings={
      {"villageStall",-26,-148,3.15,.2},{"villageStall",26,-164,3.4,-.3},
      {"villageFountain",0,-146,2.2,0},
      {"villageCart",-52,-165,6,.4},{"villageCart",54,-244,5.6,-.35},
      {"villageCart",-165,-234,6.1,.15},{"villageCart",176,-148,6.1,-.5},
      {"villageLantern",-17,-102,5,0},{"villageLantern",19,-113,5,0},
      {"villageLantern",-14,-184,5,0},{"villageLantern",18,-201,5,0},
      {"villageLantern",-25,-266,5,0},{"villageLantern",23,-278,5,0},
      {"villageLantern",-143,-119,4.8,0},{"villageLantern",157,-185,4.8,0},
      {"villageFence",-154,-71,4.8,.16},{"villageFence",-156,-90,4.8,.16},
      {"villageFence",167,-79,4.8,-.2},{"villageFence",168,-99,4.8,-.2},
      {"villageFence",-145,-218,4.8,.4},{"villageFence",-158,-224,4.8,.4},
      {"villageFence",146,-243,4.8,-.3},{"villageFence",159,-246,4.8,-.3},
      {"villageFence",-234,-150,4.8,math.pi*.5},{"villageFence",-234,-170,4.8,math.pi*.5},
      {"villageFence",243,-158,4.8,math.pi*.5},{"villageFence",243,-178,4.8,math.pi*.5},
      {"villageFence",-238,-278,4.8,.15},{"villageFence",-239,-295,4.8,.15},
      {"villageFence",253,-271,4.8,-.13},{"villageFence",253,-289,4.8,-.13},
      {"villageFence",-75,-326,4.8,0},{"villageFence",-57,-327,4.8,0},
      {"villageFence",85,-330,4.8,0},{"villageFence",105,-331,4.8,0},
    }
    -- [마을 소품] 실물 CC0 원본: 아치형 입구, 낡은 성벽, 돌기둥, 돌길, 두 종류의 나무.
    -- 모델의 게임별 사용권한이 미확정일 때는 기존 10종 소품만 유지한다.
    if villageDetailReady then
      for _,extra in ipairs({
        {"villageArch",-34,-111,5.4,.25},{"villageArch",37,-239,5.5,-.24},
        {"villageRuinWall",-263,-181,6.2,.1},{"villageRuinWall",249,-302,5.6,-.2},
        {"villagePillar",-31,-151,5.0,0},{"villagePillar",30,-153,5.0,0},
        {"villagePillar",-32,-237,5.0,.1},{"villagePillar",32,-239,5.0,-.1},
        {"villageRoad",-14,-115,1.1,.06},{"villageRoad",12,-158,1.1,-.07},
        {"villageRoad",-11,-243,1.1,.05},{"villageRoad",12,-270,1.1,-.04},
        {"villageTallTree",-250,-125,15,.22},{"villageTallTree",258,-226,16,-.28},
        {"villageCrookedTree",-246,-300,12,.13},{"villageCrookedTree",240,-73,14,-.15},
      }) do
        furnishings[#furnishings+1]=extra
      end
    end
    for index,row in ipairs(furnishings) do
      -- [실제 우물] 기존 원본 분수 메시를 우물 크기로만 축소한다.
      local propHeight=row[1]=="villageFountain" and row[4] or row[4]*1.3
      local model=worldAsset(row[1],Vector3.new(row[2],3,row[3]),propHeight)
      if model then
        model.Name=row[1]=="villageFountain" and "Meadow_Village_Well"
          or "Meadow_Village_"..row[1].."_"..index
        model:SetAttribute("MeadowVillageScenery",true)
        model:PivotTo(model:GetPivot()*CFrame.Angles(0,row[5],0))
        if row[1]=="villageFence" or row[1]=="villageCart" then
          for _,mesh in ipairs(model:GetDescendants()) do
            if mesh:IsA("MeshPart") then
              mesh.Color=Color3.fromRGB(118,94,71)
              mesh.Material=Enum.Material.Wood
              mesh.CanCollide=row[1]=="villageFence"
            end
          end
        elseif row[1]=="villageFountain" then
          for _,mesh in ipairs(model:GetDescendants()) do
            if mesh:IsA("MeshPart") then
              mesh.Color=Color3.fromRGB(105,111,108)
              mesh.Material=Enum.Material.Slate
            end
          end
        elseif row[1]=="villageRoad" or row[1]=="villageRuinWall"
          or row[1]=="villagePillar" or row[1]=="villageArch" then
          for _,mesh in ipairs(model:GetDescendants()) do
            if mesh:IsA("MeshPart") then
              mesh.Material=Enum.Material.Slate
              mesh.Color=Color3.fromRGB(127,125,114)
              mesh.CanCollide=false
            end
          end
        elseif row[1]=="villageLantern" then
          local mesh=model:FindFirstChildWhichIsA("MeshPart",true)
          if mesh then
            local glow=Instance.new("PointLight")
            glow.Name="MeadowVillageLanternGlow"
            glow.Color=Color3.fromRGB(255,184,116)
            glow.Brightness=.9
            glow.Range=12
            glow.Shadows=false
            glow.Parent=mesh
          end
        end
        villageProps+=1
      end
      if index%4==0 then task.wait(.03) end
    end
    -- [마을 바깥 풍경] 몬스터 모델로 마을 장식을 만드는 대신 CC0 나무만 외곽에 둔다.
    for index,pos in ipairs({
      {-259,-57},{271,-62},{-275,-121},{270,-128},
      {-278,-209},{275,-218},{-274,-305},{276,-312},
      {-166,-41},{174,-47},{-53,-345},{51,-343},
      {-31,-68},{36,-70},{-164,-338},{164,-338},
    }) do
      local tree=worldAsset("tree",Vector3.new(pos[1],3,pos[2]),
        16+((index*7)%5)*1.5)
      if tree then
        tree.Name="Meadow_Village_BoundaryTree_"..index
        tree:SetAttribute("MeadowVillageScenery",true)
      end
      if index%3==0 then task.wait(.05) end
    end
  end
  gameWorld:SetAttribute("MeadowVillageBuildingCount",villageBuildings)
  gameWorld:SetAttribute("MeadowVillagePropCount",villageProps)
  gameWorld:SetAttribute("MeadowVillagePrefabReady",nativeVillageReady and villageBuildings==expectedVillageBuildings)
  -- [유적 제거] 예전 12개 파손 석벽을 집 옆에 세워 폐허로 보이던 배치를 제거한다.
  -- 돌벽을 집으로 위장하지 않으며 실제 마을 프리팹의 울타리·건물만 사용한다.
  local wallCount=0
  -- [마을 의뢰 게시판] 식탁처럼 보이던 가판대 대신 승인된 CC0 목재 벽판을 세워
  -- 실제 공고가 붙은 세로형 게시판으로 구성한다. 신규 기본 Part/임시 메시를 생성하지 않는다.
  -- 원래 접수 좌표·NPC 의뢰·저장·상호작용은 그대로 사용한다.
  local board=worldAsset("villageWall",Vector3.new(0,3,-101),5.2)
  if board then
    board.Name="Meadow_Village_ContractBoard"
    board:SetAttribute("MeadowVillageScenery",true)
    board:PivotTo(board:GetPivot()*CFrame.Angles(0,math.pi*.5,0))
    local mesh=board:FindFirstChildWhichIsA("MeshPart",true)
    if mesh then
      mesh.Color=Color3.fromRGB(113,80,54)
      mesh.Material=Enum.Material.Wood
      mesh.CanCollide=true
      -- [화면 터치] 원본 메시의 CanQuery=false를 게시판에서만 켠다.
      mesh.CanQuery=true
    end

    -- [게시판 지붕] 기존 Kenney 박공지붕 끝판을 판자 위에 얹는다.
    local canopy=worldAsset("villageRoofEnd",Vector3.new(0,3,-101),2.6,4.35)
    if canopy then
      canopy.Name="Meadow_Village_ContractBoardRoof"
      canopy:SetAttribute("MeadowVillageScenery",true)
      canopy:PivotTo(canopy:GetPivot()*CFrame.Angles(0,math.pi*.5,0))
      for _,roofMesh in ipairs(canopy:GetDescendants()) do
        if roofMesh:IsA("MeshPart") then
          roofMesh.Color=Color3.fromRGB(104,79,62)
          roofMesh.Material=Enum.Material.Slate
          roofMesh.CanCollide=false
        end
      end
    end

    local promptReady=villagePrompt(board,"초원 마을 의뢰 접수소","의뢰 살펴보기",villageBoardDialogue)
    if mesh and promptReady then
      -- [모바일/PC] 게시판 탭 및 근처 버튼으로 원래 서버 의뢰 화면을 연다.
      local prompt=mesh:FindFirstChild("MeadowVillageInteraction")
      if prompt then
        prompt.HoldDuration=0
        prompt.MaxActivationDistance=18
        prompt.RequiresLineOfSight=false
        prompt.ClickablePrompt=true
      end
      local click=Instance.new("ClickDetector")
      click.Name="MeadowVillageBoardClick"
      click.MaxActivationDistance=18
      click.Parent=mesh
      click.MouseClick:Connect(function(player)
        if villageNear(player,mesh.Position,18) then
          villageBoardDialogue(player,mesh.Position)
        end
      end)
      board:SetAttribute("MeadowVillageClickable",true)
    end
    if mesh then
      -- [의뢰 공고] 목재 게시판 앞의 실제 의뢰서 세 장. 게임 경제·퀘스트는 그대로.
      -- 3D 구조물은 CC0 원본만 사용하고 종이는 화면 UI로 표시한다.
      local notices=Instance.new("BillboardGui")
      notices.Name="MeadowVillageNoticePapers"
      notices.Adornee=mesh
      notices.Size=UDim2.fromOffset(206,118)
      notices.StudsOffsetWorldSpace=Vector3.new(0,.45,0)
      notices.MaxDistance=30
      notices.AlwaysOnTop=false
      notices.Parent=mesh
      local backing=Instance.new("Frame")
      backing.Name="WoodenNoticeSurface"
      backing.Size=UDim2.fromScale(1,1)
      backing.BorderSizePixel=0
      backing.BackgroundColor3=Color3.fromRGB(75,52,34)
      backing.Parent=notices
      local heading=Instance.new("TextLabel")
      heading.Name="NoticeHeading"
      heading.Size=UDim2.new(1,0,.26,0)
      heading.Position=UDim2.fromScale(0,.02)
      heading.BackgroundTransparency=1
      heading.Text="마을 의뢰 공고"
      heading.TextColor3=Color3.fromRGB(240,209,151)
      heading.TextStrokeTransparency=.55
      heading.Font=Enum.Font.GothamBold
      heading.TextSize=18
      heading.Parent=backing
      for index,notice in ipairs({"실종된 약초","우물의 기이한 소리","길가의 부서진 수레"}) do
        local paper=Instance.new("Frame")
        paper.Name="ContractNotice_"..index
        paper.Size=UDim2.fromScale(.28,.59)
        paper.Position=UDim2.fromScale(.04+(index-1)*.32,.34)
        paper.Rotation=(index-2)*3
        paper.BorderSizePixel=0
        paper.BackgroundColor3=Color3.fromRGB(229,209,166)
        paper.Parent=backing
        local note=Instance.new("TextLabel")
        note.Size=UDim2.new(1,-8,1,-8)
        note.Position=UDim2.fromOffset(4,4)
        note.BackgroundTransparency=1
        note.Text=notice
        note.TextWrapped=true
        note.TextColor3=Color3.fromRGB(73,54,36)
        note.Font=Enum.Font.GothamBold
        note.TextSize=12
        note.Parent=paper
      end
      local sign=Instance.new("BillboardGui")
      sign.Name="MeadowVillageBoardSign"
      sign.Adornee=mesh
      sign.Size=UDim2.fromOffset(172,28)
      sign.StudsOffsetWorldSpace=Vector3.new(0,3.65,0)
      sign.MaxDistance=46
      sign.Parent=mesh
      local title=Instance.new("TextLabel")
      title.Size=UDim2.fromScale(1,1)
      title.BackgroundTransparency=1
      title.Font=Enum.Font.GothamBold
      title.TextSize=14
      title.TextStrokeTransparency=.28
      title.TextColor3=Color3.fromRGB(251,222,164)
      title.Text="초원 마을 의뢰 접수소"
      title.Parent=sign
    end
  end
  local villagers={
    {id="Elder",name="촌장 나린",role="ELDER",location=Vector3.new(-7,5,-109),
      skin=Color3.fromRGB(208,165,132),cloth=Color3.fromRGB(91,106,83),pants=Color3.fromRGB(72,65,54)},
    {id="Herbalist",name="약초상 미라",role="HERBALIST",location=Vector3.new(-25,5,-124),
      skin=Color3.fromRGB(220,177,144),cloth=Color3.fromRGB(77,131,102),pants=Color3.fromRGB(100,82,69)},
    {id="Tracker",name="추적자 라온",role="TRACKER",location=Vector3.new(22,5,-128),
      skin=Color3.fromRGB(191,147,114),cloth=Color3.fromRGB(115,87,65),pants=Color3.fromRGB(67,68,69)},
    {id="Guard",name="경비병 아린",role="GUARD",location=Vector3.new(10,5,-145),
      skin=Color3.fromRGB(201,157,126),cloth=Color3.fromRGB(95,103,123),pants=Color3.fromRGB(62,70,81)},
  }
  local readyCount=0
  for _,spec in ipairs(villagers) do
    local npc=villageNativeNpc(spec)
    if npc then
      local callback=spec.role=="ELDER" and villageBoardDialogue
        or spec.role=="HERBALIST" and function(player) villageInvestigate(player,1,spec.name) end
        or spec.role=="TRACKER" and function(player) villageInvestigate(player,2,spec.name) end
        or function(player) villageInvestigate(player,3,spec.name) end
      if villagePrompt(npc,spec.name,"대화하기",callback) then readyCount+=1 end
    end
    task.wait(.1)
  end
  -- [위치별 사건 단서] 각 사건에 실제 조사 지점 1곳만 둔다.
  local evidenceCount=0
  for contractIndex,contract in ipairs(Config.VillageContracts) do
    for sceneIndex,site in ipairs(contract.Sites) do
      local scenePosition=Vector3.new(site[1],3,site[2])
      local model=worldAsset("ruin",scenePosition,3.8)
      if model then
        model.Name="Meadow_Village_Evidence_"..contractIndex.."_"..sceneIndex
        model:SetAttribute("VillageContractIndex",contractIndex)
        model:SetAttribute("VillageClueIndex",sceneIndex+3)
        local title=({"찢긴 약초 포대","저주받은 우물","부서진 짐수레"})[contractIndex]
        if villagePrompt(model,title,"현장 조사",function(player)
          villageInvestigate(player,sceneIndex+3,title,contractIndex)
        end) then evidenceCount+=1 end
        local mesh=model:FindFirstChildWhichIsA("MeshPart",true)
        if mesh then
          local marker=Instance.new("BillboardGui")
          marker.Name="MeadowVillageInvestigationMarker"
          marker.Adornee=mesh
          marker.Size=UDim2.fromOffset(130,34)
          marker.StudsOffsetWorldSpace=Vector3.new(0,4.4,0)
          marker.MaxDistance=35
          marker.Parent=mesh
          local caption=Instance.new("TextLabel")
          caption.Size=UDim2.fromScale(1,1)
          caption.BackgroundTransparency=1
          caption.Font=Enum.Font.GothamBold
          caption.TextSize=13
          caption.TextStrokeTransparency=.45
          caption.TextColor3=Color3.fromRGB(239,201,125)
          caption.Text="조사할 흔적"
          caption.Parent=marker
        end
      end
      -- 실제 숲 외곽까지 이어지는 다져진 길을 Terrain에만 조성한다.
      for step=1,9 do
        local t=step/9
        local x=scenePosition.X*t
        local z=-146+(scenePosition.Z+146)*t
        meadowTerrain:FillBall(Vector3.new(x,-1.5,z),3.2,Enum.Material.Ground)
      end
      task.wait(.08)
    end
  end
  -- 원본 CC0 메시 이외에 임시 건축 파츠를 생성하지 않는다.
  gameWorld:SetAttribute("MeadowVillageEvidenceCount",evidenceCount)
  gameWorld:SetAttribute("MeadowVillageNPCCount",readyCount)
  gameWorld:SetAttribute("MeadowVillageWallCount",wallCount)
  gameWorld:SetAttribute("MeadowVillageBoardReady",board~=nil)
  gameWorld:SetAttribute("MeadowVillageReady",nativeVillageReady and villageBuildings==expectedVillageBuildings
    and readyCount==4 and board~=nil and evidenceCount==3)
end
task.defer(createMeadowVillage)

local function broadcastSurvivalState(actor)
  local participants = Players:GetPlayers()
  local objective = 0
  for _, member in ipairs(participants) do
    objective += readNumber(member, "Progress", 0)
  end
  for _, member in ipairs(participants) do
    member:SetAttribute("SharedObjective", objective)
    member:SetAttribute("CurrentWave", CurrentWave)
    member:SetAttribute("RunPhase", WaveState)
    member:SetAttribute("AliveEnemies", #enemies)
  end
  remote:FireAllClients("MULTIPLAYER_SYNC", {
    ActorUserId=actor and actor.UserId or 0, ParticipantCount=#participants,
    SharedObjective=objective, CurrentWave=CurrentWave,
    WaveState=WaveState, AliveEnemies=#enemies,
    RoundScore=actor and readNumber(actor, "RoundScore", 0) or 0,
  })
end

local function awardProgress(player, experience, coinReward)
  -- 레벨은 더 이상 증가시키지 않는다. 과거 Level/XP는 기존 저장 호환 전용.
  setNumber(player,"CombatProficiency",readNumber(player,"CombatProficiency",0)+experience)
  setNumber(player,"Coins",readNumber(player,"Coins",0)+coinReward)
  setNumber(player,"Progress",readNumber(player,"Progress",0)+experience)
end
-- 이전 레벨 전투력을 보존하면서 숙련도 점수에 따라 연속 성장한다.
local function meadowProficiencyPower(player)
  local points=math.max(0,readNumber(player,"CombatProficiency",0))
  return 2.2*(1+math.max(0,(math.sqrt(961+24*points)-31)/12))
end

-- [메인 퀘스트·연구 기록 아이템]
-- 채집·관찰·실제 몬스터 처치·유적 수문장 처치에만 연결한다.
-- 수집 기록은 숫자형 저장 필드이며 기존 DataStore/전투 보상 수치를 유지한다.
local function recordMeadowQuest(player, eventName)
  if player:GetAttribute("ProfileReady")~=true then return end
  local stage=readNumber(player,"QuestStage",1)
  -- [동료 서브 퀘스트] 검증된 행동만 기록하며 메인 완료 후에도 독립적으로 진행한다.
  local sideStage=readNumber(player,"CompanionQuestStage",1)
  local request=Config.CompanionRequests and Config.CompanionRequests[sideStage]
  if request and stage>=request.UnlockMainStage and eventName==request.Event then
    local sideProgress=math.min(request.Goal,readNumber(player,"CompanionQuestProgress",0)+1)
    if sideProgress>=request.Goal then
      setNumber(player,"CompanionQuestStage",sideStage+1)
      setNumber(player,"CompanionQuestProgress",0)
      remote:FireClient(player,"MEADOW_COMPANION_UPDATE",{completed=request.Name})
    else
      setNumber(player,"CompanionQuestProgress",sideProgress)
    end
  end
  local quest=Config.MainQuests and Config.MainQuests[stage]
  if not quest then return end
  local progress=readNumber(player,"QuestProgress",0)
  if stage==1 then
    if eventName~="INSPECT" and eventName~="WOODLAND" then return end
    progress+=1
  elseif stage==2 then
    if eventName=="WOOD" and readNumber(player,"QuestWood",0)==0 then
      setNumber(player,"QuestWood",1)
    elseif eventName=="STONE" and readNumber(player,"QuestStone",0)==0 then
      setNumber(player,"QuestStone",1)
    else
      return
    end
    progress=readNumber(player,"QuestWood",0)+readNumber(player,"QuestStone",0)
  elseif stage==3 then
    if eventName~="KILL" then return end
    progress+=1
  elseif stage==4 then
    if eventName~="KILL" then return end
    progress+=1
  elseif stage==5 then
    if eventName~="WOODLAND" then return end
    progress+=1
  elseif stage==6 then
    if eventName~="BOSS_KILL" then return end
    progress+=1
  end
  progress=math.min(quest.Goal,progress)
  if progress>=quest.Goal then
    -- 퀘스트 종료 시 해당 연구 일지 원본을 읽을 수 있는 소장 아이템으로 등록.
    local recordIndex=stage==1 and 1 or stage==3 and 2 or stage==5 and 3 or nil
    if recordIndex then
      setNumber(player,"ResearchRecords",math.max(readNumber(player,"ResearchRecords",0),recordIndex))
    end
    setNumber(player,"QuestStage",stage+1)
    setNumber(player,"QuestProgress",0)
    remote:FireClient(player,"MEADOW_QUEST_UPDATE",{
      completed=quest.Name,
      nextQuest=Config.MainQuests[stage+1] and Config.MainQuests[stage+1].Name or "초원 연구 기록 완료",
      record=recordIndex,
    })
  else
    setNumber(player,"QuestProgress",progress)
  end
end

local function gatherResource(player, node)
  local character = player.Character
  local rootPart = character and character:FindFirstChild("HumanoidRootPart")
  if not rootPart or not node then return false end
  if node.model and not node.model.Parent then return false end
  if not node.model and node.kind~="STONE" then return false end
  local sourcePos=node.model and node.model:GetPivot().Position or node.position
  if (rootPart.Position-sourcePos).Magnitude>14 then return false end
  local now = os.clock()
  if now < node.readyAt then return false end
  node.readyAt = now + 11
  if node.model then node.model:SetAttribute("NextHarvestAt", node.readyAt) end
  local material = node.kind == "WOOD" and "Wood" or "Stone"
  setNumber(player, material, readNumber(player, material, 0) + 2)
  awardProgress(player, 3, 1)
  -- [채집 숙련도] 기존 재화·전투 경험치·자원 2개 보상은 그대로 둔다.
  setNumber(player,"GatheringProficiency",readNumber(player,"GatheringProficiency",0)+1)
  player:SetAttribute("LastApprovedScope", "resource-harvest")
  recordMeadowQuest(player,node.kind)
  broadcastSurvivalState(player)
  return true
end

local function createResourceNodes()
  local sites = {
    {kind="WOOD",visual="tree",position=Vector3.new(-27,2,-22)},
    {kind="WOOD",visual="tree",position=Vector3.new(28,2,25)},
    {kind="WOOD",visual="tree",position=Vector3.new(37,2,-32)},
    {kind="STONE",position=Vector3.new(-35,2,31)},
    {kind="STONE",position=Vector3.new(11,2,-39)},
    {kind="STONE",position=Vector3.new(-7,2,43)},
  }
  for _, spec in ipairs(sites) do
    local model = spec.visual and worldAsset(spec.visual,spec.position,11) or nil
    if spec.kind == "STONE" or model then
      local node={model=model,position=spec.position,kind=spec.kind,readyAt=0}
      table.insert(resourceNodes,node)
      local mesh=model and model:FindFirstChildWhichIsA("MeshPart",true)
      if mesh then
        local prompt=Instance.new("ProximityPrompt")
        prompt.Name="GatherPrompt"
        prompt.ActionText="나무 채집"
        prompt.ObjectText="초원 나무"
        prompt.MaxActivationDistance=12
        prompt.HoldDuration=.55
        prompt.RequiresLineOfSight=false
        prompt.Parent=mesh
        prompt.Triggered:Connect(function(player) gatherResource(player,node) end)
      end
    end
  end
end
-- AssetService may yield: never block player input and profile bootstrap.
task.defer(createResourceNodes)

-- Passive original wildlife are presentation only. They never change combat,
-- progression, drops or the original save schema.
local meadowWildlife={}
-- [서식지 생존 상호작용] Roblox 기본 ProximityPrompt와 실제 캐릭터 거리만 사용한다.
-- 힌트는 이번 접속의 정보 표시 전용이고, 체력·자원·경험치·저장에는 영향을 주지 않는다.
local meadowInspectReady={}
local function inspectMeadowSurvival(player,model,subject)
  if not model or not model:IsDescendantOf(gameWorld)
    or player:GetAttribute("ProfileReady")~=true then return end
  local character=player.Character
  local rootPart=character and character:FindFirstChild("HumanoidRootPart")
  local humanoid=character and character:FindFirstChildOfClass("Humanoid")
  if not rootPart or not humanoid or humanoid.Health<=0
    or (rootPart.Position-model:GetPivot().Position).Magnitude>15 then return end
  local now=os.clock()
  if now<(meadowInspectReady[player] or 0) then return end
  meadowInspectReady[player]=now+2.5
  local threatName,threatDist=nil,52
  for _,enemy in ipairs(enemies) do
    if enemy.HP>0 and enemy.model.Parent then
      local distance=(enemy.position-rootPart.Position).Magnitude
      if distance<threatDist then
        threatDist=distance
        threatName=enemy.kind=="wolf" and "늑대" or enemy.kind=="bee" and "벌"
          or enemy.kind=="bat" and "박쥐" or enemy.kind=="ghost" and "원혼"
          or enemy.kind=="bandit" and "도적" or "몬스터"
      end
    end
  end
  -- [생존 관찰] 삭제된 사슴·멧돼지 힌트는 더 이상 노출하지 않는다.
  local hints={
    deer="새 사슴은 숲 가장자리에서 이동하다가 가까이 다가오는 사람을 피해 달아나.",
    rabbit="토끼는 수풀 근처에서 움직여. 조용히 접근하면 더 오래 관찰할 수 있어.",
  }
  local clue=hints[subject]
  if not clue then
    local nearest,distance=nil,math.huge
    for _,node in ipairs(resourceNodes) do
      local pos=node.model and node.model:GetPivot().Position or node.position
      local d=(pos-rootPart.Position).Magnitude
      if d<distance and now>=node.readyAt then nearest=node;distance=d end
    end
    if nearest then
      local offset=nearest.position-rootPart.Position
      local eastWest=math.abs(offset.X)>math.abs(offset.Z)
      local direction=eastWest and (offset.X>0 and "동쪽" or "서쪽")
        or (offset.Z>0 and "남쪽" or "북쪽")
      clue=string.format("생존 탐색: %s 방향 약 %d걸음에 %s 채집 지점이 있어.",
        direction,math.floor(distance+.5),nearest.kind=="WOOD" and "나무" or "돌")
    else
      clue="지금은 가까운 채집 지점이 준비되지 않았어. 숲 밖 평원도 살펴봐."
    end
  end
  if threatName then
    clue=string.format("주의: %s 흔적이 약 %d걸음 거리야.  ",threatName,math.floor(threatDist+.5))..clue
  end
  if subject=="RUIN" then
    local index=model:GetAttribute("RuinsIndex")
    if typeof(index)=="number" and index>=1 and index<=3 then
      local mask=math.clamp(readNumber(player,"RuinsDiscovered",0),0,7)
      setNumber(player,"RuinsDiscovered",bit32.bor(mask,bit32.lshift(1,index-1)))
      clue="오래된 유적 발견 · 연구 일지에 석벽의 흔적과 위치를 기록했어."
    end
  end
  if subject=="WOODLAND" then
    -- [탐험 기록] 실제 조사 위치와 서버 시각으로만 발견을 저장한다. 재화·전투 보상 없음.
    local point=model:GetPivot().Position
    local sector=(point.X>=0 and 1 or 0)+(point.Z>=0 and 2 or 0)
    local mask=math.clamp(readNumber(player,"ExplorationGroves",0),0,15)
    setNumber(player,"ExplorationGroves",bit32.bor(mask,bit32.lshift(1,sector)))
    local period=gameWorld:GetAttribute("MeadowDayPhase")
    if period=="DAWN" then
      setNumber(player,"DawnTraceFound",1)
      recordMeadowQuest(player,"DAWN_TRACE")
      clue="새벽 연구 흔적 발견 · 낮은 안개 사이로 남은 마력의 흐름을 기록했어.  "..clue
    elseif period=="NIGHT" then
      setNumber(player,"NightTraceFound",1)
      clue="밤의 숲 연구 기록 · 푸른 마력이 모이는 숲 가장자리를 확인했어.  "..clue
    end
  end
  player:SetAttribute("MeadowSurvivalHint",clue)
  player:SetAttribute("MeadowSurvivalHintSerial",(player:GetAttribute("MeadowSurvivalHintSerial") or 0)+1)
  recordMeadowQuest(player,subject=="WOODLAND" and "WOODLAND" or subject=="RUIN" and "RUIN" or "INSPECT")
end

local function bindMeadowInspection(model,subject)
  local mesh=model and model:FindFirstChildWhichIsA("MeshPart",true)
  if not mesh then return end
  local prompt=Instance.new("ProximityPrompt")
  prompt.Name="MeadowSurvivalInspect"
  prompt.ActionText=(subject=="WOODLAND" or subject=="RUIN") and "주변 살피기" or "동물 관찰"
  prompt.ObjectText=subject=="RUIN" and "오래된 유적" or subject=="WOODLAND" and "숲 가장자리"
    or subject=="deer" and "사슴" or "토끼"
  prompt.HoldDuration=.45
  prompt.MaxActivationDistance=10
  prompt.RequiresLineOfSight=false
  prompt.Exclusivity=Enum.ProximityPromptExclusivity.OnePerButton
  prompt.Parent=mesh
  prompt.Triggered:Connect(function(player)
    inspectMeadowSurvival(player,model,subject)
  end)
end
-- [입장 로딩] 기본 지형과 입력·프로필 준비 뒤 실제 등록된 야생동물만 출현.
-- 오너가 거부한 옛 오류 사슴 ID는 어떤 경우에도 사용하지 않는다.
task.delay(4,function()
local wildlife={
  {kind="rabbit",position=Vector3.new(-39,3,62),height=1.8},
  {kind="rabbit",position=Vector3.new(41,3,67),height=1.8},
}
if typeof(NativeCreatureAssets.deer)=="number" and NativeCreatureAssets.deer>0
  and NativeCreatureAssets.deer~=78093904896855 then
  table.insert(wildlife,{kind="deer",position=Vector3.new(-68,3,-22),height=4.4})
  table.insert(wildlife,{kind="deer",position=Vector3.new(61,3,34),height=4.4})
end
for index,spec in ipairs(wildlife) do
  local model=worldAsset(spec.kind,spec.position,spec.height)
  if model then
    model:SetAttribute("MeadowWildlife",spec.kind)
    bindMeadowInspection(model,spec.kind)
    model:SetAttribute("NativeMobMotion","WALK")
    model:SetAttribute("NativeMobMotionStartedAt",workspace:GetServerTimeNow())
    table.insert(meadowWildlife,{model=model,origin=model:GetPivot().Position,phase=index*1.7,
      range=spec.kind=="rabbit" and 5 or 9,speed=spec.kind=="rabbit" and .48 or .2})
  end
end
end)

-- [초원 서식지] 외곽의 여러 숲 가장자리에 기존 CC0 나무와 초식 동물을 배치한다.
-- 전투·채집/보상 대상이 아닌 배경용이며, 시작 지점과 기존 스폰/자원은 그대로 보존한다.
-- 같은 나무 1개 에셋 캐시만 재사용하고 순차 로딩으로 처음 접속을 막지 않는다.
task.defer(function()
  -- 외곽 지형이 마지막에 채워지면 개울이 다시 매몰되므로 지형 완료 뒤 수로를 판다.
  while gameWorld:GetAttribute("MeadowOuterRegionReady")~=true do task.wait(.1) end
  local woodland={
    -- 플레이 시작 화면에서 볼 수 있는 네 방향 숲 가장자리. CC0 나무 원본만 재사용.
    {-48,-57,13},{-59,-52,15},{-68,-62,12},{-49,-72,14},{-61,-79,16},{-78,-53,13},
    {49,-57,14},{61,-51,12},{72,-64,16},{52,-76,13},{65,-83,15},{81,-54,12},
    {-48,58,15},{-61,51,13},{-72,66,16},{-51,78,12},{-64,85,14},{-82,56,15},
    {48,59,13},{61,53,16},{73,67,14},{51,79,15},{65,86,12},{83,57,14},
    {-79,-82,18},{-96,-78,14},{-110,-99,20},{-73,-108,16},{-90,-118,18},{-124,-83,13},
    {81,-77,19},{99,-86,15},{111,-107,20},{72,-107,15},{93,-120,18},{123,-83,14},
    {-78,87,18},{-95,78,15},{-112,102,19},{-72,111,15},{-92,124,18},{-126,84,14},
    {82,87,19},{97,76,14},{111,105,18},{75,113,16},{95,126,19},{127,87,13},
    {-274,-238,16},{-252,-202,14},{-218,-255,18},{-230,-180,13},
    {-308,-183,17},{-276,-141,12},{-208,-220,15},
    {232,-240,15},{276,-258,19},{307,-218,13},{222,-185,17},
    {255,-146,14},{305,-173,16},{212,-271,13},
    {-281,193,16},{-243,228,19},{-301,254,14},{-220,275,17},
    {-307,137,13},{-209,177,15},{-265,294,17},
    {241,194,15},{281,225,18},{308,276,14},{216,270,16},
    {301,153,13},{219,153,15},{278,296,17},
    -- 시작 초원에서 사방 숲으로 자연스럽게 이어지는 기존 CC0 나무 원본.
    {-92,-67,12},{-113,-89,14},{-126,-122,11},
    {98,-75,13},{121,-99,14},{143,-128,11},
    {-91,84,13},{-116,102,12},{-139,130,14},
    {97,81,12},{123,105,14},{146,135,11},
    -- [숲 군락] 승인된 원본 나무만 간격을 달리해 군락의 빈틈을 메운다.
    {-82,-69,14},{-105,-112,12},{-132,-97,17},{-90,-137,13},
    {87,-88,14},{104,-129,12},{137,-109,17},{91,-142,13},
    {-86,96,15},{-104,138,12},{-137,113,16},{-96,151,13},
    {87,98,15},{106,134,12},{139,117,16},{95,152,13},
    -- [숲 밀도] 시작 초원을 남겨 두고 외곽 기존 나무 군락만 여러 겹으로 보강한다.
    {-138,-151,15},{-162,-126,13},{-167,-176,16},{-185,-146,12},
    {136,-154,15},{161,-128,13},{168,-171,16},{187,-146,12},
    {-140,164,15},{-161,141,13},{-176,190,16},{-195,161,12},
    {143,161,15},{164,140,13},{174,187,16},{190,160,12},
    -- [깊은 숲] 4개의 기존 숲 군락에서만 원본 CC0 나무를 층층이 확장한다.
    -- 길과 3개 기존 탐사 유적은 열린 공간으로 남겨 두고 모델만 가볍게 재사용한다.
    {-154,-201,16},{-181,-196,13},{-206,-166,17},{-219,-124,14},
    {-187,-108,17},{-145,-218,13},{-235,-189,15},{-201,-232,17},
    {153,-202,16},{182,-192,13},{205,-166,17},{219,-125,14},
    {183,-111,17},{145,-221,13},{235,-188,15},{201,-232,17},
    {-157,202,16},{-181,194,13},{-207,167,17},{-219,126,14},
    {-189,109,17},{-143,221,13},{-238,190,15},{-203,234,17},
    {155,201,16},{181,193,13},{208,165,17},{221,125,14},
    {187,111,17},{145,223,13},{235,188,15},{205,231,17},
  }
  -- [숲 조성 / 원본 에셋] 멀리 분산된 나무를 8개 숲 군락으로 이어 화면 가장자리를 울창하게 채운다.
  -- 기존 수입 CC0 나무 원본만 복제한다. 시작지·공격 반경과 채집 나무 좌표는 그대로 둔다.
  -- 고정된 수식으로 매 입장 동일하게 배치하며 새 충돌·파츠·서버 전투 개체는 생성하지 않는다.
  local forestGroves={
    {-104,-109},{112,-109},{-113,112},{114,112},
    {-198,-98},{202,-94},{-194,197},{199,191},
  }
  local canopyCount=0
  for groveIndex,center in ipairs(forestGroves)do
    for index=1,12 do
      local angle=index*2.399963+groveIndex*.87
      local radius=12+(index%5)*7+math.sin(index*1.73+groveIndex)*3
      local x=center[1]+math.cos(angle)*radius
      local z=center[2]+math.sin(angle)*radius
      local distance=math.sqrt(x*x+z*z)
      if distance>84 and math.abs(x)<330 and math.abs(z)<330 then
        -- 원본 나무의 실제 메시를 11~19 스터드로 변화시켜 비슷한 크기의 반복 배열을 줄인다.
        woodland[#woodland+1]={x,z,11+((index*7+groveIndex*3)%9)}
        canopyCount+=1
      end
    end
  end
  -- [숲 바닥] 얇은 잎풀·낙엽빛 흙을 Terrain 표면에만 교차 배치한다.
  -- 나무를 기다리는 동안에도 초원과 구별되는 숲 바닥이 먼저 보인다.
  local forestFloorCount=0
  for groveIndex,center in ipairs(forestGroves)do
    for index=1,14 do
      local angle=index*2.399963+groveIndex*.67
      local radius=9+(index%7)*7
      local x=center[1]+math.cos(angle)*radius
      local z=center[2]+math.sin(angle)*radius
      local distance=math.sqrt(x*x+z*z)
      if distance>77 and math.abs(x)<333 and math.abs(z)<333 then
        local size=6+(index%4)*1.25
        meadowTerrain:FillBall(Vector3.new(x,2.15-size,z),size,
          index%6==0 and Enum.Material.Ground or Enum.Material.LeafyGrass)
        forestFloorCount+=1
        if index%7==0 then task.wait() end
      end
    end
  end
  -- [개울 생성 순서] 땅을 먼저 파고 물을 채운 뒤 나무를 안착시켜 나무 밑동이 뜨는 현상을 방지한다.
  -- [물가] 동쪽 외곽에만 굽은 개울을 만든다. 스폰/채집·웨이브 전투 영역 침범 금지.
  -- 나무와 바위 외에 별도의 Part, 조작용 다리 또는 임의 메시를 생성하지 않는다.
  local streamLength=0
  for step=-44,44 do
    local z=step*3.5
    local x=266+8*math.sin(z*.029)+2*math.cos(z*.073)
    -- [실제 보이는 물길] 바닥 표면을 먼저 파내고 그 아래에 물을 채운다.
    -- 지형 위에 물 공을 겹치거나 흙 아래에 물을 묻는 기존 문제 방지.
    local bank=Vector3.new(x,.25,z)
    meadowTerrain:FillBall(bank,6,Enum.Material.Air)
    meadowTerrain:FillBall(Vector3.new(x,-2.8,z),4.5,Enum.Material.Water)
    streamLength+=1
    if step%5==0 then task.wait(.03) end
  end
  gameWorld:SetAttribute("MeadowForestStreamSections",streamLength)
  local leafTones={
    meadowPalette.leaves,Color3.fromRGB(93,130,77),
    Color3.fromRGB(65,107,84),Color3.fromRGB(111,141,88),
  }
  local sceneryCount=0
  for index,spec in ipairs(woodland) do
    -- [마을 시야] 기존 16개 건물과 길에 울창한 숲 메시가 겹치지 않게 관상 나무만 외곽으로 남긴다.
    -- 채집 자원/퀘스트 조사 좌표는 이전대로 유지한다.
    if spec[2]<-61 and math.abs(spec[1])<275 then continue end
    local tree=worldAsset("tree",Vector3.new(spec[1],3,spec[2]),spec[3])
    if tree then
      tree.Name="Meadow_Woodland_"..index
      tree:SetAttribute("MeadowScenery",true)
      -- [수관 색 변화] 등록 CC0 텍스처·메시 그대로, 잎 표면만 숲의 녹색 음영으로 변주한다.
      -- 몸통과 나무 채집 모델의 판정·재질은 바꾸지 않는다.
      local leafTone=leafTones[(index%#leafTones)+1]
      for _,surface in ipairs(tree:GetDescendants())do
        if surface:IsA("MeshPart") and surface.Material==Enum.Material.Fabric then
          surface.Color=surface.Color:Lerp(leafTone,.33)
        end
      end
      -- [접근성] 기존 네 초원 입구의 조사 지점만 남겨 프롬프트가 숲 전체를 가리지 않는다.
      -- 네 사분면별 발견 비트·퀘스트·저장 의미는 그대로 사용한다.
      if index==6 or index==12 or index==18 or index==24 then
        bindMeadowInspection(tree,"WOODLAND")
      end
      tree:PivotTo(tree:GetPivot()*CFrame.Angles(0,math.rad((index*137)%360),0))
      sceneryCount+=1
    end
    -- 기존 CC0 메시는 재사용하며 한 번에 세 그루씩만 배치한다.
    if index%3==0 then task.wait(.06) end
  end
  -- 흙길·바위·잔디 연결은 Roblox Terrain으로만 구성한다. 장식용 Part 생성 금지.
  for _,patch in ipairs({
    {-177,-240,7,Enum.Material.Ground},{178,-252,8,Enum.Material.Ground},
    {-248,105,8,Enum.Material.Ground},{261,101,7,Enum.Material.Ground},
    {-218,310,6,Enum.Material.Rock},{213,309,5,Enum.Material.Rock},
    {-313,-110,5,Enum.Material.Rock},{316,-82,5,Enum.Material.Rock},
  }) do
    meadowTerrain:FillBall(Vector3.new(patch[1],-2,patch[2]),patch[3],patch[4])
    task.wait()
  end
  -- [1차 초원 디테일] 인공 파츠 없이 Roblox Terrain 표면에 자연스러운 흙길을 만든다.
  -- 기존 시작점·자원 좌표·전투 위치는 이동시키지 않는다. 신규 충돌 모델은 없다.
  local tracks={
    {from=Vector2.new(-51,-48),to=Vector2.new(-177,-176)},
    {from=Vector2.new(58,-49),to=Vector2.new(183,-177)},
    {from=Vector2.new(-54,62),to=Vector2.new(-184,188)},
    {from=Vector2.new(56,63),to=Vector2.new(192,196)},
    -- 새 숲에도 들어갈 수 있는 갈래길. 중앙 몬스터 스폰 반경은 그대로 남긴다.
    {from=Vector2.new(-132,-126),to=Vector2.new(-231,-93)},
    {from=Vector2.new(128,-128),to=Vector2.new(226,-91)},
    {from=Vector2.new(-126,139),to=Vector2.new(-220,211)},
    {from=Vector2.new(134,139),to=Vector2.new(219,215)},
  }
  for route,track in ipairs(tracks) do
    for step=1,34 do
      local t=step/34
      local p=track.from:Lerp(track.to,t)
      local bend=math.sin(t*math.pi*2+route)*3.4
      -- 폭 7~9의 불규칙한 길. 표면이 높아져 보행을 막지 않도록 기존 높이를 유지한다.
      local width=3.8+math.sin(t*12+route)*.45
      meadowTerrain:FillBall(Vector3.new(p.X+bend,2.1-width,p.Y-bend*.45),
        width,Enum.Material.Ground)
      if step%4==0 then task.wait(.025) end
    end
  end
  -- [오솔길 분기] 네 탐험 입구에서 깊은 숲으로 이어지는 실제 Terrain 길이다.
  -- 기존 시작·전투·채집 좌표는 건드리지 않고 지도에도 동일한 분기를 표시한다.
  local trailSpurs={
    {from=Vector2.new(-177,-176),to=Vector2.new(-228,-219)},
    {from=Vector2.new(183,-177),to=Vector2.new(231,-228)},
    {from=Vector2.new(-184,188),to=Vector2.new(-234,233)},
    {from=Vector2.new(192,196),to=Vector2.new(236,238)},
  }
  for index,track in ipairs(trailSpurs) do
    for step=1,12 do
      local t=step/12
      local p=track.from:Lerp(track.to,t)
      meadowTerrain:FillBall(Vector3.new(p.X,-1.7,p.Y),3.2,Enum.Material.Ground)
      task.wait(.02)
    end
  end
  gameWorld:SetAttribute("MeadowNativeTrails",#tracks+#trailSpurs)
  -- [이끼 낀 암석] 나무 군락 바깥에만 Terrain 암반을 겹쳐 자연스럽게 노출한다.
  local forestRockCount=0
  for _,rock in ipairs({
    {-155,-105,4.1},{-183,-137,3.6},{-124,-179,3.9},
    {157,-100,4.2},{178,-149,3.7},{129,-182,3.8},
    {-148,139,4.0},{-197,166,4.4},{-126,198,3.6},
    {156,156,4.3},{194,153,3.8},{135,203,3.7},
    {-279,80,4.6},{282,-43,4.3},{-264,-264,4.4},{289,281,4.2},
  }) do
    meadowTerrain:FillBall(Vector3.new(rock[1],2.1-rock[3]+1.1,rock[2]),
      rock[3],Enum.Material.Rock)
    forestRockCount+=1
    task.wait(.02)
  end
  gameWorld:SetAttribute("MeadowForestRockCount",forestRockCount)
  -- [덤불 같은 지표] 원본 지형 재질로 오솔길 옆 숲의 잎·잔디 밀도를 높인다.
  -- 캐릭터·자원·전투 스폰 주변은 피하고 새 파츠나 가짜 식생 모델은 만들지 않는다.
  for _,brush in ipairs({
    {-91,-101,3.8},{-115,-75,3.1},{-137,-116,3.4},{-75,-124,3.2},
    {88,-100,3.7},{125,-79,3.2},{145,-116,3.3},{76,-128,3.1},
    {-87,119,3.7},{-126,94,3.4},{-151,123,3.2},{-75,145,3.1},
    {90,117,3.8},{126,91,3.2},{151,120,3.4},{77,146,3.1},
    -- [숲 바닥] 기존 지형 재질을 이용해 네 깊은 숲의 빈 곳을 잔디로 잇는다.
    {-165,-194,3.9},{-212,-192,3.4},{-194,-134,3.7},{-236,-154,3.3},
    {166,-193,3.9},{212,-188,3.4},{194,-139,3.7},{234,-153,3.3},
    {-169,193,3.9},{-210,190,3.4},{-196,143,3.7},{-236,159,3.3},
    {169,192,3.9},{211,192,3.4},{195,142,3.7},{236,162,3.3},
  }) do
    meadowTerrain:FillBall(Vector3.new(brush[1],-1.3,brush[2]),brush[3],Enum.Material.LeafyGrass)
    task.wait()
  end
  -- [외곽 서식지] 새 원본 사슴이 승인·등록된 뒤에만 세 구역에 출현한다.
  local forestWildlife={
    {"rabbit",-205,265,1.8},{"rabbit",233,263,1.8},{"rabbit",-295,-205,1.8},
  }
  if typeof(NativeCreatureAssets.deer)=="number" and NativeCreatureAssets.deer>0
    and NativeCreatureAssets.deer~=78093904896855 then
    table.insert(forestWildlife,{"deer",-245,-191,4.4})
    table.insert(forestWildlife,{"deer",251,211,4.4})
    table.insert(forestWildlife,{"deer",202,-232,4.4})
  end
  for index,spec in ipairs(forestWildlife) do
    local animal=worldAsset(spec[1],Vector3.new(spec[2],3,spec[3]),spec[4])
    if animal then
      animal:SetAttribute("MeadowWildlife",spec[1])
      bindMeadowInspection(animal,spec[1])
      animal:SetAttribute("NativeMobMotion","WALK")
      animal:SetAttribute("NativeMobMotionStartedAt",workspace:GetServerTimeNow())
      table.insert(meadowWildlife,{
        model=animal,origin=animal:GetPivot().Position,phase=(index+5)*1.7,
        range=spec[1]=="rabbit" and 5 or 9,
        speed=spec[1]=="rabbit" and .48 or .2,
      })
    end
    task.wait(.14)
  end
  gameWorld:SetAttribute("MeadowWoodlandSceneryCount",sceneryCount)
  gameWorld:SetAttribute("MeadowForestCanopyCount",canopyCount)
  gameWorld:SetAttribute("MeadowForestFloorCount",forestFloorCount)
  gameWorld:SetAttribute("MeadowWoodlandScene","FOUR_GROVES_FOUR_REAL_TRAIL_SPURS")
  gameWorld:SetAttribute("MeadowForestSoftToyMaterial",sceneryCount>0 and "ORIGINAL_CC0_TREE_MESH_SMOOTH_MATTE" or "NO_NATIVE_MESH")
  gameWorld:SetAttribute("MeadowWoodlandReady",sceneryCount>0)
  -- 원본 CC0 파손 석벽 1종만 재사용한다. 가짜 파츠 구조물은 만들지 않는다.
  local ruinCount=0
  for index,site in ipairs({Vector3.new(-122,3,-147),Vector3.new(137,3,139),Vector3.new(-154,3,122)})do
    -- [유적 마당] 원본 석벽이 드러나도록 구역만 지형 흙길과 잔디로 꾸민다.
    meadowTerrain:FillBall(Vector3.new(site.X,-7.2,site.Z),9.2,Enum.Material.Ground)
    for _,offset in ipairs({Vector2.new(16,2),Vector2.new(-15,-3),Vector2.new(2,16),Vector2.new(-3,-15)}) do
      meadowTerrain:FillBall(Vector3.new(site.X+offset.X,-1.6,site.Z+offset.Y),3.4,Enum.Material.LeafyGrass)
    end
    local ruin=worldAsset("ruin",site,6)
    if ruin then
      ruin.Name="Meadow_Ruin_"..index;ruin:SetAttribute("RuinsIndex",index)
      bindMeadowInspection(ruin,"RUIN");ruinCount+=1
    end
    task.wait(.1)
  end
  gameWorld:SetAttribute("MeadowRuinCount",ruinCount)
  -- [건축 흔적] 승인된 CC0 석벽 메시만 재사용해 세 탐사 유적의 외곽을 보강한다.
  -- 기존 1~3번 조사 대상과 저장 비트마스크, 퀘스트 진행은 그대로 유지한다.
  for index,site in ipairs({Vector3.new(-122,3,-147),Vector3.new(137,3,139),Vector3.new(-154,3,122)})do
    for section,offset in ipairs({
      Vector3.new(9,0,8),Vector3.new(-9,0,7),
      Vector3.new(9,0,-8),Vector3.new(-9,0,-8),
    })do
      local wall=worldAsset("ruin",site+offset,4.8)
      if wall then
        wall.Name="Meadow_Ruin_Outer_"..index.."_"..section
        wall:SetAttribute("MeadowScenery",true)
        wall:PivotTo(wall:GetPivot()*CFrame.Angles(0,math.rad(
          section==1 and 90 or section==2 and -80 or section==3 and 165 or -160),0))
      end
      task.wait(.12)
    end
  end
  -- [석벽 흔적] 원본 CC0 석벽 조각만 주변 오솔길 가장자리에 배치한다.
  -- 별도 RuinsIndex/관찰 이벤트를 만들지 않아 기존 3개 유적 발견 및 저장 비트는 불변.
  local forestFragmentCount=0
  for index,site in ipairs({
    Vector3.new(-164,3,-108),Vector3.new(157,3,-129),
    Vector3.new(-176,3,180),Vector3.new(169,3,174),
  })do
    local fragment=worldAsset("ruin",site,4.7)
    if fragment then
      fragment.Name="Meadow_ForestStoneFragment_"..index
      fragment:SetAttribute("MeadowScenery",true)
      fragment:PivotTo(fragment:GetPivot()*CFrame.Angles(0,math.rad(index*77),0))
      forestFragmentCount+=1
    end
    task.wait(.06)
  end
  gameWorld:SetAttribute("MeadowForestStoneFragmentCount",forestFragmentCount)
  if sceneryCount==0 then warn("마력숲 초원 나무 로딩 0개: 등록 CC0 자산 및 Place 사용 권한 확인 필요") end
end)

-- [지역 몬스터] 서식지의 위치와 위험도를 서버가 소유한다.
local function spawnEnemy(site, siteIndex)
  if #enemies >= MAX_ENEMIES then return false end
  -- [늑대 안전 스폰] 추가된 지점이나 오래된 설정도 마을 구역이면 거부한다.
  if site.id=="wolf" and meadowVillageContains(site.position) then return false end
  local isBoss=site.id=="golem"
  local isAlpha=site.alpha==true -- 우두머리 늑대는 돌 골렘과 별도 보스 패턴을 가진다.
  local location=site.position
  local partId=site.id
  local modelId=partId=="ghost" and NativeCreatureAssets.skeleton
    or (table.find(studioCreatureAtoms,site.atom) and NativeCreatureAssets[partId] or nil)
  local nativeScale=site.height
  if not nativeScale or (partId~="bandit" and (typeof(modelId)~="number" or modelId<1)) then
    warn("마력숲 승인 생물 자산 선택 누락: "..partId)
    return false
  end
  local ok, model = pcall(function()
    if partId=="bandit" then
      -- Roblox 정식 R15 전신 모델을 적으로 재사용한다. 가짜 몸체 파츠를 만들지 않는다.
      local desc=Instance.new("HumanoidDescription")
      desc.HeadColor=Color3.fromRGB(174,127,97)
      desc.LeftArmColor=Color3.fromRGB(174,127,97)
      desc.RightArmColor=Color3.fromRGB(174,127,97)
      desc.TorsoColor=Color3.fromRGB(92,65,55)
      desc.LeftLegColor=Color3.fromRGB(63,62,67)
      desc.RightLegColor=Color3.fromRGB(63,62,67)
      local native=Players:CreateHumanoidModelFromDescriptionAsync(desc,Enum.HumanoidRigType.R15)
      desc:Destroy()
      for _,part in ipairs(native:GetDescendants()) do
        if part:IsA("BasePart") then
          part.Anchored=true;part.CanCollide=false;part.CanTouch=false;part.CanQuery=false
        end
      end
      if not native:FindFirstChild("HumanoidRootPart") then
        native:Destroy();error("VILLAGE_BANDIT_R15_ROOT_REQUIRED")
      end
      for _,joint in ipairs(native:GetDescendants()) do
        if joint:IsA("Motor6D") and joint.Part1 then
          joint.Part1.Anchored=false;joint.Part1.Massless=true
        end
      end
      local root=native:FindFirstChild("HumanoidRootPart")
      root.Anchored=true
      return native
    end
    local template=nativeCreatureTemplates[modelId]
    if not template then
      template=AssetService:LoadAssetAsync(modelId)
      if not template:IsA("Model") or not template:FindFirstChildWhichIsA("MeshPart",true) then
        template:Destroy()
        error("FANTASY_NATIVE_MESH_REQUIRED")
      end
      for _,item in ipairs(template:GetDescendants()) do
        if item:IsA("LuaSourceContainer") or item:IsA("RemoteEvent") or item:IsA("RemoteFunction") or item:IsA("Tool") then
          item:Destroy()
        elseif item:IsA("BasePart") then
          item.Anchored=true;item.CanCollide=false;item.CanTouch=false;item.CanQuery=false
        end
      end
      -- Keep the real source rig root anchored for server-pivot movement,
      -- but let genuine Motor6D child parts articulate. Bone-skinned
      -- single meshes remain anchored and animate through source Bones.
      for _,joint in ipairs(template:GetDescendants()) do
        if joint:IsA("Motor6D") and joint.Part0 and joint.Part1 then
          joint.Part1.Anchored=false
          joint.Part1.Massless=true
        end
      end
      template.Parent=nil
      nativeCreatureTemplates[modelId]=template
    end
    return template:Clone()
  end)
  if not ok or not model then
    warn("마력숲 원본 생물 모델 적용 실패: "..partId)
    return false
  end
  if not model:IsA("Model") then return nil end
  -- 몬스터도 비가시 루트 크기를 빼고 원본 메시의 실제 세로 크기를 사용한다.
  local actualMin,actualMax=math.huge,-math.huge
  for _,mesh in ipairs(model:GetDescendants()) do
    if mesh:IsA("MeshPart") and mesh.Transparency<.98 then
      local cf=mesh.CFrame
      local halfY=(math.abs(cf.RightVector.Y)*mesh.Size.X
        +math.abs(cf.UpVector.Y)*mesh.Size.Y
        +math.abs(cf.LookVector.Y)*mesh.Size.Z)*.5
      actualMin=math.min(actualMin,cf.Position.Y-halfY)
      actualMax=math.max(actualMax,cf.Position.Y+halfY)
    end
  end
  local nativeHeight=actualMax-actualMin
  if nativeHeight<=.01 or nativeHeight==math.huge then model:Destroy();return false end
  model:ScaleTo(model:GetScale()*nativeScale/nativeHeight)
  -- [원본 몬스터 관절] 분리된 실제 MeshPart 사지에만 Motor6D 연결.
  -- 통짜/스킨 가중치 없는 메시에는 가짜 다리나 Bone을 추가하지 않는다.
  local existingRig=false
  for _,part in ipairs(model:GetDescendants()) do
    if part:IsA("Bone") or part:IsA("Motor6D") or part:IsA("AnimationConstraint") then
      existingRig=true;break
    end
  end
  if not existingRig then
    local meshes={}
    local body=nil
    for _,part in ipairs(model:GetDescendants()) do
      if part:IsA("MeshPart") then
        table.insert(meshes,part)
        local name=part.Name:lower()
        if (name:find("body") or name:find("torso") or name:find("chest"))
          and (not body or part.Size.Magnitude>body.Size.Magnitude) then body=part end
      end
    end
    if not body then
      for _,part in ipairs(meshes) do
        if not body or part.Size.Magnitude>body.Size.Magnitude then body=part end
      end
    end
    local limbs={}
    if body then
      local cf=model:GetPivot()
      for _,part in ipairs(meshes) do
        if part~=body then
          local name=part.Name:lower()
          local key=name:gsub("[^%w]","")
          local relative=cf:PointToObjectSpace(part.Position)
          local side=(key:find("left",1,true) or key:match("^l(eg|arm|wing)")) and "L"
            or (key:find("right",1,true) or key:match("^r(eg|arm|wing)")) and "R"
            or (math.abs(relative.X)>.15 and (relative.X<0 and "L" or "R")) or nil
          local leg=key:find("leg",1,true) or key:find("paw",1,true)
            or key:find("hip",1,true) or key:find("thigh",1,true)
            or key:find("shin",1,true) or key:find("foot",1,true)
          local wing=key:find("wing",1,true)
          local arm=key:find("arm",1,true) or key:find("hand",1,true)
          if side and (leg or wing or (isBoss and arm)) then
            local channel
            if wing then channel="Wing"..side
            elseif isBoss then
              channel=(key:find("shin",1,true) or key:find("knee",1,true)
                or key:find("foot",1,true)) and "Shin"..side or (arm and "UpperArm"..side or "Thigh"..side)
            else
              local front=key:find("front",1,true) or key:find("fore",1,true)
              local rear=key:find("rear",1,true) or key:find("hind",1,true)
              local pair=front and "F" or rear and "B" or relative.Z<0 and "F" or "B"
              channel=pair..side..((key:find("shin",1,true) or key:find("knee",1,true)) and "Knee"
                or (key:find("foot",1,true) or key:find("paw",1,true)) and "Ankle" or "Hip")
            end
            if channel then table.insert(limbs,{part=part,channel=channel}) end
          end
        end
      end
      if #limbs>=2 then
        body.Anchored=true
        for _,limb in ipairs(limbs) do
          local part=limb.part
          local free=true
          for _,joint in ipairs(part:GetChildren()) do
            if joint:IsA("WeldConstraint") or joint:IsA("Weld") or joint:IsA("Motor6D") then
              free=false;break
            end
          end
          if free then
            local joint=Instance.new("Motor6D")
            joint.Name=limb.channel
            joint.Part0=body
            joint.Part1=part
            joint.C0=body.CFrame:ToObjectSpace(part.CFrame)
            joint.C1=CFrame.new()
            joint.Parent=body
            part.Anchored=false
            part.Massless=true
          end
        end
      end
    end
  end
  model:PivotTo(CFrame.new(location))
  -- [매몰 수정] CC0 실제 메시 하단을 서버 Terrain에 정렬. 보상/공격 범위는 불변.
  local bottom=math.huge
  for _,mesh in ipairs(model:GetDescendants()) do
    if mesh:IsA("MeshPart") and mesh.Transparency<.98 then
      local cf=mesh.CFrame
      local halfY=(math.abs(cf.RightVector.Y)*mesh.Size.X
        +math.abs(cf.UpVector.Y)*mesh.Size.Y
        +math.abs(cf.LookVector.Y)*mesh.Size.Z)*.5
      bottom=math.min(bottom,cf.Position.Y-halfY)
    end
  end
  if bottom==math.huge then model:Destroy();warn("마력숲 몬스터 보이는 메시 없음: "..partId);return false end
  local groundRay=RaycastParams.new()
  groundRay.FilterType=Enum.RaycastFilterType.Include
  groundRay.FilterDescendantsInstances={meadowTerrain}
  local groundHit=workspace:Raycast(location+Vector3.new(0,90,0),
    Vector3.new(0,-180,0),groundRay)
  if not groundHit then model:Destroy();warn("마력숲 몬스터 지면 미확인: "..partId);return false end
  local meshOffset=groundHit.Position.Y+.12-bottom
  model:PivotTo(model:GetPivot()+Vector3.new(0,meshOffset,0))
  -- [늑대 실제 전방] 확인된 원본 사지 Bone으로 제작 메시의 앞축을 정렬한다.
  if partId=="wolf" then
    local front,rear={},{}
    for _,bone in ipairs(model:GetDescendants()) do
      if bone:IsA("Bone") then
        local key=bone.Name:lower():gsub("[^%w]","")
        if key=="bone014" or key=="bone017" then front[#front+1]=bone.WorldPosition end
        if key=="bone008" or key=="bone011" then rear[#rear+1]=bone.WorldPosition end
      end
    end
    if #front==2 and #rear==2 then
      local axis=model:GetPivot():VectorToObjectSpace(
        Vector3.new((front[1].X+front[2].X-rear[1].X-rear[2].X)*.5,0,
          (front[1].Z+front[2].Z-rear[1].Z-rear[2].Z)*.5))
      if axis.Magnitude>.01 then
        model:SetAttribute("NativeMobFacingYaw",math.atan2(axis.X,-axis.Z))
      end
    end
  end
  model.ModelStreamingMode=Enum.ModelStreamingMode.Atomic
  model.Parent=gameWorld
  local hitPoints = isAlpha and 220 or ((isBoss and 310 or 45) + site.tier*(isBoss and 60 or 13))
  local meadowNames={wolf=isAlpha and "우두머리 늑대" or "초원 늑대",
    bat="황혼 박쥐",ghost="우물 원혼",bandit="수레 습격 도적"}
  model.Name=isBoss and "초원 수문장 · 돌 골렘" or (meadowNames[partId] or partId)
  -- [몬스터 공통 재질] 늑대·박쥐·골렘에 기존 토이 플라스틱을 적용한다.
  -- 기존 Pebble/바둑판 원본 몸통 텍스처를 제거하되, 원본 메시·뼈·사지·물리 및 종별 색상은 보존.
  -- 원본 템플릿은 수정하지 않고 스폰 복제본만 바꾼다. 새 장식 파츠를 만들지 않는다.
  -- 별도 미세 돌기 PBR 노멀맵은 Roblox에 업로드·권한 확인된 승인 자산이 있어야 실제 적용 가능.
  local bodyTint=isBoss and meadowPalette.golem or isAlpha and Color3.fromRGB(78,87,94)
    or meadowPalette[partId] or meadowPalette.wolf
  for _,surface in ipairs(model:GetDescendants()) do
    if surface:IsA("MeshPart") then
      local partName=surface.Name:lower()
      local wing=(partId=="bee" or partId=="bat") and partName:find("wing",1,true)
      local smoothDetail=wing or partName:find("eye",1,true)
        or partName:find("pupil",1,true) or partName:find("tooth",1,true)
        or partName:find("teeth",1,true) or partName:find("claw",1,true)
        or partName:find("horn",1,true) or partName:find("crystal",1,true)
      if wing then
        -- 투명 날개와 비행 몬스터의 읽기 쉬운 실루엣은 유지한다.
        surface.Material=Enum.Material.Glass
        surface.Color=Color3.fromRGB(190,228,235)
      elseif smoothDetail then
        surface.Material=Enum.Material.SmoothPlastic
      else
        -- 구형 Pebble 돌무늬/체크 무늬는 원본 메시의 본체에서 제거한다.
        -- 원본 모델 템플릿은 유지하므로 기존 에셋을 파괴하거나 덮어쓰지 않는다.
        local appearance=surface:FindFirstChildOfClass("SurfaceAppearance")
        if appearance then appearance:Destroy() end
        if surface.TextureID~="" then surface.TextureID="" end
        surface.MaterialVariant=""
        surface.Material=Enum.Material.Plastic
        surface.Color=surface.Color:Lerp(bodyTint,.78)
      end
      if partId=="ghost" then
        -- 등록된 원본 해골 메시를 반투명 원혼으로 연출한다. 별도 형상은 만들지 않는다.
        surface.Material=Enum.Material.Neon
        surface.Color=Color3.fromRGB(137,212,237)
        surface.Transparency=math.max(surface.Transparency,.38)
      end
      surface.Reflectance=0
    end
  end
  model:SetAttribute("MeadowToyMaterial","PLASTIC_UNTIL_APPROVED_STUD_NORMAL_MAP")
  model:SetAttribute("Species",partId)
  local firstAttack={wolf="WOLF_BITE",bee="BEE_SWEEP",bat="BAT_DIVE",
    ghost="GHOST_WAIL",bandit="BANDIT_SLASH"}
  model:SetAttribute("AttackPattern",isBoss and "GOLEM_SLAM" or firstAttack[partId])
  model:SetAttribute("NativeMobMotion","IDLE")
  model:SetAttribute("NativeMobMotionStartedAt",workspace:GetServerTimeNow())
  local hasOriginalMotor=false
  for _,descendant in ipairs(model:GetDescendants()) do
    if descendant:IsA("Bone") or descendant:IsA("AnimationConstraint")
      or (descendant:IsA("Motor6D") and descendant.Part0 and descendant.Part1) then
      hasOriginalMotor=true
      break
    end
  end
  -- 정적 메시에는 실제 걷기 관절이 없음을 표시한다. 판정이나 스폰에는 영향 없다.
  model:SetAttribute("NativeMobRig",hasOriginalMotor and "ORIGINAL_JOINT_RIG" or "SOURCE_MESH_PIVOT")
  local secondarySkill={wolf="LEAP_BITE",bee="DIVE_STING",bat="NIGHT_DIVE",
    ghost="PHANTOM_LUNGE",bandit="BANDIT_FEINT"}
  model:SetAttribute("NativeMobSkill",isBoss and "GROUND_SHOCKWAVE" or secondarySkill[partId])
  model:SetAttribute("EnemyHealth",hitPoints)
  model:SetAttribute("EnemyMaxHealth",hitPoints)
  model:SetAttribute("OpenWorldRegionTier",site.tier)
  if site.questIndex then model:SetAttribute("VillageQuestEnemy",site.questIndex) end
  model:SetAttribute("Boss",isBoss or isAlpha)
  if isBoss or isAlpha then model:SetAttribute("BossPhase",1) end
  -- 기존 공용 생물 모델 위에만 공격 예고를 표시한다. 판정용 가짜 파츠를 만들지 않는다.
  local attackTelegraph = Instance.new("Highlight")
  attackTelegraph.Name = "AttackAnticipation"
  attackTelegraph.Adornee = model
  attackTelegraph.FillColor = (isBoss or isAlpha) and Color3.fromRGB(238,65,65) or Color3.fromRGB(255,185,89)
  attackTelegraph.FillTransparency = .72
  attackTelegraph.OutlineTransparency = .2
  attackTelegraph.Enabled = false
  attackTelegraph.Parent = model
  model:SetAttribute("AttackState", "IDLE")
  -- [도적 애니메이션] 공식 R15 Animator의 걷기/대기 트랙. 서버 전투 판정과 분리한다.
  local banditIdle,banditWalk=nil,nil
  if partId=="bandit" then
    local humanoid=model:FindFirstChildOfClass("Humanoid")
    if humanoid then
      humanoid.DisplayDistanceType=Enum.HumanoidDisplayDistanceType.None
      humanoid.HealthDisplayType=Enum.HumanoidHealthDisplayType.AlwaysOff
      local animator=humanoid:FindFirstChildOfClass("Animator") or Instance.new("Animator")
      animator.Parent=humanoid
      for name,assetId in pairs({idle=507766388,walk=507777826}) do
        local anim=Instance.new("Animation")
        anim.AnimationId="rbxassetid://"..assetId
        local okTrack,track=pcall(function()return animator:LoadAnimation(anim) end)
        anim:Destroy()
        if okTrack and track then
          track.Looped=true
          track.Priority=Enum.AnimationPriority.Movement
          if name=="idle" then banditIdle=track else banditWalk=track end
        end
      end
      if banditIdle then banditIdle:Play(.2) end
    end
  end
  table.insert(enemies,{
    model=model,HP=hitPoints,maxHP=hitPoints,
    isBoss=isBoss,isAlpha=isAlpha,kind=partId,questIndex=site.questIndex,
    banditIdle=banditIdle,banditWalk=banditWalk,
    damage=isAlpha and 13 or ((isBoss and 20 or 6)+math.floor(site.tier/2)),
    speed=isAlpha and 8.4 or (isBoss and 4.8 or 7.5),position=location,spawnPosition=location,siteIndex=siteIndex,
    visibleGroundOffset=meshOffset,spawnGroundY=groundHit.Position.Y,
    terrainGroundOffset=0,nextGroundSample=0,
    lastAttack=0,attackSerial=0,attackPattern=nil,windupUntil=nil,
    windupTargetUserId=nil,telegraph=attackTelegraph,attackState="IDLE",
    baseHeight=location.Y,visualFacing=Vector3.new(0,0,-1),
    visualPosition=location,visualFacingSmooth=Vector3.new(0,0,-1),
    focusUserId=nil
  })
  if isBoss or isAlpha then
    remote:FireAllClients("MEADOW_BOSS_INTRO",{model=model,name=model.Name,site=siteIndex})
  end
  return true
end

-- [오픈월드 서식지 갱신] 가까운 구역의 몬스터만 생성하고 처치 후 같은 자리에서 다시 출현한다.
-- 진행 단계나 웨이브 타이머 없이 위치가 유일한 출현 기준이다.
local function refreshMeadowEncounters(now)
  if #enemies>=MAX_ENEMIES then return end
  for index,site in ipairs(meadowEncounterSites) do
    if not site.occupied and not site.loading and now>=(site.respawnAt or 0) then
      local nearby=false
      for _,player in ipairs(Players:GetPlayers()) do
        local character=player.Character
        local root=character and character:FindFirstChild("HumanoidRootPart")
        local humanoid=character and character:FindFirstChildOfClass("Humanoid")
        if player:GetAttribute("ProfileReady")==true and root and humanoid and humanoid.Health>0
          and (root.Position-site.position).Magnitude<165 then nearby=true;break end
      end
      if nearby then
        site.loading=true
        task.defer(function()
          local ok,spawned=pcall(spawnEnemy,site,index)
          site.loading=false
          site.occupied=ok and spawned==true
          if not site.occupied then
            site.respawnAt=os.clock()+25
            if not ok then warn("MEADOW_REGION_SPAWN_FAILED: "..tostring(spawned)) end
          end
          broadcastSurvivalState(nil)
        end)
      end
    end
  end
end

local function nearestEnemy(rootPart, range)
  local selected,best=nil,range or 21
  for _,enemy in ipairs(enemies) do
    if enemy.HP>0 and enemy.model.Parent then
      local offset=enemy.position-rootPart.Position
      local distance=offset.Magnitude
      if distance<best and (distance<6 or rootPart.CFrame.LookVector:Dot(offset.Unit)>.05) then
        selected,best=enemy,distance
      end
    end
  end
  return selected
end

-- All original game rewards, contact confirmation and DataStore data are
-- preserved in one authoritative combat outcome path.
local meadowSkillCooldown={}
local meadowFocusUntil={}
local meadowDefense={}
local function liveMeadowCharacter(player)
  local character=player.Character
  local human=character and character:FindFirstChildOfClass("Humanoid")
  local rootPart=character and character:FindFirstChild("HumanoidRootPart")
  if not human or human.Health<=0 or not rootPart then return nil,nil,nil end
  return character,human,rootPart
end
local function applyMeadowDamage(player,target,damage)
  if not target or target.HP<=0 or not target.model.Parent then return false end
  if (meadowFocusUntil[player] or 0)>os.clock() then damage=math.floor(damage*1.25) end
  player:SetAttribute("ApprovedActionTarget",target.position)
  target.HP=math.max(0,target.HP-damage)
  target.model:SetAttribute("EnemyHealth",target.HP)
  if (target.isBoss or target.isAlpha) and target.HP>0 and target.HP<=target.maxHP*.5 then
    target.model:SetAttribute("BossPhase",2)
  end
  -- Server-authorized impact location is sent only after a real target took damage.
  -- No miss, empty-air swing or client-generated contact may emit this effect.
  remote:FireClient(player, "MEADOW_IMPACT", {
    position=target.position,
    species=target.kind,
    boss=target.isBoss or target.isAlpha,
    finisher=target.HP<=0,
    damage=damage,
  })
  setNumber(player,"Combo",readNumber(player,"Combo",0)+1)
  setNumber(player,"Score",readNumber(player,"Score",0)+damage)
  player:SetAttribute("LastApprovedScope","combat-impact")
  if target.HP<=0 then
    target.model:SetAttribute("NativeMobMotion","DEATH")
    target.model:SetAttribute("AttackState","DEATH")
    remote:FireAllClients("MEADOW_MOB_DEATH",{
      species=target.kind,
      pattern=target.model:GetAttribute("AttackPattern"),
      position=target.position,boss=target.isBoss or target.isAlpha,
    })
    local fallenModel=target.model
    -- Only the original mesh is rotated/faded. No surrogate corpse or Part.
    fallenModel:PivotTo(fallenModel:GetPivot()*CFrame.Angles(0,0,.42))
    task.delay(.35,function()
      if fallenModel.Parent then fallenModel:Destroy() end
    end)
    for i=#enemies,1,-1 do if enemies[i]==target then table.remove(enemies,i);break end end
    awardProgress(player,target.isBoss and 75 or target.isAlpha and 35 or 12,
      target.isBoss and 45 or target.isAlpha and 18 or 5)
    -- [사냥 숙련도] 실제 서버에서 처치가 확정된 늑대·박쥐만 기록한다.
    -- 살아 있는 사슴·토끼 관찰은 사냥으로 인정하지 않으며 도감·드랍 변경 없음.
    if target.kind=="wolf" or target.kind=="bat" then
      setNumber(player,"HuntingProficiency",readNumber(player,"HuntingProficiency",0)+1)
    end
    recordMeadowQuest(player,"KILL")
    -- [마을 전투] 실제 서버 처치만 완료로 기록한다. 기존 저장 숫자의 6번 비트를 재사용.
    if target.questIndex then
      local activeIndex,contract=villageCurrentContract(player)
      if activeIndex==target.questIndex and contract
        and readNumber(player,"VillageContractPhase",0)==1 then
        local mask=bit32.bor(readNumber(player,"VillageContractEvidence",0),64)
        setNumber(player,"VillageContractEvidence",mask)
        local required=bit32.bor(bit32.lshift(1,contract.Witness-1),8,64)
        if bit32.band(mask,required)==required then setNumber(player,"VillageContractPhase",2) end
        villageDialogue(player,"전투 완료 · "..contract.Name,
          contract.EnemyName.." 처치 성공. 남은 조사 후 촌장에게 돌아가 결말을 선택해.")
      end
    end
    setNumber(player,"EnemyHealth",0)
    if target.isBoss or target.isAlpha then
      setNumber(player,"Bosses",readNumber(player,"Bosses",0)+1)
      -- [골렘 삭제 후 연구 퀘스트] 마을 밖 우두머리 늑대 처치로 6단계를 이어간다.
      -- 기존 QuestStage/QuestProgress/보상 수치는 유지한다.
      if target.isAlpha then recordMeadowQuest(player,"BOSS_KILL") end
    end
    if Config.CompetitiveRequired then
      setNumber(player,"RoundScore",readNumber(player,"RoundScore",0)+((target.isBoss or target.isAlpha) and 5 or 1))
    end
    -- [지역 리스폰] 해당 위치만 재출현 예약. 일괄 웨이브 보상은 없다.
    if target.siteIndex then
      local site=meadowEncounterSites[target.siteIndex]
      if site then site.occupied=false;site.respawnAt=os.clock()+45 end
    end
  else
    setNumber(player,"EnemyHealth",target.HP)
  end
  broadcastSurvivalState(player)
  return true
end

local function attackEnemy(player)
  local character=player.Character
  local human=character and character:FindFirstChildOfClass("Humanoid")
  local rootPart=character and character:FindFirstChild("HumanoidRootPart")
  if not human or human.Health<=0 or not rootPart then return false end
  local now=os.clock()
  if now<(attackCooldown[player] or 0) then return false end
  attackCooldown[player]=now+.42
  local target=nearestEnemy(rootPart,25)
  -- 유효한 공격 입력은 허공에서도 동작한다. 명중·피해·보상은 분리한다.
  if not target then
    player:SetAttribute("ApprovedActionTarget",rootPart.Position)
    return true,false
  end
  local weaponTier=readNumber(player,"WeaponTier",0)
  local damage=math.floor(16+meadowProficiencyPower(player)+weaponTier*8)
  return applyMeadowDamage(player,target,damage),true
end

local function unarmedSkillAttack(player,staminaCost)
  -- 실제로 승인된 맨손 입력에만 스테미너를 차감한다.
  local character=player.Character
  if not character or character:FindFirstChildOfClass("Tool") then return false end
  local cost=staminaCost or 0
  local stamina=player:GetAttribute("MeadowStamina") or 0
  if stamina<cost then return false end
  local accepted,hit=attackEnemy(player)
  if accepted and cost>0 then player:SetAttribute("MeadowStamina",math.max(0,stamina-cost)) end
  return accepted,hit
end

local function gatherNearestResource(player)
  local character=player.Character
  local rootPart=character and character:FindFirstChild("HumanoidRootPart")
  if not rootPart then return false end
  local nearest,distance=nil,14
  for _,node in ipairs(resourceNodes) do
    if (node.kind=="STONE" or (node.model and node.model.Parent)) and os.clock()>=node.readyAt then
      local d=(rootPart.Position-(node.model and node.model:GetPivot().Position or node.position)).Magnitude
      if d<distance then nearest,distance=node,d end
    end
  end
  return nearest and gatherResource(player,nearest) or false
end

local function upgradeEquipment(player)
  local tier=readNumber(player,"WeaponTier",0)
  if tier>=10 then return false end
  local wood=readNumber(player,"Wood",0)
  local stone=readNumber(player,"Stone",0)
  local cost=2+tier
  if wood<cost or stone<cost then return false end
  setNumber(player,"Wood",wood-cost)
  setNumber(player,"Stone",stone-cost)
  setNumber(player,"WeaponTier",tier+1)
  -- [제작 숙련도] 실제 자원을 소모한 기존 장비 강화 성공만 기록한다.
  setNumber(player,"CraftingProficiency",readNumber(player,"CraftingProficiency",0)+1)
  player:SetAttribute("LastApprovedScope","resource-to-equipment-upgrade")
  broadcastSurvivalState(player)
  return true
end

local function startSurvivalRun(player)
  if player:GetAttribute("RunActive")==true then return false end
  player:SetAttribute("RunActive",true)
  player:SetAttribute("CurrentWave",0)
  player:SetAttribute("LastApprovedScope","open-world-exploration-started")
  broadcastSurvivalState(player)
  return true
end

local function setEnemyAttackState(enemy, state)
  if enemy.attackState==state then return end
  enemy.attackState=state
  enemy.attackStateStartedAt=os.clock()
  enemy.model:SetAttribute("NativeMobMotionDuration",state=="ANTICIPATION" and math.max(.12,(enemy.windupUntil or os.clock()+.68)-os.clock()) or .46)
  enemy.model:SetAttribute("AttackState",state)
  enemy.model:SetAttribute("NativeMobMotionStartedAt",workspace:GetServerTimeNow())
  -- 서버 전투 상태만 시각 모션으로 전달한다. 적중·피해·쿨다운은 변경하지 않는다.
  local motion=state=="CHASE" and "RUN" or
    (state=="RETURN_TO_SPAWN" or state=="PATROL") and "WALK" or
    (state=="ANTICIPATION" or state=="ATTACK" or state=="RECOVERY" or state=="DEATH") and state or
    (state=="STUNNED" or state=="HIT") and "HIT" or "IDLE"
  enemy.model:SetAttribute("NativeMobMotion",motion)
  enemy.telegraph.Enabled=state=="ANTICIPATION"
end

local function cancelEnemyWindup(enemy)
  enemy.windupUntil=nil
  enemy.windupTargetUserId=nil
  enemy.comboHit=nil
  setEnemyAttackState(enemy,"RECOVERY")
end

-- The CC0 wolves, bees and golems are *original* 3D meshes. Some have no
-- Motor6Ds; never invent limbs or geometry. Visible native model locomotion
-- and attack anticipation are driven on the original mesh's Model pivot.
-- [몹 원본 액션] 관절 없는 소스 메시도 기존 서버 Pivot 동작을 종별 공격에 맞게 연출한다.
-- 서버 타격 위치·스폰 위치·속도·공격 빈도는 바꾸지 않는다.
local function animateMeadowOriginalMob(enemy,now)
  if not enemy.model.Parent then return end
  local kind=enemy.kind
  local phase=now*((kind=="bee" or kind=="bat") and 9 or
    kind=="wolf" and 7 or kind=="boar" and 6 or 3)
    +enemy.spawnPosition.X*.11
  local inMotion=enemy.attackState=="CHASE" or enemy.attackState=="RETURN_TO_SPAWN" or enemy.attackState=="PATROL"
  local attacking=enemy.attackState=="ANTICIPATION"
  local stunned=enemy.attackState=="STUNNED"
  local recoil=enemy.attackState=="RECOVERY"
    and math.exp(-math.max(0,now-enemy.lastAttack)*7) or 0
  local aerial=kind=="bee" or kind=="bat" or kind=="ghost"
  -- 네발 몹은 가짜 몸체 점프 대신 실제 다리 관절로 접지를 표현한다.
  local movingHeight=aerial and (1.35+math.sin(phase)*.42)
    or (inMotion and math.abs(math.sin(phase))*(kind=="golem" and .14 or .035) or 0)
  -- [황혼 박쥐 비행] 원본 메시만 공중에서 부드럽게 부상→급강하→상승시킨다.
  -- 실제 서버 공격 위치·사거리·피해·속도·지면 충돌 권한은 변경하지 않는다.
  local batWindup=0
  local batDive=0
  if kind=="bat" then
    local elapsed=math.max(0,now-(enemy.attackStateStartedAt or now))
    if enemy.attackState=="ANTICIPATION" then
      local duration=math.max(.12,enemy.model:GetAttribute("NativeMobMotionDuration") or .32)
      batWindup=math.clamp(elapsed/duration,0,1)
      batWindup=batWindup*batWindup*(3-2*batWindup)
    elseif enemy.attackState=="ATTACK" then
      batDive=math.sin(math.pi*math.clamp(elapsed/.46,0,1))
    end
    movingHeight=1.4+math.sin(phase)*.16+batWindup*.34-batDive*.83
  end
  -- [늑대 물기] 예비 동작은 제자리에서 몸을 낮춘다. 급습은 원본 목/앞다리 관절이 담당한다.
  local leap=attacking and (kind=="wolf" and -.12 or kind=="boar" and .66
    or kind=="golem" and .38 or aerial and .5 or -.18) or 0
  if kind=="bat" then leap=0 end
  movingHeight+=leap+recoil*(kind=="golem" and -.28 or .24)
  local attackPitch=attacking and (kind=="wolf" and -.14
    or kind=="golem" and -.34 or aerial and -.58 or .42)
    or recoil>.02 and (kind=="golem" and .22 or aerial and .35 or -.26)*recoil or 0
  if kind=="bat" then attackPitch=-.12*batWindup+.65*batDive+.12*recoil end
  if enemy.isBoss and attacking then
    local duration=enemy.model:GetAttribute("NativeMobMotionDuration") or .68
    local preparation=math.clamp((now-(enemy.attackStateStartedAt or now))/duration,0,1)
    attackPitch=enemy.attackPattern=="GOLEM_SHOCKWAVE" and .18*preparation or -.38*preparation
    movingHeight+=enemy.attackPattern=="GOLEM_SHOCKWAVE" and math.sin(preparation*math.pi)*.42 or 0
  end
  -- [공통 행동 연출] 종별 체중·날갯짓·경계 자세를 원본 피벗에만 소폭 반영한다.
  local heavy=kind=="golem" or kind=="boar"
  local stridePitch=inMotion and math.sin(phase)*(kind=="wolf" and .025 or heavy and .018 or .04) or 0
  local idleBreath=not inMotion and not attacking and not stunned and recoil<.02
    and math.sin(now*(heavy and 1.35 or 2.0)+enemy.spawnPosition.X*.07)*.012 or 0
  local bank=stunned and math.sin(now*9)*.12 or aerial and math.sin(phase*.52)*.22
    or inMotion and math.sin(phase*.65)*(heavy and .014 or .025) or 0
  local facing=enemy.visualFacingSmooth or enemy.visualFacing
  if facing.Magnitude<.01 then facing=Vector3.new(0,0,-1) end
  if kind=="bandit" and enemy.banditIdle and enemy.banditWalk then
    if inMotion and not enemy.banditWalk.IsPlaying then
      enemy.banditIdle:Stop(.18);enemy.banditWalk:Play(.18)
    elseif not inMotion and not enemy.banditIdle.IsPlaying then
      enemy.banditWalk:Stop(.18);enemy.banditIdle:Play(.18)
    end
  end
  local pivot=(enemy.visualPosition or enemy.position)
    +Vector3.new(0,(enemy.visibleGroundOffset or 0)
      +(enemy.terrainGroundOffset or 0)+movingHeight,0)
  enemy.model:PivotTo(CFrame.lookAt(pivot,pivot+facing)
    *CFrame.Angles(0,enemy.model:GetAttribute("NativeMobFacingYaw") or 0,0)
    *CFrame.Angles(attackPitch+stridePitch+idleBreath,0,bank))
end

local function chooseMeadowMobSkill(enemy)
  enemy.attackSerial+=1
  -- 수문장 후반부는 충격파 연타를 사용하되 원래 총 피해·체력·보상은 보존한다.
  local second=((enemy.isBoss or enemy.isAlpha) and enemy.HP<=enemy.maxHP*.5)
    or enemy.attackSerial%2==0
  local pattern=enemy.isBoss and (second and "GOLEM_SHOCKWAVE" or "GOLEM_SLAM")
    or enemy.kind=="bee" and (second and "BEE_STING" or "BEE_SWEEP")
    or enemy.kind=="boar" and (second and "BOAR_TUSK" or "BOAR_CHARGE")
    or enemy.kind=="bat" and (second and "BAT_SWEEP" or "BAT_DIVE")
    or enemy.kind=="ghost" and (second and "PHANTOM_LUNGE" or "GHOST_WAIL")
    or enemy.kind=="bandit" and (second and "BANDIT_FEINT" or "BANDIT_SLASH")
    or (second and "WOLF_LUNGE" or "WOLF_BITE")
  enemy.attackPattern=pattern
  enemy.model:SetAttribute("AttackPattern",pattern)
  enemy.model:SetAttribute("NativeMobSkillActive",second)
  return pattern
end
local function applyMeadowMobHit(player,humanoid,damage,attacker)
  if player:GetAttribute("ProfileReady")~=true or humanoid.Health<=0 then return end
  local defense=meadowDefense[player] or {}
  local now=os.clock()
  if (defense.dodgeUntil or 0)>now then return end
  -- [완벽 막기] 서버가 승인한 막기 시작 직후만 연타를 끊고 공격자에게 기절을 적용한다.
  if (defense.parryUntil or 0)>now or (defense.perfectGuardUntil or 0)>now then
    defense.parryUntil=0
    defense.perfectGuardUntil=0
    meadowDefense[player]=defense
    if attacker and attacker.HP>0 and attacker.model.Parent and (attacker.stunUntil or 0)<=now then
      cancelEnemyWindup(attacker)
      attacker.stunUntil=now+(attacker.isBoss and .6 or 1.2)
      attacker.lastAttack=now
      attacker.model:SetAttribute("NativeMobStunnedUntil",workspace:GetServerTimeNow()+(attacker.isBoss and .6 or 1.2))
      setEnemyAttackState(attacker,"STUNNED")
    end
    recordMeadowQuest(player,"PARRY")
    player:SetAttribute("MeadowParryConfirmed",workspace:GetServerTimeNow())
    remote:FireClient(player,"MEADOW_REACTION","PARRY")
    return
  end
  -- [자동 회피] 기존 Level 능력치를 기준으로만 계산하며 저장 구조는 유지한다.
  -- 4초 간격, 현재 방어 중이 아닐 때 좌/우 실제 공간이 비어 있는 경우만 발동한다.
  if (defense.guardUntil or 0)<=now and now>=(defense.nextAutoDodgeAt or 0) then
    local chance=math.clamp(.06+(meadowProficiencyPower(player)/2.2)*.007,.067,.28)
    if math.random()<chance then
      local character,_,root=liveMeadowCharacter(player)
      if character and root then
        local sign=math.random(0,1)==0 and -1 or 1
        local direction=root.CFrame.RightVector
        local params=RaycastParams.new()
        params.FilterType=Enum.RaycastFilterType.Exclude
        params.FilterDescendantsInstances={character}
        local origin=root.Position+Vector3.new(0,1,0)
        local distance=3.8
        -- [회피 안전] 양쪽 후보의 몸통 통로와 착지 바닥을 확인한다.
        -- 절벽·급경사·물 위로 회피하지 않으며 확률·거리·재사용 시간은 유지한다.
        params.RespectCanCollide=true
        local safe=false
        for attempt=1,2 do
          local offset=direction*sign*distance
          local blocked=workspace:Raycast(origin,offset,params)
          local ground=workspace:Raycast(root.Position+offset,Vector3.new(0,-(humanoid.HipHeight+root.Size.Y/2+1),0),params)
          if not blocked and ground and ground.Normal.Y>=.65
            and ground.Material~=Enum.Material.Water then
            safe=true
            break
          end
          sign=-sign
        end
        if safe then
          -- [자동 회피] 순간이동을 없애고 기존 3.8스터드를 .40초 측면 스텝으로 연결한다.
          -- 무적 .48초·재사용 4초·지면 검사·공격 판정은 기존 서버 권한 그대로다.
          local dodgeOrigin=character:GetPivot()
          local dodgeOffset=direction*sign*distance
          defense.dodgeUntil=now+.48
          defense.nextAutoDodgeAt=now+4
          meadowDefense[player]=defense
          task.spawn(function()
            local began=os.clock()
            while character.Parent and player.Character==character
              and root:IsDescendantOf(character) and humanoid.Health>0 do
              local t=math.clamp((os.clock()-began)/.40,0,1)
              local ease=.5-.5*math.cos(math.pi*t)
              character:PivotTo(dodgeOrigin+dodgeOffset*ease)
              if t>=1 then break end
              RunService.Heartbeat:Wait()
            end
          end)
          local id=sign<0 and "skill-meadow-dodge-left" or "skill-meadow-dodge-right"
          local seq=readNumber(player,"ActionSequence",0)+1
          setNumber(player,"ActionSequence",seq)
          player:SetAttribute("ApprovedActionTarget",root.Position)
          player:SetAttribute("ApprovedActionMotion",id..":"..tostring(seq))
          player:SetAttribute("ApprovedActionFX",id..":"..tostring(seq))
          remote:FireClient(player,"MEADOW_REACTION","DODGE")
          return
        end
      end
    end
  end
  if (defense.guardUntil or 0)>now then damage=math.ceil(damage*.5) end
  humanoid:TakeDamage(damage)
  setNumber(player,"Health",math.max(0,math.floor(humanoid.Health)))
end

local function updateEnemyAI(dt,now)
  worldClock+=dt
  -- [지역 생태] 플레이어 위치와 무관하게 자연스러운 동물 이동을 유지한다.
  -- No fabricated geometry, collision, rewards or hitboxes are involved.
  for _, animal in ipairs(meadowWildlife) do
    if animal.model.Parent then
      local phase=now*animal.speed+animal.phase
      local desired=animal.origin+Vector3.new(math.sin(phase)*animal.range,0,
        math.cos(phase)*animal.range*.55)
      -- [생태 반응] 가까이 접근한 플레이어를 피해 원본 동물이 짧게 이동한다.
      -- 피해, 드랍, 적 추적 AI와 분리된 배경용 이동만 바뀐다.
      local escape=Vector3.zero
      local closest=14
      for _,player in ipairs(Players:GetPlayers()) do
        local character=player.Character
        local root=character and character:FindFirstChild("HumanoidRootPart")
        if root then
          local offset=Vector3.new(desired.X-root.Position.X,0,desired.Z-root.Position.Z)
          if offset.Magnitude>1 and offset.Magnitude<closest then
            closest=offset.Magnitude
            escape=offset.Unit*math.min(9,(14-closest)*.85)
          end
        end
      end
      animal.escape=(animal.escape or Vector3.zero):Lerp(escape,math.min(1,dt*3))
      desired+=animal.escape
      -- [사슴 원본 보행] 실제 위치 변화와 사람 접근 거리로 대기·걷기·질주를 구분한다.
      -- 늑대와 동일한 NativeMobMotion 상태를 사용하며 리스폰·체력·전투를 바꾸지 않는다.
      local traveled=(Vector3.new(desired.X,0,desired.Z)
        -Vector3.new((animal.position or animal.origin).X,0,(animal.position or animal.origin).Z)).Magnitude
      local animalMode=traveled<.025 and "IDLE" or
        (animal.model:GetAttribute("MeadowWildlife")=="deer" and closest<11 and "RUN" or "WALK")
      if animalMode~=animal.motionMode then
        animal.motionMode=animalMode
        animal.model:SetAttribute("NativeMobMotion",animalMode)
        animal.model:SetAttribute("NativeMobMotionStartedAt",workspace:GetServerTimeNow())
      end
      -- 목표 지점의 실제 이동 벡터로 동물의 전방을 설정한다.
      -- 야생동물의 기존 원본 피벗과 발 지면 간 오프셋을 유지해 지하 이동을 방지한다.
      if now>=(animal.nextGroundSample or 0) then
        local ray=RaycastParams.new()
        ray.FilterType=Enum.RaycastFilterType.Include
        ray.FilterDescendantsInstances={meadowTerrain}
        local hit=workspace:Raycast(desired+Vector3.new(0,80,0),
          Vector3.new(0,-160,0),ray)
        if hit then
          animal.groundDelta=hit.Position.Y
            -(animal.model:GetAttribute("MeadowSurfaceY") or hit.Position.Y)
        end
        animal.nextGroundSample=now+.5
      end
      desired+=Vector3.new(0,animal.groundDelta or 0,0)
      local previous=animal.position or animal.origin
      local movement=Vector3.new(desired.X-previous.X,0,desired.Z-previous.Z)
      if movement.Magnitude>.025 then animal.visualFacing=movement.Unit end
      animal.position=desired
    end
  end
  if now>=nextEncounterCheck then
    nextEncounterCheck=now+7
    refreshMeadowEncounters(now)
  end
  for _,enemy in ipairs(enemies) do
    if enemy.HP>0 and enemy.model.Parent then
      -- [경사 보정] 실제 모델의 높이만 갱신하고 전투/추적의 기존 좌표는 유지한다.
      if now>=(enemy.nextGroundSample or 0) then
        local ray=RaycastParams.new()
        ray.FilterType=Enum.RaycastFilterType.Include
        ray.FilterDescendantsInstances={meadowTerrain}
        local hit=workspace:Raycast(enemy.position+Vector3.new(0,90,0),
          Vector3.new(0,-180,0),ray)
        if hit then enemy.terrainGroundOffset=hit.Position.Y-(enemy.spawnGroundY or hit.Position.Y) end
        enemy.nextGroundSample=now+.45
      end
      -- [기절] 해당 몬스터만 추적·예고·연타를 중지하며 다른 몬스터와 웨이브는 계속 진행한다.
      if now<(enemy.stunUntil or 0) then
        setEnemyAttackState(enemy,"STUNNED")
        continue
      elseif enemy.stunUntil then
        enemy.stunUntil=nil
        enemy.model:SetAttribute("NativeMobStunnedUntil",nil)
        setEnemyAttackState(enemy,"RECOVERY")
      end
      -- [공통 AI 표적 기억] 두 플레이어가 비슷한 거리에 있을 때 매 틱 목표가 바뀌지 않게 한다.
      -- 기존 140 탐지 범위와 서버의 사거리·공격·피해 검증은 그대로 사용한다.
      local targetPlayer,targetRoot,targetHuman=nil,nil,nil
      local focusPlayer,focusRoot,focusHuman,focusDistance=nil,nil,nil,nil
      local range=enemy.questIndex and 38 or 140
      for _,player in ipairs(Players:GetPlayers()) do
        local character=player.Character
        local rootPart=character and character:FindFirstChild("HumanoidRootPart")
        local human=character and character:FindFirstChildOfClass("Humanoid")
        if player:GetAttribute("ProfileReady")==true and rootPart and human and human.Health>0
          and not (enemy.kind=="wolf" and meadowVillageContains(rootPart.Position)) then
          local d=(rootPart.Position-enemy.position).Magnitude
          if d<range then targetPlayer,targetRoot,targetHuman,range=player,rootPart,human,d end
          if player.UserId==enemy.focusUserId and d<(enemy.questIndex and 38 or 140) then
            focusPlayer,focusRoot,focusHuman,focusDistance=player,rootPart,human,d
          end
        end
      end
      if focusPlayer and focusDistance<=range+3 then
        targetPlayer,targetRoot,targetHuman,range=focusPlayer,focusRoot,focusHuman,focusDistance
      end
      enemy.focusUserId=targetPlayer and targetPlayer.UserId or nil
      local leashDistance=(enemy.position-enemy.spawnPosition).Magnitude
      if leashDistance>145 then
        -- 시야 밖으로 유인되면 추적을 끊고 최초 스폰 지점으로 귀환한다.
        targetRoot=nil
      end
      if not targetRoot then
        if enemy.windupUntil then cancelEnemyWindup(enemy) end
        local homeOffset=Vector3.new(enemy.spawnPosition.X-enemy.position.X,0,enemy.spawnPosition.Z-enemy.position.Z)
        if homeOffset.Magnitude>1 then
          setEnemyAttackState(enemy,"RETURN_TO_SPAWN")
          local nextPosition=enemy.position+homeOffset.Unit*math.min(enemy.speed*dt,homeOffset.Magnitude)
          if enemy.kind~="wolf" or not meadowVillageContains(nextPosition) then
            enemy.position=nextPosition
            enemy.visualFacing=homeOffset.Unit
          end
        elseif enemy.kind=="wolf" then
          local patrol=enemy.spawnPosition+Vector3.new(math.sin(now*.24+enemy.spawnPosition.X)*5,0,math.cos(now*.24+enemy.spawnPosition.Z)*5)
          local direction=Vector3.new(patrol.X-enemy.position.X,0,patrol.Z-enemy.position.Z)
          if direction.Magnitude>.4 then
            setEnemyAttackState(enemy,"PATROL")
            local nextPosition=enemy.position+direction.Unit*math.min(enemy.speed*dt*.4,direction.Magnitude)
            if not meadowVillageContains(nextPosition) then
              enemy.position=nextPosition
              enemy.visualFacing=direction.Unit
            end
          else setEnemyAttackState(enemy,"IDLE") end
        else
          setEnemyAttackState(enemy,"IDLE")
        end
      else
        local offset=Vector3.new(targetRoot.Position.X-enemy.position.X,0,targetRoot.Position.Z-enemy.position.Z)
        local distance=offset.Magnitude
        -- Three source-authored enemy patterns; authoritative damage and saves are unchanged.
        local attackRange=(enemy.kind=="bee" or enemy.kind=="bat") and 5.6
          or (enemy.isBoss and 5.2 or enemy.isAlpha and 5.0 or 4.4)
        -- [공통 전방 주시] 공격 예고 중에는 실제 목표 방향을 바라보되 판정은 기존 서버 규칙으로만 한다.
        if distance>.05 and (enemy.windupUntil or distance<=attackRange) then
          enemy.visualFacing=offset.Unit
        end
        if enemy.windupUntil then
          -- 공격 예고 중 대상이 사라지거나 거리를 벌렸다면 피해 없이 취소한다.
          local activeRange=enemy.attackPattern=="GOLEM_SHOCKWAVE" and 8.4
            or enemy.attackPattern=="WOLF_LUNGE" and 6.5 or attackRange
          if targetPlayer.UserId~=enemy.windupTargetUserId or distance>activeRange+1 or targetHuman.Health<=0 then
            cancelEnemyWindup(enemy)
          elseif now>=enemy.windupUntil then
            local hitIndex=enemy.comboHit or 1
            local hitCount=enemy.model:GetAttribute("NativeMobSkillActive")==true and 3 or 1
            -- 연속 스킬의 총 피해량은 기존 1회 피해와 같다. 반올림 잔여는 마지막 타격에 포함한다.
            local hitDamage=math.floor(enemy.damage/hitCount)
            if hitIndex==hitCount then hitDamage=enemy.damage-hitDamage*(hitCount-1) end
            enemy.windupUntil=nil
            enemy.windupTargetUserId=nil
            enemy.lastAttack=now
            setEnemyAttackState(enemy,"RECOVERY")
            if enemy.attackPattern=="GOLEM_SHOCKWAVE" then
              -- Boss area skill applies the original damage to each player at
              -- most once, within its telegraphed range and only on the server.
              for _,victim in ipairs(Players:GetPlayers()) do
                local avatar=victim.Character
                local root=avatar and avatar:FindFirstChild("HumanoidRootPart")
                local human=avatar and avatar:FindFirstChildOfClass("Humanoid")
                if root and human and (root.Position-enemy.position).Magnitude<=8.4 then
                  applyMeadowMobHit(victim,human,hitDamage,enemy)
                  if (enemy.stunUntil or 0)>now then break end
                end
              end
            else
              applyMeadowMobHit(targetPlayer,targetHuman,hitDamage,enemy)
            end
            if (enemy.stunUntil or 0)>now then continue end
            if hitIndex<hitCount then
              enemy.comboHit=hitIndex+1
              enemy.windupTargetUserId=targetPlayer.UserId
              enemy.windupUntil=now+.22
              setEnemyAttackState(enemy,"ANTICIPATION")
            else
              enemy.comboHit=nil
            end
            enemy.model:SetAttribute("NativeMobLastImpact",workspace:GetServerTimeNow())
            remote:FireAllClients("MEADOW_MOB_ATTACK",{
              species=enemy.kind,pattern=enemy.attackPattern,position=enemy.position,
              facing=enemy.visualFacing,
            })
          end
        elseif distance>attackRange then
          setEnemyAttackState(enemy,"CHASE")
          local step=math.min(enemy.speed*dt,distance-attackRange)
          local direction=offset.Unit
          -- [공통 AI 군집 분리] 같은 종 몬스터가 한 점에 겹치지 않게 이동 방향만 살짝 분리한다.
          -- 늑대의 기존 무리 반응은 유지하며 속도·표적·공격 범위·피해는 변경하지 않는다.
          if not enemy.isBoss and distance>attackRange+2 and enemy.kind~="bee" and enemy.kind~="bat" then
            local spacing=Vector3.zero
            local radius=enemy.kind=="wolf" and 5 or 3.5
            for _,neighbor in ipairs(enemies) do
              if neighbor~=enemy and neighbor.kind==enemy.kind and neighbor.HP>0 then
                local separation=Vector3.new(enemy.position.X-neighbor.position.X,0,enemy.position.Z-neighbor.position.Z)
                if separation.Magnitude>.1 and separation.Magnitude<radius then
                  spacing+=separation.Unit*(1-separation.Magnitude/radius)
                end
              end
            end
            local weight=enemy.kind=="wolf" and .55 or .32
            local steered=direction+spacing*weight
            if steered.Magnitude>.1 then direction=steered.Unit end
          end
          if enemy.kind=="bee" or enemy.kind=="bat" then
            -- 원본 날개 몬스터는 지상 몬스터와 달리 좌우로 비행한다.
            local tangent=Vector3.new(-direction.Z,0,direction.X)
            direction=(direction+tangent*math.sin(now*1.8+enemy.spawnPosition.X)*.42).Unit
          end
          -- [마을 진입 제한] 추적·밀집 분리 중에도 늑대는 마을 안전 경계를 넘지 않는다.
          local nextPosition=enemy.position+direction*step
          if enemy.kind~="wolf" or not meadowVillageContains(nextPosition) then
            enemy.position=nextPosition
            -- 원본 이동 방향을 유지하며 속도/공격력은 변경하지 않는다.
            enemy.visualFacing=enemy.kind=="wolf" and direction or offset.Unit
          end
        elseif now-enemy.lastAttack>=(enemy.isBoss and 1.9 or 1.45) then
          local pattern=chooseMeadowMobSkill(enemy)
          enemy.comboHit=1
          enemy.windupTargetUserId=targetPlayer.UserId
          enemy.windupUntil=now+(enemy.isBoss and .68 or
            ((pattern=="WOLF_LUNGE" or pattern=="BOAR_CHARGE") and .55
              or (enemy.kind=="bee" or enemy.kind=="bat") and .32 or .42))
          setEnemyAttackState(enemy,"ANTICIPATION")
        end
      end
    end
  end
end
-- [몹 실제 보행] 전투/사거리/이동 속도 계산은 기존 0.12초 AI 스텝 그대로 둔다.
-- 렌더링할 원본 모델 피벗만 30Hz로 보간해 8Hz 점프 이동을 제거한다.
local enemyUpdateElapsed=0
local enemyVisualElapsed=0
local staminaRegenElapsed=0
RunService.Heartbeat:Connect(function(dt)
  local step=math.min(dt,.15)
  enemyUpdateElapsed+=step
  enemyVisualElapsed+=step
  staminaRegenElapsed+=step
  if staminaRegenElapsed>=.25 then
    local elapsed=staminaRegenElapsed
    staminaRegenElapsed=0
    for _,member in ipairs(Players:GetPlayers()) do
      if member:GetAttribute("ProfileReady")==true then
        local current=member:GetAttribute("MeadowStamina")
        local character=member.Character
        local humanoid=character and character:FindFirstChildOfClass("Humanoid")
        if typeof(current)=="number" and current<100 and humanoid and humanoid.Health>0 then
          member:SetAttribute("MeadowStamina",math.min(100,current+elapsed*10))
        end
      end
    end
  end
  if enemyUpdateElapsed>=.12 then
    local logicStep=math.min(enemyUpdateElapsed,.25)
    enemyUpdateElapsed=0
    updateEnemyAI(logicStep,os.clock())
    updateMeadowClimate()
  end
  if enemyVisualElapsed>=1/30 then
    local visualStep=math.min(enemyVisualElapsed,.08)
    enemyVisualElapsed=0
    local alpha=1-math.exp(-visualStep*18)
    local now=os.clock()
    -- [야생동물 렌더] 기존 AI 속도는 그대로, 원본 메시만 30Hz 보간한다.
    for _,animal in ipairs(meadowWildlife) do
      if animal.model.Parent and animal.position then
        animal.visualPosition=(animal.visualPosition or animal.origin):Lerp(animal.position,alpha)
        local facing=animal.visualFacing or Vector3.new(0,0,-1)
        local smooth=(animal.visualFacingSmooth or facing):Lerp(facing,alpha)
        if smooth.Magnitude>.01 then animal.visualFacingSmooth=smooth.Unit end
        local forward=animal.visualFacingSmooth or facing
        -- [사슴 +Z 전방] 새 CC0 GLB 원본의 앞 방향을 이동 방향에 맞춘다.
        local facing=CFrame.lookAt(animal.visualPosition,animal.visualPosition+forward)
        if animal.model:GetAttribute("MeadowWildlife")=="deer" then
          facing*=CFrame.Angles(0,math.pi,0)
        end
        animal.model:PivotTo(facing)
      end
    end
    for _,enemy in ipairs(enemies) do
      if enemy.HP>0 and enemy.model.Parent then
        local previous=enemy.visualPosition or enemy.position
        enemy.visualPosition=previous:Lerp(enemy.position,alpha)
        if enemy.kind=="wolf" then
          local moved=Vector3.new(enemy.visualPosition.X-previous.X,0,enemy.visualPosition.Z-previous.Z)
          if moved.Magnitude>.01 and (enemy.attackState=="CHASE" or enemy.attackState=="PATROL"
            or enemy.attackState=="RETURN_TO_SPAWN") then enemy.visualFacing=moved.Unit end
        end
        local desired=enemy.visualFacing
        if desired.Magnitude>.01 then
          local smooth=(enemy.visualFacingSmooth or desired):Lerp(desired,alpha)
          if smooth.Magnitude>.01 then enemy.visualFacingSmooth=smooth.Unit end
        end
        animateMeadowOriginalMob(enemy,now)
      end
    end
  end
end)

local meadowSkillSeconds={
  ["skill-meadow-heavy"]=5,["skill-meadow-sweep"]=9,["skill-meadow-bolt"]=7,
  ["skill-meadow-guard"]=9,["skill-meadow-parry"]=7,
  ["skill-meadow-dodge-left"]=4,["skill-meadow-dodge-right"]=4,
  ["skill-meadow-sprint"]=8,["skill-meadow-heal"]=16,
  ["skill-meadow-focus"]=13,["skill-meadow-emote"]=3,
}
local function meadowSkill(player,id,execute)
  local interval=meadowSkillSeconds[id]
  if not interval then return false end
  local cooldowns=meadowSkillCooldown[player] or {}
  local now=os.clock()
  if now<(cooldowns[id] or 0) then return false end
  local character,humanoid,root=liveMeadowCharacter(player)
  if not character then return false end
  player:SetAttribute("ApprovedActionTarget",root.Position)
  local accepted=execute(character,humanoid,root,now)
  if accepted~=true then return false end
  cooldowns[id]=now+interval
  meadowSkillCooldown[player]=cooldowns
  -- Server time is synchronized for mobile countdown labels.
  player:SetAttribute("MeadowReady_"..id,workspace:GetServerTimeNow()+interval)
  return true
end
local function meadowHeavy(player)
  return meadowSkill(player,"skill-meadow-heavy",function(_,_,root,now)
    -- Unarmed uppercut uses the same attack, reward and authority path.
    local enemy=nearestEnemy(root,7)
    if not enemy or now<(attackCooldown[player] or 0) then return false end
    attackCooldown[player]=now+.65
    local damage=math.floor((16+meadowProficiencyPower(player)
      +readNumber(player,"WeaponTier",0)*8)*1.7)
    return applyMeadowDamage(player,enemy,damage)
  end)
end
local function meadowSweep(player)
  return meadowSkill(player,"skill-meadow-sweep",function(_,_,root)
    local targets={}
    for _,enemy in ipairs(enemies) do
      if enemy.HP>0 and enemy.model.Parent and
        (enemy.position-root.Position).Magnitude<=10 and #targets<5 then
        table.insert(targets,enemy)
      end
    end
    if #targets==0 then return false end
    local damage=math.floor((16+meadowProficiencyPower(player)
      +readNumber(player,"WeaponTier",0)*8)*.85)
    player:SetAttribute("ApprovedActionTarget",root.Position)
    for _,enemy in ipairs(targets) do applyMeadowDamage(player,enemy,damage) end
    player:SetAttribute("ApprovedActionTarget",root.Position)
    return true
  end)
end
local function meadowBolt(player)
  return meadowSkill(player,"skill-meadow-bolt",function(character,_,root)
    local enemy=nearestEnemy(root,32)
    if not enemy then return false end
    local ray=RaycastParams.new()
    ray.FilterType=Enum.RaycastFilterType.Exclude
    ray.FilterDescendantsInstances={character,enemy.model}
    local delta=enemy.position-(root.Position+Vector3.new(0,2,0))
    local wall=workspace:Raycast(root.Position+Vector3.new(0,2,0),delta,ray)
    if wall and wall.Distance<delta.Magnitude-2 then return false end
    local damage=math.floor(12+meadowProficiencyPower(player)*1.8/2.2
      +readNumber(player,"WeaponTier",0)*4)
    return applyMeadowDamage(player,enemy,damage)
  end)
end
local function meadowGuard(player)
  return meadowSkill(player,"skill-meadow-guard",function(_,_,root,now)
    local defense=meadowDefense[player] or {}
    defense.guardUntil=now+2.8
    defense.perfectGuardUntil=now+.28
    meadowDefense[player]=defense
    player:SetAttribute("ApprovedActionTarget",root.Position)
    return true
  end)
end
local function meadowParry(player)
  return meadowSkill(player,"skill-meadow-parry",function(_,_,root,now)
    local defense=meadowDefense[player] or {}
    defense.parryUntil=now+.42
    meadowDefense[player]=defense
    player:SetAttribute("ApprovedActionTarget",root.Position)
    return true
  end)
end
local function meadowDodge(player,sign,id)
  return meadowSkill(player,id,function(character,humanoid,root,now)
    -- [적 주시 회피] 서버가 가까운 실제 적을 찾고, 적 방향 기준 좌우로 빠진다.
    -- 스틱 좌우 선택은 기존 두 회피 행동 ID를 사용하므로 판정 권한을 넘기지 않는다.
    local facing=root.CFrame.LookVector
    -- 회피 중에는 공격 전방 필터에 관계없이 실제 가장 가까운 적을 주시한다.
    local target=nil
    local nearest=25
    for _,enemy in ipairs(enemies) do
      if enemy.HP>0 and enemy.model.Parent then
        local offset=enemy.position-root.Position
        local distance=offset.Magnitude
        if distance<nearest then
          nearest=distance
          target=enemy
        end
      end
    end
    if target then
      local delta=target.position-root.Position
      local flat=Vector3.new(delta.X,0,delta.Z)
      if flat.Magnitude>.01 then facing=flat.Unit end
    end
    facing=Vector3.new(facing.X,0,facing.Z)
    if facing.Magnitude<.01 then facing=Vector3.new(0,0,-1)
    else facing=facing.Unit end
    local side=Vector3.new(-facing.Z,0,facing.X)*sign
    local ray=RaycastParams.new()
    ray.FilterType=Enum.RaycastFilterType.Exclude
    ray.FilterDescendantsInstances={character}
    local start=root.Position+Vector3.new(0,1.5,0)
    ray.RespectCanCollide=true
    local wall=workspace:Raycast(start,side*7,ray)
    local distance=wall and math.max(0,wall.Distance-2) or 7
    if distance<2 then return false end
    -- [회피 안전] 낭떠러지·물·급경사에 착지하지 않는다. 최대 7스터드 범위는 유지.
    local floorRay=RaycastParams.new()
    floorRay.FilterType=Enum.RaycastFilterType.Include
    floorRay.FilterDescendantsInstances={meadowTerrain}
    local landing=root.Position+side*distance
    local floor=workspace:Raycast(landing+Vector3.new(0,8,0),
      Vector3.new(0,-18,0),floorRay)
    local terrainGround=root.Position.Y-root.Size.Y*.5
    if not floor or floor.Material==Enum.Material.Water
      or floor.Normal.Y<.65 or math.abs(floor.Position.Y-terrainGround)>4 then return false end
    -- [서버 승인 회피] 7스터드 거리·.48초 무적·4초 재사용을 유지하고 옆 점프 이동만 .26초로 한다.
    local dodgeOrigin=character:GetPivot()
    local dodgeFacing=CFrame.lookAt(dodgeOrigin.Position,dodgeOrigin.Position+facing)
    local dodgeOffset=side*distance
    -- [실제 측면 도약] 낮은 천장·높은 장애물이 있으면 점프 높이만 제거한다.
    -- 기존 측면 안전 검사, 7스터드 거리와 서버 무적 판정은 변경하지 않는다.
    local overhead=workspace:Raycast(start,Vector3.new(0,.9,0),ray)
    local elevatedWall=workspace:Raycast(start+Vector3.new(0,.62,0),side*distance,ray)
    -- [지면 밀착 회피] 무적·이동 거리·쿨다운은 그대로 두고 시각적 도약 높이만 낮춘다.
    local hopHeight=(not overhead and not elevatedWall) and .28 or 0
    local defense=meadowDefense[player] or {}
    defense.dodgeUntil=now+.48
    meadowDefense[player]=defense
    player:SetAttribute("ApprovedActionTarget",root.Position)
    local oldAutoRotate=humanoid.AutoRotate
    humanoid.AutoRotate=false
    task.spawn(function()
      local movementStarted=os.clock()
      while character.Parent and player.Character==character
        and root:IsDescendantOf(character) and humanoid.Health>0 do
        local t=math.clamp((os.clock()-movementStarted)/.26,0,1)
        -- [회피: 15도 숙인 빠른 측면 도약] 출발 시 순간적인 몸통 방향 점프를 막는다.
        -- 처음 약 .06초만 적을 향해 회전하고 이후 적을 보는 방향을 고정한다.
        local eased=.5-.5*math.cos(math.pi*t)
        local turn=math.clamp(t/.24,0,1)
        turn=turn*turn*(3-2*turn)
        local gaze=dodgeOrigin:Lerp(dodgeFacing,turn)
        local hop=hopHeight*math.sin(math.pi*t)
        character:PivotTo(gaze+dodgeOffset*eased+Vector3.new(0,hop,0))
        if t>=1 then break end
        RunService.Heartbeat:Wait()
      end
      if humanoid.Parent and player.Character==character then
        humanoid.AutoRotate=oldAutoRotate
      end
    end)
    return true
  end)
end
local function meadowSprint(player)
  return meadowSkill(player,"skill-meadow-sprint",function(_,humanoid,root)
    local prior=humanoid.WalkSpeed
    humanoid.WalkSpeed=math.min(26,prior+5)
    player:SetAttribute("ApprovedActionTarget",root.Position)
    task.delay(3,function()
      if humanoid.Parent and humanoid.Health>0 and humanoid.WalkSpeed==math.min(26,prior+5) then
        humanoid.WalkSpeed=prior
      end
    end)
    return true
  end)
end
local function meadowHeal(player)
  return meadowSkill(player,"skill-meadow-heal",function(_,humanoid,root)
    if humanoid.Health>=humanoid.MaxHealth then return false end
    humanoid.Health=math.min(humanoid.MaxHealth,humanoid.Health+26)
    setNumber(player,"Health",math.floor(humanoid.Health))
    player:SetAttribute("LastApprovedScope","survival-heal")
    player:SetAttribute("ApprovedActionTarget",root.Position)
    return true
  end)
end
local function meadowFocus(player)
  return meadowSkill(player,"skill-meadow-focus",function(_,_,root,now)
    meadowFocusUntil[player]=now+5
    player:SetAttribute("ApprovedActionTarget",root.Position)
    return true
  end)
end
local function meadowEmote(player)
  return meadowSkill(player,"skill-meadow-emote",function(_,_,root)
    player:SetAttribute("ApprovedActionTarget",root.Position)
    return true
  end)
end

local handlers={
  ["genre-core"]=startSurvivalRun,
  ["scope-corefun-ea77622450"]=attackEnemy,
  ["scope-coreloop-0-9b2d4dfbc6"]=attackEnemy,
  ["scope-coreloop-1-6ebe58f496"]=gatherNearestResource,
  ["scope-coreloop-2-6c927cfa40"]=upgradeEquipment,
  ["scope-mobileux-5acfb2eaa6"]=attackEnemy,
  ["meadow-unarmed-rush"]=attackEnemy, -- [연타] 맨손은 기존 동일 공격, 장비 착용도 기존 무기 공격 승인
  ["meadow-unarmed-uppercut"]=function(player) return unarmedSkillAttack(player,20) end,
  ["meadow-unarmed-kick"]=function(player) return unarmedSkillAttack(player,14) end,
  ["meadow-unarmed-elbow"]=unarmedSkillAttack,
  ["skill-meadow-heavy"]=meadowHeavy,
  ["skill-meadow-sweep"]=meadowSweep,
  ["skill-meadow-bolt"]=meadowBolt,
  ["skill-meadow-guard"]=meadowGuard,
  ["skill-meadow-parry"]=meadowParry,
  ["skill-meadow-dodge-left"]=function(player)
    return meadowDodge(player,-1,"skill-meadow-dodge-left")
  end,
  ["skill-meadow-dodge-right"]=function(player)
    return meadowDodge(player,1,"skill-meadow-dodge-right")
  end,
  ["skill-meadow-sprint"]=meadowSprint,
  ["skill-meadow-heal"]=meadowHeal,
  ["skill-meadow-focus"]=meadowFocus,
  ["skill-meadow-emote"]=meadowEmote,
}

local function bindSurvivalHealth(player)
  local function bindCharacter(character)
    -- 리스폰한 캐릭터가 이전 생명의 막기·회피 판정을 물려받지 않는다.
    meadowDefense[player]=nil
    player:SetAttribute("MeadowStamina",100)
    local humanoid = character:WaitForChild("Humanoid", 10)
    if not humanoid then return end
    -- 플레이어 실제 휴머노이드 체력만 HUD에 전달한다. 서버가 소유하는 체력 판정은 유지한다.
    local function reportHealth(value)
      if player.Parent then setNumber(player, "Health", math.max(0, math.floor(value))) end
    end
    reportHealth(humanoid.Health)
    humanoid.HealthChanged:Connect(reportHealth)
    humanoid.Died:Connect(function()
      player:SetAttribute("RunActive", false)
      player:SetAttribute("LastApprovedScope", "survival-respawn")
      -- [실제 부활 복구] Roblox 자동 리스폰의 기본 대기시간을 먼저 보장한다.
      -- 이후에도 같은 죽은 캐릭터가 남아 있을 때만 LoadCharacterAsync로 복구한다.
      -- 새 캐릭터가 생성됐다면 호출하지 않아 중복 스폰과 저장 상태 손실을 피한다.
      task.delay(Players.RespawnTime+1,function()
        if player.Parent~=Players or player.Character~=character or humanoid.Health>0 then return end
        local recovered,reason=pcall(function()
          player:LoadCharacterAsync()
        end)
        if not recovered then
          warn("SURVIVAL_RESPAWN_RECOVERY_FAILED: "..tostring(reason))
        end
      end)
    end)
  end
  player.CharacterAdded:Connect(bindCharacter)
  if player.Character then task.defer(bindCharacter, player.Character) end
end

-- 데이터 읽기가 실패한 세션에서는 임시 플레이만 허용한다.
-- 실패한 로드의 기본값으로 기존 저장 데이터가 덮어써지는 것을 막는다.
local persistenceAllowed = {}
local profileBindingStarted = {}
-- [첫 화면/새 게임] 기존 프로필 저장소에서만 초기화하며 클라이언트가 보상을 쓰지 못한다.
local meadowNewGameResetBusy = {}
local function onSurvivalPlayerAdded(player)
  if profileBindingStarted[player] then return end
  profileBindingStarted[player] = true
  player:SetAttribute("ProfileReady", false)
  local ok, saved = pcall(function()
    if not store then error("SURVIVAL_DATASTORE_UNAVAILABLE") end
    return store:GetAsync("player:" .. player.UserId)
  end)
  if player.Parent ~= Players then return end
  local validSaved = ok and (saved == nil or typeof(saved) == "table")
  -- [이어하기] 구형 저장에는 위치 필드가 없다. 값이 유효할 때만 원래 서식지로 복귀한다.
  local resumePosition=nil
  if validSaved and typeof(saved)=="table" and saved.MeadowResumeValid==1 then
    local x,y,z=saved.MeadowResumeX,saved.MeadowResumeY,saved.MeadowResumeZ
    if typeof(x)=="number" and typeof(y)=="number" and typeof(z)=="number"
      and x==x and y==y and z==z and math.abs(x)<=338
      and math.abs(z)<=338 and y>=-25 and y<=145 then
      resumePosition=Vector3.new(x,y,z)
    end
  end
  player:SetAttribute("MeadowResumeReady",resumePosition==nil)
  player:SetAttribute("MeadowEnteredWorld",false)
  -- [옵션 저장] 구형 세이브와 위치 기록을 보존하고 UI 배치 문자열만 선택적으로 복원한다.
  local savedLayout=validSaved and typeof(saved)=="table" and saved.MeadowTopButtonsLayout or nil
  if typeof(savedLayout)=="string" and #savedLayout<=40
    and savedLayout:match("^%d+,%d+,%d+,%d+,%d+,%d+,%d+,%d+$") then
    player:SetAttribute("MeadowTopButtonsLayout",savedLayout)
  end
  persistenceAllowed[player] = validSaved
  player:SetAttribute("MeadowProfileHadSave",validSaved and typeof(saved)=="table")
  player:SetAttribute("MeadowNewGameResult","IDLE")
  if validSaved and typeof(saved) == "table" then
    for key, fallback in pairs(Config.InitialState) do
      local value = saved[key]
      if typeof(value) == "number" then player:SetAttribute(key, value) else player:SetAttribute(key, fallback) end
    end
    -- 기존 레벨과 경험치의 누적 합을 숙련도로 이관해 기존 피해 수치를 유지한다.
    if typeof(saved.CombatProficiency)~="number" then
      local oldLevel=math.max(1,math.floor(tonumber(saved.Level) or 1))
      local oldXp=math.max(0,tonumber(saved.XP) or 0)
      player:SetAttribute("CombatProficiency",(oldLevel-1)*(6*oldLevel+25)+oldXp)
    end
    player:SetAttribute("ActionSequence", 0)
    player:SetAttribute("LastApprovedScope", "ready")
  else
    initializePlayer(player)
  end
  player:SetAttribute("SaveStatus", validSaved and "READY" or "SESSION_ONLY")
  player:SetAttribute("MeadowStamina",100)
  bindSurvivalHealth(player)
  player:SetAttribute("ProfileReady", true)
  broadcastSurvivalState(player)
  if resumePosition then
    task.spawn(function()
      local deadline=os.clock()+22
      while player.Parent==Players and gameWorld:GetAttribute("MeadowOuterRegionReady")~=true
        and os.clock()<deadline do task.wait(.15) end
      if player.Parent~=Players then return end
      local character=player.Character or player.CharacterAdded:Wait()
      local root=character and character:WaitForChild("HumanoidRootPart",12)
      local human=character and character:FindFirstChildOfClass("Humanoid")
      if root and human and human.Health>0 and player.Character==character then
        local ray=RaycastParams.new()
        ray.FilterType=Enum.RaycastFilterType.Include
        ray.FilterDescendantsInstances={meadowTerrain}
        local hit=workspace:Raycast(Vector3.new(resumePosition.X,150,resumePosition.Z),
          Vector3.new(0,-240,0),ray)
        if hit and hit.Position.Y>=-22 and hit.Position.Y<=130 then
          root.CFrame=CFrame.new(resumePosition.X,hit.Position.Y+3.5,resumePosition.Z)
          root.AssemblyLinearVelocity=Vector3.zero
        else
          warn("MEADOW_RESUME_GROUND_UNVERIFIED")
        end
      end
      player:SetAttribute("MeadowResumeReady",true)
    end)
  end
end
Players.PlayerAdded:Connect(onSurvivalPlayerAdded)
-- PlayerAdded 이전에 존재하던 플레이어도 동일한 저장 프로필 검증·캐릭터 연결을 수행한다.
for _, player in ipairs(Players:GetPlayers()) do
  task.defer(onSurvivalPlayerAdded, player)
end
remote.OnServerEvent:Connect(function(player, actionId)
  if typeof(actionId) ~= "string" or player:GetAttribute("ProfileReady") ~= true then return end
  if actionId=="meadow:enter-world" then
    -- 타이틀 입장이 끝난 세션만 종료 시점의 위치와 진행도를 저장한다.
    player:SetAttribute("MeadowEnteredWorld",true)
    return
  end
  -- [버튼 편집] UI 좌표 4쌍만 허용한다. 전투·이동·보상·진행도는 클라이언트가 변경하지 못한다.
  if string.sub(actionId,1,17)=="meadow:ui-layout:" then
    if player:GetAttribute("MeadowEnteredWorld")~=true then return end
    local encoded=string.sub(actionId,18)
    if #encoded>40 or not encoded:match("^%d+,%d+,%d+,%d+,%d+,%d+,%d+,%d+$") then return end
    local values={}
    for number in encoded:gmatch("%d+") do values[#values+1]=tonumber(number) end
    if #values~=8 then return end
    for index=1,4 do
      local x,y=values[index*2-1],values[index*2]
      if x<120 or x>880 or y<100 or y>550 then return end
    end
    -- [모바일 아이콘 배치] 서버에서도 원본 버튼 반지름 기준 겹치는 좌표 저장 거부.
    for index=1,3 do
      for other=index+1,4 do
        local dx=(values[index*2-1]-values[other*2-1])*235/1000
        local dy=(values[index*2]-values[other*2])*260/1000
        local minDistance=31+(other==4 and 22 or 31)+6
        if dx*dx+dy*dy<minDistance*minDistance then return end
      end
    end
    player:SetAttribute("MeadowTopButtonsLayout",encoded)
    return
  end
  -- [첫 화면] 기존 저장 데이터는 기본적으로 보존한다.
  -- 삭제 확인이 끝난 새 게임 요청만 서버의 기존 DataStore UpdateAsync로 초기화한다.
  if actionId=="meadow:new-game:confirm" then
    if meadowNewGameResetBusy[player] then return end
    if persistenceAllowed[player]~=true or not store then
      player:SetAttribute("MeadowNewGameResult","UNAVAILABLE")
      return
    end
    if player:GetAttribute("MeadowProfileHadSave")~=true then
      player:SetAttribute("MeadowNewGameResult","SUCCESS")
      return
    end
    meadowNewGameResetBusy[player]=true
    player:SetAttribute("MeadowNewGameResult","IN_PROGRESS")
    -- 데이터 갱신 중 퇴장하더라도 이전 스냅샷이 새 게임을 덮어쓰지 못하게 한다.
    persistenceAllowed[player]=false
    player:SetAttribute("ProfileReady",false)
    local ok,committed=pcall(function()
      return store:UpdateAsync("player:"..player.UserId,function(previous)
        if previous~=nil and typeof(previous)~="table" then return nil end
        -- 다른 시스템의 미지 필드와 기존 저장 형식을 파괴하지 않는다.
        local nextProfile=typeof(previous)=="table" and table.clone(previous) or {}
        for key,initial in pairs(Config.InitialState) do nextProfile[key]=initial end
        return nextProfile
      end)
    end)
    if player.Parent==Players then
      persistenceAllowed[player]=true
      if ok and committed then
        initializePlayer(player)
        player:SetAttribute("MeadowStamina",100)
        player:SetAttribute("MeadowProfileHadSave",false)
        player:SetAttribute("MeadowResumeReady",true)
        player:SetAttribute("MeadowEnteredWorld",false)
        player:SetAttribute("SaveStatus","READY")
        villageSessions[player]=nil
        meadowDefense[player]=nil
        -- 서버가 승인한 현재 캐릭터를 기본 시작 위치로 다시 생성한다.
        local respawnOk,respawnReason=pcall(function() player:LoadCharacterAsync() end)
        if not respawnOk then warn("MEADOW_NEW_GAME_RESPAWN_FAILED: "..tostring(respawnReason)) end
        player:SetAttribute("ProfileReady",true)
        broadcastSurvivalState(player)
        player:SetAttribute("MeadowNewGameResult","SUCCESS")
      else
        -- 저장소 실패 시 기존 진행도/캐릭터를 건드리지 않고 선택 창으로 복귀한다.
        player:SetAttribute("ProfileReady",true)
        player:SetAttribute("MeadowNewGameResult","SAVE_FAILED")
      end
    end
    meadowNewGameResetBusy[player]=nil
    return
  end
  -- [마을 계약] 동일한 게임 RemoteEvent로 받되 NPC 서버 대화 세션·거리·단계를 다시 검증한다.
  if string.sub(actionId,1,8)=="village:" then villageChoose(player,actionId);return end
  local handler = handlers[actionId]
  if typeof(handler) ~= "function" then return end
  local now = os.clock()
  local previous = lastAction[player] or 0
  if now - previous < Config.RateLimitSeconds then return end
  lastAction[player] = now
  local actionAccepted,combatHit=handler(player)
  -- [서버 권한] Actual accepted actions only. Existing R15 unarmed
  -- ApprovedCombatMotion and confirmed MEADOW_IMPACT remain untouched.
  if actionAccepted~=true then return end
  local approvedSequence=readNumber(player,"ActionSequence",0)+1
  setNumber(player,"ActionSequence",approvedSequence)
  local approved=actionId..":"..tostring(approvedSequence)
  local character=player.Character
  local root=character and character:FindFirstChild("HumanoidRootPart")
  local targetPos=player:GetAttribute("ApprovedActionTarget")
  if typeof(targetPos)~="Vector3" and root then targetPos=root.Position end
  player:SetAttribute("ApprovedActionMotion",approved)
  local combatAction=false
  for _,action in ipairs(Config.Actions) do
    if action.Id==actionId and action.Kind=="COMBAT" then
      combatAction=true
      player:SetAttribute("ApprovedCombatMotion",approved)
      break
    end
  end
  -- 허공 공격은 관절 모션만 재생한다. 명중 효과·처치·점수는 만들지 않는다.
  if not combatAction or combatHit==true then
    player:SetAttribute("ApprovedActionFX",approved)
    remote:FireAllClients("MEADOW_ACTION_FX",player.UserId,actionId,approvedSequence,targetPos)
  end
end)
local function saveSurvivalProgress(player)
  if persistenceAllowed[player] ~= true or not store then return false end
  -- 첫 화면에서 곧바로 나간 경우 예전 위치/진행도를 초기 스폰 값으로 덮어쓰지 않는다.
  if player:GetAttribute("MeadowEnteredWorld")~=true then return false end
  local snapshot = {}
  for key, fallback in pairs(Config.InitialState) do snapshot[key] = readNumber(player, key, fallback) end
  local layout=player:GetAttribute("MeadowTopButtonsLayout")
  if typeof(layout)=="string" and #layout<=40
    and layout:match("^%d+,%d+,%d+,%d+,%d+,%d+,%d+,%d+$") then
    snapshot.MeadowTopButtonsLayout=layout
  end
  -- [이어하기 위치] 서버 캐릭터의 실제 위치만 저장한다. 클라이언트 좌표는 받지 않는다.
  local character=player.Character
  local root=character and character:FindFirstChild("HumanoidRootPart")
  local human=character and character:FindFirstChildOfClass("Humanoid")
  if root and human and human.Health>0 then
    local pos=root.Position
    if math.abs(pos.X)<=338 and math.abs(pos.Z)<=338 and pos.Y>=-25 and pos.Y<=145 then
      snapshot.MeadowResumeValid=1
      snapshot.MeadowResumeX=pos.X
      snapshot.MeadowResumeY=pos.Y
      snapshot.MeadowResumeZ=pos.Z
    end
  end
  local ok, committed = pcall(function()
    return store:UpdateAsync("player:" .. player.UserId, function(previous)
      -- 다른 버전의 데이터와 알 수 없는 이전 필드는 버리지 않는다.
      if previous ~= nil and typeof(previous) ~= "table" then return nil end
      local merged = typeof(previous) == "table" and table.clone(previous) or {}
      for key, value in pairs(snapshot) do merged[key] = value end
      return merged
    end)
  end)
  local saved = ok and committed ~= nil
  player:SetAttribute("SaveStatus", saved and "SAVED" or "SAVE_FAILED")
  return saved
end
Players.PlayerRemoving:Connect(function(player)
  saveSurvivalProgress(player)
  persistenceAllowed[player] = nil
  profileBindingStarted[player] = nil
  meadowNewGameResetBusy[player]=nil
  lastAction[player] = nil
  attackCooldown[player] = nil
  meadowSkillCooldown[player]=nil
  meadowFocusUntil[player]=nil
  meadowDefense[player]=nil
  meadowInspectReady[player]=nil
  villageSessions[player]=nil
  villageInteractionCooldown[player]=nil
end)


-- native-foundation-sentinel-v1
local nativeFoundationRemote = ReplicatedStorage:FindFirstChild("RuntimeFoundationReport")
if nativeFoundationRemote and not nativeFoundationRemote:IsA("RemoteEvent") then
  nativeFoundationRemote:Destroy()
  nativeFoundationRemote = nil
end
if not nativeFoundationRemote then
  nativeFoundationRemote = Instance.new("RemoteEvent")
  nativeFoundationRemote.Name = "RuntimeFoundationReport"
  nativeFoundationRemote.Parent = ReplicatedStorage
end
local nativeFoundationSpawn = workspace:FindFirstChild("NativeFoundationSpawn")
if not nativeFoundationSpawn then
  nativeFoundationSpawn = Instance.new("SpawnLocation")
  nativeFoundationSpawn.Name = "NativeFoundationSpawn"
  nativeFoundationSpawn.Parent = workspace
end
nativeFoundationSpawn.Size = Vector3.new(8, 1, 8)
nativeFoundationSpawn.Transparency = 1 -- Engine spawn locator only, never visible scenery
nativeFoundationSpawn.Position = Vector3.new(0, 3, 0)
nativeFoundationSpawn.Anchored = true
nativeFoundationSpawn.CanCollide = false
nativeFoundationSpawn.CanTouch = false
nativeFoundationSpawn.CanQuery = false
nativeFoundationSpawn.Neutral = true
nativeFoundationSpawn.Material = table.find(studioMaterialAtoms, "METAL") and Enum.Material.Metal or Enum.Material.Plastic

local function bindNativeFoundationCharacter(character)
  local humanoid = character:WaitForChild("Humanoid")
  local rootPart = character:WaitForChild("HumanoidRootPart")
  rootPart.Anchored = false
  rootPart.AssemblyLinearVelocity = Vector3.zero
  rootPart.AssemblyAngularVelocity = Vector3.zero
  humanoid.PlatformStand = false
  humanoid.Sit = false
  humanoid.AutoRotate = true
  if rootPart.Position.Y < 2 then rootPart.CFrame = CFrame.new(0, 4, 0) end
  local params = RaycastParams.new()
  params.FilterType = Enum.RaycastFilterType.Exclude
  params.FilterDescendantsInstances = {character,nativeFoundationSpawn}
  local groundHit = workspace:Raycast(rootPart.Position + Vector3.new(0, 4, 0), Vector3.new(0, -16, 0), params)
  local groundContact = groundHit ~= nil and groundHit.Instance ~= nil
  character:SetAttribute("GROUND_CONTACT", groundContact)
  -- Player-customized Roblox R15 characters retain their genuine clothes,
  -- accessories, joints and original animation controller.
  local isR15 = humanoid.RigType == Enum.HumanoidRigType.R15
  character:SetAttribute("R15_AVATAR_READY", isR15)
  character:SetAttribute("NativeAvatarRig", isR15 and "R15" or "R15_REQUIRED")
  character:SetAttribute("MOVEMENT_CONFIRMED", true)
end
local function bindNativeFoundationPlayer(player)
  player.RespawnLocation = nativeFoundationSpawn
  if player.Character then task.defer(bindNativeFoundationCharacter, player.Character) end
  player.CharacterAdded:Connect(function(character)
    player.RespawnLocation = nativeFoundationSpawn
    bindNativeFoundationCharacter(character)
  end)
end
Players.PlayerAdded:Connect(bindNativeFoundationPlayer)
for _, nativeFoundationPlayer in ipairs(Players:GetPlayers()) do
  task.defer(bindNativeFoundationPlayer, nativeFoundationPlayer)
end
nativeFoundationRemote.OnServerEvent:Connect(function(player, signal)
  if typeof(signal) ~= "string" then return end
  player:SetAttribute("NativeFoundationReadyAt", os.time())
end)
-- 서버 종료 시에도 저장된 프로필만 보호한다. 임시 세션은 저장 금지.
game:BindToClose(function()
  local players = Players:GetPlayers()
  local remaining = #players
  if remaining == 0 then return end
  for _,player in ipairs(players) do
    task.spawn(function()
      saveSurvivalProgress(player)
      remaining -= 1
    end)
  end
  local started = os.clock()
  while remaining > 0 and os.clock() - started < 12 do task.wait(.1) end
end)
