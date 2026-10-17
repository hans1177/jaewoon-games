// 파일명: qa/company-machine-development-lifecycle.test.mjs
// 현재 오너 개발 범위 및 중앙 문서 요약 계약. 이전 Unity 선행 파이프라인 계약은 폐기.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=path=>fs.readFileSync(path,'utf8');
const roadmap=JSON.parse(read('company-learning/platform-release-roadmap.json'));
const architecture=JSON.parse(read('company-learning/company-architecture-map.json'));
const logs=JSON.parse(read('company-learning/company-log-map.json'));
const security=JSON.parse(read('company-learning/security-immune-system.json'));

test('owner-locked 2026-10-17 selected targets are Roblox and regular Web only',()=>{
  assert.equal(roadmap.status,'OWNER_DIRECT_LOCKED');
  assert.equal(roadmap.finalDevelopmentLock.sequenceLock.status,'LOCKED');
  assert.deepEqual(roadmap.ownerActiveDevelopmentScope20261009.activeTargets,['ROBLOX','WEB']);
  assert.equal(roadmap.developmentAccess.ROBLOX,'ALWAYS_ALLOWED');
  assert.equal(roadmap.developmentAccess.WEB,'ALWAYS_ALLOWED');
  for(const target of ['UNITY','UNITY_WEB','UNITY_ANDROID','FORTNITE_UEFN'])
    assert.equal(roadmap.developmentAccess[target],'OWNER_HOLD');
  assert.equal(roadmap.ownerActiveDevelopmentScope20261009.existingPipelineOnly,true);
  assert.equal(roadmap.ownerActiveDevelopmentScope20261009.saveAndBalancePreserved,true);
});

test('retained central maps are descriptive only and cannot authorize historical Unity auto development',()=>{
  assert.equal(architecture.status,'MINIMAL_SUMMARY_NOT_EXECUTION_POLICY');
  assert.equal(logs.status,'MINIMAL_RETAINED_SUMMARY_NON_EXECUTABLE');
  assert.ok(security.status);
  assert.equal(roadmap.ownerActiveDevelopmentScope20261009.unityWebDevelopmentAllowed,false);
  assert.equal(roadmap.ownerActiveDevelopmentScope20261009.unityAndroidDevelopmentAllowed,false);
});

test('canonical game execution stays in the existing Vibe pipeline without historical artbook local models',()=>{
  const core=read('.github/workflows/vibe2-continuous-core.yml');
  const design=read('tools/company-design-cycle.mjs');
  assert.match(core,/VIBE2_WORKER_PROVIDER=GEMINI_API/);
  assert.match(core,/VIBE2_LOCAL_AI_ENABLED=NO/);
  assert.match(design,/DESIGN_ONLY_ARTBOOK_CREATED=NO/);
  assert.equal(fs.existsSync('tools/company-design-artbook.mjs'),false);
  assert.equal(fs.existsSync('tools/artbook-department-runner.mjs'),false);
});
