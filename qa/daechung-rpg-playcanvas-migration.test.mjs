import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root=fs.readFileSync('web-games/daechung-rpg/index.html','utf8');
const html=fs.readFileSync('web-games/daechung-rpg/playcanvas/index.html','utf8');
const main=fs.readFileSync('web-games/daechung-rpg/playcanvas/main.mjs','utf8');
const worker=fs.readFileSync('_worker.js','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const licenses=fs.readFileSync('web-games/daechung-rpg/playcanvas/assets/ASSET_LICENSES.md','utf8');
const migration=JSON.parse(fs.readFileSync('web-games/daechung-rpg/playcanvas/migration.json','utf8'));

test('root route remains cut over to PlayCanvas with legacy fallback',()=>{
  assert.match(root,/location\.replace\('\.\/playcanvas\/\?v=3d-cutover-20260921'\)/);
  assert.match(root,/q\.get\('legacy'\)==='1'/);
  assert.match(root,/rpg\.html\?v=19a/);
});
test('PlayCanvas gameplay systems remain intact',()=>{
  assert.match(html,/playcanvas@2\.22\.2/);
  assert.match(main,/new pc\.Application/);
  assert.match(main,/MULTI_SUPABASE_URL/);
  assert.match(main,/AI_ROLES=/);
  assert.match(main,/function useJobSkill\(\)/);
  assert.match(main,/d5:\{name:'던전 5/);
});
test('Cloudflare and service worker keep native RPG touch path safe',()=>{
  assert.match(worker,/url\.pathname\.startsWith\('\/web-games\/daechung-rpg\/'\)\)return response/);
  assert.match(sw,/jaewoon-pwa-v24/);
  assert.match(sw,/url\.pathname\.startsWith\('\/web-games\/daechung-rpg\/'\)/);
  assert.match(sw,/cache:'no-store'/);
});
test('cartoon assets load locally with primitive fallback',()=>{
  assert.match(main,/SLIME_GLB_BASE64/);
  assert.match(main,/loadFromUrlAndFilename/);
  assert.match(main,/instantiateRenderEntity/);
  assert.match(main,/CARTOON\.warrior/);
  assert.match(main,/trainer-archer'\?CARTOON\.ranger/);
  assert.match(main,/trainer-mage'\?CARTOON\.wizard/);
  assert.match(main,/\/슬라임\/\.test\(name\)/);
  assert.match(main,/cartoon asset fallback/);
  assert.match(main,/__fallbackVisual/);
});
test('dark soft-cartoon isometric visual tuning is present',()=>{
  assert.match(main,/ambientLight=new pc\.Color\(\.22,\.24,\.30\)/);
  assert.match(main,/new pc\.Color\(1,\.78,\.62\)/);
  assert.match(main,/MoonFill/);
  assert.match(main,/clearColor:new pc\.Color\(\.055,\.065,\.085\),fov:52/);
  assert.match(main,/new pc\.Vec3\(pp\.x,11\.5,pp\.z\+13\.2\)/);
  assert.match(main,/RoofL/);assert.match(main,/RoofR/);
  assert.match(main,/PortalLight-/);
  assert.match(main,/TownPath/);
});
test('asset provenance is recorded as CC0',()=>{
  assert.match(licenses,/Quaternius RPG Characters/);
  assert.match(licenses,/Quaternius Animated Monsters/);
  assert.match(licenses,/CC0 1\.0/);
});
test('migration records phase 8 visual pass without claiming live verification',()=>{
  assert.equal(migration.phase,8);
  assert.equal(migration.phaseName,'CARTOON_ASSET_VISUAL_PASS');
  assert.equal(migration.visualDirection,'DARK_FANTASY_SOFT_CARTOON_ISOMETRIC');
  assert.equal(migration.cutoverStatus.routeSwitched,true);
  assert.equal(migration.cutoverStatus.liveRuntimeVerified,false);
  assert.ok(migration.completedSystems.includes('Quaternius Warrior player asset'));
  assert.ok(migration.completedSystems.includes('portal point lighting'));
});
