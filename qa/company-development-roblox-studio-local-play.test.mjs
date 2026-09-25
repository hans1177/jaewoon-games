import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  validateLocalStudioPolicy,
  planLocalStudioCandidates,
  createLocalStudioPlayEvidence,
  applyLocalStudioPlayResult
} from '../tools/company-development-roblox-studio-local-play.mjs';

const workflow=fs.readFileSync('.github/workflows/company-development-roblox-post-runtime-qa.yml','utf8');

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
      studioMcpTransport:'STDIO'
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

test('planner selects exact internally released artifact even when shared target was later superseded',()=>{
  const candidate=item();
  assert.equal(candidate.robloxRuntimeFoundationPassed,false);
  assert.equal(candidate.robloxSharedTargetCurrent,false);
  const result=planLocalStudioCandidates({queue:{items:[candidate]},roadmap:roadmap()});
  assert.equal(result.include.length,1);
  assert.equal(result.include[0].artifactRunId,777);
  assert.equal(result.include[0].historicalExactPublishedArtifact,true);
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

test('runtime workflow uses exact local artifact plus official Studio MCP and no Player or undocumented Studio CLI automation',()=>{
  const studioMcpBlock=workflow.slice(workflow.indexOf('\n  studio-mcp-auto-play:'));
  assert.match(studioMcpBlock,/studio-mcp-auto-play:/);
  assert.match(studioMcpBlock,/runs-on: \[self-hosted, Windows, X64, roblox-studio-authenticated\]/);
  assert.match(studioMcpBlock,/development-roblox-package-\$\{\{ matrix\.gameId \}\}/);
  assert.match(studioMcpBlock,/run-id: \$\{\{ matrix\.artifactRunId \}\}/);
  assert.match(studioMcpBlock,/Roblox\\mcp\.bat/);
  assert.match(studioMcpBlock,/--mode=mcp-run/);
  assert.match(studioMcpBlock,/Local Place SHA256 mismatch/);
  assert.match(studioMcpBlock,/Start-Process -FilePath \$env:VIBE2_ROBLOX_STUDIO_PATH/);
  assert.doesNotMatch(studioMcpBlock,/RobloxPlayerBeta|RobloxPlayerLauncher|roblox:\/\//i);
  assert.doesNotMatch(studioMcpBlock,/vibe2-roblox-studio-cli-runner|--task\s+RunScript|--runScriptFile/);
  assert.doesNotMatch(studioMcpBlock,/Get-Content 'C:\\\\actions-runner\\\\\.runner'|ConvertFrom-Json.*runnerMetadata/);
  assert.doesNotMatch(studioMcpBlock,/--place-id=\$env:|--universe-id=\$env:/);
});

test('Studio MCP play lane is not blocked by an unrelated runtime-foundation failure and verified play refills existing 24H development',()=>{
  assert.match(workflow,/studio-local-plan:[\s\S]*needs: runtime-foundation-qa[\s\S]*if: always\(\) && needs\.runtime-foundation-qa\.result != 'cancelled'/);
  assert.match(workflow,/event_type = 'vibe2-fanin-refill'/);
  assert.match(workflow,/reason = 'roblox-official-studio-mcp-actual-play'/);
});
