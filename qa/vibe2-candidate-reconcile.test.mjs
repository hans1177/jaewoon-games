// 파일명: qa/vibe2-candidate-reconcile.test.mjs
// 역할: 엔진 검증 성공/실패가 Vibe2 병렬 큐에 안전하게 반영되고 빈 슬롯을 즉시 깨우는지 검증한다.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createVibeContinuousQueue } from '../assets/vibe-continuous-queue.js';
import { reconcileVibeCandidateVerification } from '../tools/vibe2-candidate-reconcile.mjs';

function blockedCandidate({ retries=0, maxRetries=2 }={}) {
  return createVibeContinuousQueue({maxConcurrentTasks:4,tasks:[
    { id:'task-a',gameId:'daechung-rpg',target:'unity',sourceRoot:'unity-games/daechung-rpg',goal:'후보 수정',status:'blocked',blocker:'candidate-awaiting-engine-qa',evidence:['vibe2/candidate/task-a-100'],retries,maxRetries },
    { id:'task-b',gameId:'other',target:'unity',sourceRoot:'unity-games/other',goal:'독립 작업',status:'queued' }
  ]});
}

test('successful Unity verification stays blocked awaiting review and exposes independent next work',()=>{
  const result=reconcileVibeCandidateVerification(blockedCandidate(),{candidateBranch:'vibe2/candidate/task-a-100',target:'unity',conclusion:'success',runId:'200',headSha:'abc123'});
  assert.equal(result.updated,true);
  assert.equal(result.verificationPassed,true);
  assert.equal(result.finalPass,false);
  assert.equal(result.promotionAllowed,false);
  assert.equal(result.learningEligible,false);
  const task=result.queue.tasks.find((item)=>item.id==='task-a');
  assert.equal(task.status,'blocked');
  assert.equal(task.blocker,'candidate-unity-verification-passed-awaiting-review');
  assert(task.evidence.includes('unity-verification-run:200'));
  assert.equal(result.next.selected[0].id,'task-b');
  assert.equal(result.dispatchNext,true);
});

test('failed engine verification retries within task limit',()=>{
  const result=reconcileVibeCandidateVerification(blockedCandidate({retries:0,maxRetries:1}),{candidateBranch:'vibe2/candidate/task-a-100',target:'unity',conclusion:'failure',runId:'201'});
  const task=result.queue.tasks.find((item)=>item.id==='task-a');
  assert.equal(result.verificationPassed,false);
  assert.equal(result.finalPass,false);
  assert.equal(task.status,'queued');
  assert.equal(task.retries,1);
});

test('failed verification stops retry after configured cap',()=>{
  const result=reconcileVibeCandidateVerification(blockedCandidate({retries:1,maxRetries:1}),{candidateBranch:'vibe2/candidate/task-a-100',target:'unity',conclusion:'failure',runId:'202'});
  const task=result.queue.tasks.find((item)=>item.id==='task-a');
  assert.equal(task.status,'failed');
  assert.equal(task.retries,2);
});

test('cancelled or incomplete verification remains blocked',()=>{
  const result=reconcileVibeCandidateVerification(blockedCandidate(),{candidateBranch:'vibe2/candidate/task-a-100',target:'unity',conclusion:'cancelled',runId:'203'});
  const task=result.queue.tasks.find((item)=>item.id==='task-a');
  assert.equal(task.status,'blocked');
  assert.equal(task.blocker,'candidate-unity-verification-incomplete');
});

test('non Vibe2 candidate branch is ignored',()=>{
  const result=reconcileVibeCandidateVerification(blockedCandidate(),{candidateBranch:'feature/random',target:'unity',conclusion:'success'});
  assert.equal(result.updated,false);
  assert.equal(result.reason,'not-vibe2-candidate');
});


test('late native verification callback cannot rewind a Unity runtime-wait task',()=>{
  const queue=createVibeContinuousQueue({maxConcurrentTasks:4,tasks:[
    {
      id:'task-a',gameId:'daechung-rpg',target:'unity',sourceRoot:'unity-games/daechung-rpg',
      goal:'후보 수정',status:'blocked',blocker:'candidate-awaiting-unity-runtime-qa',
      evidence:['vibe2/candidate/task-a-100','unity-runtime-await-source-tree:1111111111111111111111111111111111111111']
    }
  ]});
  const result=reconcileVibeCandidateVerification(queue,{
    candidateBranch:'vibe2/candidate/task-a-100',target:'unity',conclusion:'success',runId:'204',headSha:'abc123'
  });
  const task=result.queue.tasks.find(item=>item.id==='task-a');
  assert.equal(task.status,'blocked');
  assert.equal(task.blocker,'candidate-awaiting-unity-runtime-qa');
  assert(task.evidence.includes('unity-verification-run:204'));
  assert.equal(result.reason,'engine-verification-evidence-merged-without-stage-rewind');
});

test('late native verification callback cannot rewind an already verified task',()=>{
  const queue=createVibeContinuousQueue({maxConcurrentTasks:4,tasks:[
    {
      id:'task-a',gameId:'daechung-rpg',target:'unity',sourceRoot:'unity-games/daechung-rpg',
      goal:'후보 수정',status:'verified',blocker:null,
      evidence:['vibe2/candidate/task-a-100','unity-runtime-source-tree:1111111111111111111111111111111111111111']
    }
  ]});
  const result=reconcileVibeCandidateVerification(queue,{
    candidateBranch:'vibe2/candidate/task-a-100',target:'unity',conclusion:'success',runId:'205',headSha:'abc123'
  });
  const task=result.queue.tasks.find(item=>item.id==='task-a');
  assert.equal(task.status,'verified');
  assert.equal(task.blocker,null);
  assert(task.evidence.includes('unity-verification-run:205'));
  assert.equal(result.finalPass,true);
  assert.equal(result.reason,'engine-verification-evidence-merged-without-stage-rewind');
});


test('authenticated Roblox QA failure records exact stage and signature and requeues without PASS',()=>{
  const sha='a'.repeat(40);
  const queue=createVibeContinuousQueue({tasks:[{
    id:'roblox-causal',gameId:'forest',target:'roblox',sourceRoot:'roblox-games/forest',
    status:'blocked',blocker:'candidate-awaiting-engine-qa',goal:'기존 게임 입력 수정',
    evidence:['vibe2/candidate/OWNER-ROBLOX-OBBY-causal','candidate-sha:'+sha],
    retries:0,maxRetries:2
  }]});
  const args={candidateBranch:'vibe2/candidate/OWNER-ROBLOX-OBBY-causal',target:'roblox',
    conclusion:'failure',runId:'91001',headSha:sha,
    failureStage:'TARGET_PLATFORM_RUNTIME',failureSignature:'LIVE_STUDIO_VERIFY_VIBE_CANDIDATE'};
  const result=reconcileVibeCandidateVerification(queue,args);
  const task=result.queue.tasks[0];
  assert.equal(result.updated,true);
  assert.equal(result.verificationPassed,false);
  assert.equal(result.promotionAllowed,false);
  assert.equal(result.learningEligible,false);
  assert.equal(task.status,'queued');
  assert.equal(task.retries,1);
  assert(task.evidence.includes('roblox-verification-run:91001'));
  assert(task.evidence.includes('engine-qa-failure-stage:TARGET_PLATFORM_RUNTIME'));
  assert(task.evidence.includes('engine-qa-failure-signature:LIVE_STUDIO_VERIFY_VIBE_CANDIDATE'));
  assert.equal(task.lastOutcome,'FAIL');
  assert(task.evidence.includes('retry-failure-signature:candidate-roblox-verification-failed:TARGET_PLATFORM_RUNTIME:LIVE_STUDIO_VERIFY_VIBE_CANDIDATE'));
  assert.equal(task.evidence.some(x=>/runtime.*:PASS|studio.*:PASS|runtimeVerified:true/i.test(x)),false);
  const repeated=reconcileVibeCandidateVerification(result.queue,args);
  assert.equal(repeated.updated,false);
  assert.equal(repeated.reason,'duplicate-candidate-verification-run');
  assert.equal(repeated.queue.tasks[0].retries,1);
  const changedCause=reconcileVibeCandidateVerification(result.queue,{
    ...args,runId:'91004',failureSignature:'LIVE_STUDIO_SECOND_DIFFERENT_GATE'
  });
  assert.equal(changedCause.queue.tasks[0].retries,2);
  assert.equal(changedCause.queue.tasks[0].evidence.findLast(x=>x.startsWith('retry-cause-streak:')).endsWith(':1'),true,
    'different observed failure must not increase the old cause streak');
});

test('late failed verification cannot rewind a previously verified or runtime-await Roblox checkpoint',()=>{
  const sha='b'.repeat(40);
  for(const current of [
    {status:'verified',blocker:null,evidence:[]},
    {status:'blocked',blocker:'candidate-awaiting-roblox-runtime-qa',evidence:[]},
    {status:'blocked',blocker:'custom-wait',evidence:['roblox-runtime-await-source-tree:'+sha]},
    {status:'failed',blocker:'retry-limit-exceeded',evidence:[]},
    {status:'cancelled',blocker:'lifecycle-inactive',evidence:[]}
  ]){
    const queue=createVibeContinuousQueue({tasks:[{
      id:'keep-checkpoint',gameId:'forest',target:'roblox',sourceRoot:'roblox-games/forest',
      goal:'기존 게임',status:current.status,blocker:current.blocker,
      evidence:['vibe2/candidate/OWNER-ROBLOX-OBBY-keep','candidate-sha:'+sha,...current.evidence],
      retries:2,maxRetries:2
    }]});
    const result=reconcileVibeCandidateVerification(queue,{
      candidateBranch:'vibe2/candidate/OWNER-ROBLOX-OBBY-keep',target:'roblox',
      conclusion:'failure',runId:'91002',headSha:sha,
      failureStage:'TARGET_PLATFORM_RUNTIME',failureSignature:'LATE_STUDIO_FAILURE'
    });
    assert.equal(result.updated,false,current.status+':'+current.blocker);
    assert.equal(result.finalPass,false,'ignored late failure cannot report a new PASS');
    const before=queue.tasks[0],after=result.queue.tasks[0];
    assert.equal(after.status,before.status);
    assert.equal(after.retries,before.retries);
    assert.equal(after.blocker,before.blocker);
    assert.equal(after.evidence.length,before.evidence.length);
    assert.equal(result.promotionAllowed,false);
    assert.equal(result.learningEligible,false);
  }
});

test('candidate QA report rejects stale source revision and mismatched platform without retrying',()=>{
  const sha='c'.repeat(40);
  const queue=createVibeContinuousQueue({tasks:[{
    id:'revision-bound',gameId:'forest',target:'roblox',sourceRoot:'roblox-games/forest',
    status:'blocked',blocker:'candidate-awaiting-engine-qa',goal:'게임 복구',
    evidence:['vibe2/candidate/OWNER-ROBLOX-OBBY-revision','candidate-sha:'+sha],
    retries:0,maxRetries:2
  }]});
  const base={candidateBranch:'vibe2/candidate/OWNER-ROBLOX-OBBY-revision',
    target:'roblox',conclusion:'failure',runId:'91003',headSha:sha};
  const stale=reconcileVibeCandidateVerification(queue,{...base,headSha:'d'.repeat(40)});
  assert.equal(stale.reason,'candidate-source-revision-mismatch');
  assert.equal(stale.updated,false);
  const missing=reconcileVibeCandidateVerification(queue,{...base,headSha:''});
  assert.equal(missing.updated,false);
  const wrongTarget=reconcileVibeCandidateVerification(queue,{...base,target:'unity'});
  assert.equal(wrongTarget.reason,'candidate-target-mismatch');
  assert.equal(wrongTarget.updated,false);
  for(const result of [stale,missing,wrongTarget]){
    assert.equal(result.queue.tasks[0].status,'blocked');
    assert.equal(result.queue.tasks[0].retries,0);
  }
});

test('canonical Roblox Studio result workflow routes real failed jobs without bypassing success-only promotion',()=>{
  const workflow=fs.readFileSync('.github/workflows/vibe2-roblox-candidate-result.yml','utf8');
  assert.match(workflow,/QA conclusion mismatch: requested=/);
  assert.match(workflow,/QA run candidate branch or source SHA mismatch/);
  assert.match(workflow,/const failed=jobs\.find\(job=>String\(job\.status/);
  assert.match(workflow,/const step=\(failed\.steps\|\|\[\]\)\.find/);
  assert.match(workflow,/failure_stage=\$\{stage\}/);
  assert.match(workflow,/--failure-stage="\$QA_FAILURE_STAGE"/);
  assert.match(workflow,/--failure-signature="\$QA_FAILURE_SIGNATURE"/);
  assert.match(workflow,/candidate branch changed after observed QA/);
  assert.match(workflow,/if: steps\.qa\.outputs\.verified == '1'/);
  assert.match(workflow,/if: steps\.promote_contract\.outcome == 'success'/);
  assert.match(workflow,/if: steps\.promote\.outcome == 'success'/);
  assert.match(workflow,/if: steps\.qa\.outputs\.actual_conclusion == 'failure'/);
  assert.match(workflow,/VIBE2_ROBLOX_CANDIDATE_RESULT=FAILED_QA_RECORDED_FOR_REPAIR/);
  assert.doesNotMatch(workflow,/VIBE2_AUTO_FINAL_PASS=YES/);
  assert.doesNotMatch(workflow,/VIBE2_AUTO_LEARNING=YES/);
});


// [인과 실패 기록 보안 회귀] 외부 오류 원문·경로가 다음 수정 전략의 학습 근거로 승격되지 않도록 차단한다.
test('untrusted Studio failure labels cannot enter causal queue evidence',()=>{
  const sha='e'.repeat(40);
  const candidateBranch='vibe2/candidate/OWNER-ROBLOX-OBBY-evidence-safe';
  for(const entry of [
    {stage:'TARGET_PLATFORM_RUNTIME',signature:'LIVE_STUDIO_PRIVATE/secret?token=123',stageAccepted:true},
    {stage:'TARGET_PLATFORM_RUNTIME:private/secret',signature:'LIVE_STUDIO_VALID_STEP',stageAccepted:false},
    {stage:'TARGET_PLATFORM_RUNTIME',signature:'LIVE_STUDIO_VALID_STEP\nPRIVATE_SECRET',stageAccepted:true},
    {stage:'CANDIDATE_STATIC_GATE',signature:'CONTRACT_PRIVATE/secret?token=123',stageAccepted:true}
  ]){
    const queue=createVibeContinuousQueue({tasks:[{
      id:'roblox-evidence-safe',gameId:'forest',target:'roblox',sourceRoot:'roblox-games/forest',
      status:'blocked',blocker:'candidate-awaiting-engine-qa',goal:'버튼 복구',
      evidence:[candidateBranch,'candidate-sha:'+sha],retries:0,maxRetries:2
    }]});
    const result=reconcileVibeCandidateVerification(queue,{
      candidateBranch,target:'roblox',conclusion:'failure',runId:'91555',headSha:sha,
      failureStage:entry.stage,failureSignature:entry.signature
    });
    const task=result.queue.tasks[0];
    const evidence=task.evidence.join('\n');
    assert.equal(result.updated,true);
    assert.equal(result.verificationPassed,false);
    assert.equal(result.promotionAllowed,false);
    assert.equal(result.learningEligible,false);
    assert.equal(task.status,'queued');
    assert.equal(task.retries,1);
    assert.equal(evidence.includes('engine-qa-failure-stage:TARGET_PLATFORM_RUNTIME'),
      entry.stageAccepted&&entry.stage==='TARGET_PLATFORM_RUNTIME');
    assert.equal(evidence.includes('engine-qa-failure-stage:CANDIDATE_STATIC_GATE'),
      entry.stageAccepted&&entry.stage==='CANDIDATE_STATIC_GATE');
    assert.equal(task.evidence.some(row=>row.startsWith('engine-qa-failure-signature:')),false);
    assert.doesNotMatch(JSON.stringify(result.queue),/secret|token=123|PRIVATE_SECRET|VALID_STEP/i);
  }
});

test('canonical long Studio failure code stays consistent across evidence and retry cause',()=>{
  const sha='f'.repeat(40),candidateBranch='vibe2/candidate/OWNER-ROBLOX-OBBY-long-step';
  const queue=createVibeContinuousQueue({tasks:[{
    id:'roblox-long-step',gameId:'forest',target:'roblox',sourceRoot:'roblox-games/forest',
    status:'blocked',blocker:'candidate-awaiting-engine-qa',goal:'기존 입력 복구',
    evidence:[candidateBranch,'candidate-sha:'+sha],retries:0,maxRetries:2
  }]});
  const signature='LIVE_STUDIO_'+'A'.repeat(100);
  const result=reconcileVibeCandidateVerification(queue,{
    candidateBranch,target:'roblox',conclusion:'failure',runId:'91556',headSha:sha,
    failureStage:'TARGET_PLATFORM_RUNTIME',failureSignature:signature
  });
  const task=result.queue.tasks[0],safe=signature.slice(0,90);
  assert.equal(result.updated,true);
  assert.equal(task.status,'queued');
  assert(task.evidence.includes('engine-qa-failure-signature:'+safe));
  assert(task.evidence.includes('retry-failure-signature:candidate-roblox-verification-failed:TARGET_PLATFORM_RUNTIME:'+safe));
  assert.equal(task.blocker,'candidate-roblox-verification-failed:TARGET_PLATFORM_RUNTIME:'+safe);
  assert.equal(task.evidence.some(row=>row.includes(signature)),false);
  assert.equal(result.finalPass,false);
});
