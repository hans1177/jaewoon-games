import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { runIncrementalQa, incrementalQaFailureSignature } from '../tools/vibe2-incremental-qa.mjs';

function repo(){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'vibe2-iqa-'));
  execFileSync('git',['init','-q'],{cwd:root});
  execFileSync('git',['config','user.email','qa@example.com'],{cwd:root});
  execFileSync('git',['config','user.name','qa'],{cwd:root});
  fs.writeFileSync(path.join(root,'a.js'),'export const x = 1;\n','utf8');
  fs.writeFileSync(path.join(root,'b.json'),'{"ok":true}\n','utf8');
  execFileSync('git',['add','.'],{cwd:root});
  execFileSync('git',['commit','-qm','base'],{cwd:root});
  return root;
}

test('incremental QA validates only changed scope and caches PASS by content hash',()=>{
  const root=repo();
  const cache=path.join(root,'.cache','qa.json');
  fs.writeFileSync(path.join(root,'a.js'),'export const x = 2;\n','utf8');
  const first=runIncrementalQa({root,files:['a.js'],cacheFile:cache,namespace:'web:demo'});
  assert.equal(first.outcome,'PASS');
  assert.equal(first.cached,false);
  const second=runIncrementalQa({root,files:['a.js'],cacheFile:cache,namespace:'web:demo'});
  assert.equal(second.outcome,'PASS');
  assert.equal(second.cached,true);
  assert.equal(second.contentHash,first.contentHash);
  assert.equal(second.fullRegressionStillRequired,true);
});

test('content change invalidates cache key',()=>{
  const root=repo();
  const cache=path.join(root,'.cache','qa.json');
  let one=runIncrementalQa({root,files:['a.js'],cacheFile:cache,namespace:'web:demo'});
  fs.writeFileSync(path.join(root,'a.js'),'export const x = 3;\n','utf8');
  let two=runIncrementalQa({root,files:['a.js'],cacheFile:cache,namespace:'web:demo'});
  assert.notEqual(two.contentHash,one.contentHash);
  assert.equal(two.cached,false);
});

test('manifest changed files resolve inside sourceRoot and causal replay stays plan-only without verified prepatch reproduction',()=>{
  const root=repo();
  const sourceRoot=path.join(root,'web-games/demo');
  fs.mkdirSync(sourceRoot,{recursive:true});
  fs.writeFileSync(path.join(sourceRoot,'index.js'),'export const placed = 1;\n','utf8');
  fs.mkdirSync(path.join(sourceRoot,'qa'),{recursive:true});
  fs.writeFileSync(path.join(sourceRoot,'qa/placement.test.mjs'),'throw new Error("must not run without verified prepatch reproduction");\n','utf8');
  const manifest=path.join(root,'manifest.json');
  fs.writeFileSync(manifest,JSON.stringify({
    sourceRoot:'web-games/demo',changedFiles:['index.js'],
    exploration:{editContract:{causalReplay:{version:1,required:true,prePatchReproduced:false,nodeTestTargets:['qa/placement.test.mjs'],executable:false,mode:'PLAN_ONLY',status:'NO_VERIFIED_PREPATCH_REPRODUCTION'}}}
  },null,2));
  const result=runIncrementalQa({root,manifest,namespace:'web:demo'});
  assert.deepEqual(result.changedFiles,['web-games/demo/index.js']);
  assert.equal(result.causalReplay.status,'PLAN_ONLY');
  assert.equal(result.causalReplay.executed,false);
  assert.equal(result.fullRegressionStillRequired,true);
});

test('causal replay executes supported node tests only after verified prepatch reproduction',()=>{
  const root=repo();
  const sourceRoot=path.join(root,'web-games/demo');
  fs.mkdirSync(path.join(sourceRoot,'qa'),{recursive:true});
  fs.writeFileSync(path.join(sourceRoot,'index.js'),'export const placed = 2;\n','utf8');
  fs.writeFileSync(path.join(sourceRoot,'qa/placement.test.mjs'),[
    "import test from 'node:test';",
    "import assert from 'node:assert/strict';",
    "test('same placement scenario clears after patch',()=>assert.equal(2,2));"
  ].join('\n')+'\n','utf8');
  const manifest=path.join(root,'manifest.json');
  fs.writeFileSync(manifest,JSON.stringify({
    sourceRoot:'web-games/demo',changedFiles:['index.js'],
    exploration:{editContract:{causalReplay:{version:1,required:true,prePatchReproduced:true,nodeTestTargets:['qa/placement.test.mjs'],executable:true,mode:'NODE_TEST_TARGETS',status:'READY_FOR_POSTPATCH_REPLAY',identicalOrEquivalentInputStateRequired:true}}}
  },null,2));
  const result=runIncrementalQa({root,manifest,namespace:'web:demo'});
  assert.equal(result.causalReplay.status,'EXECUTED_PASS');
  assert.equal(result.causalReplay.executed,true);
  assert.equal(result.causalReplay.targets[0].target,'web-games/demo/qa/placement.test.mjs');
  assert.equal(result.causalReplay.canonicalQaStillRequired,true);
});

test('declared executable causal replay fails closed when the replay target is missing',()=>{
  const root=repo();
  const sourceRoot=path.join(root,'web-games/demo');
  fs.mkdirSync(sourceRoot,{recursive:true});
  fs.writeFileSync(path.join(sourceRoot,'index.js'),'export const placed = 2;\n','utf8');
  const manifest=path.join(root,'manifest.json');
  fs.writeFileSync(manifest,JSON.stringify({
    sourceRoot:'web-games/demo',changedFiles:['index.js'],
    exploration:{editContract:{causalReplay:{version:1,required:true,prePatchReproduced:true,nodeTestTargets:['qa/missing.test.mjs'],executable:true,mode:'NODE_TEST_TARGETS'}}}
  },null,2));
  assert.throws(()=>runIncrementalQa({root,manifest,namespace:'web:demo'}),/CAUSAL_REPLAY_TARGET_MISSING/);
});
test('architecture drift observes large responsibility growth without hard rejecting the candidate',()=>{
  const root=repo();
  const sourceRoot=path.join(root,'web-games/drift-demo');
  fs.mkdirSync(sourceRoot,{recursive:true});
  const huge='score+=1;'.repeat(1100);
  fs.writeFileSync(path.join(sourceRoot,'index.html'),'<!doctype html><html><body><script>let score=0; function updateWorld(){ '+huge+' } requestAnimationFrame(updateWorld);</script></body></html>\n','utf8');
  const manifest=path.join(root,'manifest.json');
  fs.writeFileSync(manifest,JSON.stringify({
    sourceRoot:'web-games/drift-demo',changedFiles:['index.html'],
    exploration:{responsibleFiles:['index.html'],editContract:{architectureSnapshot:{
      version:1,nodeCount:1,edgeCount:0,maxFunctionBodyBytes:100,maxCallsPerFunction:0,maxCalledByPerFunction:0,maxStateWritesPerFunction:1,maxSystemsPerFunction:1,multiWriterStateCount:0,stateWriterLinkCount:1,multiOwnerStorageKeyCount:0,storageOwnerLinkCount:0,timerFunctionCount:0,eventBindingCount:0,largeFunctionCount:0,broadSystemFunctionCount:0
    },causalReplay:{required:false,executable:false,mode:'PLAN_ONLY'}}}
  },null,2));
  const result=runIncrementalQa({root,manifest,namespace:'web:drift-demo'});
  assert.equal(result.outcome,'PASS');
  assert.equal(result.architectureDrift.status,'ANALYZED');
  assert.ok(result.architectureDrift.signals.includes('GOD_FUNCTION_GROWTH'));
  assert.equal(result.architectureDrift.riskLevel,'MEDIUM');
  assert.equal(result.architectureDrift.focusedReviewRequired,true);
  assert.equal(result.architectureDrift.hardReject,false);
  assert.equal(result.fullRegressionStillRequired,true);
});

test('architecture drift remains low for a bounded responsibility-preserving patch and is cached with QA evidence',()=>{
  const root=repo();
  const sourceRoot=path.join(root,'web-games/stable-demo');
  fs.mkdirSync(sourceRoot,{recursive:true});
  fs.writeFileSync(path.join(sourceRoot,'index.html'),'<!doctype html><html><body><script>let score=0; function updateScore(){ score+=1; }</script></body></html>\n','utf8');
  const manifest=path.join(root,'manifest.json');
  const cache=path.join(root,'.cache','stable.json');
  fs.writeFileSync(manifest,JSON.stringify({
    sourceRoot:'web-games/stable-demo',changedFiles:['index.html'],
    exploration:{responsibleFiles:['index.html'],editContract:{architectureSnapshot:{
      version:1,nodeCount:1,edgeCount:0,maxFunctionBodyBytes:80,maxCallsPerFunction:0,maxCalledByPerFunction:0,maxStateWritesPerFunction:1,maxSystemsPerFunction:1,multiWriterStateCount:0,stateWriterLinkCount:1,multiOwnerStorageKeyCount:0,storageOwnerLinkCount:0,timerFunctionCount:0,eventBindingCount:0,largeFunctionCount:0,broadSystemFunctionCount:0
    },causalReplay:{required:false,executable:false,mode:'PLAN_ONLY'}}}
  },null,2));
  const first=runIncrementalQa({root,manifest,namespace:'web:stable-demo',cacheFile:cache});
  const second=runIncrementalQa({root,manifest,namespace:'web:stable-demo',cacheFile:cache});
  assert.equal(first.architectureDrift.riskLevel,'LOW');
  assert.equal(first.architectureDrift.hardReject,false);
  assert.equal(second.cached,true);
  assert.equal(second.architectureDrift.riskLevel,'LOW');
});
test('invalid JS fails fast before full regression',()=>{
  const root=repo();
  fs.writeFileSync(path.join(root,'a.js'),'export const = ;\n','utf8');
  assert.throws(()=>runIncrementalQa({root,files:['a.js'],namespace:'web:demo'}));
});

test('conflict markers fail fast',()=>{
  const root=repo();
  fs.writeFileSync(path.join(root,'a.js'),'<<<<<<< ours\nconst a=1;\n=======\nconst a=2;\n>>>>>>> theirs\n','utf8');
  assert.throws(()=>runIncrementalQa({root,files:['a.js'],namespace:'web:demo'}),/conflict marker/);
});


test('presentation living motion static QA requires continuous smooth motion signals',()=>{
  const root=repo();
  const sourceRoot=path.join(root,'web-games/presentation-motion');
  fs.mkdirSync(sourceRoot,{recursive:true});
  fs.writeFileSync(path.join(sourceRoot,'index.html'),[
    '<!doctype html><html><body><canvas id="game"></canvas><script>',
    'let speed=0,rotation=0,idle=0;',
    'function update(){ speed += (1-speed)*0.08; rotation += (0-rotation)*0.1; idle=Math.sin(performance.now()*0.002); requestAnimationFrame(update); }',
    'requestAnimationFrame(update);',
    '</script></body></html>'
  ].join('\n'),'utf8');
  const manifest=path.join(root,'manifest.json');
  fs.writeFileSync(manifest,JSON.stringify({
    sourceRoot:'web-games/presentation-motion',
    changedFiles:['index.html'],
    presentationQuality:{
      required:true,pass:'LIVING_MOTION',
      runtimeChecks:['idle-walk-run-or-equivalent-runtime-continuity'],
      authorityExpanded:false
    }
  },null,2));
  const result=runIncrementalQa({root,manifest,namespace:'web:presentation-motion'});
  assert.equal(result.presentationQa.status,'STATIC_PASS');
  assert.equal(result.presentationQa.pass,'LIVING_MOTION');
  assert.equal(result.presentationQa.runtimeStillRequired,true);
  assert.equal(result.presentationQa.gameplaySemanticsPreservationRequired,true);
});

test('presentation audio static QA fails closed when controls and unlock path are missing',()=>{
  const root=repo();
  const sourceRoot=path.join(root,'web-games/presentation-audio');
  fs.mkdirSync(sourceRoot,{recursive:true});
  fs.writeFileSync(path.join(sourceRoot,'index.html'),'<!doctype html><html><body><script>const music="silent";</script></body></html>\n','utf8');
  const manifest=path.join(root,'manifest.json');
  fs.writeFileSync(manifest,JSON.stringify({
    sourceRoot:'web-games/presentation-audio',
    changedFiles:['index.html'],
    presentationQuality:{required:true,pass:'AUDIO_FEEL',runtimeChecks:['audio-unlock-runtime'],authorityExpanded:false}
  },null,2));
  assert.throws(()=>runIncrementalQa({root,manifest,namespace:'web:presentation-audio'}),/PRESENTATION_STATIC_QA_FAILED:AUDIO_FEEL/);
});


test('incremental QA failure signatures are stable without claiming root cause',()=>{
  assert.equal(incrementalQaFailureSignature(new Error('SyntaxError in index.js: bad token')),'SYNTAX_ERROR');
  assert.equal(incrementalQaFailureSignature(new Error('merge conflict marker: index.html')),'MERGE_CONFLICT_MARKER');
  assert.equal(incrementalQaFailureSignature(new Error('changed file missing: index.html')),'CHANGED_FILE_MISSING');
  assert.match(incrementalQaFailureSignature(new Error('PRESENTATION_STATIC_QA_FAILED:LIVING_MOTION:IDLE_REQUIRED')),/^PRESENTATION_STATIC_QA_FAILED/);
});
