// 파일명: tools/vibe2-design-intelligence.mjs
// 역할: Vibe2의 설계 판단을 제약->비평->인과->플레이어 모델->수치 시뮬레이션->구현->실플레이 증거->리뷰->경험 승격 순서로 고정한다.
// 원칙: 분석은 승인 권한을 확대하지 않으며, 보호된 게임 규칙과 잠긴 아트북은 자동 변경하지 않는다.

const clean = (value) => String(value ?? '').trim();
const finite = (value) => Number.isFinite(Number(value)) ? Number(value) : null;
const unique = (values = []) => [...new Set((values || []).map(clean).filter(Boolean))];
const freeze = (value) => Object.freeze(value);
const freezeList = (values = []) => freeze([...values]);

export const DESIGN_INTELLIGENCE_STAGES = freezeList([
  'STABILITY_TRIAGE',
  'DEFECT_OWNERSHIP',
  'DESIGNER',
  'DESIGN_BLUEPRINT',
  'DESIGN_INTEGRITY',
  'CONTENT_DIVERSITY',
  'REFERENCE_HOMAGE',
  'NARRATIVE_DIALOGUE',
  'CONSTRAINT_ENGINE',
  'CRITIC',
  'CAUSALITY_GRAPH',
  'PLAYER_MODEL',
  'COMBAT_ECONOMY_SIMULATOR',
  'IMPLEMENTATION',
  'AUTO_PLAYER',
  'TELEMETRY',
  'DESIGN_REVIEW',
  'EXPERIENCE_MEMORY'
]);

const PLAYER_ARCHETYPES = freezeList([
  freeze({ id:'novice', label:'초보', focus:'이해 가능성, 생존, 첫 성공까지의 마찰' }),
  freeze({ id:'optimizer', label:'최적화형', focus:'최강 선택 고착, 우회/악용 가능성, 지배전략' }),
  freeze({ id:'farmer', label:'파밍형', focus:'반복 보상, 경제 폭주, 무한 루프' }),
  freeze({ id:'aggressive', label:'공격형', focus:'공격 편향의 보상과 과도한 위험' }),
  freeze({ id:'safe', label:'안전형', focus:'회피/회복/대기 전략의 과도한 효율' })
]);

function stage(name, status, details = {}) {
  return freeze({ name, status, ...details });
}

function normalizeConstraints(task = {}) {
  const rows = Array.isArray(task.designConstraints) ? task.designConstraints : [];
  return freezeList(rows.map((row, index) => freeze({
    id: clean(row?.id) || `constraint-${index + 1}`,
    rule: clean(row?.rule || row?.text || row?.value),
    locked: row?.locked !== false,
    proposedChange: clean(row?.proposedChange),
    preserves: row?.preserves === true,
    source: clean(row?.source) || 'task'
  })).filter((row) => row.rule));
}

function protectedFieldConflicts(task = {}) {
  const locked = new Set(unique(task?.approvedDesign?.lockedFields || []).map((value) => value.toLowerCase()));
  const proposed = unique(task?.proposedDesignChanges || []).map((value) => value.toLowerCase());
  return proposed.filter((value) => locked.has(value));
}

function normalizedFindings(task = {}) {
  const rows = [
    ...(Array.isArray(task.stabilitySignals) ? task.stabilitySignals : []),
    ...(Array.isArray(task.defects) ? task.defects : []),
    ...(Array.isArray(task?.designEvidence?.findings) ? task.designEvidence.findings : [])
  ];
  return rows.map((row, index) => typeof row === 'string'
    ? { id:`finding-${index + 1}`, symptom:clean(row), severity:'MEDIUM', causeClass:'UNRESOLVED_CAUSE', evidence:null }
    : {
        id:clean(row?.id) || `finding-${index + 1}`,
        symptom:clean(row?.symptom || row?.finding || row?.message),
        severity:clean(row?.severity || 'MEDIUM').toUpperCase(),
        causeClass:clean(row?.causeClass || row?.class || row?.layer).toUpperCase(),
        evidence:clean(row?.evidence || row?.runId || row?.path) || null
      }
  ).filter((row) => row.symptom);
}

function inferDefectClass(row = {}) {
  const explicit = clean(row.causeClass).toUpperCase();
  if (['IMPLEMENTATION_RUNTIME_DEFECT','DESIGN_DEFECT','MIXED_DEFECT','UNRESOLVED_CAUSE'].includes(explicit)) return explicit;
  const text = clean(row.symptom).toLowerCase();
  const runtime = /input.*(?:not|fail)|character.*(?:not moving|movement code)|animation.*(?:binding|not play)|null|exception|crash|save.*(?:runtime|load error)|desync|button.*(?:handler|click)|collision.*bug|navigation.*bug|입력.*안|캐릭터.*안 ?움직|애니.*안 ?나|크래시|런타임|세이브.*오류|동기화.*오류|버튼.*안 ?눌/.test(text);
  const design = /impossible prerequisite|unreachable progression|contradictory.*(?:rule|unlock)|no recovery path|required objective.*unreachable|no counterplay|economy.*dead.?end|knowledge.*contradiction|movement.*rule missing|traversal.*rule missing|퀘스트.*선행.*불가능|진행.*도달.*불가능|규칙.*모순|회복.*경로.*없|목표.*도달.*불가능|대응수단.*없|경제.*막힘|정보.*모순|이동.*규칙.*없/.test(text);
  if (runtime && design) return 'MIXED_DEFECT';
  if (runtime) return 'IMPLEMENTATION_RUNTIME_DEFECT';
  if (design) return 'DESIGN_DEFECT';
  return 'UNRESOLVED_CAUSE';
}

function evaluateStabilityTriage(task = {}) {
  const findings = normalizedFindings(task).map((row) => freeze({ ...row, causeClass:inferDefectClass(row) }));
  const rank = { CRITICAL:4, HIGH:3, MEDIUM:2, LOW:1 };
  const highest = findings.reduce((best, row) => (rank[row.severity] || 0) > (rank[best] || 0) ? row.severity : best, 'NONE');
  const blockers = findings.filter((row) => ['CRITICAL','HIGH'].includes(row.severity));
  const repeatedMinor = findings.filter((row) => ['MEDIUM','LOW'].includes(row.severity)).length >= 3;
  return stage('STABILITY_TRIAGE', blockers.length || repeatedMinor ? 'REPAIR_FIRST' : 'CLEAR_FOR_DESIGN_EVALUATION', {
    findings:freezeList(findings),
    highestSeverity:highest,
    repeatedMinorBugCluster:repeatedMinor,
    creativeExpansionMayProceed:blockers.length === 0 && !repeatedMinor,
    priorityRule:'STABILITY_AND_PROGRESS_BEFORE_CREATIVE_EXPANSION'
  });
}

function evaluateDefectOwnership(task = {}, stability = {}) {
  const classes = (stability.findings || []).map((row) => row.causeClass);
  const hasRuntime = classes.includes('IMPLEMENTATION_RUNTIME_DEFECT');
  const hasDesign = classes.includes('DESIGN_DEFECT');
  const hasMixed = classes.includes('MIXED_DEFECT');
  const hasUnresolved = classes.includes('UNRESOLVED_CAUSE');
  let owner='NONE', route='NO_DEFECT_SIGNAL', designRevisionAllowed=true;
  if (hasMixed || (hasRuntime && hasDesign)) {
    owner='MIXED'; route='STABILITY_REPAIR_THEN_REVALIDATE_DESIGN_GAP'; designRevisionAllowed=true;
  } else if (hasDesign) {
    owner='DESIGN'; route='TARGETED_DESIGN_REVISION'; designRevisionAllowed=true;
  } else if (hasRuntime) {
    owner='DEVELOPMENT_QA'; route='EXISTING_DEVELOPMENT_QA_REPAIR'; designRevisionAllowed=task.defectDriven === true ? false : true;
  } else if (hasUnresolved) {
    owner='UNRESOLVED'; route='TRACE_CAUSALITY_BEFORE_MUTATION'; designRevisionAllowed=task.defectDriven === true ? false : true;
  }
  return stage('DEFECT_OWNERSHIP', owner==='UNRESOLVED' ? 'TRACE_REQUIRED' : 'CLASSIFIED', {
    owner,route,designRevisionAllowed,
    sameSymptomDualIndependentMutationForbidden:true,
    preserveApprovedDesignForRuntimeDefect:owner==='DEVELOPMENT_QA',
    unresolvedCauseMustNotInventDesignFailure:owner==='UNRESOLVED'
  });
}

function evaluateBlueprint(task = {}, designer = {}) {
  const source = task.designBlueprint && typeof task.designBlueprint === 'object' ? task.designBlueprint : {};
  const alternatives = [
    ...(Array.isArray(source.alternatives) ? source.alternatives : []),
    ...(Array.isArray(task.designAlternatives) ? task.designAlternatives : [])
  ].map((row, index) => typeof row === 'string'
    ? { label:index===0?'PLAN_A':index===1?'PLAN_B':`PLAN_${index+1}`, concept:clean(row) }
    : { label:clean(row?.label) || (index===0?'PLAN_A':index===1?'PLAN_B':`PLAN_${index+1}`), concept:clean(row?.concept || row?.summary || row?.idea), genre:clean(row?.genre), validation:clean(row?.validation) }
  ).filter((row) => row.concept);
  const material = task.materialDesignChange === true || designer.designChange === true;
  const issues = [];
  if (material && alternatives.length < 2) issues.push('PLAN_A_B_REQUIRED_FOR_MATERIAL_DESIGN_CHANGE');
  const selected = clean(source.selectedPlan || task.selectedDesignPlan);
  if (material && alternatives.length >= 2 && !selected) issues.push('SELECTED_PLAN_AND_RATIONALE_REQUIRED');
  return stage('DESIGN_BLUEPRINT', issues.length ? 'ADVISORY' : 'READY', {
    materialDesignChange:material,
    alternatives:freezeList(alternatives.map(freeze)),
    selectedPlan:selected || null,
    selectedRationale:clean(source.selectedRationale || task.selectedDesignRationale) || null,
    genreChallengeAllowed:true,
    baseConceptIsReferenceNotPrison:true,
    identityAnchors:freezeList(unique(source.identityAnchors || task.identityAnchors || [])),
    issues:freezeList(issues)
  });
}

function evaluateDesignIntegrity(task = {}) {
  const supplied = task.designIntegrity && typeof task.designIntegrity === 'object' ? task.designIntegrity : {};
  const checks = [
    ['movementAndControlReachable','PLAYER_MOVEMENT_AND_CONTROL_REACHABILITY'],
    ['spawnToFirstActionReachable','SPAWN_TO_FIRST_ACTION_REACHABILITY'],
    ['progressionReachable','PROGRESSION_GRAPH_REACHABILITY'],
    ['questPrerequisitesSatisfiable','QUEST_PREREQUISITE_SATISFIABILITY'],
    ['sessionEndReachable','WIN_FAIL_SESSION_END_REACHABILITY'],
    ['failureRecoveryReachable','FAILURE_RETRY_RECOVERY_PATH'],
    ['mapObjectivesReachable','MAP_ROUTE_AND_OBJECTIVE_REACHABILITY'],
    ['economyFeasible','RESOURCE_AND_REQUIRED_COST_FEASIBILITY'],
    ['counterplayFeasible','ENEMY_COUNTERPLAY_FEASIBILITY'],
    ['saveCompatible','SAVE_MEANING_AND_MIGRATION_COMPATIBILITY']
  ];
  const results = checks.map(([key,label]) => freeze({ key,label,value:supplied[key] === true ? 'PASS' : supplied[key] === false ? 'FAIL' : 'UNVERIFIED' }));
  const failed = results.filter((row) => row.value === 'FAIL').map((row) => row.label);
  return stage('DESIGN_INTEGRITY', failed.length ? 'BLOCKING_CONTRADICTION' : 'CHECKED', {
    results:freezeList(results),
    failed:freezeList(failed),
    designScoreCannotOverrideUnplayableState:true,
    issues:freezeList(failed.map((label) => `DESIGN_INTEGRITY_FAIL:${label}`))
  });
}

function evaluateContentDiversity(task = {}) {
  const supplied = task.contentDiversity && typeof task.contentDiversity === 'object' ? task.contentDiversity : {};
  const regions = Array.isArray(supplied.regions) ? supplied.regions : [];
  const enemies = Array.isArray(supplied.enemies) ? supplied.enemies : [];
  const objectives = Array.isArray(supplied.objectives) ? supplied.objectives : [];
  const issues = [];
  if(task.mapVarietyRequired===true&&regions.length<2)issues.push('MAP_REGION_VARIETY_REQUIRED');
  if(task.enemyVarietyRequired===true&&enemies.length<2)issues.push('ENEMY_OR_CHALLENGE_ROLE_VARIETY_REQUIRED');
  if(task.objectiveVarietyRequired===true&&objectives.length<2)issues.push('OBJECTIVE_ROLE_VARIETY_REQUIRED');
  const regionSignatures = new Set(regions.map((row) => clean([row?.traversal,row?.riskReward,row?.landmark,row?.encounterPattern,row?.resourcePressure,row?.storyContext].filter(Boolean).join('|')).toLowerCase()).filter(Boolean));
  const enemySignatures = new Set(enemies.map((row) => clean([row?.behavior,row?.counterplay,row?.positioning,row?.timing,row?.mobility,row?.groupRole,row?.identity,row?.rewardMeaning].filter(Boolean).join('|')).toLowerCase()).filter(Boolean));
  if (regions.length >= 2 && regionSignatures.size < Math.min(2, regions.length)) issues.push('MAP_REGION_TEMPLATE_MONOTONY');
  if (enemies.length >= 2 && enemySignatures.size < Math.min(2, enemies.length)) issues.push('ENEMY_ROLE_TEMPLATE_MONOTONY');
  if (objectives.length >= 3 && new Set(objectives.map((row) => clean(row?.role || row?.type || row).toLowerCase())).size < 2) issues.push('OBJECTIVE_TEMPLATE_MONOTONY');
  return stage('CONTENT_DIVERSITY', issues.length ? 'VARIETY_DEBT' : 'CHECKED', {
    regionCount:regions.length,
    enemyOrChallengeCount:enemies.length,
    objectiveCount:objectives.length,
    colorOrStatOnlyDifferentiationInsufficient:true,
    issues:freezeList(issues)
  });
}


function evaluateReferenceHomage(task = {}) {
  const supplied = task.referenceHomage && typeof task.referenceHomage === 'object' ? task.referenceHomage : {};
  const inspirations = Array.isArray(supplied.inspirations) ? supplied.inspirations.map((row) => freeze({
    titleOrTradition:clean(row?.titleOrTradition),
    rightsBasis:clean(row?.rightsBasis).toUpperCase(),
    borrowedTechnique:clean(row?.borrowedTechnique),
    transformation:clean(row?.transformation)
  })).filter((row) => row.titleOrTradition || row.borrowedTechnique) : [];
  const issues = [];
  for (const row of inspirations) {
    if (!['PUBLIC_DOMAIN','ABSTRACT_TECHNIQUE','ORIGINAL'].includes(row.rightsBasis)) issues.push(`REFERENCE_RIGHTS_BASIS_INVALID:${row.titleOrTradition||'UNKNOWN'}`);
    if (!row.borrowedTechnique) issues.push(`REFERENCE_TECHNIQUE_MISSING:${row.titleOrTradition||'UNKNOWN'}`);
    if (!row.transformation) issues.push(`REFERENCE_TRANSFORMATION_MISSING:${row.titleOrTradition||'UNKNOWN'}`);
  }
  return stage('REFERENCE_HOMAGE', issues.length ? 'ADVISORY' : 'CHECKED', {
    inspirations:freezeList(inspirations),
    originalityRule:clean(supplied.originalityRule) || null,
    publicDomainMotifStructureThemeArchetypeAllowed:true,
    protectedModernExpressionCopyForbidden:true,
    abstractTechniqueReferenceAllowed:true,
    issues:freezeList(unique(issues))
  });
}

function evaluateConstraints(task = {}) {
  const constraints = normalizeConstraints(task);
  const blockers = [];
  const warnings = [];

  if (task.protectedChange === true) blockers.push('PROTECTED_GAMEPLAY_CHANGE_REQUIRES_OWNER_APPROVAL');
  if (task.requiresOwnerDecision === true) blockers.push('OWNER_DECISION_REQUIRED');
  if (task?.artbook?.locked === true && task.designChange === true) blockers.push('ARTBOOK_CHANGE_REQUEST_REQUIRED');

  for (const row of constraints) {
    if (row.locked && row.proposedChange && !row.preserves) blockers.push(`LOCKED_CONSTRAINT_CONFLICT:${row.id}`);
  }
  for (const field of protectedFieldConflicts(task)) blockers.push(`LOCKED_DESIGN_FIELD_CONFLICT:${field}`);
  if (!constraints.length) warnings.push('NO_EXPLICIT_DESIGN_CONSTRAINTS_PROVIDED');

  return stage('CONSTRAINT_ENGINE', blockers.length ? 'BLOCKED' : 'PASS', {
    constraints,
    blockers: freezeList(unique(blockers)),
    warnings: freezeList(unique(warnings)),
    authorityExpanded:false
  });
}

function evaluateDesigner(task = {}) {
  const goal = clean(task.goal);
  const designChange = task.designChange === true || clean(task.type).toLowerCase() === 'design';
  const alternatives = Array.isArray(task.designAlternatives) ? task.designAlternatives.map((row)=>typeof row==='string'?clean(row):clean(row?.concept||row?.summary||row?.idea||row?.label)).filter(Boolean) : [];
  const rationale = clean(task.designRationale);
  const issues = [];
  if (!goal) issues.push('GOAL_REQUIRED');
  if (designChange && !rationale) issues.push('DESIGN_RATIONALE_MISSING');
  if (designChange && alternatives.length < 2) issues.push('MULTIPLE_DESIGN_ALTERNATIVES_NOT_EVALUATED');
  return stage('DESIGNER', goal ? (issues.length ? 'ADVISORY' : 'PASS') : 'BLOCKED', {
    goal,
    designChange,
    rationale: rationale || null,
    alternatives: freezeList(alternatives),
    issues: freezeList(issues)
  });
}

function evaluateCritic(task = {}, designer = {}) {
  const issues = [];
  const goal = clean(task.goal).toLowerCase();
  if ((designer?.designChange || task.designChange === true) && !clean(task.designRationale)) issues.push('WHY_THIS_DESIGN_NOT_JUSTIFIED');
  if ((designer?.designChange || task.designChange === true) && !(task.designAlternatives || []).length) issues.push('FIRST_IDEA_LOCK_IN_RISK');
  if (!Array.isArray(task.acceptanceCriteria) || !task.acceptanceCriteria.length) issues.push('ACCEPTANCE_CRITERIA_MISSING');
  if (!Array.isArray(task.responsibleFiles) || !task.responsibleFiles.length) issues.push('CHANGE_SCOPE_NOT_EXPLICIT');
  if (/random|랜덤|확률/.test(goal) && !task.simulation) issues.push('RANDOMNESS_WITHOUT_SIMULATION_INPUT');
  return stage('CRITIC', issues.length ? 'ADVISORY' : 'PASS', {
    issues: freezeList(unique(issues)),
    questions: freezeList([
      '플레이어가 이 시스템을 무시하거나 악용할 수 있는가?',
      '반복 플레이에서 지배전략 하나로 고착되는가?',
      '보상과 위험의 변화가 실제 선택을 만드는가?',
      '기존 세이브/규칙/아트북 의도와 충돌하지 않는가?'
    ])
  });
}

function evaluateNarrativeContract(task = {}) {
  const goal = clean(task.goal);
  const supplied = task.narrative && typeof task.narrative === 'object' ? task.narrative : {};
  const required = task.narrativeRequired === true || Object.keys(supplied).length > 0
    || /story|narrative|quest|dialogue|character|스토리|서사|퀘스트|대화|대사|캐릭터|세계관|복선|반전/.test(goal.toLowerCase());
  if (!required) return freeze({
    name:'NARRATIVE_DIALOGUE',required:false,status:'NOT_APPLICABLE',issues:freezeList([]),authorityExpanded:false
  });
  const worldRules = unique(supplied.worldRules || task.worldRules || []);
  const characterGoals = unique(supplied.characterGoals || task.characterGoals || []);
  const plotBeats = unique(supplied.plotBeats || task.plotBeats || []);
  const questStates = unique(supplied.questStates || task.questStates || []);
  const foreshadowing = unique(supplied.foreshadowing || task.foreshadowing || []);
  const payoffs = unique(supplied.payoffs || task.payoffs || []);
  const dialogueRules = unique(supplied.dialogueRules || task.dialogueRules || []);
  const voiceProfiles = Array.isArray(supplied.characterVoiceProfiles) ? supplied.characterVoiceProfiles.map((row) => freeze({
    character:clean(row?.character),
    grammarRegister:clean(row?.grammarRegister),
    vocabularyRhythm:clean(row?.vocabularyRhythm),
    relationshipShift:clean(row?.relationshipShift),
    emotionalRange:clean(row?.emotionalRange),
    knowledgeBoundary:clean(row?.knowledgeBoundary),
    subtextBehavior:clean(row?.subtextBehavior)
  })).filter((row) => row.character) : [];
  const sceneBeats = Array.isArray(supplied.sceneBeats) ? supplied.sceneBeats.map((row) => freeze({
    scene:clean(row?.scene),
    purpose:clean(row?.purpose),
    characterGoals:clean(row?.characterGoals),
    conflict:clean(row?.conflict),
    informationAsymmetry:clean(row?.informationAsymmetry),
    reversal:clean(row?.reversal),
    stateChange:clean(row?.stateChange)
  })).filter((row) => row.scene || row.purpose) : [];
  const twists = unique(supplied.twists || task.twists || []);
  const unresolvedForeshadowing = unique(supplied.intentionalUnresolvedForeshadowing || []);
  const issues = [];
  if (!worldRules.length) issues.push('NARRATIVE_WORLD_RULES_NOT_BOUND');
  if (!characterGoals.length) issues.push('CHARACTER_WANT_NEED_OR_CONFLICT_NOT_BOUND');
  if (!plotBeats.length && !questStates.length) issues.push('PLOT_OR_QUEST_CAUSALITY_NOT_BOUND');
  if (foreshadowing.length && !payoffs.length && !unresolvedForeshadowing.length) issues.push('FORESHADOWING_WITHOUT_TRACKED_PAYOFF');
  const dialogueRequired = task.dialogueRequired === true || dialogueRules.length > 0 || /dialogue|대화|대사/.test(goal.toLowerCase());
  if (dialogueRequired && !voiceProfiles.length) issues.push('CHARACTER_VOICE_PROFILE_REQUIRED');
  if (dialogueRequired && !dialogueRules.length) issues.push('DIALOGUE_RULES_REQUIRED');
  if (dialogueRequired && voiceProfiles.some((row) => !row.grammarRegister || !row.vocabularyRhythm || !row.knowledgeBoundary)) issues.push('CHARACTER_VOICE_PROFILE_INCOMPLETE');
  if ((twists.length || foreshadowing.length) && !sceneBeats.length) issues.push('SCENE_BEAT_CONTRACT_REQUIRED_FOR_TWIST_OR_FORESHADOWING');
  return freeze({
    name:'NARRATIVE_DIALOGUE',
    required:true,
    status:issues.length ? 'ADVISORY' : 'READY',
    worldRules:freezeList(worldRules),
    characterGoals:freezeList(characterGoals),
    plotBeats:freezeList(plotBeats),
    questStates:freezeList(questStates),
    foreshadowing:freezeList(foreshadowing),
    payoffs:freezeList(payoffs),
    intentionalUnresolvedForeshadowing:freezeList(unresolvedForeshadowing),
    twists:freezeList(twists),
    dialogueRules:freezeList(dialogueRules),
    characterVoiceProfiles:freezeList(voiceProfiles),
    sceneBeats:freezeList(sceneBeats),
    issues:freezeList(unique(issues)),
    principles:freezeList([
      'GRAMMAR_AND_LANGUAGE_QUALITY_MUST_MATCH_CHARACTER_AND_SCENE',
      'FORMALITY_VOCABULARY_RHYTHM_RELATIONSHIP_AND_EMOTION_DEFINE_CHARACTER_VOICE',
      'ALL_CHARACTERS_SAME_VOICE_FORBIDDEN',
      'CHARACTER_MAY_NOT_KNOW_UNLEARNED_INFORMATION',
      'DIALOGUE_MUST_SERVE_CHARACTER_GOAL_CONTEXT_SUBTEXT_AND_SCENE_OBJECTIVE',
      'WORLD_RULES_AND_CHARACTER_KNOWLEDGE_MUST_STAY_CONSISTENT',
      'QUESTS_REQUIRE_PREREQUISITE_ACTION_STATE_CHANGE_AND_CONSEQUENCE',
      'FORESHADOWING_REQUIRES_PAYOFF_OR_INTENTIONAL_UNRESOLVED_STATE',
      'TWIST_REQUIRES_PRIOR_EVIDENCE_AND_CHARACTER_KNOWLEDGE_SUPPORT',
      'DISTILL_REFERENCE_TECHNIQUE_NOT_REFERENCE_EXPRESSION'
    ]),
    authorityExpanded:false
  });
}

function normalizeGraph(task = {}) {
  const graph = task.causalityGraph || task.designCausality || {};
  const nodes = Array.isArray(graph.nodes) ? graph.nodes.map((row) => typeof row === 'string' ? { id:clean(row), label:clean(row) } : { id:clean(row?.id), label:clean(row?.label || row?.id), kind:clean(row?.kind) || null }).filter((row) => row.id) : [];
  const edges = Array.isArray(graph.edges) ? graph.edges.map((row) => ({ from:clean(row?.from), to:clean(row?.to), reason:clean(row?.reason) || null })).filter((row) => row.from && row.to) : [];
  return { nodes, edges };
}

function evaluateCausality(task = {}) {
  const { nodes, edges } = normalizeGraph(task);
  if (!nodes.length) return stage('CAUSALITY_GRAPH', 'UNVERIFIED', {
    nodes:freezeList([]), edges:freezeList([]), issues:freezeList(['CAUSALITY_INPUT_REQUIRED']), invented:false
  });
  const ids = new Set(nodes.map((node) => node.id));
  const issues = [];
  for (const edge of edges) {
    if (!ids.has(edge.from) || !ids.has(edge.to)) issues.push(`UNKNOWN_CAUSALITY_NODE:${edge.from}->${edge.to}`);
  }
  const connected = new Set(edges.flatMap((edge) => [edge.from, edge.to]));
  for (const node of nodes) if (!connected.has(node.id)) issues.push(`DANGLING_CAUSALITY_NODE:${node.id}`);
  if (nodes.length > 1 && !edges.length) issues.push('CAUSALITY_EDGES_REQUIRED');
  return stage('CAUSALITY_GRAPH', issues.length ? 'ADVISORY' : 'PASS', {
    nodes:freezeList(nodes.map(freeze)), edges:freezeList(edges.map(freeze)), issues:freezeList(unique(issues)), invented:false
  });
}

function evaluatePlayerModel(task = {}) {
  const supplied = task.playerModel || {};
  const observed = Array.isArray(supplied.observations) ? supplied.observations : [];
  return stage('PLAYER_MODEL', observed.length ? 'EVIDENCE_AVAILABLE' : 'MODEL_READY', {
    archetypes:PLAYER_ARCHETYPES,
    observations:freezeList(observed.map((row) => freeze({ archetype:clean(row?.archetype), finding:clean(row?.finding), evidence:clean(row?.evidence) })).filter((row) => row.finding)),
    evidenceRequired: observed.length === 0,
    predictedFactsInvented:false
  });
}

function round(value) { return Number.isFinite(value) ? Math.round(value * 1000) / 1000 : null; }

function simulateCombat(input = {}) {
  const playerHp = finite(input.playerHp);
  const enemyHp = finite(input.enemyHp);
  const playerDps = finite(input.playerDps);
  const enemyDps = finite(input.enemyDps);
  if ([playerHp, enemyHp, playerDps, enemyDps].some((value) => value == null) || playerHp <= 0 || enemyHp <= 0 || playerDps <= 0 || enemyDps < 0) {
    return freeze({ verified:false, reason:'COMBAT_INPUT_INCOMPLETE', metrics:freeze({}) });
  }
  const ttkEnemy = enemyHp / playerDps;
  const ttkPlayer = enemyDps === 0 ? Infinity : playerHp / enemyDps;
  const survivalMargin = enemyDps === 0 ? Infinity : ttkPlayer - ttkEnemy;
  return freeze({
    verified:true,
    reason:'DETERMINISTIC_INPUTS_AVAILABLE',
    metrics:freeze({ ttkEnemySeconds:round(ttkEnemy), ttkPlayerSeconds:Number.isFinite(ttkPlayer)?round(ttkPlayer):null, survivalMarginSeconds:Number.isFinite(survivalMargin)?round(survivalMargin):null, noIncomingDamage:enemyDps===0 })
  });
}

function simulateEconomy(input = {}) {
  const income = finite(input.incomePerMinute);
  const cost = finite(input.upgradeCost);
  if (income == null || cost == null || income <= 0 || cost < 0) return freeze({ verified:false, reason:'ECONOMY_INPUT_INCOMPLETE', metrics:freeze({}) });
  return freeze({ verified:true, reason:'DETERMINISTIC_INPUTS_AVAILABLE', metrics:freeze({ minutesToUpgrade:round(cost / income), incomePerMinute:round(income), upgradeCost:round(cost) }) });
}

function evaluateSimulation(task = {}) {
  const simulation = task.simulation || {};
  const combat = simulateCombat(simulation.combat || {});
  const economy = simulateEconomy(simulation.economy || {});
  const verified = combat.verified || economy.verified;
  return stage('COMBAT_ECONOMY_SIMULATOR', verified ? 'PARTIAL_OR_FULL_SIMULATION' : 'UNVERIFIED', {
    combat,
    economy,
    inventedInputs:false,
    issues:freezeList(verified ? [] : ['UNVERIFIED_SIMULATION_INPUT'])
  });
}

function verifiedEvidence(value) {
  if (value === true) return true;
  if (!value || typeof value !== 'object') return false;
  return value.verified === true && Boolean(clean(value.evidence || value.id || value.runId || value.path));
}

function evidenceStage(name, evidence, requirement) {
  const verified = verifiedEvidence(evidence);
  return stage(name, verified ? 'PASS' : 'WAITING_EVIDENCE', {
    verified,
    evidence:evidence || null,
    requiredEvidence:requirement
  });
}

function evaluateDesignReview(task = {}, autoPlayer, telemetry) {
  const supplied = task?.designEvidence?.designReview || task?.designReview || null;
  const verified = verifiedEvidence(supplied) && autoPlayer.verified && telemetry.verified;
  const decision = clean(supplied?.decision).toUpperCase();
  const validDecision = ['PASS','REVISE','DROP'].includes(decision) ? decision : null;
  return stage('DESIGN_REVIEW', verified ? (validDecision || 'PASS') : 'WAITING_EVIDENCE', {
    verified,
    decision:validDecision,
    evidence:supplied,
    assumptionFailed:verified && validDecision === 'REVISE'
  });
}

function evaluateExperienceMemory(task = {}, designReview) {
  const qaVerified = verifiedEvidence(task?.designEvidence?.qa);
  const ready = designReview.verified && designReview.decision === 'PASS' && qaVerified && task.authorityExpanded !== true;
  return stage('EXPERIENCE_MEMORY', ready ? 'READY_FOR_EXISTING_PROMOTION_GATE' : 'WAITING_VERIFIED_REVIEW', {
    ready,
    qaVerified,
    authorityExpanded:false,
    directMemoryWrite:false,
    promotionTool:'tools/vibe2-experience-control.mjs'
  });
}

export function buildVibeDesignIntelligence({ task = {}, plan = {}, experience = {} } = {}) {
  const stability = evaluateStabilityTriage(task);
  const defectOwnership = evaluateDefectOwnership(task, stability);
  const designer = evaluateDesigner(task);
  const blueprint = evaluateBlueprint(task, designer);
  const integrity = evaluateDesignIntegrity(task);
  const diversity = evaluateContentDiversity(task);
  const referenceHomage = evaluateReferenceHomage(task);
  const constraints = evaluateConstraints(task);
  const critic = evaluateCritic(task, designer);
  const narrative = evaluateNarrativeContract(task);
  const causality = evaluateCausality(task);
  const playerModel = evaluatePlayerModel(task);
  const simulation = evaluateSimulation(task);
  const hardBlockers = unique([
    ...(designer.status === 'BLOCKED' ? designer.issues : []),
    ...(constraints.blockers || []),
    ...(blueprint.materialDesignChange && blueprint.issues.length ? blueprint.issues : []),
    ...(task.defectDriven === true && defectOwnership.designRevisionAllowed === false ? [`DEFECT_OWNED_BY_${defectOwnership.owner}`] : []),
    ...(integrity.status === 'BLOCKING_CONTRADICTION' ? integrity.issues : [])
  ]);
  const implementation = stage('IMPLEMENTATION', hardBlockers.length ? 'BLOCKED' : 'READY', {
    allowed:hardBlockers.length === 0,
    blockers:freezeList(hardBlockers),
    sourceMutationAuthorized:hardBlockers.length === 0,
    protectedGameplayMutationAutomatic:false
  });
  const evidence = task.designEvidence || {};
  const autoPlayer = evidenceStage('AUTO_PLAYER', evidence.autoPlayer, '실제 입력 기반 플레이/진행/재시작/막힘 여부 증거');
  const telemetry = evidenceStage('TELEMETRY', evidence.telemetry, '실제 플레이 수치 또는 엔진 QA 런 증거');
  const designReview = evaluateDesignReview(task, autoPlayer, telemetry);
  const experienceMemory = evaluateExperienceMemory(task, designReview);
  const stages = freezeList([stability,defectOwnership,designer,blueprint,integrity,diversity,referenceHomage,narrative,constraints,critic,causality,playerModel,simulation,implementation,autoPlayer,telemetry,designReview,experienceMemory]);

  const advisory = unique([
    ...stages.flatMap((row) => row.issues || row.warnings || []).filter(Boolean),
    ...(narrative.issues || []),
    ...(blueprint.issues || []),
    ...(integrity.issues || []),
    ...(diversity.issues || []),
    ...(referenceHomage.issues || [])
  ]);
  const constraintText = (constraints.constraints || []).map((row) => `${row.id}: ${row.rule}`).join(' | ');
  const guidance = [
    '[VIBE2 DESIGN INTELLIGENCE - mandatory safety contract]',
    `안정성 우선: ${stability.status}; 원인 소유권=${defectOwnership.owner}; route=${defectOwnership.route}. 같은 증상을 설계와 구현이 독립적으로 중복 수정하지 않는다.`,
    blueprint.materialDesignChange ? `설계 밑그림: Plan A/B 이상 비교=${blueprint.alternatives.length>=2?'READY':'MISSING'}; 선택안=${blueprint.selectedPlan||'UNSELECTED'}. 기본 컨셉은 기준점이며 검증 가능한 창의적 장르/구조 도전은 허용한다.` : '설계 밑그림: 물질적 설계 변경 아님.',
    `설계 도달성 검사: ${integrity.status}; 콘텐츠 다양성: ${diversity.status}.`,
    '설계 분석은 승인 권한을 확대하지 않는다. 잠긴 아트북/보호 규칙/세이브 의미/게임 수치는 명시 승인 없이 바꾸지 않는다.',
    constraintText ? `보존 제약: ${constraintText}` : '명시 제약이 부족하면 기존 코드/게임 규칙을 보수적으로 보존한다.',
    critic.issues.length ? `비평 경고: ${critic.issues.join(', ')}` : '비평 게이트: 명시적 구조 문제 없음.',
    causality.status === 'UNVERIFIED' ? '인과 그래프: 입력 없음. 새로운 스토리/보상 인과를 임의 창작하지 않는다.' : `인과 그래프 상태: ${causality.status}`,
    narrative.required ? `서사 계약: ${narrative.status}. 세계 규칙/인물 목표/퀘스트 인과/복선 회수/대화 지식 범위를 보존한다.` : '서사 계약: 필요 없음.',
    simulation.status === 'UNVERIFIED' ? '수치 시뮬레이션: 입력 부족. 적정 수치를 추측해서 변경하지 않는다.' : '수치 시뮬레이션: 제공된 입력만 계산했다.',
    '구현 후 AUTO_PLAYER -> TELEMETRY -> DESIGN_REVIEW 증거가 확인되기 전 EXPERIENCE MEMORY 승격 금지.'
  ].join('\n');

  return freeze({
    version:2,
    required:true,
    pipeline:DESIGN_INTELLIGENCE_STAGES,
    stages,
    stability,
    defectOwnership,
    blueprint,
    integrity,
    diversity,
    referenceHomage,
    narrative,
    implementationGate:freeze({ allowed:implementation.allowed, blockers:implementation.blockers }),
    advisory:freezeList(advisory),
    guidance,
    planTarget:clean(plan?.target || task?.target),
    priorExperienceCount:Array.isArray(experience?.records) ? experience.records.length : 0,
    authorityExpanded:false
  });
}

export function validateDesignAwareExperience(review = {}) {
  if (review.designIntelligenceRequired !== true) return freeze({ valid:true, issues:freezeList([]) });
  const issues = [];
  if (!review.autoPlayerVerified) issues.push('design-auto-player-evidence-required');
  if (!review.telemetryVerified) issues.push('design-telemetry-evidence-required');
  if (!review.designReviewVerified) issues.push('design-review-evidence-required');
  if (clean(review.designReviewDecision).toUpperCase() !== 'PASS') issues.push('design-review-pass-required');
  if (review.authorityExpanded === true) issues.push('design-intelligence-must-not-expand-authority');
  return freeze({ valid:issues.length === 0, issues:freezeList(unique(issues)) });
}


export function buildDesignEvolutionBrief({ game = {}, seed = {}, factPack = {}, priorFeedback = {}, ownerSignal = {} } = {}) {
  const identityAnchors = unique([
    clean(seed.DISTINCT_IDENTITY),
    clean(seed.CORE_FUN_TO_LEARN),
    ...(Array.isArray(seed.CORE_LOOP) ? seed.CORE_LOOP : []),
    clean(seed.SAVE_POLICY),
    clean(seed.MULTIPLAYER_DESIGN_MODE || seed.INITIAL_PLAY_MODE)
  ]);
  return freeze({
    version:1,
    loop:freezeList(['STABILIZE','UNDERSTAND','OBSERVE','DIAGNOSE','PRIORITIZE','BLUEPRINT','PROPOSE','COMPARE','REVISE','VALIDATE','LEARN','REPLAN','EXPAND']),
    gameId:clean(game.id || seed.gameId) || null,
    ownerIntent:freeze({
      literal:clean(ownerSignal.literal || ownerSignal.text) || null,
      eventId:clean(ownerSignal.eventId || ownerSignal.requestId || seed.ownerResetRevision) || null,
      semanticTextDeduplicationForbidden:true,
      repeatedIdenticalRequestCreatesNewRevision:true
    }),
    identityAnchors:freezeList(identityAnchors),
    baseConceptIsReferenceNotPrison:true,
    creativeDeviationAllowed:true,
    genreTransitionChallengeAllowed:true,
    stabilityFirst:true,
    causalDefectOwnership:freeze({
      classes:freezeList(['IMPLEMENTATION_RUNTIME_DEFECT','DESIGN_DEFECT','MIXED_DEFECT','UNRESOLVED_CAUSE']),
      sameSymptomDualIndependentMutationForbidden:true,
      unresolvedCauseAction:'TRACE_BEFORE_MUTATION'
    }),
    blueprint:freeze({
      minimumPlans:2,
      labels:freezeList(['PLAN_A','PLAN_B']),
      materialChangeRequiresPlanComparison:true,
      selectedPlanRequiresRationale:true,
      radicalChallengeReversibleUntilValidated:true
    }),
    antiMonotony:freeze({
      colorOrStatOnlyDifferentiationInsufficient:true,
      mapRegionsNeedDifferentGameplayRoles:true,
      enemiesNeedDifferentBehaviorOrCounterplayRoles:true,
      repeatedTemplateCloningCreatesVarietyDebt:true
    }),
    narrativeDialogue:freeze({
      whenApplicable:true,
      characterVoiceProfileRequired:true,
      grammarRegisterVocabularyRhythmRelationshipEmotionKnowledgeSubtextRequired:true,
      foreshadowingPayoffTrackingRequired:true,
      twistNeedsPriorEvidence:true
    }),
    referenceHomage:freeze({
      publicDomainClassicsMayInformMotifStructureThemeAndArchetype:true,
      protectedModernWorksAbstractTechniqueOnly:true,
      directProtectedExpressionCopyForbidden:true,
      multiReferenceGeneralizationPreferred:true
    }),
    priorFeedback:priorFeedback || null,
    factPackAvailable:Boolean(factPack && Object.keys(factPack).length),
    authorityExpanded:false
  });
}
