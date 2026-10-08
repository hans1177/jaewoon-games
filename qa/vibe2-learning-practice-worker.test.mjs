// 파일명: qa/vibe2-learning-practice-worker.test.mjs
// 검수: 고장 재현, 수정, 변형 실행 및 연습 결과 경계.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {buildPracticePrompt,candidateDiagnostics,evaluatePracticeAnswer,evaluateWebPracticeArtifact,runLearningPractice,runPracticeRepairSession} from '../tools/vibe2-learning-practice-worker.mjs';

test('practice accepts analysis or isolated Web artifact routes but rejects production source route',()=>{
  assert.throws(()=>buildPracticePrompt({executionRoute:'text-source-worker',goal:'[VIBE_LEARNING_PRACTICE] x'}),/analysis-only or learning-web-artifact/);
  assert.doesNotThrow(()=>buildPracticePrompt({executionRoute:'learning-web-artifact',goal:'[VIBE_LEARNING_PRACTICE] practiceMode=WEB_ARTIFACT'}));
  assert.throws(()=>buildPracticePrompt({executionRoute:'analysis-only',goal:'ordinary'}),/marker/);
});

test('practice result can pass structurally but never becomes production pass',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'vibe-practice-'));
  const order=path.join(dir,'order.json'),response=path.join(dir,'response.json'),out=path.join(dir,'out.json');
  fs.writeFileSync(order,JSON.stringify({taskId:'p1',executionRoute:'analysis-only',goal:'[VIBE_LEARNING_PRACTICE] repair repeated save failure'}));
  fs.writeFileSync(response,JSON.stringify({diagnosis:'Repeated save restore state is not reset deterministically.',strategy:'Trace the save owner and verify a bounded restore transaction.',tests:['reload restores state','double restore is idempotent','restart then restore works'],avoidPatterns:['duplicate restore mutation'],reusablePatterns:['single save owner']}));
  const result=await runLearningPractice({workOrderFile:order,responseFile:response,outputFile:out});
  assert.equal(result.evaluation,'PASS');
  assert.equal(result.practiceOnly,true);
  assert.equal(result.productionPass,false);
  assert.equal(result.sourceWrite,false);
  assert.equal(result.knowledgeState,'UNTRUSTED_PRACTICE_OUTPUT');
  assert.match(result.rawModelOutputSha256,/^[a-f0-9]{64}$/);
  assert.equal(result.rawModelOutputStored,false);
  assert.equal(result.candidateLessonsVerified,false);
  assert.equal(result.retrievalEligible,false);
  assert.equal(result.masteryCreditEligible,false);
  assert.equal(result.canonicalTrainingEligible,false);
  assert.equal(result.independentVerificationRequired,true);
  assert.equal(result.distillationRequiredBeforeReuse,true);
});

test('weak practice answer fails evaluation',()=>{
  assert.equal(evaluatePracticeAnswer({diagnosis:'x',strategy:'y',tests:['a']}).pass,false);
});


test('Web practice creates a runnable isolated artifact and measures improvement without production promotion',{skip:!process.env.VIBE2_PLAYWRIGHT_MODULE},async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'vibe-web-practice-'));
  const order=path.join(dir,'order.json'),response=path.join(dir,'response.json'),out=path.join(dir,'out.json'),artifactDir=path.join(dir,'artifact');
  const html='<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{max-width:720px;margin:auto;padding:16px}button{font-size:20px}@media(max-width:600px){body{padding:8px}}</style></head><body><h1>Practice</h1><p id="score" aria-live="polite">Score 0</p><button id="hit">Hit</button><script>let score=0;const out=document.getElementById("score");document.getElementById("hit").addEventListener("click",()=>{score+=1;out.textContent="Score "+score;document.body.classList.toggle("active");});</script></body></html>'+('<!-- practice -->'.repeat(20));
  fs.writeFileSync(order,JSON.stringify({taskId:'web-g2',executionRoute:'learning-web-artifact',goal:'[VIBE_LEARNING_PRACTICE]\npracticeMode=WEB_ARTIFACT\npracticeGeneration=2\npreviousArtifactScore=70\ndomains=WEB_RUNTIME,CORE_LOOP'}));
  fs.writeFileSync(response,JSON.stringify({diagnosis:'The prior Web artifact needs stronger interactive state feedback.',strategy:'Build a self-contained mobile interaction with visible state mutation and deterministic feedback.',tests:['button mutates state','visible score changes','mobile viewport remains usable'],avoidPatterns:['external network dependency'],reusablePatterns:['local state with direct feedback'],artifactHtml:html}));
  const staticEval=await evaluateWebPracticeArtifact(html,70);
  assert.equal(staticEval.pass,true);
  assert.equal(staticEval.improved,true);
  assert.ok(staticEval.score>70);
  const result=await runLearningPractice({workOrderFile:order,responseFile:response,outputFile:out,artifactDir});
  assert.equal(result.evaluation,'PASS');
  assert.equal(result.practiceMode,'WEB_ARTIFACT');
  assert.equal(result.productionPass,false);
  assert.equal(result.repositorySourceWrite,false);
  assert.equal(result.artifactWrite,true);
  assert.equal(result.artifact.improved,true);
  assert.ok(result.artifact.score>70);
  assert.match(result.artifact.sha256,/^[a-f0-9]{64}$/);
  assert.equal(result.nextPracticeSignal,'ESCALATE_DIFFICULTY');
  assert.equal(fs.existsSync(path.join(artifactDir,'index.html')),true);
});


test('Web practice generation with a previous score fails unless the artifact strictly improves',async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'vibe2-practice-no-improve-'));
  const order=path.join(root,'order.json');
  const response=path.join(root,'response.json');
  const output=path.join(root,'result.json');
  const artifactDir=path.join(root,'artifact');
  const html='<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{max-width:720px;margin:auto;padding:16px}button{font-size:20px}@media(max-width:600px){body{padding:8px}}</style></head><body><h1>Practice</h1><p id="score" aria-live="polite">Score 0</p><button id="hit">Hit</button><script>let score=0;const out=document.getElementById("score");document.getElementById("hit").addEventListener("click",()=>{score+=1;out.textContent="Score "+score;document.body.classList.toggle("active");});</script></body></html>'+('<!-- practice -->'.repeat(20));
  const baseline=(await evaluateWebPracticeArtifact(html,null)).score;
  fs.writeFileSync(order,JSON.stringify({taskId:'web-no-improve',executionRoute:'learning-web-artifact',goal:`[VIBE_LEARNING_PRACTICE]\npracticeMode=WEB_ARTIFACT\npracticeGeneration=2\npreviousArtifactScore=${baseline}\ndomains=WEB_RUNTIME,CORE_LOOP`}));
  fs.writeFileSync(response,JSON.stringify({diagnosis:'The previous artifact already satisfies the same static checks.',strategy:'Return the same quality artifact so strict improvement must reject it.',tests:['button mutates state','visible score changes','mobile viewport remains usable'],avoidPatterns:['external network dependency'],reusablePatterns:['local state with direct feedback'],artifactHtml:html}));
  await assert.rejects(()=>runLearningPractice({workOrderFile:order,outputFile:output,artifactDir,responseFile:response}),/web practice artifact evaluation failed/);
  const result=JSON.parse(fs.readFileSync(output,'utf8'));
  assert.equal(result.artifact.previousScore,baseline);
  assert.equal(result.artifact.score,baseline);
  assert.equal(result.artifact.improved,false);
  assert.equal(result.evaluation,'FAIL');
  assert.equal(result.nextPracticeSignal,'RETRY_CAUSAL_VARIATION');
});

// 실제 Luau 실행은 독립 논리 검증이며 Studio 실행 증거와 구분한다.
const robloxCurriculum=JSON.parse(fs.readFileSync(new URL('../company-learning/roblox-practice.json',import.meta.url),'utf8'));
const practiceAnswer={diagnosis:'기존 책임 함수의 실패 경로와 상태 변경 순서를 재현했다.',strategy:'기존 함수 안에서 원인을 수정하고 변형 입력으로 검증한다.',tests:['기존 오류 재현','변형 입력 확인','기존 상태 보존'],avoidPatterns:['검증되지 않은 성공 주장']};
test('Roblox code prompt withholds reference answers and hidden checks',()=>{
  const drill=robloxCurriculum.drills[1];
  const prompt=buildPracticePrompt({executionRoute:'analysis-only',goal:'[VIBE_LEARNING_PRACTICE] code repair'},{drill});
  assert.ok(prompt.includes(drill.scenario));
  assert.ok(prompt.includes(JSON.stringify(drill.broken).slice(1,-1)));
  assert.ok(!prompt.includes(drill.reference));
  assert.ok(!prompt.includes(drill.tests[1]));
});
test('Roblox code practice cannot pass on prose or a missing executor',()=>{
  const drill=robloxCurriculum.drills[0];
  assert.equal(evaluatePracticeAnswer(practiceAnswer,{drill}).pass,false);
  const result=evaluatePracticeAnswer({...practiceAnswer,code:drill.reference},{drill,luauBinary:'/missing/luau'});
  assert.equal(result.pass,false);
  assert.equal(result.codeVerification.reason,'LUAU_EXECUTOR_UNAVAILABLE');
});
for(const drill of robloxCurriculum.drills){
  test('Luau regression and variants: '+drill.id,{skip:!process.env.VIBE2_LUAU_BINARY},()=>{
    const fixed=evaluatePracticeAnswer({...practiceAnswer,code:drill.reference},{drill});
    assert.equal(fixed.pass,true);
    assert.equal(fixed.codeVerification.baselineRejected,true);
    assert.equal(fixed.codeVerification.referencePassed,true);
    assert.equal(fixed.codeVerification.passedTests,drill.tests.length);
    assert.equal(fixed.codeVerification.nativeRuntimeVerified,false);
    assert.equal(fixed.codeVerification.productionPromotionAllowed,false);
    const broken=evaluatePracticeAnswer({...practiceAnswer,code:drill.broken},{drill});
    assert.equal(broken.pass,false);
  });
}
test('executed Roblox drill remains untrusted practice and writes no production source',{skip:!process.env.VIBE2_LUAU_BINARY},async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'vibe-roblox-practice-'));
  try{
    const drill=robloxCurriculum.drills[3];
    fs.writeFileSync(path.join(dir,'order.json'),JSON.stringify({taskId:'roblox-save',target:'roblox',selectedTask:{robloxPracticeDrill:drill.id},executionRoute:'analysis-only',goal:'[VIBE_LEARNING_PRACTICE] save repair'}));
    fs.writeFileSync(path.join(dir,'response.json'),JSON.stringify({...practiceAnswer,code:drill.reference}));
    const result=await runLearningPractice({workOrderFile:path.join(dir,'order.json'),responseFile:path.join(dir,'response.json'),outputFile:path.join(dir,'result.json')});
    assert.equal(result.practiceMode,'ROBLOX_CODE');
    assert.equal(result.codeVerification.pass,true);
    assert.equal(result.nativeRuntimeVerified,false);
    assert.equal(result.productionPass,false);
    assert.equal(result.masteryCreditEligible,false);
    assert.equal(result.canonicalTrainingEligible,false);
    assert.equal(result.sourceWrite,false);
    assert.equal(result.rawModelOutputStored,false);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});


test('Web runtime is required even when static markup scores perfectly',async()=>{
  const drill=robloxCurriculum.platformDrills.find(row=>row.platform==='web');
  const result=await evaluateWebPracticeArtifact(drill.reference,null,{browserModule:'/missing/playwright.mjs'});
  assert.equal(result.pass,false);
  assert.equal(result.runtime.executed,false);
  assert.equal(result.runtime.reason,'BROWSER_EXECUTOR_UNAVAILABLE');
});

test('platform fault cards hide references and executable variants from model',()=>{
  for(const drill of robloxCurriculum.platformDrills){
    const prompt=buildPracticePrompt({executionRoute:drill.platform==='web'?'learning-web-artifact':'analysis-only',goal:'[VIBE_LEARNING_PRACTICE] repair'},{drill});
    assert(prompt.includes(drill.scenario));
    assert(!prompt.includes(JSON.stringify(drill.reference).slice(1,-1)));
    for(const body of drill.tests||[])assert(!prompt.includes(body));
    const replay=buildPracticePrompt({executionRoute:drill.platform==='web'?'learning-web-artifact':'analysis-only',goal:'[VIBE_LEARNING_PRACTICE] previousArtifactScore=100'},{drill});
    assert.match(replay,/fresh hidden input and lifecycle variants/);
    assert(!replay.includes('Improve the artifact beyond this score'));
  }
});

test('Web fault card executes tap rotation restore and hidden seeded variants',{skip:!process.env.VIBE2_PLAYWRIGHT_MODULE},async()=>{
  const drill=robloxCurriculum.platformDrills.find(row=>row.platform==='web');
  const fixed=await evaluateWebPracticeArtifact(drill.reference,null,{drill});
  assert.equal(fixed.pass,true,JSON.stringify(fixed.runtime));
  assert.equal(fixed.runtime.baselineRejected,true);
  assert.equal(fixed.runtime.referencePassed,true);
  assert.equal(fixed.runtime.variants.length,2);
  for(const html of [drill.broken,drill.reference.replace('count+=1','count+=2'),drill.reference.replace("count+=1;",'return;')]){
    const bad=await evaluateWebPracticeArtifact(html,null,{drill});
    assert.equal(bad.pass,false);
    assert.equal(bad.runtime.executed,true);
  }
});

test('Unity fault card runs independent C# lifecycle state in an isolated container',{skip:!process.env.VIBE2_TEST_CSHARP_RUNTIME},()=>{
  const drill=robloxCurriculum.platformDrills.find(row=>row.platform==='unity');
  const fixed=evaluatePracticeAnswer({...practiceAnswer,code:drill.reference},{drill});
  assert.equal(fixed.pass,true,JSON.stringify(fixed.codeVerification));
  assert.equal(fixed.codeVerification.scope,'STANDALONE_CSHARP_LOGIC_ONLY');
  assert.equal(fixed.codeVerification.nativeRuntimeVerified,false);
  assert.equal(evaluatePracticeAnswer({...practiceAnswer,code:drill.broken},{drill}).pass,false);
});

test('Unity prose and unsafe API source cannot pass a code drill',()=>{
  const drill=robloxCurriculum.platformDrills.find(row=>row.platform==='unity');
  assert.equal(evaluatePracticeAnswer(practiceAnswer,{drill}).pass,false);
  assert.equal(evaluatePracticeAnswer({...practiceAnswer,code:'System.Environment.Exit(0);'},{drill}).pass,false);
});

test('repair uses public execution feedback without leaking hidden checks or reference answers',async()=>{
  const drill={id:'opaque',platform:'unity',scenario:'Implement the requested state transition.',broken:'BROKEN',reference:'PRIVATE_REFERENCE',feedbackTests:['PUBLIC_EXAMPLE'],tests:['PRIVATE_ACCEPTANCE']};
  const prompts=[],formats=[],turns=[];
  const request=async (prompt,options)=>{prompts.push(prompt);formats.push(options.format);turns.push(options.messages);return JSON.stringify({...practiceAnswer,code:prompts.length===1?'WRONG':'FIXED'});};
  const evaluate=(answer)=>({pass:answer.code==='FIXED',codeVerification:{pass:answer.code==='FIXED',baselineRejected:true,referencePassed:true,reason:answer.code==='FIXED'?'VERIFIED_LOGIC_ONLY':'REGRESSION_OR_FIXTURE_FAILED'}});
  const result=await runPracticeRepairSession({order:{executionRoute:'analysis-only',goal:'[VIBE_LEARNING_PRACTICE]'},drill,request,evaluate});
  assert.equal(result.repairEvidence.firstAttemptPass,false);
  assert.equal(result.repairEvidence.finalPass,true);
  assert.equal(result.repairEvidence.recovered,true);
  assert.equal(result.repairEvidence.execution,'INJECTED_TEST_PROVIDER');
  assert.equal(prompts.length,2);
  assert(formats.every(format=>format.required.includes('code')&&format.properties.tests.minItems===3&&format.additionalProperties===false));
  assert.match(prompts[0],/Sandbox contract: no using directives/);
  for(const prompt of prompts){assert(!prompt.includes('PRIVATE_REFERENCE'));assert(!prompt.includes('PRIVATE_ACCEPTANCE'));}
  assert(prompts[1].includes('WRONG'));
  assert.equal(turns[0],null);
  assert.deepEqual(turns[1].map(row=>row.role),['user','assistant','user']);
  assert.equal(JSON.parse(turns[1][1].content).code,'WRONG');
  assert.match(turns[1][2].content,/PUBLIC EXECUTION DIAGNOSTICS/);
  assert(!turns[1][0].content.includes('BROKEN'));
  assert(!JSON.stringify(turns).includes('PRIVATE_ACCEPTANCE'));
  assert(!JSON.stringify(turns).includes('PRIVATE_REFERENCE'));
  assert(!JSON.stringify(result.repairEvidence).includes('FIXED'));
});

test('hidden-only failure never becomes a repair oracle and missing executors do not waste retries',async()=>{
  const drill={id:'opaque',platform:'unity',scenario:'state',broken:'broken',reference:'private',feedbackTests:['public'],tests:['hidden']};
  for(const infrastructure of [false,true]){
    let calls=0;
    const result=await runPracticeRepairSession({order:{executionRoute:'analysis-only',goal:'[VIBE_LEARNING_PRACTICE]'},drill,
      request:async()=>{calls++;return JSON.stringify({...practiceAnswer,code:'partial'});},
      evaluate:(_,options)=>({pass:!infrastructure&&options.drill.tests[0]==='public',codeVerification:{reason:infrastructure?'CSHARP_EXECUTOR_UNAVAILABLE':'REGRESSION_OR_FIXTURE_FAILED',baselineRejected:true,referencePassed:true}})});
    assert.equal(calls,1);assert.equal(result.repairEvidence.finalPass,false);
    assert.equal(result.repairEvidence.hiddenChecksUsedForRepair,false);
  }
});

test('repair budget is bounded and malformed responses remain failures',async()=>{
  let calls=0;
  const drill={platform:'unity',feedbackTests:['public'],tests:['private']};
  const result=await runPracticeRepairSession({order:{executionRoute:'analysis-only',goal:'[VIBE_LEARNING_PRACTICE]'},drill,maxAttempts:99,request:async()=>{calls++;return 'not JSON';},evaluate:()=>({pass:false})});
  assert.equal(calls,3);assert.equal(result.evaluation.pass,false);
});

// 공개 실패식과 같은 코드 반복을 구분하며 숨긴 평가 내용은 수정 입력에 넣지 않는다.
test('repeated failing implementation is measured and public repair instructions follow candidate data',async()=>{
  const prompts=[];
  const drill={platform:'unity',feedbackTests:['public'],tests:['hidden']};
  const result=await runPracticeRepairSession({order:{executionRoute:'analysis-only',goal:'[VIBE_LEARNING_PRACTICE]'},drill,
    request:async prompt=>{prompts.push(prompt);return JSON.stringify({...practiceAnswer,code:'same failing code'});},
    evaluate:(_,options)=>({pass:false,codeVerification:{reason:'REGRESSION_OR_FIXTURE_FAILED',baselineRejected:true,referencePassed:true,diagnostics:[options.drill.tests[0]==='public'?'PRACTICE_CASE_1_CHECK_2: s.Gold==4':'HIDDEN_SECRET']}})});
  assert.deepEqual(result.repairEvidence.attempts.map(row=>row.unchangedFailedImplementation),[false,true,true]);
  assert(prompts[2].includes('Repeating it is not a repair'));
  assert(prompts[1].indexOf('PRACTICE_CASE_1_CHECK_2')>prompts[1].indexOf('same failing code'));
  assert(!prompts.join('\n').includes('HIDDEN_SECRET'));
  assert.equal(result.repairEvidence.finalPass,false);
});

test('C# public failed assertion reports its expression without exposing hidden checks',{skip:!process.env.VIBE2_TEST_CSHARP_RUNTIME},()=>{
  const drill=robloxCurriculum.platformDrills.find(row=>row.id==='unity-menu-batch-transaction');
  const result=evaluatePracticeAnswer({...practiceAnswer,code:drill.broken},{drill:{...drill,tests:drill.feedbackTests}});
  assert.equal(result.pass,false);
  assert(result.codeVerification.diagnostics.some(line=>line.includes('s.Gold==4')&&line.includes('PRACTICE_CASE_1_CHECK_2')),JSON.stringify(result.codeVerification));
});

test('repair receives public execution and answer diagnostics but no hidden diagnostics',async()=>{
  const prompts=[];
  const drill={platform:'unity',supportCode:'public class Progress { public int Currency; }',feedbackTests:['public'],tests:['private']};
  const result=await runPracticeRepairSession({order:{executionRoute:'analysis-only',goal:'[VIBE_LEARNING_PRACTICE]'},drill,
    request:async prompt=>{prompts.push(prompt);return JSON.stringify({...practiceAnswer,code:prompts.length===1?'broken':'fixed'});},
    evaluate:(answer,{drill})=>({pass:answer.code==='fixed',answerErrors:answer.code==='fixed'?[]:['tests needs 3 strings'],codeVerification:{pass:answer.code==='fixed',baselineRejected:true,referencePassed:true,reason:'REGRESSION_OR_FIXTURE_FAILED',failedTests:[2],diagnostics:[drill.tests[0]==='public'?'Candidate.cs(1,4): error CS0101: duplicate type':'HIDDEN_DIAGNOSTIC_SECRET']}})});
  assert.equal(result.repairEvidence.finalPass,true);
  assert(prompts[0].includes(drill.supportCode));
  assert.match(prompts[0],/do not redeclare the harness types/);
  assert(prompts[1].includes('error CS0101'));
  assert(prompts[1].includes('tests needs 3 strings'));
  assert(!prompts.join('\n').includes('HIDDEN_DIAGNOSTIC_SECRET'));
  assert(!JSON.stringify(result.repairEvidence).includes('HIDDEN_DIAGNOSTIC_SECRET'));
});

test('actual Luau failures identify candidate location and failing public example',{skip:!process.env.VIBE2_LUAU_BINARY},()=>{
  const drill=robloxCurriculum.drills.find(row=>row.id==='save');
  const result=evaluatePracticeAnswer({...practiceAnswer,code:'return {save=function() error("broken transition") end}'},{drill:{...drill,tests:drill.feedbackTests}});
  assert.equal(result.pass,false);
  assert(result.codeVerification.failedTests.length>0);
  assert(result.codeVerification.diagnostics.some(line=>/(candidate|check)\.luau:\d+:/.test(line)));
  assert(!JSON.stringify(result.codeVerification.diagnostics).includes('/tmp/'));
});

test('candidate diagnostics retain compiler errors attributed to harness declarations without path or source dumps',()=>{
  const diagnostic=candidateDiagnostics({stdout:"Build header\n/tmp/Program.cs(1,14): error CS0101: The namespace already contains a definition for 'BatchState' [/tmp/Practice.csproj]\nFULL SOURCE MUST NOT BE COPIED"},'csharp');
  assert.equal(diagnostic.length,1);
  assert.match(diagnostic[0],/^Harness\.cs\(1,14\): error CS0101:/);
  assert(!diagnostic[0].includes('/tmp/'));
  assert(!diagnostic[0].includes('FULL SOURCE'));
});

test('C# compiler diagnostics expose duplicate harness type to public repair',{skip:!process.env.VIBE2_TEST_CSHARP_RUNTIME},()=>{
  const drill=robloxCurriculum.platformDrills.find(row=>row.id==='unity-menu-batch-transaction');
  const result=evaluatePracticeAnswer({...practiceAnswer,code:drill.supportCode+' '+drill.reference},{drill:{...drill,tests:drill.feedbackTests}});
  assert.equal(result.pass,false);
  assert(result.codeVerification.diagnostics.some(line=>/CS0101/.test(line)),JSON.stringify(result));
});

test('registered Unity coding drills prepare the existing executor and persist repair evidence',()=>{
  const workflow=fs.readFileSync('.github/workflows/vibe2-continuous-core.yml','utf8');
  assert.match(workflow,/platformDrills\?\.some\(d=>d\.id===id&&d\.platform==='unity'\)/);
  assert.doesNotMatch(workflow,/codingPracticeDrill==='unity-lifecycle'/);
  assert.match(workflow,/practiceArtifact,practiceRepair,neuralDiagnosis/);
});

for(const drill of robloxCurriculum.platformDrills.filter(row=>row.platform==='unity'&&row.id!=='unity-lifecycle')){
  test('executable coding contract, baseline, and held-out inputs: '+drill.id,{skip:!process.env.VIBE2_TEST_CSHARP_RUNTIME},()=>{
    for(const tests of [drill.feedbackTests,drill.tests]){
      const contract={...drill,tests};
      const fixed=evaluatePracticeAnswer({...practiceAnswer,code:drill.reference},{drill:contract});
      assert.equal(fixed.pass,true,JSON.stringify(fixed.codeVerification));
      assert.equal(evaluatePracticeAnswer({...practiceAnswer,code:drill.broken},{drill:contract}).pass,false);
    }
  });
}

test('live Vibe coding: first attempt versus public-feedback repair on held-out inputs',{skip:!process.env.VIBE2_LIVE_CODING_BENCHMARK,timeout:1500000},async()=>{
  assert(!process.env.VIBE2_MODEL_RESPONSE_FILE,'fixture replay cannot be a live benchmark');
  const cases=[];
  for(const id of ['save','unity-menu-batch-transaction','unity-reward-prerequisites']){
    const drill=[...robloxCurriculum.drills,...robloxCurriculum.platformDrills].find(row=>row.id===id);
    const result=await runPracticeRepairSession({order:{executionRoute:'analysis-only',goal:'[VIBE_LEARNING_PRACTICE] execute repair benchmark'},drill});
    cases.push({id,...result.repairEvidence});
  }
  const report={version:1,kind:'vibe2-executed-coding-repair-benchmark',model:process.env.VIBE2_LOCAL_MODEL||'qwen3:1.7b',sourceCommit:process.env.GITHUB_SHA||null,
    sampleCount:cases.length,firstAttemptPass:cases.filter(x=>x.firstAttemptPass).length,finalPass:cases.filter(x=>x.finalPass).length,
    recovered:cases.filter(x=>x.recovered).length,regressed:cases.filter(x=>x.regressed).length,modelCalls:cases.reduce((n,x)=>n+x.modelCalls,0),
    modelWeightsChanged:false,generalizationVerified:false,productionPromotionAllowed:false,cases};
  fs.writeFileSync(path.join(process.env.RUNNER_TEMP||os.tmpdir(),'vibe2-coding-repair-benchmark.json'),JSON.stringify(report,null,2)+'\n');
  console.log('VIBE2_LIVE_CODING_BENCHMARK='+JSON.stringify(report));
  assert(cases.every(row=>row.execution==='LOCAL_OLLAMA'));
  assert.equal(report.regressed,0,'a repair must not lose an already passing implementation');
  assert(report.finalPass>0,'no generated implementation passed; do not claim coding improvement');
});
