// 파일명: assets/vibe-character-identity-director.js
// 역할: 캐릭터의 종족/체형/키/체중/신체비율/장비/개인특징을 외형·에셋·걷기·동작 언어로 연결하는 결정론적 정체성 Director
// 절대 규칙: 개발/디자인 AI 사용 금지. 외형·모션 다양화로 이동속도/판정/데미지/쿨타임/AI결과/저장/진행 규칙을 변경하지 않음.

const uniq=a=>[...new Set((a||[]).filter(Boolean))];
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function hash(s=''){let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function pick(seed,a,n=0){return a.length?a[(seed+n)%a.length]:null}
const ARCHETYPES=Object.freeze({melee:{stance:'forward-weighted',move:['grounded-step','weapon-counterbalance'],attack:['commit-windup','body-rotation','heavy-follow-through']},ranged:{stance:'open-aim',move:['light-step','aim-stabilize'],attack:['aim-settle','release-snap','recoil-settle']},healer:{stance:'protected-center',move:['calm-glide','hand-focus'],attack:['gather','channel','release-wave']},insect:{stance:'low-alert',move:['alternating-leg-rhythm','antenna-scan','body-stabilize'],attack:['prey-lock','thorax-drive','snap-back']},flying:{stance:'hover',move:['bank','lift-response','wing-cycle'],attack:['target-dip','burst','recover-altitude']},heavy:{stance:'wide-grounded',move:['weight-shift','slow-settle'],attack:['large-anticipation','mass-drive','long-recovery']},magic:{stance:'focus-ready',move:['robe-or-part-lag','focus-hand'],attack:['sigil-prep','charge','cast-release']}});

export const VIBE_CHARACTER_CUSTOMIZATION_BREADTH_CONTRACT=Object.freeze({
  version:1,
  status:'ACTIVE_MACHINE_READABLE_INTERNAL_CHARACTER_CUSTOMIZATION',
  target:'AAA_DEEP_RPG_CHARACTER_CREATOR_BREADTH_WITH_ORIGINAL_ASSETS',
  referenceUse:'SYSTEM_BREADTH_AND_EXPRESSION_PRINCIPLES_ONLY',
  protectedExpressionCopyForbidden:true,
  exactThirdPartyFaceHairTattooOutfitUiCopyForbidden:true,
  sharedAssetPoolForPlayerAndNpc:true,
  npcUsesSameMorphPartMaterialAndMotionGrammar:true,
  generatedCombinationSpaceIsNotAuthoredAssetCount:true,
  targetMinimums:Object.freeze({
    BODY_ARCHETYPE:12,
    HEIGHT_BAND:8,
    VISUAL_MASS_BAND:6,
    FRAME_FAMILY:8,
    BODY_PROPORTION_PROFILE:24,
    HEAD_BASE:48,
    FACE_MORPH_CONTROL:28,
    SKIN_TONE_FAMILY:32,
    SKIN_DETAIL:24,
    EYE_COLOR:32,
    EYE_SHAPE:20,
    BROW_STYLE:20,
    HAIR_STYLE:48,
    HAIR_COLOR:32,
    HAIR_HIGHLIGHT:24,
    HAIR_GRAYING:12,
    FACIAL_HAIR:24,
    SCAR:24,
    TATTOO_OR_BODY_MARK:32,
    MAKEUP:32,
    PIERCING:24,
    AGE_PRESENTATION:12,
    SPECIES_PART:32,
    CLOTHING_LAYER_VARIANT:60,
    ACCESSORY:48,
    EXPRESSION_SET:24,
    GAIT_IDENTITY:24,
    VOICE_PRESENTATION:12
  }),
  bodyAxes:Object.freeze([
    'HEIGHT_PRESENTATION','VISUAL_MASS','SHOULDER_WIDTH','TORSO_LENGTH','TORSO_DEPTH','PELVIS_WIDTH',
    'ARM_LENGTH','LEG_LENGTH','HAND_FOOT_SCALE','HEAD_BODY_RATIO','POSTURE','ASYMMETRY'
  ]),
  faceAxes:Object.freeze([
    'HEAD_BASE','FACE_WIDTH','FACE_LENGTH','FOREHEAD','BROW_HEIGHT','BROW_ANGLE','EYE_SPACING','EYE_SIZE','EYE_TILT',
    'NOSE_BRIDGE','NOSE_LENGTH','NOSE_WIDTH','CHEEKBONE','CHEEK_FULLNESS','MOUTH_WIDTH','LIP_VOLUME','PHILTRUM',
    'JAW_WIDTH','JAW_DEPTH','CHIN_WIDTH','CHIN_PROJECTION','EAR_SIZE','EAR_ANGLE','LEFT_RIGHT_ASYMMETRY'
  ]),
  surfaceAxes:Object.freeze([
    'SKIN_TONE','UNDERTONE','FRECKLES','VITILIGO_OR_PIGMENT_PATTERN','BLEMISH','SCAR','TATTOO_OR_BODY_MARK',
    'MAKEUP_EYE','MAKEUP_LIP','MAKEUP_FACE','ROUGHNESS','WEATHERING','AGE_LINES'
  ]),
  eyeHairAxes:Object.freeze([
    'LEFT_EYE_COLOR','RIGHT_EYE_COLOR','HETEROCHROMIA','IRIS_PATTERN','SCLERA_TINT','BROW_STYLE',
    'HAIR_STYLE','HAIR_TEXTURE','HAIR_LENGTH','HAIR_PRIMARY_COLOR','HAIR_HIGHLIGHT','HAIR_GRAYING',
    'FACIAL_HAIR_STYLE','FACIAL_HAIR_COLOR'
  ]),
  speciesAxes:Object.freeze([
    'EAR_SHAPE','HORN_SHAPE','HORN_COLOR','TAIL_SHAPE','CREST','SHELL_OR_SCALE_REGION','FANG_OR_TUSK','SPECIES_APPENDAGE'
  ]),
  outfitAxes:Object.freeze([
    'HEAD','HAIR','FACE','EAR','NECK','TORSO_BASE','TORSO_INNER','TORSO_OUTER','SHOULDER','ARM',
    'GLOVE','WAIST','BELT','HIP','LEG_INNER','LEG_OUTER','BOOT','BACK','CAPE','PIERCING','ACCESSORY','SPECIES_PART'
  ]),
  npcContextAxes:Object.freeze([
    'REGION','CULTURE','OCCUPATION','FACTION','SOCIAL_CLASS','WEALTH','AGE_BAND','CLIMATE','DAMAGE_WEAR','PERSONAL_HISTORY'
  ]),
  presentationAxes:Object.freeze([
    'EXPRESSION_SET','IDLE_PERSONALITY','GAIT_IDENTITY','GESTURE_FAMILY','VOICE_PRESENTATION','EQUIPMENT_CARRY_STYLE'
  ]),
  npcPopulationRules:Object.freeze({
    colorOnlyDuplicateForbidden:true,
    faceSwapCloneForbidden:true,
    minimumDistinctIdentityAxesPerNearbyPair:5,
    minimumDistinctBodyAxesPerNearbyPair:3,
    heightAndVisualMassMustParticipateInPopulationDiversity:true,
    scaleOnlyDuplicateForbidden:true,
    sameHeadHairOutfitCombinationReuseLimitPerLocalCrowd:1,
    sameHeightMassFrameCombinationReuseLimitPerLocalCrowd:2,
    regionAndOccupationMayBiasSelectionButDoNotHardLockEligibility:true,
    heroNpcGetsCloseupDetailPriority:true,
    backgroundNpcMayUseLodButMustKeepDistinctSilhouette:true,
    deterministicRecipeFromStableSeed:true,
    speciesPartCompatibilityRequired:true,
    gameplayStatsUnaffected:true,
    roleProfileRequired:true,
    colorOnlyRoleVariantForbidden:true,
    roleSpecificSilhouetteEquipmentStanceAndMotionRequired:true
  }),
  production:Object.freeze({
    preferExistingMorphPartRigAndMaterialLibrary:true,
    licensedFreeSourceAdaptationBeforeNewAuthoring:true,
    photoObservationMaySeedVisibleFormAndSurfaceIdeas:true,
    unseenGeometryAndMotionRemainCreativeProposals:true,
    editableDccSourceRequiredForNewMorphs:true,
    platformNativeVariantsRequired:true,
    mobileLodRequired:true,
    runtimeVerificationRequiredBeforeProductionPromotion:true,
    final3dNpcMasterGlbRequired:true,
    primitivePartOrWeldOnlyNpcPrototypeOnly:true,
    platformNativeRigAndAnimationBindingRequired:true
  }),
  gameplayAuthority:false,
  balanceAuthority:false,
  saveAuthority:false,
  networkAuthority:false
});

export const VIBE_NPC_ROLE_PRODUCTION_CONTRACT=Object.freeze({
  version:2,
  status:'ACTIVE_MACHINE_READABLE_NPC_ROLE_PRODUCTION',
  final3dMasterFormat:'GLB_2_0',
  physicalDiversity:Object.freeze({
    required:true,
    appearanceOnlyByDefault:true,
    collisionHitboxMovementStatsRemainGameOwned:true,
    axes:Object.freeze([
      'HEIGHT_CM','WEIGHT_KG','VISUAL_MASS','FRAME','SHOULDER_WIDTH','TORSO_LENGTH','TORSO_DEPTH','PELVIS_WIDTH',
      'ARM_LENGTH','LEG_LENGTH','HAND_FOOT_SCALE','HEAD_BODY_RATIO','POSTURE','ASYMMETRY'
    ]),
    nearbyDistinctAxisMinimum:5,
    heroCompanionEliteBossDistinctAxisTarget:8,
    colorOnlySizeOnlyOrFaceOnlyCloneForbidden:true,
    roleRanges:Object.freeze({
      GENERAL_NPC:Object.freeze({heightCm:Object.freeze([145,198]),weightKg:Object.freeze([42,135])}),
      COMPANION:Object.freeze({heightCm:Object.freeze([145,205]),weightKg:Object.freeze([42,145])}),
      ALLY:Object.freeze({heightCm:Object.freeze([150,210]),weightKg:Object.freeze([45,155])}),
      STORY_CHARACTER:Object.freeze({heightCm:Object.freeze([145,210]),weightKg:Object.freeze([40,150])}),
      CIVILIAN:Object.freeze({heightCm:Object.freeze([140,200]),weightKg:Object.freeze([38,140])}),
      MERCHANT:Object.freeze({heightCm:Object.freeze([145,205]),weightKg:Object.freeze([42,160])}),
      QUEST_GIVER:Object.freeze({heightCm:Object.freeze([145,205]),weightKg:Object.freeze([40,150])}),
      GUARD:Object.freeze({heightCm:Object.freeze([155,215]),weightKg:Object.freeze([50,175])}),
      WORKER:Object.freeze({heightCm:Object.freeze([150,210]),weightKg:Object.freeze([48,175])}),
      ARTISAN:Object.freeze({heightCm:Object.freeze([145,205]),weightKg:Object.freeze([42,160])}),
      FARMER:Object.freeze({heightCm:Object.freeze([145,210]),weightKg:Object.freeze([45,170])}),
      HEALER:Object.freeze({heightCm:Object.freeze([145,205]),weightKg:Object.freeze([40,145])}),
      TRAINER:Object.freeze({heightCm:Object.freeze([150,215]),weightKg:Object.freeze([48,175])}),
      RIVAL:Object.freeze({heightCm:Object.freeze([150,220]),weightKg:Object.freeze([45,180])}),
      HOSTILE_HUMANOID:Object.freeze({heightCm:Object.freeze([145,220]),weightKg:Object.freeze([45,190])}),
      NAMED_ELITE:Object.freeze({heightCm:Object.freeze([155,235]),weightKg:Object.freeze([55,205])}),
      HUMANOID_BOSS:Object.freeze({heightCm:Object.freeze([165,260]),weightKg:Object.freeze([70,220])}),
      PLAYER:Object.freeze({heightCm:Object.freeze([145,210]),weightKg:Object.freeze([40,155])})
    })
  }),
  appearanceDiversity:Object.freeze({
    required:true,
    axes:Object.freeze([
      'HEAD_BASE','FACE_PROPORTION','EYE_SHAPE_AND_COLOR','BROW','NOSE','CHEEKBONE','MOUTH','JAW','EAR',
      'HAIR_STYLE','HAIR_TEXTURE','HAIR_COLOR','FACIAL_HAIR','SKIN_OR_SPECIES_SURFACE','AGE_CUE',
      'SCAR_MARK_TATTOO','OUTFIT_LAYERING','ROLE_EQUIPMENT','ACCESSORY','WEAR_HISTORY'
    ]),
    majorNpcFaceHairOutfitCombinationMustBeUnique:true,
    repeatedNearbyHeadHairOutfitCombinationForbidden:true,
    bossAndNamedEliteRequireUniqueSilhouetteAndSurfaceTreatment:true,
    companionRequiresPlayerReadablePartySilhouette:true
  }),
  roles:Object.freeze([
    'PLAYER','GENERAL_NPC','COMPANION','ALLY','STORY_CHARACTER','CIVILIAN','MERCHANT','QUEST_GIVER','GUARD',
    'WORKER','ARTISAN','FARMER','HEALER','TRAINER','RIVAL','HOSTILE_HUMANOID','NAMED_ELITE','HUMANOID_BOSS'
  ]),
  commonFinalRequirements:Object.freeze([
    'DISTINCT_SILHOUETTE','ROLE_EQUIPMENT_OR_PROP_LANGUAGE','ROLE_STANCE_AND_GAIT','IDLE_AND_INTERACTION_MOTION',
    'SKINNED_RIG','ACTIVE_JOINT_MOTION','MOBILE_LOD','PLATFORM_NATIVE_BINDING'
  ]),
  sharedMasterGlbReuseAllowed:true,
  sharedMasterDoesNotPermitColorOnlyRoleClone:true,
  roleDifferentiationAxes:Object.freeze(['SILHOUETTE','HEIGHT_VISUAL_MASS','BODY_PROPORTION','FACE_HAIR_SURFACE','OUTFIT_EQUIPMENT','STANCE_GAIT','IDLE_INTERACTION_MOTION','FACE_GESTURE','WEAR_HISTORY']),
  minimumDistinctRoleAxes:3,
  namedCompanionEliteBossMinimumDistinctIdentityAxes:6,
  primitivePartOrWeldOnlyFinalNpcForbidden:true,
  rootTransformOnlyVisibleMotionForbidden:true,
  gameplayAuthority:false,
  balanceAuthority:false,
  aiAuthority:false
});

const NPC_ROLE_ALIASES=Object.freeze({
  NPC:'GENERAL_NPC',VILLAGER:'CIVILIAN',RESIDENT:'CIVILIAN',SHOPKEEPER:'MERCHANT',VENDOR:'MERCHANT',SERVICE_NPC:'MERCHANT',
  QUEST:'QUEST_GIVER',QUESTGIVER:'QUEST_GIVER',SOLDIER:'GUARD',COMPANION_NPC:'COMPANION',PARTY_MEMBER:'COMPANION',
  FRIENDLY:'ALLY',FRIENDLY_CHARACTER:'ALLY',ENEMY:'HOSTILE_HUMANOID',HUMANOID_ENEMY:'HOSTILE_HUMANOID',ELITE:'NAMED_ELITE',
  MINI_BOSS:'NAMED_ELITE',BOSS:'HUMANOID_BOSS',RAID_BOSS:'HUMANOID_BOSS',NPC_BOSS:'HUMANOID_BOSS',CHARACTER_BOSS:'HUMANOID_BOSS'
});

function npcRoleKey(role='GENERAL_NPC'){
  const raw=String(role||'GENERAL_NPC').trim().toUpperCase().replace(/[\s-]+/g,'_');
  return NPC_ROLE_ALIASES[raw]||raw;
}

const NPC_COMMON_ACTOR_MOTION_CLIPS=Object.freeze([
  'IDLE','WALK','JOG_OR_RUN','START','STOP','TURN','LOOK_AROUND','HIT','DEATH'
]);
const NPC_ROLE_MOTION_CLIPS=Object.freeze({
  PLAYER:Object.freeze([...NPC_COMMON_ACTOR_MOTION_CLIPS,'INTERACT','COMBAT_READY','ATTACK_LIGHT','ATTACK_HEAVY','BLOCK','DODGE','CAST_PREPARE','CAST_RELEASE']),
  GENERAL_NPC:Object.freeze([...NPC_COMMON_ACTOR_MOTION_CLIPS,'TALK','WAVE','SIT','STAND','WORK_IDLE']),
  CIVILIAN:Object.freeze([...NPC_COMMON_ACTOR_MOTION_CLIPS,'TALK','WAVE','SIT','STAND','WORK_IDLE','FEAR_REACTION']),
  MERCHANT:Object.freeze([...NPC_COMMON_ACTOR_MOTION_CLIPS,'GREET','PRESENT_ITEM','POINT','TRADE_INTERACTION','RETURN_IDLE']),
  QUEST_GIVER:Object.freeze([...NPC_COMMON_ACTOR_MOTION_CLIPS,'ATTENTION','EXPLAIN','POINT_DIRECTION','REWARD_HANDOFF']),
  GUARD:Object.freeze([...NPC_COMMON_ACTOR_MOTION_CLIPS,'GUARD_IDLE','ALERT','DRAW_WEAPON','PATROL','CHASE_RUN','ATTACK','BLOCK']),
  WORKER:Object.freeze([...NPC_COMMON_ACTOR_MOTION_CLIPS,'WORK_IDLE','WORK_LOOP','CARRY','TOOL_CONTACT']),
  ARTISAN:Object.freeze([...NPC_COMMON_ACTOR_MOTION_CLIPS,'WORK_IDLE','CRAFT_LOOP','TOOL_CONTACT','PRESENT_RESULT']),
  FARMER:Object.freeze([...NPC_COMMON_ACTOR_MOTION_CLIPS,'WORK_IDLE','FARM_WORK_LOOP','CARRY']),
  HEALER:Object.freeze([...NPC_COMMON_ACTOR_MOTION_CLIPS,'GREET','HEAL_PRESENTATION','ASSIST','RECOVERY']),
  TRAINER:Object.freeze([...NPC_COMMON_ACTOR_MOTION_CLIPS,'DEMONSTRATE','CORRECT','COMBAT_READY']),
  STORY_CHARACTER:Object.freeze([...NPC_COMMON_ACTOR_MOTION_CLIPS,'TALK','DIALOGUE_GESTURE','EMOTION_REACTION','SCENE_ACTION']),
  ALLY:Object.freeze([...NPC_COMMON_ACTOR_MOTION_CLIPS,'FOLLOW','WAIT','COMBAT_READY','ASSIST_ATTACK','REACT_TO_PLAYER']),
  COMPANION:Object.freeze([...NPC_COMMON_ACTOR_MOTION_CLIPS,'FOLLOW','WAIT','COMBAT_READY','ASSIST_ATTACK','REVIVE_HELP','REACT_TO_PLAYER','CELEBRATE']),
  RIVAL:Object.freeze([...NPC_COMMON_ACTOR_MOTION_CLIPS,'DETECT','TAUNT','COMBAT_READY','ATTACK','BLOCK','RECOVERY']),
  HOSTILE_HUMANOID:Object.freeze([...NPC_COMMON_ACTOR_MOTION_CLIPS,'PATROL','DETECT','ALERT','CHASE_RUN','ATTACK_ANTICIPATION','ATTACK','RECOVERY','RETREAT']),
  NAMED_ELITE:Object.freeze([...NPC_COMMON_ACTOR_MOTION_CLIPS,'INTRO','DETECT','BASIC_ATTACK_SET','SPECIAL_ATTACK_SET','ENRAGE','STUN','GUARD_BREAK','RECOVERY','FINISHER','DEATH_SEQUENCE']),
  HUMANOID_BOSS:Object.freeze([...NPC_COMMON_ACTOR_MOTION_CLIPS,'INTRO','DETECT','IDLE_BOSS','BASIC_ATTACK_SET','SPECIAL_ATTACK_SET','PHASE_CHANGE','ENRAGE','STUN','GUARD_BREAK','FAILED_ATTACK_RECOVERY','RECOVERY','FINISHER','DEATH_SEQUENCE'])
});
const NPC_COMMON_STATE_MOTION_BINDINGS=Object.freeze({
  CALM:Object.freeze(['IDLE','BREATH','WEIGHT_SHIFT']),
  IDLE:Object.freeze(['IDLE','LOOK_AROUND']),
  PATROL:Object.freeze(['START','WALK','TURN','STOP']),
  WORK:Object.freeze(['WORK_IDLE','WORK_LOOP']),
  INTERACT:Object.freeze(['TURN','INTERACT']),
  TALK:Object.freeze(['TURN','TALK']),
  FOLLOW:Object.freeze(['START','WALK','JOG_OR_RUN','TURN','STOP']),
  ALERT:Object.freeze(['LOOK_AROUND','TURN','ALERT']),
  SEARCH:Object.freeze(['LOOK_AROUND','WALK','TURN']),
  FEAR:Object.freeze(['FEAR_REACTION','BACKSTEP']),
  ANGER:Object.freeze(['ALERT','COMBAT_READY']),
  INJURED:Object.freeze(['HIT','INJURED_IDLE']),
  COMBAT:Object.freeze(['COMBAT_READY','ATTACK_ANTICIPATION','ATTACK','RECOVERY']),
  RETREAT:Object.freeze(['TURN','JOG_OR_RUN','STOP']),
  DEAD:Object.freeze(['DEATH'])
});
const NPC_ROLE_STATE_MOTION_BINDINGS=Object.freeze({
  MERCHANT:Object.freeze({
    INTERACT:Object.freeze(['FACE_PLAYER','GREET','PRESENT_ITEM','TRADE_INTERACTION','RETURN_IDLE']),
    TALK:Object.freeze(['FACE_PLAYER','TALK','PRESENT_ITEM','RETURN_IDLE'])
  }),
  QUEST_GIVER:Object.freeze({
    INTERACT:Object.freeze(['FACE_PLAYER','ATTENTION','EXPLAIN','POINT_DIRECTION','REWARD_HANDOFF']),
    TALK:Object.freeze(['FACE_PLAYER','EXPLAIN','POINT_DIRECTION'])
  }),
  GUARD:Object.freeze({
    PATROL:Object.freeze(['GUARD_IDLE','START','PATROL','TURN','STOP']),
    ALERT:Object.freeze(['HEAD_GAZE','TURN','DRAW_WEAPON','CHASE_RUN','ATTACK_ANTICIPATION','ATTACK','RECOVERY']),
    COMBAT:Object.freeze(['COMBAT_READY','ATTACK_ANTICIPATION','ATTACK','BLOCK','RECOVERY'])
  }),
  COMPANION:Object.freeze({
    FOLLOW:Object.freeze(['FOLLOW','START','WALK','JOG_OR_RUN','TURN','STOP']),
    COMBAT:Object.freeze(['COMBAT_READY','ASSIST_ATTACK','RECOVERY']),
    INTERACT:Object.freeze(['REACT_TO_PLAYER','TURN','INTERACT']),
    INJURED:Object.freeze(['HIT','REVIVE_HELP'])
  }),
  HOSTILE_HUMANOID:Object.freeze({
    PATROL:Object.freeze(['PATROL','TURN','LOOK_AROUND']),
    ALERT:Object.freeze(['DETECT','ALERT','TURN','CHASE_RUN']),
    COMBAT:Object.freeze(['ATTACK_ANTICIPATION','ATTACK','RECOVERY']),
    RETREAT:Object.freeze(['RETREAT','TURN','JOG_OR_RUN'])
  }),
  NAMED_ELITE:Object.freeze({
    ALERT:Object.freeze(['INTRO','DETECT','ENRAGE']),
    COMBAT:Object.freeze(['BASIC_ATTACK_SET','SPECIAL_ATTACK_SET','STUN','GUARD_BREAK','RECOVERY','FINISHER']),
    DEAD:Object.freeze(['DEATH_SEQUENCE'])
  }),
  HUMANOID_BOSS:Object.freeze({
    ALERT:Object.freeze(['INTRO','DETECT','IDLE_BOSS']),
    COMBAT:Object.freeze(['BASIC_ATTACK_SET','SPECIAL_ATTACK_SET','PHASE_CHANGE','ENRAGE','STUN','GUARD_BREAK','FAILED_ATTACK_RECOVERY','RECOVERY','FINISHER']),
    DEAD:Object.freeze(['DEATH_SEQUENCE'])
  })
});

export const VIBE_NPC_ROLE_MOTION_REQUIREMENTS=Object.freeze({
  version:1,
  status:'ACTIVE_MACHINE_READABLE_NPC_ROLE_MOTION',
  commonCoreClips:NPC_COMMON_ACTOR_MOTION_CLIPS,
  gameplayStates:Object.freeze(['CALM','IDLE','PATROL','WORK','INTERACT','TALK','FOLLOW','ALERT','SEARCH','FEAR','ANGER','INJURED','COMBAT','RETREAT','DEAD']),
  roleRequiredClips:NPC_ROLE_MOTION_CLIPS,
  commonStateBindings:NPC_COMMON_STATE_MOTION_BINDINGS,
  roleStateBindings:NPC_ROLE_STATE_MOTION_BINDINGS,
  continuity:Object.freeze({
    animationTrackCrossFadeRequired:true,
    locomotionPlaybackSpeedSyncRequired:true,
    startStopTurnContinuityRequired:true,
    attackAnticipationImpactRecoveryRequired:true,
    hitReactionRequired:true,
    deathTransitionRequired:true,
    rootTransformOnlyMotionForbidden:true,
    activeJointMotionRequired:true,
    upperLowerBodyLayeringWhenSupported:true
  }),
  masterActor:Object.freeze({
    masterAssetFormat:'GLB_2_0',
    skeletonSkinJointWeightsRequired:true,
    jointAnimationChannelsRequired:true,
    attachmentSocketBasis:Object.freeze(['HAND','BACK','HIP','SHIELD','TOOL']),
    mobileLodRequired:true,
    platformNativeAnimatorBindingRequired:true,
    platformRuntimeVerificationIndependent:true,
    masterStaticQaDoesNotGrantProductionVerified:true
  }),
  gameplayAuthority:false,
  aiAuthority:false
});

export function createVibeNpcRoleMotionRequirement({role='GENERAL_NPC'}={}){
  const normalized=npcRoleKey(role);
  const resolved=NPC_ROLE_MOTION_CLIPS[normalized]?normalized:'GENERAL_NPC';
  const overrides=NPC_ROLE_STATE_MOTION_BINDINGS[resolved]||{};
  const stateBindings=Object.freeze(Object.fromEntries(
    VIBE_NPC_ROLE_MOTION_REQUIREMENTS.gameplayStates.map(state=>[
      state,Object.freeze([...(overrides[state]||NPC_COMMON_STATE_MOTION_BINDINGS[state]||[])])
    ])
  ));
  return Object.freeze({
    version:VIBE_NPC_ROLE_MOTION_REQUIREMENTS.version,
    role:resolved,
    requiredClips:Object.freeze([...(NPC_ROLE_MOTION_CLIPS[resolved]||NPC_COMMON_ACTOR_MOTION_CLIPS)]),
    stateBindings,
    continuity:VIBE_NPC_ROLE_MOTION_REQUIREMENTS.continuity,
    masterActor:VIBE_NPC_ROLE_MOTION_REQUIREMENTS.masterActor,
    bindOnlyToExistingGameStates:true,
    authoritativeAiAndGameplayRemainGameOwned:true,
    runtimeVerified:false
  });
}
function seededRange(seed,[min,max],offset=0){
  const t=((seed+Math.imul(offset+1,2246822519))>>>0)/4294967295;
  return Math.round((min+(max-min)*t)*10)/10;
}
export function createVibeNpcPhysicalProfile(character={},index=0){
  const role=npcRoleKey(character.role);
  const resolved=VIBE_NPC_ROLE_PRODUCTION_CONTRACT.physicalDiversity.roleRanges[role]?role:'GENERAL_NPC';
  const range=VIBE_NPC_ROLE_PRODUCTION_CONTRACT.physicalDiversity.roleRanges[resolved];
  const seed=hash(`${character.name||'npc'}|${character.species||'humanoid'}|${resolved}|${character.region||''}|${index}|physical`);
  const explicitHeight=Number(character.heightCm),explicitWeight=Number(character.weightKg);
  const heightCm=Number.isFinite(explicitHeight)?clamp(explicitHeight,60,320):seededRange(seed,range.heightCm,1);
  const weightKg=Number.isFinite(explicitWeight)?clamp(explicitWeight,20,300):seededRange(seed,range.weightKg,2);
  const frame=character.frame||pick(seed,['slender','compact','balanced','athletic','broad','heavy','long-limbed','short-limbed'],3);
  const proportions=Object.freeze({
    shoulderWidth:pick(seed,['narrow','average','broad','very-broad'],4),
    torsoLength:pick(seed,['short','balanced','long'],5),
    torsoDepth:pick(seed,['shallow','balanced','deep'],6),
    pelvisWidth:pick(seed,['narrow','average','broad'],7),
    armLength:pick(seed,['short','balanced','long'],8),
    legLength:pick(seed,['short','balanced','long'],9),
    handFootScale:pick(seed,['small','balanced','large'],10),
    headBodyRatio:pick(seed,['large-head','balanced','small-head'],11)
  });
  const posture=character.posture||pick(seed,['upright','relaxed','forward','guarded','asymmetric','proud','weary'],12);
  const visualMass=weightKg>=180?'colossal':weightKg>=135?'very-heavy':weightKg>=95?'heavy':weightKg<=50?'light':'medium';
  const scaleClass=heightCm>=235?'GIANT':heightCm>=205?'VERY_TALL':heightCm>=185?'TALL':heightCm<150?'SHORT':'STANDARD';
  return Object.freeze({
    role:resolved,heightCm,weightKg,visualMass,scaleClass,frame,proportions,posture,
    appearanceOnly:true,
    authoritativeCollisionScaleOwnedByGame:true,
    authoritativeHitboxOwnedByGame:true,
    movementSpeedUnchanged:true,
    statsUnchanged:true
  });
}

const NPC_ROLE_PROFILES=Object.freeze({
  PLAYER:Object.freeze({detailTier:'HERO',identity:Object.freeze(['PLAYER_READABLE_SILHOUETTE','EQUIPPED_GEAR','STANCE_IDENTITY']),motion:Object.freeze(['IDLE','WALK','RUN','TURN','INTERACT','ACTION','HIT','DEATH'])}),
  GENERAL_NPC:Object.freeze({detailTier:'STANDARD',identity:Object.freeze(['ROLE_SILHOUETTE','OCCUPATION_OR_CONTEXT_GEAR','GAIT_IDENTITY']),motion:Object.freeze(['IDLE','WALK','TURN','GREET','INTERACT'])}),
  COMPANION:Object.freeze({detailTier:'HERO',identity:Object.freeze(['PARTY_SILHOUETTE','SIGNATURE_GEAR','RELATIONSHIP_READABLE_POSTURE']),motion:Object.freeze(['IDLE','LOCOMOTION','FOLLOW','ASSIST','INTERACT','REVIVE_PRESENTATION','HIT','DOWNED_OR_DEATH'])}),
  ALLY:Object.freeze({detailTier:'HERO',identity:Object.freeze(['ALLY_SILHOUETTE','COMBAT_OR_SUPPORT_GEAR','ALLY_STANCE']),motion:Object.freeze(['IDLE','LOCOMOTION','ASSIST','INTERACT','COMBAT_READY','HIT','DEATH'])}),
  STORY_CHARACTER:Object.freeze({detailTier:'HERO_CLOSEUP',identity:Object.freeze(['NAMED_SILHOUETTE','PERSONAL_OUTFIT','FACE_AND_GESTURE_IDENTITY']),motion:Object.freeze(['IDLE','LOCOMOTION','DIALOGUE_GESTURE','EMOTION_REACTION','INTERACT','SCENE_ACTION'])}),
  CIVILIAN:Object.freeze({detailTier:'STANDARD_LOD',identity:Object.freeze(['OCCUPATION_SILHOUETTE','LOCAL_OUTFIT','SOCIAL_GAIT']),motion:Object.freeze(['IDLE','WALK','TALK','SOCIAL_OR_WORK_LOOP','THREAT_REACTION_WHEN_APPLICABLE'])}),
  MERCHANT:Object.freeze({detailTier:'STANDARD_PLUS',identity:Object.freeze(['SHOP_ROLE_SILHOUETTE','GOODS_OR_TOOL_PROP','MERCHANT_GESTURE']),motion:Object.freeze(['IDLE','GREET','PRESENT_GOODS','TRADE_REACTION','INTERACT'])}),
  QUEST_GIVER:Object.freeze({detailTier:'STANDARD_PLUS',identity:Object.freeze(['QUEST_ROLE_SILHOUETTE','IDENTITY_PROP','DIRECTING_GESTURE']),motion:Object.freeze(['IDLE','GREET','EXPLAIN','POINT_OR_DIRECT','REWARD_REACTION','INTERACT'])}),
  GUARD:Object.freeze({detailTier:'STANDARD_PLUS',identity:Object.freeze(['GUARD_SILHOUETTE','ARMOR_OR_WEAPON','ALERT_STANCE']),motion:Object.freeze(['IDLE_ALERT','PATROL','TURN','CHALLENGE','COMBAT_READY','HIT','DEATH'])}),
  WORKER:Object.freeze({detailTier:'STANDARD',identity:Object.freeze(['WORK_ROLE_SILHOUETTE','WORK_PROP','WEAR_HISTORY']),motion:Object.freeze(['IDLE','LOCOMOTION','WORK_LOOP','CARRY_OR_TOOL_CONTACT','INTERACT'])}),
  ARTISAN:Object.freeze({detailTier:'STANDARD_PLUS',identity:Object.freeze(['CRAFT_ROLE_SILHOUETTE','CRAFT_TOOL','WORKSHOP_WEAR']),motion:Object.freeze(['IDLE','LOCOMOTION','CRAFT_LOOP','TOOL_CONTACT','PRESENT_RESULT','INTERACT'])}),
  FARMER:Object.freeze({detailTier:'STANDARD',identity:Object.freeze(['FARM_ROLE_SILHOUETTE','FARM_TOOL','FIELD_WEAR']),motion:Object.freeze(['IDLE','WALK','FARM_WORK_LOOP','CARRY','INTERACT'])}),
  HEALER:Object.freeze({detailTier:'STANDARD_PLUS',identity:Object.freeze(['HEALER_SILHOUETTE','MEDICAL_OR_MAGIC_PROP','CALM_STANCE']),motion:Object.freeze(['IDLE','LOCOMOTION','GREET','HEAL_PRESENTATION','ASSIST','INTERACT'])}),
  TRAINER:Object.freeze({detailTier:'STANDARD_PLUS',identity:Object.freeze(['TRAINER_SILHOUETTE','DISCIPLINE_GEAR','DEMONSTRATION_STANCE']),motion:Object.freeze(['IDLE','LOCOMOTION','DEMONSTRATE','CORRECT','INTERACT'])}),
  RIVAL:Object.freeze({detailTier:'HERO',identity:Object.freeze(['RIVAL_SIGNATURE_SILHOUETTE','SIGNATURE_GEAR','CONTRASTING_STANCE']),motion:Object.freeze(['IDLE','LOCOMOTION','TAUNT','COMBAT_READY','ATTACK_PRESENTATION','HIT','DEATH'])}),
  HOSTILE_HUMANOID:Object.freeze({detailTier:'COMBAT',identity:Object.freeze(['HOSTILE_SILHOUETTE','COMBAT_GEAR','THREAT_STANCE']),motion:Object.freeze(['IDLE_ALERT','LOCOMOTION','ATTACK_ANTICIPATION','ATTACK','RECOVERY','HIT','DEATH'])}),
  NAMED_ELITE:Object.freeze({detailTier:'HERO_COMBAT',identity:Object.freeze(['ELITE_SIGNATURE_SILHOUETTE','ELITE_GEAR','SIGNATURE_STANCE']),motion:Object.freeze(['INTRO_OR_TAUNT','IDLE_ALERT','LOCOMOTION','ATTACK_SET','SPECIAL_PRESENTATION','HIT','STUN_OR_BREAK','DEATH'])}),
  HUMANOID_BOSS:Object.freeze({detailTier:'BOSS',identity:Object.freeze(['BOSS_UNIQUE_SILHOUETTE','DEDICATED_GEAR_OR_BODY_DETAIL','BOSS_STANCE']),motion:Object.freeze(['INTRO','IDLE_ALERT','LOCOMOTION','BASIC_ATTACK_SET','SPECIAL_ATTACK_SET','PHASE_CHANGE','ENRAGE','STUN_OR_GUARD_BREAK','RECOVERY','DEATH_SEQUENCE'])})
});

export function createVibeNpcRoleProfile({role='GENERAL_NPC',character={},index=0}={}){
  const normalized=npcRoleKey(role||character?.role);
  const resolved=NPC_ROLE_PROFILES[normalized]?normalized:'GENERAL_NPC';
  const profile=NPC_ROLE_PROFILES[resolved];
  const motionRequirements=createVibeNpcRoleMotionRequirement({role:resolved});
  return Object.freeze({
    version:VIBE_NPC_ROLE_PRODUCTION_CONTRACT.version,
    role:resolved,
    detailTier:profile.detailTier,
    identity:Object.freeze([...profile.identity]),
    motion:Object.freeze([...profile.motion]),
    motionRequirements,
    stateMotionBindings:motionRequirements.stateBindings,
    physical:createVibeNpcPhysicalProfile({...character,role:resolved},index),
    appearanceDiversity:VIBE_NPC_ROLE_PRODUCTION_CONTRACT.appearanceDiversity,
    masterGlbRequired:true,
    masterFormat:VIBE_NPC_ROLE_PRODUCTION_CONTRACT.final3dMasterFormat,
    masterActorPackage:Object.freeze({
      masterAssetFormat:'GLB_2_0',
      requiredStaticContents:Object.freeze(['MESH','NORMALS','UV0','MATERIALS','SKELETON','SKIN_WEIGHTS','JOINT_WEIGHTS','ANIMATION']),
      jointAnimationChannelsRequired:true,
      attachmentSocketBasis:Object.freeze(['HAND','BACK','HIP','SHIELD','TOOL']),
      mobileLodRequired:true,
      platformNativeAnimatorBindingRequired:true,
      platformRuntimeVerificationIndependent:true
    }),
    roleSpecificVisualMotionRequired:true,
    colorOnlyRoleVariantForbidden:true,
    primitivePartOrWeldOnlyFinalNpcForbidden:true,
    platformRuntimeVerificationRequired:true,
    productionVerified:false,
    runtimeVerificationState:'PENDING_PLATFORM_NATIVE_RUNTIME',
    gameplayAuthority:false,
    aiAuthority:false
  });
}

export function inferVibeCharacterArchetypes({role='',species='',weapon='',traits=[]}={}){const t=`${role} ${species} ${weapon} ${(traits||[]).join(' ')}`.toLowerCase(),out=[];if(/sword|melee|warrior|검|전사/.test(t))out.push('melee');if(/bow|gun|ranged|archer|활|궁수|총/.test(t))out.push('ranged');if(/heal|support|힐|치유/.test(t))out.push('healer');if(/insect|mantis|ant|bee|spider|scorpion|벌레|사마귀|개미|벌|거미|전갈/.test(t))out.push('insect');if(/fly|wing|bird|bee|날개|비행|새/.test(t))out.push('flying');if(/heavy|giant|tank|boss|거대|중갑|보스/.test(t))out.push('heavy');if(/magic|mage|staff|wizard|마법|지팡이/.test(t))out.push('magic');return Object.freeze(out.length?uniq(out):['melee'])}

// 키/몸무게는 게임 스탯이 아니라 시각적 신체 정체성이다. 기존 collision/game-scale은 그대로 보존한다.
export function createVibeBodyIdentity(character={},index=0){
  const species=String(character.species||'humanoid').toLowerCase();
  const npcPhysical=createVibeNpcPhysicalProfile(character,index);
  const seed=hash(`${character.name||'character'}|${species}|${character.role||''}|${index}`);
  const dominantSide=character.dominantSide||pick(seed,['left','right','mixed'],23);
  return Object.freeze({
    species,
    heightCm:npcPhysical.heightCm,
    weightKg:npcPhysical.weightKg,
    frame:npcPhysical.frame,
    proportions:Object.freeze({
      shoulders:npcPhysical.proportions.shoulderWidth,
      torso:npcPhysical.proportions.torsoLength,
      torsoDepth:npcPhysical.proportions.torsoDepth,
      pelvis:npcPhysical.proportions.pelvisWidth,
      arms:npcPhysical.proportions.armLength,
      legs:npcPhysical.proportions.legLength,
      handFootScale:npcPhysical.proportions.handFootScale,
      headBodyRatio:npcPhysical.proportions.headBodyRatio
    }),
    posture:npcPhysical.posture,
    dominantSide,
    visualMass:npcPhysical.visualMass,
    scaleClass:npcPhysical.scaleClass,
    protected:Object.freeze(['collision','hitbox','movement-speed','game-scale','stats']),
    rule:'height weight body mass and proportions are authored visual identity by default; gameplay collision hitbox speed and stats remain game-owned unless existing design explicitly says otherwise'
  });
}
export function createVibeAppearanceIdentity(character={},index=0){const seed=hash(`${character.name}|appearance|${index}`),body=createVibeBodyIdentity(character,index);return Object.freeze({body,face:Object.freeze({shape:pick(seed,['angular','round','long','square','soft','sharp'],2),featureBalance:pick(seed,['eyes-led','brow-led','nose-led','jaw-led','balanced'],4),asymmetry:pick(seed,['subtle-left','subtle-right','near-symmetric'],6)}),surface:Object.freeze({skinOrShell:character.skinOrShell||pick(seed,['smooth','weathered','scarred','freckled-or-patterned','rough','patched'],8),hairOrCrest:character.hairOrCrest||pick(seed,['short','long','tied','messy','layered','none-or-species-specific'],10),ageCue:character.ageCue||pick(seed,['young','mature','weathered','elder'],12)}),individualMarks:Object.freeze(uniq(character.marks||[pick(seed,['scar','mole-or-spot','brow-shape','ear-or-horn-detail','shell-pattern','tattoo-or-cultural-mark'],14)])),rule:'avoid face-swap clones; silhouette proportion surface and marks combine into identity'})}
export function createVibeEquipmentFitIdentity(character={},index=0){const body=createVibeBodyIdentity(character,index),seed=hash(`${character.name}|equipment|${index}`);return Object.freeze({fit:body.frame==='broad'?'reinforced-wide-fit':body.frame==='slender'?'close-light-fit':'role-fit',carry:pick(seed,['hip-biased','back-carried','cross-body','hand-ready','balanced'],3),wear:pick(seed,['new','maintained','patched','weathered','heavily-used'],5),personalization:pick(seed,['minimal','utility-charms','faction-mark','personal-token','field-repair'],7),rule:'equipment follows body occupation history and culture rather than floating as identical costume'})}
export function createVibeGaitIdentity(character={},index=0){
  const body=createVibeBodyIdentity(character,index),seed=hash(`${character.name}|gait|${index}`),mass=body.visualMass;
  const baseCadence=mass==='colossal'||mass==='very-heavy'?'slow':mass==='heavy'?'measured':mass==='light'?'quick':'medium';
  const legLanguage=body.proportions.legs;
  return Object.freeze({
    cadence:character.gaitCadence||baseCadence,
    stride:legLanguage==='long'?'long':legLanguage==='short'?'short':'medium',
    footfall:mass==='colossal'||mass==='very-heavy'||mass==='heavy'?'planted':'light-to-medium',
    verticalBob:mass==='heavy'||mass==='very-heavy'||mass==='colossal'?'low':pick(seed,['low','medium'],3),
    armSwing:character.armSwing||pick(seed,['restrained','balanced','loose','asymmetric'],5),
    torsoMotion:body.posture==='forward'?'forward-drive':body.posture==='guarded'?'contained':'counter-rotation',
    headBehavior:pick(seed,['stable','scanning','slight-bob','goal-locked'],7),
    turnStyle:mass==='heavy'||mass==='very-heavy'||mass==='colossal'?'hips-then-torso':'head-torso-hips',
    startStop:mass==='heavy'||mass==='very-heavy'||mass==='colossal'?'visible-acceleration-and-settle':'quick-anticipation-and-settle',
    bodyScaleLanguage:body.scaleClass,
    rule:'different gait appearance follows authored height weight and limb proportions while preserving authoritative movement distance and speed'
  });
}
export function createVibePhysicalActionLanguage(character={},index=0){const body=createVibeBodyIdentity(character,index),gait=createVibeGaitIdentity(character,index),seed=hash(`${character.name}|physical-action|${index}`);return Object.freeze({idle:Object.freeze([body.posture,pick(seed,['weight-shift','small-fidget','equipment-check','environment-scan','breath-led'],2)]),walk:gait,run:Object.freeze({lean:body.visualMass.includes('heavy')?'mass-forward':'adaptive-forward',recovery:body.visualMass.includes('heavy')?'delayed-settle':'quick-settle',secondary:pick(seed,['hair-or-cloth-lag','equipment-lag','limb-spring','body-stabilize'],4)}),interaction:Object.freeze({reach:body.proportions.arms==='long'?'long-arc':body.proportions.arms==='short'?'short-arc':'compact-arc',handedness:body.dominantSide,personalSpace:pick(seed,['close','normal','wide'],6)}),impact:Object.freeze({recoil:body.visualMass.includes('heavy')?'small-body-large-secondary':'body-readable',balanceRecovery:body.frame==='slender'?'step-correct':'center-correct'}),rule:'physical traits influence presentation without granting hidden gameplay advantages'})}
export function createVibeMotionIdentity(character={},index=0){const archetypes=inferVibeCharacterArchetypes(character),sources=archetypes.map(a=>ARCHETYPES[a]).filter(Boolean),body=createVibeBodyIdentity(character,index),physical=createVibePhysicalActionLanguage(character,index),signature=Object.freeze({stance:uniq([...sources.map(x=>x.stance),body.posture]),move:uniq([...sources.flatMap(x=>x.move),physical.walk.torsoMotion,physical.walk.turnStyle]),attack:uniq(sources.flatMap(x=>x.attack)),idle:Object.freeze(['breathing-or-life-cycle','role-awareness','environment-awareness',...physical.idle]),hit:Object.freeze(['directional-recoil','identity-preserving-recover',physical.impact.balanceRecovery]),death:Object.freeze(['mass-aware-collapse','role-prop-settle'])});return Object.freeze({name:character.name||'character',archetypes,body,appearance:createVibeAppearanceIdentity(character,index),equipment:createVibeEquipmentFitIdentity(character,index),physical,signature,personality:Object.freeze(character.traits||[]),preserve:Object.freeze(['movement-speed','collision','hitbox','attack-result','cooldown','game-position','game-scale'])})}
export function createVibeCharacterPersona(character={},index=0){const seed=hash(`${character.name||'character'}|persona|${index}`),traits=uniq(character.traits||[]),values=uniq(character.values||[pick(seed,['duty','freedom','family','knowledge','honor','survival','compassion','ambition'],2)]),desire=character.desire||character.goal||pick(seed,['protect-someone','prove-self','restore-home','discover-truth','gain-freedom','earn-respect'],4),need=character.need||pick(seed,['trust-others','accept-loss','take-responsibility','learn-restraint','face-fear','choose-own-path'],6),fear=character.fear||pick(seed,['betrayal','failure','loss-of-control','abandonment','powerlessness','being-forgotten'],8),secret=character.secret||pick(seed,['hidden-debt','past-failure','forbidden-loyalty','unknown-origin','concealed-promise','private-guilt'],10),temperament=character.temperament||pick(seed,['calm','warm','guarded','proud','impulsive','skeptical','playful','stern'],12),formality=character.formality||pick(seed,['casual','neutral','formal','ceremonial'],14),rhythm=character.speechRhythm||pick(seed,['short-direct','measured','ornate','hesitant','rapid','dry'],16),risk=character.riskTolerance||pick(seed,['low','medium','high'],18),social=character.socialTendency||pick(seed,['supportive','reserved','challenging','protective','opportunistic'],20),combat=character.combatTendency||pick(seed,['protect-ally','hold-position','flank','pressure-target','avoid-risk','counterattack'],22);return Object.freeze({name:character.name||'character',role:character.role||'',background:character.background||'',values:Object.freeze(values),traits:Object.freeze(traits),desire,need,fear,secret,taboo:Object.freeze(uniq(character.taboo||[])),loyalty:character.loyalty||'',temperament,voice:Object.freeze({formality,vocabulary:character.vocabulary||'background-appropriate',sentenceRhythm:rhythm,relationshipShift:true,emotionSensitive:true,knowledgeBoundary:true,subtext:true}),behaviorIntent:Object.freeze({riskTolerance:risk,socialTendency:social,combatTendency:combat,protectWhen:character.protectWhen||'relationship-and-role-context',retreatWhen:character.retreatWhen||'gameplay-ai-authorized-condition'}),memoryContract:Object.freeze({tracks:['trust','fear','respect','debt','betrayal','promise','known-fact','witnessed-event'],sourceEventRequired:true,persistentWhenGameOwnsSave:true}),final3dActorPresentation:Object.freeze({role:npcRoleKey(character.role||'GENERAL_NPC'),masterAssetFormat:'GLB_2_0',masterGlbRequired:true,roleMotionContract:'VIBE_NPC_ROLE_MOTION_REQUIREMENTS',stateMotionBindingRequired:true,actualJointMotionRequired:true,platformRuntimeVerificationRequired:true,productionVerified:false}),gameplayAuthority:false,rule:'persona and voice guide presentation and declared AI intent only; authoritative actions resolve through game-owned APIs'})}
export function resolveVibeCharacterBehaviorIntent({persona={},context={}}={}){
  const risk=String(persona?.behaviorIntent?.riskTolerance||'medium').toLowerCase();
  const social=String(persona?.behaviorIntent?.socialTendency||'reserved').toLowerCase();
  const combat=String(persona?.behaviorIntent?.combatTendency||'hold-position').toLowerCase();
  const selfHealth=Math.max(0,Math.min(1,Number(context.selfHealthRatio??1)));
  const allyHealth=Math.max(0,Math.min(1,Number(context.allyHealthRatio??1)));
  const trust=Math.max(-100,Math.min(100,Number(context.relationshipTrust??0)));
  const factionRelation=context.factionRelationship&&typeof context.factionRelationship==='object'?context.factionRelationship:{};
  const factionHostile=Math.max(-100,Math.min(100,Number(factionRelation.hostile??0)));
  const factionAlly=Math.max(-100,Math.min(100,Number(factionRelation.ally??0)));
  const factionTrust=Math.max(-100,Math.min(100,Number(factionRelation.trust??0)));
  const factionFear=Math.max(-100,Math.min(100,Number(factionRelation.fear??0)));
  const factionDebt=Math.max(-100,Math.min(100,Number(factionRelation.debt??0)));
  const enemyVisible=context.enemyVisible===true;
  const interaction=context.interactionAvailable===true;
  const newFact=context.newKnownFact===true;
  const intents=[];
  if(selfHealth<0.25&&risk==='low')intents.push('RETREAT_OR_SEEK_SAFETY');
  if(factionFear>=60&&risk==='low')intents.push('FACTION_CAUTION_OR_RETREAT_INTENT');
  if(allyHealth<0.35&&(['protective','supportive'].includes(social)&&trust>=0||factionAlly>=40||factionTrust>=40))intents.push('PROTECT_ALLY');
  if(enemyVisible&&factionHostile>=50)intents.push('FACTION_HOSTILITY_COMBAT_POSTURE');
  if(enemyVisible)intents.push('COMBAT_'+combat.toUpperCase().replace(/[^A-Z0-9]+/g,'_'));
  if(interaction&&newFact)intents.push('CONTEXTUAL_DIALOGUE_FROM_KNOWN_INFORMATION');
  if(interaction&&factionDebt>0)intents.push('FACTION_DEBT_DIALOGUE_OR_ASSIST_INTENT');
  if(context.objectiveUrgency===true)intents.push(risk==='high'?'PRESS_OBJECTIVE':'ADVANCE_OBJECTIVE_CAUTIOUSLY');
  if(!intents.length)intents.push(social==='supportive'?'SUPPORTIVE_IDLE_OR_FOLLOW':'OBSERVE_AND_HOLD');
  return Object.freeze({
    actor:persona.name||'character',
    intents:Object.freeze(uniq(intents)),
    voiceMode:persona.voice?.sentenceRhythm||'contextual',
    knowledgeBoundary:persona.voice?.knowledgeBoundary!==false,
    factionContextUsed:Object.keys(factionRelation).length>0,
    authoritativeActionRequired:true,
    gameOwnedTargetSelectionRequired:true,
    gameplayAuthority:false,
    rule:'intent is advisory presentation/AI intent; faction context may alter advisory posture only; authoritative target selection movement combat reward progression and networking resolve through game-owned AI/gameplay APIs'
  });
}
export function createVibePopulationPersonaDiversity(characters=[]){const personas=characters.map((c,i)=>createVibeCharacterPersona(c,i)),keys=personas.map(p=>JSON.stringify([p.temperament,p.voice.formality,p.voice.sentenceRhythm,p.desire,p.fear,p.behaviorIntent.socialTendency,p.behaviorIntent.combatTendency])),unique=uniq(keys).length,score=Math.round(unique/Math.max(1,personas.length)*100);return Object.freeze({score,unique,total:personas.length,pass:score>=75,rule:'major characters must not collapse into one voice personality or behavior intent'})}
export function createVibeGameplayMotionLinks({events=[],character={},index=0}={}){const identity=createVibeMotionIdentity(character,index),links=[];for(const e of uniq(events)){if(e==='move')links.push({event:e,visual:identity.signature.move,meaning:'movement-state'});else if(e==='attack')links.push({event:e,visual:identity.signature.attack,meaning:'attack-intent-and-impact'});else if(e==='hit')links.push({event:e,visual:identity.signature.hit,meaning:'damage-confirmed'});else if(e==='death')links.push({event:e,visual:identity.signature.death,meaning:'death-confirmed'});else links.push({event:e,visual:['identity-accent'],meaning:`${e}-state`})}return Object.freeze(links.map(x=>Object.freeze({...x,ruleSafe:true}))) }
export function createVibeSignatureMove(character={},index=0){const ids=inferVibeCharacterArchetypes(character),primary=ids[0],body=createVibeBodyIdentity(character,index),map={melee:['weapon-drag-anticipation','torso-twist-release'],ranged:['micro-aim-correction','release-recoil'],healer:['protective-hand-circle','soft-release-wave'],insect:['antenna-lock','multi-leg-brace','thorax-snap'],flying:['bank-in','wing-brake','altitude-recover'],heavy:['ground-compress','massive-drive','delayed-settle'],magic:['focus-orbit','cast-snap','residual-hand-drift']};return Object.freeze({name:character.name||'character',primary,sequence:Object.freeze([...(map[primary]||['anticipation','action','recovery']),body.visualMass==='heavy'||body.visualMass==='very-heavy'?'mass-settle':'light-recover']),usage:'presentation-variation-only',forbid:Object.freeze(['extra-damage','extra-hit','speed-bonus','cooldown-change'])})}
export function createVibeCharacterAssetMorphPlan(character={},index=0){
  const identity=createVibeMotionIdentity(character,index);
  const bodyParts=Object.freeze(['head','neck','torso','pelvis','upper-arm','forearm','hand','fingers','upper-leg','lower-leg','foot','hair-or-crest','equipment','species-parts']);
  const faceParts=Object.freeze(['brow','eyelid','eye','nose','cheek','lip','jaw','ear-or-horn-root','teeth-or-mouth-interior']);
  const productionPasses=Object.freeze([
    Object.freeze({id:'PRIMARY_FORM',work:Object.freeze(['silhouette','height-width-depth-ratios','head-body-ratio','shoulder-pelvis-balance','limb-lengths','center-of-mass']),goal:'게임 카메라 거리에서도 캐릭터 역할과 종이 읽히는 3D 덩어리와 비율 제작'}),
    Object.freeze({id:'SECONDARY_ANATOMY',work:Object.freeze(['ribcage-pelvis-transition','shoulder-elbow-knee-ankle-landmarks','hand-foot-volume','neck-jaw-connection','species-joint-structure']),goal:'관절 변형과 동작을 버틸 해부·구조 형태 제작'}),
    Object.freeze({id:'FACE_AND_IDENTITY',work:faceParts,goal:'눈꺼풀·입술·턱·귀/뿔 뿌리·비대칭·개별 표식을 실제 메시/모프 구조로 제작'}),
    Object.freeze({id:'CLOTHING_AND_EQUIPMENT_FIT',work:Object.freeze(['layer-thickness','seam-lines','fold-zones','armor-overlap','body-clearance','strap-buckle-fastener','weapon-holster-and-grip']),goal:'의상과 장비가 체형·관절·소켓을 따라 실제로 맞물리도록 제작'}),
    Object.freeze({id:'DEFORMATION_TOPOLOGY',work:Object.freeze(['shoulder-loops','elbow-loops','wrist-and-finger-loops','hip-knee-ankle-loops','face-deformation-loops','hard-soft-edge-separation']),goal:'관절과 표정 변형이 무너지지 않는 토폴로지 제작'}),
    Object.freeze({id:'RIG_AND_SOCKETS',work:Object.freeze(['root-pelvis-spine-neck-head','arm-hand-finger-chain','leg-foot-toe-chain','face-or-expression-controls','weapon-grip','back-hip-hand-equipment-sockets','species-extra-bones']),goal:'실제 애니메이션·장비 연결이 가능한 리그와 소켓 제작'}),
    Object.freeze({id:'SURFACE_AUTHORING',work:Object.freeze(['material-region-separation','skin-shell-hair-cloth-metal-leather-stone-response','roughness-variation','edge-wear','contact-dirt','micro-normal-or-stylized-detail']),goal:'색만 다른 재질이 아니라 재질별 빛 반응과 사용 흔적 제작'}),
    Object.freeze({id:'MOTION_PREP',work:Object.freeze(['idle-deformation','locomotion-deformation','attack-contact','hit-reaction','death-collapse','secondary-cloth-hair-equipment']),goal:'실제 모션에서 메시·장비·표정이 살아 움직이도록 제작'})
  ]);
  return Object.freeze({
    character:identity.name,
    body:identity.body,
    appearance:identity.appearance,
    equipment:identity.equipment,
    assetParts:bodyParts,
    faceParts,
    morphAxes:Object.freeze(['height-presentation','shoulder-width','torso-length','limb-length','head-ratio','visual-mass','posture','left-right-asymmetry','face-width','jaw-depth','eye-spacing','brow-shape','nose-length','mouth-width']),
    animationBindings:Object.freeze(['idle','walk','jog','run','sprint','start','stop','turn','jump','land','interact','attack','skill','hit','stun','knockdown','get-up','death']),
    productionPasses,
    editableSource:Object.freeze({
      preferred:'BLENDER_OR_EQUIVALENT_DCC_EDITABLE_SOURCE',
      destructiveBakeBeforeApprovalForbidden:true,
      separateHighLowOrPlatformDerivatives:true,
      originalSourceImmutable:true
    }),
    authoredOutputs:Object.freeze([
      'EDITABLE_SOURCE',
      'RETOPOLOGIZED_GAME_MESH',
      'UV_OR_ATLAS_LAYOUT',
      'MATERIAL_REGION_SET',
      'RIG_AND_SOCKET_MAP',
      'EXPRESSION_OR_FACE_CONTROL_SET',
      'NATIVE_PLATFORM_DERIVATIVES'
    ]),
    platformAuthoring:Object.freeze({
      ROBLOX:Object.freeze(['IMPORT_READY_GLB','BONE_OR_MOTOR6D_COMPATIBLE_RIG','ANIMATOR_OR_ANIMATIONCONTROLLER_BINDING','ATTACHMENT_AND_GRIP_SOCKET_LAYOUT','SURFACEAPPEARANCE_OR_MATERIAL_BINDINGS','COLLISION_PROXY_AND_MOBILE_LOD']),
      UNITY:Object.freeze(['IMPORT_READY_FBX_OR_GLB','SKINNED_MESH_RENDERER_READY_RIG','ANIMATOR_AVATAR_BINDING','PREFAB_EQUIPMENT_SOCKETS','MATERIAL_AND_TEXTURE_BINDINGS','LOD_GROUP_VARIANTS'])
    }),
    requirements:Object.freeze([
      'stable-pivot','stable-collision','no-game-scale-change','no-stretch-artifact','equipment-follows-morph','silhouette-readable-mobile',
      'actual-3d-volume-not-flat-card','joint-deformation-ready-topology','face-hands-feet-have-authored-structure','clothing-equipment-clearance-authored','native-rig-and-socket-ready'
    ]),
    protected:Object.freeze(['gameplay-hitbox-meaning','movement-speed','damage','cooldown','save-meaning','network-authority']),
    rule:'use authored part/morph ranges and real mesh-rig-material construction; never arbitrary whole-sprite scaling or color-only completion'
  });
}

const VIBE_CUSTOM_BODY_ARCHETYPES=Object.freeze(['SLENDER','COMPACT','BALANCED','ATHLETIC','BROAD','HEAVY','TALL','SHORT','STRONG','LEAN','MATURE','ELDER_POSTURE']);
const VIBE_CUSTOM_HEAD_FAMILIES=Object.freeze(['ANGULAR','ROUND','LONG','SQUARE','SOFT','SHARP','HEART','DIAMOND','BROAD_CHEEKBONE','NARROW_JAW','HEAVY_JAW','HIGH_BROW']);
const VIBE_CUSTOM_HAIR_FAMILIES=Object.freeze(['CROPPED','SHORT_LAYERED','SIDE_PART','SWEPT','BOB','SHOULDER','LONG_STRAIGHT','LONG_WAVY','CURLY','COILY','BRAIDED','MULTI_BRAID','PONYTAIL','BUN','TOPKNOT','HALF_UP','SHAVED_SIDE','UNDERCUT','MOHAWK','MESSY','LOOSE_TIED','NONE']);
const VIBE_CUSTOM_FACIAL_HAIR=Object.freeze(['NONE','STUBBLE','MOUSTACHE','GOATEE','SHORT_BEARD','FULL_BEARD','BRAIDED_BEARD','SIDEBURNS']);
const VIBE_CUSTOM_MARKS=Object.freeze(['NONE','FRECKLES','VITILIGO_PATTERN','SCAR_LIGHT','SCAR_HEAVY','TATTOO_FINE','TATTOO_BOLD','CULTURAL_MARK','BLEMISH','WEATHERED']);
const VIBE_CUSTOM_ACCESSORIES=Object.freeze(['NONE','EAR_STUD','EAR_RING','MULTI_EAR','NOSE_RING','BROW_RING','NECK_CHARM','HAIR_ORNAMENT','HEADBAND','SPECTACLE_OR_LENS','ROLE_BADGE','PERSONAL_TOKEN']);
function normalizedSeedValue(seed,offset=0){return ((seed+Math.imul(offset+1,2654435761))>>>0)/4294967295;}
export function createVibeCharacterCustomizationRecipe(character={},index=0){
  const seed=hash(`${character.name||'character'}|${character.species||'humanoid'}|${character.role||''}|${character.region||''}|custom|${index}`);
  const identity=createVibeMotionIdentity(character,index);
  const value=offset=>Math.round(normalizedSeedValue(seed,offset)*1000)/1000;
  const speciesKey=String(character.species||'humanoid').toUpperCase();
  const leftEye=pick(seed,['BROWN','AMBER','HAZEL','GREEN','BLUE','GRAY','DARK','PALE','GOLDEN','FANTASY_ACCENT'],31);
  const heterochromia=value(32)>.82;
  const roleMotion=createVibeNpcRoleMotionRequirement({role:character.role||'GENERAL_NPC'});
  const elfLike=/ELF|FAE/.test(speciesKey);
  const horned=/TIEFLING|DEMON|DEVIL|DRACON|HORN|BEAST/.test(speciesKey);
  const tailed=/TIEFLING|DEMON|DEVIL|DRACON|BEAST|FELINE|LIZARD/.test(speciesKey);
  const recipe=Object.freeze({
    recipeId:`CUSTOM_${String(seed).toUpperCase()}`,
    character:character.name||`character-${index+1}`,
    species:String(character.species||'humanoid').toUpperCase(),
    region:String(character.region||'').toUpperCase()||null,
    role:String(character.role||'').toUpperCase()||null,
    body:Object.freeze({
      archetype:pick(seed,VIBE_CUSTOM_BODY_ARCHETYPES,1),
      heightCm:identity.body.heightCm,
      weightKg:identity.body.weightKg,
      scaleClass:identity.body.scaleClass,
      visualMassClass:identity.body.visualMass,
      frame:identity.body.frame,
      heightPresentation:value(2),visualMass:value(3),shoulderWidth:value(4),torsoLength:value(5),torsoDepth:value(6),
      pelvisWidth:value(7),armLength:value(8),legLength:value(9),handFootScale:value(10),headBodyRatio:value(11),
      posture:identity.body.posture,asymmetry:value(12)
    }),
    head:Object.freeze({
      baseFamily:pick(seed,VIBE_CUSTOM_HEAD_FAMILIES,13),
      faceWidth:value(14),faceLength:value(15),forehead:value(16),browHeight:value(17),browAngle:value(18),
      eyeSpacing:value(19),eyeSize:value(20),eyeTilt:value(21),noseBridge:value(22),noseLength:value(23),noseWidth:value(24),
      cheekbone:value(25),cheekFullness:value(26),mouthWidth:value(27),lipVolume:value(28),jawWidth:value(29),
      jawDepth:value(30),chinProjection:value(31),earScale:value(33)
    }),
    eyes:Object.freeze({
      leftColor:leftEye,
      rightColor:heterochromia?pick(seed,['BROWN','AMBER','HAZEL','GREEN','BLUE','GRAY','DARK','PALE','GOLDEN','FANTASY_ACCENT'],34):leftEye,
      heterochromia,
      irisPattern:pick(seed,['CLEAR','RINGED','RADIAL','SOFT_MOTTLED'],35)
    }),
    hair:Object.freeze({
      style:pick(seed,VIBE_CUSTOM_HAIR_FAMILIES,36),
      texture:pick(seed,['STRAIGHT','WAVY','CURLY','COILY','MIXED'],37),
      primaryColor:pick(seed,['BLACK','DARK_BROWN','BROWN','AUBURN','BLONDE','PLATINUM','GRAY','WHITE','FANTASY_ACCENT'],38),
      highlight:pick(seed,['NONE','SUBTLE','STRONG','TIP','UNDERLAYER'],39),
      graying:pick(seed,['NONE','TEMPLE','STREAK','PARTIAL','FULL'],40),
      facialHair:pick(seed,VIBE_CUSTOM_FACIAL_HAIR,41)
    }),
    surface:Object.freeze({
      toneFamily:pick(seed,['NEUTRAL_LIGHT','NEUTRAL_MEDIUM','NEUTRAL_DARK','WARM_LIGHT','WARM_MEDIUM','WARM_DARK','COOL_LIGHT','COOL_MEDIUM','COOL_DARK','FANTASY_TONE'],42),
      detail:pick(seed,VIBE_CUSTOM_MARKS,43),
      agePresentation:pick(seed,['YOUNG_ADULT','ADULT','MATURE','WEATHERED','ELDER'],44),
      makeupEye:pick(seed,['NONE','LIGHT','LINED','SMOKED','CEREMONIAL'],45),
      makeupLip:pick(seed,['NONE','NATURAL','TINT','DARK','CEREMONIAL'],46)
    }),
    speciesParts:Object.freeze({
      ear:elfLike?pick(seed,['POINTED','LONG','NOTCHED'],47):pick(seed,['STANDARD','ROUND','NOTCHED'],47),
      horn:horned?pick(seed,['SHORT','CURVED','SWEPT','BRANCHED','ASYMMETRIC'],48):'NONE',
      tail:tailed?pick(seed,['THIN','HEAVY','TUFTED','SPIKED'],49):'NONE',
      accentColor:pick(seed,['NATURAL','DARK','LIGHT','WARM','COOL','FANTASY_ACCENT'],50),
      compatibilityChecked:true
    }),
    accessory:pick(seed,VIBE_CUSTOM_ACCESSORIES,51),
    outfit:Object.freeze({
      fit:identity.equipment.fit,
      wear:identity.equipment.wear,
      carry:identity.equipment.carry,
      layerTheme:pick(seed,['TRAVEL','WORK','CIVILIAN','SCHOLAR','MERCHANT','GUARD','WARRIOR','NOBLE','RITUAL','SURVIVAL'],52)
    }),
    presentation:Object.freeze({
      gait:identity.physical.walk,
      idle:identity.physical.idle,
      expressionFamily:pick(seed,['CALM','WARM','GUARDED','PROUD','STERN','PLAYFUL','WEARY','ALERT'],53),
      gestureFamily:pick(seed,['RESTRAINED','OPEN','FORMAL','WORKING','COMBAT_READY','NERVOUS','CONFIDENT'],54)
    }),
    final3dActorPackage:Object.freeze({
      role:roleMotion.role,
      masterAssetFormat:'GLB_2_0',
      masterGlbRequired:true,
      requiredStaticContents:Object.freeze(['MESH','NORMALS','UV0','MATERIALS','SKELETON','SKIN_WEIGHTS','JOINT_WEIGHTS','ANIMATION']),
      rig:Object.freeze({skeleton:true,skinWeights:true,jointWeights:true,activeJointAnimation:true}),
      attachmentSocketBasis:Object.freeze(['HAND','BACK','HIP','SHIELD','TOOL']),
      motionRequirements:roleMotion,
      mobileLodRequired:true,
      platformNativeRuntimeQaIndependent:true,
      productionVerified:false,
      runtimeVerificationState:'PENDING_PLATFORM_NATIVE_RUNTIME'
    }),
    referenceVisibleFeatures:Object.freeze(character.referenceVisibleFeatures&&typeof character.referenceVisibleFeatures==='object'?{...character.referenceVisibleFeatures}:{}),
    state:'PREPARED_SEMANTIC_CUSTOMIZATION_RECIPE',
    productionVerified:false,
    gameplayAuthority:false
  });
  return recipe;
}
export function createVibeNpcCustomizationPopulation({count=64,seed='npc-population',roles=[],regions=[],species=[]}={}){
  const total=Math.max(1,Math.min(512,Number(count)||64));
  const rolePool=roles.length?roles:['CIVILIAN','MERCHANT','QUEST_GIVER','WORKER','GUARD','ARTISAN','FARMER','STORY_CHARACTER','COMPANION'];
  const regionPool=regions.length?regions:['UNIVERSAL'];
  const speciesPool=species.length?species:['humanoid'];
  const recipes=Array.from({length:total},(_,index)=>{
    const role=rolePool[index%rolePool.length];
    const character={
      name:`${seed}-${index+1}`,
      role,
      region:regionPool[Math.floor(index/rolePool.length)%regionPool.length],
      species:speciesPool[index%speciesPool.length]
    };
    const base=createVibeCharacterCustomizationRecipe(character,index);
    return Object.freeze({...base,npcRoleProfile:createVibeNpcRoleProfile({role,character,index})});
  });
  const identityKeys=recipes.map(row=>JSON.stringify([
    row.body.heightCm,row.body.weightKg,row.body.scaleClass,row.body.visualMassClass,row.body.frame,row.body.archetype,
    row.body.shoulderWidth,row.body.torsoLength,row.body.torsoDepth,row.body.pelvisWidth,row.body.armLength,row.body.legLength,row.body.handFootScale,row.body.headBodyRatio,row.body.posture,
    row.head.baseFamily,row.head.faceWidth,row.head.faceLength,row.head.jawWidth,row.eyes.leftColor,row.eyes.rightColor,
    row.hair.style,row.hair.texture,row.hair.primaryColor,row.surface.toneFamily,row.surface.detail,row.surface.agePresentation,
    row.speciesParts.ear,row.speciesParts.horn,row.accessory,row.outfit.layerTheme,
    row.presentation.gait?.cadence,row.presentation.gait?.stride,row.presentation.expressionFamily,row.presentation.gestureFamily
  ]));
  const bodyKeys=recipes.map(row=>JSON.stringify([
    row.body.heightCm,row.body.weightKg,row.body.scaleClass,row.body.visualMassClass,row.body.frame,row.body.archetype,
    row.body.shoulderWidth,row.body.torsoLength,row.body.torsoDepth,row.body.pelvisWidth,row.body.armLength,row.body.legLength,row.body.handFootScale,row.body.headBodyRatio,row.body.posture
  ]));
  const appearanceKeys=recipes.map(row=>JSON.stringify([
    row.head.baseFamily,row.head.faceWidth,row.head.faceLength,row.head.eyeSpacing,row.head.jawWidth,
    row.eyes.leftColor,row.eyes.rightColor,row.hair.style,row.hair.texture,row.hair.primaryColor,
    row.surface.toneFamily,row.surface.detail,row.surface.agePresentation,row.accessory,row.outfit.layerTheme
  ]));
  const heights=recipes.map(row=>Number(row.body.heightCm)).filter(Number.isFinite);
  const weights=recipes.map(row=>Number(row.body.weightKg)).filter(Number.isFinite);
  const unique=uniq(identityKeys).length;
  const bodyUnique=uniq(bodyKeys).length;
  const heightRangeCm=Object.freeze([Math.min(...heights),Math.max(...heights)]);
  const weightRangeKg=Object.freeze([Math.min(...weights),Math.max(...weights)]);
  const scaleClasses=Object.freeze(uniq(recipes.map(row=>row.body.scaleClass)));
  const visualMassClasses=Object.freeze(uniq(recipes.map(row=>row.body.visualMassClass)));
  const frameFamilies=Object.freeze(uniq(recipes.map(row=>row.body.frame)));
  return Object.freeze({
    version:2,
    seed:String(seed),
    total,
    unique,
    diversityPercent:Math.round(unique/total*100),
    cloneRatePercent:Math.round((total-unique)/total*100),
    physicalDiversityPercent:Math.round(bodyUnique/total*100),
    physicalCloneRatePercent:Math.round((total-bodyUnique)/total*100),
    heightRangeCm,
    weightRangeKg,
    scaleClassCoverage:scaleClasses,
    visualMassCoverage:visualMassClasses,
    frameCoverage:frameFamilies,
    bodyDiversity:Object.freeze({
      uniqueBodyProfileCount:bodyUnique,
      uniqueHeightCount:uniq(heights).length,
      uniqueWeightCount:uniq(weights).length,
      heightRangeCm,
      weightRangeKg,
      scaleClasses,
      visualMassClasses,
      frameFamilies,
      scaleOnlyVariationForbidden:true
    }),
    appearanceDiversity:Object.freeze({
      uniqueAppearanceProfileCount:uniq(appearanceKeys).length,
      faceHairSurfaceOutfitCombined:true,
      colorOnlyVariationForbidden:true
    }),
    recipes:Object.freeze(recipes),
    target:VIBE_CHARACTER_CUSTOMIZATION_BREADTH_CONTRACT.target,
    sameAssetPoolAsPlayerCustomization:true,
    roleContract:VIBE_NPC_ROLE_PRODUCTION_CONTRACT,
    roleCoverage:Object.freeze(uniq(recipes.map(row=>row.npcRoleProfile.role))),
    colorOnlyDuplicateForbidden:true,
    sizeOnlyDuplicateForbidden:true,
    productionVerified:false,
    gameplayAuthority:false
  });
}

export function createVibePopulationPhysicalDiversity(characters=[]){
  const rows=characters.map((character,index)=>createVibeMotionIdentity(character,index));
  const keys=rows.map(identity=>JSON.stringify([
    identity.body.heightCm,identity.body.weightKg,identity.body.scaleClass,identity.body.visualMass,identity.body.frame,identity.body.proportions,identity.body.posture,
    identity.physical.walk.cadence,identity.physical.walk.stride,identity.physical.walk.armSwing,
    identity.appearance.face.shape,identity.appearance.face.featureBalance,
    identity.appearance.surface.skinOrShell,identity.appearance.surface.hairOrCrest,identity.appearance.surface.ageCue,identity.appearance.individualMarks
  ]));
  const unique=uniq(keys).length,score=Math.round(unique/Math.max(1,rows.length)*100);
  return Object.freeze({
    score,unique,total:rows.length,cloneRate:Math.round((rows.length-unique)/Math.max(1,rows.length)*100),
    heightRangeCm:rows.length?Object.freeze([Math.min(...rows.map(row=>row.body.heightCm)),Math.max(...rows.map(row=>row.body.heightCm))]):Object.freeze([0,0]),
    weightRangeKg:rows.length?Object.freeze([Math.min(...rows.map(row=>row.body.weightKg)),Math.max(...rows.map(row=>row.body.weightKg))]):Object.freeze([0,0]),
    scaleClasses:Object.freeze(uniq(rows.map(row=>row.body.scaleClass))),
    visualMassClasses:Object.freeze(uniq(rows.map(row=>row.body.visualMass))),
    frameFamilies:Object.freeze(uniq(rows.map(row=>row.body.frame))),
    pass:score>=80
  });
}
export function createVibePhysicalDiversityGate({characters=[]}={}){
  const rows=characters.map((character,index)=>createVibeMotionIdentity(character,index)),issues=[];
  for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++){
    const a=rows[i],b=rows[j];
    const distinct=[
      Math.abs(a.body.heightCm-b.body.heightCm)>=6,
      Math.abs(a.body.weightKg-b.body.weightKg)>=8,
      a.body.scaleClass!==b.body.scaleClass,
      a.body.visualMass!==b.body.visualMass,
      a.body.frame!==b.body.frame,
      a.body.proportions.shoulders!==b.body.proportions.shoulders,
      a.body.proportions.torso!==b.body.proportions.torso,
      a.body.proportions.torsoDepth!==b.body.proportions.torsoDepth,
      a.body.proportions.pelvis!==b.body.proportions.pelvis,
      a.body.proportions.arms!==b.body.proportions.arms,
      a.body.proportions.legs!==b.body.proportions.legs,
      a.body.proportions.handFootScale!==b.body.proportions.handFootScale,
      a.body.proportions.headBodyRatio!==b.body.proportions.headBodyRatio,
      a.body.posture!==b.body.posture,
      a.physical.walk.cadence!==b.physical.walk.cadence,
      a.physical.walk.stride!==b.physical.walk.stride,
      a.physical.walk.armSwing!==b.physical.walk.armSwing,
      a.appearance.face.shape!==b.appearance.face.shape,
      a.appearance.face.featureBalance!==b.appearance.face.featureBalance,
      a.appearance.surface.skinOrShell!==b.appearance.surface.skinOrShell,
      a.appearance.surface.hairOrCrest!==b.appearance.surface.hairOrCrest,
      a.appearance.surface.ageCue!==b.appearance.surface.ageCue
    ].filter(Boolean).length;
    if(distinct<VIBE_NPC_ROLE_PRODUCTION_CONTRACT.physicalDiversity.nearbyDistinctAxisMinimum){
      issues.push(`${a.name}:${b.name}:physical-appearance-clone:${distinct}`);
    }
  }
  return Object.freeze({
    pass:!issues.length,issues:Object.freeze(issues),
    minimumDistinctAxes:VIBE_NPC_ROLE_PRODUCTION_CONTRACT.physicalDiversity.nearbyDistinctAxisMinimum,
    checkedAxes:22,heightWeightFrameChecked:true,scaleOnlyDifferenceInsufficient:true,
    rule:'major and nearby NPCs companions elites and bosses must differ across height weight frame proportions face hair surface posture and gait; palette-only size-only or face-only clones are forbidden'
  });
}
export function scoreVibeMotionOriginality(characters=[]){const signatures=characters.map((c,i)=>createVibeMotionIdentity(c,i)),keys=signatures.map(s=>JSON.stringify([s.archetypes,s.body,s.signature.move,s.signature.attack,s.physical.walk])),unique=uniq(keys).length,score=Math.round((unique/Math.max(1,characters.length))*100);return Object.freeze({score,unique,total:characters.length,duplicates:characters.length-unique,needsDiversification:score<80})}
export function planVibeCharacterIdentityAutopilot({characters=[],eventMap={}}={}){
  const plans=characters.map((character,index)=>{
    const identity=createVibeMotionIdentity(character,index),events=eventMap[character.name]||['idle','move','attack','hit','death'];
    return Object.freeze({
      character:character.name,
      identity,
      persona:createVibeCharacterPersona(character,index),
      npcRoleProfile:createVibeNpcRoleProfile({role:character.role||'GENERAL_NPC',character,index}),
      assetMorph:createVibeCharacterAssetMorphPlan(character,index),
      customization:createVibeCharacterCustomizationRecipe(character,index),
      signatureMove:createVibeSignatureMove(character,index),
      gameplayLinks:createVibeGameplayMotionLinks({events,character,index})
    });
  });
  return Object.freeze({
    version:6,customizationBreadth:VIBE_CHARACTER_CUSTOMIZATION_BREADTH_CONTRACT,npcRoleProduction:VIBE_NPC_ROLE_PRODUCTION_CONTRACT,
    plans:Object.freeze(plans.map(row=>Object.freeze({...row,behaviorBrain:resolveVibeCharacterBehaviorIntent({persona:row.persona,context:{}})}))),
    physicalDiversity:createVibePopulationPhysicalDiversity(characters),personaDiversity:createVibePopulationPersonaDiversity(characters),
    diversityGate:createVibePhysicalDiversityGate({characters}),originality:scoreVibeMotionOriginality(characters),
    policy:Object.freeze({
      developmentAI:false,serverAI:'game-runtime-only',deterministic:true,eventDriven:true,gameplayLinked:true,noRuleMutation:true,
      avoidGenericMotion:true,variationMustPreserveTiming:true,noWholeSpriteScaleHack:true,playerAndNpcShareCustomizationAssetPool:true,
      colorOnlyNpcCloneForbidden:true,sizeOnlyNpcCloneForbidden:true,faceOnlyNpcCloneForbidden:true,
      npcHeightWeightBodyProportionAppearanceGaitDiversityRequired:true
    })
  });
}
if(typeof window!=='undefined'){Object.assign(window,{VIBE_NPC_ROLE_PRODUCTION_CONTRACT,createJaewoonVibeNpcRoleProfile:createVibeNpcRoleProfile,createJaewoonVibeNpcPhysicalProfile:createVibeNpcPhysicalProfile,inferJaewoonVibeCharacterArchetypes:inferVibeCharacterArchetypes,createJaewoonVibeBodyIdentity:createVibeBodyIdentity,createJaewoonVibeAppearanceIdentity:createVibeAppearanceIdentity,createJaewoonVibeEquipmentFitIdentity:createVibeEquipmentFitIdentity,createJaewoonVibeGaitIdentity:createVibeGaitIdentity,createJaewoonVibePhysicalActionLanguage:createVibePhysicalActionLanguage,createJaewoonVibeMotionIdentity:createVibeMotionIdentity,createJaewoonVibeGameplayMotionLinks:createVibeGameplayMotionLinks,createJaewoonVibeSignatureMove:createVibeSignatureMove,createJaewoonVibeCharacterAssetMorphPlan:createVibeCharacterAssetMorphPlan,createJaewoonVibeCharacterCustomizationRecipe:createVibeCharacterCustomizationRecipe,createJaewoonVibeNpcCustomizationPopulation:createVibeNpcCustomizationPopulation,createJaewoonVibePopulationPhysicalDiversity:createVibePopulationPhysicalDiversity,createJaewoonVibePhysicalDiversityGate:createVibePhysicalDiversityGate,scoreJaewoonVibeMotionOriginality:scoreVibeMotionOriginality,createJaewoonVibeCharacterPersona:createVibeCharacterPersona,resolveJaewoonVibeCharacterBehaviorIntent:resolveVibeCharacterBehaviorIntent,createJaewoonVibePopulationPersonaDiversity:createVibePopulationPersonaDiversity,planJaewoonVibeCharacterIdentityAutopilot:planVibeCharacterIdentityAutopilot})}