local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
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
  player:SetAttribute("LastApprovedScope", "scope-corefun-39c5729957")
end

local function scopeHandler2(player)
  setNumber(player, "Position", (readNumber(player, "Position", 0) + 2) % 12)
  setNumber(player, "Score", readNumber(player, "Score", 0) + 4)
  setNumber(player, "Progress", readNumber(player, "Progress", 0) + 7)
  player:SetAttribute("LastApprovedScope", "scope-coreloop-0-aec334dee8")
end

local function scopeHandler3(player)
  setNumber(player, "Coins", readNumber(player, "Coins", 0) + 9)
  setNumber(player, "Score", readNumber(player, "Score", 0) + 6)
  setNumber(player, "Progress", readNumber(player, "Progress", 0) + 7)
  player:SetAttribute("LastApprovedScope", "scope-coreloop-1-b019bdc099")
end

local function scopeHandler4(player)
  setNumber(player, "Position", (readNumber(player, "Position", 0) + 1) % 12)
  setNumber(player, "Score", readNumber(player, "Score", 0) + 6)
  setNumber(player, "Progress", readNumber(player, "Progress", 0) + 9)
  player:SetAttribute("LastApprovedScope", "scope-coreloop-2-fa285598a5")
end

local function scopeHandler5(player)
  setNumber(player, "Position", (readNumber(player, "Position", 0) + 1) % 12)
  setNumber(player, "Score", readNumber(player, "Score", 0) + 7)
  setNumber(player, "Progress", readNumber(player, "Progress", 0) + 8)
  player:SetAttribute("LastApprovedScope", "scope-mobileux-7cfa90daaa")
end

local handlers = {
  ["scope-corefun-39c5729957"] = scopeHandler1,
  ["scope-coreloop-0-aec334dee8"] = scopeHandler2,
  ["scope-coreloop-1-b019bdc099"] = scopeHandler3,
  ["scope-coreloop-2-fa285598a5"] = scopeHandler4,
  ["scope-mobileux-7cfa90daaa"] = scopeHandler5,
}

Players.PlayerAdded:Connect(function(player)
  initializePlayer(player)
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
  lastAction[player] = nil
end)
