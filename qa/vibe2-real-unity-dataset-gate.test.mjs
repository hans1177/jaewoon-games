// 파일명: qa/vibe2-real-unity-dataset-gate.test.mjs
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { validateRealUnityDataset } from '../tools/vibe2-real-unity-dataset-gate.mjs';

function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
}
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

function sourceRecord(revision, pr) {
  return {
    version: 3,
    instruction: `Unity 실제 수정 ${revision}`,
    input: JSON.stringify({ sourcePath: 'unity-games/real-game' }),
    output: `검증된 패치:\ndiff --git a/unity-games/real-game/A.cs b/unity-games/real-game/A.cs\n@@ ${revision}`,
    taskType: 'unity',
    lifecycle: 'active',
    sourceKind: 'vibe2',
    sourceRevision: revision,
    independentQa: 'PASS',
    browserQa: 'NOT_APPLICABLE',
    provenance: {
      sourceKind: 'vibe2',
      sourceRevision: revision,
      verificationTrace: {
        state: 'PASS',
        sourceRevision: revision,
        commitSha: `commit-${revision}`,
        pullRequest: pr,
        ci: 'PASS',
        independentQa: 'PASS',
        runtime: 'PASS',
        stale: false,
        flaky: false,
      },
    },
    verification: {
      independentQa: 'PASS',
      browserQa: 'NOT_APPLICABLE',
      runtime: 'PASS',
      androidRuntimeRequired: true,
      trace: {
        state: 'PASS',
        sourceRevision: revision,
        commitSha: `commit-${revision}`,
        pullRequest: pr,
        ci: 'PASS',
        independentQa: 'PASS',
        runtime: 'PASS',
        stale: false,
        flaky: false,
      },
    },
  };
}

function normalizedRow(sourceFile, revision, sampleId) {
  return {
    instruction: `실제 Unity 작업 ${revision}`,
    input: '',
    output: `실제 패치 ${revision}`,
    taskType: 'unity',
    lifecycle: 'active',
    synthetic: false,
    qualityScore: 1,
    sampleId,
    provenance: {
      sourceFile,
      sourceIndex: 0,
      sourceKind: 'vibe2',
      sourceRevision: revision,
    },
    qa: {
      independentQa: 'PASS',
      browserQa: 'NOT_APPLICABLE',
      runtime: 'PASS',
      requirements: {
        independentQa: 'PASS',
        browserQa: 'NOT_APPLICABLE',
        runtime: 'PASS',
        androidRuntimeRequired: true,
      },
    },
  };
}

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe2-real-unity-'));
  const samplesRoot = path.join(root, 'company-learning', 'training-samples');
  fs.mkdirSync(samplesRoot, { recursive: true });
  const make = (name, revision, pr) => {
    const file = path.join(samplesRoot, `${name}.json`);
    fs.writeFileSync(file, `${JSON.stringify(sourceRecord(revision, pr), null, 2)}\n`);
    return normalizedRow(file, revision, `sample-${revision}`);
  };
  const train = [make('train', 'rev-train', 101)];
  const evalRows = [make('eval', 'rev-eval', 102)];
  const holdout = [make('holdout', 'rev-holdout', 103)];
  const manifest = {
    version: 3,
    targetTaskType: 'unity',
    readyForTraining: true,
    stats: { syntheticTrain: 0 },
    contamination: { pass: true, contaminationRate: 0 },
    trainSha256: sha256(train.map(stableStringify).join('\n')),
    evalSha256: sha256(evalRows.map(stableStringify).join('\n')),
    holdoutSha256: sha256(holdout.map(stableStringify).join('\n')),
  };
  return { root, samplesRoot, train, evalRows, holdout, manifest };
}

test('실제 CI+독립QA+Android runtime 검증 Unity 샘플만 train/eval/holdout을 통과한다', () => {
  const data = fixture();
  try {
    const result = validateRealUnityDataset(data);
    assert.equal(result.state, 'REAL_VERIFIED_UNITY_DATASET_PASS');
    assert.equal(result.syntheticAllowed, false);
    assert.equal(result.holdout, 1);
  } finally {
    fs.rmSync(data.root, { recursive: true, force: true });
  }
});

test('teacher/synthetic 샘플이 Unity production dataset에 섞이면 차단한다', () => {
  const data = fixture();
  try {
    data.holdout[0].synthetic = true;
    assert.throws(() => validateRealUnityDataset(data), /non-synthetic/);
  } finally {
    fs.rmSync(data.root, { recursive: true, force: true });
  }
});

test('같은 실제 수정 revision이 train과 holdout에 동시에 들어가면 leakage로 차단한다', () => {
  const data = fixture();
  try {
    const trainSource = JSON.parse(fs.readFileSync(data.train[0].provenance.sourceFile, 'utf8'));
    fs.writeFileSync(data.holdout[0].provenance.sourceFile, `${JSON.stringify(trainSource, null, 2)}\n`);
    data.holdout[0].provenance.sourceRevision = 'rev-train';
    data.holdout[0].sampleId = 'holdout-other-id';
    data.manifest.holdoutSha256 = sha256(data.holdout.map(stableStringify).join('\n'));
    assert.throws(() => validateRealUnityDataset(data), /source revision leakage/);
  } finally {
    fs.rmSync(data.root, { recursive: true, force: true });
  }
});
