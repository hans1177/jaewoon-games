local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local DataStoreService = game:GetService("DataStoreService")

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

Players.PlayerAdded:Connect(function(player)
  loadPlayer(player)
  task.defer(function() broadcastMultiplayerSync(player) end)
end)
for _, player in ipairs(Players:GetPlayers()) do
  task.defer(function()
    if player:GetAttribute("Territories") == nil then loadPlayer(player) end
  end)
end

remote.OnServerEvent:Connect(function(player, action)
  if typeof(action) ~= "string" then return end
  local handler = handlers[action]
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
  lastAction[player] = nil
  task.defer(function() broadcastMultiplayerSync(nil) end)
end)

game:BindToClose(function()
  for _, player in ipairs(Players:GetPlayers()) do savePlayer(player) end
end)
