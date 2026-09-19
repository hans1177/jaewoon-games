import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=file=>fs.readFileSync(file,'utf8');
const bootstrap=read('tools/company-development-web-bootstrap.mjs');
const confirmed=read('.github/workflows/company-development-confirmed-runtime.yml');
const planner=read('tools/vibe2-auto-planner.mjs');
const runner=read('tools/vibe2-continuous-runner.mjs');
const worker=read('tools/vibe2-source-worker.mjs');

test('Web bootstrap expected signals route to exact Vibe work instead of a generic dead end',()=>{
  assert.match(bootstrap,/VIBE_WEB_IMPLEMENTATION_REQUIRED:WEB_BASE_IMPLEMENTATION:SOURCE_MISSING/);
  assert.match(bootstrap,/VIBE_WEB_IMPLEMENTATION_REQUIRED:\$\{forceRepair\?'WEB_REPAIR':'WEB_BASE_IMPLEMENTATION'\}/);
  assert.match(confirmed,/vibeImplementationSignal=\/\^VIBE_WEB_IMPLEMENTATION_REQUIRED:\(WEB_BASE_IMPLEMENTATION\|WEB_REPAIR\):/);
  assert.match(confirmed,/vibeRequestedStage==='WEB_REPAIR'\?'VIBE_WEB_REPAIR'/);
  assert.match(confirmed,/vibeRequestedStage==='WEB_BASE_IMPLEMENTATION'\?'VIBE_WEB_BASE_IMPLEMENTATION'/);
  assert.match(confirmed,/vibe-web-implementation-required:\$\{vibeRequestedStage\}:\$\{vibeRequestedReason\}/);
  assert.match(confirmed,/sourceRootBootstrapRequired=vibeRequestedStage==='WEB_BASE_IMPLEMENTATION'/);
  assert.match(confirmed,/WEB_VIBE_IMPLEMENTATION_SIGNAL/);
  assert.match(confirmed,/web-gameplay-music/);
});

test('planner and source worker preserve candidate-only missing-source bootstrap safety',()=>{
  assert.match(planner,/WEB_VIBE_REPAIR_REQUIRED/);
  assert.match(planner,/source-root-bootstrap-required/);
  assert.match(planner,/FULL_WEB_GAME_REBUILD SOURCE_ROOT_BOOTSTRAP_ALLOWED/);
  assert.match(runner,/sourceRootBootstrapAllowed/);
  assert.match(runner,/source-root-bootstrap-required/);
  assert.match(runner,/responsibleFiles\.length===1/);
  assert.match(worker,/function sourceRootBootstrapAllowed/);
  assert.match(worker,/order\?\.workerPolicy\?\.sourceRootBootstrapAllowed===true/);
  assert.match(worker,/evidence\.has\('source-root-bootstrap-required'\)/);
  assert.match(worker,/responsibleFiles\[0\]==='index\.html'/);
  assert.match(worker,/if\(!sourceRootExists&&!bootstrap\)throw new Error/);
});

test('strict Web runtime and promotion gates remain present',()=>{
  assert.match(confirmed,/company-development-web-gameplay-validation\.mjs/);
  assert.match(confirmed,/initialScore<80/);
  assert.match(confirmed,/strictScore<80/);
  assert.match(confirmed,/strictScore>=90/);
  assert.match(confirmed,/promotionRevalidation\?\.pass===true/);
  assert.match(confirmed,/meaningfulGameplayMilliseconds\)<1800000/);
  assert.match(runner,/directMainWrite:false/);
});
