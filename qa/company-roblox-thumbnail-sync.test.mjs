import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import crypto from 'node:crypto';
import {
  resolveRobloxThumbnailTarget,
  validateCanonicalThumbnail,
  uploadRobloxHomepageThumbnail,
  syncRobloxExperienceDetailMedia,
  syncRobloxHomepageThumbnail,
  editVerifiedRobloxGameplayVideo,
  renderRobloxConceptTrailer
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

test('numeric status requires a completed record for the exact upload operation',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'roblox-status-'));
  const png=path.join(dir,'thumbnail.png');
  fs.writeFileSync(png,Buffer.from([137,80,78,71,13,10,26,10]));
  let polls=0;
  const result=await uploadRobloxHomepageThumbnail({
    universeId:'10767445741',pngPath:png,apiKey:'secret',attempts:3,sleepImpl:async()=>{},
    fetchImpl:async(url)=>{
      if(String(url).endsWith('/thumbnails/uploads'))return Response.json({fileToOperationIdDict:{'thumbnail.png':'op-1'}});
      polls++;
      return Response.json({uploadStatus:2,uploadThumbnailStatusDict:polls===1?{'other':{homepageThumbnailId:'wrong'}}:{'op-1':{homepageThumbnailId:'right'}}});
    }
  });
  assert.equal(polls,2);
  assert.equal(result.thumbnailId,'right');
  fs.rmSync(dir,{recursive:true,force:true});
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

test('moderation pending never uploads duplicate Roblox detail images',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'roblox-detail-pending-'));
  const png=path.join(dir,'cozy-island.png');
  fs.writeFileSync(png,Buffer.from([137,80,78,71,13,10,26,10,0,0]));
  let fetches=0;
  const result=await syncRobloxExperienceDetailMedia({
    universeId:'10767445741',pngPath:png,skipDuplicateUpload:true,
    fetchImpl:async()=>{fetches++;return Response.json({data:[]});}
  });
  assert.equal(fetches,1);
  assert.equal(result.imageStatus,'AWAITING_APPROVAL_NO_DUPLICATE_UPLOAD');
  assert.equal(result.verifiedDetailImage,false);
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

test('already verified same-source homepage thumbnail is not uploaded again',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'roblox-home-reuse-'));
  try{
    const root=path.join(dir,'assets','roblox-thumbnails');
    fs.mkdirSync(root,{recursive:true});
    const src=path.join(root,'cozy-island.png');
    fs.writeFileSync(src,Buffer.alloc(800,42));
    const hash=crypto.createHash('sha256').update(fs.readFileSync(src)).digest('hex');
    const prev={
      gameId:'cozy-island',universeId:'10767445741',
      sourcePath:'assets/roblox-thumbnails/cozy-island.png',
      sourceSha256:hash,renderedPngSha256:hash,
      homepageThumbnailId:'known-image',verified:true,uploaded:true
    };
    const target={gameId:'cozy-island',universeId:'10767445741',placeId:'116850096561713',dedicated:true,shared:false,verified:true};
    fs.writeFileSync(path.join(dir,'game-catalog.json'),JSON.stringify({games:[{
      id:'cozy-island',canonical:{marketing:{thumbnail:prev.sourcePath}}
    }]}));
    fs.writeFileSync(path.join(dir,'queue.json'),JSON.stringify({items:[{
      gameId:'cozy-island',robloxPublicationTarget:target,robloxThumbnailEvidence:prev
    }]}));
    const result=await syncRobloxHomepageThumbnail({
      root:dir,catalogPath:'game-catalog.json',queuePath:'queue.json',
      gameId:'cozy-island',apiKey:'',fetchImpl:async()=>{throw new Error('UPLOAD_MUST_NOT_RUN');}
    });
    assert.equal(result.homepageThumbnailId,'known-image');
    assert.equal(result.reusedWithoutUpload,true);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('changed canonical detail artwork replaces an old image without claiming immediate approval',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'roblox-detail-refresh-'));
  try{
    const png=path.join(dir,'cozy-island.png');
    fs.writeFileSync(png,Buffer.from([137,80,78,71,13,10,26,10,0,0]));
    const calls=[];
    const fetchImpl=async(url,opts={})=>{
      calls.push(String(url));
      if(String(url).includes('/media?'))return Response.json({data:[
        {assetType:'Image',assetId:101,approved:true}
      ]});
      assert.equal(String(url),'https://publish.roblox.com/v1/games/10767445741/thumbnail/image');
      if(!opts.headers['x-csrf-token'])return new Response('',{status:403,headers:{'x-csrf-token':'valid-token'}});
      return Response.json({});
    };
    const media=await syncRobloxExperienceDetailMedia({
      universeId:'10767445741',pngPath:png,cookie:'cookie',
      refreshExistingImage:true,fetchImpl
    });
    assert.equal(media.imageStatus,'UPDATED_IMAGE_SUBMITTED_AWAITING_MODERATION');
    assert.equal(media.verifiedDetailImage,false);
    assert.equal(media.canonicalImageContentVerified,false);
    assert.deepEqual(media.imageBaselineIds,['101']);
    assert.equal(media.videoPublication.captureVerified,false);
    assert.equal(media.videoPublication.maxSeconds,30);
    assert.equal(calls.length,3);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('moderation polling does not confuse old approved images with new footage or artwork',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'roblox-detail-poll-'));
  try{
    const png=path.join(dir,'cozy-island.png');
    fs.writeFileSync(png,Buffer.from([137,80,78,71,13,10,26,10,0,0]));
    const observe=async data=>syncRobloxExperienceDetailMedia({
      universeId:'10767445741',pngPath:png,skipDuplicateUpload:true,
      previousImageBaselineIds:['101'],fetchImpl:async()=>Response.json({data})
    });
    const oldApproved=await observe([{assetType:'Image',assetId:101,approved:true}]);
    assert.equal(oldApproved.imageStatus,'AWAITING_APPROVAL_NO_DUPLICATE_UPLOAD');
    assert.equal(oldApproved.verifiedDetailImage,false);
    const newPending=await observe([
      {assetType:'Image',assetId:101,approved:true},
      {assetType:'Image',assetId:202,approved:false}
    ]);
    assert.equal(newPending.newGalleryImageApproved,false);
    const newApproved=await observe([
      {assetType:'Image',assetId:101,approved:true},
      {assetType:'Image',assetId:202,approved:true}
    ]);
    assert.equal(newApproved.imageStatus,'NEW_GALLERY_IMAGE_APPROVED_SOURCE_UNVERIFIED');
    assert.equal(newApproved.verifiedDetailImage,true);
    assert.equal(newApproved.canonicalImageContentVerified,false);
    assert.deepEqual(newApproved.imageBaselineIds,['101']);
    assert.equal(newApproved.videoStatus,'NATIVE_ROBLOX_GAMEPLAY_VIDEO_NOT_PUBLISHED');
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('native gameplay editor rejects web clips and mismatched or missing runtime capture proofs',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'roblox-native-video-guard-'));
  try{
    const cap=path.join(dir,'capture.mp4'),proof=path.join(dir,'proof.json');
    fs.writeFileSync(cap,Buffer.alloc(2400,17));
    const target={gameId:'cozy-island',universeId:'10767445741',placeId:'116850096561713'};
    const args={root:dir,target,capturePath:'capture.mp4',captureEvidencePath:'proof.json'};
    assert.throws(()=>editVerifiedRobloxGameplayVideo(args),/ENOENT/);
    const evidence={
      gameId:target.gameId,universeId:target.universeId,placeId:target.placeId,
      captureSource:'WEB',sourceRevision:'a'.repeat(40),
      runtimeVerification:{pass:true,actualGameplay:true,playerAutomation:false},
      sha256:crypto.createHash('sha256').update(fs.readFileSync(cap)).digest('hex')
    };
    fs.writeFileSync(proof,JSON.stringify(evidence));
    assert.throws(()=>editVerifiedRobloxGameplayVideo(args),/ROBLOX_VIDEO_NATIVE_RUNTIME_PROOF_MISSING_OR_MISMATCH/);
    fs.writeFileSync(proof,JSON.stringify({...evidence,captureSource:'ROBLOX_NATIVE_PLAYER_CAPTURE',sha256:'0'.repeat(64)}));
    assert.throws(()=>editVerifiedRobloxGameplayVideo(args),/ROBLOX_VIDEO_NATIVE_RUNTIME_PROOF_MISSING_OR_MISMATCH/);
    fs.writeFileSync(proof,JSON.stringify({...evidence,captureSource:'ROBLOX_NATIVE_PLAYER_CAPTURE',runtimeVerification:{pass:true,actualGameplay:true,playerAutomation:true}}));
    assert.throws(()=>editVerifiedRobloxGameplayVideo(args),/ROBLOX_VIDEO_NATIVE_RUNTIME_PROOF_MISSING_OR_MISMATCH/);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('native footage edit produces short playable real-source cuts without claiming publication',()=>{
  if(spawnSync('ffmpeg',['-version'],{encoding:'utf8'}).status!==0)return;
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'roblox-native-video-edit-'));
  try{
    const target={gameId:'cozy-island',universeId:'10767445741',placeId:'116850096561713'};
    const capture=path.join(dir,'capture.mp4'),proof=path.join(dir,'proof.json');
    const make=spawnSync('ffmpeg',['-y','-loglevel','error','-f','lavfi','-i',
      'testsrc2=size=320x180:rate=24:duration=11.5',
      '-c:v','libx264','-pix_fmt','yuv420p',capture],{encoding:'utf8',timeout:60000});
    assert.equal(make.status,0,make.stderr);
    fs.writeFileSync(proof,JSON.stringify({
      gameId:target.gameId,universeId:target.universeId,placeId:target.placeId,
      captureSource:'ROBLOX_NATIVE_PLAYER_CAPTURE',sourceRevision:'f'.repeat(40),
      runtimeVerification:{pass:true,actualGameplay:true,playerAutomation:false},
      sha256:crypto.createHash('sha256').update(fs.readFileSync(capture)).digest('hex')
    }));
    const result=editVerifiedRobloxGameplayVideo({
      root:dir,target,capturePath:'capture.mp4',captureEvidencePath:'proof.json'
    });
    assert.equal(result.type,'REAL_NATIVE_ROBLOX_GAMEPLAY_EDIT');
    assert.equal(result.uploadVerified,false);
    assert.equal(result.verifiedForSubmission,false);
    assert.equal(result.manualNativeGameplayReviewRequired,true);
    assert.ok(result.expectedSeconds<30);
    const output=path.join(dir,result.editedVideoPath);
    assert.ok(fs.existsSync(output));
    assert.equal(result.editedVideoSha256,crypto.createHash('sha256').update(fs.readFileSync(output)).digest('hex'));
    assert.ok(fs.existsSync(output+'.json'));
    const probe=spawnSync('ffprobe',['-v','error','-select_streams','v:0',
      '-show_entries','stream=width,height','-of','csv=p=0',output],{encoding:'utf8'});
    assert.equal(probe.status,0,probe.stderr);
    assert.match(probe.stdout,/1280,720/);
    assert.throws(()=>editVerifiedRobloxGameplayVideo({
      root:dir,target,capturePath:'capture.mp4',captureEvidencePath:'proof.json',
      outputPath:'assets/homepage-media/cozy-island.mp4'
    }),/ROBLOX_VIDEO_OUTPUT_MUST_BE_TEMP_EDIT/);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('automatic Roblox video edit stays blocked without genuine native capture, without affecting detail image sync',async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'roblox-auto-video-'));
  try{
    const target={gameId:'cozy-island',universeId:'10767445741',placeId:'116850096561713',
      dedicated:true,shared:false,verified:true};
    const source='assets/roblox-thumbnails/cozy-island.png';
    fs.mkdirSync(path.join(root,'assets','roblox-thumbnails'),{recursive:true});
    const image=Buffer.alloc(700,42);
    fs.writeFileSync(path.join(root,source),image);
    const hash=crypto.createHash('sha256').update(image).digest('hex');
    fs.writeFileSync(path.join(root,'game-catalog.json'),JSON.stringify({games:[
      {id:target.gameId,canonical:{marketing:{thumbnail:source}}}
    ]}));
    fs.writeFileSync(path.join(root,'queue.json'),JSON.stringify({items:[{
      gameId:target.gameId,robloxPublicationTarget:target,
      robloxDetailMediaEvidence:{gameId:target.gameId,universeId:target.universeId,
        sourceSha256:hash,imageStatus:'SUBMITTED_AWAITING_ROBLOX_MODERATION'}
    }]}));
    let fetches=0;
    const opts={
      root,catalogPath:'game-catalog.json',queuePath:'queue.json',gameId:target.gameId,
      detailOnly:true,fetchImpl:async()=>{fetches++;return Response.json({data:[]});}
    };
    const first=await syncRobloxHomepageThumbnail(opts);
    assert.equal(first.automaticVideo.status,'NATIVE_RUNTIME_CAPTURE_UNAVAILABLE');
    assert.equal(first.automaticVideo.videoPublished,false);
    assert.equal(first.imageStatus,'AWAITING_APPROVAL_NO_DUPLICATE_UPLOAD');
    assert.equal(fetches,1);
    const dir=path.join(root,'assets','runtime-evidence','roblox',target.gameId,'2026-10-27','artifact');
    fs.mkdirSync(dir,{recursive:true});
    fs.writeFileSync(path.join(dir,'capture.mp4'),Buffer.alloc(2000,24));
    fs.writeFileSync(path.join(dir,'capture.json'),JSON.stringify({
      gameId:target.gameId,universeId:target.universeId,placeId:target.placeId,
      captureSource:'WEB',sourceRevision:'a'.repeat(40),
      sha256:crypto.createHash('sha256').update(Buffer.alloc(2000,24)).digest('hex'),
      runtimeVerification:{pass:true,actualGameplay:true,playerAutomation:false}
    }));
    const second=await syncRobloxHomepageThumbnail(opts);
    assert.equal(second.automaticVideo.status,'NATIVE_CAPTURE_REJECTED_OR_EDIT_FAILED');
    assert.equal(second.automaticVideo.videoPublished,false);
    assert.equal(second.videoStatus,'NATIVE_ROBLOX_GAMEPLAY_VIDEO_NOT_PUBLISHED');
    assert.equal(fetches,2);
    assert.equal(fs.existsSync(path.join(root,'.tmp','roblox-detail-evidence',target.gameId+'-edited.mp4')),false);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('unattended concept trailer is visibly labeled promotional artwork, never native Roblox gameplay',()=>{
  if(spawnSync('ffmpeg',['-version'],{encoding:'utf8'}).status!==0)return;
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'roblox-concept-video-'));
  try{
    const target={gameId:'cozy-island',universeId:'10767445741',placeId:'116850096561713',
      source:'assets/roblox-thumbnails/cozy-island.png'};
    const source=path.join(root,target.source);
    const renderedPath=path.join(root,'.tmp','roblox-thumbnails','cozy-island.png');
    fs.mkdirSync(path.dirname(source),{recursive:true});
    fs.mkdirSync(path.dirname(renderedPath),{recursive:true});
    const make=spawnSync('ffmpeg',['-y','-loglevel','error','-f','lavfi','-i',
      'color=c=0x3b5369:s=1920x1080:d=1','-frames:v','1',source],
      {encoding:'utf8',timeout:60000});
    assert.equal(make.status,0,make.stderr);
    fs.copyFileSync(source,renderedPath);
    const checksum=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
    const validated={sourcePath:source,sha256:checksum(source)};
    const rendered={outputPath:renderedPath,sha256:checksum(renderedPath)};
    const result=renderRobloxConceptTrailer({
      root,target,validated,rendered,durationSeconds:3
    });
    assert.equal(result.kind,'AUTOMATED_CANONICAL_ART_MOTION_PROMO');
    assert.equal(result.platform,'MARKETING_ARTWORK_NOT_ROBLOX_GAMEPLAY');
    assert.equal(result.actualGameplay,false);
    assert.equal(result.nativeCaptureVerified,false);
    assert.equal(result.videoPublished,false);
    assert.equal(result.uploadAllowed,false);
    assert.match(result.onScreenDisclosure,/NOT GAMEPLAY/);
    assert.ok(fs.existsSync(path.join(root,result.videoPath)));
    assert.ok(fs.existsSync(path.join(root,result.videoPath+'.json')));
    assert.equal(result.videoSha256,checksum(path.join(root,result.videoPath)));
    assert.ok(result.seconds>=2.5&&result.seconds<=3.5);
    assert.throws(()=>renderRobloxConceptTrailer({
      root,target,validated:{...validated,sha256:'0'.repeat(64)},rendered,durationSeconds:3
    }),/ROBLOX_CONCEPT_CANONICAL_SOURCE_INTEGRITY_FAILED/);
    assert.throws(()=>renderRobloxConceptTrailer({
      root,target:{...target,source:'assets/roblox-thumbnails/another-game.png'},
      validated,rendered,durationSeconds:3
    }),/ROBLOX_CONCEPT_VERIFIED_GAME_TARGET_REQUIRED/);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
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
  assert.match(workflow,/Archive native gameplay edits and separately labeled art previews/);
  assert.match(workflow,/Render official-source concept art previews without gameplay claims/);
  assert.match(workflow,/concept-only=true/);
  assert.match(workflow,/concept-trailer\\.mp4/);
  assert.match(workflow,/if-no-files-found: ignore/);
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
  assert.equal(contract.canonicalImageAuthority.duplicateIndependentRobloxAndHomepageArtForbidden,true);
  assert.equal(contract.robloxOpenCloud.verifiedUniverseOnly,true);
  assert.equal(contract.robloxOpenCloud.failClosedWhenScopeMissing,true);
  assert.equal(architecture.release,'UNVERIFIED_OR_MISSING_POLICY_MUST_NOT_PASS');
  assert.equal(security.defaultTrust,'DENY_OR_QUARANTINE_UNTIL_VERIFIED');
});
