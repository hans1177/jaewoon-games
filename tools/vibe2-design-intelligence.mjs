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
  'STABILIZE','UNDERSTAND','OBSERVE','DIAGNOSE','SCORE','PROPOSE','COMPARE','REVISE','VALIDATE','LEARN','REPLAN','EXPAND'
]);

const STABILITY_PRIORITY = freeze({
  PROGRESSION_BLOCK_OR_SOFTLOCK:1000,
  SAVE_LOAD_OR_MIGRATION_FAILURE:950,
  CRASH_OR_FATAL_RUNTIME_FAILURE:930,
  INPUT_OR_UI_INTERACTION_FAILURE:900,
  COMBAT_AUTHORITY_OR_HIT_SEMANTIC_FAILURE:880,
  MULTIPLAYER_SYNC_OR_REPLICATION_FAILURE:860,
  SEVERE_PERFORMANCE_REGRESSION:820,
  REGRESSION_FROM_PRIOR_VERIFIED_CHECKPOINT:800,
  REPEATED_PLAYER_VISIBLE_MINOR_BUGS:700,
  CORE_FUN_OR_DESIGN_WEAKNESS:500,
  CONTENT_EXPANSION:300,
  CREATIVE_EXPERIMENT:200
});

function normalizeIssueRows(task = {}) {
  const rows = [
    ...(Array.isArray(task.knownIssues) ? task.knownIssues : []),
    ...(Array.isArray(task.runtimeIssues) ? task.runtimeIssues : []),
    ...(Array.isArray(task?.designEvidence?.runtimeIssues) ? task.designEvidence.runtimeIssues : [])
  ];
  return rows.map((row,index)=>{
    if(typeof row === 'string') return { id:`issue-${index+1}`, text:clean(row), severity:null, verified:false, exposureCount:0 };
    return {
      id:clean(row?.id)||`issue-${index+1}`,
      text:clean(row?.text||row?.description||row?.failure||row?.code),
      severity:clean(row?.severity).toUpperCase()||null,
      verified:row?.verified===true,
      exposureCount:Math.max(0,Number(row?.exposureCount||row?.count)||0)
    };
  }).filter(row=>row.text);
}
function classifyStabilityIssue(row = {}) {
  const text=clean(row.text).toLowerCase();
  if(/soft.?lock|progress(?:ion)? block|진행.*막|진행불가|소프트락/.test(text))return'PROGRESSION_BLOCK_OR_SOFTLOCK';
  if(/save|load|migration|세이브|로드|저장/.test(text))return'SAVE_LOAD_OR_MIGRATION_FAILURE';
  if(/crash|fatal|exception|크래시|치명/.test(text))return'CRASH_OR_FATAL_RUNTIME_FAILURE';
  if(/input|button|click|touch|ui|입력|버튼|클릭|터치/.test(text))return'INPUT_OR_UI_INTERACTION_FAILURE';
  if(/hit|damage|cooldown|authority|판정|데미지|쿨다운/.test(text))return'COMBAT_AUTHORITY_OR_HIT_SEMANTIC_FAILURE';
  if(/multiplayer|replication|sync|동기화|멀티/.test(text))return'MULTIPLAYER_SYNC_OR_REPLICATION_FAILURE';
  if(/fps|frame|performance|memory|성능|프레임/.test(text))return'SEVERE_PERFORMANCE_REGRESSION';
  if(/regression|퇴보|회귀/.test(text))return'REGRESSION_FROM_PRIOR_VERIFIED_CHECKPOINT';
  if((row.exposureCount||0)>=3||/repeat|repeated|반복/.test(text))return'REPEATED_PLAYER_VISIBLE_MINOR_BUGS';
  return null;
}
function evaluateStability(task = {}) {
  const issues=normalizeIssueRows(task).map(row=>freeze({...row,category:classifyStabilityIssue(row)}));
  const classified=issues.filter(row=>row.category);
  const top=[...classified].sort((a,b)=>(STABILITY_PRIORITY[b.category]||0)-(STABILITY_PRIORITY[a.category]||0))[0]||null;
  const blocking=classified.filter(row=>['PROGRESSION_BLOCK_OR_SOFTLOCK','SAVE_LOAD_OR_MIGRATION_FAILURE','CRASH_OR_FATAL_RUNTIME_FAILURE','INPUT_OR_UI_INTERACTION_FAILURE','COMBAT_AUTHORITY_OR_HIT_SEMANTIC_FAILURE','MULTIPLAYER_SYNC_OR_REPLICATION_FAILURE','SEVERE_PERFORMANCE_REGRESSION','REGRESSION_FROM_PRIOR_VERIFIED_CHECKPOINT'].includes(row.category));
  return freeze({
    status:blocking.length?'STABILIZE_FIRST':classified.length?'REPAIR_PRIORITY':'CLEAR_OR_NO_VERIFIED_STABILITY_SIGNAL',
    issues:freezeList(issues),
    topPriority:top?.category||null,
    expansionMayProceed:blocking.length===0,
    repairDesignAllowed:true,
    designExpansionMayNotHideKnownBlockingDefect:true
  });
}
function evaluateOwnerIntent(task = {}) {
  const literal=clean(task.ownerLiteralRequest||task.ownerRequest||(task.ownerDirective===true?task.goal:''));
  const eventId=clean(task.ownerRequestInstanceId||task.ownerDirectiveRevision||task.id)||null;
  const repeatedCount=Math.max(0,Number(task.ownerRepeatCount)||0);
  return freeze({
    literalRequest:literal||null,
    likelyIntent:clean(task.ownerLikelyIntent)||literal||null,
    suppliedInterpretation:Boolean(clean(task.ownerLikelyIntent)),
    eventId,
    repeatedCount,
    repeatedRequestMeansPriorAttemptInsufficient:repeatedCount>=2,
    semanticTextDeduplicationAllowed:false,
    sameTextNewEventCreatesNewRevision:Boolean(literal&&eventId),
    uncertainty:clean(task.ownerIntentUncertainty)||null,
    affectedScope:freezeList(unique(task.ownerAffectedScopes||task.affectedScopes||[]))
  });
}
function evaluateConceptBlueprint(task = {}) {
  const b=task.conceptBlueprint&&typeof task.conceptBlueprint==='object'?task.conceptBlueprint:{};
  const designChange=task.designChange===true||clean(task.type).toLowerCase()==='design';
  const issues=[];
  if(designChange&&!clean(b.premise))issues.push('CONCEPT_BLUEPRINT_PREMISE_MISSING');
  if(designChange&&(!Array.isArray(b.designPillars)||b.designPillars.length<3))issues.push('CONCEPT_BLUEPRINT_PILLARS_INSUFFICIENT');
  if(designChange&&(!Array.isArray(b.sessionArc)||b.sessionArc.length<3))issues.push('CONCEPT_BLUEPRINT_SESSION_ARC_INSUFFICIENT');
  if(designChange&&(!Array.isArray(b.emotionalCurve)||b.emotionalCurve.length<3))issues.push('CONCEPT_BLUEPRINT_EMOTIONAL_CURVE_INSUFFICIENT');
  return freeze({
    required:designChange,
    status:issues.length?'ADVISORY':designChange?'READY':'NOT_APPLICABLE',
    premise:clean(b.premise)||null,
    designPillars:freezeList(unique(b.designPillars||[])),
    sessionArc:freezeList(unique(b.sessionArc||[])),
    emotionalCurve:freezeList(unique(b.emotionalCurve||[])),
    worldRules:freezeList(unique(b.worldRules||[])),
    signatureMoments:freezeList(unique(b.signatureMoments||[])),
    issues:freezeList(issues)
  });
}
function normalizeAlternative(row,index){
  if(typeof row==='string')return freeze({id:index===0?'PLAN_A':index===1?'PLAN_B':`PLAN_${index+1}`,concept:clean(row),genreDirection:null,coreLoopDifference:null,risks:null,reversibility:null});
  return freeze({
    id:clean(row?.id)||(index===0?'PLAN_A':index===1?'PLAN_B':`PLAN_${index+1}`),
    concept:clean(row?.concept||row?.summary||row?.plan),
    genreDirection:clean(row?.genreDirection)||null,
    coreLoopDifference:clean(row?.coreLoopDifference)||null,
    risks:clean(row?.risks)||null,
    reversibility:clean(row?.reversibility)||null
  });
}
function evaluateCreativeChallenge(task = {}, intent = {}) {
  const rows=(Array.isArray(task.designAlternatives)?task.designAlternatives:[]).map(normalizeAlternative).filter(row=>row.concept);
  const material=task.designChange===true||clean(task.type).toLowerCase()==='design'||intent.repeatedCount>=2;
  const highImpact=task.highImpactDesignChange===true||task.structuralDesignChange===true||intent.repeatedCount>=2;
  const proposedGenre=clean(task.proposedGenre);
  const currentGenre=clean(task?.approvedDesign?.genre||task.currentGenre);
  const genreShift=Boolean(proposedGenre&&currentGenre&&proposedGenre.toLowerCase()!==currentGenre.toLowerCase());
  const issues=[];
  if(material&&rows.length<2)issues.push('PLAN_A_PLAN_B_REQUIRED');
  if(genreShift&&task.genreShiftChallenger!==true)issues.push('GENRE_SHIFT_MUST_RUN_AS_CHALLENGER');
  return freeze({
    material,
    highImpact,
    alternatives:freezeList(rows),
    minimumAlternatives:material?2:0,
    genreShift,
    currentGenre:currentGenre||null,
    proposedGenre:proposedGenre||null,
    genreShiftChallengerRequired:genreShift,
    radicalCreativeChallengeAllowed:true,
    baselineConceptIsReferencePointNotCreativePrison:true,
    explicitOwnerLocksRemainHardConstraints:true,
    issues:freezeList(issues)
  });
}
function evaluateContentDiversity(task = {}) {
  const d=task.contentDiversityPlan&&typeof task.contentDiversityPlan==='object'?task.contentDiversityPlan:{};
  const regions=Array.isArray(d.regionsOrSpaces)?d.regionsOrSpaces:Array.isArray(d.regions)?d.regions:[];
  const actors=Array.isArray(d.enemiesActorsOrObstacles)?d.enemiesActorsOrObstacles:Array.isArray(d.enemiesOrActors)?d.enemiesOrActors:Array.isArray(d.enemies)?d.enemies:[];
  const issues=[];
  const goal=clean(task.goal).toLowerCase();
  const worldMaterial=/map|world|region|biome|맵|지역|월드|바이옴/.test(goal)||regions.length>0;
  const enemyMaterial=/enemy|monster|creature|mob|적|몬스터|몹|생물/.test(goal)||actors.length>0;
  if(worldMaterial&&regions.length<2)issues.push('MAP_REGION_VARIETY_INSUFFICIENT');
  if(enemyMaterial&&actors.length<2)issues.push('ENEMY_OR_ACTOR_VARIETY_INSUFFICIENT');
  const variationText=[...(d.variationRules||[]),clean(d.variationGuard)].filter(Boolean);
  const numericOnly=variationText.some(rule=>/^(?:hp|damage|speed|color|체력|공격력|속도|색상)\b/i.test(clean(rule)));
  if(numericOnly)issues.push('NUMERIC_OR_COLOR_ONLY_VARIATION_INSUFFICIENT');
  return freeze({
    required:worldMaterial||enemyMaterial,
    status:issues.length?'ADVISORY':(worldMaterial||enemyMaterial)?'READY':'NOT_APPLICABLE',
    regionCount:regions.length,
    actorCount:actors.length,
    numericOnlyVariationInsufficient:true,
    colorOnlyVariationInsufficient:true,
    issues:freezeList(issues)
  });
}
function designOpportunityScore(task = {},stability = {},intent = {},blueprint = {},diversity = {},creative = {}) {
  const components={
    stability:stability.status==='STABILIZE_FIRST'?300:stability.status==='REPAIR_PRIORITY'?120:0,
    owner:intent.literalRequest?220:0,
    repeatedOwner:intent.repeatedCount>=2?Math.min(180,(intent.repeatedCount-1)*45):0,
    coreFun:/core.?fun|boring|재미|핵심/.test(clean(task.goal).toLowerCase())?120:0,
    blueprintGap:(blueprint.issues||[]).length*20,
    diversityGap:(diversity.issues||[]).length*25,
    structural:creative.highImpact?80:0
  };
  return freeze({score:Object.values(components).reduce((a,b)=>a+b,0),components:freeze({...components})});
}

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

function evaluateDesigner(task = {}) {
  const goal = clean(task.goal);
  const designChange = task.designChange === true || clean(task.type).toLowerCase() === 'design';
  const alternatives = Array.isArray(task.designAlternatives) ? task.designAlternatives.map(row=>typeof row==='string'?clean(row):clean(row?.concept||row?.summary||row?.plan)).filter(Boolean) : [];
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
  if(supplied.applicable===false&&task.narrativeRequired!==true)return freeze({
    required:false,status:'NOT_APPLICABLE',issues:freezeList([]),authorityExpanded:false
  });
  const required = task.narrativeRequired === true || supplied.applicable===true || Object.keys(supplied).length > 0
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
  const characterSpeechProfiles = Array.isArray(supplied.characterSpeechProfiles) ? supplied.characterSpeechProfiles : [];
  const scenePlans = Array.isArray(supplied.scenePlans) ? supplied.scenePlans : [];
  const dialogueSamples = Array.isArray(supplied.dialogueSamples) ? supplied.dialogueSamples : [];
  const dialogueMaterial = task.dialogueRequired===true || characterSpeechProfiles.length>0 || dialogueSamples.length>0 || /dialogue|conversation|대화|대사|말투/.test(goal.toLowerCase());
  const issues = [];
  if (!worldRules.length) issues.push('NARRATIVE_WORLD_RULES_NOT_BOUND');
  if (!characterGoals.length) issues.push('CHARACTER_WANT_NEED_OR_CONFLICT_NOT_BOUND');
  if (!plotBeats.length && !questStates.length) issues.push('PLOT_OR_QUEST_CAUSALITY_NOT_BOUND');
  if (foreshadowing.length && !payoffs.length) issues.push('FORESHADOWING_WITHOUT_TRACKED_PAYOFF');
  if (dialogueMaterial && !characterSpeechProfiles.length) issues.push('DIALOGUE_CHARACTER_SPEECH_PROFILE_NOT_BOUND');
  if (dialogueMaterial && !scenePlans.length) issues.push('DIALOGUE_SCENE_OBJECTIVE_OR_SUBTEXT_NOT_BOUND');
  if (dialogueSamples.length && supplied.grammarAndVoiceReviewed!==true) issues.push('DIALOGUE_GRAMMAR_AND_CHARACTER_VOICE_REVIEW_REQUIRED');
  if (characterSpeechProfiles.length>=2) {
    const voiceFingerprints=characterSpeechProfiles.map(row=>JSON.stringify([
      clean(row?.vocabularyRange),clean(row?.formality),clean(row?.sentenceRhythm),
      clean(row?.relationshipAddress),clean(row?.emotionalLeakage)
    ]));
    if(new Set(voiceFingerprints).size===1)issues.push('GENERIC_SAME_VOICE_DIALOGUE_RISK');
  }
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
    dialogueMaterial,
    characterSpeechProfiles:freezeList(characterSpeechProfiles.map(row=>freeze({
      character:clean(row?.character),
      vocabularyRange:clean(row?.vocabularyRange),
      formality:clean(row?.formality),
      sentenceRhythm:clean(row?.sentenceRhythm),
      emotionalLeakage:clean(row?.emotionalLeakage),
      relationshipAddress:clean(row?.relationshipAddress),
      knowledgeBoundary:clean(row?.knowledgeBoundary),
      worldContext:clean(row?.worldContext)
    }))),
    scenePlans:freezeList(scenePlans.map(row=>freeze({
      scene:clean(row?.scene),sceneObjective:clean(row?.sceneObjective),
      characterObjectives:unique(row?.characterObjectives||[]),conflict:clean(row?.conflict),
      informationState:clean(row?.informationState),emotionalBeat:clean(row?.emotionalBeat),
      turnOrReversal:clean(row?.turnOrReversal),consequence:clean(row?.consequence),
      foreshadowing:clean(row?.foreshadowing),payoffReference:clean(row?.payoffReference)
    }))),
    dialogueRealismPrinciples:freezeList([
      'NATURAL_GRAMMAR_FOR_CHARACTER_AND_SITUATION',
      'CHARACTER_SPECIFIC_VOCABULARY_FORMALITY_AND_RHYTHM',
      'RELATIONSHIP_AND_EMOTIONAL_STATE_CHANGE_SPEECH',
      'DIALOGUE_SERVES_SCENE_OBJECTIVE_AND_SUBTEXT',
      'NO_CHARACTER_KNOWLEDGE_LEAK',
      'NO_GENERIC_SAME_VOICE_DIALOGUE',
      'TWIST_REQUIRES_CAUSAL_SETUP_OR_CHARACTER_LOGIC'
    ]),
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
  const stability = evaluateStability(task);
  const ownerIntent = evaluateOwnerIntent(task);
  const conceptBlueprint = evaluateConceptBlueprint(task);
  const creativeChallenge = evaluateCreativeChallenge(task,ownerIntent);
  const contentDiversity = evaluateContentDiversity(task);
  const opportunity = designOpportunityScore(task,stability,ownerIntent,conceptBlueprint,contentDiversity,creativeChallenge);
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
    ...(narrative.issues || []),
    ...(conceptBlueprint.issues || []),
    ...(creativeChallenge.issues || []),
    ...(contentDiversity.issues || [])
  ]);
  const constraintText = (constraints.constraints || []).map((row) => `${row.id}: ${row.rule}`).join(' | ');
  const guidance = [
    '[VIBE2 DESIGN INTELLIGENCE - mandatory safety contract]',
    `설계 진화 루프: ${DESIGN_EVOLUTION_LOOP.join(' -> ')}`,
    `안정화 상태: ${stability.status}${stability.topPriority?` / top=${stability.topPriority}`:''}. 진행막힘·세이브·입력·판정·동기화·회귀는 확장보다 먼저 해결한다.`,
    ownerIntent.literalRequest ? `Owner 요청 이벤트=${ownerIntent.eventId||'UNBOUND'} repeat=${ownerIntent.repeatedCount}. 같은 문장 반복도 새 이벤트면 새 revision이며 이전 접근이 충분치 않았다고 본다.` : 'Owner 직접 요청 없음: 검증된 문제/품질기회만 사용하고 이유 없는 재설계를 만들지 않는다.',
    `설계 기회 점수=${opportunity.score}. 고영향·반복 변경은 Plan A/Plan B 이상을 비교한다.`,
    '기본 컨셉은 기준점이지 창작 감옥이 아니다. 명시 owner lock은 지키되, 장르 혼합·장르 전환·새 지역 규칙·새 encounter 구조 같은 도전은 challenger로 검증한 뒤 baseline 승격을 판단한다.',
    '맵/지역과 몬스터·NPC·콘텐츠는 숫자/색만 다른 변형으로 채우지 말고 역할·행동·대응·공간규칙·보상·서사 맥락이 달라야 한다.',
    '고전/문학 오마주는 공공영역·권리확인 소스를 우선하고 구조·모티프·기법을 변형한다. 보호되는 문장·장면·캐릭터 표현을 복제하지 않는다.',
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
    evolutionLoop:DESIGN_EVOLUTION_LOOP,
    evolution:freeze({
      stability,
      ownerIntent,
      conceptBlueprint,
      creativeChallenge,
      contentDiversity,
      opportunity,
      unlimitedRevisions:true,
      passIsCheckpointNotTerminal:true,
      noShadowDesignPipeline:true
    }),
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
