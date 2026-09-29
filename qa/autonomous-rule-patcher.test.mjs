import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildRuleCandidate } from '../tools/autonomous-rule-patcher.mjs';

function fixture(){return fs.mkdtempSync(path.join(os.tmpdir(),'vibe2-rule-patch-'));}

test('viewport rule emits one exact edit and refuses to duplicate existing meta',()=>{
  const root=fixture();
  try{
    fs.writeFileSync(path.join(root,'index.html'),'<html><head><title>x</title></head><body></body></html>');
    const candidate=buildRuleCandidate(root,{autoPatch:{type:'INSERT_VIEWPORT',path:'index.html'}});
    assert.equal(candidate.ruleId,'INSERT_VIEWPORT');
    assert.equal(candidate.edits.length,1);
    assert.match(candidate.edits[0].replace,/viewport-fit=cover/);
    fs.writeFileSync(path.join(root,'index.html'),'<html><head><meta name="viewport" content="width=device-width"></head></html>');
    assert.throws(()=>buildRuleCandidate(root,{autoPatch:{type:'INSERT_VIEWPORT',path:'index.html'}}),/이미 존재/);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('adjacent duplicate listener rule removes exactly one duplicate statement',()=>{
  const root=fixture();
  try{
    const line="btn.addEventListener('click', go);";
    fs.writeFileSync(path.join(root,'app.js'),`${line}\n${line}\nconsole.log('x');\n`);
    const candidate=buildRuleCandidate(root,{autoPatch:{type:'REMOVE_ADJACENT_DUPLICATE_EVENT_LISTENER',path:'app.js',previous:line,current:line}});
    assert.equal(candidate.ruleId,'REMOVE_ADJACENT_DUPLICATE_EVENT_LISTENER');
    assert.equal(candidate.edits[0].replace,line);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});
