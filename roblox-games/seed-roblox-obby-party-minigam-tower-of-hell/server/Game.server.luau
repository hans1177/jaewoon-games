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
  setNumber(player, "Position", (readNumber(player, "Position", 0) + 1) % 12)
  setNumber(player, "Score", readNumber(player, "Score", 0) + 3)
  setNumber(player, "Progress", readNumber(player, "Progress", 0) + 6)
  player:SetAttribute("LastApprovedScope", "scope-corefun-5fe4e45e2f")
end

local function scopeHandler2(player)
  setNumber(player, "Position", (readNumber(player, "Position", 0) + 2) % 12)
  setNumber(player, "Score", readNumber(player, "Score", 0) + 4)
  setNumber(player, "Progress", readNumber(player, "Progress", 0) + 7)
  player:SetAttribute("LastApprovedScope", "scope-coreloop-0-a308868121")
end

local function scopeHandler3(player)
  setNumber(player, "Position", (readNumber(player, "Position", 0) + 3) % 12)
  setNumber(player, "Score", readNumber(player, "Score", 0) + 5)
  setNumber(player, "Progress", readNumber(player, "Progress", 0) + 8)
  player:SetAttribute("LastApprovedScope", "scope-coreloop-1-7a2dd10fe3")
end

local function scopeHandler4(player)
  setNumber(player, "Level", readNumber(player, "Level", 1) + 1)
  setNumber(player, "Progress", readNumber(player, "Progress", 0) + 11)
  setNumber(player, "Score", readNumber(player, "Score", 0) + 9)
  setNumber(player, "Coins", readNumber(player, "Coins", 0) + 6)
  player:SetAttribute("LastApprovedScope", "scope-coreloop-2-c23e57ccd6")
end

local function scopeHandler5(player)
  setNumber(player, "Position", (readNumber(player, "Position", 0) + 1) % 12)
  setNumber(player, "Score", readNumber(player, "Score", 0) + 7)
  setNumber(player, "Progress", readNumber(player, "Progress", 0) + 8)
  player:SetAttribute("LastApprovedScope", "scope-mobileux-d4b46ab266")
end

local handlers = {
  ["scope-corefun-5fe4e45e2f"] = scopeHandler1,
  ["scope-coreloop-0-a308868121"] = scopeHandler2,
  ["scope-coreloop-1-7a2dd10fe3"] = scopeHandler3,
  ["scope-coreloop-2-c23e57ccd6"] = scopeHandler4,
  ["scope-mobileux-d4b46ab266"] = scopeHandler5,
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
