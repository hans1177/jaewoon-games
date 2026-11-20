// 파일명: qa/vibe2-training-request.test.mjs
import test from 'node:test';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
import { buildTrainingRequest } from '../tools/vibe2-training-request.mjs';

function status(overrides = {}) {
  return {
    policy: {
      minTrainSamples: 24,
      minFreshTrainSamples: 12,
      minDistinctProjects: 2,
      maxProjectShare: 0.75,
      syntheticRatioCap: 0.5,
    },
    readyTasks: [],
    state: 'WAITING_FOR_VERIFIED_SAMPLES',
    sourceFiles: ['a.json', 'b.json'],
    tasks: {
      coding: {
        ready: false,
        accepted: 8,
        train: 6,
        eval: 1,
        holdout: 1,
        distinctProjects: 1,
        batchingPass: false,
        diversityPass: false,
        contaminationPass: true,
        taskPlanReady: false,
      },
    },
    ...overrides,
  };
}

test('학습 준비 전에는 로컬 학습 요청을 만들지 않는다', () => {
  const request = buildTrainingRequest(status());
  assert.equal(request.state, 'WAITING_FOR_VERIFIED_SAMPLES');
  assert.equal(request.requests.length, 0);
  assert.equal(request.execution.githubHostedTrainingAllowed, false);
  assert.equal(request.execution.paidApiAllowed, false);
  assert.ok(request.blockedTasks.coding.blockers.includes('INSUFFICIENT_PROJECT_DIVERSITY'));
});

test('준비된 작업만 task 전용 dataset/trainer 요청으로 만든다', () => {
  const readyCoding = {
    ready: true,
    accepted: 40,
    train: 28,
    eval: 6,
    holdout: 6,
    distinctProjects: 3,
    batchingPass: true,
    diversityPass: true,
    contaminationPass: true,
    taskPlanReady: true,
  };
  const request = buildTrainingRequest(status({
    readyTasks: ['coding'],
    state: 'READY_TASKS_AVAILABLE',
    tasks: { coding: readyCoding },
  }));
  assert.equal(request.state, 'READY_FOR_LOCAL_TRAINING');
  assert.equal(request.requests.length, 1);
  assert.equal(request.requests[0].taskType, 'coding');
  assert.ok(request.requests[0].datasetCommand.includes('--task-type'));
  assert.ok(request.requests[0].datasetCommand.includes('coding'));
  assert.ok(request.requests[0].trainerCommand.includes('tools/vibe2-train.py'));
  assert.deepEqual(request.requests[0].promotionGates, ['FIXED_HOLDOUT_AB', 'CANARY', 'NO_REGRESSION', 'RULE_COMPLIANCE']);
});

test('같은 상태에서는 requestId가 결정론적으로 동일하다', () => {
  assert.equal(buildTrainingRequest(status()).requestId, buildTrainingRequest(status()).requestId);
});


test('verified local trainer gives difficult QA cases priority without dropping samples or changing holdout',()=>{
  const source=fs.readFileSync(new URL('../tools/vibe2-train.py',import.meta.url),'utf8');
  assert.match(source,/class DifficultyCurriculumTrainer\(Trainer\)/);
  assert.match(source,/torch\.utils\.data\.WeightedRandomSampler/);
  assert.match(source,/replacement=False/);
  assert.match(source,/num_samples=len\(weights\)/);
  assert.match(source,/evalAndFixedHoldoutUntouched/);
  const script=[
    'import importlib.util',
    'spec=importlib.util.spec_from_file_location("vibe2_train", "tools/vibe2-train.py")',
    'module=importlib.util.module_from_spec(spec)',
    'spec.loader.exec_module(module)',
    'rows=[{"difficulty":"simple"},{"difficulty":"bug"},{"difficulty":"regression"},{"difficulty":"roblox-release"},{"difficulty":"unknown"}]',
    'weights=module.difficulty_curriculum_weights(rows)',
    'assert len(weights)==len(rows)',
    'assert weights[0]==weights[-1]==1.0',
    'assert weights[0]<weights[1]<weights[2]<weights[3]',
    'assert module.difficulty_curriculum_weights([{"difficulty":"simple"}])==[1.0]',
  ].join('\n');
  const check=spawnSync('python3',['-c',script],{encoding:'utf8'});
  assert.equal(check.status,0,check.stderr||check.error?.message||'Python curriculum test failed');
});

test('검증된 실제 샘플 SHA가 바뀌면 자동 재훈련 요청도 새 버전으로 생성된다',()=>{
  const task={ready:true,accepted:40,train:28,eval:6,holdout:6,distinctProjects:3,
    batchingPass:true,diversityPass:true,contaminationPass:true,taskPlanReady:true,
    datasetSha256:'a'.repeat(64)};
  const first=buildTrainingRequest(status({readyTasks:['coding'],state:'READY_TASKS_AVAILABLE',tasks:{coding:task}}));
  const unchanged=buildTrainingRequest(status({readyTasks:['coding'],state:'READY_TASKS_AVAILABLE',tasks:{coding:{...task}}}));
  const changed=buildTrainingRequest(status({readyTasks:['coding'],state:'READY_TASKS_AVAILABLE',tasks:{coding:{...task,datasetSha256:'b'.repeat(64)}}}));
  assert.equal(first.requestId,unchanged.requestId);
  assert.notEqual(first.requestId,changed.requestId);
  assert.notEqual(first.requests[0].adapterVersion,changed.requests[0].adapterVersion);
  assert.equal(first.requests[0].datasetSha256,task.datasetSha256);
  assert.equal(first.execution.route,'LOCAL_SELF_HOSTED_ONLY');
  assert.equal(first.execution.githubHostedTrainingAllowed,false);
  assert.equal(first.execution.paidApiAllowed,false);
});

test('기존 로컬 학습기가 요청-데이터셋 지문을 검증하고 가중치 승격은 금지한다',()=>{
  const workflow=fs.readFileSync(new URL('../.github/workflows/vibe2-local-distillation-train.yml',import.meta.url),'utf8');
  const dataset=fs.readFileSync(new URL('../tools/vibe2-weight-learning.mjs',import.meta.url),'utf8');
  assert.match(dataset,/TRAINING_DATASET_SHA_MISMATCH/);
  assert.match(dataset,/pending\.datasetSha256!==manifest\.datasetSha256/);
  assert.match(dataset,/datasetSha256:datasetContentFingerprint\(dataset\)/);
  assert.match(workflow,/runtimePromotionAllowed\s*=\s*\$false/);
  assert.match(workflow,/AUTO_PROMOTION=NO/);
});

test('정식 로컬 재훈련은 보류셋 SHA와 수량을 검증하고 학습 완료 뒤에만 A/B 손실을 비교한다',()=>{
  const source=fs.readFileSync(new URL('../tools/vibe2-train.py',import.meta.url),'utf8');
  assert.match(source,/holdoutSha256/);
  assert.match(source,/official holdout SHA256 mismatch/);
  assert.match(source,/official holdout missing or row count mismatch/);
  assert.match(source,/official holdout task type mismatch/);
  assert.match(source,/officialPostTrainHoldoutComparison/);
  assert.match(source,/trainingUsedHoldout": False/);
  assert.match(source,/runtimePromotionAllowed": False/);
  assert.match(source,/nextGate": "FIXED_HOLDOUT_AB_AND_CANARY"/);
  const script=[
    'import ast,pathlib',
    'p=pathlib.Path("tools/vibe2-train.py")',
    'source=p.read_text(encoding="utf8")',
    'tree=ast.parse(source)',
    'main=next(n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name=="main")',
    'train=source.index("train_result = trainer.train(")',
    'holdout=source.index("official_holdout_dataset = JsonlDataset(holdout_rows)")',
    'candidate=source.index("adapted_holdout = trainer.evaluate(")',
    'baseline=source.index("baseline_holdout = trainer.evaluate(")',
    'assert train < holdout < candidate < baseline',
    'assert "with model.disable_adapter():" in source[candidate:baseline]',
    'assert source.index("official holdout SHA256 mismatch") < train',
    'assert source.index("promotionState") > baseline',
    'print("POST_TRAIN_HOLDOUT_STRUCTURE=PASS")',
  ].join('\n');
  const check=spawnSync('python3',['-c',script],{encoding:'utf8'});
  assert.equal(check.status,0,check.stderr||check.error?.message||'Holdout verification test failed');
});

test('로컬 정식 학습기는 보류셋의 독립 QA, 원본 해시, 세 분할 간 샘플 중복을 거부한다',()=>{
  const script=[
    'import importlib.util,hashlib,copy,types,inspect',
    'spec=importlib.util.spec_from_file_location("vibe_train","tools/vibe2-train.py")',
    'm=importlib.util.module_from_spec(spec)',
    'spec.loader.exec_module(m)',
    'def row(i):',
    '    return {"sampleId":hashlib.sha256(str(i).encode()).hexdigest(),"taskType":"coding","qa":{"independentQa":"PASS","browserQa":"PASS","runtime":"PASS"},"lifecycle":"active","qualityScore":1.0,"synthetic":False}',
    'train,ev,held=[row(1)],[row(2)],[row(3)]',
    'manifest={"version":3,"readyForTraining":True,"contamination":{"pass":True,"contaminationRate":0},"diversity":{"pass":True},"batching":{"pass":True},"targetTaskType":"coding","taskTrainingPlan":{"coding":{"ready":True}},"policy":{"teacherOnlyDifficult":True},"stats":{"train":1,"eval":1,"holdout":1,"syntheticTrain":0},"seed":20260910}',
    'def refreshed(h):',
    '    p=copy.deepcopy(manifest)',
    '    p.update({"trainSha256":m.dataset_hash(train),"evalSha256":m.dataset_hash(ev),"holdoutSha256":m.dataset_hash(h)})',
    '    return p',
    'args=types.SimpleNamespace(task_type="coding",seed=20260910)',
    'm.validate_manifest(args,refreshed(held),train,ev,held)',
    'def rejected(h,marker,p=None):',
    '    try: m.validate_manifest(args,p or refreshed(h),train,ev,h)',
    '    except RuntimeError as err: assert marker in str(err),(marker,str(err))',
    '    else: raise AssertionError("unsafe official holdout passed")',
    'wrong_qa=copy.deepcopy(held); wrong_qa[0]["qa"]["independentQa"]="FAIL"',
    'rejected(wrong_qa,"independent QA")',
    'wrong_id=copy.deepcopy(held); wrong_id[0]["sampleId"]=train[0]["sampleId"]',
    'rejected(wrong_id,"identity overlap")',
    'rejected(wrong_qa,"holdout SHA256",refreshed(held))',
    'wrong_task=copy.deepcopy(held); wrong_task[0]["taskType"]="bugfix"',
    'rejected(wrong_task,"mixed task type")',
    'p=importlib.util.spec_from_file_location("vibe_practice","tools/vibe2-practice-train.py")',
    'practice=importlib.util.module_from_spec(p)',
    'p.loader.exec_module(practice)',
    'assert len(inspect.signature(practice.practice_validate).parameters)==5',
    'print("VERIFIED_HOLDOUT_GATE=PASS")',
  ].join('\n');
  const check=spawnSync('python3',['-c',script],{encoding:'utf8'});
  assert.equal(check.status,0,check.stderr||check.error?.message||'Official holdout verification test failed');
});
