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
      instruction:input,verification:{fullRegression:'PASS',proposedTests:['same scene runtime visual checks'],native3dUiEvidence:{runtimeVerified:true,sourceRevision:'b'.repeat(40),ui3dGeometryObserved:true,spatialInteractionObserved:true}}
    },'qa-record.json');
    assert.ok(rows.some(row=>row.implementationRecipe));
    assert.ok(rows.every(row=>row.verified===true&&row.rawCodeStored===false));
    assert.ok(rows.filter(row=>row.implementationRecipe).every(row=>row.implementationRecipe.proof.length));
    assert.ok(rows.some(row=>row.system==='DAMAGE_POPUP_POOL'));
  }
});

test('legacy 2D visual source cannot be promoted as a reusable verified 3D UI recipe',()=>{
  const base={taskType:'coding',sourceRevision:'c'.repeat(40),gameId:'legacy',
    independentQa:'PASS',browserQa:'PASS',instruction:'web-games/legacy: damage popup, animated icon and tooltip placement',
    verification:{fullRegression:'PASS'}};
  const notConverted=deriveVerifiedCodePatterns(base,'old-record.json');
  assert.ok(notConverted.every(row=>!row.implementationRecipe));
  const insufficient=deriveVerifiedCodePatterns({...base,verification:{...base.verification,
    native3dUiEvidence:{runtimeVerified:true,sourceRevision:'WRONG',ui3dGeometryObserved:true,spatialInteractionObserved:true}}});
  assert.ok(insufficient.every(row=>!row.implementationRecipe));
  const converted=deriveVerifiedCodePatterns({...base,verification:{...base.verification,
    native3dUiEvidence:{runtimeVerified:true,sourceRevision:base.sourceRevision,
      ui3dGeometryObserved:true,spatialInteractionObserved:true}}});
  assert.ok(converted.some(row=>row.implementationRecipe));
  assert.ok(converted.filter(row=>row.implementationRecipe).every(row=>row.native3dUiEvidence.runtimeVerified===true));
  assert.ok(converted.every(row=>!String(row.implementationRecipe?.source||'').includes('createWebPresentationController')));
});
