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

local function initialize(player)
  for key, value in pairs(Config.InitialState) do player:SetAttribute(key, value) end
  player:SetAttribute("LastOrder", "READY")
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
  setNumber(player, "EnemyPressure", math.min(50, number(player, "EnemyPressure", 8) + 2))
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
  local pressure = number(player, "EnemyPressure", 8)
  local attackPower = troops + number(player, "EconomyLevel", 1) * 2
  if attackPower >= pressure then
    setNumber(player, "Territories", number(player, "Territories", 1) + 1)
    setNumber(player, "Troops", troops - 2)
    setNumber(player, "EnemyPressure", math.max(5, pressure - 3))
    setNumber(player, "Progress", number(player, "Progress", 0) + 8)
    player:SetAttribute("LastOrder", "TERRITORY_CAPTURED")
  else
    setNumber(player, "Troops", math.max(1, troops - 4))
    setNumber(player, "EnemyPressure", pressure + 3)
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

Players.PlayerAdded:Connect(loadPlayer)
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
end)

Players.PlayerRemoving:Connect(function(player)
  savePlayer(player)
  lastAction[player] = nil
end)

game:BindToClose(function()
  for _, player in ipairs(Players:GetPlayers()) do savePlayer(player) end
end)
