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
  if (!required) return freeze({required:false,status:'NOT_APPLICABLE',issues:freezeList([]),authorityExpanded:false});
  const worldRules = unique(supplied.worldRules || task.worldRules || []);
  const characterGoals = unique(supplied.characterGoals || task.characterGoals || []);
  const plotBeats = unique(supplied.plotBeats || task.plotBeats || []);
  const questStates = unique(supplied.questStates || task.questStates || []);
  const foreshadowing = unique(supplied.foreshadowing || task.foreshadowing || []);
  const payoffs = unique(supplied.payoffs || task.payoffs || []);
  const dialogueRules = unique(supplied.dialogueRules || task.dialogueRules || []);
  const dialogueMaterial=task.dialogueRequired===true||/dialogue|conversation|대화|대사|말투|화법/.test(goal.toLowerCase())||Array.isArray(supplied.characterVoices)||Array.isArray(supplied.dialogueScenes);
  const characterVoices=freezeList((Array.isArray(supplied.characterVoices)?supplied.characterVoices:[]).map((row,index)=>freeze({
    id:clean(row?.id||row?.name)||'character-'+(index+1),
    roleBackground:clean(row?.roleBackground||row?.background||row?.role),
    relationship:clean(row?.relationship||row?.relationshipToListener),
    register:clean(row?.register||row?.formality||row?.speechRegister),
    vocabulary:clean(row?.vocabulary||row?.sentenceRhythm),
    emotionalBaseline:clean(row?.emotionalBaseline),
    currentEmotion:clean(row?.currentEmotion),
    knowledgeBoundary:clean(row?.knowledgeBoundary),
    wantNeed:clean(row?.wantNeed||row?.want||row?.goal),
    hiddenIntent:clean(row?.hiddenIntent),
    avoidSaying:clean(row?.avoidSaying||row?.taboos),
    speechTraits:clean(row?.speechTraits)
  })));
  const dialogueScenes=freezeList((Array.isArray(supplied.dialogueScenes)?supplied.dialogueScenes:[]).map((row,index)=>freeze({
    id:clean(row?.id)||'scene-'+(index+1),
    objective:clean(row?.objective||row?.sceneObjective),
    wants:clean(row?.wants||row?.whoWantsWhat),
    relationshipState:clean(row?.relationshipState),
    knownUnknown:clean(row?.knownUnknown||row?.knownAndUnknownInformation),
    subtext:clean(row?.subtext),
    conflict:clean(row?.conflict||row?.tension),
    beatChange:clean(row?.beatChange),
    playerInformation:clean(row?.playerInformation),
    foreshadowing:clean(row?.foreshadowing),
    payoffLink:clean(row?.payoffLink),
    reversalReveal:clean(row?.reversalReveal||row?.reveal),
    expositionDump:row?.expositionDump===true,
    knowledgeLeak:row?.knowledgeLeak===true,
    voiceDrift:row?.voiceDrift===true
  })));
  const issues = [];
  if (!worldRules.length) issues.push('NARRATIVE_WORLD_RULES_NOT_BOUND');
  if (!characterGoals.length) issues.push('CHARACTER_WANT_NEED_OR_CONFLICT_NOT_BOUND');
  if (!plotBeats.length && !questStates.length) issues.push('PLOT_OR_QUEST_CAUSALITY_NOT_BOUND');
  if (foreshadowing.length && !payoffs.length) issues.push('FORESHADOWING_WITHOUT_TRACKED_PAYOFF');
  const revealPresent=plotBeats.some(value=>/twist|reveal|reversal|반전|폭로|진실/.test(value.toLowerCase()));
  if(revealPresent&&!foreshadowing.length)issues.push('MAJOR_REVEAL_WITHOUT_PRIOR_FAIR_CLUE');
  if(dialogueMaterial){
    if(supplied.grammarReviewed!==true)issues.push('DIALOGUE_GRAMMAR_AND_NATURALNESS_REVIEW_NOT_BOUND');
    if(!characterVoices.length)issues.push('CHARACTER_VOICE_BIBLE_REQUIRED');
    if(!dialogueScenes.length)issues.push('DIALOGUE_SCENE_OBJECTIVES_REQUIRED');
    for(const voice of characterVoices){
      if(!voice.roleBackground||!voice.register||!voice.vocabulary||!voice.emotionalBaseline||!voice.knowledgeBoundary||!voice.wantNeed)issues.push('CHARACTER_VOICE_INCOMPLETE:'+voice.id);
    }
    const signatures=characterVoices.map(row=>[row.register,row.vocabulary,row.speechTraits].map(clean).join('|').toLowerCase()).filter(Boolean);
    if(signatures.length>=2&&new Set(signatures).size===1)issues.push('ALL_MAJOR_CHARACTERS_SHARE_SAME_VOICE');
    for(const scene of dialogueScenes){
      if(!scene.objective||!scene.relationshipState||!scene.knownUnknown||(!scene.subtext&&!scene.conflict))issues.push('DIALOGUE_SCENE_CONTEXT_INCOMPLETE:'+scene.id);
      if(scene.expositionDump)issues.push('EXPOSITION_DUMP_DIALOGUE:'+scene.id);
      if(scene.knowledgeLeak)issues.push('CHARACTER_KNOWLEDGE_LEAK:'+scene.id);
      if(scene.voiceDrift)issues.push('UNEXPLAINED_CHARACTER_VOICE_DRIFT:'+scene.id);
    }
  }
  return freeze({
    required:true,status:issues.length?'ADVISORY':'READY',
    worldRules:freezeList(worldRules),characterGoals:freezeList(characterGoals),plotBeats:freezeList(plotBeats),questStates:freezeList(questStates),
    foreshadowing:freezeList(foreshadowing),payoffs:freezeList(payoffs),dialogueRules:freezeList(dialogueRules),
    dialogueMaterial,grammarReviewed:supplied.grammarReviewed===true,characterVoices,dialogueScenes,issues:freezeList(unique(issues)),
    principles:freezeList([
      'WORLD_RULES_AND_CHARACTER_KNOWLEDGE_MUST_STAY_CONSISTENT',
      'QUESTS_REQUIRE_PREREQUISITE_ACTION_STATE_CHANGE_AND_CONSEQUENCE',
      'MEANINGFUL_CHOICES_REQUIRE_OBSERVABLE_CONSEQUENCE',
      'DIALOGUE_MUST_SERVE_CHARACTER_GOAL_CONTEXT_RELATIONSHIP_AND_SCENE_OBJECTIVE',
      'CHARACTER_VOICE_MUST_REFLECT_ROLE_RELATIONSHIP_EMOTION_KNOWLEDGE_AND_HIDDEN_INTENT',
      'TWISTS_REQUIRE_FAIR_PRIOR_CLUES_WHEN_REVEAL_STRUCTURE_DEPENDS_ON_THEM',
      'FORESHADOWING_MUST_TRACK_PAYOFF_OR_INTENTIONAL_OPEN_QUESTION',
      'DISTILL_REFERENCE_TECHNIQUE_NOT_REFERENCE_EXPRESSION'
    ]),authorityExpanded:false
  });
}

function normalizeStabilityIssues(task={}){
  const rows=Array.isArray(task.stabilityIssues)?task.stabilityIssues:Array.isArray(task.knownIssues)?task.knownIssues:[];
  return freezeList(rows.map((row,index)=>typeof row==='string'
    ?freeze({id:'issue-'+(index+1),severity:/crash|fatal|softlock|save|desync|regression|진행.?막|세이브|크래시|동기화|회귀/i.test(row)?'HIGH':'LOW',kind:'UNCLASSIFIED',summary:clean(row),playerExposure:null})
    :freeze({id:clean(row?.id)||'issue-'+(index+1),severity:clean(row?.severity).toUpperCase()||'LOW',kind:clean(row?.kind).toUpperCase()||'UNCLASSIFIED',summary:clean(row?.summary||row?.issue||row?.text),playerExposure:Number.isFinite(Number(row?.playerExposure))?Number(row.playerExposure):null})
  ).filter(row=>row.summary));
}
function evaluateStabilization(task={}){
  const issues=normalizeStabilityIssues(task);
  const critical=issues.filter(row=>['CRITICAL','HIGH'].includes(row.severity)||/CRASH|BOOT|SOFTLOCK|PROGRESSION|SAVE|INPUT|DESYNC|AUTHORITY|REGRESSION|CORE_RULE/.test(row.kind));
  const repeatedMinor=issues.filter(row=>row.severity==='LOW'&&Number(row.playerExposure||0)>=3);
  const redesignCausal=task.redesignCausallyRequired===true;
  return freeze({status:critical.length?'REPAIR_FIRST':'STABLE_ENOUGH_FOR_DESIGN_EXPLORATION',issues,critical:freezeList(critical),repeatedMinorEscalations:freezeList(repeatedMinor),speculativeExpansionAllowed:critical.length===0||redesignCausal,redesignCausallyRequired:redesignCausal,priority:'STABILIZE_BEFORE_SPECULATIVE_EXPANSION'});
}
function evaluateDesignHealth(task={},designer={}){
  const rows=Array.isArray(task.designHealthFindings)?task.designHealthFindings:Array.isArray(task.playtestFindings)?task.playtestFindings:[];
  const findings=freezeList(rows.map((row,index)=>typeof row==='string'
    ?freeze({id:'finding-'+(index+1),domain:'GENERAL',severity:'MEDIUM',finding:clean(row),playerExposure:1,repeated:1})
    :freeze({id:clean(row?.id)||'finding-'+(index+1),domain:clean(row?.domain).toUpperCase()||'GENERAL',severity:clean(row?.severity).toUpperCase()||'MEDIUM',finding:clean(row?.finding||row?.summary||row?.text),playerExposure:Math.max(0,Number(row?.playerExposure)||0),repeated:Math.max(1,Number(row?.repeated)||1)})
  ).filter(row=>row.finding));
  const severityScore={CRITICAL:40,HIGH:28,MEDIUM:16,LOW:6};
  let score=designer?.ownerEventId?100:0;
  score+=Math.max(0,(designer?.ownerRepeatCount||0)-1)*20;
  for(const row of findings)score+=(severityScore[row.severity]||10)+Math.min(12,row.playerExposure*2)+Math.min(12,(row.repeated-1)*3);
  return freeze({status:findings.length?'EVIDENCE_AVAILABLE':'AWAITING_VERIFIED_FINDINGS',findings,priorityScore:score,ownerPriority:Boolean(designer?.ownerEventId),inspectedAxes:freezeList(['FIRST_1_5_20_MINUTES','CORE_FUN','GOAL_CLARITY','PLAYER_CHOICE','RISK_REWARD','PROGRESSION','CONTENT_VARIETY','MAP_REGION_VARIETY','ENEMY_ROLE_VARIETY','QUEST_VARIETY','BOSS_SIGNATURE_MOMENTS','PLATFORM_FIT'])});
}
function evaluateBlueprint(task={},designer={}){
  const supplied=task.designBlueprint&&typeof task.designBlueprint==='object'?task.designBlueprint:{};
  const requiredSections=['conceptPremise','designPillars','emotionalGameplayArc','first1_5_20Minutes','coreAndMetaLoop','signatureSystems','mapRegionsLandmarks','contentRhythm','enemyBossRoles','questEventStructure','progressionEconomyReward','failureRetryRecovery','platformProfiles','implementationImpact','validationPlan'];
  const missing=requiredSections.filter(key=>{const value=supplied[key];return !(clean(value)||(Array.isArray(value)&&value.length));});
  const issues=[];
  if(designer?.designChange&&designer.alternatives.length<2)issues.push('PLAN_A_AND_PLAN_B_REQUIRED');
  if(designer?.designChange&&missing.length)issues.push(...missing.map(key=>'DETAILED_BLUEPRINT_SECTION_MISSING:'+key));
  return freeze({required:designer?.designChange===true,status:issues.length?'ADVISORY':'READY',planA:designer?.alternatives?.[0]||null,planB:designer?.alternatives?.[1]||null,alternatives:designer?.alternatives||freezeList([]),requiredSections:freezeList(requiredSections),missingSections:freezeList(missing),issues:freezeList(unique(issues)),comparisonAxes:freezeList(['CORE_FUN_GAIN','OWNER_INTENT_FIT','IDENTITY_COHERENCE','NOVELTY','PLAYER_CLARITY','EXTENSIBILITY','IMPLEMENTATION_COST','PLATFORM_FIT','REGRESSION_RISK','REVERSIBILITY'])});
}
function evaluateCreativeChallenge(task={},designer={}){
  const currentGenre=clean(task.currentGenre||task?.approvedDesign?.genre);
  const proposedGenre=clean(task.proposedGenre);
  const genrePivot=Boolean(currentGenre&&proposedGenre&&currentGenre.toLowerCase()!==proposedGenre.toLowerCase());
  const evidenceAvailable=Boolean(clean(task.genrePivotEvidence)||(Array.isArray(task.designHealthFindings)&&task.designHealthFindings.length)||task.ownerDirective===true);
  const alternatives=designer?.alternatives||[];
  const issues=[];
  if(genrePivot&&alternatives.length<2)issues.push('GENRE_PIVOT_REQUIRES_IDENTITY_PRESERVING_AND_PIVOT_ALTERNATIVES');
  if(genrePivot&&!evidenceAvailable)issues.push('GENRE_PIVOT_REQUIRES_OWNER_OR_VERIFIED_EVIDENCE');
  return freeze({identityIsAnchorNotPrison:true,currentGenre:currentGenre||null,proposedGenre:proposedGenre||null,genrePivot,genrePivotAllowed:!genrePivot||(alternatives.length>=2&&evidenceAvailable),levels:freezeList(['SAFE_EXPANSION','BOLD_EXPERIMENT','GENRE_HYBRIDIZATION','GENRE_PIVOT']),selectedLevel:clean(task.creativeChallengeLevel).toUpperCase()||'SAFE_EXPANSION',reversiblePrototypePreferred:genrePivot||clean(task.creativeChallengeLevel).toUpperCase()==='BOLD_EXPERIMENT',issues:freezeList(issues)});
}
function evaluateContentDiversity(task={},designer={}){
  const regions=Array.isArray(task.mapRegions)?task.mapRegions:[];
  const enemies=Array.isArray(task.enemyRoster)?task.enemyRoster:Array.isArray(task.monsterRoster)?task.monsterRoster:[];
  const quests=Array.isArray(task.questPatterns)?task.questPatterns:[];
  const roleValue=(row,...keys)=>keys.map(key=>clean(row?.[key])).find(Boolean)||'';
  const issues=[];
  if(regions.length>=2){const gameplay=new Set(regions.map(row=>roleValue(row,'gameplayFunction','role','dangerProfile')).filter(Boolean).map(x=>x.toLowerCase()));if(gameplay.size<2)issues.push('MAP_REGIONS_DIFFER_ONLY_BY_THEME_OR_PALETTE');}else if(designer?.designChange)issues.push('MAP_REGION_VARIETY_NOT_DEMONSTRATED');
  if(enemies.length>=3){const roles=new Set(enemies.map(row=>roleValue(row,'role','behavior','counterplay')).filter(Boolean).map(x=>x.toLowerCase()));if(roles.size<2)issues.push('ENEMY_ROSTER_ROLE_VARIETY_TOO_LOW');}else if(designer?.designChange)issues.push('ENEMY_CREATURE_ROLE_VARIETY_NOT_DEMONSTRATED');
  if(quests.length>=3){const types=new Set(quests.map(row=>roleValue(row,'type','stateChange','playerChoice')).filter(Boolean).map(x=>x.toLowerCase()));if(types.size<2)issues.push('QUEST_TEMPLATE_REPETITION_RISK');}
  return freeze({status:issues.length?'ADVISORY':'READY',mapRegionCount:regions.length,enemyCreatureCount:enemies.length,questPatternCount:quests.length,issues:freezeList(unique(issues)),requiredAxes:freezeList(['ROLE','PLAYER_RESPONSE','UNIQUE_BEHAVIOR','COUNTERPLAY','WORLD_CONTEXT','REWARD_MEANING','MOTION_OR_PRESENTATION_IDENTITY'])});
}
function evaluateLiteraryInspiration(task={}){
  const supplied=Array.isArray(task.inspirations)?task.inspirations:Array.isArray(task?.narrative?.inspirations)?task.narrative.inspirations:[];
  const rows=freezeList(supplied.map((row,index)=>typeof row==='string'
    ?freeze({id:'inspiration-'+(index+1),title:clean(row),mode:'ABSTRACT_STRUCTURE_OR_MOTIF',publicDomain:null,expressionCopy:false,livingAuthorStyle:false})
    :freeze({id:clean(row?.id)||'inspiration-'+(index+1),title:clean(row?.title||row?.work),mode:clean(row?.mode).toUpperCase()||'ABSTRACT_STRUCTURE_OR_MOTIF',publicDomain:row?.publicDomain===true?true:row?.publicDomain===false?false:null,expressionCopy:row?.expressionCopy===true,livingAuthorStyle:row?.livingAuthorStyle===true})
  ).filter(row=>row.title));
  const issues=[];
  for(const row of rows){if(row.expressionCopy)issues.push('PROTECTED_EXPRESSION_COPY_FORBIDDEN:'+row.id);if(row.livingAuthorStyle)issues.push('LIVING_AUTHOR_STYLE_IMITATION_FORBIDDEN:'+row.id);if(row.mode==='DIRECT_MOTIF_HOMAGE'&&row.publicDomain!==true)issues.push('DIRECT_HOMAGE_REQUIRES_CONFIRMED_PUBLIC_DOMAIN_OR_CLEAR_RIGHTS:'+row.id);}
  return freeze({allowed:true,inspirations:rows,status:issues.length?'ADVISORY':'READY',publicDomainPreferredForDirectMotifHomage:true,abstractStructureThemeMotifArchetypeAllowed:true,gameDistinctIdentityRequired:true,issues:freezeList(unique(issues))});
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
