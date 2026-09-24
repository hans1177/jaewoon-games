import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MOTION_DIRECTOR_TARGET,
  MOTION_COMPOSITION_CHANNELS,
  MOTION_DNA_FIELDS,
  MOTION_LIBRARY_GRAPH_NODES,
  createMotionDNA,
  scoreMotionCandidate,
  selectContextMotion,
  composeMotionStack,
  createMotionCompatibilityGraph,
  buildSkillMotionSequence,
  createReactionMatch,
  createPairMotionContract,
  deriveMotionStyleVariant,
  mutateMotionVariant,
  createVariationMemory,
  createSpeciesSignature,
  createMotionDirectorPlan
} from '../assets/vibe-motion-director.js';

test('motion DNA captures high-end compatibility metadata',()=>{
  const dna=createMotionDNA({
    id:'goblin-slash',
    bodyPlan:'small_humanoid_biped',
    rigProfile:'humanoid',
    styleFamily:'cartoon',
    weaponFamily:'one_hand_sword',
    combatRole:'opener',
    contactLimb:'right_hand',
    mirrorSafe:true,
    compatibilityTags:['SMALL_HUMANOID_BIPED','HUMANOID'],
    runtimeVerificationState:'verified_runtime'
  });
  assert.equal(dna.MOTION_ID,'goblin-slash');
  assert.equal(dna.BODY_PLAN,'SMALL_HUMANOID_BIPED');
  assert.equal(dna.STYLE_FAMILY,'CARTOON');
  assert.equal(dna.MIRROR_SAFE,true);
  assert.ok(dna.COMPATIBILITY_TAGS.includes('HUMANOID'));
  assert.ok(MOTION_DNA_FIELDS.includes('REACTION_ROLE'));
});

test('context selector rejects incompatible body plans and penalizes immediate repeats',()=>{
  const candidates=[
    {id:'wolf-bite',dna:createMotionDNA({id:'wolf-bite',bodyPlan:'QUADRUPED',rigProfile:'GENERIC',combatRole:'OPENER',runtimeVerificationState:'VERIFIED_RUNTIME'})},
    {id:'goblin-slash-a',dna:createMotionDNA({id:'goblin-slash-a',bodyPlan:'SMALL_HUMANOID_BIPED',rigProfile:'HUMANOID',combatRole:'OPENER',runtimeVerificationState:'VERIFIED_RUNTIME'})},
    {id:'goblin-slash-b',dna:createMotionDNA({id:'goblin-slash-b',bodyPlan:'SMALL_HUMANOID_BIPED',rigProfile:'HUMANOID',combatRole:'OPENER',runtimeVerificationState:'VERIFIED_RUNTIME'})}
  ];
  const bad=scoreMotionCandidate(candidates[0],{bodyPlan:'SMALL_HUMANOID_BIPED',rigProfile:'HUMANOID'},[]);
  assert.equal(bad.valid,false);
  assert.equal(bad.rejectedBy,'BODY_PLAN');
  const selected=selectContextMotion({
    candidates,
    context:{bodyPlan:'SMALL_HUMANOID_BIPED',rigProfile:'HUMANOID',combatRole:'OPENER'},
    recentMotionIds:['goblin-slash-a']
  });
  assert.equal(selected.selectedId,'goblin-slash-b');
  assert.equal(selected.deterministic,true);
  assert.equal(selected.gameplayAuthority,false);
});

test('body layer composer detects conflicting root translation ownership',()=>{
  const valid=composeMotionStack({
    layers:{LOCOMOTION:{id:'run',ownsTranslation:false},UPPER_BODY:{id:'bow-aim'}},
    dna:{id:'run-bow',bodyPlan:'HUMANOID'}
  });
  assert.equal(valid.valid,true);
  const invalid=composeMotionStack({
    layers:{ROOT:{id:'root',ownsTranslation:true},LOWER_BODY:{id:'run',ownsTranslation:true}},
    dna:{id:'bad-stack'}
  });
  assert.equal(invalid.valid,false);
  assert.ok(invalid.conflicts.includes('ROOT_TRANSLATION_DOUBLE_AUTHORITY'));
  assert.ok(MOTION_COMPOSITION_CHANNELS.includes('WINGS'));
});

test('skill grammar supports composable phases without gameplay timing authority',()=>{
  const skill=buildSkillMotionSequence({prepare:'prepare',charge:'charge',aim:'aim',release:'release',impact:'impact_response',recovery:'recovery'});
  assert.equal(skill.valid,true);
  assert.deepEqual([...skill.requiredCore],['PREPARE','RELEASE','RECOVERY']);
  assert.equal(skill.gameplayTimingAuthority,false);
});

test('reaction matcher uses direction strength airborne and wall context',()=>{
  const wall=createReactionMatch({impactDirection:'left',impactStrength:'heavy',wallProximity:'near'});
  assert.equal(wall.output,'WALL_HIT');
  assert.equal(wall.tags.direction,'LEFT');
  const air=createReactionMatch({impactStrength:'light',airborneState:'airborne'});
  assert.equal(air.output,'AIR_HIT');
  assert.equal(air.gameplayHitResultAuthoritative,true);
});

test('pair motion keeps attacker receiver alignment presentation-only',()=>{
  const pair=createPairMotionContract({
    id:'minotaur-throw',
    family:'throw',
    attackerMotion:'minotaur-throw-a',
    receiverMotion:'victim-throw-react-a',
    contactPoints:['RIGHT_HAND_CHEST','LEFT_HAND_SHOULDER'],
    timingMarkers:['LOCK','IMPACT','SEPARATE']
  });
  assert.equal(pair.family,'THROW');
  assert.equal(pair.roles.ATTACKER,'minotaur-throw-a');
  assert.equal(pair.perPlatformReauthoringAndRuntimeVerificationRequired,true);
  assert.equal(pair.gameplayAuthority,false);
});

test('style derivation exaggerates presentation while preserving gameplay semantics',()=>{
  const variant=deriveMotionStyleVariant({
    parentId:'minotaur-charge',
    style:'cartoon',
    modifiers:{poseExaggeration:1.6,anticipationScale:1.4,squashStretch:.5}
  });
  assert.equal(variant.style,'CARTOON');
  assert.equal(variant.modifiers.poseExaggeration,1.6);
  assert.equal(variant.preserve.gameplaySpeed,true);
  assert.equal(variant.preserve.hitboxSemantics,true);
  assert.equal(variant.preserve.contactMarkerSync,true);
});

test('motion mutation blocks gameplay mutation and allows presentation mutation',()=>{
  const blocked=mutateMotionVariant({parentId:'slash',mutation:'damage_change',value:2});
  assert.equal(blocked.allowed,false);
  const allowed=mutateMotionVariant({parentId:'slash',mutation:'pose_exaggeration',value:1.3,provenance:'company'});
  assert.equal(allowed.allowed,true);
  assert.equal(allowed.requiresRuntimeQa,true);
});

test('variation memory tracks recent motions and prevents mechanical repetition',()=>{
  const memory=createVariationMemory({history:['a','b'],maxSize:3});
  assert.equal(memory.penalty('b'),100);
  memory.push('c');
  memory.push('d');
  assert.deepEqual([...memory.history],['b','c','d']);
  assert.equal(memory.penalty('b'),25);
});

test('compatibility graph blocks unresolved required edges',()=>{
  const graph=createMotionCompatibilityGraph({
    nodes:[{id:'goblin',kind:'CREATURE'},{id:'goblin-rig',kind:'RIG'}],
    edges:[
      {from:'goblin',to:'goblin-rig',type:'USES_RIG',verified:true},
      {from:'goblin',to:'missing-motion',type:'USES_MOTION',verified:false}
    ]
  });
  assert.equal(graph.valid,false);
  assert.equal(graph.unresolved.length,1);
  assert.ok(MOTION_LIBRARY_GRAPH_NODES.includes('SKILL_MOTION_LIBRARY'));
});

test('species signature reserves non-generic slots for important creatures',()=>{
  const signature=createSpeciesSignature({archetype:'minotaur',attack:'horn-charge',death:'heavy-collapse'});
  assert.equal(signature.archetype,'MINOTAUR');
  assert.equal(signature.slots.ATTACK_SIGNATURE,'horn-charge');
  assert.equal(signature.importantCreatureRequiresNonGenericSignature,true);
});

test('motion director plan composes systems and remains presentation-only',()=>{
  const plan=createMotionDirectorPlan({
    platform:'ROBLOX',
    bodyPlan:'HEAVY_BIPED',
    rigProfile:'CUSTOM_RIG',
    styleFamily:'CARTOON',
    motionCandidates:[{
      id:'horn-charge',
      dna:createMotionDNA({
        id:'horn-charge',bodyPlan:'HEAVY_BIPED',rigProfile:'CUSTOM_RIG',styleFamily:'CARTOON',
        combatRole:'GAP_CLOSER',platformVariant:'ROBLOX',runtimeVerificationState:'VERIFIED_RUNTIME'
      })
    }],
    context:{combatRole:'GAP_CLOSER'},
    layers:{LOCOMOTION:{id:'charge-run'},UPPER_BODY:{id:'horn-gore'}},
    recentMotionIds:[]
  });
  assert.equal(plan.target,MOTION_DIRECTOR_TARGET);
  assert.equal(plan.selector.selectedId,'horn-charge');
  assert.equal(plan.composition.valid,true);
  assert.equal(plan.continuousExpansion,true);
  assert.equal(plan.noArtificialCombinationCap,true);
  assert.equal(plan.gameplayAuthority,false);
});
