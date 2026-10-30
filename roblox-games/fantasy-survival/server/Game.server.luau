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
local nativeCreatureTemplates = {}
local gameWorld = workspace:FindFirstChild("FantasySurvivalWorld")
if not gameWorld then
  gameWorld = Instance.new("Folder")
  gameWorld.Name = "FantasySurvivalWorld"
  gameWorld.Parent = workspace
end
local enemies = {}
local resourceNodes = {}
local CurrentWave = 0
local WaveState = "PREPARE"
local nextWaveAt = os.clock() + 8
local worldClock = 0
local encounterSerial = 0
local attackCooldown = {}
local LastWaveReward = 0
local MAX_ENEMIES = 22
-- Roblox Terrain is native collidable terrain, never an assembled visual Part.
-- All meadow vegetation and animals must come from the game's registered CC0 meshes.
local meadowTerrain = workspace.Terrain
local function createStartingMeadow()
  meadowTerrain:FillBlock(CFrame.new(0, -4, 0), Vector3.new(312, 12, 312), Enum.Material.Grass)
  for _, ridge in ipairs({
    {x=-115,z=-92,r=41,y=-12}, {x=110,z=-99,r=48,y=-14},
    {x=-105,z=111,r=43,y=-12}, {x=104,z=116,r=45,y=-13},
    {x=-154,z=8,r=39,y=-12}, {x=153,z=-3,r=42,y=-13},
  }) do
    meadowTerrain:FillBall(Vector3.new(ridge.x,ridge.y,ridge.z),ridge.r,Enum.Material.Grass)
  end
  -- Existing stone gathering sites are terrain outcrops, not fake rock parts.
  for _, pos in ipairs({Vector3.new(-35,2,31),Vector3.new(11,2,-39),Vector3.new(-7,2,43)}) do
    meadowTerrain:FillBall(pos-Vector3.new(0,4.5,0),5,Enum.Material.Rock)
  end
  Lighting.ClockTime = 10.5
  Lighting.Brightness = 2
  Lighting.Ambient = Color3.fromRGB(95,113,105)
  Lighting.OutdoorAmbient = Color3.fromRGB(154,175,151)
  gameWorld:SetAttribute("StartingRegion", "MEADOW")
  gameWorld:SetAttribute("GroundVisualSource", "ROBLOX_NATIVE_TERRAIN")
end
createStartingMeadow()

local function worldAsset(id, location, targetHeight)
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
      template.Parent=nil
      nativeCreatureTemplates[modelId]=template
    end
    local clone=template:Clone()
    local originalHeight=clone:GetExtentsSize().Y
    if originalHeight <= 0 then clone:Destroy();error("MEADOW_MESH_BOUNDS_INVALID") end
    clone:ScaleTo(clone:GetScale()*(targetHeight or 5)/originalHeight)
    clone:PivotTo(CFrame.new(location))
    -- Align the original source mesh to a measured native Terrain hit.
    local rayParams=RaycastParams.new()
    rayParams.FilterType=Enum.RaycastFilterType.Include
    rayParams.FilterDescendantsInstances={meadowTerrain}
    local ground=workspace:Raycast(location+Vector3.new(0,44,0),Vector3.new(0,-110,0),rayParams)
    if not ground then clone:Destroy();error("MEADOW_ORIGINAL_MESH_GROUND_UNVERIFIED") end
    local boxCF,boxSize=clone:GetBoundingBox()
    local underside=boxCF.Position.Y-boxSize.Y*.5
    clone:PivotTo(clone:GetPivot()+Vector3.new(0,ground.Position.Y-underside,0))
    clone.Name="Meadow_"..id
    clone.Parent=gameWorld
    clone:SetAttribute("CC0SourceModelId",modelId)
    return clone
  end)
  if not ok then warn("마력숲 CC0 초원 자산 로딩/권한 실패: "..id..": "..tostring(result)) end
  return ok and result or nil
end

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
  local xp = readNumber(player, "XP", 0) + experience
  local level = readNumber(player, "Level", 1)
  while xp >= (25 + level*12) and level < 50 do
    xp -= (25 + level*12)
    level += 1
  end
  setNumber(player, "XP", xp)
  setNumber(player, "Level", level)
  setNumber(player, "Coins", readNumber(player, "Coins", 0) + coinReward)
  setNumber(player, "Progress", readNumber(player, "Progress", 0) + experience)
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
  player:SetAttribute("LastApprovedScope", "resource-harvest")
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
createResourceNodes()

-- Passive original wildlife are presentation only. They never change combat,
-- progression, drops or the original save schema.
local meadowWildlife={}
for index,spec in ipairs({
  {kind="deer",position=Vector3.new(-68,3,-22),height=4.4},
  {kind="deer",position=Vector3.new(61,3,34),height=4.4},
  {kind="boar",position=Vector3.new(52,3,-65),height=3.1},
  {kind="rabbit",position=Vector3.new(-39,3,62),height=1.8},
  {kind="rabbit",position=Vector3.new(41,3,67),height=1.8},
}) do
  local model=worldAsset(spec.kind,spec.position,spec.height)
  if model then
    model:SetAttribute("MeadowWildlife",spec.kind)
    table.insert(meadowWildlife,{model=model,origin=model:GetPivot().Position,phase=index*1.7,
      range=spec.kind=="rabbit" and 5 or 9,speed=spec.kind=="rabbit" and .48 or .2})
  end
end

local function spawnEnemy(isBoss, index)
  if #enemies >= MAX_ENEMIES then return false end
  encounterSerial += 1
  local theta = encounterSerial*2.399 + index*.31
  local radius = 51 + (index%3)*11
  local location = Vector3.new(math.cos(theta)*radius, 3, math.sin(theta)*radius)
  local partId = isBoss and "golem" or (index%3==0 and "bee" or "wolf")
  local anatomyAtom = isBoss and "HEAD_GOLEM" or (index%3==0 and "HEAD_INSECT" or "HEAD_CANINE")
  local modelId = table.find(studioCreatureAtoms,anatomyAtom) and NativeCreatureAssets[partId] or nil
  local nativeScale = table.find(studioCreatureAtoms,anatomyAtom) and (isBoss and 6.3 or 3.15) or nil
  if typeof(modelId)~="number" or modelId<1 or not nativeScale then
    warn("마력숲 승인 생물 자산 선택 누락: "..partId)
    return false
  end
  local ok, model = pcall(function()
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
  local nativeHeight=model:GetExtentsSize().Y
  if nativeHeight<=0 then model:Destroy();return false end
  model:ScaleTo(model:GetScale()*nativeScale/nativeHeight)
  model:PivotTo(CFrame.new(location))
  model.Parent=gameWorld
  local hitPoints = (isBoss and 310 or 45) + CurrentWave*(isBoss and 60 or 13)
  model.Name = isBoss and "돌 골렘" or (partId=="bee" and "초원 벌" or "초원 늑대")
  model:SetAttribute("Species",partId)
  model:SetAttribute("AttackPattern",isBoss and "GOLEM_SLAM" or (partId=="bee" and "BEE_SWEEP" or "WOLF_BITE"))
  model:SetAttribute("EnemyHealth",hitPoints)
  model:SetAttribute("CurrentWave",CurrentWave)
  model:SetAttribute("Boss",isBoss)
  -- 기존 공용 생물 모델 위에만 공격 예고를 표시한다. 판정용 가짜 파츠를 만들지 않는다.
  local attackTelegraph = Instance.new("Highlight")
  attackTelegraph.Name = "AttackAnticipation"
  attackTelegraph.Adornee = model
  attackTelegraph.FillColor = isBoss and Color3.fromRGB(238,65,65) or Color3.fromRGB(255,185,89)
  attackTelegraph.FillTransparency = .72
  attackTelegraph.OutlineTransparency = .2
  attackTelegraph.Enabled = false
  attackTelegraph.Parent = model
  model:SetAttribute("AttackState", "IDLE")
  table.insert(enemies,{
    model=model,HP=hitPoints,maxHP=hitPoints,
    isBoss=isBoss,kind=partId,damage=(isBoss and 20 or 6)+math.floor(CurrentWave/2),
    speed=isBoss and 4.8 or 7.5,position=location,spawnPosition=location,
    lastAttack=0,windupUntil=nil,windupTargetUserId=nil,telegraph=attackTelegraph,attackState="IDLE"
  })
  return true
end

local function startWave()
  if #Players:GetPlayers()==0 then
    nextWaveAt=os.clock()+6
    return
  end
  WaveState="COMBAT"
  CurrentWave += 1
  local number=math.min(3+CurrentWave*2, MAX_ENEMIES)
  if CurrentWave%5==0 then number=math.max(2,number-1) end
  local spawned=0
  for n=1,number do
    if spawnEnemy(false,n) then spawned+=1 end
  end
  if CurrentWave%5==0 and spawnEnemy(true,number+1) then spawned+=1 end
  if spawned==0 then
    WaveState="PREPARE"
    nextWaveAt=os.clock()+8
  end
  broadcastSurvivalState(nil)
end

local function finishWave()
  if WaveState~="COMBAT" then return end
  WaveState="REST"
  nextWaveAt=os.clock()+10
  LastWaveReward=CurrentWave
  for _,player in ipairs(Players:GetPlayers()) do
    awardProgress(player,8+CurrentWave*2,4+CurrentWave)
    player:SetAttribute("LastApprovedScope","survived-wave")
  end
  broadcastSurvivalState(nil)
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

-- Authoritative damage and original progression are shared by basic attacks and
-- meadow skills. Existing XP, boss rewards, scoring and saved schema stay exact.
local meadowFocusUntil={}
local meadowSkillCooldown={}
local meadowDefense={}
local function liveMeadowCharacter(player)
  local character=player.Character
  local humanoid=character and character:FindFirstChildOfClass("Humanoid")
  local root=character and character:FindFirstChild("HumanoidRootPart")
  if not humanoid or humanoid.Health<=0 or not root then return nil,nil,nil end
  return character,humanoid,root
end
local function applyMeadowDamage(player,target,damage)
  if not target or target.HP<=0 or not target.model.Parent then return false end
  local focus=(meadowFocusUntil[player] or 0)>os.clock()
  if focus then damage=math.floor(damage*1.25) end
  target.HP=math.max(0,target.HP-damage)
  target.model:SetAttribute("EnemyHealth",target.HP)
  setNumber(player,"Combo",readNumber(player,"Combo",0)+1)
  setNumber(player,"Score",readNumber(player,"Score",0)+damage)
  player:SetAttribute("LastApprovedScope","combat-impact")
  player:SetAttribute("ApprovedActionTarget",target.position)
  if target.HP<=0 then
    target.model:Destroy()
    for i=#enemies,1,-1 do if enemies[i]==target then table.remove(enemies,i);break end end
    awardProgress(player,target.isBoss and 75 or 12,target.isBoss and 45 or 5)
    setNumber(player,"EnemyHealth",0)
    if target.isBoss then setNumber(player,"Bosses",readNumber(player,"Bosses",0)+1) end
    if Config.CompetitiveRequired then
      setNumber(player,"RoundScore",readNumber(player,"RoundScore",0)+(target.isBoss and 5 or 1))
    end
    if #enemies==0 then finishWave() end
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
  local target=nearestEnemy(rootPart,25)
  if not target then return false end
  local now=os.clock()
  if now<(attackCooldown[player] or 0) then return false end
  attackCooldown[player]=now+.42
  local level=readNumber(player,"Level",1)
  local weaponTier=readNumber(player,"WeaponTier",0)
  local damage=math.floor(16+level*2.2+weaponTier*8)
  return applyMeadowDamage(player,target,damage)
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
  player:SetAttribute("LastApprovedScope","resource-to-equipment-upgrade")
  broadcastSurvivalState(player)
  return true
end

local function startSurvivalRun(player)
  if player:GetAttribute("RunActive")==true then return false end
  player:SetAttribute("RunActive",true)
  player:SetAttribute("CurrentWave",CurrentWave)
  player:SetAttribute("LastApprovedScope","survival-run-started")
  broadcastSurvivalState(player)
  return true
end

local function setEnemyAttackState(enemy, state)
  if enemy.attackState==state then return end
  enemy.attackState=state
  enemy.model:SetAttribute("AttackState",state)
  enemy.telegraph.Enabled=state=="ANTICIPATION"
end

local function cancelEnemyWindup(enemy)
  enemy.windupUntil=nil
  enemy.windupTargetUserId=nil
  setEnemyAttackState(enemy,"RECOVERY")
end

local function updateEnemyAI(dt,now)
  worldClock+=dt
  -- Gentle ambient animal motion continues even between enemy waves.
  -- No fabricated geometry, collision, rewards or hitboxes are involved.
  for _, animal in ipairs(meadowWildlife) do
    if animal.model.Parent then
      local phase=now*animal.speed+animal.phase
      local desired=animal.origin+Vector3.new(math.sin(phase)*animal.range,0,
        math.cos(phase)*animal.range*.55)
      animal.model:PivotTo(CFrame.lookAt(desired,
        desired+Vector3.new(math.cos(phase),0,-math.sin(phase))))
    end
  end
  if #enemies==0 then
    if WaveState=="COMBAT" then finishWave() end
    if now>=nextWaveAt then startWave() end
    return
  end
  for _,enemy in ipairs(enemies) do
    if enemy.HP>0 and enemy.model.Parent then
      local targetPlayer,targetRoot,targetHuman=nil,nil,nil
      local range=140
      for _,player in ipairs(Players:GetPlayers()) do
        local character=player.Character
        local rootPart=character and character:FindFirstChild("HumanoidRootPart")
        local human=character and character:FindFirstChildOfClass("Humanoid")
        if player:GetAttribute("ProfileReady")==true and rootPart and human and human.Health>0 then
          local d=(rootPart.Position-enemy.position).Magnitude
          if d<range then targetPlayer,targetRoot,targetHuman,range=player,rootPart,human,d end
        end
      end
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
          enemy.position+=homeOffset.Unit*math.min(enemy.speed*dt,homeOffset.Magnitude)
          enemy.model:PivotTo(CFrame.lookAt(enemy.position,enemy.position+homeOffset.Unit))
        else
          setEnemyAttackState(enemy,"IDLE")
        end
      else
        local offset=Vector3.new(targetRoot.Position.X-enemy.position.X,0,targetRoot.Position.Z-enemy.position.Z)
        local distance=offset.Magnitude
        -- Three source-authored enemy patterns; authoritative damage and saves are unchanged.
        local attackRange=enemy.kind=="bee" and 5.6 or (enemy.isBoss and 5.2 or 4.4)
        if enemy.windupUntil then
          -- 공격 예고 중 대상이 사라지거나 거리를 벌렸다면 피해 없이 취소한다.
          if targetPlayer.UserId~=enemy.windupTargetUserId or distance>attackRange+1 or targetHuman.Health<=0 then
            cancelEnemyWindup(enemy)
          elseif now>=enemy.windupUntil then
            enemy.windupUntil=nil
            enemy.windupTargetUserId=nil
            enemy.lastAttack=now
            setEnemyAttackState(enemy,"RECOVERY")
            local defense=meadowDefense[targetPlayer] or {}
            local incoming=enemy.damage
            if (defense.dodgeUntil or 0)>now then
              incoming=0 -- accepted timed evasion; no client-trusted dodge flag
            elseif (defense.parryUntil or 0)>now then
              incoming=0
              targetPlayer:SetAttribute("MeadowParryConfirmed",workspace:GetServerTimeNow())
              remote:FireClient(targetPlayer,"MEADOW_REACTION","PARRY")
            elseif (defense.guardUntil or 0)>now then
              incoming=math.ceil(incoming*.5)
            end
            if incoming>0 then targetHuman:TakeDamage(incoming) end
            setNumber(targetPlayer,"Health",math.max(0,math.floor(targetHuman.Health)))
          end
        elseif distance>attackRange then
          setEnemyAttackState(enemy,"CHASE")
          local step=math.min(enemy.speed*dt,distance-attackRange)
          local direction=offset.Unit
          if enemy.kind=="bee" then
            -- Bees flank in a slow sweep instead of moving as ground wolves.
            local tangent=Vector3.new(-direction.Z,0,direction.X)
            direction=(direction+tangent*math.sin(now*1.8+enemy.spawnPosition.X)*.42).Unit
          end
          enemy.position+=direction*step
          enemy.model:PivotTo(CFrame.lookAt(enemy.position,enemy.position+offset.Unit))
        elseif now-enemy.lastAttack>=(enemy.isBoss and 1.9 or 1.45) then
          enemy.windupTargetUserId=targetPlayer.UserId
          enemy.windupUntil=now+(enemy.isBoss and .65 or (enemy.kind=="bee" and .25 or .42))
          setEnemyAttackState(enemy,"ANTICIPATION")
        end
      end
    end
  end
end
local enemyUpdateElapsed=0
RunService.Heartbeat:Connect(function(dt)
  enemyUpdateElapsed+=math.min(dt,.15)
  if enemyUpdateElapsed<.12 then return end
  local step=math.min(enemyUpdateElapsed,.25)
  enemyUpdateElapsed=0
  updateEnemyAI(step,os.clock())
end)

-- Exact owner-selected Roblox action IDs. Cooldowns, health, hit detection and
-- short evasion windows are server-owned; the client only draws approved effects.
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
    local enemy=nearestEnemy(root,9)
    if not enemy or now<(attackCooldown[player] or 0) then return false end
    attackCooldown[player]=now+.65
    local damage=math.floor((16+readNumber(player,"Level",1)*2.2
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
    local damage=math.floor((16+readNumber(player,"Level",1)*2.2
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
    local damage=math.floor(12+readNumber(player,"Level",1)*1.8
      +readNumber(player,"WeaponTier",0)*4)
    return applyMeadowDamage(player,enemy,damage)
  end)
end
local function meadowGuard(player)
  return meadowSkill(player,"skill-meadow-guard",function(_,_,root,now)
    local defense=meadowDefense[player] or {}
    defense.guardUntil=now+2.8
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
  return meadowSkill(player,id,function(character,_,root,now)
    local side=root.CFrame.RightVector*sign
    local ray=RaycastParams.new()
    ray.FilterType=Enum.RaycastFilterType.Exclude
    ray.FilterDescendantsInstances={character}
    local start=root.Position+Vector3.new(0,1.5,0)
    local wall=workspace:Raycast(start,side*7,ray)
    local distance=wall and math.max(0,wall.Distance-2) or 7
    if distance<2 then return false end
    -- Short movement is only applied on the server after obstruction checks.
    character:PivotTo(character:GetPivot()+side*distance)
    local defense=meadowDefense[player] or {}
    defense.dodgeUntil=now+.48
    meadowDefense[player]=defense
    player:SetAttribute("ApprovedActionTarget",root.Position)
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
    end)
  end
  player.CharacterAdded:Connect(bindCharacter)
  if player.Character then task.defer(bindCharacter, player.Character) end
end

-- 데이터 읽기가 실패한 세션에서는 임시 플레이만 허용한다.
-- 실패한 로드의 기본값으로 기존 저장 데이터가 덮어써지는 것을 막는다.
local persistenceAllowed = {}
local profileBindingStarted = {}
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
  persistenceAllowed[player] = validSaved
  if validSaved and typeof(saved) == "table" then
    for key, fallback in pairs(Config.InitialState) do
      local value = saved[key]
      if typeof(value) == "number" then player:SetAttribute(key, value) else player:SetAttribute(key, fallback) end
    end
    player:SetAttribute("ActionSequence", 0)
    player:SetAttribute("LastApprovedScope", "ready")
  else
    initializePlayer(player)
  end
  player:SetAttribute("SaveStatus", validSaved and "READY" or "SESSION_ONLY")
  bindSurvivalHealth(player)
  player:SetAttribute("ProfileReady", true)
  broadcastSurvivalState(player)
end
Players.PlayerAdded:Connect(onSurvivalPlayerAdded)
-- PlayerAdded 이전에 존재하던 플레이어도 동일한 저장 프로필 검증·캐릭터 연결을 수행한다.
for _, player in ipairs(Players:GetPlayers()) do
  task.defer(onSurvivalPlayerAdded, player)
end
remote.OnServerEvent:Connect(function(player, actionId)
  if typeof(actionId) ~= "string" or player:GetAttribute("ProfileReady") ~= true then return end
  local handler = handlers[actionId]
  if typeof(handler) ~= "function" then return end
  local now = os.clock()
  local previous = lastAction[player] or 0
  if now - previous < Config.RateLimitSeconds then return end
  lastAction[player] = now
  -- Target selection evidence is valid only for this accepted action.
  local activeCharacter=player.Character
  local activeRoot=activeCharacter and activeCharacter:FindFirstChild("HumanoidRootPart")
  if activeRoot then player:SetAttribute("ApprovedActionTarget",activeRoot.Position) end
  local actionAccepted=handler(player)
  -- [서버 권한] 성공한 모든 실제 액션만 R15 모션·스킬·VFX로 전달.
  if actionAccepted~=true then return end
  local approvedSequence=readNumber(player,"ActionSequence",0)+1
  setNumber(player,"ActionSequence",approvedSequence)
  local character=player.Character
  local root=character and character:FindFirstChild("HumanoidRootPart")
  if root and typeof(player:GetAttribute("ApprovedActionTarget"))~="Vector3" then
    player:SetAttribute("ApprovedActionTarget",root.Position)
  end
  player:SetAttribute("ApprovedActionMotion",actionId..":"..tostring(approvedSequence))
  player:SetAttribute("ApprovedActionFX",actionId..":"..tostring(approvedSequence))
  remote:FireAllClients("MEADOW_ACTION_FX",player.UserId,actionId,approvedSequence,player:GetAttribute("ApprovedActionTarget"))
  for _,action in ipairs(Config.Actions) do
    if action.Id==actionId and action.Kind=="COMBAT" then
      player:SetAttribute("ApprovedCombatMotion",actionId..":"..tostring(approvedSequence))
      break
    end
  end
end)
local function saveSurvivalProgress(player)
  if persistenceAllowed[player] ~= true or not store then return false end
  local snapshot = {}
  for key, fallback in pairs(Config.InitialState) do snapshot[key] = readNumber(player, key, fallback) end
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
  lastAction[player] = nil
  attackCooldown[player] = nil
  meadowSkillCooldown[player]=nil
  meadowDefense[player]=nil
  meadowFocusUntil[player]=nil
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
