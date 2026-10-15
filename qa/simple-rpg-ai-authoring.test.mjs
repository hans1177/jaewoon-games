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
