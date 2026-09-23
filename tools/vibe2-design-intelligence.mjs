// 파일명: tools/vibe2-design-intelligence.mjs
// 역할: Vibe2의 설계 판단을 제약->비평->인과->플레이어 모델->수치 시뮬레이션->구현->실플레이 증거->리뷰->경험 승격 순서로 고정한다.
// 원칙: 분석은 승인 권한을 확대하지 않으며, 보호된 게임 규칙과 잠긴 아트북은 자동 변경하지 않는다.

const clean = (value) => String(value ?? '').trim();
const finite = (value) => Number.isFinite(Number(value)) ? Number(value) : null;
const unique = (values = []) => [...new Set((values || []).map(clean).filter(Boolean))];
const freeze = (value) => Object.freeze(value);
const freezeList = (values = []) => freeze([...values]);

export const DESIGN_INTELLIGENCE_STAGES = freezeList([
  'DESIGNER',
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

export const DESIGN_EVOLUTION_LOOP = freezeList([
  'STABILIZE','UNDERSTAND','OBSERVE','DIAGNOSE','SCORE','PROPOSE','COMPARE','REVISE','VALIDATE','LEARN','REPLAN'
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

function normalizeDesignAlternatives(task = {}) {
  const rows = Array.isArray(task.designAlternatives) ? task.designAlternatives : Array.isArray(task.designPlans) ? task.designPlans : [];
  return freezeList(rows.map((row,index)=>{
    const defaultId=index===0?'PLAN_A':index===1?'PLAN_B':'PLAN_'+(index+1);
    if(typeof row==='string')return freeze({id:defaultId,label:defaultId,summary:clean(row),genre:null,identityPreserving:index===0});
    return freeze({
      id:clean(row?.id)||defaultId,
      label:clean(row?.label)||defaultId,
      summary:clean(row?.summary||row?.description||row?.plan||row?.goal),
      genre:clean(row?.genre)||null,
      identityPreserving:row?.identityPreserving===true||(index===0&&row?.identityPreserving!==false),
      novelty:clean(row?.novelty)||null,
      implementationImpact:clean(row?.implementationImpact)||null,
      regressionRisk:clean(row?.regressionRisk)||null,
      validation:clean(row?.validation)||null
    });
  }).filter(row=>row.summary));
}

function evaluateDesigner(task = {}) {
  const goal = clean(task.goal);
  const designChange = task.designChange === true || clean(task.type).toLowerCase() === 'design';
  const alternatives = normalizeDesignAlternatives(task);
  const rationale = clean(task.designRationale);
  const ownerEventId=clean(task.ownerRequestInstanceId||task.ownerRequestEventId||task.ownerDirectiveRevision);
  const ownerRepeatCount=Math.max(0,Number(task.ownerRepeatCount)||0);
  const issues = [];
  if (!goal) issues.push('GOAL_REQUIRED');
  if (designChange && !rationale) issues.push('DESIGN_RATIONALE_MISSING');
  if (designChange && alternatives.length < 2) issues.push('MULTIPLE_DESIGN_ALTERNATIVES_NOT_EVALUATED');
  if (task.ownerDirective===true && !ownerEventId) issues.push('OWNER_REQUEST_EVENT_ID_MISSING');
  if (ownerRepeatCount>=2 && alternatives.length<2) issues.push('REPEATED_OWNER_REQUEST_REQUIRES_NEW_ALTERNATIVE_REVIEW');
  return stage('DESIGNER', goal ? (issues.length ? 'ADVISORY' : 'PASS') : 'BLOCKED', {
    goal,designChange,rationale:rationale||null,alternatives,ownerEventId:ownerEventId||null,ownerRepeatCount,
    repeatedOwnerIntentInsufficient:ownerRepeatCount>=2,semanticOwnerRequestDeduplicationAllowed:false,
    issues:freezeList(issues)
  });
}
function evaluateCritic(task = {}, designer = {}) {
  const issues = [];
  const goal = clean(task.goal).toLowerCase();
  if ((designer?.designChange || task.designChange === true) && !clean(task.designRationale)) issues.push('WHY_THIS_DESIGN_NOT_JUSTIFIED');
  if ((designer?.designChange || task.designChange === true) && !(designer?.alternatives || []).length) issues.push('FIRST_IDEA_LOCK_IN_RISK');
  if ((designer?.ownerRepeatCount||0)>=2) issues.push('REPEATED_OWNER_INTENT_MEANS_PRIOR_APPROACH_WAS_INSUFFICIENT');
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
    required:false,
    status:'NOT_APPLICABLE',
    issues:freezeList([]),
    authorityExpanded:false
  });
  const worldRules = unique(supplied.worldRules || task.worldRules || []);
  const characterGoals = unique(supplied.characterGoals || task.characterGoals || []);
  const plotBeats = unique(supplied.plotBeats || task.plotBeats || []);
  const questStates = unique(supplied.questStates || task.questStates || []);
  const foreshadowing = unique(supplied.foreshadowing || task.foreshadowing || []);
  const payoffs = unique(supplied.payoffs || task.payoffs || []);
  const dialogueRules = unique(supplied.dialogueRules || task.dialogueRules || []);
  const issues = [];
  if (!worldRules.length) issues.push('NARRATIVE_WORLD_RULES_NOT_BOUND');
  if (!characterGoals.length) issues.push('CHARACTER_WANT_NEED_OR_CONFLICT_NOT_BOUND');
  if (!plotBeats.length && !questStates.length) issues.push('PLOT_OR_QUEST_CAUSALITY_NOT_BOUND');
  if (foreshadowing.length && !payoffs.length) issues.push('FORESHADOWING_WITHOUT_TRACKED_PAYOFF');
  return freeze({
    required:true,
    status:issues.length ? 'ADVISORY' : 'READY',
    worldRules:freezeList(worldRules),
    characterGoals:freezeList(characterGoals),
    plotBeats:freezeList(plotBeats),
    questStates:freezeList(questStates),
    foreshadowing:freezeList(foreshadowing),
    payoffs:freezeList(payoffs),
    dialogueRules:freezeList(dialogueRules),
    issues:freezeList(unique(issues)),
    principles:freezeList([
      'WORLD_RULES_AND_CHARACTER_KNOWLEDGE_MUST_STAY_CONSISTENT',
      'QUESTS_REQUIRE_PREREQUISITE_ACTION_STATE_CHANGE_AND_CONSEQUENCE',
      'MEANINGFUL_CHOICES_REQUIRE_OBSERVABLE_CONSEQUENCE',
      'DIALOGUE_MUST_SERVE_CHARACTER_GOAL_CONTEXT_AND_SCENE_OBJECTIVE',
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
  const designer = evaluateDesigner(task);
  const constraints = evaluateConstraints(task);
  const critic = evaluateCritic(task, designer);
  const narrative = evaluateNarrativeContract(task);
  const causality = evaluateCausality(task);
  const playerModel = evaluatePlayerModel(task);
  const simulation = evaluateSimulation(task);
  const hardBlockers = unique([
    ...(designer.status === 'BLOCKED' ? designer.issues : []),
    ...(constraints.blockers || [])
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
  const stages = freezeList([designer,constraints,critic,causality,playerModel,simulation,implementation,autoPlayer,telemetry,designReview,experienceMemory]);

  const advisory = unique([
    ...stages.flatMap((row) => row.issues || row.warnings || []).filter(Boolean),
    ...(narrative.issues || [])
  ]);
  const constraintText = (constraints.constraints || []).map((row) => `${row.id}: ${row.rule}`).join(' | ');
  const guidance = [
    '[VIBE2 DESIGN INTELLIGENCE - mandatory safety contract]',
    '설계 분석은 승인 권한을 확대하지 않는다. 잠긴 아트북/보호 규칙/세이브 의미/게임 수치는 명시 승인 없이 바꾸지 않는다.',
    constraintText ? `보존 제약: ${constraintText}` : '명시 제약이 부족하면 기존 코드/게임 규칙을 보수적으로 보존한다.',
    critic.issues.length ? `비평 경고: ${critic.issues.join(', ')}` : '비평 게이트: 명시적 구조 문제 없음.',
    causality.status === 'UNVERIFIED' ? '인과 그래프: 입력 없음. 새로운 스토리/보상 인과를 임의 창작하지 않는다.' : `인과 그래프 상태: ${causality.status}`,
    narrative.required ? `서사 계약: ${narrative.status}. 세계 규칙/인물 목표/퀘스트 인과/복선 회수/대화 지식 범위를 보존한다.` : '서사 계약: 필요 없음.',
    simulation.status === 'UNVERIFIED' ? '수치 시뮬레이션: 입력 부족. 적정 수치를 추측해서 변경하지 않는다.' : '수치 시뮬레이션: 제공된 입력만 계산했다.',
    '구현 후 AUTO_PLAYER -> TELEMETRY -> DESIGN_REVIEW 증거가 확인되기 전 EXPERIENCE MEMORY 승격 금지.'
  ].join('\n');

  return freeze({
    version:1,
    required:true,
    pipeline:DESIGN_INTELLIGENCE_STAGES,
    stages,
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
