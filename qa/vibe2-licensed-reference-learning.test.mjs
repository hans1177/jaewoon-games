// 파일명: qa/vibe2-licensed-reference-learning.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildPracticeTeacherSamples } from '../tools/vibe2-online-unity-teacher.mjs';
import { buildLicensedReferenceSamples, loadLicensedReferenceDrills } from '../tools/vibe2-licensed-reference-samples.mjs';
import { buildPracticeDataset } from '../tools/vibe2-practice-dataset.mjs';

const teacherFile = 'company-learning/unity-teacher-materials/gpt-practice-drills.json';
const licensedFile = 'company-learning/unity-teacher-materials/licensed-reference-drills.json';
const licensedDrillCount = JSON.parse(fs.readFileSync(licensedFile, 'utf8')).drills.length;

test('licensed Unity reference pack is pinned and practice-only', () => {
  const drills = loadLicensedReferenceDrills(licensedFile);
  assert.equal(drills.length, licensedDrillCount);
  for (const { source } of drills) {
    assert.match(source.commit, /^[0-9a-f]{40}$/i);
    assert.equal(source.licenseSpdx, 'MIT');
    assert.ok(source.repository.includes('/'));
    assert.ok(source.sourcePaths.every((p) => p.endsWith('.cs')));
  }
});

test('teacher and licensed references become a mixed non-promotable Unity dataset', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe2-licensed-'));
  const samples = path.join(root, 'samples');
  const dataset = path.join(root, 'dataset');
  buildPracticeTeacherSamples({ drillsFile: teacherFile, outDir: samples, maxPractice: 96 });
  const licensed = buildLicensedReferenceSamples({ drillsFile: licensedFile, outDir: samples, max: 96 });
  assert.equal(licensed.written, licensedDrillCount);

  const rawRefs = fs.readdirSync(samples)
    .filter((name) => name.startsWith('licensed-u-') && name.endsWith('.json'))
    .map((name) => JSON.parse(fs.readFileSync(path.join(samples, name), 'utf8')));
  assert.equal(rawRefs.length, licensedDrillCount);
  for (const row of rawRefs) {
    assert.equal(row.verification.modelPromptProvenanceExcluded, true);
    assert.match(row.provenance.commit, /^[0-9a-f]{40}$/i);
    assert.ok(row.provenance.sourcePaths.length > 0);
  }

  const manifest = buildPracticeDataset({ inputDir: samples, outDir: dataset, minSamples: 20 });
  assert.equal(manifest.authority, 'PRACTICE_ONLY');
  assert.equal(manifest.runtimePromotionAllowed, false);
  assert.equal(manifest.containsLicensedReference, true);
  assert.equal(manifest.syntheticOnly, false);
  assert.equal(manifest.stats.licensedReferenceTotal, licensedDrillCount);
  assert.ok(manifest.sourceKinds.includes('teacher'));
  assert.ok(manifest.sourceKinds.includes('licensed-reference'));
  const rows = [
    ...fs.readFileSync(path.join(dataset, 'train.jsonl'), 'utf8').trim().split('\n'),
    ...fs.readFileSync(path.join(dataset, 'eval.jsonl'), 'utf8').trim().split('\n'),
  ].map(JSON.parse);
  const refs = rows.filter((row) => row.sourceKind === 'licensed-reference');
  assert.equal(refs.length, licensedDrillCount);
  for (const row of refs) {
    assert.equal(row.synthetic, false);
    assert.equal(row.practiceOnly, true);
    assert.equal(row.runtimePromotionAllowed, false);
    assert.equal(row.qa.licenseCheck, 'PASS');
    assert.match(row.provenance.commit, /^[0-9a-f]{40}$/i);

    const modelInput = JSON.parse(row.input);
    assert.equal(modelInput.sourceCommit, undefined);
    assert.equal(modelInput.sourceRepository, undefined);
    assert.equal(modelInput.sourcePaths, undefined);
    assert.equal(modelInput.sourceLicense, undefined);
    assert.ok(row.input.length < 900, `licensed model input unexpectedly large: ${row.input.length}`);
    assert.ok(row.output.length > 40, 'licensed sample must retain a substantive answer');
  }
});

test('CPU practice speedup removes duplicate eval without reducing train or eval data', () => {
  const trainer = fs.readFileSync('tools/vibe2-train.py', 'utf8');
  const workflow = fs.readFileSync('.github/workflows/vibe2-practice-cpu-fallback.yml', 'utf8');

  assert.match(trainer, /--final-eval-only/);
  assert.match(trainer, /eval_strategy="no" if args\.final_eval_only else "epoch"/);
  assert.match(trainer, /save_strategy="no" if args\.final_eval_only else "epoch"/);
  assert.match(trainer, /eval_result = trainer\.evaluate\(\)/);
  assert.match(trainer, /supervised_tokens == 0/);
  assert.match(workflow, /'--epochs', '0\.25'/);
  assert.match(workflow, /'--max-length', '256'/);
  assert.match(workflow, /'--final-eval-only'/);
  assert.match(workflow, /PRACTICE_EVAL_PASSES=1/);
});

test('CPU practice skips activation recompute without changing production default', () => {
  const trainer = fs.readFileSync('tools/vibe2-train.py', 'utf8');

  assert.match(trainer, /cpu_practice_no_recompute = \(/);
  assert.match(trainer, /manifest\.get\("authority"\) == "PRACTICE_ONLY"/);
  assert.match(trainer, /manifest\.get\("practiceOnly"\) is True/);
  assert.match(trainer, /if not cpu_practice_no_recompute:\n        model\.gradient_checkpointing_enable\(\)/);
  assert.match(trainer, /"gradientCheckpointing": not cpu_practice_no_recompute/);
  assert.match(trainer, /r=16/);
  assert.match(trainer, /lora_alpha=32/);
  assert.match(trainer, /lora_dropout=0\.05/);
  assert.match(trainer, /num_train_epochs=args\.epochs/);
  assert.match(trainer, /learning_rate=args\.learning_rate/);
});
