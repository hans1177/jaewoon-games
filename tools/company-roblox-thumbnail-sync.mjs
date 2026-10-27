import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {csrfFetch} from './company-roblox-dedicated-experience.mjs';

const clean=v=>String(v??'').trim();
const readJson=file=>JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));
const writeJson=(file,value)=>{fs.mkdirSync(path.dirname(path.resolve(file)),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n','utf8');};
const sha256=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const validId=value=>/^[1-9][0-9]*$/.test(clean(value));
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));

export function resolveRobloxThumbnailTarget({catalog={},queue={},gameId=''}) {
  const id=clean(gameId);
  const game=(catalog.games||[]).find(row=>clean(row?.id||row?.gameId)===id);
  if(!game)throw new Error('ROBLOX_THUMBNAIL_CATALOG_GAME_MISSING:'+id);
  const canonical=game.canonical&&typeof game.canonical==='object'?game.canonical:{};
  const source=clean(canonical?.marketing?.thumbnail||game.marketingThumbnail||canonical?.identity?.image||game.image);
  if(!source)throw new Error('ROBLOX_THUMBNAIL_SOURCE_MISSING:'+id);
  if(!source.startsWith('assets/roblox-thumbnails/'))throw new Error('ROBLOX_THUMBNAIL_SOURCE_NOT_CANONICAL:'+source);
  // 메인: Roblox 공식 서버에 검증된 해당 게임의 전용 universe/place만 업로드한다.
  const item=(queue.items||[]).find(row=>clean(row?.gameId)===id)||{};
  const target=item.robloxPublicationTarget||{};
  if(target.verified!==true||target.dedicated!==true||target.shared===true
    ||clean(target.gameId||id)!==id
    ||!validId(target.universeId)||!validId(target.placeId)){
    throw new Error('ROBLOX_THUMBNAIL_VERIFIED_DEDICATED_TARGET_MISSING:'+id);
  }
  if(!source.startsWith('assets/roblox-thumbnails/'+id+'.')){
    throw new Error('ROBLOX_THUMBNAIL_WRONG_GAME_SOURCE:'+id);
  }
  return Object.freeze({
    gameId:id,source,universeId:clean(target.universeId),placeId:clean(target.placeId),
    name:clean(canonical?.identity?.name||game.name||id)
  });
}

export function validateCanonicalThumbnail({root='.',target={}}={}) {
  const sourcePath=path.resolve(root,target.source||'');
  const rootPath=path.resolve(root,'assets/roblox-thumbnails');
  if(!sourcePath.startsWith(rootPath+path.sep))throw new Error('ROBLOX_THUMBNAIL_SOURCE_OUTSIDE_CANONICAL_ROOT');
  if(!fs.existsSync(sourcePath))throw new Error('ROBLOX_THUMBNAIL_SOURCE_FILE_MISSING:'+target.source);
  const stat=fs.statSync(sourcePath);
  if(!stat.isFile()||stat.size<512)throw new Error('ROBLOX_THUMBNAIL_SOURCE_FILE_INVALID:'+target.source);
  const ext=path.extname(sourcePath).toLowerCase();
  if(!['.svg','.png','.jpg','.jpeg'].includes(ext))throw new Error('ROBLOX_THUMBNAIL_SOURCE_FORMAT_UNSUPPORTED:'+ext);
  if(ext==='.svg'){
    const text=fs.readFileSync(sourcePath,'utf8');
    if(!/viewBox=["']0\s+0\s+1920\s+1080["']/i.test(text)&&!/width=["']1920["'][^>]+height=["']1080["']/i.test(text)){
      throw new Error('ROBLOX_THUMBNAIL_SOURCE_NOT_16_9_1920x1080:'+target.source);
    }
  }
  return Object.freeze({sourcePath,ext,size:stat.size,sha256:sha256(sourcePath)});
}

export function renderThumbnailPng({sourcePath,outputPath,command='rsvg-convert'}={}) {
  fs.mkdirSync(path.dirname(path.resolve(outputPath)),{recursive:true});
  const ext=path.extname(sourcePath).toLowerCase();
  if(ext==='.png'){
    fs.copyFileSync(sourcePath,outputPath);
  }else if(ext==='.jpg'||ext==='.jpeg'){
    const proc=spawnSync('convert',[sourcePath,'-resize','1920x1080^','-gravity','center','-extent','1920x1080',outputPath],{encoding:'utf8'});
    if(proc.status!==0)throw new Error('ROBLOX_THUMBNAIL_RENDER_FAILED:'+clean(proc.stderr||proc.stdout));
  }else{
    const proc=spawnSync(command,['--width','1920','--height','1080','--format','png','--output',outputPath,sourcePath],{encoding:'utf8'});
    if(proc.status!==0)throw new Error('ROBLOX_THUMBNAIL_RENDER_FAILED:'+clean(proc.stderr||proc.stdout));
  }
  const stat=fs.statSync(outputPath);
  if(stat.size<=0||stat.size>3*1024*1024)throw new Error('ROBLOX_THUMBNAIL_RENDER_SIZE_INVALID:'+stat.size);
  return Object.freeze({outputPath,size:stat.size,sha256:sha256(outputPath)});
}

export async function uploadRobloxHomepageThumbnail({
  universeId,
  pngPath,
  apiKey,
  fetchImpl=globalThis.fetch,
  sleepImpl=wait,
  attempts=120
}={}) {
  if(!validId(universeId))throw new Error('ROBLOX_THUMBNAIL_UNIVERSE_INVALID');
  if(!clean(apiKey))throw new Error('ROBLOX_THUMBNAIL_API_KEY_MISSING');
  if(!pngPath||!fs.existsSync(pngPath))throw new Error('ROBLOX_THUMBNAIL_PNG_MISSING');
  const base='https://apis.roblox.com/thumbnail-personalization-api/v1/universes/'+universeId;
  const bytes=fs.readFileSync(pngPath);
  const form=new FormData();
  form.append('files',new Blob([bytes],{type:'image/png'}),path.basename(pngPath));
  const upload=await fetchImpl(base+'/thumbnails/uploads',{
    method:'POST',
    headers:{'x-api-key':apiKey},
    body:form
  });
  const uploadText=await upload.text();
  let payload={};
  try{payload=uploadText?JSON.parse(uploadText):{};}catch{}
  if(!upload.ok)throw new Error('ROBLOX_THUMBNAIL_UPLOAD_FAILED:'+upload.status+':'+uploadText.slice(0,500));
  const operationId=clean(payload?.fileToOperationIdDict?.[path.basename(pngPath)]||Object.values(payload?.fileToOperationIdDict||{})[0]);
  if(!operationId)throw new Error('ROBLOX_THUMBNAIL_OPERATION_ID_MISSING');
  for(let attempt=1;attempt<=Math.max(1,Number(attempts)||1);attempt++){
    const status=await fetchImpl(base+'/thumbnails/uploads/status?operationIds='+encodeURIComponent(operationId),{
      headers:{'x-api-key':apiKey}
    });
    const statusText=await status.text();
    let body={};
    try{body=statusText?JSON.parse(statusText):{};}catch{}
    if(!status.ok)throw new Error('ROBLOX_THUMBNAIL_STATUS_FAILED:'+status.status+':'+statusText.slice(0,500));
    const state=clean(body?.uploadStatus);
    // 메인: 로블록스는 완료된 작업만 작업 ID별로 반환하며 상태를 숫자로도 보낸다.
    const row=body?.uploadThumbnailStatusDict?.[operationId];
    const thumbnailId=clean(row?.homepageThumbnailId||row?.thumbnailId);
    if(state.toLowerCase()==='finished'||(['1','2'].includes(state)&&thumbnailId)){
      if(!thumbnailId)throw new Error('ROBLOX_THUMBNAIL_FINISHED_WITHOUT_ID');
      return Object.freeze({uploaded:true,operationId,thumbnailId,uploadStatus:state,attempt});
    }
    if(/failed|error|rejected/i.test(state))throw new Error('ROBLOX_THUMBNAIL_PROCESSING_FAILED:'+statusText.slice(0,500));
    if(attempt===1||attempt%12===0)console.log('ROBLOX_THUMBNAIL_PROCESSING_PENDING:attempt='+attempt+':state='+(state||'UNKNOWN'));
    if(attempt<Math.max(1,Number(attempts)||1))await sleepImpl(2500);
  }
  throw new Error('ROBLOX_THUMBNAIL_PROCESSING_TIMEOUT:'+operationId);
}

// 메인: 실제 Roblox 게임 화면에서 촬영한 검증 가능한 원본만 하이라이트 편집한다.
// 가짜 게임플레이 합성이나 웹 동반 게임 촬영본을 Roblox 영상으로 변환하지 않는다.
export function editVerifiedRobloxGameplayVideo({
  root='.',target={},capturePath='',captureEvidencePath='',outputPath='',
  ffmpegCommand='ffmpeg',ffprobeCommand='ffprobe'
}={}){
  const gameId=clean(target.gameId),universeId=clean(target.universeId),placeId=clean(target.placeId);
  if(!gameId||!validId(universeId)||!validId(placeId))throw new Error('ROBLOX_VIDEO_VERIFIED_TARGET_REQUIRED');
  if(!capturePath||!captureEvidencePath)throw new Error('ROBLOX_VIDEO_NATIVE_CAPTURE_AND_EVIDENCE_REQUIRED');
  const src=path.resolve(root,capturePath);
  const evidence=readJson(path.resolve(root,captureEvidencePath));
  if(!fs.existsSync(src)||!fs.statSync(src).isFile()||fs.statSync(src).size<1024
    ||fs.statSync(src).size>200*1024*1024||!['.mp4','.mov'].includes(path.extname(src).toLowerCase()))
    throw new Error('ROBLOX_VIDEO_CAPTURE_INVALID');
  const originalHash=sha256(src);
  const allowedSources=new Set(['ROBLOX_NATIVE_PLAYER_CAPTURE','ROBLOX_APPROVED_STUDIO_RUNTIME_CAPTURE']);
  if(evidence.gameId!==gameId||clean(evidence.universeId)!==universeId
    ||clean(evidence.placeId)!==placeId
    ||!allowedSources.has(evidence.captureSource)
    ||evidence.runtimeVerification?.pass!==true
    ||evidence.runtimeVerification?.actualGameplay!==true
    ||evidence.runtimeVerification?.playerAutomation===true
    ||!(/^[a-f0-9]{40}$/.test(clean(evidence.sourceRevision)))
    ||clean(evidence.sha256).toLowerCase()!==originalHash)
    throw new Error('ROBLOX_VIDEO_NATIVE_RUNTIME_PROOF_MISSING_OR_MISMATCH');
  const probe=spawnSync(ffprobeCommand,['-v','error','-show_entries','format=duration:stream=codec_type,width,height',
    '-of','json',src],{encoding:'utf8',timeout:30000});
  if(probe.status!==0)throw new Error('ROBLOX_VIDEO_PROBE_FAILED');
  let metadata={};
  try{metadata=JSON.parse(probe.stdout||'{}');}catch{throw new Error('ROBLOX_VIDEO_PROBE_INVALID');}
  const duration=Number(metadata?.format?.duration);
  const stream=(metadata.streams||[]).find(row=>row.codec_type==='video');
  if(!Number.isFinite(duration)||duration<3||duration>1800||!stream?.width||!stream?.height)
    throw new Error('ROBLOX_VIDEO_UNUSABLE_NATIVE_FOOTAGE');
  // 편집: 실제 원본에서 서로 다른 플레이 구간만 선택해 30초 미만으로 구성.
  const windows=duration>=21
    ?[[0,6],[duration/2-3.5,duration/2+3.5],[duration-7,duration-0.2]]
    :duration>=11
      ?[[0,Math.min(5,duration/2)],[duration-Math.min(6,duration/2),duration-0.2]]
      :[[0,Math.min(duration-0.2,9)]];
  const selections=windows.map(([a,b])=>[Number(a.toFixed(3)),Number(b.toFixed(3))]);
  const seconds=selections.reduce((sum,[a,b])=>sum+b-a,0);
  const output=path.resolve(root,outputPath||path.join('.tmp','roblox-detail-evidence',gameId+'-edited.mp4'));
  const permittedOutputRoot=path.resolve(root,'.tmp','roblox-detail-evidence');
  if(!output.startsWith(permittedOutputRoot+path.sep)||path.extname(output).toLowerCase()!=='.mp4')
    throw new Error('ROBLOX_VIDEO_OUTPUT_MUST_BE_TEMP_EDIT');
  if(output===src)throw new Error('ROBLOX_VIDEO_MUST_PRESERVE_ORIGINAL');
  fs.mkdirSync(path.dirname(output),{recursive:true});
  const stages=selections.map(([start,end],i)=>'[0:v]trim=start='+start+':end='+end
    +',setpts=PTS-STARTPTS,scale=1280:720:force_original_aspect_ratio=decrease,'
    +'pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=24,format=yuv420p[v'+i+']');
  const fadeOut=Math.max(0,seconds-.45).toFixed(3);
  const filter=stages.join(';')+';'+selections.map((_,i)=>'[v'+i+']').join('')
    +'concat=n='+selections.length+':v=1:a=0,fade=t=in:st=0:d=0.2,fade=t=out:st='+fadeOut+':d=0.4[out]';
  const render=spawnSync(ffmpegCommand,['-y','-loglevel','error','-i',src,
    '-filter_complex',filter,'-map','[out]','-an','-c:v','libx264','-preset','fast',
    '-crf','23','-maxrate','3500k','-bufsize','7000k','-pix_fmt','yuv420p',
    '-movflags','+faststart',output],{encoding:'utf8',timeout:150000});
  if(render.status!==0||!fs.existsSync(output)||fs.statSync(output).size<1024
    ||fs.statSync(output).size>15*1024*1024)
    throw new Error('ROBLOX_VIDEO_EDIT_FAILED:'+clean(render.stderr||'INVALID_OUTPUT').slice(0,350));
  const result=Object.freeze({
    gameId,universeId,placeId,captureSource:evidence.captureSource,
    sourceRevision:evidence.sourceRevision,sourceSha256:originalHash,
    editedVideoPath:path.relative(path.resolve(root),output).replaceAll(path.sep,'/'),
    editedVideoSha256:sha256(output),editedVideoBytes:fs.statSync(output).size,
    expectedSeconds:Number(seconds.toFixed(3)),editedSegments:selections,
    type:'REAL_NATIVE_ROBLOX_GAMEPLAY_EDIT',uploadVerified:false,
    verifiedForSubmission:false,manualNativeGameplayReviewRequired:true,moderationApproved:false,
    notes:'Official Creator Dashboard video submission and moderation not yet completed.'
  });
  writeJson(output+'.json',result);
  console.log('ROBLOX_NATIVE_VIDEO_EDIT=PASS:'+gameId+':'+result.editedVideoSha256);
  console.log('ROBLOX_NATIVE_VIDEO_UPLOAD=PENDING_CREATOR_DASHBOARD:'+gameId);
  return result;
}

// 메인: 공식 경험 상세 페이지의 이미지는 홈 개인화 썸네일과 별개로 관리한다.
// 원본 플레이 영상은 Roblox 네이티브 실제 실행 증거 없이는 게시하지 않는다.
export async function syncRobloxExperienceDetailMedia({
  universeId,pngPath,cookie='',skipDuplicateUpload=false,refreshExistingImage=false,
  previousImageBaselineIds=[],fetchImpl=globalThis.fetch
}={}) {
  if(!validId(universeId))throw new Error('ROBLOX_DETAIL_UNIVERSE_INVALID');
  if(!pngPath||!fs.existsSync(pngPath))throw new Error('ROBLOX_DETAIL_PNG_MISSING');
  const endpoint='https://games.roblox.com/v2/games/'+universeId+'/media?fetchAllExperienceRelatedMedia=true';
  const observed=await fetchImpl(endpoint,{headers:{accept:'application/json'}});
  if(!observed.ok)throw new Error('ROBLOX_DETAIL_MEDIA_FETCH_FAILED:HTTP_'+observed.status);
  let payload={};
  try{payload=await observed.json();}catch{throw new Error('ROBLOX_DETAIL_MEDIA_INVALID_JSON');}
  if(!Array.isArray(payload.data))throw new Error('ROBLOX_DETAIL_MEDIA_INVALID_RESPONSE');
  const images=payload.data.filter(row=>row?.assetType==='Image'||row?.assetTypeId===1);
  const videos=payload.data.filter(row=>row?.assetType==='Video'||row?.assetTypeId===33||Boolean(row?.videoHash));
  // 메인: 같은 원본의 심사 대기 상태에서는 중복 제출을 막는다.
  // 교체 대상 이미지가 바뀌면 기존 상세 이미지가 있어도 새 원본을 제출한다.
  const assetId=row=>clean(row?.assetId||row?.imageId||row?.id);
  const baseline=new Set(previousImageBaselineIds.map(clean).filter(Boolean));
  const newlyApproved=skipDuplicateUpload&&images.some(row=>assetId(row)&&!baseline.has(assetId(row))&&row.approved===true);
  let imageStatus=images.length?'EXISTING_GAME_DETAIL_IMAGE':'PENDING_IMAGE_UPLOAD';
  if(skipDuplicateUpload){
    imageStatus=newlyApproved?'NEW_GALLERY_IMAGE_APPROVED_SOURCE_UNVERIFIED':'AWAITING_APPROVAL_NO_DUPLICATE_UPLOAD';
  }else if(!images.length||refreshExistingImage){
    if(!clean(cookie))throw new Error('ROBLOX_DETAIL_COOKIE_MISSING');
    const form=new FormData();
    form.append('Files',new Blob([fs.readFileSync(pngPath)],{type:'image/png'}),path.basename(pngPath));
    const result=await csrfFetch({
      url:'https://publish.roblox.com/v1/games/'+universeId+'/thumbnail/image',
      cookie,fetchImpl,method:'POST',body:form
    });
    if(!result.ok)throw new Error('ROBLOX_DETAIL_IMAGE_UPLOAD_FAILED:HTTP_'+result.status);
    imageStatus=refreshExistingImage
      ?'UPDATED_IMAGE_SUBMITTED_AWAITING_MODERATION'
      :'SUBMITTED_AWAITING_ROBLOX_MODERATION';
  }
  const approvedVideos=videos.filter(row=>row.approved===true);
  // 영상은 실제 Roblox 플레이가 확인된 원본만 Creator Dashboard에 게시 가능.
  // 조회 결과나 회사 웹 플레이 영상은 실제 네이티브 촬영 증거가 아니다.
  return Object.freeze({
    universeId:clean(universeId),
    imageStatus,
    verifiedDetailImage:newlyApproved||(!skipDuplicateUpload&&!refreshExistingImage&&images.some(row=>row.approved===true)),
    canonicalImageContentVerified:false,
    newGalleryImageApproved:newlyApproved,
    imageBaselineIds:skipDuplicateUpload?Array.from(baseline):images.map(assetId).filter(Boolean),
    existingImageCount:images.length,
    approvedRobloxGameplayVideoCount:approvedVideos.length,
    videoStatus:approvedVideos.length
      ?'ROBLOX_NATIVE_PLAYBACK_PROOF_STILL_REQUIRED'
      :'NATIVE_ROBLOX_GAMEPLAY_VIDEO_NOT_PUBLISHED',
    videoPublication:{
      requirement:'ACTUAL_NATIVE_ROBLOX_GAMEPLAY_CAPTURE',
      maxSeconds:30,
      monthlyUploadQuota:3,
      destination:'CREATOR_DASHBOARD_PLACE_VIDEOS',
      automationPlayerControlAllowed:false,
      captureVerified:false,
      uploadVerified:approvedVideos.length>0,
      nextAction:approvedVideos.length
        ?'VERIFY_APPROVED_VIDEO_MATCHES_CURRENT_NATIVE_GAMEPLAY'
        :'CAPTURE_ACTUAL_GAMEPLAY_THEN_UPLOAD_VIA_CREATOR_DASHBOARD'
    },
    checkedAt:new Date().toISOString(),
    authority:'ROBLOX_OFFICIAL_EXPERIENCE_DETAIL_MEDIA'
  });
}

export async function syncRobloxHomepageThumbnail({
  root='.',
  catalogPath='game-catalog.json',
  queuePath='../runtime/development-queue.json',
  gameId='',
  apiKey='',
  robloxCookie='',
  detailOnly=false,
  outputPath='',
  renderCommand='rsvg-convert',
  fetchImpl=globalThis.fetch,
  sleepImpl=wait
}={}) {
  const catalog=readJson(path.resolve(root,catalogPath));
  const queue=readJson(path.resolve(root,queuePath));
  const target=resolveRobloxThumbnailTarget({catalog,queue,gameId});
  const validated=validateCanonicalThumbnail({root,target});
  const pngPath=path.resolve(root,'.tmp','roblox-thumbnails',target.gameId+'.png');
  const rendered=renderThumbnailPng({sourcePath:validated.sourcePath,outputPath:pngPath,command:renderCommand});
  console.log('ROBLOX_THUMBNAIL_SOURCE='+target.source);
  console.log('ROBLOX_THUMBNAIL_SOURCE_SHA256='+validated.sha256);
  console.log('ROBLOX_THUMBNAIL_RENDER=PASS:size='+rendered.size);
  if(detailOnly){
    const previous=(queue.items||[]).find(item=>clean(item?.gameId)===target.gameId)?.robloxDetailMediaEvidence||{};
    const samePreviousUpload=previous.gameId===target.gameId
      &&previous.universeId===target.universeId
      &&previous.sourceSha256===validated.sha256
      &&['SUBMITTED_AWAITING_ROBLOX_MODERATION','UPDATED_IMAGE_SUBMITTED_AWAITING_MODERATION','AWAITING_APPROVAL_NO_DUPLICATE_UPLOAD','NEW_GALLERY_IMAGE_APPROVED_SOURCE_UNVERIFIED'].includes(previous.imageStatus);
    const refreshExistingImage=previous.gameId===target.gameId
      &&previous.universeId===target.universeId
      &&Boolean(previous.sourceSha256)
      &&previous.sourceSha256!==validated.sha256;
    const media=await syncRobloxExperienceDetailMedia({
      universeId:target.universeId,pngPath,cookie:robloxCookie,
      skipDuplicateUpload:samePreviousUpload,refreshExistingImage,
      previousImageBaselineIds:Array.isArray(previous.imageBaselineIds)?previous.imageBaselineIds:[],fetchImpl
    });
    // 메인: 인증된 Roblox 런타임 촬영본이 있으면 사람이 버튼을 누르지 않아도 컷 편집한다.
    // 영상 원본은 기존 중앙 런타임 증거 경로만 인정하며 파일이 없다면 제작 완료로 표시하지 않는다.
    const nativeRoot=path.resolve(root,'assets/runtime-evidence/roblox',target.gameId);
    let automaticVideo={status:'NATIVE_RUNTIME_CAPTURE_UNAVAILABLE',videoPublished:false};
    if(fs.existsSync(nativeRoot)&&fs.statSync(nativeRoot).isDirectory()){
      const pending=[nativeRoot],clips=[],rootReal=fs.realpathSync(nativeRoot);
      let seen=0;
      while(pending.length&&seen<128){
        const folder=pending.pop();seen++;
        const entries=fs.readdirSync(folder,{withFileTypes:true}).sort((a,b)=>b.name.localeCompare(a.name));
        for(const entry of entries){
          if(entry.isSymbolicLink())continue;
          const full=path.join(folder,entry.name);
          if(entry.isDirectory()&&pending.length+seen<128){pending.push(full);continue;}
          if(!entry.isFile()||!/[.]mp4$/i.test(entry.name))continue;
          const proof=full.replace(/[.]mp4$/i,'.json');
          if(fs.existsSync(proof)&&fs.realpathSync(full).startsWith(rootReal+path.sep)
            &&fs.realpathSync(proof).startsWith(rootReal+path.sep))clips.push({full,proof});
        }
      }
      clips.sort((a,b)=>b.full.localeCompare(a.full));
      for(const clip of clips.slice(0,8)){
        try{
          const edited=editVerifiedRobloxGameplayVideo({
            root,target,capturePath:path.relative(path.resolve(root),clip.full),
            captureEvidencePath:path.relative(path.resolve(root),clip.proof)
          });
          automaticVideo={
            status:'NATIVE_VIDEO_EDITED_PENDING_REVIEW_AND_PUBLICATION',
            videoPublished:false,source:edited.sourceSha256,
            editedVideoPath:edited.editedVideoPath,
            editedVideoSha256:edited.editedVideoSha256,
            editedVideoBytes:edited.editedVideoBytes,
            manualNativeGameplayReviewRequired:true
          };
          break;
        }catch(error){
          automaticVideo={status:'NATIVE_CAPTURE_REJECTED_OR_EDIT_FAILED',
            videoPublished:false,reason:clean(error?.message).slice(0,160)};
        }
      }
    }
    console.log('ROBLOX_DETAIL_NATIVE_VIDEO_AUTOMATION='+target.gameId+':'+automaticVideo.status);
    const evidence={
      version:1,gameId:target.gameId,placeId:target.placeId,
      sourcePath:target.source,sourceSha256:validated.sha256,
      renderedPngSha256:rendered.sha256,...media,
      automaticVideo
    };
    if(clean(outputPath))writeJson(path.resolve(root,outputPath),evidence);
    console.log('ROBLOX_DETAIL_IMAGE_STATE='+media.imageStatus);
    console.log('ROBLOX_DETAIL_MEDIA_VIDEO_STATE='+media.videoStatus);
    console.log('ROBLOX_DETAIL_MEDIA_VERIFIED='+String(media.verifiedDetailImage));
    return evidence;
  }
  // 메인: 동일 원본에 대한 검증된 서버 업로드는 재사용해 중복 업로드를 막는다.
  const previous=(queue.items||[]).find(item=>clean(item?.gameId)===target.gameId)?.robloxThumbnailEvidence||{};
  if(previous.verified===true&&previous.uploaded===true
    &&previous.gameId===target.gameId&&previous.universeId===target.universeId
    &&previous.sourcePath===target.source&&previous.sourceSha256===validated.sha256
    &&previous.renderedPngSha256===rendered.sha256
    &&clean(previous.homepageThumbnailId)){
    const evidence={...previous,reusedWithoutUpload:true};
    if(clean(outputPath))writeJson(path.resolve(root,outputPath),evidence);
    console.log('ROBLOX_THUMBNAIL_UPLOAD=REUSED_VERIFIED:'+target.gameId);
    console.log('ROBLOX_THUMBNAIL_VERIFY=REUSED:thumbnailId='+previous.homepageThumbnailId);
    return evidence;
  }
  const uploaded=await uploadRobloxHomepageThumbnail({
    universeId:target.universeId,pngPath,apiKey,fetchImpl,sleepImpl
  });
  const evidence={
    version:1,
    gameId:target.gameId,
    universeId:target.universeId,
    placeId:target.placeId,
    sourcePath:target.source,
    sourceSha256:validated.sha256,
    renderedPngSha256:rendered.sha256,
    operationId:uploaded.operationId,
    homepageThumbnailId:uploaded.thumbnailId,
    uploadStatus:uploaded.uploadStatus,
    uploaded:true,
    verified:true,
    uploadedAt:new Date().toISOString(),
    authority:'ROBLOX_OPEN_CLOUD_THUMBNAIL_PERSONALIZATION'
  };
  if(clean(outputPath))writeJson(path.resolve(root,outputPath),evidence);
  console.log('ROBLOX_THUMBNAIL_UPLOAD=PASS:operation='+uploaded.operationId);
  console.log('ROBLOX_THUMBNAIL_VERIFY=PASS:thumbnailId='+uploaded.thumbnailId);
  console.log('HOMEPAGE_MARKETING_IMAGE_SYNC=PASS:'+target.source);
  return evidence;
}

function args(argv=process.argv.slice(2)){
  const out={};
  for(const raw of argv){
    if(!raw.startsWith('--'))continue;
    const i=raw.indexOf('=');
    if(i<0)out[raw.slice(2)]=true;
    else out[raw.slice(2,i)]=raw.slice(i+1);
  }
  return out;
}

async function main(){
  const a=args();
  if(a['edit-native']==='true'){
    const root=clean(a.root)||'.';
    const catalog=readJson(path.resolve(root,clean(a.catalog)||'game-catalog.json'));
    const queue=readJson(path.resolve(root,clean(a.queue)||'../runtime/development-queue.json'));
    const target=resolveRobloxThumbnailTarget({catalog,queue,gameId:clean(a['game-id'])});
    editVerifiedRobloxGameplayVideo({
      root,target,capturePath:clean(a['native-capture']),
      captureEvidencePath:clean(a['native-evidence']),
      outputPath:clean(a.output)
    });
    return;
  }
  await syncRobloxHomepageThumbnail({
    root:clean(a.root)||'.',
    catalogPath:clean(a.catalog)||'game-catalog.json',
    queuePath:clean(a.queue)||'../runtime/development-queue.json',
    gameId:clean(a['game-id']),
    apiKey:process.env.ROBLOX_OPEN_CLOUD_API_KEY||'',
    robloxCookie:process.env.ROBLOX_ROBLOSECURITY||process.env.ROBLOX_SECURITY_COOKIE||'',
    detailOnly:a['detail-only']==='true',
    outputPath:clean(a.output),
    renderCommand:clean(a['render-command'])||'rsvg-convert'
  });
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  main().catch(error=>{console.error(error?.stack||error);process.exit(1);});
}
