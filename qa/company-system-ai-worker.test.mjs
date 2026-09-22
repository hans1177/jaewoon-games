// 파일명: qa/company-system-ai-worker.test.mjs
// 역할: 외부 무료 시스템 AI가 지정 시스템 파일만 수정하고 감독 검수 전 완료되지 않는지 검증한다.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runSystemAiWorker } from '../tools/company-system-ai-worker.mjs';
import { normalizeSystemAiQueue,reserveSystemAiBatch,reclaimStaleSystemAiReservations,applySystemAiResults,requeueSystemAiTask,acceptSystemAiTask,systemAiImpactProfile } from '../tools/company-system-ai-queue.mjs';

function root(){return fs.mkdtempSync(path.join(os.tmpdir(),'company-system-ai-'));}
function write(file,text){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,text,'utf8');}

test('system AI edits only assigned system file and leaves completion for supervisor',async()=>{
  const cwd=root(),prev=process.cwd();process.chdir(cwd);
  try{
    write('tools/demo.mjs',"export const value=1;\n");
    write('task.json',JSON.stringify({id:'demo',status:'running',goal:'raise value',responsibleFiles:['tools/demo.mjs'],acceptanceCriteria:['value becomes 2']}));
    write('response.json',JSON.stringify({summary:'update value',edits:[{path:'tools/demo.mjs',find:'value=1',replace:'value=2'}],newFiles:[],recommendedTests:['node --check tools/demo.mjs'],risks:[]}));
    const result=await runSystemAiWorker({taskFile:'task.json',outputFile:'result.json',responseFile:'response.json'});
    assert.match(fs.readFileSync('tools/demo.mjs','utf8'),/value=2/);
    assert.equal(result.supervisorReviewRequired,true);
    assert.equal(result.workerSelfAcceptance,false);
    assert.equal(result.gameSourceWrite,false);
  }finally{process.chdir(prev);fs.rmSync(cwd,{recursive:true,force:true});}
});

test('system AI may edit explicitly assigned game source only as an isolated reviewed candidate',async()=>{
  const cwd=root(),prev=process.cwd();process.chdir(cwd);
  try{
    write('web-games/demo/index.html','x');
    write('task.json',JSON.stringify({id:'game-dev',status:'running',goal:'implement assigned gameplay change',responsibleFiles:['web-games/demo/index.html'],acceptanceCriteria:['assigned game source changes']}));
    write('response.json',JSON.stringify({summary:'update assigned game source',edits:[{path:'web-games/demo/index.html',find:'x',replace:'y'}],newFiles:[],recommendedTests:['game-specific QA'],risks:[]}));
    const result=await runSystemAiWorker({taskFile:'task.json',outputFile:'result.json',responseFile:'response.json'});
    assert.equal(fs.readFileSync('web-games/demo/index.html','utf8'),'y');
    assert.equal(result.gameSourceWrite,true);
    assert.equal(result.gameSourceWriteMode,'ISOLATED_ASSIGNED_CANDIDATE_ONLY');
    assert.equal(result.workerSelfAcceptance,false);
    assert.equal(result.supervisorReviewRequired,true);
    assert.equal(result.learningCandidate,true);
    assert.equal(result.learningRoute,'EXISTING_VIBE_LEARNING_MOTOR');
  }finally{process.chdir(prev);fs.rmSync(cwd,{recursive:true,force:true});}
});

test('system AI still refuses unassigned game source edits',async()=>{
  const cwd=root(),prev=process.cwd();process.chdir(cwd);
  try{
    write('web-games/demo/index.html','x');
    write('web-games/other/index.html','a');
    write('task.json',JSON.stringify({id:'scoped-game-dev',status:'running',goal:'only demo',responsibleFiles:['web-games/demo/index.html']}));
    write('response.json',JSON.stringify({summary:'bad scope expansion',edits:[{path:'web-games/other/index.html',find:'a',replace:'b'}],newFiles:[],recommendedTests:[],risks:[]}));
    await assert.rejects(runSystemAiWorker({taskFile:'task.json',responseFile:'response.json'}),/SYSTEM_AI_UNASSIGNED_FILE/);
  }finally{process.chdir(prev);fs.rmSync(cwd,{recursive:true,force:true});}
});

test('queue reserves disjoint tasks and sends passing work to supervisor review',()=>{
  const queue=normalizeSystemAiQueue({tasks:[
    {id:'a',goal:'a',priority:'critical',responsibleFiles:['tools/a.mjs']},
    {id:'b',goal:'b',priority:'high',responsibleFiles:['tools/a.mjs']},
    {id:'c',goal:'c',priority:'high',responsibleFiles:['tools/c.mjs']}
  ]});
  const reserved=reserveSystemAiBatch(queue,{max:8,reservationId:'r1'});
  assert.deepEqual(reserved.reserved.map(x=>x.id),['a','c']);
  const next=applySystemAiResults(reserved.queue,[
    {taskId:'a',outcome:'PASS',candidateBranch:'system-ai/candidate/a',pullRequestUrl:'https://example.invalid/a',evidence:['qa:pass']},
    {taskId:'c',outcome:'FAIL',blocker:'test-failed',evidence:['qa:fail']}
  ]);
  assert.equal(next.tasks.find(x=>x.id==='a').status,'awaiting-supervisor');
  assert.equal(next.tasks.find(x=>x.id==='c').status,'queued');
  const accepted=acceptSystemAiTask(next,{id:'a',evidence:['source:reviewed']});
  assert.equal(accepted.tasks.find(x=>x.id==='a').status,'done');
  const reworked=requeueSystemAiTask({...next,tasks:next.tasks.map(x=>x.id==='a'?{...x,status:'awaiting-supervisor'}:x)},{id:'a',reason:'missing-regression'});
  assert.equal(reworked.tasks.find(x=>x.id==='a').status,'queued');
});


test('deterministically satisfied current main closes stale task without candidate or supervisor acceptance',()=>{
  const queue=normalizeSystemAiQueue({tasks:[{id:'stale',status:'running',goal:'already implemented',responsibleFiles:['tools/a.mjs'],reservationId:'r1'}]});
  const next=applySystemAiResults(queue,[{
    taskId:'stale',outcome:'CURRENT_MAIN_SATISFIED',
    evidence:['implementation:failure','current-main-verification:success','no-candidate-required:current-main-already-satisfies-task']
  }]);
  const task=next.tasks[0];
  assert.equal(task.status,'done');
  assert.equal(task.lastOutcome,'DETERMINISTIC_CURRENT_MAIN_SATISFIED');
  assert.equal(task.blocker,null);
  assert.equal(task.candidateBranch,null);
  assert.equal(task.pullRequestUrl,null);
  assert(task.evidence.includes('deterministic-current-main-satisfied'));
  assert(task.evidence.includes('worker-self-acceptance:NO'));
});

test('system AI may read central policy as context but cannot write it',async()=>{
  const cwd=root(),prev=process.cwd();process.chdir(cwd);
  try{
    write('tools/demo.mjs',"export const value=1;\n");
    write('company-learning/platform-release-roadmap.json','{}\n');
    write('task.json',JSON.stringify({id:'read-policy',status:'running',goal:'read policy and update tool',responsibleFiles:['tools/demo.mjs'],contextFiles:['company-learning/platform-release-roadmap.json']}));
    write('response.json',JSON.stringify({summary:'update tool',edits:[{path:'tools/demo.mjs',find:'value=1',replace:'value=2'}],newFiles:[],recommendedTests:[],risks:[]}));
    const result=await runSystemAiWorker({taskFile:'task.json',outputFile:'result.json',responseFile:'response.json'});
    assert.equal(result.centralPolicyWrite,false);
    write('bad-task.json',JSON.stringify({id:'write-policy',status:'running',goal:'bad',responsibleFiles:['company-learning/platform-release-roadmap.json']}));
    await assert.rejects(runSystemAiWorker({taskFile:'bad-task.json',responseFile:'response.json'}),/SYSTEM_AI_POLICY_WRITE_FORBIDDEN/);
  }finally{process.chdir(prev);fs.rmSync(cwd,{recursive:true,force:true});}
});

test('system AI may read explicit root metadata but cannot write it',async()=>{
  const cwd=root(),prev=process.cwd();process.chdir(cwd);
  try{
    write('tools/demo.mjs',"export const value=1;\n");
    write('game-catalog.json','{}\n');
    write('task.json',JSON.stringify({id:'read-catalog',status:'running',goal:'read catalog and update tool',responsibleFiles:['tools/demo.mjs'],contextFiles:['game-catalog.json']}));
    write('response.json',JSON.stringify({summary:'update tool',edits:[{path:'tools/demo.mjs',find:'value=1',replace:'value=2'}],newFiles:[],recommendedTests:[],risks:[]}));
    const result=await runSystemAiWorker({taskFile:'task.json',outputFile:'result.json',responseFile:'response.json'});
    assert.equal(result.changedFiles[0],'tools/demo.mjs');
    write('bad-root-task.json',JSON.stringify({id:'write-catalog',status:'running',goal:'bad',responsibleFiles:['game-catalog.json']}));
    await assert.rejects(runSystemAiWorker({taskFile:'bad-root-task.json',responseFile:'response.json'}),/SYSTEM_AI_WRITE_PATH_OUTSIDE_ALLOWED_SCOPE/);
  }finally{process.chdir(prev);fs.rmSync(cwd,{recursive:true,force:true});}
});

test('system AI workflow persists sanitized security quarantine before PR supervision',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-system-ai-workers.yml','utf8');
  assert.match(workflow,/system-ai-security-quarantined/);
  assert.match(workflow,/company-security-incident\.mjs --command=record/);
  assert.match(workflow,/company-recovery-queue\.mjs --command=enqueue/);
  assert.match(workflow,/\.vibe2\/security-incidents\.json \.vibe2\/recovery-queue\.json/);
  assert.doesNotMatch(workflow,/while IFS=\s*$/m);
  assert.match(workflow,/while read -r task_id verdict highest report_file; do/);
});


test('system AI immutable result binds owner rule 2 and terminates quarantined external execution',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-system-ai-workers.yml','utf8');
  const security=JSON.parse(fs.readFileSync('company-learning/security-immune-system.json','utf8'));
  const architecture=JSON.parse(fs.readFileSync('company-learning/company-architecture-map.json','utf8'));
  assert.match(workflow,/RULE_2_EXTERNAL_AI_SECURITY_CAPTURE_AND_VERIFIED_ABSORPTION/);
  assert.match(workflow,/TERMINATED_QUARANTINED/);
  assert.match(workflow,/candidatePublicationAllowed:!infrastructureFailure&&security\.verdict==='PASS'/);
  assert.match(workflow,/learningCandidate:!infrastructureFailure/);
  assert.match(workflow,/verifiedDefensiveAbsorptionOnly:true/);
  assert.equal(security.ownerRule2?.automaticBindingForAllExternalAiWorkers,true);
  assert.equal(security.ownerRule2?.quarantineOnHostileOrUnauthorizedHighRiskChange,true);
  assert.equal(security.ownerRule2?.externalProviderAttackForbidden,true);
  assert.equal(architecture.ownerRule2Topology?.hostileDisposition,'QUARANTINE_TERMINATE_AFFECTED_EXECUTION_BLOCK_PUBLICATION');
  assert.equal(architecture.ownerRule2Topology?.authorityChange,'NONE');
});

test('System AI consumes only verified Vibe learning context and records exact knowledge ids',()=>{
  const learningContext=fs.readFileSync('tools/company-system-ai-learning-context.mjs','utf8');
  const worker=fs.readFileSync('tools/company-system-ai-worker.mjs','utf8');
  const workflow=fs.readFileSync('.github/workflows/company-system-ai-workers.yml','utf8');
  assert.match(learningContext,/retrieveUnifiedLearning/);
  assert.match(learningContext,/verifiedOnly:true/);
  assert.match(learningContext,/advisoryOnly:true/);
  assert.match(worker,/learningContextFile/);
  assert.match(worker,/VERIFIED VIBE LEARNING \(advisory only; fresh verification remains mandatory\)/);
  assert.match(worker,/learningKnowledgeIds/);
  assert.match(workflow,/company-system-ai-learning-context\.mjs/);
  assert.match(workflow,/--learning-context=\/tmp\/system-ai-learning-context\.json/);
  assert.match(workflow,/learning-knowledge-id:/);
});



test('stale System AI running reservations are reclaimed without retry or learning penalty',()=>{
  const at=Date.parse('2026-09-21T06:10:00.000Z');
  const queue=normalizeSystemAiQueue({tasks:[
    {id:'missing-reservation',status:'running',responsibleFiles:['tools/a.mjs'],reservedAt:'2026-09-21T06:09:00.000Z',retries:2,evidence:[]},
    {id:'expired-reservation',status:'running',responsibleFiles:['tools/b.mjs'],reservationId:'old',reservedAt:'2026-09-21T05:30:00.000Z',retries:1,evidence:[]},
    {id:'fresh-reservation',status:'running',responsibleFiles:['tools/c.mjs'],reservationId:'fresh',reservedAt:'2026-09-21T06:00:00.000Z',retries:0,evidence:[]}
  ]});
  const reclaimed=reclaimStaleSystemAiReservations(queue,{leaseMinutes:30,at});
  assert.equal(reclaimed.reclaimed,2);
  const missing=reclaimed.queue.tasks.find(x=>x.id==='missing-reservation');
  const expired=reclaimed.queue.tasks.find(x=>x.id==='expired-reservation');
  const fresh=reclaimed.queue.tasks.find(x=>x.id==='fresh-reservation');
  assert.equal(missing.status,'queued');
  assert.equal(expired.status,'queued');
  assert.equal(fresh.status,'running');
  assert.equal(missing.retries,2);
  assert.equal(expired.retries,1);
  assert.ok(missing.evidence.includes('retry-budget-consumed:NO'));
  assert.ok(expired.evidence.includes('learning-penalty:NO'));
});

test('batch reservation reclaims stale running tasks before selecting work',()=>{
  const at=Date.parse('2026-09-21T06:10:00.000Z');
  const result=reserveSystemAiBatch({tasks:[
    {id:'stale',status:'running',responsibleFiles:['tools/a.mjs'],reservedAt:'2026-09-21T05:30:00.000Z'},
    {id:'queued',status:'queued',priority:'critical',responsibleFiles:['tools/b.mjs']}
  ]},{max:8,reservationId:'new',leaseMinutes:30,at});
  assert.equal(result.reclaimed,1);
  assert.deepEqual(result.reserved.map(x=>x.id).sort(),['queued','stale']);
});


test('System AI binds exact failure stage signature retries and causal evidence into repair context',async()=>{
  const cwd=root(),prev=process.cwd();process.chdir(cwd);
  try{
    write('tools/demo.mjs',"export const value=1;\n");
    write('task.json',JSON.stringify({
      id:'causal-repair',status:'running',goal:'repair exact failure',responsibleFiles:['tools/demo.mjs'],
      acceptanceCriteria:['failure signature clears'],failureStage:'SOURCE_CANDIDATE_GENERATION',
      failureSignature:'EDIT_MATCH_TIMEOUT',retries:3,sourceMutationRequired:true,
      evidence:['failure-stage:SOURCE_CANDIDATE_GENERATION','failure-cause:EDIT_MATCH_TIMEOUT','prior-strategy:wide-context-retry']
    }));
    write('response.json',JSON.stringify({summary:'causal edit',edits:[{path:'tools/demo.mjs',find:'value=1',replace:'value=2'}],newFiles:[],recommendedTests:['node --check tools/demo.mjs'],risks:[]}));
    const result=await runSystemAiWorker({taskFile:'task.json',outputFile:'result.json',responseFile:'response.json'});
    assert.equal(result.version,3);
    assert.equal(result.failureStage,'SOURCE_CANDIDATE_GENERATION');
    assert.equal(result.failureSignature,'EDIT_MATCH_TIMEOUT');
    assert.equal(result.retryCount,3);
    assert.equal(result.sourceMutationRequired,true);
    assert.equal(result.causalContextBound,true);
    assert.ok(result.causalEvidenceCount>=3);
    const worker=fs.readFileSync(path.resolve(prev,'tools/company-system-ai-worker.mjs'),'utf8');
    assert.match(worker,/FAILURE STAGE:/);
    assert.match(worker,/FAILURE SIGNATURE:/);
    assert.match(worker,/Do not repeat a previously failed repair strategy without new causal evidence/);
  }finally{process.chdir(prev);fs.rmSync(cwd,{recursive:true,force:true});}
});


test('System AI blocks a repair strategy that already failed for the same failure signature',async()=>{
  const cwd=root(),prev=process.cwd();process.chdir(cwd);
  try{
    write('tools/demo.mjs',"export const value=1;\n");
    const baseTask={id:'first',status:'running',goal:'repair exact failure',responsibleFiles:['tools/demo.mjs'],failureSignature:'SAME_FAILURE',acceptanceCriteria:['value becomes 2']};
    write('task.json',JSON.stringify(baseTask));
    write('response.json',JSON.stringify({summary:'same strategy',edits:[{path:'tools/demo.mjs',find:'value=1',replace:'value=2'}],newFiles:[],recommendedTests:['node --check tools/demo.mjs'],risks:[]}));
    const first=await runSystemAiWorker({taskFile:'task.json',outputFile:'result.json',responseFile:'response.json'});
    assert.match(first.repairStrategyFingerprint,/^[a-f0-9]{64}$/);
    assert.equal(first.repeatedFailedStrategyBlocked,true);

    write('tools/demo.mjs',"export const value=1;\n");
    write('task.json',JSON.stringify({...baseTask,id:'retry',failedStrategyFingerprints:[first.repairStrategyFingerprint]}));
    await assert.rejects(
      runSystemAiWorker({taskFile:'task.json',outputFile:'result-2.json',responseFile:'response.json'}),
      /SYSTEM_AI_REPEATED_FAILED_STRATEGY/
    );
    assert.match(fs.readFileSync('tools/demo.mjs','utf8'),/value=1/);
  }finally{process.chdir(prev);fs.rmSync(cwd,{recursive:true,force:true});}
});


test('System AI reservation prioritizes the repair with the largest downstream bottleneck impact',()=>{
  const at=Date.parse('2026-09-23T00:00:00.000Z');
  const queue=normalizeSystemAiQueue({tasks:[
    {id:'static-critical',status:'queued',priority:'critical',responsibleFiles:['tools/a.mjs'],createdAt:'2026-09-22T23:50:00.000Z'},
    {id:'portfolio-bottleneck',status:'queued',priority:'normal',responsibleFiles:['tools/b.mjs'],failureSignature:'SHARED_SOURCE_FAILURE',blockedTaskIds:['g1','g2','g3','g4','g5','g6','g7','g8'],recurrenceCount:4,createdAt:'2026-09-22T22:00:00.000Z'}
  ]});
  const impact=systemAiImpactProfile(queue.tasks[1],queue,{at});
  assert.equal(impact.blockedTaskCount,8);
  assert.equal(impact.commonBottleneck,true);
  assert.ok(impact.score>systemAiImpactProfile(queue.tasks[0],queue,{at}).score);
  const reserved=reserveSystemAiBatch(queue,{max:1,reservationId:'impact',at});
  assert.deepEqual(reserved.reserved.map(x=>x.id),['portfolio-bottleneck']);
  assert.equal(reserved.reserved[0].impactScore,impact.score);
  assert.ok(reserved.reserved[0].evidence.some(x=>x.startsWith('system-ai-impact-score:')));
});

test('System AI detects a repeated failure-signature cohort as a common bottleneck',()=>{
  const at=Date.parse('2026-09-23T00:00:00.000Z');
  const queue=normalizeSystemAiQueue({tasks:[
    {id:'a',status:'queued',priority:'high',responsibleFiles:['tools/a.mjs'],failureSignature:'SAME_SHARED_FAILURE'},
    {id:'b',status:'queued',priority:'high',responsibleFiles:['tools/b.mjs'],failureSignature:'SAME_SHARED_FAILURE'},
    {id:'c',status:'queued',priority:'normal',responsibleFiles:['tools/c.mjs'],failureSignature:'OTHER'}
  ]});
  const impact=systemAiImpactProfile(queue.tasks[0],queue,{at});
  assert.equal(impact.commonBottleneck,true);
  assert.equal(impact.cohortSize,2);
  assert.ok(impact.blockedTaskIds.includes('b'));
});

test('System AI repair result carries multi-hypothesis falsification and known-good comparison metadata',async()=>{
  const cwd=root(),prev=process.cwd();process.chdir(cwd);
  try{
    write('tools/demo.mjs',"export const value=1;\n");
    write('task.json',JSON.stringify({
      id:'hypothesis-repair',status:'running',taskType:'bottleneck-repair',priority:'critical',
      goal:'repair source generation failure',responsibleFiles:['tools/demo.mjs'],
      acceptanceCriteria:['failure clears'],failureStage:'SOURCE_CANDIDATE_GENERATION',
      failureSignature:'EDIT_MATCH',knownGoodRevision:'known-good-sha',
      evidence:['failure-cause:EDIT_MATCH','hypothesis-rejected:pipeline-or-runner']
    }));
    write('response.json',JSON.stringify({
      summary:'repair selected surviving hypothesis',
      selectedHypothesisId:'source-generation-path',
      falsifiedHypothesisIds:['pipeline-or-runner'],
      knownGoodComparison:'Compared assigned source responsibility against known-good-sha before selecting the source-generation hypothesis.',
      edits:[{path:'tools/demo.mjs',find:'value=1',replace:'value=2'}],
      newFiles:[],recommendedTests:['node --check tools/demo.mjs'],risks:[]
    }));
    const result=await runSystemAiWorker({taskFile:'task.json',outputFile:'result.json',responseFile:'response.json'});
    assert.equal(result.hypothesisPlanBound,true);
    assert.equal(result.selectedHypothesisId,'source-generation-path');
    assert.ok(result.falsifiedHypothesisIds.includes('pipeline-or-runner'));
    assert.equal(result.knownGoodRevision,'known-good-sha');
    assert.match(result.knownGoodComparison,/known-good-sha/);
    assert.ok(result.hypothesisCandidates.length>=2);
    assert.equal(result.hypothesisCandidates.find(x=>x.id==='pipeline-or-runner')?.rejected,true);
  }finally{process.chdir(prev);fs.rmSync(cwd,{recursive:true,force:true});}
});

test('System AI refuses a hypothesis that prior evidence already rejected',async()=>{
  const cwd=root(),prev=process.cwd();process.chdir(cwd);
  try{
    write('tools/demo.mjs',"export const value=1;\n");
    write('task.json',JSON.stringify({
      id:'bad-hypothesis',status:'running',taskType:'bottleneck-repair',goal:'repair',responsibleFiles:['tools/demo.mjs'],
      failureSignature:'WORKFLOW_FAILURE',evidence:['failure-cause:WORKFLOW_FAILURE','hypothesis-rejected:pipeline-or-runner']
    }));
    write('response.json',JSON.stringify({
      summary:'bad choice',selectedHypothesisId:'pipeline-or-runner',
      edits:[{path:'tools/demo.mjs',find:'value=1',replace:'value=2'}],newFiles:[],recommendedTests:[],risks:[]
    }));
    await assert.rejects(runSystemAiWorker({taskFile:'task.json',responseFile:'response.json'}),/SYSTEM_AI_INVALID_OR_REJECTED_HYPOTHESIS/);
    assert.match(fs.readFileSync('tools/demo.mjs','utf8'),/value=1/);
  }finally{process.chdir(prev);fs.rmSync(cwd,{recursive:true,force:true});}
});
