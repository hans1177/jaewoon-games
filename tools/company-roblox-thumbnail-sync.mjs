import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';

const clean=v=>String(v??'').trim();
const validId=v=>/^[1-9][0-9]*$/.test(clean(v));
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const json=async response=>{
  const text=await response.text();
  let value={};
  try{value=text?JSON.parse(text):{};}catch{value={raw:text};}
  if(!response.ok)throw new Error('ROBLOX_THUMBNAIL_HTTP_'+response.status+':'+String(text).slice(0,600));
  return value;
};
const idsFrom=value=>{
  const found=new Set();
  const visit=node=>{
    if(Array.isArray(node)){for(const row of node)visit(row);return;}
    if(!node||typeof node!=='object')return;
    for(const [key,val] of Object.entries(node)){
      if(/homepageThumbnailId/i.test(key)&&validId(val))found.add(clean(val));
      else visit(val);
    }
  };
  visit(value);
  return found;
};

export function inspectMarketingPng(file,{repoRoot=process.cwd(),maxBytes=3*1024*1024}={}){
  const root=fs.realpathSync(repoRoot);
  const absolute=fs.realpathSync(path.resolve(root,clean(file)));
  const rel=path.relative(root,absolute).replaceAll('\\\\','/');
  if(!rel||rel.startsWith('../')||path.isAbsolute(rel))throw new Error('ROBLOX_THUMBNAIL_PATH_OUTSIDE_REPOSITORY');
  const stat=fs.statSync(absolute);
  if(!stat.isFile())throw new Error('ROBLOX_THUMBNAIL_NOT_FILE');
  if(stat.size<=0||stat.size>maxBytes)throw new Error('ROBLOX_THUMBNAIL_SIZE_INVALID:'+stat.size);
  const data=fs.readFileSync(absolute);
  if(data.length<24||data.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw new Error('ROBLOX_THUMBNAIL_PNG_REQUIRED');
  const width=data.readUInt32BE(16),height=data.readUInt32BE(20);
  if(width!==1920||height!==1080)throw new Error('ROBLOX_THUMBNAIL_DIMENSION_INVALID:'+width+'x'+height);
  return Object.freeze({
    absolute,
    relative:rel,
    bytes:stat.size,
    width,
    height,
    sha256:crypto.createHash('sha256').update(data).digest('hex'),
    data
  });
}

export function resolveCanonicalRuntimeTarget(item={}){
  const rows=[
    item.robloxPublicationTarget,
    item.robloxRuntimeCandidateEvidence,
    item.robloxInternalReleaseEvidence,
    item.robloxReleaseEvidence
  ].filter(Boolean);
  const target=rows.find(row=>validId(row?.universeId)&&validId(row?.placeId));
  if(!target)throw new Error('ROBLOX_THUMBNAIL_CANONICAL_TARGET_MISSING:'+clean(item.gameId));
  return Object.freeze({universeId:clean(target.universeId),placeId:clean(target.placeId)});
}

export async function uploadRobloxHomepageThumbnail({
  universeId,
  imageFile,
  apiKey,
  repoRoot=process.cwd(),
  fetchImpl=globalThis.fetch,
  waitImpl=sleep,
  pollAttempts=30,
  pollDelayMs=1000
}={}){
  if(!validId(universeId))throw new Error('ROBLOX_THUMBNAIL_UNIVERSE_INVALID');
  if(!clean(apiKey))throw new Error('ROBLOX_THUMBNAIL_API_KEY_MISSING');
  const image=inspectMarketingPng(imageFile,{repoRoot});
  const base='https://apis.roblox.com/thumbnail-personalization-api/v1/universes/'+clean(universeId);
  const headers={'x-api-key':clean(apiKey)};
  const form=new FormData();
  form.append('files',new Blob([image.data],{type:'image/png'}),path.basename(image.relative));
  const upload=await json(await fetchImpl(base+'/thumbnails/uploads',{method:'POST',headers,body:form}));
  const operationId=clean(upload?.fileToOperationIdDict?.[path.basename(image.relative)])
    ||clean(Object.values(upload?.fileToOperationIdDict||{})[0]);
  if(!operationId)throw new Error('ROBLOX_THUMBNAIL_OPERATION_MISSING');
  console.log('ROBLOX_THUMBNAIL_UPLOAD=ACCEPTED:'+clean(universeId));
  console.log('ROBLOX_THUMBNAIL_OPERATION='+operationId);

  let thumbnailId='';
  for(let attempt=1;attempt<=Math.max(1,Number(pollAttempts)||1);attempt+=1){
    const status=await json(await fetchImpl(base+'/thumbnails/uploads/status?operationIds='+encodeURIComponent(operationId),{headers}));
    if(clean(status?.uploadStatus).toLowerCase()==='finished'){
      const rows=Object.values(status?.uploadThumbnailStatusDict||{});
      thumbnailId=clean(rows.find(row=>validId(row?.homepageThumbnailId))?.homepageThumbnailId);
      if(!thumbnailId)throw new Error('ROBLOX_THUMBNAIL_ID_MISSING_AFTER_FINISH');
      break;
    }
    if(/failed|error|cancel/i.test(clean(status?.uploadStatus)))throw new Error('ROBLOX_THUMBNAIL_PROCESSING_FAILED:'+clean(status?.uploadStatus));
    if(attempt<Number(pollAttempts))await waitImpl(pollDelayMs);
  }
  if(!thumbnailId)throw new Error('ROBLOX_THUMBNAIL_PROCESSING_TIMEOUT');

  const active=await json(await fetchImpl(base+'/personalization?status=Active',{headers}));
  const configs=Array.isArray(active?.personalizedConfigs)?active.personalizedConfigs
    :Array.isArray(active?.personalizations)?active.personalizations
    :Array.isArray(active?.data)?active.data:[];
  const activeConfig=configs[0]||null;
  const endpoint=activeConfig?.id?'/personalization/update':'/personalization/create';
  const body=activeConfig?.id
    ?{homepageThumbnailIds:[Number(thumbnailId)],id:activeConfig.id}
    :{homepageThumbnailIds:[Number(thumbnailId)]};
  await json(await fetchImpl(base+endpoint,{
    method:'POST',
    headers:{...headers,'content-type':'application/json'},
    body:JSON.stringify(body)
  }));

  const [thumbnailReadback,activeReadback]=await Promise.all([
    json(await fetchImpl(base+'/thumbnails',{headers})),
    json(await fetchImpl(base+'/personalization?status=Active',{headers}))
  ]);
  const thumbnailIds=idsFrom(thumbnailReadback);
  const activeIds=idsFrom(activeReadback);
  if(!thumbnailIds.has(thumbnailId)||!activeIds.has(thumbnailId)){
    throw new Error('ROBLOX_THUMBNAIL_READBACK_MISMATCH:'+thumbnailId);
  }
  console.log('ROBLOX_THUMBNAIL_VERIFY=PASS:'+clean(universeId)+':'+thumbnailId);
  return Object.freeze({
    universeId:clean(universeId),
    homepageThumbnailId:thumbnailId,
    operationId,
    marketingImage:image.relative,
    marketingImageSha256:image.sha256,
    updatedExistingConfig:Boolean(activeConfig?.id),
    verified:true
  });
}

export async function syncCanonicalRobloxThumbnails({
  catalog,
  runtimeQueue,
  roadmap,
  repoRoot=process.cwd(),
  apiKey,
  fetchImpl=globalThis.fetch,
  waitImpl=sleep,
  pollAttempts=30,
  pollDelayMs=1000
}={}){
  const targetIds=roadmap?.robloxMarketingThumbnailSyncContract?.currentInternalReleaseTargets||[];
  if(!Array.isArray(targetIds)||!targetIds.length)throw new Error('ROBLOX_THUMBNAIL_TARGETS_MISSING');
  const results=[];
  for(const gameId of targetIds){
    const game=(catalog?.games||[]).find(row=>clean(row.id)===clean(gameId));
    const item=(runtimeQueue?.items||[]).find(row=>clean(row.gameId)===clean(gameId));
    if(!game||!item)throw new Error('ROBLOX_THUMBNAIL_GAME_OR_RUNTIME_MISSING:'+gameId);
    const imageFile=clean(game.marketingImage);
    if(!imageFile)throw new Error('ROBLOX_MARKETING_IMAGE_MISSING:'+gameId);
    if(clean(game?.canonical?.identity?.image)!==imageFile||clean(game.image)!==imageFile){
      throw new Error('HOMEPAGE_MARKETING_IMAGE_SYNC_MISMATCH:'+gameId);
    }
    const target=resolveCanonicalRuntimeTarget(item);
    const inspected=inspectMarketingPng(imageFile,{repoRoot});
    console.log('ROBLOX_MARKETING_IMAGE='+gameId+':'+imageFile+':sha256='+inspected.sha256);
    console.log('HOMEPAGE_MARKETING_IMAGE_SYNC='+gameId+':PASS');
    const result=await uploadRobloxHomepageThumbnail({
      universeId:target.universeId,imageFile,apiKey,repoRoot,fetchImpl,waitImpl,pollAttempts,pollDelayMs
    });
    results.push(Object.freeze({gameId,placeId:target.placeId,...result}));
  }
  return Object.freeze(results);
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
  const catalog=JSON.parse(fs.readFileSync(clean(a.catalog)||'game-catalog.json','utf8'));
  const runtimeQueue=JSON.parse(fs.readFileSync(clean(a.runtime)||'../runtime/development-queue.json','utf8'));
  const roadmap=JSON.parse(fs.readFileSync(clean(a.roadmap)||'company-learning/platform-release-roadmap.json','utf8'));
  const results=await syncCanonicalRobloxThumbnails({
    catalog,runtimeQueue,roadmap,
    repoRoot:clean(a['repo-root'])||process.cwd(),
    apiKey:process.env.ROBLOX_OPEN_CLOUD_API_KEY
  });
  console.log('ROBLOX_THUMBNAIL_SYNC=PASS:count='+results.length);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  main().catch(error=>{console.error(error?.stack||error);process.exit(1);});
}
