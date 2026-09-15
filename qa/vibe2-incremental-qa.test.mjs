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
