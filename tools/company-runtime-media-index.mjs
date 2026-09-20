import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const clean=v=>String(v??'').trim();
const iso=v=>{const t=Date.parse(v);return Number.isFinite(t)?t:0;};
const rel=(root,file)=>path.relative(root,file).replaceAll('\\','/');

function walkJson(dir,out=[]){
  if(!fs.existsSync(dir))return out;
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const p=path.join(dir,entry.name);
    if(entry.isDirectory())walkJson(p,out);
    else if(entry.isFile()&&entry.name.endsWith('.json'))out.push(p);
  }
  return out;
}

export function buildRuntimeMediaIndex({root=ROOT}={}){
  const recordsRoot=path.join(root,'company-records/runtime-media');
  const rows=[];
  for(const file of walkJson(recordsRoot)){
    let row;try{row=JSON.parse(fs.readFileSync(file,'utf8'));}catch{continue;}
    if(clean(row.domain)!=='runtime-media'||clean(row.status).toUpperCase()!=='VERIFIED')continue;
    const data=row.data||{},scope=row.scope||{},gameId=clean(data.gameId||scope.gameId),platform=clean(data.platform||scope.platform).toUpperCase();
    const mediaPath=clean(data.mediaPath),captureAt=clean(data.captureAt||row.timestamps?.observedAt||row.timestamps?.createdAt);
    if(!gameId||!platform||!mediaPath||!fs.existsSync(path.join(root,mediaPath)))continue;
    if(clean(data.runtimeVerification).toUpperCase()!=='PASS')continue;
    rows.push({
      gameId,platform,captureAt,
      sourceRevision:clean(data.sourceRevision||row.provenance?.sourceRevision),
      artifactIdentity:clean(data.artifactIdentity||row.provenance?.artifactIdentity),
      mediaPath,manifestPath:rel(root,file),
      verified:true,
      homepageRepresentative:data.homepageRepresentative!==false,
      runtimeVerification:'PASS',
      captureKind:clean(data.captureKind)||'GAMEPLAY_RUNTIME_SCREENSHOT'
    });
  }
  const latest=new Map();
  for(const row of rows){
    const key=`${row.gameId}::${row.platform}`,old=latest.get(key);
    if(!old||iso(row.captureAt)>=iso(old.captureAt))latest.set(key,row);
  }
  const entries=[...latest.values()].sort((a,b)=>a.gameId.localeCompare(b.gameId)||a.platform.localeCompare(b.platform));
  const generatedAt=entries.reduce((max,row)=>iso(row.captureAt)>iso(max)?row.captureAt:max,null);
  return{version:1,authority:'VERIFIED_RUNTIME_MEDIA_RECORDS',generatedAt,sourceRecordCount:rows.length,entries};
}

export function renderRuntimeMediaIndex(options={}){
  return JSON.stringify(buildRuntimeMediaIndex(options),null,2)+'\n';
}
export function writeRuntimeMediaIndex({root=ROOT,output='assets/runtime-evidence/index.json'}={}){
  const file=path.join(root,output);fs.mkdirSync(path.dirname(file),{recursive:true});
  const text=renderRuntimeMediaIndex({root});fs.writeFileSync(file,text);return{file,text};
}
export function checkRuntimeMediaIndex({root=ROOT,output='assets/runtime-evidence/index.json'}={}){
  const file=path.join(root,output),expected=renderRuntimeMediaIndex({root});
  if(!fs.existsSync(file))return{pass:false,reason:'INDEX_MISSING',expected};
  const actual=fs.readFileSync(file,'utf8');
  return{pass:actual===expected,reason:actual===expected?'PASS':'INDEX_STALE',expected,actual};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const check=process.argv.includes('--check');
  if(check){
    const result=checkRuntimeMediaIndex();
    if(!result.pass){console.error(`RUNTIME_MEDIA_INDEX=${result.reason}`);process.exit(1);}
    console.log('RUNTIME_MEDIA_INDEX=PASS');
  }else{
    const result=writeRuntimeMediaIndex();
    console.log(`RUNTIME_MEDIA_INDEX_WRITTEN=${path.relative(ROOT,result.file).replaceAll('\\','/')}`);
  }
}
