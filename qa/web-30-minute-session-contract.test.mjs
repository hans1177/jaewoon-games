import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {buildContractSafePlayable,validateBootstrapHtml} from '../tools/company-development-web-bootstrap.mjs';
import {ensure30MinuteSessionContract} from '../tools/company-development-web-gameplay-validation.mjs';

const baseline={
  gameSeedId:'SEED-SINGLE_DEFENSE_STRATEGY-TEST',
  content:{
    identity:'Session Contract Test',
    coreFun:'위협을 읽고 배치와 강화 선택으로 방어선을 유지한다.',
    coreLoop:[
      '첫 위협과 조작을 익히고 기본 방어를 배치한다.',
      '보상으로 방어를 강화하고 다음 웨이브에 대응한다.',
      '변형된 적과 압박에 맞춰 배치와 성장 선택을 바꾼다.'
    ],
    mobileUx:'Touch-first presentation'
  }
};

test('generated Web companion contains one real 30-minute four-stage session contract',()=>{
  const result=buildContractSafePlayable({gameId:'session-contract-test',gameName:'Session Contract Test',baseline});
  assert.match(result.html,/data-session-minutes="30"/);
  const expected=[[1,0,5],[2,5,15],[3,15,25],[4,25,30]];
  for(const [stage,start,end] of expected){
    assert.match(result.html,new RegExp(`data-session-stage="${stage}" data-session-start="${start}" data-session-end="${end}"`));
  }
  assert.equal(result.sessionMinutes,30);
  assert.equal(result.sessionPhases.length,4);
  const review=validateBootstrapHtml(result.html,{scopeInventory:result.approvedScopeInventory});
  assert.equal(review.pass,true,review.blockers.join(','));
});

test('runtime session normalizer is idempotent when bootstrap already generated the full contract',()=>{
  const result=buildContractSafePlayable({gameId:'session-contract-test',gameName:'Session Contract Test',baseline});
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'jaewoon-session-generated-'));
  try{
    const source=path.join(root,'web-games','candidate');
    fs.mkdirSync(source,{recursive:true});
    const index=path.join(source,'index.html');
    fs.writeFileSync(index,result.html,'utf8');
    const before=fs.readFileSync(index,'utf8');
    const normalized=ensure30MinuteSessionContract({sourcePath:source});
    const after=fs.readFileSync(index,'utf8');
    assert.equal(normalized.mutated,false);
    assert.equal(normalized.minutes,30);
    assert.equal(normalized.stages,4);
    assert.equal(after,before);
    assert.equal((after.match(/data-session-stage="\d"/g)||[]).length,4);
  } finally {fs.rmSync(root,{recursive:true,force:true});}
});
