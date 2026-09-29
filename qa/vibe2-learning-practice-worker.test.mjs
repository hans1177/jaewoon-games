// 파일명: qa/vibe2-learning-practice-worker.test.mjs
// 검수: 고장 재현, 수정, 변형 실행 및 연습 결과 경계.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {buildPracticePrompt,evaluatePracticeAnswer,evaluateWebPracticeArtifact,runLearningPractice} from '../tools/vibe2-learning-practice-worker.mjs';

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
