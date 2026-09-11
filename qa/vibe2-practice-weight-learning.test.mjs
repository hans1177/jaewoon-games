// 파일명: qa/vibe2-practice-weight-learning.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildPracticeDataset } from '../tools/vibe2-practice-dataset.mjs';

test('teacher practice samples become a real train/eval dataset without pretending to be verified evidence', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe2-practice-'));
  const input = path.join(root, 'samples');
  const out = path.join(root, 'dataset');
  fs.mkdirSync(input, { recursive: true });
  for (let i = 0; i < 12; i += 1) {
    fs.writeFileSync(path.join(input, `p-${i}.json`), JSON.stringify({
      instruction: `Unity 판단 ${i}`,
      input: '상황',
      output: `정답 원리 ${i}`,
      taskType: 'unity',
      difficulty: 'regression',
      lifecycle: 'active',
      teacher: true,
      synthetic: true,
      practiceOnly: true,
      sourceKind: 'teacher',
      runtimePromotionAllowed: false,
      project: 'unity-teacher-practice',
      sourceRevision: `practice:${i}`,
      qa: { teacherReview: 'PASS' },
    }));
  }
  const manifest = buildPracticeDataset({ inputDir: input, outDir: out, minSamples: 12 });
  assert.equal(manifest.authority, 'PRACTICE_ONLY');
  assert.equal(manifest.syntheticOnly, true);
  assert.equal(manifest.runtimePromotionAllowed, false);
  assert.equal(manifest.readyForTraining, true);
  assert.ok(manifest.stats.train > 0);
  assert.ok(manifest.stats.eval > 0);
  const train = fs.readFileSync(path.join(out, 'train.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
  assert.ok(train.every((row) => row.synthetic && row.practiceOnly && row.runtimePromotionAllowed === false));
});

test('practice trainer and workflow keep learned adapter unverified and require actual training execution', () => {
  const trainer = fs.readFileSync('tools/vibe2-practice-train.py', 'utf8');
  assert.match(trainer, /PRACTICE_ONLY/);
  assert.match(trainer, /runtimePromotionAllowed.*False/);
  assert.match(trainer, /VERIFIED_UNITY_HOLDOUT_AB_AND_CANARY/);
  const workflow = fs.readFileSync('.github/workflows/vibe2-structural-repair-distillation.yml', 'utf8');
  assert.match(workflow, /unity-practice-train:/);
  assert.match(workflow, /needs\.online-teacher\.outputs\.practice_count != '0'/);
  assert.match(workflow, /vibe2-practice-dataset\.mjs/);
  assert.match(workflow, /vibe2-practice-train\.py/);
  assert.match(workflow, /PRACTICE_WEIGHT_LEARNING=PASS/);
});
