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

test('rule5 permanently binds mandatory verified CC0 replacement and shared consumer-safe cleanup to all game workers',()=>{
  const rule=roadmap.ownerCanonicalRules?.rule5;
  assert.equal(rule?.enabled,true);
  assert.equal(rule?.automaticContractBinding,true);
  assert.equal(rule?.cc0OriginalRequired,true);
  assert.equal(rule?.sourceAndLicenseEvidenceRequired,true);
  assert.equal(rule?.sourceHashAndModificationLineageRequired,true);
  assert.equal(rule?.gameSpecificModificationRequired,true);
  assert.deepEqual(rule?.allowedAssetLicenses,['CC0','CC0-1.0','CC0 1.0 Universal']);
  assert.equal(rule?.replacementScope,'ALL_SELF_AUTHORED_ASSET_LIBRARIES_AND_THEIR_EXISTING_CONSUMERS');
  assert.equal(rule?.selfAuthoredLowQualityAssetsMustBePermanentlyDeleted,true);
  assert.equal(rule?.regenerationOrReintroductionForbidden,true);
  assert.equal(rule?.sharedSelfAuthoredAssetsMustBePermanentlyDeleted,true);
  assert.equal(rule?.inactiveGamesMustRemainUnchanged,true);
  assert.equal(rule?.inactiveGameAssetsMustNotBeDeleted,true);
  assert.equal(rule?.existingPipelineOnly,true);
  assert.equal(rule?.existingGameRulesSaveBalanceAndLockedF0F9SequencePreserved,true);
  assert.ok(rule?.deletionOrder?.includes('CHECK_ALL_REMAINING_CONSUMERS'));
  assert.ok(rule?.deletionOrder?.includes('DELETE_REPLACED_LOW_QUALITY_SOURCE_AND_LIBRARY_ENTRY_ONLY_WHEN_NO_INACTIVE_CONSUMER'));

  const agents=['graphics','audio','director','development','qa','release','planning','homepage'];
  for(const agent of agents){
    const contents=read(`.github/agents/${agent}.agent.md`);
    assert.match(contents,/## 상시 공지 — 기존 제작물 전부 검증된 CC0 원본 기반으로 교체/,agent);
    assert.match(contents,/ownerCanonicalRules\.rule5/,agent);
    assert.match(contents,/issues\/8871/,agent);
    assert.match(contents,/기존 자체 제작물도 최종적으로 모두 교체/,agent);
    assert.match(contents,/비활성 게임과 공유 소비자는 원상 보존/,agent);
    assert.match(contents,/공지 등록은 교체 완료나 테스트 PASS 증거가 아니다/,agent);
  }
  const graphics=read('.github/agents/graphics.agent.md');
  const audio=read('.github/agents/audio.agent.md');
  const director=read('.github/agents/director.agent.md');
  assert.doesNotMatch(graphics,/직접 제작으로 전환한다|Blender\/Python 기반 원본 제작/);
  assert.doesNotMatch(audio,/외부 에셋은 CC0 또는 상업 이용/);
  assert.doesNotMatch(director,/외부 시각\/음원 에셋은 상업 이용과 수정 허용/);
});
