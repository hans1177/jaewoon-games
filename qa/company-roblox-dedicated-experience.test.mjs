import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import {runInNewContext} from 'node:vm';
import {
  csrfFetch,
  createRobloxDedicatedExperience,
  configureRobloxExperience,
  introspectRobloxApiKey,
  ensureRobloxExperiencePrivate,
  publishRobloxDedicatedPlace,
} from '../tools/company-roblox-dedicated-experience.mjs';

test('forest model registration fails closed when cached creator does not match the API key owner',()=>{
  const uploader=fs.readFileSync(new URL('../tools/baeksu-war-upload-meshes.mjs',import.meta.url),'utf8');
  const workflow=fs.readFileSync(new URL('../.github/workflows/owner-roblox-dedicated-private-experiences.yml',import.meta.url),'utf8');
  assert.match(uploader,/const scope=await introspectRobloxApiKey\(\{apiKey:key\}\)/);
  assert.match(uploader,/MODEL_CREATOR_API_KEY_OWNER_MISMATCH/);
  assert.match(uploader,/MODEL_CREATOR_ASSET_WRITE_SCOPE_REQUIRED/);
  assert.doesNotMatch(uploader,/const cookie=/);
  // 실제 모델 등록 책임은 uploader에 있다. 게시 workflow는 같은 Open Cloud 키로
  // 원본 Universe Use 권한을 확인하며 다른 계정으로 전환하지 않는다.
  assert.match(workflow,/const apiKey=String\(process\.env\.ROBLOX_OPEN_CLOUD_API_KEY\|\|''\)\.trim\(\)/);
  assert.match(workflow,/ROBLOX_CC0_GRANT_RIGHTS_REQUIRED=ASSET_PERMISSIONS_WRITE_AND_ASSET_SUBJECT_ACCESS/);
});

test('Forest dedicated publishing and CC0 registration never reuse a different account cookie',()=>{
  const workflow=fs.readFileSync(new URL('../.github/workflows/owner-roblox-dedicated-private-experiences.yml',import.meta.url),'utf8');
  const uploader=fs.readFileSync(new URL('../tools/baeksu-war-upload-meshes.mjs',import.meta.url),'utf8');
  for(const text of [workflow,uploader]){
    assert.doesNotMatch(text,/ROBLOX_ROBLOSECURITY|ROBLOX_SECURITY_COOKIE|OWNER_COOKIE_CSRF/);
  }
  assert.doesNotMatch(workflow,/Register 12 original prologue scenes|FOREST_INTRO_AUTH_ROUTE/);
  assert.match(workflow,/ROBLOX_CC0_GRANT_OPEN_CLOUD_API_KEY_REQUIRED/);
  assert.match(uploader,/headers:\{\.\.\.\(opts\.headers\|\|\{\}\),'x-api-key':key\}/);
});


test('csrfFetch retries once with x-csrf-token', async()=>{
  const calls=[];
  const fetchImpl=async(url,init)=>{
    calls.push({url,init});
    if(calls.length===1)return new Response('{}',{status:403,headers:{'x-csrf-token':'token-1'}});
    return new Response('{}',{status:200});
  };
  const response=await csrfFetch({url:'https://example.test',cookie:'secret',fetchImpl});
  assert.equal(response.status,200);
  assert.equal(calls.length,2);
  assert.equal(calls[1].init.headers['x-csrf-token'],'token-1');
  assert.match(calls[1].init.headers.cookie,/\.ROBLOSECURITY=secret;/);
});

test('createRobloxDedicatedExperience parses dedicated universe and root place ids', async()=>{
  const calls=[];
  const fetchImpl=async(url,init={})=>{
    calls.push({url,init});
    if(calls.length===1)return new Response('{}',{status:403,headers:{'x-csrf-token':'csrf'}});
    return new Response(JSON.stringify({universeId:12345,rootPlaceId:67890}),{status:200,headers:{'content-type':'application/json'}});
  };
  const result=await createRobloxDedicatedExperience({cookie:'secret',fetchImpl});
  assert.deepEqual(result,{universeId:'12345',placeId:'67890',created:true});
  assert.equal(calls[1].url,'https://apis.roblox.com/universes/v1/universes/create');
  assert.match(String(calls[1].init.body),/templatePlaceId/);
});

test('createRobloxDedicatedExperience tries existing Open Cloud key when cookie is absent', async()=>{
  const calls=[];
  const fetchImpl=async(url,init={})=>{
    calls.push({url,init});
    return new Response(JSON.stringify({universeId:12345,rootPlaceId:67890}),{status:200,headers:{'content-type':'application/json'}});
  };
  const result=await createRobloxDedicatedExperience({cookie:'',apiKey:'key',fetchImpl});
  assert.equal(result.universeId,'12345');
  assert.equal(result.placeId,'67890');
  assert.equal(calls.length,1);
  assert.equal(calls[0].init.headers['x-api-key'],'key');
  assert.equal(calls[0].init.headers.cookie,undefined);
});

test('configureRobloxExperience uses Cloud v2 with API key and keeps target private when cookie is absent', async()=>{
  let seen=null;
  const fetchImpl=async(url,init={})=>{
    seen={url,init};
    return new Response(JSON.stringify({path:'universes/12345',displayName:'Whatever RPG',visibility:'PRIVATE'}),{status:200});
  };
  const result=await configureRobloxExperience({
    universeId:'12345',name:'Whatever RPG',description:'private',cookie:'',apiKey:'key',fetchImpl,
  });
  assert.equal(result.configured,true);
  assert.match(seen.url,/cloud\/v2\/universes\/12345\?updateMask=displayName,description,visibility$/);
  assert.equal(seen.init.headers['x-api-key'],'key');
  assert.deepEqual(JSON.parse(seen.init.body),{displayName:'Whatever RPG',description:'private',visibility:'PRIVATE'});
});

test('introspectRobloxApiKey exposes only safe scope metadata', async()=>{
  const fetchImpl=async(url,init={})=>{
    assert.equal(url,'https://apis.roblox.com/api-keys/v1/introspect');
    assert.deepEqual(JSON.parse(init.body),{apiKey:'key'});
    return new Response(JSON.stringify({
      enabled:true,
      expired:false,
      authorizedUserId:234,
      scopes:[{name:'universe-places',operations:['write'],universeIds:['*']}],
    }),{status:200});
  };
  const result=await introspectRobloxApiKey({apiKey:'key',fetchImpl});
  assert.equal(result.enabled,true);
  assert.equal(result.expired,false);
  assert.equal(result.authorizedUserId,'234');
  assert.deepEqual(result.scopes,[{
    name:'universe-places',
    operations:['write'],
    universeIds:['*'],
    userIds:[],
    groupIds:[],
  }]);
});

test('ensureRobloxExperiencePrivate falls back from Open Cloud to cookie and verifies inactive', async()=>{
  const calls=[];
  const fetchImpl=async(url,init={})=>{
    calls.push({url,init});
    if(url.includes('/legacy-develop/'))return new Response('{}',{status:403});
    if(url.endsWith('/deactivate')&&!init.headers?.['x-csrf-token'])return new Response('{}',{status:403,headers:{'x-csrf-token':'csrf2'}});
    if(url.endsWith('/deactivate'))return new Response('{}',{status:200});
    if(url.endsWith('/v1/universes/12345'))return new Response(JSON.stringify({isActive:false}),{status:200});
    throw new Error('unexpected '+url);
  };
  const result=await ensureRobloxExperiencePrivate({universeId:'12345',apiKey:'key',cookie:'secret',fetchImpl});
  assert.equal(result.private,true);
  assert.ok(calls.some(x=>x.url.includes('/legacy-develop/')));
  assert.ok(calls.some(x=>x.init.headers?.['x-csrf-token']==='csrf2'));
});

test('publishRobloxDedicatedPlace sends built place to exact dedicated target', async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'roblox-dedicated-'));
  const place=path.join(dir,'place.rbxlx');
  fs.writeFileSync(place,'<roblox></roblox>');
  let seen=null;
  const fetchImpl=async(url,init)=>{
    seen={url,init};
    return new Response(JSON.stringify({versionNumber:3}),{status:200,headers:{'content-type':'application/json'}});
  };
  const result=await publishRobloxDedicatedPlace({
    universeId:'12345',placeId:'67890',placeFile:place,apiKey:'key',fetchImpl,retryDelaysMs:[],
  });
  assert.equal(result.published,true);
  assert.equal(result.versionNumber,3);
  assert.equal(seen.url,'https://apis.roblox.com/universes/v1/12345/places/67890/versions?versionType=Published');
  assert.equal(seen.init.headers['x-api-key'],'key');
});


test('dedicated Roblox titles are preserved without requiring retired game projects',()=>{
  const expected={
    'cozy-island':'포근섬: 작은 왕국 키우기',
    'daechung-rpg':'포탈 알피지',
    'fantasy-survival':'마력숲 생존기',
  };
  const workflow=fs.readFileSync(new URL('../.github/workflows/owner-roblox-dedicated-private-experiences.yml',import.meta.url),'utf8');
  for(const [gameId,title] of Object.entries(expected)){
    // 등록 대상의 공식 표시 이름은 보존한다. 삭제된 다른 게임의 원본을 부활시키지 않는다.
    assert.ok(workflow.includes("gameId:'"+gameId+"',gameName: '"+title+"'"));
    const projectFile=new URL(`../roblox-games/${gameId}/default.project.json`,import.meta.url);
    if(fs.existsSync(projectFile)&&gameId!=='fantasy-survival'){
      const project=JSON.parse(fs.readFileSync(projectFile,'utf8'));
      assert.equal(project.name,title);
    }
  }
  const active=JSON.parse(fs.readFileSync(new URL('../roblox-games/fantasy-survival/default.project.json',import.meta.url),'utf8'));
  const config=fs.readFileSync(new URL('../roblox-games/fantasy-survival/shared/GameConfig.luau',import.meta.url),'utf8');
  assert.equal(active.name,'fantasy-survival');
  assert.match(config,/GameName\s*=\s*"마력숲 생존기"/);
});

test('dedicated Roblox workflow recovers and persists the durable target registry',()=>{
  const workflow=fs.readFileSync(new URL('../.github/workflows/owner-roblox-dedicated-private-experiences.yml',import.meta.url),'utf8');
  assert.match(workflow,/roblox-dedicated-targets\.json/);
  assert.match(workflow,/ROBLOX_DEDICATED_TARGET_RECOVERED_FROM_REGISTRY=YES/);
  assert.match(workflow,/registry\.targets\.findIndex/);
  assert.match(workflow,/git add development-queue\.json roblox-dedicated-targets\.json/);
  assert.match(workflow,/for i in 1 2 3 4 5 6 7 8 9 10; do[\s\S]*?git reset --hard "origin\/\$COMPANY_RUNTIME_BRANCH"[\s\S]*?node <<'NODE'/);
  assert.match(workflow,/ROBLOX_DEDICATED_PERSIST_SUCCESS_ATTEMPT/);
  assert.match(workflow,/ROBLOX_DEDICATED_PERSIST_CONCURRENT_WRITE_RETRY_EXHAUSTED/);
  assert.doesNotMatch(workflow,/git rebase "origin\/\$COMPANY_RUNTIME_BRANCH"/);
  assert.match(workflow,/gameName: '포근섬: 작은 왕국 키우기'/);
  assert.match(workflow,/gameName: '포탈 알피지'/);
  assert.doesNotMatch(workflow,/gameId:'horror-escape-room'/);
  assert.match(workflow,/const canonicalSourceRevision=String\(item\.robloxSourceCommit\|\|''\)\.trim\(\)/);
  assert.match(workflow,/const canonicalArtifactIdentity=String\(item\.robloxBuildArtifactIdentity\|\|''\)\.trim\(\)/);
  assert.match(workflow,/DEDICATED_PUBLISH_ARTIFACT_NOT_BOUND_TO_CANONICAL_GAME_SOURCE/);
  assert.match(workflow,/item\.robloxRuntimeCandidateEvidence=\{/);
  assert.match(workflow,/authority:'roblox-open-cloud-dedicated-private-runtime-candidate'/);
  assert.match(workflow,/sourceRevision:canonicalSourceRevision/);
  assert.match(workflow,/artifactIdentity:canonicalArtifactIdentity/);
  assert.match(workflow,/item\.robloxInternalReleasePublished=true/);
  assert.match(workflow,/item\.currentStep='INTERNAL_PLATFORM_PLAYTEST_AND_DEBUG'/);
  assert.match(workflow,/item\.robloxFailureStage='VIBE_INTERNAL_PLAY'/);
  assert.match(workflow,/item\.robloxFailureSignature='ROBLOX_INTERNAL_VIBE_PLAY_PENDING'/);
  assert.match(workflow,/item\.routingBlockers=\['roblox-internal-vibe-play-pending'\]/);
  assert.doesNotMatch(workflow,/robloxInternalReleaseEvidence=\{[\s\S]{0,400}sourceRevision:r\.sourceRevision/);
});


test('Forest original village models register before private publishing without inventing IDs',()=>{
  const workflow=fs.readFileSync(new URL('../.github/workflows/owner-roblox-dedicated-private-experiences.yml',import.meta.url),'utf8');
  const registry=JSON.parse(fs.readFileSync(new URL('../roblox-games/fantasy-survival/CC0-ASSET-REGISTRY.json',import.meta.url),'utf8'));
  const source=fs.readFileSync(new URL('../tools/baeksu-war-upload-meshes.mjs',import.meta.url),'utf8');
  assert.equal(registry.villagePrefabs.sourceVerified,true);
  assert.equal(Object.keys(registry.villagePrefabs.models).length,24);
  assert.match(workflow,/Register approved Forest village originals through the existing asset pipeline/);
  assert.match(workflow,/python3 tools\/baeksu-war-author-meshes\.py -- \/tmp\/forest-village-assets --game-id=fantasy-survival/);
  assert.match(workflow,/node tools\/baeksu-war-upload-meshes\.mjs \/tmp\/forest-village-assets \/tmp\/forest-village-receipt\.json --game-id=fantasy-survival/);
  assert.match(workflow,/gh pr create --base main --head asset\/fantasy-worn-cape-rigged/);
  assert.match(workflow,/FOREST_VILLAGE_REGISTRATION_AWAIT_MAIN_MERGE/);
  assert.doesNotMatch(workflow,/Register 12 original prologue scenes|FOREST_INTRO_UNIVERSE_GRANT/);
  assert.match(workflow,/assets\/shared\/party\/village-well\.glb/);
  assert.match(workflow,/const wellEvidence='https:/);
  assert.match(workflow,/FOREST_VILLAGE_REGISTRATION_AWAIT_MAIN_MERGE[\s\S]*?exit 1/);
  assert.match(source,/FANTASY_NATIVE_MODEL_REUSED/);
  assert.match(source,/registrationVerified:Object\.keys\(village\)\.length===Object\.keys\(villageRows\)\.length/);
  assert.match(workflow,/OWNER_FOREST_VILLAGE_MODEL_REGISTRATION_REQUIRED/);
  assert.doesNotMatch(workflow,/new RegExp\('\\\\\\\\b'\+role/);
});


test('owner-direct push selects Forest when the dedicated workflow changes',()=>{
  const workflow=fs.readFileSync(new URL('../.github/workflows/owner-roblox-dedicated-private-experiences.yml',import.meta.url),'utf8');
  assert.match(workflow,/git diff --name-only "\$BEFORE_SHA" HEAD -- roblox-games\/ \.github\/workflows\/owner-roblox-dedicated-private-experiences\.yml/);
  assert.match(workflow,/row\.gameId==='fantasy-survival'&&changed\.includes\('\.github\/workflows\/owner-roblox-dedicated-private-experiences\.yml'\)/);
  assert.match(workflow,/needs\.contract\.outputs\.count != '0'/);
  assert.match(workflow,/OWNER_DIRECT_SELECTED_GAMES=/);
});

test('unrelated web commits do not starve the canonical Roblox owner publisher',()=>{
  const workflow=fs.readFileSync(new URL('../.github/workflows/owner-roblox-dedicated-private-experiences.yml',import.meta.url),'utf8');
  assert.match(workflow,/git diff --quiet HEAD FETCH_HEAD -- roblox-games\/ assets\/roblox\/ assets\/shared\/ assets\/external\//);
  assert.match(workflow,/OWNER_STALE_MAIN_REVISION=UNCHANGED_ROBLOX_SOURCE/);
  assert.match(workflow,/OWNER_STALE_MAIN_REVISION=SKIP_SUPERSEDED_SOURCE/);
  assert.match(workflow,/git diff --name-only "\$BEFORE_SHA" HEAD -- roblox-games\//);
  assert.doesNotMatch(workflow,/git push --force/);
});

// 제재 자산은 이름·연결 형식이 달라도 게시 요청 전에 차단한다.
test('publish rejects sanctioned image IDs before network access', async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'roblox-sanctioned-'));
  const place=path.join(dir,'place.rbxlx');
  let requests=0;
  const policy=JSON.parse(fs.readFileSync(new URL('../company-learning/platform-release-roadmap.json',import.meta.url),'utf8'));
  const ids=policy.livingMotionVisualQualityContract.assetAdaptation.contentSafety.blockedAssets.flatMap(row=>row.assetIds);
  try {
    for(const id of ids){
      fs.writeFileSync(place,'<roblox><string name="Source">local image = "rbxassetid://'+id+'"</string></roblox>');
      await assert.rejects(publishRobloxDedicatedPlace({
        universeId:'12345',placeId:'67890',placeFile:place,apiKey:'key',
        fetchImpl:async()=>{requests++;throw new Error('must not upload');},
      }),/REMOVED_IMAGE_ID_IN_PUBLISH_ARTIFACT/);
    }
    assert.equal(requests,0);
  } finally {fs.rmSync(dir,{recursive:true,force:true});}
});

// [실사용 권한] 모델 등록표만 통과해서는 게시할 수 없으며, 기존 공개키로 정확한
// 원본 모델 ID마다 해당 Universe 권한을 받은 뒤에만 비공개 플레이를 게시한다.
test('Forest private publisher verifies CC0 gear, item and shields with batched Universe grants',()=>{
  const source=fs.readFileSync('.github/workflows/owner-roblox-dedicated-private-experiences.yml','utf8');
  const start=source.indexOf('- name: Grant original Forest models to the existing private Universe');
  const end=source.indexOf('\n      - name: Build exact current main Roblox place',start);
  assert.ok(start>=0&&end>start);
  const block=source.slice(start,end);
  assert.match(block,/OWNER_FOREST_GEAR_SOURCE_PROVENANCE_REQUIRED/);
  assert.match(block,/OWNER_FOREST_GEAR_MODEL_BINDING_INVALID/);
  assert.match(block,/OWNER_FOREST_ITEM_PACK_SOURCE_REQUIRED/);
  assert.match(block,/OWNER_FOREST_ITEM_MODEL_BINDING_INVALID/);
  assert.match(block,/OWNER_FOREST_VILLAGE_GEAR_SOURCE_REQUIRED/);
  assert.match(block,/OWNER_FOREST_VILLAGE_GEAR_MODEL_INVALID/);
  assert.match(block,/assetIds\.slice\(offset,offset\+20\)/);
  assert.match(block,/batch\.every\(assetId=>granted\.has\(String\(assetId\)\)\)/);
  assert.match(block,/successAssetIds/);
  assert.match(block,/ROBLOX_CC0_UNIVERSE_GRANT_INCOMPLETE_HTTP_/);
  assert.match(block,/ROBLOX_CC0_UNIVERSE_GRANT_BATCH_ACCEPTED=/);
  assert.doesNotMatch(block,/ROBLOX_SECURITY_COOKIE|continue-on-error:\s*true/);
});


// [권한 거부 실증] Studio 경고를 유발한 CannotManageSubject가 발생해도
// 기존 게시 증거를 남기고 company-runtime에 실패로 보낸다. PASS를 합성하지 않는다.
test('Forest failed Universe grant records exact denied status without a false publication pass',()=>{
  const source=fs.readFileSync('.github/workflows/owner-roblox-dedicated-private-experiences.yml','utf8');
  const begin=source.indexOf('- name: Record failed Forest Universe grant in canonical publication evidence');
  const end=source.indexOf('\n      - name: Build exact current main Roblox place',begin);
  assert.ok(begin>=0&&end>begin);
  const body=source.slice(begin,end);
  assert.match(body,/failure\(\) && matrix\.gameId == 'fantasy-survival' && steps\.forest_grant\.outcome == 'failure'/);
  assert.match(source,/id: forest_grant/);
  assert.match(source,/fs\.appendFileSync\(process\.env\.GITHUB_OUTPUT/);
  assert.match(source,/if-no-files-found: error/);
  const startScript=body.indexOf("node <<'NODE'\n");
  const endScript=body.indexOf('\n          NODE',startScript);
  assert.ok(startScript>=0&&endScript>startScript);
  const script=body.slice(startScript+"node <<'NODE'\n".length,endScript);
  const writes=[];
  const originalEnv={
    GAME_ID:'fantasy-survival',GAME_NAME:'마력숲 생존기',
    OWNER_UNIVERSE_ID:'10773436325',OWNER_PLACE_ID:'108565970231899',
    GRANT_DENIAL_CODE:'CannotManageSubject',GRANT_HTTP_STATUS:'403',
    GITHUB_SHA:'a'.repeat(40),
  };
  const run=env=>runInNewContext(script,{
    process:{env},console:{log(){}},Date,
    require:name=>{
      assert.equal(name,'node:fs');
      return {
        mkdirSync(dir,options){assert.equal(dir,'/tmp/roblox-dedicated');assert.equal(options.recursive,true);},
        existsSync:()=>false,
        writeFileSync:(path,text)=>writes.push({path,data:JSON.parse(text)}),
      };
    },
  });
  run(originalEnv);
  assert.equal(writes.length,1);
  assert.equal(writes[0].path,'/tmp/roblox-dedicated/fantasy-survival.result.json');
  assert.equal(writes[0].data.sourceRevision,originalEnv.GITHUB_SHA);
  assert.equal(writes[0].data.stage,'ASSET_UNIVERSE_GRANT');
  assert.equal(writes[0].data.error,'ROBLOX_CC0_UNIVERSE_GRANT_DENIED_CannotManageSubject');
  assert.equal(writes[0].data.failureSignature,'ROBLOX_CC0_UNIVERSE_GRANT_HTTP_403');
  for(const key of ['pass','published','private'])assert.equal(writes[0].data[key],false);
  assert.throws(()=>run({...originalEnv,OWNER_UNIVERSE_ID:'123'}),/FOREST_GRANT_FAILURE_TARGET_UNVERIFIED/);
  assert.equal(writes.length,1);
});


// [마력숲 배포 인증] 사용할 수 없는 기존 키를 우회 재사용하지 않는다.
// 별도 배포키가 없거나 로블록스에서 관리 권한이 거부되면 기존 실패 보호가 작동해야 한다.
test('Forest private publish and original asset workflows require the dedicated Roblox deploy key',()=>{
  const owner=fs.readFileSync('.github/workflows/owner-roblox-dedicated-private-experiences.yml','utf8');
  const assets=fs.readFileSync('.github/workflows/horror-combat-assets.yml','utf8');
  const runtime=fs.readFileSync('.github/workflows/company-development-roblox-runtime.yml','utf8');
  assert.equal((owner.match(/ROBLOX_OPEN_CLOUD_API_KEY: \$\{\{ secrets\.ROBLOX_DEPLOY_API_KEY \}\}/g)||[]).length,4);
  assert.doesNotMatch(owner,/secrets\.ROBLOX_OPEN_CLOUD_API_KEY/);
  assert.match(assets,/ROBLOX_OPEN_CLOUD_API_KEY: \$\{\{ secrets\.ROBLOX_DEPLOY_API_KEY \}\}/);
  assert.doesNotMatch(assets,/secrets\.ROBLOX_OPEN_CLOUD_API_KEY/);
  assert.match(runtime,/matrix\.gameId == 'fantasy-survival' && secrets\.ROBLOX_DEPLOY_API_KEY/);
  assert.match(runtime,/matrix\.gameId != 'fantasy-survival' && secrets\.ROBLOX_OPEN_CLOUD_API_KEY/);
  assert.doesNotMatch(runtime,/matrix\.gameId == 'fantasy-survival' && secrets\.ROBLOX_DEPLOY_API_KEY \|\| secrets\.ROBLOX_OPEN_CLOUD_API_KEY/);
  assert.match(owner,/ROBLOX_CC0_UNIVERSE_GRANT_INCOMPLETE_HTTP_/);
  assert.match(owner,/ROBLOX_CC0_UNIVERSE_GRANT_DENIED_/);
});


// [대항해시대 Studio 자동 실행] 기존 오너 게시 워크플로의 고정 경로를 확인하고 마력숲 Studio 실행을 막는다.
test('Studio Auto QA routes Mare publisher by workflow path without launching Forest Studio',()=>{
  const qa=fs.readFileSync('.github/workflows/studio-autoqa.yml','utf8');
  const mare=fs.readFileSync('.github/workflows/owner-mare-essentia-direct-publish.yml','utf8');
  assert.ok(mare.includes('run-name: Owner Mare Essentia publish ·'));
  assert.ok(qa.includes("github.event.workflow_run.path == '.github/workflows/owner-mare-essentia-direct-publish.yml'"));
  assert.ok(qa.includes("github.event.workflow_run.conclusion == 'success'"));
  assert.ok(qa.includes("github.event.workflow_run.head_branch == 'main'"));
  assert.ok(qa.includes('workflows: ["Owner Mare Essentia Direct Publish"]'));
  assert.ok(qa.includes('if [ "$game" != mare-essentia ]; then exit 0; fi'));
  assert.ok(qa.includes('studio already queued/running for $game on $head, skip duplicate'));
  assert.ok(qa.includes('script=roblox-games/mare-essentia/tools/devloop/studio-scripts/mare-qa-click.json'));
  assert.ok(qa.includes('contains(" · fantasy-survival ·")')); // 기존 대기 마력숲 Studio는 취소만 한다.
  assert.doesNotMatch(qa,/gh workflow run devloop-studio\.yml[^\n]*fantasy-survival/);
  assert.equal(qa.split('gh workflow run devloop-studio.yml').length-1,1);
  assert.ok(qa.includes("    - cron: '*/10 * * * *'")); // Studio 상태 확인 10분 간격
  assert.ok(qa.includes('STUDIO_ROTATION_SKIP=RUNNER_BUSY'));
  assert.ok(qa.includes('group: studio-autoqa-dispatch-mare-essentia'));
  assert.ok(qa.includes('STUDIO_PUSH_TARGET=SHIPS'));
  assert.doesNotMatch(qa,/scripts\+=\(|for script in/);
  assert.ok(qa.includes('github.event.repository.private == false'));
});

// [배포키 일원화] 차단된 기존 API 키를 마력숲 에셋 자동 복구에서 재사용하지 않는다.
// 자동 복구는 원본 모델을 다시 업로드하지 않고 기존 등록 ID 권한만 확인한다.
test('Forest asset recovery uses only dedicated deploy key and existing grant-only mode',()=>{
  const workflow=fs.readFileSync('.github/workflows/owner-fantasy-assets.yml','utf8');
  const keyName='$'+'{{ secrets.ROBLOX_DEPLOY_API_KEY }}';
  assert.ok(workflow.includes('ROBLOX_OPEN_CLOUD_API_KEY: '+keyName));
  assert.ok(!workflow.includes('secrets.ROBLOX_OPEN_CLOUD_API_KEY'));
  assert.ok(workflow.includes('node tools/fantasy-survival-reupload.mjs --regrant-only'));
  assert.ok(!workflow.includes('--regrant-only --camp-only'));
  const script=fs.readFileSync('tools/fantasy-survival-reupload.mjs','utf8');
  assert.ok(script.includes("const restoreOnly = process.argv.includes('--regrant-only')"));
  assert.ok(script.includes('for (const job of (restoreOnly ? campJobs : jobs))'));
});

// [불필요한 재업로드 방지] 현 main 등록 증거가 완비된 경우에만 Blender 단계를 생략한다.
// 출처·ID가 하나라도 깨지면 기존 실물 등록 경로로 되돌아가야 한다.
// 실제 외부 Universe 승인은 별도 forest_grant 단계가 계속 검사한다.
test('Forest registered gear reuse rejects missing or changed source binding and keeps live grant check',()=>{
  const workflow=fs.readFileSync('.github/workflows/owner-roblox-dedicated-private-experiences.yml','utf8');
  const begin=workflow.indexOf("if node --input-type=module <<'NODE'",workflow.indexOf('- name: Register source-verified Forest weapons and armor'));
  const end=workflow.indexOf('\n          NODE\n          then',begin);
  assert.ok(begin>=0&&end>begin);
  assert.ok(workflow.includes('FOREST_DEPLOY_API_KEY_MISSING'));
  assert.ok(workflow.includes('FOREST_GEAR_REGISTERED_IDS_REUSED_PENDING_LIVE_UNIVERSE_GRANT'));
  assert.ok(workflow.includes('node tools/baeksu-war-upload-meshes.mjs --register-forest-gear'));
  assert.ok(workflow.includes('id: forest_grant'));
  assert.ok(workflow.includes('ROBLOX_CC0_UNIVERSE_GRANT_BATCH_ACCEPTED'));
  const script=workflow.slice(begin+"if node --input-type=module <<'NODE'".length,end)
    .replace("import fs from 'node:fs';","const fs=require('node:fs');");
  const registry=JSON.parse(fs.readFileSync('roblox-games/fantasy-survival/CC0-ASSET-REGISTRY.json','utf8'));
  const ids=fs.readFileSync('roblox-games/fantasy-survival/shared/VisualAssetIds.luau','utf8');
  const run=(source,luau)=>{
    let code=null;
    runInNewContext(script,{
      require:name=>{
        assert.equal(name,'node:fs');
        return{readFileSync:file=>file.endsWith('CC0-ASSET-REGISTRY.json')?JSON.stringify(source):luau};
      },
      process:{exit:value=>{code=value;}},
    });
    return code;
  };
  assert.equal(run(registry,ids),0,'existing 20 verified registrations should skip costly re-upload');
  const id=registry.gearExpansionV1.models.gear_sword_01.assetId;
  assert.equal(run(registry,ids.replace('gear_sword_01='+id,'gear_sword_01=0')),1,
    'invalid source-to-ID mapping requires original registration');
  const tampered=structuredClone(registry);
  tampered.gearExpansionV1.models.gear_sword_01.sourceVerified=false;
  assert.equal(run(tampered,ids),1,'unverified provenance may not reuse registered assets');
});

// [대항해시대 1980 배포키] 기존 게임 게시/에셋 등록은 같은 소유 계정 키만 사용한다.
// 오디오 업로드의 기존 main 직접쓰기 경로는 이 배포키 변경에서 수정하지 않는다.
// 키 값은 저장하지 않고 GitHub Secret 이름과 기존 체험 ID의 결합만 검사한다.
test('Mare Essentia 1980 publish and asset workflows use only the dedicated deploy secret',()=>{
  const files=[
    '.github/workflows/owner-mare-essentia-direct-publish.yml',
    '.github/workflows/owner-mare-essentia-assets.yml',
  ];
  const keyName='$'+'{{ secrets.ROBLOX_DEPLOY_API_KEY }}';
  for(const file of files){
    const workflow=fs.readFileSync(file,'utf8');
    assert.ok(workflow.includes('ROBLOX_OPEN_CLOUD_API_KEY: '+keyName),file);
    assert.ok(!workflow.includes('secrets.ROBLOX_OPEN_CLOUD_API_KEY'),file);
    assert.ok(workflow.includes("ROBLOX_CREATOR_USER_ID: '11664914771'"),file);
  }
  const publish=fs.readFileSync(files[0],'utf8');
  assert.ok(publish.includes('MARE_1980_DEPLOY_API_KEY_MISSING'));
  assert.ok(publish.includes('MARE_CANONICAL_TARGET_MISMATCH'));
  assert.doesNotMatch(publish,/ROBLOX_ROBLOSECURITY:|ROBLOX_SECURITY_COOKIE:/);
  const registry=JSON.parse(fs.readFileSync('roblox-games/mare-essentia/experience-target.json','utf8'));
  assert.equal(registry.gameId,'mare-essentia');
  assert.equal(registry.universeId,'10775310508');
  assert.equal(registry.placeId,'73607605986189');
});

// [1980 전용 체험] 신규 경험 재사용에서 gameId가 다른 Place로 넘어가지 않도록 기존 인계를 검증한다.
test('1980 new experience publisher checks exact existing owner game target',()=>{
  const workflow=fs.readFileSync('.github/workflows/owner-new-experience.yml','utf8');
  assert.ok(workflow.includes('ROBLOX_OPEN_CLOUD_API_KEY: ' + '$' + '{{ secrets.ROBLOX_DEPLOY_API_KEY }}'));
  assert.ok(!workflow.includes('secrets.ROBLOX_DEPLOY_API_KEY || secrets.ROBLOX_OPEN_CLOUD_API_KEY'));
  assert.ok(workflow.includes('ROBLOX_1980_PUBLISH_API_KEY_MISSING'));
  assert.ok(workflow.includes('OWNER_EXPERIENCE_GAME_TARGET_MISMATCH'));
  assert.ok(workflow.includes('target.gameId!==game'));
  assert.ok(workflow.includes('target.universeId'));
  assert.ok(workflow.includes('target.placeId'));
  const forest=JSON.parse(fs.readFileSync('roblox-games/fantasy-survival/experience-target.json','utf8'));
  const mare=JSON.parse(fs.readFileSync('roblox-games/mare-essentia/experience-target.json','utf8'));
  assert.deepEqual([forest.gameId,forest.universeId,forest.placeId],['fantasy-survival','10775310122','70742682772890']);
  assert.deepEqual([mare.gameId,mare.universeId,mare.placeId],['mare-essentia','10775310508','73607605986189']);
});


// [새 Image 45개 공식 등록 후 게시] Actions 내부 등록 커밋으로 자동 배포가 발화하지 않은 경우도
// 기존 배포 워크플로 업데이트로 게시 가능하며, 미승인 Decal ID를 다시 게시하지 않는다.
test('Mare publisher rejects stale GUI Decal and ungranted registry assets before Rojo publishing',()=>{
  const publisher=fs.readFileSync('.github/workflows/owner-mare-essentia-direct-publish.yml','utf8');
  assert.match(publisher,/MARE_ASSET_UNIVERSE_MISMATCH/);
  assert.match(publisher,/MARE_ASSET_REGISTRY_LUAU_KEYS_MISMATCH/);
  assert.match(publisher,/MARE_ASSET_ID_OR_UNIVERSE_GRANT_UNVERIFIED/);
  assert.match(publisher,/MARE_GUI_ASSET_NOT_IMAGE/);
  assert.match(publisher,/MARE_PUBLISH_VERIFIED_REGISTERED_ASSETS=/);
  assert.ok(publisher.indexOf('MARE_GUI_ASSET_NOT_IMAGE') < publisher.indexOf('- name: Build Mare Essentia place with pinned Rojo'));
  assert.match(publisher,/'usePermissionGranted'|"usePermissionGranted"/);
  const assets=JSON.parse(fs.readFileSync('roblox-games/mare-essentia/assets-registered.json','utf8')).assets;
  const imageRows=Object.entries(assets).filter(([key])=>/^(Goods|Menu|Portraits)\//.test(key));
  assert.ok(imageRows.length>=65,'registered image catalog includes all allowed trade goods');
  assert.ok(imageRows.every(([,row])=>row.assetType==='Image'&&row.usePermissionGranted===true));
  const ids=fs.readFileSync('roblox-games/mare-essentia/src/ReplicatedStorage/Shared/AssetIds.luau','utf8');
  const active=new Map([...ids.matchAll(/\["([^"]+)"\]\s*=\s*(\d+)/g)].map(m=>[m[1],m[2]]));
  assert.equal(Object.keys(assets).length,active.size,'every registered asset stays bound to its Lua id');
  for(const [key,row] of Object.entries(assets)){
    assert.equal(String(row.assetId),active.get(key),key+' id mismatch');
    assert.equal(row.usePermissionGranted,true,key+' rights');
  }
});


// [대항해시대 시작 화면] 시설 탭마다 유일한 표시 이름이 있어야 Roblox Text에 nil이 전달되지 않는다.
test('Mare facility tabs provide unique nonempty labels for every rendered group',()=>{
  const client=fs.readFileSync('roblox-games/mare-essentia/src/StarterPlayer/Game.client.luau','utf8');
  const tabsSection=client.match(/local TABS = \{([\s\S]*?)\n\}/);
  const groupsSection=client.match(/local GROUPS = \{([\s\S]*?)\n\}/);
  assert.ok(tabsSection&&groupsSection,'facility tab definitions exist');
  const names=new Map();
  for(const m of tabsSection[1].matchAll(/\{\s*id\s*=\s*"([a-z_]+)",\s*name\s*=\s*"([^"]+)"\s*\}/g)){
    assert.equal(names.has(m[1]),false,'duplicate tab label: '+m[1]);
    names.set(m[1],m[2]);
  }
  const used=[...groupsSection[1].matchAll(/tabs\s*=\s*\{([^}]+)\}/g)]
    .flatMap(m=>[...m[1].matchAll(/"([a-z_]+)"/g)].map(v=>v[1]));
  assert.ok(used.length>0,'facility tabs exist');
  for(const id of used)assert.ok(names.get(id),'facility tab has no Text label: '+id);
  assert.equal(names.get('quest'),'진행 일지');
  assert.equal(names.get('map'),'지도');
  assert.equal(names.get('explore'),'지상 탐험');
});

// [비주얼] 교역품은 78/60px 목록과 상세 모두 실제 Cargo 메시로 표시한다. 일반 메뉴/그림만 2D로 유지한다.
test('Mare trade cards use registered 3D Cargo viewports even at compact mobile sizes',()=>{
  const client=fs.readFileSync('roblox-games/mare-essentia/src/StarterPlayer/Game.client.luau','utf8');
  const assets=JSON.parse(fs.readFileSync('roblox-games/mare-essentia/assets-registered.json','utf8')).assets;
  const specs={
    cheese:'cheese', cloth:'textiles-a', coffee:'cup-coffee', fish:'fish',
    glass:'glass', iron:'iron-bars', olive_oil:'bottle-oil', pepper:'pepper-mill',
    salt:'shaker-salt', tea:'cup-tea', timber:'wood-log-stack'
  };
  for(const [good,model] of Object.entries(specs)){
    assert.equal(assets['Goods/'+good]?.assetType,'Image',good);
    assert.equal(assets['Cargo/'+model]?.assetType,'Model',model);
    assert.equal(assets['Cargo/'+model]?.usePermissionGranted,true,model);
    assert.ok(client.includes(good+' = "'+model+'"'),'3D inventory must use matching registered model '+good);
  }
  assert.equal(assets['Cargo/glass-wine']?.assetType,'Model');
  assert.match(client,/GOOD_ICON\[goodsId\] = \{ "Cargo", cargoAsset, nil, "Goods\/" \.\. goodsId \}/);
  assert.match(client,/local RESTRICTED_CARGO_ICON = \{/);
  const neutralCargo=client.split('local RESTRICTED_CARGO_ICON = {')[1].split('\n}')[0];
  for(const good of ['beer','sake','wine','rum']){
    assert.ok(neutralCargo.includes(good+' = { "Cargo", "barrel", Color3.fromRGB('),
      good+' remains the neutral registered barrel');
  }
  assert.match(client,/if kind == "Goods" or kind == "Menu" then/);
  assert.doesNotMatch(client,/kind == "Cargo" and px < 64/);
  assert.match(client,/local assetId = AssetIds\[kind \.\. "\/" \.\. asset\]/);
  assert.match(client,/local vf = Instance\.new\("ViewportFrame"\)/);
  assert.match(client,/modelIcon\(right, gi\[1\], gi\[2\], gi\[3\], bigPx, sel\.name, gi\[4\]\)/);
  assert.match(client,/modelIcon\(row, gi\[1\], gi\[2\], gi\[3\], if compactList then 62 else 78, g\.name, gi\[4\]\)/);
  assert.match(client,/modelIcon\(cardF, gi\[1\], gi\[2\], gi\[3\], 96, g\.name, gi\[4\]\)/);
  // 현행 디자인은 별도 음영 이미지 대신 종이 프레임 안에 승인 원화를 직접 표시한다.
  assert.match(client,/art\.Name = "OriginalArt"/);
  assert.match(client,/art\.Image = "rbxassetid:\/\/" \.\. tostring\(assetId\)/);
  assert.match(client,/art\.ScaleType = Enum\.ScaleType\.Fit/);
  // [아이콘 가독성] 28px 이하 메뉴는 잉크빛, 큰 아이콘은 밝은 황동색을 써 명암을 유지한다.
  assert.match(client,/art\.ImageColor3 = if px <= 28 then Color3\.fromRGB\(139, 113, 102\) else Color3\.fromRGB\(255, 240, 204\)/);
  assert.match(client,/card\.BackgroundTransparency = 1/);
  // 모델 로딩 전에는 같은 교역품 원화, 원화가 없으면 해당 모델의 Roblox 섬네일만 쓴다.
  assert.match(client,/image\.Name = if originalId then "ApprovedGoodsArt" else "RegisteredModelThumbnail"/);
  assert.match(client,/image\.Image = if originalId then "rbxassetid:\/\/" \.\. tostring\(originalId\)/);
  assert.match(client,/else "rbxthumb:\/\/type=Asset&id=" \.\. tostring\(knownId\) \.\. "&w=150&h=150"/);
  assert.match(client,/local m = tpl:Clone\(\)/);
  assert.match(client,/local world = Instance\.new\("WorldModel"\)/);
  assert.match(client,/if #itemMotion >= 10 then return end/);
  // 실제 Cargo 표본은 작은 화면에서 모서리 투영에 맞춰 확대하며 리스트 회전을 제한한다.
  assert.match(client,/if kind == "Cargo" and px < 90 then/);
  assert.match(client,/cf:VectorToWorldSpace\(Vector3\.new\(half\.X \* x, half\.Y \* y, half\.Z \* z\)\)/);
  assert.match(client,/reach = fitted \* 1\.06/);
  assert.match(client,/if px >= 144 then\s+addItemMotion/,'realtime spin only on enlarged 3D showcase');
  assert.doesNotMatch(client.slice(client.indexOf('local function modelIcon('),client.indexOf('-- 줄(row) 왼쪽에 아이콘')),/Instance\.new\("Part"\)|Instance\.new\("MeshPart"\)/);
});


test('Mare trade goods practice validates existing originals, rights and blocked goods before autonomous registration',()=>{
  const root='roblox-games/mare-essentia';
  const wanted=JSON.parse(fs.readFileSync(root+'/assets-wanted.seed.json','utf8'))
    .find(x=>x.id==='trade-goods-icons-missing');
  const registry=JSON.parse(fs.readFileSync(root+'/assets-registered.json','utf8')).assets;
  const approved=JSON.parse(fs.readFileSync(root+'/assets/APPROVED_IMAGES.json','utf8')).approved;
  const script=fs.readFileSync('tools/devloop/assets_wanted.py','utf8');
  const workflow=fs.readFileSync('.github/workflows/owner-mare-essentia-assets.yml','utf8');
  const uploader=fs.readFileSync('tools/mare-essentia-upload-assets.mjs','utf8');
  assert.equal(wanted.goods.length,16);
  assert.equal(new Set(wanted.goods).size,16);
  assert.deepEqual(wanted.blockedGoods,['beer','sake']);
  for(const name of wanted.goods){
    const row=registry['Goods/'+name];
    assert.ok(row?.assetId,'missing registered '+name);
    assert.equal(row.usePermissionGranted,true,'permission '+name);
    assert.ok(approved['Goods/'+name],'missing approved SHA '+name);
    assert.equal(row.source,root+'/assets/goods/'+name+'.png');
  }
  for(const name of wanted.blockedGoods)assert.equal(registry['Goods/'+name],undefined);
  assert.match(script,/def trade_goods_practice\(\):/);
  assert.match(script,/sourceFingerprintRecorded/);
  assert.match(script,/nativeStudioDisplayVerified": False/);
  assert.match(script,/TRADE_GOODS_PRACTICE_REJECTED/);
  assert.match(workflow,/Practice and verify approved trade goods using existing asset ledger/);
  assert.match(workflow,/python3 tools\/devloop\/assets_wanted\.py roblox-games\/mare-essentia --verify-goods/);
  assert.match(workflow,/Refresh asset practice ledger after Roblox registration/);
  assert.match(workflow,/roblox-games\/mare-essentia\/assets-wanted\.json.*roblox-games\/mare-essentia\/assets\/cardart\/\*\.png[^;\n]*; do/);
  assert.match(workflow,/roblox-games\/mare-essentia\/assets\/relics\/weapon-(?:mace|crossbow)\.glb/);
  assert.match(workflow,/SKIP_UNVERIFIED_WEAPON_MODEL/);
  assert.match(uploader,/MARE_CC0_ORIGINAL_EVIDENCE_MISMATCH/);
  assert.match(uploader,/MARE_CC0_WRONG_MODEL_GEOMETRY/);
  assert.match(uploader,/GOODS_APPROVED_SOURCE_CHANGED_REUPLOAD/);
  assert.match(uploader,/GOODS_IMAGE_CHANGE_NOT_APPROVED/);
  assert.match(uploader,/sourceSha256/);
  assert.doesNotMatch(workflow,/publish_after_register: \s*true/);
});


// [교역품 3D] 남은 69종의 실물·권한·자동개선 관문을 검증한다.
test('Mare trade 69-item 3D practice stays source-bound and feeds existing Vibe asset lane',()=>{
  const root='roblox-games/mare-essentia';
  const ports=fs.readFileSync(root+'/src/ReplicatedStorage/Shared/Ports.luau','utf8');
  const section=ports.split('local Goods:')[1]?.split('\nlocal Ports:')[0];
  assert.ok(section,'Mare goods section exists');
  const ids=[...section.matchAll(/^\s*([a-z][a-z0-9_]*)\s*=\s*\{\s*id\s*=\s*"\1"/gm)].map(m=>m[1]);
  assert.equal(ids.length,69);
  const client=fs.readFileSync(root+'/src/StarterPlayer/Game.client.luau','utf8');
  const seed=JSON.parse(fs.readFileSync(root+'/assets-wanted.seed.json','utf8'));
  assert.ok(seed.some(x=>x.id==='trade-goods-3d-models'));
  assert.match(client,/for goodsId in PortData\.Goods do/);
  assert.match(client,/AssetIds\["Cargo\/" \.\. goodsId\]/);
  assert.match(client,/maize = "corn"/);
  assert.match(client,/copper = "copper-bar"/);
  assert.match(client,/silver = "silver-bar"/);
  assert.match(client,/gems = "gems-sack"/);
  assert.match(client,/local RESTRICTED_CARGO_ICON = \{/);
  assert.match(client,/if not RESTRICTED_CARGO_ICON\[goodsId\]/);
  const registered=JSON.parse(fs.readFileSync(root+'/assets-registered.json','utf8')).assets;
  const approved=JSON.parse(fs.readFileSync(root+'/assets/APPROVED_IMAGES.json','utf8')).approved;
  const match=client.match(/for goodsId, cargoAsset in \{([\s\S]*?)\}\s*do\s*if AssetIds\["Cargo\//);
  assert.ok(match);
  const pairs=[...match[1].matchAll(/\b([a-z][a-z0-9_]*)\s*=\s*"([a-z][a-z0-9_-]*)"/g)];
  assert.equal(pairs.length,15);
  for(const [,good,cargo] of pairs){
    assert.ok(ids.includes(good),good);
    const model=registered['Cargo/'+cargo];
    assert.equal(model?.assetType,'Model',cargo);
    assert.equal(model?.license,'CC0-1.0',cargo);
    assert.equal(model?.usePermissionGranted,true,cargo);
    assert.ok(approved['Goods/'+good],good);
  }
  const script=fs.readFileSync('tools/devloop/assets_wanted.py','utf8');
  assert.match(script,/TRADE_GOODS_SOURCE_SECTION_UNVERIFIED/);
  assert.match(script,/EXACT_GOOD_ROLE_REGISTERED_CC0_OR_PROJECT_ORIGINAL_GLB_SOURCE_HASH_UNIVERSE_RIGHTS/);
  assert.match(script,/asset\.get\("license"\) in \("CC0-1\.0", "PROJECT_ORIGINAL_ART"\)/);
  assert.match(script,/asset\.get\("sourceSha256"\) == source_hash/);
  assert.match(script,/nativeRuntimeVerified": False, "visualQualityPass": False/);
  assert.match(script,/"tradeGoods3DPractice"/);
  const workflow=fs.readFileSync('.github/workflows/owner-mare-essentia-assets.yml','utf8');
  assert.match(workflow,/schedule:\s*\n\s*- cron: '20 19 \* \* \*'/);
  assert.match(workflow,/github\.event_name != 'schedule'/);
  assert.match(workflow,/TRADE_GOODS_3D_SOURCE_PROVENANCE_MISSING/);
  assert.match(workflow,/j=report\['tradeGoodsPractice'\]/);
  assert.match(workflow,/three=report\['tradeGoods3DPractice'\]/);
  assert.doesNotMatch(workflow,/three=j\['tradeGoods3DPractice'\]/);
  const planner=fs.readFileSync('tools/vibe2-asset-production-plan.mjs','utf8');
  assert.match(planner,/gameId==='mare-essentia'/);
  assert.match(planner,/tradeGoodsSourceRequirements\.filter/);
  assert.match(planner,/assetProductionLane:'ASSET_DEVELOPMENT'/);
  assert.match(planner,/autoReplaceWithoutRuntimeReview:false/);
});

test('Mare trade keeps four tinted barrels and removes retired goods',()=>{
  const root='roblox-games/mare-essentia';
  const client=fs.readFileSync(root+'/src/StarterPlayer/Game.client.luau','utf8');
  const assets=JSON.parse(fs.readFileSync(root+'/assets-registered.json','utf8')).assets;
  const match=client.match(/local RESTRICTED_CARGO_ICON = \{([\s\S]*?)\n\}/);
  assert.ok(match,'restricted cargo map must be in existing GOOD_ICON flow');
  const entries=[...match[1].matchAll(/\b(beer|sake|wine|rum) = \{ "Cargo", "barrel", Color3\.fromRGB\((\d+), (\d+), (\d+)\) \}/g)];
  assert.deepEqual(entries.map(e=>e[1]).sort(),['beer','rum','sake','wine']);
  const colors=entries.map(e=>e.slice(2).join(','));
  assert.equal(new Set(colors).size,4,'one barrel mesh must have four distinct color tints');
  for(const name of ['barrel']){
    const asset=assets['Cargo/'+name];
    assert.equal(asset?.assetType,'Model',name);
    assert.equal(asset?.license,'CC0-1.0',name);
    assert.equal(asset?.usePermissionGranted,true,name);
    assert.ok(asset.assetId,name);
  }
  assert.match(client,/GOOD_ICON\[id\] = if AssetIds\[neutral\[1\] \.\. "\/" \.\. neutral\[2\]\] then neutral else \{ "Menu", "trade" \}/);
  assert.match(client,/if not RESTRICTED_CARGO_ICON\[goodsId\]/);
  assert.doesNotMatch(client,/SAFE_INGREDIENT_ICON/);
  assert.doesNotMatch(client,/\btobacco\b/);
  for(const file of ['Ports','Quests','KnowledgeCards','Sites','WorldEvents','HistoryEvents','People','PeopleTalk','Fields']){
    const src=fs.readFileSync(root+'/src/ReplicatedStorage/Shared/'+file+'.luau','utf8');
    assert.doesNotMatch(src,/tobacco|담배|담뱃/i,file);
  }
  const state=fs.readFileSync(root+'/src/ServerScriptService/Services/State.luau','utf8');
  assert.match(state,/goodId == "tobacco"/);
  const sites=fs.readFileSync(root+'/src/ReplicatedStorage/Shared/Sites.luau','utf8');
  assert.doesNotMatch(sites,/am_peace_pipe/);
  assert.match(state,/s\.coins = math\.min\(1e9, s\.coins \+/);
  assert.match(state,/q_tobacco_amsterdam = "q_logwood_amsterdam"/);
  assert.match(state,/q_tobacco_oslo = "q_logwood_oslo"/);
  assert.match(state,/q_tobacco_amsterdam2 = "q_logwood_amsterdam2"/);
  const quests=fs.readFileSync(root+'/src/ReplicatedStorage/Shared/Quests.luau','utf8');
  for(const id of ['q_logwood_amsterdam','q_logwood_oslo','q_logwood_amsterdam2'])
    assert.match(quests,new RegExp('id = "'+id+'".*goodId = "logwood"'));
  assert.doesNotMatch(quests,/goodId = "tobacco"/);
  // 제한 품목의 차단된 전용 이미지·새 모델을 재등록하지 않는다.
  for(const id of ['beer','sake','rum','wine']){
    assert.equal(assets['Goods/'+id],undefined);
    assert.equal(assets['Cargo/'+id],undefined);
  }
});

// [공식 Studio 회귀] 양·닭 수입 FBX는 허용 자산을 유지한 채 원본 배율·실제 3D 크기를 검증한다.
// [문화권별 3D 주택 검증] 라이선스·체험 권한·입면·재질을 기존 마을 빌더와 함께 확인한다.
test('Mare cultural house facades use approved CC0 doors and preserve glass and metal',()=>{
  const root='roblox-games/mare-essentia';
  const culture=fs.readFileSync(root+'/src/ReplicatedStorage/Shared/PortCultures.luau','utf8');
  const scene=fs.readFileSync(root+'/src/ReplicatedStorage/Shared/PortScene.luau','utf8');
  const ids=fs.readFileSync(root+'/src/ReplicatedStorage/Shared/AssetIds.luau','utf8');
  const registry=JSON.parse(fs.readFileSync(root+'/assets-registered.json','utf8')).assets;
  const arch=culture.split('local HOUSE_ARCH = {')[1]?.split('\n}\nfor culture, architecture in HOUSE_ARCH')[0];
  assert.ok(arch,'regional house architecture table must exist');
  const doors=[...arch.matchAll(/\bentry = "([^"]+)"/g)].map(x=>x[1]);
  assert.equal(doors.length,20,'all non-East Asian regional houses need authentic doorway variants');
  for(const asset of new Set([...doors,...[...arch.matchAll(/\b(?:roof|trim) = "([^"]+)"/g)].map(x=>x[1])])){
    const key='Town/'+asset;
    assert.equal(registry[key]?.license,'CC0-1.0',key);
    assert.equal(registry[key]?.usePermissionGranted,true,key);
    assert.ok(ids.includes('["'+key+'"]'),key+' registered');
  }
  for(const name of ['north','nordic','hanse','iberia','italy','france','britain','ottoman','swahili','malabar','seasia','wafrica']){
    const row=arch.split('\n').find(line=>line.trimStart().startsWith(name+' = {'));
    assert.ok(row?.includes('entry = "'),name+' must use a region-appropriate door');
  }
  assert.match(arch,/japan = \{[^\n]*eastAsiaEntry = true/);
  assert.match(arch,/china = \{[^\n]*eastAsiaEntry = true/);
  assert.match(scene,/architecture\.entry and not vacant and seed % 3 == 1/);
  assert.match(scene,/HarborDoorDetail/);
  assert.match(scene,/p\.Material ~= Enum\.Material\.Glass/);
  assert.match(scene,/p\.Material ~= Enum\.Material\.Metal/);
  assert.match(scene,/p\.Material ~= Enum\.Material\.Neon/);
});

test('Mare harbor animals preserve imported mesh scale and verify final bounds',()=>{
  const scene=fs.readFileSync('roblox-games/mare-essentia/src/ReplicatedStorage/Shared/PortScene.luau','utf8');
  assert.match(scene,/local isAnimal = kind == "Animals"/);
  assert.match(scene,/elseif isAnimal then math\.max\(ext\.X, ext\.Y, ext\.Z\)/);
  assert.match(scene,/if not isAnimal and \(ratio < 0\.01 or ratio > 100\)/);
  assert.match(scene,/m:GetScale\(\) \* ratio/);
  assert.match(scene,/math\.abs\(actualAxis - desiredSize\) > desiredSize \* 0\.2/);
  assert.match(scene,/local asset = if species == "dog" then "dog-pug" else species/);
  assert.match(scene,/local m = if species == "duck" then nil else k and importedModel\(folder, "Animals", asset, pos, k\[1\], false, coat/);
  assert.match(scene,/if isAnimal then m:GetScale\(\) \* ratio else ratio/);
});

test('Mare animals and harbor life models retain exact CC0 source hashes without a fake native quality pass',()=>{
  const root='roblox-games/mare-essentia';
  const uploader=fs.readFileSync('tools/mare-essentia-upload-assets.mjs','utf8');
  assert.ok(uploader.includes("['animals', 'Animals']"));
  const wanted=JSON.parse(fs.readFileSync(root+'/assets-wanted.seed.json','utf8'));
  const animals=wanted.find(row=>row.id==='mare-farm-animals');
  const props=wanted.find(row=>row.id==='mare-harbor-life-props');
  assert.equal(animals?.autoBindWithoutRuntimeProof,false);
  assert.equal(props?.autoBindWithoutRuntimeProof,false);
  assert.equal(animals?.sourceReady.length,10);
  assert.equal(animals?.missing.length,4);
  assert.ok(props.missing.includes('fishing-net'));
  assert.ok(!props.missing.includes('anchor'));
  assert.ok(animals.missing.includes('camel'));
  assert.ok(animals.regionalUseGuidance.elephant.some(x=>x.includes('말라바르')));
  assert.equal(animals.visualQualityStatus,'SOURCE_ONLY_HOLD_UNTIL_NATIVE_GAMEPLAY_VISUAL_QA');
  const ledger=fs.readFileSync(root+'/assets/SOURCES.md','utf8');
  const expected={"animals/cow.fbx":"0202789cad8c1debb8ae5b4a47d1a5d2e5f93a0875878bc0b05a80e42ae37e8d","animals/horse.fbx":"6db270ddc7591e9a013f96eab445031381fa6d5d68d2feba567f964e0fe68d90","animals/sheep.fbx":"4a3fc559cc9f37e3e3f216af1dab30cb411ec9b268eb98676f1d5c18a430d33e","animals/pig.fbx":"bdf5e149a974ffc2431546f30ea568d7c41f916d7bd87187f1532c45778a9a23","animals/llama.fbx":"3ff44fd03d5793701b228cf88f00e776f89afefdb3de0b226fee807908ae79c9","animals/dog-pug.fbx":"c05e127a5b10edd059478113f542f691717635b47d7a57317d07e7310a764ff0","animals/chicken.fbx":"e5d51fa328f466fc74290c3fa51d769c9b254d771a4b066dd7947bae899a7794","town/watermill.glb":"38dac94afcf84ea072603f558d96a843d45eea2f64321ad8f31c6a5cbff1b498","town/wheel.glb":"9dcffeb5b591f949b8488775592c224a8ba7988d94b0ba205fe5486730c28b30","town/workbench-anvil.glb":"b92fb534e0f6db92565529a8cc15753fb0ddbf35c3f5bcc718aaabb7d31e4a07","town/cart-high.glb":"c9d656399c42e6fb47f406ae31eb637ad0c1bfea45300209f4e2f2c405e94eb6","town/workbench-grind.glb":"6da609c418bba7ee8f8402d8f6783fa1d45c3c6391202c31cd4d25a710d37a20","animals/cat.glb":"1e73aaf7d497dd7d2946badf92d189d2333f163e66dced91feb446bc9bdee850","animals/elephant.glb":"0831346fb8ddb8e99e42e3f92fb48858551049dc7ea49e641d90fdfc65e057be","naval/anchor.glb":"f629c05a217c380daf5b04d00e21ac398829eb746f908db4ecefd760c3892dc7"};
  for(const [relative,sha] of Object.entries(expected)){
    const bytes=fs.readFileSync(root+'/assets/'+relative);
    assert.equal(createHash('sha256').update(bytes).digest('hex'),sha,relative);
    assert.ok(ledger.includes(sha),relative+' provenance');
    if(relative.endsWith('.fbx'))assert.equal(bytes.subarray(0,18).toString(),'Kaydara FBX Binary',relative);
    else assert.equal(bytes.subarray(0,4).toString(),'glTF',relative);
  }
});


test('Mare Quaternius donkey is an immutable CC0 source-derived static model, not fake rig motion',()=>{
  const root='roblox-games/mare-essentia/assets/animals/';
  const obj=fs.readFileSync(root+'donkey-source.obj');
  const mtl=fs.readFileSync(root+'donkey-source.mtl');
  const glb=fs.readFileSync(root+'donkey.glb');
  const gitSha=bytes=>createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
  assert.equal(gitSha(obj),'31869de9664710b0b035b4441cab17cacf6e3925');
  assert.equal(gitSha(mtl),'8637f52251852454564167b8e71839108fa1b5b7');
  assert.equal(gitSha(glb),'408de349a14a3d270441fc61033f09646cdca866');
  assert.equal([...obj.toString('utf8').matchAll(/^v /gm)].length,1002);
  assert.equal([...obj.toString('utf8').matchAll(/^f /gm)].length,1022);
  assert.equal([...mtl.toString('utf8').matchAll(/^newmtl /gm)].length,8);
  assert.equal(glb.readUInt32LE(0),0x46546c67);
  assert.equal(glb.readUInt32LE(4),2);
  assert.equal(glb.readUInt32LE(8),glb.length);
  assert.equal(glb.readUInt32LE(16),0x4e4f534a);
  const gltf=JSON.parse(glb.subarray(20,20+glb.readUInt32LE(12)).toString('utf8'));
  assert.equal(gltf.asset.version,'2.0');
  assert.equal(gltf.meshes.length,1);
  assert.equal(gltf.meshes[0].primitives.length,8);
  assert.equal(gltf.materials.length,8);
  assert.equal(gltf.meshes[0].primitives.reduce((sum,p)=>sum+gltf.accessors[p.attributes.POSITION].count,0),6000);
  assert.equal(gltf.animations?.length||0,0);
  const seed=JSON.parse(fs.readFileSync('roblox-games/mare-essentia/assets-wanted.seed.json','utf8'));
  const animals=seed.find(x=>x.id==='mare-farm-animals');
  assert.ok(animals.sourceReady.includes('donkey'));
  assert.ok(animals.animationPending.includes('donkey'));
  assert.equal(animals.actualStudioAnimationVerified,false);
  assert.equal(animals.autoBindWithoutRuntimeProof,false);
});

// [주민 정면] 얼굴 표면은 머리의 원본 데칼 면을 따라야 한다. 몸통 축으로 반대쪽에 덧그리지 않는다.
test('Mare R15 faces use their native head front and stationary villagers greet nearby players',()=>{
  const pose=fs.readFileSync('roblox-games/mare-essentia/src/ReplicatedStorage/Shared/Pose.luau','utf8');
  const port=fs.readFileSync('roblox-games/mare-essentia/src/ReplicatedStorage/Shared/PortScene.luau','utf8');
  assert.match(pose,/gui\.Face = Enum\.NormalId\.Front/);
  assert.match(pose,/decal\.Face = Enum\.NormalId\.Front/);
  assert.doesNotMatch(pose,/head\.CFrame:VectorToObjectSpace\(root\.CFrame\.LookVector\)/);
  assert.match(pose,/pcall\(drawFace, headPart, role, skin, rng, outfit and outfit\.gender\)/);
  assert.match(port,/local guestRoot = character and character:FindFirstChild\("HumanoidRootPart"\)/);
  assert.match(port,/elseif guestRoot then guestRoot\.Position elseif cam then cam\.CFrame\.Position else nil/);
  assert.match(port,/local nearGuest = flat\.Magnitude > 1 and flat\.Magnitude < 26/);
  assert.match(port,/local canFaceGuest = w\.kind == "talk" or w\.kind == "stall" or w\.kind == "look" or w\.kind == nil/);
  assert.match(port,/if nearGuest and canFaceGuest and \(not partner or flat\.Magnitude < 12\) then/);
  assert.match(port,/target, direction = 1, flat/);
  assert.match(port,/w\.model:PivotTo\(CFrame\.new\(pos \+ Vector3\.new\(0, bob, 0\)\) \* CFrame\.Angles\(0, yaw, 0\) \* rot\)/);
});

// [탐험 전투] 기존 판정·무기 목록은 보존하고, 화면 이동·두 무기·이미지 가독성을 검증한다.
test('Mare field charge, follower formation, two-weapon quick swap and approved skill art stay coherent',()=>{
  const field=fs.readFileSync('roblox-games/mare-essentia/src/ReplicatedStorage/Shared/FieldScene.luau','utf8');
  const weapons=fs.readFileSync('roblox-games/mare-essentia/src/ReplicatedStorage/Shared/Weapons.luau','utf8');
  const assets=JSON.parse(fs.readFileSync('roblox-games/mare-essentia/assets-registered.json','utf8')).assets;
  assert.ok(field.includes('e.chargeTarget = e.model:GetPivot().Position + to.Unit * reach'));
  assert.ok(field.includes('desired = remaining.Unit * math.min(48, remaining.Magnitude / math.max(dtc, 0.016))'));
  assert.ok(!field.includes('e.model:PivotTo(e.model:GetPivot() + to.Unit * step)'),'no one-frame enemy charge teleport');
  assert.ok(field.includes('math.min(e.ac.def.speed * 0.8, flat.Magnitude / math.max(dtc, 0.016))'),'enemy speed respects frame lag');
  assert.ok(field.includes('pcall(Pose.createR15, folder, pos0, 0, ad.coat, rng, ad.role, heroHeight, outfit)'));
  assert.ok(field.includes('a.focus = tgt'),'ally retains combat target instead of switching every frame');
  assert.ok(field.includes('root0.CFrame * CFrame.new(if a.slot == 1 then -3.4 else 3.4, 0, 4.7)'));
  assert.ok(field.includes('wbtn:SetAttribute("WeaponChoiceCount", 2)'));
  assert.ok(field.includes('wpn, reserveWeapon = reserveWeapon, wpn'));
  assert.ok(weapons.includes('function Weapons.cycle('),'all historical weapon definitions remain available');
  for(const key of ['Menu/cc0_glove','Menu/cc0_shield2','Menu/cc0_axe','Menu/cc0_sword']){
    assert.equal(assets[key]?.assetType,'Image',key);
    assert.equal(assets[key]?.usePermissionGranted,true,key);
  }
  assert.ok(field.includes('local dodgeIcon = if AssetIds["Menu/field_dodge"] then addIcon(b, "Menu/field_dodge")'));
  assert.ok(field.includes('else addIcon(b, "Menu/chart_compass")'),'registered dodge art has safe compass fallback');
  assert.ok(field.includes('img.ScaleType = Enum.ScaleType.Fit'));
  // 아이콘 전용 버튼은 원화의 중앙 배치·잘림 방지를 위해 별도 크기를 사용한다.
  assert.ok(field.includes('img.Position = UDim2.fromScale(0.5, if iconOnly then 0.5 else 0.385)'));
  assert.ok(field.includes('img.Size = UDim2.fromScale(if iconOnly then 0.88 else (if painted then 0.83 else 0.79),'));
});

// [탐험 안정성] 지역별 무리/지역 실물 배경, 검증된 무기, 동료 접지, 철수 중단을 기존 경로에서 검증한다.
test('Mare exploration preserves combat rules while grounding allies and containing cancelled scene builds',()=>{
  const field=fs.readFileSync('roblox-games/mare-essentia/src/ReplicatedStorage/Shared/FieldScene.luau','utf8');
  const client=fs.readFileSync('roblox-games/mare-essentia/src/StarterPlayer/Game.client.luau','utf8');
  const pose=fs.readFileSync('roblox-games/mare-essentia/src/ReplicatedStorage/Shared/Pose.luau','utf8');
  const reg=field.match(/local REGION_ENCOUNTERS = \{([\s\S]*?)\n\}/);
  assert.ok(reg,'existing 21 cultures have encounter placements');
  for(const region of ['iberia','italy','france','britain','hanse','nordic','brick','stone','med','ottoman','desert','swahili','malabar','japan','china','seasia','tropic','colonial','creole','pacific','wafrica']){
    assert.match(reg[1],new RegExp('\\b'+region+'\\s*='),region+' region');
  }
  assert.match(field,/FieldEncounterPattern/);
  for(const habitat of ['coast','forest','ruins','highland','desert','plains','mine']){
    assert.match(field,new RegExp('\\b'+habitat+'\\s*=\\s*\\{ Vector2\\.new'),habitat+' enemy habitat');
  }
  assert.match(field,/local enemyCount = math\.clamp\(20 \+ \(danger0 - 1\) \* 6, 20, 100 - bossCount\)/);
  assert.match(field,/local pos0 = Vector3\.new\(footX, ORIGIN\.Y \+ 0\.015, root0\.Position\.Z - 4\)/);
  assert.match(pose,/function Pose\.createR15\(parent, bottomPosition,/);
  assert.match(field,/local created, m = pcall\(Pose\.createR15, folder, pos0/);
  assert.match(field,/local visualTreeCount = if visualMobile then math\.min\(treeCount, 44\)/);
  assert.match(field,/local visualRockCount = if visualMobile then math\.min\(rockCount, 36\)/);
  assert.match(field,/local hillCount = if visualMobile then 16 else 28/);
  // [집안별 무기] 임의 전체 순환이 아닌 최초 선택 무기 두 개만 실제 교체한다.
  assert.match(field,/wbtn:SetAttribute\("WeaponChoiceCount", 2\)/);
  assert.match(field,/wbtn:SetAttribute\("WeaponPrimaryId", wpn\.id\)/);
  assert.match(field,/wbtn:SetAttribute\("WeaponSecondaryId", reserveWeapon\.id\)/);
  assert.match(field,/wpn, reserveWeapon = reserveWeapon, wpn/);
  assert.doesNotMatch(field,/chooseBtn\.Name = "FieldWeaponSelect"/);
  assert.match(field,/equipFieldWeapon\(player\.Character, wpn\)/);
  assert.match(field,/if finished or not folder\.Parent then return \{ finish = finish, cancelled = true \} end/);
  assert.match(field,/local created, model = pcall\(Pose\.createR15, folder, pos,/);
  assert.match(client,/startOk and type\(startResult\) == "table" and startResult\.cancelled == true/);
  assert.match(client,/workspace:SetAttribute\("FieldEntryStage", "CANCELLED"\)/);
});

// [탐험 재진입] 스킬 E/조사 T, 명시적 귀환, 반원형 모바일 UI, 희귀 단서·보상 보안 회귀.
test('Mare field skill cannot accidentally complete exploration and region cards use canonical discovery',()=>{
  const field=fs.readFileSync('roblox-games/mare-essentia/src/ReplicatedStorage/Shared/FieldScene.luau','utf8');
  const game=fs.readFileSync('roblox-games/mare-essentia/src/StarterPlayer/Game.client.luau','utf8');
  const view=fs.readFileSync('roblox-games/mare-essentia/src/ServerScriptService/Services/View.luau','utf8');
  const discovery=fs.readFileSync('roblox-games/mare-essentia/src/ServerScriptService/Services/Discovery.luau','utf8');
  const assets=fs.readFileSync('roblox-games/mare-essentia/src/ReplicatedStorage/Shared/AssetIds.luau','utf8');
  assert.match(field,/pp\.KeyboardKeyCode = Enum\.KeyCode\.T/);
  assert.match(field,/cluePrompt\.KeyboardKeyCode = Enum\.KeyCode\.T/);
  assert.doesNotMatch(field,/input\.KeyCode == Enum\.KeyCode\.E then/);
  assert.match(field,/input\.KeyCode == Enum\.KeyCode\.F then/);
  assert.match(field,/input\.KeyCode == Enum\.KeyCode\.R then/);
  assert.match(field,/input\.KeyCode == Enum\.KeyCode\.G then/);
  assert.doesNotMatch(field,/task\.delay\(0\.8,\s*function\(\)\s*finish\("clear"\)/);
  assert.match(field,/completeBtn\.Name = "FieldComplete"/);
  assert.match(field,/if not finished and found >= nodeCount then finish\("clear"\) end/);
  // 조사 전에는 귀환 버튼을 숨기고, 완료 팝업이 뜰 때만 활성화한다.
  assert.match(field,/completeBtn\.Visible = false/);
  assert.match(field,/completeBtn\.Visible, completeReopen\.Visible = true, true/);
  assert.match(field,/if not finished and found >= nodeCount then completePopup\.Visible = true end/);
  assert.match(field,/completeBtn\.Activated:Connect\(function\(\)\s*if not finished and found >= nodeCount then finish\("clear"\) end/);
  assert.match(field,/FieldExitReason/);
  assert.match(field,/local function castEffect\(sk, name, ch, hp0\)\s*-- .*?\n\s*local now = os\.clock\(\)/);
  assert.match(field,/pl\.buffUntil = now \+ 8/);
  // [자동 5타 강타] 수동 스킬 버튼이 아닌 기본 공격·회피 전용 입력과 자동 강타 경로를 검사한다.
  assert.match(field,/pl\.autoNormalHits % 5 == 0/);
  assert.match(field,/ch:GetAttribute\("FieldAutoSkillPending"\)/);
  assert.match(field,/mark == pl\.autoNormalHits/);
  assert.match(field,/equipped\.heavy, equipped\.sweep = true, false/);
  assert.match(field,/if useMove\("heavy"\) then/);
  assert.match(field,/bindPress\(attackBtn, useAttack\)/);
  assert.match(field,/hit\.Size = attackBtn\.Size \+ UDim2\.fromOffset\(20, 20\)/);
  assert.match(field,/b\.Name = "FieldDodge"/);
  assert.match(field,/bindPress\(b, function\(\) useMove\("dodge"\) end\)/);
  assert.match(field,/attackBtn\.Position\.X\.Offset - 146/);
  assert.match(field,/local dodgeIcon = if AssetIds\["Menu\/field_dodge"\] then addIcon\(b, "Menu\/field_dodge"\)/);
  assert.doesNotMatch(field,/slotPos\("heavy"\), skillSize/);
  assert.match(field,/local observedCardId = nil/);
  assert.ok(field.indexOf('local observedCardId = nil')<field.indexOf('local function finish(result)'));
  assert.match(field,/pcall\(opts\.onFinish, result, observedCardId, earnedPractice, fieldStreakResult\)/);
  assert.match(field,/for _, id in \(opts\.observableCards or \{\}\) do/);
  assert.match(field,/local targetCard = if #availableCards > 0 then KnowledgeCards\.ById/);
  assert.match(field,/if special and rareTrace then/);
  assert.match(field,/for clueIndex = 1, 2 do/);
  assert.match(field,/FieldRareTraceFound/);
  assert.match(field,/FieldEvidence/);
  assert.match(field,/animal and AssetIds\["Animals\/" \.\. animal\[1\]\]/);
  assert.match(field,/AssetIds\["CardArt\/" \.\. targetCard\.id\]/);
  assert.match(assets,/Animals\/elephant/);
  assert.match(assets,/Animals\/llama/);
  assert.match(view,/observableCards = observableCards/);
  assert.match(view,/not S\.Discovery\.cardBlockReason\(state, D\.Cards\.ById\[cardId\]\)/);
  assert.match(game,/observableCards = s\.observableCards/);
  assert.match(game,/observedCardId = observedCardId/);
  assert.match(discovery,/table\.find\(remaining, observedId\)/);
  assert.match(discovery,/baseCard\.field == observedCard\.field and baseCard\.rarity == observedCard\.rarity/);
  assert.match(discovery,/local chance = math\.min\(0\.95, 0\.55 \+ D\.Careers\.discoverBonus\(lv\) \+ S\.Perk\.discoverBonus\(state, field\)\)/);
});

// [집안·첫 화면] 기존 State.origin을 직접 연결하고, 시작 메뉴는 큰 글씨/큰 터치 영역을 유지한다.
test('Mare selected family shows and equips its original historical weapon with readable title actions',()=>{
  const weapons=fs.readFileSync('roblox-games/mare-essentia/src/ReplicatedStorage/Shared/Weapons.luau','utf8');
  const ui=fs.readFileSync('roblox-games/mare-essentia/src/StarterPlayer/Game.client.luau','utf8');
  const field=fs.readFileSync('roblox-games/mare-essentia/src/ReplicatedStorage/Shared/FieldScene.luau','utf8');
  const state=fs.readFileSync('roblox-games/mare-essentia/src/ServerScriptService/Services/State.luau','utf8');
  const view=fs.readFileSync('roblox-games/mare-essentia/src/ServerScriptService/Services/View.luau','utf8');
  assert.match(weapons,/function Weapons\.originWeapon\(originId: string\?, year: number\?\): Weapon/);
  for(const origin of ['farmer','noble','merchant','sailor','soldier','scholar','cook','doctor','craftsman','clergy'])
    assert.match(weapons,new RegExp('\\b'+origin+'\\s*=\\s*"'),origin);
  assert.match(weapons,/originId == "soldier" and \(year or 1517\) >= 1680/);
  assert.match(state,/origin = if originId and D\.Specialties\.OriginById\[originId\] then originId else nil/);
  assert.match(view,/view\.captain\.origin = og and \{ id = og\.id/);
  assert.match(ui,/weapon = Weapons\.originWeapon\(view and view\.captain and view\.captain\.origin and view\.captain\.origin\.id,/);
  assert.match(field,/local wpn = Weapons\.get\(opts\.weapon or workspace:GetAttribute\("DevWeapon"\) or "sword"\)/);
  assert.match(ui,/n3\.Name = "OriginStartingWeapon"/);
  assert.match(ui,/local originWeapon = Weapons\.originWeapon\(o\.id, chosenYear\)/);
  assert.match(ui,/ogl\.CellSize = UDim2\.new\(0\.5, -4, 0, 120\)/);
  assert.match(ui,/first|intro|menu/i);
  assert.match(ui,/titlePanel\.Size = UDim2\.new\(0\.58, 0, 1, -28\)/,'single-start-screen title selection stays within viewport');
  assert.match(ui,/lim\.MaxSize = Vector2\.new\(720, 9999\)/);
  assert.match(ui,/go\.TextSize = 22/,'main start button stays legible');
  assert.match(ui,/H\.titleSetupOpen = false -- 이어하기와 새 항해 준비를 같은 화면에서 펼친다/);
  assert.match(ui,/elseif view then "⚓ 새 항해 출항" else "⚓ 출항하기"/);
  assert.match(ui,/go\.LayoutOrder = nxt\(\)/);
});

test('Mare existing Quaternius outfit originals remain source-verifiable without claiming native animation QA',()=> {
  const root='roblox-games/mare-essentia/';
  // [원본] inbox 대기 후보가 아니라 기존 등록 폴더 assets/people의 실제 GLB 30종이 정본이다.
  const base=root+'assets/people/';
  const names=['male_peasant_body','male_peasant_legs','female_peasant_body','female_peasant_legs',
    'male_ranger_body','male_ranger_legs','female_ranger_body','female_ranger_legs',
    'male_peasant_arms','male_peasant_feet','female_peasant_arms','female_peasant_feet',
    'male_ranger_arms','male_ranger_feet_boots','female_ranger_arms','female_ranger_feet',
    'male_ranger_acc_pauldron','female_ranger_acc_pauldrons',
    'male_ranger_head_hood','female_ranger_head_hood','hair_buns','hair_buzzed','hair_buzzedfemale','hair_long','hair_simpleparted','hair_beard',
    'head_f','head_m','rig_f','rig_m'];
  assert.equal(names.length,30);
  const ui=fs.readFileSync(root+'src/StarterPlayer/Game.client.luau','utf8');
  const server=fs.readFileSync(root+'src/ServerScriptService/Core.server.luau','utf8');
  const state=fs.readFileSync(root+'src/ServerScriptService/Services/State.luau','utf8');
  const sources=fs.readFileSync(root+'assets/SOURCES.md','utf8');
  const registry=JSON.parse(fs.readFileSync(root+'assets-registered.json','utf8')).assets;
  assert.match(ui,/local chosenYear = 1517/);
  assert.doesNotMatch(ui,/1492년 ★추천/);
  assert.match(server,/local START_YEARS = \{ \[1517\] = true/);
  assert.doesNotMatch(server,/\[1492\] = true/);
  assert.match(state,/num\(saved.startYear, 1700, 1500, 1800\)/);
  const knownGitOriginals={
    male_peasant_body:'a016a5c5299a72a40d8158020af3de2e3a64b756',
    female_peasant_body:'664e12d423af7ed48fd9f13c8ddd7692ee4e7fc0',
    male_ranger_body:'ba6b58700f7884ff51ddf440e1ac88e6cb482399',
    rig_f:'76b719a25720db940354aa8bd6ac934bd05a6f63',
    rig_m:'5fee12260a48d30532c26e01183fc5411cf83ae2',
  };
  for(const name of names){
    const glb=fs.readFileSync(base+name+'.glb');
    assert.equal(glb.readUInt32LE(0),0x46546c67,name+' GLB magic');
    assert.equal(glb.readUInt32LE(4),2,name+' glTF version');
    assert.equal(glb.readUInt32LE(8),glb.length,name+' glTF length');
    assert.ok(sources.includes('| \x60people/\x60 | '+name+'.glb | Quaternius · CC0-1.0 | https://quaternius.com/packs/'),name+' original provenance');
    const expected=knownGitOriginals[name];
    if(expected){
      const sha=createHash('sha1').update('blob '+glb.length).update(Buffer.from([0])).update(glb).digest('hex');
      assert.equal(sha,expected,name+' original Git SHA');
    }
    const row=registry['People/'+name];
    if(name.startsWith('rig_')){
      assert.equal(row,undefined,name+' unverified base rig must not be registered');
    }else{
      assert.equal(row?.source,base+name+'.glb');
      assert.equal(row?.license,'CC0-1.0');
      assert.equal(row?.assetType,'Model');
      assert.equal(row?.usePermissionGranted,true);
    }
  }
  // [별도 평가] 실물 파일·라이선스·등록 사실은 실제 R15 애니메이션 검증과 다른 증거다.
  assert.doesNotMatch(sources,/NATIVE_R15_ANIMATION_QA_VERIFIED=PASS/);
});

test('Mare naval encounter keeps card duel exclusive to the dedicated tavern flow', () => {
  const client=fs.readFileSync('roblox-games/mare-essentia/src/StarterPlayer/Game.client.luau','utf8');
  const naval=fs.readFileSync('roblox-games/mare-essentia/src/ReplicatedStorage/Shared/NavalBattle.luau','utf8');
  const server=fs.readFileSync('roblox-games/mare-essentia/src/ServerScriptService/Services/Battle.luau','utf8');
  const seaMarker=client.indexOf('-- 해전을 했다면 전투 기록을 3D 장면으로 보여 준다');
  const seaStart=client.indexOf('NavalBattle.play({',seaMarker);
  const seaEnd=client.indexOf('\n\t\t\tonDone = function(',seaStart);
  assert.ok(seaMarker>=0 && seaStart>seaMarker && seaEnd>seaStart,'sea battle call is present');
  const seaOptions=client.slice(seaStart,seaEnd);
  assert.doesNotMatch(seaOptions,/\bcard\s*=|onCards\s*=|cardEffects\s*=|\bdeck\s*=/,'no duel UI or card chips in real naval battle');
  assert.match(seaOptions,/sim = if lb\.pending then lb\.sim else nil/,'real-time naval simulation remains');
  assert.match(seaOptions,/onResult = function/,'server naval result validation remains');
  assert.match(naval,/if not opts\.cardOnly then opts\.card = nil end/,'naval scene rejects legacy duel metadata');
  const tavernStart=client.indexOf('local function playCardOnly(');
  const tavernEnd=client.indexOf('local function startPractice()',tavernStart);
  assert.ok(tavernStart>=0 && tavernEnd>tavernStart,'separate card duel entry is present');
  const tavern=client.slice(tavernStart,tavernEnd);
  assert.match(tavern,/cardOnly = true/);
  assert.match(tavern,/card = cardCfg or/);
  assert.match(tavern,/onCards = function/);
  assert.match(server,/-- 해상전은 카드 대결 없이 원래 전투 판정을 따른다/);
  // [잘못된 안내 회귀] 도감이 해전 승패를 카드 대결로 설명하지 않는다.
  assert.match(client,/주점 카드 대결 도감/);
  assert.match(client,/해적과의 해전 승패는 함선 조종·포격·접현 전투로 결정돼요/);
  assert.doesNotMatch(client,/해적과 싸우면 카드 대결로 승패가 갈려요|카드에서 이기면 전체 승리예요/);
});

// [해전 시각 품질 회귀] 기존 포격·접현 판정은 그대로 두고 장면 연출만 정교하게 바꾼다.
test('Mare naval cinematic VFX keeps server outcome and mobile emission budgets', () => {
  const battle=fs.readFileSync('roblox-games/mare-essentia/src/ReplicatedStorage/Shared/NavalBattle.luau','utf8');
  assert.match(battle,/local MOBILE_VFX = game:GetService\("UserInputService"\)\.TouchEnabled/);
  assert.match(battle,/local rangeRing = \{ segments = \{\}, volleyUntil = 0, impactUntil = 0, hitUntil = 0, fade = 1 \}/,'range remains a segmented outline with newer impact radar states, not a solid sea disk');
  assert.match(battle,/local segmentLength = 2 \* math\.pi \* cannon\.range \/ count/,'radius must reuse existing gun range');
  assert.doesNotMatch(battle,/rangeRing\.(?:Transparency|CFrame|Color|Size)\s*=/,'obsolete solid cylinder range must stay removed');
  assert.match(battle,/FX\.projectile\(ball, nc, style\)/,'the existing cannon routine gets culture-stage trails');
  assert.doesNotMatch(battle,/local boom = part\(folder|local flash = part\(folder/,'cartoon light balls must not mask cannon bursts');
  assert.match(battle,/function FX\.flame\(pos, scale, profile\)[\s\S]*?FX\.burst\(/,'sinking flames use profile-based particles');

  assert.match(battle,/trail\.Attachment0, trail\.Attachment1 = a0, a1/,'trajectory has a continuous trail');
  assert.match(battle,/local bpos = from:Lerp\(to, u\) \+ Vector3\.new\(0, math\.sin\(u \* math\.pi\) \* nc\.arc, 0\)/,'actual ballistic arc remains consistent');
  assert.doesNotMatch(battle,/shadow\.CFrame/,'removed fake water shadow does not obstruct projectile');
  assert.match(battle,/function FX\.shipFire\(sh, key, hp, now\)/,'ship damage keeps attached flames/smoke');
  assert.match(battle,/vent\.Position = root\.CFrame:PointToObjectSpace\(origin\)/,'damage fire follows actual moving ships');
  assert.match(battle,/vent\.fire\.Rate = if hp < 0\.42/,'fire intensity must reflect the unchanged hull fraction');
  assert.match(battle,/vent\.fire\.Enabled = vent\.fire\.Rate > 0/,'damage-driven fire emitter must actually ignite');
  assert.match(battle,/vent\.soot\.Enabled = vent\.soot\.Rate > 0/,'damage smoke must actually turn on');
  assert.doesNotMatch(battle,/FX\.boardingCrewSpawned = true/,'real boarding must not spawn floating R15 character puppets');
  assert.match(battle,/if opts\.card then\s+task\.spawn\(function\(\)/,'card-only battle keeps its original crew actors');
  assert.match(battle,/for i = 1, \(if MOBILE_VFX then 2 else 4\) do/,'card-only mobile crew remains bounded');
  assert.match(battle,/function FX\.boarding\(\)/);
  assert.match(battle,/FX\.boardZoom \+=/,'boarding cinematic transitions smoothly');
  assert.match(battle,/cam\.FieldOfView = \(if MOBILE_VFX then 73 else 75\) - kick \* 0\.6 \+ math\.min\(shake, 2\.5\) \* 2 \+ \(me\.speed \/ myTop\) \* 5 \+ killZoom - FX\.boardZoom \* \(17 \+ math\.clamp\(me\.fx\.stage or 2, 1, 6\) \* 0\.6\)/,'boarding zoom stays tier-scaled while mobile and desktop preserve independent camera limits');
  assert.match(battle,/for i = 1, \(if MOBILE_VFX then 1 elseif stage <= 2 then 1 elseif stage <= 4 then 2 else 3\) do/,'mobile deck fires stay capped and desktop ship tiers scale');
  assert.match(battle,/if MOBILE_VFX then 28 else 40/,'mobile range outline has bounded parts');
  assert.match(battle,/local inRange = d < cannon\.range/,'live gun-fire range is unchanged');
  assert.match(battle,/rtDamage\(false, base \* acc\)/,'existing damage authority is unchanged');
  assert.match(battle,/local r2 = Combat\.board\(fa, fb, seed\)/,'boarding resolution is unchanged');
});

// [해상전투 8가지 수정] 조향·상단폰트·실제 포각·레이더·해안·백병전·선저·대형 이펙트를 보존한다.
test('Mare naval steering, smooth hulls, aiming and battle presentation stay consistent', () => {
  const base='roblox-games/mare-essentia/';
  const battle=fs.readFileSync(base+'src/ReplicatedStorage/Shared/NavalBattle.luau','utf8');
  const hull=fs.readFileSync('tools/mare-essentia-ship-v5.py','utf8');
  const assetIds=fs.readFileSync(base+'src/ReplicatedStorage/Shared/AssetIds.luau','utf8');
  // 스틱 +X, 키보드 D는 우현. 좌측 -X, A는 좌현. 중앙 데드존은 그대로.
  assert.ok(battle.includes('steerDir = if math.abs(nx) < 0.12 then 0 else nx'));
  assert.ok(battle.includes('steerDir = -1 -- [좌현 조향]'));
  assert.ok(battle.includes('elseif i.KeyCode == Enum.KeyCode.D or i.KeyCode == Enum.KeyCode.Right then\n\t\t\tsteerDir = 1'));
  assert.ok(battle.includes('me.theta += steerDir * turnSign * (if now < skillUntil.evade then 2.6 else 1.5) * dt'));
  assert.ok(battle.includes('local turnSign = if rightTurn:Dot(cam.CFrame.RightVector) < -0.05 then -1 else 1'));
  assert.match(battle,/l\.TextStrokeTransparency = 1 -- \[해전 글씨\]/,'main text is clean; tiny contextual combat badges can retain contrast outlines');
  assert.ok(battle.includes('f.Visible = star or battleViewport.X >= 720'));
  assert.ok(battle.includes('skip = mkBtn("건너뛰기", UDim2.new(0, 12, 0, 119)'));
  assert.ok(battle.includes('local coasts = {'));
  for(const id of ['cliff-rock','tropical-palm-tall','ruins-pillar-decorated','north-pine-fall','egypt-obelisk']){
    assert.ok(assetIds.includes('"Terrain/'+id+'"'),'battle coast must use a registered mesh: '+id);
  }
  assert.ok(battle.includes('AssetIds["Terrain/" .. spec[1]]'));
  assert.ok(battle.includes('node.CanCollide, node.CanTouch, node.CanQuery = false, false, false'));
  assert.ok(battle.includes('local aimAngle = if dd > 0.1 then math.deg(math.acos'));
  assert.ok(battle.includes('local sideDeviation = math.floor(math.abs(90 - aimAngle) + 0.5)'));
  assert.ok(battle.includes('local aligned = broadside > 0.5'),'gun-angle display cannot redefine existing fire rule');
  assert.ok(battle.includes('local scanAngle = (now * 2.45) % tau'));
  assert.ok(battle.includes('sweep.Width0, sweep.Width1 = 0.035'));
  assert.ok(battle.includes('if trailAngle < 1.45'));
  assert.ok(battle.includes('nextSmoke = now + 0.18'));
  assert.ok(battle.includes('n = if MOBILE_VFX then 5 else 11'));
  assert.ok(battle.includes('s0 = 3.8 + k * 2, s1 = 11 + k * 9'),'sinking smoke scales with progress but avoids obscuring the hull');
  assert.ok(battle.includes('FX.flame(ORIGIN + sunk.pos + Vector3.new(0, 6 - k * 8, 0), 4.8, sunk.fx)'));
  assert.ok(battle.includes('Sfx.play("sfx_naval_splash"'));
  assert.ok(battle.includes('Sfx.play("sfx_naval_wood"'));
  assert.ok(battle.includes('local realHulls = if string.find(asset'));
  assert.ok(hull.includes('def hull_cross(self,q,level):'));
  assert.ok(hull.includes("if self.form in ('flat','turtle','war')"));
  assert.ok(hull.includes("elif self.form in ('deep','tall','battleship')"));
  assert.ok(hull.includes("elif self.form in ('slim','low','outrigger')"));
  assert.ok(hull.includes('N=36 if self.mobile else 56'),'mobile ships keep actual curved longitudinal hull sections');
  // 선측 기준 60° 이내, 사거리 1배 유지. 실제 피해량은 원래 서버 계산 담당.
  const aligned=(heading,target)=>Math.abs(Math.sin(target-heading))>0.5;
  assert.equal(aligned(0,Math.PI/2),true);
  assert.equal(aligned(0,Math.PI/2+0.7),true);
  assert.equal(aligned(0,0),false);
  assert.equal(aligned(0,Math.PI),false);
});

// [해전 화면 검증] 기존 해전 코드의 화면 방향 조향·8개 해역·폰 UI·포각·탐지광·침몰 효과와 규칙 불변을 검증한다.
test('Mare naval steering, sixteen regional coasts, dynamic weather, mobile HUD, aiming and radar share one battle flow', () => {
  const src=fs.readFileSync('roblox-games/mare-essentia/src/ReplicatedStorage/Shared/NavalBattle.luau','utf8');
  assert.match(src,/steerDir = if math\.abs\(nx\) < 0\.12 then 0 else nx/);
  assert.match(src,/local turnSign = if rightTurn:Dot\(cam\.CFrame\.RightVector\) < -0\.05 then -1 else 1/);
  assert.match(src,/me\.theta \+= steerDir \* turnSign \*/);
  assert.match(src,/adviceLine\.Visible = battleViewport\.X >= 1000/);
  assert.match(src,/if battleViewport\.X < 720 then 173 else 122/);
  assert.match(src,/tactic\.Size = UDim2\.new\(if battleViewport\.X < 480 then 0\.52/);
  assert.match(src,/l\.TextStrokeTransparency = 1/);
  for(const key of ['east-bamboo-grove','greek-ruins-a','haunted-pine-crooked','cliff-waterfall-rock']){
    assert.ok(src.includes('"'+key+'",'),key+' has a registered-region background binding');
  }
  // [16해역 회귀] 지역 풀을 유지하고 시간·날씨·모바일 예산은 전투 판정과 분리한다.
  const sceneIds=[...src.matchAll(/\{ id="([a-z_]+)", name="[^"]+", water=Color3\.fromRGB/g)].map(m=>m[1]);
  assert.deepEqual(sceneIds,[
    'caribbean','atlantic_storm','mediterranean','japan','china','indian_monsoon','north_sea','arctic',
    'cape','volcanic','tropical','ghost','harbor','strait','gold_coast','moonlight'
  ]);
  assert.match(src,/local coastIndex = regions\[sceneSeed % #regions \+ 1\]/);
  assert.match(src,/folder:SetAttribute\("NavalEnvironmentCount", #coasts\)/);
  assert.match(src,/folder:SetAttribute\("NavalTimePhase", phase\)/);
  assert.match(src,/folder:SetAttribute\("NavalWeatherMode", mode\)/);
  assert.match(src,/local portLat, portLon = tonumber\(opts\.portLat\), tonumber\(opts\.portLon\)/);
  assert.match(src,/for i = 1, \(if MOBILE_VFX then 12 else 20\) do/,'foam attachments remain bounded on mobile and desktop');
  assert.match(src,/if MOBILE_VFX and index > 3 then break end/,'mobile shore models retain the three-object cap');
  assert.match(src,/folder\.Destroying:Connect\(function\(\)[\s\S]*?colorGrade:Destroy\(\)/);
  const client=fs.readFileSync('roblox-games/mare-essentia/src/StarterPlayer/Game.client.luau','utf8');
  assert.match(client,/portLat = view\.player and PortData\.Ports\[view\.player\.portId\]/);
  assert.match(client,/portLon = view\.player and PortData\.Ports\[view\.player\.portId\]/);
  assert.match(src,/local steerCue = \(if turnNeeded >= 0 then "우로 " else "좌로 "\)/);
  assert.match(src,/\) \.\. "°"/, "aim cue string literal must be closed");
  assert.match(src,/local scanAngle = \(now \* 2\.45\) % tau/);
  assert.match(src,/if trailAngle < 1\.45/);
  assert.match(src,/s0 = scale \* 1\.95/);
  assert.match(src,/s1 = 10\.0 \+ stage \* 1\.15/);
  assert.match(src,/if inRange and side > 0\.5 and now >= nextMeFire then/);
  assert.match(src,/local r2 = Combat\.board\(fa, fb, seed\)/);
  assert.doesNotMatch(src,/FX\.boardingCrewSpawned = true/);
});

// [모바일 해전 안전 영역·카드 습득] 스튜디오 실제 화면 검사의 별도 전제조건을 정적 좌표·코드로 검증한다.
test('Mare naval touch controls avoid HUD overlap and card acquisition never forces a modal reveal',()=>{
  const root='roblox-games/mare-essentia/src/';
  const battle=fs.readFileSync(root+'ReplicatedStorage/Shared/NavalBattle.luau','utf8');
  const game=fs.readFileSync(root+'StarterPlayer/Game.client.luau','utf8');
  for(const token of [
    'local skip = mkBtn("건너뛰기", UDim2.new(0, 12, 0, 119)',
    'if battleViewport.X < 480 then 56 else 96',
    'sailLabel.Position = UDim2.new(0.5, 0, 0, if battleViewport.X < 480 then 69 else 44)',
    'f.Visible = star or battleViewport.X >= 720',
    'comboLabel.Visible = not opts.cardOnly',
    'subtitle.Visible = opts.cardOnly or battleViewport.X >= 1000',
    'rangeLabel.Visible = battleViewport.X >= 720',
    'distLabel.Visible = not opts.cardOnly and battleViewport.X >= 720',
    'if i == 1 then -250 else -170',
    'local panel = Instance.new("ScrollingFrame")',
    'panel.CanvasSize = UDim2.fromOffset(0, entriesHeight)',
    'panel.Visible = battleViewport.Y >= 380 and (battleViewport.X >= 720 or battleViewport.Y >= 520)',
    'math.min(entriesHeight, availableHeight)',
    'reloadBack.Visible = not opts.cardOnly and (battleViewport.X >= 720',
    'string.format("장전 %.1f초", math.max(0, nextMeFire - now))',
  ]) assert.ok(battle.includes(token),'missing mobile-safe naval HUD binding: '+token);
  const intersects=(a,b)=>a.x<b.x+b.w && b.x<a.x+a.w && a.y<b.y+b.h && b.y<a.y+a.h;
  // [휴대전화 세로] 320~430폭에서 왼쪽 스틱, 2개 기술, 가속·건너뛰기가 서로 터치하지 않는다.
  for(const [w,h] of [[320,640],[360,640],[390,844],[430,932]]){
    const stick={x:28,y:h-198,w:170,h:170};
    const speed={x:w-120,y:h-120,w:96,h:96};
    const skill1={x:w-107,y:h-285,w:70,h:70};
    const skill2={x:w-107,y:h-205,w:70,h:70};
    const skip={x:12,y:119,w:56,h:36};
    const tactic={x:w*.24,y:119,w:w*.52,h:46};
    const fleetLeft={x:16,y:66,w:96,h:46},fleetRight={x:w-112,y:66,w:96,h:46};
    const wind={x:(w-Math.max(80,w-240))/2,y:69,w:Math.max(80,w-240),h:20};
    const reload={x:(w-Math.min(260,w-40))/2,y:h-315,w:Math.min(260,w-40),h:20};
    const panelHeight=Math.min(24+4*30,Math.max(34,h-520));
    const cardPanel={x:w-182,y:173,w:166,h:panelHeight};
    for(const [left,right] of [[stick,speed],[stick,skill1],[stick,skill2],[speed,skill1],[speed,skill2],[skill1,skill2],[skip,tactic],[wind,fleetLeft],[wind,fleetRight],[reload,stick],[reload,skill1],[reload,skill2],[reload,cardPanel]]){
      assert.equal(intersects(left,right),false,'phone HUD overlap at '+w+'x'+h+': '+JSON.stringify([left,right]));
    }
  }
  const seenStart=game.indexOf('function H.checkNewCards()');
  const seenEnd=game.indexOf('\nlocal function tierRows(',seenStart);
  const discovered=game.slice(seenStart,seenEnd);
  assert.ok(seenStart>0 && seenEnd>seenStart);
  assert.match(discovered,/H\.seenCards\[c\.id\] = true/,'real codex discovery bookkeeping remains');
  assert.match(discovered,/local firstSnapshot = H\.seenCards == nil/,'reconnect preserves existing found-card baseline');
  assert.match(discovered,/H\.showCardGain\(found\.card, found\.extra\)/,'only genuine new discovery starts UI reveal');
  assert.match(discovered,/H\.cardGainQueue = H\.cardGainQueue or \{\}/,'multiple simultaneous gains are queued without modal scenes');
  assert.match(discovered,/extra = #acquired - 1/,'one reveal summarizes same-response additional cards');
  assert.match(game,/g:SetAttribute\("NonBlockingCardNotice", true\)/,'card reveal is cosmetic and nonblocking');
  assert.match(game,/H\.dockButtons and H\.dockButtons\.codex/,'card shrinks to real library dock icon');
  assert.match(game,/Name = "CardSparkle"/,'rarity-colored sparkles');
  assert.match(game,/Name = "DiscoveryHalo"/,'card acquisition light rings');
  assert.match(game,/local previous = pg:FindFirstChild\("CardGain"\)/,'Studio card preview remains opt-in');
  assert.doesNotMatch(game,/새 지식 카드 발견!|TweenInfo\.new\(20, Enum\.EasingStyle\.Sine\)/,'dated reveal and 14%-zoomed blurry illustration removed');
  assert.match(game,/local portraitWidth = math\.min\(256,/,'low-res portrait atlas must not be upscaled to 330px');
  assert.match(game,/bg\.Size = UDim2\.fromScale\(1, 1\)/,'event art must not be magnified beyond display area');
});

// [7대륙 36척] 실물 자산·단계별 효과·구매/서버 판정 보호 회귀 검사.
test('Mare registered 36 ship models have seven regional battle signatures and six visual tiers', () => {
  const root='roblox-games/mare-essentia';
  const shipFile=fs.readFileSync(root+'/src/ReplicatedStorage/Shared/Ships.luau','utf8');
  const battle=fs.readFileSync(root+'/src/ReplicatedStorage/Shared/NavalBattle.luau','utf8');
  const client=fs.readFileSync(root+'/src/StarterPlayer/Game.client.luau','utf8');
  const ids=fs.readFileSync(root+'/src/ReplicatedStorage/Shared/AssetIds.luau','utf8');
  const ledger=JSON.parse(fs.readFileSync(root+'/assets-registered.json','utf8'));
  const plans=[...shipFile.matchAll(/\{ id="([a-z_]+)", name="[^"]+", faction="([a-z_]+)", stage=(\d+)/g)]
    .map(m=>({id:m[1],faction:m[2],stage:Number(m[3])}));
  assert.equal(plans.length,36,'36 independent blueprint entries');
  const groups={};
  for(const plan of plans){
    groups[plan.faction]=(groups[plan.faction]||0)+1;
    assert.ok(plan.stage>=1&&plan.stage<=6,plan.id+' visual stage must be within 1-6');
    for(const suffix of ['-v5','-v5-mobile']){
      const key='Naval/'+plan.id+suffix;
      assert.ok(ledger.assets[key]?.assetId,key+' must have a real registered asset ID');
      assert.equal(ledger.assets[key]?.usePermissionGranted,true,key+' must have universe use permission');
      assert.ok(ids.includes('["'+key+'"] = '+ledger.assets[key].assetId),key+' must bind to active AssetIds');
    }
  }
  assert.deepEqual(groups,{europe:5,east_asia:5,new_world:5,middle_east:5,southeast_asia:5,africa:5,lost:6});
  for(const faction of Object.keys(groups)){
    assert.ok(battle.includes(faction+' = { flash = Color3.fromRGB'),'distinct VFX theme required for '+faction);
  }
  assert.match(battle,/FX_PROFILES\[blueprint\.id\] = style/,'blueprint id drives visual profile');
  assert.match(battle,/blueprint\.existingId and not FX_PROFILES\[blueprint\.existingId\]/,'legacy save id is preserved');
  assert.match(battle,/AssetIds\["Naval\/" \.\. shipId \.\. "-v5"\]/,'only registered V5 IDs can select combat models');
  assert.match(battle,/if MOBILE_VFX and AssetIds\["Naval\/" \.\. light\] then light/,'touch devices prefer registered light model');
  assert.match(battle,/FX\.muzzle\(from, \(to - from\)\.Unit, style, nc\)/,'existing cannon profile is passed to visual effect');
  assert.match(battle,/FX\.impact\(to, nc\.ball, style, nc\)/,'impact uses current weapon profile');
  assert.match(battle,/FX\.splash\(to, style, nc\.ball\)/);
  assert.match(battle,/FX\.flame\(ORIGIN \+ sunk\.pos \+ Vector3\.new\(0, 6 - k \* 8, 0\), 4\.8, sunk\.fx\)/);
  assert.match(battle,/function FX\.waterColumn\(pos, profile, power\)/);
  assert.match(battle,/function FX\.shipFire\(sh, key, hp, now\)/);
  assert.match(battle,/for i = 1, \(if MOBILE_VFX then 1 elseif stage <= 2 then 1 elseif stage <= 4 then 2 else 3\) do/);
  assert.match(battle,/local density = if MOBILE_VFX then 0\.56 else 1/,'mobile cannon particle budget stays below desktop');
  assert.match(battle,/local density = if MOBILE_VFX then 0\.5 else 1/,'secondary mobile particle budget remains at half desktop');
  assert.match(battle,/FX\.wake\(me, "me", now\)/,'existing wake loop remains in place');
  assert.match(battle,/local inRange = d < cannon\.range/,'live gun range remains untouched');
  assert.match(battle,/rtDamage\(false, base \* acc\)/,'actual damage computation remains untouched');
  assert.match(battle,/local r2 = Combat\.board\(fa, fb, seed\)/,'boarding resolution remains unchanged');
  assert.match(client,/string\.format\("7대륙 선박 %d종 · 3D 원본 설계", #ShipsData\.Blueprints\)/);
  assert.doesNotMatch(client,/선박 35종|미지의 땅 2~6단계/);
  assert.match(client,/if shop then \(if shop.owned then "현재 기함" elseif shop.locked then shop.locked else "이 조선소에서 구매 가능"\)/,'regional shop preserves owned and locked states');
  assert.match(client,/if hasFull and hasMobile then "원본·모바일 경량판 등록"/);
});

// [7대륙 36척 운용 검증] 기존 구매·저장·서버 계산 경로에만 특성을 적용한다.
test('Mare all 36 designed ships have 23 new region-locked purchases and server-owned specialties', () => {
  const root='roblox-games/mare-essentia/src';
  const read=(path)=>fs.readFileSync(root+'/'+path,'utf8');
  const ships=read('ReplicatedStorage/Shared/Ships.luau');
  const portData=read('ReplicatedStorage/Shared/Ports.luau');
  const voyage=read('ReplicatedStorage/Shared/Voyage.luau');
  const state=read('ServerScriptService/Services/State.luau');
  const sail=read('ServerScriptService/Services/Sailing.luau');
  const yard=read('ServerScriptService/Services/Shipyard.luau');
  const view=read('ServerScriptService/Services/View.luau');
  const trade=read('ServerScriptService/Services/Trade.luau');
  const battle=read('ServerScriptService/Services/Battle.luau');
  const ui=read('StarterPlayer/Game.client.luau');
  const blueprints=[...ships.matchAll(/\{ id="([a-z_]+)", name="[^"]+", faction="([a-z_]+)", stage=(\d+)/g)]
    .map(m=>({id:m[1],faction:m[2],stage:Number(m[3])}));
  assert.equal(blueprints.length,36,'6 historical regions of five + fantasy region of six');
  const performance=ships.split('local ShipPerformance = {')[1]?.split('\n}\n-- [신규 23척')[0];
  const statRows=ships.split('local NewShipStats = {')[1]?.split('\n}\nlocal BlueprintSaleRegions')[0];
  assert.ok(performance && statRows,'ship stats and traits must be in the canonical Ships module');
  const traits=[...performance.matchAll(/^\s*([a-z_]+) = \{ role = "([^"]+)", weak = "([^"]+)", ([^\n]+) \},\s*$/gm)];
  const newer=[...statRows.matchAll(/^\s*([a-z_]+) = \{ class = (\d+), price = (\d+), cargo = (\d+), speed = (\d+), hull = (\d+), cannons = (\d+), crew = (\d+)(?:, rowed = true)? \},\s*$/gm)];
  assert.equal(traits.length,36,'every licensed blueprint has one independently authored role');
  assert.equal(newer.length,23,'only the previously unavailable 23 ships are newly purchasable');
  assert.equal(new Set(traits.map(x=>x[1])).size,36,'do not duplicate trait keys');
  assert.equal(new Set(newer.map(x=>x[1])).size,23,'do not duplicate ship IDs');
  for(const p of blueprints){
    const trait=traits.find(x=>x[1]===p.id);
    assert.ok(trait,p.id+' must have a distinct role');
    for(const m of trait[4].matchAll(/([a-z]+) = (-?[\d.]+)/g)){
      assert.ok(Math.abs(Number(m[2]))<=0.16,p.id+' '+m[1]+' effect must be balance-capped');
    }
    assert.ok(p.stage>=1&&p.stage<=6,p.id+' legal design stage');
  }
  for(const row of newer){
    assert.ok(blueprints.some(x=>x.id===row[1]),row[1]+' has registered blueprint');
    assert.ok(Number(row[2])>=1 && Number(row[2])<=4,'existing license stage bound');
    for(const i of [3,4,5,6,7,8]) assert.ok(Number(row[i])>0,row[1]+' requires positive ship stats');
  }
  assert.match(ships,/for _, blueprint in Blueprints do[\s\S]*?if not Ships\[blueprint\.id\] then/,'existing ship stats remain authoritative');
  assert.match(ships,/newRegional = true/,'new models can be filtered to their home region');
  assert.match(ships,/minAdventure = if blueprint\.faction == "lost" then 6 \+ blueprint\.stage \* 4 else nil/,'lost ships require established adventure progression');
  assert.match(ships,/specialPort = if blueprint\.faction == "lost" then "honolulu" else nil/);
  assert.match(portData,/honolulu = \{[\s\S]*?shipyard = true/,'the rare ship dealer must be reachable');
  assert.match(ships,/if def\.specialPort and def\.specialPort ~= portId then/,'special location check is server-owned');
  assert.match(ships,/if def\.minAdventure and \(adventureLevel or 0\) < def\.minAdventure then/,'progression check is server-owned');
  assert.match(yard,/local block = D\.Ships\.saleBlock\(def,[\s\S]*?state\.portId, state\.careers\.adventure\.level\)/,'flagship purchase validates the region server side');
  assert.match(yard,/local fblock = D\.Ships\.saleBlock\(def,[\s\S]*?state\.portId, state\.careers\.adventure\.level\)/,'fleet purchase validates the region server side');
  assert.match(view,/local culture = D\.CultureRegions\.ofPort/);
  assert.match(view,/if localShip then/,'worldwide catalog must not overwhelm mobile');
  assert.match(view,/trait = s\.trait, newRegional = s\.newRegional/);
  assert.match(state,/local roleCargo = def\.cargo \* \(1 \+ \(if def\.trait then def\.trait\.cargo or 0 else 0\)\)/,'cargo capacity uses existing fleet and tech stack');
  assert.match(voyage,/supplyFactor: number\?/);
  assert.match(sail,/local speedBonus = \(trait\.sail or 0\) \+ \(if dist >= 2000 then trait\.long or 0 else 0\)/);
  assert.match(sail,/local need = math\.max\(1, math\.ceil\(D\.Voyage\.suppliesPerDay/,'supply costs use original days and crew');
  assert.match(sail,/trait\.storm or 0/,'storm damage receives weather specialization');
  assert.match(sail,/trait\.shallow or 0/,'shallow hulls reduce reef injury only');
  assert.match(sail,/trait\.cargoGuard or 0/,'sealed cargo holds reduce rat spoilage');
  assert.match(sail,/trait\.evade or 0/,'pirate evasion stays inside existing server voyage');
  assert.match(sail,/shipTrait\.explore or 0/,'exploration career retains original XP rules');
  assert.match(trade,/base \* \(1 - \(trait\.tariff or 0\)\)/,'sale percentage is unchanged; only foreign tariffs are reduced');
  assert.match(read('ReplicatedStorage/Shared/TradeMath.luau'),/MAX_SELL_RATE = 0\.95/,'same-port buy-sell abuse stays blocked');
  assert.match(battle,/sup\.cannonMult \+ \(trait\.cannon or 0\)/);
  assert.match(battle,/sup\.meleeMult \+ \(trait\.melee or 0\)/);
  assert.match(battle,/local trait = def\.trait or \{\}/,'server fighter is authoritative');
  assert.match(yard,/local repairMult = 1 \+ \(if def\.trait then def\.trait\.repair or 0 else 0\)/);
  assert.match(view,/view\.shipyard\.repairTotal = math\.floor/,'repair preview and server share the same cost multiplier');
  assert.match(ui,/36척 모두 3D 원본·개별 항해·교역·전투 성능 적용/);
  assert.match(ui,/주특화: %s\\n약점: %s/,'ship roles and weaknesses remain visible on separate mobile-readable lines');

  assert.match(ui,/onClick = function\(\) call\("BuyShip", \{ shipId = shop\.id \}\) end/,'blueprint cards must call the existing server purchase route');
  assert.match(ui,/not shop\.owned and not shop\.locked and shop\.canCarry and shop\.netCost <= view\.player\.coins/,'mobile direct purchase keeps funds, cargo and unlock gates');
  assert.match(ui,/if not shop\.canCarry then info \.\.= "\\n화물을 먼저 내려야 구매 가능"/,'cargo overflow warning stays visible');

  assert.match(state,/ship = state\.ship,/,'existing persistence keeps the same ship keys');
  assert.match(ships,/caravel = \{[\s\S]*?cargo = 20, speed = 7, hull = 100, cannons = 4, crew = 20/,'starter caravel values unchanged');
});

test('Mare standalone card duel board respects four rendered rows, zoom and approved image gating', () => {
  const source=fs.readFileSync('roblox-games/mare-essentia/src/ReplicatedStorage/Shared/NavalBattle.luau','utf8');
  const uploader=fs.readFileSync('tools/mare-essentia-upload-assets.mjs','utf8');
  const readme=fs.readFileSync('roblox-games/mare-essentia/assets/cardart/src/README.md','utf8');
  assert.match(source,/AssetIds\["CardArt\/battle_board"\] then "CardArt\/battle_board" else "CardArt\/event_chart_world"/);
  assert.match(source,/boardArt.Name = "NavalCardBattleBoard"/);
  assert.match(source,/boardArt.ScaleType = Enum.ScaleType.Crop/);
  assert.match(source,/boardArt.ImageTransparency = if opts.cardOnly then 0\.9 elseif cfg then 0\.64/);
  assert.match(source,/elseif boardArtKey == "CardArt\/battle_board" then 0\.07 else 0\.58/);
  assert.match(source,/boardWash.Name = "BattleBoardContrast"/);
  assert.match(source,/boardShade.Parent = boardWash/);
  assert.match(source,/handTray.Name = "NavalCardHandTray"/);
    // 카드 전용 화면·일반 해전의 좌표를 둘 다 유지하는지 검사한다.
  assert.match(source,/handFrame.Position = UDim2.fromScale\(if opts\.cardOnly then 0\.215 else 0\.02, if opts\.cardOnly then 0\.665 else 0\.72\)/);
  assert.match(source,/boardFrame.Position = UDim2.fromScale\(if opts\.cardOnly then 0\.21 else 0\.2, if opts\.cardOnly then 0\.13 else 0\.14\)/);
  assert.match(source,/boardFrame.Size = UDim2.fromScale\(if opts\.cardOnly then 0\.57 else 0\.78, if opts\.cardOnly then 0\.52 else 0\.56\)/);
  assert.match(source,/local order = \{ \{ "foe", "ranged" \}, \{ "foe", "melee" \}, \{ "me", "melee" \}, \{ "me", "ranged" \} \}/);
  assert.match(source,/laneAccent.Name = "SideLaneAccent"/);
  assert.match(source,/laneStroke.Thickness = 1/);
  assert.match(source,/BC.rowMatchup\(m, side, row\)/);
  assert.match(source,/BC.play\(m, "me", i\)/);
  assert.match(source,/focusFrame.Size = UDim2.fromOffset\(math.floor\(height \* 0\.69\), height\)/);
  assert.equal(source.split('RunService.RenderStepped:Connect(').length-1,1,'reuse existing render loop');
  // 검증 등록된 개별 카드만 우선, 미등록 카드는 승인된 기존 그림을 유지한다.
  assert.match(source,/local individualArt = "CardArt\/" \.\. card\.id/);
  assert.match(source,/if AssetIds\[individualArt\] then return individualArt end/);
  assert.match(source,/if spec\.newArt and AssetIds\[spec\.newArt\] then return spec\.newArt end/);
  // [카드 식별 회귀] 손패뿐 아니라 확대·전투판에서도 지역/분류를 유지한다.
  assert.ok(source.includes('focusEdge.Color = if regionDeck then regionDeck.color else brass'));
  assert.ok(source.includes('focusRule.Text = category .. row .. strength'));
  assert.ok(source.includes('frameEdge(f, if c.hero then Color3.fromRGB(246, 209, 120) elseif regionDeck then regionDeck.color else brass, 4)'));
  assert.match(source,/origin\.Name = "CardDeckOrigin"/);
  assert.match(source,/CARD_DECK\[regionId\]/);
  assert.match(source,/frameEdge\(art, if c\.hero then .* elseif regionDeck then regionDeck\.color/);
  // [이미 낸 카드 확대] 터치로 지역·분류·원화를 읽되 전투 카드 재사용은 막는다.
  assert.ok(source.includes('local playedCard = chip(cards, c, 62, BC.cardPower(m, side, row, idx)'));
  assert.ok(source.includes('playedCard.Activated:Connect(function()'));
  assert.ok(source.includes('showCardCodex(c, true)'),'played card must open read-only zoom');
  assert.ok(source.includes('focusUse.Visible = not readOnly'),'played card must not be playable again');
  assert.ok(source.includes('if selectedPlay then selectedPlay() else closeCardCodex() end'),'read-only art tap must close');
  assert.ok(source.includes('local f = Instance.new("TextButton")'),'deployed card supports touch activation');
  const playedStart=source.indexOf('playedCard.Activated:Connect(function()');
  const playedEnd=source.indexOf('\n\t\t\t\t\tend)',playedStart);
  assert.ok(playedEnd>playedStart && playedEnd-playedStart<500);
  assert.doesNotMatch(source.slice(playedStart,playedEnd),/BC\.play\(|afterAction\(|playChosenCard/);
  for(const region of ['eu','ea','me','nw','af'])assert.ok(source.includes(`\t${region} = { ko = `),region+' region origin');
  assert.match(uploader,/event_\[a-z_\]\+\|battle_board\)\\\.jpg/);
  assert.match(uploader,/if \(approvedImages\[id\] !== hash\)/,'image SHA gate remains required');
  assert.match(readme,/GitHub에 실제 JPG 바이너리 미업로드/);
  assert.match(readme,/1536×864/);
});

test('Mare 150 regional card illustrations remain source complete and SHA-approved before Roblox registration', () => {
  const root='roblox-games/mare-essentia/';
  const manifest=JSON.parse(fs.readFileSync(root+'assets/cardart/region-art.json','utf8'));
  const uploader=fs.readFileSync('tools/mare-essentia-upload-assets.mjs','utf8');
  assert.equal(manifest.count,150);
  assert.equal(manifest.cards.length,150);
  assert.equal(new Set(manifest.cards.map(c=>c.id)).size,150);
  assert.equal(manifest.license,'PROJECT_ORIGINAL_ART');
  for(const prefix of ['eu','ea','me','nw','af']){
    const names=manifest.cards.filter(c=>c.id.startsWith(prefix+'_')).map(c=>c.id);
    assert.deepEqual(names,Array.from({length:30},(_,i)=>prefix+'_'+String(i+1).padStart(2,'0')));
    for(const name of names){
      const art=fs.readFileSync(root+'assets/cardart/src/'+name+'.svg','utf8');
      assert.match(art,/<svg\b/,'missing SVG '+name);
      assert.match(art,/<title>/,'missing art subject '+name);
    }
  }
  // [기존 정식 등록기] 5개 덱의 원본 PNG만 받고 미승인 해시·차단 이미지·권한 미확인은 거절한다.
  assert.ok(uploader.includes("['event_title_ship.png', 'event_title_parchment.png']"));
  assert.ok(uploader.includes('(?:eu|ea|me|nw|af)_(?:0[1-9]|[12][0-9]|30)\\.png'));
  assert.ok(uploader.includes("const regionalCardArt = item.kind === 'CardArt'"));
  assert.ok(uploader.includes("approvedImages[id] !== sourceSha256"));
  assert.ok(uploader.includes("REGIONAL_CARD_ART_NOT_APPROVED"));
  assert.ok(uploader.includes("REGIONAL_CARD_ART_APPROVED_SOURCE_CHANGED_REUPLOAD"));
  assert.ok(uploader.includes("blockedHashes.has(sourceSha256)"));
  assert.ok(uploader.includes("previousTypeAssets.set(id, {...old})"));
  assert.ok(uploader.includes("registry.assets[id].sourceSha256 = sourceSha256"));
  assert.ok(uploader.includes("usePermissionGranted !== true"));
  const cardArt=fs.readFileSync(root+'src/ReplicatedStorage/Shared/CardArt.luau','utf8');
  assert.ok(cardArt.includes('local originalRegional = (region == "eu"'));
  assert.ok(cardArt.includes('Mare Essentia 자체 제작 5대륙 카드 원화'));
  assert.ok(cardArt.includes('elseif originalRegional then "PROJECT_ORIGINAL_ART"'));
  assert.ok(cardArt.includes('if c then c.license'),'existing external credit must take priority');
});


test('Mare generated original art is promoted only after model-source visual QA and exact SHA approval', async () => {
  const uploader = fs.readFileSync('tools/mare-essentia-upload-assets.mjs', 'utf8');
  const workflow = fs.readFileSync('.github/workflows/owner-mare-essentia-assets.yml', 'utf8');
  const approved = JSON.parse(fs.readFileSync('roblox-games/mare-essentia/assets/APPROVED_IMAGES.json', 'utf8'));
  assert.ok(approved.modelOriginals && !Array.isArray(approved.modelOriginals));
  assert.match(uploader, /MODEL_ORIGINAL_REVIEW_REQUIRED/);
  assert.match(uploader, /MODEL_ORIGINAL_EXISTING_CARD_PRESERVED/);
  assert.match(workflow, /SKIP_UNVERIFIED_MODEL_ORIGINAL/);
  assert.match(workflow, /assets\/cardart\/\*\.png/);
  const marker = '// [모델 원화 제작 분리·자동 인입]';
  const start = uploader.indexOf(marker), end = uploader.indexOf('// 2026-11-11', start);
  assert.ok(start > 0 && end > start);
  const intake = uploader.slice(start, end);
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mare-model-original-'));
  try {
    const id = 'CardArt/nw_03';
    const source = path.join(root, 'assets/cardart/src/nw_03-original.png');
    const dest = path.join(root, 'assets/cardart/nw_03.png');
    fs.mkdirSync(path.dirname(source), {recursive:true});
    fs.copyFileSync('roblox-games/mare-essentia/assets/cardart/nw_03.png', source);
    const hash = createHash('sha256').update(fs.readFileSync(source)).digest('hex');
    const review = {sourceType:'IMAGE_GENERATION_MODEL', sourceFile:'assets/cardart/src/nw_03-original.png',
      sourceSha256:hash, reviewer:'VIBE_AGENT_VISUAL_REVIEW', reviewedAt:'2026-11-16',
      license:'PROJECT_ORIGINAL_ART', subjectMatch:true, historicalContext:true,
      houseStyle:true, singleFinishedScene:true, noPartsOrSprites:true,
      robloxSafety:true, commercialRights:true};
    const record = {approved:{[id]:hash},modelOriginals:{[id]:review}};
    const save = () => fs.writeFileSync(path.join(root,'assets/APPROVED_IMAGES.json'),JSON.stringify(record));
    const execute = () => runInNewContext('(async()=>{' + intake + '\n})()', {
      ROOT:root,fs:fs.promises,path,crypto:{createHash},Buffer,
      studioRegrantPath:'',blockedHashes:new Set(),blockedPaths:new Set(),console:{log:()=>{}}
    });
    review.subjectMatch=false;
    save();
    await assert.rejects(execute(), /MODEL_ORIGINAL_QA_REQUIRED/);
    assert.equal(fs.existsSync(dest),false);
    review.subjectMatch=true;
    record.approved[id]='0'.repeat(64);
    save();
    await assert.rejects(execute(), /MODEL_ORIGINAL_APPROVAL_OR_SAFETY_MISMATCH/);
    assert.equal(fs.existsSync(dest),false);
    record.approved[id]=hash;
    save();
    await execute();
    assert.equal(createHash('sha256').update(fs.readFileSync(dest)).digest('hex'),hash);
    await execute(); // 반복 실행은 기존 파일과 ID를 그대로 보존한다.
    fs.writeFileSync(dest,'unexpected overwrite attempt');
    await assert.rejects(execute(), /MODEL_ORIGINAL_EXISTING_CARD_PRESERVED/);
  } finally {fs.rmSync(root,{recursive:true,force:true});}
});

test('Mare licensed galleon is registered for its universe and is not assigned to other historical ship classes',()=>{
  const root='roblox-games/mare-essentia';
  const registry=JSON.parse(fs.readFileSync(root+'/assets-registered.json','utf8'));
  const row=registry.assets['Naval/galleon-heritage'];
  const meta=JSON.parse(fs.readFileSync(root+'/assets/naval/galleon-heritage.glb.license.json','utf8'));
  const bindings=fs.readFileSync(root+'/src/ReplicatedStorage/Shared/AssetIds.luau','utf8');
  const port=fs.readFileSync(root+'/src/ReplicatedStorage/Shared/PortScene.luau','utf8');
  const battle=fs.readFileSync(root+'/src/ReplicatedStorage/Shared/NavalBattle.luau','utf8');
  const yard=fs.readFileSync(root+'/src/StarterPlayer/Game.client.luau','utf8');
  assert.equal(registry.universeId,'10775310508');
  assert.equal(row?.assetType,'Model');
  assert.equal(row?.usePermissionGranted,true);
  assert.equal(row?.license,'CC-BY-4.0');
  assert.equal(meta.license,'CC-BY-4.0');
  assert.equal(meta.sourceSha256,row.sourceSha256);
  assert.match(meta.sourcePage,/sketchfab\.com\/3d-models\/nautical-galleon-/);
  assert.equal(meta.actualRobloxRuntimeVerified,false);
  assert.equal(meta.visualQualityApproved,false);
  assert.ok(bindings.includes('["Naval/galleon-heritage"] = '+row.assetId));
  assert.match(port,/SHIP_MESH\.galleon = "galleon-heritage"/);
  assert.match(port,/SHIP_MESH\[id\] = SHIP_MESH\[def\.visual\]/);
  assert.ok(port.indexOf('SHIP_MESH.galleon = "galleon-heritage"')>port.indexOf('SHIP_MESH[id] = SHIP_MESH[def.visual]'));
  assert.match(battle,/galleon = if AssetIds\["Naval\/galleon-heritage"\]/);
  assert.match(yard,/Nautical Galleon · R-LAB \(rakshaan\), CC BY 4\.0/);
});

// [원본 자산 검증] CC0 원본을 선다운한 뒤 함종별 개조한 바이너리만 기존 등록기로 보낸다.
test('Mare ship original source hash and dedicated ship class boundaries',()=>{
  const root='roblox-games/mare-essentia';
  const source=root+'/assets/naval/ship-small.glb';
  const original=fs.readFileSync(source);
  const originalSha=createHash('sha256').update(original).digest('hex');
  for(const ship of ['caravel','cog']){
    const file=root+'/assets/naval/'+ship+'-custom.glb';
    const data=fs.readFileSync(file);
    const meta=JSON.parse(fs.readFileSync(file+'.license.json','utf8'));
    assert.equal(data.subarray(0,4).toString(),'glTF','invalid GLB header: '+ship);
    assert.equal(data.readUInt32LE(4),2,'unsupported GLB version: '+ship);
    assert.equal(data.readUInt32LE(8),data.length,'GLB length mismatch: '+ship);
    const jsonLength=data.readUInt32LE(12);
    const gltf=JSON.parse(data.subarray(20,20+jsonLength).toString('utf8'));
    assert.ok(gltf.meshes.length>=8,'model did not acquire distinct rebuilt geometry: '+ship);
    assert.ok(gltf.meshes.some(m=>m.name===ship+' cloth'),'no rebuilt sails: '+ship);
    assert.equal(meta.license,'CC0-1.0');
    assert.equal(meta.author,'Kenney');
    assert.equal(meta.source,'https://kenney.nl/assets/pirate-kit');
    assert.equal(meta.sourceGitBlobSha,'1c12546ebf5ec2741aa9e9f44cb0f7ee1c36b44e');
    assert.equal(meta.originalSha256,originalSha,'source changed without verification: '+ship);
    assert.equal(meta.sourceSha256,createHash('sha256').update(data).digest('hex'),'derived file changed without verification: '+ship);
    assert.equal(meta.actualRobloxRuntimeVerified,false);
    assert.equal(meta.visualQualityApproved,false);
  }
  const port=fs.readFileSync(root+'/src/ReplicatedStorage/Shared/PortScene.luau','utf8');
  const battle=fs.readFileSync(root+'/src/ReplicatedStorage/Shared/NavalBattle.luau','utf8');
  assert.ok(port.indexOf('SHIP_MESH[id] = SHIP_MESH[def.visual]')<port.indexOf('SHIP_MESH.galleon = "galleon-heritage"'));
  assert.ok(port.indexOf('SHIP_MESH[id] = SHIP_MESH[def.visual]')<port.indexOf('SHIP_MESH.frigate = "frigate"'));
  assert.ok(port.includes('and meshAsset ~= "frigate" and meshAsset ~= "galleon-heritage"'));
  assert.ok(battle.includes('PLAYER_SHIP[id] = "ship-large"'));
  assert.ok(battle.includes('PLAYER_SHIP[id] = "ship-pirate-medium"'));
  assert.ok(battle.includes('elseif asset == "frigate"'));
  assert.ok(port.includes('elseif not shipMesh and shipId == "frigate"'));
  assert.ok(!battle.includes('caravel-custom') && !battle.includes('cog-custom'), 'unverified originals may not enter battle');
  assert.ok(!port.includes('caravel-custom') && !port.includes('cog-custom'), 'unverified originals may not enter harbor');
});


// [함종 원본 검증] 각 함종에 맞는 CC0 원본 바이너리 선확보·개조·출처를 기존 검사에 포함한다.
test('Mare ship original derived fleet provenance and geometry boundaries',()=>{
  const root='roblox-games/mare-essentia';
  const cases=[
    ['xebec','naval/ship-pirate-medium.glb','pirate-kit',6,true],
    ['brigantine','naval/ship-medium.glb','pirate-kit',6,true],
    ['fluyt','naval/ship-large.glb','pirate-kit',6,true],
    ['pirogue','terrain/canoe.glb','nature-kit',1,false],
    ['galley','naval/ship-pirate-small.glb','pirate-kit',4,true],
    ['dhow','naval/boat-sail-a.glb','pirate-kit',2,true],
    ['prau','naval/boat-sail-b.glb','pirate-kit',2,true],
    ['junk','naval/ship-pirate-large.glb','pirate-kit',6,true],
    ['carrack','naval/ship-large.glb','pirate-kit',6,true],
    ['baghlah','naval/boat-sail-b.glb','pirate-kit',2,true],
    ['sekibune','naval/boat-row-small.glb','pirate-kit',2,true],
    ['geobukseon','naval/boat-row-large.glb','pirate-kit',2,false],
    ['pattamar','naval/boat-sail-a.glb','pirate-kit',2,true],
    ['kadirga','naval/boat-row-large.glb','pirate-kit',2,true],
    ['corvette','naval/ship-pirate-small.glb','pirate-kit',4,true],
    ['east_indiaman','naval/ship-pirate-large.glb','pirate-kit',6,true],
  ];
  const importer=fs.readFileSync('tools/mare-essentia-upload-assets.mjs','utf8');
  assert.match(importer,/ORIGINAL_MODEL_SOURCE_CHANGED_REUPLOAD/,'modified GLB must be registered as new Roblox asset');
  assert.match(importer,/if \(item\.assetType === 'Model' && item\.sourceLicense\)/,'model reimport requires source evidence');
  assert.match(importer,/old\.sourceSha256 !== sourceSha256/,'source-evidence changes must force reimport');
  assert.match(importer,/MARE_ASSET_REPLACEMENT_ROLLBACK=OLD_IDS_PRESERVED/,'failed model reimport must restore old ID');
  assert.match(importer,/current\?\.usePermissionGranted !== true/,'new model cannot pass without Universe permission');
  const port=fs.readFileSync(root+'/src/ReplicatedStorage/Shared/PortScene.luau','utf8');
  const battle=fs.readFileSync(root+'/src/ReplicatedStorage/Shared/NavalBattle.luau','utf8');
  const parseGlb=(data,label)=>{
    assert.equal(data.subarray(0,4).toString('utf8'),'glTF',label+' header');
    assert.equal(data.readUInt32LE(4),2,label+' format');
    assert.equal(data.readUInt32LE(8),data.length,label+' byte length');
    const jsonLength=data.readUInt32LE(12);
    assert.equal(data.readUInt32LE(16),0x4e4f534a,label+' JSON chunk');
    const gltf=JSON.parse(data.subarray(20,20+jsonLength).toString('utf8'));
    const binOffset=28+jsonLength;
    assert.equal(data.readUInt32LE(24+jsonLength),0x004e4942,label+' BIN chunk');
    const binLength=data.readUInt32LE(20+jsonLength);
    assert.equal(binOffset+binLength,data.length,label+' BIN length');
    assert.ok(gltf.buffers[0].byteLength<=binLength,label+' glTF buffer bounds');
    for(const view of gltf.bufferViews){
      assert.ok((view.byteOffset||0)+view.byteLength<=gltf.buffers[0].byteLength,label+' view outside buffer');
    }
    return {gltf,bin:data.subarray(binOffset,binOffset+binLength)};
  };
  for(const [ship,source,pack,originalMeshCount,hasSail] of cases){
    const original=fs.readFileSync(root+'/assets/'+source);
    const file=root+'/assets/naval/'+ship+'-custom.glb';
    const data=fs.readFileSync(file);
    const meta=JSON.parse(fs.readFileSync(file+'.license.json','utf8'));
    const before=parseGlb(original,ship+' source');
    const after=parseGlb(data,ship+' custom');
    const originalBlob=createHash('sha1').update('blob '+original.length+String.fromCharCode(0)).update(original).digest('hex');
    assert.equal(meta.license,'CC0-1.0',ship+' license');
    assert.equal(meta.author,'Kenney',ship+' author');
    assert.equal(meta.source,'https://kenney.nl/assets/'+pack,ship+' pack');
    assert.equal(meta.sourceAsset,root+'/assets/'+source,ship+' original path');
    assert.equal(meta.sourceGitBlobSha,originalBlob,ship+' original Git blob');
    assert.equal(meta.originalSha256,createHash('sha256').update(original).digest('hex'),ship+' source SHA256');
    assert.equal(meta.sourceSha256,createHash('sha256').update(data).digest('hex'),ship+' derived SHA256');
    assert.equal(after.gltf.meshes.length>originalMeshCount,true,ship+' rebuilt geometry');
    assert.equal(before.gltf.meshes.length,originalMeshCount,ship+' original mesh baseline');
    assert.deepEqual(after.gltf.meshes.slice(0,originalMeshCount),before.gltf.meshes,ship+' source mesh must survive');
    assert.deepEqual(after.bin.subarray(0,before.bin.length),before.bin,ship+' original binary must survive');
    const extra=after.gltf.meshes.slice(originalMeshCount);
    const addedTriangles=extra.reduce((n,m)=>n+m.primitives.reduce((s,p)=>s+after.gltf.accessors[p.indices].count/3,0),0);
    assert.equal(meta.derivedTriangleCount,addedTriangles,ship+' added triangle provenance');
    if(['pattamar','kadirga','corvette','east_indiaman'].includes(ship)){
      assert.equal(meta.originalMeshCount,originalMeshCount,ship+' source hull baseline');
      assert.ok(addedTriangles>=700,ship+' dedicated vessel reconstruction too simple');
      const expectedGroups={
        pattamar:['wood','linen','red','rope'],
        kadirga:['wood','red','linen','dark'],
        corvette:['wood','metal','dark','linen'],
        east_indiaman:['wood','gold','dark','linen'],
      };
      for(const name of expectedGroups[ship]){
        assert.ok(meta.modelGeometryGroups.includes(name),ship+' missing rebuilt '+name+' geometry');
      }
    }
    if(['carrack','baghlah','sekibune','geobukseon'].includes(ship)){
      assert.equal(meta.originalMeshCount,originalMeshCount,ship+' original mesh baseline');
      assert.ok(meta.derivedTriangleCount>=650,ship+' rebuilt ship visual geometry too small');
      const expectedGroups={
        carrack:['wood','light','red','rope'],
        baghlah:['wood','light','red','rope'],
        sekibune:['wood','light','dark','rope'],
        geobukseon:['wood','metal','green','dark'],
      };
      for(const group of expectedGroups[ship]){
        assert.ok(meta.modelGeometryGroups.includes(group),ship+' missing class-specific geometry: '+group);
      }
      if(ship==='geobukseon'){
        assert.ok(!extra.some(m=>/ custom light$/.test(m.name)),ship+' turtle ship must not inherit a European sail');
      }
    }
    assert.ok(addedTriangles>=(ship==='dhow'?250:300),ship+' geometry changes too small');
    // [함종별 돛] 이전 모델의 'cloth'와 신규 재구성 모델의 실제 천 소재 그룹을 검증한다.
    const newSailClasses=new Set(['carrack','baghlah','sekibune']);
    const hasAddedSails=extra.some(m=>m.name.includes(' cloth') ||
      (newSailClasses.has(ship) && / custom (?:light|red)$/.test(m.name)));
    assert.equal(hasAddedSails,hasSail,ship+' historically correct sail boundaries');
    if(ship==='pirogue'){
      const scene=after.gltf.scenes[after.gltf.scene??0];
      const activeOriginal=scene.nodes.map(i=>after.gltf.nodes[i]).find(n=>n.name==='canoe');
      assert.ok(activeOriginal,'dugout source mesh must appear in the active glTF scene');
      assert.deepEqual(activeOriginal.scale,[2.15,1.54,4.45],'dugout source hull must align with new oars');
      assert.equal(meta.activeSceneOriginalMeshScaleVerified,true);
    }
    assert.equal(meta.authenticOriginalBinaryVerified,true);
    assert.equal(meta.originalMeshesPreserved,true);
    assert.equal(meta.structuralGlbVerified,true);
    assert.equal(meta.actualRobloxRuntimeVerified,false);
    assert.equal(meta.visualQualityApproved,false);
    assert.equal(meta.robloxPublishedVerified,false);
    // [등록 자산 연결] 실제 등록표의 동일 원본 SHA·Model 형식·Universe 권한이 모두 확인된 함종만
    // 기존 AssetIds 동적 경로로 진입한다. 미등록 외형은 새 고유 모델로 위장해 연결할 수 없다.
    const registered=JSON.parse(fs.readFileSync(root+'/assets-registered.json','utf8')).assets['Naval/'+ship+'-custom'];
    const verified=registered?.assetType==='Model' && registered?.usePermissionGranted===true
      && registered?.sourceSha256===meta.sourceSha256
      && /^[1-9][0-9]*$/.test(String(registered?.assetId||''));
    if(verified){
      assert.match(port,/if AssetIds\["Naval\/" \.\. meshName\] then[\s\S]*SHIP_MESH\[shipId\] = meshName/,
        ship+' must use original harbor mesh through registered AssetIds');
      assert.match(battle,/if AssetIds\["Naval\/" \.\. meshName\] then[\s\S]*PLAYER_SHIP\[shipId\] = meshName/,
        ship+' must use original naval mesh through registered AssetIds');
    }else{
      assert.ok(!port.includes('SHIP_MESH.'+ship+' = "'+ship+'-custom"'),ship+' unverified harbor art must not activate');
      assert.ok(!battle.includes('PLAYER_SHIP.'+ship+' = "'+ship+'-custom"'),ship+' unverified battle art must not activate');
    }
  }
});

// [외부 CC0 실물 선체] 포르투갈 나우는 다운로드된 원본 갈레온의 메시/바이너리를 보존한 개조본만 등록한다.
test('Mare external CC0 nau original hull and Roblox registration integrity',()=>{
  const root='roblox-games/mare-essentia';
  const src=root+'/assets/naval/nau-source.glb';
  const file=root+'/assets/naval/nau-custom.glb';
  const proof=file+'.license.json';
  const uploader=fs.readFileSync('tools/mare-essentia-upload-assets.mjs','utf8');
  const workflow=fs.readFileSync('.github/workflows/owner-mare-essentia-assets.yml','utf8');
  assert.ok(uploader.includes('https://grab3d.com/dl/galleon/galleon-light.glb'));
  assert.ok(uploader.includes('MARE_NAU_EXTERNAL_CC0_HULL_DERIVED'));
  assert.ok(uploader.includes("if (kind === 'Naval' && f === 'nau-source.glb') continue;"));
  assert.ok(workflow.includes('assets/naval/nau-source.glb'));
  assert.ok(workflow.includes('assets/naval/nau-custom.glb'));
  if(!fs.existsSync(src)){
    assert.equal(fs.existsSync(file),false,'derived model without saved external original');
    assert.equal(fs.existsSync(proof),false,'derived evidence without saved external original');
    return; // GitHub PR 단계에서는 다운로드하지 않는다. 등록 직후 같은 검사를 다시 실행한다.
  }
  const original=fs.readFileSync(src),custom=fs.readFileSync(file);
  const meta=JSON.parse(fs.readFileSync(proof,'utf8'));
  const parse=(b)=>{
    assert.equal(b.toString('ascii',0,4),'glTF');
    assert.equal(b.readUInt32LE(4),2);
    assert.equal(b.readUInt32LE(8),b.length);
    const len=b.readUInt32LE(12),at=20+len;
    assert.equal(b.readUInt32LE(16),0x4e4f534a);
    assert.equal(b.readUInt32LE(at+4),0x004e4942);
    assert.equal(at+8+b.readUInt32LE(at),b.length);
    return {gltf:JSON.parse(b.subarray(20,at).toString('utf8')),bin:b.subarray(at+8)};
  };
  const source=parse(original),derived=parse(custom);
  const sha=b=>createHash('sha256').update(b).digest('hex');
  assert.equal(original.length,1196260,'external original must match official light model size');
  assert.equal(meta.license,'CC0-1.0');
  assert.equal(meta.author,'Grab3D');
  assert.equal(meta.source,'https://grab3d.com/dl/galleon/galleon-light.glb');
  assert.equal(meta.sourcePage,'https://grab3d.com/models/vehicles/galleon/');
  assert.equal(meta.sourceAsset,src);
  assert.equal(meta.originalSha256,sha(original));
  assert.equal(meta.sourceSha256,sha(custom));
  assert.equal(meta.originalMeshCount,source.gltf.meshes.length);
  assert.equal(meta.authenticOriginalBinaryVerified,true);
  assert.equal(meta.originalMeshesPreserved,true);
  assert.equal(meta.structuralGlbVerified,true);
  assert.equal(meta.actualRobloxRuntimeVerified,false);
  assert.equal(meta.visualQualityApproved,false);
  assert.ok(meta.derivedTriangleCount>=550);
  assert.deepEqual(meta.modelGeometryGroups,['wood','linen','rope']);
  assert.deepEqual(derived.gltf.meshes.slice(0,source.gltf.meshes.length),source.gltf.meshes,
    'external source hull must remain unchanged');
  assert.deepEqual(derived.bin.subarray(0,source.bin.length),source.bin,
    'external source geometry bytes must remain unchanged');
  assert.equal(derived.gltf.meshes.length,source.gltf.meshes.length+3);
  assert.ok(derived.gltf.meshes.some(m=>m.name==='nau mizzen lateen cloth'));
  assert.ok(derived.gltf.meshes.some(m=>m.name==='nau mizzen oak mast and lateen yard'));
  assert.ok(derived.gltf.meshes.some(m=>m.name==='nau mizzen ropes and rigging'));
  const ledger=JSON.parse(fs.readFileSync(root+'/assets-registered.json','utf8'));
  const reg=ledger.assets['Naval/nau-custom'];
  assert.ok(reg?.assetId,'nau Roblox ID must be issued by the actual existing uploader');
  assert.equal(reg.assetType,'Model');
  assert.equal(reg.usePermissionGranted,true,'universe use permission must be confirmed');
  assert.equal(reg.sourceSha256,sha(custom));
  const lua=fs.readFileSync(root+'/src/ReplicatedStorage/Shared/AssetIds.luau','utf8');
  assert.ok(lua.includes('["Naval/nau-custom"] = '+reg.assetId));
  const port=fs.readFileSync(root+'/src/ReplicatedStorage/Shared/PortScene.luau','utf8');
  const battle=fs.readFileSync(root+'/src/ReplicatedStorage/Shared/NavalBattle.luau','utf8');
  assert.ok(!port.includes('nau-custom')&&!battle.includes('nau-custom'),
    'runtime-unverified ship art must not activate in player gameplay');
});


// [인도양 실물 선체] 실제 공개 CC0 나무배 바이너리를 보존하고 3개 서로 다른 상선형으로 제작한 뒤 등록한다.
test('Mare external CC0 coastal original hull and Roblox registration integrity',()=>{
  const root='roblox-games/mare-essentia';
  const src=root+'/assets/naval/rowboat-source.glb';
  const uploader=fs.readFileSync('tools/mare-essentia-upload-assets.mjs','utf8');
  const workflow=fs.readFileSync('.github/workflows/owner-mare-essentia-assets.yml','utf8');
  assert.ok(uploader.includes('https://grab3d.com/dl/rowboat/rowboat.glb'));
  assert.ok(uploader.includes('MARE_COASTAL_EXTERNAL_CC0_HULL_DERIVED'));
  assert.ok(uploader.includes('sourceBytes.length!==1160296'), 'published CC0 source size pin is mandatory');
  assert.ok(uploader.includes('original.length!==1160296'), 'cached CC0 source size pin is mandatory');
  assert.ok(uploader.includes("if (kind === 'Naval' && f === 'rowboat-source.glb') continue;"));
  assert.ok(workflow.includes('assets/naval/rowboat-source.glb'));
  for(const ship of ['jahazi','kotia','mtepe']){
    assert.ok(workflow.includes('assets/naval/'+ship+'-custom.glb'));
    assert.ok(workflow.includes('assets/naval/'+ship+'-custom.glb.license.json'));
  }
  if(!fs.existsSync(src)){
    for(const ship of ['jahazi','kotia','mtepe']){
      assert.equal(fs.existsSync(root+'/assets/naval/'+ship+'-custom.glb'),false);
      assert.equal(fs.existsSync(root+'/assets/naval/'+ship+'-custom.glb.license.json'),false);
    }
    return; // PR 단계에서 무허가 다운로드 없이 코드 검증; 본 작업은 기존 Open Cloud 등록 단계.
  }
  const sha=b=>createHash('sha256').update(b).digest('hex');
  const parse=b=>{
    assert.equal(b.toString('ascii',0,4),'glTF');
    assert.equal(b.readUInt32LE(4),2);
    assert.equal(b.readUInt32LE(8),b.length);
    assert.equal(b.readUInt32LE(16),0x4e4f534a);
    const size=b.readUInt32LE(12),at=20+size;
    assert.equal(b.readUInt32LE(at+4),0x004e4942);
    assert.equal(b.readUInt32LE(at)+at+8,b.length);
    const model=JSON.parse(b.subarray(20,at).toString('utf8'));
    const bin=b.subarray(at+8);
    assert.ok(model.meshes?.length>=2);
    for(const view of model.bufferViews)
      assert.ok((view.byteOffset||0)+view.byteLength<=model.buffers[0].byteLength);
    return {model,bin};
  };
  const original=fs.readFileSync(src),before=parse(original);
  assert.equal(original.length,1160296,'real external CC0 GLB must match Grab3D public manifest');
  const ledger=JSON.parse(fs.readFileSync(root+'/assets-registered.json','utf8'));
  const lua=fs.readFileSync(root+'/src/ReplicatedStorage/Shared/AssetIds.luau','utf8');
  const hashes=new Set();
  for(const ship of ['jahazi','kotia','mtepe']){
    const file=root+'/assets/naval/'+ship+'-custom.glb';
    const custom=fs.readFileSync(file),meta=JSON.parse(fs.readFileSync(file+'.license.json','utf8'));
    const after=parse(custom);
    assert.equal(meta.license,'CC0-1.0');
    assert.equal(meta.author,'Grab3D');
    assert.equal(meta.source,'https://grab3d.com/dl/rowboat/rowboat.glb');
    assert.equal(meta.sourcePage,'https://grab3d.com/models/vehicles/rowboat/');
    assert.equal(meta.sourceAsset,src);
    assert.equal(meta.originalSha256,sha(original));
    assert.equal(meta.sourceSha256,sha(custom));
    assert.equal(meta.originalMeshCount,before.model.meshes.length);
    assert.equal(meta.authenticOriginalBinaryVerified,true);
    assert.equal(meta.originalMeshesPreserved,true);
    assert.equal(meta.structuralGlbVerified,true);
    assert.equal(meta.actualRobloxRuntimeVerified,false);
    assert.equal(meta.visualQualityApproved,false);
    assert.equal(meta.robloxPublishedVerified,false);
    assert.ok(meta.derivedTriangleCount>=1400,ship+' must have substantial reconstructed geometry');
    for(const group of ['wood','edge','linen','rope','carved'])
      assert.ok(meta.modelGeometryGroups.includes(group),ship+' missing material group '+group);
    assert.deepEqual(after.model.meshes.slice(0,before.model.meshes.length),before.model.meshes);
    assert.deepEqual(after.bin.subarray(0,before.bin.length),before.bin);
    assert.ok(after.model.meshes.some(m=>m.name===ship+' joined curved outer hull planks'));
    assert.ok(after.model.meshes.some(m=>m.name===ship+' timber gunwale and ribs'));
    assert.ok(after.model.meshes.some(m=>m.name===ship+' handworked open cargo deck and timber boxes'));
    assert.ok(after.model.meshes.some(m=>m.name===ship+' individual teak strakes and outer wooden wales'));
    assert.ok(after.model.meshes.some(m=>m.name===ship+' coir cargo lashings and gunwale knots'));
    assert.ok(after.model.meshes.some(m=>m.name===ship+' aft steer oar and horizontal tiller'));
    assert.ok(after.model.nodes.some(n=>n.name===ship+' original CC0 clinker hull enlarged'
      && Array.isArray(n.matrix) && n.matrix.length===16),
      ship+' original GLB Y-up coordinates not normalized');
    assert.ok(after.model.nodes.some(n=>n.name===ship+' oriented +X bow +Y up'));
    if(ship==='jahazi'){
      assert.ok(after.model.meshes.some(m=>m.name==='jahazi Swahili jahazi makuti palm leaf roof'));
      assert.ok(after.model.meshes.some(m=>m.name==='jahazi jahazi woven cargo curtain ties'));
      assert.ok(after.model.meshes.some(m=>m.name==='jahazi large Swahili jahazi billowed lateen sail cloth'));
      assert.ok(!after.model.meshes.some(m=>/jahazi mizzen trade sail/.test(m.name)),
        'jahazi cargo dhow must have historically appropriate single main sail');
    }else if(ship==='kotia'){
      assert.ok(after.model.meshes.some(m=>m.name==='kotia Malabar kotia high main lateen cloth'));
      assert.ok(after.model.meshes.some(m=>m.name==='kotia kotia arched stern and carved parrot head stem'));
      assert.ok(after.model.meshes.some(m=>m.name==='kotia Malabar kotia aft trade lateen cloth'));
      assert.equal(after.model.meshes.filter(m=>/kotia rectangular pepper hold hatch/.test(m.name)).length,2);
    }else{
      assert.ok(after.model.meshes.some(m=>m.name==='mtepe stitched Swahili sewn plank seams'));
      assert.ok(after.model.meshes.some(m=>m.name==='mtepe woven rectangular Swahili mtepe mat sail'));
      assert.ok(after.model.meshes.some(m=>m.name==='mtepe mtepe flat broad square wooden stern transom'));
      assert.ok(after.model.meshes.some(m=>m.name==='mtepe mtepe carved paired prow eyes'));
      assert.ok(after.model.meshes.some(m=>m.name==='mtepe mtepe three handwoven red pennants'));
    }
    const added=after.model.meshes.slice(before.model.meshes.length)
      .flatMap(m=>m.primitives).reduce((sum,p)=>sum+after.model.accessors[p.indices].count/3,0);
    assert.equal(meta.derivedTriangleCount,added);
    hashes.add(sha(custom));
    const reg=ledger.assets['Naval/'+ship+'-custom'];
    assert.ok(reg?.assetId,ship+' missing real Roblox Open Cloud asset ID');
    assert.equal(reg.assetType,'Model');
    assert.equal(reg.usePermissionGranted,true);
    assert.equal(reg.sourceSha256,sha(custom));
    assert.ok(lua.includes('["Naval/'+ship+'-custom"] = '+reg.assetId));
  }
  assert.equal(hashes.size,3,'3 ships must not share identical derivative model');
  const port=fs.readFileSync(root+'/src/ReplicatedStorage/Shared/PortScene.luau','utf8');
  const battle=fs.readFileSync(root+'/src/ReplicatedStorage/Shared/NavalBattle.luau','utf8');
  for(const ship of ['jahazi','kotia','mtepe'])
    assert.ok(!port.includes(ship+'-custom')&&!battle.includes(ship+'-custom'),
      'unverified mobile model may not be activated in gameplay: '+ship);
});

// [36척 V5 선박 재질·배색 회귀] 원본 GLB 팔레트와 실제 로더·모바일 미리보기가 일치해야 한다.
test('Mare V5 original 38 material colors and wood cloth metal visuals survive Roblox import', () => {
  const root='roblox-games/mare-essentia';
  const generator=fs.readFileSync('tools/mare-essentia-ship-v5.py','utf8');
  const loader=fs.readFileSync(root+'/src/ServerScriptService/AssetLoader.server.luau','utf8');
  const ui=fs.readFileSync(root+'/src/StarterPlayer/Game.client.luau','utf8');
  const idRows=[...generator.matchAll(/'(\w+)':\[(\d+),(\d+),(\d+),255\]/g)];
  const paletteBlock=generator.split('PALETTE={')[1].split('\n}')[0];
  const colors=[...paletteBlock.matchAll(/'(\w+)':\[(\d+),(\d+),(\d+),255\]/g)];
  assert.equal(colors.length,38,'original 38-color design palette cannot be lost');
  assert.ok(idRows.length>=38,'original hull/sail palette remains in the producer');
  for(const [,key,r,g,b] of colors){
    assert.ok(loader.includes(key+' = Color3.fromRGB('+r+', '+g+', '+b+')'),key+' original GLB tone must be restored');
  }
  assert.match(generator,/node_name=self\.id\+'_'\+role\+'_'\+mat/,'GLB imports have traceable per-part material names');
  assert.match(loader,/local function restoreShipV5Materials\(model, assetName\)/);
  assert.match(loader,/assetName:match\("%-v5\$"\) or assetName:match\("%-v5%-mobile\$"\)/,'only own V5 models should be repainted');
  assert.match(loader,/piece\.Name:lower\(\):match\("_\(\[%w\]\+\)\$"\)/,'original material suffix must be recovered');
  for(const material of ['WoodPlanks','Fabric','Metal','Glass'])
    assert.ok(loader.includes('Enum.Material.'+material),'distinct physical surface finish '+material);
  assert.match(loader,/piece\.Color = color/);
  assert.match(loader,/if not textured then[\s\S]*?piece\.Material = finish/,'preserve uploaded PBR color maps');
  assert.match(loader,/if surface then surface\.Color = color end/,'restore original PBR tint when maps are missing');
  assert.doesNotMatch(loader,/piece\.TextureID\s*=\s*""/,'do not destroy real ship textures');
  assert.match(loader,/shipColorModels \+= 1/,'track whether registered models are actually colored');
  assert.match(loader,/MareShipV5ColorAudit/,'Studio can inspect remaining uncolored parts');
  assert.match(ui,/SHIP_ICON\[blueprint\.id\] = \{ "Naval", if touch and AssetIds\["Naval\/" \.\. light\] then light else model \}/);
  assert.match(ui,/if \(kind == "Cargo" or kind == "Naval"\) and group and asset and knownId then/,'delayed ship models appear in preview');
  assert.match(ui,/local regionMaterials = \{/);
  assert.match(ui,/local regionPaint = \{/);
  assert.match(ui,/if icon then withIcon\(row, icon\[1\], icon\[2\], icon\[3\], 76\) end/,'all 36 cards show small distinct models');
  assert.match(ui,/local textHeight = layout\.AbsoluteContentSize\.Y \+ 12/,'descriptions grow with content to avoid mobile clipping');
  assert.match(ui,/if kind == "Naval" then Color3\.fromRGB\(135, 140, 145\)/,'neutral ship lighting reveals materials');
});

// [해상전투 버튼 원화] 승인된 투명 단독 PNG만 기존 Q/E/가속 조작에 연결한다.
test('Mare naval battle uses three approved original circular HUD images without changing controls',()=>{
  const pathBase='roblox-games/mare-essentia/';
  const naval=fs.readFileSync(pathBase+'src/ReplicatedStorage/Shared/NavalBattle.luau','utf8');
  const approved=JSON.parse(fs.readFileSync(pathBase+'assets/APPROVED_IMAGES.json','utf8')).approved;
  const upload=fs.readFileSync('tools/mare-essentia-upload-assets.mjs','utf8');
  const originals=['naval_skill','naval_fire','naval_speed'];
  for(const name of originals){
    const png=fs.readFileSync(pathBase+'assets/icons/'+name+'.png');
    assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a',name+':PNG');
    assert.equal(png.readUInt32BE(16),512,name+':width');
    assert.equal(png.readUInt32BE(20),512,name+':height');
    assert.ok(png[25]===6 || png[25]===3 && png.includes(Buffer.from('tRNS')),name+':alpha');
    assert.equal(createHash('sha256').update(png).digest('hex'),approved['Menu/'+name],name+':approval');
    assert.ok(upload.includes("'"+name+".png'"),name+':original-license');
    assert.ok(naval.includes('Menu/'+name),name+':image-binding');
  }
  assert.match(naval,/local speedBtn = mkBtn\("가속"[\s\S]*?"Menu\/naval_speed"\)/);
  assert.match(naval,/if sk\.id == "fire" then "Menu\/naval_fire" else "Menu\/naval_skill"/);
  assert.match(naval,/speedBtn\.Activated:Connect\(function\(\)/);
  assert.match(naval,/throttle = if throttle >= 1 then 0\.45 elseif throttle > 0\.4 then 0 else 1/);
  assert.match(naval,/b\.Interactable = ready and phase == "duel"/);
  assert.match(naval,/if now < skillReady\[sk\.id\] or opts\.cardOnly/);
  assert.match(naval,/local art = b:FindFirstChild\("NavalButtonArtwork"\)/);
});


// [도시 자동 사건·카드 원더 차단] 수동으로 듣는 이야기는 유지하고 같은 방문의 자동 씬만 절제한다.
test('Mare first card has no forced wonder and spontaneous port events are limited to one',()=>{
  const root='roblox-games/mare-essentia/src/ServerScriptService/Services/';
  const discovery=fs.readFileSync(root+'Discovery.luau','utf8');
  const cardGrant=discovery.slice(discovery.indexOf('local function grantCard('),discovery.indexOf('-- [발견] 항구 도착만으로'));
  assert.ok(cardGrant.includes('state.discovered[cardId] = true'),'card rewards still update canonical discovery');
  assert.ok(cardGrant.includes('S.Cardbook.reward(state, "discover"'),'card-drop probability unchanged');
  assert.doesNotMatch(cardGrant,/state\.pendingScene\s*=\s*cardId/,'first and later cards do not summon a blocking wonder movie');
  const quest=fs.readFileSync(root+'Quest.luau','utf8');
  const arrive=quest.slice(quest.indexOf('local function arrivalHooks('),quest.indexOf('-- 항구에 도착하면 받아 둔'));
  for(const token of ['S.History.tick(state)','local offered = offer(state, msgs, "주점에서 소문을 들었다")',
    'S.Chronicle.arrive(state, msgs)','S.Story.autoTrigger(state, msgs)','state._autoEventPort = state.portId'])
    assert.ok(arrive.includes(token),'arrival keeps existing responsibility: '+token);
  assert.ok(arrive.indexOf('S.History.tick(state)')<arrive.indexOf('local offered = offer('));
  assert.ok(arrive.indexOf('local offered = offer(')<arrive.indexOf('S.Chronicle.arrive(state, msgs)'));
  assert.ok(arrive.indexOf('S.Chronicle.arrive(state, msgs)')<arrive.indexOf('S.Story.autoTrigger(state, msgs)'));
  assert.match(arrive,/if offered then[\s\S]*?state\._autoEventPort = state\.portId[\s\S]*?return/);
  assert.match(arrive,/if S\.Chronicle and S\.Chronicle\.arrive\(state, msgs\) then[\s\S]*?return/);
  const history=fs.readFileSync(root+'History.luau','utf8');
  assert.match(history,/if state\._autoEventPort == state\.portId then return nil end/);
  assert.match(history,/h\.seen\[ev\.id\] = math\.floor\(idx\)[\s\S]*?state\._autoEventPort = state\.portId/);
  assert.match(history,/h\.pending = best\.id/,'unseen history is deferred, not marked as seen');
  const payout=quest.slice(quest.indexOf('local function payout('),quest.indexOf('function handlers.Claim('));
  assert.match(payout,/quest\.id ~= "q_first_discovery"/,'first discovered card pays rewards without the passive First Discovery quest movie');
  assert.match(payout,/state\.quests\.done\[quest\.id\] = true/,'auto quest still completes');
  assert.match(payout,/state\.coins \+= quest\.rewardCoins/,'coins are still granted');
  assert.match(payout,/state\.fame \+= quest\.rewardFame/,'fame is still granted');
  assert.match(payout,/not AUTO_KINDS\[quest\.kind\]/,'manual quest completion cutscenes remain unchanged');
  assert.match(payout,/state\._autoEventPort ~= state\.portId and not \(state\.history and state\.history\.pending\)/,'spontaneous end scenes yield to queued history and obey one per visit');
  assert.match(arrive,/state\._autoEventPort = nil/,'leaving then reentering a port resets only the transient one-visit throttle');
  const story=fs.readFileSync(root+'Story.luau','utf8');
  assert.match(story,/function handlers\.PlayStory\(state, p\)/,'player-initiated story stays intact');
  assert.match(quest,/local function offer\(state, msgs, how, personId\)/,'player initiated quests preserved');
});
