import test from 'node:test';
import assert from 'node:assert/strict';
import {validateRobloxRuntimeFoundationEvidence} from '../tools/company-development-roblox-runtime-foundation.mjs';

const checkpoint=name=>({name,at:1,userId:1,gameId:'cozy-island',placeId:116850096561713,placeVersion:21});
const names=['SERVER_BOOT','MODULE_GRAPH_READY','WORLD_READY','SPAWN_READY','CHARACTER_READY','GROUND_CONTACT','CAMERA_READY','INPUT_READY','MOVEMENT_CONFIRMED','REMOTE_ROUNDTRIP','SAVE_ROUNDTRIP','MULTIPLAYER_SYNC','CORE_LOOP_READY'];
const good={gameId:'cozy-island',placeId:116850096561713,placeVersion:21,requirements:{saveEnabled:true,multiplayerRequired:true},checkpoints:Object.fromEntries(names.map(x=>[x,checkpoint(x)]))};

test('actual Roblox sentinel passes F1 through F8 only for the exact deployed place version',()=>{
 const r=validateRobloxRuntimeFoundationEvidence({sentinel:good,gameId:'cozy-island',placeId:'116850096561713',versionNumber:21});
 assert.equal(r.runtimeFoundationPassed,true);
 assert.equal(r.runtimeAcceptancePassed,true);
 for(const field of ['f1ServerBootPassed','f2WorldFoundationPassed','f3CharacterFoundationPassed','f4PhysicsAndMovementPassed','f5InputCameraUiPassed','f6CoreServicesPassed','f7MultiplayerFoundationPassed','f8GameplaySystemsPassed'])assert.equal(r[field],true,field);
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
