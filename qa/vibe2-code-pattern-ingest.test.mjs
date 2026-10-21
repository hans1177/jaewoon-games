// 파일명: qa/vibe2-code-pattern-ingest.test.mjs
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
      instruction:input,verification:{fullRegression:'PASS',runtime:engine==='roblox'?'PASS':undefined,proposedTests:['same scene runtime visual checks']}
    },'qa-record.json');
    assert.ok(rows.some(row=>row.implementationRecipe));
    assert.ok(rows.every(row=>row.verified===true&&row.rawCodeStored===false));
    assert.ok(rows.filter(row=>row.implementationRecipe).every(row=>row.implementationRecipe.proof.length));
    assert.ok(rows.some(row=>row.system==='DAMAGE_POPUP_POOL'));
  }
});

test('Roblox-native visual patterns require verified runtime in canonical training evidence',()=>{
  const base={
    taskType:'roblox',gameId:'rpg1',sourceRevision:'c'.repeat(40),
    independentQa:'PASS',browserQa:'NOT_APPLICABLE',
    instruction:'Roblox 보스 체력바와 데미지 숫자 표시',
    verification:{fullRegression:'PASS'}
  };
  assert.deepEqual(deriveVerifiedCodePatterns(base,'roblox.json'),[]);
  const verified=deriveVerifiedCodePatterns({...base,verification:{...base.verification,runtime:'PASS'}},'roblox.json');
  assert.ok(verified.some(x=>x.system==='BOSS_PHASE_PRESENTATION'));
  assert.ok(verified.some(x=>x.system==='DAMAGE_POPUP_POOL'));
  assert.ok(verified.every(x=>x.engine==='roblox'&&x.rawCodeStored===false));
});


test('verified gameplay action, motion contact and scene causality yield source-bound checks, not gameplay authority',()=>{
  const rows=deriveVerifiedCodePatterns({
    taskType:'coding',gameId:'forest',sourceRevision:'d'.repeat(40),
    independentQa:'PASS',browserQa:'PASS',
    instruction:'터치 공격 판정과 발 접지 문워크 수정, 장면 인과와 카메라 연출 판정 연결',
    verification:{fullRegression:'PASS'}
  },'verified-web-causal.json');
  for(const system of ['INPUT_ACTION_CAUSAL_CHAIN','MOTION_CONTACT_SYNC','SCENE_CAUSALITY_CHAIN']){
    const recipe=rows.find(row=>row.system===system)?.implementationRecipe;
    assert.ok(recipe,system);
    assert.ok(recipe.source&&recipe.proof.length>=4,system);
  }
  assert.ok(rows.every(row=>row.engine==='web'&&row.rawCodeStored===false));
});

test('Unity and Roblox patterns cannot use browser or independent QA as native runtime proof',()=>{
  for(const engine of ['unity','roblox']){
    const sample={
      taskType:engine,gameId:'hero',sourceRevision:'e'.repeat(40),independentQa:'PASS',
      browserQa:'PASS',instruction:'문워크 발 접지 수정',verification:{fullRegression:'PASS'}
    };
    assert.deepEqual(deriveVerifiedCodePatterns(sample,'unverified-native.json'),[]);
    const patterns=deriveVerifiedCodePatterns({...sample,verification:{...sample.verification,runtime:'PASS'}},'verified-native.json');
    assert.ok(patterns.some(row=>row.system==='MOTION_CONTACT_SYNC'),engine);
    assert.ok(patterns.every(row=>row.engine===engine),engine);
  }
  const inferred={taskType:'coding',sourcePaths:['roblox-games/hero/client/Game.client.luau'],
    gameId:'hero',sourceRevision:'f'.repeat(40),independentQa:'PASS',browserQa:'PASS',
    instruction:'터치 공격 판정',verification:{fullRegression:'PASS'}};
  assert.deepEqual(deriveVerifiedCodePatterns(inferred,'no-roblox-runtime.json'),[]);
  assert.ok(deriveVerifiedCodePatterns({...inferred,runtime:'PASS'},'roblox-native.json').every(row=>row.engine==='roblox'));
});
