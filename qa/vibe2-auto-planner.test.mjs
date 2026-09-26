// 파일명: qa/vibe2-auto-planner.test.mjs

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { latestDevelopmentBaselineEvidence, planVibe2AutonomousTask, planVibe2AutonomousTasks, findWebPresentationQualityTask, findRobloxStudioAssetBackfillTask, findStudioContinuousImprovementTask, findStudioContinuousImprovementTasks, applyBuildUpNextActionController, compileRuntimeNeuralEvent, applyRuntimeNeuralEventsToQueue, collectProjects } from '../tools/vibe2-auto-planner.mjs';
import {createVibeContinuousQueue} from '../assets/vibe-continuous-queue.js';

function writeDevelopmentBaseline(root, gameId='demo', overrides={}) {
  const dir=path.join(root,'design',gameId,'2026-09-11');
  fs.mkdirSync(dir,{recursive:true});
  const gate={
    policyDocument:'COMPANY_FLOW.md',
    tier:2,
    state:'DEVELOPMENT_BASELINE_READY',
    ready:true,
    blockers:[],
    evidence:{
      webGameplay:{required:true,pass:true,source:`design/${gameId}/2026-09-11/web-gameplay-validation.json`},
      unityProject:{required:true,present:true,path:`unity-games/${gameId}`},
      unityTechnical:{required:true,pass:true,source:`design/${gameId}/2026-09-11/unity-technical-validation.json`}
    },
    ...overrides
  };
  fs.writeFileSync(path.join(dir,'cycle-status.json'),JSON.stringify({status:'COMPLETE',baselineGate:gate},null,2),'utf8');
}

function tempRepo() {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'vibe2-auto-plan-'));
  fs.mkdirSync(path.join(root,'company-learning'),{recursive:true});
  fs.writeFileSync(path.join(root,'company-learning','platform-release-roadmap.json'),JSON.stringify({authority:'MACHINE_EXECUTION_CONTRACT',machineSourceOfTruth:'company-learning/platform-release-roadmap.json',humanDocumentRequired:false},null,2),'utf8');
  const scripts=path.join(root,'unity-games/demo/Assets/Scripts');
  fs.mkdirSync(scripts,{recursive:true});
  fs.writeFileSync(path.join(scripts,'GameCore.cs'),'var regions = new Dictionary<string, object> { ["field-4"] = new object() };\npublic List<string> ownedWeapons;\n','utf8');
  fs.writeFileSync(path.join(scripts,'RuntimeBootstrap.cs'),'if (GUILayout.Button("FIELD 1")) MoveTo("field-1");\n','utf8');
  fs.writeFileSync(path.join(scripts,'PrototypeAnimatedVisuals.cs'),'public void PlayTravelToBattle() { StartCoroutine(TravelRoutine()); }\n','utf8');
  for (const game of ['release-web','dev-web','third-web']) {
    fs.mkdirSync(path.join(root,`web-games/${game}`),{recursive:true});
    fs.writeFileSync(path.join(root,`web-games/${game}/index.js`),'// TODO: remove duplicate click handler\nfunction start() {}\n','utf8');
  }
  writeDevelopmentBaseline(root);
  return root;
}
function writeStudioDesign(root,gameId,overrides={}){
  const dir=path.join(root,'design',gameId,'2026-09-25');
  fs.mkdirSync(dir,{recursive:true});
  const content={
    identity:`${gameId} 고유 플레이 정체성`,
    coreFun:'적의 위협을 읽고 핵심 행동을 선택해 실제 전투 상태를 바꾸는 재미',
    coreLoop:['위협과 목표를 읽고 행동을 선택한다','실제 입력으로 적·월드·자원 상태를 바꾼다','결과와 보상으로 다음 목표와 전략을 갱신한다'],
    signatureSystems:[
      {name:'combat-counterplay',purpose:'적 유형에 맞춘 실제 전투 선택',playerChoice:'공격·회피·배치 중 상황에 맞는 대응을 선택'},
      {name:'progression-loop',purpose:'전투 결과가 다음 선택을 확장',playerChoice:'보상으로 다음 목표나 성장 경로를 고른다'}
    ],
    progressionDirection:'핵심 행동의 성공 결과가 다음 목표·보상·해금·콘텐츠 선택으로 연결된다.',
    ...overrides
  };
  const file=path.join(dir,'design-revised.json');
  fs.writeFileSync(file,JSON.stringify({version:1,gameId,date:'2026-09-25',status:'DESIGN_BASELINE_CANDIDATE',content},null,2),'utf8');
  fs.writeFileSync(path.join(dir,'cycle-status.json'),JSON.stringify({gameId,status:'COMPLETE',baselineGate:{state:'DESIGN_BASELINE_READY',ready:true,blockers:[],checkedAt:'2026-09-25T00:00:00Z'}},null,2),'utf8');
  fs.writeFileSync(path.join(dir,'strict-design-review.json'),JSON.stringify({gameId,verdict:'PASS',totalScore:90,hardFailures:[],reviewedAt:'2026-09-25T00:00:00Z'},null,2),'utf8');
  return file;
}
const status={projects:[{gameId:'demo',ownerDecision:'PASS',target:'unity-android',projectPath:'unity-games/demo',progress:80}]};
const catalog={games:[
  {id:'demo',homepageCategory:'development-confirmed'},
  {id:'release-web',name:'Release Web',webPath:'/web-games/release-web/',hasWebArchive:true,homepageWebPlayable:true,homepageCategory:'release-confirmed'},
  {id:'dev-web',name:'Dev Web',webPath:'/web-games/dev-web/',hasWebArchive:true,homepageWebPlayable:true,homepageCategory:'development-confirmed'},
  {id:'third-web',name:'Third Web',webPath:'/web-games/third-web/',hasWebArchive:true,homepageWebPlayable:true,homepageCategory:'development-confirmed'}
]};

test('active independent work no longer blocks autonomous planning when slots remain',()=>{
  const root=tempRepo();
  const result=planVibe2AutonomousTasks({
    status,catalog,
    queue:{maxConcurrentTasks:4,tasks:[{id:'existing',gameId:'existing',sourceRoot:'web-games/existing',status:'running',goal:'existing task',target:'web'}]},
    repoRoot:root,maxConcurrentTasks:4
  });
  assert.equal(result.planned,true);
  assert.ok(result.count>=1);
  assert.equal(result.queue.tasks.filter(t=>['queued','running'].includes(t.status)).length<=4,true);
});

test('active 20-worker wave does not block plan-only development backlog expansion',()=>{
  const root=tempRepo();
  const running=Array.from({length:20},(_,i)=>({
    id:`active-wave-${i}`,gameId:`active-${i}`,sourceRoot:`web-games/active-${i}`,responsibleFiles:['index.html'],
    department:'development',type:'implementation',status:'running',goal:'active game work',target:'web',reservationRunId:'run-active'
  }));
  const result=planVibe2AutonomousTasks({
    status,catalog,queue:{maxConcurrentTasks:256,tasks:running},repoRoot:root,
    maxConcurrentTasks:20,queueMaxConcurrentTasks:256,planningBacklogTarget:60,planningBacklogMinimum:40
  });
  assert.equal(result.planned,true);
  assert.equal(result.planningBacklog.current,20);
  assert.equal(result.planningBacklog.capacity,40);
  assert.equal(result.planningBacklog.executionWaveMax,20);
  assert.equal(result.planningBacklog.persistentQueueMax,256);
  assert.ok(result.tasks.length>=1);
  assert.ok(result.tasks.every(task=>task.status==='queued'));
  assert.ok(result.tasks.every(task=>task.reservationRunId==null));
  assert.equal(result.queue.maxConcurrentTasks,256);
});

test('release-wait candidates do not consume runnable development planning backlog capacity',()=>{
  const root=tempRepo();
  const waiting=Array.from({length:60},(_,i)=>({
    id:`release-wait-${i}`,gameId:'dev-web',sourceRoot:`web-games/dev-web-wait-${i}`,responsibleFiles:['index.html'],
    department:'development',type:'implementation',status:'running',goal:'await release',target:'web',
    blocker:'candidate-awaiting-qa-and-deployment'
  }));
  const result=planVibe2AutonomousTasks({
    status,catalog,queue:{maxConcurrentTasks:256,tasks:waiting},repoRoot:root,
    maxConcurrentTasks:20,queueMaxConcurrentTasks:256,planningBacklogTarget:60,planningBacklogMinimum:40
  });
  assert.equal(result.planned,true);
  assert.equal(result.planningBacklog.current,0);
  assert.equal(result.planningBacklog.releaseWaitExcluded,60);
  assert.equal(result.planningBacklog.capacity,60);
});

test('supervised review wait also stays outside runnable planning backlog',()=>{
  const root=tempRepo();
  const waiting=Array.from({length:60},(_,i)=>({
    id:`supervised-wait-${i}`,gameId:'dev-web',sourceRoot:`web-games/supervised-wait-${i}`,responsibleFiles:['index.html'],
    department:'development',type:'implementation',status:'running',goal:'await supervised review',target:'web',
    blocker:'candidate-awaiting-supervised-review',productionMode:'SUPERVISED_VIBE_COAUTHORING',
    supervisionContract:{required:true},supervisionApproved:false
  }));
  const result=planVibe2AutonomousTasks({
    status,catalog,queue:{maxConcurrentTasks:256,tasks:waiting},repoRoot:root,
    maxConcurrentTasks:20,queueMaxConcurrentTasks:256,planningBacklogTarget:60,planningBacklogMinimum:40
  });
  assert.equal(result.planned,true);
  assert.equal(result.planningBacklog.current,0);
  assert.equal(result.planningBacklog.releaseWaitExcluded,60);
  assert.equal(result.planningBacklog.capacity,60);
});
test('planning backlog target stops plan expansion without changing persistent queue max',()=>{
  const root=tempRepo();
  const queued=Array.from({length:60},(_,i)=>({
    id:`planned-${i}`,gameId:'dev-web',sourceRoot:`web-games/dev-web-planned-${i}`,responsibleFiles:['index.html'],
    department:'development',type:'implementation',status:'queued',goal:'planned game work',target:'web'
  }));
  const result=planVibe2AutonomousTasks({
    status,catalog,queue:{maxConcurrentTasks:256,tasks:queued},repoRoot:root,
    maxConcurrentTasks:20,queueMaxConcurrentTasks:256,planningBacklogTarget:60,planningBacklogMinimum:40
  });
  assert.equal(result.planned,false);
  assert.equal(result.reason,'DEVELOPMENT_BACKLOG_TARGET_REACHED');
  assert.equal(result.planningBacklog.current,60);
  assert.equal(result.queue.maxConcurrentTasks,256);
});

test('queued low-value micro diagnostics are consolidated so studio presentation work can enter the queue',()=>{
  const root=tempRepo();
  const gameId='studio-web';
  const webRoot=path.join(root,'web-games',gameId);
  fs.mkdirSync(webRoot,{recursive:true});
  fs.writeFileSync(path.join(webRoot,'index.html'),`<!doctype html><html><body data-spatial-dimension="2.5d" style="perspective:900px"><canvas id="game"></canvas><main>${'world '.repeat(180)}</main></body></html>\n`,'utf8');
  writeStudioDesign(root,gameId);
  const validationDir=path.join(root,'design',gameId,'2026-09-24');
  fs.mkdirSync(validationDir,{recursive:true});
  fs.writeFileSync(path.join(validationDir,'development-validation-status.json'),JSON.stringify({gameId,state:'PASS',webStrictScore:90,blockers:[]},null,2),'utf8');
  const assessment={
    id:`${gameId}-existing-web-assessment-v1`,gameId,target:'web',department:'development',type:'implementation',
    sourceRoot:`web-games/${gameId}`,responsibleFiles:[`web-games/${gameId}/index.html`],goal:'assessment complete',
    releaseState:'development-confirmed',status:'verified',retries:0,evidence:['existing-web-assessment-required']
  };
  const micro={
    id:`${gameId}-diagnostic-bundle-touch`,gameId,target:'web',department:'development',type:'implementation',
    sourceRoot:`web-games/${gameId}`,responsibleFiles:[`web-games/${gameId}/index.html`],
    goal:'touch-action 필요 여부만 최소 수정',priority:'normal',releaseState:'development-confirmed',status:'queued',retries:0,
    evidence:['diagnostic:TOUCH_ACTION_UNSPECIFIED','diagnostic-key:TOUCH_ACTION_UNSPECIFIED:index.html']
  };
  const result=planVibe2AutonomousTasks({
    status:{projects:[]},
    catalog:{games:[{id:gameId,name:'Studio Web',productionClass:'DEVELOPMENT_CONFIRMED',lifecycleState:'ACTIVE',hasWebArchive:true,homepageWebPlayable:true,webPath:`/web-games/${gameId}/`}]},
    queue:{maxConcurrentTasks:20,tasks:[assessment,micro]},repoRoot:root,maxConcurrentTasks:20
  });
  const cancelled=result.queue.tasks.find(row=>row.id===micro.id);
  assert.equal(cancelled.status,'cancelled');
  assert.equal(cancelled.blocker,'superseded-by:STUDIO_QUALITY_PACKAGE');
  assert.ok(cancelled.evidence.includes('studio-quality-micro-task-consolidation:v1'));
  assert.equal(result.planningBacklog.supersededLegacyMicroTasks,1);
  assert.ok(result.tasks.some(row=>row.id===`${gameId}-presentation-asset-adaptation-v1`));
});

test('effective wave cap does not overwrite persistent external queue max',()=>{
  const root=tempRepo();
  const result=planVibe2AutonomousTasks({
    status,catalog,
    queue:{maxConcurrentTasks:256,tasks:[]},
    repoRoot:root,
    maxConcurrentTasks:20,
    queueMaxConcurrentTasks:256
  });
  assert.equal(result.queue.maxConcurrentTasks,256);
  assert.equal(result.queue.tasks.filter(t=>['queued','running'].includes(t.status)).length<=20,true);
});

test('owner directive keeps priority while independent free slots continue refilling',()=>{
  const root=tempRepo();
  const result=planVibe2AutonomousTasks({
    status,catalog,
    queue:{maxConcurrentTasks:4,tasks:[{id:'owner',gameId:'demo',sourceRoot:'unity-games/demo',status:'running',goal:'owner',target:'unity',ownerDirective:true}]},
    repoRoot:root,maxConcurrentTasks:4
  });
  assert.equal(result.planned,true);
  assert.equal(result.reason,'WORK_PACKAGES_PLANNED_AROUND_OWNER_DIRECTIVES');
  assert.equal(result.ownerDirectiveActiveCount,1);
  assert.equal(result.tasks.every(task=>task.sourceRoot!=='unity-games/demo'),true);
});

test('planner fills independent development web source roots in one pass',()=>{
  const root=tempRepo();
  const result=planVibe2AutonomousTasks({status,catalog,queue:{tasks:[]},repoRoot:root,maxConcurrentTasks:4});
  assert.equal(result.planned,true);
  assert.ok(result.count>=2);
  assert.equal(result.tasks.every(t=>t.releaseState==='development-confirmed'&&t.target==='web'),true);
  assert.equal(result.tasks.every(t=>Boolean(t.packageId)&&t.packageWorkUnits>=3),true);
  assert.ok(result.workloadTelemetry.plannedPackageCount>=1);
  assert.equal(result.cycleTarget.quantityTargetMet,true);
});

test('development-confirmed Web enters Vibe planning before homepage publication',()=>{
  const root=tempRepo();
  const hiddenRoot=path.join(root,'web-games/hidden-dev');
  fs.mkdirSync(hiddenRoot,{recursive:true});
  fs.writeFileSync(path.join(hiddenRoot,'index.html'),'<!doctype html><html><body><main>DEVELOPMENT_CONFIRMED ·</main><button class="action">Play</button></body></html>','utf8');
  const result=planVibe2AutonomousTask({
    status:{projects:[]},
    catalog:{games:[{id:'hidden-dev',name:'Hidden Dev',webPath:'/web-games/hidden-dev/',hasWebArchive:true,homepageWebPlayable:false,productionClass:'DEVELOPMENT_CONFIRMED',lifecycleState:'ACTIVE'}]},
    queue:{tasks:[]},repoRoot:root,maxConcurrentTasks:4
  });
  assert.equal(result.planned,true);
  assert.equal(result.task.gameId,'hidden-dev');
  assert.equal(result.task.target,'web');
  assert.equal(result.task.ownerDirective,true);
  assert.equal(result.task.productionMode,'SUPERVISED_VIBE_COAUTHORING');
  assert.equal(result.task.supervisionApproved,false);
  assert.equal(result.task.supervisionContract.required,true);
  assert.equal(result.task.supervisionContract.automaticPromotionAllowed,false);
  assert.ok(result.task.evidence.includes('supervised-web-build:required'));
  assert.ok(result.task.evidence.includes('automatic-promotion:blocked-until-supervised-approval'));
  assert.ok(result.task.evidence.includes('central-policy:company-learning/platform-release-roadmap.json'));
  assert.ok(result.task.evidence.includes('existing-web-assessment-required'));
  assert.match(result.task.goal,/EXISTING_WEB_ASSESS_AND_IMPLEMENT/);
  assert.doesNotMatch(result.task.goal,/FULL_WEB_GAME_REBUILD/);
});

test('canonical development queue bootstraps missing Web source roots instead of dropping active games',()=>{
  const root=tempRepo();
  const gameId='missing-web-base';
  const result=planVibe2AutonomousTasks({
    status:{projects:[]},
    catalog:{games:[{
      id:gameId,
      name:'Missing Web Base',
      productionClass:'DEVELOPMENT_CONFIRMED',
      lifecycleState:'ACTIVE',
      homepageWebPlayable:false,
      hasWebArchive:false
    }]},
    developmentQueue:{items:[{
      gameId,
      gameName:'Missing Web Base',
      status:'ACTIVE',
      productionClass:'DEVELOPMENT_CONFIRMED',
      currentStep:'VIBE_WEB_BASE_IMPLEMENTATION',
      canonicalState:'WEB_VIBE_REPAIR_REQUIRED',
      webSourcePath:'web-games/missing-web-base',
      sourcePath:'web-games/missing-web-base',
      saveNormalizationRequired:true
    }]},
    queue:{maxConcurrentTasks:4,tasks:[]},
    repoRoot:root,
    maxConcurrentTasks:4
  });
  assert.equal(result.planned,true);
  const task=result.tasks.find(row=>row.gameId===gameId);
  assert.ok(task);
  assert.equal(task.id,'missing-web-base-web-base-implementation-v1');
  assert.equal(task.target,'web');
  assert.equal(task.sourceRoot,'web-games/missing-web-base');
  assert.equal(task.ownerDirective,true);
  assert.ok(task.evidence.includes('vibe2-auto-planner:company-development-queue'));
  assert.ok(task.evidence.includes('source-root-bootstrap-required'));
  assert.ok(task.evidence.includes('existing-web-source:MISSING'));
  assert.match(task.goal,/SOURCE_ROOT_BOOTSTRAP_ALLOWED/);
  assert.equal(fs.existsSync(path.join(root,'web-games',gameId,'index.html')),false);
});

test('company status Web rows retain exact repair state from company runtime queue',()=>{
  const root=tempRepo();
  const gameId='status-and-runtime-repair';
  const sourceRoot=path.join(root,'web-games',gameId);
  fs.mkdirSync(sourceRoot,{recursive:true});
  fs.writeFileSync(path.join(sourceRoot,'index.html'),'<!doctype html><html><body><main>existing</main></body></html>','utf8');
  const result=planVibe2AutonomousTasks({
    status:{projects:[{gameId,projectPath:`web-games/${gameId}`,selectedPlatform:'web',ownerDecision:'PASS'}]},
    catalog:{games:[{id:gameId,name:'Status Runtime Repair',productionClass:'DEVELOPMENT_CONFIRMED',lifecycleState:'ACTIVE',homepageWebPlayable:true,hasWebArchive:true,webPath:`/web-games/${gameId}/`}]},
    developmentQueue:{items:[{gameId,gameName:'Status Runtime Repair',status:'ACTIVE',productionClass:'DEVELOPMENT_CONFIRMED',currentStep:'VIBE_WEB_BASE_IMPLEMENTATION',canonicalState:'WEB_VIBE_REPAIR_REQUIRED',webSourcePath:`web-games/${gameId}`,sourcePath:`web-games/${gameId}`}]},
    queue:{maxConcurrentTasks:20,tasks:[]},repoRoot:root,maxConcurrentTasks:20
  });
  assert.equal(result.planned,true);
  const task=result.tasks.find(row=>row.gameId===gameId);
  assert.ok(task);
  assert.equal(task.id,`${gameId}-web-runtime-repair-v1`);
  assert.ok(task.evidence.includes('company-runtime-state:WEB_VIBE_REPAIR_REQUIRED'));
  assert.ok(task.evidence.includes('recovery-exact-stage:WEB_REPAIR'));
  assert.equal(task.neuralDiagnosis.mode,'PHASE1_SHADOW_ADVISORY');
  assert.equal(task.neuralDiagnosis.actionRecommendation.failureStage,'WEB_REPAIR');
  assert.equal(task.neuralDiagnosis.waveControl.mayReorderWave,false);
  assert.equal(task.neuralDiagnosis.waveControl.mayCreateWorker,false);
});

test('cancelled exact Web base task is restored when company runtime still requires source bootstrap',()=>{
  const root=tempRepo();
  const gameId='restore-missing-web-base';
  const stale={
    id:`${gameId}-web-base-implementation-v1`,gameId,target:'web',department:'development',type:'implementation',
    sourceRoot:`web-games/${gameId}`,responsibleFiles:[`web-games/${gameId}/index.html`],goal:'[WEB_BASE_IMPLEMENTATION] source bootstrap',
    releaseState:'development-confirmed',status:'cancelled',retries:0,maxRetries:2,blocker:'production-authority-inactive:DESIGN_ONLY',
    evidence:['source-root-bootstrap-required','production-authority-sync:DESIGN_ONLY']
  };
  const result=planVibe2AutonomousTasks({
    status:{projects:[]},
    catalog:{games:[{id:gameId,name:'Restore Missing Web Base',productionClass:'DEVELOPMENT_CONFIRMED',lifecycleState:'ACTIVE',homepageWebPlayable:false,hasWebArchive:false}]},
    developmentQueue:{items:[{gameId,gameName:'Restore Missing Web Base',status:'ACTIVE',productionClass:'DEVELOPMENT_CONFIRMED',currentStep:'VIBE_WEB_BASE_IMPLEMENTATION',canonicalState:'WEB_VIBE_REPAIR_REQUIRED',webSourcePath:`web-games/${gameId}`,sourcePath:`web-games/${gameId}`}]},
    queue:{maxConcurrentTasks:20,tasks:[stale]},repoRoot:root,maxConcurrentTasks:20
  });
  const restored=result.queue.tasks.find(row=>row.id===stale.id);
  assert.equal(restored.status,'queued');
  assert.equal(restored.blocker,null);
  assert.equal(restored.lastOutcome,'RESTORED_BY_CENTRAL_PRODUCTION_AUTHORITY');
  assert.ok(restored.evidence.includes('production-authority-restored:DEVELOPMENT_CONFIRMED'));
  assert.ok(restored.evidence.includes('event-driven-resume:central-production-authority-restored'));
  assert.ok(restored.evidence.includes('restored-from:production-authority-inactive:DESIGN_ONLY'));
});

test('reactivated DEVELOPMENT_CONFIRMED restores only central-authority cancellations and preserves retry history',()=>{
  const root=tempRepo();
  const gameId='authority-restore';
  const centralCancelled={
    id:'authority-restore-old-task',gameId,target:'unity',department:'development',type:'implementation',
    sourceRoot:`unity-games/${gameId}`,responsibleFiles:['Assets/Scripts/GameCore.cs'],goal:'continue approved development',
    releaseState:'development-confirmed',status:'cancelled',retries:7,maxRetries:2,
    blocker:'production-authority-inactive:DESIGN_ONLY',lastOutcome:'CANCELLED_BY_CENTRAL_PRODUCTION_AUTHORITY',
    evidence:['production-authority-sync:DESIGN_ONLY']
  };
  const superseded={
    ...centralCancelled,id:'authority-restore-superseded',status:'cancelled',retries:1,
    blocker:'superseded-by:VIBE_WEB_REPAIR',lastOutcome:'SUPERSEDED_BY_EXACT_WEB_REPAIR',
    evidence:['superseded-by:VIBE_WEB_REPAIR']
  };
  const result=planVibe2AutonomousTasks({
    status:{projects:[]},
    catalog:{games:[{id:gameId,name:'Authority Restore',productionClass:'DEVELOPMENT_CONFIRMED',lifecycleState:'ACTIVE'}]},
    queue:{maxConcurrentTasks:256,tasks:[centralCancelled,superseded]},
    repoRoot:root,maxConcurrentTasks:20,queueMaxConcurrentTasks:256
  });
  const restored=result.queue.tasks.find(row=>row.id===centralCancelled.id);
  const untouched=result.queue.tasks.find(row=>row.id===superseded.id);
  assert.equal(restored.status,'queued');
  assert.equal(restored.blocker,null);
  assert.equal(restored.retries,7);
  assert.equal(restored.retryPolicy,'UNLIMITED_CAUSAL_REPAIR');
  assert.equal(restored.maxRetries,null);
  assert.equal(restored.lastOutcome,'RESTORED_BY_CENTRAL_PRODUCTION_AUTHORITY');
  assert.ok(restored.evidence.includes('production-authority-restored:DEVELOPMENT_CONFIRMED'));
  assert.ok(restored.evidence.includes('event-driven-resume:central-production-authority-restored'));
  assert.equal(untouched.status,'cancelled');
  assert.equal(untouched.blocker,'superseded-by:VIBE_WEB_REPAIR');
});

test('verified Web repair checkpoint creates the next causal repair generation while runtime still requires repair',()=>{
  const root=tempRepo();
  const gameId='repair-generation';
  const sourceRoot=path.join(root,'web-games',gameId);
  fs.mkdirSync(sourceRoot,{recursive:true});
  fs.writeFileSync(path.join(sourceRoot,'index.html'),'<!doctype html><html><body><main>existing</main></body></html>','utf8');
  const verified={
    id:`${gameId}-web-runtime-repair-v1`,gameId,target:'web',department:'development',type:'implementation',
    sourceRoot:`web-games/${gameId}`,responsibleFiles:[`web-games/${gameId}/index.html`],
    goal:'previous repair',releaseState:'development-confirmed',status:'verified',retries:0,
    evidence:['company-runtime-state:WEB_VIBE_REPAIR_REQUIRED','signal-state:VERIFIED_CHECKPOINT']
  };
  const result=planVibe2AutonomousTasks({
    status:{projects:[]},
    catalog:{games:[{id:gameId,name:'Repair Generation',productionClass:'DEVELOPMENT_CONFIRMED',lifecycleState:'ACTIVE',hasWebArchive:true,webPath:`/web-games/${gameId}/`}]},
    developmentQueue:{items:[{gameId,gameName:'Repair Generation',status:'ACTIVE',productionClass:'DEVELOPMENT_CONFIRMED',currentStep:'VIBE_WEB_REPAIR',canonicalState:'WEB_VIBE_REPAIR_REQUIRED',webSourcePath:`web-games/${gameId}`,sourcePath:`web-games/${gameId}`,vibeWebRequestedStage:'WEB_REPAIR',vibeWebImplementationReason:'MOBILE_TOUCH_ACTION_NOT_CONNECTED'}]},
    queue:{maxConcurrentTasks:20,tasks:[verified]},repoRoot:root,maxConcurrentTasks:20
  });
  assert.equal(result.planned,true);
  const next=result.tasks.find(row=>row.id===`${gameId}-web-runtime-repair-v2`);
  assert.ok(next);
  assert.ok(next.evidence.includes('company-runtime-state:WEB_VIBE_REPAIR_REQUIRED'));
  assert.equal(result.queue.tasks.filter(row=>row.id.startsWith(`${gameId}-web-runtime-repair-v`)).length,2);
});

test('canonical development queue turns WEB_VIBE_REPAIR_REQUIRED existing source into one exact-stage repair task',()=>{
  const root=tempRepo();
  const gameId='repair-web-runtime';
  const sourceRoot=path.join(root,'web-games',gameId);
  fs.mkdirSync(sourceRoot,{recursive:true});
  fs.writeFileSync(path.join(sourceRoot,'index.html'),'<!doctype html><html><body><main>existing game</main></body></html>','utf8');
  const staleAssessment={
    id:`${gameId}-existing-web-assessment-v1`,gameId,target:'web',department:'development',type:'implementation',
    sourceRoot:`web-games/${gameId}`,responsibleFiles:[`web-games/${gameId}/index.html`],goal:'stale generic assessment',
    releaseState:'development-confirmed',status:'failed',retries:3,maxRetries:2,blocker:'source-candidate-generation-failed',evidence:['existing-web-assessment-required']
  };
  const staleDiagnostic={
    id:`${gameId}-diagnostic-bundle-old-index-html`,gameId,target:'web',department:'development',type:'implementation',
    sourceRoot:`web-games/${gameId}`,responsibleFiles:[`web-games/${gameId}/index.html`],goal:'stale diagnostic',
    releaseState:'development-confirmed',status:'queued',retries:0,maxRetries:2,blocker:null,evidence:['diagnostic:TOUCH_ACTION_UNSPECIFIED','diagnostic-key:TOUCH_ACTION_UNSPECIFIED:index.html']
  };
  const result=planVibe2AutonomousTasks({
    status:{projects:[]},
    catalog:{games:[{id:gameId,name:'Repair Web Runtime',productionClass:'DEVELOPMENT_CONFIRMED',lifecycleState:'ACTIVE',homepageWebPlayable:false,hasWebArchive:true,webPath:`/web-games/${gameId}/`}]},
    developmentQueue:{items:[{gameId,gameName:'Repair Web Runtime',status:'ACTIVE',productionClass:'DEVELOPMENT_CONFIRMED',currentStep:'VIBE_WEB_REPAIR',canonicalState:'WEB_VIBE_REPAIR_REQUIRED',webSourcePath:`web-games/${gameId}`,sourcePath:`web-games/${gameId}`,vibeWebRequestedStage:'WEB_REPAIR',vibeWebImplementationReason:'MOBILE_TOUCH_ACTION_NOT_CONNECTED',routingBlockers:['vibe-web-implementation-required:WEB_REPAIR:MOBILE_TOUCH_ACTION_NOT_CONNECTED','web-gameplay-music:DISTINCT_RUNTIME_BLOCKER'],webValidationLastAttemptAt:'2026-09-19T07:40:00.000Z'}]},
    queue:{maxConcurrentTasks:4,tasks:[staleAssessment,staleDiagnostic]},repoRoot:root,maxConcurrentTasks:4
  });
  assert.equal(result.planned,true);
  const task=result.tasks.find(row=>row.gameId===gameId);
  assert.ok(task);
  assert.equal(task.id,`${gameId}-web-runtime-repair-v1`);
  assert.deepEqual(task.responsibleFiles,[`web-games/${gameId}/index.html`]);
  assert.ok(task.evidence.includes('company-runtime-state:WEB_VIBE_REPAIR_REQUIRED'));
  assert.ok(task.evidence.includes('recovery-exact-stage:WEB_REPAIR'));
  assert.ok(task.evidence.includes('diagnostic:TOUCH_ACTION_UNSPECIFIED'));
  assert.ok(task.evidence.includes('diagnostic-key:TOUCH_ACTION_UNSPECIFIED:index.html'));
  assert.ok(task.evidence.includes('diagnostic-responsibility-shadow:GAME_INPUT'));
  assert.ok(task.evidence.includes('diagnostic-carryover:EXACT_WEB_REPAIR'));
  assert.match(task.goal,/\[WEB_REPAIR\]/);
  assert.match(task.goal,/\[COMPANY_RUNTIME_FAILURE_EVIDENCE\]/);
  assert.match(task.goal,/requested-stage=WEB_REPAIR/);
  assert.match(task.goal,/implementation-reason=MOBILE_TOUCH_ACTION_NOT_CONNECTED/);
  assert.doesNotMatch(task.goal,/routing-blocker=vibe-web-implementation-required:WEB_REPAIR:MOBILE_TOUCH_ACTION_NOT_CONNECTED/);
  assert.match(task.goal,/routing-blocker=web-gameplay-music:DISTINCT_RUNTIME_BLOCKER/);
  assert.match(task.goal,/\[WEB_REPAIR_IMPLEMENTATION_HINTS\]/);
  assert.match(task.goal,/모바일 touch\/pointer 입력을 실제 게임 액션 함수와 상태 변화에 직접 연결/);
  assert.match(task.goal,/no-op 수정은 금지/);
  for(const staleId of [staleAssessment.id,staleDiagnostic.id]){
    const stale=result.queue.tasks.find(row=>row.id===staleId);
    assert.equal(stale.status,'cancelled');
    assert.equal(stale.blocker,'superseded-by:VIBE_WEB_REPAIR');
    assert.equal(stale.lastOutcome,'SUPERSEDED_BY_EXACT_WEB_REPAIR');
    assert.ok(stale.evidence.includes('superseded-by:VIBE_WEB_REPAIR'));
  }
});

test('existing queued exact Web repair refreshes its goal from latest company runtime evidence',()=>{
  const root=tempRepo();
  const gameId='refresh-web-runtime';
  const sourceRoot=path.join(root,'web-games',gameId);
  fs.mkdirSync(sourceRoot,{recursive:true});
  fs.writeFileSync(path.join(sourceRoot,'index.html'),'<!doctype html><html><body><main>existing game</main></body></html>','utf8');
  const exact={
    id:`${gameId}-web-runtime-repair-v1`,gameId,target:'web',department:'development',type:'implementation',
    sourceRoot:`web-games/${gameId}`,responsibleFiles:[`web-games/${gameId}/index.html`],
    goal:'old generic repair goal',releaseState:'development-confirmed',status:'queued',retries:1,maxRetries:2,blocker:null,
    evidence:['company-runtime-state:WEB_VIBE_REPAIR_REQUIRED']
  };
  const diagnostic={
    id:`${gameId}-diagnostic-bundle-dom-index-html`,gameId,target:'web',department:'development',type:'implementation',
    sourceRoot:`web-games/${gameId}`,responsibleFiles:[`web-games/${gameId}/index.html`],goal:'stale diagnostic',
    releaseState:'development-confirmed',status:'cancelled',retries:0,maxRetries:2,blocker:'superseded-by:VIBE_WEB_REPAIR',
    evidence:['diagnostic:DOM_NULL_EVENT_BIND','diagnostic-key:DOM_NULL_EVENT_BIND:index.html']
  };
  const result=planVibe2AutonomousTasks({
    status:{projects:[]},
    catalog:{games:[{id:gameId,name:'Refresh Web Runtime',productionClass:'DEVELOPMENT_CONFIRMED',lifecycleState:'ACTIVE',homepageWebPlayable:false,hasWebArchive:true,webPath:`/web-games/${gameId}/`}]},
    developmentQueue:{items:[{
      gameId,gameName:'Refresh Web Runtime',status:'ACTIVE',productionClass:'DEVELOPMENT_CONFIRMED',
      currentStep:'VIBE_WEB_REPAIR',canonicalState:'WEB_VIBE_REPAIR_REQUIRED',
      webSourcePath:`web-games/${gameId}`,sourcePath:`web-games/${gameId}`,
      vibeWebRequestedStage:'WEB_REPAIR',
      vibeWebImplementationReason:'REAL_GAME_MECHANIC_COUNT_TOO_LOW',
      routingBlockers:['vibe-web-implementation-required:WEB_REPAIR:REAL_GAME_MECHANIC_COUNT_TOO_LOW:2:5'],
      webValidationLastAttemptAt:'2026-09-19T07:50:00.000Z'
    }]},
    queue:{maxConcurrentTasks:20,tasks:[exact,diagnostic]},repoRoot:root,maxConcurrentTasks:20
  });
  const refreshed=result.queue.tasks.find(row=>row.id===exact.id);
  assert.ok(refreshed);
  assert.equal(refreshed.status,'queued');
  assert.match(refreshed.goal,/\[COMPANY_RUNTIME_FAILURE_EVIDENCE\]/);
  assert.match(refreshed.goal,/implementation-reason=REAL_GAME_MECHANIC_COUNT_TOO_LOW/);
  assert.doesNotMatch(refreshed.goal,/routing-blocker=vibe-web-implementation-required:WEB_REPAIR:REAL_GAME_MECHANIC_COUNT_TOO_LOW:2:5/);
  assert.match(refreshed.goal,/\[WEB_REPAIR_IMPLEMENTATION_HINTS\]/);
  assert.match(refreshed.goal,/누락된 승인 gameplay mechanic을 실제 입력과 상태 변화가 있는 기능으로 구현/);
  assert.match(refreshed.goal,/last-validation-at=2026-09-19T07:50:00.000Z/);
  assert.ok(refreshed.evidence.includes('company-runtime-failure-evidence:refreshed'));
  assert.ok(refreshed.evidence.includes('diagnostic:DOM_NULL_EVENT_BIND'));
  assert.ok(refreshed.evidence.includes('diagnostic-key:DOM_NULL_EVENT_BIND:index.html'));
  assert.ok(refreshed.evidence.includes('diagnostic-responsibility-shadow:GAME_INPUT'));
  assert.ok(refreshed.evidence.includes('diagnostic-carryover:EXACT_WEB_REPAIR'));
});

test('supervised exact Web repair keeps supervisor goal when runtime evidence refreshes',()=>{
  const root=tempRepo();
  const gameId='supervised-refresh-web-runtime';
  const sourceRoot=path.join(root,'web-games',gameId);
  fs.mkdirSync(sourceRoot,{recursive:true});
  fs.writeFileSync(path.join(sourceRoot,'index.html'),'<!doctype html><html><body><main>existing game</main></body></html>','utf8');
  const exact={
    id:`${gameId}-web-runtime-repair-v1`,gameId,target:'web',department:'development',type:'implementation',
    sourceRoot:`web-games/${gameId}`,responsibleFiles:[`web-games/${gameId}/index.html`],
    goal:'[SUPERVISED_WEB_COAUTHORING]\n[WEB_BASE_IMPLEMENTATION]\nkeep this supervisor decomposition',
    releaseState:'development-confirmed',status:'queued',retries:0,maxRetries:2,blocker:null,
    productionMode:'SUPERVISED_VIBE_COAUTHORING',supervisionApproved:false,
    supervisionContract:{required:true,automaticPromotionAllowed:false},
    evidence:['company-runtime-state:WEB_VIBE_REPAIR_REQUIRED','supervised-web-build:required']
  };
  const result=planVibe2AutonomousTasks({
    status:{projects:[]},
    catalog:{games:[{id:gameId,name:'Supervised Refresh Web Runtime',productionClass:'DEVELOPMENT_CONFIRMED',lifecycleState:'ACTIVE',homepageWebPlayable:false,hasWebArchive:true,webPath:`/web-games/${gameId}/`}]},
    developmentQueue:{items:[{
      gameId,gameName:'Supervised Refresh Web Runtime',status:'ACTIVE',productionClass:'DEVELOPMENT_CONFIRMED',
      currentStep:'VIBE_WEB_REPAIR',canonicalState:'WEB_VIBE_REPAIR_REQUIRED',
      webSourcePath:`web-games/${gameId}`,sourcePath:`web-games/${gameId}`,
      vibeWebRequestedStage:'WEB_BASE_IMPLEMENTATION',
      vibeWebImplementationReason:'REAL_GAME_MECHANIC_COUNT_TOO_LOW:0:5|REAL_PLAYABLE_WEB_GAME_REQUIRED',
      webValidationLastAttemptAt:'2026-09-20T00:01:00.000Z'
    }]},
    queue:{maxConcurrentTasks:20,tasks:[exact]},repoRoot:root,maxConcurrentTasks:20
  });
  const refreshed=result.queue.tasks.find(row=>row.id===exact.id);
  assert.equal(refreshed.goal,exact.goal);
  assert.equal(refreshed.productionMode,'SUPERVISED_VIBE_COAUTHORING');
  assert.equal(refreshed.supervisionContract.required,true);
  assert.ok(refreshed.evidence.includes('company-runtime-failure-evidence:refreshed'));
  assert.ok(refreshed.evidence.includes('company-runtime-failure-evidence:supervised-goal-preserved'));
});

test('major WEB_REPAIR is supervised while a narrow micro repair remains autonomous',()=>{
  const root=tempRepo();
  for(const gameId of ['major-repair-web','micro-repair-web']){
    const sourceRoot=path.join(root,'web-games',gameId);
    fs.mkdirSync(sourceRoot,{recursive:true});
    fs.writeFileSync(path.join(sourceRoot,'index.html'),'<!doctype html><html><body><main>existing game</main></body></html>','utf8');
  }
  const catalog={games:[
    {id:'major-repair-web',name:'Major',productionClass:'DEVELOPMENT_CONFIRMED',lifecycleState:'ACTIVE',hasWebArchive:true,webPath:'/web-games/major-repair-web/'},
    {id:'micro-repair-web',name:'Micro',productionClass:'DEVELOPMENT_CONFIRMED',lifecycleState:'ACTIVE',hasWebArchive:true,webPath:'/web-games/micro-repair-web/'}
  ]};
  const developmentQueue={items:[
    {gameId:'major-repair-web',gameName:'Major',status:'ACTIVE',productionClass:'DEVELOPMENT_CONFIRMED',currentStep:'VIBE_WEB_REPAIR',canonicalState:'WEB_VIBE_REPAIR_REQUIRED',webSourcePath:'web-games/major-repair-web',sourcePath:'web-games/major-repair-web',vibeWebRequestedStage:'WEB_REPAIR',vibeWebImplementationReason:'REAL_GAME_MECHANIC_COUNT_TOO_LOW:0:5|REAL_PLAYABLE_WEB_GAME_REQUIRED'},
    {gameId:'micro-repair-web',gameName:'Micro',status:'ACTIVE',productionClass:'DEVELOPMENT_CONFIRMED',currentStep:'VIBE_WEB_REPAIR',canonicalState:'WEB_VIBE_REPAIR_REQUIRED',webSourcePath:'web-games/micro-repair-web',sourcePath:'web-games/micro-repair-web',vibeWebRequestedStage:'WEB_REPAIR',vibeWebImplementationReason:'MOBILE_TOUCH_ACTION_NOT_CONNECTED'}
  ]};
  const result=planVibe2AutonomousTasks({status:{projects:[]},catalog,developmentQueue,queue:{maxConcurrentTasks:20,tasks:[]},repoRoot:root,maxConcurrentTasks:20});
  const major=result.queue.tasks.find(row=>row.gameId==='major-repair-web'&&row.id.endsWith('-web-runtime-repair-v1'));
  const micro=result.queue.tasks.find(row=>row.gameId==='micro-repair-web'&&row.id.endsWith('-web-runtime-repair-v1'));
  assert.equal(major.productionMode,'SUPERVISED_VIBE_COAUTHORING');
  assert.equal(major.supervisionContract.required,true);
  assert.ok(major.evidence.includes('supervised-web-build:required'));
  assert.equal(micro.productionMode,'AUTONOMOUS_VIBE');
  assert.equal(micro.supervisionContract,null);
});
test('central DESIGN_ONLY authority cancels stale production implementation without touching study work',()=>{
  const root=tempRepo();
  const stale={id:'stale-dev',gameId:'crystal-defense',target:'web',department:'development',type:'implementation',sourceRoot:'web-games/crystal-defense',goal:'old development work',releaseState:'development-confirmed',status:'running',reservationId:'run-1',reservationRunId:'run-1',reservationRunAttempt:1,reservedAt:'2026-09-18T10:00:00Z'};
  const study={id:'study-external',gameId:'external-tictactoe',target:'web',department:'learning',type:'game-study',goal:'study',status:'running'};
  const result=planVibe2AutonomousTasks({
    status:{projects:[]},
    catalog:{games:[{id:'crystal-defense',name:'Crystal Defense',webPath:'/web-games/crystal-defense/',hasWebArchive:true,homepageWebPlayable:true,productionClass:'DESIGN_ONLY',homepageCategory:'design-only',lifecycleState:'ACTIVE'}]},
    queue:{tasks:[stale,study]},repoRoot:root,maxConcurrentTasks:4
  });
  const cancelled=result.queue.tasks.find(t=>t.id==='stale-dev');
  const preserved=result.queue.tasks.find(t=>t.id==='study-external');
  assert.equal(result.planned,false);
  assert.equal(cancelled.status,'cancelled');
  assert.equal(cancelled.blocker,'production-authority-inactive:DESIGN_ONLY');
  assert.equal(cancelled.lastOutcome,'CANCELLED_BY_CENTRAL_PRODUCTION_AUTHORITY');
  assert.equal(cancelled.reservationId,null);
  assert.ok(cancelled.evidence.includes('production-authority-sync:DESIGN_ONLY'));
  assert.equal(preserved.status,'running');
  assert.equal(preserved.blocker,null);
});

test('verified internal-release focused Roblox caretaker survives stale DESIGN_ONLY catalog authority',()=>{
  const root=tempRepo();
  const task={
    id:'cozy-focus',gameId:'cozy-island',target:'roblox',department:'development',type:'implementation',
    sourceRoot:'roblox-games/cozy-island',releaseState:'release-confirmed',status:'cancelled',
    blocker:'production-authority-inactive:DESIGN_ONLY',lastOutcome:'CANCELLED_BY_CENTRAL_PRODUCTION_AUTHORITY',
    postReleaseFocused:true,priority:'critical',evidence:[
      'post-release-focused:yes','focus-release-kind:INTERNAL_PLATFORM_RELEASE','internal-release-focused:yes',
      'production-authority-sync:DESIGN_ONLY'
    ]
  };
  const result=planVibe2AutonomousTasks({
    status:{projects:[]},
    catalog:{games:[{id:'cozy-island',productionClass:'DESIGN_ONLY',homepageCategory:'design-only',lifecycleState:'ACTIVE'}]},
    queue:{tasks:[task]},repoRoot:root,maxConcurrentTasks:4
  });
  const restored=result.queue.tasks.find(row=>row.id==='cozy-focus');
  assert.equal(restored.status,'queued');
  assert.equal(restored.blocker,null);
  assert.equal(restored.releaseState,'release-confirmed');
  assert.equal(restored.lastOutcome,'RESTORED_BY_CENTRAL_PRODUCTION_AUTHORITY');
  assert.ok(restored.evidence.includes('production-authority-restored:VERIFIED_INTERNAL_OR_PUBLIC_RELEASE'));
});

test('registered historical Roblox maintenance survives catalog absence and revives stale lifecycle cancellation',()=>{
  const root=tempRepo();
  const task={
    id:'historical-maintenance',gameId:'historical-game',target:'roblox',department:'development',type:'implementation',
    sourceRoot:'roblox-games/historical-game',releaseState:'development-confirmed',status:'cancelled',
    blocker:'lifecycle-inactive:MISSING_FROM_CATALOG',postReleaseFocused:true,
    packageLongWorkProtected:true,packageRole:'implementation-owner',evidence:[
      'post-release-focused:yes','historical-deployment-recovery:yes','historical-current-release-claim:NO',
      'maintenance-registry:company-learning/roblox-sustained-maintenance.json','lifecycle-sync:MISSING_FROM_CATALOG'
    ]
  };
  const historicalRegistry={assets:[{
    gameId:'historical-game',sourceRoot:'roblox-games/historical-game',maintenanceEligible:true,currentReleaseClaim:false,
    recoveryState:'HISTORICAL_PUBLICATION_TARGET_VERIFIED'
  }]};
  const result=planVibe2AutonomousTasks({status:{projects:[]},catalog:{games:[]},queue:{tasks:[task]},historicalRegistry,repoRoot:root,maxConcurrentTasks:4});
  const revived=result.queue.tasks.find(row=>row.id==='historical-maintenance');
  assert.equal(result.planned,false);
  assert.equal(revived.status,'queued');
  assert.equal(revived.blocker,null);
  assert.equal(revived.lastOutcome,null);
  assert.equal(revived.historicalDeploymentRecovery,true);
  assert.ok(revived.evidence.includes('lifecycle-sync:HISTORICAL_REGISTRY_ACTIVE'));
  assert.ok(revived.evidence.includes('self-recovery:HISTORICAL_DEPLOYMENT_FLAG_RESTORED'));
});

test('owner permanent removal hard-cancels historical maintenance and cannot revive',()=>{
  const root=tempRepo();
  const id='removed-game';
  const task={
    id:'removed-maintenance',gameId:id,target:'roblox',department:'development',type:'implementation',
    sourceRoot:'roblox-games/removed-game',releaseState:'development-confirmed',status:'queued',
    postReleaseFocused:true,historicalDeploymentRecovery:true,packageLongWorkProtected:true,packageRole:'implementation-owner',
    evidence:['historical-deployment-recovery:yes','historical-current-release-claim:NO','maintenance-registry:company-learning/roblox-sustained-maintenance.json']
  };
  const historicalRegistry={assets:[{
    gameId:id,sourceRoot:'roblox-games/removed-game',maintenanceEligible:true,currentReleaseClaim:false,
    recoveryState:'HISTORICAL_PUBLICATION_TARGET_VERIFIED'
  }]};
  const catalog={
    permanentRemovalPolicy:{ids:[id],reentryAllowed:false,automaticRecoveryAllowed:false,automaticMaintenanceAllowed:false},
    games:[{id,homepageCategory:'development-confirmed',productionClass:'DEVELOPMENT_CONFIRMED',lifecycleState:'ACTIVE'}]
  };
  const result=planVibe2AutonomousTasks({status:{projects:[]},catalog,queue:{tasks:[task]},historicalRegistry,repoRoot:root,maxConcurrentTasks:4});
  const cancelled=result.queue.tasks.find(row=>row.id==='removed-maintenance');
  assert.equal(cancelled.status,'cancelled');
  assert.equal(cancelled.blocker,'lifecycle-inactive:REMOVED_PERMANENTLY');
  assert.equal(cancelled.lastOutcome,'CANCELLED_BY_OWNER_PERMANENT_REMOVAL');
  assert.equal(cancelled.postReleaseFocused,false);
  assert.equal(cancelled.historicalDeploymentRecovery,false);
  assert.ok(cancelled.evidence.includes('owner-permanent-removal:yes'));
});

test('historical flags alone cannot bypass catalog authority without registry eligibility',()=>{
  const root=tempRepo();
  const task={
    id:'forged-historical',gameId:'missing-game',target:'roblox',department:'development',type:'implementation',
    sourceRoot:'roblox-games/missing-game',releaseState:'development-confirmed',status:'queued',
    postReleaseFocused:true,historicalDeploymentRecovery:true,packageLongWorkProtected:true,packageRole:'implementation-owner',
    evidence:['historical-deployment-recovery:yes','maintenance-registry:company-learning/roblox-sustained-maintenance.json']
  };
  const result=planVibe2AutonomousTasks({status:{projects:[]},catalog:{games:[]},queue:{tasks:[task]},historicalRegistry:{assets:[]},repoRoot:root,maxConcurrentTasks:4});
  const cancelled=result.queue.tasks.find(row=>row.id==='forged-historical');
  assert.equal(cancelled.status,'cancelled');
  assert.equal(cancelled.blocker,'lifecycle-inactive:MISSING_FROM_CATALOG');
});

test('historical baseline policy metadata remains reusable under current roadmap authority',()=>{
  const root=tempRepo();
  const evidence=latestDevelopmentBaselineEvidence('demo',root);
  assert.equal(evidence.ready,true);
  assert.equal(evidence.policySource,'company-learning/platform-release-roadmap.json');
  assert.equal(evidence.historicalPolicyDocument,'COMPANY_FLOW.md');
});


test('release-confirmed web archive is never an autonomous feature target',()=>{
  const root=tempRepo();
  const result=planVibe2AutonomousTasks({status,catalog,queue:{tasks:[]},repoRoot:root,maxConcurrentTasks:4});
  assert.equal(result.planned,true);
  assert.equal(result.tasks.some(t=>t.gameId==='release-web'),false);
});

test('release-confirmed Unity is selected only with explicit Development Baseline evidence',()=>{
  const root=tempRepo();
  const releaseCatalog={games:[
    {id:'demo',homepageCategory:'release-confirmed'},
    {id:'release-web',webPath:'/web-games/release-web/',hasWebArchive:true,homepageWebPlayable:true,homepageCategory:'release-confirmed'}
  ]};
  const evidence=latestDevelopmentBaselineEvidence('demo',root);
  assert.equal(evidence.ready,true);
  const result=planVibe2AutonomousTask({status,catalog:releaseCatalog,queue:{tasks:[]},repoRoot:root,maxConcurrentTasks:4});
  assert.equal(result.planned,true);
  assert.equal(result.task.id,'demo-region-controls-4-7');
  assert.equal(result.task.target,'unity');
  assert.equal(result.task.releaseState,'release-confirmed');
  assert.equal(result.task.evidence.some(x=>x.startsWith('development-baseline:design/demo/')),true);
});

test('release-confirmed Unity cannot enter Tier1 without Development Baseline PASS',()=>{
  const root=tempRepo();
  fs.rmSync(path.join(root,'design','demo'),{recursive:true,force:true});
  const releaseCatalog={games:[{id:'demo',homepageCategory:'release-confirmed'}]};
  const result=planVibe2AutonomousTask({status,catalog:releaseCatalog,queue:{tasks:[]},repoRoot:root,maxConcurrentTasks:4});
  assert.equal(result.planned,false);
  assert.equal(result.reason,'DEVELOPMENT_BASELINE_REQUIRED');
  assert.deepEqual(result.blockedTier1GameIds,['demo']);
});

test('partial or forged-looking Development Baseline evidence cannot unlock Tier1',()=>{
  const root=tempRepo();
  writeDevelopmentBaseline(root,'demo',{
    evidence:{
      webGameplay:{required:true,pass:true},
      unityProject:{required:true,present:true,path:'unity-games/demo'},
      unityTechnical:{required:true,pass:false}
    }
  });
  assert.equal(latestDevelopmentBaselineEvidence('demo',root).ready,false);
  const result=planVibe2AutonomousTask({status,catalog:{games:[{id:'demo',homepageCategory:'release-confirmed'}]},queue:{tasks:[]},repoRoot:root,maxConcurrentTasks:4});
  assert.equal(result.planned,false);
  assert.equal(result.reason,'DEVELOPMENT_BASELINE_REQUIRED');
});

test('development-confirmed Unity is not autonomous source development before promotion',()=>{
  const root=tempRepo();
  const result=planVibe2AutonomousTask({
    status,
    catalog:{games:[{id:'demo',homepageCategory:'development-confirmed'}]},
    queue:{tasks:[]},repoRoot:root,maxConcurrentTasks:4
  });
  assert.equal(result.planned,false);
  assert.equal(result.reason,'NO_CONFIRMED_PRODUCTION_PROJECT');
});

test('planner never selects Unity project without owner PASS',()=>{
  const root=tempRepo();
  const result=planVibe2AutonomousTask({
    status:{projects:[{gameId:'demo',ownerDecision:'WAIT',target:'unity-android',projectPath:'unity-games/demo'}]},
    catalog:{games:[{id:'demo',homepageCategory:'release-confirmed'}]},queue:{tasks:[]},repoRoot:root,maxConcurrentTasks:4
  });
  assert.equal(result.planned,false);
  assert.equal(result.reason,'NO_CONFIRMED_PRODUCTION_PROJECT');
});

test('active source root does not block same-game non-overlapping planning',()=>{
  const root=tempRepo();
  const mixedCatalog={games:[
    {id:'demo',homepageCategory:'release-confirmed'},
    {id:'dev-web',webPath:'/web-games/dev-web/',hasWebArchive:true,homepageWebPlayable:true,homepageCategory:'development-confirmed'}
  ]};
  const result=planVibe2AutonomousTasks({
    status,catalog:mixedCatalog,
    queue:{maxConcurrentTasks:4,tasks:[{id:'demo-active',gameId:'demo',sourceRoot:'unity-games/demo',target:'unity',goal:'active',releaseState:'release-confirmed',status:'running',responsibleFiles:['unity-games/demo/Assets/Scripts/Active.cs']}]},
    repoRoot:root,maxConcurrentTasks:4
  });
  assert.equal(result.tasks.some(t=>t.gameId==='demo'),true);
  assert.equal(result.tasks.some(t=>t.gameId==='dev-web'),true);
  assert.equal(result.tasks.filter(t=>t.gameId==='demo').every(task=>!(task.responsibleFiles||[]).includes('unity-games/demo/Assets/Scripts/Active.cs')),true);
});

test('development web is assessed before deterministic diagnostics',()=>{
  const root=tempRepo();
  const webRoot=path.join(root,'web-games/diag-web');
  fs.mkdirSync(webRoot,{recursive:true});
  fs.writeFileSync(path.join(webRoot,'index.html'),'<!doctype html><html><head><title>Diag</title></head><body><button>Play</button></body></html>\n','utf8');
  const result=planVibe2AutonomousTask({
    status:{projects:[]},
    catalog:{games:[{id:'diag-web',webPath:'/web-games/diag-web/',hasWebArchive:true,homepageWebPlayable:true,homepageCategory:'development-confirmed'}]},
    queue:{tasks:[]},repoRoot:root,maxConcurrentTasks:4
  });
  assert.equal(result.planned,true);
  assert.equal(result.task.gameId,'diag-web');
  assert.equal(result.task.id,'diag-web-existing-web-assessment-v1');
  assert.deepEqual([...result.task.responsibleFiles],['web-games/diag-web/index.html']);
  assert.equal(result.task.evidence.includes('existing-web-assessment-required'),true);
  assert.equal(result.task.evidence.includes('strategy-decision:EXPLORATION'),true);
  assert.equal(result.task.ownerDirective,true);
});

test('planner groups disjoint post-assessment candidates into one work package',()=>{
  const root=tempRepo();
  const webRoot=path.join(root,'web-games/dev-web');
  fs.writeFileSync(path.join(webRoot,'index.html'),`<!doctype html><html><head><title>Dev</title></head><body data-spatial-dimension="2.5d" style="perspective:800px"><main>${'x'.repeat(900)}</main><button>Play</button></body></html>\n`,'utf8');
  fs.writeFileSync(path.join(webRoot,'extra.js'),'// TODO: harden secondary UI path\n','utf8');
  const assessed={id:'dev-web-existing-web-assessment-v1',gameId:'dev-web',target:'web',sourceRoot:'web-games/dev-web',status:'verified',goal:'assessment complete',evidence:['existing-web-assessment-required']};
  const result=planVibe2AutonomousTasks({
    status:{projects:[]},
    catalog:{games:[{id:'dev-web',webPath:'/web-games/dev-web/',hasWebArchive:true,homepageWebPlayable:true,homepageCategory:'development-confirmed'}]},
    queue:{tasks:[assessed]},repoRoot:root,maxConcurrentTasks:4
  });
  assert.equal(result.planned,true);
  assert.equal(result.packages.length,1);
  assert.equal(result.packages[0].tasks.length,2);
  assert.equal(new Set(result.packages[0].tasks.map(task=>task.packageId)).size,1);
  const responsible=result.packages[0].tasks.map(task=>[...task.responsibleFiles]);
  assert.equal(responsible[0].some(file=>responsible[1].includes(file)),false);
});

test('completed diagnostic package is never recreated after assessment and completion',()=>{
  const root=tempRepo();
  const webRoot=path.join(root,'web-games/diag-web');
  fs.mkdirSync(webRoot,{recursive:true});
  fs.writeFileSync(path.join(webRoot,'index.html'),`<!doctype html><html><head><title>Diag</title></head><body data-spatial-dimension="2.5d" style="perspective:800px"><main>${'x'.repeat(900)}</main><button>Play</button></body></html>`,'utf8');
  const diagCatalog={games:[{id:'diag-web',webPath:'/web-games/diag-web/',hasWebArchive:true,homepageWebPlayable:true,homepageCategory:'development-confirmed'}]};
  const assessed={id:'diag-web-existing-web-assessment-v1',gameId:'diag-web',target:'web',sourceRoot:'web-games/diag-web',status:'verified',goal:'assessment complete',evidence:['existing-web-assessment-required']};
  const first=planVibe2AutonomousTask({status:{projects:[]},catalog:diagCatalog,queue:{tasks:[assessed]},repoRoot:root,maxConcurrentTasks:4});
  assert.equal(first.planned,true);
  const firstKeys=first.task.evidence.filter(x=>x.startsWith('diagnostic-key:'));
  assert.equal(firstKeys.length>0,true);
  const done={...first.task,status:'verified',result:'PASS'};
  const second=planVibe2AutonomousTask({status:{projects:[]},catalog:diagCatalog,queue:{tasks:[assessed,done]},repoRoot:root,maxConcurrentTasks:4});
  if(second.planned){
    assert.notEqual(second.task.id,first.task.id);
    const secondKeys=second.task.evidence.filter(x=>x.startsWith('diagnostic-key:'));
    assert.equal(secondKeys.some(x=>firstKeys.includes(x)),false);
  }else{
    assert.equal(['CAUSAL_REPLAN_REQUIRED','AWAITING_INDEPENDENT_CAUSAL_SIGNAL'].includes(second.reason),true);
  }
});

test('completed Unity package is never recreated after completion and tiny seed uses explicit expansion scopes',()=>{
  const root=tempRepo();
  const unityOnlyCatalog={games:[{id:'demo',homepageCategory:'release-confirmed'}]};
  const first=planVibe2AutonomousTask({status,catalog:unityOnlyCatalog,queue:{tasks:[]},repoRoot:root,maxConcurrentTasks:4});
  assert.equal(first.planned,true);
  const autoExpanded=first.task.evidence.includes('work-package-auto-expanded');
  const parallelPackage=(first.packages?.[0]?.tasks||[]).length>1;
  assert.equal(autoExpanded||parallelPackage,true);
  if(autoExpanded){
    assert.equal(first.task.evidence.filter(value=>value.startsWith('work-package-scope:')).length>=3,true);
    assert.equal(first.task.packageWorkUnits>first.task.taskWorkUnits,true);
  }else{
    assert.equal(parallelPackage,true);
    assert.equal(first.packages[0].accepted,true);
  }
  const done={...first.task,status:'verified',result:'PASS'};
  const second=planVibe2AutonomousTask({status,catalog:unityOnlyCatalog,queue:{tasks:[done]},repoRoot:root,maxConcurrentTasks:4});
  if(second.planned){
    assert.notEqual(second.task.id,first.task.id);
  }else{
    assert.equal(['CAUSAL_REPLAN_REQUIRED','AWAITING_INDEPENDENT_CAUSAL_SIGNAL'].includes(second.reason),true);
  }
});


test('creative rebuild receives verified multi-project transformative recombination context',()=>{
  const root=tempRepo();
  const webRoot=path.join(root,'web-games','dev-web');
  fs.writeFileSync(path.join(webRoot,'index.html'),'<!doctype html><html><body>STATUS: 준비<button data-action="start">검증 루프</button></body></html>','utf8');
  const recombinationMemory={
    version:1,
    recipes:[{
      id:'recombine-demo',
      sourceProjects:['block-blast','commercial-game'],
      featureBlend:['board-grid-placement','short-session','touch-input'],
      transformationOperator:'change-core-goal',
      authority:'transformative-recombination-context-only',
      assetStrategy:{newAssetRequired:true,outputMustBeNewExpression:true,rawPixelReuseAllowed:false},
      codeStrategy:{newImplementationRequired:true,verbatimSourceReuseAllowed:false}
    }]
  };
  const result=planVibe2AutonomousTask({
    status:{projects:[]},
    catalog:{games:[{id:'dev-web',name:'Dev Web',webPath:'/web-games/dev-web/',hasWebArchive:true,homepageWebPlayable:true,homepageCategory:'development-confirmed'}]},
    queue:{tasks:[]},
    repoRoot:root,
    maxConcurrentTasks:4,
    recombinationMemory
  });
  assert.equal(result.planned,true);
  assert.equal(result.task.gameId,'dev-web');
  assert.match(result.task.goal,/TRANSFORMATIVE_RECOMBINATION_CONTEXT/);
  assert.match(result.task.goal,/new code\/asset expression|새 코드\/새 에셋 표현/i);
  assert.equal(result.task.evidence.includes('recombination-recipe:recombine-demo'),true);
  assert.equal(result.task.evidence.includes('recombination-copy-mode:NO'),true);
  assert.equal(result.task.evidence.includes('recombination-original-modifier-required:YES'),true);
});


test('stale runtime repair state cannot reopen source work when catalog authority is no longer development confirmed',()=>{
  const root=tempRepo();
  const gameId='stale-runtime-state';
  const stale={
    id:`${gameId}-web-base-implementation-v1`,gameId,target:'web',department:'development',type:'implementation',
    sourceRoot:`web-games/${gameId}`,responsibleFiles:[`web-games/${gameId}/index.html`],goal:'[WEB_BASE_IMPLEMENTATION] old bootstrap',
    releaseState:'development-confirmed',status:'cancelled',retries:0,maxRetries:2,blocker:'production-authority-inactive:DESIGN_ONLY',
    evidence:['source-root-bootstrap-required']
  };
  const result=planVibe2AutonomousTasks({
    status:{projects:[]},
    catalog:{games:[{id:gameId,name:'Stale Runtime State',productionClass:'DESIGN_ONLY',homepageCategory:'design-only',lifecycleState:'ACTIVE'}]},
    developmentQueue:{items:[{gameId,gameName:'Stale Runtime State',status:'ACTIVE',productionClass:'DEVELOPMENT_CONFIRMED',currentStep:'VIBE_WEB_BASE_IMPLEMENTATION',canonicalState:'WEB_VIBE_REPAIR_REQUIRED',webSourcePath:`web-games/${gameId}`,sourcePath:`web-games/${gameId}`}]},
    queue:{maxConcurrentTasks:20,tasks:[stale]},repoRoot:root,maxConcurrentTasks:20
  });
  const preserved=result.queue.tasks.find(row=>row.id===stale.id);
  assert.equal(preserved.status,'cancelled');
  assert.equal(preserved.blocker,'production-authority-inactive:DESIGN_ONLY');
});


test('preservation pilot bypasses generic Web assessment and queues ASSET_ADAPTATION first',()=>{
  const root=tempRepo();
  const gameId='preservation-web';
  const sourceRoot=path.join(root,'web-games',gameId);
  fs.mkdirSync(sourceRoot,{recursive:true});
  fs.writeFileSync(path.join(sourceRoot,'index.html'),'<!doctype html><html><body><canvas id="game"></canvas></body></html>\n','utf8');
  const result=planVibe2AutonomousTasks({
    status:{projects:[]},
    catalog:{games:[{id:gameId,name:'Preservation Web',productionClass:'DEVELOPMENT_CONFIRMED',lifecycleState:'ACTIVE',homepageWebPlayable:false,hasWebArchive:false}]},
    developmentQueue:{items:[{
      gameId,gameName:'Preservation Web',status:'ACTIVE',productionClass:'DEVELOPMENT_CONFIRMED',
      webSourcePath:`web-games/${gameId}`,sourcePath:`web-games/${gameId}`,
      ownerPreservationPresentationUpgrade:true,presentationFirstPass:'ASSET_ADAPTATION'
    }]},
    queue:{maxConcurrentTasks:4,tasks:[]},repoRoot:root,maxConcurrentTasks:4
  });
  const task=result.tasks.find(row=>row.gameId===gameId);
  assert.ok(task);
  assert.equal(task.id,`${gameId}-presentation-asset-adaptation-v1`);
  assert.ok(task.evidence.includes('presentation-pass:ASSET_ADAPTATION'));
  assert.notEqual(task.id,`${gameId}-existing-web-assessment-v1`);
  assert.notEqual(task.id,`${gameId}-existing-web-development-continuation-v1`);
});

test('preservation presentation task is restored instead of superseded by generic Web repair',()=>{
  const root=tempRepo();
  const gameId='preserve-repair-web';
  const sourceRoot=path.join(root,'web-games',gameId);
  fs.mkdirSync(sourceRoot,{recursive:true});
  fs.writeFileSync(path.join(sourceRoot,'index.html'),'<!doctype html><html><body><canvas id="game"></canvas></body></html>\n','utf8');
  const cancelled={
    id:`${gameId}-presentation-asset-adaptation-v1`,
    gameId,target:'web',department:'development',type:'implementation',
    sourceRoot:`web-games/${gameId}`,responsibleFiles:[`web-games/${gameId}/index.html`],
    goal:'asset adaptation',releaseState:'development-confirmed',status:'cancelled',retries:1,
    blocker:'superseded-by:VIBE_WEB_REPAIR',lastOutcome:'SUPERSEDED_BY_EXACT_WEB_REPAIR',
    evidence:['presentation-quality-pipeline:v1','presentation-pass:ASSET_ADAPTATION']
  };
  const result=planVibe2AutonomousTasks({
    status:{projects:[]},
    catalog:{games:[{id:gameId,name:'Preserve Repair Web',productionClass:'DEVELOPMENT_CONFIRMED',lifecycleState:'ACTIVE',homepageWebPlayable:false,hasWebArchive:true,webPath:`/web-games/${gameId}/`}]},
    developmentQueue:{items:[{
      gameId,gameName:'Preserve Repair Web',status:'ACTIVE',productionClass:'DEVELOPMENT_CONFIRMED',
      currentStep:'VIBE_WEB_BASE_IMPLEMENTATION',canonicalState:'WEB_VIBE_REPAIR_REQUIRED',
      webSourcePath:`web-games/${gameId}`,sourcePath:`web-games/${gameId}`,
      ownerPreservationPresentationUpgrade:true,presentationFirstPass:'ASSET_ADAPTATION'
    }]},
    queue:{maxConcurrentTasks:4,tasks:[cancelled]},repoRoot:root,maxConcurrentTasks:4
  });
  const restored=result.queue.tasks.find(row=>row.id===cancelled.id);
  assert.equal(restored.status,'queued');
  assert.equal(restored.blocker,null);
  assert.equal(restored.lastOutcome,'RESTORED_OWNER_PRESERVATION_PRESENTATION');
  assert.ok(restored.evidence.includes('owner-preservation-presentation-preempts-generic-web-repair'));
});

test('first studio build-up cycle establishes presentation baseline even when noisy nonvisual signals exist',()=>{
  const root=tempRepo();
  const gameId='studio-first-cycle';
  const webRoot=path.join(root,'web-games',gameId);
  fs.mkdirSync(webRoot,{recursive:true});
  fs.writeFileSync(path.join(webRoot,'index.html'),'<!doctype html><html><body><canvas id="game"></canvas></body></html>\n','utf8');
  const project={
    gameId,name:'Studio First Cycle',engine:'web',releaseState:'development-confirmed',projectPath:`web-games/${gameId}`,
    developmentValidation:{blockers:['MOBILE_TOUCH_ACTION_NOT_CONNECTED'],nextAction:'repair input later'}
  };
  const task=findStudioContinuousImprovementTask(project,root,{tasks:[]});
  assert.ok(task);
  assert.equal(task.studioQualityEvolution.phase,'BUILD_UP');
  assert.equal(task.studioQualityEvolution.focusPillar,'PRESENTATION');
  assert.equal(task.studioQualityEvolution.visibleRenderDeltaRequired,true);
  assert.ok(task.evidence.includes('graphics-evolution-before-after-comparison-required'));
});

test('legacy verified studio cycle without presentation is corrected to presentation on the next cycle',()=>{
  const root=tempRepo();
  const gameId='studio-legacy-baseline-recovery';
  const webRoot=path.join(root,'web-games',gameId);
  fs.mkdirSync(webRoot,{recursive:true});
  fs.writeFileSync(path.join(webRoot,'index.html'),'<!doctype html><html><body><canvas id="game"></canvas></body></html>\n','utf8');
  const project={
    gameId,name:'Studio Legacy Baseline Recovery',engine:'web',releaseState:'development-confirmed',projectPath:`web-games/${gameId}`,
    developmentValidation:{blockers:['MOBILE_TOUCH_ACTION_NOT_CONNECTED']}
  };
  const legacy={
    id:`${gameId}-studio-evolution-v1`,
    gameId,target:'web',sourceRoot:`web-games/${gameId}`,status:'verified',lastOutcome:'PASS',
    evidence:['studio-quality-loop:v1'],
    studioQualityEvolution:{version:1,cycle:1,phase:'BUILD_UP',focusPillar:'STABILITY',nextCycleRequired:true}
  };
  const next=findStudioContinuousImprovementTask(project,root,{tasks:[legacy]});
  assert.ok(next);
  assert.equal(next.studioQualityEvolution.cycle,2);
  assert.equal(next.studioQualityEvolution.phase,'OPTIMIZE');
  assert.equal(next.studioQualityEvolution.focusPillar,'PRESENTATION');
  assert.equal(next.studioQualityEvolution.visibleRenderDeltaRequired,true);
  assert.ok(next.evidence.includes('graphics-evolution-before-after-comparison-required'));
});

test('verified studio quality package advances to a new large studio cycle instead of returning to micro work',()=>{
  const root=tempRepo();
  const gameId='studio-repeat-cycle';
  const webRoot=path.join(root,'web-games',gameId);
  fs.mkdirSync(webRoot,{recursive:true});
  fs.writeFileSync(path.join(webRoot,'index.html'),'<!doctype html><html><body><canvas id="game"></canvas></body></html>\n','utf8');
  writeStudioDesign(root,gameId);
  const project={gameId,name:'Studio Repeat Cycle',engine:'web',releaseState:'development-confirmed',projectPath:`web-games/${gameId}`};
  const first=findStudioContinuousImprovementTask(project,root,{tasks:[]});
  assert.ok(first);
  assert.equal(first.studioQualityEvolution.cycle,1);
  assert.equal(first.workUnits,7);
  const verified={...first,status:'verified',packageId:`${gameId}-wp-cycle1`,packageWorkUnits:10,lastOutcome:'PASS'};
  const second=findStudioContinuousImprovementTask(project,root,{tasks:[verified]});
  assert.ok(second);
  assert.equal(second.studioQualityEvolution.cycle,2);
  assert.equal(second.studioQualityEvolution.baselineId,first.id);
  assert.equal(second.studioQualityEvolution.nextCycleRequired,true);
  assert.equal(second.workUnits,7);
  assert.notEqual(second.id,first.id);
});

test('older studio failure does not pin later verified cycles in repair',()=>{
  const root=tempRepo();
  const gameId='studio-repair-recovery';
  const webRoot=path.join(root,'web-games',gameId);
  fs.mkdirSync(webRoot,{recursive:true});
  fs.writeFileSync(path.join(webRoot,'index.html'),'<!doctype html><html><body><canvas id="game"></canvas></body></html>\n','utf8');
  const project={gameId,name:'Studio Repair Recovery',engine:'web',releaseState:'development-confirmed',projectPath:`web-games/${gameId}`};
  const failed={
    id:`${gameId}-studio-evolution-v1`,gameId,target:'web',sourceRoot:`web-games/${gameId}`,
    status:'failed',evidence:['studio-quality-loop:v1'],
    studioQualityEvolution:{version:1,cycle:1,phase:'BUILD_UP',focusPillar:'PRESENTATION',nextCycleRequired:true}
  };
  const verified={
    id:`${gameId}-studio-evolution-v2`,gameId,target:'web',sourceRoot:`web-games/${gameId}`,
    status:'verified',lastOutcome:'PASS',evidence:['studio-quality-loop:v1'],
    studioQualityEvolution:{version:1,cycle:2,phase:'BUILD_UP',focusPillar:'CORE_FUN',nextCycleRequired:true}
  };
  const next=findStudioContinuousImprovementTask(project,root,{tasks:[failed,verified]});
  assert.ok(next);
  assert.equal(next.id,`${gameId}-studio-evolution-v3`);
  assert.equal(next.studioQualityEvolution.cycle,2);
  assert.equal(next.studioQualityEvolution.phase,'OPTIMIZE');
  assert.equal(next.workUnits,7);
  assert.equal(next.maxRetries,null);
  assert.ok(next.evidence.includes('studio-quality-next-cycle-required:YES'));
});

test('full planner replaces low-value micro work with queued studio packages and repeats after verification',()=>{
  const root=tempRepo();
  const gameId='studio-full-queue-repeat';
  const webRoot=path.join(root,'web-games',gameId);
  fs.mkdirSync(webRoot,{recursive:true});
  fs.writeFileSync(path.join(webRoot,'index.html'),`<!doctype html><html><body data-spatial-dimension="2.5d" style="perspective:900px"><canvas id="game"></canvas><main>${'world '.repeat(180)}</main></body></html>\n`,'utf8');
  const validationDir=path.join(root,'design',gameId,'2026-09-24');
  fs.mkdirSync(validationDir,{recursive:true});
  fs.writeFileSync(path.join(validationDir,'development-validation-status.json'),JSON.stringify({gameId,state:'PASS',webStrictScore:90,blockers:[]},null,2),'utf8');

  const assessment={
    id:`${gameId}-existing-web-assessment-v1`,gameId,target:'web',department:'development',type:'implementation',
    sourceRoot:`web-games/${gameId}`,responsibleFiles:[`web-games/${gameId}/index.html`],goal:'assessment complete',
    releaseState:'development-confirmed',status:'verified',retries:0,evidence:['existing-web-assessment-required']
  };
  const micro={
    id:`${gameId}-diagnostic-bundle-touch`,gameId,target:'web',department:'development',type:'implementation',
    sourceRoot:`web-games/${gameId}`,responsibleFiles:[`web-games/${gameId}/index.html`],
    goal:'touch-action 필요 여부만 최소 수정',priority:'normal',releaseState:'development-confirmed',status:'queued',retries:0,
    evidence:['diagnostic:TOUCH_ACTION_UNSPECIFIED','diagnostic-key:TOUCH_ACTION_UNSPECIFIED:index.html']
  };
  const catalogOnly={games:[{
    id:gameId,name:'Studio Full Queue Repeat',productionClass:'DEVELOPMENT_CONFIRMED',lifecycleState:'ACTIVE',
    hasWebArchive:true,homepageWebPlayable:true,webPath:`/web-games/${gameId}/`
  }]};
  let working={maxConcurrentTasks:4,tasks:[assessment,micro]};
  let first=null;
  for(let i=0;i<20&&!first;i++){
    const result=planVibe2AutonomousTasks({
      status:{projects:[]},catalog:catalogOnly,queue:working,repoRoot:root,
      maxConcurrentTasks:4,queueMaxConcurrentTasks:4,planningBacklogTarget:4,planningBacklogMinimum:0
    });
    working=result.queue;
    first=working.tasks.find(row=>
      row.gameId===gameId
      &&String(row.status||'').trim().toLowerCase()==='queued'
      &&(row.evidence||[]).includes('studio-quality-loop:v1')
    )||null;
    if(first)break;
    working={...working,tasks:working.tasks.map(row=>
      row.gameId===gameId&&['queued','running'].includes(String(row.status||'').trim().toLowerCase())
        ?{...row,status:'verified',blocker:null,lastOutcome:'PASS',evidence:[...new Set([...(row.evidence||[]),'test-full-planner-prerequisite-verified'])]}
        :row
    )};
  }
  const cancelled=working.tasks.find(row=>row.id===micro.id);
  assert.equal(cancelled?.status,'cancelled');
  assert.equal(cancelled?.blocker,'superseded-by:STUDIO_QUALITY_PACKAGE');
  assert.ok(first,'full planner must eventually queue the first studio-quality package');
  assert.equal(first.taskWorkUnits,7);
  assert.equal(first.studioQualityEvolution?.cycle,1);
  assert.equal(first.studioQualityEvolution?.requiredConnectedImprovements?.min,3);
  assert.equal(first.studioQualityEvolution?.requiredConnectedImprovements?.max,null);
  assert.ok(first.evidence.includes('studio-quality-loop:v1'));

  working={...working,tasks:working.tasks.map(row=>
    row.id===first.id?{...row,status:'verified',blocker:null,lastOutcome:'PASS'}:row
  )};
  let second=null;
  for(let i=0;i<12&&!second;i++){
    const result=planVibe2AutonomousTasks({
      status:{projects:[]},catalog:catalogOnly,queue:working,repoRoot:root,
      maxConcurrentTasks:4,queueMaxConcurrentTasks:4,planningBacklogTarget:4,planningBacklogMinimum:0
    });
    working=result.queue;
    second=working.tasks.find(row=>
      row.gameId===gameId
      &&row.id!==first.id
      &&String(row.status||'').trim().toLowerCase()==='queued'
      &&(row.evidence||[]).includes('studio-quality-loop:v1')
    )||null;
    if(second)break;
    working={...working,tasks:working.tasks.map(row=>
      row.gameId===gameId&&['queued','running'].includes(String(row.status||'').trim().toLowerCase())
        ?{...row,status:'verified',blocker:null,lastOutcome:'PASS',evidence:[...new Set([...(row.evidence||[]),'test-full-planner-between-cycle-verified'])]}
        :row
    )};
  }
  assert.ok(second,'verified studio package must cause the full planner to queue another large studio cycle');
  assert.notEqual(second.id,first.id);
  assert.equal(second.taskWorkUnits,7);
  assert.equal(second.studioQualityEvolution?.cycle,2);
  assert.equal(second.studioQualityEvolution?.baselineId,first.id);
  assert.equal(second.studioQualityEvolution?.nextCycleRequired,true);
  assert.ok(second.evidence.includes('studio-quality-loop:v1'));
});

test('web presentation planner discovers a real non-index game entry file',()=>{
  const root=tempRepo();
  const gameId='legacy-entry-web';
  const webRoot=path.join(root,'web-games',gameId);
  fs.mkdirSync(webRoot,{recursive:true});
  fs.writeFileSync(path.join(webRoot,'legacy_entry_web-28.html'),'<!doctype html><html><body><canvas id="game"></canvas></body></html>\n','utf8');
  const project={gameId,name:'Legacy Entry Web',engine:'web',releaseState:'development-confirmed',projectPath:`web-games/${gameId}`};
  const task=findWebPresentationQualityTask(project,root,{tasks:[]});
  assert.ok(task);
  assert.equal(task.id,`${gameId}-presentation-asset-adaptation-v1`);
  assert.ok(task.responsibleFiles.includes(`web-games/${gameId}/legacy_entry_web-28.html`));
});

test('presentation quality passes are queued in canonical order',()=>{
  const root=tempRepo();
  const gameId='presentation-web';
  const sourceRoot=path.join(root,'web-games',gameId);
  fs.mkdirSync(sourceRoot,{recursive:true});
  fs.writeFileSync(path.join(sourceRoot,'index.html'),'<!doctype html><html><body><canvas id="game"></canvas></body></html>\n','utf8');
  const project={
    gameId,
    engine:'web',
    releaseState:'development-confirmed',
    projectPath:`web-games/${gameId}`,
    name:'Presentation Web'
  };
  const done=(id)=>({
    id,gameId,target:'web',department:'development',type:'implementation',sourceRoot:`web-games/${gameId}`,
    responsibleFiles:[`web-games/${gameId}/index.html`],goal:'done',releaseState:'development-confirmed',
    status:'verified',retries:0,maxRetries:2,evidence:[]
  });
  let queue={tasks:[]};
  const first=findWebPresentationQualityTask(project,root,queue);
  assert.equal(first.id,`${gameId}-presentation-asset-adaptation-v1`);
  assert.ok(first.evidence.includes('presentation-pass:ASSET_ADAPTATION'));
  assert.equal(first.estimatedRisk,'high');
  assert.equal(first.speculativeEligible,true);
  assert.equal(first.atomicNeuronMode,'PER_TASK_MICRO_FANIN');
  assert.equal(first.atomicCompletionRequired,true);
  assert.ok(first.evidence.includes('atomic-neuron-stream:presentation'));
  assert.ok(first.evidence.includes('atomic-neuron-micro-fanin:per-task'));
  assert.ok(first.evidence.includes('graphics-atomic-candidate-isolation-required'));
  assert.ok(first.evidence.includes('presentation-real-runtime-graphics:v2'));
  assert.ok(first.evidence.includes('presentation-marker-only-pass:forbidden'));
  assert.ok(first.evidence.includes('presentation-placeholder-primitives:forbidden'));
  queue={tasks:[done(first.id)]};
  const second=findWebPresentationQualityTask(project,root,queue);
  assert.equal(second.id,`${gameId}-presentation-living-motion-v1`);
  assert.ok(second.evidence.includes('presentation-pass:LIVING_MOTION'));
  queue={tasks:[done(first.id),done(second.id)]};
  const third=findWebPresentationQualityTask(project,root,queue);
  assert.equal(third.id,`${gameId}-presentation-animation-feel-v1`);
  assert.ok(third.evidence.includes('presentation-preserve-gameplay-semantics'));
  const stages=[first,second,third];
  for(const suffix of ['vfx','audio-feel','camera-language']){
    queue={tasks:stages.map(row=>done(row.id))};
    const next=findWebPresentationQualityTask(project,root,queue);
    assert.equal(next.id,`${gameId}-presentation-${suffix}-v1`);
    stages.push(next);
  }
  queue={tasks:stages.map(row=>done(row.id))};
  const finalPass=findWebPresentationQualityTask(project,root,queue);
  assert.equal(finalPass.id,`${gameId}-presentation-polish-mobile-v1`);
  assert.match(finalPass.goal,/data-presentation-quality-version="2"/);
  assert.equal(finalPass.estimatedRisk,'high');
  assert.equal(finalPass.speculativeEligible,true);
  assert.equal(finalPass.atomicNeuronMode,'PER_TASK_MICRO_FANIN');
});


test('web art direction and presentation are mandatory before platform handoff',()=>{
  const root=tempRepo();
  const gameId='art-direction-web-base';
  const result=planVibe2AutonomousTasks({
    status:{projects:[]},
    catalog:{games:[{
      id:gameId,
      name:'Art Direction Web Base',
      productionClass:'DEVELOPMENT_CONFIRMED',
      lifecycleState:'ACTIVE',
      homepageWebPlayable:false,
      hasWebArchive:false
    }]},
    developmentQueue:{items:[{
      gameId,
      gameName:'Art Direction Web Base',
      status:'ACTIVE',
      productionClass:'DEVELOPMENT_CONFIRMED',
      currentStep:'VIBE_WEB_BASE_IMPLEMENTATION',
      canonicalState:'WEB_VIBE_REPAIR_REQUIRED',
      webSourcePath:`web-games/${gameId}`,
      sourcePath:`web-games/${gameId}`
    }]},
    queue:{maxConcurrentTasks:20,tasks:[]},
    repoRoot:root,
    maxConcurrentTasks:20
  });
  const task=result.tasks.find(row=>row.gameId===gameId);
  assert.ok(task);
  assert.equal(task.supervisionContract.version,3);
  assert.ok(task.supervisionContract.stages.includes('GAME_ART_DIRECTION_STYLE_LOCK'));
  assert.ok(task.supervisionContract.stages.includes('PRESENTATION_IMPLEMENTATION'));
  assert.ok(task.supervisionContract.stages.includes('REAL_RUNTIME_VISUAL_EVIDENCE_REVIEW'));
  assert.ok(task.supervisionContract.hardReject.includes('PLACEHOLDER_MONSTER_OR_CHARACTER'));
  assert.ok(task.supervisionContract.hardReject.includes('PRIMITIVE_ONLY_CHARACTER_OR_MONSTER'));
  assert.ok(task.supervisionContract.hardReject.includes('CONTEXT_MISMATCH_BACKGROUND'));
  assert.ok(task.supervisionContract.hardReject.includes('INCOMPLETE_ACTION_MOTION_SET'));
  assert.ok(task.supervisionContract.hardReject.includes('MISSING_COMBAT_DEATH_MOTION'));
  assert.ok(task.supervisionContract.hardReject.includes('MARKER_ONLY_PRESENTATION_PASS'));
  assert.match(task.goal,/게임별 아트 방향과 Style Lock/);
  assert.match(task.goal,/idle\/move\/attack\/hit\/death/);
  assert.match(task.goal,/임시 모형 몹/);
  assert.match(task.goal,/Roblox\/Unity\/UEFN 이관/);
});

test('web repair converts presentation blockers into concrete visual and motion repair hints',()=>{
  const root=tempRepo();
  const gameId='presentation-runtime-repair';
  const sourceRoot=path.join(root,'web-games',gameId);
  fs.mkdirSync(sourceRoot,{recursive:true});
  fs.writeFileSync(path.join(sourceRoot,'index.html'),'<!doctype html><html><body><main>existing game</main></body></html>','utf8');
  const result=planVibe2AutonomousTasks({
    status:{projects:[]},
    catalog:{games:[{
      id:gameId,
      name:'Presentation Runtime Repair',
      productionClass:'DEVELOPMENT_CONFIRMED',
      lifecycleState:'ACTIVE',
      homepageWebPlayable:false,
      hasWebArchive:true,
      webPath:`/web-games/${gameId}/`
    }]},
    developmentQueue:{items:[{
      gameId,
      gameName:'Presentation Runtime Repair',
      status:'ACTIVE',
      productionClass:'DEVELOPMENT_CONFIRMED',
      currentStep:'VIBE_WEB_REPAIR',
      canonicalState:'WEB_VIBE_REPAIR_REQUIRED',
      webSourcePath:`web-games/${gameId}`,
      sourcePath:`web-games/${gameId}`,
      vibeWebRequestedStage:'WEB_REPAIR',
      vibeWebImplementationReason:'PRESENTATION_RUNTIME_QUALITY_REQUIRED|ACTION_PRESENTATION_QUALITY_REQUIRED'
    }]},
    queue:{maxConcurrentTasks:20,tasks:[]},
    repoRoot:root,
    maxConcurrentTasks:20
  });
  const task=result.tasks.find(row=>row.gameId===gameId);
  assert.ok(task);
  assert.match(task.goal,/Style Lock/);
  assert.match(task.goal,/임시 모형 몹/);
  assert.match(task.goal,/무맥락 배경/);
  assert.match(task.goal,/idle\/move\/attack\/hit\/death/);
  assert.match(task.goal,/anticipation\/windup/);
  assert.match(task.goal,/impact 이벤트/);
});


test('presentation planner adds genre-specific UI animation and commercial readiness guidance without changing pass order',()=>{
  const root=tempRepo();
  const gameId='survival-commercial-web';
  const sourceRoot=path.join(root,'web-games',gameId);
  fs.mkdirSync(sourceRoot,{recursive:true});
  fs.writeFileSync(path.join(sourceRoot,'index.html'),'<!doctype html><html><body><canvas id="game"></canvas></body></html>\n','utf8');
  const project={
    gameId,
    name:'Survival Commercial',
    genre:'survival',
    engine:'web',
    releaseState:'development-confirmed',
    projectPath:`web-games/${gameId}`
  };
  const first=findWebPresentationQualityTask(project,root,{tasks:[]});
  assert.equal(first.id,`${gameId}-presentation-asset-adaptation-v1`);
  assert.ok(first.evidence.includes('quality-contract:genrePresentationQualityContract'));
  assert.ok(first.evidence.includes('quality-contract:commercialReadinessGate'));
  assert.ok(first.evidence.includes('presentation-canonical-order-preserved'));
  assert.match(first.goal,/생존 장르/);
  assert.match(first.goal,/동일 HUD를 복사하지 않는다/);
  assert.match(first.goal,/첫 10분/);

  const done=(task)=>({...task,status:'verified'});
  const second=findWebPresentationQualityTask(project,root,{tasks:[done(first)]});
  assert.equal(second.id,`${gameId}-presentation-living-motion-v1`);
  const third=findWebPresentationQualityTask(project,root,{tasks:[done(first),done(second)]});
  assert.equal(third.id,`${gameId}-presentation-animation-feel-v1`);
  assert.match(third.goal,/idle\/move\/attack\/hit\/death/);
  assert.match(third.goal,/무기·캐릭터 체형·몬스터 공격 방식/);
});

test('final Web presentation pass requires commercial readiness marker and keeps canonical pass sequence',()=>{
  const root=tempRepo();
  const gameId='commercial-marker-web';
  const sourceRoot=path.join(root,'web-games',gameId);
  fs.mkdirSync(sourceRoot,{recursive:true});
  fs.writeFileSync(path.join(sourceRoot,'index.html'),'<!doctype html><html><body><canvas></canvas></body></html>\n','utf8');
  const project={gameId,name:'Commercial Marker',genre:'tycoon',engine:'web',releaseState:'development-confirmed',projectPath:`web-games/${gameId}`};
  const tasks=[];
  const expected=['asset-adaptation','living-motion','animation-feel','vfx','audio-feel','camera-language'];
  for(const suffix of expected){
    const next=findWebPresentationQualityTask(project,root,{tasks});
    assert.equal(next.id,`${gameId}-presentation-${suffix}-v1`);
    tasks.push({...next,status:'verified'});
  }
  const finalPass=findWebPresentationQualityTask(project,root,{tasks});
  assert.equal(finalPass.id,`${gameId}-presentation-polish-mobile-v1`);
  assert.match(finalPass.goal,/data-presentation-quality-version="2"/);
  assert.match(finalPass.goal,/data-commercial-readiness-version="1"/);
  assert.match(finalPass.goal,/타이쿤\/시뮬레이션/);
  assert.match(finalPass.goal,/Commercial Readiness/);
});


test('owner focused games and all released games receive focused caretaker priority',()=>{
  const root=tempRepo();
  fs.mkdirSync(path.join(root,'web-games','fantasy-survival'),{recursive:true});
  fs.writeFileSync(path.join(root,'web-games','fantasy-survival','index.html'),'<!doctype html><html><body>game</body></html>');
  fs.mkdirSync(path.join(root,'web-games','released-demo'),{recursive:true});
  fs.writeFileSync(path.join(root,'web-games','released-demo','index.html'),'<!doctype html><html><body>game</body></html>');
  const roadmapPath=path.join(root,'company-learning','platform-release-roadmap.json');
  fs.mkdirSync(path.dirname(roadmapPath),{recursive:true});
  fs.writeFileSync(roadmapPath,JSON.stringify({developmentLifecycleMachine:{focusedDevelopmentCaretakers:{enabled:true,ownerFocusedGameIds:['fantasy-survival','daechung-rpg'],includeAllReleaseConfirmed:true}}}));
  const catalog={games:[
    {id:'fantasy-survival',name:'마력숲 생존기',productionClass:'DEVELOPMENT_CONFIRMED',lifecycleState:'ACTIVE',homepageWebPlayable:true,hasWebArchive:true,webPath:'/web-games/fantasy-survival/'},
    {id:'released-demo',name:'Released Demo',productionClass:'RELEASE_CONFIRMED',lifecycleState:'ACTIVE',homepageWebPlayable:true,hasWebArchive:true,webPath:'/web-games/released-demo/'}
  ]};
  const result=planVibe2AutonomousTasks({
    status:{projects:[]},catalog,
    developmentQueue:{items:[{gameId:'fantasy-survival',gameName:'마력숲 생존기',status:'ACTIVE',productionClass:'DEVELOPMENT_CONFIRMED',currentStep:'VIBE_WEB_BASE_IMPLEMENTATION',canonicalState:'WEB_VIBE_REPAIR_REQUIRED',webSourcePath:'web-games/fantasy-survival',sourcePath:'web-games/fantasy-survival'}]},
    queue:{maxConcurrentTasks:20,tasks:[]},repoRoot:root,maxConcurrentTasks:20
  });
  const focus=result.tasks.find(row=>row.gameId==='fantasy-survival');
  assert.ok(focus);
  assert.equal(focus.priority,'critical');
  assert.equal(focus.ownerDirective,true);
  assert.equal(focus.maxRetries,null);
  assert.equal(focus.retryPolicy,'UNLIMITED_CAUSAL_REPAIR');
  assert.equal(focus.packageLongWorkProtected,true);
  assert.equal(focus.packageRole,'implementation-owner');
  assert.equal(focus.focusedCaretaker,true);
  assert.equal(focus.caretakerStickyOwnership,true);
  assert.ok(focus.evidence.includes('focused-caretaker:yes'));
});


test('central Unity Web development floor routes new DEVELOPMENT_CONFIRMED work to canonical Unity source',()=>{
  const root=tempRepo();
  const gameId='unity-first-stage-game';
  fs.writeFileSync(path.join(root,'company-learning','platform-release-roadmap.json'),JSON.stringify({
    authority:'MACHINE_EXECUTION_CONTRACT',
    machineSourceOfTruth:'company-learning/platform-release-roadmap.json',
    humanDocumentRequired:false,
    unityWebFirstStage:{
      status:'OWNER_DIRECT_LOCKED',
      scope:'UPPER_PLATFORM_PREDEVELOPMENT_FULL_DEVELOPMENT_QA_FLOOR',
      developmentAdmissionAuthority:true,
      validationSurfaceOnly:false,
      canonicalGameSourceRoot:'unity-games/<gameId>/',
      publicWebBuildRoot:'web-games/<gameId>/'
    },
    directNativeDualPlatformDevelopment:{
      upperPlatformAdmissionMigration:{grandfatherGameIds:['cozy-island','daechung-rpg']}
    }
  },null,2),'utf8');
  const result=planVibe2AutonomousTasks({
    status:{projects:[]},
    catalog:{games:[{
      id:gameId,name:'Unity First Stage',
      productionClass:'DEVELOPMENT_CONFIRMED',
      homepageCategory:'development-confirmed',
      lifecycleState:'ACTIVE'
    }]},
    developmentQueue:{items:[{
      gameId,gameName:'Unity First Stage',
      status:'ACTIVE',
      productionClass:'DEVELOPMENT_CONFIRMED',
      currentStep:'VIBE_WEB_BASE_IMPLEMENTATION',
      canonicalState:'WEB_VIBE_REPAIR_REQUIRED',
      selectedPlatform:'ROBLOX',
      webSourcePath:`web-games/${gameId}`
    }]},
    queue:{maxConcurrentTasks:4,tasks:[]},
    repoRoot:root,maxConcurrentTasks:4
  });
  assert.equal(result.planned,true);
  const task=result.tasks.find(row=>row.gameId===gameId);
  assert.ok(task);
  assert.equal(task.target,'unity');
  assert.equal(task.sourceRoot,`unity-games/${gameId}`);
  assert.deepEqual(task.responsibleFiles,[
    `unity-games/${gameId}/Assets/Scripts/GameCore.cs`,
    `unity-games/${gameId}/Assets/Scripts/RuntimeBootstrap.cs`
  ]);
  assert.ok(task.evidence.includes('unity-web-first-stage'));
  assert.ok(task.evidence.includes('unity-web-source-root-bootstrap-required'));
  assert.match(task.goal,/UNITY_PROJECT_SOURCE_ROOT_BOOTSTRAP_ALLOWED/);
  assert.match(task.goal,/1차 Web 게임 원본을 unity-games\//);
  assert.match(task.goal,/HTML\/Canvas\/PlayCanvas 신규 게임을 만들지 않는다/);
});


test('missing current upper-platform readiness requeues real Unity Web code and graphics repair',()=>{
  const root=tempRepo();
  const gameId='unity-web-readiness-repair';
  fs.writeFileSync(path.join(root,'company-learning','platform-release-roadmap.json'),JSON.stringify({
    authority:'MACHINE_EXECUTION_CONTRACT',
    machineSourceOfTruth:'company-learning/platform-release-roadmap.json',
    humanDocumentRequired:false,
    unityWebFirstStage:{
      status:'OWNER_DIRECT_LOCKED',
      scope:'UPPER_PLATFORM_PREDEVELOPMENT_FULL_DEVELOPMENT_QA_FLOOR',
      developmentAdmissionAuthority:true,
      validationSurfaceOnly:false,
      canonicalGameSourceRoot:'unity-games/<gameId>/',
      publicWebBuildRoot:'web-games/<gameId>/'
    },
    directNativeDualPlatformDevelopment:{
      upperPlatformAdmissionMigration:{grandfatherGameIds:['cozy-island','daechung-rpg']}
    }
  },null,2),'utf8');
  const unityRoot=path.join(root,'unity-games',gameId);
  fs.mkdirSync(path.join(unityRoot,'Assets','Scripts'),{recursive:true});
  fs.mkdirSync(path.join(unityRoot,'Assets','Editor'),{recursive:true});
  fs.mkdirSync(path.join(unityRoot,'Packages'),{recursive:true});
  fs.mkdirSync(path.join(unityRoot,'ProjectSettings'),{recursive:true});
  fs.writeFileSync(path.join(unityRoot,'Assets','Scripts','GameCore.cs'),'public class GameCore {}\n');
  fs.writeFileSync(path.join(unityRoot,'Assets','Scripts','RuntimeBootstrap.cs'),[
    'using UnityEngine;',
    'public class RuntimeBootstrap : MonoBehaviour {',
    'void Update(){ if(Application.absoluteURL.Contains("qa=1")){} }',
    'void Evidence(){ Debug.Log("JAEWOON_UNITY_WEB_QA BOOT"); Debug.Log("JAEWOON_UNITY_WEB_QA STATE"); Debug.Log("JAEWOON_UNITY_WEB_QA MOBILE_TARGET"); Debug.Log("JAEWOON_UNITY_WEB_QA MOBILE_INPUT"); Debug.Log("JAEWOON_UNITY_WEB_QA CORE_FUN"); }',
    '}'
  ].join('\n'));
  fs.writeFileSync(path.join(unityRoot,'Assets','Scripts','Visuals.cs'),'public class Visuals { public void Animate(){} }\n');
  fs.writeFileSync(path.join(unityRoot,'Assets','Editor','Build.cs'),'public static class WebBuild { public static void BuildWeb(){} }\n');
  fs.writeFileSync(path.join(unityRoot,'Packages','manifest.json'),'{}\n');
  fs.writeFileSync(path.join(unityRoot,'ProjectSettings','ProjectVersion.txt'),'m_EditorVersion: 6000.6.0f1\n');
  const result=planVibe2AutonomousTasks({
    status:{projects:[]},
    catalog:{games:[{id:gameId,name:'Readiness Repair',productionClass:'DEVELOPMENT_CONFIRMED',homepageCategory:'development-confirmed',lifecycleState:'ACTIVE'}]},
    developmentQueue:{items:[{
      gameId,gameName:'Readiness Repair',status:'ACTIVE',productionClass:'DEVELOPMENT_CONFIRMED',
      currentStep:'TARGET_PLATFORM_SOURCE_BIND',canonicalState:'DEVELOPMENT_CONFIRMED',
      selectedPlatform:'ROBLOX',
      minimumDesignContract:{pass:true},
      platformDesignProfiles:{ROBLOX:{source:'design.json'},UNITY:{source:'design.json'}},
      concurrentTargetPlatforms:['ROBLOX','UNITY']
    }]},
    queue:{maxConcurrentTasks:4,tasks:[]},repoRoot:root,maxConcurrentTasks:4
  });
  const task=result.tasks.find(row=>row.gameId===gameId&&String(row.id).includes('unity-web-repair'));
  assert.ok(task);
  assert.equal(task.target,'unity');
  assert.ok(task.evidence.includes('unity-web-development-floor:v1'));
  assert.ok(task.evidence.includes('upper-platform-readiness:READINESS_EVIDENCE_MISSING'));
  assert.ok(task.responsibleFiles.includes(`unity-games/${gameId}/Assets/Scripts/Visuals.cs`));
  assert.match(task.goal,/CODE\/GRAPHICS\/WEBGL_BUILD\/ACTUAL_PLAY\/QA\/PORTABILITY/);
  assert.match(task.goal,/실제 2명 이상 상태 동기화/);
});

test('explicit grandfathered native progress is not rewound into the Unity Web repair floor',()=>{
  const root=tempRepo();
  fs.writeFileSync(path.join(root,'company-learning','platform-release-roadmap.json'),JSON.stringify({
    authority:'MACHINE_EXECUTION_CONTRACT',
    machineSourceOfTruth:'company-learning/platform-release-roadmap.json',
    humanDocumentRequired:false,
    unityWebFirstStage:{
      status:'OWNER_DIRECT_LOCKED',
      scope:'UPPER_PLATFORM_PREDEVELOPMENT_FULL_DEVELOPMENT_QA_FLOOR',
      developmentAdmissionAuthority:true,
      validationSurfaceOnly:false,
      canonicalGameSourceRoot:'unity-games/<gameId>/',
      publicWebBuildRoot:'web-games/<gameId>/'
    },
    directNativeDualPlatformDevelopment:{
      upperPlatformAdmissionMigration:{grandfatherGameIds:['cozy-island','daechung-rpg']}
    }
  },null,2),'utf8');
  const projects=collectProjects(
    {projects:[]},
    {games:[{id:'cozy-island',name:'Cozy',productionClass:'DEVELOPMENT_CONFIRMED',homepageCategory:'development-confirmed',lifecycleState:'ACTIVE'}]},
    root,
    {items:[{
      gameId:'cozy-island',gameName:'Cozy',status:'ACTIVE',productionClass:'DEVELOPMENT_CONFIRMED',
      currentStep:'TARGET_PLATFORM_RUNTIME_FOUNDATION',selectedPlatform:'ROBLOX',
      minimumDesignContract:{pass:true},
      platformDesignProfiles:{ROBLOX:{source:'design.json'},UNITY:{source:'design.json'}},
      concurrentTargetPlatforms:['ROBLOX','UNITY'],
      robloxFoundationF0Passed:true,
      robloxProjectPath:'roblox-games/cozy-island'
    }]}
  );
  assert.equal(projects.some(row=>row.gameId==='cozy-island'&&row.firstStageUnityWeb===true),false);
});


function verifiedPresentationFoundation(project,root){
  const tasks=[];
  for(let i=0;i<7;i++){
    const next=findWebPresentationQualityTask(project,root,{tasks});
    assert.ok(next,'expected presentation foundation pass '+i);
    tasks.push({...next,status:'verified'});
  }
  return tasks;
}

test('graphics evolution does not self-requeue without a new presentation signal',()=>{
  const root=tempRepo();
  const gameId='graphics-evolution-idle';
  const sourceRoot=path.join(root,'web-games',gameId);
  fs.mkdirSync(sourceRoot,{recursive:true});
  fs.writeFileSync(path.join(sourceRoot,'index.html'),'<!doctype html><html><body><canvas></canvas></body></html>\n','utf8');
  const project={gameId,name:'Graphics Evolution Idle',engine:'web',releaseState:'development-confirmed',projectPath:`web-games/${gameId}`};
  const tasks=verifiedPresentationFoundation(project,root);
  assert.equal(findWebPresentationQualityTask(project,root,{tasks}),null);
});

test('new owner presentation signal reopens only affected stages and same signal cannot loop',()=>{
  const root=tempRepo();
  const gameId='graphics-evolution-owner';
  const sourceRoot=path.join(root,'web-games',gameId);
  fs.mkdirSync(sourceRoot,{recursive:true});
  fs.writeFileSync(path.join(sourceRoot,'index.html'),'<!doctype html><html><body><canvas></canvas></body></html>\n','utf8');
  const project={gameId,name:'Graphics Evolution Owner',engine:'web',releaseState:'development-confirmed',projectPath:`web-games/${gameId}`};
  const foundation=verifiedPresentationFoundation(project,root);
  const ownerSignal={
    id:'owner-bear-motion-1',gameId,target:'web',department:'development',type:'implementation',
    sourceRoot:`web-games/${gameId}`,responsibleFiles:[`web-games/${gameId}/index.html`],
    goal:'곰 움직임과 공격 모션을 더 무겁고 부드럽게 바꿔',
    releaseState:'development-confirmed',status:'verified',ownerDirective:true,evidence:['owner-directive:graphics']
  };
  const first=findWebPresentationQualityTask(project,root,{tasks:[...foundation,ownerSignal]});
  assert.equal(first.id,`${gameId}-presentation-living-motion-v2`);
  assert.equal(first.graphicsEvolutionCycle,2);
  assert.equal(first.graphicsEvolutionTrigger.source,'OWNER_CHANGE_REQUEST');
  assert.deepEqual(first.graphicsEvolutionTrigger.affectedPasses,['LIVING_MOTION','ANIMATION_FEEL']);
  assert.ok(first.evidence.includes('graphics-evolution-unlimited-generations:yes'));

  const second=findWebPresentationQualityTask(project,root,{tasks:[...foundation,ownerSignal,{...first,status:'verified'}]});
  assert.equal(second.id,`${gameId}-presentation-animation-feel-v2`);
  const done=[...foundation,ownerSignal,{...first,status:'verified'},{...second,status:'verified'}];
  assert.equal(findWebPresentationQualityTask(project,root,{tasks:done}),null);
});

test('new presentation evidence advances to the next unlimited evolution generation',()=>{
  const root=tempRepo();
  const gameId='graphics-evolution-next';
  const sourceRoot=path.join(root,'web-games',gameId);
  fs.mkdirSync(sourceRoot,{recursive:true});
  fs.writeFileSync(path.join(sourceRoot,'index.html'),'<!doctype html><html><body><canvas></canvas></body></html>\n','utf8');
  const project={gameId,name:'Graphics Evolution Next',engine:'web',releaseState:'development-confirmed',projectPath:`web-games/${gameId}`};
  const foundation=verifiedPresentationFoundation(project,root);
  const oldCycle={
    id:`${gameId}-presentation-vfx-v999`,gameId,target:'web',department:'development',type:'implementation',
    sourceRoot:`web-games/${gameId}`,responsibleFiles:[`web-games/${gameId}/index.html`],
    goal:'old graphics cycle',releaseState:'development-confirmed',status:'verified',
    evidence:['presentation-pass:VFX','graphics-evolution:evidence-driven','graphics-evolution-cycle:999','graphics-evolution-trigger:old-signal']
  };
  const ownerSignal={
    id:'owner-camera-1000',gameId,target:'web',department:'development',type:'implementation',
    sourceRoot:`web-games/${gameId}`,responsibleFiles:[`web-games/${gameId}/index.html`],
    goal:'보스 카메라 줌과 화면 연출을 더 자연스럽게 바꿔',
    releaseState:'development-confirmed',status:'verified',ownerDirective:true,evidence:['owner-directive:graphics']
  };
  const next=findWebPresentationQualityTask(project,root,{tasks:[...foundation,oldCycle,ownerSignal]});
  assert.equal(next.id,`${gameId}-presentation-camera-language-v1000`);
  assert.equal(next.graphicsEvolutionCycle,1000);
  assert.ok(next.evidence.includes('graphics-evolution-unlimited-generations:yes'));
});

test('runtime presentation problem evidence can reopen the matching graphics scope',()=>{
  const root=tempRepo();
  const gameId='graphics-evolution-runtime';
  const sourceRoot=path.join(root,'web-games',gameId);
  fs.mkdirSync(sourceRoot,{recursive:true});
  fs.writeFileSync(path.join(sourceRoot,'index.html'),'<!doctype html><html><body><canvas></canvas></body></html>\n','utf8');
  const project={
    gameId,name:'Graphics Evolution Runtime',engine:'web',releaseState:'development-confirmed',
    projectPath:`web-games/${gameId}`,
    developmentValidation:{blockers:['VFX_CLUTTER_RUNTIME_READABILITY_REGRESSION']}
  };
  const foundation=verifiedPresentationFoundation(project,root);
  const next=findWebPresentationQualityTask(project,root,{tasks:foundation});
  assert.equal(next.id,`${gameId}-presentation-vfx-v2`);
  assert.equal(next.graphicsEvolutionTrigger.source,'RUNTIME_CAPTURE_COMPARISON');
  assert.deepEqual(next.graphicsEvolutionTrigger.affectedPasses,['VFX','POLISH_MOBILE']);
});

test('unrelated gameplay owner change does not create a graphics evolution cycle',()=>{
  const root=tempRepo();
  const gameId='graphics-evolution-unrelated';
  const sourceRoot=path.join(root,'web-games',gameId);
  fs.mkdirSync(sourceRoot,{recursive:true});
  fs.writeFileSync(path.join(sourceRoot,'index.html'),'<!doctype html><html><body><canvas></canvas></body></html>\n','utf8');
  const project={gameId,name:'Graphics Evolution Unrelated',engine:'web',releaseState:'development-confirmed',projectPath:`web-games/${gameId}`};
  const foundation=verifiedPresentationFoundation(project,root);
  const ownerSignal={
    id:'owner-gold-change',gameId,target:'web',department:'development',type:'implementation',
    sourceRoot:`web-games/${gameId}`,responsibleFiles:[`web-games/${gameId}/index.html`],
    goal:'몬스터 처치 골드를 30에서 35로 바꿔',
    releaseState:'development-confirmed',status:'verified',ownerDirective:true,evidence:['owner-directive:gameplay']
  };
  assert.equal(findWebPresentationQualityTask(project,root,{tasks:[...foundation,ownerSignal]}),null);
});


test('repeated identical owner presentation request creates a new evolution generation',()=>{
  const root=tempRepo();
  const gameId='graphics-owner-repeat';
  const sourceRoot=path.join(root,'web-games',gameId);
  fs.mkdirSync(sourceRoot,{recursive:true});
  fs.writeFileSync(path.join(sourceRoot,'index.html'),'<!doctype html><html><body><canvas></canvas></body></html>\n','utf8');
  const project={gameId,name:'Graphics Owner Repeat',engine:'web',releaseState:'development-confirmed',projectPath:`web-games/${gameId}`};
  const foundation=verifiedPresentationFoundation(project,root);
  const owner1={
    id:'owner-repeat-1',gameId,target:'web',department:'development',type:'implementation',
    sourceRoot:`web-games/${gameId}`,responsibleFiles:[`web-games/${gameId}/index.html`],
    goal:'곰 공격 모션을 더 무겁게 해',releaseState:'development-confirmed',status:'verified',ownerDirective:true,
    evidence:['owner-request-instance:req-1','owner-presentation-change:곰 공격 모션을 더 무겁게 해']
  };
  const v2a=findWebPresentationQualityTask(project,root,{tasks:[...foundation,owner1]});
  assert.equal(v2a.id,`${gameId}-presentation-living-motion-v2`);
  const v2b=findWebPresentationQualityTask(project,root,{tasks:[...foundation,owner1,{...v2a,status:'verified'}]});
  assert.equal(v2b.id,`${gameId}-presentation-animation-feel-v2`);
  const owner2={...owner1,id:'owner-repeat-2',evidence:['owner-request-instance:req-2','owner-presentation-change:곰 공격 모션을 더 무겁게 해']};
  const v3=findWebPresentationQualityTask(project,root,{tasks:[...foundation,owner1,{...v2a,status:'verified'},{...v2b,status:'verified'},owner2]});
  assert.equal(v3.id,`${gameId}-presentation-living-motion-v3`);
  assert.equal(v3.graphicsEvolutionTrigger.source,'OWNER_CHANGE_REQUEST');
  assert.equal(v3.graphicsEvolutionTrigger.ownerRepeatCount,2);
  assert.ok(v3.graphicsEvolutionTrigger.score>v2a.graphicsEvolutionTrigger.score);
  assert.equal(v3.graphicsEvolutionDecision.alternativesRequired,true);
  assert.ok(v3.evidence.includes('graphics-evolution-alternatives-required:YES'));
  assert.ok(v3.evidence.includes('graphics-evolution-signal-event:req-2'));
  assert.match(v3.goal,/최소 2개 접근/);
});

test('automatic quality opportunity is scored and can reopen graphics without owner request',()=>{
  const root=tempRepo();
  const gameId='graphics-quality-gap';
  const sourceRoot=path.join(root,'web-games',gameId);
  fs.mkdirSync(sourceRoot,{recursive:true});
  fs.writeFileSync(path.join(sourceRoot,'index.html'),'<!doctype html><html><body><canvas></canvas></body></html>\n','utf8');
  const project={
    gameId,name:'Graphics Quality Gap',engine:'web',releaseState:'development-confirmed',
    projectPath:`web-games/${gameId}`,
    developmentValidation:{blockers:['GOLDEN_SCENE_STYLE_GAP_PLAYER_SILHOUETTE']}
  };
  const foundation=verifiedPresentationFoundation(project,root);
  const next=findWebPresentationQualityTask(project,root,{tasks:foundation});
  assert.equal(next.id,`${gameId}-presentation-asset-adaptation-v2`);
  assert.equal(next.graphicsEvolutionTrigger.source,'GOLDEN_SCENE_OR_VISUAL_TARGET_GAP');
  assert.ok(next.graphicsEvolutionTrigger.score>0);
  assert.ok(next.evidence.some(x=>x.startsWith('graphics-evolution-priority-score:')));
  assert.ok(next.evidence.includes('graphics-evolution-before-after-comparison-required'));
  assert.ok(next.evidence.includes('graphics-evolution-verified-result-return-to-learning-required'));
  assert.deepEqual(next.graphicsEvolutionDecision.loop,['OBSERVE','SCORE','CHOOSE','IMPROVE','COMPARE','LEARN','REPLAN']);
});

test('higher-value owner signal outranks automatic presentation issue',()=>{
  const root=tempRepo();
  const gameId='graphics-smart-priority';
  const sourceRoot=path.join(root,'web-games',gameId);
  fs.mkdirSync(sourceRoot,{recursive:true});
  fs.writeFileSync(path.join(sourceRoot,'index.html'),'<!doctype html><html><body><canvas></canvas></body></html>\n','utf8');
  const project={
    gameId,name:'Graphics Smart Priority',engine:'web',releaseState:'development-confirmed',
    projectPath:`web-games/${gameId}`,
    developmentValidation:{blockers:['VFX_CLUTTER_RUNTIME_READABILITY_REGRESSION']}
  };
  const foundation=verifiedPresentationFoundation(project,root);
  const owner={
    id:'owner-smart-1',gameId,target:'web',department:'development',type:'implementation',
    sourceRoot:`web-games/${gameId}`,responsibleFiles:[`web-games/${gameId}/index.html`],
    goal:'플레이어 공격 모션을 더 강렬하고 부드럽게 해',releaseState:'development-confirmed',status:'verified',ownerDirective:true,
    evidence:['owner-request-instance:smart-1']
  };
  const next=findWebPresentationQualityTask(project,root,{tasks:[...foundation,owner]});
  assert.equal(next.graphicsEvolutionTrigger.source,'OWNER_CHANGE_REQUEST');
  assert.ok(next.graphicsEvolutionTrigger.score>=100);
  assert.equal(next.ownerDirective,true);
});

test('flat or unstartable Web games enter 2.5D repair after canonical existing-Web assessment',()=>{
  const root=tempRepo();
  const gameId='flat-start-game';
  const dir=path.join(root,'web-games',gameId);
  fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(path.join(dir,'index.html'),`<!doctype html><html><body><button id="startBtn">게임 시작</button><script>
  const startBtn=document.getElementById('startBtn'); startBtn.onclick=()=>{document.body.dataset.state='playing'};
  </script></body></html>`,'utf8');
  const assessment={
    id:`${gameId}-existing-web-assessment-v1`,gameId,target:'web',department:'development',type:'implementation',
    sourceRoot:`web-games/${gameId}`,responsibleFiles:[`web-games/${gameId}/index.html`],
    goal:'canonical existing web assessment completed',releaseState:'development-confirmed',
    status:'verified',retries:0,maxRetries:2,blocker:null,evidence:['existing-web-assessment-required']
  };
  const result=planVibe2AutonomousTasks({
    status:{projects:[]},
    catalog:{games:[{id:gameId,name:'Flat Start Game',productionClass:'DEVELOPMENT_CONFIRMED',lifecycleState:'ACTIVE',homepageWebPlayable:false,hasWebArchive:true,webPath:`/web-games/${gameId}/`}]},
    developmentQueue:{items:[]},
    queue:{maxConcurrentTasks:4,tasks:[assessment]},
    repoRoot:root,
    maxConcurrentTasks:4
  });
  assert.equal(result.planned,true);
  const task=result.tasks.find(row=>row.gameId===gameId&&/web-startup-spatial-repair-v1$/.test(row.id));
  assert.ok(task);
  assert.equal(task.productionMode,'SUPERVISED_VIBE_COAUTHORING');
  assert.equal(task.supervisionContract?.required,true);
  assert.ok(task.evidence.includes('owner-directive:all-web-games-must-start'));
  assert.ok(task.evidence.includes('owner-directive:minimum-2.5d-final-gameplay'));
  assert.ok(task.evidence.some(value=>value.includes('MINIMUM_2_5D_PRESENTATION_REQUIRED')));
  assert.match(task.goal,/최소 2\.5D/);
  assert.equal(task.maxRetries,null);
});


test('existing Roblox games automatically receive a Studio asset selection handoff backfill task',()=>{
  const root=tempRepo();
  fs.writeFileSync(path.join(root,'company-learning','platform-release-roadmap.json'),JSON.stringify({
    authority:'MACHINE_EXECUTION_CONTRACT',machineSourceOfTruth:'company-learning/platform-release-roadmap.json',
    assetProductionParallelContract:{enabled:true}
  },null,2),'utf8');
  const gameId='legacy-rbx';
  const shared=path.join(root,'roblox-games',gameId,'shared');
  fs.mkdirSync(shared,{recursive:true});
  fs.writeFileSync(path.join(shared,'GameConfig.luau'),'return { GameName = "Legacy" }\n','utf8');
  const project={gameId,name:'Legacy Roblox',engine:'roblox',releaseState:'development-confirmed',projectPath:`roblox-games/${gameId}`};
  const task=findRobloxStudioAssetBackfillTask(project,root,{tasks:[]});
  assert.ok(task);
  assert.equal(task.id,`${gameId}-roblox-studio-asset-backfill-v1`);
  assert.equal(task.target,'roblox');
  assert.equal(task.studioAssetBackfill,true);
  assert.equal(task.presentationPass,'ASSET_ADAPTATION');
  assert.match(task.goal,/플래너는 선택·전달만 하며 게임 소스를 직접 수정하지 않는다/);
  assert.match(task.goal,/Vibe2\/Vibe3가 현재 책임 Luau 소스에 실제 적용/);
  assert.match(task.goal,/정확한 Roblox target-engine atom selection match/);
  assert.ok(task.evidence.includes('roblox-studio-asset-planner-source-mutation:forbidden'));
  assert.ok(task.evidence.includes('roblox-studio-asset-vibe-application:required'));
  assert.ok(task.evidence.includes('roblox-studio-asset-runtime-promotion:blocked-until-pass'));

  fs.writeFileSync(path.join(shared,'GameConfig.luau'),'local STUDIO_ASSET_BINDING_VERSION = 1\nreturn { StudioAssets = { BindingVersion = 1 } }\n','utf8');
  assert.equal(findRobloxStudioAssetBackfillTask(project,root,{tasks:[]}),null);
});




test('runtime PASS compiles to non-firing neural RUNTIME_RESULT evidence',()=>{
  const compiled=compileRuntimeNeuralEvent({
    gameId:'runtime-pass',
    queueRobloxRuntimeObserved:true,
    queueRobloxRuntimePassed:true,
    queueRobloxSourceCommit:'a'.repeat(40),
    queueRobloxFailureStage:'INDEPENDENT_QA'
  },{inhibitors:[],actionRecommendation:{failureStage:'TARGET_PLATFORM_RUNTIME'}});
  assert.ok(compiled);
  assert.equal(compiled.event.type,'RUNTIME_RESULT');
  assert.equal(compiled.event.outcome,'PASS');
  assert.equal(compiled.route.fireAllowed,false);
  assert.equal(compiled.route.authorityMode,'SHADOW');
  assert.ok(compiled.evidence.some(value=>value.startsWith('neural-event-shadow:')));
});

test('verified runtime failure may enter gated existing-scheduler route',()=>{
  const compiled=compileRuntimeNeuralEvent({
    gameId:'runtime-fail',
    queueRobloxRuntimeObserved:true,
    queueRobloxRuntimePassed:false,
    queueRobloxFailureStage:'TARGET_PLATFORM_RUNTIME',
    queueRobloxFailureSignature:'server-boot-timeout',
    queueRobloxSourceCommit:'b'.repeat(40),
    queueRobloxRootCauseVerified:true,
    queueRobloxResponsibleSystem:'ROBLOX_RUNTIME'
  },{inhibitors:[],actionRecommendation:{failureStage:'TARGET_PLATFORM_RUNTIME'}});
  assert.ok(compiled);
  assert.equal(compiled.event.outcome,'FAIL');
  assert.equal(compiled.rootCauseVerified,true);
  assert.equal(compiled.route.fireAllowed,true);
  assert.equal(compiled.route.authorityMode,'GATED');
  assert.equal(compiled.route.policyMutationAllowed,false);
  assert.ok(compiled.evidence.some(value=>value.startsWith('neural-event-gated:')));
});

test('cross-platform runtime evidence stays platform-scoped and cannot gate a different target task',()=>{
  const compiled=compileRuntimeNeuralEvent({
    gameId:'runtime-cross-platform',
    engine:'roblox',
    queueRuntimeObserved:true,
    queueRuntimeEvidencePlatform:'UNITY',
    queueRuntimePassed:false,
    queueRuntimeFailureStage:'TARGET_PLATFORM_RUNTIME',
    queueRuntimeFailureSignature:'unity-player-runtime-failure',
    queueRuntimeSourceRevision:'c'.repeat(40),
    queueRuntimeRootCauseVerified:true,
    queueRuntimeResponsibleSystem:'UNITY_RUNTIME'
  },{inhibitors:[],actionRecommendation:{failureStage:'TARGET_PLATFORM_RUNTIME'}});
  assert.ok(compiled);
  assert.equal(compiled.event.type,'RUNTIME_RESULT');
  assert.equal(compiled.event.platform,'UNITY');
  assert.match(compiled.event.id,/\|RUNTIME_RESULT\|UNITY\|/);
  assert.equal(compiled.platformMatchesProject,false);
  assert.equal(compiled.route.fireAllowed,false);
  assert.equal(compiled.route.authorityMode,'SHADOW');
  assert.ok(compiled.evidence.includes('runtime-neural-event-platform:UNITY'));
  assert.ok(compiled.evidence.includes('runtime-neural-event-platform-match:NO'));
  const marker=compiled.evidence.find(value=>value.startsWith('neural-event-shadow:'));
  assert.ok(marker);
  const payload=JSON.parse(decodeURIComponent(marker.slice('neural-event-shadow:'.length)));
  assert.equal(payload.eventPlatform,'UNITY');
});

test('verified same-platform runtime failure requeues only the unambiguous existing task',()=>{
  const compiled=compileRuntimeNeuralEvent({
    gameId:'runtime-gated-requeue',
    engine:'roblox',
    queueRuntimeObserved:true,
    queueRuntimeEvidencePlatform:'ROBLOX',
    queueRuntimePassed:false,
    queueRuntimeFailureStage:'TARGET_PLATFORM_RUNTIME',
    queueRuntimeFailureSignature:'server-boot-timeout',
    queueRuntimeSourceRevision:'a'.repeat(40),
    queueRuntimeRootCauseVerified:true,
    queueRuntimeResponsibleSystem:'ROBLOX_RUNTIME'
  });
  assert.ok(compiled);
  assert.equal(compiled.route.authorityMode,'GATED');
  assert.equal(compiled.route.fireAllowed,true);
  assert.equal(compiled.route.queueMutationAllowed,true);

  const result=applyRuntimeNeuralEventsToQueue({
    maxConcurrentTasks:20,
    tasks:[
      {
        id:'roblox-runtime-repair',
        gameId:'runtime-gated-requeue',
        target:'roblox',
        department:'development',
        type:'implementation',
        goal:'repair runtime',
        responsibleFiles:['roblox-games/runtime-gated-requeue/server/Game.server.luau'],
        priority:'normal',
        releaseState:'development-confirmed',
        status:'blocked',
        blocker:'runtime-failure',
        sourceRoot:'roblox-games/runtime-gated-requeue'
      },
      {
        id:'unity-unrelated',
        gameId:'runtime-gated-requeue',
        target:'unity',
        department:'development',
        type:'implementation',
        goal:'unity work',
        responsibleFiles:['unity-games/runtime-gated-requeue/Assets/Scripts/GameCore.cs'],
        priority:'normal',
        releaseState:'development-confirmed',
        status:'blocked',
        blocker:'unity-blocker',
        sourceRoot:'unity-games/runtime-gated-requeue'
      }
    ]
  },[compiled]);

  assert.equal(result.mutationCount,1);
  assert.equal(result.applied[0].taskId,'roblox-runtime-repair');
  assert.equal(result.applied[0].action,'REQUEUE_REPRIORITIZE_EXISTING_TASK');
  const repaired=result.queue.tasks.find(row=>row.id==='roblox-runtime-repair');
  assert.equal(repaired.status,'queued');
  assert.equal(repaired.priority,'high');
  assert.equal(repaired.blocker,null);
  assert.equal(repaired.lastOutcome,'RUNTIME_RESULT_GATED_REQUEUE');
  assert.ok(repaired.evidence.includes('runtime-neural-ingress:gated-existing-task-requeue'));
  assert.ok(repaired.evidence.includes('neural-gated-queue-mutation:REQUEUE_REPRIORITIZE'));
  const unrelated=result.queue.tasks.find(row=>row.id==='unity-unrelated');
  assert.equal(unrelated.status,'blocked');
  assert.equal(unrelated.blocker,'unity-blocker');
});

test('runtime neural ingress refuses ambiguous existing task mutation',()=>{
  const compiled=compileRuntimeNeuralEvent({
    gameId:'runtime-ambiguous',
    engine:'roblox',
    queueRuntimeObserved:true,
    queueRuntimeEvidencePlatform:'ROBLOX',
    queueRuntimePassed:false,
    queueRuntimeFailureStage:'TARGET_PLATFORM_RUNTIME',
    queueRuntimeFailureSignature:'same-runtime-failure',
    queueRuntimeSourceRevision:'b'.repeat(40),
    queueRuntimeRootCauseVerified:true,
    queueRuntimeResponsibleSystem:'ROBLOX_RUNTIME'
  });
  const task=id=>({
    id,
    gameId:'runtime-ambiguous',
    target:'roblox',
    department:'development',
    type:'implementation',
    goal:'repair runtime',
    responsibleFiles:[`roblox-games/runtime-ambiguous/${id}.luau`],
    priority:'normal',
    releaseState:'development-confirmed',
    status:'blocked',
    blocker:'runtime-failure',
    sourceRoot:'roblox-games/runtime-ambiguous'
  });
  const result=applyRuntimeNeuralEventsToQueue({maxConcurrentTasks:20,tasks:[task('a'),task('b')]},[compiled]);
  assert.equal(result.mutationCount,0);
  assert.equal(result.applied[0].reason,'AMBIGUOUS_EXISTING_TASK');
  assert.deepEqual(result.queue.tasks.map(row=>row.status),['blocked','blocked']);
});

test('unobserved runtime state does not invent a runtime neural event',()=>{
  assert.equal(compileRuntimeNeuralEvent({
    gameId:'runtime-pending',
    queueRobloxRuntimeObserved:false,
    queueRobloxRuntimePassed:false,
    queueRobloxFailureStage:'INDEPENDENT_QA'
  }),null);
});

test('verified company-runtime failure mutates an existing task even when planner capacity is full',()=>{
  const root=tempRepo();
  const gameId='runtime-gated-capacity';
  const existingTask={
    id:'runtime-gated-existing-task',
    gameId,
    target:'roblox',
    department:'development',
    type:'implementation',
    goal:'existing runtime repair',
    responsibleFiles:[`roblox-games/${gameId}/server/Game.server.luau`],
    dependencies:[],
    priority:'normal',
    releaseState:'development-confirmed',
    status:'blocked',
    blocker:'prior-runtime-failure',
    sourceRoot:`roblox-games/${gameId}`
  };
  const result=planVibe2AutonomousTasks({
    status:{projects:[]},
    catalog:{games:[{
      id:gameId,name:'Runtime Gated Capacity',
      productionClass:'DEVELOPMENT_CONFIRMED',
      homepageCategory:'development-confirmed',
      lifecycleState:'ACTIVE',
      robloxProjectPath:`roblox-games/${gameId}`
    }]},
    developmentQueue:{items:[{
      gameId,gameName:'Runtime Gated Capacity',
      status:'ACTIVE',
      canonicalState:'TARGET_PLATFORM_REPAIR_REQUIRED',
      currentStep:'TARGET_PLATFORM_RUNTIME',
      selectedPlatform:'ROBLOX',
      robloxProjectPath:`roblox-games/${gameId}`,
      executionEvidence:{
        platform:'ROBLOX',
        sourceRevision:'c'.repeat(40),
        runtimePassed:false,
        rootCauseVerified:true,
        responsibleSystem:'ROBLOX_RUNTIME',
        failureStage:'TARGET_PLATFORM_RUNTIME',
        failureSignature:'roblox:runtime-failure'
      }
    }]},
    queue:{maxConcurrentTasks:20,tasks:[existingTask]},
    repoRoot:root,
    maxConcurrentTasks:20,
    queueMaxConcurrentTasks:20,
    planningBacklogTarget:1,
    planningBacklogMinimum:0
  });
  assert.equal(result.planned,false);
  assert.equal(result.reason,'DEVELOPMENT_BACKLOG_TARGET_REACHED');
  assert.equal(result.runtimeNeuralEvents.length,1);
  assert.equal(result.runtimeNeuralMutations.filter(row=>row.mutated).length,1);
  const repaired=result.queue.tasks.find(row=>row.id===existingTask.id);
  assert.equal(repaired.status,'queued');
  assert.equal(repaired.priority,'high');
  assert.equal(repaired.blocker,null);
  assert.ok(repaired.evidence.includes('runtime-neural-ingress:gated-existing-task-requeue'));
  assert.ok(repaired.evidence.some(value=>value.startsWith('neural-event-gated:')));
});

test('company-runtime runtime result ingress is observed even when planner creates no task',()=>{
  const root=tempRepo();
  const gameId='runtime-observe-without-plan';
  const existingTask={
    id:'runtime-observe-existing-work',
    gameId,
    target:'roblox',
    department:'development',
    type:'implementation',
    goal:'existing queued work',
    responsibleFiles:[`roblox-games/${gameId}/shared/GameConfig.luau`],
    dependencies:[],
    priority:'normal',
    releaseState:'development-confirmed',
    status:'queued',
    sourceRoot:`roblox-games/${gameId}`
  };
  const result=planVibe2AutonomousTasks({
    status:{projects:[]},
    catalog:{games:[{
      id:gameId,name:'Runtime Observe Without Plan',
      productionClass:'DEVELOPMENT_CONFIRMED',
      homepageCategory:'development-confirmed',
      lifecycleState:'ACTIVE',
      robloxProjectPath:`roblox-games/${gameId}`
    }]},
    developmentQueue:{items:[{
      gameId,gameName:'Runtime Observe Without Plan',
      status:'ACTIVE',
      canonicalState:'TARGET_PLATFORM_REPAIR_REQUIRED',
      currentStep:'TARGET_PLATFORM_SOURCE_BIND',
      selectedPlatform:'ROBLOX',
      robloxProjectPath:`roblox-games/${gameId}`,
      executionEvidence:{
        platform:'UNITY',
        sourceRevision:'f'.repeat(40),
        runtimePassed:true,
        independentQaPassed:false,
        regressionPassed:false,
        failureStage:'INDEPENDENT_QA',
        failureSignature:'unity:independent-qa-pending'
      }
    }]},
    queue:{maxConcurrentTasks:20,tasks:[existingTask]},
    repoRoot:root,
    maxConcurrentTasks:20,
    queueMaxConcurrentTasks:20,
    planningBacklogTarget:1,
    planningBacklogMinimum:0
  });
  assert.equal(result.planned,false);
  assert.equal(result.reason,'DEVELOPMENT_BACKLOG_TARGET_REACHED');
  assert.equal(result.tasks.length,0);
  assert.equal(result.queue.tasks.length,1);
  assert.equal(result.queue.tasks[0].id,existingTask.id);
  assert.equal(result.queue.tasks[0].evidence.some(value=>value.startsWith('runtime-neural-event:')),false);
  assert.equal(result.runtimeNeuralEvents.length,1);
  const compiled=result.runtimeNeuralEvents[0];
  assert.equal(compiled.event.type,'RUNTIME_RESULT');
  assert.equal(compiled.event.platform,'UNITY');
  assert.equal(compiled.event.outcome,'PASS');
  assert.equal(compiled.platformMatchesProject,false);
  assert.equal(compiled.route.authorityMode,'SHADOW');
  assert.equal(compiled.route.fireAllowed,false);
  assert.ok(compiled.evidence.includes('runtime-neural-event:compiled'));
});

test('company-runtime UNITY execution evidence does not become Roblox runtime evidence during planner projection',()=>{
  const root=tempRepo();
  const gameId='runtime-platform-bridge';
  const sourceRoot=path.join(root,'roblox-games',gameId);
  fs.mkdirSync(path.join(sourceRoot,'client'),{recursive:true});
  fs.mkdirSync(path.join(sourceRoot,'server'),{recursive:true});
  fs.mkdirSync(path.join(sourceRoot,'shared'),{recursive:true});
  fs.writeFileSync(path.join(sourceRoot,'client','Game.client.luau'),'local function render() return true end\nreturn render\n','utf8');
  fs.writeFileSync(path.join(sourceRoot,'server','Game.server.luau'),'local function run() return true end\nreturn run\n','utf8');
  fs.writeFileSync(path.join(sourceRoot,'shared','GameConfig.luau'),'return { version = 1 }\n','utf8');
  const sha='e'.repeat(40);
  const result=planVibe2AutonomousTasks({
    status:{projects:[]},
    catalog:{games:[{
      id:gameId,name:'Runtime Platform Bridge',
      productionClass:'DEVELOPMENT_CONFIRMED',
      homepageCategory:'development-confirmed',
      lifecycleState:'ACTIVE',
      robloxProjectPath:`roblox-games/${gameId}`
    }]},
    developmentQueue:{items:[{
      gameId,gameName:'Runtime Platform Bridge',
      status:'ACTIVE',
      canonicalState:'TARGET_PLATFORM_REPAIR_REQUIRED',
      currentStep:'TARGET_PLATFORM_SOURCE_BIND',
      selectedPlatform:'ROBLOX',
      robloxProjectPath:`roblox-games/${gameId}`,
      executionEvidence:{
        platform:'UNITY',
        sourceRevision:sha,
        runtimePassed:true,
        independentQaPassed:false,
        regressionPassed:false,
        failureStage:'INDEPENDENT_QA',
        failureSignature:'unity:qa-pending'
      }
    }]},
    queue:{maxConcurrentTasks:20,tasks:[]},
    repoRoot:root,
    maxConcurrentTasks:20,
    planningBacklogTarget:20,
    planningBacklogMinimum:0
  });
  assert.equal(result.planned,true);
  const bridged=result.tasks.find(row=>row.gameId===gameId&&(row.evidence||[]).includes('runtime-neural-event:compiled'));
  assert.ok(bridged,'expected runtime evidence to reach a planned atomic task');
  assert.ok(bridged.evidence.includes('runtime-neural-event-platform:UNITY'));
  assert.ok(bridged.evidence.includes('runtime-neural-event-platform-match:NO'));
  assert.equal(bridged.evidence.some(value=>value.startsWith('neural-event-gated:')),false);
  const marker=bridged.evidence.find(value=>value.startsWith('neural-event-shadow:'));
  assert.ok(marker);
  const payload=JSON.parse(decodeURIComponent(marker.slice('neural-event-shadow:'.length)));
  assert.equal(payload.eventPlatform,'UNITY');
});

test('company-runtime nested Roblox execution evidence survives planner projection into repair context',()=>{
  const root=tempRepo();
  const gameId='runtime-evidence-bridge';
  const sourceRoot=path.join(root,'roblox-games',gameId);
  fs.mkdirSync(path.join(sourceRoot,'client'),{recursive:true});
  fs.mkdirSync(path.join(sourceRoot,'server'),{recursive:true});
  fs.mkdirSync(path.join(sourceRoot,'shared'),{recursive:true});
  fs.writeFileSync(path.join(sourceRoot,'client','Game.client.luau'),'local function render() return true end\nreturn render\n','utf8');
  fs.writeFileSync(path.join(sourceRoot,'server','Game.server.luau'),'local function run() return true end\nreturn run\n','utf8');
  fs.writeFileSync(path.join(sourceRoot,'shared','GameConfig.luau'),'return { version = 1 }\n','utf8');
  const sha='d'.repeat(40);
  const result=planVibe2AutonomousTasks({
    status:{projects:[]},
    catalog:{games:[{
      id:gameId,name:'Runtime Evidence Bridge',
      productionClass:'DEVELOPMENT_CONFIRMED',
      homepageCategory:'development-confirmed',
      lifecycleState:'ACTIVE',
      robloxProjectPath:`roblox-games/${gameId}`
    }]},
    developmentQueue:{items:[{
      gameId,gameName:'Runtime Evidence Bridge',
      status:'ACTIVE',
      canonicalState:'TARGET_PLATFORM_REPAIR_REQUIRED',
      currentStep:'TARGET_PLATFORM_SOURCE_BIND',
      selectedPlatform:'ROBLOX',
      robloxProjectPath:`roblox-games/${gameId}`,
      executionEvidence:{
        sourceRevision:sha,
        runtimePassed:true,
        independentQaPassed:false,
        regressionPassed:false,
        failureStage:'INDEPENDENT_QA',
        failureSignature:'qa:input-sync-mismatch'
      }
    }]},
    queue:{maxConcurrentTasks:20,tasks:[]},
    repoRoot:root,
    maxConcurrentTasks:20,
    planningBacklogTarget:20,
    planningBacklogMinimum:0
  });
  assert.equal(result.planned,true);
  const studio=result.tasks.find(row=>row.gameId===gameId&&(row.evidence||[]).includes('studio-quality-loop:v1'));
  assert.ok(studio,'expected studio repair/evolution task');
  assert.match(studio.goal,/INDEPENDENT_QA/);
  assert.equal(studio.studioQualityEvolution.explicitGap,'INDEPENDENT_QA');
  assert.ok(studio.evidence.includes('runtime-neural-event:compiled'));
  assert.ok(studio.evidence.includes('runtime-neural-event-outcome:PASS'));
  assert.ok(studio.evidence.includes('runtime-neural-event-authority:SHADOW'));
  assert.ok(studio.evidence.some(value=>value.startsWith('neural-event-shadow:')));
});


test('existing games receive holistic backfill on all five quality pillars without grandfather exemption',()=>{
  const root=tempRepo();
  const gameId='existing-holistic';
  const source=path.join(root,'roblox-games',gameId);
  fs.mkdirSync(path.join(source,'client'),{recursive:true});
  fs.mkdirSync(path.join(source,'server'),{recursive:true});
  fs.mkdirSync(path.join(source,'shared'),{recursive:true});
  fs.writeFileSync(path.join(source,'client','Visual.client.luau'),'local camera = workspace.CurrentCamera\n','utf8');
  fs.writeFileSync(path.join(source,'client','Input.client.luau'),'local input = {}\n','utf8');
  fs.writeFileSync(path.join(source,'server','Combat.server.luau'),'local combat = {}\n','utf8');
  fs.writeFileSync(path.join(source,'server','Progression.server.luau'),'local progression = {}\n','utf8');
  fs.writeFileSync(path.join(source,'shared','Save.luau'),'local save = {}\n','utf8');
  writeStudioDesign(root,gameId,{coreFun:'탐험과 전투 선택을 연결하는 재미',progressionDirection:'장비와 새 지역 해금으로 선택을 확장한다.'});
  const project={
    gameId,name:'Existing Holistic',engine:'roblox',releaseState:'development-confirmed',
    projectPath:`roblox-games/${gameId}`,existing:true,lifecycleState:'ACTIVE'
  };
  const tasks=findStudioContinuousImprovementTasks(project,root,{tasks:[]});
  assert.equal(tasks.length,5);
  assert.ok(tasks.every(row=>(row.evidence||[]).includes('existing-holistic-backfill:v1')));
  assert.ok(tasks.every(row=>(row.evidence||[]).includes('existing-game-grandfather-exemption:NO')));
  assert.ok(tasks.every(row=>row.studioQualityEvolution.existingHolisticBackfillRequired===true));
  assert.deepEqual(new Set(tasks.map(row=>row.studioQualityEvolution.existingHolisticBackfillFocus)),new Set(['CORE_FUN','PROGRESSION','PRESENTATION','USABILITY','STABILITY']));
  assert.ok(tasks.every(row=>/기존 게임 품질 백필 세대/.test(row.goal)));

  const verified=tasks.map(row=>({...row,status:'verified'}));
  for(const focus of ['CORE_FUN','PROGRESSION','PRESENTATION','USABILITY','STABILITY']){
    const next=findStudioContinuousImprovementTask(project,root,{tasks:verified},focus);
    assert.ok(next);
    assert.equal(next.studioQualityEvolution.existingHolisticBackfillRequired,false);
    assert.equal(next.studioQualityEvolution.existingHolisticBaselineVerified,true);
    assert.deepEqual(next.studioQualityEvolution.existingHolisticBackfillMissingFocuses,[]);
    assert.ok(!(next.evidence||[]).includes('existing-holistic-backfill:v1'));
    assert.ok((next.evidence||[]).includes('EXISTING_GAME_HOLISTIC_BASELINE_VERIFIED'));
  }
});

test('studio evolution emits all five quality pillars for one game',()=>{
  const root=tempRepo();
  const gameId='parallel-studio';
  const source=path.join(root,'roblox-games',gameId);
  fs.mkdirSync(path.join(source,'client'),{recursive:true});
  fs.mkdirSync(path.join(source,'server'),{recursive:true});
  fs.mkdirSync(path.join(source,'shared'),{recursive:true});
  fs.writeFileSync(path.join(source,'client','Visual.client.luau'),'local camera = workspace.CurrentCamera\n','utf8');
  fs.writeFileSync(path.join(source,'client','Input.client.luau'),'local input = {}\n','utf8');
  fs.writeFileSync(path.join(source,'server','Combat.server.luau'),'local combat = {}\n','utf8');
  fs.writeFileSync(path.join(source,'server','Progression.server.luau'),'local progression = {}\n','utf8');
  fs.writeFileSync(path.join(source,'shared','Save.luau'),'local save = {}\n','utf8');
  writeStudioDesign(root,gameId,{coreFun:'적 웨이브를 읽고 전투 행동을 선택해 방어 상태를 바꾸는 재미',progressionDirection:'웨이브 보상으로 다음 방어 선택과 해금을 확장한다.'});
  const project={gameId,name:'Parallel Studio',engine:'roblox',releaseState:'development-confirmed',projectPath:`roblox-games/${gameId}`};
  const tasks=findStudioContinuousImprovementTasks(project,root,{tasks:[]});
  assert.equal(tasks.length,5);
  assert.deepEqual(new Set(tasks.map(row=>row.studioQualityEvolution.focusPillar)),new Set(['CORE_FUN','PROGRESSION','PRESENTATION','USABILITY','STABILITY']));
  assert.ok(tasks.every(row=>row.responsibleFiles.length>0&&row.responsibleFiles.length<=2));
  assert.equal(new Set(tasks.map(row=>row.buildUpDirectiveId)).size,1);
  assert.equal(new Set(tasks.map(row=>row.buildUpDirective?.directiveFingerprint)).size,1);
  assert.equal(new Set(tasks.map(row=>JSON.stringify(row.buildUpDirective))).size,1);
  assert.ok(tasks.every(row=>(row.evidence||[]).includes('build-up-shared-generation-exact-object:YES')));

  const core=tasks.find(row=>row.studioQualityEvolution.focusPillar==='CORE_FUN');
  const progression=tasks.find(row=>row.studioQualityEvolution.focusPillar==='PROGRESSION');
  assert.equal(core.studioQualityEvolution.designGrounded,true);
  assert.equal(core.studioQualityEvolution.designVerified,true);
  assert.equal(core.studioQualityEvolution.strictDesignScore,90);
  assert.equal(progression.studioQualityEvolution.designGrounded,true);
  assert.ok(core.studioQualityEvolution.designSource.endsWith('/design-revised.json'));
  assert.match(core.goal,/적 웨이브를 읽고 전투 행동을 선택/);
  assert.match(progression.goal,/웨이브 보상으로 다음 방어 선택과 해금을 확장/);
  assert.ok(core.evidence.some(value=>value.startsWith('studio-quality-design-source:')));
  assert.equal(core.studioQualityEvolution.requiredConnectedImprovements.max,null);
});


test('BUILD_UP depth advances only when the entire shared directive generation verifies',()=>{
  const root=tempRepo();
  const gameId='shared-directive-outcome';
  const source=path.join(root,'roblox-games',gameId);
  fs.mkdirSync(path.join(source,'client'),{recursive:true});
  fs.mkdirSync(path.join(source,'server'),{recursive:true});
  fs.mkdirSync(path.join(source,'shared'),{recursive:true});
  fs.writeFileSync(path.join(source,'client','Visual.client.luau'),'local camera = workspace.CurrentCamera\n','utf8');
  fs.writeFileSync(path.join(source,'client','Input.client.luau'),'local input = {}\n','utf8');
  fs.writeFileSync(path.join(source,'server','Combat.server.luau'),'local combat = {}\n','utf8');
  fs.writeFileSync(path.join(source,'server','Progression.server.luau'),'local progression = {}\n','utf8');
  fs.writeFileSync(path.join(source,'shared','Save.luau'),'local save = {}\n','utf8');
  writeStudioDesign(root,gameId,{coreFun:'적 역할을 읽고 전투 선택을 바꾸는 재미',progressionDirection:'보상으로 다음 전투 선택과 해금을 확장한다.'});
  const project={gameId,name:'Shared Directive Outcome',engine:'roblox',releaseState:'development-confirmed',projectPath:`roblox-games/${gameId}`};
  const first=findStudioContinuousImprovementTasks(project,root,{tasks:[]});
  assert.equal(first.length,5);
  assert.equal(new Set(first.map(row=>row.buildUpDirectiveId)).size,1);
  fs.writeFileSync(path.join(source,'server','Combat.server.luau'),'local combat = { improved = true }\n','utf8');

  const mixed=first.map((row,index)=>({...row,status:index===0?'failed':'verified'}));
  const afterMixed=findStudioContinuousImprovementTasks(project,root,{tasks:mixed});
  assert.equal(afterMixed.length,5);
  assert.equal(afterMixed[0].buildUpDirective.developmentDepth,1);
  assert.equal(afterMixed[0].buildUpDirective.escalationMode,'DEEPER_CAUSAL_REPAIR');
  assert.equal(afterMixed[0].buildUpDirective.nextActionDecision.action,'CAUSAL_REPAIR');
  assert.equal(afterMixed[0].studioQualityEvolution.phase,'REPAIR');
  assert.equal(afterMixed[0].priority,'critical');
  assert.match(afterMixed[0].goal,/\[BUILD_UP_NEXT_ACTION=CAUSAL_REPAIR\]/);
  assert.ok(afterMixed.every(row=>row.evidence.includes('build-up-next-action-controller:APPLIED')));
  assert.equal(new Set(afterMixed.map(row=>row.buildUpDirectiveId)).size,1);

  const verified=first.map(row=>({...row,status:'verified'}));
  const pendingFocus=first[0].studioQualityEvolution.focusPillar;
  const pendingSingle=findStudioContinuousImprovementTask(project,root,{tasks:verified},pendingFocus);
  assert.ok(pendingSingle);
  assert.equal(pendingSingle.buildUpDirective.developmentDepth,1);
  assert.equal(pendingSingle.buildUpDirective.escalationMode,'VERIFIED_SOURCE_DELTA_AWAITING_EFFECT');
  assert.equal(pendingSingle.buildUpDirective.effectivenessMeasurement.previousGeneration.classification,'PARTIAL_EFFECT');
  assert.equal(pendingSingle.buildUpDirective.nextActionDecision.action,'CONTINUE_BUILD_UP_CURRENT_SYSTEM');

  const unknownProject={...project,queueRuntimeObserved:true,queueRuntimePassed:false};
  const unknownSingle=findStudioContinuousImprovementTask(unknownProject,root,{tasks:verified},pendingFocus);
  assert.ok(unknownSingle);
  assert.equal(unknownSingle.buildUpDirective.effectivenessMeasurement.previousGeneration.classification,'PARTIAL_EFFECT');

  const cancelledHistory=first.map(row=>({...row,status:'cancelled'}));
  const runtimeObservationCandidate=findStudioContinuousImprovementTask(project,root,{tasks:cancelledHistory},pendingFocus);
  assert.ok(runtimeObservationCandidate);
  assert.equal(runtimeObservationCandidate.buildUpDirective.nextActionDecision.action,'REQUEST_REQUIRED_RUNTIME_OBSERVATION');
  const effectPending=findStudioContinuousImprovementTasks(project,root,{tasks:cancelledHistory});
  assert.equal(effectPending.length,0);

  const projectWithConfirmedEffect={...project,queueRuntimeObserved:true,queueRuntimePassed:true};
  const afterVerified=findStudioContinuousImprovementTasks(projectWithConfirmedEffect,root,{tasks:verified});
  assert.equal(afterVerified.length,5);
  assert.equal(afterVerified[0].buildUpDirective.developmentDepth,2);
  assert.equal(afterVerified[0].buildUpDirective.escalationMode,'ESCALATE_AFTER_VERIFIED_GAME_SOURCE_DELTA');
  assert.equal(afterVerified[0].buildUpDirective.effectivenessMeasurement.previousGeneration.classification,'EFFECT_CONFIRMED');
  assert.equal(afterVerified[0].buildUpDirective.nextActionDecision.action,'MOVE_TO_NEXT_HIGHER_VALUE_GAP');
  assert.ok(afterVerified.every(row=>row.evidence.includes('build-up-next-action-controller:APPLIED')));
  assert.equal(new Set(afterVerified.map(row=>JSON.stringify(row.buildUpDirective))).size,1);
});

test('BUILD_UP next action controller preserves parallel-safe non-build-up work while waiting for runtime evidence',()=>{
  const directive={
    directiveId:'demo-g2',gameId:'demo',primaryFocus:'CORE_FUN',
    nextActionDecision:{action:'MAINTAIN_VERIFIED_BASELINE_WHILE_WAITING_FOR_REQUIRED_EXTERNAL_EVIDENCE',reason:'external runtime evidence pending'}
  };
  const buildUp={
    id:'demo-build-up',gameId:'demo',status:'queued',goal:'source change',
    buildUpDirective:directive,
    studioQualityEvolution:{focusPillar:'CORE_FUN',phase:'BUILD_UP'},
    evidence:['studio-quality-loop:v1']
  };
  const diagnostic={id:'demo-diagnostic',gameId:'demo',status:'queued',goal:'independent diagnostic',evidence:['diagnostic:STATIC_ONLY']};
  const controlled=applyBuildUpNextActionController([buildUp,diagnostic]);
  assert.deepEqual(controlled.map(row=>row.id),['demo-diagnostic']);
});

test('studio source discovery has no artificial 30-file ceiling',()=>{
  const root=tempRepo();
  const gameId='studio-wide-source-scan';
  const source=path.join(root,'roblox-games',gameId);
  const targetDir=path.join(source,'a-target');
  fs.mkdirSync(targetDir,{recursive:true});
  fs.writeFileSync(path.join(targetDir,'PlayerController.luau'),'local player = {}\n','utf8');
  for(let i=0;i<40;i++){
    const dir=path.join(source,`z-${String(i).padStart(2,'0')}`);
    fs.mkdirSync(dir,{recursive:true});
    fs.writeFileSync(path.join(dir,'misc.luau'),'local misc = {}\n','utf8');
  }
  writeStudioDesign(root,gameId);
  const project={gameId,name:'Studio Wide Source Scan',engine:'roblox',releaseState:'development-confirmed',projectPath:`roblox-games/${gameId}`};
  const task=findStudioContinuousImprovementTask(project,root,{tasks:[]},'CORE_FUN');
  assert.ok(task);
  assert.ok(task.responsibleFiles.includes(`roblox-games/${gameId}/a-target/PlayerController.luau`));
});

test('failed studio pillar creates a repair generation without globally blocking the game',()=>{
  const root=tempRepo();
  const gameId='repair-parallel';
  const source=path.join(root,'web-games',gameId);
  fs.mkdirSync(source,{recursive:true});
  fs.writeFileSync(path.join(source,'index.html'),'<!doctype html><canvas id="game"></canvas>','utf8');
  writeStudioDesign(root,gameId);
  const project={gameId,name:'Repair Parallel',engine:'web',releaseState:'development-confirmed',projectPath:`web-games/${gameId}`};
  const first=findStudioContinuousImprovementTask(project,root,{tasks:[]},'CORE_FUN');
  const next=findStudioContinuousImprovementTask(project,root,{tasks:[{...first,status:'failed',blocker:'test-failure'}]},'CORE_FUN');
  assert.ok(next);
  assert.match(next.id,/-v2$/);
  assert.equal(next.studioQualityEvolution.phase,'REPAIR');
});


test('missing design suppresses generic CORE_FUN and PROGRESSION guesses while safe lanes remain eligible',()=>{
  const root=tempRepo();
  const gameId='missing-design-game';
  const source=path.join(root,'roblox-games',gameId);
  fs.mkdirSync(path.join(source,'client'),{recursive:true});
  fs.mkdirSync(path.join(source,'server'),{recursive:true});
  fs.writeFileSync(path.join(source,'client','Visual.client.luau'),'local visual = {}\n','utf8');
  fs.writeFileSync(path.join(source,'client','Input.client.luau'),'local input = {}\n','utf8');
  fs.writeFileSync(path.join(source,'server','Game.server.luau'),'local game = {}\n','utf8');
  const project={gameId,name:'Missing Design',engine:'roblox',releaseState:'development-confirmed',projectPath:`roblox-games/${gameId}`};
  assert.equal(findStudioContinuousImprovementTask(project,root,{tasks:[]},'CORE_FUN'),null);
  assert.equal(findStudioContinuousImprovementTask(project,root,{tasks:[]},'PROGRESSION'),null);
  const tasks=findStudioContinuousImprovementTasks(project,root,{tasks:[]});
  assert.deepEqual(new Set(tasks.map(row=>row.studioQualityEvolution.focusPillar)),new Set(['PRESENTATION','USABILITY','STABILITY']));
  assert.ok(tasks.every(row=>row.studioQualityEvolution.designContextAvailable===false));
});


test('usable but unverified design cannot authorize CORE_FUN or PROGRESSION evolution',()=>{
  const root=tempRepo();
  const gameId='unverified-design-game';
  const source=path.join(root,'roblox-games',gameId);
  fs.mkdirSync(path.join(source,'server'),{recursive:true});
  fs.mkdirSync(path.join(source,'client'),{recursive:true});
  fs.writeFileSync(path.join(source,'server','Combat.server.luau'),'local combat = {}\n','utf8');
  fs.writeFileSync(path.join(source,'client','Visual.client.luau'),'local visual = {}\n','utf8');
  const dir=path.join(root,'design',gameId,'2026-09-25');
  fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(path.join(dir,'design-revised.json'),JSON.stringify({
    gameId,content:{identity:'구체적인 설계 후보 정체성',coreFun:'실제 전투 선택이 상태를 바꾸는 재미',coreLoop:['위협 읽기','전투 행동','결과로 다음 선택'],signatureSystems:[],progressionDirection:'성장'}
  },null,2),'utf8');
  fs.writeFileSync(path.join(dir,'cycle-status.json'),JSON.stringify({gameId,baselineGate:{state:'DESIGN_BASELINE_READY',ready:true}},null,2),'utf8');
  fs.writeFileSync(path.join(dir,'strict-design-review.json'),JSON.stringify({gameId,verdict:'REVISE',totalScore:91,hardFailures:['CORE_FUN_WEAK'],reviewedAt:'2026-09-25T00:00:00Z'},null,2),'utf8');
  const project={gameId,name:'Unverified Design',engine:'roblox',releaseState:'development-confirmed',projectPath:`roblox-games/${gameId}`};
  assert.equal(findStudioContinuousImprovementTask(project,root,{tasks:[]},'CORE_FUN'),null);
  assert.equal(findStudioContinuousImprovementTask(project,root,{tasks:[]},'PROGRESSION'),null);
  assert.ok(findStudioContinuousImprovementTask(project,root,{tasks:[]},'PRESENTATION'));
});


test('Roblox public-only real-server observation does not stop independent Studio development work',()=>{
  const root=tempRepo();
  const gameId='roblox-public-server-observation';
  fs.mkdirSync(path.join(root,'roblox-games',gameId),{recursive:true});
  fs.writeFileSync(path.join(root,'roblox-games',gameId,'Game.server.luau'),'print("runtime")\n','utf8');
  writeStudioDesign(root,gameId);
  const project={
    gameId,
    name:'Roblox Public Server Observation',
    engine:'roblox',
    target:'roblox',
    releaseState:'development-confirmed',
    projectPath:`roblox-games/${gameId}`,
    queueRobloxPublicReleaseRuntimeObservationPending:true,
    queueRobloxPublicReleaseFailureSignature:'ROBLOX_PUBLIC_RELEASE_AWAITING_REAL_SERVER_BOOT',
    queueRobloxFailureStage:'',
    queueRobloxFailureSignature:'',
    queueRoutingBlockers:[]
  };
  const task=findStudioContinuousImprovementTask(project,root,{tasks:[]},'PRESENTATION');
  assert.ok(task);
  assert.equal(task.gameId,gameId);
  assert.ok(task.evidence.includes('studio-quality-loop:v1'));
  assert.doesNotMatch(task.goal,/repair.*server boot|real.server.*source.code defect/i);
});

test('Roblox queue projection uses Roblox design genre instead of generic catalog or Web genre',()=>{
  const root=tempRepo();
  const gameId='roblox-genre-source';
  fs.mkdirSync(path.join(root,'roblox-games',gameId),{recursive:true});
  writeStudioDesign(root,gameId,{
    failureRetryRisk:{failureStates:['defeat','timeout'],retryFlow:'restart the current session with preserved progression',riskPressure:'enemy pressure rises by wave',recoveryRules:'persistent unlocks remain'},
    multiplayerMode:'SINGLE',
    technicalAssumptions:['server authoritative state remains separate from presentation','save schema meaning remains stable across native implementations'],
    robloxBuildProfile:{
      version:2,targetPlatform:'ROBLOX',taxonomy:'DIRECT_NATIVE_DESIGN_PROFILE',
      declaredGameCategory:'PUZZLE',genre:'Strategy',subgenre:'Tower Defense',playMode:'SINGLE',
      multiplayerRequired:false,coopImplementationRequired:false,competitiveImplementationRequired:false,
      networkingRequired:false,multiplayerQaRequired:false,minimumParticipantsForRequiredQa:1,
      displayLabelKo:'전략 · 타워 디펜스'
    },
    platformProfiles:{
      ROBLOX:{
        platform:'ROBLOX',inputModel:'Roblox mobile touch keyboard and gamepad controls',sessionModel:'short Roblox defense sessions with rapid restart',multiplayerRuntime:'server authoritative Roblox state even in solo sessions',performanceBudget:'bounded Roblox mobile enemy and effect budget',uiUx:'Roblox touch safe defense HUD and placement controls',saveAndNetwork:'DataStore backed progression with server validation',platformContentAdaptation:'Roblox tower defense placement lanes and avatar scale',internalReleaseTarget:'Private Roblox owner playtest experience',validationEvidence:'exact Roblox source artifact runtime QA and regression evidence'
      },
      UNITY:{
        platform:'UNITY',inputModel:'Unity mobile touch and gamepad controls',sessionModel:'mobile app defense sessions with suspend resume',multiplayerRuntime:'local authoritative solo runtime for the initial mobile build',performanceBudget:'Android thermal memory and GPU budget',uiUx:'Unity safe area defense HUD and touch placement',saveAndNetwork:'versioned local save with validated migration',platformContentAdaptation:'Unity mobile scene and prefab tower defense adaptation',internalReleaseTarget:'Internal Android test build',validationEvidence:'installed Android runtime QA and regression evidence'
      }
    }
  });
  const projects=collectProjects(
    {projects:[]},
    {games:[{
      id:gameId,name:'Roblox Genre Source',productionClass:'DEVELOPMENT_CONFIRMED',
      lifecycleState:'ACTIVE',genre:['Puzzle'],gameCategory:'PUZZLE',
      robloxProjectPath:`roblox-games/${gameId}`
    }]},
    root,
    {items:[{
      gameId,gameName:'Roblox Genre Source',status:'ACTIVE',
      selectedPlatform:'ROBLOX',robloxProjectPath:`roblox-games/${gameId}`
    }]}
  );
  const project=projects.find(row=>row.gameId===gameId&&row.engine==='roblox');
  assert.ok(project);
  assert.equal(project.genre,'Strategy');
  assert.equal(project.subgenre,'Tower Defense');
  assert.equal(project.playMode,'SINGLE');
  assert.match(project.robloxDesignProfileSource,/design\/roblox-genre-source\/2026-09-25\/design-revised\.json$/);
});


test('backlog gate still binds one shared BUILD_UP directive to existing queued game work',()=>{
  const root=tempRepo();
  const gameId='backlog-build-up';
  for(const [dir,file,body] of [
    [`roblox-games/${gameId}/client`,'Visual.client.luau','local camera = workspace.CurrentCamera\n'],
    [`roblox-games/${gameId}/server`,'Combat.server.luau','local Combat = {}\nfunction Combat.resolveAttack(player, enemy) return player ~= nil and enemy ~= nil end\nreturn Combat\n'],
    [`roblox-games/${gameId}/shared`,'Save.luau','local save = {}\n'],
    [`unity-games/${gameId}/Assets/Scripts`,'RuntimeBootstrap.cs','public class RuntimeBootstrap {}\n']
  ]){
    const folder=path.join(root,dir);
    fs.mkdirSync(folder,{recursive:true});
    fs.writeFileSync(path.join(folder,file),body,'utf8');
  }
  writeStudioDesign(root,gameId);
  const queued=[
    {
      id:`${gameId}-roblox-existing-v1`,gameId,target:'roblox',department:'development',type:'implementation',
      sourceRoot:`roblox-games/${gameId}`,responsibleFiles:[`roblox-games/${gameId}/server/Combat.server.luau`],
      goal:'existing Roblox implementation work',releaseState:'development-confirmed',status:'queued'
    },
    {
      id:`${gameId}-unity-existing-v1`,gameId,target:'unity',department:'development',type:'implementation',
      sourceRoot:`unity-games/${gameId}`,responsibleFiles:[`unity-games/${gameId}/Assets/Scripts/RuntimeBootstrap.cs`],
      goal:'existing Unity implementation work',releaseState:'development-confirmed',status:'queued'
    }
  ];
  const result=planVibe2AutonomousTasks({
    status:{projects:[{gameId,ownerDecision:'PASS',target:'roblox',projectPath:`roblox-games/${gameId}`,progress:80}]},
    catalog:{games:[{id:gameId,name:'Backlog Build Up',productionClass:'DEVELOPMENT_CONFIRMED',lifecycleState:'ACTIVE'}]},
    queue:{maxConcurrentTasks:20,tasks:queued},
    repoRoot:root,maxConcurrentTasks:20,queueMaxConcurrentTasks:20,planningBacklogTarget:2,planningBacklogMinimum:0
  });
  assert.equal(result.planned,false);
  assert.equal(result.reason,'DEVELOPMENT_BACKLOG_TARGET_REACHED');
  assert.equal(result.buildUpDirectiveBackfillCount,2);
  const rows=result.queue.tasks.filter(row=>row.gameId===gameId);
  assert.equal(rows.length,2);
  assert.equal(new Set(rows.map(row=>row.buildUpDirectiveId)).size,1);
  assert.equal(rows[0].buildUpGeneration,1);
  assert.equal(rows[1].buildUpGeneration,1);
  assert.deepEqual(rows[0].buildUpDirective,rows[1].buildUpDirective);
  assert.ok(rows.every(row=>row.goal.includes('[GAME_SPECIFIC_BUILD_UP_DIRECTIVE]')));
  assert.ok(rows.every(row=>row.buildUpDirective.version===2));
  assert.ok(rows.every(row=>row.buildUpStatus==='DIRECTIVE_BOUND'));
  assert.ok(rows.every(row=>row.developmentDepth===1));
  assert.ok(rows.every(row=>row.escalationStage==='FOUNDATION_COMPLETENESS'));
  assert.ok(rows.every(row=>(row.evidence||[]).includes('build-up-directive-backfill:queued-existing-work')));
  assert.ok(rows.every(row=>(row.evidence||[]).includes('build-up-pre-reserve-binding:CHECKED')));
  assert.ok(rows.every(row=>(row.evidence||[]).includes('game-specific-build-up-directive:v2')));
  assert.ok(rows[0].buildUpDirective.responsibleSystemsAndFiles.sourceAnchors.some(row=>row.symbol==='Combat.resolveAttack'));
});


test('queue normalization preserves BUILD_UP directive payload and aliases for workers',()=>{
  const directive={
    directiveId:'build-up-demo-g1',
    gameId:'demo',
    generation:1,
    thisLoopPrimaryGoal:'실제 전투 피드백을 강화한다',
    sourceTreeFingerprint:'sha256:demo',
    developmentDepth:1,
    escalationStage:'FOUNDATION_COMPLETENESS',
    previousVersionDelta:{previousGoal:'이전 전투 피드백 개선'},
    nextActionDecision:{action:'CONTINUE_BUILD_UP_CURRENT_SYSTEM',reason:'same system needs another verified effect pass'},
    allDomainImplementationDirectives:[{domain:'CORE_FUN',instruction:'전투 선택 결과를 실제 상태 변화로 연결'}]
  };
  const normalized=createVibeContinuousQueue({maxConcurrentTasks:20,tasks:[{
    id:'demo-build-up',gameId:'demo',target:'roblox',department:'development',type:'implementation',
    sourceRoot:'roblox-games/demo',responsibleFiles:['roblox-games/demo/server/Combat.server.luau'],
    goal:'build up',status:'queued',buildUpDirective:directive,buildUpDirectiveId:directive.directiveId,
    buildUpGeneration:1,buildUpGoal:directive.thisLoopPrimaryGoal,buildUpSourceTree:directive.sourceTreeFingerprint,
    buildUpStatus:'DIRECTIVE_BOUND',previousGoal:'이전 전투 피드백 개선',lastAchievedGoal:'이전 전투 피드백 개선',
    developmentDepth:1,escalationStage:'FOUNDATION_COMPLETENESS',
    buildUpNextAction:'CONTINUE_BUILD_UP_CURRENT_SYSTEM',buildUpNextActionReason:'same system needs another verified effect pass',
    nextEscalationRequired:true
  }]});
  const task=normalized.tasks[0];
  assert.deepEqual(task.buildUpDirective,directive);
  assert.equal(task.buildUpDirectiveId,directive.directiveId);
  assert.equal(task.buildUpGeneration,1);
  assert.equal(task.buildUpGoal,directive.thisLoopPrimaryGoal);
  assert.equal(task.buildUpSourceTree,directive.sourceTreeFingerprint);
  assert.equal(task.buildUpStatus,'DIRECTIVE_BOUND');
  assert.equal(task.previousGoal,'이전 전투 피드백 개선');
  assert.equal(task.lastAchievedGoal,'이전 전투 피드백 개선');
  assert.equal(task.developmentDepth,1);
  assert.equal(task.escalationStage,'FOUNDATION_COMPLETENESS');
  assert.equal(task.buildUpNextAction,'CONTINUE_BUILD_UP_CURRENT_SYSTEM');
  assert.equal(task.buildUpNextActionReason,'same system needs another verified effect pass');
  assert.equal(task.nextEscalationRequired,true);
});

test('queued game work without verified design stays DESIGN_PENDING and cannot claim BUILD_UP',()=>{
  const root=tempRepo();
  const gameId='pending-design-build-up';
  const source=path.join(root,'roblox-games',gameId,'server');
  fs.mkdirSync(source,{recursive:true});
  fs.writeFileSync(path.join(source,'Combat.server.luau'),'function resolveAttack(enemy) return enemy ~= nil end\n','utf8');
  const queued={
    id:`${gameId}-queued-v1`,gameId,target:'roblox',department:'development',type:'implementation',
    sourceRoot:`roblox-games/${gameId}`,responsibleFiles:[`roblox-games/${gameId}/server/Combat.server.luau`],
    goal:'existing queued work',releaseState:'development-confirmed',status:'queued'
  };
  const result=planVibe2AutonomousTasks({
    status:{projects:[{gameId,ownerDecision:'PASS',target:'roblox',projectPath:`roblox-games/${gameId}`,progress:80}]},
    catalog:{games:[{id:gameId,name:'Pending Design Build Up',productionClass:'DEVELOPMENT_CONFIRMED',lifecycleState:'ACTIVE'}]},
    queue:{maxConcurrentTasks:20,tasks:[queued]},
    repoRoot:root,maxConcurrentTasks:20,queueMaxConcurrentTasks:20,planningBacklogTarget:1,planningBacklogMinimum:0
  });
  assert.equal(result.planned,false);
  assert.equal(result.reason,'DEVELOPMENT_BACKLOG_TARGET_REACHED');
  assert.equal(result.buildUpDirectiveBackfillCount,0);
  const row=result.queue.tasks[0];
  assert.equal(row.buildUpDirectiveId,null);
  assert.equal(row.buildUpStatus,'DESIGN_PENDING');
  assert.ok(row.evidence.includes('build-up-directive:DESIGN_PENDING'));
  assert.ok(row.evidence.includes('build-up-pre-reserve-binding:CHECKED'));
  assert.ok(row.evidence.includes('build-up-directive-freshness:DESIGN_PENDING'));
});

test('stale queued directive rebinds to the active shared generation before reserve',()=>{
  const root=tempRepo();
  const gameId='stale-build-up-rebind';
  const source=path.join(root,'roblox-games',gameId,'server');
  fs.mkdirSync(source,{recursive:true});
  fs.writeFileSync(path.join(source,'Combat.server.luau'),'function resolveAttack(enemy) return enemy ~= nil end\n','utf8');
  writeStudioDesign(root,gameId,{coreFun:'적 상태를 읽고 공격 타이밍을 선택하는 재미'});
  const project={gameId,name:'Stale Build Up Rebind',engine:'roblox',releaseState:'development-confirmed',projectPath:`roblox-games/${gameId}`};
  const generated=findStudioContinuousImprovementTask(project,root,{tasks:[]},'CORE_FUN');
  assert.ok(generated?.buildUpDirective);
  const active={...generated,id:`${gameId}-active`,status:'running',reservationRunId:'run-active'};
  const staleDirective={...generated.buildUpDirective,directiveId:`${gameId}-old-directive`,generation:0};
  const stale={
    ...generated,id:`${gameId}-stale`,status:'queued',goal:'stale queued goal',
    buildUpDirective:staleDirective,buildUpDirectiveId:staleDirective.directiveId,buildUpGeneration:0
  };
  const result=planVibe2AutonomousTasks({
    status:{projects:[{gameId,ownerDecision:'PASS',target:'roblox',projectPath:`roblox-games/${gameId}`,progress:80}]},
    catalog:{games:[{id:gameId,name:project.name,productionClass:'DEVELOPMENT_CONFIRMED',lifecycleState:'ACTIVE'}]},
    queue:{maxConcurrentTasks:20,tasks:[active,stale]},
    repoRoot:root,maxConcurrentTasks:20,queueMaxConcurrentTasks:20,planningBacklogTarget:2,planningBacklogMinimum:0
  });
  assert.equal(result.planned,false);
  assert.equal(result.buildUpDirectiveBackfillCount,1);
  const activeAfter=result.queue.tasks.find(row=>row.id===active.id);
  const staleAfter=result.queue.tasks.find(row=>row.id===stale.id);
  assert.equal(activeAfter.buildUpDirectiveId,active.buildUpDirectiveId);
  assert.equal(activeAfter.goal,active.goal);
  assert.equal(staleAfter.buildUpDirectiveId,active.buildUpDirectiveId);
  assert.equal(staleAfter.buildUpGeneration,active.buildUpGeneration);
  assert.ok(staleAfter.evidence.includes('build-up-directive-freshness:RECONCILED_TO_ACTIVE_GENERATION'));
});

test('failed and blocked resume candidates share one reconciled directive without changing task status',()=>{
  const root=tempRepo();
  const gameId='resume-build-up-siblings';
  const source=path.join(root,'roblox-games',gameId,'server');
  fs.mkdirSync(source,{recursive:true});
  fs.writeFileSync(path.join(source,'Combat.server.luau'),'function resolveAttack(enemy) return enemy ~= nil end\n','utf8');
  writeStudioDesign(root,gameId,{coreFun:'적 상태를 읽고 공격 타이밍을 선택하는 재미'});
  const base={
    gameId,target:'roblox',department:'development',type:'implementation',
    sourceRoot:`roblox-games/${gameId}`,responsibleFiles:[`roblox-games/${gameId}/server/Combat.server.luau`],
    releaseState:'development-confirmed'
  };
  const failed={...base,id:`${gameId}-failed`,goal:'resume failed implementation',status:'failed'};
  const blocked={...base,id:`${gameId}-blocked`,goal:'resume blocked implementation',status:'blocked'};
  const result=planVibe2AutonomousTasks({
    status:{projects:[{gameId,ownerDecision:'PASS',target:'roblox',projectPath:`roblox-games/${gameId}`,progress:80}]},
    catalog:{games:[{id:gameId,name:'Resume Build Up Siblings',productionClass:'DEVELOPMENT_CONFIRMED',lifecycleState:'ACTIVE'}]},
    queue:{maxConcurrentTasks:20,tasks:[failed,blocked]},
    repoRoot:root,maxConcurrentTasks:20,queueMaxConcurrentTasks:20,planningBacklogTarget:2,planningBacklogMinimum:0
  });
  const rows=result.queue.tasks.filter(row=>row.gameId===gameId&&[failed.id,blocked.id].includes(row.id));
  assert.equal(rows.length,2);
  assert.equal(new Set(rows.map(row=>row.buildUpDirectiveId)).size,1);
  assert.ok(rows[0].buildUpDirectiveId);
  assert.equal(rows.find(row=>row.id===failed.id).status,'failed');
  assert.equal(rows.find(row=>row.id===blocked.id).status,'blocked');
  assert.ok(rows.every(row=>(row.evidence||[]).includes('build-up-pre-reserve-binding:CHECKED')));
});

test('queued directive older than a newer terminal generation is regenerated before reserve',()=>{
  const root=tempRepo();
  const gameId='terminal-stale-build-up';
  const source=path.join(root,'roblox-games',gameId,'server');
  fs.mkdirSync(source,{recursive:true});
  fs.writeFileSync(path.join(source,'Combat.server.luau'),'function resolveAttack(enemy) return enemy ~= nil end\n','utf8');
  writeStudioDesign(root,gameId,{coreFun:'적 상태를 읽고 공격 타이밍을 선택하는 재미'});
  const project={gameId,name:'Terminal Stale Build Up',engine:'roblox',releaseState:'development-confirmed',projectPath:`roblox-games/${gameId}`};
  const first=findStudioContinuousImprovementTask(project,root,{tasks:[]},'CORE_FUN');
  assert.equal(first.buildUpGeneration,1);
  fs.writeFileSync(path.join(source,'Combat.server.luau'),'function resolveAttack(enemy) return enemy ~= nil and enemy.Health > 0 end\n','utf8');
  const second=findStudioContinuousImprovementTask(
    {...project,queueRuntimeObserved:true,queueRuntimePassed:true},
    root,
    {tasks:[{...first,status:'verified'}]},
    'CORE_FUN'
  );
  assert.equal(second.buildUpGeneration,2);
  const terminal={...second,id:`${gameId}-terminal-g2`,status:'verified'};
  const stale={...first,id:`${gameId}-stale-g1`,status:'queued',goal:'historical base goal\n\n'+first.goal.split('\n\n').slice(-1)[0]};
  const result=planVibe2AutonomousTasks({
    status:{projects:[{gameId,ownerDecision:'PASS',target:'roblox',projectPath:`roblox-games/${gameId}`,progress:80}]},
    catalog:{games:[{id:gameId,name:project.name,productionClass:'DEVELOPMENT_CONFIRMED',lifecycleState:'ACTIVE'}]},
    queue:{maxConcurrentTasks:20,tasks:[terminal,stale]},
    repoRoot:root,maxConcurrentTasks:20,queueMaxConcurrentTasks:20,planningBacklogTarget:2,planningBacklogMinimum:0
  });
  assert.equal(result.planned,false);
  assert.equal(result.buildUpDirectiveBackfillCount,1);
  const refreshed=result.queue.tasks.find(row=>row.id===stale.id);
  assert.equal(refreshed.buildUpGeneration,3);
  assert.notEqual(refreshed.buildUpDirectiveId,stale.buildUpDirectiveId);
  assert.ok(refreshed.evidence.includes('build-up-directive-stale-refresh:queued-existing-work'));
  assert.ok(refreshed.evidence.includes('build-up-directive-freshness:REGENERATED_AFTER_NEWER_TERMINAL_GENERATION'));
  assert.equal((refreshed.goal.match(/\[GAME_SPECIFIC_BUILD_UP_DIRECTIVE\]/g)||[]).length,1);
});

test('BUILD_UP backlog synchronization never rewrites already running work',()=>{
  const root=tempRepo();
  const gameId='running-build-up';
  const source=path.join(root,'roblox-games',gameId,'server');
  fs.mkdirSync(source,{recursive:true});
  fs.writeFileSync(path.join(source,'Combat.server.luau'),'local combat = {}\n','utf8');
  writeStudioDesign(root,gameId);
  const running={
    id:`${gameId}-running-v1`,gameId,target:'roblox',department:'development',type:'implementation',
    sourceRoot:`roblox-games/${gameId}`,responsibleFiles:[`roblox-games/${gameId}/server/Combat.server.luau`],
    goal:'already reserved work',releaseState:'development-confirmed',status:'running',reservationRunId:'run-1'
  };
  const result=planVibe2AutonomousTasks({
    status:{projects:[{gameId,ownerDecision:'PASS',target:'roblox',projectPath:`roblox-games/${gameId}`,progress:80}]},
    catalog:{games:[{id:gameId,name:'Running Build Up',productionClass:'DEVELOPMENT_CONFIRMED',lifecycleState:'ACTIVE'}]},
    queue:{maxConcurrentTasks:20,tasks:[running]},
    repoRoot:root,maxConcurrentTasks:20,queueMaxConcurrentTasks:20,planningBacklogTarget:1,planningBacklogMinimum:0
  });
  assert.equal(result.planned,false);
  assert.equal(result.reason,'DEVELOPMENT_BACKLOG_TARGET_REACHED');
  assert.equal(result.buildUpDirectiveBackfillCount,0);
  assert.equal(result.queue.tasks[0].buildUpDirectiveId,null);
  assert.equal(result.queue.tasks[0].buildUpDirective,null);
  assert.equal(result.queue.tasks[0].goal,'already reserved work');
});
