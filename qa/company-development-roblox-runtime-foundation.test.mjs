import test from 'node:test';
import assert from 'node:assert/strict';
import {validateRobloxRuntimeFoundationEvidence} from '../tools/company-development-roblox-runtime-foundation.mjs';

const checkpoint=name=>({name,at:1,userId:1});
const good={gameId:'cozy-island',placeId:116850096561713,placeVersion:21,checkpoints:Object.fromEntries(['SERVER_BOOT','WORLD_READY','SPAWN_READY','CHARACTER_READY','GROUND_CONTACT','CAMERA_READY','INPUT_READY','MOVEMENT_CONFIRMED'].map(x=>[x,checkpoint(x)]))};

test('actual Roblox foundation sentinel passes F1 through F4 only for exact deployed place version',()=>{
 const r=validateRobloxRuntimeFoundationEvidence({sentinel:good,gameId:'cozy-island',placeId:'116850096561713',versionNumber:21});
 assert.equal(r.runtimeFoundationPassed,true);
 assert.equal(r.f1ServerBootPassed,true);assert.equal(r.f2WorldFoundationPassed,true);assert.equal(r.f3CharacterFoundationPassed,true);assert.equal(r.f4PhysicsAndMovementPassed,true);
});

test('foundation sentinel blocks floating character evidence without ground contact',()=>{
 const broken=structuredClone(good);delete broken.checkpoints.GROUND_CONTACT;
 const r=validateRobloxRuntimeFoundationEvidence({sentinel:broken,gameId:'cozy-island',placeId:'116850096561713',versionNumber:21});
 assert.equal(r.runtimeFoundationPassed,false);assert.ok(r.blockers.includes('checkpoint:GROUND_CONTACT'));
});

test('foundation sentinel blocks stale evidence from another published version',()=>{
 const r=validateRobloxRuntimeFoundationEvidence({sentinel:good,gameId:'cozy-island',placeId:'116850096561713',versionNumber:22});
 assert.equal(r.runtimeFoundationPassed,false);assert.ok(r.blockers.includes('exactVersion'));
});
