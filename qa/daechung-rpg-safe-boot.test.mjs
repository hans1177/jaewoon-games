import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const index=fs.readFileSync('web-games/daechung-rpg/index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');

function inlineScripts(html){
  return [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(m=>m[1]);
}

test('daechung RPG Web entry parses and reaches the restored playable runtime',()=>{
  for(const script of inlineScripts(index))new Function(script);
  assert.match(index,/id="game"/);
  assert.match(index,/id="startBtn"/);
  assert.match(index,/window\.__RPG_BASE_READY=true/);
  assert.match(index,/requestAnimationFrame\(loop\)/);
  for(const name of ['patch-v15.js','patch-v16.js','patch-v17.js','patch-core18.js','patch-v18.js']){
    assert.match(index,new RegExp('src="\\.\\/'+name.replaceAll('.','\\.')+'"'));
    const source=fs.readFileSync('web-games/daechung-rpg/'+name,'utf8');
    assert.doesNotThrow(()=>new Function(source),name);
  }
  assert.doesNotMatch(index,/var buildUrl = "Build"/);
});


test('service worker bypasses stale cache for daechung RPG',()=>{
  new Function(sw);
  assert.match(sw,/jaewoon-pwa-v25/);
  assert.match(sw,/url\.pathname\.startsWith\('\/web-games\/daechung-rpg\/'\)/);
  assert.match(sw,/fetch\(request,\{cache:'no-store'\}\)/);
});


test('daechung Unity Web QA touches the same fixed-screen attack button used by real gameplay',()=>{
  const source=fs.readFileSync('unity-games/daechung-rpg/Assets/Scripts/RuntimeBootstrap.cs','utf8');
  assert.match(source,/DrawPrimaryCombatActionButton\(\)/);
  assert.match(source,/var actionRect = new Rect\(/);
  assert.match(source,/center\.x \/ Screen\.width/);
  assert.match(source,/center\.y \/ Screen\.height/);
  assert.match(source,/GUI\.Button\(actionRect, "ATTACK"\)/);
  assert.match(source,/MOBILE_TARGET game=daechung-rpg role=action/);
  assert.match(source,/MOBILE_INPUT game=daechung-rpg role=action status=PASS/);
  assert.doesNotMatch(source,/var attackRect = GUILayoutUtility\.GetLastRect\(\)/);
  assert.match(source,/Use the fixed ATTACK button for the primary combat action/);
});
