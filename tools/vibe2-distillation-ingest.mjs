// 파일명: tools/vibe2-distillation-ingest.mjs
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildVerifiedTrainingSample, qaEvidencePasses, TRAINING_SAMPLE_VERSION } from './vibe2-training-sample.mjs';

const SAFE_ID = /^[A-Za-z0-9._-]+$/;
const SHA = /^[0-9a-f]{7,40}$/i;

function git(args, { allowFailure = false } = {}) {
  const result = spawnSync('git', args, { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  if (result.status !== 0 && !allowFailure) {
    throw new Error(`git ${args.join(' ')} 실패: ${(result.stderr || result.stdout || '').trim().slice(0, 800)}`);
  }
  return result;
}

function gitText(args, options = {}) {
  const result = git(args, options);
  return result.status === 0 ? String(result.stdout || '').trim() : '';
}

function readJsonAt(ref, file) {
  const content = gitText(['show', `${ref}:${file}`], { allowFailure: true });
  if (!content) return null;
  try { return JSON.parse(content); } catch { return null; }
}

function readJsonFile(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

function upper(value) { return String(value ?? '').trim().toUpperCase(); }
function clean(value) { return String(value ?? '').trim(); }

export function listDevHistoryPaths(devRef = 'origin/autonomous-dev') {
  return gitText(['ls-tree', '-r', '--name-only', devRef, '--', '.autonomous/dev-history'], { allowFailure: true })
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter((value) => /^\.autonomous\/dev-history\/[A-Za-z0-9._-]+\.json$/.test(value))
    .sort();
}

export function listUnityReleaseBaselinePaths(mainRef = 'origin/main') {
  return gitText(['ls-tree', '-r', '--name-only', mainRef, '--', 'design'], { allowFailure: true })
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter((value) => /^design\/[^/]+\/\d{4}-\d{2}-\d{2}\/release-baseline\.json$/.test(value))
    .sort();
}

export function findPromotionCommit(candidateId, devRef = 'origin/autonomous-dev') {
  if (!SAFE_ID.test(candidateId)) return '';
  const rows = gitText(['log', devRef, '--format=%H%x09%s', '--', '.autonomous/dev-history'], { allowFailure: true })
    .split(/\r?\n/)
    .filter(Boolean);
  const suffix = ` candidate ${candidateId}`;
  for (const row of rows) {
    const tab = row.indexOf('\t');
    if (tab < 1) continue;
    const sha = row.slice(0, tab);
    const subject = row.slice(tab + 1);
    if (subject.startsWith('dev: promote verified ') && subject.endsWith(suffix)) return sha;
  }
  return '';
}

export function readCandidateEvidence(candidateCommit, candidateId) {
  if (!SAFE_ID.test(candidateId) || !SHA.test(candidateCommit)) return null;
  return readJsonAt(candidateCommit, `.autonomous/evidence/${candidateId}.json`);
}

export function readPromotionPatch(promotionCommit, sourcePath) {
  if (!SHA.test(promotionCommit) || !sourcePath || String(sourcePath).includes('..')) return '';
  return gitText(['diff', '--no-ext-diff', '--unified=3', `${promotionCommit}^`, promotionCommit, '--', sourcePath], { allowFailure: true });
}

export function findMergedPullRequest(sourceRevision) {
  if (!SHA.test(sourceRevision)) return 0;
  const body = gitText(['log', '-1', '--format=%B', sourceRevision], { allowFailure: true });
  const messageMatch = body.match(/\(#(\d+)\)|Merge pull request #(\d+)/i);
  if (messageMatch) return Number(messageMatch[1] ?? messageMatch[2]);
  const repo = clean(process.env.GITHUB_REPOSITORY);
  if (!repo) return 0;
  const result = spawnSync('gh', ['api', `repos/${repo}/commits/${sourceRevision}/pulls`, '--jq', 'map(select(.merged_at != null))[0].number // 0'], { encoding: 'utf8', maxBuffer: 1024 * 1024 });
  if (result.status !== 0) return 0;
  const number = Number(String(result.stdout || '').trim());
  return Number.isInteger(number) && number > 0 ? number : 0;
}

function unityReleaseRecord(mainRef, baselinePath) {
  const match = baselinePath.match(/^design\/([^/]+)\/(\d{4}-\d{2}-\d{2})\/release-baseline\.json$/);
  if (!match) return { pass: false, reason: 'INVALID_RELEASE_BASELINE_PATH' };
  const [, gameId, date] = match;
  const base = `design/${gameId}/${date}`;
  const baseline = readJsonAt(mainRef, baselinePath);
  const status = readJsonAt(mainRef, `${base}/release-production-status.json`) ?? readJsonAt(mainRef, `${base}/cycle-status.json`);
  const implementation = readJsonAt(mainRef, `${base}/vibe2-release-implementation.json`);
  const build = readJsonAt(mainRef, `${base}/unity-android-build.json`);
  const runtime = readJsonAt(mainRef, `${base}/android-runtime-validation.json`);
  const qa = readJsonAt(mainRef, `${base}/independent-release-qa.json`);
  if (!baseline || upper(baseline.status ?? baseline.state) !== 'RELEASE_READY' || baseline.coreDesignLockPreserved !== true) return { pass: false, reason: 'RELEASE_BASELINE_NOT_READY', gameId, date };
  if (!status || upper(status.state) !== 'RELEASE_READY' || upper(status.status) !== 'COMPLETE') return { pass: false, reason: 'RELEASE_STATUS_NOT_READY', gameId, date };
  if (status.evidence?.implementation?.boundToCurrentSource !== true || upper(status.evidence?.build?.state) !== 'PASS' || status.evidence?.build?.boundToCurrentSource !== true || status.evidence?.build?.boundToImplementation !== true) return { pass: false, reason: 'CURRENT_SOURCE_BUILD_BINDING_MISSING', gameId, date };
  if (upper(status.evidence?.runtime?.state) !== 'PASS' || status.evidence?.runtime?.bound !== true || upper(status.evidence?.independentQa?.state) !== 'PASS' || status.evidence?.independentQa?.bound !== true) return { pass: false, reason: 'RUNTIME_OR_INDEPENDENT_QA_NOT_BOUND', gameId, date };
  if (!implementation || !build || !runtime || !qa) return { pass: false, reason: 'RELEASE_EVIDENCE_FILE_MISSING', gameId, date };
  const sourceRoot = clean(status.unityProjectPath ?? implementation.sourceRoot ?? build.sourceRoot);
  if (!sourceRoot || sourceRoot.includes('..') || !sourceRoot.startsWith('unity-games/')) return { pass: false, reason: 'UNITY_SOURCE_ROOT_INVALID', gameId, date };
  const sourceRevision = clean(implementation.sourceCommit ?? build.sourceCommit ?? baseline.sourceCommit);
  if (!SHA.test(sourceRevision)) return { pass: false, reason: 'SOURCE_REVISION_MISSING', gameId, date };
  const currentTree = clean(status.currentSourceTreeSha);
  const implementationTree = clean(implementation.sourceTreeSha);
  const buildTree = clean(build.sourceTreeSha);
  if (!currentTree || implementationTree !== currentTree || buildTree !== currentTree) return { pass: false, reason: 'SOURCE_TREE_SHA_MISMATCH', gameId, date };
  const buildId = clean(build.buildId ?? build.sha256 ?? build.artifactSha256);
  const runtimeBuild = clean(runtime.buildId ?? runtime.build_id ?? runtime.buildSha256 ?? runtime.artifactSha256 ?? runtime.sha256);
  const qaBuild = clean(qa.buildId ?? qa.build_id ?? qa.buildSha256 ?? qa.artifactSha256 ?? qa.sha256);
  if (!buildId || runtimeBuild !== buildId || qaBuild !== buildId) return { pass: false, reason: 'BUILD_ID_MISMATCH', gameId, date };
  const patch = readPromotionPatch(sourceRevision, sourceRoot);
  if (!patch) return { pass: false, reason: 'VERIFIED_UNITY_PATCH_NOT_FOUND', gameId, date };
  const pullRequest = findMergedPullRequest(sourceRevision);
  if (!pullRequest) return { pass: false, reason: 'MERGED_PR_NOT_FOUND', gameId, date };
  const changedFiles = gitText(['diff', '--name-only', `${sourceRevision}^`, sourceRevision, '--', sourceRoot], { allowFailure: true }).split(/\r?\n/).map(clean).filter(Boolean);
  if (!changedFiles.length) return { pass: false, reason: 'UNITY_CHANGED_FILES_MISSING', gameId, date };
  const evidence = {
    gameId,
    candidateId: `unity-release-${gameId}-${sourceRevision.slice(0, 12)}`,
    sourcePath: sourceRoot,
    role: 'development',
    goal: `검증된 Unity ${gameId} 출시 수정의 구현 구조와 회귀 방지 판단을 학습한다`,
    summary: `RELEASE_READY Unity source diff; Android runtime 및 independent QA가 동일 build에 결속됨`,
    expectedEffect: '검증된 Unity 구현 패턴을 재사용하되 게임 규칙과 저장 의미를 보존한다',
    responsibilityFiles: changedFiles,
    changedFiles,
    verificationTrace: { state: 'PASS', sourceRevision, commitSha: sourceRevision, pullRequest, ci: 'PASS', independentQa: 'PASS', runtime: 'PASS', stale: false, flaky: false },
  };
  return { pass: true, gameId, date, baselinePath, sourceRoot, sourceRevision, pullRequest, patch, evidence };
}

export function ingestVerifiedUnityReleases({ mainRef = 'origin/main', outDir = 'company-learning/training-samples' } = {}) {
  fs.mkdirSync(outDir, { recursive: true });
  const result = { examined: 0, written: [], refreshed: [], skipped: [] };
  for (const baselinePath of listUnityReleaseBaselinePaths(mainRef)) {
    result.examined += 1;
    const release = unityReleaseRecord(mainRef, baselinePath);
    if (!release.pass) { result.skipped.push({ baselinePath, gameId: release.gameId ?? null, reason: release.reason }); continue; }
    const outFile = path.join(outDir, `${release.evidence.candidateId}.json`);
    const existing = fs.existsSync(outFile) ? readJsonFile(outFile) : null;
    if (existing && Number(existing.version ?? 0) >= TRAINING_SAMPLE_VERSION && qaEvidencePasses({ taskType: 'unity', independentQa: existing.independentQa, browserQa: existing.browserQa, runtime: existing.verification?.trace?.runtime }) && existing.provenance?.sourceRevision === release.sourceRevision) {
      result.skipped.push({ baselinePath, gameId: release.gameId, reason: 'ALREADY_CURRENT' });
      continue;
    }
    try {
      const sample = buildVerifiedTrainingSample({ evidence: release.evidence, patch: release.patch, sourceRevision: release.sourceRevision, independentQa: 'PASS', browserQa: 'NOT_APPLICABLE', taskType: 'unity' });
      sample.provenance.releaseBaselinePath = baselinePath;
      sample.provenance.releaseDate = release.date;
      sample.provenance.releasePullRequest = release.pullRequest;
      fs.writeFileSync(outFile, `${JSON.stringify(sample, null, 2)}\n`);
      const record = { candidateId: sample.candidateId, gameId: sample.gameId, taskType: 'unity', sourceRevision: release.sourceRevision, outFile };
      if (existing) result.refreshed.push(record); else result.written.push(record);
    } catch (error) {
      result.skipped.push({ baselinePath, gameId: release.gameId, reason: 'SAMPLE_REJECTED', detail: String(error?.message ?? error).slice(0, 300) });
    }
  }
  return result;
}

export function ingestVerifiedHistories({ devRef = 'origin/autonomous-dev', mainRef = 'origin/main', outDir = 'company-learning/training-samples' } = {}) {
  fs.mkdirSync(outDir, { recursive: true });
  const result = { version: 3, trainingSampleVersion: TRAINING_SAMPLE_VERSION, devRef, mainRef, written: [], refreshed: [], skipped: [], examined: 0, unityRelease: null };

  for (const historyPath of listDevHistoryPaths(devRef)) {
    result.examined += 1;
    const history = readJsonAt(devRef, historyPath);
    const candidateId = String(history?.candidateId ?? '').trim();
    const outFile = candidateId && SAFE_ID.test(candidateId) ? path.join(outDir, `${candidateId}.json`) : '';
    if (!candidateId || !outFile) { result.skipped.push({ historyPath, reason: 'INVALID_CANDIDATE_ID' }); continue; }
    const existing = fs.existsSync(outFile) ? readJsonFile(outFile) : null;
    const currentEnough = existing && Number(existing.version ?? 0) >= TRAINING_SAMPLE_VERSION && qaEvidencePasses({ taskType: existing.taskType, independentQa: existing.independentQa, browserQa: existing.browserQa, runtime: existing.verification?.trace?.runtime }) && existing.provenance?.sourceRevision;
    if (currentEnough) { result.skipped.push({ candidateId, reason: 'ALREADY_CURRENT' }); continue; }
    if (history?.verdict !== 'ADVANCE_TO_AUTONOMOUS_DEV' || history?.independentQa !== 'PASS' || history?.browserQa !== 'PASS') { result.skipped.push({ candidateId, reason: 'VERIFICATION_NOT_PASS' }); continue; }
    const promotionCommit = findPromotionCommit(candidateId, devRef);
    if (!promotionCommit) { result.skipped.push({ candidateId, reason: 'PROMOTION_COMMIT_NOT_FOUND' }); continue; }
    const candidateCommit = String(history.candidateCommit ?? '').trim();
    const evidence = readCandidateEvidence(candidateCommit, candidateId);
    if (!evidence) { result.skipped.push({ candidateId, reason: 'CANDIDATE_EVIDENCE_NOT_FOUND' }); continue; }
    if (String(evidence.gameId ?? '') !== String(history.gameId ?? '')) { result.skipped.push({ candidateId, reason: 'GAME_ID_MISMATCH' }); continue; }
    const sourcePath = String(evidence.sourcePath ?? '').trim();
    const patch = readPromotionPatch(promotionCommit, sourcePath);
    if (!patch) { result.skipped.push({ candidateId, reason: 'VERIFIED_PATCH_NOT_FOUND' }); continue; }
    try {
      const sample = buildVerifiedTrainingSample({ evidence, patch, sourceRevision: promotionCommit, independentQa: history.independentQa, browserQa: history.browserQa, performance: history.performance ?? null });
      sample.provenance.devHistoryPath = historyPath;
      sample.provenance.candidateCommit = candidateCommit;
      sample.provenance.promotionCommit = promotionCommit;
      fs.writeFileSync(outFile, `${JSON.stringify(sample, null, 2)}\n`);
      const record = { candidateId, gameId: sample.gameId, taskType: sample.taskType, promotionCommit, outFile };
      if (existing) result.refreshed.push(record); else result.written.push(record);
    } catch (error) { result.skipped.push({ candidateId, reason: 'SAMPLE_REJECTED', detail: String(error?.message ?? error).slice(0, 300) }); }
  }
  result.unityRelease = ingestVerifiedUnityReleases({ mainRef, outDir });
  result.examined += result.unityRelease.examined;
  result.written.push(...result.unityRelease.written);
  result.refreshed.push(...result.unityRelease.refreshed);
  result.skipped.push(...result.unityRelease.skipped);
  return result;
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const [key, inline] = arg.slice(2).split('=', 2);
    args[key] = inline ?? argv[++i];
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const result = ingestVerifiedHistories({ devRef: args['dev-ref'] || 'origin/autonomous-dev', mainRef: args['main-ref'] || 'origin/main', outDir: args['out-dir'] || 'company-learning/training-samples' });
  console.log(JSON.stringify(result));
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) { try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; } }
