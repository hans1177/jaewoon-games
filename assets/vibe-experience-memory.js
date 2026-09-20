// 파일명: assets/vibe-experience-memory.js
// 역할: 검증된 성공/실패 경험을 저장하고 반복 검증된 경험을 더 빠르게 강화해 유사 작업에 재사용한다.
// 원칙: 검증되지 않은 시도는 재사용 경험으로 승격하지 않으며, 경험은 권한이나 게임 수치를 자동 변경하지 않는다.

const clean = (value) => String(value ?? '').trim();
const freeze = (value) => Object.freeze(value);
const unique = (values = []) => [...new Set(values.map(clean).filter(Boolean))];
const freezeList = (values = []) => freeze(unique(values));

function words(value) {
  return unique(clean(value)
    .toLowerCase()
    .replace(/[^0-9a-zA-Z가-힣_+.#-]+/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 2));
}

function hash(value = '') {
  let h = 2166136261;
  for (const ch of String(value)) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

function normalizeConfirmations(value = 1) {
  return Math.max(1, Math.min(1000000, Math.floor(Number(value) || 1)));
}

function confidenceFor(confirmations = 1) {
  const count = normalizeConfirmations(confirmations);
  return Number((1 - (1 / (count + 1))).toFixed(4));
}

function normalizeCapabilityApplications(values = []) {
  const rows = [];
  const seen = new Set();
  for (const raw of Array.isArray(values) ? values : []) {
    const applicationId = clean(raw?.applicationId);
    if (!applicationId || seen.has(applicationId)) continue;
    seen.add(applicationId);
    rows.push(freeze({
      version: 1,
      applicationId,
      taskId: clean(raw?.taskId) || null,
      workKey: clean(raw?.workKey) || null,
      gameId: clean(raw?.gameId) || null,
      engine: clean(raw?.engine) || null,
      outcome: clean(raw?.outcome).toUpperCase() || 'OBSERVED_NOT_FINAL',
      selected: raw?.selected === true,
      finalReviewPass: raw?.finalReviewPass === true,
      freshTaskQaPass: raw?.freshTaskQaPass === true,
      independent: raw?.independent === true,
      capabilitySpecificSupport: raw?.capabilitySpecificSupport === true,
      capabilitySpecificContradiction: raw?.capabilitySpecificContradiction === true,
      coAppliedCapabilityIds: freezeList(raw?.coAppliedCapabilityIds || []),
      evidence: freezeList(raw?.evidence || []),
      observedAt: clean(raw?.observedAt) || null,
      rawCodeStored: false,
      rawModelOutputStored: false,
      hiddenChainOfThoughtStored: false,
      authorityExpanded: false
    }));
  }
  return rows.slice(-64);
}

function capabilityLifecycleFor(taskType = '', applications = []) {
  if (clean(taskType) !== 'coding-capability-distillation') return null;
  const rows = normalizeCapabilityApplications(applications);
  const verifiedApplications = rows.filter((row) =>
    row.independent === true
    && row.selected === true
    && row.finalReviewPass === true
    && row.freshTaskQaPass === true
  );
  const uniqueTasks = new Set(verifiedApplications.map((row) => [row.gameId, row.taskId, row.workKey].filter(Boolean).join('|')).filter(Boolean));
  const independentPassCount = uniqueTasks.size;
  const crossGameVerifiedApplicationCount = new Set(verifiedApplications.map((row) => clean(row.gameId)).filter(Boolean)).size;
  const contradictionCount = rows.filter((row) => row.capabilitySpecificContradiction === true).length;
  const directSupportCount = rows.filter((row) => row.capabilitySpecificSupport === true).length;
  const state = independentPassCount >= 2
    ? 'REPEATED_APPLICATION_VERIFIED'
    : independentPassCount >= 1
      ? 'APPLICATION_OBSERVED'
      : 'VERIFIED_REUSABLE';
  const confidence = independentPassCount >= 2
    ? Number((1 - (1 / (independentPassCount + 2))).toFixed(4))
    : 0.5;
  return freeze({
    version: 1,
    state,
    applicationCount: rows.length,
    independentPassCount,
    crossGameVerifiedApplicationCount,
    directSupportCount,
    contradictionCount,
    confidence,
    singlePassAutomaticPromotion: false,
    singleFailureAutomaticDeprecation: false,
    unrelatedFailurePenaltyApplied: false,
    confidenceDecayApplied: false,
    generalizationCandidate: independentPassCount >= 2 && crossGameVerifiedApplicationCount >= 2,
    strongGeneralizationVerified: false,
    unseenProblemBenchmarkRequired: true,
    automaticDeprecation: false,
    automaticSupersession: false,
    authorityExpanded: false
  });
}

function laterTimestamp(...values) {
  return values.map(clean).filter(Boolean).sort().at(-1) || null;
}

function experienceFingerprint({ gameId = '', engine = '', taskType = '', problem = '', goal = '', change = '', outcome = '', failureCause = '' } = {}) {
  return `fp_${hash([
    clean(gameId).toLowerCase(),
    clean(engine).toLowerCase(),
    clean(taskType).toLowerCase(),
    clean(problem),
    clean(goal),
    clean(change),
    clean(outcome).toUpperCase(),
    clean(failureCause)
  ].join('::'))}`;
}

export function createVibeExperienceRecord({
  id = '',
  gameId = '',
  engine = '',
  departments = [],
  taskType = '',
  problem = '',
  goal = '',
  change = '',
  outcome = 'PASS',
  failureCause = '',
  qa = [],
  build = '',
  evidence = [],
  reusablePatterns = [],
  avoidPatterns = [],
  verified = false,
  confirmations = 1,
  createdAt = '',
  lastVerifiedAt = '',
  capabilityApplications = []
} = {}) {
  const normalizedOutcome = ['PASS', 'FAIL', 'REVISE'].includes(clean(outcome).toUpperCase()) ? clean(outcome).toUpperCase() : 'REVISE';
  const proof = freezeList(evidence);
  const failure = clean(failureCause);
  const validEvidence = Boolean(verified && proof.length > 0);
  const learningValid = validEvidence && (normalizedOutcome === 'PASS' || Boolean(failure));
  const fingerprint = experienceFingerprint({ gameId, engine, taskType, problem, goal, change, outcome: normalizedOutcome, failureCause: failure });
  const seed = [fingerprint, proof.join('|')].join('::');
  const confirmationCount = normalizeConfirmations(confirmations);
  const firstVerifiedAt = clean(createdAt) || null;
  const normalizedCapabilityApplications = normalizeCapabilityApplications(capabilityApplications);
  const capabilityLifecycle = capabilityLifecycleFor(clean(taskType), normalizedCapabilityApplications);
  return freeze({
    version: 3,
    id: clean(id) || `exp_${hash(seed)}`,
    fingerprint,
    gameId: clean(gameId) || null,
    engine: clean(engine) || null,
    departments: freezeList(departments),
    taskType: clean(taskType) || 'general',
    problem: clean(problem),
    goal: clean(goal),
    change: clean(change),
    outcome: normalizedOutcome,
    failureCause: failure || null,
    qa: freezeList(qa),
    build: clean(build) || null,
    evidence: proof,
    reusablePatterns: freezeList(reusablePatterns),
    avoidPatterns: freezeList(avoidPatterns),
    verified: validEvidence,
    reusable: learningValid,
    confirmations: confirmationCount,
    confidence: confidenceFor(confirmationCount),
    capabilityApplications: freeze(normalizedCapabilityApplications),
    capabilityLifecycle,
    capabilityConfidence: capabilityLifecycle?.confidence ?? null,
    createdAt: firstVerifiedAt,
    lastVerifiedAt: clean(lastVerifiedAt) || firstVerifiedAt,
    authority: 'retrieval-context-only-no-automatic-gameplay-mutation'
  });
}

function mergeVerifiedExperience(left, right) {
  const confirmations = normalizeConfirmations((left?.confirmations || 1) + (right?.confirmations || 1));
  const capabilityApplications = normalizeCapabilityApplications([...(left?.capabilityApplications || []), ...(right?.capabilityApplications || [])]);
  const capabilityLifecycle = capabilityLifecycleFor(clean(left?.taskType || right?.taskType), capabilityApplications);
  return freeze({
    ...left,
    version: 3,
    departments: freezeList([...(left?.departments || []), ...(right?.departments || [])]),
    qa: freezeList([...(left?.qa || []), ...(right?.qa || [])]),
    evidence: freezeList([...(left?.evidence || []), ...(right?.evidence || [])]),
    reusablePatterns: freezeList([...(left?.reusablePatterns || []), ...(right?.reusablePatterns || [])]),
    avoidPatterns: freezeList([...(left?.avoidPatterns || []), ...(right?.avoidPatterns || [])]),
    confirmations,
    confidence: confidenceFor(confirmations),
    capabilityApplications: freeze(capabilityApplications),
    capabilityLifecycle,
    capabilityConfidence: capabilityLifecycle?.confidence ?? null,
    createdAt: clean(left?.createdAt) || clean(right?.createdAt) || null,
    lastVerifiedAt: laterTimestamp(left?.lastVerifiedAt, left?.createdAt, right?.lastVerifiedAt, right?.createdAt),
    verified: true,
    reusable: true
  });
}

export function createVibeExperienceMemory(seed = {}) {
  const input = Array.isArray(seed) ? seed : Array.isArray(seed?.records) ? seed.records : [];
  const records = [];
  const indexById = new Map();
  const indexByFingerprint = new Map();
  for (const inputRecord of input) {
    const record = createVibeExperienceRecord(inputRecord);
    if (!record.reusable) continue;
    const existingIndex = indexByFingerprint.get(record.fingerprint) ?? indexById.get(record.id);
    if (existingIndex != null) {
      const existing = records[existingIndex];
      if (existing.fingerprint === record.fingerprint) records[existingIndex] = mergeVerifiedExperience(existing, record);
      continue;
    }
    const index = records.length;
    records.push(record);
    indexById.set(record.id, index);
    indexByFingerprint.set(record.fingerprint, index);
  }
  return freeze({
    version: 3,
    policy: freeze({
      verifiedEvidenceRequired: true,
      verifiedFailureMayTeach: true,
      unverifiedAttemptReusable: false,
      exactDuplicateSuppressed: true,
      duplicateVerificationReinforces: true,
      repeatedVerificationRaisesConfidence: true,
      mayExpandAuthority: false,
      mayAutoCopyGameplayValues: false
    }),
    records: freeze(records)
  });
}

export function recordVibeCapabilityApplication(memory, application = {}) {
  const current = createVibeExperienceMemory(memory);
  const capabilityId = clean(application?.capabilityId);
  const applicationId = clean(application?.applicationId);
  if (!capabilityId || !applicationId) {
    return freeze({ updated: false, duplicate: false, reason: 'capability-and-application-id-required', memory: current, record: null });
  }
  const target = current.records.find((item) => item.id === capabilityId && item.taskType === 'coding-capability-distillation');
  if (!target) {
    return freeze({ updated: false, duplicate: false, reason: 'capability-not-found', memory: current, record: null });
  }
  if ((target.capabilityApplications || []).some((row) => row.applicationId === applicationId)) {
    return freeze({ updated: false, duplicate: true, reason: 'capability-application-duplicate', memory: current, record: target });
  }
  const nextRecord = createVibeExperienceRecord({
    ...target,
    capabilityApplications: [...(target.capabilityApplications || []), application]
  });
  const nextRecords = current.records.map((item) => item.id === target.id ? nextRecord : item);
  const nextMemory = createVibeExperienceMemory(nextRecords);
  const record = nextMemory.records.find((item) => item.id === target.id) || nextRecord;
  return freeze({ updated: true, duplicate: false, reason: 'capability-application-recorded', memory: nextMemory, record });
}

export function addVibeExperience(memory, recordInput = {}) {
  const current = createVibeExperienceMemory(memory);
  const record = createVibeExperienceRecord(recordInput);
  if (!record.reusable) {
    return freeze({
      added: false,
      reinforced: false,
      reason: record.verified ? 'verified-failure-cause-or-success-required' : 'verified-evidence-required',
      record,
      memory: current
    });
  }
  const duplicate = current.records.find((item) => item.id === record.id || item.fingerprint === record.fingerprint);
  if (duplicate) {
    const reinforced = mergeVerifiedExperience(duplicate, record);
    const nextRecords = current.records.map((item) => item.id === duplicate.id ? reinforced : item);
    return freeze({
      added: true,
      reinforced: true,
      reason: 'experience-reinforced',
      record: reinforced,
      memory: createVibeExperienceMemory(nextRecords)
    });
  }
  return freeze({ added: true, reinforced: false, reason: 'experience-added', record, memory: createVibeExperienceMemory([...current.records, record]) });
}

function scoreRecord(record, query) {
  let score = 0;
  const reasons = [];
  const queryGameId = clean(query.gameId).toLowerCase();
  const queryEngine = clean(query.engine).toLowerCase();
  const queryTaskType = clean(query.taskType).toLowerCase();
  if (queryGameId && clean(record.gameId).toLowerCase() === queryGameId) {
    score += 7;
    reasons.push('same-game');
  }
  if (queryEngine && clean(record.engine).toLowerCase() === queryEngine) {
    score += 5;
    reasons.push('same-engine');
  }
  if (queryTaskType && clean(record.taskType).toLowerCase() === queryTaskType) {
    score += 4;
    reasons.push('same-task-type');
  }
  const queryDepartments = new Set(unique(query.departments || []).map((item) => item.toLowerCase()));
  const departmentOverlap = record.departments.filter((item) => queryDepartments.has(item.toLowerCase())).length;
  if (departmentOverlap) {
    score += departmentOverlap * 2;
    reasons.push('department-overlap');
  }
  const queryWords = new Set(words([query.problem, query.goal, query.text].filter(Boolean).join(' ')));
  const recordWords = new Set(words([record.problem, record.goal, record.change, record.failureCause, ...record.reusablePatterns, ...record.avoidPatterns].filter(Boolean).join(' ')));
  let overlap = 0;
  for (const token of queryWords) if (recordWords.has(token)) overlap += 1;
  if (overlap) {
    score += Math.min(10, overlap);
    reasons.push(`keyword-overlap:${overlap}`);
  }
  const confirmations = normalizeConfirmations(record.confirmations);
  if (confirmations > 1) {
    score += Math.min(8, Math.log2(confirmations + 1) * 2);
    reasons.push(`repeated-verification:${confirmations}`);
  }
  if (record.outcome === 'PASS') score += 1;
  else if (record.failureCause) score += 0.5;
  return freeze({ record, score: Number(score.toFixed(4)), reasons: freezeList(reasons) });
}

export function searchVibeExperience(memory, query = {}, { limit = 5, minimumScore = 1 } = {}) {
  const current = createVibeExperienceMemory(memory);
  const max = Math.max(1, Math.floor(Number(limit) || 5));
  const minimum = Math.max(0, Number(minimumScore) || 0);
  const matches = current.records
    .map((record) => scoreRecord(record, query))
    .filter((match) => match.score >= minimum)
    .sort((a, b) => b.score - a.score || b.record.confidence - a.record.confidence || String(b.record.lastVerifiedAt || b.record.createdAt || '').localeCompare(String(a.record.lastVerifiedAt || a.record.createdAt || '')) || a.record.id.localeCompare(b.record.id))
    .slice(0, max);
  return freeze({
    version: 2,
    query: freeze({
      gameId: clean(query.gameId) || null,
      engine: clean(query.engine) || null,
      taskType: clean(query.taskType) || null,
      departments: freezeList(query.departments || []),
      problem: clean(query.problem),
      goal: clean(query.goal),
      text: clean(query.text)
    }),
    matches: freeze(matches),
    count: matches.length,
    authority: 'planning-context-only'
  });
}

export function createVibeLearningContext(memory, query = {}, options = {}) {
  const result = searchVibeExperience(memory, query, options);
  return freeze({
    version: 2,
    records: freeze(result.matches.map(({ record, score, reasons }) => freeze({
      id: record.id,
      fingerprint: record.fingerprint,
      gameId: record.gameId,
      engine: record.engine,
      taskType: record.taskType,
      outcome: record.outcome,
      problem: record.problem,
      change: record.change,
      failureCause: record.failureCause,
      reusablePatterns: record.reusablePatterns,
      avoidPatterns: record.avoidPatterns,
      evidence: record.evidence,
      confirmations: record.confirmations,
      confidence: record.confidence,
      relevance: score,
      reasons
    }))),
    acceleratedByRepeatedVerification: true,
    mayAutoExecute: false,
    mustReviewBeforeReuse: true,
    mayChangeProtectedGameplayValues: false
  });
}

if (typeof window !== 'undefined') {
  window.JaewoonVibeExperienceMemory = freeze({
    createVibeExperienceRecord,
    createVibeExperienceMemory,
    addVibeExperience,
    searchVibeExperience,
    createVibeLearningContext
  });
}
