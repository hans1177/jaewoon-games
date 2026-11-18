import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ownerFirstRunnerAllocation } from '../tools/vibe2-adaptive-backpressure.mjs';
import { selectReviewedWinnerRecoveries } from '../tools/vibe2-release-dispatch-recovery.mjs';
import {createVibeContinuousQueue,finishVibeQueueTask} from '../assets/vibe-continuous-queue.js';
import {
  observedHostedRunnerJobs, repairStaleAutonomousQueue, rerouteRepeatingAutoFailures,
  requeueCooledDownAutoFailures, checkAutonomousCandidate, classifyCloudflareQuota,
  shouldRetryCloudflarePublication, automaticImpactedChecks, verifiedMaintenanceMode
} from '../tools/vibe2-autonomous-operations.mjs';

const sha='a'.repeat(40);
const newer='b'.repeat(40);
const task=(id,extra={})=>({id,gameId:'cozy-island',target:'web',department:'development',
  type:'implementation',status:'queued',goal:'fix gameplay',responsibleFiles:['game.js'],
  ownerDirective:false,evidence:[],...extra});

test('hosted reserve handoff requires exact in-progress job and complete snapshot',()=>{
  const runs=[{id:42,status:'in_progress',jobs:[
    {name:'reserve',status:'in_progress',labels:['ubuntu-slim']},
    {name:'worker',status:'in_progress',labels:['ubuntu-latest']}
  ]}];
  const exact=observedHostedRunnerJobs({runs,currentRunId:'42'});
  assert.equal(exact.known,true);
  assert.equal(exact.observedJobs,2);
  assert.equal(exact.reserveJobObserved,true);
  assert.equal(observedHostedRunnerJobs({runs,currentRunId:'43'}).reserveJobObserved,false);
  assert.equal(observedHostedRunnerJobs({runs:[{id:42,status:'in_progress',jobs:[
    {name:'reserve',status:'queued',labels:['ubuntu-slim']}
  ]}],currentRunId:'42'}).reserveJobObserved,false);
  assert.equal(observedHostedRunnerJobs({runs:[{id:42,status:'in_progress',jobs:[
    {name:'reserve',status:'in_progress',labels:['self-hosted']}
  ]}],currentRunId:'42'}).reserveJobObserved,false);
  const partial=observedHostedRunnerJobs({runs:[...runs,{id:43,status:'in_progress'}],currentRunId:'42'});
  assert.equal(partial.known,false);
  assert.equal(partial.observedJobs,null);
  assert.equal(partial.reserveJobObserved,false);
});

test('actual GitHub hosted jobs count, not workflow run count, and unknown probe is never fabricated',()=>{
  const x=observedHostedRunnerJobs({runs:[
    {status:'in_progress',jobs:[{status:'in_progress',labels:['ubuntu-latest']},
      {status:'completed',labels:['ubuntu-latest']},{status:'in_progress',labels:['self-hosted']}]},
    {status:'in_progress',jobs:[{status:'in_progress',labels:['ubuntu-latest']}]}]});
  assert.equal(x.observedJobs,2);assert.equal(x.observedRuns,2);assert.equal(x.known,true);
  const unknown=observedHostedRunnerJobs({runs:[{status:'in_progress'}]});
  assert.equal(unknown.known,false);assert.equal(unknown.observedJobs,null);
  const auto=ownerFirstRunnerAllocation({tasks:[task('auto')]},{
    lane:'game-primary',requestedMax:128,observedActiveHostedJobs:'12'});
  assert.equal(auto.admissionClosed,false);
  assert.equal(auto.concurrentCeiling,128);
  assert.equal(ownerFirstRunnerAllocation({tasks:[task('auto')]},{
    lane:'game-primary',requestedMax:128,observedActiveHostedJobs:'9'}).concurrentCeiling,128);
  const owner=ownerFirstRunnerAllocation({tasks:[task('owner',{ownerDirective:true})]},{
    lane:'game-primary',requestedMax:128,observedActiveHostedJobs:'12'});
  assert.equal(owner.admissionClosed,false);assert.equal(owner.concurrentCeiling,128);
});

test('stale autonomous tasks require exact opted-in main revision and are never applied to running or owner work',()=>{
 const rows=[
   task('old',{evidence:['autonomous-pinned-main-sha:'+sha]}),
   task('same',{evidence:['autonomous-pinned-main-sha:'+newer]}),
   task('owner',{ownerDirective:true,evidence:['autonomous-pinned-main-sha:'+sha]}),
   task('running',{status:'running',evidence:['autonomous-pinned-main-sha:'+sha]}),
   task('not-pinned',{evidence:['source-revision:'+sha]})
 ].map(row=>({...row,responsibleFiles:[row.id+'.js']})); // 정확한 SHA 취소만 검증하고 기존 중복 소스 취소와 분리
 const out=repairStaleAutonomousQueue({tasks:rows},newer);
 assert.deepEqual(out.cancelled,['old']);
 assert.equal(out.queue.tasks[0].status,'cancelled');
 assert.equal(out.queue.tasks[1].status,'queued');
 assert.equal(out.queue.tasks[2].status,'queued');
 assert.equal(out.queue.tasks[3].status,'running');
 assert.equal(out.queue.tasks[4].status,'queued');
 // [실제 병목 회귀] 구버전 작업 취소 후에도 같은 파일·목표의 최신 SHA 작업은 계속 실행 가능해야 한다.
 const sameFile=repairStaleAutonomousQueue({tasks:[
   task('outdated',{evidence:['autonomous-pinned-main-sha:'+sha]}),
   task('latest',{evidence:['autonomous-pinned-main-sha:'+newer]})
 ]},newer);
 assert.deepEqual(sameFile.cancelled,['outdated']);
 assert.equal(sameFile.queue.tasks[0].blocker,'SUPERSEDED_BY_MAIN_REVISION');
 assert.equal(sameFile.queue.tasks[1].status,'queued');
 const duplicate=repairStaleAutonomousQueue({tasks:[task('first'),task('second')]},newer);
 assert.deepEqual(duplicate.cancelled,['second']);
 assert.equal(duplicate.queue.tasks[1].blocker,'DUPLICATE_AUTONOMOUS_WORK');
});

test('actual canonical FAIL evidence rotates causal strategy after three identical consecutive errors',()=>{
 let q=createVibeContinuousQueue({tasks:[task('repeat',{status:'running'}),
   task('owner',{status:'running',ownerDirective:true})]});
 for(let count=1;count<=3;count++){
   q=finishVibeQueueTask(q,{taskId:'repeat',outcome:'FAIL',blocker:'UNCAUGHT_RENDER_ERROR'}).queue;
   const row=q.tasks.find(x=>x.id==='repeat');
   assert.equal(row.retries,count);
   assert.ok(row.evidence.includes('retry-cause-streak:UNCAUGHT_RENDER_ERROR:'+count));
 }
 const transformed=rerouteRepeatingAutoFailures(q,{now:Date.parse('2026-10-20T00:00:00Z')});
 assert.deepEqual(transformed.rerouted,['repeat']);
 assert.match(transformed.queue.tasks[0].goal,/AUTONOMOUS_ALTERNATE_CAUSAL_REPAIR/);
 assert.equal(transformed.queue.tasks[1].goal,'fix gameplay');
 assert.deepEqual(rerouteRepeatingAutoFailures(transformed.queue).rerouted,[]);
});

test('six identical automatic failures trigger a bounded cooldown and resume automatically',()=>{
 const start=Date.parse('2026-10-20T00:00:00Z');
 let queue=createVibeContinuousQueue({tasks:[task('loop',{status:'running'}),task('owner',{
   ownerDirective:true,status:'running'})]});
 for(let i=1;i<=6;i++){
   queue=finishVibeQueueTask(queue,{taskId:'loop',outcome:'FAIL',blocker:'SOURCE_VALIDATION_FAILED'}).queue;
   if(i===3)queue=createVibeContinuousQueue(rerouteRepeatingAutoFailures(queue,{now:start}).queue);
 }
 const result=rerouteRepeatingAutoFailures(queue,{now:start});
 assert.deepEqual(result.cooled,['loop']);
 assert.equal(result.queue.tasks[0].status,'blocked');
 assert.equal(result.queue.tasks[0].blocker,'AUTONOMOUS_SAME_CAUSE_COOLDOWN');
 assert.equal(result.queue.tasks[1].status,'running');
 const early=requeueCooledDownAutoFailures(result.queue,{now:start+19*60_000});
 assert.deepEqual(early.resumed,[]);
 const late=requeueCooledDownAutoFailures(result.queue,{now:start+21*60_000});
 assert.deepEqual(late.resumed,['loop']);
 assert.equal(late.queue.tasks[0].status,'queued');
 assert.equal(late.queue.tasks[0].blocker,null);
 assert.ok(!late.queue.tasks[0].evidence.some(x=>x.startsWith('retry-cause-streak:')));
 assert.deepEqual(rerouteRepeatingAutoFailures(late.queue,{now:start+21*60_000}).cooled,[]);
});

test('changing the actual failure cause resets identical-error streak and never cools owner directives',()=>{
 let q=createVibeContinuousQueue({tasks:[task('a'),task('owner',{ownerDirective:true})]});
 for(let i=0;i<5;i++)q=finishVibeQueueTask(q,{taskId:'a',outcome:'FAIL',blocker:'OLD_CAUSE'}).queue;
 q=finishVibeQueueTask(q,{taskId:'a',outcome:'FAIL',blocker:'NEW_CAUSE'}).queue;
 const evidence=q.tasks[0].evidence;
 assert.ok(evidence.includes('retry-cause-streak:NEW_CAUSE:1'));
 assert.ok(!evidence.some(x=>x.startsWith('retry-cause-streak:OLD_CAUSE:')));
 assert.deepEqual(rerouteRepeatingAutoFailures(q,{now:0}).cooled,[]);
 for(let i=0;i<7;i++)q=finishVibeQueueTask(q,{taskId:'owner',outcome:'FAIL',blocker:'SAME_OWNER_CAUSE'}).queue;
 assert.equal(q.tasks[1].retries,7);
 assert.deepEqual(rerouteRepeatingAutoFailures(q,{now:0}).cooled,[]);
});
test('a claimed code PASS with no changed files cannot reach fan-in; measured FPS or memory regressions fail',()=>{
 const row=task('edit',{status:'running'});
 assert.equal(checkAutonomousCandidate(row,{outcome:'PASS',metrics:{changedFileCount:0}}).reason,'AUTONOMOUS_NO_SOURCE_CHANGE');
 assert.equal(checkAutonomousCandidate(row,{outcome:'PASS',metrics:{changedFileCount:1},
   runtimePerformance:{before:{fps:60},after:{fps:42}}}).reason,'AUTONOMOUS_FPS_REGRESSION');
 assert.equal(checkAutonomousCandidate(row,{outcome:'PASS',metrics:{changedFileCount:1},
   runtimePerformance:{before:{fps:60,memoryMb:200},after:{fps:60,memoryMb:300}}}).reason,'AUTONOMOUS_MEMORY_REGRESSION');
 assert.equal(checkAutonomousCandidate(row,{outcome:'PASS',metrics:{changedFileCount:1}}).accepted,true);
 assert.equal(checkAutonomousCandidate({...row,ownerDirective:true},{outcome:'PASS',metrics:{changedFileCount:0}}).accepted,true);
});

test('quota messages skip Cloudflare-only replay but never forge release success or suppress GitHub Pages',()=>{
 const quota=classifyCloudflareQuota('Cloudflare Pages free plan build quota exceeded');
 assert.equal(quota.quotaExceeded,true);assert.equal(quota.autoPass,false);
 assert.equal(classifyCloudflareQuota('Cloudflare Pages test assertion error').quotaExceeded,false);
 const evidence=['vibe2/candidate/web-test','candidate-sha:'+sha,'role-result:regression:PASS',
  'role-result:review:PASS','package-review:all-required-roles-pass',
  'web-f0-f9-verified','web-f9-verified','web-publish-after-f9-required'];
 const ready=task('web',{status:'verified',evidence});
 assert.equal(selectReviewedWinnerRecoveries({tasks:[ready]}).count,1);
 const paused=task('web',{status:'verified',evidence:[...evidence,'cloudflare-publication-target','cloudflare-quota-exhausted']});
 assert.equal(shouldRetryCloudflarePublication(paused),false);
 assert.equal(selectReviewedWinnerRecoveries({tasks:[paused]}).count,0);
 const reset=task('web',{status:'verified',evidence:[...paused.evidence,'cloudflare-quota-cleared-verified']});
 assert.equal(shouldRetryCloudflarePublication(reset),true);
 assert.equal(selectReviewedWinnerRecoveries({tasks:[reset]}).count,1);
});

test('incremental checks are game-scoped advisory only and shared changes require shared regression',()=>{
 const affected=automaticImpactedChecks(['web-games/cozy-island/game.js','assets/vibe-runtime.js',
   'web-games/cozy-island/style.css']);
 assert.deepEqual(affected.gameIds,['cozy-island']);
 assert.equal(affected.sharedCodeChanged,true);
 assert.ok(affected.tests.includes('shared-dependency-regression'));
 assert.equal(affected.canReplaceFinalQA,false);
 const source=fs.readFileSync('.github/workflows/vibe2-continuous-core.yml','utf8');
 assert.match(source,/VIBE2_OBSERVED_ACTIVE_HOSTED_JOBS/);
 const qa=fs.readFileSync('tools/vibe2-incremental-qa.mjs','utf8');
 assert.match(qa,/automaticImpactedChecks\(changed,/);
});

// [위험 예측] 기존 회귀검사를 유지하면서 Roblox 저장·서버 권한 경계·반복 오류를 우선 분류한다.
test('impacted QA predicts Roblox persistence and authority hotspots with bounded focused tests',()=>{
 const gameRepair={required:true,prePatchReproduced:true,failureSignature:'save-reconnect',
  repeatCount:4,responsibleFiles:['server/Profile.server.luau'],
  invariants:{testTargets:['qa/profile-invariant.test.mjs','qa/../escape.test.mjs']},
  saveMigration:{testTargets:['qa/save-migration.test.mjs','/tmp/unsafe.test.mjs']},
  multiplayerLifecycle:{testTargets:['qa/two-client.test.mjs','qa/profile-invariant.test.mjs']}
 };
 const files=['roblox-games/demo/server/Profile.server.luau','roblox-games/demo/client/GUI.client.luau'];
 const result=automaticImpactedChecks(files,{sourceRoot:'roblox-games/demo',gameRepair});
 assert.deepEqual(result.gameIds,['demo']);
 assert.equal(result.riskPrediction.level,'HIGH');
 assert.ok(result.riskPrediction.signals.includes('PERSISTENCE_SOURCE_CHANGE'));
 assert.ok(result.riskPrediction.signals.includes('ROBLOX_CLIENT_SERVER_BOUNDARY'));
 assert.ok(result.riskPrediction.signals.includes('REPEATED_DECLARED_FAILURE'));
 assert.deepEqual(result.focusedTargets.map(x=>x.target),[
  'qa/profile-invariant.test.mjs','qa/save-migration.test.mjs','qa/two-client.test.mjs']);
 assert.equal(result.focusedTargetsExecuted,false);
 assert.equal(result.riskPrediction.runtimeProbabilityKnown,false);
 assert.equal(result.riskPrediction.evidence,'STATIC_HEURISTIC_AND_DECLARED_MANIFEST_ONLY');
 assert.equal(result.fullRegressionStillRequired,true);
 assert.equal(result.canReplaceFinalQA,false);
 assert.ok(result.tests.includes('full-release-fan-in-unchanged'));
});

test('impact prediction rejects stale failure context and cannot fabricate focused coverage',()=>{
 const base=automaticImpactedChecks(['roblox-games/demo/server/Fight.server.luau']);
 assert.equal(base.riskPrediction.level,'ELEVATED');
 assert.deepEqual(base.focusedTargets,[]);
 const repair={required:true,prePatchReproduced:false,failureSignature:'old',
  repeatCount:20,responsibleFiles:['server/Fight.server.luau'],
  invariants:{testTargets:['qa/battle.test.mjs']}};
 const noProof=automaticImpactedChecks(['roblox-games/demo/server/Fight.server.luau'],
  {sourceRoot:'roblox-games/demo',gameRepair:repair});
 assert.equal(noProof.riskPrediction.signals.includes('REPEATED_DECLARED_FAILURE'),false);
 assert.deepEqual(noProof.focusedTargets.map(x=>x.target),['qa/battle.test.mjs']);
 const irrelevant=automaticImpactedChecks(['web-games/other/ui.css'],
  {sourceRoot:'roblox-games/demo',gameRepair:{...repair,prePatchReproduced:true}});
 assert.equal(irrelevant.riskPrediction.level,'LOW');
 assert.deepEqual(irrelevant.focusedTargets,[]);
 assert.equal(irrelevant.riskPrediction.signals.length,0);
 assert.deepEqual(irrelevant.tests,['source-syntax-and-security','game-runtime:other','full-release-fan-in-unchanged']);
});

// [자동 감시] 기존 실제 QA 권한·F0~F9 진행 순서는 유지한다.
test('Roblox autonomous source risk identifies startup mobile visuals economy and performance',()=>{
  const changed=[
    'roblox-games/demo/client/StartMenu.client.luau',
    'roblox-games/demo/client/HUD.client.luau',
    'roblox-games/demo/server/Reward.server.luau',
    'roblox-games/demo/shared/WorldModel.luau',
    'roblox-games/demo/shared/Performance.luau'
  ];
  const found=automaticImpactedChecks(changed);
  for(const signal of ['ROBLOX_STARTUP_FIRST_PLAY_TOUCHPOINT','ROBLOX_MOBILE_INPUT_UI_TOUCHPOINT',
    'ROBLOX_ECONOMY_BALANCE_TOUCHPOINT','ROBLOX_NATIVE_ASSET_BINDING_TOUCHPOINT',
    'ROBLOX_PERFORMANCE_BUDGET_TOUCHPOINT'])assert.ok(found.riskPrediction.signals.includes(signal),signal);
  assert.equal(found.riskPrediction.level,'HIGH');
  assert.equal(found.canReplaceFinalQA,false);
  assert.equal(found.riskPrediction.runtimeProbabilityKnown,false);
  assert.equal(found.focusedTargetsExecuted,false);
});

test('Roblox owned repair prioritizes generic save and multiplayer without stale cross game claims',()=>{
  const files=['roblox-games/demo/server/Main.server.luau'];
  const repair={required:true,responsibleFiles:['server/Main.server.luau'],
    saveMigration:{required:true,testTargets:['qa/save-rejoin.test.mjs']},
    multiplayerLifecycle:{required:true,testTargets:['qa/two-clients.test.mjs']}};
  const own=automaticImpactedChecks(files,{sourceRoot:'roblox-games/demo',gameRepair:repair});
  assert.ok(own.riskPrediction.signals.includes('PERSISTENCE_SOURCE_CHANGE'));
  assert.ok(own.riskPrediction.signals.includes('ROBLOX_MULTIPLAYER_CONTRACT_TOUCHPOINT'));
  assert.deepEqual(own.focusedTargets.map(row=>row.target),[
    'qa/save-rejoin.test.mjs','qa/two-clients.test.mjs']);
  const other=automaticImpactedChecks(['roblox-games/other/server/Main.server.luau'],
    {sourceRoot:'roblox-games/demo',gameRepair:repair});
  assert.ok(!other.riskPrediction.signals.includes('PERSISTENCE_SOURCE_CHANGE'));
  assert.ok(!other.riskPrediction.signals.includes('ROBLOX_MULTIPLAYER_CONTRACT_TOUCHPOINT'));
  assert.deepEqual(other.focusedTargets,[]);
});

// [24시간 회귀] 실제 Rojo src 파일 책임과 게시·플레이 영향은 정적 힌트로만 보고한다.
test('Mare source paths classify startup mobile field economy save multiplayer and publish target',()=>{
 const changed=[
  'roblox-games/mare-essentia/src/ServerScriptService/Core.server.luau',
  'roblox-games/mare-essentia/src/ServerScriptService/Services/State.luau',
  'roblox-games/mare-essentia/src/StarterPlayer/Game.client.luau',
  'roblox-games/mare-essentia/src/ReplicatedStorage/Shared/FieldScene.luau',
  'roblox-games/mare-essentia/src/ReplicatedStorage/Shared/PortBuildings.luau',
  'roblox-games/mare-essentia/src/ServerScriptService/Services/Trade.luau',
  'roblox-games/mare-essentia/src/ServerScriptService/Services/PlayerSession.luau',
  'roblox-games/mare-essentia/experience-target.json'
 ];
 const got=automaticImpactedChecks(changed);
 assert.deepEqual(got.gameIds,['mare-essentia']);
 for(const signal of ['ROBLOX_CLIENT_SERVER_BOUNDARY','PERSISTENCE_SOURCE_CHANGE',
  'ROBLOX_ECONOMY_BALANCE_TOUCHPOINT','ROBLOX_STARTUP_FIRST_PLAY_TOUCHPOINT',
  'ROBLOX_MOBILE_INPUT_UI_TOUCHPOINT','ROBLOX_NATIVE_ASSET_BINDING_TOUCHPOINT',
  'ROBLOX_PERFORMANCE_BUDGET_TOUCHPOINT','ROBLOX_MULTIPLAYER_CONTRACT_TOUCHPOINT',
  'ROBLOX_PUBLISH_TARGET_TOUCHPOINT'])assert.ok(got.riskPrediction.signals.includes(signal),signal);
 assert.equal(got.riskPrediction.level,'HIGH');
 assert.equal(got.focusedTargetsExecuted,false);
 assert.equal(got.riskPrediction.runtimeProbabilityKnown,false);
 assert.equal(got.fullRegressionStillRequired,true);
 assert.equal(got.canReplaceFinalQA,false);
});
test('Mare source risk ignores other game repair and never fabricates runtime PASS',()=>{
 const out=automaticImpactedChecks(
  ['roblox-games/mare-essentia/src/ReplicatedStorage/Shared/FieldScene.luau'],{
  sourceRoot:'roblox-games/simple-rpg',
  gameRepair:{required:true,prePatchReproduced:true,repeatCount:4,
   failureSignature:'unrelated-old-failure',responsibleFiles:['server/Game.server.luau'],
   multiplayerLifecycle:{required:true,testTargets:['qa/old-game.test.mjs']},
   saveMigration:{required:true,testTargets:['qa/old-save.test.mjs']}}
 });
 assert.deepEqual(out.gameIds,['mare-essentia']);
 assert.ok(out.riskPrediction.signals.includes('ROBLOX_PERFORMANCE_BUDGET_TOUCHPOINT'));
 assert.equal(out.riskPrediction.signals.includes('REPEATED_DECLARED_FAILURE'),false);
 assert.deepEqual(out.focusedTargets,[]);
 assert.equal(out.focusedTargetsExecuted,false);
 assert.equal(out.canReplaceFinalQA,false);
});

test('maintenance takes over only after exact published source and QA are both proven',()=>{
 const proof={published:true,independentQA:true,regression:true,
   sourceRevision:sha,verifiedSourceRevision:sha};
 assert.equal(verifiedMaintenanceMode({},proof).mode,'MAINTENANCE');
 assert.equal(verifiedMaintenanceMode({}, {...proof,independentQA:false}).mode,'DEVELOPMENT');
 assert.equal(verifiedMaintenanceMode({}, {...proof,verifiedSourceRevision:newer}).verified,false);
 assert.equal(verifiedMaintenanceMode({ownerDirective:true},proof).mode,'OWNER_DIRECT');
 const src=fs.readFileSync('tools/vibe2-post-release-focus.mjs','utf8');
 assert.match(src,/verifiedMaintenanceMode/);
});

test('Roblox autonomous build-up rejects absent source evidence and mismatched game identity',()=>{
 const row=task('roblox-build-up',{target:'roblox',gameId:'magic-forest',status:'running',
   responsibleFiles:['roblox-games/magic-forest/server/Game.server.luau']});
 const actual={outcome:'PASS',metrics:{changedFileCount:1,addedLineCount:12,deletedLineCount:4},
   candidateBranch:'vibe2/candidate/magic-forest-test',baseMainSha:sha,
   candidateIdentity:{gameId:'magic-forest',target:'roblox',sourceRoot:'roblox-games/magic-forest'},
   evidence:['candidate-sha:'+newer]};
 assert.equal(checkAutonomousCandidate(row,{...actual,metrics:{}}).reason,'AUTONOMOUS_NO_SOURCE_CHANGE');
 assert.equal(checkAutonomousCandidate(row,{...actual,metrics:{changedFileCount:1}}).reason,'AUTONOMOUS_NO_SOURCE_CHANGE');
 assert.equal(checkAutonomousCandidate(row,{...actual,evidence:[]}).reason,'AUTONOMOUS_ROBLOX_SOURCE_PROOF_MISSING');
 assert.equal(checkAutonomousCandidate(row,{...actual,candidateIdentity:{...actual.candidateIdentity,gameId:'other'}}).reason,'AUTONOMOUS_ROBLOX_SOURCE_PROOF_MISSING');
 assert.equal(checkAutonomousCandidate(row,{...actual,candidateBranch:'vibe2/candidate/magic-forest-test',baseMainSha:newer}).reason,'AUTONOMOUS_ROBLOX_SOURCE_PROOF_MISSING');
 assert.equal(checkAutonomousCandidate(row,actual).accepted,true);
 assert.equal(checkAutonomousCandidate({...row,ownerDirective:true},{outcome:'PASS',metrics:{changedFileCount:0}}).accepted,true);
});
