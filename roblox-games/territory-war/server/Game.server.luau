local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local DataStoreService = game:GetService("DataStoreService")
local RunService = game:GetService("RunService")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Config = require(Shared:WaitForChild("GameConfig"))
local store = DataStoreService:GetDataStore("territory-war-development-v1")

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

local foundationStore = DataStoreService:GetDataStore("native-foundation-sentinel-v1")
local foundationRemote = ReplicatedStorage:FindFirstChild("RuntimeFoundationReport") or Instance.new("RemoteEvent")
foundationRemote.Name = "RuntimeFoundationReport"
foundationRemote.Parent = ReplicatedStorage

local foundationSeen = {}
local foundationSequence = 0
local foundationLast = {}
local movementProbeStart = {}
local foundationSpawn

local function loadFoundationState()
  local ok, old = pcall(function() return foundationStore:GetAsync("latest") end)
  if not ok or typeof(old) ~= "table" then return end
  if tostring(old.gameId or "") ~= tostring(Config.GameId) or tonumber(old.placeId) ~= game.PlaceId or tonumber(old.placeVersion) ~= game.PlaceVersion then return end
  local checkpoints = typeof(old.checkpoints) == "table" and old.checkpoints or {}
  for name, row in pairs(checkpoints) do
    foundationSeen[name] = true
    foundationSequence = math.max(foundationSequence, math.floor(tonumber(row.sequence) or 0))
  end
  foundationSequence = math.max(foundationSequence, math.floor(tonumber(old.sequence) or 0))
end

local function foundationCheckpoint(name, player, extra)
  if foundationSeen[name] then return true end
  local payload = {
    name = name,
    at = os.time(),
    userId = player and player.UserId or 0,
    gameId = Config.GameId,
    placeId = tostring(game.PlaceId),
    placeVersion = game.PlaceVersion,
  }
  if typeof(extra) == "table" then
    for key, value in pairs(extra) do
      if typeof(value) == "number" or typeof(value) == "string" or typeof(value) == "boolean" then payload[key] = value end
    end
  end
  local committedSequence = foundationSequence
  for attempt = 1, 4 do
    local ok = pcall(function()
      foundationStore:UpdateAsync("latest", function(old)
        local exact = typeof(old) == "table" and tonumber(old.placeVersion) == game.PlaceVersion and tonumber(old.placeId) == game.PlaceId and tostring(old.gameId or "") == tostring(Config.GameId)
        local data = exact and old or {version = 3, gameId = Config.GameId, placeId = tostring(game.PlaceId), placeVersion = game.PlaceVersion, checkpoints = {}, sequence = 0}
        data.version = 3
        data.gameId = Config.GameId
        data.placeId = tostring(game.PlaceId)
        data.placeVersion = game.PlaceVersion
        data.updatedAt = os.time()
        data.requirements = {saveEnabled = Config.SaveEnabled == true, multiplayerRequired = Config.MultiplayerRequired == true}
        data.checkpoints = typeof(data.checkpoints) == "table" and data.checkpoints or {}
        if typeof(data.checkpoints[name]) == "table" then
          committedSequence = math.floor(tonumber(data.checkpoints[name].sequence) or foundationSequence)
          return data
        end
        committedSequence = math.max(foundationSequence, math.floor(tonumber(data.sequence) or 0)) + 1
        local row = {}
        for key, value in pairs(payload) do row[key] = value end
        row.sequence = committedSequence
        data.sequence = committedSequence
        data.checkpoints[name] = row
        return data
      end)
    end)
    if ok then
      foundationSeen[name] = true
      foundationSequence = math.max(foundationSequence, committedSequence)
      workspace:SetAttribute("Foundation_" .. name, true)
      return true
    end
    if attempt < 4 then task.wait(0.15 * attempt) end
  end
  if player then player:SetAttribute("FoundationFailure", "CHECKPOINT_WRITE_FAILED:" .. name) end
  return false
end

local function ensureFoundationWorld()
  local folder = workspace:FindFirstChild("TerritoryFoundationWorld")
  if not folder then
    folder = Instance.new("Folder")
    folder.Name = "TerritoryFoundationWorld"
    folder.Parent = workspace
  end
  local ground = folder:FindFirstChild("FoundationGround")
  if not ground then
    ground = Instance.new("Part")
    ground.Name = "FoundationGround"
    ground.Size = Vector3.new(180, 1, 180)
    ground.Position = Vector3.new(0, -0.5, 0)
    ground.Anchored = true
    ground.CanCollide = true
    ground.Material = Enum.Material.Grass
    ground.Color = Color3.fromRGB(73, 102, 72)
    ground.Parent = folder
  end
  local spawn = folder:FindFirstChild("FoundationSpawn")
  if not spawn then
    spawn = Instance.new("SpawnLocation")
    spawn.Name = "FoundationSpawn"
    spawn.Size = Vector3.new(8, 1, 8)
    spawn.Position = Vector3.new(0, 0.5, 0)
    spawn.Anchored = true
    spawn.CanCollide = true
    spawn.Transparency = 1
    spawn.Neutral = true
    spawn.Parent = folder
  end
  foundationSpawn = spawn
  foundationCheckpoint("WORLD_READY", nil, {worldReady = true})
  foundationCheckpoint("SPAWN_READY", nil, {spawnY = spawn.Position.Y})
end

loadFoundationState()
foundationCheckpoint("SERVER_BOOT", nil, {placeVersion = game.PlaceVersion})
foundationCheckpoint("MODULE_GRAPH_READY", nil, {modulesReady = true})
ensureFoundationWorld()

task.spawn(function()
  if Config.SaveEnabled ~= true or foundationSeen.SAVE_ROUNDTRIP then return end
  local probeKey = "__foundation_probe__:" .. tostring(game.PlaceVersion)
  local token = Config.GameId .. ":" .. tostring(game.PlaceVersion) .. ":" .. tostring(os.time())
  local ok, readBack = pcall(function()
    store:SetAsync(probeKey, {token = token, at = os.time()})
    local value = store:GetAsync(probeKey)
    return typeof(value) == "table" and value.token or nil
  end)
  if ok and readBack == token then
    pcall(function() store:RemoveAsync(probeKey) end)
    foundationCheckpoint("SAVE_ROUNDTRIP", nil, {roundtrip = true})
  end
end)

local lastAction = {}
local function number(player, name, fallback)
  local value = player:GetAttribute(name)
  if typeof(value) ~= "number" then return fallback end
  return value
end
local function setNumber(player, name, value)
  if typeof(value) ~= "number" then return end
  player:SetAttribute(name, math.max(0, math.floor(value)))
end

local function opponentFor(player)
  for _, participant in ipairs(Players:GetPlayers()) do
    if participant ~= player then return participant end
  end
  return nil
end

local function stateSnapshot(player)
  return {
    UserId = player.UserId,
    Territories = number(player, "Territories", 1),
    Troops = number(player, "Troops", 12),
    Resources = number(player, "Resources", 20),
    EconomyLevel = number(player, "EconomyLevel", 1),
    RoundScore = number(player, "RoundScore", 0),
  }
end

local function broadcastMultiplayerSync(actor)
  local participants = Players:GetPlayers()
  local states = {}
  for _, participant in ipairs(participants) do
    local opponent = opponentFor(participant)
    participant:SetAttribute("MultiplayerActive", #participants >= Config.MinimumParticipants)
    participant:SetAttribute("OpponentUserId", opponent and opponent.UserId or 0)
    table.insert(states, stateSnapshot(participant))
  end
  remote:FireAllClients("MULTIPLAYER_SYNC", {
    ActorUserId = actor and actor.UserId or 0,
    ParticipantCount = #participants,
    Players = states,
  })
  if #participants >= 2 then foundationCheckpoint("MULTIPLAYER_SYNC", actor, {participantCount = #participants}) end
end

local function initialize(player)
  for key, value in pairs(Config.InitialState) do player:SetAttribute(key, value) end
  player:SetAttribute("LastOrder", "READY")
  player:SetAttribute("RoundScore", 0)
  player:SetAttribute("MultiplayerActive", false)
  player:SetAttribute("OpponentUserId", 0)
end

local function loadPlayer(player)
  local ok, saved = pcall(function()
    return store:GetAsync("campaign:" .. player.UserId)
  end)
  if not ok or typeof(saved) ~= "table" then
    initialize(player)
    return
  end
  for key, fallback in pairs(Config.InitialState) do
    local value = saved[key]
    player:SetAttribute(key, typeof(value) == "number" and value or fallback)
  end
  player:SetAttribute("LastOrder", "RESTORED")
  player:SetAttribute("RoundScore", 0)
  player:SetAttribute("MultiplayerActive", false)
  player:SetAttribute("OpponentUserId", 0)
end

local function savePlayer(player)
  local snapshot = {}
  for key, fallback in pairs(Config.InitialState) do snapshot[key] = number(player, key, fallback) end
  pcall(function()
    store:UpdateAsync("campaign:" .. player.UserId, function()
      return snapshot
    end)
  end)
end

local function advanceTurn(player)
  local turn = number(player, "CampaignTurn", 1) + 1
  local economy = number(player, "EconomyLevel", 1)
  setNumber(player, "CampaignTurn", turn)
  setNumber(player, "Resources", number(player, "Resources", 0) + 3 + economy)
  local opponent = opponentFor(player)
  if opponent then
    local pressure = number(opponent, "Troops", 12) + number(opponent, "EconomyLevel", 1) * 2
    setNumber(player, "EnemyPressure", pressure)
  else
    setNumber(player, "EnemyPressure", math.min(50, number(player, "EnemyPressure", 8) + 2))
  end
end

local function scout(player)
  local pressure = number(player, "EnemyPressure", 8)
  setNumber(player, "Progress", number(player, "Progress", 0) + 1)
  player:SetAttribute("LastOrder", pressure >= 18 and "SCOUT_HIGH_PRESSURE" or "SCOUT_OPENING")
end

local function attack(player)
  local resources = number(player, "Resources", 0)
  local troops = number(player, "Troops", 0)
  if resources < Config.AttackCost or troops < 3 then
    player:SetAttribute("LastOrder", "ATTACK_BLOCKED")
    return
  end
  setNumber(player, "Resources", resources - Config.AttackCost)
  local opponent = opponentFor(player)
  local pressure = opponent and (number(opponent, "Troops", 12) + number(opponent, "EconomyLevel", 1) * 2) or number(player, "EnemyPressure", 8)
  local attackPower = troops + number(player, "EconomyLevel", 1) * 2
  if attackPower >= pressure then
    setNumber(player, "Territories", number(player, "Territories", 1) + 1)
    setNumber(player, "Troops", troops - 2)
    setNumber(player, "Progress", number(player, "Progress", 0) + 8)
    setNumber(player, "RoundScore", number(player, "RoundScore", 0) + 1)
    if opponent then
      setNumber(opponent, "Territories", math.max(0, number(opponent, "Territories", 1) - 1))
      opponent:SetAttribute("LastOrder", "TERRITORY_LOST")
    else
      setNumber(player, "EnemyPressure", math.max(5, pressure - 3))
    end
    player:SetAttribute("LastOrder", "TERRITORY_CAPTURED")
  else
    setNumber(player, "Troops", math.max(1, troops - 4))
    if opponent then
      setNumber(opponent, "RoundScore", number(opponent, "RoundScore", 0) + 1)
      opponent:SetAttribute("LastOrder", "DEFENSE_HELD")
    else
      setNumber(player, "EnemyPressure", pressure + 3)
    end
    player:SetAttribute("LastOrder", "ATTACK_REPELLED")
  end
  advanceTurn(player)
end

local function reinforce(player)
  local resources = number(player, "Resources", 0)
  if resources < Config.ReinforceCost then
    player:SetAttribute("LastOrder", "REINFORCE_BLOCKED")
    return
  end
  setNumber(player, "Resources", resources - Config.ReinforceCost)
  setNumber(player, "Troops", number(player, "Troops", 0) + 5)
  setNumber(player, "EnemyPressure", math.max(0, number(player, "EnemyPressure", 8) - 2))
  setNumber(player, "Progress", number(player, "Progress", 0) + 2)
  player:SetAttribute("LastOrder", "FRONT_REINFORCED")
  advanceTurn(player)
end

local function economy(player)
  local resources = number(player, "Resources", 0)
  if resources < Config.EconomyCost then
    player:SetAttribute("LastOrder", "ECONOMY_BLOCKED")
    return
  end
  setNumber(player, "Resources", resources - Config.EconomyCost)
  setNumber(player, "EconomyLevel", number(player, "EconomyLevel", 1) + 1)
  setNumber(player, "Progress", number(player, "Progress", 0) + 4)
  player:SetAttribute("LastOrder", "ECONOMY_EXPANDED")
  advanceTurn(player)
end

local handlers = {
  [Config.Actions.SCOUT] = scout,
  [Config.Actions.ATTACK] = attack,
  [Config.Actions.REINFORCE] = reinforce,
  [Config.Actions.ECONOMY] = economy,
}

local function validateCharacterFoundation(player, character)
  local humanoid = character:WaitForChild("Humanoid", 10)
  local rootPart = character:WaitForChild("HumanoidRootPart", 10)
  if not humanoid or not rootPart then player:SetAttribute("FoundationFailure", "CHARACTER_FOUNDATION_FAILURE"); return end
  if not foundationSpawn or not foundationSpawn.Parent then player:SetAttribute("FoundationFailure", "SPAWN_FOUNDATION_MISSING"); return end
  humanoid.PlatformStand = false
  humanoid.AutoRotate = true
  rootPart.Anchored = false
  player.RespawnLocation = foundationSpawn
  local pos = rootPart.Position
  foundationCheckpoint("CHARACTER_READY", player, {rootAnchored = rootPart.Anchored, platformStand = humanoid.PlatformStand, rootX = pos.X, rootY = pos.Y, rootZ = pos.Z})
  task.spawn(function()
    local deadline = os.clock() + 3
    local params = RaycastParams.new()
    params.FilterType = Enum.RaycastFilterType.Exclude
    params.FilterDescendantsInstances = {character}
    repeat
      if not character.Parent or not rootPart.Parent then return end
      local hit = workspace:Raycast(rootPart.Position, Vector3.new(0, -14, 0), params)
      if hit and humanoid.FloorMaterial ~= Enum.Material.Air then
        foundationCheckpoint("GROUND_CONTACT", player, {groundY = hit.Position.Y, rootY = rootPart.Position.Y})
        return
      end
      task.wait(0.1)
    until os.clock() >= deadline
    player:SetAttribute("FoundationFailure", "GROUND_CONTACT_FAILURE")
  end)
end

local function bindPlayer(player)
  if player:GetAttribute("Territories") == nil then loadPlayer(player) end
  player.CharacterAdded:Connect(function(character) validateCharacterFoundation(player, character) end)
  if player.Character then task.defer(validateCharacterFoundation, player, player.Character) end
  task.defer(function() broadcastMultiplayerSync(player) end)
end

Players.PlayerAdded:Connect(bindPlayer)
for _, player in ipairs(Players:GetPlayers()) do bindPlayer(player) end

remote.OnServerEvent:Connect(function(player, action)
  if typeof(action) ~= "string" then return end
  local handler = handlers[action]
  if typeof(handler) ~= "function" then return end
  local now = os.clock()
  local previous = lastAction[player] or 0
  if now - previous < Config.RateLimitSeconds then return end
  lastAction[player] = now
  handler(player)
  foundationCheckpoint("CORE_LOOP_READY", player, {action = action})
  broadcastMultiplayerSync(player)
end)

foundationRemote.OnServerEvent:Connect(function(player, name)
  if typeof(name) ~= "string" then return end
  if name == "REMOTE_PING" then foundationRemote:FireClient(player, "REMOTE_PONG"); return end
  if name == "REMOTE_ROUNDTRIP" then foundationCheckpoint("REMOTE_ROUNDTRIP", player, {roundtrip = true}); return end
  local now = os.clock()
  if now - (foundationLast[player] or 0) < 0.05 then return end
  foundationLast[player] = now
  if name == "CAMERA_READY" or name == "INPUT_READY" then foundationCheckpoint(name, player, {clientReported = true}) end
end)

RunService.Heartbeat:Connect(function()
  for _, player in ipairs(Players:GetPlayers()) do
    local character = player.Character
    local humanoid = character and character:FindFirstChildOfClass("Humanoid")
    local rootPart = character and character:FindFirstChild("HumanoidRootPart")
    if humanoid and rootPart and humanoid.MoveDirection.Magnitude > 0.05 then
      local start = movementProbeStart[player]
      if not start then
        movementProbeStart[player] = rootPart.Position
      elseif (rootPart.Position - start).Magnitude >= 2 then
        foundationCheckpoint("MOVEMENT_CONFIRMED", player, {displacement = (rootPart.Position - start).Magnitude})
        movementProbeStart[player] = nil
      end
    elseif humanoid and humanoid.MoveDirection.Magnitude <= 0.05 then
      movementProbeStart[player] = nil
    end
  end
end)

Players.PlayerRemoving:Connect(function(player)
  savePlayer(player)
  lastAction[player] = nil
  foundationLast[player] = nil
  movementProbeStart[player] = nil
  task.defer(function() broadcastMultiplayerSync(nil) end)
end)

game:BindToClose(function()
  for _, player in ipairs(Players:GetPlayers()) do savePlayer(player) end
end)
