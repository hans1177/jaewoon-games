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
  assert.equal(auto.admissionClosed,true);
  assert.equal(auto.concurrentCeiling,1);
  assert.equal(ownerFirstRunnerAllocation({tasks:[task('auto')]},{
    lane:'game-primary',requestedMax:128,observedActiveHostedJobs:'9'}).concurrentCeiling,3);
  const owner=ownerFirstRunnerAllocation({tasks:[task('owner',{ownerDirective:true})]},{
    lane:'game-primary',requestedMax:128,observedActiveHostedJobs:'12'});
  assert.equal(owner.admissionClosed,false);assert.equal(owner.concurrentCeiling,8);
});

test('stale autonomous tasks require exact opted-in main revision and are never applied to running or owner work',()=>{
 const rows=[
   task('old',{evidence:['autonomous-pinned-main-sha:'+sha]}),
   task('same',{evidence:['autonomous-pinned-main-sha:'+newer]}),
   task('owner',{ownerDirective:true,evidence:['autonomous-pinned-main-sha:'+sha]}),
   task('running',{status:'running',evidence:['autonomous-pinned-main-sha:'+sha]}),
   task('not-pinned',{evidence:['source-revision:'+sha]})
 ];
 const out=repairStaleAutonomousQueue({tasks:rows},newer);
 assert.deepEqual(out.cancelled,['old']);
 assert.equal(out.queue.tasks[0].status,'cancelled');
 assert.equal(out.queue.tasks[1].status,'queued');
 assert.equal(out.queue.tasks[2].status,'queued');
 assert.equal(out.queue.tasks[3].status,'running');
 assert.equal(out.queue.tasks[4].status,'queued');
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
 assert.match(qa,/automaticImpactedChecks\(changed\)/);
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
