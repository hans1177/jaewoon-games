// 파일명: tools/company-runtime-media-register.mjs
// 역할: 실제 플랫폼 런타임에서 캡처된 검증 미디어를 canonical runtime-media 경로/manifest로 등록한다.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

const arg=(name,fallback='')=>{
  const prefix=`--${name}=`;
  const raw=process.argv.find(value=>value.startsWith(prefix));
  return raw?raw.slice(prefix.length):fallback;
};
const clean=value=>String(value??'').trim();
const slug=value=>clean(value).toLowerCase().replace(/[^a-z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,96);
const sha256Buffer=buffer=>crypto.createHash('sha256').update(buffer).digest('hex');
const normalizePlatform=value=>{
  const raw=clean(value).toUpperCase().replace(/[\s-]+/g,'_');
  if(raw==='ROBLOX')return'ROBLOX';
  if(['UNITY','UNITY_ANDROID','ANDROID_MOBILE'].includes(raw))return'UNITY';
  if(['FORTNITE','FORTNITE_UEFN','UEFN'].includes(raw))return'FORTNITE_UEFN';
  return'';
};
const mimeFor=file=>{
  const ext=path.extname(file).toLowerCase();
  if(ext==='.png')return'image/png';
  if(ext==='.jpg'||ext==='.jpeg')return'image/jpeg';
  if(ext==='.webp')return'image/webp';
  if(ext==='.webm')return'video/webm';
  if(ext==='.mp4')return'video/mp4';
  return'';
};
const kindFor=mime=>mime.startsWith('image/')?'IMAGE':mime.startsWith('video/')?'VIDEO':'';

export function registerRuntimeMedia({
  repoRoot='.',
  gameId,
  platform,
  image='',
  video='',
  captureAt=new Date().toISOString(),
  sourceRevision,
  artifactIdentity,
  runtimeVerification,
  producer='tools/company-runtime-media-register.mjs'
}={}){
  const id=slug(gameId),targetPlatform=normalizePlatform(platform);
  if(!id||id!==clean(gameId))throw new Error('RUNTIME_MEDIA_GAME_ID_INVALID');
  if(!targetPlatform)throw new Error('RUNTIME_MEDIA_PLATFORM_INVALID');
  if(!clean(sourceRevision)||!clean(artifactIdentity)||!clean(runtimeVerification))throw new Error('RUNTIME_MEDIA_BINDING_REQUIRED');
  const captured=new Date(captureAt);
  if(Number.isNaN(captured.getTime()))throw new Error('RUNTIME_MEDIA_CAPTURE_AT_INVALID');
  const imagePath=clean(image),videoPath=clean(video);
  if(!imagePath)throw new Error('RUNTIME_MEDIA_REPRESENTATIVE_IMAGE_REQUIRED');
  if(!fs.existsSync(imagePath)||!fs.statSync(imagePath).isFile())throw new Error('RUNTIME_MEDIA_IMAGE_MISSING');
  if(videoPath&&(!fs.existsSync(videoPath)||!fs.statSync(videoPath).isFile()))throw new Error('RUNTIME_MEDIA_VIDEO_MISSING');
  const date=captured.toISOString().slice(0,10),year=date.slice(0,4),platformSlug=targetPlatform.toLowerCase().replaceAll('_','-');
  const artifactKey=sha256Buffer(Buffer.from(`${targetPlatform}|${artifactIdentity}|${sourceRevision}`)).slice(0,16);
  const assetDir=path.join(repoRoot,'assets','runtime-evidence',platformSlug,id,date,artifactKey);
  fs.mkdirSync(assetDir,{recursive:true});
  const media=[];
  const copy=(input,label)=>{
    const mime=mimeFor(input),kind=kindFor(mime);
    if(!mime||!kind)throw new Error(`RUNTIME_MEDIA_FORMAT_UNSUPPORTED:${input}`);
    const ext=path.extname(input).toLowerCase();
    const destination=path.join(assetDir,`${label}${ext}`);
    fs.copyFileSync(input,destination);
    const bytes=fs.readFileSync(destination),sha256=sha256Buffer(bytes);
    const repoRelative=path.relative(repoRoot,destination).replace(/\\/g,'/');
    const row={kind,path:repoRelative,mime,sha256,captureAt:captured.toISOString(),sourceRevision:clean(sourceRevision),artifactIdentity:clean(artifactIdentity),runtimeVerification:clean(runtimeVerification),representative:true};
    media.push(row);
    return row;
  };
  const representative=copy(imagePath,'runtime-screen');
  const preview=videoPath?copy(videoPath,'runtime-preview'):null;
  const recordSeed=`${id}|${targetPlatform}|${sourceRevision}|${artifactIdentity}`,recordId=`runtime-${sha256Buffer(Buffer.from(recordSeed)).slice(0,16)}`;
  const manifestDir=path.join(repoRoot,'company-records','runtime-media',year,date,id);
  fs.mkdirSync(manifestDir,{recursive:true});
  const manifestPath=path.join(manifestDir,`${platformSlug}-runtime-media--${recordId}.json`);
  const record={
    schemaVersion:1,
    recordId,
    recordType:'runtime-media',
    domain:'runtime-media',
    scope:{type:'GAME_PLATFORM',id:`${id}|${targetPlatform}`,gameId:id,platform:targetPlatform},
    timestamps:{createdAt:captured.toISOString(),observedAt:captured.toISOString()},
    provenance:{producer,authority:'VERIFIED_RUNTIME_QA',sourceRevision:clean(sourceRevision),artifactIdentity:clean(artifactIdentity),sourceRefs:[clean(runtimeVerification)]},
    status:'VERIFIED',
    retentionClass:'RUNTIME_MEDIA',
    data:{actualRuntime:true,media},
    evidenceRefs:[clean(runtimeVerification)],
    relatedFiles:media.map(row=>row.path),
    supersedes:[],
    tags:['runtime-media','homepage',platformSlug]
  };
  fs.writeFileSync(manifestPath,JSON.stringify(record,null,2)+'\n');
  return {manifestPath:path.relative(repoRoot,manifestPath).replace(/\\/g,'/'),representative,preview,record};
}

function main(){
  const result=registerRuntimeMedia({
    repoRoot:arg('repo-root','.'),
    gameId:arg('game-id'),
    platform:arg('platform'),
    image:arg('image'),
    video:arg('video'),
    captureAt:arg('capture-at',new Date().toISOString()),
    sourceRevision:arg('source-revision'),
    artifactIdentity:arg('artifact-identity'),
    runtimeVerification:arg('runtime-verification'),
    producer:arg('producer','tools/company-runtime-media-register.mjs')
  });
  console.log(`RUNTIME_MEDIA_MANIFEST=${result.manifestPath}`);
  console.log(`RUNTIME_MEDIA_SCREEN=${result.representative.path}`);
  console.log(`RUNTIME_MEDIA_PREVIEW=${result.preview?.path||'NONE'}`);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){try{main();}catch(error){console.error(error.stack||error.message);process.exitCode=1;}}
