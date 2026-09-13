local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")

local player = Players.LocalPlayer
local Shared = ReplicatedStorage:WaitForChild("Shared")
local Config = require(Shared:WaitForChild("GameConfig"))
local remote = ReplicatedStorage:WaitForChild(Config.RemoteName)

local gui = Instance.new("ScreenGui")
gui.Name = "ApprovedScopeHud"
gui.ResetOnSpawn = false
gui.IgnoreGuiInset = false
gui.Parent = player:WaitForChild("PlayerGui")

local root = Instance.new("Frame")
root.Name = "Root"
root.AnchorPoint = Vector2.new(0.5, 1)
root.Position = UDim2.fromScale(0.5, 0.98)
root.Size = UDim2.new(1, -24, 0, 330)
root.BackgroundTransparency = 0.15
root.BackgroundColor3 = Color3.fromRGB(18, 28, 48)
root.Parent = gui

local title = Instance.new("TextLabel")
title.Name = "Title"
title.Size = UDim2.new(1, -20, 0, 44)
title.Position = UDim2.fromOffset(10, 8)
title.BackgroundTransparency = 1
title.TextColor3 = Color3.fromRGB(245, 248, 255)
title.TextScaled = true
title.Text = Config.GameName .. (UserInputService.TouchEnabled and " · TOUCH" or " · DESKTOP")
title.Parent = root

local status = Instance.new("TextLabel")
status.Name = "Status"
status.Size = UDim2.new(1, -20, 0, 52)
status.Position = UDim2.fromOffset(10, 54)
status.BackgroundColor3 = Color3.fromRGB(10, 17, 30)
status.TextColor3 = Color3.fromRGB(220, 232, 250)
status.TextScaled = true
status.Parent = root

local list = Instance.new("ScrollingFrame")
list.Name = "ApprovedActions"
list.Size = UDim2.new(1, -20, 1, -116)
list.Position = UDim2.fromOffset(10, 108)
list.BackgroundTransparency = 1
list.BorderSizePixel = 0
list.AutomaticCanvasSize = Enum.AutomaticSize.Y
list.CanvasSize = UDim2.new()
list.ScrollBarThickness = 6
list.Parent = root

local layout = Instance.new("UIListLayout")
layout.Padding = UDim.new(0, 8)
layout.SortOrder = Enum.SortOrder.LayoutOrder
layout.Parent = list

for index, action in ipairs(Config.Actions) do
  local button = Instance.new("TextButton")
  button.Name = "ScopeAction" .. index
  button.LayoutOrder = index
  button.Size = UDim2.new(1, -4, 0, 56)
  button.BackgroundColor3 = Color3.fromRGB(235, 242, 255)
  button.TextColor3 = Color3.fromRGB(16, 24, 40)
  button.TextWrapped = true
  button.TextScaled = true
  button.Text = string.format("%d. %s [%s]", index, action.Label, action.Kind)
  button.Parent = list
  button.Activated:Connect(function()
    remote:FireServer(action.Id)
  end)
end

local watched = {"Score", "Coins", "Level", "Progress", "Health", "Wave", "Position", "Objective", "Combo", "EnemyHealth", "LastApprovedScope"}
local function render()
  status.Text = string.format(
    "Score %d · Coins %d · Lv %d · Progress %d · HP %d · Wave %d",
    player:GetAttribute("Score") or 0,
    player:GetAttribute("Coins") or 0,
    player:GetAttribute("Level") or 1,
    player:GetAttribute("Progress") or 0,
    player:GetAttribute("Health") or 100,
    player:GetAttribute("Wave") or 1
  )
end

for _, name in ipairs(watched) do
  player:GetAttributeChangedSignal(name):Connect(render)
end
render()
