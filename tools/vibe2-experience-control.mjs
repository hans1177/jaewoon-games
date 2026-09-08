// 파일명: tools/vibe2-experience-control.mjs
// 역할: 엔진 QA와 리뷰로 검증된 결과만 Vibe2 Experience Memory에 승격한다.
// 원칙: candidate 생성이나 빌드 성공만으로 학습하지 않으며 경험은 승인 권한을 확대하지 않는다.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createVibeExperienceMemory, addVibeExperience } from '../assets/vibe-experience-memory.js';

const clean = (value) => String(value ?? '').trim();
const unique = (values = []) => [...new Set((values || []).map(clean).filter(Boolean))];
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

export function validateVibeExperiencePromotion(review = {}) {
  const outcome = ['PASS', 'FAIL', 'REVISE'].includes(clean(review.outcome).toUpperCase()) ? clean(review.outcome).toUpperCase() : 'REVISE';
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

export function runExperiencePromotion({
  memoryFile = '.vibe2/experience.json',
  reviewFile = ''
} = {}) {
  const memory = readJson(memoryFile, { records: [] });
  const review = readJson(reviewFile, null);
  if (!review) throw new Error('review file required');
  const result = promoteVibeReviewedExperience(memory, review);
  if (result.promoted) writeJson(memoryFile, result.memory);
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = parseArgs();
  const result = runExperiencePromotion({
    memoryFile: clean(args.memory) || '.vibe2/experience.json',
    reviewFile: clean(args.review)
  });
  console.log(`VIBE2_EXPERIENCE_PROMOTED=${result.promoted ? 'YES' : 'NO'}`);
  console.log(`VIBE2_EXPERIENCE_REASON=${result.reason}`);
  console.log(`VIBE2_EXPERIENCE_AUTHORITY=${result.authority}`);
  if (!result.promoted) process.exitCode = 2;
}
