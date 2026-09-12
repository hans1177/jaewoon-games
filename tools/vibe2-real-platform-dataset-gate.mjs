// 파일명: tools/vibe2-real-platform-dataset-gate.mjs
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PLATFORM_POLICIES = Object.freeze({
  unity: Object.freeze({ requirementKey: 'androidRuntimeRequired', runtimeLabel: 'Unity Android/runtime' }),
  roblox: Object.freeze({ requirementKey: 'robloxRuntimeRequired', runtimeLabel: 'Roblox runtime' }),
  fortnite_uefn: Object.freeze({ requirementKey: 'uefnRuntimeRequired', runtimeLabel: 'Fortnite UEFN runtime' }),
});

const upper = (value) => String(value ?? '').trim().toUpperCase();
const clean = (value) => String(value ?? '').trim();

function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
}

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function readJsonl(file) {
  const raw = fs.readFileSync(file, 'utf8').trim();
  if (!raw) return [];
  return raw.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
}
function readSourceRecords(file) {
  const raw = fs.readFileSync(file, 'utf8').trim();
  if (!raw) return [];
  if (file.endsWith('.jsonl')) return raw.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed.samples)) return parsed.samples;
  return [parsed];
}
function sourceRevisionOf(record) { return clean(record?.provenance?.sourceRevision ?? record?.sourceRevision ?? record?.sourceCommit); }
function verificationTraceOf(record) { return record?.verification?.trace ?? record?.provenance?.verificationTrace ?? record?.verificationTrace ?? null; }
function sourceKindOf(record) { return clean(record?.provenance?.sourceKind ?? record?.sourceKind).toLowerCase(); }

function policyFor(taskType) {
  const type = clean(taskType).toLowerCase();
  const policy = PLATFORM_POLICIES[type];
  if (!policy) throw new Error(`unsupported platform taskType: ${type || 'MISSING'}`);
  return { taskType: type, ...policy };
}

function assertRealVerifiedPlatformSource(record, taskType, expectedRevision, label) {
  const policy = policyFor(taskType);
  if (!record || typeof record !== 'object') throw new Error(`${label}: source record missing`);
  if (clean(record.taskType).toLowerCase() !== policy.taskType) throw new Error(`${label}: source taskType must be ${policy.taskType}`);
  if (clean(record.lifecycle || 'active').toLowerCase() !== 'active') throw new Error(`${label}: inactive source sample`);
  if (record.synthetic === true || record.teacher === true || record.practiceOnly === true) throw new Error(`${label}: synthetic/practice source forbidden`);
  if (sourceKindOf(record) !== 'vibe2') throw new Error(`${label}: only vibe2 verified production source is allowed`);

  const revision = sourceRevisionOf(record);
  if (!revision || revision !== expectedRevision) throw new Error(`${label}: source revision mismatch`);
  if (upper(record.independentQa ?? record?.verification?.independentQa) !== 'PASS') throw new Error(`${label}: independent QA PASS required`);
  if (upper(record.browserQa ?? record?.verification?.browserQa) !== 'NOT_APPLICABLE') throw new Error(`${label}: platform browser QA must be NOT_APPLICABLE`);
  if (upper(record.runtime ?? record?.verification?.runtime) !== 'PASS') throw new Error(`${label}: ${policy.runtimeLabel} PASS required`);
  if (record?.verification?.[policy.requirementKey] !== true) throw new Error(`${label}: ${policy.runtimeLabel} binding required`);

  const trace = verificationTraceOf(record);
  if (!trace || typeof trace !== 'object') throw new Error(`${label}: verification trace required`);
  if (upper(trace.state) !== 'PASS') throw new Error(`${label}: trace state PASS required`);
  if (clean(trace.sourceRevision ?? trace.sha) !== revision) throw new Error(`${label}: trace/source revision mismatch`);
  if (!clean(trace.commitSha)) throw new Error(`${label}: verified commit SHA required`);
  if (!Number.isInteger(Number(trace.pullRequest)) || Number(trace.pullRequest) <= 0) throw new Error(`${label}: merged PR evidence required`);
  if (upper(trace.ci) !== 'PASS') throw new Error(`${label}: CI PASS required`);
  if (upper(trace.independentQa) !== 'PASS') throw new Error(`${label}: trace independent QA PASS required`);
  if (upper(trace.runtime) !== 'PASS') throw new Error(`${label}: trace runtime PASS required`);
  if (trace.stale === true) throw new Error(`${label}: stale evidence forbidden`);
  if (trace.flaky === true) throw new Error(`${label}: flaky evidence forbidden`);
  if (!clean(record.output)) throw new Error(`${label}: verified patch output required`);
}

function resolveSourceRecord(row, samplesRoot, cache, label) {
  const sourceFile = clean(row?.provenance?.sourceFile);
  const sourceIndex = Number(row?.provenance?.sourceIndex ?? 0);
  if (!sourceFile) throw new Error(`${label}: sourceFile provenance missing`);
  const root = path.resolve(samplesRoot);
  const resolved = path.resolve(sourceFile);
  const relative = path.relative(root, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error(`${label}: sourceFile must stay inside verified training-samples`);
  if (!fs.existsSync(resolved)) throw new Error(`${label}: sourceFile does not exist: ${sourceFile}`);
  if (!cache.has(resolved)) cache.set(resolved, readSourceRecords(resolved));
  const records = cache.get(resolved);
  if (!Number.isInteger(sourceIndex) || sourceIndex < 0 || sourceIndex >= records.length) throw new Error(`${label}: invalid sourceIndex`);
  return records[sourceIndex];
}

function validateSplit(name, rows, taskType, samplesRoot, cache) {
  const policy = policyFor(taskType);
  if (!Array.isArray(rows) || rows.length === 0) throw new Error(`${name}: real verified ${policy.taskType} split is empty`);
  const revisions = new Set();
  const sampleIds = new Set();
  rows.forEach((row, index) => {
    const label = `${name}[${index}]`;
    if (clean(row.taskType).toLowerCase() !== policy.taskType) throw new Error(`${label}: non-${policy.taskType} row forbidden`);
    if (row.synthetic !== false) throw new Error(`${label}: only explicitly non-synthetic rows are allowed`);
    if (sourceKindOf(row) !== 'vibe2') throw new Error(`${label}: normalized sourceKind must be vibe2`);
    if (upper(row?.qa?.independentQa) !== 'PASS') throw new Error(`${label}: independent QA PASS required`);
    if (upper(row?.qa?.browserQa) !== 'NOT_APPLICABLE') throw new Error(`${label}: platform browser QA must be NOT_APPLICABLE`);
    if (upper(row?.qa?.runtime) !== 'PASS') throw new Error(`${label}: runtime PASS required`);
    if (row?.qa?.requirements?.[policy.requirementKey] !== true) throw new Error(`${label}: ${policy.runtimeLabel} requirement missing`);
    const revision = clean(row?.provenance?.sourceRevision);
    if (!revision) throw new Error(`${label}: sourceRevision missing`);
    const source = resolveSourceRecord(row, samplesRoot, cache, label);
    assertRealVerifiedPlatformSource(source, policy.taskType, revision, label);
    revisions.add(revision);
    if (clean(row.sampleId)) sampleIds.add(clean(row.sampleId));
  });
  return { revisions, sampleIds };
}

function assertDisjoint(leftName, left, rightName, right) {
  for (const revision of left.revisions) if (right.revisions.has(revision)) throw new Error(`source revision leakage: ${revision} appears in ${leftName} and ${rightName}`);
  for (const sampleId of left.sampleIds) if (right.sampleIds.has(sampleId)) throw new Error(`sample leakage: ${sampleId} appears in ${leftName} and ${rightName}`);
}

export function validateRealPlatformDataset({ taskType, manifest, train, evalRows, holdout, samplesRoot }) {
  const policy = policyFor(taskType);
  if (!manifest || typeof manifest !== 'object') throw new Error('dataset manifest required');
  if (manifest.readyForTraining !== true) throw new Error('dataset manifest is not readyForTraining');
  if (clean(manifest.targetTaskType).toLowerCase() !== policy.taskType) throw new Error(`dataset targetTaskType must be ${policy.taskType}`);
  if ((manifest.contamination ?? {}).pass !== true) throw new Error('dataset contamination gate must pass');
  if (Number((manifest.contamination ?? {}).contaminationRate ?? 1) !== 0) throw new Error('dataset contamination rate must be zero');
  if (Number(manifest?.stats?.syntheticTrain ?? 0) !== 0) throw new Error(`${policy.taskType} production training cannot contain synthetic train rows`);

  const cache = new Map();
  const trainResult = validateSplit('train', train, policy.taskType, samplesRoot, cache);
  const evalResult = validateSplit('eval', evalRows, policy.taskType, samplesRoot, cache);
  const holdoutResult = validateSplit('holdout', holdout, policy.taskType, samplesRoot, cache);
  assertDisjoint('train', trainResult, 'eval', evalResult);
  assertDisjoint('train', trainResult, 'holdout', holdoutResult);
  assertDisjoint('eval', evalResult, 'holdout', holdoutResult);

  const trainHash = sha256(train.map(stableStringify).join('\n'));
  const evalHash = sha256(evalRows.map(stableStringify).join('\n'));
  const holdoutHash = sha256(holdout.map(stableStringify).join('\n'));
  if (trainHash !== clean(manifest.trainSha256)) throw new Error('train dataset hash mismatch');
  if (evalHash !== clean(manifest.evalSha256)) throw new Error('eval dataset hash mismatch');
  if (holdoutHash !== clean(manifest.holdoutSha256)) throw new Error('holdout dataset hash mismatch');

  return {
    state: 'REAL_VERIFIED_PLATFORM_DATASET_PASS',
    taskType: policy.taskType,
    authority: 'VERIFIED_PRODUCTION_EVIDENCE_ONLY',
    syntheticAllowed: false,
    train: train.length,
    eval: evalRows.length,
    holdout: holdout.length,
    trainRevisions: trainResult.revisions.size,
    evalRevisions: evalResult.revisions.size,
    holdoutRevisions: holdoutResult.revisions.size,
    holdoutSha256: holdoutHash,
  };
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
  for (const required of ['task-type', 'manifest', 'train', 'eval', 'holdout', 'samples-root']) {
    if (!args[required]) throw new Error(`--${required} required`);
  }
  const result = validateRealPlatformDataset({
    taskType: args['task-type'],
    manifest: readJson(args.manifest),
    train: readJsonl(args.train),
    evalRows: readJsonl(args.eval),
    holdout: readJsonl(args.holdout),
    samplesRoot: args['samples-root'],
  });
  console.log(JSON.stringify(result));
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try { main(); }
  catch (error) {
    console.error(`REAL_VERIFIED_PLATFORM_DATASET=BLOCKED reason=${error.message}`);
    process.exitCode = 2;
  }
}

export { PLATFORM_POLICIES };
