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
local FANTASY_NATIVE_CREATURES_VERSION = 1
local AssetService = game:GetService("AssetService")
local NativeCreatureAssets = require(Shared:WaitForChild("VisualAssetIds"))
local studioCreatureAtoms = studioAssetFamily("CREATURE")
local nativeCreatureTemplates = {}
local WorldProps = require(Shared:WaitForChild("RobloxCommonWorldProps"))
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

local function worldAsset(id, location)
  local ok, model = pcall(function()
    return WorldProps.Create(id, {parent=gameWorld, quality="near", anchored=true,
      pivot=CFrame.new(location)})
  end)
  if not ok then warn("마력숲 공용 월드 자산 로딩 실패: "..tostring(id)) end
  return ok and model or nil
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
  if not rootPart or not node or not node.model or not node.model.Parent then return false end
  if (rootPart.Position - node.model:GetPivot().Position).Magnitude > 14 then return false end
  local now = os.clock()
  if now < node.readyAt then return false end
  node.readyAt = now + 11
  node.model:SetAttribute("NextHarvestAt", node.readyAt)
  local material = node.kind == "WOOD" and "Wood" or "Stone"
  setNumber(player, material, readNumber(player, material, 0) + 2)
  awardProgress(player, 3, 1)
  player:SetAttribute("LastApprovedScope", "resource-harvest")
  broadcastSurvivalState(player)
  return true
end

local function createResourceNodes()
  local positions = {
    {kind="WOOD",id="RESOURCE_WOOD_NODE",position=Vector3.new(-27,2,-22)},
    {kind="WOOD",id="RESOURCE_WOOD_NODE",position=Vector3.new(28,2,25)},
    {kind="WOOD",id="RESOURCE_WOOD_NODE",position=Vector3.new(37,2,-32)},
    {kind="STONE",id="RESOURCE_ROCK_NODE",position=Vector3.new(-35,2,31)},
    {kind="STONE",id="RESOURCE_ROCK_NODE",position=Vector3.new(11,2,-39)},
    {kind="STONE",id="RESOURCE_ROCK_NODE",position=Vector3.new(-7,2,43)},
  }
  for _,spec in ipairs(positions) do
    local model = worldAsset(spec.id, spec.position)
    if model then
      local part = model:FindFirstChildWhichIsA("BasePart", true)
      if part then
        local node = {model=model,kind=spec.kind,readyAt=0}
        table.insert(resourceNodes, node)
        local prompt = Instance.new("ProximityPrompt")
        prompt.Name = "GatherPrompt"
        prompt.ActionText = spec.kind=="WOOD" and "나무 채집" or "돌 채집"
        prompt.ObjectText = spec.kind=="WOOD" and "마력숲 목재" or "마력숲 광석"
        prompt.MaxActivationDistance = 12
        prompt.HoldDuration = .55
        prompt.RequiresLineOfSight = false
        prompt.Parent = part
        prompt.Triggered:Connect(function(player) gatherResource(player,node) end)
      end
    end
  end
  worldAsset("LORE_STONE", Vector3.new(0,2,53))
  worldAsset("SIGNPOST", Vector3.new(5,2,-6))
end
createResourceNodes()

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
  model.Name = isBoss and "마력숲 보스" or "마력숲 야생 생물"
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
    isBoss=isBoss,damage=(isBoss and 20 or 6)+math.floor(CurrentWave/2),
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
  target.HP=math.max(0,target.HP-damage)
  target.model:SetAttribute("EnemyHealth",target.HP)
  setNumber(player,"Combo",readNumber(player,"Combo",0)+1)
  setNumber(player,"Score",readNumber(player,"Score",0)+damage)
  player:SetAttribute("LastApprovedScope","combat-impact")
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

local function gatherNearestResource(player)
  local character=player.Character
  local rootPart=character and character:FindFirstChild("HumanoidRootPart")
  if not rootPart then return false end
  local nearest,distance=nil,14
  for _,node in ipairs(resourceNodes) do
    if node.model.Parent and os.clock()>=node.readyAt then
      local d=(rootPart.Position-node.model:GetPivot().Position).Magnitude
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
        local attackRange=4.4
        if enemy.windupUntil then
          -- 공격 예고 중 대상이 사라지거나 거리를 벌렸다면 피해 없이 취소한다.
          if targetPlayer.UserId~=enemy.windupTargetUserId or distance>attackRange+1 or targetHuman.Health<=0 then
            cancelEnemyWindup(enemy)
          elseif now>=enemy.windupUntil then
            enemy.windupUntil=nil
            enemy.windupTargetUserId=nil
            enemy.lastAttack=now
            setEnemyAttackState(enemy,"RECOVERY")
            targetHuman:TakeDamage(enemy.damage)
            setNumber(targetPlayer,"Health",math.max(0,math.floor(targetHuman.Health)))
          end
        elseif distance>attackRange then
          setEnemyAttackState(enemy,"CHASE")
          local step=math.min(enemy.speed*dt,distance-attackRange)
          enemy.position+=offset.Unit*step
          enemy.model:PivotTo(CFrame.lookAt(enemy.position,enemy.position+offset.Unit))
        elseif now-enemy.lastAttack>=(enemy.isBoss and 1.9 or 1.45) then
          enemy.windupTargetUserId=targetPlayer.UserId
          enemy.windupUntil=now+(enemy.isBoss and .48 or .32)
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

local handlers={
  ["genre-core"]=startSurvivalRun,
  ["scope-corefun-ea77622450"]=attackEnemy,
  ["scope-coreloop-0-9b2d4dfbc6"]=attackEnemy,
  ["scope-coreloop-1-6ebe58f496"]=gatherNearestResource,
  ["scope-coreloop-2-6c927cfa40"]=upgradeEquipment,
  ["scope-mobileux-5acfb2eaa6"]=attackEnemy,
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
  local actionAccepted=handler(player)
  -- [서버 권한] 실제 승인된 공격 판정이 있을 때만 전투 모션 이벤트를 보낸다.
  for _, action in ipairs(Config.Actions) do
    if actionAccepted and action.Id == actionId and action.Kind == "COMBAT" then
      -- Roblox 속성 변경 이벤트는 같은 문자열을 재전송하면 발생하지 않는다.
      -- 피해 판정이 성공한 공격마다 별도 승인 번호를 발급해 연속 타격 모션을 유지한다.
      local approvedSequence = readNumber(player, "ActionSequence", 0) + 1
      setNumber(player, "ActionSequence", approvedSequence)
      player:SetAttribute("ApprovedCombatMotion", actionId .. ":" .. tostring(approvedSequence))
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
local survivalGround = workspace:FindFirstChild("SurvivalGround")
if survivalGround and not survivalGround:IsA("BasePart") then survivalGround:Destroy(); survivalGround = nil end
if not survivalGround then
  survivalGround = Instance.new("Part")
  survivalGround.Name = "SurvivalGround"
  survivalGround.Parent = workspace
end
survivalGround.Size = Vector3.new(280, 2, 280)
survivalGround.Position = Vector3.new(0, 0, 0)
survivalGround.Anchored = true
survivalGround.CanCollide = true
survivalGround.CanQuery = true
survivalGround.Material = Enum.Material.Grass
survivalGround.Color = Color3.fromRGB(72, 105, 66)
survivalGround.TopSurface = Enum.SurfaceType.Smooth

local nativeFoundationSpawn = workspace:FindFirstChild("NativeFoundationSpawn")
if not nativeFoundationSpawn then
  nativeFoundationSpawn = Instance.new("SpawnLocation")
  nativeFoundationSpawn.Name = "NativeFoundationSpawn"
  nativeFoundationSpawn.Parent = workspace
end
nativeFoundationSpawn.Size = Vector3.new(8, 1, 8)
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
  params.FilterDescendantsInstances = {character}
  local groundHit = workspace:Raycast(rootPart.Position + Vector3.new(0, 4, 0), Vector3.new(0, -16, 0), params)
  local groundContact = groundHit ~= nil and groundHit.Instance ~= nil
  character:SetAttribute("GROUND_CONTACT", groundContact)
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
