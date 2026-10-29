import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {emptyWebVibeQueue,assertWebVibeQueue,ingestWebVibeTask,buildWebVibeSync,WEB_VIBE_QUEUE_FILE,WEB_VIBE_CONTROL_BRANCH,WEB_VIBE_ENGINE} from '../tools/web-vibe-organization.mjs';
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
  assert.match(w,/web-recovery-onepatch:[\s\S]*?group: web-vibe-onepatch-\$\{\{ needs.web-recovery-select.outputs.task_id \}\}/);
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
 assert.match(recovery,/game\.sourceRevision===sha/);
});
