// 파일명: tools/vibe2-distillation-ingest.mjs
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildVerifiedTrainingSample, TRAINING_SAMPLE_VERSION } from './vibe2-training-sample.mjs';

const SAFE_ID = /^[A-Za-z0-9._-]+$/;

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

export function listDevHistoryPaths(devRef = 'origin/autonomous-dev') {
  return gitText(['ls-tree', '-r', '--name-only', devRef, '--', '.autonomous/dev-history'], { allowFailure: true })
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter((value) => /^\.autonomous\/dev-history\/[A-Za-z0-9._-]+\.json$/.test(value))
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
  if (!SAFE_ID.test(candidateId) || !/^[0-9a-f]{7,40}$/i.test(candidateCommit)) return null;
  return readJsonAt(candidateCommit, `.autonomous/evidence/${candidateId}.json`);
}

export function readPromotionPatch(promotionCommit, sourcePath) {
  if (!/^[0-9a-f]{7,40}$/i.test(promotionCommit) || !sourcePath || String(sourcePath).includes('..')) return '';
  return gitText(['diff', '--no-ext-diff', '--unified=3', `${promotionCommit}^`, promotionCommit, '--', sourcePath], { allowFailure: true });
}

export function ingestVerifiedHistories({ devRef = 'origin/autonomous-dev', outDir = 'company-learning/training-samples' } = {}) {
  fs.mkdirSync(outDir, { recursive: true });
  const result = { version: 2, trainingSampleVersion: TRAINING_SAMPLE_VERSION, devRef, written: [], refreshed: [], skipped: [], examined: 0 };

  for (const historyPath of listDevHistoryPaths(devRef)) {
    result.examined += 1;
    const history = readJsonAt(devRef, historyPath);
    const candidateId = String(history?.candidateId ?? '').trim();
    const outFile = candidateId && SAFE_ID.test(candidateId) ? path.join(outDir, `${candidateId}.json`) : '';
    if (!candidateId || !outFile) {
      result.skipped.push({ historyPath, reason: 'INVALID_CANDIDATE_ID' });
      continue;
    }

    const existing = fs.existsSync(outFile) ? readJsonFile(outFile) : null;
    const currentEnough = existing
      && Number(existing.version ?? 0) >= TRAINING_SAMPLE_VERSION
      && existing.independentQa === 'PASS'
      && existing.browserQa === 'PASS'
      && existing.provenance?.sourceRevision;
    if (currentEnough) {
      result.skipped.push({ candidateId, reason: 'ALREADY_CURRENT' });
      continue;
    }
    if (history?.verdict !== 'ADVANCE_TO_AUTONOMOUS_DEV' || history?.independentQa !== 'PASS' || history?.browserQa !== 'PASS') {
      result.skipped.push({ candidateId, reason: 'VERIFICATION_NOT_PASS' });
      continue;
    }

    const promotionCommit = findPromotionCommit(candidateId, devRef);
    if (!promotionCommit) {
      result.skipped.push({ candidateId, reason: 'PROMOTION_COMMIT_NOT_FOUND' });
      continue;
    }
    const candidateCommit = String(history.candidateCommit ?? '').trim();
    const evidence = readCandidateEvidence(candidateCommit, candidateId);
    if (!evidence) {
      result.skipped.push({ candidateId, reason: 'CANDIDATE_EVIDENCE_NOT_FOUND' });
      continue;
    }
    if (String(evidence.gameId ?? '') !== String(history.gameId ?? '')) {
      result.skipped.push({ candidateId, reason: 'GAME_ID_MISMATCH' });
      continue;
    }

    const sourcePath = String(evidence.sourcePath ?? '').trim();
    const patch = readPromotionPatch(promotionCommit, sourcePath);
    if (!patch) {
      result.skipped.push({ candidateId, reason: 'VERIFIED_PATCH_NOT_FOUND' });
      continue;
    }

    try {
      const sample = buildVerifiedTrainingSample({
        evidence,
        patch,
        sourceRevision: promotionCommit,
        independentQa: history.independentQa,
        browserQa: history.browserQa,
        performance: history.performance ?? null,
      });
      sample.provenance.devHistoryPath = historyPath;
      sample.provenance.candidateCommit = candidateCommit;
      sample.provenance.promotionCommit = promotionCommit;
      fs.writeFileSync(outFile, `${JSON.stringify(sample, null, 2)}\n`);
      const record = { candidateId, gameId: sample.gameId, taskType: sample.taskType, promotionCommit, outFile };
      if (existing) result.refreshed.push(record);
      else result.written.push(record);
    } catch (error) {
      result.skipped.push({ candidateId, reason: 'SAMPLE_REJECTED', detail: String(error?.message ?? error).slice(0, 300) });
    }
  }
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
  const result = ingestVerifiedHistories({
    devRef: args['dev-ref'] || 'origin/autonomous-dev',
    outDir: args['out-dir'] || 'company-learning/training-samples',
  });
  console.log(JSON.stringify(result));
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
