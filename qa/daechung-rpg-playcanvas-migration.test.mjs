import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root=fs.readFileSync('web-games/daechung-rpg/index.html','utf8');
const html=fs.readFileSync('web-games/daechung-rpg/playcanvas/index.html','utf8');
const main=fs.readFileSync('web-games/daechung-rpg/playcanvas/main.mjs','utf8');
const worker=fs.readFileSync('_worker.js','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const migration=JSON.parse(fs.readFileSync('web-games/daechung-rpg/playcanvas/migration.json','utf8'));

test('root route cuts over to PlayCanvas and keeps legacy fallback',()=>{
  assert.match(root,/location\.replace\('\.\/playcanvas\/\?v=3d-cutover-20260921'\)/);
  assert.match(root,/q\.get\('legacy'\)==='1'/);
  assert.match(root,/rpg\.html\?v=19a/);
  assert.match(root,/id="joy" hidden/);
});
test('PlayCanvas engine and gameplay systems remain',()=>{
  assert.match(html,/playcanvas@2\.22\.2/);
  assert.match(main,/new pc\.Application/);assert.match(main,/MULTI_SUPABASE_URL/);
  assert.match(main,/AI_ROLES=/);assert.match(main,/function useJobSkill\(\)/);assert.match(main,/d5:\{name:'던전 5/);
});
test('Cloudflare worker does not inject universal controls into daechung-rpg',()=>{
  assert.match(worker,/url\.pathname\.startsWith\('\/web-games\/daechung-rpg\/'\)\)return response/);
});
test('service worker cache generation bumped for cutover',()=>{
  assert.match(sw,/jaewoon-pwa-v24/);
  assert.match(sw,/url\.pathname\.startsWith\('\/web-games\/daechung-rpg\/'\)/);
  assert.match(sw,/cache:'no-store'/);
});
test('migration records route switch without claiming live verification',()=>{
  assert.equal(migration.phase,7);assert.equal(migration.phaseName,'PLAYCANVAS_ROUTE_CUTOVER');
  assert.equal(migration.cutoverStatus.routeSwitched,true);
  assert.equal(migration.cutoverStatus.liveRuntimeVerified,false);
  assert.equal(migration.cutoverStatus.legacyFallback,'/web-games/daechung-rpg/?legacy=1');
});
