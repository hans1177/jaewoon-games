// 역할: GRAPHICS_PRODUCTION 내부에서 모션 부품을 조합·선택·변형·검증한다.
// 주의: 데미지/히트박스/쿨다운/콤보 판정/이동 권한은 게임플레이 시스템 소유다.

const freezeList = value => Object.freeze([...(Array.isArray(value) ? value : [])]);
const text = value => String(value ?? '').trim();
const upper = value => text(value).toUpperCase();
const unique = values => [...new Set((values || []).map(text).filter(Boolean))];
const clamp = (value,min,max) => Math.max(min,Math.min(max,Number(value)||0));

export const MOTION_DIRECTOR_TARGET='HIGH_END_COMPOSABLE_MOTION_DIRECTOR';
export const ROBLOX_CHARACTER_MOTION_FAILURE='CHARACTER_MOTION_MANNEQUIN';
export const ROBLOX_ACTOR_CLASSES=Object.freeze(['PLAYER','HUMANOID_NPC','CREATURE']);
export const ROBLOX_MOTION_SOURCE_PRIORITY=Object.freeze([
  'VERIFIED_SAME_GAME_SAME_ARCHETYPE_MOTION',
  'VERIFIED_COMPATIBLE_COMPANY_MOTION_LIBRARY',
  'LICENSE_VERIFIED_REPOSITORY_MOTION',
  'LICENSE_VERIFIED_EXTERNAL_MOTION_WITH_PROVENANCE',
  'SAFE_RETARGET_AND_CLEANUP',
  'NEW_NATIVE_AUTHORING_ONLY_FOR_REMAINING_GAP'
]);

export const MOTION_COMPOSITION_CHANNELS=Object.freeze([
  'ROOT','LOCOMOTION','LOWER_BODY','PELVIS_SPINE','UPPER_BODY','LEFT_ARM','RIGHT_ARM','HEAD_GAZE',
  'TAIL','WINGS','EXTRA_LIMBS','SECONDARY_MOTION','PROCEDURAL_CORRECTION',
  'VFX_PRESENTATION','AUDIO_PRESENTATION','CAMERA_PRESENTATION'
]);

export const MOTION_DNA_FIELDS=Object.freeze([
  'MOTION_ID','BODY_PLAN','RIG_PROFILE','SPECIES_OR_ARCHETYPE','STANCE','STYLE_FAMILY','WEAPON_FAMILY',
  'LEAD_SIDE','HAND_USAGE','DIRECTION','SPEED_CLASS','WEIGHT_CLASS','AIRBORNE_STATE','HEIGHT_CLASS',
  'COMBAT_ROLE','SKILL_ROLE','DEFENSE_ROLE','REACTION_ROLE','INTERACTION_ROLE','TRAVERSAL_ROLE',
  'CONTACT_LIMB','CONTACT_PHASE','STARTUP_CLASS','RECOVERY_CLASS','TRAVEL_VECTOR','ROOT_MOTION_MODE',
  'MIRROR_SAFE','LOOPABLE','PAIR_ROLE','ENVIRONMENT_TAGS','COMPATIBILITY_TAGS','EXCLUSION_TAGS',
  'PLATFORM_VARIANT','SOURCE_PROVENANCE','STYLE_VARIANT_PARENT','RUNTIME_VERIFICATION_STATE'
]);

export const MOTION_GRAMMARS=Object.freeze({
  attack:Object.freeze(['NEUTRAL','ANTICIPATION','STARTUP','ACTIVE_CONTACT','RECOIL','RECOVERY']),
  defense:Object.freeze(['NEUTRAL','READ','BLOCK_OR_EVADE','CONTACT_OR_CLEAR','COUNTER_OPTION','RECOVERY']),
  skill:Object.freeze(['PREPARE','CHARGE_OR_CHANNEL','AIM_OR_TARGET','RELEASE','IMPACT_RESPONSE','RECOVERY']),
  traversal:Object.freeze(['PREPARE','TAKEOFF_OR_ENTRY','TRAVEL','CONTACT_OR_EXIT','RECOVERY']),
  pair:Object.freeze(['ALIGN','LOCK','EXECUTE','IMPACT','SEPARATE','RECOVERY'])
});

export const MOTION_LIBRARY_GRAPH_NODES=Object.freeze([
  'CHARACTER_ARCHETYPE_LIBRARY','CREATURE_RIG_LIBRARY','ACTION_MOTION_LIBRARY','WEAPON_MOTION_LIBRARY',
  'SKILL_MOTION_LIBRARY','REACTION_MOTION_LIBRARY','PAIR_MOTION_LIBRARY','VFX_LIBRARY',
  'ENVIRONMENT_KIT_LIBRARY','UI_PRESENTATION_LIBRARY'
]);

export const MOTION_MUTATIONS=Object.freeze([
  'MIRROR','STANCE_SWAP','LEAD_SIDE_SWAP','POSE_EXAGGERATION','ANTICIPATION_SCALE','RECOVERY_CURVE',
  'OVERSHOOT_SETTLE','STRIDE_PRESENTATION','ATTACK_ARC_PRESENTATION','WEIGHT_PRESENTATION','STYLE_MODIFIER'
]);

export const MOTION_MUTATION_FORBIDDEN=Object.freeze([
  'DAMAGE_CHANGE','HITBOX_CHANGE','COOLDOWN_CHANGE','UNAPPROVED_MOVEMENT_SPEED_CHANGE',
  'CONTACT_MARKER_DESYNC','RIG_BREAKAGE'
]);

export function createMotionDNA(input={}) {
  const dna={
    MOTION_ID:text(input.MOTION_ID||input.motionId||input.id),
    BODY_PLAN:upper(input.BODY_PLAN||input.bodyPlan||'HUMANOID'),
    RIG_PROFILE:upper(input.RIG_PROFILE||input.rigProfile||'HUMANOID'),
    SPECIES_OR_ARCHETYPE:upper(input.SPECIES_OR_ARCHETYPE||input.speciesOrArchetype),
    STANCE:upper(input.STANCE||input.stance),
    STYLE_FAMILY:upper(input.STYLE_FAMILY||input.styleFamily),
    WEAPON_FAMILY:upper(input.WEAPON_FAMILY||input.weaponFamily),
    LEAD_SIDE:upper(input.LEAD_SIDE||input.leadSide),
    HAND_USAGE:upper(input.HAND_USAGE||input.handUsage),
    DIRECTION:upper(input.DIRECTION||input.direction),
    SPEED_CLASS:upper(input.SPEED_CLASS||input.speedClass),
    WEIGHT_CLASS:upper(input.WEIGHT_CLASS||input.weightClass),
    AIRBORNE_STATE:upper(input.AIRBORNE_STATE||input.airborneState),
    HEIGHT_CLASS:upper(input.HEIGHT_CLASS||input.heightClass),
    COMBAT_ROLE:upper(input.COMBAT_ROLE||input.combatRole),
    SKILL_ROLE:upper(input.SKILL_ROLE||input.skillRole),
    DEFENSE_ROLE:upper(input.DEFENSE_ROLE||input.defenseRole),
    REACTION_ROLE:upper(input.REACTION_ROLE||input.reactionRole),
    INTERACTION_ROLE:upper(input.INTERACTION_ROLE||input.interactionRole),
    TRAVERSAL_ROLE:upper(input.TRAVERSAL_ROLE||input.traversalRole),
    CONTACT_LIMB:upper(input.CONTACT_LIMB||input.contactLimb),
    CONTACT_PHASE:upper(input.CONTACT_PHASE||input.contactPhase),
    STARTUP_CLASS:upper(input.STARTUP_CLASS||input.startupClass),
    RECOVERY_CLASS:upper(input.RECOVERY_CLASS||input.recoveryClass),
    TRAVEL_VECTOR:upper(input.TRAVEL_VECTOR||input.travelVector),
    ROOT_MOTION_MODE:upper(input.ROOT_MOTION_MODE||input.rootMotionMode||'IN_PLACE_OR_GAME_OWNED'),
    MIRROR_SAFE:input.MIRROR_SAFE===true||input.mirrorSafe===true,
    LOOPABLE:input.LOOPABLE===true||input.loopable===true,
    PAIR_ROLE:upper(input.PAIR_ROLE||input.pairRole),
    ENVIRONMENT_TAGS:freezeList(unique(input.ENVIRONMENT_TAGS||input.environmentTags)),
    COMPATIBILITY_TAGS:freezeList(unique(input.COMPATIBILITY_TAGS||input.compatibilityTags)),
    EXCLUSION_TAGS:freezeList(unique(input.EXCLUSION_TAGS||input.exclusionTags)),
    PLATFORM_VARIANT:upper(input.PLATFORM_VARIANT||input.platformVariant),
    SOURCE_PROVENANCE:text(input.SOURCE_PROVENANCE||input.sourceProvenance),
    STYLE_VARIANT_PARENT:text(input.STYLE_VARIANT_PARENT||input.styleVariantParent),
    RUNTIME_VERIFICATION_STATE:upper(input.RUNTIME_VERIFICATION_STATE||input.runtimeVerificationState||'PREPARED_ONLY')
  };
  return Object.freeze(dna);
}

function overlapScore(a=[],b=[],weight=1){
  if(!a.length||!b.length)return 0;
  const set=new Set(a.map(upper));
  return b.map(upper).filter(x=>set.has(x)).length*weight;
}

function hardMismatch(candidate={},context={}){
  const dna=candidate.dna||candidate;
  const requiredBody=upper(context.bodyPlan);
  const requiredRig=upper(context.rigProfile);
  const requiredPlatform=upper(context.platform);
  const weapon=upper(context.weaponFamily);
  if(requiredBody&&dna.BODY_PLAN&&dna.BODY_PLAN!==requiredBody&&!dna.COMPATIBILITY_TAGS?.includes(requiredBody))return 'BODY_PLAN';
  if(requiredRig&&dna.RIG_PROFILE&&dna.RIG_PROFILE!==requiredRig&&!dna.COMPATIBILITY_TAGS?.includes(requiredRig))return 'RIG_PROFILE';
  if(requiredPlatform&&dna.PLATFORM_VARIANT&&dna.PLATFORM_VARIANT!==requiredPlatform)return 'PLATFORM';
  if(weapon&&dna.WEAPON_FAMILY&&dna.WEAPON_FAMILY!=='UNARMED'&&dna.WEAPON_FAMILY!==weapon)return 'WEAPON_FAMILY';
  const exclusions=(dna.EXCLUSION_TAGS||[]).map(upper);
  const contextTags=[
    requiredBody,requiredRig,requiredPlatform,weapon,upper(context.stance),upper(context.airborneState),
    ...(context.environmentTags||[]).map(upper)
  ].filter(Boolean);
  if(contextTags.some(tag=>exclusions.includes(tag)))return 'EXCLUSION_TAG';
  return null;
}

export function scoreMotionCandidate(candidate={},context={},recentMotionIds=[]){
  const dna=candidate.dna||candidate;
  const mismatch=hardMismatch(candidate,context);
  if(mismatch)return Object.freeze({id:text(dna.MOTION_ID||candidate.id),valid:false,score:-Infinity,rejectedBy:mismatch});
  let score=0;
  const exact=[
    ['BODY_PLAN','bodyPlan',18],['RIG_PROFILE','rigProfile',16],['STANCE','stance',8],['STYLE_FAMILY','styleFamily',8],
    ['WEAPON_FAMILY','weaponFamily',12],['DIRECTION','direction',7],['SPEED_CLASS','speedClass',6],
    ['WEIGHT_CLASS','weightClass',6],['AIRBORNE_STATE','airborneState',10],['COMBAT_ROLE','combatRole',12],
    ['SKILL_ROLE','skillRole',12],['DEFENSE_ROLE','defenseRole',10],['REACTION_ROLE','reactionRole',10],
    ['TRAVERSAL_ROLE','traversalRole',10]
  ];
  for(const [dnaKey,contextKey,weight] of exact){
    const want=upper(context[contextKey]);
    if(want&&upper(dna[dnaKey])===want)score+=weight;
  }
  score+=overlapScore(dna.ENVIRONMENT_TAGS||[],context.environmentTags||[],3);
  score+=overlapScore(dna.COMPATIBILITY_TAGS||[],context.compatibilityTags||[],2);
  const id=text(dna.MOTION_ID||candidate.id);
  const recent=recentMotionIds.map(text);
  if(recent[recent.length-1]===id)score-=100;
  else if(recent.includes(id))score-=25;
  if(candidate.family&&context.previousFamily&&upper(candidate.family)===upper(context.previousFamily))score-=20;
  if(dna.RUNTIME_VERIFICATION_STATE==='VERIFIED_RUNTIME')score+=10;
  if(candidate.companyVerified===true)score+=8;
  return Object.freeze({id,valid:true,score,rejectedBy:null});
}

export function selectContextMotion({candidates=[],context={},recentMotionIds=[]}={}){
  const scored=(candidates||[]).map(candidate=>({candidate,result:scoreMotionCandidate(candidate,context,recentMotionIds)}))
    .filter(row=>row.result.valid)
    .sort((a,b)=>b.result.score-a.result.score||a.result.id.localeCompare(b.result.id));
  return Object.freeze({
    selected:scored[0]?.candidate||null,
    selectedId:scored[0]?.result.id||null,
    score:scored[0]?.result.score??null,
    ranked:Object.freeze(scored.map(row=>Object.freeze({id:row.result.id,score:row.result.score}))),
    deterministic:true,
    gameplayAuthority:false
  });
}

export function composeMotionStack({layers={},dna={},styleVariant=null,presentation={}}={}){
  const normalized={};
  for(const channel of MOTION_COMPOSITION_CHANNELS){
    const value=layers[channel]??layers[channel.toLowerCase()];
    if(value!==undefined&&value!==null&&value!=='')normalized[channel]=value;
  }
  const conflicts=[];
  const lower=normalized.LOWER_BODY||normalized.LOCOMOTION;
  const root=normalized.ROOT;
  if(root&&lower&&typeof root==='object'&&typeof lower==='object'&&root.ownsTranslation===true&&lower.ownsTranslation===true){
    conflicts.push('ROOT_TRANSLATION_DOUBLE_AUTHORITY');
  }
  if(normalized.LEFT_ARM&&normalized.UPPER_BODY&&normalized.LEFT_ARM.exclusive===true&&normalized.UPPER_BODY.exclusiveLeftArm===true){
    conflicts.push('LEFT_ARM_MASK_CONFLICT');
  }
  if(normalized.RIGHT_ARM&&normalized.UPPER_BODY&&normalized.RIGHT_ARM.exclusive===true&&normalized.UPPER_BODY.exclusiveRightArm===true){
    conflicts.push('RIGHT_ARM_MASK_CONFLICT');
  }
  return Object.freeze({
    target:MOTION_DIRECTOR_TARGET,
    dna:createMotionDNA(dna),
    layers:Object.freeze(normalized),
    styleVariant:styleVariant?Object.freeze({...styleVariant}):null,
    presentation:Object.freeze({...presentation}),
    conflicts:Object.freeze(conflicts),
    valid:conflicts.length===0,
    gameplayAuthority:false
  });
}

export function createMotionCompatibilityGraph({nodes=[],edges=[]}={}){
  const safeNodes=(nodes||[]).map(node=>Object.freeze({id:text(node.id),kind:upper(node.kind),tags:freezeList(unique(node.tags))})).filter(n=>n.id);
  const ids=new Set(safeNodes.map(n=>n.id));
  const safeEdges=(edges||[]).map(edge=>Object.freeze({
    from:text(edge.from),to:text(edge.to),type:upper(edge.type),verified:edge.verified===true
  })).filter(e=>ids.has(e.from)&&ids.has(e.to));
  const unresolved=(edges||[]).filter(edge=>!ids.has(text(edge.from))||!ids.has(text(edge.to))).map(edge=>Object.freeze({...edge}));
  return Object.freeze({
    nodes:Object.freeze(safeNodes),
    edges:Object.freeze(safeEdges),
    unresolved:Object.freeze(unresolved),
    valid:unresolved.length===0,
    requiredLibraryNodes:MOTION_LIBRARY_GRAPH_NODES
  });
}

export function buildSkillMotionSequence({prepare='PREPARE',charge='CHARGE',aim='AIM',release='RELEASE',impact='IMPACT_RESPONSE',recovery='RECOVERY',hold=null,cancel=null}={}){
  const phases=[prepare,charge,hold,aim,release,impact,recovery,cancel].filter(Boolean).map(upper);
  return Object.freeze({
    grammar:'SKILL',
    phases:Object.freeze(phases),
    requiredCore:Object.freeze(['PREPARE','RELEASE','RECOVERY']),
    valid:['PREPARE','RELEASE','RECOVERY'].every(required=>phases.includes(required)),
    gameplayTimingAuthority:false
  });
}

export function createReactionMatch({impactDirection='FRONT',impactHeight='MID',impactStrength='LIGHT',attackType='GENERIC',contactLimb='',stance='NEUTRAL',weightClass='STANDARD',airborneState='GROUNDED',wallProximity='CLEAR',groundState='STABLE'}={}){
  const strength=upper(impactStrength);
  const airborne=upper(airborneState);
  const wall=upper(wallProximity);
  let output='LOCAL_RECOIL';
  if(airborne!=='GROUNDED')output='AIR_HIT';
  else if(wall!=='CLEAR'&&['HEAVY','LAUNCH'].includes(strength))output='WALL_HIT';
  else if(strength==='LAUNCH')output='LAUNCH';
  else if(strength==='HEAVY')output='FULL_BODY_HIT';
  else if(strength==='KNOCKDOWN')output='KNOCKDOWN';
  return Object.freeze({
    output,
    tags:Object.freeze({
      direction:upper(impactDirection),height:upper(impactHeight),strength,
      attackType:upper(attackType),contactLimb:upper(contactLimb),stance:upper(stance),
      weightClass:upper(weightClass),airborneState:airborne,wallProximity:wall,groundState:upper(groundState)
    }),
    gameplayHitResultAuthoritative:true
  });
}

export function createPairMotionContract({id='',family='GRAB',attackerMotion='',receiverMotion='',rootOffset=[0,0,0],facing='FACE_TARGET',contactPoints=[],heightOffset=0,timingMarkers=[],escapeExit=null}={}){
  return Object.freeze({
    id:text(id),
    family:upper(family),
    roles:Object.freeze({
      ATTACKER:text(attackerMotion),
      RECEIVER:text(receiverMotion)
    }),
    alignment:Object.freeze({
      rootOffset:Object.freeze((rootOffset||[0,0,0]).map(Number)),
      facing:upper(facing),
      contactPoints:freezeList(unique(contactPoints)),
      heightOffset:Number(heightOffset)||0,
      timingMarkers:freezeList(unique(timingMarkers)),
      escapeExit:text(escapeExit)||null
    }),
    gameplayApprovedEnvelopeRequired:true,
    perPlatformReauthoringAndRuntimeVerificationRequired:true,
    gameplayAuthority:false
  });
}

export function deriveMotionStyleVariant({parentId='',style='CARTOON',modifiers={},preserve={}}={}){
  const normalizedStyle=upper(style);
  const safeModifiers={
    poseExaggeration:clamp(modifiers.poseExaggeration??1,0.5,2),
    anticipationScale:clamp(modifiers.anticipationScale??1,0.5,2),
    overshootScale:clamp(modifiers.overshootScale??1,0,2),
    squashStretch:clamp(modifiers.squashStretch??0,0,1),
    secondaryMotion:clamp(modifiers.secondaryMotion??1,0,2),
    recoveryPresentation:clamp(modifiers.recoveryPresentation??1,0.5,2)
  };
  return Object.freeze({
    parentId:text(parentId),
    style:normalizedStyle,
    modifiers:Object.freeze(safeModifiers),
    preserve:Object.freeze({
      gameplaySpeed:true,
      hitboxSemantics:true,
      damage:true,
      cooldown:true,
      authoritativeRootMovement:true,
      contactMarkerSync:true,
      ...preserve
    }),
    originalImmutable:true,
    runtimeVerificationRequired:true
  });
}

export function mutateMotionVariant({parentId='',mutation='',value=null,provenance=''}={}){
  const kind=upper(mutation);
  if(MOTION_MUTATION_FORBIDDEN.includes(kind)){
    return Object.freeze({allowed:false,parentId:text(parentId),mutation:kind,reason:'GAMEPLAY_OR_INTEGRITY_MUTATION_FORBIDDEN'});
  }
  const allowed=MOTION_MUTATIONS.includes(kind);
  return Object.freeze({
    allowed,
    parentId:text(parentId),
    mutation:kind,
    value,
    provenance:text(provenance),
    requiresCompatibilityQa:allowed,
    requiresRuntimeQa:allowed,
    gameplayAuthority:false
  });
}

export function createVariationMemory({history=[],maxSize=8}={}){
  const size=Math.max(1,Math.floor(Number(maxSize)||8));
  let rows=(history||[]).map(text).filter(Boolean).slice(-size);
  return Object.freeze({
    get history(){return Object.freeze([...rows]);},
    push(id){
      const value=text(id);
      if(value)rows=[...rows,value].slice(-size);
      return Object.freeze([...rows]);
    },
    penalty(id,family='',recentFamilies=[]){
      const value=text(id);
      if(rows[rows.length-1]===value)return 100;
      if(rows.includes(value))return 25;
      if(family&&(recentFamilies||[]).map(upper).includes(upper(family)))return 20;
      return 0;
    },
    maxSize:size
  });
}

export function createCreatureMotionSetProfile({
  id='',archetype='',bodyPlan='HUMANOID',rigProfile='HUMANOID',weightClass='STANDARD',
  locomotion=[],attacks=[],defense=[],reactions=[],acting=[],deaths=[],skill=[],signature=[],compatibleStyles=[],
  verificationState='PREPARED_SEMANTIC'
}={}){
  const groups={
    locomotion:unique(locomotion),attacks:unique(attacks),defense:unique(defense),reactions:unique(reactions),
    acting:unique(acting),deaths:unique(deaths),skill:unique(skill),signature:unique(signature)
  };
  const all=unique(Object.values(groups).flat());
  return Object.freeze({
    id:text(id),
    archetype:upper(archetype),
    bodyPlan:upper(bodyPlan),
    rigProfile:upper(rigProfile),
    weightClass:upper(weightClass),
    groups:Object.freeze(Object.fromEntries(Object.entries(groups).map(([k,v])=>[k,Object.freeze(v)]))),
    motionIds:Object.freeze(all),
    compatibleStyles:Object.freeze(unique(compatibleStyles).map(upper)),
    verificationState:upper(verificationState),
    productionVerified:upper(verificationState)==='VERIFIED_RUNTIME',
    gameplayAuthority:false
  });
}

export function motionSetToCandidates(profile={},platform='UNITY',styleFamily='STYLIZED_FANTASY'){
  const p=profile.groups?profile:createCreatureMotionSetProfile(profile);
  const rows=[];
  const roleMap={
    locomotion:['TRAVERSAL_ROLE','LOCOMOTION'],
    attacks:['COMBAT_ROLE','ATTACK'],
    defense:['DEFENSE_ROLE','DEFENSE'],
    reactions:['REACTION_ROLE','REACTION'],
    acting:['INTERACTION_ROLE','ACTING'],
    deaths:['REACTION_ROLE','DEATH'],
    skill:['SKILL_ROLE','SKILL'],
    signature:['COMBAT_ROLE','SIGNATURE']
  };
  for(const [group,ids] of Object.entries(p.groups||{})){
    const [field,value]=roleMap[group]||['COMBAT_ROLE',upper(group)];
    for(const id of ids){
      const dnaInput={
        motionId:id,
        bodyPlan:p.bodyPlan,
        rigProfile:p.rigProfile,
        speciesOrArchetype:p.archetype,
        styleFamily,
        weightClass:p.weightClass,
        platformVariant:platform,
        runtimeVerificationState:p.verificationState
      };
      dnaInput[field]=value;
      rows.push(Object.freeze({
        id,
        family:group,
        signature:(p.groups.signature||[]).includes(id),
        dna:createMotionDNA(dnaInput),
        preparedSemanticOnly:p.productionVerified!==true
      }));
    }
  }
  const dedup=new Map(rows.map(row=>[row.id,row]));
  return Object.freeze([...dedup.values()]);
}

export function estimateMotionCombinationSpace({layers={},styleVariants=[],skillPhases=[],reactionVariants=[],pairVariants=[]}={}){
  const counts=[];
  for(const value of Object.values(layers||{})){
    const count=Array.isArray(value)?value.length:(value?1:0);
    if(count>0)counts.push(count);
  }
  if((styleVariants||[]).length)counts.push(styleVariants.length);
  if((skillPhases||[]).length)counts.push(skillPhases.length);
  if((reactionVariants||[]).length)counts.push(reactionVariants.length);
  if((pairVariants||[]).length)counts.push(pairVariants.length);
  const theoretical=counts.length?counts.reduce((a,b)=>a*b,1):0;
  return Object.freeze({
    theoreticalCombinationCount:theoretical,
    dimensionCounts:Object.freeze(counts),
    artificialCapApplied:false,
    note:'THEORETICAL_SPACE_ONLY_REAL_RUNTIME_SELECTION_STILL_REQUIRES_COMPATIBILITY_CONTEXT_AND_QA'
  });
}


export const DEFAULT_MOTION_COVERAGE_MINIMUMS=Object.freeze({
  locomotion:5,
  attacks:3,
  defense:2,
  reactions:4,
  acting:2,
  deaths:2,
  skill:2,
  signature:3
});

export const BODY_PLAN_MOTION_COVERAGE=Object.freeze({
  FLYING:Object.freeze({
    locomotion:8,attacks:4,defense:3,reactions:4,acting:2,deaths:2,skill:2,signature:4,
    requiredRoles:Object.freeze(['TAKEOFF','FLY','BANK','HOVER','LAND_FROM_FLIGHT'])
  }),
  ARACHNID:Object.freeze({
    locomotion:7,attacks:4,defense:3,reactions:4,acting:2,deaths:2,skill:2,signature:4,
    requiredRoles:Object.freeze(['CRAWL','STRAFE','WALL_CRAWL_OR_EQUIVALENT'])
  }),
  REPTILE_OR_SERPENT:Object.freeze({
    locomotion:5,attacks:4,defense:2,reactions:4,acting:2,deaths:2,skill:2,signature:4,
    requiredRoles:Object.freeze(['SLITHER_OR_BODY_PLAN_EQUIVALENT'])
  }),
  HEAVY_BIPED:Object.freeze({
    locomotion:6,attacks:5,defense:3,reactions:5,acting:3,deaths:3,skill:3,signature:4,
    requiredRoles:Object.freeze(['HEAVY_START_STOP','HEAVY_TURN','HEAVY_RECOVERY'])
  }),
  BOSS_BIPED:Object.freeze({
    locomotion:6,attacks:6,defense:3,reactions:5,acting:5,deaths:2,skill:4,signature:6,
    requiredRoles:Object.freeze(['INTRO','PHASE_CHANGE','ENRAGE','FAILED_ATTACK_RECOVERY','BOSS_DEATH_SEQUENCE'])
  }),
  HEAVY_GOLEM_OR_BOSS:Object.freeze({
    locomotion:6,attacks:5,defense:3,reactions:5,acting:3,deaths:3,skill:3,signature:4,
    requiredRoles:Object.freeze(['HEAVY_START_STOP','HEAVY_TURN','HEAVY_RECOVERY'])
  })
});

const SEMANTIC_GAP_ROLE_TEMPLATES=Object.freeze({
  locomotion:Object.freeze(['IDLE','WALK','RUN','START','STOP','TURN_L','TURN_R','STRAFE_L','STRAFE_R','BACKSTEP','DASH']),
  attacks:Object.freeze(['LIGHT_ATTACK_A','LIGHT_ATTACK_B','HEAVY_ATTACK_A','GAP_CLOSER','AOE_ATTACK','AIR_ATTACK','SIGNATURE_ATTACK']),
  defense:Object.freeze(['GUARD','DODGE_L','DODGE_R','PARRY_OR_DEFLECT','COUNTER','REVERSAL']),
  reactions:Object.freeze(['LIGHT_HIT','HEAVY_HIT','HIT_LEFT','HIT_RIGHT','KNOCKBACK','KNOCKDOWN','GET_UP','WALL_HIT']),
  acting:Object.freeze(['BREATH_IDLE','ALERT','THREAT_DISPLAY','TAUNT','SEARCH','ENRAGE']),
  deaths:Object.freeze(['DEATH_FRONT','DEATH_BACK','DEATH_SIDE','HEAVY_DEATH','SIGNATURE_DEATH']),
  skill:Object.freeze(['SKILL_PREPARE','SKILL_RELEASE','SKILL_RECOVERY','BUFF_OR_ENRAGE','PROJECTILE_OR_AOE','ULTIMATE']),
  signature:Object.freeze(['IDLE_SIGNATURE','LOCOMOTION_SIGNATURE','ATTACK_SIGNATURE','HIT_SIGNATURE','DEATH_SIGNATURE','SPECIAL_BODY_PART_SIGNATURE'])
});

function bodyPlanSemanticRoles(bodyPlan='',group=''){
  const plan=upper(bodyPlan);
  const key=text(group);
  if(key!=='locomotion')return SEMANTIC_GAP_ROLE_TEMPLATES[key]||Object.freeze([]);
  if(plan==='FLYING')return Object.freeze(['PERCH_IDLE','TAKEOFF','FLY','FAST_FLY','BANK_L','BANK_R','HOVER','LAND_FROM_FLIGHT']);
  if(plan==='ARACHNID')return Object.freeze(['IDLE_LEG_SHIFT','CRAWL','RUN','STRAFE_L','STRAFE_R','WALL_CRAWL','CEILING_CRAWL','TURN']);
  if(plan==='REPTILE_OR_SERPENT')return Object.freeze(['IDLE_COIL','SLITHER_SLOW','SLITHER_FAST','TURN_COIL','RAISE_HEAD','LOWER_HEAD']);
  if(['HEAVY_BIPED','BOSS_BIPED','HEAVY_GOLEM_OR_BOSS'].includes(plan))return Object.freeze(['HEAVY_IDLE','HEAVY_WALK','HEAVY_RUN','HEAVY_START','HEAVY_STOP','HEAVY_TURN_L','HEAVY_TURN_R','HEAVY_RECOVERY']);
  return SEMANTIC_GAP_ROLE_TEMPLATES.locomotion;
}

export function resolveMotionCoverageRequirements(profile={},overrides={}){
  const bodyPlan=upper(profile.bodyPlan||profile.BODY_PLAN);
  const specific=BODY_PLAN_MOTION_COVERAGE[bodyPlan]||{};
  const merged={...DEFAULT_MOTION_COVERAGE_MINIMUMS,...specific,...overrides};
  const requiredRoles=unique([...(specific.requiredRoles||[]),...(overrides.requiredRoles||[])]);
  delete merged.requiredRoles;
  return Object.freeze({
    bodyPlan,
    minimums:Object.freeze(merged),
    requiredRoles:Object.freeze(requiredRoles)
  });
}

export function auditMotionCoverage(profile={},requirements={}){
  const p=profile.groups?profile:createCreatureMotionSetProfile(profile);
  const resolved=resolveMotionCoverageRequirements(p,requirements);
  const groups={};
  const gaps=[];
  for(const [group,minimum] of Object.entries(resolved.minimums)){
    if(typeof minimum!=='number')continue;
    const current=(p.groups?.[group]||[]).length;
    const missing=Math.max(0,minimum-current);
    groups[group]=Object.freeze({current,minimum,missing,complete:missing===0});
    if(missing>0)gaps.push(Object.freeze({group,current,minimum,missing}));
  }
  const normalizedMotions=(p.motionIds||[]).map(upper);
  const roleGaps=resolved.requiredRoles.filter(role=>{
    const tokens=upper(role).split('_OR_').filter(Boolean);
    return !normalizedMotions.some(id=>tokens.some(token=>id.includes(token.replace('_EQUIVALENT',''))));
  });
  return Object.freeze({
    profileId:p.id,
    archetype:p.archetype,
    bodyPlan:p.bodyPlan,
    groups:Object.freeze(groups),
    gaps:Object.freeze(gaps),
    requiredRoleGaps:Object.freeze(roleGaps),
    complete:gaps.length===0&&roleGaps.length===0,
    verifiedComplete:gaps.length===0&&roleGaps.length===0&&p.productionVerified===true,
    productionVerified:p.productionVerified===true
  });
}

export function motionSemanticFingerprint(input={}){
  const dna=input.dna||input;
  const fields=[
    upper(dna.BODY_PLAN||dna.bodyPlan),
    upper(dna.RIG_PROFILE||dna.rigProfile),
    upper(dna.COMBAT_ROLE||dna.combatRole||dna.SKILL_ROLE||dna.skillRole||dna.REACTION_ROLE||dna.reactionRole||dna.role),
    upper(dna.WEAPON_FAMILY||dna.weaponFamily),
    upper(dna.STANCE||dna.stance),
    upper(dna.STYLE_FAMILY||dna.styleFamily),
    upper(dna.CONTACT_LIMB||dna.contactLimb),
    upper(dna.TRAVEL_VECTOR||dna.travelVector)
  ];
  return fields.join('|');
}

export function findNearDuplicateMotionCandidates({candidate={},library=[]}={}){
  const fingerprint=motionSemanticFingerprint(candidate);
  return Object.freeze((library||[])
    .map(row=>Object.freeze({id:text(row.id||row.dna?.MOTION_ID),fingerprint:motionSemanticFingerprint(row),verified:(row.dna?.RUNTIME_VERIFICATION_STATE||row.RUNTIME_VERIFICATION_STATE)==='VERIFIED_RUNTIME'}))
    .filter(row=>row.id&&row.fingerprint===fingerprint)
    .sort((a,b)=>Number(b.verified)-Number(a.verified)||a.id.localeCompare(b.id)));
}

function donorCompatibilityScore(target={},donor={},group=''){
  const t=target.groups?target:createCreatureMotionSetProfile(target);
  const d=donor.groups?donor:createCreatureMotionSetProfile(donor);
  if(text(group)==='signature'&&t.archetype!==d.archetype)return -Infinity;
  if(t.bodyPlan!==d.bodyPlan)return -Infinity;
  let score=40;
  if(t.rigProfile===d.rigProfile)score+=25;
  if(t.archetype===d.archetype)score+=30;
  if(t.weightClass===d.weightClass)score+=10;
  if((t.compatibleStyles||[]).some(style=>(d.compatibleStyles||[]).includes(style)))score+=10;
  if(d.productionVerified===true)score+=50;
  return score;
}

export function findCompatibleMotionDonors({targetProfile={},librarySets=[],group='locomotion'}={}){
  const target=targetProfile.groups?targetProfile:createCreatureMotionSetProfile(targetProfile);
  return Object.freeze((librarySets||[])
    .map(row=>row.groups?row:createCreatureMotionSetProfile(row))
    .filter(row=>row.id&&row.id!==target.id&&(row.groups?.[group]||[]).length>0)
    .map(row=>Object.freeze({
      id:row.id,
      archetype:row.archetype,
      bodyPlan:row.bodyPlan,
      rigProfile:row.rigProfile,
      group:text(group),
      motionIds:Object.freeze([...(row.groups?.[group]||[])]),
      productionVerified:row.productionVerified===true,
      score:donorCompatibilityScore(target,row,group)
    }))
    .filter(row=>Number.isFinite(row.score))
    .sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id)));
}

export function scoreMotionGapPriority({gap={},usage={}}={}){
  let score=0;
  if(usage.brokenOrMissingRuntimeMotion===true)score+=50;
  if(usage.activeGameConsumer===true)score+=40;
  if(usage.heroOrBoss===true)score+=30;
  score+=Math.min(25,Math.max(0,Number(usage.gameConsumerCount)||0)*5);
  if(usage.playerVisibleFrequencyHigh===true)score+=20;
  if(usage.combatCritical===true||['attacks','defense','reactions','signature'].includes(text(gap.group)))score+=20;
  if(usage.mobileReadabilityDefect===true)score+=15;
  if(usage.externalSourceReady===true)score+=10;
  score+=Math.min(20,Math.max(0,Number(gap.missing)||0)*4);
  return score;
}

function semanticSeedIds(profile={},group='',count=0){
  const p=profile.groups?profile:createCreatureMotionSetProfile(profile);
  const roles=bodyPlanSemanticRoles(p.bodyPlan,group);
  const existing=new Set((p.groups?.[group]||[]).map(upper));
  const prefix=upper(p.archetype||p.id||'CREATURE').replace(/[^A-Z0-9]+/g,'_');
  const result=[];
  for(const role of roles){
    if(result.length>=count)break;
    if(![...existing].some(id=>id.includes(upper(role))))result.push(prefix+'_'+upper(role));
  }
  let n=1;
  while(result.length<count){
    const id=prefix+'_'+upper(group)+'_AUTO_'+String(n).padStart(2,'0');
    if(!existing.has(id))result.push(id);
    n+=1;
  }
  return Object.freeze(result.slice(0,count));
}

export function buildAutomaticMotionGapFillPlan({
  profile={},
  librarySets=[],
  externalSources=[],
  usage={},
  requirements={}
}={}){
  const target=profile.groups?profile:createCreatureMotionSetProfile(profile);
  const audit=auditMotionCoverage(target,requirements);
  const externalMotionSources=(externalSources||[]).filter(row=>upper(row.category)==='MOTION'&&/LICENSE_VERIFIED/.test(upper(row.status||'')));
  const actions=[];
  for(const gap of audit.gaps){
    const donors=findCompatibleMotionDonors({targetProfile:target,librarySets,group:gap.group});
    const verifiedDonor=donors.find(row=>row.productionVerified===true);
    const preparedDonor=donors.find(row=>row.productionVerified!==true);
    const priority=scoreMotionGapPriority({gap,usage});
    let route='PREPARE_SEMANTIC_MOTION_SEED';
    let sourceId=null;
    if(verifiedDonor){
      route=verifiedDonor.archetype===target.archetype?'REUSE_VERIFIED_SAME_ARCHETYPE_MOTION':'REUSE_VERIFIED_COMPATIBLE_BODY_PLAN_MOTION';
      sourceId=verifiedDonor.id;
    }else if(externalMotionSources.length){
      route='ACQUIRE_LICENSE_VERIFIED_EXTERNAL_MOTION';
      sourceId=text(externalMotionSources[0].id);
    }else if(preparedDonor){
      route='REFERENCE_COMPATIBLE_PREPARED_SEMANTIC_DONOR';
      sourceId=preparedDonor.id;
    }
    actions.push(Object.freeze({
      group:gap.group,
      missing:gap.missing,
      priority,
      route,
      sourceId,
      semanticSeeds:semanticSeedIds(target,gap.group,gap.missing),
      verifiedFill:route.startsWith('REUSE_VERIFIED_'),
      promotionBlockedUntilRuntimeQa:!route.startsWith('REUSE_VERIFIED_')
    }));
  }
  for(const role of audit.requiredRoleGaps){
    actions.push(Object.freeze({
      group:'requiredRole',
      requiredRole:role,
      missing:1,
      priority:scoreMotionGapPriority({gap:{group:'signature',missing:1},usage})+10,
      route:externalMotionSources.length?'ACQUIRE_LICENSE_VERIFIED_EXTERNAL_MOTION':'PREPARE_SEMANTIC_MOTION_SEED',
      sourceId:externalMotionSources.length?text(externalMotionSources[0].id):null,
      semanticSeeds:Object.freeze([upper(target.archetype||target.id||'CREATURE')+'_'+upper(role).replace(/_OR_EQUIVALENT/g,'')]),
      verifiedFill:false,
      promotionBlockedUntilRuntimeQa:true
    }));
  }
  actions.sort((a,b)=>b.priority-a.priority||a.group.localeCompare(b.group));
  return Object.freeze({
    targetId:target.id,
    archetype:target.archetype,
    audit,
    actions:Object.freeze(actions),
    externalMotionSourceIds:Object.freeze(externalMotionSources.map(row=>text(row.id)).filter(Boolean)),
    semanticPreparationCanClosePlanningGap:true,
    semanticPreparationCannotCreateVerifiedCoverage:true,
    runtimeVerificationRequired:true,
    gameplayAuthority:false
  });
}

export function applySemanticGapPreparation({profile={},gapPlan={}}={}){
  const p=profile.groups?profile:createCreatureMotionSetProfile(profile);
  const groups=Object.fromEntries(Object.entries(p.groups||{}).map(([k,v])=>[k,[...v]]));
  const added=[];
  for(const action of gapPlan.actions||[]){
    if(!action.semanticSeeds?.length||action.group==='requiredRole')continue;
    if(!groups[action.group])groups[action.group]=[];
    for(const id of action.semanticSeeds){
      if(!groups[action.group].includes(id)){
        groups[action.group].push(id);
        added.push(id);
      }
    }
  }
  return Object.freeze({
    profile:createCreatureMotionSetProfile({
      id:p.id,archetype:p.archetype,bodyPlan:p.bodyPlan,rigProfile:p.rigProfile,weightClass:p.weightClass,
      ...groups,compatibleStyles:p.compatibleStyles,verificationState:'PREPARED_SEMANTIC'
    }),
    added:Object.freeze(added),
    productionVerified:false,
    state:'PREPARED_SEMANTIC',
    runtimeVerificationRequired:true
  });
}


export function evaluateMotionTransition({
  from={},
  to={},
  metrics={}
}={}){
  const pose=Math.max(0,100-Number(metrics.poseDiscontinuity||0));
  const root=Math.max(0,100-Number(metrics.rootVelocityDelta||0));
  const angular=Math.max(0,100-Number(metrics.angularVelocityDelta||0));
  const foot=Math.max(0,100-Number(metrics.footContactBreak||0));
  const hand=Math.max(0,100-Number(metrics.handContactBreak||0));
  const marker=Math.max(0,100-Number(metrics.contactMarkerOffset||0));
  const blend=Math.max(0,100-Number(metrics.blendDurationPenalty||0));
  const silhouette=Math.max(0,100-Number(metrics.silhouettePop||0));
  const hardFailures=[];
  if(metrics.teleportPop===true)hardFailures.push('TELEPORT_POP');
  if(metrics.doubleRootAuthority===true)hardFailures.push('DOUBLE_ROOT_AUTHORITY');
  if(Number(metrics.footContactBreak||0)>=80)hardFailures.push('FOOT_CONTACT_SNAP');
  if(metrics.pairAlignmentBreak===true)hardFailures.push('PAIR_ALIGNMENT_BREAK');
  if(metrics.gameplayEventDesync===true)hardFailures.push('GAMEPLAY_EVENT_DESYNC');
  const score=Math.round((pose+root+angular+foot+hand+marker+blend+silhouette)/8);
  const verdict=hardFailures.length?'FAIL':score>=85?'PASS':score>=70?'WARN':'FAIL';
  return Object.freeze({
    fromId:text(from.id||from.MOTION_ID),
    toId:text(to.id||to.MOTION_ID),
    score,
    verdict,
    hardFailures:Object.freeze(hardFailures),
    metrics:Object.freeze({pose,root,angular,foot,hand,marker,blend,silhouette}),
    gameplayWindowAuthority:false
  });
}

export function auditMotionContact({
  footSlideNormalized=0,
  footPlantDriftNormalized=0,
  handWeaponOffsetNormalized=0,
  attackContactOffsetNormalized=0,
  pairContactOffsetNormalized=0,
  impactEventNormalizedTimeOffset=0,
  groundPenetration=false,
  meshIntersection=false,
  thresholds={}
}={}){
  const limits={
    footSlideNormalizedMax:Number(thresholds.footSlideNormalizedMax??0.035),
    handWeaponNormalizedMax:Number(thresholds.handWeaponNormalizedMax??0.04),
    attackContactNormalizedMax:Number(thresholds.attackContactNormalizedMax??0.06),
    pairContactNormalizedMax:Number(thresholds.pairContactNormalizedMax??0.05),
    impactEventNormalizedTimeMax:Number(thresholds.impactEventNormalizedTimeMax??0.04)
  };
  const failures=[];
  if(Number(footSlideNormalized)>limits.footSlideNormalizedMax)failures.push('FOOT_SLIDE_DISTANCE');
  if(Number(footPlantDriftNormalized)>limits.footSlideNormalizedMax)failures.push('FOOT_PLANT_DRIFT');
  if(Number(handWeaponOffsetNormalized)>limits.handWeaponNormalizedMax)failures.push('HAND_WEAPON_OFFSET');
  if(Number(attackContactOffsetNormalized)>limits.attackContactNormalizedMax)failures.push('ATTACK_CONTACT_OFFSET');
  if(Number(pairContactOffsetNormalized)>limits.pairContactNormalizedMax)failures.push('PAIR_CONTACT_POINT_DRIFT');
  if(Number(impactEventNormalizedTimeOffset)>limits.impactEventNormalizedTimeMax)failures.push('IMPACT_EVENT_OFFSET');
  if(groundPenetration===true)failures.push('GROUND_PENETRATION');
  if(meshIntersection===true)failures.push('MESH_INTERSECTION');
  const score=Math.max(0,100-failures.length*18);
  return Object.freeze({
    pass:failures.length===0,
    score,
    failures:Object.freeze(failures),
    limits:Object.freeze(limits),
    blocksVerifiedPromotion:failures.length>0
  });
}

const GAMEPLAY_EVENT_MOTION_MAP=Object.freeze({
  MOVE:Object.freeze(['LOCOMOTION']),
  JUMP:Object.freeze(['PREPARE','TAKEOFF_OR_ENTRY','TRAVEL','CONTACT_OR_EXIT','RECOVERY']),
  LAND:Object.freeze(['CONTACT_OR_EXIT','RECOVERY']),
  DODGE:Object.freeze(['READ','BLOCK_OR_EVADE','RECOVERY']),
  BLOCK:Object.freeze(['READ','BLOCK_OR_EVADE','CONTACT_OR_CLEAR','RECOVERY']),
  PARRY:Object.freeze(['READ','BLOCK_OR_EVADE','CONTACT_OR_CLEAR','COUNTER_OPTION','RECOVERY']),
  COUNTER:Object.freeze(['READ','COUNTER_OPTION','RECOVERY']),
  MELEE_ATTACK:Object.freeze(['ANTICIPATION','STARTUP','ACTIVE_CONTACT','RECOIL','RECOVERY']),
  RANGED_ATTACK:Object.freeze(['PREPARE','AIM_OR_TARGET','RELEASE','RECOVERY']),
  BITE:Object.freeze(['ANTICIPATION','STARTUP','ACTIVE_CONTACT','RECOIL','RECOVERY']),
  CLAW:Object.freeze(['ANTICIPATION','STARTUP','ACTIVE_CONTACT','RECOIL','RECOVERY']),
  HORN_CHARGE:Object.freeze(['PREPARE','TRAVEL','ACTIVE_CONTACT','RECOIL','RECOVERY']),
  GRAB:Object.freeze(['ALIGN','LOCK','EXECUTE','SEPARATE','RECOVERY']),
  THROW:Object.freeze(['ALIGN','LOCK','EXECUTE','IMPACT','SEPARATE','RECOVERY']),
  KNOCKDOWN:Object.freeze(['HIT_REACTION','KNOCKDOWN','RECOVERY']),
  GET_UP:Object.freeze(['PREPARE','RECOVERY']),
  CAST:Object.freeze(['PREPARE','AIM_OR_TARGET','RELEASE','RECOVERY']),
  CHANNEL:Object.freeze(['PREPARE','CHARGE_OR_CHANNEL','HOLD','RELEASE','RECOVERY']),
  PROJECTILE:Object.freeze(['PREPARE','AIM_OR_TARGET','RELEASE','RECOVERY']),
  BEAM:Object.freeze(['PREPARE','CHARGE_OR_CHANNEL','AIM_OR_TARGET','RELEASE','RECOVERY']),
  AOE:Object.freeze(['PREPARE','CHARGE_OR_CHANNEL','RELEASE','RECOVERY']),
  BUFF:Object.freeze(['PREPARE','CHARGE_OR_CHANNEL','RELEASE','RECOVERY']),
  DEBUFF:Object.freeze(['PREPARE','CHARGE_OR_CHANNEL','RELEASE','RECOVERY']),
  HEAL:Object.freeze(['PREPARE','CHARGE_OR_CHANNEL','RELEASE','RECOVERY']),
  TELEPORT:Object.freeze(['PREPARE','RELEASE','RECOVERY']),
  TRANSFORM:Object.freeze(['PREPARE','CHARGE_OR_CHANNEL','RELEASE','RECOVERY']),
  SUMMON:Object.freeze(['PREPARE','CHARGE_OR_CHANNEL','RELEASE','RECOVERY']),
  PHASE_CHANGE:Object.freeze(['PREPARE','RELEASE','RECOVERY']),
  ENRAGE:Object.freeze(['PREPARE','RELEASE','RECOVERY']),
  DEATH:Object.freeze(['ACTIVE_CONTACT','RECOVERY'])
});

export function bindGameplayEventToMotion({event='',availableRoles=[]}={}){
  const normalized=upper(event);
  const required=[...(GAMEPLAY_EVENT_MOTION_MAP[normalized]||[])];
  const available=(availableRoles||[]).map(upper);
  const missing=required.filter(role=>!available.includes(role));
  return Object.freeze({
    event:normalized,
    requiredRoles:Object.freeze(required),
    missingRoles:Object.freeze(missing),
    complete:missing.length===0,
    preparedSemanticSeeds:Object.freeze(missing.map(role=>normalized+'_'+role)),
    state:missing.length?'PREPARED_SEMANTIC':'BOUND',
    gameplayEventAuthority:true,
    motionAuthority:false
  });
}

export function createProceduralMotionProfile({
  footIk=true,
  groundNormal=true,
  pelvisHeight=true,
  spineLean=true,
  headGaze=true,
  handGrip=true,
  aimOffset=true,
  tailBalance=false,
  wingBalance=false,
  slopeAdaptation=true,
  stairContact=true,
  ledgeContact=true,
  wallProximityPose=true,
  platformBudget='MOBILE'
}={}){
  return Object.freeze({
    corrections:Object.freeze({
      FOOT_IK:footIk===true,
      GROUND_NORMAL_ALIGNMENT:groundNormal===true,
      PELVIS_HEIGHT:pelvisHeight===true,
      SPINE_LEAN:spineLean===true,
      HEAD_GAZE:headGaze===true,
      HAND_GRIP:handGrip===true,
      AIM_OFFSET:aimOffset===true,
      TAIL_BALANCE:tailBalance===true,
      WING_BALANCE:wingBalance===true,
      SLOPE_BODY_ADAPTATION:slopeAdaptation===true,
      STAIR_CONTACT:stairContact===true,
      LEDGE_CONTACT:ledgeContact===true,
      WALL_PROXIMITY_POSE:wallProximityPose===true
    }),
    platformBudget:upper(platformBudget),
    visualOnly:true,
    gameplayColliderAndMovementAuthorityImmutable:true
  });
}

export function createGroupMotionPlan({
  pattern='PACK_SURROUND',
  actors=[],
  targetPosition=null,
  recentGroupActions=[],
  spacing=1
}={}){
  const normalizedActors=(actors||[]).map((actor,index)=>Object.freeze({
    id:text(actor.id||('actor-'+index)),
    role:upper(actor.role||'MEMBER'),
    slot:index
  }));
  const recent=(recentGroupActions||[]).map(upper);
  const patternName=upper(pattern);
  const staggered=normalizedActors.map((actor,index)=>Object.freeze({
    actorId:actor.id,
    phaseOffset:index%Math.max(1,Math.min(4,normalizedActors.length)),
    attackSuppressed:recent[recent.length-1]===upper(actor.id)
  }));
  return Object.freeze({
    pattern:patternName,
    actors:Object.freeze(normalizedActors),
    targetPosition,
    spacing:Number(spacing)||1,
    staggered:Object.freeze(staggered),
    exactSynchronizedAttackSpamForbidden:true,
    gameplayAiDecisionAuthorityImmutable:true
  });
}

export function createMultiActorMotionContract({
  id='',
  pattern='PAIR_GRAB',
  actors=[],
  platformProfile='MOBILE',
  alignment={}
}={}){
  const maxActors=upper(platformProfile)==='DESKTOP'?8:4;
  const rows=(actors||[]).map((actor,index)=>Object.freeze({
    id:text(actor.id||('actor-'+index)),
    role:upper(actor.role||('ROLE_'+index)),
    motionId:text(actor.motionId)
  }));
  return Object.freeze({
    id:text(id),
    pattern:upper(pattern),
    actors:Object.freeze(rows),
    actorCount:rows.length,
    maxActors,
    requiresExplicitPerformanceEvidence:rows.length>maxActors,
    alignment:Object.freeze({
      roots:alignment.roots!==false,
      facing:alignment.facing!==false,
      contactPoints:freezeList(unique(alignment.contactPoints)),
      phaseMarkers:freezeList(unique(alignment.phaseMarkers)),
      safeSeparationExit:text(alignment.safeSeparationExit)||null
    }),
    gameplayAuthority:false
  });
}

export function createEmotionIntentLayer({
  intent='CALM',
  intensity=1,
  channels={}
}={}){
  const normalized=upper(intent);
  return Object.freeze({
    intent:normalized,
    intensity:clamp(intensity,0,2),
    channels:Object.freeze({
      STANCE:channels.stance!==false,
      BREATHING:channels.breathing!==false,
      HEAD_GAZE:channels.headGaze!==false,
      SHOULDER_SPINE:channels.shoulderSpine!==false,
      HAND_OR_CLAW_TENSION:channels.handOrClawTension!==false,
      IDLE_VARIATION:channels.idleVariation!==false,
      RECOVERY_STYLE:channels.recoveryStyle!==false
    }),
    additiveWhenCompatible:true,
    emotionMayNotChangeGameplayStats:true
  });
}

export function selectMotionLod({
  cameraDistance=0,
  screenSize=0,
  deviceClass='MOBILE',
  actorImportance='STANDARD',
  combatRelevant=true
}={}){
  const importance=upper(actorImportance);
  const device=upper(deviceClass);
  let tier='FAR';
  if(importance==='HERO'||importance==='BOSS'||Number(cameraDistance)<12||Number(screenSize)>0.2)tier='NEAR';
  else if(Number(cameraDistance)<35||combatRelevant===true)tier='MID';
  if(device==='LOW_END_MOBILE'&&tier==='NEAR'&&importance!=='HERO'&&importance!=='BOSS')tier='MID';
  const features=tier==='NEAR'
    ?['FULL_BODY_LAYERING','IK_CONTACT','HEAD_GAZE','SECONDARY_MOTION','FACIAL_WHEN_AVAILABLE','FULL_VFX_SYNC']
    :tier==='MID'
      ?['CORE_LAYERING','SIMPLIFIED_IK','HEAD_GAZE','LIMITED_SECONDARY']
      :['BASE_LOCOMOTION','PRIMARY_ACTION','CRITICAL_REACTION_ONLY'];
  return Object.freeze({
    tier,
    features:Object.freeze(features),
    gameplayHitAndCollisionUnaffected:true,
    mobileBudgetFirst:true
  });
}

export function createMotionLineage({
  assetId='',
  parentId='',
  sourceId='',
  sourceHash='',
  derivedHash='',
  transformHistory=[],
  licenseEvidence='',
  rigProfile='',
  styleFamily='',
  platform='',
  gameId='',
  verificationSha='',
  runtimeEvidenceId=''
}={}){
  return Object.freeze({
    assetId:text(assetId),
    parentId:text(parentId)||null,
    sourceId:text(sourceId)||null,
    sourceHash:text(sourceHash)||null,
    derivedHash:text(derivedHash)||null,
    transformHistory:freezeList(unique(transformHistory)),
    licenseEvidence:text(licenseEvidence)||null,
    rigProfile:upper(rigProfile),
    styleFamily:upper(styleFamily),
    platform:upper(platform),
    gameId:text(gameId)||null,
    verificationSha:text(verificationSha)||null,
    runtimeEvidenceId:text(runtimeEvidenceId)||null,
    originalImmutable:true,
    revalidateDerivedWhenParentImproves:true,
    complete:Boolean(assetId&&sourceId&&derivedHash&&platform)
  });
}

export function aggregateRuntimeMotionSignals(samples=[]){
  const rows=(samples||[]).filter(Boolean);
  const n=Math.max(1,rows.length);
  const avg=key=>rows.reduce((sum,row)=>sum+Number(row[key]||0),0)/n;
  const count=key=>rows.filter(row=>row[key]===true).length;
  const usage=new Map();
  for(const row of rows){
    const id=text(row.motionId);
    if(id)usage.set(id,(usage.get(id)||0)+1);
  }
  const immediateRepeatRate=rows.length?count('immediateRepeat')/rows.length:0;
  const sameFamilyRepeatRate=rows.length?count('sameFamilyRepeat')/rows.length:0;
  const verifiedPassCount=rows.filter(row=>row.runtimeVerified===true&&row.pass===true).length;
  const verifiedFailureCount=rows.filter(row=>row.runtimeVerified===true&&row.pass===false&&text(row.failureReason)).length;
  return Object.freeze({
    sampleCount:rows.length,
    usageByMotion:Object.freeze(Object.fromEntries([...usage.entries()])),
    transitionQualityScore:avg('transitionQualityScore'),
    contactQaScore:avg('contactQaScore'),
    pairAlignmentScore:avg('pairAlignmentScore'),
    motionLodFrameCost:avg('motionLodFrameCost'),
    frameStabilityScore:avg('frameStabilityScore'),
    mobileReadabilityScore:avg('mobileReadabilityScore'),
    immediateRepeatRate,
    sameFamilyRepeatRate,
    verifiedPassCount,
    verifiedFailureCount,
    rawTelemetryAuthority:false
  });
}

export function buildRuntimeMotionLearningCandidate({
  gameId='',
  platform='',
  signals={},
  samples=[]
}={}){
  const summary=signals.sampleCount!==undefined?signals:aggregateRuntimeMotionSignals(samples);
  const verifiedSamples=(samples||[]).filter(row=>row.runtimeVerified===true);
  const positive=verifiedSamples.some(row=>row.pass===true);
  const negative=verifiedSamples.some(row=>row.pass===false&&text(row.failureReason));
  const lessons=unique(verifiedSamples.filter(row=>row.pass===false&&text(row.failureReason)).map(row=>upper(row.failureReason)));
  return Object.freeze({
    gameId:text(gameId),
    platform:upper(platform),
    domains:Object.freeze(['LIVING_MOTION','ANIMATION_FEEL','ASSET_ADAPTATION','VFX','CAMERA_LANGUAGE']),
    summary,
    positiveMasteryEligible:positive,
    negativeAvoidPatternEligible:negative,
    verifiedFailureLessons:Object.freeze(lessons),
    preparedSemanticEligible:false,
    rawTelemetryDirectTraining:false,
    feedsExistingCanonicalLearningChain:positive||negative,
    requiresExistingDistillationThresholdHoldoutAndCanary:true,
    platformEvidenceIndependent:true
  });
}


export function selectRobloxCharacterMotionSource({
  candidates=[],
  context={},
  gameId='',
  archetype='',
  recentMotionIds=[]
}={}){
  const targetGame=text(gameId||context.gameId);
  const targetArchetype=upper(archetype||context.speciesOrArchetype||context.archetype);
  const rows=(candidates||[]).map(candidate=>{
    const dna=candidate.dna||candidate;
    const base=scoreMotionCandidate(candidate,{...context,platform:'ROBLOX'},recentMotionIds);
    if(!base.valid)return Object.freeze({candidate,id:base.id,valid:false,score:-Infinity,sourceClass:'INCOMPATIBLE',rejectedBy:base.rejectedBy});
    const verified=upper(dna.RUNTIME_VERIFICATION_STATE||candidate.runtimeVerificationState)==='VERIFIED_RUNTIME'||candidate.companyVerified===true;
    const sameGame=targetGame&&text(candidate.gameId||candidate.GAME_ID)===targetGame;
    const sameArchetype=targetArchetype&&upper(dna.SPECIES_OR_ARCHETYPE||candidate.archetype)===targetArchetype;
    const provenance=upper(dna.SOURCE_PROVENANCE||candidate.sourceProvenance||candidate.sourceType);
    const licensed=candidate.licenseVerified===true||/LICENSE_VERIFIED|CC0|PROJECT_ORIGINAL|ROBLOX_PLATFORM/.test(provenance);
    let sourceClass='NEW_NATIVE_AUTHORING_ONLY_FOR_REMAINING_GAP',bonus=0;
    if(verified&&sameGame&&sameArchetype){sourceClass='VERIFIED_SAME_GAME_SAME_ARCHETYPE_MOTION';bonus=500;}
    else if(verified&&candidate.companyVerified===true){sourceClass='VERIFIED_COMPATIBLE_COMPANY_MOTION_LIBRARY';bonus=400;}
    else if(licensed&&/REPOSITORY|PROJECT_ORIGINAL|CC0/.test(provenance)){sourceClass='LICENSE_VERIFIED_REPOSITORY_MOTION';bonus=300;}
    else if(licensed&&/EXTERNAL|ROBLOX_PLATFORM/.test(provenance)){sourceClass='LICENSE_VERIFIED_EXTERNAL_MOTION_WITH_PROVENANCE';bonus=200;}
    else if(candidate.retargeted===true||/RETARGET/.test(provenance)){sourceClass='SAFE_RETARGET_AND_CLEANUP';bonus=100;}
    return Object.freeze({candidate,id:base.id,valid:true,score:base.score+bonus,sourceClass,rejectedBy:null});
  }).filter(row=>row.valid).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
  return Object.freeze({
    selected:rows[0]?.candidate||null,
    selectedId:rows[0]?.id||null,
    sourceClass:rows[0]?.sourceClass||'NEW_NATIVE_AUTHORING_ONLY_FOR_REMAINING_GAP',
    ranked:Object.freeze(rows.map(row=>Object.freeze({id:row.id,score:row.score,sourceClass:row.sourceClass}))),
    priority:ROBLOX_MOTION_SOURCE_PRIORITY,
    libraryFirst:true,
    newKeyframeAuthoringLast:true,
    gameplayAuthority:false
  });
}

export function createRobloxMotionBlendProfile({
  crossFadeSeconds=.16,
  walkSpeed=8,
  jogSpeed=12,
  runSpeed=16,
  sprintSpeed=22,
  turnBlendSeconds=.14,
  attackRecoveryBlendSeconds=.12,
  speedSync=true,
  upperLowerBodyLayering=true
}={}){
  return Object.freeze({
    crossFadeSeconds:clamp(crossFadeSeconds,.08,.35),
    speedThresholds:Object.freeze({
      WALK:Math.max(0,Number(walkSpeed)||8),
      JOG:Math.max(0,Number(jogSpeed)||12),
      RUN:Math.max(0,Number(runSpeed)||16),
      SPRINT:Math.max(0,Number(sprintSpeed)||22)
    }),
    turnBlendSeconds:clamp(turnBlendSeconds,.08,.35),
    attackRecoveryBlendSeconds:clamp(attackRecoveryBlendSeconds,.08,.35),
    animationTrackCrossFadeRequired:true,
    adjustWeightPreferred:true,
    playbackSpeedSyncRequired:speedSync!==false,
    accelerationDecelerationContinuityRequired:true,
    upperLowerBodyLayeringPreferred:upperLowerBodyLayering!==false,
    hardStatePopForbidden:true,
    gameplayTimingAuthority:false
  });
}

export function createRobloxCharacterMotionPlan({
  actorClass='HUMANOID_NPC',
  bodyPlan='HUMANOID',
  rigProfile='R15',
  gameId='',
  archetype='',
  motionCandidates=[],
  context={},
  recentMotionIds=[],
  blend={},
  procedural={}
}={}){
  const actor=upper(actorClass);
  const normalizedActor=ROBLOX_ACTOR_CLASSES.includes(actor)?actor:'HUMANOID_NPC';
  const source=selectRobloxCharacterMotionSource({
    candidates:motionCandidates,
    context:{...context,bodyPlan,rigProfile,platform:'ROBLOX'},
    gameId,
    archetype,
    recentMotionIds
  });
  const humanoid=normalizedActor!=='CREATURE'||/HUMANOID|BIPED|R15|R6/.test(upper(bodyPlan)+' '+upper(rigProfile));
  const requiredStates=humanoid
    ?['IDLE','WALK','JOG','RUN','START','STOP','TURN','ATTACK','HIT','DEATH']
    :['IDLE_ACTING','BODY_PLAN_LOCOMOTION','TURN','ATTACK','HIT','DEATH'];
  return Object.freeze({
    actorClass:normalizedActor,
    bodyPlan:upper(bodyPlan),
    rigProfile:upper(rigProfile),
    requiredRig:Object.freeze(humanoid
      ?['MOTOR6D_OR_BONES','HUMANOID_OR_ANIMATION_CONTROLLER','ANIMATOR']
      :['BODY_PLAN_SPECIFIC_ARTICULATED_JOINT_CHAIN','ANIMATOR']),
    requiredStates:Object.freeze(requiredStates),
    motionSource:source,
    blend:createRobloxMotionBlendProfile(blend),
    procedural:createProceduralMotionProfile({
      footIk:procedural.footIk!==false,
      groundNormal:procedural.groundNormal!==false,
      pelvisHeight:procedural.pelvisHeight!==false,
      spineLean:procedural.spineLean!==false,
      headGaze:procedural.headGaze!==false,
      aimOffset:procedural.aimOffset!==false,
      slopeAdaptation:procedural.slopeAdaptation!==false,
      platformBudget:procedural.platformBudget||'MOBILE'
    }),
    runtimeScenario:Object.freeze(['IDLE_5_SECONDS','WALK_10_SECONDS','TURN_LEFT_RIGHT','RUN_AND_STOP','ATTACK_THREE_TIMES_WHEN_COMBATANT','HIT_REACTION_WHEN_DAMAGEABLE','DEATH_WHEN_MORTAL','RESPAWN_WHEN_SUPPORTED']),
    weldConstraintOnlyArticulatedActorForbidden:true,
    rootTransformOnlyVisualLocomotionForbidden:true,
    officialStudioRuntimeEvidenceRequired:true,
    gameplayAuthority:false
  });
}

export function auditRobloxCharacterMotionEvidence({
  actorClass='HUMANOID_NPC',
  articulatedExpected=true,
  hasAnimator=false,
  hasHumanoid=false,
  hasAnimationController=false,
  hasMotor6D=false,
  hasBones=false,
  visibleLocomotion=false,
  rootTransformChanges=false,
  jointTransformChanges=false,
  weldConstraintOnly=false,
  hardStatePop=false,
  playbackSpeedSynced=true,
  footSlideNormalized=0,
  attackRecoverySnap=false,
  officialStudioRuntimeObserved=false
}={}){
  const failures=[];
  const articulated=hasMotor6D===true||hasBones===true;
  const controller=hasHumanoid===true||hasAnimationController===true;
  if(articulatedExpected===true&&!articulated)failures.push('RIG_ARTICULATION_MISSING');
  if(articulatedExpected===true&&hasAnimator!==true)failures.push('ANIMATOR_MISSING');
  if(articulatedExpected===true&&controller!==true)failures.push('ANIMATION_CONTROLLER_MISSING');
  if(weldConstraintOnly===true&&articulatedExpected===true)failures.push('WELD_CONSTRAINT_ONLY_ARTICULATED_BODY');
  if(visibleLocomotion===true&&rootTransformChanges===true&&jointTransformChanges!==true)failures.push('ROOT_ONLY_VISIBLE_LOCOMOTION');
  if(visibleLocomotion===true&&jointTransformChanges!==true)failures.push('JOINT_ACTIVITY_MISSING');
  if(hardStatePop===true)failures.push('HARD_MOTION_STATE_POP');
  if(playbackSpeedSynced!==true)failures.push('LOCOMOTION_PLAYBACK_SPEED_DESYNC');
  if(Number(footSlideNormalized||0)>.035)failures.push('FOOT_SLIDE_DISTANCE');
  if(attackRecoverySnap===true)failures.push('ATTACK_RECOVERY_SNAP');
  if(officialStudioRuntimeObserved!==true)failures.push('OFFICIAL_STUDIO_RUNTIME_EVIDENCE_MISSING');
  const mannequin=failures.some(value=>[
    'RIG_ARTICULATION_MISSING','ANIMATOR_MISSING','ANIMATION_CONTROLLER_MISSING',
    'WELD_CONSTRAINT_ONLY_ARTICULATED_BODY','ROOT_ONLY_VISIBLE_LOCOMOTION','JOINT_ACTIVITY_MISSING'
  ].includes(value));
  return Object.freeze({
    actorClass:upper(actorClass),
    pass:failures.length===0,
    mannequin,
    failureCode:mannequin?ROBLOX_CHARACTER_MOTION_FAILURE:null,
    failures:Object.freeze(failures),
    articulated,
    animatorBound:hasAnimator===true,
    controllerBound:controller,
    jointActivity:jointTransformChanges===true,
    runtimeObserved:officialStudioRuntimeObserved===true,
    blocksVerifiedPromotion:failures.length>0,
    gameplayAuthority:false
  });
}

export function createSpeciesSignature({archetype='',idle='',locomotion='',attack='',defense='',hit='',death='',specialBodyPart=''}={}){
  return Object.freeze({
    archetype:upper(archetype),
    slots:Object.freeze({
      IDLE_SIGNATURE:text(idle),
      LOCOMOTION_SIGNATURE:text(locomotion),
      ATTACK_SIGNATURE:text(attack),
      DEFENSE_SIGNATURE:text(defense),
      HIT_SIGNATURE:text(hit),
      DEATH_SIGNATURE:text(death),
      SPECIAL_BODY_PART_SIGNATURE:text(specialBodyPart)
    }),
    importantCreatureRequiresNonGenericSignature:true
  });
}

export function createMotionDirectorPlan({
  platform='UNITY',bodyPlan='HUMANOID',rigProfile='HUMANOID',styleFamily='STYLIZED_FANTASY',
  motionCandidates=[],context={},layers={},skill={},pair=null,reaction={},recentMotionIds=[],
  transition=null,contactQa=null,gameplayEvent=null,procedural=null,group=null,multiActor=null,
  emotion=null,lod=null,lineage=null,runtimeSignals=[],robloxCharacterMotion=null
}={}){
  const selector=selectContextMotion({
    candidates:motionCandidates,
    context:{...context,platform,bodyPlan,rigProfile,styleFamily},
    recentMotionIds
  });
  const selectedDNA=selector.selected?.dna||selector.selected||{BODY_PLAN:bodyPlan,RIG_PROFILE:rigProfile,STYLE_FAMILY:styleFamily,PLATFORM_VARIANT:platform};
  const composition=composeMotionStack({layers,dna:selectedDNA,styleVariant:{style:upper(styleFamily)}});
  return Object.freeze({
    version:2,
    target:MOTION_DIRECTOR_TARGET,
    platform:upper(platform),
    motionDNA:createMotionDNA(selectedDNA),
    selector,
    composition,
    skillSequence:buildSkillMotionSequence(skill),
    reaction:createReactionMatch(reaction),
    pairMotion:pair?createPairMotionContract(pair):null,
    transition:transition?evaluateMotionTransition(transition):null,
    contactQa:contactQa?auditMotionContact(contactQa):null,
    gameplayEventBinding:gameplayEvent?bindGameplayEventToMotion(gameplayEvent):null,
    proceduralMotion:procedural?createProceduralMotionProfile(procedural):null,
    groupMotion:group?createGroupMotionPlan(group):null,
    multiActorMotion:multiActor?createMultiActorMotionContract(multiActor):null,
    emotionIntent:emotion?createEmotionIntentLayer(emotion):null,
    motionLod:lod?selectMotionLod(lod):null,
    lineage:lineage?createMotionLineage(lineage):null,
    runtimeLearning:runtimeSignals?.length?buildRuntimeMotionLearningCandidate({platform,signals:aggregateRuntimeMotionSignals(runtimeSignals),samples:runtimeSignals}):null,
    robloxCharacterMotion:upper(platform)==='ROBLOX'?createRobloxCharacterMotionPlan({
      bodyPlan,rigProfile,motionCandidates,context,recentMotionIds,
      ...(robloxCharacterMotion||{})
    }):null,
    systems:Object.freeze([
      'MOTION_DNA','COMPATIBILITY_GRAPH','BODY_LAYER_COMPOSER','CONTEXT_SELECTOR','MOTION_GRAMMAR',
      'REACTION_MATCHER','PAIR_MOTION','SPECIES_SIGNATURE','STYLE_MODIFIER','MOTION_MUTATION','VARIATION_MEMORY',
      'TRANSITION_DIRECTOR','AUTOMATIC_CONTACT_QA','GAMEPLAY_EVENT_MOTION_BINDING','PROCEDURAL_MOTION_LAYER',
      'GROUP_MOTION_DIRECTOR','MULTI_ACTOR_MOTION','EMOTION_INTENT_LAYER','MOTION_LOD','MOTION_LINEAGE','RUNTIME_MOTION_LEARNING',
      ...(upper(platform)==='ROBLOX'?['ROBLOX_SMOOTH_CHARACTER_MOTION']:[])
    ]),
    libraryGraphNodes:MOTION_LIBRARY_GRAPH_NODES,
    continuousExpansion:true,
    noArtificialCombinationCap:true,
    gameplayAuthority:false
  });
}
