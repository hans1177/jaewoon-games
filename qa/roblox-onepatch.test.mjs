// 파일명: qa/roblox-onepatch.test.mjs
// 로블조직: GitHub 한방패치의 소유권·범위·중앙정책·중복 방지 계약
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {enqueueOwnerRobloxOnePatch} from '../tools/vibe2-auto-planner.mjs';

const policy={
  developmentAccess:{ROBLOX:'ALWAYS_ALLOWED'},
  ownerActiveDevelopmentScope20261009:{activeTargets:['ROBLOX','WEB']},
  robloxNativeCodingQualityContract:{architecture:{existingPipelineOnly:true,newQueueForbidden:true}},
  permanentProjectRemoval:{ids:[]}
};
function fixture(){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'onepatch-roblox-'));
  const exact=path.join(root,'roblox-games','demo','client','Game.client.luau');
  fs.mkdirSync(path.dirname(exact),{recursive:true});
  fs.writeFileSync(exact,'-- existing Lua source\nlocal keep=true\n');
  return {root,exact,catalog:{games:[{id:'demo',lifecycleState:'ACTIVE',
    targetSourcePaths:{ROBLOX:'roblox-games/demo'},homepageCategory:'development-confirmed'}]},
    request:{gameId:'demo',file:'client/Game.client.luau',goal:'기존 조이스틱 반응 수정',requestId:'123456'}};
}

test('GitHub Roblox onepatch uses existing queue and modifies no source file at intake',t=>{
  const f=fixture();t.after(()=>fs.rmSync(f.root,{recursive:true,force:true}));
  const before=fs.readFileSync(f.exact,'utf8');
  const created=enqueueOwnerRobloxOnePatch({queue:{tasks:[]},catalog:f.catalog,
    request:f.request,repoRoot:f.root,policy});
  assert.equal(created.added,true);
  assert.equal(created.queue.tasks.length,1);
  const item=created.queue.tasks[0];
  assert.equal(item.id,'owner-roblox-onepatch-123456');
  assert.equal(item.ownerDirective,true);
  assert.equal(item.target,'roblox');
  assert.equal(item.sourceRoot,'roblox-games/demo');
  assert.deepEqual(item.responsibleFiles,['roblox-games/demo/client/Game.client.luau']);
  assert.equal(item.status,'queued');
  assert.ok(item.goal.includes('요청: 기존 조이스틱 반응 수정'));
  assert.equal(fs.readFileSync(f.exact,'utf8'),before);
  const duplicate=enqueueOwnerRobloxOnePatch({queue:created.queue,catalog:f.catalog,
    request:f.request,repoRoot:f.root,policy});
  assert.equal(duplicate.added,false);
  assert.equal(duplicate.queue.tasks.length,1);
  assert.throws(()=>enqueueOwnerRobloxOnePatch({queue:created.queue,catalog:f.catalog,
    request:{...f.request,goal:'서로 다른 지시'},repoRoot:f.root,policy}),/REQUEST_COLLISION/);
});

test('Roblox work cannot escape its game or touch web and unity organizations',t=>{
  const f=fixture();t.after(()=>fs.rmSync(f.root,{recursive:true,force:true}));
  for(const file of ['../web-games/demo/index.html','web-games/demo/index.html',
    'unity-games/demo/Assets/Game.cs','../../company-directive.json',
    'shared/../client/Game.client.luau','default.project.json','server/Game.server.luau']){
    assert.throws(()=>enqueueOwnerRobloxOnePatch({queue:{tasks:[]},catalog:f.catalog,
      request:{...f.request,file},repoRoot:f.root,policy}));
  }
  const external=path.join(f.root,'some-external.luau');
  fs.writeFileSync(external,'-- outside');
  fs.symlinkSync(external,path.join(f.root,'roblox-games/demo/client/External.luau'));
  assert.throws(()=>enqueueOwnerRobloxOnePatch({queue:{tasks:[]},catalog:f.catalog,
    request:{...f.request,file:'client/External.luau'},repoRoot:f.root,policy}),
    /SOURCE_ESCAPE_OR_MISSING/);
});

test('Central policy and catalog must explicitly authorize the exact Roblox game',t=>{
  const f=fixture();t.after(()=>fs.rmSync(f.root,{recursive:true,force:true}));
  const apply=(patch,updates={})=>enqueueOwnerRobloxOnePatch({queue:{tasks:[]},
    catalog:updates.catalog||f.catalog,request:updates.request||f.request,
    repoRoot:f.root,policy:patch});
  assert.throws(()=>apply({}),/CENTRAL_POLICY_NOT_AUTHORIZED/);
  assert.throws(()=>apply({...policy,permanentProjectRemoval:{ids:['demo']}}),/PERMANENTLY_REMOVED_GAME/);
  assert.throws(()=>apply(policy,{catalog:{games:[{id:'demo',targetSourcePaths:{ROBLOX:'web-games/demo'}}]}}),
    /CATALOG_ROBLOX_SOURCE_REQUIRED/);
  assert.throws(()=>apply(policy,{request:{...f.request,gameId:'other'}}));
  assert.throws(()=>apply(policy,{request:{...f.request,requestId:'forge'}}),/INVALID_REQUEST_ID/);
});

test('Onepatch is GitHub-only on the existing Roblox Vibe worker, not a separate queue or web lane',()=>{
  const yml=fs.readFileSync('.github/workflows/vibe2-continuous-core.yml','utf8');
  const planner=fs.readFileSync('tools/vibe2-auto-planner.mjs','utf8');
  assert.match(yml,/workflow_dispatch:[\s\S]*?roblox_game:[\s\S]*?roblox_file:[\s\S]*?roblox_goal:/);
  assert.match(yml,/VIBE2_ROBLOX_ONEPATCH_GAME: \$\{\{ inputs\.roblox_game \|\| '' \}\}/);
  assert.match(yml,/ROBLOX_ONEPATCH_GAME_PRIMARY_LANE_REQUIRED/);
  assert.match(planner,/GITHUB_ACTOR!=='hans1177'/);
  assert.match(planner,/GITHUB_EVENT_NAME!=='workflow_dispatch'/);
  assert.match(planner,/GITHUB_REF!=='refs\/heads\/main'/);
  assert.match(planner,/existing-canonical-vibe2-queue/);
  assert.doesNotMatch(planner,/\.roblox-vibe\/queue\.json/);
});
