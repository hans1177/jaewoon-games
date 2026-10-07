-- 파일명: roblox-games/seed-single-defense-strat-celestial-bastion/server/Game.server.luau

-- 임포트
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local DataStoreService = game:GetService("DataStoreService")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Config = require(Shared:WaitForChild("GameConfig"))

-- 저장
local store
pcall(function()
  store = DataStoreService:GetDataStore("seed-defense-bastion-v1")
end)

local EXTRA_SAVE_KEYS = {
  "TowerTechLevel",
  "TerrainTechLevel",
  "ResonanceTechLevel",
}

local dataLoaded = {}
local lastAction = {}
local sessions = {}
local arenaSerial = 0

-- 네트워크
local remote = ReplicatedStorage:FindFirstChild(Config.RemoteName)
if remote and not remote:IsA("RemoteEvent") then
  remote:Destroy()
  remote = nil
end
if not remote then
  remote = Instance.new("RemoteEvent")
  remote.Name = Config.RemoteName
  remote.Parent = ReplicatedStorage
end

-- 상태
local function readNumber(player, name, fallback)
  local value = player:GetAttribute(name)
  if typeof(value) ~= "number" then return fallback end
  return value
end

local function setNumber(player, name, value)
  if typeof(value) ~= "number" then return end
  player:SetAttribute(name, math.floor(value))
end

local function initializeTransientState(player)
  player:SetAttribute("LastApprovedScope", "ready")
  player:SetAttribute("SessionActive", false)
  player:SetAttribute("WaveActive", false)
  player:SetAttribute("WaveState", "PREPARE")
  player:SetAttribute("BattleEnergy", 10)
  player:SetAttribute("TerrainMode", "FLAT")
  player:SetAttribute("ResonanceState", "NONE")
  player:SetAttribute("ObjectiveHint", "CHECK_WAVE_AND_BUILD")
  if Config.LearningContext and Config.LearningContext.Applied then
    player:SetAttribute("LearningOperator", Config.LearningContext.Operator)
    player:SetAttribute("LastLearningPattern", "")
    player:SetAttribute("ActionSequence", 0)
  end
end

local function initializePlayer(player)
  for key, value in pairs(Config.InitialState) do
    player:SetAttribute(key, value)
  end
  for _, key in ipairs(EXTRA_SAVE_KEYS) do
    player:SetAttribute(key, 0)
  end
  initializeTransientState(player)
end

local function snapshotPlayer(player)
  local snapshot = {}
  for key, fallback in pairs(Config.InitialState) do
    snapshot[key] = readNumber(player, key, fallback)
  end
  for _, key in ipairs(EXTRA_SAVE_KEYS) do
    snapshot[key] = readNumber(player, key, 0)
  end
  return snapshot
end

local function savePlayer(player)
  if not store or not dataLoaded[player] then return end
  local snapshot = snapshotPlayer(player)
  pcall(function()
    store:UpdateAsync("player:" .. player.UserId, function(previous)
      local merged = typeof(previous) == "table" and table.clone(previous) or {}
      for key, value in pairs(snapshot) do
        merged[key] = value
      end
      return merged
    end)
  end)
end

local function recordAction(player, scopeId, learningPattern, scoreDelta, progressDelta)
  player:SetAttribute("LastApprovedScope", scopeId)
  setNumber(player, "ActionSequence", readNumber(player, "ActionSequence", 0) + 1)
  player:SetAttribute("LastLearningPattern", learningPattern)
  if scoreDelta and scoreDelta ~= 0 then
    setNumber(player, "Score", readNumber(player, "Score", 0) + scoreDelta)
  end
  if progressDelta and progressDelta ~= 0 then
    setNumber(player, "Progress", readNumber(player, "Progress", 0) + progressDelta)
  end
end

-- 기본 멀티 동기화
local function multiplayerSnapshot(changedPlayer)
  local participants = {}
  for _, participant in ipairs(Players:GetPlayers()) do
    table.insert(participants, {
      UserId = participant.UserId,
      Name = participant.Name,
      Wave = readNumber(participant, "Wave", 1),
      BaseHealth = readNumber(participant, "BaseHealth", 100),
      Towers = readNumber(participant, "Towers", 0),
      SessionActive = participant:GetAttribute("SessionActive") == true,
    })
  end

  return {
    Version = 1,
    ParticipantCount = #participants,
    ChangedUserId = changedPlayer and changedPlayer.UserId or 0,
    Participants = participants,
    ServerTime = os.time(),
  }
end

local function broadcastMultiplayerSync(changedPlayer)
  remote:FireAllClients("MULTIPLAYER_SYNC", multiplayerSnapshot(changedPlayer))
end

-- 월드
local function makePart(parent, name, size, position, color, material)
  local part = Instance.new("Part")
  part.Name = name
  part.Size = size
  part.Position = position
  part.Anchored = true
  part.CanCollide = true
  part.Color = color
  part.Material = material
  part.Parent = parent
  return part
end

local function buildWorld()
  local world = workspace:FindFirstChild("CelestialBastionWorld")
  if world then world:Destroy() end

  world = Instance.new("Model")
  world.Name = "CelestialBastionWorld"
  world.Parent = workspace

  local lobby = makePart(
    world,
    "CelestialLobby",
    Vector3.new(90, 2, 70),
    Vector3.new(0, 0, 0),
    Color3.fromRGB(104, 108, 126),
    Enum.Material.Marble
  )
  local beacon = makePart(
    world,
    "BastionBeacon",
    Vector3.new(8, 18, 8),
    Vector3.new(0, 9, -18),
    Color3.fromRGB(178, 191, 230),
    Enum.Material.Neon
  )

  world:SetAttribute("Landmark", "CELESTIAL_BASTION")
  world:SetAttribute("Objective", "DEFEND_BASTION")
  world:SetAttribute("WorldReady", true)
  lobby:SetAttribute("Zone", "CELESTIAL_LOBBY")
  beacon:SetAttribute("Objective", "BastionBeacon")
  return world
end

local worldModel = buildWorld()

local function createPlayerArena(player)
  arenaSerial += 1
  local xOffset = (arenaSerial - 1) * 120

  local arena = Instance.new("Model")
  arena.Name = "Arena_" .. tostring(player.UserId)
  arena:SetAttribute("OwnerUserId", player.UserId)
  arena.Parent = worldModel

  local ground = makePart(
    arena,
    "Battlefield",
    Vector3.new(94, 2, 92),
    Vector3.new(xOffset, 0, 110),
    Color3.fromRGB(83, 88, 101),
    Enum.Material.Slate
  )
  local enemyPath = makePart(
    arena,
    "EnemyPath",
    Vector3.new(14, 0.5, 78),
    Vector3.new(xOffset, 1.25, 106),
    Color3.fromRGB(93, 77, 67),
    Enum.Material.Cobblestone
  )
  local core = makePart(
    arena,
    "BastionCore",
    Vector3.new(16, 10, 10),
    Vector3.new(xOffset, 5, 149),
    Color3.fromRGB(119, 137, 176),
    Enum.Material.Marble
  )
  local spawn = makePart(
    arena,
    "EnemySpawn",
    Vector3.new(12, 1, 8),
    Vector3.new(xOffset, 1.5, 66),
    Color3.fromRGB(91, 51, 61),
    Enum.Material.Slate
  )
  spawn.Transparency = 0.35

  core:SetAttribute("Objective", "BaseHealth")
  enemyPath:SetAttribute("Hazard", "INVASION_ROUTE")
  ground:SetAttribute("Zone", "PLAYER_BATTLEFIELD")

  local terrainCells = {}
  for index = 1, 3 do
    local cell = makePart(
      arena,
      "TerrainCell" .. index,
      Vector3.new(14, 1, 14),
      Vector3.new(xOffset + (index - 2) * 18, 1.5, 112),
      Color3.fromRGB(98, 105 + index * 7, 121),
      Enum.Material.Rock
    )
    cell:SetAttribute("TerrainHeight", 0)
    cell:SetAttribute("PathCost", 1)
    terrainCells[index] = cell
  end

  return {
    model = arena,
    ground = ground,
    path = enemyPath,
    core = core,
    spawn = spawn,
    terrainCells = terrainCells,
  }
end

-- 세션
local ELEMENTS = {"FIRE", "ELECTRIC", "COLD"}

local function getSession(player)
  local session = sessions[player]
  if session then return session end

  session = {
    active = false,
    enemies = {},
    towers = {},
    towerSequence = 0,
    terrainIndex = 0,
    arena = createPlayerArena(player),
  }
  sessions[player] = session
  return session
end

local function countLive(map)
  local count = 0
  for instance in pairs(map) do
    if instance and instance.Parent then count += 1 end
  end
  return count
end

local function clearEnemies(session)
  for enemy in pairs(session.enemies) do
    if enemy and enemy.Parent then enemy:Destroy() end
  end
  table.clear(session.enemies)
end

local function clearTowers(session)
  for tower in pairs(session.towers) do
    if tower and tower.Parent then tower:Destroy() end
  end
  table.clear(session.towers)
end

-- 지형 변형
local function transformTerrain(player)
  local session = getSession(player)
  session.terrainIndex = (session.terrainIndex % #session.arena.terrainCells) + 1
  local cell = session.arena.terrainCells[session.terrainIndex]

  local raised = (tonumber(cell:GetAttribute("TerrainHeight")) or 0) <= 0
  local height = raised and 6 or -2
  cell.Size = Vector3.new(cell.Size.X, raised and 7 or 1, cell.Size.Z)
  cell.Position = Vector3.new(cell.Position.X, raised and 4 or 1.5, cell.Position.Z)
  cell:SetAttribute("TerrainHeight", height)
  cell:SetAttribute("PathCost", raised and 3 or 1)

  player:SetAttribute("TerrainMode", raised and "RAISED_BLOCK" or "LOW_GUIDE")
  player:SetAttribute("TerrainCell", session.terrainIndex)
  return cell
end

local function terrainSpeedMultiplier(session)
  local cost = 1
  for _, cell in ipairs(session.arena.terrainCells) do
    cost = math.max(cost, tonumber(cell:GetAttribute("PathCost")) or 1)
  end
  return cost >= 3 and 0.75 or 1
end

-- 속성 공명
local function resonanceMultiplier(session)
  local hasFire = false
  local hasElectric = false
  local hasCold = false

  for tower in pairs(session.towers) do
    if tower and tower.Parent then
      local element = tower:GetAttribute("Element")
      if element == "FIRE" then hasFire = true end
      if element == "ELECTRIC" then hasElectric = true end
      if element == "COLD" then hasCold = true end
    end
  end

  if hasFire and hasElectric then
    return 1.5, "FIRE_ELECTRIC_BURST"
  end
  if hasCold and (hasFire or hasElectric) then
    return 1.25, "COLD_CONTROL"
  end
  return 1, "NONE"
end

-- 전투
local function findTargetEnemy(player)
  local session = getSession(player)
  local target = nil
  local nearest = math.huge

  for enemy in pairs(session.enemies) do
    local root = enemy and enemy.PrimaryPart
    if root and enemy.Parent then
      local distance = (root.Position - session.arena.core.Position).Magnitude
      if distance < nearest then
        nearest = distance
        target = enemy
      end
    end
  end
  return target
end

local finishWave

local function damageEnemy(player, enemy, amount)
  local session = getSession(player)
  if not enemy or not session.enemies[enemy] or not enemy.Parent then return false end

  local health = tonumber(enemy:GetAttribute("Health")) or 0
  if health <= 0 then return false end

  local nextHealth = math.max(0, health - math.max(1, math.floor(amount)))
  enemy:SetAttribute("Health", nextHealth)
  enemy:SetAttribute("HitReactionAt", os.clock())
  enemy:SetAttribute("RecoveryState", nextHealth > 0 and "RECOVERING" or "DEFEATED")
  setNumber(player, "EnemyHealth", nextHealth)

  if nextHealth <= 0 then
    local reward = tonumber(enemy:GetAttribute("EnergyReward")) or 2
    setNumber(player, "BattleEnergy", readNumber(player, "BattleEnergy", 0) + reward)
    setNumber(player, "Score", readNumber(player, "Score", 0) + 10)
    session.enemies[enemy] = nil
    enemy:Destroy()

    local nextEnemy = findTargetEnemy(player)
    if nextEnemy then
      setNumber(player, "EnemyHealth", tonumber(nextEnemy:GetAttribute("Health")) or 0)
    elseif session.active and finishWave then
      finishWave(player, "CLEARED")
    end

    broadcastMultiplayerSync(player)
    return true
  end
  return false
end

local function retryWave(player, reason)
  local session = getSession(player)
  clearEnemies(session)
  session.active = false

  player:SetAttribute("SessionActive", false)
  player:SetAttribute("WaveActive", false)
  player:SetAttribute("WaveState", "RETRY_READY")
  player:SetAttribute("WaveEndReason", reason or "FAILED")
  setNumber(player, "BaseHealth", 100)
  setNumber(player, "EnemyHealth", 0)

  local preservedEnergy = math.floor(readNumber(player, "BattleEnergy", 0) * 0.5)
  setNumber(player, "BattleEnergy", preservedEnergy)
  player:SetAttribute("FailureHint", "CHANGE_TERRAIN_OR_RESONANCE")
  player:SetAttribute("ObjectiveHint", "RETRY_SAME_WAVE")
  broadcastMultiplayerSync(player)
end

local function runEnemyAI(player, enemy)
  enemy:SetAttribute("Target", "BastionCore")
  enemy:SetAttribute("AggroState", "ADVANCING")
  enemy:SetAttribute("AttackState", "CHASE")

  task.spawn(function()
    while player.Parent and enemy.Parent do
      local session = sessions[player]
      local root = enemy.PrimaryPart
      if not session or not session.active or not root then break end

      local targetPosition = session.arena.core.Position + Vector3.new(0, 2, 0)
      local offset = targetPosition - root.Position
      local distance = offset.Magnitude

      if distance <= 4 then
        enemy:SetAttribute("AttackState", "ATTACK_WINDUP")
        enemy:SetAttribute("AttackAnticipation", os.clock())
        task.wait(0.2)
        if not enemy.Parent or not sessions[player] then break end

        local baseDamage = tonumber(enemy:GetAttribute("BaseDamage")) or 8
        local baseHealth = math.max(0, readNumber(player, "BaseHealth", 100) - baseDamage)
        setNumber(player, "BaseHealth", baseHealth)
        session.enemies[enemy] = nil
        enemy:Destroy()

        if baseHealth <= 0 then
          retryWave(player, "BASTION_BROKEN")
        elseif countLive(session.enemies) == 0 and session.active then
          finishWave(player, "SURVIVED")
        else
          broadcastMultiplayerSync(player)
        end
        break
      end

      local speed = tonumber(enemy:GetAttribute("MoveSpeed")) or 7
      local step = math.min(distance, speed * terrainSpeedMultiplier(session) * 0.1)
      root.CFrame = CFrame.lookAt(root.Position + offset.Unit * step, targetPosition)
      task.wait(0.1)
    end
  end)
end

local function spawnEnemy(player, index)
  local session = getSession(player)
  local enemy = Instance.new("Model")
  enemy.Name = "DarkLegion_" .. tostring(player.UserId) .. "_" .. tostring(index)
  enemy.Parent = session.arena.model

  local body = Instance.new("Part")
  body.Name = "Body"
  body.Shape = Enum.PartType.Ball
  body.Anchored = true
  body.CanCollide = false
  body.Material = Enum.Material.SmoothPlastic
  body.Size = Vector3.new(4, 4, 4)
  body.Position = session.arena.spawn.Position + Vector3.new((index - 2) * 4, 2.5, -index * 2)
  body.Color = Color3.fromRGB(75, 56, 91)
  body.Parent = enemy
  enemy.PrimaryPart = body

  local wave = math.max(1, readNumber(player, "Wave", 1))
  local health = 60 + wave * 14 + index * 3
  local speed = math.min(7 + wave * 0.3, 14)
  enemy:SetAttribute("Health", health)
  enemy:SetAttribute("MaxHealth", health)
  enemy:SetAttribute("MoveSpeed", speed)
  enemy:SetAttribute("BaseDamage", 7 + math.floor(wave / 2))
  enemy:SetAttribute("EnergyReward", 2 + math.floor(wave / 3))
  enemy:SetAttribute("OwnerUserId", player.UserId)

  session.enemies[enemy] = true
  if readNumber(player, "EnemyHealth", 0) <= 0 then
    setNumber(player, "EnemyHealth", health)
  end
  runEnemyAI(player, enemy)
  return enemy
end

-- 타워
local function createTower(player)
  local session = getSession(player)
  session.towerSequence += 1
  local index = session.towerSequence
  local element = ELEMENTS[((index - 1) % #ELEMENTS) + 1]

  local tower = Instance.new("Model")
  tower.Name = "Tower_" .. tostring(player.UserId) .. "_" .. tostring(index)
  tower.Parent = session.arena.model

  local body = Instance.new("Part")
  body.Name = "TowerBody"
  body.Anchored = true
  body.CanCollide = true
  body.Size = Vector3.new(4, 7, 4)
  body.Position = session.arena.ground.Position + Vector3.new((index % 3 - 1) * 18, 4.5, 10 + math.floor(index / 3) * 10)
  body.Material = Enum.Material.Metal
  body.Color = element == "FIRE" and Color3.fromRGB(183, 76, 49)
    or element == "ELECTRIC" and Color3.fromRGB(193, 183, 70)
    or Color3.fromRGB(92, 146, 187)
  body.Parent = tower
  tower.PrimaryPart = body

  local tech = math.max(0, readNumber(player, "TowerTechLevel", 0))
  tower:SetAttribute("Element", element)
  tower:SetAttribute("Damage", 9 + tech * 2)
  tower:SetAttribute("UpgradeTier", 1)
  tower:SetAttribute("OwnerUserId", player.UserId)
  session.towers[tower] = true

  task.spawn(function()
    while player.Parent and tower.Parent and sessions[player] do
      local target = findTargetEnemy(player)
      if target then
        local multiplier, resonance = resonanceMultiplier(session)
        player:SetAttribute("ResonanceState", resonance)

        local damage = (tonumber(tower:GetAttribute("Damage")) or 10) * multiplier
        if resonance == "COLD_CONTROL" then
          target:SetAttribute("MoveSpeed", math.max(3, (tonumber(target:GetAttribute("MoveSpeed")) or 7) * 0.8))
        end

        tower:SetAttribute("TargetEnemy", target.Name)
        tower:SetAttribute("AttackStartedAt", os.clock())
        damageEnemy(player, target, damage)
        tower:SetAttribute("AttackRecoveryAt", os.clock())
      end
      task.wait(1.1)
    end
  end)
  return tower
end

local function placeTower(player)
  local energy = math.max(0, readNumber(player, "BattleEnergy", 0))
  local towerCount = math.max(0, readNumber(player, "Towers", 0))
  local cost = 4 + towerCount * 2

  if energy < cost then
    player:SetAttribute("ObjectiveHint", "NEED_ENERGY_" .. tostring(cost))
    return false
  end

  setNumber(player, "BattleEnergy", energy - cost)
  setNumber(player, "Towers", towerCount + 1)
  createTower(player)
  player:SetAttribute("ObjectiveHint", "TOWER_PLACED")
  return true
end

local function upgradeTower(player)
  local session = getSession(player)
  if countLive(session.towers) == 0 then
    player:SetAttribute("ObjectiveHint", "PLACE_TOWER_FIRST")
    return false
  end

  local energy = math.max(0, readNumber(player, "BattleEnergy", 0))
  local cost = 5 + readNumber(player, "TowerTechLevel", 0)
  if energy < cost then
    player:SetAttribute("ObjectiveHint", "NEED_ENERGY_" .. tostring(cost))
    return false
  end

  setNumber(player, "BattleEnergy", energy - cost)
  for tower in pairs(session.towers) do
    if tower and tower.Parent then
      tower:SetAttribute("Damage", (tonumber(tower:GetAttribute("Damage")) or 9) + 3)
      tower:SetAttribute("UpgradeTier", (tonumber(tower:GetAttribute("UpgradeTier")) or 1) + 1)
    end
  end
  player:SetAttribute("ObjectiveHint", "TOWER_UPGRADED")
  return true
end

local function researchTowerTechnology(player)
  local coins = math.max(0, readNumber(player, "Coins", 0))
  local current = math.max(0, readNumber(player, "TowerTechLevel", 0))
  local cost = 3 + current * 2

  if coins < cost then
    player:SetAttribute("ObjectiveHint", "NEED_WAVE_REWARD_" .. tostring(cost))
    return false
  end

  setNumber(player, "Coins", coins - cost)
  setNumber(player, "TowerTechLevel", current + 1)
  setNumber(player, "TerrainTechLevel", readNumber(player, "TerrainTechLevel", 0) + 1)
  setNumber(player, "ResonanceTechLevel", readNumber(player, "ResonanceTechLevel", 0) + 1)
  setNumber(player, "Level", readNumber(player, "Level", 1) + 1)
  player:SetAttribute("ObjectiveHint", "TECH_RESEARCH_COMPLETE")
  return true
end

-- 웨이브
local function startWave(player)
  local session = getSession(player)
  if session.active then return false end

  session.active = true
  clearEnemies(session)
  player:SetAttribute("SessionActive", true)
  player:SetAttribute("WaveActive", true)
  player:SetAttribute("WaveState", "COMBAT")
  player:SetAttribute("SessionStartedAt", os.time())
  player:SetAttribute("ObjectiveHint", "DEFEND_BASTION")

  if readNumber(player, "BaseHealth", 100) <= 0 then
    setNumber(player, "BaseHealth", 100)
  end
  if readNumber(player, "BattleEnergy", 0) <= 0 then
    setNumber(player, "BattleEnergy", 10)
  end

  local wave = math.max(1, readNumber(player, "Wave", 1))
  local enemyCount = math.clamp(3 + wave, 4, 10)
  for index = 1, enemyCount do
    spawnEnemy(player, index)
  end

  if countLive(session.towers) == 0 and readNumber(player, "BattleEnergy", 0) >= 4 then
    placeTower(player)
  end

  broadcastMultiplayerSync(player)
  return true
end

finishWave = function(player, reason)
  local session = getSession(player)
  if not session.active then return end

  session.active = false
  clearEnemies(session)

  local wave = math.max(1, readNumber(player, "Wave", 1))
  player:SetAttribute("SessionActive", false)
  player:SetAttribute("WaveActive", false)
  player:SetAttribute("WaveState", "CLEARED")
  player:SetAttribute("WaveEndReason", reason or "CLEARED")

  setNumber(player, "Wave", wave + 1)
  setNumber(player, "Coins", readNumber(player, "Coins", 0) + 3 + math.floor(wave / 2))
  setNumber(player, "Progress", readNumber(player, "Progress", 0) + 6 + wave)
  setNumber(player, "EnemyHealth", 0)
  player:SetAttribute("ObjectiveHint", "RESEARCH_OR_REBUILD")
  broadcastMultiplayerSync(player)
end

-- 액션
local function prepareBastion(player)
  if not getSession(player).active then
    transformTerrain(player)
    placeTower(player)
    startWave(player)
  end
  recordAction(player, "genre-core", "board-grid-placement", 7, 9)
end

local function directCombat(player)
  if not getSession(player).active then startWave(player) end
  local enemy = findTargetEnemy(player)
  if enemy then
    local level = math.max(1, readNumber(player, "Level", 1))
    damageEnemy(player, enemy, 10 + level)
    setNumber(player, "Combo", readNumber(player, "Combo", 0) + 1)
  end
  recordAction(player, "scope-corefun-e6b39ee6be", "score-combo-reward", 10, 6)
end

local function inspectWaveAndShapePath(player)
  local wave = math.max(1, readNumber(player, "Wave", 1))
  player:SetAttribute("NextEnemyCount", math.clamp(3 + wave, 4, 10))
  transformTerrain(player)
  if not getSession(player).active then startWave(player) end
  recordAction(player, "scope-coreloop-0-79673b79fd", "input-drag-touch", 11, 7)
end

local function spendEnergyDuringCombat(player)
  if not getSession(player).active then startWave(player) end
  if readNumber(player, "BattleEnergy", 0) >= 5 then
    upgradeTower(player)
  else
    directCombat(player)
  end
  transformTerrain(player)
  recordAction(player, "scope-coreloop-1-161adce601", "progression-difficulty", 12, 8)
end

local function researchAfterWave(player)
  if getSession(player).active then
    player:SetAttribute("ObjectiveHint", "CLEAR_CURRENT_WAVE")
  else
    researchTowerTechnology(player)
    player:SetAttribute("ResonanceState", select(2, resonanceMultiplier(getSession(player))))
  end
  recordAction(player, "scope-coreloop-2-82be788ae8", "save-state-persistence", 13, 9)
end

local function reviewDefenseState(player)
  local session = getSession(player)
  player:SetAttribute("VisibleEnemyCount", countLive(session.enemies))
  player:SetAttribute("VisibleTowerCount", countLive(session.towers))
  player:SetAttribute("ResonanceState", select(2, resonanceMultiplier(session)))
  player:SetAttribute("ObjectiveHint", session.active and "WATCH_PATH_AND_RESONANCE" or "PLAN_NEXT_WAVE")
  recordAction(player, "scope-mobileux-3f1cbb0d73", "ads-monetization", 14, 10)
  broadcastMultiplayerSync(player)
end

local handlers = {
  ["genre-core"] = prepareBastion,
  ["scope-corefun-e6b39ee6be"] = directCombat,
  ["scope-coreloop-0-79673b79fd"] = inspectWaveAndShapePath,
  ["scope-coreloop-1-161adce601"] = spendEnergyDuringCombat,
  ["scope-coreloop-2-82be788ae8"] = researchAfterWave,
  ["scope-mobileux-3f1cbb0d73"] = reviewDefenseState,
}

-- 플레이어 생명주기
local function loadPlayer(player)
  initializePlayer(player)
  dataLoaded[player] = nil

  if store then
    local ok, saved = pcall(function()
      return store:GetAsync("player:" .. player.UserId)
    end)
    if ok and typeof(saved) == "table" then
      for key, fallback in pairs(Config.InitialState) do
        local value = saved[key]
        player:SetAttribute(key, typeof(value) == "number" and value or fallback)
      end
      for _, key in ipairs(EXTRA_SAVE_KEYS) do
        local value = saved[key]
        player:SetAttribute(key, typeof(value) == "number" and value or 0)
      end
    end
  end

  initializeTransientState(player)
  dataLoaded[player] = true
  getSession(player)
  task.defer(function() broadcastMultiplayerSync(player) end)
end

Players.PlayerAdded:Connect(loadPlayer)
for _, player in ipairs(Players:GetPlayers()) do
  task.defer(loadPlayer, player)
end
task.defer(function() broadcastMultiplayerSync(nil) end)

remote.OnServerEvent:Connect(function(player, actionId)
  if typeof(actionId) ~= "string" then return end
  if not dataLoaded[player] then return end

  local handler = handlers[actionId]
  if typeof(handler) ~= "function" then return end

  local now = os.clock()
  local previous = lastAction[player] or 0
  if now - previous < Config.RateLimitSeconds then return end
  lastAction[player] = now

  handler(player)
  broadcastMultiplayerSync(player)
end)

Players.PlayerRemoving:Connect(function(player)
  savePlayer(player)
  local session = sessions[player]
  if session then
    clearEnemies(session)
    clearTowers(session)
    if session.arena and session.arena.model and session.arena.model.Parent then
      session.arena.model:Destroy()
    end
  end
  sessions[player] = nil
  dataLoaded[player] = nil
  lastAction[player] = nil
  task.defer(function() broadcastMultiplayerSync(nil) end)
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
  nativeFoundationSpawn.Size = Vector3.new(8, 1, 8)
  nativeFoundationSpawn.Neutral = true
  nativeFoundationSpawn.Parent = workspace
end
nativeFoundationSpawn.Anchored = true
nativeFoundationSpawn.CanCollide = true
-- 첫 헤드리스 프레임에서도 플레이어 접속 없이 로비 지면에 스폰을 고정한다.
local nativeFoundationGround = worldModel:FindFirstChild("CelestialLobby")
if nativeFoundationGround and nativeFoundationGround:IsA("BasePart") then
  nativeFoundationSpawn.Position = Vector3.new(
    0,
    nativeFoundationGround.Position.Y + nativeFoundationGround.Size.Y * 0.5 + nativeFoundationSpawn.Size.Y * 0.5 + 0.05,
    0
  )
end
local function bindNativeFoundationCharacter(character)
  local humanoid = character:WaitForChild("Humanoid", 10)
  local rootPart = character:WaitForChild("HumanoidRootPart", 10)
  if not humanoid or not rootPart then character:SetAttribute("FoundationFailure", "CHARACTER_FOUNDATION_FAILURE"); return end
  character:SetAttribute("GROUND_CONTACT", false)
  character:SetAttribute("MOVEMENT_CONFIRMED", false)
  rootPart.Anchored = false
  humanoid.PlatformStand = false
  for _, bodyPart in ipairs(character:GetDescendants()) do
    if bodyPart:IsA("BasePart") and not bodyPart:FindFirstAncestorOfClass("Tool") then bodyPart.Anchored = false end
  end
  local params = RaycastParams.new()
  params.ExcludeInstances = {character, nativeFoundationSpawn}
  params.RespectCanCollide = true
  params.IgnoreWater = true
  params.CollisionGroup = rootPart.CollisionGroup
  local leg = humanoid.RigType == Enum.HumanoidRigType.R6 and character:FindFirstChild("Left Leg") or nil
  local clearance = humanoid.HipHeight + rootPart.Size.Y * 0.5 + (leg and leg.Size.Y or 0)
  local groundHit = workspace:Raycast(rootPart.Position + Vector3.new(0, 4, 0), Vector3.new(0, -512, 0), params)
  if not groundHit or groundHit.Normal.Y < 0.55 then
    groundHit = workspace:Raycast(nativeFoundationSpawn.Position + Vector3.new(0, 64, 0), Vector3.new(0, -576, 0), params)
  end
  if not groundHit or groundHit.Normal.Y < 0.55 then
    character:SetAttribute("FoundationFailure", "SPAWN_GROUND_MISSING")
    return
  end
  -- The existing spawn rests on verified world geometry; it cannot be its own ground proof.
  local spawnHit = workspace:Raycast(nativeFoundationSpawn.Position + Vector3.new(0, 64, 0), Vector3.new(0, -576, 0), params)
  if spawnHit and spawnHit.Normal.Y >= 0.55 then
    nativeFoundationSpawn.Position = Vector3.new(nativeFoundationSpawn.Position.X, spawnHit.Position.Y - nativeFoundationSpawn.Size.Y * 0.5 + 0.05, nativeFoundationSpawn.Position.Z)
  end
  local target = groundHit.Position + Vector3.new(0, clearance + 0.1, 0)
  character:PivotTo(character:GetPivot() + (target - rootPart.Position))
  rootPart.AssemblyLinearVelocity = Vector3.zero
  rootPart.AssemblyAngularVelocity = Vector3.zero
  local movementOrigin = rootPart.Position
  humanoid.Running:Connect(function(speed)
    if not rootPart.Parent or humanoid.FloorMaterial == Enum.Material.Air then return end
    local displacement = (rootPart.Position - movementOrigin) * Vector3.new(1, 0, 1)
    if speed > 0.1 and displacement.Magnitude > 0.5 then character:SetAttribute("MOVEMENT_CONFIRMED", true) end
  end)
  local deadline = os.clock() + 5
  repeat
    if not character.Parent or not rootPart.Parent then return end
    local contact = workspace:Raycast(rootPart.Position, Vector3.new(0, -(clearance + 0.75), 0), params)
    if contact and contact.Normal.Y >= 0.55 and humanoid.FloorMaterial ~= Enum.Material.Air and math.abs(rootPart.AssemblyLinearVelocity.Y) < 3 then
      character:SetAttribute("GROUND_CONTACT", true)
      character:SetAttribute("FoundationFailure", nil)
      character:SetAttribute("NativeFoundationGroundingVersion", 2)
      return
    end
    task.wait(0.1)
  until os.clock() >= deadline
  character:SetAttribute("FoundationFailure", "GROUND_CONTACT_FAILURE")
end
local function bindNativeFoundationPlayer(player)
  if player.Character then task.defer(bindNativeFoundationCharacter, player.Character) end
  player.CharacterAdded:Connect(bindNativeFoundationCharacter)
end
Players.PlayerAdded:Connect(bindNativeFoundationPlayer)
for _, nativeFoundationPlayer in ipairs(Players:GetPlayers()) do
  task.defer(bindNativeFoundationPlayer, nativeFoundationPlayer)
end
nativeFoundationRemote.OnServerEvent:Connect(function(player, signal)
  if typeof(signal) ~= "string" then return end
  player:SetAttribute("NativeFoundationReadyAt", os.time())
end)
game:BindToClose(function()
  for _, player in ipairs(Players:GetPlayers()) do
    savePlayer(player)
  end
end)
