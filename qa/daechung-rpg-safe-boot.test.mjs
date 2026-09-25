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

test('daechung RPG Unity Web build artifacts exist',()=>{
  for(const file of [
    'web-games/daechung-rpg/Build/daechung-rpg.loader.js',
    'web-games/daechung-rpg/Build/daechung-rpg.data',
    'web-games/daechung-rpg/Build/daechung-rpg.framework.js',
    'web-games/daechung-rpg/Build/daechung-rpg.wasm'
  ])assert.equal(fs.existsSync(file),true,`missing Unity Web build artifact: ${file}`);
});

test('service worker bypasses stale cache for daechung RPG',()=>{
  new Function(sw);
  assert.match(sw,/jaewoon-pwa-v25/);
  assert.match(sw,/url\.pathname\.startsWith\('\/web-games\/daechung-rpg\/'\)/);
  assert.match(sw,/fetch\(request,\{cache:'no-store'\}\)/);
});
