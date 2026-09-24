local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")

local player = Players.LocalPlayer
local Shared = ReplicatedStorage:WaitForChild("Shared")
local Config = require(Shared:WaitForChild("GameConfig"))
-- STUDIO_ASSET_BINDING_CLIENT_BEGIN
local STUDIO_ASSET_BINDING_VERSION = 1
local studioAssetConfig = Config.StudioAssets or {}
local studioAssetFamilies = studioAssetConfig.Families or {}
local studioUi = studioAssetFamilies.UI or {}
local function hasStudioAssetAtom(atom)
  return table.find(studioUi, atom) ~= nil
end
-- STUDIO_ASSET_BINDING_CLIENT_END

local remote = ReplicatedStorage:WaitForChild(Config.RemoteName)
local foundationRemote = ReplicatedStorage:WaitForChild("RuntimeFoundationReport")
local foundationRoundtrip = false

foundationRemote.OnClientEvent:Connect(function(kind)
  if kind == "REMOTE_PONG" then
    foundationRoundtrip = true
    foundationRemote:FireServer("REMOTE_ROUNDTRIP")
  end
end)

task.spawn(function()
  for _ = 1, 20 do
    foundationRemote:FireServer("INPUT_READY")
    foundationRemote:FireServer("REMOTE_PING")
    if foundationRoundtrip then break end
    task.wait(0.5)
  end
end)

task.spawn(function()
  local camera = workspace.CurrentCamera
  local character = player.Character or player.CharacterAdded:Wait()
  local humanoid = character:WaitForChild("Humanoid", 10)
  if camera and humanoid then
    camera.CameraSubject = humanoid
    for _ = 1, 30 do
      if camera.CameraSubject == humanoid then
        foundationRemote:FireServer("CAMERA_READY")
        break
      end
      task.wait(0.1)
    end
  end
end)

local gui = Instance.new("ScreenGui")
gui.Name = "TerritoryWarHud"
gui.ResetOnSpawn = false
gui.Parent = player:WaitForChild("PlayerGui")

local root = Instance.new("Frame")
if hasStudioAssetAtom("FRAME_PANEL") then
  local studioAssetStroke = Instance.new("UIStroke")
  studioAssetStroke.Name = "StudioAssetFramePanel"
  studioAssetStroke.Thickness = 1
  studioAssetStroke.Transparency = 0.55
  studioAssetStroke.Color = Color3.fromRGB(210, 225, 255)
  studioAssetStroke.Parent = root
end
root:SetAttribute("StudioAssetBindingVersion", STUDIO_ASSET_BINDING_VERSION)
root:SetAttribute("StudioAssetAtoms", table.concat(studioUi, ","))

root.AnchorPoint = Vector2.new(0.5, 1)
root.Position = UDim2.fromScale(0.5, 0.98)
root.Size = UDim2.new(1, -24, 0, 320)
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

local multiplayerStatus = Instance.new("TextLabel")
multiplayerStatus.Size = UDim2.new(1, -20, 0, 28)
multiplayerStatus.Position = UDim2.fromOffset(10, 270)
multiplayerStatus.BackgroundTransparency = 1
multiplayerStatus.TextColor3 = Color3.fromRGB(166, 211, 255)
multiplayerStatus.TextScaled = true
multiplayerStatus.Parent = root

local function render()
  status.Text = string.format(
    "영토 %d  병력 %d  자원 %d  경제 Lv.%d  점수 %d  턴 %d",
    player:GetAttribute("Territories") or 1,
    player:GetAttribute("Troops") or 12,
    player:GetAttribute("Resources") or 20,
    player:GetAttribute("EconomyLevel") or 1,
    player:GetAttribute("RoundScore") or 0,
    player:GetAttribute("CampaignTurn") or 1
  )
  order.Text = "결과: " .. tostring(player:GetAttribute("LastOrder") or "READY")
  if player:GetAttribute("MultiplayerActive") == true then
    multiplayerStatus.Text = string.format("경쟁전 동기화 · %d명 · 상대 %s", player:GetAttribute("SyncedParticipantCount") or 2, tostring(player:GetAttribute("OpponentUserId") or 0))
  else
    multiplayerStatus.Text = "솔로 전선 · AI 상대"
  end
end

for _, name in ipairs({"Territories","Troops","Resources","EconomyLevel","EnemyPressure","CampaignTurn","RoundScore","MultiplayerActive","OpponentUserId","LastOrder"}) do
  player:GetAttributeChangedSignal(name):Connect(render)
end

remote.OnClientEvent:Connect(function(kind, snapshot)
  if kind ~= "MULTIPLAYER_SYNC" or typeof(snapshot) ~= "table" then return end
  player:SetAttribute("SyncedParticipantCount", tonumber(snapshot.ParticipantCount) or 1)
  render()
end)

render()
