// 파일명: tools/vibe2-licensed-reference-samples.mjs
// 역할: 라이선스가 명확한 외부 Unity 코드 근거를 PRACTICE_ONLY 구현판단 샘플로 변환한다.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const clean = (value) => String(value ?? '').trim();
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const writeJson = (file, value) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`); };
const COMMIT_RE = /^[0-9a-f]{40}$/i;

export function loadLicensedReferenceDrills(file) {
  const doc = readJson(file);
  if (doc.scope !== 'UNITY_CODING_ONLY' || doc.sourceKind !== 'licensed-reference' || doc.synthetic !== false || doc.authority !== 'PRACTICE_ONLY' || doc.runtimePromotionAllowed !== false) {
    throw new Error('licensed Unity reference contract mismatch');
  }
  const sourceMap = new Map();
  for (const source of doc.sources ?? []) {
    const repository = clean(source?.repository);
    const commit = clean(source?.commit);
    const licenseSpdx = clean(source?.licenseSpdx).toUpperCase();
    const sourcePaths = Array.isArray(source?.sourcePaths) ? source.sourcePaths.map(clean).filter(Boolean) : [];
    if (!source?.id || !repository.includes('/') || !COMMIT_RE.test(commit) || !['MIT','APACHE-2.0','BSD-2-CLAUSE','BSD-3-CLAUSE'].includes(licenseSpdx) || !sourcePaths.length) {
      throw new Error(`invalid licensed source: ${clean(source?.id) || 'UNKNOWN'}`);
    }
    sourceMap.set(source.id, { ...source, repository, commit, licenseSpdx, sourcePaths });
  }
  if (!sourceMap.size) throw new Error('licensed Unity reference sources missing');
  const seen = new Set();
  const drills = [];
  for (const drill of doc.drills ?? []) {
    if (!drill?.id || seen.has(drill.id) || !drill?.scenario || !drill?.answer) continue;
    const source = sourceMap.get(drill.sourceId);
    if (!source) throw new Error(`licensed source not found for drill ${drill.id}`);
    seen.add(drill.id);
    drills.push({ drill, source });
  }
  return drills;
}

export function buildLicensedReferenceSamples({ drillsFile, outDir, max = 96 }) {
  const rows = loadLicensedReferenceDrills(drillsFile).slice(0, Math.max(0, max));
  fs.mkdirSync(outDir, { recursive: true });
  let written = 0;
  for (const { drill, source } of rows) {
    const sourceRevision = `${source.repository}@${source.commit}`;
    const sample = {
      version: 1,
      instruction: `Unity 실제 코드 근거 구현판단 연습: ${clean(drill.scenario)}`,
      input: JSON.stringify({
        topic: clean(drill.topic),
        evidenceSymbol: clean(drill.evidenceSymbol),
        sourceRepository: source.repository,
        sourceCommit: source.commit,
        sourceLicense: source.licenseSpdx,
        sourcePaths: source.sourcePaths,
        avoid: drill.avoid ?? [],
        verify: drill.verify ?? [],
      }, null, 2),
      output: [
        clean(drill.answer),
        Array.isArray(drill.avoid) && drill.avoid.length ? `피해야 할 접근: ${drill.avoid.join(' / ')}` : '',
        Array.isArray(drill.verify) && drill.verify.length ? `검증 포인트: ${drill.verify.join(' / ')}` : '',
      ].filter(Boolean).join('\n'),
      taskType: 'unity',
      difficulty: clean(drill.difficulty) || 'unity-build',
      lifecycle: 'active',
      teacher: true,
      synthetic: false,
      practiceOnly: true,
      sourceKind: 'licensed-reference',
      runtimePromotionAllowed: false,
      project: `licensed:${source.repository}`,
      teacherId: 'GPT-5.6-Sol-licensed-distillation-v1',
      sourceRevision,
      provenance: {
        sourceKind: 'licensed-reference',
        sourceRevision,
        repository: source.repository,
        commit: source.commit,
        licenseSpdx: source.licenseSpdx,
        sourcePaths: source.sourcePaths,
        evidenceSymbol: clean(drill.evidenceSymbol),
        drillId: clean(drill.id),
        teacherId: 'GPT-5.6-Sol-licensed-distillation-v1',
      },
      qa: {
        teacherReview: 'PASS',
        licenseCheck: 'PASS',
        independentQa: 'NOT_APPLICABLE',
        browserQa: 'NOT_APPLICABLE',
        runtime: 'NOT_APPLICABLE',
      },
      verification: {
        practiceOnly: true,
        productionEvidence: false,
        sourceBacked: true,
        note: 'Licensed external source distilled into implementation judgment. Never count as internal verified production evidence.',
      },
    };
    const file = `${clean(drill.id).replace(/[^A-Za-z0-9._-]/g, '_')}.json`;
    writeJson(path.join(outDir, file), sample);
    written += 1;
  }
  return { sourceKind: 'licensed-reference', candidateCount: rows.length, written };
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
  const result = buildLicensedReferenceSamples({
    drillsFile: args.drills || 'company-learning/unity-teacher-materials/licensed-reference-drills.json',
    outDir: args.out || 'tmp/unity-licensed-reference-samples',
    max: Number(args.max ?? 96),
  });
  console.log(JSON.stringify(result));
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try { main(); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
