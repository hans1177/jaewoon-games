import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {projectJsonForGame,requiresPersistentSave,validateRobloxBootstrap,compileRobloxSource,classifyRobloxScope} from '../tools/company-development-roblox-bootstrap.mjs';
import {deriveApprovedScopeInventory} from '../tools/company-approved-scope-contract.mjs';

const baseline={content:{identity:'Pocket Foundry',coreFun:'collect, upgrade, income, unlock',coreLoop:['collect resources','upgrade production','unlock the next area'],mobileUx:'touch controls',progressionDirection:'Persistent progression system'}};
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

test('Roblox scope classifier maps approved gameplay meaning to native handler modes',()=>{
  assert.equal(classifyRobloxScope({path:'combat',label:'attack enemy'},0),'COMBAT');
  assert.equal(classifyRobloxScope({path:'movement',label:'explore and reposition'},0),'MOVEMENT');
  assert.equal(classifyRobloxScope({path:'progression',label:'upgrade and unlock'},0),'PROGRESSION');
  assert.equal(classifyRobloxScope({path:'economy',label:'collect resources and income'},0),'ECONOMY');
  assert.equal(classifyRobloxScope({path:'objective',label:'complete quest goal'},0),'OBJECTIVE');
  assert.equal(classifyRobloxScope({path:'mobileUx',label:'touch controls'},0),'MOBILE');
});

test('deterministic Roblox compiler implements every approved scope with dedicated server handlers',()=>{
  const cases=[
    ['seed-roblox-simulator-tycoon-test','collect resources, upgrade production, earn income, unlock areas'],
    ['seed-roblox-battleground-fight-test','fight opponents, use skills and cooldowns, win rounds'],
    ['seed-roblox-survival-horror-test','survive threats, find objectives, escape safely'],
    ['seed-roblox-obby-party-test','move through checkpoints and complete obby rounds'],
    ['seed-roblox-story-rpg-test','explore, fight, complete quests and progress the story'],
  ];
  for(const [gameId,coreFun] of cases){
    const locked={content:{identity:`${gameId} identity`,coreFun,coreLoop:['explore or collect','perform the main challenge','receive reward and progress'],mobileUx:'touch controls',progressionDirection:'Persistent progression system'}};
    const inventory=deriveApprovedScopeInventory(locked);
    const compiled=compileRobloxSource({gameId,gameName:'Compiler Test',baseline:locked,artbook:{}});
    assert.equal(compiled.generationMode,'DETERMINISTIC_FULL_SCOPE_IMPLEMENTATION');
    assert.equal(compiled.modelUsed,false);
    assert.equal(compiled.validation.pass,true,compiled.validation.blockers.join(','));
    assert.equal(compiled.actions.length,inventory.length);
    assert.ok(compiled.result.serverCode.includes('RemoteEvent'));
    assert.ok(compiled.result.serverCode.includes('OnServerEvent'));
    assert.ok(compiled.result.clientCode.includes('UserInputService'));
    assert.ok(compiled.result.clientCode.includes('Activated'));
    assert.ok(compiled.result.clientCode.includes('FireServer(action.Id)'));
    assert.ok(compiled.result.serverCode.includes('DataStoreService'));
    for(let i=0;i<inventory.length;i++){
      assert.ok(compiled.result.sharedConfig.includes(inventory[i].id));
      assert.ok(compiled.result.serverCode.includes(`scopeHandler${i+1}`));
    }
  }
});

test('Rojo project maps shared server and client source roots',()=>{
  const project=projectJsonForGame('test-game');
  assert.equal(project.name,'test-game');
  assert.equal(project.tree.ReplicatedStorage.Shared.$path,'shared');
  assert.equal(project.tree.ServerScriptService.GameServer.$path,'server');
  assert.equal(project.tree.StarterPlayer.StarterPlayerScripts.GameClient.$path,'client');
});

test('Roblox source workflow keeps compiled candidates pending when Actions cannot create PRs',()=>{
  const workflow=fs.readFileSync(new URL('../.github/workflows/company-development-roblox-runtime.yml',import.meta.url),'utf8');
  assert.match(workflow,/Attempt validated Roblox source promotion through PR[\s\S]*continue-on-error: true/);
  assert.ok(workflow.includes("failure=!generated?'source-generation-failed':!promoted?'source-promotion-pending':null"));
  assert.ok(workflow.includes("routingBlockers:['roblox-source-promotion-pending']"));
  assert.ok(workflow.includes("item.robloxSourceCandidateReadyAt"));
  assert.ok(workflow.includes("item.robloxSourceCandidateBranch"));
  assert.ok(workflow.includes('ROBLOX_SOURCE_PROMOTION_PENDING_COUNT'));
});

test('Roblox package completion has one canonical continuation into preflight and actual Studio runtime',()=>{
  const continuation=fs.readFileSync(new URL('../.github/workflows/company-development-roblox-runtime-continuation.yml',import.meta.url),'utf8');
  assert.ok(continuation.includes('workflows: [Company DEVELOPMENT_CONFIRMED Roblox Runtime]'));
  assert.ok(continuation.includes('Roblox five-lead preflight'));
  assert.ok(continuation.includes('Roblox Studio runtime'));
  assert.ok(continuation.includes('ROBLOX_ACTUAL_STUDIO_RUNTIME_REQUIRED=YES'));
  assert.ok(continuation.includes('ROBLOX_FAKE_RUNTIME_PASS=FORBIDDEN'));
  assert.ok(!continuation.includes('company-development-roblox-bootstrap.mjs'));
  assert.ok(!continuation.includes('company-development-roblox-package.mjs'));
});
