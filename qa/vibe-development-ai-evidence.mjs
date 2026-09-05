// 파일명: qa/vibe-development-ai-evidence.mjs
// 역할: Development AI가 검증 증거 없이 완료 권한을 획득하지 못하도록 회귀 검사
import assert from 'node:assert/strict';
import {createVibeDevelopmentAIEvidenceGate,createVibeDevelopmentPipeline} from '../assets/vibe-development-ai.js';

const candidate={patch:{ui:{layout:'mobile'}}};
const complete={responsibleSource:true,checkpoint:true,candidateApplied:true,runtimeObserved:true,qaPassed:true,regressionPassed:true,exactRevision:true};
const accepted=createVibeDevelopmentAIEvidenceGate(candidate,complete);
assert.equal(accepted.eligible,true);
assert.equal(accepted.authority,'deterministic-evidence-gate');
assert.equal(accepted.aiMayDeclareComplete,false);
assert.deepEqual(accepted.blockedReasons,[]);

for(const key of Object.keys(complete)){
 const evidence={...complete,[key]:false};
 const result=createVibeDevelopmentAIEvidenceGate(candidate,evidence);
 assert.equal(result.eligible,false,`${key} must be required`);
 assert.ok(result.blockedReasons.length>0);
}

const protectedCandidate={proposal:{combat:{damage:999},save:{progression:{stage:99}}}};
const rejected=createVibeDevelopmentAIEvidenceGate(protectedCandidate,complete);
assert.equal(rejected.eligible,false);
assert.equal(rejected.validation.valid,false);
assert.ok(rejected.validation.touched.includes('damage'));
assert.ok(rejected.validation.touched.includes('progression'));
assert.ok(rejected.blockedReasons.includes('protected-mutation'));

const pipeline=createVibeDevelopmentPipeline({environment:'chatgpt'});
assert.equal(pipeline.version,2);
assert.equal(pipeline.finalAuthority,'deterministic-vibe-engine');
assert.equal(pipeline.completionGate,'deterministic-evidence-gate');
assert.ok(pipeline.steps.includes('runtime-observation'));
assert.ok(pipeline.steps.includes('regression-check'));
assert.ok(pipeline.steps.includes('exact-revision-evidence'));

console.log('vibe-development-ai-evidence: ok');
