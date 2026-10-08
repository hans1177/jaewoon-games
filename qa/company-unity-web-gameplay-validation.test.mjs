// 파일명: qa/company-unity-web-gameplay-validation.test.mjs
// 역할: 기존 실제 브라우저 QA의 승인된 Unity 환경 메시·증거 해시 검증 회귀.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync(new URL('../tools/company-unity-web-gameplay-validation.mjs',import.meta.url),'utf8');

test('Unity Web performance QA samples live gameplay frames instead of treating boot time as FPS proof',()=>{
  const gameplay=source.indexOf('UNITY_WEB_QA_GENRE_CORE_FUN_EVIDENCE_MISSING');
  const frame=source.indexOf('const framePacing=await page.evaluate');
  const returnInput=source.indexOf("await page.keyboard.press('KeyR')");
  assert.ok(gameplay>=0&&frame>gameplay&&returnInput>frame,'sample while gameplay is active');
  assert.match(source,/requestAnimationFrame\(onFrame\)/);
  assert.match(source,/framePacing\.frameCount<25/);
  assert.match(source,/framePacing\.medianFrameMs>38/);
  assert.match(source,/framePacing\.p95FrameMs>100/);
  assert.match(source,/throw new Error\('UNITY_WEB_QA_FRAME_PACING_FAILED:'/);
  assert.match(source,/measurementSurface:'PLAYWRIGHT_MOBILE_BROWSER_EMULATION'/);
  assert.match(source,/realDeviceVerified:false/);
  assert.match(source,/performance:\{pass:bootMilliseconds<=90000&&fatal.length===0&&framePacing\.medianFrameMs<=38/);
});

test('Unity Web gameplay validation focuses the real canvas before keyboard input',()=>{
  assert.match(source,/const canvas=page\.locator\('canvas'\)\.first\(\)/);
  assert.match(source,/await canvas\.focus\(\);\s*await page\.keyboard\.press\('Digit1'\)/s);
  assert.match(source,/canvasFocusedBeforeKeyboard:true/);
});

test('Unity Web gameplay validation falls back to real browser touch before rejecting gameplay start',()=>{
  const keyAt=source.indexOf("await page.keyboard.press('Digit1')");
  const fallbackAt=source.indexOf("gameplayStartInput='REAL_BROWSER_TOUCH_FALLBACK'");
  const touchAt=source.indexOf('await page.touchscreen.tap(touchX,touchY)',fallbackAt);
  const failureAt=source.indexOf("throw new Error('UNITY_WEB_QA_GAMEPLAY_START_MISSING')");
  assert.ok(keyAt>=0);
  assert.ok(fallbackAt>keyAt);
  assert.ok(touchAt>fallbackAt);
  assert.ok(failureAt>touchAt);
  assert.match(source,/gameplayStartInput='KEYBOARD_DIGIT1'/);
  assert.match(source,/input:\{pass:true,qaMode:'REAL_GAME_FUNCTION_INPUT_AND_REAL_BROWSER_TOUCH',mobileInputObserved,canvasFocusedBeforeKeyboard:true,gameplayStartInput\}/);
});

test('Unity Web gameplay validation refocuses canvas before follow-up keyboard regression actions',()=>{
  assert.match(source,/await canvas\.focus\(\);\s*for\(let i=0;i<20/s);
  assert.match(source,/await canvas\.focus\(\);\s*await page\.keyboard\.press\('KeyR'\)/s);
});

test('approved native world must be observed in the real mobile WebGL browser before gameplay QA accepts it',()=>{
  assert.match(source,/const approvedEnvironment=deployManifest\.approvedEnvironment\|\|\{required:false\}/);
  assert.match(source,/UNITY_WEB_APPROVED_ENVIRONMENT_DEPLOY_BINDING_INVALID/);
  assert.match(source,/text\.includes\('UNITY_WEB_WORLD='\)/);
  assert.match(source,/UNITY_WEB_APPROVED_ENVIRONMENT_NATIVE_AUTHORING_FAILED/);
  assert.match(source,/UNITY_WEB_APPROVED_ENVIRONMENT_MESH_NOT_OBSERVED/);
  assert.match(source,/UNITY_WEB_APPROVED_ENVIRONMENT_GEOMETRY_COUNT_MISMATCH/);
  assert.match(source,/UNITY_WEB_APPROVED_ENVIRONMENT_VISUAL_RUNTIME_NOT_READY/);
  assert.match(source,/runtimeObserved:approvedEnvironment\.required===true\?Boolean\(worldMeshMarker\):false/);
  assert.match(source,/collisionPhysicsVerified:false/);
  const boot=source.indexOf("UNITY_WEB_QA_BOOT_MARKER_MISSING");
  const check=source.indexOf("UNITY_WEB_APPROVED_ENVIRONMENT_MESH_NOT_OBSERVED");
  const gameplay=source.indexOf("UNITY_WEB_QA_GENRE_CORE_FUN_EVIDENCE_MISSING");
  assert.ok(boot>=0&&check>boot&&gameplay>check);
});

test('approved environment deployment identity comes from the existing checked-out Unity project, not synthetic worker PASS',()=>{
  const workflow=fs.readFileSync(new URL('../.github/workflows/unity-web-first-stage-build.yml',import.meta.url),'utf8');
  assert.match(workflow,/approved=pathlib\.Path\('unity-games'\)\/game\/'Assets\/Resources\/vibe-world-layout\.json'/);
  assert.match(workflow,/'layoutSha256':hashlib\.sha256\(blob\)\.hexdigest\(\)/);
  assert.match(workflow,/'required':True/);
  assert.match(workflow,/'required':False/);
  assert.match(workflow,/if layout\.get\('layoutStatus'\)!='STATIC_LAYOUT_PROPOSED'/);
  assert.match(workflow,/\(root\/'unity-web-deploy-manifest\.json'\)\.write_text/);
});
