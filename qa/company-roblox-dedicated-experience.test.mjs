// 파일명: qa/company-roblox-dedicated-experience.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
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


// [마력숲·대항해시대] 기존 게시 후 두 게임 모두 공식 Studio PC 검사를 요청한다.
// 권한 403은 배포 실패로 유지하고 Studio 검사와 구분한다.
test('Forest publisher completion dispatches independent Studio QA for both games',()=>{
  const qa=fs.readFileSync('.github/workflows/studio-autoqa.yml','utf8');
  assert.ok(qa.includes('workflows: ["Owner Mare Essentia Direct Publish", "Owner Roblox Dedicated Private Experiences"]'));
  assert.ok(qa.includes("github.event.workflow_run.event == 'push'"));
  assert.ok(qa.includes("github.event.workflow_run.event == 'workflow_dispatch'"));
  assert.ok(qa.includes("github.event.workflow_run.head_branch == 'main'"));
  assert.ok(qa.includes("github.event.workflow_run.conclusion == 'failure'"));
  assert.ok(qa.includes('github.event.workflow_run.head_sha'));
  assert.ok(qa.includes('no Forest source or publisher change, skip'));
  assert.ok(qa.includes('games="mare-essentia fantasy-survival"'));
  assert.ok(qa.includes('for game in $games; do'));
  assert.ok(qa.includes('select((.display_title // "") | contains(" · " + $game + " ·"))'));
  assert.ok(qa.includes('continue'));
  assert.ok(qa.includes('script=roblox-games/mare-essentia/tools/devloop/studio-scripts/mare-qa-click.json'));
  assert.ok(qa.includes('script=roblox-games/fantasy-survival/tools/devloop/studio-scripts/fantasy-qa-click.json'));
  assert.equal(qa.split('gh workflow run devloop-studio.yml').length-1,1);
  assert.ok(!qa.includes('schedule:'));
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


// [1980 계정 게시/게임 ID 회귀] API 키 표시 이름과 GitHub Secret을 혼동하거나 다른 게임 Place로 게시하지 않는다.
test('1980 publish credential stays isolated and exact game target is required',()=>{
  const mare=fs.readFileSync('.github/workflows/owner-mare-essentia-direct-publish.yml','utf8');
  const assets=fs.readFileSync('.github/workflows/owner-mare-essentia-assets.yml','utf8');
  const create=fs.readFileSync('.github/workflows/owner-new-experience.yml','utf8');
  for(const workflow of [mare,assets,create]){
    assert.ok(workflow.includes('secrets.ROBLOX_DEPLOY_API_KEY'));
    assert.ok(!workflow.includes('secrets.ROBLOX_DEPLOY_API_KEY || secrets.ROBLOX_OPEN_CLOUD_API_KEY'));
  }
  assert.ok(mare.includes('MARE_1980_PUBLISH_API_KEY_MISSING'));
  assert.ok(mare.includes("ROBLOX_ROBLOSECURITY: ''"));
  assert.ok(mare.includes("ROBLOX_SECURITY_COOKIE: ''"));
  assert.ok(create.includes('ROBLOX_1980_PUBLISH_API_KEY_MISSING'));
  assert.ok(create.includes('OWNER_EXPERIENCE_GAME_TARGET_MISMATCH'));
  assert.ok(create.includes('target.gameId!==game'));
  assert.ok(create.includes('target.universeId'));
  assert.ok(create.includes('target.placeId'));
  const forest=JSON.parse(fs.readFileSync('roblox-games/fantasy-survival/experience-target.json','utf8'));
  const mareTarget=JSON.parse(fs.readFileSync('roblox-games/mare-essentia/experience-target.json','utf8'));
  assert.deepEqual([forest.gameId,forest.universeId,forest.placeId],['fantasy-survival','10775310122','70742682772890']);
  assert.deepEqual([mareTarget.gameId,mareTarget.universeId,mareTarget.placeId],['mare-essentia','10775310508','73607605986189']);
  // 기존 F0/F9 검증 체험을 새 소유 계정의 정식 게임 Place로 잘못 변경하지 않는다.
  const validation=fs.readFileSync('.github/workflows/owner-roblox-dedicated-private-experiences.yml','utf8');
  assert.ok(validation.includes('10773436325'));
  assert.ok(validation.includes('108565970231899'));
});
