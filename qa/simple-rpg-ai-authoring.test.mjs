import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = 'roblox-games/simple-rpg';
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const server = read('server/Game.server.luau');
const client = read('client/Game.client.luau');
const companion = read('server/CompanionAI.luau');
const config = read('shared/GameConfig.luau');
const project = JSON.parse(read('default.project.json'));

test('Rojo source owns companion module; exact title preserves internal save identity', () => {
  assert.equal(project.name, '대충알피지');
  assert.equal(project.tree.ServerScriptService.GameServer.$path, 'server');
  assert.match(config, /GameId\s*=\s*"simple-rpg"/);
  assert.match(config, /GameName\s*=\s*"대충알피지"/);
  assert.match(server, /GetDataStore\("simple-rpg-development-v1"\)/);
  assert.match(client, /"CivilizationTitle", "대충알피지"/);
});

test('new companion module is strict and has typed authority interface', () => {
  assert.equal(companion.split('\n')[0], '--!strict');
  assert.match(companion, /function CompanionAI\.Command\(player: Player, command: any, hasCivilization: boolean\): boolean/);
  assert.match(companion, /function CompanionAI\.Tick\(enemies:/);
  assert.match(companion, /Players\.PlayerRemoving:Connect\(remove\)/);
  assert.match(server, /local CompanionAI = require\(script\.Parent:WaitForChild\("CompanionAI"\)\)/);
  assert.match(server, /CivCompanion = civCompanion/);
  assert.match(server, /actionId == "CivSelect" or actionId == "CivCompanion"/);
  assert.match(server, /CompanionAI\.Tick\(civEnemies, civNodes, civIncrease\)/);
  assert.doesNotMatch(companion, /RemoteEvent|\.OnServerEvent|:FireServer\(/);
});

test('existing combat, research, gather and save gates stay in charge', () => {
  for (const str of [
    'civNowReady(player, "Gather", civ.GatherCooldown)',
    'civ.BaseParryWindow',
    'civIncrease(player, "CivResearch", 8)',
    'UpdateAsync("player:" .. player.UserId',
    'if now - previous < Config.RateLimitSeconds then return end',
    'player:GetAttribute("CivReady") ~= true',
  ]) assert.ok(server.includes(str), str);
  assert.match(server, /gatherPrompt\.Triggered:Connect\(function\(gatherer\)/);
  assert.match(server, /landmarkPrompt\.Triggered:Connect\(function\(visitor\)/);
  assert.match(server, /civGather\(gatherer\)/);
  assert.match(server, /\(root.Position - node.Position\)\.Magnitude > 12/);
});

test('ecology is bounded to the existing world and does not grant farming rewards', () => {
  assert.match(server, /civSpawnGrazer\(id, center\)/);
  assert.match(server, /civWildlife\[enemy.RaceID\]/);
  assert.match(server, /grazer\.Humanoid:TakeDamage\(8\)/);
  assert.match(server, /now - grazer.LastPredated >= 20/);
  assert.doesNotMatch(server.slice(server.indexOf('-- Predation runs only')), /civIncrease\(/);
  assert.match(companion, /increase\(player, "CivWood", 1\)/);
  assert.match(companion, /now - state.LastGather >= 8/);
});

test('module requires stay acyclic across introduced server ownership', () => {
  const module = path.join(root, 'server/CompanionAI.luau');
  const files = [path.join(root, 'server/Game.server.luau'), module];
  const graph = new Map(files.map(f => [f, []]));
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const parentRequires = [...content.matchAll(/require\(script\.Parent:WaitForChild\("([\w]+)"\)\)/g)];
    for (const match of parentRequires) {
      const dependency = path.join(path.dirname(file), match[1] + '.luau');
      if (graph.has(dependency)) graph.get(file).push(dependency);
    }
  }
  const active = new Set();
  const done = new Set();
  function check(file) {
    if (active.has(file)) throw new Error('CIRCULAR_MODULE_DEPENDENCY: ' + file);
    if (done.has(file)) return;
    active.add(file);
    for (const dependency of graph.get(file) || []) check(dependency);
    active.delete(file);
    done.add(file);
  }
  for (const file of files) check(file);
});

test('companion UX is accessible by mobile button and keyboard shortcut', () => {
  assert.match(client, /"CompanionMenu", "AI 동료"/);
  assert.match(client, /remote:FireServer\("CivCompanion", item\[1\]\)/);
  assert.match(client, /Enum.KeyCode.C then civOpen\("Companions"\)/);
});

test('v2.1 shared types and era browser preserve authoritative research and save flow', () => {
  const types = read('shared/TypeDefinitions.luau');
  assert.ok(types.startsWith('--!strict'));
  for (const name of ['RaceInfo', 'PlayerData', 'TechNode']) {
    assert.ok(types.includes('export type ' + name + ' = {'));
  }
  assert.ok(types.includes('TechProgress: {[number]: boolean}'));
  assert.ok(client.includes('for _, tech in ipairs(TechTreeData.All()) do'));
  assert.ok(client.includes('if tech.Era == civTechEra then'));
  assert.ok(client.includes('"TechEra" .. era'));
  assert.ok(client.includes('civTechEra = selectedEra'));
  assert.ok(server.includes('GetDataStore("simple-rpg-development-v1")'));
});

test('server-owned civilization remotes use the existing save, guard, dodge and research authority', () => {
  for (const name of ['ParryEvent', 'DodgeEvent', 'UpdateTechEvent', 'SyncInventoryEvent']) {
    assert.ok(server.includes('ensureRemote("' + name + '", "RemoteEvent")'), name);
  }
  assert.ok(server.includes('ensureRemote("UnlockTechRequest", "RemoteFunction")'));
  assert.ok(server.includes('unlockTechRequest.OnServerInvoke = function(player, techID)'));
  assert.ok(server.includes('return civResearch(player, techID)'));
  assert.ok(server.includes('requestedTechID ~= nextID'));
  assert.ok(server.includes('requestedTechID % 1 ~= 0'));
  assert.ok(server.includes('if player:GetAttribute("CivReady") ~= true then return false'));
  assert.ok(server.includes('civNowReady(player, "Research", 0.3)'));
  assert.ok(server.includes('civIncrease(player, "Civ" .. resource, -math.ceil(cost * factor))'));
  assert.ok(server.includes('setNumber(player, "CivTech", nextID)'));
  assert.ok(server.includes('updateTechEvent:FireClient(player, nextID, tech.Era)'));
  assert.ok(server.includes('parryEvent.OnServerEvent:Connect(function(player)'));
  assert.ok(server.includes('dodgeEvent.OnServerEvent:Connect(function(player)'));
  assert.ok(server.includes('civGuard(player)'));
  assert.ok(server.includes('civDodge(player)'));
  assert.ok(server.includes('store:UpdateAsync("player:" .. player.UserId'));
  assert.ok(server.includes('syncInventoryEvent:FireClient(player, snapshot)'));
  assert.ok(server.includes('player.AttributeChanged:Connect(function(name)'));
  assert.ok(server.includes('queueInventorySync(player)'));
  assert.doesNotMatch(server, /return true, "기술 연구가 성공적으로 완료되었습니다!"/);
});

test('tech replies and server inventory snapshots update the actual in-game UI', () => {
  assert.ok(client.includes('unlockTechRequest:InvokeServer(id)'));
  assert.ok(client.includes('updateTechEvent.OnClientEvent:Connect(function(techID, era)'));
  assert.ok(client.includes('syncInventoryEvent.OnClientEvent:Connect(function(updatedInventory)'));
  assert.ok(client.includes('inventorySnapshot[item[1]] or player:GetAttribute(item[1])'));
  assert.ok(client.includes('researchRequestPending = true'));
  assert.ok(client.includes('parryEvent:FireServer()'));
  assert.ok(client.includes('dodgeEvent:FireServer()'));
  assert.ok(client.includes('civOpen("Inventory")'));
  assert.doesNotMatch(client, /syncInventoryEvent:FireServer\(/);
  assert.doesNotMatch(client, /updateTechEvent:FireServer\(/);
  assert.equal(project.tree.ReplicatedStorage.Shared.$path, 'shared');
  assert.equal(project.tree.ServerScriptService.GameServer.$path, 'server');
  assert.equal(project.tree.StarterPlayer.StarterPlayerScripts.GameClient.$path, 'client');
});
