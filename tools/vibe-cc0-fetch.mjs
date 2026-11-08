#!/usr/bin/env node
// 파일명: tools/vibe-cc0-fetch.mjs
// 자산 부족 시 CC0 자동 확보. 오너 규칙(레지스트리 externalSources의 prefetchAllowed:false / speculativeDownloadAllowed:false /
// automaticAcquisitionWhenSelected:true)을 따른다: 미리 쌓지 않고, '부족한 분야'가 선택됐을 때만, 레지스트리에 CC0로 검증된 출처에서만 받는다.
// 받은 팩은 후보일 뿐 승인되지 않는다(vibe-cc0-library.mjs approve 는 사람이).
// 사용: node tools/vibe-cc0-fetch.mjs --dir <라이브러리> [--family PROP] [--max 2] [--execute]
//   (--execute 없으면 계획만 출력한다)
// 받는 방법: GitHub 저장소 → git clone --depth 1 / downloadUrl(https) → zip / 그 외(itch.io·kenney.nl 등 링크 불안정) → MANUAL: zip을 _inbox 에 넣고 ingest
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {libraryDir,scanLibrary,checkLicense,approvedLibraryParents,extractZipSafe,hasOtherTerms} from './vibe-cc0-library.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const isCc0=l=>/^CC0(?:-1\.0)?$/i.test(String(l||''));

// 분야별 현재 보유 수: 레지스트리의 CC0 에셋(실제 소스 파일 있는 것) + 오너가 승인한 라이브러리 모델
export function countByFamily(registry,repoRoot,libDir){
  const n={};
  for(const a of registry.assets||[]){
    if(!isCc0(a.license)||a.securityBlocked||a.quarantined||a.gameUseForbidden)continue;
    const has=(a.sourceFiles||[]).some(f=>fs.existsSync(path.join(repoRoot,f)));
    if(!has)continue;
    const k=String(a.family||a.category||'?').toUpperCase();n[k]=(n[k]||0)+1;
  }
  for(const p of approvedLibraryParents(libDir||'')){const k=String(p.family).toUpperCase();n[k]=(n[k]||0)+1}
  return n;
}
export function shortages(counts,minPerFamily){
  return Object.entries(minPerFamily).map(([family,min])=>({family,min,have:counts[family]||0,missing:Math.max(0,min-(counts[family]||0))})).filter(x=>x.missing>0).sort((a,b)=>b.missing-a.missing);
}

// 후보 출처: CC0 검증됨 + 자동 확보 허용 + 미리받기 금지 규칙 준수 + 해당 분야 + 아직 라이브러리에 없음
export function candidateSources(registry,family,have=new Set()){
  return (registry.externalSources||[]).filter(s=>
    isCc0(s.license)&&s.automaticAcquisitionWhenSelected===true&&s.prefetchAllowed===false&&s.speculativeDownloadAllowed===false
    &&String(s.category||'').toUpperCase()===family.toUpperCase()&&/^https:\/\//.test(s.licenseEvidenceUrl||'')&&!have.has(s.id)&&!String(s.id).startsWith('acquired-'));
}
export function methodFor(src,{allowLocal=false}={}){
  const u=String(src.sourceUrl||'');
  if(/^https:\/\/github\.com\/[^/]+\/[^/]+\/?$/.test(u)||(allowLocal&&src.localGitPath))return 'git';
  if(/^https:\/\/.+\.zip(\?.*)?$/i.test(String(src.downloadUrl||''))||(allowLocal&&/^http:\/\/127\.0\.0\.1:\d+\/.+\.zip$/.test(String(src.downloadUrl||''))))return 'zip';
  return 'manual';
}

export async function acquire(src,libDir,{allowLocal=false,maxBytes=500*1024*1024}={}){
  const method=methodFor(src,{allowLocal}),dest=path.join(libDir,src.id);
  if(fs.existsSync(dest))return {id:src.id,status:'SKIPPED_EXISTS'};
  if(method==='manual')return {id:src.id,status:'MANUAL_DOWNLOAD_REQUIRED',hint:`${src.sourceUrl} 에서 zip을 받아 ${path.join(libDir,'_inbox')} 에 넣고: node tools/vibe-cc0-library.mjs ingest --source ${src.id}`};
  fs.mkdirSync(libDir,{recursive:true});
  if(method==='git'){
    const url=allowLocal&&src.localGitPath?src.localGitPath:src.sourceUrl;
    const r=spawnSync('git',['clone','--depth','1',url,dest],{encoding:'utf8',timeout:600000});
    if(r.status!==0){fs.rmSync(dest,{recursive:true,force:true});return {id:src.id,status:'DOWNLOAD_FAILED',error:String(r.stderr).slice(0,200)}}
    fs.rmSync(path.join(dest,'.git'),{recursive:true,force:true});
  }else{
    // 크기 상한을 두고 받고, 오너가 해시(downloadSha256)를 적어 뒀으면 반드시 일치해야 한다. 안전한 해제(zip-slip 방지).
    const tmpZip=path.join(libDir,`.dl-${src.id}.zip`);
    try{
      const res=await fetch(src.downloadUrl,{redirect:'follow'});
      if(!res.ok)return {id:src.id,status:'DOWNLOAD_FAILED',error:'HTTP '+res.status};
      const buf=Buffer.from(await res.arrayBuffer());
      if(buf.length>maxBytes)return {id:src.id,status:'DOWNLOAD_TOO_LARGE'};
      if(src.downloadSha256&&crypto.createHash('sha256').update(buf).digest('hex')!==String(src.downloadSha256).toLowerCase())return {id:src.id,status:'HASH_MISMATCH'};
      fs.writeFileSync(tmpZip,buf);
      fs.mkdirSync(dest,{recursive:true});
      const r=extractZipSafe(tmpZip,dest);
      if(r.status!==0){fs.rmSync(dest,{recursive:true,force:true});return {id:src.id,status:'EXTRACT_FAILED',error:String(r.stderr).slice(0,160)}}
    }catch(e){fs.rmSync(dest,{recursive:true,force:true});return {id:src.id,status:'DOWNLOAD_FAILED',error:String(e.message).slice(0,160)}}
    finally{fs.rmSync(tmpZip,{force:true})}
  }
  // 출처 기록(레지스트리의 CC0 검증 정보) — 이후 라이선스 증거 검사는 provenance.json 또는 팩 안의 라이선스 파일로 한다
  fs.writeFileSync(path.join(dest,'provenance.json'),JSON.stringify({license:'CC0',sourceId:src.id,sourceUrl:src.sourceUrl,licenseEvidenceUrl:src.licenseEvidenceUrl,family:String(src.category||'PROP').toUpperCase(),acquiredAt:new Date().toISOString(),acquiredBy:'vibe-cc0-fetch',approved:false},null,1));
  // 팩 안에 CC0와 다른 조건이 적힌 라이선스 파일이 있으면 거절(레지스트리 정보가 틀렸을 가능성)
  const textLic=fs.readdirSync(dest).filter(n=>/^licen[sc]e/i.test(n)).map(n=>fs.readFileSync(path.join(dest,n),'utf8').slice(0,20000));
  if(textLic.some(hasOtherTerms)){
    fs.rmSync(dest,{recursive:true,force:true});return {id:src.id,status:'REJECTED_LICENSE_MISMATCH'};
  }
  return {id:src.id,status:'ACQUIRED_NEEDS_OWNER_APPROVAL',pack:src.id,hint:`승인: node tools/vibe-cc0-library.mjs approve --pack ${src.id} --by <이름>`};
}

export function plan({registry,repoRoot,libDir,family=null,max=2,minPerFamily=JSON.parse(fs.readFileSync(path.join(here,'vibe-cc0-shortage.json'),'utf8')).minPerFamily,allowLocal=false}){
  const have=new Set(fs.existsSync(libDir)?fs.readdirSync(libDir):[]);
  const counts=countByFamily(registry,repoRoot,libDir);
  const short=shortages(counts,minPerFamily).filter(s=>!family||s.family===family.toUpperCase());
  const picks=[];
  for(const s of short){
    for(const src of candidateSources(registry,s.family,have).slice(0,max))picks.push({family:s.family,missing:s.missing,src,method:methodFor(src,{allowLocal})});
  }
  return {counts,short,picks};
}

if(import.meta.url===pathToFileURL(process.argv[1]||'').href){
  await (async()=>{
  const a=process.argv.slice(2),opt=n=>{const i=a.indexOf('--'+n);return i>=0?a[i+1]:null};
  try{
    const libDir=libraryDir(opt('dir')),repoRoot=process.cwd();
    const registry=JSON.parse(fs.readFileSync('company-asset-library.json','utf8'));
    const {short,picks}=plan({registry,repoRoot,libDir,family:opt('family'),max:+(opt('max')||2)});
    console.log('부족한 분야:',short.length?short.map(s=>`${s.family} ${s.have}/${s.min}`).join(', '):'없음');
    for(const p of picks)console.log(`  후보 ${p.family}: ${p.src.id} (${p.method}) ${p.src.sourceUrl}`);
    if(!a.includes('--execute')){console.log('VIBE_CC0_FETCH_PLAN_ONLY (--execute 를 주면 받는다)');process.exit(0)}
    for(const p of picks)console.log(JSON.stringify(await acquire(p.src,libDir)));
    scanLibrary(libDir);
    console.log('VIBE_CC0_FETCH_DONE (받은 팩은 후보일 뿐이다. 승인은 사람이: approve)');
  }catch(e){console.error(String(e.message||e));process.exit(1)}
  })();
}
