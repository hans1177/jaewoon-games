import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
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

test('default cooldown retries stranded reviewed winners after two minutes',()=>{
  const recent=winner(['release-dispatch-recovery-at:1000000']);
  assert.equal(selectReviewedWinnerRecoveries({tasks:[recent]},{nowMs:1_119_999}).count,0);
  assert.equal(selectReviewedWinnerRecoveries({tasks:[recent]},{nowMs:1_120_001}).count,1);
});

test('done tasks never re-enter release gate recovery',()=>{
  const row={...winner(),status:'done'};
  assert.equal(selectReviewedWinnerRecoveries({tasks:[row]}).count,0);
});


test('24H recovery verifies exact candidate SHA before marking and dispatching',()=>{
  const workflow=fs.readFileSync('.github/workflows/vibe2-24h-runner.yml','utf8');
  const start=workflow.indexOf('      - name: Recover reviewed winners stranded before release dispatch');
  const end=workflow.indexOf('      - name: Upload generated machine handoff',start);
  assert.ok(start>0&&end>start);
  const section=workflow.slice(start,end);
  const shaCheck=section.indexOf('if [ "$remote_sha" != "$candidate_sha" ]; then');
  const mark=section.indexOf('node /tmp/vibe2-main/tools/vibe2-queue-control.mjs await');
  const dispatch=section.indexOf('vibe2-candidate-release.yml/dispatches');
  assert.ok(shaCheck>0&&shaCheck<mark&&mark<dispatch);
  assert.ok(section.includes('release-dispatch-recovery'));
  assert.equal(section.includes('queue-control.mjs pass'),false);
  assert.equal(section.includes('node tools/vibe2-queue-control.mjs'),false);
  assert.ok(section.includes('node /tmp/vibe2-main/tools/vibe2-queue-control.mjs await'));
});

test('24H runner reads and mutates control queue only through latest main tooling',()=>{
  const workflow=fs.readFileSync('.github/workflows/vibe2-24h-runner.yml','utf8');
  assert.equal(workflow.includes('node tools/vibe2-queue-control.mjs'),false);
  assert.ok(workflow.includes('node /tmp/vibe2-main/tools/vibe2-queue-control.mjs summary'));
  assert.ok(workflow.includes('node /tmp/vibe2-main/tools/vibe2-queue-control.mjs await'));
});

test('release result workflows mutate control state only through latest main queue tooling',()=>{
  const files=[
    '.github/workflows/vibe2-candidate-release.yml',
    '.github/workflows/vibe2-unity-release-result.yml'
  ];
  for(const file of files){
    const workflow=fs.readFileSync(file,'utf8');
    assert.equal(workflow.includes('node tools/vibe2-queue-control.mjs'),false);
    assert.ok(workflow.includes('main-contract/tools/vibe2-queue-control.mjs'));
  }
  for(const file of ['.github/workflows/vibe2-roblox-candidate-result.yml','.github/workflows/vibe2-unity-candidate-result.yml']){
    const workflow=fs.readFileSync(file,'utf8');
    assert.equal(workflow.includes('node tools/vibe2-candidate-reconcile.mjs'),false);
    assert.ok(workflow.includes('vibe2-main-contract/tools/vibe2-candidate-reconcile.mjs'));
  }
});
