import test from 'node:test';
import assert from 'node:assert/strict';
import {buildContractSafePlayable,validateBootstrapHtml} from '../tools/company-development-web-bootstrap.mjs';
import {validateSessionStructure} from '../tools/company-development-web-gameplay-validation.mjs';

const baseline={
  gameSeedId:'SEED-CASUAL-001',
  content:{
    identity:'Sixty Minute Contract Test Game',
    coreFun:'Move, choose, progress, and unlock increasingly varied objectives over a meaningful first-hour session.',
    coreLoop:['Move toward an objective','Resolve a challenge and earn a reward','Spend the reward on progression'],
    mobileUx:'Touch-first controls'
  }
};

test('generated Web companion declares a meaningful 60 minute four-stage session',()=>{
  const result=buildContractSafePlayable({gameId:'session-60-test',gameName:'Session 60 Test',baseline});
  assert.match(result.html,/data-session-minutes="60"/);
  assert.equal((result.html.match(/data-session-stage=/g)||[]).length,4);
  assert.match(result.html,/data-session-start="0"/);
  assert.match(result.html,/data-session-end="60"/);
  const review=validateBootstrapHtml(result.html,{scopeInventory:result.approvedScopeInventory});
  assert.equal(review.pass,true,review.blockers.join(','));
  assert.equal(review.sessionMinutes,60);
  assert.equal(review.sessionStageCount,4);
});

test('runtime session structure must continuously cover minute 0 through 60',()=>{
  const pass=validateSessionStructure({sessionDepthMinutes:60,sessionStages:[
    {id:'INTRO',start:0,end:10},
    {id:'CORE',start:10,end:30},
    {id:'VARIATION',start:30,end:50},
    {id:'MILESTONE',start:50,end:60}
  ]});
  assert.equal(pass.pass,true);
  const gap=validateSessionStructure({sessionDepthMinutes:60,sessionStages:[
    {id:'INTRO',start:0,end:10},
    {id:'CORE',start:15,end:30},
    {id:'VARIATION',start:30,end:50},
    {id:'MILESTONE',start:50,end:60}
  ]});
  assert.equal(gap.pass,false);
  const short=validateSessionStructure({sessionDepthMinutes:30,sessionStages:[
    {id:'INTRO',start:0,end:10},{id:'CORE',start:10,end:20},{id:'VARIATION',start:20,end:25},{id:'MILESTONE',start:25,end:30}
  ]});
  assert.equal(short.pass,false);
});
