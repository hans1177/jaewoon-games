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
  assert.match(server, /civGather\(gatherer,\s*resource\.Type\)/);
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

test('timed crafting uses actual persisted inventory, tech and server station validation', () => {
  const recipes = read('shared/CraftingRecipeData.luau');
  assert.ok(recipes.startsWith('--!strict'));
  for (const token of ['RecipeID = 1', 'ItemName = "석기 도끼"', 'RequiredTechID = 1',
    'CraftTime = 2', 'CivWood = 5', 'CivStone = 3', 'RecipeID = 2',
    'ItemName = "청동 검"', 'RequiredTechID = 29', 'CraftTime = 5',
    'CivCopperOre = 10', 'CivTinOre = 5']) assert.ok(recipes.includes(token), token);
  assert.ok(config.includes('CivStoneAxe = 0'));
  assert.ok(server.includes('ensureRemote("CraftRequestRemote", "RemoteEvent")'));
  assert.ok(server.includes('craftRequestRemote.OnServerEvent:Connect(function(player, recipeID)'));
  assert.ok(server.includes('CraftingRecipeData.GetRecipe(recipeID)'));
  assert.ok(server.includes('not civNearStation(player, recipe.Station)'));
  assert.ok(server.includes('readNumber(player, "CivTech", 0) < recipe.RequiredTechID'));
  assert.ok(server.includes('task.delay(recipe.CraftTime, function()'));
  assert.ok(server.includes('local paid, missing = civSpend(player, recipe.Ingredients)'));
  assert.ok(server.includes('civIncrease(player, recipe.OutputField, recipe.OutputAmount)'));
  assert.ok(server.includes('pendingTimedCraft[player] = nil'));
  assert.ok(server.includes('race.ID == 24 and (best.Type == "Stone"'));
  assert.ok(client.includes('CraftingRecipeData.RecipeIDs()'));
  assert.ok(client.includes('craftRequestRemote:FireServer(recipeID)'));
  assert.ok(client.includes('{"CivStoneAxe", "석기 도끼"}'));
});

test('24-race reserved multiverse teleport is gated by canonical research and save', () => {
  assert.ok(server.includes('ensureRemote("PortalTeleportEvent", "RemoteEvent")'));
  assert.ok(server.includes('portalTeleportEvent.OnServerEvent:Connect(function(player, destinationID)'));
  assert.ok(server.includes('readNumber(player, "CivTech", 0) < 72'));
  assert.ok(server.includes('destinationID % 1 ~= 0 or not RaceData.GetRace(destinationID)'));
  assert.ok(server.includes('if game.PlaceId <= 0 then'));
  assert.ok(server.includes('if not savePlayer or savePlayer(player) ~= true then'));
  assert.ok(server.includes('options.ShouldReserveServer = true'));
  assert.ok(server.includes('TeleportService:TeleportAsync(game.PlaceId, {player}, options)'));
  assert.ok(server.includes('player:GetJoinData()'));
  assert.ok(server.includes('readNumber(player, "CivTech", 0) >= 72'));
  assert.ok(client.includes('portalTeleportEvent:FireServer(destination)'));
  assert.ok(client.includes('civOpen("Portals")'));
  assert.ok(client.includes('Enum.KeyCode.C then civOpen("Companions")'));
  assert.ok(client.includes('Enum.KeyCode.E then remote:FireServer("CivGather")'));
  assert.doesNotMatch(server, /TARGET_UNIVERSE_PLACE_ID|CivMultiverseKey_/);
});

test('one bounded octree and A-star FSM module uses the existing AI loop', () => {
  const ai = read('server/AdvancedAIEcosystem.luau');
  assert.ok(ai.startsWith('--!strict'));
  assert.ok(ai.includes('PathfindingService:CreatePath('));
  assert.ok(ai.includes('result:ComputeAsync(root.Position, target)'));
  assert.ok(ai.includes('local UPDATE_INTERVAL = 0.5'));
  assert.ok(ai.includes('local MAX_PATHS_IN_FLIGHT = 2'));
  assert.ok(ai.includes('buildOctree('));
  assert.ok(ai.includes('function AdvancedAIEcosystem.ClosestPlayer('));
  assert.ok(server.includes('AdvancedAIEcosystem.RefreshPlayerIndex(now)'));
  assert.ok(server.includes('AdvancedAIEcosystem.ChaseTarget(enemy, root.Position, now)'));
  for (const state of ['Idle', 'Patrol', 'Combat', 'Flee'])
    assert.ok(server.includes('AdvancedAIEcosystem.SetState(enemy, "' + state + '")'));
  assert.ok(server.includes('CompanionAI.Tick(civEnemies, civNodes, civIncrease)'));
  assert.ok(server.includes('grazer.Humanoid:TakeDamage(8)'));
  assert.doesNotMatch(ai, /while true|OnServerEvent|SetAttribute\("Civ/);
});

test('mobile auto-combat rejects arbitrary targets and keeps existing damage/cooldown authority', () => {
  assert.ok(server.includes('ensureRemote("AutoCombatEvent", "RemoteEvent")'));
  assert.ok(server.includes('autoCombatEvent.OnServerEvent:Connect(function(player, actionType, targetModel)'));
  assert.ok(server.includes('if actionType == "SetEnabled" then'));
  assert.ok(server.includes('if typeof(targetModel) ~= "boolean" then return end'));
  assert.ok(server.includes('player:SetAttribute("CivAutoCombatEnabled", targetModel)'));
  assert.ok(server.includes('player:GetAttribute("CivAutoCombatEnabled") ~= true'));
  assert.ok(server.includes('targetModel:GetAttribute("CivilizationEnemy") ~= true'));
  assert.ok(server.includes('enemy.Model == targetModel and enemy.Humanoid.Health > 0'));
  assert.ok(server.includes('(targetRoot.Position - root.Position).Magnitude > 12'));
  assert.ok(server.includes('civAttack(player, targetModel)'));
  assert.ok(server.includes('civNowReady(player, "Attack", civ.AttackCooldown)'));
  assert.ok(server.includes('requiredWeapon > 0 and weapon < requiredWeapon'));
  assert.ok(server.includes('civIncrease(player, "CivResearch", 8)'));
  assert.ok(server.includes('local function civAttack(player, targetModel)'));
  assert.doesNotMatch(server, /targetHumanoid:TakeDamage\(15\)/);
});

test('smart parry is server telegraph-derived, not random and uses original guard window', () => {
  assert.ok(server.includes('enemy:SetAttribute("IsPreparingAttack", false)'));
  assert.ok(server.includes('enemy.Model:SetAttribute("IsPreparingAttack", true)'));
  assert.ok(server.includes('enemy.TargetUserId = target.UserId'));
  assert.ok(server.includes('local intendedUserId = enemy.TargetUserId'));
  assert.ok(server.includes('if intendedUserId == target.UserId then'));
  assert.ok(server.includes('target:GetAttribute("CivAutoCombatEnabled") == true'));
  assert.ok(server.includes('civGuard(target) -- preserves existing GuardCooldown'));
  assert.ok(server.includes('civ.BaseParryWindow'));
  assert.ok(server.includes('civNowReady(player, "Guard", civ.GuardCooldown)'));
  assert.ok(server.includes('enemy.Humanoid.Health <= 0 or now < enemy.StunnedUntil'));
  assert.ok(server.includes('enemy.Model:SetAttribute("IsPreparingAttack", false)'));
  assert.doesNotMatch(server, /math\.random\(\)\s*>\s*0\.7/);
});

test('mobile touch auto combat is optional, enemy-only, bounded and respects prior shortcuts', () => {
  assert.ok(client.includes('local autoCombatEnabled = nativeTouchEnabled'));
  assert.ok(client.includes('local autoCombatToggle'));
  assert.ok(client.includes('"AutoCombatToggle", "자동 전투 ON"'));
  assert.ok(client.includes('autoCombatEvent:FireServer("SetEnabled", autoCombatEnabled)'));
  assert.ok(client.includes('task.wait(0.4)'));
  assert.ok(client.includes('local shortest = 15.0'));
  assert.ok(client.includes('nativeTouchEnabled and autoCombatEnabled and not civPanel.Visible'));
  assert.ok(client.includes('obj:GetAttribute("CivilizationEnemy") == true'));
  assert.ok(client.includes('autoCombatEvent:FireServer("AutoAttack", nearest)'));
  assert.ok(client.includes('UserInputService.TouchStarted:Connect'));
  assert.ok(client.includes('UserInputService.TouchEnded:Connect'));
  assert.ok(client.includes('if distance >= 70 then'));
  assert.ok(client.includes('now - lastTouchTapAt <= 0.32'));
  assert.ok(client.includes('Enum.KeyCode.C then civOpen("Companions")'));
  assert.ok(client.includes('Enum.KeyCode.E then remote:FireServer("CivGather")'));
  assert.ok(client.includes('Enum.KeyCode.F then parryEvent:FireServer()'));
  assert.doesNotMatch(client, /:TakeDamage\(/);
});
