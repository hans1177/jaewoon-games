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

test('3D foundation includes player, portals, combat and lights',()=>{
  assert.match(main,/const player=/);
  assert.match(main,/portalPositions/);
  assert.match(main,/const enemies=/);
  assert.match(main,/addComponent\('light'/);
  assert.match(main,/attackCooldown/);
});

test('migration stays parallel until parity gates pass',()=>{
  assert.equal(migration.strategy,'PARALLEL_MIGRATION_THEN_CUTOVER');
  assert.equal(migration.phaseName,'3D_FOUNDATION');
  assert.ok(migration.cutoverGate.includes('Android WebView smoke pass'));
  assert.ok(migration.preserveSystems.includes('multiplayer rooms 1-10'));
});
