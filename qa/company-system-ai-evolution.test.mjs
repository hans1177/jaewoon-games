import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import {classifySystemAiFailure} from '../tools/company-system-ai-failure-classifier.mjs';
import {analyzeSystemAiBottlenecks} from '../tools/company-system-ai-bottleneck-sensor.mjs';
import {reviewSystemAiQaContract} from '../tools/company-system-ai-qa-contract-review.mjs';
import {reserveSystemAiBatch,reserveSystemAiTargets,applySystemAiResults,handoffMissingSystemAiResults,coalesceQueuedSystemAiDuplicateRepairs} from '../tools/company-system-ai-queue.mjs';
import {buildSystemAiLearningContext} from '../tools/company-system-ai-learning-context.mjs';

const policy={version:270,policySource:'company-learning/platform-release-roadmap.json',authority:'MACHINE_EXECUTION_CONTRACT'};
const securityPolicy={kind:'company-security-immune-system',sourceOfTruth:'company-learning/platform-release-roadmap.json'};

test('failure classifier separates infrastructure, QA drift, security, and implementation routes',()=>{
  const infra=classifySystemAiFailure({task:{id:'a'},result:{outcome:'FAIL',failureClass:'INFRASTRUCTURE_CONTRACT_FAILURE'}});
  assert.equal(infra.failureClass,'RUNNER_OR_INFRASTRUCTURE_FAILURE');
  assert.equal(infra.retryBudgetConsumed,false);
  assert.equal(infra.learningPenalty,false);
  assert.equal(infra.workerHandoffRecommended,true);

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
      goal:'wait for canonical repair',responsibleFiles:['tools/dependent.mjs'],
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
      goal:'wait for repair',responsibleFiles:['tools/dependent.mjs'],
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
    {id:'target',status:'queued',goal:'target',responsibleFiles:['tools/target.mjs'],dependencies:['repair-old'],blocker:'shared-signature-canary-pending:repair-old',createdAt:'2026-09-23T00:02:00Z'}
  ]};
  const result=reserveSystemAiTargets(queue,{ids:['target'],reservationId:'targeted:1',at:Date.parse('2026-09-23T00:10:00Z')});
  assert.equal(result.rewired,1);
  assert.deepEqual(result.reserved.map(x=>x.id),['target']);
  const target=result.queue.tasks.find(x=>x.id==='target');
  assert.deepEqual(target.dependencies,['repair-a']);
  assert.equal(target.status,'running');
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
  assert.match(workflow,/group: company-system-ai-reserve-control/);
  assert.match(workflow,/group: company-system-ai-fanin-\$\{\{ github\.run_id \}\}-\$\{\{ github\.run_attempt \}\}/);
  assert.match(workflow,/COMPANY_SYSTEM_AI_FANIN_OPTIMISTIC_RETRY=/);
  assert.match(workflow,/for attempt in 1 2 3 4 5; do/);
  assert.match(workflow,/cancel-in-progress: false/);
});
