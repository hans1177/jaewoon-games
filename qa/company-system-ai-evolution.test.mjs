// 파일명: qa/company-system-ai-evolution.test.mjs
// 임포트: 기존 System AI 검증 계약
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

import {classifySystemAiFailure} from '../tools/company-system-ai-failure-classifier.mjs';
import {analyzeSystemAiBottlenecks} from '../tools/company-system-ai-bottleneck-sensor.mjs';
import {reviewSystemAiQaContract} from '../tools/company-system-ai-qa-contract-review.mjs';
import {reserveSystemAiBatch,reserveSystemAiTargets,applySystemAiResults,handoffMissingSystemAiResults,coalesceQueuedSystemAiDuplicateRepairs} from '../tools/company-system-ai-queue.mjs';
import {buildSystemAiLearningContext} from '../tools/company-system-ai-learning-context.mjs';

const policy={version:270,policySource:'company-learning/platform-release-roadmap.json',authority:'MACHINE_EXECUTION_CONTRACT'};
const securityPolicy={kind:'company-security-immune-system',sourceOfTruth:'company-learning/platform-release-roadmap.json'};
const systemAiWorkflow=fs.readFileSync(new URL('../.github/workflows/company-system-ai-workers.yml',import.meta.url),'utf8');

test('System AI reserve pressure metrics heredoc closes at shell block base indentation',()=>{
  const start=systemAiWorkflow.indexOf('workflow_pressure_metrics="$(CURRENT_SHA="$GITHUB_SHA" node <<\'NODE\'');
  const end=systemAiWorkflow.indexOf('read -r runner_queued_runs',start);
  assert.ok(start>=0&&end>start);
  const block=systemAiWorkflow.slice(start,end);
  assert.match(block,/\n          NODE\n              \)"\n/);
  assert.doesNotMatch(block,/\n              NODE\n              \)"\n/);
});

test('System AI reserve workflow shell parses as Bash',()=>{
  const step='      - name: Reserve disjoint supervised assignments\n';
  const stepAt=systemAiWorkflow.indexOf(step);
  const runAt=systemAiWorkflow.indexOf('        run: |\n',stepAt);
  const nextStep=systemAiWorkflow.indexOf('\n      - name:',runAt+1);
  assert.ok(stepAt>=0&&runAt>stepAt&&nextStep>runAt);
  const raw=systemAiWorkflow.slice(runAt+'        run: |\n'.length,nextStep);
  const script=raw.split('\n').map(line=>line.startsWith('          ')?line.slice(10):line).join('\n')+'\n';
  const parsed=spawnSync('bash',['-n'],{input:script,encoding:'utf8'});
  assert.equal(parsed.status,0,parsed.stderr||parsed.stdout);
});

test('failure classifier separates infrastructure, QA drift, security, and implementation routes',()=>{
  const infra=classifySystemAiFailure({task:{id:'a'},result:{outcome:'FAIL',failureClass:'INFRASTRUCTURE_CONTRACT_FAILURE'}});
  assert.equal(infra.failureClass,'RUNNER_OR_INFRASTRUCTURE_FAILURE');
  assert.equal(infra.retryBudgetConsumed,false);
  assert.equal(infra.learningPenalty,false);
  assert.equal(infra.workerHandoffRecommended,true);

  const credential=classifySystemAiFailure({
    task:{id:'a2',failureStage:'TARGET_PLATFORM_RUNTIME_FOUNDATION',failureSignature:'ROBLOX_OPEN_CLOUD_LUAU_EXECUTION_PERMISSION_DENIED',evidence:['required-scope:universe.place.luau-execution-session:10767445769:write','http-status:403']},
    result:{outcome:'FAIL'}
  });
  assert.equal(credential.failureClass,'EXTERNAL_SERVICE_OR_CREDENTIAL_FAILURE');
  assert.equal(credential.route,'REQUEUE_WITHOUT_TASK_PENALTY_OR_WAIT_FOR_EXTERNAL_EVENT');
  assert.equal(credential.retryBudgetConsumed,false);
  assert.equal(credential.learningPenalty,false);
  assert.equal(credential.workerHandoffRecommended,false);

  const unverifiedQa=classifySystemAiFailure({task:{id:'b',failureClass:'STALE_QA_CONTRACT'},result:{outcome:'FAIL'}});
  assert.equal(unverifiedQa.failureClass,'UNKNOWN_REQUIRES_CAUSAL_DIAGNOSIS');
  assert.equal(unverifiedQa.qaContractDriftVerified,false);
  assert.ok(unverifiedQa.evidence.includes('qa-contract-drift:UNVERIFIED'));

  const qa=classifySystemAiFailure({
    task:{id:'b2',failureClass:'STALE_QA_CONTRACT',evidence:['qa-contract-drift:VERIFIED','current-policy-implementation-agreement:PASS']},
    result:{outcome:'FAIL'}
  });
  assert.equal(qa.failureClass,'STALE_QA_CONTRACT');
  assert.equal(qa.route,'QA_CONTRACT_REVIEW_AND_INDEPENDENT_REVALIDATION');
  assert.equal(qa.qaContractDriftVerified,true);

  const nestedQa=classifySystemAiFailure({
    task:{id:'b3'},
    result:{outcome:'FAIL',failureClass:'STALE_QA_CONTRACT',qaContractReview:{allowed:true,verifiedContractDrift:true,reason:'VERIFIED_QA_CONTRACT_DRIFT_REPAIR_WITHOUT_COVERAGE_REDUCTION'}}
  });
  assert.equal(nestedQa.failureClass,'STALE_QA_CONTRACT');

  const security=classifySystemAiFailure({task:{id:'c'},result:{outcome:'FAIL',security:{verdict:'QUARANTINE'}}});
  assert.equal(security.failureClass,'SECURITY_OR_AUTHORITY_BOUNDARY');
  assert.equal(security.securityReviewRequired,true);

  const implementation=classifySystemAiFailure({task:{id:'d',failureStage:'SOURCE_CANDIDATE_GENERATION'},result:{outcome:'FAIL',blocker:'system-ai-implementation-failed'}});
  assert.equal(implementation.failureClass,'IMPLEMENTATION_DEFECT');
});

test('infrastructure failure requeues without consuming retry budget and requests exact worker handoff',()=>{
  const queue={tasks:[{
    id:'infra',status:'running',priority:'high',goal:'repair',responsibleFiles:['tools/a.mjs'],
    retries:2,retryPolicy:'UNLIMITED_CAUSAL_REPAIR',reservationId:'run:1',reservedAt:'2026-09-23T00:00:00Z',evidence:[]
  }]};
  const next=applySystemAiResults(queue,[{taskId:'infra',outcome:'FAIL',failureClass:'RUNNER_OR_INFRASTRUCTURE_FAILURE',blocker:'runner-lost',evidence:[]}]);
  const row=next.tasks[0];
  assert.equal(row.status,'queued');
  assert.equal(row.retries,2);
  assert.equal(row.failureClass,'RUNNER_OR_INFRASTRUCTURE_FAILURE');
  assert.equal(row.previousReservationId,'run:1');
  assert.ok(row.evidence.includes('retry-budget-consumed:NO'));
  assert.ok(row.evidence.includes('learning-penalty:NO'));
  assert.ok(row.evidence.includes('system-ai-handoff-state:REQUEUE_NEW_WORKER'));
});

test('missing worker result is handed off immediately from only the exact reservation',()=>{
  const queue={tasks:[
    {id:'lost',status:'running',goal:'x',responsibleFiles:['tools/lost.mjs'],reservationId:'run:1',reservedAt:'2026-09-23T00:00:00Z',retries:3,evidence:[]},
    {id:'finished',status:'running',goal:'x',responsibleFiles:['tools/finished.mjs'],reservationId:'run:1',reservedAt:'2026-09-23T00:00:00Z',retries:1,evidence:[]},
    {id:'other',status:'running',goal:'x',responsibleFiles:['tools/other.mjs'],reservationId:'run:2',reservedAt:'2026-09-23T00:00:00Z',retries:1,evidence:[]}
  ]};
  const result=handoffMissingSystemAiResults(queue,{reservationId:'run:1',resultTaskIds:['finished'],at:Date.parse('2026-09-23T00:05:00Z')});
  assert.equal(result.handedOff,1);
  const lost=result.queue.tasks.find(x=>x.id==='lost');
  assert.equal(lost.status,'queued');
  assert.equal(lost.retries,3);
  assert.equal(lost.previousReservationId,'run:1');
  assert.equal(lost.handoffCount,1);
  assert.ok(lost.evidence.includes('system-ai-exact-checkpoint-resume:YES'));
  assert.equal(result.queue.tasks.find(x=>x.id==='finished').status,'running');
  assert.equal(result.queue.tasks.find(x=>x.id==='other').reservationId,'run:2');
});

test('exact duplicate bottleneck repairs coalesce before reservation without losing distinct work',()=>{
  const queue={tasks:[
    {
      id:'repair-a',status:'queued',priority:'critical',taskType:'bottleneck-repair',gameId:'demo',
      goal:'repair the same verified bottleneck',responsibleFiles:['web-games/demo/index.html'],
      sourceMutationRequired:true,createdAt:'2026-09-23T00:00:00Z',evidence:['recovery-queue:r1']
    },
    {
      id:'repair-b',status:'queued',priority:'critical',taskType:'bottleneck-repair',gameId:'demo',
      goal:'repair the same verified bottleneck',responsibleFiles:['web-games/demo/index.html'],
      sourceMutationRequired:true,createdAt:'2026-09-23T00:01:00Z',
      failureSignature:'shared-signature-canary-pending:repair-a',evidence:['recovery-queue:r2']
    },
    {
      id:'repair-c',status:'queued',priority:'high',taskType:'bottleneck-repair',gameId:'demo',
      goal:'repair the same verified bottleneck',responsibleFiles:['web-games/demo/index.html'],
      sourceMutationRequired:true,createdAt:'2026-09-23T00:02:00Z',evidence:['recovery-queue:r3']
    },
    {
      id:'checkpoint-newer',status:'queued',priority:'high',taskType:'bottleneck-repair',gameId:'demo',
      goal:'repair the same verified bottleneck',responsibleFiles:['web-games/demo/index.html'],
      sourceMutationRequired:true,sourceMutationBaseline:'newer-baseline',createdAt:'2026-09-23T00:03:00Z'
    },
    {
      id:'distinct',status:'queued',priority:'high',taskType:'bottleneck-repair',gameId:'demo',
      goal:'repair a different verified bottleneck',responsibleFiles:['tools/distinct.mjs'],
      sourceMutationRequired:true,createdAt:'2026-09-23T00:04:00Z'
    },
    {
      id:'dependent',status:'queued',priority:'normal',taskType:'ordinary',gameId:'demo',
      goal:'wait for canonical repair',responsibleFiles:['web-games/demo/index.html'],
      dependencies:['repair-b','repair-c'],blocker:'shared-signature-canary-pending:repair-c',
      createdAt:'2026-09-23T00:05:00Z'
    }
  ]};
  const compacted=coalesceQueuedSystemAiDuplicateRepairs(queue,{at:Date.parse('2026-09-23T00:10:00Z')});
  assert.equal(compacted.coalesced,2);
  assert.equal(compacted.groups,1);
  const canonical=compacted.queue.tasks.find(x=>x.id==='repair-a');
  assert.equal(canonical.status,'queued');
  assert.equal(canonical.recurrenceCount,2);
  assert.ok(canonical.evidence.includes('system-ai-coalesced-count:3'));
  for(const id of ['repair-b','repair-c']){
    const row=compacted.queue.tasks.find(x=>x.id===id);
    assert.equal(row.status,'cancelled');
    assert.equal(row.blocker,'system-ai-duplicate-repair-superseded');
    assert.ok(row.evidence.includes('system-ai-duplicate-repair-superseded-by:repair-a'));
    assert.ok(row.evidence.includes('retry-budget-consumed:NO'));
    assert.ok(row.evidence.includes('learning-penalty:NO'));
  }
  assert.equal(compacted.queue.tasks.find(x=>x.id==='checkpoint-newer').status,'queued');
  assert.equal(compacted.queue.tasks.find(x=>x.id==='distinct').status,'queued');
  const dependent=compacted.queue.tasks.find(x=>x.id==='dependent');
  assert.deepEqual(dependent.dependencies,['repair-a']);
  assert.equal(dependent.blocker,'shared-signature-canary-pending:repair-a');
  assert.ok(dependent.evidence.includes('system-ai-duplicate-dependency-rewired:YES'));

  const reserved=reserveSystemAiBatch(queue,{max:4,reservationId:'run:dedupe',at:Date.parse('2026-09-23T00:10:00Z')});
  assert.equal(reserved.coalesced,2);
  assert.deepEqual(new Set(reserved.reserved.map(x=>x.id)),new Set(['repair-a','distinct']));
  assert.equal(reserved.queue.tasks.find(x=>x.id==='checkpoint-newer').status,'queued');
});

test('verified completed exact repair is reused only for the same source baseline and failure stage',()=>{
  const common={
    priority:'critical',taskType:'bottleneck-repair',gameId:'demo',
    goal:'repair the exact runtime binding failure',responsibleFiles:['tools/demo-runtime.mjs'],
    sourceMutationRequired:true,sourceMutationBaseline:'source-a',
    failureStage:'TARGET_PLATFORM_RUNTIME',failureSignature:'COMMON_RUNTIME_BINDING_FAILURE',
    acceptanceCriteria:['restore runtime binding'],verificationCommands:['node --test qa/demo-runtime.test.mjs']
  };
  const queue={tasks:[
    {...common,id:'completed-repair',status:'done',lastOutcome:'PRIMARY_AI_ACCEPTED',
      evidence:['primary-ai-review:PASS','source-mutation-sha:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa','changed-file:tools/demo-runtime.mjs'],
      createdAt:'2026-10-06T00:00:00Z',updatedAt:'2026-10-06T00:10:00Z'},
    {...common,id:'duplicate-same-baseline',status:'queued',createdAt:'2026-10-06T00:20:00Z'},
    {...common,id:'new-baseline',status:'queued',sourceMutationBaseline:'source-b',createdAt:'2026-10-06T00:21:00Z'},
    {...common,id:'different-stage',status:'queued',failureStage:'INDEPENDENT_QA',createdAt:'2026-10-06T00:22:00Z'},
    {id:'dependent',status:'queued',priority:'normal',taskType:'ordinary',gameId:'demo',
      goal:'continue after exact repair',responsibleFiles:['tools/demo-runtime.mjs'],
      dependencies:['duplicate-same-baseline'],blocker:'shared-signature-canary-pending:duplicate-same-baseline',
      createdAt:'2026-10-06T00:23:00Z'}
  ]};
  const compacted=coalesceQueuedSystemAiDuplicateRepairs(queue,{at:Date.parse('2026-10-06T00:30:00Z')});
  assert.equal(compacted.completedReused,1);
  assert.equal(compacted.coalesced,1);
  const duplicate=compacted.queue.tasks.find(x=>x.id==='duplicate-same-baseline');
  assert.equal(duplicate.status,'cancelled');
  assert.equal(duplicate.lastOutcome,'SUPERSEDED_VERIFIED_COMPLETED_REPAIR');
  assert.ok(duplicate.evidence.includes('system-ai-completed-exact-repair-reused:YES'));
  assert.ok(duplicate.evidence.includes('system-ai-duplicate-repair-superseded-by:completed-repair'));
  assert.equal(compacted.queue.tasks.find(x=>x.id==='new-baseline').status,'queued');
  assert.equal(compacted.queue.tasks.find(x=>x.id==='different-stage').status,'queued');
  const dependent=compacted.queue.tasks.find(x=>x.id==='dependent');
  assert.deepEqual(dependent.dependencies,['completed-repair']);
});

test('done repair without verified completion evidence does not suppress a new repair',()=>{
  const common={
    priority:'critical',taskType:'bottleneck-repair',gameId:'demo',
    goal:'repair exact blocker',responsibleFiles:['tools/demo-runtime.mjs'],
    sourceMutationRequired:true,sourceMutationBaseline:'source-a',
    failureStage:'TARGET_PLATFORM_RUNTIME',failureSignature:'COMMON_RUNTIME_BINDING_FAILURE'
  };
  const compacted=coalesceQueuedSystemAiDuplicateRepairs({tasks:[
    {...common,id:'unverified-done',status:'done',lastOutcome:'FAIL',createdAt:'2026-10-06T00:00:00Z'},
    {...common,id:'new-repair',status:'queued',createdAt:'2026-10-06T00:01:00Z'}
  ]});
  assert.equal(compacted.completedReused,0);
  assert.equal(compacted.queue.tasks.find(x=>x.id==='new-repair').status,'queued');
});

test('duplicate repair coalescing keeps different known-good revisions separate',()=>{
  const common={
    status:'queued',priority:'critical',taskType:'bottleneck-repair',gameId:'demo',
    goal:'repair the same verified bottleneck',responsibleFiles:['web-games/demo/index.html'],
    sourceMutationRequired:true,sourceMutationBaseline:'same-source',
    acceptanceCriteria:['restore verified behavior'],verificationCommands:['node --test qa/demo.test.mjs']
  };
  const queue={tasks:[
    {...common,id:'known-good-a',knownGoodRevision:'known-good-a',createdAt:'2026-09-23T00:00:00Z'},
    {...common,id:'known-good-b',knownGoodRevision:'known-good-b',createdAt:'2026-09-23T00:01:00Z'}
  ]};
  const compacted=coalesceQueuedSystemAiDuplicateRepairs(queue,{at:Date.parse('2026-09-23T00:10:00Z')});
  assert.equal(compacted.coalesced,0);
  assert.equal(compacted.groups,0);
  assert.deepEqual(compacted.queue.tasks.map(x=>x.status),['queued','queued']);
});

test('historical superseded repair dependency is rewired without new duplicate coalescing',()=>{
  const queue={tasks:[
    {
      id:'repair-a',status:'queued',priority:'critical',taskType:'bottleneck-repair',gameId:'demo',
      goal:'repair verified bottleneck',responsibleFiles:['web-games/demo/index.html'],
      sourceMutationRequired:true,createdAt:'2026-09-23T00:00:00Z'
    },
    {
      id:'repair-old',status:'cancelled',priority:'critical',taskType:'bottleneck-repair',gameId:'demo',
      goal:'repair verified bottleneck',responsibleFiles:['web-games/demo/index.html'],
      sourceMutationRequired:true,blocker:'system-ai-duplicate-repair-superseded',lastOutcome:'SUPERSEDED_DUPLICATE_WORK',
      evidence:['system-ai-duplicate-repair-superseded-by:repair-a'],createdAt:'2026-09-23T00:01:00Z'
    },
    {
      id:'dependent',status:'queued',priority:'normal',taskType:'ordinary',gameId:'demo',
      goal:'wait for repair',responsibleFiles:['web-games/demo/index.html'],
      dependencies:['repair-old'],blocker:'shared-signature-canary-pending:repair-old',createdAt:'2026-09-23T00:02:00Z'
    }
  ]};
  const result=coalesceQueuedSystemAiDuplicateRepairs(queue,{at:Date.parse('2026-09-23T00:10:00Z')});
  assert.equal(result.coalesced,0);
  assert.equal(result.rewired,1);
  const dependent=result.queue.tasks.find(x=>x.id==='dependent');
  assert.deepEqual(dependent.dependencies,['repair-a']);
  assert.equal(dependent.blocker,'shared-signature-canary-pending:repair-a');
  assert.ok(dependent.evidence.includes('system-ai-duplicate-dependency-rewired:YES'));
});

test('targeted reserve repairs historical superseded dependency before selecting target',()=>{
  const queue={tasks:[
    {id:'repair-a',status:'done',taskType:'bottleneck-repair',goal:'repair',responsibleFiles:['tools/repair.mjs'],createdAt:'2026-09-23T00:00:00Z'},
    {id:'repair-old',status:'cancelled',taskType:'bottleneck-repair',goal:'repair',responsibleFiles:['tools/repair.mjs'],blocker:'system-ai-duplicate-repair-superseded',lastOutcome:'SUPERSEDED_DUPLICATE_WORK',evidence:['system-ai-duplicate-repair-superseded-by:repair-a'],createdAt:'2026-09-23T00:01:00Z'},
    {id:'target',status:'queued',goal:'target',responsibleFiles:['tools/repair.mjs'],dependencies:['repair-old'],blocker:'shared-signature-canary-pending:repair-old',createdAt:'2026-09-23T00:02:00Z'}
  ]};
  const result=reserveSystemAiTargets(queue,{ids:['target'],reservationId:'targeted:1',at:Date.parse('2026-09-23T00:10:00Z')});
  assert.equal(result.rewired,1);
  assert.deepEqual(result.reserved.map(x=>x.id),['target']);
  const target=result.queue.tasks.find(x=>x.id==='target');
  assert.deepEqual(target.dependencies,['repair-a']);
  assert.equal(target.status,'running');
});

test('cross-scope canary dependency is removed while explicit shared infrastructure dependency is preserved',()=>{
  const queue={tasks:[
    {
      id:'local-repair',status:'queued',priority:'critical',taskType:'bottleneck-repair',
      goal:'repair local game source',responsibleFiles:['web-games/fantasy/index.html'],createdAt:'2026-09-23T00:00:00Z'
    },
    {
      id:'shared-repair',status:'queued',priority:'critical',taskType:'bottleneck-repair',
      goal:'repair shared worker infrastructure',responsibleFiles:['tools/company-system-ai-worker.mjs'],
      evidence:['shared-system-ai-infrastructure-repair:YES'],createdAt:'2026-09-23T00:00:00Z'
    },
    {
      id:'marketing',status:'queued',priority:'normal',taskType:'marketing',
      goal:'prepare marketing',responsibleFiles:['company-learning/marketing/demo/latest.json'],
      dependencies:['local-repair','shared-repair'],blocker:'shared-signature-canary-pending:local-repair',createdAt:'2026-09-23T00:01:00Z'
    }
  ]};
  const result=coalesceQueuedSystemAiDuplicateRepairs(queue,{at:Date.parse('2026-09-23T00:10:00Z')});
  assert.equal(result.scopeReconciled,1);
  const marketing=result.queue.tasks.find(x=>x.id==='marketing');
  assert.deepEqual(marketing.dependencies,['shared-repair']);
  assert.equal(marketing.blocker,null);
  assert.ok(marketing.evidence.includes('system-ai-cross-scope-canary-dependency-removed:YES'));
});

test('reserve chooses one representative canary for a shared failure signature while disjoint work stays parallel',()=>{
  const queue={tasks:[
    {id:'a',status:'queued',priority:'critical',goal:'a',responsibleFiles:['tools/a.mjs'],failureSignature:'COMMON_X',createdAt:'2026-09-23T00:00:00Z'},
    {id:'b',status:'queued',priority:'high',goal:'b',responsibleFiles:['tools/b.mjs'],failureSignature:'COMMON_X',createdAt:'2026-09-23T00:01:00Z'},
    {id:'c',status:'queued',priority:'high',goal:'c',responsibleFiles:['tools/c.mjs'],failureSignature:'UNIQUE_Y',createdAt:'2026-09-23T00:02:00Z'}
  ]};
  const result=reserveSystemAiBatch(queue,{max:3,reservationId:'run:canary',at:Date.parse('2026-09-23T00:10:00Z')});
  assert.deepEqual(new Set(result.reserved.map(x=>x.id)),new Set(['a','c']));
  assert.ok(result.reserved.find(x=>x.id==='a').evidence.includes('system-ai-representative-canary:COMMON_X'));
});

test('active representative canary suppresses another worker for the same shared failure',()=>{
  const queue={tasks:[
    {id:'active',status:'running',priority:'critical',goal:'active',responsibleFiles:['tools/active.mjs'],failureSignature:'COMMON_ACTIVE',reservationId:'r1',reservedAt:'2026-09-23T00:05:00Z',createdAt:'2026-09-23T00:00:00Z'},
    {id:'duplicate',status:'queued',priority:'critical',goal:'duplicate',responsibleFiles:['tools/duplicate.mjs'],failureSignature:'COMMON_ACTIVE',createdAt:'2026-09-23T00:01:00Z'},
    {id:'independent',status:'queued',priority:'high',goal:'independent',responsibleFiles:['tools/independent.mjs'],failureSignature:'OTHER',createdAt:'2026-09-23T00:02:00Z'}
  ]};
  const result=reserveSystemAiBatch(queue,{max:2,reservationId:'r2',at:Date.parse('2026-09-23T00:10:00Z')});
  assert.deepEqual(result.reserved.map(x=>x.id),['independent']);
  const snapshot=analyzeSystemAiBottlenecks({systemAiQueue:queue,maxBatch:3,at:Date.parse('2026-09-23T00:10:00Z')});
  const cohort=snapshot.commonFailureCohorts.find(x=>x.signature==='COMMON_ACTIVE');
  assert.equal(cohort.runningRepresentativeExists,true);
  assert.equal(cohort.representativeTaskId,null);
});

test('bottleneck sensor reports free capacity, common failures, stale reservations, and caretaker backlog',()=>{
  const snapshot=analyzeSystemAiBottlenecks({
    systemAiQueue:{tasks:[
      {id:'run',status:'running',responsibleFiles:['tools/run.mjs'],reservationId:'r',reservedAt:'2026-09-22T23:00:00Z'},
      {id:'a',status:'queued',priority:'critical',responsibleFiles:['tools/a.mjs'],failureSignature:'COMMON'},
      {id:'b',status:'queued',priority:'high',responsibleFiles:['tools/b.mjs'],failureSignature:'COMMON'},
      {id:'c',status:'queued',priority:'normal',responsibleFiles:['tools/c.mjs'],failureSignature:'OTHER'}
    ]},
    gameQueue:{tasks:[
      {id:'g1',gameId:'demo',status:'queued',postReleaseFocused:true},
      {id:'g2',gameId:'demo',status:'running',postReleaseFocused:true}
    ]},
    maxBatch:4,
    leaseMinutes:30,
    at:Date.parse('2026-09-23T00:00:00Z')
  });
  assert.equal(snapshot.queueDepth.queued,3);
  assert.equal(snapshot.staleReservations.length,1);
  assert.equal(snapshot.commonFailureCohorts.length,1);
  assert.equal(snapshot.recommendedBatch,3);
  assert.deepEqual(snapshot.caretakerHotspots,[{gameId:'demo',count:2}]);
  assert.ok(snapshot.actions.includes('REPRESENTATIVE_CANARY_FOR_COMMON_FAILURE'));
});

test('bottleneck sensor separates scheduler pending, runnable starvation, and fan-in wait',()=>{
  const snapshot=analyzeSystemAiBottlenecks({
    systemAiQueue:{tasks:[
      {id:'ready',status:'queued',priority:'critical',responsibleFiles:['tools/ready.mjs'],createdAt:'2026-09-22T20:00:00Z'}
    ]},
    workflowMetrics:{pendingRuns:2,reservationWaitMs:120000,fanInWaitMs:180000,supervisorReviewWaitMs:240000},
    maxBatch:2,
    at:Date.parse('2026-09-23T00:00:00Z')
  });
  assert.ok(snapshot.actions.includes('REDUCE_SCHEDULER_PENDING_RUN_WAIT'));
  assert.ok(snapshot.actions.includes('PRIORITIZE_LONG_WAIT_RUNNABLE_WORK'));
  assert.ok(snapshot.actions.includes('REDUCE_FAN_IN_WAIT'));
  assert.ok(snapshot.actions.includes('PRIORITIZE_PRIMARY_AI_SUPERVISOR_REVIEW'));
  assert.equal(snapshot.workflow.supervisorReviewWaitMs,240000);
  assert.equal(snapshot.actions.includes('REDUCE_SCHEDULER_OR_FAN_IN_WAIT'),false);
});

test('jobless stale Action orphan is excluded from runner pressure without hiding stale ingress',()=>{
  const snapshot=analyzeSystemAiBottlenecks({
    systemAiQueue:{tasks:[
      {id:'ready-a',status:'queued',priority:'critical',responsibleFiles:['tools/a.mjs']},
      {id:'ready-b',status:'queued',priority:'high',responsibleFiles:['tools/b.mjs']}
    ]},
    workflowMetrics:{
      runnerQueuedRuns:4,
      runnerInProgressRuns:2,
      primaryGameQueuedRuns:1,
      joblessOrphanQueuedRuns:1,
      joblessOrphanPrimaryRuns:1,
      stalePrimaryRuns:1
    },
    maxBatch:4
  });
  assert.equal(snapshot.workflow.observedRunnerQueuedRuns,4);
  assert.equal(snapshot.workflow.runnerQueuedRuns,3);
  assert.equal(snapshot.workflow.observedPrimaryGameQueuedRuns,1);
  assert.equal(snapshot.workflow.primaryGameQueuedRuns,0);
  assert.equal(snapshot.workflow.joblessOrphanQueuedRuns,1);
  assert.equal(snapshot.workflow.joblessOrphanPrimaryRuns,1);
  assert.equal(snapshot.workflow.stalePrimaryRuns,1);
  assert.equal(snapshot.workflow.runnerPressure,false);
  assert.equal(snapshot.recommendedBatch,2);
  assert.ok(snapshot.actions.includes('EXCLUDE_JOBLESS_ORPHAN_FROM_RUNNER_PRESSURE'));
  assert.ok(snapshot.actions.includes('CANCEL_STALE_PRIMARY_REVISION_INGRESS'));
});

test('QA evolution blocks coverage weakening and only allows independently verified stale-contract repair',()=>{
  const task={
    id:'qa-fix',taskType:'qa-contract-repair',failureClass:'STALE_QA_CONTRACT',
    contextFiles:['tools/current-implementation.mjs'],
    evidence:['qa-contract-drift:VERIFIED','current-policy-implementation-agreement:PASS']
  };
  const before={"qa/demo.test.mjs":"test('x',()=>{ assert.equal(value,true); });\n"};
  const weakened={"qa/demo.test.mjs":"test('x',()=>{});\n"};
  const blocked=reviewSystemAiQaContract({task,beforeByPath:before,afterByPath:weakened,policy,securityPolicy});
  assert.equal(blocked.allowed,false);
  assert.equal(blocked.reason,'QA_ASSERTION_OR_TEST_COVERAGE_WEAKENING_FORBIDDEN');

  const safeAfter={"qa/demo.test.mjs":"test('x',()=>{ assert.equal(currentPolicy,true); });\n"};
  const pass=reviewSystemAiQaContract({task,beforeByPath:before,afterByPath:safeAfter,policy,securityPolicy});
  assert.equal(pass.allowed,true);
  assert.equal(pass.verifiedContractDrift,true);
  assert.equal(pass.independentVerificationRequired,true);
});

test('system AI learning context exposes exact verified reuse trace and failed-strategy guard',()=>{
  const result=buildSystemAiLearningContext({
    task:{id:'learn',gameId:'demo',target:'roblox',failureSignature:'F1',evidence:['failed-strategy-fingerprint:'+'a'.repeat(64)]},
    experienceInput:{records:[]},codePatternsInput:{patterns:[]},masteryInput:{}
  });
  assert.equal(result.version,2);
  assert.equal(result.gameId,'demo');
  assert.equal(result.failureSignature,'F1');
  assert.equal(result.sameGameSameFailurePriority,true);
  assert.equal(result.crossGameTransformativeAdaptationRequired,true);
  assert.equal(result.rawCrossGameCopyForbidden,true);
  assert.equal(result.outcomeAttributionRequired,true);
  assert.deepEqual(result.failedStrategyFingerprints,['a'.repeat(64)]);
});

test('system AI workflow wires sensing, exact reservation identity, missing-result handoff, and serialized control mutation',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-system-ai-workers.yml','utf8');
  assert.match(workflow,/company-system-ai-bottleneck-sensor\.mjs/);
  assert.match(workflow,/SYSTEM_AI_PENDING_RUNS=/);
  assert.match(workflow,/SYSTEM_AI_RESERVATION_WAIT_MS=/);
  assert.match(workflow,/reservation_wait_ms=.*shared-signature-canary-pending:/);
  assert.match(workflow,/reservation_wait_ms=.*byId\.get/);
  assert.match(workflow,/SYSTEM_AI_FAN_IN_WAIT_MS=/);
  assert.match(workflow,/orphanBefore=now-\(24\*60\*60\*1000\)/);
  assert.match(workflow,/actions\/runs\/\$\{r\.id\}\/jobs\?per_page=1/);
  assert.match(workflow,/joblessOrphanIds/);
  assert.match(workflow,/SYSTEM_AI_JOBLESS_ORPHAN_QUEUED_RUNS_OBSERVED=/);
  assert.match(workflow,/--jobless-orphan-queued-runs="\$jobless_orphan_queued_runs"/);
  assert.match(workflow,/--jobless-orphan-primary-runs="\$jobless_orphan_primary_runs"/);
  assert.match(workflow,/--pending-runs="\$pending_runs"/);
  assert.match(workflow,/--reservation-wait-ms="\$reservation_wait_ms"/);
  assert.match(workflow,/--fan-in-wait-ms="\$fan_in_wait_ms"/);
  assert.match(workflow,/SYSTEM_AI_ADAPTIVE_RESERVE_MAX=/);
  assert.match(workflow,/for attempt in 1 2 3 4 5 6 7 8; do/);
  assert.match(workflow,/COMPANY_SYSTEM_AI_CONTROL_REFRESH_RETRY=/);
  assert.match(workflow,/EXPECTED_RESERVATION_ID: system-ai:\$\{\{ github\.run_id \}\}:\$\{\{ github\.run_attempt \}\}/);
  assert.match(workflow,/assignment reservation changed:/);
  assert.match(workflow,/--command=handoff-missing/);
  assert.match(workflow,/continue-on-error: true[\s\S]*pattern: company-system-ai-result-\*/);
  assert.match(workflow,/group: \$\{\{ github\.event_name == 'push' && 'company-system-ai-push-qa-reserve' \|\| 'company-system-ai-reserve-control' \}\}/);
  assert.match(workflow,/cancel-in-progress: \$\{\{ github\.event_name == 'push' \}\}/);
  assert.match(workflow,/group: company-system-ai-fanin-\$\{\{ github\.run_id \}\}-\$\{\{ github\.run_attempt \}\}/);
  assert.match(workflow,/COMPANY_SYSTEM_AI_FANIN_OPTIMISTIC_RETRY=/);
  assert.match(workflow,/for attempt in 1 2 3 4 5; do/);
  assert.match(workflow,/cancel-in-progress: false/);
});

test('system AI control-plane jobs stay off heavy game runners while model workers retain full runners',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-system-ai-workers.yml','utf8');
  assert.match(workflow,/\n  reserve:\n[\s\S]*?runs-on:\s*ubuntu-slim/);
  assert.match(workflow,/\n  worker:\n[\s\S]*?runs-on:\s*ubuntu-latest/);
  assert.match(workflow,/\n  fan_in:\n[\s\S]*?runs-on:\s*ubuntu-slim/);
});

/* ── 게임별 F0~F9 원인 추적 및 독립 파동 회귀 ── */
test('per-game F0 evidence is reused only for exact source and package; quality blocker cannot be bypassed',()=>{
  const source='a'.repeat(40),artifact='sha256:'+'b'.repeat(64);
  const base={
    productionClass:'DEVELOPMENT_CONFIRMED',status:'ACTIVE',
    robloxSourceCommit:source,robloxBuildSourceRevision:source,robloxBuildArtifactIdentity:artifact,
    robloxBuildOrPackagePassed:true,robloxBuildPreflightPassed:true,robloxFoundationF0Passed:true,
    robloxFoundationF0Evidence:{sourceRevision:source,artifactIdentity:artifact,artifactRunId:177},
    robloxFailureSignature:'ROBLOX_RUNTIME_CANDIDATE_DEPLOY_PENDING'
  };
  const snapshot=analyzeSystemAiBottlenecks({
    developmentQueue:{items:[
      {...base,gameId:'alpha',robloxQualityBuildUpRequired:true,robloxQualityBuildUpSourceRevision:source},
      {...base,gameId:'beta',robloxFoundationF0Evidence:{...base.robloxFoundationF0Evidence,artifactIdentity:'sha256:'+'c'.repeat(64)}},
      {...base,gameId:'gamma'}
    ]},
    maxBatch:2
  });
  assert.equal(snapshot.development.total,3);
  assert.equal(snapshot.development.exactF0Count,2);
  assert.equal(snapshot.development.f0RepairCount,1);
  assert.equal(snapshot.development.qualityBlockedCount,1);
  assert.equal(snapshot.development.pendingCandidateCount,1);
  assert.equal(snapshot.development.rows.find(x=>x.gameId==='alpha').classification,'QUALITY_GATE_BLOCKS_CANDIDATE_HANDOFF');
  assert.equal(snapshot.development.rows.find(x=>x.gameId==='beta').classification,'F0_NOT_VERIFIED_FOR_EXACT_PACKAGE');
  assert.equal(snapshot.development.rows.find(x=>x.gameId==='gamma').classification,'F0_PASSED_CANDIDATE_NOT_PUBLISHED');
  assert.ok(snapshot.development.rows.every(x=>x.automaticPassClaim===false));
  assert.ok(snapshot.actions.includes('REPAIR_SOURCE_QUALITY_BEFORE_RUNTIME_HANDOFF'));
  assert.ok(snapshot.actions.includes('RECOVER_VERIFIED_F0_PRIVATE_RUNTIME_HANDOFF'));
});

test('external Roblox runtime failure preserves same immutable candidate without claiming F9',()=>{
  const source='a'.repeat(40),artifact='sha256:'+'f'.repeat(64);
  const base={
    productionClass:'DEVELOPMENT_CONFIRMED',status:'ACTIVE',
    robloxSourceCommit:source,robloxBuildSourceRevision:source,robloxBuildArtifactIdentity:artifact,
    robloxBuildOrPackagePassed:true,robloxBuildPreflightPassed:true,
    robloxFoundationF0Passed:true,
    robloxFoundationF0Evidence:{sourceRevision:source,artifactIdentity:artifact,artifactRunId:193},
    robloxRuntimeCandidateEvidence:{published:true,sourceRevision:source,artifactIdentity:artifact,versionNumber:5,placeId:'place-193'},
    robloxFailureSignature:'ROBLOX_OPEN_CLOUD_ENGINE_PROBE_TRANSIENT_FAILURE',
    robloxFailureStage:'TARGET_PLATFORM_RUNTIME_FOUNDATION',
    unityF9ReleaseRegressionPassed:true,
    unityF0ThroughF9Evidence:{sourceRevision:source,artifactIdentity:artifact}
  };
  const snapshot=analyzeSystemAiBottlenecks({developmentQueue:{items:[
    {...base,gameId:'alpha'},
    {...base,gameId:'beta'},
    {...base,gameId:'gamma',robloxRuntimeCandidateEvidence:{...base.robloxRuntimeCandidateEvidence,sourceRevision:'0'.repeat(40)}}
  ]}});
  assert.equal(snapshot.development.exactCandidateCount,2);
  assert.equal(snapshot.development.unityF9ReportedCount,3);
  assert.equal(snapshot.development.unityF9IdentityBoundCount,3);
  assert.equal(snapshot.development.rows.find(x=>x.gameId==='alpha').classification,'EXTERNAL_RUNTIME_TRANSIENT');
  assert.equal(snapshot.development.rows.find(x=>x.gameId==='gamma').classification,'F0_PASSED_CANDIDATE_NOT_PUBLISHED');
  assert.equal(snapshot.development.commonFailureCohorts.length,1);
  assert.deepEqual(snapshot.development.commonFailureCohorts[0].gameIds,['alpha','beta']);
  assert.equal(snapshot.development.commonFailureCohorts[0].representativeGameId,'alpha');
  assert.ok(snapshot.development.rows.every(x=>x.unityF9IndependentRuntimeReviewRequired&&x.automaticPassClaim===false));
});

test('portfolio refill dispatches existing independent game workflows rather than awaiting all F0-F9 runtimes',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-development-confirmed-runtime.yml','utf8');
  assert.doesNotMatch(workflow,/uses:\s*\.\/\.github\/workflows\/(?:company-development-(?:roblox|unity)-runtime|unity-web-first-stage-build|unity-web-floor-source-bootstrap)\.yml/);
  for(const name of [
    'company-development-roblox-runtime.yml','company-development-unity-runtime.yml',
    'unity-web-first-stage-build.yml','unity-web-floor-source-bootstrap.yml'
  ])assert.ok(workflow.includes('gh workflow run '+name),'missing existing game handoff: '+name);
  assert.match(workflow,/continue-cycle:\n\s+name: Refill after dispatching independent game workflows/);
  assert.match(workflow,/DEVELOPMENT_PARENT_FAN_IN_WAITS_FOR_GAME_COMPLETION=NO/);
  assert.match(workflow,/fail-fast: false/);
  const sensor=fs.readFileSync('.github/workflows/company-system-ai-workers.yml','utf8');
  assert.match(sensor,/--development-queue=\/tmp\/system-ai-development-queue\.json/);
  assert.match(sensor,/SYSTEM_AI_DEVELOPMENT_QUEUE_SNAPSHOT=UNAVAILABLE/);
});
