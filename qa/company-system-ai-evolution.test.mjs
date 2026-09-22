import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import {classifySystemAiFailure} from '../tools/company-system-ai-failure-classifier.mjs';
import {analyzeSystemAiBottlenecks} from '../tools/company-system-ai-bottleneck-sensor.mjs';
import {reviewSystemAiQaContract} from '../tools/company-system-ai-qa-contract-review.mjs';
import {reserveSystemAiBatch,applySystemAiResults,handoffMissingSystemAiResults} from '../tools/company-system-ai-queue.mjs';
import {buildSystemAiLearningContext} from '../tools/company-system-ai-learning-context.mjs';

const policy={version:270,policySource:'company-learning/platform-release-roadmap.json',authority:'MACHINE_EXECUTION_CONTRACT'};
const securityPolicy={kind:'company-security-immune-system',sourceOfTruth:'company-learning/platform-release-roadmap.json'};

test('failure classifier separates infrastructure, QA drift, security, and implementation routes',()=>{
  const infra=classifySystemAiFailure({task:{id:'a'},result:{outcome:'FAIL',failureClass:'INFRASTRUCTURE_CONTRACT_FAILURE'}});
  assert.equal(infra.failureClass,'RUNNER_OR_INFRASTRUCTURE_FAILURE');
  assert.equal(infra.retryBudgetConsumed,false);
  assert.equal(infra.learningPenalty,false);
  assert.equal(infra.workerHandoffRecommended,true);

  const qa=classifySystemAiFailure({task:{id:'b',failureClass:'STALE_QA_CONTRACT'},result:{outcome:'FAIL'}});
  assert.equal(qa.failureClass,'STALE_QA_CONTRACT');
  assert.equal(qa.route,'QA_CONTRACT_REVIEW_AND_INDEPENDENT_REVALIDATION');

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
  assert.match(workflow,/SYSTEM_AI_ADAPTIVE_RESERVE_MAX=/);
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
