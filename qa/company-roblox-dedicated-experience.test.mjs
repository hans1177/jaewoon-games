import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  csrfFetch,
  createRobloxDedicatedExperience,
  configureRobloxExperience,
  introspectRobloxApiKey,
  ensureRobloxExperiencePrivate,
  publishRobloxDedicatedPlace,
} from '../tools/company-roblox-dedicated-experience.mjs';

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
  assert.ok(workflow.indexOf('Register approved Forest village originals')<workflow.indexOf('Register 12 original prologue scenes'),
    'owner requested licensed well registration before unrelated prologue image upload retries');
  assert.match(workflow,/assets\/shared\/party\/village-well\.glb/);
  assert.match(workflow,/const wellEvidence='https:/);
  assert.match(workflow,/FOREST_INTRO_AUTH_ROUTE/);
  assert.match(workflow,/FOREST_INTRO_BINDING_PR_CREATED=YES/);
  assert.match(workflow,/FOREST_INTRO_SCENE_IDS_MAIN_BIND_REQUIRED/);
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
