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
