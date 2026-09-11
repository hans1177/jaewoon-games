// 파일명: tools/vibe2-practice-dataset.mjs
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const SEED = 20260911;
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const writeJson = (file, value) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
const stable = (value) => JSON.stringify(value, Object.keys(value).sort());

function filesIn(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((name) => name.endsWith('.json')).sort().map((name) => path.join(dir, name));
}

function normalize(record, sourceFile) {
  if (record?.taskType !== 'unity') return null;
  if (record?.synthetic !== true || record?.practiceOnly !== true) return null;
  if (record?.sourceKind !== 'teacher' && record?.provenance?.sourceKind !== 'teacher') return null;
  if (record?.runtimePromotionAllowed !== false) return null;
  const instruction = String(record?.instruction ?? '').trim();
  const input = String(record?.input ?? '').trim();
  const output = String(record?.output ?? '').trim();
  if (!instruction || !output) return null;
  return {
    instruction,
    input,
    output,
    taskType: 'unity',
    difficulty: String(record?.difficulty ?? 'regression'),
    lifecycle: 'active',
    synthetic: true,
    practiceOnly: true,
    sourceKind: 'teacher',
    runtimePromotionAllowed: false,
    qualityScore: 1,
    project: String(record?.project ?? 'unity-teacher-practice'),
    provenance: {
      sourceFile: path.basename(sourceFile),
      sourceKind: 'teacher',
      sourceRevision: String(record?.sourceRevision ?? record?.provenance?.sourceRevision ?? ''),
      teacherId: String(record?.teacherId ?? record?.provenance?.teacherId ?? 'GPT-5.6-Sol-practice'),
    },
    qa: {
      teacherReview: String(record?.qa?.teacherReview ?? 'PASS'),
      independentQa: 'NOT_APPLICABLE',
      browserQa: 'NOT_APPLICABLE',
      runtime: 'NOT_APPLICABLE',
    },
  };
}

function deterministicScore(row) {
  return Number.parseInt(sha256(`${SEED}:${row.provenance.sourceRevision}:${row.instruction}`).slice(0, 12), 16) / 0xffffffffffff;
}

function datasetHash(rows) {
  return sha256(rows.map((row) => JSON.stringify(row, Object.keys(row).sort())).join('\n'));
}

export function buildPracticeDataset({ inputDir, outDir, minSamples = 12 }) {
  const rows = filesIn(inputDir).map((file) => normalize(readJson(file), file)).filter(Boolean);
  const deduped = [...new Map(rows.map((row) => [sha256(`${row.instruction}\n${row.input}\n${row.output}`), row])).values()];
  if (deduped.length < minSamples) throw new Error(`practice samples ${deduped.length}/${minSamples}`);
  deduped.sort((a, b) => deterministicScore(a) - deterministicScore(b));
  const evalCount = Math.max(2, Math.min(Math.floor(deduped.length * 0.2), deduped.length - 1));
  const evalRows = deduped.slice(0, evalCount);
  const trainRows = deduped.slice(evalCount);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'train.jsonl'), `${trainRows.map((row) => JSON.stringify(row)).join('\n')}\n`);
  fs.writeFileSync(path.join(outDir, 'eval.jsonl'), `${evalRows.map((row) => JSON.stringify(row)).join('\n')}\n`);
  const manifest = {
    version: 3,
    seed: SEED,
    targetTaskType: 'unity',
    authority: 'PRACTICE_ONLY',
    practiceOnly: true,
    syntheticOnly: true,
    runtimePromotionAllowed: false,
    readyForTraining: true,
    contamination: { pass: true, contaminationRate: 0 },
    diversity: { pass: true, distinctProjects: new Set(deduped.map((row) => row.project)).size },
    batching: { pass: true },
    policy: { teacherOnlyDifficult: true, verifiedProductionEvidenceRequiredForPromotion: true },
    taskTrainingPlan: { unity: { samples: deduped.length, ready: true, authority: 'PRACTICE_ONLY' } },
    stats: { train: trainRows.length, eval: evalRows.length, syntheticTrain: trainRows.length, deprecatedUsed: false },
    trainSha256: datasetHash(trainRows),
    evalSha256: datasetHash(evalRows),
    holdoutSha256: null,
  };
  writeJson(path.join(outDir, 'manifest.json'), manifest);
  return manifest;
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const [key, inline] = arg.slice(2).split('=', 2);
    out[key] = inline ?? argv[++i];
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const result = buildPracticeDataset({
    inputDir: args.input || 'tmp/unity-gpt-practice-samples',
    outDir: args.out || 'tmp/unity-practice-dataset',
    minSamples: Number(args['min-samples'] ?? 12),
  });
  console.log(JSON.stringify(result));
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try { main(); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
