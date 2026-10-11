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
  attempts=30
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
    const rows=body?.uploadThumbnailStatusDict&&typeof body.uploadThumbnailStatusDict==='object'?Object.values(body.uploadThumbnailStatusDict):[];
    const thumbnailId=clean(rows[0]?.homepageThumbnailId||rows[0]?.thumbnailId);
    if(state.toLowerCase()==='finished'){
      if(!thumbnailId)throw new Error('ROBLOX_THUMBNAIL_FINISHED_WITHOUT_ID');
      return Object.freeze({uploaded:true,operationId,thumbnailId,uploadStatus:state,attempt});
    }
    if(/failed|error|rejected/i.test(state))throw new Error('ROBLOX_THUMBNAIL_PROCESSING_FAILED:'+statusText.slice(0,500));
    await sleepImpl(1000);
  }
  throw new Error('ROBLOX_THUMBNAIL_PROCESSING_TIMEOUT:'+operationId);
}

// 메인: 공식 경험 상세 페이지의 이미지는 홈 개인화 썸네일과 별개로 관리한다.
// 원본 플레이 영상은 Roblox 네이티브 실제 실행 증거 없이는 게시하지 않는다.
export async function syncRobloxExperienceDetailMedia({
  universeId,pngPath,cookie='',skipDuplicateUpload=false,fetchImpl=globalThis.fetch
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
  let imageStatus=images.length?'EXISTING_GAME_DETAIL_IMAGE':'PENDING_IMAGE_UPLOAD';
  if(!images.length&&skipDuplicateUpload){
    imageStatus='AWAITING_APPROVAL_NO_DUPLICATE_UPLOAD';
  }else if(!images.length){
    if(!clean(cookie))throw new Error('ROBLOX_DETAIL_COOKIE_MISSING');
    const form=new FormData();
    form.append('Files',new Blob([fs.readFileSync(pngPath)],{type:'image/png'}),path.basename(pngPath));
    const result=await csrfFetch({
      url:'https://publish.roblox.com/v1/games/'+universeId+'/thumbnail/image',
      cookie,fetchImpl,method:'POST',body:form
    });
    if(!result.ok)throw new Error('ROBLOX_DETAIL_IMAGE_UPLOAD_FAILED:HTTP_'+result.status);
    imageStatus='SUBMITTED_AWAITING_ROBLOX_MODERATION';
  }
  return Object.freeze({
    universeId:clean(universeId),
    imageStatus,verifiedDetailImage:images.some(row=>row.approved===true),
    existingImageCount:images.length,
    approvedRobloxGameplayVideoCount:videos.filter(row=>row.approved===true).length,
    videoStatus:videos.some(row=>row.approved===true)
      ?'ROBLOX_NATIVE_PLAYBACK_PROOF_STILL_REQUIRED'
      :'NATIVE_ROBLOX_GAMEPLAY_VIDEO_NOT_PUBLISHED',
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
      &&['SUBMITTED_AWAITING_ROBLOX_MODERATION','AWAITING_APPROVAL_NO_DUPLICATE_UPLOAD'].includes(previous.imageStatus);
    const media=await syncRobloxExperienceDetailMedia({
      universeId:target.universeId,pngPath,cookie:robloxCookie,
      skipDuplicateUpload:samePreviousUpload,fetchImpl
    });
    const evidence={
      version:1,gameId:target.gameId,placeId:target.placeId,
      sourcePath:target.source,sourceSha256:validated.sha256,
      renderedPngSha256:rendered.sha256,...media
    };
    if(clean(outputPath))writeJson(path.resolve(root,outputPath),evidence);
    console.log('ROBLOX_DETAIL_IMAGE_STATE='+media.imageStatus);
    console.log('ROBLOX_DETAIL_MEDIA_VIDEO_STATE='+media.videoStatus);
    console.log('ROBLOX_DETAIL_MEDIA_VERIFIED='+String(media.verifiedDetailImage));
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
