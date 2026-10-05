import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fetchRobloxRuntimeFoundationEvidence,probeRobloxOpenCloudEngine,probeRobloxOpenCloudImageEvidence,validateRobloxRuntimeFoundationEvidence,validateRobloxMultiplayerSourceContract} from '../tools/company-development-roblox-runtime-foundation.mjs';

const checkpoint=(name,sequence)=>({name,at:1,sequence,userId:1,gameId:'cozy-island',placeId:116850096561713,placeVersion:21,...(name==='MULTIPLAYER_SYNC'?{participantCount:2}:{})});
const names=['SERVER_BOOT','MODULE_GRAPH_READY','WORLD_READY','SPAWN_READY','CHARACTER_READY','GROUND_CONTACT','CAMERA_READY','INPUT_READY','MOVEMENT_CONFIRMED','REMOTE_ROUNDTRIP','SAVE_ROUNDTRIP','MULTIPLAYER_SYNC','CORE_LOOP_READY'];
const good={gameId:'cozy-island',placeId:116850096561713,placeVersion:21,requirements:{saveEnabled:true,multiplayerRequired:true},checkpoints:Object.fromEntries(names.map((x,index)=>[x,checkpoint(x,index+1)]))};


test('Roblox runtime foundation push wake includes its deterministic QA contracts but ignores descriptive architecture edits',()=>{
 const workflow=fs.readFileSync('.github/workflows/company-development-roblox-post-runtime-qa.yml','utf8');
 const pushStart=workflow.indexOf('  push:');
 const pushEnd=workflow.indexOf('  workflow_dispatch:',pushStart);
 const pushBlock=workflow.slice(pushStart,pushEnd);
 assert.ok(pushStart>=0&&pushEnd>pushStart);
 assert.match(pushBlock,/qa\/company-development-roblox-runtime-foundation\.test\.mjs/);
 assert.match(pushBlock,/qa\/company-development-roblox-studio-local-play\.test\.mjs/);
 assert.doesNotMatch(pushBlock,/company-learning\/company-architecture-map\.json/);
 assert.match(pushBlock,/tools\/company-development-roblox-runtime-foundation\.mjs/);
 assert.match(pushBlock,/tools\/company-development-roblox-studio-local-play\.mjs/);
 assert.match(pushBlock,/company-learning\/platform-release-roadmap\.json/);
 assert.match(pushBlock,/roblox-games\/\.company-runtime-trigger/);
});
test('Roblox post-work verification defaults to Open Cloud runtime plus image sanity without requiring Studio',()=>{
 const workflow=fs.readFileSync('.github/workflows/company-development-roblox-post-runtime-qa.yml','utf8');
 assert.match(workflow,/SERVER_DIAGNOSTIC_ENABLED:\s*true/);
 assert.match(workflow,/probeRobloxOpenCloudImageEvidence/);
 assert.match(workflow,/ROBLOX_OPEN_CLOUD_IMAGE_CHECK=/);
 assert.match(workflow,/openCloudImageEvidence:engineProbe\?\.imageEvidence\|\|null/);
 assert.match(workflow,/run_studio:[\s\S]*?default:\s*false/);
});

test('event-driven Roblox runtime foundation QA has no delayed cron and does not require full git history',()=>{
 const workflow=fs.readFileSync('.github/workflows/company-development-roblox-post-runtime-qa.yml','utf8');
 const header=workflow.slice(0,workflow.indexOf('\njobs:\n'));
 assert.doesNotMatch(header,/schedule:/);
 assert.doesNotMatch(workflow,/fetch-depth:\s*0/);
 assert.match(workflow,/Checkout current canonical implementation[\s\S]*?fetch-depth:\s*1/);
});

test('actual Roblox sentinel passes F1 through F8 only for the exact deployed place version',()=>{
 const r=validateRobloxRuntimeFoundationEvidence({sentinel:good,gameId:'cozy-island',placeId:'116850096561713',versionNumber:21});
 assert.equal(r.runtimeFoundationPassed,true);
 assert.equal(r.runtimeAcceptancePassed,true);
 for(const field of ['f1ServerBootPassed','f2WorldFoundationPassed','f3CharacterFoundationPassed','f4PhysicsAndMovementPassed','f5InputCameraUiPassed','f6CoreServicesPassed','f8GameplaySystemsPassed'])assert.equal(r[field],true,field);
 assert.equal(r.f7MultiplayerFoundationPassed,false,'multiplayer F7 is verified by the exact-source code contract separately');
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


test('runtime foundation does not wait for live multiplayer synchronization',()=>{
 const broken=structuredClone(good);delete broken.checkpoints.MULTIPLAYER_SYNC;
 const r=validateRobloxRuntimeFoundationEvidence({sentinel:broken,gameId:'cozy-island',placeId:'116850096561713',versionNumber:21});
 assert.equal(r.runtimeFoundationPassed,true);
 assert.equal(r.runtimeAcceptancePassed,true);
 assert.equal(r.f7MultiplayerFoundationPassed,false);
 assert.equal(r.multiplayerPromotionPending,false);
 assert.equal(r.requiredCheckpoints.includes('MULTIPLAYER_SYNC'),false);
});


test('runtime foundation ignores multiplayer participant count because F7 is source-contract only',()=>{
 const onePlayer=structuredClone(good);onePlayer.checkpoints.MULTIPLAYER_SYNC.participantCount=1;
 const one=validateRobloxRuntimeFoundationEvidence({sentinel:onePlayer,gameId:'cozy-island',placeId:'116850096561713',versionNumber:21});
 const twoPlayers=structuredClone(good);twoPlayers.checkpoints.MULTIPLAYER_SYNC.participantCount=2;
 const two=validateRobloxRuntimeFoundationEvidence({sentinel:twoPlayers,gameId:'cozy-island',placeId:'116850096561713',versionNumber:21});
 assert.equal(one.runtimeAcceptancePassed,true);
 assert.equal(two.runtimeAcceptancePassed,true);
 assert.equal(one.f7MultiplayerFoundationPassed,false);
 assert.equal(two.f7MultiplayerFoundationPassed,false);
});

test('multiplayer F7 passes from exact source code contract without launching two clients',()=>{
 const server=[
  'local participants=Players:GetPlayers()',
  'if #participants>=2 then shared=1 end',
  'remote:FireAllClients("MULTIPLAYER_SYNC",{ParticipantCount=#participants})',
 ].join('\n');
 const client='remote.OnClientEvent:Connect(function(kind,payload) if kind~="MULTIPLAYER_SYNC" then return end local n=payload.ParticipantCount end)';
 const r=validateRobloxMultiplayerSourceContract({serverSource:server,clientSource:client});
 assert.equal(r.passed,true);
 assert.equal(r.runtimeTwoClientExecutionRequired,false);
 assert.equal(r.checks.twoParticipantCapablePath,true);
 assert.equal(r.authority,'roblox-static-two-client-source-contract');
});

test('F9 final review uses shallow checkout instead of full git history',()=>{
 const workflow=fs.readFileSync('.github/workflows/company-development-roblox-final-review-revalidation.yml','utf8');
 assert.doesNotMatch(workflow,/fetch-depth:\s*0/);
 assert.match(workflow,/Checkout current canonical implementation[\s\S]*?fetch-depth:\s*1/);
 assert.match(workflow,/Checkout canonical runtime state[\s\S]*?fetch-depth:\s*1/);
});

test('central policy makes multiplayer F7 an exact-source code contract with no two-client runtime launch',()=>{
 const roadmap=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
 const stack=roadmap.developmentLifecycleMachine.nativeGameFoundationValidationStack;
 const f7=stack.layers.find(layer=>layer.id==='F7');
 assert.equal(f7.releaseGateMode,'STATIC_CODE_CONTRACT');
 assert.deepEqual(f7.checks,['MINIMUM_TWO_PARTICIPANT_CODE_PATH','ONE_AUTHORITATIVE_SHARED_STATE_BROADCAST_CODE','CLIENT_MULTIPLAYER_SYNC_HANDLER_CONTRACT']);
 const proof=stack.robloxContract.multiplayerReleaseProof;
 assert.equal(proof.mode,'STATIC_CODE_CONTRACT');
 assert.equal(proof.minimumParticipants,2);
 assert.equal(proof.runtimeExecutionRequired,false);
 assert.equal(proof.actualRuntimeCheckpointRequired,false);
 assert.equal(proof.sourceContractRequired,true);
 assert.equal(proof.sameProofReusedForInternalAndPublic,true);
 assert.equal(proof.duplicatePublicMultiplayerCheckRequired,false);
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


test('Open Cloud image check records thumbnail metadata as visual sanity without claiming runtime screenshot proof',async()=>{
 const ok=await probeRobloxOpenCloudImageEvidence({
  universeId:'1',apiKey:'k',networkRetryAttempts:1,networkRetryDelayMs:0,
  fetchImpl:async()=>({ok:true,status:200,text:async()=>JSON.stringify({
   thumbnails:[{homepageThumbnailId:'thumb-1',imageUrl:'https://tr.rbxcdn.com/example-thumbnail.png'}]
  })}),
 });
 assert.equal(ok.available,true);
 assert.equal(ok.imageMetadataAvailable,true);
 assert.equal(ok.thumbnailCount,1);
 assert.equal(ok.runtimeScreenshot,false);
 assert.equal(ok.exactRuntimeVersionImage,false);
 assert.equal(ok.state,'PASS_METADATA_AVAILABLE');
 assert.equal(ok.authority,'roblox-open-cloud-thumbnail-image-sanity');

 const denied=await probeRobloxOpenCloudImageEvidence({
  universeId:'1',apiKey:'k',networkRetryAttempts:1,networkRetryDelayMs:0,
  fetchImpl:async()=>({ok:false,status:403,text:async()=>JSON.stringify({message:'required scope <universe.thumbnail:read>'})}),
 });
 assert.equal(denied.available,false);
 assert.equal(denied.permissionDenied,true);
 assert.equal(denied.requiredScope,'universe.thumbnail:read');
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

test('F9 canonical publish uses exact F9 released-game identity and immediately reopens the next evolution cycle',()=>{
 const workflow=fs.readFileSync('.github/workflows/company-development-roblox-final-review-revalidation.yml','utf8');
 const dispatchAt=workflow.indexOf('Dispatch exact F9-verified artifact to canonical Roblox game target');
 const fanInAt=workflow.indexOf('Fan verified F9 runtime proof into waiting Vibe Roblox tasks');
 assert.ok(dispatchAt>=0&&fanInAt>dispatchAt,'canonical publish dispatch must precede Vibe refill');
 assert.match(workflow,/robloxF9VerifiedPrepublishEvidence/);
 assert.match(workflow,/robloxCanonicalPublishQueue/);
 assert.match(workflow,/status:'PENDING'/);
 assert.match(workflow,/const releaseReadiness=evaluateInternalRelease\(item,'ROBLOX',roadmap\)/);
 assert.match(workflow,/const serverPublishEligible=[\s\S]*?releaseReadiness\.ready===true[\s\S]*?item\.robloxFinalReviewPassed===true[\s\S]*?item\.robloxF9ReleaseRegressionPassed===true[\s\S]*?candidate\.sourceRevision===sourceRevision[\s\S]*?candidate\.artifactIdentity===artifactIdentity/);
 assert.match(workflow,/item\.robloxInternalReleaseReady=serverPublishEligible/);
 assert.match(workflow,/if\(serverPublishEligible&&!publishQueue/);
 assert.match(workflow,/item\.currentStep='POST_F9_CONTINUOUS_EVOLUTION'/);
 assert.match(workflow,/ROBLOX_F9_CANONICAL_PUBLISH_DISPATCHED=/);
 const dispatch=workflow.slice(dispatchAt,workflow.indexOf('Immediately continue each successfully persisted Roblox F9 game',dispatchAt));
 assert.match(dispatch,/item\.robloxFinalReviewPassed!==true\|\|item\.robloxF9ReleaseRegressionPassed!==true/);
 assert.doesNotMatch(dispatch,/evaluateInternalRelease/);
 assert.match(workflow,/ROBLOX_NEXT_EVOLUTION_CYCLE_DEPENDS_ON_PUBLICATION_OUTCOME=NO/);
 assert.match(workflow,/event_type:"vibe2-fanin-refill"/);
 assert.match(workflow,/ROBLOX_F9_VIBE_REFILL_DISPATCHED=\$refill_count/);
 assert.match(workflow,/ROBLOX_F9_VIBE_REFILL_REQUIRES_SETTLED_WAITER=NO/);
 assert.match(workflow,/ROBLOX_F9_VIBE_REFILL_GAME_DISPATCHED=\$game_id/);
});


test('post-runtime Open Cloud engine probes keep bounded cross-game parallelism while retrying 429 per game',()=>{
 const workflow=fs.readFileSync('.github/workflows/company-development-roblox-post-runtime-qa.yml','utf8');
 const foundation=fs.readFileSync('tools/company-development-roblox-runtime-foundation.mjs','utf8');
 assert.doesNotMatch(workflow,/const throttlePressure=candidates\.some/);
 assert.match(workflow,/const probeConcurrency=Math\.max\(1,Math\.min\(8,candidates\.length\|\|1\)\)/);
 assert.match(workflow,/ROBLOX_OPEN_CLOUD_PARALLEL_MODE=MAX8_FILL_AVAILABLE/);
 assert.match(workflow,/ROBLOX_OPEN_CLOUD_429_SCOPE=PER_GAME_RETRY_ONLY/);
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


test('exact engine preboot continues internal F9 without making Studio a gate',()=>{
 const workflow=fs.readFileSync('.github/workflows/company-development-roblox-post-runtime-qa.yml','utf8');
 const start=workflow.indexOf('if(exactEnginePrebootFromProbe){');
 const end=workflow.indexOf('}else{',start);
 assert.ok(start>0&&end>start);
 const block=workflow.slice(start,end);
 assert.match(workflow,/item\.robloxRuntimeFoundationPassed=false;[\s\S]{0,900}if\(exactEnginePrebootFromProbe\)\{/);
 assert.match(workflow,/item\.robloxRuntimePassed=false;[\s\S]{0,900}if\(exactEnginePrebootFromProbe\)\{/);
 assert.match(block,/internalRuntimeObservationDeferred:true/);
 assert.match(block,/externalServerBootRequired:false/);
 assert.match(block,/officialStudioMcpActualPlayPassed:exactStudioInternalValidation/);
 assert.match(block,/item\.robloxInternalReleaseReady=true/);
 assert.match(block,/item\.robloxF9PendingInParallel=true/);
 assert.match(block,/f9Ids\.push\(item\.gameId\)/);
 assert.doesNotMatch(block,/queueStudioFollowupIfEligible\(item\)/);
});


test('exact engine preboot with matching sentinel continues F9 while real server boot stays pending',()=>{
 const workflow=fs.readFileSync('.github/workflows/company-development-roblox-post-runtime-qa.yml','utf8');
 const start=workflow.indexOf('if(exactEngineVersionAwaitingRealServerBoot){');
 const end=workflow.indexOf('}else{',start);
 assert.ok(start>0&&end>start);
 const block=workflow.slice(start,end);
 assert.match(workflow,/const exactEngineVersionAwaitingRealServerBoot=[\s\S]*?engineProbe\?\.serverBootObserved!==true/);
 assert.match(block,/item\.robloxRuntimeFoundationInternalReleaseException=true/);
 assert.match(block,/item\.robloxPublicReleaseRuntimeObservationPending=true/);
 assert.match(block,/internalRuntimeObservationDeferred:true/);
 assert.match(block,/externalServerBootRequired:false/);
 assert.match(block,/officialStudioMcpActualPlayPassed:exactStudioInternalValidation/);
 assert.match(workflow,/item\.robloxRuntimePassed=false;[\s\S]{0,1800}if\(exactEngineVersionAwaitingRealServerBoot\)\{/);
 assert.match(block,/f9Ids\.push\(item\.gameId\)/);
 assert.doesNotMatch(block,/queueStudioFollowupIfEligible\(item\)/);
});


test('runtime sentinel 404 uses exact Open Cloud engine evidence for nonblocking internal F9 continuation',()=>{
 const workflow=fs.readFileSync('.github/workflows/company-development-roblox-post-runtime-qa.yml','utf8');
 const start=workflow.indexOf('if(exactEnginePrebootFromProbe){');
 const end=workflow.indexOf('}else{',start);
 assert.ok(start>0&&end>start);
 const block=workflow.slice(start,end);
 assert.match(workflow,/if\(\/HTTP_404\/\.test\(message\)\)[\s\S]*?const exactEnginePrebootFromProbe=/);
 assert.match(block,/authority:'exact-engine-version-awaiting-real-server-boot'/);
 assert.match(block,/observedVersionNumber:null/);
 assert.match(block,/serverBootObserved:false/);
 assert.match(workflow,/item\.robloxRuntimeFoundationPassed=false;[\s\S]{0,900}if\(exactEnginePrebootFromProbe\)\{/);
 assert.match(workflow,/item\.robloxRuntimePassed=false;[\s\S]{0,900}if\(exactEnginePrebootFromProbe\)\{/);
 assert.match(block,/internalRuntimeObservationDeferred:true/);
 assert.match(block,/ROBLOX_INTERNAL_FLOW_PASS_EXTERNAL_SERVER_BOOT_PENDING=/);
 assert.doesNotMatch(block,/STUDIO_FOLLOWUP|queueStudioFollowupIfEligible/);
});


test('central policy keeps runtime and Studio optional while code and static QA drive Roblox continuation',()=>{
 const roadmap=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
 const architecture=JSON.parse(fs.readFileSync('company-learning/company-architecture-map.json','utf8'));
 const verify=roadmap.roblox?.developmentVerification||{};
 const studio=roadmap.roblox?.studioExecution||{};
 const stack=roadmap.developmentLifecycleMachine?.nativeGameFoundationValidationStack||{};
 const topology=architecture.robloxDevelopmentVerificationTopology||{};
 assert.deepEqual(verify.postBuildUpRequired,['CODE_QA','STATIC_QA']);
 assert.equal(verify.studio,'OPTIONAL_DIAGNOSTIC');
 assert.equal(verify.studioBlocksDevelopment,false);
 assert.equal(verify.studioBlocksF9,false);
 assert.equal(verify.studioBlocksDeployment,false);
 assert.equal(studio.required,false);
 assert.equal(studio.requiredForInternalRelease,false);
 assert.equal(studio.deploymentGate,false);
 assert.equal(studio.f9Gate,false);
 assert.equal(stack.governingPrinciples.robloxExternalServerBootRequiredBeforeInternalRelease,false);
 assert.equal(stack.releaseGate.runtimeFoundationRequiredForInternalRelease,false);
 assert.equal(stack.releaseGate.internalRuntimeValidationRequiredForInternalRelease,false);
 assert.equal(stack.releaseGate.studioRequiredForInternalRelease,false);
 assert.equal(topology.studioRole,'OPTIONAL_DIAGNOSTIC_AND_VERIFIED_LEARNING');
 assert.equal(topology.studioBlocksDevelopment,false);
 assert.equal(topology.studioBlocksF9,false);
 assert.equal(topology.studioBlocksDeployment,false);
});

test('F9 consumes exact deferred engine evidence without requiring Studio actual play',()=>{
 const f9=fs.readFileSync('.github/workflows/company-development-roblox-final-review-revalidation.yml','utf8');
 const start=f9.indexOf('const internalRuntimeObservationDeferred=');
 const end=f9.indexOf('const internalRuntimeFindingDeferred=',start);
 assert.ok(start>0&&end>start);
 const block=f9.slice(start,end);
 assert.match(block,/runtime\.authority==='exact-engine-version-awaiting-real-server-boot'/);
 assert.match(block,/runtime\.exactEngineVersion===true/);
 assert.match(block,/runtime\.engineExecuted===true/);
 assert.match(block,/runtime\.serverBootObserved!==true/);
 assert.match(block,/post\.internalRuntimeObservationDeferred===true/);
 assert.match(block,/post\.exactEngineExecutionEvidence===true/);
 assert.match(block,/post\.externalServerBootRequired===false/);
 assert.match(block,/post\.independentQaPassed===true/);
 assert.match(block,/post\.regressionPassed===true/);
 assert.doesNotMatch(block,/studioPlay\.|officialStudioMcp|actualPlay/);
});


test('runtime QA automatically validates the private candidate through Open Cloud while Studio stays deferred',()=>{
 const workflow=fs.readFileSync('.github/workflows/company-development-roblox-post-runtime-qa.yml','utf8');
 assert.match(workflow,/Probe exact Roblox Open Cloud engine execution/);
 assert.doesNotMatch(workflow,/Probe exact Roblox Open Cloud engine execution[\s\S]*?if: \$\{\{ inputs\.retry_open_cloud_only == true \}\}/);
 assert.match(workflow,/SERVER_DIAGNOSTIC_ENABLED: true/);
 assert.match(workflow,/ROBLOX_OPEN_CLOUD_API_KEY_REQUIRED_FOR_RUNTIME_VALIDATION/);
 assert.match(workflow,/const exactStudioInternalValidation=/);
 assert.match(workflow,/if: \$\{\{ inputs\.run_studio == true && inputs\.retry_open_cloud_only != true \}\}/);
 assert.match(workflow,/internalStudioValidationOnly:true/);
 assert.match(workflow,/externalServerBootRequired:false/);
 assert.match(workflow,/authority:'roblox-internal-studio-single-session-qa'/);
 assert.match(workflow,/ROBLOX_INTERNAL_STUDIO_SINGLE_SESSION_PASS=/);
 assert.match(workflow,/F1_F8=COLLECTED:F9=FAN_IN_ONLY/);
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


test('post-runtime F7 accepts multiplayer code contract and does not create two-client wait state',()=>{
 const workflow=fs.readFileSync('.github/workflows/company-development-roblox-post-runtime-qa.yml','utf8');
 assert.match(workflow,/validateRobloxMultiplayerSourceContract/);
 assert.match(workflow,/ROBLOX_F7_MULTIPLAYER_CODE_CONTRACT_PASS=/);
 assert.match(workflow,/runtimeTwoClientExecutionRequired:false/);
 assert.match(workflow,/authority:'roblox-static-two-client-source-contract'/);
 assert.match(workflow,/multiplayerReleasePassed=/);
 assert.match(workflow,/runtimeAcceptanceForRelease=/);
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

test('post-runtime QA never waits for live multiplayer measurement',()=>{
 const workflow=fs.readFileSync('.github/workflows/company-development-roblox-post-runtime-qa.yml','utf8');
 assert.match(workflow,/staticMultiplayerCodePass/);
 assert.match(workflow,/PASS_CODE_CONTRACT/);
 assert.match(workflow,/PENDING_CODE_CONTRACT/);
 assert.match(workflow,/multiplayerCodeContractMissing=multiplayer\.required===true&&!multiplayerReleasePassed/);
 assert.match(workflow,/ROBLOX_F7_MULTIPLAYER_CODE_CONTRACT_REPAIR=/);
 assert.doesNotMatch(workflow,/ROBLOX_TWO_CLIENT_ONE_SYNC_PENDING/);
 assert.doesNotMatch(workflow,/roblox-runtime-foundation-f7-two-client-one-sync/);
});
test('F7 multiplayer code proof is exact-source static evidence and remains reusable by artifact identity',()=>{
 const runtime=fs.readFileSync('.github/workflows/company-development-roblox-post-runtime-qa.yml','utf8');
 const finalReview=fs.readFileSync('.github/workflows/company-development-roblox-final-review-revalidation.yml','utf8');
 assert.match(runtime,/const multiplayerSourceContractFor=item=>/);
 assert.match(runtime,/validateRobloxMultiplayerSourceContract/);
 assert.match(runtime,/staticMultiplayerCodePass/);
 assert.match(runtime,/ROBLOX_F7_MULTIPLAYER_CODE_CONTRACT_PASS=/);
 assert.match(runtime,/authority:'roblox-static-two-client-source-contract'/);
 assert.match(runtime,/runtimeTwoClientExecutionRequired:false/);
 assert.match(runtime,/priorMultiplayer\.artifactIdentity===artifactIdentity/);
 assert.doesNotMatch(runtime,/priorRuntime\.f7MultiplayerFoundationPassed===true/);
 assert.match(finalReview,/post\.multiplayerValidationPassed===true/);
 assert.doesNotMatch(finalReview,/publishRobloxPlace/);
});
test('exact unchanged runtime candidate reuses verified server boot evidence',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-development-roblox-post-runtime-qa.yml','utf8');
  assert.match(workflow,/ROBLOX_OPEN_CLOUD_ENGINE_PROBE_SKIPPED_EXACT_EVIDENCE_REUSE/);
  assert.match(workflow,/ROBLOX_RUNTIME_EVIDENCE_REUSED=/);
  assert.match(workflow,/reusedServerBootEvidence:exactExternalRuntimeEvidenceReusable/);
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
  assert.doesNotMatch(workflow,/const throttlePressure=candidates\.some\(item=>/);
  assert.match(workflow,/const probeConcurrency=Math\.max\(1,Math\.min\(8,candidates\.length\|\|1\)\)/);
  assert.match(workflow,/ROBLOX_OPEN_CLOUD_PARALLEL_MODE=MAX8_FILL_AVAILABLE/);
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


test('Roblox post-runtime QA runs independently without cancelling active validation',()=>{
  const post=fs.readFileSync('.github/workflows/company-development-roblox-post-runtime-qa.yml','utf8');
  const f9=fs.readFileSync('.github/workflows/company-development-roblox-final-review-revalidation.yml','utf8');
  const postJobs=post.indexOf('\njobs:\n');
  const f9Jobs=f9.indexOf('\njobs:\n');
  assert.ok(postJobs>0&&f9Jobs>0);
  const postHeader=post.slice(0,postJobs);
  assert.match(postHeader,/group: roblox-runtime-foundation-\$\{\{ github\.run_id \}\}/);
  assert.match(postHeader,/cancel-in-progress: false/);
  assert.doesNotMatch(postHeader,/inputs\.game_id \|\| github\.sha/);
  assert.doesNotMatch(f9.slice(0,f9Jobs),/\nconcurrency:/);
});


test('F9 keeps only newest same-identity run and scan clears stale queued F9 work before deterministic review',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-development-roblox-final-review-revalidation.yml','utf8');
  const jobsAt=workflow.indexOf('\njobs:\n');
  assert.ok(jobsAt>0);
  assert.match(workflow,/run-name: Roblox F9 · \$\{\{ inputs\.game_id \|\| 'scan' \}\}/);
  assert.doesNotMatch(workflow.slice(0,jobsAt),/\nconcurrency:/);
  assert.match(workflow,/Cancel stale queued F9 runs before scan/);
  assert.match(workflow,/const states=new Set\(\['queued','pending','requested'\]\)/);
  assert.doesNotMatch(workflow.slice(workflow.indexOf('Cancel stale queued F9 runs before scan'),workflow.indexOf('Select newest same-identity F9 run')),/'in_progress'/);
  assert.match(workflow,/ROBLOX_STALE_F9_RUN_CANCELLED=/);
  assert.match(workflow,/ROBLOX_STALE_F9_RUN_CANCEL_COUNT=/);
  assert.match(workflow,/ROBLOX_F9_ACTIVE_WINNER=/);
  assert.match(workflow,/ROBLOX_F9_EXACT_DEDUPED=/);
  assert.match(workflow,/ROBLOX_F9_SCAN_DEDUPED_NEWER=/);
  assert.match(workflow,/process\.stdout\.write\(String\(ids\[ids\.length-1\]\)\)/);
  assert.match(workflow,/final-review:\n\s+needs: dedupe\n\s+if: needs\.dedupe\.outputs\.run == 'true'/);
});

test('post-runtime dedupe job uses the lightweight controller runner without a same-game job lock',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-development-roblox-post-runtime-qa.yml','utf8');
  const start=workflow.indexOf('  dedupe:');
  const end=workflow.indexOf('\n  runtime-foundation-qa:',start);
  const block=workflow.slice(start,end);
  assert.match(block,/runs-on:\s*ubuntu-slim/);
  assert.doesNotMatch(block,/\n\s+concurrency:/);
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

test('F9 persistence accepts the exact locally validated F0 artifact and rejects changed identity',()=>{
 const workflow=fs.readFileSync('.github/workflows/company-development-roblox-final-review-revalidation.yml','utf8');
 const persist=workflow.slice(workflow.indexOf('      - name: Persist F9 internal release state'));
 assert.match(workflow,/candidateOrigin:localF0Candidate\?'LOCAL_F0':'PERSISTED_RUNTIME'/);
 assert.match(persist,/delta\.candidateOrigin==='LOCAL_F0'/);
 assert.match(persist,/item\.robloxBuildSourceRevision\|\|''\)===String\(delta\.sourceRevision/);
 assert.match(persist,/f0\.sourceRevision\|\|''\)===String\(delta\.sourceRevision/);
 assert.match(persist,/f0\.artifactIdentity\|\|''\)===String\(delta\.artifactIdentity/);
 assert.match(persist,/f0\.artifactRunId\|\|item\.robloxHeadlessFastMvpEvidence\?\.artifactRunId/);
 assert.match(persist,/candidate\.published!==true/);
 assert.match(persist,/localF0Identity\|\|persistedRuntimeIdentity/);
 assert.match(persist,/EXACT_CANDIDATE_IDENTITY/);
});

test('F9 optimistic persistence binds the tested local artifact and fails closed on source or artifact drift',()=>{
 const workflow=fs.readFileSync('.github/workflows/company-development-roblox-final-review-revalidation.yml','utf8');
 const start=workflow.indexOf('            const candidate=item.robloxRuntimeCandidateEvidence||{};',workflow.indexOf('      - name: Persist F9 internal release state'));
 const end=workflow.indexOf('            if(!identityExact){',start);
 assert.ok(start>0&&end>start);
 const predicate=new Function('item','delta',workflow.slice(start,end)+'return identityExact;');
 const source='a'.repeat(40);
 const artifact='sha256:verified';
 const item={
   robloxSourceCommit:source,
   robloxBuildArtifactIdentity:artifact,
   robloxRuntimeCandidateEvidence:{published:false,versionNumber:12},
   robloxFoundationF0Passed:true,
   robloxBuildPreflightPassed:true,
   robloxBuildOrPackagePassed:true,
   robloxBuildSourceRevision:source,
   robloxFoundationF0Evidence:{sourceRevision:source,artifactIdentity:artifact,artifactRunId:50},
 };
 const delta={candidateOrigin:'LOCAL_F0',sourceRevision:source,artifactIdentity:artifact,candidateVersionNumber:50};
 assert.equal(predicate(item,delta),true,'local F0 run identity is authoritative even with an older runtime candidate');
 assert.equal(predicate({...item,robloxSourceCommit:'b'.repeat(40)},delta),false);
 assert.equal(predicate({...item,robloxFoundationF0Evidence:{...item.robloxFoundationF0Evidence,artifactIdentity:'sha256:changed'}},delta),false);
 assert.equal(predicate({...item,robloxFoundationF0Evidence:{...item.robloxFoundationF0Evidence,artifactRunId:51}},delta),false);
 assert.equal(predicate({...item,robloxRuntimeCandidateEvidence:{published:true}},delta),false);
});

test('F9 scan dedupe cancels only older queued runs and preserves a newer main scan',()=>{
 const workflow=fs.readFileSync('.github/workflows/company-development-roblox-final-review-revalidation.yml','utf8');
 const dedupe=workflow.slice(workflow.indexOf('      - name: Cancel stale queued F9 runs before scan'),workflow.indexOf('      - name: Select newest same-identity F9 run'));
 assert.match(dedupe,/Number\(r\.id\)>=Number\(process\.env\.CURRENT_RUN_ID\|\|0\)/);
 assert.match(dedupe,/String\(r\.head_sha\|\|''\)===String\(process\.env\.CURRENT_SHA\|\|''\)/);
 assert.match(dedupe,/states\.has\(String\(r\.status\|\|''\)\.toLowerCase\(\)\)/);
 assert.match(workflow,/CURRENT_CONTROL_SHA: \$\{\{ github\.sha \}\}/);
 assert.match(workflow,/String\(r\.head_sha\|\|''\)===controlSha/);
 assert.match(workflow,/ROBLOX_F9_CONTROL_SHA=/);
});

test('F9 runtime critical path reuses current-main contract QA instead of replaying repository tests per game',()=>{
 const workflow=fs.readFileSync('.github/workflows/company-development-roblox-final-review-revalidation.yml','utf8');
 const start=workflow.indexOf('\n  final-review:');
 const end=workflow.indexOf('\n      - name: Promote only the exact tested runtime candidate',start);
 const block=workflow.slice(start,end);
 const vibe3=fs.readFileSync('.github/workflows/vibe3-engine-contract.yml','utf8');
 assert.ok(start>0&&end>start);
 assert.match(block,/Verify only F9 executable syntax/);
 assert.match(block,/node --input-type=module --check < tools\/company-tester-debug-intake\.mjs/);
 assert.match(block,/ROBLOX_F9_CONTRACT_QA=REUSED_CURRENT_MAIN_CI/);
 assert.match(block,/ROBLOX_F9_CRITICAL_PATH_DUPLICATE_TESTS=0/);
 assert.doesNotMatch(block,/node --test/);
 assert.match(vibe3,/qa\/company-development-roblox-runtime-foundation\.test\.mjs/);
 assert.match(vibe3,/qa\/company-development-roblox-headless-fast-mvp\.test\.mjs/);
 assert.match(vibe3,/qa\/company-development-roblox-release-promotion\.test\.mjs/);
 assert.match(vibe3,/qa\/company-tester-debug-intake\.test\.mjs/);
 assert.match(vibe3,/qa\/vibe3-roblox-platform\.test\.mjs/);
});


test('F9 Vibe fan-in shell parses so verified publication never strands the next evolution',()=>{
 const workflow=fs.readFileSync('.github/workflows/company-development-roblox-final-review-revalidation.yml','utf8');
 const step=workflow.slice(workflow.indexOf('      - name: Fan verified F9 runtime proof into waiting Vibe Roblox tasks'));
 const body=step.slice(step.indexOf('        run: |\n')+'        run: |\n'.length);
 const script=body.split('\n').map(line=>line.startsWith('          ')?line.slice(10):line).join('\n');
 const result=spawnSync('bash',['-n'],{input:script,encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);
});

test('F9 fan-in reads a shallow Vibe queue and fetches each exact source revision once',()=>{
 const workflow=fs.readFileSync('.github/workflows/company-development-roblox-final-review-revalidation.yml','utf8');
 const fanin=workflow.slice(workflow.indexOf('      - name: Fan verified F9 runtime proof into waiting Vibe Roblox tasks'));
 assert.match(fanin,/--single-branch --depth 1 --filter=blob:none/);
 assert.match(fanin,/if ! git -C main cat-file -e "\$source_revision\^\{commit\}" 2>\/dev\/null; then/);
 assert.match(fanin,/git -C main fetch --no-tags --depth=1 origin "\$source_revision" --quiet/);
});

test('Roblox F0-F9 orchestration dispatches exact games without cross-game fan-in while preserving required serialization',()=>{
  const runtime=fs.readFileSync('.github/workflows/company-development-roblox-runtime.yml','utf8');
  const post=fs.readFileSync('.github/workflows/company-development-roblox-post-runtime-qa.yml','utf8');
  const f9=fs.readFileSync('.github/workflows/company-development-roblox-final-review-revalidation.yml','utf8');
  const release=fs.readFileSync('.github/workflows/company-development-roblox-release-promotion.yml','utf8');

  assert.match(runtime,/ROBLOX_PRE_F9_VALIDATION_TARGET=PRIVATE_DEDICATED/);
  assert.match(runtime,/ROBLOX_CANONICAL_GAME_TARGET_MUTATED=NO/);
  assert.match(runtime,/ROBLOX_STUDIO_REQUIRED_FOR_DEVELOPMENT_CONTINUATION=NO/);
  assert.match(runtime,/publish_stage=validation/);

  const f9Dispatch=post.slice(
    post.indexOf('Dispatch exact F9 review for every runtime-accepted candidate'),
    post.indexOf('Dispatch exact Studio MCP follow-up after new runtime foundation evidence')
  );
  assert.match(f9Dispatch,/company-development-roblox-final-review-revalidation\.yml[\s\S]*?-f game_id="\$id"/);
  assert.match(f9Dispatch,/ROBLOX_F9_EXACT_DISPATCH=DEDUPED_CURRENT_MAIN:/);
  assert.doesNotMatch(f9Dispatch,/--ref main\s*$/m);

  const foundationPersist=post.slice(
    post.indexOf('Persist runtime tester and QA evidence'),
    post.indexOf('Dispatch exact F9 review for every runtime-accepted candidate')
  );
  assert.match(post,/ROBLOX_FOUNDATION_RUNTIME_PATCH_COUNT=/);
  assert.match(foundationPersist,/ROBLOX_FOUNDATION_PERSIST_OPTIMISTIC_ATTEMPT=\$attempt\/5/);
  assert.match(foundationPersist,/ROBLOX_FOUNDATION_PERSIST_SAME_FIELD_CONFLICT=/);
  assert.match(foundationPersist,/EXACT_SOURCE_REVISION/);
  assert.match(foundationPersist,/EXACT_ARTIFACT_IDENTITY/);
  assert.match(foundationPersist,/EXACT_CANDIDATE_VERSION/);
  assert.match(post,/beforeUpdatedAt:String\(before\.updatedAt\|\|''\)/);
  assert.match(foundationPersist,/SAME_GAME_ATOMIC_STATE/);
  assert.match(foundationPersist,/ROBLOX_FOUNDATION_DOWNSTREAM_CONFLICT_FILTER_COUNT=/);
  assert.match(foundationPersist,/ROBLOX_FOUNDATION_CONFLICT_REVALIDATION_DISPATCHED=\$id/);
  assert.match(foundationPersist,/company-development-roblox-post-runtime-qa\.yml[\s\S]*?-f game_id="\$id"/);
  assert.doesNotMatch(foundationPersist,/git rebase/);
  assert.doesNotMatch(foundationPersist,/DEFERRED_TO_NEXT_CYCLE/);

  const studio=post.slice(post.indexOf('  studio-mcp-auto-play:'),post.indexOf('\n  studio-mcp-evidence:',post.indexOf('  studio-mcp-auto-play:')));
  assert.match(studio,/group: roblox-studio-shared-host/);
  assert.match(studio,/max-parallel:\s*1/);

  const publishAt=f9.indexOf('Dispatch exact F9-verified artifact to canonical Roblox game target');
  const continueAt=f9.indexOf('Immediately continue each successfully persisted Roblox F9 game');
  const fanInAt=f9.indexOf('Fan verified F9 runtime proof into waiting Vibe Roblox tasks');
  assert.ok(publishAt>=0&&continueAt>publishAt&&fanInAt>continueAt);
  const continueBlock=f9.slice(continueAt,fanInAt);
  assert.match(continueBlock,/company-development-confirmed-runtime\.yml[\s\S]*?-f game_id="\$id"/);
  assert.match(continueBlock,/trigger_source=ROBLOX_F9_PER_GAME_CONTINUATION/);
  assert.match(continueBlock,/roblox-f9-persist-same-field-conflicts/);
  assert.match(continueBlock,/ROBLOX_F9_NEXT_CYCLE_DISPATCH=DEDUPED_CURRENT_MAIN:/);
  assert.match(continueBlock,/String\(run\.head_sha\|\|''\)===currentSha/);
  assert.match(continueBlock,/ROBLOX_NEXT_EVOLUTION_CYCLE_DEPENDS_ON_PUBLICATION_OUTCOME=NO/);

  const releaseHeader=release.slice(0,release.indexOf('\njobs:\n'));
  assert.match(releaseHeader,/group: roblox-publish-exact-\$\{\{ inputs\.game_id \|\| 'sync' \}\}-\$\{\{ inputs\.publish_stage \|\| 'validation' \}\}-\$\{\{ github\.sha \}\}/);
  assert.match(releaseHeader,/cancel-in-progress: false/);
  assert.match(release,/retry_window_seconds=900/);
  assert.match(release,/ROBLOX_PUBLISH_SERVER_BUSY_ATTEMPT=/);
  assert.match(release,/company-development-roblox-final-review-revalidation\.yml --repo "\$GITHUB_REPOSITORY" --ref main -f game_id="\$GAME_ID"/);
});



test('Open Cloud engine reuses the same Luau session to capture map and world evidence',async()=>{
  const calls=[];
  const responses=[
    {ok:true,status:200,body:{path:'universes/1/places/2/versions/20/luau-execution-sessions/s/tasks/t',state:'PROCESSING'}},
    {ok:true,status:200,body:{state:'COMPLETE'}},
    {ok:true,status:200,body:{luauExecutionSessionTaskLogs:[{structuredMessages:[
      {message:'JAEWOON_OPEN_CLOUD_ENGINE_PLACE=2'},
      {message:'JAEWOON_OPEN_CLOUD_ENGINE_VERSION=20'},
      {message:'JAEWOON_OPEN_CLOUD_WORLD_BASEPARTS=42'},
      {message:'JAEWOON_OPEN_CLOUD_WORLD_SPAWNS=2'},
      {message:'JAEWOON_OPEN_CLOUD_WORLD_SPAWNS_IN_BOUNDS=true'},
      {message:'JAEWOON_OPEN_CLOUD_WORLD_BOUNDS_FINITE=true'},
      {message:'JAEWOON_OPEN_CLOUD_WORLD_BOUNDS_SIZE=100.00,20.00,80.00'},
      {message:'JAEWOON_OPEN_CLOUD_WORLD_LANDMARKS=3'},
      {message:'JAEWOON_OPEN_CLOUD_WORLD_OBJECTIVES=1'},
      {message:'JAEWOON_OPEN_CLOUD_WORLD_TERRAIN_PRESENT=true'},
      {message:'JAEWOON_OPEN_CLOUD_WORLD_LIGHTING_ATMOSPHERE=true'},
      {message:'JAEWOON_OPEN_CLOUD_WORLD_STREAMING_ENABLED=true'},
      {message:'JAEWOON_OPEN_CLOUD_WORLD_SCAN_CAPPED=false'}
    ]}]}}
  ];
  const fetchImpl=async(url,init={})=>{calls.push({url,init});const row=responses.shift();return {ok:row.ok,status:row.status,text:async()=>JSON.stringify(row.body)};};
  const result=await probeRobloxOpenCloudEngine({universeId:'1',placeId:'2',versionNumber:20,apiKey:'k',fetchImpl,pollIntervalMs:0,maxPolls:2});
  assert.equal(calls.length,3,'no extra Open Cloud request is added for world evidence');
  assert.equal(result.worldEvidence.sameLuauExecutionSession,true);
  assert.equal(result.worldEvidence.basePartCount,42);
  assert.equal(result.worldEvidence.spawnCount,2);
  assert.equal(result.worldEvidence.spawnsInBounds,true);
  assert.deepEqual(result.worldEvidence.boundsSize,{x:100,y:20,z:80});
  assert.equal(result.worldEvidence.landmarkCount,3);
  assert.equal(result.worldEvidence.objectiveCount,1);
  assert.equal(result.worldEvidence.terrainPresent,true);
  assert.equal(result.worldEvidence.lightingAtmospherePresent,true);
  assert.equal(result.worldEvidence.streamingEnabled,true);
  const body=JSON.parse(calls[0].init.body);
  assert.match(body.script,/JAEWOON_OPEN_CLOUD_WORLD_BOUNDS_SIZE/);
  assert.match(body.script,/workspace:GetDescendants\(\)/);
  const workflow=fs.readFileSync('.github/workflows/company-development-roblox-post-runtime-qa.yml','utf8');
  assert.match(workflow,/openCloudWorldEvidence:engineProbe\?\.worldEvidence\|\|null/);
});


test('Open Cloud requested game is isolated while empty game_id keeps bounded cross-game parallel batch scanning',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-development-roblox-post-runtime-qa.yml','utf8');
  const probeStart=workflow.indexOf("const candidates=(q.items||[]).filter(item=>{",workflow.indexOf('Probe exact Roblox Open Cloud engine execution'));
  const probeEnd=workflow.indexOf("fs.writeFileSync('/tmp/roblox-open-cloud-engine-probes.json'",probeStart);
  const probeBlock=workflow.slice(probeStart,probeEnd);
  const persistStart=workflow.indexOf("const candidates=(q.items||[]).filter(item=>{",workflow.indexOf('Read exact runtime sentinel and persist tester QA evidence'));
  const persistEnd=workflow.indexOf('const f9Ids=[];',persistStart);
  const persistBlock=workflow.slice(persistStart,persistEnd);
  assert.ok(probeStart>0&&probeEnd>probeStart);
  assert.ok(persistStart>0&&persistEnd>persistStart);
  assert.match(probeBlock,/if\(requested&&item\.gameId!==requested\)return false/);
  assert.match(persistBlock,/if\(requested&&item\.gameId!==requested\)return false/);
  assert.match(probeBlock,/retryOpenCloudOnly&&requested&&item\.gameId===requested/);
  assert.match(probeBlock,/const probeConcurrency=Math\.max\(1,Math\.min\(8,candidates\.length\|\|1\)\)/);
  assert.match(workflow,/ROBLOX_OPEN_CLOUD_REQUESTED_SCOPE=.*EXACT_GAME_ONLY.*ALL_PENDING_PARALLEL_BATCH/);
  assert.match(workflow,/ROBLOX_FOUNDATION_REQUESTED_SCOPE=.*EXACT_GAME_ONLY.*ALL_PENDING_PARALLEL_BATCH/);
  assert.match(workflow,/if\(sharedRotationEnabled&&!requested\)\{/);
  assert.match(probeBlock,/ROBLOX_OPEN_CLOUD_429_SCOPE=PER_GAME_RETRY_ONLY/);
  assert.doesNotMatch(probeBlock,/ACTIVE_SERIAL|ACTIVE_MIN4_PARALLEL/);
});
