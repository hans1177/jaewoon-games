import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync('web-games/daechung-rpg/playcanvas/index.html','utf8');
const main=fs.readFileSync('web-games/daechung-rpg/playcanvas/main.mjs','utf8');
const migration=JSON.parse(fs.readFileSync('web-games/daechung-rpg/playcanvas/migration.json','utf8'));

test('engine and mobile controls remain',()=>{
  assert.match(html,/playcanvas@2\.22\.2/);assert.match(main,/setPointerCapture/);assert.match(main,/new pc\.Application/);
});
test('phase 4 AI party systems remain',()=>{
  assert.match(main,/AI_ROLES=\['무직업','무직업','힐러','힐러','전사','전사','전사','궁수','궁수','궁수'\]/);
  assert.match(main,/goal:15/);assert.match(main,/function updateAiUsers\(dt\)/);
});
test('phase 5 multiplayer uses rooms 1 through 10 and realtime state sync',()=>{
  assert.match(main,/MULTI_SUPABASE_URL/);assert.match(main,/supabase-js@2\.91\.1/);
  assert.match(main,/\^\(\[1-9\]\|10\)\$/);assert.match(main,/player-state/);
  assert.match(main,/function updateMultiplayer\(dt\)/);assert.match(main,/Remote-/);
  assert.match(html,/id="multiRoom"/);assert.match(html,/min="1" max="10"/);
});
test('phase 5 ports later hunting areas and special regions',()=>{
  for(const token of ["f8:{name:'8번 폐허 마을'","f9:{name:'9번 공동묘지'","f10:{name:'10번 빙결 설산'","f11:{name:'11번 저주받은 성'","cliff:{name:'절벽 지대'","amazon:{name:'아마존'"]) assert.ok(main.includes(token),token);
});
test('phase 5 has five dungeons and bosses',()=>{
  for(let i=1;i<=5;i++)assert.ok(main.includes("d"+i+":{name:'던전 "+i),"dungeon "+i);
  assert.match(main,/z\.boss/);assert.match(main,/b\.isBoss=true/);
});
test('migration phase 5 recorded while final smoke gate remains',()=>{
  assert.equal(migration.phase,5);assert.equal(migration.phaseName,'MULTIPLAYER_DUNGEONS_BOSSES');
  assert.ok(migration.completedSystems.includes('multiplayer rooms 1-10'));
  assert.ok(migration.completedSystems.includes('five 3D dungeons'));
  assert.ok(migration.cutoverGate.includes('Android WebView smoke pass'));
});
