import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  validateLocalStudioPolicy,
  detectStudioMcpAssistantSetting,
  planLocalStudioCandidates,
  createLocalStudioPlayEvidence,
  applyLocalStudioPlayResult
} from '../tools/company-development-roblox-studio-local-play.mjs';

const workflow=fs.readFileSync('.github/workflows/company-development-roblox-post-runtime-qa.yml','utf8');
const helper=fs.readFileSync('tools/company-development-roblox-studio-local-play.mjs','utf8');

const source='a'.repeat(40);
const artifact='sha256:'+'b'.repeat(64);

function roadmap(){
  return {
    roblox:{studioExecution:{
      enabled:true,
      required:false,
      requiredForActualVibeInternalPlay:true,
      officialStudioMcpOnly:true,
      localPlaceFileRequired:true,
      onlinePublishedPlaceDirectOpenForbidden:true,
      robloxPlayerAutomationForbidden:true,
      externalGuiAutomationForbidden:true,
      undocumentedStudioCliAutomationForbidden:true,
      studioMcpTransport:'STDIO',
      historicalExactPublishedArtifactAllowedForLocalActualPlay:true,
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
  assert.equal(loop.actualVibePlayEligibility,'INTERNAL_RELEASE_PLUS_EXACT_SOURCE_ARTIFACT_PUBLICATION_BINDING');
  assert.equal(loop.actualVibePlayEligibilityMustNotDependOnExclusiveCurrentStep,true);
  assert.equal(loop.foundationOrFinalRevalidationMayRunParallelWithActualVibePlayAfterInternalRelease,true);
  assert.equal(loop.currentStepMayRepresentParallelRuntimeRevalidationWithoutRevokingInternalReleasePlayEligibility,true);
  assert.equal(loop.explicitDisabledGameRemainsIneligible,true);
  const arch=architecture.releaseExposureLifecycle?.robloxPerpetualInternalBuildup||{};
  assert.equal(arch.actualPlayPlannerEligibility,'INTERNAL_RELEASE_PLUS_EXACT_SOURCE_ARTIFACT_PUBLICATION_BINDING');
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

test('Studio MCP client negotiates Roblox protocol and waits for the official tool inventory to become ready',()=>{
  assert.match(helper,/protocolVersion:'2024-11-05'/);
  assert.match(helper,/async waitForTools\(requiredNames=\[\],\{attempts=24,delayMs=1500\}=\{\}\)/);
  assert.match(helper,/await client\.waitForTools\(requiredTools,\{/);
  assert.match(helper,/const requiredTools=\['list_roblox_studios','get_studio_state','start_stop_play','get_console_output','screen_capture','user_keyboard_input','user_mouse_input','character_navigation'\];/);
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
  assert.match(studioMcpBlock,/Get-Process StudioMCP -ErrorAction SilentlyContinue/);
  assert.match(studioMcpBlock,/ROBLOX_STUDIO_MCP_STALE_OFFICIAL_PROCESS_REAPED=/);
  assert.match(studioMcpBlock,/StartsWith\(\$officialVersionsRoot,\[System\.StringComparison\]::OrdinalIgnoreCase\)/);
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
  assert.doesNotMatch(studioMcpBlock,/ROBLOX_PLAYER_AUTOMATION=YES/);
  assert.match(studioMcpBlock,/WaitForInputIdle\(30000\)/);
  assert.match(studioMcpBlock,/ROBLOX_STUDIO_GUI_READY=YES/);
  assert.match(studioMcpBlock,/ROBLOX_STUDIO_MCP_RELAUNCH_GUI_READY=YES/);
});

test('Studio MCP warms Studio before exact local Place attach and preserves the order on retries',()=>{
  const studioMcpBlock=workflow.slice(workflow.indexOf('\n  studio-mcp-auto-play:'));
  const warmStart=studioMcpBlock.indexOf("$warmStudioProcess = Start-Process -FilePath $env:VIBE2_ROBLOX_STUDIO_PATH -PassThru");
  const exactPlaceOpen=studioMcpBlock.indexOf("$placeLaunchProcess = Start-Process -FilePath $env:VIBE2_ROBLOX_STUDIO_PATH -ArgumentList @($places[0].FullName) -PassThru");
  assert.ok(warmStart>0);
  assert.ok(exactPlaceOpen>warmStart);
  assert.match(studioMcpBlock,/ROBLOX_STUDIO_MCP_WARM_GUI_READY=YES/);
  assert.match(studioMcpBlock,/ROBLOX_STUDIO_MCP_WARM_ASSISTANT_READY=YES/);
  assert.match(studioMcpBlock,/AssistantVersion:\|Running plugin sabuiltin_Assistant\\\.rbxm/);
  assert.match(studioMcpBlock,/Roblox Studio Assistant did not finish loading before exact Place attach/);
  assert.match(studioMcpBlock,/ROBLOX_STUDIO_MCP_WARM_SETTING_ENABLED=/);
  assert.match(studioMcpBlock,/ROBLOX_STUDIO_MCP_WARM_SETTING_MUTATION=NO/);
  assert.match(studioMcpBlock,/VIBE2_STUDIO_PROCESS_IDS=/);
  assert.match(studioMcpBlock,/ROBLOX_STUDIO_MCP_OWNED_PROCESS_IDS=/);
  assert.match(studioMcpBlock,/ROBLOX_STUDIO_MCP_RETRY_WARM_GUI_READY=YES/);
  assert.match(studioMcpBlock,/ROBLOX_STUDIO_MCP_RETRY_WARM_ASSISTANT_READY=YES/);
  assert.match(studioMcpBlock,/Roblox Studio Assistant did not finish loading before MCP retry Place attach/);
  assert.match(studioMcpBlock,/ROBLOX_STUDIO_MCP_RETRY_PLACE_LAUNCH_PROCESS_ID=/);
  assert.match(studioMcpBlock,/ROBLOX_STUDIO_MCP_RETRY_OWNED_PROCESS_IDS=/);
  assert.match(studioMcpBlock,/foreach \(\$ownedId in \$ownedIds\)/);
  assert.doesNotMatch(studioMcpBlock,/AutoHotkey|pyautogui|SendKeys|mouse_event|keybd_event/i);
});

test('Studio MCP plan and actual play bypass saturated GitHub-hosted foundation capacity on the authenticated self-hosted Windows runner',()=>{
  const studioPlanBlock=workflow.slice(workflow.indexOf('\n  studio-local-plan:'),workflow.indexOf('\n  studio-mcp-auto-play:'));
  assert.match(studioPlanBlock,/runs-on: \[self-hosted, Windows, X64, roblox-studio-authenticated\]/);
  assert.match(studioPlanBlock,/shell: powershell/);
  assert.match(studioPlanBlock,/ROBLOX_STUDIO_MCP_PLAN_RUNNER=SELF_HOSTED_WINDOWS/);
  assert.doesNotMatch(studioPlanBlock,/needs: runtime-foundation-qa/);
  assert.doesNotMatch(studioPlanBlock,/needs\.runtime-foundation-qa/);
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


test('automatic Roblox Studio MCP scans supersede stale pushes while preserving exact-game and scheduled isolation',()=>{
  assert.match(workflow,/group: company-development-roblox-runtime-foundation-qa-\$\{\{ inputs\.game_id \|\| \(github\.event_name == 'schedule' && 'scheduled-scan'\) \|\| \(github\.event_name == 'workflow_dispatch' && 'manual-scan'\) \|\| 'automatic-scan' \}\}/);
  assert.match(workflow,/cancel-in-progress: \${\{ github\.event_name == 'push' \}\}/);
  assert.match(workflow,/scheduled-scan/);
  assert.match(workflow,/manual-scan/);
  assert.doesNotMatch(workflow,/company-development-roblox-runtime-foundation-qa-[^\n]*github\.run_id/);
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
  assert.equal(arch.unconfirmedSettingState,'STUDIO_MCP_INFRASTRUCTURE_PENDING_IF_REQUIRED_TOOL_HANDSHAKE_FAILS');
  assert.equal(arch.automaticSettingMutation,false);
});


test('Studio MCP strategy matrix receives include rows only and never planner metadata axes',()=>{
  const studioPlanBlock=workflow.slice(workflow.indexOf('\n  studio-local-plan:'),workflow.indexOf('\n  studio-mcp-auto-play:'));
  const jsIncludeOnly=/JSON\.stringify\(\{include:Array\.isArray\(x\.include\)\?x\.include:\[\]\}\)/.test(studioPlanBlock);
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
