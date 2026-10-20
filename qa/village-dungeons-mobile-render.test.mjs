// 파일명: qa/village-dungeons-mobile-render.test.mjs
// [임포트] 기존 원본의 게임 루프와 3D 렌더 최적화 회귀 검사.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// [메인] 경험치, 이동, 저장, 입력 로직과 UI를 그대로 유지해야 한다.
test('village-dungeons keeps combat, progression and save with mobile WebGL quality budget',()=>{
  const html=fs.readFileSync('web-games/village-dungeons/index.html','utf8');
  assert.match(html,/var SAVE_KEY="village-dungeons-v1";/);
  assert.match(html,/function nextXp\(\)\{return state\.level\*100;\}/);
  assert.match(html,/var speed=7\.6;/);
  assert.match(html,/function enemyAI\(/);
  assert.match(html,/function updateCombat\(/);
  assert.match(html,/function movePlayer\(/);
  assert.match(html,/document\.getElementById\("startBtn"\)/);
  assert.match(html,/document\.getElementById\("attackBtn"\)/);
  assert.match(html,/window\.matchMedia\('\(pointer: coarse\)'\)\.matches/);
  assert.match(html,/mobileRender\?1:1\.5/);
  assert.match(html,/if\(!document\.hidden\)/);
  assert.match(html,/new THREE\.WebGLRenderer\(/);
  assert.equal((html.match(/renderer\.render\(scene,camera\)/g)||[]).length,1);
  const inline=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)]
    .map(m=>m[1]).filter(s=>s.trim());
  assert.ok(inline.length>0);
  for(const source of inline)assert.doesNotThrow(()=>new vm.Script(source));
});
