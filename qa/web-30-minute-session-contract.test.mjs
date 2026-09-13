import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {buildContractSafePlayable,validateBootstrapHtml} from '../tools/company-development-web-bootstrap.mjs';
import {ensure30MinuteSessionContract,evaluateSessionContract,gameplayStateChanged} from '../tools/company-development-web-gameplay-validation.mjs';

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

const stages=(complete=false)=>[
  {stage:1,start:0,end:5,complete,text:'0–5분 도입 조작과 첫 목표'},
  {stage:2,start:5,end:15,complete,text:'5–15분 핵심 루프 반복과 성장'},
  {stage:3,start:15,end:25,complete,text:'15–25분 난도 상승과 변형'},
  {stage:4,start:25,end:30,complete,text:'25–30분 클라이맥스와 보상'}
];

test('generated Web companion contains one real 30-minute four-stage session contract',()=>{
  const result=buildContractSafePlayable({gameId:'session-contract-test',gameName:'Session Contract Test',baseline});
  assert.match(result.html,/data-session-minutes="30"/);
  const expected=[[1,0,5],[2,5,15],[3,15,25],[4,25,30]];
  for(const [stage,start,end] of expected)assert.match(result.html,new RegExp(`data-session-stage="${stage}" data-session-start="${start}" data-session-end="${end}"`));
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

test('30-minute marker and completed stage metadata alone do not count as meaningful gameplay',()=>{
  const before={sessionDepthMinutes:30,sessionStages:stages(false),sessionCurrentStage:0,sessionCompletedStages:0,dataState:[{tag:'DIV',text:'0',attrs:[['data-score','0']]}],canvases:[]};
  const after={...before,sessionStages:stages(true),sessionCurrentStage:4,sessionCompletedStages:4};
  const stageResults=stages(true).map(row=>({stage:row.stage,start:row.start,end:row.end,clicked:true,completed:true,gameStateChanged:false}));
  const verdict=evaluateSessionContract(before,after,stageResults);
  assert.equal(verdict.pass,false);
  assert.equal(verdict.validatedMinutes,0);
  assert.equal(verdict.stageGameplayPassed,false);
});

test('all four stages require independent observable game-state changes before 30 minutes is validated',()=>{
  const before={sessionDepthMinutes:30,sessionStages:stages(false),sessionCurrentStage:0,sessionCompletedStages:0,dataState:[{tag:'DIV',text:'0',attrs:[['data-score','0']]}],canvases:[]};
  const after={...before,sessionStages:stages(true),sessionCurrentStage:4,sessionCompletedStages:4,dataState:[{tag:'DIV',text:'30',attrs:[['data-score','30']]}]};
  assert.equal(gameplayStateChanged(before,after),true);
  const stageResults=stages(true).map(row=>({stage:row.stage,start:row.start,end:row.end,clicked:true,completed:true,gameStateChanged:true}));
  const pass=evaluateSessionContract(before,after,stageResults);
  assert.equal(pass.pass,true);
  assert.equal(pass.validatedMinutes,30);
  assert.equal(pass.stageGameplayPassed,true);
  const partial=stageResults.map((row,index)=>index===3?{...row,gameStateChanged:false}:row);
  const fail=evaluateSessionContract(before,after,partial);
  assert.equal(fail.pass,false);
  assert.equal(fail.validatedMinutes,25);
});
