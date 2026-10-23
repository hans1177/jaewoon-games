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
test('WEB workflow never enters the native Vibe2 queue/worker and does not invent deployment success',()=>{
  const bridge=fs.readFileSync('.github/workflows/pwa-command-bridge.yml','utf8');
  assert.match(bridge,/WEB_VIBE_BRANCH: web-vibe-control/);
  assert.match(bridge,/\.web-vibe\/queue\.json/);
  assert.match(bridge,/tools\/web-vibe-organization\.mjs/);
  assert.doesNotMatch(bridge,/vibe2-continuous-core\.yml|vibe2-unreal-core|\.vibe2\/queue\.json|storage-unpack|storage-pack|jaewoon-unity/);
  assert.match(bridge,/WEB_VIBE_EXECUTION=DEDICATED_LOCAL_ENGINE_REQUIRED/);
});
