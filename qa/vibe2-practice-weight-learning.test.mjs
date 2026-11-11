// 파일명: qa/vibe2-practice-weight-learning.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { buildPracticeDataset } from '../tools/vibe2-practice-dataset.mjs';
import { buildPracticeTeacherSamples } from '../tools/vibe2-online-unity-teacher.mjs';
import { buildLicensedReferenceSamples } from '../tools/vibe2-licensed-reference-samples.mjs';

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

test('Roblox practice includes original implementation in train and eval; stale reference-only artifacts fail closed', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe2-roblox-practice-'));
  try {
    const samples = path.join(root, 'samples');
    const data = path.join(root, 'data');
    const result = buildLicensedReferenceSamples({
      drillsFile: 'company-learning/roblox-practice.json', outDir: samples, max: 96,
    });
    assert.equal(result.written, 25);
    assert.equal(result.codePracticeWritten, 14);
    const manifest = buildPracticeDataset({ inputDir: samples, outDir: data, minSamples: 20, taskType: 'roblox' });
    assert.equal(manifest.practiceOnly, true);
    assert.equal(manifest.runtimePromotionAllowed, false);
    assert.equal(manifest.stats.licensedReferenceTotal, 25);
    assert.ok(manifest.stats.codeImplementationTrain > 0);
    assert.ok(manifest.stats.codeImplementationEval > 0);
    assert.deepEqual(manifest.sourceKinds, ['licensed-reference', 'teacher']);
    const validate = "import importlib.util,json,sys,types; p='tools/vibe2-practice-train.py'; s=importlib.util.spec_from_file_location('practice',p); m=importlib.util.module_from_spec(s); s.loader.exec_module(m); d=sys.argv[1]; rows=lambda n:[json.loads(x) for x in open(d+'/'+n+'.jsonl',encoding='utf-8')]; m.practice_validate(types.SimpleNamespace(task_type='roblox'),json.load(open(d+'/manifest.json')),rows('train'),rows('eval'))";
    const python = process.platform === 'win32' ? 'python' : 'python3';
    execFileSync(python, ['-c', validate, data]);
    const staleSamples = path.join(root, 'stale-samples');
    fs.mkdirSync(staleSamples);
    for (const file of fs.readdirSync(samples).filter(name => name.startsWith('roblox-ref-'))) {
      fs.copyFileSync(path.join(samples, file), path.join(staleSamples, file));
    }
    const staleData = path.join(root, 'stale-data');
    const stale = buildPracticeDataset({ inputDir: staleSamples, outDir: staleData, minSamples: 20, taskType: 'roblox' });
    assert.equal(stale.stats.codeImplementationTrain, 0);
    assert.equal(stale.stats.codeImplementationEval, 0);
    assert.throws(() => execFileSync(python, ['-c', validate, staleData], {stdio: 'pipe'}));
  } finally {
    fs.rmSync(root, {recursive: true, force: true});
  }
});

test('Roblox practice compares frozen baseline and adapter on the same eval without claiming holdout or native pass', () => {
  const trainer = fs.readFileSync('tools/vibe2-train.py', 'utf8');
  const workflow = fs.readFileSync('.github/workflows/vibe2-practice-cpu-fallback.yml', 'utf8');
  assert.match(trainer, /args\.task_type == "roblox" and manifest\.get\("authority"\) == "PRACTICE_ONLY"/);
  assert.match(trainer, /with model\.disable_adapter\(\):\s+baseline_evaluation = trainer\.evaluate\(\)/);
  assert.match(trainer, /"evalSha256": manifest\.get\("evalSha256"\)/);
  assert.match(trainer, /"lossReduction": baseline_loss - adapted_loss/);
  assert.match(trainer, /"fixedHoldoutABVerified": False/);
  assert.match(trainer, /"robloxNativeRuntimeVerified": False/);
  assert.match(workflow, /Roblox baseline comparison missing or incorrectly claims promotion authority/);
  assert.match(workflow, /PRACTICE_BASELINE_EVAL_LOSS=/);
  assert.match(workflow, /PRACTICE_ADAPTED_EVAL_LOSS=/);
  assert.match(workflow, /PRACTICE_FIXED_HOLDOUT_AB_VERIFIED=NO/);
  assert.match(workflow, /PRACTICE_NATIVE_RUNTIME_VERIFIED=NO/);
  assert.match(workflow, /PRACTICE_EVAL_PASSES=4/);
  assert.match(trainer, /code_eval_rows = \[row for row in eval_rows if row.get\("sampleKind"\) == "CODE_IMPLEMENTATION"\]/);
  assert.match(trainer, /code_adapted_evaluation = trainer.evaluate\(eval_dataset=code_eval_dataset\)/);
  assert.match(trainer, /code_baseline_evaluation = trainer.evaluate\(eval_dataset=code_eval_dataset\)/);
  assert.match(trainer, /"sampleCount": len\(code_eval_rows\)/);
  assert.match(trainer, /"independentHoldoutVerified": False/);
  assert.match(trainer, /"generalizationVerified": False/);
  assert.match(workflow, /Roblox code-only evaluation or non-promotion scope missing/);
  assert.match(workflow, /PRACTICE_CODE_BASELINE_EVAL_LOSS=/);
  assert.match(workflow, /PRACTICE_CODE_ADAPTED_EVAL_LOSS=/);
  assert.match(workflow, /PRACTICE_CODE_INDEPENDENT_HOLDOUT_VERIFIED=NO/);
});

test('automatic Roblox practice coalesces pending pushes and uses permitted small CPU model without changing canonical base', () => {
  const workflow = fs.readFileSync('.github/workflows/vibe2-practice-cpu-fallback.yml', 'utf8');
  const trainer = fs.readFileSync('tools/vibe2-train.py', 'utf8');
  assert.ok(workflow.includes('group: vibe2-unity-practice-cpu-'));
  assert.ok(workflow.includes("github.event_name == 'workflow_dispatch' && github.run_id || 'scheduled-and-push'"));
  assert.ok(workflow.includes('queue: single'));
  assert.ok(workflow.includes('cancel-in-progress: false'));
  const roblox = workflow.split('  roblox-practice-train:')[1];
  const unity = workflow.split('  cpu-practice-train:')[1].split('  roblox-practice-train:')[0];
  assert.ok(roblox);
  assert.ok(roblox.includes('group: vibe2-roblox-practice-local-training'));
  assert.ok(roblox.includes('queue: single'));
  assert.ok(roblox.includes("'--base-model', 'Qwen/Qwen3-0.6B'"));
  assert.ok(roblox.includes('Roblox CPU practice trained an unexpected base model'));
  assert.ok(roblox.includes('SMALL_CPU_PRACTICE_NOT_CANONICAL_1P7B'));
  assert.ok(roblox.includes('PRACTICE_FIXED_HOLDOUT_AB_VERIFIED=NO'));
  assert.ok(!unity.includes("'--base-model', 'Qwen/Qwen3-0.6B'"));
  assert.ok(trainer.includes('parser.add_argument("--base-model", default="Qwen/Qwen3-1.7B")'));
  assert.ok(workflow.includes('unity_practice:'));
  assert.ok(workflow.includes('default: false'));
  assert.ok(workflow.includes("if: github.event_name == 'workflow_dispatch' && inputs.unity_practice == true"));
  assert.ok(workflow.includes('needs: [prepare-practice, roblox-practice-train]'));
  assert.ok(workflow.includes('LEARNING_FOCUS: ROBLOX_CODING_ONLY'));
  assert.ok(unity.includes('LEARNING_FOCUS: UNITY_CODING_ONLY'));
});

test('practice trainer and workflow keep learned adapter unverified and require actual training execution', () => {
  const trainer = fs.readFileSync('tools/vibe2-practice-train.py', 'utf8');
  assert.match(trainer, /PRACTICE_ONLY/);
  assert.match(trainer, /runtimePromotionAllowed.*False/);
  assert.match(trainer, /metadata\['requiredNextGate'\] = 'VERIFIED_' \+ str\(dataset_manifest\['targetTaskType'\]\)\.upper\(\) \+ '_HOLDOUT_AB_AND_CANARY'/);
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
    assert(manifest.stats.codeImplementationEval>0);
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

test('hourly Windows CPU practice coalesces duplicate queue wakes and resumes only complete exact-input checkpoints',()=>{
  const workflow=fs.readFileSync('.github/workflows/vibe2-practice-cpu-fallback.yml','utf8');
  const trainer=fs.readFileSync('tools/vibe2-train.py','utf8');
  assert.match(workflow,/group: vibe2-unity-practice-cpu-.*workflow_dispatch.*scheduled-and-push/);
  assert.match(workflow,/queue: single/);
  assert.match(workflow,/cancel-in-progress: false/);
  assert.match(workflow,/runs-on: \[self-hosted, Windows, X64, jaewoon-unity\]/);
  assert.match(workflow,/--cpu-practice-recovery/);
  assert.match(workflow,/--resume-checkpoint/);
  assert.match(workflow,/WINDOWS_CPU_PRACTICE_RESUME=VERIFIED_CHECKPOINT/);
  assert.match(workflow,/CPU practice LoRA training failed without verified checkpoint/);
  assert.match(trainer,/CPU checkpoint recovery is restricted to verified practice-only CPU training/);
  assert.match(trainer,/save_strategy="steps" if args.cpu_practice_recovery/);
  assert.match(trainer,/save_steps=16, save_total_limit=2/);
  assert.match(trainer,/validated_cpu_practice_checkpoint\(output, identity, args.resume_checkpoint\)/);
  assert.match(trainer,/trainer.train\(resume_from_checkpoint=resume_path\)/);
});


test('Windows PC executor provides exactly three independent read-only Web Roblox and asset checks',()=>{
  const wf=fs.readFileSync('.github/workflows/unity-local-runner-heartbeat.yml','utf8');
  assert.match(wf,/runs-on: \[self-hosted, Windows, X64, jaewoon-unity\]/);
  assert.match(wf,/permissions:\s+contents: read/);
  assert.match(wf,/persist-credentials: false/);
  assert.match(wf,/ref: \$\{\{ github\.sha \}\}/);
  assert.match(wf,/PC WEB source and owner-scope regression/);
  assert.match(wf,/PC ROBLOX source and game-readiness regression/);
  assert.match(wf,/PC common asset quality regression/);
  assert.match(wf,/node --test qa\/web-vibe-worker\.test\.mjs qa\/vibe2-web-experience-ingest\.test\.mjs/);
  assert.match(wf,/node --test qa\/company-development-roblox-gameplay-product-readiness\.test\.mjs/);
  assert.match(wf,/node --test qa\/common-asset-quality-cleanup\.test\.mjs/);
  assert.match(wf,/steps\.pc_web\.outcome/);
  assert.match(wf,/steps\.pc_roblox\.outcome/);
  assert.match(wf,/steps\.pc_assets\.outcome/);
  assert.match(wf,/PC_RUNNER_THREE_LANES_NOT_ALL_VERIFIED/);
  // The Windows self-hosted runner uses Restricted script policy. Every
  // PowerShell stage must use the proven process-scoped runner invocation.
  const pcBlocks=wf.split(/(?=      - name: PC (?:WEB source|ROBLOX source|common asset)|      - name: Preserve three independently)/).slice(1);
  assert.equal(pcBlocks.length,4);
  for(const block of pcBlocks){
    assert.match(block,/shell: powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -Command "\. '\{0\}'"/);
    assert.doesNotMatch(block,/shell: powershell\s*\n/);
  }
  assert.match(wf,/PC_RUNNER_SCOPE=SUPPLEMENTAL_READ_ONLY_NOT_F0_F9/);
  assert.match(wf,/cancel-in-progress: false/);
  assert.doesNotMatch(wf,/schedule:|cron:|continue-on-error: true/);
  const qaSteps=wf.match(/- name: PC (?:WEB source and owner-scope|ROBLOX source and game-readiness|common asset quality) regression/g)||[];
  assert.equal(qaSteps.length,3);
});
