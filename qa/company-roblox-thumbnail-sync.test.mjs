import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  resolveRobloxThumbnailTarget,
  validateCanonicalThumbnail,
  uploadRobloxHomepageThumbnail,
  syncRobloxExperienceDetailMedia
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
    robloxPublicationTarget:{gameId:'cozy-island',universeId:'10767445741',placeId:'116850096561713',verified:true,dedicated:true,shared:false}
  }]};
  const target=resolveRobloxThumbnailTarget({catalog,queue,gameId:'cozy-island'});
  assert.equal(target.universeId,'10767445741');
  assert.equal(target.placeId,'116850096561713');
  assert.equal(target.source,'assets/roblox-thumbnails/cozy-island.svg');
  const validated=validateCanonicalThumbnail({root:'.',target});
  assert.equal(validated.ext,'.svg');
  assert.equal(validated.sha256.length,64);
});

test('unverified, shared or mismatched Roblox server target never receives another game thumbnail',()=>{
  const catalog=JSON.parse(fs.readFileSync('game-catalog.json','utf8'));
  const target={gameId:'cozy-island',universeId:'10767445741',placeId:'116850096561713',verified:true,dedicated:true,shared:false};
  const evaluate=patch=>resolveRobloxThumbnailTarget({catalog,queue:{items:[{gameId:'cozy-island',robloxPublicationTarget:{...target,...patch}}]},gameId:'cozy-island'});
  assert.equal(evaluate({}).universeId,target.universeId);
  for(const patch of [
    {verified:false},{dedicated:false},{shared:true},
    {gameId:'daechung-rpg'},{universeId:'0'},{placeId:''}
  ])assert.throws(()=>evaluate(patch),/ROBLOX_THUMBNAIL_VERIFIED_DEDICATED_TARGET_MISSING/);
});

test('Open Cloud thumbnail upload uses files multipart and verifies Finished operation',async()=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'roblox-thumb-'));
  const png=path.join(tmp,'thumbnail.png');
  fs.writeFileSync(png,Buffer.from([137,80,78,71,13,10,26,10,0,0,0,0]));
  const requests=[];
  const fetchImpl=async(url,init={})=>{
    requests.push({url,init});
    if(String(url).endsWith('/thumbnails/uploads')){
      assert.equal(init.method,'POST');
      assert.equal(init.headers['x-api-key'],'secret');
      assert.ok(init.body instanceof FormData);
      assert.ok(init.body.get('files') instanceof Blob);
      return new Response(JSON.stringify({fileToOperationIdDict:{'thumbnail.png':'op-1'}}),{status:200,headers:{'content-type':'application/json'}});
    }
    assert.match(String(url),/\/thumbnails\/uploads\/status\?operationIds=op-1$/);
    assert.equal(init.headers['x-api-key'],'secret');
    return new Response(JSON.stringify({
      uploadStatus:'Finished',
      uploadThumbnailStatusDict:{'op-1':{homepageThumbnailId:'thumb-77'}}
    }),{status:200,headers:{'content-type':'application/json'}});
  };
  const result=await uploadRobloxHomepageThumbnail({
    universeId:'10767445741',
    pngPath:png,
    apiKey:'secret',
    fetchImpl,
    sleepImpl:async()=>{}
  });
  assert.equal(result.uploaded,true);
  assert.equal(result.thumbnailId,'thumb-77');
  assert.equal(requests.length,2);
});

test('Roblox game detail image uses exact game ID and CSRF, never pretends a web video is native',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'roblox-detail-'));
  const png=path.join(dir,'cozy-island.png');
  fs.writeFileSync(png,Buffer.from([137,80,78,71,13,10,26,10,0,0]));
  const calls=[];
  const fetchImpl=async(url,opts={})=>{
    calls.push({url,opts});
    if(String(url).includes('/media?'))return new Response(JSON.stringify({data:[]}),{status:200});
    assert.equal(String(url),'https://publish.roblox.com/v1/games/10767445741/thumbnail/image');
    assert.ok(opts.body instanceof FormData);
    assert.ok(opts.body.get('Files') instanceof Blob);
    assert.equal(opts.headers.cookie,'.ROBLOSECURITY=testing-only;');
    if(!opts.headers['x-csrf-token'])return new Response('',{status:403,headers:{'x-csrf-token':'csrf-test-token'}});
    assert.equal(opts.headers['x-csrf-token'],'csrf-test-token');
    return new Response('{}',{status:200});
  };
  const report=await syncRobloxExperienceDetailMedia({
    universeId:'10767445741',pngPath:png,cookie:'testing-only',fetchImpl
  });
  assert.equal(report.imageStatus,'SUBMITTED_AWAITING_ROBLOX_MODERATION');
  assert.equal(report.verifiedDetailImage,false);
  assert.equal(report.approvedRobloxGameplayVideoCount,0);
  assert.equal(report.videoStatus,'NATIVE_ROBLOX_GAMEPLAY_VIDEO_NOT_PUBLISHED');
  assert.equal(calls.length,3);
  fs.rmSync(dir,{recursive:true,force:true});
});

test('existing Roblox native media is preserved without duplicate re-upload',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'roblox-detail-existing-'));
  const png=path.join(dir,'cozy-island.png');
  fs.writeFileSync(png,Buffer.from([137,80,78,71,13,10,26,10,0,0]));
  let count=0;
  const report=await syncRobloxExperienceDetailMedia({
    universeId:'10767445741',pngPath:png,fetchImpl:async()=>{
      count++;
      return Response.json({data:[
        {assetTypeId:1,assetType:'Image',approved:true,imageId:123},
        {assetTypeId:33,assetType:'Video',approved:true,videoHash:'real-native-video'}
      ]});
    }
  });
  assert.equal(count,1);
  assert.equal(report.imageStatus,'EXISTING_GAME_DETAIL_IMAGE');
  assert.equal(report.verifiedDetailImage,true);
  assert.equal(report.approvedRobloxGameplayVideoCount,1);
  fs.rmSync(dir,{recursive:true,force:true});
});

test('release promotion auto-syncs thumbnails on main push without republishing place',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-development-roblox-release-promotion.yml','utf8');
  assert.match(workflow,/thumbnail_only:/);
  assert.match(workflow,/if: \$\{\{ github\.event_name == 'workflow_dispatch' && inputs\.thumbnail_only != true \}\}/);
  assert.match(workflow,/name: sync canonical Roblox and homepage thumbnails/);
  assert.match(workflow,/github\.event_name == 'push'/);
  assert.match(workflow,/name: Resolve thumbnail sync games/);
  assert.match(workflow,/target\.verified===true&&target\.dedicated===true/);
  assert.match(workflow,/\.\.\/runtime\/development-queue\.json/);
  assert.doesNotMatch(workflow,/roblox\?\.internalReleaseReady===true/);
  assert.match(workflow,/ROBLOX_THUMBNAIL_BATCH_UPLOAD=INCOMPLETE_SCOPE_403/);
  assert.match(workflow,/assets\/roblox-thumbnails\//);
  assert.match(workflow,/ROBLOX_THUMBNAIL_BATCH_UPLOAD=PASS/);
  assert.match(workflow,/company-roblox-thumbnail-sync\.mjs/);
  assert.match(workflow,/Publish exact game image to Roblox experience detail page/);
  assert.match(workflow,/robloxDetailMediaEvidence/);
  assert.match(workflow,/ROBLOX_DETAIL_GAMEPLAY_VIDEO_IS_NOT_WEB_COMPANION=YES/);
  assert.match(workflow,/ROBLOX_ROBLOSECURITY: \$\{\{ secrets\.ROBLOX_ROBLOSECURITY \}\}/);
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
  assert.equal(architecture.robloxHomepageThumbnailSyncTopology.sameSourceAssetForHomepageAndRoblox,true);
  assert.equal(security.robloxThumbnailOpenCloudSecurity.verifiedUniverseTargetRequired,true);
});
