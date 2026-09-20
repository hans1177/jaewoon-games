import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateCompanyRecord} from './company-records-governance.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const clean=value=>String(value??'').trim();
const nativePlatform=value=>['UNITY','ROBLOX','FORTNITE_UEFN'].includes(clean(value).toUpperCase());
const imagePath=value=>/\.(?:png|jpe?g|webp)$/i.test(clean(value));
const runtimePass=value=>/^(?:PASS|PASSED|VERIFIED|RUNTIME_PASS)$/i.test(clean(value));

function walk(dir,out=[]){
  if(!fs.existsSync(dir))return out;
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const full=path.join(dir,entry.name);
    if(entry.isDirectory())walk(full,out);
    else if(entry.isFile()&&entry.name.endsWith('.json'))out.push(full);
  }
  return out;
}
const rel=file=>path.relative(ROOT,file).replaceAll('\\','/');

export function selectLatestVerifiedGameplayMedia(rows=[]){
  const latest=new Map();
  for(const input of rows){
    const row=input?.record||input;
    const recordPath=clean(input?.recordPath||row?.recordPath);
    const data=row?.data||{};
    const platform=clean(data.platform||row?.scope?.platform).toUpperCase();
    const mediaPath=clean(data.mediaPath);
    const captureAt=clean(data.captureAt||row?.timestamps?.observedAt);
    const tags=(Array.isArray(row?.tags)?row.tags:[]).map(x=>clean(x).toLowerCase());
    if(clean(row?.domain)!=='runtime-media'||clean(row?.status).toUpperCase()!=='VERIFIED')continue;
    if(!nativePlatform(platform))continue;
    if(!clean(data.gameId)||!runtimePass(data.runtimeVerification)||!imagePath(mediaPath))continue;
    if(!tags.includes('gameplay')&&!tags.includes('runtime-gameplay'))continue;
    if(!/^[0-9a-f]{64}$/i.test(clean(data.sha256)))continue;
    if(!clean(data.sourceRevision)||!clean(data.artifactIdentity)||!captureAt)continue;
    const key=`${clean(data.gameId)}::${platform}`,time=Date.parse(captureAt)||0;
    const item={
      gameId:clean(data.gameId),
      platform,
      captureAt,
      sourceRevision:clean(data.sourceRevision),
      artifactIdentity:clean(data.artifactIdentity),
      sha256:clean(data.sha256).toLowerCase(),
      runtimeVerification:clean(data.runtimeVerification),
      mediaPath:mediaPath.startsWith('/')?mediaPath:`/${mediaPath}`,
      recordId:clean(row.recordId),
      recordPath
    };
    const old=latest.get(key),oldTime=Date.parse(old?.captureAt||'')||0;
    if(!old||time>oldTime||(time===oldTime&&item.recordId.localeCompare(old.recordId)>0))latest.set(key,item);
  }
  const items=[...latest.values()].sort((a,b)=>a.gameId.localeCompare(b.gameId)||a.platform.localeCompare(b.platform));
  const generatedAt=items.map(x=>x.captureAt).filter(Boolean).sort().at(-1)||null;
  return{version:1,authority:'company-records/runtime-media',generatedAt,items};
}

export function buildHomepageRuntimeMediaIndex(){
  const root=path.join(ROOT,'company-records/runtime-media');
  const rows=[];
  for(const file of walk(root)){
    const recordPath=rel(file);
    const validation=validateCompanyRecord(recordPath);
    if(validation.errors.length)continue;
    try{rows.push({recordPath,record:JSON.parse(fs.readFileSync(file,'utf8'))});}catch{}
  }
  return selectLatestVerifiedGameplayMedia(rows);
}

export function writeHomepageRuntimeMediaIndex(output='homepage-runtime-media.json'){
  const index=buildHomepageRuntimeMediaIndex();
  fs.writeFileSync(path.join(ROOT,output),JSON.stringify(index,null,2)+'\n');
  return index;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const index=writeHomepageRuntimeMediaIndex();
  console.log(`HOMEPAGE_RUNTIME_MEDIA=PASS ITEMS=${index.items.length} NATIVE_ONLY=YES`);
}
