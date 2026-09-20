// 파일명: qa/company-system-ai-worker.test.mjs
// 역할: 외부 무료 시스템 AI가 지정 시스템 파일만 수정하고 감독 검수 전 완료되지 않는지 검증한다.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runSystemAiWorker } from '../tools/company-system-ai-worker.mjs';
import { normalizeSystemAiQueue,reserveSystemAiBatch,applySystemAiResults,requeueSystemAiTask,acceptSystemAiTask } from '../tools/company-system-ai-queue.mjs';

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

test('system AI refuses game source writes',async()=>{
  const cwd=root(),prev=process.cwd();process.chdir(cwd);
  try{
    write('web-games/demo/index.html','x');
    write('task.json',JSON.stringify({id:'bad',status:'running',goal:'bad',responsibleFiles:['web-games/demo/index.html']}));
    write('response.json','{}');
    await assert.rejects(runSystemAiWorker({taskFile:'task.json',responseFile:'response.json'}),/SYSTEM_AI_GAME_SOURCE_FORBIDDEN/);
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

test('system AI workflow persists sanitized security quarantine before PR supervision',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-system-ai-workers.yml','utf8');
  assert.match(workflow,/system-ai-security-quarantined/);
  assert.match(workflow,/company-security-incident\.mjs --command=record/);
  assert.match(workflow,/company-recovery-queue\.mjs --command=enqueue/);
  assert.match(workflow,/\.vibe2\/security-incidents\.json \.vibe2\/recovery-queue\.json/);
  assert.doesNotMatch(workflow,/while IFS=\s*$/m);
  assert.match(workflow,/while read -r task_id verdict highest report_file; do/);
});
