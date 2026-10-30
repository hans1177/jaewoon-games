import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {emptyWebVibeQueue,assertWebVibeQueue,ingestWebVibeTask,buildWebVibeSync,buildWebVibeQueueHealth,WEB_VIBE_QUEUE_FILE,WEB_VIBE_CONTROL_BRANCH,WEB_VIBE_ENGINE} from '../tools/web-vibe-organization.mjs';
const uuid='11111111-2222-4333-8444-555555555555';
function fixture(){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'web-vibe-fixture-'));
  fs.mkdirSync(path.join(root,'web-games','insect-survival'),{recursive:true});
  fs.writeFileSync(path.join(root,'web-games','insect-survival','index.html'),'<html>game</html>');
  fs.mkdirSync(path.join(root,'company-learning'),{recursive:true});
  fs.writeFileSync(path.join(root,'company-learning','platform-release-roadmap.json'),JSON.stringify({
    status:'OWNER_DIRECT_LOCKED',developmentAccess:{WEB:'ALWAYS_ALLOWED'},
    ownerActiveDevelopmentScope20261009:{status:'ACTIVE',activeTargets:['WEB']},
    localVibeWebChat:{enabled:true,platform:'WEB'},
    finalDevelopmentLock:{sequenceLock:{status:'LOCKED'}}
  }));
  return {root,catalog:{games:[{id:'insect-survival',name:'곤충 생존기',webPath:'/web-games/insect-survival/'}]},status:{projects:[]}};
}
test('separate WEB vibe has exact independent state/engine identity',()=>{
  const q=emptyWebVibeQueue();
  assert.equal(q.engine,WEB_VIBE_ENGINE);
  assert.equal(q.organization,'WEB');
  assert.equal(WEB_VIBE_QUEUE_FILE,'.web-vibe/queue.json');
  assert.equal(WEB_VIBE_CONTROL_BRANCH,'web-vibe-control');
  assert.deepEqual(assertWebVibeQueue(q),q);
  assert.throws(()=>assertWebVibeQueue({...q,engine:'VIBE2_VIBE3'}),/OWNERSHIP_INVALID/);
  assert.throws(()=>assertWebVibeQueue({...q,organization:'ROBLOX'}),/OWNERSHIP_INVALID/);
});
test('authenticated web owner request enters WEB queue only, duplicates cannot switch game or goal',()=>{
  const f=fixture(),task={id:uuid,game_id:'insect-survival',platform:'web',body:'웹 입력 고치기'};
  const created=ingestWebVibeTask({task,queue:emptyWebVibeQueue(),catalog:f.catalog,status:f.status,repoRoot:f.root});
  assert.equal(created.ingest.added,true);
  assert.equal(created.tasks[0].sourceRoot,'web-games/insect-survival');
  assert.equal(created.tasks[0].target,'web');
  assert.equal(created.tasks[0].goal,'웹 입력 고치기');
  assert.equal(created.tasks[0].ownerDirective,true);
  assert.equal(created.tasks[0].evidence.includes('owner-auto-deploy-authorization'),false);
  assert.equal(ingestWebVibeTask({task,queue:created,catalog:f.catalog,status:f.status,repoRoot:f.root}).ingest.added,false);
  assert.throws(()=>ingestWebVibeTask({task:{...task,body:'다른 지시'},queue:created,catalog:f.catalog,status:f.status,repoRoot:f.root}),/COLLISION/);
  assert.deepEqual(buildWebVibeSync(created).updates,[{taskId:uuid,status:'working',blocker:null}]);
  assert.deepEqual(buildWebVibeSync({...created,tasks:[{...created.tasks[0],status:'merged'}]}).updates,[{taskId:uuid,status:'done',blocker:null}]);
});
test('WEB queue rejects all native, forged identity and path escape entries',()=>{
  const q=emptyWebVibeQueue(),f=fixture(),task={id:uuid,game_id:'insect-survival',body:'HUD 수정',platform:'web'};
  const created=ingestWebVibeTask({task,queue:q,catalog:f.catalog,status:f.status,repoRoot:f.root});
  const one=created.tasks[0];
  for(const change of [{target:'roblox'},{target:'unity'},{gameId:'../native'},{sourceRoot:'roblox-games/insect-survival'},
    {responsibleFiles:['unity-games/insect-survival/index.html']},{status:'done'},{id:'native-001'}]){
    assert.throws(()=>assertWebVibeQueue({...q,tasks:[{...one,...change}]}),/WEB_VIBE_NATIVE_OR_INVALID_TASK_REJECTED/);
  }
  assert.throws(()=>ingestWebVibeTask({task:{...task,platform:'unity'},queue:q,catalog:f.catalog,status:f.status,repoRoot:f.root}));
});
test('local WEB queue is independent while GitHub runs cloud development as before',()=>{
  const workflow=fs.readFileSync('.github/workflows/pwa-command-bridge.yml','utf8');
  const local=workflow.slice(workflow.indexOf('  bridge:'),workflow.indexOf('  github-cloud:'));
  const cloud=workflow.slice(workflow.indexOf('  github-cloud:'),workflow.indexOf('  web-recovery-select:'));
  assert.ok(workflow.includes('WEB_VIBE_BRANCH: web-vibe-control'));
  assert.ok(local.includes('.web-vibe/queue.json'));
  assert.ok(local.includes('tools/web-vibe-organization.mjs'));
  assert.ok(local.includes('WEB_VIBE_EXECUTION=DEDICATED_LOCAL_ENGINE_REQUIRED'));
  assert.ok(!local.includes('vibe2-continuous-core.yml'));
  assert.ok(!local.includes('.vibe2/queue.json'));
  assert.ok(cloud.includes('VIBE2_BRANCH: vibe2-unreal-core'));
  assert.ok(cloud.includes('gh workflow run vibe2-continuous-core.yml'));
  assert.ok(!cloud.includes('.web-vibe/queue.json'));
});

test('WEB build-up carries only same-game merged owner changes without delaying new instructions',t=>{
  const f=fixture();t.after(()=>fs.rmSync(f.root,{recursive:true,force:true}));
  const first={id:uuid,game_id:'insect-survival',platform:'web',body:'기존 몬스터 공격 수정'};
  const q=ingestWebVibeTask({task:first,queue:emptyWebVibeQueue(),catalog:f.catalog,status:f.status,repoRoot:f.root});
  const second={...first,id:'22222222-3333-4444-8555-666666666666',body:'새 UI 요청'};
  const ongoing=ingestWebVibeTask({task:second,queue:q,catalog:f.catalog,status:f.status,repoRoot:f.root});
  assert.equal(ongoing.tasks[1].status,'queued');
  assert.equal(ongoing.tasks[1].ownerPatchLineage,undefined,'queued is not a verified predecessor');
  const verified={...q,tasks:[{...q.tasks[0],status:'merged'}]};
  const continued=ingestWebVibeTask({task:second,queue:verified,catalog:f.catalog,status:f.status,repoRoot:f.root});
  assert.deepEqual(continued.tasks[1].ownerPatchLineage.verifiedPredecessors,[q.tasks[0].id]);
  assert.equal(continued.tasks[1].priority,'owner-immediate');
  assert.ok(continued.tasks[1].evidence.includes('web-onepatch-build-up-carry:verified-only'));
  assert.throws(()=>assertWebVibeQueue({...q,tasks:[
    q.tasks[0],{...continued.tasks[1],status:'queued'}
  ]}),/WEB_VIBE_UNVERIFIED_OR_FOREIGN_LINEAGE/);
  const foreign={...q.tasks[0],id:'pwa-99999999-aaaa-4bbb-8ccc-222222222222',gameId:'other',sourceRoot:'web-games/other',status:'merged'};
  assert.throws(()=>assertWebVibeQueue({...q,tasks:[foreign,continued.tasks[1]]}),/WEB_VIBE_UNVERIFIED_OR_FOREIGN_LINEAGE/);
});

test('WEB_VIBE watchdog selects one authenticated queued task with bounded retry and exact file scope',async()=>{
  const {selectWebVibeRecoveryTask,recordWebVibeRecoveryFailure}=await import('../tools/web-vibe-recovery.mjs');
  const q=emptyWebVibeQueue();
  const task={
    id:'pwa-11111111-2222-4333-8444-555555555555',
    gameId:'insect-survival',sourceRoot:'web-games/insect-survival',target:'web',
    sourceFiles:'index.html,client/game.js',status:'queued',goal:'improve input',
    ownerDirective:true,evidence:['owner-source-authenticated','qa-required-before-pr-merge']
  };
  const state={...q,tasks:[task]};
  const selected=selectWebVibeRecoveryTask(state,{now:'2026-10-24T01:00:00Z'});
  assert.equal(selected.files,'index.html,client/game.js');
  assert.equal(selected.gameId,'insect-survival');
  const first=recordWebVibeRecoveryFailure(state,task.id,{now:'2026-10-24T01:00:00Z'});
  assert.equal(first.attempts,1);
  assert.equal(first.queue.tasks[0].status,'queued');
  assert.equal(selectWebVibeRecoveryTask(first.queue,{now:'2026-10-24T01:20:00Z'}),null);
  assert.ok(selectWebVibeRecoveryTask(first.queue,{now:'2026-10-24T01:31:00Z'}));
  const twice=recordWebVibeRecoveryFailure(first.queue,task.id,{now:'2026-10-24T02:00:00Z'});
  const last=recordWebVibeRecoveryFailure(twice.queue,task.id,{now:'2026-10-24T03:00:00Z'});
  assert.equal(last.exhausted,true);
  assert.equal(last.queue.tasks[0].status,'blocked');
  assert.equal(selectWebVibeRecoveryTask(last.queue,{now:'2026-10-24T04:00:00Z'}),null);
  assert.equal(last.queue.tasks[0].ownerDirective,true);
  assert.equal(last.queue.tasks[0].goal,task.goal);
  assert.equal(selectWebVibeRecoveryTask({...state,tasks:[{...task,status:'review'}]}),null);
  assert.equal(selectWebVibeRecoveryTask({...state,tasks:[{...task,ownerDirective:false}]}),null);
  assert.equal(selectWebVibeRecoveryTask({...state,tasks:[{...task,evidence:[]}]}),null);
  assert.equal(selectWebVibeRecoveryTask({...state,tasks:[{...task,sourceFiles:undefined}]}).files,'*');
});
test('PWA cloud queue recovery keeps existing owner intake and independent QA',()=>{
  const w=fs.readFileSync('.github/workflows/pwa-command-bridge.yml','utf8');
  assert.match(w,/web-recovery-select:/);
  assert.match(w,/github.event_name == 'schedule' \|\| github.event_name == 'workflow_dispatch'/);
  assert.match(w,/node tools\/web-vibe-recovery\.mjs select/);
  assert.match(w,/web-recovery-onepatch:[\s\S]*?group: web-vibe-onepatch-\$\{\{ needs.web-recovery-select.outputs.game_id \}\}/);
  assert.match(w,/company-constitution-enforcer\.mjs --phase=worker-before-source-write/);
  assert.match(w,/node --test qa\/web-vibe-worker\.test\.mjs/);
  assert.match(w,/node tools\/web-vibe-worker\.mjs "--task=pwa-\$WEB_OWNER_TASK_ID"/);
  assert.match(w,/node tools\/web-vibe-recovery\.mjs failure/);
  assert.match(w,/WEB_VIBE_RECOVERY_RESULT=PR_CANDIDATE_ONLY_NOT_MERGED/);
  assert.match(w,/cancel-in-progress: false/);
});

// 회귀: 제공자 쿼터는 소스 실패 횟수를 소비하거나 수동검토로 승격하지 않는다.
test('WEB provider cooldown preserves source budget and allows other owner games',async()=>{
  const {selectWebVibeRecoveryTask,recordWebVibeRecoveryFailure}=await import('../tools/web-vibe-recovery.mjs');
  const make=(id,gameId)=>({id,gameId,target:'web',sourceRoot:'web-games/'+gameId,
    goal:'existing owner repair',status:'queued',ownerDirective:true,
    evidence:['owner-source-authenticated'],recoveryAttempts:2});
  const task=make('pwa-'+uuid,'insect-survival');
  const other=make('pwa-22222222-2222-4333-8444-555555555555','cozy-island');
  const queue={...emptyWebVibeQueue(),tasks:[task,other]};
  const now='2026-10-29T02:46:46.000Z';
  const failureLog='WEB_VIBE_WORKER_BLOCKED=GEMINI_FREE_TWO_MODEL_POOL_UNAVAILABLE_NO_LOCAL_FALLBACK:gemini-3.8-flash:HTTP_429,gemini-3.5-flash-lite:HTTP_429:NEXT_RETRY_AT=2026-10-29T06:59:59.528Z';
  const result=recordWebVibeRecoveryFailure(queue,task.id,{now,failureLog});
  assert.equal(result.failureClass,'PROVIDER_COOLDOWN');
  assert.equal(result.attempts,2);
  assert.equal(result.exhausted,false);
  assert.equal(result.queue.tasks[0].status,'queued');
  assert.equal(result.queue.tasks[0].recoveryNextAt,'2026-10-29T06:59:59.528Z');
  assert.deepEqual(result.queue.tasks[1],other);
  assert.equal(selectWebVibeRecoveryTask(result.queue,{now}).id,other.id);
  const after={...result.queue,tasks:[result.queue.tasks[0]]};
  assert.equal(selectWebVibeRecoveryTask(after,{now}),null);
  assert.equal(selectWebVibeRecoveryTask(after,{now:'2026-10-29T07:00:00Z'}).id,task.id);
  for(const line of [
    'WEB_VIBE_WORKER_BLOCKED=WEB_VIBE_MODEL_REPLACEMENT_UNSAFE_OR_NONUNIQUE',
    failureLog.replaceAll('HTTP_429','HTTP_403'),
    failureLog.replace('gemini-3.5-flash-lite:HTTP_429','gemini-3.5-flash-lite:HTTP_400'),
    'untrusted text '+failureLog
  ]){
    const failed=recordWebVibeRecoveryFailure(queue,task.id,{now,failureLog:line});
    assert.equal(failed.exhausted,true);
    assert.equal(failed.queue.tasks[0].status,'blocked');
  }
  const noDate=recordWebVibeRecoveryFailure(queue,task.id,{now,failureLog:failureLog.split(':NEXT_RETRY_AT=')[0]});
  assert.equal(noDate.queue.tasks[0].recoveryNextAt,'2026-10-29T03:16:46.000Z');
  assert.equal(recordWebVibeRecoveryFailure({...queue,tasks:[{...task,status:'review'}]},task.id,{now,failureLog}).changed,false);
});


// [자동 진화] 기존 WEB 제어 큐에서 공개 소스와 게임별 플레이 검증이 일치하는 PR만 승격한다.
test('WEB autonomous evolution stays review-only until exact merged PR browser and game QA proof',async()=>{
 const {reconcileVerifiedWebReviews}=await import('../tools/web-vibe-recovery.mjs');
 const base=emptyWebVibeQueue();
 const id='pwa-11111111-2222-4333-8444-555555555555';
 const task={id,gameId:'demo',sourceRoot:'web-games/demo',target:'web',
  status:'review',goal:'3D 그래픽 개선',ownerDirective:true,
  reviewPrUrl:'https://github.com/hans1177/jaewoon-games/pull/12345',
  evidence:['owner-source-authenticated'],learningCandidates:[{
   source:'web-games/demo/game.js',owner:'drawLabel',topic:'SCENE_PRESENTATION',
   from:'label.style.opacity=0.5;',to:'label.style.opacity=0.85;',baseSourceSha:'c'.repeat(64)
  }]};
 const state={...base,tasks:[task]};
 const proof={status:'VERIFIED',gameId:'demo',reviewPrUrl:task.reviewPrUrl,
  sourceRevision:'a'.repeat(40),sourceTreeSha:'b'.repeat(40),
  runId:40816165612,browserPassed:true,independentQaPassed:true};
 assert.equal(reconcileVerifiedWebReviews(state).changed,0);
 for(const bad of [
  {...proof,browserPassed:false},
  {...proof,independentQaPassed:false},
  {...proof,sourceRevision:''},
  {...proof,sourceTreeSha:''},
  {...proof,runId:0},
  {...proof,gameId:'other'},
  {...proof,reviewPrUrl:'https://github.com/hans1177/jaewoon-games/pull/99'}
 ])assert.equal(reconcileVerifiedWebReviews(state,{[id]:bad}).changed,0);
 const verified=reconcileVerifiedWebReviews(state,{[id]:proof});
 assert.equal(verified.changed,1);
 assert.equal(verified.queue.tasks[0].status,'merged');
 assert.equal(verified.queue.tasks[0].learningVerification.runId,proof.runId);
 assert.equal(verified.queue.tasks[0].learningVerification.scope,'EXACT_PUBLISHED_GAME_BROWSER_SCENARIOS_ONLY');
 assert.equal(reconcileVerifiedWebReviews(verified.queue,{[id]:proof}).changed,0);
 const w=fs.readFileSync('.github/workflows/pwa-command-bridge.yml','utf8');
 const recovery=fs.readFileSync('tools/web-vibe-recovery.mjs','utf8');
 assert.match(w,/node tools\/web-vibe-recovery\.mjs reconcile/);
 assert.match(w,/node tools\/web-vibe-recovery\.mjs select/);
 assert.match(recovery,/post-publication-3d-smoke/);
 assert.match(recovery,/web-playtest-report\.json/);
 assert.match(recovery,/report\.exactPublishedRevision!==true/);
 assert.match(recovery,/g\.sourceRevision===sha/);
});


test('WEB queue selects fresh games before retries without skipping same-game owner sequence',async()=>{
  const {selectWebVibeRecoveryTask}=await import('../tools/web-vibe-recovery.mjs');
  const id=n=>'pwa-'+String(n).padStart(8,'0')+'-2222-4333-8444-555555555555';
  const item=(n,gameId,extra={})=>({id:id(n),gameId,target:'web',
    sourceRoot:'web-games/'+gameId,status:'queued',goal:'owner-directed game repair',
    ownerDirective:true,evidence:['owner-source-authenticated'],...extra});
  const queue={...emptyWebVibeQueue(),tasks:[
    item(1,'fantasy-survival',{recoveryAttempts:2,recoveryLastFailureAt:'2026-10-29T00:00:00Z'}),
    item(2,'fantasy-survival'),
    item(3,'cozy-island',{recoveryAttempts:0}),
    item(4,'wild-survival',{recoveryAttempts:0})
  ]};
  assert.equal(selectWebVibeRecoveryTask(queue,{now:'2026-10-30T01:00:00Z'}).gameId,'cozy-island');
  const withoutCozy={...queue,tasks:queue.tasks.map(t=>t.gameId==='cozy-island'?{...t,status:'review'}:t)};
  assert.equal(selectWebVibeRecoveryTask(withoutCozy,{now:'2026-10-30T01:00:00Z'}).gameId,'wild-survival');
  const afterWild={...withoutCozy,tasks:withoutCozy.tasks.map(t=>t.gameId==='wild-survival'?{...t,status:'review'}:t)};
  assert.equal(selectWebVibeRecoveryTask(afterWild,{now:'2026-10-30T01:00:00Z'}).id,id(1),
    'a later task in the same game must not overtake its older owner directive');
  const running={...queue,tasks:queue.tasks.map(t=>t.gameId==='cozy-island'?{...t,status:'running'}:t)};
  assert.equal(selectWebVibeRecoveryTask(running,{now:'2026-10-30T01:00:00Z'}).gameId,'wild-survival');
  const cooldown={...withoutCozy,tasks:withoutCozy.tasks.map(t=>t.gameId==='wild-survival'
    ?{...t,recoveryNextAt:'2026-10-30T02:00:00Z'}:t)};
  assert.equal(selectWebVibeRecoveryTask(cooldown,{now:'2026-10-30T01:00:00Z'}).gameId,'fantasy-survival');
});

test('WEB transient checkout errors use bounded infrastructure retries, never source budget',async()=>{
  const {recordWebVibeRecoveryFailure,selectWebVibeRecoveryTask}=await import('../tools/web-vibe-recovery.mjs');
  const item={id:'pwa-'+uuid,gameId:'wild-survival',target:'web',
    sourceRoot:'web-games/wild-survival',status:'queued',goal:'fix exact published movement issue',
    ownerDirective:true,recoveryAttempts:2,evidence:['owner-source-authenticated']};
  let queue={...emptyWebVibeQueue(),tasks:[item]};
  const errorLog='WEB_VIBE_CLOUD_CHECKOUT_DIRTY=8\nWEB_VIBE_WORKER_BLOCKED=WEB_VIBE_CLOUD_CHECKOUT_STILL_DIRTY:8';
  for(let i=1;i<=4;i++){
    const result=recordWebVibeRecoveryFailure(queue,item.id,{now:'2026-10-30T01:00:00Z',failureLog:errorLog});
    assert.equal(result.failureClass,'EPHEMERAL_CHECKOUT');
    assert.equal(result.attempts,2);
    assert.equal(result.infraAttempts,i);
    assert.equal(result.queue.tasks[0].recoveryAttempts,2);
    assert.equal(result.queue.tasks[0].status,i===4?'blocked':'queued');
    queue=result.queue;
  }
  assert.equal(queue.tasks[0].blocker,'WEB_VIBE_EPHEMERAL_CHECKOUT_REVIEW_REQUIRED');
  assert.equal(selectWebVibeRecoveryTask(queue,{now:'2026-10-30T09:00:00Z'}),null);
  const drift=recordWebVibeRecoveryFailure({...queue,tasks:[item]},item.id,{
    now:'2026-10-30T01:00:00Z',
    failureLog:'WEB_VIBE_WORKER_BLOCKED=WEB_VIBE_MAIN_MUST_BE_FAST_FORWARDED_FIRST'});
  assert.equal(drift.failureClass,'EPHEMERAL_CHECKOUT');
  assert.equal(drift.queue.tasks[0].recoveryNextAt,'2026-10-30T01:15:00.000Z');
  const revoked=recordWebVibeRecoveryFailure({...queue,tasks:[item]},item.id,{
    now:'2026-10-30T01:00:00Z',
    failureLog:'WEB_VIBE_WORKER_BLOCKED=WEB_VIBE_FREE_MODEL_KEY_MISSING:web-games/wild-survival/wild3d.mjs'});
  assert.equal(revoked.failureClass,'FREE_PROVIDER_NOT_CONFIGURED');
  assert.equal(revoked.queue.tasks[0].recoveryAttempts,2);
  assert.equal(revoked.queue.tasks[0].status,'blocked');
  assert.equal(revoked.queue.tasks[0].blocker,'WEB_VIBE_VERIFIED_FREE_MODEL_CREDENTIAL_REQUIRED');
  const paidOrAuth=recordWebVibeRecoveryFailure({...queue,tasks:[item]},item.id,{
    now:'2026-10-30T01:00:00Z',
    failureLog:'WEB_VIBE_WORKER_BLOCKED=WEB_VIBE_POLICY_UNVERIFIED'});
  assert.equal(paidOrAuth.failureClass,'SOURCE_OR_UNCLASSIFIED');
  assert.equal(paidOrAuth.exhausted,true,'cannot silently treat policy failures as transient infra');
});

test('WEB queue health reports backpressure without claiming runtime QA passed',()=>{
  const make=(n,gameId,status,extra={})=>({id:'pwa-'+String(n).padStart(8,'0')+
    '-2222-4333-8444-555555555555',gameId,target:'web',
    sourceRoot:'web-games/'+gameId,status,goal:'owner-authenticated game task',
    ownerDirective:true,evidence:['owner-source-authenticated'],...extra});
  const q={...emptyWebVibeQueue(),tasks:[
    make(1,'wild-survival','queued'),make(2,'cozy-island','queued',{
      recoveryNextAt:'2026-10-31T08:00:00Z',recoveryAttempts:1,
      recoveryFailureClass:'PROVIDER_COOLDOWN'}),
    make(3,'cozy-island','review'),make(4,'fantasy-survival','blocked',{
      blocker:'WEB_VIBE_RECOVERY_REQUIRES_OWNER_REVIEW',recoveryInfraAttempts:4,
      recoveryFailureClass:'EPHEMERAL_CHECKOUT'})
  ]};
  const health=buildWebVibeQueueHealth(q,{now:'2026-10-30T01:00:00Z'});
  assert.equal(health.total,4);
  assert.equal(health.ready,1);
  assert.equal(health.cooldown,1);
  assert.equal(health.retried,2);
  assert.equal(health.byGame['cozy-island'].review,1);
  assert.equal(health.failures.EPHEMERAL_CHECKOUT,1);
  assert.equal(health.proofAuthority,'QUEUE_HEALTH_ONLY_NOT_RUNTIME_VERIFICATION');
  assert.throws(()=>buildWebVibeQueueHealth(q,{now:'invalid'}),/QUEUE_HEALTH_TIME_INVALID/);
});

test('existing WEB direct and recovery jobs serialize per game, not all games globally',()=>{
  const workflow=fs.readFileSync('.github/workflows/pwa-command-bridge.yml','utf8');
  assert.match(workflow,/game_id: \$\{\{ steps\.local\.outputs\.game_id \}\}/);
  assert.match(workflow,/game_id: \$\{\{ steps\.select\.outputs\.game_id \}\}/);
  assert.match(workflow,/group: web-vibe-onepatch-\$\{\{ needs\.bridge\.outputs\.game_id \}\}/);
  assert.match(workflow,/group: web-vibe-onepatch-\$\{\{ needs\.web-recovery-select\.outputs\.game_id \}\}/);
  assert.match(workflow,/WEB_VIBE_DIRECT_FAILURE_CHECKPOINT/);
  assert.doesNotMatch(workflow,/group: web-vibe-onepatch-\$\{\{ needs\.(?:bridge|web-recovery-select)\.outputs\.task_id \}\}/);
});

test('WEB watchdog uses expiring exact-owner CAS claims to suppress duplicate 5-minute dispatch',async()=>{
  const {selectWebVibeRecoveryTask,claimWebVibeRecoveryTask,recordWebVibeRecoveryFailure}=
    await import('../tools/web-vibe-recovery.mjs');
  const item={id:'pwa-'+uuid,gameId:'wild-survival',target:'web',
    sourceRoot:'web-games/wild-survival',status:'queued',goal:'public player movement repair',
    ownerDirective:true,evidence:['owner-source-authenticated']};
  const other={...item,id:'pwa-22222222-2222-4333-8444-555555555555',
    gameId:'cozy-island',sourceRoot:'web-games/cozy-island'};
  const queue={...emptyWebVibeQueue(),tasks:[item,other]};
  const now='2026-10-30T01:00:00Z';
  assert.equal(selectWebVibeRecoveryTask(queue,{now}).id,item.id);
  assert.throws(()=>claimWebVibeRecoveryTask(queue,item.id,{now,runId:0}),/CLAIM_AUTHORITY_INVALID/);
  assert.throws(()=>claimWebVibeRecoveryTask(queue,other.id,{now,runId:40918533815}),/CLAIM_SELECTION_STALE/);
  const claim=claimWebVibeRecoveryTask(queue,item.id,{now,runId:40918533815});
  assert.equal(claim.claimUntil,'2026-10-30T02:15:00.000Z');
  assert.equal(claim.queue.tasks[0].status,'queued','claim does not forge a running or PASS checkpoint');
  assert.equal(claim.queue.tasks[0].recoveryClaimRunId,40918533815);
  const claimedHealth=buildWebVibeQueueHealth(claim.queue,{now:'2026-10-30T01:05:00Z'});
  assert.equal(claimedHealth.claimed,1);
  assert.equal(claimedHealth.ready,1,'another game remains ready while this lease is active');
  assert.equal(selectWebVibeRecoveryTask(claim.queue,{now:'2026-10-30T01:05:00Z'}).id,other.id,
    'another eligible WEB game must not be blocked by the first game claim');
  const one={...emptyWebVibeQueue(),tasks:[claim.queue.tasks[0]]};
  assert.equal(selectWebVibeRecoveryTask(one,{now:'2026-10-30T01:05:00Z'}),null);
  const sameGame={...one,tasks:[one.tasks[0],{...one.tasks[0],id:other.id}]};
  assert.equal(selectWebVibeRecoveryTask(sameGame,{now:'2026-10-30T01:05:00Z'}),null,
    'leased owner repair blocks a younger edit of the same game, not unrelated games');
  assert.equal(selectWebVibeRecoveryTask(one,{now:'2026-10-30T02:15:00Z'}).id,item.id);
  assert.throws(()=>claimWebVibeRecoveryTask(one,item.id,{now:'2026-10-30T01:05:00Z',
    runId:40918533816}),/CLAIM_SELECTION_STALE/);
  const failure=recordWebVibeRecoveryFailure(one,item.id,{now:'2026-10-30T01:10:00Z',
    failureLog:'WEB_VIBE_WORKER_BLOCKED=WEB_VIBE_CLOUD_CHECKOUT_STILL_DIRTY:8'});
  assert.equal(failure.queue.tasks[0].recoveryClaimUntil,null);
  assert.equal(failure.queue.tasks[0].recoveryClaimRunId,null);
  assert.equal(failure.queue.tasks[0].recoveryAttempts,undefined);
  const workflow=fs.readFileSync('.github/workflows/pwa-command-bridge.yml','utf8');
  assert.match(workflow,/node tools\/web-vibe-recovery\.mjs claim/);
  assert.match(workflow,/WEB_VIBE_RECOVERY=EXACT_OWNER_TASK_CLAIMED/);
  assert.match(workflow,/WEB_VIBE_RECOVERY=CLAIM_CONFLICT_NOT_DISPATCHED/);
  assert.match(workflow,/web-vibe: bounded watchdog claim \[skip ci\]/);
});
