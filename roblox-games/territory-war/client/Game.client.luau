local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")

local player = Players.LocalPlayer
local Shared = ReplicatedStorage:WaitForChild("Shared")
local Config = require(Shared:WaitForChild("GameConfig"))
local remote = ReplicatedStorage:WaitForChild(Config.RemoteName)

local gui = Instance.new("ScreenGui")
gui.Name = "TerritoryWarHud"
gui.ResetOnSpawn = false
gui.Parent = player:WaitForChild("PlayerGui")

local root = Instance.new("Frame")
root.AnchorPoint = Vector2.new(0.5, 1)
root.Position = UDim2.fromScale(0.5, 0.98)
root.Size = UDim2.new(1, -24, 0, 290)
root.BackgroundColor3 = Color3.fromRGB(31, 34, 46)
root.BackgroundTransparency = 0.06
root.Parent = gui

local status = Instance.new("TextLabel")
status.Size = UDim2.new(1, -20, 0, 72)
status.Position = UDim2.fromOffset(10, 8)
status.BackgroundTransparency = 1
status.TextColor3 = Color3.fromRGB(245, 246, 250)
status.TextWrapped = true
status.TextScaled = true
status.Parent = root

local order = Instance.new("TextLabel")
order.Size = UDim2.new(1, -20, 0, 38)
order.Position = UDim2.fromOffset(10, 82)
order.BackgroundTransparency = 1
order.TextColor3 = Color3.fromRGB(214, 222, 240)
order.TextScaled = true
order.Parent = root

local actions = {
  {id = Config.Actions.SCOUT, text = "정찰"},
  {id = Config.Actions.ATTACK, text = "공격"},
  {id = Config.Actions.REINFORCE, text = "증원"},
  {id = Config.Actions.ECONOMY, text = "경제"},
}
for index, action in ipairs(actions) do
  local button = Instance.new("TextButton")
  button.Name = action.id
  button.Size = UDim2.new(0.235, 0, 0, 78)
  button.Position = UDim2.new(0.015 + (index - 1) * 0.245, 0, 0, 138)
  button.BackgroundColor3 = Color3.fromRGB(232, 235, 244)
  button.TextColor3 = Color3.fromRGB(27, 30, 40)
  button.TextScaled = true
  button.Text = action.text
  button.Parent = root
  button.Activated:Connect(function()
    remote:FireServer(action.id)
  end)
end

local hint = Instance.new("TextLabel")
hint.Size = UDim2.new(1, -20, 0, 34)
hint.Position = UDim2.fromOffset(10, 232)
hint.BackgroundTransparency = 1
hint.TextColor3 = Color3.fromRGB(190, 198, 218)
hint.TextScaled = true
hint.Text = UserInputService.TouchEnabled and "전선 상태를 보고 터치 명령을 선택해" or "전선 상태를 보고 명령을 선택해"
hint.Parent = root

local function render()
  status.Text = string.format(
    "영토 %d  병력 %d  자원 %d  경제 Lv.%d  적 압력 %d  턴 %d",
    player:GetAttribute("Territories") or 1,
    player:GetAttribute("Troops") or 12,
    player:GetAttribute("Resources") or 20,
    player:GetAttribute("EconomyLevel") or 1,
    player:GetAttribute("EnemyPressure") or 8,
    player:GetAttribute("CampaignTurn") or 1
  )
  order.Text = "결과: " .. tostring(player:GetAttribute("LastOrder") or "READY")
end

for _, name in ipairs({"Territories","Troops","Resources","EconomyLevel","EnemyPressure","CampaignTurn","LastOrder"}) do
  player:GetAttributeChangedSignal(name):Connect(render)
end
render()
