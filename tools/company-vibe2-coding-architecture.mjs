const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const uniq=values=>[...new Set((values||[]).map(clean).filter(Boolean))];
const truthy=v=>v===true||['TRUE','YES','OWNED_OR_AUTHORIZED','AUTHORIZED','OWNED'].includes(clean(v).toUpperCase());

export const DEVELOPMENT_MODES=Object.freeze(['GREENFIELD','PRESERVE_PATCH','RECOMPOSE']);

function contentOf(baseline={}){return baseline?.content&&typeof baseline.content==='object'?baseline.content:{};}
function explicitMode(baseline={}){
  const c=contentOf(baseline);
  return clean(baseline.developmentMode||baseline.DEVELOPMENT_MODE||c.developmentMode||c.DEVELOPMENT_MODE||baseline.recomposition?.developmentMode).toUpperCase();
}
function referenceRows(baseline={}){
  const c=contentOf(baseline),rows=[
    ...(Array.isArray(baseline.recomposition?.sources)?baseline.recomposition.sources:[]),
    ...(Array.isArray(baseline.recompositionSources)?baseline.recompositionSources:[]),
    ...(Array.isArray(c.recompositionSources)?c.recompositionSources:[]),
    ...(Array.isArray(baseline.referenceGames)?baseline.referenceGames:[]),
    ...(Array.isArray(c.referenceGames)?c.referenceGames:[]),
  ];
  return rows.map((row,index)=>typeof row==='string'?{id:`reference-${index+1}`,name:clean(row),rights:'REFERENCE_ONLY'}:{id:clean(row?.id||row?.name||`reference-${index+1}`),name:clean(row?.name||row?.title||row?.id||`reference-${index+1}`),rights:clean(row?.rights||row?.sourceRights||row?.license||'REFERENCE_ONLY').toUpperCase(),allowedUse:clean(row?.allowedUse||row?.use||'')}).filter(row=>row.name||row.id);
}

export function resolveDevelopmentMode({baseline={},sourceAnalysis={},existingSource='',explicitDevelopmentMode=''}={}){
  const requested=clean(explicitDevelopmentMode||explicitMode(baseline)).toUpperCase();
  if(DEVELOPMENT_MODES.includes(requested))return requested;
  if(referenceRows(baseline).length&&truthy(baseline.recomposition?.enabled??baseline.recompositionEnabled))return'RECOMPOSE';
  if(sourceAnalysis?.present||clean(existingSource))return'PRESERVE_PATCH';
  return'GREENFIELD';
}

function modeContract(mode,baseline={}){
  const refs=referenceRows(baseline),allSourceAuthorized=refs.length>0&&refs.every(row=>['OWNED_OR_AUTHORIZED','AUTHORIZED','OWNED'].includes(row.rights));
  if(mode==='PRESERVE_PATCH')return{
    mode,
    entryCondition:'EXISTING_SOURCE_PRESENT',
    primaryRule:'ANALYZE_CURRENT_SOURCE_FIRST_THEN_PATCH_MINIMUM_RESPONSIBLE_SYSTEM',
    sourcePolicy:'PRESERVE_WORKING_SOURCE_STRUCTURE_SAVE_KEYS_MEANINGS_AND_GAME_RULES',
    architecturePolicy:'DO_NOT_FORCE_GREENFIELD_REWRITE_OR_FILE_REORGANIZATION',
    refactorDefault:'OFF_UNLESS_REQUIRED_BY_CONCRETE_DEFECT_AND_BEHAVIOR_PRESERVED',
  };
  if(mode==='RECOMPOSE')return{
    mode,
    entryCondition:'MULTIPLE_ALLOWED_REFERENCE_COMPONENTS_OR_EXPLICIT_RECOMPOSITION_REQUEST',
    referenceCount:refs.length,
    references:refs.slice(0,12),
    sourceRightsMode:allSourceAuthorized?'AUTHORIZED_SOURCE_LEVEL_ANALYSIS_ALLOWED':'ABSTRACT_MECHANICS_AND_FLOW_ONLY',
    sourcePolicy:allSourceAuthorized?'AUTHORIZED_CODE_MAY_BE_ANALYZED_BUT_NEW_PROJECT_BOUNDARIES_AND_PROVENANCE_MUST_REMAIN_CLEAR':'DO_NOT_COPY_EXTERNAL_CODE_ASSETS_TEXT_LEVEL_LAYOUT_OR_PROPRIETARY_CONTENT',
    architecturePolicy:'EXTRACT_ALLOWED_MECHANICS_FLOW_AND_SYSTEM_IDEAS_THEN_BUILD_A_COHERENT_NEW_ARCHITECTURE',
    originalityRule:'COMBINATION_MUST_PRODUCE_NEW_INTERCONNECTED_GAMEPLAY_NOT_A_PATCHWORK_OF_UNCHANGED_REFERENCE_PARTS',
  };
  return{
    mode:'GREENFIELD',
    entryCondition:'NO_EXISTING_SOURCE_REQUIRED',
    primaryRule:'DESIGN_ARCHITECTURE_AND_CONTRACTS_BEFORE_WRITING_FEATURE_CODE',
    sourcePolicy:'FRESH_IMPLEMENTATION_FROM_LOCKED_DESIGN',
    architecturePolicy:'ESTABLISH_CLEAR_LOGICAL_MODULE_STATE_OWNERSHIP_APIS_EVENTS_AND_SAVE_SCHEMA_BEFORE_FEATURE_IMPLEMENTATION',
    refactorDefault:'NOT_APPLICABLE_DURING_INITIAL_IMPLEMENTATION',
  };
}

function activeSystems({gameplaySketch={},sourceAnalysis={}}={}){
  const systems=['CORE_STATE','INPUT','PRESENTATION'];
  if(gameplaySketch?.worldModel?.requiresPlayableSpace||sourceAnalysis.capabilities?.collision||sourceAnalysis.areaIds?.length)systems.push('WORLD');
  if(gameplaySketch?.actors?.playerRequired!==false)systems.push('PLAYER');
  if(gameplaySketch?.combatModel?.required||sourceAnalysis.capabilities?.difficulty)systems.push('COMBAT');
  if(gameplaySketch?.actors?.enemyBehaviorRequired)systems.push('AI');
  if(gameplaySketch?.interactionGraph?.required||sourceAnalysis.capabilities?.interactions)systems.push('INTERACTION');
  if(gameplaySketch?.economyModel?.required||sourceAnalysis.capabilities?.economy)systems.push('ECONOMY');
  if(gameplaySketch?.progressionModel?.required)systems.push('PROGRESSION');
  if(gameplaySketch?.placementModel?.required)systems.push('PLACEMENT');
  if(sourceAnalysis.capabilities?.saveState||sourceAnalysis.storageKeys?.length)systems.push('SAVE');
  systems.push('GOAL_STATE');
  return uniq(systems);
}

function stateOwnership(systems=[]){
  const map={
    CORE_STATE:['runState','clock','rngSeed','phase'],INPUT:['inputState','pointerState','keyState'],PRESENTATION:['viewState','feedbackState'],WORLD:['worldEntities','regions','routes','collisionState'],PLAYER:['playerPosition','playerVitals','playerInventory'],COMBAT:['damageResolution','combatCooldowns','targetState'],AI:['enemyIntent','enemyNavigation','enemyState'],INTERACTION:['interactionTargets','interactionState'],ECONOMY:['currency','prices','resourceLedger'],PROGRESSION:['objectives','unlocks','progressionState'],PLACEMENT:['placementSlots','placedEntities'],SAVE:['saveSchemaVersion','serializedProgress'],GOAL_STATE:['victoryState','failureState','retryState'],
  };
  return systems.map(system=>({system,owns:map[system]||[`${system.toLowerCase()}State`],writeRule:`ONLY_${system}_OR_DECLARED_API_MAY_MUTATE_OWNED_STATE`}));
}

function apiContracts(systems=[]){
  const apis=[
    ['CORE_STATE','transitionRunState(next,reason)','RUN_STATE_CHANGE'],
    ['INPUT','submitPlayerIntent(intent)','NORMALIZED_PLAYER_INTENT'],
    ['WORLD','queryWorld(position,action)','WORLD_QUERY_RESULT'],
    ['PLAYER','applyPlayerDelta(delta,reason)','PLAYER_STATE_DELTA'],
    ['COMBAT','resolveCombatAction(action)','COMBAT_OUTCOME'],
    ['AI','advanceAgentIntent(agentId,context)','AI_INTENT_RESULT'],
    ['INTERACTION','resolveInteraction(targetId,action)','INTERACTION_OUTCOME'],
    ['ECONOMY','applyTransaction(transaction)','ECONOMY_LEDGER_DELTA'],
    ['PROGRESSION','advanceObjective(event)','PROGRESSION_DELTA'],
    ['PLACEMENT','placeEntity(request)','PLACEMENT_OUTCOME'],
    ['SAVE','saveOrRestore(command)','SAVE_RESULT'],
    ['GOAL_STATE','evaluateGoalState(context)','GOAL_STATE_RESULT'],
    ['PRESENTATION','renderFromState(snapshot)','PRESENTATION_ONLY_NO_GAMEPLAY_MUTATION'],
  ];
  return apis.filter(([system])=>systems.includes(system)).map(([system,api,result])=>({system,api,result,rule:'CALL_API_INSTEAD_OF_MUTATING_FOREIGN_SYSTEM_STATE_DIRECTLY'}));
}

function eventContracts(systems=[]){
  const events=['PLAYER_INTENT','WORLD_ENTERED','ENTITY_INTERACTED','DAMAGE_APPLIED','ENTITY_DEFEATED','RESOURCE_CHANGED','OBJECTIVE_ADVANCED','AREA_UNLOCKED','PLACEMENT_COMPLETED','RUN_WON','RUN_FAILED','SAVE_COMMITTED','SAVE_RESTORED'];
  return events.map(name=>({name,delivery:'ONCE_PER_CAUSAL_ACTION',idempotency:'DUPLICATE_CAUSAL_EVENT_MUST_NOT_DUPLICATE_REWARD_DAMAGE_PURCHASE_OR_PROGRESS',observedBy:systems.slice(0,8)}));
}

function invariants({systems=[],gameplaySketch={}}={}){
  const rows=[
    ['STATE_OWNER_ONLY_WRITE','Gameplay state may only be mutated by its owner or declared API.'],
    ['NO_DUPLICATE_CAUSAL_REWARD','One causal completion may not grant the same reward twice.'],
    ['TERMINAL_STATE_STOPS_ACTIVE_ACTIONS','Defeated/removed/terminal entities may not continue active gameplay actions.'],
    ['GOAL_STATE_EXCLUSIVE','A run may not be simultaneously unresolved victory and unresolved defeat.'],
    ['NO_NAN_OR_INFINITE_GAMEPLAY_STATE','Critical numeric gameplay state must remain finite.'],
    ['INPUT_TO_STATE_CAUSALITY','Core input must either produce a valid state transition or an explicit rejected-action result.'],
    ['SAVE_SCHEMA_VERSIONED','Persisted critical state must have a known schema/version contract.'],
  ];
  if(systems.includes('PLAYER'))rows.push(['PLAYER_VITAL_BOUNDS','Player health/energy-like bounded values must remain within declared limits.']);
  if(systems.includes('ECONOMY'))rows.push(['ECONOMY_NO_UNDECLARED_NEGATIVE_BALANCE','Spendable resources cannot become negative unless debt is an explicit mechanic.']);
  if(systems.includes('PLACEMENT'))rows.push(['PLACEMENT_OCCUPANCY_CONSISTENT','A non-stackable placement slot cannot contain multiple mutually exclusive entities.']);
  if(gameplaySketch?.progressionModel?.required)rows.push(['PROGRESSION_REWARD_IDEMPOTENT','Objective completion/unlock rewards must be idempotent.']);
  return rows.map(([id,contract])=>({id,contract,severity:'HARD_INTERNAL_CORRECTNESS'}));
}

function implementationUnits(systems=[]){
  const preferred=['CORE_STATE','INPUT','WORLD','PLAYER','INTERACTION','ECONOMY','PROGRESSION','PLACEMENT','COMBAT','AI','GOAL_STATE','SAVE','PRESENTATION'];
  const selected=preferred.filter(x=>systems.includes(x));
  return selected.map((system,index)=>({
    id:`UNIT_${String(index+1).padStart(2,'0')}_${system}`,
    system,
    dependsOn:index===0?[]:[`UNIT_${String(index).padStart(2,'0')}_${selected[index-1]}`],
    loop:['PLAN_AFFECTED_STATE_AND_API','IMPLEMENT_SMALLEST_COHERENT_FEATURE','SYNTAX_OR_TYPE_CHECK','RUN_SYSTEM_MICRO_TEST','CHECK_INVARIANTS','GENERATE_OR_UPDATE_REGRESSION_CASE','ONLY_THEN_ADVANCE_TO_NEXT_UNIT'],
  }));
}

function microRuntimeTests(systems=[]){
  const specs={
    CORE_STATE:'exercise legal and illegal run-state transitions',INPUT:'inject normalized input and verify one causal intent',WORLD:'move/query across region route or collision boundary',PLAYER:'apply bounded movement/vital delta',INTERACTION:'target -> input -> target state change -> gameplay result',ECONOMY:'earn/spend/reject invalid transaction and verify ledger',PROGRESSION:'advance objective once and reject duplicate reward',PLACEMENT:'select real position -> materialize entity -> verify occupancy/world effect',COMBAT:'attack -> damage/cooldown -> terminal target behavior',AI:'advance enemy intent against changing world/player state',GOAL_STATE:'drive win/fail/retry transitions without impossible mixed terminal state',SAVE:'save -> reload/restore -> compare meaningful critical state',PRESENTATION:'render state changes without mutating gameplay ownership',
  };
  return systems.map(system=>({system,scope:'TARGETED_REPAIR_ITERATION_ONLY',spec:specs[system]||`exercise ${system} state transition`,cannotSubstituteFor:'FULL_CANONICAL_PROMOTION_VALIDATION'}));
}

function impactPrediction(systems=[]){
  const adjacency={
    CORE_STATE:['INPUT','GOAL_STATE','SAVE','PRESENTATION'],INPUT:['PLAYER','WORLD','INTERACTION','COMBAT','PLACEMENT'],WORLD:['PLAYER','AI','INTERACTION','PLACEMENT','GOAL_STATE'],PLAYER:['COMBAT','INTERACTION','PROGRESSION','SAVE','PRESENTATION'],COMBAT:['AI','PROGRESSION','ECONOMY','GOAL_STATE','SAVE'],AI:['COMBAT','WORLD','GOAL_STATE'],INTERACTION:['WORLD','ECONOMY','PROGRESSION','SAVE'],ECONOMY:['PROGRESSION','SAVE','PRESENTATION'],PROGRESSION:['WORLD','GOAL_STATE','SAVE','PRESENTATION'],PLACEMENT:['WORLD','COMBAT','ECONOMY','SAVE'],GOAL_STATE:['PROGRESSION','SAVE','PRESENTATION'],SAVE:['CORE_STATE','PLAYER','WORLD','ECONOMY','PROGRESSION'],PRESENTATION:[],
  };
  return systems.map(system=>({system,likelyAffected:(adjacency[system]||[]).filter(x=>systems.includes(x)),requiredChecks:['OWNER_STATE_INVARIANTS',`MICRO_${system}`,'DEPENDENT_SYSTEM_REGRESSION_IF_TOUCHED']}));
}

function regressionPlan(systems=[]){
  return systems.map(system=>({id:`REGRESSION_${system}`,trigger:`ANY_PATCH_TOUCHING_${system}_OR_ITS_OWNED_STATE`,assertions:['PRIOR_WORKING_BEHAVIOR_REMAINS','NEW_EXPECTED_BEHAVIOR_OBSERVED','NO_RELEVANT_INVARIANT_VIOLATION','NO_DUPLICATE_CAUSAL_EVENT']}));
}

function compactForModel(architecture={}){
  return{
    version:architecture.version,
    developmentMode:architecture.developmentMode,
    modeContract:architecture.modeContract,
    architectureOrder:architecture.architectureOrder,
    sourceLayout:architecture.sourceLayout,
    stateOwnership:(architecture.stateOwnership||[]).map(({system,owns})=>({system,owns})),
    apiContracts:(architecture.apiContracts||[]).map(({system,api})=>({system,api})),
    eventContract:'ONCE_PER_CAUSAL_ACTION; DUPLICATE_CAUSAL_EVENT_MUST_NOT_DUPLICATE_REWARD_DAMAGE_PURCHASE_OR_PROGRESS',
    codingLoop:architecture.codingLoop,
    microRuntimeContract:'TARGETED_REPAIR_ITERATION_ONLY; CANNOT_SUBSTITUTE_FOR_FULL_CANONICAL_PROMOTION_VALIDATION',
    invariantIds:(architecture.invariants||[]).map(row=>row.id),
    impactRule:'PREDICT_AFFECTED_SYSTEMS_BEFORE_PATCH_AND_RUN_DEPENDENT_REGRESSION_IF_TOUCHED',
    regressionRule:'ADD_OR_UPDATE_REGRESSION_CASE_PER_FEATURE_OR_FIXED_BUG',
    changeBudget:architecture.changeBudget,
    refactorPolicy:architecture.refactorPolicy,
    recoveryRules:architecture.recoveryPolicy?.rules,
    performanceRules:architecture.performancePolicy?.rules,
    selfReview:architecture.selfReview?.questions,
    forbidden:architecture.forbidden,
  };
}

export function buildCodingArchitecture({gameId='',genre='',baseline={},gameplaySketch={},sourceAnalysis={},explicitDevelopmentMode=''}={}){
  const developmentMode=resolveDevelopmentMode({baseline,sourceAnalysis,explicitDevelopmentMode}),mode=modeContract(developmentMode,baseline),systems=activeSystems({gameplaySketch,sourceAnalysis}),owners=stateOwnership(systems),units=implementationUnits(systems),apis=apiContracts(systems),events=eventContracts(systems),microTests=microRuntimeTests(systems),assertions=invariants({systems,gameplaySketch}),impact=impactPrediction(systems),regressions=regressionPlan(systems);
  const architecture={
    version:1,
    gameId:clean(gameId),genre:clean(genre),developmentMode,modeContract:mode,
    architectureOrder:['GAME_FLOW_ARCHITECT','GAMEPLAY_SKETCH','SYSTEM_BOUNDARIES','STATE_OWNERSHIP','DATA_SCHEMA','API_CONTRACTS','EVENT_CONTRACTS','IMPLEMENTATION_UNITS','MICRO_RUNTIME_TESTS','INTEGRATION','FULL_CANONICAL_VALIDATION','BUILD'],
    sourceLayout:{logicalModules:systems,physicalPolicy:developmentMode==='PRESERVE_PATCH'?'PRESERVE_EXISTING_PHYSICAL_LAYOUT':developmentMode==='GREENFIELD'?'PLATFORM_APPROPRIATE_MODULES':'NEW_COHERENT_PROJECT_LAYOUT_FROM_ALLOWED_COMPONENTS',webCompatibility:'WEB_CAN_REMAIN_SINGLE_SELF_CONTAINED_HTML_WHILE_KEEPING_LOGICAL_MODULE_BOUNDARIES',singleResponsibility:'ONE_MODULE_OR_FUNCTION_SHOULD_NOT_OWN_UNRELATED_WORLD_COMBAT_UI_SAVE_AND_ECONOMY_MUTATIONS'},
    stateOwnership:owners,
    dataSchema:{rule:'CRITICAL_ENTITY_PLAYER_WORLD_ECONOMY_PROGRESSION_AND_SAVE_STATE_MUST_HAVE_DECLARED_SHAPE_DEFAULTS_AND_VALIDATION',saveMigration:'VERSION_AND_MIGRATION_REQUIRED_WHEN_EXISTING_PERSISTED_SHAPE_CHANGES',corruptRecovery:'RECOVER_LAST_VALID_OR_SAFE_PARTIAL_STATE_WHEN_SUPPORTED_INSTEAD_OF_SILENT_TOTAL_RESET'},
    apiContracts:apis,eventContracts:events,
    implementationUnits:units,
    codingLoop:['PLAN_CHANGE','PREDICT_IMPACT','IMPLEMENT_ONE_COHERENT_UNIT','SYNTAX_TYPE_IMPORT_CHECK','MICRO_RUNTIME_TEST','INVARIANT_CHECK','ADD_OR_UPDATE_REGRESSION_CASE','SELF_REVIEW','INTEGRATE','FULL_VALIDATION_AT_CANONICAL_GATE'],
    microRuntimeTests:microTests,
    invariants:assertions,
    impactPrediction:impact,
    regressionPlan:regressions,
    changeBudget:{rule:'PREFER_MINIMUM_COHERENT_CHANGE_SET',warning:'SMALL_DEFECT_SHOULD_NOT_CAUSE_UNRELATED_MULTI_SYSTEM_REWRITE',preserveWorkingCode:developmentMode==='PRESERVE_PATCH'},
    refactorPolicy:{mode:'SEPARATE_FROM_FEATURE_CHANGE_WHEN_PRACTICAL',behaviorContract:'REFACTOR_MUST_PRESERVE_OBSERVABLE_GAMEPLAY_AND_SAVE_BEHAVIOR',requiredEvidence:['REPLAY_OR_EQUIVALENT_REGRESSION','SAVE_COMPATIBILITY_WHEN_APPLICABLE','MICRO_TESTS_FOR_TOUCHED_SYSTEMS']},
    duplicationPolicy:{rule:'DO_NOT_COPY_CORE_DAMAGE_SAVE_REWARD_TRANSACTION_OR_STATE_TRANSITION_LOGIC_ACROSS_UNRELATED_CALL_SITES',action:'CENTRALIZE_ONLY_WHEN_IT_REDUCES_DUPLICATE_CAUSAL_LOGIC_WITHOUT_FORCING_UNRELATED_REWRITE'},
    recoveryPolicy:{rules:['MISSING_ENTITY_REFERENCE_RETURNS_EXPLICIT_SAFE_FAILURE','INVALID_SAVE_DATA_MUST_NOT_CRASH_WHOLE_GAME','PARTIAL_FAILURE_MUST_NOT_DOUBLE_APPLY_TRANSACTION_OR_REWARD','RETRY_PATH_MUST_NOT_REUSE_DIRTY_PARTIAL_STATE_UNLESS_EXPLICITLY_DESIGNED']},
    performancePolicy:{rules:['NO_UNBOUNDED_PER_FRAME_DOM_REBUILD','NO_ACCIDENTAL_UNBOUNDED_TIMER_CREATION','NO_FULL_WORLD_SCAN_WHEN_A_BOUNDED_INDEX_OR_LOCAL_SCOPE_EXISTS','PROFILE_OR_MEASURE_BEFORE_LARGE_OPTIMIZATION_REWRITE']},
    selfReview:{questions:['DID_THE_CHANGE_IMPLEMENT_THE_LOCKED_REQUIREMENT','WHO_OWNS_EACH_MUTATED_STATE','CAN_ONE_INPUT_APPLY_THE_EFFECT_TWICE','WHAT_EXISTING_SYSTEMS_CAN_THIS_BREAK','WHAT_HAPPENS_ON_INVALID_OR_MISSING_STATE','DID_UI_OR_PRESENTATION_MUTATE_GAMEPLAY_DIRECTLY','ARE_SAVE_AND_REPLAY_SEMANTICS_PRESERVED','DID_THE_MICRO_TEST_AND_REGRESSION_CASE_COVER_THE_FAILURE_MODE']},
    forbidden:['WRITE_WHOLE_COMPLEX_GAME_IN_ONE_UNVERIFIED_PASS','DIRECT_CROSS_SYSTEM_STATE_MUTATION_WITHOUT_CONTRACT','MICRO_TEST_AS_SUBSTITUTE_FOR_FULL_PROMOTION_VALIDATION','UNAUTHORIZED_EXTERNAL_SOURCE_OR_ASSET_COPY','FEATURE_CHANGE_PLUS_UNRELATED_REFACTOR','STATIC_LABEL_OR_TEST_PANEL_AS_GAMEPLAY_IMPLEMENTATION'],
  };
  Object.defineProperty(architecture,'toJSON',{enumerable:false,value(){return compactForModel(architecture);}});
  return architecture;
}

export function evaluateCodingArchitecture(architecture={}){
  const blockers=[];
  if(!DEVELOPMENT_MODES.includes(clean(architecture.developmentMode)))blockers.push('CODING_DEVELOPMENT_MODE_INVALID');
  if((architecture.sourceLayout?.logicalModules||[]).length<5)blockers.push('CODING_LOGICAL_MODULE_BOUNDARIES_INSUFFICIENT');
  if((architecture.stateOwnership||[]).length<5)blockers.push('CODING_STATE_OWNERSHIP_INSUFFICIENT');
  if((architecture.apiContracts||[]).length<4)blockers.push('CODING_API_CONTRACTS_INSUFFICIENT');
  if((architecture.implementationUnits||[]).length<5)blockers.push('CODING_IMPLEMENTATION_UNITS_INSUFFICIENT');
  if((architecture.microRuntimeTests||[]).length<5)blockers.push('CODING_MICRO_RUNTIME_PLAN_INSUFFICIENT');
  if((architecture.invariants||[]).length<7)blockers.push('CODING_INVARIANTS_INSUFFICIENT');
  if((architecture.regressionPlan||[]).length<5)blockers.push('CODING_REGRESSION_PLAN_INSUFFICIENT');
  if(!(architecture.codingLoop||[]).includes('PREDICT_IMPACT'))blockers.push('CODING_IMPACT_PREDICTION_REQUIRED');
  if(!(architecture.codingLoop||[]).includes('ADD_OR_UPDATE_REGRESSION_CASE'))blockers.push('CODING_AUTO_REGRESSION_REQUIRED');
  if(architecture.developmentMode==='PRESERVE_PATCH'&&architecture.modeContract?.sourcePolicy!=='PRESERVE_WORKING_SOURCE_STRUCTURE_SAVE_KEYS_MEANINGS_AND_GAME_RULES')blockers.push('PRESERVE_PATCH_SOURCE_POLICY_REQUIRED');
  if(architecture.developmentMode==='RECOMPOSE'&&!architecture.modeContract?.sourceRightsMode)blockers.push('RECOMPOSE_RIGHTS_POLICY_REQUIRED');
  return{pass:blockers.length===0,blockers};
}