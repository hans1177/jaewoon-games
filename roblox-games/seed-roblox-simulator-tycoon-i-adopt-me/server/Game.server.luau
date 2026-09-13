local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local DataStoreService = game:GetService("DataStoreService")
local store = DataStoreService:GetDataStore("seed-roblox-simulator-tycoon-i-adopt-me-development-v1")
local Shared = ReplicatedStorage:WaitForChild("Shared")
local Config = require(Shared:WaitForChild("GameConfig"))

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
  for key, value in pairs(Config.InitialState) do
    player:SetAttribute(key, value)
  end
  player:SetAttribute("LastApprovedScope", "ready")
end

local function scopeHandler1(player)
  setNumber(player, "Level", readNumber(player, "Level", 1) + 1)
  setNumber(player, "Progress", readNumber(player, "Progress", 0) + 8)
  setNumber(player, "Score", readNumber(player, "Score", 0) + 6)
  setNumber(player, "Coins", readNumber(player, "Coins", 0) + 3)
  player:SetAttribute("LastApprovedScope", "scope-corefun-b56c774462")
end

local function scopeHandler2(player)
  setNumber(player, "Coins", readNumber(player, "Coins", 0) + 8)
  setNumber(player, "Score", readNumber(player, "Score", 0) + 5)
  setNumber(player, "Progress", readNumber(player, "Progress", 0) + 6)
  player:SetAttribute("LastApprovedScope", "scope-coreloop-0-3574de4c31")
end

local function scopeHandler3(player)
  setNumber(player, "Level", readNumber(player, "Level", 1) + 1)
  setNumber(player, "Progress", readNumber(player, "Progress", 0) + 10)
  setNumber(player, "Score", readNumber(player, "Score", 0) + 8)
  setNumber(player, "Coins", readNumber(player, "Coins", 0) + 5)
  player:SetAttribute("LastApprovedScope", "scope-coreloop-1-886c0687be")
end

local function scopeHandler4(player)
  setNumber(player, "Level", readNumber(player, "Level", 1) + 1)
  setNumber(player, "Progress", readNumber(player, "Progress", 0) + 11)
  setNumber(player, "Score", readNumber(player, "Score", 0) + 9)
  setNumber(player, "Coins", readNumber(player, "Coins", 0) + 6)
  player:SetAttribute("LastApprovedScope", "scope-coreloop-2-4cc22b4bf7")
end

local function scopeHandler5(player)
  setNumber(player, "Position", (readNumber(player, "Position", 0) + 1) % 12)
  setNumber(player, "Score", readNumber(player, "Score", 0) + 7)
  setNumber(player, "Progress", readNumber(player, "Progress", 0) + 8)
  player:SetAttribute("LastApprovedScope", "scope-mobileux-daeb36567f")
end

local handlers = {
  ["scope-corefun-b56c774462"] = scopeHandler1,
  ["scope-coreloop-0-3574de4c31"] = scopeHandler2,
  ["scope-coreloop-1-886c0687be"] = scopeHandler3,
  ["scope-coreloop-2-4cc22b4bf7"] = scopeHandler4,
  ["scope-mobileux-daeb36567f"] = scopeHandler5,
}

Players.PlayerAdded:Connect(function(player)
  local ok, saved = pcall(function()
    return store:GetAsync("player:" .. player.UserId)
  end)
  if ok and typeof(saved) == "table" then
    for key, fallback in pairs(Config.InitialState) do
      local value = saved[key]
      if typeof(value) == "number" then player:SetAttribute(key, value) else player:SetAttribute(key, fallback) end
    end
  else
    initializePlayer(player)
  end
end)

for _, player in ipairs(Players:GetPlayers()) do
  task.defer(function()
    if player:GetAttribute("Score") == nil then initializePlayer(player) end
  end)
end

remote.OnServerEvent:Connect(function(player, actionId)
  if typeof(actionId) ~= "string" then return end
  local handler = handlers[actionId]
  if typeof(handler) ~= "function" then return end
  local now = os.clock()
  local previous = lastAction[player] or 0
  if now - previous < Config.RateLimitSeconds then return end
  lastAction[player] = now
  handler(player)
end)

Players.PlayerRemoving:Connect(function(player)
  local snapshot = {}
  for key, fallback in pairs(Config.InitialState) do
    snapshot[key] = readNumber(player, key, fallback)
  end
  pcall(function()
    store:UpdateAsync("player:" .. player.UserId, function() return snapshot end)
  end)
  lastAction[player] = nil
end)
