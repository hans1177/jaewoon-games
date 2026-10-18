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

// Executable, engine-neutral presentation recipes. Coordinates are viewport pixels;
// renderers own placement, animation and input. No gameplay/save/network authority.
export const VIBE_VISUAL_SURFACES=Object.freeze([
  'HUD','INVENTORY','EQUIPMENT','CRAFT','SHOP','QUEST','MAP','CODEX','DIALOGUE',
  'TOOLTIP','HELP','BOSS','COMBAT','BUILD','RESULT','SETTINGS','PARTY','NOTIFICATION'
]);
export const VIBE_PRESENTATION_EFFECT_PATTERNS=Object.freeze([
  'DAMAGE_POPUP_POOL','FLOATING_HEAL','WORLD_SPACE_LABEL','OFFSCREEN_INDICATOR',
  'TOOLTIP_PLACEMENT','SAFE_AREA_LAYOUT','CONTEXTUAL_HUD','ICON_STATE_MOTION',
  'ICON_ATLAS_ANIMATION','NOTIFICATION_STACK','STATUS_DURATION_TRACK',
  'ITEM_RARITY_FRAME','EQUIPMENT_COMPARE_DELTA','CRAFT_PROGRESS','QUEST_PROGRESS',
  'BOSS_PHASE_TRANSITION','TELEGRAPH_PRIORITY','3D_ITEM_PREVIEW',
  'NINE_SLICE_SURFACE','MATERIAL_HARMONIZATION','UI_TRANSITION_STATE',
  'VISUAL_EFFECT_BUDGET','FOCAL_REGION_OCCLUSION','MULTIPLAYER_PING'
]);
const PRESENTATION_SURFACE_GRAMMAR=Object.freeze({
  HUD:Object.freeze({layout:'EDGE_BANDS',focalOcclusionForbidden:true}),
  INVENTORY:Object.freeze({layout:'ASYMMETRIC_DETAIL',focalOcclusionForbidden:false}),
  EQUIPMENT:Object.freeze({layout:'CHARACTER_FOCAL',focalOcclusionForbidden:false}),
  CRAFT:Object.freeze({layout:'RECIPE_GRAPH',focalOcclusionForbidden:false}),
  SHOP:Object.freeze({layout:'CATALOG_DETAIL',focalOcclusionForbidden:false}),
  QUEST:Object.freeze({layout:'JOURNAL_TIMELINE',focalOcclusionForbidden:false}),
  MAP:Object.freeze({layout:'MAP_FOCAL',focalOcclusionForbidden:false}),
  CODEX:Object.freeze({layout:'COLLECTION_ATLAS',focalOcclusionForbidden:false}),
  DIALOGUE:Object.freeze({layout:'CHARACTER_RESPONSE',focalOcclusionForbidden:true}),
  TOOLTIP:Object.freeze({layout:'ANCHOR_FOLLOW',focalOcclusionForbidden:true}),
  HELP:Object.freeze({layout:'ANCHOR_FOLLOW',focalOcclusionForbidden:true}),
  BOSS:Object.freeze({layout:'TOP_BOSS_FOCUS',focalOcclusionForbidden:true}),
  COMBAT:Object.freeze({layout:'EDGE_BANDS',focalOcclusionForbidden:true}),
  BUILD:Object.freeze({layout:'SIDE_WORKBENCH',focalOcclusionForbidden:true}),
  RESULT:Object.freeze({layout:'REWARD_REVEAL',focalOcclusionForbidden:false}),
  SETTINGS:Object.freeze({layout:'CATEGORY_DETAIL',focalOcclusionForbidden:false}),
  PARTY:Object.freeze({layout:'SIDE_ROSTER',focalOcclusionForbidden:true}),
  NOTIFICATION:Object.freeze({layout:'EDGE_STACK',focalOcclusionForbidden:true})
});
const VISUAL_MATERIAL_CUES=Object.freeze({
  leather:'STITCHED_EDGE',wood:'CARVED_JOINERY',metal:'RIVETED_INSET',
  stone:'CHISELED_EDGE',paper:'FOLDED_CORNER',glass:'TRANSLUCENT_EDGE',
  crystal:'FACET_HIGHLIGHT',fabric:'SEAMED_PANEL',plastic:'MOLDED_SURFACE',
  moss:'ORGANIC_GROWTH',hologram:'SCANLINE_RIM',steel:'MECHANICAL_JOINT'
});
const finite=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
const between=(value,min,max)=>Math.max(min,Math.min(max,value));
function overlapArea(a,b){
  return Math.max(0,Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x))
    *Math.max(0,Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y));
}
function presentationRect(row){
  if(!row||typeof row!=='object')return null;
  const x=finite(row.x,NaN),y=finite(row.y,NaN),width=finite(row.width,NaN),height=finite(row.height,NaN);
  return [x,y,width,height].every(Number.isFinite)&&width>0&&height>0?{x,y,width,height}:null;
}
export function createVibeVisualMaterialRecipe({game={},world={},surface='HUD'}={}){
  const materials=uniq([...(world.materials||[]),...(game.materials||[])].map(x=>clean(x).toLowerCase())).slice(0,6);
  const cues=materials.map(key=>({material:key,construction:VISUAL_MATERIAL_CUES[key]||'SOURCE_TEXTURE_INSPECTION_REQUIRED'}));
  const identity=clean(game.visualIdentity||game.identity||game.name||world.theme||game.genre||'');
  return Object.freeze({
    version:1,surface:String(surface).toUpperCase(),identity:identity||null,
    materialCues:Object.freeze(cues.map(row=>Object.freeze(row))),
    layers:Object.freeze(['STRUCTURAL_FRAME','MAIN_SURFACE','CONTENT_PLANE','FOCAL_DETAIL','FEEDBACK_LAYER']),
    textureAssetIds:Object.freeze([]),assetIdsNotInvented:true,
    nineSliceAllowed:true,originalAssetsImmutable:true,
    constraints:Object.freeze(['VISIBLE_ASSET_REQUIRED_FOR_TEXTURE','PROVENANCE_LICENSE_VERIFIED',
      'NO_GENERIC_FRAME_FORCED_ON_GAME','PRESERVE_INPUT_AND_GAMEPLAY_AUTHORITY']),
    authority:'VISUAL_CONSTRUCTION_RECIPE_ONLY'
  });
}
function visualCandidateAnchors(rect,bounds,zone,desired){
  const h=desired.height,w=desired.width;
  const maxX=Math.max(0,rect.width-w),maxY=Math.max(0,rect.height-h);
  const anchors=[[0,0],[maxX,0],[0,maxY],[maxX,maxY],[maxX/2,maxY/2],
    [maxX/2,0],[maxX/2,maxY],[0,maxY/2],[maxX,maxY/2]];
  // Pack narrow cards and HUD labels beyond nine generic presets.
  // Bound the search work so production planning stays mobile-friendly.
  const stepX=Math.max(1,w+8),stepY=Math.max(1,h+6);
  for(let y=0;y<=maxY&&anchors.length<160;y+=stepY){
    for(let x=0;x<=maxX&&anchors.length<160;x+=stepX)anchors.push([x,y]);
    anchors.push([maxX,y]);
  }
  const seen=new Set();
  return anchors.map(([rx,ry])=>({
    x:between(rect.x+rx,bounds.x,bounds.x+bounds.width-w),
    y:between(rect.y+ry,bounds.y,bounds.y+bounds.height-h),width:w,height:h
  })).filter(v=>{const k=v.x.toFixed(2)+':'+v.y.toFixed(2);if(seen.has(k))return false;seen.add(k);return true;});
}
// Use a deterministic constrained placement instead of static genre templates.
export function optimizeVibeScreenLayout({
  viewport={width:393,height:852},safeInsets={},components=[],occupiedRects=[],
  focalRegion=null,iterations=2
}={}){
  const width=finite(viewport.width),height=finite(viewport.height);
  if(width<=0||height<=0)return Object.freeze({pass:false,reason:'INVALID_VIEWPORT',placements:Object.freeze([])});
  const insets={left:between(finite(safeInsets.left),0,width/3),right:between(finite(safeInsets.right),0,width/3),
    top:between(finite(safeInsets.top),0,height/3),bottom:between(finite(safeInsets.bottom),0,height/3)};
  const bounds={x:insets.left,y:insets.top,width:width-insets.left-insets.right,height:height-insets.top-insets.bottom};
  const focal=presentationRect(focalRegion);
  const protectedRects=(occupiedRects||[]).map(presentationRect).filter(Boolean);
  const ordered=(components||[]).filter(x=>clean(x?.id)).map((row,index)=>({...row,_index:index}))
    .sort((a,b)=>finite(b.priority,1)-finite(a.priority,1)||a._index-b._index);
  const placements=[],failures=[];
  for(const element of ordered){
    const w=between(finite(element.width,160),Math.min(32,bounds.width),bounds.width);
    const h=between(finite(element.height,48),Math.min(28,bounds.height),bounds.height);
    const candidates=visualCandidateAnchors(bounds,bounds,element.zone,{width:w,height:h});
    if(presentationRect(element.preferredRect))candidates.unshift({
      x:between(element.preferredRect.x,bounds.x,bounds.x+bounds.width-w),
      y:between(element.preferredRect.y,bounds.y,bounds.y+bounds.height-h),width:w,height:h
    });
    let best=null;
    for(const rect of candidates){
      const overlap=[...protectedRects,...placements].reduce((sum,other)=>sum+overlapArea(rect,other),0);
      const focalOverlap=focal&&element.allowFocalOcclusion!==true?overlapArea(rect,focal):0;
      const normalizedOverlap=overlap/Math.max(1,w*h),normalizedFocal=focalOverlap/Math.max(1,w*h);
      const wanted=clean(element.zone||'EDGE').toUpperCase();
      const centerX=rect.x+w/2,centerY=rect.y+h/2;
      const positionPenalty=wanted==='TOP'?centerY/height:wanted==='BOTTOM'?(height-centerY)/height:
        wanted==='LEFT'?centerX/width:wanted==='RIGHT'?(width-centerX)/width:0;
      const cost=normalizedOverlap*8+normalizedFocal*16+positionPenalty*.8;
      if(!best||cost<best.cost)best={...rect,cost,overlap,occludesFocal:focalOverlap>0};
    }
    if(!best){failures.push(element.id);continue;}
    placements.push(Object.freeze({id:element.id,x:best.x,y:best.y,width:w,height:h,
      priority:finite(element.priority,1),collisionArea:best.overlap,
      occludesFocal:best.occludesFocal,unresolved:best.overlap>0||best.occludesFocal}));
  }
  const unresolved=placements.filter(x=>x.unresolved).map(x=>x.id);
  return Object.freeze({pass:!failures.length&&!unresolved.length,
    bounds:Object.freeze(bounds),placements:Object.freeze(placements),
    unresolved:Object.freeze([...failures,...unresolved]),iterationsPerformed:1,
    ...(iterations>1?{additionalPassesSkipped:'NO_VISUAL_STATE_CHANGE_WITHOUT_REAL_RELAYOUT'}:{}),
    authority:'SUGGESTED_PRESENTATION_LAYOUT_NOT_RUNTIME_PROOF'});
}
export function placeVibeTooltip({
  anchorRect,tooltipSize={width:260,height:112},viewport={width:393,height:852},
  safeInsets={},occupiedRects=[]
}={}){
  const a=presentationRect(anchorRect);
  if(!a)return Object.freeze({pass:false,reason:'ANCHOR_REQUIRED'});
  const w=between(finite(tooltipSize.width,260),32,Math.max(32,finite(viewport.width,393)));
  const h=between(finite(tooltipSize.height,112),24,Math.max(24,finite(viewport.height,852)));
  const left=finite(safeInsets.left),top=finite(safeInsets.top);
  const right=finite(viewport.width,393)-finite(safeInsets.right);
  const bottom=finite(viewport.height,852)-finite(safeInsets.bottom);
  const slots=[
    {placement:'BELOW',x:a.x+a.width/2-w/2,y:a.y+a.height+8},
    {placement:'ABOVE',x:a.x+a.width/2-w/2,y:a.y-h-8},
    {placement:'RIGHT',x:a.x+a.width+8,y:a.y+a.height/2-h/2},
    {placement:'LEFT',x:a.x-w-8,y:a.y+a.height/2-h/2}
  ];
  const clipped=slot=>Math.max(0,left-slot.x)+Math.max(0,slot.x+w-right)
    +Math.max(0,top-slot.y)+Math.max(0,slot.y+h-bottom);
  const options=slots.map(slot=>{
    const rect={x:between(slot.x,left,Math.max(left,right-w)),y:between(slot.y,top,Math.max(top,bottom-h)),width:w,height:h};
    const collision=[a,...occupiedRects.map(presentationRect).filter(Boolean)]
      .reduce((sum,row)=>sum+overlapArea(rect,row),0);
    return {...rect,placement:slot.placement,cost:clipped(slot)*30+collision/Math.max(1,w*h)*400};
  }).sort((a,b)=>a.cost-b.cost);
  const best=options[0];
  return Object.freeze({pass:best.cost<400,x:best.x,y:best.y,width:w,height:h,
    placement:best.placement,collisionCost:best.cost,authority:'PRESENTATION_ONLY'});
}

// Context changes emphasis, never authoritative game data or critical input anchors.
export function resolveVibeContextualHud({
  components=[],phase='EXPLORATION',viewport={width:393,height:852}
}={}){
  const roleWeights=Object.freeze({
    EXPLORATION:{MAP:4,QUEST:3,RESOURCE:2,SKILL:0},
    COMBAT:{HEALTH:5,SKILL:5,TARGET:4,STAMINA:4,MAP:0,QUEST:-2},
    BOSS:{HEALTH:5,BOSS:7,SKILL:4,TARGET:3,QUEST:-3},
    CRAFT:{RECIPE:6,RESOURCE:5,INVENTORY:4,QUEST:-2},
    SHOP:{CURRENCY:5,COMPARE:5,INVENTORY:4,SKILL:-3},
    PARTY:{PARTY:5,PING:5,HEALTH:3,QUEST:-2}
  });
  const active=roleWeights[String(phase).toUpperCase()]||roleWeights.EXPLORATION;
  const narrow=Number(viewport.width)<420;
  const ranked=(components||[]).map((row,index)=>{
    const role=String(row?.role||'').toUpperCase();
    const critical=row?.persistent===true||row?.touchControl===true;
    const priority=finite(row?.priority,1)+(active[role]||0)+(critical?10:0);
    return Object.freeze({...row,priority,persistent:critical,emphasized:(active[role]||0)>=4,
      _index:index});
  }).filter(x=>clean(x.id)).sort((a,b)=>b.priority-a.priority||a._index-b._index);
  const limit=narrow?6:10;
  const selected=ranked.filter(row=>row.persistent||ranked.indexOf(row)<limit);
  const hidden=ranked.filter(row=>!selected.includes(row)).map(row=>row.id);
  return Object.freeze({
    phase:String(phase).toUpperCase(),narrow,
    selected:Object.freeze(selected),deprioritized:Object.freeze(hidden),
    existingTouchPositionsImmutable:true,
    authority:'PRESENTATION_PRIORITY_ONLY'
  });
}

export function buildVibePresentationCraft({game={},world={},surface='HUD',
  viewport={width:393,height:852},components=[],safeInsets={},focalRegion=null,phase='EXPLORATION'}={}){
  const type=String(surface||'HUD').toUpperCase(),grammar=PRESENTATION_SURFACE_GRAMMAR[type];
  if(!grammar)return Object.freeze({pass:false,reason:'UNKNOWN_SURFACE',surface:type});
  const materialRecipe=createVibeVisualMaterialRecipe({game,world,surface:type});
  const focus=resolveVibeContextualHud({components,phase,viewport});
  const layout=optimizeVibeScreenLayout({viewport,components:focus.selected,safeInsets,focalRegion});
  return Object.freeze({version:1,surface:type,grammar:grammar.layout,
    materialRecipe,focus,layout,requiredPatterns:Object.freeze(VIBE_PRESENTATION_EFFECT_PATTERNS),
    engineSpecificImplementationRequired:true,
    sourceBindingsVerified:false,runtimeVerified:false,gameplayMutationAllowed:false});
}

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
export function planVibePresentationAutopilot({files=[],events=[],request='',changeRequest=null,game={},world={},viewport={width:393,height:852},uiSurfaces=[]}={}){
  const audit=auditVibePresentation(files);
  const designSystem=createVibeDesignSystem(files);
  const craftPlans=Object.freeze((Array.isArray(uiSurfaces)&&uiSurfaces.length?uiSurfaces:[{surface:'HUD',components:[]}]).map(row=>buildVibePresentationCraft({game,world,viewport,surface:row.surface,components:row.components||[],safeInsets:row.safeInsets||{},focalRegion:row.focalRegion||null})));
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
    audit,designSystem,craftPlans,timeline,highEnd,cinematicDirection,
    changeRequest:changeRequest||null,
    tasks:Object.freeze(tasks.slice(0,10)),
    policy:Object.freeze({serverAI:false,checkpoint:true,checkpointIsTerminal:false,continuousEvolution:true,highEndCompletionIsReleaseGate:false,mobileFirst:true,gameplayAuthoritative:true,noRuleMutation:true,lightingIsPresentationOnly:true,signatureEventPresentationRequired:true,artDirectionCohesionRequired:true,latestOwnerIntentWinsSameScope:true,directResponsibleSystemEditPreferred:true,wrapperOrShadowAccumulationForbidden:true})
  });
}
export function scoreVibeScreenComposition({primaryActions=1,overlaps=0,edgeClips=0,unreadableLabels=0,criticalHudVisible=true,touchTargetsSmall=0}={}){let score=100;score-=Math.max(0,primaryActions-1)*8;score-=overlaps*15;score-=edgeClips*18;score-=unreadableLabels*10;score-=touchTargetsSmall*8;if(!criticalHudVisible)score-=30;score=clamp(score);return Object.freeze({score,grade:score>=90?'A':score>=75?'B':score>=60?'C':'D',issues:Object.freeze([overlaps&&'overlap',edgeClips&&'edge-clip',unreadableLabels&&'readability',touchTargetsSmall&&'touch-target',!criticalHudVisible&&'critical-hud-hidden'].filter(Boolean))})}
if(typeof window!=='undefined'){window.auditJaewoonVibePresentation=auditVibePresentation;window.createJaewoonVibeDesignSystem=createVibeDesignSystem;window.createJaewoonVibeCinematicDirection=createVibeCinematicDirection;window.createJaewoonVibeCinematicBeat=createVibeCinematicBeat;window.createJaewoonVibePresentationEvent=createVibePresentationEvent;window.compileJaewoonVibePresentationEvents=compileVibePresentationEvents;window.createJaewoonVibeAudioUIExecution=createVibeAudioUIExecution;window.executeJaewoonVibeAudioUIEvent=executeVibeAudioUIEvent;window.routeJaewoonVibePresentationEvent=routeVibePresentationEvent;window.buildJaewoonVibePresentationTimeline=buildVibePresentationTimeline;window.createJaewoonVibeHighEndPresentationStack=createVibeHighEndPresentationStack;window.planJaewoonVibePresentationAutopilot=planVibePresentationAutopilot;window.scoreJaewoonVibeScreenComposition=scoreVibeScreenComposition}
