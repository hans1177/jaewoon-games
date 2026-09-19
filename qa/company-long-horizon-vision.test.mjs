// 파일명: qa/company-long-horizon-vision.test.mjs
// 역할: 장기 비전이 실행 가능 단계와 연구 단계를 혼동하지 않고 중앙 로드맵에 고정됐는지 검증한다.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const roadmap=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
const architecture=JSON.parse(fs.readFileSync('company-learning/company-architecture-map.json','utf8'));

test('long horizon vision preserves verified staged progression',()=>{
  const vision=roadmap.longHorizonVision;
  assert.equal(vision?.documentIsCode,true);
  assert.equal(vision?.currentExecutableFrontier,'SELF_RECOVERY_SECURITY_IMMUNITY_24H_GAME_CREATION');
  assert.deepEqual((vision?.stages||[]).map(x=>x.id),[
    'VERIFIED_LEARNING',
    'SELF_RECOVERY',
    'SECURITY_IMMUNITY',
    'AUTONOMOUS_24H_GAME_CREATION',
    'VERIFIED_SELF_EXPANSION',
    'MULTIVERSE_PERSISTENT_WORLDS',
    'USER_IDENTITY_CONTINUITY',
    'CONSCIOUSNESS_TRANSFER'
  ]);
  assert.equal(vision?.selfExpansionBoundary?.authoritySelfExpansionForbidden,true);
  assert.equal(vision?.selfExpansionBoundary?.capabilityExpansionAllowed,true);
});

test('consciousness transfer stays research-only until reproducible evidence exists',()=>{
  const vision=roadmap.longHorizonVision;
  const stage=(vision?.stages||[]).find(x=>x.id==='CONSCIOUSNESS_TRANSFER');
  assert.equal(stage?.state,'RESEARCH_UNPROVEN');
  assert.equal(vision?.consciousnessResearchBoundary?.currentScientificStatus,'UNPROVEN');
  assert.equal(vision?.consciousnessResearchBoundary?.currentProductClaimAllowed,false);
  assert.equal(vision?.consciousnessResearchBoundary?.simulatedPersonaIsNotEquivalentToTransferredConsciousness,true);
});

test('architecture mirrors the central long horizon chain',()=>{
  assert.equal(architecture?.longHorizonTopology?.centralPolicy,'company-learning/platform-release-roadmap.json');
  assert.equal(architecture?.longHorizonTopology?.allWorkersMustFollowCentralVision,true);
  assert.equal(architecture?.longHorizonTopology?.authorityExpansionMode,'FORBIDDEN');
  assert.equal(architecture?.longHorizonTopology?.capabilityExpansionMode,'VERIFIED_AND_GATED');
});
