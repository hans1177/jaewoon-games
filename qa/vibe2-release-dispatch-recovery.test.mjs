import test from 'node:test';
import assert from 'node:assert/strict';
import {selectReviewedWinnerRecoveries} from '../tools/vibe2-release-dispatch-recovery.mjs';

const winner=(extra=[])=>({
  id:'task-1',gameId:'game-1',status:'running',blocker:'candidate-awaiting-qa-and-deployment',
  evidence:[
    'vibe2/candidate/task-1-speculative-2-123-1',
    'candidate-sha:abcdef1234567890',
    'role-result:regression:PASS',
    'role-result:review:PASS',
    'package-review:all-required-roles-pass',
    ...extra
  ]
});

test('selects only fully reviewed current winner evidence',()=>{
  const result=selectReviewedWinnerRecoveries({tasks:[winner()]},{nowMs:1_000_000,cooldownMs:100_000});
  assert.equal(result.count,1);
  assert.equal(result.selected[0].candidateBranch,'vibe2/candidate/task-1-speculative-2-123-1');
  assert.equal(result.gateBypass,false);
});

test('does not select task missing review or regression pass',()=>{
  const row=winner();
  row.evidence=row.evidence.filter(x=>x!=='role-result:review:PASS');
  assert.equal(selectReviewedWinnerRecoveries({tasks:[row]}).count,0);
});

test('cooldown prevents duplicate recovery dispatch but later retry is allowed',()=>{
  const recent=winner(['release-dispatch-recovery-at:950000']);
  assert.equal(selectReviewedWinnerRecoveries({tasks:[recent]},{nowMs:1_000_000,cooldownMs:100_000}).count,0);
  assert.equal(selectReviewedWinnerRecoveries({tasks:[recent]},{nowMs:1_100_001,cooldownMs:100_000}).count,1);
});

test('done tasks never re-enter release gate recovery',()=>{
  const row={...winner(),status:'done'};
  assert.equal(selectReviewedWinnerRecoveries({tasks:[row]}).count,0);
});
