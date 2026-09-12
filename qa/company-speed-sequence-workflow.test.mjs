import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const unity=fs.readFileSync('.github/workflows/company-development-unity-runtime.yml','utf8');
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
