import test from 'node:test';
import assert from 'node:assert/strict';
import {controlPlatformExposure,homepageExposureSnapshot} from '../tools/company-platform-exposure-control.mjs';

const technicalBase=()=>({
 gameId:'g',gameName:'G',productionClass:'DEVELOPMENT_CONFIRMED',
 executionEvidence:{runtimePassed:true,independentQaPassed:true,regressionPassed:true,exactRevision:true},
 robloxRuntimePassed:true,robloxIndependentQaPassed:true,robloxRegressionPassed:true
});

test('technical pass becomes internal-release ready but never public by itself',()=>{
 const r=controlPlatformExposure({developmentQueue:{items:[technicalBase()]},vibeQueue:{tasks:[]}});
 const g=r.state.games[0];
 for(const p of g.platforms){
   assert.equal(p.internalReleaseReady,true);
   assert.equal(p.internalReleasePublished,false);
   assert.equal(p.externalExposureState,'INTERNAL_ONLY');
 }
 assert.equal(g.publicReleaseReady,false);
 assert.equal(r.queue.tasks.length,0);
});

test('internal release requires playtest pass and no blocking ticket before public-ready',()=>{
 const item={...technicalBase(),robloxInternalReleasePublished:true,unityInternalReleasePublished:true};
 let r=controlPlatformExposure({developmentQueue:{items:[item]},ticketQueue:{tickets:[]}});
 assert.equal(r.state.games[0].platforms.every(p=>p.internalReleaseState==='INTERNAL_PLAYTEST_AND_DEBUG'),true);
 item.robloxInternalPlaytestPassed=true;
 item.unityInternalPlaytestPassed=true;
 r=controlPlatformExposure({developmentQueue:{items:[item]},ticketQueue:{tickets:[{id:'b',gameId:'g',surface:'UNITY',severity:'HIGH',status:'OPEN'}]}});
 assert.equal(r.state.games[0].platforms.find(p=>p.platform==='ROBLOX').publicReleaseReady,true);
 assert.equal(r.state.games[0].platforms.find(p=>p.platform==='UNITY').publicReleaseReady,false);
 r=controlPlatformExposure({developmentQueue:{items:[item]},ticketQueue:{tickets:[]}});
 assert.equal(r.state.games[0].publicReleaseReady,true);
});

test('public release is platform-independent',()=>{
 const item={...technicalBase(),
   robloxInternalReleasePublished:true,unityInternalReleasePublished:true,
   robloxInternalPlaytestPassed:true,unityInternalPlaytestPassed:true,
   robloxExternalPublicReleaseConfirmed:true
 };
 const r=controlPlatformExposure({developmentQueue:{items:[item]},ticketQueue:{tickets:[]}});
 const g=r.state.games[0];
 assert.equal(g.platforms.find(p=>p.platform==='ROBLOX').externalExposureState,'PUBLIC_RELEASE');
 assert.equal(g.platforms.find(p=>p.platform==='UNITY').externalExposureState,'PUBLIC_RELEASE_READY');
 assert.equal(g.anyPlatformPublicReleased,true);
 assert.equal(g.publicReleased,false);
 assert.equal(g.externalPublicReleaseState,'PUBLIC_RELEASE_PARTIAL');
});

test('homepage snapshot exposes Roblox and Unity internal/public states',()=>{
 const state=controlPlatformExposure({developmentQueue:{items:[technicalBase()]}}).state;
 const snap=homepageExposureSnapshot(state);
 assert.equal(snap.version,2);
 assert.equal(snap.internalCompanySurface,true);
 assert.deepEqual(snap.games[0].platforms.map(p=>p.platform),['ROBLOX','UNITY']);
});
