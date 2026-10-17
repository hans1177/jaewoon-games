// Game-scoped regression for the actual Cat Step WebGL2 migration.
// Runtime draw and touch proof is in the existing CDP browser smoke.
import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const html=fs.readFileSync('web-games/cat-step/index.html','utf8');
const js=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(x=>x[1]).join('\n');

test('Cat Step uses native real 3D meshes and depth instead of 2D sprite projection',()=>{
  assert.match(js,/getContext\('webgl2'/);
  assert.match(js,/gl\.enable\(gl\.DEPTH_TEST\)/);
  assert.match(js,/gl\.drawArrays\(gl\.TRIANGLES/);
  assert.match(js,/gl\.uniform3f\(uSize/);
  assert.match(js,/gl\.uniform3f\(uOffset/);
  assert.match(js,/makePyramid\(\)/);
  assert.match(js,/drawCat3d\(pose\)/);
  assert.match(js,/__catStep3dDiagnostics/);
  assert.doesNotMatch(js,/getContext\(['"]2d/);
  assert.doesNotMatch(html,/<script\s+src=/i,'avoid external renderer download');
  assert.doesNotThrow(()=>new vm.Script(js));
});

test('Cat Step original rules, touch inputs, restart and existing saves remain untouched',()=>{
  for(const marker of ["cat-step-best","function nextLane(lane)","function speedTier()",
    "function jumpDuration()","function resetSteps()","function attempt(dir)",
    "function finishCorrect()","function gameOver()","function begin()",
    "$('left').addEventListener('pointerdown'","$('right').addEventListener('pointerdown'",
    "$('start').addEventListener('click',begin)","function catPose(now)"]){
    assert.ok(js.includes(marker),marker);
  }
  assert.match(js,/Math\.max\(150,280-\(speedTier\(\)-1\)\*18\)/);
  assert.match(js,/localStorage\.setItem\('cat-step-best'/);
  assert.match(js,/mobileRender\?1:1\.5/);
  assert.match(js,/document\.hidden/);
  assert.match(html,/id="score"/);
  assert.match(html,/id="best"/);
  assert.match(html,/id="left"/);
  assert.match(html,/id="right"/);
});

test('Vibe coding worker explicitly enforces real GPU 3D, library reuse and device input evidence',()=>{
  const worker=fs.readFileSync('tools/vibe2-source-worker.mjs','utf8');
  assert.match(worker,/REAL WEB 3D IMPLEMENTATION:/);
  assert.match(worker,/3D MOBILE BUDGET AND PROOF:/);
  assert.match(worker,/WebGL2\/WebGL context/);
  assert.match(worker,/first real touch input changing gameplay/);
  assert.match(worker,/approved reusable local GLB/);
  const smoke=fs.readFileSync('qa/vibe2-development-web-browser-smoke.mjs','utf8');
  assert.match(smoke,/DEVELOPMENT_WEB_REAL_3D_RUNTIME=cat-step:WEBGL2_DEPTH_MESH_INPUT_PASS/);
  assert.match(smoke,/actual3d\?\.draws>=15/);
});
