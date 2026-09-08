// 파일명: assets/vibe-motion-core.js
// 역할: 엔진 중립 모션 계약·전환·전투 동기화·리타게팅·품질 게이트를 정의한다.
// 원칙: 모션은 판정 타이밍을 설명하지만 HP/데미지/보상 같은 권위 결과를 직접 변경하지 않는다.

const clean = (value) => String(value ?? '').trim();
const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, number(value, min)));
const unique = (values = []) => [...new Set(values.map(clean).filter(Boolean))];
const freezeList = (values = []) => Object.freeze(unique(values));
const freeze = (value) => Object.freeze(value);

export const VIBE_MOTION_REQUIRED_STATES = freezeList(['idle', 'move', 'attack', 'hit', 'death']);
export const VIBE_MOTION_OPTIONAL_STATES = freezeList(['run', 'attack-combo', 'skill', 'cast', 'block', 'dodge', 'stun', 'knockback', 'jump', 'fall', 'land', 'interact']);
export const VIBE_MOTION_QUALITY_AXES = freezeList(['coverage', 'transition', 'combatSync', 'footStability', 'rootMotion', 'retarget', 'readability', 'performance', 'repetition']);

const DEFAULT_TRANSITIONS = freeze({
  idle: freezeList(['move', 'run', 'attack', 'skill', 'hit', 'stun', 'death']),
  move: freezeList(['idle', 'run', 'attack', 'skill', 'hit', 'stun', 'death']),
  run: freezeList(['idle', 'move', 'attack', 'skill', 'hit', 'stun', 'death']),
  attack: freezeList(['idle', 'move', 'run', 'attack-combo', 'hit', 'stun', 'death']),
  'attack-combo': freezeList(['idle', 'move', 'run', 'attack', 'attack-combo', 'hit', 'stun', 'death']),
  skill: freezeList(['idle', 'move', 'run', 'hit', 'stun', 'death']),
  hit: freezeList(['idle', 'move', 'run', 'stun', 'death']),
  stun: freezeList(['idle', 'move', 'death']),
  death: freezeList([])
});

function normalizeState(input, index = 0) {
  const id = clean(input?.id) || `state-${index}`;
  return freeze({
    id,
    clips: freezeList(input?.clips || input?.motions || []),
    loop: Boolean(input?.loop),
    duration: Math.max(0, number(input?.duration, 0)),
    enter: clean(input?.enter),
    exit: clean(input?.exit),
    interruptible: input?.interruptible !== false,
    rootMotion: Boolean(input?.rootMotion),
    gameplayMarkers: freezeList(input?.gameplayMarkers || []),
    vfxMarkers: freezeList(input?.vfxMarkers || []),
    sfxMarkers: freezeList(input?.sfxMarkers || [])
  });
}

function defaultStateDefinitions(requiredStates) {
  return requiredStates.map((id) => normalizeState({
    id,
    clips: [],
    loop: ['idle', 'move', 'run'].includes(id),
    interruptible: id !== 'death'
  }));
}

export function createVibeMotionContract({
  actorId = '',
  actorType = 'character',
  engine = 'engine-neutral',
  states = [],
  requiredStates = VIBE_MOTION_REQUIRED_STATES,
  transitions = null,
  mobileFirst = true
} = {}) {
  const required = freezeList(requiredStates);
  const sourceStates = Array.isArray(states) && states.length ? states : defaultStateDefinitions(required);
  const normalizedStates = Object.freeze(sourceStates.map(normalizeState));
  const knownStateIds = freezeList(normalizedStates.map((state) => state.id));
  const transitionMap = {};
  for (const stateId of knownStateIds) {
    transitionMap[stateId] = freezeList(transitions?.[stateId] || DEFAULT_TRANSITIONS[stateId] || []);
  }
  return freeze({
    version: 1,
    actorId: clean(actorId) || null,
    actorType: clean(actorType) || 'character',
    engine: clean(engine) || 'engine-neutral',
    requiredStates: required,
    states: normalizedStates,
    transitions: freeze(transitionMap),
    mobileFirst: Boolean(mobileFirst),
    gameplayAuthority: 'timing-and-event-contract-only',
    authoritativeMutationAllowed: false
  });
}

export function validateVibeMotionContract(contract) {
  const issues = [];
  if (!contract || !Array.isArray(contract.states)) return freeze({ valid: false, issues: freezeList(['motion-contract-required']) });
  const ids = contract.states.map((state) => clean(state.id)).filter(Boolean);
  if (new Set(ids).size !== ids.length) issues.push('duplicate-motion-state');
  for (const required of contract.requiredStates || []) {
    const state = contract.states.find((item) => item.id === required);
    if (!state) issues.push(`missing-state:${required}`);
    else if (!Array.isArray(state.clips) || state.clips.length === 0) issues.push(`missing-motion:${required}`);
  }
  if ((contract.transitions?.death || []).some((target) => target !== 'death')) issues.push('death-must-not-return-to-locomotion');
  for (const [from, targets] of Object.entries(contract.transitions || {})) {
    if (!ids.includes(from)) issues.push(`transition-source-unknown:${from}`);
    for (const target of targets || []) if (!ids.includes(target)) issues.push(`transition-target-unknown:${from}->${target}`);
  }
  return freeze({ valid: issues.length === 0, issues: freezeList(issues) });
}

export function validateVibeMotionTransition(contract, { from = '', to = '' } = {}) {
  const source = clean(from);
  const target = clean(to);
  const known = new Set((contract?.states || []).map((state) => state.id));
  const allowed = Array.isArray(contract?.transitions?.[source]) ? contract.transitions[source] : [];
  const issues = [];
  if (!known.has(source)) issues.push(`unknown-source:${source}`);
  if (!known.has(target)) issues.push(`unknown-target:${target}`);
  if (source === 'death' && target !== 'death') issues.push('death-terminal-state');
  if (known.has(source) && known.has(target) && !allowed.includes(target)) issues.push(`transition-not-allowed:${source}->${target}`);
  return freeze({ valid: issues.length === 0, from: source, to: target, issues: freezeList(issues) });
}

export function createVibeCombatMotionSync({
  actionId = '',
  actionType = 'melee',
  windup = 0,
  activeStart = 0,
  activeEnd = 0,
  recoveryEnd = 0,
  releaseMarker = '',
  hitMarker = '',
  projectileMarker = '',
  vfxMarker = '',
  sfxMarker = ''
} = {}) {
  const type = ['melee', 'ranged', 'skill'].includes(clean(actionType)) ? clean(actionType) : 'melee';
  const timing = freeze({
    windup: Math.max(0, number(windup, 0)),
    activeStart: Math.max(0, number(activeStart, 0)),
    activeEnd: Math.max(0, number(activeEnd, 0)),
    recoveryEnd: Math.max(0, number(recoveryEnd, 0))
  });
  const issues = [];
  if (timing.activeEnd < timing.activeStart) issues.push('active-window-reversed');
  if (timing.recoveryEnd < timing.activeEnd) issues.push('recovery-before-active-end');
  if (type === 'ranged' && !clean(releaseMarker || projectileMarker)) issues.push('ranged-release-marker-required');
  if (type === 'melee' && !clean(hitMarker)) issues.push('melee-hit-marker-required');
  return freeze({
    version: 1,
    actionId: clean(actionId) || null,
    actionType: type,
    timing,
    markers: freeze({
      release: clean(releaseMarker) || null,
      hit: clean(hitMarker) || null,
      projectile: clean(projectileMarker) || null,
      vfx: clean(vfxMarker) || null,
      sfx: clean(sfxMarker) || null
    }),
    valid: issues.length === 0,
    issues: freezeList(issues),
    gameplayAuthority: 'engine-resolves-damage-and-resource-results'
  });
}

export function createVibeRetargetContract({
  engine = 'engine-neutral',
  sourceSkeleton = '',
  targetSkeleton = '',
  referencePose = '',
  pelvisScale = 1,
  armScale = 1,
  legScale = 1,
  rootAxis = 'engine-default',
  weaponSocket = '',
  footIK = false
} = {}) {
  const issues = [];
  if (!clean(sourceSkeleton)) issues.push('source-skeleton-required');
  if (!clean(targetSkeleton)) issues.push('target-skeleton-required');
  if (!clean(referencePose)) issues.push('reference-pose-required');
  return freeze({
    version: 1,
    engine: clean(engine) || 'engine-neutral',
    sourceSkeleton: clean(sourceSkeleton) || null,
    targetSkeleton: clean(targetSkeleton) || null,
    referencePose: clean(referencePose) || null,
    proportions: freeze({ pelvisScale: Math.max(0.01, number(pelvisScale, 1)), armScale: Math.max(0.01, number(armScale, 1)), legScale: Math.max(0.01, number(legScale, 1)) }),
    rootAxis: clean(rootAxis) || 'engine-default',
    weaponSocket: clean(weaponSocket) || null,
    footIK: Boolean(footIK),
    valid: issues.length === 0,
    issues: freezeList(issues)
  });
}

export function scoreVibeMotionQuality(scores = {}, { gateFailures = [] } = {}) {
  const normalized = {};
  for (const axis of VIBE_MOTION_QUALITY_AXES) normalized[axis] = clamp(scores?.[axis], 0, 100);
  const values = Object.values(normalized);
  const average = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  const failures = freezeList(gateFailures);
  return freeze({
    version: 1,
    scores: freeze(normalized),
    average: Number(average.toFixed(2)),
    gateFailures: failures,
    decision: failures.length ? 'REVISE' : average >= 85 ? 'PASS' : 'REVISE',
    totalScoreIsNotSufficientForPass: true
  });
}

export function createVibeMotionEvidence({
  actorId = '',
  engine = '',
  runtimeObserved = false,
  transitionObserved = false,
  combatSyncObserved = false,
  retargetObserved = false,
  performanceObserved = false,
  reference = ''
} = {}) {
  const checks = freeze({
    runtimeObserved: Boolean(runtimeObserved),
    transitionObserved: Boolean(transitionObserved),
    combatSyncObserved: Boolean(combatSyncObserved),
    retargetObserved: Boolean(retargetObserved),
    performanceObserved: Boolean(performanceObserved)
  });
  const missing = Object.entries(checks).filter(([, passed]) => !passed).map(([key]) => key);
  return freeze({
    version: 1,
    actorId: clean(actorId) || null,
    engine: clean(engine) || null,
    checks,
    reference: clean(reference) || null,
    verified: missing.length === 0,
    missing: freezeList(missing)
  });
}

export function createVibeMotionLearningRecord({
  gameId = '',
  engine = '',
  actorType = '',
  problem = '',
  solution = '',
  evidence = '',
  verified = false,
  reuseConditions = [],
  avoidConditions = []
} = {}) {
  const proof = clean(evidence);
  const valid = Boolean(verified && proof && clean(problem) && clean(solution));
  return freeze({
    version: 1,
    gameId: clean(gameId) || null,
    engine: clean(engine) || null,
    actorType: clean(actorType) || null,
    problem: clean(problem),
    solution: clean(solution),
    evidence: proof || null,
    verified: valid,
    reusable: valid,
    reuseConditions: freezeList(reuseConditions),
    avoidConditions: freezeList(avoidConditions),
    authority: 'verified-method-memory-not-gameplay-value-authority'
  });
}

if (typeof window !== 'undefined') {
  window.JaewoonVibeMotionCore = freeze({
    createVibeMotionContract,
    validateVibeMotionContract,
    validateVibeMotionTransition,
    createVibeCombatMotionSync,
    createVibeRetargetContract,
    scoreVibeMotionQuality,
    createVibeMotionEvidence,
    createVibeMotionLearningRecord
  });
}
