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
  // Normal final-eval-only training still skips duplicate checkpoints.
  // Only the opt-in, CPU + PRACTICE_ONLY verified recovery path saves resumable state.
  assert.match(trainer, /save_strategy="steps" if args\.cpu_practice_recovery else \("no" if args\.final_eval_only else "epoch"\)/);
  assert.match(trainer, /CPU checkpoint recovery is restricted to verified practice-only CPU training/);
  assert.match(trainer, /save_steps=16, save_total_limit=2/);
  assert.match(trainer, /eval_result = trainer\.evaluate\(\)/);
  assert.match(trainer, /supervised != len\(answer_ids\)/);
  assert.match(trainer, /answer token coverage mismatch/);
  assert.match(workflow, /'--epochs', '1\.0'/);
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

test('오픈소스 로블록스 Lua 참고자료는 독립된 연습 전용 데이터셋으로만 구축된다',()=>{
  const file='company-learning/roblox-practice.json';
  const material=JSON.parse(fs.readFileSync(file,'utf8')).licensedReferences;
  assert.equal(material.scope,'ROBLOX_CODING_ONLY');
  assert.equal(material.runtimePromotionAllowed,false);
  assert.equal(material.drills.length,25);
  assert.deepEqual(material.sources.map(row=>row.licenseSpdx),['MIT','MIT','Apache-2.0']);
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'roblox-public-licensed-'));
  try{
    const samples=path.join(root,'samples'),dataset=path.join(root,'dataset');
    const built=buildLicensedReferenceSamples({drillsFile:file,outDir:samples});
    assert.equal(built.taskType,'roblox');
    assert.equal(built.written,25);
    assert.equal(built.codePracticeWritten,14);
    const codeSamples=fs.readdirSync(samples).filter(name=>name.startsWith('roblox-code-')&&name.endsWith('.json'));
    assert.equal(codeSamples.length,14);
    const original=JSON.parse(fs.readFileSync(file,'utf8'));
    for(const name of codeSamples){
      const row=JSON.parse(fs.readFileSync(path.join(samples,name),'utf8'));
      const drill=original.drills.find(value=>row.familyId==='roblox-practice:'+value.id);
      assert.ok(drill);
      assert.equal(row.taskType,'roblox');
      assert.equal(row.sampleKind,'CODE_IMPLEMENTATION');
      assert.equal(row.sourceKind,'teacher');
      assert.equal(row.synthetic,true);
      assert.equal(row.runtimePromotionAllowed,false);
      assert.equal(row.output,drill.reference);
      assert.equal(row.verification.hiddenTestsExcluded,true);
      for(const hidden of [...drill.tests,...(drill.feedbackTests||[])]){
        assert.ok(!JSON.stringify(row).includes(JSON.stringify(hidden).slice(1,-1)));
      }
    }
    const manifest=buildPracticeDataset({inputDir:samples,outDir:dataset,minSamples:20,taskType:'roblox'});
    assert.ok(manifest.stats.codeImplementationTrain>=10);
    assert.ok(manifest.stats.codeImplementationEval>=2);
    assert.ok(manifest.stats.codeImplementationHoldout>=2);
    assert.equal(manifest.version,6);
    assert.equal(manifest.independentExternalBenchmarkVerified,false);
    assert.deepEqual(manifest.sourceKinds,['licensed-reference','teacher']);
    assert.equal(manifest.targetTaskType,'roblox');
    assert.equal(manifest.authority,'PRACTICE_ONLY');
    assert.equal(manifest.runtimePromotionAllowed,false);
    assert.equal(manifest.stats.licensedReferenceTotal,25);
    assert.ok(manifest.stats.train>=20);
    assert.ok(manifest.stats.eval>=2);
    const records=[...fs.readFileSync(path.join(dataset,'train.jsonl'),'utf8').trim().split('\n'),
      ...fs.readFileSync(path.join(dataset,'eval.jsonl'),'utf8').trim().split('\n'),
      ...fs.readFileSync(path.join(dataset,'holdout.jsonl'),'utf8').trim().split('\n')].map(JSON.parse);
    assert.equal(records.length,39);
    const train=fs.readFileSync(path.join(dataset,'train.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
    const evalRows=fs.readFileSync(path.join(dataset,'eval.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
    const holdout=fs.readFileSync(path.join(dataset,'holdout.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
    assert.equal(train.some(a=>evalRows.some(b=>a.familyId===b.familyId)),false);
    assert.equal(holdout.some(a=>train.some(b=>a.familyId===b.familyId)||evalRows.some(b=>a.familyId===b.familyId)),false);
    for(const row of records){
      assert.equal(row.taskType,'roblox');
      assert.equal(row.practiceOnly,true);
      assert.equal(row.runtimePromotionAllowed,false);
      if(row.sourceKind==='licensed-reference'){
        assert.equal(row.qa.licenseCheck,'PASS');
        assert.ok(['MIT','APACHE-2.0'].includes(row.provenance.licenseSpdx));
        assert.match(row.provenance.commit,/^[a-f0-9]{40}$/i);
        assert.ok(row.provenance.sourcePaths.length>0);
      }else{
        assert.equal(row.sourceKind,'teacher');
        assert.equal(row.synthetic,true);
        assert.equal(row.sampleKind,'CODE_IMPLEMENTATION');
        assert.equal(row.qa.runtime,'NOT_APPLICABLE');
      }
    }
    const trainer=fs.readFileSync('tools/vibe2-practice-train.py','utf8');
    assert.match(trainer,/args\.task_type not in \('unity', 'roblox'\)/);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('24시간 기존 로컬 CPU 학습기가 로블록스 공개 코드 연습을 우선 실행한다',()=>{
  const wf=fs.readFileSync('.github/workflows/vibe2-practice-cpu-fallback.yml','utf8');
  assert.match(wf,/prepare-roblox-practice:/);
  assert.match(wf,/roblox-practice-train:/);
  const robloxJob=wf.slice(wf.indexOf('  roblox-practice-train:'));
  assert.match(robloxJob,/group: vibe2-roblox-practice-local-training/);
  assert.doesNotMatch(robloxJob,/group: vibe2-unity-practice-local-training/);
  assert.match(wf,/--drills company-learning\/roblox-practice\.json/);
  assert.match(wf,/--task-type roblox/);
  assert.match(wf,/'--task-type', 'roblox'/);
  assert.equal((wf.match(/ref: \$\{\{ github\.sha \}\}/g)||[]).length,4,'each local training job must use the event source revision');
  assert.match(wf,/ROBLOX_STUDIO_RUNTIME_VERIFIED=NO/);
  assert.match(wf,/ROBLOX_MODEL_AUTO_PROMOTION=NO/);
  assert.match(wf,/PRACTICE_PROMOTION_STATE=UNVERIFIED/);
  assert.match(wf,/runs-on: \[self-hosted, Windows, X64, jaewoon-unity\]/);
  assert.equal((wf.match(/if: github\.event_name == 'workflow_dispatch'/g)||[]).length,2,
    'Unity preparation and training must be opt-in while scheduled and push compute stays Roblox-first');
  assert.match(wf,/PRACTICE_ROBLOX_CODE_TRAIN=/);
  assert.match(wf,/PRACTICE_ROBLOX_CODE_EVAL=/);
  assert.match(wf,/licensed Roblox reference samples missing from dataset/);
  assert.match(wf,/cpu-practice-train:/);
});
