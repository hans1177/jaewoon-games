const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const uniq=values=>[...new Set((values||[]).map(clean).filter(Boolean))];
const strings=value=>Array.isArray(value)?value.map(clean).filter(Boolean):[];
const text=value=>typeof value==='string'?value:JSON.stringify(value??{});

function contentOf(baseline={}){return baseline?.content&&typeof baseline.content==='object'?baseline.content:{};}
function suppliedSketch(baseline={}){
  const candidates=[baseline.GAMEPLAY_SKETCH,baseline.gameplaySketch,baseline.gameSeed?.GAMEPLAY_SKETCH,baseline.gameSeed?.gameplaySketch,baseline.seed?.GAMEPLAY_SKETCH,baseline.seed?.gameplaySketch];
  return candidates.find(x=>x&&typeof x==='object'&&!Array.isArray(x))||null;
}
function baselineArray(baseline,keys){
  const c=contentOf(baseline);
  for(const key of keys){
    const value=c?.[key]??baseline?.[key];
    if(Array.isArray(value)&&value.length)return value;
  }
  return[];
}
function scopeGroups(inventory=[]){
  const values=inventory.map(row=>`${clean(row?.path)} ${clean(row?.label)}`.toLowerCase());
  const has=re=>values.some(value=>re.test(value));
  return{
    movement:has(/move|movement|explor|jump|world|map|region|area|zone|path/),
    combat:has(/combat|fight|attack|enemy|boss|skill|weapon/),
    interaction:has(/interact|npc|dialog|object|door|chest|switch|quest|pickup|resource/),
    economy:has(/econom|coin|gold|resource|shop|buy|sell|craft|produce/),
    progression:has(/progress|upgrade|level|reward|unlock|quest|objective/),
    placement:has(/tower|placement|build|deploy|slot|grid/),
    strategy:has(/strategy|choice|loadout|build|tower|tactic/),
  };
}

export function deriveGameplaySketch({gameId='',genre='',baseline={},inventory=[]}={}){
  const supplied=suppliedSketch(baseline);
  if(supplied)return{version:Number(supplied.version||1),source:'SEED_OR_DESIGN_GAMEPLAY_SKETCH',...supplied};
  const c=contentOf(baseline),groups=scopeGroups(inventory);
  const coreLoop=baselineArray(baseline,['coreLoop','CORE_LOOP']).map(v=>typeof v==='string'?v:clean(v?.step||v?.name||v?.action)).filter(Boolean).slice(0,8);
  const systems=baselineArray(baseline,['signatureSystems','systems','approvedSystems']).map(v=>typeof v==='string'?v:clean(v?.name||v?.purpose)).filter(Boolean).slice(0,10);
  const regions=baselineArray(baseline,['regions','areas','zones','mapRegions']).map(v=>typeof v==='string'?v:clean(v?.name||v?.id)).filter(Boolean).slice(0,12);
  const objectives=baselineArray(baseline,['objectives','quests','goals']).map(v=>typeof v==='string'?v:clean(v?.name||v?.id||v?.objective)).filter(Boolean).slice(0,12);
  return{
    version:1,
    source:'DERIVED_FROM_LOCKED_DESIGN_BASELINE',
    gameId:clean(gameId),genre:clean(genre),
    playerFantasy:clean(c.playerFantasy||baseline.playerFantasy||''),
    coreFun:clean(c.coreFun||baseline.coreFun||''),
    coreLoop,
    worldModel:{regions,requiresPlayableSpace:groups.movement||groups.placement,requiresRouteOrCollision:groups.movement||groups.placement,requires3DSemantics:'CONDITIONAL_ON_RENDER_MODE'},
    actors:{playerRequired:true,npcOrObjectInteractionRequired:groups.interaction,enemyBehaviorRequired:groups.combat},
    interactionGraph:{required:groups.interaction,contract:'APPROACH_OR_SELECT -> REAL_INPUT -> TARGET_STATE_CHANGE -> GAME_RESULT_CHANGE'},
    combatModel:{required:groups.combat,strategicOutcomeDifferenceRequired:groups.strategy},
    economyModel:{required:groups.economy},
    progressionModel:{required:groups.progression,objectives},
    placementModel:{required:groups.placement,contract:'POSITION_SELECTION -> ENTITY_PLACEMENT -> COMBAT_OR_WORLD_EFFECT'},
    stateMachine:{required:true,contract:'ENTRY -> INPUT -> CORE_ACTION -> STATE_CHANGE -> REWARD_OR_CHOICE -> RISK_OR_PRESSURE -> GOAL_OR_RETRY'},
    expansionPlan:{requiredForFinalDepth:true,dimensions:['NEW_ENEMY_OR_THREAT','NEW_AREA_OR_ROUTE','NEW_OBJECTIVE','NEW_INTERACTION','NEW_STRATEGY_OUTCOME']},
    systems,
  };
}

function storageKeys(source){
  const out=[];
  for(const match of String(source||'').matchAll(/(?:localStorage|sessionStorage)\.(?:getItem|setItem|removeItem)\s*\(\s*['"]([^'"]+)['"]/g))out.push(match[1]);
  return uniq(out).slice(0,40);
}
function functionNames(source){
  const out=[];
  for(const match of String(source||'').matchAll(/(?:function\s+([A-Za-z_$][\w$]*)|(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>)/g))out.push(match[1]||match[2]);
  return uniq(out).slice(0,80);
}
function dataValues(source,attribute){
  return uniq([...String(source||'').matchAll(new RegExp(`${attribute}=["']([^"']+)["']`,'gi'))].map(m=>m[1])).slice(0,60);
}

export function analyzeExistingGameSource(source=''){
  const raw=String(source||''),lower=raw.toLowerCase();
  const scripts=[...raw.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi)].map(m=>m[1]||'');
  return{
    present:Boolean(clean(raw)),
    bytes:Buffer.byteLength(raw,'utf8'),
    scriptBytes:scripts.reduce((n,s)=>n+Buffer.byteLength(s,'utf8'),0),
    storageKeys:storageKeys(raw),
    functions:functionNames(raw),
    mechanicIds:dataValues(raw,'data-mechanic-id'),
    scopeIds:dataValues(raw,'data-scope-id'),
    areaIds:uniq([...dataValues(raw,'data-area'),...dataValues(raw,'data-zone'),...dataValues(raw,'data-region')]),
    routeIds:uniq([...dataValues(raw,'data-route'),...dataValues(raw,'data-route-id'),...dataValues(raw,'data-path-id')]),
    interactionTargets:uniq([...dataValues(raw,'data-interaction-target'),...dataValues(raw,'data-object-id'),...dataValues(raw,'data-npc')]),
    capabilities:{
      canvas:/<canvas\b/i.test(raw),
      threeDimensional:/data-spatial-dimension=["']3d["']|data-player-z=|data-camera-yaw=|data-camera-pitch=/i.test(raw),
      collision:/collision|collider|data-collision/i.test(lower),
      raycastOrPath:/raycast|navmesh|pathfind|data-raycast|data-route|data-path/i.test(lower),
      realInput:/addEventListener\s*\(\s*['"](?:click|pointerdown|pointerup|touchstart|touchend|keydown|keyup)/i.test(raw),
      interactions:/data-interactable|data-interaction-target|data-npc|data-object-id/i.test(raw),
      saveState:/localStorage|sessionStorage/i.test(raw),
      audio:/AudioContext|webkitAudioContext/i.test(raw),
      winPath:/victory|win\b|목표 달성|선승/i.test(raw),
      failPath:/defeat|lose\b|gameover|패배|shutdown|destroyed/i.test(raw),
    }
  };
}

export function buildVibePatchPlan({gameplaySketch={},sourceAnalysis={},inventory=[],blockers=[]}={}){
  const tasks=[];
  const add=(id,reason,dependsOn=[])=>{if(!tasks.some(t=>t.id===id))tasks.push({id,reason,dependsOn});};
  if(!sourceAnalysis.present)add('IMPLEMENT_CORE_SOURCE','No preserved source is available; implement the locked gameplay sketch without inventing a different game.');
  else add('PRESERVE_EXISTING_BEHAVIOR','Patch the existing game in place; do not replace unrelated working systems.');
  if(sourceAnalysis.storageKeys?.length)add('PRESERVE_SAVE_CONTRACT',`Keep existing save keys and meanings: ${sourceAnalysis.storageKeys.join(', ')}`,['PRESERVE_EXISTING_BEHAVIOR']);
  if(gameplaySketch?.worldModel?.requiresPlayableSpace)add('IMPLEMENT_PLAYABLE_SPACE','Playable map/world state must affect movement, routes, collision, placement or objectives.',['PRESERVE_EXISTING_BEHAVIOR']);
  if(gameplaySketch?.interactionGraph?.required)add('IMPLEMENT_ENTITY_INTERACTIONS','Character/NPC/object interaction must change target state and game outcome.',['IMPLEMENT_PLAYABLE_SPACE']);
  if(gameplaySketch?.placementModel?.required)add('IMPLEMENT_POSITIONAL_PLACEMENT','Placement requires real position selection, entity placement and gameplay effect.',['IMPLEMENT_PLAYABLE_SPACE']);
  if(gameplaySketch?.combatModel?.strategicOutcomeDifferenceRequired)add('IMPLEMENT_DIVERGENT_STRATEGY_RESULTS','Different strategic choices must produce observably different combat/world outcomes.');
  if(gameplaySketch?.progressionModel?.required)add('CONNECT_PROGRESSION','Rewards, objectives and unlocks must connect back into the core loop.');
  if(gameplaySketch?.expansionPlan?.requiredForFinalDepth)add('EXPAND_MEANINGFUL_CONTENT','Final depth must add new enemy/area/objective/interaction/strategy dimensions; repetition and retry time do not count.');
  for(const blocker of uniq(blockers).slice(0,24))add(`FIX_${clean(blocker).replace(/[^A-Za-z0-9]+/g,'_').slice(0,64)}`,`Resolve validator/rework failure: ${clean(blocker)}`);
  return{
    version:1,
    mode:'PATCH_EXISTING_RESPONSIBLE_SYSTEMS',
    forbidden:['FULL_GAME_REWRITE_WHEN_SOURCE_EXISTS','SAVE_KEY_OR_MEANING_BREAK','TEMPLATE_SWAP_TO_HIDE_MISSING_FEATURES','STATIC_LABEL_AS_IMPLEMENTATION','VALIDATION_PROXY_AS_GAMEPLAY'],
    preserve:{storageKeys:sourceAnalysis.storageKeys||[],workingFunctions:(sourceAnalysis.functions||[]).slice(0,30),mechanicIds:sourceAnalysis.mechanicIds||[]},
    approvedScopeIds:inventory.map(x=>clean(x?.id)).filter(Boolean),
    tasks,
    verificationOrder:['STATIC_CONTRACT','MOBILE_RUNTIME','REAL_INPUT_AND_STATE_CHANGE','APPROVED_SCOPE_BEHAVIOR','WIN_AND_FAIL','REGRESSION','FINAL_CONTENT_DEPTH_WHEN_APPLICABLE']
  };
}

export function buildVibeDevelopmentContext({gameId='',genre='',baseline={},inventory=[],existingHtml='',blockers=[]}={}){
  const gameplaySketch=deriveGameplaySketch({gameId,genre,baseline,inventory});
  const sourceAnalysis=analyzeExistingGameSource(existingHtml);
  const patchPlan=buildVibePatchPlan({gameplaySketch,sourceAnalysis,inventory,blockers});
  return{version:1,gameplaySketch,sourceAnalysis,patchPlan};
}

export function clipPreservedSourceForModel(source='',max=24000){
  const raw=String(source||'');
  if(raw.length<=max)return raw;
  const marker='\n<!-- VIBE2_SOURCE_MIDDLE_OMITTED_FOR_CONTEXT; PATCH EXISTING SOURCE, DO NOT REPLACE GAME -->\n';
  const budget=Math.max(2000,max-marker.length),head=Math.floor(budget*0.58),tail=budget-head;
  return raw.slice(0,head)+marker+raw.slice(-tail);
}
