// 파일명: assets/vibe-presentation-director.js
// 역할: 게임 디자인/UI/카메라/VFX/전환/보스 연출을 자동 진단하고 고도화 계획 생성
// 원칙: 연출은 정보전달과 게임 판정을 보조하며 HP/데미지/보상/쿨타임/저장 규칙을 변경하지 않음

const uniq=a=>[...new Set((a||[]).filter(Boolean))];
const clamp=n=>Math.max(0,Math.min(100,Math.round(n)));
const textOf=files=>files.map(x=>`${x.path||''}\n${x.source??x.current??''}`).join('\n');
const clean=v=>String(v??'').trim();
const stablePresentationHash=value=>{let h=2166136261;for(const ch of String(value)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return(h>>>0).toString(36)};
const DIMENSIONS=Object.freeze({hierarchy:['hud','panel','label','title','font','z-index','z_index'],spacing:['gap','padding','margin','container','anchor','offset'],contrast:['color','outline','stroke','shadow','modulate'],feedback:['hit','flash','shake','particle','damage','critical'],camera:['camera','shake','zoom','follow','position_smoothing'],transition:['transition','fade','tween','scene','loading'],atmosphere:['background','parallax','fog','light','shadow','weather','ambient'],boss:['boss','phase','warning','telegraph','entrance']});
const PRESENTATION_CHANNELS=Object.freeze({spawn:Object.freeze(['animation','vfx','audio','lighting']),attack:Object.freeze(['animation','vfx','audio']),hit:Object.freeze(['animation','vfx','audio','camera','ui']),skill:Object.freeze(['animation','vfx','audio','camera','ui','lighting']),boss:Object.freeze(['animation','vfx','audio','camera','ui','lighting']),death:Object.freeze(['animation','vfx','audio','ui','lighting']),wave:Object.freeze(['audio','camera','ui','lighting']),victory:Object.freeze(['animation','vfx','audio','camera','ui','lighting']),interact:Object.freeze(['animation','vfx','audio','ui']),solve:Object.freeze(['animation','vfx','audio','ui']),guard:Object.freeze(['animation','vfx','audio']),combo:Object.freeze(['animation','vfx','audio','camera']),heal:Object.freeze(['animation','vfx','audio','ui']),buff:Object.freeze(['animation','vfx','audio','ui']),summon:Object.freeze(['animation','vfx','audio','lighting'])});
// 출처/스킬 선택자는 렌더링 힌트일 뿐, 피해량·쿨다운·턴 소유권을 전달하지 않는다.
const PRESENTATION_ONLY_KEYS=Object.freeze(['animation','vfx','audio','camera','ui','lighting','genre','careerId','skillId','weaponFamily','comboIndex','motionStyle']);
const AUDIO_CUES=Object.freeze({spawn:'spawn-accent',attack:'attack-accent',hit:'impact-accent',skill:'skill-accent',boss:'boss-accent',death:'death-accent',wave:'wave-accent',victory:'victory-accent',interact:'interact-accent',solve:'puzzle-resolved-accent',guard:'guard-accent',combo:'combo-accent',heal:'heal-accent',buff:'buff-accent',summon:'summon-accent'});
const UI_CUES=Object.freeze({hit:'combat-feedback',skill:'skill-feedback',boss:'boss-focus',death:'defeat-feedback',wave:'wave-status',victory:'victory-status',interact:'interaction-feedback',solve:'confirmed-puzzle-result',heal:'healing-feedback',buff:'buff-feedback'});
const CINEMATIC_SCENE_INTENT=Object.freeze(['EMOTIONAL_INTENT','RISK_OR_TENSION','PLAYER_FOCUS_TARGET','WORLD_CONTEXT','GAMEPLAY_READABILITY']);
const CINEMATIC_MOTION_LAYERS=Object.freeze(['PRIMARY_MOTION','SECONDARY_MOTION','PROCEDURAL_RESPONSE']);
const VFX_INTENSITY_HIERARCHY=Object.freeze(['AMBIENT','NORMAL','HEAVY','CRITICAL_OR_SIGNATURE','BOSS_OR_ULTIMATE']);
const ADAPTIVE_AUDIO_STATES=Object.freeze(['EXPLORATION','DISCOVERY_OR_TENSION','COMBAT','DANGER','BOSS','VICTORY','REST_OR_HUB','SPECIAL_EVENT']);

export function auditVibePresentation(files=[]){const text=textOf(files).toLowerCase(),dimensions=[];for(const[name,hints]of Object.entries(DIMENSIONS)){const hits=hints.filter(x=>text.includes(x)).length,score=clamp(hits/hints.length*100);dimensions.push(Object.freeze({name,score,debt:100-score,priority:score<30?'critical':score<55?'high':score<75?'medium':'low'}))}dimensions.sort((a,b)=>b.debt-a.debt);const overall=clamp(dimensions.reduce((n,x)=>n+x.score,0)/(dimensions.length||1));return Object.freeze({score:overall,grade:overall>=85?'A':overall>=70?'B':overall>=50?'C':'D',dimensions:Object.freeze(dimensions),priority:Object.freeze(dimensions.slice(0,4).map(x=>x.name))})}
export function createVibeDesignSystem(files=[]){const text=textOf(files),rounded=/border-radius|corner_radius/i.test(text),shadow=/box-shadow|shadow_/i.test(text),outline=/outline|stroke|border/i.test(text),largeTouch=/44px|48px|custom_minimum_size/i.test(text);return Object.freeze({version:1,principles:Object.freeze(['gameplay-first-hierarchy','one-primary-action','consistent-spacing','state-visible-at-glance','touch-first','safe-area-aware']),tokens:Object.freeze({radius:rounded?'existing':'12px-baseline',shadow:shadow?'existing':'subtle-depth',outline:outline?'existing':'readability-outline',touchTarget:largeTouch?'existing':'44px-minimum',fontFamily:'system-ui, sans-serif',fontTitlePx:20,fontBodyPx:15,fontButtonPx:14,lineHeight:1.4,foreground:'#f4f6fa',background:'#151b2b',accent:'#80cfff',border:'#aab9cc',touchTargetPx:44,minContrast:4.5}),protected:Object.freeze(['gameplay-layout-function','input-binding','game-rule-values','save-structure'])})}

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
      const cost=normalizedOverlap*8+normalizedFocal*16+positionPenalty*.8+
        ((overlap>0||focalOverlap>0)?1:0);
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
  const design=createVibeDesignSystem(),score=auditVibeUiDesign({components:focus.selected,layout,tokens:design.tokens,viewport,safeInsets});
  const controls=Object.freeze(focus.selected.map(x=>Object.freeze({id:clean(x.id),label:clean(x.label||x.id),actionId:clean(x.actionId)})));
  return Object.freeze({version:1,surface:type,grammar:grammar.layout,
    viewport:Object.freeze({width:finite(viewport.width),height:finite(viewport.height)}),
    controls,materialRecipe,focus,layout,design,score,requiredPatterns:Object.freeze(VIBE_PRESENTATION_EFFECT_PATTERNS),
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
export function createVibeCinematicBeat(event,{importance='normal'}={}){const beats={spawn:['anticipation','entrance','settle'],attack:['anticipation','action','impact','recovery'],hit:['impact','micro-freeze','recoil','readability-reset'],skill:['telegraph','charge','release','impact','recovery'],boss:['silence-or-focus','entrance','identity-shot','control-return'],death:['impact','collapse','reward-readability'],wave:['announce','breathing-room','spawn-focus'],victory:['resolve','celebration','result-focus'],interact:['target-focus','reach','confirmed-response','settle'],solve:['confirmed-solution','reveal','settle'],guard:['brace','hold','recover'],combo:['anticipation','strike-chain','contact','recovery'],heal:['prepare','target-focus','restore-visual','settle'],buff:['prepare','aura-cue','settle'],summon:['ritual','entrance','settle']};const base=beats[event]||['focus','feedback','resolve'];return Object.freeze({event,importance,beats:Object.freeze(base),limits:Object.freeze({cameraShake:importance==='major'?'medium':'subtle',freezeMs:event==='hit'?50:0,inputBlock:event==='boss'?'brief-only':'none'}),forbid:Object.freeze(['damage-change','cooldown-change','reward-change','spawn-rule-change'])})}
export function createVibePresentationEvent(event,{sourceId='',targetId='',causeId='',timestamp=0,sequence=0,importance='normal',payload={}}={}){const eventType=clean(event),safePayload={};for(const key of PRESENTATION_ONLY_KEYS)if(payload&&Object.prototype.hasOwnProperty.call(payload,key)){if(key==='comboIndex')safePayload[key]=Number.isFinite(Number(payload[key]))?Math.max(0,Math.min(15,Math.floor(Number(payload[key])))):0;else if(key==='motionStyle')safePayload[key]=clean(payload[key]).toUpperCase().slice(0,24);else safePayload[key]=payload[key];}const seed=[eventType,sourceId,targetId,causeId,timestamp,sequence].map(clean).join('|'),channels=PRESENTATION_CHANNELS[eventType]||Object.freeze(['animation','vfx','audio','ui']);return Object.freeze({version:1,presentationEventId:`pres_${stablePresentationHash(seed)}`,eventType,sourceId:clean(sourceId),targetId:clean(targetId),causeId:clean(causeId),timestamp:Number(timestamp)||0,sequence:Number(sequence)||0,importance,channels:Object.freeze([...channels]),payload:Object.freeze(safePayload),authority:'presentation-only',gameplayMutationAllowed:false})}
// 메인: 동일 인과 이벤트의 전달 중복은 한 번만 연출한다. 서로 다른 공격 시퀀스는 보존한다.
export function compileVibePresentationEvents(events=[]){
  const compiled=[],seen=new Set();
  for(const [index,event] of (Array.isArray(events)?events:[]).entries()){
    const e=typeof event==='string'?{event}:event||{};
    const row=createVibePresentationEvent(e.eventType||e.event,{
      sourceId:e.sourceId,targetId:e.targetId,causeId:e.causeId,
      timestamp:e.timestamp,sequence:e.sequence??index,
      importance:e.importance||((e.eventType||e.event)==='boss'||(e.eventType||e.event)==='victory'?'major':'normal'),
      payload:e.payload
    });
    if(row.causeId&&seen.has(row.presentationEventId))continue;
    if(row.causeId)seen.add(row.presentationEventId);
    compiled.push(row);
  }
  compiled.sort((a,b)=>a.timestamp-b.timestamp||a.sequence-b.sequence||a.presentationEventId.localeCompare(b.presentationEventId));
  return Object.freeze(compiled);
}
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
export function planVibePresentationAutopilot({files=[],events=[],request='',changeRequest=null,game={},world={},viewport={width:393,height:852},uiSurfaces=[],performanceTelemetry=null}={}){
  const audit=auditVibePresentation(files);
  const designSystem=createVibeDesignSystem(files);
  const craftPlans=Object.freeze((Array.isArray(uiSurfaces)&&uiSurfaces.length?uiSurfaces:[{surface:'HUD',components:[]}]).map(row=>buildVibePresentationCraft({game,world,viewport,surface:row.surface,components:row.components||[],safeInsets:row.safeInsets||{},focalRegion:row.focalRegion||null})));
  const timeline=buildVibePresentationTimeline(events);
  const highEnd=createVibeHighEndPresentationStack({request});
  const cinematicDirection=highEnd.cinematicDirection;
  // 메인: 관찰된 프레임 비용으로 연출 예산만 조정한다. 게임 판정/스폰/입력은 불변이다.
  const width=Number(viewport?.width)||393, height=Number(viewport?.height)||852;
  const mobile=Math.min(width,height)<600;
  const observedFrameMs=Number(performanceTelemetry?.frameMs);
  const measured=performanceTelemetry?.actualRuntime===true&&
    Number.isFinite(observedFrameMs)&&observedFrameMs>0;
  const frameBudgetMs=mobile?33.333:16.667;
  const pressure=measured?observedFrameMs/frameBudgetMs:null;
  const tier=!measured?'UNMEASURED':pressure>1.5?'CRITICAL':pressure>1?'PRESSURED':'NORMAL';
  const presentationBudget=Object.freeze({
    tier,mobile,frameBudgetMs,
    observedFrameMs:measured?observedFrameMs:null,
    telemetrySource:measured?'OBSERVED_RUNTIME':'UNVERIFIED_OR_ABSENT',
    particlesPerImpact:tier==='CRITICAL'?4:tier==='PRESSURED'?8:16,
    distantDecorativeEffectDensity:tier==='CRITICAL'?'MINIMAL':tier==='PRESSURED'?'REDUCED':'NORMAL',
    essentialHitFeedbackRequired:true,
    actionInputAndCollisionUnchanged:true,
    spawnedEntityAndCombatBudgetUnchanged:true,
    gameplayStateAndSaveMutationAllowed:false,
    recommendedOnly:true,actualRuntimeBudgetApplied:false
  });
  const tasks=[];
  for(const area of audit.priority)tasks.push(Object.freeze({domain:'presentation',target:area,action:`improve-${area}`,risk:['camera','transition'].includes(area)?'medium':'low'}));
  tasks.push(Object.freeze({domain:'presentation',target:'cinematic-direction',action:'align-scene-intent-acting-motion-vfx-camera-lighting-audio',risk:'medium'}));
  if(timeline.length)tasks.push(Object.freeze({domain:'presentation',target:'event-timeline',action:'wire-cinematic-beats',risk:'medium'}));
  return Object.freeze({
    version:3,
    request:String(request),
    qualityProfile:'HIGH_END_COMMERCIAL_NATIVE_PRESENTATION',
    audit,designSystem,craftPlans,timeline,highEnd,cinematicDirection,presentationBudget,
    changeRequest:changeRequest||null,
    tasks:Object.freeze(tasks.slice(0,10)),
    policy:Object.freeze({serverAI:false,checkpoint:true,checkpointIsTerminal:false,continuousEvolution:true,highEndCompletionIsReleaseGate:false,mobileFirst:true,gameplayAuthoritative:true,noRuleMutation:true,lightingIsPresentationOnly:true,signatureEventPresentationRequired:true,artDirectionCohesionRequired:true,latestOwnerIntentWinsSameScope:true,directResponsibleSystemEditPreferred:true,wrapperOrShadowAccumulationForbidden:true})
  });
}
export function scoreVibeScreenComposition({primaryActions=1,overlaps=0,edgeClips=0,unreadableLabels=0,criticalHudVisible=true,touchTargetsSmall=0,
lowContrast=0,fontIssues=0,textOverflow=0,missingBindings=0,touchSpacing=0}={}){
  const score=clamp(100-Math.max(0,primaryActions-1)*8-overlaps*15-edgeClips*18-unreadableLabels*10-
    touchTargetsSmall*12-lowContrast*20-fontIssues*15-textOverflow*14-missingBindings*25-touchSpacing*12-
    (!criticalHudVisible?30:0));
  return Object.freeze({score,grade:score>=92?'A':score>=80?'B':score>=65?'C':'D',
    issues:Object.freeze([overlaps&&'overlap',edgeClips&&'edge-clip',unreadableLabels&&'readability',
      touchTargetsSmall&&'touch-target',lowContrast&&'low-contrast',fontIssues&&'font-hierarchy',
      textOverflow&&'text-overflow',missingBindings&&'action-unbound',touchSpacing&&'touch-spacing',
      !criticalHudVisible&&'critical-hud-hidden'].filter(Boolean))});
}
// [UI 디자인] 실제 렌더러가 아닌 정적 근사치; 색 대비/글꼴/버튼 계약/터치를 하나의 기준으로 평가한다.
export function auditVibeUiDesign({components=[],layout={},tokens=createVibeDesignSystem().tokens,viewport={},safeInsets={}}={}){
  const lum=color=>{
    if(!/^#[\da-f]{6}$/i.test(String(color)))return NaN;
    return [1,3,5].reduce((sum,i,k)=>{
      const v=parseInt(color.slice(i,i+2),16)/255,x=v<=.04045?v/12.92:((v+.055)/1.055)**2.4;
      return sum+x*[.2126,.7152,.0722][k];
    },0);
  };
  const a=lum(tokens.foreground),b=lum(tokens.background);
  const contrast=Number.isFinite(a)&&Number.isFinite(b)?+( (Math.max(a,b)+.05)/(Math.min(a,b)+.05) ).toFixed(2):0;
  const lowContrast=+(contrast<Math.max(4.5,Number(tokens.minContrast)||4.5));
  const fontIssues=+!(Number(tokens.fontTitlePx)>=Number(tokens.fontBodyPx)+2&&
    Number(tokens.fontBodyPx)>=14&&Number(tokens.fontButtonPx)>=14&&Number(tokens.lineHeight)>=1.25);
  const placed=new Map((layout.placements||[]).map(x=>[x.id,x])),ids=new Set(),touch=[];
  let textOverflow=0,missingBindings=0,touchTargetsSmall=0,touchSpacing=0;
  for(const c of components){
    const interactive=c.touch===true||c.touchControl===true||Boolean(c.actionId);
    const id=clean(c.actionId),p=placed.get(c.id);
    if(interactive&&(!id||ids.has(id)))missingBindings++;
    if(id)ids.add(id);
    if(!p)continue;
    const size=interactive?Number(tokens.fontButtonPx):Number(tokens.fontBodyPx);
    const width=[...clean(c.label||c.id)].reduce((n,ch)=>n+(/[가-힣]/.test(ch)?size:/\s/.test(ch)?size*.35:size*.64),0);
    if(width+12>p.width)textOverflow++;
    if(interactive){touch.push(p);if(p.width<Math.max(44,Number(tokens.touchTargetPx)||44)||
      p.height<Math.max(44,Number(tokens.touchTargetPx)||44))touchTargetsSmall++;}
  }
  for(let i=0;i<touch.length;i++)for(let j=i+1;j<touch.length;j++){
    const x=touch[i],y=touch[j],dx=Math.max(0,x.x-y.x-y.width,y.x-x.x-x.width),
      dy=Math.max(0,x.y-y.y-y.height,y.y-x.y-x.height);
    if(dx<4&&dy<4)touchSpacing++;
  }
  const safe={left:finite(safeInsets.left),right:finite(safeInsets.right),
    top:finite(safeInsets.top),bottom:finite(safeInsets.bottom)};
  const edgeClips=(layout.placements||[]).filter(x=>x.x<safe.left||x.y<safe.top||
    x.x+x.width>finite(viewport.width)-safe.right||x.y+x.height>finite(viewport.height)-safe.bottom).length+
    components.filter(x=>!placed.has(x.id)).length;
  const overlaps=(layout.placements||[]).filter(x=>x.unresolved).length;
  const criticalHudVisible=components.filter(x=>x.critical).every(x=>placed.has(x.id)&&!placed.get(x.id).unresolved);
  const result=scoreVibeScreenComposition({overlaps,edgeClips,criticalHudVisible,
    touchTargetsSmall,lowContrast,fontIssues,textOverflow,missingBindings,touchSpacing});
  // 검증 대상이 없거나 배치 자체가 실패하면 화면이 없는 상태를 100점으로 취급하지 않는다.
  const missingSurface=!Array.isArray(components)||components.length===0||layout.pass!==true;
  const score=missingSurface?0:result.score;
  const issues=missingSurface?Object.freeze([...result.issues,
    components.length===0?'no-ui-controls':'layout-invalid']):result.issues;
  return Object.freeze({...result,score,grade:missingSurface?'D':result.grade,issues,
    metrics:Object.freeze({contrast,lowContrast,fontIssues,
      textOverflow,missingBindings,touchTargetsSmall,touchSpacing,overlaps,edgeClips}),
    runtimeVerified:false,actionRuntimeVerified:false,textRenderedVerified:false,
    authority:'SYNTHETIC_UI_DESIGN_AND_BINDING_CONTRACT'});
}
// [UI 반복 연습] 기존 화면 배치기/채점기로 안전 영역·충돌·터치 판독성을 수치 연습한다.
// 이미지·모델·스크립트 에셋 생성 없음. 연습 결과는 게임 런타임 승인이나 실제 버튼 작동 증거가 아니다.
export function exerciseVibeUiLayouts(){
  const profiles=[
    {surface:'HUD',controls:[['health',148,44,'TOP',false,true],['skills',154,56,'BOTTOM',true],['bag',48,48,'RIGHT',true],['quest',160,46,'TOP']]},
    {surface:'INVENTORY',controls:[['slots',170,174,'LEFT'],['details',140,154,'RIGHT'],['equip',98,48,'BOTTOM',true],['close',48,48,'TOP',true]]},
    {surface:'SHOP',controls:[['wares',178,164,'LEFT'],['prices',136,130,'RIGHT'],['purchase',110,48,'BOTTOM',true],['close',48,48,'TOP',true]]},
    {surface:'SETTINGS',controls:[['tabs',124,138,'LEFT'],['options',172,156,'RIGHT'],['apply',96,48,'BOTTOM',true],['close',48,48,'TOP',true]]},
    {surface:'CRAFT',controls:[['recipes',172,158,'LEFT'],['ingredients',144,144,'RIGHT'],['craft',100,48,'BOTTOM',true],['close',48,48,'TOP',true]]},
    {surface:'QUEST',controls:[['journal',180,164,'LEFT'],['objective',140,110,'RIGHT'],['track',96,48,'BOTTOM',true],['close',48,48,'TOP',true]]},
    {surface:'DIALOGUE',controls:[['dialogue',200,100,'BOTTOM',false,true],['response',160,48,'BOTTOM',true],['close',48,48,'TOP',true]]},
    {surface:'COMBAT',controls:[['health',152,44,'TOP',false,true],['attack',78,60,'BOTTOM',true],['skills',144,52,'BOTTOM',true],['target',116,46,'TOP']]}
  ];
  const viewports=[
    {name:'SMALL_PORTRAIT',width:360,height:640,safe:{left:12,right:12,top:24,bottom:24}},
    {name:'MOBILE_PORTRAIT',width:393,height:852,safe:{left:16,right:16,top:32,bottom:24}},
    {name:'MOBILE_LANDSCAPE',width:844,height:390,safe:{left:16,right:16,top:14,bottom:14}}
  ];
  const labels=Object.freeze({health:'체력',skills:'스킬',bag:'가방',quest:'퀘스트',slots:'보유 목록',
    details:'상세 정보',equip:'장착',close:'닫기',wares:'판매 목록',prices:'가격',purchase:'구매',
    tabs:'항목',options:'설정 내용',apply:'적용',recipes:'제작법',ingredients:'재료',craft:'제작',
    journal:'퀘스트 목록',objective:'목표',track:'추적',dialogue:'대화',response:'선택하기',attack:'공격',target:'대상'});
  const rows=[];
  for(const profile of profiles)for(const view of viewports)for(const variant of ['soft','strong']){
    const factor=variant==='soft'?0.94:1.12;
    const controls=profile.controls.map(([id,baseW,baseH,zone,touch=false,critical=false])=>({
      id,zone,priority:critical?8:touch?5:2,width:Math.round(baseW*factor),
      height:Math.round(baseH*factor),touch,critical,label:labels[id]||id,actionId:touch?id:null
    }));
    const viewport={width:view.width,height:view.height},safeInsets=view.safe;
    const focalRegion=['HUD','COMBAT'].includes(profile.surface)?{
      x:Math.round(view.width*0.24),y:Math.round(view.height*0.23),
      width:Math.round(view.width*0.52),height:Math.round(view.height*0.52)
    }:null;
    const layout=optimizeVibeScreenLayout({viewport,safeInsets,components:controls,focalRegion});
    const score=auditVibeUiDesign({components:controls,layout,
      tokens:createVibeDesignSystem().tokens,viewport,safeInsets});
    const {edgeClips,overlaps,touchTargetsSmall}=score.metrics;
    const criticalHudVisible=controls.filter(x=>x.critical).every(x=>layout.placements.some(p=>p.id===x.id&&!p.unresolved));
    // 비교 기준은 실제 게임 UI가 아니라 같은 요소를 최적화 없이 세로로 쌓은 연습 기준안이다.
    const raw=[];
    let y=view.safe.top;
    for(const control of controls){raw.push({x:view.safe.left,y,width:control.width,height:control.height});
      y+=control.height+6;}
    const baselineClips=raw.filter(rect=>rect.x+rect.width>view.width-view.safe.right||
      rect.y+rect.height>view.height-view.safe.bottom).length;
    let baselineOverlaps=0;
    for(let i=0;i<raw.length;i++)for(let j=i+1;j<raw.length;j++)if(overlapArea(raw[i],raw[j])>0)baselineOverlaps++;
    const baselineScore=scoreVibeScreenComposition({
      overlaps:baselineOverlaps,edgeClips:baselineClips,
      touchTargetsSmall:controls.filter(row=>row.touch&&(row.width<44||row.height<44)).length,
      criticalHudVisible:true}).score;
    rows.push(Object.freeze({surface:profile.surface,viewport:view.name,variant,
      score:score.score,baselineScore,gain:score.score-baselineScore,
      staticPass:layout.pass&&score.score>=92&&score.issues.length===0,
      designScore:score.score,contrast:score.metrics.contrast,
      fontIssues:score.metrics.fontIssues+score.metrics.textOverflow,
      bindingIssues:score.metrics.missingBindings,touchSpacingIssues:score.metrics.touchSpacing,
      issues:Object.freeze(score.issues.slice()),runtimeVerified:false,gameApplied:false}));
  }
  const passing=rows.filter(row=>row.staticPass).length;
  const totalScore=rows.reduce((sum,row)=>sum+row.score,0);
  return Object.freeze({surfaces:Object.freeze(profiles.map(p=>p.surface)),
    viewports:Object.freeze(viewports.map(v=>v.name)),
    trials:rows.length,staticPasses:passing,staticFailures:rows.length-passing,
    meanScore:Math.round(totalScore/Math.max(1,rows.length)*10)/10,
    rows:Object.freeze(rows),source:'EXISTING_VIBE_PRESENTATION_LAYOUT_AND_SCORE',
    measurement:'SYNTHETIC_UI_DESIGN_AND_BINDING_CONTRACT',screenshotsCaptured:false,
    buttonsClicked:false,textRenderedVerified:false,
    runtimeVerified:false,gameApplied:false});
}

if(typeof window!=='undefined'){window.auditJaewoonVibePresentation=auditVibePresentation;window.createJaewoonVibeDesignSystem=createVibeDesignSystem;window.createJaewoonVibeCinematicDirection=createVibeCinematicDirection;window.createJaewoonVibeCinematicBeat=createVibeCinematicBeat;window.createJaewoonVibePresentationEvent=createVibePresentationEvent;window.compileJaewoonVibePresentationEvents=compileVibePresentationEvents;window.createJaewoonVibeAudioUIExecution=createVibeAudioUIExecution;window.executeJaewoonVibeAudioUIEvent=executeVibeAudioUIEvent;window.routeJaewoonVibePresentationEvent=routeVibePresentationEvent;window.buildJaewoonVibePresentationTimeline=buildVibePresentationTimeline;window.createJaewoonVibeHighEndPresentationStack=createVibeHighEndPresentationStack;window.planJaewoonVibePresentationAutopilot=planVibePresentationAutopilot;window.scoreJaewoonVibeScreenComposition=scoreVibeScreenComposition}
