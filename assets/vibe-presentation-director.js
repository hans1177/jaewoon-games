// 파일명: assets/vibe-presentation-director.js
// 역할: 게임 디자인/UI/카메라/VFX/전환/보스 연출을 자동 진단하고 고도화 계획 생성
// 원칙: 연출은 정보전달과 게임 판정을 보조하며 HP/데미지/보상/쿨타임/저장 규칙을 변경하지 않음

const uniq=a=>[...new Set((a||[]).filter(Boolean))];
const clamp=n=>Math.max(0,Math.min(100,Math.round(n)));
const textOf=files=>files.map(x=>`${x.path||''}\n${x.source??x.current??''}`).join('\n');
const clean=v=>String(v??'').trim();
const stablePresentationHash=value=>{let h=2166136261;for(const ch of String(value)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return(h>>>0).toString(36)};
const DIMENSIONS=Object.freeze({hierarchy:['hud','panel','label','title','font','z-index','z_index'],spacing:['gap','padding','margin','container','anchor','offset'],contrast:['color','outline','stroke','shadow','modulate'],feedback:['hit','flash','shake','particle','damage','critical'],camera:['camera','shake','zoom','follow','position_smoothing'],transition:['transition','fade','tween','scene','loading'],atmosphere:['background','parallax','fog','light','shadow','weather','ambient'],boss:['boss','phase','warning','telegraph','entrance']});
const PRESENTATION_CHANNELS=Object.freeze({spawn:Object.freeze(['animation','vfx','audio','lighting']),attack:Object.freeze(['animation','vfx','audio']),hit:Object.freeze(['animation','vfx','audio','camera','ui']),skill:Object.freeze(['animation','vfx','audio','camera','ui','lighting']),boss:Object.freeze(['animation','vfx','audio','camera','ui','lighting']),death:Object.freeze(['animation','vfx','audio','ui','lighting']),wave:Object.freeze(['audio','camera','ui','lighting']),victory:Object.freeze(['animation','vfx','audio','camera','ui','lighting'])});
const PRESENTATION_ONLY_KEYS=Object.freeze(['animation','vfx','audio','camera','ui','lighting']);
const AUDIO_CUES=Object.freeze({spawn:'spawn-accent',attack:'attack-accent',hit:'impact-accent',skill:'skill-accent',boss:'boss-accent',death:'death-accent',wave:'wave-accent',victory:'victory-accent'});
const UI_CUES=Object.freeze({hit:'combat-feedback',skill:'skill-feedback',boss:'boss-focus',death:'defeat-feedback',wave:'wave-status',victory:'victory-status'});
const CINEMATIC_SCENE_INTENT=Object.freeze(['EMOTIONAL_INTENT','RISK_OR_TENSION','PLAYER_FOCUS_TARGET','WORLD_CONTEXT','GAMEPLAY_READABILITY']);
const CINEMATIC_MOTION_LAYERS=Object.freeze(['PRIMARY_MOTION','SECONDARY_MOTION','PROCEDURAL_RESPONSE']);
const VFX_INTENSITY_HIERARCHY=Object.freeze(['AMBIENT','NORMAL','HEAVY','CRITICAL_OR_SIGNATURE','BOSS_OR_ULTIMATE']);
const ADAPTIVE_AUDIO_STATES=Object.freeze(['EXPLORATION','DISCOVERY_OR_TENSION','COMBAT','DANGER','BOSS','VICTORY','REST_OR_HUB','SPECIAL_EVENT']);

export function auditVibePresentation(files=[]){const text=textOf(files).toLowerCase(),dimensions=[];for(const[name,hints]of Object.entries(DIMENSIONS)){const hits=hints.filter(x=>text.includes(x)).length,score=clamp(hits/hints.length*100);dimensions.push(Object.freeze({name,score,debt:100-score,priority:score<30?'critical':score<55?'high':score<75?'medium':'low'}))}dimensions.sort((a,b)=>b.debt-a.debt);const overall=clamp(dimensions.reduce((n,x)=>n+x.score,0)/(dimensions.length||1));return Object.freeze({score:overall,grade:overall>=85?'A':overall>=70?'B':overall>=50?'C':'D',dimensions:Object.freeze(dimensions),priority:Object.freeze(dimensions.slice(0,4).map(x=>x.name))})}
export function createVibeDesignSystem(files=[]){const text=textOf(files),rounded=/border-radius|corner_radius/i.test(text),shadow=/box-shadow|shadow_/i.test(text),outline=/outline|stroke|border/i.test(text),largeTouch=/44px|48px|custom_minimum_size/i.test(text);return Object.freeze({version:1,principles:Object.freeze(['gameplay-first-hierarchy','one-primary-action','consistent-spacing','state-visible-at-glance','touch-first','safe-area-aware']),tokens:Object.freeze({radius:rounded?'existing':'12px-baseline',shadow:shadow?'existing':'subtle-depth',outline:outline?'existing':'readability-outline',touchTarget:largeTouch?'existing':'44px-minimum'}),protected:Object.freeze(['gameplay-layout-function','input-binding','game-rule-values','save-structure'])})}
export function createVibeCinematicDirection({request=''}={}){
  return Object.freeze({
    version:1,
    target:'PROFESSIONAL_CINEMATIC_REALTIME_GAME_DIRECTION',
    request:clean(request),
    rawFidelityAloneInsufficient:true,
    sceneIntent:CINEMATIC_SCENE_INTENT,
    characterAndCreatureActing:Object.freeze(['POSTURE_AND_WEIGHT','GAZE_AND_TARGET_FOCUS','ANTICIPATION','CONTACT_AND_IMPACT','RECOVERY','DIRECTIONAL_HIT_REACTION','ROLE_OR_SPECIES_SPECIFIC_DEATH']),
    motionLayers:CINEMATIC_MOTION_LAYERS,
    motionQuality:Object.freeze(['ACCELERATION_DECELERATION','TURN_INTERPOLATION','STATE_BLEND','WEIGHT_TRANSFER','GROUND_OR_SLOPE_RESPONSE_WHEN_SUPPORTED','NON_MECHANICAL_IDLE_VARIATION']),
    environmentalStorytelling:Object.freeze(['FOREGROUND_MIDGROUND_BACKGROUND','LANDMARK_FOCUS','WEAR_DAMAGE_MOISTURE_DUST_SCORCH_AND_AGE','LIVED_IN_OR_ABANDONED_TRACES','REGION_ECOLOGY_AND_DANGER_GRADIENT','AMBIENT_WORLD_MOTION']),
    materialStorytelling:true,
    vfx:Object.freeze({gameSpecificLanguage:true,intensityHierarchy:VFX_INTENSITY_HIERARCHY,gameplayReadabilityFirst:true}),
    camera:Object.freeze({shotLanguage:true,focusHierarchy:true,mobileReadability:true,telegraphOcclusionForbidden:true}),
    audio:Object.freeze({authoringOwner:'audio',conceptFit:true,stateAdaptive:true,states:ADAPTIVE_AUDIO_STATES,independentAudioAuthority:false}),
    protected:Object.freeze(['damage','cooldown','reward','spawn-rule','save','progression','economy','hit-semantics'])
  });
}
export function createVibeCinematicBeat(event,{importance='normal'}={}){const beats={spawn:['anticipation','entrance','settle'],attack:['anticipation','action','impact','recovery'],hit:['impact','micro-freeze','recoil','readability-reset'],skill:['telegraph','charge','release','impact','recovery'],boss:['silence-or-focus','entrance','identity-shot','control-return'],death:['impact','collapse','reward-readability'],wave:['announce','breathing-room','spawn-focus'],victory:['resolve','celebration','result-focus']};const base=beats[event]||['focus','feedback','resolve'];return Object.freeze({event,importance,beats:Object.freeze(base),limits:Object.freeze({cameraShake:importance==='major'?'medium':'subtle',freezeMs:event==='hit'?50:0,inputBlock:event==='boss'?'brief-only':'none'}),forbid:Object.freeze(['damage-change','cooldown-change','reward-change','spawn-rule-change'])})}
export function createVibePresentationEvent(event,{sourceId='',targetId='',causeId='',timestamp=0,sequence=0,importance='normal',payload={}}={}){const eventType=clean(event),safePayload={};for(const key of PRESENTATION_ONLY_KEYS)if(payload&&Object.prototype.hasOwnProperty.call(payload,key))safePayload[key]=payload[key];const seed=[eventType,sourceId,targetId,causeId,timestamp,sequence].map(clean).join('|'),channels=PRESENTATION_CHANNELS[eventType]||Object.freeze(['animation','vfx','audio','ui']);return Object.freeze({version:1,presentationEventId:`pres_${stablePresentationHash(seed)}`,eventType,sourceId:clean(sourceId),targetId:clean(targetId),causeId:clean(causeId),timestamp:Number(timestamp)||0,sequence:Number(sequence)||0,importance,channels:Object.freeze([...channels]),payload:Object.freeze(safePayload),authority:'presentation-only',gameplayMutationAllowed:false})}
export function compileVibePresentationEvents(events=[]){const compiled=(events||[]).map((event,index)=>{const e=typeof event==='string'?{event}:event||{};return createVibePresentationEvent(e.eventType||e.event,{sourceId:e.sourceId,targetId:e.targetId,causeId:e.causeId,timestamp:e.timestamp,sequence:e.sequence??index,importance:e.importance||((e.eventType||e.event)==='boss'||(e.eventType||e.event)==='victory'?'major':'normal'),payload:e.payload})}).sort((a,b)=>a.timestamp-b.timestamp||a.sequence-b.sequence||a.presentationEventId.localeCompare(b.presentationEventId));return Object.freeze(compiled)}
export function createVibeAudioUIExecution(event,{muted=false,reducedMotion=false}={}){if(!event||event.authority!=='presentation-only'||event.gameplayMutationAllowed!==false)return Object.freeze({accepted:false,reason:'presentation-authority-required'});const channels=new Set(event.channels||[]),commands=[];if(channels.has('audio')&&!muted)commands.push(Object.freeze({channel:'audio',action:'play-semantic-cue',cue:clean(event.payload?.audio)||AUDIO_CUES[event.eventType]||'generic-accent',importance:event.importance||'normal'}));if(channels.has('ui'))commands.push(Object.freeze({channel:'ui',action:'show-semantic-feedback',cue:clean(event.payload?.ui)||UI_CUES[event.eventType]||'status-feedback',targetId:event.targetId,importance:event.importance||'normal',reducedMotion:Boolean(reducedMotion)}));return Object.freeze({accepted:true,eventId:event.presentationEventId,causeId:event.causeId,eventType:event.eventType,commands:Object.freeze(commands),authority:'presentation-only',gameplayMutationAllowed:false})}
export function executeVibeAudioUIEvent(event,handlers={},options={}){const execution=createVibeAudioUIExecution(event,options);if(!execution.accepted)return execution;const results=[];for(const command of execution.commands){const handler=handlers[command.channel];if(typeof handler==='function')results.push(Object.freeze({channel:command.channel,result:handler(command,event)}))}return Object.freeze({...execution,handled:results.length>0,results:Object.freeze(results)})}
export function routeVibePresentationEvent(event,handlers={}){if(!event||event.authority!=='presentation-only'||event.gameplayMutationAllowed!==false)return Object.freeze({handled:false,reason:'invalid-presentation-event',results:Object.freeze([])});const results=[];for(const channel of event.channels||[]){const handler=handlers[channel];if(typeof handler!=='function')continue;results.push(Object.freeze({channel,result:handler(event)}))}return Object.freeze({handled:results.length>0,eventId:event.presentationEventId,results:Object.freeze(results)})}
export function buildVibePresentationTimeline(events=[]){const order=['spawn','wave','attack','hit','skill','boss','death','victory'],present=uniq(events),timeline=order.filter(x=>present.includes(x)).map(x=>createVibeCinematicBeat(x,{importance:x==='boss'||x==='victory'?'major':'normal'}));return Object.freeze(timeline)}
export function createVibeHighEndPresentationStack({request=''}={}){return Object.freeze({
  version:2,
  target:'HIGH_END_COMMERCIAL_NATIVE_PRESENTATION',
  channels:Object.freeze(['ANIMATION','VFX','AUDIO','CAMERA','UI_FEEDBACK','LIGHTING']),
  signatureEvents:Object.freeze(['boss','skill','victory']),
  cinematicDirection:createVibeCinematicDirection({request}),
  continuousEvolution:Object.freeze({enabled:true,graphicsPassIsCheckpointNotTerminal:true,continuesAfterInternalRelease:true,continuesAfterPublicRelease:true,highEndCompletionIsReleaseGate:false}),
  rules:Object.freeze(['presentation-follows-authoritative-gameplay-events','signature-events-use-dedicated-presentation','scene-intent-precedes-decoration','character-and-creature-acting-is-part-of-visual-quality','primary-secondary-procedural-motion-layers-compose-together','game-specific-vfx-language-and-intensity-hierarchy','lighting-supports-region-risk-and-event-readability','camera-never-hides-required-telegraph','audio-vfx-camera-lighting-share-one-art-direction','audio-selection-follows-game-concept-and-runtime-state','mobile-readability-and-reduced-motion-preserved','presentation-checkpoint-never-means-terminal-completion']),
  protected:Object.freeze(['damage','cooldown','reward','spawn-rule','save','progression','economy','hit-semantics'])
})}
export function planVibePresentationAutopilot({files=[],events=[],request='',changeRequest=null}={}){
  const audit=auditVibePresentation(files);
  const designSystem=createVibeDesignSystem(files);
  const timeline=buildVibePresentationTimeline(events);
  const highEnd=createVibeHighEndPresentationStack({request});
  const cinematicDirection=highEnd.cinematicDirection;
  const tasks=[];
  for(const area of audit.priority)tasks.push(Object.freeze({domain:'presentation',target:area,action:`improve-${area}`,risk:['camera','transition'].includes(area)?'medium':'low'}));
  tasks.push(Object.freeze({domain:'presentation',target:'cinematic-direction',action:'align-scene-intent-acting-motion-vfx-camera-lighting-audio',risk:'medium'}));
  if(timeline.length)tasks.push(Object.freeze({domain:'presentation',target:'event-timeline',action:'wire-cinematic-beats',risk:'medium'}));
  return Object.freeze({
    version:3,
    request:String(request),
    qualityProfile:'HIGH_END_COMMERCIAL_NATIVE_PRESENTATION',
    audit,designSystem,timeline,highEnd,cinematicDirection,
    changeRequest:changeRequest||null,
    tasks:Object.freeze(tasks.slice(0,10)),
    policy:Object.freeze({serverAI:false,checkpoint:true,checkpointIsTerminal:false,continuousEvolution:true,highEndCompletionIsReleaseGate:false,mobileFirst:true,gameplayAuthoritative:true,noRuleMutation:true,lightingIsPresentationOnly:true,signatureEventPresentationRequired:true,artDirectionCohesionRequired:true,latestOwnerIntentWinsSameScope:true,directResponsibleSystemEditPreferred:true,wrapperOrShadowAccumulationForbidden:true})
  });
}
export function scoreVibeScreenComposition({primaryActions=1,overlaps=0,edgeClips=0,unreadableLabels=0,criticalHudVisible=true,touchTargetsSmall=0}={}){let score=100;score-=Math.max(0,primaryActions-1)*8;score-=overlaps*15;score-=edgeClips*18;score-=unreadableLabels*10;score-=touchTargetsSmall*8;if(!criticalHudVisible)score-=30;score=clamp(score);return Object.freeze({score,grade:score>=90?'A':score>=75?'B':score>=60?'C':'D',issues:Object.freeze([overlaps&&'overlap',edgeClips&&'edge-clip',unreadableLabels&&'readability',touchTargetsSmall&&'touch-target',!criticalHudVisible&&'critical-hud-hidden'].filter(Boolean))})}
if(typeof window!=='undefined'){window.auditJaewoonVibePresentation=auditVibePresentation;window.createJaewoonVibeDesignSystem=createVibeDesignSystem;window.createJaewoonVibeCinematicDirection=createVibeCinematicDirection;window.createJaewoonVibeCinematicBeat=createVibeCinematicBeat;window.createJaewoonVibePresentationEvent=createVibePresentationEvent;window.compileJaewoonVibePresentationEvents=compileVibePresentationEvents;window.createJaewoonVibeAudioUIExecution=createVibeAudioUIExecution;window.executeJaewoonVibeAudioUIEvent=executeVibeAudioUIEvent;window.routeJaewoonVibePresentationEvent=routeVibePresentationEvent;window.buildJaewoonVibePresentationTimeline=buildVibePresentationTimeline;window.createJaewoonVibeHighEndPresentationStack=createVibeHighEndPresentationStack;window.planJaewoonVibePresentationAutopilot=planVibePresentationAutopilot;window.scoreJaewoonVibeScreenComposition=scoreVibeScreenComposition}
