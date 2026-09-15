// 파일명: tools/vibe2-game-study-production-fanin.mjs
// 역할: production GAME STUDY fan-in 전에 예약 task와 실제 artifact를 대조해 누락/손상/중복/stale 결과를 안전하게 정규화한다.
// 원칙: 검증 결과를 만들거나 PASS를 추정하지 않는다. 사용할 수 없는 결과는 FAIL evidence로만 변환해 기존 retry 정책이 처리하게 한다.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const clean = (value) => String(value ?? '').trim();
const safeId = (value) => clean(value).replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 96) || 'study';
const ALLOWED_OUTCOMES = new Set(['PASS', 'FAIL', 'BLOCKED']);

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

function parseMatrix(input) {
  if (!clean(input)) return [];
  let value;
  try { value = JSON.parse(input); } catch { return []; }
  const rows = Array.isArray(value) ? value : Array.isArray(value?.include) ? value.include : [];
  return rows.map((row) => ({
    taskId: clean(row?.taskId),
    targetId: clean(row?.targetId),
    engine: clean(row?.engine).toLowerCase()
  })).filter((row) => row.taskId);
}

export function expectedStudyTasks({ webMatrixJson = '', robloxMatrixJson = '' } = {}) {
  const byId = new Map();
  for (const row of [...parseMatrix(webMatrixJson), ...parseMatrix(robloxMatrixJson)]) {
    if (!byId.has(row.taskId)) byId.set(row.taskId, row);
  }
  return Object.freeze([...byId.values()].map((row) => Object.freeze({ ...row })));
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function disableFile(file, reason) {
  let next = `${file}.${reason}.disabled`;
  let index = 2;
  while (fs.existsSync(next)) next = `${file}.${reason}.${index++}.disabled`;
  fs.renameSync(file, next);
  return path.basename(file);
}

function resultIssue(value, expectedRow) {
  const taskId = clean(value?.taskId);
  if (!taskId) return 'missing-task-id';
  if (!expectedRow) return 'unexpected-task';
  const targetId = clean(value?.targetId);
  const engine = clean(value?.engine).toLowerCase();
  if (expectedRow.targetId && targetId !== expectedRow.targetId) return 'target-mismatch';
  if (expectedRow.engine && engine !== expectedRow.engine) return 'engine-mismatch';
  if (value?.authorityExpanded === true || value?.study?.authorityExpanded === true) return 'authority-expanded';
  const outcome = clean(value?.outcome).toUpperCase();
  if (!ALLOWED_OUTCOMES.has(outcome)) return 'outcome-invalid';
  if (outcome === 'PASS' && value?.study?.verified !== true) return 'unverified-pass';
  return null;
}

function missingResult(taskId, expectedRow, reason = 'game-study-result-missing') {
  return {
    version: 1,
    taskId,
    targetId: clean(expectedRow?.targetId) || null,
    engine: clean(expectedRow?.engine) || null,
    outcome: 'FAIL',
    blocker: reason,
    reason: reason === 'game-study-result-ambiguous'
      ? 'reserved GAME STUDY task produced duplicate or ambiguous immutable result artifacts'
      : 'reserved GAME STUDY task produced no usable immutable result artifact',
    evidence: [`game-study-production-fanin:${reason}`],
    study: null,
    runtimeDiagnostics: null,
    authorityExpanded: false,
    authority: 'vibe2-game-study-production-fanin-guard'
  };
}

export function guardProductionStudyResults({ resultsDir, expectedTasks = [], outputFile = '' } = {}) {
  const root = path.resolve(clean(resultsDir) || '.');
  fs.mkdirSync(root, { recursive: true });
  const expected = new Map((expectedTasks || []).map((row) => [clean(row?.taskId), {
    taskId: clean(row?.taskId), targetId: clean(row?.targetId), engine: clean(row?.engine).toLowerCase()
  }]).filter(([taskId]) => taskId));
  const candidates = new Map();
  const invalidFiles = [];
  const mismatchFiles = [];
  const unexpectedFiles = [];
  const duplicateFiles = [];

  for (const name of fs.readdirSync(root).filter((file) => file.endsWith('.json')).sort()) {
    const file = path.join(root, name);
    let value;
    try {
      value = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
      invalidFiles.push(disableFile(file, 'invalid-json'));
      continue;
    }
    const taskId = clean(value?.taskId);
    const expectedRow = expected.get(taskId);
    const issue = resultIssue(value, expectedRow);
    if (issue === 'unexpected-task') {
      unexpectedFiles.push(disableFile(file, issue));
      continue;
    }
    if (['target-mismatch', 'engine-mismatch'].includes(issue)) {
      mismatchFiles.push(disableFile(file, issue));
      continue;
    }
    if (issue) {
      invalidFiles.push(disableFile(file, issue));
      continue;
    }
    if (!candidates.has(taskId)) candidates.set(taskId, []);
    candidates.get(taskId).push({ file, name });
  }

  const validByTask = new Map();
  const ambiguousTaskIds = [];
  for (const [taskId, rows] of candidates) {
    if (rows.length === 1) {
      validByTask.set(taskId, rows[0].name);
      continue;
    }
    ambiguousTaskIds.push(taskId);
    for (const row of rows) duplicateFiles.push(disableFile(row.file, 'duplicate'));
  }

  const missingTaskIds = [];
  for (const [taskId, expectedRow] of expected) {
    if (validByTask.has(taskId)) continue;
    missingTaskIds.push(taskId);
    const ambiguous = ambiguousTaskIds.includes(taskId);
    const file = path.join(root, `__missing-${safeId(taskId)}.json`);
    writeJson(file, missingResult(taskId, expectedRow, ambiguous ? 'game-study-result-ambiguous' : 'game-study-result-missing'));
    validByTask.set(taskId, path.basename(file));
  }

  const summary = Object.freeze({
    version: 2,
    expectedCount: expected.size,
    usableResultCount: validByTask.size,
    missingCount: missingTaskIds.length,
    invalidCount: invalidFiles.length,
    mismatchCount: mismatchFiles.length,
    duplicateCount: duplicateFiles.length,
    unexpectedCount: unexpectedFiles.length,
    ambiguousCount: ambiguousTaskIds.length,
    missingTaskIds: Object.freeze(missingTaskIds),
    ambiguousTaskIds: Object.freeze(ambiguousTaskIds),
    invalidFiles: Object.freeze(invalidFiles),
    mismatchFiles: Object.freeze(mismatchFiles),
    duplicateFiles: Object.freeze(duplicateFiles),
    unexpectedFiles: Object.freeze(unexpectedFiles),
    authorityExpanded: false,
    authority: 'vibe2-game-study-production-fanin-guard'
  });
  if (clean(outputFile)) writeJson(outputFile, summary);
  return summary;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = parseArgs();
  const expected = expectedStudyTasks({
    webMatrixJson: clean(args['web-matrix-json']) || clean(process.env.VIBE2_GAME_STUDY_WEB_MATRIX),
    robloxMatrixJson: clean(args['roblox-matrix-json']) || clean(process.env.VIBE2_GAME_STUDY_ROBLOX_MATRIX)
  });
  const result = guardProductionStudyResults({
    resultsDir: clean(args.results) || '/tmp/vibe2-game-study-results',
    expectedTasks: expected,
    outputFile: clean(args.output)
  });
  console.log(`VIBE2_GAME_STUDY_EXPECTED=${result.expectedCount}`);
  console.log(`VIBE2_GAME_STUDY_USABLE_RESULTS=${result.usableResultCount}`);
  console.log(`VIBE2_GAME_STUDY_MISSING_RESULTS=${result.missingCount}`);
  console.log(`VIBE2_GAME_STUDY_INVALID_RESULTS=${result.invalidCount}`);
  console.log(`VIBE2_GAME_STUDY_MISMATCH_RESULTS=${result.mismatchCount}`);
  console.log(`VIBE2_GAME_STUDY_DUPLICATE_RESULTS=${result.duplicateCount}`);
  console.log(`VIBE2_GAME_STUDY_UNEXPECTED_RESULTS=${result.unexpectedCount}`);
  console.log('VIBE2_GAME_STUDY_AUTHORITY_EXPANDED=NO');
}
