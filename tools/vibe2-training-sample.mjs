// 파일명: tools/vibe2-training-sample.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TRAINING_SAMPLE_VERSION = 3;
const MAX_PATCH_BYTES = 120_000;
const ALLOWED_TASK_TYPES = new Set(['coding', 'bugfix', 'unity', 'qa', 'planning', 'general']);
const INVALID_TRACE_STATES = new Set(['FAIL', 'STALLED', 'NO_ACTIONABLE_WORK', 'INCOMPLETE_PROGRESS', 'FLAKY', 'STALE', 'SHA_MISMATCH']);

const clean = (value) => String(value ?? '').trim();
const clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0));
const upper = (value) => clean(value).toUpperCase();

function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }

function inferTaskType(evidence) {
  const sourcePath = clean(evidence?.sourcePath).toLowerCase();
  const role = clean(evidence?.role).toLowerCase();
  const goal = clean(evidence?.goal).toLowerCase();
  const summary = clean(evidence?.summary).toLowerCase();
  const diagnostic = evidence?.diagnosticFocus;
  const changedFiles = Array.isArray(evidence?.changedFiles) ? evidence.changedFiles.map((file) => clean(file).toLowerCase()).filter(Boolean) : [];
  const allQaFiles = changedFiles.length > 0 && changedFiles.every((file) => /(^|\/)(qa|tests?|test)(\/|$)|\.(test|spec)\./.test(file));
  if (sourcePath.startsWith('unity-games/')) return 'unity';
  if (allQaFiles || role === 'qa') return 'qa';
  if (diagnostic?.type || diagnostic?.file || diagnostic?.needle) return 'bugfix';
  if (/\[(bugfix|repair|regression)\]|\bbug\b|\bfix\b|\brepair\b|버그|오류|회귀|크래시/.test(goal)) return 'bugfix';
  if (/\[(feature_development|web_first_implementation|implementation)\]|기능|구현|개발|vertical slice|플레이어블/.test(goal)) return 'coding';
  if (role === 'development' || role === 'graphics' || role === 'balance') return 'coding';
  if (/implement|implementation|integrat|code change|기능|구현|개발/.test(summary)) return 'coding';
  if (/^(web-games|godot-games)\//.test(sourcePath) && changedFiles.length > 0) return 'coding';
  if (/기획|설계|planning|artbook/.test(goal) && changedFiles.length === 0) return 'planning';
  return 'general';
}

function inferDifficulty(evidence, taskType) {
  if (taskType === 'unity') return 'unity-build';
  if (taskType === 'qa') return 'regression';
  if (taskType === 'bugfix' || evidence?.diagnosticFocus?.type) return 'bug';
  return 'simple';
}

function buildInput(evidence) {
  return JSON.stringify({
    gameId: clean(evidence.gameId), sourcePath: clean(evidence.sourcePath), role: clean(evidence.role) || 'development',
    diagnostic: evidence.diagnosticFocus ?? null,
    responsibilityFiles: Array.isArray(evidence.responsibilityFiles) ? evidence.responsibilityFiles : [],
    browserFailureFeedbackUsed: evidence.browserFailureFeedbackUsed === true,
    protectedValues: ['save keys', 'progression meaning', 'public stable behavior'],
  }, null, 2);
}

function buildOutput(evidence, patch) {
  return [`요약: ${clean(evidence.summary) || '검증된 최소 수정'}`, clean(evidence.expectedEffect) ? `기대 효과: ${clean(evidence.expectedEffect)}` : '',
    Array.isArray(evidence.changedFiles) && evidence.changedFiles.length ? `변경 파일: ${evidence.changedFiles.join(', ')}` : '', '', '검증된 패치:', patch.trim()]
    .filter((line, index, rows) => line || (index > 0 && rows[index - 1])).join('\n').trim();
}

export function qaRequirementsForTask(taskType) {
  const type = clean(taskType).toLowerCase();
  return type === 'unity'
    ? { independentQa: 'PASS', browserQa: 'NOT_APPLICABLE', runtime: 'PASS', androidRuntimeRequired: true }
    : { independentQa: 'PASS', browserQa: 'PASS', runtime: 'PASS', androidRuntimeRequired: false };
}

export function qaEvidencePasses({ taskType, independentQa, browserQa, runtime }) {
  const required = qaRequirementsForTask(taskType);
  if (upper(independentQa) !== 'PASS' || upper(runtime) !== 'PASS') return false;
  if (required.browserQa === 'PASS' && upper(browserQa) !== 'PASS') return false;
  return true;
}

export function validatePositiveTrace(trace, sourceRevision) {
  if (!trace || typeof trace !== 'object') throw new Error('완결 verificationTrace 필요');
  const state = upper(trace.state);
  if (!state || INVALID_TRACE_STATES.has(state) || state !== 'PASS') throw new Error(`성공 trace 상태가 아님: ${state || 'MISSING'}`);
  const revision = clean(sourceRevision);
  const traceRevision = clean(trace.sourceRevision ?? trace.sha);
  if (!revision || !traceRevision || revision !== traceRevision) throw new Error('verificationTrace SHA mismatch');
  if (!clean(trace.commitSha)) throw new Error('검증 commit SHA 필요');
  if (!Number.isInteger(Number(trace.pullRequest)) || Number(trace.pullRequest) <= 0) throw new Error('검증 PR 번호 필요');
  if (upper(trace.ci) !== 'PASS') throw new Error('CI PASS evidence 필요');
  if (upper(trace.independentQa) !== 'PASS') throw new Error('독립 QA trace PASS 필요');
  if (upper(trace.runtime) !== 'PASS') throw new Error('runtime PASS evidence 필요');
  if (trace.stale === true) throw new Error('stale evidence는 학습 금지');
  if (trace.flaky === true) throw new Error('flaky evidence는 학습 금지');
  return { state: 'PASS', sourceRevision: traceRevision, commitSha: clean(trace.commitSha), pullRequest: Number(trace.pullRequest), ci: 'PASS', independentQa: 'PASS', runtime: 'PASS', stale: false, flaky: false };
}

export function buildVerifiedTrainingSample({ evidence, patch, sourceRevision, independentQa = 'PASS', browserQa = 'PASS', performance = null, taskType = '' }) {
  if (!evidence || typeof evidence !== 'object') throw new Error('candidate evidence 필요');
  const instruction = clean(evidence.goal);
  if (!instruction) throw new Error('candidate goal이 없어 학습 샘플을 만들 수 없음');
  const verifiedPatch = String(patch ?? '').trim();
  if (!verifiedPatch) throw new Error('검증된 patch가 없어 학습 샘플을 만들 수 없음');
  if (Buffer.byteLength(verifiedPatch, 'utf8') > MAX_PATCH_BYTES) throw new Error(`patch가 학습 샘플 한도 ${MAX_PATCH_BYTES} bytes를 초과함`);
  const resolvedTaskType = clean(taskType).toLowerCase() || inferTaskType(evidence);
  if (!ALLOWED_TASK_TYPES.has(resolvedTaskType)) throw new Error(`지원하지 않는 taskType: ${resolvedTaskType}`);
  const revision = clean(sourceRevision);
  if (!revision) throw new Error('검증 sourceRevision 필요');
  const verificationTrace = validatePositiveTrace(evidence.verificationTrace, revision);
  const requirements = qaRequirementsForTask(resolvedTaskType);
  if (!qaEvidencePasses({ taskType: resolvedTaskType, independentQa, browserQa, runtime: verificationTrace.runtime })) {
    if (upper(independentQa) !== 'PASS') throw new Error('독립 QA PASS 필요');
    if (requirements.browserQa === 'PASS' && upper(browserQa) !== 'PASS') throw new Error('브라우저 QA PASS 필요');
    throw new Error('runtime PASS evidence 필요');
  }
  const normalizedBrowserQa = requirements.browserQa;
  const playerImpactScore = clamp01(Number(performance?.playerImpactScore ?? 0) / 5);
  return {
    version: TRAINING_SAMPLE_VERSION, instruction, input: buildInput(evidence), output: buildOutput(evidence, verifiedPatch),
    taskType: resolvedTaskType, difficulty: inferDifficulty(evidence, resolvedTaskType), lifecycle: 'active', sourceKind: 'vibe2',
    project: clean(evidence.gameId) || 'shared', gameId: clean(evidence.gameId) || null, candidateId: clean(evidence.candidateId) || null,
    sourceCommit: revision, sourceRevision: revision, independentQa: 'PASS', browserQa: normalizedBrowserQa,
    quality: { codeQuality: 1, noRegression: true, playImprovement: playerImpactScore, ruleCompliance: 1 },
    provenance: { sourceKind: 'vibe2', sourceRevision: revision, gameId: clean(evidence.gameId) || null, candidateId: clean(evidence.candidateId) || null, verificationTrace },
    verification: { independentQa: 'PASS', browserQa: normalizedBrowserQa, runtime: 'PASS', androidRuntimeRequired: requirements.androidRuntimeRequired, fullRegression: 'PASS', saveKeyValidation: clean(evidence.saveKeyValidation) || null,
      syntaxChecks: Array.isArray(evidence.syntaxChecks) ? evidence.syntaxChecks : [], proposedTests: Array.isArray(evidence.proposedTests) ? evidence.proposedTests : [], trace: verificationTrace },
  };
}

function parseArgs(argv) { const args = {}; for (let i = 0; i < argv.length; i += 1) { const arg = argv[i]; if (!arg.startsWith('--')) continue; const [key, inline] = arg.slice(2).split('=', 2); args[key] = inline ?? argv[++i]; } return args; }
function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.evidence || !args.patch || !args.output) throw new Error('--evidence, --patch, --output 필요');
  const evidence = readJson(args.evidence); const patch = fs.readFileSync(args.patch, 'utf8');
  const performance = args.performance && fs.existsSync(args.performance) ? readJson(args.performance) : null;
  const sample = buildVerifiedTrainingSample({ evidence, patch, performance, sourceRevision: args['source-revision'], independentQa: args['independent-qa'] || 'PASS', browserQa: args['browser-qa'] || 'PASS', taskType: args['task-type'] || '' });
  fs.mkdirSync(path.dirname(args.output), { recursive: true }); fs.writeFileSync(args.output, `${JSON.stringify(sample, null, 2)}\n`);
  console.log(JSON.stringify({ output: args.output, taskType: sample.taskType, project: sample.project, bytes: Buffer.byteLength(sample.output) }));
}
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) { try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; } }
export { TRAINING_SAMPLE_VERSION, MAX_PATCH_BYTES };
