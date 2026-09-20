// 파일명: tools/vibe2-performance-sanity.mjs
// 역할: 구현 후보의 기본 성능·변경량 안전성을 읽기 전용으로 검사한다.
// 원칙: 소스를 수정하지 않으며 탐색/구현/QA 결과를 대체하지 않는다.

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const clean=value=>String(value??'').trim();
const posix=value=>clean(value).replaceAll('\\','/').replace(/^\.\//,'');
const BINARY_EXTENSIONS=new Set(['.rbxl','.rbxlx','.uasset','.umap','.controller','.anim','.avatar','.fbx','.blend','.png','.jpg','.jpeg','.webp','.wav','.mp3','.ogg']);
const MAX_CHANGED_FILES=4;
const MAX_SINGLE_TEXT_FILE_BYTES=300000;

function readJson(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
function writeJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,`${JSON.stringify(value,null,2)}\n`,'utf8');}
function parseArgs(argv=process.argv.slice(2)){const out={};for(const raw of argv){if(!raw.startsWith('--'))continue;const body=raw.slice(2),at=body.indexOf('=');if(at<0)out[body]=true;else out[body.slice(0,at)]=body.slice(at+1);}return out;}

function baselineFileBytes({root,baseMainSha,sourceRoot,relative}){
  const sha=clean(baseMainSha);
  if(!/^[0-9a-f]{7,64}$/i.test(sha))return null;
  const repoPath=posix(path.posix.join(sourceRoot,relative));
  try{
    return execFileSync('git',['show',`${sha}:${repoPath}`],{cwd:root,encoding:null,maxBuffer:32*1024*1024}).length;
  }catch{
    return null;
  }
}

export function verifyPerformanceSanity({root=process.cwd(),manifest={}}={}){
  const sourceRoot=posix(manifest.sourceRoot);
  const changed=[...new Set((manifest.changedFiles||[]).map(posix).filter(Boolean))];
  const checks=[];
  const add=(name,pass,detail='')=>checks.push({name,pass:Boolean(pass),detail:clean(detail)||null});
  add('exploration-handoff-present',Boolean(manifest?.exploration?.reuseKey),manifest?.exploration?.reuseKey||'missing');
  add('exploration-read-only',manifest?.exploration?.sourceWrite===false,String(manifest?.exploration?.sourceWrite));
  add('bounded-changed-file-count',changed.length>0&&changed.length<=MAX_CHANGED_FILES,String(changed.length));
  let binary=false,oversized=false,missing=false;
  const sizeBudgetDetails=[];
  for(const relative of changed){
    if(BINARY_EXTENSIONS.has(path.extname(relative).toLowerCase()))binary=true;
    const file=path.resolve(root,sourceRoot,relative);
    if(!fs.existsSync(file)||!fs.statSync(file).isFile()){missing=true;continue;}
    const currentBytes=fs.statSync(file).size;
    const baselineBytes=baselineFileBytes({root,baseMainSha:manifest.baseMainSha,sourceRoot,relative});
    const growthBytes=baselineBytes===null?currentBytes:currentBytes-baselineBytes;
    const preExistingOversized=baselineBytes!==null&&baselineBytes>MAX_SINGLE_TEXT_FILE_BYTES;
    const withinBudget=currentBytes<=MAX_SINGLE_TEXT_FILE_BYTES||(preExistingOversized&&growthBytes<=MAX_SINGLE_TEXT_FILE_BYTES);
    if(!withinBudget)oversized=true;
    sizeBudgetDetails.push(`${relative}:current=${currentBytes}:baseline=${baselineBytes===null?'missing':baselineBytes}:growth=${growthBytes}:mode=${preExistingOversized?'existing-large-delta':'absolute'}`);
  }
  add('no-binary-source-write',!binary,binary?'binary-change-detected':'text-only');
  add('changed-files-exist',!missing,missing?'missing-changed-file':'all-present');
  add('single-file-size-budget',!oversized,sizeBudgetDetails.join(';')||`<=${MAX_SINGLE_TEXT_FILE_BYTES}`);
  const pass=checks.every(row=>row.pass);
  return{version:2,role:'performance',sourceWrite:false,pass,sourceRoot,changedFiles:changed,checks};
}

export function runPerformanceSanity({root=process.cwd(),manifestFile='',outputFile=''}={}){
  if(!clean(manifestFile))throw new Error('manifest file required');
  const result=verifyPerformanceSanity({root,manifest:readJson(manifestFile)});
  if(outputFile)writeJson(outputFile,result);
  return result;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const args=parseArgs();const result=runPerformanceSanity({root:clean(args.root)||process.cwd(),manifestFile:clean(args.manifest),outputFile:clean(args.output)});console.log(`VIBE2_PERFORMANCE_SANITY=${result.pass?'PASS':'FAIL'}`);console.log('VIBE2_PERFORMANCE_SOURCE_WRITE=NO');if(!result.pass)process.exitCode=1;}
