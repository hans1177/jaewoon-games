import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const unity=fs.readFileSync('.github/workflows/company-development-unity-runtime.yml','utf8');
const router=fs.readFileSync('.github/workflows/company-development-confirmed-runtime.yml','utf8');
const stages=[
  'Change detection and exact-source reuse',
  'Cheap precheck and checkpoint resume plan',
  'Dispatch one Unity cloud build for this source fingerprint',
  'Bind immutable APK artifact identity',
  'Resolve runtime checkpoint result',
  'Resolve independent QA checkpoint result',
  'Resolve regression checkpoint result',
  'Persist exact checkpoint package even when a later stage fails',
];

test('Unity speed path keeps canonical expensive-stage ordering',()=>{
  let cursor=0;
  for(const stage of stages){
    const pos=unity.indexOf(stage,cursor);
    assert.ok(pos>=cursor,`missing or out-of-order workflow stage: ${stage}`);
    cursor=pos+stage.length;
  }
});

test('checkpoint persistence occurs before explicit stage failure enforcement',()=>{
  const checkpoint=unity.indexOf('Persist exact checkpoint package even when a later stage fails');
  const enforce=unity.indexOf('Enforce stage result after checkpoint is safely captured');
  assert.ok(checkpoint>=0&&enforce>checkpoint);
});

test('same exact build run feeds runtime QA and regression workflows',()=>{
  assert.match(unity,/BUILD_RUN: \$\{\{ steps\.buildref\.outputs\.run_id \}\}/);
  assert.match(unity,/unity-android-runtime-smoke\.yml/);
  assert.match(unity,/unity-android-independent-qa\.yml/);
  assert.match(unity,/unity-android-regression\.yml/);
});

test('selected-platform router repairs legacy Web target paths to the platform source root',()=>{
  assert.match(router,/canonicalTarget=adapter\?`\$\{adapter\.sourceRoot\}\$\{item\.gameId\}`:''/);
  assert.match(router,/oldTarget\.startsWith\(adapter\.sourceRoot\)/);
  assert.match(router,/sourcePath:targetSourcePath/);
  assert.doesNotMatch(router,/fetch-depth:\s*0/);
});

test('Web runtime pins the source revision and does not prepare an unused local model',()=>{
  const exactRefs=router.match(/ref:\s*\$\{\{\s*github\.sha\s*\}\}/g)||[];
  assert.ok(exactRefs.length>=4,`expected exact revision checkouts, got ${exactRefs.length}`);
  assert.doesNotMatch(router,/Prepare free local Web generation model/);
  assert.doesNotMatch(router,/AUTONOMOUS_LOCAL_MODEL/);
  assert.match(router,/WEB_MODEL_SETUP=SKIPPED_UNUSED/);
});

test('Unity source reuse avoids the nested heredoc path that failed in the real canary run',()=>{
  assert.match(unity,/bind_catalog\(\)/);
  assert.doesNotMatch(unity,/node - "\$PROJECT" <<'NODE'[\s\S]{0,900}CHANGE_DETECTION=UNCHANGED_SOURCE_REUSED/);
});

test('canonical router dedupes an already queued or running Unity executor for the same main revision',()=>{
  assert.match(router,/company-development-unity-runtime\.yml\/runs\?per_page=30/);
  assert.match(router,/\.head_sha==\$sha/);
  assert.match(router,/\.status=="queued"/);
  assert.match(router,/\.status=="pending"/);
  assert.match(router,/\.status=="in_progress"/);
  assert.match(router,/UNITY_EXECUTOR_DISPATCH=DEDUPED_EXISTING_RUN/);
  assert.match(router,/gh workflow run company-development-unity-runtime\.yml/);
  assert.match(router,/\.github\/workflows\/company-development-unity-runtime\.yml/);
});
