import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const root = 'roblox-games/simple-rpg/';
const get = relative => fs.readFileSync(root + relative, 'utf8');
const server = get('server/Game.server.luau');
const client = get('client/Game.client.luau');
const data = get('shared/ProgressionData.luau');
const config = get('shared/GameConfig.luau');
const tree = get('shared/TechTreeData.luau');

test('age progression data is strict, acyclic, and has original three-tier ingredients', () => {
  assert.match(data, /^--!strict/);
  assert.doesNotMatch(data, /\brequire\s*\(/);
  for (const item of ['StoneSpear', 'BronzeIngot', 'BronzeSword', 'IronIngot', 'IronGreatsword']) {
    assert.match(data, new RegExp(item + '\\s*=\\s*\\{'));
  }
  for (const field of ['CivWood=10, CivStone=10','CivCopperOre=15, CivTinOre=15','CivIronOre=20, CivCoal=20']) {
    assert.ok(data.includes(field), field);
  }
  assert.match(data, /YieldField="CivBronzeIngot", YieldCount=5/);
});

test('all five requested civilization buildings are race/era/cost scoped', () => {
  for (const name of ['StoneWall','DangunAltar','Pyramid','Colosseum','DrakkarShipyard']) {
    assert.ok(data.includes(name + ' ='), name);
    assert.match(server, /local function civBuild\(player, buildingKey\)/);
    assert.match(config, new RegExp('Civ' + name + '\\s*=\\s*0'));
  }
  for (const constraint of ['definition.RequiredRace','definition.MinimumTech','definition.RequiredMetric','civSpend(player, definition.Costs)','civRestoreBuildings(player)']) {
    assert.ok(server.includes(constraint), constraint);
  }
});

test('existing data store identity and full 72 tech chain are kept', () => {
  assert.match(config, /GameId\s*=\s*"simple-rpg"/);
  assert.match(server, /GetDataStore\("simple-rpg-development-v1"\)/);
  assert.match(server, /UpdateAsync\("player:"\s*\.\.\s*player\.UserId/);
  assert.match(tree, /assert\(id == 72, "72 TECHS REQUIRED"\)/);
  assert.match(server, /nextID == 15.*CivBoarKills/);
  assert.match(server, /nextID == 29.*CivBronzeSmelts/);
  assert.match(server, /nextID == 45.*CivIronKnightKills/);
  for (const item of ['CivStoneSpear','CivBronzeSword','CivIronGreatsword','CivEquippedWeapon','CivHide','CivCoreCrystal','CivDarkIron']) {
    assert.match(config, new RegExp(item + '\\s*=\\s*0'));
  }
});

test('server validates resources, station distance, equipped weapon, and grants drop once on death', () => {
  for (const marker of ['ProgressionData.GetRecipe(itemKey)','civNearStation(player, recipe.Station)','civSpend(player, recipe.Costs)',
  'definition.RequiredRace ~= 0','(root.Position - center).Magnitude > 28',
  'readNumber(player, "CivEquippedWeapon", 0)','chosen.Special == "WildBoar"','chosen.Special == "BronzeGolem"','chosen.Special == "IronKnight"',
  'civIncrease(player, "CivHide", 1)','civIncrease(player, "CivCoreCrystal", 1)','civIncrease(player, "CivDarkIron", 1)']) {
    assert.ok(server.includes(marker), marker);
  }
  assert.match(server, /CivCraft = civCraft, CivBuild = civBuild, CivEquip = civEquip/);
  assert.match(server, /actionId == "CivCraft"/);
  assert.match(server, /if chosen\.Humanoid\.Health <= 0 then/);
});

test('real world nodes, workstations, mobs and touch-safe production menus are wired', () => {
  for (const marker of ['Type = "CopperOre"','Type = "TinOre"','Type = "IronOre"','Type = "Coal"',
    'civSpawnEnemy(id, center, "WildBoar")','civSpawnEnemy(id, center, "BronzeGolem")',
    'civSpawnEnemy(id, center, "IronKnight")','Key="Bench"','Key="Furnace"','Key="BlastFurnace"']) {
    assert.ok(server.includes(marker), marker);
  }
  for (const marker of ['ProgressionData.RecipeKeys()','ProgressionData.StructureKeys()',
  'remote:FireServer("CivCraft", key)','remote:FireServer("CivBuild", key)',
  'remote:FireServer("CivEquip", key)','"CraftMenu", "제작"','"BuildingMenu", "건축"']) {
    assert.ok(client.includes(marker), marker);
  }
  assert.match(client, /Enum.KeyCode.V then civOpen\("Crafts"\)/);
  assert.match(client, /Enum.KeyCode.B then civOpen\("Buildings"\)/);
});
