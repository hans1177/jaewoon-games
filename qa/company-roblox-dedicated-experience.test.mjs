import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
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

// [검사 종료 진단] 시험 프로세스 강제 종료 시 마지막 시작 시험을 확인한다.
test.beforeEach(({name})=>{fs.writeSync(2,'ROBLOX_CONTRACT_TEST_START='+name+'\n');});
test.afterEach(({name})=>{fs.writeSync(2,'ROBLOX_CONTRACT_TEST_END='+name+'\n');});

// [교역품 3D] 기존 생성기를 실행해 8종의 서로 다른 메시와 모바일 삼각면 예산을 검증한다.
test('Mare trade cargo eight distinct 3D model silhouettes stay within mobile budget',()=>{
  const output=execFileSync(process.execPath,['roblox-games/mare-essentia/tools/make_cargo.mjs','--check'],{
    cwd:process.cwd(),encoding:'utf8',timeout:20000,
  });
  for(const id of ['amber','ambergris','camphor','coal','guano','gum_arabic','jade','nitrate'])
    assert.match(output,new RegExp('CARGO_3D_QUALITY_CHECK='+id+' TRIANGLES=\\d+'));
  assert.match(output,/CARGO_3D_UNIQUE_SHAPES=8 PASS/);
});

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
  assert.match(workflow,/group: owner-roblox-dedicated-private-experiences-\$\{\{ github\.event_name == 'pull_request' && format\('qa-pr-\{0\}', github\.event\.pull_request\.number\) \|\| inputs\.game_id \|\| 'main' \}\}/);
  assert.match(workflow,/cancel-in-progress: \$\{\{ github\.event_name == 'pull_request' \}\}/);
  assert.match(workflow,/publish:\s*\n[\s\S]*?if: github\.event_name != 'pull_request'/);
  assert.match(workflow,/persist:\s*\n[\s\S]*?if: always\(\) && github\.event_name != 'pull_request'/);
  assert.equal((workflow.match(/cancel-in-progress: false/g)||[]).length,2);
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
  assert.match(qa,/if \[ "\$busy" -ge 1 \]; then\s+echo "STUDIO_WATCHDOG_SKIP=RUNNER_BUSY:\$busy"\s+exit 0/);
  assert.ok(qa.includes('group: studio-autoqa-dispatch-mare-essentia'));
  assert.match(qa,/assets\/naval\/\*\|[^\n]+mare-ships\.json\)\s+candidate=SHIPS ;;/);
  assert.ok(qa.includes('SHIPS) script=roblox-games/mare-essentia/tools/devloop/studio-scripts/mare-ships.json ;;'));
  assert.ok(qa.includes('STUDIO_PUSH_DEVELOPMENT_SCOPE=$scope'));
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
  // [현행 교역 UI] 원화 우선, 목록 폭에 따라 82/102px. 원화가 없으면 기존 Cargo 3D 표본으로 복구한다.
  assert.match(client,/local listPx = if listWidth < 230 then 82 else 102/);
  assert.match(client,/icon\.Name = "TradeIndexArt"/);
  assert.match(client,/modelIcon\(row, gi\[1\], gi\[2\], gi\[3\], listPx, g\.name, gi\[4\]\)/);
  // [현행 탭 교역] 제거된 별도 cardF 화면 대신 목록의 실제 상품 ID와 원화 바인딩을 확인한다.
  assert.match(client,/local listArtId = AssetIds\["Goods\/" \.\. g\.id\]/);
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


// [정기 자산 등록 → 기존 게시] 원본 장부 갱신만으로 게시하거나 실제 배치 통과를 기록하지 않는다.
test('Mare scheduled verified asset registration dispatches existing publisher only on committed registry change',()=>{
  const workflow=fs.readFileSync('.github/workflows/owner-mare-essentia-assets.yml','utf8');
  const publisher=fs.readFileSync('.github/workflows/owner-mare-essentia-direct-publish.yml','utf8');
  const studio=fs.readFileSync('.github/workflows/studio-autoqa.yml','utf8');
  assert.match(workflow,/id: registered_commit\s*\n\s*if: always\(\)/);
  assert.ok(workflow.includes('[[ "$MARE_ASSET_OUTCOME" == "success" ]] && ! git diff --quiet HEAD -- "$registry" "$ids"'));
  assert.ok(workflow.includes('for f in "$registry" "$ids"; do'));
  assert.ok(workflow.includes('MARE_ASSET_PUBLISH_HANDOFF_NOT_VERIFIED:$f'));
  assert.ok(workflow.includes('echo "registered_change=$changed" >> "$GITHUB_OUTPUT"'));
  assert.ok(workflow.includes("success() && inputs.studio_regrant != true && (inputs.publish_after_register == true || (steps.asset_registration.outcome == 'success' && steps.registered_commit.outputs.registered_change == 'true'))"));
  assert.ok(workflow.includes('gh workflow run owner-mare-essentia-direct-publish.yml --ref main -f universe_id="$MARE_PUBLISH_UNIVERSE"'));
  assert.ok(workflow.includes('MARE_ASSET_PUBLISH_REQUESTED=YES'));
  assert.ok(publisher.includes('MARE_ASSET_ID_OR_UNIVERSE_GRANT_UNVERIFIED:'));
  assert.ok(publisher.includes('MARE_CANONICAL_TARGET_MISMATCH'));
  assert.ok(studio.includes('workflows: ["Owner Mare Essentia Direct Publish"]'));
  assert.doesNotMatch(publisher,/^  workflow_run:/m); // 등록 후 중복 게시 트리거 금지
  assert.match(publisher,/^  workflow_dispatch:/m);
  assert.match(publisher,/^  push:/m);
  assert.equal(workflow.split('gh workflow run owner-mare-essentia-direct-publish.yml').length - 1, 1);
  assert.match(publisher,/cancel-in-progress: false/);
  assert.ok(workflow.includes("MARE_MODELS_ONLY: ${{ github.event_name == 'schedule' || inputs.scheduled_recovery == true }}"));
  assert.ok(workflow.includes("inputs.scheduled_recovery == true || github.event_name == 'repository_dispatch' || github.event_name == 'workflow_run'"));
  assert.ok(workflow.includes("inputs.scheduled_recovery != true || (inputs.studio_regrant != true"));
  assert.ok(workflow.includes('if [[ "$MARE_MODELS_ONLY" != "true" ]]; then'));
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
  assert.match(script,/BRIEF_BUILDING_ROLE_CANDIDATE_ONLY/);
  assert.match(script,/BRIEF_SCENE_COMPONENT_CANDIDATE_ONLY/);
  assert.match(script,/component_targets\[role\]\.append\(asset\)/);
  assert.match(script,/if asset in scene_catalog:/);
  assert.match(script,/if entry\.get\("regionalAdaptationRequired"\) is True:/);
  assert.match(script,/regionalAdaptationRequired/);
  assert.match(script,/report\["lastPreviewRun"\] = last/);
  assert.match(script,/animal_audit\["lastPreviewRun"\] = \{/);
  assert.match(fs.readFileSync('tools/mare-essentia-upload-assets.mjs','utf8'),/lastPreviewRun\.visualObservationCount=observed/);
  const workflow=fs.readFileSync('.github/workflows/owner-mare-essentia-assets.yml','utf8');
  assert.match(workflow,/schedule:\s*\n\s*- cron: '2,7,12,17,22,27,32,37,42,47,52,57 \* \* \* \*'/);
  assert.equal((fs.readFileSync('tools/devloop/assets_wanted.py','utf8').match(/time\.time\(\) \/\/ 300/g)||[]).length,2);
  assert.match(workflow,/id: animal_practice\s*\n\s*if: \$\{\{ env\.MARE_MODELS_ONLY == 'true' \}\}/);
  assert.match(workflow,/run: node tools\/mare-essentia-upload-assets\.mjs --animal-source-preflight/);
  assert.ok(workflow.indexOf('id: animal_practice') < workflow.indexOf('id: card_recovery'),'scheduled animal preflight precedes card recovery mode selection');
  assert.match(workflow,/old\.get\('sourceSha256'\)!=review\.get\('replacesSha256'\)/);
  assert.match(workflow,/hashlib\.sha256\(raw\)\.hexdigest\(\)!=digest/);
  assert.match(workflow,/out\.write\('MARE_MODELS_ONLY=false\\n'\)/);
  assert.match(workflow,/env\.MARE_MODELS_ONLY != 'true' \|\| steps\.animal_practice\.outputs\.pending == 'true'/);
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
  // 원경 예외는 비충돌 Terrain/Castle에 한정하며 일반 모델의 배율 제한을 보존한다.
  assert.match(scene,/local distantBackdrop = not solid and desiredSize >= 80 and \(kind == "Terrain" or kind == "Castle"\)/);
  assert.match(scene,/if not isAnimal and not distantBackdrop and \(ratio < 0\.01 or ratio > 100\) then\s*error\(/);
  assert.match(scene,/local scale = if isAnimal or distantBackdrop then m:GetScale\(\) \* ratio else ratio/);
  assert.match(scene,/if scale ~= scale or scale <= 0 or scale == math\.huge then error\(/);
  assert.match(scene,/if isAnimal or distantBackdrop then\s*local _, actualSize = m:GetBoundingBox\(\)\s*local actualAxis = if isAnimal then math\.max\(actualSize\.X, actualSize\.Y, actualSize\.Z\)/);
  assert.match(scene,/math\.abs\(actualAxis - desiredSize\) > desiredSize \* 0\.2/);
  assert.match(scene,/local asset = if species == "dog" then "dog-pug" else species/);
  // 오리도 승인된 원본 등록 전에는 숨기고, 등록 이후 기존 수입 모델 경로만 사용한다.
  assert.match(scene,/local m = if k and AssetIds\["Animals\/" \.\. asset\]\s*then importedModel\(folder, "Animals", asset, pos, k\[1\], false, coat\) else nil\s*if not m then return end/);
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



// [동물 원본 자동 충원] 기존 Python 함수 자체를 실행한다. 게임·등록번호·시각 PASS는 부여하지 않는다.
test('Mare animal archive candidates verify bounded original bytes without automatic visual approval',()=>{
  const script=String.raw`
import ast,io,os,re,struct,hashlib,json,zipfile,tarfile
from pathlib import Path
source=Path('tools/devloop/assets_wanted.py').read_text(encoding='utf-8')
tree=ast.parse(source)
fn=next(node for node in tree.body if isinstance(node,ast.FunctionDef) and node.name=='inspect_animal_archive')
exec(compile(ast.Module(body=[fn],type_ignores=[]),'assets_wanted.py','exec'))
def zip_data(entries):
    stream=io.BytesIO()
    with zipfile.ZipFile(stream,'w',compression=zipfile.ZIP_DEFLATED) as archive:
        for name,body in entries:
            archive.writestr(name,body)
    return stream.getvalue()
def tar_data(entries):
    stream=io.BytesIO()
    with tarfile.open(fileobj=stream,mode='w:gz') as archive:
        for name,body in entries:
            item=tarfile.TarInfo(name)
            item.size=len(body)
            archive.addfile(item,io.BytesIO(body))
    return stream.getvalue()
def rejected(fn):
    try:
        fn()
    except ValueError:
        return
    raise AssertionError('expected rejection')
body=b'{"asset":{"version":"2.0"}} '
glb=b'glTF'+struct.pack('<III',2,20+len(body),len(body))+b'JSON'+body
assert inspect_animal_archive(zip_data([('models/Goat.glb',glb),('cow.glb',glb)]),'goat.zip','goat')==[{'member':'models/Goat.glb','format':'GLB','bytes':len(glb),'sha256':hashlib.sha256(glb).hexdigest()}]
assert inspect_animal_archive(zip_data([('cow.glb',glb)]),'goat.zip','goat')==[]
rejected(lambda:inspect_animal_archive(zip_data([('../goat.glb',glb)]),'goat.zip','goat'))
rejected(lambda:inspect_animal_archive(zip_data([('goat.glb',b'bad')]),'goat.zip','goat'))
rejected(lambda:inspect_animal_archive(zip_data([('goat.glb',b'0'*5000001)]),'goat.zip','goat'))
assert len(inspect_animal_archive(tar_data([('goat.glb',glb),('cow.glb',glb)]),'goat.tar.gz','goat'))==1
rejected(lambda:inspect_animal_archive(tar_data([('../goat.glb',glb)]),'goat.tar.gz','goat'))
print('MARE_ANIMAL_ARCHIVE_FIXTURES=7')
`;
  const output=execFileSync('python3',['-c',script],{encoding:'utf8',timeout:15000});
  assert.match(output,/MARE_ANIMAL_ARCHIVE_FIXTURES=7/);
  const source=fs.readFileSync('tools/devloop/assets_wanted.py','utf8');
  assert.match(source,/"registrationApproved": False/);
  assert.match(source,/"visualQualityApproved": False/);
  assert.match(source,/"actualRobloxRuntimeVerified": False/);
});


test('Mare source preview uses bounded exact original member and never grants approval',()=>{
  const script=String.raw`
import ast,io,os,re,struct,hashlib,json,zipfile,tarfile,tempfile
from pathlib import Path
source=Path('tools/devloop/assets_wanted.py').read_text(encoding='utf8')
tree=ast.parse(source)
names={'inspect_animal_archive','materialize_animal_review_member'}
exec(compile(ast.Module(body=[x for x in tree.body if isinstance(x,ast.FunctionDef) and x.name in names],type_ignores=[]),'assets_wanted.py','exec'))
body=b'BLENDER-v404'+b'original'
png=b'\x89PNG\r\n\x1a\n'+b'texture'
stream=io.BytesIO()
with zipfile.ZipFile(stream,'w') as z:
    z.writestr('models/goat.blend',body)
    z.writestr('models/goat.png',png)
    z.writestr('models/alternate.png',png)
    z.writestr('other/ignored.png',png)
    z.writestr('models/texture.jpg',b'\xff\xd8\xff'+b'jpeg'+b'\xff\xd9')
data=stream.getvalue()
member=inspect_animal_archive(data,'goat.zip','goat')[0]
with tempfile.TemporaryDirectory() as dest:
    path=materialize_animal_review_member(data,'goat.zip','goat',member,dest)
    assert Path(path).read_bytes()==body
    assert Path(dest,'goat.png').read_bytes()==png
    assert Path(dest,'alternate.png').read_bytes()==png
    assert Path(dest,'texture.jpg').read_bytes().startswith(b'\xff\xd8\xff')
    assert not Path(dest,'ignored.png').exists()
    try:
        materialize_animal_review_member(data,'goat.zip','goat',{**member,'sha256':'0'*64},dest)
    except ValueError:
        pass
    else:
        raise AssertionError('wrong member digest accepted')
print('MARE_SOURCE_PREVIEW_FIXTURES=3')
`;
  assert.match(execFileSync('python3',['-c',script],{encoding:'utf8',timeout:15000}),/MARE_SOURCE_PREVIEW_FIXTURES=3/);
  const source=fs.readFileSync('tools/devloop/assets_wanted.py','utf8');
  const mesh=fs.readFileSync('tools/vibe_mesh_audit.py','utf8');
  const workflow=fs.readFileSync('.github/workflows/owner-mare-essentia-assets.yml','utf8');
  assert.match(source,/--disable-autoexec/);
  assert.match(source,/timeout=600, check=False, stdout=diagnostic, stderr=subprocess\.STDOUT\)/);
  assert.match(source,/RENDERED_AWAITING_VISUAL_REVIEW/);
  assert.match(mesh,/use_scripts=False/);
  const textureGuardFixture=String.raw`
from pathlib import Path
from types import SimpleNamespace
import tempfile, textwrap, re
mesh=Path('tools/vibe_mesh_audit.py').read_text(encoding='utf8')
guard=textwrap.dedent(mesh.split('    ignored_reference_images = 0\n',1)[1].split('    scene = bpy.data.scenes.new(',1)[0])
guard='ignored_reference_images = 0\n'+guard
class Screen: pass
class Object:
    def __init__(self, kind, data): self.type,self.data=kind,data
class Material: pass
class Image:
    def __init__(self, path, packed=False):
        self.source,self.packed_file,self.filepath='FILE',packed,str(path)
        self.has_data=False
        self.size=(0,0)
    def reload(self):
        self.has_data=Path(self.filepath).is_file()
        self.size=(4,4) if self.has_data else (0,0)
class Images(list):
    def remove(self, image, do_unlink=False):
        assert do_unlink
        super().remove(image)
with tempfile.TemporaryDirectory() as folder:
    source=Path(folder)/'animal.blend'
    local=Path(folder)/'valid.png'
    local.write_bytes(b'\x89PNG\r\n\x1a\n'+b'texture')
    (Path(folder)/'bad.png').write_bytes(b'invalid')
    for owner_kind, allowed in [('none',True),('screen',True),('empty',True),('material',False),('mesh',False),('mixed',False),('local',True),('packed',True),('legacy',True),('invalid',False)]:
        original=local if owner_kind=='local' else r'C:\old\valid.png' if owner_kind=='legacy' else r'C:\old\bad.png' if owner_kind=='invalid' else Path(folder)/'missing.png'
        im=Image(original,owner_kind=='packed')
        owners={'none':set(),'screen':{Screen()},'empty':{Object('EMPTY',im)},'material':{Material()},'mesh':{Object('MESH',im)},'mixed':{Screen(),Material()},'local':{Material()},'packed':{Material()},'legacy':{Material()},'invalid':{Material()}}[owner_kind]
        images=Images([im])
        bpy=SimpleNamespace(data=SimpleNamespace(images=images,user_map=lambda:{im:owners}),path=SimpleNamespace(abspath=lambda p:p),types=SimpleNamespace(Screen=Screen,Object=Object))
        scope=dict(Path=Path,source=source,bpy=bpy,re=re)
        try:
            exec(guard,scope)
        except ValueError as error:
            assert not allowed and str(error)=='SOURCE_PREVIEW_EXTERNAL_OR_MISSING_TEXTURE',owner_kind
            assert images==[im]
        else:
            assert allowed,owner_kind
            preserved=owner_kind in ('local','packed','legacy')
            assert (images==[im])==preserved,owner_kind
            assert scope['ignored_reference_images']==(0 if preserved else 1),owner_kind
            assert scope['restored_texture_references']==(1 if owner_kind=='legacy' else 0),owner_kind
            if owner_kind=='legacy': assert im.filepath==str(local)
print('MARE_REFERENCE_TEXTURE_FIXTURES=10')
`;
  assert.match(execFileSync('python3',['-c',textureGuardFixture],{encoding:'utf8',timeout:15000}),/MARE_REFERENCE_TEXTURE_FIXTURES=10/);

  assert.match(mesh,/'visualQualityApproved': False, 'registrationApproved': False/);
  assert.match(workflow,/--animal-preview-dir=/);
  assert.match(workflow,/retention-days: 3/);
  assert.match(workflow,/--animal-source-visual-review=/);
  assert.match(source,/failureReason/);
  assert.match(source,/MARE_ANIMAL_RENDER_DIAGNOSTIC/);
  assert.match(source,/failureDiagnostic/);
  assert.match(source,/SOURCE_PREVIEW_GPU_CONTEXT/);
  assert.match(source,/SOURCE_PREVIEW_PYTHON_EXCEPTION/);
  assert.match(mesh,/MARE_SOURCE_PREVIEW_STAGE IMPORT/);
  assert.match(mesh,/MARE_SOURCE_PREVIEW_STAGE SCENE/);
  assert.match(mesh,/MARE_SOURCE_PREVIEW_STAGE RENDER_/);
  assert.ok(workflow.includes("blender --version"));
  const uploader=fs.readFileSync('tools/mare-essentia-upload-assets.mjs','utf8');
  assert.match(uploader,/SOURCE_VISUAL_FRAME_HASH/);
  assert.match(uploader,/VIBE2_GEMINI_FREE_TIER_VERIFIED==='YES'/);
  assert.match(uploader,/buildProviders\(/);
  assert.match(uploader,/askChain\(/);
  assert.match(uploader,/FREE_VISION_BILLING_BLOCKED/);
  assert.match(source,/SOURCE_PREVIEW_EXTERNAL_OR_MISSING_TEXTURE/);
  assert.match(source,/VERIFIED_GLB_PRIORITY_ORIGINAL_TEXTURE_UNRESOLVED/);
  assert.match(source,/MARE_ANIMAL_TEXTURE_ALTERNATE_PRIORITY/);
  const alternateRetryFixture=String.raw`
from pathlib import Path
import textwrap
source=Path('tools/devloop/assets_wanted.py').read_text(encoding='utf8')
block=textwrap.dedent(source.split('    deferred = []\n',1)[1].split('    fresh = ',1)[0])
def check(observation, expected_first, alternatives=True):
    old={'name':'hippo','targets':['zoo_hippo'],'priorRenderRetry':True,'priorRenderFailureReason':'SOURCE_PREVIEW_EXTERNAL_OR_MISSING_TEXTURE'}
    other={'name':'goat','priorRenderRetry':True}
    alt={'name':'hippo','targets':['zoo_hippo'],'directModel':True,'license':'CC0-1.0','geometry':{'triangles':382},'modelMembers':[{'sha256':'exact'}],'sourceVisualObservation':observation}
    retry=[other,old]
    scope={'ordered':[other,old,alt] if alternatives else [other,old],'retry':retry,'deferred':[]}
    exec(block,scope)
    assert retry[0]['name']==expected_first
    if alternatives:
        assert old in scope['deferred'] and old not in retry
        assert old['sourcePreview']['registrationApproved'] is False
        assert old['sourcePreview']['visualQualityApproved'] is False
    else:
        assert old in retry and not scope['deferred']
check({},'hippo')
valid={'state':'SOURCE_VISUAL_OBSERVED_ONLY','sourceMemberSha256':'exact','contentSafe':True,'speciesMatch':True,'uncertain':False}
check(valid,'goat')
check(dict(valid,sourceMemberSha256='stale'),'hippo')
check({},'goat',False)
print('MARE_ALTERNATE_RETRY_FIXTURES=4')
`;
  assert.match(execFileSync('python3',['-c',alternateRetryFixture],{encoding:'utf8',timeout:15000}),/MARE_ALTERNATE_RETRY_FIXTURES=4/);
  assert.match(source,/"directModel": True/);
  assert.match(source,/SOURCE_PREVIEW_DIRECT_EVIDENCE/);
  assert.match(source,/restore_pinned_animal_glb\(proof, source\)/);
  assert.match(source,/HELD_SOURCE_RESTORE_HASH/);
  assert.match(workflow,/MARE_ANIMAL_RESTORED_PROOF_INVALID/);
  assert.match(workflow,/MARE_ANIMAL_PUBLISHER_PROOF_INVALID/);
  assert.ok(source.includes('report["downloadAttempts"] = restore_attempts'));
  assert.ok(source.includes('if report["downloadAttempts"] >= 3:'));
  assert.ok(source.includes('report["downloadAttempts"] += 1'));
  assert.ok(workflow.includes('len(restored)+len(acquired)<=attempts<=3'));
  assert.match(source,/PUBLISHER_FREE_CATALOG_HELD_ONLY/);
  assert.match(workflow,/inbox-hold\/Animals/);
  assert.match(workflow,/GEMINI_API_KEY:.*VIBE2_GEMINI_FREE_TIER_VERIFIED == 'YES'/);
  assert.match(uploader,/LOCAL_VISION_NOT_CONFIGURED/);
  assert.match(uploader,/SOURCE_VISUAL_OBSERVED_ONLY/);
  assert.match(uploader,/PARTIAL_SOURCE_OBSERVATION_RETRY_REQUIRED/);
  assert.match(uploader,/FREE_QUOTA_LIMIT/);
  assert.match(source,/SOURCE_GEOMETRY_REPAIR_REQUIRED/);
  assert.match(source,/\(retry, 1\), \(quality, 1\), \(preferred, 1\), \(fresh, 3\)/);
  assert.match(mesh,/CATMULL_CLARK_BUDGETED_ONE_LEVEL/);
  assert.match(mesh,/ANIMAL_QUALITY_WEIGHT_INVALID/);
  assert.match(source,/ANIMAL_QUALITY_CANDIDATE_REGRESSION/);
  assert.match(source,/QUALITY_CANDIDATE_RENDERED_AWAITING_COMPARISON/);
  assert.match(source,/ANIMAL_QUALITY_CANDIDATE_FRAME_HASH/);
  assert.match(uploader,/SOURCE_QUALITY_MODEL_HASH/);
  assert.match(uploader,/sets\.push\(\{directory:key\+'\/quality',frames:quality\.frames\}\)/);
  assert.match(uploader,/QUALITY_COMPARISON_OBSERVED_ONLY/);
  assert.match(uploader,/QUALITY_COMPARISON_CONTENT_BLOCKED/);
  assert.match(uploader,/candidateFrameSha256:quality\.frames\.map/);
  assert.match(uploader,/row\.sourceVisualLastAttempt=review/);
  assert.match(source,/row\["lastQualityComparison"\] = comparison/);
  assert.match(source,/"QUALITY_COMPARISON_OBSERVED_ONLY", "QUALITY_COMPARISON_CONTENT_BLOCKED"/);
  assert.match(workflow,/mare-animal-source-preview\/\*\*\/quality\.glb/);
  execFileSync('python3',['-c',"import ast,pathlib; [ast.parse(pathlib.Path(p).read_text(encoding='utf-8')) for p in ('tools/vibe_mesh_audit.py','tools/devloop/assets_wanted.py')]"],{timeout:15000});
  assert.match(source,/HEAD:.*assets-wanted\.json/);
  assert.match(uploader,/registrationApproved:false,visualQualityApproved:false/);
  assert.match(workflow,/MARE_ANIMAL_PREVIEW:.*github\.event_name == 'schedule'.*\[mare-animal-preview\].*inputs\.animal_preview == true.*inputs\.studio_regrant != true/);
  assert.equal((workflow.match(/always\(\) && env\.MARE_ANIMAL_PREVIEW == 'true'/g)||[]).length,2);
  assert.match(workflow,/if \[\[ "\$MARE_ANIMAL_PREVIEW" == "true" \]\]; then/);
});

// [동물 원본 기하 QA] 실제 바이너리 접근 범위·인덱스·모바일 예산을 확인한다.
test('Mare held animal mesh geometry rejects malformed bytes and cannot grant visual approval',()=>{
  const script=String.raw`
import ast, csv, json, struct, math, hashlib, os, re, tempfile, http.client
from unittest.mock import patch
from pathlib import Path
tree=ast.parse(Path('tools/devloop/assets_wanted.py').read_text(encoding='utf-8'))
names={'inspect_held_animal_glb','restore_pinned_animal_glb','gobkit_animal_sources','read_gobkit_free','scene_source_targets'}
exec(compile(ast.Module(body=[node for node in tree.body if isinstance(node,ast.FunctionDef) and node.name in names],type_ignores=[]),'assets_wanted.py','exec'))
def glb(triangles=1000, bad_index=False, nan=False, negative_accessor=False, external=False, invalid_joint=False):
    pos=struct.pack('<9f',0,0,0,1,0,0,0,1,float('nan') if nan else 0)
    idx=struct.pack('<'+'H'*(3*triangles),*([0,1,3 if bad_index else 2]*triangles))
    binary=pos+idx
    model={'asset':{'version':'2.0'},'buffers':[{'byteLength':len(binary)}], 'bufferViews':[{'buffer':0,'byteLength':len(pos)},{'buffer':0,'byteOffset':len(pos),'byteLength':len(idx)}], 'accessors':[{'bufferView':0,'componentType':5126,'count':3,'type':'VEC3'},{'bufferView':1,'componentType':5123,'count':3*triangles,'type':'SCALAR'}], 'meshes':[{'primitives':[{'attributes':{'POSITION':-1 if negative_accessor else 0},'indices':1}]}]}
    if external: model['buffers'][0]['uri']='file.bin'
    if invalid_joint: model['skins']=[{'joints':[9]}]
    meta=json.dumps(model).encode();meta+=b' '*((-len(meta))%4); binary+=b'\x00'*((-len(binary))%4)
    return b'glTF'+struct.pack('<III',2,28+len(meta)+len(binary),len(meta))+b'JSON'+meta+struct.pack('<I',len(binary))+b'BIN\x00'+binary
assert inspect_held_animal_glb(glb())=={'triangles':1000,'jointCount':0,'animationCount':0,'mobileGeometryWithinBudget':True,'speciesVerified':False,'visualQualityApproved':False}
assert inspect_held_animal_glb(glb(999))['mobileGeometryWithinBudget'] is False
assert inspect_held_animal_glb(glb(3001))['mobileGeometryWithinBudget'] is False
for option,reason in [('bad_index','GLB_INDEX_RANGE'),('nan','GLB_NONFINITE_POSITION'),('negative_accessor','GLB_ACCESSOR_INDEX'),('external','GLB_EXTERNAL_OR_INVALID_BUFFER'),('invalid_joint','GLB_INVALID_JOINT')]:
    try: inspect_held_animal_glb(glb(**{option:True}))
    except ValueError as e: assert str(e)==reason,(option,e)
    else: raise AssertionError(option)
print('MARE_HELD_ANIMAL_GEOMETRY_FIXTURES=8')
data=glb()
digest=hashlib.sha256(data).hexdigest()
proof={'source':'https://github.com/owner/repo/blob/'+'a'*40+'/animal/Goat.glb',
       'license':'CC0-1.0','commercialUseAllowed':True,'bytes':len(data),'triangles':1000,
       'sourceSha256':digest,'originalSha256':digest,
       'pinnedBlobSha':hashlib.sha1(('blob %d\0'%len(data)).encode()+data).hexdigest()}
with tempfile.TemporaryDirectory() as dest:
    target=str(Path(dest)/'goat.glb')
    with patch.object(http.client,'HTTPSConnection') as connection:
        response=connection.return_value.getresponse.return_value
        response.status=200
        response.read.return_value=data
        assert restore_pinned_animal_glb(proof,target)==data
        assert Path(target).read_bytes()==data
        connection.assert_called_once_with('raw.githubusercontent.com',timeout=25)
        assert connection.return_value.request.call_args.args==('GET','/owner/repo/'+'a'*40+'/animal/Goat.glb')
        response.read.assert_called_once_with(len(data)+1)
        for case, expected in [(proof,'HELD_SOURCE_RESTORE_NOT_PINNED_OR_EXISTS')]:
            try: restore_pinned_animal_glb(case,target)
            except ValueError as e: assert str(e)==expected
            else: raise AssertionError('overwrite allowed')
        Path(target).unlink()
        for case,status,body,expected in [
            ({**proof,'source':'https://example.com/Goat.glb'},200,data,'HELD_SOURCE_RESTORE_NOT_PINNED_OR_EXISTS'),
            ({**proof,'license':'CC-BY-4.0'},200,data,'HELD_SOURCE_RESTORE_PROVENANCE'),
            (proof,302,data,'HELD_SOURCE_RESTORE_HTTP'),
            (proof,200,data+b'x','HELD_SOURCE_RESTORE_HASH'),
            (proof,200,b'x'+data[1:],'HELD_SOURCE_RESTORE_HASH'),
            ({**proof,'triangles':999},200,data,'HELD_SOURCE_RESTORE_GEOMETRY')]:
            response.status=status
            response.read.return_value=body
            try: restore_pinned_animal_glb(case,target)
            except ValueError as e: assert str(e)==expected,(expected,e)
            else: raise AssertionError(expected)
            assert not Path(target).exists()
print('MARE_HELD_ANIMAL_RESTORE_FIXTURES=8')
license_text='CC0 1.0 (public domain) — free for any use, commercial or personal, no attribution required.'
url='https://gobkit.com/freebies/animal013/Pigeon.glb'
entry={'name':'Pigeon','format':'glb','url':url,'license':license_text}
def catalog(model, listed=True):
    return {'schemaVersion':2,'glbs':[url] if listed else [],'packs':[{'models':[model]}]}
assert gobkit_animal_sources(catalog(entry),['pigeon','penguin'])=={'pigeon':{'name':'Pigeon','url':url,'license':license_text}}
assert gobkit_animal_sources(catalog(entry,False),['pigeon'])=={}
assert gobkit_animal_sources(catalog({**entry,'license':'CC BY'}),['pigeon'])=={}
assert gobkit_animal_sources(catalog({**entry,'name':'Rockhopper Penguin'}),['penguin'])=={}
assert gobkit_animal_sources(catalog({**entry,'url':'https://example.com/Pigeon.glb'}),['pigeon'])=={}
assert gobkit_animal_sources(catalog({**entry,'name':'Sea Otter'}),['sea_otter'])['sea_otter']['url']==url
with patch.object(http.client,'HTTPSConnection') as connection:
    response=connection.return_value.getresponse.return_value
    response.status=200
    response.read.return_value=b'123'
    assert read_gobkit_free('/api/free',3)==b'123'
    response.read.assert_called_once_with(4)
    for path,status,body in [('/api/free',302,b'123'),('/api/free',200,b'1234'),('/redirect',200,b'123')]:
        response.status=status
        response.read.return_value=body
        try: read_gobkit_free(path,3)
        except ValueError: pass
        else: raise AssertionError('unsafe publisher download')
print('MARE_ANIMAL_PUBLISHER_FIXTURES=10')
with tempfile.TemporaryDirectory() as root:
    docs=Path(root)/'docs'
    ports=docs/'ports'
    ports.mkdir(parents=True)
    tick=chr(96)
    (ports/'README.md').write_text('| [A](a.md) | x |\n| [B](b.md) | x |\n',encoding='utf-8')
    (ports/'a.md').write_text('#### '+tick+'a_house_1'+tick+' — house\n- building · 1단계 · size\n#### '+tick+'a_lamp'+tick+' — lamp\n- lamp · 3단계 · size\n',encoding='utf-8')
    (ports/'b.md').write_text('#### '+tick+'b_house_1'+tick+' — house\n- building · 1단계 · size\n',encoding='utf-8')
    (docs/'port_asset_prompts.csv').write_text('port_id,asset_id,tier\na,a_house_1,1\nb,b_plaza,2\nb,a_unrelated,2\n',encoding='utf-8')
    (docs/'battle_backdrops').mkdir()
    (docs/'battle_backdrops'/'backdrop_prompts.csv').write_text('category,asset_id\nfield,field_one\nnaval-near,sea_test_near\nnaval-far,sea_test_far\nnaval-mid,sea_test_mid\n',encoding='utf-8')
    (docs/'battle_backdrops'/'quests.md').write_text('| Test ('+tick+'q_test'+tick+') | field | current site |\n| Sea ('+tick+'q_sea'+tick+') | war_clear | naval/test.md |\n',encoding='utf-8')
    shared=Path(root)/'src'/'ReplicatedStorage'/'Shared'
    shared.mkdir(parents=True)
    (shared/'Pose.luau').write_text('"hair_test"',encoding='utf-8')
    (docs/'residents').mkdir()
    (docs/'residents'/'jobs.md').write_text('| Sailor ('+tick+'sailor'+tick+') | x |',encoding='utf-8')
    (docs/'discoveries').mkdir()
    (docs/'discoveries'/'MISSING.md').write_text('- zoo_otter test',encoding='utf-8')
    seed=[]
    missing=[('example.luau','Monsters/example')]
    hold=Path(root)/'assets'/'inbox-hold'/'Town'
    hold.mkdir(parents=True)
    (hold/'gobkit-free-a_lamp.glb').touch()
    (hold/'gobkit-free-a_lamp.glb.license.json').touch()
    status={}
    battle_status={}
    outstanding=scene_source_targets({'Town/a_house_1':{'assetId':'10','assetType':'Model','usePermissionGranted':True},
                                      'Town/b_house_1':{'assetId':'11','assetType':'Image','usePermissionGranted':True},
                                      'Naval/sea_test_far':{'assetId':'12','assetType':'Model','usePermissionGranted':True}},status,battle_status)
    assert status['portCount']==2 and status['planned']==4 and status['registeredModelRights']==1
    assert status['heldUnverified']==1 and status['missingOriginal']==2
    assert status['nativeRuntimeVerified'] is False and status['visualQualityApproved'] is False
    assert status['ports'][0]['stages']['3']=={'planned':1,'registeredModelRights':0}
    assert status['ports'][1]['nextMissing']==[{'assetKey':'Town/b_house_1','tier':1},{'assetKey':'Town/b_plaza','tier':2}]
    assert outstanding['hair_test']=='People' and outstanding['example']=='Monsters'
    assert outstanding['sailor_work']=='Motion' and outstanding['otter_rig']=='Rig'
    assert {k:v for k,v in outstanding.items() if v in ('Town','Naval','Terrain')}=={'a_lamp':'Town','b_house_1':'Town','b_plaza':'Town','field_one':'Terrain','sea_test_near':'Naval','sea_test_mid':'Naval'}
    assert battle_status['seaCount']==1 and battle_status['siteCount']==1 and battle_status['questBriefCount']==2
    assert battle_status['planned']==4 and battle_status['registeredModelRights']==1 and battle_status['missingOriginal']==3
    assert battle_status['seas'][0]['layers']['far']['state']=='REGISTERED_MODEL_RIGHTS'
    assert battle_status['sites'][0]['siteId']=='one'
    assert battle_status['quests'][0]['route']=='CURRENT_EXPLORATION_SITE'
    assert battle_status['quests'][1]['explicitSeaCandidates']==['test']
    assert battle_status['nativeRuntimeVerified'] is False and battle_status['quests'][1]['runtimeRouteVerified'] is False
print('MARE_PORT_BRIEF_COVERAGE_FIXTURES=7')
print('MARE_BATTLE_BRIEF_COVERAGE_FIXTURES=7')
`;
  const output=execFileSync('python3',['-c',script],{encoding:'utf8',timeout:15000});
  assert.match(output,/MARE_HELD_ANIMAL_GEOMETRY_FIXTURES=8/);
  assert.match(output,/MARE_HELD_ANIMAL_RESTORE_FIXTURES=8/);
  assert.match(output,/MARE_ANIMAL_PUBLISHER_FIXTURES=10/);
  assert.match(output,/MARE_PORT_BRIEF_COVERAGE_FIXTURES=7/);
  assert.match(output,/MARE_BATTLE_BRIEF_COVERAGE_FIXTURES=7/);
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

// [실제 가축 골격 QA] 정적 Quaternius 원본은 보존하고 스킨 가중치와 전신 관절 클립을 검증한다.
test('Mare donkey rig candidate keeps original geometry and has real skinned joint animations',()=>{
  const root='roblox-games/mare-essentia/assets/animals/';
  const original=fs.readFileSync(root+'donkey.glb');
  const rig=fs.readFileSync(root+'donkey-rig.glb');
  const read=bytes=>JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString('utf8'));
  const src=read(original),doc=read(rig);
  assert.equal(rig.subarray(0,4).toString('ascii'),'glTF');
  assert.equal(rig.readUInt32LE(8),rig.length);
  assert.equal(doc.meshes.length,src.meshes.length);
  assert.deepEqual(doc.materials,src.materials,'original eight Quaternius materials preserved');
  assert.deepEqual(doc.meshes[0].primitives.map(p=>p.material),src.meshes[0].primitives.map(p=>p.material));
  assert.equal(doc.skins.length,1);
  assert.equal(doc.skins[0].joints.length,12);
  assert.ok(doc.nodes.some(n=>n.name==='front_left_knee'));
  assert.ok(doc.nodes.some(n=>n.name==='rear_right_knee'));
  assert.ok(doc.nodes.some(n=>n.name==='donkey_neck'));
  assert.ok(doc.nodes.some(n=>n.name==='donkey_tail'));
  for(const prim of doc.meshes[0].primitives){
    assert.ok(Number.isInteger(prim.attributes.JOINTS_0));
    assert.ok(Number.isInteger(prim.attributes.WEIGHTS_0));
    const pos=doc.accessors[prim.attributes.POSITION];
    assert.equal(doc.accessors[prim.attributes.JOINTS_0].count,pos.count);
    assert.equal(doc.accessors[prim.attributes.WEIGHTS_0].count,pos.count);
  }
  // GLB BIN 청크 헤더는 JSON 끝에 위치한다. 길이/타입 8바이트 뒤부터 실제 메시 데이터다.
  const staticBin=20+original.readUInt32LE(12);
  const rigBin=20+rig.readUInt32LE(12);
  assert.equal(original.readUInt32LE(staticBin+4),0x004e4942);
  assert.equal(rig.readUInt32LE(rigBin+4),0x004e4942);
  const originalLen=original.readUInt32LE(staticBin);
  const rigLen=rig.readUInt32LE(rigBin);
  assert.ok(originalLen>0&&rigLen>=originalLen);
  assert.equal(staticBin+8+originalLen,original.length);
  assert.equal(rigBin+8+rigLen,rig.length);
  // 전체 바이너리를 바이트 단위 비교하되 실패 시 거대한 배열 차이를 생성하지 않는다.
  assert.ok(rig.subarray(rigBin+8,rigBin+8+originalLen).equals(original.subarray(staticBin+8,staticBin+8+originalLen)),'original mesh BIN must be bit-identical');
  assert.deepEqual(doc.animations.map(a=>a.name),['idle','walk','trot','graze','drink','shake']);
  assert.ok(doc.animations.every(a=>a.channels.length>=11));
  assert.match(fs.readFileSync('tools/mare-essentia-upload-assets.mjs','utf8'),/await prepareDonkeyRig\(\)/);
  const license=JSON.parse(fs.readFileSync(root+'donkey-rig.glb.license.json','utf8'));
  assert.equal(license.license,'CC0-1.0');
  assert.equal(license.sourceGitBlobSha1,'408de349a14a3d270441fc61033f09646cdca866');
  assert.equal(license.runtimeVerified,false,'new asset cannot auto-replace existing donkey without Roblox visual QA');
});

// [주민 정면] 얼굴 표면은 머리의 원본 데칼 면을 따라야 한다. 몸통 축으로 반대쪽에 덧그리지 않는다.
test('Mare R15 faces use their native head front and stationary villagers greet nearby players',()=>{
  const pose=fs.readFileSync('roblox-games/mare-essentia/src/ReplicatedStorage/Shared/Pose.luau','utf8');
  const port=fs.readFileSync('roblox-games/mare-essentia/src/ReplicatedStorage/Shared/PortScene.luau','utf8');
  assert.match(pose,/decal = head:FindFirstChildWhichIsA\("Decal"\)/);
  assert.match(pose,/decal\.Face = Enum\.NormalId\.Front/);
  assert.doesNotMatch(pose,/head\.CFrame:VectorToObjectSpace\(root\.CFrame\.LookVector\)/);
  assert.match(pose,/pcall\(drawFace, headPart\)/);
  assert.match(port,/local guestRoot = character and character:FindFirstChild\("HumanoidRootPart"\)/);
  assert.match(port,/elseif guestRoot then guestRoot\.Position elseif cam then cam\.CFrame\.Position else nil/);
  assert.match(port,/local nearGuest = flat\.Magnitude > 1 and flat\.Magnitude < 26/);
  assert.match(port,/local canFaceGuest = w\.kind == "talk" or w\.kind == "stall" or w\.kind == "look" or w\.kind == nil/);
  assert.match(port,/if nearGuest and canFaceGuest and \(not partner or flat\.Magnitude < 12\) then/);
  assert.match(port,/target, direction = 1, flat/);
  assert.match(port,/w\.model:PivotTo\(CFrame\.new\(pos \+ Vector3\.new\(0, bob, 0\)\) \* CFrame\.Angles\(0, yaw, 0\) \* rot\)/);
});

// [탐험 전투] 기존 판정·무기 목록은 보존하고, 화면 이동·두 무기·이미지 가독성을 검증한다.
test('Mare field charge, noncombat party, two-weapon quick swap and approved skill art stay coherent',()=>{
  const field=fs.readFileSync('roblox-games/mare-essentia/src/ReplicatedStorage/Shared/FieldScene.luau','utf8');
  const weapons=fs.readFileSync('roblox-games/mare-essentia/src/ReplicatedStorage/Shared/Weapons.luau','utf8');
  const assets=JSON.parse(fs.readFileSync('roblox-games/mare-essentia/assets-registered.json','utf8')).assets;
  assert.ok(field.includes('e.chargeTarget = e.model:GetPivot().Position + to.Unit * reach'));
  assert.ok(field.includes('desired = remaining.Unit * math.min(48, remaining.Magnitude / math.max(dtc, 0.016))'));
  assert.ok(!field.includes('e.model:PivotTo(e.model:GetPivot() + to.Unit * step)'),'no one-frame enemy charge teleport');
  assert.ok(field.includes('math.min(e.ac.def.speed * 0.8, flat.Magnitude / math.max(dtc, 0.016))'),'enemy speed respects frame lag');
  assert.doesNotMatch(field,/pcall\(Pose\.createR15, folder, pos0|a\.focus = tgt|root0\.CFrame \* CFrame\.new\(if a\.slot/,'solo combat must not spawn or command companion combat actors');
  assert.match(field,/local party = if type\(opts\.allies\) == "table" then opts\.allies else \{\}/);
  assert.match(field,/for _, member in party do\s*if count >= 2 then break end/);
  assert.match(field,/status:SetAttribute\("CompanionId", member\.id\)\s*status:SetAttribute\("CombatEnabled", false\)/);
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
test('Mare exploration preserves combat rules while preserving noncombat party and containing cancelled scene builds',()=>{
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
  assert.doesNotMatch(field,/local pos0 = Vector3\.new\(footX|pcall\(Pose\.createR15, folder, pos0/,'no combat companion spawn in solo field');
  assert.match(field,/local companionRows: \{ any \} = \{\}/);
  assert.match(pose,/function Pose\.createR15\(parent, bottomPosition,/);
  assert.match(field,/status:SetAttribute\("CombatEnabled", false\)/);
  assert.match(field,/ui\.portrait = opts\.allyPortraits and opts\.allyPortraits\[member\.id\]/);
  assert.match(field,/local visualTreeCount = treeCount/);
  assert.match(field,/local visualRockCount = rockCount/);
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
  assert.match(field,/local template = animalShelf:FindFirstChild\(species\)\s*if AssetIds\["Animals\/" \.\. species\] and template and template:IsA\("Model"\) then\s*table.insert\(available, species\)/);
  assert.match(field,/if #available == 0 then return end/);
  assert.match(field,/local species = available\[wildlifeRng:NextInteger\(1, #available\)\]/);
  assert.match(field,/local model = placeModel\(folder, "Animals", species, pos, visual.size, false, Color3.fromRGB\(table.unpack\(visual.coats\[coatIndex\]\)\)\)/);
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
  assert.match(battle,/cam\.FieldOfView = \(if opts\.cardOnly then \(if MOBILE_VFX then 73 else 75\) else \(if MOBILE_VFX then 69 else 71\)\) - kick \* 0\.6 \+ math\.min\(shake, 2\.5\) \* 2 \+ \(me\.speed \/ myTop\) \* 5 \+ killZoom - FX\.boardZoom \* \(17 \+ math\.clamp\(me\.fx\.stage or 2, 1, 6\) \* 0\.6\)/,'boarding zoom stays tier-scaled while mobile and desktop preserve independent camera limits');
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
  assert.ok(battle.includes('skip = mkBtn("건너뛰기", UDim2.new(0, 12, 0, if battleViewport.X < 480 then 181 else 119)'));
  assert.ok(battle.includes('local coasts = {'));
  for(const id of ['cliff-rock','tropical-palm-tall','ruins-pillar-decorated','north-pine-fall','egypt-obelisk']){
    assert.ok(assetIds.includes('"Terrain/'+id+'"'),'battle coast must use a registered mesh: '+id);
  }
  assert.ok(battle.includes('AssetIds["Terrain/" .. spec[1]]'));
  assert.ok(battle.includes('node.CanCollide, node.CanTouch, node.CanQuery = false, false, false'));
  assert.match(battle,/local broadside = if dd > 0\.1 then math\.abs\(heading:Cross\(direction\.Unit\)\.Y\) else 0/);
  assert.match(battle,/local enemyBearing = if dd > 0\.1 then math\.atan2\(direction\.Z, direction\.X\) else me\.theta\s*local turnLeft = \(enemyBearing \+ math\.pi \/ 2 - me\.theta \+ math\.pi\) % \(math\.pi \* 2\) - math\.pi\s*local turnRight = \(enemyBearing - math\.pi \/ 2 - me\.theta \+ math\.pi\) % \(math\.pi \* 2\) - math\.pi\s*local turnNeeded = if math\.abs\(turnRight\) < math\.abs\(turnLeft\) then turnRight else turnLeft/);
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
  assert.match(src,/tactic\.Size = UDim2\.fromOffset\(math\.min\(168, math\.floor\(battleViewport\.X \* 0\.42\), if battleViewport\.X < 480 then math\.max\(80, battleViewport\.X - 206\) else 168\), 26\)/);
  assert.match(src,/tactic\.TextScaled = false/,'mobile HUD must retain readable fixed-size type');
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
  assert.match(src,/for index, spec in coast\.props do\s*if not MOBILE_VFX or index <= 3 then table\.insert\(shoreModels, spec\) end/,'mobile mid-shore cap remains three');
  assert.match(src,/for index, spec in depthCoast do\s*if \(not MOBILE_VFX or index <= 1\) and AssetIds\["Terrain\/" \.\. spec\[1\]\] then\s*table\.insert\(shoreModels, spec\)/,'mobile far-shore cap is one registered model');
  assert.match(src,/folder\.Destroying:Connect\(function\(\)[\s\S]*?colorGrade:Destroy\(\)/);
  const client=fs.readFileSync('roblox-games/mare-essentia/src/StarterPlayer/Game.client.luau','utf8');
  assert.match(client,/portLat = view\.player and PortData\.Ports\[view\.player\.portId\]/);
  assert.match(client,/portLon = view\.player and PortData\.Ports\[view\.player\.portId\]/);
  assert.match(src,/local steerCue = if turnNeeded >= 0 then "우현으로 조타" else "좌현으로 조타"/);
  assert.match(src,/if not inRange then "적선에 접근" elseif not aligned then steerCue else ""/);
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
    'local skip = mkBtn("건너뛰기", UDim2.new(0, 12, 0, if battleViewport.X < 480 then 181 else 119)',
    'if battleViewport.X < 480 then 56 else 96',
    'sailLabel.Position = UDim2.new(0.5, 0, 0, if battleViewport.X < 480 then 69 else 44)',
    'f.Visible = star or battleViewport.X >= 720',
    'navalHitCue.Visible = false',
    'navalHitCue.Name = "NavalHitStreak"',
    'navalHitCue.Position = UDim2.fromOffset(16, if battleViewport.X < 480 then 225 elseif battleViewport.Y < 420 then 199 else 204)',
    'math.min(182, math.max(80, math.floor((battleViewport.X - 206) / 1.08)))',
    'navalHitCueScale.Scale = 1.08',
    'subtitle.Visible = opts.cardOnly or battleViewport.X >= 1000',
    'tactic.Position = UDim2.fromOffset(16, 126)',
    'math.min(168, math.floor(battleViewport.X * 0.42), if battleViewport.X < 480 then math.max(80, battleViewport.X - 206) else 168)',
    'panel.Position = UDim2.new(1, -16, 0, if battleViewport.X < 480 then 120 elseif battleViewport.X < 720 then 173 else 122)',
    'local availableHeight = if battleViewport.X < 480 then math.max(34, battleViewport.Y - 482)',
    'sk.x = -72',
    'sk.y = if i == 1 then -300 else -184',
    'if compact then 104 elseif MOBILE_VFX',
    'if compact then 86 elseif MOBILE_VFX',
    'local size = if compact then 76 elseif MOBILE_VFX',
    'stickBase.Position = UDim2.new(0, 28, 1, -28)',
    'stickBase.Size = UDim2.fromOffset(170, 170)',
    'distLabel.Visible = not opts.cardOnly and battleViewport.X >= 720',
    'skip.Size = if compactCards then UDim2.fromOffset(96, 40) else UDim2.fromOffset(112, 44)',
    'local panel = Instance.new("ScrollingFrame")',
    'panel.CanvasSize = UDim2.fromOffset(0, entriesHeight)',
    'panel.Visible = battleViewport.Y >= 380 and (battleViewport.X >= 720 or battleViewport.Y >= 520)',
    'math.min(entriesHeight, availableHeight)',
    'reloadBack.Visible = not opts.cardOnly',
    'local compactReload = battleViewport.X < 720 or battleViewport.Y < 420',
    'reloadBack.Parent = if compactReload then skillBtn.fire else gui',
    'reloadBack.Position = if compactReload then UDim2.new(0.5, 0, 0, 12)',
    'reloadBack.Size = if compactReload then UDim2.new(1, -42, 0, 19)',
    'reloadText.Text = if not inRange then "사거리 밖"',
  ]) assert.ok(battle.includes(token),'missing mobile-safe naval HUD binding: '+token);
  const intersects=(a,b)=>a.x<b.x+b.w && b.x<a.x+a.w && a.y<b.y+b.h && b.y<a.y+a.h;
  // [휴대전화 세로] 실제 104/86/76px 버튼, 전술판·카드 지원판·연타 확대 좌표를 검증한다.
  for(const w of [320,360,390,430]) for(const h of [520,560,640,844,932]) for(const entries of [1,4,12]){
    const stick={x:28,y:h-198,w:170,h:170};
    const speed={x:w-100,y:h-100,w:76,h:76};
    const fire={x:w-124,y:h-352,w:104,h:104};
    const special={x:w-115,y:h-227,w:86,h:86};
    const skip={x:12,y:181,w:56,h:36};
    const tactic={x:16,y:126,w:Math.min(168,Math.floor(w*0.42),Math.max(80,w-206)),h:26};
    const fleetLeft={x:16,y:66,w:96,h:46},fleetRight={x:w-112,y:66,w:96,h:46};
    const wind={x:(w-Math.max(80,w-240))/2,y:69,w:Math.max(80,w-240),h:20};
    const reload={x:fire.x+21,y:fire.y+12,w:62,h:19};
    const panel={x:w-182,y:120,w:166,h:Math.min(24+entries*30,Math.max(34,h-482))};
    const cue={x:16,y:225,w:Math.min(182,Math.max(80,Math.floor((w-206)/1.08)))*1.08,h:46*1.08};
    assert.ok(reload.x>=fire.x&&reload.x+reload.w<=fire.x+fire.w&&reload.y>=fire.y&&reload.y+reload.h<=fire.y+fire.h,'reload gauge must stay inside fire button');
    assert.ok(fire.y-(panel.y+panel.h)>=10,'scrolling panel must leave at least 10px before fire button');
    for(const [left,right] of [[stick,speed],[stick,fire],[stick,special],[speed,fire],[speed,special],[fire,special],[skip,tactic],[wind,fleetLeft],[wind,fleetRight],[reload,stick],[reload,special],[reload,panel],[panel,fire],[panel,special],[panel,speed],[panel,stick],[panel,tactic],[panel,skip],[cue,skip],[cue,panel],[cue,fire],[cue,stick]]){
      assert.equal(intersects(left,right),false,'phone HUD overlap at '+w+'x'+h+': '+JSON.stringify([left,right]));
    }
  }
  const seenStart=game.indexOf('function H.checkNewCards()');
  const seenEnd=game.indexOf('\nlocal function tierRows(',seenStart);
  const discovered=game.slice(seenStart,seenEnd);
  assert.ok(seenStart>0 && seenEnd>seenStart);
  assert.match(discovered,/H\.seenCards\[c\.id\] = true/,'real codex discovery bookkeeping remains');
  assert.match(discovered,/local firstKnowledgeSnapshot = H\.seenCards == nil/);
  assert.match(discovered,/local firstCombatSnapshot = H\.seenCombatCards == nil/);
  assert.match(discovered,/if not firstKnowledgeSnapshot then\s*table\.insert\(acquired, \{ card = c, extra = 0 \}\)/);
  assert.match(discovered,/if not firstCombatSnapshot then[\s\S]*?amount > \(oldOwned\[id\] or 0\)\s*and not gainedIds\[id\]/);
  assert.match(discovered,/H\.seenCombatCards = table\.clone\(owned\)/);
  assert.match(discovered,/H\.showCardGain\(found\.card, found\.extra\)/,'only genuine new discovery starts UI reveal');
  assert.match(discovered,/H\.cardGainQueue = H\.cardGainQueue or \{\}/,'multiple simultaneous gains are queued without modal scenes');
  assert.match(discovered,/rarity = if def\.hero then "Legendary" else "Common"/);
  assert.match(discovered,/extra = math\.max\(0, amount - oldCount - 1\)/);
  assert.match(discovered,/for _, entry in acquired do\s*table\.insert\(H\.cardGainQueue, entry\)/);
  assert.match(discovered,/if H\.cardGainPlaying then return end/);
  assert.match(discovered,/while player\.Parent and \(newGameMode or inField or sceneHold or H\.sceneBusy/);
  assert.match(discovered,/local found = table\.remove\(H\.cardGainQueue, 1\)/);
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
  assert.match(battle,/local power = nc\.ball \* \(splashScale or 1\)\s*if MOBILE_VFX and splashScale and splashScale < 0\.8 then\s*FX\.waterColumn\(Vector3\.new\(to\.X, ORIGIN\.Y \+ 0\.35, to\.Z\), style, power\)\s*else\s*local flight = Vector3\.new\(velocity\.X, 0, velocity\.Z\)\s*FX\.splash\(to, style, power, if flight\.Magnitude > 0 then flight\.Unit else nil\)/);
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
  assert.match(source,/local showDawn = opts\.cardOnly and AssetIds\[dawnBoardKey\] ~= nil/);
  assert.match(source,/boardArt.Name = "NavalCardBattleBoard"/);
  assert.match(source,/boardArt.ScaleType = Enum.ScaleType.Crop/);
  assert.match(source,/boardArt.ImageTransparency = if showDawn then 0 elseif opts\.cardOnly then \(if regionArtKey and AssetIds\[regionArtKey\] then 0\.25 else 0\.9\)/);
  assert.match(source,/elseif boardArtKey == "CardArt\/battle_board" then 0\.07 else 0\.58/);
  assert.match(source,/boardWash.Name = "BattleBoardContrast"/);
  assert.match(source,/boardShade.Parent = boardWash/);
  assert.match(source,/handTray.Name = "NavalCardHandTray"/);
    // 카드 전용 화면·일반 해전의 좌표를 둘 다 유지하는지 검사한다.
  assert.match(source,/handFrame.Position = if compactCards then UDim2.fromScale\(0\.018, 0\.716\) else UDim2.fromScale\(if opts\.cardOnly then 0\.025 else 0\.02, if opts\.cardOnly then 0\.665 else 0\.72\)/);
  assert.match(source,/boardFrame.Position = if compactCards then UDim2.fromScale\(0\.15, 0\.135\) else UDim2.fromScale\(if opts\.cardOnly then 0\.02 else 0\.2, if opts\.cardOnly then 0\.13 else 0\.14\)/);
  assert.match(source,/boardFrame.Size = if compactCards then UDim2.fromScale\(0\.838, 0\.57\) else UDim2.fromScale\(if opts\.cardOnly then 0\.76 else 0\.78, if opts\.cardOnly then 0\.52 else 0\.56\)/);
  assert.match(source,/local order = \{ \{ "foe", "ranged" \}, \{ "foe", "melee" \}, \{ "me", "melee" \}, \{ "me", "ranged" \} \}/);
  assert.match(source,/laneAccent.Name = "SideLaneAccent"/);
  assert.match(source,/laneStroke.Thickness = 1/);
  assert.match(source,/BC.rowMatchup\(m, side, row\)/);
  assert.match(source,/BC.play\(m, "me", i\)/);
  assert.match(source,/focusFrame.Size = UDim2.fromScale\(0\.9, 0\.82\)/);
  assert.match(source,/focusRatio.AspectRatio = if opts\.cardOnly then portraitCardRatio else 0\.69/);
  assert.match(source,/focusBounds.MaxSize = Vector2.new\(430, 620\)/);
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
  assert.ok(source.includes('local power = BC.cardPower(m, side, row, idx)'));
  assert.ok(source.includes('local playedCard = chip(cards, c, 62, power, c == lastPlayed.me or c == lastPlayed.foe)'));
  assert.ok(source.includes('playedCard.Activated:Connect(function()'));
  assert.ok(source.includes('showCardCodex(c, true)'),'played card must open read-only zoom');
  assert.ok(source.includes('focusUse.Visible = if leaderProfile then (leaderPreviewId ~= nil and m.turn == "me" and not m.over and not m.leaderUsed.me and not playing and not auto)'));
  assert.ok(source.includes('else not readOnly'),'deployed card remains read-only; leader ability only on valid turn');
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

// [카드 원화 무절단] 그림 비율이 달라도 손패·전투판·확대·도감에서 잘라내지 않는다.
test('Mare card art retains full source frame during battle animation and codex rendering', () => {
  const root = 'roblox-games/mare-essentia/src/';
  const battle = fs.readFileSync(root+'ReplicatedStorage/Shared/NavalBattle.luau','utf8');
  const deck = fs.readFileSync(root+'ReplicatedStorage/Shared/DeckBuilder.luau','utf8');
  const gallery = fs.readFileSync(root+'ReplicatedStorage/Shared/CardGallery.luau','utf8');
  const game = fs.readFileSync(root+'StarterPlayer/Game.client.luau','utf8');
  for (const token of ['painting.ScaleType = Enum.ScaleType.Fit',
    'focusImage.ScaleType = Enum.ScaleType.Fit',
    'image.ScaleType = Enum.ScaleType.Fit',
    'painting.Size = UDim2.fromScale(0.92, 0.92)',
    'local artZoom = 0.91 + (if focused then 0.005 else 0) + 0.01 * impact',
    'math.clamp(0.5 + (if opts.cardOnly then 0.012 * wind else pan - 0.045 * lunge + 0.02 * recoil), 0.486, 0.514)',
  ]) assert.ok(battle.includes(token), 'card image cropping regression: '+token);
  assert.doesNotMatch(battle, /(?:painting|focusImage|image)\.ScaleType = if opts\.cardOnly.*Enum\.ScaleType\.Crop/);
  assert.match(battle,/boardArt.ScaleType = Enum.ScaleType.Crop/,'board background is intentionally unaffected');
  assert.match(deck,/art.ScaleType = Enum.ScaleType.Fit\n\s*local asset = ctx.AssetIds\["CardArt\/" \.. option\[3\]\]/);
  assert.match(gallery,/art.ScaleType = Enum.ScaleType.Fit/);
  assert.match(game,/local function paintCardArt\(parent, card, fieldDef\)/);
  assert.match(game,/img.ScaleType = Enum.ScaleType.Fit/);
  assert.doesNotMatch(game,/if fitImage then Enum\.ScaleType\.Fit else Enum\.ScaleType\.Crop/);
});

// [유럽 원화 품질 회귀] 등록 자산 45장은 보존하고 검수된 세로 7:10 그림만 게임에 노출한다.
test('Mare European card art hides unverified ratios and styles without deleting any registered assets', () => {
  const root = 'roblox-games/mare-essentia/';
  const art = fs.readFileSync(root+'src/ReplicatedStorage/Shared/CardArt.luau','utf8');
  const battle = fs.readFileSync(root+'src/ReplicatedStorage/Shared/NavalBattle.luau','utf8');
  const client = fs.readFileSync(root+'src/StarterPlayer/Game.client.luau','utf8');
  const ids = fs.readFileSync(root+'src/ReplicatedStorage/Shared/AssetIds.luau','utf8');
  const approved = JSON.parse(fs.readFileSync(root+'assets/APPROVED_IMAGES.json','utf8'));
  const registered = JSON.parse(fs.readFileSync(root+'assets-registered.json','utf8'));
  const permitted = ['eu_18','eu_19','eu_20','eu_28'];
  const allowedBlock = art.match(/local ApprovedEuropeanArt: \{ \[string\]: boolean \} = \{([\s\S]*?)\n\}/);
  assert.ok(allowedBlock,'explicit European review gate required');
  const exposed = [...allowedBlock[1].matchAll(/^[ \t]*(eu_\d\d)[ \t]*=[ \t]*true,?[ \t]*(?:--[^\r\n]*)?$/gm)].map(m=>m[1]).sort();
  assert.deepEqual(exposed,permitted,'only portrait-verified European art may render');
  assert.match(art,/not string\.match\(cardId, "\^eu_%d%d\$"\) or ApprovedEuropeanArt\[cardId\]/);
  assert.match(battle,/string\.match\(card\.id, "\^eu_%d%d\$"\) and not CardArt\[card\.id\]/);
  assert.match(battle,/if string\.match\(card\.id, "\^eu_%d%d\$"\) and not CardArt\[card\.id\] then\s*return nil/);
  assert.match(client,/local imageId = if excludedEuropeanArt then nil else AssetIds\["CardArt\/" \.\. tostring\(card\.id\)\]/);
  assert.match(client,/local artImage = if excludedEuropeanArt then "" elseif imageId/);
  for (let n=1;n<=45;n++){
    const id='eu_'+String(n).padStart(2,'0');
    const key='CardArt/'+id;
    assert.ok(approved.approved[key],key+' approved source preserved');
    assert.ok(registered.assets[key]?.assetId,key+' Roblox asset preserved');
    const previous=registered.assets[key];
    assert.ok(ids.includes('["'+key+'"] = '+previous.assetId),key+' Luau ID unchanged');
    if (previous.sourceSha256!==approved.approved[key]) {
      // [원화 교체 대기] 기존 등록 이미지와 신규 검수 원본 양쪽의 실제 해시·권한을 검증한다.
      // 등록 완료 전 신규 원화가 게임에 노출되는 것은 허용하지 않는다.
      const review=approved.modelOriginals?.[key];
      assert.ok(!permitted.includes(id),key+' pending replacement must remain hidden');
      assert.equal(review?.replacesSha256,previous.sourceSha256,key+' previous source identity');
      assert.equal(String(review?.replacesAssetId),String(previous.assetId),key+' previous asset identity');
      assert.equal(previous.assetType,'Image');
      assert.equal(previous.usePermissionGranted,true);
      assert.match(String(previous.assetId),/^[1-9][0-9]*$/);
      assert.equal(review.sourceType,'IMAGE_GENERATION_MODEL');
      assert.equal(review.reviewer,'VIBE_AGENT_VISUAL_REVIEW');
      assert.equal(review.license,'PROJECT_ORIGINAL_ART');
      assert.match(review.reviewedAt,/^\d{4}-\d{2}-\d{2}$/);
      for(const field of ['subjectMatch','historicalContext','houseStyle','singleFinishedScene','noPartsOrSprites','robloxSafety','commercialRights'])
        assert.equal(review[field],true,key+' '+field);
      const oldPath='assets/cardart/'+id+'.png';
      const original='assets/cardart/src/'+id+'-original.png';
      const portrait='assets/cardart/src/'+id+'-1400x2000.png';
      assert.ok([original,portrait].includes(review.sourceFile),key+' replacement source path');
      const old=fs.readFileSync(root+oldPath);
      const next=fs.readFileSync(root+review.sourceFile);
      assert.equal(createHash('sha256').update(old).digest('hex'),previous.sourceSha256,key+' existing bytes preserved');
      assert.equal(createHash('sha256').update(next).digest('hex'),review.sourceSha256,key+' replacement bytes');
      assert.equal(review.sourceSha256,approved.approved[key],key+' replacement approved hash');
      assert.ok(next.length>=50000 && next.length<=20*1024*1024);
      assert.ok(next.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])));
      assert.equal(next.toString('ascii',12,16),'IHDR');
      const w=next.readUInt32BE(16),h=next.readUInt32BE(20);
      assert.ok(w>=768 && h>=768 && w<=4096 && h<=4096);
      assert.ok(Math.abs(w*10-h*7)<=h*0.05);
      if(review.sourceFile===portrait){assert.equal(w,1400);assert.equal(h,2000);}
      assert.equal(next[24],8);
      assert.ok([2,6].includes(next[25]),key+' true-color replacement required');
      const safety=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'))
        .livingMotionVisualQualityContract.assetAdaptation.contentSafety;
      assert.equal(safety.enabled,true);
      for(const blocked of safety.blockedAssets){
        assert.ok(!(blocked.sha256||[]).some(hash=>[previous.sourceSha256,review.sourceSha256].includes(hash)));
        assert.ok(!(blocked.assetIds||[]).map(String).includes(String(previous.assetId)));
        assert.ok(!(blocked.sourcePaths||[]).some(file=>[oldPath,review.sourceFile,root+oldPath,root+review.sourceFile].includes(file)));
      }
      console.log('MARE_CARD_REPLACEMENT_PENDING_REGISTRATION',key);
      continue;
    }
    assert.equal(previous.sourceSha256,approved.approved[key],key+' approved and registered SHA unchanged');
    if (!permitted.includes(id))continue;
    const review=approved.modelOriginals[key];
    assert.equal(review?.sourceSha256,approved.approved[key],key+' model original reviewed');
    assert.equal(review?.subjectMatch,true);
    assert.equal(review?.houseStyle,true);
    assert.equal(review?.robloxSafety,true);
    const png=fs.readFileSync(root+review.sourceFile);
    assert.equal(png.toString('ascii',1,4),'PNG',key+' actual PNG');
    // 원본 직접 등록 규격: 실제 7:10 원본을 임의 확대하지 않는다.
    const w=png.readUInt32BE(16), h=png.readUInt32BE(20);
    assert.ok(w>=768 && h>=768 && w<=4096 && h<=4096,key+' original dimensions');
    assert.ok(Math.abs(w*10-h*7)<=h*0.05,key+' original portrait ratio');
    if(review.sourceFile.endsWith('-1400x2000.png')){
      assert.equal(w,1400,key+' named portrait width');
      assert.equal(h,2000,key+' named portrait height');
    }
    assert.equal(createHash('sha256').update(png).digest('hex'),review.sourceSha256,key+' actual approved source bytes');
  }
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
  // 기존 150종 원본 목록은 유지하고 확장된 등록기 ID 범위도 실제 승인 경로와 일치시킨다.
  assert.ok(uploader.includes('(?:eu|ea|me|nw|af|sa)_(?:0[1-9]|[1-4][0-9])\\.png'));
  assert.ok(uploader.includes("const regionalCardArt = item.kind === 'CardArt' && /^(?:eu|ea|me|nw|af|sa)_(?:0[1-9]|[1-4][0-9])$/.test(item.name)"));
  assert.match(uploader,/if \(\(!previous\?\.assetId \|\| !previous\.sourceSha256 \|\| previous\.sourceSha256 !== sourceSha256\)\s*&& modelOriginals\[id\]\?\.sourceSha256 !== sourceSha256\) \{[\s\S]*?MODEL_ORIGINAL_REVIEW_REQUIRED[\s\S]*?continue;/);
  assert.match(uploader,/review\.sourceSha256 !== hash \|\| cardApprovalDocument\.approved\?\.\[id\] !== hash\s*\|\| blockedHashes\.has\(hash\)/);
  assert.match(uploader,/!reviewChecks\.every\(key => review\[key\] === true\)/);
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
  assert.match(uploader, /MODEL_ORIGINAL_RGB_RGBA_REQUIRED/);
  assert.match(uploader, /MODEL_ORIGINAL_LEGACY_PALETTE_REPLACEMENT_REQUIRED/);
  assert.match(uploader, /const replacingOriginal = review\?\.sourceFile === originalSource/);
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
    const execute = (modelsOnly = false) => runInNewContext('(async()=>{' + intake + '\n})()', {
      ROOT:root,JSON_OUT:path.join(root,'assets-registered.json'),fs:fs.promises,path,crypto:{createHash},Buffer,
      modelsOnly,studioRegrantPath:'',blockedHashes:new Set(),blockedPaths:new Set(),console:{log:()=>{}}
    });
    await execute(true);
    assert.equal(fs.existsSync(dest),false);
    review.subjectMatch=false;
    save();
    await assert.rejects(execute(), /MODEL_ORIGINAL_QA_REQUIRED/);
    assert.equal(fs.existsSync(dest),false);
    review.subjectMatch=true;
    record.approved[id]='0'.repeat(64);
    save();
    await assert.rejects(execute(), /MODEL_ORIGINAL_APPROVAL_OR_SAFETY_MISMATCH/);
    assert.equal(fs.existsSync(dest),false);
    // [원화 무손실 재등록] 실제 256색(P 모드) PNG는 승인 해시가 있어도 신규 승격할 수 없다.
    const pngChunk=(type,payload)=>{
      const body=Buffer.concat([Buffer.from(type),payload]);
      let crc=0xffffffff;
      for(const byte of body){
        crc^=byte;
        for(let bit=0;bit<8;bit++)crc=(crc>>>1)^(0xedb88320&-(crc&1));
      }
      const header=Buffer.alloc(4),tail=Buffer.alloc(4);
      header.writeUInt32BE(payload.length);
      tail.writeUInt32BE((crc^0xffffffff)>>>0);
      return Buffer.concat([header,body,tail]);
    };
    const {deflateSync}=await import('node:zlib');
    // 실제 게임 자산이 풀컬러로 교체되어도 256색 거부 검사가 유지되도록 독립 PNG를 생성한다.
    const paletteWidth=768,paletteHeight=768,paletteStride=paletteWidth+1;
    const paletteHeader=Buffer.alloc(13);
    paletteHeader.writeUInt32BE(paletteWidth,0);
    paletteHeader.writeUInt32BE(paletteHeight,4);
    paletteHeader[8]=8;
    paletteHeader[9]=3;
    const palette=Buffer.alloc(256*3);
    for(let i=0;i<256;i++){palette[i*3]=i;palette[i*3+1]=(i*17)&255;palette[i*3+2]=(i*53)&255;}
    const paletteScan=Buffer.alloc(paletteStride*paletteHeight);
    let noise=0x12345678;
    for(let y=0;y<paletteHeight;y++) for(let x=1;x<paletteStride;x++){
      noise^=noise<<13; noise^=noise>>>17; noise^=noise<<5;
      paletteScan[y*paletteStride+x]=noise&255;
    }
    const indexed=Buffer.concat([
      Buffer.from([137,80,78,71,13,10,26,10]),
      pngChunk('IHDR',paletteHeader),
      pngChunk('PLTE',palette),
      pngChunk('IDAT',deflateSync(paletteScan,{level:6})),
      pngChunk('IEND',Buffer.alloc(0)),
    ]);
    assert.ok(indexed.length>=50000,'palette fixture meets real source size gate');
    assert.equal(indexed[25],3,'indexed fixture must really be a palette PNG');
    fs.writeFileSync(source,indexed);
    const indexedHash=createHash('sha256').update(indexed).digest('hex');
    review.sourceSha256=indexedHash;
    record.approved[id]=indexedHash;
    save();
    await assert.rejects(execute(), /MODEL_ORIGINAL_RGB_RGBA_REQUIRED/);
    assert.equal(fs.existsSync(dest),false);
    fs.copyFileSync('roblox-games/mare-essentia/assets/cardart/nw_03.png',source);
    review.sourceSha256=hash;
    record.approved[id]=hash;
    save();
    await execute();
    assert.equal(createHash('sha256').update(fs.readFileSync(dest)).digest('hex'),hash);
    await execute(); // 반복 실행은 기존 파일과 ID를 그대로 보존한다.
    fs.writeFileSync(dest,'unexpected overwrite attempt');
    await assert.rejects(execute(), /MODEL_ORIGINAL_EXISTING_CARD_PRESERVED/);

    // [검수된 세로 교체] 기존 원화·등록 ID·권한과 정확히 맞을 때만 승격한다.
    fs.copyFileSync(source,dest);
    const upgradeId='CardArt/eu_18';
    const reviewUpgrade={...review,sourceFile:'assets/cardart/src/eu_18-1400x2000.png',replacesAssetId:'2'};
    const original='roblox-games/mare-essentia/assets/cardart/eu_18.png';
    const upgradeSource=path.join(root,'assets/cardart/src/eu_18-1400x2000.png');
    const upgradeDest=path.join(root,'assets/cardart/eu_18.png');
    // [독립 QA 원본] 기존 eu_18 교체 시안은 256색이므로 승인 테스트에 재사용하지 않는다.
    // 게임 원화가 아닌 테스트 전용 1400×2000 RGB PNG를 표준 청크·CRC로 생성한다.
    const width=1400,height=2000,stride=width*3+1;
    const scanlines=Buffer.alloc(stride*height);
    for(let y=0;y<height;y++) for(let x=0;x<width;x++){
      const offset=y*stride+1+x*3;
      scanlines[offset]=(x*17+y*31)&255;
      scanlines[offset+1]=(x*13+y*47)&255;
      scanlines[offset+2]=(x*53+y*7)&255;
    }
    const ihdr=Buffer.alloc(13);
    ihdr.writeUInt32BE(width,0);
    ihdr.writeUInt32BE(height,4);
    ihdr[8]=8;
    ihdr[9]=2;
    fs.writeFileSync(upgradeSource,Buffer.concat([
      Buffer.from([137,80,78,71,13,10,26,10]),
      pngChunk('IHDR',ihdr),
      pngChunk('IDAT',deflateSync(scanlines,{level:6})),
      pngChunk('IEND',Buffer.alloc(0)),
    ]));
    fs.copyFileSync(original,upgradeDest);
    const digest=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
    reviewUpgrade.replacesSha256=digest(original);
    reviewUpgrade.sourceSha256=digest(upgradeSource);
    assert.equal(digest(upgradeDest),reviewUpgrade.replacesSha256);
    assert.equal(digest(upgradeSource),reviewUpgrade.sourceSha256);
    record.modelOriginals[upgradeId]=reviewUpgrade;
    record.approved[upgradeId]=reviewUpgrade.sourceSha256;
    fs.writeFileSync(path.join(root,'assets-registered.json'),JSON.stringify({assets:{
      [upgradeId]:{assetId:reviewUpgrade.replacesAssetId,sourceSha256:reviewUpgrade.replacesSha256,
        assetType:'Image',usePermissionGranted:true}
    }}));
    const registeredId=reviewUpgrade.replacesAssetId;
    reviewUpgrade.replacesAssetId='1';
    save();
    await assert.rejects(execute(), /MODEL_ORIGINAL_EXISTING_CARD_PRESERVED/);
    assert.equal(digest(upgradeDest),reviewUpgrade.replacesSha256);
    reviewUpgrade.replacesAssetId=registeredId;
    save();
    await execute();
    assert.equal(digest(upgradeDest),reviewUpgrade.sourceSha256);
    assert.equal(digest(original),reviewUpgrade.replacesSha256,'registered fixture must remain intact');
    await execute();
    assert.equal(digest(upgradeDest),reviewUpgrade.sourceSha256,'repeat must not replace approved art');
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
    assert.ok(after.bin.subarray(0,before.bin.length).equals(before.bin),ship+' original binary must survive');
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
  assert.ok(derived.bin.subarray(0,source.bin.length).equals(source.bin),
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
    assert.ok(after.bin.subarray(0,before.bin.length).equals(before.bin),ship+' original binary must survive');
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
  assert.match(naval,/local speedBtn\s+do\s+local compact = MOBILE_VFX and \(battleViewport\.X < 520 or battleViewport\.X <= battleViewport\.Y\)\s+local size = if compact then 76 elseif MOBILE_VFX and battleViewport\.Y < 330 then 72\s+elseif MOBILE_VFX then 80 else 82\s+speedBtn = mkBtn\("가속", UDim2\.new\(1, -24, 1, -24\),\s*UDim2\.fromOffset\(size, size\), Vector2\.new\(1, 1\), "Menu\/naval_speed"\)\s+end/);
  assert.match(naval,/if sk\.id == "fire" then "Menu\/naval_fire" else "Menu\/naval_skill"/);
  assert.match(naval,/speedBtn\.Activated:Connect\(function\(\)/);
  assert.match(naval,/throttle = if throttle >= 1 then 0\.45 elseif throttle > 0\.4 then 0 else 1/);
  assert.match(naval,/b\.Interactable = ready and phase == "duel" and not opts\.cardOnly and not opts\.card/);
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

// Dropbox 후보의 수동 QA도 실제 동일 SHA의 GitHub Actions 검사로 검증한다.
test('Mare Dropbox candidate recognizes exact successful check runs without weakening native merge protection',()=>{
  const workflow=fs.readFileSync('.github/workflows/owner-mare-essentia-assets.yml','utf8');
  const block=workflow.slice(workflow.indexOf('      - name: Open reviewed Dropbox candidate PR'),workflow.indexOf('      - name: Check reviewed animal originals'));
  assert.ok(block.includes("'/commits/'+head+'/check-runs?filter=latest&per_page=100'"));
  assert.ok(block.includes("row.get('head_sha')==head"));
  assert.ok(block.includes("row.get('app',{}).get('slug')=='github-actions'"));
  assert.ok(block.includes("str(row.get('details_url','')).startswith(prefix)"));
  assert.ok(block.includes('CARD_DROPBOX_REQUIRED_CHECK_RUN_NOT_VERIFIED:'));
  assert.ok(block.includes('CARD_DROPBOX_CHECK_RUN_PENDING_OR_FAILED'));
  assert.ok(block.includes('gh pr checks "$pr" --repo "$GITHUB_REPOSITORY" --required'));
  assert.ok(block.includes("no checks reported on the '$CARD_BRANCH' branch"));
  assert.ok(block.includes('gh pr merge "$pr" --repo "$GITHUB_REPOSITORY" --squash --match-head-commit "$head"'));
  assert.ok(!block.includes('--admin'));
  assert.ok(block.indexOf('CARD_DROPBOX_PR_CHECKS_VERIFIED')<block.indexOf('gh pr merge'));
});

test('Mare Dropbox UI replacement preserves existing verified registration and exact candidate checks',()=>{
  const workflow=fs.readFileSync('.github/workflows/owner-mare-essentia-assets.yml','utf8');
  const stage=workflow.slice(workflow.indexOf('      - name: Stage reviewed Dropbox original'),workflow.indexOf('      - name: Open reviewed Dropbox candidate PR'));
  const pr=workflow.slice(workflow.indexOf('      - name: Open reviewed Dropbox candidate PR'),workflow.indexOf('      - name: Check reviewed animal originals'));
  const recovery=workflow.slice(workflow.indexOf('      - name: Select existing full registration'),workflow.indexOf('      - name: Restore full-color originals'));
  assert.ok(stage.includes("ui = name.startswith('ui_')"));
  assert.ok(stage.includes("relative = 'assets/cardart/'+name+'.png' if ui else"));
  assert.ok(stage.includes("old_raw[25]!=3"));
  assert.ok(stage.includes("previous.get('source')!=str(target)"));
  assert.ok(stage.includes("hashlib.sha256(raw).hexdigest()!=digest"));
  assert.ok(stage.includes("if not ui:"));
  assert.ok(pr.includes("original=root+'cardart/'+name+'.png' if ui else"));
  assert.ok(pr.includes("CARD_DROPBOX_UI_REGISTERED_INDEXED_REQUIRED:"));
  assert.ok(pr.includes("CARD_DROPBOX_UI_PR_PNG_INVALID:"));
  assert.ok(pr.includes("pr['changed_files']!=2"));
  assert.ok(pr.includes("if not ui:"));
  assert.ok(recovery.includes("CARD_UI_APPROVED_REGISTRATION_RECOVERY"));
  assert.ok(recovery.includes("old.get('sourceSha256')==digest"));
  assert.ok(recovery.includes("hashlib.sha256(raw).hexdigest()!=digest"));
  assert.ok(recovery.includes("MARE_MODELS_ONLY=false"));
});

test('Mare indexed PNG audit separates exact registered SHA from archived and pending originals',()=>{
  const workflow=fs.readFileSync('.github/workflows/owner-mare-essentia-assets.yml','utf8');
  const block=workflow.slice(workflow.indexOf('      - name: Audit 256-color indexed'),workflow.indexOf('      - name: Practice and verify approved trade goods'));
  assert.ok(block.includes("hashlib.file_digest(f, 'sha256').hexdigest()"));
  assert.ok(block.includes("row.get('sourceSha256')"));
  assert.ok(block.includes("row.get('assetType') == 'Image'"));
  assert.ok(block.includes("'icons', 'materials', 'menu', 'goods'"));
  assert.ok(block.includes('ART_PALETTE256_REGISTERED_SHA_MATCH'));
  assert.ok(block.includes('ART_PALETTE256_OTHER_SOURCE'));
  assert.ok(block.includes('ART_PALETTE256_REGISTERED_KEYS='));
  assert.ok(block.includes('PNG_INDEXED_HEADER_ONLY_NOT_FULL_COLOR_OR_RUNTIME_AUDIT'));
});
