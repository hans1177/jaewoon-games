// 파일명: tools/vibe2-performance-sanity.mjs
// 역할: 구현 후보의 기본 성능·변경량 안전성을 읽기 전용으로 검사한다.
// 원칙: 소스를 수정하지 않으며 탐색/구현/QA 결과를 대체하지 않는다.

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const clean=value=>String(value??'').trim();
const posix=value=>clean(value).replaceAll('\\','/').replace(/^\.\//,'');
const BINARY_EXTENSIONS=new Set(['.rbxl','.rbxlx','.uasset','.umap','.controller','.anim','.avatar','.fbx','.blend','.png','.jpg','.jpeg','.webp','.wav','.mp3','.ogg']);
const MAX_CHANGED_FILES=4;
const MAX_DCC_CHANGED_FILES=8;
const MAX_SINGLE_TEXT_FILE_GROWTH_BYTES=300000;
const MAX_SINGLE_DCC_ARTIFACT_BYTES=32*1024*1024;

function readJson(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
function writeJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,`${JSON.stringify(value,null,2)}\n`,'utf8');}
function parseArgs(argv=process.argv.slice(2)){const out={};for(const raw of argv){if(!raw.startsWith('--'))continue;const body=raw.slice(2),at=body.indexOf('=');if(at<0)out[body]=true;else out[body.slice(0,at)]=body.slice(at+1);}return out;}
function baselineRevisionReadable(root,revision){if(!clean(revision))return false;try{execFileSync('git',['cat-file','-e',`${revision}^{commit}`],{cwd:root,stdio:'ignore'});return true;}catch{return false;}}
function baselineFileBytes(root,revision,relative){try{return execFileSync('git',['show',`${revision}:${relative}`],{cwd:root,encoding:null,maxBuffer:64*1024*1024,stdio:['ignore','pipe','ignore']}).length;}catch{return 0;}}

export function verifyPerformanceSanity({root=process.cwd(),manifest={}}={}){
  const sourceRoot=posix(manifest.sourceRoot);
  const changed=[...new Set((manifest.changedFiles||[]).map(posix).filter(Boolean))];
  const dccExecution=manifest?.nativeAssetAuthoring?.dccExecution&&typeof manifest.nativeAssetAuthoring.dccExecution==='object'
    ?manifest.nativeAssetAuthoring.dccExecution:null;
  const groundedDccOutputs=new Map((dccExecution?.outputs||[]).map(row=>[posix(row?.sourceRelativePath||row?.path),row]).filter(([file,row])=>file&&clean(row?.sha256)));
  const groundedDccAuthoring=clean(manifest?.nativeAssetAuthoring?.status).toUpperCase()==='DCC_ARTIFACT_AUTHORED_RUNTIME_REQUIRED'
    &&dccExecution?.pass===true&&groundedDccOutputs.size>0;
  const changedFileLimit=groundedDccAuthoring?MAX_DCC_CHANGED_FILES:MAX_CHANGED_FILES;
  const checks=[];
  const add=(name,pass,detail='')=>checks.push({name,pass:Boolean(pass),detail:clean(detail)||null});
  add('exploration-handoff-present',Boolean(manifest?.exploration?.reuseKey),manifest?.exploration?.reuseKey||'missing');
  add('exploration-read-only',manifest?.exploration?.sourceWrite===false,String(manifest?.exploration?.sourceWrite));
  add('bounded-changed-file-count',changed.length>0&&changed.length<=changedFileLimit,String(changed.length)+'/'+String(changedFileLimit));
  const baseMainSha=clean(manifest.baseMainSha);
  const baselineReadable=baselineRevisionReadable(root,baseMainSha);
  const fileGrowth=[],binaryRows=[];
  let binary=false,growthExceeded=false,missing=false,unexpectedBinary=false,dccArtifactOversize=false,dccHashMismatch=false;
  const cryptoHash=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  for(const relative of changed){
    const extension=path.extname(relative).toLowerCase();
    const isBinary=BINARY_EXTENSIONS.has(extension);
    if(isBinary)binary=true;
    const file=path.resolve(root,sourceRoot,relative);
    if(!fs.existsSync(file)||!fs.statSync(file).isFile()){missing=true;continue;}
    const candidateBytes=fs.statSync(file).size;
    if(isBinary){
      const grounded=groundedDccOutputs.get(relative);
      if(!groundedDccAuthoring||!grounded){unexpectedBinary=true;binaryRows.push({path:relative,grounded:false,candidateBytes});continue;}
      const actualHash=cryptoHash(file),expectedHash=clean(grounded.sha256);
      if(actualHash!==expectedHash)dccHashMismatch=true;
      if(candidateBytes>MAX_SINGLE_DCC_ARTIFACT_BYTES)dccArtifactOversize=true;
      binaryRows.push({path:relative,grounded:true,candidateBytes,expectedHash,actualHash});
      continue;
    }
    if(!baselineReadable)continue;
    const repoRelative=posix(path.posix.join(sourceRoot,relative));
    const baseBytes=baselineFileBytes(root,baseMainSha,repoRelative);
    const growthBytes=Math.max(0,candidateBytes-baseBytes);
    fileGrowth.push({path:relative,baseBytes,candidateBytes,growthBytes});
    if(growthBytes>MAX_SINGLE_TEXT_FILE_GROWTH_BYTES)growthExceeded=true;
  }
  add('no-binary-source-write',!binary||(!unexpectedBinary&&groundedDccAuthoring),binary?(unexpectedBinary?'unregistered-binary-change':'grounded-dcc-authoring'):'text-only');
  add('dcc-binary-hash-grounding',!binary||(!dccHashMismatch&&groundedDccAuthoring),dccHashMismatch?'dcc-hash-mismatch':binary?'grounded-dcc-hashes':'not-applicable');
  add('dcc-artifact-size-budget',!dccArtifactOversize,dccArtifactOversize?'artifact-over-size-budget':'within-budget');
  add('changed-files-exist',!missing,missing?'missing-changed-file':'all-present');
  add('baseline-revision-readable',baselineReadable,baselineReadable?baseMainSha:'missing-or-unreadable-base-main-sha');
  const worstGrowth=fileGrowth.reduce((max,row)=>Math.max(max,row.growthBytes),0);
  add('single-file-growth-budget',baselineReadable&&!growthExceeded,growthExceeded?`growth>${MAX_SINGLE_TEXT_FILE_GROWTH_BYTES};max=${worstGrowth}`:`growth<=${MAX_SINGLE_TEXT_FILE_GROWTH_BYTES};max=${worstGrowth}`);
  const pass=checks.every(row=>row.pass);
  return{version:2,role:'performance',sourceWrite:false,pass,sourceRoot,changedFiles:changed,fileGrowth,binaryRows,groundedDccAuthoring,checks};
}

export function runPerformanceSanity({root=process.cwd(),manifestFile='',outputFile=''}={}){
  if(!clean(manifestFile))throw new Error('manifest file required');
  const result=verifyPerformanceSanity({root,manifest:readJson(manifestFile)});
  if(outputFile)writeJson(outputFile,result);
  return result;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const args=parseArgs();const result=runPerformanceSanity({root:clean(args.root)||process.cwd(),manifestFile:clean(args.manifest),outputFile:clean(args.output)});console.log(`VIBE2_PERFORMANCE_SANITY=${result.pass?'PASS':'FAIL'}`);console.log('VIBE2_PERFORMANCE_SOURCE_WRITE=NO');if(!result.pass)process.exitCode=1;}
