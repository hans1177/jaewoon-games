// 파일명: qa/vibe2-owner-rule3-unbounded-learning.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  createMasteryState,
  applyVerifiedExperienceToMastery,
  buildBenchmarkLadder,
  buildIdlePracticeQueue,
  injectIdlePracticeTask
} from '../tools/vibe2-learning-motor.mjs';

const repoRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const roadmap=JSON.parse(fs.readFileSync(path.join(repoRoot,'company-learning/platform-release-roadmap.json'),'utf8'));
const motor=JSON.parse(fs.readFileSync(path.join(repoRoot,'company-learning/vibe2-learning-motor.json'),'utf8'));

test('owner rule3 canonical contract keeps learning signal generations unbounded and verified',()=>{
  const rule=roadmap.ownerCanonicalRules?.rule3;
  assert.equal(rule?.id,'RULE_3_SELF_GENERATED_UNBOUNDED_VERIFIED_LEARNING_MULTIVERSE');
  assert.equal(rule?.enabled,true);
  assert.equal(rule?.totalLearningSignalLimit,null);
  assert.equal(rule?.practiceGenerationLimit,null);
  assert.equal(rule?.relearningGenerationLimit,null);
  assert.equal(rule?.benchmarkGenerationLimit,null);
  assert.equal(rule?.hypothesisGenerationLimit,null);
  assert.equal(rule?.crossProjectTransferGenerationLimit,null);
  assert.equal(rule?.signalGenerationAlwaysOn,true);
  assert.equal(rule?.executionResourceBoundedSignalExistenceUnbounded,true);
  assert.equal(rule?.positiveMasteryRequiresVerifiedEvidence,true);
  assert.equal(rule?.authorityExpansion,false);
  assert.equal(rule?.gateWeakening,false);
  assert.deepEqual(rule?.canonicalLearningNetwork?.supportedEvidenceTargets,['WEB','ROBLOX','UNITY','FORTNITE_UEFN']);
});

test('canonical learning motor exposes one shared Web Roblox Unity UEFN learning network',()=>{
  assert.equal(motor.principles?.unifiedPlatformLearningNetwork,true);
  assert.deepEqual(motor.principles?.supportedEvidenceTargets,['WEB','ROBLOX','UNITY','FORTNITE_UEFN']);
  assert.equal(motor.principles?.platformSpecificParallelTrainerForbidden,true);
  for(const domain of [
    'WEB_RUNTIME','ROBLOX_STUDIO',
    'UNITY_RUNTIME','UNITY_PHYSICS','UNITY_NETCODE',
    'UEFN_RUNTIME','UEFN_VERSE','UEFN_REPLICATION'
  ])assert.ok(motor.mastery.domains.includes(domain),domain);
  assert.ok(motor.benchmarkLadder.domains.includes('UNITY_NATIVE'));
  assert.ok(motor.benchmarkLadder.domains.includes('FORTNITE_UEFN_NATIVE'));
  assert.equal(motor.idleTraining?.practiceGenerationLimit,null);
  assert.equal(motor.idleTraining?.relearningGenerationLimit,null);
  assert.equal(motor.idleTraining?.hypothesisGenerationLimit,null);
  assert.equal(motor.idleTraining?.falsificationGenerationLimit,null);
});

test('practice generator emits hypothesis falsification previous-result comparison and relearning signals',()=>{
  const mastery=createMasteryState({
    failureSignatures:{
      'fail_rule3_demo':{
        count:3,lastEvidence:'verified-failure-3',example:'repeated verified failure',
        domains:['DEBUGGING','STATE_MACHINE']
      }
    }
  });
  const benchmark=buildBenchmarkLadder(mastery);
  const practice=buildIdlePracticeQueue(mastery,benchmark);
  assert.equal(practice.practiceSignalGenerationAlwaysOn,true);
  assert.equal(practice.practiceGenerationLimit,null);
  assert.equal(practice.relearningGenerationLimit,null);
  assert.equal(practice.hypothesisGenerationLimit,null);
  assert.equal(practice.falsificationGenerationLimit,null);
  assert.equal(practice.previousResultComparisonRequired,true);
  assert.ok(practice.drills.some(row=>row.kind==='HYPOTHESIS_FALSIFICATION_DRILL'));
  assert.ok(practice.drills.some(row=>row.kind==='PREVIOUS_RESULT_COMPARISON_DRILL'));
  assert.ok(practice.drills.some(row=>row.kind==='RELEARNING_REPLAY_DRILL'));
});

test('completed practice generation deterministically creates a later generation instead of terminating',()=>{
  const practice=buildIdlePracticeQueue({});
  const first=injectIdlePracticeTask({tasks:[]},practice);
  assert.equal(first.added,true);
  const completed={
    ...first.task,
    status:'verified',
    evidence:[...first.task.evidence,'practice-artifact-score:81','practice-artifact-improved:YES']
  };
  const next=injectIdlePracticeTask({tasks:[completed]},practice);
  assert.equal(next.added,true);
  assert.ok(next.practiceGeneration>=1);
  assert.notEqual(next.task.id,first.task.id);
  assert.equal(next.task.status,'queued');
  assert.ok(next.task.evidence.includes('production-pass:NO'));
});

test('native positive mastery requires matching runtime QA while verified failures may still teach avoidance',()=>{
  const passWithoutNativeRuntime={
    records:[{
      id:'unity-metadata-only',gameId:'u',engine:'unity',verified:true,reusable:true,outcome:'PASS',
      goal:'Unity runtime Rigidbody Netcode core loop',reusablePatterns:['generic-safe-shape']
    }]
  };
  const noRuntime=applyVerifiedExperienceToMastery({},passWithoutNativeRuntime).state;
  assert.equal(noRuntime.domains.UNITY_RUNTIME.xp,0);
  assert.equal(noRuntime.domains.UNITY_PHYSICS.xp,0);
  assert.equal(noRuntime.domains.UNITY_NETCODE.xp,0);
  assert.ok(noRuntime.domains.CORE_LOOP.xp>0);

  const withRuntime=applyVerifiedExperienceToMastery({},{
    records:[{
      id:'uefn-runtime-pass',gameId:'f',engine:'fortnite_uefn',verified:true,reusable:true,outcome:'PASS',
      engineQaVerified:true,evidence:['uefn-runtime-qa:PASS'],
      goal:'UEFN Verse multiplayer replication core loop',reusablePatterns:['uefn-runtime-safe']
    }]
  }).state;
  assert.ok(withRuntime.domains.UEFN_RUNTIME.xp>0);
  assert.ok(withRuntime.domains.UEFN_VERSE.xp>0);
  assert.ok(withRuntime.domains.UEFN_REPLICATION.xp>0);

  const nativeFailure=applyVerifiedExperienceToMastery({},{
    records:[{
      id:'unity-runtime-fail',gameId:'u',engine:'unity',verified:true,reusable:true,outcome:'FAIL',
      failureCause:'Unity Rigidbody runtime regression',avoidPatterns:['bad-fixedupdate-order']
    }]
  }).state;
  assert.ok(nativeFailure.domains.UNITY_RUNTIME.verifiedFailureLessons>0);
});
