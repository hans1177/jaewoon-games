local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")

local player = Players.LocalPlayer
local Shared = ReplicatedStorage:WaitForChild("Shared")
local Config = require(Shared:WaitForChild("GameConfig"))
local remote = ReplicatedStorage:WaitForChild(Config.RemoteName)

local gui = Instance.new("ScreenGui")
gui.Name = "CozyIslandHud"
gui.ResetOnSpawn = false
gui.IgnoreGuiInset = false
gui.Parent = player:WaitForChild("PlayerGui")

local root = Instance.new("Frame")
root.AnchorPoint = Vector2.new(0.5, 1)
root.Position = UDim2.fromScale(0.5, 0.98)
root.Size = UDim2.new(1, -24, 0, 250)
root.BackgroundColor3 = Color3.fromRGB(31, 55, 62)
root.BackgroundTransparency = 0.08
root.Parent = gui

local status = Instance.new("TextLabel")
status.Size = UDim2.new(1, -20, 0, 64)
status.Position = UDim2.fromOffset(10, 8)
status.BackgroundTransparency = 1
status.TextColor3 = Color3.fromRGB(245, 250, 244)
status.TextWrapped = true
status.TextScaled = true
status.Parent = root

local message = Instance.new("TextLabel")
message.Size = UDim2.new(1, -20, 0, 34)
message.Position = UDim2.fromOffset(10, 70)
message.BackgroundTransparency = 1
message.TextColor3 = Color3.fromRGB(220, 238, 223)
message.TextScaled = true
message.Parent = root

local actions = {
  {id = Config.Actions.FISH, text = "낚시"},
  {id = Config.Actions.GATHER, text = "채집"},
  {id = Config.Actions.IMPROVE_ISLAND, text = "섬 개선"},
}
for index, action in ipairs(actions) do
  local button = Instance.new("TextButton")
  button.Name = action.id
  button.Size = UDim2.new(0.31, 0, 0, 72)
  button.Position = UDim2.new(0.02 + (index - 1) * 0.325, 0, 0, 118)
  button.BackgroundColor3 = Color3.fromRGB(236, 244, 221)
  button.TextColor3 = Color3.fromRGB(31, 45, 42)
  button.TextScaled = true
  button.Text = action.text
  button.Parent = root
  button.Activated:Connect(function()
    remote:FireServer(action.id)
  end)
end

local touch = UserInputService.TouchEnabled
local hint = Instance.new("TextLabel")
hint.Size = UDim2.new(1, -20, 0, 30)
hint.Position = UDim2.fromOffset(10, 205)
hint.BackgroundTransparency = 1
hint.TextColor3 = Color3.fromRGB(190, 218, 202)
hint.TextScaled = true
hint.Text = touch and "터치로 생활 활동을 선택해" or "버튼으로 생활 활동을 선택해"
hint.Parent = root

local function render()
  status.Text = string.format(
    "섬 Lv.%d  코인 %d  물고기 %d  나무 %d  조개 %d",
    player:GetAttribute("IslandLevel") or 1,
    player:GetAttribute("Coins") or 0,
    player:GetAttribute("Fish") or 0,
    player:GetAttribute("Wood") or 0,
    player:GetAttribute("Shells") or 0
  )
  local last = player:GetAttribute("LastActivity") or "READY"
  message.Text = "상태: " .. tostring(last)
end

for _, name in ipairs({"IslandLevel","Coins","Fish","Wood","Shells","LastActivity"}) do
  player:GetAttributeChangedSignal(name):Connect(render)
end
render()
