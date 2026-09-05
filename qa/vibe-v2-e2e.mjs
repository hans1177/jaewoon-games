// 파일명: qa/vibe-v2-e2e.mjs
// 역할: Vibe Maker V2 전체 실행 루프의 후보검증·런타임·복구·롤백 경계를 검사
import assert from 'node:assert/strict';
import {createVibeV2Execution,advanceVibeV2Candidate,verifyVibeV2Runtime,verifyVibeV2Repair} from '../assets/vibe-v2-runtime.js';
import {replayVibeWorld} from '../assets/vibe-quality-intelligence.js';

const initial={worldId:'e2e',seed:'fixed',state:{hero:{hp:100},world:{progress:1}}};
const events=[{op:'set',path:'hero.status',value:'ready',timestamp:1}];
const baseline=replayVibeWorld({initialState:initial,events});

const blocked=createVibeV2Execution({request:'오류 복구'});
assert.equal(blocked.readyForCandidate,false);
assert.ok(blocked.blockedReasons.includes('exact-revision-required'));
assert.ok(blocked.blockedReasons.includes('checkpoint-required'));
assert.ok(blocked.blockedReasons.includes('responsible-source-unproven'));
assert.equal(blocked.sourceMutationAllowed,false);
assert.equal(blocked.gameplayMutationAllowed,false);

const execution=createVibeV2Execution({request:'오류 복구',target:'godot',revision:'rev-1',checkpointId:'cp-1',responsibleFiles:['main.gd']});
assert.equal(execution.version,2);
assert.equal(execution.readyForCandidate,true);
assert.equal(execution.authority,'v2-orchestration-only');

const candidate=advanceVibeV2Candidate(execution,{candidate:{patch:{ui:{layout:'mobile'}}}});
assert.equal(candidate.phase,'candidate-verified');
assert.equal(candidate.mayRun,true);
assert.equal(candidate.candidateValidation.valid,true);

const missingEvidence=verifyVibeV2Runtime(candidate,{baseline,candidateWorld:baseline,invariants:{requiredPaths:['hero.hp'],nonNegativePaths:['hero.hp']},qaPassed:true});
assert.equal(missingEvidence.phase,'repair-required');
assert.equal(missingEvidence.mayCommit,false);
assert.ok(missingEvidence.evidenceGate.blockedReasons.includes('candidate-not-applied'));
assert.ok(missingEvidence.evidenceGate.blockedReasons.includes('runtime-not-observed'));
assert.ok(missingEvidence.evidenceGate.blockedReasons.includes('regression-not-passed'));
assert.ok(missingEvidence.evidenceGate.blockedReasons.includes('exact-revision-unproven'));

const completeEvidence={candidateApplied:true,runtimeObserved:true,qaPassed:true,regressionPassed:true,exactRevision:true};
const verified=verifyVibeV2Runtime(candidate,{baseline,candidateWorld:baseline,invariants:{requiredPaths:['hero.hp'],nonNegativePaths:['hero.hp']},...completeEvidence});
assert.equal(verified.phase,'verified');
assert.equal(verified.mayCommit,true);
assert.equal(verified.rollbackRequired,false);
assert.equal(verified.evidenceGate.aiMayDeclareComplete,false);
assert.equal(verified.completionAuthority,'verified-runtime-and-regression-only');

const divergent=replayVibeWorld({initialState:initial,events:[...events,{op:'add',path:'hero.hp',value:-150,timestamp:2}]});
const repairRequired=verifyVibeV2Runtime(candidate,{baseline,candidateWorld:divergent,invariants:{requiredPaths:['hero.hp'],nonNegativePaths:['hero.hp']},...completeEvidence});
assert.equal(repairRequired.phase,'repair-required');
assert.equal(repairRequired.mayCommit,false);
assert.equal(repairRequired.rollbackRequired,true);
assert.equal(repairRequired.repairPlan.eligible,true);
assert.equal(repairRequired.repairPlan.autoApplyAllowed,false);

const rollback=verifyVibeV2Repair(repairRequired,{before:baseline,after:baseline,invariants:{requiredPaths:['hero.hp'],nonNegativePaths:['hero.hp']},qaPassed:true,exactRevision:false});
assert.equal(rollback.phase,'rollback');
assert.equal(rollback.mayCommit,false);
assert.equal(rollback.rollbackRequired,true);

const repaired=verifyVibeV2Repair(repairRequired,{before:baseline,after:baseline,invariants:{requiredPaths:['hero.hp'],nonNegativePaths:['hero.hp']},qaPassed:true,exactRevision:true});
assert.equal(repaired.phase,'verified');
assert.equal(repaired.mayCommit,true);
assert.equal(repaired.rollbackRequired,false);

const protectedCandidate=advanceVibeV2Candidate(execution,{candidate:{patch:{combat:{damage:999}}}});
assert.equal(protectedCandidate.phase,'candidate-rejected');
assert.equal(protectedCandidate.mayRun,false);
assert.equal(protectedCandidate.candidateValidation.valid,false);
assert.ok(protectedCandidate.candidateValidation.touched.includes('damage'));

console.log('vibe-v2-e2e: ok');
