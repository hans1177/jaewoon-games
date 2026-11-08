#!/usr/bin/env node
// 파일명: tools/vibe-cc0-library.mjs
// 로컬 CC0 라이브러리(예: E 드라이브 러너의 E:\jaewoon-cc0-library) 관리. 팩(첫 단계 폴더)마다 CC0 증거를 확인해 색인하고,
// 오너가 승인한 팩만 변형 연습장의 부모/부품으로 내준다. 스캔은 절대 승인하지 않는다(오너 규칙: 승인은 사람이).
// 폴더 구조:  <라이브러리>/<팩 이름>/...모델·이미지...   +  팩 안에 LICENSE 파일 또는 provenance.json
//             <라이브러리>/_inbox/*.zip  ← 직접 받을 수 없는 출처(itch.io·kenney.nl 등)의 zip을 여기에 넣으면 ingest가 팩으로 푼다
// 사용: node tools/vibe-cc0-library.mjs scan   [--dir <라이브러리>]
//      node tools/vibe-cc0-library.mjs ingest [--dir ..] [--source <registry externalSource id>]   (_inbox의 zip → 팩 폴더)
//      node tools/vibe-cc0-library.mjs approve --pack <이름> --by <승인자> [--dir ..]
//      node tools/vibe-cc0-library.mjs list    [--dir ..]
// 라이브러리 위치: --dir 또는 환경변수 VIBE_CC0_LIBRARY_DIR
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {runPython} from './vibe-python.mjs';

const MODEL_EXT=/\.(obj|glb|gltf)$/i,IMAGE_EXT=/\.(png|jpe?g|webp|svg)$/i;
const CC0_TEXT=/CC0|Creative Commons Zero|public domain dedication/i;
// CC0가 아닌 다른 조건이 같이 적혀 있으면 거절한다(예: "CC0 아님, CC-BY 사용")
// 제한적인 다른 조건(CC-BY, 비영리, 동일조건, 파생금지, 저작자 표시 필수 등). 'No attribution required' 같은 CC0 정상 문구는 걸리지 않게 한다.
export const OTHER_TERMS=/CC[- ]BY|NonCommercial|Non-Commercial|ShareAlike|No ?Derivatives|all rights reserved|(?<!\bno\s)(?<!\bnot\s)(?<!\bwithout\s)attribution (?:is )?(?:required|mandatory)|(?<!\bno\s)requires? attribution|must (?:give|provide|include) (?:appropriate )?(?:credit|attribution)|royalty[- ]free license/i;
// CC0 표기 자체만 지우고(같은 줄의 다른 문구는 남긴다) 다른 조건이 남아 있는지 본다.
export const hasOtherTerms=t=>OTHER_TERMS.test(String(t).replace(/CC0(?:[- ]1\.0)?(?: Universal)?|Creative Commons Zero/gi,''));
const sha256=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');

export function libraryDir(arg){const d=arg||process.env.VIBE_CC0_LIBRARY_DIR;if(!d)throw new Error('LIBRARY_DIR_MISSING (--dir 또는 VIBE_CC0_LIBRARY_DIR)');return path.resolve(d)}

function walk(dir,out=[]){
  for(const e of fs.readdirSync(dir,{withFileTypes:true})){
    if(e.name.startsWith('.'))continue;
    const f=path.join(dir,e.name);
    if(e.isDirectory())walk(f,out);else out.push(f);
  }
  return out;
}

// 팩의 CC0 증거: provenance.json(license가 CC0) 또는 라이선스 텍스트 파일. 다른 조건이 섞여 있으면 거절.
export function checkLicense(packDir){
  const prov=path.join(packDir,'provenance.json');
  if(fs.existsSync(prov)){
    try{
      const j=JSON.parse(fs.readFileSync(prov,'utf8'));
      if(/^CC0(?:-1\.0)?$/i.test(String(j.license||''))&&/^https:\/\//.test(String(j.licenseEvidenceUrl||j.sourceUrl||'')))return {ok:true,reason:'provenance.json',sourceUrl:j.sourceUrl||null,family:j.family||null,sourceId:j.sourceId||null};
      return {ok:false,reason:'PROVENANCE_NOT_CC0_OR_NO_EVIDENCE_URL'};
    }catch{return {ok:false,reason:'PROVENANCE_UNREADABLE'}}
  }
  const files=fs.readdirSync(packDir).filter(n=>/^(licen[sc]e|copying|readme)/i.test(n)&&fs.statSync(path.join(packDir,n)).isFile());
  for(const n of files){
    const t=fs.readFileSync(path.join(packDir,n),'utf8').slice(0,20000);
    if(CC0_TEXT.test(t)){
      if(hasOtherTerms(t))return {ok:false,reason:`LICENSE_MIXED_TERMS:${n}`};
      return {ok:true,reason:`license text:${n}`};
    }
  }
  return {ok:false,reason:'NO_CC0_EVIDENCE'};
}

export function scanLibrary(dir){
  const packs=[];
  for(const e of fs.existsSync(dir)?fs.readdirSync(dir,{withFileTypes:true}):[]){
    if(!e.isDirectory()||e.name.startsWith('_')||e.name.startsWith('.'))continue;
    const packDir=path.join(dir,e.name),lic=checkLicense(packDir);
    const files=[];
    if(lic.ok)for(const f of walk(packDir)){
      const kind=MODEL_EXT.test(f)?'model':IMAGE_EXT.test(f)?'image':null;
      if(!kind)continue;
      files.push({path:path.relative(dir,f).split(path.sep).join('/'),kind,bytes:fs.statSync(f).size,sha256:sha256(f)});
    }
    packs.push({name:e.name,licenseOk:lic.ok,licenseReason:lic.reason,sourceUrl:lic.sourceUrl||null,family:lic.family||'PROP',sourceId:lic.sourceId||null,
      models:files.filter(f=>f.kind==='model').length,images:files.filter(f=>f.kind==='image').length,files});
  }
  const index={version:1,scannedAt:new Date().toISOString(),packs};
  fs.writeFileSync(path.join(dir,'library-index.json'),JSON.stringify(index,null,1));
  return index;
}

const approvalPath=dir=>path.join(dir,'library-approved.json');
export function readApprovals(dir){try{return JSON.parse(fs.readFileSync(approvalPath(dir),'utf8'))}catch{return {packs:{}}}}
// 승인은 사람이 --by 로 이름을 남길 때만. CC0 증거가 없는 팩은 승인할 수 없다.
export function approvePack(dir,name,by){
  if(!by||!String(by).trim())throw new Error('APPROVER_REQUIRED');
  const idx=scanLibrary(dir),pack=idx.packs.find(p=>p.name===name);
  if(!pack)throw new Error('PACK_NOT_FOUND:'+name);
  if(!pack.licenseOk)throw new Error('PACK_LICENSE_NOT_VERIFIED:'+pack.licenseReason);
  const ap=readApprovals(dir);
  ap.packs[name]={approvedBy:String(by).trim(),approvedAt:new Date().toISOString(),models:pack.models,images:pack.images,fileHashes:Object.fromEntries(pack.files.map(f=>[f.path,f.sha256]))};
  fs.writeFileSync(approvalPath(dir),JSON.stringify(ap,null,1));
  return ap.packs[name];
}

// 변형 연습장에 내줄 부모: 승인된 팩 + 승인 당시 해시와 지금 해시가 같은 모델 파일만(승인 뒤 바뀐 파일은 제외)
export function approvedLibraryParents(dir){
  if(!dir||!fs.existsSync(dir))return [];
  const ap=readApprovals(dir),out=[];
  for(const [name,info] of Object.entries(ap.packs||{})){
    const packDir=path.join(dir,name);
    if(!fs.existsSync(packDir)||!checkLicense(packDir).ok)continue;
    for(const [rel,hash] of Object.entries(info.fileHashes||{})){
      if(!MODEL_EXT.test(rel))continue;
      const abs=path.join(dir,rel);
      if(!fs.existsSync(abs)||sha256(abs)!==hash)continue;
      const lic=checkLicense(packDir);
      out.push({id:`lib:${rel}`,family:lic.family||'PROP',file:abs,license:'CC0',source:'LOCAL_LIBRARY',pack:name,approvedBy:info.approvedBy});
    }
  }
  return out;
}

// zip 해제(경로 탈출 zip-slip 방지). 성공하면 status 0.
export function extractZipSafe(zipPath,dest){
  return runPython(['-c','import sys,zipfile,os\nz=zipfile.ZipFile(sys.argv[1]);d=os.path.realpath(sys.argv[2])\nfor n in z.namelist():\n    t=os.path.realpath(os.path.join(d,n))\n    if not t.startswith(d+os.sep) and t!=d: raise SystemExit("ZIP_SLIP "+n)\nz.extractall(d)',zipPath,dest],{encoding:'utf8'});
}

// _inbox/*.zip → 팩 폴더(zip 이름). provenance는 --source 가 주어지면 레지스트리 externalSources에서 가져오고, 없으면 CC0 증거 파일이 zip 안에 있어야 한다.
export function ingestInbox(dir,{source=null,registry=null}={}){
  const inbox=path.join(dir,'_inbox'),done=[];
  if(!fs.existsSync(inbox))return done;
  for(const z of fs.readdirSync(inbox).filter(n=>/\.zip$/i.test(n))){
    const name=z.replace(/\.zip$/i,'').replace(/[^\w.-]+/g,'-'),dest=path.join(dir,name);
    if(fs.existsSync(dest)){done.push({zip:z,status:'SKIPPED_EXISTS'});continue}
    fs.mkdirSync(dest,{recursive:true});
    const r=extractZipSafe(path.join(inbox,z),dest);
    if(r.status!==0){fs.rmSync(dest,{recursive:true,force:true});done.push({zip:z,status:'EXTRACT_FAILED',error:String(r.stderr).slice(0,200)});continue}
    const src=source&&registry?.externalSources?.find(s=>s.id===source);
    if(src){
      if(!/^CC0(?:-1\.0)?$/i.test(src.license||'')){fs.rmSync(dest,{recursive:true,force:true});done.push({zip:z,status:'SOURCE_NOT_CC0'});continue}
      fs.writeFileSync(path.join(dest,'provenance.json'),JSON.stringify({license:'CC0',sourceId:src.id,sourceUrl:src.sourceUrl,licenseEvidenceUrl:src.licenseEvidenceUrl,family:src.category||'PROP',ingestedAt:new Date().toISOString(),ingestedFrom:'_inbox'},null,1));
    }
    const lic=checkLicense(dest);
    if(!lic.ok){fs.rmSync(dest,{recursive:true,force:true});done.push({zip:z,status:'REJECTED_NO_CC0_EVIDENCE',reason:lic.reason});continue}
    done.push({zip:z,status:'INGESTED',pack:name});
  }
  return done;
}

if(import.meta.url===pathToFileURL(process.argv[1]||'').href){
  const [cmd,...rest]=process.argv.slice(2);
  const opt=n=>{const i=rest.indexOf('--'+n);return i>=0?rest[i+1]:null};
  try{
    const dir=libraryDir(opt('dir'));
    if(cmd==='scan'){const i=scanLibrary(dir);for(const p of i.packs)console.log(`${p.licenseOk?'OK ':'NO '} ${p.name}  모델 ${p.models} 이미지 ${p.images}  (${p.licenseReason})`);console.log(`VIBE_CC0_LIBRARY_SCANNED packs=${i.packs.length} (승인은 별도: approve --pack <이름> --by <이름>)`)}
    else if(cmd==='ingest'){
      let registry=null;try{registry=JSON.parse(fs.readFileSync('company-asset-library.json','utf8'))}catch{}
      for(const d of ingestInbox(dir,{source:opt('source'),registry}))console.log(JSON.stringify(d));
    }
    else if(cmd==='approve'){const r=approvePack(dir,opt('pack'),opt('by'));console.log(`VIBE_CC0_PACK_APPROVED ${opt('pack')} by ${r.approvedBy} (모델 ${r.models})`)}
    else if(cmd==='list'){const ap=readApprovals(dir);console.log(JSON.stringify(Object.keys(ap.packs||{})));console.log(`approved parents: ${approvedLibraryParents(dir).length}`)}
    else{console.error('usage: scan|ingest|approve|list');process.exit(2)}
  }catch(e){console.error(String(e.message||e));process.exit(1)}
}
