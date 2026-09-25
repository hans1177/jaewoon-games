import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const index=fs.readFileSync('web-games/daechung-rpg/index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');

function inlineScripts(html){
  return [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(m=>m[1]);
}

test('daechung RPG Unity Web loader parses and binds the current build',()=>{
  for(const script of inlineScripts(index))new Function(script);
  assert.match(index,/id="unity-canvas"/);
  assert.match(index,/var buildUrl = "Build"/);
  assert.match(index,/loaderUrl = buildUrl \+ "\/daechung-rpg\.loader\.js"/);
  assert.match(index,/dataUrl: buildUrl \+ "\/daechung-rpg\.data"/);
  assert.match(index,/frameworkUrl: buildUrl \+ "\/daechung-rpg\.framework\.js"/);
  assert.match(index,/codeUrl: buildUrl \+ "\/daechung-rpg\.wasm"/);
  assert.match(index,/createUnityInstance\(canvas, config/);
});


test('service worker bypasses stale cache for daechung RPG',()=>{
  new Function(sw);
  assert.match(sw,/jaewoon-pwa-v25/);
  assert.match(sw,/url\.pathname\.startsWith\('\/web-games\/daechung-rpg\/'\)/);
  assert.match(sw,/fetch\(request,\{cache:'no-store'\}\)/);
});


test('daechung Unity Web QA uses a real fixed-screen mobile action target',()=>{
  const source=fs.readFileSync('unity-games/daechung-rpg/Assets/Scripts/RuntimeBootstrap.cs','utf8');
  assert.match(source,/DrawQaMobileActionOverlay\(\)/);
  assert.match(source,/var actionRect = new Rect\(/);
  assert.match(source,/center\.x \/ Screen\.width/);
  assert.match(source,/center\.y \/ Screen\.height/);
  assert.match(source,/GUI\.Button\(actionRect, "ATTACK · QA TOUCH"\)/);
  assert.match(source,/MOBILE_TARGET game=daechung-rpg role=action/);
  assert.match(source,/MOBILE_INPUT game=daechung-rpg role=action status=PASS/);
  assert.doesNotMatch(source,/var attackRect = GUILayoutUtility\.GetLastRect\(\)/);
});
