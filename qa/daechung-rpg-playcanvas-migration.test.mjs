// 파일명: qa/daechung-rpg-playcanvas-migration.test.mjs
// PlayCanvas cutover source was removed. Verify the current canonical portal RPG web game instead.
// These are static source regressions, never independent browser-runtime release proof.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root=fs.readFileSync('web-games/daechung-rpg/index.html','utf8');
const worker=fs.readFileSync('_worker.js','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const catalog=JSON.parse(fs.readFileSync('game-catalog.json','utf8'));

test('portal RPG canonical root boots its own playable canvas instead of a deleted PlayCanvas redirect',()=>{
  assert.match(root,/<title>포탈 알피지<\/title>/);
  assert.match(root,/<canvas\b/);
  assert.match(root,/id="startBtn"/);
  assert.match(root,/startBtn\.onclick=\(\)=>/);
  assert.match(root,/window\.__RPG_BASE_READY=true/);
  assert.doesNotMatch(root,/location\.replace\(['"]\.\/playcanvas\//);
  assert.doesNotMatch(root,/대충 RPG|대충알피지/);
});

test('existing portal travel, quest, combat and boss state remain connected',()=>{
  assert.match(root,/function enter\(z\)/);
  assert.match(root,/function portals\(\)/);
  assert.match(root,/function spawnAll\(z\)/);
  assert.match(root,/function spawnHiddenEnemy\(\)/);
  assert.match(root,/function attackNow\(\)/);
  assert.match(root,/function kill\(m\)/);
  assert.match(root,/function damage\(v\)/);
  assert.match(root,/slimeKing/);
  assert.match(root,/questComplete/);
  assert.match(root,/combatTimer>0/);
  assert.match(root,/if\(zone==='f1'&&q===1&&m\.type==='slime'\)/);
});

test('touch movement and action buttons bind to current real game handlers',()=>{
  assert.match(root,/joyEl\.addEventListener\('pointerdown'/);
  assert.match(root,/joyEl\.addEventListener\('pointermove'/);
  assert.match(root,/joyEl\.addEventListener\('pointercancel'/);
  assert.match(root,/joyEl\.addEventListener\('lostpointercapture'/);
  assert.match(root,/joyEl\.addEventListener\('touchstart'/);
  assert.match(root,/joyEl\.addEventListener\('touchmove'/);
  assert.match(root,/attack\.onpointerdown=e=>/);
  assert.match(root,/attackNow\(\)/);
  assert.match(root,/actionBtn\.onpointerdown=e=>/);
  assert.match(root,/useAction\(\)/);
});

test('current web renderer and original gameplay AudioContext stay in the same active file',()=>{
  assert.match(root,/function draw\(\)/);
  assert.match(root,/function loop\(t\)/);
  assert.match(root,/requestAnimationFrame\(loop\)/);
  assert.match(root,/function portal\(px,py,a,b,back=false\)/);
  assert.match(root,/window\.AudioContext\|\|window\.webkitAudioContext/);
  assert.match(root,/bossAggro/);
  assert.match(root,/bossDeath/);
});

test('Cloudflare and service worker use fresh portal game responses without stale version locks',()=>{
  assert.match(worker,/url\.pathname\.startsWith\('\/web-games\/daechung-rpg\/'\)\)return response/);
  assert.match(sw,/url\.pathname\.startsWith\('\/web-games\/daechung-rpg\/'\)/);
  assert.match(sw,/fetch\(request,\{cache:'no-store'\}\)/);
});

test('game-catalog preserves portal RPG identity and separate simple-rpg product',()=>{
  const portal=catalog.games.find(row=>row.id==='daechung-rpg');
  const simple=catalog.games.find(row=>row.id==='simple-rpg');
  assert.ok(portal&&simple);
  assert.equal(portal.name,'포탈 알피지');
  assert.equal(portal.ownerWebEntryFile,'web-games/daechung-rpg/index.html');
  assert.equal(portal.robloxProjectPath,'roblox-games/daechung-rpg');
  assert.equal(simple.name,'대충알피지');
  assert.notEqual(simple.robloxProjectPath,portal.robloxProjectPath);
  assert.ok(!portal.aliases?.includes('대충 RPG'));
});
