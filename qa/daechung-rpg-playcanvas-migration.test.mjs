import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync('web-games/daechung-rpg/playcanvas/index.html','utf8');
const main=fs.readFileSync('web-games/daechung-rpg/playcanvas/main.mjs','utf8');
const migration=JSON.parse(fs.readFileSync('web-games/daechung-rpg/playcanvas/migration.json','utf8'));

test('PlayCanvas migration pins engine and keeps mobile controls',()=>{
  assert.match(html,/playcanvas@2\.22\.2/);
  assert.match(html,/id="joy"/);
  assert.match(main,/setPointerCapture/);
  assert.match(main,/new pc\.Application/);
});

test('phase 2 has real portal traversal and return flow',()=>{
  assert.match(main,/const ZONES=/);
  assert.match(main,/function buildTown\(/);
  assert.match(main,/function buildHunt\(/);
  assert.match(main,/function enterZone\(/);
  assert.match(main,/returnPortal/);
  assert.match(main,/updatePortals\(\)/);
});

test('phase 2 has hunting combat damage death and growth',()=>{
  assert.match(main,/function updateEnemies\(/);
  assert.match(main,/function playerDamage\(/);
  assert.match(main,/function killEnemy\(/);
  assert.match(main,/function addXp\(/);
  assert.match(main,/hero\.gold/);
  assert.match(main,/hero\.lv\+\+/);
  assert.match(html,/id="gold"/);
  assert.match(html,/id="xp"/);
});

test('migration remains parallel until full parity gates pass',()=>{
  assert.equal(migration.strategy,'PARALLEL_MIGRATION_THEN_CUTOVER');
  assert.equal(migration.phase,2);
  assert.equal(migration.phaseName,'PORTAL_HUNTING_COMBAT_LOOP');
  assert.ok(migration.completedSystems.includes('real portal zone traversal'));
  assert.ok(migration.completedSystems.includes('enemy chase and contact damage'));
  assert.ok(migration.cutoverGate.includes('quest/shop/inventory parity'));
  assert.ok(migration.cutoverGate.includes('Android WebView smoke pass'));
});
