import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync('web-games/daechung-rpg/playcanvas/index.html','utf8');
const main=fs.readFileSync('web-games/daechung-rpg/playcanvas/main.mjs','utf8');
const migration=JSON.parse(fs.readFileSync('web-games/daechung-rpg/playcanvas/migration.json','utf8'));

test('engine mobile controls and previous systems remain',()=>{
  assert.match(html,/playcanvas@2\.22\.2/);assert.match(main,/setPointerCapture/);assert.match(main,/new pc\.Application/);
  assert.match(main,/AI_ROLES=/);assert.match(main,/MULTI_SUPABASE_URL/);assert.match(main,/d5:\{name:'던전 5/);
});
test('phase 6 has all three job trainers',()=>{
  assert.match(main,/trainer-warrior/);assert.match(main,/trainer-archer/);assert.match(main,/trainer-mage/);
  assert.match(main,/function becomeJob\(/);assert.match(html,/id="jobText"/);
});
test('phase 6 implements warrior mage and archer abilities',()=>{
  assert.match(main,/hero\.job==='전사'/);assert.match(main,/hero\.job==='마법사'/);assert.match(main,/hero\.job==='궁수'/);
  assert.match(main,/slashWave\(\)/);assert.match(main,/자가회복 \+100/);assert.match(main,/jobAtk=hero\.job==='궁수'\?1\.5:1/);
  assert.match(html,/id="skillBtn"/);
});
test('bosses have telegraphed heavy attack',()=>{
  assert.match(main,/m\.isBoss&&d<4\.6/);assert.match(main,/강타 준비/);assert.match(main,/playerDamage\(m\.attack\*2\)/);
});
test('mobile runtime stability guards are present',()=>{
  assert.match(main,/orientationchange/);assert.match(main,/visibilitychange/);assert.match(main,/webglcontextlost/);
  assert.match(main,/maxPixelRatio/);assert.match(main,/resetTouchState/);
});
test('phase 6 records cutover candidate but does not claim live verification',()=>{
  assert.equal(migration.phase,6);assert.equal(migration.phaseName,'JOBS_SKILLS_BOSS_PATTERNS_MOBILE_STABILITY');
  assert.equal(migration.cutoverStatus.routeSwitched,false);assert.equal(migration.cutoverStatus.liveRuntimeVerified,false);
  assert.ok(migration.cutoverStatus.remaining.includes('Android WebView smoke pass'));
});
