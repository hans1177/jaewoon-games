import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const RECORD_ROOT=path.join(ROOT,'company-records','runtime-media');
const OUT_PATH=path.join(ROOT,'runtime-media-index.json');
const clean=v=>String(v??'').trim();
const sha256=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const posix=p=>p.replaceAll('\\','/');
const isPass=v=>['PASS','PASSED','VERIFIED','RUNTIME_PASS','QA_PASS'].includes(clean(v).toUpperCase())||v===true;

function walk(dir,out=[]){
  if(!fs.existsSync(dir))return out;
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const full=path.join(dir,entry.name);
    if(entry.isDirectory())walk(full,out);
    else if(entry.isFile()&&entry.name.endsWith('.json'))out.push(full);
  }
  return out;
}
function readRecord(file){
  try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return null;}
}
function validRepresentative(file,row,root=ROOT){
  if(!row||clean(row.domain)!=='runtime-media'||clean(row.status).toUpperCase()!=='VERIFIED')return false;
  if(clean(row.retentionClass).toUpperCase()!=='RUNTIME_MEDIA')return false;
  if(row.data?.homepageRepresentative!==true)return false;
  if(!isPass(row.data?.runtimeVerification))return false;
  const media=clean(row.data?.mediaPath);
  if(!/^assets\/runtime-evidence\/(?:roblox|unity|fortnite-uefn|web)\//.test(media))return false;
  const abs=path.join(root,media);
  if(!fs.existsSync(abs)||!fs.statSync(abs).isFile())return false;
  const expected=clean(row.data?.sha256).toLowerCase();
  return /^[0-9a-f]{64}$/.test(expected)&&sha256(abs)===expected;
}
function recordTime(row){
  const raw=row?.data?.captureAt||row?.timestamps?.observedAt||row?.timestamps?.createdAt||'';
  const ms=Date.parse(raw);
  return Number.isFinite(ms)?ms:0;
}
export function buildRuntimeMediaIndex({root=ROOT}={}){
  const recordRoot=path.join(root,'company-records','runtime-media');
  const rows=[];
  for(const file of walk(recordRoot,[])){
    const row=readRecord(file);
    if(!validRepresentative(file,row,root))continue;
    rows.push({
      gameId:clean(row.data.gameId),
      platform:clean(row.data.platform).toUpperCase(),
      mediaPath:'/'+clean(row.data.mediaPath).replace(/^\/+/, ''),
      captureAt:clean(row.data.captureAt),
      sourceRevision:clean(row.data.sourceRevision),
      artifactIdentity:clean(row.data.artifactIdentity),
      sha256:clean(row.data.sha256).toLowerCase(),
      runtimeVerification:clean(row.data.runtimeVerification),
      recordPath:posix(path.relative(root,file)),
      recordId:clean(row.recordId),
      observedAt:clean(row.timestamps?.observedAt)
    });
  }
  const latest=new Map();
  for(const row of rows){
    const key=row.gameId+'::'+row.platform;
    const prior=latest.get(key);
    const t=Date.parse(row.captureAt||row.observedAt)||0;
    const p=Date.parse(prior?.captureAt||prior?.observedAt)||0;
    if(!prior||t>p||(t===p&&row.recordId.localeCompare(prior.recordId)>0))latest.set(key,row);
  }
  const items=[...latest.values()].sort((a,b)=>a.gameId.localeCompare(b.gameId)||a.platform.localeCompare(b.platform));
  return {
    version:1,
    authority:'company-records/runtime-media VERIFIED homepageRepresentative manifests',
    generatedFrom:'company-records/runtime-media',
    items
  };
}
export function writeRuntimeMediaIndex({root=ROOT,check=false}={}){
  const next=JSON.stringify(buildRuntimeMediaIndex({root}),null,2)+'\n';
  const out=path.join(root,'runtime-media-index.json');
  if(check){
    const current=fs.existsSync(out)?fs.readFileSync(out,'utf8'):'';
    if(current!==next)throw new Error('RUNTIME_MEDIA_HOMEPAGE_INDEX_STALE');
    return out;
  }
  fs.writeFileSync(out,next);
  return out;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const check=process.argv.includes('--check');
  const out=writeRuntimeMediaIndex({check});
  console.log('RUNTIME_MEDIA_HOMEPAGE_INDEX='+(check?'CURRENT':'WRITTEN'));
  console.log('RUNTIME_MEDIA_HOMEPAGE_INDEX_PATH='+posix(path.relative(ROOT,out)));
}
