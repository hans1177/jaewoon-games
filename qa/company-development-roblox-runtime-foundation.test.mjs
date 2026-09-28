import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fetchRobloxRuntimeFoundationEvidence,probeRobloxOpenCloudEngine,validateRobloxRuntimeFoundationEvidence} from '../tools/company-development-roblox-runtime-foundation.mjs';

const checkpoint=(name,sequence)=>({name,at:1,sequence,userId:1,gameId:'cozy-island',placeId:116850096561713,placeVersion:21,...(name==='MULTIPLAYER_SYNC'?{participantCount:2}:{})});
const names=['SERVER_BOOT','MODULE_GRAPH_READY','WORLD_READY','SPAWN_READY','CHARACTER_READY','GROUND_CONTACT','CAMERA_READY','INPUT_READY','MOVEMENT_CONFIRMED','REMOTE_ROUNDTRIP','SAVE_ROUNDTRIP','MULTIPLAYER_SYNC','CORE_LOOP_READY'];
const good={gameId:'cozy-island',placeId:116850096561713,placeVersion:21,requirements:{saveEnabled:true,multiplayerRequired:true},checkpoints:Object.fromEntries(names.map((x,index)=>[x,checkpoint(x,index+1)]))};


test('Roblox runtime foundation push wake ignores QA-only and descriptive architecture edits',()=>{
 const workflow=fs.readFileSync('.github/workflows/company-development-roblox-post-runtime-qa.yml','utf8');
 const pushStart=workflow.indexOf('  push:');
 const pushEnd=workflow.indexOf('  workflow_dispatch:',pushStart);
 const pushBlock=workflow.slice(pushStart,pushEnd);
 assert.ok(pushStart>=0&&pushEnd>pushStart);
 assert.doesNotMatch(pushBlock,/qa\/company-development-roblox-runtime-foundation\.test\.mjs/);
 assert.doesNotMatch(pushBlock,/qa\/company-development-roblox-studio-local-play\.test\.mjs/);
 assert.doesNotMatch(pushBlock,/company-learning\/company-architecture-map\.json/);
 assert.match(pushBlock,/tools\/company-development-roblox-runtime-foundation\.mjs/);
 assert.match(pushBlock,/tools\/company-development-roblox-studio-local-play\.mjs/);
 assert.match(pushBlock,/company-learning\/platform-release-roadmap\.json/);
 assert.match(pushBlock,/roblox-games\/\.company-runtime-trigger/);
});

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


test('Open Cloud runtime reads retry transient DNS failures without weakening API errors',async()=>{
 const dnsError=()=>Object.assign(new TypeError('fetch failed'),{cause:{code:'EAI_AGAIN'}});
 let datastoreCalls=0;
 const sentinel=await fetchRobloxRuntimeFoundationEvidence({
  universeId:'1',apiKey:'k',networkRetryAttempts:3,networkRetryDelayMs:0,
  fetchImpl:async()=>{
   datastoreCalls++;
   if(datastoreCalls===1)throw dnsError();
   return {ok:true,status:200,text:async()=>JSON.stringify({value:{gameId:'g',placeId:'2',placeVersion:3,checkpoints:{}}})};
  },
 });
 assert.equal(datastoreCalls,2);
 assert.equal(sentinel.gameId,'g');

 const responses=[
  {ok:true,status:200,body:{path:'universes/1/places/2/versions/20/luau-execution-sessions/s/tasks/t',state:'PROCESSING'}},
  {ok:true,status:200,body:{state:'COMPLETE'}},
  {ok:true,status:200,body:{luauExecutionSessionTaskLogs:[{structuredMessages:[
   {message:'JAEWOON_OPEN_CLOUD_ENGINE_PLACE=2'},
   {message:'JAEWOON_OPEN_CLOUD_ENGINE_VERSION=20'},
  ]}]}}
 ];
 let engineCalls=0;
 const result=await probeRobloxOpenCloudEngine({
  universeId:'1',placeId:'2',versionNumber:20,apiKey:'k',pollIntervalMs:0,maxPolls:2,
  networkRetryAttempts:3,networkRetryDelayMs:0,
  fetchImpl:async()=>{
   engineCalls++;
   if(engineCalls===1)throw dnsError();
   const row=responses.shift();
   return {ok:row.ok,status:row.status,text:async()=>JSON.stringify(row.body)};
  },
 });
 assert.equal(engineCalls,4);
 assert.equal(result.engineExecuted,true);
 assert.equal(result.exactPlace,true);
 assert.equal(result.exactVersion,true);
});

test('Open Cloud engine probe retries transient HTTP throttling without weakening persistent API failures',async()=>{
 let calls=0;
 const responses=[
  {ok:false,status:429,body:{errors:[{code:0,message:'rate limited'}]}},
  {ok:true,status:200,body:{path:'universes/1/places/2/versions/20/luau-execution-sessions/s/tasks/t',state:'PROCESSING'}},
  {ok:true,status:200,body:{state:'COMPLETE'}},
  {ok:true,status:200,body:{luauExecutionSessionTaskLogs:[{structuredMessages:[
   {message:'JAEWOON_OPEN_CLOUD_ENGINE_PLACE=2'},
   {message:'JAEWOON_OPEN_CLOUD_ENGINE_VERSION=20'},
  ]}]}}
 ];
 const result=await probeRobloxOpenCloudEngine({
  universeId:'1',placeId:'2',versionNumber:20,apiKey:'k',pollIntervalMs:0,maxPolls:2,
  networkRetryAttempts:4,networkRetryDelayMs:0,
  fetchImpl:async()=>{
   calls++;
   const row=responses.shift();
   return {ok:row.ok,status:row.status,text:async()=>JSON.stringify(row.body)};
  },
 });
 assert.equal(calls,4);
 assert.equal(result.engineExecuted,true);
 assert.equal(result.exactVersion,true);

 let persistentCalls=0;
 await assert.rejects(()=>probeRobloxOpenCloudEngine({
  universeId:'1',placeId:'2',versionNumber:20,apiKey:'k',pollIntervalMs:0,maxPolls:1,
  networkRetryAttempts:3,networkRetryDelayMs:0,
  fetchImpl:async()=>{
   persistentCalls++;
   return {ok:false,status:429,text:async()=>JSON.stringify({errors:[{code:0,message:'rate limited'}]})};
  },
 }),/ROBLOX_OPEN_CLOUD_ENGINE_CREATE_HTTP_429/);
 assert.equal(persistentCalls,3);
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

test('Open Cloud engine probe records headless Luau execution without pretending it is a live simulation',async()=>{
 const calls=[];
 const responses=[
  {ok:true,status:200,body:{path:'universes/1/places/2/versions/20/luau-execution-sessions/s/tasks/t',state:'PROCESSING'}},
  {ok:true,status:200,body:{state:'COMPLETE'}},
  {ok:true,status:200,body:{luauExecutionSessionTaskLogs:[{structuredMessages:[
   {message:'JAEWOON_OPEN_CLOUD_ENGINE_PLACE=2'},
   {message:'JAEWOON_OPEN_CLOUD_ENGINE_VERSION=20'},
   {message:'JAEWOON_OPEN_CLOUD_ENGINE_PLAYERS=0'},
   {message:'JAEWOON_OPEN_CLOUD_ENGINE_SIMULATION_RUNNING=false'},
   {message:'JAEWOON_OPEN_CLOUD_ENGINE_FOUNDATION_SERVER_BOOT=false'},
  ]}]}}
 ];
 const fetchImpl=async(url,init={})=>{calls.push({url,init});const row=responses.shift();return {ok:row.ok,status:row.status,text:async()=>JSON.stringify(row.body)};};
 const r=await probeRobloxOpenCloudEngine({universeId:'1',placeId:'2',versionNumber:20,apiKey:'k',fetchImpl,pollIntervalMs:0,maxPolls:2});
 assert.equal(r.simulationRunning,false);
 assert.equal(r.serverBootObserved,false);
 const body=JSON.parse(calls[0].init.body);
 assert.match(body.script,/RunService:IsRunning\(\)/);
 assert.match(body.script,/JAEWOON_OPEN_CLOUD_ENGINE_SIMULATION_RUNNING/);
 assert.match(body.script,/Foundation_SERVER_BOOT/);
 assert.doesNotMatch(body.script,/task\.wait\(0\.5\)/);
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

test('Open Cloud engine probe matches the declared current Studio asset binding version',async()=>{
 const responses=[
  {ok:true,status:200,body:{path:'universes/1/places/2/versions/20/luau-execution-sessions/s/tasks/t',state:'PROCESSING'}},
  {ok:true,status:200,body:{state:'COMPLETE'}},
  {ok:true,status:200,body:{luauExecutionSessionTaskLogs:[{structuredMessages:[
   {message:'JAEWOON_OPEN_CLOUD_ENGINE_PLACE=2'},
   {message:'JAEWOON_OPEN_CLOUD_ENGINE_VERSION=20'},
   {message:'JAEWOON_OPEN_CLOUD_ENGINE_STUDIO_ASSET_APPLIED=true'},
   {message:'JAEWOON_OPEN_CLOUD_ENGINE_STUDIO_ASSET_BINDING_VERSION=2'},
   {message:'JAEWOON_OPEN_CLOUD_ENGINE_STUDIO_ASSET_ATOMS=BAR_HEALTH,BUTTON_PRIMARY,FRAME_PANEL'},
  ]}]}}
 ];
 const fetchImpl=async()=>{const row=responses.shift();return {ok:row.ok,status:row.status,text:async()=>JSON.stringify(row.body)};};
 const r=await probeRobloxOpenCloudEngine({
  universeId:'1',placeId:'2',versionNumber:20,apiKey:'k',fetchImpl,pollIntervalMs:0,maxPolls:2,
  expectedStudioAssetBinding:{applied:true,bindingVersion:2,families:{UI:['FRAME_PANEL','BUTTON_PRIMARY','BAR_HEALTH']}},
 });
 assert.equal(r.expectedStudioAssetBindingVersion,2);
 assert.equal(r.studioAssetBindingVersion,2);
 assert.equal(r.studioAssetSelectionMatched,true);
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
 assert.match(workflow,/if\(exactStudioPlay\)item\.robloxNativeFailureClass=null/);
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
 assert.match(workflow,/node --input-type=module - "runtime\/development-queue\.json" "\$REQUESTED_GAME_ID"/);
 assert.doesNotMatch(workflow,/node --input-type=module - "\.\.\/runtime\/development-queue\.json"/);
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

test('post-runtime Open Cloud engine probes use bounded external API concurrency and stronger throttling retry',()=>{
 const workflow=fs.readFileSync('.github/workflows/company-development-roblox-post-runtime-qa.yml','utf8');
 const foundation=fs.readFileSync('tools/company-development-roblox-runtime-foundation.mjs','utf8');
 assert.match(workflow,/const throttlePressure=candidates\.some/);
 assert.match(workflow,/Number\(evidence\.httpStatus\|\|0\)===429/);
 assert.match(workflow,/const probeConcurrency=Math\.max\(1,Math\.min\(requested\?1:\(throttlePressure\?1:2\),candidates\.length\|\|1\)\)/);
 assert.match(workflow,/ROBLOX_OPEN_CLOUD_THROTTLE_PRESSURE=/);
 assert.match(workflow,/networkRetryAttempts:6,networkRetryDelayMs:1000/);
 assert.match(foundation,/const exponentialDelay=Math\.min\(30000,baseDelayMs\*Math\.max\(1,2\*\*Math\.max\(0,attempt-1\)\)\)/);
 assert.match(workflow,/ROBLOX_OPEN_CLOUD_ENGINE_PROBE_FAILURE=/);
 assert.match(workflow,/probes\[index\]=probe/);
 assert.match(workflow,/ROBLOX_RUNTIME_FOUNDATION_QA_PROBE_COUNT=/);
 assert.match(workflow,/writeFileSync\('\/tmp\/roblox-open-cloud-engine-probes\.json'/);
 assert.doesNotMatch(workflow,/Promise\.all\(candidates\.map/);
});

test('post-runtime scan persists successful sibling probes before surfacing persistent peer failures',()=>{
 const workflow=fs.readFileSync('.github/workflows/company-development-roblox-post-runtime-qa.yml','utf8');
 assert.match(workflow,/persistentFailure:true/);
 assert.match(workflow,/ROBLOX_FOUNDATION_OPEN_CLOUD_PROBE_PERSISTENT_FAILURE=/);
 assert.match(workflow,/roblox-open-cloud-engine-probe-failure/);
 assert.match(workflow,/ROBLOX_OPEN_CLOUD_PERSISTENT_PROBE_FAILURE_COUNT=/);
 assert.match(workflow,/Enforce persistent Open Cloud probe failures after evidence persistence/);
 const stateWriteAt=workflow.indexOf("git add development-queue.json");
 const studioDispatchAt=workflow.indexOf("ROBLOX_STUDIO_MCP_POST_FOUNDATION_DISPATCH_COUNT=");
 const failGateAt=workflow.indexOf("ROBLOX_OPEN_CLOUD_PERSISTENT_PROBE_FAILURE=YES");
 assert.ok(stateWriteAt>0&&studioDispatchAt>stateWriteAt&&failGateAt>studioDispatchAt);
});

test('post-runtime Studio followup delegates exact-engine preboot eligibility to the canonical planner',()=>{
 const workflow=fs.readFileSync('.github/workflows/company-development-roblox-post-runtime-qa.yml','utf8');
 assert.match(workflow,/const queueStudioFollowupIfEligible=item=>\{[\s\S]*?planLocalStudioCandidates\(/);
 assert.doesNotMatch(workflow,/queueStudioFollowupIfEligible=item=>\{\s*if\(item\?\.robloxRuntimeFoundationPassed!==true\)return;/);
 assert.match(workflow,/ROBLOX_FOUNDATION_AWAITING_REAL_SERVER_BOOT=[\s\S]*?queueStudioFollowupIfEligible\(item\);[\s\S]*?continue;/);
});

test('exact engine preboot enters Studio followup even when the runtime sentinel already matches the candidate version',()=>{
 const workflow=fs.readFileSync('.github/workflows/company-development-roblox-post-runtime-qa.yml','utf8');
 assert.match(workflow,/const exactEngineVersionAwaitingRealServerBoot=[\s\S]*?engineProbe\?\.serverBootObserved!==true/);
 assert.match(workflow,/result\.exactVersion!==true[\s\S]*?\|\|\(result\.runtimeFoundationPassed!==true&&exactEngineVersionAwaitingRealServerBoot\)/);
 assert.match(workflow,/exactVersion:result\.exactVersion===true/);
 assert.match(workflow,/authority:exactEngineVersionAwaitingRealServerBoot[\s\S]*?'exact-engine-version-awaiting-real-server-boot'/);
 assert.match(workflow,/if\(exactEngineVersionAwaitingRealServerBoot\)[\s\S]*?queueStudioFollowupIfEligible\(item\);[\s\S]*?continue;/);
});

test('runtime sentinel 404 still hands exact Open Cloud engine evidence to canonical Studio planning',()=>{
 const workflow=fs.readFileSync('.github/workflows/company-development-roblox-post-runtime-qa.yml','utf8');
 assert.match(workflow,/if\(\/HTTP_404\/\.test\(message\)\)[\s\S]*?const exactEnginePrebootFromProbe=/);
 assert.match(workflow,/exactEnginePrebootFromProbe[\s\S]*?authority:'exact-engine-version-awaiting-real-server-boot'/);
 assert.match(workflow,/exactEnginePrebootFromProbe[\s\S]*?queueStudioFollowupIfEligible\(item\)/);
 assert.match(workflow,/ROBLOX_FOUNDATION_EXACT_ENGINE_PREBOOT_STUDIO_FOLLOWUP=/);
 assert.match(workflow,/observedVersionNumber:null/);
 assert.match(workflow,/item\.robloxRuntimeFoundationPassed=false/);
});

test('central policy makes external server observation diagnostic only while Studio drives internal validation',()=>{
 const roadmap=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
 const architecture=JSON.parse(fs.readFileSync('company-learning/company-architecture-map.json','utf8'));
 const policy=roadmap.developmentLifecycleMachine?.robloxStudioUsage?.runtimeFoundationBoundary||{};
 const topology=architecture.releaseExposureLifecycle?.robloxPerpetualInternalBuildup?.runtimeFoundationObservation||{};
 const stack=roadmap.developmentLifecycleMachine?.nativeGameFoundationValidationStack||{};
 assert.equal(policy.runtimeFoundationPassMustNotBeFabricatedFromOpenCloudHeadlessExecution,true);
 assert.equal(policy.developmentBlocking,false);
 assert.equal(policy.internalQaBlocking,false);
 assert.equal(policy.internalRegressionBlocking,false);
 assert.equal(policy.internalReleaseBlocking,false);
 assert.equal(policy.externalPublicReleaseBlocking,false);
 assert.equal(policy.observationRetry,'OPTIONAL_MANUAL_DIAGNOSTIC_ONLY');
 assert.equal(policy.externalServerObservationRequiredForInternalDevelopment,false);
 assert.equal(policy.externalServerObservationRequiredForPublicRelease,false);
 assert.equal(policy.ownerApprovalIsExternalPublicationAuthority,true);
 assert.equal(topology.role,'OPTIONAL_MANUAL_DIAGNOSTIC_ONLY');
 assert.equal(topology.observationRetry,'MANUAL_WHEN_NEEDED');
 assert.equal(topology.externalPublicReleaseBlocking,false);
 assert.equal(topology.externalPublicReleaseRemainsBlockedUntilRealServerBoot,false);
 assert.equal(topology.studioPlannerEligibility,'EXACT_PRIVATE_RUNTIME_CANDIDATE');
 assert.equal(stack.governingPrinciples.robloxExternalServerBootRequiredBeforeInternalRelease,false);
 assert.equal(stack.governingPrinciples.oneExactInternalRuntimeSessionMaySatisfyMultipleApplicableFloors,true);
 assert.equal(stack.releaseGate.runtimeFoundationRequiredForInternalRelease,false);
 assert.equal(stack.releaseGate.internalRuntimeValidationRequiredForInternalRelease,true);
 assert.equal(stack.releaseGate.externalServerBootRequiredForPublicReleaseReady,false);
});

test('runtime QA uses Studio for internal validation and runs Open Cloud server probe only by explicit diagnostic input',()=>{
 const workflow=fs.readFileSync('.github/workflows/company-development-roblox-post-runtime-qa.yml','utf8');
 assert.match(workflow,/Probe exact Roblox Open Cloud engine execution[\s\S]*?if: \$\{\{ inputs\.retry_open_cloud_only == true \}\}/);
 assert.match(workflow,/SERVER_DIAGNOSTIC_ENABLED: \$\{\{ inputs\.retry_open_cloud_only \|\| false \}\}/);
 assert.match(workflow,/const exactStudioInternalValidation=/);
 assert.match(workflow,/ROBLOX_INTERNAL_VALIDATION_WAITING_FOR_STUDIO=/);
 assert.match(workflow,/internalStudioValidationOnly:true/);
 assert.match(workflow,/externalServerBootRequired:false/);
 assert.match(workflow,/authority:'roblox-internal-studio-single-session-qa'/);
 assert.match(workflow,/ROBLOX_INTERNAL_STUDIO_SINGLE_SESSION_PASS=/);
 assert.match(workflow,/F1_F8=COLLECTED:F9=FAN_IN_ONLY/);
 assert.match(workflow,/if\(!process\.env\.ROBLOX_OPEN_CLOUD_API_KEY\)throw new Error\('ROBLOX_OPEN_CLOUD_API_KEY_REQUIRED_FOR_MANUAL_SERVER_DIAGNOSTIC'\)/);
});

test('exact private Roblox runtime failures continue internal flow but remain external-release blockers',()=>{
 const workflow=fs.readFileSync('.github/workflows/company-development-roblox-post-runtime-qa.yml','utf8');
 assert.match(workflow,/const exactPrivateRuntimeFinding=/);
 assert.match(workflow,/result\.exactGame===true/);
 assert.match(workflow,/result\.exactPlace===true/);
 assert.match(workflow,/result\.exactVersion===true/);
 assert.match(workflow,/result\.actualRuntimeEvidence===true/);
 assert.match(workflow,/item\.robloxRuntimeFailureExternalReleaseOnly=true/);
 assert.match(workflow,/item\.robloxInternalQaContinuationAllowed=true/);
 assert.match(workflow,/item\.robloxInternalRegressionContinuationAllowed=true/);
 assert.match(workflow,/item\.robloxPublicReleaseRuntimeObservationPending=true/);
 assert.match(workflow,/runtimeFailureExternalReleaseOnly:true/);
 assert.match(workflow,/internalQaContinuationAllowed:true/);
 assert.match(workflow,/internalRegressionContinuationAllowed:true/);
 assert.match(workflow,/item\.currentStep='ROBLOX_FINAL_REVIEW_REVALIDATION'/);
 assert.match(workflow,/ROBLOX_INTERNAL_FLOW_CONTINUES_RUNTIME_FINDING_EXTERNAL_ONLY=/);
 assert.match(workflow,/item\.robloxRuntimePassed=false/);
 assert.match(workflow,/item\.robloxInternalReleaseReady=true/);
 assert.match(workflow,/item\.robloxF9PendingInParallel=true/);
 assert.match(workflow,/item\.currentStep='INTERNAL_PLATFORM_PLAYTEST_AND_DEBUG'/);
 assert.match(workflow,/item\.robloxFailureStage='PUBLIC_RELEASE_RUNTIME_FINDING'/);
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
 assert.match(workflow,/&&\(explicitRuntimeStage\|\|exactStudioPlayPendingRuntime\|\|externalRuntimeObservationPending\)/);
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


test('F7 multiplayer runs only when explicitly applicable and its exact proof is reused by F9',()=>{
 const runtime=fs.readFileSync('.github/workflows/company-development-roblox-post-runtime-qa.yml','utf8');
 const finalReview=fs.readFileSync('.github/workflows/company-development-roblox-final-review-revalidation.yml','utf8');
 assert.match(runtime,/const multiplayerRequirementFor=item=>/);
 assert.match(runtime,/typeof profile\.multiplayerRequired==='boolean'/);
 assert.match(runtime,/authority:'ROBLOX_BUILD_PROFILE'/);
 assert.match(runtime,/authority:'NO_EXPLICIT_MULTIPLAYER_CONTRACT'/);
 assert.doesNotMatch(runtime,/content\?\.platformProfiles\?\.ROBLOX\?\.multiplayerRuntime\|\|/);
 assert.match(runtime,/const priorF7Exact=/);
 assert.match(runtime,/priorPost\.f7Status==='NOT_APPLICABLE'/);
 assert.match(runtime,/multiplayerEvidenceReused:priorF7Exact/);
 assert.match(runtime,/f7Status:multiplayer\.known!==true\?'APPLICABILITY_UNKNOWN':multiplayer\.required===true\?\(multiplayerValidationPassed\?\(priorF7Exact\?'PASS_REUSED_EXACT':'PASS_SINGLE_REQUIRED_CHECK'\):'PENDING_SINGLE_REQUIRED_CHECK'\):'NOT_APPLICABLE'/);
 assert.match(runtime,/ROBLOX_INTERNAL_STUDIO_PASS_F7_PENDING=/);
 assert.match(finalReview,/const f7Accepted=/);
 assert.match(finalReview,/post\.multiplayerRequired!==true/);
 assert.match(finalReview,/&&f7Accepted===true/);
 assert.match(finalReview,/multiplayerVerificationMode:post\.multiplayerRequired===true\?'TWO_CLIENT_ONE_SYNC':'NOT_APPLICABLE'/);
 assert.match(finalReview,/f9RuntimeReplay:false/);
 assert.match(finalReview,/item\.robloxPublicReleaseReady=false/);
 assert.doesNotMatch(finalReview,/roblox-public-release-awaiting-real-server-boot/);
 assert.doesNotMatch(finalReview,/publishRobloxPlace/);
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
  const workflow=fs.readFileSync('.github/workflows/company-development-roblox-post-runtime-qa.yml','utf8');
  assert.doesNotMatch(workflow,/candidates\.slice\(0,4\)/);
  assert.match(workflow,/const throttlePressure=candidates\.some\(item=>/);
  assert.match(workflow,/const probeConcurrency=Math\.max\(1,Math\.min\(requested\?1:\(throttlePressure\?1:2\),candidates\.length\|\|1\)\)/);
  assert.match(workflow,/ROBLOX_OPEN_CLOUD_THROTTLE_PRESSURE=/);
  assert.match(workflow,/await Promise\.all\(Array\.from\(\{length:probeConcurrency\},\(\)=>runProbeWorker\(\)\)\)/);
  assert.doesNotMatch(workflow,/Promise\.all\(candidates\.map\(async item=>/);
  assert.match(workflow,/ROBLOX_RUNTIME_FOUNDATION_QA_PARALLEL_COUNT=/);
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


test('Roblox post-runtime QA keeps distinct games parallel while collapsing duplicate scans',()=>{
  const post=fs.readFileSync('.github/workflows/company-development-roblox-post-runtime-qa.yml','utf8');
  const f9=fs.readFileSync('.github/workflows/company-development-roblox-final-review-revalidation.yml','utf8');
  const postJobs=post.indexOf('\njobs:\n');
  const f9Jobs=f9.indexOf('\njobs:\n');
  assert.ok(postJobs>0&&f9Jobs>0);
  const postHeader=post.slice(0,postJobs);
  assert.match(postHeader,/group: roblox-runtime-foundation-\$\{\{ inputs\.game_id \|\| 'scan' \}\}/);
  assert.match(postHeader,/cancel-in-progress: \$\{\{ inputs\.game_id == '' \}\}/);
  assert.doesNotMatch(postHeader,/group: roblox-runtime-foundation-scan\s*$/m);
  assert.doesNotMatch(f9.slice(0,f9Jobs),/\nconcurrency:/);
});


test('F9 collapses duplicate exact-game and scan runs before deterministic review',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-development-roblox-final-review-revalidation.yml','utf8');
  const jobsAt=workflow.indexOf('\njobs:\n');
  assert.ok(jobsAt>0);
  assert.match(workflow,/run-name: Roblox F9 · \$\{\{ inputs\.game_id \|\| 'scan' \}\}/);
  assert.doesNotMatch(workflow.slice(0,jobsAt),/\nconcurrency:/);
  assert.match(workflow,/ROBLOX_F9_ACTIVE_WINNER=/);
  assert.match(workflow,/ROBLOX_F9_EXACT_DEDUPED=/);
  assert.match(workflow,/ROBLOX_F9_SCAN_DEDUPED_NEWER=/);
  assert.match(workflow,/final-review:\n\s+needs: dedupe\n\s+if: needs\.dedupe\.outputs\.run == 'true'/);
});

test('post-runtime dedupe job runs without a same-game concurrency lock',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-development-roblox-post-runtime-qa.yml','utf8');
  const start=workflow.indexOf('  dedupe:');
  const end=workflow.indexOf('\n  runtime-foundation-qa:',start);
  const block=workflow.slice(start,end);
  assert.match(block,/runs-on:\s*ubuntu-24\.04/);
  assert.doesNotMatch(block,/concurrency:/);
  assert.match(block,/ROBLOX_RUNTIME_FOUNDATION_QA_ACTIVE_WINNER=/);
});

test('F9 dedupe job itself has no same-game concurrency lock',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-development-roblox-final-review-revalidation.yml','utf8');
  const start=workflow.indexOf('\n  dedupe:\n');
  const end=workflow.indexOf('\n  final-review:\n',start);
  const block=workflow.slice(start,end);
  assert.ok(start>=0&&end>start);
  assert.match(block,/runs-on:\s*ubuntu-slim/);
  assert.doesNotMatch(block,/concurrency:/);
  assert.match(block,/ROBLOX_F9_ACTIVE_WINNER=/);
});


test('central F0-F9 efficiency contract keeps evolution primary while scoping security server and multiplayer work',()=>{
 const roadmap=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
 const architecture=JSON.parse(fs.readFileSync('company-learning/company-architecture-map.json','utf8'));
 const security=JSON.parse(fs.readFileSync('company-learning/security-immune-system.json','utf8'));
 const opt=roadmap.developmentLifecycleMachine.validationEfficiencyOptimization;
 assert.equal(opt.evolutionLoopMustRemainUnchanged,true);
 assert.equal(opt.floorStructureMustRemainUnchanged,true);
 assert.deepEqual(opt.floors,['F0','F1','F2','F3','F4','F5','F6','F7','F8','F9']);
 assert.equal(opt.f10Forbidden,true);
 assert.equal(opt.externalServer.automaticProbe,false);
 assert.equal(opt.externalServer.role,'OPTIONAL_MANUAL_DIAGNOSTIC_ONLY');
 assert.equal(opt.security.unrelatedGameplayPresentationContentChange,'NO_FULL_SECURITY_RESCAN');
 assert.equal(opt.security.exactUnchangedEvidenceReusable,true);
 assert.equal(opt.multiplayer.singleExactProofPerSourceCycle,true);
 assert.equal(opt.multiplayer.duplicateF9Check,false);
 assert.equal(opt.f9.startsNewRuntimeSession,false);
 assert.equal(opt.f9.startsFullSecurityRescan,false);
 assert.equal(opt.f9.startsDuplicateMultiplayerSession,false);
 assert.equal(opt.scheduledRecoveryScan.idleScanMode,'STATE_DISCOVERY_ONLY');
 assert.equal(opt.scheduledRecoveryScan.heavyContractQaOnIdleSchedule,false);
 assert.equal(opt.scheduledRecoveryScan.noPendingWorkAction,'EXIT_WITHOUT_RUNTIME_SECURITY_OR_MULTIPLAYER_REVALIDATION');
 assert.equal(opt.security.fullRescanMayNotRunFromIdleSchedule,true);
 assert.equal(opt.multiplayer.idleScheduleRecheck,false);
 assert.equal(architecture.releaseExposureLifecycle.validationEfficiency.gameEvolutionPipelineUnchanged,true);
 assert.equal(architecture.releaseExposureLifecycle.validationEfficiency.multiplayer.onlyWhenApplicable,true);
 assert.equal(architecture.releaseExposureLifecycle.validationEfficiency.scheduledRecoveryScan.idleMode,'STATE_DISCOVERY_ONLY');
 assert.equal(architecture.releaseExposureLifecycle.validationEfficiency.scheduledRecoveryScan.heavyQaWhenIdle,false);
 assert.equal(security.minimumNecessaryDevelopmentSecurity.protections.unrelatedGameplayPresentationOrContentDeltaDoesNotRequireFullSecurityRescan,true);
});

test('scheduled Roblox recovery scan stays state-only when no exact internal validation work exists',()=>{
 const workflow=fs.readFileSync('.github/workflows/company-development-roblox-post-runtime-qa.yml','utf8');
 assert.match(workflow,/Classify pending internal validation work/);
 assert.match(workflow,/ROBLOX_INTERNAL_VALIDATION_PENDING=/);
 assert.match(workflow,/ROBLOX_IDLE_SCAN=/);
 assert.match(workflow,/Run deterministic foundation protocol QA\n\s+if: \$\{\{ inputs\.retry_open_cloud_only != true && \(github\.event_name != 'schedule' \|\| steps\.internal_work\.outputs\.count != '0'\) \}\}/);
 assert.match(workflow,/Read exact runtime sentinel and persist tester QA evidence\n\s+if: \$\{\{ inputs\.retry_open_cloud_only == true \|\| github\.event_name != 'schedule' \|\| steps\.internal_work\.outputs\.count != '0' \}\}/);
 assert.match(workflow,/Dispatch F9 review for runtime-accepted candidates\n\s+if: \$\{\{ inputs\.retry_open_cloud_only != true && \(github\.event_name != 'schedule' \|\| steps\.internal_work\.outputs\.count != '0'\) \}\}/);
 assert.match(workflow,/Enforce persistent Open Cloud probe failures after evidence persistence\n\s+if: \$\{\{ inputs\.retry_open_cloud_only == true \}\}/);
 assert.doesNotMatch(workflow,/const externalRuntimeObservationPending=/);
 assert.doesNotMatch(workflow,/\|\|externalRuntimeObservationPending\)/);
});
