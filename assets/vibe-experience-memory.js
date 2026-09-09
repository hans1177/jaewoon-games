// 파일명: assets/vibe-experience-memory.js
// 역할: 검증된 성공/실패 경험을 저장하고 유사 작업에 재사용할 수 있는 근거를 검색한다.
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
  createdAt = ''
} = {}) {
  const normalizedOutcome = ['PASS', 'FAIL', 'REVISE'].includes(clean(outcome).toUpperCase()) ? clean(outcome).toUpperCase() : 'REVISE';
  const proof = freezeList(evidence);
  const failure = clean(failureCause);
  const validEvidence = Boolean(verified && proof.length > 0);
  const learningValid = validEvidence && (normalizedOutcome === 'PASS' || Boolean(failure));
  const fingerprint = experienceFingerprint({ gameId, engine, taskType, problem, goal, change, outcome: normalizedOutcome, failureCause: failure });
  const seed = [fingerprint, proof.join('|')].join('::');
  return freeze({
    version: 2,
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
    createdAt: clean(createdAt) || null,
    authority: 'retrieval-context-only-no-automatic-gameplay-mutation'
  });
}

export function createVibeExperienceMemory(seed = {}) {
  const input = Array.isArray(seed) ? seed : Array.isArray(seed?.records) ? seed.records : [];
  const records = [];
  const seenIds = new Set();
  const seenFingerprints = new Set();
  for (const inputRecord of input) {
    const record = createVibeExperienceRecord(inputRecord);
    if (!record.reusable || seenIds.has(record.id) || seenFingerprints.has(record.fingerprint)) continue;
    seenIds.add(record.id);
    seenFingerprints.add(record.fingerprint);
    records.push(record);
  }
  return freeze({
    version: 2,
    policy: freeze({
      verifiedEvidenceRequired: true,
      verifiedFailureMayTeach: true,
      unverifiedAttemptReusable: false,
      exactDuplicateSuppressed: true,
      mayExpandAuthority: false,
      mayAutoCopyGameplayValues: false
    }),
    records: freeze(records)
  });
}

export function addVibeExperience(memory, recordInput = {}) {
  const current = createVibeExperienceMemory(memory);
  const record = createVibeExperienceRecord(recordInput);
  if (!record.reusable) {
    return freeze({
      added: false,
      reason: record.verified ? 'verified-failure-cause-or-success-required' : 'verified-evidence-required',
      record,
      memory: current
    });
  }
  const duplicate = current.records.find((item) => item.id === record.id || item.fingerprint === record.fingerprint);
  if (duplicate) {
    return freeze({ added: false, reason: 'duplicate-experience', record: duplicate, memory: current });
  }
  return freeze({ added: true, record, memory: createVibeExperienceMemory([...current.records, record]) });
}

function scoreRecord(record, query) {
  let score = 0;
  const reasons = [];
  const queryEngine = clean(query.engine).toLowerCase();
  const queryTaskType = clean(query.taskType).toLowerCase();
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
  if (record.outcome === 'PASS') score += 1;
  else if (record.failureCause) score += 0.5;
  return freeze({ record, score, reasons: freezeList(reasons) });
}

export function searchVibeExperience(memory, query = {}, { limit = 5, minimumScore = 1 } = {}) {
  const current = createVibeExperienceMemory(memory);
  const max = Math.max(1, Math.floor(Number(limit) || 5));
  const minimum = Math.max(0, Number(minimumScore) || 0);
  const matches = current.records
    .map((record) => scoreRecord(record, query))
    .filter((match) => match.score >= minimum)
    .sort((a, b) => b.score - a.score || String(b.record.createdAt || '').localeCompare(String(a.record.createdAt || '')) || a.record.id.localeCompare(b.record.id))
    .slice(0, max);
  return freeze({
    version: 1,
    query: freeze({
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
    version: 1,
    records: freeze(result.matches.map(({ record, score, reasons }) => freeze({
      id: record.id,
      fingerprint: record.fingerprint,
      engine: record.engine,
      taskType: record.taskType,
      outcome: record.outcome,
      problem: record.problem,
      change: record.change,
      failureCause: record.failureCause,
      reusablePatterns: record.reusablePatterns,
      avoidPatterns: record.avoidPatterns,
      evidence: record.evidence,
      relevance: score,
      reasons
    }))),
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
