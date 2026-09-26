import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  resolveRobloxThumbnailTarget,
  validateCanonicalThumbnail,
  uploadRobloxHomepageThumbnail
} from '../tools/company-roblox-thumbnail-sync.mjs';

const ids=['cozy-island','daechung-rpg','horror-escape-room','village-dungeons'];

test('current internal Roblox exposure games share one canonical thumbnail with homepage',()=>{
  const catalog=JSON.parse(fs.readFileSync('game-catalog.json','utf8'));
  const images=new Set();
  for(const id of ids){
    const game=catalog.games.find(row=>row.id===id);
    assert.ok(game,id);
    const canonical=game.canonical;
    assert.match(canonical.marketing.thumbnail,/^assets\/roblox-thumbnails\/.+\.svg$/);
    assert.equal(game.marketingThumbnail,canonical.marketing.thumbnail);
    assert.equal(game.image,canonical.marketing.thumbnail);
    assert.equal(canonical.identity.image,canonical.marketing.thumbnail);
    assert.ok(fs.existsSync(canonical.marketing.thumbnail),canonical.marketing.thumbnail);
    const svg=fs.readFileSync(canonical.marketing.thumbnail,'utf8');
    assert.match(svg,/viewBox="0 0 1920 1080"/);
    assert.ok(svg.length>1000);
    images.add(canonical.marketing.thumbnail);
  }
  assert.equal(images.size,ids.length);
});

test('homepage renderer and manager prefer canonical marketing thumbnail',()=>{
  const renderer=fs.readFileSync('assets/homepage-enhancements.js','utf8');
  const manager=fs.readFileSync('tools/homepage-manager.mjs','utf8');
  const normalization=fs.readFileSync('tools/game-catalog-normalization.mjs','utf8');
  assert.match(renderer,/marketingOf\(row\)\.thumbnail\|\|identity\.image/);
  assert.match(manager,/marketing\?\.thumbnail\|\|canonicalOf\(game\)\?\.identity\?\.image/);
  assert.match(normalization,/marketing:\{/);
  assert.match(normalization,/CANONICAL_SHARED_ROBLOX_HOMEPAGE_ASSET/);
});

test('thumbnail target resolves verified runtime universe without changing publication target',()=>{
  const catalog=JSON.parse(fs.readFileSync('game-catalog.json','utf8'));
  const queue={items:[{
    gameId:'cozy-island',
    robloxPublicationTarget:{universeId:'10767445741',placeId:'116850096561713'}
  }]};
  const target=resolveRobloxThumbnailTarget({catalog,queue,gameId:'cozy-island'});
  assert.equal(target.universeId,'10767445741');
  assert.equal(target.placeId,'116850096561713');
  assert.equal(target.source,'assets/roblox-thumbnails/cozy-island.svg');
  const validated=validateCanonicalThumbnail({root:'.',target});
  assert.equal(validated.ext,'.svg');
  assert.equal(validated.sha256.length,64);
});

test('Open Cloud thumbnail upload activates and reads back the uploaded thumbnail',async()=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'roblox-thumb-'));
  const png=path.join(tmp,'thumbnail.png');
  fs.writeFileSync(png,Buffer.from([137,80,78,71,13,10,26,10,0,0,0,0]));
  const requests=[];
  let activeReads=0;
  const fetchImpl=async(url,init={})=>{
    requests.push({url:String(url),init});
    if(String(url).endsWith('/thumbnails/uploads')){
      assert.equal(init.method,'POST');
      assert.equal(init.headers['x-api-key'],'secret');
      assert.ok(init.body instanceof FormData);
      assert.ok(init.body.get('files') instanceof Blob);
      return new Response(JSON.stringify({fileToOperationIdDict:{'thumbnail.png':'op-1'}}),{status:200,headers:{'content-type':'application/json'}});
    }
    if(String(url).includes('/thumbnails/uploads/status')){
      return new Response(JSON.stringify({
        uploadStatus:'Finished',
        uploadThumbnailStatusDict:{'op-1':{homepageThumbnailId:'789'}}
      }),{status:200,headers:{'content-type':'application/json'}});
    }
    if(String(url).endsWith('/personalization?status=Active')){
      activeReads+=1;
      return new Response(JSON.stringify({
        personalizedConfigs:[{id:'cfg-1',homepageThumbnailIds:activeReads===1?[456]:[789]}]
      }),{status:200,headers:{'content-type':'application/json'}});
    }
    if(String(url).endsWith('/personalization/update')){
      assert.equal(init.method,'POST');
      assert.equal(init.headers['content-type'],'application/json');
      assert.deepEqual(JSON.parse(init.body),{homepageThumbnailIds:[789],id:'cfg-1'});
      return new Response(JSON.stringify({}),{status:200,headers:{'content-type':'application/json'}});
    }
    if(String(url).endsWith('/thumbnails')){
      return new Response(JSON.stringify({homepageThumbnails:[{homepageThumbnailId:789}]}),{status:200,headers:{'content-type':'application/json'}});
    }
    throw new Error('unexpected '+url);
  };
  const result=await uploadRobloxHomepageThumbnail({
    universeId:'10767445741',
    pngPath:png,
    apiKey:'secret',
    fetchImpl,
    sleepImpl:async()=>{}
  });
  assert.equal(result.uploaded,true);
  assert.equal(result.thumbnailId,'789');
  assert.equal(result.personalizationMode,'UPDATE');
  assert.equal(result.activePersonalizationVerified,true);
  assert.ok(requests.some(row=>row.url.endsWith('/personalization/update')));
  assert.ok(requests.some(row=>row.url.endsWith('/thumbnails')));
  assert.equal(activeReads,2);
});

test('Open Cloud thumbnail write fails closed when active readback does not contain uploaded thumbnail',async()=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'roblox-thumb-readback-'));
  const png=path.join(tmp,'thumbnail.png');
  fs.writeFileSync(png,Buffer.from([137,80,78,71,13,10,26,10,0,0,0,0]));
  const fetchImpl=async(url,init={})=>{
    if(String(url).endsWith('/thumbnails/uploads'))return new Response(JSON.stringify({fileToOperationIdDict:{'thumbnail.png':'op-1'}}),{status:200});
    if(String(url).includes('/thumbnails/uploads/status'))return new Response(JSON.stringify({uploadStatus:'Finished',uploadThumbnailStatusDict:{'op-1':{homepageThumbnailId:'789'}}}),{status:200});
    if(String(url).endsWith('/personalization?status=Active'))return new Response(JSON.stringify({personalizedConfigs:[{id:'cfg-1',homepageThumbnailIds:[456]}]}),{status:200});
    if(String(url).endsWith('/personalization/update'))return new Response('{}',{status:200});
    if(String(url).endsWith('/thumbnails'))return new Response(JSON.stringify({homepageThumbnails:[{homepageThumbnailId:789}]}),{status:200});
    throw new Error('unexpected '+url);
  };
  await assert.rejects(
    uploadRobloxHomepageThumbnail({universeId:'10767445741',pngPath:png,apiKey:'secret',fetchImpl,sleepImpl:async()=>{}}),
    /ROBLOX_THUMBNAIL_ACTIVE_READBACK_MISMATCH/
  );
});

test('release promotion auto-syncs thumbnails on main push without republishing place',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-development-roblox-release-promotion.yml','utf8');
  assert.match(workflow,/thumbnail_only:/);
  assert.match(workflow,/if: \$\{\{ github\.event_name == 'workflow_dispatch' && inputs\.thumbnail_only != true \}\}/);
  assert.match(workflow,/name: sync canonical Roblox and homepage thumbnails/);
  assert.match(workflow,/github\.event_name == 'push'/);
  assert.match(workflow,/name: Resolve thumbnail sync games/);
  assert.match(workflow,/internalReleaseReady===true/);
  assert.match(workflow,/assets\/roblox-thumbnails\//);
  assert.match(workflow,/ROBLOX_THUMBNAIL_BATCH_UPLOAD=PASS/);
  assert.match(workflow,/company-roblox-thumbnail-sync\.mjs/);
  assert.match(workflow,/librsvg2-bin/);
  assert.match(workflow,/ROBLOX_THUMBNAIL_RUNTIME_PERSIST=PASS/);
  assert.doesNotMatch(workflow,/Roblox Player automation/i);
});

test('central contract requires same thumbnail source for Roblox and homepage',()=>{
  const policy=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
  const architecture=JSON.parse(fs.readFileSync('company-learning/company-architecture-map.json','utf8'));
  const security=JSON.parse(fs.readFileSync('company-learning/security-immune-system.json','utf8'));
  const contract=policy.robloxHomepageThumbnailSyncContract;
  assert.equal(contract.canonicalImageAuthority.homepageUsesSameAsset,true);
  assert.equal(contract.canonicalImageAuthority.robloxUploadUsesSameAsset,true);
  assert.equal(contract.robloxOpenCloud.requiredScope,'universe.thumbnail:write');
  assert.equal(contract.robloxOpenCloud.activePersonalizationRequired,true);
  assert.equal(contract.robloxOpenCloud.activeReadbackRequired,true);
  assert.equal(contract.robloxOpenCloud.httpSuccessAloneIsNotPass,true);
  assert.equal(architecture.robloxHomepageThumbnailSyncTopology.sameSourceAssetForHomepageAndRoblox,true);
  assert.equal(architecture.robloxHomepageThumbnailSyncTopology.uploadOnlyCannotSatisfyAppliedState,true);
  assert.equal(security.robloxThumbnailOpenCloudSecurity.verifiedUniverseTargetRequired,true);
  assert.equal(security.robloxThumbnailOpenCloudSecurity.activePersonalizationReadbackRequired,true);
});
