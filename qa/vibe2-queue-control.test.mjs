// 파일명: qa/vibe2-queue-control.test.mjs
// 역할: DAG/shard/source-lock/work-stealing/backpressure/speculative fan-in 큐 계약을 검증한다.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  enqueueVibeTask,
  reserveNextVibeTask,
  reserveVibeTaskBatch,
  markVibeTaskAwaiting,
  releaseVibeTaskExecutionSlot,
  settleVibeTask,
  applyVibeFanInResults,
  recoverFixedFullWebTransportFailures,
  recoverFixedSourceCandidateGenerationFailures,
  recoverStaleRunningReservations,
  recoverFanInRegressionFailure,
  runQueueCommand
} from '../tools/vibe2-queue-control.mjs';
import { createVibeContinuousQueue, selectVibeQueueBatch } from '../assets/vibe-continuous-queue.js';

function add(queue, id, gameId, target='unity', extra={}) {
  return enqueueVibeTask(queue,{ id, gameId, target, goal:`${id} 작업`, sourceRoot:`${target}-games/${gameId}`, ...extra });
}

test('learning-idle lane reservation uses its own cap instead of game adaptive cap',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'vibe2-lane-'));
  const queueFile=path.join(dir,'queue.json');
  const controlFile=path.join(dir,'control.json');
  fs.writeFileSync(queueFile,JSON.stringify({maxConcurrentTasks:256,tasks:[
    {id:'game',gameId:'g',target:'web',department:'development',type:'implementation',goal:'game',status:'queued',sourceRoot:'web-games/g',responsibleFiles:['index.html']},
    ...Array.from({length:4},(_,i)=>({id:`learn-${i}`,gameId:`learn-${i}`,target:'web',department:'development',type:'research',goal:'practice',status:'queued',evidence:['learning-practice-only']}))
  ]},null,2));
  fs.writeFileSync(controlFile,JSON.stringify({version:3,currentMax:20,lastDecision:'HOLD'},null,2));
  const result=runQueueCommand({command:'reserve-batch',queue:queueFile,control:controlFile,lane:'learning-idle',max:'4',min:'1'});
  assert.equal(result.executionLane,'learning-idle');
  assert.equal(result.reservationMaxConcurrentTasks,4);
  assert.equal(result.adaptiveControl.currentMax,20);
  assert.equal(result.tasks.length,4);
  assert.ok(result.tasks.every(task=>task.executionLane==='LEARNING_IDLE'));
  assert.equal(result.tasks.some(task=>task.id==='game'),false);
});

test('auxiliary fan-in never mutates game-primary adaptive control',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'vibe2-aux-fanin-'));
  const queueFile=path.join(dir,'queue.json');
  const controlFile=path.join(dir,'control.json');
  const inputFile=path.join(dir,'results.json');
  const reservation={id:'aux-run:1',runId:'aux-run',runAttempt:1,reservedAt:'2026-09-19T10:00:00Z'};
  const queue=createVibeContinuousQueue({maxConcurrentTasks:256,tasks:[
    {id:'learn',gameId:'learn',target:'web',department:'development',type:'research',goal:'practice',status:'queued',evidence:['learning-practice-only']}
  ]});
  const reserved=reserveVibeTaskBatch(queue,{maxConcurrentTasks:1,lane:'learning-idle',reservation});
  fs.writeFileSync(queueFile,JSON.stringify(reserved.queue,null,2));
  fs.writeFileSync(controlFile,JSON.stringify({version:3,currentMax:20,lastDecision:'HOLD',lastReason:'TEST'},null,2));
  fs.writeFileSync(inputFile,JSON.stringify({results:[{taskId:'learn',reservationId:'aux-run:1',variant:'primary',outcome:'PASS',evidence:['practice-pass'],metrics:{requestedMax:1,effectiveMax:1,workerStartedAt:1,workerFinishedAt:2}}]},null,2));
  const before=fs.readFileSync(controlFile,'utf8');
  const result=runQueueCommand({command:'fan-in',queue:queueFile,control:controlFile,input:inputFile,lane:'learning-idle',min:'1'});
  const after=fs.readFileSync(controlFile,'utf8');
  assert.equal(result.executionLane,'learning-idle');
  assert.equal(result.adaptiveEligible,false);
  assert.equal(after,before);
});

test('queue normalization exposes explicit execution lanes and release wait is dynamic',()=>{
  let queue=createVibeContinuousQueue({tasks:[
    {id:'game',gameId:'g',target:'web',department:'development',type:'implementation',goal:'game',status:'queued'},
    {id:'recovery',gameId:'sys',target:'web',department:'system-supervision',type:'research',goal:'recover',status:'queued',systemSteward:true},
    {id:'control',gameId:'sys2',target:'web',department:'system-supervision',type:'research',goal:'control',status:'queued'},
    {id:'learn',gameId:'learn',target:'web',department:'development',type:'research',goal:'learn',status:'queued',evidence:['learning-practice-only']}
  ]});
  assert.equal(queue.tasks.find(t=>t.id==='game').executionLane,'GAME_PRIMARY');
  assert.equal(queue.tasks.find(t=>t.id==='recovery').executionLane,'RECOVERY_FAST');
  assert.equal(queue.tasks.find(t=>t.id==='control').executionLane,'CONTROL_FAST');
  assert.equal(queue.tasks.find(t=>t.id==='learn').executionLane,'LEARNING_IDLE');
  queue={...queue,tasks:queue.tasks.map(t=>t.id==='game'?{...t,status:'running',blocker:'candidate-awaiting-qa-and-deployment'}:t)};
  queue=createVibeContinuousQueue(queue);
  assert.equal(queue.tasks.find(t=>t.id==='game').executionLane,'RELEASE_WAIT');
});

test('legacy central policy evidence is migrated to the roadmap authority during queue normalization', () => {
  const queue=createVibeContinuousQueue({tasks:[{
    id:'legacy-policy',gameId:'legacy',target:'web',sourceRoot:'web-games/legacy',goal:'legacy',
    status:'queued',evidence:['central-policy:COMPANY_FLOW.md','owner-directive:existing']
  }]});
  assert.equal(queue.tasks[0].evidence.includes('central-policy:COMPANY_FLOW.md'),false);
  assert.equal(queue.tasks[0].evidence.includes('central-policy:company-learning/platform-release-roadmap.json'),true);
  assert.equal(queue.tasks[0].evidence.includes('owner-directive:existing'),true);
});

test('historical deployment recovery flag survives queue normalization', () => {
  const queue=createVibeContinuousQueue({tasks:[{
    id:'historical-flag-contract',
    gameId:'historical-game',
    target:'roblox',
    department:'development',
    type:'implementation',
    goal:'maintain historical deployment',
    releaseState:'development-confirmed',
    status:'queued',
    postReleaseFocused:true,
    historicalDeploymentRecovery:true,
    packageLongWorkProtected:true,
    packageRole:'implementation-owner'
  }]});
  assert.equal(queue.tasks[0].historicalDeploymentRecovery,true);
});

test('registered historical maintenance shares the protected post-release slot', () => {
  const queue=createVibeContinuousQueue({maxConcurrentTasks:1,tasks:[
    {
      id:'general-release',gameId:'general-release',target:'web',department:'development',type:'implementation',
      goal:'general release work',releaseState:'release-confirmed',status:'queued',priority:'critical'
    },
    {
      id:'historical-focus',gameId:'historical-focus',target:'roblox',department:'development',type:'implementation',
      goal:'historical maintenance',releaseState:'development-confirmed',status:'queued',priority:'critical',
      postReleaseFocused:true,historicalDeploymentRecovery:true,packageLongWorkProtected:true,packageRole:'implementation-owner'
    }
  ]});
  const selected=selectVibeQueueBatch(queue,{maxConcurrentTasks:1});
  assert.equal(selected.postReleaseFocusedSlotUsed,true);
  assert.equal(selected.postReleaseFocusedTaskId,'historical-focus');
  assert.equal(selected.selected[0].id,'historical-focus');
});

test('ordinary development-confirmed Roblox task cannot claim the post-release protected slot', () => {
  const queue=createVibeContinuousQueue({maxConcurrentTasks:1,tasks:[
    {
      id:'general-release',gameId:'general-release',target:'web',department:'development',type:'implementation',
      goal:'general release work',releaseState:'release-confirmed',status:'queued',priority:'critical'
    },
    {
      id:'ordinary-dev-focus',gameId:'ordinary-dev-focus',target:'roblox',department:'development',type:'implementation',
      goal:'ordinary development',releaseState:'development-confirmed',status:'queued',priority:'critical',
      postReleaseFocused:true
    }
  ]});
  const selected=selectVibeQueueBatch(queue,{maxConcurrentTasks:1});
  assert.equal(selected.postReleaseFocusedSlotUsed,false);
  assert.equal(selected.postReleaseFocusedTaskId,null);
  assert.equal(selected.selected[0].id,'general-release');
});

test('owner directive preempts release and development work', () => {
  let queue=createVibeContinuousQueue();
  queue=add(queue,'dev','dev','unity',{releaseState:'development-confirmed'});
  queue=add(queue,'release','release','web',{releaseState:'release-confirmed'});
  queue=add(queue,'owner','owner','unity',{ownerDirective:true});
  assert.equal(reserveNextVibeTask(queue).task.id,'owner');
});

test('release-confirmed preempts development-confirmed', () => {
  let queue=createVibeContinuousQueue();
  queue=add(queue,'dev','dev','unity',{priority:'critical',releaseState:'development-confirmed'});
  queue=add(queue,'release','release','web',{priority:'normal',releaseState:'release-confirmed'});
  assert.equal(reserveNextVibeTask(queue).task.id,'release');
});

test('development implementation preempts nonblocking system supervision research', () => {
  const queue=createVibeContinuousQueue({maxConcurrentTasks:1,tasks:[
    {
      id:'supervisor-research',gameId:'system-supervision',target:'web',department:'system-supervision',type:'research',
      goal:'inspect bottleneck',priority:'critical',releaseState:'release-confirmed',status:'queued'
    },
    {
      id:'game-implementation',gameId:'game-live',target:'web',department:'development',type:'implementation',
      goal:'implement game source',priority:'normal',releaseState:'development-confirmed',status:'queued',
      responsibleFiles:['web-games/game-live/index.html']
    }
  ]});
  assert.equal(selectVibeQueueBatch(queue,{maxConcurrentTasks:1}).selected[0].id,'game-implementation');
});

test('system steward protection still preempts ordinary development implementation', () => {
  const queue=createVibeContinuousQueue({maxConcurrentTasks:1,tasks:[
    {
      id:'steward-repair',gameId:'system-steward',target:'web',department:'system-supervision',type:'research',
      goal:'repair machine state',priority:'critical',releaseState:'other',status:'queued',systemSteward:true
    },
    {
      id:'game-implementation',gameId:'game-live',target:'web',department:'development',type:'implementation',
      goal:'implement game source',priority:'critical',releaseState:'development-confirmed',status:'queued',
      responsibleFiles:['web-games/game-live/index.html']
    }
  ]});
  assert.equal(selectVibeQueueBatch(queue,{maxConcurrentTasks:1}).selected[0].id,'steward-repair');
});

test('game-primary reserve lane excludes recovery control and learning tasks from the 20-wave budget',()=>{
  const queue=createVibeContinuousQueue({maxConcurrentTasks:2,tasks:[
    {id:'control-fast',gameId:'system-steward',target:'web',department:'system-supervision',type:'research',goal:'repair control',status:'queued',priority:'critical',systemSteward:true},
    {id:'learning-idle',gameId:'learning',target:'web',department:'development',type:'research',goal:'practice',status:'queued',priority:'low',evidence:['learning-practice-only']},
    {id:'game-a',gameId:'game-a',target:'web',department:'development',type:'implementation',goal:'implement a',sourceRoot:'web-games/game-a',responsibleFiles:['index.html'],status:'queued'},
    {id:'game-b',gameId:'game-b',target:'web',department:'development',type:'implementation',goal:'implement b',sourceRoot:'web-games/game-b',responsibleFiles:['index.html'],status:'queued'}
  ]});
  const reserved=reserveVibeTaskBatch(queue,{maxConcurrentTasks:2});
  assert.deepEqual(new Set(reserved.tasks.map(task=>task.id)),new Set(['game-a','game-b']));
  assert.equal(reserved.selection.lane,'game-primary');
  assert.deepEqual(new Set(reserved.selection.laneDeferred.map(task=>task.id)),new Set(['control-fast','learning-idle']));
});

test('running nondevelopment lane work does not consume game-primary worker capacity',()=>{
  const queue=createVibeContinuousQueue({maxConcurrentTasks:2,tasks:[
    {id:'control-running',gameId:'system-control',target:'web',department:'system-supervision',type:'research',goal:'control',status:'running',priority:'critical'},
    {id:'game-a',gameId:'game-a',target:'web',department:'development',type:'implementation',goal:'implement a',sourceRoot:'web-games/game-a',responsibleFiles:['index.html'],status:'queued'},
    {id:'game-b',gameId:'game-b',target:'web',department:'development',type:'implementation',goal:'implement b',sourceRoot:'web-games/game-b',responsibleFiles:['index.html'],status:'queued'}
  ]});
  const reserved=reserveVibeTaskBatch(queue,{maxConcurrentTasks:2});
  assert.equal(reserved.selection.capacityRunning.length,0);
  assert.equal(reserved.tasks.length,2);
});

test('independent source roots fan out in one reservation batch', () => {
  let queue=createVibeContinuousQueue({maxConcurrentTasks:4,tasks:[]});
  queue=add(queue,'u1','u1','unity',{releaseState:'release-confirmed'});
  queue=add(queue,'w1','w1','web',{releaseState:'development-confirmed'});
  queue=add(queue,'w2','w2','web',{releaseState:'development-confirmed'});
  const reserved=reserveVibeTaskBatch(queue,{maxConcurrentTasks:4});
  assert.equal(reserved.tasks.length,3);
  assert.deepEqual(new Set(reserved.tasks.map(t=>t.id)),new Set(['u1','w1','w2']));
  assert.equal(reserved.selection.workStealingUsed,false);
});

test('reservation identity is persisted on reserved tasks and worker matrix', () => {
  let queue=createVibeContinuousQueue({maxConcurrentTasks:4,tasks:[]});
  queue=add(queue,'reserved','reserved','web',{priority:'critical',estimatedRisk:'high'});
  const reservation={id:'35340000000:1',runId:'35340000000',runAttempt:1,reservedAt:'2026-09-18T12:00:00Z'};
  const reserved=reserveVibeTaskBatch(queue,{maxConcurrentTasks:4,reservation});
  assert.equal(reserved.tasks[0].reservationId,reservation.id);
  assert.equal(reserved.tasks[0].reservationRunId,reservation.runId);
  assert.equal(reserved.tasks[0].reservationRunAttempt,1);
  assert.equal(reserved.tasks[0].reservedAt,reservation.reservedAt);
  assert.equal(reserved.matrix[0].reservationId,reservation.id);
  assert.equal(reserved.matrix[0].reservedAt,reservation.reservedAt);
});

test('same source root may fan out when responsibility files are concrete and disjoint', () => {
  let queue=createVibeContinuousQueue({maxConcurrentTasks:20,tasks:[]});
  queue=add(queue,'a','same','web',{responsibleFiles:['a.js']});
  queue=add(queue,'b','same','web',{responsibleFiles:['b.js']});
  const reserved=reserveVibeTaskBatch(queue,{maxConcurrentTasks:20});
  assert.equal(reserved.tasks.length,2);
});

test('same source root remains exclusive when responsibility files overlap or are unspecified', () => {
  let queue=createVibeContinuousQueue({maxConcurrentTasks:20,tasks:[]});
  queue=add(queue,'a','same','web',{responsibleFiles:['shared.js']});
  queue=add(queue,'b','same','web',{responsibleFiles:['shared.js']});
  queue=add(queue,'c','same','web');
  const reserved=reserveVibeTaskBatch(queue,{maxConcurrentTasks:20});
  assert.equal(reserved.tasks.length,1);
  assert.ok(reserved.selection.deferredConflicts.some(row=>row.reason==='responsible-file-conflict'||row.reason==='source-root-conflict'));
});

test('DAG dependency starts only after predecessor PASS', () => {
  let queue=createVibeContinuousQueue({maxConcurrentTasks:4,tasks:[]});
  queue=add(queue,'base','a','web');
  queue=add(queue,'after','b','web',{dependencies:['base']});
  let reserved=reserveVibeTaskBatch(queue,{maxConcurrentTasks:4});
  assert.deepEqual(reserved.tasks.map(t=>t.id),['base']);
  let done=settleVibeTask(reserved.queue,{taskId:'base',outcome:'PASS',evidence:['pass']});
  const next=selectVibeQueueBatch(done.queue,{maxConcurrentTasks:4});
  assert.equal(next.selected[0].id,'after');
});

test('awaiting QA holds its source root but does not block independent work', () => {
  let queue=createVibeContinuousQueue({maxConcurrentTasks:4,tasks:[]});
  queue=add(queue,'first','game-a','unity');
  queue=add(queue,'same-next','game-a','unity');
  queue=add(queue,'other','game-b','web');
  let reserved=reserveVibeTaskBatch(queue,{maxConcurrentTasks:2});
  assert.deepEqual(new Set(reserved.tasks.map(t=>t.id)),new Set(['first','other']));
  queue=markVibeTaskAwaiting(reserved.queue,{taskId:'first',blocker:'candidate-awaiting-qa-and-deployment'});
  let done=settleVibeTask(queue,{taskId:'other',outcome:'PASS'}).queue;
  const next=selectVibeQueueBatch(done,{maxConcurrentTasks:4});
  assert.equal(next.selected.some(t=>t.id==='same-next'),false);
  assert.equal(next.stopReason,'ONLY_CONFLICTING_WORK_AVAILABLE');
});

test('completed single worker releases capacity before fan-in without dropping source locks or adding QA pressure', () => {
  const queue=createVibeContinuousQueue({
    maxConcurrentTasks:2,
    tasks:[
      {id:'first',gameId:'game-a',target:'web',goal:'first',status:'running',responsibleFiles:['first.js']},
      {id:'other-running',gameId:'game-b',target:'web',goal:'other',status:'running',responsibleFiles:['b.js']},
      {id:'same-root',gameId:'game-a',target:'web',goal:'same',status:'queued',responsibleFiles:['first.js']},
      {id:'refill',gameId:'game-c',target:'web',goal:'refill',status:'queued',responsibleFiles:['c.js']}
    ]
  });
  const released=releaseVibeTaskExecutionSlot(queue,{taskId:'first',evidence:['worker-finished']});
  assert.equal(released.released,true);
  const batch=selectVibeQueueBatch(released.queue,{maxConcurrentTasks:2});
  assert.equal(batch.capacityRunning.length,1);
  assert.equal(batch.releasedWorkerSlots.length,1);
  assert.equal(batch.backpressure.awaitingQaCount,0);
  assert.equal(batch.selected.some(t=>t.id==='same-root'),false);
  assert.equal(batch.selected.some(t=>t.id==='refill'),true);
  const second=releaseVibeTaskExecutionSlot(released.queue,{taskId:'first'});
  assert.equal(second.released,false);
  assert.equal(second.reason,'ALREADY_RELEASED');
});

test('stale slot-release callback never overwrites a real awaiting-QA blocker', () => {
  let queue=add(createVibeContinuousQueue(),'task','task','web');
  queue=reserveNextVibeTask(queue).queue;
  queue=markVibeTaskAwaiting(queue,{taskId:'task',blocker:'candidate-awaiting-qa-and-deployment'});
  const released=releaseVibeTaskExecutionSlot(queue,{taskId:'task'});
  assert.equal(released.released,false);
  assert.equal(released.reason,'ALREADY_RELEASED');
  assert.equal(released.queue.tasks[0].blocker,'candidate-awaiting-qa-and-deployment');
});

test('queue-local waiting QA pressure does not globally collapse unrelated lanes', () => {
  for(const count of [0,2,4,6,8]){
    const tasks=Array.from({length:count},(_,i)=>({id:`run-${i}`,gameId:`g-${i}`,target:'web',sourceRoot:`web-games/g-${i}`,goal:'run',status:'running',blocker:'candidate-awaiting-qa-and-deployment'}));
    const queue=createVibeContinuousQueue({maxConcurrentTasks:30,tasks});
    const batch=selectVibeQueueBatch(queue,{maxConcurrentTasks:30});
    assert.equal(batch.effectiveMaxConcurrentTasks,30);
    assert.equal(batch.capacityRunning.length,0);
  }
});

test('critical high-risk task creates three variants even if legacy opt-in flag is absent', () => {
  let queue=createVibeContinuousQueue({tasks:[],maxConcurrentTasks:4});
  queue=add(queue,'critical-risk','critical-risk','web',{priority:'critical',estimatedRisk:'high',speculativeEligible:false});
  const reserved=reserveVibeTaskBatch(queue,{maxConcurrentTasks:4});
  assert.equal(reserved.matrix[0].speculativeVariants,3);
});

test('high-risk opt-in task creates three speculative worker variants', () => {
  let queue=createVibeContinuousQueue({maxConcurrentTasks:4,tasks:[]});
  queue=add(queue,'risky','risky','web',{estimatedRisk:'high',speculativeEligible:true});
  const reserved=reserveVibeTaskBatch(queue,{maxConcurrentTasks:4});
  assert.equal(reserved.matrix[0].speculativeVariants,3);
});

test('primary task coverage consumes the worker budget before speculative variants', () => {
  let queue=createVibeContinuousQueue({maxConcurrentTasks:4,tasks:[]});
  for(let i=0;i<4;i++) queue=add(queue,`primary-first-${i}`,`primary-first-${i}`,'web',{priority:'critical',estimatedRisk:'high',speculativeEligible:true});
  const reserved=reserveVibeTaskBatch(queue,{maxConcurrentTasks:4});
  assert.equal(reserved.tasks.length,4);
  assert.deepEqual(reserved.matrix.map(row=>row.speculativeVariants),[1,1,1,1]);
  assert.equal(reserved.matrix.reduce((sum,row)=>sum+row.speculativeVariants,0),4);
});

test('spare speculative slot prefers short repair over long full web rebuild without dropping either primary',()=>{
  const queue=createVibeContinuousQueue({maxConcurrentTasks:3,tasks:[
    {
      id:'alpha-web-base-implementation-v1',gameId:'alpha',target:'web',department:'development',type:'implementation',
      goal:'FULL_WEB_GAME_REBUILD actual game',status:'queued',priority:'critical',estimatedRisk:'high',speculativeEligible:true,
      packageLongWorkProtected:true,responsibleFiles:['index.html']
    },
    {
      id:'beta-web-runtime-repair-v1',gameId:'beta',target:'web',department:'development',type:'implementation',
      goal:'targeted runtime repair',status:'queued',priority:'critical',estimatedRisk:'high',speculativeEligible:true,
      packageLongWorkProtected:true,responsibleFiles:['index.html']
    }
  ]});
  const reserved=reserveVibeTaskBatch(queue,{maxConcurrentTasks:3});
  assert.equal(reserved.tasks.length,2);
  assert.deepEqual(reserved.matrix.map(row=>row.speculativeVariants),[1,2]);
  assert.deepEqual(reserved.matrix.map(row=>row.speculativePriority),[2,0]);
  assert.equal(reserved.matrix.reduce((sum,row)=>sum+row.speculativeVariants,0),3);
});

test('spare adaptive worker slots are shared across high-risk tasks before a third variant', () => {
  let queue=createVibeContinuousQueue({maxConcurrentTasks:4,tasks:[]});
  queue=add(queue,'risk-a','risk-a','web',{priority:'critical',estimatedRisk:'high',speculativeEligible:true});
  queue=add(queue,'risk-b','risk-b','web',{priority:'critical',estimatedRisk:'high',speculativeEligible:true});
  const reserved=reserveVibeTaskBatch(queue,{maxConcurrentTasks:4});
  assert.deepEqual(reserved.matrix.map(row=>row.speculativeVariants),[2,2]);
  assert.equal(reserved.matrix.reduce((sum,row)=>sum+row.speculativeVariants,0),4);
});

test('fan-in accepts first passing speculative variant and keeps task awaiting full QA', () => {
  let queue=createVibeContinuousQueue({maxConcurrentTasks:4,tasks:[]});
  queue=add(queue,'risky','risky','web',{estimatedRisk:'high',speculativeEligible:true});
  queue=reserveVibeTaskBatch(queue,{maxConcurrentTasks:4}).queue;
  const merged=applyVibeFanInResults(queue,[
    {taskId:'risky',variant:'primary',outcome:'FAIL',durationMs:900,evidence:['primary-fail']},
    {taskId:'risky',variant:'speculative',outcome:'PASS',durationMs:700,evidence:['spec-pass'],blocker:'candidate-awaiting-qa-and-deployment'}
  ]);
  const task=merged.queue.tasks.find(t=>t.id==='risky');
  assert.equal(task.status,'running');
  assert.equal(task.blocker,'candidate-awaiting-qa-and-deployment');
  assert.ok(task.evidence.includes('speculative-winner:speculative'));
});

test('fan-in preserves verified per-variant coding failure provenance without blaming unclassified infrastructure failure', () => {
  let queue=createVibeContinuousQueue({maxConcurrentTasks:4,tasks:[]});
  queue=add(queue,'strategy-risk','strategy-risk','web',{estimatedRisk:'high',speculativeEligible:true});
  queue=reserveVibeTaskBatch(queue,{maxConcurrentTasks:4}).queue;
  const fp='web|MOBILE_PLACEMENT_INPUT_MISSING';
  const merged=applyVibeFanInResults(queue,[
    {taskId:'strategy-risk',variant:'primary',outcome:'FAIL',durationMs:900,evidence:['actions-run:negative-run'],candidateFailure:{class:'EDIT_MATCH'},codingMethod:{strategy:'RESPONSIBILITY_FIRST',failureFingerprint:fp,implementationPass:false,incrementalQaPass:false,performanceSanityPass:false}},
    {taskId:'strategy-risk',variant:'speculative-1',outcome:'FAIL',durationMs:850,evidence:['actions-run:negative-run'],candidateFailure:{class:'OTHER'},codingMethod:{strategy:'DEPENDENCY_SAFE_COHERENT_PATCH',failureFingerprint:fp,implementationPass:false,incrementalQaPass:false,performanceSanityPass:false}},
    {taskId:'strategy-risk',variant:'speculative-2',outcome:'PASS',durationMs:700,evidence:['spec-pass'],blocker:'candidate-awaiting-qa-and-deployment',codingMethod:{strategy:'CAUSAL_TRACE_FIRST',failureFingerprint:fp,implementationPass:true,incrementalQaPass:true,performanceSanityPass:true}}
  ]);
  const task=merged.queue.tasks.find(t=>t.id==='strategy-risk');
  const markers=task.evidence.filter(value=>value.startsWith('coding-strategy-negative:'));
  assert.equal(markers.length,1);
  const payload=JSON.parse(decodeURIComponent(markers[0].slice('coding-strategy-negative:'.length)));
  assert.equal(payload.variant,'primary');
  assert.equal(payload.strategy,'RESPONSIBILITY_FIRST');
  assert.equal(payload.failureFingerprint,fp);
  assert.equal(payload.failureClass,'EDIT_MATCH');
  assert.equal(payload.verifiedBy,'IMMUTABLE_WORKER_RESULT');
  assert.equal(payload.infrastructureFailure,false);
  assert.equal(task.evidence.some(value=>value.includes('DEPENDENCY_SAFE_COHERENT_PATCH')),false);
});

test('semantic diff budget failures become contextual negative coding-strategy evidence',()=>{
  let queue=createVibeContinuousQueue({maxConcurrentTasks:2,tasks:[]});
  queue=add(queue,'semantic-risk','semantic-risk','web',{estimatedRisk:'high',speculativeEligible:true});
  queue=reserveVibeTaskBatch(queue,{maxConcurrentTasks:2}).queue;
  const fp='web|PLACEMENT_BROKEN';
  const merged=applyVibeFanInResults(queue,[
    {taskId:'semantic-risk',variant:'primary',outcome:'FAIL',durationMs:500,evidence:['actions-run:semantic-negative'],candidateFailure:{class:'SEMANTIC_DIFF_BUDGET'},codingMethod:{strategy:'PRIMARY_RESPONSIBILITY_MINIMAL',failureFingerprint:fp,implementationPass:false,incrementalQaPass:false,performanceSanityPass:false}},
    {taskId:'semantic-risk',variant:'speculative-1',outcome:'PASS',durationMs:600,evidence:['candidate-ok'],blocker:'candidate-awaiting-qa-and-deployment',codingMethod:{strategy:'DEPENDENCY_SAFE_COHERENT_PATCH',failureFingerprint:fp,implementationPass:true,incrementalQaPass:true,performanceSanityPass:true}}
  ]);
  const task=merged.queue.tasks.find(t=>t.id==='semantic-risk');
  const marker=task.evidence.find(value=>value.startsWith('coding-strategy-negative:'));
  assert.ok(marker);
  const payload=JSON.parse(decodeURIComponent(marker.slice('coding-strategy-negative:'.length)));
  assert.equal(payload.failureClass,'SEMANTIC_DIFF_BUDGET');
  assert.equal(payload.strategy,'PRIMARY_RESPONSIBILITY_MINIMAL');
  assert.equal(payload.failureFingerprint,fp);
  assert.equal(payload.infrastructureFailure,false);
});
test('fan-in safely reconciles queued task only when reservation identity matches', () => {
  let queue=createVibeContinuousQueue({maxConcurrentTasks:4,tasks:[]});
  queue=add(queue,'race','race','web',{priority:'critical',estimatedRisk:'high'});
  const reservation={id:'run-1:1',runId:'run-1',runAttempt:1,reservedAt:'2026-09-18T12:00:00Z'};
  const reserved=reserveVibeTaskBatch(queue,{maxConcurrentTasks:4,reservation});
  const reset=createVibeContinuousQueue({
    maxConcurrentTasks:4,
    tasks:reserved.queue.tasks.map(task=>task.id==='race'?{...task,status:'queued',blocker:null}:task)
  });
  const merged=applyVibeFanInResults(reset,[{
    taskId:'race',reservationId:'run-1:1',variant:'primary',outcome:'PASS',
    evidence:['candidate-branch'],blocker:'candidate-awaiting-qa-and-deployment'
  }]);
  const task=merged.queue.tasks.find(t=>t.id==='race');
  assert.equal(task.status,'running');
  assert.equal(task.blocker,'candidate-awaiting-qa-and-deployment');
  assert.ok(task.evidence.includes('fan-in-reconciled-reservation:run-1:1'));
  assert.equal(merged.applied[0].outcome,'AWAIT');
});

test('fan-in skips stale reservation result without mutating requeued task', () => {
  let queue=createVibeContinuousQueue({maxConcurrentTasks:4,tasks:[]});
  queue=add(queue,'race','race','web',{priority:'critical',estimatedRisk:'high'});
  const reserved=reserveVibeTaskBatch(queue,{maxConcurrentTasks:4,reservation:{id:'new-run:1',runId:'new-run',runAttempt:1,reservedAt:'2026-09-18T12:01:00Z'}});
  const reset=createVibeContinuousQueue({
    maxConcurrentTasks:4,
    tasks:reserved.queue.tasks.map(task=>task.id==='race'?{...task,status:'queued'}:task)
  });
  const merged=applyVibeFanInResults(reset,[{
    taskId:'race',reservationId:'old-run:1',variant:'primary',outcome:'PASS',
    evidence:['old-candidate'],blocker:'candidate-awaiting-qa-and-deployment'
  }]);
  const task=merged.queue.tasks.find(t=>t.id==='race');
  assert.equal(task.status,'queued');
  assert.equal(task.reservationId,'new-run:1');
  assert.equal(task.evidence.includes('old-candidate'),false);
  assert.equal(merged.applied[0].outcome,'STALE_RESULT_SKIPPED');
  assert.equal(merged.applied[0].reason,'RESERVATION_MISMATCH');
});

test('retryable failure clears reservation identity before the next reservation', () => {
  let queue=add(createVibeContinuousQueue(),'retry-reservation','retry-reservation','web',{maxRetries:2});
  const reserved=reserveNextVibeTask(queue,{reservation:{id:'run-a:1',runId:'run-a',runAttempt:1,reservedAt:'2026-09-18T12:00:00Z'}});
  assert.equal(reserved.task.reservationId,'run-a:1');
  const failed=settleVibeTask(reserved.queue,{taskId:'retry-reservation',outcome:'FAIL',blocker:'source-candidate-generation-failed'});
  const task=failed.queue.tasks[0];
  assert.equal(task.status,'queued');
  assert.equal(task.reservationId,null);
  assert.equal(task.reservationRunId,null);
  assert.equal(task.reservationRunAttempt,0);
  assert.equal(task.reservedAt,null);
});

test('retryable failure clears blocker and remains selectable until retry limit', () => {
  let queue=add(createVibeContinuousQueue(),'retry','retry','unity',{maxRetries:1});
  let reserved=reserveNextVibeTask(queue);
  let failed=settleVibeTask(reserved.queue,{taskId:'retry',outcome:'FAIL',evidence:['fail-1'],blocker:'source-candidate-generation-failed'});
  assert.equal(failed.queue.tasks[0].status,'queued');
  reserved=reserveNextVibeTask(failed.queue);
  failed=settleVibeTask(reserved.queue,{taskId:'retry',outcome:'FAIL',evidence:['fail-2'],blocker:'source-candidate-generation-failed'});
  assert.equal(failed.queue.tasks[0].status,'failed');
});

test('stale running development reservation is requeued without consuming retry', () => {
  const queue=createVibeContinuousQueue({tasks:[{
    id:'stale',gameId:'stale',target:'web',department:'development',type:'implementation',
    sourceRoot:'web-games/stale',goal:'implementation',status:'running',retries:1,maxRetries:2,
    reservationId:'run-old:1',reservationRunId:'run-old',reservationRunAttempt:1,reservedAt:'2026-09-18T09:00:00Z'
  }]});
  const recovered=recoverStaleRunningReservations(queue,{nowMs:Date.parse('2026-09-18T10:00:00Z')});
  const task=recovered.queue.tasks[0];
  assert.equal(recovered.recovered,1);
  assert.equal(task.status,'queued');
  assert.equal(task.retries,1);
  assert.equal(task.lastOutcome,'STALE_RESERVATION_RECOVERED');
  assert.equal(task.reservationId,null);
  assert.ok(task.evidence.includes('recovery:stale-running-reservation-v1'));
});

test('awaiting QA running reservation is not reclaimed as stale worker capacity', () => {
  const queue=createVibeContinuousQueue({tasks:[{
    id:'awaiting',gameId:'awaiting',target:'web',department:'development',type:'implementation',
    sourceRoot:'web-games/awaiting',goal:'implementation',status:'running',blocker:'candidate-awaiting-qa-and-deployment',
    reservationId:'run-old:1',reservedAt:'2026-09-18T08:00:00Z'
  }]});
  const recovered=recoverStaleRunningReservations(queue,{nowMs:Date.parse('2026-09-18T10:00:00Z')});
  assert.equal(recovered.recovered,0);
  assert.equal(recovered.queue.tasks[0].status,'running');
  assert.equal(recovered.queue.tasks[0].reservationId,'run-old:1');
});

test('fan-in regression failure requeues matching worker-pass task and clears reservation', () => {
  const queue=createVibeContinuousQueue({tasks:[{
    id:'pass-worker',gameId:'a',target:'web',department:'development',type:'implementation',
    sourceRoot:'web-games/a',goal:'a',status:'running',blocker:'candidate-awaiting-qa-and-deployment',
    retries:1,maxRetries:2,reservationId:'run-1:1',reservationRunId:'run-1',reservationRunAttempt:1,reservedAt:'2026-09-18T09:00:00Z'
  }]});
  const recovered=recoverFanInRegressionFailure(queue,[{taskId:'pass-worker',reservationId:'run-1:1',outcome:'PASS'}]);
  const task=recovered.queue.tasks[0];
  assert.equal(recovered.recovered,1);
  assert.equal(task.status,'queued');
  assert.equal(task.retries,1);
  assert.equal(task.lastOutcome,'RETRY_AFTER_FAN_IN_REGRESSION_FAILURE');
  assert.equal(task.reservationId,null);
  assert.ok(task.evidence.includes('failure-cause:fan-in-regression-failed'));
  assert.ok(task.evidence.includes('recovery:fan-in-regression-requeue-v1'));
});

test('fan-in regression recovery ignores stale mismatched reservation result', () => {
  const queue=createVibeContinuousQueue({tasks:[{
    id:'pass-worker',gameId:'a',target:'web',department:'development',type:'implementation',
    sourceRoot:'web-games/a',goal:'a',status:'running',blocker:'candidate-awaiting-qa-and-deployment',
    reservationId:'new-run:1',reservedAt:'2026-09-18T09:00:00Z'
  }]});
  const recovered=recoverFanInRegressionFailure(queue,[{taskId:'pass-worker',reservationId:'old-run:1',outcome:'PASS'}]);
  assert.equal(recovered.recovered,0);
  assert.equal(recovered.queue.tasks[0].status,'running');
  assert.equal(recovered.queue.tasks[0].reservationId,'new-run:1');
});

test('output-budget repair requeues capped owner full-web rebuild failures once even after v1 transport retry', () => {
  const queue=createVibeContinuousQueue({tasks:[
    {
      id:'full-web',gameId:'web',target:'web',sourceRoot:'web-games/web',goal:'FULL_WEB_GAME_REBUILD actual game',
      ownerDirective:true,status:'failed',retries:3,maxRetries:2,blocker:'source-candidate-generation-failed',
      evidence:['old-failure','repair-retry:vibe2-full-web-stream-http-v1']
    },
    {
      id:'normal-web',gameId:'normal',target:'web',sourceRoot:'web-games/normal',goal:'normal maintenance',
      ownerDirective:true,status:'failed',retries:3,maxRetries:2,blocker:'source-candidate-generation-failed',evidence:['old-failure']
    }
  ]});
  const first=recoverFixedFullWebTransportFailures(queue);
  assert.equal(first.recovered,1);
  const repaired=first.queue.tasks.find(t=>t.id==='full-web');
  assert.equal(repaired.status,'queued');
  assert.equal(repaired.retries,0);
  assert.equal(repaired.blocker,null);
  assert.equal(repaired.lastOutcome,'RETRY_AFTER_INFRA_REPAIR');
  assert.ok(repaired.evidence.includes('repair-retry:vibe2-full-web-stream-http-v1'));
  assert.ok(repaired.evidence.includes('repair-retry:vibe2-full-web-output-budget-v2'));
  assert.equal(first.queue.tasks.find(t=>t.id==='normal-web').status,'failed');
  const second=recoverFixedFullWebTransportFailures(first.queue);
  assert.equal(second.recovered,0);
});

test('protected or paid autonomous work remains ineligible', () => {
  let queue=createVibeContinuousQueue();
  queue=add(queue,'protected','protected','unity',{protectedChange:true});
  queue=add(queue,'paid','paid','unreal',{paidResourceRequired:true});
  const next=selectVibeQueueBatch(queue);
  assert.equal(next.hasEligibleWork,false);
  assert.equal(next.blocked.length,2);
});

test('twenty independent tasks can fill all 20 slots', () => {
  let queue=createVibeContinuousQueue({maxConcurrentTasks:20,tasks:[]});
  for(let i=0;i<20;i++) queue=add(queue,`t-${i}`,`g-${i}`,'web',{responsibleFiles:[`f-${i}.js`]});
  const reserved=reserveVibeTaskBatch(queue,{maxConcurrentTasks:20});
  assert.equal(reserved.tasks.length,20);
  assert.equal(reserved.selection.effectiveMaxConcurrentTasks,20);
});

test('Gemini quota wait releases worker capacity while preserving source lock', () => {
  const queue=createVibeContinuousQueue({maxConcurrentTasks:2,tasks:[
    {id:'quota-wait',gameId:'game-a',target:'web',sourceRoot:'web-games/game-a',goal:'model-bound review',status:'running',blocker:'WAITING_FOR_GEMINI_QUOTA',responsibleFiles:['shared.js']},
    {id:'same-root',gameId:'game-a',target:'web',sourceRoot:'web-games/game-a',goal:'same root work',status:'queued',responsibleFiles:['shared.js']},
    {id:'independent',gameId:'game-b',target:'web',sourceRoot:'web-games/game-b',goal:'independent implementation',status:'queued',responsibleFiles:['game.js']}
  ]});
  const batch=selectVibeQueueBatch(queue,{maxConcurrentTasks:2});
  assert.equal(batch.capacityRunning.length,0);
  assert.deepEqual(batch.quotaWaiting.map(task=>task.id),['quota-wait']);
  assert.equal(batch.freeSlots,2);
  assert.equal(batch.selected.some(task=>task.id==='same-root'),false);
  assert.equal(batch.selected.some(task=>task.id==='independent'),true);
  const summary=createVibeContinuousQueue(batch.selected.length?queue:queue);
  assert.equal(summary.tasks.length,3);
});

test('awaiting QA backpressure does not consume worker slots twice', () => {
  const awaiting=Array.from({length:8},(_,i)=>({
    id:`await-${i}`,gameId:`await-${i}`,target:'web',sourceRoot:`web-games/await-${i}`,goal:'await',
    status:'running',blocker:'candidate-awaiting-qa-and-deployment'
  }));
  const queued=Array.from({length:10},(_,i)=>({
    id:`next-${i}`,gameId:`next-${i}`,target:'web',sourceRoot:`web-games/next-${i}`,goal:'next',status:'queued'
  }));
  const queue=createVibeContinuousQueue({maxConcurrentTasks:30,tasks:[...awaiting,...queued]});
  const batch=selectVibeQueueBatch(queue,{maxConcurrentTasks:30});
  assert.equal(batch.effectiveMaxConcurrentTasks,30);
  assert.equal(batch.running.length,8);
  assert.equal(batch.capacityRunning.length,0);
  assert.equal(batch.awaitingQa.length,8);
  assert.equal(batch.freeSlots,30);
  assert.equal(batch.selected.length,10);
});

test('per-run request cannot exceed persisted queue cap', () => {
  let queue=createVibeContinuousQueue({maxConcurrentTasks:6,tasks:[]});
  for(let i=0;i<10;i++) queue=add(queue,`cap-${i}`,`cap-${i}`,'web',{responsibleFiles:[`cap-${i}.js`]});
  const batch=selectVibeQueueBatch(queue,{maxConcurrentTasks:20});
  assert.equal(batch.persistentMaxConcurrentTasks,6);
  assert.equal(batch.requestedMaxConcurrentTasks,20);
  assert.equal(batch.effectiveMaxConcurrentTasks,6);
  assert.equal(batch.selected.length,6);
});

test('terminal historical failures do not permanently throttle new work', () => {
  const failed=Array.from({length:8},(_,i)=>({
    id:`failed-${i}`,gameId:`failed-${i}`,target:'web',sourceRoot:`web-games/failed-${i}`,goal:'failed',
    status:'failed',lastOutcome:'FAIL',retries:3,maxRetries:2,blocker:'retry-limit-exceeded'
  }));
  const queued=Array.from({length:20},(_,i)=>({
    id:`fresh-${i}`,gameId:`fresh-${i}`,target:'web',sourceRoot:`web-games/fresh-${i}`,goal:'fresh',status:'queued'
  }));
  const queue=createVibeContinuousQueue({maxConcurrentTasks:20,tasks:[...failed,...queued]});
  const batch=selectVibeQueueBatch(queue,{maxConcurrentTasks:20});
  assert.equal(batch.backpressure.retryPressureCount,0);
  assert.equal(batch.effectiveMaxConcurrentTasks,20);
  assert.equal(batch.selected.length,20);
});


test('work package metadata survives queue normalization and larger functional package wins same-tier scheduling', () => {
  const queue=createVibeContinuousQueue({maxConcurrentTasks:1,tasks:[
    {id:'tiny',gameId:'a',target:'web',goal:'tiny',sourceRoot:'web-games/a',responsibleFiles:['a.js'],status:'queued',priority:'normal',releaseState:'development-confirmed',packageId:'p-tiny',taskWorkUnits:1,packageWorkUnits:1,packageSize:1},
    {id:'feature',gameId:'b',target:'web',goal:'feature',sourceRoot:'web-games/b',responsibleFiles:['b.js'],status:'queued',priority:'normal',releaseState:'development-confirmed',packageId:'p-feature',packageGoal:'finish feature',packageRole:'implementation-owner',taskWorkUnits:3,packageWorkUnits:6,packageSize:2,packageLongWorkProtected:true,completionCriteria:['functional-scope-implemented'],packageContext:{explorationMode:'planner-precomputed-shared-context',sharedPreparation:true,sourceRoot:'web-games/b',responsibleFiles:['b.js']}}
  ]});
  const selection=selectVibeQueueBatch(queue,{maxConcurrentTasks:1});
  assert.equal(selection.selected[0].id,'feature');
  assert.equal(selection.selected[0].packageId,'p-feature');
  assert.equal(selection.selected[0].packageContext.sharedPreparation,true);
  assert.deepEqual([...selection.selected[0].completionCriteria],['functional-scope-implemented']);
});


test('practice-only PASS settles done without candidate QA promotion', () => {
  let queue=createVibeContinuousQueue({tasks:[{
    id:'practice',target:'web',department:'development',type:'research',goal:'[VIBE_LEARNING_PRACTICE] save',
    status:'running',priority:'low',releaseState:'other',evidence:['learning-practice-only','production-pass:NO']
  }]});
  const merged=applyVibeFanInResults(queue,[{
    taskId:'practice',variant:'primary',outcome:'PASS',blocker:'learning-practice-complete',
    evidence:['learning-practice-only','production-pass:NO','source-write:NO']
  }]);
  const task=merged.queue.tasks.find(t=>t.id==='practice');
  assert.equal(task.status,'done');
  assert.equal(task.lastOutcome,'PASS');
  assert.ok(task.evidence.includes('production-pass:NO'));
  assert.equal(merged.applied[0].outcome,'DONE_PRACTICE');
});


test('source generation infrastructure repair requeues exhausted web development task once', () => {
  const queue=createVibeContinuousQueue({tasks:[{
    id:'game-web-runtime-repair-v1',gameId:'game',target:'web',department:'development',type:'implementation',
    sourceRoot:'web-games/game',goal:'[VIBE_WEB_REPAIR] exact runtime repair',status:'failed',retries:3,maxRetries:2,
    blocker:'source-candidate-generation-failed',reservationId:null
  }]});
  const first=recoverFixedSourceCandidateGenerationFailures(queue);
  assert.equal(first.recovered,1);
  assert.equal(first.queue.tasks[0].status,'queued');
  assert.equal(first.queue.tasks[0].retries,0);
  assert.equal(first.queue.tasks[0].blocker,null);
  assert.equal(first.queue.tasks[0].lastOutcome,'RETRY_AFTER_SOURCE_GENERATION_INFRA_REPAIR');
  assert.ok(first.queue.tasks[0].evidence.includes('repair-retry:vibe2-source-generation-context-v3'));

  const exhaustedAgain=createVibeContinuousQueue({tasks:[{
    ...first.queue.tasks[0],status:'failed',retries:3,blocker:'source-candidate-generation-failed'
  }]});
  const second=recoverFixedSourceCandidateGenerationFailures(exhaustedAgain);
  assert.equal(second.recovered,0);
  assert.equal(second.queue.tasks[0].status,'failed');
});

test('source generation infrastructure repair does not reopen QA failures', () => {
  const queue=createVibeContinuousQueue({tasks:[{
    id:'qa-failed',gameId:'game',target:'web',department:'development',type:'implementation',
    sourceRoot:'web-games/game',goal:'implementation',status:'failed',retries:3,maxRetries:2,
    blocker:'web-qa-or-promotion-failed'
  }]});
  const recovered=recoverFixedSourceCandidateGenerationFailures(queue);
  assert.equal(recovered.recovered,0);
  assert.equal(recovered.queue.tasks[0].status,'failed');
});


test('generic Web source failure stays superseded instead of reopening', () => {
  const queue=createVibeContinuousQueue({tasks:[{
    id:'game-existing-web-assessment-v1',gameId:'game',target:'web',department:'development',type:'implementation',
    sourceRoot:'web-games/game',goal:'[EXISTING_WEB_ASSESS_AND_IMPLEMENT]',status:'failed',retries:3,maxRetries:2,
    blocker:'source-candidate-generation-failed'
  }]});
  const recovered=recoverFixedSourceCandidateGenerationFailures(queue);
  assert.equal(recovered.recovered,0);
  assert.equal(recovered.queue.tasks[0].status,'failed');
});


test('exact Web base source generation failure can recover once', () => {
  const queue=createVibeContinuousQueue({tasks:[{
    id:'game-web-base-implementation-v1',gameId:'game',target:'web',department:'development',type:'implementation',
    sourceRoot:'web-games/game',goal:'[WEB_BASE_IMPLEMENTATION] source bootstrap',status:'failed',retries:3,maxRetries:2,
    blocker:'source-candidate-generation-failed',reservationId:null,evidence:['source-root-bootstrap-required']
  }]});
  const recovered=recoverFixedSourceCandidateGenerationFailures(queue);
  assert.equal(recovered.recovered,1);
  assert.equal(recovered.queue.tasks[0].status,'queued');
  assert.equal(recovered.queue.tasks[0].lastOutcome,'RETRY_AFTER_SOURCE_GENERATION_INFRA_REPAIR');
});


test('continuous reserve runs fast regression before reserving expensive workers', () => {
  const workflow=fs.readFileSync('.github/workflows/vibe2-continuous-core.yml','utf8');
  const preflightAt=workflow.indexOf('VIBE2_RESERVE_FAST_REGRESSION=PASS');
  const reserveAt=workflow.indexOf('- name: Reserve conflict-free DAG batch');
  assert.ok(preflightAt>0);
  assert.ok(reserveAt>preflightAt);
  assert.match(workflow,/node --test --test-concurrency=4 \\\n\s+qa\/vibe2-source-worker\.test\.mjs \\\n\s+qa\/vibe2-queue-control\.test\.mjs \\\n\s+qa\/vibe2-parallelism-telemetry\.test\.mjs/);
});
