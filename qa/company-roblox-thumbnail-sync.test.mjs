import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  inspectMarketingPng,
  resolveCanonicalRuntimeTarget,
  uploadRobloxHomepageThumbnail,
  syncCanonicalRobloxThumbnails
} from '../tools/company-roblox-thumbnail-sync.mjs';

function fakePng(file,width=1920,height=1080){
  const data=Buffer.alloc(32);
  Buffer.from('89504e470d0a1a0a','hex').copy(data,0);
  data.writeUInt32BE(width,16);
  data.writeUInt32BE(height,20);
  fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.writeFileSync(file,data);
}

const ok=value=>new Response(JSON.stringify(value),{
  status:200,
  headers:{'content-type':'application/json'}
});

test('marketing image validator requires repository-local 1920x1080 PNG',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'roblox-thumb-'));
  try{
    fakePng(path.join(root,'assets/thumb.png'));
    const inspected=inspectMarketingPng('assets/thumb.png',{repoRoot:root});
    assert.equal(inspected.width,1920);
    assert.equal(inspected.height,1080);
    assert.match(inspected.sha256,/^[a-f0-9]{64}$/);

    fakePng(path.join(root,'assets/bad.png'),960,540);
    assert.throws(()=>inspectMarketingPng('assets/bad.png',{repoRoot:root}),/DIMENSION_INVALID/);

    const outside=path.join(os.tmpdir(),'outside-thumb.png');
    fakePng(outside);
    assert.throws(()=>inspectMarketingPng(outside,{repoRoot:root}),/PATH_OUTSIDE_REPOSITORY/);
    fs.rmSync(outside,{force:true});
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
});

test('canonical runtime target stays bound to exact Roblox universe and place',()=>{
  assert.deepEqual(resolveCanonicalRuntimeTarget({
    gameId:'demo',
    robloxPublicationTarget:{universeId:'123',placeId:'456'}
  }),{universeId:'123',placeId:'456'});
  assert.throws(()=>resolveCanonicalRuntimeTarget({gameId:'demo'}),/CANONICAL_TARGET_MISSING/);
});

test('Open Cloud thumbnail sync uploads with API key only, preserves active config id, and verifies readback',async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'roblox-thumb-'));
  try{
    fakePng(path.join(root,'assets/demo.png'));
    const calls=[];
    const fetchImpl=async (url,options={})=>{
      calls.push({url:String(url),options});
      const headers=new Headers(options.headers||{});
      assert.equal(headers.get('x-api-key'),'test-key');
      assert.equal(headers.has('cookie'),false);
      if(String(url).endsWith('/thumbnails/uploads')){
        assert.equal(options.method,'POST');
        assert(options.body instanceof FormData);
        const file=options.body.get('files');
        assert(file instanceof Blob);
        assert.equal(file.type,'image/png');
        return ok({fileToOperationIdDict:{'demo.png':'op-1'}});
      }
      if(String(url).includes('/thumbnails/uploads/status')){
        return ok({uploadStatus:'Finished',uploadThumbnailStatusDict:{'op-1':{homepageThumbnailId:'789'}}});
      }
      if(String(url).endsWith('/personalization?status=Active')){
        const readback=calls.some(row=>row.url.endsWith('/personalization/update'));
        return ok({personalizedConfigs:[{id:'cfg-1',homepageThumbnailIds:readback?[789]:[111]}]});
      }
      if(String(url).endsWith('/personalization/update')){
        assert.equal(options.method,'POST');
        assert.deepEqual(JSON.parse(options.body),{homepageThumbnailIds:[789],id:'cfg-1'});
        return ok({id:'cfg-1'});
      }
      if(String(url).endsWith('/thumbnails')){
        return ok({homepageThumbnails:[{homepageThumbnailId:789}]});
      }
      throw new Error('unexpected fetch '+url);
    };
    const result=await uploadRobloxHomepageThumbnail({
      universeId:'123',
      imageFile:'assets/demo.png',
      apiKey:'test-key',
      repoRoot:root,
      fetchImpl,
      waitImpl:async()=>{},
      pollAttempts:2,
      pollDelayMs:0
    });
    assert.equal(result.verified,true);
    assert.equal(result.homepageThumbnailId,'789');
    assert.equal(result.updatedExistingConfig,true);
    assert(calls.some(row=>row.url.endsWith('/personalization/update')));
    assert.equal(calls.some(row=>row.url.endsWith('/personalization/create')),false);
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
});

test('catalog/runtime batch requires marketing image equality and exact target binding',async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'roblox-thumb-'));
  try{
    fakePng(path.join(root,'assets/demo.png'));
    const roadmap={robloxMarketingThumbnailSyncContract:{currentInternalReleaseTargets:['demo']}};
    const runtimeQueue={items:[{gameId:'demo',robloxPublicationTarget:{universeId:'123',placeId:'456'}}]};
    const catalog={games:[{
      id:'demo',
      marketingImage:'assets/demo.png',
      image:'assets/demo.png',
      canonical:{identity:{image:'assets/demo.png'}}
    }]};
    const fetchImpl=async (url,options={})=>{
      if(String(url).endsWith('/thumbnails/uploads'))return ok({fileToOperationIdDict:{'demo.png':'op-1'}});
      if(String(url).includes('/thumbnails/uploads/status'))return ok({uploadStatus:'Finished',uploadThumbnailStatusDict:{x:{homepageThumbnailId:'789'}}});
      if(String(url).endsWith('/personalization?status=Active')){
        const body=String(url);
        return ok({personalizedConfigs:[{id:'cfg-1',homepageThumbnailIds:[789]}]});
      }
      if(String(url).endsWith('/personalization/update'))return ok({});
      if(String(url).endsWith('/thumbnails'))return ok({homepageThumbnails:[{homepageThumbnailId:789}]});
      throw new Error('unexpected '+url);
    };
    const result=await syncCanonicalRobloxThumbnails({
      catalog,runtimeQueue,roadmap,repoRoot:root,apiKey:'test-key',fetchImpl,waitImpl:async()=>{},pollAttempts:1,pollDelayMs:0
    });
    assert.equal(result.length,1);
    assert.equal(result[0].gameId,'demo');

    const broken=structuredClone(catalog);
    broken.games[0].canonical.identity.image='assets/other.png';
    await assert.rejects(
      syncCanonicalRobloxThumbnails({catalog:broken,runtimeQueue,roadmap,repoRoot:root,apiKey:'test-key',fetchImpl,waitImpl:async()=>{},pollAttempts:1}),
      /HOMEPAGE_MARKETING_IMAGE_SYNC_MISMATCH/
    );
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
});
