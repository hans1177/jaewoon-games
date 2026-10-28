import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {MOTION_FORGE_FEATURES,MOTION_CRAFT_KNOBS,validateMotionCraftProfile,createVerifiedActorMotionVariants,validateMotionEvolutionEvidence,recordVerifiedMotionEvolution,planVerifiedActorEvolution} from '../tools/vibe2-motion-evolution.mjs';
import {mergeNativeMotionEvolutionEvidence} from '../tools/vibe2-learning-motor.mjs';

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
  assert.equal(first.bodyPlan,'UNCONFIRMED');
  assert.equal(first.sourceVerifiedMotionVariantPlan.status,'ACTUAL_RIG_BODY_PLAN_CONFIRMATION_REQUIRED');
  const rigConfirmed=planVerifiedActorEvolution({
   gameId:'P1001',generation:1,actorCandidates:[{actorClass:'BOSS',bodyPlan:'GIANT',files:['server/Boss.server.luau']}]
  });
  assert.equal(rigConfirmed.bodyPlan,'GIANT');
  assert.equal(rigConfirmed.sourceVerifiedMotionVariantPlan.variants.length,3);
  const event=recordVerifiedMotionEvolution([],{...base,featureId:MOTION_FORGE_FEATURES[0],afterScore:98});
  assert.equal(event.accepted,true);
  const plan=planVerifiedActorEvolution({gameId:'P1001',generation:5,actorCandidates:actors,history:event.records});
  assert.ok(plan.actorClass);
  assert.notEqual(plan.featureId,MOTION_FORGE_FEATURES[0],'strong verified axis should not endlessly dominate');
  assert.equal(plan.runtimeVerified,false,'planning is not playback proof');
  const empty=planVerifiedActorEvolution({gameId:'P1001',generation:15,actorCandidates:[]});
  assert.equal(empty.actorClass,null);
});

test('existing Vibe learning motor ingests only independently checked motion samples',()=>{
  const unverified={...base,evidenceId:'bad-motion',nativePlaybackObserved:false};
  const result=mergeNativeMotionEvolutionEvidence({history:[],
    queueInput:{motionEvolutionEvidence:[unverified]},
    companyQueueInput:{motionEvolutionEvidence:[base]}});
  assert.equal(result.accepted,1);
  assert.equal(result.rejected,1);
  assert.equal(result.changed,true);
  assert.equal(result.records.length,1);
  assert.equal(result.records[0].evidenceId,base.evidenceId);
  const repeated=mergeNativeMotionEvolutionEvidence({history:result.records,
    companyQueueInput:{motionEvolutionEvidence:[base]}});
  assert.equal(repeated.changed,false);
  assert.equal(repeated.records.length,1);
});


test('15 motion features generate bounded A/B/C candidates without model calls or gameplay authority',()=>{
 assert.equal(Object.keys(MOTION_CRAFT_KNOBS).length,12);
 assert.equal(validateMotionCraftProfile({damage:1000,attackStrike:1.2}),false);
 assert.equal(validateMotionCraftProfile({footContact:1.2,recovery:.88}),true);
 for(const featureId of MOTION_FORGE_FEATURES){
  const plan=createVerifiedActorMotionVariants({
   gameId:'P1001',actorClass:'BOSS',bodyPlan:'GIANT',featureId,generation:1,history:[],
  });
  assert.equal(plan.variants.length,3,featureId);
  assert.equal(plan.status,'SOURCE_GROUNDED_EXPERIMENT',featureId);
  assert.equal(plan.noProductionPromotionWithoutQA,true,featureId);
  assert.ok(plan.variants.every(v=>validateMotionCraftProfile(v.profile)),featureId);
  assert.equal(plan.variants[0].verified,false,featureId);
 }
});
test('same-game same-actor native QA refines a proven baseline with increasingly smaller perturbations',()=>{
 const featureId='FULL_BODY_WEIGHT_TRANSFER';
 const proof={...base,bodyPlan:'GIANT',featureId,profile:{limbArc:1.1,headLead:.94}};
 assert.equal(validateMotionEvolutionEvidence(proof).pass,true);
 const initial=createVerifiedActorMotionVariants({gameId:'P1001',actorClass:'BOSS',bodyPlan:'GIANT',featureId,generation:2});
 const learned=createVerifiedActorMotionVariants({gameId:'P1001',actorClass:'BOSS',bodyPlan:'GIANT',featureId,generation:2,history:[proof]});
 assert.equal(initial.verifiedSamples,0);
 assert.equal(learned.verifiedSamples,1);
 assert.equal(learned.status,'VERIFIED_BASELINE_REFINEMENT');
 assert.equal(learned.variants[0].verified,true);
 assert.equal(learned.variants[0].profile.limbArc,1.1);
 assert.equal(learned.baselineSourceEvidenceId,'real-replay-1');
 assert.ok(learned.step<initial.step);
 assert.equal(createVerifiedActorMotionVariants({gameId:'OTHER',actorClass:'BOSS',bodyPlan:'GIANT',featureId,history:[proof]}).verifiedSamples,0);
 assert.equal(createVerifiedActorMotionVariants({gameId:'P1001',actorClass:'BOSS',bodyPlan:'QUADRUPED',featureId,history:[proof]}).verifiedSamples,0);
 assert.equal(validateMotionEvolutionEvidence({...proof,profile:{health:99}}).pass,false);
});
test('procedural native actor clip authoring is bounded to real rig and preserves gameplay authority',()=>{
 const code=fs.readFileSync('assets/roblox/common-motion-v1/RobloxCommonMotion.luau','utf8');
 for(const api of ['SampleProceduralActorMotion','CreateProceduralActorSequence','RetargetExistingActorPose']){
  assert.match(code,new RegExp('function RobloxCommonMotion\\.'+api+'\\('));
 }
 for(const state of ['IDLE','WALK','RUN','TURN','START','STOP','ATTACK','HIT','DEATH','INTERACT','GESTURE','FLY']){
  assert.ok(code.includes(state+'={duration='),state+' native procedural state missing');
 }
 for(const knob of Object.keys(MOTION_CRAFT_KNOBS))
  assert.ok(code.includes('gain("'+knob+'"'),knob+' must change real joint output through bounded gains');
 assert.match(code,/ACTOR_RIG_MOTION_CHANNEL_MISMATCH/);
 assert.match(code,/function RobloxCommonMotion\.PreviewProceduralActorMotion\(/);
 assert.match(code,/REAL_ACTOR_RIG_REQUIRED/);
 assert.match(code,/REAL_ANIMATED_JOINTS_REQUIRED/);
 assert.match(code,/RootMotionOwned",false/);
 assert.match(code,/RuntimeVerificationState","PENDING_NATIVE_ACTOR_PLAYBACK/);
});
