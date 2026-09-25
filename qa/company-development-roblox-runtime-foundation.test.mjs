import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {probeRobloxOpenCloudEngine,validateRobloxRuntimeFoundationEvidence} from '../tools/company-development-roblox-runtime-foundation.mjs';

const checkpoint=(name,sequence)=>({name,at:1,sequence,userId:1,gameId:'cozy-island',placeId:116850096561713,placeVersion:21,...(name==='MULTIPLAYER_SYNC'?{participantCount:2}:{})});
const names=['SERVER_BOOT','MODULE_GRAPH_READY','WORLD_READY','SPAWN_READY','CHARACTER_READY','GROUND_CONTACT','CAMERA_READY','INPUT_READY','MOVEMENT_CONFIRMED','REMOTE_ROUNDTRIP','SAVE_ROUNDTRIP','MULTIPLAYER_SYNC','CORE_LOOP_READY'];
const good={gameId:'cozy-island',placeId:116850096561713,placeVersion:21,requirements:{saveEnabled:true,multiplayerRequired:true},checkpoints:Object.fromEntries(names.map((x,index)=>[x,checkpoint(x,index+1)]))};


test('recurring Roblox runtime foundation QA does not require full git history',()=>{
 const workflow=fs.readFileSync('.github/workflows/company-development-roblox-post-runtime-qa.yml','utf8');
 assert.match(workflow,/schedule:\s*\n\s*- cron: '\*\/15 \* \* \* \*'/);
 assert.doesNotMatch(workflow,/fetch-depth:\s*0/);
 assert.match(workflow,/Checkout current canonical implementation[\s\S]*?fetch-depth:\s*1/);
});

test('actual Roblox sentinel passes F1 through F8 only for the exact deployed place version',()=>{
 const r=validateRobloxRuntimeFoundationEvidence({sentinel:good,gameId:'cozy-island',placeId:'116850096561713',versionNumber:21});
 assert.equal(r.runtimeFoundationPassed,true);
 assert.equal(r.runtimeAcceptancePassed,true);
 for(const field of ['f1ServerBootPassed','f2WorldFoundationPassed','f3CharacterFoundationPassed','f4PhysicsAndMovementPassed','f5InputCameraUiPassed','f6CoreServicesPassed','f7MultiplayerFoundationPassed','f8GameplaySystemsPassed'])assert.equal(r[field],true,field);
});


test('foundation sentinel blocks causally out-of-order boot world spawn character evidence',()=>{
 const broken=structuredClone(good);
 const worldSequence=broken.checkpoints.WORLD_READY.sequence;
 broken.checkpoints.WORLD_READY.sequence=broken.checkpoints.SPAWN_READY.sequence;
 broken.checkpoints.SPAWN_READY.sequence=worldSequence;
 const r=validateRobloxRuntimeFoundationEvidence({sentinel:broken,gameId:'cozy-island',placeId:'116850096561713',versionNumber:21});
 assert.equal(r.checkpointOrderPassed,false);
 assert.equal(r.runtimeFoundationPassed,false);
 assert.ok(r.blockers.includes('checkpointOrder'));
});

test('cozy island runtime probe uses monotonic sentinel sequence and full ground-contact timeout',()=>{
 const server=fs.readFileSync('roblox-games/cozy-island/server/Game.server.luau','utf8');
 assert.match(server,/data\.sequence=math\.max\(0,math\.floor\(tonumber\(data\.sequence\)or 0\)\)\+1/);
 assert.match(server,/row\.sequence=data\.sequence/);
 assert.match(server,/local deadline=os\.clock\(\)\+3/);
 assert.match(server,/task\.wait\(\.1\)/);
 assert.match(server,/SPAWN_FOUNDATION_MISSING/);
 assert.match(server,/INVALID_ROOT_POSITION/);
 assert.doesNotMatch(server,/task\.delay\(\.6,function\(\)/);
});

test('foundation sentinel blocks floating character evidence without ground contact',()=>{
 const broken=structuredClone(good);delete broken.checkpoints.GROUND_CONTACT;
 const r=validateRobloxRuntimeFoundationEvidence({sentinel:broken,gameId:'cozy-island',placeId:'116850096561713',versionNumber:21});
 assert.equal(r.runtimeFoundationPassed,false);assert.equal(r.runtimeAcceptancePassed,false);assert.ok(r.blockers.includes('checkpoint:GROUND_CONTACT'));
});

test('runtime acceptance stays pending until actual multiplayer synchronization for multiplayer-required game',()=>{
 const broken=structuredClone(good);delete broken.checkpoints.MULTIPLAYER_SYNC;
 const r=validateRobloxRuntimeFoundationEvidence({sentinel:broken,gameId:'cozy-island',placeId:'116850096561713',versionNumber:21});
 assert.equal(r.runtimeFoundationPassed,true);assert.equal(r.runtimeAcceptancePassed,false);assert.equal(r.f7MultiplayerFoundationPassed,false);
});


test('multiplayer foundation only needs one exact two-player shared sync observation',()=>{
 const onePlayer=structuredClone(good);onePlayer.checkpoints.MULTIPLAYER_SYNC.participantCount=1;
 const blocked=validateRobloxRuntimeFoundationEvidence({sentinel:onePlayer,gameId:'cozy-island',placeId:'116850096561713',versionNumber:21});
 assert.equal(blocked.f7MultiplayerFoundationPassed,false);
 assert.equal(blocked.runtimeAcceptancePassed,false);
 const twoPlayers=structuredClone(good);twoPlayers.checkpoints.MULTIPLAYER_SYNC.participantCount=2;
 const passed=validateRobloxRuntimeFoundationEvidence({sentinel:twoPlayers,gameId:'cozy-island',placeId:'116850096561713',versionNumber:21});
 assert.equal(passed.f7MultiplayerFoundationPassed,true);
 assert.equal(passed.runtimeAcceptancePassed,true);
});

test('multiplayer source preflight proves one authoritative shared snapshot broadcast contract',()=>{
 const tool=fs.readFileSync('tools/company-development-roblox-headless-fast-mvp.mjs','utf8');
 assert.match(tool,/FireAllClients/);
 assert.match(tool,/MULTIPLAYER_SYNC/);
 assert.match(tool,/ParticipantCount/);
 assert.match(tool,/OnClientEvent:Connect/);
});

test('F9 final review uses shallow checkout instead of full git history',()=>{
 const workflow=fs.readFileSync('.github/workflows/company-development-roblox-final-review-revalidation.yml','utf8');
 assert.doesNotMatch(workflow,/fetch-depth:\s*0/);
 assert.match(workflow,/Checkout current canonical implementation[\s\S]*?fetch-depth:\s*1/);
 assert.match(workflow,/Checkout canonical runtime state[\s\S]*?fetch-depth:\s*1/);
});

test('central policy matches shared two-client one-sync internal and public release proof',()=>{
 const roadmap=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
 const stack=roadmap.developmentLifecycleMachine.nativeGameFoundationValidationStack;
 const f7=stack.layers.find(layer=>layer.id==='F7');
 assert.equal(f7.releaseGateMode,'TWO_CLIENT_ONE_SYNC');
 assert.deepEqual(f7.checks,['MINIMUM_TWO_PARTICIPANTS_SAME_SERVER','ONE_AUTHORITATIVE_SHARED_STATE_BROADCAST','CLIENT_MULTIPLAYER_SYNC_HANDLER_CONTRACT']);
 const proof=stack.robloxContract.multiplayerReleaseProof;
 assert.equal(proof.minimumParticipants,2);
 assert.equal(proof.sameServerRequired,true);
 assert.equal(proof.actualRuntimeCheckpoint,'MULTIPLAYER_SYNC');
 assert.equal(proof.singleSyncObservationSufficient,true);
 assert.equal(proof.longCombatOrDungeonRunRequired,false);
 assert.deepEqual(proof.appliesTo,['INTERNAL_RELEASE','PUBLIC_RELEASE']);
 assert.equal(proof.sameProofReusedForInternalAndPublic,true);
 assert.equal(proof.duplicatePublicMultiplayerCheckRequired,false);
 assert.equal(proof.internalAndPublicVersionMustMatch,true);
 assert.equal(proof.republishForPublicPromotionForbidden,true);
 assert.equal(stack.releaseGate.f9Checkout.sameCheckoutContractForInternalAndPublic,true);
});

test('runtime acceptance stays pending until actual gameplay core-loop action occurs',()=>{
 const broken=structuredClone(good);delete broken.checkpoints.CORE_LOOP_READY;
 const r=validateRobloxRuntimeFoundationEvidence({sentinel:broken,gameId:'cozy-island',placeId:'116850096561713',versionNumber:21});
 assert.equal(r.runtimeFoundationPassed,true);assert.equal(r.runtimeAcceptancePassed,false);assert.equal(r.f8GameplaySystemsPassed,false);
});

test('foundation sentinel blocks stale evidence from another published version',()=>{
 const r=validateRobloxRuntimeFoundationEvidence({sentinel:good,gameId:'cozy-island',placeId:'116850096561713',versionNumber:22});
 assert.equal(r.runtimeFoundationPassed,false);assert.equal(r.runtimeAcceptancePassed,false);assert.ok(r.blockers.includes('exactVersion'));
});


test('foundation sentinel rejects checkpoints carried over from an older published place version',()=>{
 const stale=structuredClone(good);
 stale.placeVersion=22;
 for(const row of Object.values(stale.checkpoints))row.placeVersion=21;
 const r=validateRobloxRuntimeFoundationEvidence({sentinel:stale,gameId:'cozy-island',placeId:'116850096561713',versionNumber:22});
 assert.equal(r.runtimeFoundationPassed,false);
 assert.equal(r.runtimeAcceptancePassed,false);
 assert.ok(r.blockers.includes('checkpoint:SERVER_BOOT'));
});


test('Open Cloud engine probe binds exact place version without granting runtime acceptance',async()=>{
 const calls=[];
 const responses=[
  {ok:true,status:200,body:{path:'universes/1/places/2/versions/20/luau-execution-sessions/s/tasks/t',state:'PROCESSING'}},
  {ok:true,status:200,body:{state:'COMPLETE'}},
  {ok:true,status:200,body:{luauExecutionSessionTaskLogs:[{structuredMessages:[
   {message:'JAEWOON_OPEN_CLOUD_ENGINE_PLACE=2'},
   {message:'JAEWOON_OPEN_CLOUD_ENGINE_VERSION=20'},
   {message:'JAEWOON_OPEN_CLOUD_ENGINE_PLAYERS=0'},
   {message:'JAEWOON_OPEN_CLOUD_ENGINE_FOUNDATION_SERVER_BOOT=false'},
  ]}]}}
 ];
 const fetchImpl=async(url,init={})=>{
  calls.push({url,init});
  const row=responses.shift();
  return {ok:row.ok,status:row.status,text:async()=>JSON.stringify(row.body)};
 };
 const r=await probeRobloxOpenCloudEngine({universeId:'1',placeId:'2',versionNumber:20,apiKey:'k',fetchImpl,pollIntervalMs:0,maxPolls:2});
 assert.equal(r.engineExecuted,true);
 assert.equal(r.exactPlace,true);
 assert.equal(r.exactVersion,true);
 assert.equal(r.playerCount,0);
 assert.equal(r.serverBootObserved,false);
 assert.match(calls[0].url,/versions\/20\/luau-execution-session-tasks$/);
 const body=JSON.parse(calls[0].init.body);
 assert.match(body.script,/JAEWOON_OPEN_CLOUD_ENGINE_VERSION/);
 assert.doesNotMatch(body.script,/MULTIPLAYER_SYNC.*true|runtimeAcceptancePassed|robloxRuntimePassed/);
});

test('Open Cloud engine probe waits for the real place server boot without fabricating foundation evidence',async()=>{
 const calls=[];
 const responses=[
  {ok:true,status:200,body:{path:'universes/1/places/2/versions/20/luau-execution-sessions/s/tasks/t',state:'PROCESSING'}},
  {ok:true,status:200,body:{state:'COMPLETE'}},
  {ok:true,status:200,body:{luauExecutionSessionTaskLogs:[{structuredMessages:[
   {message:'JAEWOON_OPEN_CLOUD_ENGINE_PLACE=2'},
   {message:'JAEWOON_OPEN_CLOUD_ENGINE_VERSION=20'},
   {message:'JAEWOON_OPEN_CLOUD_ENGINE_PLAYERS=0'},
   {message:'JAEWOON_OPEN_CLOUD_ENGINE_FOUNDATION_SERVER_BOOT=true'},
  ]}]}}
 ];
 const fetchImpl=async(url,init={})=>{calls.push({url,init});const row=responses.shift();return {ok:row.ok,status:row.status,text:async()=>JSON.stringify(row.body)};};
 const r=await probeRobloxOpenCloudEngine({universeId:'1',placeId:'2',versionNumber:20,apiKey:'k',fetchImpl,pollIntervalMs:0,maxPolls:2});
 assert.equal(r.serverBootObserved,true);
 const body=JSON.parse(calls[0].init.body);
 assert.match(body.script,/for _=1,16 do if foundationServerBoot then break end; task\.wait\(0\.5\)/);
 assert.match(body.script,/Foundation_SERVER_BOOT/);
 assert.doesNotMatch(body.script,/SetAttribute\("Foundation_SERVER_BOOT",true\)/);
 assert.doesNotMatch(body.script,/MULTIPLAYER_SYNC.*true|runtimeAcceptancePassed|robloxRuntimePassed/);
});

test('Open Cloud engine probe matches the exact selected Studio material atoms in the deployed target version',async()=>{
 const calls=[];
 const responses=[
  {ok:true,status:200,body:{path:'universes/1/places/2/versions/20/luau-execution-sessions/s/tasks/t',state:'PROCESSING'}},
  {ok:true,status:200,body:{state:'COMPLETE'}},
  {ok:true,status:200,body:{luauExecutionSessionTaskLogs:[{structuredMessages:[
   {message:'JAEWOON_OPEN_CLOUD_ENGINE_PLACE=2'},
   {message:'JAEWOON_OPEN_CLOUD_ENGINE_VERSION=20'},
   {message:'JAEWOON_OPEN_CLOUD_ENGINE_PLAYERS=0'},
   {message:'JAEWOON_OPEN_CLOUD_ENGINE_FOUNDATION_SERVER_BOOT=true'},
   {message:'JAEWOON_OPEN_CLOUD_ENGINE_STUDIO_ASSET_APPLIED=true'},
   {message:'JAEWOON_OPEN_CLOUD_ENGINE_STUDIO_ASSET_BINDING_VERSION=1'},
   {message:'JAEWOON_OPEN_CLOUD_ENGINE_STUDIO_ASSET_ATOMS=BAR_HEALTH,BUTTON_PRIMARY,FRAME_PANEL'},
  ]}]}}
 ];
 const fetchImpl=async(url,init={})=>{
  calls.push({url,init});
  const row=responses.shift();
  return {ok:row.ok,status:row.status,text:async()=>JSON.stringify(row.body)};
 };
 const expected={applied:true,families:{UI:['FRAME_PANEL','BUTTON_PRIMARY','BAR_HEALTH']}};
 const r=await probeRobloxOpenCloudEngine({
  universeId:'1',placeId:'2',versionNumber:20,apiKey:'k',fetchImpl,pollIntervalMs:0,maxPolls:2,
  expectedStudioAssetBinding:expected,
 });
 assert.equal(r.engineExecuted,true);
 assert.equal(r.studioAssetBindingRequired,true);
 assert.equal(r.studioAssetApplied,true);
 assert.equal(r.studioAssetBindingVersion,1);
 assert.deepEqual(r.expectedStudioAssetAtoms,['BAR_HEALTH','BUTTON_PRIMARY','FRAME_PANEL']);
 assert.deepEqual(r.observedStudioAssetAtoms,['BAR_HEALTH','BUTTON_PRIMARY','FRAME_PANEL']);
 assert.equal(r.studioAssetSelectionMatched,true);
 const body=JSON.parse(calls[0].init.body);
 assert.match(body.script,/STUDIO_ASSET_APPLIED/);
 assert.match(body.script,/StudioAssets/);
});

test('Open Cloud engine probe rejects a deployed Studio material selection mismatch',async()=>{
 const responses=[
  {ok:true,status:200,body:{path:'universes/1/places/2/versions/20/luau-execution-sessions/s/tasks/t',state:'PROCESSING'}},
  {ok:true,status:200,body:{state:'COMPLETE'}},
  {ok:true,status:200,body:{luauExecutionSessionTaskLogs:[{structuredMessages:[
   {message:'JAEWOON_OPEN_CLOUD_ENGINE_PLACE=2'},
   {message:'JAEWOON_OPEN_CLOUD_ENGINE_VERSION=20'},
   {message:'JAEWOON_OPEN_CLOUD_ENGINE_STUDIO_ASSET_APPLIED=true'},
   {message:'JAEWOON_OPEN_CLOUD_ENGINE_STUDIO_ASSET_BINDING_VERSION=1'},
   {message:'JAEWOON_OPEN_CLOUD_ENGINE_STUDIO_ASSET_ATOMS=FRAME_PANEL'},
  ]}]}}
 ];
 const fetchImpl=async()=>{const row=responses.shift();return {ok:row.ok,status:row.status,text:async()=>JSON.stringify(row.body)};};
 const r=await probeRobloxOpenCloudEngine({
  universeId:'1',placeId:'2',versionNumber:20,apiKey:'k',fetchImpl,pollIntervalMs:0,maxPolls:2,
  expectedStudioAssetBinding:{applied:true,families:{UI:['FRAME_PANEL','BUTTON_PRIMARY']}},
 });
 assert.equal(r.studioAssetSelectionMatched,false);
});

test('post-runtime QA requires target-engine Studio material selection match before binding PASS',()=>{
 const workflow=fs.readFileSync('.github/workflows/company-development-roblox-post-runtime-qa.yml','utf8');
 assert.match(workflow,/expectedStudioAssetBinding:item\.robloxStudioAssetBindingApplied===true\?item\.robloxStudioAssetBinding:null/);
 assert.match(workflow,/engineProbe\?\.studioAssetSelectionMatched===true/);
 assert.match(workflow,/targetEngineSelectionMatched:engineProbe\?\.studioAssetSelectionMatched===true/);
 assert.match(workflow,/expectedStudioAssetAtoms:engineProbe\?\.expectedStudioAssetAtoms\|\|\[\]/);
 assert.match(workflow,/observedStudioAssetAtoms:engineProbe\?\.observedStudioAssetAtoms\|\|\[\]/);
});

test('Open Cloud engine probe reports missing scope without fabricating evidence',async()=>{
 const fetchImpl=async()=>({ok:false,status:403,text:async()=>JSON.stringify({code:'PERMISSION_DENIED',message:'The required scope <universe.place.luau-execution-session:1:write> is missing.'})});
 const r=await probeRobloxOpenCloudEngine({universeId:'1',placeId:'2',versionNumber:20,apiKey:'k',fetchImpl,pollIntervalMs:0,maxPolls:1});
 assert.equal(r.available,false);
 assert.equal(r.permissionDenied,true);
 assert.equal(r.engineExecuted,false);
 assert.equal(r.exactVersion,false);
 assert.equal(r.failureStage,'CREATE');
 assert.equal(r.requiredScope,'universe.place.luau-execution-session:1:write');
 assert.equal(r.errorCode,'PERMISSION_DENIED');
});

test('F9 final review requires exact Studio asset runtime proof when a binding was applied',()=>{
 const workflow=fs.readFileSync('.github/workflows/company-development-roblox-final-review-revalidation.yml','utf8');
 assert.match(workflow,/const studioAssetBindingRequired=item\.robloxStudioAssetBindingApplied===true/);
 assert.match(workflow,/const studioAssetRuntimeBindingExact=!studioAssetBindingRequired/);
 assert.match(workflow,/ROBLOX_STUDIO_ASSET_RUNTIME_BINDING_PASS/);
 assert.match(workflow,/post\.studioAssetRuntimeBindingEvidence\?\.sourceRevision===sourceRevision/);
 assert.match(workflow,/post\.studioAssetRuntimeBindingEvidence\?\.artifactIdentity===artifactIdentity/);
 assert.match(workflow,/candidateVersionNumber\)===Number\(candidate\.versionNumber\)/);
 assert.match(workflow,/&&studioAssetRuntimeBindingExact===true/);
});

test('F9 returns exact Roblox runtime and Studio asset proof to waiting Vibe tasks',()=>{
 const workflow=fs.readFileSync('.github/workflows/company-development-roblox-final-review-revalidation.yml','utf8');
 assert.match(workflow,/Fan verified F9 runtime proof into waiting Vibe Roblox tasks/);
 assert.match(workflow,/candidate-awaiting-roblox-runtime-qa/);
 assert.match(workflow,/roblox-runtime-await-game:/);
 assert.match(workflow,/robloxRuntimePassed!==true/);
 assert.match(workflow,/studioRequired&&item\.robloxStudioAssetRuntimeBindingPassed!==true/);
 assert.match(workflow,/ROBLOX_STUDIO_ASSET_RUNTIME_BINDING_PASS/);
 assert.match(workflow,/verification-conclusion:success/);
 assert.match(workflow,/target-engine-qa-ref:roblox-f9-/);
 assert.match(workflow,/while IFS=\$'\\t' read -r game_id studio_required source_revision version_number/);
 assert.match(workflow,/vibe2-queue-control\.mjs" pass/);
 assert.match(workflow,/settled_count=0/);
 assert.match(workflow,/attempt_settled=\$\(\(attempt_settled\+1\)\)/);
 assert.match(workflow,/ROBLOX_F9_VIBE_SETTLED_COUNT=\$settled_count/);
 assert.match(workflow,/if \[ "\$settled_count" -gt 0 \]; then/);
 assert.match(workflow,/event_type:"vibe2-fanin-refill"/);
 assert.match(workflow,/reason:"roblox-f9-verified"/);
 assert.match(workflow,/ROBLOX_F9_VIBE_REFILL_DISPATCHED=\$settled_count/);
});

test('runtime QA preserves exact permission evidence instead of misclassifying stale sentinel as executor failure',()=>{
 const workflow=fs.readFileSync('.github/workflows/company-development-roblox-post-runtime-qa.yml','utf8');
 assert.match(workflow,/roblox-open-cloud-engine-probes\.json/);
 assert.match(workflow,/ROBLOX_OPEN_CLOUD_LUAU_EXECUTION_PERMISSION_DENIED/);
 assert.match(workflow,/roblox-open-cloud-luau-execution-scope-missing/);
 assert.match(workflow,/universe\.place\.luau-execution-session:write/);
 assert.match(workflow,/samePermissionBlock/);
 assert.match(workflow,/item\.robloxRuntimeRetryCount=0/);
 assert.match(workflow,/priorRetryCount===0/);
 const permissionIndex=workflow.indexOf("engineProbe?.permissionDenied===true");
 const retryResetIndex=workflow.indexOf('item.robloxRuntimeRetryCount=0');
 const sentinelIndex=workflow.indexOf('let sentinel;');
 assert.ok(permissionIndex>0&&retryResetIndex>permissionIndex&&sentinelIndex>retryResetIndex,'permission blocker must reset stale retry count before sentinel read');
});


test('multiplayer evidence stays release-blocking but does not block continued development',()=>{
 const broken=structuredClone(good);delete broken.checkpoints.MULTIPLAYER_SYNC;
 const r=validateRobloxRuntimeFoundationEvidence({sentinel:broken,gameId:'cozy-island',placeId:'116850096561713',versionNumber:21});
 assert.equal(r.runtimeFoundationPassed,true);
 assert.equal(r.developmentContinuationPassed,true);
 assert.equal(r.runtimeAcceptancePassed,false);
 assert.equal(r.multiplayerPromotionPending,true);
 assert.equal(r.f7MultiplayerFoundationPassed,false);
});

test('post-runtime QA keeps exact Studio MCP-passed candidates eligible after Studio clears the runtime failure stage',()=>{
 const workflow=fs.readFileSync('.github/workflows/company-development-roblox-post-runtime-qa.yml','utf8');
 assert.match(workflow,/const exactStudioPlayPendingRuntime=/);
 assert.match(workflow,/studioPlay\.pass===true/);
 assert.match(workflow,/studioPlay\.actualPlay===true/);
 assert.match(workflow,/studioPlay\.officialStudioMcp===true/);
 assert.match(workflow,/studioPlay\.localPlaceFile===true/);
 assert.match(workflow,/studioPlay\.sourceRevision===sourceRevision/);
 assert.match(workflow,/studioPlay\.artifactIdentity===artifactIdentity/);
 assert.match(workflow,/Number\(studioPlay\.versionNumber\)===Number\(candidate\.versionNumber\)/);
 assert.match(workflow,/item\.robloxRuntimeFoundationPassed!==true/);
 assert.match(workflow,/item\.robloxRuntimePassed!==true/);
 assert.match(workflow,/&&\(explicitRuntimeStage\|\|exactStudioPlayPendingRuntime\)/);
});

test('post-runtime QA preserves independent and regression progress while shared two-client sync is pending',()=>{
 const workflow=fs.readFileSync('.github/workflows/company-development-roblox-post-runtime-qa.yml','utf8');
 assert.match(workflow,/multiplayerOnlyPending=result\.developmentContinuationPassed===true&&result\.multiplayerPromotionPending===true/);
 assert.match(workflow,/robloxIndependentQaPassed=true/);
 assert.match(workflow,/robloxRegressionPassed=true/);
 assert.match(workflow,/robloxParallelMultiplayerValidationPending=true/);
 assert.match(workflow,/item\.currentStep='TARGET_PLATFORM_RUNTIME_ACCEPTANCE'/);
 assert.match(workflow,/item\.robloxFailureSignature='ROBLOX_TWO_CLIENT_ONE_SYNC_PENDING'/);
 assert.match(workflow,/robloxPromotionBlockers=\['roblox-two-client-one-sync-pending'\]/);
 assert.match(workflow,/routingBlockers=\['roblox-two-client-one-sync-pending'\]/);
 const pendingBlock=workflow.match(/if\(multiplayerOnlyPending\)\{[\s\S]*?console\.log\('ROBLOX_TWO_CLIENT_ONE_SYNC_PENDING='\+item\.gameId\);\s*pending\+\+;/)?.[0]||'';
 assert.ok(pendingBlock,'two-client pending branch must exist');
 assert.doesNotMatch(pendingBlock,/f9Ids\.push\(item\.gameId\)/);
 assert.doesNotMatch(workflow,/ROBLOX_MULTIPLAYER_SIMPLIFIED_INTERNAL_RELEASE_REVIEW/);
});


test('two-client sync pending stays before F9 and cannot promote either internal or public release',()=>{
 const runtime=fs.readFileSync('.github/workflows/company-development-roblox-post-runtime-qa.yml','utf8');
 const finalReview=fs.readFileSync('.github/workflows/company-development-roblox-final-review-revalidation.yml','utf8');
 assert.match(runtime,/ROBLOX_TWO_CLIENT_ONE_SYNC_PENDING/);
 assert.match(runtime,/item\.currentStep='TARGET_PLATFORM_RUNTIME_ACCEPTANCE'/);
 assert.match(runtime,/roblox-two-client-one-sync-pending/);
 assert.doesNotMatch(runtime,/ROBLOX_MULTIPLAYER_SIMPLIFIED_INTERNAL_RELEASE_REVIEW/);
 assert.match(finalReview,/const sharedReleaseRuntimeAcceptance=/);
 assert.match(finalReview,/runtime\.f7MultiplayerFoundationPassed===true/);
 assert.match(finalReview,/const internalRuntimeAcceptance=sharedReleaseRuntimeAcceptance/);
 assert.match(finalReview,/const publicRuntimeAcceptance=false;/);
 assert.doesNotMatch(finalReview,/SIMPLIFIED_INTERNAL_MULTIPLAYER_PASS/);
 assert.match(finalReview,/item\.robloxPublicReleaseReady=false/);
 assert.match(finalReview,/roblox-perpetual-buildup-public-hard-gate-pending/);
 assert.match(finalReview,/item\.robloxPublicReleaseVersionNumber=Number\(candidate\.versionNumber\)/);
});

test('exact unchanged runtime candidate reuses verified server boot evidence',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-development-roblox-post-runtime-qa.yml','utf8');
  assert.match(workflow,/ROBLOX_OPEN_CLOUD_ENGINE_PROBE_SKIPPED_EXACT_EVIDENCE_REUSE/);
  assert.match(workflow,/ROBLOX_RUNTIME_EVIDENCE_REUSED=/);
  assert.match(workflow,/reusedServerBootEvidence:true/);
  assert.match(workflow,/EXACT_SOURCE_ARTIFACT_PLACE_VERSION_ALREADY_VERIFIED/);
  assert.match(workflow,/priorRuntime\.sourceRevision===sourceRevision/);
  assert.match(workflow,/priorRuntime\.artifactIdentity===artifactIdentity/);
  assert.match(workflow,/Number\(priorRuntime\.candidateVersionNumber\)===Number\(candidate\.versionNumber\)/);
});

test('central policy requires Roblox checkout through final promotion to stay game-parallel',()=>{
  const roadmap=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
  const parallel=roadmap.developmentSpeedExecution.robloxEndToEndParallelExecution;
  assert.equal(parallel.gameLevelExecution,'PARALLEL_BY_DEFAULT');
  assert.equal(parallel.checkoutParallel,true);
  assert.equal(parallel.buildParallel,true);
  assert.equal(parallel.f0Parallel,true);
  assert.equal(parallel.runtimeFoundationQaParallel,true);
  assert.equal(parallel.finalReviewParallel,true);
  assert.equal(parallel.promotionParallel,true);
  assert.equal(parallel.internalGameConcurrencyCapsForbidden,true);
  assert.equal(roadmap.developmentSpeedExecution.runtimeRunnerCapacityMaySerializeRuntimeQa,false);
  assert.equal(parallel.runtimeQaMayQueueOnlyWhenExternalProviderCapacityIsExhausted,true);
  assert.equal(parallel.serverBootEvidenceReuse.reuseOnlyWhenExactCandidateUnchanged,true);
  assert.deepEqual(parallel.serverBootEvidenceReuse.requiredExactBindings,['SOURCE_REVISION','BUILD_ARTIFACT_IDENTITY','PLACE_ID','CANDIDATE_VERSION_NUMBER']);
});


test('shared FAST_MVP runtime QA keeps only newest shared candidate current and skips superseded versions',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-development-roblox-post-runtime-qa.yml','utf8');
  assert.match(workflow,/const sharedCurrent=\(q\.items\|\|\[\]\)/);
  assert.match(workflow,/robloxRuntimeCandidateEvidence\?\.versionNumber\|\|0\)-Number\(a\.robloxRuntimeCandidateEvidence\?\.versionNumber/);
  assert.match(workflow,/const actualCurrent=sharedCurrent\[0\]\|\|null/);
  assert.match(workflow,/item\.robloxSharedTargetCurrent=false/);
  assert.match(workflow,/item\.robloxFastMvpSupersededBy=actualCurrent\?\.gameId\|\|null/);
  assert.match(workflow,/roblox-shared-runtime-target-capacity-republish-required/);
  assert.match(workflow,/if\(isSharedCandidate\(candidate\)&&item\.robloxSharedTargetCurrent===false\)return false/);
  assert.match(workflow,/ROBLOX_SHARED_TARGET_SUPERSEDED=/);
});
