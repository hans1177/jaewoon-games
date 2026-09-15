import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {buildGameFlowArchitecture,evaluateGameFlowArchitecture} from './company-vibe2-game-flow-architect.mjs';
import {buildCodingArchitecture,evaluateCodingArchitecture} from './company-vibe2-coding-architecture.mjs';
import {buildExpertDevelopmentAnalysis,buildCausalDebugPlan} from './company-vibe2-expert-development.mjs';

const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const uniq=values=>[...new Set((values||[]).map(clean).filter(Boolean))];
const strings=value=>Array.isArray(value)?value.map(clean).filter(Boolean):[];

function contentOf(baseline={}){return baseline?.content&&typeof baseline.content==='object'?baseline.content:{};}
function suppliedSketch(baseline={}){
  const candidates=[baseline.GAMEPLAY_SKETCH,baseline.gameplaySketch,baseline.gameSeed?.GAMEPLAY_SKETCH,baseline.gameSeed?.gameplaySketch,baseline.seed?.GAMEPLAY_SKETCH,baseline.seed?.gameplaySketch];
  return candidates.find(x=>x&&typeof x==='object'&&!Array.isArray(x))||null;
}
function baselineArray(baseline,keys){
  const c=contentOf(baseline);
  for(const key of keys){const value=c?.[key]??baseline?.[key];if(Array.isArray(value)&&value.length)return value;}
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
  const flowArchitecture=buildGameFlowArchitecture({gameId,genre,baseline,inventory}),supplied=suppliedSketch(baseline);
  if(supplied)return{version:Math.max(2,Number(supplied.version||1)),source:'SEED_OR_DESIGN_GAMEPLAY_SKETCH',...supplied,flowArchitecture:supplied.flowArchitecture||flowArchitecture};
  const c=contentOf(baseline),groups=scopeGroups(inventory);
  const coreLoop=baselineArray(baseline,['coreLoop','CORE_LOOP']).map(v=>typeof v==='string'?v:clean(v?.step||v?.name||v?.action)).filter(Boolean).slice(0,8);
  const systems=baselineArray(baseline,['signatureSystems','systems','approvedSystems']).map(v=>typeof v==='string'?v:clean(v?.name||v?.purpose)).filter(Boolean).slice(0,10);
  const regions=baselineArray(baseline,['regions','areas','zones','mapRegions']).map(v=>typeof v==='string'?v:clean(v?.name||v?.id)).filter(Boolean).slice(0,12);
  const objectives=baselineArray(baseline,['objectives','quests','goals']).map(v=>typeof v==='string'?v:clean(v?.name||v?.id||v?.objective)).filter(Boolean).slice(0,12);
  return{
    version:2,source:'DERIVED_FROM_LOCKED_DESIGN_BASELINE',gameId:clean(gameId),genre:clean(genre),
    playerFantasy:clean(c.playerFantasy||baseline.playerFantasy||''),coreFun:clean(c.coreFun||baseline.coreFun||''),coreLoop,flowArchitecture,
    worldModel:{regions,requiresPlayableSpace:groups.movement||groups.placement,requiresRouteOrCollision:groups.movement||groups.placement,requires3DSemantics:'CONDITIONAL_ON_RENDER_MODE'},
    actors:{playerRequired:true,npcOrObjectInteractionRequired:groups.interaction,enemyBehaviorRequired:groups.combat},
    interactionGraph:{required:groups.interaction,contract:'APPROACH_OR_SELECT -> REAL_INPUT -> TARGET_STATE_CHANGE -> GAME_RESULT_CHANGE'},
    combatModel:{required:groups.combat,strategicOutcomeDifferenceRequired:groups.strategy},economyModel:{required:groups.economy},
    progressionModel:{required:groups.progression,objectives},placementModel:{required:groups.placement,contract:'POSITION_SELECTION -> ENTITY_PLACEMENT -> COMBAT_OR_WORLD_EFFECT'},
    stateMachine:{required:true,contract:'LOCAL_PLAYABLE_CYCLE: ENTRY -> INPUT -> CORE_ACTION -> STATE_CHANGE -> REWARD_OR_CHOICE -> RISK_OR_PRESSURE -> GOAL_OR_RETRY; MACRO_PROGRESSION_MUST_FOLLOW flowArchitecture INSTEAD_OF_REPEATING_THIS_SAME_LOOP'},
    expansionPlan:{requiredForFinalDepth:true,dimensions:['NEW_ENEMY_OR_THREAT','NEW_AREA_OR_ROUTE','NEW_OBJECTIVE','NEW_INTERACTION','NEW_STRATEGY_OUTCOME','NEW_FLOW_OR_PHASE_RULE']},systems,
  };
}

function storageKeys(source){
  const out=[];for(const match of String(source||'').matchAll(/(?:localStorage|sessionStorage)\.(?:getItem|setItem|removeItem)\s*\(\s*['"]([^'"]+)['"]/g))out.push(match[1]);
  return uniq(out).slice(0,40);
}
function storageKeyUsage(source,method){
  const out=[],re=new RegExp(`(?:localStorage|sessionStorage)\\.${method}\\s*\\(\\s*['"]([^'"]+)['"]`,'g');
  for(const match of String(source||'').matchAll(re))out.push(match[1]);return uniq(out).slice(0,40);
}
function functionNames(source){
  const out=[];for(const match of String(source||'').matchAll(/(?:function\s+([A-Za-z_$][\w$]*)|(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>)/g))out.push(match[1]||match[2]);
  return uniq(out).slice(0,80);
}
function dataValues(source,attribute){return uniq([...String(source||'').matchAll(new RegExp(`${attribute}=["']([^"']+)["']`,'gi'))].map(m=>m[1])).slice(0,60);}
function functionDependencyGraph(source,names){
  const raw=String(source||''),known=new Set(names||[]),edges=[];
  for(const match of raw.matchAll(/function\s+([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{([\s\S]*?)\n?\}/g)){
    const from=match[1],body=match[2]||'';if(!known.has(from))continue;
    for(const call of body.matchAll(/\b([A-Za-z_$][\w$]*)\s*\(/g)){const to=call[1];if(to!==from&&known.has(to))edges.push(`${from}->${to}`);}
  }
  return uniq(edges).slice(0,120);
}

export function analyzeExistingGameSource(source=''){
  const raw=String(source||''),lower=raw.toLowerCase(),scripts=[...raw.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi)].map(m=>m[1]||''),functions=functionNames(raw);
  return{
    present:Boolean(clean(raw)),bytes:Buffer.byteLength(raw,'utf8'),scriptBytes:scripts.reduce((n,s)=>n+Buffer.byteLength(s,'utf8'),0),
    storageKeys:storageKeys(raw),storageReads:storageKeyUsage(raw,'getItem'),storageWrites:storageKeyUsage(raw,'setItem'),functions,
    functionDependencies:functionDependencyGraph(scripts.join('\n'),functions),mechanicIds:dataValues(raw,'data-mechanic-id'),scopeIds:dataValues(raw,'data-scope-id'),
    areaIds:uniq([...dataValues(raw,'data-area'),...dataValues(raw,'data-zone'),...dataValues(raw,'data-region')]),
    routeIds:uniq([...dataValues(raw,'data-route'),...dataValues(raw,'data-route-id'),...dataValues(raw,'data-path-id')]),
    interactionTargets:uniq([...dataValues(raw,'data-interaction-target'),...dataValues(raw,'data-object-id'),...dataValues(raw,'data-npc')]),
    capabilities:{canvas:/<canvas\b/i.test(raw),threeDimensional:/data-spatial-dimension=["']3d["']|data-player-z=|data-camera-yaw=|data-camera-pitch=/i.test(raw),collision:/collision|collider|data-collision/i.test(lower),raycastOrPath:/raycast|navmesh|pathfind|data-raycast|data-route|data-path/i.test(lower),realInput:/addEventListener\s*\(\s*['"](?:click|pointerdown|pointerup|touchstart|touchend|keydown|keyup)/i.test(raw),touchInput:/touchstart|touchend|pointerdown|pointerup/i.test(lower),interactions:/data-interactable|data-interaction-target|data-npc|data-object-id/i.test(raw),saveState:/localStorage|sessionStorage/i.test(raw),economy:/coin|gold|currency|resource|price|cost|shop|buy|sell|econom/i.test(lower),difficulty:/difficulty|level|wave|stage|enemyhp|enemydamage|scal/i.test(lower),frameLoop:/requestAnimationFrame|setInterval|setTimeout/i.test(raw),randomness:/Math\.random\s*\(|crypto\.getRandomValues\s*\(/i.test(raw),replaySeedContract:/data-replay-seed|data-rng-seed|data-world-seed|replaySeed|__GAME_REPLAY_SEED__|__GAME_SEED__/i.test(raw),winPath:/victory|win\b|목표 달성|선승/i.test(raw),failPath:/defeat|lose\b|gameover|패배|shutdown|destroyed/i.test(raw)}
  };
}

export function buildVibePatchPlan({gameplaySketch={},sourceAnalysis={},codingArchitecture=null,expertDevelopment=null,inventory=[],blockers=[]}={}){
  const tasks=[],add=(id,reason,dependsOn=[])=>{if(!tasks.some(t=>t.id===id))tasks.push({id,reason,dependsOn});};
  const preserveDependency=sourceAnalysis.present?['PRESERVE_EXISTING_BEHAVIOR']:[];
  if(!sourceAnalysis.present)add('IMPLEMENT_CORE_SOURCE','No preserved source is available; implement the locked gameplay sketch without inventing a different game.');
  else add('PRESERVE_EXISTING_BEHAVIOR','Patch the existing game in place; do not replace unrelated working systems.');
  if(sourceAnalysis.storageKeys?.length)add('PRESERVE_SAVE_CONTRACT',`Keep existing save keys and meanings: ${sourceAnalysis.storageKeys.join(', ')}`,['PRESERVE_EXISTING_BEHAVIOR']);
  if(codingArchitecture){
    add('ESTABLISH_CODING_ARCHITECTURE','Apply logical module boundaries, state ownership, data schema, API contracts and event contracts before broad feature implementation.',preserveDependency);
    if(codingArchitecture.developmentMode==='GREENFIELD')add('IMPLEMENT_GREENFIELD_ARCHITECTURE_FIRST','No existing source is required: lock architecture and contracts before feature code.',['ESTABLISH_CODING_ARCHITECTURE']);
    if(codingArchitecture.developmentMode==='PRESERVE_PATCH')add('PRESERVE_PATCH_CURRENT_CODEBASE','Analyze current code, preserve working behavior/save semantics and patch only responsible systems.',['ESTABLISH_CODING_ARCHITECTURE','PRESERVE_EXISTING_BEHAVIOR']);
    if(codingArchitecture.developmentMode==='RECOMPOSE')add('RECOMPOSE_ALLOWED_COMPONENTS_INTO_NEW_ARCHITECTURE','Abstract allowed mechanics/flow from references and implement a coherent new architecture; do not copy unauthorized external source/assets/text.',['ESTABLISH_CODING_ARCHITECTURE']);
    add('IMPLEMENT_FEATURE_UNITS_WITH_MICRO_TESTS','Implement one coherent feature unit at a time; syntax/type/import check, targeted micro runtime test and invariant check must happen before the next unit.',['ESTABLISH_CODING_ARCHITECTURE']);
    add('ENFORCE_STATE_OWNERSHIP_APIS_AND_INVARIANTS','Do not mutate foreign system state directly; enforce declared APIs, idempotent events and runtime correctness invariants.',['ESTABLISH_CODING_ARCHITECTURE']);
    add('PREDICT_CHANGE_IMPACT_BEFORE_PATCH','Predict affected dependent systems and required targeted checks before modifying code.',['ESTABLISH_CODING_ARCHITECTURE']);
    add('GENERATE_REGRESSION_CASE_PER_FEATURE_OR_BUG','Each new feature and fixed defect must add or update a focused regression case so the same failure cannot silently return.',['IMPLEMENT_FEATURE_UNITS_WITH_MICRO_TESTS']);
    add('APPLY_RECOVERY_PERFORMANCE_AND_CHANGE_BUDGET','Handle invalid/missing state safely, avoid duplicate partial effects, prevent unbounded runtime patterns and keep changes minimally coherent.',['IMPLEMENT_FEATURE_UNITS_WITH_MICRO_TESTS']);
  }
  if(expertDevelopment){
    if(sourceAnalysis.present)add('ESTABLISH_RESPONSIBILITY_GRAPH','Map real functions, call edges, state writers, storage owners and event entrypoints before selecting a patch target.',preserveDependency);
    if((blockers||[]).length)add('TRACE_FAILURE_TO_PRIMARY_STATE_WRITER','For every observed failure, trace from evidence to responsible system, primary function, written state, callers and downstream dependents before editing.',['ESTABLISH_RESPONSIBILITY_GRAPH']);
    add('VERIFY_END_TO_END_BEHAVIOR_CHAINS','A feature is complete only when real input reaches the responsible function, mutates owned state and produces an observable gameplay result; labels or function existence do not count.',['IMPLEMENT_FEATURE_UNITS_WITH_MICRO_TESTS']);
    add('RUN_SENIOR_CODE_REVIEW_GATE','Before accepting the candidate, reject duplicate causal handlers and repeated-loop timer accumulation; review god functions, broad mutation and save-boundary violations.',['IMPLEMENT_FEATURE_UNITS_WITH_MICRO_TESTS']);
    for(const blocker of expertDevelopment.seniorCodeReview?.hardBlockers||[])add(`FIX_${clean(blocker).replace(/[^A-Za-z0-9]+/g,'_').slice(0,64)}`,`Resolve deterministic senior code-review blocker: ${clean(blocker)}`,['RUN_SENIOR_CODE_REVIEW_GATE']);
  }
  if(gameplaySketch?.flowArchitecture){
    add('IMPLEMENT_GAME_FLOW_ARCHITECTURE','Implement the selected 2-4 macro Flow DNA as real gameplay structure; do not repeat one renamed loop across the entire game.',preserveDependency);
    add('IMPLEMENT_FLOW_PHASE_TRANSITIONS','Early, mid and late play must change dominant flow, decision structure or pressure type.',['IMPLEMENT_GAME_FLOW_ARCHITECTURE']);
    add('IMPLEMENT_PARALLEL_GOALS_AND_BRANCH_CONSEQUENCES','Maintain parallel objective threads and make route/choice consequences change later gameplay.',['IMPLEMENT_GAME_FLOW_ARCHITECTURE']);
    add('IMPLEMENT_WORLD_REACTIVITY_AND_NPC_INITIATIVE','World/NPC/enemy/economy/access state must react to player action or neglect; relevant world actors may initiate events.',['IMPLEMENT_GAME_FLOW_ARCHITECTURE']);
    add('IMPLEMENT_DISTINCT_FAILURE_AND_VICTORY_STRUCTURES','Use multiple context-appropriate failure costs and success structures rather than death/retry and boss-kill only.',['IMPLEMENT_GAME_FLOW_ARCHITECTURE']);
    add('IMPLEMENT_PLAYSTYLE_AND_REGION_RULE_VARIATION','Support at least two meaningful playstyle routes and real rule differences across major regions.',['IMPLEMENT_GAME_FLOW_ARCHITECTURE']);
    add('IMPLEMENT_SESSION_RHYTHM_INFORMATION_AND_REVISIT','Provide short/medium/long session value, tension/recovery rhythm, earned information and meaningful revisit changes.',['IMPLEMENT_GAME_FLOW_ARCHITECTURE']);
  }
  if(gameplaySketch?.worldModel?.requiresPlayableSpace)add('IMPLEMENT_PLAYABLE_SPACE','Playable map/world state must affect movement, routes, collision, placement or objectives.',preserveDependency);
  if(gameplaySketch?.interactionGraph?.required)add('IMPLEMENT_ENTITY_INTERACTIONS','Character/NPC/object interaction must change target state and game outcome.',['IMPLEMENT_PLAYABLE_SPACE']);
  if(gameplaySketch?.placementModel?.required)add('IMPLEMENT_POSITIONAL_PLACEMENT','Placement requires real position selection, entity placement and gameplay effect.',['IMPLEMENT_PLAYABLE_SPACE']);
  if(gameplaySketch?.combatModel?.strategicOutcomeDifferenceRequired)add('IMPLEMENT_DIVERGENT_STRATEGY_RESULTS','Different strategic choices must produce observably different combat/world outcomes.');
  if(sourceAnalysis.capabilities?.randomness&&!sourceAnalysis.capabilities?.replaySeedContract)add('IMPLEMENT_REPLAY_SEED_CONTRACT','Randomized gameplay must expose a stable replay seed and accept replaySeed so the same input trace can be independently reproduced.',preserveDependency);
  if(gameplaySketch?.progressionModel?.required)add('CONNECT_PROGRESSION','Rewards, objectives and unlocks must connect back into the core loop.');
  if(gameplaySketch?.expansionPlan?.requiredForFinalDepth)add('EXPAND_MEANINGFUL_CONTENT','Final depth must add new enemy/area/objective/interaction/strategy/flow dimensions; repetition and retry time do not count.');
  for(const blocker of uniq(blockers).slice(0,24))add(`FIX_${clean(blocker).replace(/[^A-Za-z0-9]+/g,'_').slice(0,64)}`,`Resolve validator/rework failure: ${clean(blocker)}`);
  const developmentMode=codingArchitecture?.developmentMode||null;
  const mode=developmentMode==='GREENFIELD'?'GREENFIELD_ARCHITECT_THEN_IMPLEMENT':developmentMode==='RECOMPOSE'?'RECOMPOSE_ALLOWED_COMPONENTS_INTO_NEW_ARCHITECTURE':'PATCH_EXISTING_RESPONSIBLE_SYSTEMS';
  return{version:4,mode,developmentMode,forbidden:['FULL_GAME_REWRITE_WHEN_SOURCE_EXISTS','SAVE_KEY_OR_MEANING_BREAK','TEMPLATE_SWAP_TO_HIDE_MISSING_FEATURES','STATIC_LABEL_AS_IMPLEMENTATION','VALIDATION_PROXY_AS_GAMEPLAY','SAME_MACRO_LOOP_RENAMED_ACROSS_ALL_PHASES','COSMETIC_ONLY_FLOW_VARIATION','WRITE_COMPLEX_GAME_IN_ONE_UNVERIFIED_PASS','DIRECT_CROSS_SYSTEM_STATE_MUTATION','UNAUTHORIZED_EXTERNAL_SOURCE_ASSET_OR_TEXT_COPY','PATCH_WITHOUT_RESPONSIBILITY_TRACE_WHEN_FAILURE_EVIDENCE_EXISTS','ACCEPT_HARD_SENIOR_REVIEW_BLOCKER'],preserve:{storageKeys:sourceAnalysis.storageKeys||[],workingFunctions:(sourceAnalysis.functions||[]).slice(0,30),mechanicIds:sourceAnalysis.mechanicIds||[]},approvedScopeIds:inventory.map(x=>clean(x?.id)).filter(Boolean),tasks,verificationOrder:['FLOW_ARCHITECTURE_CONTRACT','CODING_ARCHITECTURE_CONTRACT','RESPONSIBILITY_GRAPH','CAUSAL_DEBUG_TARGET','SYNTAX_TYPE_IMPORT_CHECK','SYSTEM_MICRO_RUNTIME_TESTS','INVARIANT_CHECKS','END_TO_END_BEHAVIOR_CHAINS','SENIOR_CODE_REVIEW','STATIC_CONTRACT','MOBILE_RUNTIME','REAL_INPUT_AND_STATE_CHANGE','APPROVED_SCOPE_BEHAVIOR','WIN_AND_FAIL','LONG_GOAL_PLAY','REPLAY_REGRESSION','SAVE_RESTORE','SOFTLOCK','ECONOMY','DIFFICULTY','PERFORMANCE','FULL_CANONICAL_VALIDATION','FINAL_CONTENT_DEPTH_WHEN_APPLICABLE']};
}

export function buildDependencyAnalysis({sourceAnalysis={},patchPlan={},expertDevelopment=null}={}){
  const taskEdges=[];for(const task of patchPlan.tasks||[])for(const dependency of task.dependsOn||[])taskEdges.push(`${dependency}->${task.id}`);
  const responsibilityEdges=(expertDevelopment?.responsibilityGraph?.edges||[]).map(edge=>`${edge.from}->${edge.to}`);
  return{version:2,sourceFunctionEdges:uniq(sourceAnalysis.functionDependencies||[]),sourceResponsibilityEdges:uniq(responsibilityEdges),stateWriters:expertDevelopment?.responsibilityGraph?.stateWriters||[],storageOwners:expertDevelopment?.responsibilityGraph?.storageOwners||[],patchTaskEdges:uniq(taskEdges),protectedSaveKeys:uniq(sourceAnalysis.storageKeys||[]),protectedWorkingFunctions:uniq(sourceAnalysis.functions||[]).slice(0,40),rule:'TRACE_FAILURE_TO_RESPONSIBLE_STATE_WRITER; PATCH_DEPENDENCIES_BEFORE_DEPENDENTS_AND_REVALIDATE_AFFECTED_SYSTEMS'};
}

function classifyFailure(value){
  const upper=clean(value).toUpperCase();
  if(/SAVE|STORAGE|RESTORE|LOAD/.test(upper))return'SAVE_REGRESSION';
  if(/REPLAY|DETERMIN|SAME_SEED|SAME_INPUT/.test(upper))return'REPLAY_REGRESSION';
  if(/MOBILE|VIEWPORT|TOUCH|POINTER/.test(upper))return'MOBILE_RUNTIME';
  if(/SENIOR_REVIEW|GOD_FUNCTION|STATE_WRITER|EVENT_HANDLER|TIMER|RESPONSIBILITY|CAUSAL_TRACE/.test(upper))return'EXPERT_CODE_QUALITY';
  if(/CODING|ARCHITECT|STATE_OWNER|INVARIANT|MICRO_TEST|REGRESSION_CASE|IMPACT|DUPLICATE_CAUSAL|CROSS_SYSTEM/.test(upper))return'CODING_ARCHITECTURE';
  if(/FLOW|PHASE|BRANCH|WORLD_REACT|REGION_RULE|PLAYSTYLE|ENDING/.test(upper))return'GAME_FLOW_ARCHITECTURE';
  if(/CONTENT|30MIN|DEPTH|REPET|LONG_GOAL/.test(upper))return'CONTENT_DEPTH';
  if(/INTERACTION|NPC|OBJECT/.test(upper))return'ENTITY_INTERACTION';
  if(/SPATIAL|3D|ROUTE|COLLISION|PLACEMENT|TOWER/.test(upper))return'SPATIAL_GAMEPLAY';
  if(/STRATEG|OUTCOME|CHOICE/.test(upper))return'STRATEGY_OUTCOME';
  if(/ECONOM|CURRENCY|PRICE|REWARD|RESOURCE/.test(upper))return'ECONOMY_BALANCE';
  if(/DIFFICULT|DAMAGE|HEALTH|WAVE|SCAL/.test(upper))return'DIFFICULTY_CURVE';
  if(/PERFORMANCE|FRAME|FPS|MEMORY|CPU|JANK/.test(upper))return'PERFORMANCE_RUNTIME';
  if(/WIN|FAIL|SOFTLOCK|GOAL|PROGRESS|TERMINAL/.test(upper))return'STATE_MACHINE';
  return'GENERAL_RUNTIME';
}

export function buildRuntimeValidationPlan({gameplaySketch={},sourceAnalysis={}}={}){
  const hasSave=Boolean(sourceAnalysis.capabilities?.saveState||sourceAnalysis.storageKeys?.length),needsEconomy=Boolean(gameplaySketch?.economyModel?.required||sourceAnalysis.capabilities?.economy),needsStrategy=Boolean(gameplaySketch?.combatModel?.strategicOutcomeDifferenceRequired);
  return{
    version:2,mode:'INDEPENDENT_RUNTIME_EVIDENCE',
    longGoal:{required:true,contract:'ADVANCE_REAL_OBJECTIVES_WITHOUT_TIME_SKIP_OR_VALIDATION_PROXY_AND_ACCUMULATE_NEW_GAMEPLAY_DIMENSIONS'},
    replayRegression:{required:true,contract:'REPLAY_SAME_SEED_AND_INPUT_SEQUENCE_OR_EQUIVALENT_SCENARIO_AND_COMPARE_CRITICAL_STATE_TRANSITIONS',randomizedGameRequiresReplaySeedContract:sourceAnalysis.capabilities?.randomness===true},
    softlock:{required:true,contract:'NO_NON_TERMINAL_STATE_MAY_REMOVE_ALL_MEANINGFUL_PROGRESS_ACTIONS_WITHOUT_A_REAL_RETRY_OR_EXIT_PATH'},
    saveRestore:{required:hasSave,protectedKeys:uniq(sourceAnalysis.storageKeys||[]),readKeys:uniq(sourceAnalysis.storageReads||[]),writeKeys:uniq(sourceAnalysis.storageWrites||[]),contract:'SAVE_THEN_RELOAD_OR_REENTER_MUST_RESTORE_MEANINGFUL_PROGRESS_WITHOUT_CHANGING_EXISTING_KEY_MEANING'},
    economy:{required:needsEconomy,contract:'RESOURCE_SOURCES_SINKS_COSTS_AND_REWARDS_MUST_CHANGE_THROUGH_REAL_PLAY_WITHOUT_FREE_OR_NEGATIVE_EXPLOIT_LOOPS'},
    difficulty:{required:true,contract:'PROGRESSION_MUST_NOT_CREATE_IMMEDIATE_UNAVOIDABLE_FAILURE_OR_ZERO_PRESSURE_STALL_ACROSS_OBSERVED_STAGES'},
    performance:{required:true,contract:'MOBILE_RUNTIME_MUST_REMAIN_RESPONSIVE_DURING_ACTIVE_GAMEPLAY_WITH_BOUNDED_ERROR_AND_FRAME_STALL_EVIDENCE'},
    mobile:{required:true,contract:'390X844_TOUCH_OR_POINTER_GAMEPLAY_INPUT_MUST_REACH_CORE_ACTIONS_WITHOUT_CLIPPED_REQUIRED_CONTROLS'},
    strategyOutcomes:{required:needsStrategy,contract:'AT_LEAST_TWO_DISTINCT_STRATEGIC_CHOICES_MUST_PRODUCE_OBSERVABLY_DIFFERENT_COMBAT_OR_WORLD_OUTCOMES'},
    contentDepth:{required:Boolean(gameplaySketch?.expansionPlan?.requiredForFinalDepth),contract:'RETRY_IDLE_AND_DUPLICATE_ACTION_TIME_EXCLUDED; NEW_ENEMY_AREA_OBJECTIVE_INTERACTION_STRATEGY_OR_FLOW_RESULTS_REQUIRED'},
  };
}

export function runtimeValidationBlockers({plan={},evidence={}}={}){
  const blockers=[];
  const checks=[
    ['longGoal','LONG_GOAL_PLAY_FAILED'],['replayRegression','REPLAY_SAME_SEED_MISMATCH'],['softlock','SOFTLOCK_PROGRESS_PATH_FAILED'],
    ['saveRestore','SAVE_RESTORE_FAILED'],['economy','ECONOMY_RUNTIME_FAILED'],['difficulty','DIFFICULTY_RUNTIME_FAILED'],
    ['performance','PERFORMANCE_RUNTIME_FAILED'],['mobile','MOBILE_RUNTIME_FAILED'],['strategyOutcomes','STRATEGY_OUTCOME_DIVERGENCE_FAILED'],['contentDepth','FINAL_CONTENT_DEPTH_FAILED'],
  ];
  for(const [key,code] of checks){
    const requirement=plan?.[key];if(requirement?.required!==true)continue;
    const observed=evidence?.[key];
    if(!observed||observed.pass!==true)blockers.push(code);
  }
  for(const item of strings(evidence?.blockers))blockers.push(item);
  return uniq(blockers);
}

export function runtimeEvidenceFromValidationReport(report={}){
  const evidence=report?.runtimeValidationEvidence;
  return evidence&&typeof evidence==='object'&&!Array.isArray(evidence)?evidence:null;
}
export function loadCanonicalRuntimeEvidence({evidencePath=process.env.WEB_FINAL_CONTENT_DEPTH_EVIDENCE_PATH||'',runtimeBranch=process.env.COMPANY_RUNTIME_BRANCH||'company-runtime'}={}){
  const file=clean(evidencePath),branch=clean(runtimeBranch);if(!file)return null;
  try{if(fs.existsSync(file))return runtimeEvidenceFromValidationReport(JSON.parse(fs.readFileSync(file,'utf8')));}catch{}
  if(!branch)return null;
  try{
    const raw=execFileSync('git',['show',`origin/${branch}:${file}`],{encoding:'utf8',maxBuffer:8*1024*1024,stdio:['ignore','pipe','ignore']});
    return runtimeEvidenceFromValidationReport(JSON.parse(raw));
  }catch{return null;}
}

export function buildFailureDrivenRepairLoop({blockers=[],patchPlan={},runtimeValidationPlan=null,runtimeEvidence=null,expertDevelopment=null}={}){
  const runtimeBlockers=runtimeValidationPlan&&runtimeEvidence?runtimeValidationBlockers({plan:runtimeValidationPlan,evidence:runtimeEvidence}):[];
  const failures=uniq([...blockers,...runtimeBlockers]).slice(0,32),classifications=failures.map(value=>({failure:value,type:classifyFailure(value)}));
  const repairTaskIds=(patchPlan.tasks||[]).filter(task=>task.id.startsWith('FIX_')||task.id.startsWith('IMPLEMENT_FLOW_')||task.id.startsWith('IMPLEMENT_FEATURE_')||['ESTABLISH_CODING_ARCHITECTURE','IMPLEMENT_GREENFIELD_ARCHITECTURE_FIRST','PRESERVE_PATCH_CURRENT_CODEBASE','RECOMPOSE_ALLOWED_COMPONENTS_INTO_NEW_ARCHITECTURE','ENFORCE_STATE_OWNERSHIP_APIS_AND_INVARIANTS','PREDICT_CHANGE_IMPACT_BEFORE_PATCH','GENERATE_REGRESSION_CASE_PER_FEATURE_OR_BUG','APPLY_RECOVERY_PERFORMANCE_AND_CHANGE_BUDGET','ESTABLISH_RESPONSIBILITY_GRAPH','TRACE_FAILURE_TO_PRIMARY_STATE_WRITER','VERIFY_END_TO_END_BEHAVIOR_CHAINS','RUN_SENIOR_CODE_REVIEW_GATE','IMPLEMENT_GAME_FLOW_ARCHITECTURE','IMPLEMENT_PARALLEL_GOALS_AND_BRANCH_CONSEQUENCES','IMPLEMENT_WORLD_REACTIVITY_AND_NPC_INITIATIVE','IMPLEMENT_DISTINCT_FAILURE_AND_VICTORY_STRUCTURES','IMPLEMENT_PLAYSTYLE_AND_REGION_RULE_VARIATION','IMPLEMENT_SESSION_RHYTHM_INFORMATION_AND_REVISIT','IMPLEMENT_PLAYABLE_SPACE','IMPLEMENT_ENTITY_INTERACTIONS','IMPLEMENT_POSITIONAL_PLACEMENT','IMPLEMENT_DIVERGENT_STRATEGY_RESULTS','IMPLEMENT_REPLAY_SEED_CONTRACT','CONNECT_PROGRESSION','EXPAND_MEANINGFUL_CONTENT'].includes(task.id)).map(task=>task.id);
  const causalDebug=buildCausalDebugPlan({failures,responsibilityGraph:expertDevelopment?.responsibilityGraph||{}});
  return{version:6,mode:'FAILURE_DRIVEN_TARGETED_REPAIR',failures:classifications,runtimeEvidenceBound:Boolean(runtimeEvidence&&typeof runtimeEvidence==='object'),runtimeFailureCount:runtimeBlockers.length,repairTaskIds:uniq(repairTaskIds),causalTraces:causalDebug.traces,responsibleTargets:causalDebug.responsibleTargets,retryContract:['READ_FAILURE_EVIDENCE','REPRODUCE_FAILURE','TRACE_TO_PRIMARY_STATE_WRITER','TRACE_CALLERS_AND_DEPENDENTS','PREDICT_AFFECTED_SYSTEMS','PATCH_MINIMUM_COHERENT_RESPONSIBLE_BLOCK','RUN_RELEVANT_MICRO_RUNTIME_TEST','VERIFY_END_TO_END_BEHAVIOR_CHAIN','CHECK_STATE_OWNERSHIP_AND_INVARIANTS','RUN_SENIOR_CODE_REVIEW','ADD_OR_UPDATE_REGRESSION_CASE','RERUN_FAILED_VALIDATION','VERIFY_FLOW_ARCHITECTURE_WHEN_RELEVANT','RUN_LONG_GOAL_PLAY_WHEN_RELEVANT','RUN_REPLAY_REGRESSION','VERIFY_SAVE_RESTORE','VERIFY_SOFTLOCK_ECONOMY_DIFFICULTY_PERFORMANCE_MOBILE','PRESERVE_SAVE_AND_WORKING_BEHAVIOR'],stopCondition:'ORIGINAL_FAILURES_CLEARED_WITH_SENIOR_REVIEW_AND_DEPENDENT_REGRESSION_GREEN'};
}

export function buildVibeDevelopmentContext({gameId='',genre='',baseline={},inventory=[],existingHtml='',blockers=[],runtimeEvidence=undefined,developmentMode=''}={}){
  const boundRuntimeEvidence=runtimeEvidence===undefined?loadCanonicalRuntimeEvidence():runtimeEvidence;
  const gameplaySketch=deriveGameplaySketch({gameId,genre,baseline,inventory}),flowArchitectureValidation=evaluateGameFlowArchitecture(gameplaySketch.flowArchitecture||{}),sourceAnalysis=analyzeExistingGameSource(existingHtml),codingArchitecture=buildCodingArchitecture({gameId,genre,baseline,gameplaySketch,sourceAnalysis,explicitDevelopmentMode:developmentMode}),codingArchitectureValidation=evaluateCodingArchitecture(codingArchitecture),expertDevelopment=buildExpertDevelopmentAnalysis({source:existingHtml,sourceAnalysis,gameplaySketch,failures:blockers}),patchPlan=buildVibePatchPlan({gameplaySketch,sourceAnalysis,codingArchitecture,expertDevelopment,inventory,blockers}),dependencyAnalysis=buildDependencyAnalysis({sourceAnalysis,patchPlan,expertDevelopment}),runtimeValidationPlan=buildRuntimeValidationPlan({gameplaySketch,sourceAnalysis}),repairLoop=buildFailureDrivenRepairLoop({blockers,patchPlan,runtimeValidationPlan,runtimeEvidence:boundRuntimeEvidence,expertDevelopment});
  return{version:7,gameplaySketch,flowArchitectureValidation,codingArchitecture,codingArchitectureValidation,sourceAnalysis,responsibilityGraph:expertDevelopment.responsibilityGraph,causalDebug:repairLoop.causalTraces?.length?{...expertDevelopment.causalDebug,traces:repairLoop.causalTraces,responsibleTargets:repairLoop.responsibleTargets}:expertDevelopment.causalDebug,behaviorChains:expertDevelopment.behaviorChains,seniorCodeReview:expertDevelopment.seniorCodeReview,dependencyAnalysis,patchPlan,repairLoop,runtimeValidationPlan,runtimeEvidence:boundRuntimeEvidence};
}

export function clipPreservedSourceForModel(source='',max=24000){
  const raw=String(source||'');if(raw.length<=max)return raw;
  const marker='\n<!-- VIBE2_SOURCE_MIDDLE_OMITTED_FOR_CONTEXT; PATCH EXISTING SOURCE, DO NOT REPLACE GAME -->\n',budget=Math.max(2000,max-marker.length),head=Math.floor(budget*0.58),tail=budget-head;
  return raw.slice(0,head)+marker+raw.slice(-tail);
}
