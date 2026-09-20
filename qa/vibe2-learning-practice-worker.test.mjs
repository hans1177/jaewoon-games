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


test('Web practice creates a runnable isolated artifact and measures improvement without production promotion',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'vibe-web-practice-'));
  const order=path.join(dir,'order.json'),response=path.join(dir,'response.json'),out=path.join(dir,'out.json'),artifactDir=path.join(dir,'artifact');
  const html='<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{max-width:720px;margin:auto;padding:16px}button{font-size:20px}@media(max-width:600px){body{padding:8px}}</style></head><body><h1>Practice</h1><p id="score" aria-live="polite">Score 0</p><button id="hit">Hit</button><script>let score=0;const out=document.getElementById("score");document.getElementById("hit").addEventListener("click",()=>{score+=1;out.textContent="Score "+score;document.body.classList.toggle("active");});</script></body></html>'+('<!-- practice -->'.repeat(20));
  fs.writeFileSync(order,JSON.stringify({taskId:'web-g2',executionRoute:'learning-web-artifact',goal:'[VIBE_LEARNING_PRACTICE]\npracticeMode=WEB_ARTIFACT\npracticeGeneration=2\npreviousArtifactScore=70\ndomains=WEB_RUNTIME,CORE_LOOP'}));
  fs.writeFileSync(response,JSON.stringify({diagnosis:'The prior Web artifact needs stronger interactive state feedback.',strategy:'Build a self-contained mobile interaction with visible state mutation and deterministic feedback.',tests:['button mutates state','visible score changes','mobile viewport remains usable'],avoidPatterns:['external network dependency'],reusablePatterns:['local state with direct feedback'],artifactHtml:html}));
  const staticEval=evaluateWebPracticeArtifact(html,70);
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
  const baseline=evaluateWebPracticeArtifact(html,null).score;
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
