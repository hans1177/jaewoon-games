local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local DataStoreService = game:GetService("DataStoreService")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Config = require(Shared:WaitForChild("GameConfig"))
local store = DataStoreService:GetDataStore("cozy-island-development-v1")

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
local function readNumber(player, name, fallback)
  local value = player:GetAttribute(name)
  if typeof(value) ~= "number" then return fallback end
  return value
end

local function setNumber(player, name, value)
  if typeof(value) ~= "number" then return end
  player:SetAttribute(name, math.max(0, math.floor(value)))
end

local function initialize(player)
  for key, value in pairs(Config.InitialState) do
    player:SetAttribute(key, value)
  end
  player:SetAttribute("LastActivity", "READY")
end

local function loadPlayer(player)
  local ok, saved = pcall(function()
    return store:GetAsync("player:" .. player.UserId)
  end)
  if not ok or typeof(saved) ~= "table" then
    initialize(player)
    return
  end
  for key, fallback in pairs(Config.InitialState) do
    local value = saved[key]
    if typeof(value) == "number" then
      player:SetAttribute(key, value)
    else
      player:SetAttribute(key, fallback)
    end
  end
  player:SetAttribute("LastActivity", "RESTORED")
end

local function savePlayer(player)
  local snapshot = {}
  for key, fallback in pairs(Config.InitialState) do
    snapshot[key] = readNumber(player, key, fallback)
  end
  pcall(function()
    store:UpdateAsync("player:" .. player.UserId, function()
      return snapshot
    end)
  end)
end

local function fish(player)
  local reward = math.random(Config.FishingRewardMin, Config.FishingRewardMax)
  setNumber(player, "Fish", readNumber(player, "Fish", 0) + 1)
  setNumber(player, "Coins", readNumber(player, "Coins", 0) + reward)
  setNumber(player, "Progress", readNumber(player, "Progress", 0) + 2)
  player:SetAttribute("LastActivity", "FISH")
end

local function gather(player)
  setNumber(player, "Wood", readNumber(player, "Wood", 0) + Config.GatheringWood)
  setNumber(player, "Shells", readNumber(player, "Shells", 0) + Config.GatheringShell)
  setNumber(player, "Progress", readNumber(player, "Progress", 0) + 1)
  player:SetAttribute("LastActivity", "GATHER")
end

local function improveIsland(player)
  local wood = readNumber(player, "Wood", 0)
  local coins = readNumber(player, "Coins", 0)
  if wood < Config.UpgradeWoodCost or coins < Config.UpgradeCoinCost then
    player:SetAttribute("LastActivity", "NEED_RESOURCES")
    return
  end
  setNumber(player, "Wood", wood - Config.UpgradeWoodCost)
  setNumber(player, "Coins", coins - Config.UpgradeCoinCost)
  local nextLevel = readNumber(player, "IslandLevel", 1) + 1
  setNumber(player, "IslandLevel", nextLevel)
  setNumber(player, "ActivityUnlocks", math.max(readNumber(player, "ActivityUnlocks", 1), nextLevel))
  setNumber(player, "Progress", readNumber(player, "Progress", 0) + 10)
  player:SetAttribute("LastActivity", "ISLAND_IMPROVED")
end

local handlers = {
  [Config.Actions.FISH] = fish,
  [Config.Actions.GATHER] = gather,
  [Config.Actions.IMPROVE_ISLAND] = improveIsland,
}

Players.PlayerAdded:Connect(loadPlayer)
for _, player in ipairs(Players:GetPlayers()) do
  task.defer(function()
    if player:GetAttribute("IslandLevel") == nil then loadPlayer(player) end
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
  for _, player in ipairs(Players:GetPlayers()) do
    savePlayer(player)
  end
end)
