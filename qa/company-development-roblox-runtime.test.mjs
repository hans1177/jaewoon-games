import test from 'node:test';
import assert from 'node:assert/strict';
import {projectJsonForGame,requiresPersistentSave,validateRobloxBootstrap} from '../tools/company-development-roblox-bootstrap.mjs';

const baseline={content:{identity:'Pocket Foundry',coreFun:'collect, upgrade, income, unlock',progressionDirection:'Persistent progression system'}};
const shared=`local Config = {
  PolicySource = "COMPANY_FLOW.md",
  Platform = "ROBLOX",
  MobileFirst = true,
  SaveEnabled = true,
  MultiplayerEnabled = false,
  GameId = "test-game",
  InitialCoins = 0,
  UpgradeBaseCost = 10,
  ProductionBase = 1,
}
return table.freeze(Config)
${'-- config\n'.repeat(20)}`;
const server=`local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local DataStoreService = game:GetService("DataStoreService")
local RemoteEvent = Instance.new("RemoteEvent")
RemoteEvent.Name = "GameAction"
RemoteEvent.Parent = ReplicatedStorage
local store = DataStoreService:GetDataStore("test-v1")
local lastAction = {}
local function safeNumber(value)
  if typeof(value) ~= "number" then return nil end
  return math.clamp(value, 0, 100)
end
Players.PlayerAdded:Connect(function(player)
  local coins = 0
  local ok, saved = pcall(function() return store:GetAsync("p:" .. player.UserId) end)
  if ok and typeof(saved) == "number" then coins = math.max(0, saved) end
  player:SetAttribute("Coins", coins)
  player:SetAttribute("Level", 1)
end)
RemoteEvent.OnServerEvent:Connect(function(player, action, amount)
  if typeof(action) ~= "string" then return end
  local now = os.clock()
  if now - (lastAction[player] or 0) < 0.08 then return end
  lastAction[player] = now
  local value = safeNumber(amount or 1) or 1
  if action == "collect" then
    player:SetAttribute("Coins", (player:GetAttribute("Coins") or 0) + math.max(1, value))
  elseif action == "upgrade" then
    local level = player:GetAttribute("Level") or 1
    player:SetAttribute("Level", level + 1)
  end
end)
Players.PlayerRemoving:Connect(function(player)
  local coins = player:GetAttribute("Coins") or 0
  pcall(function() store:UpdateAsync("p:" .. player.UserId, function() return coins end) end)
  lastAction[player] = nil
end)
${'-- server gameplay\n'.repeat(45)}`;
const client=`local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")
local player = Players.LocalPlayer
local remote = ReplicatedStorage:WaitForChild("GameAction")
local gui = Instance.new("ScreenGui")
gui.Name = "GameHud"
gui.ResetOnSpawn = false
gui.Parent = player:WaitForChild("PlayerGui")
local button = Instance.new("TextButton")
button.Size = UDim2.fromOffset(180, 56)
button.Position = UDim2.new(0.5, -90, 1, -80)
button.Text = UserInputService.TouchEnabled and "수집" or "Collect"
button.Parent = gui
local status = Instance.new("TextLabel")
status.Size = UDim2.fromOffset(240, 44)
status.Position = UDim2.new(0.5, -120, 0, 24)
status.Parent = gui
button.Activated:Connect(function() remote:FireServer("collect", 1) end)
local function render()
  status.Text = string.format("Coins %d / Lv %d", player:GetAttribute("Coins") or 0, player:GetAttribute("Level") or 1)
end
player:GetAttributeChangedSignal("Coins"):Connect(render)
player:GetAttributeChangedSignal("Level"):Connect(render)
render()
${'-- client ui\n'.repeat(40)}`;

test('persistent Roblox design requires save evidence in generated source',()=>{
  assert.equal(requiresPersistentSave(baseline),true);
});

test('Roblox bootstrap static gate accepts server-authoritative mobile source with save',()=>{
  const verdict=validateRobloxBootstrap({sharedConfig:shared,serverCode:server,clientCode:client,baseline});
  assert.equal(verdict.pass,true,verdict.blockers.join(','));
  assert.equal(verdict.saveRequired,true);
});

test('Roblox bootstrap static gate rejects placeholders and missing server boundary',()=>{
  const bad=validateRobloxBootstrap({sharedConfig:shared,serverCode:'-- TODO placeholder\n',clientCode:client,baseline});
  assert.equal(bad.pass,false);
  assert.ok(bad.blockers.includes('SERVER_PLACEHOLDER_FORBIDDEN'));
  assert.ok(bad.blockers.includes('SERVER_REMOTE_BOUNDARY_REQUIRED'));
});

test('Rojo project maps shared server and client source roots',()=>{
  const project=projectJsonForGame('test-game');
  assert.equal(project.name,'test-game');
  assert.equal(project.tree.ReplicatedStorage.Shared.$path,'shared');
  assert.equal(project.tree.ServerScriptService.GameServer.$path,'server');
  assert.equal(project.tree.StarterPlayer.StarterPlayerScripts.GameClient.$path,'client');
});
