import test from 'node:test';
import assert from 'node:assert/strict';
import {controlPlatformExposure,homepageExposureSnapshot} from '../tools/company-platform-exposure-control.mjs';

const source='a'.repeat(40);
const artifact='sha256:'+'b'.repeat(64);
const candidate={published:true,sourceRevision:source,artifactIdentity:artifact,universeId:'123',placeId:'456',versionNumber:7};
const exact=(extra={})=>({pass:true,sourceRevision:source,artifactIdentity:artifact,universeId:'123',placeId:'456',versionNumber:7,...extra});

const technicalBase=()=>({
  gameId:'g',gameName:'G',productionClass:'DEVELOPMENT_CONFIRMED',
  robloxSourceCommit:source,robloxBuildArtifactIdentity:artifact,
  robloxRuntimeCandidateEvidence:{...candidate},
  executionEvidence:{runtimePassed:true,independentQaPassed:true,regressionPassed:true,exactRevision:true},
  robloxRuntimePassed:true,robloxIndependentQaPassed:true,robloxRegressionPassed:true,
  robloxExactRevisionPassed:true,robloxF9ReleaseRegressionPassed:true,robloxFinalReviewPassed:true,
  robloxFoundationF0Passed:true,robloxDatastoreRejoinPassed:true,robloxMultiplayerQaPassed:true,
  robloxServerClientBoundaryPassed:true,robloxMobileControlUiPassed:true
});

const strictRobloxEvidence=()=>({
  robloxInternalVibePlayEvidence:exact({
    actualPlay:true,
    scenarioCoveragePass:true,
    scenarioCoverage:['NEW_GAME_START','CORE_GAMEPLAY_LOOP','PROGRESSION_AND_REWARD','SAVE_AND_REJOIN_WHEN_APPLICABLE']
  }),
  robloxGameCompletionEvidence:exact({
    coreSystemsImplemented:true,progressionDepthPassed:true,noCoreContentDeadEnd:true,goalsRewardsProgressionConnected:true
  }),
  robloxPlatformAdaptationEvidence:exact({
    rebuildCompleted:true,runtimeEvidencePassed:true,mobileAndLowEndPerformancePassed:true
  }),
  robloxSecurityReleaseEvidence:exact({noReleaseBlockingFinding:true}),
  robloxPresentationCompletionEvidence:exact({primaryGameplayPlaceholderDebt:0,runtimeVisualEvidencePassed:true}),
  robloxReleaseStabilityEvidence:exact({distinctCompletedBuildupCycles:true,releaseBlockingFailureObservedSinceBaseline:false}),
  robloxPublicReleaseFinalEvidence:exact({fullPublicGateRevalidationPassed:true})
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
});

test('real-server observation pending keeps Roblox internally ready but blocks public release',()=>{
  const item={
    ...technicalBase(),
    robloxRuntimePassed:false,
    robloxInternalReleaseReady:true,
    robloxInternalReleasePublished:true,
    robloxPublicReleaseRuntimeObservationPending:true,
    robloxRuntimeFoundationEvidence:{serverBootObserved:false},
    ...strictRobloxEvidence()
  };
  const r=controlPlatformExposure({developmentQueue:{items:[item]},ticketQueue:{tickets:[]},vibeQueue:{tasks:[]}});
  const p=r.state.games[0].platforms.find(x=>x.platform==='ROBLOX');
  assert.equal(p.internalReleaseReady,true);
  assert.equal(p.externalExposureState,'INTERNAL_ONLY');
  assert.equal(p.publicReleaseReady,false);
  assert.ok(p.publicHardGate.blockers.includes('ROBLOX_PUBLIC_HARD_GATE_TECHNICAL'));
  assert.ok(p.publicHardGate.blockers.includes('ROBLOX_PUBLIC_HARD_GATE_REALSERVERBOOT'));
});

test('old internal playtest flag cannot bypass actual Vibe play and hard gate',()=>{
  const item={...technicalBase(),robloxInternalReleasePublished:true,robloxInternalPlaytestPassed:true};
  const r=controlPlatformExposure({developmentQueue:{items:[item]},ticketQueue:{tickets:[]},vibeQueue:{tasks:[]}});
  const p=r.state.games[0].platforms.find(x=>x.platform==='ROBLOX');
  assert.equal(p.publicReleaseReady,false);
  assert.equal(p.externalExposureState,'INTERNAL_ONLY');
  assert.equal(p.perpetualBuildupActive,true);
  assert.ok(p.publicHardGate.blockers.includes('ROBLOX_PUBLIC_HARD_GATE_ACTUALVIBEPLAY'));
});

test('actual Vibe play alone starts rebuild work but still cannot public-release',()=>{
  const item={...technicalBase(),robloxInternalReleasePublished:true,...strictRobloxEvidence()};
  delete item.robloxPlatformAdaptationEvidence;
  const r=controlPlatformExposure({developmentQueue:{items:[item]},ticketQueue:{tickets:[]},vibeQueue:{tasks:[]}});
  const p=r.state.games[0].platforms.find(x=>x.platform==='ROBLOX');
  assert.equal(p.publicReleaseReady,false);
  assert.equal(p.rebuildRequired,true);
  assert.equal(r.queue.tasks.length,1);
  assert.equal(r.queue.tasks[0].id,'g-roblox-second-gate-rebuild-v1');
  assert.equal(r.queue.tasks[0].retryPolicy,'UNLIMITED_CAUSAL_REPAIR');
});

test('Roblox becomes public-ready only when every strict exact-candidate evidence class passes',()=>{
  const item={...technicalBase(),robloxInternalReleasePublished:true,...strictRobloxEvidence()};
  const r=controlPlatformExposure({developmentQueue:{items:[item]},ticketQueue:{tickets:[]},vibeQueue:{tasks:[]}});
  const p=r.state.games[0].platforms.find(x=>x.platform==='ROBLOX');
  assert.equal(p.publicHardGate.pass,true);
  assert.deepEqual(p.publicHardGate.blockers,[]);
  assert.equal(p.publicReleaseReady,true);
  assert.equal(p.externalExposureState,'PUBLIC_RELEASE_READY');
});

test('critical or high tester bug blocks strict public gate',()=>{
  const item={...technicalBase(),robloxInternalReleasePublished:true,...strictRobloxEvidence()};
  const r=controlPlatformExposure({
    developmentQueue:{items:[item]},
    ticketQueue:{tickets:[{id:'b',gameId:'g',surface:'ROBLOX',severity:'HIGH',status:'OPEN'}]},
    vibeQueue:{tasks:[]}
  });
  const p=r.state.games[0].platforms.find(x=>x.platform==='ROBLOX');
  assert.equal(p.publicReleaseReady,false);
  assert.ok(p.publicHardGate.blockers.includes('ROBLOX_PUBLIC_HARD_GATE_NOBLOCKINGTICKETS'));
});

test('public release remains platform-independent after Roblox hard gate',()=>{
  const item={
    ...technicalBase(),...strictRobloxEvidence(),
    robloxInternalReleasePublished:true,robloxExternalPublicReleaseConfirmed:true,
    unityInternalReleasePublished:true,unityInternalPlaytestPassed:true
  };
  const r=controlPlatformExposure({developmentQueue:{items:[item]},ticketQueue:{tickets:[]},vibeQueue:{tasks:[]}});
  const g=r.state.games[0];
  assert.equal(g.platforms.find(p=>p.platform==='ROBLOX').externalExposureState,'PUBLIC_RELEASE');
  assert.equal(g.platforms.find(p=>p.platform==='UNITY').externalExposureState,'PUBLIC_RELEASE_READY');
  assert.equal(g.anyPlatformPublicReleased,true);
  assert.equal(g.publicReleased,false);
  assert.equal(g.externalPublicReleaseState,'PUBLIC_RELEASE_PARTIAL');
});

test('homepage snapshot exposes strict Roblox buildup/public state',()=>{
  const state=controlPlatformExposure({developmentQueue:{items:[technicalBase()]}}).state;
  const snap=homepageExposureSnapshot(state);
  assert.equal(snap.version,3);
  assert.equal(snap.internalCompanySurface,true);
  assert.deepEqual(snap.games[0].platforms.map(p=>p.platform),['ROBLOX','UNITY']);
});
