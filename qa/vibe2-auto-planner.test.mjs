// 파일명: qa/vibe2-auto-planner.test.mjs

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { latestDevelopmentBaselineEvidence, planVibe2AutonomousTask, planVibe2AutonomousTasks } from '../tools/vibe2-auto-planner.mjs';

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
  assert.equal(restored.lastOutcome,'RESTORED_BY_EXACT_WEB_BASE_IMPLEMENTATION');
  assert.ok(restored.evidence.includes('restored-exact-stage:WEB_BASE_IMPLEMENTATION'));
  assert.ok(restored.evidence.includes('restored-from:production-authority-inactive:DESIGN_ONLY'));
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
    releaseState:'development-confirmed',status:'queued',retries:0,maxRetries:2,blocker:null,evidence:['diagnostic-key:OLD:index.html']
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
    queue:{maxConcurrentTasks:20,tasks:[exact]},repoRoot:root,maxConcurrentTasks:20
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

test('active source root is skipped while another project can be planned',()=>{
  const root=tempRepo();
  const mixedCatalog={games:[
    {id:'demo',homepageCategory:'release-confirmed'},
    {id:'dev-web',webPath:'/web-games/dev-web/',hasWebArchive:true,homepageWebPlayable:true,homepageCategory:'development-confirmed'}
  ]};
  const result=planVibe2AutonomousTasks({
    status,catalog:mixedCatalog,
    queue:{maxConcurrentTasks:4,tasks:[{id:'demo-active',gameId:'demo',sourceRoot:'unity-games/demo',target:'unity',goal:'active',releaseState:'release-confirmed',status:'running'}]},
    repoRoot:root,maxConcurrentTasks:4
  });
  assert.equal(result.tasks.some(t=>t.gameId==='demo'),false);
  assert.equal(result.tasks.some(t=>t.gameId==='dev-web'),true);
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
  fs.writeFileSync(path.join(webRoot,'index.html'),'<!doctype html><html><head><title>Dev</title></head><body><button>Play</button></body></html>\n','utf8');
  fs.writeFileSync(path.join(webRoot,'extra.js'),'// TODO: harden secondary UI path\n','utf8');
  const assessed={id:'dev-web-existing-web-assessment-v1',gameId:'dev-web',target:'web',sourceRoot:'web-games/dev-web',status:'done',goal:'assessment complete',evidence:['existing-web-assessment-required']};
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
  fs.writeFileSync(path.join(webRoot,'index.html'),'<!doctype html><html><head><title>Diag</title></head><body><button>Play</button></body></html>','utf8');
  const diagCatalog={games:[{id:'diag-web',webPath:'/web-games/diag-web/',hasWebArchive:true,homepageWebPlayable:true,homepageCategory:'development-confirmed'}]};
  const assessed={id:'diag-web-existing-web-assessment-v1',gameId:'diag-web',target:'web',sourceRoot:'web-games/diag-web',status:'done',goal:'assessment complete',evidence:['existing-web-assessment-required']};
  const first=planVibe2AutonomousTask({status:{projects:[]},catalog:diagCatalog,queue:{tasks:[assessed]},repoRoot:root,maxConcurrentTasks:4});
  assert.equal(first.planned,true);
  const firstKeys=first.task.evidence.filter(x=>x.startsWith('diagnostic-key:'));
  assert.equal(firstKeys.length>0,true);
  const done={...first.task,status:'done',result:'PASS'};
  const second=planVibe2AutonomousTask({status:{projects:[]},catalog:diagCatalog,queue:{tasks:[assessed,done]},repoRoot:root,maxConcurrentTasks:4});
  if(second.planned){
    assert.notEqual(second.task.id,first.task.id);
    const secondKeys=second.task.evidence.filter(x=>x.startsWith('diagnostic-key:'));
    assert.equal(secondKeys.some(x=>firstKeys.includes(x)),false);
  }else{
    assert.equal(['NO_SAFE_AUTONOMOUS_TASK','NO_INDEPENDENT_SAFE_AUTONOMOUS_TASK'].includes(second.reason),true);
  }
});

test('completed Unity package is never recreated after completion and tiny seed uses explicit expansion scopes',()=>{
  const root=tempRepo();
  const unityOnlyCatalog={games:[{id:'demo',homepageCategory:'release-confirmed'}]};
  const first=planVibe2AutonomousTask({status,catalog:unityOnlyCatalog,queue:{tasks:[]},repoRoot:root,maxConcurrentTasks:4});
  assert.equal(first.planned,true);
  assert.equal(first.task.evidence.includes('work-package-auto-expanded'),true);
  assert.equal(first.task.evidence.filter(value=>value.startsWith('work-package-scope:')).length>=3,true);
  assert.equal(first.task.packageWorkUnits>first.task.taskWorkUnits,true);
  const done={...first.task,status:'done',result:'PASS'};
  const second=planVibe2AutonomousTask({status,catalog:unityOnlyCatalog,queue:{tasks:[done]},repoRoot:root,maxConcurrentTasks:4});
  if(second.planned){
    assert.notEqual(second.task.id,first.task.id);
  }else{
    assert.equal(['NO_SAFE_AUTONOMOUS_TASK','NO_INDEPENDENT_SAFE_AUTONOMOUS_TASK'].includes(second.reason),true);
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


test('presentation quality passes are queued in canonical order after functional continuation',()=>{
  const root=tempRepo();
  const gameId='presentation-web';
  const sourceRoot=path.join(root,'web-games',gameId);
  fs.mkdirSync(sourceRoot,{recursive:true});
  fs.writeFileSync(path.join(sourceRoot,'index.html'),[
    '<!doctype html><html><body><canvas id="game"></canvas><script>',
    'let x=0; function update(){x+=1;requestAnimationFrame(update)} requestAnimationFrame(update);',
    '</script></body></html>'
  ].join('\n'),'utf8');
  const localCatalog={games:[{
    id:gameId,name:'Presentation Web',productionClass:'DEVELOPMENT_CONFIRMED',lifecycleState:'ACTIVE',
    homepageWebPlayable:true,hasWebArchive:true,webPath:`/web-games/${gameId}/`
  }]};
  const done=(id,evidence=[])=>({
    id,gameId,target:'web',department:'development',type:'implementation',sourceRoot:`web-games/${gameId}`,
    responsibleFiles:[`web-games/${gameId}/index.html`],goal:'done prerequisite',releaseState:'development-confirmed',
    status:'done',retries:0,maxRetries:2,evidence
  });
  let queue={maxConcurrentTasks:4,tasks:[
    done(`${gameId}-existing-web-assessment-v1`,['existing-web-assessment-required']),
    done(`${gameId}-existing-web-development-continuation-v1`,['existing-web-continuation'])
  ]};
  let first=planVibe2AutonomousTask({status:{projects:[]},catalog:localCatalog,queue,repoRoot:root,maxConcurrentTasks:4});
  assert.equal(first.planned,true);
  assert.equal(first.task.id,`${gameId}-presentation-asset-adaptation-v1`);
  assert.ok(first.task.evidence.includes('presentation-pass:ASSET_ADAPTATION'));
  queue={...queue,tasks:[...queue.tasks,{...first.task,status:'done'}]};
  let second=planVibe2AutonomousTask({status:{projects:[]},catalog:localCatalog,queue,repoRoot:root,maxConcurrentTasks:4});
  assert.equal(second.task.id,`${gameId}-presentation-living-motion-v1`);
  assert.ok(second.task.evidence.includes('presentation-pass:LIVING_MOTION'));
  queue={...queue,tasks:[...queue.tasks,{...second.task,status:'done'}]};
  let third=planVibe2AutonomousTask({status:{projects:[]},catalog:localCatalog,queue,repoRoot:root,maxConcurrentTasks:4});
  assert.equal(third.task.id,`${gameId}-presentation-animation-feel-v1`);
  assert.ok(third.task.evidence.includes('presentation-preserve-gameplay-semantics'));
});
