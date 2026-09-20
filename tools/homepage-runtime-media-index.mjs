import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {validateCompanyRecord} from './company-records-governance.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const clean=v=>String(v??'').trim();
const rel=p=>path.relative(ROOT,p).replaceAll('\\','/');
const readJson=file=>JSON.parse(fs.readFileSync(file,'utf8'));

function walk(dir,out=[]){
  if(!fs.existsSync(dir))return out;
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const p=path.join(dir,entry.name);
    if(entry.isDirectory())walk(p,out);
    else if(entry.isFile()&&entry.name.endsWith('.json'))out.push(p);
  }
  return out;
}

export function buildHomepageRuntimeMediaIndex({root=ROOT}={}){
  const manifests=walk(path.join(root,'company-records','runtime-media'));
  const entries=[];
  for(const abs of manifests){
    const recordPath=path.relative(root,abs).replaceAll('\\','/');
    if(root===ROOT){
      const validation=validateCompanyRecord(recordPath);
      if(validation.errors.length)continue;
    }
    let row;
    try{row=readJson(abs);}catch{continue;}
    if(clean(row.status).toUpperCase()!=='VERIFIED')continue;
    const data=row.data||{},mediaPath=clean(data.mediaPath);
    if(!mediaPath||!fs.existsSync(path.join(root,mediaPath)))continue;
    if(clean(data.runtimeVerification).toUpperCase()!=='PASS'&&!/passed$/i.test(clean(data.runtimeVerification)))continue;
    entries.push({
      recordId:clean(row.recordId),
      recordPath,
      gameId:clean(data.gameId||row.scope?.gameId),
      platform:clean(data.platform||row.scope?.platform).toUpperCase(),
      captureAt:clean(data.captureAt||row.timestamps?.observedAt),
      sourceRevision:clean(data.sourceRevision||row.provenance?.sourceRevision),
      artifactIdentity:clean(data.artifactIdentity||row.provenance?.artifactIdentity),
      sha256:clean(data.sha256),
      runtimeVerification:clean(data.runtimeVerification),
      mediaPath,
      homepageRepresentative:data.homepageRepresentative!==false,
      captureKind:clean(data.captureKind||'GAMEPLAY'),
      producer:clean(row.provenance?.producer),
      authority:clean(row.provenance?.authority)
    });
  }
  entries.sort((a,b)=>Date.parse(b.captureAt||0)-Date.parse(a.captureAt||0)||a.gameId.localeCompare(b.gameId)||a.platform.localeCompare(b.platform));
  return{
    version:1,
    authority:'VERIFIED_RUNTIME_MEDIA_MANIFESTS',
    generatedAt:new Date().toISOString(),
    actualRuntimeOnly:true,
    generatedMarketingMockForbidden:true,
    entries
  };
}

function main(){
  const args=Object.fromEntries(process.argv.slice(2).filter(x=>x.startsWith('--')&&x.includes('=')).map(x=>{const [k,...v]=x.slice(2).split('=');return[k,v.join('=')]}));
  const out=path.resolve(ROOT,args.output||'assets/runtime-evidence/index.json');
  const index=buildHomepageRuntimeMediaIndex();
  fs.mkdirSync(path.dirname(out),{recursive:true});
  fs.writeFileSync(out,JSON.stringify(index,null,2)+'\n');
  console.log(`HOMEPAGE_RUNTIME_MEDIA_INDEX_ENTRIES=${index.entries.length}`);
  console.log(`HOMEPAGE_RUNTIME_MEDIA_INDEX=${rel(out)}`);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main();
