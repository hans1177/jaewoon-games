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
panel.Size = UDim2.new(1, -28, 0, 108)
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
status.Size = UDim2.new(1, -28, 0, 30)
status.Font = Enum.Font.GothamSemibold
status.TextColor3 = Color3.fromRGB(215, 230, 255)
status.TextScaled = true
status.TextXAlignment = Enum.TextXAlignment.Left
status.Parent = panel

local hint = Instance.new("TextLabel")
hint.Name = "Hint"
hint.BackgroundTransparency = 1
hint.Position = UDim2.fromOffset(14, 72)
hint.Size = UDim2.new(1, -28, 0, 22)
hint.Font = Enum.Font.Gotham
hint.TextColor3 = Color3.fromRGB(165, 185, 215)
hint.TextScaled = true
hint.TextXAlignment = Enum.TextXAlignment.Left
hint.Text = UserInputService.TouchEnabled
  and "Move with the default thumbstick · Jump with the default jump button"
  or "Move with WASD · Jump with Space"
hint.Parent = panel

local function render()
  local stage = player:GetAttribute("Position") or 0
  local progress = player:GetAttribute("Progress") or 0
  local score = player:GetAttribute("Score") or 0
  local roundTime = tonumber(player:GetAttribute("RoundTime")) or 0
  local finished = player:GetAttribute("Finished") == true

  if finished then
    status.Text = string.format("FINISH · Stage %d/12 · %d%% · Score %d · %.1fs", stage, progress, score, roundTime)
  else
    status.Text = string.format("Stage %d/12 · %d%% · Score %d · %.1fs", stage, progress, score, roundTime)
  end
end

for _, name in ipairs({"Position", "Progress", "Score", "RoundTime", "Finished"}) do
  player:GetAttributeChangedSignal(name):Connect(render)
end

render()
