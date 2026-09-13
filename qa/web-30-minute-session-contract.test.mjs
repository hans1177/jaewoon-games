import test from 'node:test';
import assert from 'node:assert/strict';
import {buildContractSafePlayable,validateBootstrapHtml} from '../tools/company-development-web-bootstrap.mjs';

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

test('generated Web companion contains a real 30-minute four-phase session contract',()=>{
  const result=buildContractSafePlayable({gameId:'session-contract-test',gameName:'Session Contract Test',baseline});
  assert.match(result.html,/data-session-minutes="30"/);
  for(const phase of ['onboarding','core-loop','escalation','climax']){
    assert.match(result.html,new RegExp(`data-session-phase="${phase}"`));
  }
  assert.equal(result.sessionMinutes,30);
  assert.equal(result.sessionPhases.length,4);
  const review=validateBootstrapHtml(result.html,{scopeInventory:result.approvedScopeInventory});
  assert.equal(review.pass,true,review.blockers.join(','));
  assert.equal(review.sessionMinutes,30);
  assert.equal(review.sessionPhaseCount,4);
});

test('bootstrap contract rejects fake or incomplete session depth',()=>{
  const result=buildContractSafePlayable({gameId:'session-contract-test',gameName:'Session Contract Test',baseline});
  const noDepth=result.html.replace('data-session-minutes="30"','data-session-minutes="0"');
  assert.ok(validateBootstrapHtml(noDepth,{scopeInventory:result.approvedScopeInventory}).blockers.includes('SESSION_30_MINUTES_REQUIRED'));
  const noClimax=result.html.replace('data-session-phase="climax"','data-session-phase="missing"');
  assert.ok(validateBootstrapHtml(noClimax,{scopeInventory:result.approvedScopeInventory}).blockers.includes('SESSION_PHASE_CLIMAX_REQUIRED'));
});
