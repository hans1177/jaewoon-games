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
  assert.match(studioMcpBlock,/StudioMCP\.exe/);
  assert.match(studioMcpBlock,/OFFICIAL_STUDIOMCP_EXE_FALLBACK_BROKEN_GENERATED_BATCH/);
  assert.match(studioMcpBlock,/\(\?im\)\^\\s\*else\\b/);
  assert.match(studioMcpBlock,/%B\[\/\\\\\]\\\.\\\.\[\/\\\\\]StudioMCP\\\.exe/);
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
  assert.match(helper,/attempts:Math\.max\(1,Number\(toolAttempts\)\|\|5\)/);
  assert.match(helper,/delayMs:Math\.max\(100,Number\(toolDelayMs\)\|\|1000\)/);
  assert.match(helper,/ROBLOX_STUDIO_MCP_TOOLS_WAIT=/);
  assert.match(helper,/ROBLOX_STUDIO_MCP_REQUIRED_TOOLS_NOT_READY:missing=/);
  assert.match(helper,/:available=/);
});

test('Windows Studio MCP transport keeps documented batch launch and supports installed official binary fallback',()=>{
  assert.match(helper,/process\.platform==='win32'&&\/\\\.exe\$\/i\.test\(resolved\)\)return\{command:resolved,args:\[\]\}/);
  assert.match(helper,/process\.platform==='win32'\)return\{command:'cmd\.exe',args:\['\/c',resolved\]\}/);
  assert.doesNotMatch(helper,/args:\['\/d','\/s','\/c',resolved\]/);
  assert.match(helper,/this\.stderrTail=\(this\.stderrTail\+value\)\.slice\(-6000\)/);
  assert.match(helper,/stderr=\$\{detail\}/);
});

test('Studio MCP play lane is not blocked by an unrelated runtime-foundation failure and verified play refills existing 24H development',()=>{
  assert.match(workflow,/studio-local-plan:[\s\S]*needs: runtime-foundation-qa[\s\S]*if: always\(\) && needs\.runtime-foundation-qa\.result != 'cancelled'/);
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


test('Studio MCP unavailable recovery diagnoses setting recursively, fails fast on explicit prerequisite absence, and never mutates settings',()=>{
  const studioMcpBlock=workflow.slice(workflow.indexOf('\n  studio-mcp-auto-play:'));
  assert.match(studioMcpBlock,/\$maxSessionAttempts = 3/);
  assert.match(studioMcpBlock,/ROBLOX_STUDIO_MCP_SESSION_ATTEMPT=/);
  assert.match(studioMcpBlock,/ROBLOX_STUDIO_MCP_SESSION_RESTART=/);
  assert.match(studioMcpBlock,/ROBLOX_STUDIO_MCP_STUDIO_RELAUNCHED=/);
  assert.match(studioMcpBlock,/--tool-attempts=5/);
  assert.match(studioMcpBlock,/--tool-delay-ms=1000/);
  assert.match(studioMcpBlock,/--timeout=15000/);
  assert.match(studioMcpBlock,/Roblox\\AssistantSettings/);
  assert.match(studioMcpBlock,/Get-ChildItem \$settingsRoot -Recurse -File -Filter '\*\.json'/);
  assert.match(studioMcpBlock,/ROBLOX_STUDIO_MCP_SETTING_FILE_COUNT=/);
  assert.match(studioMcpBlock,/ROBLOX_STUDIO_MCP_SETTING_ENABLED_COUNT=/);
  assert.match(studioMcpBlock,/ROBLOX_STUDIO_MCP_SETTING_DISABLED_COUNT=/);
  assert.match(studioMcpBlock,/ROBLOX_STUDIO_MCP_SETTING_PARSE_ERROR_COUNT=/);
  assert.match(studioMcpBlock,/ROBLOX_STUDIO_MCP_SETTING_ENABLED=/);
  assert.match(studioMcpBlock,/ROBLOX_STUDIO_MCP_SETTING_MUTATION=NO/);
  assert.match(studioMcpBlock,/setting_blocked=/);
  assert.match(studioMcpBlock,/ROBLOX_STUDIO_MCP_SETTING_ENABLE_REQUIRED:/);
  assert.match(studioMcpBlock,/ROBLOX_STUDIO_MCP_PREREQUISITE=ENABLE_IN_STUDIO_ASSISTANT_UI:/);
  assert.match(studioMcpBlock,/Download exact immutable Roblox build artifact[\s\S]{0,180}if: steps\.mcp_preflight\.outputs\.setting_blocked != 'true'/);
  assert.match(studioMcpBlock,/Run actual local play through official Studio MCP[\s\S]{0,180}if: steps\.mcp_preflight\.outputs\.setting_blocked != 'true'/);
  assert.doesNotMatch(studioMcpBlock,/Set-Content .*AssistantSettings|Out-File .*AssistantSettings|Remove-Item .*AssistantSettings/i);
  assert.doesNotMatch(studioMcpBlock,/user_mouse_input[\s\S]{0,120}Manage MCP Servers|Enable Studio as MCP server/i);
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
  const arch=architecture.releaseExposureLifecycle?.robloxPerpetualInternalBuildup?.mcpUnavailableRecovery||{};
  assert.equal(arch.automaticSessionAttempts,3);
  assert.equal(arch.ownedStudioRestart,true);
  assert.equal(arch.mcpClientRestart,true);
  assert.equal(arch.assistantSettingsReadOnlyDiagnostic,true);
  assert.equal(arch.assistantSettingsMutation,false);
  assert.equal(arch.guiToggleAutomation,false);
});


test('Studio MCP strategy matrix receives include rows only and never planner metadata axes',()=>{
  const studioPlanBlock=workflow.slice(workflow.indexOf('\n  studio-local-plan:'),workflow.indexOf('\n  studio-mcp-auto-play:'));
  assert.match(studioPlanBlock,/JSON\.stringify\(\{include:Array\.isArray\(x\.include\)\?x\.include:\[\]\}\)/);
  assert.doesNotMatch(studioPlanBlock,/JSON\.stringify\(x\)\)"/);
  assert.match(workflow,/matrix: \$\{\{ fromJSON\(needs\.studio-local-plan\.outputs\.matrix\) \}\}/);
});
