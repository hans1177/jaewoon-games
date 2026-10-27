import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {MOTION_FORGE_FEATURES,validateMotionEvolutionEvidence,recordVerifiedMotionEvolution,planVerifiedActorEvolution} from '../tools/vibe2-motion-evolution.mjs';

const base={
  gameId:'P1001',platform:'ROBLOX',actorClass:'BOSS',featureId:'FULL_BODY_WEIGHT_TRANSFER',
  sourceRevision:'a'.repeat(40),candidateRevision:'b'.repeat(40),
  sourceOwnerFile:'client/Game.client.luau',evidenceId:'real-replay-1',nativeReplayId:'action-1234',
  actualPlatformRuntime:true,actualActorObserved:true,nativePlaybackObserved:true,
  independentQaPassed:true,gameplayAuthorityPreserved:true,
  sameActor:true,sameScene:true,sameDevice:true,sameInput:true,sameFrameLimit:true,
  beforeScore:42,afterScore:66,regressionCount:0
};
const actors=[
 {actorClass:'BOSS',files:['server/Boss.server.luau']},
 {actorClass:'NPC',files:['client/Npc.client.luau']},
 {actorClass:'CREATURE',files:['client/Creature.client.luau']}
];
test('15 distinct non-gameplay motion craft axes exist in native Roblox library',()=>{
  assert.equal(MOTION_FORGE_FEATURES.length,15);
  assert.equal(new Set(MOTION_FORGE_FEATURES).size,15);
  const native=fs.readFileSync('assets/roblox/common-motion-v1/RobloxCommonMotion.luau','utf8');
  for(const axis of MOTION_FORGE_FEATURES)assert.ok(native.includes('"'+axis+'"'),axis);
  for(const symbol of ['RefineActorCinematicPose','BlendExistingActorPoses','RetargetExistingActorPose','DescribeMotionForge']){
    assert.ok(native.includes('function RobloxCommonMotion.'+symbol+'('),symbol);
  }
  assert.match(native,/gameplayAuthority=false/);
  assert.match(native,/rootMotionOwned=false/);
  const s=fs.readFileSync('roblox-games/simple-rpg/client/Game.client.luau','utf8');
  const fantasy=fs.readFileSync('roblox-games/fantasy-survival/client/Game.client.luau','utf8');
  assert.match(s,/commonMotion\.RefineActorCinematicPose\(motionTargets/);
  assert.match(fantasy,/combatMotionSource\.RefineActorCinematicPose\(combatPoseTargets/);
});
test('no model, no unverified source score, and no self-certifying evolution',()=>{
  assert.equal(validateMotionEvolutionEvidence({}).pass,false);
  assert.equal(validateMotionEvolutionEvidence({...base,actualPlatformRuntime:false}).pass,false);
  assert.equal(validateMotionEvolutionEvidence({...base,independentQaPassed:false}).pass,false);
  assert.equal(validateMotionEvolutionEvidence({...base,sourceRevision:base.candidateRevision}).pass,false);
  assert.equal(validateMotionEvolutionEvidence({...base,regressionCount:1}).pass,false);
  assert.equal(validateMotionEvolutionEvidence({...base,afterScore:43}).pass,false);
  assert.equal(validateMotionEvolutionEvidence({...base,sourceOwnerFile:'../../escape'}).pass,false);
  assert.equal(recordVerifiedMotionEvolution([],{...base,nativePlaybackObserved:false}).accepted,false);
});
test('game-specific evolution alternates actor types and prioritizes verified weak craft axes',()=>{
  const first=planVerifiedActorEvolution({gameId:'P1001',generation:1,actorCandidates:actors});
  const second=planVerifiedActorEvolution({gameId:'P1001',generation:2,actorCandidates:actors});
  const third=planVerifiedActorEvolution({gameId:'P1001',generation:3,actorCandidates:actors});
  assert.deepEqual([first.actorClass,second.actorClass,third.actorClass],['BOSS','NPC','CREATURE']);
  assert.equal(first.runtimeVerified,false);
  assert.equal(first.evidenceCount,0);
  const event=recordVerifiedMotionEvolution([],{...base,featureId:MOTION_FORGE_FEATURES[0],afterScore:98});
  assert.equal(event.accepted,true);
  const plan=planVerifiedActorEvolution({gameId:'P1001',generation:5,actorCandidates:actors,history:event.records});
  assert.ok(plan.actorClass);
  assert.notEqual(plan.featureId,MOTION_FORGE_FEATURES[0],'strong verified axis should not endlessly dominate');
  assert.equal(plan.runtimeVerified,false,'planning is not playback proof');
  const empty=planVerifiedActorEvolution({gameId:'P1001',generation:15,actorCandidates:[]});
  assert.equal(empty.actorClass,null);
});
