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
  assert.equal(names.get('quest'),'퀘스트');
  assert.equal(names.get('map'),'일지');
  assert.equal(names.get('explore'),'탐험');
});

// [비주얼] 교역품은 52/60px 목록과 상세 모두 실제 Cargo 메시로 표시한다. 일반 메뉴/그림만 2D로 유지한다.
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
  assert.match(client,/modelIcon\(right, gi\[1\], gi\[2\], gi\[3\], 96, sel\.name, gi\[4\]\)/);
  assert.match(client,/modelIcon\(row, gi\[1\], gi\[2\], gi\[3\], 52, g\.name, gi\[4\]\)/);
  assert.match(client,/modelIcon\(cardF, gi\[1\], gi\[2\], gi\[3\], 60, g\.name, gi\[4\]\)/);
  assert.match(client,/shadow\.Name = "DepthShadow"/);
  assert.match(client,/art\.Name = "OriginalArt"/);
  assert.match(client,/shadow\.Image = imageId/);
  assert.match(client,/art\.Image = imageId/);
  assert.match(client,/local imageId = "rbxassetid:\/\/" \.\. tostring\(assetId\)/);
  assert.equal(client.split('image.Image = "rbxassetid://" .. tostring(menuAssetId)').length-1,2);
  assert.match(client,/local m = tpl:Clone\(\)/);
  assert.match(client,/local world = Instance\.new\("WorldModel"\)/);
  assert.match(client,/if #itemMotion >= 10 then return end/);
  // 실제 Cargo 표본은 작은 화면에서 모서리 투영에 맞춰 확대하며 리스트 회전을 제한한다.
  assert.match(client,/if kind == "Cargo" and px < 90 then/);
  assert.match(client,/cf:VectorToWorldSpace\(Vector3\.new\(half\.X \* x, half\.Y \* y, half\.Z \* z\)\)/);
  assert.match(client,/reach = fitted \* 1\.06/);
  assert.match(client,/if px >= 90 then\s+addItemMotion/);
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
  assert.match(workflow,/roblox-games\/mare-essentia\/assets-wanted\.json; do/);
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
  assert.match(scene,/local m = k and importedModel\(folder, "Animals"/);
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

test('Mare historical R15 mesh candidates remain unbound until visual and animation QA',()=> {
  const base='roblox-games/mare-essentia/assets/inbox/People/';
  const names=['male_peasant_body','male_peasant_legs','female_peasant_body','female_peasant_legs',
    'male_ranger_body','male_ranger_legs','female_ranger_body','female_ranger_legs',
    'male_peasant_arms','male_peasant_feet','female_peasant_arms','female_peasant_feet',
    'male_ranger_arms','male_ranger_feet_boots','female_ranger_arms','female_ranger_feet',
    'male_ranger_acc_pauldron','female_ranger_acc_pauldrons',
    'male_ranger_head_hood','female_ranger_head_hood','hair_buns','hair_buzzed','hair_buzzedfemale','hair_long','hair_simpleparted','hair_beard',
    'head_f','head_m','rig_f','rig_m'];
  assert.equal(names.length,30);
  const ui=fs.readFileSync('roblox-games/mare-essentia/src/StarterPlayer/Game.client.luau','utf8');
  const server=fs.readFileSync('roblox-games/mare-essentia/src/ServerScriptService/Core.server.luau','utf8');
  const state=fs.readFileSync('roblox-games/mare-essentia/src/ServerScriptService/Services/State.luau','utf8');
  assert.match(ui,/local chosenYear = 1700/);
  assert.doesNotMatch(ui,/1492년 ★추천/);
  assert.match(server,/local START_YEARS = \{ \[1517\] = true/);
  assert.doesNotMatch(server,/\[1492\] = true/);
  assert.match(state,/num\(saved.startYear, 1700, 1500, 1800\)/);
  for(const name of names){
    const glb=fs.readFileSync(base+name+'.glb');
    assert.equal(glb.readUInt32LE(0),0x46546c67,name+' GLB');
    assert.equal(glb.readUInt32LE(4),2,name+' glTF version');
    assert.equal(glb.readUInt32LE(8),glb.length,name+' glTF length');
    const m=JSON.parse(fs.readFileSync(base+name+'.glb.license.json','utf8'));
    assert.equal(m.license,'CC0-1.0');
    assert.equal(m.publicationAllowed,false);
    assert.equal(m.status,"STAGED_ONLY");
    assert.match(m.source,/quaternius.com/);
    assert.match(m.sourceGitBlobSha1,/^[0-9a-f]{40}$/);
    const actualGitSha=createHash('sha1').update('blob '+glb.length).update(Buffer.from([0])).update(glb).digest('hex');
    assert.equal(actualGitSha,m.sourceGitBlobSha1,name+' provenance SHA');
  }
});
