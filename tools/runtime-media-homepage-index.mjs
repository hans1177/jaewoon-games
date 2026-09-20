// 파일명: tools/runtime-media-homepage-index.mjs
// 역할: 검증된 실제 런타임 게임플레이 캡처만 홈페이지용 인덱스로 노출한다.
// 원칙: 생성/합성/아트북 이미지는 런타임 캡처를 대체하지 않는다. company-records runtime-media manifest가 유일한 근거다.

import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const clean=v=>String(v??'').trim();
const ROOT=process.cwd();
const RECORD_ROOT='company-records/runtime-media';
const OUTPUT_DEFAULT='runtime-media-homepage.json';
const allowedPlatforms=new Set(['ROBLOX','UNITY','FORTNITE_UEFN','WEB']);
const isPass=v=>/^(?:PASS|.*-PASSED)$/i.test(clean(v));
const toRepo=p=>path.relative(ROOT,p).replaceAll('\\','/');

function walk(dir,out=[]){
  if(!fs.existsSync(dir))return out;
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const full=path.join(dir,entry.name);
    if(entry.isDirectory())walk(full,out);
    else if(entry.isFile()&&entry.name.endsWith('.json'))out.push(full);
  }
  return out;
}

export function collectHomepageRuntimeMedia({root=ROOT}={}){
  const records=walk(path.join(root,RECORD_ROOT)),candidates=[];
  for(const file of records){
    let row;
    try{row=JSON.parse(fs.readFileSync(file,'utf8'));}catch{continue;}
    const platform=clean(row?.data?.platform||row?.scope?.platform).toUpperCase();
    const gameId=clean(row?.data?.gameId||row?.scope?.gameId);
    const mediaPath=clean(row?.data?.mediaPath);
    const captureAt=clean(row?.data?.captureAt||row?.timestamps?.observedAt);
    const tags=Array.isArray(row?.tags)?row.tags.map(x=>clean(x).toLowerCase()):[];
    if(clean(row?.domain)!=='runtime-media'||clean(row?.status).toUpperCase()!=='VERIFIED')continue;
    if(!gameId||!allowedPlatforms.has(platform)||!mediaPath||!captureAt)continue;
    if(!isPass(row?.data?.runtimeVerification))continue;
    if(!tags.includes('gameplay'))continue;
    const mediaAbs=path.join(root,mediaPath);
    if(!mediaPath.startsWith('assets/runtime-evidence/')||!fs.existsSync(mediaAbs)||!fs.statSync(mediaAbs).isFile())continue;
    candidates.push({
      gameId,platform,captureAt,
      mediaPath:'/'+mediaPath.replace(/^\/+/, ''),
      sourceRevision:clean(row?.data?.sourceRevision||row?.provenance?.sourceRevision)||null,
      artifactIdentity:clean(row?.data?.artifactIdentity||row?.provenance?.artifactIdentity)||null,
      sha256:clean(row?.data?.sha256)||null,
      runtimeVerification:clean(row?.data?.runtimeVerification),
      recordPath:toRepo(file),
      authority:'VERIFIED_RUNTIME_MEDIA_MANIFEST'
    });
  }
  candidates.sort((a,b)=>Date.parse(b.captureAt)-Date.parse(a.captureAt)||a.gameId.localeCompare(b.gameId)||a.platform.localeCompare(b.platform));
  const latest=new Map();
  for(const row of candidates){
    const key=`${row.gameId}::${row.platform}`;
    if(!latest.has(key))latest.set(key,row);
  }
  return [...latest.values()].sort((a,b)=>a.gameId.localeCompare(b.gameId)||a.platform.localeCompare(b.platform));
}

export function buildHomepageRuntimeMediaIndex(opts={}){
  return{
    version:1,
    authority:'VERIFIED_RUNTIME_MEDIA_MANIFESTS_ONLY',
    generatedAt:new Date().toISOString(),
    generatedFrom:RECORD_ROOT,
    syntheticOrConceptArtForbidden:true,
    items:collectHomepageRuntimeMedia(opts)
  };
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const arg=process.argv.find(x=>x.startsWith('--output='));
  const output=arg?arg.slice('--output='.length):OUTPUT_DEFAULT;
  const index=buildHomepageRuntimeMediaIndex();
  fs.writeFileSync(output,JSON.stringify(index,null,2)+'\n');
  console.log(`HOMEPAGE_RUNTIME_MEDIA_INDEX=PASS COUNT=${index.items.length} OUTPUT=${output}`);
}
