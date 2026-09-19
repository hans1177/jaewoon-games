import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { runIncrementalQa } from '../tools/vibe2-incremental-qa.mjs';

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
