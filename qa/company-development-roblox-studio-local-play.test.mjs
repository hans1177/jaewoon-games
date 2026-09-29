import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {
  validateLocalStudioPolicy,
  detectStudioMcpAssistantSetting,
  collectStudios,
  collectStudioConsoleEntries,
  classifyStudioConsoleOutput,
  planLocalStudioCandidates,
  createLocalStudioPlayEvidence,
  applyLocalStudioPlayResult,
  evaluateStudioActualPlayContract,
  deriveStudioActualPlayContract,
  assertCurrentStudioWorkflowHead,
  runStudioMultiplayerAudit
} from '../tools/company-development-roblox-studio-local-play.mjs';

const workflow=fs.readFileSync('.github/workflows/company-development-roblox-post-runtime-qa.yml','utf8');
const helper=fs.readFileSync('tools/company-development-roblox-studio-local-play.mjs','utf8');
const horrorServer=fs.readFileSync('roblox-games/horror-escape-room/server/Game.server.luau','utf8');
const cozyServer=fs.readFileSync('roblox-games/cozy-island/server/Game.server.luau','utf8');

const source='a'.repeat(40);
const artifact='sha256:'+'b'.repeat(64);

function roadmap(){
  return {
    roblox:{studioExecution:{
      enabled:true,
      required:false,
      requiredForActualVibeInternalPlay:true,
      requiredForInternalRelease:true,
      officialStudioMcpOnly:true,
      localPlaceFileRequired:true,
      onlinePublishedPlaceDirectOpenForbidden:true,
      robloxPlayerAutomationForbidden:true,
      externalGuiAutomationForbidden:true,
      undocumentedStudioCliAutomationForbidden:true,
      studioMcpTransport:'STDIO',
      historicalExactPublishedArtifactAllowedForLocalActualPlay:true,
      runtimeFoundationPassedArtifactAllowedForLocalActualPlay:true,
      earliestBehaviorFeedbackCheckpoint:'AFTER_EXACT_PRIVATE_RUNTIME_CANDIDATE_AND_EXACT_SOURCE_ARTIFACT_BINDING',
      mcpUnavailableRecovery:{automaticResumeAfterPrerequisite:true}
    }},
    developmentLifecycleMachine:{robloxStudioUsage:{
      learningUseForbidden:false,
      forbidden:[
        'ROBLOX_PLAYER_AUTOMATION',
        'PUBLIC_SERVER_BOT_PLAY',
        'PUBLISHED_PLACE_DIRECT_STUDIO_AUTOMATION',
        'UNDOCUMENTED_STUDIO_CLI_AUTOMATION',
        'EXTERNAL_GUI_MACRO_OR_INJECTION'
      ]
    }}
  };
}

function item(){
  return {
    gameId:'g1',
    currentStep:'INTERNAL_PLATFORM_PLAYTEST_AND_DEBUG',
    canonicalState:'INTERNAL_PLATFORM_PLAYTEST_AND_DEBUG',
    robloxSourceCommit:source,
    robloxBuildOrPackagePassed:true,
    robloxBuildSourceRevision:source,
    robloxBuildArtifactIdentity:artifact,
    robloxSharedTargetCurrent:false,
    robloxRuntimeFoundationPassed:false,
    robloxInternalReleasePublished:true,
    robloxInternalReleaseEvidence:{
      published:true,
      sourceRevision:source,
      artifactIdentity:artifact,
      artifactRunId:777,
      universeId:'123',
      placeId:'456',
      versionNumber:9
    },
    robloxRuntimeCandidateEvidence:{
      sourceRevision:source,
      artifactIdentity:artifact,
      artifactRunId:777,
      universeId:'123',
      placeId:'456',
      versionNumber:9,
      published:true,
      authority:'roblox-open-cloud-private-runtime-candidate'
    }
  };
}

function runtime(){
  return {
    authority:'roblox-official-studio-mcp-runtime',
    runtimeVerified:true,
    capabilities:{
      officialStudioMcp:true,
      playMode:true,
      mcpInput:true,
      screenCapture:true,
      consoleCapture:true
    },
    actions:[
      {id:'keyboard-w',type:'mcp-keyboard-input',dispatched:true,ok:true},
      {id:'keyboard-space',type:'mcp-keyboard-input',dispatched:true,ok:true}
    ],
    checkpoints:[
      {id:'official-studio-mcp-connected',required:true,pass:true},
      {id:'play-mode-started',required:true,pass:true},
      {id:'mcp-input-dispatched',required:true,pass:true},
      {id:'viewport-changed-after-input',required:true,pass:true},
      {id:'console-output-captured',required:true,pass:true},
      {id:'no-release-blocking-runtime-errors',required:true,pass:true},
      {id:'play-mode-stopped',required:true,pass:true}
    ],
    errors:[],
    metrics:{consoleErrorCount:0,distinctFrameChange:true},
    rawSourceIncluded:false,
    rawGameplayValuesIncluded:false,
    rawViewportIncluded:false
  };
}

const expected={
  sourceRevision:source,
  artifactIdentity:artifact,
  artifactRunId:777,
  universeId:'123',
  placeId:'456',
  versionNumber:9
};

test('Studio actual-play policy is official MCP only and forbids Player, GUI macro, and undocumented CLI automation',()=>{
  assert.equal(validateLocalStudioPolicy(roadmap()),true);
  for(const key of ['officialStudioMcpOnly','robloxPlayerAutomationForbidden','externalGuiAutomationForbidden','undocumentedStudioCliAutomationForbidden']){
    const bad=structuredClone(roadmap());
    bad.roblox.studioExecution[key]=false;
    assert.throws(()=>validateLocalStudioPolicy(bad),/ROBLOX_STUDIO_MCP_POLICY_MISMATCH/);
  }
});

test('planner selects exact internally released artifact during parallel foundation revalidation even when shared target was later superseded',()=>{
  const candidate=item();
  candidate.currentStep='TARGET_PLATFORM_RUNTIME_FOUNDATION';
  candidate.canonicalState='PRIVATE_RUNTIME_CANDIDATE_DEPLOYED';
  assert.equal(candidate.robloxRuntimeFoundationPassed,false);
  assert.equal(candidate.robloxSharedTargetCurrent,false);
  const result=planLocalStudioCandidates({queue:{items:[candidate]},roadmap:roadmap()});
  assert.equal(result.include.length,1);
  assert.equal(result.include[0].artifactRunId,777);
  assert.equal(result.include[0].historicalExactPublishedArtifact,true);
});

test('planner selects exact private candidate before any external server observation',()=>{
  const candidate=item();
  candidate.robloxInternalReleasePublished=false;
  candidate.robloxInternalReleaseEvidence={};
  candidate.robloxRuntimeFoundationPassed=false;
  candidate.robloxRuntimeFoundationEvidence={};
  const result=planLocalStudioCandidates({queue:{items:[candidate]},roadmap:roadmap()});
  assert.equal(result.include.length,1);
  assert.equal(result.include[0].actualPlayEligibility,'PRIVATE_INTERNAL_CANDIDATE_EXACT');
});

test('exact private candidate persists Studio evidence before runtime foundation',()=>{
  const candidate=item();
  candidate.currentStep='TARGET_PLATFORM_RUNTIME_FOUNDATION';
  candidate.canonicalState='PRE_F9_VALIDATION_CANDIDATE_DEPLOYED';
  candidate.robloxInternalReleasePublished=false;
  candidate.robloxInternalReleaseEvidence={};
  candidate.robloxRuntimeFoundationPassed=false;
  candidate.robloxRuntimeFoundationEvidence={};
  const applied=applyLocalStudioPlayResult({
    queue:{items:[candidate]},gameId:'g1',runtime:runtime(),expected,workflowRunId:100,studioStepSucceeded:true,
    testedAt:'2026-09-28T11:45:00.000Z'
  });
  assert.equal(applied.result.pass,true);
  assert.equal(applied.result.evidence.actualPlayEligibility,'PRIVATE_INTERNAL_CANDIDATE_EXACT');
  assert.equal(applied.result.evidence.currentSourceArtifactBinding,true);
  assert.equal(applied.item.robloxRuntimeFoundationPassed,false);
});

test('planner selects exact runtime-foundation artifact before internal release',()=>{
  const candidate=item();
  candidate.robloxInternalReleasePublished=false;
  candidate.robloxInternalReleaseEvidence={};
  candidate.robloxRuntimeFoundationPassed=true;
  candidate.robloxRuntimeFoundationEvidence={
    runtimeFoundationPassed:true,
    sourceRevision:source,
    artifactIdentity:artifact,
    placeId:'456',
    candidateVersionNumber:9
  };
  const result=planLocalStudioCandidates({queue:{items:[candidate]},roadmap:roadmap()});
  assert.equal(result.include.length,1);
  assert.equal(result.include[0].actualPlayEligibility,'RUNTIME_FOUNDATION_PASS');
});

test('planner admits exact engine version while real server boot is pending without claiming runtime foundation pass',()=>{
  const candidate=item();
  candidate.robloxInternalReleasePublished=false;
  candidate.robloxInternalReleaseEvidence={};
  candidate.robloxRuntimeFoundationPassed=false;
  candidate.robloxRuntimeFoundationEvidence={
    authority:'exact-engine-version-awaiting-real-server-boot',
    sourceRevision:source,
    artifactIdentity:artifact,
    placeId:'456',
    candidateVersionNumber:9,
    engineExecuted:true,
    exactEngineVersion:true,
    serverBootObserved:false
  };
  const result=planLocalStudioCandidates({queue:{items:[candidate]},roadmap:roadmap()});
  assert.equal(result.include.length,1);
  assert.equal(result.include[0].actualPlayEligibility,'EXACT_ENGINE_VERSION_AWAITING_REAL_SERVER_BOOT');
  assert.equal(candidate.robloxRuntimeFoundationPassed,false);
  assert.equal(candidate.robloxInternalReleasePublished,false);
});

test('exact engine preboot candidate persists Studio evidence without fabricating runtime foundation pass',()=>{
  const candidate=item();
  candidate.currentStep='TARGET_PLATFORM_RUNTIME_FOUNDATION';
  candidate.canonicalState='PRIVATE_RUNTIME_CANDIDATE_DEPLOYED';
  candidate.robloxInternalReleasePublished=false;
  candidate.robloxInternalReleaseEvidence={};
  candidate.robloxRuntimeFoundationPassed=false;
  candidate.robloxRuntimePassed=false;
  candidate.robloxRuntimeFoundationEvidence={
    authority:'exact-engine-version-awaiting-real-server-boot',
    sourceRevision:source,
    artifactIdentity:artifact,
    placeId:'456',
    candidateVersionNumber:9,
    engineExecuted:true,
    exactEngineVersion:true,
    serverBootObserved:false
  };
  const applied=applyLocalStudioPlayResult({
    queue:{items:[candidate]},gameId:'g1',runtime:runtime(),expected,workflowRunId:101,studioStepSucceeded:true,
    testedAt:'2026-09-27T05:10:00.000Z'
  });
  assert.equal(applied.result.pass,true);
  assert.equal(applied.result.evidence.actualPlayEligibility,'EXACT_ENGINE_VERSION_AWAITING_REAL_SERVER_BOOT');
  assert.equal(applied.result.evidence.currentSourceArtifactBinding,true);
  assert.equal(applied.item.robloxRuntimeFoundationPassed,false);
  assert.equal(applied.item.robloxRuntimePassed,false);
});

test('Studio evidence maps observed failures into Roblox-native failure classes',()=>{
  const candidate=item();
  const broken=runtime();
  broken.runtimeVerified=false;
  broken.errors=[{type:'runtime-error',signature:'RemoteEvent OnServerEvent validation failed'}];
  broken.checkpoints=broken.checkpoints.map(row=>row.id==='no-release-blocking-runtime-errors'?{...row,pass:false}:row);
  const result=createLocalStudioPlayEvidence({item:candidate,runtime:broken,expected,workflowRunId:99,studioStepSucceeded:false});
  assert.equal(result.pass,false);
  assert.equal(result.evidence.robloxFailureClass,'ROBLOX_REMOTE_EVENT_OR_FUNCTION');
  assert.ok(result.evidence.learningSignals.includes('ROBLOX_REMOTE_EVENT_OR_FUNCTION'));
});

test('planner excludes only explicit disabled games rather than using currentStep as the post-release play authority',()=>{
  const foundation=item();
  foundation.currentStep='TARGET_PLATFORM_RUNTIME_FOUNDATION';
  foundation.canonicalState='PRIVATE_RUNTIME_CANDIDATE_DEPLOYED';
  const finalReview=item();
  finalReview.gameId='g2';
  finalReview.currentStep='ROBLOX_FINAL_REVIEW_REVALIDATION';
  finalReview.robloxRuntimeCandidateEvidence={...finalReview.robloxRuntimeCandidateEvidence,placeId:'457'};
  finalReview.robloxInternalReleaseEvidence={...finalReview.robloxInternalReleaseEvidence,placeId:'457'};
  const disabled=item();
  disabled.gameId='g3';
  disabled.status='DISABLED';
  disabled.robloxRuntimeCandidateEvidence={...disabled.robloxRuntimeCandidateEvidence,placeId:'458'};
  disabled.robloxInternalReleaseEvidence={...disabled.robloxInternalReleaseEvidence,placeId:'458'};
  const result=planLocalStudioCandidates({queue:{items:[foundation,finalReview,disabled]},roadmap:roadmap()});
  assert.deepEqual(result.include.map(row=>row.gameId).sort(),['g1','g2']);
});

test('central contract makes actual play evidence-gated and parallel to foundation revalidation after internal release',()=>{
  const central=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
  const architecture=JSON.parse(fs.readFileSync('company-learning/company-architecture-map.json','utf8'));
  const loop=central.developmentLifecycleMachine?.internalPlatformReleaseAndPublicExposureGate?.internalBuildupLoop||{};
  assert.equal(loop.actualVibePlayEligibility,'EXACT_PRIVATE_RUNTIME_CANDIDATE_PLUS_EXACT_SOURCE_ARTIFACT_BINDING');
  assert.equal(loop.actualVibePlayMayStartAfterRuntimeFoundationPassBeforeInternalRelease,false);
  assert.equal(loop.actualVibePlayMayStartAfterExactPrivateCandidateBeforeRuntimeFoundationPass,true);
  assert.equal(loop.actualVibePlayEligibilityMustNotDependOnExclusiveCurrentStep,true);
  assert.equal(loop.foundationOrFinalRevalidationMayRunParallelWithActualVibePlayAfterInternalRelease,true);
  assert.equal(loop.currentStepMayRepresentParallelRuntimeRevalidationWithoutRevokingInternalReleasePlayEligibility,true);
  assert.equal(loop.explicitDisabledGameRemainsIneligible,true);
  const arch=architecture.releaseExposureLifecycle?.robloxPerpetualInternalBuildup||{};
  assert.equal(arch.actualPlayPlannerEligibility,'EXACT_PRIVATE_RUNTIME_CANDIDATE_PLUS_EXACT_SOURCE_ARTIFACT_BINDING');
  assert.equal(arch.externalServerProbeAutomatic,false);
  assert.equal(arch.externalServerObservationRequiredForInternalDevelopment,false);
  assert.equal(arch.f1ThroughF8SingleStudioSession,true);
  assert.equal(arch.f9RuntimeReplay,false);
  assert.equal(arch.actualPlayPlannerExclusiveCurrentStepGate,false);
  assert.equal(arch.parallelRuntimeFoundationAndFinalRevalidationAllowedAfterInternalRelease,true);
  assert.equal(arch.explicitDisabledGameEligible,false);
});


test('planner skips only an already verified exact Studio MCP play record',()=>{
  const candidate=item();
  candidate.robloxInternalVibePlayEvidence={
    pass:true,
    actualPlay:true,
    officialStudioMcp:true,
    localPlaceFile:true,
    onlinePlaceDirectOpen:false,
    robloxPlayerAutomation:false,
    sourceRevision:source,
    artifactIdentity:artifact,
    artifactRunId:777,
    universeId:'123',
    placeId:'456',
    versionNumber:9,
    testedAt:'2026-09-25T09:00:00.000Z'
  };
  assert.equal(planLocalStudioCandidates({queue:{items:[candidate]},roadmap:roadmap()}).include.length,0);
});

test('planner reuses verified Studio play when local F0 bytes are identical across source metadata revisions',()=>{
  const candidate=item();
  const nextSource='c'.repeat(40);
  candidate.robloxSourceCommit=nextSource;
  candidate.robloxBuildSourceRevision=nextSource;
  candidate.robloxRuntimeCandidateEvidence={};
  candidate.robloxInternalReleasePublished=false;
  candidate.robloxInternalReleaseEvidence={};
  candidate.robloxFoundationF0Passed=true;
  candidate.robloxBuildPreflightPassed=true;
  candidate.robloxFoundationF0Evidence={
    sourceRevision:nextSource,
    artifactIdentity:artifact,
    artifactRunId:888,
  };
  candidate.robloxInternalVibePlayEvidence={
    pass:true,
    actualPlay:true,
    runtimeVerified:true,
    officialStudioMcp:true,
    localPlaceFile:true,
    onlinePlaceDirectOpen:false,
    robloxPlayerAutomation:false,
    sourceRevision:source,
    artifactIdentity:artifact,
    artifactRunId:777,
    universeId:'123',
    placeId:'456',
    versionNumber:9,
    runtimeSummary:{consoleErrorCount:0},
    testedAt:'2026-09-25T09:00:00.000Z'
  };
  assert.equal(planLocalStudioCandidates({queue:{items:[candidate]},roadmap:roadmap()}).include.length,0);
});


test('planner collapses repeated shared Studio MCP infrastructure failures to one rotating canary',()=>{
  const rows=['g1','g2','g3'].map((gameId,index)=>{
    const candidate=item();
    candidate.gameId=gameId;
    candidate.robloxFailureSignature='ROBLOX_STUDIO_MCP_INFRASTRUCTURE_PENDING';
    candidate.robloxInternalVibePlayEvidence={
      version:2,
      gameId,
      pass:false,
      actualPlay:false,
      infrastructureFailure:true,
      failureClass:'STUDIO_MCP_INFRASTRUCTURE_PENDING',
      sourceRevision:source,
      artifactIdentity:artifact,
      artifactRunId:777,
      universeId:'123',
      placeId:'456',
      versionNumber:9,
      testedAt:['2026-09-25T09:02:00.000Z','2026-09-25T09:01:00.000Z','2026-09-25T09:03:00.000Z'][index]
    };
    return candidate;
  });
  const result=planLocalStudioCandidates({queue:{items:rows},roadmap:roadmap()});
  assert.equal(result.sharedInfrastructureCanary,true);
  assert.equal(result.include.length,1);
  assert.equal(result.include[0].gameId,'g2');
  assert.deepEqual(result.deferredInfrastructureGameIds,['g1','g3']);
});

test('explicit game request bypasses shared Studio MCP infrastructure canary collapsing',()=>{
  const rows=['g1','g2'].map(gameId=>{
    const candidate=item();
    candidate.gameId=gameId;
    candidate.robloxFailureSignature='ROBLOX_STUDIO_MCP_INFRASTRUCTURE_PENDING';
    candidate.robloxInternalVibePlayEvidence={
      version:2,
      gameId,
      pass:false,
      actualPlay:false,
      infrastructureFailure:true,
      failureClass:'STUDIO_MCP_INFRASTRUCTURE_PENDING',
      sourceRevision:source,
      artifactIdentity:artifact,
      artifactRunId:777,
      universeId:'123',
      placeId:'456',
      versionNumber:9,
      testedAt:'2026-09-25T09:00:00.000Z'
    };
    return candidate;
  });
  const result=planLocalStudioCandidates({queue:{items:rows},roadmap:roadmap(),requestedGameId:'g2'});
  assert.equal(result.sharedInfrastructureCanary,false);
  assert.equal(result.include.length,1);
  assert.equal(result.include[0].gameId,'g2');
  assert.deepEqual(result.deferredInfrastructureGameIds,[]);
});

test('planner resumes MCP enablement prerequisite with the prior exact published artifact after current build pointers were invalidated',()=>{
  const candidate=item();
  candidate.robloxSourceCommit='c'.repeat(40);
  candidate.robloxBuildOrPackagePassed=false;
  candidate.robloxBuildSourceRevision=null;
  candidate.robloxBuildArtifactIdentity=null;
  candidate.robloxFailureSignature='ROBLOX_BUILD_PACKAGE_REVALIDATION_PENDING';
  candidate.robloxInternalVibePlayEvidence={
    version:2,
    gameId:'g1',
    pass:false,
    actualPlay:false,
    infrastructureFailure:true,
    failureClass:'STUDIO_MCP_INFRASTRUCTURE_PENDING',
    studioMcpServerEnablementRequired:true,
    operatorPrerequisite:'ENABLE_STUDIO_AS_MCP_SERVER_IN_ASSISTANT',
    sourceRevision:source,
    artifactIdentity:artifact,
    artifactRunId:777,
    universeId:'123',
    placeId:'456',
    versionNumber:9,
    testedAt:'2026-09-25T09:00:00.000Z'
  };
  const result=planLocalStudioCandidates({queue:{items:[candidate]},roadmap:roadmap()});
  assert.equal(result.include.length,1);
  assert.equal(result.include[0].sourceRevision,source);
  assert.equal(result.include[0].artifactIdentity,artifact);
  assert.equal(result.include[0].artifactRunId,777);
  assert.equal(result.include[0].infrastructurePrerequisiteReplay,true);
});

test('historical MCP prerequisite replay never overwrites the current rebuild-required source state',()=>{
  const candidate=item();
  candidate.robloxSourceCommit='c'.repeat(40);
  candidate.robloxBuildOrPackagePassed=false;
  candidate.robloxBuildSourceRevision=null;
  candidate.robloxBuildArtifactIdentity=null;
  candidate.currentStep='TARGET_PLATFORM_RUNTIME_FOUNDATION';
  candidate.canonicalState='PRIVATE_RUNTIME_CANDIDATE_DEPLOYED';
  candidate.robloxFailureStage='ROBLOX_BUILD_PACKAGE';
  candidate.robloxFailureSignature='ROBLOX_BUILD_PACKAGE_REVALIDATION_PENDING';
  candidate.routingBlockers=['roblox-build-package-revalidation-pending'];

  const applied=applyLocalStudioPlayResult({
    queue:{items:[candidate]},
    gameId:'g1',
    runtime:runtime(),
    expected,
    workflowRunId:47,
    studioStepSucceeded:true,
    testedAt:'2026-09-25T09:25:00.000Z'
  });

  assert.equal(applied.result.pass,true);
  assert.equal(applied.result.evidence.historicalExactBuildReplay,true);
  assert.equal(applied.result.evidence.currentSourceArtifactBinding,false);
  assert.equal(applied.item.robloxInternalPlaytestPassed,false);
  assert.equal(applied.item.robloxStudioLocalPlayInfrastructurePending,false);
  assert.equal(applied.item.currentStep,'TARGET_PLATFORM_RUNTIME_FOUNDATION');
  assert.equal(applied.item.canonicalState,'PRIVATE_RUNTIME_CANDIDATE_DEPLOYED');
  assert.equal(applied.item.robloxFailureStage,'ROBLOX_BUILD_PACKAGE');
  assert.equal(applied.item.robloxFailureSignature,'ROBLOX_BUILD_PACKAGE_REVALIDATION_PENDING');
  assert.deepEqual(applied.item.routingBlockers,['roblox-build-package-revalidation-pending']);
});

test('verified official Studio MCP pass records actual play without claiming online runtime or public release',()=>{
  const result=createLocalStudioPlayEvidence({
    item:item(),runtime:runtime(),expected,workflowRunId:42,studioStepSucceeded:true,
    testedAt:'2026-09-25T09:00:00.000Z'
  });
  assert.equal(result.pass,true);
  assert.equal(result.evidence.actualPlay,true);
  assert.equal(result.evidence.officialStudioMcp,true);
  assert.equal(result.evidence.localPlaceFile,true);
  assert.equal(result.evidence.onlinePlaceDirectOpen,false);
  assert.equal(result.evidence.robloxPlayerAutomation,false);
  assert.equal(result.evidence.externalGuiAutomation,false);
  assert.equal(result.evidence.undocumentedStudioCliAutomation,false);
  assert.equal(result.evidence.historicalSharedTargetExactArtifact,true);
  assert.equal(result.evidence.historicalExactBuildReplay,false);
  assert.equal(result.evidence.currentSourceArtifactBinding,true);
  assert.equal(result.evidence.currentPublishedRuntimeClaim,false);
  assert.equal(result.evidence.runtimeSummary.distinctFrameChange,true);
  assert.equal(result.evidence.rawSourceIncluded,false);
  assert.equal(result.evidence.rawGameplayValuesIncluded,false);
  assert.equal(result.evidence.rawViewportIncluded,false);
  assert.equal(result.evidence.learningScope,'STRUCTURED_VERIFIED_QA_FACTS_ONLY');
  assert.deepEqual(result.evidence.scenarioCoverage,[]);
  assert.equal(result.evidence.scenarioCoveragePass,false);
});

test('stale exact-artifact binding is rejected before evidence persistence',()=>{
  assert.throws(()=>createLocalStudioPlayEvidence({
    item:item(),runtime:runtime(),expected:{...expected,artifactRunId:776},workflowRunId:42,studioStepSucceeded:true
  }),/ROBLOX_STUDIO_MCP_CANDIDATE_STALE/);
});

test('verified Studio pass clears a stale native failure classification',()=>{
  const candidate=item();
  candidate.robloxNativeFailureClass='ROBLOX_DATASTORE_SAVE_LOAD';
  candidate.robloxFailureStage='VIBE_INTERNAL_PLAY';
  candidate.robloxFailureSignature='ROBLOX_STUDIO_MCP_RUNTIME_ERROR';
  const applied=applyLocalStudioPlayResult({
    queue:{items:[candidate]},gameId:'g1',runtime:runtime(),expected,workflowRunId:42,studioStepSucceeded:true,
    testedAt:'2026-09-25T09:00:00.000Z'
  });
  assert.equal(applied.result.pass,true);
  assert.equal(applied.item.robloxNativeFailureClass,null);
  assert.equal(applied.item.robloxFailureStage,null);
  assert.equal(applied.item.robloxFailureSignature,null);
});

test('verified runtime error routes exact game to repair while infrastructure failure does not fabricate a game bug',()=>{
  const bad=runtime();
  bad.runtimeVerified=false;
  bad.errors=[{type:'studio-console-error',signature:'attempt to index nil'}];
  const repaired=applyLocalStudioPlayResult({
    queue:{items:[item()]},gameId:'g1',runtime:bad,expected,workflowRunId:42,studioStepSucceeded:true,
    testedAt:'2026-09-25T09:00:00.000Z'
  });
  assert.equal(repaired.result.pass,false);
  assert.equal(repaired.result.evidence.learningReusable,true);
  assert.equal(repaired.result.evidence.failureClass,'STUDIO_MCP_RUNTIME_ERROR');
  assert.equal(repaired.item.canonicalState,'REPAIR_REQUIRED');
  assert.equal(repaired.item.robloxFailureSignature,'ROBLOX_STUDIO_MCP_RUNTIME_ERROR');

  const infra=runtime();
  infra.runtimeVerified=false;
  infra.capabilities={officialStudioMcp:false,playMode:false,mcpInput:false,screenCapture:false,consoleCapture:false};
  infra.actions=[];
  infra.checkpoints=[];
  infra.metrics.distinctFrameChange=false;
  infra.errors=[{type:'studio-mcp-infrastructure-or-runtime-error',signature:'MCP_RUN_DID_NOT_PRODUCE_EVIDENCE'}];
  const pending=applyLocalStudioPlayResult({
    queue:{items:[item()]},gameId:'g1',runtime:infra,expected,workflowRunId:43,studioStepSucceeded:false,
    testedAt:'2026-09-25T09:05:00.000Z'
  });
  assert.equal(pending.result.evidence.infrastructureFailure,true);
  assert.equal(pending.item.canonicalState,'INTERNAL_PLATFORM_PLAYTEST_AND_DEBUG');
  assert.equal(pending.item.robloxFailureSignature,'ROBLOX_STUDIO_MCP_INFRASTRUCTURE_PENDING');
  assert.deepEqual(pending.item.routingBlockers,['roblox-studio-mcp-infrastructure-pending']);
});


test('empty official Studio MCP tool inventory is persisted as an explicit one-time enablement prerequisite',()=>{
  const infra=runtime();
  infra.runtimeVerified=false;
  infra.capabilities={officialStudioMcp:false,playMode:false,mcpInput:false,screenCapture:false,consoleCapture:false};
  infra.actions=[];
  infra.checkpoints=[];
  infra.metrics.distinctFrameChange=false;
  infra.errors=[{
    type:'studio-mcp-infrastructure-or-runtime-error',
    signature:'ROBLOX_STUDIO_MCP_REQUIRED_TOOLS_NOT_READY:missing=list_roblox_studios:available=:protocol=2024-11-05:server=RobloxStudio:stderrHint=MCP_SERVER_NOT_ENABLED'
  }];
  const result=createLocalStudioPlayEvidence({
    item:item(),runtime:infra,expected,workflowRunId:44,studioStepSucceeded:false,
    testedAt:'2026-09-25T09:10:00.000Z'
  });
  assert.equal(result.pass,false);
  assert.equal(result.evidence.infrastructureFailure,true);
  assert.equal(result.evidence.studioMcpServerEnablementRequired,true);
  assert.equal(result.evidence.operatorPrerequisite,'ENABLE_STUDIO_AS_MCP_SERVER_IN_ASSISTANT');
  assert.equal(result.evidence.learningReusable,false);
});

test('Studio tool provider timeout stays infrastructure-pending without falsely requiring the MCP setting toggle',()=>{
  const infra=runtime();
  infra.runtimeVerified=false;
  infra.capabilities={officialStudioMcp:false,playMode:false,mcpInput:false,screenCapture:false,consoleCapture:false};
  infra.actions=[];
  infra.checkpoints=[];
  infra.metrics.distinctFrameChange=false;
  infra.errors=[{
    type:'studio-mcp-infrastructure-or-runtime-error',
    signature:'ROBLOX_STUDIO_MCP_REQUIRED_TOOLS_NOT_READY:missing=list_roblox_studios:available=:protocol=2024-11-05:server=RobloxStudio:stderrHint=STUDIO_TOOL_PROVIDER_TIMEOUT'
  }];
  const result=createLocalStudioPlayEvidence({
    item:item(),runtime:infra,expected,workflowRunId:45,studioStepSucceeded:false,
    testedAt:'2026-09-25T09:15:00.000Z'
  });
  assert.equal(result.evidence.infrastructureFailure,true);
  assert.equal(result.evidence.studioMcpServerEnablementRequired,false);
  assert.equal(result.evidence.operatorPrerequisite,null);
  assert.equal(result.evidence.failureClass,'STUDIO_MCP_INFRASTRUCTURE_PENDING');
});

test('tool-provider timeout with empty Assistant settings after Assistant readiness becomes the explicit MCP enablement prerequisite',()=>{
  const infra=runtime();
  infra.runtimeVerified=false;
  infra.capabilities={officialStudioMcp:false,playMode:false,mcpInput:false,screenCapture:false,consoleCapture:false};
  infra.actions=[];
  infra.checkpoints=[];
  infra.metrics.distinctFrameChange=false;
  infra.errors=[{
    type:'studio-mcp-infrastructure-or-runtime-error',
    signature:'ROBLOX_STUDIO_MCP_REQUIRED_TOOLS_NOT_READY:missing=list_roblox_studios:available=:protocol=2024-11-05:server=RobloxStudio:stderrHint=STUDIO_TOOL_PROVIDER_TIMEOUT:settingHint=ASSISTANT_SETTINGS_EMPTY_AFTER_ASSISTANT_READY'
  }];
  const result=createLocalStudioPlayEvidence({
    item:item(),runtime:infra,expected,workflowRunId:46,studioStepSucceeded:false,
    testedAt:'2026-09-25T09:20:00.000Z'
  });
  assert.equal(result.evidence.infrastructureFailure,true);
  assert.equal(result.evidence.studioMcpServerEnablementRequired,true);
  assert.equal(result.evidence.operatorPrerequisite,'ENABLE_STUDIO_AS_MCP_SERVER_IN_ASSISTANT');
  assert.equal(result.evidence.learningReusable,false);
});

test('runtime workflow uses exact local artifact plus official Studio MCP and no Player or undocumented Studio CLI automation',()=>{
  const studioMcpBlock=workflow.slice(workflow.indexOf('\n  studio-mcp-auto-play:'));
  assert.match(studioMcpBlock,/studio-mcp-auto-play:/);
  assert.match(studioMcpBlock,/runs-on: \[self-hosted, Windows, X64, roblox-studio-authenticated\]/);
  assert.match(studioMcpBlock,/development-roblox-package-\$\{\{ matrix\.gameId \}\}/);
  assert.match(studioMcpBlock,/run-id: \$\{\{ matrix\.artifactRunId \}\}/);
  assert.match(studioMcpBlock,/id: artifact_download/);
  assert.match(studioMcpBlock,/continue-on-error: true/);
  assert.match(studioMcpBlock,/Rebuild byte-identical exact artifact when GitHub artifact API is unavailable/);
  assert.match(studioMcpBlock,/steps\.artifact_download\.outcome != 'success'/);
  assert.match(studioMcpBlock,/rojo-7\.7\.0-windows-x86_64\.zip/);
  assert.match(studioMcpBlock,/2179c44862a10ecbd725bdfeb4abc64e16dc4aad9b6c8f3e1a7c46a87280b949/);
  assert.match(studioMcpBlock,/company-development-roblox-package\.mjs/);
  assert.match(studioMcpBlock,/Studio MCP exact rebuild identity mismatch/);
  assert.match(studioMcpBlock,/ROBLOX_STUDIO_MCP_ARTIFACT_SOURCE=DETERMINISTIC_EXACT_HASH_MATCH/);
  assert.match(studioMcpBlock,/Roblox\\mcp\.bat/);
  assert.match(studioMcpBlock,/StudioMCP\.exe/);
  assert.match(studioMcpBlock,/ROBLOX_DOCUMENTED_MCP_BATCH/);
  assert.match(studioMcpBlock,/OFFICIAL_STUDIOMCP_EXE_FALLBACK_BATCH_MISSING/);
  assert.match(studioMcpBlock,/OFFICIAL_STUDIOMCP_EXE_FALLBACK_BROKEN_DOCUMENTED_BATCH/);
  assert.match(studioMcpBlock,/knownBrokenBatch/);
  assert.match(studioMcpBlock,/batchText = Get-Content \$mcpBat -Raw -ErrorAction SilentlyContinue/);
  assert.match(studioMcpBlock,/ROBLOX_STUDIO_MCP_BATCH_HEALTH=/);
  assert.match(studioMcpBlock,/ROBLOX_STUDIO_MCP_BATCH_REWRITE=NO/);
  assert.match(studioMcpBlock,/ROBLOX_STUDIO_MCP_THIRD_PARTY_BRIDGE=NO/);
  assert.match(studioMcpBlock,/ROBLOX_STUDIO_MCP_POLICY=PASS/);
  assert.match(studioMcpBlock,/JSON\.parse\(fs\.readFileSync\('main\/company-learning\/platform-release-roadmap\.json'/);
  assert.doesNotMatch(studioMcpBlock,/platform-release-roadmap\.json' -Raw \| ConvertFrom-Json/);
  assert.match(studioMcpBlock,/--mode=mcp-run/);
  assert.match(studioMcpBlock,/Local Place SHA256 mismatch/);
  assert.match(studioMcpBlock,/Start-Process -FilePath \$env:VIBE2_ROBLOX_STUDIO_PATH/);
  assert.doesNotMatch(studioMcpBlock,/RobloxPlayerBeta|RobloxPlayerLauncher|roblox:\/\//i);
  assert.doesNotMatch(studioMcpBlock,/vibe2-roblox-studio-cli-runner|--task\s+RunScript|--runScriptFile/);
  assert.doesNotMatch(studioMcpBlock,/Get-Content 'C:\\\\actions-runner\\\\\.runner'|ConvertFrom-Json.*runnerMetadata/);
  assert.doesNotMatch(studioMcpBlock,/Get-Content 'runtime\/development-queue\.json' -Raw \| ConvertFrom-Json/);
  assert.match(studioMcpBlock,/JSON\.parse\(fs\.readFileSync\('runtime\/development-queue\.json','utf8'\)\)/);
  assert.doesNotMatch(studioMcpBlock,/--mode=mcp-run[\s\S]{0,500}(--place-id=|--universe-id=)/);
});

test('Studio inventory parser accepts current id and studio instance id response fields',()=>{
  const current=collectStudios({
    content:[{
      type:'text',
      text:JSON.stringify({studios:[
        {id:'studio-current-1',name:'daechung-rpg',place_id:null},
        {studio_instance_id:'studio-current-2',name:'other-place',place_id:'123'}
      ]})
    }]
  });
  assert.deepEqual(current,[
    {studioId:'studio-current-1',name:'daechung-rpg',placeId:''},
    {studioId:'studio-current-2',name:'other-place',placeId:'123'}
  ]);

  const legacy=collectStudios({studios:[{studio_id:'studio-legacy',name:'legacy',place_id:''}]});
  assert.deepEqual(legacy,[{studioId:'studio-legacy',name:'legacy',placeId:''}]);
});

test('Studio console classification blocks errors and critical boot warnings while keeping ordinary warnings non-blocking',()=>{
  const warningOnly={
    content:[{
      type:'text',
      text:[
        JSON.stringify({message:'Infinite yield possible on ReplicatedStorage:WaitForChild("X")',messageType:2,timestamp:1}),
        JSON.stringify({message:'Stack Begin',messageType:0,timestamp:2}),
        JSON.stringify({message:'Stack End',messageType:0,timestamp:3})
      ].join('\n')
    }]
  };
  const warningResult=classifyStudioConsoleOutput(warningOnly);
  assert.equal(warningResult.errors.length,0);
  assert.equal(warningResult.warningCount,1);
  assert.equal(warningResult.structuredEntryCount,3);

  const gameActionYield={
    content:[{
      type:'text',
      text:JSON.stringify({message:'Infinite yield possible on ReplicatedStorage:WaitForChild("GameAction")',messageType:2,timestamp:4})
    }]
  };
  const gameActionYieldResult=classifyStudioConsoleOutput(gameActionYield);
  assert.equal(gameActionYieldResult.errors.length,1);
  assert.match(gameActionYieldResult.errors[0].signature,/GameAction/);
  assert.equal(gameActionYieldResult.warningCount,1);

  const dataStoreBootError={
    content:[{
      type:'text',
      text:JSON.stringify({message:'DataStoreService: StudioAccessToApisNotAllowed: Studio access to APIs is not allowed. API: GetAsync',messageType:3,timestamp:5})
    }]
  };
  const dataStoreBootResult=classifyStudioConsoleOutput(dataStoreBootError);
  assert.equal(dataStoreBootResult.errors.length,1);
  assert.match(dataStoreBootResult.errors[0].signature,/DataStoreService/);
  assert.equal(dataStoreBootResult.warningCount,0);

  const localUnpublishedDataStoreCascade={
    content:[{
      type:'text',
      text:[
        JSON.stringify({message:'You must publish this place to the web to access DataStore.',messageType:3,timestamp:5.1}),
        JSON.stringify({message:'Infinite yield possible on ReplicatedStorage:WaitForChild("GameAction")',messageType:2,timestamp:5.2})
      ].join('\n')
    }]
  };
  const localUnpublishedDataStoreResult=classifyStudioConsoleOutput(localUnpublishedDataStoreCascade);
  assert.equal(localUnpublishedDataStoreResult.errors.length,0);
  assert.equal(localUnpublishedDataStoreResult.warningCount,1);
  assert.equal(localUnpublishedDataStoreResult.localUnpublishedDataStoreSuppressed,true);

  const realError={
    content:[{
      type:'text',
      text:JSON.stringify({message:'Game.server.luau:42: attempt to index nil with Health',messageType:3,timestamp:6})
    }]
  };
  const errorResult=classifyStudioConsoleOutput(realError);
  assert.equal(errorResult.errors.length,1);
  assert.match(errorResult.errors[0].signature,/attempt to index nil/i);
  assert.equal(errorResult.warningCount,0);

  const unknownStrong={
    content:[{type:'text',text:JSON.stringify({message:'Script Runtime Error: unhandled exception',messageType:null})}]
  };
  const unknownResult=classifyStudioConsoleOutput(unknownStrong);
  assert.equal(unknownResult.errors.length,1);
  assert.equal(unknownResult.errors[0].signature,'Script Runtime Error: unhandled exception');

  const unknownGameActionYield={
    content:[{type:'text',text:JSON.stringify({message:'Infinite yield possible on ReplicatedStorage:WaitForChild("GameAction")',messageType:null})}]
  };
  assert.equal(classifyStudioConsoleOutput(unknownGameActionYield).errors.length,1);
});

test('Studio console parser accepts line-delimited structured console output',()=>{
  const entries=collectStudioConsoleEntries({
    content:[{type:'text',text:'{"message":"hello","messageType":0}\n{"message":"warn","messageType":"MessageWarning"}'}]
  });
  assert.deepEqual(entries.map(row=>({message:row.message,messageType:row.messageType})),[
    {message:'hello',messageType:0},
    {message:'warn',messageType:2}
  ]);
});

test('Studio MCP CLI persists completed-session runtime failures without returning an infrastructure exit',()=>{
  assert.match(helper,/ROBLOX_STUDIO_MCP_CHECKPOINTS=/);
  assert.match(helper,/ROBLOX_STUDIO_MCP_ACTIONS=/);
  assert.match(helper,/ROBLOX_STUDIO_MCP_VIEWPORT_BEFORE_FRAMES=/);
  assert.match(helper,/ROBLOX_STUDIO_MCP_VIEWPORT_AFTER_FRAMES=/);
  assert.match(helper,/ROBLOX_STUDIO_MCP_VIEWPORT_CHANGED=/);
  assert.match(helper,/ROBLOX_STUDIO_MCP_CONSOLE_ERROR_COUNT=/);
  assert.match(helper,/ROBLOX_STUDIO_MCP_CONSOLE_DIAGNOSTIC=/);
  assert.match(helper,/ROBLOX_STUDIO_MCP_CONSOLE_STRUCTURED_ENTRY_COUNT=/);
  assert.match(helper,/ROBLOX_STUDIO_MCP_CONSOLE_WARNING_COUNT=/);
  assert.doesNotMatch(helper,/const errorPatterns=\[[\s\S]{0,250}Stack Begin/);
  assert.match(helper,/for\(let offset=-2;offset<=4;offset\+\+\)/);
  assert.match(helper,/\.slice\(0,700\)/);
  assert.match(helper,/ROBLOX_STUDIO_MCP_SESSION_COMPLETED=YES/);
  assert.match(helper,/ROBLOX_STUDIO_MCP_RUNTIME_FAILURE_PERSIST_REQUIRED=YES/);
  assert.match(helper,/ROBLOX_STUDIO_MCP_RUNTIME_FAILURE_SUMMARY:failed=/);
  assert.match(helper,/if\(!result\.runtimeVerified\)\{/);
  assert.doesNotMatch(helper,/ROBLOX_STUDIO_MCP_RUNTIME_NOT_VERIFIED:failed=/);
});

test('Studio MCP client negotiates Roblox protocol and waits for the official tool inventory to become ready',()=>{
  assert.match(helper,/protocolVersion:'2024-11-05'/);
  assert.match(helper,/async waitForTools\(requiredNames=\[\],\{attempts=24,delayMs=1500\}=\{\}\)/);
  assert.match(helper,/await client\.waitForTools\(requiredTools,\{/);
  assert.match(helper,/const requiredTools=\['list_roblox_studios','get_studio_state','start_stop_play','get_console_output','screen_capture','user_keyboard_input','user_mouse_input','character_navigation','execute_luau'\];/);
  assert.match(helper,/attempts:Math\.max\(1,Number\(toolAttempts\)\|\|5\)/);
  assert.match(helper,/delayMs:Math\.max\(100,Number\(toolDelayMs\)\|\|1000\)/);
  assert.match(helper,/ROBLOX_STUDIO_MCP_TOOLS_WAIT=/);
  assert.match(helper,/ROBLOX_STUDIO_MCP_REQUIRED_TOOLS_NOT_READY:missing=/);
  assert.match(helper,/:available=/);
  assert.match(helper,/ROBLOX_STUDIO_MCP_STDERR_HINT=/);
  assert.match(helper,/ROBLOX_STUDIO_MCP_STDERR_REDACTED=/);
  assert.match(helper,/stderrHint=/);
  assert.match(helper,/STUDIO_TOOL_PROVIDER_TIMEOUT/);
  assert.match(helper,/ASSISTANT_SETTINGS_EMPTY_AFTER_ASSISTANT_READY/);
  assert.match(helper,/settingState:clean\(a\['setting-state'\]\)/);
  assert.match(helper,/settingCandidatePathCount:Number\(a\['setting-candidate-path-count'\]\?\?-1\)/);
  assert.match(helper,/timed out waiting for tools to become available/);
  assert.match(helper,/NO_ACTIVE_STUDIO/);
  assert.match(helper,/MCP_SERVER_NOT_ENABLED/);
  assert.match(helper,/STUDIO_PROXY_CONNECTION/);
});

test('Studio MCP waits for a connected Studio after tool inventory becomes ready',()=>{
  assert.match(helper,/const studioAttachAttempts=20/);
  assert.match(helper,/ROBLOX_STUDIO_MCP_STUDIO_ATTACH_WAIT=/);
  assert.match(helper,/ROBLOX_STUDIO_MCP_STUDIO_LIST_RESPONSE=/);
  assert.match(helper,/flattenText\(studioListResult,\[\]\)\.join\(' \| '\)/);
  assert.match(helper,/connected='\+unique\.length/);
  assert.match(helper,/if\(attempt<studioAttachAttempts\)await wait\(1000\)/);
  assert.match(helper,/ROBLOX_STUDIO_MCP_NO_STUDIO_AFTER_ATTACH_WAIT/);
  const toolsReadyAt=helper.indexOf("await client.waitForTools(requiredTools");
  const attachWaitAt=helper.indexOf("const studioAttachAttempts=20");
  const stateReadAt=helper.indexOf("const stateTool=client.tool('get_studio_state')");
  assert.ok(toolsReadyAt>0);
  assert.ok(attachWaitAt>toolsReadyAt);
  assert.ok(stateReadAt>attachWaitAt);
});

test('Windows Studio MCP transport keeps documented batch launch and supports installed official binary fallback',()=>{
  assert.match(helper,/process\.platform==='win32'&&\/\\\.exe\$\/i\.test\(resolved\)\)return\{command:resolved,args:\[\]\}/);
  assert.match(helper,/process\.platform==='win32'\)return\{command:'cmd\.exe',args:\['\/c',resolved\]\}/);
  assert.doesNotMatch(helper,/args:\['\/d','\/s','\/c',resolved\]/);
  assert.match(helper,/this\.stderrTail=\(this\.stderrTail\+value\)\.slice\(-6000\)/);
  assert.match(helper,/stderr=\$\{detail\}/);
});

test('Windows workflow uses documented mcp.bat only when its installed text is healthy and otherwise uses official StudioMCP.exe',()=>{
  const studioMcpBlock=workflow.slice(workflow.indexOf('\n  studio-mcp-auto-play:'));
  const batCheck=studioMcpBlock.indexOf("if (Test-Path $mcpBat)");
  const healthCheck=studioMcpBlock.indexOf('$knownBrokenBatch =');
  const brokenFallback=studioMcpBlock.indexOf("OFFICIAL_STUDIOMCP_EXE_FALLBACK_BROKEN_DOCUMENTED_BATCH");
  const documented=studioMcpBlock.indexOf("$mcpLaunchKind = 'ROBLOX_DOCUMENTED_MCP_BATCH'");
  assert.ok(batCheck>0);
  assert.ok(healthCheck>batCheck);
  assert.ok(brokenFallback>healthCheck);
  assert.ok(documented>brokenFallback);
  assert.match(studioMcpBlock,/%B\[\/\\\\\]\\\.\\\.\[\/\\\\\]StudioMCP\\\.exe/);
  assert.match(studioMcpBlock,/\$mcpBatchHealth = 'BROKEN_USE_OFFICIAL_EXE'/);
  assert.match(studioMcpBlock,/ROBLOX_STUDIO_MCP_BATCH_HEALTH=\$mcpBatchHealth/);
  assert.match(studioMcpBlock,/ROBLOX_STUDIO_MCP_BATCH_REWRITE=NO/);
  assert.match(studioMcpBlock,/ROBLOX_STUDIO_MCP_OTHER_PROCESS_PRESERVED=YES/);
});


test('workflow retries only with the installed official StudioMCP binary and classifies empty tools after a restarted Studio session',()=>{
  const studioMcpBlock=workflow.slice(workflow.indexOf('\n  studio-mcp-auto-play:'));
  assert.match(studioMcpBlock,/VIBE2_ROBLOX_STUDIO_MCP_FALLBACK_COMMAND/);
  assert.match(studioMcpBlock,/ROBLOX_STUDIO_MCP_TRANSPORT_FALLBACK=OFFICIAL_STUDIOMCP_EXE/);
  assert.match(studioMcpBlock,/\$attempt -gt 1 -and \$env:VIBE2_ROBLOX_STUDIO_MCP_FALLBACK_COMMAND/);
  assert.match(studioMcpBlock,/if \(\$attempt -gt 1 -and \$env:VIBE2_ROBLOX_STUDIO_MCP_FALLBACK_COMMAND\) \{[\s\S]{0,300}\$mcpCommandForAttempt = \$env:VIBE2_ROBLOX_STUDIO_MCP_FALLBACK_COMMAND/);
  assert.match(studioMcpBlock,/ROBLOX_STUDIO_MCP_REQUIRED_TOOLS_NOT_READY/);
  assert.match(studioMcpBlock,/available=:/);
  assert.match(studioMcpBlock,/ROBLOX_STUDIO_MCP_PREREQUISITE=ENABLE_STUDIO_AS_MCP_SERVER_IN_ASSISTANT/);
  assert.match(studioMcpBlock,/ROBLOX_STUDIO_MCP_AUTOMATIC_SETTING_MUTATION=NO/);
  assert.match(studioMcpBlock,/stderrHint=STUDIO_TOOL_PROVIDER_TIMEOUT/);
  assert.match(studioMcpBlock,/stderrHint=MCP_SERVER_NOT_ENABLED/);
  assert.match(studioMcpBlock,/ROBLOX_STUDIO_MCP_TOOL_PROVIDER_TIMEOUT=attempt=/);
  assert.match(studioMcpBlock,/tool provider timed out after 3 clean Studio sessions/);
  assert.match(studioMcpBlock,/ROBLOX_STUDIO_MCP_STUDIO_LOG_MATCH_COUNT=/);
  assert.match(studioMcpBlock,/ROBLOX_STUDIO_MCP_STUDIO_ATTACHMENT_PENDING=attempt=/);
  assert.match(studioMcpBlock,/\$studioAttachmentFailureObserved = \$true/);
  assert.match(studioMcpBlock,/RBX_STUDIO_NS\|named pipe\|connection\|connected client/);
  assert.match(studioMcpBlock,/client connected but Studio instance registration remained empty/);
  assert.doesNotMatch(studioMcpBlock,/ROBLOX_PLAYER_AUTOMATION=YES/);
  assert.match(studioMcpBlock,/WaitForInputIdle\(30000\)/);
  assert.match(studioMcpBlock,/ROBLOX_STUDIO_GUI_READY=YES/);
  assert.match(studioMcpBlock,/ROBLOX_STUDIO_MCP_RELAUNCH_GUI_READY=YES/);
});

test('Studio MCP retries only infrastructure failures and skips restart after a healthy session reports game runtime failure',()=>{
  const studioMcpBlock=workflow.slice(workflow.indexOf('\n  studio-mcp-auto-play:'));
  assert.match(studioMcpBlock,/\$sessionCompleted = \$false/);
  assert.match(studioMcpBlock,/\$runtimeVerified = \$false/);
  assert.match(studioMcpBlock,/ROBLOX_STUDIO_MCP_SESSION_COMPLETED=YES:attempt=/);
  assert.match(studioMcpBlock,/ROBLOX_STUDIO_MCP_RUNTIME_VERIFIED=\$runtimeState/);
  assert.match(studioMcpBlock,/if \(-not \$sessionCompleted\) \{/);
  assert.match(studioMcpBlock,/ROBLOX_STUDIO_MCP_ACTUAL_PLAY=RUNTIME_FAIL/);
  assert.match(studioMcpBlock,/ROBLOX_STUDIO_MCP_RUNTIME_FAILURE_RETRY=SKIPPED_SESSION_HEALTHY/);
  assert.doesNotMatch(studioMcpBlock,/\$success = \$false/);
});

test('local exact Studio boot does not abort before remotes when DataStore is unavailable',()=>{
  for(const source of [horrorServer,cozyServer]){
    assert.doesNotMatch(source,/local store=DSS:GetDataStore/);
    assert.doesNotMatch(source,/local qaCaptureStore=DSS:GetDataStore/);
    assert.doesNotMatch(source,/local foundationStore=DSS:GetDataStore/);
    assert.match(source,/local store\s*\n\s*pcall\(function\(\)store=DSS:GetDataStore/);
    assert.match(source,/local qaCaptureStore\s*\n\s*pcall\(function\(\)qaCaptureStore=DSS:GetDataStore/);
    assert.match(source,/local foundationStore\s*\n\s*pcall\(function\(\)foundationStore=DSS:GetDataStore/);
  }
});

test('Studio MCP opens the exact local Place as the single Studio before MCP and preserves exact-first retries',()=>{
  const studioMcpBlock=workflow.slice(workflow.indexOf('\n  studio-mcp-auto-play:'));
  const bindBlock=studioMcpBlock.slice(
    studioMcpBlock.indexOf('      - name: Bind and open exact local Place artifact'),
    studioMcpBlock.indexOf('      - name: Run actual local play through official Studio MCP')
  );
  assert.match(bindBlock,/\$placeLaunchProcess = Start-Process -FilePath \$env:VIBE2_ROBLOX_STUDIO_PATH -ArgumentList @\(\$places\[0\]\.FullName\) -PassThru/);
  assert.doesNotMatch(bindBlock,/\$warmStudioProcess\s*=\s*Start-Process/);
  assert.match(bindBlock,/ROBLOX_STUDIO_MCP_EXACT_ASSISTANT_LOG_READY=YES/);
  assert.match(bindBlock,/ROBLOX_STUDIO_MCP_EXACT_ASSISTANT_LOG_READY=UNKNOWN_CONTINUE_OFFICIAL_HANDSHAKE/);
  assert.match(bindBlock,/ROBLOX_STUDIO_MCP_ASSISTANT_LOG_GATE=ADVISORY_ONLY/);
  assert.match(bindBlock,/ROBLOX_STUDIO_MCP_SINGLE_EXACT_STUDIO=YES/);
  assert.match(bindBlock,/ROBLOX_STUDIO_MCP_PRE_MCP_RELAUNCH=YES/);
  assert.match(bindBlock,/ROBLOX_STUDIO_MCP_PRE_MCP_PROCESS_READY_COUNT=/);
  assert.match(bindBlock,/without provable ownership; preserve all other Studio windows/);
  assert.match(bindBlock,/for \(\$processProbe = 1; \$processProbe -le 12; \$processProbe\+\+\)/);
  assert.doesNotMatch(bindBlock,/Roblox Studio exited before exact local Place MCP probe/);
  assert.match(bindBlock,/AssistantVersion:\|Running plugin sabuiltin_Assistant\\\.rbxm/);
  assert.doesNotMatch(bindBlock,/Roblox Studio Assistant did not finish loading in exact local Place/);
  assert.match(bindBlock,/VIBE2_STUDIO_PROCESS_IDS=/);
  assert.match(bindBlock,/ROBLOX_STUDIO_MCP_OWNED_PROCESS_IDS=/);

  assert.match(studioMcpBlock,/ROBLOX_STUDIO_MCP_RETRY_EXACT_PLACE_PROCESS_ID=/);
  assert.match(studioMcpBlock,/ROBLOX_STUDIO_MCP_RETRY_EXACT_ASSISTANT_LOG_READY=YES/);
  assert.match(studioMcpBlock,/ROBLOX_STUDIO_MCP_RETRY_EXACT_ASSISTANT_LOG_READY=UNKNOWN_CONTINUE_OFFICIAL_HANDSHAKE/);
  assert.match(studioMcpBlock,/ROBLOX_STUDIO_MCP_RETRY_ASSISTANT_LOG_GATE=ADVISORY_ONLY/);
  assert.match(studioMcpBlock,/ROBLOX_STUDIO_MCP_RETRY_SINGLE_EXACT_STUDIO=YES/);
  assert.match(studioMcpBlock,/ROBLOX_STUDIO_MCP_RETRY_PROCESS_NOT_READY=/);
  assert.match(studioMcpBlock,/without provable ownership; preserve other Studio windows/);
  assert.doesNotMatch(studioMcpBlock,/Roblox Studio exited before MCP recovery Place probe/);
  assert.match(studioMcpBlock,/ROBLOX_STUDIO_MCP_RETRY_OTHER_PROCESS_PRESERVED=YES/);
  assert.match(studioMcpBlock,/foreach \(\$ownedId in \$ownedIds\)/);
  assert.doesNotMatch(studioMcpBlock,/AutoHotkey|pyautogui|SendKeys|mouse_event|keybd_event/i);
});

test('Assistant log readiness is advisory and official required-tool handshake remains authoritative',()=>{
  const studioMcpBlock=workflow.slice(workflow.indexOf('\n  studio-mcp-auto-play:'));
  const bindBlock=studioMcpBlock.slice(
    studioMcpBlock.indexOf('      - name: Bind and open exact local Place artifact'),
    studioMcpBlock.indexOf('      - name: Run actual local play through official Studio MCP')
  );
  assert.match(bindBlock,/for \(\$probe = 1; \$probe -le 8; \$probe\+\+\)/);
  assert.match(bindBlock,/UNKNOWN_CONTINUE_OFFICIAL_HANDSHAKE/);
  assert.match(bindBlock,/ASSISTANT_LOG_GATE=ADVISORY_ONLY/);
  assert.doesNotMatch(bindBlock,/throw 'Roblox Studio Assistant did not finish loading/);
  assert.match(studioMcpBlock,/ROBLOX_STUDIO_MCP_ENABLEMENT_AUTHORITY=OFFICIAL_REQUIRED_TOOL_HANDSHAKE/);
  assert.match(studioMcpBlock,/--tool-attempts=5/);
});

test('Studio MCP planner stays independent from hosted foundation capacity while accepting foundation-pass artifacts',()=>{
  const central=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
  const architecture=JSON.parse(fs.readFileSync('company-learning/company-architecture-map.json','utf8'));
  const studioPlanBlock=workflow.slice(workflow.indexOf('\n  studio-local-plan:'),workflow.indexOf('\n  studio-mcp-auto-play:'));
  assert.match(studioPlanBlock,/runs-on: ubuntu-slim/);
  assert.match(studioPlanBlock,/shell: bash/);
  assert.match(studioPlanBlock,/ROBLOX_STUDIO_MCP_PLAN_RUNNER=UBUNTU_SLIM/);
  assert.doesNotMatch(studioPlanBlock,/needs: runtime-foundation-qa/);
  assert.doesNotMatch(studioPlanBlock,/needs\.runtime-foundation-qa/);
  assert.doesNotMatch(studioPlanBlock,/needs: dedupe/);
  assert.doesNotMatch(studioPlanBlock,/needs\.dedupe/);
  assert.doesNotMatch(studioPlanBlock,/if:\s*needs\.dedupe\.outputs\.run/);
  assert.equal(central.robloxNativeCodingQualityContract.actualPlayFeedback.portfolioWideFoundationJobWaitForbidden,true);
  assert.equal(architecture.robloxNativeCodingQualityTopology.studioPlannerDependsOnPortfolioFoundationJob,false);
  assert.match(workflow,/studio-mcp-auto-play:[\s\S]*needs: studio-local-plan[\s\S]*if: always\(\) && needs\.studio-local-plan\.result == 'success' && needs\.studio-local-plan\.outputs\.count != '0'/);
  assert.match(workflow,/event_type = 'vibe2-fanin-refill'/);
  assert.match(workflow,/reason = 'roblox-official-studio-mcp-actual-play'/);
});


test('Studio MCP failure evidence path is exported before the MCP process can fail',()=>{
  const studioMcpBlock=workflow.slice(workflow.indexOf('\n  studio-mcp-auto-play:'));
  const exportAt=studioMcpBlock.indexOf('"VIBE2_STUDIO_RUNTIME_RESULT=$result"');
  const runAt=studioMcpBlock.indexOf("& node 'main/tools/company-development-roblox-studio-local-play.mjs' @runnerArgs");
  assert.ok(exportAt>0);
  assert.ok(runAt>exportAt);
  assert.match(studioMcpBlock,/ROBLOX_STUDIO_MCP_FAILURE_EVIDENCE_PRESERVED=/);
});


test('pre-MCP infrastructure failures preserve the last real MCP evidence instead of fabricating a runtime result',()=>{
  const studioMcpBlock=workflow.slice(workflow.indexOf('\n  studio-mcp-auto-play:'));
  const persistBlock=studioMcpBlock.slice(studioMcpBlock.indexOf('      - name: Persist exact Studio MCP play evidence'));
  assert.match(persistBlock,/ROBLOX_STUDIO_MCP_EVIDENCE_PERSIST=SKIPPED_NO_MCP_RUNTIME_EVIDENCE/);
  assert.match(persistBlock,/ROBLOX_STUDIO_MCP_EXISTING_EVIDENCE_PRESERVED=YES/);
  assert.doesNotMatch(persistBlock,/MCP_RUN_DID_NOT_PRODUCE_EVIDENCE/);
});

test('Studio MCP diagnostics expose installed version and available tool inventory on contract mismatch',()=>{
  const studioMcpBlock=workflow.slice(workflow.indexOf('\n  studio-mcp-auto-play:'));
  assert.match(studioMcpBlock,/ROBLOX_STUDIO_PRODUCT_VERSION=/);
  assert.match(studioMcpBlock,/ROBLOX_STUDIO_MCP_PRODUCT_VERSION=/);
  assert.match(helper,/ROBLOX_STUDIO_MCP_TOOL_MISSING:'\+name\+':available='\+available\.join\(','\)/);
});


test('automatic Roblox foundation work keeps only newest same-identity run before heavy work',()=>{
  const jobsAt=workflow.indexOf('\njobs:\n');
  assert.ok(jobsAt>0);
  assert.match(workflow,/run-name: Roblox runtime foundation QA · \$\{\{ inputs\.game_id \|\| 'scan' \}\}/);
  assert.match(workflow.slice(0,jobsAt),/\nconcurrency:\n\s+group: roblox-runtime-foundation-\$\{\{ inputs\.game_id \|\| 'scan' \}\}\n\s+cancel-in-progress: true/);
  assert.match(workflow,/title='Roblox runtime foundation QA · '\+\(game\|\|'scan'\)/);
  assert.match(workflow,/process\.stdout\.write\(String\(ids\[ids\.length-1\]\)\)/);
  assert.match(workflow,/ROBLOX_RUNTIME_FOUNDATION_QA_EXACT_DEDUPED=/);
  assert.match(workflow,/ROBLOX_RUNTIME_FOUNDATION_QA_SCAN_DEDUPED_NEWER=/);
  const studioPlanBlock=workflow.slice(workflow.indexOf('\n  studio-local-plan:'),workflow.indexOf('\n  studio-mcp-auto-play:'));
  assert.match(studioPlanBlock,/concurrency:\n\s+group: roblox-studio-mcp-plan-\$\{\{ inputs\.game_id \|\| github\.sha \}\}/);
  assert.match(studioPlanBlock,/cancel-in-progress: true/);
  assert.doesNotMatch(studioPlanBlock,/needs: dedupe/);
  assert.doesNotMatch(studioPlanBlock,/needs\.dedupe/);
});


test('Studio MCP recovery blocks explicit disabled state but probes missing or unknown setting through official tool handshake',()=>{
  const studioMcpBlock=workflow.slice(workflow.indexOf('\n  studio-mcp-auto-play:'));
  assert.match(studioMcpBlock,/\$maxSessionAttempts = 3/);
  assert.match(studioMcpBlock,/ROBLOX_STUDIO_MCP_SESSION_ATTEMPT=/);
  assert.match(studioMcpBlock,/ROBLOX_STUDIO_MCP_SESSION_RESTART=/);
  assert.match(studioMcpBlock,/ROBLOX_STUDIO_MCP_STUDIO_RELAUNCHED=/);
  assert.match(studioMcpBlock,/--tool-attempts=5/);
  assert.match(studioMcpBlock,/--tool-delay-ms=1000/);
  assert.match(studioMcpBlock,/--timeout=15000/);
  assert.match(studioMcpBlock,/Roblox\\AssistantSettings/);
  assert.match(studioMcpBlock,/--mode=diagnose-setting/);
  assert.match(studioMcpBlock,/--settings-root=/);
  assert.match(studioMcpBlock,/roblox-studio-mcp-setting-diagnostic\.json/);
  assert.match(studioMcpBlock,/ROBLOX_STUDIO_MCP_SETTING_FILE_COUNT=/);
  assert.match(studioMcpBlock,/ROBLOX_STUDIO_MCP_SETTING_ENABLED_COUNT=/);
  assert.match(studioMcpBlock,/ROBLOX_STUDIO_MCP_SETTING_DISABLED_COUNT=/);
  assert.match(studioMcpBlock,/ROBLOX_STUDIO_MCP_SETTING_PARSE_ERROR_COUNT=/);
  assert.match(studioMcpBlock,/ROBLOX_STUDIO_MCP_SETTING_ENABLED=/);
  assert.match(studioMcpBlock,/ROBLOX_STUDIO_MCP_SETTING_MUTATION=NO/);
  assert.match(studioMcpBlock,/VIBE2_ROBLOX_STUDIO_MCP_SETTINGS_ROOT/);
  assert.match(studioMcpBlock,/ROBLOX_STUDIO_MCP_POST_LAUNCH_SETTING_ENABLED=/);
  assert.match(studioMcpBlock,/ROBLOX_STUDIO_MCP_POST_LAUNCH_SETTING_ENABLED_COUNT=/);
  assert.match(studioMcpBlock,/ROBLOX_STUDIO_MCP_POST_LAUNCH_SETTING_CANDIDATE_PATHS=/);
  assert.match(studioMcpBlock,/ROBLOX_STUDIO_MCP_POST_LAUNCH_SETTING_CANDIDATE_PATH_COUNT=/);
  assert.match(studioMcpBlock,/VIBE2_ROBLOX_STUDIO_MCP_POST_LAUNCH_SETTING_ENABLED=/);
  assert.match(studioMcpBlock,/VIBE2_ROBLOX_STUDIO_MCP_POST_LAUNCH_SETTING_CANDIDATE_PATH_COUNT=/);
  assert.match(studioMcpBlock,/--setting-state=/);
  assert.match(studioMcpBlock,/--setting-candidate-path-count=/);
  assert.match(studioMcpBlock,/ASSISTANT_SETTINGS_EMPTY_AFTER_ASSISTANT_READY/);
  assert.match(studioMcpBlock,/ROBLOX_STUDIO_MCP_PREREQUISITE_EVIDENCE=ASSISTANT_SETTINGS_EMPTY_AFTER_ASSISTANT_READY/);
  assert.match(studioMcpBlock,/ROBLOX_STUDIO_MCP_POST_LAUNCH_SETTING_MUTATION=NO/);
  assert.match(studioMcpBlock,/ROBLOX_STUDIO_MCP_RETRY_SETTING_ENABLED=/);
  assert.match(studioMcpBlock,/ROBLOX_STUDIO_MCP_RETRY_SETTING_ENABLED_COUNT=/);
  assert.match(studioMcpBlock,/ROBLOX_STUDIO_MCP_RETRY_SETTING_MUTATION=NO/);
  assert.match(studioMcpBlock,/setting_confirmed=/);
  assert.match(studioMcpBlock,/setting_probe_required=/);
  assert.match(studioMcpBlock,/setting_blocked=/);
  assert.match(studioMcpBlock,/\$settingConfirmed = \$settingState -eq 'YES'/);
  assert.match(studioMcpBlock,/\$settingExplicitlyDisabled = \$settingState -eq 'NO'/);
  assert.match(studioMcpBlock,/\$settingProbeRequired = -not \$settingConfirmed -and -not \$settingExplicitlyDisabled/);
  assert.match(studioMcpBlock,/\$settingBlocked = \$settingExplicitlyDisabled/);
  assert.match(studioMcpBlock,/ROBLOX_STUDIO_MCP_SETTING_ENABLE_REQUIRED:/);
  assert.match(studioMcpBlock,/ROBLOX_STUDIO_MCP_PREREQUISITE=ENABLE_IN_STUDIO_ASSISTANT_UI:/);
  assert.match(studioMcpBlock,/ROBLOX_STUDIO_MCP_PLAY_ATTEMPT=SKIPPED_EXPLICITLY_DISABLED/);
  assert.match(studioMcpBlock,/ROBLOX_STUDIO_MCP_SETTING_DIAGNOSTIC_ADVISORY=/);
  assert.match(studioMcpBlock,/ROBLOX_STUDIO_MCP_ENABLEMENT_AUTHORITY=OFFICIAL_REQUIRED_TOOL_HANDSHAKE/);
  assert.match(studioMcpBlock,/ROBLOX_STUDIO_MCP_PLAY_ATTEMPT=PROBE_OFFICIAL_TOOL_HANDSHAKE/);
  assert.match(studioMcpBlock,/Download exact immutable Roblox build artifact[\s\S]{0,180}if: steps\.mcp_preflight\.outputs\.setting_blocked != 'true'/);
  assert.match(studioMcpBlock,/Run actual local play through official Studio MCP[\s\S]{0,180}if: steps\.mcp_preflight\.outputs\.setting_blocked != 'true'/);
  assert.doesNotMatch(studioMcpBlock,/Set-Content .*AssistantSettings|Out-File .*AssistantSettings|Remove-Item .*AssistantSettings/i);
  assert.doesNotMatch(studioMcpBlock,/Set-Content .*VIBE2_ROBLOX_STUDIO_MCP_SETTINGS_ROOT|Remove-Item .*VIBE2_ROBLOX_STUDIO_MCP_SETTINGS_ROOT/i);
  assert.doesNotMatch(studioMcpBlock,/user_mouse_input[\s\S]{0,120}(?:Manage MCP Servers|Enable Studio as MCP server)/i);
});

test('MCP helper accepts bounded per-session readiness attempts from workflow arguments',()=>{
  assert.match(helper,/toolAttempts=5,toolDelayMs=1000/);
  assert.match(helper,/attempts:Math\.max\(1,Number\(toolAttempts\)\|\|5\)/);
  assert.match(helper,/delayMs:Math\.max\(100,Number\(toolDelayMs\)\|\|1000\)/);
  assert.match(helper,/toolAttempts:Number\(a\['tool-attempts'\]\|\|5\)/);
  assert.match(helper,/toolDelayMs:Number\(a\['tool-delay-ms'\]\|\|1000\)/);
});

test('central Studio MCP recovery policy stays restart-only and fail-closed on infrastructure exhaustion',()=>{
  const roadmap=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
  const architecture=JSON.parse(fs.readFileSync('company-learning/company-architecture-map.json','utf8'));
  const recovery=roadmap.roblox?.studioExecution?.mcpUnavailableRecovery||{};
  assert.equal(recovery.mode,'OFFICIAL_RESTART_ONLY');
  assert.equal(recovery.automaticSessionAttempts,3);
  assert.equal(recovery.toolReadinessAttemptsPerSession,5);
  assert.equal(recovery.assistantSettingsDiagnosticOnly,true);
  assert.equal(recovery.assistantSettingsMutationForbidden,true);
  assert.equal(recovery.guiToggleAutomationForbidden,true);
  assert.equal(recovery.finalFailureClass,'STUDIO_MCP_INFRASTRUCTURE_PENDING');
  assert.equal(recovery.infrastructureFailureMustNotBecomeGameFailure,true);
  assert.deepEqual(recovery.sessionRestartEligibleFailureScope,[
    'MCP_TOOL_READINESS',
    'MCP_SERVER_ENABLEMENT',
    'STUDIO_ATTACHMENT',
    'MCP_TRANSPORT'
  ]);
  assert.equal(recovery.completedMcpSessionRuntimeFailureAction,'PERSIST_GAME_RUNTIME_EVIDENCE_WITHOUT_MCP_SESSION_RESTART');
  assert.equal(recovery.runtimeFailureMustNotConsumeMcpRecoveryAttempts,true);
  assert.equal(recovery.completedSessionExitContract,'MCP_RUN_EXITS_SUCCESS_AFTER_REQUIRED_TOOLS_AND_STUDIO_SESSION_COMPLETE_EVEN_WHEN_RUNTIME_QA_FAILS');
  assert.equal(recovery.settingEnablementEvidenceRequired,true);
  assert.equal(recovery.settingEnablementAuthority,'READ_ONLY_SETTING_DIAGNOSTIC_OR_SUCCESSFUL_OFFICIAL_REQUIRED_TOOL_HANDSHAKE');
  assert.equal(recovery.confirmedEnabledState,'YES');
  assert.equal(recovery.explicitDisabledState,'NO');
  assert.deepEqual(recovery.unconfirmedStates,['MISSING','UNKNOWN']);
  assert.equal(recovery.assistantSettingsDiagnosticAdvisoryWhenMissingOrUnknown,true);
  assert.equal(recovery.requiredToolHandshakeCanConfirmEnabledState,true);
  assert.equal(recovery.unconfirmedSettingAction,'PROBE_OFFICIAL_MCP_REQUIRED_TOOLS_AND_FAIL_CLOSED_IF_HANDSHAKE_NOT_READY');
  assert.equal(recovery.explicitDisabledAction,'FAIL_CLOSED_AS_INFRASTRUCTURE_PENDING_WITHOUT_STUDIO_PLAY_ATTEMPT');
  assert.equal(recovery.automaticSettingMutationForbidden,true);
  assert.equal(recovery.manualPrerequisite,'ASSISTANT_MANAGE_MCP_SERVERS_ENABLE_STUDIO_AS_MCP_SERVER');
  assert.equal(recovery.automaticResumeAfterPrerequisite,true);
  const arch=architecture.releaseExposureLifecycle?.robloxPerpetualInternalBuildup?.mcpUnavailableRecovery||{};
  assert.equal(arch.automaticSessionAttempts,3);
  assert.equal(arch.ownedStudioRestart,true);
  assert.equal(arch.mcpClientRestart,true);
  assert.equal(arch.assistantSettingsReadOnlyDiagnostic,true);
  assert.equal(arch.assistantSettingsMutation,false);
  assert.equal(arch.guiToggleAutomation,false);
  assert.equal(arch.settingGate,'EXPLICIT_NO_BLOCKS_OTHERWISE_OFFICIAL_REQUIRED_TOOL_HANDSHAKE_IS_AUTHORITATIVE');
  assert.equal(arch.explicitDisabledState,'NO');
  assert.equal(arch.explicitDisabledExecution,'SKIP_STUDIO_AND_MCP_SESSION_ATTEMPTS');
  assert.deepEqual(arch.unconfirmedSettingStates,['MISSING','UNKNOWN']);
  assert.equal(arch.unconfirmedSettingExecution,'PROBE_OFFICIAL_MCP_REQUIRED_TOOLS');
  assert.equal(arch.requiredToolHandshakeAuthority,true);
  assert.deepEqual(arch.sessionRestartEligibleFailureScope,[
    'MCP_TOOL_READINESS',
    'MCP_SERVER_ENABLEMENT',
    'STUDIO_ATTACHMENT',
    'MCP_TRANSPORT'
  ]);
  assert.equal(arch.completedMcpSessionRuntimeFailureAction,'PERSIST_GAME_RUNTIME_EVIDENCE_WITHOUT_MCP_SESSION_RESTART');
  assert.equal(arch.runtimeFailureMustNotConsumeMcpRecoveryAttempts,true);
  const ingress=architecture.learningClosedLoopTopology?.robloxStudioVerifiedRuntimeIngress||{};
  assert.equal(ingress.version,3);
  assert.equal(ingress.infrastructureRecovery,'RESTART_ONLY_WHEN_MCP_TOOL_READINESS_ENABLEMENT_ATTACHMENT_OR_TRANSPORT_FAILS');
  assert.equal(ingress.completedSessionRuntimeFailure,'PERSIST_AS_GAME_RUNTIME_EVIDENCE_NO_MCP_RESTART');
  assert.equal(ingress.runtimeFailureConsumesMcpRecoveryAttempt,false);
  assert.equal(ingress.completedSessionExitContract,'MCP_PROCESS_EXIT_ZERO_RUNTIME_QA_RESULT_PERSISTED_SEPARATELY');
  assert.equal(arch.unconfirmedSettingState,'STUDIO_MCP_INFRASTRUCTURE_PENDING_IF_REQUIRED_TOOL_HANDSHAKE_FAILS');
  assert.equal(arch.automaticSettingMutation,false);
});


test('Studio MCP strategy matrix receives include rows only and never planner metadata axes',()=>{
  const studioPlanBlock=workflow.slice(workflow.indexOf('\n  studio-local-plan:'),workflow.indexOf('\n  studio-mcp-auto-play:'));
  const jsIncludeOnly=/const include=Array\.isArray\(plan\.include\)\?plan\.include:\[\];[\s\S]*JSON\.stringify\(\{include\}\)/.test(studioPlanBlock)
    ||/JSON\.stringify\(\{include:Array\.isArray\(x\.include\)\?x\.include:\[\]\}\)/.test(studioPlanBlock);
  const powershellIncludeOnly=/\$include = @\(\$plan\.include\)[\s\S]*\$matrix = @\{ include = \$include \} \| ConvertTo-Json -Compress -Depth 12/.test(studioPlanBlock);
  assert.equal(jsIncludeOnly||powershellIncludeOnly,true);
  assert.doesNotMatch(studioPlanBlock,/JSON\.stringify\(x\)\)"/);
  assert.match(workflow,/matrix: \$\{\{ fromJSON\(needs\.studio-local-plan\.outputs\.matrix\) \}\}/);
});


test('Studio MCP setting diagnostic finds nested mcp-server.enabled without mutating AssistantSettings',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'roblox-mcp-setting-'));
  try{
    const nested=path.join(root,'nested','profile');
    fs.mkdirSync(nested,{recursive:true});
    const enabledFile=path.join(nested,'assistant.json');
    const disabledFile=path.join(root,'other.json');
    const originalEnabled=JSON.stringify({assistant:{settings:{'mcp-server':{enabled:true}}},other:{enabled:false}},null,2);
    const originalDisabled=JSON.stringify({deep:[{configuration:{'mcp-server':{enabled:false}}}]},null,2);
    fs.writeFileSync(enabledFile,originalEnabled);
    fs.writeFileSync(disabledFile,originalDisabled);
    const result=detectStudioMcpAssistantSetting({settingsRoot:root});
    assert.equal(result.state,'YES');
    assert.equal(result.fileCount,2);
    assert.equal(result.enabledCount,1);
    assert.equal(result.disabledCount,1);
    assert.equal(result.parseErrorCount,0);
    assert.equal(result.mutationPerformed,false);
    assert.equal(fs.readFileSync(enabledFile,'utf8'),originalEnabled);
    assert.equal(fs.readFileSync(disabledFile,'utf8'),originalDisabled);
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
});

test('Studio MCP setting diagnostic distinguishes disabled, missing, unknown, and parse errors',()=>{
  const disabledRoot=fs.mkdtempSync(path.join(os.tmpdir(),'roblox-mcp-disabled-'));
  const unknownRoot=fs.mkdtempSync(path.join(os.tmpdir(),'roblox-mcp-unknown-'));
  const badRoot=fs.mkdtempSync(path.join(os.tmpdir(),'roblox-mcp-bad-'));
  const missingRoot=path.join(os.tmpdir(),'roblox-mcp-missing-'+process.pid+'-'+Date.now());
  try{
    fs.writeFileSync(path.join(disabledRoot,'settings.json'),JSON.stringify({a:{'mcp-server':{enabled:false}}}));
    fs.writeFileSync(path.join(unknownRoot,'settings.json'),JSON.stringify({a:{unrelated:true}}));
    fs.writeFileSync(path.join(badRoot,'settings.json'),'{bad json');
    const disabled=detectStudioMcpAssistantSetting({settingsRoot:disabledRoot});
    const unknown=detectStudioMcpAssistantSetting({settingsRoot:unknownRoot});
    const bad=detectStudioMcpAssistantSetting({settingsRoot:badRoot});
    const missing=detectStudioMcpAssistantSetting({settingsRoot:missingRoot});
    assert.equal(disabled.state,'NO');
    assert.equal(disabled.disabledCount,1);
    assert.equal(unknown.state,'UNKNOWN');
    assert.equal(unknown.fileCount,1);
    assert.equal(bad.state,'UNKNOWN');
    assert.equal(bad.parseErrorCount,1);
    assert.equal(missing.state,'MISSING');
    assert.equal(missing.fileCount,0);
  }finally{
    fs.rmSync(disabledRoot,{recursive:true,force:true});
    fs.rmSync(unknownRoot,{recursive:true,force:true});
    fs.rmSync(badRoot,{recursive:true,force:true});
  }
});

test('Studio MCP setting diagnostic recognizes safe schema variants without mutating AssistantSettings',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'roblox-mcp-schema-'));
  try{
    const files=[
      ['camel.json',{assistant:{mcpServerEnabled:true}}],
      ['nested.json',{assistant:{studioMcpServer:{enabled:{value:false}}}}],
      ['value.json',{assistant:{'mcp-server':{value:true}}}],
      ['unrelated.json',{assistant:{mcpModelEnabled:false},studio:{serverEnabled:false}}]
    ];
    for(const [name,value] of files)fs.writeFileSync(path.join(root,name),JSON.stringify(value));
    const result=detectStudioMcpAssistantSetting({settingsRoot:root});
    assert.equal(result.version,2);
    assert.equal(result.state,'YES');
    assert.equal(result.enabledCount,2);
    assert.equal(result.disabledCount,1);
    assert.equal(result.candidatePathCount,3);
    assert.deepEqual(result.candidatePaths,[
      'assistant.mcpServerEnabled',
      'assistant.mcp-server.value',
      'assistant.studioMcpServer.enabled.value'
    ].sort());
    assert.equal(result.mutationPerformed,false);
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
});

test('Studio MCP setting diagnostic CLI is part of the helper contract',()=>{
  assert.match(helper,/mode==='diagnose-setting'/);
  assert.match(helper,/detectStudioMcpAssistantSetting/);
  assert.match(helper,/ROBLOX_STUDIO_MCP_SETTING_MUTATION=NO/);
  assert.match(helper,/collectMcpServerEnabledSignals/);
  assert.match(helper,/candidatePathCount/);
  assert.match(helper,/candidatePaths/);
});


test('declared Studio actual-play contract requires core progression UI action effect visual sanity and design binding',()=>{
  const contract=JSON.parse(fs.readFileSync('roblox-games/horror-escape-room/launch-mvp.json','utf8')).studioActualPlayContract;
  assert.equal(contract.required,true);
  for(const id of ['role-selection-interaction','round-running','logical-population-eight','hud-visible','action-ui-visible','design-runtime-binding','interaction-surface-present','world-geometry-present','primary-action-input','primary-action-effect','visual-capture-sane'])assert.ok(contract.requiredScenarios.includes(id),id);
  const png=Buffer.alloc(4096);Buffer.from('89504e470d0a1a0a','hex').copy(png,0);png.writeUInt32BE(640,16);png.writeUInt32BE(360,20);
  const image={type:'image',mimeType:'image/png',data:png.toString('base64')};
  const result=evaluateStudioActualPlayContract({
    contract,
    initialClientProbe:{player:{roundState:'INTERMISSION'},workspace:{ActivePopulation:0}},
    preActionClientProbe:{player:{roundState:'RUNNING',role:'SURVIVOR',rootX:0,rootY:3,rootZ:0}},
    postActionClientProbe:{player:{roundState:'RUNNING',role:'SURVIVOR',rootX:2,rootY:3,rootZ:0,velocityX:12,velocityY:0,velocityZ:0}},
    clientProbe:{
      player:{characterPresent:true,humanoidPresent:true,rootPresent:true,roundState:'RUNNING',role:'MONSTER',rootX:7,rootY:3,rootZ:0,velocityX:0,velocityY:0,velocityZ:0,humanCount:3,monsterCount:5},
      camera:{present:true},
      ui:{screenGuiPresent:true,visibleButtons:2,required:{MidnightTopHUD:{present:true,visible:true,offscreen:false},RoundActions:{present:true,visible:true,offscreen:false}}},
      world:{arenaPresent:true,arenaPartCount:80,proximityPromptCount:5},
      workspace:{MapReady:true,ActivePopulation:8,HumanCount:3,MonsterCount:5,WorldArtPass:'MIDNIGHT_SCHOOL_INFECTION_HORROR_V9',CharacterArtDirection:'REALISTIC_HUMANS_ABERRANT_MONSTERS',DesignCodeSync:'PRIMARY_THREE_FINAL_4V4_INFECTION_V1'},
      lighting:{brightness:1.8}
    },
    serverProbe:{workspace:{MapReady:true,ActivePopulation:8,HumanCount:3,MonsterCount:5}},
    actions:[{id:'ui-role-selection',type:'mcp-mouse-input',dispatched:true,ok:true},{id:'ui-primary-action',type:'mcp-mouse-input',dispatched:true,ok:true}],
    beforeImages:[image],afterImages:[image]
  });
  assert.deepEqual(result.qualityFailureKinds,[]);
  assert.equal(result.scenarios.every(row=>row.pass===true),true);
  assert.equal(result.authoritativeStateChangeObserved,true);
  assert.ok(result.metrics.primaryActionDisplacement>=2);
});

test('primary action effect accepts an authoritative server feedback transition even after dash velocity settles',()=>{
  const contract={required:true,primaryActionButtonText:'대시',requiredScenarios:['primary-action-input','primary-action-effect'],expectations:{minimumPrimaryActionDisplacement:0.25}};
  const result=evaluateStudioActualPlayContract({
    contract,
    preActionClientProbe:{player:{rootX:10,rootY:3,rootZ:10,velocityX:0,velocityY:0,velocityZ:0,feedbackEvent:'OLD'}},
    postActionClientProbe:{player:{rootX:10,rootY:3,rootZ:10,velocityX:0,velocityY:0,velocityZ:0,feedbackEvent:'DASH:12345'}},
    clientProbe:{player:{},ui:{},workspace:{},world:{},lighting:{}},
    serverProbe:{},
    actions:[{id:'ui-primary-action',type:'mcp-mouse-input',dispatched:true,ok:true}],
    beforeImages:[],
    afterImages:[]
  });
  assert.equal(result.scenarios.find(x=>x.id==='primary-action-input').pass,true);
  assert.equal(result.scenarios.find(x=>x.id==='primary-action-effect').pass,true);
  assert.equal(result.metrics.primaryActionFeedbackChanged,true);
  assert.equal(result.authoritativeStateChangeObserved,true);
  assert.match(helper,/feedbackEvent=attr\(p,"FeedbackEvent"\)/);
});

test('official Studio result preserves primary action feedback evidence through persisted runtime summary',()=>{
  assert.match(helper,/primaryActionFeedbackChanged:scenarioMetrics\.primaryActionFeedbackChanged===true/);
  const observed=runtime();
  observed.metrics.primaryActionFeedbackChanged=true;
  const result=createLocalStudioPlayEvidence({
    item:item(),runtime:observed,expected,workflowRunId:36298580885,studioStepSucceeded:true,
    testedAt:'2026-09-27T05:57:45.929Z'
  });
  assert.equal(result.pass,true);
  assert.equal(result.evidence.runtimeSummary.primaryActionFeedbackChanged,true);
});

test('movement alone cannot pass a declared Studio actual-play scenario contract',()=>{
  const contract=JSON.parse(fs.readFileSync('roblox-games/horror-escape-room/launch-mvp.json','utf8')).studioActualPlayContract;
  const result=evaluateStudioActualPlayContract({
    contract,
    initialClientProbe:{player:{roundState:'INTERMISSION'},workspace:{ActivePopulation:0}},
    preActionClientProbe:{player:{roundState:'INTERMISSION',rootX:0,rootY:3,rootZ:0}},
    clientProbe:{
      player:{characterPresent:true,humanoidPresent:true,rootPresent:true,roundState:'INTERMISSION',role:'WAITING',rootX:4,rootY:3,rootZ:0},
      camera:{present:true},
      ui:{screenGuiPresent:true,visibleButtons:2,required:{MidnightTopHUD:{present:true,visible:true,offscreen:false},RoundActions:{present:false,visible:false,offscreen:false}}},
      world:{arenaPresent:true,arenaPartCount:80,proximityPromptCount:5},
      workspace:{MapReady:true,ActivePopulation:0,HumanCount:0,MonsterCount:0,WorldArtPass:'MIDNIGHT_SCHOOL_INFECTION_HORROR_V9',CharacterArtDirection:'REALISTIC_HUMANS_ABERRANT_MONSTERS',DesignCodeSync:'PRIMARY_THREE_FINAL_4V4_INFECTION_V1'},
      lighting:{brightness:1.8}
    },
    serverProbe:{workspace:{MapReady:true,ActivePopulation:0,HumanCount:0,MonsterCount:0}},
    actions:[{id:'keyboard-w',type:'mcp-keyboard-input',dispatched:true,ok:true}],
    beforeImages:[],afterImages:[]
  });
  assert.ok(result.qualityFailureKinds.includes('role-selection-interaction'));
  assert.ok(result.qualityFailureKinds.includes('round-running'));
  assert.ok(result.qualityFailureKinds.includes('logical-population-eight'));
  assert.ok(result.qualityFailureKinds.includes('primary-action-input'));
  assert.ok(result.qualityFailureKinds.includes('visual-capture-sane'));
});

test('declared scenario failure persists as repair-required not MCP infrastructure failure',()=>{
  const candidate=item();
  const broken=runtime();
  broken.runtimeVerified=false;
  broken.scenarioContractRequired=true;
  broken.scenarioCoverage=[{id:'round-running',pass:false}];
  broken.qualityFailureKinds=['round-running'];
  broken.errors=[];
  const applied=applyLocalStudioPlayResult({queue:{items:[candidate]},gameId:'g1',runtime:broken,expected,workflowRunId:42,studioStepSucceeded:true,testedAt:'2026-09-27T02:00:00.000Z'});
  assert.equal(applied.result.evidence.infrastructureFailure,false);
  assert.equal(applied.item.canonicalState,'REPAIR_REQUIRED');
  assert.equal(applied.item.robloxFailureSignature,'ROBLOX_STUDIO_MCP_SCENARIO_CONTRACT_FAILED');
});


test('planner reruns exact artifact when a declared Studio scenario contract is new or changed',()=>{
  const candidate=item();
  candidate.robloxInternalVibePlayEvidence={
    pass:true,actualPlay:true,officialStudioMcp:true,localPlaceFile:true,onlinePlaceDirectOpen:false,robloxPlayerAutomation:false,
    sourceRevision:source,artifactIdentity:artifact,artifactRunId:777,universeId:'123',placeId:'456',versionNumber:9,
    testedAt:'2026-09-27T00:00:00.000Z'
  };
  assert.equal(planLocalStudioCandidates({queue:{items:[candidate]},roadmap:roadmap()}).include.length,0);
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'roblox-studio-contract-'));
  try{
    const gameRoot=path.join(root,'roblox-games','g1');
    fs.mkdirSync(gameRoot,{recursive:true});
    fs.writeFileSync(path.join(gameRoot,'launch-mvp.json'),JSON.stringify({studioActualPlayContract:{version:1,required:true,requiredScenarios:['round-running']}}));
    const first=planLocalStudioCandidates({queue:{items:[candidate]},roadmap:roadmap(),repoRoot:root});
    assert.equal(first.include.length,1);
    assert.equal(first.include[0].scenarioContractRequired,true);
    assert.equal(first.include[0].scenarioContractVersion,1);
    assert.match(first.include[0].scenarioContractFingerprint,/^sha256:[0-9a-f]{64}$/);
    candidate.robloxInternalVibePlayEvidence={
      ...candidate.robloxInternalVibePlayEvidence,
      scenarioContractRequired:true,
      scenarioContractVersion:first.include[0].scenarioContractVersion,
      scenarioContractFingerprint:first.include[0].scenarioContractFingerprint
    };
    assert.equal(planLocalStudioCandidates({queue:{items:[candidate]},roadmap:roadmap(),repoRoot:root}).include.length,0);
    fs.writeFileSync(path.join(gameRoot,'launch-mvp.json'),JSON.stringify({studioActualPlayContract:{version:2,required:true,requiredScenarios:['round-running','hud-visible']}}));
    assert.equal(planLocalStudioCandidates({queue:{items:[candidate]},roadmap:roadmap(),repoRoot:root}).include.length,1);
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
});


test('declared Studio scenario probes the primary action before generic movement and keeps console errors separate from scenario failures',()=>{
  const preActionAt=helper.indexOf("preActionClientProbe=await collectStudioActualPlayProbe");
  const primaryAt=helper.indexOf("actions.push({id:'ui-primary-action'");
  const postActionAt=helper.indexOf("postActionClientProbe=await collectStudioActualPlayProbe");
  const keyboardAt=helper.indexOf("for(const key of ['W','A','D','Space'])");
  assert.ok(preActionAt>0&&primaryAt>preActionAt&&postActionAt>primaryAt&&keyboardAt>postActionAt);
  assert.match(helper,/consoleErrorCount:consoleClassification\.errors\.length/);
  assert.doesNotMatch(helper,/if\(row\.pass!==true\)errors\.push\(\{type:'actual-play-quality-error'/);
  assert.match(helper,/acceptedRoles\.includes\(clean\(selectionPlayer\.role\)\)/);
});


test('role preference intent survives later infection in scenario evaluation',()=>{
  const contract=JSON.parse(fs.readFileSync('roblox-games/horror-escape-room/launch-mvp.json','utf8')).studioActualPlayContract;
  const png=Buffer.alloc(4096);Buffer.from('89504e470d0a1a0a','hex').copy(png,0);png.writeUInt32BE(640,16);png.writeUInt32BE(360,20);
  const image={type:'image',mimeType:'image/png',data:png.toString('base64')};
  const result=evaluateStudioActualPlayContract({
    contract,
    initialClientProbe:{player:{roundState:'INTERMISSION'},workspace:{ActivePopulation:0}},
    preActionClientProbe:{player:{roundState:'RUNNING',role:'MONSTER',monsterPreference:'SURVIVOR',soloRole:'SURVIVOR',rootX:0,rootY:3,rootZ:0}},
    postActionClientProbe:{player:{rootX:2,rootY:3,rootZ:0,velocityX:18,velocityY:0,velocityZ:0}},
    clientProbe:{
      player:{characterPresent:true,humanoidPresent:true,rootPresent:true,roundState:'RUNNING',role:'MONSTER',humanCount:4,monsterCount:4},
      camera:{present:true},
      ui:{screenGuiPresent:true,visibleButtons:2,required:{MidnightTopHUD:{present:true,visible:true,offscreen:false},RoundActions:{present:true,visible:true,offscreen:false}}},
      world:{arenaPresent:true,arenaPartCount:80,proximityPromptCount:5},
      workspace:{MapReady:true,ActivePopulation:8,HumanCount:4,MonsterCount:4,WorldArtPass:'MIDNIGHT_SCHOOL_INFECTION_HORROR_V9',CharacterArtDirection:'REALISTIC_HUMANS_ABERRANT_MONSTERS',DesignCodeSync:'PRIMARY_THREE_FINAL_4V4_INFECTION_V1'},
      lighting:{brightness:1.8}
    },
    serverProbe:{workspace:{MapReady:true,ActivePopulation:8,HumanCount:4,MonsterCount:4}},
    actions:[{id:'ui-role-selection',dispatched:true,ok:true},{id:'ui-primary-action',dispatched:true,ok:true}],
    beforeImages:[image],afterImages:[image]
  });
  assert.equal(result.scenarios.find(x=>x.id==='role-selection-interaction').pass,true);
  assert.equal(result.scenarios.find(x=>x.id==='primary-action-input').pass,true);
  assert.equal(result.scenarios.find(x=>x.id==='primary-action-effect').pass,true);
});

test('deep Studio scenario separates console-runtime errors from gameplay-quality failures',()=>{
  assert.match(helper,/checkpoint\('no-release-blocking-runtime-errors',consoleClassification\.errors\.length===0\)/);
  assert.match(helper,/consoleErrorCount:consoleClassification\.errors\.length/);
});

test('product-quality Studio failure short-circuits repeated Studio and release observation until source buildup changes',()=>{
  const candidate=item();
  const failedRuntime=runtime();
  failedRuntime.scenarioContractRequired=true;
  failedRuntime.scenarioContractVersion=2;
  failedRuntime.scenarioContractFingerprint='sha256:'+'c'.repeat(64);
  failedRuntime.scenarioCoverage=[
    {id:'primary-action-input',pass:true},
    {id:'primary-action-effect',pass:false}
  ];
  failedRuntime.qualityFailureKinds=['primary-action-effect'];
  const applied=applyLocalStudioPlayResult({
    queue:{items:[candidate]},
    gameId:'g1',
    runtime:failedRuntime,
    expected,
    workflowRunId:901,
    studioStepSucceeded:true,
    testedAt:'2026-09-27T07:30:00.000Z'
  });
  assert.equal(applied.result.pass,false);
  assert.equal(applied.item.robloxQualityBuildUpRequired,true);
  assert.equal(applied.item.robloxQualityFailureClass,'PRODUCT');
  assert.equal(applied.item.robloxQualityBuildUpSourceRevision,source);
  assert.equal(applied.item.currentStep,'REPAIR_REQUIRED');
  assert.equal(applied.item.canonicalState,'REPAIR_REQUIRED');
  assert.deepEqual(applied.item.robloxQualityBuildUpEvidence.qualityFailureKinds,['primary-action-effect']);
  assert.equal(planLocalStudioCandidates({queue:applied.queue,roadmap:roadmap()}).include.length,0);
});

test('successful exact Studio play clears prior product-quality buildup short circuit',()=>{
  const candidate=item();
  candidate.robloxQualityBuildUpRequired=true;
  candidate.robloxQualityFailureClass='PRODUCT';
  candidate.robloxQualityBuildUpSourceRevision=source;
  candidate.robloxQualityBuildUpEvidence={failureSignature:'ROBLOX_STUDIO_MCP_SCENARIO_CONTRACT_FAILED'};
  const applied=applyLocalStudioPlayResult({
    queue:{items:[candidate]},
    gameId:'g1',
    runtime:runtime(),
    expected,
    workflowRunId:902,
    studioStepSucceeded:true,
    testedAt:'2026-09-27T07:31:00.000Z'
  });
  assert.equal(applied.result.pass,true);
  assert.equal(applied.item.robloxQualityBuildUpRequired,false);
  assert.equal(applied.item.robloxQualityFailureClass,null);
  assert.equal(applied.item.robloxQualityBuildUpSourceRevision,null);
  assert.equal(applied.item.robloxQualityBuildUpEvidence,null);
});


test('verified Studio product-quality failure enters canonical buildup repair and suppresses same-source replay',()=>{
  const queue={items:[item()]};
  const failedRuntime=runtime();
  failedRuntime.errors=[{type:'studio-console-error',signature:'Script Runtime Error: primary action state did not advance'}];
  const applied=applyLocalStudioPlayResult({
    queue,
    gameId:'g1',
    runtime:failedRuntime,
    expected,
    workflowRunId:991,
    studioStepSucceeded:true,
    testedAt:'2026-09-27T08:00:00.000Z'
  });
  assert.equal(applied.result.pass,false);
  assert.equal(applied.result.evidence.infrastructureFailure,false);
  assert.equal(applied.item.robloxQualityBuildUpRequired,true);
  assert.equal(applied.item.robloxQualityFailureClass,'PRODUCT');
  assert.equal(applied.item.robloxQualityBuildUpSourceRevision,source);
  assert.equal(applied.item.currentStep,'REPAIR_REQUIRED');
  assert.equal(applied.item.canonicalState,'REPAIR_REQUIRED');
  assert.equal(applied.item.robloxQualityBuildUpEvidence?.authority,'roblox-official-studio-mcp-product-quality-failure');
  assert.equal(applied.item.robloxQualityBuildUpEvidence?.failureStage,'VIBE_INTERNAL_PLAY');
  assert.equal(planLocalStudioCandidates({queue:applied.queue,roadmap:roadmap()}).include.length,0);
});

test('Studio infrastructure failure does not fabricate a product-quality buildup requirement',()=>{
  const candidate=item();
  const queue={items:[candidate]};
  const failedRuntime=runtime();
  failedRuntime.errors=[{type:'infrastructure',signature:'NO_STUDIO'}];
  const applied=applyLocalStudioPlayResult({
    queue,
    gameId:'g1',
    runtime:failedRuntime,
    expected,
    workflowRunId:992,
    studioStepSucceeded:true,
    testedAt:'2026-09-27T08:01:00.000Z'
  });
  assert.equal(applied.result.pass,false);
  assert.equal(applied.result.evidence.infrastructureFailure,true);
  assert.notEqual(applied.item.robloxQualityBuildUpRequired,true);
  assert.equal(applied.item.robloxQualityFailureClass,'INFRASTRUCTURE_OR_EVIDENCE_ONLY');
  assert.equal(applied.item.canonicalState,'INTERNAL_PLATFORM_PLAYTEST_AND_DEBUG');
});

test('product-quality Studio failure automatically marks canonical buildup and suppresses same-source Studio replay',()=>{
  const candidate=item();
  candidate.robloxSharedTargetCurrent=true;
  candidate.robloxRuntimeFoundationPassed=true;
  candidate.robloxRuntimeFoundationEvidence={
    sourceRevision:source,artifactIdentity:artifact,artifactRunId:777,placeId:'456',
    candidateVersionNumber:9,runtimeFoundationPassed:true,actualRuntimeEvidence:true
  };
  const failed=runtime();
  failed.checkpoints=failed.checkpoints.map(row=>row.id==='viewport-changed-after-input'?{...row,pass:false}:row);
  failed.metrics={...failed.metrics,distinctFrameChange:false};
  const queue={items:[candidate]};
  const applied=applyLocalStudioPlayResult({
    queue,gameId:'g1',runtime:failed,expected,workflowRunId:991,studioStepSucceeded:true,
    testedAt:'2026-09-27T08:00:00.000Z'
  });
  assert.equal(applied.result.pass,false);
  assert.equal(applied.item.robloxQualityBuildUpRequired,true);
  assert.equal(applied.item.robloxQualityFailureClass,'PRODUCT');
  assert.equal(applied.item.robloxQualityBuildUpSourceRevision,source);
  assert.equal(applied.item.canonicalState,'REPAIR_REQUIRED');
  assert.equal(applied.item.currentStep,'REPAIR_REQUIRED');
  assert.equal(applied.item.robloxQualityBuildUpEvidence?.authority,'roblox-official-studio-mcp-product-quality-failure');
  assert.equal(planLocalStudioCandidates({queue,roadmap:roadmap()}).include.length,0);
});

test('Studio infrastructure failure does not fabricate a product-quality buildup request',()=>{
  const candidate=item();
  candidate.robloxSharedTargetCurrent=true;
  candidate.robloxRuntimeFoundationPassed=true;
  candidate.robloxRuntimeFoundationEvidence={
    sourceRevision:source,artifactIdentity:artifact,artifactRunId:777,placeId:'456',
    candidateVersionNumber:9,runtimeFoundationPassed:true,actualRuntimeEvidence:true
  };
  const infra=runtime();
  infra.errors=[{type:'infrastructure',signature:'NO_STUDIO'}];
  const queue={items:[candidate]};
  const applied=applyLocalStudioPlayResult({
    queue,gameId:'g1',runtime:infra,expected,workflowRunId:992,studioStepSucceeded:false,
    testedAt:'2026-09-27T08:01:00.000Z'
  });
  assert.equal(applied.result.evidence.infrastructureFailure,true);
  assert.notEqual(applied.item.robloxQualityBuildUpRequired,true);
  assert.equal(applied.item.robloxQualityFailureClass,'INFRASTRUCTURE_OR_EVIDENCE_ONLY');
  assert.equal(applied.item.canonicalState,'INTERNAL_PLATFORM_PLAYTEST_AND_DEBUG');
});


test('commercial adaptive Studio contract expands automatically from launch core and release gates',()=>{
  const contract=deriveStudioActualPlayContract({
    launchCore:[
      'quest NPC merchant with rewards and inventory',
      'combat with monsters companion AI and boss',
      'large village map with mobile HUD and camera feedback'
    ],
    releaseGates:[
      'save/rejoin',
      'round restart regression',
      'server authoritative remotes',
      'BGM and VFX'
    ],
    evidencePolicy:{saveRejoinPassRequired:true,audioFeedbackPassRequired:true}
  });
  assert.equal(contract.required,true);
  assert.ok(contract.version>=3);
  for(const id of [
    'adaptive-ui-commercial-quality',
    'adaptive-world-safety',
    'adaptive-interaction-surface',
    'adaptive-progression-surface',
    'adaptive-remote-surface',
    'adaptive-combat-surface',
    'adaptive-motion-surface',
    'adaptive-audio-surface',
    'adaptive-npc-surface',
    'adaptive-companion-ai-surface',
    'adaptive-item-surface',
    'adaptive-environment-surface',
    'adaptive-effects-surface',
    'adaptive-quest-loop-surface',
    'adaptive-reward-loop-surface',
    'adaptive-start-playability',
    'adaptive-ui-blocking-overlay',
    'adaptive-economy-surface',
    'adaptive-save-surface',
    'adaptive-retry-loop-surface',
    'adaptive-camera-quality',
    'adaptive-performance-budget'
  ])assert.ok(contract.requiredScenarios.includes(id),id);
  assert.match(contract.adaptiveCoverage.contractHash,/^sha256:[0-9a-f]{64}$/);
});

test('verified Studio product failures outrank generic MCP infrastructure noise for repair routing',()=>{
  const broken=runtime();
  broken.runtimeVerified=false;
  broken.scenarioContractRequired=true;
  broken.scenarioContractVersion=3;
  broken.scenarioContractFingerprint='sha256:'+'c'.repeat(64);
  broken.scenarioCoverage=[
    {id:'adaptive-start-playability',pass:true},
    {id:'adaptive-ui-commercial-quality',pass:false},
    {id:'adaptive-world-safety',pass:false}
  ];
  broken.qualityFailureKinds=['adaptive-ui-commercial-quality','adaptive-world-safety'];
  broken.qualityFailureDetails=[
    {id:'adaptive-ui-commercial-quality',repairSurface:'MOBILE_UI',priority:'HIGH',hint:'Repair mobile UI',observed:{undersizedTouchButtons:2}},
    {id:'adaptive-world-safety',repairSurface:'WORLD_GEOMETRY',priority:'CRITICAL',hint:'Repair walkable world',observed:{floorCoveragePass:false}}
  ];
  broken.errors=[{
    type:'studio-mcp-infrastructure-or-runtime-error',
    signature:'MCP timeout: tools/call'
  }];

  const applied=applyLocalStudioPlayResult({
    queue:{items:[item()]},
    gameId:'g1',
    runtime:broken,
    expected,
    workflowRunId:36504730085,
    studioStepSucceeded:true,
    testedAt:'2026-09-29T00:50:06.194Z'
  });

  assert.equal(applied.result.evidence.infrastructureFailure,false);
  assert.equal(applied.result.evidence.failureClass,'STUDIO_PRODUCT_QUALITY_FAILURE');
  assert.equal(applied.item.currentStep,'REPAIR_REQUIRED');
  assert.equal(applied.item.canonicalState,'REPAIR_REQUIRED');
  assert.equal(applied.item.robloxStudioLocalPlayInfrastructurePending,false);
  assert.equal(applied.item.robloxStudioLocalPlayRepairRequired,true);
  assert.equal(applied.item.robloxQualityBuildUpRequired,true);
  assert.deepEqual(applied.item.robloxQualityBuildUpEvidence.qualityFailureKinds,[
    'adaptive-ui-commercial-quality',
    'adaptive-world-safety'
  ]);
  assert.deepEqual(applied.item.robloxQualityBuildUpEvidence.repairSurfaces,[
    'MOBILE_UI',
    'WORLD_GEOMETRY'
  ]);
});

test('commercial Studio evaluator rejects clipped tiny UI and unsafe world even when basic play input works',()=>{
  const contract=deriveStudioActualPlayContract({
    launchCore:['mobile HUD','large village map','quest progression'],
    releaseGates:['mobile controls']
  });
  const probe={
    player:{characterPresent:true,humanoidPresent:true,rootPresent:true,rootX:0,rootY:5,rootZ:0,animatorPresent:true,motorCount:6},
    camera:{present:true,subjectPresent:true,fieldOfView:70},
    ui:{visibleButtons:2,offscreenButtons:1,undersizedTouchButtons:1,textOverflowButtons:0,overlapPairs:0,required:{}},
    world:{boundsFinite:true,collidablePartCount:100,floorBelowPlayer:false,proximityPromptCount:1,clickDetectorCount:0,mobs:[],npcs:[],companions:[],items:[],environmentModels:2,effectCount:0},
    runtime:{remoteCount:1,progression:[{scope:'player',name:'QuestProgress',value:'0'}],systemSignals:4,descendantCount:400,memoryMb:220,categories:{quest:1,progression:1}},
    workspace:{},
    lighting:{brightness:1.5}
  };
  const result=evaluateStudioActualPlayContract({
    contract,
    initialClientProbe:probe,
    preActionClientProbe:probe,
    postActionClientProbe:{...probe,player:{...probe.player,rootX:2}},
    clientProbe:probe,
    serverProbe:{runtime:probe.runtime,world:probe.world,workspace:{}},
    actions:[{id:'keyboard-w',dispatched:true,ok:true}],
    beforeImages:[],
    afterImages:[]
  });
  assert.ok(result.qualityFailureKinds.includes('adaptive-ui-commercial-quality'));
  assert.ok(result.qualityFailureKinds.includes('adaptive-world-safety'));
});

test('commercial Studio start gate rejects a dead character before gameplay begins',()=>{
  const contract=deriveStudioActualPlayContract({launchCore:['simple exploration'],releaseGates:[]});
  const probe={
    player:{characterPresent:true,humanoidPresent:true,rootPresent:true,rootX:0,rootY:5,rootZ:0,health:0,maxHealth:100,humanoidState:'Enum.HumanoidStateType.Dead',animatorPresent:true,motorCount:6},
    camera:{present:true,subjectPresent:true,fieldOfView:70,occluded:false},
    ui:{visibleButtons:0,visibleObjects:0,visibleTexts:[],interactive:[],offscreenButtons:0,undersizedTouchButtons:0,textOverflowButtons:0,overlapPairs:0,largeOverlayCount:0,largeBlockingOverlayCount:0,largestOverlayCoverage:0,required:{}},
    world:{boundsFinite:true,collidablePartCount:40,floorBelowPlayer:true,floorSampleCount:9,floorHitCount:9,routeSampleCount:0,routeSuccessCount:0,minSpawnThreatDistance:-1,proximityPromptCount:0,clickDetectorCount:0,mobs:[],npcs:[],companions:[],items:[],environmentModels:1,effectCount:0},
    runtime:{remoteCount:1,progression:[],inventory:[],inventoryCount:0,systemSignals:1,descendantCount:100,memoryMb:100,soundCount:0,categories:{}},
    workspace:{},lighting:{brightness:1.2}
  };
  const result=evaluateStudioActualPlayContract({
    contract,initialClientProbe:probe,preActionClientProbe:probe,postActionClientProbe:probe,
    clientProbe:probe,serverProbe:{runtime:probe.runtime,world:probe.world,workspace:{}},
    actions:[]
  });
  assert.equal(result.scenarios.find(row=>row.id==='adaptive-start-playability')?.pass,false);
  assert.ok(result.qualityFailureKinds.includes('adaptive-start-playability'));
  assert.equal(result.qualityFailureDetails.find(row=>row.id==='adaptive-start-playability')?.repairSurface,'GAME_START');
});

test('commercial Studio UI gate rejects a persistent full-screen blocking guide or modal',()=>{
  const contract=deriveStudioActualPlayContract({launchCore:['mobile UI simple exploration'],releaseGates:[]});
  const probe={
    player:{characterPresent:true,humanoidPresent:true,rootPresent:true,rootX:0,rootY:5,rootZ:0,health:100,maxHealth:100,humanoidState:'Enum.HumanoidStateType.Running',animatorPresent:true,motorCount:6},
    camera:{present:true,subjectPresent:true,fieldOfView:70,occluded:false},
    ui:{visibleButtons:0,visibleObjects:2,visibleTexts:[{name:'Guide',text:'안내'}],interactive:[],offscreenButtons:0,undersizedTouchButtons:0,textOverflowButtons:0,overlapPairs:0,largeOverlayCount:1,largeBlockingOverlayCount:1,largestOverlayCoverage:0.92,required:{}},
    world:{boundsFinite:true,collidablePartCount:40,floorBelowPlayer:true,floorSampleCount:9,floorHitCount:9,routeSampleCount:0,routeSuccessCount:0,minSpawnThreatDistance:-1,proximityPromptCount:0,clickDetectorCount:0,mobs:[],npcs:[],companions:[],items:[],environmentModels:1,effectCount:0},
    runtime:{remoteCount:1,progression:[],inventory:[],inventoryCount:0,systemSignals:1,descendantCount:100,memoryMb:100,soundCount:0,categories:{}},
    workspace:{},lighting:{brightness:1.2}
  };
  const result=evaluateStudioActualPlayContract({
    contract,initialClientProbe:probe,preActionClientProbe:probe,
    postActionClientProbe:{...probe,player:{...probe.player,rootX:1}},
    clientProbe:probe,serverProbe:{runtime:probe.runtime,world:probe.world,workspace:{}},
    actions:[{id:'keyboard-w',dispatched:true,ok:true}]
  });
  assert.equal(result.scenarios.find(row=>row.id==='adaptive-ui-blocking-overlay')?.pass,false);
  assert.ok(result.qualityFailureKinds.includes('adaptive-ui-blocking-overlay'));
  assert.equal(result.qualityFailureDetails.find(row=>row.id==='adaptive-ui-blocking-overlay')?.repairSurface,'MOBILE_UI');
});

test('dead-start Studio product evidence enters repair-required instead of infrastructure-pending',()=>{
  const broken=runtime();
  broken.runtimeVerified=false;
  broken.scenarioContractRequired=true;
  broken.scenarioCoverage=[{id:'adaptive-start-playability',pass:false}];
  broken.qualityFailureKinds=['adaptive-start-playability'];
  broken.qualityFailureDetails=[{id:'adaptive-start-playability',repairSurface:'GAME_START',priority:'CRITICAL',hint:'Restore playable spawn',observed:{health:0,humanoidState:'Dead'}}];
  broken.errors=[{type:'studio-product-start-playability-error',signature:'ROBLOX_STUDIO_DEAD_CHARACTER_ABORT:INITIAL_CHARACTER_NOT_PLAYABLE'}];
  const applied=applyLocalStudioPlayResult({
    queue:{items:[item()]},gameId:'g1',runtime:broken,expected,workflowRunId:85,studioStepSucceeded:false,
    testedAt:'2026-09-29T00:01:00.000Z'
  });
  assert.equal(applied.result.evidence.infrastructureFailure,false);
  assert.equal(applied.item.currentStep,'REPAIR_REQUIRED');
  assert.equal(applied.item.canonicalState,'REPAIR_REQUIRED');
  assert.ok(applied.item.robloxQualityBuildUpEvidence.repairSurfaces.includes('GAME_START'));
});

test('Studio startup probe explicitly checks dead spawn, start buttons, and blocking overlays before normal QA',()=>{
  assert.match(helper,/ROBLOX_STUDIO_DEAD_CHARACTER_ABORT:INITIAL_CHARACTER_NOT_PLAYABLE/);
  assert.match(helper,/initial-character-playable/);
  assert.match(helper,/ui-start-gate/);
  assert.match(helper,/start\|play\|begin\|continue\|ready\|시작\|플레이\|계속\|준비/);
  assert.match(helper,/startGateProbe=await collectStudioActualPlayProbe/);
  assert.match(helper,/clean\(row\?\.text\)!==primaryTextBeforeStart/);
  assert.match(helper,/largeOverlayCount/);
  assert.match(helper,/largeBlockingOverlayCount/);
  assert.match(helper,/largestOverlayCoverage/);
  assert.match(helper,/adaptive-ui-blocking-overlay/);
});

test('large overlay detection uses actual panel or image opacity and does not treat transparent full-screen text alone as an occluder',()=>{
  const start=helper.indexOf('local gui={screenGuiPresent=false');
  const end=helper.indexOf('local root=nil',start);
  const block=helper.slice(start,end);
  assert.match(block,/BackgroundTransparency<0\.85/);
  assert.match(block,/ImageTransparency<0\.85/);
  assert.doesNotMatch(block,/TextTransparency<0\.85/);
});

test('commercial Studio evaluator records progression and AI movement deltas',()=>{
  const contract=deriveStudioActualPlayContract({
    launchCore:['monster combat','companion AI','quest reward progression','mobile UI'],
    releaseGates:[]
  });
  const base={
    player:{characterPresent:true,humanoidPresent:true,rootPresent:true,rootX:0,rootY:5,rootZ:0,animatorPresent:true,motorCount:6},
    camera:{present:true,subjectPresent:true,fieldOfView:70},
    ui:{visibleButtons:2,offscreenButtons:0,undersizedTouchButtons:0,textOverflowButtons:0,overlapPairs:0,required:{}},
    world:{boundsFinite:true,collidablePartCount:100,floorBelowPlayer:true,proximityPromptCount:1,clickDetectorCount:0,
      mobs:[{name:'EnemyA',x:0,y:3,z:10,hp:100,state:'CHASE',target:'P1'}],
      companions:[{name:'CompanionA',x:0,y:3,z:1,hp:100,state:'FOLLOW',target:'EnemyA'}],
      npcs:[],items:[],environmentModels:1,effectCount:1},
    runtime:{remoteCount:1,progression:[{scope:'player',name:'QuestProgress',value:'0'},{scope:'player',name:'Gold',value:'10'}],systemSignals:8,descendantCount:600,memoryMb:240,soundCount:1,categories:{quest:1,reward:1,progression:1,combat:1,companion:1}},
    workspace:{},
    lighting:{brightness:1.5}
  };
  const final=structuredClone(base);
  final.world.mobs[0].x=4;final.world.mobs[0].hp=80;final.world.companions[0].x=3;
  final.runtime.progression[0].value='1';final.runtime.progression[1].value='25';
  const png=Buffer.alloc(4096);Buffer.from('89504e470d0a1a0a','hex').copy(png,0);png.writeUInt32BE(640,16);png.writeUInt32BE(360,20);
  const image={type:'image',mimeType:'image/png',data:png.toString('base64')};
  const result=evaluateStudioActualPlayContract({
    contract,
    initialClientProbe:base,
    preActionClientProbe:base,
    postActionClientProbe:{...final,player:{...final.player,rootX:2}},
    clientProbe:final,
    serverProbe:{runtime:final.runtime,world:final.world,workspace:{}},
    actions:[{id:'keyboard-w',dispatched:true,ok:true}],
    beforeImages:[image],
    afterImages:[image]
  });
  assert.equal(result.metrics.progressChanged,true);
  assert.equal(result.metrics.mobMotion.dynamic,true);
  assert.equal(result.metrics.companionMotion.dynamic,true);
  assert.equal(result.authoritativeStateChangeObserved,true);
});


test('commercial Studio baseline turns disappearing verified gameplay surfaces into repair-required regression',()=>{
  const candidate=item();
  candidate.robloxInternalVibePlayEvidence={
    pass:true,
    runtimeSummary:{
      commercialAudit:{
        uiCommercial:{offscreenButtons:0,undersizedTouchButtons:0,textOverflowButtons:0},
        surfaces:{
          interactionSurfaceCount:3,
          progressionSurfaceCount:4,
          combatSurfaceCount:2,
          npcSurfaceCount:2,
          companionSurfaceCount:1,
          itemSurfaceCount:3,
          remoteCount:1,
          soundCount:2,
          effectCount:2,
          promptCount:2
        }
      }
    }
  };
  const observed=runtime();
  observed.metrics={
    ...observed.metrics,
    auditProfile:'FAST_DEEP',
    uiCommercial:{offscreenButtons:0,undersizedTouchButtons:0,textOverflowButtons:0},
    surfaces:{
      interactionSurfaceCount:3,
      progressionSurfaceCount:4,
      combatSurfaceCount:2,
      npcSurfaceCount:0,
      companionSurfaceCount:0,
      itemSurfaceCount:3,
      remoteCount:1,
      soundCount:2,
      effectCount:2,
      promptCount:2
    },
    performance:{memoryMb:200,descendantCount:500}
  };
  const applied=applyLocalStudioPlayResult({
    queue:{items:[candidate]},gameId:'g1',runtime:observed,expected,workflowRunId:1200,studioStepSucceeded:true,
    testedAt:'2026-09-29T04:00:00.000Z'
  });
  assert.equal(applied.result.pass,false);
  assert.equal(applied.result.evidence.commercialRegressionDetected,true);
  assert.ok(applied.result.evidence.qualityFailureKinds.includes('commercial-regression-npcSurfaceCount'));
  assert.ok(applied.result.evidence.qualityFailureKinds.includes('commercial-regression-companionSurfaceCount'));
  assert.equal(applied.item.robloxQualityBuildUpRequired,true);
  assert.equal(applied.item.canonicalState,'REPAIR_REQUIRED');
  assert.ok(applied.item.robloxQualityBuildUpEvidence.repairSurfaces.includes('NPC'));
  assert.ok(applied.item.robloxQualityBuildUpEvidence.repairSurfaces.includes('COMPANION_AI'));
});

test('runtime-discovered systems activate adaptive gates even when launch text did not declare them',()=>{
  const contract=deriveStudioActualPlayContract({launchCore:['simple exploration'],releaseGates:[]});
  const png=Buffer.alloc(4096);Buffer.from('89504e470d0a1a0a','hex').copy(png,0);png.writeUInt32BE(640,16);png.writeUInt32BE(360,20);
  const image={type:'image',mimeType:'image/png',data:png.toString('base64')};
  const probe={
    player:{characterPresent:true,humanoidPresent:true,rootPresent:true,rootX:0,rootY:4,rootZ:0,animatorPresent:true,motorCount:6},
    camera:{present:true,subjectPresent:true,fieldOfView:70},
    ui:{visibleButtons:1,visibleObjects:2,offscreenButtons:0,undersizedTouchButtons:0,textOverflowButtons:0,overlapPairs:0,required:{}},
    world:{boundsFinite:true,collidablePartCount:20,floorBelowPlayer:true,proximityPromptCount:1,clickDetectorCount:0,mobs:[],npcs:[{name:'Merchant'}],companions:[],items:[],environmentModels:1,effectCount:0},
    runtime:{remoteCount:1,progression:[],inventory:[],inventoryCount:0,systemSignals:1,descendantCount:100,memoryMb:100,soundCount:0,categories:{npc:1}},
    workspace:{},
    lighting:{brightness:1.2}
  };
  const result=evaluateStudioActualPlayContract({
    contract,initialClientProbe:probe,preActionClientProbe:probe,postActionClientProbe:{...probe,player:{...probe.player,rootX:1}},
    clientProbe:probe,serverProbe:{runtime:probe.runtime,world:probe.world,workspace:{}},
    actions:[{id:'keyboard-w',dispatched:true,ok:true}],beforeImages:[image],afterImages:[image]
  });
  assert.equal(result.scenarios.find(row=>row.id==='adaptive-npc-surface')?.pass,true);
  assert.equal(result.scenarios.find(row=>row.id==='adaptive-remote-surface')?.pass,true);
});


test('F9 planner upgrades a prior FAST_DEEP Studio pass to required F9_SOAK on the same exact artifact',()=>{
  const candidate=item();
  candidate.currentStep='FINAL_REVIEW';
  candidate.robloxInternalVibePlayEvidence={
    pass:true,actualPlay:true,runtimeVerified:true,officialStudioMcp:true,localPlaceFile:true,
    onlinePlaceDirectOpen:false,robloxPlayerAutomation:false,
    sourceRevision:source,artifactIdentity:artifact,artifactRunId:777,universeId:'123',placeId:'456',versionNumber:9,
    runtimeSummary:{consoleErrorCount:0,commercialAudit:{auditProfile:'FAST_DEEP'}},
    testedAt:'2026-09-29T00:00:00.000Z'
  };
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'roblox-studio-f9-soak-'));
  try{
    const gameRoot=path.join(root,'roblox-games','g1');
    fs.mkdirSync(gameRoot,{recursive:true});
    fs.writeFileSync(path.join(gameRoot,'launch-mvp.json'),JSON.stringify({launchCore:['combat','quest'],releaseGates:['F9 regression']}));
    const planned=planLocalStudioCandidates({queue:{items:[candidate]},roadmap:roadmap(),repoRoot:root});
    assert.equal(planned.include.length,1);
    assert.equal(planned.include[0].auditProfile,'F9_SOAK');
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
});

test('commercial world audit rejects broad floor gaps and unreachable semantic gameplay anchors',()=>{
  const contract=deriveStudioActualPlayContract({launchCore:['large map','NPC quest interaction'],releaseGates:[]});
  const png=Buffer.alloc(4096);Buffer.from('89504e470d0a1a0a','hex').copy(png,0);png.writeUInt32BE(640,16);png.writeUInt32BE(360,20);
  const image={type:'image',mimeType:'image/png',data:png.toString('base64')};
  const probe={
    player:{characterPresent:true,humanoidPresent:true,rootPresent:true,rootX:0,rootY:5,rootZ:0,animatorPresent:true,motorCount:6},
    camera:{present:true,subjectPresent:true,fieldOfView:70},
    ui:{visibleButtons:1,visibleObjects:2,offscreenButtons:0,undersizedTouchButtons:0,textOverflowButtons:0,overlapPairs:0,required:{}},
    world:{
      boundsFinite:true,collidablePartCount:100,floorBelowPlayer:true,
      floorSampleCount:9,floorHitCount:2,routeSampleCount:6,routeSuccessCount:1,
      minSpawnThreatDistance:-1,proximityPromptCount:1,clickDetectorCount:0,
      mobs:[],npcs:[{name:'QuestNPC'}],companions:[],items:[],environmentModels:2,effectCount:0
    },
    runtime:{remoteCount:1,progression:[{scope:'player',name:'QuestProgress',value:'0'}],systemSignals:4,descendantCount:300,memoryMb:180,categories:{quest:1,progression:1,npc:1}},
    workspace:{},
    lighting:{brightness:1.2}
  };
  const result=evaluateStudioActualPlayContract({
    contract,initialClientProbe:probe,preActionClientProbe:probe,
    postActionClientProbe:{...probe,player:{...probe.player,rootX:1}},
    clientProbe:probe,serverProbe:{runtime:probe.runtime,world:probe.world,workspace:{}},
    actions:[{id:'keyboard-w',dispatched:true,ok:true}],beforeImages:[image],afterImages:[image]
  });
  assert.ok(result.qualityFailureKinds.includes('adaptive-world-safety'));
  assert.equal(result.metrics.worldAudit.floorCoveragePass,false);
  assert.equal(result.metrics.worldAudit.routeCoveragePass,false);
});


test('commercial Studio multiplayer gate requires declared multiplayer plus replicated state surface',()=>{
  const contract=deriveStudioActualPlayContract({
    launchCore:['4-player co-op dungeon party sync'],
    releaseGates:['late join and rejoin sync']
  });
  const base={
    player:{characterPresent:true,humanoidPresent:true,rootPresent:true,rootX:0,rootY:5,rootZ:0,animatorPresent:true,motorCount:6,humanCount:0,monsterCount:0},
    camera:{present:true,subjectPresent:true,fieldOfView:70,occluded:false},
    ui:{visibleButtons:1,visibleObjects:1,offscreenButtons:0,undersizedTouchButtons:0,textOverflowButtons:0,overlapPairs:0,required:{}},
    world:{boundsFinite:true,collidablePartCount:40,floorBelowPlayer:true,floorSampleCount:9,floorHitCount:9,routeSampleCount:0,routeSuccessCount:0,minSpawnThreatDistance:-1,proximityPromptCount:0,clickDetectorCount:0,mobs:[],npcs:[],companions:[],items:[],environmentModels:1,effectCount:0},
    runtime:{remoteCount:1,progression:[],inventory:[],inventoryCount:0,systemSignals:1,descendantCount:100,memoryMb:100,soundCount:0,categories:{}},
    workspace:{HumanCount:0,MonsterCount:0},
    lighting:{brightness:1.2}
  };
  const fail=evaluateStudioActualPlayContract({
    contract,initialClientProbe:base,preActionClientProbe:base,
    postActionClientProbe:{...base,player:{...base.player,rootX:1}},
    clientProbe:base,serverProbe:{runtime:base.runtime,world:base.world,workspace:base.workspace},
    actions:[{id:'keyboard-w',dispatched:true,ok:true}]
  });
  assert.equal(fail.scenarios.find(row=>row.id==='adaptive-multiplayer-sync-surface')?.pass,false);

  const synced=structuredClone(base);
  synced.player.humanCount=4;
  synced.workspace.HumanCount=4;
  synced.runtime.progression=[{scope:'workspace',name:'PlayerCount',value:'4'}];
  const pass=evaluateStudioActualPlayContract({
    contract,initialClientProbe:synced,preActionClientProbe:synced,
    postActionClientProbe:{...synced,player:{...synced.player,rootX:1}},
    clientProbe:synced,serverProbe:{runtime:synced.runtime,world:synced.world,workspace:synced.workspace},
    actions:[{id:'keyboard-w',dispatched:true,ok:true}]
  });
  assert.equal(pass.scenarios.find(row=>row.id==='adaptive-multiplayer-sync-surface')?.pass,true);
});

test('commercial contract does not infer multiplayer from generic player or monster words alone',()=>{
  const contract=deriveStudioActualPlayContract({
    launchCore:['single player fights one monster'],
    releaseGates:[]
  });
  assert.equal(contract.adaptiveCoverage.signals.multiplayer,false);
});


test('F9 Studio multiplayer helper is defined and drives StudioTestService late-join leave lifecycle',async()=>{
  assert.match(helper,/export async function runStudioMultiplayerAudit/);
  assert.match(helper,/ExecuteMultiplayerTestAsync\(1,token\)/);
  assert.match(helper,/StudioTestService:AddPlayers\(1\)/);
  assert.match(helper,/StudioTestService:CanLeaveTest\(\)/);
  assert.match(helper,/StudioTestService:LeaveTest\(\)/);
  assert.match(helper,/StudioTestService:EndTest/);
  assert.match(helper,/const stopTool=client\.tool\('start_stop_play'\)/);
  assert.ok(helper.indexOf('export async function runStudioMultiplayerAudit')<helper.indexOf('multiplayerAuditSummary=await runStudioMultiplayerAudit'));

  const schema={
    type:'object',
    required:['studio_id','code','data_model_type'],
    properties:{
      studio_id:{type:'string'},
      code:{type:'string'},
      data_model_type:{type:'string',enum:['Edit','Server','Client']}
    }
  };
  let serverProbeCount=0;
  const response=text=>({content:[{type:'text',text}]});
  const fakeClient={
    tool(name){
      assert.equal(name,'execute_luau');
      return{inputSchema:schema};
    },
    async call(name,args){
      assert.equal(name,'execute_luau');
      const code=String(args.code||'');
      const context=String(args.data_model_type||'');
      if(context==='Edit'&&code.includes('ROBLOX_STUDIO_MULTIPLAYER_START=')){
        return response('ROBLOX_STUDIO_MULTIPLAYER_START='+JSON.stringify({started:true,token:'VIBE2_F9_MULTIPLAYER_TEST'}));
      }
      if(context==='Server'&&code.includes('ROBLOX_STUDIO_MULTIPLAYER_ADD=')){
        return response('ROBLOX_STUDIO_MULTIPLAYER_ADD='+JSON.stringify({ok:true,error:''}));
      }
      if(context==='Client'&&code.includes('ROBLOX_STUDIO_MULTIPLAYER_CAN_LEAVE=')){
        return response('ROBLOX_STUDIO_MULTIPLAYER_CAN_LEAVE='+JSON.stringify({ok:true,canLeave:true}));
      }
      if(context==='Client'&&code.includes('ROBLOX_STUDIO_MULTIPLAYER_LEAVE=')){
        return response('ROBLOX_STUDIO_MULTIPLAYER_LEAVE='+JSON.stringify({ok:true}));
      }
      if(context==='Server'&&code.includes('ROBLOX_STUDIO_MULTIPLAYER_END=')){
        return response('ROBLOX_STUDIO_MULTIPLAYER_END='+JSON.stringify({ok:true}));
      }
      if(context==='Client'&&code.includes('ROBLOX_STUDIO_MULTIPLAYER_CLIENT=')){
        return response('ROBLOX_STUDIO_MULTIPLAYER_CLIENT='+JSON.stringify({
          count:2,remoteCount:3,
          players:[{name:'Player1',userId:1},{name:'Player2',userId:2}]
        }));
      }
      if(context==='Server'&&code.includes('ROBLOX_STUDIO_MULTIPLAYER_SERVER=')){
        serverProbeCount++;
        if(serverProbeCount===1){
          return response('ROBLOX_STUDIO_MULTIPLAYER_SERVER='+JSON.stringify({
            count:1,remoteCount:3,testArgsReadable:true,
            players:[{name:'Player1',userId:1}]
          }));
        }
        if(serverProbeCount===2){
          return response('ROBLOX_STUDIO_MULTIPLAYER_SERVER='+JSON.stringify({
            count:2,remoteCount:3,testArgsReadable:true,
            players:[{name:'Player1',userId:1},{name:'Player2',userId:2}]
          }));
        }
        return response('ROBLOX_STUDIO_MULTIPLAYER_SERVER='+JSON.stringify({
          count:1,remoteCount:3,testArgsReadable:true,
          players:[{name:'Player2',userId:2}]
        }));
      }
      throw new Error('unexpected fake MCP call '+context+' '+code.slice(0,80));
    }
  };

  const result=await runStudioMultiplayerAudit(fakeClient,'studio-1',{
    adaptiveCoverage:{contractHash:'sha256:abc123'}
  });
  assert.equal(result.infrastructureFailure,false);
  assert.equal(result.initialServerCount,1);
  assert.equal(result.lateServerCount,2);
  assert.equal(result.clientPlayerCount,2);
  assert.equal(result.clientRosterPass,true);
  assert.equal(result.remoteSurfacePass,true);
  assert.equal(result.leavePass,true);
  assert.equal(result.pass,true);
});

test('F9 Studio multiplayer helper cannot pass a mismatched client roster as synchronized multiplayer',async()=>{
  const schema={
    type:'object',
    required:['studio_id','code','data_model_type'],
    properties:{
      studio_id:{type:'string'},
      code:{type:'string'},
      data_model_type:{type:'string',enum:['Edit','Server','Client']}
    }
  };
  let serverProbeCount=0;
  const response=text=>({content:[{type:'text',text}]});
  const fakeClient={
    tool(){return{inputSchema:schema};},
    async call(name,args){
      const code=String(args.code||''),context=String(args.data_model_type||'');
      if(context==='Edit'&&code.includes('ROBLOX_STUDIO_MULTIPLAYER_START='))return response('ROBLOX_STUDIO_MULTIPLAYER_START='+JSON.stringify({started:true}));
      if(context==='Server'&&code.includes('ROBLOX_STUDIO_MULTIPLAYER_ADD='))return response('ROBLOX_STUDIO_MULTIPLAYER_ADD='+JSON.stringify({ok:true}));
      if(context==='Server'&&code.includes('ROBLOX_STUDIO_MULTIPLAYER_END='))return response('ROBLOX_STUDIO_MULTIPLAYER_END='+JSON.stringify({ok:true}));
      if(context==='Server'&&code.includes('ROBLOX_STUDIO_MULTIPLAYER_SERVER=')){
        serverProbeCount++;
        return response('ROBLOX_STUDIO_MULTIPLAYER_SERVER='+JSON.stringify({
          count:serverProbeCount===1?1:2,remoteCount:2,
          players:serverProbeCount===1?[{name:'Player1'}]:[{name:'Player1'},{name:'Player2'}]
        }));
      }
      if(context==='Client'&&code.includes('ROBLOX_STUDIO_MULTIPLAYER_CLIENT=')){
        return response('ROBLOX_STUDIO_MULTIPLAYER_CLIENT='+JSON.stringify({
          count:2,remoteCount:2,players:[{name:'Other1'},{name:'Other2'}]
        }));
      }
      throw new Error('fake-client-replication-missing');
    }
  };
  const result=await runStudioMultiplayerAudit(fakeClient,'studio-2',{adaptiveCoverage:{contractHash:'x'}});
  assert.equal(result.pass,false);
  assert.equal(result.infrastructureFailure,true);
  assert.match(result.error,/CLIENT_REPLICATION_NOT_OBSERVED|fake-client-replication-missing/);
});

test('commercial F9 multiplayer requires actual two-player synchronized Studio evidence',()=>{
  const contract=deriveStudioActualPlayContract({
    launchCore:['multiplayer team sync','mobile HUD'],
    releaseGates:['2+ players actual sync']
  });
  const png=Buffer.alloc(4096);Buffer.from('89504e470d0a1a0a','hex').copy(png,0);png.writeUInt32BE(640,16);png.writeUInt32BE(360,20);
  const image={type:'image',mimeType:'image/png',data:png.toString('base64')};
  const makeProbe=(count,roundState='LOBBY')=>({
    player:{characterPresent:true,humanoidPresent:true,rootPresent:true,rootX:0,rootY:5,rootZ:0,animatorPresent:true,motorCount:6,roundState,humanCount:count,monsterCount:0},
    camera:{present:true,subjectPresent:true,fieldOfView:70,occluded:false},
    ui:{visibleButtons:1,visibleObjects:2,offscreenButtons:0,undersizedTouchButtons:0,textOverflowButtons:0,overlapPairs:0,required:{}},
    world:{boundsFinite:true,collidablePartCount:50,floorBelowPlayer:true,proximityPromptCount:0,clickDetectorCount:0,mobs:[],npcs:[],companions:[],items:[],environmentModels:1,effectCount:0},
    runtime:{
      actualPlayerCount:count,
      players:Array.from({length:count},(_,i)=>({userId:i+1,name:'P'+(i+1),roundState,role:'PLAYER',team:'Blue',currentMap:'Arena',humanCount:count,monsterCount:0})),
      remoteCount:2,progression:[{scope:'workspace',name:'PlayerCount',value:String(count)}],inventory:[],inventoryCount:0,
      systemSignals:2,descendantCount:300,memoryMb:160,soundCount:0,categories:{progression:1}
    },
    workspace:{HumanCount:count,MonsterCount:0},
    lighting:{brightness:1.5}
  });
  const single=makeProbe(1,'LOBBY');
  const singleResult=evaluateStudioActualPlayContract({
    contract,initialClientProbe:single,preActionClientProbe:single,
    postActionClientProbe:{...single,player:{...single.player,rootX:1}},
    clientProbe:single,serverProbe:{runtime:single.runtime,world:single.world,workspace:single.workspace},
    actions:[{id:'keyboard-w',dispatched:true,ok:true}],beforeImages:[image],afterImages:[image],
    timelineProbes:[single],auditProfile:'F9_SOAK'
  });
  assert.equal(singleResult.scenarios.find(row=>row.id==='adaptive-multiplayer-sync-surface')?.pass,false);

  const twoLobby=makeProbe(2,'LOBBY');
  const twoRunning=makeProbe(2,'RUNNING');
  const multiResult=evaluateStudioActualPlayContract({
    contract,initialClientProbe:twoLobby,preActionClientProbe:twoLobby,
    postActionClientProbe:{...twoRunning,player:{...twoRunning.player,rootX:1}},
    clientProbe:twoRunning,serverProbe:{runtime:twoRunning.runtime,world:twoRunning.world,workspace:twoRunning.workspace},
    actions:[{id:'keyboard-w',dispatched:true,ok:true}],beforeImages:[image],afterImages:[image],
    timelineProbes:[twoRunning],auditProfile:'F9_SOAK'
  });
  assert.equal(multiResult.scenarios.find(row=>row.id==='adaptive-multiplayer-sync-surface')?.pass,true);
  assert.equal(multiResult.metrics.surfaces.maxActualPlayerCount,2);
  assert.equal(multiResult.metrics.surfaces.multiplayerActualSessionPass,true);
});


test('commercial Studio FTUE gate requires actionable readable onboarding when declared',()=>{
  const contract=deriveStudioActualPlayContract({launchCore:['mobile loading screen and tutorial objective'],releaseGates:[]});
  const base={
    player:{characterPresent:true,humanoidPresent:true,rootPresent:true,rootX:0,rootY:5,rootZ:0,animatorPresent:true,motorCount:6},
    camera:{present:true,subjectPresent:true,fieldOfView:70,occluded:false},
    ui:{visibleButtons:1,visibleObjects:2,visibleTexts:[{name:'Title',text:'포근섬'}],offscreenButtons:0,undersizedTouchButtons:0,textOverflowButtons:0,overlapPairs:0,required:{}},
    world:{boundsFinite:true,collidablePartCount:40,floorBelowPlayer:true,floorSampleCount:9,floorHitCount:9,routeSampleCount:0,routeSuccessCount:0,minSpawnThreatDistance:-1,proximityPromptCount:0,clickDetectorCount:0,mobs:[],npcs:[],companions:[],items:[],environmentModels:1,effectCount:0},
    runtime:{remoteCount:1,progression:[],inventory:[],inventoryCount:0,systemSignals:1,descendantCount:100,memoryMb:100,soundCount:0,categories:{}},
    workspace:{},lighting:{brightness:1.2}
  };
  const fail=evaluateStudioActualPlayContract({
    contract,initialClientProbe:base,preActionClientProbe:base,
    postActionClientProbe:{...base,player:{...base.player,rootX:1}},
    clientProbe:base,serverProbe:{runtime:base.runtime,world:base.world,workspace:{}},
    actions:[{id:'keyboard-w',dispatched:true,ok:true}]
  });
  assert.equal(fail.scenarios.find(row=>row.id==='adaptive-ftue-clarity')?.pass,false);
  const ready=structuredClone(base);
  ready.ui.visibleTexts=[{name:'Title',text:'포근섬'},{name:'Guide',text:'게임 시작 후 목표를 확인하고 이동해.'}];
  const pass=evaluateStudioActualPlayContract({
    contract,initialClientProbe:ready,preActionClientProbe:ready,
    postActionClientProbe:{...ready,player:{...ready.player,rootX:1}},
    clientProbe:ready,serverProbe:{runtime:ready.runtime,world:ready.world,workspace:{}},
    actions:[{id:'keyboard-w',dispatched:true,ok:true}]
  });
  assert.equal(pass.scenarios.find(row=>row.id==='adaptive-ftue-clarity')?.pass,true);
});

test('commercial system transaction gate fails when a discovered shop action has no effect',()=>{
  const contract=deriveStudioActualPlayContract({launchCore:['shop inventory equip UI'],releaseGates:[]});
  const probe={
    player:{characterPresent:true,humanoidPresent:true,rootPresent:true,rootX:0,rootY:5,rootZ:0,animatorPresent:true,motorCount:6},
    camera:{present:true,subjectPresent:true,fieldOfView:70,occluded:false},
    ui:{visibleButtons:1,visibleObjects:1,visibleTexts:[{name:'Shop',text:'상점'}],offscreenButtons:0,undersizedTouchButtons:0,textOverflowButtons:0,overlapPairs:0,required:{}},
    world:{boundsFinite:true,collidablePartCount:40,floorBelowPlayer:true,floorSampleCount:9,floorHitCount:9,routeSampleCount:0,routeSuccessCount:0,minSpawnThreatDistance:-1,proximityPromptCount:1,clickDetectorCount:0,mobs:[],npcs:[],companions:[],items:[],environmentModels:1,effectCount:0},
    runtime:{remoteCount:1,progression:[],inventory:[],inventoryCount:0,systemSignals:2,descendantCount:100,memoryMb:100,soundCount:0,categories:{economy:1,inventory:1}},
    workspace:{},lighting:{brightness:1.2}
  };
  const result=evaluateStudioActualPlayContract({
    contract,initialClientProbe:probe,preActionClientProbe:probe,
    postActionClientProbe:{...probe,player:{...probe.player,rootX:1}},
    clientProbe:probe,serverProbe:{runtime:probe.runtime,world:probe.world,workspace:{}},
    actions:[{id:'shop-buy',type:'mcp-world-interaction',semantic:'SHOP',dispatched:true,ok:true,effectObserved:false,effect:{}}]
  });
  assert.equal(result.scenarios.find(row=>row.id==='adaptive-system-transaction-effect')?.pass,false);
  assert.ok(result.qualityFailureKinds.includes('adaptive-system-transaction-effect'));
});


test('commercial Studio probes are split into parser-safe core world and runtime Luau chunks',()=>{
  const start=helper.indexOf("function studioActualPlayCoreProbeSource");
  const end=helper.indexOf("function pointDistance",start);
  assert.ok(start>=0&&end>start);
  const block=helper.slice(start,end);
  assert.match(block,/ROBLOX_STUDIO_ACTUAL_PLAY_CORE=/);
  assert.match(block,/ROBLOX_STUDIO_ACTUAL_PLAY_WORLD=/);
  assert.match(block,/ROBLOX_STUDIO_ACTUAL_PLAY_RUNTIME=/);
  assert.match(block,/const segments=\[/);
  assert.doesNotMatch(block,/function studioActualPlayProbeSource\(/);
  assert.doesNotMatch(block,/\+=/);
  assert.ok(block.indexOf('local function attr')<block.indexOf('roundState=attr('));
});

test('Studio evidence push conflicts reapply onto latest company-runtime instead of rebasing JSON',()=>{
  const persistStart=workflow.indexOf('- name: Persist exact Studio MCP play evidence');
  const persistEnd=workflow.indexOf('- name: Refill existing 24H development loop after verified play',persistStart);
  assert.ok(persistStart>=0&&persistEnd>persistStart);
  const block=workflow.slice(persistStart,persistEnd);
  assert.match(block,/ROBLOX_STUDIO_MCP_RUNTIME_PUSH_CONFLICT=REAPPLY_LATEST/);
  assert.match(block,/git -C runtime reset --hard origin\/company-runtime/);
  assert.match(block,/Studio MCP evidence reapply on latest runtime failed/);
  assert.doesNotMatch(block,/git -C runtime rebase origin\/company-runtime/);
});


test('Studio retry preserves a verified product failure instead of letting later MCP infrastructure noise overwrite repair routing',()=>{
  const block=workflow.slice(workflow.indexOf('- name: Run actual local play through official Studio MCP'),workflow.indexOf('- name: Finalize Studio session after final capture'));
  assert.match(block,/\$productFailureObserved = \$false/);
  assert.match(block,/ROBLOX_STUDIO_MCP_PRODUCT_FAILURE_PRESERVED=YES/);
  assert.match(block,/\^studio-product-/);
  const productThrow=block.indexOf('official Roblox Studio product failure preserved for repair');
  const timeoutThrow=block.indexOf('official Roblox Studio MCP tool provider timed out after 3 clean Studio sessions');
  assert.ok(productThrow>=0&&timeoutThrow>productThrow);
  const preservedAt=block.indexOf('ROBLOX_STUDIO_MCP_PRODUCT_FAILURE_PRESERVED=YES');
  const restartAt=block.indexOf('ROBLOX_STUDIO_MCP_SESSION_RESTART=$attempt',preservedAt);
  assert.ok(preservedAt>=0);
  assert.ok(restartAt<0||block.lastIndexOf('break',restartAt)>preservedAt);
});

test('stale Studio workflow runs abort before opening Studio',()=>{
  const cwd=fs.mkdtempSync(path.join(os.tmpdir(),'studio-head-'));
  const repoDir=path.join(cwd,'repo');
  fs.mkdirSync(repoDir,{recursive:true});
  assert.equal(spawnSync('git',['init'],{cwd:repoDir,encoding:'utf8'}).status,0);
  assert.equal(spawnSync('git',['config','user.email','qa@example.com'],{cwd:repoDir,encoding:'utf8'}).status,0);
  assert.equal(spawnSync('git',['config','user.name','qa'],{cwd:repoDir,encoding:'utf8'}).status,0);
  fs.writeFileSync(path.join(repoDir,'a.txt'),'x');
  assert.equal(spawnSync('git',['add','.'],{cwd:repoDir,encoding:'utf8'}).status,0);
  assert.equal(spawnSync('git',['commit','-m','init'],{cwd:repoDir,encoding:'utf8'}).status,0);
  const head=spawnSync('git',['rev-parse','HEAD'],{cwd:repoDir,encoding:'utf8'}).stdout.trim();
  assert.deepEqual(assertCurrentStudioWorkflowHead({workflowSha:head,checkoutDir:repoDir}),{pass:true,workflowSha:head,checkoutSha:head});
  assert.throws(
    ()=>assertCurrentStudioWorkflowHead({workflowSha:'0'.repeat(40),checkoutDir:repoDir}),
    /ROBLOX_STUDIO_STALE_WORKFLOW_RUN_ABORT/
  );
});

test('mcp-run checks current main head before any Studio MCP play call',()=>{
  const mainAt=helper.indexOf("if(mode==='mcp-run')");
  const guardAt=helper.indexOf('assertCurrentStudioWorkflowHead()',mainAt);
  const playAt=helper.indexOf('runOfficialStudioMcpPlay({',mainAt);
  assert.ok(mainAt>=0&&guardAt>mainAt&&playAt>guardAt);
  assert.match(helper,/ROBLOX_STUDIO_WORKFLOW_HEAD_FRESH=YES/);
});

test('Roblox foundation scan concurrency is stable across main SHAs and force-cancels stale queued Studio runs',()=>{
  assert.match(workflow,/group: roblox-runtime-foundation-\$\{\{ inputs\.game_id \|\| 'scan' \}\}/);
  assert.doesNotMatch(workflow,/group: roblox-runtime-foundation-\$\{\{ inputs\.game_id \|\| github\.sha \}\}/);
  assert.match(workflow,/actions\/runs\/\$run_id\/force-cancel/);
  assert.match(workflow,/ROBLOX_STALE_FOUNDATION_RUN_FORCE_CANCEL_REQUESTED/);
  assert.match(workflow,/\^\(queued\|pending\|requested\|waiting\)\$/);
  assert.match(workflow,/ROBLOX_STALE_FOUNDATION_RUN_NORMAL_CANCEL_CLEANUP_PENDING/);
  const forceAt=workflow.indexOf('actions/runs/$run_id/force-cancel');
  const activeCleanupAt=workflow.indexOf("run_status\" = 'in_progress'",forceAt);
  assert.ok(forceAt>=0&&activeCleanupAt>forceAt);
});

test('Studio screenshots are captured only as the final Studio audit action',()=>{
  assert.doesNotMatch(helper,/viewport-before-captured/);
  assert.doesNotMatch(helper,/checkpoint\('viewport-changed-after-input'/);
  assert.match(helper,/visualCaptureDeferred:true/);
  const consoleAt=helper.indexOf("checkpoint('no-release-blocking-runtime-errors'");
  const finalCaptureAt=helper.indexOf('ROBLOX_STUDIO_MCP_FINAL_CAPTURE=LAST_STUDIO_AUDIT_ACTION');
  assert.ok(consoleAt>=0&&finalCaptureAt>consoleAt);
  const tail=helper.slice(finalCaptureAt,finalCaptureAt+1100);
  assert.match(tail,/start_stop_play/);
  assert.match(tail,/play-mode-stopped/);
});


test('complex Studio routes follow path waypoints and verify actual arrival',()=>{
  assert.match(helper,/pathObj:GetWaypoints\(\)/);
  assert.match(helper,/waypointCount=math\.max\(0,total-1\)/);
  assert.match(helper,/for\(const waypoint of waypoints\)/);
  assert.match(helper,/waypointDistance>6/);
  assert.match(helper,/arrivalDistance<=6/);
  assert.match(helper,/no-reachable-anchor/);
  assert.match(helper,/navOk&&reached&&Number\.isFinite\(arrivalDistance\)&&arrivalDistance<=6/);
  assert.match(helper,/for\(let segment=0;segment<4&&navOk&&!reached;segment\+\+\)/);
});
test('automated Studio close workflow contains one clean close step and one refill step',()=>{
  assert.equal((workflow.match(/- name: Close owned Studio after evidence persistence/g)||[]).length,1);
  assert.equal((workflow.match(/- name: Refill existing 24H development loop after verified play/g)||[]).length,1);
  const closeAt=workflow.indexOf('- name: Close owned Studio after evidence persistence');
  const refillAt=workflow.indexOf('- name: Refill existing 24H development loop after verified play');
  const block=workflow.slice(closeAt,refillAt);
  assert.match(block,/\^\[0-9\]\+\$/);
  assert.doesNotMatch(block,/event_type = 'vibe2-fanin-refill'/);
  assert.doesNotMatch(block,/GH_TOKEN:/);
});

test('final Studio capture requires no user save and closes only after evidence persistence',()=>{
  const finalizeAt=workflow.indexOf('- name: Finalize Studio session after final capture');
  const persistAt=workflow.indexOf('- name: Persist exact Studio MCP play evidence');
  const closeAt=workflow.indexOf('- name: Close owned Studio after evidence persistence');
  const refillAt=workflow.indexOf('- name: Refill existing 24H development loop after verified play');
  assert.ok(finalizeAt>=0&&persistAt>finalizeAt&&closeAt>persistAt&&refillAt>closeAt);
  const finalizeBlock=workflow.slice(finalizeAt,persistAt);
  assert.match(finalizeBlock,/ROBLOX_STUDIO_MANUAL_SAVE_REQUIRED=NO/);
  assert.match(finalizeBlock,/ROBLOX_STUDIO_PLAYTEST_SOURCE_MUTATION_PERSIST=NO/);
  assert.doesNotMatch(finalizeBlock,/Stop-Process/);
  const closeBlock=workflow.slice(closeAt,refillAt);
  assert.match(closeBlock,/Stop-Process -Id \(\[int\]\$ownedId\)/);
  assert.match(closeBlock,/ROBLOX_STUDIO_AUTOMATED_CLOSE_AFTER_EVIDENCE=YES/);
  assert.match(helper,/finally\{\s*client\.close\(\)/);
  assert.match(finalizeBlock,/ROBLOX_STUDIO_MCP_POST_CAPTURE_UI_RELEASED=YES/);
});

test('Studio QA keeps user windows and releases only its exact owned process',()=>{
  const block=workflow.slice(workflow.indexOf('\n  studio-mcp-auto-play:'));
  assert.match(block,/ROBLOX_STUDIO_USER_SESSION_PRESERVED=YES/);
  assert.doesNotMatch(block,/Get-Process RobloxStudioBeta -ErrorAction SilentlyContinue \| Stop-Process/);
  assert.match(block,/\$ownedStudioIds = @\(\[string\]\$studioProcess\.Id\)/);
  assert.equal((block.match(/- name: Persist exact Studio MCP play evidence/g)||[]).length,1);
  assert.equal((block.match(/- name: Refill existing 24H development loop/g)||[]).length,1);
});


test('Studio flags inaccessible graphics assets for exact visual repair while retaining ordinary warnings',()=>{
  const result=classifyStudioConsoleOutput({content:[{type:'text',text:[
    JSON.stringify({message:'Failed to load texture asset rbxassetid://123: not authorized to access',messageType:2,timestamp:1}),
    JSON.stringify({message:'Ordinary warning about frame rate',messageType:2,timestamp:2})
  ].join('\n')}]});
  assert.equal(result.errors.length,1);
  assert.equal(result.errors[0].type,'studio-asset-load-error');
  assert.equal(result.warningCount,2);
  assert.match(helper,/repairSurface:'VISUAL_ASSET_LOADING'/);
  assert.match(helper,/visual-asset-load-integrity/);
});


test('persistent start overlay aborts Studio exploration and enters UI repair',()=>{
  const overlayAt=helper.indexOf("ROBLOX_STUDIO_BLOCKING_OVERLAY_ABORT:START_INPUT_OBSCURED");
  const movementAt=helper.indexOf("const keyboardTool=client.tool('user_keyboard_input')",overlayAt);
  assert.ok(overlayAt>=0&&movementAt>overlayAt);
  assert.match(helper,/largeBlockingOverlayCount\|\|0\)>0/);
  assert.match(helper,/checkpoint\('initial-ui-playability',false\)/);
  const broken=runtime();
  broken.runtimeVerified=false;
  broken.scenarioContractRequired=true;
  broken.scenarioCoverage=[{id:'adaptive-ui-blocking-overlay',pass:false}];
  broken.qualityFailureKinds=['adaptive-ui-blocking-overlay'];
  broken.qualityFailureDetails=[{id:'adaptive-ui-blocking-overlay',repairSurface:'MOBILE_UI',priority:'CRITICAL',hint:'Unblock start',observed:{largeBlockingOverlayCount:1,largestOverlayCoverage:0.8}}];
  broken.errors=[{type:'studio-product-ui-blocking-error',signature:'ROBLOX_STUDIO_BLOCKING_OVERLAY_ABORT:START_INPUT_OBSCURED'}];
  const applied=applyLocalStudioPlayResult({queue:{items:[item()]},gameId:'g1',runtime:broken,expected,workflowRunId:85,studioStepSucceeded:false,testedAt:'2026-09-29T00:00:00.000Z'});
  assert.equal(applied.result.evidence.infrastructureFailure,false);
  assert.equal(applied.item.canonicalState,'REPAIR_REQUIRED');
  assert.ok(applied.item.robloxQualityBuildUpEvidence.repairSurfaces.includes('MOBILE_UI'));
});

test('zero-floor Studio abort routes exact artifact to WORLD_GEOMETRY repair',()=>{
  assert.match(helper,/floorSampleCount\|\|0\)>0&&Number\(initialClientProbe\?\.world\?\.floorHitCount\|\|0\)===0/);
  assert.match(helper,/floorSampleCount\|\|0\)>0&&Number\(floatingConfirm\?\.world\?\.floorHitCount\|\|0\)===0/);
  const broken=runtime();
  broken.runtimeVerified=false;
  broken.scenarioContractRequired=true;
  broken.scenarioCoverage=[{id:'adaptive-world-safety',pass:false}];
  broken.qualityFailureKinds=['adaptive-world-safety'];
  broken.qualityFailureDetails=[{id:'adaptive-world-safety',repairSurface:'WORLD_GEOMETRY',priority:'CRITICAL',hint:'Restore floor',observed:{floorSampleCount:9,floorHitCount:0}}];
  broken.errors=[{type:'studio-product-world-geometry-error',signature:'ROBLOX_STUDIO_FLOATING_CHARACTER_ABORT:NO_WALKABLE_WORLD'}];
  const applied=applyLocalStudioPlayResult({queue:{items:[item()]},gameId:'g1',runtime:broken,expected,workflowRunId:84,studioStepSucceeded:false,testedAt:'2026-09-29T00:00:00.000Z'});
  assert.equal(applied.result.evidence.infrastructureFailure,false);
  assert.equal(applied.item.canonicalState,'REPAIR_REQUIRED');
  assert.equal(applied.item.robloxFailureSignature,'ROBLOX_STUDIO_MCP_SCENARIO_CONTRACT_FAILED');
  assert.ok(applied.item.robloxQualityBuildUpEvidence.repairSurfaces.includes('WORLD_GEOMETRY'));
});
