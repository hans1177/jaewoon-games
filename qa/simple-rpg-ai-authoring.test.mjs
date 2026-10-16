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
  assert.doesNotMatch(client, /civButton\(civMenuRail, "MultiverseMenu"/);
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

test('market UI requests valid quotes with M and keeps other controls', () => {
  assert.ok(client.includes('TradeMarketData.ItemIDs()'));
  assert.ok(client.includes('marketUpdateEvent.OnClientEvent:Connect(function(quotes, openTrade)'));
  assert.ok(client.includes('tradeRequestRemote:FireServer(selectedItem, 5, true, tradeCurrency)'));
  assert.ok(client.includes('tradeRequestRemote:FireServer(selectedItem, 1, false, tradeCurrency)'));
  assert.ok(client.includes('tradeRequestRemote:FireServer("Currency", 1, true, "Silver")'));
  assert.ok(client.includes('tradeRequestRemote:FireServer("Currency", 1, false, "Gold")'));
  assert.ok(client.includes('tradeRequestRemote:FireServer("Snapshot", 0, false, "Silver")'));
  assert.ok(client.includes('Enum.KeyCode.M then'));
  assert.ok(client.includes('"TradeMenu", "무역"'));
  assert.ok(client.includes('{"CivGold", "골드"}'));
  assert.ok(client.includes('{"CivMarble", "대리석"}'));
  assert.ok(client.includes('Enum.KeyCode.C then civOpen("Companions")'));
  assert.ok(client.includes('Enum.KeyCode.E then remote:FireServer("CivGather")'));
  assert.ok(server.includes('tradePrompt.KeyboardKeyCode = Enum.KeyCode.R'));
  assert.doesNotMatch(client, /player:SetAttribute\("Civ(?:Silver|Gold|Marble|Spice)"/);
});

test('대충알피지 mobile UI uses a responsive scrolling menu without disrupting inventory or combat controls', () => {
  assert.match(client, /civGui\.ZIndexBehavior = Enum\.ZIndexBehavior\.Global/);
  assert.match(client, /civMenuRail = Instance\.new\("ScrollingFrame"\)/);
  assert.match(client, /civMenuLayout = Instance\.new\("UIListLayout"\)/);
  assert.match(client, /civMenuLayout\.Padding = UDim\.new\(0, 8\)/);
  assert.match(client, /civMenuRail\.AutomaticCanvasSize = Enum\.AutomaticSize\.Y/);
  assert.match(client, /GetPropertyChangedSignal\("ViewportSize"\)/);
  assert.match(client, /civPanel\.ZIndex = 10/);
  assert.match(client, /civCloseButton\.ZIndex = 13/);
  assert.match(client, /civList\.ZIndex = 11/);
  assert.match(client, /civMessage = civLabel\(civGui,[\s\S]*UDim2\.new\(1, -134, 0, 43\)/);
  for (const name of ['TechMenu', 'InventoryMenu', 'CraftMenu', 'BuildingMenu',
    'CompanionMenu', 'TradeMenu', 'RegionMapMenu', 'Travel', 'Legacy', 'HousingMenu']) {
    assert.ok(client.includes('civButton(civMenuRail, "' + name + '"'), name);
    assert.ok(!client.includes('civButton(civGui, "' + name + '"'), name + ' must not retain fixed positions');
  }
  assert.match(client, /grid = Instance\.new\("UIGridLayout"\)/);
  assert.match(client, /for _, entry in ipairs\(civButtons\) do/);
  assert.match(client, /autoCombatToggle\.Visible = nativeTouchEnabled/);
  assert.doesNotMatch(client, /for _, child in mainGui:GetDescendants\(\)/);
});

test('대충알피지 popup header does not overlap its close control', () => {
  assert.match(client, /UDim2\.new\(1, -92, 0, 46\), UDim2\.fromOffset\(10, 8\), false\)/);
  assert.match(client, /panelTitle\.TextXAlignment = Enum\.TextXAlignment\.Left/);
  assert.match(client, /civCloseButton\.ZIndex = 13/);
});

test('대충알피지 그래픽 목업 팔레트는 기존 인벤토리·연구 흐름을 유지한다', () => {
  // 원목·가죽·양피지, 기술 노드의 잠금/진행 가능/완료 색상.
  assert.match(client, /label\.TextColor3 = Color3\.fromRGB\(232, 213, 168\)/);
  assert.match(client, /button\.BackgroundColor3 = Color3\.fromRGB\(138, 90, 56\)/);
  assert.match(client, /woodBorder\.Name = "OakBorder"/);
  assert.match(client, /civPanel\.BackgroundColor3 = mode == "Techs" and Color3\.fromRGB\(232, 213, 168\)/);
  for (const rgb of ['95, 110, 60', '115, 110, 103', '44, 74, 110']) {
    assert.ok(client.includes('button.BackgroundColor3 = Color3.fromRGB(' + rgb + ')'));
  }
  // 기존 4×8 UI, 연구 서버 권한 및 모바일 조작을 그대로 사용한다.
  assert.match(client, /for slot = 1, 32 do/);
  assert.match(client, /grid\.FillDirectionMaxCells = 4/);
  assert.match(client, /unlockTechRequest:InvokeServer\(id\)/);
  assert.match(client, /autoCombatToggle\.Visible = nativeTouchEnabled/);
});

test('대충알피지 6칸 장비 미리보기와 5시대 배너는 기존 저장/연구 호출을 보존한다', () => {
  assert.match(client, /gearFrame\.Name = "EquipmentPreview"/);
  assert.match(client, /gearGrid\.FillDirectionMaxCells = 2/);
  assert.match(client, /gearGrid\.Name = "TwoColumnsThreeRows"/);
  assert.match(client, /\{"무기", weaponNames\[equipId \+ 1\], true\}/);
  assert.equal((client.match(/\{"(?:방패|투구|갑옷|장신구|신발)", "미지원", false\}/g) || []).length, 5);
  assert.match(client, /slotBorder\.Color = amount > 0/);
  assert.match(client, /for slot = 1, 32 do/);
  assert.match(client, /eraBanner = civLabel\(civList, "CurrentEraBanner"/);
  assert.match(client, /eraBanner\.LayoutOrder = 6/);
  assert.match(client, /button\.LayoutOrder = id \+ 6/);
  assert.match(client, /previousNodeColor = pendingNode and pendingNode\.BackgroundColor3/);
  assert.match(client, /\(ok and success == true\) and Color3\.fromRGB\(95, 110, 60\) or previousNodeColor/);
  assert.match(client, /unlockTechRequest:InvokeServer\(id\)/);
  assert.match(client, /syncInventoryEvent\.OnClientEvent:Connect/);
  assert.match(config, /GameName = "대충알피지"/);
  assert.match(server, /GetDataStore\("simple-rpg-development-v1"\)/);
});

test('대충알피지 모험가 로비는 종족 포탈 없이 기존 이동과 저장을 보존한다', () => {
  assert.match(server, /local lobbyBase = civPart\(civHub, "광장 석상 기단"/);
  assert.match(server, /local lobbyCore = civPart\(civHub, "광장 차원 심장"/);
  assert.match(server, /local lobbyShops = \{/);
  assert.match(server, /lobbyLight\.Range = 12/);
  assert.doesNotMatch(server, /local portal = civPart\(civHub, "포털 " \.\. race\.Name/);
  assert.doesNotMatch(server, /portal\.Touched:Connect/);
  assert.doesNotMatch(client, /civButton\(civMenuRail, "MultiverseMenu"/);
  assert.doesNotMatch(client, /civButton\(civMenuRail, "RaceMenu"/);
  assert.match(server, /for id = 1, 24 do/);
  assert.match(server, /GetDataStore\("simple-rpg-development-v1"\)/);
});

test('대충알피지 기존 24종족 데이터는 보존하되 로비에서는 종족 선택을 노출하지 않는다', () => {
  const races = read('shared/RaceData.luau');
  assert.match(races, /Visual: string/);
  assert.match(client, /for id = 1, 24 do/);
  assert.match(client, /race\.Name, race\.Landmark, race\.Passive, race\.Visual/);
  assert.match(client, /외형: %s/);
  assert.match(client, /UDim2\.new\(1, -9, 0, 96\)/);
  assert.match(client, /remote:FireServer\("CivSelect", id\)/);
  assert.match(client, /if selected == 0 then/);
  assert.match(server, /CivSelect/);
  assert.doesNotMatch(client, /civButton\(civMenuRail, "RaceMenu"/);
  assert.doesNotMatch(client, /civButton\(civList, "RegionTravel"/);
  assert.match(client, /civButton\(civList, "StartAdventure"/);
  assert.match(server, /if argument ~= selected then return end/);
  assert.match(client, /remote:FireServer\("CivTravel", player:GetAttribute\("CivRaceID"\)\)/);
  assert.match(client, /lobbyPlay = civButton\(lobbyCard, "LobbyPlay"/);
  assert.match(client, /lobbyExplore = civButton\(lobbyCard, "LobbyExplore"/);
  assert.match(server, /character:SetAttribute\("CivTravelCompleted", true\)/);
  assert.match(server, /player:SetAttribute\("CivReady", true\)/);
  assert.match(server, /lobbyStoneTexture\.Texture = "rbxassetid:\/\/128886287832599"/);
});

test('civilization monsters patrol inside their existing habitat without changing combat or save authority', () => {
  assert.match(server, /NextPatrolAt = 0, PatrolStep = 0/);
  assert.match(server, /enemy\.Model:GetAttribute\("IsRaidBoss"\) ~= true\s+and now >= \(enemy\.NextPatrolAt or 0\)/);
  assert.match(server, /enemy\.NextPatrolAt = now \+ 3 \+ \(step % 3\)/);
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

test('Conan-inspired alert and return-home poses are visual-only and preserve server damage', () => {
  assert.match(client, /state == "Alert" and math\.rad\(-9\)/);
  assert.match(client, /state == "ReturnHome" and math\.rad\(4\)/);
  assert.match(client, /local alerting = model:GetAttribute\("AIState"\) == "Alert"/);
  assert.match(client, /elseif returningHome then/);
  assert.match(server, /civOnEnemyStrike\(enemy, target, now\)/);
  assert.match(server, /GetDataStore\("simple-rpg-development-v1"\)/);
});
