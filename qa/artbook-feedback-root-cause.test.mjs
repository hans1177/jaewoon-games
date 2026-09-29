// 파일명: qa/artbook-feedback-root-cause.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { validateDemoFeedback } from '../tools/artbook-demo-concept-gate.mjs';

const ACTIVE_STATUSES=new Set(['SUBMITTED','REVIEW_REQUIRED','FIX_REQUIRED']);
function walk(root,out=[]){
  if(!fs.existsSync(root))return out;
  for(const entry of fs.readdirSync(root,{withFileTypes:true})){
    const p=path.join(root,entry.name);
    if(entry.isDirectory())walk(p,out);
    else if(entry.name==='artbook.json')out.push(p);
  }
  return out;
}

test('active artbook candidates may not hide system defects behind legacy DROP',()=>{
  const violations=[];
  for(const file of walk('artbook-submissions')){
    let artbook;
    try{artbook=JSON.parse(fs.readFileSync(file,'utf8'));}catch{continue;}
    if(!ACTIVE_STATUSES.has(String(artbook?.status||'').toUpperCase()))continue;
    const loop=artbook?.feedbackLoop;
    if(!loop||typeof loop!=='object')continue;
    if(Array.isArray(loop.DROP)&&loop.DROP.length){
      violations.push(`${file}: legacy feedbackLoop.DROP requires structured DECISION/ROOT_CAUSE_CLASS evidence`);
    }
    const structured=[];
    for(const key of ['FIX_REQUIRED','structuredFeedback','rootCauseFindings']){
      const value=loop[key];
      if(Array.isArray(value))structured.push(...value.filter(x=>x&&typeof x==='object'&&x.DECISION));
      else if(value&&typeof value==='object'&&value.DECISION)structured.push(value);
    }
    for(const row of structured){
      try{validateDemoFeedback(String(artbook.gameId||file),row);}catch(error){violations.push(`${file}: ${error.message}`);}
    }
  }
  assert.deepEqual(violations,[],violations.join('\n'));
});
