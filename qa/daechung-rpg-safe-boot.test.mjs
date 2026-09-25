import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const rpg=fs.readFileSync('web-games/daechung-rpg/rpg.html','utf8');
const loader=fs.readFileSync('web-games/daechung-rpg/index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');

function inlineScripts(html){
  return [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(m=>m[1]);
}

test('daechung RPG base script parses and binds critical DOM explicitly',()=>{
  for(const script of inlineScripts(rpg))new Function(script);
  assert.match(rpg,/const \$id=id=>document\.getElementById\(id\)/);
  for(const id of ['lv','gold','hp','xp','quest','attack','talk','start','startBtn','bag','bagList','weaponShop','armorShop','sellShop','dead','respawn']){
    assert.match(rpg,new RegExp("\\$id\\('"+id+"'\\)"),'missing explicit DOM binding: '+id);
  }
  assert.match(rpg,/window\.__RPG_BASE_READY=true/);
  assert.match(rpg,/setPointerCapture\(e\.pointerId\)/);
  assert.match(rpg,/j\.x=dx\/m;j\.y=dy\/m/);
});

test('daechung RPG loader is cache-busted and fail-open after base readiness',()=>{
  for(const script of inlineScripts(loader))new Function(script);
  assert.match(loader,/rpg\.html\?v=19a/);
  assert.match(loader,/win\.__RPG_BASE_READY!==true/);
  assert.match(loader,/PATCHES=\['patch-v15\.js','patch-v16\.js','patch-v17\.js','patch-core18\.js','patch-v18\.js'\]/);
  assert.match(loader,/추가 콘텐츠 일부 실패 · 기본 게임으로 계속/);
});

test('service worker bypasses stale cache for daechung RPG',()=>{
  new Function(sw);
  assert.match(sw,/jaewoon-pwa-v25/);
  assert.match(sw,/url\.pathname\.startsWith\('\/web-games\/daechung-rpg\/'\)/);
  assert.match(sw,/fetch\(request,\{cache:'no-store'\}\)/);
});
