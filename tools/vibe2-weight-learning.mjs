// 파일명: tools/vibe2-weight-learning.mjs
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const DATASET_VERSION = 1;
const DEFAULT_SEED = 20260910;
const REQUIRED_QA = Object.freeze({ independentQa: 'PASS', browserQa: 'PASS' });

function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function normalizeQa(record) {
  const qa = record?.qa && typeof record.qa === 'object' ? record.qa : {};
  return {
    independentQa: String(qa.independentQa ?? qa.independent ?? record?.independentQa ?? '').toUpperCase(),
    browserQa: String(qa.browserQa ?? qa.browser ?? record?.browserQa ?? '').toUpperCase(),
  };
}

export function isVerifiedPass(record) {
  const qa = normalizeQa(record);
  return qa.independentQa === REQUIRED_QA.independentQa && qa.browserQa === REQUIRED_QA.browserQa;
}

function normalizeSample(record, sourceFile, index) {
  const sample = record?.trainingSample && typeof record.trainingSample === 'object' ? record.trainingSample : record;
  const instruction = String(sample?.instruction ?? '').trim();
  const input = String(sample?.input ?? '').trim();
  const output = String(sample?.output ?? '').trim();
  if (!instruction || !output || !isVerifiedPass(record)) return null;
  const sourceRevision = String(record?.provenance?.sourceRevision ?? record?.sourceRevision ?? record?.sourceCommit ?? record?.candidateCommit ?? '').trim();
  if (!sourceRevision) return null;
  const sourceKind = String(record?.provenance?.sourceKind ?? record?.sourceKind ?? (record?.teacher ? 'teacher' : 'vibe2')).trim() || 'vibe2';
  const qa = normalizeQa(record);
  const normalized = {
    instruction,
    input,
    output,
    provenance: {
      sourceFile,
      sourceIndex: index,
      sourceKind,
      sourceRevision,
      candidateId: record?.candidateId ?? null,
      gameId: record?.gameId ?? null,
    },
    qa,
  };
  normalized.sampleId = sha256(stableStringify(normalized));
  return normalized;
}

function readRecords(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8').trim();
  if (!raw) return [];
  if (filePath.endsWith('.jsonl')) return raw.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed.samples)) return parsed.samples;
  return [parsed];
}

function collectInputFiles(inputPaths) {
  const files = [];
  const visit = (entry) => {
    const stat = fs.statSync(entry);
    if (stat.isDirectory()) {
      for (const name of fs.readdirSync(entry).sort()) visit(path.join(entry, name));
      return;
    }
    if (/\.jsonl?$/.test(entry)) files.push(entry);
  };
  for (const inputPath of inputPaths) visit(inputPath);
  return files;
}

function splitScore(sampleId, seed) {
  return Number.parseInt(sha256(`${seed}:${sampleId}`).slice(0, 12), 16) / 0xffffffffffff;
}

export function buildDataset(recordsWithSource, { seed = DEFAULT_SEED, evalRatio = 0.2 } = {}) {
  if (!(evalRatio > 0 && evalRatio < 1)) throw new Error('evalRatio must be between 0 and 1');
  const accepted = [];
  let skippedUnverified = 0;
  let skippedIncomplete = 0;
  for (const { record, sourceFile, index } of recordsWithSource) {
    if (!isVerifiedPass(record)) {
      skippedUnverified += 1;
      continue;
    }
    const sample = normalizeSample(record, sourceFile, index);
    if (!sample) {
      skippedIncomplete += 1;
      continue;
    }
    accepted.push(sample);
  }
  const deduped = [...new Map(accepted.map((sample) => [sample.sampleId, sample])).values()].sort((a, b) => a.sampleId.localeCompare(b.sampleId));
  const train = [];
  const evalSet = [];
  for (const sample of deduped) (splitScore(sample.sampleId, seed) < evalRatio ? evalSet : train).push(sample);
  if (deduped.length > 1 && evalSet.length === 0) evalSet.push(train.shift());
  if (deduped.length > 1 && train.length === 0) train.push(evalSet.shift());
  return {
    train,
    eval: evalSet,
    stats: {
      seen: recordsWithSource.length,
      accepted: deduped.length,
      train: train.length,
      eval: evalSet.length,
      skippedUnverified,
      skippedIncomplete,
      duplicatesRemoved: accepted.length - deduped.length,
    },
  };
}

export function computeLearningMetrics(runs) {
  const total = runs.length;
  if (!total) return { successRate: 0, firstAttemptQaPassRate: 0, repeatedErrorRecurrenceRate: 0, averageFixIterations: 0, ruleComplianceRate: 0 };
  const successful = runs.filter((run) => run.success === true).length;
  const firstPass = runs.filter((run) => run.firstAttemptQaPass === true).length;
  const repeated = runs.filter((run) => run.sameErrorRecurred === true).length;
  const compliant = runs.filter((run) => run.ruleCompliant === true).length;
  const iterations = runs.reduce((sum, run) => sum + Math.max(0, Number(run.fixIterations) || 0), 0);
  return {
    successRate: successful / total,
    firstAttemptQaPassRate: firstPass / total,
    repeatedErrorRecurrenceRate: repeated / total,
    averageFixIterations: iterations / total,
    ruleComplianceRate: compliant / total,
  };
}

export function evaluateAdapter(baseline, candidate, { minGain = 0.02 } = {}) {
  const higherBetter = ['successRate', 'firstAttemptQaPassRate', 'ruleComplianceRate'];
  const lowerBetter = ['repeatedErrorRecurrenceRate', 'averageFixIterations'];
  const regressions = [];
  let gain = 0;
  for (const key of higherBetter) {
    const delta = Number(candidate[key]) - Number(baseline[key]);
    if (delta < -1e-9) regressions.push(key);
    gain += delta;
  }
  for (const key of lowerBetter) {
    const delta = Number(baseline[key]) - Number(candidate[key]);
    if (delta < -1e-9) regressions.push(key);
    gain += delta;
  }
  const averageGain = gain / (higherBetter.length + lowerBetter.length);
  return { verdict: regressions.length === 0 && averageGain >= minGain ? 'PROMOTE' : 'REJECT', averageGain, minGain, regressions };
}

function writeJsonl(filePath, rows) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, rows.map((row) => JSON.stringify(row)).join('\n') + (rows.length ? '\n' : ''));
}

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const args = { command, input: [] };
  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i];
    if (arg === '--input') args.input.push(rest[++i]);
    else if (arg.startsWith('--input=')) args.input.push(arg.slice(8));
    else if (arg.startsWith('--')) {
      const [key, inline] = arg.slice(2).split('=', 2);
      args[key] = inline ?? rest[++i];
    }
  }
  return args;
}

function runDataset(args) {
  if (!args.input.length) throw new Error('dataset requires at least one --input');
  const outDir = args.out || 'vibe2-learning/datasets/latest';
  const seed = Number(args.seed ?? DEFAULT_SEED);
  const evalRatio = Number(args['eval-ratio'] ?? 0.2);
  const files = collectInputFiles(args.input);
  const recordsWithSource = files.flatMap((file) => readRecords(file).map((record, index) => ({ record, sourceFile: path.relative(process.cwd(), file), index })));
  const dataset = buildDataset(recordsWithSource, { seed, evalRatio });
  writeJsonl(path.join(outDir, 'train.jsonl'), dataset.train);
  writeJsonl(path.join(outDir, 'eval.jsonl'), dataset.eval);
  const manifest = {
    version: DATASET_VERSION,
    createdAt: new Date().toISOString(),
    seed,
    evalRatio,
    qaRequirement: REQUIRED_QA,
    sources: files.map((file) => ({ file: path.relative(process.cwd(), file), sha256: sha256(fs.readFileSync(file)) })),
    stats: dataset.stats,
    trainSha256: sha256(dataset.train.map(stableStringify).join('\n')),
    evalSha256: sha256(dataset.eval.map(stableStringify).join('\n')),
  };
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(JSON.stringify(manifest));
}

function runGate(args) {
  const baseline = JSON.parse(fs.readFileSync(args.baseline, 'utf8'));
  const candidate = JSON.parse(fs.readFileSync(args.candidate, 'utf8'));
  const result = evaluateAdapter(baseline, candidate, { minGain: Number(args['min-gain'] ?? 0.02) });
  const record = {
    version: 1,
    adapterVersion: args['adapter-version'] || 'unversioned',
    baselineVersion: args['baseline-version'] || 'unknown',
    baseline,
    candidate,
    ...result,
    evaluatedAt: new Date().toISOString(),
  };
  if (args.out) {
    fs.mkdirSync(path.dirname(args.out), { recursive: true });
    fs.writeFileSync(args.out, `${JSON.stringify(record, null, 2)}\n`);
  }
  console.log(JSON.stringify(record));
  if (record.verdict !== 'PROMOTE') process.exitCode = 2;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = parseArgs(process.argv.slice(2));
  if (args.command === 'dataset') runDataset(args);
  else if (args.command === 'gate') runGate(args);
  else throw new Error('usage: vibe2-weight-learning.mjs dataset|gate ...');
}
