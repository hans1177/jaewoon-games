import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runSystemStewardState, runSystemStewardFiles } from '../tools/vibe2-system-steward.mjs';

const directQueue=(tasks=[])=>({
  version:6,
  mode:'independent-dag-direct-reservation-queue',
  maxConcurrentTasks:null,
  execution:{
    dagDependencies:true,workStealing:true,sourceRootExclusive:false,gameWideLockForbidden:true,
    sameGameNonOverlappingPackagesParallel:true,responsibleFileExclusive:true,exactDuplicateSuppression:true,
    atomicSharedStateWriteMode:'OPTIMISTIC_RETRY',atomicNeuronCompletion:true,taskMicroFanIn:true,
    independentEligibleTaskStart:'IMMEDIATE',internalGlobalParallelCap:null,externalMatrixTransportPartitionMax:256,
    learningIdleFixedWorkers:1,assetDevelopmentLaneMax:64,assetDevelopmentSpeculativeVariantsPerTask:1
  },
  tasks
});

test('steward migrates legacy queue state to direct v6 while recovering stale work',()=>{
  const result=runSystemStewardState({
    now:'2026-09-19T12:00:00Z',
    queueInput:{version:5,maxConcurrentTasks:32,tasks:[
      {id:'stale',gameId:'a',target:'web',goal:'x',status:'running',reservedAt:'2026-09-19T10:00:00Z'},
      {id:'dead-a',gameId:'b',target:'web',department:'development',type:'implementation',goal:'x',status:'failed',retries:3,maxRetries:2,blocker:'source-candidate-generation-failed'}
    ]},
    controlInput:{version:4,currentMax:4,lastUpdatedAt:'2026-09-19T09:00:00Z'}
  });
  assert.equal(result.queue.version,6);
  assert.equal(result.queue.maxConcurrentTasks,null);
  assert.equal(result.queue.execution.internalGlobalParallelCap,null);
  assert.equal(result.queue.execution.externalMatrixTransportPartitionMax,256);
  assert.ok(result.actions.includes('MIGRATE_QUEUE_DIRECT_EXECUTION_V6'));
  assert.ok(result.actions.includes('RECOVER_STALE_RUNNING_RESERVATION'));
  assert.ok(result.actions.includes('RESUME_UNLIMITED_CAUSAL_REPAIR'));
  assert.ok(result.actions.includes('RESET_INVALID_PARALLELISM_STATE'));
  assert.equal(result.control.currentMax,256);
  assert.equal(result.queue.tasks.find(t=>t.id==='stale').status,'queued');
  const dead=result.queue.tasks.find(t=>t.id==='dead-a');
  assert.equal(dead.status,'queued');
  assert.equal(dead.retries,3);
  assert.equal(dead.retryPolicy,'UNLIMITED_CAUSAL_REPAIR');
  assert.equal(dead.maxRetries,null);
});

test('steward keeps an already-direct queue cap-free',()=>{
  const result=runSystemStewardState({
    now:'2026-09-19T12:00:00Z',
    queueInput:directQueue([{id:'dev',gameId:'g',target:'web',goal:'x',status:'queued'}]),
    controlInput:{version:4,currentMax:256}
  });
  assert.equal(result.queue.version,6);
  assert.equal(result.queue.maxConcurrentTasks,null);
  assert.equal(result.queue.execution.internalGlobalParallelCap,null);
  assert.equal(result.actions.includes('MIGRATE_QUEUE_DIRECT_EXECUTION_V6'),false);
});

test('stale pressure telemetry resets advisory target without changing primary eligibility',()=>{
  const result=runSystemStewardState({
    now:'2026-09-19T12:00:00Z',
    queueInput:directQueue(),
    controlInput:{version:4,currentMax:32,lastDecision:'DOWN',lastReason:'RUNNER_QUEUE_WAIT',lastUpdatedAt:'2026-09-19T09:00:00Z',lastTelemetry:{runId:'pressure-1',pressureLevel:'HIGH'}}
  });
  assert.equal(result.action,'RESET_STALE_PARALLELISM_PRESSURE');
  assert.equal(result.control.currentMax,256);
  assert.equal(result.control.lastReason,'SYSTEM_STEWARD_STALE_PRESSURE_ADVISORY_RESET_TO_256');
  assert.equal(result.queue.maxConcurrentTasks,null);
  assert.equal(result.queue.execution.internalGlobalParallelCap,null);
});

test('steward repairs invalid advisory state and requeues stale machine blockers after direct migration',()=>{
  const result=runSystemStewardState({
    now:'2026-09-19T12:00:00Z',
    queueInput:{version:5,maxConcurrentTasks:30,tasks:[
      {id:'blocked-dev',gameId:'bug-defense',target:'web',goal:'continue game development',status:'blocked',blocker:'MACHINE_STATE_INCONSISTENT:QUEUE_MAX_DIVERGED|PERSISTENT_MAX_OUTSIDE_STEPS'}
    ]},
    controlInput:{version:4,currentMax:12,lastUpdatedAt:'2026-09-19T11:59:00Z'}
  });
  const task=result.queue.tasks[0];
  assert.equal(result.queue.version,6);
  assert.equal(result.queue.maxConcurrentTasks,null);
  assert.equal(result.control.currentMax,256);
  assert.equal(result.control.lastReason,'SYSTEM_STEWARD_INVALID_V4_PRESSURE_ADVISORY_RESET_TO_256');
  assert.equal(task.status,'queued');
  assert.equal(task.blocker,null);
  assert.ok(result.actions.includes('RESET_INVALID_PARALLELISM_STATE'));
  assert.ok(result.actions.includes('MIGRATE_QUEUE_DIRECT_EXECUTION_V6'));
  assert.ok(result.actions.includes('RECOVER_STALE_MACHINE_STATE_BLOCKER'));
  assert.ok(task.evidence.includes('system-steward:machine-state-revalidated:v6-direct-execution-transport-256'));
});

test('fresh verified pressure advisory step is preserved',()=>{
  const result=runSystemStewardState({
    now:'2026-09-19T12:00:00Z',
    queueInput:directQueue([{id:'dev',gameId:'g',target:'web',goal:'x',status:'queued'}]),
    controlInput:{version:4,currentMax:16,lastDecision:'DOWN',lastReason:'RUNNER_QUEUE_WAIT',lastUpdatedAt:'2026-09-19T11:59:00Z',lastTelemetry:{runId:'pressure-2',pressureLevel:'HIGH'}}
  });
  assert.equal(result.control.currentMax,16);
  assert.equal(result.actions.includes('RESET_INVALID_PARALLELISM_STATE'),false);
});

test('invalid advisory step without verified telemetry resets to default advisory target',()=>{
  const result=runSystemStewardState({
    now:'2026-09-19T12:00:00Z',
    queueInput:directQueue(),
    controlInput:{version:4,currentMax:20,lastDecision:'HOLD',lastUpdatedAt:'2026-09-19T11:59:00Z'}
  });
  assert.equal(result.control.currentMax,256);
  assert.equal(result.control.lastReason,'SYSTEM_STEWARD_INVALID_V4_PRESSURE_ADVISORY_RESET_TO_256');
  assert.ok(result.actions.includes('RESET_INVALID_PARALLELISM_STATE'));
});

test('steward does not consume a repair on external wait work',()=>{
  const result=runSystemStewardState({
    now:'2026-09-19T12:00:00Z',
    queueInput:directQueue([{id:'wait',gameId:'r',target:'roblox',goal:'runtime',status:'running',blocker:'roblox-dedicated-runner-offline-deferred',reservedAt:'2026-09-19T09:00:00Z'}]),
    controlInput:{version:4,currentMax:256,lastUpdatedAt:'2026-09-19T11:50:00Z'}
  });
  assert.equal(result.action,'NO_RUNNABLE_WORK_FOR_PLANNER_REFILL');
});

test('steward never reopens bounded QA or protected failures as unlimited causal repair',()=>{
  const result=runSystemStewardState({
    now:'2026-09-19T12:00:00Z',
    queueInput:directQueue([
      {id:'qa-fail',gameId:'q',target:'web',department:'qa',type:'qa',goal:'verify',status:'failed',retries:9,maxRetries:2,blocker:'qa-failed'},
      {id:'protected-dev',gameId:'p',target:'web',department:'development',type:'implementation',goal:'protected',status:'failed',retries:9,maxRetries:2,protectedChange:true,blocker:'protected-failed'}
    ]),
    controlInput:{version:4,currentMax:16,lastUpdatedAt:'2026-09-19T11:59:00Z',lastTelemetry:{runId:'pressure-3'}}
  });
  assert.equal(result.actions.includes('RESUME_UNLIMITED_CAUSAL_REPAIR'),false);
  assert.equal(result.queue.tasks.find(t=>t.id==='qa-fail').status,'failed');
  assert.equal(result.queue.tasks.find(t=>t.id==='protected-dev').status,'failed');
});

test('zero-byte queue is repaired to canonical direct v6 before handoff preflight',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'vibe2-steward-blank-'));
  const queueFile=path.join(dir,'queue.json');
  const controlFile=path.join(dir,'parallelism.json');
  fs.writeFileSync(queueFile,'','utf8');
  fs.writeFileSync(controlFile,JSON.stringify({version:4,currentMax:256}),'utf8');
  const result=runSystemStewardFiles({queueFile,controlFile,now:'2026-09-25T00:00:00Z'});
  assert.equal(result.recoveredBlankQueue,true);
  assert.equal(result.changedQueue,true);
  const repaired=JSON.parse(fs.readFileSync(queueFile,'utf8'));
  assert.equal(repaired.version,6);
  assert.equal(repaired.maxConcurrentTasks,null);
  assert.equal(repaired.execution.internalGlobalParallelCap,null);
  assert.equal(repaired.execution.externalMatrixTransportPartitionMax,256);
  assert.deepEqual(repaired.tasks,[]);
});

test('legacy v3 pressure state migrates to v4 advisory state',()=>{
  const result=runSystemStewardState({
    now:'2026-09-25T00:00:00Z',
    queueInput:directQueue(),
    controlInput:{version:3,currentMax:20,lastDecision:'HOLD'}
  });
  assert.equal(result.control.version,4);
  assert.equal(result.control.currentMax,256);
  assert.equal(result.control.lastReason,'SYSTEM_STEWARD_INVALID_V4_PRESSURE_ADVISORY_RESET_TO_256');
  assert.ok(result.actions.includes('RESET_INVALID_PARALLELISM_STATE'));
});

test('system steward stale lease recovery stays synchronized with central architecture and log maps',()=>{
  const policy=JSON.parse(fs.readFileSync(new URL('../company-learning/platform-release-roadmap.json',import.meta.url),'utf8'));
  const architecture=JSON.parse(fs.readFileSync(new URL('../company-learning/company-architecture-map.json',import.meta.url),'utf8'));
  const logMap=JSON.parse(fs.readFileSync(new URL('../company-learning/company-log-map.json',import.meta.url),'utf8'));
  const recovery=architecture?.autonomousBottleneckRecovery?.staleRunningReservationRecovery;
  const logRecovery=logMap?.orchestrationLogContract?.systemStewardRecovery;
  assert.equal(policy?.developmentLifecycleMachine?.selfRecoveryAndBottleneckRelief?.automaticRecovery?.staleRunningReservation,'RELEASE_AND_REQUEUE_WITH_RECOVERY_EVIDENCE');
  assert.equal(recovery?.implementation,'tools/vibe2-system-steward.mjs::staleRunningIds');
  assert.equal(recovery?.staleAfterMinutes,45);
  assert.equal(recovery?.actionMarker,'RECOVER_STALE_RUNNING_RESERVATION');
  assert.equal(logRecovery?.staleRunningReservationAction,'RECOVER_STALE_RUNNING_RESERVATION');
  assert.ok(logRecovery?.emittedMarkers?.includes('VIBE2_SYSTEM_STEWARD_ACTIONS'));
  assert.ok(logRecovery?.emittedMarkers?.includes('VIBE2_SYSTEM_STEWARD_QUEUE_CHANGED'));
});

test('steward preserves exact candidate runtime evidence wait after an expired worker lease',()=>{
  const candidate={taskId:'probe',gameId:'demo',target:'roblox',candidateBranch:'vibe2/candidate/probe',candidateSha:'a'.repeat(40),evidenceOnly:true};
  const result=runSystemStewardState({
    now:'2026-09-30T00:00:00Z',
    queueInput:directQueue([{
      id:'probe',gameId:'demo',target:'roblox',department:'development',type:'implementation',
      status:'running',blocker:'candidate-awaiting-runtime-evidence',reservedAt:'2026-01-01T00:00:00Z',runtimeEvidenceCandidate:candidate
    }]),
    controlInput:{version:4,currentMax:256}
  });
  assert.equal(result.queue.tasks[0].status,'running');
  assert.deepEqual(result.queue.tasks[0].runtimeEvidenceCandidate,candidate);
  assert.ok(!result.queue.tasks[0].evidence.includes('system-steward:stale-running-reservation-recovered'));
});
