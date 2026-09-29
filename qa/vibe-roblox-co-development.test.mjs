// 파일명: qa/vibe-roblox-co-development.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createVibeChangeSet, canApplyVibeChangeSet, classifyVibeOwnerInterrupt } from '../assets/vibe-change-set.js';
import { createVibeGoalContract, routeVibeCapabilities } from '../assets/vibe-orchestrator.js';
import { classifyVibePatchSaturation } from '../assets/vibe-quality-intelligence.js';
import { compileVibeCentralWorkContract } from '../tools/vibe2-central-work-contract.mjs';
import { planVibe2AutonomousTasks } from '../tools/vibe2-auto-planner.mjs';

test('atomic change set binds exact source, acceptance and owner interrupt without restart',()=>{
  const change=createVibeChangeSet({request:'늑대 공격 모션 고쳐',target:'roblox',gameId:'demo',baseSourceRevision:'a'.repeat(40),files:['roblox-games/demo/server/Game.server.luau'],edits:[{file:'roblox-games/demo/server/Game.server.luau',area:'wolf attack',reason:'bite timing'}],responsibleSystems:['combat','animation'],affectedDepartments:['graphics','development','qa'],acceptanceContract:{observable:['BITE_MOTION_OBSERVED','DAMAGE_TIMING_UNCHANGED'],runtimeEvidenceRequired:true}});
  assert.equal(change.version,2);
  assert.equal(change.target,'roblox');
  assert.equal(change.policy.workLockRequired,true);
  assert.equal(canApplyVibeChangeSet(change).ok,true);
  const interrupt=classifyVibeOwnerInterrupt({activeChangeSet:change,request:'늑대 죽는 모션도 같은 스타일로 추가'});
  assert.equal(interrupt.preserveUnaffectedWork,true);
  assert.equal(interrupt.latestOwnerDirectivePriority,true);
});

test('orchestrator routes Roblox to existing specialists',()=>{
  const goal=createVibeGoalContract({request:'로블록스 몬스터 그래픽 고쳐',target:'auto'});
  assert.equal(goal.target,'roblox');
  const route=routeVibeCapabilities({request:'로블록스 몬스터 그래픽 오류 고쳐'});
  assert.equal(route.target,'roblox');
  assert.ok(route.modules.includes('assets/vibe-art-pipeline.js'));
  assert.ok(route.capabilities.includes('assets/vibe-quality-intelligence.js'));
  assert.equal(route.authority,'existing-capability-router-only');
});

test('three repeated failures on same responsibility escalate to root cause mode',()=>{
  const result=classifyVibePatchSaturation({responsibleFiles:['roblox-games/demo/server/Game.server.luau'],attempts:[1,2,3].map(()=>({status:'FAILED',responsibleFiles:['roblox-games/demo/server/Game.server.luau'],failureSignature:'same'}))});
  assert.equal(result.saturated,true);
  assert.equal(result.mode,'ROOT_CAUSE_MODE');
  assert.ok(result.actions.includes('STOP_MICRO_PATCH_ACCUMULATION'));
});

test('central work contract exposes compiled current truth and observable acceptance',()=>{
  const snapshot={required:true,present:true,valid:true,path:'company-learning/platform-release-roadmap.json',version:257,fingerprint:'fp',document:{developmentLifecycleMachine:{sharedWorkerContext:{}},assistantRoadmapOrchestration:{}}};
  const contract=compileVibeCentralWorkContract({snapshot,task:{id:'demo-task',gameId:'demo',target:'roblox',sourceRevision:'b'.repeat(40),internalRobloxVersion:7,changeSetId:'change-demo',acceptanceContract:{observable:['CORE_LOOP_OBSERVED']}},plan:{target:'roblox',qa:['REMOTE_SECURITY']},route:{route:'text-source-worker'},responsibleFiles:['roblox-games/demo/server/Game.server.luau'],mainSha:'b'.repeat(40)});
  assert.equal(contract.currentTruth.gameId,'demo');
  assert.equal(contract.currentTruth.currentSourceRevision,'b'.repeat(40));
  assert.equal(contract.currentTruth.currentInternalRobloxVersion,7);
  assert.equal(contract.changeSet.id,'change-demo');
  assert.ok(contract.acceptanceContract.observable.includes('CORE_LOOP_OBSERVED'));
  assert.equal(contract.acceptanceContract.runtimeObservationRequired,true);
  assert.equal(contract.workLock.requiredBeforeSourceWrite,true);
  assert.equal(contract.workLock.stateBranch,'vibe2-work-locks');
  assert.deepEqual(contract.workLock.files,['roblox-games/demo/server/Game.server.luau']);
});

test('development queue internal Roblox release becomes one co-development playtest task with unlimited repair',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'vibe-roblox-co-dev-'));
  fs.mkdirSync(path.join(root,'company-learning'),{recursive:true});
  fs.writeFileSync(path.join(root,'company-learning','platform-release-roadmap.json'),JSON.stringify({authority:'MACHINE_EXECUTION_CONTRACT',machineSourceOfTruth:'company-learning/platform-release-roadmap.json',humanDocumentRequired:false},null,2));
  const sourceRoot=path.join(root,'roblox-games','demo');
  for(const rel of ['shared/GameConfig.luau','server/Game.server.luau','client/Game.client.luau']){const full=path.join(sourceRoot,rel);fs.mkdirSync(path.dirname(full),{recursive:true});fs.writeFileSync(full,'return {}\n');}
  const sha='c'.repeat(40),artifact='sha256:'+('d'.repeat(64));
  const result=planVibe2AutonomousTasks({status:{projects:[]},catalog:{games:[{id:'demo',name:'Demo',productionClass:'DEVELOPMENT_CONFIRMED',lifecycleState:'ACTIVE',robloxProjectPath:'roblox-games/demo'}]},developmentQueue:{items:[{gameId:'demo',gameName:'Demo',status:'ACTIVE',productionClass:'DEVELOPMENT_CONFIRMED',selectedPlatform:'ROBLOX',targetPlatform:'ROBLOX',robloxProjectPath:'roblox-games/demo',currentStep:'INTERNAL_PLATFORM_PLAYTEST_AND_DEBUG',canonicalState:'INTERNAL_PLATFORM_PLAYTEST_AND_DEBUG',robloxInternalReleaseReady:true,robloxSourceCommit:sha,robloxBuildArtifactIdentity:artifact,robloxInternalReleaseEvidence:{published:true,sourceRevision:sha,artifactIdentity:artifact,versionNumber:9}}]},queue:{maxConcurrentTasks:20,tasks:[]},repoRoot:root,maxConcurrentTasks:20});
  const task=result.tasks.find(row=>row.gameId==='demo'&&row.target==='roblox');
  assert.ok(task);
  assert.match(task.id,/roblox-internal-playtest-debug/);
  assert.equal(task.maxRetries,null);
  assert.equal(task.retryPolicy,'UNLIMITED_CAUSAL_REPAIR');
  assert.equal(task.baseSourceRevision,sha);
  assert.equal(task.internalRobloxVersion,9);
  assert.equal(task.acceptanceContract.runtimeObservationRequired,true);
  assert.ok(task.evidence.includes('internal-playtest-co-development:yes'));
});


test('continuous core acquires shared Work Lock before source mutation and releases it after fan-in',()=>{
  const workflow=fs.readFileSync(path.join(process.cwd(),'.github/workflows/vibe2-continuous-core.yml'),'utf8');
  const acquire=workflow.indexOf('Acquire shared Work Lock before source write');
  const candidate=workflow.indexOf('Generate isolated candidate from pinned main contract');
  const release=workflow.indexOf('Release shared Work Locks after fan-in or abort');
  assert.ok(acquire>=0&&candidate>acquire);
  assert.ok(release>candidate);
  assert.match(workflow,/vibe2-remote-work-lock\.mjs\" acquire/);
  assert.match(workflow,/steps\.work_lock\.outputs\.acquired == 'true'/);
  assert.match(workflow,/VIBE2_SHARED_WORK_LOCK_RELEASED=/);
});

test('central roadmap marks Roblox co-development Phase 1 implemented without a shadow pipeline',()=>{
  const roadmap=JSON.parse(fs.readFileSync(path.join(process.cwd(),'company-learning/platform-release-roadmap.json'),'utf8'));
  const phase=roadmap.developmentLifecycleMachine.internalPlatformPlaytestDevelopment;
  assert.equal(phase.implementationState,'PHASE1_IMPLEMENTED');
  assert.equal(phase.phase1Implementation.noNewPipeline,true);
  assert.equal(phase.phase1Implementation.noNewDepartment,true);
  assert.equal(phase.phase1Implementation.workLock.acquireBeforeSourceWrite,true);
  assert.equal(phase.phase1Implementation.workLock.releaseAfterFanInOrAbort,true);
});
