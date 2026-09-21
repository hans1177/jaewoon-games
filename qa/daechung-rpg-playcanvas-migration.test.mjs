import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync('web-games/daechung-rpg/playcanvas/index.html','utf8');
const main=fs.readFileSync('web-games/daechung-rpg/playcanvas/main.mjs','utf8');
const migration=JSON.parse(fs.readFileSync('web-games/daechung-rpg/playcanvas/migration.json','utf8'));

test('PlayCanvas migration pins engine and keeps mobile controls',()=>{
  assert.match(html,/playcanvas@2\.22\.2/);assert.match(html,/id="joy"/);
  assert.match(main,/setPointerCapture/);assert.match(main,/new pc\.Application/);
});
test('portal hunting growth quest shops and equipment remain',()=>{
  assert.match(main,/function buildHunt\(/);assert.match(main,/function updateEnemies\(/);assert.match(main,/function addXp\(/);
  assert.match(main,/function interact\(/);assert.match(main,/function renderShop\(role\)/);assert.match(main,/function renderBag\(/);
});
test('phase 4 has exact ten AI role distribution',()=>{
  assert.match(main,/AI_ROLES=\['무직업','무직업','힐러','힐러','전사','전사','전사','궁수','궁수','궁수'\]/);
  assert.match(main,/function ensureAiUsers\(/);assert.match(main,/function updateAiUsers\(dt\)/);
});
test('phase 4 supports double-click party invite/remove and 15 kill completion',()=>{
  assert.match(main,/addEventListener\('dblclick'/);assert.match(main,/function togglePartyAi\(/);
  assert.match(main,/goal:15/);assert.match(main,/function registerPartyKill\(/);
  assert.match(main,/party\.contrib/);assert.match(main,/기여도/);
});
test('healers only heal while combat roles attack',()=>{
  assert.match(main,/if\(a\.role==='힐러'\)/);
  assert.match(main,/hero\.hp=Math\.min\(hero\.maxHp,hero\.hp\+18\)/);
  assert.match(main,/a\.role==='전사'/);assert.match(main,/a\.role==='궁수'/);
});
test('migration remains parallel until multiplayer and final smoke pass',()=>{
  assert.equal(migration.phase,4);assert.equal(migration.phaseName,'AI_PARTY_CONTRIBUTION_HUNT');
  assert.ok(migration.completedSystems.includes('10 AI users'));
  assert.ok(migration.completedSystems.includes('contribution-based party rewards'));
  assert.ok(migration.cutoverGate.includes('multiplayer parity'));
  assert.ok(migration.cutoverGate.includes('Android WebView smoke pass'));
});
