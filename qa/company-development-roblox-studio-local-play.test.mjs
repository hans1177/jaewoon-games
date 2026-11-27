// 파일명: qa/company-development-roblox-studio-local-play.test.mjs
import crypto from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {
  validateLocalStudioPolicy,
  mcpCommandArgs,
  detectStudioMcpAssistantSetting,
  collectStudios,
  collectImages,
  collectStudioConsoleEntries,
  classifyStudioConsoleOutput,
  planLocalStudioCandidates,
  filterActiveStudioCandidates,
  createLocalStudioPlayEvidence,
  applyLocalStudioPlayResult,
  evaluateStudioActualPlayContract,
  deriveStudioActualPlayContract,
  assertCurrentStudioWorkflowHead,
  runStudioMultiplayerAudit,
  runOfficialStudioMcpPlay,
  runStudioScript,
  stopOwnedStudioMultiplayerTests,
  validateStudioPlaceArtifactPreOpen,
  evaluateStudioSaveRejoin,
  evaluateDaechungCloudStudioChecks,
  deriveExactStaticMultiplayerEvidence,
  keyboardArgs,
  ROBLOX_STUDIO_HARNESS_VERSION
} from '../tools/company-development-roblox-studio-local-play.mjs';

const workflow=fs.readFileSync('.github/workflows/company-development-roblox-post-runtime-qa.yml','utf8');
const helper=fs.readFileSync('tools/company-development-roblox-studio-local-play.mjs','utf8');
const fantasyServer=fs.readFileSync('roblox-games/fantasy-survival/server/Game.server.luau','utf8');

const source='a'.repeat(40);
const artifact='sha256:'+'b'.repeat(64);

// [공통 역할 계약] 삭제한 게임과 무관한 판정 함수 전용 회귀 데이터.
const roleRoundContract=Object.freeze({
  required:true,entryButtonTexts:['참가','입장'],selectionButtonText:'역할 선택',
  startButtonText:'게임 시작',primaryActionButtonText:'대시',afterStartWaitMs:4000,
  requiredScenarios:[
    'role-selection-interaction','round-running','logical-population-eight','hud-visible',
    'action-ui-visible','design-runtime-binding','interaction-surface-present',
    'world-geometry-present','primary-action-input','primary-action-effect','visual-capture-sane'
  ],
  expectations:{
    acceptedRoundStates:['RUNNING'],acceptedRoles:['SURVIVOR'],logicalPopulation:8,
    screenGuiName:'TestHUD',requiredGuiObjects:['TestHUD','TestActions'],
    minimumVisibleButtons:2,minimumPromptCount:1,minimumArenaParts:5,
    workspaceAttributeEquals:{DesignCodeSync:'ROUND_ROLE_TEST_V1'}
  }
});

test('official Windows Studio MCP launcher runs from its signed install directory',()=>{
  const root=path.win32.join('C:\\','Users','studio-runner','AppData','Local','Roblox');
  const batch=path.win32.join(root,'mcp.bat');
  assert.deepEqual(mcpCommandArgs(batch,'win32'),{
    command:'cmd.exe',args:['/d','/c',batch],cwd:root
  });
  const exe=path.win32.join(root,'Versions','version-test','StudioMCP.exe');
  assert.deepEqual(mcpCommandArgs(exe,'win32'),{
    command:exe,args:[],cwd:path.win32.dirname(exe)
  });
  assert.throws(()=>mcpCommandArgs('mcp.bat','win32'),/ABSOLUTE_PATH_REQUIRED/);
  assert.throws(()=>mcpCommandArgs(path.win32.join(root,'not-official.cmd'),'win32'),/EXTENSION_REQUIRED/);
  assert.match(helper,/spawn\(this\.command,this\.args,\{stdio:\['pipe','pipe','pipe'\],windowsHide:true,cwd:this\.cwd/);
});

test('Studio commercial probe ignores zero-size platform controls',()=>{
  assert.match(helper,/local measurable=row\.width>=1 and row\.height>=1/);
  assert.match(helper,/if measurable and not internalQa then[\s\S]*gui\.undersizedTouchButtons/);
});

test('Studio world probe excludes Terrain extents and approaches prompts within activation distance',()=>{
  assert.match(helper,/d:IsA\("BasePart"\) and not d:IsA\("Terrain"\)/);
  assert.match(helper,/row\.maxDistance/);
  assert.match(helper,/const promptApproachTarget=/);
  assert.match(helper,/Number\(prompt\?\.maxDistance\|\|10\)\*\.55/);
  assert.match(helper,/const promptDistance=\[px,py,pz,rx,ry,rz\]\.every\(Number\.isFinite\)\?Math\.hypot/);
  assert.match(helper,/const inRange=Number\.isFinite\(promptDistance\)&&promptDistance<=activationDistance\+1\.5/);
  assert.match(helper,/ok:navOk&&inputOk&&inRange/);
});

test('Studio keyboard input holds official MCP keys for Prompt and movement duration',()=>{
  const schema={
    type:'object',
    properties:{
      studio_id:{type:'string'},
      datamodel_type:{type:'string',enum:['Client']},
      actions:{
        type:'array',
        items:{
          type:'object',
          properties:{
            action:{type:'string',enum:['keyDown','keyUp','keyPress','textInput','wait']},
            key_code:{type:'string',enum:['A','D','E','Space','W']},
            wait_time_ms:{type:'number'}
          },
          required:['action']
        }
      }
    },
    required:['studio_id','datamodel_type','actions']
  };
  const args=keyboardArgs(schema,'studio-1','E',280);
  assert.equal(args.studio_id,'studio-1');
  assert.equal(args.datamodel_type,'Client');
  assert.deepEqual(args.actions,[
    {action:'keyDown',key_code:'E'},
    {action:'wait',wait_time_ms:280},
    {action:'keyUp',key_code:'E'}
  ]);
});

test('Studio captures real movement after keyboard exercise when no primary action is declared',()=>{
  assert.match(helper,/if\(actualPlayContract\?\.required===true&&!clean\(actualPlayContract\.primaryActionButtonText\)\)\{/);
  assert.match(helper,/checkpoint\('actual-play-post-keyboard-client-probe',postActionClientProbe!=null\)/);
});

test('Roblox failure classifier does not mistake generic asset load text for DataStore failure',()=>{
  assert.match(helper,/save-rejoin\|save persistence\|SaveStatus\|SAVE_FAILED\|LOAD_FAILED\|studio-save-rejoin/);
  assert.doesNotMatch(helper,/DataStore\|GetDataStore\|SetAsync\|UpdateAsync\|save\|load/);
});

test('Studio route audit does not invent failure when every remote anchor is already reached or valid',()=>{
  assert.match(helper,/const unresolvedRemoteRoute=routeRows\.some\(row=>row\?\.pass!==true/);
  assert.match(helper,/if\(unresolvedRemoteRoute&&routeIndex===0\)/);
  assert.doesNotMatch(helper,/if\(routeRows\.length>0&&routeIndex===0\)/);
});

test('Studio route audit keeps duplicate-named prompts distinct and skips already reached waypoints',()=>{
  assert.match(helper,/local function addAnchor\(kind,name,x,y,z,maxDistance,identity\)/);
  assert.match(helper,/sourceX,sourceY,sourceZ=tonumber\(x\),tonumber\(y\),tonumber\(z\)/);
  assert.match(helper,/row\.maxDistance,row\.path/);
  assert.match(helper,/identity=row\.identity/);
  assert.match(helper,/const routeIdentity=row=>clean\(row\?\.identity\)\|\|\[/);
  assert.match(helper,/!visitedRoutes\.has\(routeIdentity\(row\)\)/);
  assert.match(helper,/const beforeWaypointDistance=Math\.hypot/);
  assert.match(helper,/beforeWaypointDistance<=6/);
  assert.match(helper,/routeIdentity\(row\)===routeId/);
});

test('Studio owned-source scan still works when launch contract file is absent',()=>{
  assert.match(helper,/const root=path\.dirname\(path\.resolve\(contract\)\);/);
  assert.match(helper,/if\(!fs\.existsSync\(root\)\)return'';/);
  assert.doesNotMatch(helper,/if\(!contract\|\|!fs\.existsSync\(contract\)\)return'';/);
});

function roadmap(){
  return {
    roblox:{studioExecution:{
      enabled:true,
      required:true,
      optionalDiagnostic:false,
      deploymentGate:true,
      f9Gate:true,
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
    studioHarnessVersion:ROBLOX_STUDIO_HARNESS_VERSION,
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

test('Studio asset loading remains distinct from character motion mannequin failures',()=>{
  const candidate=item();
  const assetBroken=runtime();
  assetBroken.runtimeVerified=false;
  assetBroken.errors=[{type:'studio-asset-load-error',signature:'Failed to load animation with sanitized ID rbxassetid://123456789'}];
  assetBroken.checkpoints=assetBroken.checkpoints.map(row=>row.id==='no-release-blocking-runtime-errors'?{...row,pass:false}:row);
  const assetResult=createLocalStudioPlayEvidence({item:candidate,runtime:assetBroken,expected,workflowRunId:100,studioStepSucceeded:false});
  assert.equal(assetResult.evidence.robloxFailureClass,'ROBLOX_CHARACTER_RIG_ANIMATION');

  const motionBroken=runtime();
  motionBroken.runtimeVerified=false;
  motionBroken.errors=[{type:'character-motion-quality-error',signature:'ROBLOX_CHARACTER_MOTION_MANNEQUIN:NO_JOINT_ACTIVITY'}];
  motionBroken.checkpoints=motionBroken.checkpoints.map(row=>row.id==='no-release-blocking-runtime-errors'?{...row,pass:false}:row);
  const motionResult=createLocalStudioPlayEvidence({item:candidate,runtime:motionBroken,expected,workflowRunId:101,studioStepSucceeded:false});
  assert.equal(motionResult.evidence.robloxFailureClass,'ROBLOX_CHARACTER_MOTION_MANNEQUIN');
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

test('central contract requires official Studio MCP for F9 and release, without claiming play when unavailable',()=>{
  const central=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
  const architecture=JSON.parse(fs.readFileSync('company-learning/company-architecture-map.json','utf8'));
  const loop=central.developmentLifecycleMachine?.internalPlatformReleaseAndPublicExposureGate?.internalBuildupLoop||{};
  assert.deepEqual(loop.sequence,['BUILD_UP','CODE_AND_STATIC_QA','REQUIRED_OFFICIAL_STUDIO_MCP_ACTUAL_PLAY','NEXT_BUILD_UP']);
  assert.equal(loop.codeAndStaticQaRequired,true);
  assert.equal(loop.studioRequired,true);
  assert.equal(loop.missingStudioAction,'HOLD_F9_AND_CANONICAL_RELEASE_KEEP_SOURCE_DEVELOPMENT');
  const studio=central.roblox?.studioExecution||{};
  assert.equal(studio.required,true);
  assert.equal(studio.optionalDiagnostic,false);
  assert.equal(studio.deploymentGate,true);
  assert.equal(studio.f9Gate,true);
  const canonical=central.roblox?.deploymentControl?.verifiedCyclePublication||{};
  assert.equal(canonical.studioRequiredForCanonicalPublish,true);
  assert.equal(canonical.postBuildUpVerificationLevel,'CODE_STATIC_AND_OFFICIAL_STUDIO_MCP_ACTUAL_PLAY');
  assert.equal(architecture.sourceOfTruthRole,'STATIC_MACHINE_TOPOLOGY_AND_COMPATIBILITY_REGISTRY_ONLY');
  assert.equal(architecture.centralPolicy,'company-learning/platform-release-roadmap.json');
  const studioPlan=workflow.slice(workflow.indexOf('\n  studio-local-plan:'),workflow.indexOf('\n  studio-mcp-auto-play:'));
  assert.match(studioPlan,/if: \$\{\{ !cancelled\(\) && \(inputs\.game_id == '' \|\| inputs\.game_id == 'mare-essentia'\) \}\}/);
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
  assert.match(helper,/async waitForTools\(requiredNames=\[\],\{attempts=24,delayMs=1500,fastFailOnProviderTimeout=false\}=\{\}\)/);
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

test('Studio fails closed before gameplay QA when Play is blocked after Studio becomes readable',()=>{
  const stateAt=helper.indexOf("checkpoint('studio-state-readable',true)");
  const gatePassAt=helper.indexOf("checkpoint('PRE_PLAY_STUDIO_MODAL_GATE',true)");
  assert.ok(stateAt>0&&gatePassAt>stateAt);
  assert.match(helper,/ROBLOX_STUDIO_PRE_PLAY_BLOCKER_ABORT:/);
  assert.match(helper,/checkpoint\('PRE_PLAY_STUDIO_MODAL_GATE',false\)/);
  assert.match(helper,/id:'pre-play-studio-modal-gate'/);
  assert.match(helper,/repairSurface:'STUDIO_PROJECT_OPEN'/);
  assert.match(helper,/type:'studio-product-pre-play-blocker'/);
  assert.match(helper,/do not auto-click it/);
});

test('Studio pre-open modal gate rejects missing or Compatibility lighting before launching Studio',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'studio-place-gate-'));
  try{
    const good=path.join(dir,'good.rbxlx');
    fs.writeFileSync(good,'<roblox><Item class="Lighting"><Properties><token name="Technology">1</token></Properties></Item></roblox>');
    assert.equal(validateStudioPlaceArtifactPreOpen({placeFile:good}).pass,true);
    const missing=path.join(dir,'missing.rbxlx');
    fs.writeFileSync(missing,'<roblox><Item class="Lighting"><Properties></Properties></Item></roblox>');
    assert.throws(()=>validateStudioPlaceArtifactPreOpen({placeFile:missing}),/MISSING_TECHNOLOGY/);
    const compatibility=path.join(dir,'compatibility.rbxlx');
    fs.writeFileSync(compatibility,'<roblox><Item class="Lighting"><Properties><token name="Technology">2</token></Properties></Item></roblox>');
    assert.throws(()=>validateStudioPlaceArtifactPreOpen({placeFile:compatibility}),/COMPATIBILITY/);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
  const gateAt=workflow.indexOf("--mode=validate-place");
  const launchAt=workflow.indexOf('Start-Process -FilePath $env:VIBE2_ROBLOX_STUDIO_PATH');
  assert.ok(gateAt>0&&launchAt>gateAt);
});

test('Studio MCP waits for a connected Studio after tool inventory becomes ready',()=>{
  assert.match(helper,/const studioAttachAttempts=60/);
  assert.match(helper,/ROBLOX_STUDIO_MCP_STUDIO_ATTACH_WAIT=/);
  assert.match(helper,/ROBLOX_STUDIO_MCP_STUDIO_LIST_RESPONSE=/);
  assert.match(helper,/flattenText\(studioListResult,\[\]\)\.join\(' \| '\)/);
  assert.match(helper,/connected='\+unique\.length/);
  assert.match(helper,/if\(attempt<studioAttachAttempts\)await wait\(3000\)/);
  assert.match(helper,/ROBLOX_STUDIO_MCP_NO_STUDIO_AFTER_ATTACH_WAIT/);
  const toolsReadyAt=helper.indexOf("await client.waitForTools(requiredTools");
  const attachWaitAt=helper.indexOf("const studioAttachAttempts=60");
  const stateReadAt=helper.indexOf("const stateTool=client.tool('get_studio_state')");
  assert.ok(toolsReadyAt>0);
  assert.ok(attachWaitAt>toolsReadyAt);
  assert.ok(stateReadAt>attachWaitAt);
});

test('Windows Studio MCP transport keeps documented batch launch and supports installed official binary fallback',()=>{
  assert.match(helper,/if\(platform==='win32'\)\{/);
  assert.match(helper,/if\(\/\\\.exe\$\/i\.test\(resolved\)\)return\{command:resolved,args:\[\],cwd\}/);
  assert.match(helper,/if\(\/\\\.bat\$\/i\.test\(resolved\)\)return\{command:'cmd\.exe',args:\['\/d','\/c',resolved\],cwd\}/);
  assert.doesNotMatch(helper,/args:\['\/d','\/s','\/c',resolved\]/);
  assert.match(helper,/this\.stderrTail=\(this\.stderrTail\+value\)\.slice\(-6000\)/);
  assert.match(helper,/stderr=\$\{detail\}/);
});

test('Studio executor code repair refreshes only queued outdated jobs and preserves running Cloud and Studio work',()=>{
  const plan=workflow.slice(workflow.indexOf('\n  studio-local-plan:'),workflow.indexOf('\n  studio-mcp-auto-play:'));
  assert.match(plan,/studio_harness_changed=false/);
  assert.match(plan,/ROBLOX_STUDIO_HARNESS_CHANGED=/);
  assert.match(plan,/studio_harness_changed=\$studio_harness_changed/);
  assert.match(plan,/company-development-roblox-post-runtime-qa\.yml tools\/company-development-roblox-studio-local-play\.mjs/);
  assert.match(plan,/\[ "\$studio_harness_changed" != 'true' \]/);
  assert.match(plan,/existing game tester and QA validate exact Roblox runtime candidate/);
  assert.match(plan,/PRESERVE_ACTIVE/);
  assert.match(plan,/PRESERVE_UNRELATED/);
});

test('Studio planning reports authenticated cloud Windows runner and fail-closed deployment requirements',()=>{
  const plan=workflow.slice(workflow.indexOf('\n  studio-local-plan:'),workflow.indexOf('\n  studio-mcp-auto-play:'));
  assert.match(plan,/Report Studio-first deployment prerequisites/);
  assert.match(plan,/GITHUB_STEP_SUMMARY/);
  assert.match(plan,/docs\/roblox-studio-mcp-cloud-runner\.md/);
  assert.match(plan,/ROBLOX_STUDIO_MCP_DEPLOYMENT_PREREQUISITE=INTERACTIVE_AUTHENTICATED_WINDOWS_RUNNER/);
  assert.match(plan,/ROBLOX_STUDIO_MCP_PLAN_IS_ACTUAL_PLAY_PASS=NO/);
  assert.match(plan,/F9 and canonical deployment remain blocked/);
});

test('Studio MCP release worker requires an interactive cloud Windows desktop and signed official Roblox binaries',()=>{
  const studioMcpBlock=workflow.slice(workflow.indexOf('\n  studio-mcp-auto-play:'));
  assert.match(studioMcpBlock,/ROBLOX_STUDIO_RUNNER_WINDOWS_SESSION_ID=/);
  assert.match(studioMcpBlock,/\$runnerSessionId -le 0/);
  assert.match(studioMcpBlock,/ROBLOX_STUDIO_INTERACTIVE_SESSION_REQUIRED/);
  assert.match(studioMcpBlock,/run\.cmd in signed-in Windows desktop/);
  assert.match(studioMcpBlock,/GetFolderPath\('ProgramFilesX86'\)/);
  assert.match(studioMcpBlock,/ROBLOX_STUDIO_OFFICIAL_INSTALL_REQUIRED/);
  assert.match(studioMcpBlock,/Get-AuthenticodeSignature -FilePath \$studio/);
  assert.match(studioMcpBlock,/Get-AuthenticodeSignature -FilePath \$mcpExe/);
  assert.match(studioMcpBlock,/ROBLOX_STUDIO_SIGNED_INSTALL=VERIFIED/);
  assert.match(studioMcpBlock,/ROBLOX_STUDIO_MCP_SIGNED_EXE=VERIFIED/);
  assert.match(studioMcpBlock,/ROBLOX_STUDIO_MCP_OFFICIAL_SIGNATURE_REQUIRED/);
  assert.match(studioMcpBlock,/runs-on: \[self-hosted, Windows, X64, roblox-studio-authenticated\]/);
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
  assert.match(studioMcpBlock,/tool provider remained unavailable after exact-session reconnects/);
  assert.match(studioMcpBlock,/ROBLOX_STUDIO_MCP_STUDIO_LOG_MATCH_COUNT=/);
  assert.match(studioMcpBlock,/ROBLOX_STUDIO_MCP_STUDIO_ATTACHMENT_PENDING=attempt=/);
  assert.match(studioMcpBlock,/\$studioAttachmentFailureObserved = \$true/);
  assert.match(studioMcpBlock,/RBX_STUDIO_NS\|named pipe\|connection\|connected client/);
  assert.match(studioMcpBlock,/client connected but Studio instance registration remained empty/);
  assert.doesNotMatch(studioMcpBlock,/ROBLOX_PLAYER_AUTOMATION=YES/);
  assert.match(studioMcpBlock,/WaitForInputIdle\(30000\)/);
  assert.match(studioMcpBlock,/ROBLOX_STUDIO_GUI_READY=YES/);
  assert.doesNotMatch(studioMcpBlock,/ROBLOX_STUDIO_MCP_RELAUNCH_GUI_READY=YES/);
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

test('existing fantasy Studio boot tolerates unavailable DataStore before remote setup',()=>{
  const source=fantasyServer.slice(0,3200);
  assert.match(source,/local store = nil/);
  assert.doesNotMatch(source,/local store\s*=\s*DataStoreService:GetDataStore/);
  assert.match(source,/local storeOk, storeResult = pcall\(function\(\)/);
  assert.match(source,/DataStoreService:GetDataStore\("fantasy-survival-development-v1"\)/);
  assert.match(source,/if storeOk then store = storeResult end/);
  assert.match(source,/local remote = ReplicatedStorage:FindFirstChild\(Config.RemoteName\)/);
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
  assert.equal((bindBlock.match(/Start-Process -FilePath/g)||[]).length,1);
  assert.match(bindBlock,/ROBLOX_STUDIO_MCP_PRE_MCP_PROCESS_READY_COUNT=/);
  assert.match(bindBlock,/without provable ownership; preserve all other Studio windows/);
  assert.match(bindBlock,/for \(\$processProbe = 1; \$processProbe -le 180; \$processProbe\+\+\)/);
  assert.doesNotMatch(bindBlock,/Roblox Studio exited before exact local Place MCP probe/);
  assert.match(bindBlock,/AssistantVersion:\|Running plugin sabuiltin_Assistant\\\.rbxm/);
  assert.doesNotMatch(bindBlock,/Roblox Studio Assistant did not finish loading in exact local Place/);
  assert.match(bindBlock,/VIBE2_STUDIO_PROCESS_IDS=/);
  assert.match(bindBlock,/ROBLOX_STUDIO_MCP_OWNED_PROCESS_IDS=/);

  const reconnect=studioMcpBlock.slice(studioMcpBlock.indexOf('ROBLOX_STUDIO_MCP_RECONNECT_SAME_PROCESS='),studioMcpBlock.indexOf('if (-not $sessionCompleted)'));
  assert.ok(reconnect.includes('Start-Sleep -Seconds 10'));
  assert.doesNotMatch(reconnect,/Start-Process|Stop-Process/);
  assert.match(helper,/ROBLOX_STUDIO_PLACE_LOADING_WAIT=/);
  assert.match(helper,/const studioAttachAttempts=60/);
  assert.match(studioMcpBlock,/\$ownedStudio\.WaitForExit\(60000\)/);
  assert.match(studioMcpBlock,/foreach \(\$record in \$ownedRecords\)/);
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
  assert.match(studioMcpBlock,/--tool-attempts=12/);
});

test('Studio push trigger scopes exact revalidation from the actual before-to-head diff',()=>{
  const studioPlanBlock=workflow.slice(workflow.indexOf('\n  studio-local-plan:'),workflow.indexOf('\n  studio-mcp-auto-play:'));
  assert.match(studioPlanBlock,/PUSH_BEFORE: \$\{\{ github\.event\.before \|\| '' \}\}/);
  assert.match(studioPlanBlock,/git fetch --no-tags --depth=1 origin "\$PUSH_BEFORE"/);
  assert.match(studioPlanBlock,/git diff --quiet "\$PUSH_BEFORE" HEAD -- roblox-games\/\.company-runtime-trigger/);
  assert.match(studioPlanBlock,/ROBLOX_STUDIO_TRIGGER_CHANGED=\$trigger_changed/);
  assert.match(studioPlanBlock,/ROBLOX_STUDIO_REQUESTED_GAME_ID=\$\{requested:-ALL_PENDING\}/);
  assert.match(studioPlanBlock,/--active-jobs=\$active_studio_jobs/);
  assert.doesNotMatch(studioPlanBlock,/GENERIC_SCAN_DEFERRED_FOR_EXISTING_STUDIO_RUN/);
  assert.match(studioPlanBlock,/CURRENT_RUN_ID="\$GITHUB_RUN_ID"/);
  assert.match(studioPlanBlock,/startswith\("Official Studio MCP actual play "\)/);
  assert.match(studioPlanBlock,/echo "trigger_changed=\$trigger_changed" >> "\$GITHUB_OUTPUT"/);
  assert.doesNotMatch(studioPlanBlock,/github\.event\.head_commit\.(?:modified|added|removed)/);
});

test('official Studio MCP planner runs automatically for push and exact candidate requests while Cloud remains release authority',()=>{
  const central=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
  const architecture=JSON.parse(fs.readFileSync('company-learning/company-architecture-map.json','utf8'));
  const studioPlanBlock=workflow.slice(workflow.indexOf('\n  studio-local-plan:'),workflow.indexOf('\n  studio-mcp-auto-play:'));
  assert.match(studioPlanBlock,/runs-on: ubuntu-slim/);
  assert.match(studioPlanBlock,/shell: bash/);
  assert.match(studioPlanBlock,/ROBLOX_STUDIO_MCP_PLAN_RUNNER=HOSTED_CONTROL/);
  assert.match(studioPlanBlock,/ROBLOX_STUDIO_SHARED_HOST_CONSUMED_BY_PLANNER=NO/);
  assert.doesNotMatch(studioPlanBlock,/runs-on:[^\n]*roblox-studio-authenticated/);
  assert.doesNotMatch(studioPlanBlock,/needs: runtime-foundation-qa/);
  assert.doesNotMatch(studioPlanBlock,/needs\.runtime-foundation-qa/);
  assert.doesNotMatch(studioPlanBlock,/needs: dedupe/);
  assert.doesNotMatch(studioPlanBlock,/needs\.dedupe/);
  assert.doesNotMatch(studioPlanBlock,/if:\s*needs\.dedupe\.outputs\.run/);
  assert.match(studioPlanBlock,/if: \$\{\{ !cancelled\(\) && \(inputs\.game_id == '' \|\| inputs\.game_id == 'mare-essentia'\) \}\}/);
  assert.equal(central.roblox.deploymentControl.validationProviderContract.localStudioExecutionAllowed,true);
  assert.equal(central.roblox.deploymentControl.validationProviderContract.studioMcpExecutionAllowed,true);
  assert.match(studioPlanBlock,/if: \$\{\{ !cancelled\(\) && \(inputs\.game_id == '' \|\| inputs\.game_id == 'mare-essentia'\) \}\}/);
  assert.equal(central.robloxNativeCodingQualityContract.actualPlayFeedback.portfolioWideFoundationJobWaitForbidden,true);
  assert.equal(architecture.sourceOfTruthRole,'STATIC_MACHINE_TOPOLOGY_AND_COMPATIBILITY_REGISTRY_ONLY');
  assert.equal(architecture.centralPolicy,'company-learning/platform-release-roadmap.json');
  assert.match(studioPlanBlock,/runs-on: ubuntu-slim/);
  assert.doesNotMatch(studioPlanBlock,/needs: runtime-foundation-qa/);
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
  assert.match(workflow.slice(0,jobsAt),/\nconcurrency:\n\s+group: roblox-runtime-foundation-\$\{\{ github\.run_id \}\}\n\s+cancel-in-progress: false/);
  assert.match(workflow,/title='Roblox runtime foundation QA · '\+\(game\|\|'scan'\)/);
  assert.match(workflow,/process\.stdout\.write\(String\(ids\[ids\.length-1\]\)\)/);
  assert.match(workflow,/ROBLOX_RUNTIME_FOUNDATION_QA_EXACT_DEDUPED=/);
  assert.match(workflow,/ROBLOX_RUNTIME_FOUNDATION_QA_SCAN_DEDUPED_NEWER=/);
  const studioPlanBlock=workflow.slice(workflow.indexOf('\n  studio-local-plan:'),workflow.indexOf('\n  studio-mcp-auto-play:'));
  assert.match(studioPlanBlock,/concurrency:\n\s+group: roblox-studio-mcp-plan-\$\{\{ github\.run_id \}\}/);
  assert.match(studioPlanBlock,/cancel-in-progress: false/);
  assert.doesNotMatch(studioPlanBlock,/needs: dedupe/);
  assert.doesNotMatch(studioPlanBlock,/needs\.dedupe/);
});


test('Studio MCP recovery blocks explicit disabled state but probes missing or unknown setting through official tool handshake',()=>{
  const studioMcpBlock=workflow.slice(workflow.indexOf('\n  studio-mcp-auto-play:'));
  assert.match(studioMcpBlock,/\$attempt = 0/);
  assert.match(studioMcpBlock,/while \(\$true\)/);
  assert.match(studioMcpBlock,/ROBLOX_STUDIO_MCP_SESSION_ATTEMPT=/);
  assert.doesNotMatch(studioMcpBlock,/\$maxSessionAttempts/);
  assert.match(studioMcpBlock,/ROBLOX_STUDIO_MCP_RECONNECT_SAME_PROCESS=/);
  assert.doesNotMatch(studioMcpBlock,/ROBLOX_STUDIO_MCP_STUDIO_RELAUNCHED=/);
  assert.match(studioMcpBlock,/--tool-attempts=12/);
  assert.match(studioMcpBlock,/--tool-delay-ms=3000/);
  assert.match(studioMcpBlock,/--timeout=45000/);
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
  assert.doesNotMatch(studioMcpBlock,/ROBLOX_STUDIO_MCP_RETRY_SETTING_ENABLED=/);
  assert.doesNotMatch(studioMcpBlock,/ROBLOX_STUDIO_MCP_RETRY_SETTING_ENABLED_COUNT=/);
  assert.doesNotMatch(studioMcpBlock,/ROBLOX_STUDIO_MCP_RETRY_SETTING_MUTATION=NO/);
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

test('central Studio policy requires actual play and retains prerequisite recovery without fabricated PASS',()=>{
  const roadmap=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
  const studio=roadmap.roblox?.studioExecution||{};
  const recovery=studio.mcpUnavailableRecovery||{};
  assert.equal(studio.required,true);
  assert.equal(studio.optionalDiagnostic,false);
  assert.equal(studio.deploymentGate,true);
  assert.equal(studio.f9Gate,true);
  assert.equal(studio.requiredForInternalRelease,true);
  assert.equal(studio.postBuildUpVerificationLevel,'CODE_STATIC_AND_OFFICIAL_STUDIO_MCP_ACTUAL_PLAY');
  assert.equal(recovery.automaticResumeAfterPrerequisite,true);
  assert.equal(recovery.developmentContinuesWhileStudioUnavailable,true);
  for(const obsolete of [
    'mode','automaticSessionAttempts','toolReadinessAttemptsPerSession',
    'assistantSettingsDiagnosticOnly','assistantSettingsMutationForbidden',
    'guiToggleAutomationForbidden','finalFailureClass',
    'infrastructureFailureMustNotBecomeGameFailure','sessionRestartEligibleFailureScope',
    'completedMcpSessionRuntimeFailureAction','runtimeFailureMustNotConsumeMcpRecoveryAttempts',
    'completedSessionExitContract','settingEnablementEvidenceRequired',
    'settingEnablementAuthority','confirmedEnabledState','explicitDisabledState',
    'unconfirmedStates','assistantSettingsDiagnosticAdvisoryWhenMissingOrUnknown',
    'requiredToolHandshakeCanConfirmEnabledState','unconfirmedSettingAction',
    'explicitDisabledAction'
  ])assert.equal(Object.hasOwn(recovery,obsolete),false,obsolete);
});

test('Studio MCP strategy matrix receives include rows only and never planner metadata axes',()=>{
  const studioPlanBlock=workflow.slice(workflow.indexOf('\n  studio-local-plan:'),workflow.indexOf('\n  studio-mcp-auto-play:'));
  const jsIncludeOnly=/const (?:rawInclude|include)=Array\.isArray\(plan\.include\)\?plan\.include:\[\];[\s\S]*JSON\.stringify\(\{include\}\)/.test(studioPlanBlock)
    ||/JSON\.stringify\(\{include:Array\.isArray\(x\.include\)\?x\.include:\[\]\}\)/.test(studioPlanBlock);
  const powershellIncludeOnly=/\$include = @\(\$plan\.include\)[\s\S]*\$matrix = @\{ include = \$include \} \| ConvertTo-Json -Compress -Depth 12/.test(studioPlanBlock);
  assert.equal(jsIncludeOnly||powershellIncludeOnly,true);
  assert.doesNotMatch(studioPlanBlock,/JSON\.stringify\(x\)\)"/);
  assert.match(studioPlanBlock,/sessionId:\[workflowRunId,String\(row\.gameId\|\|''\),Number\(row\.artifactRunId\|\|0\),Number\(row\.versionNumber\|\|0\)\]\.join\(':'\)/);
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
  const contract=roleRoundContract;
  assert.equal(contract.required,true);
  assert.deepEqual(contract.entryButtonTexts,['참가','입장']);
  assert.equal(contract.selectionButtonText,'역할 선택');
  assert.equal(contract.startButtonText,'게임 시작');
  assert.equal(contract.primaryActionButtonText,'대시');
  assert.ok(contract.afterStartWaitMs>=4000);
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
      ui:{screenGuiPresent:true,visibleButtons:2,required:{TestHUD:{present:true,visible:true,offscreen:false},TestActions:{present:true,visible:true,offscreen:false}}},
      world:{arenaPresent:true,arenaPartCount:80,proximityPromptCount:5},
      workspace:{MapReady:true,ActivePopulation:8,HumanCount:3,MonsterCount:5,WorldArtPass:'MIDNIGHT_SCHOOL_INFECTION_HORROR_V9',CharacterArtDirection:'REALISTIC_HUMANS_ABERRANT_MONSTERS',DesignCodeSync:'ROUND_ROLE_TEST_V1'},
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
  const contract=roleRoundContract;
  const result=evaluateStudioActualPlayContract({
    contract,
    initialClientProbe:{player:{roundState:'INTERMISSION'},workspace:{ActivePopulation:0}},
    preActionClientProbe:{player:{roundState:'INTERMISSION',rootX:0,rootY:3,rootZ:0}},
    clientProbe:{
      player:{characterPresent:true,humanoidPresent:true,rootPresent:true,roundState:'INTERMISSION',role:'WAITING',rootX:4,rootY:3,rootZ:0},
      camera:{present:true},
      ui:{screenGuiPresent:true,visibleButtons:2,required:{TestHUD:{present:true,visible:true,offscreen:false},TestActions:{present:false,visible:false,offscreen:false}}},
      world:{arenaPresent:true,arenaPartCount:80,proximityPromptCount:5},
      workspace:{MapReady:true,ActivePopulation:0,HumanCount:0,MonsterCount:0,WorldArtPass:'MIDNIGHT_SCHOOL_INFECTION_HORROR_V9',CharacterArtDirection:'REALISTIC_HUMANS_ABERRANT_MONSTERS',DesignCodeSync:'ROUND_ROLE_TEST_V1'},
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
  assert.match(helper,/consoleErrorCount:consoleErrors\.size/);
  assert.match(helper,/for\(const row of consoleErrors\.values\(\)\)errors\.push\(row\)/);
  assert.doesNotMatch(helper,/if\(row\.pass!==true\)errors\.push\(\{type:'actual-play-quality-error'/);
  assert.match(helper,/acceptedRoles\.includes\(clean\(selectionPlayer\.role\)\)/);
});


test('role preference intent survives later infection in scenario evaluation',()=>{
  const contract=roleRoundContract;
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
      ui:{screenGuiPresent:true,visibleButtons:2,required:{TestHUD:{present:true,visible:true,offscreen:false},TestActions:{present:true,visible:true,offscreen:false}}},
      world:{arenaPresent:true,arenaPartCount:80,proximityPromptCount:5},
      workspace:{MapReady:true,ActivePopulation:8,HumanCount:4,MonsterCount:4,WorldArtPass:'MIDNIGHT_SCHOOL_INFECTION_HORROR_V9',CharacterArtDirection:'REALISTIC_HUMANS_ABERRANT_MONSTERS',DesignCodeSync:'ROUND_ROLE_TEST_V1'},
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
  assert.match(helper,/checkpoint\('no-release-blocking-runtime-errors',consoleErrors\.size===0\)/);
  assert.match(helper,/consoleErrorCount:consoleErrors\.size/);
  assert.match(helper,/for\(const row of consoleErrors\.values\(\)\)errors\.push\(row\)/);
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

test('Studio harness upgrade rechecks same-source product evidence once',()=>{
  const candidate=item();
  candidate.robloxQualityBuildUpRequired=true;
  candidate.robloxQualityFailureClass='PRODUCT';
  candidate.robloxQualityBuildUpSourceRevision=source;
  candidate.robloxInternalVibePlayEvidence={
    studioHarnessVersion:ROBLOX_STUDIO_HARNESS_VERSION-1,
    sourceRevision:source,
    artifactIdentity:artifact,
    artifactRunId:777,
    universeId:'123',
    placeId:'456',
    versionNumber:9,
    infrastructureFailure:false
  };
  const plan=planLocalStudioCandidates({queue:{items:[candidate]},roadmap:roadmap()});
  assert.deepEqual(plan.include.map(row=>row.gameId),['g1']);
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

test('Roblox Studio audio audit checks runtime playback spatial rolloff grouping and duplicate loops',()=>{
  assert.match(helper,/local soundGroupCount=0/);
  assert.match(helper,/RollOffMinDistance/);
  assert.match(helper,/RollOffMaxDistance/);
  assert.match(helper,/duplicateLoopingPlayingSoundCount/);
  assert.match(helper,/playingSoundSignature/);
  assert.match(helper,/audioGroupCoverage/);
  assert.match(helper,/owner-disabled audio categories/i);

  const contract=deriveStudioActualPlayContract({
    launchCore:['exploration with BGM music audio'],
    releaseGates:['audio feedback pass']
  });
  const probe={
    player:{characterPresent:true,humanoidPresent:true,rootPresent:true,rootX:0,rootY:5,rootZ:0,animatorPresent:true,motorCount:6,roundState:'RUNNING',currentMap:'Forest'},
    camera:{present:true,subjectPresent:true,fieldOfView:70,occluded:false},
    ui:{visibleButtons:1,visibleObjects:1,visibleTexts:[{name:'Goal',text:'탐험'}],offscreenButtons:0,undersizedTouchButtons:0,textOverflowButtons:0,overlapPairs:0,largeOverlayCount:0,largeBlockingOverlayCount:0,largestOverlayCoverage:0,required:{}},
    world:{boundsFinite:true,collidablePartCount:40,floorBelowPlayer:true,floorSampleCount:9,floorHitCount:9,routeSampleCount:0,routeSuccessCount:0,minSpawnThreatDistance:-1,proximityPromptCount:0,clickDetectorCount:0,mobs:[],npcs:[],companions:[],items:[],environmentModels:1,effectCount:0},
    runtime:{
      remoteCount:1,progression:[],inventory:[],inventoryCount:0,systemSignals:1,descendantCount:100,memoryMb:100,
      soundCount:2,playingSoundCount:1,loopingSoundCount:1,playingLoopingSoundCount:1,
      spatialSoundCount:1,spatialConfiguredCount:1,groupedSoundCount:2,soundGroupCount:1,bgmSoundCount:1,
      playingMissingSoundIdCount:0,duplicateLoopingPlayingSoundCount:0,
      playingSoundSignature:'rbxassetid://1|SoundService|true',categories:{}
    },
    workspace:{CurrentMapId:'FOREST'},lighting:{brightness:1.2}
  };
  const pass=evaluateStudioActualPlayContract({
    contract,initialClientProbe:probe,preActionClientProbe:probe,
    postActionClientProbe:{...probe,player:{...probe.player,rootX:1}},
    clientProbe:probe,serverProbe:{runtime:probe.runtime,world:probe.world,workspace:probe.workspace},
    actions:[{id:'keyboard-w',dispatched:true,ok:true}]
  });
  assert.equal(pass.scenarios.find(row=>row.id==='adaptive-audio-surface')?.pass,true);
  assert.equal(pass.metrics.audioQuality.pass,true);
  assert.equal(pass.metrics.audioQuality.audioGroupCoverage,1);

  const broken=structuredClone(probe);
  broken.runtime.spatialConfiguredCount=0;
  broken.runtime.duplicateLoopingPlayingSoundCount=1;
  const fail=evaluateStudioActualPlayContract({
    contract,initialClientProbe:broken,preActionClientProbe:broken,
    postActionClientProbe:{...broken,player:{...broken.player,rootX:1}},
    clientProbe:broken,serverProbe:{runtime:broken.runtime,world:broken.world,workspace:broken.workspace},
    actions:[{id:'keyboard-w',dispatched:true,ok:true}]
  });
  assert.equal(fail.scenarios.find(row=>row.id==='adaptive-audio-surface')?.pass,false);
  assert.equal(fail.qualityFailureDetails.find(row=>row.id==='adaptive-audio-surface')?.repairSurface,'AUDIO');
  assert.equal(fail.metrics.audioQuality.spatialUnconfiguredCount,1);
  assert.equal(fail.metrics.audioQuality.duplicateLoopingPlayingSoundCount,1);
});

test('worker automation, save rejoin, and map rerolls do not invent companion or retry requirements',()=>{
  const contract=deriveStudioActualPlayContract({
    launchCore:['resident hiring and worker automation','seeded room layout rerolls each new empty run','monster aggro and leash reset'],
    releaseGates:['save/rejoin']
  });
  assert.equal(contract.adaptiveCoverage.signals.companion,false);
  assert.equal(contract.adaptiveCoverage.signals.retry,false);
  assert.equal(contract.adaptiveCoverage.signals.save,true);
  assert.equal(contract.adaptiveCoverage.signals.npc,true);
});

test('Studio runtime category scan does not treat generic reset names as retry flow',()=>{
  assert.doesNotMatch(helper,/string\.find\(n,"reset"\)/);
  assert.match(helper,/string\.find\(n,"roundreset"\)/);
  assert.match(helper,/string\.find\(n,"runreset"\)/);
  assert.match(helper,/string\.find\(n,"gamereset"\)/);
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

test('dead-start failure captures console errors and the live viewport before stopping and preserves observed world evidence',{skip:process.platform==='win32'},async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'studio-failure-capture-'));
  const executable=path.join(dir,'mcp.cjs');
  const events=path.join(dir,'events.jsonl');
  const output=path.join(dir,'runtime.json');
  const contractFile=path.join(dir,'launch.json');
  fs.writeFileSync(contractFile,JSON.stringify({studioActualPlayContract:{required:true}}));
  fs.writeFileSync(executable,`#!/usr/bin/env node
const fs=require('node:fs');
const readline=require('node:readline');
const names=['list_roblox_studios','get_studio_state','start_stop_play','get_console_output','screen_capture','user_keyboard_input','user_mouse_input','character_navigation','execute_luau'];
let playing=false,consoleReads=0;
readline.createInterface({input:process.stdin}).on('line',line=>{
 const req=JSON.parse(line);if(req.id==null)return;
 let result={};
 if(req.method==='initialize')result={protocolVersion:'2024-11-05',capabilities:{},serverInfo:{name:'test'}};
 if(req.method==='tools/list')result={tools:names.map(name=>({name,inputSchema:{type:'object',properties:{studio_id:{type:'string'},...(name==='start_stop_play'?{action:{type:'string',enum:['start','stop']}}:{}),...(name==='execute_luau'?{code:{type:'string'},data_model_type:{type:'string',enum:['Client','Server','Edit']}}:{})}}}))};
 if(req.method==='tools/call'){
  const {name,arguments:args}=req.params;
  fs.appendFileSync(${JSON.stringify(events)},JSON.stringify({name,action:args.action,playing})+'\\n');
  if(name==='list_roblox_studios')result={studios:[{studio_id:'test-studio',name:'test'}]};
  if(name==='start_stop_play')playing=args.action==='start';
  if(name==='execute_luau'){
   if(args.code.includes('STUDIO_LOG_HISTORY=')){
    result={content:[{type:'text',text:'STUDIO_LOG_HISTORY='+JSON.stringify([{messageType:3,message:'Startup-only error'},{messageType:3,message:'Menu: attempt to index nil'}])}]};
    process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:req.id,result})+'\\n');return;
   }
   const marker=args.code.match(/ROBLOX_STUDIO_ACTUAL_PLAY_(?:CORE|WORLD|RUNTIME)=/)[0];
   const data=marker.includes('CORE')?{player:{characterPresent:true,humanoidPresent:true,health:0,maxHealth:100,humanoidState:'Dead',rootY:-500}}:marker.includes('WORLD')?{world:{floorBelowPlayer:false,collidablePartCount:0}}:{};
   result={content:[{type:'text',text:marker+JSON.stringify(data)}]};
  }
  if(name==='get_console_output'){
   consoleReads++;
   const entries=[{messageType:3,message:'Menu: attempt to index nil'}];
   if(consoleReads===1)entries.push({messageType:3,message:'Startup-only error'});
   if(consoleReads===2)entries.push({messageType:3,message:'Abort-only error'});
   result=fs.existsSync(${JSON.stringify(events+'.fallback')})?{isError:true,content:[{type:'text',text:'console unavailable'}]}:{content:[{type:'text',text:JSON.stringify(entries)}]};
  }
  if(name==='screen_capture')result=playing?{content:[{type:'image',mimeType:'image/png',data:'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII='}]}:{isError:true,content:[{type:'text',text:'viewport already stopped'}]};
 }
 process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:req.id,result})+'\\n');
});
`);
  fs.chmodSync(executable,0o755);
  try{
    await assert.rejects(runOfficialStudioMcpPlay({mcpCommand:executable,output,expectedStudioName:'test',actualPlayContractPath:contractFile,timeoutMs:5000}),/ROBLOX_STUDIO_DEAD_CHARACTER_ABORT/);
    const report=JSON.parse(fs.readFileSync(output,'utf8'));
    const calls=fs.readFileSync(events,'utf8').trim().split('\n').map(JSON.parse);
    const capture=calls.findIndex(x=>x.name==='screen_capture');
    const stop=calls.findIndex(x=>x.name==='start_stop_play'&&x.action==='stop');
    assert.ok(capture>=0&&stop>capture);
    assert.equal(calls[capture].playing,true);
    assert.equal(report.runtimeVerified,false);
    const consoleCalls=calls.map((call,index)=>({call,index})).filter(({call})=>call.name==='get_console_output');
    assert.equal(consoleCalls.length,2);
    assert.ok(consoleCalls.every(({call,index})=>call.playing&&index<stop));
    assert.equal(report.capabilities.consoleCapture,true);
    assert.equal(report.consoleCaptures.startup.captured,true);
    assert.equal(report.consoleCaptures.abort.captured,true);
    assert.equal(report.metrics.consoleErrorCount,3);
    assert.deepEqual(report.errors.filter(row=>row.type==='studio-console-error').map(row=>row.signature).sort(),
      ['Abort-only error','Menu: attempt to index nil','Startup-only error']);
    assert.equal(report.captureFiles.length,1);
    assert.ok(fs.statSync(report.captureFiles[0].path).size>0);
    assert.equal(report.runtimeProbes.initialClient.player.rootY,-500);
    assert.equal(report.runtimeProbes.initialClient.world.floorBelowPlayer,false);
    assert.equal(report.errors.some(x=>x.type==='studio-capture-evidence-error'),false);
    fs.writeFileSync(events+'.fallback','');
    const scripted=await runStudioScript({mcpCommand:executable,expectedStudioName:'test',outDir:dir,steps:[]});
    assert.equal(scripted.consoleCapture.captured,true);
    assert.equal(scripted.consoleCapture.errorCount,2);
    assert.deepEqual(scripted.consoleCapture.contexts,['Client','Server']);
    assert.ok(scripted.consoleCapture.errors.some(row=>row.signature==='Startup-only error'));

  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('missing local character aborts before movement and routes to exact-source spawn repair',()=>{
  const abortAt=helper.indexOf('ROBLOX_STUDIO_MISSING_CHARACTER_ABORT:NO_PLAYABLE_CHARACTER');
  const movementAt=helper.indexOf("const keyboardTool=client.tool('user_keyboard_input')");
  assert.ok(abortAt>0&&abortAt<movementAt);
  assert.ok(helper.includes('spawnConfirm?.player?.characterPresent===false'));
  const broken=runtime();
  broken.runtimeVerified=false;
  broken.scenarioContractRequired=true;
  broken.scenarioCoverage=[{id:'character-camera-ready',pass:false}];
  broken.qualityFailureKinds=['character-camera-ready'];
  broken.qualityFailureDetails=[{id:'character-camera-ready',repairSurface:'CHARACTER_BOOT',priority:'CRITICAL',hint:'Repair spawn',observed:{characterPresent:false}}];
  broken.errors=[{type:'studio-product-character-spawn-error',signature:'ROBLOX_STUDIO_MISSING_CHARACTER_ABORT:NO_PLAYABLE_CHARACTER'}];
  const applied=applyLocalStudioPlayResult({
    queue:{items:[item()]},gameId:'g1',runtime:broken,expected,workflowRunId:86,studioStepSucceeded:false,
    testedAt:'2026-09-29T02:45:00.000Z'
  });
  assert.equal(applied.result.evidence.infrastructureFailure,false);
  assert.equal(applied.item.currentStep,'REPAIR_REQUIRED');
  assert.ok(applied.item.robloxQualityBuildUpEvidence.repairSurfaces.includes('CHARACTER_BOOT'));
});

test('Studio startup probe follows declared entry steps, exact start action, and blocking-overlay gates before normal QA',()=>{
  assert.equal(ROBLOX_STUDIO_HARNESS_VERSION,18);
  assert.match(helper,/ROBLOX_STUDIO_DEAD_CHARACTER_ABORT:INITIAL_CHARACTER_NOT_PLAYABLE/);
  assert.match(helper,/initial-character-playable/);
  assert.match(helper,/const entryButtonTexts=launchStringList\(actualPlayContract\.entryButtonTexts\)/);
  assert.match(helper,/entry-action-\$\{entryIndex\+1\}-dispatched/);
  assert.match(helper,/ENTRY_ACTION_NOT_VISIBLE/);
  assert.match(helper,/ROLE_SELECTION_NOT_VISIBLE/);
  assert.match(helper,/const exactStartText=clean\(actualPlayContract\.startButtonText\)/);
  assert.match(helper,/START_ACTION_NOT_VISIBLE/);
  assert.match(helper,/afterStartWaitMs/);
  assert.match(helper,/ui-start-gate/);
  // 명시 startButtonText가 없는 기존 게임은 기존 자동 start/play 탐색을 그대로 사용한다.
  assert.match(helper,/start\|play\|begin\|continue\|ready\|시작\|플레이\|계속\|준비/);
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

test('F9 planner reruns legacy multiplayer evidence and persists the current audit',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'roblox-multi-version-'));
  try{
    const gameRoot=path.join(root,'roblox-games','g1');fs.mkdirSync(gameRoot,{recursive:true});
    const launch={launchCore:['multiplayer team sync'],releaseGates:['F9 regression']};
    fs.writeFileSync(path.join(gameRoot,'launch-mvp.json'),JSON.stringify(launch));
    const contract=deriveStudioActualPlayContract(launch);
    const candidate=item();candidate.currentStep='FINAL_REVIEW';
    const probe=runtime();probe.auditProfile='F9_SOAK';probe.scenarioContractRequired=true;
    probe.scenarioContractVersion=contract.version;
    probe.scenarioContractFingerprint='sha256:'+crypto.createHash('sha256').update(JSON.stringify(contract)).digest('hex');
    probe.scenarioCoverage=[{id:'adaptive-multiplayer-sync-surface',pass:true}];
    candidate.robloxInternalVibePlayEvidence=createLocalStudioPlayEvidence({item:candidate,runtime:probe,expected,workflowRunId:42,studioStepSucceeded:true}).evidence;
    assert.equal(planLocalStudioCandidates({queue:{items:[candidate]},roadmap:roadmap(),repoRoot:root}).include.length,1);
    probe.multiplayerAuditSummary={version:2,pass:true,bothClientsStatePass:true,survivorStatePass:true,replacementJoinPass:true,sessionHash:'test-session',verificationScope:'STUDIO_REPLICATED_STATE_AND_PLAYER_LIFECYCLE'};
    candidate.robloxInternalVibePlayEvidence=createLocalStudioPlayEvidence({item:candidate,runtime:probe,expected,workflowRunId:42,studioStepSucceeded:true}).evidence;
    assert.equal(candidate.robloxInternalVibePlayEvidence.runtimeSummary.commercialAudit.multiplayer.version,2);
    assert.equal(planLocalStudioCandidates({queue:{items:[candidate]},roadmap:roadmap(),repoRoot:root}).include.length,0);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('multiplayer Studio planning requires the two-client audit before final review',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'roblox-multi-required-'));
  try{
    const gameRoot=path.join(root,'roblox-games','g1');fs.mkdirSync(gameRoot,{recursive:true});
    const launch={launchCore:['multiplayer team sync'],releaseGates:[]};
    fs.writeFileSync(path.join(gameRoot,'launch-mvp.json'),JSON.stringify(launch));
    const candidate=item();candidate.currentStep='ROBLOX_RUNTIME_FOUNDATION';
    const plan=planLocalStudioCandidates({queue:{items:[candidate]},roadmap:roadmap(),repoRoot:root});
    assert.equal(plan.include.length,1);
    assert.equal(plan.include[0].auditProfile,'F9_SOAK');
    fs.writeFileSync(path.join(gameRoot,'launch-mvp.json'),JSON.stringify({launchCore:['single player exploration'],releaseGates:[]}));
    const single=planLocalStudioCandidates({queue:{items:[candidate]},roadmap:roadmap(),repoRoot:root});
    assert.equal(single.include[0].auditProfile,'FAST_DEEP');
  }finally{fs.rmSync(root,{recursive:true,force:true});}
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


test('F9 multiplayer verifies two observers, survivor recovery and replacement join',{concurrency:true},async(t)=>{
  const cases=['pass','separate-studios','slow-server','one-observer','duplicate-observer','wrong-state','empty-state','stale-challenge','wrong-session','wrong-identity','zero-survivors','replacement-failed','cleanup-failed'];
  await Promise.all(cases.map(mode=>t.test(mode,async()=>{
    const schema={type:'object',required:['studio_id','code','data_model_type'],properties:{studio_id:{type:'string'},code:{type:'string'},data_model_type:{type:'string',enum:['Edit','Server','Client']}}};
    let token='',phase='initial',addCount=0,cleanup=false,startCount=0,identityPolls=0;
    const response=(marker,payload)=>({content:[{type:'text',text:marker+JSON.stringify(payload)}]});
    const player=id=>({name:'Player'+id,userId:id,state:mode==='empty-state'?{}:{RoundState:'Playing',SharedObjective:4}});
    const generated=[];
    const fakeClient={
      tool(){return{inputSchema:schema};},
      async call(name,args){
        if(name==='list_roblox_studios')return {studios:[{studio_id:'unrelated',name:'Other'},{studio_id:'server-2',name:'Server'},{studio_id:'client-2',name:'Client'}]};
        const code=String(args.code||'');generated.push(code);
        const context=args.data_model_type;
        if(code.includes('ROBLOX_STUDIO_MULTIPLAYER_IDENTITY=')){
          assert.match(code,/AuditSession/);
          if(mode==='slow-server'&&context==='Server'&&args.studio_id==='studio-1')identityPolls++;
          if(mode==='slow-server'&&context==='Server'&&identityPolls<=20)return response('ROBLOX_STUDIO_MULTIPLAYER_IDENTITY=',{matches:false,probePresent:false});
          if(mode==='separate-studios'){
            if(args.studio_id==='studio-1')throw new Error('Server datamodel is not available in Edit mode');
            return response('ROBLOX_STUDIO_MULTIPLAYER_IDENTITY=',{matches:args.studio_id===(context==='Server'?'server-2':'client-2')});
          }
          return response('ROBLOX_STUDIO_MULTIPLAYER_IDENTITY=',{matches:args.studio_id==='studio-1'});
        }
        if(mode==='separate-studios')assert.equal(args.studio_id,context==='Edit'?'studio-1':context==='Server'?'server-2':'client-2');
        if(code.includes('ROBLOX_STUDIO_MULTIPLAYER_START=')){
          startCount++;
          token=JSON.parse(code.match(/local token=("[^"\n]+")/)[1]);
          return response('ROBLOX_STUDIO_MULTIPLAYER_START=',{started:true});
        }
        if(code.includes('ROBLOX_STUDIO_MULTIPLAYER_CLEANUP=')){
          cleanup=true;
          if(mode==='cleanup-failed')throw new Error('cleanup unavailable');
          return response('ROBLOX_STUDIO_MULTIPLAYER_CLEANUP=',{ok:true});
        }
        if(code.includes('ROBLOX_STUDIO_MULTIPLAYER_ADD=')){
          phase=++addCount===1?'late':'replacement';
          return response('ROBLOX_STUDIO_MULTIPLAYER_ADD=',{ok:true});
        }
        if(code.includes('ROBLOX_STUDIO_MULTIPLAYER_CAN_LEAVE='))return response('ROBLOX_STUDIO_MULTIPLAYER_CAN_LEAVE=',{ok:true,canLeave:true});
        if(code.includes('ROBLOX_STUDIO_MULTIPLAYER_LEAVE=')){
          phase='leave';return response('ROBLOX_STUDIO_MULTIPLAYER_LEAVE=',{ok:true,userId:1});
        }
        if(code.includes('ROBLOX_STUDIO_MULTIPLAYER_END='))return response('ROBLOX_STUDIO_MULTIPLAYER_END=',{ok:true});
        if(code.includes('ROBLOX_STUDIO_MULTIPLAYER_CLIENT='))return response('ROBLOX_STUDIO_MULTIPLAYER_CLIENT=',{count:2,remoteCount:3,players:[player(1),player(2)]});
        if(code.includes('ROBLOX_STUDIO_MULTIPLAYER_SERVER=')){
          let players=phase==='initial'?[player(1)]:phase==='leave'?[player(2)]:phase==='replacement'?[player(2),player(3)]:[player(1),player(2)];
          if(mode==='zero-survivors'&&phase==='leave')players=[];
          if(mode==='replacement-failed'&&phase==='replacement')players=[player(2)];
          let receipts=players.map(p=>({observerUserId:p.userId,challenge:token+':'+phase,players:structuredClone(players)}));
          if(mode==='one-observer')receipts=receipts.slice(0,1);
          if(mode==='duplicate-observer'&&receipts.length>1)receipts[1]=structuredClone(receipts[0]);
          if(mode==='wrong-state'&&receipts.length>1)receipts[1].players[0].state.SharedObjective=3;
          if(mode==='wrong-identity'&&receipts.length>1)receipts[1].players[0].userId=99;
          if(mode==='stale-challenge')receipts.forEach(r=>r.challenge=token+':old');
          return response('ROBLOX_STUDIO_MULTIPLAYER_SERVER=',{count:players.length,players,receipts,remoteCount:3,testArgs:mode==='wrong-session'?'old-session':token,testArgsReadable:true});
        }
        throw new Error('unexpected probe');
      }
    };
    const result=await runStudioMultiplayerAudit(fakeClient,'studio-1',{adaptiveCoverage:{contractHash:'test'}});
    const expectedPass=['pass','separate-studios','slow-server'].includes(mode);
    assert.equal(result.pass,expectedPass,mode);
    assert.equal(startCount,1,'readiness polling never launches another test');
    assert.equal(cleanup,true);
    assert.equal(result.sameUserRejoinVerified,false);
    if(mode==='slow-server'){
      assert.ok(identityPolls>20);
      assert.ok(result.connectionEvidence.some(row=>row.observations.some(o=>o.identity?.probePresent===false)));
    }
    if(expectedPass){
      assert.equal(result.bothClientsStatePass,true);
      assert.equal(result.survivorStatePass,true);
      assert.equal(result.replacementJoinPass,true);
      assert.equal(addCount,2);
      assert.equal(result.infrastructureFailure,false);
      if(process.env.VIBE2_LUAU_COMPILE){
        const dir=fs.mkdtempSync(path.join(os.tmpdir(),'multiplayer-probe-'));
        try{
          const startCode=generated.find(code=>code.includes('ROBLOX_STUDIO_MULTIPLAYER_START='));
          for(const key of ['receiver','observer']){
            generated.push(JSON.parse(startCode.match(new RegExp(key+'\\.Source=("(?:[^"\\\\]|\\\\.)*")'))[1]));
          }
          for(const [index,code] of generated.entries()){
            const file=path.join(dir,index+'.luau');fs.writeFileSync(file,code);
            const compiled=spawnSync(process.env.VIBE2_LUAU_COMPILE,[file],{encoding:'utf8'});
            assert.equal(compiled.status,0,compiled.stderr);
          }
        }finally{fs.rmSync(dir,{recursive:true,force:true});}
      }
    }else if(['one-observer','duplicate-observer','wrong-state','empty-state','stale-challenge','wrong-identity','zero-survivors','replacement-failed'].includes(mode)){
      assert.equal(result.infrastructureFailure,false,mode+' must request game repair');
    }
  })));
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

test('Studio evidence push conflicts reapply onto latest company-runtime until convergence',()=>{
  const persistStart=workflow.indexOf('- name: Persist exact Studio MCP play evidence');
  const persistEnd=workflow.indexOf('- name: Refill existing 24H development loop after verified play',persistStart);
  assert.ok(persistStart>=0&&persistEnd>persistStart);
  const block=workflow.slice(persistStart,persistEnd);
  assert.match(block,/ROBLOX_STUDIO_MCP_RUNTIME_PUSH_CONFLICT=REAPPLY_LATEST/);
  assert.match(block,/git -C runtime reset --hard origin\/company-runtime/);
  assert.match(block,/Studio MCP evidence reapply on latest runtime failed/);
  assert.match(block,/\$attempt = 0/);
  assert.match(block,/while \(-not \$pushed\)/);
  assert.match(block,/ROBLOX_STUDIO_MCP_RUNTIME_PUSH_RETRY_DELAY=/);
  assert.doesNotMatch(block,/\$attempt -le 5/);
  assert.doesNotMatch(block,/runtime evidence push failed after latest-state reapply retries/);
  assert.doesNotMatch(block,/git -C runtime rebase origin\/company-runtime/);
});


test('Studio retry preserves a verified product failure instead of letting later MCP infrastructure noise overwrite repair routing',()=>{
  const block=workflow.slice(workflow.indexOf('- name: Run actual local play through official Studio MCP'),workflow.indexOf('- name: Finalize Studio session after final capture'));
  assert.match(block,/\$productFailureObserved = \$false/);
  assert.match(block,/ROBLOX_STUDIO_MCP_PRODUCT_FAILURE_PRESERVED=YES/);
  assert.match(block,/\^studio-product-/);
  const productThrow=block.indexOf('official Roblox Studio product failure preserved for repair');
  const timeoutThrow=block.indexOf('official Roblox Studio MCP tool provider remained unavailable after exact-session reconnects');
  assert.ok(productThrow>=0&&timeoutThrow>productThrow);
  const preservedAt=block.indexOf('ROBLOX_STUDIO_MCP_PRODUCT_FAILURE_PRESERVED=YES');
  const restartAt=block.indexOf('ROBLOX_STUDIO_MCP_RECONNECT_SAME_PROCESS=',preservedAt);
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

// [정확한 실행본 증거] Studio Client 미디어 검증과 캡처의 출처는 실행 중인 main HEAD로 고정한다.
test('studio-script requires pinned main head and writes same source revision into report',()=>{
  const begin=helper.indexOf("if(mode==='studio-script')");
  const end=helper.indexOf("if(mode==='opening-capture')",begin);
  const mode=helper.slice(begin,end);
  const script=helper.slice(helper.indexOf('export async function runStudioScript('),helper.indexOf('export async function runOfficialStudioMcpPlay('));
  assert.ok(begin>=0&&end>begin);
  assert.ok(mode.includes('assertCurrentStudioWorkflowHead({workflowSha:clean(process.env.GITHUB_SHA)})'));
  assert.ok(mode.indexOf('assertCurrentStudioWorkflowHead')<mode.indexOf('await runStudioScript('));
  assert.ok(mode.includes('sourceRevision:headGuard.checkoutSha'));
  assert.ok(script.includes('sourceRevision:clean(sourceRevision)'));
  assert.ok(script.includes("fs.writeFileSync(path.join(outDir,'report.json'),JSON.stringify(report,null,1))"));
});

test('mcp-run checks current main head before any Studio MCP play call',()=>{
  const mainAt=helper.indexOf("if(mode==='check-head'||mode==='mcp-run')");
  const guardAt=helper.indexOf('assertCurrentStudioWorkflowHead({workflowSha:',mainAt);
  const playAt=helper.indexOf('runOfficialStudioMcpPlay({',mainAt);
  assert.ok(mainAt>=0&&guardAt>mainAt&&playAt>guardAt);
  assert.match(helper,/ROBLOX_STUDIO_WORKFLOW_HEAD_FRESH=YES/);
});

test('workflow rejects a stale control revision before Studio launch and rejects missing runtime reports',()=>{
  const plan=workflow.slice(workflow.indexOf('\n  studio-local-plan:'),workflow.indexOf('\n  studio-mcp-auto-play:'));
  const block=workflow.slice(workflow.indexOf('\n  studio-mcp-auto-play:'));
  for(const stage of [plan,block]){
    assert.match(stage,/ref: \$\{\{ inputs\.control_revision \|\| github\.sha \}\}/);
    assert.doesNotMatch(stage,/ref: \$\{\{ inputs\.control_revision \|\| 'main' \}\}/);
  }
  const guard=block.indexOf('--mode=check-head');
  const cleanup=block.indexOf('$legacyProcesses =');
  const launch=block.indexOf('$placeLaunchProcess = Start-Process');
  assert.ok(guard>0&&cleanup>guard&&launch>cleanup);
  assert.match(block,/if \(\$LASTEXITCODE -ne 0\) \{ throw 'Stale Studio workflow rejected before any Studio launch or cleanup' \}/);
  const missing=block.slice(block.indexOf('ROBLOX_STUDIO_MCP_EVIDENCE_PERSIST=SKIPPED_NO_MCP_RUNTIME_EVIDENCE'));
  assert.match(missing,/STUDIO_STEP_OUTCOME -eq 'failure' -or \$env:STUDIO_STEP_OUTCOME -eq 'success'/);
  assert.ok(missing.indexOf("throw 'Studio play produced no runtime report")<missing.indexOf('exit 0'));
});

test('check-head CLI performs only the head guard and never needs an MCP process',()=>{
  const cwd=fs.mkdtempSync(path.join(os.tmpdir(),'studio-preflight-'));
  try{
    const main=path.join(cwd,'main');
    fs.mkdirSync(main);
    for(const args of [['init'],['config','user.email','qa@example.com'],['config','user.name','qa'],['commit','--allow-empty','-m','init']]){
      assert.equal(spawnSync('git',args,{cwd:main,encoding:'utf8'}).status,0);
    }
    const head=spawnSync('git',['rev-parse','HEAD'],{cwd:main,encoding:'utf8'}).stdout.trim();
    const tool=path.resolve('tools/company-development-roblox-studio-local-play.mjs');
    for(const [sha,expected] of [[head,0],['0'.repeat(40),1]]){
      const result=spawnSync(process.execPath,[tool,'--mode=check-head','--control-revision='+sha],{cwd,encoding:'utf8',timeout:10000});
      assert.equal(result.status,expected,result.stderr);
      assert.match(result.stdout+result.stderr,expected===0?/ROBLOX_STUDIO_WORKFLOW_HEAD_FRESH=YES/:/ROBLOX_STUDIO_STALE_WORKFLOW_RUN_ABORT/);
    }
  }finally{fs.rmSync(cwd,{recursive:true,force:true});}
});

test('Roblox foundation scan concurrency is stable across main SHAs and force-cancels stale queued Studio runs',()=>{
  assert.match(workflow,/group: roblox-runtime-foundation-\$\{\{ github\.run_id \}\}/);
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
  assert.match(block,/CommandLine -match \$exactPlacePattern/);
  assert.match(block,/StartTime\.ToUniversalTime\(\) - \$record\.CreationDate\.ToUniversalTime\(\)/);
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
  assert.match(closeBlock,/Stop-Process -InputObject \$ownedStudio/);
  assert.match(closeBlock,/if \(-not \$ownedStudio\.WaitForExit\(60000\)\)/);
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

test('Studio launcher handoff remains bound to one isolated Place and cleanup rediscovers its live process',()=>{
  const block=workflow.slice(workflow.indexOf('\n  studio-mcp-auto-play:'));
  const launch=block.indexOf('$placeLaunchProcess = Start-Process');
  assert.ok(block.indexOf('VIBE2_STUDIO_LAUNCH_STARTED=$')<launch);
  assert.ok(block.indexOf('VIBE2_LOCAL_PLACE_FILE=$')<launch);
  assert.ok(block.indexOf('VIBE2_STUDIO_OWNED_PROCESS_RECORDS=')<block.indexOf('.WaitForInputIdle('));
  assert.match(block,/\$parent\.CreationDate\.ToUniversalTime\(\) - \$parentCreated\)\.TotalMilliseconds\) -gt 10/);
  assert.match(block,/\$record\.CreationDate\.ToUniversalTime\(\) -lt \$parentCreated/);
  assert.match(block,/\$null = \$placeLaunchProcess\.Handle/);
  assert.match(block,/\$parentHandle = \$launchHandles\[\$parentKey\]/);
  assert.match(block,/if \(-not \$parentHandle\.HasExited\) \{ continue \}/);
  assert.match(block,/\$record\.CreationDate\.ToUniversalTime\(\) -gt \$parentHandle\.ExitTime\.ToUniversalTime\(\)/);
  assert.match(block,/\$childHandle\.StartTime\.ToUniversalTime\(\) - \$record\.CreationDate\.ToUniversalTime\(\)\)\.TotalMilliseconds\) -le 10/);
  assert.match(block,/foreach \(\$ownedHandle in \$launchHandles.Values\) \{ \$ownedHandle.Dispose\(\) \}/);
  assert.match(block,/\$candidate\.MainWindowHandle -ne 0/);
  const retry=block.slice(block.indexOf('# The official launcher may hand'),block.indexOf('if (-not $sessionCompleted)'));
  assert.match(retry,/CreationDate\.ToUniversalTime\(\) -ge \$launchStarted\.AddSeconds\(-2\)/);
  assert.match(retry,/\$ownedRecords\.Count -eq 1/);
  assert.match(retry,/ROBLOX_STUDIO_MCP_OWNED_PROCESS_HANDOFF=/);
  assert.doesNotMatch(retry,/Start-Process|Stop-Process/);
  const close=block.slice(block.indexOf('- name: Close owned Studio after evidence persistence'),block.indexOf('- name: Refill existing 24H development loop'));
  assert.match(close,/Get-CimInstance Win32_Process/);
  assert.match(close,/\$remainingOwned\.Count\) \{ throw/);
  assert.match(close,/\$unattributed\.Count\) \{ throw/);
  assert.match(close,/ROBLOX_STUDIO_UNATTRIBUTED_PROCESS=/);
  assert.match(close,/parentProcessId = \[int\]\$record\.ParentProcessId/);
  for(const restore of [retry,close]){
    assert.match(restore,/\$ownershipProofs = ConvertFrom-Json -InputObject \$env:VIBE2_STUDIO_OWNED_PROCESS_RECORDS/);
    assert.match(restore,/foreach \(\$proof in \$ownershipProofs\)/);
    assert.doesNotMatch(restore,/foreach \(\$proof in @\(/);
  }
  assert.match(close,/ROBLOX_STUDIO_OWNERSHIP_RESTORED_COUNT=/);
  assert.match(close,/Stop-Process -InputObject \$ownedStudio -Force/);
  assert.match(close,/if \(-not \$ownedStudio\.WaitForExit\(60000\)\)/);
  assert.match(close,/finally \{ \$ownedStudio\.Dispose\(\) \}/);
  // Windows PowerShell can expose a null ExitTime even after WaitForExit succeeds.
  assert.doesNotMatch(close,/\$ownedStudio\.ExitTime/);
  assert.match(close,/ROBLOX_STUDIO_AUTOMATED_CLOSE_AFTER_EVIDENCE=YES:process=\$\(\$ownedStudio.Id\):exitConfirmed=YES/);
  assert.match(close,/\$ownedObserved = \$false/);
  assert.match(close,/\$emptyOwnedProbes -ge 2/);
  assert.match(close,/ROBLOX_STUDIO_CLOSE_STABLE_EMPTY=YES/);
  assert.match(close,/for \(\$closeProbe = 0; \$closeProbe -lt 15; \$closeProbe\+\+\)/);
  assert.doesNotMatch(close,/if \(Get-Process -Id \$ownedStudio.Id/);
  assert.match(close,/\$launchFamily\.ContainsKey\(\[string\]\$_.ProcessId\)/);
  assert.match(close,/\.TotalMilliseconds\) -le 10/);
  assert.doesNotMatch(close,/VIBE2_STUDIO_PROCESS_IDS|Stop-Process -Name/);

  // Execute the workflow's actual path-boundary expression against unrelated windows.
  const expression=close.match(/\$exactPlacePattern = '([^']+)' \+ \[regex\]::Escape\(\$env:VIBE2_LOCAL_PLACE_FILE\) \+ '([^']+)'/);
  assert.ok(expression);
  const place=String.raw`C:\runner temp\studio-qa\run-123\bug-defense.rbxlx`;
  const pattern=new RegExp(expression[1].replace('(?i)','')+place.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+expression[2],'i');
  for(const command of ['"Studio.exe" "'+place+'"','Studio.exe '+place,'Studio.exe "'+place.toUpperCase()+'" --ready'])assert.equal(pattern.test(command),true,command);
  for(const command of ['Studio.exe "'+place+'.backup"','Studio.exe "'+place.replace('run-123','run-456')+'"','Studio.exe "'+place.replace('studio-qa','user-work')+'"','Studio.exe "prefix'+place+'"'])assert.equal(pattern.test(command),false,command);
});


test('Studio commercial UI ignores internal QA controls and offscreen scrolling content',()=>{
  assert.match(helper,/internalQa=string\.find\(row\.name,"InternalQA"/);
  assert.match(helper,/ancestor:IsA\("ScrollingFrame"\)/);
  assert.match(helper,/if not scrollable then gui\.offscreenButtons=gui\.offscreenButtons\+1 end/);
});

test('actionable large panels are not classified as blocking overlays',()=>{
  assert.match(helper,/const blockingOverlayPass=Number\(ui\.largeBlockingOverlayCount\|\|0\)===0/);
  assert.doesNotMatch(helper,/blockingOverlayPass=[\s\S]{0,180}largeOverlayCount\|\|0\)===0/);
});

test('Studio player motion uses actual displacement with Animator instead of requiring Motor6D',()=>{
  assert.match(helper,/adaptive-motion-surface[^\n]+player\.animatorPresent===true&&displacement>=0\.1/);
  assert.doesNotMatch(helper,/adaptive-motion-surface[^\n]+motorCount/);
});

test('external animation warnings absent from game-owned source are suppressed but owned assets still fail',()=>{
  const warning={content:[{type:'text',text:JSON.stringify({message:'Failed to load animation with sanitized ID rbxassetid://114302219876492: Animation failed to load',messageType:3})}]};
  const external=classifyStudioConsoleOutput(warning,{ownedSourceText:'local x = 1'});
  assert.equal(external.errors.length,0);
  assert.equal(external.externalAnimationAssetWarningsSuppressed,1);
  const owned=classifyStudioConsoleOutput(warning,{ownedSourceText:'AnimationId = "rbxassetid://114302219876492"'});
  assert.equal(owned.errors.length,1);
  assert.equal(owned.errors[0].type,'studio-asset-load-error');
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


test('missing declared start button stops Studio before exploration',()=>{
  const abortAt=helper.indexOf('ROBLOX_STUDIO_START_ACTION_ABORT:PRIMARY_ACTION_NOT_VISIBLE');
  const keyboardAt=helper.indexOf("const keyboardTool=client.tool('user_keyboard_input')",abortAt);
  assert.ok(abortAt>=0&&keyboardAt>abortAt);
  assert.match(helper,/checkpoint\('primary-action-available',false\)/);
  const broken=runtime();
  broken.runtimeVerified=false;
  broken.scenarioContractRequired=true;
  broken.scenarioCoverage=[{id:'adaptive-start-playability',pass:false}];
  broken.qualityFailureKinds=['adaptive-start-playability'];
  broken.qualityFailureDetails=[{id:'adaptive-start-playability',repairSurface:'GAME_START',priority:'CRITICAL',hint:'Restore start button',observed:{requiredButtonText:'시작'}}];
  broken.errors=[{type:'studio-product-start-action-error',signature:'ROBLOX_STUDIO_START_ACTION_ABORT:PRIMARY_ACTION_NOT_VISIBLE'}];
  const applied=applyLocalStudioPlayResult({queue:{items:[item()]},gameId:'g1',runtime:broken,expected,workflowRunId:86,studioStepSucceeded:false,testedAt:'2026-09-29T00:00:00.000Z'});
  assert.equal(applied.result.evidence.infrastructureFailure,false);
  assert.equal(applied.item.canonicalState,'REPAIR_REQUIRED');
  assert.ok(applied.item.robloxQualityBuildUpEvidence.repairSurfaces.includes('GAME_START'));
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


test('active Studio runs survive new requests while stale non-Studio scans are cancelled',()=>{
  assert.match(workflow,/group: roblox-studio-shared-host/);
  assert.match(workflow,/select\(\.status == "in_progress"\)/);
  assert.match(workflow,/ROBLOX_OBSOLETE_RUN_ONLY_WAITING_FOR_RUNNER=/);
  const preserve=workflow.indexOf('ROBLOX_PENDING_STUDIO_RUN_PRESERVED=');
  const staleActive=workflow.indexOf('ROBLOX_STALE_FOUNDATION_ACTIVE_NON_STUDIO_CANCEL_REQUESTED=');
  const cancel=workflow.indexOf('actions/runs/$run_id/cancel');
  assert.ok(preserve>0&&preserve<cancel);
  assert.ok(staleActive>0&&staleActive<cancel);
  assert.match(workflow,/const states=new Set\(\['queued','pending','requested','in_progress'\]\)/);
  assert.match(workflow,/studio_planners=.*plan exact local Studio MCP playtests for earliest eligible artifacts/);
  assert.match(workflow,/ROBLOX_PENDING_STUDIO_PLANNER_PRESERVED=/);
});

test('batch cleanup preserves manually requested exact-game Studio verification across main changes',()=>{
  const start=workflow.indexOf('const j=JSON.parse(s);');
  const end=workflow.indexOf('" > /tmp/roblox-stale-foundation-run-ids',start);
  assert.ok(start>=0&&end>start);
  const script=workflow.slice(start,end);
  const runs=[
    {id:1,event:'workflow_dispatch',display_title:'Roblox runtime foundation QA · daechung-rpg',status:'queued',head_sha:'old',actor:{login:'hans1177'}},
    {id:2,event:'workflow_dispatch',display_title:'Roblox runtime foundation QA · scan',status:'queued',head_sha:'old',actor:{login:'github-actions[bot]'}},
    {id:3,event:'push',display_title:'Roblox runtime foundation QA · scan',status:'queued',head_sha:'old',actor:{login:'hans1177'}},
    {id:4,event:'push',display_title:'Roblox runtime foundation QA · scan',status:'in_progress',head_sha:'current',actor:{login:'hans1177'}},
    {id:5,event:'workflow_dispatch',display_title:'Roblox runtime foundation QA · daechung-rpg',status:'in_progress',head_sha:'old',actor:{login:'hans1177'}},
    {id:6,event:'workflow_dispatch',display_title:'Roblox runtime foundation QA · cozy-island',status:'queued',head_sha:'old',actor:{login:'github-actions[bot]'}},
    {id:100,event:'push',display_title:'Roblox runtime foundation QA · scan',status:'queued',head_sha:'newer',actor:{login:'hans1177'}}
  ];
  const result=spawnSync(process.execPath,['-e',"let s='';process.stdin.on('data',c=>s+=c).on('end',()=>{"+script],{
    input:JSON.stringify({workflow_runs:runs}),encoding:'utf8',
    env:{...process.env,CURRENT_RUN_ID:'99',CURRENT_SHA:'current'}
  });
  assert.equal(result.status,0,result.stderr);
  assert.deepEqual(result.stdout.trim().split(/\s+/),['2','3','6']);
  assert.match(script,/manualExactDispatch=r\.event==='workflow_dispatch'/);
  assert.match(script,/actor!==\'github-actions\[bot\]\'/);
  assert.match(script,/runId>=currentRunId/);
});


test('failed Studio input dispatch is not promoted into a product observed-action failure',()=>{
  const contract={required:true,requiredScenarios:['adaptive-semantic-interaction-effect']};
  const actions=[
    {id:'combat-input-miss',type:'mcp-combat-action',dispatched:true,ok:false,effectObserved:false},
    {id:'shop-noop',type:'mcp-world-interaction',semantic:'SHOP',dispatched:true,ok:true,effectObserved:false}
  ];
  const result=evaluateStudioActualPlayContract({contract,actions});
  const patterns=result.scenarios.filter(row=>row.generatedFrom==='OFFICIAL_STUDIO_OBSERVED_ACTION');
  assert.equal(patterns.some(row=>row.actionId==='combat-input-miss'),false);
  assert.equal(patterns.find(row=>row.actionId==='shop-noop')?.pass,false);
});

test('Studio generates separate observed-action patterns so one working button cannot hide another failure',()=>{
  const contract={required:true,requiredScenarios:['adaptive-semantic-interaction-effect']};
  const actions=[
    {id:'ui-discovered-shop',type:'mcp-ui-exploration',dispatched:true,ok:true,effectObserved:true},
    {id:'ui-discovered-equip',type:'mcp-ui-exploration',dispatched:true,ok:true,effectObserved:false}
  ];
  const result=evaluateStudioActualPlayContract({contract,actions});
  const patterns=result.scenarios.filter(row=>row.generatedFrom==='OFFICIAL_STUDIO_OBSERVED_ACTION');
  assert.equal(patterns.length,2);
  assert.equal(patterns.find(row=>row.actionId==='ui-discovered-shop').pass,true);
  const failed=patterns.find(row=>row.actionId==='ui-discovered-equip');
  assert.equal(failed.pass,false);
  assert.equal(result.qualityFailureDetails.find(row=>row.id===failed.id).observed.actionId,'ui-discovered-equip');
  const retry=evaluateStudioActualPlayContract({contract,actions:[...actions,{...actions[1],effectObserved:true}]});
  assert.equal(retry.scenarios.find(row=>row.id===failed.id).pass,false);
});

test('Studio exact prompt reach recovers only the matching failed route audit',()=>{
  const target='Workspace.CozyConquestWorld.ManualGatherForest.WoodNode8.ProximityPrompt';
  const contract={
    required:true,
    requiredScenarios:['adaptive-map-route-coverage'],
    adaptiveCoverage:{signals:{map:true}}
  };
  const clientProbe={
    world:{
      collidablePartCount:24,
      floorBelowPlayer:true,
      floorSampleCount:9,
      floorHitCount:9,
      routeSampleCount:16,
      routeSuccessCount:16
    }
  };
  const route={id:'map-route-'+target,type:'mcp-map-route-audit',dispatched:true,ok:false,moved:0,fall:0,floorBelow:true};
  const exact={
    id:'prompt-ProximityPrompt',
    type:'mcp-world-interaction',
    targetIdentity:target,
    semantic:'GENERAL',
    dispatched:true,
    ok:true,
    effectObserved:true
  };
  const recovered=evaluateStudioActualPlayContract({contract,clientProbe,actions:[route,exact]});
  assert.equal(recovered.scenarios.find(row=>row.id==='adaptive-map-route-coverage').pass,true);
  assert.equal(recovered.qualityFailureKinds.includes('adaptive-map-route-coverage'),false);
  const recoveredPattern=recovered.scenarios.find(row=>row.generatedFrom==='OFFICIAL_STUDIO_OBSERVED_ACTION'&&row.actionId===route.id);
  assert.equal(recoveredPattern.pass,true);
  assert.equal(recoveredPattern.recoveredByInteraction,true);

  const other={...exact,targetIdentity:'Workspace.Other.ProximityPrompt'};
  const blocked=evaluateStudioActualPlayContract({contract,clientProbe,actions:[route,other]});
  assert.equal(blocked.scenarios.find(row=>row.id==='adaptive-map-route-coverage').pass,false);
  const blockedPattern=blocked.scenarios.find(row=>row.generatedFrom==='OFFICIAL_STUDIO_OBSERVED_ACTION'&&row.actionId===route.id);
  assert.equal(blockedPattern.pass,false);
  assert.equal(blockedPattern.recoveredByInteraction,false);
});

test('Studio required pattern without an executed evaluator remains a failure',()=>{
  const result=evaluateStudioActualPlayContract({contract:{required:true,requiredScenarios:['new-pattern-with-no-executor']}});
  assert.deepEqual(result.scenarios,[{id:'new-pattern-with-no-executor',pass:false,required:true,reason:'REQUIRED_SCENARIO_NOT_EXECUTED'}]);
  assert.deepEqual(result.qualityFailureKinds,['new-pattern-with-no-executor']);
});


test('Studio discovered pattern storage is bounded without passing overflow actions',()=>{
  const actions=Array.from({length:65},(_,i)=>({id:'route-'+i,type:'mcp-map-route-audit',dispatched:true,ok:true}));
  const result=evaluateStudioActualPlayContract({contract:{required:true,requiredScenarios:['adaptive-map-route-coverage']},actions});
  assert.equal(result.scenarios.filter(row=>row.generatedFrom==='OFFICIAL_STUDIO_OBSERVED_ACTION').length,64);
  assert.equal(result.scenarios.find(row=>row.id==='observed-action-capacity-exceeded').pass,false);
  assert.equal(deriveStudioActualPlayContract({}).observedActionPatternVersion,1);
});


test('Studio patterns distinguish identically named controls and exclude unclassified shared UI',()=>{
  const actions=[
    {id:'ui-discovered-TextButton',targetIdentity:'Shop.Buy.TextButton',semantic:'SHOP',type:'mcp-ui-exploration',dispatched:true,ok:true,effectObserved:true},
    {id:'ui-discovered-TextButton',targetIdentity:'Inventory.Equip.TextButton',semantic:'EQUIP',type:'mcp-ui-exploration',dispatched:true,ok:true,effectObserved:false},
    {id:'ui-discovered-MessageMode',semantic:'GENERAL',type:'mcp-ui-exploration',dispatched:true,ok:true,effectObserved:false}
  ];
  const result=evaluateStudioActualPlayContract({contract:{required:true,requiredScenarios:['adaptive-semantic-interaction-effect']},actions});
  const patterns=result.scenarios.filter(row=>row.generatedFrom);
  assert.equal(patterns.length,2);
  assert.notEqual(patterns[0].id,patterns[1].id);
  assert.equal(patterns[0].pass,true);
  assert.equal(patterns[1].pass,false);
});


test('F9 save rejoin distinguishes missing Studio observations from observed data loss',()=>{
  const beforeProbe={runtime:{progression:[{scope:'player',name:'Gold',value:'12'}],inventory:[]}};
  for(const restartError of ['ROBLOX_STUDIO_MCP_TOOL_ERROR:No Roblox Studio instances are connected','MCP timeout: tools/call','']){
    const result=evaluateStudioSaveRejoin({beforeProbe,restartError});
    assert.equal(result.pass,false);
    assert.equal(result.infrastructureFailure,true);
    assert.equal(result.restartOk,false);
    assert.ok(result.error);
  }
  const lost=evaluateStudioSaveRejoin({beforeProbe,rejoinProbe:{runtime:{progression:[{scope:'player',name:'Gold',value:'0'}],inventory:[]}}});
  assert.equal(lost.pass,false);
  assert.equal(lost.infrastructureFailure,false);
  assert.equal(lost.progressionPreserved,false);
  const missingState=evaluateStudioSaveRejoin({beforeProbe,rejoinProbe:{}});
  assert.equal(missingState.pass,false);
  assert.equal(missingState.infrastructureFailure,false);
  assert.equal(evaluateStudioSaveRejoin({beforeProbe,rejoinProbe:beforeProbe}).pass,true);
});

test('F9 restart transport failure keeps checkpoint blocked without inventing save repair',async()=>{
  const start=helper.indexOf("        let restartError='';");
  const end=helper.indexOf('\n      }\n      const multiplayerDeclared',start);
  assert.ok(start>0&&end>start);
  const execute=new (Object.getPrototypeOf(async function(){}).constructor)(
    'evaluateStudioSaveRejoin','existingFailures',
    `let started=true,rejoinClientProbe=null,saveRejoinSummary=null;
     const finalClientProbe={runtime:{progression:[{name:'Gold',value:'12'}]}};
     const client={tool:()=>({}),call:async()=>{throw new Error('No Roblox Studio instances are connected');}};
     const studioId='fixture',actualPlayContract={},startStopArgs=()=>({}),wait=async()=>{};
     const collectStudioActualPlayProbe=async()=>null;
     const scenarioCoverage=[],qualityFailureKinds=[...existingFailures],qualityFailureDetails=[],errors=[],checkpoints=[];
     const checkpoint=(id,pass)=>checkpoints.push({id,pass});
     ${helper.slice(start,end)}
     return {saveRejoinSummary,qualityFailureKinds,errors,checkpoints};`
  );
  for(const existing of [[],['adaptive-world-safety']]){
    const result=await execute(evaluateStudioSaveRejoin,existing);
    assert.deepEqual(result.qualityFailureKinds,existing);
    assert.equal(result.saveRejoinSummary.pass,false);
    assert.equal(result.checkpoints[0].pass,false);
    assert.equal(result.errors[0].type,'studio-save-rejoin-harness-infrastructure');
    assert.match(result.errors[0].signature,/No Roblox Studio instances/);
  }
});



test('Studio planning excludes owner-held games in batch and explicit rechecks without blocking peers',()=>{
 const candidate=item();
 const peer={...structuredClone(candidate),gameId:'g2'};
 for(const hold of [
  {ownerCanonicalRules:{ownerExclusiveDevelopment:{status:'ACTIVE',gameIds:['g1']}}},
  {robloxDevelopmentInvestment:{ownerHoldGameIds:['g1']}}
 ]){
  const policy={...roadmap(),...hold};
  const queue={items:[candidate,peer]},before=structuredClone(queue);
  assert.deepEqual(planLocalStudioCandidates({queue,roadmap:policy}).include.map(row=>row.gameId),['g2']);
  assert.equal(planLocalStudioCandidates({queue,roadmap:policy,requestedGameId:'g1',recheckProductFailure:true}).include.length,0);
  assert.deepEqual(queue,before);
 }
 const released={...roadmap(),ownerCanonicalRules:{ownerExclusiveDevelopment:{status:'RELEASED',gameIds:['g1']}}};
 assert.equal(planLocalStudioCandidates({queue:{items:[candidate]},roadmap:released}).include.length,1);
});

test('Studio planner cannot be cancelled by a later generic push before exact-game Studio jobs are created',()=>{
 const plan=workflow.slice(workflow.indexOf('  studio-local-plan:'),workflow.indexOf('  studio-mcp-auto-play:'));
 assert.match(plan,/group: roblox-studio-mcp-plan-\$\{\{ github\.run_id \}\}/);
 assert.match(plan,/cancel-in-progress: false/);
 assert.doesNotMatch(plan,/group: roblox-studio-mcp-plan-\$\{\{ inputs\.game_id \|\| 'scan' \}\}/);
});

test('newest owner exact Studio request refreshes only matching queued games and preserves unrelated actual play',()=>{
 const plan=workflow.slice(workflow.indexOf('  studio-local-plan:'),workflow.indexOf('  studio-mcp-auto-play:'));
 assert.match(plan,/Cancel superseded pending Studio runs selected by this exact plan/);
 assert.match(plan,/PLANNED_MATRIX: \$\{\{ steps\.plan\.outputs\.matrix \}\}/);
 assert.match(plan,/ROBLOX_SUPERSEDED_PENDING_STUDIO_RUN_CANCELLED=/);
 assert.match(plan,/ROBLOX_SUPERSEDED_PENDING_STUDIO_RUN_PRESERVED_ACTIVE=/);
 assert.match(plan,/ROBLOX_SUPERSEDED_PENDING_STUDIO_RUN_PRESERVED_UNRELATED=/);
 assert.match(plan,/ROBLOX_SUPERSEDED_PENDING_STUDIO_RUN_PRESERVED_EXACT_TRIGGER=/);
 assert.match(plan,/ROBLOX_SUPERSEDED_PENDING_STUDIO_RUN_PRESERVED_UNRELATED_EXACT_TRIGGER=/);
 assert.match(plan,/ROBLOX_SUPERSEDED_PENDING_STUDIO_RUN_OWNER_EXACT_REPLACES_OLDER_EXACT=/);
 assert.ok(plan.includes('contents/roblox-games/.company-runtime-trigger?ref=$run_head'));
 assert.ok(plan.includes('older_trigger_game='));
 assert.ok(plan.includes('OWNER_EXACT="$CURRENT_TRIGGER_CHANGED"'));
 assert.ok(plan.includes('OLDER_EXACT="$older_exact_trigger"'));
 assert.ok(plan.includes("if(ownerExact)return process.stdout.write(waiting.every(j=>planned.has(String(j.name||'').slice(prefix.length)))?'CANCEL':'PRESERVE_UNRELATED')"));
 assert.match(plan,/CURRENT_TRIGGER_CHANGED: \$\{\{ steps\.plan\.outputs\.trigger_changed \}\}/);
 assert.match(plan,/commits\/\$run_head/);
 assert.match(plan,/roblox-games\/\.company-runtime-trigger/);
 assert.match(plan,/const manualExactDispatch=r\.event==='workflow_dispatch'/);
 assert.match(plan,/actor!==\'github-actions\[bot\]\'/);
 assert.match(plan,/if\(manualExactDispatch\)continue/);
 assert.doesNotMatch(plan,/if\(r\.event==='workflow_dispatch'&&title!==prefix\+'scan'\)continue/);
 assert.match(plan,/games\.every\(g=>planned\.has\(g\)\)\?'CANCEL':'PRESERVE_UNRELATED'/);
 assert.match(plan,/PRESERVED_UNRELATED_EXACT_TRIGGER=\$run_id:\$older_trigger_game"\n\s+continue/);
});

test('Studio serializes play without replacing pending games or blocking parallel build jobs',()=>{
 const play=workflow.slice(workflow.indexOf('  studio-mcp-auto-play:'));
 assert.match(play,/concurrency:\n      group: roblox-studio-shared-host\n      cancel-in-progress: false\n      queue: max/);
 assert.match(play,/strategy:\n      fail-fast: false\n      max-parallel: 1\n      matrix:/);
 assert.match(play,/needs: studio-local-plan/);
 assert.doesNotMatch(play.split('    steps:')[0],/needs:.*runtime-foundation/);
 const preserve=workflow.indexOf('ROBLOX_PENDING_STUDIO_RUN_PRESERVED=');
 assert.ok(preserve>0&&preserve<workflow.indexOf('actions/runs/$run_id/cancel'));
 assert.match(workflow,/startswith\("Official Studio MCP actual play "\)/);
 assert.match(workflow,/select\(\.status == "queued" or \.status == "pending" or \.status == "requested" or \.status == "waiting" or \.status == "in_progress"\)/);
 assert.match(workflow,/if \[\[ "\$run_status" =~ \^\(queued\|pending\|requested\|waiting\|in_progress\)\$ \]\]; then[\s\S]{0,700}ROBLOX_PENDING_STUDIO_RUN_PRESERVED=/);
});

test('manual single-game diagnosis preserves product failures and still rejects mismatched artifacts',()=>{
 const candidate=item();
 candidate.robloxQualityBuildUpRequired=true;
 candidate.robloxQualityBuildUpSourceRevision=source;
 candidate.robloxQualityBuildUpEvidence={qualityFailureKinds:['adaptive-world-safety']};
 candidate.robloxInternalVibePlayEvidence={studioHarnessVersion:ROBLOX_STUDIO_HARNESS_VERSION,pass:false,runtimeVerified:false,failureClass:'STUDIO_PRODUCT_QUALITY_FAILURE'};
 const peer=structuredClone(candidate);peer.gameId='g2';
 const queue={items:[candidate,peer]};
 const before=structuredClone(queue);
 const options={queue,roadmap:roadmap(),requestedGameId:'g1'};
 assert.equal(planLocalStudioCandidates(options).include.length,0);
 const replay=planLocalStudioCandidates({...options,recheckProductFailure:true});
 assert.deepEqual(replay.include.map(row=>row.gameId),['g1']);
 assert.deepEqual(queue,before);
 assert.equal(planLocalStudioCandidates({...options,requestedGameId:'',recheckProductFailure:true}).include.length,0);
 for(const patch of [
   {robloxBuildOrPackagePassed:false},
   {robloxBuildSourceRevision:'c'.repeat(40)},
   {robloxBuildArtifactIdentity:'sha256:'+'d'.repeat(64)},
   {robloxRuntimeCandidateEvidence:null},
   {status:'DISABLED'}
 ]){
   const changed={...structuredClone(candidate),...patch};
   assert.equal(planLocalStudioCandidates({...options,queue:{items:[changed]},recheckProductFailure:true}).include.length,0);
 }
 assert.ok(workflow.includes("RECHECK_PRODUCT_FAILURE: ${{ github.event_name == 'workflow_dispatch' && inputs.run_studio == true && inputs.game_id != '' }}"));
 assert.ok(workflow.includes('"--recheck-product-failure=$RECHECK_PRODUCT_FAILURE"'));
});

test('newer exact infrastructure failures resume without clearing product repair evidence',()=>{
 const candidate=item();
 candidate.robloxQualityBuildUpRequired=true;
 candidate.robloxQualityBuildUpSourceRevision=source;
 candidate.robloxQualityBuildUpEvidence={testedAt:'2026-09-28T00:00:00Z'};
 candidate.robloxInternalVibePlayEvidence={...candidate.robloxRuntimeCandidateEvidence,
   studioHarnessVersion:ROBLOX_STUDIO_HARNESS_VERSION,
   infrastructureFailure:true,failureClass:'STUDIO_MCP_INFRASTRUCTURE_PENDING',testedAt:'2026-09-29T00:00:00Z'};
 const before=structuredClone(candidate);
 assert.equal(planLocalStudioCandidates({queue:{items:[candidate]},roadmap:roadmap()}).include.length,1);
 assert.deepEqual(candidate,before);
 for(const patch of [
   {sourceRevision:'c'.repeat(40)},{artifactIdentity:'sha256:'+'d'.repeat(64)},
   {artifactRunId:778},{versionNumber:10},{placeId:'789'},
   {testedAt:'2026-09-27T00:00:00Z'},{testedAt:'invalid'},
   {infrastructureFailure:false},{failureClass:'STUDIO_PRODUCT_QUALITY_FAILURE'}
 ]){
   const changed=structuredClone(candidate);Object.assign(changed.robloxInternalVibePlayEvidence,patch);
   assert.equal(planLocalStudioCandidates({queue:{items:[changed]},roadmap:roadmap()}).include.length,0);
 }
 const peer=structuredClone(candidate);peer.gameId='g2';
 const batch=planLocalStudioCandidates({queue:{items:[candidate,peer]},roadmap:roadmap()});
 assert.equal(batch.include.length,1);assert.equal(batch.sharedInfrastructureCanary,true);
});

test('Studio captures persist exact image bytes before later failures and remain separate by phase',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'studio-captures-'));
 try{
  const bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
  const response={content:[{type:'image',mimeType:'image/png',data:bytes.toString('base64')}]};
  const before=collectImages(response,[],dir,'before');
  const after=collectImages(response,[],dir,'after');
  assert.deepEqual(fs.readFileSync(before[0].path),bytes);
  assert.notEqual(before[0].path,after[0].path);
  assert.equal(before[0].sha256,crypto.createHash('sha256').update(bytes).digest('hex'));
  assert.throws(()=>collectImages({type:'image',data:'',mimeType:'image/png'},[],dir,'failure'));
  assert.deepEqual(fs.readFileSync(before[0].path),bytes);
  assert.match(workflow,/name: Upload Studio captures and runtime report\n        if: always\(\)/);
  assert.match(workflow,/studio-captures-\$\{\{ matrix.gameId/);
  assert.match(workflow,/without duplicate launch/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});


test('orphan cleanup ends only nonce-marked automated multiplayer tests',async()=>{
 const calls=[];
 const token='VIBE2_F9_MULTIPLAYER_AUDIT_12345678-abcd-abcd-abcd-123456789abc';
 const fake={tool:()=>({inputSchema:{properties:{studio_id:{},code:{},data_model_type:{enum:['Edit','Client','Server']}}}}),
  async call(name,args){
   if(name==='list_roblox_studios')return {studios:['owned','user','unmarked'].map(id=>({studio_id:id,name:id}))};
   calls.push(args);
   if(args.code.includes('ORPHAN_IDENTITY'))return {content:[{type:'text',text:'ROBLOX_STUDIO_ORPHAN_IDENTITY='+JSON.stringify({token:args.studio_id==='user'?'my-test':token,probePresent:args.studio_id!=='unmarked'})}]};
   assert.equal(args.studio_id,'owned');assert.ok(args.code.includes(JSON.stringify(token)));
   return {content:[]};
  }};
 assert.deepEqual(await stopOwnedStudioMultiplayerTests(fake),{stopped:1});
 assert.equal(calls.filter(x=>x.code.includes('EndTest')).length,1);
});


test('each Studio job downloads into a unique writable exact-content package directory',()=>{
 const block=workflow.slice(workflow.indexOf('  studio-mcp-auto-play:'));
 assert.match(block,/NewGuid\(\)/);
 assert.match(block,/VIBE2_STUDIO_PACKAGE_ROOT=\$sessionRoot/);
 assert.match(block,/path: \$\{\{ env.VIBE2_STUDIO_PACKAGE_ROOT \}\}/);
 assert.doesNotMatch(block,/\$root = Join-Path \$env:RUNNER_TEMP 'company-roblox-studio-package'/);
 const hashCheck=block.indexOf('Local Place SHA256 mismatch');
 const writable=block.indexOf('$places[0].IsReadOnly = $false');
 const launch=block.indexOf('$placeLaunchProcess = Start-Process');
 assert.ok(hashCheck>0&&writable>hashCheck&&launch>writable);
  // [스튜디오 소유권] 이전 경로와 격리 경로 모두 자동 실행 소유 여부를 검증한다.
  // 사용자가 연 스튜디오 창은 정리 대상에서 제외한다.
  assert.match(block,/\$legacyOwned = \[string\]\$legacy\.CommandLine -match \$legacyPattern/);
  assert.match(block,/\$isolatedQaOwned = \[string\]\$legacy\.CommandLine -match \$qaPattern/);
  assert.match(block,/if \(-not \$legacyOwned -and -not \$isolatedQaOwned\)/);
  assert.match(block,/ROBLOX_STUDIO_UNOWNED_PROCESS_PRESERVED/);
  assert.match(block,/\$owned\.ProcessName -ne 'RobloxStudioBeta'/);
 assert.match(block,/CreationDate.ToUniversalTime/);
 assert.match(block,/Stop-Process -InputObject \$owned -Force/);
 assert.match(block,/if \(-not \$owned\.WaitForExit\(60000\)\)/);
 assert.match(block,/finally \{ \$owned\.Dispose\(\) \}/);
 assert.doesNotMatch(block,/Stop-Process -Name/);
});

test('route optimization retains every waypoint safety check and refreshes long routes',async()=>{
  const start=helper.indexOf("const routeLimit=auditMode===");
  const end=helper.indexOf("const semanticOf=row=>",start);
  assert.ok(start>=0&&end>start);
  const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
  const routeBody=helper.slice(start,end);
  async function exercise(blockedAt=0){
    let position=0,steps=0,full=0,light=0;
    const route=()=>({kind:'prompt',name:'destination',pass:true,x:180,y:0,z:0,
      waypointCount:Math.max(0,(180-position)/10),
      waypoints:Array.from({length:Math.min(16,Math.max(0,(180-position)/10))},(_,i)=>({x:position+(i+1)*10,y:0,z:0}))});
    const probe=()=>({player:{rootX:position,rootY:0,rootZ:0},world:{floorBelowPlayer:steps!==blockedAt||blockedAt===0,routes:[route()]}});
    const timelineProbes=[],actions=[];
    const run=new AsyncFunction('env',`
      const {initialClientProbe,collectStudioActualPlayProbe,timelineProbes,actions,client}=env;
      const auditMode='FAST_DEEP',studioId='test',actualPlayContract={},navigationTool={inputSchema:{}};
      const clean=v=>String(v??'').trim(),entityRows=v=>Array.isArray(v)?v:[];
      const pointDistance=(a,b)=>Math.hypot(b.rootX-a.rootX,b.rootY-a.rootY,b.rootZ-a.rootZ);
      const characterNavigationArgs=(_schema,_id,waypoint)=>waypoint;
      const wait=async()=>{};
      ${routeBody}
    `);
    await run({initialClientProbe:probe(),timelineProbes,actions,
      client:{call:async(_name,waypoint)=>{position=waypoint.x;steps++;return {};}},
      collectStudioActualPlayProbe:async(_client,_id,_contract,_context,options={})=>{
        if(options.planRoutes===false)light++;else full++;
        const result=probe();if(options.planRoutes===false)result.world.routes=[];
        return result;
      }});
    return{steps,full,light,actions};
  }
  const completed=await exercise();
  assert.equal(completed.steps,18);
  assert.equal(completed.light,18);
  assert.equal(completed.full,2);
  assert.equal(completed.actions[0].ok,true);
  assert.equal(completed.actions[0].waypointCount,18);
  const blocked=await exercise(3);
  assert.equal(blocked.steps,3);
  assert.equal(blocked.light,3);
  assert.equal(blocked.actions[0].ok,false);
  assert.match(helper,/finalClientProbe=await collectStudioActualPlayProbe/);
});

test('Studio combat world probe recognizes real native mesh enemies without inventing movement or damage',()=>{
  const start=helper.indexOf('function studioActualPlayWorldProbeSource');
  const end=helper.indexOf('function studioActualPlayRuntimeProbeSource',start);
  assert.ok(start>=0&&end>start);
  const generate=new Function(helper.slice(start,end)+';return studioActualPlayWorldProbeSource;')();
  const probe=generate({planRoutes:false});
  const game=fs.readFileSync('roblox-games/fantasy-survival/server/Game.server.luau','utf8');
  assert.match(game,/model:SetAttribute\("EnemyHealth",hitPoints\)/);
  assert.match(game,/model:SetAttribute\("EnemyMaxHealth",hitPoints\)/);
  assert.match(game,/model:SetAttribute\("NativeMobMotion","IDLE"\)/);
  assert.match(probe,/nativeMobHealth=d:GetAttribute\("EnemyHealth"\)/);
  assert.match(probe,/nativeMobMaxHealth=d:GetAttribute\("EnemyMaxHealth"\)/);
  assert.match(probe,/not dh and not isPlayer and typeof\(nativeMobHealth\)=="number"/);
  assert.match(probe,/typeof\(nativeMobMaxHealth\)=="number" and nativeMobMaxHealth>0/);
  assert.match(probe,/kind="NativeMeshModel"/);
  assert.match(probe,/hp=nativeMobHealth,maxHp=nativeMobMaxHealth/);
  assert.match(probe,/state=tostring\(d:GetAttribute\("NativeMobMotion"\)/);
  assert.doesNotMatch(probe,/nativeMobHealth\s*=\s*[0-9]+|nativeMobMaxHealth\s*=\s*[0-9]+/);
  assert.match(helper,/id:'adaptive-combat-surface'.*mobRows\.length>0.*timelineMobDynamic/);
});

test('lightweight route observations keep live world safety and entity fields',()=>{
  const start=helper.indexOf('function studioActualPlayWorldProbeSource');
  const end=helper.indexOf('function studioActualPlayRuntimeProbeSource',start);
  const build=new Function(helper.slice(start,end)+';return studioActualPlayWorldProbeSource;')();
  const full=build(),light=build({planRoutes:false});
  assert.match(full,/local routePlanningPerformed=true/);
  assert.match(light,/local routePlanningPerformed=false/);
  for(const source of [full,light]){
    assert.match(source,/if root and routePlanningPerformed then/);
    assert.match(source,/floorBelowPlayer=floorBelow/);
    assert.match(source,/floorSampleCount=floorSampleCount/);
    assert.match(source,/mobs=mobRows,npcs=npcRows,companions=companionRows/);
    assert.match(source,/routePlanningPerformed=routePlanningPerformed/);
  }
});

test('observed class selection must receive the selected class and close its UI before gameplay',async()=>{
  const start=helper.indexOf('const classChoiceProbe=await');
  const end=helper.indexOf("\n    }\n\n    if(actualPlayContract?.required===true){",start);
  assert.ok(start>=0&&end>start);
  const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
  const block=helper.slice(start,end);
  const run=new AsyncFunction('env',`
    const {collectStudioActualPlayProbe,client,actions,checkpoint}=env;
    const studioId='test',actualPlayContract={},clean=v=>String(v??'').trim(),entityRows=v=>Array.isArray(v)?v:[];
    const mouseClickArgs=(_schema,_id,x,y)=>({x,y}),wait=async()=>{};
    ${block}
  `);
  const button={classId:'BREAKER',selectAction:'SELECT_BREAKER',visible:true,active:true,width:175,height:70,centerX:30,centerY:40};
  const snapshot=(classId,visible)=>({player:{classId},ui:{interactive:visible?[button]:[]}});
  async function exercise(snapshots){
    const actions=[],checks=[];let probes=0,clicks=0,error='';
    try{await run({actions,checkpoint:(id,pass)=>checks.push({id,pass}),
      client:{tool:()=>({}),call:async()=>{clicks++;return {};}},
      collectStudioActualPlayProbe:async()=>snapshots[Math.min(probes++,snapshots.length-1)]
    });}catch(e){error=e.message;}
    return{actions,checks,probes,clicks,error};
  }
  const good=await exercise([snapshot('NONE',true),snapshot('BREAKER',true),snapshot('BREAKER',false)]);
  assert.equal(good.clicks,1);
  assert.equal(good.probes,3);
  assert.equal(good.actions[0].panelClosed,true);
  assert.equal(good.error,'');
  const stuck=await exercise([snapshot('NONE',true),snapshot('BREAKER',true)]);
  assert.match(stuck.error,/CLASS_SELECTION_NOT_CONFIRMED/);
  assert.equal(stuck.clicks,1);
  assert.equal(stuck.actions[0].ok,false);
  const unacknowledged=await exercise([snapshot('NONE',true),snapshot('NONE',false)]);
  assert.match(unacknowledged.error,/CLASS_SELECTION_NOT_CONFIRMED/);
  const existing=await exercise([snapshot('BREAKER',false)]);
  assert.equal(existing.clicks,0);
  assert.equal(existing.error,'');
});

test('Studio fetches the exact candidate source revision before deriving single-window multiplayer evidence',()=>{
  const block=workflow.slice(workflow.indexOf('\n  studio-mcp-auto-play:'));
  assert.match(block,/git -C main fetch --no-tags --depth=1 origin '\$\{\{ matrix\.sourceRevision \}\}'/);
  assert.match(helper,/deriveExactStaticMultiplayerEvidence/);
  assert.match(helper,/gitTreeTextAtRevision/);
  assert.match(helper,/authority:clean\(exactStaticMultiplayer\.authority\)/);
  assert.match(helper,/checks:exactStaticMultiplayer\.checks/);
  assert.match(helper,/runtimeStaticMultiplayerExact/);
  assert.match(helper,/item\.robloxMultiplayerQaEvidence=\{/);
});

test('exact multiplayer source contract is prebound before Studio pending branch',()=>{
  const prebind=workflow.indexOf('ROBLOX_F7_MULTIPLAYER_CODE_CONTRACT_PREBOUND=');
  const studioWait=workflow.indexOf('if(!exactStudioInternalValidation)');
  assert.ok(prebind>0&&studioWait>prebind);
  const block=workflow.slice(Math.max(0,prebind-1800),studioWait);
  assert.match(block,/sourceRevision,/);
  assert.match(block,/artifactIdentity,/);
  assert.match(block,/authority:'roblox-static-two-client-source-contract'/);
  assert.match(block,/runtimeTwoClientExecutionRequired:false/);
});

test('Studio rebuilds exact static multiplayer evidence from the candidate source revision when queue evidence is stale',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'studio-exact-multi-'));
  try{
    const gameRoot=path.join(root,'roblox-games','g1');
    fs.mkdirSync(path.join(gameRoot,'server'),{recursive:true});
    fs.mkdirSync(path.join(gameRoot,'client'),{recursive:true});
    fs.writeFileSync(path.join(gameRoot,'launch-mvp.json'),JSON.stringify({launchCore:['multiplayer team sync']}));
    fs.writeFileSync(path.join(gameRoot,'server','Game.server.luau'),'local Players=game:GetService("Players")\nlocal rows=Players:GetPlayers()\nremote:FireAllClients("MULTIPLAYER_SYNC",{ParticipantCount=#rows})\n');
    fs.writeFileSync(path.join(gameRoot,'client','Game.client.luau'),'remote.OnClientEvent:Connect(function(kind) if kind=="MULTIPLAYER_SYNC" then print(kind) end end)\n');
    for(const args of [['init'],['config','user.email','qa@example.com'],['config','user.name','qa'],['add','.'],['commit','-m','fixture']]){
      const r=spawnSync('git',args,{cwd:root,encoding:'utf8'});assert.equal(r.status,0,r.stderr);
    }
    const sourceRevision=spawnSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).stdout.trim();
    const artifactIdentity='sha256:'+'b'.repeat(64);
    const evidence=deriveExactStaticMultiplayerEvidence({
      actualPlayContractPath:path.join(gameRoot,'launch-mvp.json'),
      runtimeIdentity:{gameId:'g1',sourceRevision,artifactIdentity},
      priorEvidence:{gameId:'g1',sourceRevision:'c'.repeat(40),artifactIdentity:'sha256:'+'d'.repeat(64),passed:true,codeContractPassed:true}
    });
    assert.equal(evidence?.passed,true);
    assert.equal(evidence?.sourceRevision,sourceRevision);
    assert.equal(evidence?.artifactIdentity,artifactIdentity);
    assert.equal(evidence?.checks?.twoParticipantCapablePath,true);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('single-window multiplayer accepts only the exact static source contract without claiming two clients',()=>{
  const contract=deriveStudioActualPlayContract({launchCore:['multiplayer team sync'],releaseGates:['F9 regression']});
  const runtimeIdentity={gameId:'g1',sourceRevision:source,artifactIdentity:artifact};
  const evidence={...runtimeIdentity,authority:'roblox-static-two-client-source-contract',passed:true,codeContractPassed:true,runtimeTwoClientExecutionRequired:false,
    checks:{playerRoster:true,participantCount:true,authoritativeBroadcast:true,clientReceive:true,twoParticipantCapablePath:true}};
  const evaluate=(e= evidence,identity=runtimeIdentity,singleWindow=true)=>evaluateStudioActualPlayContract({contract,auditProfile:'F9_SOAK',singleWindow,multiplayerSourceEvidence:e,runtimeIdentity:identity,clientProbe:{runtime:{actualPlayerCount:1}}});
  const good=evaluate();
  const row=result=>result.scenarios.find(row=>row.id==='adaptive-multiplayer-sync-surface');
  assert.equal(row(good).pass,true);
  assert.equal(row(good).verificationScope,'STATIC_CODE_CONTRACT');
  assert.equal(good.metrics.surfaces.multiplayerActualSessionPass,false);
  for(const bad of [null,{...evidence,sourceRevision:'c'.repeat(40)},{...evidence,artifactIdentity:'sha256:'+'d'.repeat(64)},
    {...evidence,gameId:'other'},{...evidence,authority:'untrusted'}, {...evidence,checks:{...evidence.checks,clientReceive:false}}])assert.equal(row(evaluate(bad)).pass,false);
  assert.equal(row(evaluate(evidence,{},true)).pass,false);
  assert.equal(row(evaluate(evidence,runtimeIdentity,false)).pass,false);
});

test('exact runtime static multiplayer evidence replaces stale queue evidence and preserves the verified checkpoint',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'studio-static-multi-'));
  try{
    const gameRoot=path.join(root,'roblox-games','g1');fs.mkdirSync(gameRoot,{recursive:true});
    const launch={launchCore:['multiplayer team sync'],releaseGates:['F9 regression']};
    fs.writeFileSync(path.join(gameRoot,'launch-mvp.json'),JSON.stringify(launch));
    const contract=deriveStudioActualPlayContract(launch),candidate=item(),probe=runtime();
    const checks={playerRoster:true,participantCount:true,authoritativeBroadcast:true,clientReceive:true,twoParticipantCapablePath:true};
    candidate.currentStep='FINAL_REVIEW';
    candidate.robloxMultiplayerQaEvidence={
      gameId:'g1',sourceRevision:'c'.repeat(40),artifactIdentity:'sha256:'+'d'.repeat(64),
      authority:'roblox-static-two-client-source-contract',passed:true,codeContractPassed:true,
      runtimeTwoClientExecutionRequired:false,checks
    };
    Object.assign(probe,{auditProfile:'F9_SOAK',scenarioContractRequired:true,scenarioContractVersion:contract.version,
      scenarioContractFingerprint:'sha256:'+crypto.createHash('sha256').update(JSON.stringify(contract)).digest('hex'),
      scenarioCoverage:[{id:'adaptive-multiplayer-sync-surface',pass:true,verificationScope:'STATIC_CODE_CONTRACT'}],
      multiplayerAuditSummary:{
        version:2,gameId:'g1',authority:'roblox-static-two-client-source-contract',
        pass:false,skipped:true,codeContractPassed:true,runtimeTwoClientExecutionRequired:false,checks,
        verificationScope:'STATIC_CODE_CONTRACT',sourceRevision:source,artifactIdentity:artifact
      }});
    const queue={items:[candidate]};
    const applied=applyLocalStudioPlayResult({queue,gameId:'g1',runtime:probe,expected,workflowRunId:42,studioStepSucceeded:true,testedAt:'2026-10-01T16:10:00.000Z'});
    assert.equal(applied.result.pass,true);
    assert.equal(applied.item.robloxInternalVibePlayEvidence.pass,true);
    assert.equal(applied.item.robloxInternalVibePlayEvidence.runtimeSummary.commercialAudit.multiplayer.codeContractPassed,true);
    assert.equal(applied.item.robloxMultiplayerQaEvidence.sourceRevision,source);
    assert.equal(applied.item.robloxMultiplayerQaEvidence.artifactIdentity,artifact);
    assert.equal(applied.item.robloxMultiplayerQaEvidence.verifiedAt,'2026-10-01T16:10:00.000Z');
    assert.equal(planLocalStudioCandidates({queue,roadmap:roadmap(),repoRoot:root}).include.length,0);

    for(const patch of [
      {gameId:'other'},
      {sourceRevision:'c'.repeat(40)},
      {artifactIdentity:'sha256:'+'d'.repeat(64)},
      {checks:{...checks,clientReceive:false}}
    ]){
      const stale=item();
      stale.robloxMultiplayerQaEvidence={
        gameId:'g1',sourceRevision:'c'.repeat(40),artifactIdentity:'sha256:'+'d'.repeat(64),
        authority:'roblox-static-two-client-source-contract',passed:true,codeContractPassed:true,
        runtimeTwoClientExecutionRequired:false,checks
      };
      const badRuntime=structuredClone(probe);
      Object.assign(badRuntime.multiplayerAuditSummary,patch);
      assert.equal(createLocalStudioPlayEvidence({item:stale,runtime:badRuntime,expected,workflowRunId:43,studioStepSucceeded:true}).pass,false);
    }
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('reboot-safe Studio session settles only the exact reserved source and artifact',()=>{
  const candidate=item();
  candidate.robloxStudioRuntimeSession={
    version:1,
    sessionId:'run:g1:777:9',
    sourceRevision:source,
    artifactIdentity:artifact,
    candidateVersionNumber:9,
    status:'QUEUED_FOR_STUDIO',
    rebootSafeCheckpoint:true,
    hostStateAuthoritative:false,
    companyRuntimeAuthoritative:true
  };
  const applied=applyLocalStudioPlayResult({
    queue:{items:[candidate]},
    gameId:'g1',
    runtime:runtime(),
    expected,
    workflowRunId:42,
    studioStepSucceeded:true,
    studioSessionId:'run:g1:777:9',
    testedAt:'2026-10-02T02:30:00.000Z'
  });
  assert.equal(applied.result.pass,true);
  assert.equal(applied.item.robloxStudioRuntimeSession.status,'COMPLETED_PASS');
  assert.equal(applied.item.robloxStudioRuntimeSession.resultPass,true);
  assert.equal(applied.item.robloxStudioRuntimeSession.infrastructureFailure,false);
  assert.equal(applied.item.robloxStudioRuntimeSession.hostStateAuthoritative,false);
  assert.equal(applied.item.robloxStudioRuntimeSession.companyRuntimeAuthoritative,true);

  const stale=item();
  stale.robloxStudioRuntimeSession={
    version:1,
    sessionId:'older',
    sourceRevision:source,
    artifactIdentity:artifact,
    candidateVersionNumber:9,
    status:'QUEUED_FOR_STUDIO'
  };
  const staleApplied=applyLocalStudioPlayResult({
    queue:{items:[stale]},
    gameId:'g1',
    runtime:runtime(),
    expected,
    workflowRunId:43,
    studioStepSucceeded:true,
    studioSessionId:'different-session',
    testedAt:'2026-10-02T02:31:00.000Z'
  });
  assert.equal(staleApplied.item.robloxStudioRuntimeSession.status,'QUEUED_FOR_STUDIO');
});

test('cloud Studio playtest rejects player bots, public servers and external GUI injection',()=>{
  const allowed={
    roblox:{studioExecution:{
      enabled:true,required:true,optionalDiagnostic:false,deploymentGate:true,f9Gate:true,
      officialStudioMcpOnly:true,localPlaceFileRequired:true,
      onlinePublishedPlaceDirectOpenForbidden:true,robloxPlayerAutomationForbidden:true,
      externalGuiAutomationForbidden:true,undocumentedStudioCliAutomationForbidden:true,
      studioMcpTransport:'STDIO'
    }},
    developmentLifecycleMachine:{robloxStudioUsage:{
      learningUseForbidden:false,
      forbidden:['ROBLOX_PLAYER_AUTOMATION','PUBLIC_SERVER_BOT_PLAY',
        'PUBLISHED_PLACE_DIRECT_STUDIO_AUTOMATION','UNDOCUMENTED_STUDIO_CLI_AUTOMATION',
        'EXTERNAL_GUI_MACRO_OR_INJECTION']
    }}
  };
  assert.equal(validateLocalStudioPolicy(allowed),true);
  for(const key of ['robloxPlayerAutomationForbidden','externalGuiAutomationForbidden',
    'onlinePublishedPlaceDirectOpenForbidden','officialStudioMcpOnly']){
    const unsafe=structuredClone(allowed);
    unsafe.roblox.studioExecution[key]=false;
    assert.throws(()=>validateLocalStudioPolicy(unsafe),/ROBLOX_STUDIO_MCP_POLICY_MISMATCH/);
  }
  for(const forbidden of allowed.developmentLifecycleMachine.robloxStudioUsage.forbidden){
    const unsafe=structuredClone(allowed);
    unsafe.developmentLifecycleMachine.robloxStudioUsage.forbidden=
      unsafe.developmentLifecycleMachine.robloxStudioUsage.forbidden.filter(x=>x!==forbidden);
    assert.throws(()=>validateLocalStudioPolicy(unsafe),/ROBLOX_STUDIO_MCP_POLICY_MISMATCH/);
  }
});


test('queued Studio game cannot starve unrelated or newer candidates',()=>{
  const row={gameId:'a',sourceRevision:source,artifactIdentity:artifact,artifactRunId:20,versionNumber:7};
  const other={...row,gameId:'b'};
  const queue={items:[{gameId:'a',robloxStudioRuntimeSession:{...row,candidateVersionNumber:7,workflowRunId:10}}]};
  const job={run_id:10,name:'Official Studio MCP actual play a',status:'queued'};
  const select=(activeJobs,rows=[row,other])=>filterActiveStudioCandidates({matrix:{include:rows},queue,activeJobs}).include;
  assert.deepEqual(select([job]),[other]);
  assert.deepEqual(select([{...job,status:'in_progress'}]),[other]);
  assert.deepEqual(select([{...job,status:'completed'}]),[row,other]);
  assert.deepEqual(select([{...job,run_id:11}]),[row,other]);
  const newer={...row,sourceRevision:'c'.repeat(40)};
  assert.deepEqual(select([job],[newer,other]),[newer,other]);
  assert.deepEqual(select([job],[{...row,artifactRunId:21}]),[{...row,artifactRunId:21}]);
  assert.deepEqual(select([job],[{...row,versionNumber:8}]),[{...row,versionNumber:8}]);
});


test('Studio-first deployment supports an authenticated cloud Windows VM without a local PC',()=>{
  const guide=fs.readFileSync('docs/roblox-studio-mcp-cloud-runner.md','utf8');
  const bootstrap=fs.readFileSync('tools/connect-roblox-studio-mcp-free-windows.ps1','utf8');
  const workflow=fs.readFileSync('.github/workflows/company-development-roblox-post-runtime-qa.yml','utf8');
  assert.match(guide,/로컬 PC 불필요/);
  assert.match(guide,/원격 Windows 클라우드 VM/);
  assert.match(guide,/Session 0 Windows 서비스 형태는 허용하지 않습니다/);
  assert.match(guide,/Run workflow/);
  assert.match(bootstrap,/ROBLOX_FREE_STUDIO_INTERACTIVE_DESKTOP_REQUIRED/);
  assert.match(bootstrap,/roblox-studio-authenticated/);
  assert.match(bootstrap,/Get-AuthenticodeSignature/);
  assert.match(bootstrap,/Windows cloud VM session/);
  assert.match(workflow,/runs-on: \[self-hosted, Windows, X64, roblox-studio-authenticated\]/);
  assert.match(workflow,/ROBLOX_STUDIO_MCP_PLAN_IS_ACTUAL_PLAY_PASS=NO/);
});

test('Daechung actual cloud Studio input, visual, target damage and rejoin checks fail closed',()=>{
  const initialClientProbe={player:{rootPresent:true,rootX:0,rootY:5,rootZ:0}};
  const postActionClientProbe={player:{rootPresent:true,rootX:0,rootY:5,rootZ:5}};
  const keys=['w','a','d','space'].map(key=>({id:'keyboard-'+key,type:'mcp-keyboard-input',dispatched:true,ok:true}));
  const combat={id:'commercial-combat-action',type:'mcp-combat-action',dispatched:true,ok:true,effectObserved:true,effect:{mobDelta:{healthChanged:1}}};
  const data={
    gameId:'daechung-rpg',initialClientProbe,postActionClientProbe,actions:[...keys,combat],
    beforeImages:[{data:Buffer.from('first rendered frame').toString('base64')}],
    afterImages:[{data:Buffer.from('second rendered frame').toString('base64')}],
    captureQuality:{before:{pass:true},after:{pass:true}},
    auditProfile:'F9_SOAK',
    saveRejoinSummary:{pass:true,restartOk:true,infrastructureFailure:false,progressionObserved:true,progressionPreserved:true,inventoryPreserved:true}
  };
  assert.equal(evaluateDaechungCloudStudioChecks(data).required,true);
  assert.deepEqual(evaluateDaechungCloudStudioChecks(data).failed,[]);
  const invalid=[
    {...data,actions:[...keys]},
    {...data,actions:[combat]},
    {...data,postActionClientProbe:initialClientProbe},
    {...data,beforeImages:data.afterImages},
    {...data,afterImages:[]},
    {...data,saveRejoinSummary:null},
    {...data,auditProfile:'FAST_DEEP'},
    {...data,saveRejoinSummary:{...data.saveRejoinSummary,progressionPreserved:false}},
    {...data,actions:[...keys,{...combat,effect:{mobDelta:{healthChanged:0}}}]}
  ];
  for(const missing of invalid)assert.ok(evaluateDaechungCloudStudioChecks(missing).failed.length>0);
  assert.equal(evaluateDaechungCloudStudioChecks({...data,gameId:'cozy-island'}).required,false);
  assert.match(helper,/ROBLOX_DAECHUNG_CLOUD_STUDIO_CHECKS=/);
  assert.match(workflow,/runs-on: \[self-hosted, Windows, X64, roblox-studio-authenticated\]/);
});

test('Official Studio MCP mouse clicks use an actual click action, never a move or down-only event',()=>{
  const source=helper.slice(helper.indexOf('function mouseClickItem('),helper.indexOf('function pngDimensions('));
  const clickArgs=new Function('schemaProps','setStudioId','enumValue','fillRequired','clean','datamodelEnumValue',source+';return mouseClickArgs')(
    schema=>schema?.properties||{},
    (args,_schema,id)=>{args.studio_id=id;},
    (def,patterns)=>{
      const values=def.enum||[];
      for(const pattern of patterns){const hit=values.find(v=>v.toLowerCase()===pattern);if(hit)return hit;}
      for(const pattern of patterns){const hit=values.find(v=>v.toLowerCase().includes(pattern));if(hit)return hit;}
      return values[0];
    },
    args=>args,
    value=>String(value??'').trim(),
    (def,desired)=>(def.enum||[]).find(v=>v.toLowerCase()===desired.toLowerCase())||desired
  );
  const actionProps={x:{type:'integer'},y:{type:'integer'},mouse_button:{type:'string'}};
  const props=action=>({properties:{studio_id:{type:'string'},datamodel_type:{type:'string',enum:['Edit','Client','Server']},actions:{type:'array',items:{properties:{...actionProps,action}}}}});
  const click=clickArgs(props({type:'string',enum:['moveTo','mouseButtonDown','mouseButtonClick','mouseButtonUp']}),'studio-test',898,57);
  assert.equal(click.datamodel_type,'Client');
  const action=click.actions[0];
  assert.equal(action.action,'mouseButtonClick');
  assert.equal(action.mouse_button,'left');
  assert.deepEqual([action.x,action.y],[898,57]);
  assert.equal(clickArgs(props({type:'string'}),'studio-test',100,200).actions[0].action,'mouseButtonClick');
  assert.throws(()=>clickArgs(props({type:'string',enum:['moveTo','mouseButtonDown']}),'studio-test',100,200),/STUDIO_MCP_MOUSE_CLICK_ACTION_UNSUPPORTED/);
});

test('Mare first-click QA verifies actual selection screen and never confirms deleting a saved game',()=>{
  const script=helper.slice(helper.indexOf('export async function runStudioScript('),helper.indexOf('export async function runOfficialStudioMcpPlay('));
  assert.match(script,/const mouseArgs=mouseClickArgs\(/);
  assert.match(script,/STUDIO_SCRIPT_MOUSE_CLICK_INPUT=/);
  assert.match(script,/STUDIO_SCRIPT_NEW_GAME_TRANSITION=/);
  assert.match(script,/STUDIO_SCRIPT_NEW_GAME_CLICK_VERIFIED=1/);
  assert.match(script,/title=p:FindFirstChild\('TitleGui'\)/);
  assert.match(script,/backdrop:FindFirstChild\('TitlePanel',true\)/);
  assert.match(script,/SAIL_BUTTON=/);
  assert.match(script,/NEW_GAME_CONFIRM=/);
  assert.match(script,/STUDIO_NEW_GAME_SCREEN_DID_NOT_ADVANCE/);
  assert.match(script,/STUDIO_NEW_GAME_CONFIRMATION_REQUIRED_NO_AUTO_RESET/);
  assert.ok(script.indexOf("clickRecord.status='VERIFIED'")<script.indexOf('report.summary.successfulClicks++;'));
  assert.doesNotMatch(script,/title:Destroy\(\)|newBtn:Activate\(\)/);
});

test('Studio Auto QA dispatches only Mare and cancels older Forest-only captures',()=>{
  const workflow=fs.readFileSync('.github/workflows/studio-autoqa.yml','utf8');
  assert.ok(workflow.includes('name: Studio Auto QA'));
  assert.ok(workflow.includes('  schedule:'));
  assert.ok(workflow.includes("cron: '*/10 * * * *'"));
  assert.ok(workflow.includes('roblox-games/mare-essentia/src/**'));
  assert.ok(workflow.includes("      - 'tools/company-nemotron-design-review.mjs'"));
  assert.ok(workflow.includes("      - 'company-learning/external-ai-distillation-policy.json'"));
  assert.ok(!workflow.includes('roblox-games/fantasy-survival/'));
  assert.ok(workflow.includes('workflows: ["Owner Mare Essentia Direct Publish"]'));
  assert.ok(workflow.includes("github.event.workflow_run.path == '.github/workflows/owner-mare-essentia-direct-publish.yml'"));
  assert.ok(workflow.includes('default: mare-essentia'));
  assert.ok(workflow.includes('select(.head_sha == $head)'));
  assert.ok(workflow.includes('contains(" · fantasy-survival ·")'));
  assert.ok(workflow.includes('gh run cancel'));
  assert.equal(workflow.split('gh workflow run devloop-studio.yml').length-1,1);
  assert.ok(workflow.includes('group: studio-autoqa-dispatch-mare-essentia'));
  assert.ok(workflow.includes('STUDIO_PUSH_DEVELOPMENT_SCOPE=$scope'));
  assert.ok(workflow.includes('STUDIO_WATCHDOG_SKIP=SOURCE_ALREADY_CHECKED'));
  assert.ok(workflow.includes('STUDIO_RELEASE_REGRESSION=FULL'));
  assert.ok(workflow.includes('SHIPS) script=roblox-games/mare-essentia/tools/devloop/studio-scripts/mare-ships.json'));
  assert.ok(workflow.includes('script=roblox-games/mare-essentia/tools/devloop/studio-scripts/mare-ships.json'));
  assert.doesNotMatch(workflow,/scripts\+=\(/);
  const runner=fs.readFileSync('.github/workflows/devloop-studio.yml','utf8');
  assert.ok(runner.includes("inputs.game == 'mare-essentia'"));
  assert.ok(runner.includes('runs-on: [self-hosted, Windows, X64, roblox-studio-authenticated]'));
  assert.ok(runner.includes('group: roblox-studio-shared-host'));
  assert.ok(runner.includes('cancel-in-progress: false'));
});

test('Studio click QA stops unresponsive MCP discovery without claiming runtime PASS',()=>{
  const script=helper.slice(
    helper.indexOf('export async function runStudioScript('),
    helper.indexOf('export async function runOfficialStudioMcpPlay(')
  );
  assert.match(script,/fastFailOnProviderTimeout:true/);
  assert.match(script,/timeoutMs:45000/);
  // 긴 안내창 검증만 늘리고, 다른 단계의 기본 RPC 제한을 복구한다.
  assert.ok(script.includes('const requestedTimeoutMs=Number(st.timeoutMs)'));
  assert.ok(script.includes('client.timeoutMs=Math.min(90000,Math.floor(requestedTimeoutMs))'));
  assert.ok(script.includes('finally{client.timeoutMs=originalTimeoutMs;}'));
  assert.match(script,/studioStateAfterFirstClick:detail/);
  assert.match(script,/STUDIO_SCRIPT_POST_CLICK_STATE=/);
  assert.match(script,/for\(const ctx of \['Server','Client'\]\)/);
  assert.match(script,/postClickProbeContext:ctx,status:'STARTED'/);
  assert.match(script,/STUDIO_SCRIPT_POST_CLICK_PROBE_START=/);
  assert.match(script,/STUDIO_SCRIPT_POST_CLICK_PROBE_OK=/);
  assert.match(script,/STUDIO_POST_CLICK_PING/);
  assert.match(script,/postClickUiProbe:name,status:'STARTED'/);
  assert.match(script,/STUDIO_SCRIPT_POST_CLICK_UI_PROBE_START=/);
  assert.match(script,/STUDIO_SCRIPT_POST_CLICK_UI_PROBE_OK=/);
  assert.match(script,/UI_ROOT_COUNT/);
  assert.match(script,/UI_DESC_COUNT/);
  assert.match(script,/UI_LABEL_COUNT/);
  assert.match(script,/UI_FIRST_TEXT/);
  assert.match(script,/client\.call\('get_studio_state'/);
  assert.match(script,/report\.summary\.successfulClicks===1&&report\.summary\.capturedFrames===2/);
  assert.match(script,/const studioDiscoveryDeadline=Date\.now\(\)\+5\*60\*1000/);
  assert.match(script,/Date\.now\(\)<studioDiscoveryDeadline/);
  assert.match(script,/if\(!studioId\)throw new Error\('NO_STUDIO'\)/);
  assert.match(script,/fs\.writeFileSync\(path\.join\(outDir,'report\.json'\)/);
});

test('Existing Devloop Studio workflow rechecks Mare text sampling after main updates',()=>{
  const workflow=fs.readFileSync('.github/workflows/devloop-studio.yml','utf8');
  assert.match(workflow,/  workflow_dispatch:\n    inputs:/);
  const auto=fs.readFileSync('.github/workflows/studio-autoqa.yml','utf8');
  assert.match(auto,/  push:\n    branches: \[main\]/);
  assert.match(auto,/gh workflow run devloop-studio\.yml/);
  assert.match(workflow,/roblox-games\/mare-essentia\/tools\/devloop\/studio-scripts\/mare-qa-click\.json/);
  assert.match(workflow,/tools\/company-development-roblox-studio-local-play\.mjs/);
  assert.match(workflow,/github\.event_name == 'push' && 'mare-essentia' \|\| inputs\.game/);
  assert.match(workflow,/github\.event_name == 'push' && 'roblox-games\/mare-essentia\/tools\/devloop\/studio-scripts\/mare-qa-click\.json'/);
  assert.match(workflow,/runs-on: \[self-hosted, Windows, X64, roblox-studio-authenticated\]/);
});

// [현행 대항해시대 검사] 실제 카드 대결·항해·함대전을 유지하고 존재하지 않는 전술 훅은 제외한다.
test('Mare Studio deep script validates current gameplay and excludes removed tactics hook',()=>{
  const gen=fs.readFileSync('tools/gen-qa-click-scripts.py','utf8');
  const steps=JSON.parse(fs.readFileSync('roblox-games/mare-essentia/tools/devloop/studio-scripts/mare-qa-click.json','utf8'));
  assert.ok(gen.includes('("mare-cardbattle", "mare-voyage", "mare-battle")'));
  assert.equal(steps.length,1000);
  assert.equal(steps.filter(step=>step.code?.includes('NPC_ROUTE_AUDIT_PASS checked=')).length,1);
  const slowIntro=steps.filter(step=>step.code?.includes('FIELD_QA_INTRO_MODAL_NOT_FINISHED'));
  assert.equal(slowIntro.length,1);
  assert.equal(slowIntro[0].timeoutMs,90000);
  // [실기동 복구] 서버의 실제 NewGame 뒤 기존 항구 탭을 열어 자동 안내의 UI 콜백을 실행한다.
  assert.match(slowIntro[0].code,/SetAttribute\("DevCall","Tab_harbor"\)/);
  assert.match(slowIntro[0].code,/FIELD_QA_MAIN_BOOK_NOT_VISIBLE/);
  assert.match(slowIntro[0].code,/for attempt=1,50 do/);
  assert.match(slowIntro[0].code,/stable>=3/);
  assert.doesNotMatch(slowIntro[0].code,/for attempt=1,120 do/);
  assert.doesNotMatch(slowIntro[0].code,/InvokeServer\("Intro(?:Name|Companion|Portrait)"/);
  assert.deepEqual(steps.filter(step=>step.timeoutMs!==undefined).map(step=>step.timeoutMs).sort((a,b)=>a-b),[65000,85000,90000]);
  assert.equal(steps.filter(step=>step.type==='click_from_luau').length,12);
  assert.equal(steps.filter(step=>step.type==='capture').length,70);
  // [장면 생명주기] 카드판 스킵은 실제 입력으로 종료하고 전투 잠금이 해제된 뒤 항해/지상맵을 실행한다.
  const cardExitIndex=steps.findIndex(step=>step.label==='card_practice_exit');
  assert.ok(cardExitIndex>steps.findIndex(step=>step.type==='capture'&&step.name==='cb2'));
  assert.equal(steps[cardExitIndex].type,'click_from_luau');
  assert.match(steps[cardExitIndex].code,/CARD_PRACTICE_EXIT_REAL_CLICK/);
  assert.match(steps[cardExitIndex+1].code,/CARD_PRACTICE_EXIT_INPUT_NOT_RECEIVED/);
  const naval=fs.readFileSync('roblox-games/mare-essentia/src/ReplicatedStorage/Shared/NavalBattle.luau','utf8');
  assert.match(naval,/if opts\.cardOnly then\s+skip\.Parent = g/);
  assert.match(naval,/skip\.ZIndex = 30/);
  assert.match(naval,/skip\.Visible = true/);
  for(const [from,to] of [['trade','harbor'],['route','map'],['codex','tech'],['status','crew']]){
    assert.ok(steps.some(step=>step.type==='click_from_luau'&&step.label==='qa_tab_'+from+'_to_'+to&&step.code.includes('QA_NAV_TARGET_NOT_CLICKABLE')));
    assert.ok(steps.some(step=>step.code?.includes('QA_REAL_TAB_CLICK_PASS:'+from+'_TO_'+to)));
    assert.ok(steps.some(step=>step.type==='capture'&&step.name==='qa_click_'+from+'_to_'+to));
  }
  const tabs=['harbor','trade','route','map','yard','quest','explore','battle','codex','tech','status','crew'];
  for(const tab of tabs){
    assert.ok(steps.some(step=>step.code?.includes('FACILITY_TAB_RUNTIME_PASS:'+tab)));
  }
  for(const marker of ['INTRO_RUNTIME_STATE_PASS','CARD_BOOK_RUNTIME_PASS','CARD_BOARD_RUNTIME_PASS','NAVAL_BATTLE_RUNTIME_PASS']){
    assert.ok(steps.some(step=>step.code?.includes(marker)));
  }
  assert.ok(steps.some(step=>step.code?.includes('CARD_DECK_RUNTIME_PASS')));
  assert.ok(steps.some(step=>step.code?.includes('CARD_PRACTICE_RUNTIME_PASS')));
  assert.ok(steps.some(step=>step.code?.includes('VoyageScene')));
  assert.ok(steps.some(step=>step.code?.includes('NavalBattle')));
  assert.ok(!steps.some(step=>/QATactics|TacticsView/.test(step.code||'')));
});

// [탐험·퀘스트 전수 검사] 기존 등록 항구·문화권·지점 1:1 연결을 원본 데이터로 검증한다.
// 이 정적 회귀는 별도 Studio 실제 플레이 검사 통과를 의미하지 않는다.
test('Mare exploration sites, regional backgrounds and discovery quest routes match',()=>{
  const cultures=fs.readFileSync('roblox-games/mare-essentia/src/ReplicatedStorage/Shared/PortCultures.luau','utf8');
  const field=fs.readFileSync('roblox-games/mare-essentia/src/ReplicatedStorage/Shared/FieldScene.luau','utf8');
  const sites=fs.readFileSync('roblox-games/mare-essentia/src/ReplicatedStorage/Shared/Sites.luau','utf8');
  const quests=fs.readFileSync('roblox-games/mare-essentia/src/ReplicatedStorage/Shared/Quests.luau','utf8');
  const regionBlock=cultures.match(/local REGION = \{([\s\S]*?)\n\}/)?.[1];
  const overrides=cultures.match(/for key, list in \{([\s\S]*?)\n\} do/)?.[1];
  assert.ok(regionBlock&&overrides,'port cultures missing');
  const ports={};
  for(const [,port,region] of regionBlock.matchAll(/([a-z_]+)\s*=\s*"([a-z_]+)"/g))ports[port]=region;
  for(const [,region,group] of overrides.matchAll(/(\w+)\s*=\s*\{([^}]+)\}/g)){
    for(const [,port] of group.matchAll(/"([a-z_]+)"/g))ports[port]=region;
  }
  const allRegions=new Set(Object.values(ports));
  const visuals=new Set([...field.matchAll(/^\s*(\w+)\s*=\s*\{ ground = RC\(/gm)].map(row=>row[1]));
  assert.equal(allRegions.size,22);
  assert.deepEqual([...allRegions].filter(region=>!visuals.has(region)),[],'region missing from FieldScene');
  const entries=[...sites.matchAll(/\{\s*id = "([^"]+)",\s*name = "([^"]+)",\s*portId = "([^"]+)"/g)];
  assert.ok(entries.length>=500,'site catalog incomplete');
  assert.equal(new Set(entries.map(row=>row[1])).size,entries.length,'duplicate site ID');
  for(const [,id,name,port] of entries){
    assert.ok(ports[port], 'unmapped site: '+id+'/'+name+'/'+port);
    assert.ok(visuals.has(ports[port]), 'region backdrop missing: '+id+'/'+ports[port]);
  }
  const willow=[['q_willow_field','bot_willow','antwerp_willow_river'],['q_willow_notes','bot_willow_notes','antwerp_monastery_herbs'],['q_willow_medicine','med_willow_bark','antwerp_apothecary']];
  for(const [qid,card,site] of willow){
    assert.ok(quests.includes('id = "'+qid+'"')&&quests.includes('cardId = "'+card+'"'),'discovery quest missing: '+qid);
    const row=sites.split('\n').find(line=>line.includes('id = "'+site+'"'));
    assert.ok(row&&row.includes('"'+card+'"'),'discovery quest card not at site: '+qid);
  }
  const checks=JSON.parse(fs.readFileSync('roblox-games/mare-essentia/tools/devloop/studio-scripts/mare-qa-click.json','utf8'));
  const naval=checks.find(row=>row.code?.includes('NAVAL_BATTLE_RUNTIME_PASS'));
  assert.ok(naval?.code.includes('NAVAL_BATTLE_ACTIVE_GUI_COUNT:'));
  assert.ok(!naval.code.includes("pg:FindFirstChild('BattleGui')"));
});

// [탐험 원본 검사] 22개 지역의 지상 장면·적 R15·무기·철수 정리와 정기검사 연결을 회귀검증한다.
test('Mare Studio expedition suite covers all 22 cultural regions without silent crashes',()=>{
  const root='roblox-games/mare-essentia/';
  const steps=JSON.parse(fs.readFileSync(root+'tools/devloop/studio-scripts/mare-regions.json','utf8'));
  const field=fs.readFileSync(root+'src/ReplicatedStorage/Shared/FieldScene.luau','utf8');
  const sites=fs.readFileSync(root+'src/ReplicatedStorage/Shared/Sites.luau','utf8');
  const regions=new Set([...field.matchAll(/^\s*(\w+)\s*=\s*\{ ground = RC\(/gm)].map(row=>row[1]));
  const launches=steps.filter(row=>row.code?.includes("return 'REGION_QA_LAUNCHED:"));
  const assertions=steps.filter(row=>row.code?.includes("return 'REGION_QA_PASS:"));
  const images=steps.filter(row=>row.type==='capture');
  assert.equal(regions.size,22);
  assert.equal(launches.length,24);
  assert.equal(assertions.length,24);
  assert.equal(images.length,24);
  assert.equal(new Set(images.map(row=>row.name)).size,24);
  for(const region of regions)assert.ok(assertions.some(row=>row.code.includes('REGION_QA_PASS:'+region+':')),'regional Studio case missing: '+region);
  for(let i=0;i<24;i++){
    const launch=launches[i].code;
    const test=assertions[i].code;
    const [,region,siteId]=launch.match(/return 'REGION_QA_LAUNCHED:([^:]+):([^']+)'/)||[];
    assert.ok(region&&siteId,'region/site identifier missing');
    assert.ok(sites.includes('id = "'+siteId+'"'),'site not in canonical catalog: '+siteId);
    assert.ok(test.includes('REGION_QA_PASS:'+region+':'+siteId),'launch/probe mismatch');
    for(const marker of ['REGION_BUILD_OR_CRASH:', 'REGION_WRONG_BACKGROUND:', 'REGION_GROUND_MISSING:',
      'REGION_COMBAT_NOT_READY:', 'REGION_PLAYER_TRAPPED:', 'REGION_WEAPON_MISSING:',
      'REGION_MOBS_OR_MOTION_FAILED:', 'REGION_FALL_SAFETY_MISSING:'])
      assert.ok(test.includes(marker),'real gameplay guard absent: '+marker);
    assert.ok(launch.includes("old:Invoke()"),'previous site must exit cleanly');
    assert.ok(launch.includes("FS.start("),'must reuse original FieldScene');
  }
  assert.ok(steps.some(row=>row.code?.includes('REGION_QA_CLEAN_EXIT_PASS')));
  const auto=fs.readFileSync('.github/workflows/studio-autoqa.yml','utf8');
  assert.ok(auto.includes("cron: '*/10 * * * *'"));
  assert.ok(auto.includes('STUDIO_WATCHDOG_SKIP=RUNNER_BUSY'));
  assert.ok(auto.includes('STUDIO_WATCHDOG_SKIP=SOURCE_ALREADY_CHECKED'));
  assert.ok(auto.includes('STUDIO_WATCHDOG_RECOVERY=SOURCE_NOT_YET_CHECKED'));
  assert.ok(auto.includes('STUDIO_RELEASE_REGRESSION=FULL'));
  const runner=fs.readFileSync('.github/workflows/devloop-studio.yml','utf8');
  assert.ok(runner.includes('      script:')&&runner.includes('|| inputs.script }}'),'dedicated region suite must remain directly executable');
  assert.ok(auto.includes('gh workflow run devloop-studio.yml --repo "$GITHUB_REPOSITORY" --ref main -f "game=$game" -f "script=$script"'));
  assert.doesNotMatch(auto,/for script in|scripts\+=\(/);
  assert.equal(auto.split('gh workflow run devloop-studio.yml').length-1,1);
});

// [실제 무기별 평타·스킬] 데이터, 공용 원본 R15 클립, 기존 동료 자동스킬 및 공식 Studio 입력을 함께 확인한다.
// [퀘스트 등급·병종 회귀] 원래 목표/보상은 유지하고 1~5단의 UI·현장 조합을 구분한다.
// [지역 탐험 40단계] 실존 Sites 카드 연결, 항구별 자동완료, 이동 안내를 검증한다.
test('Mare exploration quests cover ten routes and fifty real site card goals',()=>{
  const base='roblox-games/mare-essentia/src/';
  const quests=fs.readFileSync(base+'ReplicatedStorage/Shared/Quests.luau','utf8');
  const sites=fs.readFileSync(base+'ReplicatedStorage/Shared/Sites.luau','utf8');
  const cards=fs.readFileSync(base+'ReplicatedStorage/Shared/KnowledgeCards.luau','utf8');
  const service=fs.readFileSync(base+'ServerScriptService/Services/Quest.luau','utf8');
  const view=fs.readFileSync(base+'ServerScriptService/Services/View.luau','utf8');
  const client=fs.readFileSync(base+'StarterPlayer/Game.client.luau','utf8');
  const begin=quests.indexOf('local RegionalFieldQuests:');
  const end=quests.indexOf('-- 증권거래소',begin);
  assert.ok(begin>=0 && end>begin,'regional quests must use the canonical quest pipeline');
  const block=quests.slice(begin,end);
  const items=[...block.matchAll(/^\s*\{ "[^"]+", "([^"]+)", "([^"]+)", "([^"]+)", "[^"]+", "[^"]+", "[^"]+" \},$/gm)];
  assert.equal(items.length,50,'ten routes must have five field quests each');
  const regions=['north_sea','baltic','red_sea','west_africa','east_africa','south_asia','southeast_asia','east_asia','americas','pacific'];
  const groups=[...block.matchAll(/^\s*\{ "([a-z_]+)", "[^"]+", \{\s*\n([\s\S]*?)^\s*\} \},$/gm)];
  assert.equal(groups.length,regions.length);
  assert.deepEqual(groups.map(group=>group[1]).sort(),[...regions].sort());
  for(const group of groups)assert.equal([...group[2].matchAll(/^\s*\{ "[^"]+", "[^"]+", "[^"]+", "[^"]+", "[^"]+", "[^"]+", "[^"]+" \},$/gm)].length,5,'five stages per route: '+group[1]);
  for(const region of ['north_sea','baltic','red_sea','west_africa','east_africa','south_asia','southeast_asia','east_asia','americas','pacific']){
    assert.ok(block.includes('{ "'+region+'", '),'missing region: '+region);
  }
  const seen=new Set();
  for(const item of items){
    const [,site,port,card]=item;
    const row=sites.split('\n').find(x=>x.includes('id = "'+site+'"'));
    assert.ok(row&&row.includes('portId = "'+port+'"')&&row.includes('"'+card+'"'),
      'exploration quest must use the actual port and site card pool: '+site+'/'+card);
    assert.ok(cards.includes('{ "'+card+'", '),'quest target must be a registered knowledge card: '+card);
    assert.ok(!seen.has(card),'regional field quest target should not be duplicated: '+card);
    seen.add(card);
  }
  assert.ok(block.includes('after = prev')&&block.includes('difficulty = stage')&&block.includes('kind = "discover_card"'));
  assert.ok(service.includes('if quest.exploreSite and quest.portId ~= state.portId then return false end'));
  assert.ok(view.includes('fieldQuest = fieldQuest')&&view.includes('view.quests.fieldRoutes = {}'));
  assert.ok(client.includes('현장 의뢰: ')&&client.includes('세계 탐험 · %d대 항로')&&client.includes('view.quests.routeCount or 10')&&view.includes('for _ in routeIds do view.quests.routeCount += 1 end'));
});

test('Mare quests and field encounters expose five meaningful difficulty grades',()=>{
  const base='roblox-games/mare-essentia/src/';
  const quests=fs.readFileSync(base+'ReplicatedStorage/Shared/Quests.luau','utf8');
  const field=fs.readFileSync(base+'ReplicatedStorage/Shared/FieldScene.luau','utf8');
  const view=fs.readFileSync(base+'ServerScriptService/Services/View.luau','utf8');
  const game=fs.readFileSync(base+'StarterPlayer/Game.client.luau','utf8');
  assert.ok(quests.includes('local function Grade(q: Quest)')&&quests.includes('Grade = Grade'));
  assert.ok(quests.includes('q.kind == "win"')&&quests.includes('q.kind == "deliver"')&&quests.includes('q.kind == "visit"'));
  assert.ok(view.includes('grade = D.Quests.Grade(q)')&&view.includes('grade = D.Quests.Grade(dq)'));
  assert.ok(game.includes('난이도 %d/5')&&game.includes('GRADE = { "입문", "일반", "숙련", "위험", "전설" }'));
  for(const grade of ['danger0 <= 1','danger0 == 2','danger0 == 3','danger0 == 4']){
    assert.ok(field.includes(grade),'missing difficulty composition '+grade);
  }
  assert.ok(field.includes('FieldDifficultyGrade')&&field.includes('stature = if isBoss'));
  assert.ok(field.includes('trousers = trousers')&&field.includes('local nameColor = if isBoss'));
  assert.ok(field.includes('local enemyCount = math.clamp(20 + (danger0 - 1) * 6'));
  assert.ok(field.includes('local bossCount = if danger0 < 3 then 0'));
});

// [현장 모션 회귀] R15 관절/실제 발보폭/진입·정지·회피/지연 회전은 기존 공용 모션 경로를 사용한다.
test('Mare solo field enemies have grounded speed responsive R15 locomotion',()=>{
  const base='roblox-games/mare-essentia/src/ReplicatedStorage/Shared/';
  const field=fs.readFileSync(base+'FieldScene.luau','utf8');
  const motion=fs.readFileSync(base+'FieldMotion.luau','utf8');
  assert.ok(motion.includes('CM.SampleProceduralActorMotion(')&&motion.includes('CM.MapCombatPoseToR15('),
    'original canonical R15 joint motion must be preserved');
  assert.ok(motion.includes('local targetEffort = if state == "RUN"')&&motion.includes('h.groundEffort = oldEffort'),
    'running and stopping must ease from measured movement');
  assert.ok(motion.includes('local plant = math.sin(phase * math.pi * 2) * (if retreat then -1 else 1)'));
  assert.ok(motion.includes('local side = math.clamp(strafe or 0')&&motion.includes('local heel = math.cos('));
  assert.ok(motion.includes('bend("FootL", 0.24 * slip')&&motion.includes('bend("FootR", -0.18 * slip'),
    'dodges must plant a foot and recover stance');
  assert.ok(motion.includes('실제 타격 발동작')&&motion.includes('bend("ShinL", -0.24 * step'),
    'melee attacks must include leg load and landing');
  assert.ok(motion.includes('bend("Spine", 0, -lag * 0.16'),
    'turns must follow through hips and torso');
  assert.ok(field.includes('e.attackStep = lunge.Magnitude') &&
    field.includes('e.attackStep)') &&
    motion.includes('attackAdvance: number?') &&
    motion.includes('local advance = math.clamp((attackAdvance or 0) * 2'),
    'real melee lunge must drive planted-foot pose without changing the original lunge');
  assert.ok(field.includes('kindId == "archer" or e.throwAsset ~= nil')&&
    field.includes('e.root.CFrame.RightVector:Dot(e.moveVel)'),
    'enemy strafe/backpedal must use physical velocity');
  assert.ok(field.includes('e.moveVel = (e.moveVel or Vector3.zero):Lerp(desired, 1 - math.exp(-response * enemyDt))')&&
    field.includes('local delta = e.moveVel * enemyDt'),
    'enemies must accelerate and decelerate without snapping');
  assert.ok(field.includes('e.gait = (e.gait or 0) + traveled / (if e.boss then 7 else 5.2)')&&
    field.includes('math.clamp(traveled / math.max(dtc, 0.016) / math.max(e.ac.def.speed, 1), 0.18, 1.25)'),
    'enemy gait must advance by actual displacement and match bounded walking speed');
  assert.ok(field.includes('status:SetAttribute("CombatEnabled", false)')&&!field.includes('a.moveVel ='),'party remains UI-only in solo field combat');
  assert.ok(field.includes('AC.moveWish(e.ac, dist)')&&field.includes('AC.damageEnemy(')&&field.includes('AC.takeHit(pl,'),
    'original combat authority, attack/defense flows must remain');
});

// [무기별 모션 회귀] 적·동료는 동일한 공용 무기 원본+전신 모션을 통과하고 공격 차례별 자세를 순환한다.
test('Mare enemy weapon motions use grounded shared combo and recoil in solo field combat',()=>{
  const root='roblox-games/mare-essentia/src/ReplicatedStorage/Shared/';
  const scene=fs.readFileSync(root+'FieldScene.luau','utf8');
  const motion=fs.readFileSync(root+'FieldMotion.luau','utf8');
  assert.ok(motion.includes('local actorBeat = if rangedActor then 1 else (h.weaponBeat or 1)')&&
    motion.includes('FM.weaponCombo(weaponMotion, actorBeat) or FM.weaponCombo(weaponMotion, 1)'),
    'melee enemy and ally use authored weapon beats; ranged attacks keep one actual firing pose');
  assert.ok(motion.includes('weaponMotion ~= nil or role == "ally-melee"'),
    'unarmed companion must use canonical combat motion without changing bomb throw');
  assert.ok(scene.includes('e.fm.weaponBeat = ((e.fm.weaponBeat or 0) % 3) + 1')&&
    !scene.includes('a.fm.weaponBeat = ((a.fm.weaponBeat or 0) % 3) + 1'),
    'enemy can vary authored weapon poses but allies do not accrue three-hit combo beats');
  assert.ok(scene.includes('FM.actor(e.fm, st, ph, enemyDt')&&scene.includes('if e.throwAsset then nil else (e.weapon and e.weapon.motion)')&&
    !scene.includes('FM.actor(a.fm,'),'enemy uses original full-body weapon path; no field ally animation');
  for(const marker of ['local gun = grip == "PISTOL" or grip == "RIFLE"',
    'elseif bow then','elseif crossbow then','elseif spear then','elseif dagger then',
    'elseif axe then','elseif blunt then','local point = grip == "RAPIER"',
    'local curved = grip == "SABRE"','if role == "shield" then',
    '폭탄·투척 무기','맨손 동료']){
    assert.ok(motion.includes(marker),'missing weapon-specific motion: '+marker);
  }
  assert.ok(motion.includes('local attackT = math.clamp((t - 0.25) / 0.35')&&
    motion.includes('local follow = if state == "ATTACK"')&&
    motion.includes('local returnGrip = if state == "RECOVERY"'),
    'weapon wind-up, strike, follow-through and recover must stay on original timing');
  assert.ok(scene.includes('AC.stepEnemy(e.ac, enemyDt, dist')&&scene.includes('AC.takeHit(pl, e.ac.def.dmg, now, pl.parryAt)')&&
    !scene.includes('strikeEnemy(tgt, 0.6 * aw.power')&&!scene.includes('a.nextAt = now + 1.3 / aw.speed'),
    'original enemy attack authority remains; no ally damage or cooldown path');
});

// [무기 모션 연속성] 기존 공격 판정은 그대로 두고 준비·타격·착지·복귀 경계를 지킨다.
test('Mare enemy weapon motion transition and foot contact are continuous',()=>{
  const root='roblox-games/mare-essentia/src/ReplicatedStorage/Shared/';
  const motion=fs.readFileSync(root+'FieldMotion.luau','utf8');
  const scene=fs.readFileSync(root+'FieldScene.luau','utf8');
  assert.ok(motion.includes('local easeAttack = attackT * attackT * (3 - 2 * attackT)')&&
    motion.includes('elseif state == "ATTACK" then 1 - easeAttack'),
    'windup pose must carry into attack rather than abruptly reset');
  assert.ok(motion.includes('elseif state == "RECOVERY" then (1 - t) * (1 - t) else 0')&&
    motion.includes('local returnGrip = if state == "RECOVERY" then math.sin(t * math.pi)'),
    'attack end and recovery start must share follow-through');
  assert.ok(motion.includes('local rangedGrip = weaponMotion == "BOW"')&&
    motion.includes('local landed = release * release * (3 - 2 * release)')&&
    motion.includes('bend("ShinL", -0.13 * land * weight'),
    'melee, ranged, enemy and companion foot plant must persist through recovery');
  assert.ok(motion.includes('h.sideEffort = (h.sideEffort or side)')&&
    motion.includes('local inertia = if axe or blunt then 1'),
    'side steps must ease and weapon mass must drive torso recoil');
  assert.ok(scene.includes('FM.actor(e.fm, st, ph, enemyDt')&&scene.includes('e.attackStep)')&&
    !scene.includes('FM.actor(a.fm,'),'enemy full-body phase and attack advance stay continuous; party has no combat animation');
  assert.ok(scene.includes('AC.stepEnemy(e.ac, enemyDt, dist')&&scene.includes('AC.takeHit(pl, e.ac.def.dmg, now, pl.parryAt)')&&
    !scene.includes('a.nextAt = now + 1.3 / aw.speed')&&!scene.includes('strikeEnemy(tgt, 0.6 * aw.power'),
    'enemy authority is unchanged and the retired ally attack path cannot return');
});

// [전투 모션 연속] 타격 이벤트 시 키프레임 접촉과 관절별 반응 속도가 같은 기존 공용 경로로 이어진다.
test('Mare R15 enemy authored weapon impact matches strike event timing',()=>{
  const base='roblox-games/mare-essentia/src/ReplicatedStorage/Shared/';
  const motion=fs.readFileSync(base+'FieldMotion.luau','utf8');
  const scene=fs.readFileSync(base+'FieldScene.luau','utf8');
  const common=fs.readFileSync(base+'CommonMotion.luau','utf8');
  assert.ok(motion.includes('weaponCombo.steps[1].contact / weaponCombo.duration')&&
    motion.includes('if state == "ANTICIPATION" then math.clamp(phase, 0, 1) * contact')&&
    motion.includes('elseif state == "ATTACK" then contact + math.clamp((phase - 0.25) / 0.35, 0, 1) * (1 - contact)'),
    'weapon windup must meet the authored contact pose at original attack event');
  assert.ok(motion.includes('weaponCombo.fadeDuration / weaponCombo.duration')&&
    motion.includes('FM.sample(weaponCombo, motionProgress * weaponCombo.duration, h.canon)'),
    'weapon recovery must continue through the authored guard fade');
  for(const contact of [0.27,0.44,0.67]){
    const lastWindup=contact, firstStrike=contact+0*(1-contact);
    const lastStrike=contact+1*(1-contact), firstRecover=1+0*(.14/.4);
    assert.ok(Math.abs(lastWindup-firstStrike)<1e-10 && Math.abs(lastStrike-firstRecover)<1e-10,
      'weapon contact and recovery frame boundaries must have continuous phase');
  }
  assert.ok(motion.includes('responseByJoint = {')&&
    motion.includes('RightWrist = 28')&&
    motion.includes('FM.step(h, dt, rootRot, response)')&&
    common.includes('row.response*response*elapsed'),
    'fast hands, lower body contact and heavier recovery must reuse original joint smoothing');
  assert.ok(motion.includes('local beatSide = if (h.weaponBeat or 1) % 2 == 0 then -1 else 1')&&
    motion.includes('not (gun or bow or crossbow)'),
    'melee alternating sides must not disrupt ranged weapon aiming');
  assert.ok(scene.includes('AC.stepEnemy(e.ac, enemyDt, dist')&&scene.includes('AC.damageEnemy(e.ac, BASE_DMG')&&
    scene.includes('AC.takeHit(pl, e.ac.def.dmg, now, pl.parryAt)')&&!scene.includes('strikeEnemy(tgt, 0.6 * aw.power'),
    'enemy damage and hit authority remain intact; party cannot contribute to combat');
});

// [무기 스킬·직업 회피] 무기별 스킬은 정확히 두 유형, 기본 회피/방어·카드·저장/게임 규칙은 독립적이다.
test('Mare two-button HUD, owner-only five-hit automatic heavy and seven profession dodges',()=>{
  const base='roblox-games/mare-essentia/src/ReplicatedStorage/Shared/';
  const scene=fs.readFileSync(base+'FieldScene.luau','utf8');
  const motion=fs.readFileSync(base+'FieldMotion.luau','utf8');
  const weapons=fs.readFileSync(base+'Weapons.luau','utf8');
  const jobs=fs.readFileSync(base+'JobSkills.luau','utf8');
  assert.ok(scene.includes('attackBtn:SetAttribute("WeaponSkillCount", 1)')&&
    scene.includes('local available = { "heavy", "sweep" }')&&
    scene.includes('b.Name = "FieldDodge"')&&
    !scene.includes('mkSkill("parry"')&&!scene.includes('mkSkill("heavy"')&&
    !scene.includes('mkSkill("sweep"')&&!scene.includes('local function slotPos('),
    'only attack and evade combat buttons; preserve older weapon/card skill definitions and loadout');
  for(const family of ['fist','blade','dagger','axe','spear','blunt','bow','firearm']){
    const row=weapons.split('\n').find(x=>x.includes(family+' = { basic = '));
    assert.ok(row && row.includes('heavy = ') && row.includes('sweep = '),'missing 2 weapon skills '+family);
  }
  assert.ok(jobs.includes('JobSkills.MAX_PLAYER_SKILLS = 3'),
    'existing character/card loadout and third unlock must not be removed');
  const timings={dagger:.34,fist:.37,blade:.39,spear:.41,bow:.43,firearm:.43,axe:.45,blunt:.45,crossbow:.46};
  assert.ok(Object.entries(timings).every(([key,time])=>key==='dagger'||time>timings.dagger));
  assert.ok(scene.includes('wpn.family == "dagger" then 0.34')&&
    scene.includes('wpn.family == "blade" then 0.39')&&
    scene.includes('wpn.id == "crossbow" then 0.46')&&
    scene.includes('wpn.family == "axe" or wpn.family == "blunt" then 0.45'));
  assert.ok(scene.includes('local impact = math.clamp(0.14 / swingDur, 0.15, 0.65)')&&
    scene.includes('progress = if p < impact then p / impact * contact'),
    'authored melee contact must match original basic damage at 0.14 sec');
  const shared=scene.indexOf('local style = ch and ch:GetAttribute("FieldDodgeStyle") or "warrior"');
  const root=scene.indexOf('if style == "navigator" then');
  const action=scene.indexOf('local dodgeStyle = if JobSkills.Categories[profession]');
  assert.ok(shared>0 && root>shared && action>root,'dodge style must be shared by input and animation state');
  for(const role of ['warrior','gunner','clergy','doctor','navigator','merchant','scholar']){
    assert.ok(scene.includes(role+' = {'),'missing profession R15 pose: '+role);
  }
  assert.ok(scene.includes('src = castPoses.dodge[ch:GetAttribute("FieldDodgeStyle") or "warrior"] or castPoses.dodge.warrior')&&
    scene.includes('ch0:SetAttribute("FieldDodgeStyle", dodgeStyle)')&&
    scene.includes('startSwing("dash", 0.4)')&&
    scene.includes('hrp.CFrame = hrp.CFrame + look.Unit * 14'),
    'dodge animation must preserve original movement, timing and character input');
  for(const role of ['archer','shield','charger','thrower','boss','grunt']){
    assert.ok(motion.includes('if role == "'+role+'"')||motion.includes('elseif role == "'+role+'"'),
      'enemy combat role evasion missing '+role);
  }
  assert.ok(scene.includes('AC.tryMove(pl, moveId, now)')&&
    scene.includes('task.delay(if kind == "slash" then 0.14'),
    'original invulnerability authority and attack damage timing must be retained');
  assert.ok(scene.includes('if basicAttack == true then')&&
    scene.includes('local autoHeavyReady = basicAttack == true')&&
    scene.includes('hitActionSeq, nil, moveId == "rush", basicBeat)')&&
    !scene.includes('pl.basicAttackSeq')&&
    scene.includes('pl.autoNormalHits = (pl.autoNormalHits or 0) + 1')&&
    scene.includes('if pl.autoNormalHits % 5 == 0 then')&&
    scene.includes('ch:SetAttribute("FieldAutoSkillPending", nil)')&&
    scene.includes('useMove("heavy")')&&
    scene.includes('pl.autoNormalHits = 0')&&
    !scene.includes('FieldAutoCardPending'),
    'only owner basic-hit streak can trigger a single heavy skill each five true hits');
  assert.ok(scene.includes('(pl.cd.heavy or -100) <= os.clock()')&&
    scene.includes('pl.stamina >= AC.Moves.heavy.stamina')&&
    scene.includes('equipped.heavy, equipped.sweep = true, false')&&
    scene.includes('status:SetAttribute("CombatEnabled", false)')&&!scene.includes('aw.family == "axe", true, false, nil, aw'),
    'automatic skill must use original cooldown and stamina; party cannot contribute to owner streak');
  // [모바일 반원형 3메달] 기존 공격·회피 두 행동 + 주·보조 무기교체. 별도 스킬/방어 버튼 없음.
  assert.ok(scene.includes('workspace.CurrentCamera.ViewportSize.X < 520')&&
    scene.includes('workspace.CurrentCamera.ViewportSize.X <= workspace.CurrentCamera.ViewportSize.Y')&&
    scene.includes('UDim2.fromOffset(if compactTouch then 104 elseif visualMobile and workspace.CurrentCamera.ViewportSize.Y < 330 then 104')&&
    scene.includes('UDim2.fromOffset(if compactTouch then 86 elseif visualMobile and workspace.CurrentCamera.ViewportSize.Y < 330 then 88')&&
    scene.includes('1, if compactTouch then -85')&&
    scene.includes('if compactTouch then UDim2.new(1, -62, 1, -202)')&&
    scene.includes('else UDim2.new(1, attackBtn.Position.X.Offset - 146, 1, attackBtn.Position.Y.Offset - 66)')&&
    scene.includes('combatBtns.dodge = { btn = b, label = "회피" }'),
    'large dodge and attack must be separated for thumb reach on portrait mobile');
  assert.ok(202-85 > (104+86)/2,'portrait attack and dodge must not overlap');
  assert.ok(scene.includes('button.Name == "FieldAttack" or button.Name == "FieldDodge"')&&
    scene.includes('attackCaption.Name = "FieldAttackCaption"')&&
    scene.includes('dodgeCaption.Name = "FieldDodgeCaption"')&&
    scene.includes('attackBtn:SetAttribute("SkillFullName", "일반 공격")')&&
    scene.includes('addIcon(b, "Menu/chart_compass")')&&
    !scene.includes('addIcon(skillBtns.parry.btn,')&&
    scene.includes('attackBtn.Text = ""')&&
    scene.includes('b.Text = ""')&&
    scene.includes('if AssetIds["Menu/field_attack"] then addIcon(attackBtn, "Menu/field_attack")')&&
    scene.includes('if AssetIds["Menu/field_dodge"] then addIcon(b, "Menu/field_dodge")')&&
    scene.includes('addIcon(wbtn, "Menu/field_weapon")')&&
    scene.includes('wbtn.Name = "FieldWeapon"')&&
    scene.includes('Vector2.new(0.5, 0.5))'),
    'mobile combat controls must use owner-approved attack/dodge/swap original artwork without changing combat authority');
  assert.ok(scene.includes('comboLabel.Font = Enum.Font.Bangers')&&
    scene.includes('comboLabel.TextStrokeColor3 = Color3.fromRGB(22, 22, 37)')&&
    scene.includes('if visualMobile then 63 else 76')&&
    scene.includes('comboLabel.TextSize = targetSize')&&
    scene.includes('comboLabel.Rotation = 0')&&scene.includes('comboPopScale.Scale = if milestone then 1.20 else 1.13')&&
    scene.includes('comboInfo.Font = Enum.Font.GothamBlack')&&
    scene.includes('초당 %.1f타'),
    'large high-contrast combo lettering and speed HUD must preserve real hit-count logic');
  assert.ok(!scene.includes('local comboGaugeCorner =')&&!scene.includes('local comboFillCorner =')&&
    !scene.includes('local innerSkillRadius =')&&!scene.includes('local ATK_C ='),
    'Luau 200-register budget: decorative and redundant HUD locals may not be reintroduced');
  // [성직자·학자 거대 회피] 둘이 같은 모션/이펙트를 쓰면 실패. R15 전신·루트·빛 궤적을 각각 검사한다.
  const priest=scene.match(/clergy = \{([\s\S]*?)\n\t\t\t\},/)?.[1];
  const scholar=scene.match(/scholar = \{([\s\S]*?)\n\t\t\t\},/)?.[1];
  assert.ok(priest && scholar && priest!==scholar,'clergy and scholar dodge poses must differ');
  for(const joint of ['Spine','Chest','Head','UpperArmL','UpperArmR','ForearmL','ForearmR',
    'HandL','HandR','ThighL','ThighR','ShinL','ShinR','FootL','FootR']){
    assert.ok(priest.includes(joint+' = A(')&&scholar.includes(joint+' = A('),
      'large dodge must animate full R15 body: '+joint);
  }
  assert.ok(scene.includes('elseif dodgeStyle == "clergy" then')&&
    scene.includes('elseif dodgeStyle == "scholar" then')&&
    scene.includes('ch0:SetAttribute("FieldDodgeBeat", -(ch0:GetAttribute("FieldDodgeBeat") or -1))')&&
    scene.includes('ch0:SetAttribute("FieldDodgeTrick", (ch0:GetAttribute("FieldDodgeTrick") or 0) % 6 + 1)')&&
    scene.includes('pulseAt("BLOCK_IMPACT", landingGround, gold, pearl')&&
    scene.includes('pulseAt("UPGRADE_BURST", originGround, cyan, violet'),
    'distinct full-body clergy and scholar dodges must alternate six visual tricks without changing movement distance');
  assert.ok(scene.includes('math.sin(math.clamp(p, 0, 1) * math.pi) ^ 0.72')&&
    scene.includes('then 2.0 else 1.70')&&
    scene.includes('FM.step(pfm, dt, rootRot, if swingKind == "dash" then 1.85')&&
    scene.includes('elseif swingKind and swingCombo and (wpn.family == "dagger" or wpn.family == "fist") then 1.12'),
    'evade must have large held pose and faster joint response without affecting weapon attack speed');
  for(const atom of ['"BLOCK_IMPACT"','"HEAL_PULSE"','"UPGRADE_BURST"','"DODGE_EVASION_PULSE"']){
    assert.ok(scene.includes('pulseAt('+atom),'dodge must reuse registered VFX: '+atom);
  }
  assert.ok(scene.includes('if study and not care then "학자"')&&
    scene.includes('if visualMobile then 2 else 5')&&
    scene.includes('if visualMobile then 3 else 6')&&
    scene.includes('pulseAt("DODGE_EVASION_PULSE", originGround'),
    'scholar/clergy class selection, mobile ghost cap and start/end effect must work');
});

test('Mare nine weapon families have distinct authored normal and skill R15 gameplay',()=>{
  const base='roblox-games/mare-essentia/';
  const source=fs.readFileSync(base+'src/ReplicatedStorage/Shared/Weapons.luau','utf8');
  const field=fs.readFileSync(base+'src/ReplicatedStorage/Shared/FieldScene.luau','utf8');
  const motion=fs.readFileSync(base+'src/ReplicatedStorage/Shared/FieldMotion.luau','utf8');
  const common=fs.readFileSync(base+'src/ReplicatedStorage/Shared/CommonMotion.luau','utf8');
  const allies=fs.readFileSync(base+'src/ReplicatedStorage/Shared/JobSkills.luau','utf8');
  const candidates=['fist','blade','dagger','axe','spear','blunt','bow','firearm'];
  for(const family of candidates){
    const line=source.split('\n').find(row=>row.includes(family+' = { basic = '));
    assert.ok(line,'missing weapon action family: '+family);
    assert.match(line,/heavyBeat = [1-5], sweepBeat = [1-5]/,'missing actual skill beat: '+family);
  }
  for(const style of ['UNARMED_RUSH','UNARMED_UPPERCUT','UNARMED_KICK','UNARMED_ELBOW'])
    assert.ok(motion.includes(style+' = { '),'missing martial arts original: '+style);
  for(const atom of [...motion.matchAll(/"(?:W|U):([A-Z0-9_]+)"/g)].map(m=>m[1])){
    assert.ok(common.includes('id="'+atom+'"'),'unregistered CommonMotion action: '+atom);
  }
  assert.ok(motion.includes('WEAPON_HIGH_BEATS'));
  assert.ok(field.includes('Weapons.actionDesign(wpn).heavyBeat'));
  assert.ok(field.includes('Weapons.actionDesign(wpn).sweepBeat'));
  assert.ok(field.includes('startSwing(finishKind, if stage == 3 then 0.34 else 0.26, stage, true)'),'bonus chains must play actual R15 steps');
  assert.ok(field.includes('pl.combo = 0') && field.includes('mult = 1'),'first attack must be basic single hit');
  const active=field.slice(field.indexOf('if chain > 1 then'),field.indexOf('elseif hits == 0 and moveId == "rush"'));
  assert.ok(active.includes('startSwing(finishKind, if stage == 3 then 0.34 else 0.26, stage, true)')
    && active.includes('if stage == chain and stage == 3 and wpn.family == "fist"')
    && active.includes('if stage == chain then')
    && !active.includes('strikeEnemy('),
    'bonus visual beats must be purely cinematic, use authored finishers and never add damage or experience');
  assert.ok(field.includes('local party = if type(opts.allies) == "table" then opts.allies else {}')
    && field.includes('status:SetAttribute("CompanionId", member.id)')
    && field.includes('status:SetAttribute("CombatEnabled", false)')
    && field.includes('FieldAllyPortrait')&&field.includes('local companionRows: { any } = {}')
    && !field.includes('a.nextSkill')&&!field.includes('a.skillCd[sid]')&&!field.includes('castEffect(sid, a.name')&&!field.includes('activeHealers'),
    'party IDs and portraits are preserved but party combat and healing must stay disabled');
  assert.ok(field.includes('not fieldStreakResult.credited[creditedSeq]')
    && field.includes('if hits == 0 and not sceneryHit and hitActionSeq >= streakCountedSeq then endStreak("헛손질") end')
    && field.includes('now - lastCombatAt >= 8')
    && field.includes('pl.hp = math.min(pl.maxHp, pl.hp + 0.12 * math.min(dt, 0.1))'),
    'cumulative streak must be scored per attack and passive healing must remain tiny and non-combat only');
  assert.ok(allies.includes('function JobSkills.allySkills'));
  // [투척병·접지 회귀] 기존 사수 체력/피해/재사용은 그대로, 승인된 메시만 궤도로 움직인다.
  for(const type of ['stone','jar'])assert.ok(field.includes('nil, "'+type+'"'),'missing thrower '+type);
  assert.ok(field.includes('#looks[ac.kind] + 1')&&field.includes('throwAsset = style[6]'));
  assert.ok(field.includes('AssetIds[kind .. "/" .. asset]')&&field.includes('from:Lerp(to, t)'));
  assert.ok(field.includes('e.throwAsset')&&field.includes('arrowTrail(e.root.Position'));
  assert.ok(field.includes('e.moveVel = Vector3.zero')&&field.includes('math.clamp(traveled / math.max(dtc'));
  assert.ok(motion.includes('local effort = math.clamp(moveEffort or 1')&&motion.includes('local liftL, liftR'));
  assert.ok(motion.includes('elseif role == "thrower" then'));

  const steps=JSON.parse(fs.readFileSync(base+'tools/devloop/studio-scripts/mare-weapons.json','utf8'));
  const names=['fist','sword','dagger','axe','spear','mace','bow','crossbow','gun'];
  assert.equal(steps.filter(row=>row.type==='capture').length,27);
  for(const id of names){
    assert.ok(steps.some(row=>row.code?.includes('WEAPON_QA_LAUNCHED:'+id)),'missing real scene: '+id);
    assert.ok(steps.some(row=>row.code?.includes('WEAPON_R15_POSE_MISSING:'+id)),'missing five-stage sample: '+id);
    for(const motion of ['SLASH','HEAVY','SPIN'])
      assert.ok(steps.some(row=>row.code?.includes('WEAPON_'+motion+'_R15_PASS:'+id)),'missing real input: '+id+'/'+motion);
    for(const suffix of ['a','b','sweep'])
      assert.ok(steps.some(row=>row.type==='capture'&&row.name==='wp_'+id+'_'+suffix),'missing visual frame: '+id+'/'+suffix);
  }
  assert.ok(steps.some(row=>row.code?.includes('WEAPON_QA_FINAL_CLEAN_EXIT_PASS')));
  const daily=fs.readFileSync('.github/workflows/studio-autoqa.yml','utf8');
  assert.ok(daily.includes("cron: '*/10 * * * *'"));
  assert.ok(daily.includes('STUDIO_WATCHDOG_SKIP=SOURCE_ALREADY_CHECKED'));
  assert.ok(daily.includes('STUDIO_RELEASE_REGRESSION=FULL'));
  assert.ok(daily.includes('SHIPS) script=roblox-games/mare-essentia/tools/devloop/studio-scripts/mare-ships.json'));
  const runner=fs.readFileSync('.github/workflows/devloop-studio.yml','utf8');
  assert.ok(runner.includes('      script:')&&runner.includes('|| inputs.script }}'),'dedicated weapon and town suites must remain directly executable');
});

test('Mare official Studio QA records complete registered media, model loading and feature verification',()=>{
  const model=fs.readFileSync('roblox-games/mare-essentia/src/ServerScriptService/AssetLoader.server.luau','utf8');
  const qa=fs.readFileSync('roblox-games/mare-essentia/src/ServerScriptService/StudioQA.server.luau','utf8');
  const script=helper.slice(helper.indexOf('export async function runStudioScript('),helper.indexOf('export async function runOfficialStudioMcpPlay('));
  // [카드 원화 회귀] CardArt는 승인된 Image 자산이므로 InsertService 모델 큐에서 제외한다.
  assert.match(model,/kind ~= "CardArt"/);
  assert.ok(qa.includes('string.find(key, "CardArt/", 1, true)'));
  assert.ok(qa.includes('string.find(it.key, ".CardArt/", 1, true)'));
  assert.match(model,/MareModelAuditState/);
  assert.match(model,/MareModelAuditTotals/);
  assert.match(model,/pending == 0/);
  assert.match(model,/loaded = loaded, failed = failed, errors = failedKeys/);
  // 초기 모델 범위는 등록된 실제 시작 장면에 한정하고 전체 검사는 기존 큐에서 유지한다.
  const startupBlock=model.match(/local startupModels = \{([\s\S]*?)\n\}/)?.[1];
  assert.ok(startupBlock);
  const startupKeys=[...startupBlock.matchAll(/\["([^"]+)"\] = true/g)].map(m=>m[1]);
  assert.equal(startupKeys.length,15);
  assert.equal(new Set(startupKeys).size,15);
  const assetSource=fs.readFileSync('roblox-games/mare-essentia/src/ReplicatedStorage/Shared/AssetIds.luau','utf8');
  for(const key of startupKeys) assert.ok(assetSource.includes('["'+key+'"]'),'missing registered startup model '+key);
  assert.match(model,/startup = startupModels\[key\] == true or earlyScenery\[key\] == true/);
  assert.match(model,/if a\.startup ~= b\.startup then return a\.startup end/);
  assert.match(model,/if asset\.startup then priorityPending \+= 1 end/);
  assert.match(model,/if item\.startup then priorityPending -= 1 end/);
  assert.match(model,/for _ = 1, 12 do/);
  assert.match(model,/if pending == 0 then\s+ReplicatedStorage:SetAttribute\("MareAssetsSettled", true\)/);
  const client=fs.readFileSync('roblox-games/mare-essentia/src/StarterPlayer/Game.client.luau','utf8');
  assert.match(client,/if not H\.assetWaitDone then/);
  assert.match(client,/while not RS:GetAttribute\("MareAssetsReady"\) and os\.clock\(\) - t0 < 5 and player\.Parent do/);
  assert.match(client,/while not RS:GetAttribute\("MareAssetsSettled"\) and player\.Parent do/);
  assert.match(client,/if player\.Parent and RS:GetAttribute\("MareAssetsSettled"\) and view then\s+sceneKey = nil\s+if not sceneHold and not inField then\s+syncScene\(\)/);
  assert.match(qa,/local modelReadyDeadline = os\.clock\(\) \+ 60/);
  assert.match(qa,/while ReplicatedStorage:GetAttribute\("MareAssetsSettled"\) ~= true and os\.clock\(\) < modelReadyDeadline do/);
  // [항구 우물 회귀] 실측 실패한 5개 텍스처를 기존 모델 로더에서만 제거한다.
  const wellRepair=model.indexOf('if item.key == "Town/village-well" then');
  const libraryParent=model.indexOf('model.Parent = group',wellRepair);
  assert.ok(wellRepair>=0 && libraryParent>wellRepair,'well textures must be cleaned before library replication');
  for(const id of ['131733628065975','111140593310889','134307586169558','139141388446795','118471529732548'])
    assert.ok(model.slice(wellRepair,libraryParent).includes(id),'missing broken well texture: '+id);
  assert.match(model,/mesh\.TextureID = ""/);
  assert.match(model,/mesh\.Material = Enum\.Material\.Slate/);
  assert.match(qa,/if not RunService:IsStudio\(\) then/);
  assert.match(qa,/MareQAAssetStatus/);
  assert.match(qa,/MareQAAssetTotals/);
  assert.match(qa,/ContentProvider\.PreloadAsync/);
  // [개별 로딩 회귀] 하나의 콘텐츠가 무응답이어도 12개 병렬 검사와 ID별 16초 판정을 유지한다.
  assert.match(qa,/for i = 1, #items, 12 do/);
  assert.match(qa,/task\.delay\(16, function\(\)/);
  assert.match(qa,/complete\("TIMEOUT_16S"\)/);
  assert.match(qa,/ContentProvider\.PreloadAsync, ContentProvider, \{ row\.it\.url \}, function\(_, status\)/);
  assert.match(qa,/elseif fetchStatus == Enum\.AssetFetchStatus\.Success then\s+complete\("SUCCESS"\)/);
  assert.match(qa,/complete\(if fetchStatus then tostring\(fetchStatus\) else "NO_CALLBACK"\)/);
  assert.match(qa,/#failedMedia < 128/);
  assert.doesNotMatch(qa,/for i = 1, #items, 30 do/);
  assert.match(qa,/task\.delay\(140, function\(\)/);
  assert.match(qa,/fetchCallbacks = mediaCallbacks/);
  assert.match(qa,/currentBatch = currentBatch/);
  assert.match(qa,/failedMedia = failedMedia/);
  assert.match(qa,/timedOut = true/);
  assert.match(qa,/if not timedOut and bad == 0 and moduleErrors == 0/);
  assert.match(qa,/asset preload timed out at batch/);
  assert.match(qa,/MareQAFeatureStatus/);
  assert.match(qa,/MareQAFeatureTotals/);
  assert.match(qa,/MareQAFeatureProgress/);
  assert.match(qa,/featureCalls % 100 == 0/);
  assert.match(qa,/FEATURE_UNIMPLEMENTED_OR_ERROR/);
  assert.match(qa,/elseif res\.ok == false then/);
  assert.match(qa,/FEATURE_RESPONSE_INVALID/);
  assert.match(qa,/FEATURE_RESPONSE_UNKNOWN/);
  assert.match(qa,/FEATURE_NO_VIEW/);
  assert.match(qa,/FEATURE_NO_CASES/);
  assert.match(qa,/\[QA\] FEATURE_COVERED/);
  assert.match(script,/MARE_STUDIO_AUDIT=/);
  assert.match(script,/STUDIO_SCRIPT_MARE_FULL_AUDIT=/);
  assert.match(script,/STUDIO_SCRIPT_MARE_FEATURE_PROGRESS=/);
  assert.match(script,/lastFeatureProgress/);
  // [시간 초과 회귀] 140초 자산검사와 2천여 기능 호출을 모두 종료할 시간은 확보하되 미완료는 반드시 실패로 판정한다.
  assert.match(script,/const mareAuditDeadline=Date\.now\(\)\+300000/);
  assert.match(script,/Date\.now\(\)\+3000>=mareAuditDeadline/);
  // [초상 ID 회귀] 이미 승인·사용권한을 받은 등록표와 실제 Luau 456개를 전수 비교한다.
  const registered=JSON.parse(fs.readFileSync('roblox-games/mare-essentia/assets-registered.json','utf8')).assets;
  const activeSource=fs.readFileSync('roblox-games/mare-essentia/src/ReplicatedStorage/Shared/AssetIds.luau','utf8');
  const active=new Map([...activeSource.matchAll(/\["([^"]+)"\]\s*=\s*([0-9]+)/g)].map(m=>[m[1],m[2]]));
  assert.equal(active.size,Object.keys(registered).length);
  const imageKinds=new Set(['Menu','Goods','Portraits','CardArt','Materials']);
  assert.ok(model.includes('kind ~= "Materials"'),'material images must not enter model loading');
  assert.ok(qa.includes('string.find(key, "Materials/", 1, true)'));
  assert.ok(qa.includes('string.find(it.key, ".Materials/", 1, true)'));
  assert.ok(script.includes('Goods|Menu|Portraits|CardArt|Materials'),'client media audit must include registered materials');
  const originals=JSON.parse(fs.readFileSync('roblox-games/mare-essentia/assets/APPROVED_IMAGES.json','utf8')).approved;
  const cardKeys=Object.keys(registered).filter(key=>key.startsWith('CardArt/'));
  assert.ok(cardKeys.length>=17,'Mare approved discovery/event illustrations must be registered');
  for(const [key,row] of Object.entries(registered)){
    const kind=key.split('/')[0];
    assert.equal(row.assetType,imageKinds.has(kind)?'Image':'Model','wrong Mare asset category: '+key);
    if(kind==='Materials')assert.equal(row.usePermissionGranted,true,'material image usage permission missing: '+key);
    if(kind==='CardArt'){
      assert.equal(row.usePermissionGranted,true,'CardArt usage permission missing: '+key);
      const actualSha=crypto.createHash('sha256').update(fs.readFileSync(row.source)).digest('hex');
      assert.equal(actualSha,originals[key],'CardArt original differs from approved SHA256: '+key);
    }
  }
  for(const [key,row] of Object.entries(registered)){
    assert.equal(active.get(key),String(row.assetId),'asset registration mismatch: '+key);
    if(key.startsWith('Portraits/'))assert.equal(row.usePermissionGranted,true,'portrait use grant unverified: '+key);
  }
  assert.match(script,/STUDIO_ASSET_AUDIT_FAILED/);
  assert.match(script,/STUDIO_FEATURE_AUDIT_FAILED/);
  assert.match(script,/STUDIO_FULL_AUDIT_INCOMPLETE/);
  assert.match(script,/ASSET_OWNER_MAP=/);
  assert.match(script,/STUDIO_SCRIPT_ASSET_OWNER_MAP=/);
  assert.match(script,/STUDIO_SCRIPT_ASSET_REGISTRY_AUDIT=/);
  assert.match(script,/EFFECTIVE_ID_PERMISSION_NOT_PROVEN/);
  assert.match(script,/usePermissionGranted!==true/);
  assert.match(script,/STUDIO_ASSET_AUDIT_FAILED/);
  assert.match(script,/UNVERIFIED/);
  const workflow=fs.readFileSync('.github/workflows/devloop-studio.yml','utf8');
  assert.match(workflow,/STUDIO_MARE_ASSET_AUDIT_MODELS=/);
  assert.match(workflow,/STUDIO_MARE_ASSET_AUDIT_MEDIA=/);
  assert.match(workflow,/STUDIO_MARE_FEATURE_AUDIT=/);
  assert.match(workflow,/STUDIO_ASSET_AUDIT_FAILED/);
  assert.match(workflow,/STUDIO_FEATURE_AUDIT_FAILED/);
  assert.match(workflow,/STUDIO_FULL_AUDIT_INCOMPLETE/);
});

test('Studio click QA keeps UTF-8-safe labels in active game scripts',()=>{
  const generator=fs.readFileSync('tools/gen-qa-click-scripts.py','utf8');
  for(const [game,name] of [
    ['mare-essentia','mare-qa-click.json'],
    ['fantasy-survival','fantasy-qa-click.json']
  ]){
    const steps=JSON.parse(fs.readFileSync('roblox-games/'+game+'/tools/devloop/studio-scripts/'+name,'utf8'));
    const mare=game==='mare-essentia';
    assert.ok(steps.length>=(mare?180:185));
    const labels=steps.filter(row=>row.type==='luau'&&row.code.includes("return 'TEXTS: '"));
    assert.ok(labels.length>=(mare?12:30));
    for(const row of labels){
      assert.match(row.code,/for _,d in ipairs\(P:GetDescendants\(\)\) do/);
      assert.match(row.code,/utf8\.offset\(value,41\)/);
      assert.doesNotMatch(row.code,/string\.sub\(value,1,40\)/);
    }
    assert.ok(steps.filter(row=>row.type==='capture').length>=(mare?40:31));
  }
  assert.match(generator,/utf8\.offset\(value,41\)/);
});

// [실제 Studio 미디어 실패] 185단계 증거와 정확한 승인 ID로만 재승인한다.
// 승인 번호/소스 파일은 바꾸지 않고 실패한 미디어만 기존 업로더의 grant 경로로 전송한다.
test('Mare Studio media repair regrants only exact failed registered IDs without model reupload',()=>{
  const uploader=fs.readFileSync('tools/mare-essentia-upload-assets.mjs','utf8');
  const workflow=fs.readFileSync('.github/workflows/owner-mare-essentia-assets.yml','utf8');
  assert.match(uploader,/const studioRegrantPath = studioRegrantArg/);
  assert.match(uploader,/if \(!studioRegrantPath\) for \(const \[dir, kind\] of/);
  assert.match(uploader,/report\.summary\?\.completedSteps !== report\.summary\.plannedSteps/);
  assert.match(uploader,/report\.assetRegistryAudit\?\.status !== 'PASS'/);
  assert.match(uploader,/report\.assetRegistryAudit\.mismatched\.length !== 0/);
  assert.match(uploader,/report\.assetRegistryAudit\.unverifiedPermissions\.length !== 0/);
  assert.match(uploader,/row\.status !== 'TIMEOUT_16S'/);
  assert.match(uploader,/row\.id !== 'rbxassetid:\/\/' \+ registered\.assetId/);
  assert.match(uploader,/pendingPermissions\.push\(\{id, assetId: registered\.assetId\}\)/);
  assert.match(uploader,/MARE_STUDIO_REGRANT_VALIDATED_TARGET_COUNT/);
  assert.match(uploader,/if \(failures\.length === 0\) registry\.updatedAt/);
  assert.match(workflow,/studio_regrant:/);
  assert.match(workflow,/mare-essentia-studio-frames/);
  assert.match(workflow,/git show FETCH_HEAD:report\.json/);
  assert.match(workflow,/--studio-regrant=\$RUNNER_TEMP\/mare-studio-report\.json/);
  assert.match(workflow,/inputs\.studio_regrant != true/);
});


// [대항해시대 서버 선로딩 장애] 첫 12건 무응답이면 반복을 중단하고 Client 실증을 요구한다.
test('Mare unresponsive server preload keeps strict client evidence gate',()=>{
  const qa=fs.readFileSync('roblox-games/mare-essentia/src/ServerScriptService/StudioQA.server.luau','utf8');
  const script=helper.slice(helper.indexOf('export async function runStudioScript('),helper.indexOf('export async function runOfficialStudioMcpPlay('));
  assert.ok(qa.includes('if i == 1 and mediaCallbacks == 0 and timedOutMedia == math.min(12, #items) then'));
  assert.ok(qa.includes('serverPreloadUnresponsive = true'));
  assert.equal(qa.split('serverPreloadUnresponsive = serverPreloadUnresponsive').length-1,2);
  assert.ok(qa.includes('if not timedOut and bad == 0 and moduleErrors == 0 and #ids > 0 then'));
  assert.ok(script.includes("const response=await luau('Client',auditClientCode)"));
  assert.ok(script.includes('proof.loaded===imageRows.length'));
  assert.ok(script.includes('proof.soundLoaded===soundRows.length'));
});

// [대항해시대 실물 로딩 재시도] 누락한 승인 자산만 같은 Studio Client에서 한 번 재확인한다.
test('Mare Client retries missing media once while requiring complete approved IsLoaded evidence',()=>{
  const script=helper.slice(helper.indexOf('export async function runStudioScript('),helper.indexOf('export async function runOfficialStudioMcpPlay('));
  assert.ok(script.includes('const batchSize=60;'));
  assert.ok(script.includes('await auditBatch(allRows.slice(offset,offset+batchSize))'));
  assert.ok(script.includes('pendingRows=allRows.filter(row=>'));
  assert.ok(script.includes('missingCount>0&&missingCount<=24'));
  assert.ok(script.includes("throw Error('STUDIO_CLIENT_MEDIA_BATCH_EVIDENCE_INVALID')"));
  assert.ok(script.includes('missing.every(key=>allowed.has(key))'));
  assert.ok(script.includes('proof.expected===imageRows.length&&proof.loaded===imageRows.length'));
  assert.ok(script.includes('proof.soundExpected===soundRows.length&&proof.soundLoaded===soundRows.length'));
});

// [실제 재시도 분기] 8개 이미지+1개 음원 누락과 24개 한계 및 잔여 실패를 재현한다.
test('Mare client media retries nine missing assets and retains failures with bounded batches',async()=>{
  const start=helper.indexOf('        const missingCount=proof.missing.length+proof.soundMissing.length;');
  const end=helper.indexOf('        proof.loaded=proof.expected-proof.missing.length;',start);
  assert.ok(start>=0&&end>start);
  const retry=new Function('proof','allRows','auditBatch','return (async()=>{'+helper.slice(start,end)+'})()');
  for(const count of [0,9,24,25]){
    const missing=Array.from({length:Math.max(0,count-1)},(_,i)=>'image'+i);
    const soundMissing=count?['sound']:[], proof={missing:[...missing],soundMissing:[...soundMissing]};
    const rows=[...missing.map(key=>({kind:'Image',key})),...soundMissing.map(key=>({kind:'Sound',key})),{kind:'Image',key:'alreadyLoaded'}];
    const calls=[];
    await retry(proof,rows,async batch=>{
      calls.push(batch.map(row=>row.key));
      return {missing:[],soundMissing:batch.some(row=>row.kind==='Sound')?['sound']:[]};
    });
    if(count===9||count===24){
      assert.equal(calls.flat().length,count);
      assert.ok(calls.every(batch=>batch.length<=12&&!batch.includes('alreadyLoaded')));
      assert.deepEqual(proof.firstPassMissing,{images:missing,sounds:soundMissing});
      assert.deepEqual(proof.missing,[]);
      assert.deepEqual(proof.soundMissing,['sound']);
    }else{
      assert.equal(calls.length,0);
      assert.deepEqual(proof.missing,missing);
      assert.deepEqual(proof.soundMissing,soundMissing);
    }
  }
});

// [대항해시대] 서버 이미지 선로딩 타임아웃은 실제 Studio Client 이미지 로딩 증거로만 정정할 수 있다.
test('Mare server media timeout requires full official Client image and sound IsLoaded proof, never partial PASS',()=>{
  const script=helper.slice(helper.indexOf('export async function runStudioScript('),helper.indexOf('export async function runOfficialStudioMcpPlay('));
  // [도감 이미지 실증] 모델에서 제외된 CardArt도 동일한 공식 Client IsLoaded 감사로 검증한다.
  assert.ok(script.includes('Goods|Menu|Portraits|CardArt'),'CardArt must receive the same real Client image proof');
  const registry=JSON.parse(fs.readFileSync('roblox-games/mare-essentia/assets-registered.json','utf8')).assets;
  const originals=JSON.parse(fs.readFileSync('roblox-games/mare-essentia/assets/APPROVED_IMAGES.json','utf8')).approved;
  const cards=Object.entries(registry).filter(([key])=>key.startsWith('CardArt/'));
  assert.ok(cards.length>=19,'registered discovery/event images required');
  for(const [key,asset] of cards){
    assert.equal(asset.assetType,'Image','CardArt must be a Roblox image: '+key);
    assert.equal(asset.usePermissionGranted,true,'CardArt requires verified usage grant: '+key);
    assert.match(String(asset.assetId),/^[1-9][0-9]*$/);
    const actualSha=crypto.createHash('sha256').update(fs.readFileSync(asset.source)).digest('hex');
    assert.equal(actualSha,originals[key],'CardArt must match the approved source: '+key);
  }
  // [원본 계약] 이미지 전 종류는 승인·등록·사용권한을 확인하고, 음원도 기존 AudioIds 전체를 검사한다.
  assert.match(script,/const failed=media\.failedMedia/);
  assert.match(script,/row\?\.status!=='TIMEOUT_16S'/);
  assert.match(script,/asset\.usePermissionGranted!==true/);
  assert.match(script,/\(\?:Goods\|Menu\|Portraits\|CardArt\|Materials\)/);
  assert.match(script,/AudioIds\.luau/);
  assert.match(script,/const allRows=\[\.\.\.imageRows,\.\.\.soundRows\]/);
  assert.match(script,/Number\(media\.imagesSounds\)!==allRows\.length/);
  assert.match(script,/Number\(media\.registered\)!==Number\(media\.models\)\+allRows\.length/);
  assert.match(script,/Number\(media\.failed\)!==failed\.length/);
  assert.match(script,/failedKeys\.size!==failed\.length/);
  assert.match(script,/byKey\.get\(String\(row\?\.key\|\|''\)\)!==String\(row\?\.id\|\|''\)/);
  assert.match(script,/report\.assetRegistryAudit\?\.status==='PASS'/);
  assert.match(script,/report\.assetAudit\?\.models\?\.status==='PASS'/);
  // [실제 Studio] 30초 동안 실제로 보이는 ImageLabel과 재생하지 않은 Sound 양쪽의 IsLoaded를 확인한다.
  assert.match(script,/const response=await luau\('Client',auditClientCode\)/);
  assert.match(script,/img\.Visible=true img\.Parent=g/);
  assert.match(script,/if row\.image\.IsLoaded then loaded\+=1/);
  assert.match(script,/if row\.sound\.IsLoaded then soundLoaded\+=1/);
  assert.match(script,/if not row\.image\.IsLoaded then table\.insert\(missing,row\.key\)/);
  assert.match(script,/if not row\.sound\.IsLoaded then table\.insert\(soundMissing,row\.key\)/);
  assert.match(script,/STUDIO_MEDIA_SOURCE_MISMATCH/);
  assert.match(script,/proof\.expected===imageRows\.length/);
  assert.match(script,/proof\.loaded===imageRows\.length/);
  assert.match(script,/proof\.missing\.length===0/);
  assert.match(script,/proof\.soundExpected===soundRows\.length/);
  assert.match(script,/proof\.soundLoaded===soundRows\.length/);
  assert.match(script,/proof\.soundMissing\.length===0/);
  assert.match(script,/media\.serverPreloadEvidence=\{status:media\.status,failed:media\.failed/);
  assert.match(script,/media\.authority='OFFICIAL_STUDIO_MCP_VISIBLE_CLIENT_IMAGE_AND_SOUND_ISLOADED'/);
  assert.match(script,/STUDIO_MARE_SOUNDS_REAL_CLIENT_LOADED=/);
  assert.match(script,/report\.clientImageAudit=\{status:'UNVERIFIED'/);
  assert.match(script,/STUDIO_CLIENT_IMAGE_RESPONSE_MISSING/);
  assert.doesNotMatch(script,/if\(media\.failed>0\)media\.status='PASS'/);
});

// [대항해시대 실제 Client 45개 실패] GUI ImageLabel은 Decal 자산이 아니라 Image 자산을 등록한다.
// Asset create·Universe grant 성공 전에 기존 45개 등록 ID를 변경하지 않는다.
test('Mare goods/menu asset replacement requires verified Image uploads with atomic rollback',()=>{
  const uploader=fs.readFileSync('tools/mare-essentia-upload-assets.mjs','utf8');
  assert.match(uploader,/assetType: image \? 'Image' : 'Model'/);
  assert.doesNotMatch(uploader,/assetType: image \? \(kind === 'Portraits' \? 'Image' : 'Decal'\)/);
  assert.match(uploader,/const previousTypeAssets = new Map\(\)/);
  assert.match(uploader,/previousTypeAssets\.set\(item\.kind \+ '\/' \+ item\.name, \{\.\.\.row\}\)/);
  assert.match(uploader,/const replacementUnverified = \[\.\.\.previousTypeAssets\]/);
  assert.match(uploader,/current\?\.usePermissionGranted !== true/);
  assert.match(uploader,/expectedType === 'Model' && current\.sourceSha256 === previous\.sourceSha256/);
  assert.match(uploader,/if \(failures\.length && previousTypeAssets\.size\)/);
  assert.match(uploader,/for \(const \[id, previous\] of previousTypeAssets\) registry\.assets\[id\] = previous/);
  assert.match(uploader,/MARE_ASSET_REPLACEMENT_ROLLBACK=OLD_IDS_PRESERVED/);
  const registry=JSON.parse(fs.readFileSync('roblox-games/mare-essentia/assets-registered.json','utf8'));
  const approved=JSON.parse(fs.readFileSync('roblox-games/mare-essentia/assets/APPROVED_IMAGES.json','utf8')).approved;
  // [등록 완료 후 회귀] 과거 45개 Decal이 현재 등록표에 남아 있어서는 안 된다.
  // 승인된 전체 교역품·메뉴 ID와 Universe 사용 권한을 실물 등록 기준으로 검사한다.
  const targets=Object.entries(registry.assets).filter(([id])=>/^(Goods|Menu)\//.test(id));
  assert.ok(targets.length>=45,'approved trade/menu images must remain registered');
  for(const [id,row] of targets){
    assert.equal(row.assetType,'Image','legacy Decal must not be used by GUI: '+id);
    assert.equal(row.usePermissionGranted,true,'missing Universe image grant: '+id);
    assert.match(String(row.assetId),/^[1-9][0-9]*$/);
    assert.match(String(approved[id]),/^[a-f0-9]{64}$/);
  }
});

 
// [7대륙 36척 실물 증빙] 설계 수량과 모델 등록 권한·원본 해시·실측 Studio 화면 검사를 묶는다.
test('Mare 36 designed ships have source-verified registered models and seven-continent Studio preview',()=>{
  const base='roblox-games/mare-essentia/';
  const ships=fs.readFileSync(base+'src/ReplicatedStorage/Shared/Ships.luau','utf8');
  const assetIds=fs.readFileSync(base+'src/ReplicatedStorage/Shared/AssetIds.luau','utf8');
  const port=fs.readFileSync(base+'src/ReplicatedStorage/Shared/PortScene.luau','utf8');
  const registry=JSON.parse(fs.readFileSync(base+'assets-registered.json','utf8')).assets;
  // [실물 36척 치수] 6개 미지 대륙 함종은 치수 필드가 stage 바로 뒤에 있지 않으므로
  // 항목별 전체 정의 행에서 실제 길이·폭·돛대 높이를 확인한다.
  const blueprintLines=ships.split('\n').filter(row=>/^\s*\{ id="[^"]+", name="[^"]+", faction="[^"]+", stage=\d+/.test(row));
  const blueprints=blueprintLines.map(row=>{
    const field=name=>row.match(new RegExp('\\b'+name+'=([\\d.]+)'))?.[1];
    return {id:row.match(/\bid="([^"]+)"/)?.[1],faction:row.match(/\bfaction="([^"]+)"/)?.[1],
      stage:Number(field('stage')),length:Number(field('targetLengthStuds')),
      beam:Number(field('targetBeamStuds')),mast:Number(field('targetMastHeightStuds'))};
  });
  assert.equal(blueprints.length,36);
  assert.equal(new Set(blueprints.map(bp=>bp.id)).size,36);
  const aliases={galleon:'galleon-heritage'};
  const factions=new Map(), registeredIds=new Set(), originalHashes=new Set();
  for(const bp of blueprints){
    factions.set(bp.faction,(factions.get(bp.faction)||0)+1);
    assert.ok(Number.isFinite(bp.length)&&bp.length>=24&&bp.length<=56,'invalid ship length: '+bp.id);
    assert.ok(Number.isFinite(bp.beam)&&bp.beam>=7&&bp.beam<bp.length/2,'invalid ship beam: '+bp.id);
    assert.ok(Number.isFinite(bp.mast)&&bp.mast>=14&&bp.mast<=50,'invalid ship mast: '+bp.id);
    const model=aliases[bp.id]||bp.id+'-custom',key='Naval/'+model;
    const asset=registry[key];
    assert.ok(asset&&asset.usePermissionGranted===true&&asset.assetId&&asset.sourceSha256,'missing registered source: '+bp.id);
    assert.equal(asset.assetType,'Model','not a model: '+bp.id);
    assert.ok(!registeredIds.has(String(asset.assetId)),'shared ship asset ID: '+bp.id);
    registeredIds.add(String(asset.assetId));
    const file=base+'assets/naval/'+model+'.glb';
    const bytes=fs.readFileSync(file);
    assert.equal(bytes.toString('ascii',0,4),'glTF','not a GLB: '+model);
    assert.equal(bytes.readUInt32LE(8),bytes.length,'GLB byte size mismatch: '+model);
    const sourceHash=crypto.createHash('sha256').update(bytes).digest('hex');
    assert.equal(sourceHash,asset.sourceSha256,'outdated Roblox registration: '+model);
    assert.ok(!originalHashes.has(sourceHash),'duplicate 3D hull binary: '+bp.id);
    originalHashes.add(sourceHash);
    const proof=JSON.parse(fs.readFileSync(file+'.license.json','utf8'));
    assert.equal(proof.sourceSha256,sourceHash,'model proof mismatch: '+model);
    assert.ok(proof.author&&proof.source&&proof.license,'missing model lineage: '+model);
    assert.ok(assetIds.includes('["'+key+'"] = '+asset.assetId),'model registration not in runtime table: '+key);
  }
  for(const continent of ['europe','east_asia','new_world','middle_east','southeast_asia','africa','lost'])
    assert.equal(factions.get(continent),continent==='lost'?6:5,'wrong continent allocation: '+continent);
  assert.match(port,/for _, blueprint in ShipsMod.Blueprints do/);
  assert.match(port,/BLUEPRINT_SHIP_SIZE\[shipId\] or 26 \* s/);
  assert.match(port,/SHIP_MESH\[blueprint.id\] = meshName/);
  assert.doesNotMatch(port,/blueprintMeshSources/,'unverified shared hull must never substitute a unique blueprint');
  const steps=JSON.parse(fs.readFileSync(base+'tools/devloop/studio-scripts/mare-ships.json','utf8'));
  const expected=['europe','east_asia','new_world','middle_east','southeast_asia','africa','lost'];
  assert.equal(steps.filter(x=>x.type==='capture').length,7);
  for(const f of expected){
    assert.ok(steps.some(x=>x.type==='capture'&&x.name==='ships_'+f),'missing continent capture: '+f);
    assert.ok(steps.some(x=>x.code?.includes('SHIP_CONTINENT_RUNTIME_PASS:'+f)),'missing runtime loading: '+f);
  }
  assert.ok(!steps.some(x=>x.code?.includes('atlantic_brigantine="brigantine-custom"')
    || x.code?.includes('zanzibar_jahazi="jahazi-custom"')),'Studio must load two new unique original GLBs');
  assert.ok(steps.some(x=>x.code?.includes('SHIP_36_PREVIEW_CLEAN_EXIT_PASS')));
});


// [마을 주민 전방 검증] 기존 주민 모션 코드와 공식 Studio 실물 얼굴 검사만 확인한다.
test('Mare town villagers keep arm gestures in front and faces aligned with torso without changing NPC jobs',()=>{
  const root='roblox-games/mare-essentia/';
  const pose=fs.readFileSync(root+'src/ReplicatedStorage/Shared/Pose.luau','utf8');
  const port=fs.readFileSync(root+'src/ReplicatedStorage/Shared/PortScene.luau','utf8');
  const script=JSON.parse(fs.readFileSync(root+'tools/devloop/studio-scripts/mare-town.json','utf8'));
  assert.match(pose,/decal\.Face = Enum\.NormalId\.Front/);
  assert.match(pose,/decal\.Texture = "rbxasset:\/\/textures\/face\.png"/);
  assert.match(pose,/faceHead\.CFrame\.LookVector:Dot\(faceTorso\.CFrame\.LookVector\) < -0\.35/);
  assert.match(pose,/model:SetAttribute\("NpcFaceReversed",/);
  assert.match(pose,/motor == m\.leftArm or motor == m\.rightArm/);
  assert.match(pose,/pitch < 0 then cf = CFrame\.Angles\(-pitch, yaw, roll\)/);
  assert.match(pose,/motor == m\.neck and model:GetAttribute\("NpcFaceReversed"\)/);
  assert.match(pose,/joint == m\.neck and model:GetAttribute\("NpcFaceReversed"\)/);
  assert.match(pose,/state ~= "walk" and state ~= "run"/);
  assert.match(port,/local forward = if moving then delta\.Unit else \(w\.lastFacing or w\.base\.LookVector\)/);
  assert.match(port,/if moving then w\.lastFacing = forward end/);
  assert.doesNotMatch(port,/local forward = if moving then delta\.Unit else Vector3\.new\(0, 0, 1\)/);
  const faceAudit=script.find(row=>row.type==='luau'&&row.code?.includes('TOWN_NPC_FACE_REVERSED:'));
  assert.ok(faceAudit,'official Studio must verify visible R15 resident faces');
  assert.match(faceAudit.code,/head\.CFrame\.LookVector:Dot\(torso\.CFrame\.LookVector\)/);
  assert.match(faceAudit.code,/TOWN_NPC_FACE_AUDIT_NO_VISIBLE_RESIDENTS/);
  assert.match(faceAudit.code,/TOWN_NPC_BELOW_GROUND:/);
  assert.match(pose,/if not parent:IsA\("WorldModel"\) or \(outfit and outfit.companion\) then/);
  assert.match(pose,/leftFoot.Position.Y - leftFoot.Size.Y \* 0\.5/);
  assert.match(port,/local lift = Vector3.new\(0, t.base.Position.Y - t.morning.Y, 0\)/);
  assert.match(port,/t.morning \+= lift/);
  assert.match(port,/t.market \+= lift/);
  assert.match(port,/t.evening \+= lift/);
  assert.match(port,/local floorY = w.base.Position.Y/);
  assert.match(port,/local circling = walker.mode == "circle" and walker.cx and walker.cz and walker.r/);
  assert.match(port,/for sample = 0, 7 do/);
  assert.match(port,/walker.cx \+= offset.X/);
  assert.match(port,/walker.model:PivotTo\(CFrame.new\(walker.cx \+ walker.r, safe.Position.Y, walker.cz\)/);
  assert.equal(script.length,46,'existing town gameplay and added ground measurement must remain');
  assert.ok(script.some(row=>row.code?.includes('TOWN_RURAL_GROUND_MISSING')));
});

test('Mare central plaza is reserved as empty walking space and all original civic structures moved outside',()=>{
  const root='roblox-games/mare-essentia/';
  const port=fs.readFileSync(root+'src/ReplicatedStorage/Shared/PortScene.luau','utf8');
  const town=JSON.parse(fs.readFileSync(root+'tools/devloop/studio-scripts/mare-town.json','utf8'));
  assert.match(port,/local CENTRAL_PLAZA_RADIUS = 26/);
  assert.match(port,/parent.Name == "PortScene" and kind ~= "People" and kind ~= "Animals"/);
  assert.match(port,/dx \* dx \+ dz \* dz < CENTRAL_PLAZA_RADIUS \* CENTRAL_PLAZA_RADIUS then return nil end/);
  assert.match(port,/local function house\(parent, pos, w, d, floors, style, rng, wallColor\)[\s\S]{0,250}CENTRAL_PLAZA_RADIUS/);
  assert.match(port,/folder:SetAttribute\("CentralPlazaClearRadius", CENTRAL_PLAZA_RADIUS\)/);
  assert.match(port,/folder:SetAttribute\("CentralPlazaReserved", true\)/);
  for(const kept of ['part(folder, Vector3.new(36, 0.3, 36), CFrame.new(-6, 0.15, 0), roadColor(style), roadMat())','{ name = "교역소", tab = "trade"','{ name = "주점", tab = "board"','local extraStalls =']){
    assert.ok(port.includes(kept),'plaza paving, facility access, and trading must remain intact: '+kept);
  }
  for(const marker of [
    'Vector3.new(-124, 0, 126)', 'local ax, az = -160, -128',
    'importedModel(folder, "Town", "fountain-square", Vector3.new(-108, 0, 122), 7, true)',
    'Vector3.new(-94, 0, -13)', 'Vector3.new(-94, 0, 13)',
    'Vector3.new(-114, 0, -14)', 'Vector3.new(-114, 0, 14)',
    'Vector3.new(-136, 0, 14)', 'Vector3.new(-126, 0, 32)',
    'Vector3.new(-82, 0, -26)', 'Vector3.new(-190, 0, 128)'
  ])assert.ok(port.includes(marker),'civic structure relocation missing: '+marker);
  for(const old of [
    'Vector3.new(-26, 0, 0), 12, true',
    'local ax, az = -8, 11',
    'Vector3.new(-10, 0, 0), 7, true',
    'Vector3.new(-18, 0, -13)', 'Vector3.new(2, 0, 14)',
    'Vector3.new(-6, 0, 13), 4, false',
    'Vector3.new(-8, 0, 9), 4.5, false',
    'CFrame.new(-8, 1, 0)'
  ])assert.ok(!port.includes(old),'old central square obstruction not removed: '+old);
  const check=town.find(row=>row.type==='luau'&&row.code?.includes('TOWN_CENTRAL_PLAZA_STRUCTURE:'));
  assert.ok(check,'official Studio must inspect plaza after building');
  assert.match(check.code,/TOWN_CENTRAL_PLAZA_PART:/);
  assert.match(check.code,/CentralPlazaClearRadius/);
  assert.match(check.code,/plaza_structures=0 inspected=%d/);
  assert.equal(town.length,46,'all existing town screenshots, layout and ground checks must remain');
  assert.ok(town.some(row=>row.code?.includes('TOWN_RURAL_GROUND_MISSING')));
  assert.ok(port.includes('CityPortPlazaAccessConnected')&&port.includes('CentralPlazaRemovedStructures'),'new plaza access and final occupancy cleanup must remain');
});

// [실제 Studio 회복] 초기 지연을 숨기지 않고 전수 검사 성공 때만 구분한다.
test('Mare Studio priority model delay remains a failure unless full recovery is proven',()=>{
  const workflow=fs.readFileSync('.github/workflows/devloop-studio.yml','utf8');
  const gate=workflow.slice(workflow.indexOf('$modelRecovered = ('),workflow.indexOf('$foreignProcessing = {',workflow.indexOf('$modelRecovered = (')));
  for(const evidence of ["$env:CAP_GAME -ceq 'mare-essentia'","[string]$modelAudit.status -ceq 'PASS'","[int]$modelAudit.registered -gt 0","[int]$modelAudit.loaded -eq [int]$modelAudit.registered","$null -ne $modelAudit.failed -and [int]$modelAudit.failed -eq 0","@($modelAudit.errors).Count -eq 0","[string]$report.assetRegistryAudit.status -ceq 'PASS'","$mediaOk -and","[string]$report.assetAudit.features.status -ceq 'PASS'","$report.summary.abortedEarly -eq $false","[int]$report.summary.completedSteps -eq [int]$report.summary.plannedSteps","@($report.errors).Count -eq 0"])assert.ok(gate.includes(evidence),evidence);
  assert.ok(workflow.includes("$modelRecovered -and $_ -cmatch '^\\[MareEssentia\\] 우선 모델 불러오기 제한시간 도달\\s+[1-9][0-9]*\\s*$'"));
  assert.ok(workflow.includes('STUDIO_PRIORITY_MODEL_DELAY_RECOVERED='));
  assert.ok(workflow.includes('-not ($msgs.Count -gt 0 -and $benign.Count -eq $msgs.Count)'));
});
