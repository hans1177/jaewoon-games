// 파일명: qa/realistic-builder-mobile-render.test.mjs
// [임포트] 기존 게임 원본을 직접 검사한다.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// [메인] 게임 규칙과 저장을 변경하지 않고 실제 Three.js 렌더 루프를 최적화했는지 확인.
test('realistic-builder preserves building, drying, input and save while reducing mobile GPU load',()=>{
  const html=fs.readFileSync('web-games/realistic-builder/index.html','utf8');
  assert.match(html,/var SAVE_KEY='realistic-builder-v1';/);
  assert.match(html,/var DRY_MS=60000;/);
  assert.match(html,/dryingIs60Seconds:DRY_MS===60000/);
  assert.match(html,/mudWallNeedsBrickAndMortar:actionById\('mudWall'\)\.cost\.brick===1/);
  assert.match(html,/window\.matchMedia\('\(pointer: coarse\)'\)\.matches/);
  assert.match(html,/mobileRender\?1:1\.35/);
  assert.match(html,/if\(!document\.hidden\)/);
  assert.match(html,/document\.getElementById\('joystick'\)/);
  assert.match(html,/document\.getElementById\('actBtn'\)/);
  assert.match(html,/new THREE\.WebGLRenderer\(/);
  assert.match(html,/new THREE\.ConeGeometry\(/);
  assert.doesNotMatch(html,/survival2\/assets\/(tree|rock)\.png/);
  assert.equal((html.match(/renderer\.render\(scene,camera\)/g)||[]).length,1);
  const inline=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)]
    .map(m=>m[1]).filter(s=>s.trim());
  assert.ok(inline.length>0);
  for(const source of inline)assert.doesNotThrow(()=>new vm.Script(source));
});
