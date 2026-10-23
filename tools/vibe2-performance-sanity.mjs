// 파일명: tools/vibe2-performance-sanity.mjs
// 역할: 구현 후보의 기본 성능·변경량 안전성을 읽기 전용으로 검사한다.
// 원칙: 소스를 수정하지 않으며 탐색/구현/QA 결과를 대체하지 않는다.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const clean=value=>String(value??'').trim();
const posix=value=>clean(value).replaceAll('\\','/').replace(/^\.\//,'');
const BINARY_EXTENSIONS=new Set(['.rbxl','.rbxlx','.uasset','.umap','.controller','.anim','.avatar','.fbx','.blend','.png','.jpg','.jpeg','.webp','.wav','.mp3','.ogg']);
// Match the source worker's existing eight-file limit. A second four-file limit
// must not reject connected server/client/shared/UI implementation candidates.
const MAX_CHANGED_FILES=8;
const GAME_SOURCE_EXTENSIONS=Object.freeze({
  'roblox-games':new Set(['.lua','.luau']),
  'unity-games':new Set(['.cs','.uxml','.uss']),
  'web-games':new Set(['.js','.mjs','.cjs','.html','.css'])
});
const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const contained=(base,file)=>{const rel=path.relative(base,file);return rel!==''&&!rel.startsWith('..'+path.sep)&&rel!=='..'&&!path.isAbsolute(rel);};
const MAX_SINGLE_TEXT_FILE_GROWTH_BYTES=300000;

function readJson(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
function writeJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,`${JSON.stringify(value,null,2)}\n`,'utf8');}
function parseArgs(argv=process.argv.slice(2)){const out={};for(const raw of argv){if(!raw.startsWith('--'))continue;const body=raw.slice(2),at=body.indexOf('=');if(at<0)out[body]=true;else out[body.slice(0,at)]=body.slice(at+1);}return out;}
function baselineRevisionReadable(root,revision){if(!/^[0-9a-f]{40}$/i.test(clean(revision)))return false;try{execFileSync('git',['cat-file','-e',`${revision}^{commit}`],{cwd:root,stdio:'ignore'});return true;}catch{return false;}}
function baselineFileContent(root,revision,relative){
  const options={cwd:root,encoding:null,maxBuffer:64*1024*1024,stdio:['ignore','pipe','ignore']};
  // A new file has an empty baseline; an unreadable tracked blob is an error,
  // not a fabricated zero-byte baseline that can pass the growth/delta checks.
  const entry=execFileSync('git',['ls-tree','-z',revision,'--',relative],options);
  return entry.length?execFileSync('git',['show',`${revision}:${relative}`],options):Buffer.alloc(0);
}

export function verifyPerformanceSanity({root=process.cwd(),manifest={}}={}){
  const sourceRoot=posix(manifest.sourceRoot);
  const changed=[...new Set((Array.isArray(manifest.changedFiles)?manifest.changedFiles:[]).map(posix).filter(Boolean))];
  const rootDirectory=fs.realpathSync(root);
  const sourceDirectory=path.resolve(rootDirectory,sourceRoot);
  const rootContained=sourceDirectory===rootDirectory||contained(rootDirectory,sourceDirectory);
  const gameRoot=posix(path.relative(rootDirectory,sourceDirectory)).split('/')[0];
  const sourceExtensions=GAME_SOURCE_EXTENSIONS[gameRoot];
  const gameSourceRequired=Boolean(sourceExtensions);
  const checks=[];
  const add=(name,pass,detail='')=>checks.push({name,pass:Boolean(pass),detail:clean(detail)||null});
  add('exploration-handoff-present',Boolean(manifest?.exploration?.reuseKey),manifest?.exploration?.reuseKey||'missing');
  add('exploration-read-only',manifest?.exploration?.sourceWrite===false,String(manifest?.exploration?.sourceWrite));
  add('source-root-contained',rootContained,sourceRoot);
  add('bounded-changed-file-count',changed.length>0&&changed.length<=MAX_CHANGED_FILES,String(changed.length));
  const baseMainSha=clean(manifest.baseMainSha);
  const baselineReadable=baselineRevisionReadable(root,baseMainSha);
  const fileGrowth=[];
  let binary=false,growthExceeded=false,missing=false,invalidPath=false,baselineFileFailure=false;
  for(const relative of changed){
    if(BINARY_EXTENSIONS.has(path.extname(relative).toLowerCase()))binary=true;
    const file=path.resolve(sourceDirectory,relative);
    if(!rootContained||path.isAbsolute(relative)||!contained(sourceDirectory,file)){
      invalidPath=true;continue;
    }
    if(!fs.existsSync(file)||!fs.lstatSync(file).isFile()){missing=true;continue;}
    // Reject directory symlink escapes as well as an explicitly symlinked file.
    if(!contained(sourceDirectory,fs.realpathSync(file))){invalidPath=true;continue;}
    if(!baselineReadable)continue;
    const repoRelative=posix(path.relative(rootDirectory,file));
    try{
      const candidate=fs.readFileSync(file);
      const baseline=baselineFileContent(rootDirectory,baseMainSha,repoRelative);
      const candidateBytes=candidate.length,baseBytes=baseline.length;
      const growthBytes=Math.max(0,candidateBytes-baseBytes);
      const baseSha256=digest(baseline),candidateSha256=digest(candidate);
      const contentChanged=baseSha256!==candidateSha256;
      const runtimeSource=gameSourceRequired&&sourceExtensions.has(path.extname(relative).toLowerCase());
      fileGrowth.push({path:relative,baseBytes,candidateBytes,growthBytes,baseSha256,candidateSha256,contentChanged,runtimeSource});
      if(growthBytes>MAX_SINGLE_TEXT_FILE_GROWTH_BYTES)growthExceeded=true;
    }catch{
      baselineFileFailure=true;
    }
  }
  add('changed-paths-contained',!invalidPath,invalidPath?'path-outside-source-root':'contained');
  add('baseline-files-readable',!baselineFileFailure,baselineFileFailure?'unreadable-baseline-or-candidate':'readable');
  const actualSourceChangedFiles=fileGrowth.filter(row=>row.runtimeSource&&row.contentChanged).map(row=>row.path);
  if(gameSourceRequired){
    // Necessary source-candidate evidence only. This is not build/runtime/visual QA.
    add('actual-game-source-delta',baselineReadable&&actualSourceChangedFiles.length>0,
      actualSourceChangedFiles.join('|')||'metadata-only-or-unchanged-source');
  }
  add('no-binary-source-write',!binary,binary?'binary-change-detected':'text-only');
  add('changed-files-exist',!missing,missing?'missing-changed-file':'all-present');
  add('baseline-revision-readable',baselineReadable,baselineReadable?baseMainSha:'missing-or-unreadable-base-main-sha');
  const worstGrowth=fileGrowth.reduce((max,row)=>Math.max(max,row.growthBytes),0);
  add('single-file-growth-budget',baselineReadable&&!growthExceeded,growthExceeded?`growth>${MAX_SINGLE_TEXT_FILE_GROWTH_BYTES};max=${worstGrowth}`:`growth<=${MAX_SINGLE_TEXT_FILE_GROWTH_BYTES};max=${worstGrowth}`);
  const pass=checks.every(row=>row.pass);
  return{version:2,role:'performance',sourceWrite:false,pass,sourceRoot,changedFiles:changed,actualSourceChangedFiles,runtimeVerified:false,fileGrowth,checks};
}

// Web game 3D runtime measurements are facts for the existing Vibe diagnostic path,
// not a replacement for its source sanity, game QA, Android profiling or release gates.
export function diagnoseVibeWebFrameBottleneck(metrics={}){
 const finite=value=>typeof value==='number'&&Number.isFinite(value);
 const ready=metrics?.kind==='VIBE_WEB_RUNTIME_FRAME_EVIDENCE'&&metrics.ready===true&&
  metrics.activeWebGL===true&&metrics.rendererVisible===true;
 const frames=metrics.framesObserved;
 const hasFrames=ready&&Number.isInteger(frames)&&frames>=1&&
  finite(metrics.pixelRatio)&&finite(metrics.pixelRatioCap)&&finite(metrics.pixelRatioFloor)&&
  metrics.pixelRatio>0&&metrics.pixelRatioFloor>0&&
  metrics.pixelRatio>=metrics.pixelRatioFloor-.001&&metrics.pixelRatio<=metrics.pixelRatioCap+.001&&
  Number.isInteger(metrics.resolutionAdjustments)&&metrics.resolutionAdjustments>=0&&
  Number.isInteger(metrics.renderCalls)&&metrics.renderCalls>0;
 const decorObserved=hasFrames&&[metrics.decorGpuBatches,metrics.decorGpuInstances,metrics.decorGpuProps]
  .every(value=>Number.isSafeInteger(value)&&value>=0)&&
  metrics.decorGpuInstances>=metrics.decorGpuProps;
 const resourceObserved=hasFrames&&[metrics.resourceGpuBatches,metrics.resourceGpuModels,metrics.resourceGpuUpdates]
  .every(value=>Number.isSafeInteger(value)&&value>=0)&&
  metrics.resourceGpuBatches<=Math.max(metrics.resourceGpuModels,1);
 const measured=hasFrames&&metrics.frameSampleValid===true&&frames>=45&&
  finite(metrics.averageFrameMs)&&metrics.averageFrameMs>0;
 const bottlenecks=[];
 if(!hasFrames)bottlenecks.push('NO_VERIFIED_WEBGL_FRAME_TELEMETRY');
 else{
  if(!measured)bottlenecks.push('INSUFFICIENT_FRAME_SAMPLES');
  else if(metrics.averageFrameMs>23)bottlenecks.push('FRAME_BUDGET_PRESSURE');
  if(metrics.pixelRatio<metrics.pixelRatioCap-.005)bottlenecks.push('RESOLUTION_AUTO_REDUCED');
  if(metrics.renderCalls>180)bottlenecks.push('DRAW_CALL_PRESSURE');
 }
 return {
  role:'vibe-runtime-performance-diagnosis',sourceWrite:false,advisoryOnly:true,
  observed:hasFrames,frameIntervalMeasured:measured,
  bottlenecks,source:'insect-survival/world3d.mjs',
  evidence:hasFrames?{
   frames,averageFrameMs:measured?metrics.averageFrameMs:null,
   pixelRatio:metrics.pixelRatio,pixelRatioCap:metrics.pixelRatioCap,
   resolutionAdjustments:metrics.resolutionAdjustments,renderCalls:metrics.renderCalls,
   decorGpuBatches:decorObserved?metrics.decorGpuBatches:null,
   decorGpuInstances:decorObserved?metrics.decorGpuInstances:null,
   decorGpuProps:decorObserved?metrics.decorGpuProps:null,
   resourceGpuBatches:resourceObserved?metrics.resourceGpuBatches:null,
   resourceGpuModels:resourceObserved?metrics.resourceGpuModels:null,
   resourceGpuUpdates:resourceObserved?metrics.resourceGpuUpdates:null,
   hardwareBenchmarkVerified:false
  }:null,
  recommendation:!hasFrames?'VERIFY_ACTUAL_3D_RENDERING_FIRST'
   :bottlenecks.includes('FRAME_BUDGET_PRESSURE')?'INSPECT_WEBGL_RESOLUTION_AND_DRAW_CALLS'
   :bottlenecks.includes('DRAW_CALL_PRESSURE')?'REDUCE_VISUAL_DRAW_WORK_WITHOUT_GAMEPLAY_MUTATION'
   :'KEEP_GAMEPLAY_AND_MONITOR_RUNTIME_WITHOUT_UNVERIFIED_PASS'
 };
}
export function runPerformanceSanity({root=process.cwd(),manifestFile='',outputFile=''}={}){
  if(!clean(manifestFile))throw new Error('manifest file required');
  const result=verifyPerformanceSanity({root,manifest:readJson(manifestFile)});
  if(outputFile)writeJson(outputFile,result);
  return result;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const args=parseArgs();const result=runPerformanceSanity({root:clean(args.root)||process.cwd(),manifestFile:clean(args.manifest),outputFile:clean(args.output)});console.log(`VIBE2_PERFORMANCE_SANITY=${result.pass?'PASS':'FAIL'}`);console.log('VIBE2_PERFORMANCE_SOURCE_WRITE=NO');if(!result.pass)process.exitCode=1;}
