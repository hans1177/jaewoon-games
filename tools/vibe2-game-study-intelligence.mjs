// 파일명: tools/vibe2-game-study-intelligence.mjs
// 역할: 검증된 GAME STUDY 증거를 25개 학습 축으로 구조화하고 여러 게임의 지식을 병합/비교/압축한다.
// 원칙: 관찰되지 않은 수치/인과/품질을 추측하지 않는다. 증거가 부족하면 INSUFFICIENT_EVIDENCE로 남긴다.

const clean = (value) => String(value ?? '').trim();
const unique = (values = []) => [...new Set((values || []).map(clean).filter(Boolean))];
const freeze = (value) => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) freeze(child);
  }
  return value;
};
const clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0));
const round4 = (value) => Number((Number(value) || 0).toFixed(4));

export const GAME_STUDY_INTELLIGENCE_FEATURES = freeze([
  'mechanic-mining',
  'system-graph-learning',
  'progression-curve-learning',
  'economy-simulation-learning',
  'difficulty-curve-learning',
  'ui-interaction-mining',
  'onboarding-learning',
  'retention-loop-mining',
  'state-machine-extraction',
  'event-flow-extraction',
  'save-schema-learning',
  'architecture-distillation',
  'dependency-learning',
  'change-impact-learning',
  'bug-reproduction-learning',
  'exploit-resistance-pattern-learning',
  'performance-profiling-learning',
  'game-dna',
  'nearest-game-retrieval',
  'novelty-detection',
  'knowledge-merge',
  'knowledge-conflict',
  'automatic-hypothesis-testing',
  'synthetic-mini-game-training',
  'continual-distillation'
]);

const SYSTEM_PATTERNS = freeze({
  input: /input|key|click|pointer|touch|gamepad|키|클릭|입력/i,
  movement: /move|walk|run|jump|position|travel|이동|걷|달리|점프|위치/i,
  combat: /attack|enemy|damage|combat|hit|kill|weapon|hp|공격|적|피해|전투|타격|처치|무기|체력/i,
  economy: /gold|coin|reward|shop|buy|currency|price|골드|코인|보상|상점|구매|재화|가격/i,
  progression: /level|stage|quest|xp|progress|unlock|mission|레벨|스테이지|퀘스트|진행|해금|미션/i,
  ui: /ui|menu|button|inventory|hud|dialog|confirm|select|option|메뉴|버튼|인벤|대화창|선택|확인/i,
  restart: /restart|death|gameover|revive|respawn|재시작|사망|부활|리스폰/i,
  persistence: /save|load|datastore|storage|저장|불러오기/i,
  networking: /remote|network|socket|server|client|네트워크|서버|클라이언트/i,
  ai: /ai|bot|npc|opponent|pathfinding|인공지능|봇|엔피씨|상대/i,
  monetization: /marketplace|purchase|product|pass|monetization|상품|패스|결제/i
});

const ARCHITECTURE_BUCKETS = freeze({
  input: ['input-events', 'input-services'],
  persistence: ['client-persistence', 'datastore-persistence'],
  networking: ['network-io', 'network-remotes', 'server-remote-handler', 'remote-validation-guard'],
  runtime: ['frame-loop', 'timer-loop'],
  rendering: ['canvas-rendering'],
  audio: ['audio-system'],
  world: ['tagged-entities', 'pathfinding'],
  monetization: ['monetization-api'],
  character: ['character-humanoid']
});

const DNA_AXES = freeze([
  'input', 'movement', 'combat', 'economy', 'progression', 'ui', 'restart',
  'persistence', 'networking', 'ai', 'monetization', 'runtimeComplexity'
]);

function feature(status, evidence = [], data = null, note = '') {
  return freeze({ status, evidence: freeze(unique(evidence)), data: data == null ? null : freeze(data), note: clean(note) || null });
}

function classifyText(value = '') {
  const text = clean(value);
  for (const [name, pattern] of Object.entries(SYSTEM_PATTERNS)) if (pattern.test(text)) return name;
  return 'runtime-flow';
}

function safeTrace(autoPlayer = {}) {
  const actions = (autoPlayer?.playLog?.actions || []).slice(0, 80).map((row, index) => freeze({
    index,
    kind: 'action',
    id: clean(row?.id) || `action-${index + 1}`,
    type: clean(row?.type).toLowerCase() || 'unknown',
    name: clean(row?.name) || null,
    system: classifyText([row?.id, row?.type, row?.name].filter(Boolean).join(' ')),
    dispatched: row?.dispatched === true,
    ok: row?.ok !== false
  }));
  const checkpoints = (autoPlayer?.playLog?.checkpoints || []).slice(0, 80).map((row, index) => freeze({
    index: actions.length + index,
    kind: 'checkpoint',
    id: clean(row?.id) || `checkpoint-${index + 1}`,
    type: 'expect',
    name: clean(row?.name) || null,
    system: classifyText([row?.id, row?.name].filter(Boolean).join(' ')),
    required: row?.required !== false,
    pass: row?.pass === true
  }));
  return freeze([...actions, ...checkpoints]);
}

function metricSeries(metrics = {}, terms = []) {
  const rows = [];
  for (const [key, value] of Object.entries(metrics || {})) {
    const lower = key.toLowerCase();
    if (!terms.some((term) => lower.includes(term))) continue;
    if (Array.isArray(value)) {
      const points = value.map(Number).filter(Number.isFinite);
      if (points.length >= 2) rows.push({ key, points });
    }
  }
  return rows;
}

function metricNumbers(metrics = {}, terms = []) {
  const out = {};
  for (const [key, value] of Object.entries(metrics || {})) {
    const lower = key.toLowerCase();
    if (!terms.some((term) => lower.includes(term))) continue;
    const number = Number(value);
    if (Number.isFinite(number)) out[key] = number;
  }
  return out;
}

function sourcePatternNames(sourceAnalysis = {}) {
  return unique((sourceAnalysis?.patterns || []).map((row) => row?.name));
}

function mechanicsFrom(systems = [], sourceNames = [], tags = []) {
  const mechanics = new Set(unique(systems));
  const mapping = {
    'input-events': 'input', 'input-services': 'input',
    'client-persistence': 'persistence', 'datastore-persistence': 'persistence',
    'network-io': 'networking', 'network-remotes': 'networking', 'server-remote-handler': 'networking', 'remote-validation-guard': 'networking',
    'frame-loop': 'runtime-loop', 'timer-loop': 'runtime-loop',
    'canvas-rendering': 'rendering', 'audio-system': 'audio',
    'tagged-entities': 'entity-system', 'pathfinding': 'ai-navigation',
    'monetization-api': 'monetization', 'character-humanoid': 'character-controller'
  };
  for (const name of sourceNames) mechanics.add(mapping[name] || name);
  for (const tag of tags || []) {
    const system = classifyText(tag);
    if (system !== 'runtime-flow') mechanics.add(system);
  }
  return [...mechanics].filter(Boolean).sort();
}

function sequenceSystems(trace = []) {
  const values = [];
  for (const event of trace) {
    const system = clean(event?.system) || 'runtime-flow';
    if (!values.length || values.at(-1) !== system) values.push(system);
  }
  return values;
}

function sequenceEdges(sequence = [], relation = 'observed-sequence') {
  const map = new Map();
  for (let i = 0; i < sequence.length - 1; i += 1) {
    const from = clean(sequence[i]);
    const to = clean(sequence[i + 1]);
    if (!from || !to || from === to) continue;
    const key = `${from}->${to}`;
    const current = map.get(key) || { from, to, relation, confirmations: 0 };
    current.confirmations += 1;
    map.set(key, current);
  }
  return [...map.values()].sort((a, b) => b.confirmations - a.confirmations || `${a.from}:${a.to}`.localeCompare(`${b.from}:${b.to}`));
}

function sourceDependencies(sourceAnalysis = {}) {
  const patterns = sourceAnalysis?.patterns || [];
  const map = new Map();
  for (let i = 0; i < patterns.length; i += 1) {
    const leftFiles = new Set(patterns[i]?.files || []);
    if (!leftFiles.size) continue;
    for (let j = i + 1; j < patterns.length; j += 1) {
      const shared = (patterns[j]?.files || []).filter((file) => leftFiles.has(file));
      if (!shared.length) continue;
      const a = clean(patterns[i]?.name);
      const b = clean(patterns[j]?.name);
      if (!a || !b) continue;
      const key = [a, b].sort().join('<->');
      map.set(key, { systems: [a, b].sort(), relation: 'source-file-cooccurrence', sharedFileCount: shared.length });
    }
  }
  return [...map.values()].sort((a, b) => b.sharedFileCount - a.sharedFileCount || a.systems.join(':').localeCompare(b.systems.join(':')));
}

function architecture(sourceNames = [], systems = []) {
  const blocks = [];
  for (const [bucket, members] of Object.entries(ARCHITECTURE_BUCKETS)) {
    const matched = members.filter((name) => sourceNames.includes(name));
    if (matched.length) blocks.push({ block: bucket, evidencePatterns: matched });
  }
  for (const system of systems) {
    if (!blocks.some((row) => row.block === system)) blocks.push({ block: system, evidencePatterns: [] });
  }
  return blocks.sort((a, b) => a.block.localeCompare(b.block));
}

function findRetentionLoops(sequence = []) {
  const loops = [];
  for (let size = 2; size <= Math.min(6, Math.floor(sequence.length / 2)); size += 1) {
    for (let start = 0; start + size * 2 <= sequence.length; start += 1) {
      const left = sequence.slice(start, start + size);
      const right = sequence.slice(start + size, start + size * 2);
      if (left.join('|') === right.join('|')) loops.push(left);
    }
  }
  const seen = new Set();
  return loops.filter((loop) => {
    const key = loop.join('>');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 8);
}

function trend(points = []) {
  if (!Array.isArray(points) || points.length < 2) return null;
  const delta = Number(points.at(-1)) - Number(points[0]);
  return delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
}

function gameDna(systems = [], sourceNames = [], trace = []) {
  const systemSet = new Set(systems);
  const sourceSet = new Set(sourceNames);
  const runtimeComplexity = clamp01((sourceNames.length + Math.min(20, trace.length)) / 30);
  const valueFor = (axis) => {
    if (axis === 'runtimeComplexity') return round4(runtimeComplexity);
    let score = systemSet.has(axis) ? 0.65 : 0;
    const sourceMatches = {
      input: ['input-events', 'input-services'],
      persistence: ['client-persistence', 'datastore-persistence'],
      networking: ['network-io', 'network-remotes', 'server-remote-handler', 'remote-validation-guard'],
      ai: ['pathfinding'],
      monetization: ['monetization-api']
    }[axis] || [];
    if (sourceMatches.some((name) => sourceSet.has(name))) score += 0.35;
    const traceHits = trace.filter((event) => event.system === axis).length;
    if (traceHits) score = Math.max(score, Math.min(1, 0.5 + traceHits * 0.1));
    return round4(clamp01(score));
  };
  return freeze(Object.fromEntries(DNA_AXES.map((axis) => [axis, valueFor(axis)])));
}

export function gameDnaSimilarity(a = {}, b = {}) {
  let dot = 0, aa = 0, bb = 0;
  for (const axis of DNA_AXES) {
    const x = Number(a?.[axis]) || 0;
    const y = Number(b?.[axis]) || 0;
    dot += x * y;
    aa += x * x;
    bb += y * y;
  }
  if (!aa || !bb) return 0;
  return round4(dot / (Math.sqrt(aa) * Math.sqrt(bb)));
}

function replayAbstraction(sequence = [], edges = []) {
  if (sequence.length < 2 || edges.length < 1) return feature('INSUFFICIENT_EVIDENCE', [], null, 'at least two observed systems required');
  const edgeSet = new Set(edges.map((edge) => `${edge.from}->${edge.to}`));
  const missing = [];
  for (let i = 0; i < sequence.length - 1; i += 1) {
    const key = `${sequence[i]}->${sequence[i + 1]}`;
    if (sequence[i] !== sequence[i + 1] && !edgeSet.has(key)) missing.push(key);
  }
  return feature(missing.length ? 'FAIL' : 'VERIFIED', ['observed-system-sequence', 'derived-transition-graph'], {
    replayedTransitions: Math.max(0, sequence.length - 1),
    missingTransitions: unique(missing)
  }, 'abstract micro-simulation only; not a claim about original source implementation');
}

function staticExploitEvidence(sourceNames = []) {
  const hasRemotes = sourceNames.includes('network-remotes');
  const hasHandler = sourceNames.includes('server-remote-handler');
  const hasGuard = sourceNames.includes('remote-validation-guard');
  if (!hasRemotes) return feature('INSUFFICIENT_EVIDENCE', [], null, 'network remote evidence not observed');
  return feature(hasHandler && hasGuard ? 'VERIFIED' : 'PARTIAL', sourceNames.filter((name) => ['network-remotes', 'server-remote-handler', 'remote-validation-guard'].includes(name)), {
    remoteObserved: hasRemotes,
    serverHandlerObserved: hasHandler,
    validationGuardObserved: hasGuard
  }, 'static pattern evidence only; does not prove exploit resistance');
}

function performanceEvidence(metrics = {}, sourceNames = []) {
  const observed = metricNumbers(metrics, ['duration', 'firstaction', 'consoleerror', 'runtimeerror', 'actioncount', 'checkpointcount']);
  const staticRisks = sourceNames.filter((name) => ['frame-loop', 'timer-loop'].includes(name));
  if (!Object.keys(observed).length && !staticRisks.length) return feature('INSUFFICIENT_EVIDENCE');
  return feature('VERIFIED', [...Object.keys(observed).map((key) => `telemetry:${key}`), ...staticRisks.map((name) => `source:${name}`)], {
    observedMetrics: observed,
    staticLoopSignals: staticRisks,
    measuredPerformanceClaim: false
  });
}

export function buildGameStudyIntelligence({ study = {}, autoPlayer = {} } = {}) {
  const sourceNames = sourcePatternNames(study?.sourceAnalysis);
  const systems = unique(study?.observedSystems || []);
  const tags = unique(study?.tags || []);
  const trace = safeTrace(autoPlayer);
  const sequence = sequenceSystems(trace);
  const edges = sequenceEdges(sequence);
  const dependencies = sourceDependencies(study?.sourceAnalysis);
  const mechanics = mechanicsFrom(systems, sourceNames, tags);
  const arch = architecture(sourceNames, systems);
  const metrics = autoPlayer?.telemetry?.metrics || {};
  const progressionSeries = metricSeries(metrics, ['level', 'stage', 'xp', 'progress']);
  const economySeries = metricSeries(metrics, ['gold', 'coin', 'currency', 'reward', 'price', 'spend']);
  const difficultySeries = metricSeries(metrics, ['death', 'damage', 'health', 'hp', 'retry', 'clear', 'difficulty']);
  const loops = findRetentionLoops(sequence);
  const errors = (autoPlayer?.playLog?.errors || []).slice(0, 12).map((row) => typeof row === 'string' ? row : clean(row?.message || row?.type));
  const dna = gameDna(systems, sourceNames, trace);
  const firstInputIndex = trace.findIndex((event) => event.kind === 'action' && ['click', 'key', 'pointer', 'touch', 'gamepad'].includes(event.type));
  const firstCheckpointIndex = trace.findIndex((event) => event.kind === 'checkpoint');
  const firstCombatIndex = trace.findIndex((event) => event.system === 'combat');
  const firstEconomyIndex = trace.findIndex((event) => event.system === 'economy');
  const uiActions = trace.filter((event) => event.kind === 'action' && (event.system === 'ui' || event.type === 'click')).map((event) => ({ id: event.id, type: event.type, system: event.system }));
  const sourceHasPersistence = sourceNames.some((name) => ['client-persistence', 'datastore-persistence'].includes(name));
  const stateTransitions = edges.map((edge) => ({ from: edge.from, to: edge.to, evidence: edge.relation, confirmations: edge.confirmations }));
  const eventFlowEdges = [
    ...stateTransitions.map((row) => ({ from: row.from, to: row.to, relation: 'observed-runtime-sequence' })),
    ...dependencies.map((row) => ({ from: row.systems[0], to: row.systems[1], relation: row.relation }))
  ];
  const changeImpact = dependencies.map((row) => ({ source: row.systems[0], potentiallyImpacts: row.systems[1], evidence: row.relation }));
  const reusablePatterns = unique([
    ...mechanics.map((name) => `mechanic:${name}`),
    ...arch.map((row) => `architecture:${row.block}`),
    ...edges.filter((row) => row.confirmations >= 1).map((row) => `observed-flow:${row.from}->${row.to}`),
    ...loops.map((loop) => `observed-loop:${loop.join('>')}`),
    ...dependencies.map((row) => `source-cooccurrence:${row.systems.join('<->')}`)
  ]);
  const features = {
    'mechanic-mining': feature(mechanics.length ? 'VERIFIED' : 'INSUFFICIENT_EVIDENCE', mechanics.map((name) => `mechanic:${name}`), { mechanics }),
    'system-graph-learning': feature(edges.length ? 'VERIFIED' : 'INSUFFICIENT_EVIDENCE', edges.map((row) => `${row.from}->${row.to}`), { nodes: unique(sequence), edges }),
    'progression-curve-learning': progressionSeries.length ? feature('VERIFIED', progressionSeries.map((row) => `telemetry:${row.key}`), { series: progressionSeries.map((row) => ({ ...row, trend: trend(row.points) })) }) : feature('INSUFFICIENT_EVIDENCE', systems.includes('progression') ? ['observed-system:progression'] : [], null, 'quantitative progression series required'),
    'economy-simulation-learning': economySeries.length ? feature('VERIFIED', economySeries.map((row) => `telemetry:${row.key}`), { series: economySeries.map((row) => ({ ...row, trend: trend(row.points) })), simulationMode: 'offline-observed-series' }) : feature('INSUFFICIENT_EVIDENCE', systems.includes('economy') ? ['observed-system:economy'] : [], null, 'numeric economy series required'),
    'difficulty-curve-learning': difficultySeries.length ? feature('VERIFIED', difficultySeries.map((row) => `telemetry:${row.key}`), { series: difficultySeries.map((row) => ({ ...row, trend: trend(row.points) })) }) : feature('INSUFFICIENT_EVIDENCE', systems.includes('combat') ? ['observed-system:combat'] : [], null, 'numeric difficulty/outcome series required'),
    'ui-interaction-mining': feature(uiActions.length ? 'VERIFIED' : 'INSUFFICIENT_EVIDENCE', uiActions.map((row) => `action:${row.id}`), { flow: uiActions }),
    'onboarding-learning': feature(firstInputIndex >= 0 || firstCheckpointIndex >= 0 ? 'VERIFIED' : 'INSUFFICIENT_EVIDENCE', ['ordered-play-trace'], { firstInputIndex, firstCheckpointIndex, firstCombatIndex, firstEconomyIndex }),
    'retention-loop-mining': loops.length ? feature('VERIFIED', loops.map((loop) => `loop:${loop.join('>')}`), { loops }) : feature('INSUFFICIENT_EVIDENCE', ['ordered-play-trace'], null, 'no repeated observed loop in this run'),
    'state-machine-extraction': feature(stateTransitions.length ? 'VERIFIED' : 'INSUFFICIENT_EVIDENCE', stateTransitions.map((row) => `${row.from}->${row.to}`), { states: unique(sequence), transitions: stateTransitions }),
    'event-flow-extraction': feature(eventFlowEdges.length ? 'VERIFIED' : 'INSUFFICIENT_EVIDENCE', eventFlowEdges.map((row) => `${row.relation}:${row.from}->${row.to}`), { edges: eventFlowEdges }),
    'save-schema-learning': sourceHasPersistence ? feature('VERIFIED', sourceNames.filter((name) => ['client-persistence', 'datastore-persistence'].includes(name)), { providerPatterns: sourceNames.filter((name) => ['client-persistence', 'datastore-persistence'].includes(name)), rawKeysPersisted: false, schemaValuesPersisted: false }) : feature('INSUFFICIENT_EVIDENCE'),
    'architecture-distillation': feature(arch.length ? 'VERIFIED' : 'INSUFFICIENT_EVIDENCE', arch.map((row) => `architecture:${row.block}`), { blocks: arch }),
    'dependency-learning': feature(dependencies.length ? 'VERIFIED' : 'INSUFFICIENT_EVIDENCE', dependencies.map((row) => `dependency:${row.systems.join('<->')}`), { dependencies }),
    'change-impact-learning': feature(changeImpact.length ? 'VERIFIED' : 'INSUFFICIENT_EVIDENCE', changeImpact.map((row) => `potential-impact:${row.source}->${row.potentiallyImpacts}`), { impacts: changeImpact, causalClaim: false }),
    'bug-reproduction-learning': errors.length ? feature('VERIFIED', errors.map((_, index) => `runtime-error:${index + 1}`), { errors, replayActionIds: trace.filter((event) => event.kind === 'action').map((event) => event.id) }) : feature('NO_FAILURE_OBSERVED', ['runtime-error-count:0'], { errors: [] }),
    'exploit-resistance-pattern-learning': staticExploitEvidence(sourceNames),
    'performance-profiling-learning': performanceEvidence(metrics, sourceNames),
    'game-dna': feature('VERIFIED', [...systems.map((name) => `system:${name}`), ...sourceNames.map((name) => `source:${name}`)], { axes: dna }),
    'nearest-game-retrieval': feature('PENDING_CROSS_GAME', ['game-dna'], { queryAxes: dna }),
    'novelty-detection': feature('PENDING_CROSS_GAME', ['game-dna'], { queryAxes: dna }),
    'knowledge-merge': feature('PENDING_CROSS_GAME', reusablePatterns, { candidatePatterns: reusablePatterns }),
    'knowledge-conflict': feature('PENDING_CROSS_GAME', [], { claims: [] }),
    'automatic-hypothesis-testing': feature('PENDING_CROSS_GAME', edges.map((row) => `hypothesis:${row.from}->${row.to}`), { hypotheses: edges.map((row) => ({ statement: `${row.from} precedes ${row.to} in observed traces`, key: `${row.from}->${row.to}` })) }),
    'synthetic-mini-game-training': replayAbstraction(sequence, edges),
    'continual-distillation': feature('PENDING_CROSS_GAME', reusablePatterns, { candidatePatterns: reusablePatterns })
  };
  return freeze({
    version: 1,
    kind: 'vibe2-game-study-intelligence',
    studyId: clean(study?.id) || null,
    gameId: clean(study?.gameId) || null,
    engine: clean(study?.engine) || null,
    features: freeze(features),
    featureCatalog: GAME_STUDY_INTELLIGENCE_FEATURES,
    reusablePatterns: freeze(reusablePatterns),
    gameDna: dna,
    traceSummary: freeze({ eventCount: trace.length, sequence: freeze(sequence), inputCount: trace.filter((event) => event.kind === 'action' && event.dispatched).length, checkpointCount: trace.filter((event) => event.kind === 'checkpoint').length }),
    policy: freeze({
      evidenceGated: true,
      noInventedCausality: true,
      rawSourceCopiedIntoKnowledge: false,
      rawGameplayValuesAutoCopied: false,
      insufficientEvidenceIsNotPromotedAsFact: true,
      authorityExpanded: false
    }),
    authorityExpanded: false,
    authority: 'vibe2-game-study-intelligence-derived'
  });
}

export function attachGameStudyIntelligence(study = {}, autoPlayer = {}) {
  const intelligence = buildGameStudyIntelligence({ study, autoPlayer });
  const distilledPatterns = unique([...(study?.distilledPatterns || []), ...intelligence.reusablePatterns.map((row) => `study-intelligence:${row}`)]);
  return freeze({ ...study, version: Math.max(2, Number(study?.version) || 1), distilledPatterns: freeze(distilledPatterns), intelligence, authorityExpanded: false });
}

function normalizeKnowledgeEntry(row = {}) {
  return freeze({
    studyId: clean(row.studyId),
    gameId: clean(row.gameId),
    engine: clean(row.engine),
    confirmations: Math.max(1, Math.floor(Number(row.confirmations) || 1)),
    gameDna: freeze({ ...(row.gameDna || {}) }),
    reusablePatterns: freeze(unique(row.reusablePatterns || [])),
    hypotheses: freeze(unique(row.hypotheses || [])),
    features: freeze({ ...(row.features || {}) }),
    firstSeenAt: clean(row.firstSeenAt) || null,
    lastSeenAt: clean(row.lastSeenAt) || clean(row.firstSeenAt) || null
  });
}

export function createGameStudyKnowledge(seed = {}) {
  const entries = (Array.isArray(seed?.entries) ? seed.entries : []).map(normalizeKnowledgeEntry).filter((row) => row.studyId && row.gameId);
  return freeze({
    version: 1,
    kind: 'vibe2-game-study-knowledge',
    entries: freeze(entries),
    derived: freeze({ ...(seed?.derived || {}) }),
    policy: freeze({
      serverFanInOnly: true,
      verifiedStudiesOnly: true,
      rawSourcePersisted: false,
      noInventedCausality: true,
      authorityExpanded: false
    }),
    authorityExpanded: false,
    authority: 'vibe2-game-study-knowledge-derived'
  });
}

function deriveCrossGame(entries = []) {
  const patternMap = new Map();
  const hypothesisMap = new Map();
  for (const entry of entries) {
    for (const pattern of entry.reusablePatterns || []) {
      const current = patternMap.get(pattern) || { pattern, confirmations: 0, games: new Set(), engines: new Set() };
      current.confirmations += entry.confirmations || 1;
      current.games.add(entry.gameId);
      if (entry.engine) current.engines.add(entry.engine);
      patternMap.set(pattern, current);
    }
    for (const hypothesis of entry.hypotheses || []) {
      const current = hypothesisMap.get(hypothesis) || { hypothesis, confirmations: 0, games: new Set() };
      current.confirmations += entry.confirmations || 1;
      current.games.add(entry.gameId);
      hypothesisMap.set(hypothesis, current);
    }
  }
  const mergedKnowledge = [...patternMap.values()]
    .map((row) => ({ pattern: row.pattern, confirmations: row.confirmations, gameCount: row.games.size, games: [...row.games].sort(), engines: [...row.engines].sort(), crossGameVerified: row.games.size >= 2 }))
    .sort((a, b) => b.gameCount - a.gameCount || b.confirmations - a.confirmations || a.pattern.localeCompare(b.pattern));
  const testedHypotheses = [...hypothesisMap.values()]
    .map((row) => ({ hypothesis: row.hypothesis, confirmations: row.confirmations, gameCount: row.games.size, status: row.games.size >= 2 ? 'SUPPORTED_ACROSS_GAMES' : 'OBSERVED_ONCE' }))
    .sort((a, b) => b.gameCount - a.gameCount || b.confirmations - a.confirmations || a.hypothesis.localeCompare(b.hypothesis));
  const conflicts = [];
  const byBase = new Map();
  for (const row of mergedKnowledge) {
    const negative = row.pattern.startsWith('avoid:');
    const base = negative ? row.pattern.slice(6) : row.pattern.replace(/^prefer:/, '');
    const bucket = byBase.get(base) || { positive: [], negative: [] };
    (negative ? bucket.negative : bucket.positive).push(row);
    byBase.set(base, bucket);
  }
  for (const [base, bucket] of byBase.entries()) {
    if (bucket.positive.length && bucket.negative.length) conflicts.push({ key: base, positive: bucket.positive, negative: bucket.negative, status: 'CONFLICT_REQUIRES_CONTEXT' });
  }
  return freeze({
    mergedKnowledge: freeze(mergedKnowledge),
    conflicts: freeze(conflicts),
    hypotheses: freeze(testedHypotheses),
    continualDistillation: freeze({
      inputEntryCount: entries.length,
      uniquePatternCount: mergedKnowledge.length,
      crossGamePatternCount: mergedKnowledge.filter((row) => row.crossGameVerified).length,
      compressedPatternCount: mergedKnowledge.length,
      duplicatePatternObservations: Math.max(0, entries.reduce((sum, entry) => sum + (entry.reusablePatterns || []).length, 0) - mergedKnowledge.length)
    })
  });
}

export function findNearestGameStudies(knowledgeInput = {}, dna = {}, { limit = 5, excludeGameId = '' } = {}) {
  const knowledge = createGameStudyKnowledge(knowledgeInput);
  return freeze(knowledge.entries
    .filter((entry) => !clean(excludeGameId) || entry.gameId !== clean(excludeGameId))
    .map((entry) => ({ gameId: entry.gameId, engine: entry.engine, studyId: entry.studyId, similarity: gameDnaSimilarity(dna, entry.gameDna), confirmations: entry.confirmations }))
    .sort((a, b) => b.similarity - a.similarity || b.confirmations - a.confirmations || a.gameId.localeCompare(b.gameId))
    .slice(0, Math.max(1, Math.floor(Number(limit) || 5))));
}

export function updateGameStudyKnowledge(knowledgeInput = {}, study = {}) {
  const current = createGameStudyKnowledge(knowledgeInput);
  if (study?.verified !== true || study?.intelligence?.kind !== 'vibe2-game-study-intelligence') {
    return freeze({ updated: false, reason: 'verified-intelligent-study-required', knowledge: current, nearest: freeze([]), novelty: null, authorityExpanded: false });
  }
  const intelligence = study.intelligence;
  const now = clean(study?.createdAt) || new Date().toISOString();
  const hypotheses = unique((intelligence?.features?.['automatic-hypothesis-testing']?.data?.hypotheses || []).map((row) => row?.key));
  const existing = current.entries.find((row) => row.studyId === study.id);
  const entry = normalizeKnowledgeEntry({
    studyId: study.id,
    gameId: study.gameId,
    engine: study.engine,
    confirmations: existing ? existing.confirmations + 1 : 1,
    gameDna: intelligence.gameDna,
    reusablePatterns: intelligence.reusablePatterns,
    hypotheses,
    features: Object.fromEntries(GAME_STUDY_INTELLIGENCE_FEATURES.map((name) => [name, intelligence.features?.[name]?.status || 'INSUFFICIENT_EVIDENCE'])),
    firstSeenAt: existing?.firstSeenAt || now,
    lastSeenAt: now
  });
  const entries = existing ? current.entries.map((row) => row.studyId === study.id ? entry : row) : [...current.entries, entry];
  const nearest = findNearestGameStudies({ entries }, entry.gameDna, { limit: 5, excludeGameId: entry.gameId });
  const maxSimilarity = nearest.length ? nearest[0].similarity : 0;
  const novelty = round4(1 - maxSimilarity);
  const derived = deriveCrossGame(entries);
  const next = freeze({
    version: 1,
    kind: 'vibe2-game-study-knowledge',
    entries: freeze(entries),
    derived: freeze({
      ...derived,
      nearestForLatest: nearest,
      latestNovelty: freeze({ gameId: entry.gameId, novelty, basis: nearest.length ? 'nearest-game-dna' : 'first-known-game' }),
      updatedAt: now
    }),
    policy: current.policy,
    authorityExpanded: false,
    authority: 'vibe2-game-study-knowledge-derived'
  });
  return freeze({ updated: true, reason: existing ? 'knowledge-reinforced' : 'knowledge-added', knowledge: next, nearest, novelty, authorityExpanded: false });
}

export function gameStudyIntelligenceSummary(knowledgeInput = {}) {
  const knowledge = createGameStudyKnowledge(knowledgeInput);
  const derived = deriveCrossGame(knowledge.entries);
  return freeze({
    version: 1,
    entryCount: knowledge.entries.length,
    gameCount: new Set(knowledge.entries.map((row) => row.gameId)).size,
    engineCount: new Set(knowledge.entries.map((row) => row.engine)).size,
    crossGamePatternCount: derived.mergedKnowledge.filter((row) => row.crossGameVerified).length,
    conflictCount: derived.conflicts.length,
    supportedHypothesisCount: derived.hypotheses.filter((row) => row.status === 'SUPPORTED_ACROSS_GAMES').length,
    featureCount: GAME_STUDY_INTELLIGENCE_FEATURES.length,
    authorityExpanded: false
  });
}
