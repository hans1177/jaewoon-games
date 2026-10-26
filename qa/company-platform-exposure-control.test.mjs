// 파일명: qa/company-platform-exposure-control.test.mjs
import test from 'node:test';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {controlPlatformExposure,homepageExposureSnapshot,evaluateInternalRelease} from '../tools/company-platform-exposure-control.mjs';
import {reuseUnchangedHomepageExposure,robloxFloorProgress} from '../tools/company-homepage-platform-exposure-sync.mjs';

const policy=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
const lobbyScenarios=policy.developmentLifecycleMachine.internalPlatformReleaseAndPublicExposureGate.internalRelease.lobbyGate.runtimeScenarios.map(id=>({id,pass:true}));
const source='a'.repeat(40);
const artifact='sha256:'+'b'.repeat(64);

test('every exact F9 cycle is server-deployable without lobby or public approval and stale proof stays blocked',()=>{
  const item={gameId:'new-game',robloxRuntimePassed:true,robloxIndependentQaPassed:true,robloxRegressionPassed:true,
    robloxFinalReviewPassed:true,robloxF9ReleaseRegressionPassed:true,
    robloxRuntimeCandidateEvidence:{published:true,releaseClaim:false,sourceRevision:source,artifactIdentity:artifact,universeId:'123',placeId:'456',versionNumber:7},
    robloxF9ReleaseRegressionEvidence:{gameId:'new-game',sourceRevision:source,artifactIdentity:artifact,candidateVersionNumber:7,noCurrentCriticalOrHighTesterFailure:true}};
  assert.equal(evaluateInternalRelease(item,'ROBLOX',policy).ready,false);
  const verdict=evaluateInternalRelease(item,'ROBLOX',policy,'SERVER_DEPLOYMENT');
  assert.equal(verdict.ready,true);assert.equal(verdict.publicRelease,false);assert.equal(verdict.ownerPublicDecisionRequired,true);
  for(const mutation of [i=>i.robloxFinalReviewPassed=false,i=>i.robloxIndependentQaPassed=false,i=>i.robloxF9ReleaseRegressionEvidence.gameId='other',i=>i.robloxF9ReleaseRegressionEvidence.artifactIdentity='sha256:'+'c'.repeat(64),i=>i.robloxF9ReleaseRegressionEvidence.candidateVersionNumber=8,i=>i.robloxF9ReleaseRegressionEvidence.noCurrentCriticalOrHighTesterFailure=false,i=>i.robloxRuntimeCandidateEvidence.versionNumber=0]){
    const broken=structuredClone(item);mutation(broken);assert.equal(evaluateInternalRelease(broken,'ROBLOX',policy,'SERVER_DEPLOYMENT').ready,false);
  }
  assert.equal(evaluateInternalRelease(item,'ROBLOX',{},'SERVER_DEPLOYMENT').ready,false);
  const local=structuredClone(item);
  local.robloxRuntimeCandidateEvidence={published:false,releaseClaim:false,authority:'roblox-local-f0-pre-f9-artifact',sourceRevision:source,artifactIdentity:artifact,artifactRunId:21,versionNumber:21};
  local.robloxFoundationF0Evidence={sourcePreflightPassed:true,f0SourceIntegrityPassed:true,sourceRevision:source,artifactIdentity:artifact,artifactRunId:21};
  local.robloxF9ReleaseRegressionEvidence.candidateVersionNumber=21;
  assert.equal(evaluateInternalRelease(local,'ROBLOX',policy,'SERVER_DEPLOYMENT').ready,true);
  assert.equal(evaluateInternalRelease(local,'ROBLOX',policy).ready,false);
  local.robloxFoundationF0Evidence.artifactRunId=22;
  assert.equal(evaluateInternalRelease(local,'ROBLOX',policy,'SERVER_DEPLOYMENT').ready,false);
});
const candidate={published:true,sourceRevision:source,artifactIdentity:artifact,universeId:'123',placeId:'456',versionNumber:7};
const exact=(extra={})=>({pass:true,sourceRevision:source,artifactIdentity:artifact,universeId:'123',placeId:'456',versionNumber:7,...extra});

const technicalBase=()=>({
  gameId:'g',gameName:'G',productionClass:'DEVELOPMENT_CONFIRMED',
  designBaselineSource:'design/g/design.json',
  minimumDesignContract:{pass:true,source:'design/g/design.json',releaseChecklist:{identity:true,coreLoop:true,sessionRules:true,signatureSystems:true,presentation:true}},
  robloxPublicationTarget:{placeId:'456',verified:true,dedicated:true},robloxCanonicalReleaseEvidence:{...candidate},
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
    gameId:'g',authority:'roblox-official-studio-mcp-runtime',testedAt:'2026-09-30T13:00:00Z',
    errors:[],runtimeSummary:{consoleErrorCount:0,primaryActionDisplacement:2},actualPlay:true,
    scenarioCoveragePass:true,
    scenarioCoverage:[...lobbyScenarios,'NEW_GAME_START','CORE_GAMEPLAY_LOOP','PROGRESSION_AND_REWARD','SAVE_AND_REJOIN_WHEN_APPLICABLE']
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

test('technical pass alone cannot claim a completed lobby or internal release',()=>{
  const r=controlPlatformExposure({roadmap:policy,developmentQueue:{items:[technicalBase()]},vibeQueue:{tasks:[]}});
  const g=r.state.games[0];
  for(const p of g.platforms){
    assert.equal(p.internalReleaseReady,false);
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
  const r=controlPlatformExposure({roadmap:policy,developmentQueue:{items:[item]},ticketQueue:{tickets:[]},vibeQueue:{tasks:[]}});
  const p=r.state.games[0].platforms.find(x=>x.platform==='ROBLOX');
  assert.equal(p.internalReleaseReady,true);
  assert.equal(p.externalExposureState,'INTERNAL_ONLY');
  assert.equal(p.publicReleaseReady,false);
  assert.ok(p.publicHardGate.blockers.includes('ROBLOX_PUBLIC_HARD_GATE_TECHNICAL'));
  assert.ok(p.publicHardGate.blockers.includes('ROBLOX_PUBLIC_HARD_GATE_REALSERVERBOOT'));
});

test('old internal playtest flag cannot bypass actual Vibe play and hard gate',()=>{
  const item={...technicalBase(),robloxInternalReleasePublished:true,robloxInternalPlaytestPassed:true};
  const r=controlPlatformExposure({roadmap:policy,developmentQueue:{items:[item]},ticketQueue:{tickets:[]},vibeQueue:{tasks:[]}});
  const p=r.state.games[0].platforms.find(x=>x.platform==='ROBLOX');
  assert.equal(p.publicReleaseReady,false);
  assert.equal(p.externalExposureState,'INTERNAL_ONLY');
  assert.equal(p.perpetualBuildupActive,true);
  assert.ok(p.publicHardGate.blockers.includes('ROBLOX_PUBLIC_HARD_GATE_ACTUALVIBEPLAY'));
});

test('actual Vibe play alone starts rebuild work but still cannot public-release',()=>{
  const item={...technicalBase(),robloxInternalReleasePublished:true,...strictRobloxEvidence()};
  delete item.robloxPlatformAdaptationEvidence;
  const r=controlPlatformExposure({roadmap:policy,developmentQueue:{items:[item]},ticketQueue:{tickets:[]},vibeQueue:{tasks:[]}});
  const p=r.state.games[0].platforms.find(x=>x.platform==='ROBLOX');
  assert.equal(p.publicReleaseReady,false);
  assert.equal(p.rebuildRequired,true);
  assert.equal(r.queue.tasks.length,1);
  assert.equal(r.queue.tasks[0].id,'g-roblox-second-gate-rebuild-v1');
  assert.equal(r.queue.tasks[0].retryPolicy,'UNLIMITED_CAUSAL_REPAIR');
});

test('Roblox becomes public-ready only when every strict exact-candidate evidence class passes',()=>{
  const item={...technicalBase(),robloxInternalReleasePublished:true,...strictRobloxEvidence()};
  const r=controlPlatformExposure({roadmap:policy,developmentQueue:{items:[item]},ticketQueue:{tickets:[]},vibeQueue:{tasks:[]}});
  const p=r.state.games[0].platforms.find(x=>x.platform==='ROBLOX');
  assert.equal(p.publicHardGate.pass,true);
  assert.deepEqual(p.publicHardGate.blockers,[]);
  assert.equal(p.publicReleaseReady,true);
  assert.equal(p.externalExposureState,'PUBLIC_RELEASE_READY');
});

test('critical or high tester bug blocks strict public gate',()=>{
  const item={...technicalBase(),robloxInternalReleasePublished:true,...strictRobloxEvidence()};
  const r=controlPlatformExposure({roadmap:policy,
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
    unityInternalReleasePublished:true,unityInternalPlaytestPassed:true,
    unityInternalBuildUrl:'https://example.test/game.apk',unityCanonicalReleaseEvidence:{...candidate},
    unityInternalVibePlayEvidence:{...strictRobloxEvidence().robloxInternalVibePlayEvidence,runtimeVerified:true}
  };
  const r=controlPlatformExposure({roadmap:policy,developmentQueue:{items:[item]},ticketQueue:{tickets:[]},vibeQueue:{tasks:[]}});
  const g=r.state.games[0];
  assert.equal(g.platforms.find(p=>p.platform==='ROBLOX').externalExposureState,'PUBLIC_RELEASE');
  assert.equal(g.platforms.find(p=>p.platform==='UNITY').externalExposureState,'PUBLIC_RELEASE_READY');
  assert.equal(g.anyPlatformPublicReleased,true);
  assert.equal(g.publicReleased,false);
  assert.equal(g.externalPublicReleaseState,'PUBLIC_RELEASE_PARTIAL');
});

test('homepage snapshot exposes strict Roblox buildup/public state',()=>{
  const state=controlPlatformExposure({roadmap:policy,developmentQueue:{items:[technicalBase()]}}).state;
  const snap=homepageExposureSnapshot(state);
  assert.equal(snap.version,3);
  assert.equal(snap.internalCompanySurface,true);
  assert.deepEqual(snap.games[0].platforms.map(p=>p.platform),['ROBLOX','UNITY']);
});

// 출시 분류 회귀: 배포 여부, 실제 입력, 오래된 후보와 사용자 확정 예외를 각각 확인한다.
test('lobby gate rejects missing or stale evidence and cannot promote from publication flags alone',()=>{
  const item={...technicalBase(),...strictRobloxEvidence()};
  assert.equal(evaluateInternalRelease(item,'ROBLOX',policy).homepageReady,true);
  assert.equal(evaluateInternalRelease({...item,minimumDesignContract:{...item.minimumDesignContract,releaseChecklist:{}}},'ROBLOX',policy).ready,false);
  for(const change of [
    {sourceRevision:'c'.repeat(40)}, {artifactIdentity:'sha256:'+'c'.repeat(64)},
    {gameId:'other'}, {actualPlay:false}, {authority:'static-source-scan'},
    {runtimeSummary:{consoleErrorCount:1,primaryActionDisplacement:2}},
    {runtimeSummary:{consoleErrorCount:0,primaryActionDisplacement:0}},
    {scenarioCoverage:lobbyScenarios.slice(1)}
  ])assert.equal(evaluateInternalRelease({...item,robloxInternalVibePlayEvidence:{...item.robloxInternalVibePlayEvidence,...change}},'ROBLOX',policy).ready,false,JSON.stringify(change));
  assert.equal(evaluateInternalRelease(item,'ROBLOX',{}).ready,false);
});
test('only explicitly owner-confirmed horror game remains released without fabricating lobby PASS',()=>{
  const item={gameId:'horror-escape-room',robloxPublicationTarget:{placeId:'98222620265768',verified:true,dedicated:true}};
  const result=evaluateInternalRelease(item,'ROBLOX',policy);
  assert.equal(result.ready,true);assert.equal(result.homepageReady,true);
  assert.equal(result.ownerConfirmed,true);assert.equal(result.lobbyReady,false);
  assert.equal(result.basis,'OWNER_CONFIRMED');
  assert.equal(evaluateInternalRelease({...item,gameId:'other'},'ROBLOX',policy).ready,false);
  assert.equal(evaluateInternalRelease({...item,robloxPublicationTarget:{placeId:'999',verified:true}},'ROBLOX',policy).ready,false);
  assert.equal(evaluateInternalRelease(item,'UNITY',policy).ready,false);
});

test('platform exposure refresh only wakes homepage after a new verified runtime snapshot',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-platform-exposure-sync.yml','utf8');
  assert.match(workflow,/name: Persist exposure snapshot to company-runtime\n\s+id: persist/);
  assert.match(workflow,/if git -C "\$worktree" diff --cached --quiet; then pushed=1; break; fi/);
  assert.match(workflow,/if git -C "\$worktree" push origin "HEAD:refs\/heads\/\$COMPANY_RUNTIME_BRANCH"; then pushed=1; updated=true; break; fi/);
  assert.match(workflow,/echo "updated=\$updated" >> "\$GITHUB_OUTPUT"/);
  assert.match(workflow,/HOMEPAGE_EXPOSURE_SEMANTIC_NOOP=YES/);
  assert.match(workflow,/reuseUnchangedHomepageExposure/);
  assert.match(workflow,/name: Refresh homepage runtime mirror\n\s+if: steps\.persist\.outputs\.updated == 'true'/);
  assert.match(workflow,/test "\$pushed" = 1/,'failed runtime persistence must still fail closed');
});

test('homepage exposure dedup ignores generation time but preserves every material state change',()=>{
  const previous={
    version:3,authority:'company-runtime',internalCompanySurface:true,
    supportedPlatforms:['ROBLOX','UNITY'],
    centralPolicyFingerprint:'verified-policy-1',
    generatedAt:'2026-10-17T00:00:00Z',
    games:[{gameId:'g',updatedAt:'2026-10-17T00:00:00Z',platforms:[{platform:'ROBLOX',runtimePassed:false}]}]
  };
  const next={...previous,generatedAt:'2026-10-17T00:10:00Z'};
  assert.strictEqual(reuseUnchangedHomepageExposure(previous,next),previous);
  const gameplay={...next,games:[{...next.games[0],platforms:[{platform:'ROBLOX',runtimePassed:true}]}]};
  assert.strictEqual(reuseUnchangedHomepageExposure(previous,gameplay),gameplay);
  const policyChange={...next,centralPolicyFingerprint:'verified-policy-2'};
  assert.strictEqual(reuseUnchangedHomepageExposure(previous,policyChange),policyChange);
  const updatedGame={...next,games:[{...next.games[0],updatedAt:'2026-10-17T00:09:00Z'}]};
  assert.strictEqual(reuseUnchangedHomepageExposure(previous,updatedGame),updatedGame);
  assert.strictEqual(reuseUnchangedHomepageExposure({...previous,authority:'UNVERIFIED'},next),next);
});

test('Roblox floor timestamps are evidence-only, preserve failed and pending states',()=>{
  const catalogOnly=robloxFloorProgress({gameId:'unstarted',updatedAt:'2026-10-26T16:40:00Z'});
  assert.equal(catalogOnly.tracked,false);
  assert.equal(catalogOnly.verifiedAt,null);
  assert.equal(catalogOnly.currentFloor,null);
  const base={gameId:'g',targetPlatform:'ROBLOX',status:'ACTIVE',robloxProjectPath:'roblox-games/g',
    updatedAt:'2026-10-26T16:39:00Z'};
  const pending=robloxFloorProgress({...base,currentStep:'TARGET_PLATFORM_SOURCE_BIND'});
  assert.equal(pending.tracked,true);
  assert.equal(pending.f0PassedAt,null);
  assert.equal(pending.verifiedAt,null);
  assert.equal(pending.result,'PRE_F0_OR_PENDING');
  const failed=robloxFloorProgress({...base,currentStep:'ROBLOX_F0_SOURCE_PREFLIGHT',
    robloxFailureStage:'F0_GAMEPLAY_PRODUCT_READINESS',robloxFailureSignature:'ROBLOX_F0_GAMEPLAY_PRODUCT_READINESS_FAILED',
    robloxQualityBuildUpEvidence:{testedAt:'2026-10-25T14:44:04Z'}});
  assert.equal(failed.currentFloor,'F0');
  assert.equal(failed.result,'REPAIR_REQUIRED');
  assert.equal(failed.lastFailureAt,'2026-10-25T14:44:04.000Z');
  const f0=robloxFloorProgress({...base,currentStep:'PRIVATE_RUNTIME_CANDIDATE_DEPLOY',
    robloxFoundationF0Passed:true,robloxFoundationF0PassedAt:'2026-10-26T16:24:41Z',
    robloxBuildOrPackagePassed:true,robloxBuildPassedAt:'2026-10-26T16:24:41Z'});
  assert.equal(f0.f0PassedAt,'2026-10-26T16:24:41.000Z');
  assert.equal(f0.currentFloor,'F0_TO_F1_PRIVATE_CANDIDATE');
  assert.equal(f0.result,'F0_PASSED_AWAITING_NEXT_EVIDENCE');
  assert.equal(f0.completedCycles,0,'F0 success cannot pretend F9 completion');
  const pub=robloxFloorProgress({...base,currentStep:'TARGET_PLATFORM_RUNTIME_FOUNDATION',
    robloxFoundationF0Passed:true,robloxFoundationF0PassedAt:'2026-10-26T16:24:41Z',
    robloxRuntimeCandidateEvidence:{published:true,publishedAt:'2026-10-26T16:37:57Z'}});
  assert.equal(pub.currentFloor,'F1_TO_F4_RUNTIME_EVIDENCE');
  assert.equal(pub.verifiedAt,'2026-10-26T16:37:57.000Z');
  assert.equal(pub.completedCycles,0,'private candidate is not F9 canonical publication');
  const sourceFailure=robloxFloorProgress({...base,currentStep:'TARGET_PLATFORM_SOURCE_BIND',
    robloxFailureSignature:'existing-source-studio-asset-binding-required',
    robloxSourceBootstrapFailedAt:'2026-10-26T16:32:18Z'});
  assert.equal(sourceFailure.result,'REPAIR_REQUIRED');
  assert.equal(sourceFailure.verifiedAt,'2026-10-26T16:32:18.000Z');
});
test('company dashboard shows Seoul time and distinct Roblox floor evidence',()=>{
  const html=fs.readFileSync('company.html','utf8');
  assert.match(html,/Roblox F0~F9 반복개발 현황/);
  assert.match(html,/timeZone:'Asia\\/Seoul'/);
  assert.match(html,/robloxFloorList/);
  assert.match(html,/완료 회차/);
  assert.match(html,/\/homepage-platform-exposure\\.json/);
});
