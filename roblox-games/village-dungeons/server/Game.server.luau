-- 파일명: roblox-games/village-dungeons/server/Game.server.luau

-- 임포트
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local DataStoreService = game:GetService("DataStoreService")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Config = require(Shared:WaitForChild("GameConfig"))

-- 저장
local store
pcall(function()
  store = DataStoreService:GetDataStore("village-dungeons-development-v1")
end)

local EXTRA_SAVE_KEYS = {
  "BlacksmithLevel",
  "TavernLevel",
  "AlchemyLevel",
  "EquipmentPower",
}

local dataLoaded = {}
local lastAction = {}
local sessions = {}

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

-- 플레이어 상태
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
  player:SetAttribute("DungeonActive", false)
  player:SetAttribute("DungeonState", "VILLAGE")
  player:SetAttribute("QuestState", "READY")
  player:SetAttribute("CurrentDungeon", 0)
  player:SetAttribute("DungeonDepth", 0)
  player:SetAttribute("BagSummary", "")
  player:SetAttribute("EquippedWeapon", player:GetAttribute("EquippedWeapon") or "STARTER")
  player:SetAttribute("ObjectiveHint", "ACCEPT_VILLAGE_QUEST")
  player:SetAttribute("RetryAttackBonusPct", 0)
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
  local ok = pcall(function()
    store:UpdateAsync("player:" .. player.UserId, function(previous)
      if previous ~= nil and typeof(previous) ~= "table" then
        error("INVALID_SAVED_RECORD")
      end
      local merged = typeof(previous) == "table" and table.clone(previous) or {}
      for key, value in pairs(snapshot) do
        merged[key] = value
      end
      return merged
    end)
  end)
  player:SetAttribute("SaveStatus", ok and "SAVED" or "SAVE_FAILED")
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
      Level = readNumber(participant, "Level", 1),
      Health = readNumber(participant, "Health", 100),
      CurrentDungeon = readNumber(participant, "CurrentDungeon", 0),
      DungeonDepth = readNumber(participant, "DungeonDepth", 0),
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
local function makeWorldPart(parent, name, size, position, color, material)
  local part = parent:FindFirstChild(name)
  if part and not part:IsA("BasePart") then
    part:Destroy()
    part = nil
  end
  if not part then
    part = Instance.new("Part")
    part.Name = name
    part.Parent = parent
  end
  part.Size = size
  part.Position = position
  part.Anchored = true
  part.CanCollide = true
  part.Material = material
  part.Color = color
  return part
end

local DUNGEON_ELEMENTS = {"FIRE", "ICE", "POISON", "DARK", "LIGHTNING"}

local function buildWorld()
  local world = workspace:FindFirstChild("VillageDungeonWorld")
  if world and not world:IsA("Model") then
    world:Destroy()
    world = nil
  end
  if not world then
    world = Instance.new("Model")
    world.Name = "VillageDungeonWorld"
    world.Parent = workspace
  end

  local village = makeWorldPart(
    world,
    "VillageSquare",
    Vector3.new(86, 2, 70),
    Vector3.new(0, 0, 0),
    Color3.fromRGB(116, 122, 104),
    Enum.Material.Cobblestone
  )
  local questBoard = makeWorldPart(
    world,
    "VillageQuestBoard",
    Vector3.new(8, 7, 2),
    Vector3.new(0, 3.5, -22),
    Color3.fromRGB(111, 78, 49),
    Enum.Material.WoodPlanks
  )
  local portal = makeWorldPart(
    world,
    "VillageReturnPortal",
    Vector3.new(10, 1, 10),
    Vector3.new(0, 0.5, 24),
    Color3.fromRGB(105, 127, 183),
    Enum.Material.Neon
  )

  local facilities = {
    Blacksmith = makeWorldPart(world, "BlacksmithFacility", Vector3.new(14, 8, 12), Vector3.new(-24, 4, 15), Color3.fromRGB(91, 83, 75), Enum.Material.Brick),
    Tavern = makeWorldPart(world, "TavernFacility", Vector3.new(14, 8, 12), Vector3.new(24, 4, 15), Color3.fromRGB(122, 91, 61), Enum.Material.WoodPlanks),
    Alchemy = makeWorldPart(world, "AlchemyFacility", Vector3.new(14, 8, 12), Vector3.new(24, 4, -12), Color3.fromRGB(79, 103, 90), Enum.Material.Brick),
  }

  local dungeons = {}
  for index, element in ipairs(DUNGEON_ELEMENTS) do
    local x = (index - 3) * 28
    local arena = makeWorldPart(
      world,
      "DungeonRoom" .. index,
      Vector3.new(24, 1, 32),
      Vector3.new(x, -0.5, 78),
      Color3.fromRGB(70 + index * 8, 66 + index * 4, 76 + index * 6),
      Enum.Material.Slate
    )
    arena:SetAttribute("DungeonIndex", index)
    arena:SetAttribute("Element", element)
    arena:SetAttribute("Objective", "DEFEAT_DUNGEON_ENEMIES")

    local gate = makeWorldPart(
      world,
      "DungeonGate" .. index,
      Vector3.new(8, 10, 2),
      Vector3.new(x, 5, 57),
      Color3.fromRGB(91 + index * 10, 88, 119),
      Enum.Material.Metal
    )
    gate:SetAttribute("DungeonIndex", index)
    gate:SetAttribute("Element", element)

    local exitPortal = makeWorldPart(
      world,
      "DungeonPortal" .. index,
      Vector3.new(8, 1, 8),
      Vector3.new(x, 0.5, 91),
      Color3.fromRGB(93, 111 + index * 5, 177),
      Enum.Material.Neon
    )
    exitPortal:SetAttribute("DungeonIndex", index)
    dungeons[index] = {arena = arena, gate = gate, portal = exitPortal, element = element}
  end

  world:SetAttribute("Landmark", "VILLAGE_AND_FIVE_DUNGEONS")
  world:SetAttribute("Objective", "QUEST_DUNGEON_REBUILD")
  world:SetAttribute("WorldReady", true)
  village:SetAttribute("Zone", "VILLAGE")
  questBoard:SetAttribute("QuestSource", true)
  portal:SetAttribute("ReturnPortal", true)
  for name, facility in pairs(facilities) do
    facility:SetAttribute("FacilityType", name)
  end

  return {
    model = world,
    village = village,
    questBoard = questBoard,
    portal = portal,
    facilities = facilities,
    dungeons = dungeons,
  }
end

local worldState = buildWorld()

-- 세션 / 인벤토리
local BAG_CAPACITY = 5

local function getSession(player)
  local session = sessions[player]
  if session then return session end
  session = {
    active = false,
    dungeonIndex = 0,
    depth = 0,
    enemies = {},
    inventory = {},
    inventoryOrder = {},
    bossSpawned = false,
    bossDeadline = 0,
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

local function updateBagSummary(player)
  local session = getSession(player)
  local rows = {}
  for _, itemId in ipairs(session.inventoryOrder) do
    local amount = session.inventory[itemId] or 0
    if amount > 0 then
      table.insert(rows, itemId .. ":" .. tostring(amount))
    end
  end
  player:SetAttribute("BagSummary", table.concat(rows, ","))
  player:SetAttribute("BagSlotsUsed", #rows)
  player:SetAttribute("BagCapacity", BAG_CAPACITY)
end

local function addItemToInventory(player, itemId, amount)
  local session = getSession(player)
  if session.inventory[itemId] == nil and #session.inventoryOrder >= BAG_CAPACITY then
    player:SetAttribute("ObjectiveHint", "BAG_FULL_CHOOSE_RETURN")
    return false
  end
  if session.inventory[itemId] == nil then
    session.inventory[itemId] = 0
    table.insert(session.inventoryOrder, itemId)
  end
  session.inventory[itemId] += math.max(1, math.floor(amount or 1))
  updateBagSummary(player)
  return true
end

local function removeInventoryItem(player, itemId, amount)
  local session = getSession(player)
  local owned = session.inventory[itemId] or 0
  local take = math.min(owned, math.max(1, math.floor(amount or 1)))
  if take <= 0 then return false end
  session.inventory[itemId] = owned - take
  if session.inventory[itemId] <= 0 then
    session.inventory[itemId] = nil
    local at = table.find(session.inventoryOrder, itemId)
    if at then table.remove(session.inventoryOrder, at) end
  end
  updateBagSummary(player)
  return true
end

local function preserveHalfDungeonInventory(player)
  local session = getSession(player)
  local nextOrder = {}
  for _, itemId in ipairs(session.inventoryOrder) do
    local kept = math.floor((session.inventory[itemId] or 0) * 0.5)
    if kept > 0 then
      session.inventory[itemId] = kept
      table.insert(nextOrder, itemId)
    else
      session.inventory[itemId] = nil
    end
  end
  session.inventoryOrder = nextOrder
  updateBagSummary(player)
end

local function clearEnemies(session)
  for enemy in pairs(session.enemies) do
    if enemy and enemy.Parent then enemy:Destroy() end
  end
  table.clear(session.enemies)
end

-- 장비 / 제작 / 시설
local function equipWeapon(player, weaponId, power)
  player:SetAttribute("EquippedWeapon", weaponId)
  setNumber(player, "EquipmentPower", math.max(readNumber(player, "EquipmentPower", 0), power or 0))
  player:SetAttribute("ObjectiveHint", "EQUIPMENT_READY")
end

local function craftWeapon(player)
  local session = getSession(player)
  local material = session.inventory["SPECIAL_INGOT"] and "SPECIAL_INGOT"
    or (session.inventory["ORE"] and "ORE" or nil)
  if not material then
    player:SetAttribute("ObjectiveHint", "NEED_DUNGEON_MATERIAL")
    return false
  end
  removeInventoryItem(player, material, 1)
  local power = math.max(1, readNumber(player, "BlacksmithLevel", 0) + 1)
  equipWeapon(player, "FORGED_DUNGEON_WEAPON", power)
  player:SetAttribute("CraftedWeapon", "FORGED_DUNGEON_WEAPON")
  return true
end

local function consumeFacilityMaterial(player)
  local session = getSession(player)
  for _, itemId in ipairs(session.inventoryOrder) do
    if (session.inventory[itemId] or 0) > 0 then
      removeInventoryItem(player, itemId, 1)
      return true
    end
  end
  return false
end

local function upgradeFacility(player, facilityName)
  if not consumeFacilityMaterial(player) then
    player:SetAttribute("ObjectiveHint", "NEED_RETURNED_RESOURCE")
    return false
  end
  local key = facilityName .. "Level"
  setNumber(player, key, readNumber(player, key, 0) + 1)
  player:SetAttribute("LastFacilityUpgrade", facilityName)
  player:SetAttribute("ObjectiveHint", "FACILITY_UPGRADED_" .. string.upper(facilityName))
  return true
end

-- 퀘스트
local function startQuest(player)
  local wave = math.max(1, readNumber(player, "Wave", 1))
  player:SetAttribute("QuestState", "ACTIVE")
  player:SetAttribute("QuestType", wave % 2 == 0 and "RESOURCE" or "MONSTER")
  player:SetAttribute("QuestTargetDungeon", ((wave - 1) % #DUNGEON_ELEMENTS) + 1)
  setNumber(player, "Objective", wave)
  player:SetAttribute("ObjectiveHint", "CHECK_EQUIPMENT_AND_ENTER_DUNGEON")
end

local function completeQuest(player)
  if player:GetAttribute("QuestState") ~= "ACTIVE" then return false end
  player:SetAttribute("QuestState", "COMPLETE")
  setNumber(player, "Coins", readNumber(player, "Coins", 0) + 1)
  setNumber(player, "Progress", readNumber(player, "Progress", 0) + 1)
  return true
end

-- 던전 전투
local function currentEnemy(player)
  local session = getSession(player)
  for enemy in pairs(session.enemies) do
    if enemy and enemy.Parent then return enemy end
  end
  return nil
end

local finishDungeon

local function failDungeon(player, reason)
  local session = getSession(player)
  clearEnemies(session)
  session.active = false
  session.bossSpawned = false
  preserveHalfDungeonInventory(player)
  setNumber(player, "Health", 100)
  setNumber(player, "EnemyHealth", 0)
  player:SetAttribute("SessionActive", false)
  player:SetAttribute("DungeonActive", false)
  player:SetAttribute("DungeonState", "VILLAGE_INFIRMARY")
  player:SetAttribute("DungeonEndReason", reason or "DEFEATED")
  player:SetAttribute("RetryAttackBonusPct", 10)
  player:SetAttribute("ObjectiveHint", "RETRY_BUFF_READY")
  broadcastMultiplayerSync(player)
end

local function damageMonster(player, enemy, amount)
  local session = getSession(player)
  if not enemy or not session.enemies[enemy] or not enemy.Parent then return false end
  local health = tonumber(enemy:GetAttribute("Health")) or 0
  if health <= 0 then return false end

  local nextHealth = math.max(0, health - math.max(1, math.floor(amount)))
  enemy:SetAttribute("Health", nextHealth)
  enemy:SetAttribute("HitReactionAt", os.clock())
  enemy:SetAttribute("RecoveryState", nextHealth > 0 and "RECOVERING" or "DEFEATED")
  setNumber(player, "EnemyHealth", nextHealth)
  -- VFX · 이미 서버에서 확정한 피해만 기존 RemoteEvent로 클라이언트에 전달한다.
  -- 게임 로직, 명중 범위, 저장, 재화, 멀티플레이 권한은 변경하지 않는다.
  if player.Parent and enemy.PrimaryPart then
    remote:FireClient(player, "COMBAT_PRESENTATION", {
      Kind = nextHealth > 0 and "ENEMY_HIT" or "ENEMY_DEATH",
      Position = enemy.PrimaryPart.Position,
    })
  end

  if nextHealth <= 0 then
    local isBoss = enemy:GetAttribute("Boss") == true
    session.enemies[enemy] = nil
    addItemToInventory(player, isBoss and "SOUL_STONE" or "ORE", 1)
    setNumber(player, "Coins", readNumber(player, "Coins", 0) + 1)
    setNumber(player, "Score", readNumber(player, "Score", 0) + 10)
    enemy:Destroy()

    local nextEnemy = currentEnemy(player)
    if nextEnemy then
      setNumber(player, "EnemyHealth", tonumber(nextEnemy:GetAttribute("Health")) or 0)
    elseif session.active and finishDungeon then
      finishDungeon(player, isBoss and "BOSS_CLEARED" or "ROOM_CLEARED")
    end
    broadcastMultiplayerSync(player)
    return true
  end
  return false
end

local function runEnemyAI(player, enemy)
  enemy:SetAttribute("AggroState", "CHASE")
  enemy:SetAttribute("Target", "PLAYER_DUNGEON_RUN")
  task.spawn(function()
    while player.Parent and enemy.Parent do
      local session = sessions[player]
      if not session or not session.active then break end

      enemy:SetAttribute("AttackState", "ATTACK_WINDUP")
      enemy:SetAttribute("AttackAnticipation", os.clock())
      task.wait(1.2)
      if not enemy.Parent or not sessions[player] or not sessions[player].active then break end

      local dodgeUntil = tonumber(player:GetAttribute("DodgeWindowUntil")) or 0
      if os.clock() <= dodgeUntil then
        enemy:SetAttribute("AttackState", "DODGED")
        player:SetAttribute("LastDodgeAt", os.clock())
        -- 회피 연출은 기존 서버 회피 판정이 성공한 경우에만 출력한다.
        local character = player.Character
        local rootPart = character and character:FindFirstChild("HumanoidRootPart")
        if player.Parent and rootPart then
          remote:FireClient(player, "COMBAT_PRESENTATION", {Kind = "DODGE", Position = rootPart.Position})
        end
      else
        local damage = tonumber(enemy:GetAttribute("Damage")) or 8
        local previousHealth = readNumber(player, "Health", 100)
        local health = math.max(0, previousHealth - damage)
        setNumber(player, "Health", health)
        enemy:SetAttribute("AttackState", "HIT")
        if health < previousHealth then
          local character = player.Character
          local rootPart = character and character:FindFirstChild("HumanoidRootPart")
          if player.Parent and rootPart then
            remote:FireClient(player, "COMBAT_PRESENTATION", {
              Kind = health > 0 and "PLAYER_HIT" or "PLAYER_DEATH",
              Position = rootPart.Position,
            })
          end
        end
        if health <= 0 then
          failDungeon(player, "PLAYER_DEFEATED")
          break
        end
      end
      task.wait(0.4)
    end
  end)
end

local function spawnMonster(player, monsterKind, index)
  local session = getSession(player)
  local dungeon = worldState.dungeons[session.dungeonIndex]
  if not dungeon then return nil end

  local enemy = Instance.new("Model")
  enemy.Name = monsterKind .. "_" .. tostring(player.UserId) .. "_" .. tostring(index)
  enemy.Parent = worldState.model

  local body = Instance.new("Part")
  body.Name = "Body"
  body.Shape = Enum.PartType.Ball
  body.Anchored = true
  body.CanCollide = false
  body.Material = Enum.Material.SmoothPlastic
  body.Size = monsterKind == "BOSS" and Vector3.new(7, 7, 7) or Vector3.new(4, 4, 4)
  body.Position = dungeon.arena.Position + Vector3.new((index - 2) * 5, body.Size.Y / 2 + 1, 4)
  body.Color = monsterKind == "BOSS" and Color3.fromRGB(104, 46, 119) or Color3.fromRGB(124, 71, 66)
  body.Parent = enemy
  enemy.PrimaryPart = body

  local baseHealth = monsterKind == "BOSS" and 180 or 70
  local health = baseHealth + session.dungeonIndex * 10 + session.depth * 10
  enemy:SetAttribute("Health", health)
  enemy:SetAttribute("MaxHealth", health)
  enemy:SetAttribute("Damage", monsterKind == "BOSS" and 14 or 8)
  enemy:SetAttribute("DungeonIndex", session.dungeonIndex)
  enemy:SetAttribute("Element", dungeon.element)
  enemy:SetAttribute("OwnerUserId", player.UserId)
  if monsterKind == "BOSS" then
    enemy:SetAttribute("Boss", true)
    enemy:SetAttribute("Telegraph", "BOSS_HEAVY_ATTACK")
  end

  session.enemies[enemy] = true
  if readNumber(player, "EnemyHealth", 0) <= 0 then setNumber(player, "EnemyHealth", health) end
  runEnemyAI(player, enemy)
  return enemy
end

local function spawnBoss(player)
  local session = getSession(player)
  if session.bossSpawned then return nil end
  session.bossSpawned = true
  session.bossDeadline = os.time() + 300
  player:SetAttribute("BossDeadline", session.bossDeadline)
  player:SetAttribute("DungeonState", "BOSS")
  local boss = spawnMonster(player, "BOSS", 2)
  task.delay(300, function()
    if player.Parent and session.active and boss and boss.Parent then
      failDungeon(player, "BOSS_TIMEOUT")
    end
  end)
  return boss
end

local function dodgeAttack(player)
  if not getSession(player).active then return false end
  player:SetAttribute("DodgeWindowUntil", os.clock() + 0.8)
  player:SetAttribute("ObjectiveHint", "DODGE_WINDOW_ACTIVE")
  return true
end

local function attackMonster(player)
  local session = getSession(player)
  if not session.active then
    player:SetAttribute("ObjectiveHint", "ENTER_DUNGEON_FIRST")
    return false
  end
  local enemy = currentEnemy(player)
  if not enemy then
    player:SetAttribute("ObjectiveHint", "ROOM_CLEAR")
    return false
  end

  local level = math.max(1, readNumber(player, "Level", 1))
  local equipmentPower = math.max(0, readNumber(player, "EquipmentPower", 0))
  local retryPct = math.max(0, readNumber(player, "RetryAttackBonusPct", 0))
  local baseDamage = 10 + level + equipmentPower
  local damage = math.floor(baseDamage * (1 + retryPct / 100))
  if retryPct > 0 then setNumber(player, "RetryAttackBonusPct", 0) end

  damageMonster(player, enemy, damage)
  setNumber(player, "Combo", readNumber(player, "Combo", 0) + 1)
  return true
end

local function startDungeon(player, dungeonIndex)
  local session = getSession(player)
  if session.active then return false end

  local index = math.clamp(math.floor(dungeonIndex or 1), 1, #DUNGEON_ELEMENTS)
  session.active = true
  session.dungeonIndex = index
  session.depth = math.max(1, session.depth + 1)
  session.bossSpawned = false
  clearEnemies(session)

  player:SetAttribute("SessionActive", true)
  player:SetAttribute("DungeonActive", true)
  player:SetAttribute("DungeonState", "COMBAT")
  player:SetAttribute("SessionStartedAt", os.time())
  setNumber(player, "CurrentDungeon", index)
  setNumber(player, "DungeonDepth", session.depth)
  setNumber(player, "Health", math.max(1, readNumber(player, "Health", 100)))
  player:SetAttribute("DungeonElement", DUNGEON_ELEMENTS[index])
  player:SetAttribute("ObjectiveHint", "DODGE_AND_ATTACK")

  for enemyIndex = 1, 3 do
    spawnMonster(player, "MONSTER", enemyIndex)
  end
  broadcastMultiplayerSync(player)
  return true
end

finishDungeon = function(player, reason)
  local session = getSession(player)
  if not session.active then return end
  clearEnemies(session)
  session.active = false
  player:SetAttribute("SessionActive", false)
  player:SetAttribute("DungeonActive", false)
  player:SetAttribute("DungeonState", "PORTAL_READY")
  player:SetAttribute("DungeonEndReason", reason or "CLEARED")
  setNumber(player, "Wave", readNumber(player, "Wave", 1) + 1)
  setNumber(player, "EnemyHealth", 0)
  player:SetAttribute("ObjectiveHint", "RETURN_TO_VILLAGE")
  broadcastMultiplayerSync(player)
end

-- 액션
local function performCombatAction(player)
  if not getSession(player).active then
    startDungeon(player, tonumber(player:GetAttribute("QuestTargetDungeon")) or 1)
  end
  dodgeAttack(player)
  attackMonster(player)
  recordAction(player, "scope-corefun-029d85a01a", "idle-reward", 9, 5)
end

local function acceptVillageQuest(player)
  startQuest(player)
  player:SetAttribute("EquipmentChecked", true)
  recordAction(player, "scope-coreloop-0-ba1530d55b", "offline-progress", 5, 6)
end

local function enterSelectedDungeon(player)
  if player:GetAttribute("QuestState") ~= "ACTIVE" then startQuest(player) end
  local dungeonIndex = tonumber(player:GetAttribute("QuestTargetDungeon")) or 1
  startDungeon(player, dungeonIndex)
  recordAction(player, "scope-coreloop-1-14e5fec9e4", "upgrade-layer", 11, 7)
end

local function manageDungeonBag(player)
  local session = getSession(player)
  player:SetAttribute("BagSlotsUsed", #session.inventoryOrder)
  player:SetAttribute("ObjectiveHint", #session.inventoryOrder >= BAG_CAPACITY and "RETURN_OR_REPLACE_LOOT" or "BAG_HAS_SPACE")
  recordAction(player, "scope-coreloop-2-21cda65cb7", "claim-idempotency", 9, 11)
end

local function returnToVillageAndUpgrade(player)
  local session = getSession(player)
  if session.active then
    finishDungeon(player, "MANUAL_RETURN")
  end
  player:SetAttribute("DungeonState", "VILLAGE")
  setNumber(player, "CurrentDungeon", 0)
  completeQuest(player)

  local upgraded = upgradeFacility(player, "Blacksmith")
  if upgraded then
    craftWeapon(player)
  else
    upgradeFacility(player, "Tavern")
  end
  player:SetAttribute("ObjectiveHint", "PREPARE_NEXT_DUNGEON")
  recordAction(player, "scope-coreloop-3-efa14099cd", "persistent-growth", 8, 9)
  broadcastMultiplayerSync(player)
end

local function challengeDeeperDungeon(player)
  local session = getSession(player)
  if not session.active then
    local dungeonIndex = tonumber(player:GetAttribute("QuestTargetDungeon")) or 1
    startDungeon(player, dungeonIndex)
  end
  session.depth = math.max(3, session.depth)
  setNumber(player, "DungeonDepth", session.depth)
  clearEnemies(session)
  spawnBoss(player)
  player:SetAttribute("ObjectiveHint", "DEFEAT_BOSS_BEFORE_COLLAPSE")
  recordAction(player, "scope-coreloop-4-d2fe2a4ec6", "commercial-idle-runtime-architecture", 9, 10)
end

local function reviewDungeonState(player)
  local session = getSession(player)
  player:SetAttribute("VisibleEnemyCount", countLive(session.enemies))
  player:SetAttribute("ObjectiveHint", session.active and "WATCH_HP_BAG_BOSS_TIMER" or "CHECK_VILLAGE_AND_QUEST")
  recordAction(player, "scope-mobileux-a3fe13f59a", "board-state", 0, 0)
  broadcastMultiplayerSync(player)
end

local handlers = {
  ["scope-corefun-029d85a01a"] = performCombatAction,
  ["scope-coreloop-0-ba1530d55b"] = acceptVillageQuest,
  ["scope-coreloop-1-14e5fec9e4"] = enterSelectedDungeon,
  ["scope-coreloop-2-21cda65cb7"] = manageDungeonBag,
  ["scope-coreloop-3-efa14099cd"] = returnToVillageAndUpgrade,
  ["scope-coreloop-4-d2fe2a4ec6"] = challengeDeeperDungeon,
  ["scope-mobileux-a3fe13f59a"] = reviewDungeonState,
}

-- 플레이어 생명주기
local function loadPlayer(player)
  initializePlayer(player)
  dataLoaded[player] = nil
  player:SetAttribute("SaveStatus", "LOADING")

  if not store then
    dataLoaded[player] = true
    player:SetAttribute("SaveStatus", "UNAVAILABLE")
    getSession(player)
    task.defer(function() broadcastMultiplayerSync(player) end)
    return
  end

  local ok, saved = pcall(function()
    return store:GetAsync("player:" .. player.UserId)
  end)
  if not ok or (saved ~= nil and typeof(saved) ~= "table") then
    player:SetAttribute("SaveStatus", "LOAD_FAILED")
    return
  end
  if not player.Parent then return end

  if typeof(saved) == "table" then
    for key, fallback in pairs(Config.InitialState) do
      local value = saved[key]
      player:SetAttribute(key, typeof(value) == "number" and value or fallback)
    end
    for _, key in ipairs(EXTRA_SAVE_KEYS) do
      local value = saved[key]
      player:SetAttribute(key, typeof(value) == "number" and value or 0)
    end
  end

  initializeTransientState(player)
  dataLoaded[player] = true
  player:SetAttribute("SaveStatus", "READY")
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
  if session then clearEnemies(session) end
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
-- A packaged place has no Studio baseplate. Build solid ground before exposing its spawn.
local villageGround = workspace:FindFirstChild("VillageGround")
if villageGround and not villageGround:IsA("BasePart") then villageGround:Destroy(); villageGround = nil end
if not villageGround then
  villageGround = Instance.new("Part")
  villageGround.Name = "VillageGround"
  villageGround.Parent = workspace
end
villageGround.Size = Vector3.new(240, 2, 240)
villageGround.Position = Vector3.new(0, 1, 0)
villageGround.Anchored = true
villageGround.CanCollide = true
villageGround.CanQuery = true
villageGround.Material = Enum.Material.Cobblestone
villageGround.Color = Color3.fromRGB(119, 126, 109)
villageGround.TopSurface = Enum.SurfaceType.Smooth
for _, child in ipairs(villageGround:GetChildren()) do
  if child.Name:match("^VillageBoundary") or child.Name == "VillageQuestBoard" then child:Destroy() end
end
for index, edge in ipairs({
  {Vector3.new(240, 10, 2), Vector3.new(0, 7, -119)},
  {Vector3.new(240, 10, 2), Vector3.new(0, 7, 119)},
  {Vector3.new(2, 10, 236), Vector3.new(-119, 7, 0)},
  {Vector3.new(2, 10, 236), Vector3.new(119, 7, 0)},
}) do
  local wall = Instance.new("Part")
  wall.Name = "VillageBoundary" .. index
  wall.Size = edge[1]
  wall.Position = edge[2]
  wall.Anchored = true
  wall.CanCollide = true
  wall.CanQuery = true
  wall.Material = Enum.Material.Brick
  wall.Color = Color3.fromRGB(105, 112, 97)
  wall.Parent = villageGround
end
local questBoard = Instance.new("Part")
questBoard.Name = "VillageQuestBoard"
questBoard.Size = Vector3.new(10, 6, 1)
questBoard.Position = Vector3.new(0, 5, -34)
questBoard.Anchored = true
questBoard.CanCollide = true
questBoard.CanQuery = true
questBoard.Material = Enum.Material.WoodPlanks
questBoard.Color = Color3.fromRGB(113, 82, 54)
questBoard.Parent = villageGround
local questPrompt = Instance.new("ProximityPrompt")
questPrompt.Name = "QuestBoardPrompt"
questPrompt.ObjectText = "마을 의뢰 게시판"
questPrompt.ActionText = "퀘스트 확인"
questPrompt.HoldDuration = 0.15
questPrompt.MaxActivationDistance = 10
questPrompt.RequiresLineOfSight = false
questPrompt.Parent = questBoard
questPrompt.Triggered:Connect(function(player)
  if player and player.Parent then acceptVillageQuest(player) end
end)
if not nativeFoundationSpawn then
  nativeFoundationSpawn = Instance.new("SpawnLocation")
  nativeFoundationSpawn.Name = "NativeFoundationSpawn"
  nativeFoundationSpawn.Size = Vector3.new(8, 1, 8)
  nativeFoundationSpawn.Position = Vector3.new(0, 3, 0)
  nativeFoundationSpawn.Anchored = true
  nativeFoundationSpawn.CanCollide = false
  nativeFoundationSpawn.CanTouch = false
  nativeFoundationSpawn.CanQuery = false
  nativeFoundationSpawn.Neutral = true
  nativeFoundationSpawn.Parent = workspace
end
local function bindNativeFoundationCharacter(character)
  local humanoid = character:WaitForChild("Humanoid")
  local rootPart = character:WaitForChild("HumanoidRootPart")
  rootPart.Anchored = false
  humanoid.PlatformStand = false
  local params = RaycastParams.new()
  params.FilterType = Enum.RaycastFilterType.Exclude
  params.FilterDescendantsInstances = {character}
  character:SetAttribute("GROUND_CONTACT", false)
  character:SetAttribute("MOVEMENT_CONFIRMED", false)
  local origin = rootPart.Position
  task.spawn(function()
    for attempt = 1, 30 do
      if not character.Parent or humanoid.Health <= 0 then break end
      local groundHit = workspace:Raycast(rootPart.Position, Vector3.new(0, -10, 0), params)
      local groundContact = groundHit ~= nil and groundHit.Instance ~= nil and humanoid.FloorMaterial ~= Enum.Material.Air
      if groundContact then
        character:SetAttribute("GROUND_CONTACT", groundContact)
        break
      end
      task.wait(0.1)
    end
  end)
  task.spawn(function()
    while character.Parent and humanoid.Health > 0 do
      local delta = rootPart.Position - origin
      if Vector3.new(delta.X, 0, delta.Z).Magnitude > 1 and humanoid.FloorMaterial ~= Enum.Material.Air then
        character:SetAttribute("MOVEMENT_CONFIRMED", true)
        break
      end
      task.wait(0.25)
    end
  end)
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
