// 역할: GRAPHICS_PRODUCTION 내부에서 모션 부품을 조합·선택·변형·검증한다.
// 주의: 데미지/히트박스/쿨다운/콤보 판정/이동 권한은 게임플레이 시스템 소유다.

const freezeList = value => Object.freeze([...(Array.isArray(value) ? value : [])]);
const text = value => String(value ?? '').trim();
const upper = value => text(value).toUpperCase();
const unique = values => [...new Set((values || []).map(text).filter(Boolean))];
const clamp = (value,min,max) => Math.max(min,Math.min(max,Number(value)||0));

export const MOTION_DIRECTOR_TARGET='HIGH_END_COMPOSABLE_MOTION_DIRECTOR';

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

export function createMotionDirectorPlan({platform='UNITY',bodyPlan='HUMANOID',rigProfile='HUMANOID',styleFamily='STYLIZED_FANTASY',motionCandidates=[],context={},layers={},skill={},pair=null,reaction={},recentMotionIds=[]}={}){
  const selector=selectContextMotion({
    candidates:motionCandidates,
    context:{...context,platform,bodyPlan,rigProfile,styleFamily},
    recentMotionIds
  });
  const selectedDNA=selector.selected?.dna||selector.selected||{BODY_PLAN:bodyPlan,RIG_PROFILE:rigProfile,STYLE_FAMILY:styleFamily,PLATFORM_VARIANT:platform};
  const composition=composeMotionStack({layers,dna:selectedDNA,styleVariant:{style:upper(styleFamily)}});
  return Object.freeze({
    version:1,
    target:MOTION_DIRECTOR_TARGET,
    platform:upper(platform),
    motionDNA:createMotionDNA(selectedDNA),
    selector,
    composition,
    skillSequence:buildSkillMotionSequence(skill),
    reaction:createReactionMatch(reaction),
    pairMotion:pair?createPairMotionContract(pair):null,
    systems:Object.freeze([
      'MOTION_DNA','COMPATIBILITY_GRAPH','BODY_LAYER_COMPOSER','CONTEXT_SELECTOR','MOTION_GRAMMAR',
      'REACTION_MATCHER','PAIR_MOTION','SPECIES_SIGNATURE','STYLE_MODIFIER','MOTION_MUTATION','VARIATION_MEMORY'
    ]),
    libraryGraphNodes:MOTION_LIBRARY_GRAPH_NODES,
    continuousExpansion:true,
    noArtificialCombinationCap:true,
    gameplayAuthority:false
  });
}
