-- 파일명: roblox-games/fantasy-survival/server/Game.server.luau
local Players = game:GetService("Players")
-- [스폰: 캐릭터 소실 방지] 서버 초기화가 늦거나 실패해도 엔진의 기본 아바타 생성을 차단하지 않는다.
-- 기존 SpawnLocation은 Rojo 프로젝트에 미리 존재하고, 서버는 지면 생성 후 실제 착지를 보정한다.
Players.CharacterAutoLoads = true
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
local comboChain = {}
local MAX_ENEMIES = 30
-- [위쳐식 몬스터 분류·오일] 분류별 오일(8번 퀵슬롯)을 바르면 15회 타격이 해당 분류에 1.5배 피해.
local meadowOil={
  classOf={beastman="beast",wolf="beast",raptor="beast",toad="beast",chieftain="beast",yeti="beast",keltir="beast",
    spider="arachnid",fangspider="arachnid",bladespider="arachnid",
    orc="human",skullorc="human",goblin="human",goblinscout="human",tribal="human",assassin="human",
    demon="demon",frostfiend="demon",
    fox="beast",husky="beast",bull="beast",horse="beast",stag="beast",deer="beast",donkey="beast",snake="beast",snakeangry="beast",rat="beast",wasp="arachnid",
    mage="human",rogue="human",roguehooded="human",knight="human",barbarian="human",king="human",adventurer="human",punk="human",farmer="human",
    witch="human",womansoldier="human",womanmedieval="human",knightchar="human",
    skmage="demon",skwarrior="demon",skrogue="demon",skminion="demon",spiritgolem="demon",
    ghost="demon",ghostskull="demon",wingdemon="demon",dragon="beast",dragonlite="beast",hywirl="demon",
    birb="beast",cactoro="beast",fish="beast",monkroose="beast",ninja="human"},
  kindClass={wolf="beast",bat="beast",ghost="demon",bee="arachnid"},
  names={beast="야수 오일",arachnid="거미 오일",human="인간형 오일",demon="퇴마 오일"},
  recipes={beast={{"Hide",1},{"Fang",1}},arachnid={{"Fang",1},{"Mushroom",1}},human={{"Ore",1},{"Hide",1}},demon={{"Magma",1},{"Crystal",1}}},
}
local nextEncounterCheck = 0
-- [지역 서식지] 마을 내부의 늑대를 외곽 숲으로 이동하고 골렘 출현 지점을 제거한다.
-- 기존 종별 체력·공격력·드랍·보상·저장 구조를 보존한다.
local meadowEncounterSites = {
  {id="wolf",atom="HEAD_CANINE",tier=1,height=3.15,position=Vector3.new(-324,3,-91)},
  {id="wolf",atom="HEAD_CANINE",tier=1,height=3.15,position=Vector3.new(324,3,-91)},
  -- [남쪽 숲 2곳/남쪽 양 끝/북동 구석] 기존 늑대 능력치는 유지하고 깊이별로 분산한다.
  {id="wolf",atom="HEAD_CANINE",tier=1,height=3.15,position=Vector3.new(-142,3,143)},
  {id="wolf",atom="HEAD_CANINE",tier=1,height=3.15,position=Vector3.new(143,3,148)},
  {id="wolf",atom="HEAD_CANINE",tier=1,height=3.15,position=Vector3.new(-307,3,292)},
  {id="wolf",atom="HEAD_CANINE",tier=1,height=3.15,position=Vector3.new(307,3,289)},
  {id="wolf",atom="HEAD_CANINE",tier=1,height=3.15,position=Vector3.new(318,3,-293)},
  -- [사용자 제거] 버섯 몬스터 서식지 4곳 폐쇄. 나머지 지역·몬스터 배치는 유지.
  -- [네 구석 밤의 생태] 기존 박쥐를 북서·북동·남동으로 펼치고 남서에도 서식시킨다.
  {id="bat",atom="WING_LEATHER",tier=4,height=3.15,position=Vector3.new(-298,3,-285)},
  {id="bat",atom="WING_LEATHER",tier=4,height=3.15,position=Vector3.new(297,3,-282)},
  {id="bat",atom="WING_LEATHER",tier=4,height=3.15,position=Vector3.new(274,3,268)},
  {id="bat",atom="WING_LEATHER",tier=4,height=3.15,position=Vector3.new(-273,3,265)},
  -- [사용자 제거] 해골 몬스터 서식지 3곳도 폐쇄. 저장·기존 나머지 몬스터 배치는 유지.
  -- [마을 의뢰] 우두머리 늑대는 마을 서쪽 외곽 숲에만 스폰한다.
  {id="wolf",atom="HEAD_CANINE",tier=1,height=4.8,position=Vector3.new(-321,3,-193),questIndex=1,alpha=true},
  -- [봉인 파편의 수호자] 우물 퀘스트(sera-join)가 요구하는 초원 명명 보스. 무작위 배치에서 빠질 수 있어 고정 위치에 둔다.
  {id="wolf",atom="HEAD_CANINE",model="barbarian",name="봉인 파편의 수호자",tier=3,height=6,hp=3,dmg=1.5,alpha=true,bonusBoss=true,named=true,zoneTag="meadow",
    drops={{"Crystal",1,2},{"Claw",.7,2},{"Hide",.9,2}},position=Vector3.new(-180,3,-70)},
  -- [초원 생태 야영지] 자원이 나는 곳에 그곳을 지키는 몹을 둔다(서브퀘 mine/den/batcave와 연결).
  -- 폐광 고블린: 광석 드랍. 소굴 늑대: 가죽·고기·송곳니. 동굴 박쥐: 날개·수정.
  {id="wolf",atom="HEAD_CANINE",model="roguehooded",name="폐광 약탈 고블린",tier=2,height=3,hp=1.1,dmg=.9,drops={{"Ore",.6,1},{"Hide",.3,1}},position=Vector3.new(198,3,-128)},
  {id="wolf",atom="HEAD_CANINE",model="roguehooded",name="폐광 약탈 고블린",tier=2,height=3,hp=1.1,dmg=.9,drops={{"Ore",.6,1},{"Hide",.3,1}},position=Vector3.new(214,3,-152)},
  {id="wolf",atom="HEAD_CANINE",model="roguehooded",name="폐광 고블린 두목",tier=3,height=4.2,hp=2.2,dmg=1.2,alpha=true,named=true,questBoss="mine",drops={{"Ore",1,4},{"Hide",.8,2}},position=Vector3.new(222,3,-150)},
  {id="wolf",atom="HEAD_CANINE",name="소굴의 어미 늑대",tier=3,height=5,alpha=true,named=true,questBoss="den",drops={{"Hide",1,4},{"Fang",1,2},{"Meat",1,3},{"Claw",.8,2}},position=Vector3.new(-255,3,55)},
  {id="wolf",atom="HEAD_CANINE",tier=2,height=3.15,position=Vector3.new(-240,3,72)},
  {id="wolf",atom="HEAD_CANINE",tier=2,height=3.15,position=Vector3.new(-268,3,44)},
  {id="bat",atom="WING_LEATHER",name="동굴의 큰박쥐",tier=4,height=4.4,alpha=true,named=true,questBoss="batcave",drops={{"BatWing",1,3},{"Crystal",1,2},{"Moonbloom",.6,1}},position=Vector3.new(258,3,240)},
  -- [요청: 원혼·도적 몹 삭제] 마을 안의 두 비정상 몬스터를 출현시키지 않는다.
  -- 기존 의뢰 번호와 처치 판정 비트는 보존하고, 실제 CC0 박쥐·늑대로 마을 밖에서 대체한다.
  {id="bat",atom="WING_LEATHER",tier=2,height=3.15,position=Vector3.new(300,3,-212),questIndex=2},
  {id="wolf",atom="HEAD_CANINE",tier=3,height=3.15,position=Vector3.new(-299,3,-233),questIndex=3},
  -- [초원 중간 지대 확장] 마을 남문에서 깊은 초원까지 거리에 따라 1~4단계 늑대 무리·박쥐 둥지를 배치해 동선과 퀘스트 난이도를 맞춘다.
  {id="wolf",atom="HEAD_CANINE",tier=1,height=3.15,position=Vector3.new(-95,3,95)},
  {id="wolf",atom="HEAD_CANINE",tier=1,height=3.15,position=Vector3.new(-83,3,103)},
  {id="wolf",atom="HEAD_CANINE",tier=1,height=3.15,position=Vector3.new(88,3,100)},
  {id="wolf",atom="HEAD_CANINE",tier=1,height=3.15,position=Vector3.new(100,3,92)},
  {id="wolf",atom="HEAD_CANINE",tier=1,height=3.15,position=Vector3.new(0,3,125)},
  {id="wolf",atom="HEAD_CANINE",tier=2,height=3.15,position=Vector3.new(-215,3,175)},
  {id="wolf",atom="HEAD_CANINE",tier=2,height=3.15,position=Vector3.new(-203,3,184)},
  {id="wolf",atom="HEAD_CANINE",tier=2,height=3.15,position=Vector3.new(212,3,178)},
  {id="wolf",atom="HEAD_CANINE",tier=2,height=3.15,position=Vector3.new(200,3,187)},
  {id="wolf",atom="HEAD_CANINE",tier=2,height=3.15,position=Vector3.new(0,3,195)},
  {id="bat",atom="WING_LEATHER",tier=2,height=3.15,position=Vector3.new(-60,3,205)},
  {id="bat",atom="WING_LEATHER",tier=2,height=3.15,position=Vector3.new(82,3,218)},
  {id="wolf",atom="HEAD_CANINE",tier=3,height=3.15,position=Vector3.new(-125,3,262)},
  {id="wolf",atom="HEAD_CANINE",tier=3,height=3.15,position=Vector3.new(-113,3,270)},
  {id="wolf",atom="HEAD_CANINE",tier=3,height=3.15,position=Vector3.new(122,3,266)},
  {id="wolf",atom="HEAD_CANINE",tier=3,height=3.15,position=Vector3.new(110,3,274)},
  {id="wolf",atom="HEAD_CANINE",tier=4,height=3.6,position=Vector3.new(0,3,305)},
  {id="bat",atom="WING_LEATHER",tier=3,height=3.15,position=Vector3.new(-232,3,243)},
  {id="bat",atom="WING_LEATHER",tier=3,height=3.15,position=Vector3.new(231,3,238)},
  {id="wolf",atom="HEAD_CANINE",tier=2,height=3.15,position=Vector3.new(-312,3,40)},
  {id="wolf",atom="HEAD_CANINE",tier=2,height=3.15,position=Vector3.new(-300,3,52)},
  {id="wolf",atom="HEAD_CANINE",tier=2,height=3.15,position=Vector3.new(312,3,44)},
  {id="wolf",atom="HEAD_CANINE",tier=2,height=3.15,position=Vector3.new(300,3,56)},
  {id="wolf",atom="HEAD_CANINE",tier=2,height=3.15,position=Vector3.new(-306,3,125)},
  {id="wolf",atom="HEAD_CANINE",tier=2,height=3.15,position=Vector3.new(306,3,128)},
}
-- [마을 안전 경계] 16채의 주거·농가·성문 주변을 포함하는 서버 소유 X/Z 구역.
-- 늑대만 제한하며 기존 원혼·도적 의뢰 전투는 그대로 허용한다.
local function meadowVillageContains(position)
  return position.X>=-280 and position.X<=280
    and position.Z>=-351 and position.Z<=-42
end
-- Roblox Terrain is native collidable terrain, never an assembled visual Part.
-- All meadow vegetation and animals must come from the game's registered CC0 meshes.
-- [다크 판타지 숲] 원본 CC0 메시·텍스처를 보존하는 공통 저채도 팔레트.
local meadowPalette={
  -- [위처풍] 축축한 이끼·흙·풍화석과 검은 수관의 색을 기존 지형과 원본 나무에 적용한다.
  -- [모바일 화면 검증 보정] 검은 바닥 대신 축축한 초록 잔디·갈색 흙·회색 석재를 읽히게 한다.
  grass=Color3.fromRGB(108,120,91),leafyGrass=Color3.fromRGB(83,107,79),
  ground=Color3.fromRGB(119,100,83),rock=Color3.fromRGB(104,106,100),
  bark=Color3.fromRGB(84,72,60),leaves=Color3.fromRGB(75,100,76),
  -- [몹 고유색] 전부 회색·흰색으로 보이던 단색을 종별 자연색으로 바꾼다.
  wolf=Color3.fromRGB(92,74,60),boar=Color3.fromRGB(122,82,58),
  deer=Color3.fromRGB(178,116,68),rabbit=Color3.fromRGB(158,124,90),
  bee=Color3.fromRGB(236,184,58),bat=Color3.fromRGB(74,62,60),
  golem=Color3.fromRGB(112,138,104),
  ghost=Color3.fromRGB(131,210,226),bandit=Color3.fromRGB(111,76,67),
}
local meadowTerrain = workspace.Terrain
-- [초원 오픈월드] 플레이 시작 부분 312x312은 먼저 만들고 696x696 외곽은 이후 분할 생성한다.
-- 면적 약 4.98배. 시작/적/자원 좌표 및 전투 수치를 옮기지 않는다.
local meadowWorldSize=696
local function createStartingMeadow()
  -- [실제 지면 표현] Roblox Terrain 기본 재질을 재사용한다.
  -- Decoration 속성은 서버 Script에서 변경할 수 없으므로 건드리지 않는다.
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
  -- [초원 자연색] 원래 Terrain만 이용해 습지와 마른 강가 재질을 구별한다.
  meadowTerrain:SetMaterialColor(Enum.Material.Mud,Color3.fromRGB(91,82,70))
  meadowTerrain:SetMaterialColor(Enum.Material.Sand,Color3.fromRGB(147,131,105))
  -- Existing stone gathering sites are terrain outcrops, not fake rock parts.
  for _, pos in ipairs({Vector3.new(-35,2,31),Vector3.new(11,2,-39),Vector3.new(-7,2,43)}) do
    meadowTerrain:FillBall(pos-Vector3.new(0,4.5,0),5,Enum.Material.Rock)
  end
  -- [위처풍 자연광] 기본 캐릭터·모바일 시야를 보존하며 숲 그림자와 석재의 입체감을 강화한다.
  Lighting.ClockTime = 10.5
  Lighting.Brightness = 2
  Lighting.Ambient = Color3.fromRGB(104,112,110)
  Lighting.OutdoorAmbient = Color3.fromRGB(148,153,134)
  Lighting.EnvironmentDiffuseScale=.94
  Lighting.EnvironmentSpecularScale=.18
  Lighting.GlobalShadows=true
  Lighting.ShadowSoftness=.27
  Lighting.ExposureCompensation=.07
  gameWorld:SetAttribute("StartingRegion", "MEADOW")
  gameWorld:SetAttribute("GroundVisualSource", "ROBLOX_NATIVE_TERRAIN")
  gameWorld:SetAttribute("MeadowVisualStyle", "DARK_MEDIEVAL_FOREST_CC0_NATIVE_V6")
  gameWorld:SetAttribute("MeadowRegionWidth",meadowWorldSize)
  gameWorld:SetAttribute("MeadowRegionAreaScale",math.floor((meadowWorldSize/312)^2*100)/100)
  gameWorld:SetAttribute("MeadowOuterRegionReady",false)
end
createStartingMeadow()
-- [스폰 선연결] 외부 모델 로딩 전에 기존 스폰·캐릭터 연결을 준비한다.
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
-- [제1마을 실제 등장] 처음 접속/부활 위치는 초원 마을 북쪽 흙길.
-- 저장된 이어하기 위치는 기존 MeadowResumeReady 복구가 우선하며 변경하지 않는다.
nativeFoundationSpawn.Position = Vector3.new(0, 3, -75)
nativeFoundationSpawn.Anchored = true
nativeFoundationSpawn.Enabled = true
nativeFoundationSpawn.CanCollide = true
nativeFoundationSpawn.CanTouch = false
nativeFoundationSpawn.CanQuery = false
nativeFoundationSpawn.Neutral = true
nativeFoundationSpawn.Material = table.find(studioMaterialAtoms, "METAL") and Enum.Material.Metal or Enum.Material.Plastic

local function bindNativeFoundationCharacter(character)
  local humanoid = character:WaitForChild("Humanoid", 10)
  local rootPart = character:WaitForChild("HumanoidRootPart", 10)
  local player = Players:GetPlayerFromCharacter(character)
  if not humanoid or not rootPart or not player or player.Character ~= character
    or humanoid.Health <= 0 then return end
  -- [실제 착지] CharacterAdded는 로블록스가 아바타를 Workspace에 놓고
  -- 최종 스폰 좌표를 적용하기 전에 실행된다. 엔진 배치를 마친 다음 지면 보정을 수행한다.
  local spawnDeadline = os.clock() + 15
  while character.Parent ~= workspace and player.Character == character
    and humanoid.Health > 0 and os.clock() < spawnDeadline do
    task.wait()
  end
  if character.Parent ~= workspace or player.Character ~= character
    or humanoid.Health <= 0 then return end
  RunService.Heartbeat:Wait()
  RunService.Heartbeat:Wait()
  if player.Character ~= character or humanoid.Health <= 0 then return end
  rootPart.Anchored = false
  rootPart.AssemblyLinearVelocity = Vector3.zero
  rootPart.AssemblyAngularVelocity = Vector3.zero
  humanoid.PlatformStand = false
  humanoid.Sit = false
  humanoid.AutoRotate = true
  -- [하늘 스폰 복구] 엔진의 빈 공간/모델 상단 자동 배치 대신 실제 마을 지면에 놓는다.
  -- 이미 복원된 이어하기 캐릭터는 이동시키지 않는다. 지붕·수관·장비는 지면 판정에서 제외한다.
  local params = RaycastParams.new()
  params.FilterType = Enum.RaycastFilterType.Include
  params.FilterDescendantsInstances = {meadowTerrain}
  params.IgnoreWater = true
  if character:GetAttribute("MeadowResumeApplied") ~= true then
    local spawnPosition = nativeFoundationSpawn.Position
    local spawnHit
    for attempt=1,10 do
      if player.Character~=character or humanoid.Health<=0 then return end
      spawnHit = workspace:Raycast(Vector3.new(spawnPosition.X, 44, spawnPosition.Z),
        Vector3.new(0, -110, 0), params)
      if spawnHit and spawnHit.Normal.Y>=.65 then break end
      if attempt<10 then task.wait(.2) end
    end
    if spawnHit and spawnHit.Normal.Y >= .65 then
      local leg = character:FindFirstChild("Left Leg")
      local legHeight = humanoid.RigType == Enum.HumanoidRigType.R6 and leg and leg.Size.Y or 0
      local clearance = humanoid.HipHeight + rootPart.Size.Y * .5 + legHeight + .15
      -- [엔진 최종 배치 보정] 첫 위치는 즉시 고정하고, 늦은 배치로 공중에 뜨면 재착지한다.
      -- 이미 지면에 착지해 움직이는 플레이어와 저장된 이어하기 위치는 다시 이동시키지 않는다.
      for attempt=1,5 do
        if player.Character~=character or humanoid.Health<=0
          or character:GetAttribute("MeadowResumeApplied")==true then break end
        local height=rootPart.Position.Y-spawnHit.Position.Y
        if attempt==1 or height>clearance+9 or height<clearance-5 then
          rootPart.CFrame = CFrame.new(spawnPosition.X, spawnHit.Position.Y + clearance, spawnPosition.Z)
            * rootPart.CFrame.Rotation
          rootPart.AssemblyLinearVelocity = Vector3.zero
          rootPart.AssemblyAngularVelocity = Vector3.zero
        end
        if attempt<5 then task.wait(.25) end
      end
    else
      -- 최초 기본 출현은 엔진에 맡긴다. 충돌 가능한 기본 SpawnLocation은 유지한다.
      warn("MEADOW_SPAWN_GROUND_UNVERIFIED")
    end
  end
  local groundHit = workspace:Raycast(rootPart.Position + Vector3.new(0, 1, 0),
    Vector3.new(0, -16, 0), params)
  local groundContact = groundHit ~= nil and groundHit.Normal.Y >= .65
  character:SetAttribute("GROUND_CONTACT", groundContact)
  -- Player-customized Roblox R15 characters retain their genuine clothes,
  -- accessories, joints and original animation controller.
  local isR15 = humanoid.RigType == Enum.HumanoidRigType.R15
  character:SetAttribute("R15_AVATAR_READY", isR15)
  character:SetAttribute("NativeAvatarRig", isR15 and "R15" or "R15_REQUIRED")
  character:SetAttribute("MOVEMENT_CONFIRMED", true)
  -- [캐릭터 이동 이펙트] 기존 R15 발걸음에 젖은 흙먼지를 작게 남긴다.
  -- Roblox 기본 입자 텍스처·Attachment만 사용하며 새 건축 파츠나 외부 모델을 만들지 않는다.
  -- 대기 중에는 입자를 끄고, 걷기/달리기 중에만 저밀도로 출력한다.
  if isR15 and not rootPart:FindFirstChild("MeadowFootstepDustOrigin") then
    local origin=Instance.new("Attachment")
    origin.Name="MeadowFootstepDustOrigin"
    origin.Position=Vector3.new(0,-2.65,0)
    origin.Parent=rootPart
    local dust=Instance.new("ParticleEmitter")
    dust.Name="MeadowNativeFootstepDust"
    dust.Texture="rbxasset://textures/particles/smoke_main.dds"
    dust.Color=ColorSequence.new(Color3.fromRGB(135,118,100))
    dust.Transparency=NumberSequence.new({
      NumberSequenceKeypoint.new(0,.65),
      NumberSequenceKeypoint.new(1,1),
    })
    dust.Size=NumberSequence.new({
      NumberSequenceKeypoint.new(0,.22),
      NumberSequenceKeypoint.new(1,.62),
    })
    dust.Lifetime=NumberRange.new(.25,.48)
    dust.Speed=NumberRange.new(.25,.65)
    dust.Drag=2
    dust.SpreadAngle=Vector2.new(30,30)
    dust.Rate=0
    dust.Enabled=true
    dust.Parent=origin
    humanoid.Running:Connect(function(speed)
      if dust.Parent then
        dust.Rate=humanoid.Health>0 and speed>3 and 2.5 or 0
      end
    end)
    humanoid.Died:Connect(function()
      if dust.Parent then dust.Rate=0 end
    end)
  end
end
local function bindNativeFoundationPlayer(player)
  player.RespawnLocation = nativeFoundationSpawn
  -- [오프닝 망토] 캐릭터가 생성된 바로 그 회차에서 기본 외형 로딩을 기다린다.
  -- CharacterAppearanceLoaded만 기다리면 기존 캐릭터나 빨리 로딩된 캐릭터를 놓칠 수 있다.
  -- [마력숲 낡은 붉은 망토] 기존 프로젝트가 소유한 3D 찢어진 메시를 원본 에셋 경로에서 장착한다.
  -- 등록/Universe 권한이 없으면 가짜 Part·유료 카탈로그·평평한 패널로 대체하지 않는다.
  -- 캐릭터 외형만 변경하고 기존 착용 장비·저장 구조·게임 규칙은 손대지 않는다.
  -- [머리 외형] 착용 중인 모자류만 제거한다. 머리카락·얼굴·옷은 유지한다.
  local function clearUnwantedHeadwear(character)
    for _,item in ipairs(character:GetChildren()) do
      if item:IsA("Accessory") and item.Name~="MeadowWornCrimsonCape"
        and item.AccessoryType==Enum.AccessoryType.Hat
        and not item:FindFirstChild("HairAttachment",true)
        and not string.lower(item.Name):find("hair",1,true) then
        item:Destroy()
      end
    end
  end
  -- [망토 원본] 기존 등록 소유 3D 메시를 머리 액세서리가 아닌 몸통 직접 Weld로 장착한다.
  -- Roblox 자동 액세서리 머리 부착을 차단하고, R15/R6 개인 아바타를 모두 지원한다.
  local function applyOpeningCape(character)
    local humanoid=character:WaitForChild("Humanoid",10)
    if player.Character~=character or not humanoid or humanoid.Health<=0 then return end
    local deadline=os.clock()+9
    while player.Character==character and not player:HasAppearanceLoaded()
      and os.clock()<deadline do task.wait(.15) end
    if player.Character~=character or humanoid.Health<=0 then return end
    clearUnwantedHeadwear(character)
    local torso=character:FindFirstChild("UpperTorso") or character:FindFirstChild("Torso")
    if not torso or not torso:IsA("BasePart") then
      character:SetAttribute("OpeningCapeAttached",false)
      character:SetAttribute("OpeningCapeState","TORSO_MISSING")
      warn("마력숲 망토 장착 불가: 캐릭터 몸통 없음")
      return
    end
    local capeKey=Config.OpeningCapeModelKey
    local capeId=type(capeKey)=="string" and NativeCreatureAssets[capeKey] or nil
    if typeof(capeId)~="number" or capeId<=0 then
      character:SetAttribute("OpeningCapeAttached",false)
      character:SetAttribute("OpeningCapeState","REGISTERED_OWNER_MESH_MISSING")
      warn("마력숲 헤진 망토 등록/Universe 승인 ID 없음: "..tostring(capeKey))
      return
    end
    local oldCape=character:FindFirstChild("MeadowWornCrimsonCape")
    if oldCape and oldCape:IsA("Model")
      and oldCape:GetAttribute("MeadowOwnerOriginalCape")==true then
      local handle=oldCape:FindFirstChild("Handle")
      local weld=handle and handle:FindFirstChild("AccessoryWeld")
      if handle and handle:IsA("MeshPart") and handle.Transparency<1
        and weld and weld:IsA("Weld") and weld.Part0==torso and weld.Part1==handle then
        character:SetAttribute("OpeningCapeAttached",true)
        character:SetAttribute("OpeningCapeState","ATTACHED")
        return
      end
    end
    if oldCape then oldCape:Destroy() end
    character:SetAttribute("OpeningCapeAttached",false)
    character:SetAttribute("OpeningCapeState","LOADING")
    local lastReason="UNKNOWN"
    for attempt=1,3 do
      if player.Character~=character or humanoid.Health<=0 then return end
      local loadedModel,cape,attached=nil,nil,false
      local ok,reason=pcall(function()
        -- [검증된 소유 모델] 92370050558893 원본만 로딩한다. 프리미티브나 대체 망토 금지.
        loadedModel=AssetService:LoadAssetAsync(capeId)
        if not loadedModel or not loadedModel:IsA("Model") then
          error("WORN_CAPE_NATIVE_MODEL_LOAD_FAILED")
        end
        local handle=loadedModel:FindFirstChildWhichIsA("MeshPart",true)
        if not handle or handle.MeshId=="" then
          error("WORN_CAPE_REAL_MESHPART_MISSING")
        end
        local meshCount=0
        for _,item in ipairs(loadedModel:GetDescendants()) do
          if item:IsA("MeshPart") then meshCount+=1 end
          if item:IsA("LuaSourceContainer") or item:IsA("RemoteEvent")
            or item:IsA("RemoteFunction") or item:IsA("Tool") then
            item:Destroy()
          end
        end
        if meshCount<1 then error("WORN_CAPE_IMPORT_MESH_COUNT_INVALID:"..meshCount) end
        if handle.Size.Y<=.001 then
          error("WORN_CAPE_REAL_SIZE_INVALID:"..tostring(handle.Size.Y))
        end
        -- [스케일 보정] GLB 길이를 스터드로 정규화한다. 기존 실물 메시와 찢어진 밑단은 유지.
        local capeScale=1.52/handle.Size.Y
        handle.Size=handle.Size*capeScale
        -- [등 장착] 캐릭터가 가진 뒤쪽 어태치먼트, 없으면 현재 몸통의 등 위치.
        local back=torso:FindFirstChild("BodyBackAttachment")
        local backFrame=back and back:IsA("Attachment") and back.CFrame
          or CFrame.new(0,torso.Size.Y*.26,torso.Size.Z*.5)
        cape=Instance.new("Model")
        cape.Name="MeadowWornCrimsonCape"
        handle.Name="Handle"
        -- 수동 장착만 사용한다. Accessory로 캐릭터에 넣으면 Roblox가 머리에 붙일 수 있다.
        handle.Parent=cape
        for _,extra in ipairs(loadedModel:GetDescendants()) do
          if extra:IsA("MeshPart") and extra~=handle then
            extra.Anchored=false;extra.CanCollide=false;extra.CanTouch=false;extra.CanQuery=false;extra.Massless=true
            local keep=Instance.new("WeldConstraint");keep.Part0=handle;keep.Part1=extra;keep.Parent=extra
            extra.Parent=cape
          end
        end
        local previousWeld=handle:FindFirstChild("AccessoryWeld")
        if previousWeld then previousWeld:Destroy() end
        handle.Anchored=false
        handle.CanCollide=false
        handle.CanTouch=false
        handle.CanQuery=false
        handle.Massless=true
        handle.Transparency=0
        handle.DoubleSided=true
        handle.Reflectance=0
        -- [망토 색] 임포트로 붙은 검정/흰 텍스처·PBR이 천을 까맣게 만든다. 원본 메시는 그대로 두고 진홍색만 지정한다.
        for _,item in ipairs(cape:GetDescendants()) do
          if item:IsA("MeshPart") then
            if item.TextureID~="" then item.TextureID="" end
            local pbr=item:FindFirstChildOfClass("SurfaceAppearance")
            if pbr then pbr:Destroy() end
            item.Color=Color3.fromRGB(158,32,40)
            -- 조명 방향과 무관하게 진홍색이 보이도록 평면 발색 재질을 쓴다(검게 죽던 뒷면 문제 방지).
            item.Material=Enum.Material.Neon
            item.Color=Color3.fromRGB(128,22,30)
          end
        end
        -- [실제 3D 천] 어깨 윗선이 등 위쪽에 닿고, 네 군데 찢어진 밑단은 엉덩이까지.
        local weld=Instance.new("Weld")
        weld.Name="AccessoryWeld" -- 기존 클라이언트 펄럭임 관절 이름을 유지한다.
        weld.Part0=torso
        weld.Part1=handle
        weld.C0=backFrame*CFrame.new(0,.08,.12)
        weld.C1=CFrame.new(0,handle.Size.Y*.48,0)*CFrame.Angles(0,math.pi,0)
        handle.CFrame=torso.CFrame*weld.C0*weld.C1:Inverse()
        weld.Parent=handle
        cape.PrimaryPart=handle
        cape:SetAttribute("MeadowCrimsonWornCape",true)
        cape:SetAttribute("MeadowOwnerOriginalCape",true)
        cape:SetAttribute("MeadowCapeMeshCount",meshCount)
        cape:SetAttribute("MeadowCapeHemTears",4)
        cape:SetAttribute("MeadowCapeLength","HIP_LENGTH")
        cape.Parent=character
        loadedModel:Destroy()
        loadedModel=nil
        attached=player.Character==character and cape.Parent==character
          and weld.Part0==torso and weld.Part1==handle
          and handle:IsDescendantOf(character)
        if not attached then error("WORN_CAPE_TORSO_WELD_ATTACH_FAILED") end
      end)
      if loadedModel then loadedModel:Destroy() end
      if not ok and cape then cape:Destroy() end
      if player.Character~=character or humanoid.Health<=0 then return end
      if ok and attached then
        character:SetAttribute("OpeningCapeAttached",true)
        character:SetAttribute("OpeningCapeState","ATTACHED")
        print("마력숲 망토 등 장착: 등록 원본 3D / 엉덩이 길이 / 몸통 직접 Weld / ID="..capeId)
        return
      end
      lastReason=tostring(reason)
      character:SetAttribute("OpeningCapeReason",string.sub(lastReason,1,80))
      if attempt<3 then
        character:SetAttribute("OpeningCapeState","RETRYING")
        task.wait(attempt*1.5)
      end
    end
    character:SetAttribute("OpeningCapeAttached",false)
    character:SetAttribute("OpeningCapeState","LOAD_FAILED")
    warn("마력숲 망토 등 장착 3회 실패: "..lastReason)
  end
  local function onCharacterAdded(character)
    player.RespawnLocation = nativeFoundationSpawn
    -- [리스폰] 엔진이 동일 SpawnLocation에서 자동 재생성한다.
    -- 기본 부활 시간 이후에도 새 아바타가 없을 때만 기존 서버 생성 API로 복구한다.
    local respawnHumanoid = character:WaitForChild("Humanoid", 10)
    if respawnHumanoid then
      respawnHumanoid.Died:Connect(function()
        task.delay(Players.RespawnTime+5, function()
          if player.Parent~=Players then return end
          local current=player.Character
          if current and current~=character then return end
          if current==character and respawnHumanoid.Health>0 then return end
          local recovered, reason = pcall(function() player:LoadCharacterAsync() end)
          if not recovered then warn("SURVIVAL_RESPAWN_RECOVERY_FAILED: "..tostring(reason)) end
        end)
      end)
    end
    bindNativeFoundationCharacter(character)
    -- 스폰·부활 모두 외형 로딩 경로를 보존한 뒤 한 번만 망토 착용을 시도한다.
    task.spawn(applyOpeningCape, character)
  end
  player.CharacterAdded:Connect(onCharacterAdded)
  -- [리스폰/늦은 아바타 로딩] 뒤늦게 추가된 모자도 정리하며 머리카락은 보존한다.
  player.CharacterAppearanceLoaded:Connect(function(character)
    if player.Character==character then clearUnwantedHeadwear(character) end
  end)
  if player.Character then
    task.defer(onCharacterAdded, player.Character)
  end
  -- [최초 등장] 모델 존재만으로 완료 처리하지 않고 살아 있는 실제 몸체를 확인한다.
  -- 지면 보정은 기존 CharacterAdded 경로가 담당하며 생성 실패와 별도로 처리한다.
  task.delay(8,function()
    for attempt=1,3 do
      if player.Parent~=Players then return end
      local character=player.Character
      local humanoid=character and character:FindFirstChildOfClass("Humanoid")
      local root=character and character:FindFirstChild("HumanoidRootPart")
      if player:GetAttribute("MeadowEnteredWorld")==true or (humanoid and humanoid.Health<=0) then return end
      if character and character:IsDescendantOf(workspace) and humanoid
        and humanoid.Health>0 and root then return end
      if player:GetAttribute("MeadowSpawnRecoveryBusy")~=true then
        player:SetAttribute("MeadowSpawnRecoveryBusy",true)
        player:SetAttribute("MeadowSpawnRecoveryAt",os.clock())
        player.RespawnLocation=nativeFoundationSpawn
        local spawned,reason=pcall(function() player:LoadCharacterAsync() end)
        player:SetAttribute("MeadowSpawnRecoveryBusy",false)
        if not spawned then
          warn("MEADOW_INITIAL_CHARACTER_LOAD_FAILED: "..tostring(reason))
        end
      end
      if attempt<3 then task.wait(8) end
    end
  end)
end
Players.PlayerAdded:Connect(bindNativeFoundationPlayer)
for _, nativeFoundationPlayer in ipairs(Players:GetPlayers()) do
  task.defer(bindNativeFoundationPlayer, nativeFoundationPlayer)
end
nativeFoundationRemote.OnServerEvent:Connect(function(player, signal)
  if typeof(signal) ~= "string" then return end
  if signal=="CHARACTER_RECOVERY" then
    -- [시작 복구] 서버가 실제 캐릭터 부재를 확인한 경우에만 기존 아바타 생성 API를 호출한다.
    -- 정상 캐릭터·이어하기 위치는 유지하고 반복 요청과 동시 생성을 차단한다.
    local character=player.Character
    local humanoid=character and character:FindFirstChildOfClass("Humanoid")
    local root=character and character:FindFirstChild("HumanoidRootPart")
    if player:GetAttribute("ProfileReady")~=true or (humanoid and humanoid.Health<=0) then return end
    if character and character:IsDescendantOf(workspace) and humanoid
      and humanoid.Health>0 and root then return end
    if player:GetAttribute("MeadowSpawnRecoveryBusy")==true then return end
    local now=os.clock()
    if now-(player:GetAttribute("MeadowSpawnRecoveryAt") or -100)<8 then return end
    player:SetAttribute("MeadowSpawnRecoveryAt",now)
    player:SetAttribute("MeadowSpawnRecoveryBusy",true)
    task.spawn(function()
      if player.Parent==Players then
        player.RespawnLocation=nativeFoundationSpawn
        local spawned,reason=pcall(function() player:LoadCharacterAsync() end)
        if not spawned then warn("MEADOW_REQUESTED_CHARACTER_LOAD_FAILED: "..tostring(reason)) end
      end
      if player.Parent==Players then player:SetAttribute("MeadowSpawnRecoveryBusy",false) end
    end)
    return
  end
  player:SetAttribute("NativeFoundationReadyAt", os.time())
end)
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
meadowAtmosphere.Color=Color3.fromRGB(150,161,158)
meadowAtmosphere.Decay=Color3.fromRGB(75,84,88)
meadowAtmosphere.Glare=.025
-- [시간대 색감] Roblox 기존 Lighting 효과 1개만 사용해 숲의 계절감과 아침/저녁 온도를 부여.
local meadowColorGrade=Lighting:FindFirstChild("MeadowColorGrade")
if meadowColorGrade and not meadowColorGrade:IsA("ColorCorrectionEffect") then
  meadowColorGrade:Destroy()
  meadowColorGrade=nil
end
if not meadowColorGrade then
  meadowColorGrade=Instance.new("ColorCorrectionEffect")
  meadowColorGrade.Name="MeadowColorGrade"
  meadowColorGrade.Parent=Lighting
end
meadowColorGrade.Enabled=true
meadowColorGrade.Brightness=.035
meadowColorGrade.Contrast=.17
meadowColorGrade.Saturation=.025
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
  local damp=weather=="STORM" and .72 or weather=="RAIN" and .83
    or weather=="FOG" and .9 or weather=="SNOW" and .87 or 1
  -- [날씨+시야] 흐린 아침도 어두운 검정 바닥으로 뭉개지지 않도록 환경광 보존.
  local brightness=math.max(1.15,(1.08+1.18*sun)*damp)
  local lightColor=Color3.fromRGB(93,102,110):Lerp(Color3.fromRGB(151,158,146),sun)
  local airColor=Color3.fromRGB(119,139,156):Lerp(Color3.fromRGB(181,192,178),sun)
  if weather=="STORM" or weather=="RAIN" then
    lightColor=lightColor:Lerp(Color3.fromRGB(74,86,99),weather=="STORM" and .6 or .35)
    airColor=airColor:Lerp(Color3.fromRGB(104,115,125),weather=="STORM" and .68 or .4)
  end
  Lighting.ClockTime=hour
  Lighting.Brightness=brightness
  Lighting.Ambient=lightColor
  Lighting.OutdoorAmbient=airColor
  Lighting.FogColor=airColor
  Lighting.FogStart=weather=="FOG" and 45 or weather=="STORM" and 75
    or weather=="RAIN" and 100 or 140
  Lighting.FogEnd=weather=="FOG" and 265 or weather=="STORM" and 450
    or weather=="RAIN" and 630 or 980
  -- [원근감] 수관 뒤는 옅게, 비/안개에는 서서히 짙게. 근처 적 시야는 보존한다.
  local forestAirDensity=weather=="FOG" and .40 or weather=="STORM" and .34
    or weather=="RAIN" and .30 or weather=="SNOW" and .26 or .23
  local forestHaze=weather=="FOG" and 2.1 or weather=="STORM" and 1.65 or 1.25
  meadowAtmosphere.Density+=(forestAirDensity-meadowAtmosphere.Density)*.12
  meadowAtmosphere.Haze+=(forestHaze-meadowAtmosphere.Haze)*.12
  meadowAtmosphere.Color=meadowAtmosphere.Color:Lerp(
    airColor:Lerp(meadowPalette.leaves,.11),.12)
  -- [중세 숲] 낮의 푸른 먹구름과 황혼의 따뜻한 등불 색 대비를 표현한다.
  local tint=hour>=16.5 and hour<20.5 and Color3.fromRGB(231,206,179)
    or period=="NIGHT" and Color3.fromRGB(172,193,219)
    or period=="DAWN" and Color3.fromRGB(211,215,195)
    or Color3.fromRGB(221,231,220)
  if weather=="STORM" or weather=="RAIN" then
    tint=tint:Lerp(Color3.fromRGB(173,195,210),weather=="STORM" and .38 or .2)
  end
  meadowColorGrade.TintColor=meadowColorGrade.TintColor:Lerp(tint,.12)
  local desiredContrast=weather=="FOG" and .10 or .17
  local desiredSaturation=weather=="FOG" and -.06 or .025
  meadowColorGrade.Contrast+=(desiredContrast-meadowColorGrade.Contrast)*.12
  meadowColorGrade.Saturation+=(desiredSaturation-meadowColorGrade.Saturation)*.12
  local cover=weather=="STORM" and .96 or weather=="RAIN" and .88
    or weather=="FOG" and .80 or weather=="SNOW" and .82 or .53
  local density=weather=="STORM" and .87 or weather=="RAIN" and .76
    or weather=="FOG" and .69 or weather=="SNOW" and .70 or .41
  local smooth=.12
  meadowClouds.Cover=meadowClouds.Cover+(cover-meadowClouds.Cover)*smooth
  meadowClouds.Density=meadowClouds.Density+(density-meadowClouds.Density)*smooth
  meadowClouds.Color=meadowClouds.Color:Lerp(
    weather=="STORM" and Color3.fromRGB(78,88,99)
      or weather=="RAIN" and Color3.fromRGB(116,132,137)
      or weather=="SNOW" and Color3.fromRGB(177,189,189)
      or Color3.fromRGB(158,171,165),smooth)
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
  -- [지형 굴곡 대응] 지형이 평평한 기준(높이 2)보다 높거나 낮은 곳이면 소품을 지표에 맞춰 올리고 내린다.
  do
    local rp=RaycastParams.new()
    rp.FilterType=Enum.RaycastFilterType.Include
    rp.FilterDescendantsInstances={workspace.Terrain}
    local hit=workspace:Raycast(Vector3.new(location.X,400,location.Z),Vector3.new(0,-800,0),rp)
    if hit and math.abs(hit.Position.Y-2)>.5 and hit.Position.Y>-3 then
      location=location+Vector3.new(0,hit.Position.Y-2,0)
    end
  end
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
    -- [사슴 46본] 몸통·전후 네 발의 실제 관절축으로 세워서 원본 리그를 보존한다.
    -- 머리 위치만으로 전방을 추측하면 목이 높은 사슴이 옆으로 눕는 현상을 방지한다.
    local deerAlignment=nil
    if id=="deer" then
      local head,body=nil,nil
      local frontFeet,backFeet=Vector3.zero,Vector3.zero
      local frontCount,backCount=0,0
      for _,bone in ipairs(clone:GetDescendants()) do
        if bone:IsA("Bone") then
          local name=bone.Name:lower()
          if name=="head" then head=bone.WorldPosition
          elseif name=="torso" then body=bone.WorldPosition end
          if name=="frontlowerleg.l" or name=="frontlowerleg.r" then
            frontFeet+=bone.WorldPosition;frontCount+=1
          elseif name=="backlowerleg.l" or name=="backlowerleg.r" then
            backFeet+=bone.WorldPosition;backCount+=1
          end
        end
      end
      if not head or not body or frontCount~=2 or backCount~=2 then
        clone:Destroy();error("MEADOW_DEER_ANIMATED_QUADRUPED_RIG_REQUIRED")
      end
      local pivot=clone:GetPivot()
      local up=pivot:VectorToObjectSpace(body-(frontFeet+backFeet)*.25)
      local towardFront=pivot:VectorToObjectSpace((frontFeet-backFeet)*.5)
      if up.Magnitude<.15 then clone:Destroy();error("MEADOW_DEER_GROUND_AXIS_INVALID") end
      up=up.Unit
      local forward=towardFront-up*towardFront:Dot(up)
      if forward.Magnitude<.15 then clone:Destroy();error("MEADOW_DEER_FRONT_BACK_AXIS_INVALID") end
      forward=forward.Unit
      local right=forward:Cross(up)
      if right.Magnitude<.15 then clone:Destroy();error("MEADOW_DEER_FACING_AXIS_INVALID") end
      deerAlignment=CFrame.fromMatrix(Vector3.zero,right.Unit,up,-forward):Inverse()
      clone:SetAttribute("NativeDeerFacingCorrection",deerAlignment)
      clone:SetAttribute("NativeMobFacingYaw",0)
      clone:SetAttribute("NativeDeerOriginalRigUpright",true)
    end
    -- [원본 CC0 숲 표면] 새 파츠 없이 수목·야생동물을 같은 무광 팔레트로 맞춘다.
    -- 원본 MeshId/TextureID/리그 및 자원·저장·충돌은 수정하지 않는다.
    -- [사슴 갈색 피모] 기존 GLB 스킨에 갈색을 적용해 흰색 단색 출력을 없앤다.
    -- 기존 뼈·텍스처·스킨·원형 부위는 유지하고 색상만 보정한다.
    local animalTint=id=="deer" and meadowPalette.deer
      or id=="boar" and meadowPalette.boar
      or id=="rabbit" and meadowPalette.rabbit or nil
    if animalTint or id=="tree" or id=="ruin" then
      for _,surface in ipairs(clone:GetDescendants()) do
        if surface:IsA("MeshPart") then
          if id=="ruin" then
            -- 수입 원본 유적 메시를 골렘·지형의 동일한 무광 석재로 연결한다.
            surface.Color=meadowPalette.rock
            surface.Material=Enum.Material.Slate
          elseif id=="tree" then
            -- [위처풍 원본 CC0 수목] 기존 메시와 텍스처/PBR을 지우지 않고 톤만 바꾼다.
            -- 나무는 거친 목재, 수관은 젖은 짙은 풀 재질. 저장·채집 판정은 불변.
            local name=surface.Name:lower()
            local bark=name:find("trunk",1,true) or name:find("bark",1,true)
              or name:find("stem",1,true) or name:find("branch",1,true)
              or name:find("wood",1,true)
            local tone=(math.sin(location.X*.28+location.Z*.19)+1)*.5
            local crown=meadowPalette.leaves:Lerp(Color3.fromRGB(91,106,79),tone*.20)
            surface.MaterialVariant=""
            surface.Color=bark and meadowPalette.bark or crown
            surface.Material=bark and Enum.Material.Wood or Enum.Material.LeafyGrass
          else
            -- [야생동물 토이 표면] 사슴 원본 7색 재질과 나머지 동물 표면은 분리 처리한다.
            -- [사슴 원본 46본 피모] GLB에는 외부 이미지가 없고 7개 원본 재질색만 있다.
            -- Roblox 수입 중 붙은 흰색 TextureID/PBR은 갈색 피모를 가리므로
            -- 사슴 복제본에서만 걷어낸다. MeshId·Bone·Skin·애니메이션은 보존한다.
            if id=="deer" then
              local appearance=surface:FindFirstChildOfClass("SurfaceAppearance")
              if appearance then appearance:Destroy() end
              if surface.TextureID~="" then surface.TextureID="" end
              surface.MaterialVariant=""
              -- [사슴 부위별 색] 원본 7조각의 크기 순서로 몸통(적갈색)·배/가슴(연한 크림)·진한 갈색,
              -- 작은 조각은 뿔(황갈색)·발굽/눈(짙은 갈색·검정)으로 나눈다.
              local ranks=clone:GetAttribute("DeerPartRanks")
              if not ranks then
                local list={}
                for _,part in ipairs(clone:GetDescendants()) do
                  if part:IsA("MeshPart") then
                    table.insert(list,{part=part,volume=part.Size.X*part.Size.Y*part.Size.Z+part.Size.Magnitude*.01})
                  end
                end
                table.sort(list,function(a,b) return a.volume>b.volume end)
                local order={}
                for index,row in ipairs(list) do order[row.part.Name]=index end
                clone:SetAttribute("DeerPartRanks",true)
                clone:SetAttribute("DeerRankJson",game:GetService("HttpService"):JSONEncode(order))
                ranks=true
              end
              local order=game:GetService("HttpService"):JSONDecode(clone:GetAttribute("DeerRankJson") or "{}")
              local rank=order[surface.Name] or 1
              -- [토이 톤] 전부 SmoothPlastic, 부위별 투톤. 개체마다 ±5% 명도 차이.
              local jitter=1+((math.sin(location.X*12.9898+location.Z*78.233)*43758.5453)%1-.5)*.1
              local base=rank==1 and Color3.fromRGB(168,124,78)
                or rank==2 and Color3.fromRGB(228,212,178)
                or rank==3 and Color3.fromRGB(128,92,58)
                or rank==4 and Color3.fromRGB(176,150,112)
                or rank==5 and Color3.fromRGB(46,40,36)
                or Color3.fromRGB(24,20,20)
              surface.Color=Color3.new(math.clamp(base.R*jitter,0,1),math.clamp(base.G*jitter,0,1),math.clamp(base.B*jitter,0,1))
              surface.Material=Enum.Material.SmoothPlastic
            elseif id=="rabbit" then
              -- [토끼 부위별 색] 몸통은 갈색, 다리는 더 진한 갈색, 작은 조각(꼬리·귀 끝)은 흰색.
              local piece=surface.Name:lower()
              surface.Color=piece:find("leg",1,true) and Color3.fromRGB(118,90,64)
                or piece=="body" and Color3.fromRGB(166,130,94)
                or Color3.fromRGB(240,234,220)
              surface.Material=Enum.Material.SmoothPlastic
            else
              surface.Color=animalTint
              surface.Material=Enum.Material.SmoothPlastic
            end
          end
          surface.Reflectance=0
        end
      end
    end
    clone:PivotTo(CFrame.new(location)*(deerAlignment or CFrame.new()))
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
    -- [완성형 집·모듈·소품 중심] AssetService 모델 래퍼의 피벗은 화면 메시의 가운데가 아닐 수 있다.
    -- 마을 모델은 실제 배치 중심으로 WorldPivot을 맞춰 지붕·울타리·카트의 회전 시 이탈을 막는다.
    -- 동물 리그·본·전투·채집 모델의 기존 회전축은 변경하지 않는다.
    if id:sub(1,7)=="village" or id:sub(1,2)=="vx" then
      clone.PrimaryPart=nil
      clone.WorldPivot=CFrame.new(location.X,
        ground.Position.Y+.15+(heightAboveGround or 0)+(targetHeight or 5)*.5,location.Z)
      clone:SetAttribute("MeadowVillageVisualPivotCentered",true)
    end
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
local smithSessions={}
local foodBuff={}
local cookSessions={}
local function villageDialogue(player,title,message,options)
  remote:FireClient(player,"MEADOW_VILLAGE_DIALOG",{
    title=title,message=message,options=options or {},
  })
end
local narinStoryDeferred={}
local function villageBoardDialogue(player,sourcePosition)
  -- [스토리 연결 · 오딧세이식 대화 선택] 초원 메인 퀘스트(05 연대기)를 마치면 촌장 나린이 기사단 이야기를 꺼낸다.
  -- 이야기 선택(1·2)을 끝냈거나 '미룬다'를 고른 뒤에는 마을 의뢰를 바로 받을 수 있어야 한다.
  local story=readNumber(player,"NarinStory",0)
  if readNumber(player,"QuestStage",1)>=6 and story==0 and not narinStoryDeferred[player] then
    villageSessions[player]={position=sourcePosition or villageCenter,expires=os.clock()+60}
    if story==0 then
      villageDialogue(player,"촌장 나린 · 지워진 기사단",
        "…그 문양. 네가 가져온 연대기에 새겨진 렌스기사단의 문장이구나.\n\n나도 이 마을에서 눈을 뜬 날 이전은 기억나지 않아. "..
        "다만 서쪽 숲으로 들어간 기사들의 이름만은 낡은 의뢰판 뒷면에 새겨져 있었지. 렌스, 카인, 미나, 닉.\n\n"..
        "네가 카인이라면… 나는 오래전부터 너를 기다렸는지도 몰라.",{
        {label="그 의뢰판을 보여 줘 (진실을 묻는다)",action="village:story:1"},
        {label="이 마을이 무엇을 숨기는지 말해 (의심한다)",action="village:story:2"},
        {label="지금은 마을 일이 먼저야 (미룬다)",action="village:story:3"},
      })
      return
    end
  end
  local index,contract=villageCurrentContract(player)
  if not contract then
    -- [선택의 결과] 세 의뢰에서 고른 해결 방식과 나린 이야기 선택에 따라 마지막 말이 달라진다.
    local outcomes=readNumber(player,"VillageContractOutcomes",0)
    local mercy,justice=0,0
    for i=0,2 do
      local pick=bit32.band(bit32.rshift(outcomes,i*2),3)
      if pick==1 then mercy+=1 elseif pick==2 then justice+=1 end
    end
    local tone=mercy>justice and "마을 사람들은 네가 사정을 먼저 들어 준다고 말해."
      or justice>mercy and "마을 사람들은 네 판결이 단호하다고 말해."
      or "마을 사람들은 네 판단이 때마다 다르다고 말해."
    local story=readNumber(player,"NarinStory",0)
    local closing=story==1 and "\n나린: \"진실을 보겠다던 네 말, 의뢰판이 기억하고 있어.\""
      or story==2 and "\n나린: \"의심하던 네가 끝까지 해냈구나. 이제 조금은 믿어도 되겠어.\"" or ""
    villageDialogue(player,"초원 마을 · 의뢰 완료","세 의뢰의 진상을 모두 기록했어. "..tone..closing.."\n기사단 연대기는 그대로 이어져.")
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
-- [지역 상인 · 기본 장비] 지역마다 파는 기본 장비가 달라 여러 마을을 돌아야 모두 모은다.
local meadowGearShops={
  village={Title="대장장이 브란 · 기본 장비",Gear={"hunter_blade","hunter_armor","hunter_gloves","guardian_pants","guardian_boots"}},
  windcliff={Title="소금 상인 베른 · 기본 장비",Gear={"hunter_blade","guardian_boots"}},
  highland={Title="모피 상인 토르 · 기본 장비",Gear={"hunter_armor","hunter_gloves","hunter_bow"}},
  wetland={Title="약초 상인 파블로 · 기본 장비",Gear={"guardian_pants","hunter_bow"}},
}
local meadowGearShopDefault={Title="마을 상인 · 기본 장비",Gear={"hunter_blade","hunter_armor"}}
local gearShopSessions={}
local meadowShopApi={}
local gearShopNames={hunter_blade="사냥꾼 장검",hunter_armor="사냥꾼 갑옷",hunter_gloves="강화 장갑",
  guardian_pants="수호자 바지",guardian_boots="수호자 장화",hunter_bow="사냥꾼 활"}
-- [NPC 호감도] 같은 상인에게서 살수록 호감이 쌓여 단골 할인(최대 15%)과 인사가 달라진다. 세이브에 저장된다.
local affinityThresholds={0,2,5,9,14}
local function affinityLevel(player,shopId)
  local points=readNumber(player,"Affinity_"..shopId,0)
  local level=1
  for i,need in ipairs(affinityThresholds) do if points>=need then level=i end end
  return level,points
end
local function affinityDiscount(level) return (level-1)*.0375 end
local function affinityHearts(level) return string.rep("♥",level-1)..string.rep("♡",5-level) end
local affinityGreetings={"처음 보는 얼굴이군. 천천히 둘러봐.","또 왔군! 좋은 물건만 골라 두었어.","단골 대접해 주지. 값을 조금 깎아 줄게.","자네라면 믿고 팔 수 있지. 특별히 챙겨 뒀어.","이 마을에서 자네만큼 반가운 손님이 없어!"}
local function meadowOpenGearShop(player,shopId,position)
  local shop=meadowGearShops[shopId] or meadowGearShopDefault
  gearShopSessions[player]={shop=shopId,position=position,expires=os.clock()+60}
  local options={}
  local level=affinityLevel(player,shopId)
  local discount=affinityDiscount(level)
  for _,id in ipairs(shop.Gear) do
    local price=meadowShopApi.priceOf and meadowShopApi.priceOf(id,discount)
    options[#options+1]={label=(gearShopNames[id] or id).."  ·  "..tostring(price or "?").." 재화",action="shop:buy:"..id}
  end
  villageDialogue(player,shop.Title.."  "..affinityHearts(level),affinityGreetings[level]..
    ((game:GetService("Lighting").ClockTime>=18 or game:GetService("Lighting").ClockTime<5) and "\n(밤이라 등불 아래서 장사 중이야. 길 조심해.)" or "")..
    "\n기본 장비만 팔아. 더 좋은 장비는 대장간에서 직접 제작해."..(discount>0 and string.format("\n단골 할인 %d%%",math.floor(discount*100+.5)) or "")..
    "\n보유 재화 "..readNumber(player,"Coins",0),options)
end
local function meadowGearShopAction(player,actionId)
  if player:GetAttribute("ProfileReady")~=true then return end
  local session=gearShopSessions[player]
  local open=actionId:match("^shop:open:([%w_]+)$")
  if open then
    local root=player.Character and player.Character:FindFirstChild("HumanoidRootPart")
    if root then meadowOpenGearShop(player,open,root.Position) end
    return
  end
  local id=actionId:match("^shop:buy:([%w_]+)$")
  if not id or not session or os.clock()>session.expires or not villageNear(player,session.position,24) then return end
  local shop=meadowGearShops[session.shop] or meadowGearShopDefault
  if not table.find(shop.Gear,id) then return end
  if os.clock()-(villageInteractionCooldown[player] or 0)<.35 then return end
  villageInteractionCooldown[player]=os.clock()
  local level=affinityLevel(player,session.shop)
  local before=readNumber(player,"Coins",0)
  if meadowShopApi.buyGear then meadowShopApi.buyGear(player,id,affinityDiscount(level)) end
  if readNumber(player,"Coins",0)<before then
    setNumber(player,"Affinity_"..session.shop,readNumber(player,"Affinity_"..session.shop,0)+1)
  end
  meadowOpenGearShop(player,session.shop,session.position)
end

local function villageChoose(player,actionId)
  if os.clock()-(villageInteractionCooldown[player] or 0)<.35 then return end
  local session=villageSessions[player]
  if not session or os.clock()>session.expires
    or not villageNear(player,session.position,16) then return end
  local storyPick=actionId:match("^village:story:([123])$")
  if storyPick and readNumber(player,"NarinStory",0)==0 and readNumber(player,"QuestStage",1)>=6 then
    local pick=tonumber(storyPick)
    setNumber(player,"NarinStory",pick)
    villageInteractionCooldown[player]=os.clock()
    villageSessions[player]=nil
    if pick==3 then
      setNumber(player,"NarinStory",0) -- 미루면 다시 말을 걸 수 있다.
      narinStoryDeferred[player]=true -- 이번 접속에서는 바로 마을 의뢰를 받을 수 있다.
      villageDialogue(player,"촌장 나린","그래, 서두를 일은 아니야. 준비가 되면 다시 와.")
      return
    end
    setNumber(player,"Coins",readNumber(player,"Coins",0)+(pick==1 and 40 or 25))
    -- [선택의 결과] 진실을 택하면 마을 사람들이, 의심을 택하면 떠돌이 상인들이 먼저 마음을 연다(단골 호감도 시작점).
    if pick==1 then
      setNumber(player,"Affinity_village",math.max(readNumber(player,"Affinity_village",0),3))
    else
      for _,shopId in ipairs({"windcliff","highland","wetland"}) do
        setNumber(player,"Affinity_"..shopId,math.max(readNumber(player,"Affinity_"..shopId,0),3))
      end
    end
    villageDialogue(player,"촌장 나린",pick==1
      and "의뢰판 뒷면에 네 이름이 있었어. 길은 서쪽 숲 우두머리 너머로 이어져. (재화 +40 · 스토리: 진실을 택했어 · 마을 대장장이와 가까워졌어)"
      or "…좋아, 의심은 살아남는 자의 몫이야. 숲의 이름 도둑을 막아 줘. (재화 +25 · 스토리: 의심을 택했어 · 떠돌이 상인들과 가까워졌어)")
    return
  end
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
    -- [경로 맞춤 주민 순찰] 기존 중앙 주민 4명은 자리 유지, 출입로 안내원만 길목을 순찰.
    -- 서버의 기존 Humanoid:MoveTo를 그대로 쓰고 신규 AI/경로 탐색 구조는 만들지 않는다.
    root.Anchored=false
    pcall(function()root:SetNetworkOwner(nil)end)
    local home=spec.location
    task.spawn(function()
      local offsets=spec.patrolOffsets or {Vector3.new(3,0,2),Vector3.new(-3,0,1),Vector3.new(0,0,0)}
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
  -- [마을 중앙] 구형 분수·이전 우물을 먼저 전부 제거하고 검증된 실물 Well만 다시 배치한다.
  -- 다른 마을 건물·NPC·퀘스트 단서·저장 데이터는 건드리지 않는다.
  for _,scenery in ipairs(gameWorld:GetChildren()) do
    if scenery.Name=="Meadow_Village_Well"
      or scenery.Name:match("^Meadow_Village_villageFountain_%d+$") then
      scenery:Destroy()
    end
  end
  -- [중앙 흰색 바닥 제거] 얇은 길 메시가 높이 기준으로 과도하게 확대된 이전 배치만 정리한다.
  -- 원래 Terrain 흙길·주거·NPC·퀘스트 지점은 건드리지 않는다.
  for _,scenery in ipairs(gameWorld:GetChildren()) do
    if scenery.Name:match("^Meadow_Village_villageRoad_%d+$") then
      scenery:Destroy()
    end
  end
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
  -- [마을 구역 / 퀘스트 동선] 광장(촌장/게시판)에서 서쪽 약초, 동쪽 추적,
  -- 우물/경비 초소, 양쪽 사냥 출구, 남부 생활·농경 구역으로 실제 Terrain 흙길을 잇는다.
  -- 몬스터·단서·NPC·저장 좌표는 그대로 두고 기존 모델 주택의 문 앞으로 샛길을 낸다.
  local villageRoadRoutes={
    -- [첫 진입] 북쪽 진입로 → 게시판 → 돌우물 → 수정문 → 남부 정착지
    {width=6.1,points={{0,-53},{3,-79},{-3,-101},{-7,-128},{-9,-146},{-4,-169},{0,-187},{3,-220},{-2,-252},{2,-287},{-2,-333}}},
    {width=3.7,points={{-11,-126},{-20,-137},{-21,-150},{-17,-161},{-5,-169},{13,-164},{20,-152},{18,-139},{10,-128}}},
    -- [의뢰 1] 의뢰판 → 약초상 미라 → 찢긴 약초 꾸러미
    {width=5.1,points={{-5,-105},{-34,-116},{-42,-128},{-68,-122},{-78,-131}}},
    -- [의뢰 3] 의뢰판 → 추적자 라온 → 보급 수레 조사
    {width=5.1,points={{4,-104},{34,-115},{69,-129},{72,-163},{57,-207},{28,-214},{5,-219}}},
    -- [의뢰 2] 우물의 봉인석 → 경비병 아린
    {width=4.6,points={{-9,-146},{-18,-159},{-24,-174},{-2,-188}}},
    -- [중앙 마을] 여관·시장, 회관, 공방으로 이어지는 골목
    {width=4.4,points={{35,-115},{54,-106},{78,-100}}},
    {width=4.4,points={{69,-129},{79,-146},{86,-161}}},
    {width=4.4,points={{-18,-159},{-50,-176},{-73,-184},{-87,-191}}},
    -- [서문 / 의뢰 1] 약초상 → 서쪽 숲 → 우두머리 늑대
    {width=5.1,points={{-68,-122},{-107,-153},{-139,-178},{-149,-213},{-191,-221},{-239,-217},{-282,-211},{-317,-194}}},
    -- [서문 / 의뢰 3] 수레 현장 이후 남부 골목을 통해 서쪽 초원 늑대
    {width=4.8,points={{3,-219},{-38,-219},{-81,-223},{-120,-234},{-168,-235},{-215,-234},{-261,-232},{-300,-233}}},
    -- [동문 / 의뢰 2] 경비 초소 → 동쪽 숲 → 황혼 박쥐
    {width=5.1,points={{1,-189},{37,-202},{58,-208},{73,-174},{110,-203},{160,-217},{209,-214},{250,-210},{300,-212}}},
    -- [직업 마을] 약초집·벌목집·목수집, 여관·빵집·숲지기집
    {width=4.1,points={{-78,-131},{-119,-123},{-151,-113},{-167,-109}}},
    {width=4.1,points={{-107,-153},{-137,-170},{-160,-190}}},
    {width=4.1,points={{78,-100},{116,-105},{149,-112},{164,-113}}},
    {width=4.1,points={{110,-203},{140,-192},{164,-182}}},
    -- [주거 지구] 대로와 가까운 집 문까지만 샛길 연결
    {width=4.0,points={{-38,-219},{-64,-243},{-79,-252}}},
    {width=4.0,points={{28,-214},{56,-235},{75,-247}}},
    -- [남부 농경 지구] 창고·마구간·과수원과 동서 출입
    {width=4.5,points={{-2,-280},{-46,-288},{-76,-298},{-93,-308},{-147,-289},{-170,-271},{-208,-311}}},
    {width=4.5,points={{2,-280},{48,-288},{77,-298},{92,-310},{145,-291},{168,-274},{207,-313}}},
  }
  local villageRoadSegments=0
  for routeIndex,route in ipairs(villageRoadRoutes) do
    for segment=1,#route.points-1 do
      local a,b=route.points[segment],route.points[segment+1]
      local dx,dz=b[1]-a[1],b[2]-a[2]
      local length=math.sqrt(dx*dx+dz*dz)
      local steps=math.max(4,math.ceil(length/6))
      for step=0,steps do
        local t=step/steps
        -- 양 끝은 고정하고 중앙에만 완만한 굴곡을 주어 샛길 연결을 보존한다.
        local bend=math.sin(t*math.pi)*math.sin(routeIndex*1.7+segment*.9)*2.2
        local x=a[1]+dx*t-dz/math.max(length,1)*bend
        local z=a[2]+dz*t+dx/math.max(length,1)*bend
        local radius=route.width*(.97+.055*math.sin(routeIndex*2.1+segment+t*5.6))
        -- [보이는 흙길] 옛 도로가 잔디에 묻히지 않게 지면 위로 0.35만 올린다.
        -- 실제 Terrain만 사용하며 모바일 보행과 NPC 의뢰 위치를 가리지 않는다.
        meadowTerrain:FillBall(Vector3.new(x,2.06-radius+.35,z),radius,Enum.Material.Ground)
        -- [마을 돌길] 주 출입로·여관·회관 앞에만 닳은 자갈길을 자연스럽게 드러낸다.
        if (routeIndex==1 and z>-183 and step%4==0)
          or (routeIndex==6 and step%5==0)
          or (routeIndex==7 and step%5==0) then
          local stoneRadius=1.55+((routeIndex+segment+step)%3)*.19
          meadowTerrain:FillBall(Vector3.new(x,2.06-stoneRadius+.48,z),
            stoneRadius,Enum.Material.Cobblestone)
        end
        if step%9==0 then task.wait() end
      end
      villageRoadSegments+=1
    end
  end
  gameWorld:SetAttribute("MeadowVillageRoadRoutes",#villageRoadRoutes)
  gameWorld:SetAttribute("MeadowVillageRoadSegments",villageRoadSegments)
  gameWorld:SetAttribute("MeadowVillageLayoutStyle","WITCHER_SKYRIM_QUEST_DISTRICTS_V2")
  gameWorld:SetAttribute("MeadowVillageDistricts","CIVIC,HERBALISTS,MARKET,CRAFT,RESIDENTIAL,FARMLAND,FOREST_EDGE")
  -- [마을 광장 바닥] 초원과 동떨어진 흰색 Cobblestone 직사각형 덮개는 두지 않는다.
  -- 기존 Grass 지면과 Ground 골목을 그대로 연결해 의뢰판·주민·우물 위치를 보존한다.
  -- [실제 건물] 기둥/벽/지붕/문은 저장소 Kenney 원본 3D GLB 등록본만 사용한다.
  -- 마력숲 Universe의 모델 등록·사용 권한이 없으면 임의 파츠 집으로 대체하지 않는다.
  local villagePrefabKeys={"villageWall","villageDoor","villageWindow","villageRoof",
    "villageRoofEnd","villageStall","villageFence","villageLantern","villageCart"}
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
    "villagePillar","villageArch","villageRuinWall",
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
  -- [위쳐·스카이림식 구역] 기존 16채를 북쪽 여관/시장, 서쪽 약초·공방, 동쪽 회관,
  -- 남쪽 주민·농가, 외곽 숲지기 생활권으로 묶는다. 실제 CC0 완성형·모듈만 사용한다.
  local villageArchitectureScale=2.35
  local villageBuildings=0
  local villageProps=0
  local villageWellReady=false
  -- [마을 생활감] 검증된 원본 CC0 랜턴에만 빛과 불씨를 연결한다. 장식 파츠 신규 제작 없음.
  local villageLanternLights={}
  local villageWindowLightCount=0
  local expectedVillageBuildings=16
  if nativeVillageReady then
    -- [집 유형] 짧은 초가, 긴 농가/공방, 이층 여관/회관. 문 방향은 광장·골목을 향하게 한다.
    -- 원래 등장한 건물 이름을 유지해서 기존 컨텐츠 참조에 영향이 없게 한다.
    local houses={
      {x=-91,z=-133,angle=.17,name="Village_HealerHouse",label="약초상 · 의원",district="HERBALISTS",scale=.96,length=2,storeys=1,roofPitch=.93,doorZ=-2.7,sideWindow=true,porch=1,lantern=true,chimney=true,wing=-1,wingZ=2.7,
       timber=Color3.fromRGB(125,107,88),roof=Color3.fromRGB(134,113,82)},
      {x=92,z=-99,angle=math.pi-.21,name="Village_Guesthouse",label="마을 여관",district="MARKET",scale=1.15,length=3,storeys=2,roofPitch=1.09,doorZ=0,sideWindow=true,porch=2,lantern=true,prefab="villageHouseA",masonry=true,chimney=true,archway=true,balcony=true,
       timber=Color3.fromRGB(151,117,88),roof=Color3.fromRGB(123,91,72)},
      {x=-98,z=-193,angle=.21,name="Village_Workshop",label="대장간 · 공방",district="CRAFT",scale=1.02,length=3,storeys=1,roofPitch=.85,doorZ=0,sideWindow=false,porch=1,lantern=true,masonry=true,chimney=true,wing=-1,wingZ=5.4,
       timber=Color3.fromRGB(106,94,83),roof=Color3.fromRGB(116,105,88)},
      {x=99,z=-161,angle=math.pi+.14,name="Village_WardenHall",label="마을 회관",district="CIVIC",scale=1.24,length=3,storeys=2,roofPitch=1.13,doorZ=0,sideWindow=true,porch=2,lantern=true,prefab="villageHouseB",masonry=true,chimney=true,archway=true,balcony=true,wing=-1,wingZ=5.4,
       timber=Color3.fromRGB(146,119,91),roof=Color3.fromRGB(121,92,77)},
      {x=-89,z=-256,angle=-.18,name="Village_ResidentHouseWest",label="서쪽 주민집",district="RESIDENTIAL",scale=.87,length=2,storeys=1,roofPitch=.85,doorZ=2.7,sideWindow=false,porch=0,lantern=false,chimney=true,wing=-1,wingZ=-2.7,
       timber=Color3.fromRGB(153,132,107),roof=Color3.fromRGB(139,112,82)},
      {x=89,z=-250,angle=math.pi+.23,name="Village_ResidentHouseEast",label="동쪽 주민집",district="RESIDENTIAL",scale=.96,length=2,storeys=1,roofPitch=1.09,doorZ=-2.7,sideWindow=true,porch=1,lantern=false,flatRoof=true,wing=-1,wingZ=2.7,
       timber=Color3.fromRGB(116,102,87),roof=Color3.fromRGB(123,118,95)},
      {x=-178,z=-109,angle=-.14,name="Village_WoodcutterHome",label="벌목꾼의 집",district="FOREST_EDGE",scale=.86,length=2,storeys=1,roofPitch=.96,doorZ=2.7,sideWindow=false,porch=0,lantern=false,chimney=true,wing=-1,wingZ=2.7,
       timber=Color3.fromRGB(119,103,80),roof=Color3.fromRGB(131,108,80)},
      {x=178,z=-112,angle=math.pi-.33,name="Village_WoodsmanHome",label="숲지기 오두막",district="FOREST_EDGE",scale=.91,length=2,storeys=1,roofPitch=1.08,doorZ=-2.7,sideWindow=true,porch=1,lantern=false,flatRoof=true,leanTo=true,
       timber=Color3.fromRGB(111,108,91),roof=Color3.fromRGB(122,110,80)},
      {x=-179,z=-191,angle=.24,name="Village_CarpenterHome",label="목수 작업집",district="CRAFT",scale=.94,length=3,storeys=1,roofPitch=.91,doorZ=0,sideWindow=true,porch=1,lantern=true,masonry=true,chimney=true,wing=-1,wingZ=-5.4,
       timber=Color3.fromRGB(134,109,88),roof=Color3.fromRGB(138,111,83)},
      {x=178,z=-180,angle=math.pi-.25,name="Village_BakerHome",label="빵 굽는 집",district="MARKET",scale=.91,length=2,storeys=1,roofPitch=1.05,doorZ=2.7,sideWindow=true,porch=1,lantern=true,masonry=true,chimney=true,leanTo=true,
       timber=Color3.fromRGB(162,126,96),roof=Color3.fromRGB(142,102,80)},
      {x=-182,z=-270,angle=-.11,name="Village_Granary",label="곡물 창고",district="FARMLAND",scale=1.04,length=3,storeys=1,roofPitch=1.13,doorZ=0,sideWindow=false,porch=0,lantern=false,prefab="villageHouseC",masonry=true,flatRoof=true,leanTo=true,
       timber=Color3.fromRGB(129,107,81),roof=Color3.fromRGB(147,118,88)},
      {x=182,z=-274,angle=math.pi+.19,name="Village_Farmstead",label="농가 · 마구간",district="FARMLAND",scale=1.02,length=3,storeys=1,roofPitch=.82,doorZ=0,sideWindow=false,porch=1,lantern=false,prefab="villageHouseD",masonry=true,flatRoof=true,wing=-1,wingZ=5.4,
       timber=Color3.fromRGB(117,98,75),roof=Color3.fromRGB(133,110,87)},
      {x=-104,z=-312,angle=.23,name="Village_SouthCottageWest",label="남쪽 농가",district="RESIDENTIAL",scale=.89,length=2,storeys=1,roofPitch=.92,doorZ=-2.7,sideWindow=true,porch=0,lantern=false,chimney=true,wing=-1,wingZ=-2.7,
       timber=Color3.fromRGB(148,126,102),roof=Color3.fromRGB(137,110,83)},
      {x=105,z=-312,angle=math.pi-.19,name="Village_SouthCottageEast",label="길가 주민집",district="RESIDENTIAL",scale=.92,length=2,storeys=1,roofPitch=1.02,doorZ=2.7,sideWindow=false,porch=1,lantern=false,flatRoof=true,leanTo=true,
       timber=Color3.fromRGB(112,98,82),roof=Color3.fromRGB(127,101,78)},
      {x=-229,z=-323,angle=-.11,name="Village_OrchardHome",label="과수원 농가",district="FARMLAND",scale=.84,length=2,storeys=1,roofPitch=.87,doorZ=2.7,sideWindow=true,porch=0,lantern=false,chimney=true,leanTo=true,
       timber=Color3.fromRGB(133,121,98),roof=Color3.fromRGB(139,120,83)},
      {x=226,z=-324,angle=math.pi+.29,name="Village_EastFarmhouse",label="동쪽 농가",district="FARMLAND",scale=.94,length=2,storeys=1,roofPitch=1.08,doorZ=-2.7,sideWindow=true,porch=1,lantern=false,flatRoof=true,wing=-1,wingZ=2.7,
       timber=Color3.fromRGB(123,102,87),roof=Color3.fromRGB(125,115,91)},
    }
    for houseIndex,house in ipairs(houses) do
      -- [서로 다른 완성형 건물] 기존 여관·회관·창고·농가를 각각 별개 중세 모델로 구성.
      -- 등록·로드 실패 시 해당 건물은 기존 조립형으로 남기고 저장 및 의뢰 좌표를 보존한다.
      local hasOriginalHouse=false
      local houseWindowLit=false
      if house.prefab and villageWholeHouseReady then
        -- [완성형 CC0 집] 링크가 끊긴 원본 재질 때문에 거대 회색 집이 되지 않도록
        -- 실제 원본 MeshPart만 집의 지붕/목재/회벽 팔레트로 마감한다.
        local targetHeight=(house.storeys==2 and 8.1 or 6.5)*villageArchitectureScale*house.scale
        local houseModel=worldAsset(house.prefab,Vector3.new(house.x,3,house.z),targetHeight)
        if houseModel then
          -- [실측 크기] 원본마다 다른 폭을 좁은 중앙 골목의 건물 부지에 맞춘다.
          local _,sourceSize=houseModel:GetBoundingBox()
          local maxFootprint=(house.storeys==2 and 34 or 28)*house.scale
          local actualFootprint=math.max(sourceSize.X,sourceSize.Z)
          if actualFootprint>maxFootprint then
            houseModel:ScaleTo(houseModel:GetScale()*maxFootprint/actualFootprint)
            local centered,scaledSize=houseModel:GetBoundingBox()
            local rayParams=RaycastParams.new()
            rayParams.FilterType=Enum.RaycastFilterType.Include
            rayParams.FilterDescendantsInstances={meadowTerrain}
            local ground=workspace:Raycast(Vector3.new(house.x,44,house.z),
              Vector3.new(0,-105,0),rayParams)
            if ground then
              houseModel:PivotTo(houseModel:GetPivot()+Vector3.new(0,
                ground.Position.Y+.15-(centered.Position.Y-scaledSize.Y*.5),0))
            end
          end
          local meshCount=0
          for _,mesh in ipairs(houseModel:GetDescendants()) do
            if mesh:IsA("MeshPart") and mesh.Transparency<.98 then meshCount+=1 end
          end
          -- 원본이 한 덩어리로 깨진 경우 기존 정상 Kenney 집을 사용한다.
          if meshCount<3 then
            warn("마력숲 원본 완성형 집 메시 불완전: "..house.prefab)
            houseModel:Destroy()
            houseModel=nil
          end
        end
        if houseModel then
          houseModel.Name=house.name.."_OriginalCC0House"
          houseModel:SetAttribute("MeadowVillageScenery",true)
          houseModel:SetAttribute("VillageBuilding",house.name)
          houseModel:SetAttribute("VillageRoofSilhouette","COMPLETE_CC0_"..house.prefab)
          houseModel:SetAttribute("VillageDistrict",house.district)
          houseModel:PivotTo(houseModel:GetPivot()*CFrame.Angles(0,house.angle,0))
          local fullBox,fullSize=houseModel:GetBoundingBox()
          local plaster=house.timber:Lerp(Color3.fromRGB(220,201,170),.78)
          for _,mesh in ipairs(houseModel:GetDescendants()) do
            if mesh:IsA("MeshPart") then
              local name=mesh.Name:lower()
              -- [원형 완성형 집] 높이만으로 벽/창을 지붕으로 오분류하지 않는다.
              local roof=name:find("roof",1,true) or name:find("shingle",1,true)
                or name:find("thatch",1,true) or name:find("tile",1,true)
              local timber=name:find("beam",1,true) or name:find("wood",1,true)
                or name:find("plank",1,true) or name:find("timber",1,true)
                or name:find("door",1,true)
              local stone=name:find("stone",1,true) or name:find("brick",1,true)
                or name:find("chimney",1,true) or name:find("foundation",1,true)
              local glass=name:find("glass",1,true) or name:find("window",1,true)
              local appearance=mesh:FindFirstChildOfClass("SurfaceAppearance")
              if appearance then appearance:Destroy() end
              if mesh.TextureID~="" then mesh.TextureID="" end
              mesh.MaterialVariant=""
              mesh.Reflectance=0
              if roof then
                -- [위쳐풍 지붕] 원본 경사 메시 그대로, 민가에는 풍화 목재/여관에는 석재를 적용.
                mesh.Color=house.roof
                mesh.Material=house.masonry and Enum.Material.Slate or Enum.Material.WoodPlanks
              elseif glass then
                mesh.Color=Color3.fromRGB(70,91,94)
                mesh.Material=Enum.Material.Glass
              elseif timber then
                mesh.Color=house.timber
                mesh.Material=Enum.Material.Wood
              elseif stone then
                mesh.Color=Color3.fromRGB(148,143,130)
                mesh.Material=Enum.Material.Slate
              else
                mesh.Color=plaster
                mesh.Material=Enum.Material.Concrete
              end
              mesh.CanCollide=true
            end
          end
          -- [밤의 여관·회관] 원본 집의 실제 창문 메시만 빛나게 한다.
          if house.lantern then
            for _,window in ipairs(houseModel:GetDescendants()) do
              if window:IsA("MeshPart") then
                local label=window.Name:lower()
                if label:find("window",1,true) or label:find("glass",1,true) then
                  local light=Instance.new("PointLight")
                  light.Name="MeadowVillageWindowGlow"
                  light.Color=Color3.fromRGB(255,193,124)
                  light.Brightness=0
                  light.Range=10
                  light.Shadows=false
                  light.Parent=window
                  villageLanternLights[#villageLanternLights+1]=light
                  villageWindowLightCount+=1
                  houseWindowLit=true
                  break
                end
              end
            end
          end
          local signMesh=houseModel:FindFirstChildWhichIsA("MeshPart",true)
          if signMesh then
            local sign=Instance.new("BillboardGui")
            sign.Name="MeadowVillageHouseSign"
            sign.Adornee=signMesh
            sign.Size=UDim2.fromOffset(158,28)
            -- [간판 위치] 작은 건물에서는 원래 10.5스터드 고정 오프셋이 공중에 뜬다.
            sign.StudsOffsetWorldSpace=Vector3.new(0,
              math.max(2,fullBox.Position.Y+fullSize.Y*.5-signMesh.Position.Y+1.5),0)
            sign.MaxDistance=(house.district=="MARKET" or house.district=="CIVIC"
              or house.district=="HERBALISTS" or house.district=="CRAFT") and 50 or 29
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
      -- [16종 중세 민가] 실제 GLB 벽(5 너비)과 경사지붕(폭 1.1/높이 .57)의 비율을 맞춘다.
      -- 이전 x=±6 벽은 지붕 양옆으로 튀어나와 집이 찢어진 원인이었다.
      local rowCount=house.length
      local roofRows=rowCount==3 and {-5.4,0,5.4} or {-2.7,2.7}
      local endZ=rowCount*2.7
      local roofLift=house.storeys==2 and 9.65 or 4.65
      local wallHalfWidth=2.5
      local roofOffset=((houseIndex%5)-2)*.10
      local gableHeight=3.7
      local roofSilhouette=(house.storeys==2 and "TALL_GABLE" or "STEEP_GABLE")
        ..(house.wing and "_CROSS_WING" or "")..(house.leanTo and "_LEAN_TO" or "")
        ..(house.chimney and "_CHIMNEY" or "")
      local pieces={}
      for rowIndex,z in ipairs(roofRows) do
        pieces[#pieces+1]={asset=z==house.doorZ and "villageDoor"
          or (house.masonry and villageDetailReady and rowIndex%2==1 and "villageStoneWall")
          or (rowIndex%2==0 and "villageWindow" or "villageWall"),
          x=wallHalfWidth,z=z,height=5,lift=0}
        pieces[#pieces+1]={asset=house.masonry and villageDetailReady and "villageStoneWall"
          or (house.sideWindow and "villageWindow" or "villageWall"),
          x=-wallHalfWidth,z=z,height=5,lift=0}
        if house.storeys==2 then
          pieces[#pieces+1]={asset="villageWindow",x=wallHalfWidth,z=z,height=5,lift=5}
          pieces[#pieces+1]={asset=rowIndex%2==0 and "villageWall" or "villageWindow",x=-wallHalfWidth,z=z,height=5,lift=5}
        end
        -- [본채] 모든 집에 오리지널 경사 박공지붕, 평지붕은 헛간에만.
        pieces[#pieces+1]={asset="villageRoof",
          x=roofOffset,z=z,height=gableHeight,lift=roofLift}
      end
      for _,sideZ in ipairs({-endZ,endZ}) do
        -- [박공 양쪽] 폭 5 벽 한 개씩, 예전 두 개 병렬 배치로 생긴 과잉 폭 제거.
        pieces[#pieces+1]={asset=house.masonry and villageDetailReady and "villageStoneWall"
          or (house.sideWindow and sideZ<0 and "villageWindow" or "villageWall"),
          x=0,z=sideZ,height=5,lift=0,angle=math.pi*.5}
        if house.storeys==2 then
          pieces[#pieces+1]={asset=sideZ>0 and "villageWindow" or "villageWall",
            x=0,z=sideZ,height=5,lift=5,angle=math.pi*.5}
        end
        pieces[#pieces+1]={asset="villageRoofEnd",x=roofOffset,z=sideZ,
          height=gableHeight,lift=roofLift,angle=sideZ>0 and math.pi or 0}
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
            pieces[#pieces+1]={asset="villagePillar",x=3.1,z=house.doorZ+offset,
              height=3.7,lift=0,decoration=true}
          end
        end
        if house.archway then
          pieces[#pieces+1]={asset="villageArch",x=4.1,z=house.doorZ,
            height=4.9,lift=0,angle=math.pi*.5,decoration=true}
        end
      end
      -- [ㄱ자 집 / 마당 작업동] 기존에 다운로드·검증해 등록한 Kenney CC0 벽·문·지붕을
      -- 본채 측면에 직각으로 연결한다. 단색 집을 복제하지 않고 실제 외곽 실루엣을 바꾼다.
      -- 현관 반대편에 붙여 원래 문·NPC 동선을 가리지 않는다.
      if house.wing then
        -- [실제 연결된 ㄱ자 옆채] 한 장의 경사지붕과 원본 벽 세 장을 연결.
        -- 예전 겹친 두 지붕과 떨어져 있는 x=16.2 외벽은 제거.
        local w=house.wing
        local wingZ=house.wingZ or 0
        local wingRoofX=w*5.3
        local wingWallX=w*8.2
        pieces[#pieces+1]={asset="villageRoof",x=wingRoofX,z=wingZ,
          height=3.5,lift=4.65,angle=math.pi*.5}
        pieces[#pieces+1]={asset="villageWindow",x=wingWallX,z=wingZ,
          height=5,lift=0,secondary=true}
        for _,side in ipairs({-2.5,2.5}) do
          pieces[#pieces+1]={asset="villageWall",x=wingRoofX,z=wingZ+side,
            height=5,lift=0,angle=math.pi*.5,secondary=true}
        end
        pieces[#pieces+1]={asset="villageRoofEnd",x=wingWallX,z=wingZ,
          height=3.5,lift=4.65,angle=w<0 and -math.pi*.5 or math.pi*.5}
      end
            -- [헛간·오두막] 낮은 측면 창고 차양. 원본 지붕 부재를 이용하고 빈 파츠는 만들지 않는다.
      if house.leanTo then
        -- [헛간 차양] 평판 원본 지붕을 본채 측면에 붙여 가로 길이에 맞춰 연결.
        for _,z in ipairs(roofRows) do
          pieces[#pieces+1]={asset=villageDetailReady and "villageFlatRoof" or "villageRoof",
            x=-4.35,z=z,height=2.45,lift=3.05,angle=math.pi*.5,decoration=true}
        end
      end
            -- [큰 건물 전면 회랑] 여관·회관의 2층 처마를 넓게 이어 단층 주택과 구별한다.
      if house.balcony and house.storeys==2 then
        for _,offset in ipairs({-5.4,0,5.4}) do
          pieces[#pieces+1]={asset=villageDetailReady and "villageFlatRoof" or "villageRoof",
            x=4.05,z=offset,height=2.15,lift=5.1,angle=math.pi*.5,decoration=true}
        end
      end
      -- [차양] 집의 원본 지붕 메시를 재사용하며 단순 Part를 새로 생성하지 않는다.
      for porchIndex=1,house.porch do
        local porchZ=house.porch==1 and house.doorZ
          or (porchIndex==1 and house.doorZ-2.7 or house.doorZ+2.7)
        pieces[#pieces+1]={asset="villageRoof",x=4.05,z=porchZ,height=2.2,
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
          model:SetAttribute("VillageDistrict",house.district)
          model:SetAttribute("VillageRoofSilhouette",roofSilhouette)
          model:PivotTo(model:GetPivot()*CFrame.Angles(0,rot+(piece.angle or 0),0))
          -- [대장간·농가 굴뚝 연기] 등록된 실제 CC0 굴뚝 메시 꼭대기에만 매우 작은 연무를 만든다.
          if piece.asset=="villageChimney" then
            local top=model:FindFirstChildWhichIsA("MeshPart",true)
            if top then
              local mouth=Instance.new("Attachment")
              mouth.Name="VillageChimneyFlue"
              mouth.Position=Vector3.new(0,top.Size.Y*.48,0)
              mouth.Parent=top
              local smoke=Instance.new("ParticleEmitter")
              smoke.Name="MeadowVillageHearthSmoke"
              smoke.Texture="rbxasset://textures/particles/smoke_main.dds"
              smoke.Color=ColorSequence.new(Color3.fromRGB(135,130,117),Color3.fromRGB(175,175,164))
              smoke.Transparency=NumberSequence.new({
                NumberSequenceKeypoint.new(0,.78),
                NumberSequenceKeypoint.new(.38,.65),
                NumberSequenceKeypoint.new(1,1),
              })
              smoke.Size=NumberSequence.new({
                NumberSequenceKeypoint.new(0,.55),
                NumberSequenceKeypoint.new(1,2.2),
              })
              smoke.Lifetime=NumberRange.new(2.8,4.4)
              smoke.Speed=NumberRange.new(.6,1.25)
              smoke.Drag=1.4
              smoke.SpreadAngle=Vector2.new(13,13)
              smoke.Rate=.7
              smoke.Parent=mouth
            end
          end
          for _,mesh in ipairs(model:GetDescendants()) do
            if mesh:IsA("MeshPart") then
              mesh.CanCollide=piece.lift==0
              -- [지붕 색 보존] 원본 청록색 텍스처가 집별 Slate·Wood 색을 덮지 않는다.
              if piece.asset=="villageRoof" or piece.asset=="villageRoofEnd"
                or piece.asset=="villageFlatRoof" or piece.asset=="villageWall"
                or piece.asset=="villageStoneWall" then
                local appearance=mesh:FindFirstChildOfClass("SurfaceAppearance")
                if appearance then appearance:Destroy() end
                if mesh.TextureID~="" then mesh.TextureID="" end
                mesh.MaterialVariant=""
              end
              if piece.asset=="villageRoof" or piece.asset=="villageRoofEnd" or piece.asset=="villageFlatRoof" then
                mesh.Color=house.roof:Lerp(Color3.fromRGB(87,83,73),(partIndex%3)*.055)
                mesh.Material=house.masonry and Enum.Material.Slate or Enum.Material.WoodPlanks
              elseif piece.asset=="villageStoneWall" or piece.asset=="villagePillar" or piece.asset=="villageArch" then
                mesh.Color=Color3.fromRGB(137,133,117)
                mesh.Material=Enum.Material.Slate
              elseif piece.asset=="villageWall" then
                mesh.Color=house.timber:Lerp(Color3.fromRGB(91,85,73),(partIndex%4)*.06)
                mesh.Material=Enum.Material.Wood
              end
            end
          end
          -- [밤의 주거지] 기존 CC0 벽창에만 창문 불빛을 한 집당 하나 켠다.
          if piece.asset=="villageWindow" and house.lantern and not houseWindowLit then
            local host=model:FindFirstChildWhichIsA("MeshPart",true)
            if host then
              local light=Instance.new("PointLight")
              light.Name="MeadowVillageWindowGlow"
              light.Color=Color3.fromRGB(255,193,124)
              light.Brightness=0
              light.Range=10
              light.Shadows=false
              light.Parent=host
              villageLanternLights[#villageLanternLights+1]=light
              villageWindowLightCount+=1
              houseWindowLit=true
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
              sign.MaxDistance=(house.district=="MARKET" or house.district=="CIVIC"
              or house.district=="HERBALISTS" or house.district=="CRAFT") and 50 or 29
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
        local sideX,sideZ=3.8*scale,house.doorZ*scale
        local x=house.x+sideX*math.cos(house.angle)-sideZ*math.sin(house.angle)
        local z=house.z+sideX*math.sin(house.angle)+sideZ*math.cos(house.angle)
        local entryLantern=worldAsset("villageLantern",Vector3.new(x,3,z),1.9,3.3*scale)
        if entryLantern then
          entryLantern.Name=house.name.."_EntranceLantern"
          entryLantern:SetAttribute("MeadowVillageScenery",true)
          -- [등불] 원본 CC0 랜턴 메시에서만 빛을 내며 새 외형 파츠를 만들지 않는다.
          local lanternMesh=entryLantern:FindFirstChildWhichIsA("MeshPart",true)
          if lanternMesh then
            local glow=Instance.new("PointLight")
            glow.Name="MeadowVillageLanternGlow"
            glow.Color=Color3.fromRGB(255,177,103)
            glow.Brightness=.85
            glow.Range=13
            glow.Shadows=false
            glow.Parent=lanternMesh
            villageLanternLights[#villageLanternLights+1]=glow
          end
        end
      end
      task.wait(.04)
    end
    -- [마을 숲 바닥·실물 수목] 평평한 검은 초원을 뒤덮던 단색 지면을
    -- 기존 Roblox Terrain 잔디/낙엽의 낮은 얼룩과 승인된 CC0 굽은 나무로 채운다.
    -- 건물 16채, 우물/게시판, 네 NPC, 굽은 길 19개와 상호작용 반경은 비운다.
    local villageGroundPatches=0
    local villageInteriorTrees=0
    for index=1,540 do
      local x=-265+((index*173)%529)+math.sin(index*.73)*3.1
      local z=-341+((index*113)%285)+math.cos(index*1.31)*3.1
      local position=Vector2.new(x,z)
      local blocked=math.abs(x)>265 or z < -345 or z > -52
        or (position-Vector2.new(0,-146)).Magnitude<25
        or (position-Vector2.new(0,-101)).Magnitude<19
        or (position-Vector2.new(-68,-122)).Magnitude<20
        or (position-Vector2.new(69,-129)).Magnitude<20
        or (position-Vector2.new(-2,-188)).Magnitude<19
      if not blocked then
        for _,house in ipairs(houses) do
          if (position-Vector2.new(house.x,house.z)).Magnitude<30*house.scale then
            blocked=true
            break
          end
        end
      end
      if not blocked then
        for _,route in ipairs(villageRoadRoutes) do
          for segment=1,#route.points-1 do
            local a,b=route.points[segment],route.points[segment+1]
            local first=Vector2.new(a[1],a[2])
            local axis=Vector2.new(b[1]-a[1],b[2]-a[2])
            local t=math.clamp((position-first):Dot(axis)/math.max(1,axis:Dot(axis)),0,1)
            if (position-(first+axis*t)).Magnitude<route.width+6 then
              blocked=true
              break
            end
          end
          if blocked then break end
        end
      end
      if not blocked and villageDetailReady and index%13==0 then
        -- 실제 등록된 Kenney 구부러진 나무와 높은 나무만 사용한다. 임시 구체·원뿔 없음.
        local treeType=index%3==0 and "villageTallTree" or "villageCrookedTree"
        local height=23+((index*7)%5)*1.8
        local tree=worldAsset(treeType,Vector3.new(x,3,z),height)
        if tree then
          tree.Name="Meadow_Village_InteriorTree_"..index
          tree:SetAttribute("MeadowVillageScenery",true)
          tree:SetAttribute("VillageTreeSource","REGISTERED_CC0")
          tree:PivotTo(tree:GetPivot()*CFrame.Angles(0,math.rad((index*73)%360),0))
          for _,mesh in ipairs(tree:GetDescendants()) do
            if mesh:IsA("MeshPart") then
              mesh.CanCollide=false
              mesh.CanQuery=false
              mesh.CastShadow=true
            end
          end
          villageInteriorTrees+=1
        end
      elseif not blocked then
        -- 반경 3~5 스터드, 지표 높이 변화 0.5 이내: 새 구조물/충돌 장식 생성 없음.
        local radius=3+((index*11)%5)*.55
        meadowTerrain:FillBall(Vector3.new(x,2.06-radius+.43,z),radius,
          index%7==0 and Enum.Material.Ground or
          index%5==0 and Enum.Material.Grass or Enum.Material.LeafyGrass)
        villageGroundPatches+=1
      end
      if index%16==0 then task.wait() end
    end
    gameWorld:SetAttribute("MeadowVillageGroundPatchCount",villageGroundPatches)
    gameWorld:SetAttribute("MeadowVillageInteriorTreeCount",villageInteriorTrees)
    -- [시장·생활 마당] 식탁처럼 보이던 가판대를 늘리지 않고 두 장터만 유지한다.
    -- 기존 CC0 카트·울타리·등불을 농가와 골목에 비대칭 분산 배치한다.
    local furnishings={
      {"villageStall",-42,-151,3.15,.21},{"villageStall",43,-151,3.4,-.28},
      {"villageCart",-65,-187,6,.34},{"villageCart",62,-253,5.6,-.31},
      {"villageCart",-165,-234,6.1,.15},{"villageCart",176,-148,6.1,-.5},
      {"villageLantern",-17,-102,5,0},{"villageLantern",19,-113,5,0},
      {"villageLantern",-14,-184,5,0},{"villageLantern",18,-201,5,0},
      {"villageLantern",-33,-269,5,0},{"villageLantern",24,-285,5,0},
      {"villageLantern",-143,-119,4.8,0},{"villageLantern",157,-185,4.8,0},
      -- [첫마을 동선] 실제 등록된 랜턴·수레를 골목 가장자리에 분산해 살아 있는 거리로 연출.
      -- 촌장·우물·의뢰판·주요 흙길의 충돌/접근 지점은 비워 둔다.
      {"villageLantern",-22,-69,4.5,.1},{"villageLantern",27,-86,4.5,-.1},
      {"villageLantern",-27,-205,4.8,.2},{"villageLantern",27,-280,4.8,-.2},
      -- [스카이림식 마을길 디테일] 중앙 길 양옆에 등불을 간격 맞춰 더 세우고 외곽 수레를 추가한다.
      -- 모두 기존 등록 CC0 랜턴·수레만 재사용한다. 지면을 못 찾는 자리는 자동으로 건너뛴다.
      {"villageLantern",-24,-126,4.8,.05},{"villageLantern",25,-136,4.8,-.05},
      {"villageLantern",-25,-168,4.8,.1},{"villageLantern",26,-176,4.8,-.1},
      {"villageLantern",-24,-224,4.8,.05},{"villageLantern",25,-236,4.8,-.05},
      {"villageLantern",-26,-252,4.8,.1},{"villageLantern",26,-262,4.8,-.1},
      {"villageCart",-112,-302,5.6,.2},{"villageCart",114,-312,5.8,-.25},
      {"villageCart",-96,-76,5.6,-.18},{"villageCart",101,-72,5.8,.22},
      {"villageCart",-135,-285,5.5,.32},{"villageCart",147,-291,5.8,-.27},
      {"villageFence",-153,-77,4.8,.22},{"villageFence",-159,-94,4.8,.14},
      {"villageFence",167,-84,4.8,-.27},{"villageFence",173,-106,4.8,-.12},
      {"villageFence",-145,-231,4.8,.32},{"villageFence",-163,-241,4.8,.14},
      {"villageFence",149,-238,4.8,-.25},{"villageFence",165,-247,4.8,-.18},
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
        {"villageArch",-251,-218,11.2,math.pi*.5,"서문 · 늑대 숲"},{"villageArch",251,-210,11.2,math.pi*.5,"동문 · 황혼 박쥐"},
        {"villageRuinWall",-263,-181,6.2,.1},{"villageRuinWall",249,-302,5.6,-.2},
        {"villagePillar",-31,-151,5.0,0},{"villagePillar",30,-153,5.0,0},
        {"villagePillar",-32,-237,5.0,.1},{"villagePillar",32,-239,5.0,-.1},
        {"villageTallTree",-250,-125,15,.22},{"villageTallTree",258,-226,16,-.28},
        {"villageCrookedTree",-246,-300,12,.13},{"villageCrookedTree",240,-73,14,-.15},
        -- 마을을 감싸는 외곽 숲 가장자리(키 큰 나무 + 휘어진 나무를 번갈아)
        {"villageTallTree",-217,-86,15,.3},{"villageCrookedTree",226,-96,13,-.2},
        {"villageTallTree",-206,-256,16,-.1},{"villageCrookedTree",216,-266,13,.25},
        {"villageTallTree",-124,-334,15,.2},{"villageCrookedTree",132,-338,14,-.3},
        {"villageCrookedTree",-206,-52,13,.1},{"villageTallTree",205,-48,16,-.2},
      }) do
        furnishings[#furnishings+1]=extra
      end
    end
    for index,row in ipairs(furnishings) do
      local propHeight=row[4]*1.3
      local model=worldAsset(row[1],Vector3.new(row[2],3,row[3]),propHeight)
      if model then
        model.Name="Meadow_Village_"..row[1].."_"..index
        model:SetAttribute("MeadowVillageScenery",true)
        model:PivotTo(model:GetPivot()*CFrame.Angles(0,row[5],0))
        -- [길잡이] 실제 등록된 석조 아치에만 동서문 표시를 달아 외곽 전투 동선을 명확히 한다.
        if row[6] then
          model:SetAttribute("VillageGate",row[6])
          local gateMesh=model:FindFirstChildWhichIsA("MeshPart",true)
          if gateMesh then
            local sign=Instance.new("BillboardGui")
            sign.Name="MeadowVillageGateSign"
            sign.Adornee=gateMesh
            sign.Size=UDim2.fromOffset(186,32)
            sign.StudsOffsetWorldSpace=Vector3.new(0,propHeight*.6,0)
            sign.MaxDistance=95
            sign.AlwaysOnTop=false
            sign.Parent=gateMesh
            local caption=Instance.new("TextLabel")
            caption.Size=UDim2.fromScale(1,1)
            caption.BackgroundTransparency=1
            caption.Font=Enum.Font.GothamBold
            caption.TextSize=16
            caption.TextStrokeTransparency=.28
            caption.TextColor3=Color3.fromRGB(247,219,168)
            caption.Text=row[6]
            caption.Parent=sign
          end
        end
        if row[1]=="villageFence" or row[1]=="villageCart" then
          for _,mesh in ipairs(model:GetDescendants()) do
            if mesh:IsA("MeshPart") then
              mesh.Color=Color3.fromRGB(118,94,71)
              mesh.Material=Enum.Material.Wood
              mesh.CanCollide=row[1]=="villageFence"
            end
          end
        elseif row[1]=="villageRuinWall"
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
            glow.Color=Color3.fromRGB(255,176,101)
            glow.Brightness=1.05
            glow.Range=15
            glow.Shadows=false
            glow.Parent=mesh
            villageLanternLights[#villageLanternLights+1]=glow
          end
        end
        villageProps+=1
      end
      if index%4==0 then task.wait(.03) end
    end
    -- [위쳐·스카이림식 생활 공간] 실제 등록된 CC0 모델만 구역별로 재사용한다.
    -- 장식은 퀘스트·길·충돌·경제의 소유권을 갖지 않는다.
    local villageLivedInScenes={
      -- [약초상 뒷마당] 약초 꾸러미·약병·울타리.
      {"villageFence",-120,-116,4.4,.14,"HERBALISTS"},
      {"villageFence",-121,-143,4.4,.05,"HERBALISTS"},
      {"item_potion1_filled",-128,-131,1.8,.32,"HERBALISTS"},
      {"item_pouch",-126,-149,2.4,-.24,"HERBALISTS"},
      {"villageCart",-135,-136,5.5,.27,"HERBALISTS"},
      -- [여관·장터] 짐수레·천막·보따리.
      {"villageStall",54,-76,5.1,.23,"MARKET"},
      {"item_chalice",50,-87,1.65,.12,"MARKET"},
      {"item_backpack",143,-131,3.0,-.35,"MARKET"},
      {"item_pouch",136,-132,2.4,.27,"MARKET"},
      {"villageCart",152,-137,6.1,-.3,"MARKET"},
      {"item_chickenleg",159,-155,1.7,.28,"MARKET"},
      -- [대장간·목수] 작업용 망치·벌목 도끼·석재와 장작.
      {"item_hammer_double",-130,-202,2.4,-.18,"CRAFT"},
      {"item_rock_1",-141,-195,3.3,.19,"CRAFT"},
      {"item_woodlog",-135,-209,3.4,.38,"CRAFT"},
      {"villageCart",-148,-211,5.8,-.25,"CRAFT"},
      {"item_axe_small",-215,-183,2.2,.28,"CRAFT"},
      {"item_woodlog",-221,-199,3.6,-.14,"CRAFT"},
      {"item_woodlog",-216,-212,3.0,.36,"CRAFT"},
      -- [숲 가장자리] 벌목꾼·숲지기의 작업 흔적.
      {"item_woodlog",-215,-121,4.1,.32,"FOREST_EDGE"},
      {"item_axe_small",-210,-131,2.5,-.18,"FOREST_EDGE"},
      {"villageCart",-222,-136,5.8,.43,"FOREST_EDGE"},
      {"item_bow_wooden",216,-130,2.5,.18,"FOREST_EDGE"},
      {"villageFence",227,-143,5.0,-.18,"FOREST_EDGE"},
      -- [주거지] 땔감·보따리·가벼운 뒷마당.
      {"villageFence",-126,-260,4.6,.12,"RESIDENTIAL"},
      {"item_woodlog",-129,-276,2.9,-.29,"RESIDENTIAL"},
      {"item_pouch",128,-256,2.0,.34,"RESIDENTIAL"},
      {"villageCart",139,-265,5.2,-.21,"RESIDENTIAL"},
      {"villageFence",143,-282,4.4,-.12,"RESIDENTIAL"},
      -- [농가·창고] 곡물 수송로를 따라 수레·울타리.
      {"villageFence",-237,-266,4.7,.12,"FARMLAND"},
      {"villageFence",-239,-284,4.7,.08,"FARMLAND"},
      {"villageCart",-228,-284,5.7,-.16,"FARMLAND"},
      {"item_pouch",-213,-298,2.6,.19,"FARMLAND"},
      {"item_woodlog",221,-291,3.2,-.19,"FARMLAND"},
      {"villageFence",242,-291,4.8,-.17,"FARMLAND"},
      {"item_pouch",250,-322,2.7,.13,"FARMLAND"},
      {"villageCart",247,-276,5.6,.3,"FARMLAND"},
      -- [여관 앞마당] 술잔·닭다리·책 한 권이 놓인 손님 자리, 입구 등불, 짐수레.
      {"item_chalice",76,-92,1.65,.4,"MARKET"},{"item_chickenleg",72,-100,1.7,-.3,"MARKET"},
      {"item_book1_closed",69,-90,1.6,.6,"MARKET"},{"item_chalice",73,-107,1.65,-.5,"MARKET"},
      {"villageLantern",80,-84,4.6,0,"MARKET"},{"villageLantern",79,-116,4.6,0,"MARKET"},
      {"villageCart",114,-82,5.6,.2,"MARKET"},{"item_backpack",120,-90,3.0,-.4,"MARKET"},
      -- [마을 회관] 공고 두루마리와 열쇠, 양옆 등불.
      {"villageLantern",83,-149,4.6,0,"MARKET"},{"villageLantern",83,-174,4.6,0,"MARKET"},
      {"item_scroll",84,-158,1.8,.3,"MARKET"},{"item_key1",83,-165,1.5,-.2,"MARKET"},
      -- [대장간] 만들다 만 검, 철 갑옷, 금괴, 화로 곁 횃불.
      {"item_sword",-112,-184,2.6,.9,"CRAFT"},{"item_armor_metal",-84,-205,3.2,-.3,"CRAFT"},
      {"item_gold_ingots",-120,-196,1.8,.5,"CRAFT"},{"item_torch",-86,-178,2.4,0,"CRAFT"},
      {"item_dagger",-109,-206,1.8,-.7,"CRAFT"},
      -- [약초상] 약병 선반 느낌의 병들과 광물, 약초 책.
      {"item_potion2_filled",-100,-124,1.8,.2,"HERBALISTS"},{"item_potion3_filled",-82,-124,1.8,-.3,"HERBALISTS"},
      {"item_potion4_filled",-96,-146,1.8,.5,"HERBALISTS"},{"item_mineral",-104,-143,2.2,.1,"HERBALISTS"},
      {"item_book1_closed",-83,-146,1.6,.4,"HERBALISTS"},
      -- [농가·마구간] 장작더미, 짐수레, 울타리, 곡식 자루.
      {"item_woodlog",166,-262,3.0,.4,"FARMLAND"},{"item_woodlog",168,-286,3.2,.7,"FARMLAND"},
      {"villageCart",200,-258,5.6,.2,"FARMLAND"},{"villageFence",208,-264,4.8,.1,"FARMLAND"},
      {"item_pouch",196,-290,2.6,-.3,"FARMLAND"},
      -- [곡물 창고] 곡식 자루와 수레, 장작.
      {"item_pouch",-168,-256,2.6,.2,"FARMLAND"},{"villageCart",-196,-254,5.6,-.2,"FARMLAND"},
      {"item_woodlog",-166,-284,3.2,.3,"FARMLAND"},{"item_pouch",-196,-284,2.6,.6,"FARMLAND"},
      -- [동서 숲길] 등록된 실제 랜턴에만 밤빛을 더한다.
      {"villageLantern",-243,-234,4.3,0,"GATE"},
      {"villageLantern",241,-229,4.3,0,"GATE"},
    }
    local livedInCount=0
    for index,row in ipairs(villageLivedInScenes) do
      local position=Vector2.new(row[2],row[3])
      local protected=false
      for _,node in ipairs({
        {0,-101,19},{0,-146,19},{-68,-122,15},{69,-129,15},
        {-2,-188,15},{-41,-128,13},{-24,-174,13},{57,-207,13},
      }) do
        if (position-Vector2.new(node[1],node[2])).Magnitude<node[3] then
          protected=true
          break
        end
      end
      if not protected then
        local item=worldAsset(row[1],Vector3.new(row[2],3,row[3]),row[4])
        if item then
          item.Name="Meadow_Village_LivedIn_"..row[6].."_"..index
          item:SetAttribute("MeadowVillageScenery",true)
          item:SetAttribute("VillageDistrict",row[6])
          item:SetAttribute("VillageDressingSource","REGISTERED_CC0_NATIVE_ASSET")
          -- 수입 모델의 피벗이 떠 있어도 보이는 메시 중심으로만 회전한다.
          local box=item:GetBoundingBox()
          item:PivotTo(CFrame.new(box.Position)*CFrame.Angles(0,row[5],0)
            *CFrame.new(-box.Position)*item:GetPivot())
          for _,mesh in ipairs(item:GetDescendants()) do
            if mesh:IsA("MeshPart") then
              mesh.CanCollide=false
              mesh.CanQuery=false
              mesh.CanTouch=false
              if row[1]=="villageFence" or row[1]=="villageCart" then
                mesh.Material=Enum.Material.Wood
                mesh.Color=row[6]=="FARMLAND" and Color3.fromRGB(121,104,78)
                  or row[6]=="CRAFT" and Color3.fromRGB(102,83,69)
                  or Color3.fromRGB(130,104,80)
              end
            end
          end
          if row[1]=="villageLantern" then
            local host=item:FindFirstChildWhichIsA("MeshPart",true)
            if host then
              local light=Instance.new("PointLight")
              light.Name="MeadowVillageLanternGlow"
              light.Color=Color3.fromRGB(255,179,111)
              light.Brightness=0
              light.Range=13
              light.Shadows=false
              light.Parent=host
              villageLanternLights[#villageLanternLights+1]=light
            end
          end
          livedInCount+=1
        end
      end
      if index%5==0 then task.wait(.03) end
    end
    gameWorld:SetAttribute("MeadowVillageLivedInDetailCount",livedInCount)
    gameWorld:SetAttribute("MeadowVillageWindowLightCount",villageWindowLightCount)
    -- [마을 3D 디테일 V2] Kenney CC0(Town/Survival/Food/Nature) 실물 모델만 사용한다. 파츠 조립 없음.
    -- 좌표는 도로·건물·퀘스트 보호 지점·기존 소품과 겹치지 않도록 미리 검증한 값이다.
    -- {키, x, z, 높이, 회전, 구역, 지면 위 높이(상자·통 위 음식)}
    do
    local villageDetailV2={
      {"vxBucket",-109.3,-137.2,1.79,0.36,"HERBALISTS",0},
      {"vxBarrelOpen",-107.6,-133.8,3.2,2.72,"HERBALISTS",0},
      {"villageHedge",-82.5,-114.7,1.55,4.01,"HERBALISTS",0},
      {"villageHedge",-104.9,-118.6,1.55,0.39,"HERBALISTS",0},
      {"vxPotStew",-85.2,-153.2,0.61,1.53,"HERBALISTS",0},
      {"vxCabbage",-76.0,-148.0,0.9,1.81,"HERBALISTS",0},
      {"vxFoodPumpkin",-89.2,-153.1,1.2,5.5,"HERBALISTS",0},
      {"vxBox",-72.7,-139.6,2.35,4.17,"HERBALISTS",0},
      {"vxApple",-72.5,-139.5,0.45,6.24,"HERBALISTS",2.3},
      {"vxPie",-72.3,-139.9,0.26,2.42,"HERBALISTS",2.3},
      {"villageStallRed",92.3,-76.3,7.69,0.13,"MARKET",0},
      {"villageStallGreen",111.4,-116.5,7.69,-3.01,"MARKET",0},
      {"villageBannerRed",83.3,-121.1,5.21,1.04,"MARKET",0},
      {"villageStallBench",97.0,-125.1,1.43,-3.01,"MARKET",0},
      {"villageStallStool",75.6,-86.9,1.43,3.99,"MARKET",0},
      {"vxBarrel",112.8,-99.0,3.2,0.64,"MARKET",0},
      {"vxBarrel",115.5,-95.0,3.2,6.15,"MARKET",0},
      {"vxBarrelOpen",104.8,-76.7,3.2,3.35,"MARKET",0},
      {"vxBox",96.0,-120.8,2.35,1.4,"MARKET",0},
      {"vxFoodPumpkin",96.3,-120.5,1.2,4.65,"MARKET",2.3},
      {"vxFoodCarrot",95.8,-120.8,1.0,2.23,"MARKET",2.3},
      {"vxBoxOpen",111.4,-95.4,2.91,1.76,"MARKET",0},
      {"vxCheese",111.4,-95.4,0.37,1.22,"MARKET",2.51},
      {"vxBoxOpen",74.4,-112.7,2.91,5.08,"MARKET",0},
      {"vxPie",74.4,-112.7,0.26,6.21,"MARKET",2.51},
      {"vxBarrel",92.0,-122.4,3.2,1.12,"MARKET",0},
      {"vxMug",92.3,-122.4,0.46,4.96,"MARKET",3.15},
      {"vxMug",91.6,-122.2,0.46,2.09,"MARKET",3.15},
      {"vxWorkbenchAnvil",-90.4,-216.1,3.2,2.49,"CRAFT",0},
      {"vxWorkbench",-117.6,-179.0,2.73,4.55,"CRAFT",0},
      {"vxWorkbenchGrind",-91.6,-210.2,2.63,5.19,"CRAFT",0},
      {"vxResourcePlanks",-76.1,-195.7,0.85,2.2,"CRAFT",0},
      {"vxResourceWood",-115.4,-198.5,0.56,0.09,"CRAFT",0},
      {"vxResourceStone",-119.6,-183.5,1.03,5.19,"CRAFT",0},
      {"vxBoxLarge",-93.4,-174.4,2.35,1.84,"CRAFT",0},
      {"vxBarrel",-96.7,-171.5,3.2,1.63,"CRAFT",0},
      {"vxToolPickaxe",-118.8,-187.4,2.26,5.68,"CRAFT",0},
      {"vxToolShovel",-75.0,-192.4,2.73,1.08,"CRAFT",0},
      {"vxPlanks",-101.8,-170.5,0.37,3.19,"CRAFT",0},
      {"vxPoles",-105.4,-215.4,6.2,5.92,"CRAFT",0},
      {"villageBannerRed",97.4,-135.1,5.21,1.04,"CIVIC",0},
      {"villageBannerGreen",125.6,-170.9,5.21,-0.35,"CIVIC",0},
      {"vxChest",113.4,-144.2,2.44,2.78,"CIVIC",0},
      {"vxSignpost",105.1,-189.2,4.32,0.66,"CIVIC",0},
      {"villageHedgeLarge",114.4,-138.5,3.72,4.15,"CIVIC",0},
      {"villageHedge",110.1,-180.5,1.55,2.71,"CIVIC",0},
      {"villagePillarWood",107.0,-138.5,6.2,4.54,"CIVIC",0},
      {"villageHedge",-98.1,-239.8,1.55,3.22,"RESIDENTIAL",0},
      {"vxBucket",-69.9,-247.8,1.79,4.95,"RESIDENTIAL",0},
      {"vxBarrel",-90.5,-241.0,3.2,4.89,"RESIDENTIAL",0},
      {"vxResourceWood",-107.0,-246.5,0.56,5.15,"RESIDENTIAL",0},
      {"villageStallBench",-73.0,-264.9,1.43,-2.75,"RESIDENTIAL",0},
      {"villageWheel",-102.6,-249.1,2.98,5.9,"RESIDENTIAL",0},
      {"vxFoodPumpkin",-102.1,-270.7,1.2,0.53,"RESIDENTIAL",0},
      {"vxBox",-79.6,-267.9,2.35,5.42,"RESIDENTIAL",0},
      {"vxLoafRound",-79.8,-267.9,0.49,5.82,"RESIDENTIAL",2.3},
      {"vxApple",-79.8,-268.3,0.45,3.31,"RESIDENTIAL",2.3},
      {"villageHedge",90.2,-233.0,1.55,1.01,"RESIDENTIAL",0},
      {"vxBucket",105.8,-244.5,1.79,1.96,"RESIDENTIAL",0},
      {"vxBarrel",81.7,-229.8,3.2,1.82,"RESIDENTIAL",0},
      {"vxResourceWood",79.6,-236.5,0.56,1.57,"RESIDENTIAL",0},
      {"villageStallBench",110.1,-248.0,1.43,-2.87,"RESIDENTIAL",0},
      {"villageWheel",72.3,-255.5,2.98,2.98,"RESIDENTIAL",0},
      {"vxFoodPumpkin",104.6,-256.8,1.2,5.15,"RESIDENTIAL",0},
      {"vxBox",71.1,-241.9,2.35,5.24,"RESIDENTIAL",0},
      {"vxFoodFish",70.9,-242.2,0.54,1.44,"RESIDENTIAL",2.3},
      {"vxLoafBaguette",70.8,-241.5,0.42,4.58,"RESIDENTIAL",2.3},
      {"vxTreeLog",-164.9,-93.2,2.63,6.17,"FOREST_EDGE",0},
      {"vxTreeLog",-170.4,-121.6,2.63,3.93,"FOREST_EDGE",0},
      {"vxResourceWood",-165.5,-120.8,0.56,0.35,"FOREST_EDGE",0},
      {"vxToolAxe",-186.6,-123.6,2.44,3.18,"FOREST_EDGE",0},
      {"vxCampfirePit",-160.1,-112.3,1.03,4.35,"FOREST_EDGE",0},
      {"vxTent",-162.9,-104.6,4.61,1.69,"FOREST_EDGE",0},
      {"vxBedrollPacked",-187.8,-90.9,0.85,2.03,"FOREST_EDGE",0},
      {"vxRockA",-174.8,-93.6,3.67,2.11,"FOREST_EDGE",0},
      {"vxTreeLog",192.9,-103.3,2.63,4.12,"FOREST_EDGE",0},
      {"vxTreeLog",178.2,-91.6,2.63,0.57,"FOREST_EDGE",0},
      {"vxResourceWood",184.7,-127.0,0.56,3.69,"FOREST_EDGE",0},
      {"vxToolAxe",164.3,-101.3,2.44,3.96,"FOREST_EDGE",0},
      {"vxCampfirePit",196.6,-101.1,1.03,5.36,"FOREST_EDGE",0},
      {"vxTent",189.9,-94.5,4.61,4.93,"FOREST_EDGE",0},
      {"vxBedrollPacked",161.3,-123.6,0.85,4.53,"FOREST_EDGE",0},
      {"vxRockA",160.7,-111.4,3.67,3.89,"FOREST_EDGE",0},
      {"vxWorkbenchAnvil",-165.9,-174.1,3.2,4.49,"CRAFT",0},
      {"vxWorkbench",-197.7,-192.5,2.73,4.4,"CRAFT",0},
      {"vxWorkbenchGrind",-201.0,-191.8,2.63,4.73,"CRAFT",0},
      {"vxResourcePlanks",-198.4,-199.9,0.85,0.1,"CRAFT",0},
      {"vxResourceWood",-187.3,-210.6,0.56,4.47,"CRAFT",0},
      {"vxResourceStone",-159.6,-196.5,1.03,0.53,"CRAFT",0},
      {"vxBoxLarge",-159.5,-185.8,2.35,6.03,"CRAFT",0},
      {"vxBarrel",-192.5,-177.7,3.2,0.32,"CRAFT",0},
      {"vxToolPickaxe",-178.4,-173.3,2.26,2.87,"CRAFT",0},
      {"vxToolShovel",-159.0,-181.6,2.73,5.64,"CRAFT",0},
      {"vxPlanks",-162.7,-180.4,0.37,4.69,"CRAFT",0},
      {"vxPoles",-169.0,-205.4,6.2,4.75,"CRAFT",0},
      {"villageStallRed",157.8,-174.9,7.69,0.8,"MARKET",0},
      {"villageStallGreen",196.8,-170.1,7.69,-0.06,"MARKET",0},
      {"villageBannerRed",163.8,-190.3,5.21,1.5,"MARKET",0},
      {"villageStallBench",193.9,-182.8,1.43,-0.06,"MARKET",0},
      {"villageStallStool",173.6,-196.7,1.43,2.93,"MARKET",0},
      {"vxBarrel",180.3,-201.7,3.2,3.45,"MARKET",0},
      {"vxBarrel",199.8,-180.7,3.2,2.43,"MARKET",0},
      {"vxBarrelOpen",177.7,-197.1,3.2,2.26,"MARKET",0},
      {"vxBox",165.7,-166.0,2.35,5.5,"MARKET",0},
      {"vxFoodFish",165.3,-165.6,0.54,4.28,"MARKET",2.3},
      {"vxApple",165.6,-165.8,0.45,2.61,"MARKET",2.3},
      {"vxBoxOpen",193.5,-186.2,2.91,0.07,"MARKET",0},
      {"vxPie",193.5,-186.2,0.26,1.82,"MARKET",2.51},
      {"vxBoxOpen",173.2,-159.1,2.91,1.57,"MARKET",0},
      {"vxCheese",173.2,-159.1,0.37,2.74,"MARKET",2.51},
      {"vxBarrel",182.0,-197.8,3.2,0.18,"MARKET",0},
      {"vxMug",182.3,-197.8,0.46,4.79,"MARKET",3.15},
      {"vxMug",181.6,-197.6,0.46,2.51,"MARKET",3.15},
      {"villageCartHigh",-176.7,-252.5,5.33,5.86,"FARMLAND",0},
      {"vxBoxLarge",-200.8,-258.2,2.35,0.87,"FARMLAND",0},
      {"vxBarrel",-185.9,-250.8,3.2,4.64,"FARMLAND",0},
      {"vxBucket",-191.1,-286.2,1.79,4.04,"FARMLAND",0},
      {"vxToolHoe",-163.0,-260.3,2.26,5.1,"FARMLAND",0},
      {"villageWheel",-201.9,-276.5,2.98,2.09,"FARMLAND",0},
      {"villageFenceGate",-190.6,-251.5,2.36,-3.12,"FARMLAND",0},
      {"vxFoodPumpkin",-175.0,-287.8,1.2,0.13,"FARMLAND",0},
      {"vxFoodPumpkin",-184.9,-247.0,1.2,3.13,"FARMLAND",0},
      {"villageHedge",-200.1,-279.1,1.55,4.31,"FARMLAND",0},
      {"vxBox",-205.0,-274.3,2.35,5.33,"FARMLAND",0},
      {"vxBread",-204.6,-274.4,0.07,4.06,"FARMLAND",2.3},
      {"vxCheese",-205.1,-274.5,0.37,5.12,"FARMLAND",2.3},
      {"villageCartHigh",199.9,-277.6,5.33,2.67,"FARMLAND",0},
      {"vxBoxLarge",184.0,-297.0,2.35,6.08,"FARMLAND",0},
      {"vxBarrel",203.7,-284.2,3.2,3.32,"FARMLAND",0},
      {"vxBucket",161.9,-269.9,1.79,4.92,"FARMLAND",0},
      {"vxToolHoe",185.0,-255.8,2.26,6.11,"FARMLAND",0},
      {"villageWheel",196.2,-285.0,2.98,4.88,"FARMLAND",0},
      {"villageFenceGate",166.0,-281.4,2.36,2.51,"FARMLAND",0},
      {"vxFoodPumpkin",176.7,-297.6,1.2,3.94,"FARMLAND",0},
      {"vxFoodPumpkin",183.6,-292.0,1.2,1.89,"FARMLAND",0},
      {"villageHedge",183.0,-252.9,1.55,3.44,"FARMLAND",0},
      {"vxBox",201.9,-270.3,2.35,4.08,"FARMLAND",0},
      {"vxApple",201.6,-269.9,0.45,4.07,"FARMLAND",2.3},
      {"vxFoodPumpkin",201.5,-270.6,1.2,2.67,"FARMLAND",2.3},
      {"villageHedge",-110.5,-330.5,1.55,2.28,"RESIDENTIAL",0},
      {"vxBucket",-109.3,-292.3,1.79,0.42,"RESIDENTIAL",0},
      {"vxBarrel",-120.4,-311.6,3.2,4.81,"RESIDENTIAL",0},
      {"vxResourceWood",-97.8,-295.1,0.56,1.67,"RESIDENTIAL",0},
      {"villageStallBench",-91.9,-322.1,1.43,3.06,"RESIDENTIAL",0},
      {"villageWheel",-118.6,-322.1,2.98,4.46,"RESIDENTIAL",0},
      {"vxFoodPumpkin",-92.2,-301.8,1.2,1.04,"RESIDENTIAL",0},
      {"vxBox",-121.8,-314.8,2.35,1.96,"RESIDENTIAL",0},
      {"vxPie",-121.5,-314.3,0.26,2.78,"RESIDENTIAL",2.3},
      {"vxFoodFish",-122.2,-315.2,0.54,0.51,"RESIDENTIAL",2.3},
      {"villageHedge",97.5,-292.6,1.55,0.55,"RESIDENTIAL",0},
      {"vxBucket",100.3,-328.2,1.79,3.4,"RESIDENTIAL",0},
      {"vxBarrel",93.3,-324.7,3.2,3.93,"RESIDENTIAL",0},
      {"vxResourceWood",120.3,-316.6,0.56,4.69,"RESIDENTIAL",0},
      {"villageStallBench",97.0,-332.1,1.43,2.92,"RESIDENTIAL",0},
      {"villageWheel",87.8,-323.8,2.98,5.95,"RESIDENTIAL",0},
      {"vxFoodPumpkin",110.3,-332.9,1.2,5.12,"RESIDENTIAL",0},
      {"vxBox",126.6,-310.8,2.35,1.91,"RESIDENTIAL",0},
      {"vxPie",126.7,-311.0,0.26,2.01,"RESIDENTIAL",2.3},
      {"vxCabbage",126.5,-310.5,0.9,0.5,"RESIDENTIAL",2.3},
      {"villageCartHigh",-211.9,-319.3,5.33,2.05,"FARMLAND",0},
      {"vxBoxLarge",-247.5,-322.8,2.35,2.81,"FARMLAND",0},
      {"vxBarrel",-242.3,-335.5,3.2,4.7,"FARMLAND",0},
      {"vxBucket",-218.6,-337.9,1.79,0.76,"FARMLAND",0},
      {"vxToolHoe",-230.2,-338.4,2.26,1.55,"FARMLAND",0},
      {"villageWheel",-215.8,-334.8,2.98,2.05,"FARMLAND",0},
      {"villageFenceGate",-222.5,-339.9,2.36,-2.48,"FARMLAND",0},
      {"vxFoodPumpkin",-217.7,-312.5,1.2,6.11,"FARMLAND",0},
      {"vxFoodPumpkin",-246.1,-332.9,1.2,2.34,"FARMLAND",0},
      {"villageHedge",-238.0,-335.6,1.55,0.07,"FARMLAND",0},
      {"vxBox",-237.5,-306.8,2.35,1.16,"FARMLAND",0},
      {"vxCheese",-237.8,-306.5,0.37,3.44,"FARMLAND",2.3},
      {"vxBread",-238.0,-307.2,0.07,2.48,"FARMLAND",2.3},
      {"villageCartHigh",206.8,-330.3,5.33,0.57,"FARMLAND",0},
      {"vxBoxLarge",236.6,-306.4,2.35,2.57,"FARMLAND",0},
      {"vxBarrel",222.3,-306.4,3.2,5.99,"FARMLAND",0},
      {"vxBucket",218.5,-305.8,1.79,2.24,"FARMLAND",0},
      {"vxToolHoe",244.4,-324.4,2.26,1.24,"FARMLAND",0},
      {"villageWheel",223.6,-341.2,2.98,0.04,"FARMLAND",0},
      {"villageFenceGate",234.0,-340.9,2.36,2.36,"FARMLAND",0},
      {"vxFoodPumpkin",234.4,-310.3,1.2,3.47,"FARMLAND",0},
      {"vxFoodPumpkin",212.1,-341.0,1.2,0.56,"FARMLAND",0},
      {"villageHedge",212.7,-336.8,1.55,3.17,"FARMLAND",0},
      {"vxBox",233.5,-345.0,2.35,1.24,"FARMLAND",0},
      {"vxCabbage",234.0,-345.0,0.9,0.34,"FARMLAND",2.3},
      {"vxApple",234.0,-345.1,0.45,5.68,"FARMLAND",2.3},
      {"vxSignpost",12.0,-63.6,4.32,1.46,"GATE",0},
      {"vxSignpost",-12.9,-206.7,4.32,-0.0,"GATE",0},
      {"vxSignpost",8.7,-292.6,4.32,2.26,"GATE",0},
      {"vxSignpost",-155.7,-201.9,4.32,-1.29,"GATE",0},
      {"vxSignpost",143.8,-201.9,4.32,0.27,"GATE",0},
      {"SOIL",-201.3,-301.2,0.1,0,"FARMLAND",0},
      {"SOIL",-201.3,-298.4,0.1,0,"FARMLAND",0},
      {"SOIL",-201.3,-295.6,0.1,0,"FARMLAND",0},
      {"SOIL",-197.0,-301.2,0.1,0,"FARMLAND",0},
      {"SOIL",-197.0,-298.4,0.1,0,"FARMLAND",0},
      {"SOIL",-197.0,-295.6,0.1,0,"FARMLAND",0},
      {"SOIL",-192.7,-301.2,0.1,0,"FARMLAND",0},
      {"SOIL",-192.7,-298.4,0.1,0,"FARMLAND",0},
      {"SOIL",-192.7,-295.6,0.1,0,"FARMLAND",0},
      {"SOIL",-188.4,-301.2,0.1,0,"FARMLAND",0},
      {"SOIL",-188.4,-298.4,0.1,0,"FARMLAND",0},
      {"SOIL",-188.4,-295.6,0.1,0,"FARMLAND",0},
      {"vxFoodPumpkin",-202.2,-301.2,1.3,0.02,"FARMLAND",0.05},
      {"vxFoodPumpkin",-200.4,-301.2,1.3,6.19,"FARMLAND",0.05},
      {"vxFoodPumpkin",-202.2,-298.4,1.3,2.92,"FARMLAND",0.05},
      {"vxFoodPumpkin",-200.4,-298.4,1.3,2.81,"FARMLAND",0.05},
      {"vxFoodPumpkin",-202.2,-295.6,1.3,3.88,"FARMLAND",0.05},
      {"vxFoodPumpkin",-200.4,-295.6,1.3,5.14,"FARMLAND",0.05},
      {"vxFoodPumpkin",-197.9,-301.2,1.3,5.25,"FARMLAND",0.05},
      {"vxFoodPumpkin",-196.1,-301.2,1.3,5.09,"FARMLAND",0.05},
      {"vxFoodPumpkin",-197.9,-298.4,1.3,2.51,"FARMLAND",0.05},
      {"vxFoodPumpkin",-196.1,-298.4,1.3,0.42,"FARMLAND",0.05},
      {"vxFoodPumpkin",-197.9,-295.6,1.3,2.25,"FARMLAND",0.05},
      {"vxFoodPumpkin",-196.1,-295.6,1.3,2.29,"FARMLAND",0.05},
      {"vxFoodPumpkin",-193.6,-301.2,1.3,5.04,"FARMLAND",0.05},
      {"vxFoodPumpkin",-191.8,-301.2,1.3,3.17,"FARMLAND",0.05},
      {"vxFoodPumpkin",-193.6,-298.4,1.3,4.13,"FARMLAND",0.05},
      {"vxFoodPumpkin",-191.8,-298.4,1.3,0.26,"FARMLAND",0.05},
      {"vxFoodPumpkin",-193.6,-295.6,1.3,0.82,"FARMLAND",0.05},
      {"vxFoodPumpkin",-191.8,-295.6,1.3,5.79,"FARMLAND",0.05},
      {"vxFoodPumpkin",-189.3,-301.2,1.3,1.97,"FARMLAND",0.05},
      {"vxFoodPumpkin",-187.5,-301.2,1.3,4.52,"FARMLAND",0.05},
      {"vxFoodPumpkin",-189.3,-298.4,1.3,0.5,"FARMLAND",0.05},
      {"vxFoodPumpkin",-187.5,-298.4,1.3,4.72,"FARMLAND",0.05},
      {"vxFoodPumpkin",-189.3,-295.6,1.3,5.62,"FARMLAND",0.05},
      {"vxFoodPumpkin",-187.5,-295.6,1.3,4.1,"FARMLAND",0.05},
      {"SOIL",-143.2,-329.5,0.1,0,"FARMLAND",0},
      {"SOIL",-143.2,-326.7,0.1,0,"FARMLAND",0},
      {"SOIL",-143.2,-323.9,0.1,0,"FARMLAND",0},
      {"SOIL",-138.9,-329.5,0.1,0,"FARMLAND",0},
      {"SOIL",-138.9,-326.7,0.1,0,"FARMLAND",0},
      {"SOIL",-138.9,-323.9,0.1,0,"FARMLAND",0},
      {"SOIL",-134.6,-329.5,0.1,0,"FARMLAND",0},
      {"SOIL",-134.6,-326.7,0.1,0,"FARMLAND",0},
      {"SOIL",-134.6,-323.9,0.1,0,"FARMLAND",0},
      {"SOIL",-130.3,-329.5,0.1,0,"FARMLAND",0},
      {"SOIL",-130.3,-326.7,0.1,0,"FARMLAND",0},
      {"SOIL",-130.3,-323.9,0.1,0,"FARMLAND",0},
      {"vxFoodPumpkin",-144.1,-329.5,1.3,6.26,"FARMLAND",0.05},
      {"vxFoodPumpkin",-142.3,-329.5,1.3,4.6,"FARMLAND",0.05},
      {"vxFoodPumpkin",-144.1,-326.7,1.3,5.12,"FARMLAND",0.05},
      {"vxFoodPumpkin",-142.3,-326.7,1.3,1.22,"FARMLAND",0.05},
      {"vxFoodPumpkin",-144.1,-323.9,1.3,6.17,"FARMLAND",0.05},
      {"vxFoodPumpkin",-142.3,-323.9,1.3,3.09,"FARMLAND",0.05},
      {"vxFoodPumpkin",-139.8,-329.5,1.3,6.01,"FARMLAND",0.05},
      {"vxFoodPumpkin",-138.0,-329.5,1.3,5.75,"FARMLAND",0.05},
      {"vxFoodPumpkin",-139.8,-326.7,1.3,1.04,"FARMLAND",0.05},
      {"vxFoodPumpkin",-138.0,-326.7,1.3,4.95,"FARMLAND",0.05},
      {"vxFoodPumpkin",-139.8,-323.9,1.3,5.84,"FARMLAND",0.05},
      {"vxFoodPumpkin",-138.0,-323.9,1.3,0.41,"FARMLAND",0.05},
      {"vxFoodPumpkin",-135.5,-329.5,1.3,2.2,"FARMLAND",0.05},
      {"vxFoodPumpkin",-133.7,-329.5,1.3,4.75,"FARMLAND",0.05},
      {"vxFoodPumpkin",-135.5,-326.7,1.3,1.0,"FARMLAND",0.05},
      {"vxFoodPumpkin",-133.7,-326.7,1.3,5.63,"FARMLAND",0.05},
      {"vxFoodPumpkin",-135.5,-323.9,1.3,1.73,"FARMLAND",0.05},
      {"vxFoodPumpkin",-133.7,-323.9,1.3,5.12,"FARMLAND",0.05},
      {"vxFoodPumpkin",-131.2,-329.5,1.3,0.9,"FARMLAND",0.05},
      {"vxFoodPumpkin",-129.4,-329.5,1.3,3.15,"FARMLAND",0.05},
      {"vxFoodPumpkin",-131.2,-326.7,1.3,5.78,"FARMLAND",0.05},
      {"vxFoodPumpkin",-129.4,-326.7,1.3,1.31,"FARMLAND",0.05},
      {"vxFoodPumpkin",-131.2,-323.9,1.3,1.65,"FARMLAND",0.05},
      {"vxFoodPumpkin",-129.4,-323.9,1.3,3.18,"FARMLAND",0.05},
      {"SOIL",195.7,-309.3,0.1,0,"FARMLAND",0},
      {"SOIL",195.7,-306.5,0.1,0,"FARMLAND",0},
      {"SOIL",195.7,-303.7,0.1,0,"FARMLAND",0},
      {"SOIL",200.0,-309.3,0.1,0,"FARMLAND",0},
      {"SOIL",200.0,-306.5,0.1,0,"FARMLAND",0},
      {"SOIL",200.0,-303.7,0.1,0,"FARMLAND",0},
      {"SOIL",204.3,-309.3,0.1,0,"FARMLAND",0},
      {"SOIL",204.3,-306.5,0.1,0,"FARMLAND",0},
      {"SOIL",204.3,-303.7,0.1,0,"FARMLAND",0},
      {"SOIL",208.6,-309.3,0.1,0,"FARMLAND",0},
      {"SOIL",208.6,-306.5,0.1,0,"FARMLAND",0},
      {"SOIL",208.6,-303.7,0.1,0,"FARMLAND",0},
      {"vxCabbage",194.8,-309.3,1.1,2.53,"FARMLAND",0.05},
      {"vxCabbage",196.6,-309.3,1.1,4.0,"FARMLAND",0.05},
      {"vxCabbage",194.8,-306.5,1.1,1.75,"FARMLAND",0.05},
      {"vxCabbage",196.6,-306.5,1.1,2.06,"FARMLAND",0.05},
      {"vxCabbage",194.8,-303.7,1.1,2.37,"FARMLAND",0.05},
      {"vxCabbage",196.6,-303.7,1.1,4.97,"FARMLAND",0.05},
      {"vxCabbage",199.1,-309.3,1.1,1.66,"FARMLAND",0.05},
      {"vxCabbage",200.9,-309.3,1.1,4.82,"FARMLAND",0.05},
      {"vxCabbage",199.1,-306.5,1.1,0.31,"FARMLAND",0.05},
      {"vxCabbage",200.9,-306.5,1.1,5.39,"FARMLAND",0.05},
      {"vxCabbage",199.1,-303.7,1.1,6.07,"FARMLAND",0.05},
      {"vxCabbage",200.9,-303.7,1.1,2.85,"FARMLAND",0.05},
      {"vxCabbage",203.4,-309.3,1.1,3.27,"FARMLAND",0.05},
      {"vxCabbage",205.2,-309.3,1.1,4.33,"FARMLAND",0.05},
      {"vxCabbage",203.4,-306.5,1.1,5.63,"FARMLAND",0.05},
      {"vxCabbage",205.2,-306.5,1.1,1.58,"FARMLAND",0.05},
      {"vxCabbage",203.4,-303.7,1.1,3.36,"FARMLAND",0.05},
      {"vxCabbage",205.2,-303.7,1.1,5.38,"FARMLAND",0.05},
      {"vxCabbage",207.7,-309.3,1.1,4.63,"FARMLAND",0.05},
      {"vxCabbage",209.5,-309.3,1.1,2.33,"FARMLAND",0.05},
      {"vxCabbage",207.7,-306.5,1.1,2.36,"FARMLAND",0.05},
      {"vxCabbage",209.5,-306.5,1.1,2.32,"FARMLAND",0.05},
      {"vxCabbage",207.7,-303.7,1.1,0.92,"FARMLAND",0.05},
      {"vxCabbage",209.5,-303.7,1.1,2.08,"FARMLAND",0.05},
      {"SOIL",140.0,-330.4,0.1,0,"FARMLAND",0},
      {"SOIL",140.0,-327.6,0.1,0,"FARMLAND",0},
      {"SOIL",140.0,-324.8,0.1,0,"FARMLAND",0},
      {"SOIL",144.3,-330.4,0.1,0,"FARMLAND",0},
      {"SOIL",144.3,-327.6,0.1,0,"FARMLAND",0},
      {"SOIL",144.3,-324.8,0.1,0,"FARMLAND",0},
      {"SOIL",148.6,-330.4,0.1,0,"FARMLAND",0},
      {"SOIL",148.6,-327.6,0.1,0,"FARMLAND",0},
      {"SOIL",148.6,-324.8,0.1,0,"FARMLAND",0},
      {"SOIL",152.9,-330.4,0.1,0,"FARMLAND",0},
      {"SOIL",152.9,-327.6,0.1,0,"FARMLAND",0},
      {"SOIL",152.9,-324.8,0.1,0,"FARMLAND",0},
      {"vxFoodPumpkin",139.1,-330.4,1.3,1.86,"FARMLAND",0.05},
      {"vxFoodPumpkin",140.9,-330.4,1.3,3.24,"FARMLAND",0.05},
      {"vxFoodPumpkin",139.1,-327.6,1.3,1.95,"FARMLAND",0.05},
      {"vxFoodPumpkin",140.9,-327.6,1.3,6.07,"FARMLAND",0.05},
      {"vxFoodPumpkin",139.1,-324.8,1.3,5.47,"FARMLAND",0.05},
      {"vxFoodPumpkin",140.9,-324.8,1.3,5.83,"FARMLAND",0.05},
      {"vxFoodPumpkin",143.4,-330.4,1.3,5.63,"FARMLAND",0.05},
      {"vxFoodPumpkin",145.2,-330.4,1.3,4.6,"FARMLAND",0.05},
      {"vxFoodPumpkin",143.4,-327.6,1.3,4.69,"FARMLAND",0.05},
      {"vxFoodPumpkin",145.2,-327.6,1.3,1.39,"FARMLAND",0.05},
      {"vxFoodPumpkin",143.4,-324.8,1.3,1.83,"FARMLAND",0.05},
      {"vxFoodPumpkin",145.2,-324.8,1.3,3.93,"FARMLAND",0.05},
      {"vxFoodPumpkin",147.7,-330.4,1.3,2.62,"FARMLAND",0.05},
      {"vxFoodPumpkin",149.5,-330.4,1.3,2.29,"FARMLAND",0.05},
      {"vxFoodPumpkin",147.7,-327.6,1.3,0.3,"FARMLAND",0.05},
      {"vxFoodPumpkin",149.5,-327.6,1.3,3.07,"FARMLAND",0.05},
      {"vxFoodPumpkin",147.7,-324.8,1.3,3.85,"FARMLAND",0.05},
      {"vxFoodPumpkin",149.5,-324.8,1.3,0.29,"FARMLAND",0.05},
      {"vxFoodPumpkin",152.0,-330.4,1.3,0.34,"FARMLAND",0.05},
      {"vxFoodPumpkin",153.8,-330.4,1.3,3.56,"FARMLAND",0.05},
      {"vxFoodPumpkin",152.0,-327.6,1.3,1.91,"FARMLAND",0.05},
      {"vxFoodPumpkin",153.8,-327.6,1.3,3.28,"FARMLAND",0.05},
      {"vxFoodPumpkin",152.0,-324.8,1.3,3.35,"FARMLAND",0.05},
      {"vxFoodPumpkin",153.8,-324.8,1.3,2.6,"FARMLAND",0.05},
      {"SOIL",-249.8,-257.3,0.1,0,"FARMLAND",0},
      {"SOIL",-249.8,-254.5,0.1,0,"FARMLAND",0},
      {"SOIL",-249.8,-251.7,0.1,0,"FARMLAND",0},
      {"SOIL",-245.5,-257.3,0.1,0,"FARMLAND",0},
      {"SOIL",-245.5,-254.5,0.1,0,"FARMLAND",0},
      {"SOIL",-245.5,-251.7,0.1,0,"FARMLAND",0},
      {"SOIL",-241.2,-257.3,0.1,0,"FARMLAND",0},
      {"SOIL",-241.2,-254.5,0.1,0,"FARMLAND",0},
      {"SOIL",-241.2,-251.7,0.1,0,"FARMLAND",0},
      {"SOIL",-236.9,-257.3,0.1,0,"FARMLAND",0},
      {"SOIL",-236.9,-254.5,0.1,0,"FARMLAND",0},
      {"SOIL",-236.9,-251.7,0.1,0,"FARMLAND",0},
      {"vxFoodCarrot",-250.7,-257.3,1.4,3.92,"FARMLAND",0.05},
      {"vxFoodCarrot",-248.9,-257.3,1.4,2.98,"FARMLAND",0.05},
      {"vxFoodCarrot",-250.7,-254.5,1.4,0.85,"FARMLAND",0.05},
      {"vxFoodCarrot",-248.9,-254.5,1.4,5.88,"FARMLAND",0.05},
      {"vxFoodCarrot",-250.7,-251.7,1.4,1.53,"FARMLAND",0.05},
      {"vxFoodCarrot",-248.9,-251.7,1.4,0.94,"FARMLAND",0.05},
      {"vxFoodCarrot",-246.4,-257.3,1.4,0.6,"FARMLAND",0.05},
      {"vxFoodCarrot",-244.6,-257.3,1.4,4.01,"FARMLAND",0.05},
      {"vxFoodCarrot",-246.4,-254.5,1.4,5.47,"FARMLAND",0.05},
      {"vxFoodCarrot",-244.6,-254.5,1.4,4.91,"FARMLAND",0.05},
      {"vxFoodCarrot",-246.4,-251.7,1.4,2.52,"FARMLAND",0.05},
      {"vxFoodCarrot",-244.6,-251.7,1.4,1.66,"FARMLAND",0.05},
      {"vxFoodCarrot",-242.1,-257.3,1.4,0.07,"FARMLAND",0.05},
      {"vxFoodCarrot",-240.3,-257.3,1.4,4.05,"FARMLAND",0.05},
      {"vxFoodCarrot",-242.1,-254.5,1.4,3.53,"FARMLAND",0.05},
      {"vxFoodCarrot",-240.3,-254.5,1.4,2.2,"FARMLAND",0.05},
      {"vxFoodCarrot",-242.1,-251.7,1.4,4.05,"FARMLAND",0.05},
      {"vxFoodCarrot",-240.3,-251.7,1.4,2.79,"FARMLAND",0.05},
      {"vxFoodCarrot",-237.8,-257.3,1.4,5.89,"FARMLAND",0.05},
      {"vxFoodCarrot",-236.0,-257.3,1.4,4.61,"FARMLAND",0.05},
      {"vxFoodCarrot",-237.8,-254.5,1.4,1.56,"FARMLAND",0.05},
      {"vxFoodCarrot",-236.0,-254.5,1.4,5.67,"FARMLAND",0.05},
      {"vxFoodCarrot",-237.8,-251.7,1.4,0.28,"FARMLAND",0.05},
      {"vxFoodCarrot",-236.0,-251.7,1.4,3.34,"FARMLAND",0.05},
      {"SOIL",237.7,-255.2,0.1,0,"FARMLAND",0},
      {"SOIL",237.7,-252.4,0.1,0,"FARMLAND",0},
      {"SOIL",237.7,-249.6,0.1,0,"FARMLAND",0},
      {"SOIL",242.0,-255.2,0.1,0,"FARMLAND",0},
      {"SOIL",242.0,-252.4,0.1,0,"FARMLAND",0},
      {"SOIL",242.0,-249.6,0.1,0,"FARMLAND",0},
      {"SOIL",246.3,-255.2,0.1,0,"FARMLAND",0},
      {"SOIL",246.3,-252.4,0.1,0,"FARMLAND",0},
      {"SOIL",246.3,-249.6,0.1,0,"FARMLAND",0},
      {"SOIL",250.6,-255.2,0.1,0,"FARMLAND",0},
      {"SOIL",250.6,-252.4,0.1,0,"FARMLAND",0},
      {"SOIL",250.6,-249.6,0.1,0,"FARMLAND",0},
      {"vxFoodPumpkin",236.8,-255.2,1.3,5.73,"FARMLAND",0.05},
      {"vxFoodPumpkin",238.6,-255.2,1.3,0.66,"FARMLAND",0.05},
      {"vxFoodPumpkin",236.8,-252.4,1.3,3.85,"FARMLAND",0.05},
      {"vxFoodPumpkin",238.6,-252.4,1.3,4.12,"FARMLAND",0.05},
      {"vxFoodPumpkin",236.8,-249.6,1.3,1.24,"FARMLAND",0.05},
      {"vxFoodPumpkin",238.6,-249.6,1.3,2.59,"FARMLAND",0.05},
      {"vxFoodPumpkin",241.1,-255.2,1.3,3.25,"FARMLAND",0.05},
      {"vxFoodPumpkin",242.9,-255.2,1.3,4.04,"FARMLAND",0.05},
      {"vxFoodPumpkin",241.1,-252.4,1.3,4.07,"FARMLAND",0.05},
      {"vxFoodPumpkin",242.9,-252.4,1.3,2.61,"FARMLAND",0.05},
      {"vxFoodPumpkin",241.1,-249.6,1.3,3.85,"FARMLAND",0.05},
      {"vxFoodPumpkin",242.9,-249.6,1.3,3.19,"FARMLAND",0.05},
      {"vxFoodPumpkin",245.4,-255.2,1.3,0.4,"FARMLAND",0.05},
      {"vxFoodPumpkin",247.2,-255.2,1.3,3.93,"FARMLAND",0.05},
      {"vxFoodPumpkin",245.4,-252.4,1.3,6.24,"FARMLAND",0.05},
      {"vxFoodPumpkin",247.2,-252.4,1.3,4.55,"FARMLAND",0.05},
      {"vxFoodPumpkin",245.4,-249.6,1.3,3.0,"FARMLAND",0.05},
      {"vxFoodPumpkin",247.2,-249.6,1.3,3.38,"FARMLAND",0.05},
      {"vxFoodPumpkin",249.7,-255.2,1.3,2.36,"FARMLAND",0.05},
      {"vxFoodPumpkin",251.5,-255.2,1.3,2.74,"FARMLAND",0.05},
      {"vxFoodPumpkin",249.7,-252.4,1.3,5.73,"FARMLAND",0.05},
      {"vxFoodPumpkin",251.5,-252.4,1.3,0.51,"FARMLAND",0.05},
      {"vxFoodPumpkin",249.7,-249.6,1.3,4.12,"FARMLAND",0.05},
      {"vxFoodPumpkin",251.5,-249.6,1.3,1.1,"FARMLAND",0.05},
      {"villageWindmill",-256.1,-139.5,23.32,5.79,"FARMLAND",0},
      {"vxRockB",-252.1,-104.5,3.95,2.97,"OUTSKIRTS",0},
      {"vxTreeHigh",-256.9,-111.6,20.79,1.93,"OUTSKIRTS",0},
      {"vxRockLarge",253.4,-120.7,5.22,0.21,"OUTSKIRTS",0},
      {"vxTreeHigh",267.0,-110.5,20.79,2.17,"OUTSKIRTS",0},
      {"vxRockLarge",-258.1,-330.3,5.22,0.87,"OUTSKIRTS",0},
      {"vxTreeHigh",-262.4,-342.6,20.79,0.41,"OUTSKIRTS",0},
      {"vxRockB",258.1,-337.0,3.95,6.0,"OUTSKIRTS",0},
      {"vxTreeHigh",267.9,-344.3,20.79,4.47,"OUTSKIRTS",0},
      {"vxRockWide",-118.4,-58.7,4.59,0.7,"OUTSKIRTS",0},
      {"vxTreeHigh",-105.7,-64.7,20.79,4.74,"OUTSKIRTS",0},
      {"vxRockLarge",132.9,-63.6,5.22,1.81,"OUTSKIRTS",0},
      {"vxTreeHigh",139.4,-47.7,20.79,4.06,"OUTSKIRTS",0},
      {"vxRockWide",-201.8,-56.2,4.59,0.13,"OUTSKIRTS",0},
      {"villageTreeHighRound",-194.1,-62.8,19.25,4.77,"OUTSKIRTS",0},
      {"vxRockWide",197.2,-339.6,4.59,4.68,"OUTSKIRTS",0},
      {"villageTreeHighRound",196.8,-353.9,19.25,3.61,"OUTSKIRTS",0},
      {"vxFountainRoundDetail",38.6,-74.1,2.64,3.29,"MARKET",0},
    }
    task.spawn(function()
      local count=0
      for index,row in ipairs(villageDetailV2) do
        if row[1]=="SOIL" then
          -- [밭 이랑] 파츠 없이 Terrain 흙으로 갈아 놓은 밭 한 칸(4×2.4)을 만든다.
          meadowTerrain:FillBlock(CFrame.new(row[2],2.0,row[3]),Vector3.new(4,1.2,2.2),Enum.Material.Ground)
          continue
        end
        local item=worldAsset(row[1],Vector3.new(row[2],3,row[3]),row[4],row[7]>0 and row[7] or nil)
        if item then
          item.Name="Meadow_Village_Detail_"..row[6].."_"..index
          item:SetAttribute("MeadowVillageScenery",true)
          item:SetAttribute("VillageDistrict",row[6])
          item:SetAttribute("VillageDressingSource","REGISTERED_CC0_NATIVE_ASSET")
          local box=item:GetBoundingBox()
          item:PivotTo(CFrame.new(box.Position)*CFrame.Angles(0,row[5],0)
            *CFrame.new(-box.Position)*item:GetPivot())
          -- 큰 구조물(풍차·노점·수레·바위·나무)만 충돌, 작은 소품은 통과.
          local solid=row[4]>=4.5 and not row[1]:find("Crop",1,true)
          for _,mesh in ipairs(item:GetDescendants()) do
            if mesh:IsA("MeshPart") then
              mesh.CanCollide=solid
              mesh.CanQuery=false
              mesh.CanTouch=false
              mesh.CastShadow=row[4]>=1
            end
          end
          if row[1]=="vxCampfirePit" then
            local host=item:FindFirstChildWhichIsA("MeshPart",true)
            if host then
              local light=Instance.new("PointLight")
              light.Name="MeadowVillageLanternGlow"
              light.Color=Color3.fromRGB(255,150,80)
              light.Brightness=0
              light.Range=14
              light.Shadows=false
              light.Parent=host
              villageLanternLights[#villageLanternLights+1]=light
            end
          end
          count+=1
        end
        if index%6==0 then task.wait(.03) end
      end
      gameWorld:SetAttribute("MeadowVillageDetailV2Count",count)
    end)
    end
    -- [농가 밭] 조립형 직사각 밭 대신 낮은 Terrain 흙얼룩으로 경작 흔적을 남긴다.
    for _,patch in ipairs({
      {-218,-305,2.8},{-224,-309,3.3},{-236,-307,2.5},
      {-198,-322,2.9},{-185,-331,2.5},
      {201,-302,2.7},{213,-306,3.1},{219,-311,2.6},
      {191,-334,2.6},{241,-336,2.4},
    }) do
      meadowTerrain:FillBall(Vector3.new(patch[1],2.06-patch[3]+.38,patch[2]),
        patch[3],Enum.Material.Ground)
    end
    -- [저녁 마을] 밤에는 밝아지고 낮에는 잔잔하게 남는 등불. 원본 MeshPart/PointLight만 갱신.
    -- 폰에서도 1.3초 간격으로 20여 개 조명만 바꾸며 전투·저장 데이터와 무관하다.
    gameWorld:SetAttribute("MeadowVillageLivingLights",#villageLanternLights)
    task.spawn(function()
      while gameWorld.Parent and #villageLanternLights>0 do
        local night=gameWorld:GetAttribute("MeadowDayPhase")=="NIGHT"
        local now=os.clock()
        for index,glow in ipairs(villageLanternLights) do
          if glow.Parent then
            local flicker=math.sin(now*1.7+index*2.2)*.12
            if glow.Name=="MeadowVillageWindowGlow" then
              glow.Brightness=night and (.62+flicker*.3) or 0
              glow.Range=night and 12 or 0
            else
              glow.Brightness=(night and 1.42 or .43)+flicker
              glow.Range=night and 18 or 11
            end
          end
        end
        task.wait(1.3)
      end
    end)
    -- [마을 바깥 풍경] 몬스터 모델로 마을 장식을 만드는 대신 CC0 나무만 외곽에 둔다.
    for index,pos in ipairs({
      {-259,-57},{271,-62},{-275,-121},{270,-128},
      {-278,-209},{275,-218},{-274,-305},{276,-312},
      {-166,-41},{174,-47},{-53,-345},{51,-343},
      {-31,-68},{36,-70},{-164,-338},{164,-338},
      -- [숲 원경] 이미 등록된 CC0 나무를 외곽에만 배치해 길·16채 집·몬스터 스폰을 보존한다.
      {-261,-89},{-269,-149},{-264,-183},{-269,-247},
      {-262,-284},{-246,-338},{-201,-44},{-116,-48},
      {258,-95},{263,-148},{266,-209},{263,-267},
      {264,-299},{248,-338},{208,-46},{119,-48},
      {-238,-56},{-249,-104},{-250,-200},{-253,-272},
      {243,-59},{249,-121},{252,-238},{246,-281},
      {-119,-340},{-101,-344},{115,-342},{141,-338},
    }) do
      -- [경계 수목] 원뿔처럼 반복되는 한 가지 나무 대신 기존 등록 원본 2종을 번갈아 사용.
      local treeType=villageDetailReady
        and (index%3==0 and "villageTallTree" or "villageCrookedTree") or "tree"
      local tree=worldAsset(treeType,Vector3.new(pos[1],3,pos[2]),
        23+((index*7)%5)*2)
      if tree then
        tree.Name="Meadow_Village_BoundaryTree_"..index
        tree:SetAttribute("MeadowVillageScenery",true)
        tree:PivotTo(tree:GetPivot()*CFrame.Angles(0,math.rad((index*91)%360),0))
        for _,mesh in ipairs(tree:GetDescendants()) do
          if mesh:IsA("MeshPart") then
            mesh.CanCollide=false
            mesh.CanQuery=false
            mesh.CastShadow=true
          end
        end
      end
      if index%3==0 then task.wait(.05) end
    end
  end
  -- [실물 돌우물] 독립 CC0 Innerscene 원본: 지붕과 테두리를 함께 실제 사람 크기로 배치한다.
  -- 원본 GLB 총 높이 2.85m, 돌 테두리 높이 .80m·너비 1.44m, 지붕 너비 2.10m.
  -- Roblox 성인 R15 약 5스터드 기준, 총 12.2스터드면 테두리 3.42·폭 6.16·지붕 폭 8.99.
  -- 광장 중심 좌표, 건물·NPC·기존 의뢰/저장/몬스터 동선은 그대로 유지한다.
  if typeof(NativeCreatureAssets.villageWell)=="number" and NativeCreatureAssets.villageWell>0 then
    local wellHeightStuds=12.2
    local well=worldAsset("villageWell",Vector3.new(0,3,-146),wellHeightStuds)
    if well then
      well.Name="Meadow_Village_Well"
      well:SetAttribute("MeadowVillageScenery",true)
      well:SetAttribute("MeadowVillageWellOriginal",true)
      well:SetAttribute("MeadowVillageWellHeightStuds",wellHeightStuds)
      -- [중세 마을 우물 재질] 등록된 CC0 GLB의 메시 10개·형태·크기는 보존한다.
      -- 원본에 내장된 64픽셀 단색 팔레트 6장은 마모·나뭇결이 없으므로 복제본에서만
      -- Roblox 기본 석재·목재·금속 재질로 교체한다. 원본 에셋과 서버 저장/게임 규칙은 불변.
      -- 돌 우물통과 지붕 지지대만 충돌하고 지붕·두레박·밧줄은 장식으로 유지한다.
      for _,mesh in ipairs(well:GetDescendants()) do
        if mesh:IsA("MeshPart") then
          local name=mesh.Name:lower()
          local ring=name:find("stone ring",1,true)~=nil
          local post=name:find("roof post",1,true)~=nil
          local roof=name:find("pitched roof",1,true)~=nil
          local windlass=name:find("windlass",1,true)~=nil
          local iron=name:find("bucket bail",1,true)~=nil
          local rope=name:find("rope",1,true)~=nil
          local bucket=name:find("bucket",1,true)~=nil
          mesh.CanCollide=ring or post
          mesh.CanQuery=ring or post
          mesh.CanTouch=false
          mesh.CastShadow=true
          -- 원본 GLB의 단색 팔레트만 제거하며 MeshId/스케일/배치/구조는 유지한다.
          local palette=mesh:FindFirstChildOfClass("SurfaceAppearance")
          if palette then palette:Destroy() end
          if mesh.TextureID~="" then mesh.TextureID="" end
          mesh.MaterialVariant=""
          if ring then
            mesh.Material=Enum.Material.Slate
            mesh.Color=Color3.fromRGB(120,119,110)
          elseif roof then
            mesh.Material=Enum.Material.WoodPlanks
            mesh.Color=Color3.fromRGB(93,77,63)
          elseif post then
            mesh.Material=Enum.Material.Wood
            mesh.Color=Color3.fromRGB(119,95,70)
          elseif windlass then
            mesh.Material=Enum.Material.Wood
            mesh.Color=Color3.fromRGB(98,77,58)
          elseif iron then
            mesh.Material=Enum.Material.CorrodedMetal
            mesh.Color=Color3.fromRGB(105,105,99)
          elseif rope then
            mesh.Material=Enum.Material.Fabric
            mesh.Color=Color3.fromRGB(161,148,117)
          elseif bucket then
            mesh.Material=Enum.Material.WoodPlanks
            mesh.Color=Color3.fromRGB(115,86,62)
          end
          mesh.Reflectance=0
        end
      end
      -- [광장 파란 빛] 승인된 실물 우물 MeshPart에만 청색 조명을 추가한다.
      -- 없는 수정 크리스털을 임의 파츠로 만들지 않는다.
      local lightHost=well:FindFirstChildWhichIsA("MeshPart",true)
      if lightHost then
        local glow=lightHost:FindFirstChild("MeadowWellAzureGlow")
        if not glow then
          glow=Instance.new("PointLight")
          glow.Name="MeadowWellAzureGlow"
          glow.Parent=lightHost
        end
        glow.Color=Color3.fromRGB(83,183,244)
        glow.Brightness=1.35
        glow.Range=19
        glow.Shadows=false
      end
      well:SetAttribute("MeadowVillageWellSurface","WEATHERED_STONE_OAK")
      villageWellReady=true
      villageProps+=1
      -- [상단 표지] 두레박이 아닌 실제 지붕을 기준으로 띄워 우물 입구를 가리지 않는다.
      local wellMesh=well:FindFirstChild("Well pitched roof 004",true)
        or well:FindFirstChildWhichIsA("MeshPart",true)
      if wellMesh and wellMesh:IsA("MeshPart") then
        local sign=Instance.new("BillboardGui")
        sign.Name="MeadowVillageWellSign"
        sign.Adornee=wellMesh
        sign.Size=UDim2.fromOffset(118,30)
        sign.StudsOffsetWorldSpace=Vector3.new(0,1.65,0)
        sign.MaxDistance=52
        sign.AlwaysOnTop=false
        sign.Parent=wellMesh
        local caption=Instance.new("TextLabel")
        caption.Size=UDim2.fromScale(1,1)
        caption.BackgroundTransparency=1
        caption.Text="마을 우물"
        caption.TextColor3=Color3.fromRGB(244,219,169)
        caption.TextStrokeTransparency=.35
        caption.Font=Enum.Font.GothamBold
        caption.TextSize=17
        caption.Parent=sign
      end
    end
  else
    warn("마력숲 원본 돌우물 등록 대기: villageWell CC0 Model ID 없음")
  end
  -- [마력숲 마을 / 중앙 3D 배경] 실제 CC0 승인 등록 메시만 재사용한다.
  -- [원본] 마력나무=Kenney tree-crooked.glb / 수정문 석조 틀=Kenney wall-arch.glb
  -- [광원] Attachments/Beams/Particles는 원본 MeshPart에만 붙이며 새 기본 파츠·가짜 크리스털 모델 없음.
  -- [저장·진행] 기존 우물, NPC, 퀘스트, 통행·전투·지형·세이브는 변경하지 않는다.
  local groveTreeReady=false
  local crystalGateReady=false
  if villageDetailReady then
    -- [후경 마력나무] 마을 북쪽 수풀, 중앙 우물 뒤로 보이는 거대한 진짜 굽은 나무 메시.
    local tree=worldAsset("villageCrookedTree",Vector3.new(7,3,-359),75)
    if tree then
      tree.Name="Meadow_Village_AncientAzureTree"
      tree:SetAttribute("MeadowVillageScenery",true)
      tree:SetAttribute("MeadowLandmarkRole","AZURE_ANCIENT_TREE")
      tree:SetAttribute("MeadowOriginalCC0Source","assets/shared/party/tree-crooked.glb")
      local bounds,extent=tree:GetBoundingBox()
      local crownY=bounds.Position.Y+extent.Y*.27
      local shimmerHost=nil
      local distinctLeafMeshes=false
      for _,part in ipairs(tree:GetDescendants()) do
        if part:IsA("MeshPart") then
          local label=part.Name:lower()
          if label:find("leaf",1,true) or label:find("crown",1,true)
            or label:find("foliage",1,true) then
            distinctLeafMeshes=true
            break
          end
        end
      end
      for _,mesh in ipairs(tree:GetDescendants()) do
        if mesh:IsA("MeshPart") then
          -- 소유·해시가 검증된 나무 형태는 그대로. 렌더 색과 소재만 변경한다.
          mesh.CanCollide=false
          mesh.CanTouch=false
          mesh.CanQuery=false
          mesh.CastShadow=true
          local name=mesh.Name:lower()
          -- 단일 메시 원본은 이름에 leaves가 없으므로 전체 색조를 푸르게 적용한다.
          -- 실제 분리된 수관 메시가 있으면 줄기는 어두운 목재로 유지한다.
          local crown=not distinctLeafMeshes
            or name:find("leaf",1,true) or name:find("crown",1,true)
            or name:find("foliage",1,true)
            or (name:find("branch",1,true) and mesh.Position.Y>crownY)
          if crown then
            local surface=mesh:FindFirstChildOfClass("SurfaceAppearance")
            if surface then surface:Destroy() end
            mesh.TextureID=""
            mesh.Color=Color3.fromRGB(69,131,191)
            mesh.Material=Enum.Material.SmoothPlastic
            shimmerHost=shimmerHost or mesh
          else
            mesh.Color=Color3.fromRGB(75,69,84)
            mesh.Material=Enum.Material.Wood
            shimmerHost=shimmerHost or mesh
          end
        end
      end
      local host=shimmerHost
      if host then
        local halo=Instance.new("Highlight")
        halo.Name="MeadowAncientTreeOutline"
        halo.Adornee=tree
        halo.FillColor=Color3.fromRGB(75,128,196)
        halo.FillTransparency=.94
        halo.OutlineColor=Color3.fromRGB(60,153,227)
        halo.OutlineTransparency=.57
        halo.DepthMode=Enum.HighlightDepthMode.Occluded
        halo.Parent=tree
        local crownLight=Instance.new("PointLight")
        crownLight.Name="MeadowTreeAzureLight"
        crownLight.Color=Color3.fromRGB(64,157,250)
        crownLight.Brightness=2.05
        crownLight.Range=39
        crownLight.Shadows=false
        crownLight.Parent=host
        local moteAttachment=Instance.new("Attachment")
        moteAttachment.Name="MeadowTreeGlowingMotes"
        moteAttachment.Position=host.CFrame:PointToObjectSpace(bounds.Position+Vector3.new(0,extent.Y*.3,0))
        moteAttachment.Parent=host
        local motes=Instance.new("ParticleEmitter")
        motes.Name="MeadowTreeFireflies"
        motes.Texture="rbxasset://textures/particles/sparkles_main.dds"
        motes.Color=ColorSequence.new(Color3.fromRGB(73,173,255),Color3.fromRGB(184,225,255))
        motes.LightEmission=.88
        motes.LightInfluence=0
        motes.Lifetime=NumberRange.new(3,5)
        motes.Rate=8
        motes.Speed=NumberRange.new(.9,2.0)
        motes.SpreadAngle=Vector2.new(180,180)
        motes.Size=NumberSequence.new({
          NumberSequenceKeypoint.new(0,.24),
          NumberSequenceKeypoint.new(.35,.61),
          NumberSequenceKeypoint.new(1,0)
        })
        motes.Transparency=NumberSequence.new({
          NumberSequenceKeypoint.new(0,1),
          NumberSequenceKeypoint.new(.28,.12),
          NumberSequenceKeypoint.new(1,1)
        })
        motes.Parent=moteAttachment
        groveTreeReady=true
      end
    end
    -- [광장 수정문] 기존 우물보다 뒤쪽에 진짜 CC0 석조 아치를 배치한다.
    -- 단순 크리스털 파츠를 만들지 않고 내부의 보석형 빛 경계·푸른 마력 입자를 3D 광선으로 표현한다.
    local gateway=worldAsset("villageArch",Vector3.new(0,3,-185),24)
    if gateway then
      gateway.Name="Meadow_Village_AzureCrystalGate"
      gateway:SetAttribute("MeadowVillageScenery",true)
      gateway:SetAttribute("MeadowLandmarkRole","AZURE_CRYSTAL_GATE")
      gateway:SetAttribute("MeadowOriginalCC0Source","assets/shared/party/wall-arch.glb")
      local archHost=gateway:FindFirstChildWhichIsA("MeshPart",true)
      for _,mesh in ipairs(gateway:GetDescendants()) do
        if mesh:IsA("MeshPart") then
          mesh.CanCollide=false -- [통로] 플레이어와 의뢰 경로는 보존한다.
          mesh.CanTouch=false
          mesh.CanQuery=false
          mesh.CastShadow=true
          mesh.Material=Enum.Material.Slate
          mesh.Color=Color3.fromRGB(100,111,132)
        end
      end
      if archHost then
        local center=gateway:GetPivot().Position+Vector3.new(0,1.0,0)
        -- [입체 수정 광선] 실제 석조 원본을 관통하는 앞·뒤 깊이의 3D 다면체 빛면.
        -- 크리스털 메시가 아닌 광학 효과이며 별도 가짜 물리 파츠를 추가하지 않는다.
        local crystalOffsets={
          Vector3.new(0,7.5,-.75),
          Vector3.new(2.9,4.5,.85),
          Vector3.new(2.3,-3.4,-.65),
          Vector3.new(0,-7.0,.75),
          Vector3.new(-2.3,-3.4,-.65),
          Vector3.new(-2.9,4.5,.85),
        }
        local corners={}
        for i,offset in ipairs(crystalOffsets) do
          local point=Instance.new("Attachment")
          point.Name="MeadowCrystalRayVertex"..i
          point.Position=archHost.CFrame:PointToObjectSpace(center+offset)
          point.Parent=archHost
          corners[i]=point
        end
        local function rayBetween(a,b,inner)
          local beam=Instance.new("Beam")
          beam.Name=inner and "MeadowCrystalInnerRay" or "MeadowCrystalEdgeRay"
          beam.Attachment0=corners[a]
          beam.Attachment1=corners[b]
          beam.Color=ColorSequence.new(
            inner and Color3.fromRGB(63,175,249) or Color3.fromRGB(116,224,255),
            Color3.fromRGB(210,246,255)
          )
          beam.LightEmission=1
          beam.LightInfluence=0
          beam.Transparency=NumberSequence.new({
            NumberSequenceKeypoint.new(0,.1),
            NumberSequenceKeypoint.new(.45,inner and .6 or .23),
            NumberSequenceKeypoint.new(1,.1)
          })
          beam.Width0=inner and .09 or .21
          beam.Width1=inner and .09 or .21
          beam.FaceCamera=true
          beam.Segments=2
          beam.Parent=archHost
        end
        for i=1,#corners do rayBetween(i,i%#corners+1,false) end
        for _,edge in ipairs({{1,3},{1,5},{2,4},{4,6},{2,5},{3,6}}) do
          rayBetween(edge[1],edge[2],true)
        end
        local core=Instance.new("Attachment")
        core.Name="MeadowCrystalMagicCore"
        core.Position=archHost.CFrame:PointToObjectSpace(center)
        core.Parent=archHost
        local light=Instance.new("PointLight")
        light.Name="MeadowCrystalInnerGlow"
        light.Color=Color3.fromRGB(58,176,255)
        light.Brightness=2.4
        light.Range=34
        light.Shadows=false
        light.Parent=core
        local sparks=Instance.new("ParticleEmitter")
        sparks.Name="MeadowCrystalShimmer"
        sparks.Texture="rbxasset://textures/particles/sparkles_main.dds"
        sparks.Color=ColorSequence.new(Color3.fromRGB(73,186,255),Color3.fromRGB(234,247,255))
        sparks.LightEmission=1
        sparks.LightInfluence=0
        sparks.Rate=17
        sparks.Lifetime=NumberRange.new(1.6,3.6)
        sparks.Speed=NumberRange.new(.3,1.8)
        sparks.SpreadAngle=Vector2.new(160,160)
        sparks.Shape=Enum.ParticleEmitterShape.Box
        sparks.ShapeStyle=Enum.ParticleEmitterShapeStyle.Volume
        sparks.ShapeInOut=Enum.ParticleEmitterShapeInOut.Outward
        sparks.Size=NumberSequence.new({
          NumberSequenceKeypoint.new(0,.35),
          NumberSequenceKeypoint.new(.5,.7),
          NumberSequenceKeypoint.new(1,0)
        })
        sparks.Transparency=NumberSequence.new({
          NumberSequenceKeypoint.new(0,1),
          NumberSequenceKeypoint.new(.2,.15),
          NumberSequenceKeypoint.new(1,1)
        })
        sparks.Parent=core
        crystalGateReady=true
      end
    end
  end
  gameWorld:SetAttribute("MeadowAzureTreeReady",groveTreeReady)
  gameWorld:SetAttribute("MeadowCrystalGateReady",crystalGateReady)
  gameWorld:SetAttribute("MeadowLandmarkAssetSource",groveTreeReady and crystalGateReady
    and "REGISTERED_KENNEY_CC0_NATIVE_MESH_AND_NATIVE_VFX" or "CC0_SOURCE_UNAVAILABLE")
  if not groveTreeReady or not crystalGateReady then
    warn("마력숲 마력나무/수정문 승인 3D 메시 로딩 미완료: tree="..tostring(groveTreeReady)
      .." crystalGate="..tostring(crystalGateReady))
  end
  gameWorld:SetAttribute("MeadowVillageBuildingCount",villageBuildings)
  gameWorld:SetAttribute("MeadowVillagePropCount",villageProps)
  gameWorld:SetAttribute("MeadowVillageWellReady",villageWellReady)
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
    -- [서쪽 골목] 약초상은 서쪽 숲길로 향하는 입구에, 동쪽 추적자는 동문 갈림길에 배치.
    {id="Herbalist",name="약초상 미라",role="HERBALIST",location=Vector3.new(-68,5,-122),
      skin=Color3.fromRGB(220,177,144),cloth=Color3.fromRGB(77,131,102),pants=Color3.fromRGB(100,82,69),
      patrolOffsets={Vector3.new(-12,0,-4),Vector3.new(10,0,3),Vector3.zero}},
    {id="Tracker",name="추적자 라온",role="TRACKER",location=Vector3.new(69,5,-129),
      skin=Color3.fromRGB(191,147,114),cloth=Color3.fromRGB(115,87,65),pants=Color3.fromRGB(67,68,69),
      patrolOffsets={Vector3.new(13,0,-3),Vector3.new(-9,0,4),Vector3.zero}},
    -- [마을 남쪽 중심로] 경비병은 남쪽 주거/농경 구역 진입부를 순찰한다.
    {id="Guard",name="경비병 아린",role="GUARD",location=Vector3.new(-2,5,-188),
      skin=Color3.fromRGB(201,157,126),cloth=Color3.fromRGB(95,103,123),pants=Color3.fromRGB(62,70,81),
      patrolOffsets={Vector3.new(6,0,-15),Vector3.new(-8,0,6),Vector3.zero}},
  }
  -- [마을 사람들] 퀘스트와 무관한 생활 NPC. 말을 걸 때마다 다른 대사가 돌아가며 나오고
  -- 렌스기사단·카인 이야기와 마을 사건의 소문을 흘린다. 보상·진행도·저장에는 영향이 없다.
  local ambientLines={
    Innkeeper={"여관주인 돌라",{
      "어서 와. 오늘 밤 묵을 거면 방이 있어. 요즘은 손님이 통 없지만.",
      "저 기사단 깃발을 알아보는 손님이 가끔 와. 다들 말없이 한참 보다 가더라.",
      "밤마다 우물 쪽에서 박쥐 소리가 들린다던데, 경비병 아린이 잘 알 거야."}},
    Smith={"대장장이 브란",{
      "검이 무뎌졌으면 가져와. 기억은 못 벼려도 칼날은 벼릴 수 있지.",
      "숲 늑대 털이 대장간 앞까지 날려 와. 서쪽 길은 조심해.",
      "렌스기사단 문장이 새겨진 칼자루를 여러 번 고쳤어. 누구 것인지는 기억이 안 나."}},
    Farmer={"농부 하르",{
      "올해는 곡식 자루가 자꾸 사라져. 수레가 습격당한 뒤로는 더 그래.",
      "동쪽 숲에서 밤마다 날개 소리가 나. 가축이 겁먹었어.",
      "촌장 나린은 우리 모두에게 일을 나눠 줘. 기억을 잃어도 하루는 계속되니까."}},
    Baker={"제빵사 펠",{
      "갓 구운 빵이야. 배고프면 마을 광장 근처에서 약초도 구할 수 있어.",
      "길 잃은 사람들이 이 마을로 흘러와. 너처럼 이름밖에 기억 못 하는 사람도 있지.",
      "약초상 미라가 열병 걸린 아이 얘기를 했어. 그 약초가 사라졌다더라."}},
    Child={"아이 토리",{
      "깃발 있는 아저씨 알아! 아니, 그냥 낡은 깃발이야.",
      "촌장님이 그러는데 숲에는 이름 없는 기사들이 아직 있대.",
      "우물 근처에서 이상한 불빛 봤어. 비밀이야!"}},
    Keeper={"창고지기 마르",{
      "곡물 창고는 내가 지켜. 도적단 표식이 수레 근처에 떨어져 있었어.",
      "서쪽 초원 늑대가 길목을 막고 있어. 보급이 끊긴 지 며칠째야.",
      "렌스, 닉, 미나... 그 이름들, 어디서 들어본 것 같은데."}},
  }
  local ambientSpecs={
    {id="Innkeeper",name="여관주인 돌라",role="AMBIENT",location=Vector3.new(70,5,-110),
      skin=Color3.fromRGB(214,171,138),cloth=Color3.fromRGB(139,84,62),pants=Color3.fromRGB(74,60,52),
      patrolOffsets={Vector3.new(-6,0,3),Vector3.new(5,0,-4),Vector3.zero}},
    {id="Smith",name="대장장이 브란",role="AMBIENT",location=Vector3.new(-80,5,-190),
      skin=Color3.fromRGB(186,142,112),cloth=Color3.fromRGB(78,78,86),pants=Color3.fromRGB(60,56,52),
      patrolOffsets={Vector3.new(5,0,6),Vector3.new(-4,0,-5),Vector3.zero}},
    {id="Farmer",name="농부 하르",role="AMBIENT",location=Vector3.new(160,5,-276),
      skin=Color3.fromRGB(205,160,126),cloth=Color3.fromRGB(150,126,84),pants=Color3.fromRGB(88,72,56),
      patrolOffsets={Vector3.new(8,0,-6),Vector3.new(-6,0,5),Vector3.zero}},
    {id="Baker",name="제빵사 펠",role="AMBIENT",location=Vector3.new(160,5,-186),
      skin=Color3.fromRGB(224,182,150),cloth=Color3.fromRGB(226,214,190),pants=Color3.fromRGB(96,80,66),
      patrolOffsets={Vector3.new(-5,0,5),Vector3.new(6,0,-3),Vector3.zero}},
    {id="Child",name="아이 토리",role="AMBIENT",location=Vector3.new(12,5,-140),
      skin=Color3.fromRGB(226,184,152),cloth=Color3.fromRGB(88,128,160),pants=Color3.fromRGB(90,80,70),
      patrolOffsets={Vector3.new(10,0,8),Vector3.new(-10,0,4),Vector3.new(0,0,-9),Vector3.zero}},
    {id="Keeper",name="창고지기 마르",role="AMBIENT",location=Vector3.new(-165,5,-262),
      skin=Color3.fromRGB(196,152,120),cloth=Color3.fromRGB(104,96,72),pants=Color3.fromRGB(70,64,56),
      patrolOffsets={Vector3.new(6,0,5),Vector3.new(-5,0,-4),Vector3.zero}},
  }
  local ambientTalk={}
  for _,spec in ipairs(ambientSpecs) do
    -- 지형 높이에 맞춰 발을 땅에 붙인다(앵커 NPC가 떠 있거나 묻히지 않게).
    local rp=RaycastParams.new()
    rp.FilterType=Enum.RaycastFilterType.Include
    rp.FilterDescendantsInstances={meadowTerrain}
    local hit=workspace:Raycast(Vector3.new(spec.location.X,80,spec.location.Z),Vector3.new(0,-160,0),rp)
    if hit then spec.location=Vector3.new(spec.location.X,hit.Position.Y+3.1,spec.location.Z) end
    villagers[#villagers+1]=spec
  end
  local readyCount=0
  for _,spec in ipairs(villagers) do
    local npc=villageNativeNpc(spec)
    if npc then
      local callback=spec.id=="Smith" and function(player)
          local row=ambientLines.Smith
          local n=((ambientTalk[player] or {}).Smith or 0)%#row[2]+1
          ambientTalk[player]=ambientTalk[player] or {}
          ambientTalk[player].Smith=n
          local xp=readNumber(player,"SmithXp",0)
          local level=Config.SmithLevel(xp)
          local nextNeed=Config.SmithThresholds[level+1]
          smithSessions[player]=os.clock()+60
          local options={
            {label="대장 훈련 ("..(40*level).." 코인)",action="smith:train"},
            {label="대장 기술·작업대 안내",action="smith:info"},
            {label="기본 장비 구매",action="shop:open:village"},
          }
          villageDialogue(player,row[1],row[2][n].."\n\n대장 Lv"..level.." · 경험치 "..xp..(nextNeed and ("/"..nextNeed) or " (최고)"),options)
        end
        or spec.role=="AMBIENT" and function(player)
          local row=ambientLines[spec.id]
          local n=((ambientTalk[player] or {})[spec.id] or 0)%#row[2]+1
          ambientTalk[player]=ambientTalk[player] or {}
          ambientTalk[player][spec.id]=n
          villageDialogue(player,row[1],row[2][n])
        end
        or spec.role=="ELDER" and villageBoardDialogue
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
      -- [현장별 실물 단서] 약초 꾸러미=원본 가죽 주머니, 우물 봉인석=원본 석벽,
      -- 수레 습격=원본 나무 수레. 등록/로딩 실패 시 기존 승인된 유적 메시로만 복구한다.
      local clueAsset=contractIndex==1 and "item_pouch"
        or contractIndex==2 and (villageDetailReady and "villageRuinWall" or "ruin")
        or "villageCart"
      local model=worldAsset(clueAsset,scenePosition,contractIndex==3 and 5.2 or 3.8)
      if not model then model=worldAsset("ruin",scenePosition,3.8) end
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
      -- 조사 지점까지의 보행길은 위 villageRoadRoutes와 연결한다.
      -- 우물에서 단서까지 무조건 직선으로 긋던 중복 길은 생성하지 않는다.
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
-- [대장 기술] 제련·무두질·제작·단련 경험치와 작업대 거리 검사.
local smithTrained={}
local function smithLevelOf(player) return Config.SmithLevel(readNumber(player,"SmithXp",0)) end
local function addSmithXp(player,amount)
  local before=smithLevelOf(player)
  setNumber(player,"SmithXp",readNumber(player,"SmithXp",0)+amount)
  local after=smithLevelOf(player)
  if after>before then
    player:SetAttribute("MeadowGearMessage","대장 Lv"..after.." 달성!")
    player:SetAttribute("MeadowGearRevision",(player:GetAttribute("MeadowGearRevision") or 0)+1)
  end
end
local function nearStation(player,stationId)
  local station=Config.SmithStations[stationId]
  local root=player.Character and player.Character:FindFirstChild("HumanoidRootPart")
  if not station or not root then return false end
  local dx,dz=root.Position.X-station.X,root.Position.Z-station.Z
  if dx*dx+dz*dz<=station.Radius*station.Radius then return true end
  -- 다른 마을의 작업장에서도 대장간 작업을 할 수 있다.
  for _,site in ipairs(Config.CraftSites or {}) do
    local sx,sz=root.Position.X-site.X,root.Position.Z-site.Z
    if sx*sx+sz*sz<=(station.Radius+4)*(station.Radius+4) then return true end
  end
  return false
end
local function meadowProficiencyPower(player)
  local points=math.max(0,readNumber(player,"CombatProficiency",0))
  return 2.2*(1+math.max(0,(math.sqrt(961+24*points)-31)/12))
end

-- [마력숲 위쳐식 RPG] 기존 저장 필드/전투 흐름 안에서 장비·제작·물약·스킬 성장 처리.
-- 외부 RemoteEvent나 새 DataStore 없이 기존 Config 카탈로그와 서버 수치만 사용한다.
local meadowRpg=(function()
  local items=Config.MeadowEquipment or {}
  local tonics=Config.MeadowConsumables or {}
  local slots={Weapon="MeadowEquipWeapon",Chest="MeadowEquipChest",
    Hands="MeadowEquipHands",Legs="MeadowEquipLegs",Feet="MeadowEquipFeet",
    Accessory="MeadowEquipAccessory",Shield="MeadowEquipShield",Cape="MeadowEquipCape"}
  local talents={Martial="MeadowTalentMartial",Signs="MeadowTalentSigns",
    Defense="MeadowTalentDefense",Agility="MeadowTalentAgility"}
  local talentMax={Agility=5,Martial=5} -- 회피·검술은 5단, 나머지 계열은 3단.
  -- [90노드 보관] 기존 숫자 세이브에 10개×3비트로 기록. 슬롯/기존 재능은 바꾸지 않는다.
  local nodes=Config.MeadowSkillNodes or {}
  local passiveIndex={}
  for _,node in ipairs(nodes) do if node.Kind=="PASSIVE" then passiveIndex[node.Mode]=node.Index end end
  local function nodeValue(player,index)
    if typeof(index)~="number" or index~=math.floor(index) or index<1 or index>#nodes then return 0 end
    local field="MeadowSkillBits"..math.ceil(index/10)
    return bit32.extract(math.floor(readNumber(player,field,0)),((index-1)%10)*3,3)
  end
  local function nodeRank(player,index)
    return bit32.band(nodeValue(player,index),3)
  end
  local function nodeChoice(player,index)
    return bit32.band(nodeValue(player,index),4)~=0 and "B" or "A"
  end
  local function passiveLevel(player,mode)
    local index=passiveIndex[mode]
    return index and nodeRank(player,index) or 0
  end
  local function spentNodes(player)
    local spent=0
    for index=1,#nodes do spent+=nodeRank(player,index) end
    return spent
  end
  local function setNode(player,index,rank,choice)
    local field="MeadowSkillBits"..math.ceil(index/10)
    local packed=math.floor(readNumber(player,field,0))
    local value=math.clamp(rank,0,3)+(choice=="B" and rank==3 and 4 or 0)
    setNumber(player,field,bit32.replace(packed,value,((index-1)%10)*3,3))
  end
  local function validQuickCode(player,code)
    if code==0 or (code>=1 and code<=5) then return true end
    if code>=1001 and code<=1000+#nodes then
      local index=code-1000
      return nodes[index] and nodes[index].Kind=="ACTIVE" and nodeRank(player,index)>0 or false
    end
    return code>=10 and code<=1000 and Config.Actions[code-9]~=nil
      and Config.MeadowSkillNodeById[Config.Actions[code-9].Id]==nil
  end

  local gearById,tonicById={},{}
  for index,item in ipairs(items)do gearById[item.Id]={entry=item,index=index} end
  for _,item in ipairs(tonics)do tonicById[item.Id]=item end
  -- 장비 33번째부터는 두 번째 비트마스크(MeadowGearOwned2)에 저장한다.
  local function hasGear(player,index)
    local field=index>96 and "MeadowGearOwned4" or index>64 and "MeadowGearOwned3" or index>32 and "MeadowGearOwned2" or "MeadowGearOwned"
    local mask=math.max(0,readNumber(player,field,0))
    return bit32.band(mask,bit32.lshift(1,(index-1)%32))~=0
  end
  local function grantGear(player,index)
    local field=index>96 and "MeadowGearOwned4" or index>64 and "MeadowGearOwned3" or index>32 and "MeadowGearOwned2" or "MeadowGearOwned"
    setNumber(player,field,bit32.bor(math.max(0,readNumber(player,field,0)),bit32.lshift(1,(index-1)%32)))
  end
  local function equipped(player,slot)
    local index=readNumber(player,slots[slot],0)
    local item=items[index]
    if not item or item.Slot~=slot then return nil end
    if not hasGear(player,index) then return nil end
    return item
  end
  local function stats(player)
    local attack,defense=0,0
    local weapon=equipped(player,"Weapon")
    local class=weapon and Config.GearWeaponClass[weapon.Id]
    local shieldAllowed=class=="Sword" or class=="Axe" or class=="Dagger" or class=="Hammer"
    for slot in pairs(slots)do
      local item=(slot~="Shield" or shieldAllowed) and equipped(player,slot) or nil
      if item then
        attack+=item.Attack or 0
        defense+=item.Defense or 0
      end
    end
    local pieces=0
    for _,slot in ipairs({"Chest","Hands","Legs","Feet"}) do if equipped(player,slot) then pieces+=1 end end
    local armorBonus=math.floor(math.clamp(readNumber(player,"ArmorTier",0),0,10)*pieces/2)
    return attack+math.clamp(readNumber(player,"MeadowTalentMartial",0),0,5),
      defense+armorBonus+math.clamp(readNumber(player,"MeadowTalentDefense",0),0,3)
  end
  local function publishStats(player)
    local attack,defense=stats(player)
    player:SetAttribute("MeadowGearAttack",attack)
    player:SetAttribute("MeadowGearDefense",defense)
  end
  local function charge(player,item)
    -- [스카이림식 대장 기술] 제작 숙련 단계마다 주괴·가죽 요구량이 1개씩 줄어든다(최소 1개).
    local rank=Config.SmithingRank(readNumber(player,"SmithXp",0))
    local function need(field)
      local base=item[field] or 0
      if base>0 and (field=="Ingot" or field=="Leather") then return math.max(1,base-rank) end
      return base
    end
    for _,field in ipairs(Config.CostFields)do
      if readNumber(player,field,0)<need(field) then return false end
    end
    for _,field in ipairs(Config.CostFields)do
      local cost=need(field)
      if cost>0 then setNumber(player,field,readNumber(player,field,0)-cost) end
    end
    return true
  end
  local function feedback(player,text)
    player:SetAttribute("MeadowGearMessage",text)
    player:SetAttribute("MeadowGearRevision",(player:GetAttribute("MeadowGearRevision") or 0)+1)
  end
  local function transact(player,action)
    if player:GetAttribute("ProfileReady")~=true or #action>75 then return false end
    local group,verb,id=action:match("^meadow:rpg:([%a]+):([%a]+):([%w_]+)$")
    if not group or not verb or not id then return false end
    local gear=gearById[id]
    local tonic=tonicById[id]
    if group=="loot" and verb=="refine" then
      -- [제련·무두질] 제련로(광석·강철)·무두질 틀(가죽) 반경 안에서만 가공한다.
      local mat=Config.MaterialByField[id]
      local rule=mat and mat.Refine
      if not rule then return false end
      if not nearStation(player,rule.Station or "Smelter") then
        feedback(player,"마을 대장간의 "..Config.SmithStations[rule.Station or "Smelter"].Name.." 가까이에서 "..rule.Verb.."할 수 있어.");return true
      end
      local level=smithLevelOf(player)
      if rule.Level and level<rule.Level then feedback(player,"대장 Lv"..rule.Level.."부터 가능해. (지금 Lv"..level..")");return true end
      local need=rule.Need
      if id=="Steel" and level>=5 then need=2 end
      local have=readNumber(player,rule.From,0)
      if have<need then feedback(player,Config.MaterialByField[rule.From].Name.." "..need.."개가 필요해.");return true end
      setNumber(player,rule.From,have-need)
      local gain=1
      if level>=3 and math.random()<.15 then gain=2 end
      setNumber(player,id,readNumber(player,id,0)+gain)
      setNumber(player,"CraftingProficiency",readNumber(player,"CraftingProficiency",0)+1)
      addSmithXp(player,id=="Steel" and 6 or 3)
      if meadowOil.questEvent then
        meadowOil.questEvent(player,id=="Ingot" and "SMELT" or id=="Leather" and "TAN" or "SMELT_STEEL")
      end
      feedback(player,mat.Name.." "..gain.."개 완성  ("..rule.Note..")"..(gain>1 and "  · 풍부한 제련!" or ""))
      return true
    end
    if group=="loot" and verb=="sell" then
      local mat=Config.MaterialByField[id]
      if not mat then return false end
      if readNumber(player,id,0)<1 then feedback(player,mat.Name.."이(가) 없어.");return true end
      setNumber(player,id,readNumber(player,id,0)-1)
      setNumber(player,"Coins",readNumber(player,"Coins",0)+mat.Value)
      feedback(player,mat.Name.." 1개 판매  +"..mat.Value.." 재화")
      return true
    end
    if group=="gear" and gear and verb=="temper" then
      local item,index=gear.entry,gear.index
      if not (item.Slot=="Chest" or item.Slot=="Hands" or item.Slot=="Legs" or item.Slot=="Feet") or not hasGear(player,index) then return true end
      if not nearStation(player,"Anvil") then feedback(player,"마을 대장간의 모루 가까이에서 갑옷을 단련할 수 있어.");return true end
      local tier=readNumber(player,"ArmorTier",0)
      if tier>=10 then feedback(player,"갑옷 단련은 최대 10단계야.");return true end
      if tier>=6 and smithLevelOf(player)<5 then feedback(player,"+7 이상은 대장 Lv5 '명인 단련'부터 가능해.");return true end
      local ingotCost,leatherCost=Config.ArmorTemperCost(tier,readNumber(player,"SmithXp",0))
      if readNumber(player,"Ingot",0)<ingotCost or readNumber(player,"Leather",0)<leatherCost then
        feedback(player,"갑옷 단련 재료: 철 주괴 "..ingotCost.." · 무두질 가죽 "..leatherCost);return true
      end
      setNumber(player,"Ingot",readNumber(player,"Ingot",0)-ingotCost)
      setNumber(player,"Leather",readNumber(player,"Leather",0)-leatherCost)
      setNumber(player,"ArmorTier",tier+1)
      addSmithXp(player,4+tier)
      publishStats(player)
      if meadowOil.questEvent then meadowOil.questEvent(player,"TEMPER_ARMOR") end
      feedback(player,"갑옷 단련 +"..(tier+1).."  (착용 방어구 방어력 상승)")
      return true
    end
    if group=="gear" and gear then
      local item,index=gear.entry,gear.index
      local ownedGear=hasGear(player,index)
      if verb=="craft" then
        -- [장비 원본 검증] 미등록 CC0 메시의 제작으로 재료만 소비하는 문제를 막는다.
        if item.GearSourceKey and (typeof(NativeCreatureAssets[item.ModelKey])~="number" or NativeCreatureAssets[item.ModelKey]<1) then
          feedback(player,"실물 장비 로블록스 등록이 아직 확인되지 않았어.");return true
        end
        if ownedGear then feedback(player,"이미 보유한 장비야.");return true end
        -- [스카이림식 제작] 모든 장비는 대장간 모루 근처에서만 제작한다(가방은 확인·장착 전용).
        do
          local root=player.Character and player.Character:FindFirstChild("HumanoidRootPart")
          if not root or not nearStation(player,"Anvil") then
            feedback(player,"마을 대장간의 모루 가까이에서 제작해야 해.");return true
          end
        end
        if readNumber(player,"CombatProficiency",0)<(item.Need or 0) then feedback(player,"전투 숙련 "..tostring(item.Need).."이 필요해.");return true end
        if not charge(player,item) then feedback(player,"재료 또는 소지금이 부족해.");return true end
        grantGear(player,index)
        setNumber(player,"CraftingProficiency",readNumber(player,"CraftingProficiency",0)+1)
        local refund=false
        if item.ForgeOnly then
          addSmithXp(player,({Common=6,Uncommon=10,Rare=16,Epic=26,Legendary=40})[item.Rarity] or 8)
          if smithLevelOf(player)>=8 and (item.Ingot or 0)>0 and math.random()<.2 then
            setNumber(player,"Ingot",readNumber(player,"Ingot",0)+1);refund=true
          end
          if meadowOil.questEvent then
            meadowOil.questEvent(player,"CRAFT")
            if item.Slot=="Shield" then meadowOil.questEvent(player,"CRAFT_SHIELD") end
            if item.Rarity=="Rare" or item.Rarity=="Epic" or item.Rarity=="Legendary" then meadowOil.questEvent(player,"CRAFT_RARE") end
            if item.WeaponFamily=="Bow" then meadowOil.questEvent(player,"CRAFT_BOW") end
            if item.Slot=="Chest" or item.Slot=="Hands" or item.Slot=="Legs" or item.Slot=="Feet" then meadowOil.questEvent(player,"CRAFT_ARMOR") end
          end
        end
        feedback(player,item.Name.." 제작 완료"..(refund and "  · 재료 환급! 주괴 1개" or ""))
        return true
      elseif verb=="equip" then
        if not ownedGear then feedback(player,"먼저 장비를 제작해.");return true end
        local key=slots[item.Slot]
        if not key then return false end
        if item.Slot=="Shield" then
          local mainWeapon=equipped(player,"Weapon")
          local class=mainWeapon and Config.GearWeaponClass[mainWeapon.Id]
          if class~="Sword" and class~="Axe" and class~="Dagger" and class~="Hammer" then
            feedback(player,"방패는 한손검·도끼·단검·망치와 함께 장착할 수 있어.");return true
          end
        elseif item.Slot=="Weapon" then
          local class=Config.GearWeaponClass[item.Id]
          if class~="Sword" and class~="Axe" and class~="Dagger" and class~="Hammer" then
            setNumber(player,"MeadowEquipShield",0)
          end
        end
        setNumber(player,key,index)
        publishStats(player)
        feedback(player,item.Name.." 장착 완료")
        return true
      elseif verb=="unequip" then
        local key=slots[item.Slot]
        if key and readNumber(player,key,0)==index then
          setNumber(player,key,0)
          publishStats(player)
          feedback(player,item.Name.." 장착 해제")
        end
        return true
      end
    elseif group=="tonic" and tonic then
      local attr=id=="herbal_tonic" and "MeadowPotionHealth" or "MeadowPotionStamina"
      if verb=="craft" then
        -- [스카이림식 연금] 물약 조합은 연금 작업대 가까이에서만 한다.
        do
          local root=player.Character and player.Character:FindFirstChild("HumanoidRootPart")
          local station=Config.AlchemyStation
          local flat=root and Vector3.new(root.Position.X,0,root.Position.Z)
          local atStation=flat and (flat-Vector3.new(station.X,0,station.Z)).Magnitude<=station.Radius+4
          if flat and not atStation then
            for _,site in ipairs(Config.CraftSites or {}) do
              if (flat-Vector3.new(site.X,0,site.Z)).Magnitude<=station.Radius+8 then atStation=true;break end
            end
          end
          if not atStation then feedback(player,"물약 조합은 마을 연금 작업대(식당 화덕 옆) 가까이에서 할 수 있어.");return true end
        end
        if readNumber(player,attr,0)>=25 then feedback(player,"물약은 최대 25개까지 소지할 수 있어.");return true end
        if not charge(player,tonic) then feedback(player,"물약 재료가 부족해.");return true end
        setNumber(player,attr,readNumber(player,attr,0)+1)
        setNumber(player,"AlchemyProficiency",readNumber(player,"AlchemyProficiency",0)+1)
        feedback(player,tonic.Name.." 조합 완료")
        return true
      elseif verb=="use" then
        if readNumber(player,attr,0)<1 then return true end
        local character,humanoid=player.Character,nil
        humanoid=character and character:FindFirstChildOfClass("Humanoid")
        if not humanoid or humanoid.Health<=0 then return true end
        if tonic.Heal and humanoid.Health<humanoid.MaxHealth then
          humanoid.Health=math.min(humanoid.MaxHealth,humanoid.Health+tonic.Heal)
          setNumber(player,"Health",math.floor(humanoid.Health))
        elseif tonic.Stamina and readNumber(player,"MeadowStamina",100)<100 then
          player:SetAttribute("MeadowStamina",math.min(100,readNumber(player,"MeadowStamina",100)+tonic.Stamina))
        else
          feedback(player,"이미 체력 또는 기력이 가득 차 있어.")
          return true
        end
        setNumber(player,attr,readNumber(player,attr,0)-1)
        feedback(player,tonic.Name.." 사용")
        return true
      end

    elseif group=="tree" then
      if verb=="learn" then
        local number,choice=id:match("^(%d+)([AB]?)$")
        local index=tonumber(number)
        local node=index and nodes[index]
        if not node then return false end
        local rank=nodeRank(player,index)
        if rank>=3 then feedback(player,"이미 최고 3단계야.");return true end
        local available=Config.MeadowSkillPointProgress(readNumber(player,"CombatProficiency",0))
        if spentNodes(player)>=available then feedback(player,"남은 스킬 점수가 없어.");return true end
        if node.Step>1 and nodeRank(player,index-1)<1 then
          feedback(player,"같은 분기의 앞 노드를 먼저 배워야 해.");return true
        end
        if rank==2 and choice=="" then
          feedback(player,"최종 강화 A 또는 B를 골라야 해.");return true
        end
        setNode(player,index,rank+1,choice)
        feedback(player,node.Name.." "..(rank+1).."/3 습득")
        return true
      elseif verb=="reset" and id=="all" then
        if spentNodes(player)<1 then feedback(player,"초기화할 스킬이 없어.");return true end
        if readNumber(player,"Coins",0)<30 then feedback(player,"초기화 비용 코인 30개가 부족해.");return true end
        setNumber(player,"Coins",readNumber(player,"Coins",0)-30)
        for index=1,9 do setNumber(player,"MeadowSkillBits"..index,0) end
        -- 새 기술이 잠겼다면 저장된 퀵칸에서만 비운다. 기존 기술과 재능은 보존한다.
        for slot=1,5 do
          local key="QuickSlot"..slot
          if readNumber(player,key,0)>=1001 then setNumber(player,key,0) end
        end
        feedback(player,"90노드 점수를 되돌렸어. 기존 재능은 유지됐어.")
        return true
      end
    elseif group=="loadout" then
      local preset=tonumber(id)
      if not preset or preset~=math.floor(preset) or preset<1 or preset>3 then return false end
      if workspace:GetServerTimeNow()<(player:GetAttribute("MeadowCombatUntil") or 0) then
        feedback(player,"전투가 끝난 뒤 조합을 변경할 수 있어.");return true
      end
      if verb=="save" then
        -- 아직 퀵슬롯을 편집하지 않은 계정은 기존 기본 배치를 저장한다.
        local defaults={1,3,0,0,0}
        for i,action in ipairs(Config.Actions)do
          if action.Id=="skill-meadow-heavy" then defaults[3]=9+i end
          if action.Id=="skill-meadow-sweep" then defaults[4]=9+i end
          if action.Id=="skill-meadow-bolt" then defaults[5]=9+i end
        end
        for slot=1,5 do
          local value=readNumber(player,"QuickInit",0)>=1 and readNumber(player,"QuickSlot"..slot,0) or defaults[slot]
          setNumber(player,"MeadowLoadout"..preset.."Slot"..slot,validQuickCode(player,value) and value or 0)
        end
        setNumber(player,"MeadowLoadoutSaved"..preset,1)
        feedback(player,({"탐험","보스","협동"})[preset].." 조합 저장")
        return true
      elseif verb=="activate" then
        if readNumber(player,"MeadowLoadoutSaved"..preset,0)~=1 then
          feedback(player,"먼저 해당 조합을 저장해야 해.");return true
        end
        for slot=1,5 do
          local code=readNumber(player,"MeadowLoadout"..preset.."Slot"..slot,0)
          setNumber(player,"QuickSlot"..slot,validQuickCode(player,code) and code or 0)
        end
        setNumber(player,"QuickInit",1)
        setNumber(player,"MeadowLoadoutActive",preset)
        feedback(player,({"탐험","보스","협동"})[preset].." 조합 적용")
        return true
      end
    elseif group=="talent" and verb=="reset" and id=="all" then
      -- [스킬 초기화] 코인 30개로 4계열 단계를 모두 0으로 되돌려 점수를 다시 나눈다.
      local invested=0
      for otherId,key in pairs(talents)do invested+=math.clamp(readNumber(player,key,0),0,talentMax[otherId] or 3) end
      if invested<=0 then feedback(player,"초기화할 스킬이 없어.");return true end
      if readNumber(player,"Coins",0)<30 then feedback(player,"초기화에는 코인 30개가 필요해.");return true end
      setNumber(player,"Coins",readNumber(player,"Coins",0)-30)
      for _,key in pairs(talents)do setNumber(player,key,0) end
      publishStats(player)
      feedback(player,"스킬 점수를 모두 돌려받았어.")
      return true
    elseif group=="talent" and verb=="learn" then
      local key=talents[id]
      if not key then return false end
      local cap=talentMax[id] or 3
      local rank=math.clamp(readNumber(player,key,0),0,cap)
      local spent=0
      for otherId,other in pairs(talents)do spent+=math.clamp(readNumber(player,other,0),0,talentMax[otherId] or 3) end
      local earned=Config.TalentPointProgress(readNumber(player,"CombatProficiency",0))
      if rank>=cap then feedback(player,"이미 최대 "..cap.."단계야.");return true end
      if spent>=earned then feedback(player,"남은 기술 점수가 없어.");return true end
      setNumber(player,key,rank+1)
      publishStats(player)
      feedback(player,id.." 숙련 "..tostring(rank+1).."/"..cap)
      return true
    end
    return false
  end
  -- [상인 장비 구매] 기본 장비(희귀도 고급·숙련 요구 없음·대장간 전용 아님)만 코인으로 산다.
  local function buyGear(player,id,discount)
    local gear=gearById[id]
    if not gear then return false end
    local item=gear.entry
    if item.Starter or item.ForgeOnly or (item.Need or 0)>0 or item.Rarity~="Uncommon" then return false end
    if hasGear(player,gear.index) then feedback(player,"이미 가진 장비야.");return true end
    local price=math.max(1,math.floor(((item.Wood or 0)*5+(item.Stone or 0)*5+(item.Coins or 0)*3)*(1-(discount or 0))))
    if readNumber(player,"Coins",0)<price then feedback(player,item.Name.." 구매에는 "..price.." 재화가 필요해.");return true end
    setNumber(player,"Coins",readNumber(player,"Coins",0)-price)
    grantGear(player,gear.index)
    feedback(player,item.Name.." 구매 완료  (-"..price.." 재화)")
    return true
  end
  return {buyGear=buyGear,priceOf=function(id,discount)
      local g=gearById[id];local it=g and g.entry
      return it and math.max(1,math.floor(((it.Wood or 0)*5+(it.Stone or 0)*5+(it.Coins or 0)*3)*(1-(discount or 0)))) or nil
    end,
    transact=transact,stats=stats,publishStats=publishStats,equippedWeapon=function(player) return equipped(player,"Weapon") end,
    equippedShield=function(player) return equipped(player,"Shield") end,
    equippedChest=function(player) return equipped(player,"Chest") end,
    equippedSlot=function(player,slot) return equipped(player,slot) end,
    nodeRank=nodeRank,nodeChoice=nodeChoice,passiveLevel=passiveLevel,validQuickCode=validQuickCode}
end)()
meadowShopApi.buyGear=meadowRpg.buyGear;meadowShopApi.priceOf=meadowRpg.priceOf

-- [활 장착 외형] 등록된 CC0 활 메시(item_bow_wooden)를 왼손에 용접한다. 장검 도구는 집어넣는다.
local function refreshBowVisualCore(player)
  local character=player.Character
  if not character then return end
  local old=character:FindFirstChild("MeadowBowVisual")
  if old then old:Destroy() end
  local oldShield=character:FindFirstChild("MeadowShieldVisual")
  if oldShield then oldShield:Destroy() end
  local weapon=meadowRpg.equippedWeapon(player)
  -- [실물 방패] 승인 CC0 4종을 개별 연결한다. 종전 방어 스킬 방패 표시도 유지한다.
  local shield=meadowRpg.equippedShield(player)
  if weapon and weapon.Id then
    local cls=Config.GearWeaponClass[weapon.Id]
    local handAllowed=cls=="Sword" or cls=="Axe" or cls=="Dagger" or cls=="Hammer"
    local basicGuard=(cls=="Sword" or cls=="Axe") and (meadowRpg.nodeRank(player,19) or 0)>0
    local arm=character:FindFirstChild("LeftLowerArm") or character:FindFirstChild("Left Arm")
    if handAllowed and arm and (shield or basicGuard) then
      local modelKey=shield and shield.ModelKey or "vxShieldA"
      local sm=worldAsset(modelKey,(character:FindFirstChild("HumanoidRootPart") and character.HumanoidRootPart.Position or Vector3.new(0,5,0)),2.4)
      local sp=sm and sm:FindFirstChildWhichIsA("MeshPart",true)
      if sp then
        -- [고유 방패] 실제 원본의 문장·테두리·손잡이 모든 MeshPart를 보존한다.
        local grip=arm.CFrame*CFrame.new(-.55,0,-.1)*CFrame.Angles(0,math.rad(-90),0)
        sm:PivotTo(grip*sp.CFrame:Inverse()*sm:GetPivot())
        sm.Name="MeadowShieldVisual"
        for _,part in ipairs(sm:GetDescendants()) do
          if part:IsA("BasePart") then
            part.Anchored=false;part.CanCollide=false;part.CanTouch=false;part.CanQuery=false;part.Massless=true
            local joint=Instance.new("WeldConstraint");joint.Part0=arm;joint.Part1=part;joint.Parent=part
          end
        end
        sm.Parent=character
      elseif sm then sm:Destroy() end
    end
  end
  -- [실물 제련 무기] 신규 제작 무기만 원본 등록 3D 메시를 오른손에 연결한다.
  -- 임의 파츠·가짜 검은 생성하지 않고 기존 스타터 장검 Tool 동작은 유지한다.
  local previous=character:FindFirstChild("MeadowForgedWeaponVisual")
  if previous then previous:Destroy() end
  if weapon and weapon.ModelKey and not weapon.Bow then
    local hand=character:FindFirstChild("RightHand") or character:FindFirstChild("Right Arm")
    if hand then
      local model=worldAsset(weapon.ModelKey,(character:FindFirstChild("HumanoidRootPart") and character.HumanoidRootPart.Position or Vector3.new(0,5,0)),3.5)
      local mesh=model and model:FindFirstChildWhichIsA("MeshPart",true)
      if mesh then
        -- [고유 무기] 여러 파츠로 된 원본 검날·자루·장식·텍스처를 하나도 버리지 않는다.
        local grip=hand.CFrame*CFrame.new(0,-.45,-.15)*CFrame.Angles(0,math.rad(90),math.rad(-90))
        model:PivotTo(grip*mesh.CFrame:Inverse()*model:GetPivot())
        model.Name="MeadowForgedWeaponVisual"
        for _,part in ipairs(model:GetDescendants()) do
          if part:IsA("BasePart") then
            part.Anchored=false;part.CanCollide=false;part.CanTouch=false;part.CanQuery=false;part.Massless=true
            local joint=Instance.new("WeldConstraint");joint.Part0=hand;joint.Part1=part;joint.Parent=part
          end
        end
        model.Parent=character
      elseif model then model:Destroy() end
    end
  end
  if not weapon or not weapon.Bow then return end
  local human=character:FindFirstChildOfClass("Humanoid")
  if human then human:UnequipTools() end
  local hand=character:FindFirstChild("LeftHand") or character:FindFirstChild("Left Arm")
  if not hand then return end
  local model=worldAsset(weapon.ModelKey or "item_bow_wooden",(character:FindFirstChild("HumanoidRootPart") and character.HumanoidRootPart.Position or Vector3.new(0,5,0)),3.4)
  local mesh=model and model:FindFirstChildWhichIsA("MeshPart",true)
  if not mesh then if model then model:Destroy() end return end
  -- [고유 활] 활몸·활시위 등 원본 전체가 손에 따라 움직이도록 각각 직접 고정한다.
  local grip=hand.CFrame*CFrame.new(0,-.35,-.15)*CFrame.Angles(0,math.rad(90),math.rad(-90))
  model:PivotTo(grip*mesh.CFrame:Inverse()*model:GetPivot())
  model.Name="MeadowBowVisual"
  for _,part in ipairs(model:GetDescendants()) do
    if part:IsA("BasePart") then
      part.Anchored=false;part.CanCollide=false;part.CanTouch=false;part.CanQuery=false;part.Massless=true
      local weld=Instance.new("WeldConstraint");weld.Part0=hand;weld.Part1=part;weld.Parent=part
    end
  end
  model.Parent=character
end
-- [무기 중복 방지] 제작·장착한 무기의 실물 메시가 손에 붙어 있으면 기본 도구(장검)의 외형은 숨긴다(도구는 그대로 유지).
local function syncToolVisual(player)
  local character=player.Character
  if not character then return end
  local weapon=meadowRpg.equippedWeapon(player)
  local hide=weapon~=nil and (weapon.Bow==true or weapon.ModelKey~=nil)
    and (character:FindFirstChild("MeadowForgedWeaponVisual") or character:FindFirstChild("MeadowBowVisual")) ~= nil
  local backpack=player:FindFirstChildOfClass("Backpack")
  for _,holder in ipairs({character,backpack}) do
    if holder then
      for _,tool in ipairs(holder:GetChildren()) do
        if tool:IsA("Tool") then
          for _,d in ipairs(tool:GetDescendants()) do
            if d:IsA("BasePart") then
              if hide then
                if d:GetAttribute("MeadowOrigT")==nil then d:SetAttribute("MeadowOrigT",d.Transparency) end
                d.Transparency=1
              elseif d:GetAttribute("MeadowOrigT")~=nil then
                d.Transparency=d:GetAttribute("MeadowOrigT");d:SetAttribute("MeadowOrigT",nil)
              end
            end
          end
        end
      end
    end
  end
end
local function refreshBowVisual(player)
  refreshBowVisualCore(player)
  syncToolVisual(player)
end
local toolSyncHooked={}
Players.PlayerAdded:Connect(function(player)
  player.CharacterAdded:Connect(function(character)
    character.ChildAdded:Connect(function(child)
      if child:IsA("Tool") then task.defer(syncToolVisual,player) end
    end)
  end)
end)
-- [갑옷 외형] 착용 중인 흉갑을 등록된 CC0 갑옷 메시로 상체에 붙인다. 등급별로 가죽/금속/흑철/황금 모델을 쓴다.
local armorModelByRarity={Common="item_armor_leather",Uncommon="item_armor_leather",Rare="item_armor_metal",Epic="item_armor_black",Legendary="item_armor_golden"}
local function refreshArmorVisual(player)
  local character=player.Character
  if not character then warn("ARMORVIS no character") return end
  local old=character:FindFirstChild("MeadowArmorVisual")
  if old then old:Destroy() end
  local chest=meadowRpg.equippedChest and meadowRpg.equippedChest(player)
  if not chest then return end
  local torso=character:FindFirstChild("UpperTorso") or character:FindFirstChild("Torso")
  if not torso then warn("ARMORVIS no torso") return end
  local look=(Config.GearLook or {})[chest.Id] or {}
  local modelKey=look.model or chest.ModelKey or armorModelByRarity[chest.Rarity or "Common"] or "item_armor_leather"
  local origin=character:FindFirstChild("HumanoidRootPart")
  local model=worldAsset(modelKey,origin and origin.Position or torso.Position,2.5)
  if not model or not model:FindFirstChildWhichIsA("MeshPart",true) then
    if model then model:Destroy() end
    warn("ARMORVIS source 3D missing: "..tostring(modelKey))
    return
  end
  -- [고품질 갑옷] 실물 흉갑의 여러 MeshPart/색상/텍스처를 보존하고 균일 배율만 적용한다.
  -- 이전처럼 첫 조각만 떼거나 너비·높이를 제각각 늘려 메시를 찌그러뜨리지 않는다.
  local _,box=model:GetBoundingBox()
  if box.X<=.01 or box.Y<=.01 or box.Z<=.01 then model:Destroy();return end
  local ratio=math.min(torso.Size.X*1.2/box.X,torso.Size.Y*1.15/box.Y,torso.Size.Z*1.6/box.Z)
  model:ScaleTo(model:GetScale()*math.clamp(ratio,.4,2.4))
  local bounds=model:GetBoundingBox()
  local wanted=torso.CFrame*CFrame.new(0,-.05,0)
  model:PivotTo(wanted*bounds:Inverse()*model:GetPivot())
  model.Name="MeadowArmorVisual"
  local tint=look.tint and Color3.fromRGB(look.tint[1],look.tint[2],look.tint[3]) or nil
  local lit=false
  for _,part in ipairs(model:GetDescendants()) do
    if part:IsA("BasePart") then
      if part:IsA("MeshPart") then
        if tint then part.Color=tint end
        if look.glow and not lit then
          local lamp=Instance.new("PointLight")
          lamp.Color=Color3.fromRGB(look.glow[1],look.glow[2],look.glow[3])
          lamp.Range=9;lamp.Brightness=.9;lamp.Parent=part
          lit=true
        end
      end
      part.Anchored=false;part.CanCollide=false;part.CanTouch=false;part.CanQuery=false;part.Massless=true
      local weld=Instance.new("WeldConstraint");weld.Part0=torso;weld.Part1=part;weld.Parent=part
    end
  end
  model.Parent=character
end
-- [장갑·바지·장화 외형] 모든 등급에 이미 등록된 CC0 메시(item_glove / item_pants / item_boots)를 연결한다.
-- 기본 장비도 실물 메시를 쓰되 기존 등급·공격·방어·저장 흐름은 변경하지 않는다.
local gearVisualSpec={
  Hands={model="item_glove",height=1.0,parts={"LeftHand","RightHand"},offset=CFrame.new(0,-.02,0),fit=Vector3.new(1.35,1.3,1.35)},
  Feet={model="item_boots",height=1.1,parts={"LeftFoot","RightFoot"},offset=CFrame.new(0,.1,0),fit=Vector3.new(1.35,1.9,1.3)},
  Legs={model="item_pants",height=2.3,parts={"LowerTorso"},offset=CFrame.new(0,-1.0,0),fit=Vector3.new(1.12,5.6,1.35)},
}
local function refreshGearVisuals(player)
  local character=player.Character
  if not character then return end
  for slot,spec in pairs(gearVisualSpec) do
    for _,child in ipairs(character:GetChildren()) do
      if child.Name=="MeadowGearVisual_"..slot then child:Destroy() end
    end
    local item=meadowRpg.equippedSlot and meadowRpg.equippedSlot(player,slot)
    if item then
      for _,partName in ipairs(spec.parts) do
        local anchor=character:FindFirstChild(partName)
        if anchor then
          local origin=character:FindFirstChild("HumanoidRootPart")
          local look=Config.GearLook[item.Id] or {}
          local model=worldAsset(look.model or spec.model,origin and origin.Position or Vector3.new(0,5,0),spec.height)
          local mesh=model and model:FindFirstChildWhichIsA("MeshPart",true)
          if mesh then
            local visual=mesh:Clone()
            model:Destroy()
            visual.Name="MeadowGearVisual_"..slot
            visual.Anchored=false;visual.CanCollide=false;visual.CanTouch=false;visual.CanQuery=false;visual.Massless=true
            if look.tint then visual.Color=Color3.fromRGB(look.tint[1],look.tint[2],look.tint[3])
            elseif item.Tint then visual.Color=visual.Color:Lerp(Color3.fromRGB(item.Tint[1],item.Tint[2],item.Tint[3]),.4) end
            local k=look.fit or 1
            visual.Size=Vector3.new(anchor.Size.X*spec.fit.X*k,anchor.Size.Y*spec.fit.Y,anchor.Size.Z*spec.fit.Z*k)
            if look.glow then
              local l=Instance.new("PointLight");l.Color=Color3.fromRGB(look.glow[1],look.glow[2],look.glow[3]);l.Range=6;l.Brightness=.6;l.Parent=visual
            end
            visual.Parent=character
            local weld=Instance.new("Weld");weld.Part0=anchor;weld.Part1=visual;weld.C0=spec.offset;weld.Parent=visual
          elseif model then
            model:Destroy()
          end
        end
      end
    end
  end
end
-- [장신구 외형] 목걸이·반지·팔찌·수정을 착용 부위에 붙인다(등록된 CC0 메시만).
local function refreshAccessoryVisual(player)
  local character=player.Character
  if not character then return end
  local old=character:FindFirstChild("MeadowAccessoryVisual")
  if old then old:Destroy() end
  local item=meadowRpg.equippedSlot and meadowRpg.equippedSlot(player,"Accessory")
  local look=item and Config.GearLook[item.Id]
  local spec=look and look.acc
  if not spec then return end
  local anchor=character:FindFirstChild(spec.part) or character:FindFirstChild("Torso")
  if not anchor then return end
  local origin=character:FindFirstChild("HumanoidRootPart")
  local model=worldAsset(spec.model,origin and origin.Position or Vector3.new(0,5,0),spec.height)
  local mesh=model and model:FindFirstChildWhichIsA("MeshPart",true)
  if not mesh then if model then model:Destroy() end return end
  local visual=mesh:Clone();model:Destroy()
  visual.Name="MeadowAccessoryVisual"
  visual.Anchored=false;visual.CanCollide=false;visual.CanTouch=false;visual.CanQuery=false;visual.Massless=true
  if look.tint then visual.Color=Color3.fromRGB(look.tint[1],look.tint[2],look.tint[3]) end
  visual.Parent=character
  local weld=Instance.new("Weld");weld.Part0=anchor;weld.Part1=visual
  weld.C0=CFrame.new(spec.off[1],spec.off[2],spec.off[3]);weld.Parent=visual
  if look.glow then
    local l=Instance.new("PointLight");l.Color=Color3.fromRGB(look.glow[1],look.glow[2],look.glow[3]);l.Range=8;l.Brightness=1;l.Parent=visual
  end
end
-- [무기 자동 꺼내기] 무기를 장착하면 손에 들고, 무기 종류에 맞는 전투 모션을 쓰도록 도구에 표시한다. 활은 도구를 넣는다.
local classMotionProfile={Sword="SWORD",Greatsword="GREATSWORD",Dagger="DAGGER",Axe="WAR_AXE",Hammer="HAMMER",Staff="STAFF"}
local function autoDrawWeapon(player,forceDraw)
  local character=player.Character
  local human=character and character:FindFirstChildOfClass("Humanoid")
  if not human or human.Health<=0 then return end
  local weapon=meadowRpg.equippedWeapon(player)
  if not weapon or weapon.Bow then return end
  local cls=Config.GearWeaponClass[weapon.Id]
  local backpack=player:FindFirstChildOfClass("Backpack")
  local tool=character:FindFirstChildOfClass("Tool")
  if not tool and backpack then
    for _,t in ipairs(backpack:GetChildren()) do if t:IsA("Tool") then tool=t;break end end
  end
  if not tool then return end
  local profile=classMotionProfile[cls]
  if profile then tool:SetAttribute("WeaponMotionProfile",profile) end
  if forceDraw and tool.Parent~=character then human:EquipTool(tool) end
end
-- [망토 색] 오프닝 망토 모델의 손잡이 메시 색을 장착한 망토의 Tint로 바꾼다. 장착 해제하면 원래 색으로 돌아온다.
local function refreshCapeTint(player)
  local character=player.Character
  local cape=character and character:FindFirstChild("MeadowWornCrimsonCape")
  local handle=cape and cape:FindFirstChild("Handle")
  if not handle or not handle:IsA("MeshPart") then return end
  if handle:GetAttribute("CapeBaseR")==nil then
    handle:SetAttribute("CapeBaseR",handle.Color.R);handle:SetAttribute("CapeBaseG",handle.Color.G);handle:SetAttribute("CapeBaseB",handle.Color.B)
  end
  local base=Color3.new(handle:GetAttribute("CapeBaseR"),handle:GetAttribute("CapeBaseG"),handle:GetAttribute("CapeBaseB"))
  local item=meadowRpg.equippedSlot and meadowRpg.equippedSlot(player,"Cape")
  if item and item.Tint then
    handle.Color=base:Lerp(Color3.fromRGB(item.Tint[1],item.Tint[2],item.Tint[3]),.75)
  else
    handle.Color=base
  end
end
local function watchArmorVisual(player)
  player:GetAttributeChangedSignal("MeadowEquipChest"):Connect(function() refreshArmorVisual(player) end)
  for _,attribute in ipairs({"MeadowEquipHands","MeadowEquipLegs","MeadowEquipFeet","MeadowGearOwned","MeadowGearOwned2","MeadowGearOwned3","MeadowGearOwned4"}) do
    player:GetAttributeChangedSignal(attribute):Connect(function() refreshGearVisuals(player) end)
  end
  player:GetAttributeChangedSignal("MeadowEquipCape"):Connect(function() refreshCapeTint(player) end)
  player:GetAttributeChangedSignal("MeadowEquipAccessory"):Connect(function() refreshAccessoryVisual(player) end)
  player:GetAttributeChangedSignal("MeadowEquipWeapon"):Connect(function() task.delay(.5,function() autoDrawWeapon(player,true) end) end)
  player.CharacterAdded:Connect(function() task.wait(2.6);refreshAccessoryVisual(player);autoDrawWeapon(player,true) end)
  player.CharacterAdded:Connect(function() for _,gap in ipairs({4,4,6}) do task.wait(gap);refreshCapeTint(player) end end)
  player.CharacterAdded:Connect(function() task.wait(2.2);refreshGearVisuals(player) end)
  player.CharacterAdded:Connect(function() task.wait(1.8);refreshArmorVisual(player) end)
end
for _,existing in ipairs(Players:GetPlayers()) do watchArmorVisual(existing) end
Players.PlayerAdded:Connect(watchArmorVisual)
local function watchBowVisual(player)
  player:GetAttributeChangedSignal("MeadowEquipWeapon"):Connect(function() refreshBowVisual(player) end)
  player:GetAttributeChangedSignal("MeadowGearOwned2"):Connect(function() refreshBowVisual(player) end)
  player:GetAttributeChangedSignal("MeadowGearOwned3"):Connect(function() refreshBowVisual(player) end)
  player:GetAttributeChangedSignal("MeadowGearOwned4"):Connect(function() refreshBowVisual(player) end)
  player:GetAttributeChangedSignal("MeadowEquipShield"):Connect(function() refreshBowVisual(player) end)
  player:GetAttributeChangedSignal("MeadowSkillBits3"):Connect(function() refreshBowVisual(player) end)
  player.CharacterAdded:Connect(function() task.wait(1.5);refreshBowVisual(player) end)
end
for _,existing in ipairs(Players:GetPlayers()) do watchBowVisual(existing) end
Players.PlayerAdded:Connect(watchBowVisual)

-- [메인 퀘스트·연구 기록 아이템]
-- 채집·관찰·실제 몬스터 처치·유적 수문장 처치에만 연결한다.
-- 수집 기록은 숫자형 저장 필드이며 기존 DataStore/전투 보상 수치를 유지한다.
local function meadowRegionOf(player)
  local character=player.Character
  local root=character and character:FindFirstChild("HumanoidRootPart")
  if not root then return "meadow" end
  return Config.WorldMap.ZoneAt(root.Position.X,root.Position.Z) or "meadow"
end
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
    if eventName~="BOSS_KILL" or meadowRegionOf(player)~="meadow" then return end
    progress+=1
  elseif stage==7 then
    if eventName~="FOREST_FLAG" then return end
    progress+=1
  elseif stage==8 then
    if eventName~="BOSS_KILL" or meadowRegionOf(player)~="worldtree" then return end
    progress+=1
  elseif stage==9 then
    if eventName~="NICK_TALK" then return end
    progress+=1
  elseif stage==10 then
    if eventName~="VOLCANO_MARK" then return end
    progress+=1
  elseif stage==11 then
    if eventName~="KILL" or meadowRegionOf(player)~="oasis" then return end
    progress+=1
  elseif stage==12 then
    if eventName~="MINA_NOTE" then return end
    progress+=1
  elseif quest.Event then
    -- 13장 이후: 지정한 지역(Zone)에서 같은 이벤트(KILL)가 올 때만 센다.
    if eventName~=quest.Event then return end
    if quest.Zone and meadowRegionOf(player)~=quest.Zone then return end
    progress+=1
  else
    return
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
      nextQuest=Config.MainQuests[stage+1] and Config.MainQuests[stage+1].Name or "기사단 연대기 — 엔딩은 이어진다",
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
  if not node.model and node.kind=="WOOD" then return false end
  local sourcePos=node.model and node.model:GetPivot().Position or node.position
  if (rootPart.Position-sourcePos).Magnitude>14 then return false end
  local now = os.clock()
  if now < node.readyAt then return false end
  node.readyAt = now + 11
  if node.model then node.model:SetAttribute("NextHarvestAt", node.readyAt) end
  local material = node.kind == "WOOD" and "Wood" or node.kind == "HERB" and "RedLeaf"
    or node.kind == "ORE" and "Ore" or "Stone"
  setNumber(player, material, readNumber(player, material, 0) + 2)
  -- [잡템 드랍] 채집할 때 가끔 다른 재료가 함께 나온다. 모두 제작·강화·물약에 쓰인다.
  local luck=math.min(.25,readNumber(player,"GatheringProficiency",0)*.005)
  local function bonus(field,chance,amount)
    if math.random()<chance+luck then setNumber(player,field,readNumber(player,field,0)+(amount or 1)) end
  end
  if node.kind=="WOOD" then bonus("Mushroom",.3)
  elseif node.kind=="STONE" then bonus("Ore",.35);bonus("Crystal",.05)
  elseif node.kind=="HERB" then bonus("Moonbloom",.25);bonus("Mushroom",.2)
  elseif node.kind=="ORE" then bonus("Stone",.6);bonus("Crystal",.12);bonus("Magma",.2) end
  awardProgress(player, 3, 1)
  -- [채집 숙련도] 기존 재화·전투 경험치·자원 2개 보상은 그대로 둔다.
  setNumber(player,"GatheringProficiency",readNumber(player,"GatheringProficiency",0)+1)
  player:SetAttribute("LastApprovedScope", "resource-harvest")
  if node.kind=="WOOD" or node.kind=="STONE" then recordMeadowQuest(player,node.kind) end
  if node.kind=="ORE" and meadowOil.questEvent then pcall(meadowOil.questEvent,player,"MINE_ORE") end
  if node.kind=="HERB" and meadowOil.questEvent then pcall(meadowOil.questEvent,player,"GATHER_HERB") end
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
    {kind="HERB",position=Vector3.new(20,2,-55)},
    {kind="HERB",position=Vector3.new(-18,2,-60)},
    {kind="HERB",position=Vector3.new(45,2,5)},
    {kind="ORE",position=Vector3.new(-45,2,-5)},
    {kind="ORE",position=Vector3.new(30,2,45)},
    -- [생태 자원] 폐광 광맥은 고블린 야영지가 지키고, 박쥐 동굴 앞에는 약초가 자란다.
    {kind="ORE",position=Vector3.new(205,2,-138)},
    {kind="ORE",position=Vector3.new(226,2,-158)},
    {kind="HERB",position=Vector3.new(246,2,226)},
    {kind="HERB",position=Vector3.new(268,2,232)},
  }
  for _, spec in ipairs(sites) do
    local model = spec.visual and worldAsset(spec.visual,spec.position,11) or nil
    if spec.kind ~= "WOOD" or model then
      local node={model=model,position=spec.position,kind=spec.kind,readyAt=0}
      table.insert(resourceNodes,node)
      local mesh=model and model:FindFirstChildWhichIsA("MeshPart",true)
      if not mesh then
        -- 나무 외 채집점(돌·약초·광석)은 지형으로 모양을 만들고 투명 Attachment에 프롬프트를 둔다.
        local terrain=workspace.Terrain
        pcall(function()
          if spec.kind=="STONE" then terrain:FillBall(spec.position+Vector3.new(0,1.2,0),3.4,Enum.Material.Rock)
          elseif spec.kind=="ORE" then terrain:FillBall(spec.position+Vector3.new(0,1.2,0),3,Enum.Material.Slate)
            terrain:FillBall(spec.position+Vector3.new(1.6,2.4,0),1.6,Enum.Material.CrackedLava)
          else terrain:FillBall(spec.position+Vector3.new(0,.6,0),3,Enum.Material.LeafyGrass) end
        end)
        local anchor=Instance.new("Attachment")
        anchor.Name="MeadowGatherAnchor";anchor.WorldPosition=spec.position+Vector3.new(0,3,0);anchor.Parent=terrain
        local prompt=Instance.new("ProximityPrompt")
        prompt.Name="GatherPrompt"
        prompt.ActionText=spec.kind=="STONE" and "돌 채집" or spec.kind=="ORE" and "광석 채굴" or spec.kind=="HERB" and "약초 채집" or "채집"
        prompt.ObjectText=spec.kind=="STONE" and "바위" or spec.kind=="ORE" and "광맥" or "약초 덤불"
        prompt.MaxActivationDistance=14
        prompt.HoldDuration=.3
        prompt.RequiresLineOfSight=false
        prompt.Parent=anchor
        prompt.Triggered:Connect(function(player) gatherResource(player,node) end)
      end
      if mesh then
        local prompt=Instance.new("ProximityPrompt")
        prompt.Name="GatherPrompt"
        prompt.ActionText="나무 채집"
        prompt.ObjectText="초원 나무"
        prompt.MaxActivationDistance=14
        prompt.HoldDuration=.3
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
      clue="오래된 유적 발견 · 기사단 연대기에 석벽의 흔적과 위치를 기록했어."
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
      clue="새벽 마력 흔적 발견 · 낮은 안개 사이로 남은 마력의 흐름을 기록했어.  "..clue
    elseif period=="NIGHT" then
      setNumber(player,"NightTraceFound",1)
      clue="밤의 숲 마력 기록 · 푸른 마력이 모이는 숲 가장자리를 확인했어.  "..clue
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
  -- [맵 네 끝 발견 지점] 기존 나무 CC0 모델과 WOODLAND 조사만 재사용한다.
  -- 탐험 저장 비트 4개를 그대로 사용하며 별도 아이템/필드/의뢰를 만들지 않는다.
  for _,corner in ipairs({
    {-318,313,17,"OUTER"},{317,312,18,"OUTER"},
    {-318,-312,16,"OUTER"},{318,-313,17,"OUTER"},
  }) do
    woodland[#woodland+1]=corner
  end
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
    meadowPalette.leaves,Color3.fromRGB(69,92,66),
    Color3.fromRGB(57,78,72),Color3.fromRGB(86,96,69),
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
      -- [자연림 색감] 기존 CC0 나무 메시의 잎만 위치에 따라 청록/황록/짙은 녹색으로.
      if spec[1]<-230 then
        leafTone=leafTone:Lerp(Color3.fromRGB(53,76,64),.34)
      elseif spec[1]>220 and math.abs(spec[2])<175 then
        leafTone=leafTone:Lerp(Color3.fromRGB(65,92,88),.3)
      elseif spec[2]>190 then
        leafTone=leafTone:Lerp(Color3.fromRGB(108,104,74),.26)
      end
      for _,surface in ipairs(tree:GetDescendants())do
        if surface:IsA("MeshPart") and surface.Material==Enum.Material.LeafyGrass then
          surface.Color=surface.Color:Lerp(leafTone,.33)
        end
      end
      -- [접근성] 기존 네 초원 입구의 조사 지점만 남겨 프롬프트가 숲 전체를 가리지 않는다.
      -- 네 사분면별 발견 비트·퀘스트·저장 의미는 그대로 사용한다.
      if index==6 or index==12 or index==18 or index==24 or spec[4]=="OUTER" then
        bindMeadowInspection(tree,"WOODLAND")
        if spec[4]=="OUTER" then tree:SetAttribute("MeadowOuterCornerDiscovery",true) end
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
    -- [북서/북동 외곽 순환] 마을 양쪽 출입로에서 늑대·박쥐 서식지를 따라 네 끝으로 연결.
    -- 동쪽 개울은 Z=-154~154에서만 흐르므로 동문 통과는 Z=-195의 마른 길로 우회한다.
    {from=Vector2.new(-228,-219),to=Vector2.new(-315,-193)},
    {from=Vector2.new(-233,-193),to=Vector2.new(-315,-193)},
    {from=Vector2.new(-315,-193),to=Vector2.new(-319,-94)},
    {from=Vector2.new(-315,-193),to=Vector2.new(-319,-308)},
    {from=Vector2.new(-319,-308),to=Vector2.new(-240,-315)},
    {from=Vector2.new(231,-228),to=Vector2.new(316,-195)},
    {from=Vector2.new(235,-195),to=Vector2.new(316,-195)},
    {from=Vector2.new(316,-195),to=Vector2.new(319,-94)},
    {from=Vector2.new(316,-195),to=Vector2.new(319,-308)},
    {from=Vector2.new(319,-308),to=Vector2.new(241,-316)},
    -- [남쪽 외곽 순환] 네 방향 숲의 기존 길을 북서/북동 끝과 북쪽 능선에 연결한다.
    {from=Vector2.new(-234,233),to=Vector2.new(-309,308)},
    {from=Vector2.new(236,238),to=Vector2.new(309,308)},
    {from=Vector2.new(-309,308),to=Vector2.new(-155,316)},
    {from=Vector2.new(-155,316),to=Vector2.new(0,317)},
    {from=Vector2.new(0,317),to=Vector2.new(155,316)},
    {from=Vector2.new(155,316),to=Vector2.new(309,308)},
    -- [외곽 옆길] 서쪽 늑대 길과 남서 숲, 동쪽 늑대 길과 남동 숲을 이어 왕복만 강제하지 않는다.
    {from=Vector2.new(-309,308),to=Vector2.new(-315,204)},
    {from=Vector2.new(-315,204),to=Vector2.new(-315,100)},
    {from=Vector2.new(-315,100),to=Vector2.new(-319,-3)},
    {from=Vector2.new(-319,-3),to=Vector2.new(-319,-94)},
    {from=Vector2.new(309,308),to=Vector2.new(315,204)},
    {from=Vector2.new(315,204),to=Vector2.new(315,100)},
    {from=Vector2.new(315,100),to=Vector2.new(319,-3)},
    {from=Vector2.new(319,-3),to=Vector2.new(319,-94)},
  }
  for route,track in ipairs(tracks) do
    for step=1,34 do
      local t=step/34
      local p=track.from:Lerp(track.to,t)
      -- [자연스러운 길] 양 끝 연결점은 맞추고(엔벨로프), 중간은 두 겹 물결로 구불거린다.
      local envelope=math.sin(t*math.pi)
      local bend=(math.sin(t*math.pi*2+route)*3.4+math.sin(t*math.pi*5+route*1.7)*1.6)*envelope
      -- 폭 7~9의 불규칙한 길. 표면이 높아져 보행을 막지 않도록 기존 높이를 유지한다.
      local width=3.8+math.sin(t*12+route)*.45
      local cx,cz=p.X+bend,p.Y-bend*.45
      meadowTerrain:FillBall(Vector3.new(cx,2.1-width,cz),width,Enum.Material.Ground)
      -- 바퀴 자국처럼 가운데는 젖은 흙, 가장자리는 풀·자갈이 섞이게 같은 높이로 덧칠한다.
      meadowTerrain:FillBall(Vector3.new(cx,2.1-width*.55,cz),width*.55,Enum.Material.Mud)
      if step%2==0 then
        local side=(step%4==0) and 1 or -1
        local ox=-(track.to.Y-track.from.Y);local oz=(track.to.X-track.from.X)
        local len=math.max(1,math.sqrt(ox*ox+oz*oz))
        local edge=width+.9+math.abs(math.sin(step*1.3+route))*1.2
        local ex,ez=cx+ox/len*edge*side,cz+oz/len*edge*side
        local edgeRadius=1.4+math.abs(math.sin(step+route))*.7
        meadowTerrain:FillBall(Vector3.new(ex,2.1-edgeRadius,ez),edgeRadius,
          (step%6==0) and Enum.Material.Rock or Enum.Material.LeafyGrass)
      end
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
  -- [초원 구역별 지표] 바람 든 풀밭·짙은 숲 낙엽·시냇가 습토·갈색 야생초.
  -- 원래 Roblox Terrain 재질만 섞으며 파츠/임의 자연물/신규 자산은 만들지 않는다.
  -- 경로 36구간·마을·유적·모든 채집/스폰 부근의 실제 평탄 지형은 보호한다.
  local habitatZones={
    {x=-285,z=114,sx=41,sz=140,leaf=Enum.Material.LeafyGrass,accent=Enum.Material.Ground},
    {x=300,z=21,sx=28,sz=122,leaf=Enum.Material.Mud,accent=Enum.Material.LeafyGrass},
    {x=0,z=288,sx=205,sz=42,leaf=Enum.Material.LeafyGrass,accent=Enum.Material.Grass},
    {x=-304,z=-225,sx=27,sz=65,leaf=Enum.Material.Ground,accent=Enum.Material.LeafyGrass},
    {x=303,z=-226,sx=29,sz=67,leaf=Enum.Material.Ground,accent=Enum.Material.LeafyGrass},
  }
  local meadowHabitatDetails=0
  local meadowTerrainMounds=0
  for region,zone in ipairs(habitatZones) do
    for index=1,24 do
      local theta=index*2.399963+region*.62
      local radius=.25+((index*7)%19)/25
      local x=zone.x+math.cos(theta)*zone.sx*radius
      local z=zone.z+math.sin(theta)*zone.sz*radius
      local point=Vector2.new(x,z)
      local blocked=x>=-280 and x<=280 and z>=-351 and z<=-42
      if math.abs(x)>338 or math.abs(z)>338 then blocked=true end
      -- [길 보호] 비포장 메인 길이나 지름길 중심 11칸 이내는 건드리지 않는다.
      if not blocked then
        for _,track in ipairs(tracks) do
          local axis=track.to-track.from
          local t=math.clamp((point-track.from):Dot(axis)/math.max(1,axis:Dot(axis)),0,1)
          if (point-(track.from+axis*t)).Magnitude<11 then blocked=true;break end
        end
      end
      if not blocked then
        for _,track in ipairs(trailSpurs) do
          local axis=track.to-track.from
          local t=math.clamp((point-track.from):Dot(axis)/math.max(1,axis:Dot(axis)),0,1)
          if (point-(track.from+axis*t)).Magnitude<11 then blocked=true;break end
        end
      end
      -- [자산/진입 보호] 숲 안의 기존 유적과 작은 지표 광맥, 실제 몬스터 출현점을 피한다.
      if not blocked then
        for _,site in ipairs(meadowEncounterSites) do
          if (point-Vector2.new(site.position.X,site.position.Z)).Magnitude<18 then
            blocked=true;break
          end
        end
      end
      if not blocked then
        for _,ruin in ipairs({Vector2.new(-122,-147),Vector2.new(137,139),Vector2.new(-154,122)}) do
          if (point-ruin).Magnitude<24 then blocked=true;break end
        end
      end
      if not blocked and region==2 then
        -- [개울 둑] 수로 가운데 물과 건너는 길은 덮지 않고 바깥 습지만 꾸민다.
        local waterX=266+8*math.sin(z*.029)+2*math.cos(z*.073)
        if math.abs(x-waterX)<14 then blocked=true end
      end
      if not blocked then
        local noise=math.noise(x*.06,z*.06,region*.74)
        local size=2.55+(index%6)*.49+math.abs(noise)*.55
        local material=(index%4==0 or noise<-.23) and zone.accent or zone.leaf
        -- 원래 잔디 상단 +2 높이의 얇은 질감. 능선이나 충돌성 돌무더기 없음.
        meadowTerrain:FillBall(Vector3.new(x,2.04-size,z),size,material)
        meadowHabitatDetails+=1
        -- [완만한 언덕] 평평한 초원에 높이 변화를 준다. 길·유적·몬스터 출현점 주변 보호 구역은 위에서 이미 제외됐고,
        -- 높이 0.8~1.7, 넓은 반경이라 경사가 약 20도 이하라서 걷기·전투를 막지 않는다(물체는 살짝 묻히기만 한다).
        if index%3==0 then
          local hillRadius=17+((index*5+region)%11)*1.1
          local hillHeight=.8+math.abs(math.noise(x*.031,z*.031,region*1.3))*1.7
          meadowTerrain:FillBall(Vector3.new(x,2.04+hillHeight-hillRadius,z),hillRadius,zone.leaf)
          meadowTerrainMounds+=1
        end
      end
      if index%8==0 then task.wait() end
    end
  end
  gameWorld:SetAttribute("MeadowHabitatTerrainDetails",meadowHabitatDetails)
  gameWorld:SetAttribute("MeadowTerrainMounds",meadowTerrainMounds)
  gameWorld:SetAttribute("MeadowOuterRouteBranches",#tracks-8)
  gameWorld:SetAttribute("MeadowOuterDiscoveryCorners",4)
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

-- [전투 성향] 모델 종류에 따라 공격 방식을 나눈다. mage: 원거리 마법탄·광역 폭발, rogue: 빠른 찌르기·연속 베기,
-- 이름 있는 보스(named): 후반 충격파. 서버가 판정·피해를 소유하며 클라이언트는 연출만 한다.
local mobStyleByModel={mage="mage",skmage="mage",witch="mage",frostfiend="mage",demon="mage",
  rogue="rogue",roguehooded="rogue",skrogue="rogue",assassin="rogue",wasp="rogue",fox="rogue",ninja="rogue",hywirl="mage",
  snake="rogue",snakeangry="rogue",rat="rogue",skminion="rogue",goblin="rogue",goblinscout="rogue"}

-- [R15 인간형 몹] 인간형 변종은 Roblox 공식 R15 리그와 공식 애니메이션(대기/걷기/달리기/베기/찌르기)으로 움직인다.
-- 색·체형만 HumanoidDescription/스케일로 구분하고 가짜 파츠는 만들지 않는다. 판정·AI는 기존 서버 로직 그대로.
local meadowR15Looks={
  barbarian={skin=Color3.fromRGB(190,140,105),torso=Color3.fromRGB(122,78,48),legs=Color3.fromRGB(70,52,40),wide=1.12},
  knight={skin=Color3.fromRGB(205,160,128),torso=Color3.fromRGB(140,150,168),legs=Color3.fromRGB(96,104,120),wide=1.1},
  king={skin=Color3.fromRGB(205,160,128),torso=Color3.fromRGB(150,40,60),legs=Color3.fromRGB(214,176,70),wide=1.14},
  punk={skin=Color3.fromRGB(180,130,100),torso=Color3.fromRGB(40,40,52),legs=Color3.fromRGB(150,60,150),wide=1.0},
  roguehooded={skin=Color3.fromRGB(190,150,120),torso=Color3.fromRGB(46,70,52),legs=Color3.fromRGB(40,44,40),wide=.92},
  rogue={skin=Color3.fromRGB(190,150,120),torso=Color3.fromRGB(70,60,86),legs=Color3.fromRGB(44,40,52),wide=.92},
  adventurer={skin=Color3.fromRGB(200,155,120),torso=Color3.fromRGB(96,120,70),legs=Color3.fromRGB(84,66,48),wide=1.0},
}
local MEADOW_R15_ANIMS={idle=507766388,walk=507777826,run=507767714,slash=522635514,lunge=522638767}

-- [NPC 일상 동작] 앵커된 R15 NPC가 가만히 서 있지 않게 한다: 플레이어가 가까이 오면 몸을 돌려 쳐다보고 손을 흔들며,
-- 가끔 혼자서도 손짓·환호·웃음 같은 Roblox 공식 감정 애니를 한 번씩 재생한다. 위치는 그대로, 방향만 부드럽게 바뀐다.
_G.MeadowNpcLife=function(npc,animator,baseCF,seed)
  local root=npc and npc:FindFirstChild("HumanoidRootPart")
  if not root or not animator then return end
  local ids={wave=507770239,point=507770453,cheer=507770677,laugh=507770818}
  local tracks={}
  for key,id in pairs(ids) do
    pcall(function()
      local a=Instance.new("Animation");a.AnimationId="rbxassetid://"..id
      local t=animator:LoadAnimation(a);a:Destroy()
      t.Priority=Enum.AnimationPriority.Action;t.Looped=false;tracks[key]=t
    end)
  end
  local rng=Random.new(math.floor(seed*1000)%100000)
  local order={"point","laugh","cheer","wave"}
  local cur=baseCF
  task.spawn(function()
    local nextGesture=os.clock()+rng:NextNumber(4,11)
    local greeted=false
    while npc.Parent do
      task.wait(.1)
      local nearest,nearestDist=nil,16
      for _,player in ipairs(Players:GetPlayers()) do
        local pr=player.Character and player.Character:FindFirstChild("HumanoidRootPart")
        if pr then
          local d=Vector3.new(pr.Position.X-baseCF.Position.X,0,pr.Position.Z-baseCF.Position.Z).Magnitude
          if d<nearestDist then nearest,nearestDist=pr.Position,d end
        end
      end
      local target=baseCF
      if nearest then target=CFrame.lookAt(baseCF.Position,Vector3.new(nearest.X,baseCF.Position.Y,nearest.Z)) end
      cur=cur:Lerp(target,.28)
      npc:PivotTo(cur)
      local now=os.clock()
      if nearest and not greeted then
        greeted=true
        if tracks.wave then tracks.wave:Play(.15) end
        nextGesture=now+rng:NextNumber(7,14)
      elseif not nearest then greeted=false end
      if now>nextGesture then
        local track=tracks[order[rng:NextInteger(1,#order)]]
        if track then track:Play(.2) end
        nextGesture=now+rng:NextNumber(6,15)
      end
    end
  end)
end

-- [신화 합성체] 등록된 CC0 모델 여러 개를 한 몸으로 합쳐 신화 괴물을 만든다(히드라·켄타우로스·아라크네 등).
-- 새 도형 파츠를 만들지 않고 실제 메시 모델만 겹쳐 붙인다. 각 조각은 몸통 모델 안으로 옮겨 함께 움직인다.
-- spec: model(mon_ 키), height(스터드), up/fwd/side(몸통 경계상자 대비 비율, 중심 기준), yaw/pitch(도), 본체 앞이 -Z라고 가정한다.
local function attachMythicParts(model,specs)
  local folder=Instance.new("Folder");folder.Name="MythicParts";folder.Parent=model
  for _,spec in ipairs(specs) do
    local id=NativeCreatureAssets["mon_"..spec.model]
    if typeof(id)=="number" then
      local ok,extra=pcall(function()
        local template=nativeCreatureTemplates[id]
        if not template then
          template=AssetService:LoadAssetAsync(id)
          if not template:IsA("Model") or not template:FindFirstChildWhichIsA("MeshPart",true) then template:Destroy();error("MYTHIC_MESH_REQUIRED") end
          for _,item in ipairs(template:GetDescendants()) do
            if item:IsA("LuaSourceContainer") or item:IsA("RemoteEvent") or item:IsA("RemoteFunction") or item:IsA("Tool") then item:Destroy()
            elseif item:IsA("BasePart") then item.Anchored=true;item.CanCollide=false;item.CanTouch=false;item.CanQuery=false end
          end
          template.Parent=nil
          nativeCreatureTemplates[id]=template
        end
        return template:Clone()
      end)
      if ok and extra and extra:IsA("Model") then
        local minY,maxY=math.huge,-math.huge
        for _,mesh in ipairs(extra:GetDescendants()) do
          if mesh:IsA("MeshPart") and mesh.Transparency<.98 then
            local cf=mesh.CFrame
            local halfY=(math.abs(cf.RightVector.Y)*mesh.Size.X+math.abs(cf.UpVector.Y)*mesh.Size.Y+math.abs(cf.LookVector.Y)*mesh.Size.Z)*.5
            minY=math.min(minY,cf.Position.Y-halfY);maxY=math.max(maxY,cf.Position.Y+halfY)
          end
        end
        if maxY-minY>.01 and maxY~=-math.huge then
          extra:ScaleTo(extra:GetScale()*spec.height/(maxY-minY))
          local cf,size=model:GetBoundingBox()
          local center=cf*CFrame.new((spec.side or 0)*size.X,(spec.up or .5)*size.Y,(spec.fwd or 0)*size.Z)
          extra:PivotTo(center*CFrame.Angles(math.rad(spec.pitch or 0),math.rad(spec.yaw or 0),0))
          -- 조각의 바닥 중심을 목표 지점에 맞춘다.
          local bMin=math.huge
          for _,mesh in ipairs(extra:GetDescendants()) do
            if mesh:IsA("MeshPart") and mesh.Transparency<.98 then
              local c=mesh.CFrame
              local halfY=(math.abs(c.RightVector.Y)*mesh.Size.X+math.abs(c.UpVector.Y)*mesh.Size.Y+math.abs(c.LookVector.Y)*mesh.Size.Z)*.5
              bMin=math.min(bMin,c.Position.Y-halfY)
            end
          end
          if bMin~=math.huge and (spec.pitch or 0)==0 then extra:PivotTo(extra:GetPivot()+Vector3.new(0,center.Position.Y-bMin,0)) end
          local piece=Instance.new("Folder");piece.Name="Part_"..spec.model;piece.Parent=folder
          for _,child in ipairs(extra:GetChildren()) do child.Parent=piece end
          extra:Destroy()
        else extra:Destroy() end
      end
    end
  end
end

-- [지역 몬스터] 서식지의 위치와 위험도를 서버가 소유한다.
local function spawnEnemy(site, siteIndex)
  if #enemies >= MAX_ENEMIES then return false end
  -- [늑대 안전 스폰] 추가된 지점이나 오래된 설정도 마을 구역이면 거부한다.
  if site.id=="wolf" and meadowVillageContains(site.position) and not site.named and not site.questBoss and not site.name then return false end
  local isBoss=site.id=="golem"
  local isAlpha=site.alpha==true -- 우두머리 늑대는 돌 골렘과 별도 보스 패턴을 가진다.
  local location=site.position
  local partId=site.id
  local modelId=partId=="ghost" and NativeCreatureAssets.skeleton
    or (table.find(studioCreatureAtoms,site.atom) and NativeCreatureAssets[partId] or nil)
  -- [변종] site.model이 있으면 업로드된 Quaternius CC0 변종 모델을 쓰고 행동은 partId 종을 따른다.
  if site.model and typeof(NativeCreatureAssets["mon_"..site.model])=="number" then
    modelId=NativeCreatureAssets["mon_"..site.model]
  end
  local r15Look=site.model and meadowR15Looks[site.model] or nil
  local nativeScale=site.height
  if not nativeScale or (partId~="bandit" and not r15Look and (typeof(modelId)~="number" or modelId<1)) then
    warn("마력숲 승인 생물 자산 선택 누락: "..partId)
    return false
  end
  local ok, model = pcall(function()
    if partId=="bandit" or r15Look then
      -- Roblox 정식 R15 전신 모델을 적으로 재사용한다. 가짜 몸체 파츠를 만들지 않는다.
      local desc=Instance.new("HumanoidDescription")
      local skin=r15Look and r15Look.skin or Color3.fromRGB(174,127,97)
      local torsoC=r15Look and r15Look.torso or Color3.fromRGB(92,65,55)
      local legC=r15Look and r15Look.legs or Color3.fromRGB(63,62,67)
      desc.HeadColor=skin
      desc.LeftArmColor=skin
      desc.RightArmColor=skin
      desc.TorsoColor=torsoC
      desc.LeftLegColor=legC
      desc.RightLegColor=legC
      if r15Look then desc.WidthScale=r15Look.wide;desc.BodyTypeScale=0 end
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
  if partId=="wolf" and not site.model then
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
  if site.compose then pcall(attachMythicParts,model,site.compose) end
  model.ModelStreamingMode=Enum.ModelStreamingMode.Atomic
  model.Parent=gameWorld
  local hitPoints = isAlpha and 220 or ((isBoss and 310 or 45) + site.tier*(isBoss and 60 or 13))
  if site.hp then hitPoints=math.floor(hitPoints*site.hp) end
  local meadowNames={wolf=isAlpha and "우두머리 늑대" or "초원 늑대",
    bat="황혼 박쥐",ghost="우물 원혼",bandit="수레 습격 도적"}
  model.Name=isBoss and "초원 수문장 · 돌 골렘" or site.name or (meadowNames[partId] or partId)
  -- [몬스터 공통 재질] 늑대·박쥐·골렘에 기존 토이 플라스틱을 적용한다.
  -- 기존 Pebble/바둑판 원본 몸통 텍스처를 제거하되, 원본 메시·뼈·사지·물리 및 종별 색상은 보존.
  -- 원본 템플릿은 수정하지 않고 스폰 복제본만 바꾼다. 새 장식 파츠를 만들지 않는다.
  -- 별도 미세 돌기 PBR 노멀맵은 Roblox에 업로드·권한 확인된 승인 자산이 있어야 실제 적용 가능.
  local bodyTint=isBoss and meadowPalette.golem or isAlpha and Color3.fromRGB(54,60,74)
    or meadowPalette[partId] or meadowPalette.wolf
  for _,surface in ipairs(model:GetDescendants()) do
    if surface:IsA("MeshPart") and not site.model then
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
        -- [늑대 실사 디테일] 눈은 작은 황금빛, 코는 거의 검정, 송곳니·발톱은 뼈색.
        if partId=="wolf" then
          if partName:find("eye",1,true) then
            surface.Material=Enum.Material.Neon;surface.Color=Color3.fromRGB(217,164,65)
          elseif partName:find("pupil",1,true) then
            surface.Color=Color3.fromRGB(14,12,10)
          elseif partName:find("tooth",1,true) or partName:find("teeth",1,true) or partName:find("claw",1,true) then
            surface.Color=Color3.fromRGB(232,224,204)
          end
        end
        -- [박쥐 눈] 어둠 속에서 붉게 빛나는 눈.
        if partId=="bat" and partName:find("eye",1,true) then
          surface.Material=Enum.Material.Neon
          surface.Color=Color3.fromRGB(255,72,52)
        end
      else
        -- 구형 Pebble 돌무늬/체크 무늬는 원본 메시의 본체에서 제거한다.
        -- 원본 모델 템플릿은 유지하므로 기존 에셋을 파괴하거나 덮어쓰지 않는다.
        local appearance=surface:FindFirstChildOfClass("SurfaceAppearance")
        if appearance then appearance:Destroy() end
        if surface.TextureID~="" then surface.TextureID="" end
        surface.MaterialVariant=""
        -- [재질] 털 달린 몹은 Fabric(보풀 질감), 골렘은 Slate(거친 돌), 벌은 매끈한 광택으로 표현한다.
        local furry=partId=="wolf" or partId=="bat" or partId=="boar" or partId=="rabbit"
        surface.Material=furry and Enum.Material.SmoothPlastic
          or (isBoss or partId=="golem") and Enum.Material.Slate
          or partId=="bee" and Enum.Material.SmoothPlastic
          or Enum.Material.Plastic
        -- 단지 지역 단계가 높을수록 털이 어두워지게 한다(같은 늑대라도 단계별로 구분).
        local shade=1-math.clamp((site.tier or 1)-1,0,3)*.06
        -- [실사 재질] 개체마다 ±5% 명도 차이. 늑대는 큰 조각(몸통)·그다음 조각(배·턱)·나머지(사지·귀) 순으로 톤을 나눈다.
        local jitter=1+((math.sin(location.X*12.9898+location.Z*78.233)*43758.5453)%1-.5)*.1
        shade*=jitter
        -- 로우폴리 토이 톤: 어두운 털은 살짝 밝혀서 얼룩져 보이지 않게 한다.
        local tone=partId=="wolf" and not isAlpha and bodyTint:Lerp(Color3.fromRGB(190,180,168),.22) or bodyTint
        if partId=="wolf" and not isAlpha then
          local order=model:GetAttribute("WolfRankJson")
          if not order then
            local list={}
            for _,part in ipairs(model:GetDescendants()) do
              if part:IsA("MeshPart") then table.insert(list,{name=part.Name,v=part.Size.X*part.Size.Y*part.Size.Z}) end
            end
            table.sort(list,function(a,b) return a.v>b.v end)
            local ranks={}
            for index,row in ipairs(list) do ranks[row.name]=index end
            order=game:GetService("HttpService"):JSONEncode(ranks)
            model:SetAttribute("WolfRankJson",order)
          end
          local rank=game:GetService("HttpService"):JSONDecode(order)[surface.Name] or 1
          tone=rank==2 and tone:Lerp(Color3.fromRGB(205,198,186),.6)
            or rank>=4 and tone:Lerp(Color3.fromRGB(60,56,52),.3) or tone
        end
        surface.Color=Color3.new(math.clamp(tone.R*shade,0,1),math.clamp(tone.G*shade,0,1),math.clamp(tone.B*shade,0,1))
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
  if partId=="ghost" and site.model then
    -- 유령 변종도 반투명 영혼 빛으로 표시한다. 메시와 뼈는 그대로 둔다.
    for _,surface in ipairs(model:GetDescendants()) do
      if surface:IsA("MeshPart") then
        surface.Material=Enum.Material.Neon
        surface.Color=site.model=="ghostskull" and Color3.fromRGB(190,235,205) or Color3.fromRGB(137,212,237)
        surface.Transparency=math.max(surface.Transparency,.38)
      end
    end
  end
  model:SetAttribute("MeadowToyMaterial","PLASTIC_UNTIL_APPROVED_STUD_NORMAL_MAP")
  model:SetAttribute("Species",r15Look and "human" or partId)
  if site.model then model:SetAttribute("Variant",site.model) end
  local oilClass=meadowOil.classOf[site.model or ""] or (not site.model and meadowOil.kindClass[partId]) or nil
  if oilClass then model:SetAttribute("Weakness",meadowOil.names[oilClass]) end
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
  local r15Tracks=nil
  if partId=="bandit" or r15Look then
    local humanoid=model:FindFirstChildOfClass("Humanoid")
    if humanoid then
      humanoid.DisplayDistanceType=Enum.HumanoidDisplayDistanceType.None
      humanoid.HealthDisplayType=Enum.HumanoidHealthDisplayType.AlwaysOff
      local animator=humanoid:FindFirstChildOfClass("Animator") or Instance.new("Animator")
      animator.Parent=humanoid
      r15Tracks={}
      for name,assetId in pairs(MEADOW_R15_ANIMS) do
        local anim=Instance.new("Animation")
        anim.AnimationId="rbxassetid://"..assetId
        local okTrack,track=pcall(function()return animator:LoadAnimation(anim) end)
        anim:Destroy()
        if okTrack and track then
          local action=name=="slash" or name=="lunge"
          track.Looped=not action
          track.Priority=action and Enum.AnimationPriority.Action or Enum.AnimationPriority.Movement
          r15Tracks[name]=track
        end
      end
      banditIdle=r15Tracks.idle;banditWalk=r15Tracks.walk
      if banditIdle then banditIdle:Play(.2) end
    end
  end
  -- [신화 변이] 원본 크리처 모델은 그대로 두고 색 윤곽·광원·입자·크기 비율로 신화 괴물처럼 보이게 한다(추가 파츠 없음).
  if site.myth then
    pcall(function()
      local c=site.myth.color or Color3.fromRGB(180,120,255)
      local hl=Instance.new("Highlight");hl.FillColor=c;hl.OutlineColor=c:Lerp(Color3.new(1,1,1),.35)
      hl.FillTransparency=site.myth.fill or .72;hl.OutlineTransparency=.15;hl.DepthMode=Enum.HighlightDepthMode.Occluded;hl.Parent=model
      local anchor=model.PrimaryPart or model:FindFirstChildWhichIsA("BasePart",true)
      if anchor then
        local light=Instance.new("PointLight");light.Color=c;light.Range=site.myth.range or 16;light.Brightness=1.6;light.Parent=anchor
        local fx=Instance.new("ParticleEmitter");fx.Color=ColorSequence.new(c);fx.Rate=site.myth.rate or 12;fx.Lifetime=NumberRange.new(1.2,2.2)
        fx.Speed=NumberRange.new(1,3);fx.SpreadAngle=Vector2.new(180,180);fx.LightEmission=.8
        fx.Size=NumberSequence.new({NumberSequenceKeypoint.new(0,.5),NumberSequenceKeypoint.new(1,0)});fx.Parent=anchor
      end
      if site.myth.stretch then model:ScaleTo(model:GetScale()*site.myth.stretch) end
    end)
  end
  table.insert(enemies,{
    model=model,HP=hitPoints,maxHP=hitPoints,
    isBoss=isBoss,isAlpha=isAlpha,kind=partId,variant=site.model,style=site.style or mobStyleByModel[site.model or ''],oilClass=oilClass,poiGuard=site.poiGuard,bonusBoss=site.bonusBoss,zoneTag=site.zoneTag,named=site.named,lord=site.lord,questBoss=site.questBoss,contractNo=site.contractIndex,contractIndex=site.contractIndex,dungeon=site.dungeon,siteDrops=site.drops,questIndex=site.questIndex,bountyIndex=site.bountyIndex,
    banditIdle=banditIdle,banditWalk=banditWalk,r15Tracks=r15Tracks,
    damage=isAlpha and math.floor(13*(site.dmg or 1)) or math.floor(((isBoss and 20 or 6)+math.floor(site.tier/2))*(site.dmg or 1)),
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
      -- [스튜디오 전용 점검 스위치] CI 캡처에서 인간형 몹을 확인하려고 워크스페이스 속성이 켜졌을 때만
      -- 인간형 변종 지점 최대 3곳을 거리와 상관없이 스폰한다. 실서버(Studio 아님)에서는 동작하지 않는다.
      if not nearby and RunService:IsStudio() and workspace:GetAttribute("StudioForceHumanMobs")==true
        and site.model and meadowR15Looks[site.model] and (workspace:GetAttribute("StudioForcedHumanMobs") or 0)<3 then
        nearby=true
        workspace:SetAttribute("StudioForcedHumanMobs",(workspace:GetAttribute("StudioForcedHumanMobs") or 0)+1)
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
-- [지속 스킬 전투 상태] 세션 한정 약한 키. 기존 저장/보상/몬스터 체력을 변경하지 않는다.
local meadowTreeCombat=setmetatable({},{__mode="k"})
local meadowFocusUntil={}
local meadowDefense={}
local function liveMeadowCharacter(player)
  local character=player.Character
  local human=character and character:FindFirstChildOfClass("Humanoid")
  local rootPart=character and character:FindFirstChild("HumanoidRootPart")
  if not human or human.Health<=0 or not rootPart then return nil,nil,nil end
  return character,human,rootPart
end
-- [아드레날린] 오디세이식 궁극기 게이지(0~100, 저장 안 함). 명중·피격으로 차고 비전투 6초 뒤 서서히 줄어든다.
local ultimateRunning={}
local function addAdrenaline(player,amount)
  if ultimateRunning[player] then return end
  local now=os.clock()
  player:SetAttribute("MeadowAdrenalineAt",now)
  player:SetAttribute("MeadowAdrenaline",math.clamp(math.floor((tonumber(player:GetAttribute("MeadowAdrenaline")) or 0)+amount),0,100))
end
task.spawn(function()
  while true do
    task.wait(1)
    local now=os.clock()
    for _,member in ipairs(Players:GetPlayers()) do
      local value=tonumber(member:GetAttribute("MeadowAdrenaline")) or 0
      if value>0 and now-(tonumber(member:GetAttribute("MeadowAdrenalineAt")) or 0)>6 then
        member:SetAttribute("MeadowAdrenaline",math.max(0,value-2))
      end
    end
  end
end)
-- [상태이상] 출혈·독·화염은 지속 피해, 빙결은 짧은 정지. 서로 다른 상태가 겹칠수록 받는 피해가 늘어나는 연계 보너스가 있다.
local STATUS_NAMES={bleed="출혈",poison="독",burn="화염",frost="빙결"}
local applyMeadowDamageRef
-- 장비 효과·상태이상 규칙은 공용 모듈(RobloxCommonCombatStatus)이 계산하고, 장비 목록·피해 적용은 이 서버가 맡는다.
local CombatStatus=require(Shared:WaitForChild("RobloxCommonCombatStatus"))
meadowOil.gearFx=function(player)
  local ids={}
  for _,slot in ipairs({"Weapon","Shield","Chest","Hands","Legs","Feet","Accessory","Cape"}) do
    local item=meadowRpg.equippedSlot(player,slot)
    if item then ids[#ids+1]=item.Id end
  end
  return CombatStatus.SumEffects(Config.GearEffects,ids)
end
local function applyStatus(player,target,kind)
  CombatStatus.ApplyStatus(target,kind,{
    now=os.clock(),spawn=task.spawn,wait=task.wait,names=STATUS_NAMES,
    tickBase=function() return 16+meadowProficiencyPower(player)+readNumber(player,"WeaponTier",0)*8 end,
    dealTick=function(victim,tick) applyMeadowDamageRef(player,victim,tick,true) end,
  })
end
local function statusCount(target)
  return CombatStatus.CountActive(target,os.clock())
end
-- [사망 모션] 인간형은 뒤로 넘어지고, 네발 몹은 옆으로 쓰러지며, 날개 몹은 추락한다. 잠시 누워 있다가 서서히 사라진다.
-- 원본 모델을 PivotTo/Transparency만 바꾸며 가짜 시체 파츠를 만들지 않는다. 피해·보상은 기존 로직 그대로.
local function meadowDeathFall(model,enemy)
  if enemy.r15Tracks then
    for _,t in pairs(enemy.r15Tracks) do pcall(function() t:Stop(.08) end) end
  end
  local origin=model:GetPivot()
  local human=enemy.r15Tracks~=nil
  local aerial=enemy.kind=="bee" or enemy.kind=="bat" or enemy.kind=="ghost"
  local away=enemy.hitDir or Vector3.new(-origin.LookVector.X,0,-origin.LookVector.Z)
  if away.Magnitude<.01 then away=Vector3.new(0,0,1) end
  away=away.Unit
  local ext=model:GetExtentsSize().Y
  local parts={}
  for _,d in ipairs(model:GetDescendants()) do
    if d:IsA("BasePart") then parts[#parts+1]={d,d.Transparency} end
  end
  local fall=human and .5 or .38
  local hold=human and 1.1 or .3
  local fade=.5
  task.spawn(function()
    local t0=os.clock()
    while model.Parent do
      local e=os.clock()-t0
      if e>=fall+hold+fade then break end
      local a=math.min(1,e/fall)
      local k=1-(1-a)*(1-a)
      local rot,drop,push
      if aerial then
        rot=CFrame.Angles(0,0,1.2*k);drop=math.min(1.8,ext*1.2)*k;push=.6*k
      elseif human then
        -- 뒤로 넘어짐: 앞쪽이 위로 들리며 등으로 눕는다.
        rot=CFrame.Angles(1.5*k,0,0);drop=ext*.42*k;push=1.4*k
      else
        rot=CFrame.Angles(0,0,-1.45*k);drop=ext*.3*k;push=.9*k
      end
      local pos=origin.Position+away*push-Vector3.new(0,drop,0)
      model:PivotTo(CFrame.new(pos)*origin.Rotation*rot)
      if e>fall+hold then
        local f=math.clamp((e-fall-hold)/fade,0,1)
        for _,row in ipairs(parts) do
          if row[1].Parent then row[1].Transparency=row[2]+(1-row[2])*f end
        end
      end
      RunService.Heartbeat:Wait()
    end
    if model.Parent then model:Destroy() end
  end)
end

local function applyMeadowDamage(player,target,damage,isDot)
  if not target or target.HP<=0 or not target.model.Parent then return false end
  if not isDot then addAdrenaline(player,3) end
  do
    local fb=foodBuff[player]
    if fb and fb.atk and fb.untilT>os.clock() then damage=math.floor(damage*(1+fb.atk)) end
  end
  player:SetAttribute("MeadowCombatUntil",workspace:GetServerTimeNow()+8)
  if (meadowFocusUntil[player] or 0)>os.clock() then damage=math.floor(damage*1.25) end
  do
    local relics=readNumber(player,"RelicMask",0)
    local n=0
    while relics>0 do n+=relics%2;relics=relics//2 end
    if n>0 then damage=math.floor(damage*(1+.05*n)) end
  end
  if target.oilClass and player:GetAttribute("MeadowOilClass")==target.oilClass then
    local charges=player:GetAttribute("MeadowOilCharges") or 0
    if charges>0 then
      damage=math.floor(damage*1.5)
      player:SetAttribute("MeadowOilCharges",charges-1)
      if charges-1<=0 then player:SetAttribute("MeadowOilClass",nil) end
    end
  end
  -- [지속 효과] 배운 노드에 한해서만 명중·거리·장비·주문 연계가 발동한다.
  local now=os.clock()
  local state=meadowTreeCombat[player] or {}
  meadowTreeCombat[player]=state
  local passive=meadowRpg.passiveLevel
  local sameTarget=state.lastTarget==target and now-(state.lastHitAt or -100)<1.8
  if sameTarget and passive(player,"W_GAUGE")>0 then
    player:SetAttribute("MeadowStamina",math.min(100,readNumber(player,"MeadowStamina",0)+2*passive(player,"W_GAUGE")))
  end
  if now-(state.lastHeavyAt or -100)<2 and passive(player,"W_TIMING")>0 then
    damage=math.floor(damage*(1+.045*passive(player,"W_TIMING")))
  end
  if readNumber(player,"MeadowComboStage",0)>=2 and passive(player,"W_COMBO")>0 then
    damage=math.floor(damage*(1+.035*passive(player,"W_COMBO")))
  end
  local weapon=readNumber(player,"MeadowEquipWeapon",0)
  if state.lastWeapon~=nil and weapon~=state.lastWeapon and passive(player,"W_SWITCH")>0 then
    damage=math.floor(damage*(1+.07*passive(player,"W_SWITCH")))
  end
  state.lastWeapon=weapon
  if (player:GetAttribute("MeadowParryConfirmed") or 0)>workspace:GetServerTimeNow()-2
    and passive(player,"G_PARRY")>0 then
    damage=math.floor(damage*(1+.09*passive(player,"G_PARRY")))
  end
  if state.currentSchool=="Hunter" then
    local character=player.Character
    local root=character and character:FindFirstChild("HumanoidRootPart")
    local distance=root and (target.position-root.Position).Magnitude or 0
    if passive(player,"H_RANGE")>0 then
      damage=math.floor(damage*(1+(distance>18 and .07 or .03)*passive(player,"H_RANGE")))
    end
    if root and root.AssemblyLinearVelocity.Magnitude>7 and passive(player,"H_MOVE")>0 then
      damage=math.floor(damage*(1+.06*passive(player,"H_MOVE")))
    end
    if target.meadowMarkOwner==player.UserId and (target.meadowMarkUntil or 0)>now then
      if passive(player,"H_TRACK")>0 then damage=math.floor(damage*(1+.065*passive(player,"H_TRACK"))) end
      if sameTarget and passive(player,"H_WEAK")>0 then
        damage=math.floor(damage*(1+.075*passive(player,"H_WEAK")))
      end
    end
    if (target.stunUntil or 0)>now and passive(player,"H_TRAP")>0 then
      damage=math.floor(damage*(1+.055*passive(player,"H_TRAP")))
    end
  elseif state.currentSchool=="Shadow" then
    local root=player.Character and player.Character:FindFirstChild("HumanoidRootPart")
    local facing=target.visualFacing
    local behind=root and facing and (root.Position-target.position).Magnitude>1
      and (root.Position-target.position).Unit:Dot(facing)<-.4
    if behind and passive(player,"S_BACK")>0 then
      damage=math.floor(damage*(1+.09*passive(player,"S_BACK")))
    end
    local defend=meadowDefense[player] or {}
    if (defend.dodgeUntil or 0)>now and passive(player,"S_DODGE")>0 then
      damage=math.floor(damage*(1+.08*passive(player,"S_DODGE")))
    end
    if (target.stunUntil or 0)>now and passive(player,"S_CONFUSE")>0 then
      damage=math.floor(damage*(1+.06*passive(player,"S_CONFUSE")))
    end
  elseif state.currentSchool=="Magic" then
    if state.lastSpell and state.lastSpell~=state.currentSkill
      and now-(state.lastSpellAt or -100)<3 and passive(player,"M_CHAIN")>0 then
      damage=math.floor(damage*(1+.065*passive(player,"M_CHAIN")))
    end
    if now-(state.lastWeaponAttackAt or -100)<2.5 and passive(player,"M_WEAVE")>0 then
      damage=math.floor(damage*(1+.07*passive(player,"M_WEAVE")))
    end
  else
    if state.currentSchool==nil then state.lastWeaponAttackAt=now end
  end
  state.lastTarget=target;state.lastHitAt=now
  -- [상태이상 연계] 서로 다른 상태 1개당 +8%(최대 3개). 지속 피해 틱은 연계·부여를 하지 않는다.
  if not isDot then
    local stacks=math.min(3,statusCount(target))
    if stacks>0 then damage=math.floor(damage*(1+.08*stacks)) end
    local weaponItemNow=meadowRpg.equippedWeapon(player)
    local cls=weaponItemNow and Config.GearWeaponClass[weaponItemNow.Id]
    local school=state.currentSchool
    local kind=(school=="Shadow" and "bleed") or (school=="Hunter" and "poison") or (school=="Magic" and "frost")
      or (school==nil and ((cls=="Dagger" and "bleed") or (cls=="Bow" and "poison") or (cls=="Staff" and "frost"))) or nil
    if kind and math.random()<.3 then applyStatus(player,target,kind,6) end
    -- [각인] 장착한 룬이 명중마다 25% 확률로 해당 상태를 건다.
    local rune=readNumber(player,"MeadowRune",0)
    local runeKind=({"burn","poison","frost","bleed"})[rune]
    if runeKind and math.random()<.25 then applyStatus(player,target,runeKind,runeKind=="burn" and 5 or 6) end
  end
  -- [장비 공격력] 기존 무기 강화·숙련도·기술 배율은 그대로 두고 새 장비 보너스만 가산.
  local gearAttack=meadowRpg.stats(player)
  damage=damage+gearAttack
  -- [장비 특수 효과] 치명타는 피해에, 상태이상·기절·흡수는 명중 뒤에 적용한다(지속 피해 틱 제외).
  local gfx=nil
  local critHit=false
  if not isDot then
    gfx=meadowOil.gearFx(player)
    if CombatStatus.RollCrit(gfx) then damage=math.floor(damage*CombatStatus.CAPS.critMultiplier);critHit=true end
  end
  player:SetAttribute("ApprovedActionTarget",target.position)
  target.HP=math.max(0,target.HP-damage)
  target.model:SetAttribute("EnemyHealth",target.HP)
  -- [피격 반응] 맞은 방향으로 몸이 젖혀지고 뒤로 밀린다. 치명타·강타는 더 크게, 보스는 거의 안 밀린다.
  if not isDot and target.model and target.model.Parent then
    local pRoot=player.Character and player.Character:FindFirstChild("HumanoidRootPart")
    local away=pRoot and Vector3.new(target.position.X-pRoot.Position.X,0,target.position.Z-pRoot.Position.Z) or Vector3.zero
    if away.Magnitude>.05 then
      away=away.Unit
      target.hitDir=away
      local heavy=critHit or damage>=target.maxHP*.15
      local weight=target.isBoss and .15 or target.isAlpha and .45 or 1
      target.hitAt=os.clock()
      target.hitPower=(heavy and 1 or .55)*weight
      local dist=(heavy and 3.4 or 1.7)*weight
      if target.HP>0 and dist>.2 then
        local startPos=target.position
        task.spawn(function()
          local t0=os.clock()
          while true do
            local a=math.min(1,(os.clock()-t0)/.2)
            if target.HP<=0 or not target.model.Parent then break end
            target.position=startPos+away*dist*(1-(1-a)*(1-a))
            if a>=1 then break end
            RunService.Heartbeat:Wait()
          end
        end)
      end
    end
  end
  local hitFx=gfx and CombatStatus.RollHitEffects(gfx,{
    targetDead=target.HP<=0,isBoss=target.isBoss,stunReady=(target.stunUntil or 0)<=now})
  if hitFx then
    for _,kind in ipairs(hitFx.statuses) do applyStatus(player,target,kind) end
    if hitFx.stun then target.stunUntil=now+CombatStatus.CAPS.stunSeconds end
  end
  if hitFx and hitFx.leechRatio>0 then
    local _,hum=liveMeadowCharacter(player)
    if hum then
      hum.Health=math.min(hum.MaxHealth,hum.Health+math.max(1,math.floor(damage*hitFx.leechRatio)))
      setNumber(player,"Health",math.max(0,math.floor(hum.Health)))
    end
  end
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
    crit=critHit,
    status=target.model:GetAttribute("MeadowStatus"),
    model=target.model,
    named=target.named==true,
  })
  setNumber(player,"Combo",readNumber(player,"Combo",0)+1)
  setNumber(player,"Score",readNumber(player,"Score",0)+damage)
  player:SetAttribute("LastApprovedScope","combat-impact")
  if target.HP<=0 then
    local bonus=meadowRpg.passiveLevel(player,"W_CHASE")*4
    if target.meadowMarkOwner==player.UserId and (target.meadowMarkUntil or 0)>now then
      bonus+=meadowRpg.passiveLevel(player,"S_MARK_KILL")*6
    end
    if bonus>0 then player:SetAttribute("MeadowStamina",math.min(100,readNumber(player,"MeadowStamina",0)+bonus)) end
    target.model:SetAttribute("NativeMobMotion","DEATH")
    target.model:SetAttribute("AttackState","DEATH")
    remote:FireAllClients("MEADOW_MOB_DEATH",{
      species=target.kind,
      pattern=target.model:GetAttribute("AttackPattern"),
      position=target.position,boss=target.isBoss or target.isAlpha,
    })
    -- Only the original mesh is rotated/faded. No surrogate corpse or Part.
    meadowDeathFall(target.model,target)
    for i=#enemies,1,-1 do if enemies[i]==target then table.remove(enemies,i);break end end
    awardProgress(player,target.isBoss and 75 or target.isAlpha and 35 or 12,
      target.isBoss and 45 or target.isAlpha and 18 or 5)
    -- [몬스터 잡템] 처치한 몬스터가 가죽·마력 결정을 떨군다. 제작·강화·물약에 쓴다.
    do
      local function drop(field,chance,amount)
        if math.random()<chance then setNumber(player,field,readNumber(player,field,0)+(amount or 1)) end
      end
      local kind=target.kind
      if target.variant then kind="variant" end -- 변종은 siteDrops만 쓴다.
      drop("Hide",kind=="wolf" and .8 or kind=="bandit" and .5 or .15,target.isAlpha and 3 or 1)
      drop("Fang",kind=="wolf" and .35 or .05,target.isAlpha and 2 or 1)
      -- [스카이림식 가죽 손질] 사냥 숙련이 오를수록 짐승에게서 가죽을 한 장 더 벗겨낸다(최대 50%).
      if (kind=="wolf" or kind=="bandit") and math.random()<math.min(.5,readNumber(player,"HuntingProficiency",0)*.01) then
        setNumber(player,"Hide",readNumber(player,"Hide",0)+1)
      end
      drop("Meat",kind=="wolf" and .55 or kind=="bandit" and .3 or kind=="boar" and .6 or .06,target.isAlpha and 2 or 1)
      drop("BatWing",kind=="bat" and .7 or 0)
      drop("Claw",kind=="wolf" and .6 or 0,target.isAlpha and 2 or 1)
      drop("Ectoplasm",kind=="ghost" and .6 or 0)
      drop("Crystal",(kind=="ghost" or kind=="bat") and .3 or .08,target.isBoss and 4 or 1)
      drop("Magma",target.isBoss and 1 or 0.03,target.isBoss and 3 or 1)
      for _,entry in ipairs(target.siteDrops or {}) do drop(entry[1],entry[2],entry[3]) end
      if meadowOil.questKill then pcall(meadowOil.questKill,player,target) end
      if meadowOil.bountyKill then pcall(meadowOil.bountyKill,player,target) end
      if meadowOil.odysseyKill then pcall(meadowOil.odysseyKill,player,target) end
      if target.contractIndex then
        local flag=bit32.lshift(1,target.contractIndex-1)
        if bit32.band(readNumber(player,"ContractAccepted",0),flag)~=0 then
          setNumber(player,"ContractDone",bit32.bor(readNumber(player,"ContractDone",0),flag))
          player:SetAttribute("MeadowGearMessage","계약 표적 처치! 게시판에서 보상을 받아라.")
          player:SetAttribute("MeadowGearRevision",(player:GetAttribute("MeadowGearRevision") or 0)+1)
        end
      end
    end
    -- [사냥 숙련도] 실제 서버에서 처치가 확정된 늑대·박쥐만 기록한다.
    -- 살아 있는 사슴·토끼 관찰은 사냥으로 인정하지 않으며 도감·드랍 변경 없음.
    -- [몬스터 도감] 서버가 확정한 처치만 기록한다.
    if target.kind=="wolf" and not target.variant then setNumber(player,"DexKillWolf",readNumber(player,"DexKillWolf",0)+1) end
    if target.kind=="bat" then setNumber(player,"DexKillBat",readNumber(player,"DexKillBat",0)+1) end
    if target.isAlpha then setNumber(player,"DexKillAlpha",readNumber(player,"DexKillAlpha",0)+1) end
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
    -- [현상금] 단서 2곳을 모두 조사한 뒤 처치해야 의뢰가 완료로 인정된다.
    if target.bountyIndex and readNumber(player,"BountyIndex",1)==target.bountyIndex
      and readNumber(player,"BountyPhase",0)==1 then
      if readNumber(player,"BountyClues",0)>=3 then
        setNumber(player,"BountyPhase",2)
        pcall(function() villageDialogue(player,"현상금 완료","목표를 처치했어. 의뢰판으로 돌아가 보상 방식을 선택해.") end)
      else
        pcall(function() villageDialogue(player,"현상금","단서 2곳을 먼저 조사해야 이 처치가 의뢰로 인정돼.") end)
      end
    end
    setNumber(player,"EnemyHealth",0)
    if target.isBoss or target.isAlpha then
      setNumber(player,"Bosses",readNumber(player,"Bosses",0)+1)
      -- [골렘 삭제 후 연구 퀘스트] 마을 밖 우두머리 늑대 처치로 6단계를 이어간다.
      -- 기존 QuestStage/QuestProgress/보상 수치는 유지한다.
      if target.isAlpha and not target.bonusBoss then recordMeadowQuest(player,"BOSS_KILL") end
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
applyMeadowDamageRef=applyMeadowDamage

local function attackEnemy(player)
  local character=player.Character
  local human=character and character:FindFirstChildOfClass("Humanoid")
  local rootPart=character and character:FindFirstChild("HumanoidRootPart")
  if not human or human.Health<=0 or not rootPart then return false end
  local now=os.clock()
  if now<(attackCooldown[player] or 0) then return false end
  attackCooldown[player]=now+.42
  -- [활] 활을 장착하면 사거리 45의 원거리 사격: 연사는 느리지만 거리에 비례해 치명타(최대 +90%)가 터진다.
  local weapon=meadowRpg.equippedWeapon(player)
  local isBow=weapon and weapon.Bow==true
  if isBow then attackCooldown[player]=now+(weapon.Id=="wind_bow" and .5 or .66) end
  local target=nearestEnemy(rootPart,isBow and 45 or 25)
  -- 유효한 공격 입력은 허공에서도 동작한다. 명중·피해·보상은 분리한다.
  if not target then
    player:SetAttribute("ApprovedActionTarget",rootPart.Position)
    return true,false
  end
  local weaponTier=readNumber(player,"WeaponTier",0)
  local damage=math.floor(16+meadowProficiencyPower(player)+weaponTier*8)
  -- [연타 단계] 검술을 찍은 만큼만 연타가 깊어진다: 점수 0~1=1단, 2=2단 … 5=5단.
  -- 1단은 단순 타격, 5단은 주변 적까지 베는 화려한 마무리.
  local rank=math.clamp(readNumber(player,"MeadowTalentMartial",0),0,5)
  local cap=1+math.floor(rank*.8)
  local chain=comboChain[player]
  local stage=(chain and now-chain.at<=1.3) and (chain.stage%cap+1) or 1
  if stage>cap then stage=1 end
  comboChain[player]={stage=stage,at=now}
  player:SetAttribute("MeadowComboStage",stage)
  player:SetAttribute("MeadowComboMax",cap)
  local mult=({1,1.1,1.25,1.45,2.1})[stage]
  if isBow then
    local distance=(target.position-rootPart.Position).Magnitude
    local crit=math.clamp((distance-8)/37,0,1)*.9 -- 멀수록 급소 명중
    local marksman=math.min(.45,readNumber(player,"HuntingProficiency",0)*.008)
    local shot=math.floor(damage*1.15*(1+crit)*(1+marksman))
    remote:FireAllClients("MEADOW_BOW_SHOT",{from=rootPart.Position+Vector3.new(0,1.6,0),to=target.position+Vector3.new(0,1.6,0),weak=crit>.55})
    return applyMeadowDamage(player,target,shot),true
  end
  local hit=applyMeadowDamage(player,target,math.floor(damage*mult))
  if stage>=5 then
    for _,other in ipairs(enemies) do
      if other~=target and other.HP>0 and other.model.Parent
        and (other.position-rootPart.Position).Magnitude<=11 then
        applyMeadowDamage(player,other,math.floor(damage*mult*.6))
      end
    end
  end
  return hit,true
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
  if tier>=6 and smithLevelOf(player)<5 then
    player:SetAttribute("MeadowGearMessage","+7 이상은 대장 Lv5 '명인 단련'부터 가능해.")
    player:SetAttribute("MeadowGearRevision",(player:GetAttribute("MeadowGearRevision") or 0)+1)
    return false
  end
  if not nearStation(player,"Grindstone") then
    player:SetAttribute("MeadowGearMessage","마을 대장간의 숫돌 가까이에서 단련할 수 있어.")
    player:SetAttribute("MeadowGearRevision",(player:GetAttribute("MeadowGearRevision") or 0)+1)
    return false
  end
  -- [스카이림식 단련] 주괴(+3·6·9강마다 무두질 가죽)로 무기를 갈고 다듬는다. 제작 숙련이 높을수록 재료가 줄어든다.
  local ingotCost,leatherCost=Config.TemperCost(tier,readNumber(player,"SmithXp",0))
  if readNumber(player,"Ingot",0)<ingotCost or readNumber(player,"Leather",0)<leatherCost then return false end
  setNumber(player,"Ingot",readNumber(player,"Ingot",0)-ingotCost)
  if leatherCost>0 then setNumber(player,"Leather",readNumber(player,"Leather",0)-leatherCost) end
  setNumber(player,"WeaponTier",tier+1)
  addSmithXp(player,4+tier)
  if meadowOil.questEvent then meadowOil.questEvent(player,"TEMPER") end
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
  -- [발견 반응] 처음 추격을 시작할 때 잠깐 몸을 세워 플레이어를 알아챈 듯 보이게 한다.
  if state=="CHASE" and (enemy.attackState=="IDLE" or enemy.attackState=="PATROL" or enemy.attackState=="RETURN_TO_SPAWN") then
    enemy.alertAt=os.clock()
  end
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
  if enemy.r15Tracks and enemy.banditIdle and enemy.banditWalk then
    local tr=enemy.r15Tracks
    -- 추격은 달리기, 순찰/복귀는 걷기. 걸음 속도에 맞춰 재생 속도를 조절한다.
    local moveTrack=(enemy.attackState=="CHASE" and tr.run) or enemy.banditWalk
    if inMotion then
      if enemy.banditIdle.IsPlaying then enemy.banditIdle:Stop(.18) end
      for _,t in ipairs({tr.walk,tr.run}) do
        if t and t~=moveTrack and t.IsPlaying then t:Stop(.18) end
      end
      if not moveTrack.IsPlaying then moveTrack:Play(.18) end
      moveTrack:AdjustSpeed(math.clamp((enemy.strideSpeed or 6)/(moveTrack==tr.run and 12 or 7.5),.55,1.5))
    else
      for _,t in ipairs({tr.walk,tr.run}) do
        if t and t.IsPlaying then t:Stop(.18) end
      end
      if not enemy.banditIdle.IsPlaying then enemy.banditIdle:Play(.18) end
    end
    -- 공격 예고(ANTICIPATION) 진입 순간 베기/찌르기 애니를 1회 재생한다.
    if attacking and enemy.r15AttackMark~=enemy.attackStateStartedAt then
      enemy.r15AttackMark=enemy.attackStateStartedAt
      local pat=tostring(enemy.attackPattern or "")
      local act=(pat:find("BASH") or pat:find("SHOT") or pat:find("VOLLEY") or pat:find("FEINT") or pat:find("STAB")) and tr.lunge or tr.slash
      act=act or tr.slash or tr.lunge
      if act then act:Play(.06);act:AdjustSpeed(.9) end
    end
  end
  -- [걸음 주기] 걷는 속도에 맞춰 보폭 위상을 쌓는다. 멈추면 위아래 흔들림도 같이 멈춘다.
  local visual=enemy.visualPosition or enemy.position
  local lastVisual=enemy.lastStrideVisual or visual
  local travelled=Vector3.new(visual.X-lastVisual.X,0,visual.Z-lastVisual.Z).Magnitude
  enemy.lastStrideVisual=visual
  enemy.strideSpeed=(enemy.strideSpeed or 0)+(math.min(travelled/(1/30),40)-(enemy.strideSpeed or 0))*.25
  if not aerial and inMotion then
    local cadence=kind=="golem" and .5 or heavy and .85 or 1.15
    enemy.stridePhase=(enemy.stridePhase or 0)+travelled*cadence
    local amount=math.clamp(enemy.strideSpeed/6,0,1)
    movingHeight=math.abs(math.sin(enemy.stridePhase))*(kind=="golem" and .14 or .05)*amount
    stridePitch=math.sin(enemy.stridePhase)*(kind=="wolf" and .03 or heavy and .02 or .045)*amount
  end
  -- [지면 높이 보간] 0.15초마다 샘플한 목표 높이를 매 프레임 부드럽게 따라간다.
  if enemy.terrainGroundTarget then
    enemy.terrainGroundOffset=(enemy.terrainGroundOffset or enemy.terrainGroundTarget)
      +(enemy.terrainGroundTarget-(enemy.terrainGroundOffset or enemy.terrainGroundTarget))*.35
  end
  -- [경사 기울기] 오르막은 코를 들고 내리막은 숙인다(날개 몹 제외, 최대 약 17도).
  local slopeTarget=0
  local normal=enemy.groundNormal
  if normal and not aerial then
    local flat=Vector3.new(facing.X,0,facing.Z)
    if flat.Magnitude>.01 then
      slopeTarget=math.clamp(math.asin(math.clamp(-normal:Dot(flat.Unit),-1,1)),-.3,.3)
    end
  end
  enemy.slopePitch=(enemy.slopePitch or 0)+(slopeTarget-(enemy.slopePitch or 0))*.2
  attackPitch+=enemy.slopePitch
  -- [피격 젖힘] 맞은 직후 몸이 뒤로 젖혔다가 빠르게 돌아온다.
  local sinceHit=now-(enemy.hitAt or -9)
  if sinceHit<.7 and not aerial then
    attackPitch+=.42*(enemy.hitPower or .5)*math.exp(-sinceHit*7)
  end
  -- [발견 반응] 추격 시작 직후 0.45초 동안 상체를 번쩍 든다.
  local sinceAlert=now-(enemy.alertAt or -9)
  if sinceAlert<.45 and not aerial then
    attackPitch+=.22*math.sin(math.clamp(sinceAlert/.45,0,1)*math.pi)
  end
  -- [상태이상 반응] 빙결은 굳고, 화염은 허둥대고, 독은 비틀거리며, 출혈은 맥박처럼 움찔거린다.
  local st=enemy.status or {}
  local frozen=(st.frost or 0)>now
  local burning=(st.burn or 0)>now
  local poisoned=(st.poison or 0)>now
  local bleeding=(st.bleed or 0)>now
  local statusYaw=0
  if burning then
    bank+=math.sin(now*26)*.1;statusYaw=math.sin(now*19)*.16
    attackPitch+=math.sin(now*13)*.05
  elseif poisoned then
    bank+=math.sin(now*3.2)*.13;statusYaw=math.sin(now*2.1)*.1
    attackPitch+=.06
  elseif bleeding then
    attackPitch+=math.max(0,math.sin(now*6.28))^6*.1
  end
  if frozen then bank=0;statusYaw=0 end
  -- 상태 윤곽선(공식 Highlight 인스턴스 하나만 재사용).
  local tint=enemy.model:FindFirstChild("StatusTint")
  local wantColor=frozen and Color3.fromRGB(140,205,255) or burning and Color3.fromRGB(255,110,40)
    or poisoned and Color3.fromRGB(110,200,70) or bleeding and Color3.fromRGB(190,40,50) or nil
  if wantColor then
    if not tint then
      tint=Instance.new("Highlight");tint.Name="StatusTint";tint.FillTransparency=.78
      tint.OutlineTransparency=.35;tint.DepthMode=Enum.HighlightDepthMode.Occluded;tint.Parent=enemy.model
    end
    tint.FillColor=wantColor;tint.OutlineColor=wantColor;tint.Enabled=true
  elseif tint then tint.Enabled=false end
  -- 인간형 애니메이션: 빙결이면 정지, 화염이면 빠르게, 독이면 느리게.
  if enemy.r15Tracks then
    local speed=frozen and 0 or burning and 1.6 or poisoned and .6 or nil
    for _,t in pairs(enemy.r15Tracks) do
      if t.IsPlaying then
        if speed then t:AdjustSpeed(speed) elseif enemy.r15StatusSpeed then t:AdjustSpeed(1) end
      end
    end
    enemy.r15StatusSpeed=speed~=nil
  end
  -- [기본 공격 몸놀림] 근접 몹은 예고 때 몸을 웅크려 뒤로 빼고, 타격 순간 앞으로 튀어나갔다가 돌아온다(늑대·멧돼지는 도약).
  local lungeOffset=Vector3.zero
  if not aerial and not enemy.isBoss and enemy.variant~="roguehooded" and enemy.variant~="adventurer" then
    local flatFace=Vector3.new(facing.X,0,facing.Z)
    if flatFace.Magnitude>.01 then
      flatFace=flatFace.Unit
      local reach=kind=="boar" and 2.8 or kind=="wolf" and 2.4 or enemy.r15Tracks and 1.1 or 1.5
      if attacking then
        local dur=math.max(.12,enemy.model:GetAttribute("NativeMobMotionDuration") or .5)
        local prep=math.clamp((now-(enemy.attackStateStartedAt or now))/dur,0,1)
        lungeOffset=-flatFace*(.55*prep)
        movingHeight-=.12*prep
      elseif recoil>.02 then
        lungeOffset=flatFace*(reach*recoil)
        if kind=="wolf" or kind=="boar" then movingHeight+=math.sin(math.clamp(recoil,0,1)*math.pi)*.35 end
      end
    end
  end
  local pivot=(enemy.visualPosition or enemy.position)+lungeOffset
    +Vector3.new(0,(enemy.visibleGroundOffset or 0)
      +(enemy.terrainGroundOffset or 0)+movingHeight,0)
  enemy.model:PivotTo(CFrame.lookAt(pivot,pivot+facing)
    *CFrame.Angles(0,(enemy.model:GetAttribute("NativeMobFacingYaw") or 0)+statusYaw,0)
    *CFrame.Angles(attackPitch+stridePitch+idleBreath,0,bank))
end

-- [인간형 몹 전투 스타일] 모델 종류에 따라 무기 쓰는 방식이 다르다. 총 피해량은 기존 1회 피해와 같고 예고 시간·범위·모양만 다르다.
local meadowRangedVariants={roguehooded=true,adventurer=true}
local meadowBruteVariants={barbarian=true,knight=true,king=true,punk=true,orc=true,skullorc=true,skwarrior=true,yeti=true,tribal=true,bull=true,cactoro=true,spiritgolem=true}
local function meadowHumanStyleOf(enemy)
  local variant=enemy.model and enemy.model:GetAttribute("Variant")
  if meadowRangedVariants[variant] then return "ranged" end
  if meadowBruteVariants[variant] then return "brute" end
  return nil
end
local function chooseMeadowMobSkill(enemy)
  enemy.attackSerial+=1
  -- 수문장 후반부는 충격파 연타를 사용하되 원래 총 피해·체력·보상은 보존한다.
  local second=((enemy.isBoss or enemy.isAlpha) and enemy.HP<=enemy.maxHP*.5)
    or enemy.attackSerial%2==0
  local pattern=enemy.isBoss and (second and "GOLEM_SHOCKWAVE" or "GOLEM_SLAM")
    or enemy.named and second and enemy.HP<=enemy.maxHP*.6 and "GOLEM_SHOCKWAVE"
    or enemy.style=="mage" and (second and "ARCANE_NOVA" or "ARCANE_BOLT")
    or enemy.style=="rogue" and (second and "BANDIT_FEINT" or "BANDIT_SLASH")
    or meadowHumanStyleOf(enemy)=="ranged" and (second and "CROSSBOW_VOLLEY" or "CROSSBOW_SHOT")
    or meadowHumanStyleOf(enemy)=="brute" and (({"BRUTE_OVERHEAD","BRUTE_SWEEP","BRUTE_BASH"})[enemy.attackSerial%3+1])
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
  player:SetAttribute("MeadowCombatUntil",workspace:GetServerTimeNow()+8)
  local defense=meadowDefense[player] or {}
  local now=os.clock()
  if (defense.dodgeUntil or 0)>now then return end
  local gearFx=meadowOil.gearFx(player)
  if CombatStatus.DefendRoll(gearFx).dodged then
    remote:FireClient(player,"MEADOW_REACTION","DODGE")
    return
  end
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
    local refunded=meadowRpg.passiveLevel(player,"G_REFUND")*6
    if refunded>0 then
      player:SetAttribute("MeadowStamina",math.min(100,readNumber(player,"MeadowStamina",0)+refunded))
    end
    player:SetAttribute("MeadowParryConfirmed",workspace:GetServerTimeNow())
    remote:FireClient(player,"MEADOW_REACTION","PARRY")
    return
  end
  -- [자동 회피] 기존 Level 능력치를 기준으로만 계산하며 저장 구조는 유지한다.
  -- 4초 간격, 현재 방어 중이 아닐 때 좌/우 실제 공간이 비어 있는 경우만 발동한다.
  if (defense.guardUntil or 0)<=now and now>=(defense.nextAutoDodgeAt or 0) then
    local chance=math.clamp(.06+(meadowProficiencyPower(player)/2.2)*.007,.067,.28)
    -- [기동 숙련] 새로운 투자 단계에만 회피 확률 보너스 적용. 기본 확률은 보존.
    chance=math.clamp(chance+math.clamp(readNumber(player,"MeadowTalentAgility",0),0,5)*.015,.067,.325)
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
  if (defense.guardUntil or 0)>now then
    -- [서버 확인된 막기] 기존 50% 경감 판정은 그대로 두고 실제 접촉 때만 시각 신호를 보낸다.
    -- 연타를 맞아도 사운드·입자가 폭증하지 않게 0.12초 간격으로 1회만 알린다.
    -- [방패 장비] 한손 무기(검·도끼)+방패 자세 습득 시 막기 경감 50%→60%(방패 외형과 같은 조건).
    local shieldW=meadowRpg.equippedWeapon(player)
    local shieldCls=shieldW and shieldW.Id and Config.GearWeaponClass[shieldW.Id]
    local shielded=meadowRpg.equippedShield(player)~=nil or ((shieldCls=="Sword" or shieldCls=="Axe") and meadowRpg.nodeRank(player,19)>0)
    damage=math.ceil(damage*.5)
    if shielded then damage=math.max(1,math.ceil(damage*.8)) end
    if now-(defense.lastBlockContactFXAt or -100) >=.12 then
      defense.lastBlockContactFXAt=now
      meadowDefense[player]=defense
      remote:FireClient(player,"MEADOW_REACTION","BLOCK")
    end
  end
  addAdrenaline(player,2)
  do
    local fb=foodBuff[player]
    if fb and fb.def and fb.untilT>os.clock() then damage=math.max(1,math.floor(damage*(1-fb.def))) end
  end
  -- [지속 방호] 정면 막기·포위 대응·일회성 위기 보호.
  local guardRank=meadowRpg.passiveLevel(player,"G_FRONT")
  if (defense.guardUntil or 0)>now and guardRank>0 then
    damage=math.max(1,math.floor(damage*(1-.065*guardRank)))
  end
  if (defense.guardUntil or 0)>now and meadowRpg.passiveLevel(player,"G_STAGGER")>0 then
    damage=math.max(1,math.floor(damage*(1-.03*meadowRpg.passiveLevel(player,"G_STAGGER"))))
  end
  local root=player.Character and player.Character:FindFirstChild("HumanoidRootPart")
  if root and meadowRpg.passiveLevel(player,"W_POISE")>0 then
    local nearby=0
    for _,enemy in ipairs(enemies) do
      if enemy.HP>0 and (enemy.position-root.Position).Magnitude<12 then nearby+=1 end
      if nearby>=3 then break end
    end
    if nearby>=3 then damage=math.max(1,math.floor(damage*(1-.05*meadowRpg.passiveLevel(player,"W_POISE")))) end
  end
  local crisis=meadowRpg.passiveLevel(player,"G_CRISIS")
  local state=meadowTreeCombat[player] or {}
  if crisis>0 and humanoid.Health<=humanoid.MaxHealth*.35 and now>=(state.nextCrisisAt or 0) then
    state.nextCrisisAt=now+45
    meadowTreeCombat[player]=state
    damage=math.max(1,math.floor(damage*(1-.22-.07*crisis)))
  end
  -- [갑옷 피해 경감] 완벽 방어·회피 판정 이후 실제 착용 장비와 방호 숙련만 적용.
  local _,armor=meadowRpg.stats(player)
  damage=math.max(1,damage-armor)
  if (gearFx.dr or 0)>0 then damage=math.max(1,math.floor(damage*CombatStatus.DamageMultiplier(gearFx))) end
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
            local deerFlee=animal.model:GetAttribute("MeadowWildlife")=="deer"
            escape=offset.Unit*math.min(deerFlee and 18 or 9,(14-closest)*(deerFlee and 1.7 or .85))
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
      -- [사슴 도약] 도망칠 땐 갤럽에 맞춰 위로 뛰어오르며 달린다(표시용 이동, 판정 없음).
      if animalMode=="RUN" then
        desired+=Vector3.new(0,math.abs(math.sin(now*7.5))*1.1,0)
      elseif animal.model:GetAttribute("MeadowWildlife")=="rabbit" and animalMode=="WALK" then
        -- [토끼 깡총] 걸을 때도 통통 튀며 이동한다(표시용).
        desired+=Vector3.new(0,math.abs(math.sin(now*6.2+animal.phase))*.55,0)
      end
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
        if hit then
          -- [지면 추종] 목표 높이·경사만 기록하고, 실제 모델 높이는 렌더 단계에서 부드럽게 따라간다(튀는 현상 방지).
          enemy.terrainGroundTarget=hit.Position.Y-(enemy.spawnGroundY or hit.Position.Y)
          enemy.groundNormal=hit.Normal
          if enemy.terrainGroundOffset==nil or enemy.terrainGroundOffset==0 then enemy.terrainGroundOffset=enemy.terrainGroundTarget end
        end
        enemy.nextGroundSample=now+.15
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
          and not ((enemy.kind=="wolf" or enemy.questIndex==2)
            and meadowVillageContains(rootPart.Position)) then
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
          or enemy.style=="mage" and 14
          or meadowHumanStyleOf(enemy)=="ranged" and 12
          or (enemy.isBoss and 5.2 or enemy.isAlpha and 5.0 or 4.4)
        -- [공통 전방 주시] 공격 예고 중에는 실제 목표 방향을 바라보되 판정은 기존 서버 규칙으로만 한다.
        if distance>.05 and (enemy.windupUntil or distance<=attackRange) then
          enemy.visualFacing=offset.Unit
        end
        if enemy.windupUntil then
          -- 공격 예고 중 대상이 사라지거나 거리를 벌렸다면 피해 없이 취소한다.
          local activeRange=enemy.attackPattern=="GOLEM_SHOCKWAVE" and 8.4
            or enemy.attackPattern=="WOLF_LUNGE" and 6.5
            or (enemy.attackPattern=="CROSSBOW_SHOT" or enemy.attackPattern=="CROSSBOW_VOLLEY") and 13
            or enemy.attackPattern=="BRUTE_SWEEP" and 6.2
            or enemy.attackPattern=="GOLEM_SHOCKWAVE" and 8.4 or attackRange
          if targetPlayer.UserId~=enemy.windupTargetUserId or distance>activeRange+1 or targetHuman.Health<=0 then
            cancelEnemyWindup(enemy)
          elseif now>=enemy.windupUntil then
            local hitIndex=enemy.comboHit or 1
            local hitCount=enemy.model:GetAttribute("NativeMobSkillActive")==true and 3 or 1
            if enemy.attackPattern=="CROSSBOW_VOLLEY" then hitCount=2 elseif enemy.attackPattern=="BRUTE_OVERHEAD" or enemy.attackPattern=="BRUTE_BASH" or enemy.attackPattern=="CROSSBOW_SHOT" or enemy.attackPattern=="BRUTE_SWEEP" then hitCount=1 end
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
            elseif enemy.attackPattern=="BRUTE_SWEEP" then
              -- 큰 무기 휩쓸기: 몹 앞 5.6스터드 안의 플레이어를 한 번씩 맞춘다.
              for _,victim in ipairs(Players:GetPlayers()) do
                local avatar=victim.Character
                local root=avatar and avatar:FindFirstChild("HumanoidRootPart")
                local human=avatar and avatar:FindFirstChildOfClass("Humanoid")
                if root and human and (root.Position-enemy.position).Magnitude<=5.6 then
                  applyMeadowMobHit(victim,human,hitDamage,enemy)
                  if (enemy.stunUntil or 0)>now then break end
                end
              end
            elseif enemy.attackPattern=="ARCANE_NOVA" then
              -- 마법 폭발: 대상 주변 6스터드 안의 플레이어를 한 번씩 맞춘다.
              for _,victim in ipairs(Players:GetPlayers()) do
                local avatar=victim.Character
                local root=avatar and avatar:FindFirstChild("HumanoidRootPart")
                local human=avatar and avatar:FindFirstChildOfClass("Humanoid")
                if root and human and (root.Position-targetRoot.Position).Magnitude<=6 then
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
            local arcane=enemy.style=="mage" and (enemy.attackPattern=="ARCANE_BOLT" or enemy.attackPattern=="ARCANE_NOVA")
            remote:FireAllClients("MEADOW_MOB_ATTACK",{
              species=enemy.kind,pattern=enemy.attackPattern,
              position=arcane and (targetRoot.Position-enemy.visualFacing*1.0) or enemy.position,
              facing=enemy.visualFacing,target=targetRoot.Position,
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
            pattern=="BRUTE_OVERHEAD" and .72 or pattern=="BRUTE_SWEEP" and .5 or pattern=="BRUTE_BASH" and .38
            or pattern=="CROSSBOW_SHOT" and .6 or pattern=="CROSSBOW_VOLLEY" and .45 or
            ((pattern=="WOLF_LUNGE" or pattern=="BOAR_CHARGE" or pattern=="ARCANE_BOLT" or pattern=="ARCANE_NOVA") and .55
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
    -- [성능] 어떤 플레이어에게서도 260스터드(스트리밍 반경 밖) 넘게 먼 몹·동물은 시각 보간·뼈 애니메이션을 건너뛴다.
    -- AI·판정 위치(position)는 그대로 갱신되므로 가까워지면 곧바로 따라잡는다.
    local focus={}
    for _,member in ipairs(Players:GetPlayers()) do
      local root=member.Character and member.Character:FindFirstChild("HumanoidRootPart")
      if root then focus[#focus+1]=root.Position end
    end
    local function nearPlayer(pos)
      if #focus==0 then return true end
      for _,f in ipairs(focus) do
        local dx,dz=pos.X-f.X,pos.Z-f.Z
        if dx*dx+dz*dz<=67600 then return true end
      end
      return false
    end
    -- [야생동물 렌더] 기존 AI 속도는 그대로, 원본 메시만 30Hz 보간한다.
    for _,animal in ipairs(meadowWildlife) do
      if animal.model.Parent and animal.position and nearPlayer(animal.position) then
        animal.visualPosition=(animal.visualPosition or animal.origin):Lerp(animal.position,alpha)
        local facing=animal.visualFacing or Vector3.new(0,0,-1)
        local smooth=(animal.visualFacingSmooth or facing):Lerp(facing,alpha)
        if smooth.Magnitude>.01 then animal.visualFacingSmooth=smooth.Unit end
        local forward=animal.visualFacingSmooth or facing
        -- [사슴 원본 뼈대 전방] 저작 모델의 머리-몸 축을 기준으로 정상 직립을 유지한다.
        local facing=CFrame.lookAt(animal.visualPosition,animal.visualPosition+forward)
        if animal.model:GetAttribute("MeadowWildlife")=="deer" then
          -- [사슴 직립 유지] GLB 고유 축을 매 렌더 이동에도 동일하게 적용한다.
          local correction=animal.model:GetAttribute("NativeDeerFacingCorrection")
          facing*=typeof(correction)=="CFrame" and correction
            or CFrame.Angles(0,animal.model:GetAttribute("NativeMobFacingYaw") or 0,0)
        end
        animal.model:PivotTo(facing)
      end
    end
    for _,enemy in ipairs(enemies) do
      if enemy.HP>0 and enemy.model.Parent and nearPlayer(enemy.position) then
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

-- [5단 회피] 1.8초 안에 이어 누르면 슬립→페인트→크로스→위빙→배후 도약 순서로 진행한다.
-- 단계 사이 재사용은 .55초, 5단까지 쓰거나 연결이 끊기면 기존 회피 재사용 시간으로 새 연쇄를 막는다.
local meadowDodgeChain=setmetatable({},{__mode="k"})
local meadowSkillSeconds={
  ["skill-meadow-heavy"]=5,["skill-meadow-sweep"]=9,["skill-meadow-bolt"]=7,
  ["skill-meadow-guard"]=9,["skill-meadow-parry"]=7,
  ["skill-meadow-dodge-left"]=4,["skill-meadow-dodge-right"]=4,
  ["skill-meadow-sprint"]=8,["skill-meadow-heal"]=16,
  ["skill-meadow-focus"]=13,["skill-meadow-emote"]=3,["skill-meadow-oath"]=90,["skill-meadow-ultimate"]=2,
}
local function meadowSkill(player,id,execute)
  local interval=meadowSkillSeconds[id]
  if not interval then return false end
  -- [회피 5단] 점수 5개를 채우면 회피 재사용 대기 4초 → 3초.
  if (id=="skill-meadow-dodge-left" or id=="skill-meadow-dodge-right")
    and readNumber(player,"MeadowTalentAgility",0)>=5 then interval=3 end
  local cooldowns=meadowSkillCooldown[player] or {}
  local now=os.clock()
  -- [회피 공용 쿨다운] 버튼 하나가 좌/우 어느 방향을 선택해도 4초를 공유한다.
  -- 기존 두 기술 ID·서버 이동·무적·간격은 그대로 두고 방향 교체 연속 사용만 막는다.
  local isDodge=id=="skill-meadow-dodge-left" or id=="skill-meadow-dodge-right"
  local dodgeLeft="skill-meadow-dodge-left"
  local dodgeRight="skill-meadow-dodge-right"
  local nextReady=cooldowns[id] or 0
  if isDodge then
    nextReady=math.max(nextReady,cooldowns[dodgeLeft] or 0,cooldowns[dodgeRight] or 0)
  end
  local chain=isDodge and meadowDodgeChain[player] or nil
  local pendingStage=1
  -- [회피 점수] 회피에 찍은 점수만큼 이어 쓸 수 있는 단계가 열린다(0점은 1단 기본 회피).
  local maxStage=math.clamp(math.floor(readNumber(player,"MeadowTalentAgility",0)),1,5)
  if isDodge then
    if chain and now<chain.window and chain.stage<maxStage then
      nextReady=chain.shortReady;pendingStage=chain.stage+1
    elseif chain then
      nextReady=chain.nextChainAt
    else
      nextReady=0
    end
  end
  if now<nextReady then return false end
  local character,humanoid,root=liveMeadowCharacter(player)
  if not character then return false end
  player:SetAttribute("ApprovedActionTarget",root.Position)
  if isDodge then
    chain=chain or {stage=0,window=0,shortReady=0,nextChainAt=0}
    chain.pending=pendingStage
    meadowDodgeChain[player]=chain
  end
  local accepted=execute(character,humanoid,root,now)
  if accepted~=true then return false end
  local nextCooldown=now+interval
  local readyAt=workspace:GetServerTimeNow()+interval
  if isDodge then
    chain.stage=pendingStage
    if pendingStage==1 or pendingStage>=maxStage then chain.nextChainAt=now+interval end
    if pendingStage>=maxStage then
      chain.window=0
      readyAt=workspace:GetServerTimeNow()+interval
    else
      chain.window=now+1.8;chain.shortReady=now+.55
      readyAt=workspace:GetServerTimeNow()+.55
      local token=pendingStage
      task.delay(1.85,function()
        local latest=meadowDodgeChain[player]
        if latest and latest.stage==token and os.clock()>=latest.window and os.clock()<latest.nextChainAt then
          local readyLater=workspace:GetServerTimeNow()+(latest.nextChainAt-os.clock())
          player:SetAttribute("MeadowReady_skill-meadow-dodge-left",readyLater)
          player:SetAttribute("MeadowReady_skill-meadow-dodge-right",readyLater)
        end
      end)
    end
    player:SetAttribute("MeadowDodgeStage",pendingStage)
    player:SetAttribute("MeadowDodgeWindow",pendingStage>=maxStage and 0 or workspace:GetServerTimeNow()+1.8)
  end
  cooldowns[id]=nextCooldown
  if isDodge then
    cooldowns[dodgeLeft]=nextCooldown
    cooldowns[dodgeRight]=nextCooldown
  end
  meadowSkillCooldown[player]=cooldowns
  -- [모바일 쿨다운 일치] 서버에서 승인된 회피만 양방향 남은 시간에 함께 반영한다.
  if isDodge then
    player:SetAttribute("MeadowReady_"..dodgeLeft,readyAt)
    player:SetAttribute("MeadowReady_"..dodgeRight,readyAt)
  else
    player:SetAttribute("MeadowReady_"..id,readyAt)
  end
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
        (enemy.position-root.Position).Magnitude<=(readNumber(player,"MeadowTalentMartial",0)>=3 and 12 or 10)
        and #targets<(readNumber(player,"MeadowTalentMartial",0)>=3 and 8 or 5) then
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
    local enemy=nearestEnemy(root,readNumber(player,"MeadowTalentSigns",0)>=3 and 40 or 32)
    if not enemy then return false end
    local ray=RaycastParams.new()
    ray.FilterType=Enum.RaycastFilterType.Exclude
    ray.FilterDescendantsInstances={character,enemy.model}
    local delta=enemy.position-(root.Position+Vector3.new(0,2,0))
    local wall=workspace:Raycast(root.Position+Vector3.new(0,2,0),delta,ray)
    if wall and wall.Distance<delta.Magnitude-2 then return false end
    local damage=math.floor(12+meadowProficiencyPower(player)*1.8/2.2
      +readNumber(player,"WeaponTier",0)*4)
      +2*math.clamp(readNumber(player,"MeadowTalentSigns",0),0,3)
    return applyMeadowDamage(player,enemy,damage)
  end)
end
local function meadowGuard(player)
  return meadowSkill(player,"skill-meadow-guard",function(_,_,root,now)
    local defense=meadowDefense[player] or {}
    defense.guardUntil=now+2.8
    defense.perfectGuardUntil=now+.28
    -- [방호 3단계] 방어 자세 3.6초·완벽 방어 0.36초.
    if readNumber(player,"MeadowTalentDefense",0)>=3 then
      defense.guardUntil+=.8
      defense.perfectGuardUntil+=.08
    end
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
    -- [5단 이동] 1 슬립(측면) · 2 페인트(반대 측면) · 3 크로스(앞 대각) · 4 위빙(뒤 대각) · 5 적 배후 도약.
    local chainState=meadowDodgeChain[player]
    local stage=chainState and chainState.pending or 1
    character:SetAttribute("MeadowDodgeStage",stage)
    local moveDir,moveDist,moveTime,hopBase=side,7,.26,.28
    local behind=false
    if stage==2 then moveDir=-side
    elseif stage==3 then moveDir=(side*.8+facing*.6).Unit;moveDist=6
    elseif stage==4 then moveDir=(-side*.8-facing*.6).Unit;moveDist=6
    elseif stage>=5 then
      if target then
        local toTarget=Vector3.new(target.position.X-root.Position.X,0,target.position.Z-root.Position.Z)
        if toTarget.Magnitude>.5 then
          moveDir=toTarget.Unit;moveDist=math.min(24,toTarget.Magnitude+5)
          moveTime=.42;hopBase=3;behind=true
        end
      end
      if not behind then moveDist=9 end
    end
    local ray=RaycastParams.new()
    ray.FilterType=Enum.RaycastFilterType.Exclude
    ray.FilterDescendantsInstances=behind and {character,target.model} or {character}
    local start=root.Position+Vector3.new(0,1.5,0)
    ray.RespectCanCollide=true
    local wall=workspace:Raycast(start,moveDir*moveDist,ray)
    local distance=wall and math.max(0,wall.Distance-2) or moveDist
    if distance<2 then return false end
    -- [회피 안전] 낭떠러지·물·급경사에 착지하지 않는다. 최대 7스터드 범위는 유지.
    local floorRay=RaycastParams.new()
    floorRay.FilterType=Enum.RaycastFilterType.Include
    floorRay.FilterDescendantsInstances={meadowTerrain}
    local landing=root.Position+moveDir*distance
    local floor=workspace:Raycast(landing+Vector3.new(0,8,0),
      Vector3.new(0,-18,0),floorRay)
    local terrainGround=root.Position.Y-root.Size.Y*.5
    if not floor or floor.Material==Enum.Material.Water
      or floor.Normal.Y<.65 or math.abs(floor.Position.Y-terrainGround)>4 then return false end
    -- [서버 승인 회피] 7스터드 거리·.48초 무적·4초 재사용을 유지하고 옆 점프 이동만 .26초로 한다.
    local dodgeOrigin=character:GetPivot()
    local dodgeFacing=CFrame.lookAt(dodgeOrigin.Position,dodgeOrigin.Position+facing)
    local dodgeOffset=moveDir*distance
    -- [실제 측면 도약] 낮은 천장·높은 장애물이 있으면 점프 높이만 제거한다.
    -- 기존 측면 안전 검사, 7스터드 거리와 서버 무적 판정은 변경하지 않는다.
    local overhead=workspace:Raycast(start,Vector3.new(0,.9,0),ray)
    local elevatedWall=workspace:Raycast(start+Vector3.new(0,.62,0),moveDir*distance,ray)
    -- [지면 밀착 회피] 무적·이동 거리·쿨다운은 그대로 두고 시각적 도약 높이만 낮춘다.
    local hopHeight=(not overhead and not elevatedWall) and hopBase or 0
    local defense=meadowDefense[player] or {}
    defense.dodgeUntil=now+(behind and .7 or .48)
    -- 회피 점수 1개당 무적 +.03초.
    defense.dodgeUntil+=.03*math.clamp(readNumber(player,"MeadowTalentAgility",0),0,5)
    meadowDefense[player]=defense
    player:SetAttribute("ApprovedActionTarget",root.Position)
    local oldAutoRotate=humanoid.AutoRotate
    humanoid.AutoRotate=false
    task.spawn(function()
      local movementStarted=os.clock()
      while character.Parent and player.Character==character
        and root:IsDescendantOf(character) and humanoid.Health>0 do
        local t=math.clamp((os.clock()-movementStarted)/moveTime,0,1)
        -- [회피: 15도 숙인 빠른 측면 도약] 출발 시 순간적인 몸통 방향 점프를 막는다.
        -- 처음 약 .06초만 적을 향해 회전하고 이후 적을 보는 방향을 고정한다.
        local eased=.5-.5*math.cos(math.pi*t)
        local turn=math.clamp(t/.24,0,1)
        turn=turn*turn*(3-2*turn)
        local gaze=dodgeOrigin:Lerp(dodgeFacing,turn)
        if behind then
          -- [배후 도약] 적을 지나친 뒤 몸을 돌려 적의 등 뒤에서 다시 마주 본다.
          local back=CFrame.lookAt(dodgeOrigin.Position,dodgeOrigin.Position-facing)
          local spin=math.clamp((t-.5)/.4,0,1)
          gaze=gaze:Lerp(back,spin*spin*(3-2*spin))
        end
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
-- [각성기 · 기사단의 맹세] 기사단 연대기를 2편 이상 모으면 해금. 체력 35% 회복 + 18칸 안 적 최대 12마리에 3배 피해.
local function meadowOath(player)
  if readNumber(player,"ResearchRecords",0)<2 or readNumber(player,"MeadowStamina",100)<70 then return false end
  local activated=meadowSkill(player,"skill-meadow-oath",function(_,humanoid,root)
    humanoid.Health=math.min(humanoid.MaxHealth,humanoid.Health+humanoid.MaxHealth*.35)
    setNumber(player,"Health",math.floor(humanoid.Health))
    local damage=math.floor((16+meadowProficiencyPower(player)+readNumber(player,"WeaponTier",0)*8)*3)
    local struck=0
    player:SetAttribute("ApprovedActionTarget",root.Position)
    for _,enemy in ipairs(enemies) do
      if struck<12 and enemy.HP>0 and enemy.model.Parent and (enemy.position-root.Position).Magnitude<=18 then
        struck+=1
        applyMeadowDamage(player,enemy,damage)
      end
    end
    player:SetAttribute("ApprovedActionTarget",root.Position)
    return true
  end)
  if activated then player:SetAttribute("MeadowStamina",math.max(0,readNumber(player,"MeadowStamina",0)-70)) end
  return activated
end
-- [궁극기] 아드레날린 100에서 발동. 장착한 무기 클래스마다 효과가 다르다. 피해는 기존 applyMeadowDamage를 그대로 쓴다.
local function meadowUltimate(player)
  if (tonumber(player:GetAttribute("MeadowAdrenaline")) or 0)<100 then return false end
  local weaponItem=meadowRpg.equippedWeapon(player)
  local cls=(weaponItem and Config.GearWeaponClass[weaponItem.Id]) or "Sword"
  local activated=meadowSkill(player,"skill-meadow-ultimate",function(_,humanoid,root)
    local base=(16+meadowProficiencyPower(player)+readNumber(player,"WeaponTier",0)*8)*3
    player:SetAttribute("MeadowAdrenaline",0)
    ultimateRunning[player]=true
    local function inRange(r,limit)
      local list={}
      for _,enemy in ipairs(enemies) do
        if #list<limit and enemy.HP>0 and enemy.model.Parent and (enemy.position-root.Position).Magnitude<=r then list[#list+1]=enemy end
      end
      return list
    end
    local function hitAll(list,scale)
      for _,enemy in ipairs(list) do applyMeadowDamage(player,enemy,math.floor(base*scale)) end
    end
    local function stun(list,seconds)
      local now=os.clock()
      for _,enemy in ipairs(list) do
        if enemy.HP>0 and not enemy.isBoss then enemy.stunUntil=now+seconds end
      end
    end
    local list
    local alt=readNumber(player,"MeadowUltChoice",1)==2
    local function guardFor(seconds)
      local defense=meadowDefense[player] or {}
      defense.guardUntil=math.max(defense.guardUntil or 0,os.clock()+seconds)
      meadowDefense[player]=defense
    end
    local function sequence(target,count,gap,scale)
      if not target then return end
      for i=0,count-1 do task.delay(i*gap,function() if target.HP>0 then applyMeadowDamage(player,target,math.floor(base*scale)) end end) end
    end
    if cls=="Greatsword" then
      if alt then list=inRange(22,12);hitAll(list,.9);task.delay(.5,function() hitAll(inRange(22,12),.9) end) -- B 회전 휩쓸기
      else list=inRange(16,12);hitAll(list,1.6);stun(list,1.5) end -- A 지면 강타
    elseif cls=="Hammer" then
      if alt then -- B 철퇴 내려찍기: 단일 강타 + 주변 충격 + 4초 방어
        local target=nearestEnemy(root,18)
        if target then applyMeadowDamage(player,target,math.floor(base*3.8)) end
        hitAll(inRange(10,8),.7);guardFor(4)
      else list=inRange(18,12);hitAll(list,1.4);stun(list,1) end -- A 대지 충격
    elseif cls=="Axe" then
      if alt then -- B 도약 내려찍기
        local target=nearestEnemy(root,20)
        if target then applyMeadowDamage(player,target,math.floor(base*3.2)) hitAll(inRange(8,8),.6) end
      else list=inRange(14,12);hitAll(list,1.1);task.delay(.5,function() hitAll(inRange(14,12),1.1) end) end -- A 이중 회전
    elseif cls=="Dagger" then
      if alt then -- B 그림자 폭발: 3초 회피 + 주변 일제 타격
        local defense=meadowDefense[player] or {}
        defense.dodgeUntil=os.clock()+3;meadowDefense[player]=defense
        list=inRange(10,12);hitAll(list,1.5)
      else sequence(nearestEnemy(root,16),6,.18,.5) end -- A 6연속 암습
    elseif cls=="Bow" then
      if alt then -- B 관통 사격: 한 표적 강타 + 주변 파편
        local target=nearestEnemy(root,40)
        if target then applyMeadowDamage(player,target,math.floor(base*4.5)) end
      else list=inRange(34,6);hitAll(list,1.3) end -- A 폭우
    elseif cls=="Staff" then
      if alt then -- B 치유의 빛: 체력 40% 회복 + 약한 피해
        humanoid.Health=math.min(humanoid.MaxHealth,humanoid.Health+humanoid.MaxHealth*.4)
        setNumber(player,"Health",math.floor(humanoid.Health))
        list=inRange(22,12);hitAll(list,.6)
      else list=inRange(22,12);hitAll(list,1.5) end -- A 마력 폭발
    else
      if alt then -- B 반격 일섬: 강한 단일 일격 + 방어
        local target=nearestEnemy(root,18)
        if target then applyMeadowDamage(player,target,math.floor(base*3.5)) end
        guardFor(4)
      else sequence(nearestEnemy(root,18),5,.2,.6) end -- A 5연속 베기
      -- 방패(한손+방패 자세)면 철벽 반격: 잠시 방어 상태 + 체력 15% 회복.
      if meadowRpg.equippedShield(player)~=nil or meadowRpg.nodeRank(player,19)>0 then
        guardFor(4)
        humanoid.Health=math.min(humanoid.MaxHealth,humanoid.Health+humanoid.MaxHealth*.15)
        setNumber(player,"Health",math.floor(humanoid.Health))
      end
    end
    remote:FireAllClients("MEADOW_ULT_FX",{position=root.Position,class=cls,alt=alt,userId=player.UserId})
    task.delay(1.5,function() ultimateRunning[player]=nil end)
    return true
  end)
  return activated
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


-- [90노드 실제 발동] 기존 서버 피해·방어·쿨다운 처리 안에서만 실행한다.
for _,node in ipairs(Config.MeadowSkillNodes or {}) do
  if node.Kind=="ACTIVE" then meadowSkillSeconds[node.Id]=node.Cooldown end
end
local function meadowTreeAction(player,index,charged)
  local node=Config.MeadowSkillNodes[index]
  if not node or node.Kind~="ACTIVE" then return false end
  local rank=meadowRpg.nodeRank(player,index)
  if rank<1 or (charged and (node.Id~="mf-magic-1-1" or rank<2)) then return false end
  local discount=node.School=="Magic" and 3*meadowRpg.passiveLevel(player,"M_ACCURATE") or 0
  local cost=math.max(0,node.Gauge+(charged and 10 or 0)-discount)
  if readNumber(player,"MeadowStamina",100)<cost then return false end
  local choice=rank==3 and meadowRpg.nodeChoice(player,index) or "A"
  local mode=node.Mode
  local state=meadowTreeCombat[player] or {}
  meadowTreeCombat[player]=state
  state.currentSchool=node.School
  state.currentSkill=node.Id
  local success=meadowSkill(player,node.Id,function(character,humanoid,root,now)
    local weaponItem=meadowRpg.equippedWeapon(player)
    local weaponClass=Config.WeaponClasses[(weaponItem and Config.GearWeaponClass[weaponItem.Id]) or "Sword"]
    local affinity=weaponClass and weaponClass.Schools[node.School] or .9 -- 계열에 안 맞는 무기는 약간 약하다.
    local range=node.Range+(rank==3 and choice=="B" and 5 or 0)+((weaponClass and weaponClass.RangeBonus and weaponClass.RangeBonus[node.School]) or 0)
    local target=nearestEnemy(root,range)
    local base=(16+meadowProficiencyPower(player)+readNumber(player,"WeaponTier",0)*8)*affinity
    local power=math.floor(base*(node.Advanced and 2.1 or .9)*(1+.13*(rank-1))*
      (rank==3 and choice=="A" and 1.2 or 1)*(charged and 1.55 or 1))
    local radius=12+(rank==3 and choice=="B" and 4 or 0)
    if mode=="RESONATE" then radius+=3*meadowRpg.passiveLevel(player,"M_SPREAD") end
    local function strike(enemy,scale)
      if not enemy or enemy.HP<=0 or not enemy.model.Parent
        or (enemy.position-root.Position).Magnitude>range+2 then return false end
      player:SetAttribute("ApprovedActionTarget",enemy.position)
      return applyMeadowDamage(player,enemy,math.floor(power*(scale or 1)))
    end
    local function crowd(center,count,scale)
      local hits=0
      for _,enemy in ipairs(enemies) do
        if hits<count and enemy.HP>0 and enemy.model.Parent
          and (enemy.position-center).Magnitude<=radius and strike(enemy,scale) then hits+=1 end
      end
      if hits>1 and node.School=="Hunter" and meadowRpg.passiveLevel(player,"H_PIERCE")>0 then
        player:SetAttribute("MeadowStamina",math.min(100,readNumber(player,"MeadowStamina",0)
          +hits*meadowRpg.passiveLevel(player,"H_PIERCE")*2))
      end
      return hits>0
    end
    local function guard(member,seconds)
      local defense=meadowDefense[member] or {}
      defense.guardUntil=math.max(defense.guardUntil or 0,now+seconds)
      meadowDefense[member]=defense
    end
    if mode=="HEAL" or mode=="HEAL_AOE" or mode=="RALLY" or mode=="OATH" or mode=="SHIELD" then
      local affected=false
      for _,member in ipairs(Players:GetPlayers()) do
        local char=member.Character
        local hr=char and char:FindFirstChild("HumanoidRootPart")
        local h=char and char:FindFirstChildOfClass("Humanoid")
        if hr and h and h.Health>0 and
          (hr.Position-root.Position).Magnitude<=(mode=="HEAL" and .5 or 18) then
          if mode~="SHIELD" then
            local healing=(node.Advanced and 36 or 25)+rank*3
            local overflow=math.max(0,h.Health+healing-h.MaxHealth)
            h.Health=math.min(h.MaxHealth,h.Health+healing)
            if member==player then setNumber(player,"Health",math.floor(h.Health)) end
            if overflow>0 and meadowRpg.passiveLevel(player,"M_OVERHEAL")>0 then
              guard(member,1.6+.6*meadowRpg.passiveLevel(player,"M_OVERHEAL"))
            end
          end
          if mode=="SHIELD" or mode=="OATH" or mode=="RALLY" then
            local duration=mode=="SHIELD" and 3 or 6
            guard(member,duration)
            if meadowRpg.passiveLevel(player,"M_SHIELD_REFUND")>0 then
              task.delay(duration+.05,function()
                if member.Parent==Players and ((meadowDefense[member] or {}).guardUntil or 0)<=os.clock()+.1
                  and player.Parent==Players then
                  player:SetAttribute("MeadowStamina",math.min(100,readNumber(player,"MeadowStamina",0)
                    +3*meadowRpg.passiveLevel(player,"M_SHIELD_REFUND")))
                end
              end)
            end
            if member~=player and meadowRpg.passiveLevel(player,"G_ALLY")>0 then
              player:SetAttribute("MeadowStamina",math.min(100,readNumber(player,"MeadowStamina",0)
                +2*meadowRpg.passiveLevel(player,"G_ALLY")))
            end
          end
          affected=true
        end
      end
      if mode=="HEAL" and choice=="B" and rank==3 and affected then
        for i=1,2 do task.delay(i*1.5,function()
          if humanoid.Parent and humanoid.Health>0 then humanoid.Health=math.min(humanoid.MaxHealth,humanoid.Health+10) end
        end) end
      end
      return affected
    elseif mode=="GUARD" or mode=="BULWARK" or mode=="LAST_STAND" or mode=="PARRY" then
      guard(player,mode=="BULWARK" and 8 or mode=="LAST_STAND" and 6 or 3)
      if mode=="PARRY" then
        local defense=meadowDefense[player]
        defense.parryUntil=now+.45
      end
      if mode=="LAST_STAND" then humanoid.Health=math.min(humanoid.MaxHealth,humanoid.Health+humanoid.MaxHealth*.3) end
      return true
    elseif mode=="FURY" or mode=="OVERLOAD" then
      meadowFocusUntil[player]=now+7
      return true
    elseif mode=="VANISH" or mode=="BLINK" then
      local defense=meadowDefense[player] or {}
      if mode=="VANISH" and meadowRpg.passiveLevel(player,"S_DETECT")>0 then
        player:SetAttribute("MeadowStamina",math.min(100,readNumber(player,"MeadowStamina",0)
          +2*meadowRpg.passiveLevel(player,"S_DETECT")))
      end
      defense.dodgeUntil=now+.85;meadowDefense[player]=defense
      if mode=="BLINK" then
        local forward=root.CFrame.LookVector
        local ray=RaycastParams.new();ray.FilterType=Enum.RaycastFilterType.Exclude
        ray.FilterDescendantsInstances={character};ray.RespectCanCollide=true
        if not workspace:Raycast(root.Position+Vector3.new(0,1,0),forward*6,ray) then
          local pos=root.Position+forward*6
          local floorRay=RaycastParams.new();floorRay.FilterType=Enum.RaycastFilterType.Include
          floorRay.FilterDescendantsInstances={meadowTerrain}
          local floor=workspace:Raycast(pos+Vector3.new(0,8,0),Vector3.new(0,-18,0),floorRay)
          if floor and floor.Material~=Enum.Material.Water and floor.Normal.Y>=.65 then character:PivotTo(character:GetPivot()+forward*6) end
        end
      end
      return true
    elseif mode=="MARK" then
      if not target or target.HP<=0 then return false end
      target.meadowMarkOwner=player.UserId;target.meadowMarkUntil=now+8
      target.model:SetAttribute("MeadowMarkedUntil",workspace:GetServerTimeNow()+8)
      return true
    elseif mode=="ROOT" or mode=="TRAP" or mode=="SMOKE" or mode=="SMOKE_ADV" or mode=="STUN" then
      local candidates={}
      if mode=="SMOKE" or mode=="SMOKE_ADV" then
        for _,enemy in ipairs(enemies) do
          if enemy.HP>0 and (enemy.position-root.Position).Magnitude<=radius
            and #candidates<(mode=="SMOKE_ADV" and 8 or 3) then table.insert(candidates,enemy) end
        end
      elseif target then candidates[1]=target end
      if #candidates==0 then return false end
      for _,enemy in ipairs(candidates) do
        cancelEnemyWindup(enemy)
        local duration=enemy.isBoss and .55 or (mode=="TRAP" and 2.4 or 1.4)
        enemy.stunUntil=math.max(enemy.stunUntil or 0,now+duration)
        enemy.model:SetAttribute("NativeMobStunnedUntil",workspace:GetServerTimeNow()+duration)
        setEnemyAttackState(enemy,"STUNNED")
        if mode=="STUN" then strike(enemy,1.05) end
      end
      return true
    elseif mode=="RESONATE" then
      if not target or target.meadowMarkOwner~=player.UserId or
        (target.meadowMarkUntil or 0)<now then return false end
      target.meadowMarkUntil=0
      return crowd(target.position,8,1.2)
    elseif mode=="EXECUTE" then
      return target and target.HP<=target.maxHP*.38 and strike(target,2) or false
    elseif mode=="SWEEP" or mode=="FAN" or mode=="RAIN" or mode=="SPLIT" or mode=="BURST" or mode=="NIGHT" or mode=="HUNT" then
      return crowd((mode=="SWEEP" or mode=="FAN") and root.Position or
        (target and target.position or root.Position),node.Advanced and 9 or 4,.85)
    elseif mode=="PIERCE" or mode=="CHAIN" or mode=="BOLT" and choice=="B" and rank==3 then
      return target and crowd(target.position,4,.9) or false
    elseif mode=="FOCUS_STRIKE" then
      if not target then return false end
      local hit=false
      for i=1,3 do if target.HP>0 and strike(target,.65) then hit=true end end
      return hit
    elseif mode=="DASH" then
      return strike(target,1.15)
    else
      local hit=strike(target,mode=="SNIPE" and 1.7 or 1)
      if not hit and mode=="BACKSTAB" and meadowRpg.passiveLevel(player,"S_ESCAPE")>0
        and now>=(state.nextEscapeAt or 0) then
        state.nextEscapeAt=now+8
        local defense=meadowDefense[player] or {}
        defense.dodgeUntil=math.max(defense.dodgeUntil or 0,now+.15*meadowRpg.passiveLevel(player,"S_ESCAPE"))
        meadowDefense[player]=defense
      end
      return hit
    end
  end)
  state.currentSchool=nil
  state.currentSkill=nil
  if success then
    if node.School=="Magic" then
      state.lastSpell=node.Id
      state.lastSpellAt=os.clock()
    end
    if mode=="STUN" then state.lastHeavyAt=os.clock() end
    player:SetAttribute("MeadowStamina",math.max(0,readNumber(player,"MeadowStamina",0)-cost))
  end
  return success
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
  ["skill-meadow-oath"]=meadowOath,
  ["skill-meadow-ultimate"]=meadowUltimate,
  ["skill-meadow-emote"]=meadowEmote,
}
for _,node in ipairs(Config.MeadowSkillNodes or {}) do
  if node.Kind=="ACTIVE" then
    local index=node.Index
    handlers[node.Id]=function(player,charged) return meadowTreeAction(player,index,charged) end
  end
end

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
      -- 실제 캐릭터 재생성은 최초 스폰과 동일한 bindNativeFoundationPlayer 경로만 담당한다.
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
  -- [프로필 준비 상태] 저장 데이터를 덮어쓰거나 서버 권한을 우회하지 않고 로드 오류를 표시한다.
  player:SetAttribute("MeadowProfileLoadState","LOADING")
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
      and x==x and y==y and z==z and x>=Config.WorldMap.Bounds.X0 and x<=Config.WorldMap.Bounds.X1
      and z>=Config.WorldMap.Bounds.Z0 and z<=Config.WorldMap.Bounds.Z1 and y>=-60 and y<=560 then
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
  local restored,restoreReason=pcall(function()
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
  end)
  if not restored then
    -- [저장 보호] 부분 복원 실패를 정상 프로필이라고 표시하거나 저장 가능으로 변경하지 않는다.
    persistenceAllowed[player]=false
    profileBindingStarted[player]=nil
    player:SetAttribute("SaveStatus","SAVE_FAILED")
    player:SetAttribute("MeadowProfileLoadState","FAILED")
    warn("MEADOW_PROFILE_RESTORE_FAILED: "..tostring(restoreReason))
    return
  end
  player:SetAttribute("SaveStatus", validSaved and "READY" or "SESSION_ONLY")
  local activated,activateReason=pcall(function()
    meadowRpg.publishStats(player)
    player:SetAttribute("MeadowStamina",100)
    bindSurvivalHealth(player)
  end)
  if not activated then
    -- [복원 재시도] 필수 능력치/체력 연결 실패 시 시작을 막고 서버에 재요청할 수 있게 한다.
    persistenceAllowed[player]=false
    profileBindingStarted[player]=nil
    player:SetAttribute("SaveStatus","SAVE_FAILED")
    player:SetAttribute("MeadowProfileLoadState","FAILED")
    warn("MEADOW_PROFILE_ACTIVATION_FAILED: "..tostring(activateReason))
    return
  end
  player:SetAttribute("MeadowProfileLoadState","READY")
  player:SetAttribute("ProfileReady", true)
  broadcastSurvivalState(player)
  if resumePosition then
    -- 어떤 경우에도 클라이언트 복원 대기(26초)보다 먼저 끝나도록 18초 안전장치를 둔다.
    task.delay(18,function() if player.Parent==Players then player:SetAttribute("MeadowResumeReady",true) end end)
    task.spawn(function()
      local deadline=os.clock()+10
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
        -- 먼 지역은 지형이 늦게 만들어질 수 있어 최대 6초 다시 확인한다(클라이언트 복원 대기 26초 안에 끝나야 한다).
        local hit
        local tries=0
        repeat
          hit=workspace:Raycast(Vector3.new(resumePosition.X,620,resumePosition.Z),Vector3.new(0,-900,0),ray)
          if not hit then task.wait(1);tries+=1 end
        until hit or tries>=6 or player.Parent~=Players or player.Character~=character
        if hit and hit.Position.Y>=-58 and hit.Position.Y<=540 then
          root.CFrame=CFrame.new(resumePosition.X,hit.Position.Y+3.5,resumePosition.Z)
          root.AssemblyLinearVelocity=Vector3.zero
          root.AssemblyAngularVelocity=Vector3.zero
          character:SetAttribute("MeadowResumeApplied",true)
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
  if typeof(actionId)~="string" then return end
  -- [서버 프로필 재연결] 실패를 명시적으로 받은 같은 플레이어에 한해 기존 로더로 재시도한다.
  -- 미완료 로드 동시 실행/요청 폭증/세이브 초기화는 금지하며 준비 전 게임 행동은 계속 거부한다.
  if actionId=="meadow:profile:retry" then
    if player:GetAttribute("ProfileReady")==true
      or player:GetAttribute("MeadowProfileLoadState")~="FAILED"
      or profileBindingStarted[player] then return end
    local now=os.clock()
    if now-(player:GetAttribute("MeadowProfileRetryAt") or -100)<8 then return end
    player:SetAttribute("MeadowProfileRetryAt",now)
    task.defer(onSurvivalPlayerAdded,player)
    return
  end
  if player:GetAttribute("ProfileReady")~=true then return end
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
        meadowRpg.publishStats(player)
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
  -- [장비·연금술·스킬 성장] 기존 RemoteEvent, 서버 검증, 공통 동작 간격 사용.
  if string.sub(actionId,1,11)=="meadow:rpg:" then
    local now=os.clock()
    if now-(lastAction[player] or 0)<Config.RateLimitSeconds then return end
    lastAction[player]=now
    meadowRpg.transact(player,actionId)
    return
  end
  -- [마을 계약] 동일한 게임 RemoteEvent로 받되 NPC 서버 대화 세션·거리·단계를 다시 검증한다.
  local function runeNote(member,text)
    member:SetAttribute("MeadowGearMessage",text)
    member:SetAttribute("MeadowGearRevision",(member:GetAttribute("MeadowGearRevision") or 0)+1)
  end
  if actionId:match("^lm:%d+:%d$") then
    local sessions=meadowOil.lmSessions or {}
    local session=sessions[player]
    local index,choice=actionId:match("^lm:(%d+):(%d)$")
    index,choice=tonumber(index),tonumber(choice)
    if not session or session.index~=index or os.clock()>session.expires then return end
    local lm=Config.WorldMap.Landmarks[index]
    local blessing=lm and Config.LandmarkBlessing[lm.Zone]
    local flag=bit32.lshift(1,index-1)
    if not blessing or bit32.band(readNumber(player,"LandmarkClaim",0),flag)~=0 then return end
    sessions[player]=nil
    setNumber(player,"LandmarkClaim",bit32.bor(readNumber(player,"LandmarkClaim",0),flag))
    if choice==1 then
      setNumber(player,blessing[1],readNumber(player,blessing[1],0)+blessing[2])
      runeNote(player,lm.Name..": "..blessing[3].." "..blessing[2].."개를 받았다.")
    else
      setNumber(player,"Crystal",readNumber(player,"Crystal",0)+2)
      pcall(awardProgress,player,120,0)
      runeNote(player,lm.Name..": 비문을 베꼈다. 마력 수정 2개 · 경험치.")
    end
    return
  end
  if actionId:match("^cookp:%d$") then
    if os.clock()>(cookSessions[player] or 0) then return end
    if meadowOil.cookMenu then meadowOil.cookMenu(player,tonumber(actionId:sub(-1))) end
    return
  end
  if actionId:match("^cook:%d$") then
    if os.clock()>(cookSessions[player] or 0) then return end
    local station=Config.CookStation
    local root=player.Character and player.Character:FindFirstChild("HumanoidRootPart")
    local atCook=root and (Vector3.new(root.Position.X,0,root.Position.Z)-Vector3.new(station.X,0,station.Z)).Magnitude<=station.Radius+8
    if root and not atCook then
      for _,site in ipairs(Config.CraftSites or {}) do
        if (Vector3.new(root.Position.X,0,root.Position.Z)-Vector3.new(site.X,0,site.Z)).Magnitude<=station.Radius+8 then atCook=true;break end
      end
    end
    if not root or not atCook then return end
    local dish=Config.MeadowFoods[tonumber(actionId:sub(-1))]
    if not dish then return end
    local skill=readNumber(player,"CookingProficiency",0)
    if skill<dish.Need then villageDialogue(player,"식당 화덕","요리 숙련 "..dish.Need.."이 필요해. (지금 "..skill..")");return end
    for _,field in ipairs({"Meat","Mushroom","Moonbloom","RedLeaf","Coins","Magma","Fang","Hide","Crystal"}) do
      if readNumber(player,field,0)<(dish[field] or 0) then
        villageDialogue(player,"식당 화덕","재료가 모자라. "..dish.Name..": "..dish.Desc);return
      end
    end
    for _,field in ipairs({"Meat","Mushroom","Moonbloom","RedLeaf","Coins","Magma","Fang","Hide","Crystal"}) do
      if (dish[field] or 0)>0 then setNumber(player,field,readNumber(player,field,0)-dish[field]) end
    end
    setNumber(player,"CookingProficiency",skill+1)
    local character,humanoid=player.Character,player.Character:FindFirstChildOfClass("Humanoid")
    if dish.Heal and humanoid and humanoid.Health>0 then
      local ticks=math.max(1,dish.Seconds and math.min(10,dish.Seconds) or 1)
      for i=1,ticks do
        task.delay(i-1,function()
          local h=player.Character and player.Character:FindFirstChildOfClass("Humanoid")
          if h and h.Health>0 then
            h.Health=math.min(h.MaxHealth,h.Health+dish.Heal/ticks)
            setNumber(player,"Health",math.floor(h.Health))
          end
        end)
      end
    end
    if dish.Stamina then player:SetAttribute("MeadowStamina",math.min(100,readNumber(player,"MeadowStamina",0)+dish.Stamina)) end
    if dish.Adrenaline then addAdrenaline(player,dish.Adrenaline) end
    if dish.Atk or dish.Def then
      foodBuff[player]={atk=dish.Atk,def=dish.Def,untilT=os.clock()+(dish.Seconds or 300)}
      player:SetAttribute("MeadowFoodName",dish.Name)
      task.delay((dish.Seconds or 300)+1,function()
        local fb=foodBuff[player]
        if fb and fb.untilT<=os.clock() then foodBuff[player]=nil;player:SetAttribute("MeadowFoodName",nil) end
      end)
    end
    -- [요리 연출] 화덕 위에 완성된 요리 모델(등록된 CC0 음식)을 잠깐 띄운다.
    task.spawn(function()
      local dishModel=({[1]="vxMeatCooked",[2]="vxBowlSoup",[3]="vxOnion",[4]="vxPie",[5]="vxGlassWine"})[dish.Id]
      local spot=Vector3.new(station.X,6,station.Z)
      local shown=dishModel and worldAsset(dishModel,spot,1.6,3)
      if shown then
        shown.Name="Meadow_CookedDish";shown:SetAttribute("MeadowScenery",true)
        if dish.Id==5 then
          local side=worldAsset("vxFoodCorn",spot+Vector3.new(2.2,0,0),1.4,3)
          if side then task.delay(5,function() if side.Parent then side:Destroy() end end) end
        end
        task.delay(5,function() if shown.Parent then shown:Destroy() end end)
      end
    end)
    villageDialogue(player,"식당 화덕",dish.Name.."을(를) 맛있게 먹었어!\n"..dish.Desc.."\n요리 숙련 "..(skill+1))
    return
  end
  if actionId=="smith:train" or actionId=="smith:info" then
    if os.clock()>(smithSessions[player] or 0) then return end
    local root=player.Character and player.Character:FindFirstChild("HumanoidRootPart")
    if not root or (root.Position-Vector3.new(-80,root.Position.Y,-190)).Magnitude>30 then return end
    if actionId=="smith:info" then
      local lines={"【작업대】 제련로(광석→주괴, 주괴→강철) · 무두질 틀(가죽) · 모루(무기·방패 제작) · 숫돌(무기 단련). 각 작업대 가까이에서만 돼."}
      for _,perk in ipairs(Config.SmithPerks) do lines[#lines+1]="Lv"..perk.Level.." "..perk.Name..": "..perk.Desc end
      villageDialogue(player,"대장장이 브란",table.concat(lines,"\n"))
      return
    end
    local level=smithLevelOf(player)
    local cost=40*level
    if level>=5 then villageDialogue(player,"대장장이 브란","여기서 가르칠 수 있는 건 Lv5까지야. 그다음은 직접 두드려서 익혀.");return end
    if smithTrained[player]==level then villageDialogue(player,"대장장이 브란","방금 가르쳐 줬잖아. 한 번 더 두드려 보고 와.");return end
    if readNumber(player,"Coins",0)<cost then villageDialogue(player,"대장장이 브란","훈련비 "..cost.." 코인이 필요해.");return end
    setNumber(player,"Coins",readNumber(player,"Coins",0)-cost)
    smithTrained[player]=level
    addSmithXp(player,math.max(10,math.floor((Config.SmithThresholds[level+1]-readNumber(player,"SmithXp",0))*.5)))
    villageDialogue(player,"대장장이 브란","좋아, 손목 쓰는 법을 알려 줬어. 이제 대장 Lv"..smithLevelOf(player).."이야.")
    return
  end
  if actionId:match("^rune:set:%d$") then
    local pick=tonumber(actionId:sub(-1))
    if pick==0 then setNumber(player,"MeadowRune",0);runeNote(player,"각인을 지웠어.");return end
    local rune=Config.Runes[pick]
    if not rune or readNumber(player,"MeadowRune",0)==pick then return end
    if not nearStation(player,"Anvil") then runeNote(player,"각인은 마을 대장간 모루 가까이에서 할 수 있어.");return end
    if smithLevelOf(player)<3 then runeNote(player,"각인은 대장 Lv3부터 가능해. (지금 Lv"..smithLevelOf(player)..")");return end
    if readNumber(player,rune.Material,0)<rune.Amount or readNumber(player,"Coins",0)<rune.Coins then
      runeNote(player,rune.Name.." 각인: "..rune.Material.." "..rune.Amount.."개 + 코인 "..rune.Coins.." 필요해.");return
    end
    setNumber(player,rune.Material,readNumber(player,rune.Material,0)-rune.Amount)
    setNumber(player,"Coins",readNumber(player,"Coins",0)-rune.Coins)
    setNumber(player,"MeadowRune",pick)
    addSmithXp(player,8)
    runeNote(player,rune.Name.." 각인을 새겼어. "..rune.Desc);return
  end
  if actionId=="ult:set:1" or actionId=="ult:set:2" then
    setNumber(player,"MeadowUltChoice",tonumber(actionId:sub(-1)));return
  end
  if string.sub(actionId,1,5)=="shop:" then meadowGearShopAction(player,actionId);return end
  if string.sub(actionId,1,8)=="village:" then villageChoose(player,actionId);return end
  local chargedBolt=actionId=="mf-magic-1-1:charge"
  local combatActionId=chargedBolt and "mf-magic-1-1" or actionId
  local handler = handlers[combatActionId]
  if typeof(handler) ~= "function" then return end
  local now = os.clock()
  local previous = lastAction[player] or 0
  if now - previous < Config.RateLimitSeconds then return end
  lastAction[player] = now
  local actionAccepted,combatHit=handler(player,chargedBolt)
  -- [서버 권한] Actual accepted actions only. Existing R15 unarmed
  -- ApprovedCombatMotion and confirmed MEADOW_IMPACT remain untouched.
  if actionAccepted~=true then return end
  local approvedSequence=readNumber(player,"ActionSequence",0)+1
  setNumber(player,"ActionSequence",approvedSequence)
  local approved=combatActionId..":"..tostring(approvedSequence)
  local character=player.Character
  local root=character and character:FindFirstChild("HumanoidRootPart")
  local targetPos=player:GetAttribute("ApprovedActionTarget")
  if typeof(targetPos)~="Vector3" and root then targetPos=root.Position end
  player:SetAttribute("ApprovedActionMotion",approved)
  local combatAction=false
  for _,action in ipairs(Config.Actions) do
    if action.Id==combatActionId and action.Kind=="COMBAT" then
      combatAction=true
      player:SetAttribute("ApprovedCombatMotion",approved)
      break
    end
  end
  -- [맨손 기술 통합] 맨손(도구 없음)으로 근접 트리 기술을 쓰면 기존 맨손 연타·어퍼컷·발차기·팔꿈치 모션으로 재생한다.
  -- 새 모션은 만들지 않고 기존 승인 모션 ID만 매핑한다. 피해 계산은 트리 기술 그대로다.
  if not combatAction and character and not character:FindFirstChildOfClass("Tool") then
    local treeNode=Config.MeadowSkillNodeById and Config.MeadowSkillNodeById[combatActionId]
    local map={STRIKE="meadow-unarmed-uppercut",FOCUS_STRIKE="meadow-unarmed-uppercut",MULTI="meadow-unarmed-rush",
      SWEEP="meadow-unarmed-kick",DASH="meadow-unarmed-elbow",STUN="meadow-unarmed-elbow"}
    local unarmedId=treeNode and (treeNode.School=="Warrior" or treeNode.School=="Guardian" or treeNode.School=="Shadow") and map[treeNode.Mode]
    if unarmedId then player:SetAttribute("ApprovedCombatMotion",unarmedId..":"..tostring(approvedSequence)) end
  end
  -- 허공 공격은 관절 모션만 재생한다. 명중 효과·처치·점수는 만들지 않는다.
  if not combatAction or combatHit==true then
    player:SetAttribute("ApprovedActionFX",approved)
    remote:FireAllClients("MEADOW_ACTION_FX",player.UserId,combatActionId,approvedSequence,targetPos)
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
    local wb=Config.WorldMap.Bounds
    if pos.X>=wb.X0 and pos.X<=wb.X1 and pos.Z>=wb.Z0 and pos.Z<=wb.Z1 and pos.Y>=-60 and pos.Y<=560 then
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

-- [세계수 숲 · 1부 2지역] 초원 바깥(x=+1200)에 Roblox Terrain과 등록된 CC0 나무 메시로만 만든 별도 지역.
-- 메인 6장(우두머리 늑대)을 끝내 QuestStage가 7 이상일 때 마을 서쪽 입구의 상호작용으로 이동한다.
-- 새 몬스터·퀘스트 판정은 아직 없고, 지역 배경과 입구/귀환만 제공한다(7~9장은 다음 단계).
do
  local forestCenter=Vector3.new(1200,0,0)
  local function makePortal(position,label,action,color)
    local anchor=Instance.new("Attachment")
    anchor.Name="Portal_"..label;anchor.WorldPosition=position;anchor.Parent=workspace.Terrain
    local glow=Instance.new("ParticleEmitter")
    glow.Color=ColorSequence.new(color);glow.LightEmission=1;glow.Rate=26;glow.Lifetime=NumberRange.new(1.4,2.2)
    glow.Speed=NumberRange.new(1.5,4);glow.Size=NumberSequence.new({NumberSequenceKeypoint.new(0,.8),NumberSequenceKeypoint.new(1,0)})
    glow.Transparency=NumberSequence.new({NumberSequenceKeypoint.new(0,.2),NumberSequenceKeypoint.new(1,1)})
    glow.EmissionDirection=Enum.NormalId.Top;glow.SpreadAngle=Vector2.new(30,30);glow.Parent=anchor
    local light=Instance.new("PointLight")
    light.Color=color;light.Range=22;light.Brightness=2.4;light.Parent=anchor
    local prompt=Instance.new("ProximityPrompt")
    prompt.ActionText=label;prompt.ObjectText="마력의 길";prompt.HoldDuration=.6
    prompt.MaxActivationDistance=12;prompt.RequiresLineOfSight=false;prompt.Parent=anchor
    prompt.Triggered:Connect(function(player) action(player) end)
  end
  local function travel(player,target)
    local character=player.Character
    local root=character and character:FindFirstChild("HumanoidRootPart")
    if root then character:PivotTo(CFrame.new(target)) end
  end
  task.spawn(function()
    task.wait(4)
    local ok,err=pcall(function()
      local terrain=workspace.Terrain
      terrain:FillBlock(CFrame.new(forestCenter.X,-4,forestCenter.Z),Vector3.new(420,12,420),Enum.Material.LeafyGrass)
      local random=Random.new(70717)
      for _=1,70 do
        local x=forestCenter.X+random:NextNumber(-190,190)
        local z=forestCenter.Z+random:NextNumber(-190,190)
        terrain:FillBall(Vector3.new(x,-5.6,z),random:NextNumber(7,15),random:NextNumber()<.5 and Enum.Material.Mud or Enum.Material.Ground)
      end
      terrain:SetMaterialColor(Enum.Material.LeafyGrass,Color3.fromRGB(46,86,70))
      terrain:SetMaterialColor(Enum.Material.Mud,Color3.fromRGB(58,52,50))
      -- 중앙의 거대 세계수: 등록된 CC0 나무 메시를 크게 키워 사용한다.
      local giant=worldAsset("tree",forestCenter+Vector3.new(0,3,0),150)
      if giant then
        giant.Name="WorldTree_Giant";giant:SetAttribute("MeadowScenery",true)
        for _,surface in ipairs(giant:GetDescendants())do
          if surface:IsA("MeshPart") then surface.Color=surface.Color:Lerp(Color3.fromRGB(86,190,150),.28) end
        end
        local aura=Instance.new("Attachment");aura.WorldPosition=forestCenter+Vector3.new(0,6,0);aura.Parent=terrain
        local pollen=Instance.new("ParticleEmitter")
        pollen.Color=ColorSequence.new(Color3.fromRGB(150,255,205));pollen.LightEmission=1;pollen.Rate=40
        pollen.Lifetime=NumberRange.new(5,8);pollen.Speed=NumberRange.new(1,3);pollen.SpreadAngle=Vector2.new(180,180)
        pollen.Size=NumberSequence.new(.5);pollen.Transparency=NumberSequence.new({NumberSequenceKeypoint.new(0,1),NumberSequenceKeypoint.new(.2,.2),NumberSequenceKeypoint.new(1,1)})
        pollen.Parent=aura
        local glow=Instance.new("PointLight");glow.Color=Color3.fromRGB(120,255,190);glow.Range=60;glow.Brightness=1.8;glow.Parent=aura
      end
      -- 외곽 숲: 같은 CC0 나무를 다양한 크기와 청록 음영으로 배치한다.
      local placed=0
      for index=1,46 do
        local angle=random:NextNumber(0,math.pi*2)
        local radius=random:NextNumber(55,185)
        local position=forestCenter+Vector3.new(math.cos(angle)*radius,3,math.sin(angle)*radius)
        if (position-(forestCenter+Vector3.new(0,3,170))).Magnitude<24 then continue end
        local tree=worldAsset("tree",position,random:NextNumber(26,52))
        if tree then
          placed+=1
          tree.Name="WorldTreeForest_"..index;tree:SetAttribute("MeadowScenery",true)
          local tone=Color3.fromRGB(40,96,78):Lerp(Color3.fromRGB(92,150,110),random:NextNumber())
          for _,surface in ipairs(tree:GetDescendants())do
            if surface:IsA("MeshPart") and surface.Color.G>surface.Color.R then surface.Color=tone end
          end
        end
        if index%6==0 then task.wait() end
      end
      workspace:SetAttribute("WorldTreeForestReady",true)
      workspace:SetAttribute("WorldTreeForestTrees",placed)
    end)
    if not ok then warn("세계수 숲 생성 실패: "..tostring(err)) end
  end)
  -- 초원 서쪽 입구와 숲 귀환 지점.
  makePortal(Vector3.new(-120,4,-96),"세계수 숲으로 이동",function(player)
    if readNumber(player,"QuestStage",1)<7 then
      pcall(function() villageDialogue(player,"마력의 길","아직 길이 닫혀 있어. 서쪽 숲의 우두머리 늑대(메인 6장)를 쓰러뜨려.") end)
      return
    end
    if workspace:GetAttribute("WorldTreeForestReady")~=true then
      pcall(function() villageDialogue(player,"마력의 길","숲의 마력이 아직 모이는 중이야. 잠시 뒤 다시 시도해.") end)
      return
    end
    travel(player,forestCenter+Vector3.new(0,6,150))
  end,Color3.fromRGB(120,255,190))
  makePortal(forestCenter+Vector3.new(0,4,170),"초원 마을로 귀환",function(player)
    travel(player,Vector3.new(-110,6,-86))
  end,Color3.fromRGB(255,214,130))
end

-- [1부 3·4지역 + 7~12장] 화산 협곡(x=2400)과 오아시스 지하(x=3600)는 Terrain과 등록 CC0 나무·유적 메시로만 구성한다.
-- 새 몬스터 모델 확보 전까지 숲·화산·오아시스 서식지는 등록된 늑대·박쥐 메시를 임시로 쓴다(교체 예정).
do
  local forestCenter=Vector3.new(1200,0,0)
  local volcanoCenter=Vector3.new(2400,0,0)
  local oasisCenter=Vector3.new(3600,0,0)
  local function portal(position,label,color,action)
    local anchor=Instance.new("Attachment")
    anchor.Name="Portal_"..label;anchor.WorldPosition=position;anchor.Parent=workspace.Terrain
    local glow=Instance.new("ParticleEmitter")
    glow.Color=ColorSequence.new(color);glow.LightEmission=1;glow.Rate=26;glow.Lifetime=NumberRange.new(1.4,2.2)
    glow.Speed=NumberRange.new(1.5,4);glow.Size=NumberSequence.new({NumberSequenceKeypoint.new(0,.8),NumberSequenceKeypoint.new(1,0)})
    glow.Transparency=NumberSequence.new({NumberSequenceKeypoint.new(0,.2),NumberSequenceKeypoint.new(1,1)})
    glow.EmissionDirection=Enum.NormalId.Top;glow.SpreadAngle=Vector2.new(30,30);glow.Parent=anchor
    local light=Instance.new("PointLight");light.Color=color;light.Range=22;light.Brightness=2.4;light.Parent=anchor
    local prompt=Instance.new("ProximityPrompt")
    prompt.ActionText=label;prompt.ObjectText="마력의 길";prompt.HoldDuration=.6
    prompt.MaxActivationDistance=12;prompt.RequiresLineOfSight=false;prompt.Parent=anchor
    prompt.Triggered:Connect(function(player) action(player) end)
  end
  local function travel(player,target)
    local character=player.Character
    if character and character:FindFirstChild("HumanoidRootPart") then character:PivotTo(CFrame.new(target)) end
  end
  local function say(player,title,text) pcall(function() villageDialogue(player,title,text) end) end
  local function tint(model,color,amount)
    for _,surface in ipairs(model:GetDescendants())do
      if surface:IsA("MeshPart") then surface.Color=surface.Color:Lerp(color,amount) end
    end
  end
  -- 같은 ProximityPrompt를 중복 보상 없이 쓰는 조사 지점(세션 마스크 + 서버 단계 확인).
  local function clueSite(position,title,stage,eventName,attribute,bit,dialogue)
    local model=worldAsset("ruin",position,4.2)
    if not model then return end
    model.Name="Region_Clue_"..eventName.."_"..bit
    villagePrompt(model,title,"조사",function(player)
      if readNumber(player,"QuestStage",1)~=stage then
        say(player,title,"지금 이 단서는 필요하지 않아.");return
      end
      local mask=readNumber(player,attribute,0)
      local flag=bit32.lshift(1,bit-1)
      if bit32.band(mask,flag)~=0 then say(player,title,"이미 조사한 흔적이야.");return end
      player:SetAttribute(attribute,bit32.bor(mask,flag))
      recordMeadowQuest(player,eventName)
      say(player,title,dialogue)
    end)
  end
  local function plainSpot(position,label,color,action)
    local anchor=Instance.new("Attachment")
    anchor.WorldPosition=position;anchor.Parent=workspace.Terrain
    local glow=Instance.new("ParticleEmitter")
    glow.Color=ColorSequence.new(color);glow.LightEmission=1;glow.Rate=18;glow.Lifetime=NumberRange.new(2,3)
    glow.Speed=NumberRange.new(1,2);glow.Size=NumberSequence.new(.7);glow.Parent=anchor
    local prompt=Instance.new("ProximityPrompt")
    prompt.ActionText=label;prompt.ObjectText=label;prompt.HoldDuration=.5
    prompt.MaxActivationDistance=12;prompt.RequiresLineOfSight=false;prompt.Parent=anchor
    prompt.Triggered:Connect(function(player) action(player) end)
  end
  task.spawn(function()
    task.wait(6)
    local ok,err=pcall(function()
      local terrain=workspace.Terrain
      local random=Random.new(9137)
      -- 화산 협곡: 현무암 지면, 용암 균열, 바위 첨탑.
      terrain:FillBlock(CFrame.new(volcanoCenter.X,-4,0),Vector3.new(420,12,420),Enum.Material.Basalt)
      terrain:SetMaterialColor(Enum.Material.Basalt,Color3.fromRGB(58,50,50))
      terrain:SetMaterialColor(Enum.Material.CrackedLava,Color3.fromRGB(255,98,36))
      for _=1,26 do
        local x=volcanoCenter.X+random:NextNumber(-185,185)
        local z=volcanoCenter.Z+random:NextNumber(-185,185)
        if math.abs(x-volcanoCenter.X)<30 and z>120 then continue end
        terrain:FillBall(Vector3.new(x,-5.2,z),random:NextNumber(6,13),Enum.Material.CrackedLava)
      end
      for _=1,18 do
        local x=volcanoCenter.X+random:NextNumber(-180,180)
        local z=volcanoCenter.Z+random:NextNumber(-180,180)
        terrain:FillCylinder(CFrame.new(x,random:NextNumber(8,20),z),random:NextNumber(18,44),random:NextNumber(4,9),Enum.Material.Slate)
      end
      -- 오아시스 지하: 모래 지면, 사암 언덕, 중앙 물웅덩이.
      terrain:FillBlock(CFrame.new(oasisCenter.X,-4,0),Vector3.new(420,12,420),Enum.Material.Sand)
      terrain:SetMaterialColor(Enum.Material.Sand,Color3.fromRGB(206,178,118))
      for _=1,16 do
        local x=oasisCenter.X+random:NextNumber(-190,190)
        local z=oasisCenter.Z+random:NextNumber(-190,190)
        if (Vector2.new(x-oasisCenter.X,z-oasisCenter.Z)).Magnitude<60 then continue end
        terrain:FillBall(Vector3.new(x,-6,z),random:NextNumber(14,28),Enum.Material.Sandstone)
      end
      terrain:FillCylinder(CFrame.new(oasisCenter.X,-1.6,oasisCenter.Z),5,38,Enum.Material.Water)
      -- 식생: 같은 CC0 나무를 화산은 재가 된 검은 나무, 오아시스는 황록 나무로 낮게 배치한다.
      local function grove(center,count,minH,maxH,color,amount)
        for index=1,count do
          local angle=random:NextNumber(0,math.pi*2)
          local radius=random:NextNumber(40,180)
          local tree=worldAsset("tree",center+Vector3.new(math.cos(angle)*radius,3,math.sin(angle)*radius),random:NextNumber(minH,maxH))
          if tree then tree.Name="RegionTree_"..index;tree:SetAttribute("MeadowScenery",true);tint(tree,color,amount) end
          if index%6==0 then task.wait() end
        end
      end
      grove(volcanoCenter,14,16,30,Color3.fromRGB(38,34,34),.75)
      grove(oasisCenter,16,14,26,Color3.fromRGB(176,160,84),.45)
      -- 조사 지점 / 퀘스트.
      for index,offset in ipairs({Vector3.new(-70,3,-30),Vector3.new(20,3,-90),Vector3.new(80,3,40)}) do
        clueSite(forestCenter+offset,"렌스기사단 깃발 흔적",7,"FOREST_FLAG","ForestFlagMask",index,
          ({"찢어진 깃발. 기사단의 문장은 남았는데 이름만 정확히 도려내져 있다. 숲은 이름을 먹는다.","깃발 아래에 이전 기사단원의 이름 없는 검이 박혀 있다. 이름은 누군가 긁어냈다.","마지막 깃발이 숲 안쪽을 가리킨다. 짐승의 울음이 가까워진다."})[index])
        clueSite(volcanoCenter+offset,"렌스기사단 야영지 표식",10,"VOLCANO_MARK","VolcanoMarkMask",index,
          ({"식은 모닥불 곁에 렌스 단장의 문장이 새겨진 갑옷 조각이 있다.","군수대장 미나의 보급 표식. 비상 식량이 끝까지 정확히 나뉘어 있다.","불탄 천막 안쪽 벽에 미나의 손글씨 '서쪽 오아시스 아래'가 긁혀 있다."})[index])
      end
      plainSpot(forestCenter+Vector3.new(90,4,-60),"닉에게 말을 건다",Color3.fromRGB(255,170,120),function(player)
        local stage=readNumber(player,"QuestStage",1)
        if stage==9 then
          player:SetAttribute("PartyNick",true)
          recordMeadowQuest(player,"NICK_TALK")
          say(player,"닉","카인…? 네가 내 이름을 불렀지. 배고프고, 버려진 것 같았어. 그 두려움이 이 몸이 됐어. 이름을 계속 불러 줘. 그러면 내 안의 이놈을 누를 수 있어.")
        elseif stage<9 then say(player,"닉","…으르렁. (저주받은 짐승은 아직 사람의 말을 하지 못한다.)")
        else say(player,"닉","이제 널 따라갈게, 카인.") end
      end)
      plainSpot(oasisCenter+Vector3.new(0,4,170),"기록함 조사",Color3.fromRGB(170,220,255),function(player)
        local stage=readNumber(player,"QuestStage",1)
        if stage==12 then
          recordMeadowQuest(player,"MINA_NOTE")
          say(player,"미나의 손글씨","장부 어디에도 보급품이 줄어든 흔적이 없다. 전쟁은 끝낼 생각이 없었다. 마지막 줄: '숲은 진짜가 아니다. 미러의 탑은 하늘의 균열 너머.' 미나의 글씨다. 이야기는 2부로 이어진다.")
        elseif stage<12 then say(player,"기록함","잠겨 있다. 먼저 오아시스 지하의 몬스터를 정리해.")
        else say(player,"기록함","미나의 손글씨를 이미 확인했어.") end
      end)
      -- 서식지(임시 메시): 숲, 화산, 오아시스. 닉 보스는 숲 동쪽의 큰 늑대.
      local function addSites(center,list)
        for _,spec in ipairs(list) do
          table.insert(meadowEncounterSites,{id=spec[1],atom=spec[1]=="wolf" and "HEAD_CANINE" or "WING_LEATHER",
            tier=spec[2],height=spec[3],position=center+Vector3.new(spec[4],3,spec[5]),alpha=spec[6]})
        end
      end
      addSites(forestCenter,{{"wolf",3,3.4,-110,70},{"wolf",3,3.4,120,90},{"wolf",4,3.4,-60,-130},{"wolf",4,3.4,60,130},
        {"bat",4,3.3,140,-90},{"bat",4,3.3,-140,-40},{"wolf",5,6.8,150,-60,true}})
      addSites(volcanoCenter,{{"bat",5,3.4,-120,80},{"bat",5,3.4,110,-100},{"wolf",5,3.6,-60,-120},{"wolf",5,3.6,130,60}})
      addSites(oasisCenter,{{"bat",6,3.4,-110,60},{"bat",6,3.4,100,-90},{"wolf",6,3.6,-90,-110},{"wolf",6,3.6,120,80},{"bat",6,3.4,0,120}})
      workspace:SetAttribute("PartRegionsReady",true)
    end)
    if not ok then warn("1부 지역 생성 실패: "..tostring(err)) end
  end)
  -- 지역 사이 이동(단계 조건은 서버에서 확인).
  local function gate(position,label,color,needStage,deny,target)
    portal(position,label,color,function(player)
      if readNumber(player,"QuestStage",1)<needStage then say(player,"마력의 길",deny);return end
      if workspace:GetAttribute("PartRegionsReady")~=true then say(player,"마력의 길","이 지역의 마력이 아직 모이는 중이야. 잠시 뒤 다시 시도해.");return end
      travel(player,target)
    end)
  end
  gate(forestCenter+Vector3.new(170,4,0),"화산 협곡으로 이동",Color3.fromRGB(255,130,70),10,"닉과 함께 숲의 일을 마쳐야 해(메인 9장 이후).",volcanoCenter+Vector3.new(-170,6,0))
  gate(volcanoCenter+Vector3.new(-175,4,0),"세계수 숲으로 귀환",Color3.fromRGB(120,255,190),1,"",forestCenter+Vector3.new(160,6,0))
  gate(volcanoCenter+Vector3.new(170,4,0),"오아시스 지하로 이동",Color3.fromRGB(120,210,255),11,"야영지 표식을 모두 조사해야 해(메인 10장 이후).",oasisCenter+Vector3.new(-170,6,0))
  gate(oasisCenter+Vector3.new(-175,4,0),"화산 협곡으로 귀환",Color3.fromRGB(255,130,70),1,"",volcanoCenter+Vector3.new(160,6,0))
end

-- [오픈월드 대륙] 마을을 중심으로 동서남북으로 이어진 13개 지역(Config.WorldMap). 섬이던 숲·화산·오아시스는 걸어서 이어지고,
-- 지역마다 바닥·큰길·외곽 산맥·변종 몬스터 풀을 갖는다. 마을 구역(Config.WorldMap.Village)은 기존 지형을 그대로 둔다.
do
  local world=Config.WorldMap
  local mats={windcliff=Enum.Material.Ground,meadow=Enum.Material.Grass,worldtree=Enum.Material.LeafyGrass,volcano=Enum.Material.Basalt,
    oasis=Enum.Material.Sand,swamp=Enum.Material.Mud,citadel=Enum.Material.Slate,highland=Enum.Material.Rock,canyon=Enum.Material.Sandstone,
    chaos=Enum.Material.Basalt,wetland=Enum.Material.Mud,desert=Enum.Material.Sand,deadmarsh=Enum.Material.Mud}
  local zoneTier={windcliff=2,meadow=1,worldtree=3,volcano=5,oasis=6,swamp=7,citadel=9,highland=4,canyon=6,chaos=8,wetland=3,desert=6,deadmarsh=8}
  local pools={
    windcliff={{"wolf","roguehooded","절벽 약탈 고블린",3,1.1,{{"Ore",.25},{"Hide",.3}}},{"wolf","tribal","절벽 주술전사",4.2,1.4,{{"Moonbloom",.3},{"Ore",.3}}},{"wolf","wolf","절벽 늑대",3.6,1.1,{{"Hide",.6},{"Fang",.3},{"Feather",.25}}}},
    meadow={{"wolf",nil,nil,3.4,1},{"wolf","roguehooded","초원 약탈 고블린",3,1.1,{{"Ore",.25},{"Hide",.3}}},{"bat",nil,nil,3.3,1}},
    worldtree={{"wolf","barbarian","저주받은 웨어울프",5.4,1.5,{{"Claw",.6},{"Hide",.7},{"Fang",.3}}},{"wolf","wolf","숲 늑대",3.6,1.1,{{"Hide",.6},{"Fang",.3}}},
      {"wolf","spider","숲 거미",3,1.1,{{"Fang",.5},{"Mushroom",.3}}},{"bat",nil,nil,3.4,1}},
    volcano={{"wolf","orc","화산 오크",4.6,1.7,{{"Ore",.5},{"Hide",.6}}},{"wolf","skullorc","해골 가면 오크",4.8,1.9,{{"Ore",.5},{"Magma",.3},{"Claw",.3}}},
      {"wolf","demon","잿불 악마",5.2,2,{{"Magma",.5},{"Crystal",.3},{"Claw",.4}}},{"wolf","raptor","화산 랩터",4.4,1.5,{{"Hide",.6},{"Fang",.4},{"Claw",.4}}}},
    oasis={{"wolf","fangspider","사막 독거미",3.4,1.5,{{"Fang",.6},{"Ectoplasm",.2}}},{"wolf","bladespider","칼날 거미",3.8,1.7,{{"Fang",.5},{"Claw",.4}}},
      {"wolf","assassin","모래 암살자",4.2,1.6,{{"Claw",.5},{"Moonbloom",.2}}},{"wolf","raptor","사막 랩터",4.4,1.6,{{"Hide",.6},{"Claw",.4}}},{"bat",nil,nil,3.4,1}},
    swamp={{"wolf","rogue","늪 고블린",3.2,1.3,{{"Ore",.3},{"Mushroom",.4}}},{"wolf","toad","독두꺼비",3,1.6,{{"Mushroom",.7},{"Hide",.3}}},
      {"wolf","tribal","늪 주술전사",4.4,1.8,{{"Moonbloom",.4},{"Ore",.3}}},{"ghost","spider","늪 원혼 거미",3.4,1.5,{{"Ectoplasm",.6},{"Fang",.3}}}},
    citadel={{"wolf","demon","성채 악마",5.4,2.3,{{"Magma",.6},{"Crystal",.4},{"Claw",.4}}},{"wolf","skullorc","성채 해골 오크",5,2.2,{{"Ore",.6},{"Magma",.3}}},
      {"wolf","orc","성채 오크 병사",4.8,2,{{"Ore",.6},{"Hide",.5}}},{"wolf","assassin","그림자 암살자",4.4,1.9,{{"Claw",.6},{"Crystal",.3}}}},
    highland={{"wolf","yeti","고원 설인",5.6,1.7,{{"Hide",.7},{"Claw",.5}}},{"wolf","barbarian","고원 늑대인간",5.2,1.6,{{"Claw",.6},{"Fang",.4}}},{"wolf","orc","고원 오크 약탈자",4.6,1.6,{{"Ore",.5},{"Hide",.5}}}},
    canyon={{"wolf","skullorc","협곡 해골 오크",4.8,1.9,{{"Ore",.5},{"Claw",.3}}},{"wolf","assassin","협곡 암살자",4.2,1.7,{{"Claw",.5},{"Crystal",.2}}},{"wolf","raptor","협곡 랩터",4.4,1.6,{{"Hide",.6},{"Fang",.4}}},{"wolf","bladespider","칼날 거미",3.8,1.7,{{"Fang",.5}}}},
    chaos={{"wolf","demon","혼돈의 악마",5.4,2.2,{{"Magma",.6},{"Crystal",.4}}},{"wolf","frostfiend","서리 마귀",5.4,2.1,{{"Crystal",.5},{"Claw",.4}}},{"wolf","skullorc","혼돈의 오크",5,2.1,{{"Ore",.5},{"Magma",.3}}}},
    wetland={{"wolf","toad","습원 독두꺼비",3,1.5,{{"Mushroom",.7},{"Hide",.3}}},{"wolf","rogue","습원 고블린",3.2,1.3,{{"Mushroom",.4},{"Ore",.3}}},{"wolf","spider","습원 거미",3,1.2,{{"Fang",.5}}}},
    desert={{"wolf","fangspider","황금 독거미",3.4,1.6,{{"Fang",.6}}},{"wolf","raptor","사막 랩터",4.4,1.6,{{"Hide",.6},{"Claw",.4}}},{"wolf","assassin","황금 암살자",4.2,1.7,{{"Claw",.5},{"Moonbloom",.3}}},{"bat",nil,nil,3.4,1}},
    deadmarsh={{"wolf","tribal","죽음의 주술전사",4.6,2,{{"Moonbloom",.5},{"Ore",.3}}},{"wolf","demon","늪의 악마",5.4,2.3,{{"Magma",.5},{"Crystal",.4}}},{"ghost","spider","죽은 늪 거미",3.4,1.6,{{"Ectoplasm",.7},{"Fang",.3}}}},
  }
  -- [몬스터 다양화] 등록된 CC0 모델 중 쓰지 않던 종(뱀·들소·닌자·마녀·해골 병과·날개악마·정령 골렘 등)을 지역별 풀에 추가한다.
  local extraPools={
    windcliff={{"wolf","ninja","절벽 그림자 닌자",4,1.5,{{"Claw",0.4},{"Ore",0.3}}},
      {"wolf","bull","절벽 들소",4.6,1.5,{{"Hide",0.7},{"Meat",0.5}}},
      {"wolf","snake","절벽 뱀",2.4,1.1,{{"Fang",0.5}}}},
    meadow={{"wolf","snake","초원 독뱀",2.2,1,{{"Fang",0.5}}},
      {"wolf","bull","성난 들소",4.2,1.4,{{"Hide",0.6},{"Meat",0.5}}},
      {"wolf","rat","들쥐 떼",1.7,0.8,{{"Hide",0.4}}}},
    worldtree={{"wolf","witch","숲 마녀",4,1.4,{{"Moonbloom",0.6},{"Crystal",0.2}}},
      {"wolf","snakeangry","숲 독사",2.6,1.2,{{"Fang",0.6}}}},
    volcano={{"wolf","wingdemon","화염 날개악마",4.8,1.8,{{"Magma",0.5},{"Crystal",0.3}}},
      {"wolf","skwarrior","재의 해골 전사",4.6,1.7,{{"Ore",0.5},{"Claw",0.3}}},
      {"wolf","dragonlite","불도마뱀",3.6,1.6,{{"Hide",0.5},{"Magma",0.3}}}},
    oasis={{"wolf","snake","사막 뱀",2.4,1.3,{{"Fang",0.5}}},
      {"wolf","cactoro","선인장 괴물",3.8,1.5,{{"Hide",0.4},{"Mushroom",0.3}}},
      {"wolf","ninja","사막 닌자",4,1.6,{{"Claw",0.5}}}},
    swamp={{"wolf","skminion","늪 해골 졸병",3.6,1.4,{{"Ectoplasm",0.4},{"Ore",0.3}}},
      {"wolf","snakeangry","늪 독사",2.6,1.4,{{"Fang",0.5},{"Mushroom",0.3}}},
      {"wolf","witch","늪 마녀",4,1.6,{{"Moonbloom",0.5},{"Ectoplasm",0.3}}}},
    citadel={{"wolf","skwarrior","성채 해골 전사",4.8,2.1,{{"Ore",0.5},{"Magma",0.3}}},
      {"wolf","skmage","성채 해골 마법사",4.4,2,{{"Crystal",0.5},{"Magma",0.3}}},
      {"wolf","knight","타락한 성채 기사",4.8,2.2,{{"Ore",0.6},{"Crystal",0.3}}}},
    highland={{"wolf","knight","고원 용병 기사",4.8,1.7,{{"Ore",0.5},{"Hide",0.4}}},
      {"wolf","bull","고원 들소",4.8,1.6,{{"Hide",0.7},{"Meat",0.5}}},
      {"wolf","ninja","고원 닌자",4.2,1.6,{{"Claw",0.5}}}},
    canyon={{"wolf","ninja","협곡 닌자",4.2,1.7,{{"Claw",0.5},{"Crystal",0.2}}},
      {"wolf","snake","협곡 방울뱀",2.6,1.5,{{"Fang",0.6}}},
      {"wolf","cactoro","협곡 선인장 괴물",3.8,1.6,{{"Hide",0.4}}}},
    chaos={{"wolf","wingdemon","혼돈 날개악마",5,2.2,{{"Magma",0.5},{"Crystal",0.4}}},
      {"wolf","skmage","혼돈 해골 술사",4.6,2.1,{{"Crystal",0.6}}},
      {"wolf","spiritgolem","혼돈 정령 골렘",5.6,2.4,{{"Crystal",0.6},{"Ore",0.4}}},
      {"wolf","skrogue","혼돈 해골 자객",4.2,2,{{"Claw",0.5},{"Crystal",0.3}}}},
    wetland={{"wolf","snake","습원 뱀",2.4,1.2,{{"Fang",0.5}}},
      {"wolf","skminion","습원 해골 졸병",3.6,1.3,{{"Ectoplasm",0.4}}}},
    desert={{"wolf","cactoro","황금 선인장 괴물",3.8,1.6,{{"Hide",0.4}}},
      {"wolf","snake","황금 독사",2.4,1.5,{{"Fang",0.6}}},
      {"wolf","ninja","황금 닌자",4,1.7,{{"Claw",0.5},{"Moonbloom",0.2}}}},
    deadmarsh={{"wolf","skwarrior","죽은 늪 해골 전사",4.8,2,{{"Ore",0.5},{"Ectoplasm",0.4}}},
      {"wolf","skmage","죽은 늪 해골 술사",4.4,2.1,{{"Crystal",0.5},{"Ectoplasm",0.4}}},
      {"wolf","witch","죽은 늪 마녀",4,2,{{"Moonbloom",0.6},{"Ectoplasm",0.4}}},
      {"wolf","ghostskull","떠도는 해골 유령",3.6,1.9,{{"Ectoplasm",0.7}}}},
  }
  for zoneId,list in pairs(extraPools) do
    if pools[zoneId] then for _,entry in ipairs(list) do table.insert(pools[zoneId],entry) end end
  end
  local village=world.Village
  local bounds=world.Bounds
  -- 사각형에서 마을 구역을 뺀 나머지를 최대 4조각으로 칠한다.
  local function paint(terrain,x0,x1,z0,z1,material,top)
    local function block(a0,a1,b0,b1)
      if a1-a0<1 or b1-b0<1 then return end
      terrain:FillBlock(CFrame.new((a0+a1)/2,top and .5 or -4,(b0+b1)/2),Vector3.new(a1-a0,top and 3 or 12,b1-b0),material)
    end
    if x1<=village.X0 or x0>=village.X1 or z1<=village.Z0 or z0>=village.Z1 then block(x0,x1,z0,z1);return end
    block(x0,x1,z0,math.max(z0,village.Z0))
    block(x0,x1,math.min(z1,village.Z1),z1)
    block(x0,math.max(x0,village.X0),math.max(z0,village.Z0),math.min(z1,village.Z1))
    block(math.min(x1,village.X1),x1,math.max(z0,village.Z0),math.min(z1,village.Z1))
  end
  task.spawn(function()
    task.wait(1)
    local ok,err=pcall(function()
      local terrain=workspace.Terrain
      local random=Random.new(4417)
      terrain:SetMaterialColor(Enum.Material.Mud,Color3.fromRGB(62,66,50))
      local zoneById={}
      for _,zone in ipairs(world.Zones) do zoneById[zone.Id]=zone end
      -- 1) 바닥: 100스터드 칸마다 지역 재질. 칸 안의 마을 사각형은 paint()가 제외한다.
      local cell=world.Cell
      local painted=0
      for row=1,world.Rows do
        for col=1,world.Cols do
          local zone=world.Zones[world.Grid[row][col]]
          local x0=bounds.X0+(col-1)*cell
          local z0=bounds.Z0+(row-1)*cell
          paint(terrain,x0,x0+cell,z0,z0+cell,mats[zone.Id],false)
          painted+=1
          if painted%120==0 then task.wait() end
        end
      end
      -- 2) 언덕·연못·용암 웅덩이.
      for _,zone in ipairs(world.Zones) do
        for _=1,math.floor(zone.Area/25000) do
          local x,z=world.RandomPoint(zone.Id,random,40)
          if x and not (x>village.X0-30 and x<village.X1+30 and z>village.Z0-30 and z<village.Z1+30) then
            local hill=mats[zone.Id]==Enum.Material.Sand and Enum.Material.Sandstone or mats[zone.Id]==Enum.Material.Grass and Enum.Material.LeafyGrass or Enum.Material.Rock
            terrain:FillBall(Vector3.new(x,random:NextNumber(-4,2),z),random:NextNumber(10,34),hill)
          end
        end
        local wet=zone.Id=="swamp" or zone.Id=="wetland" or zone.Id=="deadmarsh"
        local fire=zone.Id=="citadel" or zone.Id=="chaos"
        if wet or fire then
          for _=1,math.floor(zone.Area/60000) do
            local x,z=world.RandomPoint(zone.Id,random,40)
            if x then
              if wet then terrain:FillBall(Vector3.new(x,-5.6,z),random:NextNumber(10,24),Enum.Material.Water)
              else terrain:FillBall(Vector3.new(x,-5.4,z),random:NextNumber(5,12),Enum.Material.CrackedLava) end
            end
          end
        end
        task.wait()
      end
      -- 2b) [지역 지형 개성] 평평한 판때기 대신 지역마다 완만한 굴곡(큰 돔)과 고유 재질 얼룩을 더한다.
      -- 마을·이정표·거점·큰길 주변은 평평하게 둬서 기존 건물·NPC·자원점이 묻히지 않게 한다.
      do
        local keepOut={}
        for _,wp in ipairs(world.Waypoints or {}) do keepOut[#keepOut+1]={wp[2],wp[3]} end
        for _,town in ipairs(world.Towns or {}) do keepOut[#keepOut+1]={town.X,town.Z} end
        for _,eco in ipairs(Config.EcoRegions or {}) do
          keepOut[#keepOut+1]={eco.HubX,eco.HubZ}
          for _,camp in ipairs(eco.Camps or {}) do keepOut[#keepOut+1]={camp.X,camp.Z} end
        end
        local function clear(x,z,r)
          if math.abs(z)<r*.55 or math.abs(x)<r*.55 or math.abs(x-3000)<r*.55 then return false end
          for _,k in ipairs(keepOut) do
            if (x-k[1])^2+(z-k[2])^2<r*r then return false end
          end
          return true
        end
        -- 지역별 [돔 최대 높이, 얼룩 재질 목록]
        local relief={
          windcliff={26,{Enum.Material.Rock,Enum.Material.Mud,Enum.Material.Grass}},
          meadow={7,{Enum.Material.LeafyGrass,Enum.Material.Ground}},
          worldtree={14,{Enum.Material.Mud,Enum.Material.Ground,Enum.Material.LeafyGrass}},
          volcano={24,{Enum.Material.CrackedLava,Enum.Material.Slate,Enum.Material.Rock}},
          oasis={12,{Enum.Material.Sandstone,Enum.Material.Salt,Enum.Material.Limestone}},
          swamp={5,{Enum.Material.Mud,Enum.Material.Ground,Enum.Material.Water}},
          citadel={18,{Enum.Material.CrackedLava,Enum.Material.Cobblestone,Enum.Material.Rock}},
          highland={30,{Enum.Material.Snow,Enum.Material.Rock,Enum.Material.Glacier}},
          canyon={22,{Enum.Material.Sandstone,Enum.Material.Rock,Enum.Material.Ground}},
          chaos={22,{Enum.Material.Slate,Enum.Material.Glacier,Enum.Material.CrackedLava}},
          wetland={4,{Enum.Material.Mud,Enum.Material.LeafyGrass,Enum.Material.Water}},
          desert={11,{Enum.Material.Sandstone,Enum.Material.Salt,Enum.Material.Sand}},
          deadmarsh={6,{Enum.Material.Mud,Enum.Material.Slate,Enum.Material.Water}},
        }
        for _,zone in ipairs(world.Zones) do
          local info=relief[zone.Id]
          if info then
            local zoneMat=mats[zone.Id]
            -- 큰 돔: 중심을 땅 아래에 둬서 지표 위로 완만하게 솟는다(반지름 대비 낮은 언덕).
            for _=1,math.floor(zone.Area/55000) do
              local x,z=world.RandomPoint(zone.Id,random,80)
              if x and clear(x,z,100) and not (x>village.X0-140 and x<village.X1+140 and z>village.Z0-140 and z<village.Z1+140) then
                local radius=random:NextNumber(55,140)
                local height=random:NextNumber(.35,1)*info[1]
                terrain:FillBall(Vector3.new(x,2+height-radius,z),radius,zoneMat)
              end
            end
            -- 얼룩: 지표 높이의 납작한 원판으로 재질 색을 바꿔 단조로운 바닥을 깬다.
            for _=1,math.floor(zone.Area/32000) do
              local x,z=world.RandomPoint(zone.Id,random,40)
              if x and not (x>village.X0-30 and x<village.X1+30 and z>village.Z0-30 and z<village.Z1+30)
                and not (math.abs(z)<30 or math.abs(x)<30 or math.abs(x-3000)<30) then
                local mat=info[2][random:NextInteger(1,#info[2])]
                if mat==Enum.Material.Water then
                  terrain:FillBall(Vector3.new(x,-6,z),random:NextNumber(9,22),Enum.Material.Water)
                else
                  terrain:FillCylinder(CFrame.new(x,0,z),4,random:NextNumber(14,46),mat)
                end
              end
            end
          end
          task.wait()
        end
      end
      -- 3) 큰길(동서 z=0, 남북 x=0·x=3000).
      local b=world.Bounds
      paint(terrain,b.X0,b.X1,-6,6,Enum.Material.Cobblestone,true)
      paint(terrain,-6,6,b.Z0,b.Z1,Enum.Material.Cobblestone,true)
      paint(terrain,2994,3006,b.Z0,b.Z1,Enum.Material.Cobblestone,true)
      local function nearRoad(x,z) return math.abs(z)<45 or math.abs(x)<45 or math.abs(x-3000)<45 end
      -- 4) 홀드 경계 산맥: 이웃 칸과 지역이 다른 곳에 능선. 큰길 부근과 무작위 일부는 비워 고갯길을 만든다.
      for row=1,world.Rows-1 do
        for col=1,world.Cols-1 do
          local here=world.Grid[row][col]
          local x=bounds.X0+(col-.5)*cell
          local z=bounds.Z0+(row-.5)*cell
          local edge=here~=world.Grid[row][col+1] or here~=world.Grid[row+1][col]
          if edge and not nearRoad(x,z) and random:NextNumber()<.62
            and not (x>village.X0-60 and x<village.X1+60 and z>village.Z0-60 and z<village.Z1+60) then
            local radius=random:NextNumber(26,54)
            terrain:FillBall(Vector3.new(x+random:NextNumber(-20,20),radius*.35,z+random:NextNumber(-20,20)),radius,Enum.Material.Rock)
            if z<-900 or radius>46 then terrain:FillBall(Vector3.new(x,radius*.9,z),radius*.5,Enum.Material.Snow) end
          end
        end
        if row%4==0 then task.wait() end
      end
      -- 5) 강 세 줄: 큰길과 만나는 곳은 얕은 여울(물을 파지 않음).
      for _,river in ipairs({{-1100,420,-1,1},{1800,380,-1,1},{4050,360,-1,1}}) do
        for z=b.Z0+40,b.Z1-40,40 do
          if math.abs(z)>36 then
            local x=river[1]+river[2]*.28*math.sin(z/river[2]*2.4)
            local zoneId=world.ZoneAt(x,z)
            if zoneId and not (x>village.X0-30 and x<village.X1+30 and z>village.Z0-30 and z<village.Z1+30) then
              terrain:FillBlock(CFrame.new(x,-1.2,z),Vector3.new(20,5,48),Enum.Material.Water)
            end
          end
        end
        task.wait()
      end
      -- 6) 대륙 외곽 산맥.
      for x=b.X0,b.X1,70 do
        for _,z in ipairs({b.Z0,b.Z1}) do
          local radius=random:NextNumber(50,110)
          local side=z<0 and -1 or 1
          terrain:FillBall(Vector3.new(x,radius*.3,z+side*radius*.45),radius,Enum.Material.Rock)
          terrain:FillBall(Vector3.new(x,radius*.85,z+side*radius*.45),radius*.55,Enum.Material.Snow)
        end
      end
      for z=b.Z0,b.Z1,70 do
        for _,x in ipairs({b.X0,b.X1}) do
          local radius=random:NextNumber(50,110)
          local side=x<0 and -1 or 1
          terrain:FillBall(Vector3.new(x+side*radius*.45,radius*.3,z),radius,Enum.Material.Rock)
          terrain:FillBall(Vector3.new(x+side*radius*.45,radius*.85,z),radius*.55,Enum.Material.Snow)
        end
      end
      -- 7) 식생.
      local treeDensity={windcliff=26,meadow=26,worldtree=60,volcano=20,oasis=6,swamp=40,citadel=18,highland=30,canyon=14,chaos=16,wetland=50,desert=5,deadmarsh=36}
      local treeTint={windcliff=Color3.fromRGB(96,120,70),meadow=Color3.fromRGB(70,110,60),worldtree=Color3.fromRGB(50,100,70),volcano=Color3.fromRGB(38,34,34),
        oasis=Color3.fromRGB(176,160,84),swamp=Color3.fromRGB(70,80,58),citadel=Color3.fromRGB(34,30,34),highland=Color3.fromRGB(86,96,80),canyon=Color3.fromRGB(120,90,60),
        chaos=Color3.fromRGB(60,40,56),wetland=Color3.fromRGB(64,100,72),desert=Color3.fromRGB(176,160,84),deadmarsh=Color3.fromRGB(50,60,46)}
      for _,zone in ipairs(world.Zones) do
        for index=1,treeDensity[zone.Id] or 10 do
          local x,z=world.RandomPoint(zone.Id,random,40)
          if x then
            local nearVillage=x>village.X0-20 and x<village.X1+20 and z>village.Z0-20 and z<village.Z1+20
            if not nearVillage and not nearRoad(x,z) then
              local tree=worldAsset("tree",Vector3.new(x,3,z),random:NextNumber(14,26))
              if tree then
                tree.Name="OpenWorldTree_"..zone.Id.."_"..index;tree:SetAttribute("MeadowScenery",true)
                for _,surface in ipairs(tree:GetDescendants()) do
                  if surface:IsA("MeshPart") then surface.Color=surface.Color:Lerp(treeTint[zone.Id],.5) end
                end
              end
            end
          end
          if index%5==0 then task.wait() end
        end
      end
      workspace:SetAttribute("OpenWorldReady",true)
    end)
    if not ok then warn("오픈월드 생성 실패: "..tostring(err)) end
  end)
  -- 서식지: 면적에 비례해 지역별 변종 풀에서 배치. 5번째마다 정예(체력·피해 상향, 큰 몸집).
  local random=Random.new(9031)
  local count=0
  local placedSites={}
  for _,zone in ipairs(world.Zones) do
    local pool=pools[zone.Id]
    local sites=math.floor(zone.Area/40000)
    for index=1,sites do
      local spec=pool[random:NextInteger(1,#pool)]
      local x,z=world.RandomPoint(zone.Id,random,30)
      local inVillage=x==nil or (x>village.X0-60 and x<village.X1+60 and z>village.Z0-60 and z<village.Z1+60)
      -- [배치 보정] 이정표(야영지) 반경 70 안과 이미 놓인 서식지 38 이내는 피해 다시 뽑는다(최대 6번).
      if not inVillage then
        for _=1,6 do
          local blocked=false
          for _,wp in ipairs(world.Waypoints) do
            if (x-wp[2])^2+(z-wp[3])^2<70*70 then blocked=true;break end
          end
          if not blocked then
            for _,town in ipairs(world.Towns or {}) do
              if (x-town.X)^2+(z-town.Z)^2<90*90 then blocked=true;break end
            end
          end
          if not blocked then
            for _,placed in ipairs(placedSites) do
              if (x-placed.X)^2+(z-placed.Z)^2<38*38 then blocked=true;break end
            end
          end
          if not blocked then break end
          local nx,nz=world.RandomPoint(zone.Id,random,30)
          if nx==nil then break end
          x,z=nx,nz
        end
      end
      if not inVillage then
        local elite=index%5==0
        local tierGain=math.floor(math.sqrt((x-zone.Seed[1])^2+(z-zone.Seed[2])^2)/700)
        table.insert(meadowEncounterSites,{id=spec[1],atom=spec[1]=="bat" and "WING_LEATHER" or "HEAD_CANINE",model=spec[2],
          name=spec[3] and (elite and "정예 "..spec[3] or spec[3]) or nil,
          tier=math.min(10,zoneTier[zone.Id]+tierGain+(elite and 1 or 0)),height=spec[4]*(elite and 1.25 or 1),
          hp=spec[2] and spec[5]*(elite and 1.8 or 1) or nil,dmg=spec[2] and (spec[5]*.8)*(elite and 1.4 or 1) or nil,
          drops=spec[6],position=Vector3.new(x,3,z)})
        placedSites[#placedSites+1]={X=x,Z=z}
        count+=1
        -- [무리] 정예가 아닌 늑대형 서식지의 3분의 1은 가까이에 동료 1마리가 함께 있다(무리 사냥 느낌).
        if not elite and spec[1]=="wolf" and index%3==0 then
          local angle=random:NextNumber(0,math.pi*2)
          table.insert(meadowEncounterSites,{id=spec[1],atom="HEAD_CANINE",model=spec[2],
            name=spec[3],tier=math.min(10,zoneTier[zone.Id]+tierGain),height=spec[4],
            hp=spec[2] and spec[5] or nil,dmg=spec[2] and spec[5]*.8 or nil,
            drops=spec[6],position=Vector3.new(x+math.cos(angle)*11,3,z+math.sin(angle)*11)})
          count+=1
        end
      end
    end
  end
  -- 지역 군주(보스).
  for _,boss in ipairs({
    {x=5900,z=0,model="chieftain",name="성채의 군주 · 늑대인간 족장",height=9,hp=5,dmg=2.4,tier=10,drops={{"Crystal",1,4},{"Claw",1,3},{"Magma",.8,2}}},
    {x=4800,z=60,model="spiritgolem",name="늪의 수호자 · 안개 골렘",height=9,hp=4.5,dmg=2.2,tier=8,drops={{"Crystal",1,3},{"Ore",1,3},{"Ectoplasm",.8,2}}},
    {x=2800,z=-40,model="demon",name="잿불의 군주 · 심연 악마",height=8,hp=4.2,dmg=2.2,tier=6,drops={{"Magma",1,3},{"Crystal",.8,2},{"Claw",.8,2}}},
    {x=-1200,z=-1900,model="yeti",name="북부 고원의 왕 · 거대 설인",height=9,hp=4,dmg=2,tier=5,drops={{"Hide",1,4},{"Claw",1,3}}},
    {x=1700,z=-1950,model="skullorc",name="협곡의 대족장 · 해골 오크",height=8,hp=4.2,dmg=2.1,tier=7,drops={{"Ore",1,4},{"Magma",.8,2}}},
    {x=4600,z=-1900,model="demon",name="혼돈의 지배자 · 심연 군주",height=9,hp=5,dmg=2.4,tier=9,drops={{"Crystal",1,4},{"Magma",1,3}}},
    {x=-600,z=1950,model="toad",name="습원의 군주 · 거대 두꺼비",height=6,hp=3.5,dmg=1.8,tier=4,drops={{"Mushroom",1,4},{"Hide",1,3}}},
    {x=3000,z=1950,model="raptor",name="황금 사막의 폭군 · 거대 랩터",height=8,hp=4,dmg=2,tier=7,drops={{"Hide",1,4},{"Fang",1,3},{"Claw",1,3}}},
    {x=5300,z=1950,model="spiritgolem",name="죽음의 늪 수호자 · 망령 골렘",height=9,hp=5,dmg=2.3,tier=9,drops={{"Crystal",1,4},{"Ectoplasm",1,3}}},
    {x=-1800,z=0,model="orc",name="바람 절벽의 대장 · 오크 군단장",height=7,hp=3.6,dmg=1.8,tier=4,drops={{"Ore",1,4},{"Hide",1,3}}},
  }) do
    local lordZone=({["북부 고원의 왕 · 거대 설인"]="highland",["혼돈의 지배자 · 심연 군주"]="chaos",["바람 절벽의 대장 · 오크 군단장"]="windcliff"})[boss.name]
    table.insert(meadowEncounterSites,{id="wolf",atom="HEAD_CANINE",model=boss.model,name=boss.name,tier=boss.tier,height=boss.height,
      hp=boss.hp,dmg=boss.dmg,drops=boss.drops,alpha=true,zoneTag=lordZone,lord=lordZone~=nil,position=Vector3.new(boss.x,3,boss.z)})
  end
  workspace:SetAttribute("OpenWorldSiteCount",count)
end

-- [오일 바르기] 가장 가까운 몬스터의 분류에 맞는 오일을 재료로 즉석 제작해 바른다.
do
  local lastOil={}
  remote.OnServerEvent:Connect(function(player,action)
    if action~="oil:auto" or player:GetAttribute("ProfileReady")~=true then return end
    if os.clock()-(lastOil[player] or 0)<1 then return end
    lastOil[player]=os.clock()
    local root=player.Character and player.Character:FindFirstChild("HumanoidRootPart")
    if not root then return end
    local nearest,best=nil,80
    for _,enemy in ipairs(enemies) do
      if enemy.HP>0 and enemy.model.Parent and enemy.oilClass then
        local distance=(enemy.position-root.Position).Magnitude
        if distance<best then nearest,best=enemy,distance end
      end
    end
    local function say(text)
      player:SetAttribute("MeadowGearMessage",text)
      player:SetAttribute("MeadowGearRevision",(player:GetAttribute("MeadowGearRevision") or 0)+1)
    end
    if not nearest then say("오일을 바를 몬스터가 주변에 없어.");return end
    local class=nearest.oilClass
    if player:GetAttribute("MeadowOilClass")==class and (player:GetAttribute("MeadowOilCharges") or 0)>0 then
      say(meadowOil.names[class].."가 이미 발라져 있어.");return
    end
    for _,need in ipairs(meadowOil.recipes[class]) do
      if readNumber(player,need[1],0)<need[2] then
        local mat=Config.MaterialByField[need[1]]
        say(meadowOil.names[class].." 재료 부족: "..(mat and mat.Name or need[1]));return
      end
    end
    for _,need in ipairs(meadowOil.recipes[class]) do setNumber(player,need[1],readNumber(player,need[1],0)-need[2]) end
    player:SetAttribute("MeadowOilClass",class)
    player:SetAttribute("MeadowOilCharges",15)
    say(meadowOil.names[class].." 적용 · 15회 타격에 1.5배 피해")
  end)
end

-- [이정표 · 장소 발견] 대륙 곳곳의 이정표를 처음 조사하면 위치가 저장되고 보상을 받는다.
-- 이정표에서는 이미 발견한 동쪽·서쪽 이정표(마을 포함)로 빠르게 이동한다. 이동 선택은 서버가 거리·발견 여부를 다시 확인한다.
do
  local waypoints=Config.WorldMap.Waypoints
  local villageSpawn=Vector3.new(-110,6,-86)
  local sessions={}
  local function discovered(player,index) return bit32.band(readNumber(player,"WaypointMask",0),bit32.lshift(1,index-1))~=0 end
  local function neighbor(player,index,direction)
    local i=index+direction
    while i>=1 and i<=#waypoints do
      if discovered(player,i) then return i end
      i+=direction
    end
    return nil
  end
  local function travelTo(player,position)
    local character=player.Character
    if character and character:FindFirstChild("HumanoidRootPart") then character:PivotTo(CFrame.new(position+Vector3.new(0,6,6))) end
  end
  task.spawn(function()
    task.wait(2)
    for index,spec in ipairs(waypoints) do
      local position=Vector3.new(spec[2],3,spec[3])
      local anchor=Instance.new("Attachment")
      anchor.Name="Waypoint_"..index;anchor.WorldPosition=position;anchor.Parent=workspace.Terrain
      local glow=Instance.new("ParticleEmitter")
      glow.Color=ColorSequence.new(Color3.fromRGB(150,220,255));glow.LightEmission=1;glow.Rate=14;glow.Lifetime=NumberRange.new(2,3)
      glow.Speed=NumberRange.new(1,3);glow.Size=NumberSequence.new(.8);glow.EmissionDirection=Enum.NormalId.Top;glow.Parent=anchor
      local light=Instance.new("PointLight");light.Color=Color3.fromRGB(150,220,255);light.Range=26;light.Brightness=2;light.Parent=anchor
      local prompt=Instance.new("ProximityPrompt")
      prompt.ActionText="이정표 조사";prompt.ObjectText=spec[1];prompt.HoldDuration=.5
      prompt.MaxActivationDistance=14;prompt.RequiresLineOfSight=false;prompt.Parent=anchor
      task.spawn(function()
        local stone=worldAsset("ruin",position,7)
        if stone then stone.Name="WaypointStone_"..index;stone:SetAttribute("MeadowScenery",true) end
      end)
      prompt.Triggered:Connect(function(player)
        if player:GetAttribute("ProfileReady")~=true then return end
        local first=not discovered(player,index)
        if first then
          setNumber(player,"WaypointMask",bit32.bor(readNumber(player,"WaypointMask",0),bit32.lshift(1,index-1)))
          pcall(awardProgress,player,30+index*6,12+index*2)
        end
        sessions[player]={index=index,expires=os.clock()+40}
        -- [동선 이동] 번호 순서가 아니라 지금 위치에서 가까운 발견 이정표 3곳(+마을 귀환)을 보여 준다.
        local near={}
        for i=1,#waypoints do
          if i~=index and discovered(player,i) then
            near[#near+1]={i=i,d=math.sqrt((waypoints[i][2]-spec[2])^2+(waypoints[i][3]-spec[3])^2)}
          end
        end
        table.sort(near,function(a,b) return a.d<b.d end)
        sessions[player]={index=index,expires=os.clock()+40,near=near}
        local options={}
        for k=1,math.min(3,#near) do
          options[#options+1]={label=string.format("%s · %d걸음",waypoints[near[k].i][1],math.floor(near[k].d/4)),action="wp:near:"..k}
        end
        options[#options+1]={label="초원 마을로 귀환",action="wp:west"}
        local count=0
        for i=1,#waypoints do if discovered(player,i) then count+=1 end end
        pcall(function() villageDialogue(player,spec[1],(first and "새로운 장소를 발견했다! 경험치와 재화를 얻었다.\n" or "")..
          "발견한 이정표 "..count.."/"..#waypoints..". 이미 발견한 이정표로 빠르게 이동할 수 있다.",options) end)
      end)
    end
  end)
  local lastMapTravel={}
  remote.OnServerEvent:Connect(function(player,action)
    -- 전체 지도에서 발견한 이정표를 눌러 이동(스카이림식). 발견 여부·쿨다운·생존은 서버가 확인한다.
    if typeof(action)=="string" and action:match("^wp:map:%d+$") then
      local index=tonumber(action:match("%d+"))
      local spec=waypoints[index]
      local humanoid=player.Character and player.Character:FindFirstChildOfClass("Humanoid")
      if spec and discovered(player,index) and humanoid and humanoid.Health>0 and os.clock()-(lastMapTravel[player] or 0)>4 then
        lastMapTravel[player]=os.clock()
        travelTo(player,Vector3.new(spec[2],3,spec[3]))
      end
      return
    end
    if typeof(action)=="string" and action:match("^ui:pref:%a+:%d+$") then
      local key,value=action:match("^ui:pref:(%a+):(%d+)$")
      value=tonumber(value)
      if key=="guide" and (value==0 or value==1) then setNumber(player,"GuideOff",value)
      elseif key=="tut" and value<=99 then setNumber(player,"TutorialStep",value)
      elseif key=="grant" and value==1 and readNumber(player,"TutorialStep",0)<99 then
        -- 튜토리얼 선물: 첫 기술 점수 1개를 받을 만큼 숙련도를 채운다(한 번만).
        if readNumber(player,"CombatProficiency",0)<30 then setNumber(player,"CombatProficiency",30) end
      end
      return
    end
    if typeof(action)=="string" and action:match("^quick:set:%d:%d+$") then
      local slotIndex,value=action:match("^quick:set:(%d):(%d+)$")
      slotIndex,value=tonumber(slotIndex),tonumber(value)
      local valid=slotIndex>=1 and slotIndex<=5 and meadowRpg.validQuickCode(player,value)
        and player:GetAttribute("ProfileReady")==true
      if valid then
        setNumber(player,"QuickInit",1)
        setNumber(player,"QuickSlot"..slotIndex,value)
      end
      return
    end
    if typeof(action)=="string" and (action:match("^wp:lm:%d+$") or action:match("^wp:town:%d+$")) then
      local kind=action:match("^wp:(%a+):")
      local index=tonumber(action:match("%d+$"))
      local humanoid=player.Character and player.Character:FindFirstChildOfClass("Humanoid")
      if humanoid and humanoid.Health>0 and os.clock()-(lastMapTravel[player] or 0)>4 then
        local target
        if kind=="lm" then
          local lm=Config.WorldMap.Landmarks[index]
          if lm and bit32.band(readNumber(player,"LandmarkMask",0),bit32.lshift(1,index-1))~=0 then target=Vector3.new(lm.X+70,3,lm.Z+70) end
        else
          local town=Config.WorldMap.Towns[index]
          if town then
            local discovered=readNumber(player,"WorldDiscovered",1)
            for _,zone in ipairs(Config.WorldMap.Zones) do
              if zone.Id==town.Zone and bit32.band(discovered,zone.Bit)~=0 then target=Vector3.new(town.X,3,town.Z) end
            end
          end
        end
        if target then lastMapTravel[player]=os.clock();travelTo(player,target) end
      end
      return
    end
    if action~="wp:east" and action~="wp:west" and not (typeof(action)=="string" and action:match("^wp:near:[123]$")) then return end
    local session=sessions[player]
    if not session or os.clock()>session.expires then return end
    sessions[player]=nil
    local character=player.Character
    local root=character and character:FindFirstChild("HumanoidRootPart")
    local from=waypoints[session.index]
    if not root or (root.Position-Vector3.new(from[2],3,from[3])).Magnitude>40 then return end
    local target
    if action:match("^wp:near:") then
      local entry=session.near and session.near[tonumber(action:sub(-1))]
      target=entry and entry.i
      if target and not discovered(player,target) then target=nil end
      if not target then return end
    elseif action=="wp:east" then target=neighbor(player,session.index,1)
    else target=nil end
    if target then
      travelTo(player,Vector3.new(waypoints[target][2],3,waypoints[target][3]))
    elseif action=="wp:west" then
      travelTo(player,villageSpawn)
    end
  end)
end

-- [위쳐식 계약 · 지하 던전] 이정표마다 계약 게시판이 있고, 지정된 강화 몬스터를 처치해 보상을 받는다.
-- 일부 이정표에는 던전 입구가 있어 대륙 동쪽 밖의 지하 방(전용 몬스터·보스·보물상자)으로 들어간다.
do
  local contracts={
    [2]={"barbarian","저주받은 사냥꾼",5.6},[3]={"spider","세계수 거미 여왕",4.6},[4]={"wolf","회색 우두머리",4.6},
    [5]={"rogue","탑의 약탈 대장",4.2},[6]={"skullorc","재의 제단 사제",5.4},[7]={"raptor","용암 사냥꾼",5},
    [8]={"orc","광산의 광인",5},[9]={"assassin","오벨리스크의 그림자",4.8},[10]={"bladespider","사원의 수호 거미",4.6},
    [11]={"toad","안개 두꺼비 왕",4},[12]={"tribal","마녀의 하수인",5},[13]={"demon","성문의 악마",6},
    [14]={"orc","대장간의 불꽃 오크",5.6},[15]={"skullorc","초소 지휘관",5.6},[16]={"demon","옥좌의 집행자",6.6},
    [17]={"yeti","북부 감시탑의 괴수",5.8},[18]={"skullorc","협곡 제단의 사제",5.4},[19]={"frostfiend","혼돈의 균열 마귀",5.6},[20]={"rogue","등대의 해적 두목",4.4},
    [21]={"toad","부두의 독두꺼비 왕",4.4},[22]={"fangspider","폐허의 독거미 여왕",4.8},[23]={"tribal","사당의 늪 주술사",5.2},[24]={"barbarian","옛 요새의 저주받은 기사",5.8},
    [25]={"bladespider","지룡 전망대의 비늘 사냥꾼",4.8},[26]={"goblin","폐광 초소의 고블린 두목",4.2},[27]={"toad","나루터의 히드라 사냥꾼",4.2},[28]={"barbarian","뿌리 야영지의 웨어울프",5},
    [29]={"assassin","호수 나루의 모래 도적",4.6},[30]={"tribal","늪 허브의 주술전사",4.6},[31]={"frostfiend","초소의 서리 마귀",5.6},[32]={"demon","보루의 재 악마",6},
  }
  local anchors={}
  for index,spec in ipairs(Config.WorldMap.Waypoints) do anchors[index]={spec[2],spec[3]} end
  local sessions={}
  local function bit(index) return bit32.lshift(1,index-1) end
  local function say(player,title,text,options) pcall(function() villageDialogue(player,title,text,options) end) end
  for index,spec in pairs(contracts) do
    local base=Vector3.new(anchors[index][1],3,anchors[index][2])
    table.insert(meadowEncounterSites,{id="wolf",atom="HEAD_CANINE",model=spec[1],name="계약 · "..spec[2],
      tier=math.min(10,2+math.floor(index*.6)),height=spec[3],hp=3.5,dmg=1.7,alpha=false,contractIndex=index,
      drops={{"Crystal",.8,2},{"Claw",.5,1},{"Hide",.6,2}},position=base+Vector3.new(34,0,26)})
    task.spawn(function()
      task.wait(3)
      local anchor=Instance.new("Attachment")
      anchor.Name="ContractBoard_"..index;anchor.WorldPosition=base+Vector3.new(-9,0,9);anchor.Parent=workspace.Terrain
      local prompt=Instance.new("ProximityPrompt")
      prompt.ActionText="계약 게시판";prompt.ObjectText=spec[2];prompt.HoldDuration=.4
      prompt.MaxActivationDistance=12;prompt.RequiresLineOfSight=false;prompt.Parent=anchor
      prompt.Triggered:Connect(function(player)
        if player:GetAttribute("ProfileReady")~=true then return end
        sessions[player]={index=index,expires=os.clock()+40}
        local accepted=bit32.band(readNumber(player,"ContractAccepted",0),bit(index))~=0
        local done=bit32.band(readNumber(player,"ContractDone",0),bit(index))~=0
        local claimed=bit32.band(readNumber(player,"ContractClaimed",0),bit(index))~=0
        local title="계약 · "..spec[2]
        if claimed then say(player,title,"이미 해결한 계약이다. 게시판에는 새 이름이 올라오지 않았다.")
        elseif done then say(player,title,spec[2].."을(를) 처치했다. 보상을 받아라.",{{label="보상 수령",action="ct:claim"}})
        elseif accepted then say(player,title,"이정표 동북쪽 근처에서 "..spec[2].."이(가) 배회한다. 오일(8번)을 바르고 사냥하라.")
        else say(player,title,"이정표 근처의 강화 몬스터 "..spec[2].." 처치 의뢰. 보상: 재화·경험치·수정.",{{label="계약 수락",action="ct:accept"}}) end
      end)
    end)
  end
  remote.OnServerEvent:Connect(function(player,action)
    if action~="ct:accept" and action~="ct:claim" then return end
    local session=sessions[player]
    if not session or os.clock()>session.expires then return end
    sessions[player]=nil
    local index=session.index
    local root=player.Character and player.Character:FindFirstChild("HumanoidRootPart")
    if not root or (root.Position-Vector3.new(anchors[index][1],3,anchors[index][2])).Magnitude>60 then return end
    if action=="ct:accept" then
      setNumber(player,"ContractAccepted",bit32.bor(readNumber(player,"ContractAccepted",0),bit(index)))
      say(player,"계약 수락","계약을 수락했다. 표적을 찾아 처치하라.")
    elseif bit32.band(readNumber(player,"ContractDone",0),bit(index))~=0
      and bit32.band(readNumber(player,"ContractClaimed",0),bit(index))==0 then
      setNumber(player,"ContractClaimed",bit32.bor(readNumber(player,"ContractClaimed",0),bit(index)))
      pcall(awardProgress,player,60+index*14,40+index*18)
      setNumber(player,"Crystal",readNumber(player,"Crystal",0)+1+math.floor(index/5))
      say(player,"계약 완료","보상을 받았다. 수정과 재화를 챙겼다.")
    end
  end)
  workspace:SetAttribute("ContractKillHook",true)
end

-- [지하 던전] 대륙 동쪽 밖(x≈8000)에 닫힌 지하 방 3개. 입구 이정표: 4 갈림길 주막터 · 8 옛 광산 입구 · 12 늪 마녀의 오두막.
do
  local dungeons={
    {name="잊힌 지하묘지",entry=4,cx=8000,boss={"spiritgolem","묘지의 수문장 · 석상 골렘",8,4.5},
      mobs={"spider","fangspider","bladespider","spider","fangspider"},tier=5},
    {name="고블린 소굴",entry=8,cx=8400,boss={"orc","소굴의 왕 · 거대 오크",7,4},
      mobs={"rogue","roguehooded","rogue","tribal","roguehooded"},tier=6},
    {name="심연의 제단",entry=12,cx=8800,boss={"demon","제단의 군주 · 심연 악마",8,5},
      mobs={"demon","skullorc","assassin","demon","skullorc"},tier=8},
    -- [지역 던전 8곳] 새 이정표(25~32)가 입구. 지역 괴물 테마의 보스와 전용 보상을 가진다.
    {name="지룡의 보물 동굴",entry=25,cx=9200,anchor={1580,-1760},boss={"trex","비늘 수호룡 · 파프니르의 그림자",9,5},
      mobs={"triceratops","bladespider","triceratops","bladespider","skullorc"},tier=7,loot={Claw=4,Steel=1,Hide=4}},
    {name="서리 폐광",entry=26,cx=9600,anchor={-820,-1720},boss={"yeti","폐광의 왕 · 서리 거인",9,4.5},
      mobs={"goblinscout","goblin","yeti","goblin","goblinscout"},tier=6,loot={Ore=6,Feather=3,Hide=4}},
    {name="히드라의 독굴",entry=27,cx=10000,anchor={-660,1720},boss={"stegosaurus","머리 아홉의 히드라 · 독굴의 어미",9,5},
      mobs={"parasaur","toad","snake","parasaur","toad"},tier=6,loot={Fang=5,Moonbloom=4,Hide=3}},
    {name="뿌리 밑 거미 둥지",entry=28,cx=10400,anchor={1200,10},boss={"spider","거미 여왕 아라크네의 분신",9,5},
      mobs={"spider","fangspider","wasp","spider","fangspider"},tier=7,loot={Fang=5,Moonbloom=4,Crystal=2}},
    {name="잊힌 사막 무덤",entry=29,cx=10800,anchor={3620,-70},boss={"skwarrior","무덤의 파수장 · 파라오 수호병",8,4.5},
      mobs={"skwarrior","assassin","snakeangry","skminion","skwarrior"},tier=8,loot={Crystal=4,Hide=4,Feather=3}},
    {name="독버섯 동굴",entry=30,cx=11200,anchor={4800,10},boss={"mushroomking","동굴의 독버섯 왕",7,4.5},
      mobs={"glub","toad","glub","snake","toad"},tier=8,loot={Moonbloom=6,Ectoplasm=3,Crystal=2}},
    {name="서리 마귀 동굴",entry=31,cx=11600,anchor={4330,-1640},boss={"frostfiend","마귀 군주 · 서리 심연",10,5},
      mobs={"frostfiend","demon","spiritgolem","frostfiend","demon"},tier=10,loot={Ectoplasm=4,Crystal=4,Magma=3}},
    {name="성채 지하 감옥",entry=32,cx=12000,anchor={5850,40},boss={"knight","지하 감옥의 간수장",9,5},
      mobs={"skullorc","skwarrior","demon","skullorc","skwarrior"},tier=10,loot={Steel=2,Ingot=4,Crystal=4}},
  }
  local anchors={{1800,300},{3200,800},{4900,700}}
  for i=4,#dungeons do anchors[i]=dungeons[i].anchor end
  local drops={spider={{"Fang",.6},{"Ectoplasm",.3}},fangspider={{"Fang",.6}},bladespider={{"Fang",.5},{"Claw",.4}},
    goblin={{"Ore",.4},{"Mushroom",.3}},goblinscout={{"Hide",.4}},tribal={{"Moonbloom",.4},{"Ore",.3}},
    demon={{"Magma",.6},{"Crystal",.4}},skullorc={{"Ore",.6},{"Magma",.3}},assassin={{"Claw",.6},{"Crystal",.3}}}
  local travelBack={}
  task.spawn(function()
    task.wait(2)
    local terrain=workspace.Terrain
    for index,d in ipairs(dungeons) do
      terrain:FillBlock(CFrame.new(d.cx,20,0),Vector3.new(190,64,190),Enum.Material.Slate)
      terrain:FillBlock(CFrame.new(d.cx,24,0),Vector3.new(170,44,170),Enum.Material.Air)
      for _,spot in ipairs({{-60,-60},{60,-60},{-60,60},{60,60},{0,0}}) do
        terrain:FillCylinder(CFrame.new(d.cx+spot[1],22,spot[2]),44,10,Enum.Material.Basalt)
        local lamp=Instance.new("Attachment");lamp.WorldPosition=Vector3.new(d.cx+spot[1],12,spot[2]+7);lamp.Parent=terrain
        local light=Instance.new("PointLight");light.Color=Color3.fromRGB(255,170,90);light.Range=48;light.Brightness=2.2;light.Parent=lamp
      end
    end
  end)
  for index,d in ipairs(dungeons) do
    local entry=Vector3.new(anchors[index][1]-14,3,anchors[index][2]-14)
    local inside=Vector3.new(d.cx,5,66)
    local enterAnchor=Instance.new("Attachment");enterAnchor.WorldPosition=entry;enterAnchor.Parent=workspace.Terrain
    local glow=Instance.new("ParticleEmitter");glow.Color=ColorSequence.new(Color3.fromRGB(255,120,80));glow.LightEmission=1;glow.Rate=22
    glow.Lifetime=NumberRange.new(1.5,2.5);glow.Speed=NumberRange.new(1,3);glow.Size=NumberSequence.new(.9);glow.Parent=enterAnchor
    local enter=Instance.new("ProximityPrompt");enter.ActionText="던전 입장";enter.ObjectText=d.name.." (권장 단계 "..d.tier..")"
    enter.HoldDuration=.6;enter.MaxActivationDistance=12;enter.RequiresLineOfSight=false;enter.Parent=enterAnchor
    enter.Triggered:Connect(function(player)
      local character=player.Character
      if character and character:FindFirstChild("HumanoidRootPart") then character:PivotTo(CFrame.new(inside)) end
    end)
    local exitAnchor=Instance.new("Attachment");exitAnchor.WorldPosition=Vector3.new(d.cx,4,74);exitAnchor.Parent=workspace.Terrain
    local exit=Instance.new("ProximityPrompt");exit.ActionText="던전 탈출";exit.ObjectText=d.name;exit.HoldDuration=.6
    exit.MaxActivationDistance=12;exit.RequiresLineOfSight=false;exit.Parent=exitAnchor
    exit.Triggered:Connect(function(player)
      local character=player.Character
      if character and character:FindFirstChild("HumanoidRootPart") then character:PivotTo(CFrame.new(entry+Vector3.new(0,4,0))) end
    end)
    local random=Random.new(1200+index)
    for i,model in ipairs(d.mobs) do
      for pack=1,2 do
        table.insert(meadowEncounterSites,{id="wolf",atom="HEAD_CANINE",model=model,tier=d.tier,height=model:find("spider") and 3.6 or 4.4,
          hp=1.8,dmg=1.3,drops=drops[model] or {{"Hide",.5},{"Fang",.3}},dungeon=index,
          position=Vector3.new(d.cx+random:NextNumber(-65,65),3,random:NextNumber(-65,30))})
      end
    end
    table.insert(meadowEncounterSites,{id="wolf",atom="HEAD_CANINE",model=d.boss[1],name=d.boss[2],tier=d.tier+2,height=d.boss[3],
      hp=d.boss[4],dmg=2,alpha=true,dungeon=index,drops={{"Crystal",1,3},{"Magma",.6,2},{"Ore",1,3}},position=Vector3.new(d.cx,3,-50)})
    local chest=Instance.new("Attachment");chest.WorldPosition=Vector3.new(d.cx,4,-72);chest.Parent=workspace.Terrain
    local chestGlow=Instance.new("ParticleEmitter");chestGlow.Color=ColorSequence.new(Color3.fromRGB(255,226,120));chestGlow.LightEmission=1
    chestGlow.Rate=16;chestGlow.Lifetime=NumberRange.new(2,3);chestGlow.Size=NumberSequence.new(.8);chestGlow.Parent=chest
    local open=Instance.new("ProximityPrompt");open.ActionText="보물 상자 열기";open.ObjectText=d.name;open.HoldDuration=.8
    open.MaxActivationDistance=12;open.RequiresLineOfSight=false;open.Parent=chest
    open.Triggered:Connect(function(player)
      local function say(text) pcall(function() villageDialogue(player,d.name,text) end) end
      for _,enemy in ipairs(enemies) do
        if enemy.dungeon==index and enemy.HP>0 and enemy.model.Parent then say("아직 몬스터가 남아 있다. 모두 처치해야 상자가 열린다.");return end
      end
      local mask=readNumber(player,"DungeonCleared",0)
      local flag=bit32.lshift(1,index-1)
      if bit32.band(mask,flag)~=0 then say("이미 비워 둔 상자다.");return end
      setNumber(player,"DungeonCleared",bit32.bor(mask,flag))
      if index<=3 then setNumber(player,"RelicMask",bit32.bor(readNumber(player,"RelicMask",0),bit32.lshift(1,6+index-1))) end
      for field,n in pairs(d.loot or {}) do setNumber(player,field,readNumber(player,field,0)+n) end
      setNumber(player,"Crystal",readNumber(player,"Crystal",0)+3+index)
      setNumber(player,"Magma",readNumber(player,"Magma",0)+2+index)
      setNumber(player,"Ore",readNumber(player,"Ore",0)+4+index)
      pcall(awardProgress,player,150+index*80,120+index*60)
      say("던전을 정복했다! 수정·마그마·광석과 큰 보상을 얻었다.")
    end)
  end
end

-- [탐험 지점 · 자동 발견] 가까이 가면 장소가 기록되고 보상을 받는다. 각 지점에는 수호 몬스터와 한 번만 열 수 있는 보물이 있다.
do
  local pois=Config.WorldMap.Pois
  local function poiBit(index) return index<=30 and "PoiFound1" or "PoiFound2",bit32.lshift(1,(index-1)%30) end
  local function lootBit(index) return index<=30 and "PoiLoot1" or "PoiLoot2",bit32.lshift(1,(index-1)%30) end
  local guardians={windcliff="rogue",meadow="roguehooded",worldtree="barbarian",volcano="skullorc",oasis="assassin",swamp="tribal",
    citadel="demon",highland="yeti",canyon="skullorc",chaos="demon",wetland="toad",desert="fangspider",deadmarsh="tribal"}
  local rewards={ruin={"Crystal","Ore"},cave={"Ore","Mushroom"},camp={"Hide","Fang"},shrine={"Moonbloom","Crystal"}}
  for index,poi in ipairs(pois) do
    local position=Vector3.new(poi.X,3,poi.Z)
    table.insert(meadowEncounterSites,{id="wolf",atom="HEAD_CANINE",model=guardians[poi.Zone] or "wolf",name="수호자 · "..poi.Name,
      tier=6,height=5,hp=3,dmg=1.5,drops={{rewards[poi.Kind][1],.9,2}},poiGuard=index,position=position+Vector3.new(14,0,10)})
    task.spawn(function()
      task.wait(4+index*.15)
      local stone=worldAsset(poi.Kind=="cave" and "ruin" or "ruin",position,poi.Kind=="shrine" and 6 or 9)
      if stone then stone.Name="Poi_"..index;stone:SetAttribute("MeadowScenery",true) end
      local anchor=Instance.new("Attachment");anchor.Name="PoiChest_"..index;anchor.WorldPosition=position+Vector3.new(-6,.5,-4);anchor.Parent=workspace.Terrain
      local glow=Instance.new("ParticleEmitter");glow.Color=ColorSequence.new(Color3.fromRGB(255,226,120));glow.LightEmission=1
      glow.Rate=10;glow.Lifetime=NumberRange.new(2,3);glow.Size=NumberSequence.new(.6);glow.Parent=anchor
      local prompt=Instance.new("ProximityPrompt");prompt.ActionText="보물 열기";prompt.ObjectText=poi.Name;prompt.HoldDuration=.7
      prompt.MaxActivationDistance=10;prompt.RequiresLineOfSight=false;prompt.Parent=anchor
      prompt.Triggered:Connect(function(player)
        if player:GetAttribute("ProfileReady")~=true then return end
        for _,enemy in ipairs(enemies) do
          if enemy.poiGuard==index and enemy.HP>0 and enemy.model.Parent then
            pcall(function() villageDialogue(player,poi.Name,"수호자가 아직 지키고 있다. 먼저 쓰러뜨려라.") end);return
          end
        end
        local field,flag=lootBit(index)
        if bit32.band(readNumber(player,field,0),flag)~=0 then
          pcall(function() villageDialogue(player,poi.Name,"이미 비워 둔 보물이다.") end);return
        end
        setNumber(player,field,bit32.bor(readNumber(player,field,0),flag))
        local pair=rewards[poi.Kind]
        setNumber(player,pair[1],readNumber(player,pair[1],0)+2)
        setNumber(player,pair[2],readNumber(player,pair[2],0)+2)
        pcall(awardProgress,player,40,50)
        pcall(function() villageDialogue(player,poi.Name,"보물을 찾았다! 재료와 재화를 얻었다.") end)
      end)
    end)
  end
  task.spawn(function()
    while true do
      task.wait(2)
      for _,player in ipairs(Players:GetPlayers()) do
        local root=player.Character and player.Character:FindFirstChild("HumanoidRootPart")
        if root and player:GetAttribute("ProfileReady")==true then
          for index,poi in ipairs(pois) do
            local dx,dz=root.Position.X-poi.X,root.Position.Z-poi.Z
            if dx*dx+dz*dz<75*75 then
              local field,flag=poiBit(index)
              local mask=readNumber(player,field,0)
              if bit32.band(mask,flag)==0 then
                setNumber(player,field,bit32.bor(mask,flag))
                pcall(awardProgress,player,25,15)
                local total=0
                for i=1,#pois do
                  local f,b=poiBit(i)
                  if bit32.band(readNumber(player,f,0),b)~=0 then total+=1 end
                end
                local text="[기록 조각 "..total.."/"..#pois.."] "..poi.Note.."\n수호자를 쓰러뜨리면 보물을 열 수 있다."
                local chapters=Config.WorldMap.Chapters
                local chapterMask=readNumber(player,"ChapterMask",0)
                for ci,chapter in ipairs(chapters) do
                  local cflag=bit32.lshift(1,ci-1)
                  if total>=chapter.Need and bit32.band(chapterMask,cflag)==0 then
                    chapterMask=bit32.bor(chapterMask,cflag)
                    setNumber(player,"ChapterMask",chapterMask)
                    setNumber(player,"Coins",readNumber(player,"Coins",0)+chapter.Coins)
                    text=text.."\n\n— 기록 해금: "..chapter.Title.." —\n"..chapter.Text.."\n(보상 "..chapter.Coins.." 재화)"
                  end
                end
                do
                  local banter=meadowOil.poiBanter and meadowOil.poiBanter(player,poi.Kind)
                  if banter then text=text.."\n\n"..banter end
                end
                pcall(function() villageDialogue(player,"장소 발견 · "..poi.Name,text) end)
              end
            end
          end
        end
      end
    end
  end)
end

-- [동굴 던전 6곳 · 유물] 동굴 지점마다 지역에 맞는 지하 방으로 들어간다. 보스 상자는 유물 1개를 준다(유물 수×5% 공격 피해).
do
  local rooms={
    {name="해적 동굴",mobs={"rogue","roguehooded","tribal"},boss={"orc","동굴 해적왕",7,3.6},zones={"windcliff","meadow"},tier=3},
    {name="뿌리 밑 굴",mobs={"barbarian","spider","wolf"},boss={"barbarian","뿌리의 군주 · 거대 늑대인간",8,4},zones={"worldtree"},tier=4},
    {name="용암 갱도",mobs={"orc","skullorc","demon"},boss={"demon","갱도의 군주 · 용암 악마",8,4.6},zones={"volcano"},tier=6},
    {name="모래 무덤",mobs={"fangspider","assassin","raptor"},boss={"raptor","무덤의 폭군 · 거대 랩터",8,4.4},zones={"oasis","desert"},tier=6},
    {name="독 늪 동굴",mobs={"toad","rogue","spider"},boss={"toad","늪 동굴의 왕 · 거대 두꺼비",6,3.8},zones={"swamp","wetland","deadmarsh"},tier=7},
    {name="혼돈의 균열 동굴",mobs={"demon","frostfiend","skullorc"},boss={"spiritgolem","균열의 수호자 · 망령 골렘",9,5},zones={"citadel","highland","canyon","chaos"},tier=9},
  }
  local roomOfZone={}
  for index,room in ipairs(rooms) do for _,zone in ipairs(room.zones) do roomOfZone[zone]=index end end
  local drops={goblin={{"Ore",.4}},goblinscout={{"Hide",.4}},tribal={{"Moonbloom",.4}},beastman={{"Claw",.6},{"Hide",.5}},spider={{"Fang",.5}},wolf={{"Hide",.5}},
    orc={{"Ore",.5}},skullorc={{"Ore",.5},{"Magma",.3}},demon={{"Magma",.5},{"Crystal",.4}},fangspider={{"Fang",.6}},assassin={{"Claw",.5}},raptor={{"Hide",.5},{"Claw",.4}},
    toad={{"Mushroom",.6}},frostfiend={{"Crystal",.5}}}
  local returnTo={}
  task.spawn(function()
    task.wait(2)
    local terrain=workspace.Terrain
    for index in ipairs(rooms) do
      local cx=9300+index*400
      terrain:FillBlock(CFrame.new(cx,20,0),Vector3.new(190,64,190),Enum.Material.Slate)
      terrain:FillBlock(CFrame.new(cx,24,0),Vector3.new(170,44,170),Enum.Material.Air)
      for _,spot in ipairs({{-55,-55},{55,-55},{-55,55},{55,55},{0,0}}) do
        terrain:FillCylinder(CFrame.new(cx+spot[1],22,spot[2]),44,9,Enum.Material.Basalt)
        local lamp=Instance.new("Attachment");lamp.WorldPosition=Vector3.new(cx+spot[1],12,spot[2]+7);lamp.Parent=terrain
        local light=Instance.new("PointLight");light.Color=Color3.fromRGB(255,170,90);light.Range=48;light.Brightness=2.2;light.Parent=lamp
      end
    end
  end)
  for index,room in ipairs(rooms) do
    local cx=9300+index*400
    local random=Random.new(3300+index)
    for i,model in ipairs(room.mobs) do
      for _=1,2 do
        table.insert(meadowEncounterSites,{id="wolf",atom="HEAD_CANINE",model=model,tier=room.tier,height=model:find("spider") and 3.6 or 4.4,
          hp=1.8,dmg=1.3,drops=drops[model],dungeon=100+index,position=Vector3.new(cx+random:NextNumber(-65,65),3,random:NextNumber(-65,30))})
      end
    end
    table.insert(meadowEncounterSites,{id="wolf",atom="HEAD_CANINE",model=room.boss[1],name=room.boss[2],tier=room.tier+2,height=room.boss[3],
      hp=room.boss[4],dmg=2,alpha=true,dungeon=100+index,drops={{"Crystal",1,3},{"Ore",1,3}},position=Vector3.new(cx,3,-50)})
    local exitAnchor=Instance.new("Attachment");exitAnchor.WorldPosition=Vector3.new(cx,4,74);exitAnchor.Parent=workspace.Terrain
    local exit=Instance.new("ProximityPrompt");exit.ActionText="동굴 탈출";exit.ObjectText=room.name;exit.HoldDuration=.6
    exit.MaxActivationDistance=12;exit.RequiresLineOfSight=false;exit.Parent=exitAnchor
    exit.Triggered:Connect(function(player)
      local character=player.Character
      if character and character:FindFirstChild("HumanoidRootPart") then character:PivotTo(CFrame.new(returnTo[player] or Vector3.new(-110,6,-86))) end
    end)
    local chest=Instance.new("Attachment");chest.WorldPosition=Vector3.new(cx,4,-72);chest.Parent=workspace.Terrain
    local glow=Instance.new("ParticleEmitter");glow.Color=ColorSequence.new(Color3.fromRGB(255,226,120));glow.LightEmission=1
    glow.Rate=16;glow.Lifetime=NumberRange.new(2,3);glow.Size=NumberSequence.new(.8);glow.Parent=chest
    local open=Instance.new("ProximityPrompt");open.ActionText="유물 상자 열기";open.ObjectText=room.name;open.HoldDuration=.8
    open.MaxActivationDistance=12;open.RequiresLineOfSight=false;open.Parent=chest
    open.Triggered:Connect(function(player)
      local function say(text) pcall(function() villageDialogue(player,room.name,text) end) end
      for _,enemy in ipairs(enemies) do
        if enemy.dungeon==100+index and enemy.HP>0 and enemy.model.Parent then say("아직 몬스터가 남아 있다. 모두 처치해야 상자가 열린다.");return end
      end
      local flag=bit32.lshift(1,index-1)
      local mask=readNumber(player,"RelicMask",0)
      if bit32.band(mask,flag)~=0 then say("이미 유물을 가져갔다.");return end
      setNumber(player,"RelicMask",bit32.bor(mask,flag))
      setNumber(player,"Crystal",readNumber(player,"Crystal",0)+4)
      setNumber(player,"Ore",readNumber(player,"Ore",0)+4)
      pcall(awardProgress,player,200+index*70,150+index*50)
      say("유물을 얻었다: "..Config.WorldMap.Relics[index].."\n모든 공격 피해가 영구히 5% 오른다.")
    end)
  end
  -- 동굴 지점마다 입구.
  for index,poi in ipairs(Config.WorldMap.Pois) do
    local roomIndex=roomOfZone[poi.Zone]
    if poi.Kind=="cave" and roomIndex then
      local entry=Vector3.new(poi.X+10,3,poi.Z-10)
      task.spawn(function()
        task.wait(5+index*.1)
        local anchor=Instance.new("Attachment");anchor.WorldPosition=entry;anchor.Parent=workspace.Terrain
        local glow=Instance.new("ParticleEmitter");glow.Color=ColorSequence.new(Color3.fromRGB(120,120,150));glow.LightEmission=.5;glow.Rate=18
        glow.Lifetime=NumberRange.new(2,3);glow.Speed=NumberRange.new(1,3);glow.Size=NumberSequence.new(1.2);glow.Parent=anchor
        local prompt=Instance.new("ProximityPrompt");prompt.ActionText="동굴 진입";prompt.ObjectText=rooms[roomIndex].name.." (권장 단계 "..rooms[roomIndex].tier..")"
        prompt.HoldDuration=.6;prompt.MaxActivationDistance=12;prompt.RequiresLineOfSight=false;prompt.Parent=anchor
        prompt.Triggered:Connect(function(player)
          local character=player.Character
          if character and character:FindFirstChild("HumanoidRootPart") then
            returnTo[player]=entry+Vector3.new(0,5,0)
            character:PivotTo(CFrame.new(Vector3.new(9300+roomIndex*400,5,66)))
          end
        end)
      end)
    end
  end
end

-- [안식처 · 동료 12명] 마을 동쪽 언덕의 집. 동료는 각자의 사연 퀘스트로 모두 합류시킬 수 있고, 한 번에 최대 2명이 동행한다.
-- 성격 수치(대담·신중·탐욕·온정·충성)가 행동을 바꾸고, 두 동료의 호불호(상성)가 협동기 또는 불화를 만든다.
-- 동료는 쓰러지지 않는 핵심 인물이며 피해는 주인의 공격 판정으로 처리되어 보상·도감이 그대로 오른다.
-- 파티: 멀티플레이 최대 4인, 각자 동료 2명.
do
  local homePos=Vector3.new(262,3,205)
  local roster=Config.Companions
  local byId={}
  for index,c in ipairs(roster) do c.Index=index;byId[c.Id]=c end
  local followers={}
  local sessions={}
  local MAX_ACTIVE=2
  local lastBanter={}
  local function say(player,title,text,options) pcall(function() villageDialogue(player,title,text,options) end) end
  local function toast(player,text)
    player:SetAttribute("MeadowGearMessage",text)
    player:SetAttribute("MeadowGearRevision",(player:GetAttribute("MeadowGearRevision") or 0)+1)
  end
  local function activeCount(mask) local n=0 for i=1,#roster do if bit32.band(mask,bit32.lshift(1,i-1))~=0 then n+=1 end end return n end
  local function has(list,id) for _,v in ipairs(list) do if v==id then return true end end return false end
  -- 상성: +1 호감 · -1 반감 · 0 보통(한쪽이라도 싫어하면 반감).
  local function relation(a,b)
    if has(a.Dislikes,b.Id) or has(b.Dislikes,a.Id) then return -1 end
    if has(a.Likes,b.Id) or has(b.Likes,a.Id) then return 1 end
    return 0
  end
  meadowOil.joinCompanion=function(player,id,bond)
    local c=byId[id]
    if not c then return end
    setNumber(player,"CompanionOwned",bit32.bor(readNumber(player,"CompanionOwned",0),bit32.lshift(1,c.Index-1)))
    if bond then setNumber(player,"CompanionBond",bit32.bor(readNumber(player,"CompanionBond",0),bit32.lshift(1,c.Index-1))) end
  end
  meadowOil.companionIndex=function(id) return byId[id] and byId[id].Index or nil end
  -- 성격 기반 대사 생성.
  local function line(c,kind,other)
    local opts
    if kind=="engage" then
      opts=c.B>=8 and {"내가 먼저 간다!","피 냄새가 난다. 가자!"} or c.C>=8 and {"서두르지 마. 길목부터 살펴.","한 번에 하나씩, 침착하게."} or {"적이다. 준비해.","온다. 자리 잡아."}
    elseif kind=="danger" then
      opts=c.K>=8 and {"물러서! 내가 막을게!","다치면 안 돼, 숨 돌려!"} or c.L>=8 and {"버텨, 곁에 있어.","한 발도 물러서지 않겠다."} or c.G>=8 and {"죽으면 계산이 안 맞아. 물러서.","이득이 없잖아, 빠져!"} or {"위험해. 정신 차려!"}
    elseif kind=="good" and other then
      opts={other.Name.."와(과) 함께라 편하군.",other.Name..", 호흡이 잘 맞아.",other.Name.."가(이) 있어 든든해."}
    elseif kind=="bad" and other then
      opts={other.Name..", 네 방식은 내 취향이 아니야.",other.Name.."와(과) 같이 있으면 손발이 어긋나.",other.Name..", 제발 내 앞길 막지 마."}
    else
      opts={c.Worldview}
    end
    return c.Name..": \""..opts[math.random(#opts)].."\""
  end
  meadowOil.poiBanter=function(player,kind)
    local mask=readNumber(player,"CompanionActive",0)
    for _,c in ipairs(roster) do
      if bit32.band(mask,bit32.lshift(1,c.Index-1))~=0 then
        local fixed=Config.CompanionBanter[c.Id] and Config.CompanionBanter[c.Id][kind]
        if fixed then return c.Name..": \""..fixed.."\"" end
        local generic={
          ruin=c.C>=7 and "오래된 곳이야. 함정부터 살피자." or "이런 폐허, 보물이 있을 법한데?",
          cave=c.C>=7 and "입구가 좁아. 뒤를 조심해." or "어두울수록 재밌지!",
          camp=c.G>=7 and "남은 물건이 있나 보자." or "누가 급히 떠난 흔적이야.",
          shrine=c.K>=7 and "조용하고 맑은 곳이야. 잠깐 쉬어 가자." or "마력이 느껴져. 만지지 마.",
        }
        return c.Name..": \""..(generic[kind] or c.Worldview).."\""
      end
    end
    return nil
  end

  -- 집·화덕 + 동료 서식 자리(12명).
  task.spawn(function()
    task.wait(3)
    local house=worldAsset("villageHouseD",homePos+Vector3.new(0,0,30),16)
    if house then house.Name="Homestead_House";house:SetAttribute("MeadowScenery",true) end
    local anchor=Instance.new("Attachment");anchor.Name="Homestead_Hearth";anchor.WorldPosition=homePos+Vector3.new(0,.5,0);anchor.Parent=workspace.Terrain
    local fire=Instance.new("ParticleEmitter");fire.Color=ColorSequence.new(Color3.fromRGB(255,150,60));fire.LightEmission=1;fire.Rate=24
    fire.Lifetime=NumberRange.new(.6,1.1);fire.Speed=NumberRange.new(2,4);fire.Size=NumberSequence.new({NumberSequenceKeypoint.new(0,1.1),NumberSequenceKeypoint.new(1,0)})
    fire.EmissionDirection=Enum.NormalId.Top;fire.Parent=anchor
    local light=Instance.new("PointLight");light.Color=Color3.fromRGB(255,170,90);light.Range=34;light.Brightness=2.6;light.Parent=anchor
    local rest=Instance.new("ProximityPrompt");rest.ActionText="화덕 곁에서 쉬기";rest.ObjectText="안식처";rest.HoldDuration=.8
    rest.MaxActivationDistance=12;rest.RequiresLineOfSight=false;rest.Parent=anchor
    rest.Triggered:Connect(function(player)
      local humanoid=player.Character and player.Character:FindFirstChildOfClass("Humanoid")
      if humanoid and humanoid.Health>0 then
        humanoid.Health=humanoid.MaxHealth
        player:SetAttribute("MeadowStamina",100)
        local mask=readNumber(player,"CompanionOwned",0)
        local lineText="화덕 곁에서 푹 쉬었다. 체력과 기력이 모두 찼다."
        local pick=nil
        for _,c in ipairs(roster) do
          if bit32.band(mask,bit32.lshift(1,c.Index-1))~=0 and math.random()<.5 then pick=c end
        end
        if pick then lineText=lineText.."\n\n"..pick.Name..": \""..pick.Worldview.."\"" end
        say(player,"안식처",lineText)
      end
    end)
    for index,c in ipairs(roster) do
      -- [동료 배치] 일렬로 서 있던 12명을 화덕 둘레에 둥글게(반지름은 사람마다 조금씩 다르게) 세워 모닥불을 바라보게 한다.
      local angle=(index-1)/#roster*math.pi*2+math.sin(index*2.3)*.12
      local ringRadius=15+math.sin(index*1.7)*3.2
      local spot=homePos+Vector3.new(math.cos(angle)*ringRadius,0,math.sin(angle)*ringRadius-4)
      local stand=Instance.new("Attachment");stand.Name="Homestead_"..c.Id;stand.WorldPosition=spot+Vector3.new(0,3,0);stand.Parent=workspace.Terrain
      local mark=Instance.new("ParticleEmitter");mark.Color=ColorSequence.new(Color3.fromRGB(255,236,170));mark.LightEmission=1;mark.Rate=6
      mark.Lifetime=NumberRange.new(2,3);mark.Size=NumberSequence.new(.5);mark.EmissionDirection=Enum.NormalId.Top;mark.Parent=stand
      pcall(function()
        local npc
        if c.Model then npc=worldAsset(c.Model,spot,c.Height)
        else
          local desc=Instance.new("HumanoidDescription")
          local skin=Color3.fromRGB(c.Skin[1],c.Skin[2],c.Skin[3])
          desc.HeadColor=skin;desc.LeftArmColor=skin;desc.RightArmColor=skin;desc.TorsoColor=Color3.fromRGB(c.Shirt[1],c.Shirt[2],c.Shirt[3])
          desc.LeftLegColor=Color3.fromRGB(60,56,52);desc.RightLegColor=Color3.fromRGB(60,56,52)
          npc=Players:CreateHumanoidModelFromDescriptionAsync(desc,Enum.HumanoidRigType.R15)
          desc:Destroy()
          local lookAtFire=Vector3.new(homePos.X,spot.Y+3.2,homePos.Z)
          npc:PivotTo(CFrame.lookAt(spot+Vector3.new(0,3.2,0),lookAtFire))
          -- 루트만 고정하고 나머지는 풀어 둬야 공식 대기 애니메이션이 팔다리를 움직인다(전신 고정이면 T자세로 굳는다).
          for _,part in ipairs(npc:GetDescendants()) do
            if part:IsA("BasePart") then part.Anchored=(part.Name=="HumanoidRootPart") end
          end
          npc.Parent=workspace
          local hum=npc:FindFirstChildOfClass("Humanoid")
          if hum then
            hum.DisplayName=c.Name
            pcall(function()
              local animator=hum:FindFirstChildOfClass("Animator") or Instance.new("Animator",hum)
              local anim=Instance.new("Animation")
              anim.AnimationId="rbxassetid://507766388" -- Roblox 공식 R15 대기(숨쉬기)
              local track=animator:LoadAnimation(anim)
              anim:Destroy()
              track.Looped=true
              track:Play(.3)
              track.TimePosition=(index*.37)%1 -- 12명이 같은 박자로 숨 쉬지 않게 어긋나게 시작
              _G.MeadowNpcLife(npc,animator,npc:GetPivot(),index)
            end)
          end
        end
        if npc then npc.Name="Homestead_NPC_"..c.Id end
      end)
      local prompt=Instance.new("ProximityPrompt");prompt.ActionText="대화";prompt.ObjectText=c.Name.." · "..c.Role;prompt.HoldDuration=.4
      prompt.MaxActivationDistance=12;prompt.RequiresLineOfSight=false;prompt.Parent=stand
      prompt.Triggered:Connect(function(player)
        if player:GetAttribute("ProfileReady")~=true then return end
        sessions[player]={id=c.Id,expires=os.clock()+40}
        local owned=bit32.band(readNumber(player,"CompanionOwned",0),bit32.lshift(1,c.Index-1))~=0
        local active=bit32.band(readNumber(player,"CompanionActive",0),bit32.lshift(1,c.Index-1))~=0
        local title=c.Name.." · "..c.Role
        if not owned then
          say(player,title,"아직 만나지 못한 인물이다.\n만날 곳: "..c.Where.."\n\"".. c.Worldview .."\"");return
        end
        local bond=bit32.band(readNumber(player,"CompanionBond",0),bit32.lshift(1,c.Index-1))~=0
        local likes,dislikes={},{}
        for _,id in ipairs(c.Likes) do likes[#likes+1]=byId[id] and byId[id].Name or id end
        for _,id in ipairs(c.Dislikes) do dislikes[#dislikes+1]=byId[id] and byId[id].Name or id end
        local profile=string.format("\"%s\"\n\n대담 %d · 신중 %d · 탐욕 %d · 온정 %d · 충성 %d\n유대: %s\n좋아함: %s / 꺼림: %s",
          c.Worldview,c.B,c.C,c.G,c.K,c.L,bond and "가깝다" or "거리를 둔다",table.concat(likes,", "),table.concat(dislikes,", "))
        say(player,title,profile,{{label=active and "집에서 쉬게 하기" or "동행하기",action="co:toggle"}})
      end)
    end
  end)

  remote.OnServerEvent:Connect(function(player,action)
    if action~="co:toggle" then return end
    local session=sessions[player]
    if not session or os.clock()>session.expires then return end
    sessions[player]=nil
    local c=byId[session.id]
    local root=player.Character and player.Character:FindFirstChild("HumanoidRootPart")
    if not c or not root or (root.Position-homePos).Magnitude>80 then return end
    local flag=bit32.lshift(1,c.Index-1)
    if bit32.band(readNumber(player,"CompanionOwned",0),flag)==0 then return end
    local activeMask=readNumber(player,"CompanionActive",0)
    if bit32.band(activeMask,flag)~=0 then
      setNumber(player,"CompanionActive",bit32.band(activeMask,bit32.bnot(flag)))
      say(player,c.Name,"집에서 기다릴게.")
    else
      if activeCount(activeMask)>=MAX_ACTIVE then say(player,c.Name,"동행은 최대 "..MAX_ACTIVE.."명이야. 다른 동료를 먼저 쉬게 해 줘.");return end
      -- 상성 예고.
      local note=""
      for _,other in ipairs(roster) do
        if bit32.band(activeMask,bit32.lshift(1,other.Index-1))~=0 then
          local r=relation(c,other)
          note=r>0 and ("\n"..other.Name.."와(과) 호흡이 좋다. 협동기가 강해진다.") or r<0 and ("\n"..other.Name.."와(과) 사이가 나쁘다. 불화가 생길 수 있다.") or "\n"..other.Name.."와(과) 보통 사이다."
        end
      end
      setNumber(player,"CompanionActive",bit32.bor(activeMask,flag))
      say(player,c.Name,"좋아, 같이 가자."..note)
    end
  end)

  local function spawnFollower(player,c)
    local root=player.Character and player.Character:FindFirstChild("HumanoidRootPart")
    if not root then return nil end
    local pos=root.Position+Vector3.new(c.Index%2==0 and 5 or -5,0,5)
    local model
    local ok=pcall(function()
      if c.Model then model=worldAsset(c.Model,pos,c.Height)
      else
        local desc=Instance.new("HumanoidDescription")
        local skin=Color3.fromRGB(c.Skin[1],c.Skin[2],c.Skin[3])
        desc.HeadColor=skin;desc.LeftArmColor=skin;desc.RightArmColor=skin;desc.TorsoColor=Color3.fromRGB(c.Shirt[1],c.Shirt[2],c.Shirt[3])
        desc.LeftLegColor=Color3.fromRGB(60,56,52);desc.RightLegColor=Color3.fromRGB(60,56,52)
        model=Players:CreateHumanoidModelFromDescriptionAsync(desc,Enum.HumanoidRigType.R15)
        desc:Destroy()
        model.Name="Companion_"..c.Id
        local humanoid=model:FindFirstChildOfClass("Humanoid")
        if humanoid then humanoid.DisplayName=c.Name;humanoid.WalkSpeed=19;humanoid.DisplayDistanceType=Enum.HumanoidDisplayDistanceType.Viewer end
        -- R15 동료도 공식 대기/걷기 동작을 Animator로 재생해 미끄러지듯 움직이지 않게 한다.
        if humanoid then
          local animator=humanoid:FindFirstChildOfClass("Animator") or Instance.new("Animator")
          animator.Parent=humanoid
          local tracks={}
          for name,asset in pairs({idle=507766388,walk=507777826,run=507767714}) do
            local anim=Instance.new("Animation");anim.AnimationId="rbxassetid://"..asset
            local loaded,track=pcall(function() return animator:LoadAnimation(anim) end)
            if loaded and track then track.Looped=true;track.Priority=Enum.AnimationPriority.Movement;tracks[name]=track end
            anim:Destroy()
          end
          if tracks.idle then tracks.idle:Play(.2) end
          humanoid.Running:Connect(function(speed)
            local moving=speed>1.2
            local gait=speed>12 and tracks.run or tracks.walk
            for _,key in ipairs({"walk","run"}) do
              local t=tracks[key]
              if t and t.IsPlaying and (not moving or t~=gait) then t:Stop(.15) end
            end
            if moving and gait and not gait.IsPlaying then gait:Play(.15) end
            if tracks.idle then
              if moving and tracks.idle.IsPlaying then tracks.idle:Stop(.15)
              elseif not moving and not tracks.idle.IsPlaying then tracks.idle:Play(.2) end
            end
          end)
        end
        model:PivotTo(CFrame.new(pos+Vector3.new(0,3,0)))
        model.Parent=workspace
        local hrp=model:FindFirstChild("HumanoidRootPart")
        if hrp then pcall(function() hrp:SetNetworkOwner(nil) end) end
      end
    end)
    if not ok or not model then return nil end
    model:SetAttribute("CompanionOf",player.UserId)
    return {model=model,c=c,nextAct=os.clock()+2,nextScav=os.clock()+40,nextKind=os.clock()+18}
  end

  task.spawn(function()
    local nextCombo={}
    while true do
      task.wait(.25)
      for _,player in ipairs(Players:GetPlayers()) do
        local list=followers[player]
        if not list then list={};followers[player]=list end
        local root=player.Character and player.Character:FindFirstChild("HumanoidRootPart")
        local humanoid=player.Character and player.Character:FindFirstChildOfClass("Humanoid")
        local ready=player:GetAttribute("ProfileReady")==true
        local mask=ready and readNumber(player,"CompanionActive",0) or 0
        local bondMask=ready and readNumber(player,"CompanionBond",0) or 0
        local present={}
        for _,c in ipairs(roster) do
          local flag=bit32.lshift(1,c.Index-1)
          local entry=list[c.Id]
          if bit32.band(mask,flag)~=0 and root and humanoid and humanoid.Health>0 then
            if not entry or not entry.model.Parent then
              if not (entry and entry.loading) then
                list[c.Id]={loading=true}
                task.spawn(function() list[c.Id]=spawnFollower(player,c) end)
              end
            elseif not entry.loading then
              present[#present+1]=entry
              local model=entry.model
              local pivot=model:GetPivot().Position
              -- 신중한 동료는 한 발 뒤, 대담한 동료는 앞쪽에 선다.
              local lead=(c.B-c.C)*.7
              local goal=root.Position+root.CFrame.LookVector*lead+Vector3.new(c.Index%2==0 and 5 or -5,0,0)
              local distance=(pivot-goal).Magnitude
              local hum=model:FindFirstChildOfClass("Humanoid")
              if distance>70 then
                model:PivotTo(CFrame.new(goal+Vector3.new(0,3,0)))
              elseif hum then
                if distance>4 then hum:MoveTo(goal) end
              elseif distance>4 then
                local step=(goal-pivot).Unit*math.min(distance,19*.25)
                local nextPos=Vector3.new(pivot.X+step.X,root.Position.Y,pivot.Z+step.Z)
                model:PivotTo(CFrame.lookAt(nextPos,nextPos+Vector3.new(step.X,0,step.Z)))
              end
              -- 위험 대사.
              if humanoid.Health<humanoid.MaxHealth*.35 and os.clock()-(lastBanter[player] or 0)>18 then
                lastBanter[player]=os.clock();toast(player,line(c,"danger"))
              end
              if os.clock()>=entry.nextAct then
                entry.nextAct=os.clock()+c.Interval*(1-c.B/40)
                local bondBoost=bit32.band(bondMask,flag)~=0 and 1.15 or 1
                if c.Arch=="healer" then
                  if humanoid.Health<humanoid.MaxHealth*.7 then humanoid.Health=math.min(humanoid.MaxHealth,humanoid.Health+humanoid.MaxHealth*.2*bondBoost) end
                elseif c.Arch=="bard" then
                  if #enemies>0 and (meadowFocusUntil[player] or 0)<os.clock() then
                    meadowFocusUntil[player]=os.clock()+10
                    toast(player,c.Name..": \"♪ 용기의 노래 ♪\" (10초간 공격 피해 증가)")
                  end
                else
                  local best,bestDistance=nil,c.Range*(1+c.B/30)+4
                  for _,enemy in ipairs(enemies) do
                    if enemy.HP>0 and enemy.model.Parent then
                      local d=(enemy.position-pivot).Magnitude
                      if d<bestDistance and (enemy.position-root.Position).Magnitude<60 then best,bestDistance=enemy,d end
                    end
                  end
                  if best then
                    if os.clock()-(lastBanter[player] or 0)>25 then lastBanter[player]=os.clock();toast(player,line(c,"engage")) end
                    entry.target=best
                    pcall(applyMeadowDamage,player,best,math.floor((c.Dmg+best.maxHP*.015)*bondBoost))
                  end
                end
              end
              -- 온정: 가끔 소량 회복 · 탐욕: 길에서 재화를 주워 온다.
              if c.K>=7 and os.clock()>=entry.nextKind then
                entry.nextKind=os.clock()+18
                if humanoid.Health<humanoid.MaxHealth*.9 then humanoid.Health=math.min(humanoid.MaxHealth,humanoid.Health+humanoid.MaxHealth*.04) end
              end
              if c.G>=7 and os.clock()>=entry.nextScav then
                entry.nextScav=os.clock()+40
                local coins=math.random(2,5)
                setNumber(player,"Coins",readNumber(player,"Coins",0)+coins)
                toast(player,c.Name..": \"길가에 이런 게 떨어져 있더군.\" (+"..coins.." 재화)")
              end
            end
          elseif entry then
            if entry.model and entry.model.Parent then entry.model:Destroy() end
            list[c.Id]=nil
          end
        end
        -- 협동기 / 불화: 동행 2명의 상성과 병과로 결정.
        if #present==2 and root and humanoid then
          local a,b=present[1].c,present[2].c
          local rel=relation(a,b)
          local ta,tb=present[1].target,present[2].target
          local target=ta and ta.HP>0 and ta or tb
          if target and target.HP>0 and os.clock()>=(nextCombo[player] or 0) then
            nextCombo[player]=os.clock()+14
            local archs={[a.Arch]=true,[b.Arch]=true}
            if rel<0 and math.random()<.5 then
              toast(player,line(a,"bad",b))
              present[1].nextAct+=2;present[2].nextAct+=2 -- 불화: 공격이 잠시 늦어진다.
            else
              local power=rel>0 and 1.35 or 1
              local label
              if archs.tank then
                local ff=Instance.new("ForceField");ff.Visible=false;ff.Parent=player.Character
                task.delay(4*power,function() if ff.Parent then ff:Destroy() end end);label="방패 엄호"
              elseif archs.healer then
                humanoid.Health=math.min(humanoid.MaxHealth,humanoid.Health+humanoid.MaxHealth*.25*power);label="치유의 가호"
              elseif archs.bard then
                meadowFocusUntil[player]=os.clock()+12*power;label="합주"
              elseif archs.mage then
                for _,enemy in ipairs(enemies) do
                  if enemy.HP>0 and enemy.model.Parent and (enemy.position-target.position).Magnitude<16 then
                    pcall(applyMeadowDamage,player,enemy,math.floor(24*power))
                  end
                end
                label="마력 폭발"
              elseif archs.ranged and (archs.melee or archs.rogue) then
                pcall(applyMeadowDamage,player,target,math.floor(34*power));label="엇갈린 일격"
              elseif archs.rogue then
                pcall(applyMeadowDamage,player,target,math.floor(30*power));label="급소 일격"
              else
                pcall(applyMeadowDamage,player,target,math.floor(26*power));label="합동 공격"
              end
              if rel>0 then toast(player,line(a,"good",b).."  [협동: "..label.."]")
              else toast(player,a.Name.."×"..b.Name.." ["..label.."]") end
            end
          end
        end
      end
    end
  end)
  Players.PlayerRemoving:Connect(function(player)
    for _,entry in pairs(followers[player] or {}) do
      if entry.model and entry.model.Parent then entry.model:Destroy() end
    end
    followers[player]=nil
    lastBanter[player]=nil
  end)
end

-- [지역 명명 보스] 지역마다 3명의 이름 있는 보스. 메인 퀘스트의 보스 처치 판정에는 포함되지 않는다.
do
  local names={
    windcliff={"절벽의 사냥왕","해풍 도적단장","폭풍의 주술사"},meadow={"들판의 붉은 우두머리","초원 약탈단 두목","달빛 아래의 사냥꾼"},
    worldtree={"뿌리 밑의 방랑자","이끼 낀 거인","오래된 숲의 저주"},volcano={"화염의 집행관","재의 군주","용암 파수꾼"},
    oasis={"모래무덤의 지배자","사막의 그림자","오벨리스크 수호자"},swamp={"안개의 마녀 사냥꾼","늪의 식인왕","독안개 군주"},
    citadel={"성채 근위대장","불의 형리","몰락한 기사단장"},highland={"고원의 서리왕","바위 파괴자","늑대인간 무리장"},
    canyon={"협곡의 해골왕","붉은 칼날","협곡 독수리 사냥꾼"},chaos={"균열의 마수","혼돈의 대장","심연의 문지기"},
    wetland={"늪지의 대두꺼비","습원 고블린 대왕","안개 속의 포식자"},desert={"모래 폭군","황금 전갈의 주인","신기루 사냥꾼"},
    deadmarsh={"죽은 늪의 성자","썩은 숲의 왕","망령 사제"},
  }
  local models={windcliff={"rogue","tribal","orc"},meadow={"wolf","roguehooded","barbarian"},worldtree={"barbarian","spider","chieftain"},
    volcano={"skullorc","demon","orc"},oasis={"raptor","assassin","bladespider"},swamp={"tribal","toad","rogue"},
    citadel={"orc","demon","skullorc"},highland={"yeti","barbarian","orc"},canyon={"skullorc","assassin","raptor"},
    chaos={"demon","frostfiend","skullorc"},wetland={"toad","rogue","spider"},desert={"raptor","fangspider","assassin"},
    deadmarsh={"tribal","demon","spider"}}
  local tiers={windcliff=3,meadow=2,worldtree=4,volcano=6,oasis=7,swamp=7,citadel=10,highland=5,canyon=7,chaos=9,wetland=4,desert=7,deadmarsh=9}
  local random=Random.new(5521)
  local village=Config.WorldMap.Village
  local count=0
  for _,zone in ipairs(Config.WorldMap.Zones) do
    for i=1,3 do
      local x,z=Config.WorldMap.RandomPoint(zone.Id,random,80)
      if x and not (x>village.X0-100 and x<village.X1+100 and z>village.Z0-100 and z<village.Z1+100) then
        table.insert(meadowEncounterSites,{id="wolf",atom="HEAD_CANINE",model=models[zone.Id][i],name="명명 보스 · "..names[zone.Id][i],
          tier=math.min(10,tiers[zone.Id]+1),height=7.5,hp=3.4+i*.5,dmg=1.8+i*.15,alpha=true,bonusBoss=true,zoneTag=zone.Id,named=true,
          drops={{"Crystal",1,2+i},{"Claw",.7,2},{"Hide",.9,3},{"Ore",.6,2}},position=Vector3.new(x,3,z)})
        count+=1
      end
    end
  end
  workspace:SetAttribute("NamedBossCount",count)
end

-- [인간형 영주 · 약탈단 요새] 지역마다 인간형 영주 1명이 부하 4명과 함께 요새를 차지한다. 영주를 잡으면 요새 보물(고급 재료)이 떨어진다.
-- 모델은 등록된 인간형 mon_*(오크·해골오크·부족전사·암살자·야수인간·고블린·족장·악마)만 사용한다.
do
  local lords={
    windcliff={"해풍 요새의 영주 바르간","king","knight"},meadow={"붉은 깃발 대장 로크","knightchar","rogue"},
    worldtree={"숲의 파수 영주 엘더우드","barbarian","chieftain"},volcano={"홍염 기사단 잔당 카일","skullorc","orc"},
    oasis={"사막 상단의 지배자 자파르","king","adventurer"},swamp={"늪 마녀단의 수장 모르가나","witch","farmer"},
    citadel={"몰락한 성주 아이젠","knight","skwarrior"},highland={"고원 족장 보르가","chieftain","yeti"},
    canyon={"협곡 군벌 라자크","barbarian","roguehooded"},chaos={"혼돈 사도 벨리알","mage","skmage"},
    wetland={"습원 도적왕 그림","king","rogue"},desert={"모래 칼날 단장 아마르","adventurer","roguehooded"},
    deadmarsh={"죽은 늪의 사제왕 말라크","skmage","skwarrior"}}
  local tiers={windcliff=3,meadow=2,worldtree=4,volcano=6,oasis=7,swamp=7,citadel=10,highland=5,canyon=7,chaos=9,wetland=4,desert=7,deadmarsh=9}
  local random=Random.new(7001)
  local village=Config.WorldMap.Village
  local forts=0
  for _,zone in ipairs(Config.WorldMap.Zones) do
    local info=lords[zone.Id]
    local x,z=Config.WorldMap.RandomPoint(zone.Id,random,160)
    if info and x and not (x>village.X0-200 and x<village.X1+200 and z>village.Z0-200 and z<village.Z1+200) then
      local center=Vector3.new(x,3,z)
      workspace:SetAttribute("LordSeat_"..zone.Id,Vector3.new(x,0,z))
      workspace:SetAttribute("LordName_"..zone.Id,info[1])
      table.insert(meadowEncounterSites,{id="wolf",atom="HEAD_CANINE",model=info[2],name="영주 · "..info[1],
        tier=math.min(10,tiers[zone.Id]+1),height=9,hp=5.5,dmg=2.4,alpha=true,bonusBoss=true,zoneTag=zone.Id,named=true,lord=true,
        drops={{"Crystal",1,5},{"Claw",1,3},{"Ore",1,4},{"Hide",1,4}},position=center})
      for k=1,4 do
        local a=k*math.pi/2+.4
        table.insert(meadowEncounterSites,{id="wolf",atom="HEAD_CANINE",model=info[3],name="약탈단원 · "..info[1]:match("^(%S+)"),
          tier=tiers[zone.Id],height=5.2,hp=1.6,dmg=1.2,zoneTag=zone.Id,
          drops={{"Hide",.7,2},{"Ore",.4,1}},position=center+Vector3.new(math.cos(a)*18,0,math.sin(a)*18)})
      end
      -- [영주 성채] 영주 자리 둘레에 지역 성격에 맞는 방벽·탑·야영 소품을 세운다(등록된 CC0 모델만).
      task.spawn(function()
        while workspace:GetAttribute("OpenWorldReady")~=true do task.wait(3) end
        local castle={windcliff=1,oasis=1,citadel=1,canyon=1,desert=1,deadmarsh=1,chaos=1}
        local parts
        if castle[zone.Id] then
          parts={{"vxCastleGate",0,-34,15,0},{"vxCastleCorner",-34,-34,12,0},{"vxCastleCorner",34,-34,12,1.57},
            {"vxCastleWall",-34,6,9,1.57},{"vxCastleWall",34,6,9,1.57},{"vxCastleCorner",-34,34,12,-1.57},{"vxCastleCorner",34,34,12,3.14},
            {"vxTowerBase",0,40,16,0},{"vxCastlePillar",-14,-26,11,0},{"vxCastlePillar",14,-26,11,0},{"vxCampfirePit",0,8,2.6,0}}
        else
          parts={{"vxPoles",-30,-20,5,0},{"vxPoles",30,-20,5,0},{"vxPoles",0,36,5,0},{"vxCampfirePit",0,10,2.6,0},{"vxCampfirePit",-18,-4,2.4,0},
            {"vxStall",22,12,4,0.8},{"vxRockLarge",-34,22,10,0},{"vxRockWide",34,28,8,0},{"vxTreeLog",-22,34,3.5,0.6}}
        end
        local rp=RaycastParams.new();rp.FilterType=Enum.RaycastFilterType.Include;rp.FilterDescendantsInstances={workspace.Terrain}
        for k,spec in ipairs(parts) do
          local pos=center+Vector3.new(spec[2],0,spec[3])
          local hit=workspace:Raycast(Vector3.new(pos.X,400,pos.Z),Vector3.new(0,-800,0),rp)
          if hit then
            local m=worldAsset(spec[1],hit.Position,spec[4])
            if m then
              m.Name="LordKeep_"..zone.Id.."_"..k;m:SetAttribute("MeadowScenery",true)
              if spec[5]~=0 then pcall(function() m:PivotTo(m:GetPivot()*CFrame.Angles(0,spec[5],0)) end) end
            end
          else warn("LORD_KEEP_GROUND_UNVERIFIED "..zone.Id) break end
        end
      end)
      local anchor=Instance.new("Attachment");anchor.Name="LordFort_"..zone.Id;anchor.WorldPosition=center+Vector3.new(0,4,0);anchor.Parent=workspace.Terrain
      local smoke=Instance.new("ParticleEmitter");smoke.Color=ColorSequence.new(Color3.fromRGB(120,100,90));smoke.Rate=6
      smoke.Lifetime=NumberRange.new(5,7);smoke.Speed=NumberRange.new(8,12);smoke.EmissionDirection=Enum.NormalId.Top
      smoke.Size=NumberSequence.new(5);smoke.Transparency=NumberSequence.new(.5,1);smoke.Parent=anchor
      forts+=1
    end
  end
  workspace:SetAttribute("LordFortCount",forts)
end

-- [지역 야생 무리 · 길목 순찰] 지역마다 고유 몬스터 무리를 곳곳에 두고, 큰길에는 도적 순찰대를 둔다. 모델은 등록된 mon_*만 쓴다.
do
  local pools={windcliff={"rogue","roguehooded","tribal"},meadow={"wolf","fox","husky","keltir"},worldtree={"spider","wasp","fox","barbarian","fangspider"},
    volcano={"skullorc","demon","orc"},oasis={"raptor","bladespider","assassin"},swamp={"toad","snake","wasp","spider"},
    citadel={"orc","skullorc","demon"},highland={"yeti","wolf","bull","husky"},canyon={"skullorc","raptor","orc"},
    chaos={"demon","frostfiend","spiritgolem"},wetland={"toad","snake","rat","keltir"},desert={"snakeangry","fangspider","raptor","wasp"},
    deadmarsh={"skminion","skwarrior","spiritgolem","rat"}}
  local tiers={windcliff=3,meadow=2,worldtree=4,volcano=6,oasis=7,swamp=7,citadel=10,highland=5,canyon=7,chaos=9,wetland=4,desert=7,deadmarsh=9}
  local labels={rogue="도적",roguehooded="후드 도적",barbarian="야만인",tribal="부족 전사",wolf="들늑대",keltir="켈티르",spider="거미",fangspider="독니 거미",
    skullorc="해골 오크",demon="악마",orc="오크",raptor="랩터",bladespider="칼날거미",assassin="암살자",toad="독두꺼비",yeti="설인",frostfiend="서리 마귀",
    spiritgolem="영혼 골렘",chieftain="족장",fox="붉은 여우",husky="들개",bull="성난 황소",snake="독사",snakeangry="사막 코브라",wasp="거대 말벌",rat="역병 쥐",skminion="해골 졸개",skwarrior="해골 전사"}
  local random=Random.new(8123)
  local village=Config.WorldMap.Village
  local function outsideVillage(x,z) return not (x>village.X0-120 and x<village.X1+120 and z>village.Z0-120 and z<village.Z1+120) end
  local packs=0
  for _,zone in ipairs(Config.WorldMap.Zones) do
    local pool=pools[zone.Id]
    for g=1,14 do
      local x,z=Config.WorldMap.RandomPoint(zone.Id,random,100)
      if pool and x and outsideVillage(x,z) then
        local model=pool[(g-1)%#pool+1]
        local size=2+g%3
        for k=1,size do
          local a=k*math.pi*2/size
          local elite=(g%5==0 and k==1)
          table.insert(meadowEncounterSites,{id="wolf",atom="HEAD_CANINE",model=model,name=(elite and "우두머리 " or "")..(labels[model] or "몬스터"),tier=tiers[zone.Id]+(elite and 1 or 0),
            height=(elite and 6.5 or 4)+tiers[zone.Id]*.12,hp=elite and 3 or 1.2,dmg=elite and 1.6 or 1,alpha=elite or nil,zoneTag=zone.Id,
            drops={{"Hide",.6,2},{"Fang",.4,1}},position=Vector3.new(x+math.cos(a)*10,3,z+math.sin(a)*10)})
          packs+=1
        end
      end
    end
  end
  -- 큰길 순찰: 동서 큰길(z=0)과 남북 큰길(x=0, x=3000) 위 도적 순찰대.
  local patrol={}
  for x=-2000,6200,700 do table.insert(patrol,{x,(random:NextInteger(0,1)==0 and 1 or -1)*random:NextInteger(14,26)}) end
  for z=-2000,2000,800 do table.insert(patrol,{random:NextInteger(14,24),z});table.insert(patrol,{3000+random:NextInteger(14,24),z}) end
  for _,spot in ipairs(patrol) do
    local zoneId=Config.WorldMap.ZoneAt(spot[1],spot[2])
    if outsideVillage(spot[1],spot[2]) then
      for k=1,2 do
        table.insert(meadowEncounterSites,{id="wolf",atom="HEAD_CANINE",model=k==1 and "assassin" or "tribal",name=k==1 and "길목 도적" or "도적 궁수",
          tier=tiers[zoneId] or 3,height=5.2,hp=1.4,dmg=1.2,zoneTag=zoneId,drops={{"Hide",.6,2},{"Ore",.4,1}},
          position=Vector3.new(spot[1]+k*8,3,spot[2]+k*6)})
        packs+=1
      end
    end
  end
  workspace:SetAttribute("WildPackCount",packs)
end

-- [인간형 세력] 도적단 · 이단 교단 · 광신도 · 탈영 기사 · 노예상 · 흑마술 결사. 세력마다 이름·체력·공격 성향·전리품이 달라
-- 같은 모델이어도 다른 몬스터처럼 느껴진다. 모델은 등록된 인간형 mon_*만 쓴다.
do
  -- 구성원: {모델, 이름, 높이, hp배수, dmg배수, 드랍}
  local factions={
    bandit={"도적단",{{"rogue","칼잡이 도적",4.8,1.2,1.3,{{"Hide",.7,2},{"Ore",.5,1}}},{"roguehooded","후드 도적",4.8,1.5,1.2,{{"Hide",.7,2}}},{"rogue","소매치기",4.2,.9,.9,{{"Ore",.6,2}}}},
      {"king","도적 두목",7,4,1.9,{{"Crystal",1,3},{"Ore",1,3}}}},
    cult={"이단 교단",{{"farmer","이단 신도",4.8,1.1,1.1,{{"Moonbloom",.5,1}}},{"mage","피의 의식 사제",5,1.4,1.5,{{"Crystal",.6,2}}},{"orc","교단 집행자",6.2,2,1.5,{{"Hide",.7,2}}}},
      {"witch","대사제",6.5,4.5,2,{{"Crystal",1,5},{"Moonbloom",1,3}}}},
    fanatic={"미친 광신도",{{"punk","광란의 광신도",4.8,.8,2.2,{{"Claw",.6,2}}},{"barbarian","순교자",5,.7,2.6,{{"Fang",.6,2}}},{"orc","자학 수도사",6,1.8,1.6,{{"Hide",.7,2}}}},
      {"barbarian","광신의 예언자",7.5,3.8,2.4,{{"Crystal",1,4},{"Claw",1,3}}}},
    deserter={"탈영 기사단",{{"knight","탈영 기사",5,2.2,1.4,{{"Ore",.8,2}}},{"womansoldier","낙오 정찰병",4.6,1,1.2,{{"Hide",.7,2}}},{"knightchar","종자",4.4,.9,.9,{{"Ore",.5,1}}}},
      {"knight","탈영 기사단장",7.5,4,1.8,{{"Ore",1,5},{"Crystal",1,2}}}},
    slaver={"노예상단",{{"adventurer","채찍 감독관",4.8,1.3,1.4,{{"Hide",.7,2}}},{"orc","용병 호위",6.2,2,1.3,{{"Ore",.6,2}}},{"farmer","짐꾼",4.4,.8,.8,{{"Hide",.5,1}}}},
      {"king","노예상 우두머리",7.5,3.8,1.8,{{"Crystal",1,3},{"Hide",1,4}}}},
    undead={"무덤 군단",{{"skwarrior","해골 전사",4.8,1.6,1.4,{{"Claw",.6,2}}},{"skrogue","해골 도적",4.6,1,1.5,{{"Fang",.6,1}}},{"skminion","해골 졸개",4.2,.8,1,{{"Ore",.5,1}}}},
      {"skmage","해골 주술왕",7,4,2,{{"Crystal",1,5},{"Claw",1,3}}}},
    warlock={"흑마술 결사",{{"skmage","암흑 주술사",4.8,1,1.7,{{"Moonbloom",.6,2}}},{"demon","소환된 하수인",6.5,1.8,1.5,{{"Claw",.6,2}}},{"skrogue","그림자 암살자",4.6,1,1.8,{{"Fang",.6,1}}}},
      {"mage","결사의 흑마법사",7,4.2,2.2,{{"Crystal",1,6},{"Moonbloom",1,3}}}},
  }
  local byZone={windcliff={"bandit","slaver","deserter"},meadow={"bandit","deserter","cult"},worldtree={"cult","fanatic","bandit"},
    volcano={"fanatic","warlock","deserter"},oasis={"bandit","slaver","cult"},swamp={"cult","warlock","slaver"},
    citadel={"deserter","warlock","fanatic"},highland={"bandit","deserter","slaver"},canyon={"bandit","fanatic","slaver"},
    chaos={"warlock","fanatic","cult"},wetland={"slaver","bandit","cult"},desert={"bandit","slaver","fanatic"},deadmarsh={"undead","warlock","cult"}}
  byZone.chaos[#byZone.chaos+1]="undead";byZone.citadel[#byZone.citadel+1]="undead";byZone.volcano[#byZone.volcano+1]="undead";byZone.oasis[#byZone.oasis+1]="undead"
  local tiers={windcliff=3,meadow=2,worldtree=4,volcano=6,oasis=7,swamp=7,citadel=10,highland=5,canyon=7,chaos=9,wetland=4,desert=7,deadmarsh=9}
  local random=Random.new(9137)
  local village=Config.WorldMap.Village
  local camps=0
  for _,zone in ipairs(Config.WorldMap.Zones) do
    for _,key in ipairs(byZone[zone.Id] or {}) do
      for n=1,2 do
        local x,z=Config.WorldMap.RandomPoint(zone.Id,random,120)
        if x and not (x>village.X0-150 and x<village.X1+150 and z>village.Z0-150 and z<village.Z1+150) then
          local faction=factions[key]
          local tier=tiers[zone.Id]
          for k=1,4 do
            local m=faction[2][(k-1)%#faction[2]+1]
            local a=k*math.pi/2
            table.insert(meadowEncounterSites,{id="wolf",atom="HEAD_CANINE",model=m[1],name=faction[1].." · "..m[2],tier=tier,height=m[3],hp=m[4],dmg=m[5],
              zoneTag=zone.Id,drops=m[6],position=Vector3.new(x+math.cos(a)*12,3,z+math.sin(a)*12)})
          end
          local boss=faction[3]
          table.insert(meadowEncounterSites,{id="wolf",atom="HEAD_CANINE",model=boss[1],name=faction[1].." · "..boss[2],tier=math.min(10,tier+1),height=boss[3],
            hp=boss[4],dmg=boss[5],alpha=true,bonusBoss=true,zoneTag=zone.Id,named=true,drops=boss[6],position=Vector3.new(x,3,z)})
          camps+=1
        end
      end
    end
  end
  workspace:SetAttribute("FactionCampCount",camps)
end

-- [신화 괴물] 등록된 CC0 모델을 합쳐 만든 이름 있는 신화 보스. 지역마다 어울리는 괴물이 자리를 잡고 있다.
do
  local forms={
    hydra={name="다두 히드라",model="toad",height=6.5,hp=7,dmg=2.8,compose={
      {model="snakeangry",height=9,up=.55,fwd=-.1,side=-.3,pitch=-75},{model="snakeangry",height=10,up=.6,fwd=-.2,side=-.1,pitch=-80},
      {model="snakeangry",height=10,up=.6,fwd=-.2,side=.1,pitch=-80},{model="snakeangry",height=9,up=.55,fwd=-.1,side=.3,pitch=-75},
      {model="snakeangry",height=8,up=.5,fwd=.1,side=0,pitch=-70}},drops={{"Crystal",1,6},{"Fang",1,4},{"Moonbloom",1,3}}},
    centaur={name="켄타우로스 궁수",model="horse",height=5.5,hp=4,dmg=2.2,compose={{model="barbarian",height=4.6,up=.3,fwd=-.22}},
      drops={{"Hide",1,4},{"Crystal",.8,3}}},
    deathrider={name="죽음의 기사",model="horse",height=5.5,hp=5,dmg=2.6,compose={{model="skwarrior",height=4.8,up=.3,fwd=-.2}},
      drops={{"Claw",1,4},{"Crystal",1,4}}},
    arachne={name="거미 여왕 아라크네",model="spider",height=5,hp=6,dmg=2.5,compose={{model="witch",height=5.4,up=.35,fwd=-.18}},
      drops={{"Fang",1,5},{"Crystal",1,5},{"Moonbloom",.8,3}}},
    echidna={name="뱀 어머니 에키드나",model="snakeangry",height=4,hp=6,dmg=2.5,compose={{model="witch",height=6,up=.7,fwd=-.3}},
      drops={{"Crystal",1,5},{"Fang",1,4}}},
    cerberus={name="지옥견 케르베로스",model="husky",height=5.5,hp=6.5,dmg=2.7,compose={
      {model="husky",height=5,up=.45,fwd=-.18,side=-.3,yaw=12},{model="husky",height=5,up=.45,fwd=-.18,side=.3,yaw=-12}},
      drops={{"Claw",1,5},{"Magma",1,3},{"Crystal",1,4}}},
    medusa={name="석화의 메두사",model="witch",height=6.2,hp=5,dmg=2.6,compose={
      {model="snakeangry",height=2.6,up=.98,fwd=0,side=-.14,pitch=-60},{model="snakeangry",height=2.8,up=1,fwd=0,side=0,pitch=-80},
      {model="snakeangry",height=2.6,up=.98,fwd=0,side=.14,pitch=-60}},drops={{"Crystal",1,5},{"Moonbloom",1,4}}},
    frostgiant={name="서리 거인 왕",model="king",height=19,hp=9,dmg=3.2,compose={},drops={{"Crystal",1,8},{"Ore",1,5},{"Hide",1,5}}},
  }
  local placement={hydra={"wetland","swamp","deadmarsh"},centaur={"meadow","highland","canyon","worldtree","windcliff"},
    deathrider={"deadmarsh","citadel","chaos","volcano"},arachne={"worldtree","swamp","chaos"},echidna={"oasis","desert","canyon"},
    cerberus={"volcano","chaos","citadel","deadmarsh"},medusa={"oasis","desert","wetland"},frostgiant={"highland","chaos"}}
  local tiers={windcliff=3,meadow=2,worldtree=4,volcano=6,oasis=7,swamp=7,citadel=10,highland=5,canyon=7,chaos=9,wetland=4,desert=7,deadmarsh=9}
  local random=Random.new(9901)
  local village=Config.WorldMap.Village
  local count=0
  for key,zones in pairs(placement) do
    local form=forms[key]
    for _,zoneId in ipairs(zones) do
      local x,z=Config.WorldMap.RandomPoint(zoneId,random,140)
      if x and not (x>village.X0-200 and x<village.X1+200 and z>village.Z0-200 and z<village.Z1+200) then
        table.insert(meadowEncounterSites,{id="wolf",atom="HEAD_CANINE",model=form.model,name="신화 · "..form.name,tier=math.min(10,tiers[zoneId]+1),
          height=form.height,hp=form.hp,dmg=form.dmg,alpha=true,bonusBoss=true,zoneTag=zoneId,named=true,
          compose=#form.compose>0 and form.compose or nil,drops=form.drops,position=Vector3.new(x,3,z)})
        count+=1
      end
    end
  end
  workspace:SetAttribute("MythicBossCount",count)
end

-- [변종 괴물] 뼈대가 있는 모델 둘 이상을 합친 완전히 다른 몬스터. 본체의 뼈로 움직이고 덧붙인 조각은 몸에 고정된다.
-- 지역마다 2종씩 정예로 자리 잡는다. 이름과 외형, 공격 방식(style)이 모두 다르다.
do
  local variants={
    {key="twinhound",name="쌍두 사냥개 오르토스",model="wolf",height=4.8,hp=3,dmg=1.9,compose={{model="husky",height=4.4,up=.5,fwd=-.3,side=.22,yaw=10}},zones={"meadow","highland","windcliff"}},
    {key="gargoyle",name="날개 달린 가고일 군주",model="demon",height=8,hp=4,dmg=2.2,style="mage",compose={{model="spiritgolem",height=7,up=.7,fwd=.28}},zones={"volcano","citadel","chaos"}},
    {key="vampire",name="박쥐 날개 흡혈 와이트",model="skrogue",height=5,hp=3,dmg=2,style="rogue",compose={{model="spiritgolem",height=5,up=.65,fwd=.25}},zones={"deadmarsh","chaos","oasis"}},
    {key="twinogre",name="쌍생 거인 에틴",model="orc",height=8,hp=4.5,dmg=2.3,compose={{model="orc",height=7,up=.5,fwd=0,side=.38,yaw=-10}},zones={"canyon","highland","citadel"}},
    {key="forestqueen",name="사슴 탄 숲의 여왕",model="stag",height=5.6,hp=3.5,dmg=1.9,style="mage",compose={{model="witch",height=4.4,up=.4,fwd=-.1}},zones={"worldtree","wetland","meadow"}},
    {key="bullknight",name="철갑 황소 기사",model="bull",height=5,hp=4,dmg=2.2,compose={{model="knight",height=4.2,up=.38,fwd=-.05}},zones={"windcliff","canyon","highland"}},
    {key="wolfrider",name="늑대 기수 약탈자",model="wolf",height=4.6,hp=2.8,dmg=1.8,style="rogue",compose={{model="roguehooded",height=3.2,up=.4,fwd=0}},zones={"meadow","worldtree","highland"}},
    {key="skullcarrier",name="해골 짊어진 거인",model="orc",height=9,hp=4.2,dmg=2.3,compose={{model="skminion",height=3,up=.85,side=.25},{model="skminion",height=3,up=.85,side=-.25}},zones={"deadmarsh","volcano","swamp"}},
    {key="snakeshaman",name="독사 두른 오크 주술사",model="orc",height=7,hp=3.5,dmg=2,style="mage",compose={{model="snakeangry",height=5,up=.65,fwd=0,pitch=-65},{model="snakeangry",height=4.4,up=.7,fwd=-.1,side=.18,pitch=-70}},zones={"swamp","desert","wetland"}},
    {key="ratking",name="역병 쥐왕",model="rat",height=4.2,hp=3.5,dmg=1.8,compose={{model="rat",height=2,up=.6,side=-.2,fwd=.1},{model="rat",height=2,up=.6,side=.2,fwd=.1},{model="rat",height=2,up=.7,fwd=-.2}},zones={"wetland","deadmarsh","worldtree"}},
    {key="frosttwin",name="서리 머리 둘 설인",model="yeti",height=8,hp=4,dmg=2.2,compose={{model="wolf",height=3.6,up=.85,side=.28,fwd=-.1}},zones={"highland","chaos","canyon"}},
    {key="mireWitch",name="독거미 탄 마녀 아라크네아",model="fangspider",height=4,hp=3.4,dmg=2,style="mage",compose={{model="witch",height=4.6,up=.4,fwd=-.15}},zones={"swamp","worldtree","desert"}},
    {key="sandjackal",name="사막 자칼 전사",model="fox",height=5,hp=3,dmg=1.9,style="rogue",compose={{model="womansoldier",height=3.6,up=.4}},zones={"desert","oasis","canyon"}},
    {key="donkeyking",name="당나귀 탄 방랑 왕",model="donkey",height=4.4,hp=3,dmg=1.8,compose={{model="king",height=3.8,up=.4}},zones={"meadow","windcliff","wetland"}},
  }
  local tiers={windcliff=3,meadow=2,worldtree=4,volcano=6,oasis=7,swamp=7,citadel=10,highland=5,canyon=7,chaos=9,wetland=4,desert=7,deadmarsh=9}
  local random=Random.new(4417)
  local village=Config.WorldMap.Village
  local count=0
  for _,variant in ipairs(variants) do
    for _,zoneId in ipairs(variant.zones) do
      local x,z=Config.WorldMap.RandomPoint(zoneId,random,120)
      if x and not (x>village.X0-150 and x<village.X1+150 and z>village.Z0-150 and z<village.Z1+150) then
        table.insert(meadowEncounterSites,{id="wolf",atom="HEAD_CANINE",model=variant.model,name="변종 · "..variant.name,tier=tiers[zoneId]+1>10 and 10 or tiers[zoneId]+1,
          height=variant.height,hp=variant.hp,dmg=variant.dmg,alpha=true,zoneTag=zoneId,style=variant.style,compose=variant.compose,
          drops={{"Crystal",1,3},{"Hide",1,3},{"Fang",.7,2},{"Ore",.6,2}},position=Vector3.new(x,3,z)})
        count+=1
      end
    end
  end
  workspace:SetAttribute("VariantMonsterCount",count)
end

-- [용 · 유령 · 날개 악마] 뼈가 있는 CC0 몬스터를 비행·영혼·보스 역할로 배치한다.
-- 용과 날개 악마는 박쥐 AI(공중 선회·급강하), 유령은 유령 AI(떠다니며 덮침)를 쓴다.
do
  local tiers={windcliff=3,meadow=2,worldtree=4,volcano=6,oasis=7,swamp=7,citadel=10,highland=5,canyon=7,chaos=9,wetland=4,desert=7,deadmarsh=9}
  local random=Random.new(6603)
  local village=Config.WorldMap.Village
  local count=0
  local function place(zoneId,margin)
    local x,z=Config.WorldMap.RandomPoint(zoneId,random,margin or 120)
    if x and not (x>village.X0-180 and x<village.X1+180 and z>village.Z0-180 and z<village.Z1+180) then return x,z end
  end
  -- 용: 지역마다 다른 이름의 이름 있는 보스.
  local dragons={volcano="화염룡 이그니스",chaos="심연룡 나크라스",highland="서리 비룡 프로스트윙",desert="모래 비룡 사하르",citadel="흑룡 발레리온",
    canyon="붉은 협곡룡 라가르",deadmarsh="역병룡 모르브",swamp="독안개 비룡 베놈"}
  for zoneId,name in pairs(dragons) do
    local x,z=place(zoneId,160)
    if x then
      table.insert(meadowEncounterSites,{id="bat",atom="WING_LEATHER",model="dragon",name="용 · "..name,tier=math.min(10,tiers[zoneId]+2),height=13,hp=9,dmg=3,
        alpha=true,bonusBoss=true,named=true,lord=true,zoneTag=zoneId,drops={{"Crystal",1,8},{"Claw",1,6},{"Magma",.8,4},{"Hide",1,5}},position=Vector3.new(x,3,z)})
      count+=1
    end
  end
  -- 용기사: 용 등에 해골 전사를 태운 합성 보스.
  for _,zoneId in ipairs({"volcano","citadel","chaos"}) do
    local x,z=place(zoneId,180)
    if x then
      table.insert(meadowEncounterSites,{id="bat",atom="WING_LEATHER",model="dragon",name="용 · 해골 용기사",tier=math.min(10,tiers[zoneId]+2),height=11,hp=8,dmg=3,
        alpha=true,bonusBoss=true,named=true,zoneTag=zoneId,compose={{model="skwarrior",height=5,up=.75,fwd=-.05}},
        drops={{"Crystal",1,7},{"Claw",1,5},{"Magma",.8,3}},position=Vector3.new(x,3,z)})
      count+=1
    end
  end
  -- 유령 떼: 영혼 계열 몬스터(퇴마 오일에 약하다).
  local ghostNames={ghost={"떠도는 원혼","길 잃은 기사단원","저주받은 순례자"},ghostskull={"해골 망령","웃는 해골 영혼","죽은 사제의 그림자"}}
  for _,zoneId in ipairs({"deadmarsh","swamp","chaos","worldtree","citadel","oasis","wetland","canyon"}) do
    for g=1,3 do
      local x,z=place(zoneId,100)
      if x then
        local model=g==2 and "ghostskull" or "ghost"
        for k=1,3 do
          local a=k*math.pi*2/3
          table.insert(meadowEncounterSites,{id="ghost",atom="GHOST_WAIL",model=model,name="유령 · "..ghostNames[model][(g+k)%3+1],tier=tiers[zoneId],height=5.4,hp=1.3,dmg=1.3,
            zoneTag=zoneId,drops={{"Moonbloom",.6,2},{"Crystal",.4,1}},position=Vector3.new(x+math.cos(a)*9,3,z+math.sin(a)*9)})
          count+=1
        end
      end
    end
  end
  -- 날개 악마: 하늘에서 급강하하는 정예.
  for _,zoneId in ipairs({"volcano","chaos","citadel","deadmarsh","canyon"}) do
    for g=1,2 do
      local x,z=place(zoneId,120)
      if x then
        table.insert(meadowEncounterSites,{id="bat",atom="WING_LEATHER",model="wingdemon",name="날개 악마 · "..(g==1 and "불꽃 임프 대장" or "심연 급강하자"),tier=math.min(10,tiers[zoneId]+1),
          height=8,hp=3,dmg=2.1,alpha=true,zoneTag=zoneId,style="mage",drops={{"Magma",.8,3},{"Crystal",1,3},{"Claw",.7,2}},position=Vector3.new(x,3,z)})
        count+=1
      end
    end
  end
  workspace:SetAttribute("SkyMonsterCount",count)
end

-- [거대 괴수] 뼈가 있는 모델을 크게 키우고 합쳐 만든 지역 대형 보스. 키는 14~22스터드로 플레이어 5배 이상이다.
do
  local tiers={windcliff=3,meadow=2,worldtree=4,volcano=6,oasis=7,swamp=7,citadel=10,highland=5,canyon=7,chaos=9,wetland=4,desert=7,deadmarsh=9}
  local random=Random.new(7719)
  local village=Config.WorldMap.Village
  local count=0
  local function place(zoneId)
    local x,z=Config.WorldMap.RandomPoint(zoneId,random,200)
    if x and not (x>village.X0-220 and x<village.X1+220 and z>village.Z0-220 and z<village.Z1+220) then return x,z end
  end
  local colossi={
    {name="화염 거인 수르트",model="skullorc",height=20,hp=10,dmg=3.4,zones={"volcano","citadel"},drops={{"Magma",1,8},{"Crystal",1,7},{"Ore",1,6}}},
    {name="늪 거인 그렌델",model="toad",height=16,hp=8,dmg=3,zones={"swamp","wetland","deadmarsh"},drops={{"Crystal",1,6},{"Moonbloom",1,5},{"Hide",1,6}}},
    {name="동굴 트롤 왕",model="chieftain",height=15,hp=8.5,dmg=3.1,zones={"canyon","highland","windcliff"},drops={{"Ore",1,7},{"Hide",1,6},{"Crystal",1,5}}},
    {name="사막 선인장 거인 사보텐",model="cactoro",height=17,hp=8,dmg=2.9,zones={"desert","oasis"},drops={{"Crystal",1,6},{"Mushroom",1,6},{"Hide",1,5}}},
    {name="심연 어인 왕 다곤",model="fish",height=14,hp=7.5,dmg=3,zones={"wetland","swamp","deadmarsh"},drops={{"Crystal",1,6},{"Fang",1,5},{"Moonbloom",1,4}}},
    {name="원숭이닭 키마이라",model="monkroose",height=13,hp=7,dmg=3,zones={"worldtree","meadow","desert"},drops={{"Fang",1,5},{"Hide",1,6},{"Crystal",1,4}}},
    {name="폭풍 하피 여왕 로크",model="birb",height=12,hp=6.5,dmg=2.8,style="rogue",zones={"canyon","highland","windcliff"},drops={{"Claw",1,5},{"Crystal",1,5},{"Hide",1,5}}},
    {name="거신병 미라",model="yeti",height=22,hp=11,dmg=3.6,zones={"chaos","citadel"},drops={{"Crystal",1,9},{"Ore",1,7},{"Claw",1,6}}},
  }
  for _,col in ipairs(colossi) do
    for _,zoneId in ipairs(col.zones) do
      local x,z=place(zoneId)
      if x then
        table.insert(meadowEncounterSites,{id="wolf",atom="HEAD_CANINE",model=col.model,name="거대 괴수 · "..col.name,tier=math.min(10,tiers[zoneId]+2),height=col.height,
          hp=col.hp,dmg=col.dmg,alpha=true,bonusBoss=true,named=true,lord=true,zoneTag=zoneId,style=col.style,drops=col.drops,position=Vector3.new(x,3,z)})
        count+=1
      end
    end
  end
  -- 닌자 암살단(성채·혼돈·오아시스), 와이번(화산·협곡·고원), 바람 정령(바람 절벽·고원·협곡).
  for _,zoneId in ipairs({"citadel","chaos","oasis"}) do
    local x,z=place(zoneId)
    if x then
      for k=1,4 do
        local a=k*math.pi/2
        table.insert(meadowEncounterSites,{id="wolf",atom="HEAD_CANINE",model="ninja",name="그림자 닌자 · "..(k==1 and "수령" or "암살자"),tier=tiers[zoneId],height=k==1 and 6.4 or 5,
          hp=k==1 and 3 or 1.4,dmg=k==1 and 2.2 or 1.5,alpha=k==1 or nil,zoneTag=zoneId,style="rogue",drops={{"Claw",.7,2},{"Hide",.8,2}},
          position=Vector3.new(x+math.cos(a)*10,3,z+math.sin(a)*10)})
        count+=1
      end
    end
  end
  for _,zoneId in ipairs({"volcano","canyon","highland","chaos"}) do
    for g=1,2 do
      local x,z=place(zoneId)
      if x then
        table.insert(meadowEncounterSites,{id="bat",atom="WING_LEATHER",model="dragonlite",name="와이번 · "..(g==1 and "송곳니 사냥꾼" or "독침 와이번"),tier=math.min(10,tiers[zoneId]+1),height=8,
          hp=3.2,dmg=2.2,alpha=true,zoneTag=zoneId,drops={{"Claw",1,4},{"Hide",1,5},{"Crystal",.8,3}},position=Vector3.new(x,3,z)})
        count+=1
      end
    end
  end
  for _,zoneId in ipairs({"windcliff","highland","canyon","meadow"}) do
    local x,z=place(zoneId)
    if x then
      for k=1,2 do
        table.insert(meadowEncounterSites,{id="ghost",atom="GHOST_WAIL",model="hywirl",name="바람 정령 · 하이윌",tier=tiers[zoneId],height=6,hp=1.6,dmg=1.5,style="mage",
          zoneTag=zoneId,drops={{"Crystal",.7,2},{"Moonbloom",.6,2}},position=Vector3.new(x+k*8,3,z)})
        count+=1
      end
    end
  end
  workspace:SetAttribute("ColossusCount",count)
end

-- [홀드 마을] 4개 거점 마을. 집 4채 · 우물 · 가로등을 등록 CC0 모델로 세우고 R15 주민 3명(여관·상인·정보통)을 둔다.
-- 여관: 체력 회복. 상인: 남는 재료 판매. 정보통: 그 지역 미스터리 퀘스트의 현재 단서를 알려 준다.
do
  local houseKeys={"villageHouseA","villageHouseB","villageHouseC","villageHouseD"}
  local roles={
    {key="Inn",action="쉬기",look={skin={224,172,105},shirt={158,96,70}}},
    {key="Merchant",action="거래하기",look={skin={198,134,86},shirt={72,110,148}}},
    {key="Scout",action="이야기하기",look={skin={233,190,150},shirt={92,130,84}}},
  }
  local sellRates={Hide=6,Fang=8,Claw=12,Mushroom=4}
  local function lineFor(town)
    local fieldByTown={windcliff="wind",highland="hunt",wetland="bog",worldtree="root"}
    for _,line in ipairs(Config.QuestLines) do if line.Id==fieldByTown[town.Id] then return line end end
  end
  for index,town in ipairs(Config.WorldMap.Towns) do
    task.spawn(function()
      task.wait(6+index*.6)
      local center=Vector3.new(town.X,3,town.Z)
      -- [마을 구성] 1번 집=여관(가장 크게), 2번=상점(노점 포함), 3번=의뢰소, 4번=민가. 주민은 각자 집 앞에 선다.
      local houseRoles={{"여관",14},{"상점",12},{"의뢰소",12},{"민가",11}}
      for i,key in ipairs(houseKeys) do
        local angle=i/4*math.pi*2+.4
        local role=houseRoles[i]
        local house=worldAsset(key,center+Vector3.new(math.cos(angle)*38,0,math.sin(angle)*38),role[2])
        if house then
          house.Name="TownHouse_"..town.Id.."_"..i;house:SetAttribute("MeadowScenery",true)
          local mesh=house:FindFirstChildWhichIsA("MeshPart",true)
          if mesh and i<=3 then
            local gui=Instance.new("BillboardGui");gui.Name="TownSign";gui.Adornee=mesh;gui.Size=UDim2.fromOffset(120,34)
            gui.StudsOffsetWorldSpace=Vector3.new(0,role[2]*.75,0);gui.AlwaysOnTop=false;gui.MaxDistance=140;gui.Parent=mesh
            local label=Instance.new("TextLabel");label.Size=UDim2.fromScale(1,1);label.BackgroundColor3=Color3.fromRGB(60,40,24)
            label.BackgroundTransparency=.15;label.TextColor3=Color3.fromRGB(255,232,180);label.Font=Enum.Font.GothamBold
            label.TextScaled=true;label.Text=role[1];label.Parent=gui
            local corner=Instance.new("UICorner");corner.CornerRadius=UDim.new(0,6);corner.Parent=label
          end
        end
      end
      -- 상점 앞 노점, 여관 앞 모닥불.
      do
        local a2=2/4*math.pi*2+.4
        local stall=worldAsset("vxStall",center+Vector3.new(math.cos(a2)*27+5,0,math.sin(a2)*27),4)
        if stall then stall.Name="TownStall_"..town.Id;stall:SetAttribute("MeadowScenery",true) end
        local a1=1/4*math.pi*2+.4
        local fire=worldAsset("vxCampfirePit",center+Vector3.new(math.cos(a1)*24-5,0,math.sin(a1)*24+5),2.4)
        if fire then fire.Name="TownInnFire_"..town.Id;fire:SetAttribute("MeadowScenery",true) end
      end
      -- 여관 손님 아낙(등록 CC0 인물 메시): 여관 주인 곁에서 마을 소문을 들려준다.
      task.spawn(function()
        local woman=worldAsset("mon_womanmedieval",center+Vector3.new(math.cos(1/4*math.pi*2+.4)*27+4,0,math.sin(1/4*math.pi*2+.4)*27+5),5.4)
        if woman then
          woman.Name="TownInnGuest_"..town.Id;woman:SetAttribute("MeadowScenery",true)
          local rumors={
            "여관 손님 아낙: '"..town.Hold.."에서는 구석구석 홀로 사는 괴물이 있다더라. 이정표를 따라 걸어 봐.'",
            "여관 손님 아낙: '"..town.Scout.."에게 가 보렴. 이 일대 곤란한 일을 다 알고 있단다.'",
            "여관 손님 아낙: '저주받은 괴물 중엔 풀어 주면 사람이 되는 이도 있다더라. 눈빛을 잘 봐.'",
          }
          villagePrompt(woman,"여관 손님 아낙","소문 듣기",function(player)
            villageDialogue(player,"여관 손님 아낙",rumors[math.random(#rumors)])
          end)
        end
      end)
      local well=worldAsset("villageWell",center,5)
      if well then well.Name="TownWell_"..town.Id;well:SetAttribute("MeadowScenery",true) end
      for i=1,4 do
        local angle=i/4*math.pi*2+math.pi/4
        local lamp=worldAsset("villageLantern",center+Vector3.new(math.cos(angle)*16,0,math.sin(angle)*16),6)
        if lamp then lamp:SetAttribute("MeadowScenery",true) end
      end
      for r,role in ipairs(roles) do
        local angle=r/4*math.pi*2+.4 -- 여관(1)·상점(2)·의뢰소(3) 집 앞
        local position=center+Vector3.new(math.cos(angle)*27,3,math.sin(angle)*27)
        local ok,npc=pcall(function()
          local desc=Instance.new("HumanoidDescription")
          local skin=Color3.fromRGB(role.look.skin[1],role.look.skin[2],role.look.skin[3])
          desc.HeadColor=skin;desc.LeftArmColor=skin;desc.RightArmColor=skin
          desc.TorsoColor=Color3.fromRGB(role.look.shirt[1],role.look.shirt[2],role.look.shirt[3])
          desc.LeftLegColor=Color3.fromRGB(70,62,56);desc.RightLegColor=Color3.fromRGB(70,62,56)
          local model=Players:CreateHumanoidModelFromDescriptionAsync(desc,Enum.HumanoidRigType.R15)
          desc:Destroy()
          return model
        end)
        if ok and npc then
          npc.Name="TownNpc_"..town.Id.."_"..role.key
          local humanoid=npc:FindFirstChildOfClass("Humanoid")
          if humanoid then humanoid.DisplayName=town[role.key];humanoid.DisplayDistanceType=Enum.HumanoidDisplayDistanceType.Viewer end
          local root=npc:FindFirstChild("HumanoidRootPart")
          local ray=RaycastParams.new();ray.FilterType=Enum.RaycastFilterType.Include;ray.FilterDescendantsInstances={meadowTerrain}
          local hit=workspace:Raycast(position+Vector3.new(0,90,0),Vector3.new(0,-180,0),ray)
          npc:PivotTo(CFrame.lookAt((hit and hit.Position or position)+Vector3.new(0,3.2,0),Vector3.new(center.X,hit and hit.Position.Y+3.2 or 6,center.Z)))
          if root then
            root.Anchored=true
            npc.Parent=gameWorld
            local animator=humanoid and (humanoid:FindFirstChildOfClass("Animator") or Instance.new("Animator"))
            if animator then
              animator.Parent=humanoid
              local anim=Instance.new("Animation");anim.AnimationId="rbxassetid://507766388"
              local loaded,track=pcall(function() return animator:LoadAnimation(anim) end)
              if loaded and track then track.Looped=true;track:Play() end
              anim:Destroy()
              _G.MeadowNpcLife(npc,animator,npc:GetPivot(),os.clock()+position.X)
            end
            local prompt=Instance.new("ProximityPrompt");prompt.ActionText=role.action;prompt.ObjectText=town[role.key];prompt.HoldDuration=.4
            prompt.MaxActivationDistance=12;prompt.RequiresLineOfSight=false;prompt.Parent=root
            if role.key=="Merchant" then
              -- [지역 장비 상인] 같은 상인에게서 그 지역의 기본 장비를 산다.
              local shopPrompt=Instance.new("ProximityPrompt");shopPrompt.ActionText="장비 사기";shopPrompt.ObjectText=town[role.key]
              shopPrompt.HoldDuration=.3;shopPrompt.MaxActivationDistance=12;shopPrompt.RequiresLineOfSight=false
              shopPrompt.KeyboardKeyCode=Enum.KeyCode.F;shopPrompt.UIOffset=Vector2.new(0,-60);shopPrompt.Parent=root
              shopPrompt.Triggered:Connect(function(player)
                if player:GetAttribute("ProfileReady")~=true then return end
                meadowOpenGearShop(player,town.Id,root.Position)
              end)
            end
            prompt.Triggered:Connect(function(player)
              if player:GetAttribute("ProfileReady")~=true then return end
              if role.key=="Inn" then
                local character=player.Character
                local human=character and character:FindFirstChildOfClass("Humanoid")
                if human then human.Health=human.MaxHealth end
                player:SetAttribute("MeadowStamina",100)
                pcall(function() villageDialogue(player,town[role.key],"어서 와요. 따뜻한 수프 한 그릇이면 기운이 돌아올 거예요. ("..town.Name.."에서 체력과 기력이 회복됐다)") end)
              elseif role.key=="Merchant" then
                local total,parts=0,{}
                local rates={}
                for k,v in pairs(sellRates) do rates[k]=v end
                for k,v in pairs(town.Buy or {}) do rates[k]=v end -- 지역 특산 재료는 더 비싸게 쳐 준다.
                for material,rate in pairs(rates) do
                  local have=readNumber(player,material,0)
                  local extra=have-2
                  if extra>0 then
                    setNumber(player,material,2)
                    total+=extra*rate
                    table.insert(parts,material.." "..extra)
                  end
                end
                if total>0 then
                  setNumber(player,"Coins",readNumber(player,"Coins",0)+total)
                  pcall(function() villageDialogue(player,town[role.key],"좋은 물건이군! 남는 재료("..table.concat(parts,", ")..")를 사서 재화 "..total.."을 건넸다. (재료 2개씩은 남겨 두었다)") end)
                else
                  pcall(function() villageDialogue(player,town[role.key],"가죽·송곳니·발톱·버섯을 3개 이상 가져오면 사 주지. 퀘스트용으로 2개는 남겨 두는 게 좋아.") end)
                end
              else
                local line=lineFor(town)
                local text=town.Hold.."의 소문이다.\n"
                if line then
                  local stage=readNumber(player,line.Field,0)
                  if stage==0 then text=text.."아직 이 지역에 대해 아는 게 적다. 지역을 더 둘러보면 이야기를 듣게 될 거다."
                  elseif stage>#line.Steps then text=text.."'"..line.Name.."' 사건은 끝났다. 그 선택이 마을에 어떤 바람을 일으킬지는 지켜봐야지."
                  else
                    local step=line.Steps[stage]
                    text=text.."지금 쫓는 일: "..line.Name.."\n▶ "..step.Title.."\n"..step.Text
                  end
                end
                if not line then
                  -- 미스터리 연계가 없는 마을은 이 지역 생태 의뢰와 전설 소문을 알려 준다.
                  for _,region in ipairs(Config.EcoRegions or {}) do
                    if region.Zone==town.Zone then
                      local names={}
                      for _,camp in ipairs(region.Camps) do names[#names+1]="· "..camp.Title end
                      text=text.."이 일대에서 사람들이 곤란해하는 일이다.\n"..table.concat(names,"\n").."\n지역 구석 어딘가엔 홀로 사는 전설의 괴물이 있다는 소문도 돈다. 이정표를 따라 걸어 보게."
                    end
                  end
                end
                pcall(function() villageDialogue(player,town[role.key],text) end)
              end
            end)
          else npc:Destroy() end
        end
      end
    end)
  end
end

-- [저주받은 3인] 미나(마녀) · 닉(늑대인간) · 렌스(영혼을 판 악마 영주). 쓰러뜨리면 저주가 풀린다.
-- [초원 위험 구역] 마을 중심에서 멀수록 강해진다: ~200 안쪽 1단계, ~300 2단계, ~380 3단계, 그 바깥 4단계.
-- 이름 없는 기본 늑대·박쥐만 조정하고 의뢰 표적·야영지·우두머리는 그대로 둔다.
for _,site in ipairs(meadowEncounterSites) do
  local p=site.position
  if p and math.abs(p.X)<=450 and math.abs(p.Z)<=450 and not site.name and not site.model and not site.alpha
    and not site.questIndex and not site.questBoss and not site.contractIndex then
    local d=math.sqrt(p.X*p.X+p.Z*p.Z)
    site.tier=d<200 and 1 or d<300 and 2 or d<380 and 3 or 4
  end
end
-- [세계수 숲 · 재의 황야 생태 거점] Config.EcoRegions 표대로 지킴이 몹을 놓고, 지형이 만들어진 뒤 채집점을 놓는다.
do
  local nodeSpecs={}
  local legendByZone={
    worldtree={model="spider",name="뿌리 밑의 아라크네",tier=6,height=8,dx=-240,dz=200,style="mage",color=Color3.fromRGB(120,255,160),drops={{"Fang",1,3},{"Moonbloom",1,3},{"Crystal",.8,2}}},
    volcano={model="demon",name="재의 이프리트",tier=8,height=9,dx=240,dz=-210,style="mage",color=Color3.fromRGB(255,90,30),drops={{"Magma",1,3},{"Crystal",.8,2}}},
    oasis={model="raptor",name="사막의 와이번",tier=8,height=9,dx=-230,dz=210,color=Color3.fromRGB(255,210,80),drops={{"Hide",1,3},{"Feather",1,3},{"Crystal",.8,2}}},
    swamp={model="toad",name="늪의 고대 두꺼비신",tier=9,height=8,dx=230,dz=-200,style="mage",color=Color3.fromRGB(150,255,90),drops={{"Moonbloom",1,3},{"Crystal",.8,2}}},
    highland={model="yeti",name="눈보라 거인 요툰",tier=7,height=10,dx=-220,dz=-190,color=Color3.fromRGB(170,220,255),drops={{"Hide",1,3},{"Crystal",.8,2},{"Feather",.6,2}}},
    canyon={model="bladespider",name="칼날 여왕 만티코어",tier=8,height=8,dx=230,dz=200,color=Color3.fromRGB(255,120,120),drops={{"Fang",1,3},{"Claw",1,3},{"Crystal",.8,2}}},
    wetland={model="toad",name="안개 속의 크라켄 새끼",tier=5,height=7,dx=-210,dz=-200,style="mage",color=Color3.fromRGB(80,200,255),drops={{"Moonbloom",1,2},{"Crystal",.7,1}}},
    desert={model="fangspider",name="모래 속 전갈 여왕",tier=8,height=8,dx=220,dz=210,color=Color3.fromRGB(255,190,90),drops={{"Fang",1,3},{"Crystal",.8,2}}},
    chaos={model="frostfiend",name="균열의 서리 거인",tier=10,height=10,dx=-230,dz=190,style="mage",color=Color3.fromRGB(150,130,255),drops={{"Crystal",1,3},{"Magma",.8,2}}},
    citadel={model="skullorc",name="성채의 망령 기사단장",tier=11,height=9,dx=230,dz=-200,color=Color3.fromRGB(190,190,220),drops={{"Ingot",1,3},{"Crystal",1,3}}},
    deadmarsh={model="demon",name="죽음 늪의 바실리스크 왕",tier=10,height=9,dx=-220,dz=-210,style="mage",color=Color3.fromRGB(120,255,120),drops={{"Fang",1,3},{"Crystal",1,3}}},
  }
  for _,region in ipairs(Config.EcoRegions or {}) do
    for _,camp in ipairs(region.Camps) do
      local function at(dx,dz) return Vector3.new(camp.X+dx,3,camp.Z+dz) end
      local g,b=camp.Guard,camp.Boss
      for _,off in ipairs(g.Offs) do
        table.insert(meadowEncounterSites,{id="wolf",atom="HEAD_CANINE",model=g.model,name=g.name,tier=g.tier,height=g.height,hp=g.hp,dmg=g.dmg,drops=g.drops,style=g.style,myth=g.myth,position=at(off[1],off[2])})
      end
      table.insert(meadowEncounterSites,{id="wolf",atom="HEAD_CANINE",model=b.model,name=b.name,tier=b.tier,height=b.height,hp=b.hp,dmg=b.dmg,
        alpha=true,named=true,questBoss=camp.Id,drops=b.drops,style=b.style,myth=b.myth,position=at(b.dx,b.dz)})
      for _,n in ipairs(camp.Nodes) do nodeSpecs[#nodeSpecs+1]={n[1],camp.X+n[2],camp.Z+n[3]} end
    end
    -- [전설 크리처] 퀘스트 없이 지역 구석에 홀로 사는 신화 괴물. 찾아가 쓰러뜨리면 희귀 재료를 준다(오디세이식 자유 사냥).
    local legend=legendByZone[region.Zone]
    if legend then
      table.insert(meadowEncounterSites,{id="wolf",atom="HEAD_CANINE",model=legend.model,name=legend.name,tier=legend.tier,height=legend.height,hp=4.2,dmg=2.2,
        alpha=true,named=true,style=legend.style,myth={color=legend.color,range=30,rate=26,fill=.6},drops=legend.drops,
        position=Vector3.new(region.HubX+legend.dx,3,region.HubZ+legend.dz)})
    end
  end
  -- [보스 상자] 거점마다 지킴이 우두머리를 쓰러뜨리면 열 수 있는 상자. 제련·무두질 재료와 부위 재료가 나오고 플레이어마다 한 번만 연다.
  do
    local chestSpecs={}
    for _,region in ipairs(Config.EcoRegions or {}) do
      for _,camp in ipairs(region.Camps) do
        table.insert(chestSpecs,{x=camp.X-9,z=camp.Z+13,boss=camp.Id,by="quest",name=camp.Name,tier=camp.Boss.tier,drops=camp.Boss.drops})
      end
      local lg=legendByZone[region.Zone]
      if lg then table.insert(chestSpecs,{x=region.HubX+lg.dx-8,z=region.HubZ+lg.dz+12,boss=lg.name,by="name",name=lg.name.."의 은신처",tier=lg.tier,drops=lg.drops,legend=true}) end
    end
    task.spawn(function()
      while workspace:GetAttribute("OpenWorldReady")~=true do task.wait(2) end
      local params=RaycastParams.new()
      params.FilterType=Enum.RaycastFilterType.Include
      params.FilterDescendantsInstances={workspace.Terrain}
      for index,spec in ipairs(chestSpecs) do
        if index<=96 then
          local hit=workspace:Raycast(Vector3.new(spec.x,400,spec.z),Vector3.new(0,-800,0),params)
          if not hit then
            warn("ECO_CHEST_GROUND_UNVERIFIED "..spec.name)
          else
            local pos=hit.Position
            local anchor=Instance.new("Attachment");anchor.Name="EcoChest_"..index;anchor.WorldPosition=pos+Vector3.new(0,1.5,0);anchor.Parent=workspace.Terrain
            task.spawn(function()
              local m=worldAsset("vxChest",pos,2.6)
              if m then m.Name="EcoChestModel_"..index;m:SetAttribute("MeadowScenery",true) end
            end)
            local prompt=Instance.new("ProximityPrompt")
            prompt.ActionText="상자 열기";prompt.ObjectText=spec.name;prompt.HoldDuration=.7
            prompt.MaxActivationDistance=12;prompt.RequiresLineOfSight=false;prompt.Parent=anchor
            prompt.Triggered:Connect(function(player)
              if player:GetAttribute("ProfileReady")~=true then return end
              local field=index>64 and "EcoChestMask3" or index>32 and "EcoChestMask2" or "EcoChestMask"
              local bitv=bit32.lshift(1,(index-1)%32)
              if bit32.band(readNumber(player,field,0),bitv)~=0 then
                pcall(function() villageDialogue(player,spec.name,"상자는 이미 비어 있다.",{}) end);return
              end
              for _,e in ipairs(enemies) do
                if e.HP>0 and e.model.Parent and ((spec.by=="quest" and e.questBoss==spec.boss) or (spec.by=="name" and e.named and e.model.Name==spec.boss)) then
                  pcall(function() villageDialogue(player,spec.name,"우두머리가 아직 살아 있다. 먼저 쓰러뜨려야 상자를 열 수 있다.",{}) end);return
                end
              end
              setNumber(player,field,bit32.bor(readNumber(player,field,0),bitv))
              local lines={}
              local function give(f,n)
                setNumber(player,f,readNumber(player,f,0)+n)
                local mat=Config.MaterialByField[f]
                lines[#lines+1]=(mat and mat.Name or f).." x"..n
              end
              for _,d in ipairs(spec.drops or {}) do give(d[1],math.max(1,math.floor((d[3] or 1)*(spec.legend and 3 or 2)))) end
              give("Ingot",spec.legend and 3 or 1+math.floor(spec.tier/5))
              give("Leather",spec.legend and 3 or 1+math.floor(spec.tier/5))
              local coins=spec.tier*(spec.legend and 160 or 70)
              setNumber(player,"Coins",readNumber(player,"Coins",0)+coins)
              pcall(awardProgress,player,spec.tier*25,0)
              pcall(function() villageDialogue(player,spec.name,"상자를 열었다!\n"..table.concat(lines,"\n").."\n코인 +"..coins,{}) end)
            end)
          end
        end
      end
    end)
  end
  task.spawn(function()
    while workspace:GetAttribute("OpenWorldReady")~=true do task.wait(2) end
    local params=RaycastParams.new()
    params.FilterType=Enum.RaycastFilterType.Include
    params.FilterDescendantsInstances={workspace.Terrain}
    for _,spec in ipairs(nodeSpecs) do
      local hit=workspace:Raycast(Vector3.new(spec[2],400,spec[3]),Vector3.new(0,-800,0),params)
      if hit then
        local position=hit.Position
        local node={position=position,kind=spec[1],readyAt=0}
        table.insert(resourceNodes,node)
        local terrain=workspace.Terrain
        pcall(function()
          if spec[1]=="ORE" then terrain:FillBall(position+Vector3.new(0,1.2,0),3,Enum.Material.Slate)
            terrain:FillBall(position+Vector3.new(1.6,2.4,0),1.6,Enum.Material.CrackedLava)
          else terrain:FillBall(position+Vector3.new(0,.6,0),3,Enum.Material.LeafyGrass) end
        end)
        local anchor=Instance.new("Attachment")
        anchor.Name="MeadowGatherAnchor";anchor.WorldPosition=position+Vector3.new(0,3,0);anchor.Parent=terrain
        local prompt=Instance.new("ProximityPrompt")
        prompt.Name="GatherPrompt"
        prompt.ActionText=spec[1]=="ORE" and "광석 채굴" or "약초 채집"
        prompt.ObjectText=spec[1]=="ORE" and "광맥" or "약초 덤불"
        prompt.MaxActivationDistance=14;prompt.HoldDuration=.3;prompt.RequiresLineOfSight=false;prompt.Parent=anchor
        prompt.Triggered:Connect(function(player) gatherResource(player,node) end)
      else
        warn("ECO_NODE_GROUND_UNVERIFIED "..spec[1].." "..tostring(spec[2]).." "..tostring(spec[3]))
      end
    end
  end)
end
-- [초원 비석 3개] 촌장 나린의 '옛 비석' 퀘스트 지점에 등록된 CC0 석주 모델을 세운다. 읽으면 짧은 비문이 나온다.
task.spawn(function()
  task.wait(12)
  local rp=RaycastParams.new()
  rp.FilterType=Enum.RaycastFilterType.Include
  rp.FilterDescendantsInstances={meadowTerrain}
  for _,stele in ipairs({
    {0,-270,"렌스 기사단, 청월의 길 시작점. 이끼가 비문을 덮었다."},
    {-270,40,"늑대를 길들인 자가 있어 이 소굴을 지켰다."},
    {270,40,"광맥과 동굴을 잇는 길, 기사단의 보급로."},
  }) do
    local hit=workspace:Raycast(Vector3.new(stele[1],80,stele[2]),Vector3.new(0,-160,0),rp)
    if hit then
      local ok,model=pcall(worldAsset,"villagePillar",Vector3.new(stele[1],hit.Position.Y+1,stele[2]),7)
      if ok and model then
        model.Name="Meadow_Stele"
        local mesh=model:FindFirstChildWhichIsA("MeshPart",true)
        if mesh then
          local prompt=Instance.new("ProximityPrompt")
          prompt.ActionText="비문 읽기";prompt.ObjectText="옛 비석";prompt.MaxActivationDistance=12;prompt.HoldDuration=.3
          prompt.RequiresLineOfSight=false;prompt.Parent=mesh
          prompt.Triggered:Connect(function(player)
            player:SetAttribute("MeadowGearMessage","비문: "..stele[3])
            player:SetAttribute("MeadowGearRevision",(player:GetAttribute("MeadowGearRevision") or 0)+1)
          end)
        end
      else
        warn("STELE_ASSET_FAILED "..tostring(model))
      end
    else
      warn("STELE_GROUND_UNVERIFIED "..stele[1].." "..stele[2])
    end
  end
end)
-- [지역 빈틈 배경 오브젝트] 지역마다 어울리는 CC0 바위·성곽 폐허·통나무 등을 흩어 놓아 빈 땅을 메운다(Kenney, 등록 모델만 사용).
-- 길목·이정표·마을·생태 거점 가까이에는 놓지 않는다. 모델이 등록 안 됐거나 지면을 못 찾으면 그 자리는 건너뛴다.
task.spawn(function()
  while workspace:GetAttribute("OpenWorldReady")~=true do task.wait(2) end
  task.wait(6)
  local world=Config.WorldMap
  local village=world.Village
  local random=Random.new(7711)
  local scatter={
    windcliff={{"vxRockLarge",16,5},{"vxRockWide",14,4}},
    worldtree={{"vxTreeLog",3.5,6},{"vxCampfirePit",2.5,3}},
    volcano={{"vxRockLarge",18,6},{"vxRockWide",16,4}},
    oasis={{"vxCastleWall",8,4},{"vxCastleCorner",8,2},{"vxCastlePillar",11,4},{"vxTowerBase",12,2}},
    swamp={{"vxTreeLog",3.5,6},{"vxRockWide",10,3},{"mushroom",3,8}},
    citadel={{"vxCastleWall",10,8},{"vxCastleCorner",10,3},{"vxCastlePillar",13,6},{"vxTowerBase",14,3},{"vxCastleGate",14,1}},
    highland={{"vxRockLarge",18,6},{"vxRockWide",15,5}},
    canyon={{"vxRockLarge",20,7},{"vxCastleWall",9,3},{"vxCastlePillar",12,3}},
    chaos={{"vxRockLarge",18,5},{"vxCastlePillar",13,5}},
    wetland={{"vxTreeLog",3.5,6},{"vxRockWide",10,3}},
    desert={{"vxCastleWall",8,4},{"vxCastlePillar",11,4},{"vxTowerBase",12,2},{"vxRockLarge",14,3}},
    deadmarsh={{"vxCastlePillar",12,4},{"vxCastleWall",9,3},{"vxTreeLog",3.5,4}},
    meadow={{"vxTreeLog",3.5,4},{"vxCampfirePit",2.5,3},{"vxRockLarge",12,2}},
  }
  -- 아직 쓰지 않던 등록 소품도 어울리는 지역에 놓는다(석조 계단·바위 지붕·노점·울타리).
  local extra={
    windcliff={{"vxStall",4,2},{"villageFenceBroken",2.5,2},{"vxOverhang",9,2}},
    worldtree={{"vxHedgeGate",4,2},{"villageWatermill",8,1},{"mushroom",2.5,6},{"vxPlate",1.2,2}},
    oasis={{"vxStairsStone",3,3},{"villageFountain",5,1},{"vxTowerMid",16,1}},
    citadel={{"vxStairsStone",3,4},{"vxOverhang",10,2},{"vxTowerMid",18,2},{"vxTowerRoof",14,1}},
    canyon={{"vxStairsStone",3,3},{"vxOverhang",10,3}},
    highland={{"vxOverhang",10,2}},
    wetland={{"villageFenceBroken",2.5,3},{"villageWatermill",8,1},{"mushroom",2.5,6}},
    desert={{"vxStairsStone",3,3},{"vxTowerMid",16,1},{"villageRoad",1.2,3}},
    deadmarsh={{"vxStairsStone",3,3},{"villageFenceBroken",2.5,2},{"mushroom",3,5},{"vxPlate",1.2,3}},
  }
  for zoneId,list in pairs(extra) do
    scatter[zoneId]=scatter[zoneId] or {}
    for _,entry in ipairs(list) do table.insert(scatter[zoneId],entry) end
  end
  local function blocked(x,z)
    if x>village.X0-30 and x<village.X1+30 and z>village.Z0-30 and z<village.Z1+30 then return true end
    for _,wp in ipairs(world.Waypoints) do if (x-wp[2])^2+(z-wp[3])^2<90*90 then return true end end
    for _,town in ipairs(world.Towns or {}) do if (x-town.X)^2+(z-town.Z)^2<110*110 then return true end end
    for _,landmark in ipairs(world.Landmarks) do if (x-landmark.X)^2+(z-landmark.Z)^2<80*80 then return true end end
    for _,region in ipairs(Config.EcoRegions or {}) do
      for _,camp in ipairs(region.Camps) do if (x-camp.X)^2+(z-camp.Z)^2<45*45 then return true end end
    end
    for _,camp in pairs(world.EcoCamps or {}) do if (x-camp.X)^2+(z-camp.Z)^2<45*45 then return true end end
    return false
  end
  local placed=0
  for _,zone in ipairs(world.Zones) do
    for _,entry in ipairs(scatter[zone.Id] or {}) do
      for _=1,entry[3] do
        local x,z=world.RandomPoint(zone.Id,random,40)
        if x and not blocked(x,z) then
          local model=worldAsset(entry[1],Vector3.new(x,3,z),entry[2]*random:NextNumber(.85,1.2))
          if model then
            model.Name="Scenery_"..zone.Id.."_"..entry[1].."_"..placed
            model:SetAttribute("MeadowScenery",true)
            model:PivotTo(model:GetPivot()*CFrame.Angles(0,random:NextNumber(0,math.pi*2),0))
            placed+=1
          end
        end
        task.wait()
      end
    end
  end
  -- [야영지 표지판] 서브퀘스트 거점마다 등록된 표지판을 세워 위치를 눈에 띄게 한다.
  local signs={{215,-140},{-250,60},{255,235}}
  for _,region in ipairs(Config.EcoRegions or {}) do
    for _,camp in ipairs(region.Camps) do signs[#signs+1]={camp.X,camp.Z} end
  end
  for _,camp in pairs(world.EcoCamps or {}) do signs[#signs+1]={camp.X,camp.Z} end
  for index,spot in ipairs(signs) do
    local sign=worldAsset("vxSignpostSingle",Vector3.new(spot[1]-12,3,spot[2]-12),4)
    if sign then sign.Name="Camp_Signpost_"..index;sign:SetAttribute("MeadowScenery",true);placed+=1 end
    task.wait()
  end
  workspace:SetAttribute("SceneryPlaced",placed)
end)
-- [바람 절벽 생태 거점] 자원이 나는 곳에 지킴이를 둔다(서브퀘 cliffmine/cliffnest/orccamp와 연결).
do
  local camps=Config.WorldMap.EcoCamps
  if camps then
    local function at(c,dx,dz) return Vector3.new(c.X+dx,3,c.Z+dz) end
    local m,n,o=camps.cliffmine,camps.cliffnest,camps.orccamp
    local function goblin(c,dx,dz) table.insert(meadowEncounterSites,{id="wolf",atom="HEAD_CANINE",model="roguehooded",name="절벽 광부 도적",tier=3,height=3.2,hp=1.4,dmg=1.1,
      drops={{"Ore",.6,1},{"Hide",.3,1}},position=at(c,dx,dz)}) end
    goblin(m,-14,10);goblin(m,16,14)
    table.insert(meadowEncounterSites,{id="wolf",atom="HEAD_CANINE",model="orc",name="오크 광산 감독",tier=4,height=5.2,hp=2.8,dmg=1.5,alpha=true,named=true,
      questBoss="cliffmine",drops={{"Ore",1,4},{"Magma",.6,1},{"Hide",.5,1}},position=at(m,10,-8)})
    table.insert(meadowEncounterSites,{id="bat",atom="WING_LEATHER",tier=3,height=3.2,drops={{"Feather",.7,1}},position=at(n,-16,-8)})
    table.insert(meadowEncounterSites,{id="bat",atom="WING_LEATHER",tier=3,height=3.2,drops={{"Feather",.7,1}},position=at(n,18,-4)})
    table.insert(meadowEncounterSites,{id="bat",atom="WING_LEATHER",name="절벽의 큰박쥐",tier=5,height=4.6,alpha=true,named=true,
      questBoss="cliffnest",drops={{"BatWing",1,3},{"Crystal",1,2},{"Moonbloom",.6,1},{"Feather",1,3}},position=at(n,6,8)})
    for _,off in ipairs({{-12,10},{14,12}}) do
      table.insert(meadowEncounterSites,{id="wolf",atom="HEAD_CANINE",model="tribal",name="오크 정찰병",tier=3,height=4.4,hp=1.5,dmg=1.2,
        drops={{"Hide",.5,1},{"Claw",.4,1},{"Moonbloom",.3,1},{"Feather",.4,1}},position=at(o,off[1],off[2])})
    end
    table.insert(meadowEncounterSites,{id="wolf",atom="HEAD_CANINE",model="orc",name="오크 정찰대장",tier=4,height=5.4,hp=3,dmg=1.6,alpha=true,named=true,
      questBoss="orccamp",drops={{"Hide",1,3},{"Claw",1,3},{"Fang",.8,2},{"Feather",1,2}},position=at(o,-8,-6)})
    -- 채집점은 지형이 만들어진 뒤(OpenWorldReady) 지면을 확인하고 놓는다.
    task.spawn(function()
      while workspace:GetAttribute("OpenWorldReady")~=true do task.wait(2) end
      local params=RaycastParams.new()
      params.FilterType=Enum.RaycastFilterType.Include
      params.FilterDescendantsInstances={workspace.Terrain}
      for _,spec in ipairs({
        {"ORE",m.X-6,m.Z+2},{"ORE",m.X+4,m.Z-18},
        {"HERB",n.X-4,n.Z-14},{"HERB",n.X+12,n.Z-12},
      }) do
        local hit=workspace:Raycast(Vector3.new(spec[2],400,spec[3]),Vector3.new(0,-800,0),params)
        if hit then
          local position=hit.Position
          local node={position=position,kind=spec[1],readyAt=0}
          table.insert(resourceNodes,node)
          local terrain=workspace.Terrain
          pcall(function()
            if spec[1]=="ORE" then terrain:FillBall(position+Vector3.new(0,1.2,0),3,Enum.Material.Slate)
              terrain:FillBall(position+Vector3.new(1.6,2.4,0),1.6,Enum.Material.CrackedLava)
            else terrain:FillBall(position+Vector3.new(0,.6,0),3,Enum.Material.LeafyGrass) end
          end)
          local anchor=Instance.new("Attachment")
          anchor.Name="MeadowGatherAnchor";anchor.WorldPosition=position+Vector3.new(0,3,0);anchor.Parent=terrain
          local prompt=Instance.new("ProximityPrompt")
          prompt.Name="GatherPrompt"
          prompt.ActionText=spec[1]=="ORE" and "광석 채굴" or "약초 채집"
          prompt.ObjectText=spec[1]=="ORE" and "광맥" or "약초 덤불"
          prompt.MaxActivationDistance=14;prompt.HoldDuration=.3;prompt.RequiresLineOfSight=false;prompt.Parent=anchor
          prompt.Triggered:Connect(function(player) gatherResource(player,node) end)
        else
          warn("WINDCLIFF_NODE_GROUND_UNVERIFIED "..spec[1])
        end
      end
    end)
  end
end
do
  for _,c in ipairs({
    {"mina","저주받은 마녀 미나","witch",7,5000,-300,"mage","swamp",3.2,1.6},
    {"nick","저주받은 늑대인간 닉","yeti",8,-1500,-1700,nil,"highland",3.6,1.8},
    {"lens","영혼을 판 악마 영주 렌스","wingdemon",9,4800,-1800,nil,"chaos",5,2.2},
  }) do
    table.insert(meadowEncounterSites,{id="wolf",atom="HEAD_CANINE",model=c[3],name=c[2],tier=c[4],height=c[3]=="wingdemon" and 9 or 6,
      hp=c[9],dmg=c[10],alpha=true,bonusBoss=true,named=true,lord=true,questBoss=c[1],style=c[7],zoneTag=c[8],
      drops={{"Crystal",1,3},{"Moonbloom",1,2}},position=Vector3.new(c[5],3,c[6])})
  end
end

-- [3D 아이템] 등록된 CC0 아이템 메시를 서버가 한 번 불러와 ReplicatedStorage에 둔다. 클라이언트 퀵슬롯이 복제해서 회전 3D로 보여 준다.
do
  local folder=ReplicatedStorage:FindFirstChild("MeadowItemModels") or Instance.new("Folder")
  folder.Name="MeadowItemModels";folder.Parent=ReplicatedStorage
  -- [장비 고유 아이콘] 기존 아이템 이외에 독립 검/방패 모델과 망토 원본도 가방에 공유한다.
  -- 미등록·승인 전 키는 불러오지 않고 기존 평면 아이콘을 유지한다.
  local usedGearModels={}
  for _,gear in ipairs(Config.MeadowEquipment or {}) do
    if gear.ModelKey then usedGearModels[gear.ModelKey]=true end
    local look=Config.GearLook and Config.GearLook[gear.Id]
    if look then
      if look.model then usedGearModels[look.model]=true end
      if look.acc and look.acc.model then usedGearModels[look.acc.model]=true end
    end
  end
  if Config.OpeningCapeModelKey then usedGearModels[Config.OpeningCapeModelKey]=true end
  for key,id in pairs(NativeCreatureAssets) do
    if type(key)=="string" and typeof(id)=="number" and id>0
      and (key:sub(1,5)=="item_" or usedGearModels[key]) then
      task.spawn(function()
        local ok,model=pcall(function() return AssetService:LoadAssetAsync(id) end)
        if not ok or not model then warn("마력숲 아이템 모델 불러오기 실패: "..key) return end
        for _,item in ipairs(model:GetDescendants()) do
          if item:IsA("LuaSourceContainer") or item:IsA("RemoteEvent") or item:IsA("RemoteFunction") or item:IsA("Tool") then item:Destroy()
          elseif item:IsA("BasePart") then item.Anchored=true;item.CanCollide=false;item.CanTouch=false;item.CanQuery=false end
        end
        model.Name=key;model.Parent=folder
      end)
    end
  end
end

-- [대장간 작업대] 제련로·무두질 틀·모루·숫돌을 등록된 CC0 소품으로 세우고, 눌러 보면 쓰임새를 알려 준다.
task.spawn(function()
  task.wait(9)
  for stationId,station in pairs(Config.SmithStations) do
    local rp=RaycastParams.new()
    rp.FilterType=Enum.RaycastFilterType.Include
    rp.FilterDescendantsInstances={meadowTerrain}
    local hit=workspace:Raycast(Vector3.new(station.X,80,station.Z),Vector3.new(0,-160,0),rp)
    local y=hit and hit.Position.Y or 3
    local model=worldAsset(station.Model,Vector3.new(station.X,y+1,station.Z),station.Height)
    if model then
      model.Name="Meadow_Smith_"..stationId
      model:SetAttribute("MeadowVillageScenery",true)
      for _,mesh in ipairs(model:GetDescendants()) do
        if mesh:IsA("MeshPart") then mesh.CanCollide=false;mesh.CanQuery=true;mesh.CanTouch=false end
      end
      villagePrompt(model,station.Name,station.Action.." 안내",function(player)
        local level=smithLevelOf(player)
        villageDialogue(player,"대장간 · "..station.Name,
          (stationId=="Smelter" and "광석 2개 → 철 주괴 1개. 대장 Lv4부터 철 주괴 3개 → 강철 주괴 1개도 가능해."
            or stationId=="Tanner" and "늑대 가죽 2장 → 무두질 가죽 1개."
            or stationId=="Anvil" and "무기와 방패를 제작해. 영웅·전설 장비는 강철 주괴가 필요해."
            or "무기를 단련(강화)해. 주괴가 들고, +3강마다 무두질 가죽이 들어.")..
          "\n\n내 대장 Lv"..level.." · 가방(인벤토리)에서 해당 작업을 누르면 이 근처에서만 적용돼.")
      end)
    end
  end
end)
-- [연금 작업대] 등록된 작업대 모델을 세우고 눌러 보면 쓰임새를 알려 준다.
task.spawn(function()
  task.wait(10)
  local station=Config.AlchemyStation
  local rp=RaycastParams.new()
  rp.FilterType=Enum.RaycastFilterType.Include
  rp.FilterDescendantsInstances={meadowTerrain}
  local hit=workspace:Raycast(Vector3.new(station.X,80,station.Z),Vector3.new(0,-160,0),rp)
  local model=worldAsset(station.Model,Vector3.new(station.X,(hit and hit.Position.Y or 3)+1,station.Z),station.Height)
  if not model then return end
  model.Name="Meadow_Alchemy_Bench"
  model:SetAttribute("MeadowVillageScenery",true)
  for _,mesh in ipairs(model:GetDescendants()) do
    if mesh:IsA("MeshPart") then mesh.CanCollide=false;mesh.CanQuery=true;mesh.CanTouch=false end
  end
  villagePrompt(model,station.Name,"연금 안내",function(player)
    villageDialogue(player,"연금 작업대","약초와 재료로 물약을 조합해. 가방에서 물약을 고르고 '조합'을 누르면 이 근처에서만 적용돼.\n\n내 연금 숙련 "..readNumber(player,"AlchemyProficiency",0))
  end)
end)
-- [식당 화덕] 요리 메뉴. 해금된 레시피(요리 숙련)만 선택지에 나온다.
task.spawn(function()
  task.wait(10)
  local station=Config.CookStation
  local rp=RaycastParams.new()
  rp.FilterType=Enum.RaycastFilterType.Include
  rp.FilterDescendantsInstances={meadowTerrain}
  local hit=workspace:Raycast(Vector3.new(station.X,80,station.Z),Vector3.new(0,-160,0),rp)
  local model=worldAsset(station.Model,Vector3.new(station.X,(hit and hit.Position.Y or 3)+1,station.Z),station.Height)
  if not model then return end
  model.Name="Meadow_Cook_Hearth"
  model:SetAttribute("MeadowVillageScenery",true)
  for _,mesh in ipairs(model:GetDescendants()) do
    if mesh:IsA("MeshPart") then mesh.CanCollide=false;mesh.CanQuery=true;mesh.CanTouch=false end
  end
  meadowOil.cookMenu=function(player,page)
    page=page or 1
    local skill=readNumber(player,"CookingProficiency",0)
    local options,lines={},{}
    local total=#Config.MeadowFoods
    local first=(page-1)*4+1
    for index,dish in ipairs(Config.MeadowFoods) do
      if index<first or index>first+3 then
      elseif skill>=dish.Need then
        local parts={}
        for _,field in ipairs({"Meat","Mushroom","Moonbloom","RedLeaf","Coins","Magma","Fang","Hide","Crystal"}) do
          if (dish[field] or 0)>0 then
            parts[#parts+1]=(Config.MaterialByField[field] and Config.MaterialByField[field].Name or "재화").." "..dish[field]
          end
        end
        lines[#lines+1]=dish.Name.." — "..dish.Desc.." ("..table.concat(parts,", ")..")"
        options[#options+1]={label=dish.Name,action="cook:"..index}
      else
        lines[#lines+1]="🔒 "..dish.Name.." — 요리 숙련 "..dish.Need.." 필요"
      end
    end
    cookSessions[player]=os.clock()+60
    if total>4 then options[#options+1]={label=first+3<total and "다음 쪽 ▶" or "첫 쪽으로",action="cookp:"..(first+3<total and page+1 or 1)} end
    villageDialogue(player,"식당 화덕 · 요리 숙련 "..skill.." ("..page.."/"..math.ceil(total/4).."쪽)",table.concat(lines,"\n"),options)
  end
  villagePrompt(model,station.Name,"요리하기",meadowOil.cookMenu)
end)

-- [마을 작업장] 다른 마을에도 대장간 · 요리 화덕을 세운다(제작은 nearStation/요리 거리 검사가 작업장 중심 기준으로 허용).
task.spawn(function()
  task.wait(14)
  local rp=RaycastParams.new()
  rp.FilterType=Enum.RaycastFilterType.Include
  rp.FilterDescendantsInstances={meadowTerrain}
  local tips={
    Smelter="광석 2개 → 철 주괴 1개. 대장 Lv4부터 철 주괴 3개 → 강철 주괴 1개.",
    Tanner="가죽 2장 → 무두질 가죽 1개.",
    Anvil="무기·방패·갑옷을 제작하고 각인한다. 영웅·전설 장비는 강철 주괴가 필요해.",
    Grindstone="무기를 단련(강화)한다. 주괴가 들고, +3강마다 무두질 가죽이 들어.",
  }
  for _,site in ipairs(Config.CraftSites or {}) do
    task.spawn(function()
      for id,off in pairs(Config.CraftSiteLayout) do
        local x,z=site.X+off[1],site.Z+off[2]
        local hit=workspace:Raycast(Vector3.new(x,80,z),Vector3.new(0,-160,0),rp)
        local y=hit and hit.Position.Y or 3
        local def=id=="Cook" and Config.CookStation or Config.SmithStations[id]
        local model=def and worldAsset(def.Model,Vector3.new(x,y+1,z),def.Height)
        if model then
          model.Name="Craft_"..site.Id.."_"..id
          model:SetAttribute("MeadowVillageScenery",true)
          for _,mesh in ipairs(model:GetDescendants()) do
            if mesh:IsA("MeshPart") then mesh.CanCollide=false;mesh.CanQuery=true;mesh.CanTouch=false end
          end
          if id=="Cook" then
            villagePrompt(model,site.Name.." 화덕","요리하기",meadowOil.cookMenu)
          else
            villagePrompt(model,site.Name.." "..def.Name,def.Action.." 안내",function(player)
              villageDialogue(player,site.Name.." · "..def.Name,tips[id].."\n\n내 대장 Lv"..smithLevelOf(player).." · 가방(인벤토리)에서 해당 작업을 누르면 이 작업장 근처에서 적용돼.")
            end)
          end
        else
          warn("CRAFT_SITE_UNVERIFIED "..site.Id.." "..id)
        end
      end
    end)
  end
end)

-- [마을 외곽 순찰 몹] 마을(12곳) 둘레 120~140 스터드에 그 지역 거점 지킴이와 같은 종의 무리를 3마리씩 둔다.
-- 마을 안(80 이내)에는 두지 않아 안전지대는 그대로 유지된다.
do
  local zoneRegion={}
  for _,region in ipairs(Config.EcoRegions or {}) do zoneRegion[region.Zone]=region end
  local count=0
  for ti,town in ipairs(Config.WorldMap.Towns or {}) do
    local region=zoneRegion[town.Zone]
    if region and #region.Camps>0 then
      local camp=region.Camps[(ti-1)%#region.Camps+1]
      local g=camp.Guard
      for k=1,3 do
        local angle=ti*1.3+k*2.09
        table.insert(meadowEncounterSites,{id="wolf",atom="HEAD_CANINE",model=g.model,name=g.name.." (마을 외곽)",tier=g.tier,height=g.height,hp=g.hp,dmg=g.dmg,
          style=g.style,myth=g.myth,zoneTag=town.Zone,drops=g.drops,
          position=Vector3.new(town.X+math.cos(angle)*(120+k*8),3,town.Z+math.sin(angle)*(120+k*8))})
        count+=1
      end
    end
  end
  workspace:SetAttribute("TownOutskirtMobs",count)
end

-- [아이템 소품] 등록된 아이콘 모델(물약·하트·별)을 마을 상점·여관·의뢰소, 성지 위에 띄워 둔다.
task.spawn(function()
  while workspace:GetAttribute("OpenWorldReady")~=true do task.wait(3) end
  task.wait(20)
  local rp=RaycastParams.new();rp.FilterType=Enum.RaycastFilterType.Include;rp.FilterDescendantsInstances={workspace.Terrain}
  local function float(key,x,z,size,above,name)
    local hit=workspace:Raycast(Vector3.new(x,400,z),Vector3.new(0,-800,0),rp)
    if not hit then return end
    local m=worldAsset(key,hit.Position,size,above)
    if m then m.Name=name;m:SetAttribute("MeadowScenery",true) end
  end
  for _,town in ipairs(Config.WorldMap.Towns or {}) do
    local function at(i,r) local a=i/4*math.pi*2+.4 return town.X+math.cos(a)*r,town.Z+math.sin(a)*r end
    local x,z=at(1,27) float("item_heart",x,z,2.2,9,"TownHeart_"..town.Id)
    x,z=at(2,27) float("item_potion5_filled",x,z,2.2,8,"TownPotion_"..town.Id)
    x,z=at(3,27) float("item_star",x,z,2.2,9,"TownStar_"..town.Id)
  end
  for _,lm in ipairs(Config.WorldMap.Landmarks or {}) do
    float("item_star",lm.X+8,lm.Z+8,3,6,"ShrineStar_"..lm.Id)
  end
end)

-- [채굴] 지역마다 광맥 4곳(총 48곳). 채굴 숙련 레벨이 광맥 요구 레벨 이상이어야 캘 수 있고, 레벨이 높을수록 수확량과 희귀 확률이 늘어난다.
do
  local W=Config.WorldMap
  local random=Random.new(5252)
  local village=W.Village
  local cooldown=75
  local function toast(player,text)
    player:SetAttribute("MeadowGearMessage",text)
    player:SetAttribute("MeadowGearRevision",(player:GetAttribute("MeadowGearRevision") or 0)+1)
  end
  local specs={}
  for _,zone in ipairs(W.Zones) do
    local list=Config.MiningVeins[zone.Id]
    if list then
      local placed=0
      local tries=0
      while placed<4 and tries<40 do
        tries+=1
        local x,z=W.RandomPoint(zone.Id,random,200)
        if x and not (x>village.X0-150 and x<village.X1+150 and z>village.Z0-150 and z<village.Z1+150) then
          local tooClose=false
          for _,t in ipairs(W.Towns or {}) do if (x-t.X)^2+(z-t.Z)^2<120^2 then tooClose=true end end
          if not tooClose then
            placed+=1
            specs[#specs+1]={x=x,z=z,vein=list[(placed-1)%#list+1],zone=zone.Id}
          end
        end
      end
    end
  end
  workspace:SetAttribute("MiningVeinCount",#specs)
  task.spawn(function()
    while workspace:GetAttribute("OpenWorldReady")~=true do task.wait(3) end
    task.wait(30)
    local rp=RaycastParams.new();rp.FilterType=Enum.RaycastFilterType.Include;rp.FilterDescendantsInstances={workspace.Terrain}
    for index,spec in ipairs(specs) do
      local hit=workspace:Raycast(Vector3.new(spec.x,400,spec.z),Vector3.new(0,-800,0),rp)
      if hit then
        local name,material,req,color=spec.vein[1],spec.vein[2],spec.vein[3],spec.vein[4]
        local col=Color3.fromRGB(color[1],color[2],color[3])
        task.spawn(function()
          local rock=worldAsset("vxRockLarge",hit.Position,5)
          if rock then rock.Name="MiningVein_"..index;rock:SetAttribute("MeadowScenery",true) end
        end)
        local anchor=Instance.new("Attachment");anchor.Name="MiningVein_"..index;anchor.WorldPosition=hit.Position+Vector3.new(0,3,0);anchor.Parent=workspace.Terrain
        local fx=Instance.new("ParticleEmitter");fx.Color=ColorSequence.new(col);fx.LightEmission=1;fx.Rate=8;fx.Lifetime=NumberRange.new(1.5,2.5)
        fx.Speed=NumberRange.new(.5,2);fx.Size=NumberSequence.new({NumberSequenceKeypoint.new(0,.7),NumberSequenceKeypoint.new(1,0)});fx.Parent=anchor
        local light=Instance.new("PointLight");light.Color=col;light.Range=14;light.Brightness=1.5;light.Parent=anchor
        local prompt=Instance.new("ProximityPrompt");prompt.ActionText="채굴하기";prompt.ObjectText=name.." (채굴 Lv"..req..")";prompt.HoldDuration=1.2
        prompt.MaxActivationDistance=12;prompt.RequiresLineOfSight=false;prompt.Parent=anchor
        local readyAt=0
        prompt.Triggered:Connect(function(player)
          if player:GetAttribute("ProfileReady")~=true then return end
          if os.clock()<readyAt then toast(player,name.."은(는) 아직 광석이 차오르는 중이다.");return end
          local prof=readNumber(player,"MiningProficiency",0)
          local level=Config.MiningLevel(prof)
          local pick=Config.Pickaxes[readNumber(player,"PickaxeTier",0)]
          local effective=level+(pick and pick.Level or 0)
          if effective<req then toast(player,name.." 채굴에는 채굴 Lv"..req.."이 필요하다. (지금 Lv"..level..(pick and ("+곡괭이 "..pick.Level) or "")..")");return end
          readyAt=os.clock()+cooldown
          prompt.Enabled=false;fx.Enabled=false
          task.delay(cooldown,function() prompt.Enabled=true;fx.Enabled=true end)
          local amount=2+math.max(0,effective-req)+(effective>=4 and 1 or 0)+(pick and pick.Amount or -1)
          amount=math.max(1,amount)
          if material=="Ingot" or material=="Ectoplasm" or material=="Magma" then amount=math.max(1,math.ceil(amount*.6)) end
          setNumber(player,material,readNumber(player,material,0)+amount)
          local extra={}
          if math.random()<.06+level*.02+(pick and pick.Rare or 0) then
            local rare=material=="Crystal" and "Magma" or "Crystal"
            setNumber(player,rare,readNumber(player,rare,0)+1)
            extra[#extra+1]=(Config.MaterialByField[rare] and Config.MaterialByField[rare].Name or rare).." +1 (희귀)"
          end
          if material=="Ore" and math.random()<.25 then setNumber(player,"Stone",readNumber(player,"Stone",0)+2);extra[#extra+1]="돌 +2" end
          local gain=1+math.floor(req/2)
          setNumber(player,"MiningProficiency",prof+gain)
          setNumber(player,"SmithXp",readNumber(player,"SmithXp",0)+1)
          pcall(awardProgress,player,5+req*3,2)
          local after=Config.MiningLevel(prof+gain)
          local matName=Config.MaterialByField[material] and Config.MaterialByField[material].Name or material
          local msg=name..": "..matName.." +"..amount..(#extra>0 and (" · "..table.concat(extra,", ")) or "")
          if after>level then msg=msg.."\n채굴 Lv"..after.." 달성!" end
          if not pick then msg=msg.."\n(곡괭이가 없어 수확이 적다. 마을 광부에게 구하자)" end
          toast(player,msg)
          local eventName=({Ore="MINE_ORE",Crystal="MINE_CRYSTAL",Magma="MINE_MAGMA",Ectoplasm="MINE_SOUL",Ingot="MINE_DEEP"})[material]
          if eventName and meadowOil.questEvent then pcall(meadowOil.questEvent,player,eventName) end
        end)
      else warn("MINING_VEIN_GROUND_UNVERIFIED "..index) end
    end
  end)
end

-- [별똥별 이벤트] 8~12분마다 임의의 지역(초원 제외)에 별똥별이 떨어진다. 하늘로 치솟는 빛줄기를 따라가 조각을 주우면 희귀 재료를 얻는다.
-- 한 번에 최대 5명, 플레이어마다 한 번. 6분 뒤 사라진다. 지역 이름은 알림으로 모두에게 알린다.
do
  local W=Config.WorldMap
  local random=Random.new(os.time())
  local function toastAll(text)
    for _,player in ipairs(Players:GetPlayers()) do
      player:SetAttribute("MeadowGearMessage",text)
      player:SetAttribute("MeadowGearRevision",(player:GetAttribute("MeadowGearRevision") or 0)+1)
    end
  end
  task.spawn(function()
    while workspace:GetAttribute("OpenWorldReady")~=true do task.wait(5) end
    task.wait(180)
    local rp=RaycastParams.new();rp.FilterType=Enum.RaycastFilterType.Include;rp.FilterDescendantsInstances={workspace.Terrain}
    while true do
      local zone=W.Zones[random:NextInteger(1,#W.Zones)]
      local x,z
      if zone.Id~="meadow" then x,z=W.RandomPoint(zone.Id,random,200) end
      local hit=x and workspace:Raycast(Vector3.new(x,400,z),Vector3.new(0,-800,0),rp)
      if hit and #Players:GetPlayers()>0 then
        local anchor=Instance.new("Attachment");anchor.Name="MeteorFall";anchor.WorldPosition=hit.Position+Vector3.new(0,2,0);anchor.Parent=workspace.Terrain
        workspace:SetAttribute("MeteorSeat",Vector3.new(x,0,z))
        local beam=Instance.new("ParticleEmitter");beam.Color=ColorSequence.new(Color3.fromRGB(190,150,255));beam.LightEmission=1;beam.Rate=60
        beam.Lifetime=NumberRange.new(6,9);beam.Speed=NumberRange.new(30,44);beam.EmissionDirection=Enum.NormalId.Top
        beam.Size=NumberSequence.new({NumberSequenceKeypoint.new(0,6),NumberSequenceKeypoint.new(1,0)});beam.Parent=anchor
        local light=Instance.new("PointLight");light.Color=Color3.fromRGB(190,150,255);light.Range=40;light.Brightness=3;light.Parent=anchor
        local rock
        task.spawn(function()
          rock=worldAsset("item_mineral",hit.Position,4)
          if rock then rock.Name="MeteorRock";rock:SetAttribute("MeadowScenery",true) end
        end)
        local claims,count={},0
        local prompt=Instance.new("ProximityPrompt");prompt.ActionText="별똥별 조각 줍기";prompt.ObjectText=zone.Name.." 별똥별";prompt.HoldDuration=1
        prompt.MaxActivationDistance=14;prompt.RequiresLineOfSight=false;prompt.Parent=anchor
        prompt.Triggered:Connect(function(player)
          if player:GetAttribute("ProfileReady")~=true then return end
          if claims[player] then
            player:SetAttribute("MeadowGearMessage","이미 조각을 주웠다.")
            player:SetAttribute("MeadowGearRevision",(player:GetAttribute("MeadowGearRevision") or 0)+1)
            return
          end
          if count>=5 then return end
          claims[player]=true;count+=1
          setNumber(player,"Crystal",readNumber(player,"Crystal",0)+5)
          setNumber(player,"Ectoplasm",readNumber(player,"Ectoplasm",0)+2)
          setNumber(player,"Steel",readNumber(player,"Steel",0)+1)
          setNumber(player,"Coins",readNumber(player,"Coins",0)+300)
          pcall(awardProgress,player,120,0)
          player:SetAttribute("MeadowGearMessage","별똥별 조각! 마력 결정 +5 · 원혼의 잔재 +2 · 강철 주괴 +1 · 코인 +300")
          player:SetAttribute("MeadowGearRevision",(player:GetAttribute("MeadowGearRevision") or 0)+1)
          if count>=5 then prompt.Enabled=false;beam.Enabled=false end
        end)
        toastAll("별똥별이 "..zone.Name.." 어딘가에 떨어졌다! 하늘로 치솟는 보랏빛 빛줄기를 찾아라. (6분)")
        task.delay(360,function()
          anchor:Destroy()
          if rock then rock:Destroy() end
          workspace:SetAttribute("MeteorSeat",nil)
        end)
      end
      task.wait(random:NextInteger(480,720))
    end
  end)
end

-- [광부 NPC] 12개 마을마다 광부가 있다. 채굴 훈련(코인)과 곡괭이 제작을 맡는다. 훈련은 채굴 Lv4까지만 가르쳐 준다.
do
  local sessions={}
  local lastAction={}
  local PICKS=Config.Pickaxes
  local function toast(player,text)
    player:SetAttribute("MeadowGearMessage",text)
    player:SetAttribute("MeadowGearRevision",(player:GetAttribute("MeadowGearRevision") or 0)+1)
  end
  local function costParts(pick)
    local parts={}
    for _,f in ipairs({"Coins","Ingot","Steel","Crystal","Claw","Fang"}) do
      if (pick[f] or 0)>0 then
        local mat=Config.MaterialByField[f]
        parts[#parts+1]=(f=="Coins" and "코인" or mat and mat.Name or f).." "..pick[f]
      end
    end
    return table.concat(parts,", ")
  end
  local function menu(player,town)
    sessions[player]={town=town,expires=os.clock()+60}
    local prof=readNumber(player,"MiningProficiency",0)
    local level=Config.MiningLevel(prof)
    local tier=readNumber(player,"PickaxeTier",0)
    local nextPick=PICKS[tier+1]
    local lines={"광부: '"..town.Hold.."의 광맥은 깊을수록 값이 나가지. 곡괭이와 요령만 있으면 누구나 캘 수 있어.'\n",
      "채굴 Lv"..level.." ("..prof.."/"..(Config.MiningThresholds[level+1] or "최고")..") · 곡괭이: "..(PICKS[tier] and PICKS[tier].Name or "없음")}
    local options={}
    if level<4 then
      lines[#lines+1]="채굴 훈련 — 코인 "..(60*level).." (숙련 +8, 최대 Lv4까지)"
      options[#options+1]={label="채굴 훈련 ("..(60*level).." 코인)",action="miner:train:0"}
    end
    if nextPick then
      lines[#lines+1]="다음 곡괭이: "..nextPick.Name.." (채굴 Lv"..nextPick.NeedMining.." 필요) — "..costParts(nextPick)
      options[#options+1]={label=nextPick.Name.." 제작",action="miner:craft:0"}
    else
      lines[#lines+1]="가장 좋은 곡괭이를 가졌다."
    end
    options[#options+1]={label="광맥 이야기",action="miner:info:0"}
    villageDialogue(player,town.Name.." 광부",table.concat(lines,"\n"),options)
  end
  remote.OnServerEvent:Connect(function(player,action)
    if typeof(action)~="string" or action:sub(1,6)~="miner:" then return end
    local verb=action:match("^miner:(%a+):%d$")
    if not verb then return end
    local session=sessions[player]
    if not session or os.clock()>session.expires then return end
    local town=session.town
    local root=player.Character and player.Character:FindFirstChild("HumanoidRootPart")
    if not root or (root.Position-Vector3.new(town.X,root.Position.Y,town.Z)).Magnitude>120 then return end
    if os.clock()-(lastAction[player] or 0)<1 then return end
    lastAction[player]=os.clock()
    local prof=readNumber(player,"MiningProficiency",0)
    local level=Config.MiningLevel(prof)
    if verb=="train" then
      if level>=4 then return end
      local cost=60*level
      if readNumber(player,"Coins",0)<cost then villageDialogue(player,"광부","훈련비가 모자라. 코인 "..cost.."이 필요해.");return end
      setNumber(player,"Coins",readNumber(player,"Coins",0)-cost)
      setNumber(player,"MiningProficiency",prof+8)
      local after=Config.MiningLevel(prof+8)
      villageDialogue(player,"광부","망치질 요령을 가르쳐 줬다. 채굴 숙련 +8"..(after>level and ("\n채굴 Lv"..after.." 달성!") or ""),{{label="계속 이야기",action="miner:info:0"}})
    elseif verb=="craft" then
      local tier=readNumber(player,"PickaxeTier",0)
      local pick=PICKS[tier+1]
      if not pick then return end
      if level<pick.NeedMining then villageDialogue(player,"광부",pick.Name.."은(는) 채굴 Lv"..pick.NeedMining.."부터 쓸 수 있어.");return end
      for _,f in ipairs({"Coins","Ingot","Steel","Crystal","Claw","Fang"}) do
        if (pick[f] or 0)>0 and readNumber(player,f,0)<pick[f] then villageDialogue(player,"광부","재료가 모자라: "..costParts(pick));return end
      end
      for _,f in ipairs({"Coins","Ingot","Steel","Crystal","Claw","Fang"}) do
        if (pick[f] or 0)>0 then setNumber(player,f,readNumber(player,f,0)-pick[f]) end
      end
      setNumber(player,"PickaxeTier",tier+1)
      villageDialogue(player,"광부",pick.Name.."을(를) 만들어 줬다! 가장 좋은 곡괭이가 자동으로 쓰여. 더 깊은 광맥을 캘 수 있고 수확도 늘어.",{{label="계속 이야기",action="miner:info:0"}})
    elseif verb=="info" then
      villageDialogue(player,"광부","· 철광맥은 어디서나 캘 수 있어.\n· 수정맥과 화산석은 채굴 Lv2~3부터.\n· 원혼석과 심층 철맥은 Lv4 이상, 혼돈의 수정맥은 Lv5야.\n· 좋은 곡괭이는 레벨이 모자라도 한 단계 깊은 맥을 캐게 해 줘.")
    end
  end)
  task.spawn(function()
    while workspace:GetAttribute("OpenWorldReady")~=true do task.wait(3) end
    task.wait(28)
    local rp=RaycastParams.new();rp.FilterType=Enum.RaycastFilterType.Include;rp.FilterDescendantsInstances={workspace.Terrain}
    for _,town in ipairs(Config.WorldMap.Towns or {}) do
      local a=2.2
      local x,z=town.X+math.cos(a)*30,town.Z+math.sin(a)*30
      local hit=workspace:Raycast(Vector3.new(x,400,z),Vector3.new(0,-800,0),rp)
      if not hit then warn("MINER_GROUND_UNVERIFIED "..town.Id)
      else
        task.spawn(function()
          local ok,npc=pcall(function()
            local desc=Instance.new("HumanoidDescription")
            local skin=Color3.fromRGB(190,140,100)
            desc.HeadColor=skin;desc.LeftArmColor=skin;desc.RightArmColor=skin;desc.TorsoColor=Color3.fromRGB(90,80,70)
            desc.LeftLegColor=Color3.fromRGB(60,50,44);desc.RightLegColor=Color3.fromRGB(60,50,44)
            local m=Players:CreateHumanoidModelFromDescriptionAsync(desc,Enum.HumanoidRigType.R15)
            desc:Destroy()
            return m
          end)
          if not ok or not npc then return end
          npc.Name="TownMiner_"..town.Id
          local hum=npc:FindFirstChildOfClass("Humanoid")
          if hum then hum.DisplayName="광부";hum.DisplayDistanceType=Enum.HumanoidDisplayDistanceType.Viewer end
          npc:PivotTo(CFrame.lookAt(hit.Position+Vector3.new(0,3.2,0),Vector3.new(town.X,hit.Position.Y+3.2,town.Z)))
          for _,part in ipairs(npc:GetDescendants()) do if part:IsA("BasePart") then part.Anchored=true end end
          npc.Parent=workspace
          local rock=worldAsset("vxRockWide",hit.Position+Vector3.new(4,0,3),3)
          if rock then rock.Name="MinerRock_"..town.Id;rock:SetAttribute("MeadowScenery",true) end
          local root=npc:FindFirstChild("HumanoidRootPart")
          if root then
            local prompt=Instance.new("ProximityPrompt");prompt.ActionText="광부와 이야기";prompt.ObjectText=town.Name.." 광부";prompt.HoldDuration=.4
            prompt.MaxActivationDistance=12;prompt.RequiresLineOfSight=false;prompt.Parent=root
            prompt.Triggered:Connect(function(player)
              if player:GetAttribute("ProfileReady")~=true then return end
              menu(player,town)
            end)
          end
        end)
      end
    end
  end)
end

-- [마을 현상금] 마을 현상금 게시판에서 그 지역 몬스터 처치 현상금을 받는다(소형 8마리 · 대형 20마리). 한 번에 하나, 보고는 아무 마을 게시판에서나.
do
  local W=Config.WorldMap
  local zoneTier={windcliff=3,worldtree=4,volcano=6,oasis=7,swamp=7,citadel=10,highland=5,canyon=7,chaos=9,wetland=4,desert=7,deadmarsh=9,meadow=2}
  local sessions={}
  local lastAction={}
  local function zoneName(id) for _,z in ipairs(W.Zones) do if z.Id==id then return z.Name end end return id end
  local function zoneIdOf(index) return W.Zones[index] and W.Zones[index].Id end
  local function toast(player,text)
    player:SetAttribute("MeadowGearMessage",text)
    player:SetAttribute("MeadowGearRevision",(player:GetAttribute("MeadowGearRevision") or 0)+1)
  end
  meadowOil.bountyKill=function(player,target)
    local zi=readNumber(player,"BountyZone",0)
    if zi==0 or not target.position then return end
    local need=readNumber(player,"BountyNeed",0)
    local have=readNumber(player,"BountyKills",0)
    if have>=need then return end
    if W.ZoneAt(target.position.X,target.position.Z)~=zoneIdOf(zi) then return end
    have+=1
    setNumber(player,"BountyKills",have)
    if have>=need then toast(player,"현상금 목표 완료! 마을 게시판에서 보상을 받아라.")
    elseif have%2==0 then toast(player,"현상금 "..zoneName(zoneIdOf(zi)).." "..have.."/"..need) end
  end
  local function boardMenu(player,town)
    sessions[player]={town=town,expires=os.clock()+60}
    local zi=readNumber(player,"BountyZone",0)
    if zi==0 then
      local zid=town.Zone
      local zoneIndex
      for i,z in ipairs(W.Zones) do if z.Id==zid then zoneIndex=i end end
      villageDialogue(player,town.Name.." 현상금 게시판",town.Hold.."에서 몬스터를 처치하는 현상금이다. 어느 몬스터든 이 지역에서 잡으면 센다. 한 번에 하나만 받을 수 있다.\n\n· 소형: 8마리 — 코인과 주괴\n· 대형: 20마리 — 큰 코인과 결정, 가죽",
        (function()
          local o={{label="소형 현상금 (8마리)",action="bounty:take:1"},{label="대형 현상금 (20마리)",action="bounty:take:2"}}
          local n=readNumber(player,"Notoriety",0)
          if n>0 then o[#o+1]={label="수배 해제 ("..(150*n).."코인)",action="bounty:pay:0"} end
          return o
        end)())
    else
      local need=readNumber(player,"BountyNeed",0)
      local have=readNumber(player,"BountyKills",0)
      local text="진행 중: "..zoneName(zoneIdOf(zi)).." 몬스터 "..have.."/"..need.."마리 ("..(readNumber(player,"BountyBig",0)==1 and "대형" or "소형")..")"
      local options={}
      if have>=need then options[#options+1]={label="보상 받기",action="bounty:claim:0"} end
      options[#options+1]={label="현상금 포기",action="bounty:drop:0"}
      local n=readNumber(player,"Notoriety",0)
      if n>0 then options[#options+1]={label="수배 해제 ("..(150*n).."코인)",action="bounty:pay:0"} end
      villageDialogue(player,town.Name.." 현상금 게시판",text,options)
    end
  end
  remote.OnServerEvent:Connect(function(player,action)
    if typeof(action)~="string" or action:sub(1,7)~="bounty:" then return end
    local verb,arg=action:match("^bounty:(%a+):(%d)$")
    if not verb then return end
    arg=tonumber(arg)
    local session=sessions[player]
    if not session or os.clock()>session.expires then return end
    local root=player.Character and player.Character:FindFirstChild("HumanoidRootPart")
    local town=session.town
    if not root or (root.Position-Vector3.new(town.X,root.Position.Y,town.Z)).Magnitude>120 then return end
    if os.clock()-(lastAction[player] or 0)<1 then return end
    lastAction[player]=os.clock()
    if verb=="pay" then
      local n=readNumber(player,"Notoriety",0)
      if n<=0 then return end
      local cost=150*n
      if readNumber(player,"Coins",0)<cost then villageDialogue(player,"수배 해제","코인이 부족해. "..cost.."코인이 필요해.");return end
      setNumber(player,"Coins",readNumber(player,"Coins",0)-cost)
      setNumber(player,"Notoriety",n-1)
      villageDialogue(player,"수배 해제","코인 "..cost.."을 내고 수배 단계를 1 낮췄다. (현재 "..(n-1).."단계)")
      return
    end
    local zi=readNumber(player,"BountyZone",0)
    if verb=="take" and zi==0 and (arg==1 or arg==2) then
      local zoneIndex
      for i,z in ipairs(W.Zones) do if z.Id==town.Zone then zoneIndex=i end end
      if not zoneIndex then return end
      setNumber(player,"BountyZone",zoneIndex)
      setNumber(player,"BountyNeed",arg==1 and 8 or 20)
      setNumber(player,"BountyKills",0)
      setNumber(player,"BountyBig",arg==2 and 1 or 0)
      villageDialogue(player,"현상금","현상금을 받았다. "..town.Hold.."에서 몬스터 "..(arg==1 and 8 or 20).."마리를 처치하라.")
    elseif verb=="drop" and zi~=0 then
      setNumber(player,"BountyZone",0);setNumber(player,"BountyKills",0);setNumber(player,"BountyNeed",0)
      villageDialogue(player,"현상금","현상금을 포기했다.")
    elseif verb=="claim" and zi~=0 then
      local need=readNumber(player,"BountyNeed",0)
      if readNumber(player,"BountyKills",0)<need then return end
      local tier=zoneTier[zoneIdOf(zi)] or 4
      local big=readNumber(player,"BountyBig",0)==1
      local coins=tier*(big and 140 or 60)
      setNumber(player,"Coins",readNumber(player,"Coins",0)+coins)
      local gifts={}
      if big then
        setNumber(player,"Crystal",readNumber(player,"Crystal",0)+3);gifts[#gifts+1]="마력 결정 3"
        setNumber(player,"Leather",readNumber(player,"Leather",0)+3);gifts[#gifts+1]="무두질 가죽 3"
      else
        setNumber(player,"Ingot",readNumber(player,"Ingot",0)+1+math.floor(tier/4));gifts[#gifts+1]="주괴 "..(1+math.floor(tier/4))
      end
      pcall(awardProgress,player,tier*(big and 60 or 25),0)
      setNumber(player,"BountyZone",0);setNumber(player,"BountyKills",0);setNumber(player,"BountyNeed",0)
      villageDialogue(player,"현상금","현상금을 받았다!\n코인 +"..coins.."\n"..table.concat(gifts,", "))
    end
  end)
  task.spawn(function()
    while workspace:GetAttribute("OpenWorldReady")~=true do task.wait(3) end
    task.wait(26)
    local rp=RaycastParams.new();rp.FilterType=Enum.RaycastFilterType.Include;rp.FilterDescendantsInstances={workspace.Terrain}
    for _,town in ipairs(W.Towns or {}) do
      local a=3/4*math.pi*2+.4
      local x,z=town.X+math.cos(a)*19,town.Z+math.sin(a)*19
      local hit=workspace:Raycast(Vector3.new(x,400,z),Vector3.new(0,-800,0),rp)
      if hit then
        task.spawn(function()
          local board=worldAsset("vxPoles",hit.Position,4.4)
          if board then board.Name="BountyBoard_"..town.Id;board:SetAttribute("MeadowScenery",true) end
        end)
        local anchor=Instance.new("Attachment");anchor.Name="BountyBoard_"..town.Id;anchor.WorldPosition=hit.Position+Vector3.new(0,2,0);anchor.Parent=workspace.Terrain
        local prompt=Instance.new("ProximityPrompt");prompt.ActionText="현상금 게시판";prompt.ObjectText=town.Name;prompt.HoldDuration=.4
        prompt.MaxActivationDistance=12;prompt.RequiresLineOfSight=false;prompt.Parent=anchor
        prompt.Triggered:Connect(function(player)
          if player:GetAttribute("ProfileReady")~=true then return end
          boardMenu(player,town)
        end)
      else warn("BOUNTY_BOARD_GROUND_UNVERIFIED "..town.Id) end
    end
  end)
end

-- [탈것] 마을 마구간(12곳)에서 당나귀·말·황소·숲사슴을 사고 탄다. 타면 걸음이 빨라지고, 피격·마을 진입·던전 입장 시 자동으로 내린다.
do
  local MOUNTS=Config.Mounts
  local riding={}
  local sessions={}
  local lastAction={}
  local lastRide={}
  local function dismount(player,reason)
    local st=riding[player]
    if not st then return end
    riding[player]=nil
    if st.conn then st.conn:Disconnect() end
    if st.model then st.model:Destroy() end
    local humanoid=player.Character and player.Character:FindFirstChildOfClass("Humanoid")
    if humanoid then
      humanoid.HipHeight=st.hip
      humanoid.WalkSpeed=st.walk
    end
    player:SetAttribute("MountRiding",0)
    if reason then pcall(function() villageDialogue(player,"탈것",reason) end) end
  end
  local function inSafePlace(root)
    local v=Config.WorldMap.Village
    local p=root.Position
    if p.X>=v.X0 and p.X<=v.X1 and p.Z>=v.Z0 and p.Z<=v.Z1 then return true end
    if p.X>7000 then return true end
    for _,t in ipairs(Config.WorldMap.Towns or {}) do
      local dx,dz=p.X-t.X,p.Z-t.Z
      if dx*dx+dz*dz<70*70 then return true end
    end
    return false
  end
  local function mount(player,index)
    local m=MOUNTS[index]
    local character=player.Character
    local root=character and character:FindFirstChild("HumanoidRootPart")
    local humanoid=character and character:FindFirstChildOfClass("Humanoid")
    if not m or not root or not humanoid or humanoid.Health<=0 then return end
    dismount(player)
    local model=worldAsset(m.Key,root.Position,m.Height)
    if not model then pcall(function() villageDialogue(player,"탈것",m.Name.." 모델을 불러오지 못했다.") end);return end
    model.Name="Mount_"..player.UserId
    local st={hip=humanoid.HipHeight,walk=humanoid.WalkSpeed,model=model,index=index}
    riding[player]=st
    lastRide[player]=index
    humanoid.HipHeight=st.hip+math.max(0,m.Height-2)
    task.wait()
    -- 안장 위치: 모델 윗면을 루트 아래 1스터드에 맞춘다.
    local size=model:GetExtentsSize()
    local center=model:GetBoundingBox().Position
    local pivot=model:GetPivot()
    local offset=pivot.Position-center
    local target=Vector3.new(root.Position.X,root.Position.Y-1-size.Y/2,root.Position.Z)
    model:PivotTo(CFrame.new(target+offset)*CFrame.Angles(0,math.atan2(-root.CFrame.LookVector.X,-root.CFrame.LookVector.Z)+math.pi,0))
    local anchorPart
    for _,part in ipairs(model:GetDescendants()) do
      if part:IsA("BasePart") then
        part.Anchored=false;part.CanCollide=false;part.CanQuery=false;part.CanTouch=false;part.Massless=true
        if not anchorPart or part.Size.Magnitude>anchorPart.Size.Magnitude then anchorPart=part end
      end
    end
    if anchorPart then
      for _,part in ipairs(model:GetDescendants()) do
        if part:IsA("BasePart") and part~=anchorPart then
          local w=Instance.new("WeldConstraint");w.Part0=anchorPart;w.Part1=part;w.Parent=anchorPart
        end
      end
      local w=Instance.new("WeldConstraint");w.Part0=root;w.Part1=anchorPart;w.Parent=anchorPart
    end
    model.Parent=workspace
    humanoid.WalkSpeed=m.Speed
    player:SetAttribute("MountRiding",index)
    local last=humanoid.Health
    st.conn=humanoid.HealthChanged:Connect(function(h)
      if h<last-0.5 then dismount(player,"공격을 받아 "..m.Name.."에서 떨어졌다!") end
      last=h
    end)
    task.spawn(function()
      while riding[player]==st and player.Parent do
        task.wait(1)
        local r=player.Character and player.Character:FindFirstChild("HumanoidRootPart")
        local h=player.Character and player.Character:FindFirstChildOfClass("Humanoid")
        if not r or not h or h.Health<=0 then dismount(player);break end
        if inSafePlace(r) then dismount(player,"마을에 들어와 "..m.Name.."에서 내렸다.");break end
        h.WalkSpeed=m.Speed
      end
    end)
  end
  local function costText(m)
    local parts={"코인 "..m.Coins}
    if (m.Ingot or 0)>0 then parts[#parts+1]="주괴 "..m.Ingot end
    if (m.Feather or 0)>0 then parts[#parts+1]="깃털 "..m.Feather end
    return table.concat(parts,", ")
  end
  local function stableMenu(player,town)
    local owned=readNumber(player,"MountOwned",0)
    local lines={town.Name.." 마구간. 탈것을 타면 마을 밖 넓은 대륙을 빠르게 달릴 수 있다. 공격을 받으면 떨어진다.\n"}
    local options={}
    for i,m in ipairs(MOUNTS) do
      local has=bit32.band(owned,bit32.lshift(1,i-1))~=0
      lines[#lines+1]=m.Name.." (속도 "..m.Speed..") — "..(has and "보유" or costText(m))
      options[#options+1]={label=has and ("타기 · "..m.Name) or ("사기 · "..m.Name),action=(has and "mount:ride:" or "mount:buy:")..i}
    end
    options[#options+1]={label="내리기",action="mount:off:0"}
    sessions[player]={town=town,expires=os.clock()+60}
    villageDialogue(player,"마구간",table.concat(lines,"\n"),options)
  end
  remote.OnServerEvent:Connect(function(player,action)
    if typeof(action)~="string" or action:sub(1,6)~="mount:" then return end
    local verb,arg=action:match("^mount:(%a+):(%d)$")
    if not verb then return end
    arg=tonumber(arg)
    if verb=="quick" then
      -- 빠른 버튼: 타는 중이면 내리고, 아니면 마지막(없으면 가장 빠른) 보유 탈것을 탄다. 마을·던전 안에서는 타지 못한다.
      if os.clock()-(lastAction[player] or 0)<1 then return end
      lastAction[player]=os.clock()
      if riding[player] then dismount(player,"탈것에서 내렸다.");return end
      local r=player.Character and player.Character:FindFirstChild("HumanoidRootPart")
      if not r then return end
      if inSafePlace(r) then pcall(function() villageDialogue(player,"탈것","마을과 던전 안에서는 탈것을 탈 수 없다. 마을 밖으로 나가자.") end);return end
      local owned=readNumber(player,"MountOwned",0)
      local pick=lastRide[player]
      if not pick or bit32.band(owned,bit32.lshift(1,pick-1))==0 then
        pick=nil
        for i=#MOUNTS,1,-1 do if bit32.band(owned,bit32.lshift(1,i-1))~=0 then pick=i;break end end
      end
      if pick then mount(player,pick) end
      return
    end
    local session=sessions[player]
    if not session or os.clock()>session.expires then return end
    local root=player.Character and player.Character:FindFirstChild("HumanoidRootPart")
    if not root or (root.Position-Vector3.new(session.town.X,root.Position.Y,session.town.Z)).Magnitude>115 then return end
    if os.clock()-(lastAction[player] or 0)<1 then return end
    lastAction[player]=os.clock()
    if verb=="off" then dismount(player,"탈것에서 내렸다.");return end
    local m=MOUNTS[arg]
    if not m then return end
    local owned=readNumber(player,"MountOwned",0)
    local flag=bit32.lshift(1,arg-1)
    if verb=="buy" then
      if bit32.band(owned,flag)~=0 then return end
      for _,pair in ipairs({{"Coins",m.Coins},{"Ingot",m.Ingot},{"Feather",m.Feather}}) do
        if (pair[2] or 0)>0 and readNumber(player,pair[1],0)<pair[2] then
          villageDialogue(player,"마구간","재료가 부족하다: "..costText(m));return
        end
      end
      for _,pair in ipairs({{"Coins",m.Coins},{"Ingot",m.Ingot},{"Feather",m.Feather}}) do
        if (pair[2] or 0)>0 then setNumber(player,pair[1],readNumber(player,pair[1],0)-pair[2]) end
      end
      setNumber(player,"MountOwned",bit32.bor(owned,flag))
      villageDialogue(player,"마구간",m.Name.."을(를) 샀다! 이제 마구간에서 탈 수 있다.",{{label="타기 · "..m.Name,action="mount:ride:"..arg}})
    elseif verb=="ride" then
      if bit32.band(owned,flag)==0 then return end
      -- 마을 안에서는 바로 내리므로 마을 밖으로 나가서 탄다. 마구간은 마을 가장자리에 둔다.
      mount(player,arg)
    end
  end)
  Players.PlayerRemoving:Connect(function(player) dismount(player);sessions[player]=nil;lastAction[player]=nil end)
  task.spawn(function()
    while workspace:GetAttribute("OpenWorldReady")~=true do task.wait(3) end
    task.wait(24)
    local rp=RaycastParams.new();rp.FilterType=Enum.RaycastFilterType.Include;rp.FilterDescendantsInstances={workspace.Terrain}
    for _,town in ipairs(Config.WorldMap.Towns or {}) do
      -- 마을 밖(반경 84)에 마구간을 둔다. 반경 70 안쪽은 탑승 불가 구역이다.
      local a=4.2
      local x,z=town.X+math.cos(a)*84,town.Z+math.sin(a)*84
      local hit=workspace:Raycast(Vector3.new(x,400,z),Vector3.new(0,-800,0),rp)
      if hit then
        task.spawn(function()
          local stall=worldAsset("vxStall",hit.Position,4)
          if stall then stall.Name="Stable_"..town.Id;stall:SetAttribute("MeadowScenery",true) end
          local horse=worldAsset("mon_horse",hit.Position+Vector3.new(6,0,2),5)
          if horse then horse.Name="StableHorse_"..town.Id;horse:SetAttribute("MeadowScenery",true) end
        end)
        local anchor=Instance.new("Attachment");anchor.Name="Stable_"..town.Id;anchor.WorldPosition=hit.Position+Vector3.new(0,2,0);anchor.Parent=workspace.Terrain
        local prompt=Instance.new("ProximityPrompt");prompt.ActionText="마구간";prompt.ObjectText=town.Name.." 마구간";prompt.HoldDuration=.4
        prompt.MaxActivationDistance=14;prompt.RequiresLineOfSight=false;prompt.Parent=anchor
        prompt.Triggered:Connect(function(player)
          if player:GetAttribute("ProfileReady")~=true then return end
          stableMenu(player,town)
        end)
      else warn("STABLE_GROUND_UNVERIFIED "..town.Id) end
    end
  end)
end

-- [영지 · 성채 꾸미기] 안식처 곁 영지 문서에서 내 터(5칸)에 건물을 세우거나 바꾼다. 선택은 EstateA(칸당 4비트)에 저장된다.
-- 플레이어마다 접속 순서대로 터를 하나씩 받고, 건물은 모든 플레이어에게 보인다(등록된 CC0 모델만 사용).
do
  local E=Config.Estate
  local origin=Vector3.new(330,3,250)
  local plotOf={}
  local usedPlots={}
  local sessions={}
  local lastBuild={}
  local function slotChoice(player,slot) return bit32.band(bit32.rshift(readNumber(player,"EstateA",0),(slot-1)*4),15) end
  local function slotCenter(plot,slot)
    local col=(slot-1)%3
    local row=math.floor((slot-1)/3)
    return origin+Vector3.new((plot-1)*130+col*40,0,row*40)
  end
  local function folderOf(player)
    local name="Estate_"..player.UserId
    local f=workspace:FindFirstChild(name)
    if not f then f=Instance.new("Folder");f.Name=name;f.Parent=workspace end
    return f
  end
  local function renderSlot(player,slot)
    local plot=plotOf[player]
    if not plot then return end
    local folder=folderOf(player)
    local old=folder:FindFirstChild("Slot"..slot)
    if old then old:Destroy() end
    local choice=slotChoice(player,slot)
    local entry=E.Catalog[choice]
    if not entry then return end
    local center=slotCenter(plot,slot)
    local rp=RaycastParams.new()
    rp.FilterType=Enum.RaycastFilterType.Include
    rp.FilterDescendantsInstances={meadowTerrain}
    local hit=workspace:Raycast(Vector3.new(center.X,300,center.Z),Vector3.new(0,-600,0),rp)
    if not hit then warn("ESTATE_GROUND_UNVERIFIED "..player.Name.." "..slot);return end
    local model=worldAsset(entry.Key,hit.Position,entry.Height)
    if model then
      model.Name="Slot"..slot;model:SetAttribute("MeadowScenery",true)
      model.Parent=folder
    end
  end
  local function renderAll(player)
    for slot=1,E.Slots do renderSlot(player,slot) end
  end
  local function assignPlot(player)
    if plotOf[player] then return plotOf[player] end
    for i=1,8 do
      if not usedPlots[i] then usedPlots[i]=player;plotOf[player]=i;return i end
    end
  end
  local function costText(entry)
    local parts={}
    if (entry.Coins or 0)>0 then parts[#parts+1]="코인 "..entry.Coins end
    if (entry.Ingot or 0)>0 then parts[#parts+1]="주괴 "..entry.Ingot end
    if (entry.Leather or 0)>0 then parts[#parts+1]="가죽 "..entry.Leather end
    return table.concat(parts,", ")
  end
  local function slotMenu(player)
    local plot=plotOf[player] or assignPlot(player)
    local lines={"내 영지 터: "..(plot or "?").."번 구역 (안식처 동쪽). 칸을 골라 건물을 세우거나 바꿔라.\n"}
    local options={}
    for slot=1,E.Slots do
      local entry=E.Catalog[slotChoice(player,slot)]
      lines[#lines+1]=slot.."번 칸 — "..(entry and entry.Name or "빈터")
      options[#options+1]={label=slot.."번 칸 · "..(entry and entry.Name or "빈터"),action="estate:s:"..slot}
    end
    sessions[player]=os.clock()+90
    villageDialogue(player,"영지 문서",table.concat(lines,"\n"),options)
  end
  local function buildMenu(player,slot,page)
    page=page or 1
    local per=3
    local first=(page-1)*per+1
    local lines={slot.."번 칸에 세울 건물 ("..page.."/"..math.ceil(#E.Catalog/3).."쪽)\n"}
    local options={}
    for i=first,math.min(#E.Catalog,first+per-1) do
      local entry=E.Catalog[i]
      lines[#lines+1]=entry.Name.." — "..costText(entry)
      options[#options+1]={label=entry.Name,action="estate:b:"..slot..":"..i}
    end
    if first+per<=#E.Catalog then options[#options+1]={label="다음 쪽 ▶",action="estate:p:"..slot..":"..(page+1)} end
    if slotChoice(player,slot)~=0 then options[#options+1]={label="철거하기",action="estate:b:"..slot..":0"} end
    sessions[player]=os.clock()+90
    villageDialogue(player,"영지 문서 · "..slot.."번 칸",table.concat(lines,"\n"),options)
  end
  -- [내실 가구 · 동료 배치] 터 뒤쪽 줄에 가구 5칸과 동료 자리 3칸을 둔다.
  local F=E.Furniture
  local roster=Config.Companions
  local function fChoice(player,slot) return bit32.band(bit32.rshift(readNumber(player,"EstateB",0),(slot-1)*4),15) end
  local function cChoice(player,post) return bit32.band(bit32.rshift(readNumber(player,"EstateC",0),(post-1)*5),31) end
  local function ownsCompanion(player,idx) return idx>=1 and roster[idx]~=nil and bit32.band(readNumber(player,"CompanionOwned",0),bit32.lshift(1,idx-1))~=0 end
  local function groundAt(pos)
    local rp=RaycastParams.new();rp.FilterType=Enum.RaycastFilterType.Include;rp.FilterDescendantsInstances={meadowTerrain}
    return workspace:Raycast(Vector3.new(pos.X,300,pos.Z),Vector3.new(0,-600,0),rp)
  end
  local function renderFurn(player,slot)
    local plot=plotOf[player]
    if not plot then return end
    local folder=folderOf(player)
    local old=folder:FindFirstChild("Furn"..slot)
    if old then old:Destroy() end
    local entry=F[fChoice(player,slot)]
    if not entry then return end
    local hit=groundAt(origin+Vector3.new((plot-1)*130+(slot-1)*24-24,0,105))
    if not hit then warn("ESTATE_FURN_GROUND_UNVERIFIED "..player.Name);return end
    local model=worldAsset(entry.Key,hit.Position,entry.Height)
    if model then model.Name="Furn"..slot;model:SetAttribute("MeadowScenery",true);model.Parent=folder end
  end
  local function renderPost(player,post)
    local plot=plotOf[player]
    if not plot then return end
    local folder=folderOf(player)
    local old=folder:FindFirstChild("Post"..post)
    if old then old:Destroy() end
    local idx=cChoice(player,post)
    if idx==0 or not ownsCompanion(player,idx) then return end
    local c=roster[idx]
    local pos=origin+Vector3.new((plot-1)*130+(post-1)*40,0,72)
    local hit=groundAt(pos)
    if not hit then warn("ESTATE_POST_GROUND_UNVERIFIED "..player.Name);return end
    local ok,npc=pcall(function()
      local desc=Instance.new("HumanoidDescription")
      local skin=Color3.fromRGB(c.Skin[1],c.Skin[2],c.Skin[3])
      desc.HeadColor=skin;desc.LeftArmColor=skin;desc.RightArmColor=skin;desc.TorsoColor=Color3.fromRGB(c.Shirt[1],c.Shirt[2],c.Shirt[3])
      desc.LeftLegColor=Color3.fromRGB(60,56,52);desc.RightLegColor=Color3.fromRGB(60,56,52)
      local m=Players:CreateHumanoidModelFromDescriptionAsync(desc,Enum.HumanoidRigType.R15)
      desc:Destroy()
      return m
    end)
    if not ok or not npc then return end
    npc.Name="Post"..post
    local hum=npc:FindFirstChildOfClass("Humanoid")
    if hum then hum.DisplayName=c.Name end
    npc:PivotTo(CFrame.lookAt(hit.Position+Vector3.new(0,3.2,0),hit.Position+Vector3.new(0,3.2,-10)))
    for _,part in ipairs(npc:GetDescendants()) do if part:IsA("BasePart") then part.Anchored=true end end
    npc.Parent=folder
    local root=npc:FindFirstChild("HumanoidRootPart")
    if root then
      local prompt=Instance.new("ProximityPrompt");prompt.ActionText="대화";prompt.ObjectText=c.Name.." · "..c.Role;prompt.HoldDuration=.4
      prompt.MaxActivationDistance=12;prompt.RequiresLineOfSight=false;prompt.Parent=root
      prompt.Triggered:Connect(function(who)
        pcall(function() villageDialogue(who,c.Name.." · "..c.Role,"\""..c.Worldview.."\"\n\n"..(who==player and "영지를 지키며 네 귀환을 기다리고 있었어." or "이 영지의 주인을 기다리는 중이야.")) end)
      end)
    end
  end
  local function renderAllExtra(player)
    for slot=1,5 do renderFurn(player,slot) end
    for post=1,3 do renderPost(player,post) end
  end
  local function topMenu(player)
    local plot=plotOf[player] or assignPlot(player)
    sessions[player]=os.clock()+90
    villageDialogue(player,"영지 문서","내 영지 터: "..(plot or "?").."번 구역 (안식처 동쪽).\n건물 5칸, 내실 가구 5칸, 동료 자리 3칸을 꾸밀 수 있다.",{
      {label="건물 짓기 (5칸)",action="estate:m:1"},
      {label="내실 가구 (5칸)",action="estate:m:2"},
      {label="동료 배치 (3자리)",action="estate:m:3"}})
  end
  local function furnSlotMenu(player)
    local lines={"내실 가구 칸을 골라라.\n"}
    local options={}
    for slot=1,5 do
      local e=F[fChoice(player,slot)]
      lines[#lines+1]=slot.."번 — "..(e and e.Name or "빈 칸")
      options[#options+1]={label=slot.."번 · "..(e and e.Name or "빈 칸"),action="estate:f:"..slot}
    end
    sessions[player]=os.clock()+90
    villageDialogue(player,"영지 문서 · 내실",table.concat(lines,"\n"),options)
  end
  local function furnBuildMenu(player,slot,page)
    local per=3
    local first=(page-1)*per+1
    local lines={slot.."번 가구 칸 ("..page.."/"..math.ceil(#F/per).."쪽)\n"}
    local options={}
    for i=first,math.min(#F,first+per-1) do
      lines[#lines+1]=F[i].Name.." — "..costText(F[i])
      options[#options+1]={label=F[i].Name,action="estate:g:"..slot..":"..i}
    end
    if first+per<=#F then options[#options+1]={label="다음 쪽 ▶",action="estate:q:"..slot..":"..(page+1)} end
    if fChoice(player,slot)~=0 then options[#options+1]={label="치우기",action="estate:g:"..slot..":0"} end
    sessions[player]=os.clock()+90
    villageDialogue(player,"영지 문서 · 가구 "..slot.."번",table.concat(lines,"\n"),options)
  end
  local function postMenu(player)
    local lines={"동료를 세울 자리를 골라라. 영입한 동료만 세울 수 있다.\n"}
    local options={}
    for post=1,3 do
      local idx=cChoice(player,post)
      local c=ownsCompanion(player,idx) and roster[idx] or nil
      lines[#lines+1]=post.."번 자리 — "..(c and c.Name or "비어 있음")
      options[#options+1]={label=post.."번 자리 · "..(c and c.Name or "비어 있음"),action="estate:c:"..post}
    end
    sessions[player]=os.clock()+90
    villageDialogue(player,"영지 문서 · 동료 배치",table.concat(lines,"\n"),options)
  end
  local function postPickMenu(player,post,page)
    local owned={}
    for idx,c in ipairs(roster) do if ownsCompanion(player,idx) then owned[#owned+1]=idx end end
    local per=3
    local first=(page-1)*per+1
    local lines={post.."번 자리에 세울 동료 ("..page.."/"..math.max(1,math.ceil(#owned/per)).."쪽)\n"}
    local options={}
    if #owned==0 then lines[#lines+1]="아직 영입한 동료가 없다." end
    for i=first,math.min(#owned,first+per-1) do
      local c=roster[owned[i]]
      lines[#lines+1]=c.Name.." — "..c.Role
      options[#options+1]={label=c.Name,action="estate:d:"..post..":"..owned[i]}
    end
    if first+per<=#owned then options[#options+1]={label="다음 쪽 ▶",action="estate:r:"..post..":"..(page+1)} end
    if cChoice(player,post)~=0 then options[#options+1]={label="자리 비우기",action="estate:d:"..post..":0"} end
    sessions[player]=os.clock()+90
    villageDialogue(player,"영지 문서 · "..post.."번 자리",table.concat(lines,"\n"),options)
  end
  task.spawn(function()
    task.wait(12)
    local anchor=Instance.new("Attachment");anchor.Name="Estate_Deed";anchor.WorldPosition=Vector3.new(300,5,215);anchor.Parent=workspace.Terrain
    local glow=Instance.new("PointLight");glow.Color=Color3.fromRGB(255,220,140);glow.Range=22;glow.Brightness=2;glow.Parent=anchor
    local prompt=Instance.new("ProximityPrompt");prompt.ActionText="영지 관리";prompt.ObjectText="영지 문서";prompt.HoldDuration=.4
    prompt.MaxActivationDistance=14;prompt.RequiresLineOfSight=false;prompt.Parent=anchor
    task.spawn(function()
      local m=worldAsset("vxStall",Vector3.new(300,3,215),4)
      if m then m.Name="Estate_DeedBoard";m:SetAttribute("MeadowScenery",true) end
    end)
    prompt.Triggered:Connect(function(player)
      if player:GetAttribute("ProfileReady")~=true then return end
      topMenu(player)
    end)
  end)
  remote.OnServerEvent:Connect(function(player,action)
    if typeof(action)~="string" or action:sub(1,7)~="estate:" then return end
    if os.clock()>(sessions[player] or 0) then return end
    local root=player.Character and player.Character:FindFirstChild("HumanoidRootPart")
    if not root or (root.Position-Vector3.new(300,5,215)).Magnitude>60 then return end
    local m=tonumber(action:match("^estate:m:(%d)$"))
    if m then
      if m==1 then slotMenu(player) elseif m==2 then furnSlotMenu(player) elseif m==3 then postMenu(player) end
      return
    end
    local fs=tonumber(action:match("^estate:f:(%d+)$"))
    if fs and fs>=1 and fs<=5 then furnBuildMenu(player,fs,1);return end
    local qs,qp=action:match("^estate:q:(%d+):(%d+)$")
    if qs then
      qs,qp=tonumber(qs),tonumber(qp)
      if qs>=1 and qs<=5 and qp>=1 and qp<=math.ceil(#F/3) then furnBuildMenu(player,qs,qp) end
      return
    end
    local gs,gi=action:match("^estate:g:(%d+):(%d+)$")
    if gs then
      gs,gi=tonumber(gs),tonumber(gi)
      if gs<1 or gs>5 or gi<0 or gi>#F then return end
      if os.clock()-(lastBuild[player] or 0)<1.5 then return end
      lastBuild[player]=os.clock()
      local mask=readNumber(player,"EstateB",0)
      local cleared=bit32.band(mask,bit32.bnot(bit32.lshift(15,(gs-1)*4)))
      if gi==0 then
        setNumber(player,"EstateB",cleared);renderFurn(player,gs)
        villageDialogue(player,"영지 문서",gs.."번 가구를 치웠다.",{{label="다른 칸 보기",action="estate:m:2"}});return
      end
      local entry=F[gi]
      if fChoice(player,gs)==gi then villageDialogue(player,"영지 문서","이미 그 가구가 놓여 있다.");return end
      for _,pair in ipairs({{"Coins",entry.Coins},{"Ingot",entry.Ingot}}) do
        if (pair[2] or 0)>0 and readNumber(player,pair[1],0)<pair[2] then villageDialogue(player,"영지 문서","재료가 부족하다: "..costText(entry));return end
      end
      for _,pair in ipairs({{"Coins",entry.Coins},{"Ingot",entry.Ingot}}) do
        if (pair[2] or 0)>0 then setNumber(player,pair[1],readNumber(player,pair[1],0)-pair[2]) end
      end
      setNumber(player,"EstateB",bit32.bor(cleared,bit32.lshift(gi,(gs-1)*4)))
      renderFurn(player,gs)
      villageDialogue(player,"영지 문서",entry.Name.."을(를) "..gs.."번 칸에 놓았다!",{{label="다른 칸 보기",action="estate:m:2"}})
      return
    end
    local cp=tonumber(action:match("^estate:c:(%d+)$"))
    if cp and cp>=1 and cp<=3 then postPickMenu(player,cp,1);return end
    local rs,rp2=action:match("^estate:r:(%d+):(%d+)$")
    if rs then
      rs,rp2=tonumber(rs),tonumber(rp2)
      if rs>=1 and rs<=3 and rp2>=1 and rp2<=6 then postPickMenu(player,rs,rp2) end
      return
    end
    local ds,di=action:match("^estate:d:(%d+):(%d+)$")
    if ds then
      ds,di=tonumber(ds),tonumber(di)
      if ds<1 or ds>3 or di<0 or di>31 then return end
      if os.clock()-(lastBuild[player] or 0)<1.5 then return end
      lastBuild[player]=os.clock()
      if di~=0 and not ownsCompanion(player,di) then return end
      local mask=readNumber(player,"EstateC",0)
      -- 같은 동료가 다른 자리에 있으면 그 자리를 비운다.
      if di~=0 then
        for post=1,3 do
          if post~=ds and cChoice(player,post)==di then mask=bit32.band(mask,bit32.bnot(bit32.lshift(31,(post-1)*5))) end
        end
      end
      mask=bit32.band(mask,bit32.bnot(bit32.lshift(31,(ds-1)*5)))
      mask=bit32.bor(mask,bit32.lshift(di,(ds-1)*5))
      setNumber(player,"EstateC",mask)
      for post=1,3 do task.spawn(renderPost,player,post) end
      villageDialogue(player,"영지 문서",di==0 and (ds.."번 자리를 비웠다.") or (roster[di].Name.."을(를) "..ds.."번 자리에 세웠다."),{{label="다른 자리 보기",action="estate:m:3"}})
      return
    end
    local slot=tonumber(action:match("^estate:s:(%d+)$"))
    if slot and slot>=1 and slot<=E.Slots then buildMenu(player,slot,1);return end
    local ps,pp=action:match("^estate:p:(%d+):(%d+)$")
    if ps then
      ps,pp=tonumber(ps),tonumber(pp)
      if ps>=1 and ps<=E.Slots and pp>=1 and pp<=math.ceil(#E.Catalog/3) then buildMenu(player,ps,pp) end
      return
    end
    local bs,bi=action:match("^estate:b:(%d+):(%d+)$")
    if not bs then return end
    bs,bi=tonumber(bs),tonumber(bi)
    if bs<1 or bs>E.Slots or bi<0 or bi>#E.Catalog then return end
    if os.clock()-(lastBuild[player] or 0)<1.5 then return end
    lastBuild[player]=os.clock()
    local current=slotChoice(player,bs)
    local mask=readNumber(player,"EstateA",0)
    local cleared=bit32.band(mask,bit32.bnot(bit32.lshift(15,(bs-1)*4)))
    if bi==0 then
      setNumber(player,"EstateA",cleared)
      renderSlot(player,bs)
      villageDialogue(player,"영지 문서",bs.."번 칸을 철거했다.",{{label="다른 칸 보기",action="estate:s:"..bs}})
      return
    end
    if bi==current then villageDialogue(player,"영지 문서","이미 그 건물이 서 있다.");return end
    local entry=E.Catalog[bi]
    for _,pair in ipairs({{"Coins",entry.Coins},{"Ingot",entry.Ingot},{"Leather",entry.Leather}}) do
      if (pair[2] or 0)>0 and readNumber(player,pair[1],0)<pair[2] then
        villageDialogue(player,"영지 문서","재료가 부족하다: "..costText(entry));return
      end
    end
    for _,pair in ipairs({{"Coins",entry.Coins},{"Ingot",entry.Ingot},{"Leather",entry.Leather}}) do
      if (pair[2] or 0)>0 then setNumber(player,pair[1],readNumber(player,pair[1],0)-pair[2]) end
    end
    setNumber(player,"EstateA",bit32.bor(cleared,bit32.lshift(bi,(bs-1)*4)))
    renderSlot(player,bs)
    villageDialogue(player,"영지 문서",entry.Name.."을(를) "..bs.."번 칸에 세웠다!",{{label="다른 칸 보기",action="estate:s:"..bs}})
  end)
  local function onJoin(player)
    task.spawn(function()
      while player.Parent and player:GetAttribute("ProfileReady")~=true do task.wait(1) end
      if not player.Parent then return end
      task.wait(14)
      if assignPlot(player) then renderAll(player);renderAllExtra(player) end
    end)
  end
  for _,player in ipairs(Players:GetPlayers()) do onJoin(player) end
  Players.PlayerAdded:Connect(onJoin)
  Players.PlayerRemoving:Connect(function(player)
    local f=workspace:FindFirstChild("Estate_"..player.UserId)
    if f then f:Destroy() end
    local plot=plotOf[player]
    if plot then usedPlots[plot]=nil end
    plotOf[player]=nil;sessions[player]=nil;lastBuild[player]=nil
  end)
end

-- [연계 퀘스트 엔진 · 거울 정원] Config.QuestLines를 서버가 진행시킨다. 단계 완료·보상·다음 목표는 대화창으로 알리고,
-- 도달/재료 판정은 2초마다, 처치 판정은 몬스터 처치 시점에 확인한다. 거울 정원은 메인 줄 완료(HiddenOpen)로 열린다.
do
  local lines=Config.QuestLines
  local gardenCenter=Vector3.new(-3500,0,0)
  local fortGate=Vector3.new(-1800,3,-800) -- 이정표 24 옆 숨겨진 문
  local choiceSession={}
  local function say(player,title,text) pcall(function() villageDialogue(player,title,text) end) end
  local function stageOf(player,line) return readNumber(player,line.Field,0) end
  local function unlocked(player,line)
    local need=line.Need or {}
    if need.Chapter and bit32.band(readNumber(player,"ChapterMask",0),bit32.lshift(1,need.Chapter-1))==0 then return false end
    if need.Companion then
      local index=meadowOil.companionIndex and meadowOil.companionIndex(need.Companion)
      if not index or bit32.band(readNumber(player,"CompanionOwned",0),bit32.lshift(1,index-1))==0 then return false end
    end
    if need.Field and readNumber(player,need.Field,0)<1 then return false end
    if need.Done then
      for _,other in ipairs(lines) do
        if other.Id==need.Done and readNumber(player,other.Field,0)<=#other.Steps then return false end
      end
    end
    if need.Stage and readNumber(player,"QuestStage",1)<need.Stage then return false end
    if need.Zone then
      local bit=nil
      for _,zone in ipairs(Config.WorldMap.Zones) do if zone.Id==need.Zone then bit=zone.Bit end end
      if not bit or bit32.band(readNumber(player,"WorldDiscovered",1),bit)==0 then return false end
    end
    return true
  end
  local function complete(player,line)
    local reward=line.Reward or {}
    setNumber(player,line.Field,#line.Steps+1)
    pcall(awardProgress,player,reward.Xp or 0,reward.Coins or 0)
    for _,field in ipairs({"Crystal","Moonbloom","Claw","Fang","Feather","Ectoplasm","Hide","Ore","Magma","Ingot","Leather","Steel","MiningProficiency"}) do
      if reward[field] then setNumber(player,field,readNumber(player,field,0)+reward[field]) end
    end
    if reward.Relic then setNumber(player,"RelicMask",bit32.bor(readNumber(player,"RelicMask",0),bit32.lshift(1,reward.Relic-1))) end
    if reward.OpenHidden then setNumber(player,"HiddenOpen",1) end
    if reward.Join and meadowOil.joinCompanion then meadowOil.joinCompanion(player,reward.Join,true) end
    local suffix=reward.OpenHidden and "\n\n숨겨진 지역이 열렸다! 서쪽 옛 요새 근처 '숨겨진 문'으로 가라." or ""
    say(player,line.Name.." 완료","연계 퀘스트를 마쳤다! 보상: 재화 "..tostring(reward.Coins or 0)..", 경험치 "..tostring(reward.Xp or 0)..suffix)
  end
  local function advance(player,line,step,stage)
    setNumber(player,line.Field.."P",0)
    local nextStep=line.Steps[stage+1]
    if nextStep then
      setNumber(player,line.Field,stage+1)
      say(player,line.Name,step.Done.."\n\n다음 목표: "..nextStep.Title.."\n"..nextStep.Text)
    else
      say(player,line.Name,step.Done)
      complete(player,line)
    end
  end
  -- 처치 판정.
  meadowOil.questKill=function(player,target)
    for _,line in ipairs(lines) do
      local stage=stageOf(player,line)
      local step=line.Steps[stage]
      if stage>=1 and step and step.Type=="kill" then
        local match=(step.Zone==nil or target.zoneTag==step.Zone)
          and (not step.Named or target.named==true) and (not step.Lord or target.lord==true)
          and (step.Boss==nil or target.questBoss==step.Boss)
          and (step.Contract==nil or target.contractNo==step.Contract)
        if match then
          local progress=readNumber(player,line.Field.."P",0)+1
          if progress>=step.Count then advance(player,line,step,stage)
          else
            setNumber(player,line.Field.."P",progress)
            player:SetAttribute("MeadowGearMessage",step.Title.." "..progress.."/"..step.Count)
            player:SetAttribute("MeadowGearRevision",(player:GetAttribute("MeadowGearRevision") or 0)+1)
          end
        end
      end
    end
  end
  -- 행동 이벤트(제련·무두질·제작·단련 등) 판정: Type="event" 단계가 같은 Event를 요구할 때 진행한다.
  meadowOil.questEvent=function(player,event)
    for _,line in ipairs(lines) do
      local stage=stageOf(player,line)
      local step=line.Steps[stage]
      if stage>=1 and step and step.Type=="event" and step.Event==event then
        local progress=readNumber(player,line.Field.."P",0)+1
        if progress>=step.Count then advance(player,line,step,stage)
        else
          setNumber(player,line.Field.."P",progress)
          player:SetAttribute("MeadowGearMessage",step.Title.." "..progress.."/"..step.Count)
          player:SetAttribute("MeadowGearRevision",(player:GetAttribute("MeadowGearRevision") or 0)+1)
        end
      end
    end
  end
  task.spawn(function()
    while true do
      task.wait(2)
      for _,player in ipairs(Players:GetPlayers()) do
        local root=player.Character and player.Character:FindFirstChild("HumanoidRootPart")
        if root and player:GetAttribute("ProfileReady")==true then
          -- [초원 서브퀘스트 안내] 2장 이후 한 번만, 촌장이 열린 의뢰를 알려 준다.
          if readNumber(player,"MeadowGuide",0)==0 and readNumber(player,"QuestStage",1)>=3 and readNumber(player,"TutorialStep",0)>=99 then
            setNumber(player,"MeadowGuide",1)
            say(player,"촌장 나린의 안내","초원에 도울 일이 늘었다.\n\n· 대장장이 브란 — 광석·가죽 작업과 동쪽 폐광\n· 서쪽 늑대 소굴 — 가죽과 고기\n· 동남쪽 박쥐 동굴 — 약초와 수정\n· 초원 세 곳의 옛 비석 순찰\n\n지도(M)에서 목표를 확인해라. 두목 한 마리만 쓰러뜨리면 된다.")
          end
          for _,line in ipairs(lines) do
            local stage=stageOf(player,line)
            if stage==0 and unlocked(player,line) then
              setNumber(player,line.Field,1)
              local first=line.Steps[1]
              if readNumber(player,"TutorialStep",0)>=99 then say(player,"새 연계 퀘스트 · "..line.Name,line.Intro.."\n\n첫 목표: "..first.Title.."\n"..first.Text.."\n(세계 탭과 지도(M)에서 목표를 확인할 수 있다.)") end
            elseif stage>=1 and stage<=#line.Steps then
              local step=line.Steps[stage]
              if step.Type=="choice" then
                local dx,dz=root.Position.X-step.X,root.Position.Z-step.Z
                if dx*dx+dz*dz<=step.R*step.R and os.clock()>(choiceSession[player] and choiceSession[player].nextAsk or 0) then
                  choiceSession[player]={line=line,expires=os.clock()+60,nextAsk=os.clock()+25}
                  pcall(function() villageDialogue(player,step.Title,step.Prompt,{
                    {label=step.Choices[1].Label,action="ql:1"},{label=step.Choices[2].Label,action="ql:2"}}) end)
                end
              elseif step.Type=="reach" then
                local dx,dz=root.Position.X-step.X,root.Position.Z-step.Z
                if dx*dx+dz*dz<=step.R*step.R then advance(player,line,step,stage) end
              elseif step.Type=="loot" then
                if readNumber(player,step.Field,0)>=step.Count then advance(player,line,step,stage) end
              end
            end
          end
        end
      end
    end
  end)
  remote.OnServerEvent:Connect(function(player,action)
    if action~="ql:1" and action~="ql:2" then return end
    local session=choiceSession[player]
    if not session or os.clock()>session.expires then return end
    local line=session.line
    local stage=stageOf(player,line)
    local step=line.Steps[stage]
    if not step or step.Type~="choice" then return end
    choiceSession[player]=nil
    local choice=step.Choices[action=="ql:1" and 1 or 2]
    setNumber(player,line.Field.."C",action=="ql:1" and 1 or 2)
    if choice.Flag then setNumber(player,"TrackFlags",bit32.bor(readNumber(player,"TrackFlags",0),choice.Flag)) end
    if choice.Join and meadowOil.joinCompanion then meadowOil.joinCompanion(player,choice.Join,choice.Bond) end
    for _,field in ipairs({"Crystal","Moonbloom","Claw","Fang","Feather","Ectoplasm","Hide","Ore","Magma","Ingot","Leather","Steel","MiningProficiency"}) do
      if choice[field] then setNumber(player,field,readNumber(player,field,0)+choice[field]) end
    end
    if choice.Coins then setNumber(player,"Coins",readNumber(player,"Coins",0)+choice.Coins) end
    if choice.Notoriety then setNumber(player,"Notoriety",math.clamp(readNumber(player,"Notoriety",0)+choice.Notoriety,0,5)) end
    say(player,line.Name,choice.Done)
    complete(player,line)
  end)
  -- 숨겨진 문 / 거울 정원.
  task.spawn(function()
    task.wait(3)
    local terrain=workspace.Terrain
    terrain:FillBlock(CFrame.new(gardenCenter.X,-4,0),Vector3.new(520,12,520),Enum.Material.Marble)
    terrain:SetMaterialColor(Enum.Material.Marble,Color3.fromRGB(196,206,220))
    terrain:FillCylinder(CFrame.new(gardenCenter.X,-1.4,0),5,70,Enum.Material.Water)
    for i=1,10 do
      local angle=i/10*math.pi*2
      terrain:FillCylinder(CFrame.new(gardenCenter.X+math.cos(angle)*190,16,math.sin(angle)*190),36,9,Enum.Material.Glass)
    end
    local gate=Instance.new("Attachment");gate.WorldPosition=fortGate;gate.Parent=terrain
    local glow=Instance.new("ParticleEmitter");glow.Color=ColorSequence.new(Color3.fromRGB(190,220,255));glow.LightEmission=1;glow.Rate=26
    glow.Lifetime=NumberRange.new(2,3);glow.Speed=NumberRange.new(1,3);glow.Size=NumberSequence.new(1);glow.Parent=gate
    local prompt=Instance.new("ProximityPrompt");prompt.ActionText="숨겨진 문";prompt.ObjectText="거울 정원";prompt.HoldDuration=.7
    prompt.MaxActivationDistance=14;prompt.RequiresLineOfSight=false;prompt.Parent=gate
    prompt.Triggered:Connect(function(player)
      if readNumber(player,"HiddenOpen",0)<1 then
        say(player,"벽","낡은 석벽이다. 아무 일도 일어나지 않는다. (메인 연계 퀘스트 '미러의 탑'을 마치면 열린다.)");return
      end
      local character=player.Character
      if character and character:FindFirstChild("HumanoidRootPart") then character:PivotTo(CFrame.new(Vector3.new(gardenCenter.X,5,230))) end
    end)
    local exit=Instance.new("Attachment");exit.WorldPosition=Vector3.new(gardenCenter.X,4,246);exit.Parent=terrain
    local exitPrompt=Instance.new("ProximityPrompt");exitPrompt.ActionText="정원을 떠나기";exitPrompt.ObjectText="거울 정원";exitPrompt.HoldDuration=.6
    exitPrompt.MaxActivationDistance=12;exitPrompt.RequiresLineOfSight=false;exitPrompt.Parent=exit
    exitPrompt.Triggered:Connect(function(player)
      local character=player.Character
      if character and character:FindFirstChild("HumanoidRootPart") then character:PivotTo(CFrame.new(fortGate+Vector3.new(10,5,10))) end
    end)
    local chest=Instance.new("Attachment");chest.WorldPosition=Vector3.new(gardenCenter.X,4,-170);chest.Parent=terrain
    local cg=Instance.new("ParticleEmitter");cg.Color=ColorSequence.new(Color3.fromRGB(255,240,170));cg.LightEmission=1;cg.Rate=18;cg.Lifetime=NumberRange.new(2,3);cg.Size=NumberSequence.new(.9);cg.Parent=chest
    local open=Instance.new("ProximityPrompt");open.ActionText="렌스의 유품 열기";open.ObjectText="거울 정원";open.HoldDuration=.9
    open.MaxActivationDistance=12;open.RequiresLineOfSight=false;open.Parent=chest
    open.Triggered:Connect(function(player)
      for _,enemy in ipairs(enemies) do
        if enemy.zoneTag=="garden" and enemy.HP>0 and enemy.model.Parent then say(player,"렌스의 유품","정원의 수호자가 아직 남아 있다.");return end
      end
      if bit32.band(readNumber(player,"RelicMask",0),bit32.lshift(1,9))~=0 then say(player,"렌스의 유품","이미 가져간 유품이다.");return end
      setNumber(player,"RelicMask",bit32.bor(readNumber(player,"RelicMask",0),bit32.lshift(1,9)))
      pcall(awardProgress,player,800,600)
      say(player,"렌스의 유품","거울 정원의 관을 얻었다. 모든 공격 피해가 영구히 5% 오른다.")
    end)
  end)
  local random=Random.new(7001)
  for i=1,3 do
    table.insert(meadowEncounterSites,{id="wolf",atom="HEAD_CANINE",model=i==2 and "skullorc" or "orc",name="거울 기사 "..i,tier=10,height=6.5,hp=4,dmg=2.2,
      alpha=true,bonusBoss=true,zoneTag="garden",named=true,drops={{"Crystal",1,3},{"Ore",.8,3}},
      position=Vector3.new(gardenCenter.X+random:NextNumber(-90,90),3,random:NextNumber(-60,80))})
  end
  table.insert(meadowEncounterSites,{id="wolf",atom="HEAD_CANINE",model="chieftain",name="거울의 단장 · 렌스의 잔영",tier=10,height=11,hp=7,dmg=2.8,
    alpha=true,bonusBoss=true,zoneTag="garden",lord=true,drops={{"Crystal",1,6},{"Magma",1,4},{"Claw",1,4}},position=Vector3.new(gardenCenter.X,3,-120)})
end

-- [지역 랜드마크] 멀리서도 보이는 거대 석상·첨탑·분화구·빛기둥. 모델은 등록된 mon_* 메시만 거대하게 쓰고, 지형은 Terrain으로 만든다.
do
  local lms=Config.WorldMap.Landmarks
  for index,lm in ipairs(lms) do
    task.spawn(function()
      task.wait(5+index*.3)
      local base=Vector3.new(lm.X,3,lm.Z)
      local terrain=workspace.Terrain
      pcall(function()
        local shape=lm.Shape
        if shape=="spire" then
          terrain:FillCylinder(CFrame.new(base+Vector3.new(0,34,0)),68,9,Enum.Material.Rock)
          terrain:FillCylinder(CFrame.new(base+Vector3.new(0,80,0)),24,4,Enum.Material.Slate)
        elseif shape=="plateau" then
          terrain:FillCylinder(CFrame.new(base+Vector3.new(0,6,0)),12,40,Enum.Material.Rock)
          terrain:FillCylinder(CFrame.new(base+Vector3.new(0,13,0)),4,26,Enum.Material.Slate)
        elseif shape=="crater" then
          terrain:FillCylinder(CFrame.new(base+Vector3.new(0,5,0)),10,56,Enum.Material.Basalt)
          terrain:FillCylinder(CFrame.new(base+Vector3.new(0,8,0)),4,30,Enum.Material.CrackedLava)
        elseif shape=="obelisks" then
          for k=0,4 do
            local a=k*math.pi*2/5
            terrain:FillBlock(CFrame.new(base+Vector3.new(math.cos(a)*34,22,math.sin(a)*34))*CFrame.Angles(0,a,0),Vector3.new(6,44,6),Enum.Material.Sandstone)
          end
        elseif shape=="gate" then
          terrain:FillBlock(CFrame.new(base+Vector3.new(-40,40,0)),Vector3.new(14,80,14),Enum.Material.Basalt)
          terrain:FillBlock(CFrame.new(base+Vector3.new(40,40,0)),Vector3.new(14,80,14),Enum.Material.Basalt)
          terrain:FillBlock(CFrame.new(base+Vector3.new(0,82,0)),Vector3.new(94,10,14),Enum.Material.Basalt)
        elseif shape=="crack" then
          terrain:FillBlock(CFrame.new(base+Vector3.new(0,-2,0)),Vector3.new(10,8,90),Enum.Material.Air)
          terrain:FillBlock(CFrame.new(base+Vector3.new(0,-5,0)),Vector3.new(10,2,90),Enum.Material.Neon)
        elseif shape=="pool" then
          terrain:FillCylinder(CFrame.new(base+Vector3.new(0,1,0)),3,46,Enum.Material.Water)
        elseif shape=="giantTree" then
          local tree=worldAsset("tree",base,120)
          if tree then tree.Name="Landmark_"..lm.Id;tree:SetAttribute("MeadowScenery",true) end
        end
      end)
      if lm.Statue then
        local statue=worldAsset(lm.Statue,base+Vector3.new(0,(lm.Shape=="plateau" and 16) or (lm.Shape=="crater" and 8) or 0,0),lm.Height or 40)
        if statue then statue.Name="Landmark_"..lm.Id;statue:SetAttribute("MeadowScenery",true) end
      end
      -- [성지 경내] 랜드마크 둘레에 기둥·화덕·돌계단·공물대를 세워 참배하는 곳처럼 꾸민다.
      task.spawn(function()
        while workspace:GetAttribute("OpenWorldReady")~=true do task.wait(3) end
        local rp=RaycastParams.new();rp.FilterType=Enum.RaycastFilterType.Include;rp.FilterDescendantsInstances={workspace.Terrain}
        local radius=(lm.Shape=="gate" and 64) or (lm.Shape=="giantTree" and 46) or 58
        local list={}
        for k=0,3 do
          local a=k*math.pi/2+.785
          list[#list+1]={"vxCastlePillar",math.cos(a)*radius,math.sin(a)*radius,12}
        end
        list[#list+1]={"vxCampfirePit",math.cos(.3)*(radius-14),math.sin(.3)*(radius-14),2.6}
        list[#list+1]={"vxCampfirePit",math.cos(3.44)*(radius-14),math.sin(3.44)*(radius-14),2.6}
        list[#list+1]={"vxStairsStone",0,radius-6,3}
        list[#list+1]={"vxStall",-radius+8,6,4}
        for k,spec in ipairs(list) do
          local x,z=base.X+spec[2],base.Z+spec[3]
          local hit=workspace:Raycast(Vector3.new(x,400,z),Vector3.new(0,-800,0),rp)
          if hit then
            local m=worldAsset(spec[1],hit.Position,spec[4])
            if m then m.Name="Shrine_"..lm.Id.."_"..k;m:SetAttribute("MeadowScenery",true) end
          else warn("SHRINE_GROUND_UNVERIFIED "..lm.Id) break end
        end
      end)
      local anchor=Instance.new("Attachment");anchor.Name="Landmark_"..lm.Id;anchor.WorldPosition=base+Vector3.new(0,2,0);anchor.Parent=workspace.Terrain
      local color=Color3.fromRGB(lm.Light[1],lm.Light[2],lm.Light[3])
      local beam=Instance.new("ParticleEmitter");beam.Color=ColorSequence.new(color);beam.LightEmission=1;beam.Rate=40
      beam.Lifetime=NumberRange.new(6,8);beam.Speed=NumberRange.new(22,30);beam.EmissionDirection=Enum.NormalId.Top
      beam.Size=NumberSequence.new({NumberSequenceKeypoint.new(0,5),NumberSequenceKeypoint.new(1,0)});beam.Parent=anchor
      local prompt=Instance.new("ProximityPrompt");prompt.ActionText="조사하기";prompt.ObjectText=lm.Name;prompt.HoldDuration=.8
      prompt.MaxActivationDistance=16;prompt.RequiresLineOfSight=false;prompt.Parent=anchor
      prompt.Triggered:Connect(function(player)
        if player:GetAttribute("ProfileReady")~=true then return end
        local flag=bit32.lshift(1,index-1)
        local mask=readNumber(player,"LandmarkMask",0)
        local text=lm.Lore
        if bit32.band(mask,flag)==0 then
          mask=bit32.bor(mask,flag)
          setNumber(player,"LandmarkMask",mask)
          local count=0
          for i=1,#lms do if bit32.band(mask,bit32.lshift(1,i-1))~=0 then count+=1 end end
          setNumber(player,"Coins",readNumber(player,"Coins",0)+60)
          pcall(awardProgress,player,60,40)
          text="[랜드마크 "..count.."/"..#lms.."] "..lm.Lore.."\n(보상 60 재화)"
        end
        local blessing=Config.LandmarkBlessing[lm.Zone]
        if blessing and bit32.band(readNumber(player,"LandmarkClaim",0),flag)==0 then
          meadowOil.lmSessions=meadowOil.lmSessions or {}
          meadowOil.lmSessions[player]={index=index,expires=os.clock()+90}
          pcall(function() villageDialogue(player,lm.Name,text.."\n\n비문 앞에서 무엇을 할까?",{
            {label=blessing[3].." "..blessing[2].."개를 받는다",action="lm:"..index..":1"},
            {label="비문을 베껴 간다 (수정 2 · 경험치)",action="lm:"..index..":2"}}) end)
        else
          pcall(function() villageDialogue(player,lm.Name,text) end)
        end
      end)
    end)
  end
end

-- [지역 발견] 실제 위치가 지역 안에 들어가면 서버가 발견 비트를 기록한다(1 초원·2 숲·4 화산·8 오아시스).
task.spawn(function()
  local bits={}
  for _,zone in ipairs(Config.WorldMap.Zones) do bits[zone.Id]=zone.Bit end
  while true do
    task.wait(3)
    for _,player in ipairs(Players:GetPlayers()) do
      if player:GetAttribute("ProfileReady")==true then
        local bit=bits[meadowRegionOf(player)]
        local mask=readNumber(player,"WorldDiscovered",1)
        if bit and bit32.band(mask,bit)==0 then
          setNumber(player,"WorldDiscovered",bit32.bor(mask,bit))
          pcall(function() villageDialogue(player,"새로운 지역 발견","지도에 새 지역이 기록됐어. 세계 탭에서 확인해.") end)
        end
      end
    end
  end
end)

-- [현상금 게시판] 숲·화산·오아시스 입구에 의뢰판을 두고, 단서 2곳과 정예 몬스터 1마리로 진행한다.
do
  local centers={worldtree=Vector3.new(1200,0,0),volcano=Vector3.new(2400,0,0),oasis=Vector3.new(3600,0,0)}
  local boardOffsets={worldtree=Vector3.new(-18,4,150),volcano=Vector3.new(-18,4,-160),oasis=Vector3.new(-18,4,-160)}
  local function say(player,title,text,options) pcall(function() villageDialogue(player,title,text,options) end) end
  local function spot(position,label,color,action)
    local anchor=Instance.new("Attachment")
    anchor.WorldPosition=position;anchor.Parent=workspace.Terrain
    local glow=Instance.new("ParticleEmitter")
    glow.Color=ColorSequence.new(color);glow.LightEmission=1;glow.Rate=16;glow.Lifetime=NumberRange.new(2,3)
    glow.Speed=NumberRange.new(1,2);glow.Size=NumberSequence.new(.7);glow.Parent=anchor
    local prompt=Instance.new("ProximityPrompt")
    prompt.ActionText=label;prompt.ObjectText="현상금";prompt.HoldDuration=.45
    prompt.MaxActivationDistance=12;prompt.RequiresLineOfSight=false;prompt.Parent=anchor
    prompt.Triggered:Connect(function(player) action(player,anchor.WorldPosition) end)
  end
  local boardSessions={}
  local function current(player)
    local index=math.clamp(readNumber(player,"BountyIndex",1),1,#Config.Bounties+1)
    return index,Config.Bounties[index]
  end
  local function board(player,region)
    local index,bounty=current(player)
    if not bounty then say(player,"현상금 게시판","모든 현상금을 완료했어. 다음 이야기에서 새 계약이 올라올 거야.");return end
    if bounty.Region~=region then
      say(player,"현상금 게시판",bounty.Region=="worldtree" and "다음 현상금은 세계수 숲에서 받아." or bounty.Region=="volcano" and "다음 현상금은 화산 협곡에서 받아." or "다음 현상금은 오아시스 지하에서 받아.")
      return
    end
    local phase=readNumber(player,"BountyPhase",0)
    boardSessions[player]=os.clock()+40
    if phase==0 then
      say(player,"현상금 · "..bounty.Name,bounty.Summary.."\n\n단서 2곳 조사 후 "..bounty.EnemyName.." 처치.",{{label="계약 수락",action="bounty:accept"}})
    elseif phase==1 then
      local found=(bit32.band(readNumber(player,"BountyClues",0),1)~=0 and 1 or 0)+(bit32.band(readNumber(player,"BountyClues",0),2)~=0 and 1 or 0)
      say(player,"진행 중 · "..bounty.Name,"단서 "..found.."/2 · "..bounty.EnemyName.." 처치.")
    else
      say(player,"결산 · "..bounty.Name,bounty.Summary.."\n\n목표를 처치했다. 보상 방식을 선택해.",{
        {label=bounty.Choices[1].Label,action="bounty:resolve:1"},{label=bounty.Choices[2].Label,action="bounty:resolve:2"}})
    end
  end
  for region,offset in pairs(boardOffsets) do
    local position=centers[region]+offset
    task.defer(function()
      spot(position,"현상금 게시판",Color3.fromRGB(255,214,130),function(player) board(player,region) end)
    end)
  end
  for index,bounty in ipairs(Config.Bounties) do
    local center=centers[bounty.Region]
    for clueIndex,offset in ipairs(bounty.ClueOffsets) do
      spot(center+Vector3.new(offset[1],4,offset[2]),"단서 조사",Color3.fromRGB(170,220,255),function(player)
        if readNumber(player,"BountyIndex",1)~=index or readNumber(player,"BountyPhase",0)~=1 then
          say(player,"단서","지금 진행 중인 현상금의 단서가 아니야.");return
        end
        local flag=bit32.lshift(1,clueIndex-1)
        local mask=readNumber(player,"BountyClues",0)
        if bit32.band(mask,flag)==0 then setNumber(player,"BountyClues",bit32.bor(mask,flag)) end
        say(player,"단서 "..clueIndex.."/2",bounty.Clues[clueIndex])
      end)
    end
    table.insert(meadowEncounterSites,{id=bounty.Enemy,atom=bounty.Enemy=="wolf" and "HEAD_CANINE" or "WING_LEATHER",
      tier=7,height=bounty.Height,position=center+Vector3.new(bounty.EnemyOffset[1],3,bounty.EnemyOffset[2]),bountyIndex=index})
  end
  -- 선택지 응답은 기존 마을 대화 액션 경로를 재사용하지 않고 별도 RemoteEvent 문자열로 받는다.
  remote.OnServerEvent:Connect(function(player,action)
    if typeof(action)~="string" or (action~="bounty:accept" and action~="bounty:resolve:1" and action~="bounty:resolve:2") then return end
    if os.clock()>(boardSessions[player] or 0) then return end
    local index,bounty=current(player)
    if not bounty then return end
    local phase=readNumber(player,"BountyPhase",0)
    if action=="bounty:accept" and phase==0 then
      setNumber(player,"BountyPhase",1);setNumber(player,"BountyClues",0);boardSessions[player]=nil
      say(player,"계약 수락 · "..bounty.Name,"단서 2곳을 조사한 뒤 "..bounty.EnemyName.."을 처치해.")
    elseif phase==2 and (action=="bounty:resolve:1" or action=="bounty:resolve:2") then
      local selected=action=="bounty:resolve:1" and 1 or 2
      local choice=bounty.Choices[selected]
      local previous=readNumber(player,"BountyOutcomes",0)
      local shift=(index-1)*2
      if bit32.band(bit32.rshift(previous,shift),3)~=0 then return end
      setNumber(player,"BountyOutcomes",bit32.bor(previous,bit32.lshift(selected,shift)))
      setNumber(player,"BountyIndex",index+1);setNumber(player,"BountyPhase",0);setNumber(player,"BountyClues",0)
      setNumber(player,"Coins",readNumber(player,"Coins",0)+(choice.Coins or 0))
      if (choice.Wood or 0)>0 then setNumber(player,"Wood",readNumber(player,"Wood",0)+choice.Wood) end
      if (choice.Stone or 0)>0 then setNumber(player,"Stone",readNumber(player,"Stone",0)+choice.Stone) end
      boardSessions[player]=nil
      say(player,"현상금 완료 · "..bounty.Name,choice.Outcome.."\n보상: 소지금 +"..(choice.Coins or 0))
    end
  end)
end

-- [기사단 야영지] 지역마다 CC0 천막·깃발·울타리·돌 화덕으로 야영지를 세우고, 단계 업그레이드와 휴식을 제공한다.
-- 단계는 플레이어별로 저장되고(건축 숙련 +2), 소품은 모두에게 같은 모습으로 보인다.
do
  local camps={
    worldtree={field="CampWorldtree",center=Vector3.new(1250,0,150),name="세계수 숲 야영지"},
    volcano={field="CampVolcano",center=Vector3.new(2260,0,40),name="화산 협곡 야영지"},
    oasis={field="CampOasis",center=Vector3.new(3460,0,-60),name="오아시스 야영지"},
  }
  local restReady={}
  local function say(player,title,text,options) pcall(function() villageDialogue(player,title,text,options) end) end
  local function place(name,position,height,yaw)
    local id=Config.CampAssets and Config.CampAssets[name]
    if typeof(id)~="number" then return nil end
    local ok,result=pcall(function()
      local model=AssetService:LoadAssetAsync(id)
      for _,part in ipairs(model:GetDescendants()) do
        if part:IsA("LuaSourceContainer") or part:IsA("Tool") then part:Destroy()
        elseif part:IsA("BasePart") then part.Anchored=true;part.CanCollide=false;part.CanTouch=false;part.CanQuery=false end
      end
      local _,size=model:GetBoundingBox()
      if size.Y<=.01 then model:Destroy();return nil end
      model:ScaleTo(model:GetScale()*height/size.Y)
      model:PivotTo(CFrame.new(position)*CFrame.Angles(0,math.rad(yaw or 0),0))
      local params=RaycastParams.new()
      params.FilterType=Enum.RaycastFilterType.Include;params.FilterDescendantsInstances={workspace.Terrain}
      local hit=workspace:Raycast(position+Vector3.new(0,60,0),Vector3.new(0,-140,0),params)
      local cf,box=model:GetBoundingBox()
      local groundY=hit and hit.Position.Y or 2
      model:PivotTo(model:GetPivot()+Vector3.new(0,groundY+.1-(cf.Position.Y-box.Y/2),0))
      model.Name="Camp_"..name
      model.Parent=gameWorld
      return model
    end)
    if not ok then warn("야영지 소품 로딩 실패: "..name..": "..tostring(result)) return nil end
    return result
  end
  local function levelOf(player,camp) return math.clamp(readNumber(player,camp.field,0),0,3) end
  local function openCamp(player,regionId)
    local camp=camps[regionId]
    local level=levelOf(player,camp)
    local upgrade=Config.CampUpgrades[level+1]
    local lines={camp.name.."  ·  단계 "..level.."/3"}
    local options={}
    if level>=1 then
      lines[#lines+1]="모닥불이 타고 있다. 쉬면 체력과 기력이 회복돼."
      options[#options+1]={label="휴식하기",action="camp:rest"}
    end
    if upgrade then
      lines[#lines+1]="다음: "..upgrade.Name.." · 나무 "..upgrade.Wood.." 돌 "..upgrade.Stone..(upgrade.Coins>0 and (" 소지금 "..upgrade.Coins) or "").."\n"..upgrade.Desc
      options[#options+1]={label=upgrade.Name,action="camp:upgrade"}
    else lines[#lines+1]="야영지를 모두 복구했어." end
    say(player,camp.name,table.concat(lines,"\n"),options)
  end
  remote.OnServerEvent:Connect(function(player,action)
    if action~="camp:upgrade" and action~="camp:rest" then return end
    if player:GetAttribute("ProfileReady")~=true then return end
    local regionId=meadowRegionOf(player)
    local camp=camps[regionId]
    local root=player.Character and player.Character:FindFirstChild("HumanoidRootPart")
    if not camp or not root or (root.Position-camp.center).Magnitude>40 then return end
    local level=levelOf(player,camp)
    if action=="camp:upgrade" then
      local upgrade=Config.CampUpgrades[level+1]
      if not upgrade then return end
      for _,field in ipairs({"Wood","Stone","Coins"}) do
        if readNumber(player,field,0)<(upgrade[field] or 0) then say(player,camp.name,"재료 또는 소지금이 부족해.");return end
      end
      for _,field in ipairs({"Wood","Stone","Coins"}) do
        local cost=upgrade[field] or 0
        if cost>0 then setNumber(player,field,readNumber(player,field,0)-cost) end
      end
      setNumber(player,camp.field,level+1)
      setNumber(player,"BuildingProficiency",readNumber(player,"BuildingProficiency",0)+2)
      say(player,camp.name,upgrade.Name.." 완료. 건축 숙련 +2")
    elseif level>=1 then
      local now=os.clock()
      if now<(restReady[player] or 0) then say(player,camp.name,"조금 더 지난 뒤에 쉴 수 있어.");return end
      restReady[player]=now+20
      local humanoid=player.Character:FindFirstChildOfClass("Humanoid")
      if humanoid and humanoid.Health>0 then humanoid.Health=humanoid.MaxHealth end
      player:SetAttribute("MeadowStamina",100)
      local note="체력과 기력이 회복됐다."
      if level>=2 and now>=(player:GetAttribute("CampSupplyAt") or 0) then
        player:SetAttribute("CampSupplyAt",now+300)
        setNumber(player,"MeadowPotionHealth",readNumber(player,"MeadowPotionHealth",0)+1)
        note=note.." 회복약 +1"
        if level>=3 then setNumber(player,"MeadowPotionStamina",readNumber(player,"MeadowPotionStamina",0)+1);note=note.." · 기력 영약 +1" end
      end
      say(player,camp.name,note)
    end
  end)
  task.spawn(function()
    task.wait(9)
    for regionId,camp in pairs(camps) do
      local c=camp.center
      place("tent",c+Vector3.new(-8,0,-6),6.5,20)
      place("flag",c+Vector3.new(6,0,-8),9,0)
      place("stones",c,1.3,0)
      place("platform",c+Vector3.new(10,0,6),.7,0)
      for index,offset in ipairs({Vector3.new(-14,0,8),Vector3.new(14,0,-2),Vector3.new(0,0,16),Vector3.new(-16,0,-14)}) do
        place("fence",c+offset,3,index*45)
      end
      place("plant",c+Vector3.new(-12,0,18),2.2,0)
      local anchor=Instance.new("Attachment");anchor.WorldPosition=c+Vector3.new(0,2,0);anchor.Parent=workspace.Terrain
      local fire=Instance.new("ParticleEmitter")
      fire.Color=ColorSequence.new(Color3.fromRGB(255,150,60),Color3.fromRGB(255,60,20));fire.LightEmission=1;fire.Rate=30
      fire.Lifetime=NumberRange.new(.6,1.2);fire.Speed=NumberRange.new(2,4);fire.Size=NumberSequence.new({NumberSequenceKeypoint.new(0,1.2),NumberSequenceKeypoint.new(1,0)})
      fire.EmissionDirection=Enum.NormalId.Top;fire.Parent=anchor
      local light=Instance.new("PointLight");light.Color=Color3.fromRGB(255,170,90);light.Range=30;light.Brightness=2;light.Parent=anchor
      local prompt=Instance.new("ProximityPrompt")
      prompt.ActionText="야영지";prompt.ObjectText=camp.name;prompt.HoldDuration=.4
      prompt.MaxActivationDistance=14;prompt.RequiresLineOfSight=false;prompt.Parent=anchor
      prompt.Triggered:Connect(function(player) openCamp(player,regionId) end)
    end
  end)
end

-- [지역 명명 보스 위치 공개] 지역 이름만 걸린 처치 퀘스트(예: 봉인 파편의 수호자)가 실제 보스 위치를 가리키도록
-- 각 지역의 첫 명명 보스(영주 제외) 위치를 NamedSeat_<지역> 속성으로 알린다. 클라이언트 목표 마커가 이 값을 읽는다.
task.delay(8,function()
  local seen={}
  for _,site in ipairs(meadowEncounterSites) do
    if site.named and not site.lord and site.zoneTag and site.position and not seen[site.zoneTag] then
      seen[site.zoneTag]=true
      workspace:SetAttribute("NamedSeat_"..site.zoneTag,Vector3.new(site.position.X,0,site.position.Z))
    end
  end
end)

-- ============================================================================
-- [오디세이식 시스템] 고유 기술(스파르타 킥·황소 돌진) / 악명과 용병 사냥꾼 / 정복과 영토 전쟁
-- 이야기: 영주를 쓰러뜨려 요새를 정복하면 악명이 오르고, 영주 가문이 용병 사냥꾼을 풀며 반격군을 보낸다.
-- 모든 판정은 서버가 한다. 클라이언트는 'odyssey:kick:0', 'odyssey:rush:0' 요청만 보낸다.
-- ============================================================================
do
  local W=Config.WorldMap
  local zoneTier={windcliff=3,meadow=2,worldtree=4,volcano=6,oasis=7,swamp=7,citadel=10,highland=5,canyon=7,chaos=9,wetland=4,desert=7,deadmarsh=9}
  local function toast(player,text)
    player:SetAttribute("MeadowGearMessage",text)
    player:SetAttribute("MeadowGearRevision",(player:GetAttribute("MeadowGearRevision") or 0)+1)
  end
  local function zoneIndexOf(id) for i,z in ipairs(W.Zones) do if z.Id==id then return i,z end end end
  local function flat(v) return Vector3.new(v.X,0,v.Z) end
  local function safePlace(root)
    local v=W.Village
    local p=root.Position
    if p.X>=v.X0 and p.X<=v.X1 and p.Z>=v.Z0 and p.Z<=v.Z1 then return true end
    if p.X>7000 then return true end
    for _,t in ipairs(W.Towns or {}) do
      local dx,dz=p.X-t.X,p.Z-t.Z
      if dx*dx+dz*dz<70*70 then return true end
    end
    return false
  end
  local function stars(n) return string.rep("★",n)..string.rep("☆",5-n) end

  -- ── 고유 기술 ───────────────────────────────────────────────
  local cooldown={kick={},rush={}}
  local function stunEnemy(e,seconds)
    local now=os.clock()
    if e.windupUntil then cancelEnemyWindup(e) end
    e.stunUntil=math.max(e.stunUntil or 0,now+seconds)
    e.lastAttack=now
    e.model:SetAttribute("NativeMobStunnedUntil",workspace:GetServerTimeNow()+seconds)
    setEnemyAttackState(e,"STUNNED")
  end
  remote.OnServerEvent:Connect(function(player,action)
    if action~="odyssey:kick:0" and action~="odyssey:rush:0" then return end
    if player:GetAttribute("ProfileReady")~=true then return end
    local character,humanoid,root=liveMeadowCharacter(player)
    if not root then return end
    local isKick=action=="odyssey:kick:0"
    local cd=isKick and cooldown.kick or cooldown.rush
    local now=os.clock()
    if now<(cd[player] or 0) then return end
    local cost=isKick and 12 or 18
    if readNumber(player,"MeadowStamina",0)<cost then toast(player,"스태미나가 부족해.");return end
    local power=meadowProficiencyPower(player)
    if isKick then
      local target=nearestEnemy(root,10)
      if not target then cd[player]=now+1.2;return end
      cd[player]=now+7
      player:SetAttribute("OdyKickAt",workspace:GetServerTimeNow()+7)
      player:SetAttribute("MeadowStamina",readNumber(player,"MeadowStamina",0)-cost)
      local dir=flat(target.position-root.Position)
      dir=dir.Magnitude>.1 and dir.Unit or flat(root.CFrame.LookVector).Unit
      local broke=target.windupUntil~=nil
      local damage=22+math.floor(power*1.1)
      if broke then damage=math.floor(damage*1.5) end
      applyMeadowDamageRef(player,target,damage)
      if target.HP>0 then
        if not target.isBoss then target.position=target.position+dir*11 end
        stunEnemy(target,target.isBoss and .8 or 1.6)
      end
      if broke then toast(player,"방어 붕괴! 스파르타 킥이 공격 준비를 깨뜨렸다.") end
      remote:FireClient(player,"ODY_FX","kick",target.position)
      if meadowOil.questEvent then pcall(meadowOil.questEvent,player,"KICK") end
    else
      local look=flat(root.CFrame.LookVector)
      if look.Magnitude<.1 then return end
      look=look.Unit
      cd[player]=now+10
      player:SetAttribute("OdyRushAt",workspace:GetServerTimeNow()+10)
      player:SetAttribute("MeadowStamina",readNumber(player,"MeadowStamina",0)-cost)
      local params=RaycastParams.new()
      params.FilterType=Enum.RaycastFilterType.Exclude
      params.FilterDescendantsInstances={character}
      local blocked=workspace:Raycast(root.Position,look*15,params)
      local dist=blocked and math.max(0,blocked.Distance-3) or 14
      local origin=character:GetPivot()
      local start=root.Position
      local defense=meadowDefense[player] or {}
      defense.dodgeUntil=now+.4
      meadowDefense[player]=defense
      local hits=0
      for _,e in ipairs(enemies) do
        if e.HP>0 and e.model.Parent then
          local rel=flat(e.position-start)
          local along=rel:Dot(look)
          local side=(rel-look*along).Magnitude
          if along>-2 and along<dist+3 and side<5 then
            hits+=1
            applyMeadowDamageRef(player,e,16+math.floor(power*.8))
            if e.HP>0 then stunEnemy(e,e.isBoss and .5 or 1) end
          end
        end
      end
      remote:FireClient(player,"ODY_FX","rush",start+look*dist)
      if hits>0 and meadowOil.questEvent then pcall(meadowOil.questEvent,player,"RUSH") end
      task.spawn(function()
        local began=os.clock()
        while character.Parent and player.Character==character and humanoid.Health>0 do
          local t=math.clamp((os.clock()-began)/.22,0,1)
          character:PivotTo(origin+look*dist*t)
          if t>=1 then break end
          RunService.Heartbeat:Wait()
        end
      end)
    end
  end)

  -- ── 정복 · 영토 전쟁 ──────────────────────────────────────
  local incomeAt={}
  local raids={}
  local warNext={}
  local function spawnFoe(spec)
    local site={id="bandit",position=spec.position,name=spec.name,tier=spec.tier,height=spec.height,hp=spec.hp,dmg=spec.dmg,
      named=spec.named,drops=spec.drops,zoneTag=spec.zoneTag}
    local ok,res=pcall(spawnEnemy,site,nil)
    if not ok or res~=true then return nil end
    for i=#enemies,1,-1 do
      local e=enemies[i]
      if e.model.Name==spec.name and not e.odyTag then e.odyTag=true;return e end
    end
  end
  local function purge(list)
    for _,e in ipairs(list or {}) do
      if e.HP>0 then
        e.HP=0
        for i=#enemies,1,-1 do if enemies[i]==e then table.remove(enemies,i);break end end
        if e.model.Parent then e.model:Destroy() end
      end
    end
  end
  local function conquer(player,zoneId)
    local idx,zone=zoneIndexOf(zoneId)
    if not idx then return end
    local bit=bit32.lshift(1,idx-1)
    local mask=readNumber(player,"ConquestMask",0)
    if bit32.band(mask,bit)~=0 then return end
    setNumber(player,"ConquestMask",bit32.bor(mask,bit))
    incomeAt[player]=incomeAt[player] or {}
    incomeAt[player][zoneId]=os.clock()
    local tier=zoneTier[zoneId] or 4
    pcall(awardProgress,player,tier*40,tier*120)
    setNumber(player,"Crystal",readNumber(player,"Crystal",0)+3)
    local n=math.min(5,readNumber(player,"Notoriety",0)+1)
    setNumber(player,"Notoriety",n)
    toast(player,"⚔ "..zone.Name.." 요새 정복! 코인 +"..(tier*120).." · 악명 "..stars(n).." — 영주 가문이 사냥꾼을 보낼 거야.")
    if meadowOil.questEvent then pcall(meadowOil.questEvent,player,"CONQUER") end
  end
  meadowOil.odysseyKill=function(player,target)
    if target.hunterOf==player.UserId then
      local n=math.max(0,readNumber(player,"Notoriety",0)-1)
      setNumber(player,"Notoriety",n)
      setNumber(player,"HunterKills",readNumber(player,"HunterKills",0)+1)
      toast(player,"사냥꾼 격파! 악명 "..stars(n))
      if meadowOil.questEvent then pcall(meadowOil.questEvent,player,"HUNTER_DOWN") end
    end
    if target.lord and target.zoneTag then conquer(player,target.zoneTag) end
  end

  -- 영주의 깃발: 정복한 영토에서 시간당 수입을 거둔다.
  task.spawn(function()
    while workspace:GetAttribute("OpenWorldReady")~=true do task.wait(3) end
    task.wait(24)
    local rp=RaycastParams.new();rp.FilterType=Enum.RaycastFilterType.Include;rp.FilterDescendantsInstances={workspace.Terrain}
    for _,zone in ipairs(W.Zones) do
      local seat=workspace:GetAttribute("LordSeat_"..zone.Id)
      if typeof(seat)=="Vector3" then
        local a=2.3
        local x,z=seat.X+math.cos(a)*26,seat.Z+math.sin(a)*26
        local hit=workspace:Raycast(Vector3.new(x,400,z),Vector3.new(0,-800,0),rp)
        if hit then
          task.spawn(function()
            local pole=worldAsset("vxPoles",hit.Position,7)
            if pole then pole.Name="ConquestFlag_"..zone.Id;pole:SetAttribute("MeadowScenery",true) end
          end)
          local anchor=Instance.new("Attachment");anchor.Name="ConquestFlag_"..zone.Id;anchor.WorldPosition=hit.Position+Vector3.new(0,3,0);anchor.Parent=workspace.Terrain
          local prompt=Instance.new("ProximityPrompt");prompt.ActionText="영토 수입 · 깃발";prompt.ObjectText=zone.Name.." 요새";prompt.HoldDuration=.5
          prompt.MaxActivationDistance=14;prompt.RequiresLineOfSight=false;prompt.Parent=anchor
          prompt.Triggered:Connect(function(player)
            if player:GetAttribute("ProfileReady")~=true then return end
            local idx=zoneIndexOf(zone.Id)
            if bit32.band(readNumber(player,"ConquestMask",0),bit32.lshift(1,idx-1))==0 then
              toast(player,"영주를 쓰러뜨려야 이 깃발이 네 것이 돼.");return
            end
            incomeAt[player]=incomeAt[player] or {}
            local since=incomeAt[player][zone.Id] or (os.clock()-300)
            local units=math.floor(math.min(900,os.clock()-since)/30)
            if units<2 then toast(player,"아직 거둘 수입이 없어. 잠시 뒤에 다시 와.");return end
            local coins=units*(zoneTier[zone.Id] or 4)*4
            incomeAt[player][zone.Id]=os.clock()
            setNumber(player,"Coins",readNumber(player,"Coins",0)+coins)
            toast(player,zone.Name.." 영토 수입 코인 +"..coins)
          end)
        else warn("CONQUEST_FLAG_GROUND_UNVERIFIED "..zone.Id) end
      end
    end
  end)

  -- 반격군(영토 전쟁)과 용병 사냥꾼(악명) 관리 루프.
  local hunters={}
  local HUNTER_NAMES={"붉은 낫 카르다","검은 늑대 레이븐","철가면 보르크","독사 이레나","창잡이 파르시","흉터 바라크"}
  local function clearRaid(player)
    player:SetAttribute("RaidZone",nil)
    player:SetAttribute("RaidUntil",nil)
  end
  task.spawn(function()
    while true do
      task.wait(2)
      local now=os.clock()
      for _,player in ipairs(Players:GetPlayers()) do
        if player:GetAttribute("ProfileReady")==true then
          local _,hum,root=liveMeadowCharacter(player)
          -- 반격
          local mask=readNumber(player,"ConquestMask",0)
          local r=raids[player]
          if not r then
            warNext[player]=warNext[player] or (now+420)
            if mask~=0 and root and now>=warNext[player] then
              local owned={}
              for i,z in ipairs(W.Zones) do
                if bit32.band(mask,bit32.lshift(1,i-1))~=0 and typeof(workspace:GetAttribute("LordSeat_"..z.Id))=="Vector3" then owned[#owned+1]=z end
              end
              if #owned>0 then
                local z=owned[math.random(#owned)]
                raids[player]={zone=z,deadline=now+210,spawned=false,list={}}
                player:SetAttribute("RaidZone",z.Name)
                player:SetAttribute("RaidUntil",workspace:GetServerTimeNow()+210)
                toast(player,"⚔ "..z.Name.." 요새에 반격군이 몰려온다! 210초 안에 달려가 지켜라. 놓치면 영토를 잃어.")
              else warNext[player]=now+420 end
            end
          else
            local seat=workspace:GetAttribute("LordSeat_"..r.zone.Id)
            if root and typeof(seat)=="Vector3" and not r.spawned
              and (flat(root.Position)-flat(seat)).Magnitude<95 then
              local tier=zoneTier[r.zone.Id] or 4
              local count=3+math.min(2,tier//4)
              for k=1,count do
                local a=k*math.pi*2/count
                local captain=k==1
                local e=spawnFoe({position=Vector3.new(seat.X+math.cos(a)*16,3,seat.Z+math.sin(a)*16),
                  name=captain and "반격군 대장" or "반격군 병사",tier=math.min(10,tier+1),height=captain and 7 or 6,
                  hp=captain and 2.4 or 1.2,dmg=captain and 1.6 or 1,zoneTag=r.zone.Id,
                  drops={{"Coins",1,tier*(captain and 40 or 12)},{"Ore",.5,1}}})
                if e then r.list[#r.list+1]=e end
              end
              r.spawned=true
              toast(player,"반격군이다! 모두 쓰러뜨려 요새를 지켜라.")
            end
            local alive=0
            for _,e in ipairs(r.list) do if e.HP>0 and e.model.Parent then alive+=1 end end
            if r.spawned and #r.list>0 and alive==0 then
              local tier=zoneTier[r.zone.Id] or 4
              pcall(awardProgress,player,tier*30,tier*100)
              setNumber(player,"Crystal",readNumber(player,"Crystal",0)+2)
              toast(player,"✔ "..r.zone.Name.." 방어 성공! 코인 +"..(tier*100).." · 마력 결정 +2")
              if meadowOil.questEvent then pcall(meadowOil.questEvent,player,"DEFEND") end
              raids[player]=nil;warNext[player]=now+math.random(360,600);clearRaid(player)
            elseif now>r.deadline then
              local idx=zoneIndexOf(r.zone.Id)
              setNumber(player,"ConquestMask",bit32.band(readNumber(player,"ConquestMask",0),bit32.bnot(bit32.lshift(1,idx-1))))
              purge(r.list)
              toast(player,"✘ "..r.zone.Name.." 요새를 빼앗겼다! 영주를 다시 쓰러뜨려 되찾아라.")
              raids[player]=nil;warNext[player]=now+math.random(360,600);clearRaid(player)
            end
          end
          -- 악명 · 용병 사냥꾼
          local n=readNumber(player,"Notoriety",0)
          local st=hunters[player]
          if not st then st={nextAt=now+45,decayAt=now+600,list={}};hunters[player]=st end
          local alive=0
          for _,e in ipairs(st.list) do
            if e.HP>0 and e.model.Parent then
              alive+=1
              if root and (flat(e.position)-flat(root.Position)).Magnitude>240 then purge({e});alive-=1 end
            end
          end
          if n<=0 then
            st.nextAt=math.max(st.nextAt,now+45);st.decayAt=now+600
          else
            if now>=st.decayAt and alive==0 then
              setNumber(player,"Notoriety",n-1);st.decayAt=now+600
              toast(player,"소문이 잦아든다. 악명 "..stars(n-1))
            elseif alive==0 and root and hum and now>=st.nextAt and not safePlace(root) then
              st.list={}
              local count=n>=4 and 2 or 1
              for k=1,count do
                local a=math.random()*math.pi*2
                local d=55+math.random()*15
                local name=HUNTER_NAMES[math.random(#HUNTER_NAMES)]
                local e=spawnFoe({position=Vector3.new(root.Position.X+math.cos(a)*d,3,root.Position.Z+math.sin(a)*d),
                  name="현상금 사냥꾼 · "..name,tier=math.min(10,2+n*2),height=6.4,hp=1.6+n*.7,dmg=1+n*.35,named=true,
                  drops={{"Coins",1,n*70},{"Ore",.5,2},{"Crystal",.25*n,1}}})
                if e then e.hunterOf=player.UserId;st.list[#st.list+1]=e
                  if k==1 then toast(player,"⚠ "..e.model.Name.."이(가) 네 목을 노리고 쫓아온다! (악명 "..stars(n)..")") end
                end
              end
              st.nextAt=now+math.max(60,170-n*25)
            end
          end
        end
      end
    end
  end)
  Players.PlayerRemoving:Connect(function(player)
    local r=raids[player]
    if r then purge(r.list) end
    local st=hunters[player]
    if st then purge(st.list) end
    raids[player]=nil;hunters[player]=nil;warNext[player]=nil;incomeAt[player]=nil
    cooldown.kick[player]=nil;cooldown.rush[player]=nil
  end)
end
