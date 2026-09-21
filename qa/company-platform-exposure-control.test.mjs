import test from 'node:test';
import assert from 'node:assert/strict';
import {controlPlatformExposure,homepageExposureSnapshot} from '../tools/company-platform-exposure-control.mjs';

test('internal release does not imply public exposure and creates rebuild work',()=>{
 const dev={items:[{gameId:'g',gameName:'G',productionClass:'DEVELOPMENT_CONFIRMED',
  executionEvidence:{runtimePassed:true,independentQaPassed:true,regressionPassed:true,exactRevision:true},
  robloxRuntimePassed:true,robloxIndependentQaPassed:true,robloxRegressionPassed:true}]};
 const r=controlPlatformExposure({developmentQueue:dev,vibeQueue:{tasks:[]}});
 const g=r.state.games[0];
 assert.equal(g.platforms.find(x=>x.platform==='UNITY').internalReleaseState,'INTERNAL_PLATFORM_RELEASE');
 assert.equal(g.platforms.find(x=>x.platform==='ROBLOX').externalExposureState,'INTERNAL_ONLY');
 assert.equal(g.publicReleaseReady,false);
 assert.equal(r.queue.tasks.filter(x=>x.id.includes('second-gate-rebuild')).length,2);
});
test('second gate requires adaptation runtime evidence and no high tester bug',()=>{
 const base={gameId:'g',productionClass:'DEVELOPMENT_CONFIRMED',
  executionEvidence:{runtimePassed:true,independentQaPassed:true,regressionPassed:true,exactRevision:true},
  robloxRuntimePassed:true,robloxIndependentQaPassed:true,robloxRegressionPassed:true,
  unityPlatformAdaptationEvidence:{rebuildCompleted:true,pass:true,runtimeEvidencePass:true},
  robloxPlatformAdaptationEvidence:{rebuildCompleted:true,pass:true,runtimeEvidencePass:true}};
 let r=controlPlatformExposure({developmentQueue:{items:[base]},ticketQueue:{tickets:[{id:'b',gameId:'g',surface:'UNITY',severity:'HIGH',status:'OPEN'}]}});
 assert.equal(r.state.games[0].publicReleaseReady,false);
 r=controlPlatformExposure({developmentQueue:{items:[base]},ticketQueue:{tickets:[]}});
 assert.equal(r.state.games[0].publicReleaseReady,true);
 assert.equal(r.state.games[0].externalPublicReleaseState,'PUBLIC_RELEASE_READY');
});
test('homepage snapshot exposes full internal platform state',()=>{
 const snap=homepageExposureSnapshot({updatedAt:'x',games:[{gameId:'g',platforms:[],externalPublicReleaseState:'INTERNAL_ONLY'}]});
 assert.equal(snap.internalCompanySurface,true);
 assert.equal(snap.games[0].externalPublicReleaseState,'INTERNAL_ONLY');
});

test('new internal release after exposure-gate activation is never treated as legacy public',()=>{
 const roadmap={developmentLifecycleMachine:{internalPlatformReleaseAndPublicExposureGate:{activatedAt:'2026-09-21T00:00:00Z'}}};
 const item={gameId:'g',productionClass:'DEVELOPMENT_CONFIRMED',
  executionEvidence:{runtimePassed:true,independentQaPassed:true,regressionPassed:true,exactRevision:true},
  robloxRuntimePassed:true,robloxIndependentQaPassed:true,robloxRegressionPassed:true,
  robloxReleaseClaim:true,robloxFinalReviewPassed:true,robloxRegressionPassed:true,
  robloxReleaseEvidence:{published:true,publishedAt:'2026-09-21T10:00:00Z'}};
 const r=controlPlatformExposure({developmentQueue:{items:[item]},ticketQueue:{tickets:[]},vibeQueue:{tasks:[]},roadmap});
 const roblox=r.state.games[0].platforms.find(x=>x.platform==='ROBLOX');
 assert.equal(roblox.publication.legacyPublicRelease,false);
 assert.equal(roblox.publication.publicReleased,false);
 assert.equal(roblox.externalExposureState,'INTERNAL_ONLY');
 assert.equal(r.state.games[0].externalPublicReleaseState,'INTERNAL_ONLY');
});

test('explicit external publication after both second gates promotes to PUBLIC_RELEASE',()=>{
 const item={gameId:'g',productionClass:'DEVELOPMENT_CONFIRMED',
  executionEvidence:{runtimePassed:true,independentQaPassed:true,regressionPassed:true,exactRevision:true},
  robloxRuntimePassed:true,robloxIndependentQaPassed:true,robloxRegressionPassed:true,
  unityPlatformAdaptationEvidence:{rebuildCompleted:true,pass:true,runtimeEvidencePass:true},
  robloxPlatformAdaptationEvidence:{rebuildCompleted:true,pass:true,runtimeEvidencePass:true},
  robloxExternalPublicReleaseConfirmed:true,
  unityExternalPublicReleaseConfirmed:true};
 const r=controlPlatformExposure({developmentQueue:{items:[item]},ticketQueue:{tickets:[]},vibeQueue:{tasks:[]}});
 const g=r.state.games[0];
 assert.equal(g.publicReleaseReady,true);
 assert.equal(g.publicReleased,true);
 assert.equal(g.externalPublicReleaseState,'PUBLIC_RELEASE');
 assert.equal(g.platforms.find(x=>x.platform==='ROBLOX').externalExposureState,'PUBLIC_RELEASE');
 assert.equal(g.platforms.find(x=>x.platform==='UNITY').externalExposureState,'PUBLIC_RELEASE');
});

