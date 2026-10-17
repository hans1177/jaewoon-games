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
  assert.doesNotMatch(client, /Instance\.new\("ScreenGui"\)/);
  assert.equal(project.tree.ReplicatedStorage.Shared.CuratedUiTemplates.$className, 'Folder');
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
  assert.match(server, /civSpawnEnemy\(id, center, nil, 1\)/);
  assert.doesNotMatch(server, /civSpawnGrazer\(/);
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
  assert.ok(server.includes('updateTechEvent:FireClient(player, nextID, tech.Era, factor < 1)'));
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
  assert.match(client, /craftRequestRemote:FireServer\(recipeId\)/);
  assert.match(client, /action == "CivTimedCraft"/);
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
  assert.match(client, /portalTeleportRemote:FireServer\(destination\)/);
  assert.doesNotMatch(client, /civButton\(civMenuRail, "MultiverseMenu"/);
  assert.match(client, /key == Enum.KeyCode.C then/);
  assert.match(client, /key == Enum.KeyCode.E then/);
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
  assert.match(server, /local candidates = targetModel ~= nil and civEnemiesByRace\[targetModel:GetAttribute\("RaceID"\)\] or civEnemies/);
  assert.match(server, /for _, enemy in ipairs\(candidates or \{\}\) do/);
  assert.match(server, /local raceEnemies = typeof\(raceID\) == "number" and civEnemiesByRace\[raceID\] or nil/);
  assert.match(server, /if not raceEnemies then return end\s+local verified = false\s+for _, enemy in ipairs\(raceEnemies\) do/);
  assert.match(server, /enemy\.Model == targetModel and enemy\.Humanoid\.Health > 0/);
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

test('multiverse market uses real balances and bounded server settlement', () => {
  const data = read('shared/TradeMarketData.luau');
  const economy = read('server/MultiverseEconomy.luau');
  assert.ok(data.startsWith('--!strict'));
  assert.ok(economy.startsWith('--!strict'));
  for (const [itemID, base] of [['Marble', 50], ['Gold', 200], ['Spice', 120]]) {
    assert.ok(data.includes('BasePrice = ' + base), itemID);
    assert.ok(data.includes(itemID + ' = {ItemID = "' + itemID + '"'));
  }
  for (const field of ['CivGold', 'CivMarble', 'CivGoldOre', 'CivSpice'])
    assert.ok(config.includes(field + ' = 0'), field);
  assert.ok(server.includes('ensureRemote("TradeRequestRemote", "RemoteEvent")'));
  assert.ok(server.includes('ensureRemote("MarketUpdateEvent", "RemoteEvent")'));
  assert.ok(server.includes('tradeRequestRemote.OnServerEvent:Connect(function(player, itemID, amount, isBuying, currency)'));
  assert.ok(server.includes('amount % 1 ~= 0 or amount < 1 or amount > 20'));
  assert.ok(server.includes('currency ~= "Silver" and currency ~= "Gold"'));
  assert.ok(server.includes('not civNearTradeStall(player)'));
  assert.ok(server.includes('civNowReady(player, "Trade", 0.75)'));
  assert.ok(server.includes('MultiverseEconomy.Quote(itemID, amount, isBuying)'));
  assert.ok(server.includes('MultiverseEconomy.HasSupply(itemID, amount)'));
  assert.ok(server.includes('readNumber(player, moneyField, 0) < price'));
  assert.ok(server.includes('readNumber(player, item.ItemField, 0) < amount'));
  assert.ok(server.includes('civIncrease(player, moneyField, -price)'));
  assert.ok(server.includes('civIncrease(player, item.ItemField, amount)'));
  assert.ok(server.includes('civIncrease(player, item.ItemField, -amount)'));
  assert.ok(server.includes('MultiverseEconomy.ApplyTrade(itemID, amount, isBuying)'));
  assert.ok(server.includes('store:UpdateAsync("player:" .. player.UserId'));
});

test('market dynamics and asynchronous three-caravan supply changes stay bounded', () => {
  const economy = read('server/MultiverseEconomy.luau');
  assert.ok(economy.includes('local MARKET_INTERVAL = 10'));
  assert.ok(economy.includes('local MAX_SUPPLY = 1000'));
  assert.ok(economy.includes('local travelItems = {"Marble", "Gold", "Spice"}'));
  assert.ok(economy.includes('math.clamp(row.InitialSupply / math.max(1, row.CurrentSupply), 0.5, 2)'));
  assert.ok(economy.includes('math.clamp(row.DemandFactor + amount * 0.012, 0.5, 2.5)'));
  assert.ok(economy.includes('math.clamp(row.DemandFactor - amount * 0.008, 0.5, 2.5)'));
  assert.ok(economy.includes('function MultiverseEconomy.StartCaravans(hub: Instance, regions: {[number]: Vector3})'));
  assert.ok(economy.includes('CivilizationTradeCaravans'));
  assert.ok(economy.includes('caravan.Model:PivotTo(CFrame.new(position))'));
  assert.ok(economy.includes('item.CurrentSupply = math.min(MAX_SUPPLY, item.CurrentSupply + 3)'));
  assert.ok(server.includes('MultiverseEconomy.StartCaravans(civHub, civWorlds)'));
  assert.ok(server.includes('if MultiverseEconomy.Tick(now) then'));
  assert.ok(server.includes('marketUpdateEvent:FireAllClients(MultiverseEconomy.Snapshot())'));
  assert.doesNotMatch(economy, /while true|OnServerEvent|:FireServer\(/);
});

test('대충알피지 모험가 로비는 종족 포탈 없이 기존 이동과 저장을 보존한다', () => {
  assert.match(server, /local lobbyGround = civPart\(civHub, "CivilizationLobbyGround"/);
  assert.match(server, /continentGround:SetAttribute\("WalkableGround", true\)/);
  assert.match(server, /lobbyGround:SetAttribute\("WalkableGround", true\)/);
  assert.match(server, /part\.Transparency = 1/);
  assert.doesNotMatch(server, /local lobbyBase = civPart|local lobbyCore = civPart|lobbyLight\.Range = 12/);
  assert.doesNotMatch(server, /local portal = civPart\(civHub, "포털 " \.\. race\.Name/);
  assert.doesNotMatch(server, /portal\.Touched:Connect/);
  assert.doesNotMatch(client, /civButton\(civMenuRail, "MultiverseMenu"/);
  assert.doesNotMatch(client, /civButton\(civMenuRail, "RaceMenu"/);
  assert.match(server, /for id = 1, 24 do/);
  assert.match(server, /GetDataStore\("simple-rpg-development-v1"\)/);
});

test('civilization monsters patrol inside their existing habitat without changing combat or save authority', () => {
  assert.match(server, /NextPatrolAt = 0, PatrolStep = 0/);
  assert.match(server, /enemy\.Model:GetAttribute\("IsRaidBoss"\) ~= true\s+and enemy\.PatrolDestination == nil and now >= \(enemy\.NextPatrolAt or 0\)/);
  assert.match(server, /enemy\.NextPatrolAt = now \+ 0\.7/);
  assert.match(server, /enemy\.PatrolDestination = nil/);
  assert.match(server, /enemy\.NextPatrolAt = now \+ 2 \+ \(enemy\.PatrolStep % 3\)/);
  assert.match(server, /Magnitude <= 16 then\s+civWalkModel\(enemy\.Model/);
  assert.match(server, /civOnEnemyStrike\(enemy, target, now\)/);
  assert.match(server, /GetDataStore\("simple-rpg-development-v1"\)/);
});

test('Conan-style enemy aggro stays inside habitat and returns home without changing strike authority', () => {
  assert.match(server, /targetRoot\.Position\.X - enemy\.Home\.X/);
  assert.match(server, /Magnitude > 22 then\s+target = nil/);
  assert.match(server, /AdvancedAIEcosystem\.SetState\(enemy, "ReturnHome"\)/);
  assert.match(server, /homeOffset\.Magnitude > 12/);
  assert.match(server, /civOnEnemyStrike\(enemy, target, now\)/);
  assert.match(server, /GetDataStore\("simple-rpg-development-v1"\)/);
});

test('civilization monster alert and pack awareness preserve the existing server combat path', () => {
  assert.match(server, /AlertUserId = nil, AlertUntil = 0/);
  assert.match(server, /ally\.RaceID == enemy\.RaceID/);
  assert.match(server, /ally\.Model:GetAttribute\("AIState"\) == "Combat"/);
  assert.match(server, /enemy\.AlertUntil = now \+ \(packEngaged and 0\.3 or 0\.8\)/);
  assert.match(server, /AdvancedAIEcosystem\.SetState\(enemy, "Alert"\)/);
  assert.match(server, /enemy\.Model:GetAttribute\("IsRaidBoss"\) ~= true/);
  assert.match(server, /civOnEnemyStrike\(enemy, target, now\)/);
});

test('same-race enemy index keeps existing pack and patrol scans bounded without changing combat', () => {
  assert.match(server, /local civEnemiesByRace = \{\}/);
  assert.match(server, /table\.insert\(civEnemies, item\)\s+-- Register only spawned, verified enemies; never index rejected external models\.\s+if not civEnemiesByRace\[raceID\] then civEnemiesByRace\[raceID\] = \{\} end\s+table\.insert\(civEnemiesByRace\[raceID\], item\)/);
  assert.equal((server.match(/for _, ally in ipairs\(civEnemiesByRace\[enemy\.RaceID\] or \{\}\) do/g) || []).length, 2);
  assert.doesNotMatch(server, /for _, ally in ipairs\(civEnemies\) do/);
  assert.match(server, /ally\.RaceID == enemy\.RaceID/);
  assert.match(server, /enemy\.AlertUntil = now \+ \(packEngaged and 0\.3 or 0\.8\)/);
  assert.match(server, /groupDestination = ally\.PatrolDestination \+ offset/);
  assert.match(server, /civOnEnemyStrike\(enemy, target, now\)/);
  assert.match(server, /GetDataStore\("simple-rpg-development-v1"\)/);
});

test('external-model monsters no longer use hand-made alert and return-home poses', () => {
  assert.doesNotMatch(client, /creatureMotionLimbNames|creatureImportedRig|state == "Alert" and math\.rad/);
  assert.ok(client.includes('entry.Visual:PivotTo(rootFrame * offset)'));
  assert.ok(client.includes('if entry.LastFrame ~= rootFrame or entry.LastOffset ~= offset then'));
  assert.ok(client.includes('entry.LastFrame = rootFrame'));
  assert.ok(client.includes('entry.LastOffset = offset'))
  assert.ok(client.includes('for _, enemy in ipairs(world:GetChildren()) do'));
  assert.ok(server.includes('enemy.Parent = civHub'));
  assert.match(client, /enemy:GetAttribute\("CreatureAssetSource"\) == "StudioImported"/);
  assert.match(server, /civOnEnemyStrike\(enemy, target, now\)/);
  assert.match(server, /GetDataStore\("simple-rpg-development-v1"\)/);
});

test('existing civilization enemy habitats mirror terrain and keep patrol inside leash', () => {
  assert.match(server, /enemy:SetAttribute\("HabitatBiome", habitatType\)/);
  assert.match(server, /enemy:SetAttribute\("HabitatRaceID", raceID\)/);
  assert.match(server, /habitat == "DESERT"/);
  assert.match(server, /habitat == "SNOW"/);
  assert.match(server, /nextPosition\.X - enemy\.Home\.X/);
  assert.match(server, /Magnitude <= 16 then/);
  assert.match(server, /civOnEnemyStrike\(enemy, target, now\)/);
});

test('wolf and boar require verified imported external meshes; old procedural silhouettes stay deleted', () => {
  assert.doesNotMatch(server, /WolfNeckRuff|WolfChest|BoarShoulderHump|BoarBristle/);
  assert.match(server, /modelKey = special == "WildBoar" and "Boar"/);
  assert.match(server, /special == "StoneWolf" and "Wolf"/);
  assert.match(server, /visualTemplate:GetAttribute\("CuratedExternalAsset"\) == true/);
  assert.match(server, /\(tonumber\(visualTemplate:GetAttribute\("VerifiedRobloxAssetId"\)\) or 0\) > 0/);
  assert.match(server, /child\.CanCollide = false\s+child\.CanTouch = false\s+child\.CanQuery = false/);
  assert.match(server, /GetDataStore\("simple-rpg-development-v1"\)/);
});

test('same-civilization patrol grouping is bounded and excludes raid bosses', () => {
  assert.match(server, /ally\.RaceID == enemy\.RaceID/);
  assert.match(server, /ally\.PatrolDestination/);
  assert.match(server, /groupDestination = ally\.PatrolDestination \+ offset/);
  assert.match(server, /groupDestination\.X - enemy\.Home\.X/);
  assert.match(server, /Magnitude <= 13 then/);
  assert.match(server, /ally\.Model:GetAttribute\("IsRaidBoss"\) ~= true/);
  assert.match(server, /civOnEnemyStrike\(enemy, target, now\)/);
});

test('combat and return-home discard stale habitat patrol waypoints', () => {
  assert.match(server, /enemy\.PatrolDestination = nil\s+enemy\.NextPatrolAt = now \+ 2\s+AdvancedAIEcosystem\.SetState\(enemy, "Combat"\)/);
  assert.match(server, /enemy\.PatrolDestination = nil\s+enemy\.NextPatrolAt = now \+ 2\s+AdvancedAIEcosystem\.SetState\(enemy, "ReturnHome"\)/);
  assert.match(server, /civOnEnemyStrike\(enemy, target, now\)/);
});

test('monster alert clears immediately when a player leaves its habitat', () => {
  assert.match(server, /if not target then\s+enemy\.AlertUserId = nil\s+enemy\.AlertUntil = 0/);
  assert.match(server, /Magnitude > 22 then\s+target = nil/);
  assert.match(server, /AdvancedAIEcosystem\.SetState\(enemy, "ReturnHome"\)/);
});

test('all homemade Roblox HUD, lobby, menu and mockup factories were removed', () => {
  assert.doesNotMatch(client, /Instance\.new\("(ScreenGui|Frame|TextButton|TextLabel|ScrollingFrame|ImageLabel|ImageButton|UIStroke|UIGradient|UICorner)"\)/);
  assert.doesNotMatch(client, /RobloxCommonUI|CommonUI\./);
  assert.doesNotMatch(client, /CivilizationHud|ApprovedScopeHud|ParchmentWelcome|CivilizationMenuToggle|EquipmentPreview|ParchmentAssetSurface|WoodAssetGrain/);
  assert.doesNotMatch(client, /civButton\(|civLabel\(|civOpen\(|autoCombatToggle/);
  assert.equal(project.tree.ReplicatedStorage.Shared.CuratedUiTemplates.$className, 'Folder');
});

test('only visibly textured, licensed and owner-reviewed external GUI can render', () => {
  assert.match(client, /local function validUiTemplate\(template: Instance\): boolean/);
  for (const marker of ['CuratedExternalAsset', 'VisualQualityApproved', 'LicenseVerified', 'VerifiedRobloxAssetId', 'MainHUD']) {
    assert.ok(client.includes(marker), marker);
  }
  assert.match(client, /descendant:IsA\("ImageLabel"\) or descendant:IsA\("ImageButton"\)/);
  assert.match(client, /imported.Parent = player:WaitForChild\("PlayerGui"\)/);
  assert.match(client, /if hud or not validUiTemplate\(template\) or not template:IsA\("ScreenGui"\) then return end/);
  assert.doesNotMatch(client, /Instance\.new\("ScreenGui"\)/);
});

test('curated external UI retains server-verified research, trade, crafting and travel', () => {
  assert.match(client, /invokeExternalAction\(action, argument\)/);
  assert.match(client, /GameAction/);
  assert.match(client, /research:InvokeServer\(id\)/);
  assert.match(client, /craftRequestRemote:FireServer\(recipeId\)/);
  assert.match(client, /portalTeleportRemote:FireServer\(destination\)/);
  assert.match(client, /trade:FireServer\("Snapshot", 0, false, "Silver"\)/);
  assert.match(client, /remote:FireServer\("CivTravel", destination\)/);
  assert.match(client, /remote:FireServer\(action, raceId\)/);
  assert.match(client, /remote:FireServer\(action, tone\)/);
  assert.match(client, /remote:FireServer\(action, value\)/);
  assert.match(client, /marketUpdate.OnClientEvent:Connect/);
  assert.match(client, /inventoryUpdate.OnClientEvent:Connect/);
  assert.match(client, /techUpdate.OnClientEvent:Connect/);
  assert.match(server, /GetDataStore\("simple-rpg-development-v1"\)/);
});

test('native controls and mobile combat remain available even without a GUI', () => {
  assert.match(client, /UserInputService.InputBegan:Connect/);
  assert.match(client, /ContextActionService:BindAction\("RpgPrimaryAction"/);
  assert.match(client, /UserInputService.TouchTapInWorld:Connect/);
  assert.match(client, /autoCombat:FireServer\("AutoAttack", model\)/);
  assert.match(client, /autoCombat:FireServer\("SetEnabled", autoCombatEnabled\)/);
  assert.match(client, /parry:FireServer\(\)/);
  assert.match(client, /dodge:FireServer\(\)/);
  assert.match(client, /foundation:FireServer\("CAMERA_READY"\)/);
  assert.doesNotMatch(client, /:TakeDamage\(|DataStoreService|store:UpdateAsync/);
});

test('handmade creature poses stay removed, imported mesh movement remains', () => {
  assert.doesNotMatch(client, /creatureMotionLimbNames|creatureImportedRig|creatureTelegraphHighlights|civPreviewStyles/);
  assert.match(client, /observed\[enemy\] = \{Visual = visual, Root = core\}/);
  assert.ok(client.includes('entry.Visual:PivotTo(rootFrame * offset)'));
  assert.ok(client.includes('if entry.LastFrame ~= rootFrame or entry.LastOffset ~= offset then'));
  assert.ok(client.includes('entry.LastFrame = rootFrame'));
  assert.ok(client.includes('entry.LastOffset = offset'))
  assert.ok(client.includes('for _, enemy in ipairs(world:GetChildren()) do'));
  assert.ok(server.includes('enemy.Parent = civHub'));
  assert.match(client, /CreatureVisualAssetId/);
});

test('bounded A-star path reuse avoids repeat computation without changing combat authority', () => {
  const ai = read('server/AdvancedAIEcosystem.luau');
  assert.match(ai, /^--!strict/);
  // The hot-path nearest lookup avoids a square root for each indexed player.
  assert.match(ai, /local bestSquared = radius \* radius/);
  assert.match(ai, /local distanceSquared = delta:Dot\(delta\)/);
  assert.match(ai, /return nearest, math\.sqrt\(bestSquared\)/);
  // Old waypoints can only be reused when the target and route are current.
  assert.match(ai, /local GOAL_REPLAN_DISTANCE = 8/);
  assert.match(ai, /local MAX_ROUTE_AGE = 6/);
  assert.match(ai, /if state\.Goal and \(target - state\.Goal\)\.Magnitude >= GOAL_REPLAN_DISTANCE then/);
  assert.match(ai, /if state\.Index <= #points then return points\[state\.Index\]\.Position end/);
  assert.match(ai, /if not state\.Busy and pendingPaths < MAX_PATHS_IN_FLIGHT and now - state\.LastRequested >= MIN_PATH_RETRY then/);
  assert.match(ai, /if paths\[model\] ~= state or model\.Parent == nil then return end/);
  assert.match(ai, /if not desired or \(desired - target\)\.Magnitude >= GOAL_REPLAN_DISTANCE then/);
  assert.match(ai, /function AdvancedAIEcosystem\.ForgetEnemy\(enemy: any\): \(\)/);
  assert.match(ai, /local MAX_PATHS_IN_FLIGHT = 2/);
  assert.match(ai, /local MIN_PATH_RETRY = 3/);
  assert.doesNotMatch(ai, /while true|OnServerEvent|:TakeDamage\(/);
  // The existing server-owned 0.25s tick, telegraph and damage are unchanged.
  assert.match(server, /while task\.wait\(0\.25\) do/);
  assert.match(server, /AdvancedAIEcosystem\.RefreshPlayerIndex\(now\)/);
  assert.match(server, /AdvancedAIEcosystem\.ChaseTarget\(enemy, root\.Position, now\)/);
  assert.equal((server.match(/AdvancedAIEcosystem\.ForgetEnemy\(enemy\)/g)||[]).length, 2);
  assert.match(server, /if enemy\.Humanoid\.Health <= 0 or now < enemy\.StunnedUntil then\s+AdvancedAIEcosystem\.ForgetEnemy\(enemy\)/);
  assert.match(server, /if not target then\s+AdvancedAIEcosystem\.ForgetEnemy\(enemy\)/);
  assert.match(server, /civOnEnemyStrike\(enemy, target, now\)/);
  assert.match(server, /civGuard\(target\)/);
  assert.match(server, /GetDataStore\("simple-rpg-development-v1"\)/);
  assert.match(server, /UpdateAsync\("player:" \.\. player\.UserId/);
});
