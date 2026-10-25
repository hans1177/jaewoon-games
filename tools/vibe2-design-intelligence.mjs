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
  ].map((row, index) => {
    if (typeof row === 'string') return { label:index===0?'PLAN_A':index===1?'PLAN_B':`PLAN_${index+1}`, concept:clean(row) };
    return {
      label:clean(row?.label) || (index===0?'PLAN_A':index===1?'PLAN_B':`PLAN_${index+1}`),
      concept:clean(row?.concept || row?.summary || row?.idea),
      playerFantasy:clean(row?.playerFantasy),
      genreDirection:clean(row?.genreDirection || row?.genre),
      coreLoopShift:clean(row?.coreLoopShift),
      mapTopologyRegionRoles:clean(row?.mapTopologyRegionRoles || row?.mapWorldPlan),
      landmarksTraversal:clean(row?.landmarksTraversal),
      enemyEcosystemCounterplay:clean(row?.enemyEcosystemCounterplay || row?.enemyChallengePlan),
      bossSignatureMoments:clean(row?.bossSignatureMoments),
      progressionEconomy:clean(row?.progressionEconomy),
      questStoryEventFlow:clean(row?.questStoryEventFlow || row?.storyDirection),
      failureRetryRecovery:clean(row?.failureRetryRecovery || row?.risks),
      platformAdaptation:clean(row?.platformAdaptation),
      implementationScope:clean(row?.implementationScope),
      validationPlan:clean(row?.validationPlan || row?.validation)
    };
  }).filter((row) => row.concept);

  const material = task.materialDesignChange === true || designer.designChange === true;
  const issues = [];
  const requiredAlternativeFields = [
    'concept','playerFantasy','coreLoopShift','mapTopologyRegionRoles','landmarksTraversal',
    'enemyEcosystemCounterplay','bossSignatureMoments','progressionEconomy','questStoryEventFlow',
    'failureRetryRecovery','platformAdaptation','implementationScope','validationPlan'
  ];

  if (material && alternatives.length < 2) issues.push('PLAN_A_B_REQUIRED_FOR_MATERIAL_DESIGN_CHANGE');
  if (material) {
    for (const row of alternatives) {
      const missing=requiredAlternativeFields.filter((key)=>!clean(row?.[key]));
      if(missing.length)issues.push(`PLAN_REQUIRED_AXES_MISSING:${row.label}:${missing.join('|')}`);
    }
  }

  const selected = clean(source.selectedPlan || task.selectedDesignPlan);
  const selectedRationale=clean(source.selectedRationale || task.selectedDesignRationale);
  if (material && alternatives.length >= 2 && !selected) issues.push('SELECTED_PLAN_REQUIRED');
  if (material && selected && !selectedRationale) issues.push('SELECTED_PLAN_RATIONALE_REQUIRED');

  return stage('DESIGN_BLUEPRINT', issues.length ? 'ADVISORY' : 'READY', {
    materialDesignChange:material,
    alternatives:freezeList(alternatives.map(freeze)),
    selectedPlan:selected || null,
    selectedRationale:selectedRationale || null,
    requiredAlternativeFields:freezeList(requiredAlternativeFields),
    eachAlternativeMustCoverRequiredAxes:true,
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
    ['bossPhaseTransitionsReachable','BOSS_PHASE_TRANSITION_REACHABILITY'],
    ['multiplayerLifecycleFeasible','MULTIPLAYER_JOIN_LEAVE_REJOIN_SYNC_FEASIBILITY'],
    ['saveCompatible','SAVE_MEANING_AND_MIGRATION_COMPATIBILITY'],
    ['narrativeCausalityConsistent','NARRATIVE_CHARACTER_KNOWLEDGE_CAUSALITY_AND_PAYOFF_CONSISTENCY']
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

  const regionAxes=['traversal','riskReward','landmark','encounterPattern','resourcePressure','storyContext'];
  const enemyAxes=['behavior','counterplay','positioning','timing','mobility','groupRole','identity','rewardMeaning'];
  const signature=(row,axes)=>clean(axes.map((key)=>row?.[key]).filter(Boolean).join('|')).toLowerCase();
  const differenceCount=(a,b,axes)=>axes.reduce((count,key)=>count+(clean(a?.[key]).toLowerCase()!==clean(b?.[key]).toLowerCase()?1:0),0);

  const regionSignatures = new Set(regions.map((row) => signature(row,regionAxes)).filter(Boolean));
  const enemySignatures = new Set(enemies.map((row) => signature(row,enemyAxes)).filter(Boolean));
  if (regions.length >= 2 && regionSignatures.size < Math.min(2, regions.length)) issues.push('MAP_REGION_TEMPLATE_MONOTONY');
  if (enemies.length >= 2 && enemySignatures.size < Math.min(2, enemies.length)) issues.push('ENEMY_ROLE_TEMPLATE_MONOTONY');

  for(let i=0;i<regions.length;i++)for(let j=i+1;j<regions.length;j++){
    const diff=differenceCount(regions[i],regions[j],regionAxes);
    if(diff<2)issues.push(`MAP_REGION_PAIR_INSUFFICIENT_DIFFERENTIATION:${i}:${j}:${diff}`);
  }
  for(let i=0;i<enemies.length;i++)for(let j=i+1;j<enemies.length;j++){
    const diff=differenceCount(enemies[i],enemies[j],enemyAxes);
    if(diff<2)issues.push(`ENEMY_PAIR_INSUFFICIENT_DIFFERENTIATION:${i}:${j}:${diff}`);
  }

  if (objectives.length >= 3 && new Set(objectives.map((row) => clean(row?.role || row?.type || row).toLowerCase())).size < 2) issues.push('OBJECTIVE_TEMPLATE_MONOTONY');

  return stage('CONTENT_DIVERSITY', issues.length ? 'VARIETY_DEBT' : 'CHECKED', {
    regionCount:regions.length,
    enemyOrChallengeCount:enemies.length,
    objectiveCount:objectives.length,
    pairwiseMinimumDifferentiators:2,
    colorOrStatOnlyDifferentiationInsufficient:true,
    issues:freezeList(unique(issues))
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

// 메인 · 기존 A/B/C/D/@ 외 설계 수정은 원래 Game Designer AI 책임으로 인계한다.
// 디자인 브리프와 게임 ID만 넘기며 엔진 소스·밸런스·저장 규칙은 변경하지 않는다.
function existingDesignerHandoff(task = {}, executionContext = 'IMPLEMENTATION') {
  const requested=task.designChange===true || clean(task.type).toLowerCase()==='design'
    || clean(task.department).toLowerCase()==='design';
  const fields=[
    ...(Array.isArray(task.proposedDesignChanges)?task.proposedDesignChanges:[]),
    ...(Array.isArray(task.designFields)?task.designFields:[]),
    ...(task.designScope?[task.designScope]:[])
  ].map(row=>typeof row==='string'?clean(row):clean(row?.path||row?.field||row?.scope)).filter(Boolean);
  const insideGrammar=field=>/^(?:MAIN|A|B|C|D|@|ABCD\+@)(?:$|[.\/[ ])/i.test(field)
    ||/^creativeGrammar[.\/](?:mainIdentity|a|b|cThemes|cGenres|cGenreInterlock|cWorldAndGameplayEffect|dCreations|delveDiscoveries|delveGrowthRule)(?:$|[.\/[ ])/i.test(field);
  // 설계 조직이 이미 작성 중인 후보는 자기 자신에게 다시 접수하지 않는다.
  const authoring=executionContext==='GAME_DESIGNER_AUTHORING';
  const required=!authoring&&requested&&(!fields.length||fields.some(field=>!insideGrammar(field)));
  const gameId=clean(task.gameId),requestId=clean(task.id||task.taskId),goal=clean(task.goal);
  const ready=/^[a-z0-9][a-z0-9-]{0,79}$/.test(gameId)
    &&/^[a-zA-Z0-9_.:-]{1,100}$/.test(requestId)
    &&goal.length>0&&goal.length<=2000
    &&['ROBLOX','WEB'].includes(clean(task.target).toUpperCase());
  return freeze({
    required,ready:required&&ready,
    status:required?(ready?'DESIGNER_INTAKE_REQUIRED':'DESIGNER_INTAKE_INPUT_INVALID'):'NOT_REQUIRED',
    gameId:required?gameId:null,requestId:required?requestId:null,
    request:required?goal:null,changeFields:freezeList(fields),
    owner:'EXISTING_GAME_DESIGNER',
    existingModule:'tools/company-design-cycle.mjs',
    existingWorkflow:'.github/workflows/company-seed-design-runtime.yml',
    designCycleExecuted:authoring,requestPersisted:false,sourceMutationAuthorized:false,
    authorityExpanded:false,runtimeVerified:false
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

// 메인 · R01-R10: 허가된 참고자료의 관찰과 실행 근거를 기존 설계 흐름에서 평가한다.
// 타사 원본 자산, 소스, 내부 물리값을 추정해 생성하지 않는다. 증거 부족은 BLOCKED.
const REFERENCE_REQUIREMENTS=freezeList(['R01','R02','R03','R04','R05','R06','R07','R08','R09','R10']);
const referenceRows=value=>Array.isArray(value)?value:[];
const referenceProof=(row={})=>{
  const proof=row?.proof||row?.verification||{};
  return row?.actualPlatformRuntime===true&&row?.independentQaPass===true&&
    row?.regressionPass===true&&row?.preservesGameplaySaveBalance===true&&
    /^[a-f0-9]{40}$/i.test(clean(row?.sourceRevision))&&
    clean(row?.evidenceId||proof.evidenceId).length>0&&row?.stale!==true;
};
const referenceGate=(id,pass,issues=[],details={})=>freeze({
  id,status:pass?'VERIFIED':'BLOCKED',verified:pass,
  issues:freezeList(unique(issues)),...details,
  sourceMutationAuthorized:false,publicationAuthorized:false
});
const ALLOWED_REFERENCE_RIGHTS=new Set(['ABSTRACT_TECHNIQUE','PUBLIC_DOMAIN','CC0','MIT','APACHE-2.0','ORIGINAL','OWNER_PROVIDED']);
const PROTECTED_REFERENCE_FIELDS=['rawSource','originalAssets','copiedMap','copiedDialogue','originalMusic','brandLogo','unlicensedCharacter'];

export function evaluateVibeReferenceCapabilities(input={}){
  const facts=referenceRows(input.facts);
  const eligibleFacts=facts.filter(row=>row&&
    ['OBSERVED','INFERRED','UNKNOWN'].includes(clean(row.observationKind))&&
    ALLOWED_REFERENCE_RIGHTS.has(clean(row.rightsBasis).toUpperCase())&&
    clean(row.sourceId)&&clean(row.sourceTimestamp)&&clean(row.evidence)&&
    !PROTECTED_REFERENCE_FIELDS.some(key=>Boolean(row[key]))&&row.licenseVerified!==false);
  const observed=eligibleFacts.filter(row=>row.observationKind==='OBSERVED');
  const r01=referenceGate('R01',eligibleFacts.length>0&&observed.length>0&&eligibleFacts.length===facts.length,
    eligibleFacts.length===facts.length&&observed.length?[]:['PERMITTED_OBSERVED_SOURCE_REQUIRED'],
    {accepted:eligibleFacts.length,rejected:facts.length-eligibleFacts.length,inferredNotObserved:true});
  const fun=referenceRows(input.funHypotheses);
  const funAccepted=fun.filter(row=>row&&['RISK_REWARD','GROWTH','EXPLORATION','COOPERATION','CHOICE','FEEDBACK','REWARD_TIMING'].includes(row.mechanic)
    &&observed.some(f=>f.sourceId===row.sourceId&&f.evidence===row.evidence)
    &&clean(row.playtestScenario));
  const r02=referenceGate('R02',funAccepted.length>0,funAccepted.length?[]:['OBSERVATION_BOUND_FUN_HYPOTHESIS_REQUIRED'],
    {hypotheses:freezeList(funAccepted.map(x=>({mechanic:x.mechanic,playtestScenario:x.playtestScenario})))});
  const compositions=referenceRows(input.compositions);
  const composed=compositions.filter(row=>row&&new Set(referenceRows(row.sourceIds)).size>=2&&
    referenceRows(row.sourceIds).every(id=>observed.some(f=>f.sourceId===id))&&
    clean(row.originalTheme)&&clean(row.originalRules)&&clean(row.conflictTest)&&
    row.copiesProtectedExpression!==true&&row.licenseConflict!==true);
  const r03=referenceGate('R03',composed.length>0,composed.length?[]:['TWO_SOURCES_AND_DISTINCT_ORIGINAL_RULES_REQUIRED'],
    {plans:freezeList(composed.map(row=>({originalTheme:row.originalTheme,originalRules:row.originalRules})))});
  const feel=referenceRows(input.gameFeelSamples);
  const feelValid=feel.filter(row=>referenceProof(row)&&
    ['WEB','ROBLOX'].includes(clean(row.platform).toUpperCase())&&
    clean(row.deviceClass)&&Number.isFinite(row.inputTimeMs)&&Number.isFinite(row.actionTimeMs)&&
    row.actionTimeMs>=row.inputTimeMs&&Number.isFinite(row.hitTimeMs)&&row.hitTimeMs>=row.actionTimeMs&&
    row.sameImpactEvent===true&&row.cameraReadable===true);
  const r04=referenceGate('R04',feelValid.length>0,feelValid.length?[]:['REAL_INPUT_ACTION_HIT_TIMINGS_REQUIRED'],
    {measurements:freezeList(feelValid.map(row=>({
      inputToActionMs:row.actionTimeMs-row.inputTimeMs,
      inputToHitMs:row.hitTimeMs-row.inputTimeMs,
      deviceClass:row.deviceClass,sourceRevision:row.sourceRevision
    })))});
  const absorptions=referenceRows(input.techniqueTransfers).filter(t=>t&&
    observed.some(f=>f.sourceId===t.sourceId)&&
    clean(t.existingCodeMatch)&&clean(t.missingTechnique)&&
    referenceProof(t)&&t.independentNativeReview===true);
  const r05=referenceGate('R05',absorptions.length>0,absorptions.length?[]:['SOURCE_GAP_AND_RUNTIME_PROVEN_TARGET_REQUIRED'],
    {recipeCandidates:freezeList(absorptions.map(t=>t.id)),autoPromote:false});
  const gaps=referenceRows(input.playtestGaps);
  const verifiedGaps=gaps.filter(g=>g&&referenceProof(g)&&g.reproduced===true&&
    clean(g.problem)&&clean(g.existingResponsibleFile)&&
    Number.isFinite(g.severity)&&g.severity>=0&&g.severity<=10&&
    g.proposedRuleChange!==true);
  // 자율 개선은 재현 가능한 기존 책임 파일만 정렬한다. 외부 표현 복제·자동 코드 수정은 금지.
  verifiedGaps.sort((a,b)=>b.severity-a.severity||
    clean(a.existingResponsibleFile).localeCompare(clean(b.existingResponsibleFile))||
    clean(a.id).localeCompare(clean(b.id)));
  const prioritizedGaps=verifiedGaps.map(g=>({
    id:clean(g.id).slice(0,90),file:clean(g.existingResponsibleFile).slice(0,180),
    severity:g.severity,sourceRevision:g.sourceRevision,
    proposal:'MEASURE_EXISTING_SYSTEM_AND_RECHECK',
    readOnlyFirst:true,productionPass:false
  }));
  const r06=referenceGate('R06',verifiedGaps.length>0,verifiedGaps.length?[]:['REPRODUCED_RUNTIME_GAPS_REQUIRED'],
    {prioritized:freezeList(prioritizedGaps),candidateOnly:true});
  const skills=referenceRows(input.genreSkills);
  const validSkills=skills.filter(s=>s&&clean(s.genre)&&clean(s.domain)&&
    Number.isInteger(s.pass)&&Number.isInteger(s.fail)&&s.pass>=0&&s.fail>=0&&
    s.pass+s.fail>0&&s.independentBenchmarks===true&&
    Number.isFinite(s.holdoutPassRate)&&s.holdoutPassRate>=0&&s.holdoutPassRate<=1&&
    clean(s.benchmarkVersion));
  const r07=referenceGate('R07',validSkills.length>0,validSkills.length?[]:['MEASURED_GENRE_DOMAIN_HOLDOUT_REQUIRED'],
    {skills:freezeList(validSkills.map(s=>({genre:s.genre,domain:s.domain,rate:s.pass/(s.pass+s.fail),holdoutPassRate:s.holdoutPassRate})))});
  const videos=referenceRows(input.sceneObservations);
  const acceptedVideo=videos.filter(row=>row&&observed.some(f=>f.sourceId===row.sourceId)&&
    Number.isFinite(row.timestampMs)&&row.timestampMs>=0&&
    ['VISIBLE_INPUT','VISIBLE_MOTION','VISIBLE_CONTACT','VISIBLE_FEEDBACK','UNKNOWN_INTERNAL'].includes(row.event)&&
    clean(row.visualEvidence));
  const orderedVideo=[...acceptedVideo].sort((a,b)=>a.timestampMs-b.timestampMs);
  const contactIndex=orderedVideo.findIndex(v=>v.event==='VISIBLE_CONTACT');
  const sceneValid=orderedVideo.length>=2&&contactIndex>=0&&
    orderedVideo.findIndex((v,i)=>i>contactIndex&&v.event==='VISIBLE_FEEDBACK')>contactIndex;
  const r08=referenceGate('R08',sceneValid,
    sceneValid?[]:orderedVideo.length>=2?['VISIBLE_CONTACT_AND_FEEDBACK_REQUIRED']:['TIME_ORDERED_SCENE_EVIDENCE_REQUIRED'],{
      observations:freezeList(orderedVideo.map(v=>({time:v.timestampMs,event:v.event}))),
      inferredEngineInternalsVerified:false
    });
  const improvements=referenceRows(input.improvementTrials).filter(row=>referenceProof(row)&&
    clean(row.originalRuleDifference)&&row.comparedSameDevice===true&&
    Number.isFinite(row.beforeFrictionMs)&&Number.isFinite(row.afterFrictionMs)&&
    row.beforeFrictionMs>row.afterFrictionMs&&row.afterFrictionMs>=0);
  const r09=referenceGate('R09',improvements.length>0,improvements.length?[]:['VERIFIED_BEFORE_AFTER_IMPROVEMENT_REQUIRED'],{
    improvements:freezeList(improvements.map(t=>({id:t.id,savedMs:t.beforeFrictionMs-t.afterFrictionMs})))});
  const experiments=referenceRows(input.techniqueExperiments);
  const successful=experiments.filter(e=>e&&clean(e.hypothesis)&&
    referenceRows(e.trials).length>=2&&referenceRows(e.trials).every(trial=>referenceProof(trial))&&
    e.holdoutPassed===true&&e.negativeCasesPassed===true&&e.usesExistingLearningMotor===true);
  const r10=referenceGate('R10',successful.length>0,successful.length?[]:['REPEATED_HOLDOUT_EXPERIMENT_REQUIRED'],{
    tested:experiments.length,eligible:successful.length,automaticKnowledgePromotion:false});
  const requirements=freeze({R01:r01,R02:r02,R03:r03,R04:r04,R05:r05,R06:r06,R07:r07,R08:r08,R09:r09,R10:r10});
  // 기존 Game Designer / Source Worker에 제안으로만 전달하며 파일 쓰기/릴리스 권한을 부여하지 않는다.
  const nextImprovementCandidates=freezeList(prioritizedGaps.slice(0,3).map(g=>freeze({
    requirementId:'R06',sourceRevision:g.sourceRevision,reason:'VERIFIED_PLAYTEST_GAP',
    responsibleFile:g.file,issueId:g.id,severity:g.severity,
    nextStep:'EXISTING_DESIGN_REVIEW_THEN_SOURCE_OWNER_QA',
    exactGameRuntimeRequired:true,automaticImplementation:false,automaticPromotion:false
  })));
  return freeze({version:1,requirements,allVerified:REFERENCE_REQUIREMENTS.every(id=>requirements[id].verified),
    nextImprovementCandidates,readOnlyImprovementBudget:3,
    evidenceOnly:true,authorityExpanded:false,sourceMutationAuthorized:false});
}

export function buildVibeDesignIntelligence({ task = {}, plan = {}, experience = {}, executionContext = 'IMPLEMENTATION' } = {}) {
  const referenceCapabilities=evaluateVibeReferenceCapabilities(task.referenceStudy||{});
  const stability = evaluateStabilityTriage(task);
  const defectOwnership = evaluateDefectOwnership(task, stability);
  const designer = evaluateDesigner(task);
  const designerHandoff = existingDesignerHandoff(task, executionContext);
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
    ...(designerHandoff.required?[designerHandoff.ready?'DESIGNER_HANDOFF_REQUIRED':'DESIGNER_INTAKE_INPUT_INVALID']:[]),
    ...(designer.status === 'BLOCKED' ? designer.issues : []),
    ...(constraints.blockers || []),
    ...(blueprint.materialDesignChange && blueprint.issues.length ? blueprint.issues : []),
    ...(task.defectDriven === true && defectOwnership.designRevisionAllowed === false ? [`DEFECT_OWNED_BY_${defectOwnership.owner}`] : []),
    ...(integrity.status === 'BLOCKING_CONTRADICTION' ? integrity.issues : [])
  ]);
  const implementation = stage('IMPLEMENTATION', hardBlockers.length ? 'BLOCKED' : 'READY', {
    allowed:hardBlockers.length === 0,
    blockers:freezeList(hardBlockers),
    sourceMutationAuthorized:executionContext!=='GAME_DESIGNER_AUTHORING'&&hardBlockers.length === 0,
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
    referenceCapabilities.nextImprovementCandidates.length?
      `측정된 개선 우선순위: ${referenceCapabilities.nextImprovementCandidates.map(item=>item.issueId||'unknown').join(', ')}. 기존 Game Designer 검토 및 정확 런타임 QA 전 자동 적용 금지.`:
      '실제 플레이 격차 검증 증거 없음. 임의 개선/수치 변경 금지.',
    'R01-R10 참고 자료는 사용권한/실측/독립 QA 없는 한 구현 또는 경험 승격 증거가 아니다.',
    '구현 후 AUTO_PLAYER -> TELEMETRY -> DESIGN_REVIEW 증거가 확인되기 전 EXPERIENCE MEMORY 승격 금지.'
  ].join('\n');

  return freeze({
    version:2,
    required:true,
    pipeline:DESIGN_INTELLIGENCE_STAGES,
    stages,
    stability,
    defectOwnership,
    designerHandoff,
    blueprint,
    integrity,
    diversity,
    referenceHomage,
    referenceCapabilities,
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
    // 이름 있는 A 참고 게임을 기능 한두 개가 아니라 실제 플레이 전체 흐름으로 분석한다.
    // 관찰하지 않은 기능·버전·화면을 사실로 꾸미지 않으며 보호된 표현은 복제하지 않는다.
    representativeSystemBenchmark:freeze({
      role:'A_NAMED_SIMILAR_GAME_SYSTEM_REFERENCE_B_EXISTING_GAME_SYSTEM_PRESERVED',
      dimensions:freezeList(['PRIMARY_ACTION_AND_INPUT','HUD_INFORMATION_HIERARCHY','MENU_NAVIGATION_AND_RETURN',
        'CAMERA_AND_FEEDBACK','COMBAT_OR_PRIMARY_INTERACTION_LOOP','WORLD_AND_STAGE_PROGRESSION',
        'EQUIPMENT_PROGRESS_AND_REWARDS','ONBOARDING_AND_FIRST_SESSION','FAILURE_RETRY_SAVE_RECOVERY',
        'MID_LATE_GAME_DEPTH_AND_REPLAY']),
      perDimensionEvidence:freezeList(['NAMED_GAME_AND_SOURCE','OBSERVED_OR_UNVERIFIED_STATUS',
        'PLAYER_INPUT','WORLD_OR_UI_STATE_TRANSITION','VISIBLE_FEEDBACK','NEXT_CHOICE',
        'B_BASELINE_PRESERVATION','ADAPT_OR_REJECT_REASON','EXACT_TEST_SCENARIO']),
      noGenreFeaturesWithoutGameFit:true,
      originalCharacterVisualUiTextAndWorldRequired:true,
      directScreenAssetCodeOrDistinctiveExpressionCopyForbidden:true,
      referenceOnlyNotSourceOrRuntimeProof:true
    }),
    designSourceBuildUp:freeze({
      orderedLoop:freezeList(['READ_CURRENT_APPROVED_DESIGN_AND_SOURCE','COMPARE_A_REFERENCE_TO_B_BASELINE',
        'EVOLVE_MAIN_A_B_C_D_AT_DESIGN','REVIEW_AND_APPROVE_DESIGN_REVISION',
        'MAP_DESIGN_RULE_TO_RESPONSIBLE_SOURCE_FUNCTION','IMPLEMENT_CHANGED_DESIGN_IN_EXISTING_GAME_SOURCE',
        'VERIFY_EXACT_BUILD_AND_ACTUAL_PLAY','FEED_VERIFIED_GAPS_TO_NEXT_DESIGN_REVISION']),
      bothDesignAndSourceMustEvolveOnApprovedGameplayExpansion:true,
      visualAndDefectRepairMayContinueWithinExistingApprovedDesign:true,
      designRevisionIsNotRuntimePass:true,
      sourceChangeIsNotDesignPass:true,
      preserve:['PLAYER_IDENTITY','EXISTING_RULES','SAVE_KEYS_AND_MEANING','BALANCE','MULTIPLAYER_AUTHORITY'],
      evidenceRequired:freezeList(['DESIGN_REVISION_FINGERPRINT','RULE_AND_SYSTEM_IDS',
        'SOURCE_REVISION_AND_RESPONSIBLE_FILES','BEFORE_AFTER_PLAYER_CHOICES','EXACT_BUILD_QA_AND_RUNTIME_SCENARIO'])
    }),
    convenienceEvolution:freeze({
      study:['PLAYER_FRICTION','INFORMATION_HIERARCHY','CONTEXTUAL_ACTIONS','REUSABLE_SETUP','BATCH_PREVIEW_AND_COMMIT','INTERRUPTION_AND_RETURN'],
      referenceRequires:['SOURCE_URL','OBSERVED_DATE','OBSERVED_FEATURE','ABSTRACT_PRINCIPLE','GENRE_AND_SYSTEM_FIT','ADAPT_OR_REJECT_REASON'],
      baselineAndCandidate:['TASK_COMPLETION','INPUT_AND_MENU_TRANSITIONS','CONTEXT_LOSS','ERROR_RECOVERY','STATE_AND_COST_REGRESSION'],
      documentedFeatureIsRuntimeProof:false,
      staticRouteLengthIsMeasuredPlayerEffort:false,
      learningAuthority:'EXISTING_VERIFIED_EXPERIENCE_AND_FRESH_EXACT_BUILD_QA'
    }),
    depthAndRewardEvolution:freeze({
      layers:['APPROVED_MAIN_A_B_C_CORE_FUN','SHORT_SESSION_SMALL_JOYS','OPTIONAL_DEEP_LONG_TERM_PLAY'],
      rewardContract:['VISIBLE_CONDITIONS','SAVED_PROGRESS','EXPLICIT_GUARANTEED_MILESTONES','DUPLICATE_PURPOSE','INTERRUPTION_AND_RESUME','EXACTLY_ONCE_REWARD_CLAIM'],
      systemicDepth:['EASY_ENTRY','SYSTEM_INTERDEPENDENCE','CONTEXTUAL_TRADEOFFS','COMBINATORIAL_NEW_USES','MULTIPLE_VIABLE_SOLUTIONS','MASTERY_CHANGES_CHOICES','NEXT_OPEN_QUESTION'],
      academicSubjectMatterRequired:false,
      featureCountAndGrindingAreNotDepth:true,
      chain:['DISCOVERABLE_CLUE','EXPERIMENT_OR_MASTERY_CHOICE','COST_AND_COUNTERPLAY','NEW_PLAY_OPTION','NEXT_OPEN_QUESTION'],
      payoffAxes:['NEW_ACTION','NEW_ROUTE','BUILD_COMBINATION','WORLD_RELATIONSHIP','OPTIONAL_MASTERY'],
      numberOrRewardCountAloneInsufficient:true,
      preserveGenreSaveAndBalance:true,
      compareBeforeAfterPlayerChoices:true,
      failedHypothesesMustInformNextIteration:true
    }),
    priorFeedback:priorFeedback || null,
    factPackAvailable:Boolean(factPack && Object.keys(factPack).length),
    authorityExpanded:false
  });
}

