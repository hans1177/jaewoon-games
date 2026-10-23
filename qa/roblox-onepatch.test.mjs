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

test('Onepatch automatically follows the existing verified Roblox source-to-server deployment chain',()=>{
  const core=fs.readFileSync('.github/workflows/vibe2-continuous-core.yml','utf8');
  const candidate=fs.readFileSync('.github/workflows/vibe2-candidate-release.yml','utf8');
  const post=fs.readFileSync('.github/workflows/company-development-roblox-post-runtime-qa.yml','utf8');
  const f9=fs.readFileSync('.github/workflows/company-development-roblox-final-review-revalidation.yml','utf8');
  const release=fs.readFileSync('.github/workflows/company-development-roblox-release-promotion.yml','utf8');
  assert.match(core,/VIBE2_ROBLOX_ONEPATCH_GAME/);
  assert.match(core,/node \/tmp\/vibe2-main\/tools\/vibe2-auto-planner\.mjs/);
  assert.match(candidate,/Promote verified Roblox source and declared generated assets through reviewed PR/);
  assert.match(candidate,/ROBLOX_PRE_F9_CANONICAL_PUBLISH=FORBIDDEN/);
  assert.match(post,/gh workflow run company-development-roblox-final-review-revalidation\.yml/);
  assert.match(f9,/gh workflow run company-development-roblox-release-promotion\.yml[^\n]*publish_stage=final/);
  assert.match(release,/ROBLOX_OPEN_CLOUD_API_KEY: \$\{\{ secrets\.ROBLOX_OPEN_CLOUD_API_KEY \}\}/);
  assert.match(release,/await publishRobloxPlace\(\{plan/);
  assert.match(release,/ROBLOX_CANONICAL_PRIVATE_SERVER_PUBLICATION_GATE=EXACT_F9_SERVER_DEPLOYMENT/);
  assert.doesNotMatch(core,/ROBLOX_OPEN_CLOUD_API_KEY:.*VIBE2_ROBLOX_ONEPATCH_GAME/);
});

test('Roblox onepatch engine requires CC0 graphics and motion license, source SHA, universe grant and runtime evidence',t=>{
  const f=fixture();t.after(()=>fs.rmSync(f.root,{recursive:true,force:true}));
  const item=enqueueOwnerRobloxOnePatch({queue:{tasks:[]},catalog:f.catalog,
    request:f.request,repoRoot:f.root,policy}).queue.tasks[0];
  assert.match(item.goal,/14종 공용 라이브러리/);
  assert.match(item.goal,/CC0/);
  assert.match(item.goal,/소스 SHA/);
  assert.match(item.goal,/Universe Use 권한/);
  assert.match(item.goal,/실제 화면 반영/);
  assert.equal(item.responsibleFiles.length,1);
  assert.ok(item.evidence.includes('existing-canonical-vibe2-queue'));
});


test('Owner Roblox onepatch accepts arbitrary many game-local code, UI, motion and asset files',t=>{
  const f=fixture();t.after(()=>fs.rmSync(f.root,{recursive:true,force:true}));
  const files=[];
  for(let i=0;i<17;i++){
    const relative='shared/System'+i+'.luau';
    const dest=path.join(f.root,'roblox-games/demo',relative);
    fs.mkdirSync(path.dirname(dest),{recursive:true});
    fs.writeFileSync(dest,'return {system='+i+'}\n');
    files.push(relative);
  }
  for(const relative of ['shared/VisualStyle.json','client/Buttons.svg','assets/characters/Npc.glb','default.project.json']){
    const dest=path.join(f.root,'roblox-games/demo',relative);
    fs.mkdirSync(path.dirname(dest),{recursive:true});
    fs.writeFileSync(dest,'licensed-test-fixture');
    files.push(relative);
  }
  files.push('client/Game.client.luau');
  const req={...f.request,file:files.join(',')};
  const one=enqueueOwnerRobloxOnePatch({queue:{tasks:[]},catalog:f.catalog,request:req,repoRoot:f.root,policy});
  assert.equal(one.queue.tasks[0].responsibleFiles.length,22);
  assert.ok(one.queue.tasks[0].responsibleFiles.includes('roblox-games/demo/assets/characters/Npc.glb'));
  assert.ok(one.queue.tasks[0].evidence.includes('owner-onepatch-no-file-count-limit'));
  const same=enqueueOwnerRobloxOnePatch({queue:one.queue,catalog:f.catalog,request:req,repoRoot:f.root,policy});
  assert.equal(same.added,false);
  const all=enqueueOwnerRobloxOnePatch({queue:{tasks:[]},catalog:f.catalog,
    request:{...f.request,requestId:'123457',file:'*'},repoRoot:f.root,policy});
  assert.equal(all.queue.tasks[0].responsibleFiles.length,21);
  assert.equal(all.queue.tasks[0].responsibleFiles.includes('roblox-games/demo/assets/characters/Npc.glb'),false,
    'native GLB must remain on explicitly requested editor route, not auto-text wildcard');
  assert.deepEqual(all.queue.tasks[0].responsibleFiles,
    one.queue.tasks[0].responsibleFiles.filter(file=>!file.endsWith('.glb')));
});

test('Owner Roblox patch merges queued build-up without resetting its generation, and serializes running work',t=>{
  const f=fixture();t.after(()=>fs.rmSync(f.root,{recursive:true,force:true}));
  const current={
    id:'build-up-demo',gameId:'demo',target:'roblox',sourceRoot:'roblox-games/demo',
    department:'development',type:'implementation',goal:'기존 5단계 월드 빌드업 유지',
    responsibleFiles:['roblox-games/demo/shared/Existing.luau'],dependencies:[],
    buildUpDirectiveId:'keep-existing-fingerprint',status:'queued',evidence:['original-f5-evidence']
  };
  const merged=enqueueOwnerRobloxOnePatch({queue:{tasks:[current]},catalog:f.catalog,
    request:f.request,repoRoot:f.root,policy});
  assert.equal(merged.added,false);
  assert.equal(merged.merged,true);
  assert.equal(merged.taskId,current.id);
  assert.equal(merged.queue.tasks.length,1);
  assert.equal(merged.queue.tasks[0].buildUpDirectiveId,'keep-existing-fingerprint');
  assert.equal(merged.queue.tasks[0].status,'queued');
  assert.ok(merged.queue.tasks[0].responsibleFiles.includes('roblox-games/demo/client/Game.client.luau'));
  assert.ok(merged.queue.tasks[0].evidence.includes('original-f5-evidence'));
  const repeat=enqueueOwnerRobloxOnePatch({queue:merged.queue,catalog:f.catalog,
    request:f.request,repoRoot:f.root,policy});
  assert.equal(repeat.added,false);
  assert.equal(repeat.queue.tasks.length,1);
  const running=enqueueOwnerRobloxOnePatch({queue:{tasks:[{...current,status:'running'}]},
    catalog:f.catalog,request:f.request,repoRoot:f.root,policy});
  assert.equal(running.added,true);
  assert.equal(running.queue.tasks[0].status,'running');
  assert.equal(running.queue.tasks.length,2);
  assert.ok(running.queue.tasks[1].dependencies.includes(current.id));
  assert.ok(running.queue.tasks[1].evidence.includes('owner-onepatch-resume-impacted-stage-not-f0'));
});

test('Owner Roblox onepatch work order keeps unlimited source responsibility and F9 gate without duplicate QA',()=>{
  const runner=fs.readFileSync('tools/vibe2-continuous-runner.mjs','utf8');
  const planner=fs.readFileSync('tools/vibe2-auto-planner.mjs','utf8');
  const core=fs.readFileSync('.github/workflows/vibe2-continuous-core.yml','utf8');
  const f9=fs.readFileSync('.github/workflows/company-development-roblox-final-review-revalidation.yml','utf8');
  const promote=fs.readFileSync('.github/workflows/company-development-roblox-release-promotion.yml','utf8');
  assert.match(core,/공란=해당 게임 전체/);
  assert.match(planner,/onePatchInput\[1\]='\*'/);
  assert.match(runner,/unchangedScopeEvidenceReuse:'SAME_SOURCE_HASH_AND_DEPENDENCIES_ONLY'/);
  assert.match(runner,/neverReuseRuntimeOrF9WithoutExactArtifactIdentity:true/);
  assert.match(runner,/owner-onepatch-no-file-count-limit/);
  assert.match(f9,/publish_stage=final/);
  assert.match(promote,/ROBLOX_CANONICAL_PRIVATE_SERVER_PUBLICATION_GATE=EXACT_F9_SERVER_DEPLOYMENT/);
});

// 로블조직 기존 빌드업 내 수시 한방패치: 파일 충돌만 직렬화, 이력은 다음 개발로 연결.
test('running BUILD_UP with disjoint responsibility admits immediate owner patch without F-stage wait',t=>{
  const f=fixture();t.after(()=>fs.rmSync(f.root,{recursive:true,force:true}));
  const running={id:'f6-world-motion',gameId:'demo',target:'roblox',sourceRoot:'roblox-games/demo',
    status:'running',goal:'기존 F6 단계',
    responsibleFiles:['roblox-games/demo/server/Enemy.server.luau'],
    buildUpDirectiveId:'existing-f6',buildUpGeneration:6,evidence:['verified-f5-evidence']};
  const result=enqueueOwnerRobloxOnePatch({queue:{tasks:[running]},catalog:f.catalog,
    request:f.request,repoRoot:f.root,policy});
  assert.equal(result.added,true);
  assert.equal(result.resume,'RUNNING_BUILD_UP_DISJOINT_IMMEDIATE');
  assert.deepEqual(result.queue.tasks[1].dependencies,[]);
  assert.equal(result.queue.tasks[0].status,'running');
  assert.equal(result.queue.tasks[1].buildUpDirectiveId,'existing-f6');
  assert.equal(result.queue.tasks[1].buildUpGeneration,6);
  assert.equal(result.queue.tasks[1].buildUpStatus,'ONEPATCH_IN_CURRENT_BUILD_UP');
  assert.ok(result.queue.tasks[1].evidence.includes('owner-onepatch-disjoint-source-start-now'));
  assert.deepEqual(result.queue.tasks[0].evidence,['verified-f5-evidence']);
  assert.ok(result.queue.tasks[1].evidence.includes('owner-onepatch-parent-task:f6-world-motion'));
});
test('running BUILD_UP serializes only overlapping and shared responsibilities',t=>{
  const f=fixture();t.after(()=>fs.rmSync(f.root,{recursive:true,force:true}));
  const row=file=>({id:'running-'+file.split('/').at(-1),gameId:'demo',target:'roblox',
    sourceRoot:'roblox-games/demo',status:'running',
    responsibleFiles:[file],buildUpDirectiveId:'current-f7'});
  const same=row('roblox-games/demo/client/Game.client.luau');
  const unrelated=row('roblox-games/demo/server/NPC.server.luau');
  const result=enqueueOwnerRobloxOnePatch({queue:{tasks:[same,unrelated]},
    catalog:f.catalog,request:f.request,repoRoot:f.root,policy});
  assert.deepEqual(result.queue.tasks[2].dependencies,[same.id]);
  assert.equal(result.resume,'RUNNING_BUILD_UP_SOURCE_COLLISION');
  assert.ok(result.queue.tasks[2].evidence.includes('owner-onepatch-parent-directive:current-f7'));
  const shared=path.join(f.root,'roblox-games/demo/shared/GameConfig.luau');
  fs.mkdirSync(path.dirname(shared),{recursive:true});fs.writeFileSync(shared,'return {}');
  const patch=enqueueOwnerRobloxOnePatch({queue:{tasks:[same,unrelated]},catalog:f.catalog,
    request:{...f.request,file:'shared/GameConfig.luau',requestId:'123457'},
    repoRoot:f.root,policy});
  assert.deepEqual(new Set(patch.queue.tasks[2].dependencies),new Set([same.id,unrelated.id]));
});
test('next autonomous Roblox BUILD_UP carries verified owner patch history, never unverified results',()=>{
  const planner=fs.readFileSync('tools/vibe2-auto-planner.mjs','utf8');
  assert.match(planner,/build-up-owner-onepatch-carried:/);
  assert.match(planner,/\\[PREVIOUS_VERIFIED_OWNER_ONEPATCH\\]/);
  assert.match(planner,/clean\(row.status\)\.toLowerCase\(\)==='verified'/);
  assert.match(planner,/source-recheck-required/);
  assert.doesNotMatch(planner,/Cloudflare/i);
});
