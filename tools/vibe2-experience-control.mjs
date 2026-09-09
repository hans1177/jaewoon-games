// 파일명: tools/vibe2-experience-control.mjs
// 역할: 엔진 QA와 리뷰로 검증된 결과만 Vibe2 Experience Memory에 승격한다.
// 원칙: candidate 생성이나 빌드 성공만으로 학습하지 않으며 경험은 승인 권한을 확대하지 않는다.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createVibeExperienceMemory, addVibeExperience } from '../assets/vibe-experience-memory.js';

const clean = (value) => String(value ?? '').trim();
const unique = (values = []) => [...new Set((values || []).map(clean).filter(Boolean))];
const REVOTE_ROLES = Object.freeze(['planning', 'development', 'qa', 'graphics', 'balance']);

function readJson(file, fallback = {}) {
  if (!file || !fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}
function parseArgs(argv = process.argv.slice(2)) {
  const args = {};
  for (const raw of argv) {
    if (!raw.startsWith('--')) continue;
    const body = raw.slice(2);
    const at = body.indexOf('=');
    if (at < 0) args[body] = true;
    else args[body.slice(0, at)] = body.slice(at + 1);
  }
  return args;
}
function normalizeDecision(value) {
  const decision = clean(value).toUpperCase();
  return ['PASS', 'REVISE', 'DROP'].includes(decision) ? decision : 'REVISE';
}
function normalizeOutcome(value) {
  const outcome = clean(value).toUpperCase();
  return ['PASS', 'FAIL', 'REVISE'].includes(outcome) ? outcome : 'REVISE';
}
function sameValue(a, b) { return clean(a) === clean(b); }
function sameOptionalNumber(a, b) { return clean(a) === clean(b); }

export function validateVibeExperiencePromotion(review = {}) {
  const outcome = normalizeOutcome(review.outcome);
  const reviewDecision = normalizeDecision(review.reviewDecision);
  const evidence = unique(review.evidence || []);
  const issues = [];
  if (!clean(review.gameId)) issues.push('game-id-required');
  if (!clean(review.engine)) issues.push('engine-required');
  if (!clean(review.taskType)) issues.push('task-type-required');
  if (!clean(review.problem || review.goal)) issues.push('problem-or-goal-required');
  if (!clean(review.change)) issues.push('change-required');
  if (!review.reviewVerified) issues.push('verified-review-required');
  if (reviewDecision !== 'PASS') issues.push('review-pass-required');
  if (evidence.length < 2) issues.push('minimum-two-evidence-items-required');
  if (outcome === 'PASS' && !review.engineQaVerified) issues.push('engine-qa-required-for-success-learning');
  if (outcome !== 'PASS' && !clean(review.failureCause)) issues.push('failure-cause-required-for-failure-learning');
  if (review.authorityExpanded === true) issues.push('experience-must-not-expand-authority');
  return Object.freeze({
    valid: issues.length === 0,
    issues: Object.freeze(unique(issues)),
    outcome,
    reviewDecision,
    evidence: Object.freeze(evidence)
  });
}

export function promoteVibeReviewedExperience(memoryInput, review = {}) {
  const memory = createVibeExperienceMemory(memoryInput);
  const validation = validateVibeExperiencePromotion(review);
  if (!validation.valid) {
    return Object.freeze({
      promoted: false,
      reason: 'reviewed-experience-gate-failed',
      validation,
      memory,
      authority: 'unchanged'
    });
  }
  const result = addVibeExperience(memory, {
    id: clean(review.id),
    gameId: clean(review.gameId),
    engine: clean(review.engine),
    departments: unique(review.departments || []),
    taskType: clean(review.taskType),
    problem: clean(review.problem),
    goal: clean(review.goal),
    change: clean(review.change),
    outcome: validation.outcome,
    failureCause: clean(review.failureCause),
    qa: unique(review.qa || []),
    build: clean(review.build),
    evidence: validation.evidence,
    reusablePatterns: unique(review.reusablePatterns || []),
    avoidPatterns: unique(review.avoidPatterns || []),
    verified: true,
    createdAt: clean(review.createdAt)
  });
  return Object.freeze({
    promoted: result.added,
    reason: result.added ? 'verified-reviewed-experience-promoted' : result.reason,
    validation,
    record: result.record,
    memory: result.memory,
    authority: 'unchanged',
    mayChangeProtectedGameplayValues: false
  });
}

function expectedDirectorDecision(votes) {
  const decisions = votes.map((vote) => normalizeDecision(vote?.decision));
  if (decisions.includes('DROP')) return 'DROP';
  if (decisions.includes('REVISE')) return 'REVISE';
  return 'PASS';
}

function revoteIntegrity(request, votes, director) {
  const issues = [];
  if (!request || request.version !== 1) issues.push('revote-request-invalid');
  if (!director || director.version !== 1 || clean(director.role) !== 'director') issues.push('director-review-invalid');
  if (votes.length !== REVOTE_ROLES.length) issues.push('five-department-revotes-required');
  const requestId = clean(request?.requestId);
  const gameId = clean(request?.gameId);
  const modificationCommit = clean(request?.modificationCommit);
  const buildRunId = request?.buildRunId;
  for (let index = 0; index < REVOTE_ROLES.length; index += 1) {
    const role = REVOTE_ROLES[index];
    const vote = votes[index];
    if (!vote || clean(vote.role) !== role || vote.independent !== true) issues.push(`independent-${role}-review-required`);
    if (vote && (!sameValue(vote.requestId, requestId) || !sameValue(vote.gameId, gameId))) issues.push(`${role}-review-request-mismatch`);
    if (vote && modificationCommit && !sameValue(vote.modificationCommit, modificationCommit)) issues.push(`${role}-review-commit-mismatch`);
    if (vote && buildRunId != null && !sameOptionalNumber(vote.buildRunId, buildRunId)) issues.push(`${role}-review-build-run-mismatch`);
  }
  if (director) {
    if (!sameValue(director.requestId, requestId) || !sameValue(director.gameId, gameId)) issues.push('director-review-request-mismatch');
    if (modificationCommit && !sameValue(director.modificationCommit, modificationCommit)) issues.push('director-review-commit-mismatch');
    if (buildRunId != null && !sameOptionalNumber(director.buildRunId, buildRunId)) issues.push('director-review-build-run-mismatch');
    if (director.inventedDepartmentContent !== false) issues.push('director-must-not-invent-department-content');
    if (votes.length === REVOTE_ROLES.length && normalizeDecision(director.decision) !== expectedDirectorDecision(votes)) issues.push('director-aggregation-mismatch');
  }
  return Object.freeze({ valid: issues.length === 0, issues: Object.freeze(unique(issues)) });
}

export function buildVibeExperienceReviewFromRevote({ request = {}, departmentVotes = [], director = {} } = {}) {
  const votesByRole = new Map((departmentVotes || []).map((vote) => [clean(vote?.role), vote]));
  const votes = REVOTE_ROLES.map((role) => votesByRole.get(role) || null);
  const integrity = revoteIntegrity(request, votes, director);
  const requestId = clean(request.requestId);
  const gameId = clean(request.gameId);
  const modificationCommit = clean(request.modificationCommit);
  const buildRunId = clean(request.buildRunId);
  const buildConclusion = clean(request.buildConclusion).toLowerCase();
  const directorDecision = normalizeDecision(director?.decision);
  const engineQaVerified = buildConclusion === 'success'
    && normalizeDecision(votesByRole.get('development')?.decision) === 'PASS'
    && normalizeDecision(votesByRole.get('qa')?.decision) === 'PASS';
  const verifiedBuildFailure = ['failure', 'timed_out', 'startup_failure'].includes(buildConclusion)
    && Boolean(buildRunId && clean(request.buildStage) && clean(request.buildError));
  const outcome = directorDecision === 'PASS' ? 'PASS' : 'FAIL';
  const failureCause = outcome === 'FAIL' && verifiedBuildFailure
    ? `${clean(request.buildStage)}: ${clean(request.buildError)}`
    : '';
  const evidence = unique([
    requestId ? `revote-request:${requestId}` : '',
    modificationCommit ? `modification-commit:${modificationCommit}` : '',
    buildRunId && buildConclusion ? `engine-build-run:${buildRunId}:${buildConclusion}` : '',
    integrity.valid ? `department-revotes:${requestId}:5/5` : '',
    integrity.valid ? `director-aggregation:${requestId}:${directorDecision}` : ''
  ]);
  const scope = clean(request.scope);
  const problem = failureCause || clean(request.buildStage) || scope || `post-modification review ${requestId}`;
  const change = [scope, modificationCommit ? `commit ${modificationCommit}` : ''].filter(Boolean).join(' | ');
  return Object.freeze({
    id: requestId ? `revote_${requestId}` : '',
    gameId,
    engine: 'unity',
    departments: Object.freeze([...REVOTE_ROLES]),
    taskType: 'post-modification',
    problem,
    goal: scope || `verified post-modification result for ${gameId}`,
    change,
    outcome,
    failureCause,
    qa: Object.freeze(unique([
      integrity.valid ? 'five-independent-department-revotes' : '',
      engineQaVerified ? 'engine-build-and-qa-pass' : '',
      verifiedBuildFailure ? 'engine-build-failure-cause-verified' : ''
    ])),
    build: buildRunId ? `run ${buildRunId} ${buildConclusion || 'unknown'}` : '',
    evidence: Object.freeze(evidence),
    reusablePatterns: Object.freeze([]),
    avoidPatterns: Object.freeze(failureCause ? [failureCause] : []),
    engineQaVerified,
    reviewVerified: integrity.valid,
    reviewDecision: integrity.valid ? 'PASS' : 'REVISE',
    authorityExpanded: false,
    revoteDecision: directorDecision,
    integrity
  });
}

export function runExperiencePromotion({
  memoryFile = '.vibe2/experience.json',
  reviewFile = '',
  review = null,
  writeMemory = writeJson
} = {}) {
  const memory = readJson(memoryFile, { records: [] });
  const resolvedReview = review || readJson(reviewFile, null);
  if (!resolvedReview) throw new Error('review file required');
  const result = promoteVibeReviewedExperience(memory, resolvedReview);
  if (!result.promoted) return Object.freeze({ ...result, persisted: false, storageError: null });
  try {
    writeMemory(memoryFile, result.memory);
    return Object.freeze({ ...result, persisted: true, storageError: null });
  } catch (error) {
    return Object.freeze({
      ...result,
      promoted: false,
      persisted: false,
      reason: 'experience-storage-failed',
      storageError: clean(error?.message || error),
      memory
    });
  }
}

export function runRevoteExperiencePromotion({
  memoryFile = '.vibe2/experience.json',
  requestFile = '',
  votesRoot = '',
  directorFile = '',
  writeMemory = writeJson
} = {}) {
  const request = readJson(requestFile, null);
  if (!request) throw new Error('revote request file required');
  const root = clean(votesRoot);
  if (!root) throw new Error('revote votes root required');
  const departmentVotes = REVOTE_ROLES.map((role) => readJson(path.join(root, `${role}.json`), null));
  const director = readJson(directorFile || path.join(root, 'director.json'), null);
  const review = buildVibeExperienceReviewFromRevote({ request, departmentVotes, director });
  const result = runExperiencePromotion({ memoryFile, review, writeMemory });
  return Object.freeze({ ...result, review });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = parseArgs();
  const autoRevote = String(args['auto-revote'] || '').toLowerCase() === 'true';
  const result = autoRevote
    ? runRevoteExperiencePromotion({
        memoryFile: clean(args.memory) || '.vibe2/experience.json',
        requestFile: clean(args.request),
        votesRoot: clean(args['votes-root']),
        directorFile: clean(args.director)
      })
    : runExperiencePromotion({
        memoryFile: clean(args.memory) || '.vibe2/experience.json',
        reviewFile: clean(args.review)
      });
  console.log(`VIBE2_EXPERIENCE_PROMOTED=${result.promoted ? 'YES' : 'NO'}`);
  console.log(`VIBE2_EXPERIENCE_PERSISTED=${result.persisted ? 'YES' : 'NO'}`);
  console.log(`VIBE2_EXPERIENCE_REASON=${result.reason}`);
  console.log(`VIBE2_EXPERIENCE_AUTHORITY=${result.authority}`);
  if (result.review) {
    console.log(`VIBE2_EXPERIENCE_REVOTE_DECISION=${result.review.revoteDecision}`);
    console.log(`VIBE2_EXPERIENCE_REVIEW_VERIFIED=${result.review.reviewVerified ? 'YES' : 'NO'}`);
    console.log(`VIBE2_EXPERIENCE_ENGINE_QA_VERIFIED=${result.review.engineQaVerified ? 'YES' : 'NO'}`);
  }
  if (result.storageError) console.log(`VIBE2_EXPERIENCE_STORAGE_ERROR=${result.storageError}`);
  if (!autoRevote && !result.promoted && result.reason !== 'duplicate-experience') process.exitCode = 2;
}
