// 파일명: tools/vibe2-source-worker.mjs
// 역할: Vibe2 작업주문의 텍스트 소스 변경 후보를 무료 로컬 모델로 생성하고 격리 검증한다.
// 기존 게임 루트만 사용하며, 소유자 지시가 명시된 Web 프로토타입은 같은 index 파일 전체 교체를 허용한다.

import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { applyExactEdits, boundedLargeExcerpt } from './autonomous-safe-edit.mjs';
import { exploreVibe2WorkOrder, explorationGuidance } from './vibe2-exploration-worker.mjs';
import { analyzeExistingGameSource } from './company-vibe2-gameplay-intelligence.mjs';
import { assertCompiledWorkContractFresh } from './vibe2-central-work-contract.mjs';
import { assertSystemArchitectureTask, isAllowedSystemArchitecturePath, systemArchitectureGuidance } from './vibe2-system-architecture-contract.mjs';

const clean=value=>String(value??'').trim();
const posix=value=>clean(value).replaceAll('\\','/').replace(/^\.\//,'').replace(/\/+$/,'');
const unique=values=>[...new Set((values||[]).map(clean).filter(Boolean))];
const safeId=value=>clean(value).replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80)||'task';
const MAX_CONTEXT_FILES=20;
const MAX_CONTEXT_BYTES=96000;
const MAX_CHANGED_FILES=8;
const MAX_NEW_FILES=4;
const MAX_FILE_BYTES=260000;
const MIN_FULL_REWRITE_BYTES=1800;
const FULL_WEB_GENERATION_TARGET_MIN_BYTES=12000;
const FULL_WEB_GENERATION_TARGET_MAX_BYTES=24000;
const DEFAULT_MODEL=process.env.VIBE2_LOCAL_MODEL||'qwen3:1.7b';
function assertGameDevelopmentAuthority(){
  const owner=clean(process.env.VIBE2_GAME_DEVELOPMENT_OWNER||'VIBE2_VIBE3').toUpperCase();
  const provider=clean(process.env.VIBE2_GAME_SOURCE_PROVIDER||'LOCAL_OLLAMA').toUpperCase();
  const codexGameSourceWrite=clean(process.env.VIBE2_CODEX_GAME_SOURCE_WRITE||'FORBIDDEN').toUpperCase();
  const paidOpenAiAllowed=clean(process.env.VIBE2_OPENAI_PAID_API_ALLOWED||'false').toLowerCase();
  if(owner!=='VIBE2_VIBE3')throw new Error(`GAME_DEVELOPMENT_OWNER_INVALID:${owner||'EMPTY'}`);
  if(provider!=='LOCAL_OLLAMA')throw new Error(`GAME_SOURCE_PROVIDER_INVALID:${provider||'EMPTY'}`);
  if(codexGameSourceWrite!=='FORBIDDEN')throw new Error(`CODEX_GAME_SOURCE_WRITE_FORBIDDEN:${codexGameSourceWrite||'EMPTY'}`);
  if(paidOpenAiAllowed!=='false')throw new Error(`OPENAI_PAID_API_GAME_SOURCE_FORBIDDEN:${paidOpenAiAllowed||'EMPTY'}`);
  return{
    owner,
    provider,
    model:DEFAULT_MODEL,
    codexRole:'SYSTEM_TOOLING_CI_TEST_INFRA_ONLY',
    codexGameSourceWrite:'FORBIDDEN',
    paidOpenAiApiAllowed:false,
    directMainWrite:false
  };
}
const DEFAULT_TIMEOUT_MS=Math.max(10000,Math.min(300000,Number(process.env.VIBE2_MODEL_TIMEOUT_MS||240000)));
const DEFAULT_MAX_PREDICT=Math.max(512,Math.min(4096,Number(process.env.VIBE2_MODEL_MAX_PREDICT||3072)));
const FULL_WEB_INITIAL_SEED_TARGET_MIN_BYTES=4200;
const FULL_WEB_INITIAL_SEED_TARGET_MAX_BYTES=6500;
const FULL_WEB_TIMEOUT_MS=360000;
const FULL_WEB_MAX_PREDICT=4096;
const FULL_WEB_RETRY_TIMEOUT_MS=360000;
const FULL_WEB_RETRY_MAX_PREDICT=6144;
const FULL_WEB_FINAL_RETRY_TIMEOUT_MS=300000;
const FULL_WEB_FINAL_RETRY_MAX_PREDICT=6144;
const FULL_WEB_EXPANSION_TIMEOUT_MS=240000;
const FULL_WEB_EXPANSION_MAX_PREDICT=4096;
const FULL_WEB_EXPANSION_CONTEXT_WINDOW=24576;
const FULL_WEB_MAX_GENERATION_ATTEMPTS=4;
const FULL_WEB_MAX_ADDITIVE_ATTEMPTS=6;
const SPECULATIVE_FULL_WEB_MAX_ADDITIVE_ATTEMPTS=4;
const FULL_WEB_PROGRESSIVE_ADDITIVE_ATTEMPT_CAP=8;
const JSON_RETRY_TIMEOUT_MS=240000;
const JSON_RETRY_MAX_PREDICT=3072;
const FOCUSED_WEB_REPAIR_MAX_PREDICT=1024;
const FOCUSED_WEB_REPAIR_CONTEXT_FILES=2;
const FOCUSED_WEB_REPAIR_CONTEXT_BYTES=28000;
const FOCUSED_WEB_REPAIR_CONTEXT_WINDOW=12288;
const JSON_FINAL_RETRY_TIMEOUT_MS=150000;
const JSON_FINAL_RETRY_MAX_PREDICT=768;
const JSON_FOCUSED_REPLACE_MAX_PREDICT=768;
const JSON_FOCUSED_REPLACE_TIMEOUT_MS=150000;
const JSON_CONTEXT_WINDOW=16384;
const JSON_FINAL_CONTEXT_WINDOW=16384;
const JSON_FOCUSED_REPLACE_CONTEXT_WINDOW=8192;
const FULL_WEB_CONTEXT_WINDOW=32768;
const MAX_GENERATION_ATTEMPTS=4;
const SPECULATIVE_FULL_WEB_MAX_GENERATION_ATTEMPTS=3;
const SPECULATIVE_JSON_MAX_GENERATION_ATTEMPTS=2;
const ROBLOX_FULL_GRAPHICS_PACKAGE_TRIGGERS=new Set([
  'TIMEOUT','EDIT_MATCH','PRESENTATION_PATCH_DELTA','ROBLOX_VISUAL_DOMAINS','ROBLOX_VISUAL_MOTION'
]);
const ROBLOX_FULL_GRAPHICS_PACKAGE_FAILURES=new Set([
  ...ROBLOX_FULL_GRAPHICS_PACKAGE_TRIGGERS,
  'NO_OP','INVALID_PATH','MALFORMED_OUTPUT','SEMANTIC_DIFF_BUDGET','STUDIO_QUALITY_DELTA'
]);
const FULL_FILE_PREFIX='VIBE2_FULL_FILE';
const FULL_FILE_CONTENT_MARKER='---VIBE2_FILE_CONTENT---';
const FULL_FILE_END_MARKER='---VIBE2_FILE_END---';
const FULL_WEB_EXPANSION_PREFIX='VIBE2_WEB_EXPANSION';
const FULL_WEB_EXPANSION_CONTENT_MARKER='---VIBE2_EXPANSION_CONTENT---';
const FULL_WEB_EXPANSION_END_MARKER='---VIBE2_EXPANSION_END---';

const TARGET_EXTENSIONS=Object.freeze({
  roblox:new Set(['.luau','.lua','.json']),
  web:new Set(['.html','.htm','.css','.js','.mjs','.cjs','.json','.svg']),
  unity:new Set(['.cs','.asmdef','.json','.uxml','.uss','.unity','.prefab','.asset']),
  unreal:new Set(['.h','.hpp','.cpp','.cc','.cxx','.cs','.ini','.uproject','.uplugin','.json']),
  godot:new Set(['.gd','.tscn','.tres','.godot','.cfg','.json']),
  system:new Set(['.js','.mjs','.cjs','.json','.yml','.yaml','.md'])
});
const BINARY_EXTENSIONS=new Set(['.rbxl','.rbxlx','.uasset','.umap','.controller','.anim','.avatar','.fbx','.blend','.png','.jpg','.jpeg','.webp','.wav','.mp3','.ogg']);
const PLACEHOLDER_PATHS=new Set(['relative/to/source/root','relative/path','path/to/file','relative/to/file','exact allowed path','allowed edit path']);

function readJson(file,fallback=null){if(!file||!fs.existsSync(file))return fallback;return JSON.parse(fs.readFileSync(file,'utf8'));}
function writeJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,`${JSON.stringify(value,null,2)}\n`,'utf8');}
function parseArgs(argv=process.argv.slice(2)){const args={};for(const raw of argv){if(!raw.startsWith('--'))continue;const body=raw.slice(2),at=body.indexOf('=');if(at<0)args[body]=true;else args[body.slice(0,at)]=body.slice(at+1);}return args;}
function targetExtensions(target){const x=TARGET_EXTENSIONS[clean(target).toLowerCase()];if(!x)throw new Error(`지원하지 않는 Vibe2 source target: ${target}`);return x;}
function sourcePrefix(target){if(target==='roblox')return'roblox-games/';if(target==='web')return'web-games/';if(target==='unity')return'unity-games/';if(target==='unreal')return'unreal-games/';if(target==='godot')return'godot-games/';return'';}
function assertSourceRoot(root,target){const normalized=posix(root);if(target==='system'){if(normalized!=='.')throw new Error(`system source root must be repo root: ${root}`);return normalized;}const prefix=sourcePrefix(target);if(!prefix||!normalized.startsWith(prefix)||normalized.includes('..'))throw new Error(`허용되지 않은 source root: ${root}`);if(target==='web'&&normalized.split('/').length!==2)throw new Error(`기존 웹게임 루트만 허용: ${root}`);return normalized;}
function assertRelativeSourcePath(relative,target){const normalized=posix(relative);if(!normalized||normalized.startsWith('/')||normalized.split('/').includes('..'))throw new Error(`잘못된 상대 경로: ${relative}`);if(target==='system'&&!isAllowedSystemArchitecturePath(normalized))throw new Error(`system architecture 허용 경로 아님: ${relative}`);const ext=path.extname(normalized).toLowerCase();if(BINARY_EXTENSIONS.has(ext))throw new Error(`엔진 에디터 필요 바이너리 파일: ${relative}`);if(!targetExtensions(target).has(ext))throw new Error(`텍스트 worker 허용 확장자 아님: ${relative}`);return normalized;}
function normalizeResponsibleFiles(order,root,target){return(order?.source?.responsibleFiles||[]).map(value=>{const normalized=posix(value);const relative=normalized.startsWith(`${root}/`)?normalized.slice(root.length+1):normalized;return assertRelativeSourcePath(relative,target);}).filter(Boolean);}
function sourceRootBootstrapAllowed(order,target,root,responsibleFiles){
  const evidence=new Set((order?.selectedTask?.evidence||[]).map(clean));
  if(order?.workerPolicy?.sourceRootBootstrapAllowed!==true||!evidence.has('source-root-bootstrap-required'))return false;
  if(target==='web'){
    return responsibleFiles.length===1
      &&responsibleFiles[0]==='index.html'
      &&/^web-games\/[a-zA-Z0-9._-]+$/.test(root);
  }
  if(target==='unity'){
    const files=new Set(responsibleFiles);
    return evidence.has('unity-web-source-root-bootstrap-required')
      &&/^unity-games\/[a-zA-Z0-9._-]+$/.test(root)
      &&responsibleFiles.length===2
      &&files.has('Assets/Scripts/GameCore.cs')
      &&files.has('Assets/Scripts/RuntimeBootstrap.cs');
  }
  return false;
}
function normalizeModelPath(value,{target,responsibleFiles=[],sourceRootRelative=''}={}){let normalized=posix(value);if(normalized.startsWith(`${sourceRootRelative}/`))normalized=normalized.slice(sourceRootRelative.length+1);if(PLACEHOLDER_PATHS.has(normalized.toLowerCase())){if(responsibleFiles.length!==1)throw new Error(`모델 예시 경로를 실제 파일로 결정할 수 없음: ${value}`);normalized=responsibleFiles[0];}normalized=assertRelativeSourcePath(normalized,target);if(responsibleFiles.length&&!responsibleFiles.includes(normalized))throw new Error(`책임 파일 범위 밖 수정 금지: ${normalized}`);return normalized;}
function listContextFiles(root,target,ignored=[]){const ignore=ignored.map(posix).filter(Boolean),rows=[];const walk=current=>{if(rows.length>=MAX_CONTEXT_FILES)return;for(const entry of fs.readdirSync(current,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){if(rows.length>=MAX_CONTEXT_FILES)return;if(['.git','node_modules','Library','Temp','Logs','Binaries','Intermediate','Saved','DerivedDataCache'].includes(entry.name))continue;const full=path.join(current,entry.name),relative=posix(path.relative(root,full));if(ignore.some(v=>relative===v||relative.startsWith(`${v}/`)))continue;if(entry.isDirectory())walk(full);else{const ext=path.extname(entry.name).toLowerCase();if(targetExtensions(target).has(ext)&&!BINARY_EXTENSIONS.has(ext))rows.push({full,relative});}}};walk(root);return rows;}
function readContext(root,target,responsibleFiles=[],ignored=[],explorationFiles=[],{maxFiles=MAX_CONTEXT_FILES,maxBytes=MAX_CONTEXT_BYTES}={}){
  const fileLimit=Math.max(1,Math.min(MAX_CONTEXT_FILES,Number(maxFiles)||MAX_CONTEXT_FILES));
  const byteLimit=Math.max(12000,Math.min(MAX_CONTEXT_BYTES,Number(maxBytes)||MAX_CONTEXT_BYTES));
  const safeExplorationFiles=target==='system'
    ?explorationFiles.map(posix).filter(isAllowedSystemArchitecturePath)
    :explorationFiles;
  const preferred=unique([...responsibleFiles,...safeExplorationFiles]).slice(0,fileLimit);
  const rows=(preferred.length?preferred.map(relative=>({full:path.join(root,relative),relative})):listContextFiles(root,target,ignored)).slice(0,fileLimit);
  const files=[];
  let total=0;
  const perFileBudget=Math.max(9000,Math.floor(byteLimit/Math.max(1,rows.length)));
  const excerptChunk=Math.max(3000,Math.floor(perFileBudget/3));
  for(const row of rows){
    const relative=assertRelativeSourcePath(row.relative,target);
    if(!fs.existsSync(row.full)||!fs.statSync(row.full).isFile())continue;
    const excerpt=boundedLargeExcerpt(fs.readFileSync(row.full,'utf8'),excerptChunk);
    let content=excerpt.content,remaining=byteLimit-total;
    if(remaining<=0)break;
    while(Buffer.byteLength(content,'utf8')>remaining&&content.length>100)content=content.slice(0,Math.floor(content.length*.8));
    if(!content)continue;
    files.push({path:relative,content,truncated:excerpt.truncated||content.length<excerpt.content.length,editable:responsibleFiles.includes(relative)});
    total+=Buffer.byteLength(content,'utf8');
  }
  return{files,bytes:total};
}
function regexEscape(value){const specials='\\^$.*+?()[]{}|';return [...String(value??'')].map(ch=>specials.includes(ch)?'\\'+ch:ch).join('');}
function sourceWindowRange(text,index,{before=900,after=4200}={}){
  const raw=String(text??'');
  let start=Math.max(0,index-before),end=Math.min(raw.length,index+after);
  const lineStart=raw.lastIndexOf('\n',start);
  if(lineStart>=0)start=lineStart+1;
  const lineEnd=raw.indexOf('\n',end);
  if(lineEnd>=0)end=lineEnd;
  return{start,end};
}
function mergeSourceWindowRanges(ranges=[]){
  const rows=(ranges||[]).filter(row=>Number.isFinite(row?.start)&&Number.isFinite(row?.end)&&row.end>row.start).sort((a,b)=>a.start-b.start||a.end-b.end);
  const merged=[];
  for(const row of rows){
    const last=merged.at(-1);
    if(last&&row.start<=last.end+240){
      last.end=Math.max(last.end,row.end);
      last.labels=unique([...(last.labels||[]),...(row.labels||[])]);
    }else merged.push({start:row.start,end:row.end,labels:unique(row.labels||[])});
  }
  return merged;
}
function focusedSymbolContext(root,target,responsibleFiles=[],exploration={}){
  const contract=exploration?.editContract||{};
  const confidence=clean(contract.responsibilityConfidence).toUpperCase();
  const symbolCandidates=unique([
    ...(contract.primaryTargets||[]),
    ...(contract.responsibilityGraph?.relevantNodes||[]).map(row=>row?.name),
    ...(contract.allowedDependentSymbolsOrSystems||[])
  ]).filter(name=>/^[A-Za-z_$][\w$]{1,80}$/.test(name));
  if(!responsibleFiles.length||!symbolCandidates.length||!['HIGH','MEDIUM'].includes(confidence))return null;
  const files=[];
  let total=0,matchedSymbolCount=0;
  for(const relative of responsibleFiles){
    const full=path.join(root,relative);
    if(!fs.existsSync(full)||!fs.statSync(full).isFile())continue;
    const text=fs.readFileSync(full,'utf8');
    const ranges=[];
    const matched=new Set();
    for(const symbol of symbolCandidates.slice(0,16)){
      const re=new RegExp('\\b'+regexEscape(symbol)+'\\b','g');
      let match,count=0;
      while((match=re.exec(text))&&count<3){
        const range=sourceWindowRange(text,match.index);
        ranges.push({...range,labels:[symbol]});
        matched.add(symbol);
        count+=1;
      }
    }
    const preserveKeys=unique(contract.semanticDiffBudget?.saveKeysMustRemainCompatible||[]);
    for(const key of preserveKeys.slice(0,8)){
      const at=text.indexOf(key);
      if(at>=0)ranges.push({...sourceWindowRange(text,at,{before:650,after:1800}),labels:['SAVE_KEY:'+key]});
    }
    if(!ranges.length)continue;
    matchedSymbolCount+=matched.size;
    const merged=mergeSourceWindowRanges(ranges).slice(0,8);
    for(const row of merged){
      let content=text.slice(row.start,row.end);
      if(!content.trim())continue;
      const remaining=FOCUSED_WEB_REPAIR_CONTEXT_BYTES-total;
      if(remaining<=0)break;
      while(Buffer.byteLength(content,'utf8')>remaining&&content.length>240)content=content.slice(0,Math.floor(content.length*.82));
      if(!content.trim())continue;
      files.push({path:relative,content,truncated:true,editable:true,exactSourceWindow:true,windowLabel:(row.labels||[]).join('+')||'responsibility'});
      total+=Buffer.byteLength(content,'utf8');
      if(total>=FOCUSED_WEB_REPAIR_CONTEXT_BYTES)break;
    }
  }
  if(!files.length)return null;
  return{files,bytes:total,mode:'PRIMARY_SYMBOL_WINDOWS',focusedSymbolCount:matchedSymbolCount,exactSourceWindows:true,fullFileFallback:false};
}
function isFocusedWebRepair(order,target,responsibleFiles,allowFullRewrite){
  if(target!=='web'||allowFullRewrite||responsibleFiles.length!==1||!responsibleFiles[0].toLowerCase().endsWith('.html'))return false;
  const evidence=new Set((order?.selectedTask?.evidence||[]).map(clean));
  const goal=clean(order?.goal);
  return /\[WEB_REPAIR\]|VIBE_WEB_REPAIR|WEB_VIBE_REPAIR_REQUIRED|\[DIAGNOSTIC_BUNDLE\]/i.test(goal)
    || evidence.has('web-stage:WEB_REPAIR')
    || evidence.has('recovery-exact-stage:WEB_REPAIR')
    || evidence.has('company-runtime-state:WEB_VIBE_REPAIR_REQUIRED')
    || evidence.has('recovery-exact-stage:SOURCE_CANDIDATE_GENERATION');
}
function exactDiagnosticAnchor(source='',needle=''){
  const text=String(source??''),target=String(needle??'');
  if(!target)return'';
  const at=text.indexOf(target);
  if(at<0)return'';
  let start=text.lastIndexOf('\n',at)+1,end=text.indexOf('\n',at);
  if(end<0)end=text.length;
  const line=text.slice(start,end);
  if(line.trim().length>=10&&line.length<=700&&text.split(line).length-1===1)return line;
  start=Math.max(0,Math.max(text.lastIndexOf(';',at-1)+1,text.lastIndexOf('}',at-1)+1,text.lastIndexOf('{',at-1)+1,at-180));
  const semicolon=text.indexOf(';',at+target.length),brace=text.indexOf('}',at+target.length),newline=text.indexOf('\n',at+target.length);
  const candidates=[semicolon>=0?semicolon+1:-1,brace>=0?brace+1:-1,newline>=0?newline:-1,Math.min(text.length,at+target.length+420)].filter(value=>value>at);
  end=Math.min(...candidates);
  let snippet=text.slice(start,end).trim();
  if(snippet.length>700)snippet=snippet.slice(0,700).trim();
  if(snippet.length<10||text.split(snippet).length-1!==1)return'';
  return snippet;
}
function interactiveCssDiagnosticAnchor(source=''){
  const text=String(source??''),styleStart=text.indexOf('<style'),styleOpenEnd=styleStart>=0?text.indexOf('>',styleStart):-1,styleEnd=styleOpenEnd>=0?text.indexOf('</style>',styleOpenEnd):-1;
  if(styleOpenEnd<0||styleEnd<0)return'';
  const style=text.slice(styleOpenEnd+1,styleEnd);
  const rows=[];
  for(const match of style.matchAll(/([^{}]{1,220}\{[^{}]{1,650}\})/g)){
    const rule=match[0].trim(),selector=rule.slice(0,rule.indexOf('{')).trim();
    if(!rule||/@(?:keyframes|font-face)/i.test(selector)||/touch-action\s*:/i.test(rule))continue;
    let score=0;
    if(/button|canvas|\.scope-action|\.session-phase|\.controls?\b|\.game\b|\.arena\b/i.test(selector))score+=8;
    if(/button|canvas/i.test(selector))score+=3;
    if(rule.length>=20&&rule.length<=420)score+=2;
    if(text.split(rule).length-1===1)rows.push({rule,score});
  }
  return rows.sort((a,b)=>b.score-a.score||a.rule.length-b.rule.length)[0]?.rule||'';
}
export function diagnosticFocusedReplaceOnlySpec({exploration={},sourceRoot='',responsibleFiles=[]}={}){
  const replay=exploration?.editContract?.causalReplay||{};
  if(replay.executable!==true||clean(replay.mode).toUpperCase()!=='DIAGNOSTIC_RESCAN')return null;
  const exactResponsible=unique(responsibleFiles);
  const diagnosticFile=posix(replay.diagnosticFile);
  if(exactResponsible.length!==1||!diagnosticFile||!exactResponsible.includes(diagnosticFile)||!clean(sourceRoot))return null;
  try{
    const root=path.resolve(sourceRoot),file=path.resolve(root,diagnosticFile);
    if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())return null;
    const source=fs.readFileSync(file,'utf8'),type=clean(replay.diagnosticType).toUpperCase(),needle=clean(replay.diagnosticNeedle);
    let find='';
    if(type==='TOUCH_ACTION_UNSPECIFIED')find=interactiveCssDiagnosticAnchor(source);
    if(!find&&needle&&source.includes(needle))find=exactDiagnosticAnchor(source,needle);
    if(!find&&type==='INTERVAL_CLEANUP_RISK'&&source.includes('setInterval('))find=exactDiagnosticAnchor(source,'setInterval(');
    if(!find&&type==='TOUCH_ACTION_UNSPECIFIED'&&source.split('<style>').length-1===1)find='<style>';
    if(!find||source.split(find).length-1!==1)return null;
    const at=source.indexOf(find),radius=1800,context=source.slice(Math.max(0,at-radius),Math.min(source.length,at+find.length+radius)).trim();
    return{
      path:diagnosticFile,find,context,
      diagnosticType:type,
      diagnosticLine:replay.diagnosticLine??null,
      diagnosticNeedle:needle||null,
      diagnosticMicroTask:clean(replay.diagnosticMicroTask)||null
    };
  }catch{return null;}
}
export function deterministicDiagnosticCandidate({exploration={},sourceRoot='',responsibleFiles=[]}={}){
  const spec=diagnosticFocusedReplaceOnlySpec({exploration,sourceRoot,responsibleFiles});
  if(!spec)return null;
  let replace='';
  if(spec.diagnosticType==='DOM_NULL_EVENT_BIND'){
    const unsafe=/(document\.getElementById\s*\([^\n;]+\))\s*\.addEventListener\s*\(/;
    if(!unsafe.test(spec.find))return null;
    replace=spec.find.replace(unsafe,(_match,call)=>call+'?.addEventListener(');
  }else if(spec.diagnosticType==='INTERVAL_CLEANUP_RISK'){
    if(/\bclearInterval\s*\(/.test(spec.find))return null;
    const timerAssign=/([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\s*=\s*setInterval\s*\(/;
    const match=timerAssign.exec(spec.find);
    if(!match)return null;
    const timer=match[1];
    const cleanup="window.addEventListener('pagehide',()=>{if("+timer+"){clearInterval("+timer+");"+timer+"=null;}},{once:true}); ";
    replace=spec.find.replace(timerAssign,value=>cleanup+value);
  }else if(spec.diagnosticType==='TOUCH_ACTION_UNSPECIFIED'){
    if(/touch-action\s*:/i.test(spec.find))return null;
    if(spec.find==='<style>')replace='<style>\nbutton,[data-gameplay-action]{touch-action:manipulation;}';
    else{
      const close=spec.find.lastIndexOf('}');
      if(close<0)return null;
      const head=spec.find.slice(0,close).replace(/\s*$/,'');
      replace=head+(/;\s*$/.test(head)?'':';')+'touch-action:manipulation;'+spec.find.slice(close);
    }
  }else return null;
  if(!replace||replace===spec.find)return null;
  return{summary:'Vibe2 deterministic diagnostic repair',expectedEffect:'eliminate reproduced '+spec.diagnosticType+' before model generation',edits:[{path:spec.path,find:spec.find,replace}],newFiles:[],replaceFiles:[],tests:[],deterministicDiagnosticType:spec.diagnosticType};
}
export function buildDiagnosticFocusedReplaceOnlyPrompt(prompt,{exploration={},sourceRoot='',responsibleFiles=[],error=null}={}){
  const spec=diagnosticFocusedReplaceOnlySpec({exploration,sourceRoot,responsibleFiles});
  if(!spec)return null;
  const raw=String(prompt??''),goal=raw.split('\n').find(line=>line.startsWith('Goal:'))||'Goal: repair the reproduced diagnostic';
  const reason=clean(error?.message||error).replace(/\s+/g,' ').slice(0,240);
  const hardRule=spec.diagnosticType==='INTERVAL_CLEANUP_RISK'
    ?'HARD POSTCONDITION: replacement source must add a real clearInterval(...) lifecycle path so the exact INTERVAL_CLEANUP_RISK rescan is absent. Do not merely rename or move setInterval.'
    :spec.diagnosticType==='TOUCH_ACTION_UNSPECIFIED'
      ?'HARD POSTCONDITION: replacement source must add a real touch-action: CSS declaration to the actual interactive control/arena selector while preserving intended page scrolling. Do not satisfy this with a comment or data attribute.'
      :spec.diagnosticType==='DOM_NULL_EVENT_BIND'
        ?'HARD POSTCONDITION: directly repair the reproduced document.getElementById(...).addEventListener(...) chain. Preserve the event behavior but add a real null-safe guard or optional chaining so the unsafe direct chain is absent.'
        :'HARD POSTCONDITION: the replacement must directly eliminate the reproduced diagnostic target before any unrelated improvement.';
  return{
    spec,
    prompt:[
      'You are the Vibe2 causal diagnostic source repair worker. Return JSON only.',
      goal,
      `Reproduced diagnostic: ${spec.diagnosticType}:${spec.path}; line=${spec.diagnosticLine??'UNKNOWN'}; needle=${spec.diagnosticNeedle||'UNKNOWN'}`,
      spec.diagnosticMicroTask?`Required repair: ${spec.diagnosticMicroTask}`:'',
      hardRule,
      reason?'Previous failure: '+reason:'',
      'Exact writable path: '+JSON.stringify(spec.path),
      'Exact find anchor already fixed by the worker: '+JSON.stringify(spec.find),
      'Do NOT return path or find. The worker will apply them exactly.',
      'Return exactly one JSON object with exactly one key named "replace".',
      'The replace value MUST contain the actual replacement source snippet; never output a template token or placeholder.',
      'replace must be the smallest syntactically valid coherent source replacement that satisfies the diagnostic postcondition and preserves unrelated behavior.',
      'No markdown, prose, placeholders, ellipsis, or extra keys.',
      'SOURCE CONTEXT AROUND DIAGNOSTIC ANCHOR:',
      spec.context
    ].filter(Boolean).join('\n')
  };
}
export function evaluateDiagnosticPostcondition({candidate={},exploration={}}={}){
  const replay=exploration?.editContract?.causalReplay||{};
  if(replay.executable!==true||clean(replay.mode).toUpperCase()!=='DIAGNOSTIC_RESCAN')return{required:false,pass:true,type:null,file:null,reason:null};
  const type=clean(replay.diagnosticType).toUpperCase(),file=posix(replay.diagnosticFile);
  const targetEdits=(candidate.edits||[]).filter(row=>posix(row?.path)===file);
  const changed=[
    ...targetEdits.map(row=>String(row?.replace??'')),
    ...(candidate.newFiles||[]).filter(row=>posix(row?.path)===file).map(row=>String(row?.content??'')),
    ...(candidate.replaceFiles||[]).filter(row=>posix(row?.path)===file).map(row=>String(row?.content??''))
  ].join('\n');
  let pass=Boolean(changed.trim()),reason=pass?null:'DIAGNOSTIC_FILE_NOT_CHANGED';
  if(pass&&type==='INTERVAL_CLEANUP_RISK'&&!/\bclearInterval\s*\(/.test(changed)){pass=false;reason='CLEAR_INTERVAL_LIFECYCLE_MISSING';}
  if(pass&&type==='TOUCH_ACTION_UNSPECIFIED'&&!/touch-action\s*:/i.test(changed)){pass=false;reason='TOUCH_ACTION_POLICY_MISSING';}
  if(pass&&type==='DOM_NULL_EVENT_BIND'){
    const unsafe=/document\.getElementById\s*\([^\n;]+\)\s*\.addEventListener\s*\(/;
    const targeted=targetEdits.some(row=>unsafe.test(String(row?.find??''))||clean(replay.diagnosticNeedle)&&String(row?.find??'').includes(clean(replay.diagnosticNeedle)));
    if(!targeted){pass=false;reason='DOM_NULL_EVENT_BIND_TARGET_NOT_REPAIRED';}
    else if(unsafe.test(changed)){pass=false;reason='DOM_NULL_EVENT_BIND_STILL_UNSAFE';}
    else if(!/\baddEventListener\s*\(/.test(changed)){pass=false;reason='DOM_EVENT_BEHAVIOR_NOT_PRESERVED';}
  }
  return{required:true,pass,type,file,reason,needle:clean(replay.diagnosticNeedle)||null,authorityExpanded:false};
}

function extractJson(raw){const text=clean(raw).replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/i,'').trim();try{return JSON.parse(text);}catch{}const starts=['{','['].map(c=>text.indexOf(c)).filter(i=>i>=0);if(!starts.length)throw new Error('모델 JSON 시작을 찾지 못함');const start=Math.min(...starts),opening=text[start],closing=opening==='{'?'}':']';let depth=0,quoted=false,escape=false;for(let i=start;i<text.length;i++){const ch=text[i];if(quoted){if(escape)escape=false;else if(ch==='\\')escape=true;else if(ch==='"')quoted=false;continue;}if(ch==='"'){quoted=true;continue;}if(ch===opening)depth++;else if(ch===closing&&--depth===0)return JSON.parse(text.slice(start,i+1));}throw new Error('모델 JSON 파싱 실패');}
export function recoverPartialJsonEdit(raw,{reason='timeout'}={}){
  const text=String(raw??'');
  const match=/"edits"\s*:\s*\[/.exec(text);
  if(!match)return null;
  const start=text.indexOf('{',match.index+match[0].length);
  if(start<0)return null;
  let depth=0,quoted=false,escape=false;
  for(let i=start;i<text.length;i++){
    const ch=text[i];
    if(quoted){
      if(escape)escape=false;
      else if(ch==='\\')escape=true;
      else if(ch==='"')quoted=false;
      continue;
    }
    if(ch==='"'){quoted=true;continue;}
    if(ch==='{')depth++;
    else if(ch==='}'&&--depth===0){
      try{
        const edit=JSON.parse(text.slice(start,i+1));
        if(!edit||typeof edit!=='object'||Array.isArray(edit))return null;
        const recoveryReason=clean(reason).toLowerCase()==='malformed'?'malformed':'timeout';
        return{
          summary:`Vibe2 recovered partial ${recoveryReason} edit`,
          expectedEffect:`recovered complete edit from bounded ${recoveryReason} output`,
          edits:[edit],
          newFiles:[],
          replaceFiles:[],
          tests:[]
        };
      }catch{return null;}
    }
  }
  return null;
}
function fullWebRewriteAllowed(order,target,exploration={}){
  if(target!=='web')return false;
  const goal=clean(order?.goal);
  if(/\[DIAGNOSTIC_BUNDLE\]/i.test(goal))return false;
  const assessment=exploration?.existingWebAssessment;
  const strategy=clean(assessment?.strategy).toUpperCase();
  if(strategy)return strategy==='FULL_REBUILD';
  return order?.workerPolicy?.fullFileRewriteAllowed===true||/FULL_WEB_GAME_REBUILD|실제 웹게임|프로토타입.*웹게임/i.test(goal);
}
function parseDirectFullHtml(raw,{responsibleFiles=[]}={}){let text=String(raw??'').replaceAll('\r\n','\n').trim();if(/^\`\`\`(?:html)?\s*/i.test(text))text=text.replace(/^\`\`\`(?:html)?\s*/i,'').replace(/\s*\`\`\`$/,'').trim();if(responsibleFiles.length!==1)return null;if(!/^(?:<!doctype\s+html\b|<html\b)/i.test(text))return null;const htmlEnd=text.toLowerCase().lastIndexOf('</html>');if(htmlEnd<0||text.slice(htmlEnd+7).trim())return null;const content=text.slice(0,htmlEnd+7).trim();if(!content)return null;return{summary:'Vibe2 recovered direct full HTML candidate',expectedEffect:'playable Web source replacement',edits:[],newFiles:[],replaceFiles:[{path:responsibleFiles[0],content}],tests:[]};}
function parseFullFileEnvelope(raw){const text=String(raw??'').replaceAll('\r\n','\n'),trimmed=text.trimStart();if(!trimmed.startsWith(FULL_FILE_PREFIX))return null;const prefixOffset=text.indexOf(FULL_FILE_PREFIX),contentAt=text.indexOf(FULL_FILE_CONTENT_MARKER,prefixOffset+FULL_FILE_PREFIX.length);let endAt=text.indexOf(FULL_FILE_END_MARKER,contentAt+FULL_FILE_CONTENT_MARKER.length),recoveredHtmlEnd=false;if(contentAt>=0&&endAt<0){const htmlEnd=text.toLowerCase().lastIndexOf('</html>');if(htmlEnd>=contentAt&&!text.slice(htmlEnd+7).trim()){endAt=htmlEnd+7;recoveredHtmlEnd=true;}}if(contentAt<0||endAt<0)throw new Error('전체 파일 응답이 잘렸거나 종료 마커가 없음');const trailing=recoveredHtmlEnd?'':text.slice(endAt+FULL_FILE_END_MARKER.length).trim();if(trailing)throw new Error('전체 파일 종료 마커 뒤에 허용되지 않은 출력이 있음');const header=text.slice(prefixOffset,contentAt).trim().split('\n').map(line=>line.trim()).filter(Boolean);if(header.shift()!==FULL_FILE_PREFIX)throw new Error('전체 파일 응답 헤더 오류');const valueOf=key=>{const line=header.find(row=>row.startsWith(`${key}:`));return line?line.slice(key.length+1).trim():'';};const tests=header.filter(row=>row.startsWith('TEST:')).map(row=>row.slice(5).trim()).filter(Boolean);let content=text.slice(contentAt+FULL_FILE_CONTENT_MARKER.length,endAt);if(content.startsWith('\n'))content=content.slice(1);if(content.endsWith('\n'))content=content.slice(0,-1);if(!content.trim())throw new Error('전체 파일 응답 내용이 비어 있음');return{summary:valueOf('SUMMARY')||'Vibe2 full web source candidate',expectedEffect:valueOf('EXPECTED_EFFECT'),edits:[],newFiles:[],replaceFiles:[{path:valueOf('PATH'),content}],tests};}
function parseFullWebExpansion(raw){
  const text=String(raw??'').replaceAll('\r\n','\n'),trimmed=text.trimStart();
  if(!trimmed.startsWith(FULL_WEB_EXPANSION_PREFIX))return null;
  const prefixOffset=text.indexOf(FULL_WEB_EXPANSION_PREFIX),contentAt=text.indexOf(FULL_WEB_EXPANSION_CONTENT_MARKER,prefixOffset+FULL_WEB_EXPANSION_PREFIX.length),endAt=text.indexOf(FULL_WEB_EXPANSION_END_MARKER,contentAt+FULL_WEB_EXPANSION_CONTENT_MARKER.length);
  if(contentAt<0||endAt<0)throw new Error('Web expansion 응답이 잘렸거나 종료 마커가 없음');
  if(text.slice(endAt+FULL_WEB_EXPANSION_END_MARKER.length).trim())throw new Error('Web expansion 종료 마커 뒤에 허용되지 않은 출력이 있음');
  let content=text.slice(contentAt+FULL_WEB_EXPANSION_CONTENT_MARKER.length,endAt);
  if(content.startsWith('\n'))content=content.slice(1);
  if(content.endsWith('\n'))content=content.slice(0,-1);
  if(!content.trim())throw new Error('Web expansion 내용이 비어 있음');
  if(/<\/?(?:html|body)\b/i.test(content))throw new Error('Web expansion은 html/body 전체 구조를 재정의할 수 없음');
  return content.trim();
}
function parseLooseFullWebExpansion(raw){
  let text=String(raw??'').replaceAll('\r\n','\n').trim();
  if(/^```(?:html|javascript|js)?\s*/i.test(text))text=text.replace(/^```(?:html|javascript|js)?\s*/i,'').replace(/\s*```$/,'').trim();
  const bytes=Buffer.byteLength(text,'utf8');
  if(bytes<240||bytes>16000)return null;
  if(!text.startsWith('<'))return null;
  if(/<!doctype\b|<\/?(?:html|body)\b/i.test(text))return null;
  if(!/<(?:script|style|section|div|canvas|button|aside|nav|main)\b/i.test(text))return null;
  const openScript=(text.match(/<script\b/gi)||[]).length,closeScript=(text.match(/<\/script>/gi)||[]).length;
  const openStyle=(text.match(/<style\b/gi)||[]).length,closeStyle=(text.match(/<\/style>/gi)||[]).length;
  if(openScript!==closeScript||openStyle!==closeStyle)return null;
  if(/VIBE2_FULL_FILE|---VIBE2_FILE_CONTENT---/i.test(text))return null;
  return text;
}
function recoverFullWebSeed(raw,{target,responsibleFiles=[],sourceRootRelative=''}={}){
  try{
    const envelope=parseFullFileEnvelope(raw),direct=!envelope?parseDirectFullHtml(raw,{responsibleFiles}):null,parsed=envelope||direct;
    if(!parsed||!Array.isArray(parsed.replaceFiles)||parsed.replaceFiles.length!==1)return null;
    const file=parsed.replaceFiles[0],relative=normalizeModelPath(file?.path||responsibleFiles[0],{target,responsibleFiles,sourceRootRelative}),content=String(file?.content??'').trim();
    if(!content||!/<\/html>\s*$/i.test(content))return null;
    return{path:relative,content,summary:clean(parsed.summary)||'Vibe2 full Web seed',expectedEffect:clean(parsed.expectedEffect),tests:(parsed.tests||[]).map(clean).filter(Boolean).slice(0,8)};
  }catch{return null;}
}
function recoverFullWebExpansionDocumentSeed(raw,{target,responsibleFiles=[],sourceRootRelative=''}={}){
  try{
    const text=String(raw??'').replaceAll('\r\n','\n'),prefixAt=text.indexOf(FULL_WEB_EXPANSION_PREFIX);
    if(prefixAt<0)return null;
    const contentAt=text.indexOf(FULL_WEB_EXPANSION_CONTENT_MARKER,prefixAt+FULL_WEB_EXPANSION_PREFIX.length);
    if(contentAt<0)return null;
    let endAt=text.indexOf(FULL_WEB_EXPANSION_END_MARKER,contentAt+FULL_WEB_EXPANSION_CONTENT_MARKER.length);
    if(endAt<0){
      const htmlEnd=text.toLowerCase().lastIndexOf('</html>');
      if(htmlEnd<contentAt)return null;
      endAt=htmlEnd+7;
    }
    let content=text.slice(contentAt+FULL_WEB_EXPANSION_CONTENT_MARKER.length,endAt).trim();
    if(/^```(?:html)?\s*/i.test(content))content=content.replace(/^```(?:html)?\s*/i,'').replace(/\s*```$/,'').trim();
    const direct=parseDirectFullHtml(content,{responsibleFiles});
    if(!direct||direct.replaceFiles.length!==1)return null;
    const file=direct.replaceFiles[0],relative=normalizeModelPath(file?.path||responsibleFiles[0],{target,responsibleFiles,sourceRootRelative});
    return{path:relative,content:String(file.content||'').trim(),summary:'Vibe2 recovered full document from expansion response',expectedEffect:'larger playable full-Web seed for staged expansion',tests:[]};
  }catch{return null;}
}
function insertFullWebExpansion(baseHtml,fragment){
  const base=String(baseHtml??''),addition=String(fragment??'').trim();
  if(!base||!addition)throw new Error('Web expansion 합성 입력이 비어 있음');
  if(/<\/?(?:html|body)\b/i.test(addition))throw new Error('Web expansion은 html/body 전체 구조를 재정의할 수 없음');
  const lower=base.toLowerCase(),bodyAt=lower.lastIndexOf('</body>'),htmlAt=lower.lastIndexOf('</html>'),at=bodyAt>=0?bodyAt:htmlAt;
  if(at<0)throw new Error('Web expansion 기준 종료 태그 없음');
  return base.slice(0,at)+'\n'+addition+'\n'+base.slice(at);
}
const FULL_WEB_STAGE_CAPABILITY_ORDER=Object.freeze([
  'REAL_INPUT','MUTABLE_GAME_STATE','UPDATE_OR_STATE_TRANSITION_LOOP','PROGRESSION_OR_RESOURCE_SYSTEM',
  'WIN_LOSS_OR_RESULT','RESTART_RESET','SAVE_COMPATIBILITY','MOBILE_RESPONSIVE_CONTROLS'
]);
function fullWebCapabilitySnapshot(source=''){
  const text=String(source??''),analysis=analyzeExistingGameSource(text),c=analysis.capabilities||{};
  const mutableGameState=/\b(?:let|var)\s+(?:state|gameState|player|enemy|score|hp|health|wave|stage|level|gold|coins|resources?)\b|\b(?:state|gameState|score|hp|health|wave|stage|level|gold|coins|resources?)\s*[+\-*/]?=/i.test(text);
  const restartReset=/\b(?:function\s+)?(?:restart|reset|retry|newGame|startOver)\b|data-action=["'](?:restart|reset|retry)["']/i.test(text);
  const progression=/\b(?:progress|upgrade|level|wave|stage|reward|unlock|quest|objective|xp|experience|gold|coin|resource)\b/i.test(text);
  const responsive=/@media\s*\([^)]*(?:max-width|pointer|hover)|touch-action\s*:|viewport-fit|100dvh|100svh/i.test(text);
  return{
    REAL_INPUT:c.realInput===true,
    MUTABLE_GAME_STATE:mutableGameState,
    UPDATE_OR_STATE_TRANSITION_LOOP:c.frameLoop===true||/\b(?:update|tick|step|loop|render)\s*\(/i.test(text),
    PROGRESSION_OR_RESOURCE_SYSTEM:c.economy===true||c.difficulty===true||progression,
    WIN_LOSS_OR_RESULT:c.winPath===true&&c.failPath===true,
    RESTART_RESET:restartReset,
    SAVE_COMPATIBILITY:c.saveState===true,
    MOBILE_RESPONSIVE_CONTROLS:c.touchInput===true&&responsive
  };
}
function fullWebExpansionStageTarget(source='',stage=1){
  const capabilities=fullWebCapabilitySnapshot(source);
  const missing=FULL_WEB_STAGE_CAPABILITY_ORDER.filter(name=>capabilities[name]!==true);
  const capability=missing[0]||`MEANINGFUL_GAMEPLAY_DEPTH_STAGE_${Math.max(1,Number(stage)||1)}`;
  const directives={
    REAL_INPUT:'Add real click/pointer/keyboard/touch input that reaches a core gameplay action and changes game state.',
    MUTABLE_GAME_STATE:'Add explicit mutable gameplay state owned by real systems; input and rules must materially change it.',
    UPDATE_OR_STATE_TRANSITION_LOOP:'Add a bounded update/render or equivalent state-transition loop that advances gameplay from current state.',
    PROGRESSION_OR_RESOURCE_SYSTEM:'Add real progression or resource gain/spend rules tied to gameplay outcomes, not decorative counters.',
    WIN_LOSS_OR_RESULT:'Add both reachable success and failure/result paths driven by game state, with observable outcomes.',
    RESTART_RESET:'Add a real restart/reset/retry path that restores a valid playable state without reloading validation scaffolding.',
    SAVE_COMPATIBILITY:'Add persistent-capable save/restore for meaningful progress using stable keys and safe defaults.',
    MOBILE_RESPONSIVE_CONTROLS:'Add touch/pointer gameplay controls plus responsive mobile layout/input semantics for narrow screens.'
  };
  return{capability,missing,present:FULL_WEB_STAGE_CAPABILITY_ORDER.filter(name=>capabilities[name]===true),directive:directives[capability]||'Add one new coherent gameplay dimension that changes decisions, state transitions, or outcomes. Do not duplicate an already-present capability.'};
}
function buildFullWebExpansionPrompt(basePrompt,seed,{stage=1,minBytes=FULL_WEB_GENERATION_TARGET_MIN_BYTES,maxBytes=FULL_WEB_GENERATION_TARGET_MAX_BYTES,remainingStages=1,previousFailure='',capabilityTarget=null}={}){
  const content=String(seed?.content??''),currentBytes=Buffer.byteLength(content,'utf8'),gap=Math.max(0,minBytes-currentBytes),stageByteTarget=Math.min(7000,Math.max(3200,Math.ceil(gap/Math.max(1,remainingStages))+800));
  const promptText=String(basePrompt??'');
  const line=(label)=>promptText.split('\n').find(row=>row.startsWith(label))||'';
  const prefix=[
    'You are the Vibe2 game source worker. Return one additive Web expansion only.',
    line('Engine:'),
    line('Goal:'),
    buildUpDirectiveBlockFromPrompt(promptText),
    line('Allowed edit paths:'),
    line('Full Web generation target after automatic expansion:')||line('Full Web generation target:'),
    'Preserve the exact responsible path and existing playable systems. Do not widen scope.'
  ].filter(Boolean).join('\n');
  return[
    prefix,
    '',
    'FULL WEB ADDITIVE EXPANSION MODE.',
    `Expansion stage: ${stage}. Current playable HTML: ${currentBytes} bytes. Final acceptance minimum: ${minBytes} bytes; preferred maximum: ${maxBytes} bytes.`,
    `Generate roughly ${stageByteTarget} bytes of NEW coherent gameplay source. This fragment will be inserted immediately before </body>.`,
    capabilityTarget?.capability?`THIS STAGE TARGET=${capabilityTarget.capability}`:'',
    capabilityTarget?.directive||'',
    capabilityTarget?.present?.length?`Already present capabilities (do not re-implement as the main goal): ${capabilityTarget.present.join(', ')}`:'',
    capabilityTarget?.missing?.length?`Still missing after this target: ${capabilityTarget.missing.filter(name=>name!==capabilityTarget.capability).join(', ')||'NONE'}`:'',
    previousFailure?`Previous expansion failure: ${clean(previousFailure).replace(/\s+/g,' ').slice(0,240)}. Do not repeat the same output.`:'',
    'If the envelope format is difficult, a raw closed HTML fragment is acceptable, but it MUST NOT contain html/body/doctype and every script/style tag must be closed.',
    'Return only one VIBE2_WEB_EXPANSION envelope. Do not return a complete HTML document or JSON.',
    'The fragment must add real gameplay systems, mechanics, state transitions, mobile pointer/touch interaction, progression, outcomes, save-compatible state, or game-specific spatial behavior required by the work order.',
    'Do not add filler text, validator-only labels, fake counters, test harness controls, monkey patches, function overrides, or duplicated whole-document markup.',
    'Do not emit <html>, </html>, <body>, or </body>. Prefer unique data attributes/classes. Any script must be directly integrated source and should use a scoped IIFE or unique names instead of overwriting existing functions.',
    `Minimum accepted fragment size: 800 UTF-8 bytes. Aim for roughly ${stageByteTarget} bytes; tiny template-like fragments will be rejected.`,
    'Required output framing:',
    'First line exactly: VIBE2_WEB_EXPANSION',
    'Second line exactly: ---VIBE2_EXPANSION_CONTENT---',
    'Then immediately emit the real additive HTML/CSS/JavaScript implementation. Do not copy an example, ellipsis, placeholder comment, or fake skeleton.',
    'Final line exactly: ---VIBE2_EXPANSION_END---',
    '',
    'CURRENT PLAYABLE HTML TO EXTEND:',
    content
  ].join('\n');
}
function recoverMissingEditPaths(raw,{responsibleFiles=[],sourceRoot=''}={}){
  let parsed=raw;
  if(typeof raw==='string'){
    try{parsed=extractJson(raw);}catch{return{value:raw,recovered:0};}
  }
  if(!parsed||typeof parsed!=='object'||Array.isArray(parsed)||!Array.isArray(parsed.edits))return{value:raw,recovered:0};
  const root=sourceRoot?path.resolve(sourceRoot):'';
  let recovered=0;
  const edits=parsed.edits.map(item=>{
    if(clean(item?.path))return item;
    const find=String(item?.find??'');
    if(!find)return item;
    let matches=[];
    if(responsibleFiles.length===1){
      matches=[responsibleFiles[0]];
    }else if(root){
      matches=responsibleFiles.filter(relative=>{
        try{
          const normalized=posix(relative);
          const full=path.resolve(root,normalized);
          if(!full.startsWith(root+path.sep)||!fs.existsSync(full)||!fs.statSync(full).isFile())return false;
          return fs.readFileSync(full,'utf8').includes(find);
        }catch{return false;}
      });
    }
    if(matches.length!==1)return item;
    recovered+=1;
    return{...item,path:matches[0]};
  });
  if(!recovered)return{value:raw,recovered:0};
  return{value:{...parsed,edits},recovered};
}

function normalizeCandidate(raw,{target,responsibleFiles,sourceRootRelative,allowFullRewrite=false,minFullRewriteBytes=MIN_FULL_REWRITE_BYTES}){const envelope=typeof raw==='string'&&allowFullRewrite?parseFullFileEnvelope(raw):null;const directHtml=typeof raw==='string'&&allowFullRewrite&&!envelope?parseDirectFullHtml(raw,{responsibleFiles}):null;const parsed=envelope||directHtml||(typeof raw==='string'?extractJson(raw):raw);if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error('모델 후보는 JSON 객체 또는 허용된 전체 파일 응답이어야 함');const edits=(Array.isArray(parsed.edits)?parsed.edits:[]).map(item=>({path:normalizeModelPath(item?.path,{target,responsibleFiles,sourceRootRelative}),find:String(item?.find??''),replace:String(item?.replace??'')}));for(const edit of edits){if(!edit.find)throw new Error(`edit find 비어 있음: ${edit.path}`);if(edit.find===edit.replace)throw new Error(`변경 없는 edit: ${edit.path}`);}const newFiles=(Array.isArray(parsed.newFiles)?parsed.newFiles:[]).map(item=>{if(responsibleFiles.length&&target!=='system')throw new Error('책임 파일이 지정된 작업은 새 파일 자동 생성 금지');const relative=normalizeModelPath(item?.path,{target,responsibleFiles:target==='system'?responsibleFiles:[],sourceRootRelative}),content=String(item?.content??'');if(!content||Buffer.byteLength(content,'utf8')>MAX_FILE_BYTES)throw new Error(`새 파일 크기 오류: ${relative}`);return{path:relative,content};});if(newFiles.length>MAX_NEW_FILES)throw new Error(`새 파일은 최대 ${MAX_NEW_FILES}개`);const requiredFullRewriteBytes=Math.max(MIN_FULL_REWRITE_BYTES,Math.min(MAX_FILE_BYTES,Number(minFullRewriteBytes)||MIN_FULL_REWRITE_BYTES));const replaceFiles=(Array.isArray(parsed.replaceFiles)?parsed.replaceFiles:[]).map(item=>{if(!allowFullRewrite)throw new Error('전체 파일 교체는 명시된 Web 재구축 작업에서만 허용');const relative=normalizeModelPath(item?.path,{target,responsibleFiles,sourceRootRelative}),content=String(item?.content??''),bytes=Buffer.byteLength(content,'utf8');if(!content||bytes<requiredFullRewriteBytes||bytes>MAX_FILE_BYTES)throw new Error(`전체 교체 파일 크기 오류: ${relative}:bytes=${bytes}:min=${requiredFullRewriteBytes}:max=${MAX_FILE_BYTES}`);return{path:relative,content};});const editPaths=new Set(edits.map(x=>x.path)),newPaths=new Set(newFiles.map(x=>x.path)),replacePaths=new Set(replaceFiles.map(x=>x.path));if(newPaths.size!==newFiles.length)throw new Error('같은 새 파일 중복 생성 금지');if(replacePaths.size!==replaceFiles.length)throw new Error('같은 전체 교체 파일 중복 금지');for(const file of editPaths)if(newPaths.has(file)||replacePaths.has(file))throw new Error('같은 파일에 edit와 new/replace 혼합 작업 금지');for(const file of newPaths)if(replacePaths.has(file))throw new Error('같은 파일에 new와 replace 혼합 작업 금지');const touched=[...editPaths,...newPaths,...replacePaths];const touchedCount=touched.length;if(!touchedCount)throw new Error('후보가 실제 source 변경을 생성하지 않음');if(touchedCount>MAX_CHANGED_FILES)throw new Error(`변경 파일 수가 최대 ${MAX_CHANGED_FILES}개를 초과함`);return{summary:clean(parsed.summary)||'Vibe2 source candidate',expectedEffect:clean(parsed.expectedEffect),edits,newFiles,replaceFiles,tests:(Array.isArray(parsed.tests)?parsed.tests:[]).map(clean).filter(Boolean).slice(0,12)};}

const PRESENTATION_PATCH_PATTERNS=Object.freeze({
  ASSET_ADAPTATION:/(?:drawImage|fillStyle|strokeStyle|background|gradient|border|shadow|filter|opacity|font|transform|sprite|texture|mesh|material|shader|lighting|light\b|Color3|BrickColor|SurfaceAppearance|MeshPart|SpecialMesh|ImageLabel|ImageButton|Instance\.new|GameObject(?:\.CreatePrimitive)?|MeshRenderer|SpriteRenderer|Renderer\b|CFrame|Vector3|\.Size\b|\.Position\b|localScale|localPosition)/i,
  LIVING_MOTION:/(?:idle|walk|run|motion|animation|animator|lerp|damp|spring|bob|sway|velocity|accel|decel|rotation|Quaternion|Motor6D|Bone|Transform)/i,
  ANIMATION_FEEL:/(?:attack|hit|death|impact|recoil|anticipat|recover|hit.?stop|smear|trail|animation|Animator|Motor6D)/i,
  VFX:/(?:vfx|effect|particle|ParticleEmitter|ParticleSystem|trail|Trail\b|beam|Beam\b|flash|shockwave|telegraph|spark|afterimage)/i,
  AUDIO_FEEL:/(?:AudioSource|AudioMixer|SoundService|Sound\b|AudioContext|WebAudio|bgm|music|sfx|ambient|volume|pitch)/i,
  CAMERA_LANGUAGE:/(?:camera|Camera\b|shake|zoom|follow|viewport|fieldOfView|CFrame|screenShake|cameraShake|lerp|damp)/i,
  POLISH_MOBILE:/(?:touch|pointer|joystick|safe.?area|mobile|viewport|devicePixelRatio|pool|cleanup|dispose|Destroy|Debris|requestAnimationFrame|RenderStepped|Update\s*\()/i
});
function presentationRelevantLines(text='',pattern=null){
  const re=pattern||/(?:render|visual|draw|animation|motion|vfx|effect|camera|audio|ui|material|texture|lighting|mobile|touch)/i;
  return String(text??'').split(/\r?\n/).map(line=>line.trim()).filter(line=>line&&re.test(line)).join('\n');
}
export function evaluatePresentationCandidateDelta({candidate={},sourceRoot='',contract={}}={}){
  if(contract?.required!==true)return{required:false,pass:true,presentationPass:null,changedVisualUnits:0,files:[],reason:'NOT_REQUIRED'};
  const presentationPass=clean(contract.pass).toUpperCase()||'ASSET_ADAPTATION';
  const pattern=PRESENTATION_PATCH_PATTERNS[presentationPass]||PRESENTATION_PATCH_PATTERNS.ASSET_ADAPTATION;
  const deltas=[];
  const inspect=(relative,before,after,kind)=>{
    const oldRelevant=presentationRelevantLines(before,pattern);
    const newRelevant=presentationRelevantLines(after,pattern);
    if(!newRelevant||oldRelevant===newRelevant)return;
    deltas.push({path:clean(relative),kind,oldRelevantBytes:Buffer.byteLength(oldRelevant,'utf8'),newRelevantBytes:Buffer.byteLength(newRelevant,'utf8')});
  };
  for(const edit of candidate?.edits||[])inspect(edit.path,edit.find,edit.replace,'edit');
  for(const file of candidate?.replaceFiles||[]){
    let before='';
    try{
      const absolute=path.join(sourceRoot,clean(file.path));
      if(fs.existsSync(absolute)&&fs.statSync(absolute).isFile())before=fs.readFileSync(absolute,'utf8');
    }catch{}
    inspect(file.path,before,file.content,'replace');
  }
  for(const file of candidate?.newFiles||[])inspect(file.path,'',file.content,'new');
  return{
    required:true,
    pass:deltas.length>0,
    presentationPass,
    changedVisualUnits:deltas.length,
    files:unique(deltas.map(row=>row.path)),
    deltas,
    reason:deltas.length?'PATCH_CONTAINS_RELEVANT_PRESENTATION_DELTA':'NO_RELEVANT_PRESENTATION_DELTA_IN_PATCH'
  };
}

export function evaluateStudioQualityCandidateDelta({candidate={},sourceRoot='',contract={}}={}){
  if(!contract||typeof contract!=='object')return{required:false,pass:true,phase:null,focusPillar:null,requiredSourceDeltaUnits:0,sourceDeltaUnits:0,requiredVisualUnits:0,visualUnits:0,reason:'NOT_REQUIRED'};
  const phase=clean(contract.phase).toUpperCase()||'BUILD_UP';
  const focusPillar=clean(contract.focusPillar).toUpperCase()||'STABILITY';
  const minConnected=Math.max(1,Math.floor(Number(contract?.requiredConnectedImprovements?.min||3)||3));
  const requiredSourceDeltaUnits=phase==='BUILD_UP'?minConnected:(contract.realSourceDeltaRequired===true?1:0);
  const requiredVisualUnits=focusPillar==='PRESENTATION'?2:0;
  const sourceRows=[];
  const visualRows=[];
  const visualPattern=/(?:drawImage|fillStyle|strokeStyle|background|gradient|border|shadow|filter|opacity|font|transform|sprite|texture|mesh|material|shader|lighting|light\b|Color3|BrickColor|SurfaceAppearance|MeshPart|SpecialMesh|ImageLabel|ImageButton|Instance\.new|GameObject(?:\.CreatePrimitive)?|MeshRenderer|SpriteRenderer|Renderer\b|CFrame|Vector3|\.Size\b|\.Position\b|localScale|localPosition|idle|walk|run|motion|animation|Animator|Motor6D|Bone|attack|hit|death|impact|recoil|trail|ParticleEmitter|ParticleSystem|Beam\b|AudioSource|SoundService|Sound\b|AudioContext|camera|Camera\b|shake|zoom|touch|pointer|joystick|safe.?area|mobile)/i;
  const inspect=(relative,before,after,kind)=>{
    const oldText=String(before??'');
    const newText=String(after??'');
    if(oldText===newText)return;
    sourceRows.push({path:clean(relative),kind});
    const oldRelevant=presentationRelevantLines(oldText,visualPattern);
    const newRelevant=presentationRelevantLines(newText,visualPattern);
    if(newRelevant&&oldRelevant!==newRelevant)visualRows.push({path:clean(relative),kind});
  };
  for(const edit of candidate?.edits||[])inspect(edit.path,edit.find,edit.replace,'edit');
  for(const file of candidate?.replaceFiles||[]){
    let before='';
    try{
      const absolute=path.join(sourceRoot,clean(file.path));
      if(fs.existsSync(absolute)&&fs.statSync(absolute).isFile())before=fs.readFileSync(absolute,'utf8');
    }catch{}
    inspect(file.path,before,file.content,'replace');
  }
  for(const file of candidate?.newFiles||[])inspect(file.path,'',file.content,'new');
  const sourceDeltaUnits=sourceRows.length;
  const visualUnits=visualRows.length;
  const sourcePass=sourceDeltaUnits>=requiredSourceDeltaUnits;
  const visualPass=visualUnits>=requiredVisualUnits;
  return{
    required:requiredSourceDeltaUnits>0||requiredVisualUnits>0,
    pass:sourcePass&&visualPass,
    phase,
    focusPillar,
    requiredSourceDeltaUnits,
    sourceDeltaUnits,
    requiredVisualUnits,
    visualUnits,
    files:unique(sourceRows.map(row=>row.path)),
    visualFiles:unique(visualRows.map(row=>row.path)),
    reason:!sourcePass?'INSUFFICIENT_CONNECTED_SOURCE_DELTAS':!visualPass?'INSUFFICIENT_PRESENTATION_DELTAS':'STUDIO_QUALITY_DELTA_PRESENT'
  };
}

function presentationWorkerGuidance(order = {}) {
  const contract=order?.presentationQuality||{};
  if(contract?.required!==true)return'';
  return [
    '[PRESENTATION IMPLEMENTATION PASS]',
    `pass=${clean(contract.pass)}`,
    `preserve=${(contract.preserve||[]).map(clean).filter(Boolean).join(',')}`,
    `required-static-checks=${(contract.staticChecks||[]).map(clean).filter(Boolean).join(',')}`,
    `required-runtime-checks=${(contract.runtimeChecks||[]).map(clean).filter(Boolean).join(',')}`,
    '기존 게임 로직을 재설계하지 말고 현재 렌더/애니메이션/오디오/카메라 책임 함수 안에서 직접 수정한다.',
    '표현 계층은 save key, 진행도, 데미지, 쿨다운, 이동 속도, 보상, 드랍률, authoritative hit timing을 임의 변경하지 않는다.',
    '새 wrapper/override/shadow pipeline으로 덮지 말고 기존 책임 시스템을 직접 정리한다.',
    'ASSET_ADAPTATION에서 Unity는 C# 기반 저폴리 조립 모델·재질·조명·VFX·모션/UI를, Roblox는 Luau 기반 조립 모델·Material/Color·Particle/Beam/Trail·모션/UI를 실제 게임 화면에 구현할 수 있다.',
    'Roblox ASSET_ADAPTATION은 캐릭터/적, 무기/장비, 환경/지형, 재질·색·스타일의 핵심 시각 도메인을 모두 실제 source delta로 구현해야 한다. 이들은 최소 필수 코어이며 총 시각 도메인 수의 상한이 아니다. UI/VFX/조명/소품/카메라 등 필요한 추가 도메인은 제한 없이 함께 개선할 수 있다.',
    'Roblox ASSET_ADAPTATION은 첫 후보부터 완성형 그래픽 edits[] 패키지로 생성한다. 서로 다른 exact anchor를 여러 개 사용해도 되며, 한 개 micro-patch로 축소하지 않는다. 각 replace는 기존 책임 함수 주변의 짧고 정확한 구현으로 유지하고 전체 파일급 거대 블록을 한 edit에 몰아넣지 않는다. 단일 edit를 쓸 수 있는 경우는 그 replace 하나가 모든 최소 필수 코어 도메인과 필수 모션을 실제 실행 코드로 함께 충족할 때뿐이다.',
    'Roblox ASSET_ADAPTATION의 모션은 필수다. TweenService, RenderStepped/Heartbeat, Animator/AnimationTrack, Motor6D/Bone과 CFrame/Transform/Position/Orientation 실제 변화 등 네이티브 모션 경로를 기존 visual owner에 적용해야 하며 정적 색상/UI 변경만으로 완료할 수 없다.',
    '단일 primitive, 이름만 바꾼 기본 Part/GameObject, 검증용 임시 도형은 최종 그래픽 완료로 인정하지 않는다. 여러 의미 있는 파트와 Style Lock을 사용해 게임 정체성이 보이는 결과를 만든다.',
    '하이엔드 기본값은 플레이어/적/NPC/무기/아이템/건축/지형/배경/식생/소품/UI/VFX까지 목적 있는 에셋을 실제 게임에 적용하는 것이다.',
    '그래픽 작업의 외부 단위는 GRAPHICS_PRODUCTION 하나다. 캐릭터/환경/애니메이션/VFX/조명/UI를 별도 최상위 그래픽 작업으로 분리하지 말고 내부 단계로 처리한 뒤 같은 루트로 fan-in 한다.',
    'vibe-art-pipeline.js가 그래픽 생산 단일 코디네이터이며 asset planner/visual autopilot/presentation director/visual quality gate는 독립 승인 권한 없는 내부 모듈이다.',
    'Art Bible과 Visual Target Frame을 기준으로 Hero 대상(플레이어, 주 보스/적, 시그니처 장비, 핵심 랜드마크/시작지역)을 먼저 고품질 기준점으로 만든다.',
    '배경은 빈 장식면이 아니다. 전경/중경/배경, 랜드마크, set dressing, 환경 스토리텔링, 이동/전투 가독성을 같은 Style Lock으로 구성한다.',
    '권리가 확인된 기존 에셋은 원본을 보존하고 derived 변형으로 파츠 재조합, 비율/실루엣/재질, 지역형/정예형/보스형, LOD 최적화까지 확장할 수 있다.',
    '서로 다른 에셋 팩을 원형 그대로 섞은 샘플/kitbash 느낌은 실패다. 재질·실루엣·조명·UI·VFX 언어를 하나의 게임으로 통일한다.',
    'Unity와 Roblox는 정체성은 공유하되 표현 자산을 플랫폼에 맞게 재가공한다. 한 플랫폼의 시각 구현을 다른 플랫폼에 억지 복사하지 않는다.',
    'FBX/PNG/WebP/OGG 등 실제 binary authoring이 필요한 경우 가짜 바이트나 텍스트 파일을 만들지 말고 검증된 기존 에셋 재사용 또는 AUTHORING_GENERATOR_REQUEST 경로를 사용한다.',
    'Web 오디오는 첫 사용자 입력 이후 활성화하고 mute/volume과 resume 중복재생 방지를 유지한다.',
    '모션·VFX·카메라는 모바일 터치와 위험 가독성을 방해하지 않는다.'
  ].join('\n');
}

function studioQualityWorkerGuidance(order = {}) {
  const contract=order?.selectedTask?.studioQualityEvolution||order?.workPackage?.sharedContext?.studioQualityEvolution||null;
  if(!contract||typeof contract!=='object')return'';
  const phase=clean(contract.phase).toUpperCase()||'BUILD_UP';
  const focus=clean(contract.focusPillar).toUpperCase()||'STABILITY';
  const connected=contract.requiredConnectedImprovements||{min:3,max:6};
  return [
    '[STUDIO QUALITY EVOLUTION]',
    `cycle=${Number(contract.cycle||0)||1}; phase=${phase}; focus=${focus}; baseline=${clean(contract.baselineId)||'CURRENT_VERIFIED_BASELINE'}`,
    '설계는 게임 의미와 금지선을 정하는 기준이지 구현 분량의 상한이 아니다.',
    phase==='BUILD_UP'
      ?`현재 책임 범위 안에서 서로 연결된 실질 개선을 최소 ${Number(connected.min||3)}개 이상 묶어 구현한다. 기능 완성도, 시스템 연결, 피드백, 연출, 오류 복구, 모바일 UX 중 관련된 축을 함께 끝낸다.`
      :phase==='OPTIMIZE'
        ?'새 규칙을 억지로 늘리지 말고 실제 병목, 중복 처리, 렌더/업데이트 비용, 입력 지연, 상태 불일치, UI 가독성, 코드 책임 혼선을 직접 줄인다.'
        :'재현된 오류와 실패 근거부터 원인 시스템에서 직접 수리하고 동일 실패를 다시 확인한 뒤 남는 범위에서 품질을 올린다.',
    focus==='PRESENTATION'
      ?'그래픽은 실제 화면 변화가 있어야 한다. 캐릭터/적 실루엣, 환경 깊이·랜드마크, 애니메이션 상태, 공격·피격·사망 반응, VFX, 조명, UI 계층, 카메라·오디오 타이밍 중 약한 요소를 최소 2개 이상 실제 렌더 책임 코드에서 함께 개선한다. 마커/상수/주석만 추가하는 작업은 실패다.'
      :'',
    '한 파일에 여러 독립적인 정확한 edit가 필요하면 여러 edits[] 항목을 사용할 수 있다. 관련 책임 파일 여러 개를 함께 수정해도 된다.',
    '새 핵심 규칙, 밸런스 수치, 경제/진행 의미, 세이브 스키마, 네트워크 권한은 승인 없이 바꾸지 않는다.',
    '작업 결과는 이전 verified baseline보다 최소 하나의 실제 품질 gap을 닫거나 체감 가능한 품질 축을 개선해야 한다. 단순 PASS나 코드 이동만으로 evolution 완료를 주장하지 않는다.'
  ].filter(Boolean).join('\n');
}

function gameSpecificBuildUpDirectiveGuidance(order = {}) {
  const d=order?.selectedTask?.buildUpDirective||order?.buildUpDirective||null;
  if(!d||typeof d!=='object'||!clean(d.directiveId))return'';
  const target=clean(order?.target).toUpperCase();
  const platformKey=target==='ROBLOX'?'ROBLOX':target==='UNITY'?(order?.selectedTask?.firstStageUnityWeb===true?'UNITY_WEB':'UNITY_APP'):target==='WEB'?'UNITY_WEB':'';
  const visual=Object.entries(d?.visualBuildUpDirective?.domains||{})
    .map(([domain,instruction])=>`${domain}=${clean(instruction)}`)
    .filter(Boolean);
  const priorityDomains=(d?.allDomainImplementationDirectives||[])
    .filter(row=>['FIX_NOW','BUILD_UP_NOW'].includes(clean(row?.priority).toUpperCase()))
    .slice(0,14)
    .map(row=>`${clean(row.domain)}[${clean(row.priority)}]=${clean(row.directive)}`)
    .filter(Boolean);
  const sourceAnchors=(d?.responsibleSystemsAndFiles?.sourceAnchors||[]).slice(0,8).map(row=>`${clean(row?.file)}:${Number(row?.line||0)||'?'} ${clean(row?.kind)||'SYMBOL'} ${clean(row?.symbol)||'UNKNOWN'} CURRENT=${clean(row?.currentBehavior||row?.context)||'UNKNOWN'} INTENDED=${clean(row?.intendedBehavior)||'FOLLOW_PRIMARY_GOAL'} ACCEPT=${clean(row?.observableAcceptance)||'REAL_SOURCE_AND_EFFECT_DELTA'}`).filter(Boolean);
  return[
    '[GAME SPECIFIC BUILD UP DIRECTIVE BEGIN]',
    `directiveId=${clean(d.directiveId)} generation=${Number(d.generation||0)} developmentDepth=${Number(d.developmentDepth||1)} escalationStage=${clean(d.escalationStage)} primaryFocus=${clean(d.primaryFocus)}`,
    `gameIdentity=${clean(d?.gameIdentityAndNonNegotiables?.identity)}`,
    `primaryGoal=${clean(d.thisLoopPrimaryGoal)}`,
    `whyNow=${clean(d.primaryGoalReason)}`,
    `sourceAnchors=${sourceAnchors.join(' | ')||'EXACT_SYMBOL_UNAVAILABLE_USE_RESPONSIBLE_FILE_AND_STATE_ANCHOR'}`,
    `expectedPlayerEffect=${clean(d?.effectivenessMeasurement?.expectedPlayerEffect)||'UNKNOWN'}`,
    `previousEffectiveness=${clean(d?.effectivenessMeasurement?.previousGeneration?.classification)||'NO_PREVIOUS_GENERATION'}`,
    `nextVibeAction=${clean(d?.nextActionDecision?.action)||'CONTINUE_BUILD_UP_CURRENT_SYSTEM'}`,
    `gameplay=${(d.gameplayImplementationDirectives||[]).map(clean).filter(Boolean).join(' | ')}`,
    `priorityDomains=${priorityDomains.join(' | ')}`,
    `progressionWorld=${(d.progressionContentWorldDirectives||[]).map(clean).filter(Boolean).join(' | ')}`,
    `visual=${visual.join(' | ')}`,
    `uxInput=${(d.uxInputDirectives||[]).map(clean).filter(Boolean).join(' | ')}`,
    platformKey&&d?.platformAdaptationDirectives?.[platformKey]?`platform=${clean(d.platformAdaptationDirectives[platformKey])}`:'',
    `preserve=${(d.preserveConstraints||[]).map(clean).filter(Boolean).join(' | ')}`,
    `acceptance=${(d.acceptanceEvidence||[]).map(clean).filter(Boolean).join(' | ')}`,
    'The first coherent edit should target one of the exact sourceAnchors when it is inside Allowed edit paths. Do not invent a wrapper or unrelated helper while the anchored responsibility remains unchanged.',
    'The implementation must pursue expectedPlayerEffect; a source delta by itself is not proof that the directive worked.',
    `nextEscalation=${(d.nextEscalationCandidates||[]).map(clean).filter(Boolean).join(' | ')}`,
    'Do not replace this game-specific directive with a generic genre task. Implement only the parts owned by Allowed edit paths in this worker; other non-overlapping directive responsibilities remain for sibling workers.',
    '[GAME SPECIFIC BUILD UP DIRECTIVE END]'
  ].filter(Boolean).join('\n');
}
function buildUpDirectiveBlockFromPrompt(prompt=''){
  const raw=String(prompt??'');
  const begin='[GAME SPECIFIC BUILD UP DIRECTIVE BEGIN]';
  const end='[GAME SPECIFIC BUILD UP DIRECTIVE END]';
  const start=raw.indexOf(begin);
  if(start<0)return'';
  const finish=raw.indexOf(end,start+begin.length);
  if(finish<0)return'';
  return raw.slice(start,finish+end.length);
}


export function buildRobloxNativeSourceInspection({order={},context={},responsibleFiles=[]}={}) {
  if(clean(order?.target).toLowerCase()!=='roblox')return Object.freeze({required:false,target:'non-roblox',files:[],systems:[],responsibilities:[]});
  const files=(context?.files||[]).map(file=>({
    path:clean(file?.path),
    editable:file?.editable!==false,
    content:String(file?.content||'')
  })).filter(file=>file.path);
  const combined=files.map(file=>file.content).join('\n');
  const systems=[];
  if(/RemoteEvent|RemoteFunction|OnServerEvent|OnServerInvoke|FireServer|InvokeServer/.test(combined))systems.push('REMOTE_EVENTS_AND_FUNCTIONS');
  if(/DataStoreService|GetDataStore|UpdateAsync|SetAsync|GetAsync/.test(combined))systems.push('DATASTORE_SAVE_LOAD');
  if(/UserInputService|ContextActionService|TouchTap|TouchPan|TouchStarted|TouchEnded/.test(combined))systems.push('TOUCH_INPUT');
  if(/CharacterAdded|CharacterRemoving|Humanoid|HumanoidRootPart|LoadCharacter/.test(combined))systems.push('CHARACTER_RESPAWN');
  if(/Motor6D|\bBone\b|Animator|AnimationController|AnimationTrack|LoadAnimation|IKControl/.test(combined))systems.push('RIG_AND_ANIMATION');
  if(/(?:CFrame\s*=|:PivotTo\s*\(|PrimaryPartCFrame|AssemblyLinearVelocity)/.test(combined)&&/(?:character|npc|enemy|monster|boss|creature|humanoid|torso|arm|leg)/i.test(combined))systems.push('CHARACTER_MOTION');
  if(/ScreenGui|GuiButton|TextButton|ImageButton|Activated|MouseButton1Click/.test(combined))systems.push('UI_STATE');
  if(/RunService|Heartbeat|RenderStepped|Stepped|state|phase|mode/i.test(combined))systems.push('CORE_STATE_MACHINE');
  if(/Players\.PlayerAdded|PlayerRemoving|GetPlayers\(|replic|network|server authority/i.test(combined))systems.push('MULTIPLAYER_SYNC');
  const responsibilities=files.map(file=>({
    file:file.path,
    editable:file.editable,
    role:/(?:^|\/)server\/|\.server\.lua[u]?$/i.test(file.path)?'SERVER_AUTHORITY'
      :/(?:^|\/)client\/|\.client\.lua[u]?$/i.test(file.path)?'CLIENT_INPUT_OR_PRESENTATION'
      :'SHARED_MODULE_OR_IMPACT_CONTEXT',
    signals:[
      /RemoteEvent|RemoteFunction|OnServerEvent|OnServerInvoke|FireServer|InvokeServer/.test(file.content)?'REMOTE':null,
      /DataStoreService|GetDataStore|UpdateAsync|SetAsync|GetAsync/.test(file.content)?'DATASTORE':null,
      /UserInputService|ContextActionService|Touch/.test(file.content)?'INPUT':null,
      /CharacterAdded|Humanoid|HumanoidRootPart/.test(file.content)?'CHARACTER':null,
      /Motor6D|\bBone\b|Animator|AnimationController|AnimationTrack|LoadAnimation|IKControl/.test(file.content)?'RIG_ANIMATION':null,
      /(?:CFrame\s*=|:PivotTo\s*\(|PrimaryPartCFrame|AssemblyLinearVelocity)/.test(file.content)&&/(?:character|npc|enemy|monster|boss|creature|humanoid|torso|arm|leg)/i.test(file.content)?'CHARACTER_MOTION':null,
      /ScreenGui|GuiButton|Activated|MouseButton1Click/.test(file.content)?'UI':null
    ].filter(Boolean)
  }));
  return Object.freeze({
    required:true,
    target:'roblox',
    files:Object.freeze(files.map(file=>file.path)),
    editableFiles:Object.freeze(responsibleFiles.map(clean).filter(Boolean)),
    systems:Object.freeze(unique(systems)),
    responsibilities:Object.freeze(responsibilities.map(row=>Object.freeze(row))),
    motionQuality:Object.freeze({
      rigSignals:/Motor6D|\bBone\b|R15|UpperTorso|LowerTorso/.test(combined),
      animatorSignals:/Animator|AnimationController|AnimationTrack|LoadAnimation|IKControl/.test(combined),
      rootTransformMotionSignals:/(?:CFrame\s*=|:PivotTo\s*\(|PrimaryPartCFrame)/.test(combined),
      weldConstraintSignals:/WeldConstraint/.test(combined),
      libraryFirstRequired:true,
      hardFailure:'ROBLOX_CHARACTER_MOTION_MANNEQUIN'
    }),
    sourceReadBeforeGeneration:true,
    genericCrossPlatformTranslationForbidden:true
  });
}

function robloxNativeWorkerGuidance(order={},context={},responsibleFiles=[]) {
  const inspection=buildRobloxNativeSourceInspection({order,context,responsibleFiles});
  if(inspection.required!==true)return'';
  const directive=order?.selectedTask?.buildUpDirective?.robloxNativeExecution||order?.buildUpDirective?.robloxNativeExecution||{};
  const mapped=inspection.responsibilities.map(row=>`${row.file}[${row.role};${row.editable?'EDITABLE':'READ_ONLY'};${(row.signals||[]).join('+')||'NO_SPECIAL_SIGNAL'}]`).join(' | ');
  const directiveResponsibilities=(directive.serverClientResponsibility||[]).map(row=>`${clean(row.file)}::${clean(row.symbol)||'UNKNOWN'}=${clean(row.role)||'UNKNOWN'}`).join(' | ');
  return[
    '[ROBLOX NATIVE CODING CONTRACT]',
    `SOURCE_INSPECTION=REQUIRED_AND_COMPLETED_BEFORE_GENERATION; observedSystems=${inspection.systems.join(',')||'NONE_DETECTED'}`,
    `CURRENT_RESPONSIBILITY_MAP=${mapped||'NO_CONTEXT_FILES'}`,
    directiveResponsibilities?`BUILD_UP_SERVER_CLIENT_BINDING=${directiveResponsibilities}`:'',
    directive.observableAcceptanceScenario?`END_TO_END_ACCEPTANCE=${clean(directive.observableAcceptanceScenario)}`:'END_TO_END_ACCEPTANCE=input/touch -> local handler -> Remote when required -> server validation -> authoritative state change -> client feedback',
    'Use Roblox-native Luau and the existing server/client/module responsibility. Do not translate Unity/Web implementation literally.',
    'Read the existing RemoteEvent/RemoteFunction, touch input, character/respawn, rig/animation, DataStore/save, UI state, and multiplayer sync flow before changing behavior.',
    'CHARACTER MOTION QUALITY: for PLAYER/HUMANOID_NPC/CREATURE, inspect the existing rig before motion changes. An articulated actor must use R15 or a compatible Motor6D/Bone rig plus Humanoid or AnimationController and Animator. WeldConstraint-only articulated bodies and single rigid Parts are not a finished character motion solution.',
    'MOTION SOURCE ORDER: reuse verified same-game/same-archetype motion first, then compatible verified company motion, then license-verified repository/external motion with retarget cleanup. Author new keyframes only for the remaining verified coverage gap.',
    'SMOOTHNESS: use AnimationTrack cross-fade/weight blending, speed-synchronized Walk/Jog/Run playback, start/stop/turn continuity, and upper/lower-body layering when supported. Do not snap Attack back to Idle.',
    'PROCEDURAL CORRECTION: use budgeted IKControl/foot contact, pelvis height, spine lean, head gaze, slope adaptation, landing compression, and hit recoil when supported. These are visual corrections only and may not own movement, collider, hit, cooldown, or damage authority.',
    'MANNEQUIN HARD FAILURE: moving an articulated NPC/creature only by root/PrimaryPart CFrame or PivotTo without active joint motion is forbidden. Do not claim character motion complete from Tween/CFrame movement alone.',
    'STUDIO MOTION PROBE FOR LIVING_MOTION WORK: in the existing responsible character setup path, add a bounded RunService:IsStudio() verification probe for one representative articulated actor. It must print ROBLOX_CHARACTER_MOTION_RUNTIME=START before observation and then PASS or FAIL after measuring actual Motor6D/Bone Transform change during visible locomotion. Do not print PASS from a constant or config marker. The probe must be Studio-only, bounded, one-shot, and must not own gameplay movement.',
    'Server remains authoritative for damage, reward, currency, inventory, progression, save, and multiplayer state. Client requests intent and renders feedback; it does not decide authoritative results.',
    'Remote handlers must validate sender, payload shape/range, ownership/state preconditions, and rate/duplicate behavior when applicable.',
    'DataStore retries must be bounded/backed off and preserve existing keys and save meaning. Character references must survive respawn through CharacterAdded/current-character refresh.',
    'Avoid unbounded while true loops, leaked event connections, duplicate remote paths, stale character references, and wrapper/override fixes.',
    'Prefer a responsible-file behavior package such as combat, UI/input, save/load, enemy AI, character state, or multiplayer sync instead of an unscoped Roblox rewrite.',
    'Feature existence is not acceptance. The changed action must reach the intended authoritative state change and visible client feedback.',
    'Actual behavior is rechecked later through the existing official Studio MCP path as soon as runtime-foundation eligibility is satisfied.'
  ].filter(Boolean).join('\n');
}

export function inspectRobloxNativeCandidateQuality({candidate={},sourceRoot=''}={}) {
  const rows=[
    ...(candidate?.edits||[]).map(row=>({path:clean(row.path),text:String(row.replace||'')})),
    ...(candidate?.newFiles||[]).map(row=>({path:clean(row.path),text:String(row.content||'')})),
    ...(candidate?.replaceFiles||[]).map(row=>({path:clean(row.path),text:String(row.content||'')}))
  ].filter(row=>row.path);
  const findings=[];
  for(const row of rows){
    const client=/(?:^|\/)client\/|\.client\.lua[u]?$/i.test(row.path);
    const server=/(?:^|\/)server\/|\.server\.lua[u]?$/i.test(row.path);
    if(/while\s+true\s+do/i.test(row.text)&&!/task\.wait\s*\(|Heartbeat:Wait\s*\(|Stepped:Wait\s*\(/i.test(row.text))findings.push({file:row.path,class:'UNBOUNDED_WHILE_LOOP'});
    if(client&&/DataStoreService|GetDataStore\s*\(/i.test(row.text))findings.push({file:row.path,class:'CLIENT_DATASTORE_AUTHORITY'});
    if(client&&/(?:leaderstats|currency|gold|coins?|inventory|progress|reward)[\s\S]{0,120}(?:\.Value\s*=|SetAttribute\s*\()/i.test(row.text))findings.push({file:row.path,class:'CLIENT_AUTHORITATIVE_GAMEPLAY_MUTATION'});
    if(server&&/OnServerEvent|OnServerInvoke/.test(row.text)&&!/typeof\s*\(|type\s*\(|IsA\s*\(|math\.clamp|tonumber\s*\(|assert\s*\(|if\s+not\s+/i.test(row.text))findings.push({file:row.path,class:'REMOTE_INPUT_VALIDATION_WEAK'});
    if(/DataStoreService|GetDataStore/.test(row.text)&&/while\s+true\s+do/i.test(row.text))findings.push({file:row.path,class:'UNBOUNDED_DATASTORE_RETRY'});
    if(/local\s+\w*character\w*\s*=\s*\w+\.Character\b/i.test(row.text)&&!/CharacterAdded|CharacterRemoving/i.test(row.text))findings.push({file:row.path,class:'STALE_CHARACTER_REFERENCE_RISK'});
    const actorSignal=/(?:character|npc|enemy|monster|boss|creature|humanoid|torso|upperTorso|lowerTorso|arm|leg)/i.test(row.text);
    const customActorSignal=/(?:Instance\.new\s*\(\s*["'](?:Model|Part|MeshPart)["']|humanoidFigure\s*\(|figure\s*\(|create\w*(?:Npc|Enemy|Monster|Creature|Character)\s*\()/i.test(row.text);
    const rootMotionSignal=/(?:\.CFrame\s*=|:PivotTo\s*\(|PrimaryPartCFrame|SetPrimaryPartCFrame)/.test(row.text);
    const articulationSignal=/(?:Motor6D|\bBone\b|UpperTorso|LowerTorso|LeftUpperArm|RightUpperArm|LeftUpperLeg|RightUpperLeg)/.test(row.text);
    const animatorSignal=/(?:Animator|AnimationController|AnimationTrack|LoadAnimation|\bAnimate\b|IKControl)/.test(row.text);
    const weldSignal=/WeldConstraint/.test(row.text);
    if(actorSignal&&customActorSignal&&rootMotionSignal&&!articulationSignal)findings.push({file:row.path,class:'ROOT_ONLY_ARTICULATED_MOTION_RISK'});
    if(actorSignal&&customActorSignal&&weldSignal&&!articulationSignal)findings.push({file:row.path,class:'WELD_CONSTRAINT_ONLY_CHARACTER_RISK'});
    if(actorSignal&&customActorSignal&&/(?:Humanoid|AnimationController|Motor6D|\bBone\b)/.test(row.text)&&!animatorSignal)findings.push({file:row.path,class:'MISSING_ANIMATOR_BINDING_RISK'});
    if(actorSignal&&rootMotionSignal&&!/(?:AdjustWeight|AdjustSpeed|AnimationTrack|LoadAnimation|Animator)/.test(row.text))findings.push({file:row.path,class:'LOCOMOTION_BLEND_SPEED_SYNC_MISSING_RISK'});
    const connects=(row.text.match(/\.Connect\s*\(/g)||[]).length;
    const cleanup=(row.text.match(/:Disconnect\s*\(|Janitor|Maid|Trove|Destroying/g)||[]).length;
    if(connects>=3&&cleanup===0)findings.push({file:row.path,class:'EVENT_CONNECTION_CLEANUP_RISK'});
  }
  return Object.freeze({
    required:rows.length>0,
    findingCount:findings.length,
    findings:Object.freeze(findings.map(row=>Object.freeze(row))),
    automaticGameWideBlock:false,
    securityRelevantFindings:Object.freeze(findings.filter(row=>['CLIENT_DATASTORE_AUTHORITY','CLIENT_AUTHORITATIVE_GAMEPLAY_MUTATION','REMOTE_INPUT_VALIDATION_WEAK','UNBOUNDED_DATASTORE_RETRY'].includes(row.class))),
    motionQualityFindings:Object.freeze(findings.filter(row=>['ROOT_ONLY_ARTICULATED_MOTION_RISK','WELD_CONSTRAINT_ONLY_CHARACTER_RISK','MISSING_ANIMATOR_BINDING_RISK','LOCOMOTION_BLEND_SPEED_SYNC_MISSING_RISK'].includes(row.class))),
    motionQualityHardFailure:'ROBLOX_CHARACTER_MOTION_MANNEQUIN',
    sourceRoot:clean(sourceRoot)||null
  });
}

function gatedRetryStrategyGuidance(order = {}) {
  const evidence=(order?.selectedTask?.evidence||[]).map(clean).filter(Boolean);
  const marker=[...evidence].reverse().find(value=>value.startsWith('neural-gated-retry-strategy:'));
  if(!marker)return'';
  const failureClass=clean(marker.slice('neural-gated-retry-strategy:'.length)).toUpperCase()||'UNCLASSIFIED';
  const strategy={
    NO_OP:'이전 시도는 실제 변경이 없었다. 같은 응답 구조를 반복하지 말고 목표와 직접 연결된 책임 심볼을 선택해 실제 동작을 바꾼다.',
    EDIT_MATCH:'이전 시도는 source anchor가 맞지 않았다. 추측한 find를 재사용하지 말고 제공된 exact source window에서 유일한 원문을 그대로 복사한다.',
    MALFORMED_OUTPUT:'이전 시도는 출력 형식이 깨졌다. 설명을 줄이고 가장 먼저 완전한 유효 candidate 구조를 닫은 뒤 필요한 변경만 담는다.',
    INVALID_PATH:'이전 시도는 책임 경로를 벗어났다. Allowed edit paths 밖의 파일을 절대 만들거나 수정하지 않는다.',
    TIMEOUT:'이전 시도는 시간 초과였다. 동일한 장황한 접근을 반복하지 말고 가장 영향 큰 책임 변경을 먼저 완결한 뒤 연결된 필수 변경만 추가한다.',
    SEMANTIC_DIFF_BUDGET:'이전 시도는 의미 변경 범위를 넘었다. 핵심 책임 시스템과 직접 의존성만 유지하고 보호된 게임 규칙은 건드리지 않는다.',
    STUDIO_QUALITY_DELTA:'이전 시도는 스튜디오 품질 구현 폭이 부족했다. 마커 추가가 아니라 허용된 책임 파일 안에서 연결된 실질 개선 단위를 실제 코드로 완성한다.',
    DIAGNOSTIC_POSTCONDITION:'이전 시도는 진단 후조건을 닫지 못했다. 재현된 실패 조건을 직접 없애는 변경을 우선하고 동일 조건이 다시 성립하지 않게 한다.',
    SYSTEM_CAUSAL_TEST_REQUIRED:'이전 시스템 수정은 원인 증명 테스트가 부족했다. 책임 소스와 회귀 테스트를 같은 candidate에서 함께 완성한다.',
    SYSTEM_CANDIDATE_SYNTAX:'이전 시스템 candidate는 문법이 깨졌다. 구조를 단순화하고 기존 함수/구문 패턴에 맞춰 완전한 문법 단위로 교체한다.',
    UNCLASSIFIED:'이전 실패와 같은 구현 접근을 반복하지 말고 현재 진단·책임 파일·검증 근거를 기준으로 다른 직접 수정 전략을 선택한다.'
  }[failureClass]||'이전 실패와 같은 구현 접근을 반복하지 말고 현재 진단과 책임 범위를 기준으로 다른 직접 수정 전략을 선택한다.';
  return [
    '[NEURAL GATED RETRY STRATEGY]',
    `previousFailureClass=${failureClass}`,
    strategy,
    '재시도는 범위를 넓히기 위한 핑계가 아니다. 동일 책임 범위에서 전략만 바꾸고 기존 검증된 동작과 저장 의미는 보존한다.'
  ].join('\n');
}

function universalAssetWorkerGuidance(order={}) {
  const target=clean(order?.target).toLowerCase();
  if(!['roblox','unity'].includes(target))return'';
  const loadout=order?.assetProduction?.baseMaterialLoadout||{};
  const contract=loadout?.universalAssetFirst||{};
  if(contract?.required!==true)return'';
  const families=['CHARACTER','CREATURE','BUILDING','ENVIRONMENT','WEAPON','SKILL','MATERIAL','AUDIO','VFX','UI','MOTION','PROP'];
  const selected=Object.entries(loadout?.families||{}).map(([family,atoms])=>family+'='+((atoms||[]).map(clean).filter(Boolean).join('|')||'NONE')).join('; ');
  return [
    '[UNIVERSAL ASSET-FIRST UPGRADE CONTRACT]',
    'All 12 asset families MUST be evaluated: '+families.join(','),
    'Selected loadout: '+(selected||'NONE'),
    'For each family record exactly APPLIED or NOT_APPLICABLE. NOT_APPLICABLE is allowed only when the current game truly has no existing system for that family; never use it to skip an existing system.',
    'APPLIED means the selected/verified compatible asset is used by the existing responsible native source, not merely listed in config, comments, attributes, constants, or a manifest.',
    'Primitive-only, color-only, marker-only, or repeated generic-Part changes cannot satisfy a Vibe graphics/presentation upgrade.',
    'Map/world asset use is mandatory: background/terrain/biome plus existing buildings/settlements/landmarks/set dressing/props must use ENVIRONMENT, BUILDING, and PROP assets. Villages, houses, schools, shops, temples, dungeon entrances, trees, rocks, furniture, signs, lights and similar world objects must not remain generic placeholders when they exist in the game.',
    target==='roblox'?'Roblox evidence: use STUDIO_ASSET_BINDING_VERSION = 2, STUDIO_ASSET_SELECTION = {...}, and STUDIO_ASSET_FAMILY_STATUS = { FAMILY = "APPLIED" or "NOT_APPLICABLE" } for all 12 families. These evidence tables never replace actual Instance/Model/MeshPart/Material/Sound/Particle/UI/Animator binding.':'Unity evidence must bind selected assets to actual GameObject/Prefab/Renderer/Material/AudioSource/ParticleSystem/Animator/UI ownership; metadata alone cannot pass.',
    'Do not create a new gameplay system only to satisfy an asset family. Preserve gameplay rules, balance, hitboxes, damage, cooldowns, save meaning, progression, economy, and network authority.',
    'Use the existing responsible functions/files directly; do not create a wrapper or shadow asset pipeline.'
  ].join('\n');
}
function weatherWorkerGuidance(order = {}) {
  const contract=order?.weatherPresentation||{};
  if(contract?.required!==true)return'';
  const target=clean(order?.target).toLowerCase();
  const native=target==='unity'
    ?'Unity 네이티브 Particle System, RenderSettings/Fog, Light/Material, AudioSource 계층을 기존 책임 시스템 안에서 사용한다.'
    :target==='roblox'
      ?'Roblox 네이티브 ParticleEmitter, Atmosphere, Lighting/ColorCorrection, Sound 계층을 기존 책임 시스템 안에서 사용한다.'
      :'기존 Web Canvas/DOM/CSS/WebAudio 렌더 책임 시스템을 직접 사용한다.';
  return [
    '[WEATHER PRESENTATION IMPLEMENTATION]',
    `states=${(contract.states||[]).map(clean).filter(Boolean).join(',')}`,
    `regional=${(contract.regionalExtensions||[]).map(clean).filter(Boolean).join(',')}`,
    `preserve=${(contract.preserve||[]).map(clean).filter(Boolean).join(',')}`,
    native,
    '날씨는 표현 전용이다. 공격력, 체력, 이동속도, 드랍률, 경제, 진행, 저장 의미를 수정하지 않는다.',
    '멀티 게임이면 하나의 authoritative semantic weather state를 공유하고 join-in-progress도 현재 상태를 받게 한다.',
    '저사양에서는 파티클/후처리 밀도만 줄이고 CLEAR/RAIN/FOG/SNOW/STORM 의미 자체는 바꾸지 않는다.',
    '화산 지역은 VOLCANIC_ASH/HEAT_HAZE를 지역 표현으로 추가할 수 있지만 게임 판정은 바꾸지 않는다.',
    'Web 렌더 파일을 Unity/Roblox 자산으로 복사하지 않는다. 각 네이티브 엔진 표현을 별도로 구현한다.',
    '문서/주석/상수만 추가하는 no-op 구현은 금지한다. 실제 렌더·대기·오디오·동기화 코드가 있어야 한다.',
    '완료 소스에는 WEATHER_PRESENTATION_VERSION=1 또는 WeatherPresentationVersion = 1 등 언어 등가 마커를 둔다.',
    '정적 QA 뒤에도 실제 런타임 시각/오디오, 멀티 동기화, 모바일 성능 검증이 필요하다.'
  ].join('\n');
}

function fullWebGenerationTarget(order={}){const requirements=[...clean(order?.goal).matchAll(/REAL_GAME_FOOTPRINT_TOO_SMALL:\\d+:(\\d+)/gi)].map(match=>Number(match[1])).filter(Number.isFinite);const minBytes=Math.min(MAX_FILE_BYTES,Math.max(FULL_WEB_GENERATION_TARGET_MIN_BYTES,...requirements));const maxBytes=Math.min(MAX_FILE_BYTES,Math.max(FULL_WEB_GENERATION_TARGET_MAX_BYTES,minBytes*2));return{minBytes,maxBytes};}
function buildPrompt(order,context,responsibleFiles,{allowFullRewrite=false,exploration=null,sourceRootBootstrap=false,focusedWebRepair=false}={}){const sourceText=context.files.map(file=>`\n=== FILE ${file.path}${file.editable?' [EDITABLE]':' [READ-ONLY IMPACT CONTEXT]'}${file.exactSourceWindow?' [EXACT SOURCE WINDOW:'+String(file.windowLabel||'responsibility')+']':''}${file.truncated?' [TRUNCATED]':''} ===\n${file.content}`).join('\n');const allowed=responsibleFiles.length?responsibleFiles.join(', '):context.files.filter(file=>file.editable!==false).map(file=>file.path).join(', ');const fullWebTarget=fullWebGenerationTarget(order);return[
allowFullRewrite?'You are the Vibe2 game source worker. Return exactly one raw VIBE2_FULL_FILE envelope. Do not return JSON. Do not use markdown fences.':'You are the Vibe2 game source worker. Return JSON only.',
`Engine: ${order.target}`,
`Goal: ${order.goal}`,
`Department: ${order.department||'development'}`,
explorationGuidance(exploration),
presentationWorkerGuidance(order),
universalAssetWorkerGuidance(order),
studioQualityWorkerGuidance(order),
gameSpecificBuildUpDirectiveGuidance(order),
robloxNativeWorkerGuidance(order,context,responsibleFiles),
gatedRetryStrategyGuidance(order),
weatherWorkerGuidance(order),
clean(order.target).toLowerCase()==='system'?systemArchitectureGuidance(order.selectedTask||{}):'',
`Allowed edit paths: ${allowed}`,
context.exactSourceWindows?'CONTEXT MODE: exact responsibility windows. Each FILE window contains exact source text but separate windows are not contiguous. Any edits[].find MUST be copied wholly from one exact window; never span two windows or invent omitted text.':'',
allowFullRewrite?(sourceRootBootstrap?'OWNER AUTHORIZATION: create the first complete playable Web baseline at the exact responsible index.html path. This is an approved missing-source bootstrap. Build actual mobile gameplay with direct player input, real game-state progression, failure/success or escalating progression, restart, responsive layout, save compatibility scaffolding where required, and no external network dependency.':'OWNER AUTHORIZATION: this existing Web prototype must be rebuilt into a real playable game. Replace the responsible existing file completely. Do not return a validation dashboard, fake state buttons, or a thin prototype. Build actual mobile gameplay with direct player input, real game-state progression, failure/success or escalating progression, restart, responsive layout. Preserve approved existing external gameplay integrations such as realtime multiplayer when they are already part of the game; do not add a new external dependency required for the solo core loop.'):'Preserve gameplay values, save meaning, approved multiplayer transport and existing behavior unless the work order explicitly authorizes a protected change.',
allowFullRewrite?'The PATH line MUST be one exact path from Allowed edit paths. Everything between the content and end markers is written verbatim as the replacement file. The end marker is mandatory; never omit it.':'Every edits[].path and replaceFiles[].path MUST be one exact path from Allowed edit paths.',
allowFullRewrite?`INITIAL SEED STRATEGY: on this first response, prioritize a COMPLETE CLOSED playable seed of about ${FULL_WEB_INITIAL_SEED_TARGET_MIN_BYTES}-${FULL_WEB_INITIAL_SEED_TARGET_MAX_BYTES} UTF-8 bytes and finish </html> plus VIBE2_FILE_END early. Do not chase the final size in one pass; the worker will automatically expand a valid seed. The seed must already contain real input, mutable state, an update/state-transition loop, basic progression, reachable result state, restart/reset, responsive mobile controls, and persistent-capable state.`:'',
allowFullRewrite?`Full Web generation target after automatic expansion: ${fullWebTarget.minBytes}-${fullWebTarget.maxBytes} UTF-8 bytes. The parser hard safety gate remains ${MIN_FULL_REWRITE_BYTES}-${MAX_FILE_BYTES} bytes, but final acceptance still requires at least ${fullWebTarget.minBytes} bytes. Use substantial executable JavaScript and do not pad with filler text. Do not return a tiny shell, placeholder dashboard, validation buttons, or static mock UI.`:(order?.selectedTask?.studioQualityEvolution?'Expand only the related responsible systems, but do not artificially shrink the implementation into one micro-patch. Complete the connected studio-quality package within the allowed paths.':'Do not expand unrelated code.'),
allowFullRewrite?'Required output format:\nVIBE2_FULL_FILE\nPATH:index.html\nSUMMARY:short summary\nEXPECTED_EFFECT:short expected effect\nTEST:mobile gameplay\nTEST:restart\nTEST:runtime\n---VIBE2_FILE_CONTENT---\n<!doctype html>\n...complete playable HTML...\n</html>\n---VIBE2_FILE_END---':'Every edits[].find MUST be copied character-for-character from the matching FILE block and occur exactly once.',
'Do not output binary assets. Do not use wrapper/monkey patches.',
clean(order.target).toLowerCase()==='system'?'For system target, edit only exact allowed paths. Company policy files may be edited only when they are explicitly listed. Never alter authority or weaken gates. When Allowed edit paths contain both a non-QA system source file and a qa/*.test.js|mjs|cjs regression file, the candidate MUST change both in one atomic candidate: repair the responsible source and add or strengthen the exact causal regression test that fails on the base and passes after the repair.':'Do not change homepage/company files.',
clean(order.target).toLowerCase()==='web'?'For web target, stay inside the existing web-games/<game> root.':'',
sourceRootBootstrap&&clean(order.target).toLowerCase()==='unity'?'UNITY WEB BOOTSTRAP: the project configuration and WebBuild.cs scaffold are supplied by the system. You MUST edit BOTH Assets/Scripts/GameCore.cs and Assets/Scripts/RuntimeBootstrap.cs from the exact provided stub text. Implement real approved gameplay, state, save meaning, mobile input, and QA markers in those existing files. Do not create HTML/Canvas source and do not return newFiles or replaceFiles.':'',
'Read-only impact context may explain dependencies but MUST NOT be edited unless it is also listed in Allowed edit paths.',
allowFullRewrite?'':'This is an implementation candidate. You MUST produce at least one real source change. Never return empty edits/newFiles/replaceFiles. When responsible files are listed, use an edits[] entry on an exact allowed path; copy find text exactly from the FILE block and make replace materially different.',
focusedWebRepair&&!allowFullRewrite?'FOCUSED WEB REPAIR STREAM CONTRACT: put the edits array first. Emit the smallest single complete edits[0] object before optional summary/tests. The worker may stop generation immediately after one complete exact edit is available, so that first edit must independently satisfy the Goal and preserve unrelated behavior.':'',
allowFullRewrite?'The replacement must be self-contained enough to run from the existing game root and must finish before the VIBE2_FILE_END marker.':'JSON schema: {"summary":"...","expectedEffect":"...","edits":[{"path":"exact allowed path","find":"exact unique old text","replace":"new text"}],"newFiles":[],"replaceFiles":[],"tests":["..."]}',
`Required QA: ${(order.qa||[]).join(', ')}`,
sourceText
].filter(Boolean).join('\n');}
const SEMANTIC_SYSTEM_PATTERNS=Object.freeze({
  INPUT:/\b(pointer(?:down|up|move)?|touch(?:start|end|move)?|keydown|keyup|mousedown|mouseup|click|playerintent|inputstate|handlepointer|normalizepointer)\b/i,
  SAVE:/\b(localstorage|sessionstorage|indexeddb|save(?:game|state)?|load(?:game|state)?|serialize|deserialize)\b/i,
  ECONOMY:/\b(gold|coins?|currency|price|cost|shop|buy|sell|purchase|transaction)\b/i,
  COMBAT:/\b(damage|attack|combat|weapon|health|hp|kill|death|cooldown)\b/i,
  PROGRESSION:/\b(level|xp|quest|objective|unlock|wave|stage|progression)\b/i,
  PLACEMENT:/\b(placement|placetower|placeentity|placedentities|placementslots|buildtower|deploy|gridslot)\b/i,
  AI:/\b(enemyintent|enemystate|enemynavigation|pathfind|aggro|agentintent)\b/i,
  WORLD:/\b(collision|worldentities|worldstate|region|route|worldquery)\b/i,
  INTERACTION:/\b(interaction|interact|npc|dialog|pickup|chest|interactiontargets)\b/i,
  GOAL_STATE:/\b(victory|defeat|gameover|runwon|runfailed|goalstate|retrystate)\b/i
});
function semanticSystemsForText(value=''){
  const text=clean(value);
  return Object.entries(SEMANTIC_SYSTEM_PATTERNS).filter(([,re])=>re.test(text)).map(([system])=>system);
}
function markerTouched(text='',markers=[]){
  const lower=String(text||'').toLowerCase();
  return markers.some(marker=>{
    const needle=clean(marker).toLowerCase();
    return needle.length>=3&&lower.includes(needle);
  });
}
function storageContractSnapshot(source=''){
  const raw=String(source??'');
  const literalKeys=unique([...raw.matchAll(/(?:localStorage|sessionStorage)\.(?:getItem|setItem|removeItem)\s*\(\s*['"]([^'"]+)['"]/g)].map(match=>match[1]));
  const keyVariables=unique([...raw.matchAll(/(?:localStorage|sessionStorage)\.(?:getItem|setItem|removeItem)\s*\(\s*([A-Za-z_$][\w$]*)\b/g)].map(match=>match[1]));
  const variableBindings={};
  for(const name of keyVariables){
    const re=new RegExp('\\b(?:const|let|var)\\s+'+regexEscape(name)+'\\s*=\\s*([^;\\n]{1,420})\\s*;');
    const match=re.exec(raw);
    if(match)variableBindings[name]=clean(match[1]);
  }
  return{literalKeys,variableBindings};
}
function storageContractMutationRows({sourceRoot='',edits=[]}={}){
  if(!clean(sourceRoot)||!Array.isArray(edits)||!edits.length)return[];
  const grouped=new Map();
  for(const edit of edits){
    const relative=clean(edit?.path);
    if(!relative)continue;
    if(!grouped.has(relative))grouped.set(relative,[]);
    grouped.get(relative).push(edit);
  }
  const mutations=[];
  for(const [relative,rows] of grouped){
    try{
      const file=path.resolve(sourceRoot,relative);
      if(!fs.existsSync(file)||!fs.statSync(file).isFile())continue;
      const beforeSource=fs.readFileSync(file,'utf8');
      const before=storageContractSnapshot(beforeSource);
      if(!before.literalKeys.length&&!Object.keys(before.variableBindings).length)continue;
      let afterSource=beforeSource,applicable=true;
      for(const edit of rows){
        const find=String(edit?.find??''),replace=String(edit?.replace??'');
        if(!find||afterSource.split(find).length-1!==1){applicable=false;break;}
        afterSource=afterSource.replace(find,replace);
      }
      if(!applicable)continue;
      const after=storageContractSnapshot(afterSource);
      for(const key of before.literalKeys){
        if(!after.literalKeys.includes(key))mutations.push(relative+':literal:'+key);
      }
      for(const [name,expression] of Object.entries(before.variableBindings)){
        if(after.variableBindings[name]!==expression)mutations.push(relative+':binding:'+name);
      }
    }catch{}
  }
  return unique(mutations);
}
export function evaluateSemanticDiffBudget({candidate={},editContract={},allowFullRewrite=false,bootstrap=false,sourceRoot=''}={}){
  const confidence=clean(editContract?.responsibilityConfidence).toUpperCase()||'LOW';
  const developmentMode=clean(editContract?.codingArchitecture?.developmentMode).toUpperCase();
  const primaryTargets=unique(editContract?.primaryTargets||[]);
  const dependent=unique(editContract?.allowedDependentSymbolsOrSystems||[]);
  const ownedState=unique(editContract?.ownedState||[]);
  const markers=unique([...primaryTargets,...dependent,...ownedState]);
  const budget=editContract?.semanticDiffBudget||{};
  const allowedSystems=new Set(unique(budget.allowedSystems||[]).map(x=>x.toUpperCase()));
  const edits=Array.isArray(candidate.edits)?candidate.edits:[];
  const newFiles=Array.isArray(candidate.newFiles)?candidate.newFiles:[];
  const replaceFiles=Array.isArray(candidate.replaceFiles)?candidate.replaceFiles:[];
  const hardGate=confidence==='HIGH'&&developmentMode==='PRESERVE_PATCH'&&primaryTargets.length>0&&allowFullRewrite!==true&&bootstrap!==true&&newFiles.length===0&&replaceFiles.length===0;
  const touchedSystems=unique(edits.flatMap(edit=>semanticSystemsForText([edit.find,edit.replace].join('\n'))));
  const unexpectedSystems=touchedSystems.filter(system=>allowedSystems.size>0&&!allowedSystems.has(system));
  const editScopeRows=edits.map(edit=>{
    const text=[edit.find,edit.replace].join('\n');
    let touchesAllowedMarker=markerTouched(text,markers);
    if(!touchesAllowedMarker&&clean(sourceRoot)&&clean(edit.path)){
      try{
        const file=path.resolve(sourceRoot,clean(edit.path));
        if(fs.existsSync(file)){
          const source=fs.readFileSync(file,'utf8');
          const at=source.indexOf(String(edit.find||''));
          if(at>=0){
            const nearby=source.slice(Math.max(0,at-1600),Math.min(source.length,at+String(edit.find||'').length+1600));
            touchesAllowedMarker=markerTouched(nearby,markers);
          }
        }
      }catch{}
    }
    return{path:clean(edit.path),touchesAllowedMarker,systems:semanticSystemsForText(text)};
  });
  const unprovenEdits=hardGate&&markers.length?editScopeRows.filter(row=>!row.touchesAllowedMarker):[];
  const protectedSaveKeys=unique(budget.saveKeysMustRemainCompatible||[]);
  const saveKeyViolations=[];
  for(const edit of edits){
    for(const key of protectedSaveKeys){
      if(String(edit.find||'').includes(key)&&!String(edit.replace||'').includes(key))saveKeyViolations.push(clean(edit.path)+':'+key);
    }
  }
  const saveKeyMigrationAllowed=budget.saveKeyMigrationAllowed===true;
  const saveContractMutations=storageContractMutationRows({sourceRoot,edits});
  const saveInvariantGate=!saveKeyMigrationAllowed&&(saveKeyViolations.length>0||saveContractMutations.length>0);
  const violations=[];
  if(hardGate&&budget.unrelatedSystemMutationForbidden===true&&unexpectedSystems.length)violations.push('UNRELATED_SYSTEM:'+unexpectedSystems.join(','));
  if(hardGate&&unprovenEdits.length)violations.push('UNPROVEN_EDIT_SCOPE:'+unprovenEdits.map(row=>row.path).join(','));
  if(!saveKeyMigrationAllowed&&saveKeyViolations.length)violations.push('SAVE_KEY_COMPATIBILITY:'+saveKeyViolations.join(','));
  if(!saveKeyMigrationAllowed&&saveContractMutations.length)violations.push('SAVE_CONTRACT_MUTATION:'+saveContractMutations.join(','));
  return{
    version:1,mode:hardGate?'HARD_ENFORCE':saveInvariantGate?'INVARIANT_ENFORCE':'OBSERVE_ONLY',hardGate,pass:violations.length===0,confidence,developmentMode:developmentMode||null,
    markerCount:markers.length,editCount:edits.length,touchedSystems,allowedSystems:[...allowedSystems],unexpectedSystems,
    unprovenEditPaths:unprovenEdits.map(row=>row.path),protectedSaveKeyCount:protectedSaveKeys.length,saveKeyViolations,saveContractMutations,
    saveKeyMigrationAllowed,saveContractInvariantEnforced:saveInvariantGate,violations,
    ambiguousClassificationObserved:!hardGate&&!saveInvariantGate,writableScopeExpansionAllowed:false,authorityExpanded:false
  };
}
export function generationFailureClass(error){
  const message=clean(error?.message||error);
  if(/실제 source 변경|변경 없는 edit/i.test(message))return'NO_OP';
  if(/시간 초과|timeout|prediction aborted|token repeat limit/i.test(message))return'TIMEOUT';
  if(/SYSTEM_CAUSAL_TEST_REQUIRED/i.test(message))return'SYSTEM_CAUSAL_TEST_REQUIRED';
  if(/SYSTEM_CANDIDATE_SYNTAX_INVALID/i.test(message))return'SYSTEM_CANDIDATE_SYNTAX';
  if(/DIAGNOSTIC_POSTCONDITION_MISSING/i.test(message))return'DIAGNOSTIC_POSTCONDITION';
  if(/ROBLOX_STUDIO_ASSET_(?:VISUAL_OWNER_REQUIRED|APPLICATION_REQUIRED)/i.test(message))return'ROBLOX_STUDIO_ASSET_APPLICATION';
  if(/ROBLOX_ASSET_ADAPTATION_DOMAINS_REQUIRED/i.test(message))return'ROBLOX_VISUAL_DOMAINS';
  if(/ROBLOX_ASSET_ADAPTATION_MOTION_REQUIRED/i.test(message))return'ROBLOX_VISUAL_MOTION';
  if(/PRESENTATION_PATCH_DELTA_REQUIRED/i.test(message))return'PRESENTATION_PATCH_DELTA';
  if(/STUDIO_QUALITY_DELTA_REQUIRED/i.test(message))return'STUDIO_QUALITY_DELTA';
  if(/SEMANTIC_DIFF_BUDGET_VIOLATION/i.test(message))return'SEMANTIC_DIFF_BUDGET';
  if(/잘못된 상대 경로|책임 파일 범위 밖 수정 금지|허용 확장자 아님|허용 경로|exact allowed path/i.test(message))return'INVALID_PATH';
  if(/전체 교체 파일 크기 오류/i.test(message))return'FULL_REWRITE_SIZE';
  if(/JSON|파싱|시작을 찾지 못함|잘렸거나 종료 마커|응답 비어 있음|전체 파일 응답|Web expansion(?:은| 종료 마커| 내용)|FULL_WEB_EXPANSION_(?:NO_GROWTH|TOO_SMALL)|같은 파일에 edit\/new\/replace 중복 작업 금지|focused replace (?:비어 있음|placeholder 금지)/i.test(message))return'MALFORMED_OUTPUT';
  if(/edit find/i.test(message))return'EDIT_MATCH';
  return'OTHER';
}
function focusedFinalRetryAllowed(error){return['NO_OP','TIMEOUT','INVALID_PATH','EDIT_MATCH','MALFORMED_OUTPUT','SEMANTIC_DIFF_BUDGET','PRESENTATION_PATCH_DELTA','ROBLOX_VISUAL_DOMAINS','ROBLOX_VISUAL_MOTION','STUDIO_QUALITY_DELTA','DIAGNOSTIC_POSTCONDITION','ROBLOX_STUDIO_ASSET_APPLICATION','SYSTEM_CAUSAL_TEST_REQUIRED','SYSTEM_CANDIDATE_SYNTAX'].includes(generationFailureClass(error));}
function fullWebFinalRetryAllowed(error){return['FULL_REWRITE_SIZE','TIMEOUT','MALFORMED_OUTPUT'].includes(generationFailureClass(error));}
export function shouldRetryGenerationError(error){
  const message=clean(error?.message||error);
  return /시간 초과|timeout|JSON|파싱|시작을 찾지 못함|잘렸거나 종료 마커|응답 비어 있음|전체 파일 응답|Web expansion(?:은| 종료 마커| 내용)|FULL_WEB_EXPANSION_(?:NO_GROWTH|TOO_SMALL)|전체 교체 파일 크기 오류|실제 source 변경|변경 없는 edit|변경 파일 수|edit find|잘못된 상대 경로|책임 파일 범위 밖 수정 금지|허용 확장자 아님|허용 경로|exact allowed path|같은 파일에 edit\/new\/replace 중복 작업 금지|focused replace (?:비어 있음|placeholder 금지)|SEMANTIC_DIFF_BUDGET_VIOLATION|PRESENTATION_PATCH_DELTA_REQUIRED|ROBLOX_ASSET_ADAPTATION_(?:DOMAINS_REQUIRED|MOTION_REQUIRED)|STUDIO_QUALITY_DELTA_REQUIRED|DIAGNOSTIC_POSTCONDITION_MISSING|ROBLOX_STUDIO_ASSET_(?:VISUAL_OWNER_REQUIRED|APPLICATION_REQUIRED)|SYSTEM_CAUSAL_TEST_REQUIRED|SYSTEM_CANDIDATE_SYNTAX_INVALID|prediction aborted|token repeat limit/i.test(message);
}
export function exactRetryAnchorSuggestions(prompt,{max=3,sourceRoot='',responsibleFiles=[],preferredTargets=[]}={}){
  const raw=String(prompt??'');
  const marker='\n=== FILE ';
  const starts=[];
  for(let at=raw.indexOf(marker);at>=0;at=raw.indexOf(marker,at+marker.length))starts.push(at);
  let fullSource='';
  if(clean(sourceRoot)&&Array.isArray(responsibleFiles)&&responsibleFiles.length===1){
    try{
      const root=path.resolve(sourceRoot);
      const relative=posix(responsibleFiles[0]);
      const file=path.resolve(root,relative);
      if(file.startsWith(root+path.sep)&&fs.existsSync(file)&&fs.statSync(file).isFile())fullSource=fs.readFileSync(file,'utf8');
    }catch{}
  }
  const rows=[];
  const presentationTask=/(?:PRESENTATION(?:_PASS|\s)|ASSET_ADAPTATION|GRAPHICS|VISUAL)/i.test(raw);
  const preferred=unique(preferredTargets).filter(name=>/^[A-Za-z_$][\w$]{1,80}$/.test(name));
  if(fullSource&&preferred.length){
    for(const symbol of preferred.slice(0,12)){
      const escaped=regexEscape(symbol);
      const patterns=[
        new RegExp('function\\s+'+escaped+'\\s*\\([^)]{0,180}\\)\\s*\\{'),
        new RegExp('(?:const|let|var)\\s+'+escaped+'\\s*=\\s*[^;\\n]{1,320};?')
      ];
      for(const pattern of patterns){
        const match=fullSource.match(pattern);
        if(!match)continue;
        const original=match[0];
        if(fullSource.split(original).length-1!==1)continue;
        const presentationPreferred=/(?:render|visual|presentation|camera|vfx|effect|effects|ui|hud|style|fx|Color|Material|Lighting|Tween|Animation|Particle|Trail|Beam|CFrame|FieldOfView)/i.test(symbol+' '+original);
        const score=presentationTask?(presentationPreferred?180:12):100;
        rows.push({value:original,score,length:original.length});
        break;
      }
    }
  }
  for(let i=0;i<starts.length;i++){
    const sectionStart=starts[i]+1;
    const sectionEnd=i+1<starts.length?starts[i+1]:raw.length;
    const section=raw.slice(sectionStart,sectionEnd).trimEnd();
    const parts=section.split('\n');
    const header=parts.shift()||'';
    if(!header.includes('[EDITABLE]'))continue;
    const body=parts.join('\n');
    for(const original of parts){
      const trimmed=original.trim();
      if(trimmed.length<10||trimmed.length>420)continue;
      if(/^(?:[{}()[\];,]|<!--|\/\*|\*|\/\/|#)+$/.test(trimmed))continue;
      if(/^(?:<!doctype|<\/?(?:html|head|body)\b)/i.test(trimmed))continue;
      const occurrenceCorpus=fullSource||body;
      const occurrences=occurrenceCorpus.split(original).length-1;
      if(occurrences!==1)continue;
      let score=0;
      if(/\b(?:function|const|let|var|if|for|while|return|addEventListener|querySelector|getElementById|classList|dataset|localStorage)\b|<(?:button|canvas|div|section|main)\b|\bid=|\bdata-/i.test(trimmed))score+=4;
      if(/\b(?:assert(?:\.|\()|test\s*\(|describe\s*\(|it\s*\()/i.test(trimmed))score+=8;
      if(presentationTask&&/(?:Color3|BackgroundColor3|Material|Texture|Mesh|Instance\.new|Camera|FieldOfView|Particle|Trail|Beam|Tween|Animation|Animator|Motor6D|CFrame|\.Size\b|\.Position\b|Lighting|render|visual|motion|vfx|effect|Frame|ImageLabel|ImageButton)/i.test(trimmed))score+=160;
      if(trimmed.length>=20&&trimmed.length<=120)score+=2;
      if(/[=(){}<>]/.test(trimmed))score+=1;
      rows.push({value:original,score,length:trimmed.length});
    }
  }
  if(fullSource&&rows.length<Math.max(1,Number(max)||3)){
    const addFallback=(value,score=5)=>{
      const original=String(value??''),trimmed=original.trim();
      if(trimmed.length<10||trimmed.length>700)return;
      if(fullSource.split(original).length-1!==1)return;
      rows.push({value:original,score,length:trimmed.length});
    };
    const fallbackPatterns=[
      /window\.GAME_CONFIG\s*=\s*\{[^<]{20,700}?\}(?=<\/script>|;|$)/g,
      /(?:const|let|var)\s+[A-Za-z_$][\w$]*\s*=\s*[^;\n]{10,320};/g,
      /document\.getElementById\((["'])[^"']+\1\)\.addEventListener\([^;\n]{10,360};/g,
      /<(?:button|canvas|main|section)\b[^>]{10,320}>/gi
    ];
    for(const pattern of fallbackPatterns){
      for(const match of fullSource.matchAll(pattern))addFallback(match[0],6);
      if(rows.length>=Math.max(3,Number(max)||3))break;
    }
  }
  return rows
    .sort((a,b)=>b.score-a.score||a.length-b.length)
    .map(row=>row.value)
    .filter((value,index,array)=>array.indexOf(value)===index)
    .slice(0,Math.max(1,Math.min(5,Number(max)||3)));
}

export function focusedReplaceOnlySpec(prompt,{responsibleFiles=[],sourceRoot='',anchorIndex=0,preferredTargets=[]}={}){
  const raw=String(prompt??'');
  const allowedLine=raw.split('\n').find(line=>line.trimStart().startsWith('Allowed edit paths:'))||'';
  const allowedPaths=allowedLine
    ?allowedLine.slice(allowedLine.indexOf(':')+1).split(',').map(clean).filter(Boolean)
    :[];
  const exactResponsible=unique(responsibleFiles.length?responsibleFiles:allowedPaths);
  if(!exactResponsible.length)return null;
  const presentationTask=/(?:PRESENTATION(?:_PASS|\s)|ASSET_ADAPTATION|GRAPHICS|VISUAL)/i.test(raw);
  const robloxTask=/Engine:\s*roblox/i.test(raw);
  if(presentationTask&&robloxTask){
    const visualOwnerScore=value=>{
      const normalized=posix(value).toLowerCase();
      let score=0;
      if(/(?:^|\/)client(?:\/|$)|\.client\.luau$/.test(normalized))score+=100;
      if(/(?:visual|render|presentation|camera|vfx|effect|effects|ui|hud|style|fx)/i.test(normalized))score+=60;
      if(/(?:^|\/)server(?:\/|$)|\.server\.luau$/.test(normalized))score-=40;
      return score;
    };
    exactResponsible.sort((a,b)=>visualOwnerScore(b)-visualOwnerScore(a));
  }
  const candidates=[];
  for(const relative of exactResponsible){
    const anchors=exactRetryAnchorSuggestions(raw,{max:5,sourceRoot,responsibleFiles:[relative],preferredTargets});
    for(const find of anchors)candidates.push({path:relative,find});
  }
  const index=Math.max(0,Math.min(candidates.length-1,Number(anchorIndex)||0));
  const selected=candidates[index]||null;
  if(!selected?.find)return null;
  let context=selected.find;
  if(clean(sourceRoot)){
    try{
      const root=path.resolve(sourceRoot),relative=posix(selected.path),file=path.resolve(root,relative);
      if(file.startsWith(root+path.sep)&&fs.existsSync(file)&&fs.statSync(file).isFile()){
        const source=fs.readFileSync(file,'utf8'),at=source.indexOf(selected.find);
        if(at>=0){
          const radius=1400;
          const before=source.slice(Math.max(0,at-radius),at);
          const after=source.slice(at+selected.find.length,Math.min(source.length,at+selected.find.length+radius));
          context=(before+selected.find+after).trim();
        }
      }
    }catch{}
  }
  return{path:selected.path,find:selected.find,context};
}
export function buildFocusedReplaceOnlyPrompt(prompt,{error=null,responsibleFiles=[],sourceRoot='',anchorIndex=0,preferredTargets=[],presentationRecovery=false}={}){
  const spec=focusedReplaceOnlySpec(prompt,{responsibleFiles,sourceRoot,anchorIndex,preferredTargets});
  if(!spec)return null;
  const raw=String(prompt??''),goal=raw.split('\n').find(line=>line.startsWith('Goal:'))||'Goal: make the smallest real implementation change required by the work order';
  const reason=clean(error?.message||error).replace(/\s+/g,' ').slice(0,240);
  const presentationTask=/(?:PRESENTATION(?:_PASS|\s)|ASSET_ADAPTATION|GRAPHICS|VISUAL)/i.test(raw);
  const robloxPresentationTask=presentationTask&&/Engine:\s*roblox/i.test(raw);
  const robloxAssetAdaptationTask=robloxPresentationTask&&/(?:\[PRESENTATION_PASS:ASSET_ADAPTATION\]|pass=ASSET_ADAPTATION)/i.test(raw);
  const presentationDeltaFailure=presentationRecovery===true||/PRESENTATION_PATCH_DELTA_REQUIRED/i.test(reason);
  const robloxPresentationDeltaFailure=presentationDeltaFailure&&robloxPresentationTask;
  return{
    spec,
    prompt:[
      'You are the Vibe2 focused source repair worker. Return JSON only.',
      goal,
      buildUpDirectiveBlockFromPrompt(raw),
      reason?'Previous failure: '+reason:'',
      'Exact writable path: '+JSON.stringify(spec.path),
      'Exact find anchor already fixed by the worker: '+JSON.stringify(spec.find),
      'Do NOT return path or find. The worker will apply them exactly.',
      'Return exactly one JSON object with exactly one key named "replace".',
      'The replace value MUST contain the actual replacement source snippet; never output a template token or placeholder.',
      'replace MUST be materially different from the exact find anchor, syntactically valid in the shown source context, and the smallest coherent behavior change that advances the Goal.',
      presentationTask?'PRESENTATION TASK HARD RULE: replace MUST change real visible render/material/color/lighting/motion/camera/VFX/UI source behavior even when the previous failure was timeout or malformed output; marker-only constants, comments, metadata, or gameplay-only changes are invalid.':'',
      robloxPresentationTask?'ROBLOX VISUAL ANCHOR RULE: the fixed anchor must be treated as presentation-owned source. Change native Roblox presentation primitives such as Color3, Material, Lighting, Camera/FieldOfView, Tween/CFrame motion, Particle/Trail/Beam VFX, or ScreenGui/Frame/Image UI while preserving gameplay numbers and save/progression semantics.':'',
      robloxAssetAdaptationTask?'ROBLOX FULL GRAPHICS CONTRACT: replace MUST cover these minimum required core domains together: character/enemy visual form, weapon/equipment visual form, environment/terrain visual form, and material/color/style language. These core domains are mandatory, but there is no maximum visual-domain count; add UI, VFX, lighting, props, camera presentation, or other coherent visual domains when useful.':'',
      robloxAssetAdaptationTask?'ROBLOX MOTION CONTRACT: motion is mandatory. The replacement must apply a native motion driver such as TweenService, RenderStepped/Heartbeat, Animator/AnimationTrack, or Motor6D/Bone together with a real motion target such as CFrame, Transform, Position, or Orientation. Static-only presentation is invalid.':'',
      presentationDeltaFailure?'This recovery is specifically for a PRESENTATION_PATCH_DELTA failure. Do not return another nonvisual candidate.':'',
      robloxPresentationDeltaFailure?'ROBLOX PRESENTATION DELTA RECOVERY: produce an observable native visual delta at this exact client/visual owner anchor.':'',
      'Returning the exact find anchor unchanged is invalid. Change at least one behaviorally meaningful source token while preserving unrelated behavior.',
      'Preserve save keys, gameplay values, existing behavior, and unrelated systems unless the Goal explicitly requires changing them.',
      'No markdown, prose, comments outside source, extra keys, placeholders, ellipsis, or unchanged copy.',
      'SOURCE CONTEXT AROUND FIXED ANCHOR:',
      spec.context
    ].filter(Boolean).join('\n')
  };
}
export function normalizeFocusedReplaceOnly(raw,spec={}){
  const parsed=typeof raw==='string'?extractJson(raw):raw;
  if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error('focused replace 응답은 JSON 객체여야 함');
  const replace=String(parsed.replace??'');
  if(!replace.trim())throw new Error('focused replace 비어 있음');
  if(/COMPLETE_REPLACEMENT_SOURCE_SNIPPET|MINIMAL_REAL_REPLACEMENT|REPLACEMENT_SOURCE_SNIPPET/i.test(replace))throw new Error('focused replace placeholder 금지: '+clean(spec.path));
  if(replace===String(spec.find??''))throw new Error('변경 없는 edit: '+clean(spec.path));
  return{
    summary:'Vibe2 focused replace-only recovery',
    expectedEffect:'bounded exact-anchor source repair',
    edits:[{path:clean(spec.path),find:String(spec.find??''),replace}],
    newFiles:[],
    replaceFiles:[],
    tests:[]
  };
}

export function systemAtomicPairCompletionSpec(prompt,{responsibleFiles=[],sourceRoot='',partialCandidate=null}={}){
  const sourceFiles=unique(responsibleFiles).filter(file=>!/^qa\/.+\.test\.(?:mjs|js|cjs)$/i.test(file));
  const testFiles=unique(responsibleFiles).filter(file=>/^qa\/.+\.test\.(?:mjs|js|cjs)$/i.test(file));
  if(!sourceFiles.length||!testFiles.length||!partialCandidate)return null;
  const touched=new Set(unique([
    ...(partialCandidate.edits||[]).map(row=>row.path),
    ...(partialCandidate.newFiles||[]).map(row=>row.path),
    ...(partialCandidate.replaceFiles||[]).map(row=>row.path)
  ]));
  const sourceTouched=sourceFiles.some(file=>touched.has(file));
  const testTouched=testFiles.some(file=>touched.has(file));
  if(sourceTouched===testTouched)return null;
  const missingFiles=sourceTouched?testFiles:sourceFiles;
  let spec=null;
  for(const file of missingFiles){
    spec=focusedReplaceOnlySpec(prompt,{responsibleFiles:[file],sourceRoot});
    if(spec)break;
  }
  if(!spec)return null;
  return{spec,missingRole:sourceTouched?'regression-test':'system-source',preservedCandidate:partialCandidate};
}
export function buildSystemAtomicPairCompletionPrompt(prompt,{error=null,responsibleFiles=[],sourceRoot='',partialCandidate=null}={}){
  const completion=systemAtomicPairCompletionSpec(prompt,{responsibleFiles,sourceRoot,partialCandidate});
  if(!completion)return null;
  const raw=String(prompt??''),goal=raw.split('\n').find(line=>line.startsWith('Goal:'))||'Goal: repair the verified system architecture cause';
  const reason=clean(error?.message||error).replace(/\s+/g,' ').slice(0,240);
  const roleRule=completion.missingRole==='regression-test'
    ?'Complete only the missing causal regression-test side. The replacement must assert the repaired behavior so the base failure is reproduced and the repaired source passes.'
    :'Complete only the missing responsible system-source side. The replacement must repair the structural cause covered by the preserved regression-test candidate.';
  return{
    ...completion,
    prompt:[
      'You are the Vibe2 system atomic-pair completion worker. Return JSON only.',
      goal,
      buildUpDirectiveBlockFromPrompt(raw),
      reason?'Previous failure: '+reason:'',
      roleRule,
      'The worker already preserves the valid counterpart edit from the rejected candidate. Do not regenerate or describe that counterpart.',
      'Exact missing writable path: '+JSON.stringify(completion.spec.path),
      'Exact missing find anchor already fixed by the worker: '+JSON.stringify(completion.spec.find),
      'Do NOT return path or find. The worker will apply them exactly.',
      'Return exactly one JSON object with exactly one key named "replace".',
      'replace MUST be materially different from the fixed find anchor and must be syntactically valid.',
      'Do not change authority, policy, quality gates, security gates, or neural execution authority.',
      'No markdown, prose, placeholders, ellipsis, or extra keys.',
      'SOURCE CONTEXT AROUND MISSING ATOMIC-PAIR ANCHOR:',
      completion.spec.context
    ].filter(Boolean).join('\n')
  };
}
export function normalizeSystemAtomicPairCompletion(raw,completion={}){
  const focused=normalizeFocusedReplaceOnly(raw,completion.spec||{});
  const preserved=completion.preservedCandidate||{};
  return{
    summary:clean(preserved.summary)||'Vibe2 system atomic-pair completion recovery',
    expectedEffect:clean(preserved.expectedEffect)||'complete source plus causal regression-test atomic candidate',
    edits:[...(preserved.edits||[]),...(focused.edits||[])],
    newFiles:[...(preserved.newFiles||[])],
    replaceFiles:[...(preserved.replaceFiles||[])],
    tests:[...(preserved.tests||[])]
  };
}

export function recoverFocusedReplaceOnly(raw,spec={}){
  const text=String(raw??'');
  const key=/"replace"\s*:\s*"/.exec(text);
  if(!key)return null;
  const colon=text.indexOf(':',key.index);
  const start=colon>=0?text.indexOf('"',colon+1):-1;
  if(start<0)return null;
  let escape=false;
  for(let i=start+1;i<text.length;i++){
    const ch=text[i];
    if(escape){escape=false;continue;}
    if(ch==='\\'){escape=true;continue;}
    if(ch!=='"')continue;
    let replace;
    try{replace=JSON.parse(text.slice(start,i+1));}catch{return null;}
    try{return normalizeFocusedReplaceOnly({replace},spec);}catch{return null;}
  }
  return null;
}
export function buildGenerationRetryPrompt(prompt,{allowFullRewrite=false,error=null,responsibleFiles=[],attempt=2,previousOutput='',sourceRoot='',systemAtomicPairRequired=false,studioInitial=false,robloxGraphicsInitial=false,robloxFullGraphicsPackageActive=false}={}){
  const rawPrompt=String(prompt??'');
  const studioExpansion=/\[STUDIO[_ ]QUALITY[_ ]EVOLUTION\]/i.test(rawPrompt);
  const allowedLine=rawPrompt.split('\n').find(line=>line.trimStart().startsWith('Allowed edit paths:'))||'';
  const allowedPaths=allowedLine
    ? allowedLine.slice(allowedLine.indexOf(':')+1).split(',').map(clean).filter(Boolean)
    : [];
  const exactResponsible=unique(responsibleFiles.length?responsibleFiles:allowedPaths);
  const exactPath=exactResponsible.length===1?exactResponsible[0]:'';
  const reason=robloxGraphicsInitial?'INITIAL_ROBLOX_GRAPHICS_PACKAGE':studioInitial?'INITIAL_STUDIO_PACKAGE':(clean(error?.message||error).slice(0,240)||'malformed candidate');
  const zeroChange=/실제 source 변경/i.test(reason);
  const noChangeEdit=/변경 없는 edit/i.test(reason);
  const timeoutFailure=/시간 초과|timeout|prediction aborted|token repeat limit/i.test(reason);
  const presentationDelta=/PRESENTATION_PATCH_DELTA_REQUIRED/i.test(reason);
  const robloxPresentationTask=/Engine:\s*roblox/i.test(rawPrompt)&&/(?:\[PRESENTATION_PASS:ASSET_ADAPTATION\]|pass=ASSET_ADAPTATION)/i.test(rawPrompt);
  const robloxPresentationDelta=presentationDelta&&robloxPresentationTask;
  const robloxVisualDomainsFailure=/ROBLOX_ASSET_ADAPTATION_DOMAINS_REQUIRED/i.test(reason);
  const robloxVisualMotionFailure=/ROBLOX_ASSET_ADAPTATION_MOTION_REQUIRED/i.test(reason);
  const retryFailureClass=generationFailureClass(reason);
  const robloxFullGraphicsPackageRecovery=robloxPresentationTask
    &&(robloxGraphicsInitial===true||(
      (robloxFullGraphicsPackageActive===true||ROBLOX_FULL_GRAPHICS_PACKAGE_TRIGGERS.has(retryFailureClass))
      &&ROBLOX_FULL_GRAPHICS_PACKAGE_FAILURES.has(retryFailureClass)
    ));
  const studioQualityDelta=studioInitial||/STUDIO_QUALITY_DELTA_REQUIRED/i.test(reason);
  const invalidPath=/허용 확장자 아님|책임 파일 범위 밖 수정 금지|허용 경로|exact allowed path/i.test(reason);
  const editMatchFailure=/edit find/i.test(reason);
  const semanticDiffViolation=/SEMANTIC_DIFF_BUDGET_VIOLATION/i.test(reason);
  const systemCausalTestRequired=/SYSTEM_CAUSAL_TEST_REQUIRED/i.test(reason);
  const systemSyntaxInvalid=/SYSTEM_CANDIDATE_SYNTAX_INVALID/i.test(reason);
  const retryAnchorSuggestions=!allowFullRewrite?exactRetryAnchorSuggestions(rawPrompt,{max:(studioExpansion||robloxPresentationTask)?6:3,sourceRoot,responsibleFiles:exactResponsible}):[];
  const retryAnchorInstruction=retryAnchorSuggestions.length
    ?[
        studioExpansion||robloxFullGraphicsPackageRecovery
          ?'EXACT FIND ANCHOR OPTIONS: use distinct anchors as exact edits[].find values for a connected edit package; copy each selected anchor verbatim and do not reuse it.'
          :'EXACT FIND ANCHOR OPTIONS (copy one entire line verbatim as edits[0].find; do not alter whitespace or punctuation):',
        ...retryAnchorSuggestions.map((value,index)=>`ANCHOR_${index+1}: ${JSON.stringify(value)}`)
      ].join('\n')
    :'';
  const safeReason=invalidPath?'candidate attempted a path outside Allowed edit paths':semanticDiffViolation?'candidate crossed the compiled semantic edit budget; keep only primary responsibility and required direct dependencies':reason;
  const missingRobloxVisualDomains=robloxVisualDomainsFailure
    ?unique((reason.match(/MISSING_([A-Z_,]+)/i)?.[1]||'').split(',').map(value=>clean(value).toUpperCase()).filter(Boolean))
    :[];
  const previousRobloxGraphicsCandidate=robloxFullGraphicsPackageRecovery
    &&['ROBLOX_VISUAL_DOMAINS','ROBLOX_VISUAL_MOTION','PRESENTATION_PATCH_DELTA'].includes(retryFailureClass)
    &&String(previousOutput||'').trim()
      ?boundedLargeExcerpt(String(previousOutput),8000).content
      :'';
  const fullWebTargetLine=rawPrompt.split('\n').find(line=>line.trimStart().startsWith('Full Web generation target:'))||`Full Web generation target: ${FULL_WEB_GENERATION_TARGET_MIN_BYTES}-${FULL_WEB_GENERATION_TARGET_MAX_BYTES} UTF-8 bytes.`;
  const fullWebTargetMatch=fullWebTargetLine.match(/(\d+)-(\d+)\s+UTF-8 bytes/i);
  const fullWebTargetMin=Math.max(MIN_FULL_REWRITE_BYTES,Number(fullWebTargetMatch?.[1]||FULL_WEB_GENERATION_TARGET_MIN_BYTES));
  const fullWebTargetMax=Math.min(MAX_FILE_BYTES,Number(fullWebTargetMatch?.[2]||FULL_WEB_GENERATION_TARGET_MAX_BYTES));
  const previousFullWeb=allowFullRewrite&&String(previousOutput||'').trim()?String(previousOutput):'';
  const previousFullWebBytes=previousFullWeb?Buffer.byteLength(previousFullWeb,'utf8'):0;
  const previousFullWebExcerpt=previousFullWeb?boundedLargeExcerpt(previousFullWeb,Math.min(12000,Math.max(4000,fullWebTargetMin))).content:'';
  let retryBase=rawPrompt;
  if(allowFullRewrite&&attempt>=2){
    const criticalPrefix=[
      'You are the Vibe2 game source worker. Return exactly one raw VIBE2_FULL_FILE envelope. Do not return JSON.',
      rawPrompt.split('\n').find(line=>line.startsWith('Engine:'))||'',
      rawPrompt.split('\n').find(line=>line.startsWith('Goal:'))||'',
      buildUpDirectiveBlockFromPrompt(rawPrompt),
      allowedLine,
      fullWebTargetLine,
      'Preserve the exact responsible path. Do not touch homepage/company files or widen writable scope.',
      'Return one complete playable HTML file with real input, mutable state, progression, result state, restart, responsive mobile controls, and persistent-capable state.',
      'The response MUST begin with VIBE2_FULL_FILE and MUST end with ---VIBE2_FILE_END---.'
    ].filter(Boolean).join('\n');
    if(previousFullWeb){
      retryBase=criticalPrefix;
    }else{
      const marker='\n=== FILE ';
      const starts=[];
      for(let at=rawPrompt.indexOf(marker);at>=0;at=rawPrompt.indexOf(marker,at+marker.length))starts.push(at);
      const editable=[];
      for(let i=0;i<starts.length;i++){
        const sectionStart=starts[i]+1;
        const sectionEnd=i+1<starts.length?starts[i+1]:rawPrompt.length;
        let section=rawPrompt.slice(sectionStart,sectionEnd).trimEnd();
        const header=section.split('\n',1)[0];
        const sectionPath=header
          .replace(/^=== FILE\s+/,'')
          .replace(/\s+\[[^\]]+\].*$/,'')
          .replace(/\s+===$/,'')
          .trim();
        if(header.includes('[EDITABLE]')||exactResponsible.includes(sectionPath)){
          const body=section.split('\n').slice(1).join('\n');
          section=header+'\n'+boundedLargeExcerpt(body,4000).content;
          editable.push(section);
        }
      }
      retryBase=[criticalPrefix,...editable].join('\n\n');
    }
  }
  if(!allowFullRewrite&&(zeroChange||noChangeEdit||invalidPath||editMatchFailure||semanticDiffViolation||presentationDelta||robloxFullGraphicsPackageRecovery||studioQualityDelta||systemCausalTestRequired||systemSyntaxInvalid||(attempt>=2&&timeoutFailure))){
    const marker='\n=== FILE ';
    const starts=[];
    for(let at=retryBase.indexOf(marker);at>=0;at=retryBase.indexOf(marker,at+marker.length))starts.push(at);
    if(starts.length){
      const prefix=retryBase.slice(0,starts[0]).trimEnd();
      const editable=[];
      for(let i=0;i<starts.length;i++){
        const sectionStart=starts[i]+1;
        const sectionEnd=i+1<starts.length?starts[i+1]:retryBase.length;
        let section=retryBase.slice(sectionStart,sectionEnd).trimEnd();
        const header=section.split('\n',1)[0];
        const sectionPath=header
          .replace(/^=== FILE\s+/,'')
          .replace(/\s+\[[^\]]+\].*$/,'')
          .replace(/\s+===$/,'')
          .trim();
        if(header.includes('[EDITABLE]')||exactResponsible.includes(sectionPath)){
          if(attempt>=3||timeoutFailure||studioInitial||robloxGraphicsInitial){
            const body=section.split('\n').slice(1).join('\n');
            const excerpt=boundedLargeExcerpt(body,robloxGraphicsInitial?3200:(studioInitial?2500:5000));
            section=header+'\n'+excerpt.content;
          }
          editable.push(section);
        }
      }
      if(editable.length){
        const compactRetryPrefix=(timeoutFailure||presentationDelta||robloxFullGraphicsPackageRecovery||studioQualityDelta||(studioExpansion&&editMatchFailure))?[
          'You are the Vibe2 game source worker. Return JSON only.',
          rawPrompt.split('\n').find(line=>line.startsWith('Engine:'))||'',
          rawPrompt.split('\n').find(line=>line.startsWith('Goal:'))||'',
          buildUpDirectiveBlockFromPrompt(rawPrompt),
          allowedLine,
          'Preserve gameplay values, save meaning and existing behavior unless the work order explicitly authorizes a protected change.',
          'Every edits[].path MUST be one exact path from Allowed edit paths.',
          'Every edits[].find MUST be copied character-for-character from the matching EDITABLE FILE block and occur exactly once.',
          studioExpansion?'STUDIO_QUALITY_EVOLUTION BUILD_UP: return 3-6 connected edits with at least 3 actual source deltas. Keep each replacement concise and directly related so the package finishes within the model budget.':'',
          (presentationDelta||studioExpansion&&/focus=PRESENTATION/i.test(rawPrompt))?'PRESENTATION focus: at least 2 edits must change real visual/render/motion/camera/VFX/UI source so the rendered result can visibly differ; marker-only metadata and gameplay-only edits do not count.':'',
          robloxPresentationDelta?'ROBLOX PRESENTATION PATCH DELTA RECOVERY: prefer an Allowed edit path owned by client/visual/render/UI/camera/VFX code before server/gameplay owners. The candidate must create an observable native visual delta, not a marker.':'',
          robloxPresentationTask?'ROBLOX FULL GRAPHICS CONTRACT: the minimum required core domains are character/enemy, weapon/equipment, environment/terrain, and material/color/style. Additional visual domains are unlimited. Motion is mandatory through TweenService/RenderStepped/Heartbeat/Animator/AnimationTrack/Motor6D/Bone plus an actual CFrame/Transform/Position/Orientation mutation.':'',
          robloxFullGraphicsPackageRecovery?'ROBLOX FULL GRAPHICS RECOVERY PACKAGE: do not collapse recovery to one micro edit. Use a connected edits[] package across distinct exact anchors when needed. The package as a whole must cover every required core visual domain and real native transform motion; a domain may share an edit with another domain, and extra visual domains have no upper limit.':'',
          missingRobloxVisualDomains.length?'MISSING CORE VISUAL DOMAINS TO ADD FIRST: '+missingRobloxVisualDomains.join(', ')+'. Preserve every core domain already present in the previous candidate and add these missing domains without regressing the others.':'',
          previousRobloxGraphicsCandidate?'PREVIOUS VALID PARTIAL ROBLOX GRAPHICS CANDIDATE: reuse its successful visual implementation as a reference, but return a complete candidate against the ORIGINAL editable source with exact find anchors. Do not output a delta against this JSON.':'',
          previousRobloxGraphicsCandidate?'---BEGIN_PREVIOUS_ROBLOX_GRAPHICS_CANDIDATE---':'',
          previousRobloxGraphicsCandidate,
          previousRobloxGraphicsCandidate?'---END_PREVIOUS_ROBLOX_GRAPHICS_CANDIDATE---':'',
          'Do not expand unrelated code.'
        ].filter(Boolean).join('\n'):prefix;
        retryBase=[compactRetryPrefix,...editable].join('\n\n');
      }
    }
  }
  const robloxFullGraphicsPackageInstruction=robloxFullGraphicsPackageRecovery
    ?'Return one strict JSON object whose only top-level key is "edits". Use a connected edits[] package with distinct exact anchors as needed; do not collapse the repair to a one-color, static-UI, or one-anchor micro patch. Across the package, cover character/enemy, weapon/equipment, environment/terrain, material/color/style, and mandatory native motion with an actual CFrame/Transform/Position/Orientation mutation. Additional visual domains are allowed without an upper limit. Every path and find must come exactly from the writable context. No newFiles, replaceFiles, markdown, prose, placeholders, or extra keys.'
    :'';
  const standardRetryInstruction=((attempt>=3||(attempt>=2&&timeoutFailure))&&!studioExpansion&&!systemCausalTestRequired&&!systemSyntaxInvalid&&!systemAtomicPairRequired)
    ?(robloxPresentationTask
      ?'Return exactly one JSON object whose only top-level key is "edits", containing exactly one edit. The single replace block may be larger, but it MUST implement all required Roblox visual core domains plus mandatory native motion in coherent executable source at the exact visual owner anchor. Additional visual domains are allowed without an upper limit. Copy path/find exactly; no placeholders, markdown, or extra keys.'
      :'Return exactly one minimal JSON object whose only top-level key is "edits", containing exactly one edit. Copy edits[0].path exactly from Allowed edit paths and edits[0].find exactly from one provided editable source anchor. Write the actual replacement source in edits[0].replace. Never emit template tokens or placeholder path/find/replace values. Do not include summary, expectedEffect, tests, newFiles, replaceFiles, markdown, comments, or extra keys.')
    :(systemCausalTestRequired||systemSyntaxInvalid||systemAtomicPairRequired)
      ?'Return one strict JSON object with an "edits" array containing at least two exact edits: one for the responsible non-QA system source and one for the responsible qa/*.test.js|mjs|cjs regression file. Both paths and find strings must be copied exactly from editable FILE blocks. The test edit must encode the causal regression so the base fails and the repaired candidate passes.'
      :'Return one strict JSON object only. Use double quotes for every key and string. Escape newlines and quotes inside replacement text. No markdown, comments, trailing commas, or JavaScript object syntax.';
  const correction=allowFullRewrite
    ? [
        'RECOVERY RETRY: the previous generation did not finish or violated the full-file envelope.',
        buildUpDirectiveBlockFromPrompt(rawPrompt),
        `Previous failure: ${reason}`,
        'Return a complete file from start to finish. Keep any valid gameplay idea from the prior attempt, but expand it into a fully playable HTML instead of repeating a tiny shell. Use implementation code only: no explanatory prose, no markdown, and no comments outside the game file.',
        fullWebTargetLine,
        `The parser hard safety range remains ${MIN_FULL_REWRITE_BYTES}-${MAX_FILE_BYTES} UTF-8 bytes, but do not target that floor. The game MUST reach at least ${fullWebTargetMin} bytes and should stay at or below ${fullWebTargetMax} bytes.`,
        'Use substantial executable JavaScript for direct input, persistent-capable state, real progression, an update/render or equivalent state-transition loop, explicit win/loss/result state, restart, and responsive mobile controls. Do not pad with filler text.',
        previousFullWeb?`The previous full-Web candidate was ${previousFullWebBytes} UTF-8 bytes. Expand this actual implementation instead of restarting as a smaller shell. Preserve useful gameplay code and add the missing real systems until the target is reached.`:'',
        previousFullWeb?'---BEGIN_PREVIOUS_FULL_WEB_CANDIDATE---':'',
        previousFullWebExcerpt,
        previousFullWeb?'---END_PREVIOUS_FULL_WEB_CANDIDATE---':'',
        'The response MUST begin with VIBE2_FULL_FILE and MUST end with ---VIBE2_FILE_END---. Finish the game before the limit rather than adding optional polish.'
      ].join('\n')
    : [
        robloxGraphicsInitial?'INITIAL ROBLOX FULL GRAPHICS PACKAGE: generate the complete connected visual package directly from the writable source; this is the first attempt, not a recovery retry.':studioInitial?'STUDIO QUALITY BUILD-UP: generate the connected implementation package directly.':zeroChange?'RECOVERY RETRY: the previous candidate contained zero actual source changes.':noChangeEdit?'RECOVERY RETRY: the previous edit copied the same text without changing source.':editMatchFailure?'RECOVERY RETRY: the previous edits[].find text did not match the writable source.':semanticDiffViolation?'RECOVERY RETRY: the previous candidate crossed the compiled semantic edit budget.':presentationDelta?'RECOVERY RETRY: the previous presentation candidate did not change any actual visible source behavior.':studioQualityDelta?'RECOVERY RETRY: the previous studio-quality candidate was too small for the required connected implementation package.':systemCausalTestRequired?'RECOVERY RETRY: the system architecture candidate did not include the required atomic source plus causal regression-test pair.':systemSyntaxInvalid?'RECOVERY RETRY: the system architecture candidate was syntactically invalid before incremental QA.':timeoutFailure?'RECOVERY RETRY: the previous model response exceeded the time budget.':invalidPath?'RECOVERY RETRY: the previous candidate used an invalid edit path.':'RECOVERY RETRY: the previous candidate was not strict valid JSON.',
        buildUpDirectiveBlockFromPrompt(rawPrompt),
        `Previous failure: ${safeReason}`,
        robloxFullGraphicsPackageInstruction||standardRetryInstruction,
        missingRobloxVisualDomains.length?'MISSING CORE VISUAL DOMAINS TO ADD FIRST: '+missingRobloxVisualDomains.join(', ')+'. Keep every already-satisfied core domain and native motion while adding the missing ones.':'',
        previousRobloxGraphicsCandidate?'Use the previous valid partial candidate below as a preservation reference. Return a complete candidate against the ORIGINAL source and exact anchors; never return edits whose find text exists only inside the previous candidate.':'',
        previousRobloxGraphicsCandidate?'---BEGIN_PREVIOUS_ROBLOX_GRAPHICS_CANDIDATE---':'',
        previousRobloxGraphicsCandidate,
        previousRobloxGraphicsCandidate?'---END_PREVIOUS_ROBLOX_GRAPHICS_CANDIDATE---':'',
        exactPath?`The ONLY writable path is "${exactPath}". Every edits[].path MUST equal exactly "${exactPath}".`:'',
        retryAnchorInstruction,
        zeroChange?'You MUST produce at least one edits[] entry. Use one EXACT FIND ANCHOR OPTION above when available, then make replace materially different. Do not return empty edits/newFiles/replaceFiles.':noChangeEdit?'Return at least one edits[] entry whose replace is materially different from find. Use one EXACT FIND ANCHOR OPTION above when available, then make the smallest real implementation change required by the work order.':editMatchFailure?(studioExpansion?'Return 3-6 connected edits. For every edit, copy a different EXACT FIND ANCHOR OPTION character-for-character; do not paraphrase, normalize, reconstruct, reuse, or guess any find string.':robloxFullGraphicsPackageRecovery?'Use distinct EXACT FIND ANCHOR OPTIONS for the connected edits[] package. Copy every chosen anchor character-for-character and do not reuse, paraphrase, normalize, reconstruct, or guess any find string.':'Use exactly one EXACT FIND ANCHOR OPTION above when available. Copy the entire anchor value character-for-character, including whitespace and punctuation. Do not paraphrase, normalize, reconstruct, or guess source text.'):semanticDiffViolation?'Keep the patch inside the COMPILED EDIT CONTRACT. Touch the primary responsibility and only directly required dependencies. Remove any unrelated economy, combat, progression, save, input, placement, AI, world, interaction, or goal-state mutation not listed in the semantic budget.':presentationDelta?'Use a visual/render anchor when available. The replacement MUST create an actual visible presentation delta through material/color/lighting/mesh/UI/motion/camera/VFX source while preserving gameplay values, save meaning, progression and combat semantics. Do not satisfy this with a version marker, attribute-only metadata, comments, or unrelated gameplay changes.':studioQualityDelta?`${studioInitial?'Return 3-6 connected edits and at least 3 actual source deltas from the first candidate; do not begin with a one-edit micro patch.':'Return 3-6 connected edits and at least 3 actual source deltas; the previous 1-edit micro patch is invalid for BUILD_UP.'} ${/focus=PRESENTATION/i.test(rawPrompt)?'At least 2 edits must be real visual source deltas. ':''}Use distinct exact anchors and keep each replacement concise.`:invalidPath?'Use only the exact writable path copied exactly from Allowed edit paths. Never output placeholders, labels, globs, guessed filenames, or any READ-ONLY path.':'Prefer the smallest responsible edit that satisfies the work order.',
        robloxPresentationTask?'ROBLOX VISUAL OWNER RULE: choose a client/visual/render/UI/camera/VFX owner path first when one is writable. The changed source must cover every minimum required core visual domain plus mandatory native motion; additional visual domains have no upper limit.':'',
        zeroChange||noChangeEdit||invalidPath||editMatchFailure||semanticDiffViolation||presentationDelta||studioQualityDelta||systemCausalTestRequired||systemSyntaxInvalid||timeoutFailure?'Recovery context intentionally contains only writable FILE blocks; do not bypass responsible-file boundaries, widen scope, invent a new file, or expose READ-ONLY paths.':'',
        timeoutFailure&&!systemAtomicPairRequired&&!studioExpansion&&!robloxFullGraphicsPackageRecovery?'Start immediately with the JSON object. Use only the "edits" top-level key and exactly one edit. Keep find to the shortest unique exact source text and keep replace to the smallest coherent implementation that fixes the requested behavior.':systemSyntaxInvalid?'Repair the syntax error while preserving the required source-plus-regression-test atomic candidate. Both changed JavaScript files must pass node --check before incremental QA.':''
      ].filter(Boolean).join('\n');
  const focusedFinal=!allowFullRewrite&&!studioExpansion&&!robloxFullGraphicsPackageRecovery&&!systemCausalTestRequired&&!systemSyntaxInvalid&&!systemAtomicPairRequired&&(attempt>=3||(attempt>=2&&timeoutFailure));
  const fullWebFinal=attempt>=3&&allowFullRewrite;
  const finalInstruction=focusedFinal
    ?(robloxPresentationTask?'FINAL ROBLOX GRAPHICS RETRY: output one JSON object with only the "edits" key and exactly one edit. Copy path/find exactly. The replace block MUST be a coherent composite visual implementation covering every minimum required core domain (character/enemy, weapon/equipment, environment/terrain, material/color/style), any additional useful visual domains without an upper limit, and mandatory native motion with an actual CFrame/Transform/Position/Orientation mutation. Do not reduce this to a one-color or static UI micro-patch. No other keys or prose.':'FINAL FOCUSED RETRY: output one JSON object with only the "edits" key and exactly one edit. Copy path exactly from Allowed edit paths. When EXACT FIND ANCHOR OPTIONS are present, use one entire anchor value verbatim as find. Put actual source code in replace; never output template tokens or placeholders. Keep replace minimal but behaviorally complete. No other keys or prose.')
    :fullWebFinal
      ?`FINAL FULL-WEB RETRY: produce one complete playable index.html replacement of at least ${fullWebTargetMin} UTF-8 bytes and no more than ${fullWebTargetMax} bytes. Include direct mobile input, substantial executable game logic, a real update/render or equivalent state-transition loop, progression, explicit win/loss/result state, restart, responsive layout, and persistent-capable state. Do not stop early. Finish with </html> and the required end marker.`
      :'';
  return retryBase+'\n\n'+correction+(finalInstruction?'\n'+finalInstruction:'');
}
function responseFileForAttempt(responseFile,responseFiles=[],attempt=1){
  const rows=Array.isArray(responseFiles)?responseFiles.map(clean).filter(Boolean):[];
  return rows[attempt-1]||clean(responseFile);
}
export function generationAttemptBudget({allowFullRewrite=false,variant='primary'}={}){
  const speculative=/^speculative-/i.test(clean(variant));
  if(allowFullRewrite)return speculative?SPECULATIVE_FULL_WEB_MAX_GENERATION_ATTEMPTS:FULL_WEB_MAX_GENERATION_ATTEMPTS;
  return speculative?SPECULATIVE_JSON_MAX_GENERATION_ATTEMPTS:MAX_GENERATION_ATTEMPTS;
}

export function fullWebProgressCreditEligible({accumulatedBytes=0,minBytes=FULL_WEB_GENERATION_TARGET_MIN_BYTES,growthBytes=[],repeatedOutputs=0,currentMax=0,attempt=0,fakeResponseCount=0,cap=FULL_WEB_PROGRESSIVE_ADDITIVE_ATTEMPT_CAP}={}){
  const recent=(Array.isArray(growthBytes)?growthBytes:[]).slice(-2).map(Number);
  const healthyGrowth=recent.length===2&&recent.every(value=>Number.isFinite(value)&&value>=1200);
  const fakeCanContinue=Number(fakeResponseCount||0)===0||Number(fakeResponseCount||0)>Number(attempt||0);
  return Number(accumulatedBytes||0)>=FULL_WEB_INITIAL_SEED_TARGET_MIN_BYTES
    &&Number(accumulatedBytes||0)<Number(minBytes||FULL_WEB_GENERATION_TARGET_MIN_BYTES)
    &&healthyGrowth
    &&Number(repeatedOutputs||0)===0
    &&Number(currentMax||0)<Number(cap||FULL_WEB_PROGRESSIVE_ADDITIVE_ATTEMPT_CAP)
    &&fakeCanContinue;
}

export function modelResponseComplete(output,mode='JSON_EDIT'){
  const text=String(output??''),trimmed=text.trimStart();
  if(!trimmed)return false;
  if(mode==='JSON_REPLACE_ONLY'){
    try{const parsed=extractJson(text);return Boolean(parsed&&typeof parsed==='object'&&!Array.isArray(parsed)&&typeof parsed.replace==='string'&&parsed.replace.length>0);}catch{return false;}
  }
  if(mode==='FULL_WEB_EXPANSION')return trimmed.startsWith(FULL_WEB_EXPANSION_PREFIX)&&text.includes(FULL_WEB_EXPANSION_END_MARKER);
  if(mode==='JSON_EDIT_PARTIAL'&&recoverPartialJsonEdit(text,{reason:'timeout'}))return true;
  if(mode==='FULL_WEB'){
    if(trimmed.startsWith(FULL_FILE_PREFIX)){
      if(text.includes(FULL_FILE_END_MARKER))return true;
      const contentAt=text.indexOf(FULL_FILE_CONTENT_MARKER);
      return contentAt>=0&&/<\/html>\s*$/i.test(text.slice(contentAt+FULL_FILE_CONTENT_MARKER.length));
    }
    if(/^\`\`\`(?:html)?\s*/i.test(trimmed))return /<\/html>\s*\`\`\`\s*$/i.test(trimmed);
    return /^(?:<!doctype\s+html\b|<html\b)/i.test(trimmed)&&/<\/html>\s*$/i.test(trimmed);
  }
  try{
    const parsed=extractJson(text);
    return Boolean(parsed&&typeof parsed==='object'&&!Array.isArray(parsed));
  }catch{return false;}
}
async function generateCandidateWithRecovery({prompt,model,responseFile='',responseFiles=[],allowFullRewrite,target,responsibleFiles,sourceRootRelative,sourceRoot='',focusedWebRepair=false,exploration=null,minFullRewriteBytes=MIN_FULL_REWRITE_BYTES,candidateValidator=null,candidateVariant='primary',systemAtomicPairRequired=false}={}){
  let lastError=null;
  let lastRaw='';
  let lastRejectedCandidate=null;
  let accumulatedFullWeb=null;
  let bestFullWebFallbackRaw='';
  let expansionDocumentSeedRecoveries=0;
  let expansionStages=0;
  let repeatedIntermediateOutputs=0;
  const intermediateGrowthBytes=[];
  const expansionStageTargets=[];
  let lastCandidateValidation=null;
  let focusedReplaceAnchorCursor=0;
  let focusedReplaceAnchorRotations=0;
  let focusedReplaceNoOpCreditUsed=false;
  let speculativeFocusedRetryCreditUsed=false;
  let systemAtomicPairCreditUsed=false;
  let diagnosticPostconditionCreditUsed=false;
  let presentationPatchDeltaObserved=false;
  let presentationPatchDeltaCreditUsed=false;
  let studioEditMatchCreditUsed=false;
  let missingPathRecoveries=0;
  let fullWebProgressCreditCount=0;
  let robloxFullGraphicsPackageActive=false;
  const studioExpansion=/\[STUDIO[_ ]QUALITY[_ ]EVOLUTION\]/i.test(String(prompt??''));
  const robloxGraphicsInitial=!allowFullRewrite
    &&/Engine:\s*roblox/i.test(String(prompt??''))
    &&/(?:\[PRESENTATION_PASS:ASSET_ADAPTATION\]|pass=ASSET_ADAPTATION)/i.test(String(prompt??''));
  if(robloxGraphicsInitial)robloxFullGraphicsPackageActive=true;
  const initialStudioPrompt=studioExpansion&&!allowFullRewrite
    ?buildGenerationRetryPrompt(prompt,{allowFullRewrite:false,responsibleFiles,attempt:1,sourceRoot,systemAtomicPairRequired,studioInitial:true})
    :robloxGraphicsInitial
      ?buildGenerationRetryPrompt(prompt,{allowFullRewrite:false,responsibleFiles,attempt:1,sourceRoot,systemAtomicPairRequired,robloxGraphicsInitial:true,robloxFullGraphicsPackageActive:true})
      :prompt;
  const configuredBaseMaxAttempts=generationAttemptBudget({allowFullRewrite,variant:candidateVariant});
  const baseMaxAttempts=studioExpansion&&!allowFullRewrite
    ?Math.min(3,configuredBaseMaxAttempts)
    :configuredBaseMaxAttempts;
  let maxAttempts=baseMaxAttempts;
  let additiveAttemptCreditUsed=false;
  let additiveAttemptCreditLogged=false;
  const speculativeVariant=/^speculative-/i.test(clean(candidateVariant));
  const fakeResponseCount=Array.isArray(responseFiles)?responseFiles.map(clean).filter(Boolean).length:0;
  for(let attempt=1;attempt<=maxAttempts;attempt++){
    if(allowFullRewrite&&accumulatedFullWeb){
      const accumulatedBytes=Buffer.byteLength(accumulatedFullWeb.content,'utf8');
      const additiveLimit=speculativeVariant?SPECULATIVE_FULL_WEB_MAX_ADDITIVE_ATTEMPTS:FULL_WEB_MAX_ADDITIVE_ATTEMPTS;
      const fakeCanSupplyCredit=fakeResponseCount===0||fakeResponseCount>=additiveLimit;
      if(accumulatedBytes<minFullRewriteBytes&&fakeCanSupplyCredit&&additiveLimit>maxAttempts){
        maxAttempts=additiveLimit;
        additiveAttemptCreditUsed=true;
        if(!additiveAttemptCreditLogged){
          console.log(`VIBE2_FULL_WEB_ADDITIVE_ATTEMPT_BUDGET=${baseMaxAttempts}->${maxAttempts}:${candidateVariant}`);
          additiveAttemptCreditLogged=true;
        }
      }
    }
    const retry=attempt>1;
    const robloxAssetAdaptationTask=!allowFullRewrite&&/Engine:\s*roblox/i.test(String(prompt??''))&&/(?:\[PRESENTATION_PASS:ASSET_ADAPTATION\]|pass=ASSET_ADAPTATION)/i.test(String(prompt??''));
    const priorFailureClass=generationFailureClass(lastError);
    const robloxFullGraphicsLateMalformedTrigger=robloxAssetAdaptationTask
      &&priorFailureClass==='MALFORMED_OUTPUT'
      &&attempt>=4;
    if(robloxAssetAdaptationTask&&(ROBLOX_FULL_GRAPHICS_PACKAGE_TRIGGERS.has(priorFailureClass)||robloxFullGraphicsLateMalformedTrigger))robloxFullGraphicsPackageActive=true;
    const robloxFullGraphicsPackageRecovery=robloxAssetAdaptationTask
      &&robloxFullGraphicsPackageActive
      &&ROBLOX_FULL_GRAPHICS_PACKAGE_FAILURES.has(priorFailureClass);
    const timeoutFastEscalation=!allowFullRewrite&&attempt>=2&&priorFailureClass==='TIMEOUT';
    const editMatchFastEscalation=!allowFullRewrite&&attempt>=2&&priorFailureClass==='EDIT_MATCH';
    const malformedFastEscalation=focusedWebRepair&&!allowFullRewrite&&attempt>=2&&priorFailureClass==='MALFORMED_OUTPUT';
    const systemCausalPairRecovery=priorFailureClass==='SYSTEM_CAUSAL_TEST_REQUIRED'||priorFailureClass==='SYSTEM_CANDIDATE_SYNTAX';
    const presentationPatchDeltaRecovery=!allowFullRewrite&&priorFailureClass==='PRESENTATION_PATCH_DELTA';
    const focusedFinal=!allowFullRewrite&&!studioExpansion&&!robloxFullGraphicsPackageRecovery&&!systemAtomicPairRequired&&!systemCausalPairRecovery&&(attempt>=3||timeoutFastEscalation||editMatchFastEscalation||malformedFastEscalation||presentationPatchDeltaRecovery||(speculativeVariant&&attempt>=2));
    const expansionMode=allowFullRewrite&&Boolean(accumulatedFullWeb)&&attempt>1;
    const diagnosticFocusedReplaceOnly=!allowFullRewrite&&!studioExpansion&&!robloxFullGraphicsPackageRecovery
      ?buildDiagnosticFocusedReplaceOnlyPrompt(prompt,{exploration,sourceRoot,responsibleFiles,error:lastError})
      :null;
    const systemAtomicPairCompletion=!allowFullRewrite&&systemAtomicPairRequired&&priorFailureClass==='SYSTEM_CAUSAL_TEST_REQUIRED'
      ?buildSystemAtomicPairCompletionPrompt(prompt,{error:lastError,responsibleFiles,sourceRoot,partialCandidate:lastRejectedCandidate})
      :null;
    const preferredFocusedTargets=unique(exploration?.editContract?.primaryTargets||[]);
    const focusedReplaceOnly=diagnosticFocusedReplaceOnly||(focusedFinal
      ?buildFocusedReplaceOnlyPrompt(prompt,{error:lastError,responsibleFiles,sourceRoot,anchorIndex:focusedReplaceAnchorCursor,preferredTargets:preferredFocusedTargets,presentationRecovery:presentationPatchDeltaObserved})
      :null);
    const remainingStages=Math.max(1,maxAttempts-attempt);
    const retryPreviousOutput=allowFullRewrite&&accumulatedFullWeb&&!expansionMode
      ?accumulatedFullWeb.content
      :(allowFullRewrite&&bestFullWebFallbackRaw?bestFullWebFallbackRaw:lastRaw);
    const attemptPrompt=expansionMode
      ?buildFullWebExpansionPrompt(prompt,accumulatedFullWeb,{stage:expansionStages+1,minBytes:minFullRewriteBytes,maxBytes:Math.max(FULL_WEB_GENERATION_TARGET_MAX_BYTES,minFullRewriteBytes*2),remainingStages,previousFailure:lastError?.message||'',capabilityTarget:fullWebExpansionStageTarget(accumulatedFullWeb.content,expansionStages+1)})
      :(systemAtomicPairCompletion?.prompt||focusedReplaceOnly?.prompt||(retry?buildGenerationRetryPrompt(prompt,{allowFullRewrite,error:lastError,responsibleFiles,attempt,previousOutput:retryPreviousOutput,sourceRoot,systemAtomicPairRequired,robloxFullGraphicsPackageActive:robloxFullGraphicsPackageRecovery}):initialStudioPrompt));
    const maxPredict=expansionMode
      ?FULL_WEB_EXPANSION_MAX_PREDICT
      :(allowFullRewrite
        ?(attempt>=maxAttempts?FULL_WEB_FINAL_RETRY_MAX_PREDICT:(retry?FULL_WEB_RETRY_MAX_PREDICT:FULL_WEB_MAX_PREDICT))
        :((systemAtomicPairCompletion||focusedReplaceOnly)?(robloxAssetAdaptationTask?JSON_RETRY_MAX_PREDICT:JSON_FOCUSED_REPLACE_MAX_PREDICT):(focusedFinal?JSON_FINAL_RETRY_MAX_PREDICT:(focusedWebRepair?FOCUSED_WEB_REPAIR_MAX_PREDICT:(retry?JSON_RETRY_MAX_PREDICT:DEFAULT_MAX_PREDICT)))));
    const timeoutMs=expansionMode
      ?FULL_WEB_EXPANSION_TIMEOUT_MS
      :(allowFullRewrite
        ?(attempt>=maxAttempts?FULL_WEB_FINAL_RETRY_TIMEOUT_MS:(retry?FULL_WEB_RETRY_TIMEOUT_MS:FULL_WEB_TIMEOUT_MS))
        :((systemAtomicPairCompletion||focusedReplaceOnly)?(robloxAssetAdaptationTask?JSON_RETRY_TIMEOUT_MS:JSON_FOCUSED_REPLACE_TIMEOUT_MS):(focusedFinal?JSON_FINAL_RETRY_TIMEOUT_MS:(retry?JSON_RETRY_TIMEOUT_MS:DEFAULT_TIMEOUT_MS))));
    const contextWindow=expansionMode
      ?FULL_WEB_EXPANSION_CONTEXT_WINDOW
      :(allowFullRewrite?FULL_WEB_CONTEXT_WINDOW:((systemAtomicPairCompletion||focusedReplaceOnly)?(robloxAssetAdaptationTask?JSON_CONTEXT_WINDOW:JSON_FOCUSED_REPLACE_CONTEXT_WINDOW):(focusedFinal?JSON_FINAL_CONTEXT_WINDOW:(focusedWebRepair?FOCUSED_WEB_REPAIR_CONTEXT_WINDOW:JSON_CONTEXT_WINDOW))));
    const fake=responseFileForAttempt(responseFile,responseFiles,attempt);
    const attemptPromptBytes=Buffer.byteLength(attemptPrompt,'utf8');
    if(allowFullRewrite&&retry)console.log(`VIBE2_FULL_WEB_RETRY_PROMPT_BYTES=${attempt}:${attemptPromptBytes}`);
    const studioExactAnchorRecovery=studioExpansion&&priorFailureClass==='EDIT_MATCH';
    const temperature=systemAtomicPairCompletion?0.14:(focusedReplaceOnly?0.26:(expansionMode?Math.min(0.26,0.18+expansionStages*0.04):(studioExactAnchorRecovery?0.08:(retry?(attempt>=3?0.22:0.16):0.08))));
    const focusedFirstEditEarlyStop=focusedWebRepair&&!retry&&!allowFullRewrite&&!focusedReplaceOnly&&!robloxAssetAdaptationTask;
    const completionMode=(systemAtomicPairCompletion||focusedReplaceOnly)?'JSON_REPLACE_ONLY':(expansionMode?'FULL_WEB_EXPANSION':(allowFullRewrite?'FULL_WEB':(((timeoutFastEscalation||focusedFirstEditEarlyStop)&&!robloxFullGraphicsPackageRecovery)?'JSON_EDIT_PARTIAL':'JSON_EDIT')));
    try{
      const raw=await requestLocalModel(attemptPrompt,{model,responseFile:fake,maxPredict,timeoutMs,contextWindow,temperature,completionMode});
      lastRaw=raw;
      const fullWebClosedHtmlEarlyStop=completionMode==='FULL_WEB'
        && String(raw).trimStart().startsWith(FULL_FILE_PREFIX)
        && !String(raw).includes(FULL_FILE_END_MARKER)
        && String(raw).includes(FULL_FILE_CONTENT_MARKER)
        && /<\/html>\s*$/i.test(String(raw).slice(String(raw).indexOf(FULL_FILE_CONTENT_MARKER)+FULL_FILE_CONTENT_MARKER.length));
      const streamedPartialEdit=completionMode==='JSON_EDIT_PARTIAL'?recoverPartialJsonEdit(raw,{reason:focusedFirstEditEarlyStop?'stream':'timeout'}):null;
      let candidate;
      if(expansionMode){
        const stageTarget=fullWebExpansionStageTarget(accumulatedFullWeb.content,expansionStages+1);
        expansionStageTargets.push(stageTarget.capability);
        const fragment=parseFullWebExpansion(raw)||parseLooseFullWebExpansion(raw);
        if(fragment){
          const beforeBytes=Buffer.byteLength(accumulatedFullWeb.content,'utf8');
          const composed=insertFullWebExpansion(accumulatedFullWeb.content,fragment);
          const afterBytes=Buffer.byteLength(composed,'utf8');
          const growth=afterBytes-beforeBytes;
          if(growth<800||composed===accumulatedFullWeb.content){
            repeatedIntermediateOutputs+=1;
            throw new Error(`FULL_WEB_EXPANSION_TOO_SMALL:${growth}:min=800`);
          }
          intermediateGrowthBytes.push(growth);
          accumulatedFullWeb={...accumulatedFullWeb,content:composed};
          expansionStages+=1;
          candidate=normalizeCandidate({
            summary:accumulatedFullWeb.summary||'Vibe2 expanded full Web candidate',
            expectedEffect:accumulatedFullWeb.expectedEffect||'validator-scale playable Web implementation',
            edits:[],newFiles:[],
            replaceFiles:[{path:accumulatedFullWeb.path,content:composed}],
            tests:accumulatedFullWeb.tests||[]
          },{target,responsibleFiles,sourceRootRelative,allowFullRewrite:true,minFullRewriteBytes});
        }else{
          candidate=normalizeCandidate(raw,{target,responsibleFiles,sourceRootRelative,allowFullRewrite,minFullRewriteBytes});
        }
      }else{
        const focusedRaw=systemAtomicPairCompletion
          ?normalizeSystemAtomicPairCompletion(raw,systemAtomicPairCompletion)
          :(focusedReplaceOnly?normalizeFocusedReplaceOnly(raw,focusedReplaceOnly.spec):(streamedPartialEdit||raw));
        const missingPathRecovery=!allowFullRewrite
          ?recoverMissingEditPaths(focusedRaw,{responsibleFiles,sourceRoot})
          :{value:focusedRaw,recovered:0};
        if(missingPathRecovery.recovered){
          missingPathRecoveries+=missingPathRecovery.recovered;
          console.log(`VIBE2_MISSING_EDIT_PATH_RECOVERED=${attempt}:${missingPathRecovery.recovered}`);
        }
        candidate=normalizeCandidate(missingPathRecovery.value,{target,responsibleFiles,sourceRootRelative,allowFullRewrite,minFullRewriteBytes});
      }
      lastRejectedCandidate=candidate;
      if(candidate.edits.length&&sourceRoot&&fs.existsSync(sourceRoot))applyExactEdits(sourceRoot,candidate.edits,{dryRun:true});
      lastCandidateValidation=typeof candidateValidator==='function'?candidateValidator(candidate):null;
      return {candidate,candidateValidation:lastCandidateValidation,generation:{attempts:attempt,recoveryUsed:retry,robloxFullGraphicsInitialPackage:robloxGraphicsInitial,partialTimeoutRecovery:Boolean(streamedPartialEdit)&&!focusedFirstEditEarlyStop,streamedPartialEditRecovery:Boolean(streamedPartialEdit),focusedFirstEditEarlyStop:Boolean(streamedPartialEdit)&&focusedFirstEditEarlyStop,focusedFinalRetry:focusedFinal,focusedReplaceOnly:focusedReplaceOnly!=null,systemAtomicPairCompletion:systemAtomicPairCompletion!=null,focusedFirstAttemptFastPath:focusedWebRepair&&attempt===1&&focusedReplaceOnly!=null,malformedFastEscalation,focusedReplaceAnchorRotations,focusedReplaceNoOpCreditUsed,focusedWebRepair,fullWebClosedHtmlEarlyStop,fullWebFinalAdditiveExpansion:expansionMode&&attempt===maxAttempts,fullWebAdditiveAttemptCreditUsed:additiveAttemptCreditUsed,fullWebProgressCreditCount,fullWebProgressCreditUsed:fullWebProgressCreditCount>0,missingPathRecoveries,baseAttemptBudget:baseMaxAttempts,effectiveAttemptBudget:maxAttempts,fullWebRetryPromptCompacted:allowFullRewrite&&retry,fullWebRetryPromptBytes:allowFullRewrite&&retry?attemptPromptBytes:0,fullWebExpansionStages:expansionStages,fullWebExpansionDocumentSeedRecoveries:expansionDocumentSeedRecoveries,fullWebFallbackBestPartialBytes:Buffer.byteLength(bestFullWebFallbackRaw,'utf8'),intermediateGrowthBytes:[...intermediateGrowthBytes],repeatedIntermediateOutputs,expansionStageTargets:[...expansionStageTargets],mode:allowFullRewrite?'FULL_WEB':'JSON_EDIT',maxPredict,timeoutMs,contextWindow,temperature,completionMode}};
    }catch(error){
      lastError=error;
      const partialOutput=String(error?.vibe2PartialOutput??'');
      if(partialOutput.trim())lastRaw=partialOutput;
      const failureClass=generationFailureClass(error);
      if(failureClass==='PRESENTATION_PATCH_DELTA')presentationPatchDeltaObserved=true;
      if(allowFullRewrite&&lastRaw.trim()&&Buffer.byteLength(lastRaw,'utf8')>Buffer.byteLength(bestFullWebFallbackRaw,'utf8')){
        bestFullWebFallbackRaw=lastRaw;
      }
      if(focusedReplaceOnly&&['TIMEOUT','MALFORMED_OUTPUT'].includes(failureClass)){
        const focusedPartial=partialOutput.trim()?partialOutput:lastRaw;
        const recoveredFocused=focusedPartial.trim()?recoverFocusedReplaceOnly(focusedPartial,focusedReplaceOnly.spec):null;
        if(recoveredFocused){
          try{
            const focusedCandidate=normalizeCandidate(recoveredFocused,{target,responsibleFiles,sourceRootRelative,allowFullRewrite:false,minFullRewriteBytes});
            if(focusedCandidate.edits.length&&sourceRoot&&fs.existsSync(sourceRoot))applyExactEdits(sourceRoot,focusedCandidate.edits,{dryRun:true});
            lastCandidateValidation=typeof candidateValidator==='function'?candidateValidator(focusedCandidate):null;
            console.log('VIBE2_FOCUSED_REPLACE_STRING_RECOVERED='+attempt+':'+failureClass+':'+focusedReplaceOnly.spec.path);
            return{candidate:focusedCandidate,candidateValidation:lastCandidateValidation,generation:{attempts:attempt,recoveryUsed:true,partialTimeoutRecovery:failureClass==='TIMEOUT',partialMalformedRecovery:failureClass==='MALFORMED_OUTPUT',streamedPartialEditRecovery:false,focusedReplaceStringRecovery:true,focusedFinalRetry:focusedFinal,focusedReplaceOnly:true,focusedFirstAttemptFastPath:focusedWebRepair&&attempt===1,focusedReplaceAnchorRotations,focusedReplaceNoOpCreditUsed,focusedWebRepair,fullWebExpansionStages:expansionStages,intermediateGrowthBytes:[...intermediateGrowthBytes],repeatedIntermediateOutputs,expansionStageTargets:[...expansionStageTargets],mode:'JSON_EDIT',maxPredict,timeoutMs,contextWindow,temperature,completionMode}};
          }catch(recoveryError){
            console.log('VIBE2_FOCUSED_REPLACE_STRING_REJECTED='+attempt+':'+generationFailureClass(recoveryError)+':'+clean(recoveryError?.message||recoveryError).replace(/\s+/g,' ').slice(0,240));
          }
        }
      }
      let focusedNoOpCreditRetry=false;
      if(focusedReplaceOnly&&failureClass==='PRESENTATION_PATCH_DELTA'){
        focusedReplaceAnchorCursor+=1;
        focusedReplaceAnchorRotations+=1;
        console.log('VIBE2_PRESENTATION_PATCH_DELTA_ANCHOR_ROTATE='+attempt+':anchor='+(focusedReplaceAnchorCursor+1));
      }
      if(focusedReplaceOnly&&failureClass==='NO_OP'){
        focusedReplaceAnchorCursor+=1;
        focusedReplaceAnchorRotations+=1;
        if(speculativeVariant&&attempt>=maxAttempts&&!focusedReplaceNoOpCreditUsed){
          const alternate=focusedReplaceOnlySpec(prompt,{responsibleFiles,sourceRoot,anchorIndex:focusedReplaceAnchorCursor,preferredTargets:preferredFocusedTargets});
          if(alternate&&alternate.find&&alternate.find!==focusedReplaceOnly.spec.find){
            maxAttempts=attempt+1;
            focusedReplaceNoOpCreditUsed=true;
            focusedNoOpCreditRetry=true;
            console.log(`VIBE2_FOCUSED_REPLACE_NOOP_CREDIT=${attempt}->${maxAttempts}:${candidateVariant}:anchor=${focusedReplaceAnchorCursor+1}`);
          }
        }
      }
      const partialRecoveryClass=!allowFullRewrite&&['TIMEOUT','MALFORMED_OUTPUT'].includes(failureClass)?failureClass:'';
      const partialRecoveryOutput=partialRecoveryClass==='TIMEOUT'?partialOutput:(partialRecoveryClass==='MALFORMED_OUTPUT'?lastRaw:'');
      if(partialRecoveryClass&&partialRecoveryOutput.trim()){
        const recoveredPartial=recoverPartialJsonEdit(partialRecoveryOutput,{reason:partialRecoveryClass==='MALFORMED_OUTPUT'?'malformed':'timeout'});
        if(recoveredPartial){
          try{
            const candidate=normalizeCandidate(recoveredPartial,{target,responsibleFiles,sourceRootRelative,allowFullRewrite:false,minFullRewriteBytes});
            if(candidate.edits.length&&sourceRoot&&fs.existsSync(sourceRoot))applyExactEdits(sourceRoot,candidate.edits,{dryRun:true});
            lastCandidateValidation=typeof candidateValidator==='function'?candidateValidator(candidate):null;
            const recoveryMarker=partialRecoveryClass==='MALFORMED_OUTPUT'?'VIBE2_MALFORMED_PARTIAL_EDIT_RECOVERED':'VIBE2_TIMEOUT_PARTIAL_EDIT_RECOVERED';
            console.log(`${recoveryMarker}=${attempt}:${candidate.edits[0]?.path||''}`);
            return{
              candidate,
              candidateValidation:lastCandidateValidation,
              generation:{
                attempts:attempt,
                recoveryUsed:true,
                partialTimeoutRecovery:partialRecoveryClass==='TIMEOUT',
                partialMalformedRecovery:partialRecoveryClass==='MALFORMED_OUTPUT',
                focusedFinalRetry:focusedFinal,
                focusedWebRepair,
                fullWebExpansionStages:expansionStages,
                intermediateGrowthBytes:[...intermediateGrowthBytes],
                repeatedIntermediateOutputs,
                expansionStageTargets:[...expansionStageTargets],
                mode:'JSON_EDIT',
                maxPredict,
                timeoutMs,
                contextWindow,
                temperature,
                completionMode
              }
            };
          }catch(recoveryError){
            const rejectMarker=partialRecoveryClass==='MALFORMED_OUTPUT'?'VIBE2_MALFORMED_PARTIAL_EDIT_REJECTED':'VIBE2_TIMEOUT_PARTIAL_EDIT_REJECTED';
            console.log(`${rejectMarker}=${attempt}:${generationFailureClass(recoveryError)}:${clean(recoveryError?.message||recoveryError).replace(/\s+/g,' ').slice(0,240)}`);
          }
        }
      }
      if(allowFullRewrite&&['FULL_REWRITE_SIZE','TIMEOUT','MALFORMED_OUTPUT'].includes(failureClass)){
        let recovered=recoverFullWebSeed(lastRaw,{target,responsibleFiles,sourceRootRelative});
        if(!recovered&&expansionMode){
          recovered=recoverFullWebExpansionDocumentSeed(lastRaw,{target,responsibleFiles,sourceRootRelative});
          if(recovered){
            expansionDocumentSeedRecoveries+=1;
            console.log(`VIBE2_FULL_WEB_EXPANSION_DOCUMENT_SEED_RECOVERED=${attempt}:${Buffer.byteLength(recovered.content,'utf8')}`);
          }
        }
        if(recovered){
          const recoveredBytes=Buffer.byteLength(recovered.content,'utf8'),currentBytes=accumulatedFullWeb?Buffer.byteLength(accumulatedFullWeb.content,'utf8'):0;
          if(recoveredBytes>currentBytes){
            if(currentBytes>0)intermediateGrowthBytes.push(recoveredBytes-currentBytes);
            accumulatedFullWeb=recovered;
          }else if(accumulatedFullWeb&&recovered.content===accumulatedFullWeb.content){
            repeatedIntermediateOutputs+=1;
          }
        }
      }
      let studioEditMatchCreditRetry=false;
      if(!allowFullRewrite&&studioExpansion&&failureClass==='EDIT_MATCH'&&attempt>=maxAttempts&&!studioEditMatchCreditUsed){
        maxAttempts=attempt+1;
        studioEditMatchCreditUsed=true;
        studioEditMatchCreditRetry=true;
        console.log(`VIBE2_STUDIO_EDIT_MATCH_CREDIT=${attempt}->${maxAttempts}:${candidateVariant}`);
      }
      let speculativeFocusedRetryCredit=false;
      if(!allowFullRewrite&&speculativeVariant&&!systemAtomicPairRequired&&failureClass!=='DIAGNOSTIC_POSTCONDITION'&&focusedFinalRetryAllowed(error)&&attempt>=maxAttempts&&!speculativeFocusedRetryCreditUsed&&!focusedNoOpCreditRetry&&!studioEditMatchCreditRetry){
        maxAttempts=attempt+1;
        speculativeFocusedRetryCreditUsed=true;
        speculativeFocusedRetryCredit=true;
        console.log(`VIBE2_SPECULATIVE_FOCUSED_RETRY_CREDIT=${attempt}->${maxAttempts}:${candidateVariant}:${failureClass}`);
      }
      const robloxFullGraphicsRecoveryRetry=!allowFullRewrite
        &&robloxAssetAdaptationTask
        &&ROBLOX_FULL_GRAPHICS_PACKAGE_FAILURES.has(failureClass)
        &&attempt<configuredBaseMaxAttempts;
      if(robloxFullGraphicsRecoveryRetry)console.log(`VIBE2_ROBLOX_FULL_GRAPHICS_RECOVERY_RETRY=${attempt}->${attempt+1}:${candidateVariant}:${failureClass}`);
      const presentationRecoveryRetry=!allowFullRewrite&&presentationPatchDeltaObserved&&focusedFinalRetryAllowed(error)&&attempt<configuredBaseMaxAttempts;
      let presentationPatchDeltaCreditRetry=false;
      if(!allowFullRewrite&&presentationPatchDeltaObserved&&focusedFinalRetryAllowed(error)&&attempt>=maxAttempts&&attempt<configuredBaseMaxAttempts&&!presentationPatchDeltaCreditUsed){
        maxAttempts=Math.min(configuredBaseMaxAttempts,attempt+1);
        presentationPatchDeltaCreditUsed=true;
        presentationPatchDeltaCreditRetry=maxAttempts>attempt;
        if(presentationPatchDeltaCreditRetry)console.log('VIBE2_PRESENTATION_RECOVERY_CREDIT='+attempt+'->'+maxAttempts+':'+candidateVariant+':'+failureClass);
      }
      let diagnosticPostconditionCreditRetry=false;
      if(!allowFullRewrite&&failureClass==='DIAGNOSTIC_POSTCONDITION'&&diagnosticFocusedReplaceOnly&&attempt>=maxAttempts&&!diagnosticPostconditionCreditUsed){
        maxAttempts=attempt+1;
        diagnosticPostconditionCreditUsed=true;
        diagnosticPostconditionCreditRetry=true;
        console.log(`VIBE2_DIAGNOSTIC_POSTCONDITION_CREDIT=${attempt}->${maxAttempts}:${candidateVariant}:${diagnosticFocusedReplaceOnly.spec.diagnosticType}`);
      }
      let systemAtomicPairCreditRetry=false;
      if(!allowFullRewrite&&systemAtomicPairRequired&&focusedFinalRetryAllowed(error)&&attempt>=maxAttempts&&!systemAtomicPairCreditUsed){
        maxAttempts=attempt+1;
        systemAtomicPairCreditUsed=true;
        systemAtomicPairCreditRetry=true;
        console.log(`VIBE2_SYSTEM_ATOMIC_PAIR_CREDIT=${attempt}->${maxAttempts}:${candidateVariant}:${failureClass}`);
      }
      let progressiveFullWebCreditRetry=false;
      if(allowFullRewrite&&accumulatedFullWeb&&attempt>=maxAttempts){
        const accumulatedBytes=Buffer.byteLength(accumulatedFullWeb.content,'utf8');
        if(fullWebProgressCreditEligible({
          accumulatedBytes,
          minBytes:minFullRewriteBytes,
          growthBytes:intermediateGrowthBytes,
          repeatedOutputs:repeatedIntermediateOutputs,
          currentMax:maxAttempts,
          attempt,
          fakeResponseCount,
          cap:FULL_WEB_PROGRESSIVE_ADDITIVE_ATTEMPT_CAP
        })){
          const before=maxAttempts;
          maxAttempts=Math.min(FULL_WEB_PROGRESSIVE_ADDITIVE_ATTEMPT_CAP,maxAttempts+1);
          fullWebProgressCreditCount+=1;
          progressiveFullWebCreditRetry=maxAttempts>before;
          if(progressiveFullWebCreditRetry){
            const lastGrowth=Number(intermediateGrowthBytes.at(-1)||0);
            console.log(`VIBE2_FULL_WEB_PROGRESS_CREDIT=${before}->${maxAttempts}:bytes=${accumulatedBytes}:last-growth=${lastGrowth}`);
          }
        }
      }
      const attemptOutputBytes=lastRaw?Buffer.byteLength(String(lastRaw),'utf8'):0;
      console.log(`VIBE2_GENERATION_ATTEMPT_FAILURE=${attempt}:${failureClass}:${clean(error?.message||error).replace(/\s+/g,' ').slice(0,360)}`);
      console.log(`VIBE2_GENERATION_ATTEMPT_OUTPUT_BYTES=${attempt}:${attemptOutputBytes}`);
      if(accumulatedFullWeb)console.log(`VIBE2_FULL_WEB_ACCUMULATED_BYTES=${attempt}:${Buffer.byteLength(accumulatedFullWeb.content,'utf8')}`);
      if(intermediateGrowthBytes.length)console.log(`VIBE2_FULL_WEB_INTERMEDIATE_GROWTH=${attempt}:${intermediateGrowthBytes.join(',')}`);
      if(repeatedIntermediateOutputs)console.log(`VIBE2_FULL_WEB_REPEATED_INTERMEDIATE=${attempt}:${repeatedIntermediateOutputs}`);
      const ordinaryRetry=attempt===1&&shouldRetryGenerationError(error);
      const focusedRetry=attempt===2&&!allowFullRewrite&&focusedFinalRetryAllowed(error);
      const fullWebAccumulationRetry=allowFullRewrite&&Boolean(accumulatedFullWeb)&&attempt<maxAttempts&&(['FULL_REWRITE_SIZE','MALFORMED_OUTPUT','TIMEOUT'].includes(failureClass)||/FULL_WEB_EXPANSION_(?:NO_GROWTH|TOO_SMALL)/.test(clean(error?.message)));
      const fullWebFallbackRetry=allowFullRewrite&&!accumulatedFullWeb&&attempt===2&&fullWebFinalRetryAllowed(error)&&attempt<maxAttempts;
      const hasAnother=ordinaryRetry||focusedRetry||robloxFullGraphicsRecoveryRetry||presentationRecoveryRetry||focusedNoOpCreditRetry||studioEditMatchCreditRetry||speculativeFocusedRetryCredit||presentationPatchDeltaCreditRetry||diagnosticPostconditionCreditRetry||systemAtomicPairCreditRetry||progressiveFullWebCreditRetry||fullWebAccumulationRetry||fullWebFallbackRetry;
      const fakeSequence=Array.isArray(responseFiles)&&responseFiles.filter(Boolean).length>attempt;
      if(!hasAnother||(responseFile&&!fakeSequence)){
        error.vibe2GenerationAttempts=attempt;
        error.vibe2GenerationFailureClass=failureClass;
        throw error;
      }
    }
  }
  throw lastError||new Error('candidate generation failed');
}
async function requestLocalModel(prompt,{model=DEFAULT_MODEL,responseFile='',maxPredict=DEFAULT_MAX_PREDICT,timeoutMs=DEFAULT_TIMEOUT_MS,contextWindow=0,temperature=.08,completionMode='JSON_EDIT'}={}){const fake=clean(responseFile||process.env.VIBE2_MODEL_RESPONSE_FILE);if(fake)return fs.readFileSync(path.resolve(fake),'utf8');const options={num_predict:maxPredict,temperature:Math.max(.02,Math.min(.4,Number(temperature)||.08))};if(contextWindow>0)options.num_ctx=contextWindow;const body=JSON.stringify({model,prompt,stream:true,think:false,...(/^JSON_/.test(completionMode)?{format:'json'}:{}),options});return await new Promise((resolve,reject)=>{let settled=false,request=null,pending='',output='';const finish=(error,value='')=>{if(settled)return;settled=true;clearTimeout(timer);if(request&&!request.destroyed)request.destroy();if(error)reject(error);else resolve(value);};const timer=setTimeout(()=>{const error=new Error(`Ollama 응답 시간 초과: ${timeoutMs}ms`);error.vibe2PartialOutput=output;finish(error);},timeoutMs);request=http.request({hostname:'127.0.0.1',port:11434,path:'/api/generate',method:'POST',headers:{'content-type':'application/json','content-length':Buffer.byteLength(body)}},response=>{if((response.statusCode||0)<200||(response.statusCode||0)>=300){response.resume();finish(new Error(`Ollama HTTP ${response.statusCode}`));return;}response.setEncoding('utf8');const consume=line=>{const text=line.trim();if(!text)return;let payload;try{payload=JSON.parse(text);}catch(error){throw new Error(`Ollama 스트림 JSON 파싱 실패: ${error.message}`);}if(payload?.error)throw new Error(`Ollama 오류: ${payload.error}`);if(typeof payload?.response==='string'){output+=payload.response;if(modelResponseComplete(output,completionMode))finish(null,output);}};response.on('data',chunk=>{if(settled)return;try{pending+=chunk;let at;while((at=pending.indexOf('\n'))>=0){const line=pending.slice(0,at);pending=pending.slice(at+1);consume(line);if(settled)return;}}catch(error){finish(error);}});response.on('end',()=>{if(settled)return;try{if(pending.trim())consume(pending);if(settled)return;if(!output.trim())throw new Error('Ollama 응답 비어 있음');finish(null,output);}catch(error){finish(error);}});response.on('error',finish);});request.on('error',finish);request.end(body);});}
function currentBranch(cwd){try{return clean(execFileSync('git',['rev-parse','--abbrev-ref','HEAD'],{cwd,encoding:'utf8'}));}catch{return'';}}
function assertCandidateBranch(cwd){const branch=currentBranch(cwd);if(!branch||branch==='main'||branch==='master'||!branch.startsWith('vibe2/candidate/'))throw new Error(`source 적용은 vibe2/candidate/* 브랜치에서만 허용: ${branch||'unknown'}`);return branch;}
function unityWebBootstrapScaffold(sourceRootRelative=''){
  const gameId=posix(sourceRootRelative).split('/').pop()||'unity-web-game';
  const safeProduct=gameId.replace(/[^a-zA-Z0-9 _.-]+/g,' ').trim()||'Unity Web Game';
  const buildScript=`// 파일명: WebBuild.cs
using System;
using System.IO;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;

namespace JaewoonGames.UnityWeb.Editor
{
    public static class WebBuild
    {
        private const string ScenePath = "Assets/Scenes/Main.unity";

        public static void BuildWeb()
        {
            if (!AssetDatabase.IsValidFolder("Assets/Scenes"))
                AssetDatabase.CreateFolder("Assets", "Scenes");

            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            if (!EditorSceneManager.SaveScene(scene, ScenePath))
                throw new InvalidOperationException("UNITY_WEB_SCENE_SAVE_FAILED");

            EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(ScenePath, true) };
            if (!EditorUserBuildSettings.SwitchActiveBuildTarget(BuildTargetGroup.WebGL, BuildTarget.WebGL))
                throw new InvalidOperationException("UNITY_WEB_TARGET_SWITCH_FAILED");

            PlayerSettings.companyName = "Jaewoon Games";
            PlayerSettings.productName = "${safeProduct}";

            var repoRoot = Path.GetFullPath(Path.Combine(Application.dataPath, "..", "..", ".."));
            var output = Path.Combine(repoRoot, "build", "WebGL", "${gameId}");
            Directory.CreateDirectory(output);

            var report = BuildPipeline.BuildPlayer(new BuildPlayerOptions
            {
                scenes = new[] { ScenePath },
                locationPathName = output,
                target = BuildTarget.WebGL,
                options = BuildOptions.Development
            });
            if (report.summary.result != BuildResult.Succeeded)
                throw new InvalidOperationException("UNITY_WEB_BUILD_FAILED:" + report.summary.result);
            var index = Path.Combine(output, "index.html");
            if (!File.Exists(index) || new FileInfo(index).Length <= 0)
                throw new InvalidOperationException("UNITY_WEB_INDEX_MISSING");
        }
    }
}
`;
  const coreStub=`// 파일명: GameCore.cs
using UnityEngine;

namespace JaewoonGames.Generated
{
    public sealed class GameCore : MonoBehaviour
    {
        // Vibe가 승인 설계의 실제 상태/규칙/세이브 책임으로 교체한다.
    }
}
`;
  const runtimeStub=`// 파일명: RuntimeBootstrap.cs
using UnityEngine;

namespace JaewoonGames.Generated
{
    public sealed class RuntimeBootstrap : MonoBehaviour
    {
        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        private static void AutoStart()
        {
            var go = new GameObject("RuntimeBootstrap");
            DontDestroyOnLoad(go);
            go.AddComponent<RuntimeBootstrap>();
        }

        private void Start()
        {
            Debug.Log("JAEWOON_UNITY_WEB_QA BOOT game=${gameId} status=BOOTSTRAP_STUB");
        }
    }
}
`;
  return{
    'Packages/manifest.json':JSON.stringify({dependencies:{'com.unity.inputsystem':'1.17.0'}},null,2)+'\n',
    'ProjectSettings/ProjectVersion.txt':'m_EditorVersion: 6000.6.0f1\nm_EditorVersionWithRevision: 6000.6.0f1 (f7f8ed4d1e24)\n',
    'Assets/Editor/WebBuild.cs':buildScript,
    'Assets/Scripts/GameCore.cs':coreStub,
    'Assets/Scripts/RuntimeBootstrap.cs':runtimeStub
  };
}
function writeUnityWebBootstrapScaffold(root,sourceRootRelative){
  const files=unityWebBootstrapScaffold(sourceRootRelative),changed=[];
  for(const [relative,content] of Object.entries(files)){
    const target=path.join(root,relative);
    fs.mkdirSync(path.dirname(target),{recursive:true});
    if(!fs.existsSync(target)){
      fs.writeFileSync(target,content,'utf8');
      changed.push(relative);
    }
  }
  return changed;
}
function applyNewFiles(root,newFiles){const changed=[];for(const file of newFiles){const target=path.join(root,file.path);if(fs.existsSync(target))throw new Error(`newFiles 대상이 이미 존재함: ${file.path}`);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,file.content,'utf8');changed.push(file.path);}return changed;}
function applyReplaceFiles(root,replaceFiles,{allowCreate=false}={}){const changed=[];for(const file of replaceFiles){const target=path.join(root,file.path);const exists=fs.existsSync(target)&&fs.statSync(target).isFile();if(!exists&&!allowCreate)throw new Error(`replaceFiles 대상 없음: ${file.path}`);if(!exists)fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,file.content.endsWith('\n')?file.content:`${file.content}\n`,'utf8');changed.push(file.path);}return changed;}
function createCandidateSnapshot(sourceRoot,candidateRoot,candidate,{scaffoldFiles=null}={}){
  const changed=[],filesRoot=path.join(candidateRoot,'files');
  if(scaffoldFiles){
    for(const [relative,content] of Object.entries(scaffoldFiles)){
      const target=path.join(filesRoot,relative);
      fs.mkdirSync(path.dirname(target),{recursive:true});
      fs.writeFileSync(target,content,'utf8');
      changed.push(relative);
    }
  }
  for(const relative of unique(candidate.edits.map(edit=>edit.path))){
    const target=path.join(filesRoot,relative);
    if(!fs.existsSync(target)){
      const source=path.join(sourceRoot,relative);
      fs.mkdirSync(path.dirname(target),{recursive:true});
      fs.copyFileSync(source,target);
    }
  }
  if(candidate.edits.length)changed.push(...applyExactEdits(filesRoot,candidate.edits));
  for(const file of candidate.newFiles){
    const target=path.join(filesRoot,file.path);
    fs.mkdirSync(path.dirname(target),{recursive:true});
    fs.writeFileSync(target,file.content,'utf8');
    changed.push(file.path);
  }
  for(const file of candidate.replaceFiles){
    const target=path.join(filesRoot,file.path);
    fs.mkdirSync(path.dirname(target),{recursive:true});
    fs.writeFileSync(target,file.content.endsWith('\n')?file.content:`${file.content}\n`,'utf8');
    changed.push(file.path);
  }
  return[...new Set(changed)];
}
function validateSystemCandidateSyntax({candidate,sourceRoot}={}){
  const touched=unique([
    ...(candidate?.edits||[]).map(row=>row.path),
    ...(candidate?.newFiles||[]).map(row=>row.path),
    ...(candidate?.replaceFiles||[]).map(row=>row.path)
  ]).filter(file=>/\.(?:mjs|js|cjs)$/i.test(file));
  if(!touched.length)return{pass:true,files:[]};
  const tempRoot=fs.mkdtempSync(path.join(os.tmpdir(),'vibe2-system-syntax-'));
  try{
    for(const relative of unique((candidate?.edits||[]).map(row=>row.path))){
      const source=path.join(sourceRoot,relative),target=path.join(tempRoot,relative);
      if(!fs.existsSync(source)||!fs.statSync(source).isFile())throw new Error('SYSTEM_CANDIDATE_SYNTAX_INVALID:MISSING_SOURCE:'+relative);
      fs.mkdirSync(path.dirname(target),{recursive:true});
      fs.copyFileSync(source,target);
    }
    if((candidate?.edits||[]).length)applyExactEdits(tempRoot,candidate.edits);
    for(const file of candidate?.newFiles||[]){
      const target=path.join(tempRoot,file.path);
      fs.mkdirSync(path.dirname(target),{recursive:true});
      fs.writeFileSync(target,file.content,'utf8');
    }
    for(const file of candidate?.replaceFiles||[]){
      const target=path.join(tempRoot,file.path);
      fs.mkdirSync(path.dirname(target),{recursive:true});
      fs.writeFileSync(target,file.content,'utf8');
    }
    for(const relative of touched){
      const target=path.join(tempRoot,relative);
      try{
        execFileSync(process.execPath,['--check',target],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
      }catch(error){
        const detail=clean(error?.stderr||error?.stdout||error?.message||error).replace(/\s+/g,' ').slice(0,360);
        throw new Error('SYSTEM_CANDIDATE_SYNTAX_INVALID:'+relative+':'+detail);
      }
    }
    return{pass:true,files:touched};
  }finally{
    fs.rmSync(tempRoot,{recursive:true,force:true});
  }
}
function designManifestContract(order={}){const design=order?.designIntelligence||{};return{required:design.required===true,version:Number(design.version||0)||null,pipeline:Array.isArray(design.pipeline)?design.pipeline.map(clean).filter(Boolean):[],implementationGate:{allowed:design?.implementationGate?.allowed===true,blockers:Array.isArray(design?.implementationGate?.blockers)?design.implementationGate.blockers.map(clean).filter(Boolean):[]},evidenceRequirements:{autoPlayer:'verified-runtime-play-evidence-required',telemetry:'verified-observed-metrics-required',designReview:'verified-pass-required-before-experience-memory',qa:'verified-qa-evidence-required'},authorityExpanded:false};}

const SPECIALIZED_VERIFICATION_REQUEST_RULES=Object.freeze([
  ['VERIFIED_GAME_VISUAL_DNA_COMPATIBILITY_PASS',/(?:concept|visual.?dna|style.?bible|style.?lock|art.?direction|컨셉|비주얼.?DNA|스타일.?바이블|스타일.?락|아트.?디렉션)/i],
  ['VERIFIED_WORLD_ROUTE_NAVIGATION_PASS',/(?:world.?generation|map.?dna|level.?design|route|navigation|path.?graph|landmark|objective.?reach|월드.?생성|맵.?DNA|레벨.?디자인|경로|길.?그래프|내비|랜드마크|목표.?도달)/i],
  ['VERIFIED_STREAMING_MOBILE_BUDGET_PASS',/(?:streaming|chunk|cell.?stream|\blod\b|prewarm|mobile.?world.?performance|스트리밍|청크|셀.?스트림|프리워밍|모바일.?월드.?성능)/i],
  ['VERIFIED_NARRATIVE_GAMEPLAY_CAUSALITY_PASS',/(?:main.?story|story.?transition|narrative|storytelling|causal.?story|메인.?스토리|스토리.?전이|서사|스토리텔링|인과.?스토리)/i],
  ['VERIFIED_QUEST_GRAPH_PASS',/(?:quest.?graph|quest.?dependency|quest.?prerequisite|choice.?consequence|퀘스트.?그래프|퀘스트.?의존|선행.?퀘스트|선택.?결과)/i],
  ['VERIFIED_CHARACTER_PERSONA_VOICE_MEMORY_PASS',/(?:character.?persona|character.?voice|relationship.?memory|companion.?behavior|npc.?behavior|monster.?personality|persona|페르소나|캐릭터.?말투|관계.?기억|동료.?행동|npc.?행동|몬스터.?성격)/i],
  ['VERIFIED_WORLD_NARRATIVE_STATE_PASS',/(?:world.?narrative|faction.?state|faction.?relationship|world.?state|environmental.?story|월드.?서사|세력.?상태|세력.?관계|월드.?상태|환경.?스토리)/i]
]);
export function buildSpecializedVerificationRequest(order={}){
  const target=clean(order?.target).toLowerCase();
  const gameTargetEligible=['web','unity','roblox','uefn','fortnite','fortnite_uefn','fortnite-uefn'].includes(target);
  const text=[
    clean(order?.goal),
    ...(Array.isArray(order?.acceptanceCriteria)?order.acceptanceCriteria:[]),
    ...(Array.isArray(order?.evidence)?order.evidence:[]),
    ...(Array.isArray(order?.responsibleFiles)?order.responsibleFiles:[])
  ].map(clean).filter(Boolean).join(' ');
  const requestedMarkers=gameTargetEligible
    ?SPECIALIZED_VERIFICATION_REQUEST_RULES.filter(([,re])=>re.test(text)).map(([marker])=>marker)
    :[];
  return Object.freeze({
    version:2,
    required:gameTargetEligible&&requestedMarkers.length>0,
    requestedMarkers:Object.freeze([...new Set(requestedMarkers)]),
    target:target||null,
    gameTargetEligible,
    blockedReason:gameTargetEligible?null:'NON_GAME_TARGET',
    nativeRuntimeRequired:gameTargetEligible&&['unity','roblox','uefn','fortnite','fortnite_uefn','fortnite-uefn'].includes(target),
    focusedQaRequired:gameTargetEligible&&requestedMarkers.length>0,
    markerOnlyPassForbidden:true,
    requestAuthority:'VERIFICATION_REQUEST_ONLY_NOT_PASS'
  });
}
function waitingDesignEvidence(){return{autoPlayer:{status:'WAITING_EVIDENCE',verified:false},telemetry:{status:'WAITING_EVIDENCE',verified:false},designReview:{status:'WAITING_EVIDENCE',verified:false,decision:null},qa:{status:'WAITING_EVIDENCE',verified:false}};}

export async function runVibe2SourceWorker({cwd=process.cwd(),workOrderFile='.vibe2/work-order.json',outputRoot='.vibe2/candidates',model=DEFAULT_MODEL,responseFile='',responseFiles=[],applySource=false}={}){
  const order=readJson(path.resolve(cwd,workOrderFile));
  if(!order?.run||order?.workMode!=='source-change-candidate')throw new Error('실행 가능한 source-change work order 필요');
  if(order?.workerPolicy?.directMainWrite!==false)throw new Error('directMainWrite 정책 위반');
  const centralPolicyPreflight=assertCompiledWorkContractFresh({cwd,contract:order?.compiledWorkContract||{},phase:'PRE_SOURCE_GENERATION'});
  const target=clean(order.target).toLowerCase();
  const developmentAuthority=target==='system'
    ?{owner:'VIBE2_VIBE3',provider:'LOCAL_OLLAMA',model:DEFAULT_MODEL,role:'SYSTEM_ARCHITECTURE_EVOLUTION',...assertSystemArchitectureTask(order.selectedTask||{}),directMainWrite:false}
    :assertGameDevelopmentAuthority();
  const sourceRootRelative=assertSourceRoot(order?.source?.root,target);
  const sourceRoot=path.resolve(cwd,sourceRootRelative);
  const responsibleFiles=normalizeResponsibleFiles(order,sourceRootRelative,target);
  const bootstrap=sourceRootBootstrapAllowed(order,target,sourceRootRelative,responsibleFiles);
  const sourceRootExists=fs.existsSync(sourceRoot)&&fs.statSync(sourceRoot).isDirectory();
  if(!sourceRootExists&&!bootstrap)throw new Error(`source root 없음: ${sourceRootRelative}`);
  const explorationOrder=order?.phase4BenchmarkVerification?.active===true?{...order,goal:clean(order.originalGoal)||clean(order.goal)}:order;
  const exploration=exploreVibe2WorkOrder({cwd,order:explorationOrder});
  const allowFullRewrite=fullWebRewriteAllowed(order,target,exploration);
  const focusedWebRepair=isFocusedWebRepair(order,target,responsibleFiles,allowFullRewrite);
  const preferredContextMode=clean(order?.codingStrategyPreference?.preferredContextMode).toUpperCase();
  const preferBoundedContext=sourceRootExists&&focusedWebRepair&&preferredContextMode==='BOUNDED_FILE_EXCERPT_FALLBACK';
  const bootstrapHtml='<!doctype html><html><head><meta charset="utf-8"><title>Approved Web Bootstrap</title></head><body><main id="game"></main><script></script></body></html>';
  const unityBootstrapFiles=bootstrap&&target==='unity'?unityWebBootstrapScaffold(sourceRootRelative):null;
  const focusedContext=sourceRootExists&&focusedWebRepair&&!preferBoundedContext?focusedSymbolContext(sourceRoot,target,responsibleFiles,exploration):null;
  const context=!sourceRootExists&&bootstrap
    ?(target==='unity'
      ?{files:responsibleFiles.map(relative=>({path:relative,content:unityBootstrapFiles[relative],truncated:false,editable:true})),bytes:responsibleFiles.reduce((n,relative)=>n+Buffer.byteLength(unityBootstrapFiles[relative]||'','utf8'),0),mode:'UNITY_WEB_BOOTSTRAP_SHELL',focusedSymbolCount:0,exactSourceWindows:false,fullFileFallback:false}
      :{files:[{path:'index.html',content:bootstrapHtml,truncated:false,editable:true}],bytes:Buffer.byteLength(bootstrapHtml,'utf8'),mode:'BOOTSTRAP_SHELL',focusedSymbolCount:0,exactSourceWindows:false,fullFileFallback:false})
    :(focusedContext||{
      ...readContext(
        sourceRoot,
        target,
        responsibleFiles,
        order?.source?.ignoredPaths||[],
        focusedWebRepair?(exploration.contextFiles||[]).slice(0,FOCUSED_WEB_REPAIR_CONTEXT_FILES):(exploration.contextFiles||[]),
        focusedWebRepair?{maxFiles:FOCUSED_WEB_REPAIR_CONTEXT_FILES,maxBytes:FOCUSED_WEB_REPAIR_CONTEXT_BYTES}:{}
      ),
      mode:focusedWebRepair?'BOUNDED_FILE_EXCERPT_FALLBACK':'STANDARD_CONTEXT',
      focusedSymbolCount:0,
      exactSourceWindows:false,
      fullFileFallback:focusedWebRepair
    });
  if(!context.files.length)throw new Error('worker context 파일 없음');
  const fullWebTarget=allowFullRewrite?fullWebGenerationTarget(order):null;
  const prompt=buildPrompt(order,context,responsibleFiles,{allowFullRewrite,exploration,sourceRootBootstrap:bootstrap,focusedWebRepair});
  const editContract=exploration?.editContract||{};
  const systemRegressionFiles=target==='system'?responsibleFiles.filter(file=>/^qa\/.+\.test\.(?:mjs|js|cjs)$/i.test(file)):[];
  const systemSourceFiles=target==='system'?responsibleFiles.filter(file=>!/^qa\/.+\.test\.(?:mjs|js|cjs)$/i.test(file)):[];
  const systemCausalPairRequired=target==='system'
    &&systemRegressionFiles.length>0
    &&systemSourceFiles.length>0
    &&(order?.selectedTask?.completionCriteria||[]).some(value=>/BEFORE_AFTER|CAUSAL_PROOF|STRUCTURAL_CAUSE/i.test(clean(value)));
  const robloxStudioAssetBackfillRequired=target==='roblox'&&order?.selectedTask?.studioAssetBackfill===true;
  const robloxStudioAssetVisualOwners=robloxStudioAssetBackfillRequired?responsibleFiles.filter(file=>
    /(?:^|\/)client\/|VisualStyle\.luau$|BattleVisual\.luau$/i.test(clean(file))
  ):[];
  const candidateValidator=candidate=>{
    const touched=new Set([
      ...(candidate.edits||[]).map(row=>row.path),
      ...(candidate.newFiles||[]).map(row=>row.path),
      ...(candidate.replaceFiles||[]).map(row=>row.path)
    ]);
    if(robloxStudioAssetBackfillRequired){
      if(!robloxStudioAssetVisualOwners.length)throw new Error('ROBLOX_STUDIO_ASSET_VISUAL_OWNER_REQUIRED:NO_VISUAL_OWNER_IN_RESPONSIBLE_FILES');
      const touchedVisual=robloxStudioAssetVisualOwners.filter(file=>touched.has(file));
      if(!touchedVisual.length)throw new Error('ROBLOX_STUDIO_ASSET_VISUAL_OWNER_REQUIRED:'+robloxStudioAssetVisualOwners.join('|'));
      const visualChangeText=[
        ...(candidate.edits||[]).filter(row=>touchedVisual.includes(clean(row.path))).map(row=>String(row.replace||'')),
        ...(candidate.newFiles||[]).filter(row=>touchedVisual.includes(clean(row.path))).map(row=>String(row.content||'')),
        ...(candidate.replaceFiles||[]).filter(row=>touchedVisual.includes(clean(row.path))).map(row=>String(row.content||''))
      ].join('\n');
      const required=[
        /\bSTUDIO_ASSET_BINDING_VERSION\s*=\s*1\b/,
        /\bSTUDIO_ASSET_SELECTION\s*=\s*\{/,
        /StudioAssetBindingVersion/,
        /StudioAssetAtoms/,
        /(?:Instance\.new\s*\(|Color3\.(?:fromRGB|new)\s*\(|\.(?:Material|Color|BackgroundColor3|TextureID|MeshId)\s*=)/
      ];
      if(required.some(pattern=>!pattern.test(visualChangeText))){
        throw new Error('ROBLOX_STUDIO_ASSET_APPLICATION_REQUIRED:VISUAL_OWNER_MUST_CONTAIN_BINDING_SELECTION_RUNTIME_ATTRIBUTES_AND_NATIVE_VISUAL_CHANGE');
      }
    }
    if(bootstrap&&target==='unity'){
      for(const relative of responsibleFiles)if(!touched.has(relative))throw new Error('UNITY_WEB_BOOTSTRAP_GAME_SOURCE_PAIR_REQUIRED:'+relative);
      if((candidate.newFiles||[]).length||(candidate.replaceFiles||[]).length)throw new Error('UNITY_WEB_BOOTSTRAP_GAME_SOURCE_EDITS_ONLY');
    }
    if(systemCausalPairRequired){
      const sourceTouched=systemSourceFiles.some(file=>touched.has(file));
      const testTouched=systemRegressionFiles.some(file=>touched.has(file));
      if(!sourceTouched||!testTouched)throw new Error('SYSTEM_CAUSAL_TEST_REQUIRED:SOURCE_AND_REGRESSION_TEST_MUST_CHANGE_TOGETHER');
    }
    if(target==='system')validateSystemCandidateSyntax({candidate,sourceRoot});
    const result=evaluateSemanticDiffBudget({candidate,editContract,allowFullRewrite,bootstrap,sourceRoot});
    if(!result.pass)throw new Error('SEMANTIC_DIFF_BUDGET_VIOLATION:'+result.violations.join('|'));
    const diagnosticPostcondition=evaluateDiagnosticPostcondition({candidate,exploration});
    if(!diagnosticPostcondition.pass)throw new Error('DIAGNOSTIC_POSTCONDITION_MISSING:'+diagnosticPostcondition.type+':'+diagnosticPostcondition.file+':'+diagnosticPostcondition.reason);
    const presentationDelta=evaluatePresentationCandidateDelta({candidate,sourceRoot,contract:order?.presentationQuality||{}});
    if(presentationDelta.required&&!presentationDelta.pass)throw new Error('PRESENTATION_PATCH_DELTA_REQUIRED:'+presentationDelta.presentationPass);
    const presentationPass=clean(order?.presentationQuality?.pass).toUpperCase();
    if(target==='roblox'&&presentationPass==='ASSET_ADAPTATION'){
      const changedPresentationText=[
        ...(candidate.edits||[]).map(row=>String(row.replace||'')),
        ...(candidate.newFiles||[]).map(row=>String(row.content||'')),
        ...(candidate.replaceFiles||[]).map(row=>String(row.content||''))
      ].join('\n');
      const coupledVisual=terms=>new RegExp('(?:'+terms+')[\\s\\S]{0,500}(?:Instance\\.new|Clone\\s*\\(|FindFirstChild|WaitForChild|Color3|BrickColor|Material|SurfaceAppearance|CFrame|\\.Size\\b|\\.Position\\b)|(?:Instance\\.new|Clone\\s*\\(|FindFirstChild|WaitForChild|Color3|BrickColor|Material|SurfaceAppearance|CFrame|\\.Size\\b|\\.Position\\b)[\\s\\S]{0,500}(?:'+terms+')','i').test(changedPresentationText);
      const requiredVisualDomains={
        CHARACTER_ENEMY:coupledVisual('head|torso|body|arm|leg|character|player|enemy|monster|npc|creature'),
        WEAPON_EQUIPMENT:coupledVisual('weapon|sword|blade|spear|axe|hammer|bow|staff|shield|gun|claw|fang|equipment|armor'),
        ENVIRONMENT_TERRAIN:coupledVisual('terrain|ground|tree|rock|plant|building|environment|sky|fog|biome|forest|village|dungeon'),
        MATERIAL_COLOR_STYLE:/(?:Color3|BrickColor|Material|SurfaceAppearance|UIGradient|Lighting|palette|style.?lock|gradient)/i.test(changedPresentationText)
      };
      const missingVisualDomains=Object.entries(requiredVisualDomains).filter(([,present])=>!present).map(([name])=>name);
      if(missingVisualDomains.length)throw new Error('ROBLOX_ASSET_ADAPTATION_DOMAINS_REQUIRED:MISSING_'+missingVisualDomains.join(','));
      const motionDriver=/(?:TweenService|RenderStepped|Heartbeat|Animator|AnimationTrack|Motor6D|Bone)/i.test(changedPresentationText);
      const motionMutation=/(?:TweenService[\s\S]{0,1200}(?:CFrame|Transform|Position|Orientation)\s*=|(?:RenderStepped|Heartbeat)[\s\S]{0,1200}\.(?:CFrame|Transform|Position|Orientation)\s*=|(?:Motor6D|Bone)[\s\S]{0,800}\.Transform\s*=|\.(?:CFrame|Transform|Position|Orientation)\s*=\s*(?:CFrame|Vector3|UDim2|[^\n;]+[+*\-]))/i.test(changedPresentationText);
      if(!motionDriver||!motionMutation)throw new Error('ROBLOX_ASSET_ADAPTATION_MOTION_REQUIRED:NATIVE_DRIVER_AND_TRANSFORM_MUTATION');
    }
    const studioQualityContract=order?.selectedTask?.studioQualityEvolution||order?.workPackage?.sharedContext?.studioQualityEvolution||null;
    const studioQualityDelta=evaluateStudioQualityCandidateDelta({candidate,sourceRoot,contract:studioQualityContract});
    if(studioQualityDelta.required&&!studioQualityDelta.pass){
      throw new Error(`STUDIO_QUALITY_DELTA_REQUIRED:${studioQualityDelta.phase}:${studioQualityDelta.sourceDeltaUnits}/${studioQualityDelta.requiredSourceDeltaUnits}:VISUAL:${studioQualityDelta.visualUnits}/${studioQualityDelta.requiredVisualUnits}:${studioQualityDelta.reason}`);
    }
    return{...result,diagnosticPostcondition,presentationDelta,studioQualityDelta};
  };
  const candidateVariant=clean(order?.candidateStrategyRole?.variant)||clean(process.env.VIBE2_SPECULATIVE_VARIANT)||'primary';
  const deterministicDiagnostic=!allowFullRewrite?deterministicDiagnosticCandidate({exploration,sourceRoot,responsibleFiles}):null;
  let generated=null;
  if(deterministicDiagnostic){
    try{
      const candidate=normalizeCandidate(deterministicDiagnostic,{target,responsibleFiles,sourceRootRelative,allowFullRewrite:false,minFullRewriteBytes:fullWebTarget?.minBytes||MIN_FULL_REWRITE_BYTES});
      if(candidate.edits.length&&sourceRoot&&fs.existsSync(sourceRoot))applyExactEdits(sourceRoot,candidate.edits,{dryRun:true});
      const candidateValidation=candidateValidator(candidate);
      generated={candidate,candidateValidation,generation:{attempts:1,recoveryUsed:false,deterministicDiagnosticRepair:true,deterministicDiagnosticType:deterministicDiagnostic.deterministicDiagnosticType,mode:'DETERMINISTIC_DIAGNOSTIC',maxPredict:0,timeoutMs:0,contextWindow:0,temperature:0,completionMode:'DETERMINISTIC_DIAGNOSTIC'}};
      console.log('VIBE2_DETERMINISTIC_DIAGNOSTIC_REPAIR=PASS:'+deterministicDiagnostic.deterministicDiagnosticType+':'+candidate.edits[0]?.path);
    }catch(error){
      console.log('VIBE2_DETERMINISTIC_DIAGNOSTIC_REPAIR=FALLBACK:'+generationFailureClass(error)+':'+clean(error?.message||error).replace(/\s+/g,' ').slice(0,240));
    }
  }
  if(!generated)generated=await generateCandidateWithRecovery({prompt,model,responseFile,responseFiles,allowFullRewrite,target,responsibleFiles,sourceRootRelative,sourceRoot,focusedWebRepair,exploration,minFullRewriteBytes:fullWebTarget?.minBytes||MIN_FULL_REWRITE_BYTES,candidateValidator,candidateVariant,systemAtomicPairRequired:systemCausalPairRequired});
  const candidate=generated.candidate;
  const semanticDiffEnforcement=generated.candidateValidation||candidateValidator(candidate);
  const presentationCandidateDelta=semanticDiffEnforcement?.presentationDelta||evaluatePresentationCandidateDelta({candidate,sourceRoot,contract:order?.presentationQuality||{}});
  const studioQualityCandidateDelta=semanticDiffEnforcement?.studioQualityDelta||evaluateStudioQualityCandidateDelta({candidate,sourceRoot,contract:order?.selectedTask?.studioQualityEvolution||order?.workPackage?.sharedContext?.studioQualityEvolution||null});
  const robloxNativeSourceInspection=buildRobloxNativeSourceInspection({order,context,responsibleFiles});
  const robloxNativeCandidateQuality=target==='roblox'?inspectRobloxNativeCandidateQuality({candidate,sourceRoot}):{required:false,findingCount:0,findings:[],securityRelevantFindings:[],automaticGameWideBlock:false};
  if(target==='roblox'){
    console.log('ROBLOX_NATIVE_SOURCE_INSPECTION=PASS:files='+robloxNativeSourceInspection.files.length+':systems='+(robloxNativeSourceInspection.systems.join(',')||'NONE'));
    console.log('ROBLOX_NATIVE_BUILD_UP_BINDING='+(order?.selectedTask?.buildUpDirective?.robloxNativeExecution||order?.buildUpDirective?.robloxNativeExecution?'PASS':'BASELINE_OR_REPAIR'));
    console.log('ROBLOX_NATIVE_CODE_QUALITY_FINDINGS='+robloxNativeCandidateQuality.findingCount);
    console.log('ROBLOX_CHARACTER_MOTION_QUALITY='+(robloxNativeCandidateQuality.motionQualityFindings?.length?'REPAIR_REQUIRED:'+robloxNativeCandidateQuality.motionQualityFindings.map(row=>row.class).join(','):'STATIC_READY_RUNTIME_REQUIRED'));
  }
  const generation={...generated.generation,candidateVariant,attemptBudget:generationAttemptBudget({allowFullRewrite,variant:candidateVariant}),speculativeAttemptBudgetApplied:/^speculative-/i.test(candidateVariant),fullWebInitialSeedStrategy:allowFullRewrite,fullWebInitialSeedTargetBytes:allowFullRewrite?[FULL_WEB_INITIAL_SEED_TARGET_MIN_BYTES,FULL_WEB_INITIAL_SEED_TARGET_MAX_BYTES]:[],contextFiles:context.files.length,contextBytes:context.bytes,contextMode:context.mode||'STANDARD_CONTEXT',focusedSymbolCount:Number(context.focusedSymbolCount||0),exactSourceWindows:context.exactSourceWindows===true,fullFileContextFallback:context.fullFileFallback===true,contextPreferenceRequested:preferredContextMode||null,contextPreferenceApplied:Boolean(preferredContextMode&&preferredContextMode===(context.mode||'STANDARD_CONTEXT'))};
  if(bootstrap&&target==='web'&&(candidate.edits.length||candidate.newFiles.length||candidate.replaceFiles.length!==1||candidate.replaceFiles[0]?.path!=='index.html')){
    throw new Error('Web source bootstrap는 index.html 전체 파일 생성 1건만 허용');
  }
  if(bootstrap&&target==='unity'){
    const touched=new Set(candidate.edits.map(row=>row.path));
    if(candidate.newFiles.length||candidate.replaceFiles.length||responsibleFiles.some(file=>!touched.has(file))){
      throw new Error('Unity Web source bootstrap는 GameCore.cs와 RuntimeBootstrap.cs 실제 편집을 모두 요구');
    }
  }
  const centralPolicyCompletion=assertCompiledWorkContractFresh({cwd,contract:order?.compiledWorkContract||{},phase:'PRE_CANDIDATE_WRITE'});
  const taskId=safeId(order.taskId);
  const candidateRoot=path.resolve(cwd,outputRoot,taskId);
  const candidateManifestPath=posix(path.relative(cwd,path.join(candidateRoot,'manifest.json')));
  fs.rmSync(candidateRoot,{recursive:true,force:true});
  fs.mkdirSync(candidateRoot,{recursive:true});
  let changedFiles,branch=null;
  if(applySource){
    branch=assertCandidateBranch(cwd);
    const scaffoldChanged=bootstrap&&target==='unity'?writeUnityWebBootstrapScaffold(sourceRoot,sourceRootRelative):[];
    changedFiles=[...scaffoldChanged,...applyExactEdits(sourceRoot,candidate.edits),...applyNewFiles(sourceRoot,candidate.newFiles),...applyReplaceFiles(sourceRoot,candidate.replaceFiles,{allowCreate:bootstrap})];
  }else{
    const scaffoldFiles=bootstrap&&target==='unity'?unityBootstrapFiles:null;
    changedFiles=createCandidateSnapshot(sourceRoot,candidateRoot,candidate,{scaffoldFiles});
  }
  const codingMethod={
    version:2,
    strategy:clean(order?.candidateStrategyRole?.strategy)||clean(editContract.strategyHint)||'UNCLASSIFIED',
    compiledStrategyHint:clean(editContract.strategyHint)||null,
    candidateVariant,
    generationAttemptBudget:Number(generation.attemptBudget||0),
    speculativeAttemptBudgetApplied:generation.speculativeAttemptBudgetApplied===true,
    fullWebInitialSeedStrategy:generation.fullWebInitialSeedStrategy===true,
    fullWebInitialSeedTargetBytes:Array.isArray(generation.fullWebInitialSeedTargetBytes)?generation.fullWebInitialSeedTargetBytes.slice(0,2):[],
    responsibilityConfidence:clean(editContract.responsibilityConfidence)||'LOW',
    primaryTargets:Array.isArray(editContract.primaryTargets)?editContract.primaryTargets.slice(0,8):[],
    primarySystems:Array.isArray(editContract.primarySystems)?editContract.primarySystems.slice(0,12):[],
    dependentSystems:Array.isArray(editContract.dependentSystems)?editContract.dependentSystems.slice(0,12):[],
    ownedState:Array.isArray(editContract.ownedState)?editContract.ownedState.slice(0,24):[],
    semanticDiffBudget:editContract.semanticDiffBudget||null,
    semanticDiffEnforcement,
    causalReplay:editContract.causalReplay||null,
    requiredFocusedChecks:Array.isArray(editContract.requiredFocusedChecks)?editContract.requiredFocusedChecks.slice(0,24):[],
    failureFingerprint:clean(editContract?.patchRecipe?.failureFingerprint)||clean(order?.unifiedLearning?.failureFingerprint)||null,
    patchRecipeMode:clean(editContract?.patchRecipe?.mode)||null,
    verifiedFailureLocalMemoryCount:Number(editContract?.patchRecipe?.verifiedMemoryCount||0),
    verifiedFailureLocalMemoryIds:Array.isArray(editContract?.patchRecipe?.verifiedMemoryIds)?editContract.patchRecipe.verifiedMemoryIds.slice(0,8):[],
    contextFiles:context.files.length,
    contextBytes:context.bytes,
    contextMode:generation.contextMode||'STANDARD_CONTEXT',
    contextPreferenceRequested:generation.contextPreferenceRequested||null,
    contextPreferenceApplied:generation.contextPreferenceApplied===true,
    focusedSymbolCount:Number(generation.focusedSymbolCount||0),
    exactSourceWindows:generation.exactSourceWindows===true,
    fullFileContextFallback:generation.fullFileContextFallback===true,
    fullWebExpansionStages:Number(generation.fullWebExpansionStages||0),
    fullWebExpansionDocumentSeedRecoveries:Number(generation.fullWebExpansionDocumentSeedRecoveries||0),
    fullWebClosedHtmlEarlyStop:generation.fullWebClosedHtmlEarlyStop===true,
    fullWebFinalAdditiveExpansion:generation.fullWebFinalAdditiveExpansion===true,
    fullWebAdditiveAttemptCreditUsed:generation.fullWebAdditiveAttemptCreditUsed===true,
    fullWebProgressCreditCount:Number(generation.fullWebProgressCreditCount||0),
    fullWebProgressCreditUsed:generation.fullWebProgressCreditUsed===true,
    missingPathRecoveries:Number(generation.missingPathRecoveries||0),
    baseAttemptBudget:Number(generation.baseAttemptBudget||generation.attemptBudget||0),
    effectiveAttemptBudget:Number(generation.effectiveAttemptBudget||generation.attemptBudget||0),
    fullWebRetryPromptCompacted:generation.fullWebRetryPromptCompacted===true,
    fullWebRetryPromptBytes:Number(generation.fullWebRetryPromptBytes||0),
    fullWebFallbackBestPartialBytes:Number(generation.fullWebFallbackBestPartialBytes||0),
    intermediateGrowthBytes:Array.isArray(generation.intermediateGrowthBytes)?generation.intermediateGrowthBytes.slice(0,8):[],
    intermediateGrowthTotalBytes:Array.isArray(generation.intermediateGrowthBytes)?generation.intermediateGrowthBytes.reduce((sum,value)=>sum+Math.max(0,Number(value)||0),0):0,
    repeatedIntermediateOutputs:Number(generation.repeatedIntermediateOutputs||0),
    expansionStageTargets:Array.isArray(generation.expansionStageTargets)?generation.expansionStageTargets.slice(0,8):[],
    generationAttempts:Number(generation.attempts||0),
    generationRecoveryUsed:generation.recoveryUsed===true,
    partialTimeoutRecovery:generation.partialTimeoutRecovery===true,
    partialMalformedRecovery:generation.partialMalformedRecovery===true,
    streamedPartialEditRecovery:generation.streamedPartialEditRecovery===true,
    robloxFullGraphicsInitialPackage:generation.robloxFullGraphicsInitialPackage===true,
    focusedFirstEditEarlyStop:generation.focusedFirstEditEarlyStop===true,
    focusedFinalRetry:generation.focusedFinalRetry===true,
    focusedReplaceOnly:generation.focusedReplaceOnly===true,
    focusedReplaceStringRecovery:generation.focusedReplaceStringRecovery===true,
    focusedFirstAttemptFastPath:generation.focusedFirstAttemptFastPath===true,
    malformedFastEscalation:generation.malformedFastEscalation===true,
    focusedReplaceAnchorRotations:Number(generation.focusedReplaceAnchorRotations||0),
    focusedReplaceNoOpCreditUsed:generation.focusedReplaceNoOpCreditUsed===true,
    focusedMinimalJsonContract:generation.focusedFinalRetry===true&&!allowFullRewrite,
    candidateProducedFirstAttempt:Number(generation.attempts||0)===1&&generation.recoveryUsed!==true,
    deterministicDiagnosticRepair:generation.deterministicDiagnosticRepair===true,
    deterministicDiagnosticType:clean(generation.deterministicDiagnosticType)||null,
    writableScopeExpansionAllowed:false,
    learningAuthorityExpanded:false
  };
  const manifest={
    version:6,
    taskId:order.taskId,
    gameId:order.gameId||null,
    target,
    sourceRoot:sourceRootRelative,
    sourceRootBootstrap:bootstrap,
    releaseState:clean(order.releaseState)||'other',
    priority:clean(order.priority)||'normal',
    generation,
    developmentAuthority,
    compiledWorkContract:order?.compiledWorkContract&&typeof order.compiledWorkContract==='object'?order.compiledWorkContract:null,
    centralPolicyFreshness:{preflight:centralPolicyPreflight,completion:centralPolicyCompletion},
    baseMainSha:clean(process.env.VIBE2_BASE_MAIN_SHA)||null,
    goal:order.goal,
    generatedAt:new Date().toISOString(),
    mode:applySource?'isolated-candidate-branch-source-write':'candidate-snapshot-only',
    branch,
    candidateManifestPath,
    model,
    changedFiles,
    summary:candidate.summary,
    expectedEffect:candidate.expectedEffect,
    tests:candidate.tests,
    exploration,
    codingMethod,
    robloxNativeSourceInspection,
    robloxNativeCandidateQuality,
    roleResults:{exploration:'PASS',implementation:'PASS',test:'WAITING_INCREMENTAL_QA',performance:'WAITING_SANITY',regression:'WAITING_FAN_IN',review:'WAITING_FAN_IN'},
    designIntelligence:designManifestContract(order),
    designEvidence:waitingDesignEvidence(),
    specializedVerificationRequest:buildSpecializedVerificationRequest(order),
    assetProduction:order?.assetProduction&&typeof order.assetProduction==='object'?order.assetProduction:{required:false},
    presentationQuality:order?.presentationQuality&&typeof order.presentationQuality==='object'?order.presentationQuality:{required:false,pass:null,authorityExpanded:false},
    presentationCandidateDelta,
    studioQualityCandidateDelta,
    fullFileRewriteAllowed:allowFullRewrite,
    protectedGameplayMutationAutomatic:false,
    binaryAssetsDirectTextEditForbidden:true,
    directMainWrite:false,
    verifiedBeforePromotion:false
  };
  writeJson(path.join(candidateRoot,'manifest.json'),manifest);
  writeJson(path.join(candidateRoot,'candidate.json'),candidate);
  return manifest;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const args=parseArgs();
  try{
    const result=await runVibe2SourceWorker({workOrderFile:clean(args.order)||'.vibe2/work-order.json',outputRoot:clean(args.output)||'.vibe2/candidates',model:clean(args.model)||DEFAULT_MODEL,responseFile:clean(args.response),applySource:String(args['apply-source']||'').toLowerCase()==='true'});
    console.log('VIBE2_SOURCE_WORKER=PASS');
    console.log(`VIBE2_TASK_ID=${result.taskId}`);
    console.log(`VIBE2_TARGET=${result.target}`);
    console.log(`VIBE2_CHANGED_FILES=${result.changedFiles.join(',')}`);
    console.log(`VIBE2_CANDIDATE_MANIFEST=${result.candidateManifestPath}`);
    console.log(`VIBE2_GENERATION_ATTEMPTS=${result.generation?.attempts||1}`);
    console.log(`VIBE2_GENERATION_RECOVERY=${result.generation?.recoveryUsed?'YES':'NO'}`);
    console.log(`VIBE2_GENERATION_FOCUSED_FINAL=${result.generation?.focusedFinalRetry?'YES':'NO'}`);
    console.log(`VIBE2_EXPLORATION_REUSE_KEY=${result.exploration?.reuseKey||'NONE'}`);
  }catch(error){
    const failureClass=clean(error?.vibe2GenerationFailureClass)||generationFailureClass(error);
    const attempts=Number(error?.vibe2GenerationAttempts||0);
    console.error(`VIBE2_SOURCE_WORKER_FAILURE_CLASS=${failureClass}`);
    if(attempts>0)console.error(`VIBE2_GENERATION_ATTEMPTS=${attempts}`);
    console.error(`VIBE2_SOURCE_WORKER_FAILURE_MESSAGE=${clean(error?.message||error).replaceAll('\n',' ').slice(0,500)}`);
    throw error;
  }
}
