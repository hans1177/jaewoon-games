// 파일명: qa/vibe2-practice-weight-learning.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { buildPracticeDataset } from '../tools/vibe2-practice-dataset.mjs';
import { buildPracticeTeacherSamples } from '../tools/vibe2-online-unity-teacher.mjs';

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

test('canonical structural workflow falls back to CPU LoRA instead of failing when CUDA is unavailable', () => {
  const workflow = fs.readFileSync('.github/workflows/vibe2-structural-repair-distillation.yml', 'utf8');
  assert.match(workflow, /PRACTICE_CPU_FALLBACK=YES/);
  assert.match(workflow, /VERIFIED_TRAINING_CPU_FALLBACK=YES/);
  assert.match(workflow, /PRACTICE_TRAINING_DEVICE=\$device/);
  assert.match(workflow, /TRAINING_DEVICE=\$device/);
  assert.match(workflow, /--final-eval-only/);
  assert.doesNotMatch(workflow, /throw 'nvidia-smi not found on self-hosted Unity runner'/);
  assert.doesNotMatch(workflow, /CUDA GPU is required for practice adapter training/);
  assert.doesNotMatch(workflow, /CUDA GPU is required for adapter training/);
});

test('real implementation targets join the existing practice dataset without hidden acceptance tests',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'vibe-code-teacher-'));
  try{
    const samples=path.join(root,'samples');
    const result=buildPracticeTeacherSamples({drillsFile:'company-learning/unity-teacher-materials/gpt-practice-drills.json',outDir:samples});
    assert(result.implementationWritten>=5);
    const manifest=buildPracticeDataset({inputDir:samples,outDir:path.join(root,'dataset')});
    assert(manifest.stats.codeImplementationTrain>0);
    const curriculum=JSON.parse(fs.readFileSync('company-learning/roblox-practice.json','utf8'));
    for(const name of fs.readdirSync(samples).filter(x=>x.startsWith('gpt-u-code-'))){
      const sample=JSON.parse(fs.readFileSync(path.join(samples,name),'utf8'));
      const drill=curriculum.platformDrills.find(x=>x.id===sample.familyId);
      assert.equal(sample.output,drill.reference);
      assert.equal(sample.runtimePromotionAllowed,false);
      for(const check of drill.tests)assert(!JSON.stringify(sample).includes(JSON.stringify(check).slice(1,-1)));
    }
    const train=fs.readFileSync(path.join(root,'dataset/train.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
    const evaluation=fs.readFileSync(path.join(root,'dataset/eval.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
    assert(!train.some(a=>evaluation.some(b=>a.familyId===b.familyId)));
    const python=process.platform==='win32'?'python':'python3';
    execFileSync(python,['-c',"import importlib.util,json,types; s=importlib.util.spec_from_file_location('practice','tools/vibe2-practice-train.py'); m=importlib.util.module_from_spec(s);s.loader.exec_module(m); root=__import__('sys').argv[1]; rows=lambda name:[json.loads(x) for x in open(root+'/'+name+'.jsonl',encoding='utf-8')]; m.practice_validate(types.SimpleNamespace(task_type='unity'),json.load(open(root+'/manifest.json')),rows('train'),rows('eval'))",path.join(root,'dataset')]);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('answer supervision keeps complete code targets at the CPU token budget',()=>{
  execFileSync(process.platform==='win32'?'python':'python3',['qa/vibe2-train-encoding.test.py'],{stdio:'pipe'});
});
