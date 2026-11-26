#!/usr/bin/env node
// 파일명: tools/vibe-cc0-fetch.mjs
// 자산 부족 시 CC0 자동 확보. 오너 규칙(레지스트리 externalSources의 prefetchAllowed:false / speculativeDownloadAllowed:false /
// automaticAcquisitionWhenSelected:true)을 따른다: 미리 쌓지 않고, '부족한 분야'가 선택됐을 때만, 레지스트리에 CC0로 검증된 출처에서만 받는다.
// 받은 팩은 후보일 뿐 승인되지 않는다(vibe-cc0-library.mjs approve 는 사람이).
// 사용: node tools/vibe-cc0-fetch.mjs --dir <라이브러리> [--family PROP] [--max 2] [--execute]
//   --source <등록 출처 ID>: 명시적으로 선택한 부족 원본만 확보한다. --execute 없으면 계획만 출력한다.
// 받는 방법: GitHub 저장소 → git clone --depth 1 / downloadUrl(https) → zip / 그 외(itch.io·kenney.nl 등 링크 불안정) → MANUAL: zip을 _inbox 에 넣고 ingest
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {libraryDir,scanLibrary,checkLicense,approvedLibraryParents,extractZipSafe,hasOtherTerms} from './vibe-cc0-library.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const isCc0=l=>/^CC0(?:-1\.0)?$/i.test(String(l||''));
const acquisitionFamilies=new Set(['CHARACTER','CREATURE','PROP','BUILDING','ENVIRONMENT','UI','MATERIAL','MOTION','AUDIO','VFX','WEAPON','SKILL','RIG','ANIMATION']);
const artworkCategory=/^(?:ART|ARTWORK|ORIGINAL_ART|CONCEPT_ART|CARD_ART|CARD_ARTWORK|ILLUSTRATION|PORTRAIT|KEY_ART|SPLASH_ART)$/i;
const artworkId=/(?:^|[-_ ])(?:card[-_ ]?art(?:work)?|concept[-_ ]?art|original[-_ ]?art|illustration|portrait|key[-_ ]?art|splash[-_ ]?art)(?:$|[-_ ])/i;

// 분야별 현재 보유 수: 레지스트리의 CC0 에셋(실제 소스 파일 있는 것) + 오너가 승인한 라이브러리 모델
export function countByFamily(registry,repoRoot,libDir){
  const n={};
  for(const a of registry.assets||[]){
    if(!isCc0(a.license)||a.securityBlocked||a.quarantined||a.gameUseForbidden)continue;
    const has=(a.sourceFiles||[]).some(f=>fs.existsSync(path.join(repoRoot,f)));
    if(!has)continue;
    const k=String(a.family||a.category||'?').toUpperCase();n[k]=(n[k]||0)+1;
  }
  for(const p of approvedLibraryParents(libDir||'',{includeSupportingAssets:true})){const k=String(p.family).toUpperCase();n[k]=(n[k]||0)+1}
  return n;
}
export function shortages(counts,minPerFamily){
  return Object.entries(minPerFamily).map(([family,min])=>({family,min,have:counts[family]||0,missing:Math.max(0,min-(counts[family]||0))})).filter(x=>x.missing>0).sort((a,b)=>b.missing-a.missing);
}

// 후보 출처: CC0 검증됨 + 자동 확보 허용 + 미리받기 금지 규칙 준수 + 해당 분야 + 아직 라이브러리에 없음
export function candidateSources(registry,family,have=new Set()){
  return (registry.externalSources||[]).filter(s=>
    acquisitionFamilies.has(String(s.category||'').toUpperCase())&&!artworkId.test(String(s.id||''))&&![s.category,...(Array.isArray(s.categories)?s.categories:[])].some(c=>artworkCategory.test(String(c||'')))
    &&isCc0(s.license)&&s.automaticAcquisitionWhenSelected===true&&s.prefetchAllowed===false&&s.speculativeDownloadAllowed===false
    &&String(s.category||'').toUpperCase()===family.toUpperCase()&&/^https:\/\//.test(s.licenseEvidenceUrl||'')&&!have.has(s.id)&&!String(s.id).startsWith('acquired-'));
}
export function methodFor(src,{allowLocal=false}={}){
  const u=String(src.sourceUrl||'');
  if(/^https:\/\/github\.com\/[^/]+\/[^/]+\/?$/.test(u)||(allowLocal&&src.localGitPath))return 'git';
  if(/^https:\/\/.+\.zip(\?.*)?$/i.test(String(src.downloadUrl||''))||(allowLocal&&/^http:\/\/127\.0\.0\.1:\d+\/.+\.zip$/.test(String(src.downloadUrl||''))))return 'zip';
  if(/^https:\/\/[^?#]+\.glb(?:\?[^#]*)?$/i.test(String(src.downloadUrl||''))||(allowLocal&&/^http:\/\/127\.0\.0\.1:\d+\/[^?#]+\.glb$/.test(String(src.downloadUrl||''))))return 'glb';
  return 'manual';
}

export async function acquire(src,libDir,{allowLocal=false,maxBytes=500*1024*1024}={}){
  if(!/^[a-z0-9][a-z0-9_-]*$/i.test(String(src.id||''))||!candidateSources({externalSources:[src]},String(src.category||'')).length)return {id:src.id,status:'SOURCE_POLICY_REJECTED'};
  const method=methodFor(src,{allowLocal}),dest=path.join(libDir,src.id);
  let sourceFileEvidence={};
  if(fs.existsSync(dest))return {id:src.id,status:'SKIPPED_EXISTS'};
  if(method==='manual')return {id:src.id,status:'MANUAL_DOWNLOAD_REQUIRED',hint:`${src.sourceUrl} 에서 zip을 받아 ${path.join(libDir,'_inbox')} 에 넣고: node tools/vibe-cc0-library.mjs ingest --source ${src.id}`};
  fs.mkdirSync(libDir,{recursive:true});
  if(method==='git'){
    const url=allowLocal&&src.localGitPath?src.localGitPath:src.sourceUrl;
    const r=spawnSync('git',['clone','--depth','1',url,dest],{encoding:'utf8',timeout:600000});
    if(r.status!==0){fs.rmSync(dest,{recursive:true,force:true});return {id:src.id,status:'DOWNLOAD_FAILED',error:String(r.stderr).slice(0,200)}}
    fs.rmSync(path.join(dest,'.git'),{recursive:true,force:true});
  }else if(method==='glb'){
    // [직접 원본] HTTPS 출처의 파일만 받는다. 다운로드는 제한된 크기와 시간으로 읽고,
    // 자체 포함 GLB 구조·해시를 확인한 후에만 미승인 팩으로 보관한다.
    const limit=Math.min(maxBytes,20*1024*1024);
    try{
      const res=await fetch(src.downloadUrl,{redirect:'error',signal:AbortSignal.timeout(60000)});
      if(!res.ok)return {id:src.id,status:'DOWNLOAD_FAILED',error:'HTTP '+res.status};
      if(Number(res.headers.get('content-length'))>limit){await res.body?.cancel();return {id:src.id,status:'DOWNLOAD_TOO_LARGE'}}
      const chunks=[];let size=0;
      for await(const chunk of res.body){
        size+=chunk.length;
        if(size>limit)return {id:src.id,status:'DOWNLOAD_TOO_LARGE'};
        chunks.push(Buffer.from(chunk));
      }
      const buf=Buffer.concat(chunks,size);
      const digest=crypto.createHash('sha256').update(buf).digest('hex');
      if(src.downloadSha256&&digest!==String(src.downloadSha256).toLowerCase())return {id:src.id,status:'HASH_MISMATCH'};
      if(size<20||buf.toString('ascii',0,4)!=='glTF'||buf.readUInt32LE(4)!==2||buf.readUInt32LE(8)!==size)return {id:src.id,status:'INVALID_GLB'};
      let offset=12,doc=null,binLength=0,binSeen=false;
      while(offset<size){
        if(offset+8>size)return {id:src.id,status:'INVALID_GLB'};
        const length=buf.readUInt32LE(offset),type=buf.readUInt32LE(offset+4);
        const start=offset+8;
        if(length%4||start+length>size)return {id:src.id,status:'INVALID_GLB'};
        if(offset===12&&type===0x4e4f534a)doc=JSON.parse(buf.toString('utf8',start,start+length));
        else if(type===0x004e4942&&!binSeen){binLength=length;binSeen=true}
        else return {id:src.id,status:'INVALID_GLB'};
        offset=start+length;
      }
      if(!doc||doc.asset?.version!=='2.0'||!Array.isArray(doc.meshes)||!doc.meshes.length||
          !Array.isArray(doc.buffers)||doc.buffers.length!==1||doc.buffers[0].uri!==undefined||
          !Number.isSafeInteger(doc.buffers[0].byteLength)||doc.buffers[0].byteLength<=0||
          doc.buffers[0].byteLength>binLength||binLength-doc.buffers[0].byteLength>3||
          (doc.images||[]).some(x=>x.uri!==undefined||!Number.isSafeInteger(x.bufferView)))
        return {id:src.id,status:'INVALID_OR_EXTERNAL_GLB'};
      fs.mkdirSync(dest);
      fs.writeFileSync(path.join(dest,'original.glb'),buf,{flag:'wx'});
      sourceFileEvidence={downloadUrl:src.downloadUrl,sourceSha256:digest,sourceBytes:size,sourceFile:'original.glb',visualQualityApproved:false,runtimeVerified:false};
    }catch(e){
      fs.rmSync(dest,{recursive:true,force:true});
      return {id:src.id,status:'DOWNLOAD_FAILED',error:String(e.message).slice(0,160)};
    }
  }else{
    // 크기 상한을 두고 받고, 오너가 해시(downloadSha256)를 적어 뒀으면 반드시 일치해야 한다. 안전한 해제(zip-slip 방지).
    const tmpZip=path.join(libDir,`.dl-${src.id}.zip`);
    try{
      const res=await fetch(src.downloadUrl,{redirect:'follow',signal:AbortSignal.timeout(120000)});
      if(!res.ok)return {id:src.id,status:'DOWNLOAD_FAILED',error:'HTTP '+res.status};
      if(Number(res.headers.get('content-length'))>maxBytes){await res.body?.cancel();return {id:src.id,status:'DOWNLOAD_TOO_LARGE'}}
      const chunks=[];let size=0;
      for await(const chunk of res.body){size+=chunk.length;if(size>maxBytes)return {id:src.id,status:'DOWNLOAD_TOO_LARGE'};chunks.push(Buffer.from(chunk))}
      const buf=Buffer.concat(chunks,size),digest=crypto.createHash('sha256').update(buf).digest('hex');
      if(src.downloadSha256&&digest!==String(src.downloadSha256).toLowerCase())return {id:src.id,status:'HASH_MISMATCH'};
      sourceFileEvidence={downloadUrl:src.downloadUrl,sourceSha256:digest,sourceBytes:size,visualQualityApproved:false,runtimeVerified:false};
      fs.writeFileSync(tmpZip,buf);
      fs.mkdirSync(dest,{recursive:true});
      const r=extractZipSafe(tmpZip,dest);
      if(r.status!==0){fs.rmSync(dest,{recursive:true,force:true});return {id:src.id,status:'EXTRACT_FAILED',error:String(r.stderr).slice(0,160)}}
    }catch(e){fs.rmSync(dest,{recursive:true,force:true});return {id:src.id,status:'DOWNLOAD_FAILED',error:String(e.message).slice(0,160)}}
    finally{fs.rmSync(tmpZip,{force:true})}
  }
  // 출처 기록(레지스트리의 CC0 검증 정보) — 이후 라이선스 증거 검사는 provenance.json 또는 팩 안의 라이선스 파일로 한다
  fs.writeFileSync(path.join(dest,'provenance.json'),JSON.stringify({license:'CC0',sourceId:src.id,sourceUrl:src.sourceUrl,licenseEvidenceUrl:src.licenseEvidenceUrl,family:String(src.category||'PROP').toUpperCase(),acquiredAt:new Date().toISOString(),acquiredBy:'vibe-cc0-fetch',approved:false,...sourceFileEvidence},null,1));
  // 팩 안에 CC0와 다른 조건이 적힌 라이선스 파일이 있으면 거절(레지스트리 정보가 틀렸을 가능성)
  const textLic=fs.readdirSync(dest).filter(n=>/^licen[sc]e/i.test(n)).map(n=>fs.readFileSync(path.join(dest,n),'utf8').slice(0,20000));
  if(textLic.some(hasOtherTerms)){
    fs.rmSync(dest,{recursive:true,force:true});return {id:src.id,status:'REJECTED_LICENSE_MISMATCH'};
  }
  return {id:src.id,status:'ACQUIRED_NEEDS_OWNER_APPROVAL',pack:src.id,hint:`승인: node tools/vibe-cc0-library.mjs approve --pack ${src.id} --by <이름>`};
}

export function plan({registry,repoRoot,libDir,family=null,sourceId=null,max=2,design=null,wanted=null,minPerFamily=JSON.parse(fs.readFileSync(path.join(here,'vibe-cc0-shortage.json'),'utf8')).minPerFamily,allowLocal=false}){
  const have=new Set(fs.existsSync(libDir)?fs.readdirSync(libDir):[]);
  const counts=countByFamily(registry,repoRoot,libDir);
  const short=shortages(counts,minPerFamily).filter(s=>!family||s.family===family.toUpperCase());
  const picks=[];
  if(sourceId){
    const selected=(registry.externalSources||[]).find(x=>x.id===sourceId);
    if(!selected)throw new Error('SOURCE_NOT_REGISTERED:'+sourceId);
    if(family&&String(selected.category).toUpperCase()!==family.toUpperCase())throw new Error('SOURCE_FAMILY_MISMATCH');
    if(!have.has(sourceId)&&!candidateSources(registry,String(selected.category),have).some(x=>x.id===sourceId))throw new Error('SOURCE_POLICY_REJECTED:'+sourceId);
    if(!have.has(sourceId))picks.push({family:selected.category,missing:null,src:selected,method:methodFor(selected,{allowLocal})});
    return {counts,short,picks};
  }
  // 자동 실행: 실제 지시서의 명시 출처와 최신 부족 장부가 일치할 때만 확보한다.
  if(design!==null||wanted!==null){
    if(!Array.isArray(design)||!Array.isArray(wanted?.wanted)||typeof wanted.game!=='string')throw new Error('DESIGN_DEMAND_UNVERIFIED');
    const demand=[];const seen=new Set();const perFamily={};
    for(const row of design){
      const live=wanted.wanted.find(x=>x.id===row.id&&x.kind===row.kind);
      if(!live||/portrait|card.?art|illustration|artwork/i.test(String(row.kind)+' '+String(row.id)))continue;
      const hasMissing=Array.isArray(live.missing)&&live.missing.length>0;
      const needsSource=hasMissing||['missing','using-stand-ins','missing-models-auto-practice'].includes(live.status);
      const requests=row.localAcquisition||[];
      if(needsSource&&!requests.length)demand.push({demandId:row.id,kind:row.kind,state:'EXACT_SOURCE_MAPPING_REQUIRED'});
      for(const req of requests){
        const animal=typeof req.animal==='string'?req.animal:null;
        const unresolved=animal?(wanted.animalSourcePractice?.candidates||[]).some(x=>x.name===animal&&x.registrationApproved===false&&(x.sourcePreview?.failureReason||x.geometryQualityState==='SOURCE_GEOMETRY_REPAIR_REQUIRED'||x.state==='HELD_GLB_GEOMETRY_OUTSIDE_MOBILE_BUDGET'))&&!((wanted.animalSourcePractice?.candidates||[]).some(x=>x.name===animal&&x.registrationApproved===true)) : needsSource;
        if(!unresolved||seen.has(req.sourceId)||have.has(req.sourceId))continue;
        const src=(registry.externalSources||[]).find(x=>x.id===req.sourceId);
        if(!src||!candidateSources(registry,String(src.category),have).some(x=>x.id===src.id)){
          demand.push({demandId:row.id,sourceId:req.sourceId,state:'SOURCE_POLICY_OR_CATALOG_REQUIRED'});continue;
        }
        if(family&&String(src.category).toUpperCase()!==family.toUpperCase())continue;
        const method=methodFor(src,{allowLocal});
        if(method==='manual'){demand.push({demandId:row.id,sourceId:src.id,family:src.category,state:'NO_AUTOMATIC_SOURCE'});continue;}
        if((perFamily[src.category]||0)>=max)continue;
        seen.add(src.id);perFamily[src.category]=(perFamily[src.category]||0)+1;
        picks.push({family:src.category,missing:null,src,method,demandId:row.id,game:wanted.game});
      }
    }
    // 실제 원본 검색 결과의 전용 무기/선박/모션 부족 현황은 기존 제작자 검색 경로로 이어진다.
    for(const [kind,coverage] of Object.entries(wanted.animalSourcePractice?.assetSourceCoverage?.categories||{})){
      if(coverage.missingModelRights>0)demand.push({kind,missing:coverage.missingModelRights,state:'EXACT_SOURCE_SEARCH_EXISTING_MARE_PIPELINE'});
    }
    return {counts,short:[],picks,demand};
  }
  for(const s of short){
    const candidates=candidateSources(registry,s.family,have).map(src=>({family:s.family,missing:s.missing,src,method:methodFor(src,{allowLocal})}));
    const automatic=candidates.filter(p=>p.method!=='manual');
    // 수동 후보가 첫 자리를 차지해 실제 자동 원본을 막지 않게 한다.
    picks.push(...(automatic.length?automatic:candidates).slice(0,max));
  }
  return {counts,short,picks};
}

if(import.meta.url===pathToFileURL(process.argv[1]||'').href){
  await (async()=>{
  const a=process.argv.slice(2),opt=n=>{const i=a.indexOf('--'+n);return i>=0?a[i+1]:null};
  try{
    const libDir=libraryDir(opt('dir')),repoRoot=process.cwd();
    const registry=JSON.parse(fs.readFileSync('company-asset-library.json','utf8'));
    const designFile=opt('design'),wantedFile=opt('wanted');
    if(a.includes('--execute')&&!opt('source')&&(!designFile||!wantedFile))throw new Error('DESIGN_DEMAND_REQUIRED_FOR_AUTOMATIC_ACQUISITION');
    const design=designFile?JSON.parse(fs.readFileSync(designFile,'utf8')):null;
    const wanted=wantedFile?JSON.parse(fs.readFileSync(wantedFile,'utf8')):null;
    const {short,picks,demand=[]}=plan({registry,repoRoot,libDir,family:opt('family'),sourceId:opt('source'),design,wanted,max:+(opt('max')||2)});
    for(const item of demand)console.log('VIBE_CC0_DESIGN_SOURCE_GAP '+JSON.stringify(item));
    console.log('부족한 분야:',short.length?short.map(s=>`${s.family} ${s.have}/${s.min}`).join(', '):'없음');
    for(const p of picks)console.log(`  후보 ${p.family}: ${p.src.id} (${p.method}) ${p.src.sourceUrl}${p.demandId?' demand='+p.demandId:''}`);
    for(const s of short)if(!picks.some(p=>p.family===s.family&&p.method!=='manual'))console.log(`VIBE_CC0_SOURCE_GAP family=${s.family} missing=${s.missing} automaticSource=NONE`);
    if(!a.includes('--execute')){console.log('VIBE_CC0_FETCH_PLAN_ONLY (--execute 를 주면 받는다)');process.exit(0)}
    for(const p of picks)console.log(JSON.stringify(await acquire(p.src,libDir)));
    scanLibrary(libDir);
    console.log('VIBE_CC0_FETCH_DONE (받은 팩은 후보일 뿐이다. 승인은 사람이: approve)');
  }catch(e){console.error(String(e.message||e));process.exit(1)}
  })();
}
