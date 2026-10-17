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
// 장르 중립 상용게임 임팩트 예산: 판정 직후 연출에만 사용하며 게임 값은 변경하지 않는다.
// 동일 이벤트·세기로 항상 동일 예산을 반환한다. 애니메이션과 파티클은 재사용 풀로 구현한다.
export function createVibePortableImpactCue({event='land',importance='normal',mobile=true,reducedMotion=false}={}){
  const aliases={jump:'jump',attack:'jump',land:'land',success:'land',reward:'land',
    miss:'miss',fail:'miss',damage:'miss',milestone:'milestone',level:'milestone',victory:'milestone',start:'start',spawn:'start'};
  const semantic=aliases[clean(event).toLowerCase()]||'land';
  const major=importance==='major'||semantic==='milestone';
  const palettes={jump:[0xcfeeff,0xffffff],land:[0x9efbd0,0xffdd82],miss:[0xff998d,0xffd9a3],milestone:[0xffdf76,0xe0fcff],start:[0xafddff,0xfff4c9]};
  const durationMs=reducedMotion?120:major?610:semantic==='miss'?380:310;
  const particles=reducedMotion?0:major?(mobile?12:18):(mobile?6:9);
  return Object.freeze({
    semantic,authority:'presentation-only',gameplayMutationAllowed:false,
    palette:Object.freeze(palettes[semantic].slice()),durationMs,particles,
    maxConcurrentEmitters:mobile?2:3,pooledGeometry:true,pooledMaterial:true,
    uiCue:semantic==='milestone'?'milestone':semantic==='miss'?'warning':'bounce',
    iconMotion:reducedMotion?'none':major?'sparkle':'float',
    cameraPulse:reducedMotion?0:major?.25:semantic==='miss'?.12:.075,
    worldPulse:!reducedMotion,protected:Object.freeze(['damage','reward','speed','timer','collision','save','progression'])
  });
}
// 장르와 실존 시스템을 교차 검증해 상용 UI 구성안을 만든다.
// 컨셉에만 있는 기능은 후보로 기록한다. 실제 인벤/거래 권한은 기존 게임 로직만 가진다.
const COMMERCIAL_UI_GENRES=Object.freeze({
  CASUAL:{theme:'PLAYFUL_CLAY',primary:'SCORE_AND_NEXT_ACTION',density:'LOW',accent:'#ffcf78',slots:['score','progress','pause','help']},
  RPG:{theme:'FANTASY_MATERIAL',primary:'CHARACTER_AND_QUEST',density:'MEDIUM',accent:'#b0dffb',slots:['health','quest','action','map']},
  SURVIVAL:{theme:'EXPEDITION',primary:'VITALS_AND_RESOURCE',density:'MEDIUM',accent:'#a7e4b8',slots:['health','resource','objective','map']},
  TYCOON:{theme:'SIMULATION_DASHBOARD',primary:'ECONOMY_AND_NEXT_UPGRADE',density:'MEDIUM',accent:'#d3bbff',slots:['currency','production','objective','build']},
  STRATEGY:{theme:'TACTICAL_CLARITY',primary:'WAVE_AND_PLACEMENT',density:'MEDIUM',accent:'#a8d0f9',slots:['wave','budget','placement','pause']},
  PUZZLE:{theme:'FOCUSED_DISCOVERY',primary:'CLUE_AND_PROGRESS',density:'LOW',accent:'#f1dba5',slots:['objective','hint','undo','pause']},
  HORROR:{theme:'QUIET_TENSION',primary:'THREAT_AND_SURVIVAL',density:'LOW',accent:'#d3c5bb',slots:['health','objective','inventory','pause']}
});
const COMMERCIAL_UI_SURFACES=Object.freeze({
  inventory:{system:'INVENTORY_EQUIPMENT',source:/\b(?:renderInventory|inventoryItems|inventorySlots|inventoryState|inventoryPanel|inventoryGrid)\b/i,layout:'GRID_WITH_SELECTED_ITEM_DETAILS',details:['capacity-used','rarity-and-stats','sort-filter-search','stack-count','compare-equip-use','disabled-reason','touch-inspect','save-owner']},
  equipment:{system:'INVENTORY_EQUIPMENT',source:/\b(?:equipItem|unequipItem|equipmentSlots|equippedItems)\b/i,layout:'CHARACTER_PAPERDOLL_WITH_COMPARED_SLOTS',details:['slot-compatibility','before-after-stats','equipment-owner','explicit-confirmation']},
  items:{system:'ITEM_LOOT',source:/\b(?:itemDatabase|itemCatalog|itemDefs|lootTable|itemRegistry)\b/i,layout:'SEMANTIC_ICON_AND_RARITY_DETAIL',details:['licensed-icon-or-local-vector','name-and-purpose','rarity-not-color-only','effect-and-source','quantity-and-description']},
  crafting:{system:'CRAFTING',source:/\b(?:craftItem|craftRecipe|craftingRecipes|canCraft)\b/i,layout:'RECIPE_COST_AND_RESULT_PREVIEW',details:['ingredient-owner','available-vs-needed','batch-preview','one-shot-confirm','disabled-reason']},
  merchant:{system:'ECONOMY_SHOP',source:/\b(?:buyItem|sellItem|purchaseItem|shopInventory|shopStock)\b/i,layout:'SHOP_BUY_SELL_WITH_TOTAL_PREVIEW',details:['price-and-owned-currency','stock-and-quantity','total-and-affordability','compare-item','undo-before-confirm','authority-owned-transaction']},
  trade:{system:'TRADE_TRANSACTION',source:/\b(?:confirmTrade|commitTrade|transferItem|tradeSession|tradeOffer)\b/i,layout:'TWO_SIDED_TRADE_OFFER_AND_CONFIRM',details:['two-party-offers','quantity-and-currency','availability-check','totals-and-fees','offer-change-revokes-ready','cancel-before-commit','single-idempotent-commit','server-authority-if-multiplayer','no-shadow-wallet-or-inventory']},
  quests:{system:'QUEST_DIALOGUE',source:/\b(?:questLog|questJournal|activeQuests|questProgress|updateQuest)\b/i,layout:'ACTIVE_GOAL_AND_TRACKER_WITH_JOURNAL',details:['one-active-objective','progress-from-owner','map-or-target-pointer','reward-preview','readable-completion-reason']},
  building:{system:'HOUSING_BUILDING',source:/\b(?:placeBuilding|buildStructure|placementPreview|buildingCatalog|buildMenu)\b/i,layout:'BUILD_CATEGORY_COST_AND_WORLD_PREVIEW',details:['rotation-placement-ghost','validity-tint-and-reason','source-cost','cancel-without-loss','touch-friendly-confirm']},
  upgrades:{system:'UPGRADE_BRANCH',source:/\b(?:upgradeBuilding|purchaseUpgrade|upgradeTree|upgradeOptions|upgradeLevel)\b/i,layout:'BEFORE_AFTER_UPGRADE_BRANCH',details:['cost-and-bottleneck','visible-difference','prerequisites','confirm-once','no-currency-shadow']},
  skills:{system:'SKILL_BUILD',source:/\b(?:skillTree|learnSkill|skillBar|skillSlots|castSkill)\b/i,layout:'HOTBAR_AND_SKILL_DETAILS',details:['cooldown-from-owner','input-targets','level-prerequisite','failure-reason','reduced-motion-effects']}
});
const freezeRow=row=>Object.freeze(row);
export function createVibeCommercialInterfaceBlueprint({genre='',systems=[],source='',platform='WEB',mobile=true,locale='ko-KR'}={}){
  const raw=clean(genre).toUpperCase(),key=/HORROR|공포/.test(raw)?'HORROR':/SURVIV|ROGUE|생존/.test(raw)?'SURVIVAL':/TYCOON|SIMULAT|경영|타이쿤/.test(raw)?'TYCOON':/DEFEN|STRATEG|TACTIC|전략|디펜스/.test(raw)?'STRATEGY':/RPG|ADVENTUR|모험|역할/.test(raw)?'RPG':/PUZZLE|퍼즐/.test(raw)?'PUZZLE':'CASUAL';
  const profile=COMMERCIAL_UI_GENRES[key];
  const declared=new Set((Array.isArray(systems)?systems:[]).map(s=>clean(typeof s==='string'?s:s?.id||s?.name).toUpperCase()));
  const sourceText=String(source||'');
  const surfaces=Object.entries(COMMERCIAL_UI_SURFACES).map(([id,definition])=>{
    const declaredOwner=declared.has(definition.system)||(id==='trade'&&['PLAYER_TRADE','NPC_TRADE','TRADE_TRANSACTION'].some(s=>declared.has(s)));
    const sourceBindingPresent=definition.source.test(sourceText);
    return freezeRow({id,system:definition.system,layout:definition.layout,
      state:declaredOwner?(sourceBindingPresent?'SOURCE_BINDING_FOUND_RUNTIME_UNVERIFIED':'OWNER_IMPLEMENTATION_REQUIRED'):'NOT_REQUESTED_OR_NOT_AUTHORIZED',
      visibleCandidate:declaredOwner&&sourceBindingPresent,
      dataOwner:'EXISTING_GAME_SYSTEM_ONLY',details:Object.freeze([...definition.details]),
      reason:declaredOwner&&!sourceBindingPresent?'CANONICAL_SYSTEM_WITHOUT_SOURCE_BINDING':!declaredOwner?'NO_DECLARED_CAPABILITY':null});
  });
  const active=surfaces.filter(x=>x.visibleCandidate).map(x=>x.id);
  return Object.freeze({
    version:1,authority:'PRESENTATION_DESIGN_ONLY',neverMutateGameplayState:true,
    genre:key,platform:clean(platform).toUpperCase()||'WEB',theme:profile.theme,accent:profile.accent,
    visualHierarchy:profile.primary,density:profile.density,hudSlots:Object.freeze([...profile.slots]),
    surfaces:Object.freeze(surfaces),activeSurfaceIds:Object.freeze(active),
    navigation:freezeRow({phone:'THUMB_REACH_PRIMARY_ACTIONS_WITH_ONE_COLLAPSIBLE_SHEET',desktop:'REUSABLE_DOCK_WITH_CONTEXTUAL_SIDE_PANEL',gameplayCanvasAlwaysVisible:true,
      backClosesTopmostPanelFirst:true,focusReturnsToInvoker:true,modalTrapsFocus:true,doNotOccludeCriticalWorldActions:true}),
    typography:freezeRow({locale:clean(locale)||'ko-KR',fontStack:'system-ui,-apple-system,"Noto Sans KR","Malgun Gothic",sans-serif',
      noRemoteFontDependency:true,bodyMinPx:14,primaryActionMinPx:16,tabularNumbers:true,maxTextLinesBeforeCollapse:3,
      semanticHeadings:true,readableContrastTarget:'WCAG_AA_WHEN_FEASIBLE'}),
    touch:freezeRow({minimumTargetPx:48,spacingPx:8,safeAreas:true,portraitAndLandscape:true,
      multiInput:['touch','mouse','keyboard','gamepad-when-supported'],dragRequiresTapAlternative:true,
      noHoverOnlyTooltip:true,noAccidentalDoubleSubmit:true}),
    visualSystem:freezeRow({icon: 'LICENSED_LOCAL_ASSET_OR_COHERENT_VECTOR_WITH_TEXT_LABEL',
      hierarchy:['PRIMARY_ACTION','IMMEDIATE_GAME_STATE','CONTEXT_PANEL','SECONDARY_DETAIL'],
      motions:['IDLE_FLOAT','VALID_ACTION_PRESS','ACQUIRED_ITEM_FLY_TO_OWNER_SLOT','SUCCESS_FEEDBACK','ERROR_REASON'],
      animationAuthority:'PRESENTATION_ONLY',reducedMotionAlternative:'STATIC_FOCUS_AND_TEXT',
      mobileParticlesMax:12,worldGpuResourcesReusable:true,noAlwaysOnBlurOverGameplay:true,
      localAssetReuseFirst:true,noDuplicateDownloadedAssets:true}),
    functionalContracts:freezeRow({sourceOwnerStateIsAuthority:true,noFakeItemTradeOrUpgradeButtons:true,
      transactionConfirmOnlyAfterOwnerValidation:true,duplicateCommitPreventionRequired:true,
      accessibilityAndSaveReloadRegression:true,displayMissingCapabilitiesAsDesignTasksNotActivePanels:true}),
    integration:freezeRow({implementation:'MODIFY_EXISTING_RESPONSIBLE_UI_CODE_NOT_NEW_GLOBAL_OVERLAY',
      requiredEvidence:['REAL_INPUT_TO_OWNER_STATE','MOBILE_PORTRAIT_LANDSCAPE','KEYBOARD_FOCUS_AND_CLOSE','ITEM_OR_TRADE_VALIDATION_IF_PRESENT','SAVE_RELOAD','LOCAL_ASSETS_AND_FONTS','NO_FATAL_BROWSER_ERRORS'],
      verified:false})
  });
}
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
export function planVibePresentationAutopilot({files=[],events=[],request='',changeRequest=null,genre='',systems=[],platform='WEB'}={}){
  const audit=auditVibePresentation(files);
  const designSystem=createVibeDesignSystem(files);
  const timeline=buildVibePresentationTimeline(events);
  const highEnd=createVibeHighEndPresentationStack({request});
  const commercialUI=createVibeCommercialInterfaceBlueprint({genre,systems,source:textOf(files),platform});
  const cinematicDirection=highEnd.cinematicDirection;
  const tasks=[];
  for(const area of audit.priority)tasks.push(Object.freeze({domain:'presentation',target:area,action:`improve-${area}`,risk:['camera','transition'].includes(area)?'medium':'low'}));
  tasks.push(Object.freeze({domain:'presentation',target:'cinematic-direction',action:'align-scene-intent-acting-motion-vfx-camera-lighting-audio',risk:'medium'}));
  if(timeline.length)tasks.push(Object.freeze({domain:'presentation',target:'event-timeline',action:'wire-cinematic-beats',risk:'medium'}));
  return Object.freeze({
    version:3,
    request:String(request),
    qualityProfile:'HIGH_END_COMMERCIAL_NATIVE_PRESENTATION',
    audit,designSystem,timeline,highEnd,cinematicDirection,commercialUI,
    changeRequest:changeRequest||null,
    tasks:Object.freeze(tasks.slice(0,10)),
    policy:Object.freeze({serverAI:false,checkpoint:true,checkpointIsTerminal:false,continuousEvolution:true,highEndCompletionIsReleaseGate:false,mobileFirst:true,gameplayAuthoritative:true,noRuleMutation:true,lightingIsPresentationOnly:true,signatureEventPresentationRequired:true,artDirectionCohesionRequired:true,latestOwnerIntentWinsSameScope:true,directResponsibleSystemEditPreferred:true,wrapperOrShadowAccumulationForbidden:true})
  });
}
export function scoreVibeScreenComposition({primaryActions=1,overlaps=0,edgeClips=0,unreadableLabels=0,criticalHudVisible=true,touchTargetsSmall=0}={}){let score=100;score-=Math.max(0,primaryActions-1)*8;score-=overlaps*15;score-=edgeClips*18;score-=unreadableLabels*10;score-=touchTargetsSmall*8;if(!criticalHudVisible)score-=30;score=clamp(score);return Object.freeze({score,grade:score>=90?'A':score>=75?'B':score>=60?'C':'D',issues:Object.freeze([overlaps&&'overlap',edgeClips&&'edge-clip',unreadableLabels&&'readability',touchTargetsSmall&&'touch-target',!criticalHudVisible&&'critical-hud-hidden'].filter(Boolean))})}
if(typeof window!=='undefined'){window.auditJaewoonVibePresentation=auditVibePresentation;window.createJaewoonVibeDesignSystem=createVibeDesignSystem;window.createJaewoonVibeCinematicDirection=createVibeCinematicDirection;window.createJaewoonVibeCinematicBeat=createVibeCinematicBeat;window.createJaewoonVibePresentationEvent=createVibePresentationEvent;window.compileJaewoonVibePresentationEvents=compileVibePresentationEvents;window.createJaewoonVibeAudioUIExecution=createVibeAudioUIExecution;window.executeJaewoonVibeAudioUIEvent=executeVibeAudioUIEvent;window.routeJaewoonVibePresentationEvent=routeVibePresentationEvent;window.buildJaewoonVibePresentationTimeline=buildVibePresentationTimeline;window.createJaewoonVibeHighEndPresentationStack=createVibeHighEndPresentationStack;window.planJaewoonVibePresentationAutopilot=planVibePresentationAutopilot;window.scoreJaewoonVibeScreenComposition=scoreVibeScreenComposition}
