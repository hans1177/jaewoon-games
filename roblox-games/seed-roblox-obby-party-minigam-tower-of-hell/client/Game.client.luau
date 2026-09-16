local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")

local player = Players.LocalPlayer
local Shared = ReplicatedStorage:WaitForChild("Shared")
local Config = require(Shared:WaitForChild("GameConfig"))

local gui = Instance.new("ScreenGui")
gui.Name = "ObbyHud"
gui.ResetOnSpawn = false
gui.IgnoreGuiInset = false
gui.Parent = player:WaitForChild("PlayerGui")

local panel = Instance.new("Frame")
panel.Name = "Panel"
panel.AnchorPoint = Vector2.new(0.5, 0)
panel.Position = UDim2.fromScale(0.5, 0.025)
panel.Size = UDim2.new(1, -28, 0, 142)
panel.BackgroundColor3 = Color3.fromRGB(16, 24, 40)
panel.BackgroundTransparency = 0.08
panel.BorderSizePixel = 0
panel.Parent = gui

local corner = Instance.new("UICorner")
corner.CornerRadius = UDim.new(0, 14)
corner.Parent = panel

local title = Instance.new("TextLabel")
title.Name = "Title"
title.BackgroundTransparency = 1
title.Position = UDim2.fromOffset(14, 8)
title.Size = UDim2.new(1, -28, 0, 26)
title.Font = Enum.Font.GothamBold
title.TextColor3 = Color3.fromRGB(245, 248, 255)
title.TextScaled = true
title.TextXAlignment = Enum.TextXAlignment.Left
title.Text = Config.GameName .. (UserInputService.TouchEnabled and " · TOUCH" or " · DESKTOP")
title.Parent = panel

local status = Instance.new("TextLabel")
status.Name = "Status"
status.BackgroundTransparency = 1
status.Position = UDim2.fromOffset(14, 38)
status.Size = UDim2.new(1, -28, 0, 32)
status.Font = Enum.Font.GothamSemibold
status.TextColor3 = Color3.fromRGB(215, 230, 255)
status.TextScaled = true
status.TextXAlignment = Enum.TextXAlignment.Left
status.Parent = panel

local challengeLabel = Instance.new("TextLabel")
challengeLabel.Name = "Challenge"
challengeLabel.BackgroundTransparency = 1
challengeLabel.Position = UDim2.fromOffset(14, 74)
challengeLabel.Size = UDim2.new(1, -28, 0, 24)
challengeLabel.Font = Enum.Font.GothamBold
challengeLabel.TextColor3 = Color3.fromRGB(255, 211, 115)
challengeLabel.TextScaled = true
challengeLabel.TextXAlignment = Enum.TextXAlignment.Left
challengeLabel.Parent = panel

local hint = Instance.new("TextLabel")
hint.Name = "Hint"
hint.BackgroundTransparency = 1
hint.Position = UDim2.fromOffset(14, 106)
hint.Size = UDim2.new(1, -28, 0, 22)
hint.Font = Enum.Font.Gotham
hint.TextColor3 = Color3.fromRGB(165, 185, 215)
hint.TextScaled = true
hint.TextXAlignment = Enum.TextXAlignment.Left
hint.Parent = panel

local movementHint = UserInputService.TouchEnabled
  and "Move with the default thumbstick · Jump with the default jump button"
  or "Move with WASD · Jump with Space"

local function render()
  local round = player:GetAttribute("Round") or 1
  local stage = player:GetAttribute("Position") or 0
  local progress = player:GetAttribute("Progress") or 0
  local score = player:GetAttribute("Score") or 0
  local roundTime = tonumber(player:GetAttribute("RoundTime")) or 0
  local finished = player:GetAttribute("Finished") == true
  local restarting = player:GetAttribute("Restarting") == true
  local challenge = player:GetAttribute("Challenge") or "Wide Jumps"
  local tier = player:GetAttribute("DifficultyTier") or 1

  challengeLabel.Text = string.format("Tier %d · %s", tier, challenge)

  if finished and restarting then
    status.Text = string.format("Round %d FINISH · Stage %d/12 · %d%% · Score %d · %.1fs", round, stage, progress, score, roundTime)
    challengeLabel.Text = "Course Complete"
    hint.Text = "New round starts automatically in 3 seconds"
  elseif finished then
    status.Text = string.format("Round %d FINISH · Stage %d/12 · %d%% · Score %d · %.1fs", round, stage, progress, score, roundTime)
    challengeLabel.Text = "Course Complete"
    hint.Text = "Finish recorded"
  else
    status.Text = string.format("Round %d · Stage %d/12 · %d%% · Score %d · %.1fs", round, stage, progress, score, roundTime)
    hint.Text = movementHint
  end
end

for _, name in ipairs({"Round", "Position", "Progress", "Score", "RoundTime", "Finished", "Restarting", "Challenge", "DifficultyTier"}) do
  player:GetAttributeChangedSignal(name):Connect(render)
end

render()
