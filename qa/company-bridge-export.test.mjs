import test from 'node:test';
import assert from 'node:assert/strict';
import {buildGamesBridgeSnapshot,validateGamesBridgeSnapshot} from '../tools/company-bridge-export.mjs';

test('exports only safe summarized operations state',()=>{
  const snapshot=buildGamesBridgeSnapshot({
    portfolio:{fixedProjectCount:false,publicStableBranch:'main',continuousDevelopmentBranch:'autonomous-dev',paidApi:false,projects:[{id:'P0001',slug:'survival',name:'나의 생존기',sourcePath:'web-games/survival',mode:'IMPROVE',profileStatus:'AUDITED_PARTIAL'}]},
    health:{games:[{gameId:'survival',status:'healthy',score:91,healthReason:'ok',issues:[{type:'console',message:'404'}],checkedAt:'2026-09-09'}]},
    dna:{items:[{key:'MOTION:x',type:'MOTION',patternId:'x',stage:'GAME_VERIFIED',jayApproved:false,summary:{distinctGames:1}}]},
    artbooks:{artbooks:[{id:'a1',gameId:'survival',status:'completed-artbook',productionApproval:false,createdAt:'2026-09-09'}]},
    sourceRevision:'abc',timestamp:'2026-09-09T00:00:00Z'
  });
  assert.equal(validateGamesBridgeSnapshot(snapshot).pass,true);
  assert.equal(snapshot.projects[0].health.score,91);
  assert.equal(snapshot.projects[0].health.issues[0],'console: 404');
  assert.equal(snapshot.safety.containsSecrets,false);
  assert.equal(snapshot.safety.publicGameCodeAutoPromotion,false);
});

test('rejects unsafe bridge flags',()=>{
  const snapshot=buildGamesBridgeSnapshot({portfolio:{projects:[]}});
  snapshot.safety.containsCredentials=true;
  assert.equal(validateGamesBridgeSnapshot(snapshot).pass,false);
});
