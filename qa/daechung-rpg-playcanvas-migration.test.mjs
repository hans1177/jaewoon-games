import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync('web-games/daechung-rpg/playcanvas/index.html','utf8');
const main=fs.readFileSync('web-games/daechung-rpg/playcanvas/main.mjs','utf8');
const migration=JSON.parse(fs.readFileSync('web-games/daechung-rpg/playcanvas/migration.json','utf8'));

test('PlayCanvas migration pins engine and keeps mobile controls',()=>{
  assert.match(html,/playcanvas@2\.22\.2/);
  assert.match(html,/id="joy"/);assert.match(main,/setPointerCapture/);assert.match(main,/new pc\.Application/);
});
test('phase 2 portal hunting and growth loop remains',()=>{
  assert.match(main,/function buildHunt\(/);assert.match(main,/function updatePortals\(/);
  assert.match(main,/function updateEnemies\(/);assert.match(main,/function killEnemy\(/);assert.match(main,/function addXp\(/);
});
test('phase 3 adds NPC quest shops inventory and equipment visuals',()=>{
  assert.match(main,/function addNpc\(/);assert.match(main,/function nearestNpc\(/);assert.match(main,/function interact\(/);
  assert.match(main,/function renderShop\(role\)/);assert.match(main,/function renderBag\(/);
  assert.match(main,/armorPlate\.enabled/);assert.match(main,/helmet\.enabled/);
  assert.match(main,/state\.questKills\+\+/);assert.match(main,/hero\.gold\+=50/);
  assert.match(html,/id="talk"/);assert.match(html,/id="bag"/);assert.match(html,/id="shop"/);assert.match(html,/id="quest"/);
});
test('phase 3 adds visible movement and attack motion contracts',()=>{
  assert.match(main,/state\.walkT\+=dt\*10/);assert.match(main,/sword\.setLocalEulerAngles\(0,0,-80\)/);
});
test('migration remains parallel until remaining parity gates pass',()=>{
  assert.equal(migration.strategy,'PARALLEL_MIGRATION_THEN_CUTOVER');
  assert.equal(migration.phase,3);assert.equal(migration.phaseName,'NPC_QUEST_SHOPS_EQUIPMENT');
  assert.ok(migration.completedSystems.includes('chief quest flow'));
  assert.ok(migration.completedSystems.includes('inventory equipment UI'));
  assert.ok(migration.cutoverGate.includes('party AI parity'));
  assert.ok(migration.cutoverGate.includes('multiplayer parity'));
});
