// 파일명: qa/vibe2-release-dispatch-recovery.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {selectReviewedWinnerRecoveries} from '../tools/vibe2-release-dispatch-recovery.mjs';
import {markVibeTaskAwaiting} from '../tools/vibe2-queue-control.mjs';

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

test('verified checkpoint tasks never re-enter release gate recovery',()=>{
  const row={...winner(),status:'verified'};
  assert.equal(selectReviewedWinnerRecoveries({tasks:[row]}).count,0);
});

test('exact F9 Web publication waits remain recoverable until deployment is resolved',()=>{
  const row={...winner(['web-f0-f9-verified','web-f9-verified','web-publish-after-f9-required']),target:'web',status:'verified',blocker:null};
  row.evidence=row.evidence.filter(value=>!value.startsWith('candidate-sha:'));
  assert.equal(selectReviewedWinnerRecoveries({tasks:[row]}).count,0,'missing exact revision must fail closed');
  row.evidence.push('candidate-sha:'+'a'.repeat(40));
  const result=selectReviewedWinnerRecoveries({tasks:[row]});
  assert.equal(result.count,1);
  assert.equal(result.selected[0].candidateSha,'a'.repeat(40));
  assert.equal(row.status,'verified');
  for(const required of ['web-f0-f9-verified','web-f9-verified','web-publish-after-f9-required','role-result:review:PASS']){
    assert.equal(selectReviewedWinnerRecoveries({tasks:[{...row,evidence:row.evidence.filter(value=>value!==required)}]}).count,0,required);
  }
  row.evidence.push('release-dispatch-recovery-at:1000000');
  assert.equal(selectReviewedWinnerRecoveries({tasks:[row]},{nowMs:1119999}).count,0);
  assert.equal(selectReviewedWinnerRecoveries({tasks:[row]},{nowMs:1120001}).count,1);
  row.evidence.push('web-publication-retry-resolved');
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
  assert.equal(section.includes('git pull --rebase origin vibe2-unreal-core'),false);
  const retry=section.indexOf('for attempt in 1 2 3; do');
  const refresh=section.indexOf('git reset --hard origin/vibe2-unreal-core',retry);
  const reselection=section.indexOf('vibe2-release-dispatch-recovery.mjs',refresh);
  const semanticMark=section.indexOf('vibe2-queue-control.mjs await',reselection);
  const directPush=section.indexOf('git push origin HEAD:vibe2-unreal-core',semanticMark);
  assert.ok(retry>0&&refresh>retry&&reselection>refresh&&semanticMark>reselection&&directPush>semanticMark);
  assert.ok(section.includes('VIBE2_RELEASE_RECOVERY_OPTIMISTIC_ATTEMPT='));
  assert.ok(section.includes('VIBE2_RELEASE_RECOVERY_PUSH_RETRY='));
});

test('24H Web recovery adds dispatch evidence without reopening or self-verifying the task',()=>{
  const branch='vibe2/candidate/web-exact',sha='b'.repeat(40);
  const row={...winner(),target:'web',status:'verified',blocker:null,evidence:[
    branch,'candidate-sha:'+sha,'web-f0-f9-verified','web-f9-verified','web-publish-after-f9-required',
    'package-review:all-required-roles-pass','role-result:regression:PASS','role-result:review:PASS'
  ]};
  const evidence=['release-dispatch-recovery-requested:'+branch,'release-dispatch-recovery-candidate-sha:'+sha,'release-dispatch-recovery-at:1000000'];
  const mark=(task,extra=evidence)=>markVibeTaskAwaiting({tasks:[task]},{taskId:task.id,blocker:'candidate-awaiting-qa-and-deployment',evidence:extra});
  const updated=mark(row).tasks[0];
  assert.equal(updated.status,'verified');
  assert.equal(updated.blocker,null);
  assert.ok(updated.evidence.includes(evidence[2]));
  assert.equal(mark(updated).tasks[0].evidence.length,updated.evidence.length);
  assert.throws(()=>mark(row,evidence.map(value=>value.replace(sha,'c'.repeat(40)))),/await requires running/);
  assert.throws(()=>mark({...row,evidence:row.evidence.filter(value=>value!=='web-f9-verified')}),/await requires running/);
  assert.throws(()=>mark({...row,evidence:[...row.evidence,'web-publication-retry-resolved']}),/await requires running/);
  assert.throws(()=>mark({...row,target:'unity'}),/await requires running/);
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


test('runtime evidence recovery preserves inspection-only mode without inventing review pass',()=>{
  const branch='vibe2/candidate/probe',sha='a'.repeat(40);
  const row={id:'probe',gameId:'demo',target:'roblox',status:'running',blocker:'candidate-awaiting-runtime-evidence',lastOutcome:'FAN_IN_RUNTIME_EVIDENCE_REQUIRED',evidence:['fan-in-runtime-evidence-only:REQUIRED',branch,'candidate-sha:'+sha]};
  const recovery=selectReviewedWinnerRecoveries({tasks:[row]},{nowMs:1_000_000});
  assert.equal(recovery.count,1);
  assert.equal(recovery.selected[0].evidenceOnly,true);
  assert.equal(recovery.selected[0].candidateSha,sha);
  assert.equal(recovery.gateBypass,false);
  assert.equal(row.evidence.includes('role-result:review:PASS'),false);
  row.evidence.push('release-dispatch-recovery-at:950000');
  assert.equal(selectReviewedWinnerRecoveries({tasks:[row]},{nowMs:1_000_000}).count,0);
});
