// 파일명: assets/vibe-motion-effects-director.js
// 역할: 캐릭터 동작/애니메이션/카메라/VFX를 이벤트 기반으로 대폭 자동 고도화
// 원칙: 모션과 이펙트는 판정을 표현하며 데미지/체력/쿨타임/스폰/보상/저장 규칙은 변경하지 않음

const uniq=a=>[...new Set((a||[]).filter(Boolean))];
const clamp=n=>Math.max(0,Math.min(100,Math.round(n)));
const EVENTS=['idle','move','attack','hit','skill','death','spawn','boss','victory'];
const MOTION=Object.freeze({idle:['breathing','weight-shift','gaze-head-track','secondary-motion'],move:['pose-match','inertialization','lean','body-bob','foot-lock-ik','direction-response','secondary-motion'],attack:['pose-match','telegraph','anticipation','windup','motion-warp','contact-solver','strike','follow-through','recovery'],hit:['impact-freeze','directional-body-hit','partial-ragdoll','recoil','flash','recover'],skill:['pose-match','telegraph','charge','motion-warp','contact-solver','release','follow-through','recovery'],death:['impact','partial-ragdoll','collapse','settle','despawn'],spawn:['entrance','overshoot','settle'],boss:['entrance','presence','phase-pose','telegraph','gaze-head-track'],victory:['release','celebration','settle']});
const EFFECTS=Object.freeze({attack:['weapon-trail','muzzle-or-slash','contact-spark'],hit:['hit-flash','impact-particles','damage-number','micro-shake'],skill:['charge-glow','trail','impact-burst','area-mark'],death:['death-burst','dissolve-or-fade','debris'],spawn:['spawn-ring','dust-or-glow'],boss:['focus-vignette','warning-pulse','boss-aura','major-impact'],victory:['celebration-particles','screen-accent']});
const FORBID=Object.freeze(['hp-change','damage-change','cooldown-change','spawn-count-change','reward-change','save-change','hitbox-change']);
export function createVibeMotionProfile(event,{importance='normal',mobile=true}={}){const layers=MOTION[event]||['feedback-motion'],effects=EFFECTS[event]||[],major=importance==='major'||event==='boss';return Object.freeze({event,layers:Object.freeze(layers),effects:Object.freeze(effects),timing:Object.freeze({anticipation:major?'medium':'short',impact:event==='hit'||event==='attack'?'sharp':'normal',recovery:major?'medium':'short'}),camera:Object.freeze({shake:major?'medium':effects.length?'subtle':'none',zoom:major?'brief-focus':'none'}),mobile:Object.freeze({particleBudget:mobile?(major?'medium':'low'):'high',shakeLimit:mobile?'strict':'normal'}),forbid:FORBID,ruleSafe:true})}
export function auditVibeMotionEffects(graph){const spine={};for(const edge of graph?.edges||[]){if(edge.to?.startsWith('event:'))(spine[edge.to.slice(6)]??=[]).push(edge.from)}const rows=EVENTS.map(event=>{const owners=uniq(spine[event]||[]),motion=MOTION[event]||[],effects=EFFECTS[event]||[],present=owners.length>0,expected=motion.length+effects.length,coverage=present?clamp(Math.min(70,25+owners.length*15)):0;return Object.freeze({event,present,owners:Object.freeze(owners),coverage,debt:100-coverage,expectedLayers:expected})});rows.sort((a,b)=>b.debt-a.debt);return Object.freeze({score:clamp(rows.reduce((n,x)=>n+x.coverage,0)/(rows.length||1)),rows:Object.freeze(rows),priority:Object.freeze(rows.filter(x=>['attack','hit','move','death','skill','boss'].includes(x.event)).slice(0,5).map(x=>x.event))})}
export function createVibeSecondaryMotionRig({parts=[]}={}){const names=parts.map(String),rules=[];for(const part of names){const p=part.toLowerCase();if(/weapon|sword|gun|staff|무기|검|총|지팡이/.test(p))rules.push({part,mode:'follow-through',lag:.08});else if(/wing|tail|hair|cape|antenna|날개|꼬리|머리|망토|더듬이/.test(p))rules.push({part,mode:'spring-lag',lag:.12});else if(/body|torso|몸/.test(p))rules.push({part,mode:'weight-shift',lag:.04})}return Object.freeze({rules:Object.freeze(rules),preserve:Object.freeze(['collision','hitbox','game-position'])})}
export function createVibeImpactRecipe({kind='normal',importance='normal',mobile=true,weightClass='STANDARD',critical=false}={}){const major=importance==='major',weight=String(weightClass||'STANDARD').toUpperCase(),layers=['contact-flash','recoil','contact-audio-sync'];if(kind!=='soft')layers.push('particles');if(major||critical)layers.push('brief-hit-stop','camera-accent','screen-flash');const base=weight==='HEAVY'?70:weight==='LIGHT'?28:45;return Object.freeze({layers:Object.freeze(layers),limits:Object.freeze({hitStopMs:Math.min(95,Math.round(base*(major||critical?1.18:1))),shake:major||critical?'medium':weight==='HEAVY'?'medium':'subtle',particles:mobile?(major?18:8):(major?36:16),screenFlashOpacity:major?.18:.08}),contact:Object.freeze({confirmedContactRequired:true,weaponOrLimbVelocityDrivesWhoosh:true,impactPointDrivesVfxAndAudio:true}),camera:Object.freeze({directionalImpulse:true,weaponWeightScaled:true}),forbid:FORBID})}
export function createVibeEffectBudget({mobile=true,enemyCount=0,boss=false}={}){const pressure=Math.min(1,enemyCount/(mobile?18:30)),base=mobile?70:100,score=clamp(base-pressure*45-(boss?10:0));const animationTier=score<45?'FAR':score<70?'MID':'NEAR';return Object.freeze({score,particlesPerImpact:score<45?4:score<70?8:16,maxPersistentEmitters:score<45?3:score<70?6:12,animationTier,animationUpdateHz:animationTier==='NEAR'?60:animationTier==='MID'?30:15,ikUpdateHz:animationTier==='NEAR'?60:animationTier==='MID'?20:0,secondaryMotionHz:animationTier==='NEAR'?30:animationTier==='MID'?15:0,offscreenUpdateHz:5,allowBlur:!mobile&&score>65,allowFullScreenDistortion:!mobile&&score>80,degradePresentationBeforeGameplay:true,policy:'readability-before-spectacle'})}
// 공용 스킬 원본: 직업·종족별 VFX의 모양/시점/강도를 실제 수치 트랙으로 정의한다.
// 기존 이벤트 권한을 유지하며 타격/힐/소환의 게임 결과는 절대로 생성하지 않는다.
export const VIBE_COMMON_SKILL_FX_FORMS=Object.freeze({
  STRIKE:Object.freeze({shape:'CONTACT_ARC',attachment:'WEAPON_OR_PRIMARY_LIMB',audio:'CONTACT_WHOOSH',emission:[0,.05,.16,1,.24,0],trail:[0,.15,.6,1,.33,0],size:[0,.15,.50,.90,.35,0]}),
  PROJECTILE:Object.freeze({shape:'PROJECTILE_RELEASE_TRAIL',attachment:'BOW_GUN_OR_MUZZLE',audio:'RELEASE_CUE',emission:[0,.12,.6,1,.18,0],trail:[0,.05,.3,1,.80,.2],size:[0,.08,.22,.65,.42,.1]}),
  SPELL:Object.freeze({shape:'CHANNEL_RUNE',attachment:'HAND_FOCUS_OR_CORE',audio:'SPELL_CHARGE_RELEASE',emission:[0,.30,.75,1,.4,0],trail:[0,.08,.35,.82,.24,0],size:[0,.2,.50,.95,.45,0]}),
  SUMMON:Object.freeze({shape:'SUMMON_GATE',attachment:'GAME_APPROVED_TARGET_SOCKET',audio:'SUMMON_GESTURE',emission:[0,.12,.56,1,.72,0],trail:[0,.03,.16,.28,.13,0],size:[0,.15,.45,1,.92,0]}),
  HEAL:Object.freeze({shape:'HEAL_ORBIT',attachment:'GAME_APPROVED_HEAL_TARGET',audio:'HEAL_GESTURE',emission:[0,.15,.48,.85,1,.18],trail:[0,0,.22,.38,.48,.10],size:[0,.16,.54,.85,.90,.2]}),
  STEALTH:Object.freeze({shape:'SHADOW_EDGE',attachment:'BODY_SILHOUETTE',audio:'SOFT_ESCAPE',emission:[0,.2,.64,.8,.32,0],trail:[0,.13,.52,.93,.54,0],size:[0,.16,.38,.72,.56,0]}),
  COMMAND:Object.freeze({shape:'SIGNAL_RING',attachment:'HAND_GESTURE',audio:'COMMAND_SHOUT',emission:[0,.10,.35,.95,.65,0],trail:[0,0,.12,.24,.13,0],size:[0,.10,.32,1,.72,0]}),
  CRAFT:Object.freeze({shape:'TOOL_CONTACT_SPARKS',attachment:'WORKPIECE_SOCKET',audio:'TOOL_SURFACE_CONTACT',emission:[0,.06,.24,1,.36,0],trail:[0,0,.19,.32,.15,0],size:[0,.05,.16,.43,.24,0]}),
  INTERACTION:Object.freeze({shape:'SUBTLE_ACTION_GLOW',attachment:'HAND_OR_INTERACTION_PROP',audio:'INTERACTION_CUE',emission:[0,.06,.26,.48,.22,0],trail:[0,0,.09,.15,.1,0],size:[0,.06,.14,.20,.14,0]})
});

export function createVibeCommonSkillFxSource({
  id='',skillFamily='SPELL',bodyPlan='HUMANOID',genre='ACTION_RPG',
  contact='',mobile=true,enemyCount=0,styleFamily='STYLIZED_FANTASY'
}={}){
  const skillId=String(id||'').trim().toUpperCase();
  const family=String(skillFamily||'SPELL').trim().toUpperCase();
  const plan=String(bodyPlan||'HUMANOID').trim().toUpperCase();
  const form=VIBE_COMMON_SKILL_FX_FORMS[family];
  if(!skillId||!form)return Object.freeze({valid:false,reason:!skillId?'SKILL_ID_REQUIRED':'UNKNOWN_SKILL_FAMILY',productionVerified:false,gameplayAuthority:false});
  const budget=createVibeEffectBudget({mobile,enemyCount,boss:plan.includes('BOSS')||plan.includes('DRACONIC')});
  let shape=form.shape,attachment=String(contact||form.attachment).trim().toUpperCase();
  if(/WEB|SPINNERET/.test(skillId)){shape='WEB_SILK_RIBBONS';attachment='SPINNERET';}
  else if(/TAIL_STING|SCORPION/.test(skillId)){shape='VENOM_TIP_SPARK';attachment='TAIL_STINGER';}
  else if(/PHEROMONE|ANTENNA|INSECT/.test(skillId)){shape='PHEROMONE_RADIAL_PARTICLES';attachment='ANTENNA_OR_GLAND';}
  else if(/WING_GUST|WIND|FEATHER/.test(skillId)){shape='WING_AIR_TRAILS';attachment='WING_TIP';}
  else if(/BREATH|DRAGON|BEAM/.test(skillId)){shape='BREATH_CONE_OR_BEAM';attachment='MOUTH_OR_CORE';}
  else if(/SLIME|FRAGMENT|AMORPHOUS/.test(skillId)){shape='VISCOUS_RIBBON_BLOBS';attachment='BODY_SURFACE';}
  else if(/CURSE|GHOST|SCREAM/.test(skillId)){shape='ETHEREAL_SIGIL';attachment='SPECTRAL_CENTER';}
  else if(/HOOF|STAMPEDE|TRAMPLE/.test(skillId)){shape='HOOF_GROUND_RIPPLES';attachment='HOOF_CONTACT';}
  else if(/GOLEM|CORE|ROCK/.test(skillId)){shape='CORE_STONE_PARTICLES';attachment='CORE_OR_ARM';}
  const times=[0,.18,.39,.57,.76,1];
  const frames=Object.freeze(times.map((at,index)=>Object.freeze({
    normalizedTime:at,
    emission:Number(form.emission[index].toFixed(3)),
    trailOpacity:Number(form.trail[index].toFixed(3)),
    sizeNormalized:Number(form.size[index].toFixed(3)),
    particleBudget:Math.round(budget.particlesPerImpact*form.emission[index]),
    contactTriggered:false
  })));
  const audioMarkers=Object.freeze([
    Object.freeze({atNormalized:.18,role:'ANTICIPATION',trigger:'PRESENTATION_ONLY'}),
    Object.freeze({atNormalized:.57,role:form.audio,trigger:'GAME_CONFIRMED_ACTION_EVENT_REQUIRED'})
  ]);
  return Object.freeze({
    valid:true,kind:'REUSABLE_SKILL_PRESENTATION_SOURCE',id:skillId,
    skillFamily:family,bodyPlan:plan,genre:String(genre||'ACTION_RPG').toUpperCase(),
    styleFamily:String(styleFamily||'STYLIZED_FANTASY').toUpperCase(),
    shape,attachment,frames,audioMarkers,
    budget,particleMaxPerImpact:budget.particlesPerImpact,displayOnly:true,
    requiresCompatibleBodyRig:true,requiresPlatformNativeEmitter:true,
    requiresRealMotionContactAndAudioEvent:true,
    runtimeVerified:false,productionVerified:false,
    gameplayDamageHitboxCooldownSpawnHealthRewardSaveAuthority:false,
    gameplayAuthority:false,gameplayMutationAllowed:false,
    forbid:FORBID
  });
}

export function createVibeMotionEffectExecution(event,{mobile=true,enemyCount=0}={}){if(!event||event.authority!=='presentation-only'||event.gameplayMutationAllowed!==false)return Object.freeze({accepted:false,reason:'presentation-authority-required'});const type=String(event.eventType||''),profile=createVibeMotionProfile(type,{importance:event.importance||'normal',mobile}),impact=createVibeImpactRecipe({kind:type==='hit'?'hard':'normal',importance:event.importance||'normal',mobile,weightClass:event.weightClass||'STANDARD',critical:event.critical===true}),budget=createVibeEffectBudget({mobile,enemyCount,boss:type==='boss'}),channels=new Set(event.channels||[]),commands=[];if(channels.has('animation'))commands.push(Object.freeze({channel:'animation',action:'play-motion-profile',layers:profile.layers,timing:profile.timing}));if(channels.has('vfx'))commands.push(Object.freeze({channel:'vfx',action:'play-effects',effects:profile.effects,impact,budget}));if(channels.has('camera'))commands.push(Object.freeze({channel:'camera',action:'apply-camera-accent',camera:profile.camera}));return Object.freeze({accepted:true,eventId:event.presentationEventId,causeId:event.causeId,eventType:type,commands:Object.freeze(commands),authority:'presentation-only',gameplayMutationAllowed:false,forbid:FORBID})}
export function executeVibeMotionEffectEvent(event,handlers={},options={}){const execution=createVibeMotionEffectExecution(event,options);if(!execution.accepted)return execution;const results=[];for(const command of execution.commands){const handler=handlers[command.channel];if(typeof handler==='function')results.push(Object.freeze({channel:command.channel,result:handler(command,event)}))}return Object.freeze({...execution,handled:results.length>0,results:Object.freeze(results)})}
export function planVibeMotionEffectsAutopilot({graph=null,parts=[],mobile=true,request=''}={}){const audit=auditVibeMotionEffects(graph),tasks=[];for(const event of audit.priority){tasks.push(Object.freeze({domain:'motion',event,profile:createVibeMotionProfile(event,{importance:event==='boss'?'major':'normal',mobile}),impact:createVibeImpactRecipe({kind:event==='hit'?'hard':'normal',importance:event==='boss'?'major':'normal',mobile}),risk:['attack','hit','skill'].includes(event)?'medium':'low'}))}return Object.freeze({version:2,request:String(request),audit,secondaryMotion:createVibeSecondaryMotionRig({parts}),tasks:Object.freeze(tasks),engine:Object.freeze({name:'Jaewoon Motion Engine',path:'assets/jaewoon-motion-engine.js',presentationOnly:true}),policy:Object.freeze({serverAI:false,eventDriven:true,checkpoint:true,mobileFirst:mobile,gameplayAuthoritative:true,noRuleMutation:true})})}
export function validateVibeMotionPatch({beforeFingerprint={},afterFingerprint={}}={}){const changed=[];for(const key of uniq([...Object.keys(beforeFingerprint),...Object.keys(afterFingerprint)]))if(JSON.stringify(beforeFingerprint[key]||[])!==JSON.stringify(afterFingerprint[key]||[]))changed.push(key);return Object.freeze({safe:changed.length===0,changed:Object.freeze(changed),reason:changed.length?'protected-game-rule-changed':'presentation-only'})}

function engineApi(engine){return engine||globalThis?.JaewoonMotionEngine||null}
export function createVibeMotionEngineBridge({engine=null,reducedMotion=false,lowPower=false,motionScale=1}={}){
  const api=engineApi(engine);
  if(!api?.createMotionRig||!api?.createCameraMotion)return Object.freeze({ready:false,reason:'jaewoon-motion-engine-missing',enginePath:'assets/jaewoon-motion-engine.js'});
  const rig=api.createMotionRig({reducedMotion,lowPower,motionScale});
  const camera=api.createCameraMotion({reducedMotion,lowPower});
  return {ready:true,enginePath:'assets/jaewoon-motion-engine.js',rig,camera,authority:'presentation-only',gameplayMutationAllowed:false,forbid:FORBID};
}

export function executeVibeMotionEngineEvent(event,bridge,{speed=0,facing=1,hitDirection=-1,bodyRegion='TORSO',turn=0,lodTier='NEAR'}={}){
  if(!bridge?.ready||!bridge.rig||!bridge.camera)return Object.freeze({accepted:false,reason:'motion-engine-bridge-not-ready'});
  const execution=createVibeMotionEffectExecution(event,{mobile:true,enemyCount:0});
  if(!execution.accepted)return execution;
  const type=String(event.eventType||'');
  const major=event.importance==='major'||type==='boss';
  bridge.rig.setMotionState({moving:type==='move',speed,facing,turn});
  if(typeof bridge.rig.setLod==='function')bridge.rig.setLod({tier:lodTier});
  if(type==='attack'||type==='skill')bridge.rig.triggerAttack({strength:major?1.5:1,duration:major ? .34 : .24,weightClass:event.weightClass||'STANDARD',contactAt:event.contactAt??.52,comboIndex:event.comboIndex||0});
  if(type==='hit'){bridge.rig.triggerHit({direction:hitDirection,strength:major?1.5:1,bodyRegion});if(typeof bridge.rig.triggerContact==='function'){const impact=createVibeImpactRecipe({kind:'hard',importance:event.importance||'normal',mobile:true,weightClass:event.weightClass||'STANDARD',critical:event.critical===true});bridge.rig.triggerContact({strength:major?1.5:1,hitStopMs:impact.limits.hitStopMs});}}
  if(type==='spawn'||type==='death')bridge.rig.triggerLand({strength:major?1.4:.8});
  if(type==='hit'||type==='attack'||type==='skill'||type==='boss')bridge.camera.impulse({x:(type==='hit'?hitDirection:facing)*(major?90:45),y:major?-45:-18,rotation:(major ? .7 : .25)*facing});
  return Object.freeze({accepted:true,eventType:type,authority:'presentation-only',gameplayMutationAllowed:false,forbid:FORBID,bridgeApplied:true});
}

if(typeof window!=='undefined'){
  window.createJaewoonVibeMotionProfile=createVibeMotionProfile;
  window.createJaewoonCommonSkillFxSource=createVibeCommonSkillFxSource;
  window.auditJaewoonVibeMotionEffects=auditVibeMotionEffects;
  window.createJaewoonVibeSecondaryMotionRig=createVibeSecondaryMotionRig;
  window.createJaewoonVibeImpactRecipe=createVibeImpactRecipe;
  window.createJaewoonVibeEffectBudget=createVibeEffectBudget;
  window.createJaewoonVibeMotionEffectExecution=createVibeMotionEffectExecution;
  window.executeJaewoonVibeMotionEffectEvent=executeVibeMotionEffectEvent;
  window.planJaewoonVibeMotionEffectsAutopilot=planVibeMotionEffectsAutopilot;
  window.validateJaewoonVibeMotionPatch=validateVibeMotionPatch;
  window.createJaewoonVibeMotionEngineBridge=createVibeMotionEngineBridge;
  window.executeJaewoonVibeMotionEngineEvent=executeVibeMotionEngineEvent;
}
