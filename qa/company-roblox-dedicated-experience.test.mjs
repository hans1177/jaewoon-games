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
      scopes:[{name:'universe-places',operations:['write'],universeIds:['*']}],
    }),{status:200});
  };
  const result=await introspectRobloxApiKey({apiKey:'key',fetchImpl});
  assert.equal(result.enabled,true);
  assert.equal(result.expired,false);
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


test('dedicated Roblox project titles match the published Experience titles',()=>{
  const expected={
    'cozy-island':'포근섬',
    'daechung-rpg':'Whatever RPG',
    'horror-escape-room':'심야 술래잡기',
  };
  for(const [gameId,title] of Object.entries(expected)){
    const project=JSON.parse(fs.readFileSync(new URL(`../roblox-games/${gameId}/default.project.json`,import.meta.url),'utf8'));
    assert.equal(project.name,title);
  }
});
