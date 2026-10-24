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
