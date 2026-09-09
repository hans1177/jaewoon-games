import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { diagnoseGame, microTaskFromIssue } from '../tools/autonomous-diagnostics.mjs';

function fixture(){const root=fs.mkdtempSync(path.join(os.tmpdir(),'vibe2-diagnostics-'));return root;}

test('mobile viewport, broken path, save parse and duplicate listener are detected',()=>{
  const root=fixture();
  try{
    fs.writeFileSync(path.join(root,'index.html'),'<html><head></head><body><img src="missing.png"><button>GO</button><script src="app.js"></script></body></html>');
    fs.writeFileSync(path.join(root,'app.js'),"const s=JSON.parse(localStorage.getItem('save-v1'));\nbtn.addEventListener('click',go);\nbtn.addEventListener('click',go);\n");
    const result=diagnoseGame(root);
    const types=new Set(result.issues.map(x=>x.type));
    assert.ok(types.has('MISSING_VIEWPORT'));
    assert.ok(types.has('BROKEN_LOCAL_PATH'));
    assert.ok(types.has('UNGUARDED_SAVE_PARSE'));
    assert.ok(types.has('ADJACENT_DUPLICATE_EVENT_LISTENER'));
    assert.equal(result.hasActionableIssue,true);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('safe diagnostic is converted into one-file micro task',()=>{
  const task=microTaskFromIssue({type:'MISSING_VIEWPORT',severity:'high',file:'index.html',microTask:'viewport 1개 추가',repairMode:'RULE_PATCH',autoPatch:{type:'INSERT_VIEWPORT',path:'index.html'}});
  assert.equal(task.repairMode,'RULE_PATCH');
  assert.equal(task.file,'index.html');
  assert.match(task.goal,/viewport/);
});
