import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  MOTION_DIRECTOR_TARGET,
  MOTION_COMPOSITION_CHANNELS,
  MOTION_DNA_FIELDS,
  MOTION_LIBRARY_GRAPH_NODES,
  ROBLOX_CHARACTER_MOTION_FAILURE,
  ROBLOX_MOTION_SOURCE_PRIORITY,
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
  createCreatureMotionSetProfile,
  motionSetToCandidates,
  estimateMotionCombinationSpace,
  resolveMotionCoverageRequirements,
  auditMotionCoverage,
  motionSemanticFingerprint,
  findNearDuplicateMotionCandidates,
  findCompatibleMotionDonors,
  scoreMotionGapPriority,
  buildAutomaticMotionGapFillPlan,
  applySemanticGapPreparation,
  evaluateMotionTransition,
  auditMotionContact,
  bindGameplayEventToMotion,
  createProceduralMotionProfile,
  createGroupMotionPlan,
  createMultiActorMotionContract,
  createEmotionIntentLayer,
  selectMotionLod,
  createMotionLineage,
  aggregateRuntimeMotionSignals,
  buildRuntimeMotionLearningCandidate,
  selectRobloxCharacterMotionSource,
  createRobloxMotionBlendProfile,
  createRobloxCharacterMotionPlan,
  auditRobloxCharacterMotionEvidence,
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


test('company motion bootstrap seeds diverse creature sets without false verified claims',()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const registry=JSON.parse(fs.readFileSync(path.resolve(here,'..','company-asset-library.json'),'utf8'));
  assert.equal(registry.motionBootstrap.status,'PREPARED_SEMANTIC_LIBRARY');
  assert.equal(registry.motionBootstrap.productionVerified,false);
  assert.equal(registry.motionBootstrap.sets.length>=8,true);
  const ids=new Set(registry.motionBootstrap.sets.map(row=>row.id));
  for(const id of ['goblin-small-biped','minotaur-heavy-biped','wolf-quadruped','bear-heavy-quadruped','spider-arachnid','snake-serpent','flying-predator','golem-heavy']){
    assert.equal(ids.has(id),true);
  }
  const minotaur=registry.motionBootstrap.sets.find(row=>row.id==='minotaur-heavy-biped');
  assert.ok(minotaur.attacks.includes('MINOTAUR_HORN_GORE'));
  assert.ok(minotaur.reactions.includes('MINOTAUR_WALL_IMPACT'));
  assert.ok(minotaur.deaths.includes('MINOTAUR_HEAVY_COLLAPSE'));
  const spider=registry.motionBootstrap.sets.find(row=>row.id==='spider-arachnid');
  assert.ok(spider.locomotion.includes('SPIDER_CEILING_CRAWL'));
  assert.ok(spider.deaths.includes('SPIDER_LEGS_CURL_DEATH'));
});

test('prepared creature set expands into Motion DNA candidates but remains unverified',()=>{
  const profile=createCreatureMotionSetProfile({
    id:'goblin',
    archetype:'GOBLIN',
    bodyPlan:'SMALL_HUMANOID_BIPED',
    rigProfile:'HUMANOID',
    weightClass:'LIGHT_FAST',
    locomotion:['GOBLIN_RUN'],
    attacks:['GOBLIN_SLASH'],
    reactions:['GOBLIN_HIT'],
    signature:['GOBLIN_SLASH'],
    compatibleStyles:['CARTOON','STYLIZED_FANTASY']
  });
  assert.equal(profile.productionVerified,false);
  const candidates=motionSetToCandidates(profile,'ROBLOX','CARTOON');
  assert.equal(candidates.length,3);
  const attack=candidates.find(row=>row.id==='GOBLIN_SLASH');
  assert.equal(attack.dna.BODY_PLAN,'SMALL_HUMANOID_BIPED');
  assert.equal(attack.dna.PLATFORM_VARIANT,'ROBLOX');
  assert.equal(attack.dna.STYLE_FAMILY,'CARTOON');
  assert.equal(attack.preparedSemanticOnly,true);
});

test('motion combination estimator reports theoretical space without artificial cap',()=>{
  const space=estimateMotionCombinationSpace({
    layers:{
      locomotion:['walk','run','dash'],
      upperBody:['slash','stab','guard','cast'],
      headGaze:['target','scan']
    },
    styleVariants:['cartoon','dark'],
    reactionVariants:['light','heavy','wall'],
    pairVariants:['none','throw']
  });
  assert.equal(space.theoreticalCombinationCount,288);
  assert.equal(space.artificialCapApplied,false);
});


test('coverage audit detects missing motion groups by body plan',()=>{
  const flying=createCreatureMotionSetProfile({
    id:'bird',archetype:'BIRD',bodyPlan:'FLYING',rigProfile:'GENERIC_WINGED',
    locomotion:['TAKEOFF','FLY'],attacks:['DIVE'],defense:[],reactions:['HIT'],acting:[],deaths:['DEATH'],skill:[],signature:['DIVE']
  });
  const req=resolveMotionCoverageRequirements(flying);
  assert.equal(req.minimums.locomotion,8);
  assert.ok(req.requiredRoles.includes('HOVER'));
  const audit=auditMotionCoverage(flying);
  assert.equal(audit.complete,false);
  assert.ok(audit.gaps.some(row=>row.group==='locomotion'&&row.missing===6));
  assert.ok(audit.requiredRoleGaps.includes('HOVER'));
});

test('compatible donor binder rejects different body plans and protects signature identity',()=>{
  const target=createCreatureMotionSetProfile({
    id:'goblin-new',archetype:'GOBLIN',bodyPlan:'SMALL_HUMANOID_BIPED',rigProfile:'HUMANOID',
    locomotion:['GOBLIN_IDLE'],signature:['GOBLIN_ATTACK_SIGNATURE']
  });
  const sameBody=createCreatureMotionSetProfile({
    id:'kobold',archetype:'KOBOLD',bodyPlan:'SMALL_HUMANOID_BIPED',rigProfile:'HUMANOID',
    locomotion:['KOBOLD_RUN','KOBOLD_TURN'],signature:['KOBOLD_SIGNATURE'],verificationState:'VERIFIED_RUNTIME'
  });
  const wolf=createCreatureMotionSetProfile({
    id:'wolf',archetype:'WOLF',bodyPlan:'QUADRUPED_CANINE',rigProfile:'GENERIC_QUADRUPED',
    locomotion:['WOLF_RUN'],verificationState:'VERIFIED_RUNTIME'
  });
  const locomotion=findCompatibleMotionDonors({targetProfile:target,librarySets:[sameBody,wolf],group:'locomotion'});
  assert.equal(locomotion.length,1);
  assert.equal(locomotion[0].id,'kobold');
  assert.equal(locomotion[0].productionVerified,true);
  const signatures=findCompatibleMotionDonors({targetProfile:target,librarySets:[sameBody],group:'signature'});
  assert.equal(signatures.length,0);
});

test('automatic gap fill plans safe routes and semantic seeds without false promotion',()=>{
  const target=createCreatureMotionSetProfile({
    id:'new-minotaur',archetype:'MINOTAUR',bodyPlan:'HEAVY_BIPED',rigProfile:'GENERIC_OR_EXTENDED_HUMANOID',
    locomotion:['MINOTAUR_IDLE'],attacks:['MINOTAUR_PUNCH'],defense:[],reactions:['MINOTAUR_HIT'],acting:[],deaths:['MINOTAUR_DEATH'],skill:[],signature:['MINOTAUR_HORN_GORE']
  });
  const external=[{id:'licensed-motion-source',category:'MOTION',status:'LICENSE_VERIFIED_EXTERNAL_CANDIDATE'}];
  const plan=buildAutomaticMotionGapFillPlan({
    profile:target,
    librarySets:[],
    externalSources:external,
    usage:{activeGameConsumer:true,heroOrBoss:true,combatCritical:true}
  });
  assert.equal(plan.audit.complete,false);
  assert.equal(plan.semanticPreparationCannotCreateVerifiedCoverage,true);
  assert.equal(plan.runtimeVerificationRequired,true);
  assert.ok(plan.actions.length>0);
  assert.ok(plan.actions.every(row=>row.promotionBlockedUntilRuntimeQa===true));
  assert.ok(plan.actions.some(row=>row.route==='ACQUIRE_LICENSE_VERIFIED_EXTERNAL_MOTION'));
  const prepared=applySemanticGapPreparation({profile:target,gapPlan:plan});
  assert.equal(prepared.productionVerified,false);
  assert.equal(prepared.state,'PREPARED_SEMANTIC');
  assert.ok(prepared.added.length>0);
});

test('gap priority favors broken active boss combat motion',()=>{
  const low=scoreMotionGapPriority({gap:{group:'acting',missing:1},usage:{}});
  const high=scoreMotionGapPriority({
    gap:{group:'attacks',missing:3},
    usage:{brokenOrMissingRuntimeMotion:true,activeGameConsumer:true,heroOrBoss:true,combatCritical:true,gameConsumerCount:3}
  });
  assert.ok(high>low);
  assert.ok(high>=100);
});

test('semantic fingerprints suppress redundant motion variants',()=>{
  const candidate=createMotionDNA({id:'slash-new',bodyPlan:'HUMANOID',rigProfile:'HUMANOID',combatRole:'ATTACK',weaponFamily:'SWORD',stance:'COMBAT',styleFamily:'CARTOON',contactLimb:'RIGHT_HAND'});
  const same=createMotionDNA({id:'slash-old',bodyPlan:'HUMANOID',rigProfile:'HUMANOID',combatRole:'ATTACK',weaponFamily:'SWORD',stance:'COMBAT',styleFamily:'CARTOON',contactLimb:'RIGHT_HAND',runtimeVerificationState:'VERIFIED_RUNTIME'});
  assert.equal(motionSemanticFingerprint(candidate),motionSemanticFingerprint(same));
  const dup=findNearDuplicateMotionCandidates({candidate,library:[{id:'slash-old',dna:same}]});
  assert.equal(dup.length,1);
  assert.equal(dup[0].verified,true);
});

test('planner exposes automatic motion gap audits for bootstrap sets',async()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const {buildVibeAssetProductionPlan}=await import('../tools/vibe2-asset-production-plan.mjs');
  const plan=buildVibeAssetProductionPlan({
    task:{gameId:'motion-auto-test',goal:'미노타우로스 보스 모션 강화'},
    target:'unity',
    repoRoot:path.resolve(here,'..')
  });
  assert.equal(plan.companyGraphicsLibrary.motionAutoGapFill.enabled,true);
  assert.equal(plan.companyGraphicsLibrary.motionAutoGapFill.auditedSetCount>=8,true);
  assert.equal(plan.companyGraphicsLibrary.motionAutoGapFill.plannedSemanticSeedCount>0,true);
  assert.equal(plan.companyGraphicsLibrary.motionAutoGapFill.preparedSemanticNeverVerified,true);
  assert.equal(plan.policy.automaticMotionCoverageGapFill,true);
  assert.equal(plan.policy.automaticMotionGapMayNotSelfPromote,true);
  assert.equal(plan.policy.motionGapDuplicateSuppressionRequired,true);
});


test('transition director scores smooth transitions and hard-fails event desync',()=>{
  const good=evaluateMotionTransition({
    from:{id:'walk'},to:{id:'run'},
    metrics:{poseDiscontinuity:5,rootVelocityDelta:8,angularVelocityDelta:3,footContactBreak:4,handContactBreak:0,contactMarkerOffset:2,blendDurationPenalty:3,silhouettePop:4}
  });
  assert.equal(good.verdict,'PASS');
  assert.ok(good.score>=85);
  const bad=evaluateMotionTransition({
    from:{id:'attack-a'},to:{id:'attack-b'},
    metrics:{gameplayEventDesync:true}
  });
  assert.equal(bad.verdict,'FAIL');
  assert.ok(bad.hardFailures.includes('GAMEPLAY_EVENT_DESYNC'));
  assert.equal(bad.gameplayWindowAuthority,false);
});

test('automatic contact QA blocks promotion when foot or attack contact drifts',()=>{
  const pass=auditMotionContact({
    footSlideNormalized:0.01,
    handWeaponOffsetNormalized:0.01,
    attackContactOffsetNormalized:0.02,
    pairContactOffsetNormalized:0.02,
    impactEventNormalizedTimeOffset:0.01
  });
  assert.equal(pass.pass,true);
  assert.equal(pass.blocksVerifiedPromotion,false);
  const fail=auditMotionContact({
    footSlideNormalized:0.08,
    attackContactOffsetNormalized:0.09
  });
  assert.equal(fail.pass,false);
  assert.ok(fail.failures.includes('FOOT_SLIDE_DISTANCE'));
  assert.ok(fail.failures.includes('ATTACK_CONTACT_OFFSET'));
  assert.equal(fail.blocksVerifiedPromotion,true);
});

test('gameplay event binding requests missing motion grammar without owning gameplay',()=>{
  const bite=bindGameplayEventToMotion({
    event:'BITE',
    availableRoles:['ANTICIPATION','STARTUP','RECOVERY']
  });
  assert.equal(bite.complete,false);
  assert.ok(bite.missingRoles.includes('ACTIVE_CONTACT'));
  assert.ok(bite.preparedSemanticSeeds.includes('BITE_ACTIVE_CONTACT'));
  assert.equal(bite.state,'PREPARED_SEMANTIC');
  assert.equal(bite.gameplayEventAuthority,true);
  assert.equal(bite.motionAuthority,false);
});

test('procedural motion profile stays visual-only and supports creature balance channels',()=>{
  const profile=createProceduralMotionProfile({
    tailBalance:true,
    wingBalance:true,
    platformBudget:'mobile'
  });
  assert.equal(profile.corrections.FOOT_IK,true);
  assert.equal(profile.corrections.TAIL_BALANCE,true);
  assert.equal(profile.corrections.WING_BALANCE,true);
  assert.equal(profile.platformBudget,'MOBILE');
  assert.equal(profile.visualOnly,true);
  assert.equal(profile.gameplayColliderAndMovementAuthorityImmutable,true);
});

test('group motion staggers actors and preserves AI decision authority',()=>{
  const group=createGroupMotionPlan({
    pattern:'PACK_SURROUND',
    actors:[{id:'wolf-a'},{id:'wolf-b'},{id:'wolf-c'}],
    recentGroupActions:['wolf-a'],
    spacing:2
  });
  assert.equal(group.pattern,'PACK_SURROUND');
  assert.equal(group.actors.length,3);
  assert.equal(group.staggered[0].attackSuppressed,true);
  assert.equal(group.exactSynchronizedAttackSpamForbidden,true);
  assert.equal(group.gameplayAiDecisionAuthorityImmutable,true);
});

test('multi actor motion enforces presentation actor budget',()=>{
  const mobile=createMultiActorMotionContract({
    id:'rescue',
    pattern:'THREE_ACTOR_RESCUE',
    platformProfile:'MOBILE',
    actors:[{id:'a'},{id:'b'},{id:'c'}],
    alignment:{contactPoints:['HAND_SHOULDER'],phaseMarkers:['LOCK','LIFT','RELEASE']}
  });
  assert.equal(mobile.actorCount,3);
  assert.equal(mobile.requiresExplicitPerformanceEvidence,false);
  const crowded=createMultiActorMotionContract({
    id:'swarm',
    pattern:'LARGE_TARGET_SWARM_GRAB',
    platformProfile:'MOBILE',
    actors:[{id:'a'},{id:'b'},{id:'c'},{id:'d'},{id:'e'}]
  });
  assert.equal(crowded.requiresExplicitPerformanceEvidence,true);
  assert.equal(crowded.gameplayAuthority,false);
});

test('emotion intent layer is additive presentation and cannot change stats',()=>{
  const emotion=createEmotionIntentLayer({intent:'ENRAGED',intensity:1.5});
  assert.equal(emotion.intent,'ENRAGED');
  assert.equal(emotion.intensity,1.5);
  assert.equal(emotion.channels.HEAD_GAZE,true);
  assert.equal(emotion.emotionMayNotChangeGameplayStats,true);
});

test('motion LOD reduces presentation layers but preserves hit semantics',()=>{
  const near=selectMotionLod({cameraDistance:5,deviceClass:'MOBILE',actorImportance:'BOSS'});
  const far=selectMotionLod({cameraDistance:100,deviceClass:'MOBILE',actorImportance:'STANDARD',combatRelevant:false});
  assert.equal(near.tier,'NEAR');
  assert.ok(near.features.includes('IK_CONTACT'));
  assert.equal(far.tier,'FAR');
  assert.ok(far.features.includes('PRIMARY_ACTION'));
  assert.equal(far.gameplayHitAndCollisionUnaffected,true);
});

test('motion lineage tracks parent source and verification evidence',()=>{
  const lineage=createMotionLineage({
    assetId:'goblin-slash-cartoon-roblox',
    parentId:'goblin-slash',
    sourceId:'mocap-001',
    sourceHash:'abc',
    derivedHash:'def',
    transformHistory:['cleanup','retarget','cartoon-style'],
    licenseEvidence:'license-001',
    rigProfile:'R15',
    styleFamily:'CARTOON',
    platform:'ROBLOX',
    gameId:'demo',
    verificationSha:'sha-1',
    runtimeEvidenceId:'evidence-1'
  });
  assert.equal(lineage.complete,true);
  assert.equal(lineage.platform,'ROBLOX');
  assert.equal(lineage.originalImmutable,true);
  assert.equal(lineage.revalidateDerivedWhenParentImproves,true);
});

test('runtime motion learning accepts verified pass/failure only and raw telemetry cannot train',()=>{
  const samples=[
    {motionId:'run',runtimeVerified:true,pass:true,transitionQualityScore:92,contactQaScore:96,pairAlignmentScore:100,frameStabilityScore:95,mobileReadabilityScore:90},
    {motionId:'attack',runtimeVerified:true,pass:false,failureReason:'FOOT_SLIDE',transitionQualityScore:70,contactQaScore:50,pairAlignmentScore:100,frameStabilityScore:92,mobileReadabilityScore:88},
    {motionId:'semantic-only',runtimeVerified:false,pass:true,transitionQualityScore:100,contactQaScore:100}
  ];
  const signals=aggregateRuntimeMotionSignals(samples);
  assert.equal(signals.sampleCount,3);
  assert.equal(signals.verifiedPassCount,1);
  assert.equal(signals.verifiedFailureCount,1);
  assert.equal(signals.rawTelemetryAuthority,false);
  const candidate=buildRuntimeMotionLearningCandidate({gameId:'demo',platform:'UNITY',signals,samples});
  assert.equal(candidate.positiveMasteryEligible,true);
  assert.equal(candidate.negativeAvoidPatternEligible,true);
  assert.ok(candidate.verifiedFailureLessons.includes('FOOT_SLIDE'));
  assert.equal(candidate.preparedSemanticEligible,false);
  assert.equal(candidate.rawTelemetryDirectTraining,false);
  assert.equal(candidate.feedsExistingCanonicalLearningChain,true);
  assert.equal(candidate.requiresExistingDistillationThresholdHoldoutAndCanary,true);
});

test('unverified runtime samples cannot become positive learning',()=>{
  const samples=[
    {motionId:'prepared',runtimeVerified:false,pass:true,transitionQualityScore:100,contactQaScore:100}
  ];
  const candidate=buildRuntimeMotionLearningCandidate({gameId:'demo',platform:'ROBLOX',samples});
  assert.equal(candidate.positiveMasteryEligible,false);
  assert.equal(candidate.negativeAvoidPatternEligible,false);
  assert.equal(candidate.feedsExistingCanonicalLearningChain,false);
  assert.equal(candidate.preparedSemanticEligible,false);
});

test('full motion director plan exposes advanced quality and learning systems',()=>{
  const plan=createMotionDirectorPlan({
    platform:'UNITY',
    bodyPlan:'HUMANOID',
    rigProfile:'HUMANOID',
    styleFamily:'STYLIZED_FANTASY',
    transition:{from:{id:'idle'},to:{id:'walk'},metrics:{}},
    contactQa:{footSlideNormalized:0.01},
    gameplayEvent:{event:'MELEE_ATTACK',availableRoles:['ANTICIPATION','STARTUP','ACTIVE_CONTACT','RECOIL','RECOVERY']},
    procedural:{headGaze:true,handGrip:true},
    group:{actors:[{id:'a'},{id:'b'}]},
    multiActor:{actors:[{id:'a'},{id:'b'}]},
    emotion:{intent:'ALERT'},
    lod:{cameraDistance:10,actorImportance:'HERO'},
    lineage:{assetId:'motion-a',sourceId:'source-a',derivedHash:'hash-a',platform:'UNITY'},
    runtimeSignals:[{motionId:'motion-a',runtimeVerified:true,pass:true,transitionQualityScore:90,contactQaScore:95}]
  });
  for(const system of ['TRANSITION_DIRECTOR','AUTOMATIC_CONTACT_QA','GAMEPLAY_EVENT_MOTION_BINDING','PROCEDURAL_MOTION_LAYER','GROUP_MOTION_DIRECTOR','MULTI_ACTOR_MOTION','EMOTION_INTENT_LAYER','MOTION_LOD','MOTION_LINEAGE','RUNTIME_MOTION_LEARNING']){
    assert.ok(plan.systems.includes(system));
  }
  assert.equal(plan.transition.verdict,'PASS');
  assert.equal(plan.contactQa.pass,true);
  assert.equal(plan.gameplayEventBinding.complete,true);
  assert.equal(plan.emotionIntent.intent,'ALERT');
  assert.equal(plan.motionLod.tier,'NEAR');
  assert.equal(plan.runtimeLearning.positiveMasteryEligible,true);
});


test('Roblox motion source selection prefers verified compatible library motion before new authoring',()=>{
  const candidates=[
    {id:'new-handmade',sourceType:'NEW_NATIVE_AUTHORING',dna:createMotionDNA({id:'new-handmade',bodyPlan:'HUMANOID',rigProfile:'R15',platformVariant:'ROBLOX',speciesOrArchetype:'KNIGHT'})},
    {id:'company-run',companyVerified:true,gameId:'other',dna:createMotionDNA({id:'company-run',bodyPlan:'HUMANOID',rigProfile:'R15',platformVariant:'ROBLOX',speciesOrArchetype:'KNIGHT',runtimeVerificationState:'VERIFIED_RUNTIME',sourceProvenance:'COMPANY_VERIFIED'})},
    {id:'same-game-run',companyVerified:true,gameId:'demo',dna:createMotionDNA({id:'same-game-run',bodyPlan:'HUMANOID',rigProfile:'R15',platformVariant:'ROBLOX',speciesOrArchetype:'KNIGHT',runtimeVerificationState:'VERIFIED_RUNTIME',sourceProvenance:'COMPANY_VERIFIED'})}
  ];
  const selected=selectRobloxCharacterMotionSource({
    candidates,gameId:'demo',archetype:'KNIGHT',
    context:{bodyPlan:'HUMANOID',rigProfile:'R15'}
  });
  assert.equal(selected.selectedId,'same-game-run');
  assert.equal(selected.sourceClass,'VERIFIED_SAME_GAME_SAME_ARCHETYPE_MOTION');
  assert.equal(selected.libraryFirst,true);
  assert.equal(selected.newKeyframeAuthoringLast,true);
  assert.equal(ROBLOX_MOTION_SOURCE_PRIORITY[0],'VERIFIED_SAME_GAME_SAME_ARCHETYPE_MOTION');
});

test('Roblox blend profile requires crossfade weight and locomotion speed sync',()=>{
  const blend=createRobloxMotionBlendProfile({crossFadeSeconds:.01,walkSpeed:7,runSpeed:17});
  assert.equal(blend.crossFadeSeconds,.08);
  assert.equal(blend.speedThresholds.WALK,7);
  assert.equal(blend.speedThresholds.RUN,17);
  assert.equal(blend.animationTrackCrossFadeRequired,true);
  assert.equal(blend.adjustWeightPreferred,true);
  assert.equal(blend.playbackSpeedSyncRequired,true);
  assert.equal(blend.hardStatePopForbidden,true);
});

test('Roblox articulated character audit hard fails mannequin root-only motion',()=>{
  const result=auditRobloxCharacterMotionEvidence({
    actorClass:'HUMANOID_NPC',
    articulatedExpected:true,
    hasHumanoid:true,
    hasAnimator:false,
    hasMotor6D:false,
    visibleLocomotion:true,
    rootTransformChanges:true,
    jointTransformChanges:false,
    weldConstraintOnly:true,
    officialStudioRuntimeObserved:true
  });
  assert.equal(result.pass,false);
  assert.equal(result.mannequin,true);
  assert.equal(result.failureCode,ROBLOX_CHARACTER_MOTION_FAILURE);
  assert.ok(result.failures.includes('ROOT_ONLY_VISIBLE_LOCOMOTION'));
  assert.ok(result.failures.includes('WELD_CONSTRAINT_ONLY_ARTICULATED_BODY'));
});

test('Roblox articulated character audit passes smooth joint motion with native runtime evidence',()=>{
  const result=auditRobloxCharacterMotionEvidence({
    actorClass:'HUMANOID_NPC',
    articulatedExpected:true,
    hasHumanoid:true,
    hasAnimator:true,
    hasMotor6D:true,
    visibleLocomotion:true,
    rootTransformChanges:true,
    jointTransformChanges:true,
    playbackSpeedSynced:true,
    footSlideNormalized:.01,
    officialStudioRuntimeObserved:true
  });
  assert.equal(result.pass,true);
  assert.equal(result.mannequin,false);
  assert.equal(result.failureCode,null);
});

test('Roblox motion director plan binds articulated smooth-motion system without gameplay authority',()=>{
  const plan=createRobloxCharacterMotionPlan({
    actorClass:'CREATURE',
    bodyPlan:'HEAVY_BIPED',
    rigProfile:'CUSTOM_MOTOR6D',
    gameId:'demo',
    archetype:'OGRE',
    motionCandidates:[{
      id:'ogre-run',
      companyVerified:true,
      gameId:'demo',
      dna:createMotionDNA({
        id:'ogre-run',bodyPlan:'HEAVY_BIPED',rigProfile:'CUSTOM_MOTOR6D',
        speciesOrArchetype:'OGRE',platformVariant:'ROBLOX',
        runtimeVerificationState:'VERIFIED_RUNTIME',sourceProvenance:'COMPANY_VERIFIED'
      })
    }]
  });
  assert.equal(plan.motionSource.selectedId,'ogre-run');
  assert.ok(plan.requiredRig.includes('ANIMATOR'));
  assert.equal(plan.rootTransformOnlyVisualLocomotionForbidden,true);
  assert.equal(plan.officialStudioRuntimeEvidenceRequired,true);
  assert.equal(plan.gameplayAuthority,false);

  const director=createMotionDirectorPlan({
    platform:'ROBLOX',bodyPlan:'HEAVY_BIPED',rigProfile:'CUSTOM_MOTOR6D',
    motionCandidates:[],robloxCharacterMotion:{actorClass:'CREATURE',archetype:'OGRE'}
  });
  assert.equal(director.version,2);
  assert.ok(director.systems.includes('ROBLOX_SMOOTH_CHARACTER_MOTION'));
  assert.equal(director.robloxCharacterMotion.actorClass,'CREATURE');
});
