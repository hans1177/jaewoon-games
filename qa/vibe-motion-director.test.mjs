// 파일명: qa/vibe-motion-director.test.mjs
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
  DUEL_COMBAT_MOTION_TARGET,
  DUEL_COMBAT_REQUIRED_ROLES,
  DUEL_COMBAT_AUTHORING_PHASES,
  DUEL_COMBAT_WEAPON_MECHANICS,
  WEAPON_COMBAT_MOTION_PACKS,
  UNARMED_MARTIAL_ARTS_STYLES,
  UNARMED_MARTIAL_MECHANICS,
  HERO_STANDARD_RIG_TARGET,
  HERO_STANDARD_RIG_MOTION_PACK,
  HERO_SURVIVAL_WEAPON_FAMILIES,
  SURVIVAL_PLAYER_MOTION_PACK,
  MOUNT_RIDER_MOTION_PACKS,
  SURVIVAL_WILDLIFE_MOTION_PACKS,
  MONSTER_BODY_PLAN_MOTION_DETAILS,
  resolveMonsterBodyPlanMotionDetail,
  COMMON_R15_MONSTER_RETARGET_SOURCES,
  createMonsterCommonActionRetargetPlan,
  createDuelCombatMotionLoadout,
  createDuelCombatAuthoringRecipe,
  createRobloxWalkTeachingRecipe,
  createHeroStandardMotionProfile,
  createMountRiderMotionProfile,
  createSurvivalPlayerMotionProfile,
  createSurvivalWildlifeMotionProfile,
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
  auditMotionContinuityTrace,
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
  createStudioMotionActionProfile,
  createRobloxCharacterMotionPlan,
  auditRobloxCharacterMotionEvidence,
  createMotionDirectorPlan
} from '../assets/vibe-motion-director.js';

const studioReviewFixture=()=>({
  sourceRevision:'a'.repeat(40),clipVersion:'clip-v1',referenceCapture:'fixture/reference.mp4',candidateCapture:'fixture/candidate.mp4',
  sameCamera:true,samePlaybackSpeed:true,playerCount:2,runtimeRunId:'fixture-run',gameplayTimingPreserved:true,
  stages:Object.fromEntries(createMotionDirectorPlan().studioProduction.stages.map(stage=>[stage,{pass:true,evidence:'fixture/'+stage}]))
});

test('walk teacher stays scoped to an internal Roblox walk and never grants verified authority',()=>{
  const unit={scope:'INTERNAL_ASSET_LIBRARY',objectId:'roblox-world-ghost-bai-wuchang',clipId:'walk',sourcePath:'init.luau'};
  const recipe=createRobloxWalkTeachingRecipe(unit);
  assert.equal(recipe.objectId,unit.objectId);
  assert.equal(recipe.status,'PRACTICE_ONLY');
  assert.equal(recipe.runtimeVerified,false);
  assert.equal(recipe.productionVerified,false);
  assert.equal(recipe.gameplayAuthority,false);
  assert.equal(new Set(recipe.lessons.map(row=>row.axis)).size,6);
  assert.match(recipe.lessons.find(row=>row.axis==='CONTACT_AND_CONSTRAINTS').repair,/world-space foot drift/);
  assert.match(recipe.lessons.find(row=>row.axis==='POSE_AND_STAGING').repair,/floating.*wheel.*multi-leg/);
  assert.match(recipe.lessons.find(row=>row.axis==='LOOP_AND_TRANSITION').repair,/finite-difference velocities/);
  for(const invalid of [null,{}, {...unit,scope:'GAME'}, {...unit,clipId:'attack'}, {...unit,sourcePath:'shared.luau'}, {...unit,objectId:'roblox-world-ghost-../other'}])assert.equal(createRobloxWalkTeachingRecipe(invalid),null);
});

test('basic motion work gets one hour without changing runtime verification or gameplay timing',()=>{
  const policy=JSON.parse(fs.readFileSync(new URL('../company-learning/platform-release-roadmap.json',import.meta.url),'utf8'));
  const central=policy.assetProductionParallelContract.companyGraphicsLibrary24h.studioMotionProgram.baseQualityWorkSession;
  for(const platform of ['ROBLOX','UNITY','WEB']){
    const session=createMotionDirectorPlan({platform}).studioProduction.baseWorkSession;
    assert.equal(session.defaultMinutes,60);
    assert.equal(session.objectCount,1);
    assert.equal(session.motionCount,1);
    assert.equal(session.budgetMeaning,central.budgetMeaning);
    assert.equal(session.preparationAndQaIncludedInModificationBudget,false);
    assert.equal(session.separateWorkerRequired,false);
    assert.deepEqual(session.stageMinutes,central.stageMinutes);
    assert.equal(Object.values(session.stageMinutes).reduce((a,b)=>a+b,0),60);
    assert.equal(session.existingModelsAndRigRequired,true);
    assert.equal(session.preserveClipDurationAndExistingEventTimes,true);
    assert.equal(session.elapsedTimeIsNotQualityEvidence,true);
    assert.equal(session.nativeRuntimeAndBeforeAfterRequiredForQualityPass,true);
    assert.equal(session.ownerOrChatgptPresenceRequired,false);
  }
});
const observedMotionFixture=()=>({hasHumanoid:true,hasAnimator:true,hasMotor6D:true,visibleLocomotion:true,rootTransformChanges:true,jointTransformChanges:true,playbackSpeedSynced:true,footSlideNormalized:.01,officialStudioRuntimeObserved:true,sourceRevision:'a'.repeat(40),clipVersion:'clip-v1',studioReview:studioReviewFixture()});

function continuityFixture(){return{
  sourceHash:'clip-v1',expectedSourceHash:'clip-v1',clipId:'walk-stop',durationSeconds:1,characterHeightMeters:2,
  frames:Array.from({length:31},(_,index)=>({timeSeconds:index/30,rootPosition:[index/30,0,0],rootYawRadians:0,jointPositions:{hip:[0,1,0],head:[0,1.8,0]},contacts:{leftFoot:{planted:true,worldPosition:[0,0,0]},rightFoot:{planted:false,worldPosition:[index/30,0,0]}}}))
};}

test('motion continuity measures smooth traces, angle wrapping, foot drift and localized pose jumps',()=>{
  const input=continuityFixture(),smooth=auditMotionContinuityTrace(input);
  assert.equal(smooth.verdict,'PASS');assert.equal(smooth.runtimeVerified,false);
  input.frames.forEach((frame,index)=>{frame.rootYawRadians=index<15?Math.PI-.001:-Math.PI+.001;});
  assert.equal(auditMotionContinuityTrace(input).verdict,'PASS');
  input.frames.forEach((frame,index)=>{frame.contacts.leftFoot.worldPosition=[index*.002,0,0];});
  input.frames[12].jointPositions.head=[0,3.8,0];
  const failed=auditMotionContinuityTrace(input);
  assert.equal(failed.verdict,'FAIL');
  const foot=failed.violations.find(row=>row.region==='leftFoot');
  assert.ok(foot.value>.015);assert.equal(foot.frameRange[1],30);assert.equal(foot.peakFrame,30);
  assert.equal(failed.violations.filter(row=>row.region==='leftFoot').length,1);
  assert.ok(failed.violations.some(row=>row.region==='head'&&row.frameRange[0]===11));
  assert.deepEqual(createMotionDirectorPlan({continuityTrace:input}).continuityAudit,failed);
});

test('motion trace cannot pass with gaps, stale source, missing joints, invalid numbers or partial clip',()=>{
  const changes=[
    input=>{input.expectedSourceHash='new';},
    input=>{input.frames.splice(4,3);},
    input=>{input.frames[3].rootPosition[0]=NaN;},
    input=>{delete input.frames[4].jointPositions.head;},
    input=>{input.frames.pop();},
    input=>{input.limits={maxPlantedDrift:Infinity};},
    input=>{input.frames[4].timeSeconds=input.frames[3].timeSeconds;}
  ];
  for(const change of changes){const input=continuityFixture();change(input);const result=auditMotionContinuityTrace(input);assert.equal(result.verdict,'UNVERIFIED');assert.equal(result.metrics,null);assert.equal(result.blocksVerifiedPromotion,true);}
});

test('motion detail catches acceleration spikes and declared loop velocity seams without rejecting root travel',()=>{
  const spike=continuityFixture();spike.frames[15].jointPositions.head[0]=.2;
  const jerk=auditMotionContinuityTrace(spike);
  assert.ok(jerk.metrics.maxJointSpeed<12);
  assert.equal(jerk.verdict,'FAIL');
  assert.ok(jerk.violations.some(row=>row.kind==='maxJointAcceleration'&&row.region==='head'&&row.frameRange[0]<=15&&row.frameRange[1]>=15));
  const cycle=continuityFixture();cycle.loop=true;
  cycle.frames.forEach(frame=>{frame.jointPositions.hip[0]=.02*Math.sin(2*Math.PI*frame.timeSeconds);});
  const valid=auditMotionContinuityTrace(cycle);
  assert.equal(valid.verdict,'PASS');assert.equal(valid.measurementCoverage.loopBoundaryMeasured,true);
  assert.equal(valid.runtimeVerified,false);
  cycle.frames.forEach(frame=>{const t=frame.timeSeconds;frame.jointPositions.hip[0]=.2*t*(1-t);});
  const seam=auditMotionContinuityTrace(cycle);
  assert.equal(seam.metrics.maxLoopJointPosition,0);
  assert.ok(seam.violations.some(row=>row.kind==='maxLoopJointVelocity'&&row.region==='hip'));
  cycle.frames.at(-1).contacts.leftFoot.planted=false;
  assert.ok(auditMotionContinuityTrace(cycle).violations.some(row=>row.kind==='LOOP_CONTACT_STATE_MISMATCH'));
  cycle.loop='true';assert.equal(auditMotionContinuityTrace(cycle).verdict,'UNVERIFIED');
});

function detailContinuityFixture(){
  const input=continuityFixture();
  input.requiredDetailChannels={attachments:['rightGrip'],penetrations:['coatThigh'],gaze:['eyes'],expressions:['brow'],supportedContacts:['leftFoot']};
  for(const [index,frame] of input.frames.entries()){
    frame.attachments={rightGrip:{active:true,effectorWorldPosition:[index*.1,1,0],targetWorldPosition:[index*.1,1,0]}};
    frame.penetrations={coatThigh:{depthMeters:0}};
    frame.gaze={eyes:{tracking:true,forwardWorld:[0,0,2],targetDirectionWorld:[0,0,10]}};
    frame.expressions={brow:.2};
    frame.contacts.leftFoot={planted:true,worldPosition:[Math.cos(index/30),0,Math.sin(index/30)],supportId:'rotating-deck',supportLocalPosition:[1,0,0]};
  }
  return input;
}

test('detail motion measures moving grip pairs, penetration, gaze and expression changes at exact frames',()=>{
  const input=detailContinuityFixture(),smooth=auditMotionContinuityTrace(input);
  assert.equal(smooth.verdict,'PASS');assert.deepEqual(smooth.measurementCoverage.unmeasuredGroups,[]);
  assert.equal(smooth.metrics.maxAttachmentOffset,0);assert.equal(smooth.metrics.maxPlantedDrift,0);
  for(let index=10;index<=12;index++)input.frames[index].attachments.rightGrip.effectorWorldPosition[0]+=.08;
  input.frames[11].attachments.rightGrip.effectorWorldPosition[0]+=.08;
  input.frames[0].penetrations.coatThigh.depthMeters=.03;
  input.frames[20].gaze.eyes.forwardWorld=[0,0,-1];
  input.frames[25].expressions.brow=1;
  const result=auditMotionContinuityTrace(input);
  assert.equal(result.verdict,'FAIL');assert.equal(result.runtimeVerified,false);
  const grip=result.violations.find(row=>row.kind==='maxAttachmentOffset');
  assert.deepEqual(grip.frameRange,[10,12]);assert.equal(grip.peakFrame,11);assert.ok(Math.abs(grip.value-.08)<1e-9);
  assert.deepEqual(grip.normalizedTimeRange,[1/3,.4]);
  const cloth=result.violations.find(row=>row.kind==='maxPenetrationDepth');
  assert.equal(cloth.value,.015);assert.deepEqual(cloth.frameRange,[0,0]);
  assert.equal(result.metrics.maxGazeErrorRadians,Math.PI);
  assert.ok(result.violations.some(row=>row.kind==='maxGazeAngularSpeed'&&row.region==='eyes'));
  assert.deepEqual(result.violations.find(row=>row.kind==='maxExpressionRate').frameRange,[24,26]);
  assert.ok(Math.abs(result.metrics.maxExpressionRate-24)<1e-9);
});

test('moving and rotating support contacts use local anchors and replant only after release',()=>{
  const input=detailContinuityFixture();
  assert.equal(auditMotionContinuityTrace(input).verdict,'PASS');
  input.frames[10].contacts.leftFoot.supportLocalPosition=[1.06,0,0];
  const slipped=auditMotionContinuityTrace(input);
  assert.equal(slipped.verdict,'FAIL');assert.ok(Math.abs(slipped.metrics.maxPlantedDrift-.03)<1e-9);
  input.frames[10].contacts.leftFoot.supportLocalPosition=[1,0,0];
  input.frames[10].contacts.leftFoot.planted=false;
  for(let index=11;index<input.frames.length;index++){
    input.frames[index].contacts.leftFoot.supportId='second-deck';
    input.frames[index].contacts.leftFoot.supportLocalPosition=[2,0,0];
  }
  assert.equal(auditMotionContinuityTrace(input).verdict,'PASS');
  input.frames[10].contacts.leftFoot.planted=true;
  assert.ok(auditMotionContinuityTrace(input).issues.includes('PLANTED_SUPPORT_CHANGED:leftFoot:11'));
});

test('declared detail channels reject absent, invalid, partial or changing measurement sets',()=>{
  const mutations=[
    input=>{delete input.frames[0].attachments;},
    input=>{delete input.frames[13].expressions.brow;},
    input=>{input.frames[13].expressions.brow=1.1;},
    input=>{input.frames[13].expressions.extra=0;},
    input=>{input.frames[13].penetrations.coatThigh.depthMeters=-1;},
    input=>{input.frames[13].gaze.eyes.forwardWorld=[0,0,0];},
    input=>{input.frames[13].attachments.rightGrip.targetWorldPosition=[NaN,0,0];},
    input=>{delete input.frames[13].contacts.leftFoot.supportLocalPosition;},
    input=>{input.requiredDetailChannels={gaze:'eyes'};},
    input=>{input.requiredDetailChannels={unknown:[]};},
    input=>{input.requiredDetailChannels.supportedContacts.push('missingFoot');},
    input=>{input.frames[13].gaze=[];}
  ];
  for(const mutate of mutations){
    const input=detailContinuityFixture();mutate(input);const result=auditMotionContinuityTrace(input);
    assert.equal(result.verdict,'UNVERIFIED',String(mutate));assert.equal(result.metrics,null);assert.equal(result.blocksVerifiedPromotion,true);
  }
  assert.deepEqual(auditMotionContinuityTrace(continuityFixture()).measurementCoverage.unmeasuredGroups,['attachments','penetrations','gaze','expressions','supportedContacts']);
});

test('released grips and intentional gaze breaks do not create false contact or tracking defects',()=>{
  const input=detailContinuityFixture();
  for(const frame of input.frames){
    frame.attachments.rightGrip.active=false;frame.attachments.rightGrip.targetWorldPosition=[100,0,0];
    frame.gaze.eyes.tracking=false;frame.gaze.eyes.targetDirectionWorld=[1,0,0];
  }
  assert.equal(auditMotionContinuityTrace(input).verdict,'PASS');
  input.frames[0].attachments.rightGrip.active=true;
  input.frames[0].gaze.eyes.tracking=true;
  const result=auditMotionContinuityTrace(input);
  assert.equal(result.verdict,'FAIL');
  for(const kind of ['maxAttachmentOffset','maxGazeErrorRadians'])assert.deepEqual(result.violations.find(row=>row.kind===kind).frameRange,[0,0]);
});

test('studio review rejects missing, stale, incomplete and single-player evidence',()=>{
  assert.equal(auditRobloxCharacterMotionEvidence(observedMotionFixture()).pass,true);
  for(const mutate of [
    x=>{x.studioReview=null;},x=>{x.studioReview.sourceRevision='b'.repeat(40);},
    x=>{x.studioReview.clipVersion='old';},x=>{x.studioReview.sameCamera=false;},
    x=>{x.studioReview.playerCount=1;},x=>{x.studioReview.gameplayTimingPreserved=false;},
    x=>{delete x.studioReview.stages.KEY_POSES;},x=>{x.footSlideNormalized=NaN;}
  ]){const input=observedMotionFixture();mutate(input);assert.equal(auditRobloxCharacterMotionEvidence(input).blocksVerifiedPromotion,true);}
});
test('studio pipeline shares production stages across platforms without inventing verification',()=>{
  const roblox=createMotionDirectorPlan({platform:'ROBLOX'}).studioProduction;
  const unity=createMotionDirectorPlan({platform:'UNITY'}).studioProduction;
  assert.deepEqual(roblox.stages,unity.stages);
  assert.equal(unity.targetPlatform,'UNITY');assert.equal(roblox.status,'PLANNED_NOT_VERIFIED');
  assert.equal(roblox.representativeScene.durationSeconds,10);
  assert.equal(roblox.reviewCapture.frameAddressedFindings,true);
});
test('explicit failed quality cannot win through company ownership',()=>{
  const dna=createMotionDNA({id:'test',bodyPlan:'HUMANOID',rigProfile:'R15',platformVariant:'ROBLOX'});
  const selection=selectRobloxCharacterMotionSource({candidates:[{id:'bad-owned',companyVerified:true,dna,qualityReview:{verdict:'FAIL'}},{id:'external',licenseVerified:true,sourceType:'EXTERNAL',dna}],context:{bodyPlan:'HUMANOID',rigProfile:'R15'}});
  assert.equal(selection.selected.id,'external');
});

test('duel combat motion library covers weapon duels and martial arts',()=>{
  assert.equal(DUEL_COMBAT_MOTION_TARGET,'RESPONSIVE_DUEL_ARENA_COMBAT');
  for(const family of ['UNARMED','KATANA','ONE_HAND_SWORD','DUAL_BLADE','TWO_HAND_SWORD','DAGGER','SPEAR','AXE','HAMMER','STAFF_OR_WAND','SHIELD_SWORD','BOW','FIREARM']){
    assert.ok(WEAPON_COMBAT_MOTION_PACKS[family],family);
  }
  for(const style of ['BOXING','KICKBOXING','MUAY_THAI','KARATE','TAEKWONDO','SANDA','WUSHU_KUNG_FU','WRESTLING','JUDO_THROWING','JIU_JITSU_GRAPPLING','MMA_HYBRID','STREET_BRAWLER','WUXIA_UNARMED_FANTASY']){
    assert.ok(UNARMED_MARTIAL_ARTS_STYLES[style],style);
  }
  assert.ok(DUEL_COMBAT_REQUIRED_ROLES.includes('PARRY_OR_COUNTER'));
  assert.ok(DUEL_COMBAT_REQUIRED_ROLES.includes('FINISHER'));
});

test('duel loadout binds katana and unarmed martial arts without taking gameplay authority',()=>{
  const katana=createDuelCombatMotionLoadout({weaponFamily:'katana',platform:'roblox'});
  assert.equal(katana.weaponFamily,'KATANA');
  assert.equal(katana.platform,'ROBLOX');
  assert.ok(katana.groups.lightCombo.includes('KATANA_DIAGONAL_CUT_R'));
  assert.ok(katana.groups.defense.includes('KATANA_PARRY_COUNTER'));
  assert.equal(katana.exactThirdPartyClipCopy,false);
  assert.equal(katana.gameplayAuthority,false);

  const muayThai=createDuelCombatMotionLoadout({weaponFamily:'unarmed',martialStyle:'muay_thai',platform:'roblox'});
  assert.equal(muayThai.weaponFamily,'UNARMED');
  assert.equal(muayThai.martialStyle,'MUAY_THAI');
  assert.ok(muayThai.groups.lightCombo.includes('MUAY_THAI_ELBOW'));
  assert.ok(muayThai.groups.heavy.includes('MUAY_THAI_KNEE'));
  assert.ok(muayThai.groups.grapple.includes('MUAY_THAI_CLINCH_ENTRY'));
  assert.equal(muayThai.nativeRuntimeVerificationRequired,true);
});

test('duel authoring recipe gives concrete joint phases and weapon mechanics',()=>{
  const katana=createDuelCombatAuthoringRecipe({
    weaponFamily:'KATANA',
    role:'LIGHT_COMBO',
    platform:'ROBLOX'
  });
  assert.equal(katana.motionId,'KATANA_DIAGONAL_CUT_R');
  assert.equal(katana.phases,DUEL_COMBAT_AUTHORING_PHASES.LIGHT_COMBO);
  assert.equal(katana.weaponMechanics,DUEL_COMBAT_WEAPON_MECHANICS.KATANA);
  assert.equal(katana.weaponMechanics.leadFootPlant,true);
  assert.equal(katana.nativePath.primary,'ANIMATOR_ANIMATIONTRACK');
  assert.equal(katana.nativePath.rootOnlyForbidden,true);
  assert.equal(katana.authoredMotionRequirements.rootTranslationOwnedByGameplay,true);
  assert.equal(katana.exactThirdPartyClipCopy,false);

  const muay=createDuelCombatAuthoringRecipe({
    weaponFamily:'UNARMED',
    martialStyle:'MUAY_THAI',
    role:'PARRY_OR_COUNTER',
    platform:'ROBLOX'
  });
  assert.equal(muay.martialMechanics,UNARMED_MARTIAL_MECHANICS.MUAY_THAI);
  assert.equal(muay.martialMechanics.clinchBias,24);
  assert.ok(muay.phases.some(row=>row.phase==='CONTACT'));
  assert.equal(muay.gameplayAuthority,false);
});

test('motion director exposes combat loadout as a composable presentation system',()=>{
  const plan=createMotionDirectorPlan({
    platform:'ROBLOX',
    combat:{weaponFamily:'DUAL_BLADE'}
  });
  assert.equal(plan.combatLoadout.weaponFamily,'DUAL_BLADE');
  assert.ok(plan.combatLoadout.groups.gapCloser.includes('DUAL_BLADE_DASH_CROSS'));
  assert.ok(plan.systems.includes('DUEL_COMBAT_MOTION_KIT'));
  assert.equal(plan.gameplayAuthority,false);
});

test('shared hero standard rig exposes exactly forty core motions and survival weapon families',()=>{
  const ids=Object.values(HERO_STANDARD_RIG_MOTION_PACK).flat();
  assert.equal(HERO_STANDARD_RIG_TARGET,'HIGH_END_SHARED_HERO_STANDARD_RIG');
  assert.equal(ids.length,40);
  assert.equal(new Set(ids).size,40);
  assert.deepEqual(HERO_SURVIVAL_WEAPON_FAMILIES,['ONE_HAND_SWORD','SPEAR','AXE','HAMMER','DAGGER','BOW']);
  for(const required of ['HERO_IDLE_RELAXED','HERO_SPRINT','HERO_DODGE_BACK','HERO_ATTACK_4','HERO_PARRY','HERO_HIT_BACK','HERO_SPAWN']){
    assert.ok(ids.includes(required),required);
  }
});

test('hero standard profile composes survival weapon and mount motion without taking gameplay authority',()=>{
  const hero=createHeroStandardMotionProfile({platform:'ROBLOX',weaponFamily:'SPEAR',includeSurvival:true,mountType:'WOLF'});
  assert.equal(hero.baseMotionCount,40);
  assert.equal(hero.weaponFamily,'SPEAR');
  assert.ok(hero.survivalMotionIds.includes('SURVIVAL_CRAFT'));
  assert.ok(hero.survivalMotionIds.includes('SURVIVAL_BANDAGE'));
  assert.equal(hero.mountProfile.mountType,'WOLF');
  assert.equal(hero.quality.rootOnlyVisibleMotionForbidden,true);
  assert.equal(hero.directCrossPlatformBinaryReuseForbidden,true);
  assert.equal(hero.gameplayAuthority,false);
});

test('horse and wolf mount rider packs preserve articulated pair contact and mounted combat',()=>{
  assert.equal(MOUNT_RIDER_MOTION_PACKS.HORSE.pair.length,12);
  assert.equal(MOUNT_RIDER_MOTION_PACKS.WOLF.pair.length,12);
  assert.ok(MOUNT_RIDER_MOTION_PACKS.HORSE.signature.includes('HORSE_REAR'));
  assert.ok(MOUNT_RIDER_MOTION_PACKS.WOLF.signature.includes('WOLF_POUNCE'));
  assert.deepEqual(MOUNT_RIDER_MOTION_PACKS.mountedCombat,['MOUNTED_SWORD_ATTACK','MOUNTED_SPEAR_THRUST','MOUNTED_BOW_SHOT']);

  const horse=createMountRiderMotionProfile({mountType:'HORSE',platform:'UNITY'});
  assert.equal(horse.riderContact.pelvisFollowsMountMass,true);
  assert.equal(horse.riderContact.feetMaintainStirrupOrBodyContact,true);
  assert.equal(horse.mountMotion.riderMayNotRemainRigidWhileMountMoves,true);
  assert.equal(horse.pairAlignment.contactPointsRequired,true);
  assert.equal(horse.gameplayMovementAuthority,false);
  assert.equal(horse.nativeRuntimeVerificationRequired,true);
});

test('survival player motion profile covers locomotion tools interactions and reactions',()=>{
  const axe=createSurvivalPlayerMotionProfile({platform:'ROBLOX',tool:'AXE'});
  assert.equal(axe.primaryToolMotion,'SURVIVAL_AXE_CHOP_R');
  assert.ok(SURVIVAL_PLAYER_MOTION_PACK.locomotion.includes('SURVIVAL_SPRINT'));
  assert.ok(SURVIVAL_PLAYER_MOTION_PACK.locomotion.includes('SURVIVAL_TURN_180'));
  assert.ok(SURVIVAL_PLAYER_MOTION_PACK.interaction.includes('SURVIVAL_PICKUP_GROUND'));
  assert.equal(axe.mechanics.toolStrikeUsesHipsSpineShoulders,true);
  assert.equal(axe.nativePath.rootOnlyForbidden,true);
  assert.equal(axe.productionVerified,false);
});

test('survival wildlife motion profile gives species specific articulated motion',()=>{
  const bear=createSurvivalWildlifeMotionProfile({species:'BEAR',platform:'ROBLOX'});
  const boar=createSurvivalWildlifeMotionProfile({species:'BOAR',platform:'ROBLOX'});
  const rabbit=createSurvivalWildlifeMotionProfile({species:'RABBIT',platform:'ROBLOX'});
  assert.equal(bear.family,'HEAVY_QUADRUPED');
  assert.equal(boar.family,'LOW_HEAVY_QUADRUPED');
  assert.equal(rabbit.family,'HOPPER');
  assert.ok(bear.groups.attack.includes('WILDLIFE_HEAVY_SWIPE'));
  assert.ok(boar.groups.attack.includes('BOAR_CHARGE_RAM'));
  assert.ok(rabbit.groups.locomotion.includes('RABBIT_SPRINT_HOP'));
  assert.equal(bear.mechanics.turnUsesBodyArcNotRootSnap,true);
  assert.equal(bear.runtimeQuality.noRigidBodyGlide,true);
  assert.equal(bear.nativePath.rootOnlyForbidden,true);
  assert.ok(SURVIVAL_WILDLIFE_MOTION_PACKS.CANINE.locomotion.includes('CANINE_TROT'));
});


test('monster common motion detail library covers humanoid insect aquatic amorphous ghost centaur tentacle swarm and boss plans',()=>{
  const required=[
    'HUMANOID_UNDEAD','HEAVY_BIPED','BOSS_BIPED','HEAVY_GOLEM_OR_BOSS','QUADRUPED_CANINE','QUADRUPED_HEAVY',
    'ARACHNID','ARACHNID_SCORPION','HEXAPOD_INSECT','REPTILE_OR_SERPENT','FLYING','AQUATIC','AMORPHOUS',
    'FLOATING_GHOST','CENTAUR','TENTACLED','SWARM'
  ];
  for(const bodyPlan of required){
    const detail=MONSTER_BODY_PLAN_MOTION_DETAILS[bodyPlan];
    assert.ok(detail,bodyPlan);
    assert.ok(detail.roles.locomotion.length>0,bodyPlan+' locomotion');
    assert.ok(detail.roles.attacks.length>0,bodyPlan+' attacks');
    assert.ok(detail.roles.reactions.length>0,bodyPlan+' reactions');
    assert.ok(detail.roles.deaths.length>0,bodyPlan+' deaths');
    assert.equal(detail.presentationVariation.weightScale>0,true,bodyPlan+' weight');
    assert.equal(detail.presentationVariation.anticipationPoseScale>0,true,bodyPlan+' anticipation');
    assert.equal(detail.presentationVariation.recoveryPoseScale>0,true,bodyPlan+' recovery');
  }
  assert.ok(MONSTER_BODY_PLAN_MOTION_DETAILS.ARACHNID_SCORPION.roles.attacks.includes('TAIL_STING'));
  assert.ok(MONSTER_BODY_PLAN_MOTION_DETAILS.HEXAPOD_INSECT.roles.acting.includes('ANTENNA_SCAN'));
  assert.ok(MONSTER_BODY_PLAN_MOTION_DETAILS.AQUATIC.roles.locomotion.includes('DIVE'));
  assert.ok(MONSTER_BODY_PLAN_MOTION_DETAILS.AMORPHOUS.roles.reactions.includes('RECOMBINE'));
  assert.ok(MONSTER_BODY_PLAN_MOTION_DETAILS.FLOATING_GHOST.roles.skill.includes('TELEPORT_TELEGRAPH'));
  assert.ok(MONSTER_BODY_PLAN_MOTION_DETAILS.CENTAUR.roles.attacks.includes('RUN_ATTACK'));
  assert.ok(MONSTER_BODY_PLAN_MOTION_DETAILS.TENTACLED.roles.attacks.includes('MULTI_STRIKE'));
  assert.ok(MONSTER_BODY_PLAN_MOTION_DETAILS.SWARM.roles.attacks.includes('SWARM_SURROUND'));
  assert.ok(MONSTER_BODY_PLAN_MOTION_DETAILS.BOSS_BIPED.roles.acting.includes('PHASE_CHANGE'));
});

test('monster body plan aliases resolve into the same common semantic detail',()=>{
  assert.equal(resolveMonsterBodyPlanMotionDetail('humanoid'),MONSTER_BODY_PLAN_MOTION_DETAILS.HUMANOID_UNDEAD);
  assert.equal(resolveMonsterBodyPlanMotionDetail('scorpion'),MONSTER_BODY_PLAN_MOTION_DETAILS.ARACHNID_SCORPION);
  assert.equal(resolveMonsterBodyPlanMotionDetail('slime'),MONSTER_BODY_PLAN_MOTION_DETAILS.AMORPHOUS);
  assert.equal(resolveMonsterBodyPlanMotionDetail('ghost'),MONSTER_BODY_PLAN_MOTION_DETAILS.FLOATING_GHOST);
  assert.equal(resolveMonsterBodyPlanMotionDetail('object_swarm'),MONSTER_BODY_PLAN_MOTION_DETAILS.SWARM);
});

test('creature profile exposes body-plan presentation detail without taking gameplay authority',()=>{
  const scorpion=createCreatureMotionSetProfile({id:'scorpion',archetype:'SCORPION',bodyPlan:'SCORPION'});
  assert.equal(scorpion.motionDetailProfile,MONSTER_BODY_PLAN_MOTION_DETAILS.ARACHNID_SCORPION);
  assert.equal(scorpion.presentationVariation.visualLimbCount,8);
  assert.equal(scorpion.presentationVariation.tailFollow,1.4);
  assert.ok(scorpion.commonSemanticRoles.attacks.includes('TAIL_STING'));
  assert.equal(scorpion.gameplayAuthority,false);
  const swarm=createCreatureMotionSetProfile({id:'swarm',archetype:'SWARM',bodyPlan:'SWARM'});
  assert.equal(swarm.presentationVariation.limbPhase,'SWARM_PHASE_OFFSET');
  assert.ok(MOTION_COMPOSITION_CHANNELS.includes('SWARM_FORMATION'));
  assert.ok(MOTION_COMPOSITION_CHANNELS.includes('TENTACLES'));
  assert.ok(MOTION_COMPOSITION_CHANNELS.includes('BODY_WAVE'));
});

test('common R15 actions retarget into monster body-plan roles without taking gameplay authority',()=>{
  const scorpion=createMonsterCommonActionRetargetPlan({bodyPlan:'SCORPION',archetype:'SCORPION',group:'attacks',count:5});
  assert.equal(scorpion.sourcePack,'roblox-common-motion-v1');
  assert.ok(scorpion.sourceAtomIds.includes('LIGHT_ATTACK_1'));
  assert.ok(scorpion.sourceAtomIds.includes('HEAVY_ATTACK_1'));
  assert.ok(scorpion.targetRoleIds.includes('TAIL_STING'));
  assert.equal(scorpion.mode,'BODY_PLAN_SEMANTIC_RETARGET');
  assert.equal(scorpion.adaptation.visualLimbCount,8);
  assert.equal(scorpion.preserve.damage,true);
  assert.equal(scorpion.preserve.hitbox,true);
  assert.equal(scorpion.preserve.cooldown,true);
  assert.equal(scorpion.directCrossBodyPlanBinaryReuseForbidden,true);
  assert.equal(scorpion.productionVerified,false);
  assert.equal(scorpion.runtimeVerificationRequired,true);
  assert.equal(scorpion.gameplayAuthority,false);

  const humanoid=createMonsterCommonActionRetargetPlan({bodyPlan:'HUMANOID',archetype:'MUMMY',group:'reactions',count:2});
  assert.equal(humanoid.mode,'R15_DIRECT_WHEN_COMPATIBLE_ELSE_RETARGET');
  assert.equal(humanoid.directCrossBodyPlanBinaryReuseForbidden,false);
  assert.ok(COMMON_R15_MONSTER_RETARGET_SOURCES.reactions.includes('HIT_FRONT'));
  assert.equal(createMonsterCommonActionRetargetPlan({bodyPlan:'SWARM',group:'signature'}),null);
});

test('automatic gap fill falls back to common R15 retarget before raw semantic authoring',()=>{
  const insect=createCreatureMotionSetProfile({id:'ant',archetype:'ANT',bodyPlan:'HEXAPOD_INSECT'});
  const plan=buildAutomaticMotionGapFillPlan({profile:insect});
  const attack=plan.actions.find(row=>row.group==='attacks');
  const locomotion=plan.actions.find(row=>row.group==='locomotion');
  const signature=plan.actions.find(row=>row.group==='signature');
  assert.equal(attack.route,'RETARGET_COMPANY_COMMON_R15_MOTION');
  assert.equal(attack.sourceId,'roblox-common-motion-v1');
  assert.ok(attack.commonRetarget.sourceAtomIds.includes('LIGHT_ATTACK_1'));
  assert.equal(attack.commonRetarget.promotionBlockedUntilRuntimeQa,true);
  assert.equal(locomotion.route,'RETARGET_COMPANY_COMMON_R15_MOTION');
  assert.equal(signature.route,'PREPARE_SEMANTIC_MOTION_SEED');
  assert.equal(signature.commonRetarget,null);
  assert.equal(attack.verifiedFill,false);
  assert.equal(attack.promotionBlockedUntilRuntimeQa,true);
});

test('automatic gap fill uses detailed monster body-plan semantic roles',()=>{
  const insect=createCreatureMotionSetProfile({id:'beetle',archetype:'BEETLE',bodyPlan:'HEXAPOD_INSECT'});
  const insectPlan=buildAutomaticMotionGapFillPlan({profile:insect});
  const insectSeeds=insectPlan.actions.flatMap(row=>row.semanticSeeds||[]);
  assert.ok(insectSeeds.some(id=>id.includes('SIX_LEG_WALK')));
  assert.ok(insectSeeds.some(id=>id.includes('MANDIBLE_BITE')||id.includes('HORN_RAM')));
  assert.ok(insectPlan.audit.requiredRoleGaps.includes('ANTENNA_SCAN'));
  const ghost=createCreatureMotionSetProfile({id:'ghost',archetype:'GHOST',bodyPlan:'FLOATING_GHOST'});
  const ghostPlan=buildAutomaticMotionGapFillPlan({profile:ghost});
  const ghostSeeds=ghostPlan.actions.flatMap(row=>row.semanticSeeds||[]);
  assert.ok(ghostSeeds.some(id=>id.includes('FLOAT_IDLE')));
  assert.ok(ghostPlan.audit.requiredRoleGaps.includes('TELEPORT_TELEGRAPH'));
  const boss=createCreatureMotionSetProfile({id:'boss',archetype:'BOSS',bodyPlan:'BOSS_BIPED'});
  const bossPlan=buildAutomaticMotionGapFillPlan({profile:boss});
  assert.ok(bossPlan.audit.requiredRoleGaps.includes('PHASE_CHANGE'));
  assert.ok(bossPlan.audit.requiredRoleGaps.includes('FAILED_ATTACK_RECOVERY'));
});

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

test('mixed samurai wuxia fantasy action remains visual-only and measurable',()=>{
  const motion=buildSkillMotionSequence({combatTraditions:['SAMURAI','WUXIA','FANTASY'],weaponFamily:'KATANA',terrainMaterial:'STONE',effectMaterial:'LIGHTNING'});
  assert.equal(motion.valid,true);
  assert.deepEqual(motion.creativeChoreography.traditions,['SAMURAI','WUXIA','FANTASY']);
  assert.equal(motion.creativeChoreography.styleLayers[0].direction.prepare,'STILLNESS_AND_SHEATH_THUMB');
  assert.equal(motion.creativeChoreography.styleLayers[1].direction.release,'SLEEVE_TRAIL_AND_FOOT_CONTACT_DUST');
  assert.equal(motion.creativeChoreography.styleLayers[2].direction.impact,'ELEMENTAL_CONTACT_BURST_AND_SURFACE_RESPONSE');
  assert.equal(motion.creativeChoreography.vfxTriggers.contact,'CONFIRMED_GAMEPLAY_HIT_ONLY');
  assert.equal(motion.creativeChoreography.vfxTriggers.miss,'NO_CONTACT_BURST');
  assert.ok(motion.creativeChoreography.smoothness.measuredQa.includes('FOOT_PLANT_DRIFT'));
  assert.equal(motion.creativeChoreography.smoothness.betterThanReferenceQualityNotYetVerified,true);
  assert.equal(motion.creativeChoreography.runtimeVerified,false);
  assert.equal(motion.gameplayTimingAuthority,false);
  for(const key of ['DAMAGE','HITBOX','ATTACK_SPEED','COOLDOWN','COMBO_WINDOW','CONTACT_EVENT','ROOT_MOVEMENT','SAVE','MULTIPLAYER_SERVER_AUTHORITY'])assert.ok(motion.creativeChoreography.preserve.includes(key));
  const duel=createDuelCombatAuthoringRecipe({weaponFamily:'KATANA',role:'PARRY_OR_COUNTER',combatTraditions:['WUXIA','SAMURAI']});
  assert.deepEqual(duel.actionPresentation.traditions,['WUXIA','SAMURAI']);
  assert.equal(duel.phases,DUEL_COMBAT_AUTHORING_PHASES.PARRY_OR_COUNTER);
  assert.equal(duel.gameplayAuthority,false);
  const plan=createMotionDirectorPlan({platform:'UNITY',context:{combatTraditions:['WUXIA','FANTASY'],terrainMaterial:'SNOW'},skill:{effectMaterial:'ICE'}});
  assert.deepEqual(plan.skillSequence.creativeChoreography.traditions,['WUXIA','FANTASY']);
  assert.equal(plan.skillSequence.creativeChoreography.terrainMaterial,'SNOW');
  assert.equal(plan.skillSequence.creativeChoreography.effectMaterial,'ICE');
  assert.equal(plan.continuity.runtimeVerified,false);
  assert.equal(buildSkillMotionSequence({combatTraditions:['CUSTOM']}).creativeChoreography.styleLayers[0].direction.impact,'CONFIRMED_CONTACT_ONLY_VFX');
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

test('style defaults reach the composed motion and cannot disable gameplay preservation',()=>{
  const cartoon=createMotionDirectorPlan({styleFamily:'CARTOON'}).composition.styleVariant;
  const dark=createMotionDirectorPlan({styleFamily:'DARK_FANTASY'}).composition.styleVariant;
  assert.notDeepEqual(cartoon.modifiers,dark.modifiers);
  const mixed=createMotionDirectorPlan({styleFamily:'CARTOON',styles:[{family:'CARTOON',weight:.6},{family:'DARK_FANTASY',weight:.4}]}).composition.styleVariant;
  assert.equal(mixed.profileKey,'TOON_NOIR');
  assert.equal(deriveMotionStyleVariant({preserve:{damage:false,contactMarkerSync:false}}).preserve.damage,true);
  assert.equal(deriveMotionStyleVariant({preserve:{damage:false,contactMarkerSync:false}}).preserve.contactMarkerSync,true);
  assert.equal(mixed.application.generatedClip,false);
  assert.equal(mixed.application.preserveAuthoredImpactAndClipDuration,true);
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
  assert.equal(plan.companyGraphicsLibrary.duelCombatMotion.enabled,true);
  assert.ok(plan.companyGraphicsLibrary.weaponPacks.includes('KATANA'));
  assert.ok(plan.companyGraphicsLibrary.duelCombatMotion.unarmedStyles.includes('MUAY_THAI'));
  assert.ok(plan.companyGraphicsLibrary.duelCombatMotion.requiredRoles.includes('LIGHT_COMBO'));
  assert.equal(plan.companyGraphicsLibrary.duelCombatMotion.exactThirdPartyClipCopyForbidden,true);
});


test('asset planner exposes survival wildlife graphics skins and motion previews',async()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const {buildVibeAssetProductionPlan,assetProductionGuidance}=await import('../tools/vibe2-asset-production-plan.mjs');
  const plan=buildVibeAssetProductionPlan({
    task:{gameId:'motion-auto-test',goal:'그레이브우드 느낌 생존게임 곰 멧돼지 동물 그래픽 스킨 모션 추가'},
    target:'roblox',
    repoRoot:path.resolve(here,'..')
  });
  assert.equal(plan.companyGraphicsLibrary.survivalWildlife.enabled,true);
  assert.equal(plan.companyGraphicsLibrary.survivalWildlife.requested,true);
  assert.equal(plan.companyGraphicsLibrary.survivalWildlife.requestedSpecies,'BOAR');
  assert.ok(plan.companyGraphicsLibrary.survivalWildlife.species.includes('BEAR'));
  assert.ok(plan.companyGraphicsLibrary.survivalWildlife.species.includes('RABBIT'));
  assert.ok(plan.companyGraphicsLibrary.survivalWildlife.playerSkins.includes('FOREST_SCAVENGER_DARK'));
  assert.equal(plan.companyGraphicsLibrary.survivalWildlife.wildlifeVisualPreview.visualRequirements.meshAndMaterialMustExceedPrimitivePlaceholder,true);
  assert.equal(plan.companyGraphicsLibrary.survivalWildlife.wildlifeMotionPreview.nativePath.rootOnlyForbidden,true);
  assert.equal(plan.companyGraphicsLibrary.survivalWildlife.playerMotionPreview.nativePath.primary,'ANIMATOR_ANIMATIONTRACK');
  assert.equal(plan.companyGraphicsLibrary.survivalWildlife.reference.game,'100 Days in Gravewood');
  assert.equal(plan.companyGraphicsLibrary.survivalWildlife.reference.gameplayVideoReferenceVerified,false);
  assert.equal(plan.companyGraphicsLibrary.baseMotionQualityWorkSession.defaultMinutes,60);
  assert.equal(plan.companyGraphicsLibrary.baseMotionQualityWorkSession.priority,'EXISTING_BASIC_MOTION_AND_ACTION_QUALITY_FIRST');
  assert.match(assetProductionGuidance(plan),/\[BASE MOTION QUALITY WORK\]/);
  assert.match(assetProductionGuidance(plan),/기존 판정 이벤트 시점은 보존/);
});

test('asset planner auto-detects requested duel weapon and martial style',async()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const {buildVibeAssetProductionPlan}=await import('../tools/vibe2-asset-production-plan.mjs');
  const unarmed=buildVibeAssetProductionPlan({
    task:{gameId:'motion-auto-test',goal:'맨손 무에타이 결투 전투 모션 추가'},
    target:'roblox',
    repoRoot:path.resolve(here,'..')
  });
  assert.equal(unarmed.companyGraphicsLibrary.duelCombatMotion.requested,true);
  assert.equal(unarmed.companyGraphicsLibrary.duelCombatMotion.requestedWeaponFamily,'UNARMED');
  assert.equal(unarmed.companyGraphicsLibrary.duelCombatMotion.requestedMartialStyle,'MUAY_THAI');
  assert.equal(unarmed.companyGraphicsLibrary.duelCombatMotion.requestedCombatRole,'LIGHT_COMBO');
  assert.equal(unarmed.companyGraphicsLibrary.duelCombatMotion.authoringPreview.martialMechanics.guard,'HIGH_LONG');
  assert.equal(unarmed.companyGraphicsLibrary.duelCombatMotion.authoringPreview.nativePath.primary,'ANIMATOR_ANIMATIONTRACK');

  const katana=buildVibeAssetProductionPlan({
    task:{gameId:'motion-auto-test',goal:'카타나 대전 모션 적용'},
    target:'roblox',
    repoRoot:path.resolve(here,'..')
  });
  assert.equal(katana.companyGraphicsLibrary.duelCombatMotion.requested,true);
  assert.equal(katana.companyGraphicsLibrary.duelCombatMotion.requestedWeaponFamily,'KATANA');
  assert.equal(katana.companyGraphicsLibrary.duelCombatMotion.requestedMartialStyle,null);
  assert.equal(katana.companyGraphicsLibrary.duelCombatMotion.requestedCombatRole,'LIGHT_COMBO');
  assert.equal(katana.companyGraphicsLibrary.duelCombatMotion.authoringPreview.weaponMechanics.stance,'SIDE_ON_TWO_HAND');
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

test('measured transition detects joint popping and produces only bounded visual keyframe repair candidates',()=>{
  const values={poseDiscontinuity:2,rootVelocityDelta:3,angularVelocityDelta:2,footContactBreak:0,handContactBreak:0,contactMarkerOffset:1,blendDurationPenalty:0,silhouettePop:0};
  const trace=continuityFixture();
  const smooth=evaluateMotionTransition({from:{id:'idle'},to:{id:'walk'},metrics:values,continuityTrace:trace,blendDurationSeconds:.16});
  assert.equal(smooth.verdict,'PASS');
  assert.equal(smooth.measuredContinuity.verdict,'PASS');
  assert.equal(smooth.smoothingProposal.generated,false);
  assert.equal(smooth.runtimeVerified,false);
  trace.frames[15].jointPositions.head=[0,2.6,0];
  const popped=evaluateMotionTransition({from:{id:'walk'},to:{id:'run'},metrics:values,continuityTrace:trace,blendDurationSeconds:.01});
  assert.equal(popped.verdict,'FAIL');
  assert.ok(popped.hardFailures.includes('MEASURED_TRANSITION_DISCONTINUITY'));
  assert.ok(popped.hardFailures.includes('SHORT_BLEND_WITH_MEASURED_POP'));
  assert.ok(popped.smoothingProposal.generated);
  assert.equal(popped.smoothingProposal.nativeReplayRequired,true);
  assert.equal(popped.smoothingProposal.automaticAssetPromotionAllowed,false);
  assert.ok(popped.smoothingProposal.corrections.every(row=>row.displacementMeters<=.05+1e-10));
  assert.deepEqual(trace.frames[15].jointPositions.head,[0,2.6,0],'original clip remains untouched');
  trace.expectedSourceHash='different-revision';
  assert.equal(evaluateMotionTransition({metrics:values,continuityTrace:trace}).verdict,'UNVERIFIED');
  const shortButSmooth=evaluateMotionTransition({metrics:values,continuityTrace:continuityFixture(),blendDurationSeconds:.01});
  assert.equal(shortButSmooth.verdict,'WARN');
});

test('automatic contact QA blocks promotion when foot or attack contact drifts',()=>{
  const pass=auditMotionContact({
    footSlideNormalized:0.01,
    footPlantDriftNormalized:0.01,
    handWeaponOffsetNormalized:0.01,
    attackContactOffsetNormalized:0.02,
    pairContactOffsetNormalized:0.02,
    impactEventNormalizedTimeOffset:0.01,
    groundPenetration:false,meshIntersection:false
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

test('contact and transition review cannot turn missing or invalid measurements into a pass',()=>{
  assert.equal(auditMotionContact().verdict,'UNVERIFIED');
  assert.equal(auditMotionContact().score,null);
  assert.equal(evaluateMotionTransition().verdict,'UNVERIFIED');
  const measured={footSlideNormalized:0,footPlantDriftNormalized:0,handWeaponOffsetNormalized:0,
    attackContactOffsetNormalized:0,pairContactOffsetNormalized:0,impactEventNormalizedTimeOffset:0,
    groundPenetration:false,meshIntersection:false};
  assert.equal(auditMotionContact(measured).pass,true);
  for(const value of [undefined,null,NaN,Infinity,-1,'0']){
    assert.equal(auditMotionContact({...measured,footSlideNormalized:value}).blocksVerifiedPromotion,true);
  }
  assert.equal(auditMotionContact({...measured,thresholds:{footSlideNormalizedMax:Infinity}}).pass,false);
  const noWeapon={...measured};delete noWeapon.handWeaponOffsetNormalized;
  assert.equal(auditMotionContact({...noWeapon,notApplicable:{handWeaponOffsetNormalized:'비무장 동작'}}).pass,true);
  assert.equal(auditMotionContact({...measured,footSlideNormalized:.2,notApplicable:{footSlideNormalized:'측정 무시'}}).pass,false);
  const everythingAbsent=Object.fromEntries(Object.keys(measured).map(key=>[key,'해당 없음']));
  assert.equal(auditMotionContact({notApplicable:everythingAbsent}).pass,false);
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
  assert.equal(plan.transition.verdict,'UNVERIFIED');
  assert.equal(plan.contactQa.pass,false);
  assert.equal(plan.contactQa.blocksVerifiedPromotion,true);
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
    ...observedMotionFixture(),
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


test('studio motion teacher reuses canonical action phases and native metrics without granting default tuning authority',()=>{
  const plain=createStudioMotionActionProfile({platform:'ROBLOX'});
  assert.ok(!Object.hasOwn(plain,'teaching'));
  const all=createStudioMotionActionProfile({platform:'ROBLOX',teachingClip:'ALL'}).teaching;
  assert.equal(all.lessons.length,14);
  for(const row of all.lessons){
    assert.deepEqual(row.phases,(DUEL_COMBAT_AUTHORING_PHASES[row.role]||[]).map(phase=>phase.phase));
    assert.ok(row.lesson.length>150);
  }
  for(const [clip,role] of [['walk','COMBAT_LOCOMOTION'],['attack','LIGHT_COMBO'],['heavy_attack_1','HEAVY_ATTACK'],['hit','HIT_REACTION'],['dodge','DODGE'],['jump','AIRBORNE_LOCOMOTION'],['land','AIRBORNE_LOCOMOTION']]){
    const profile=createStudioMotionActionProfile({platform:'ROBLOX',teachingClip:clip});
    const {teaching,...base}=profile;
    assert.deepEqual(base,plain);
    assert.deepEqual(teaching.lessons.map(row=>row.role),[role]);
    assert.equal(teaching.runtimeVerified,false);
    assert.equal(teaching.productionVerified,false);
    assert.equal(teaching.gameplayAuthority,false);
    assert.deepEqual(teaching.nativeReview.metrics,plain.automatedQa.requiredMetrics);
    assert.match(teaching.timing,/Never substitute generic normalized timestamps/);
    assert.equal(teaching.needsSpecificClipBrief,false);
  }
  const unknown=createStudioMotionActionProfile({teachingClip:'unregistered_special_clip'}).teaching;
  assert.equal(unknown.needsSpecificClipBrief,true);
  assert.deepEqual(unknown.lessons,[]);
  const arachnid=createStudioMotionActionProfile({teachingClip:'attack',bodyPlan:'ARACHNID',actorClass:'CREATURE',archetype:'spider',weaponFamily:'CLAW',weightClass:'HEAVY'}).teaching;
  assert.equal(arachnid.version,2);assert.equal(arachnid.performanceStudy.bodyPlan,'ARACHNID');
  assert.equal(arachnid.performanceStudy.weaponFamily,'CLAW');
  assert.match(arachnid.performanceStudy.forcePath,/actual load path/);
  assert.match(arachnid.performanceStudy.review,/velocity and acceleration/);
});

test('studio-grade motion profile binds pose matching warping contact IK reactions audio and mobile LOD without gameplay authority',()=>{
  const profile=createStudioMotionActionProfile({
    platform:'ROBLOX',actorClass:'CREATURE',bodyPlan:'ARACHNID',archetype:'SPIDER',
    weightClass:'HEAVY',limbCount:8,mobile:true
  });
  assert.equal(profile.poseMatching.enabled,true);
  assert.equal(profile.motionWarping.enabled,true);
  assert.equal(profile.contactSolver.damageAndHitboxAuthority,false);
  assert.equal(profile.proceduralIk.multiLimbContact,true);
  assert.equal(profile.proceduralIk.limbCount,8);
  assert.equal(profile.hitReaction.directional,true);
  assert.equal(profile.hitReaction.partialRagdoll.visualPhysicsOnly,true);
  assert.equal(profile.motionAudio.impactAudioFromConfirmedContact,true);
  assert.equal(profile.mobilePerformance.targetFps,60);
  assert.equal(profile.mobilePerformance.hardFloorFps,30);
  assert.ok(profile.systems.includes('MOTION_AUDIO_SYNC'));
  assert.ok(profile.systems.includes('AUTOMATED_MOTION_QA'));
  assert.equal(profile.gameplayAuthority,false);

  const blend=createRobloxMotionBlendProfile();
  assert.equal(blend.poseMatching.required,true);
  assert.equal(blend.inertializationRequired,true);
  assert.equal(blend.footPhaseAwareBlendRequired,true);
  assert.equal(blend.additiveLayersRequired,true);

  const procedural=createProceduralMotionProfile({limbCount:8});
  assert.equal(procedural.corrections.FOOT_PLANT_LOCK,true);
  assert.equal(procedural.corrections.MULTI_LIMB_CONTACT,true);
  assert.equal(procedural.corrections.HAND_WORLD_CONTACT,true);
  assert.equal(procedural.corrections.WEAPON_GRIP_LOCK,true);

  const reaction=createReactionMatch({impactStrength:'HEAVY',impactDirection:'LEFT',bodyRegion:'HEAD'});
  assert.equal(reaction.output,'FULL_BODY_HIT');
  assert.equal(reaction.tags.bodyRegion,'HEAD');
  assert.equal(reaction.partialRagdoll.enabled,true);
  assert.equal(reaction.partialRagdoll.authoritativeRootAndColliderImmutable,true);

  const far=selectMotionLod({cameraDistance:80,screenSize:.02,deviceClass:'LOW_END_MOBILE',combatRelevant:false});
  assert.equal(far.tier,'FAR');
  assert.equal(far.budget.animationHz,15);
  assert.equal(far.budget.ikHz,0);
  assert.equal(far.gameplayHitAndCollisionUnaffected,true);

  const offscreen=selectMotionLod({visible:false,deviceClass:'LOW_END_MOBILE'});
  assert.equal(offscreen.tier,'OFFSCREEN');
  assert.equal(offscreen.budget.animationHz,5);
});

test('motion director and Roblox character plan expose the studio-grade suite for creatures and humanoids',()=>{
  const plan=createMotionDirectorPlan({
    platform:'ROBLOX',bodyPlan:'ARACHNID',rigProfile:'SPIDER_HD',
    context:{actorClass:'CREATURE',archetype:'SPIDER',limbCount:8,weightClass:'HEAVY'},
    studio:{limbCount:8,weightClass:'HEAVY'}
  });
  assert.equal(plan.studioGrade.proceduralIk.multiLimbContact,true);
  assert.equal(plan.studioGrade.weightedAttack.weightClass,'HEAVY');
  assert.ok(plan.systems.includes('POSE_MATCH_TRANSITION'));
  assert.ok(plan.systems.includes('MOTION_WARPING'));
  assert.ok(plan.systems.includes('PARTIAL_RAGDOLL'));
  assert.ok(plan.systems.includes('MOBILE_FRAME_BUDGET'));

  const roblox=createRobloxCharacterMotionPlan({
    actorClass:'CREATURE',bodyPlan:'ARACHNID',rigProfile:'SPIDER_HD',archetype:'SPIDER',
    procedural:{limbCount:8},studio:{limbCount:8,weightClass:'HEAVY'}
  });
  assert.equal(roblox.studioGrade.identity.archetype,'SPIDER');
  assert.equal(roblox.studioGrade.proceduralIk.limbCount,8);
  assert.equal(roblox.procedural.corrections.MULTI_LIMB_CONTACT,true);
  assert.equal(roblox.rootTransformOnlyVisualLocomotionForbidden,true);
});
