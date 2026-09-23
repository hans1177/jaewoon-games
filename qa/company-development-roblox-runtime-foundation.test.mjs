import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {probeRobloxOpenCloudEngine,validateRobloxRuntimeFoundationEvidence} from '../tools/company-development-roblox-runtime-foundation.mjs';

const checkpoint=(name,sequence)=>({name,at:1,sequence,userId:1,gameId:'cozy-island',placeId:116850096561713,placeVersion:21});
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

test('Open Cloud engine probe reports missing scope without fabricating evidence',async()=>{
 const fetchImpl=async()=>({ok:false,status:403,text:async()=>JSON.stringify({message:'forbidden'})});
 const r=await probeRobloxOpenCloudEngine({universeId:'1',placeId:'2',versionNumber:20,apiKey:'k',fetchImpl,pollIntervalMs:0,maxPolls:1});
 assert.equal(r.available,false);
 assert.equal(r.permissionDenied,true);
 assert.equal(r.engineExecuted,false);
 assert.equal(r.exactVersion,false);
});
