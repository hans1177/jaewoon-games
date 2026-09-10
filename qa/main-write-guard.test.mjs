// 파일명: qa/main-write-guard.test.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { isWorkflowPath, listAllWorkflowFiles, scanTextForDirectMainWrite, scanWorkflowFiles } from '../tools/main-write-guard.mjs';

test('workflow path detector only accepts workflow yaml files',()=>{
  assert.equal(isWorkflowPath('.github/workflows/build.yml'),true);
  assert.equal(isWorkflowPath('.github/workflows/build.yaml'),true);
  assert.equal(isWorkflowPath('tools/build.yml'),false);
});

test('direct main pushes are blocked',()=>{
  const hits=scanTextForDirectMainWrite(`git push origin HEAD:main\ngit push origin main`);
  assert.equal(hits.length,2);
});

test('feature branch pushes remain allowed',()=>{
  const hits=scanTextForDirectMainWrite('git push origin HEAD:autonomous-dev');
  assert.equal(hits.length,0);
});

test('ordinary workflow references to main are not false positives',()=>{
  const hits=scanTextForDirectMainWrite('ref: main\nbranches: [main]\ngit fetch origin main');
  assert.equal(hits.length,0);
});

test('full workflow listing finds every yaml workflow in stable order',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'main-write-guard-'));
  const workflowRoot=path.join(root,'.github','workflows');
  fs.mkdirSync(workflowRoot,{recursive:true});
  fs.writeFileSync(path.join(workflowRoot,'b.yaml'),'name: b\n');
  fs.writeFileSync(path.join(workflowRoot,'a.yml'),'name: a\n');
  fs.writeFileSync(path.join(workflowRoot,'ignore.txt'),'nope\n');
  const cwd=process.cwd();
  process.chdir(root);
  try{
    assert.deepEqual(listAllWorkflowFiles(),['.github/workflows/a.yml','.github/workflows/b.yaml']);
  }finally{
    process.chdir(cwd);
    fs.rmSync(root,{recursive:true,force:true});
  }
});

test('workflow file scanner reports existing direct-main violations',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'main-write-guard-scan-'));
  const cwd=process.cwd();
  process.chdir(root);
  try{
    fs.mkdirSync('.github/workflows',{recursive:true});
    fs.writeFileSync('.github/workflows/bad.yml','steps:\n  - run: git push origin main\n');
    fs.writeFileSync('.github/workflows/good.yml','steps:\n  - run: git push origin HEAD:autonomous-dev\n');
    const hits=scanWorkflowFiles(listAllWorkflowFiles());
    assert.equal(hits.length,1);
    assert.equal(hits[0].file,'.github/workflows/bad.yml');
  }finally{
    process.chdir(cwd);
    fs.rmSync(root,{recursive:true,force:true});
  }
});
