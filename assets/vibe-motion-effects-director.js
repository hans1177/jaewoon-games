// 파일명: assets/vibe-motion-effects-director.js
// 역할: 캐릭터 동작/애니메이션/카메라/VFX를 이벤트 기반으로 대폭 자동 고도화
// 원칙: 모션과 이펙트는 판정을 표현하며 데미지/체력/쿨타임/스폰/보상/저장 규칙은 변경하지 않음

// 임포트: 기존 직업·장르 모션 원본을 재사용하고 별도 스킬 데이터베이스를 만들지 않는다.
import {createCommonCareerMotionLoadout,createCommonMonsterActionLoadout,resolveCommonMotionGenre} from './vibe-motion-director.js';
const uniq=a=>[...new Set((a||[]).filter(Boolean))];
const clamp=n=>Math.max(0,Math.min(100,Math.round(n)));
const EVENTS=['idle','move','attack','hit','skill','death','spawn','boss','victory','interact','solve','guard','combo','heal','buff','summon'];
const MOTION=Object.freeze({idle:['breathing','weight-shift','gaze-head-track','secondary-motion'],move:['pose-match','inertialization','lean','body-bob','foot-lock-ik','direction-response','secondary-motion'],attack:['pose-match','telegraph','anticipation','windup','motion-warp','contact-solver','strike','follow-through','recovery'],hit:['impact-freeze','directional-body-hit','partial-ragdoll','recoil','flash','recover'],skill:['pose-match','telegraph','charge','motion-warp','contact-solver','release','follow-through','recovery'],death:['impact','partial-ragdoll','collapse','settle','despawn'],spawn:['entrance','overshoot','settle'],boss:['entrance','presence','phase-pose','telegraph','gaze-head-track'],victory:['release','celebration','settle'],interact:['target-focus','reach','contact','settle'],solve:['confirmed-result','solution-reveal','celebration','settle'],guard:['brace','hold','release'],combo:['anticipation','strike-chain','follow-through','recovery'],heal:['cast-gesture','target-focus','release','settle'],buff:['channel','gesture','release','settle'],summon:['ritual','release','settle']});
const EFFECTS=Object.freeze({attack:['weapon-trail','muzzle-or-slash','contact-spark'],hit:['hit-flash','impact-particles','damage-number','micro-shake'],skill:['charge-glow','trail','impact-burst','area-mark'],death:['death-burst','dissolve-or-fade','debris'],spawn:['spawn-ring','dust-or-glow'],boss:['focus-vignette','warning-pulse','boss-aura','major-impact'],victory:['celebration-particles','screen-accent'],interact:['contact-highlight'],solve:['verified-solution-glow','completion-accent'],guard:['guard-flash'],combo:['weapon-trail','combo-streak'],heal:['healing-aura'],buff:['buff-glow'],summon:['summon-circle']});
const FORBID=Object.freeze(['hp-change','damage-change','cooldown-change','spawn-count-change','reward-change','save-change','hitbox-change']);
// 장르별 그래픽 모션 언어: 기술 판정이 아닌 화면 표현만 구분한다.
const GENRE_GRAPHICS_LANGUAGE=Object.freeze({
  ACTION_RPG:Object.freeze({motion:'responsive-weapon-weight',effects:'contact-priority',camera:'follow-action',readability:'telegraph-before-impact'}),
  JRPG:Object.freeze({motion:'party-facing-cast-and-return',effects:'elemental-skill-identity',camera:'brief-cast-focus',readability:'turn-result-clear'}),
  TRADITIONAL_RPG:Object.freeze({motion:'readable-turn-gesture-and-settle',effects:'skill-result-clarity',camera:'stable-overview',readability:'commands-and-targets-visible'}),
  MMORPG:Object.freeze({motion:'network-safe-state-blend',effects:'bounded-party-combat',camera:'local-player-focus',readability:'telegraph-and-ally-visibility'}),
  ROGUELIKE:Object.freeze({motion:'quick-recovery-and-evade',effects:'low-clutter-threat-identity',camera:'stable-danger-readability',readability:'hazards-before-decoration'}),
  ACTION_PUZZLE:Object.freeze({motion:'touch-responsive-move-and-interact',effects:'object-contact-feedback',camera:'puzzle-board-visible',readability:'obstacle-and-solution-first'}),
  PUZZLE:Object.freeze({motion:'precise-manipulation',effects:'confirmed-solution-only',camera:'fixed-board-readability',readability:'rules-and-input-first'}),
  CASUAL:Object.freeze({motion:'soft-responsive-easing',effects:'low-intensity-reward-feedback',camera:'gentle-focus',readability:'large-touch-feedback'})
});
export function createVibeMotionProfile(event,{importance='normal',mobile=true,genre='ACTION_RPG'}={}){
  const layers=MOTION[event]||['feedback-motion'],effects=EFFECTS[event]||[];
  const major=importance==='major'||event==='boss';
  const genreId=resolveCommonMotionGenre(genre)||'ACTION_RPG';
  const visualLanguage=GENRE_GRAPHICS_LANGUAGE[genreId]||GENRE_GRAPHICS_LANGUAGE.ACTION_RPG;
  const gentle=['idle','move','interact','solve','guard','heal','buff','summon'].includes(event);
  return Object.freeze({
    event,genre:genreId,visualLanguage,
    layers:Object.freeze(layers),effects:Object.freeze(effects),
    timing:Object.freeze({anticipation:major?'medium':'short',impact:event==='hit'||event==='attack'?'sharp':'normal',recovery:major?'medium':'short'}),
    camera:Object.freeze({shake:gentle?'none':major?'medium':effects.length?'subtle':'none',zoom:major?'brief-focus':'none'}),
    mobile:Object.freeze({particleBudget:mobile?(major?'medium':'low'):'high',shakeLimit:mobile?'strict':'normal'}),
    forbid:FORBID,ruleSafe:true,gameplayAuthority:false
  });
}
export function auditVibeMotionEffects(graph){const spine={};for(const edge of graph?.edges||[]){if(edge.to?.startsWith('event:'))(spine[edge.to.slice(6)]??=[]).push(edge.from)}const rows=EVENTS.map(event=>{const owners=uniq(spine[event]||[]),motion=MOTION[event]||[],effects=EFFECTS[event]||[],present=owners.length>0,expected=motion.length+effects.length,coverage=present?clamp(Math.min(70,25+owners.length*15)):0;return Object.freeze({event,present,owners:Object.freeze(owners),coverage,debt:100-coverage,expectedLayers:expected})});rows.sort((a,b)=>b.debt-a.debt);return Object.freeze({score:clamp(rows.reduce((n,x)=>n+x.coverage,0)/(rows.length||1)),rows:Object.freeze(rows),priority:Object.freeze(rows.filter(x=>['attack','hit','move','death','skill','boss'].includes(x.event)).slice(0,5).map(x=>x.event))})}
export function createVibeSecondaryMotionRig({parts=[]}={}){const names=parts.map(String),rules=[];for(const part of names){const p=part.toLowerCase();if(/weapon|sword|gun|staff|무기|검|총|지팡이/.test(p))rules.push({part,mode:'follow-through',lag:.08});else if(/wing|tail|hair|cape|antenna|날개|꼬리|머리|망토|더듬이/.test(p))rules.push({part,mode:'spring-lag',lag:.12});else if(/body|torso|몸/.test(p))rules.push({part,mode:'weight-shift',lag:.04})}return Object.freeze({rules:Object.freeze(rules),preserve:Object.freeze(['collision','hitbox','game-position'])})}
export function createVibeImpactRecipe({kind='normal',importance='normal',mobile=true,weightClass='STANDARD',critical=false}={}){const major=importance==='major',weight=String(weightClass||'STANDARD').toUpperCase(),layers=['contact-flash','recoil','contact-audio-sync'];if(kind!=='soft')layers.push('particles');if(major||critical)layers.push('brief-hit-stop','camera-accent','screen-flash');const base=weight==='HEAVY'?70:weight==='LIGHT'?28:45;return Object.freeze({layers:Object.freeze(layers),limits:Object.freeze({hitStopMs:Math.min(95,Math.round(base*(major||critical?1.18:1))),shake:major||critical?'medium':weight==='HEAVY'?'medium':'subtle',particles:mobile?(major?18:8):(major?36:16),screenFlashOpacity:major?.18:.08}),contact:Object.freeze({confirmedContactRequired:true,weaponOrLimbVelocityDrivesWhoosh:true,impactPointDrivesVfxAndAudio:true}),camera:Object.freeze({directionalImpulse:true,weaponWeightScaled:true}),forbid:FORBID})}
export function createVibeEffectBudget({mobile=true,enemyCount=0,boss=false}={}){const pressure=Math.min(1,enemyCount/(mobile?18:30)),base=mobile?70:100,score=clamp(base-pressure*45-(boss?10:0));const animationTier=score<45?'FAR':score<70?'MID':'NEAR';return Object.freeze({score,particlesPerImpact:score<45?4:score<70?8:16,maxPersistentEmitters:score<45?3:score<70?6:12,animationTier,animationUpdateHz:animationTier==='NEAR'?60:animationTier==='MID'?30:15,ikUpdateHz:animationTier==='NEAR'?60:animationTier==='MID'?20:0,secondaryMotionHz:animationTier==='NEAR'?30:animationTier==='MID'?15:0,offscreenUpdateHz:5,allowBlur:!mobile&&score>65,allowFullScreenDistortion:!mobile&&score>80,degradePresentationBeforeGameplay:true,policy:'readability-before-spectacle'})}
// 메인: 하나의 gameplay-confirmed 사건을 직업 모션·스킬 연출·VFX·카메라 명령으로 투영한다.
// 실제 스킬 클립/타격 여부는 게임이 확인해야 하며 이 계층은 판정값을 생산하지 않는다.
export function createVibeMotionEffectExecution(event,{mobile=true,enemyCount=0,genre='',careerId='',skillId='',platform='SHARED',weaponFamily=''}={}){
  if(!event||event.authority!=='presentation-only'||event.gameplayMutationAllowed!==false)
    return Object.freeze({accepted:false,reason:'presentation-authority-required'});
  const type=String(event.eventType||'');
  const requestedGenre=String(genre||event.payload?.genre||'ACTION_RPG');
  const genreId=resolveCommonMotionGenre(requestedGenre);
  if(!genreId)return Object.freeze({accepted:false,reason:'unsupported-presentation-genre'});
  const career=String(careerId||event.payload?.careerId||'').toUpperCase();
  const requestedSkill=String(skillId||event.payload?.skillId||'').toUpperCase();
  let binding=null,assetReuse=null,activeWeapon=String(weaponFamily||event.payload?.weaponFamily||'').toUpperCase();
  if(type==='skill'&&(career||requestedSkill)){
    if(!career||!requestedSkill)return Object.freeze({accepted:false,reason:'career-and-skill-required'});
    let loadout;
    try{loadout=createCommonCareerMotionLoadout({
      careerId:career,genre:genreId,platform,weaponFamily:weaponFamily||event.payload?.weaponFamily||''
    });}catch{return Object.freeze({accepted:false,reason:'unsupported-career-genre-or-weapon'});}
    const skill=loadout.skills.find(row=>row.id===requestedSkill);
    if(!skill)return Object.freeze({accepted:false,reason:'skill-not-in-career-motion-loadout'});
    const role=loadout.roleRequests.find(row=>row.group==='skills'&&row.id===skill.id);
    assetReuse=loadout.cc0PlatformReuse;
    activeWeapon=loadout.weaponFamily;
    binding=Object.freeze({
      careerId:career,sourceCareerId:role?.sourceCareerId||career,skillId:skill.id,kind:skill.kind,
      phases:skill.sequence.phases,contactPart:skill.contactPart,
      vfxSlot:skill.vfxPresentationSlot,audioSlot:skill.audioPresentationSlot,
      cameraSlot:skill.cameraPresentationSlot,actualJointClipRequired:true,
      nativeRigBindingRequired:true,runtimeVerified:false,gameplayAuthority:false
    });
  }
  // 직업 스킬은 승인된 기존 무기군에서만 큰 동작의 실루엣을 선택한다.
  // 클립이 없는 경우에도 히트박스나 실제 이동속도를 바꾸지 않는 절차적 표현이다.
  const requestedStyle=String(event.payload?.motionStyle||'').toUpperCase();
  const weaponStyles={
    KATANA:'SLASH',ONE_HAND_SWORD:'SLASH',SHIELD_SWORD:'SLASH',TWO_HAND_SWORD:'CLEAVE',
    AXE:'CLEAVE',HAMMER:'CLEAVE',SPEAR:'THRUST',DAGGER:'THRUST',
    UNARMED:'PUNCH',BOW:'CAST',FIREARM:'CAST',STAFF_OR_WAND:'CAST',
    GADGET:'CAST',TOOL:'CLEAVE',INSTRUMENT:'CAST',DUAL_BLADE:'DUAL_CROSS'
  };
  const skillStyles={
    DASH:'THRUST',COMBO:'SLASH',COUNTER:'THRUST',CHARGE:'CLEAVE',
    PROJECTILE:'CAST',BEAM:'CAST',AREA:'CAST',ULTIMATE:'CLEAVE',
    TRAP:'CAST',SUMMON:'CAST',HEAL:'CAST',BUFF:'CAST'
  };
  // 기술명은 기존 직업 데이터에서만 읽는다. 원본 무기·타이밍·콤보 판정을 수정하지 않는다.
  const signatureStyle=binding
    ?/DIVE|SKY_BREAK|FALLING_THRUST/.test(binding.skillId)?'LEAP_DIVE'
      :/SHIELD_BASH|SHIELD_WALL/.test(binding.skillId)?'SHIELD_BASH'
      :/CRESCENT|MOON_CUT|SPEAR_WHIRL/.test(binding.skillId)?'SPIN_SLASH'
      :/RISING|UPPERCUT|PALM_WAVE/.test(binding.skillId)?'RISING_CUT'
      :binding.kind==='COMBO'&&activeWeapon==='DUAL_BLADE'?'DUAL_CROSS'
      :binding.kind==='ULTIMATE'&&['TWO_HAND_SWORD','AXE','HAMMER'].includes(activeWeapon)?'HEAVY_SLAM'
      :null
    :null;
  const allowedStyles=['SLASH','THRUST','CLEAVE','PUNCH','KICK','CAST','BITE',
    'HEAVY_SLAM','DUAL_CROSS','SPIN_SLASH','RISING_CUT','LEAP_DIVE','UPPERCUT','SHIELD_BASH','TAIL_SWIPE'];
  const motionStyle=allowedStyles.includes(requestedStyle)
    ?requestedStyle:(signatureStyle||skillStyles[binding?.kind]||weaponStyles[activeWeapon]||'DEFAULT');
  const profile=createVibeMotionProfile(type,{importance:event.importance||'normal',mobile,genre:genreId});
  const impact=createVibeImpactRecipe({
    kind:type==='hit'?'hard':'normal',importance:event.importance||'normal',
    mobile,weightClass:event.weightClass||'STANDARD',critical:event.critical===true
  });
  const budget=createVibeEffectBudget({mobile,enemyCount,boss:type==='boss'});
  const channels=new Set(event.channels||[]),commands=[];
  if(channels.has('animation'))commands.push(Object.freeze({
    channel:'animation',action:'play-motion-profile',layers:profile.layers,timing:profile.timing,
    genre:genreId,visualLanguage:profile.visualLanguage.motion,skillBinding:binding,motionStyle
  }));
  if(channels.has('vfx')){
    // 선공격과 스킬 시전은 명중 확인이 아니다. 접촉 불꽃/폭발은 authoritative hit 사건으로만 재생한다.
    const effects=profile.effects.filter(effect=>type!=='attack'||effect!=='contact-spark')
      .filter(effect=>type!=='skill'||effect!=='impact-burst');
    if(binding)effects.push(binding.vfxSlot);
    commands.push(Object.freeze({
      channel:'vfx',action:'play-effects',effects:Object.freeze(uniq(effects)),
      impact:type==='hit'?impact:null,budget,visualLanguage:profile.visualLanguage.effects,
      requiresConfirmedHitForContactEffects:true,skillBinding:binding
    }));
  }
  if(channels.has('camera'))commands.push(Object.freeze({
    channel:'camera',action:'apply-camera-accent',camera:profile.camera,
    visualLanguage:profile.visualLanguage.camera,skillBinding:binding
  }));
  return Object.freeze({
    accepted:true,eventId:event.presentationEventId,causeId:event.causeId,eventType:type,
    genre:genreId,readability:profile.visualLanguage.readability,skillBinding:binding,
    motionStyle,assetReuse,
    commands:Object.freeze(commands),authority:'presentation-only',
    gameplayMutationAllowed:false,runtimeVerified:false,forbid:FORBID
  });
}
export function executeVibeMotionEffectEvent(event,handlers={},options={}){const execution=createVibeMotionEffectExecution(event,options);if(!execution.accepted)return execution;const results=[];for(const command of execution.commands){const handler=handlers[command.channel];if(typeof handler==='function')results.push(Object.freeze({channel:command.channel,result:handler(command,event)}))}return Object.freeze({...execution,handled:results.length>0,results:Object.freeze(results)})}
// 계획: 기존 직업 모션 원본의 실제 스킬 슬롯을 그대로 이펙트 담당 단계에 전달한다.
export function planVibeMotionEffectsAutopilot({graph=null,parts=[],mobile=true,request='',genre='ACTION_RPG',careerId='',speciesId='',monsterTier='NORMAL',platform='SHARED',weaponFamily=''}={}){
  const audit=auditVibeMotionEffects(graph),tasks=[];
  const genreId=resolveCommonMotionGenre(genre);
  if(!genreId)throw Error('UNSUPPORTED_GRAPHICS_MOTION_GENRE:'+genre);
  for(const event of audit.priority){
    tasks.push(Object.freeze({
      domain:'motion',event,profile:createVibeMotionProfile(event,{importance:event==='boss'?'major':'normal',mobile,genre:genreId}),
      impact:createVibeImpactRecipe({kind:event==='hit'?'hard':'normal',importance:event==='boss'?'major':'normal',mobile}),
      risk:['attack','hit','skill'].includes(event)?'medium':'low'
    }));
  }
  const loadout=careerId?createCommonCareerMotionLoadout({careerId,genre:genreId,platform,weaponFamily}):null;
  const skillActions=Object.freeze((loadout?.skills||[]).map(skill=>Object.freeze({
    skillId:skill.id,kind:skill.kind,phases:skill.sequence.phases,
    vfxSlot:skill.vfxPresentationSlot,audioSlot:skill.audioPresentationSlot,
    cameraSlot:skill.cameraPresentationSlot,actualJointClipRequired:true,
    nativeRuntimeVerified:false,gameplayAuthority:false
  })));
  // 기존 대전격투 무기 모션팩과 생물 관절 변형을 기술별로 준비한다.
  // 원본 동작 ID, 히트박스·스킬 프레임·이동 속도는 절대 변경하지 않는다.
  const combatActions=Object.freeze(Object.entries(loadout?.combatSourcePack?.groups||{})
    .flatMap(([group,ids])=>(ids||[]).map((motionId,index)=>Object.freeze({
      group,motionId,sourceWeaponFamily:loadout.weaponFamily,variationIndex:index,
      sourcePack:'EXISTING_DUEL_COMBAT_MOTION_LIBRARY',actualClipRequired:true,
      nativeRuntimeVerified:false,gameplayAuthority:false
    }))));
  const creature=speciesId?createCommonMonsterActionLoadout({
    speciesId,genre:genreId,platform,tier:monsterTier
  }):null;
  // 60종 정교한 체형별 관절 동작과 정예/보스 50안무를 기존 이벤트/애니메이션 작업 큐에 노출한다.
  // native Animator 연결 전에는 절대 실행되었다고 표기하지 않으며, 시각 효과만 가진다.
  const creatureActions=Object.freeze([
    ...(creature?.choreography||[]).map(row=>({row,source:'SPECIES_CHOREOGRAPHY'})),
    ...(creature?.expressiveChoreography||[]).map(row=>({row,source:'SPECIES_EXPRESSIVE'})),
    ...(creature?.motion60||[]).map(row=>({row,source:'DETAILED_BODY_PLAN_60'})),
    ...(creature?.tierActionPatterns||[]).map(row=>({row,source:'ELITE_BOSS_PRESENTATION_50'}))
  ].map(({row,source})=>Object.freeze({
    id:row.id,group:row.group||(source==='ELITE_BOSS_PRESENTATION_50'?'tier-pattern':'attacks'),
    sourceMotionId:row.sourceMotionId||null,source,
    bodyPlan:creature.bodyPlan,speciesId:creature.id,
    contactLimb:row.primaryContactLimb||row.contactLimb||null,
    poseKeyTimes:row.poseKeyTimes,jointTracks:row.jointTracks,
    steps:row.steps||null,
    tier:creature.presentationTier,authoritativeRootMovement:false,
    existingGameplayEventRequired:true,nativeAssetVerified:false,
    actualNativeRigBindingRequired:true,runtimeVerified:false,gameplayAuthority:false
  })));
  return Object.freeze({
    version:2,request:String(request),genre:genreId,careerId:loadout?.id||null,
    audit,secondaryMotion:createVibeSecondaryMotionRig({parts}),tasks:Object.freeze(tasks),
    skillActions,combatActions,creatureActions,cc0PlatformReuse:loadout?.cc0PlatformReuse||null,
    engine:Object.freeze({name:'Jaewoon Motion Engine',path:'assets/jaewoon-motion-engine.js',presentationOnly:true}),
    policy:Object.freeze({serverAI:false,eventDriven:true,checkpoint:true,mobileFirst:mobile,gameplayAuthoritative:true,noRuleMutation:true}),
    runtimeVerified:false,authorityExpanded:false
  });
}
export function validateVibeMotionPatch({beforeFingerprint={},afterFingerprint={}}={}){const changed=[];for(const key of uniq([...Object.keys(beforeFingerprint),...Object.keys(afterFingerprint)]))if(JSON.stringify(beforeFingerprint[key]||[])!==JSON.stringify(afterFingerprint[key]||[]))changed.push(key);return Object.freeze({safe:changed.length===0,changed:Object.freeze(changed),reason:changed.length?'protected-game-rule-changed':'presentation-only'})}

function engineApi(engine){return engine||globalThis?.JaewoonMotionEngine||null}
export function createVibeMotionEngineBridge({engine=null,reducedMotion=false,lowPower=false,motionScale=1}={}){
  const api=engineApi(engine);
  if(!api?.createMotionRig||!api?.createCameraMotion)return Object.freeze({ready:false,reason:'jaewoon-motion-engine-missing',enginePath:'assets/jaewoon-motion-engine.js'});
  const rig=api.createMotionRig({reducedMotion,lowPower,motionScale});
  const camera=api.createCameraMotion({reducedMotion,lowPower});
  return {ready:true,enginePath:'assets/jaewoon-motion-engine.js',rig,camera,authority:'presentation-only',gameplayMutationAllowed:false,forbid:FORBID};
}

// 실시간 연결: 사전 승인된 기존 몬스터 뼈·관절에만 의미 포즈를 적용한다.
// 이벤트는 게임 측에서 확정된 연출 명령만 받아들이며, 이동/피격 판정/HP를 소유하지 않는다.
// rig.joints는 실제 Native Bone/Motor6D/Animator 부위 바인딩이어야 한다. 임시 파츠 생성 금지.
export function createVibeCreatureRigPlayback({
  speciesId='',tier='NORMAL',platform='WEB',rig=null,applyJointPose=null
}={}){
  let creature;
  try{creature=createCommonMonsterActionLoadout({speciesId,tier,platform});}
  catch{return Object.freeze({ready:false,reason:'unsupported-creature-or-platform',runtimeVerified:false});}
  const motions=creature.motion60||[];
  if(!motions.length)return Object.freeze({ready:false,reason:'no-nonhumanoid-motion60',runtimeVerified:false});
  if(!rig||typeof applyJointPose!=='function')
    return Object.freeze({ready:false,reason:'native-rig-or-joint-renderer-missing',runtimeVerified:false});
  if(String(rig.bodyPlan||'').toUpperCase()!==creature.bodyPlan)
    return Object.freeze({ready:false,reason:'native-rig-body-plan-mismatch',runtimeVerified:false});
  // 승인과 출처는 호출 측에서 제공한다. 필드의 존재만으로 실제 권한 검증을 증명하지 않는다.
  const auth=rig.assetAuthorization||{};
  if(auth.approved!==true||typeof auth.sourceAssetId!=='string'||!auth.sourceAssetId.trim()
    ||typeof auth.sourceHash!=='string'||!auth.sourceHash.trim()
    ||auth.licenseVerified!==true||(String(platform).toUpperCase()==='ROBLOX'&&auth.placeAccessVerified!==true))
    return Object.freeze({ready:false,reason:'approved-real-rig-provenance-or-place-access-missing',runtimeVerified:false});
  const joints=rig.joints||{};
  const required=[...new Set([...motions,...creature.tierActionPatterns]
    .flatMap(row=>row.jointTracks.map(track=>track.part)))];
  const missing=required.filter(part=>!Object.hasOwn(joints,part)||joints[part]==null);
  if(missing.length)return Object.freeze({ready:false,reason:'articulated-rig-channels-missing',
    missing:Object.freeze(missing),runtimeVerified:false});
  const byId=new Map(motions.map(row=>[row.id,row]));
  const eventGroups=Object.freeze({
    idle:Object.freeze(['locomotion','acting']),
    move:Object.freeze(['locomotion']),
    attack:Object.freeze(['attacks','signature']),
    combo:Object.freeze(['attacks','signature']),
    guard:Object.freeze(['defense']),
    hit:Object.freeze(['reactions']),
    death:Object.freeze(['deaths']),
    skill:Object.freeze(['skill','signature']),
    boss:Object.freeze(['acting','signature']),
    spawn:Object.freeze(['acting','signature'])
  });
  const interpolate=(frames,phase)=>{
    if(phase<=0)return frames[0].rotation;
    for(let i=1;i<frames.length;i++){
      const after=frames[i],before=frames[i-1];
      if(phase<=after.phase){
        const portion=Math.max(0,Math.min(1,(phase-before.phase)/(after.phase-before.phase)));
        const eased=portion*portion*(3-2*portion);
        return before.rotation.map((angle,axis)=>angle+(after.rotation[axis]-angle)*eased);
      }
    }
    return frames[frames.length-1].rotation;
  };
  let active=null;
  const playback={
    ready:true,bodyPlan:creature.bodyPlan,speciesId:creature.id,tier:creature.presentationTier,
    supportedMotionIds:Object.freeze([...byId.keys()]),
    requiredJointParts:Object.freeze(required),
    authority:'presentation-only',gameplayMutationAllowed:false,
    platformNativeAdapterRequired:true,runtimeVerified:false,productionVerified:false,
    play(event,motionId,{durationSeconds=1}={}){
      if(!event||event.authority!=='presentation-only'||event.gameplayMutationAllowed!==false
        ||!event.causeId||!event.presentationEventId)
        return Object.freeze({accepted:false,reason:'confirmed-presentation-event-required'});
      const motion=byId.get(String(motionId||''));
      if(!motion)return Object.freeze({accepted:false,reason:'unknown-or-unbound-creature-motion'});
      if(!eventGroups[event.eventType]?.includes(motion.group))
        return Object.freeze({accepted:false,reason:'creature-motion-event-group-mismatch'});
      const duration=Number(durationSeconds);
      if(!Number.isFinite(duration)||duration<.08||duration>30)
        return Object.freeze({accepted:false,reason:'invalid-presentation-only-duration'});
      active={motion,elapsed:0,duration,causeId:event.causeId};
      return Object.freeze({accepted:true,motionId:motion.id,causeId:event.causeId,
        gameplayMutationAllowed:false,runtimeVerified:false});
    },
    tick(dtSeconds){
      if(!active)return Object.freeze({applied:false,reason:'no-accepted-motion'});
      const dt=Number(dtSeconds);
      if(!Number.isFinite(dt)||dt<0||dt>.25)return Object.freeze({applied:false,reason:'invalid-render-delta'});
      active.elapsed=Math.min(active.duration,active.elapsed+dt);
      const phase=active.elapsed/active.duration;
      const pose=active.motion;
      for(const track of pose.jointTracks){
        const rotation=interpolate(track.frames,phase);
        // Renderer는 오직 승인된 부위의 로컬 관절 회전만 써야 한다.
        applyJointPose(joints[track.part],Object.freeze(rotation),Object.freeze({
          part:track.part,motionId:pose.id,causeId:active.causeId,
          phase,localRotationRadians:true,authority:'presentation-only'
        }));
      }
      const complete=phase>=1;
      const hold=pose.group==='deaths';
      if(complete&&!hold)active=null;
      return Object.freeze({applied:true,motionId:pose.id,normalizedPhase:phase,
        jointCount:pose.jointTracks.length,completed:complete,
        holdsDeathPose:complete&&hold,gameplayMutationAllowed:false});
    },
    stop(){active=null;return Object.freeze({stopped:true,gameplayMutationAllowed:false});}
  };
  return Object.freeze(playback);
}

// 실행: 기존 보간 리그를 그대로 사용하고 이동 상태는 이동/대기 이벤트에서만 갱신한다.
export function executeVibeMotionEngineEvent(event,bridge,{speed=0,facing=1,hitDirection=-1,bodyRegion='TORSO',turn=0,lodTier='NEAR'}={}){
  if(!bridge?.ready||!bridge.rig||!bridge.camera)return Object.freeze({accepted:false,reason:'motion-engine-bridge-not-ready'});
  const execution=createVibeMotionEffectExecution(event,{mobile:true,enemyCount:0,platform:'WEB'});
  if(!execution.accepted)return execution;
  const type=String(event.eventType||''),major=event.importance==='major'||type==='boss';
  const supportSkill=execution.skillBinding&&['HEAL','BUFF','CHANNEL','GUARD','SUMMON','TRAP','TRANSFORM','REPAIR','INTERACT','COMMAND','PERFORM','STANCE'].includes(execution.skillBinding.kind);
  if(type==='move'||type==='idle')bridge.rig.setMotionState({moving:type==='move',speed,facing,turn});
  if(typeof bridge.rig.setLod==='function')bridge.rig.setLod({tier:lodTier});
  if(type==='attack'||(type==='skill'&&!supportSkill))
    bridge.rig.triggerAttack({strength:major?1.5:1,duration:major?.34:.24,weightClass:event.weightClass||'STANDARD',contactAt:event.contactAt??.52,comboIndex:event.payload?.comboIndex??event.comboIndex??0,style:execution.motionStyle});
  if(type==='hit'){
    bridge.rig.triggerHit({direction:hitDirection,strength:major?1.5:1,bodyRegion});
    if(typeof bridge.rig.triggerContact==='function'){
      const impact=createVibeImpactRecipe({kind:'hard',importance:event.importance||'normal',mobile:true,weightClass:event.weightClass||'STANDARD',critical:event.critical===true});
      bridge.rig.triggerContact({strength:major?1.5:1,hitStopMs:impact.limits.hitStopMs});
    }
  }
  if(type==='spawn'||type==='death')bridge.rig.triggerLand({strength:major?1.4:.8});
  if(type==='hit'||type==='attack'||type==='boss'||(type==='skill'&&!supportSkill)){
    // 공격 예고는 미세하게, 실제 명중은 무기 무게에 맞게 전달한다. 입력·물리 카메라는 건드리지 않는다.
    const confirmed=type==='hit';
    const weight=String(event.weightClass||'STANDARD').toUpperCase();
    const weightScale=confirmed?(weight==='HEAVY'?1.25:weight==='LIGHT'?.72:1):1;
    const accentScale=type==='attack'?.28:confirmed?weightScale:1;
    bridge.camera.impulse({
      x:(confirmed?hitDirection:facing)*(major?90:45)*accentScale,
      y:(major?-45:-18)*accentScale,
      rotation:(major?.7:.25)*facing*accentScale
    });
  }
  return Object.freeze({
    accepted:true,eventType:type,skillBinding:execution.skillBinding,authority:'presentation-only',
    gameplayMutationAllowed:false,forbid:FORBID,bridgeApplied:true
  });
}
if(typeof window!=='undefined'){
  window.createJaewoonVibeMotionProfile=createVibeMotionProfile;
  window.auditJaewoonVibeMotionEffects=auditVibeMotionEffects;
  window.createJaewoonVibeSecondaryMotionRig=createVibeSecondaryMotionRig;
  window.createJaewoonVibeImpactRecipe=createVibeImpactRecipe;
  window.createJaewoonVibeEffectBudget=createVibeEffectBudget;
  window.createJaewoonVibeMotionEffectExecution=createVibeMotionEffectExecution;
  window.executeJaewoonVibeMotionEffectEvent=executeVibeMotionEffectEvent;
  window.planJaewoonVibeMotionEffectsAutopilot=planVibeMotionEffectsAutopilot;
  window.validateJaewoonVibeMotionPatch=validateVibeMotionPatch;
  window.createJaewoonVibeMotionEngineBridge=createVibeMotionEngineBridge;
  window.createJaewoonVibeCreatureRigPlayback=createVibeCreatureRigPlayback;
  window.executeJaewoonVibeMotionEngineEvent=executeVibeMotionEngineEvent;
}
