import test from 'node:test';
import assert from 'node:assert/strict';
import { createPublicWebQaEvidence } from '../tools/company-qa-public-web-evidence.mjs';

test('healthy web smoke becomes QA pass-eligible runtime evidence',()=>{
  const result=createPublicWebQaEvidence({updatedAt:'2026-09-09T00:00:00Z',games:[{
    gameId:'demo',status:'healthy',score:90,checkedAt:'2026-09-09T00:00:00Z',
    signals:{loadOk:true,contentSignal:true,inputDelivered:true,reloadOk:true,overflowOk:true},
    issues:[],screenshot:'qa-artifacts/public-game-health/demo.png'
  }]});
  assert.equal(result.games[0].runtimeSmokePassed,true);
  assert.equal(result.games[0].qaPassEligible,true);
  assert.ok(result.games[0].playTestEvidence.some(x=>x.includes('input smoke=PASS')));
});

test('runtime error prevents QA pass eligibility',()=>{
  const result=createPublicWebQaEvidence({games:[{
    gameId:'broken',status:'warning',score:70,
    signals:{loadOk:true,contentSignal:true,inputDelivered:true,reloadOk:true,overflowOk:true},
    issues:[{type:'console',message:'boom'}]
  }]});
  assert.equal(result.games[0].qaPassEligible,false);
  assert.deepEqual(result.games[0].blockers,['console: boom']);
});

test('missing input or mobile fit prevents QA pass eligibility',()=>{
  const result=createPublicWebQaEvidence({games:[{
    gameId:'touchless',status:'healthy',score:90,
    signals:{loadOk:true,contentSignal:true,inputDelivered:false,reloadOk:true,overflowOk:false},issues:[]
  }]});
  assert.equal(result.games[0].qaPassEligible,false);
  assert.equal(result.games[0].requiredSignals.inputDelivered,false);
  assert.equal(result.games[0].requiredSignals.overflowOk,false);
});
