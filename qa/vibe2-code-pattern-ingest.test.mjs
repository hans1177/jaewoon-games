import test from 'node:test';
import assert from 'node:assert/strict';
import {deriveVerifiedCodePatterns} from '../tools/vibe2-code-pattern-ingest.mjs';

test('verified sample yields abstract code patterns without raw patch',()=>{
  const rows=deriveVerifiedCodePatterns({
    taskType:'coding',gameId:'g1',sourceRevision:'a'.repeat(40),independentQa:'PASS',browserQa:'PASS',
    instruction:'Repair mobile input and save restore state regression',
    input:'{"sourcePath":"web-games/g1"}',
    output:'summary\n검증된 패치:\n+ localStorage.setItem("x","y")',
    verification:{fullRegression:'PASS',proposedTests:['touch input','save restore']}
  },'sample.json');
  assert.ok(rows.length>=2);
  assert.ok(rows.every(x=>x.verified===true&&x.rawCodeStored===false));
  assert.ok(rows.every(x=>!String(x.pattern).includes('localStorage.setItem')));
});

test('unverified sample is rejected',()=>{
  assert.deepEqual(deriveVerifiedCodePatterns({taskType:'coding',sourceRevision:'a'.repeat(40),independentQa:'FAIL'}),[]);
});


test('verified Web and Roblox aesthetic repairs distill concrete source-bound patterns',()=>{
  for(const [input,engine] of [
    ['web-games/a: damage popup, tooltip placement, animated icon, nine slice','web'],
    ['roblox-games/a: 데미지 숫자와 아이콘 애니, 보스 체력바 시각 개선','roblox']
  ]){
    const rows=deriveVerifiedCodePatterns({
      taskType:'coding',sourceRevision:'b'.repeat(40),gameId:'a',
      independentQa:'PASS',browserQa:engine==='web'?'PASS':'NOT_APPLICABLE',
      instruction:input,verification:{fullRegression:'PASS',proposedTests:['same scene runtime visual checks']}
    },'qa-record.json');
    assert.ok(rows.some(row=>row.implementationRecipe));
    assert.ok(rows.every(row=>row.verified===true&&row.rawCodeStored===false));
    assert.ok(rows.filter(row=>row.implementationRecipe).every(row=>row.implementationRecipe.proof.length));
    assert.ok(rows.some(row=>row.system==='DAMAGE_POPUP_POOL'));
  }
});

test('new game-specific visual algorithms distill only after independent regression proof',()=>{
  const base={
    taskType:'coding',gameId:'survival',sourceRevision:'e'.repeat(40),independentQa:'PASS',
    browserQa:'PASS',verification:{fullRegression:'PASS',proposedTests:['actual runtime UI check']},
    instruction:'source grounded visual pattern selection, asset role matching, fixed touch control, auto screen discovery',
    input:'web-games/survival/index.html',
    output:'Existing game UI implementation, no source copied.'
  };
  const patterns=deriveVerifiedCodePatterns(base,'verified-ui.json');
  for(const system of ['SOURCE_GROUNDED_VISUAL_SELECTION','VISUAL_ASSET_ROLE_MATCHING','MOBILE_TOUCH_LAYOUT_PINNING','ADAPTIVE_SCREEN_DISCOVERY']){
    const row=patterns.find(x=>x.system===system);
    assert.ok(row,'verified sample must distill '+system);
    assert.ok(row.implementationRecipe.proof.length>=4);
    assert.equal(row.rawCodeStored,false);
    assert.equal(row.authority,'verified-internal-code-pattern');
  }
  assert.equal(deriveVerifiedCodePatterns({...base,independentQa:'FAIL'},'unverified.json').length,0);
  assert.equal(deriveVerifiedCodePatterns({...base,verification:{fullRegression:'FAIL'}},'failed-regression.json').length,0);
});
