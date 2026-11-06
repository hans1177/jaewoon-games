// 파일명: tools/autonomous-queue-state-test.mjs
// 역할: 공용 WORK_ID ledger와 실제 개발 진행 분류가 workflow success와 분리되는지 검증한다.
import assert from 'node:assert/strict';
import {
  activeReservations,
  classifyDevelopmentProgress,
  normalizeQueueState,
  reserveQueueWork,
  transitionWorkLedger,
  workById,
} from './autonomous-queue-state.mjs';

const now=new Date('2026-09-10T03:00:00.000Z');
let state=normalizeQueueState({version:2,attempts:[]});
assert.equal(state.version,3);
assert.deepEqual(state.workLedger,[]);

state=reserveQueueWork(state,{
  date:'2026-09-10',gameId:'rpg',gameSlug:'rough-rpg',sourcePath:'unity/rough-rpg',runId:'run-128',workId:'WORK-128',sourceCommit:'abc123',now,
});
assert.equal(activeReservations(state,{now}).length,1);
assert.equal(workById(state,'WORK-128')?.workState,'ASSIGNED');
assert.equal(workById(state,'WORK-128')?.developmentProgress,'INCOMPLETE_PROGRESS');

state=transitionWorkLedger(state,{workId:'WORK-128',workState:'IMPLEMENTING',implementationChanged:true,now:new Date(now.getTime()+1000)});
state=transitionWorkLedger(state,{workId:'WORK-128',workState:'PR_OPEN',evidenceRefs:['pr:128'],implementationChanged:true,now:new Date(now.getTime()+2000)});
state=transitionWorkLedger(state,{workId:'WORK-128',workState:'CI',evidenceRefs:['run:123'],implementationChanged:true,now:new Date(now.getTime()+3000)});
assert.equal(workById(state,'WORK-128')?.developmentProgress,'INCOMPLETE_PROGRESS');

// GitHub workflow가 success여도 QA PASS와 최종 WORK PASS가 없으면 실제 개발 PASS가 아니다.
assert.equal(classifyDevelopmentProgress({workState:'CI',implementationChanged:true,qaVerdict:'PASS',evidenceRefs:['run:success']}),'INCOMPLETE_PROGRESS');
assert.equal(classifyDevelopmentProgress({workState:'PASS',implementationChanged:true,qaVerdict:'PASS',evidenceRefs:['qa:1']}),'PASS');
assert.equal(classifyDevelopmentProgress({workState:'ASSIGNED',explicitReason:'NO_ACTIONABLE_WORK'}),'NO_ACTIONABLE_WORK');
assert.equal(classifyDevelopmentProgress({workState:'STALLED'}),'BLOCKED');

state=transitionWorkLedger(state,{workId:'WORK-128',workState:'MERGED',evidenceRefs:['commit:def456'],implementationChanged:true,now:new Date(now.getTime()+4000)});
state=transitionWorkLedger(state,{workId:'WORK-128',workState:'QA',evidenceRefs:['qa:android-install-launch'],implementationChanged:true,qaVerdict:'PASS',now:new Date(now.getTime()+5000)});
state=transitionWorkLedger(state,{workId:'WORK-128',workState:'PASS',evidenceRefs:['qa:save-update-install'],implementationChanged:true,qaVerdict:'PASS',now:new Date(now.getTime()+6000)});
assert.equal(workById(state,'WORK-128')?.developmentProgress,'PASS');
assert.deepEqual(workById(state,'WORK-128')?.evidenceRefs,['pr:128','run:123','commit:def456','qa:android-install-launch','qa:save-update-install']);
assert.throws(()=>transitionWorkLedger(state,{workId:'WORK-128',workState:'CI'}),/terminal work cannot transition/);

console.log('autonomous-queue-state-test: PASS');
