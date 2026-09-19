// 파일명: tools/vibe2-source-worker.mjs
// 역할: Vibe2 작업주문의 텍스트 소스 변경 후보를 무료 로컬 모델로 생성하고 격리 검증한다.
// 기존 게임 루트만 사용하며, 소유자 지시가 명시된 Web 프로토타입은 같은 index 파일 전체 교체를 허용한다.

import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { applyExactEdits, boundedLargeExcerpt } from './autonomous-safe-edit.mjs';
import { exploreVibe2WorkOrder, explorationGuidance } from './vibe2-exploration-worker.mjs';
import { analyzeExistingGameSource } from './company-vibe2-gameplay-intelligence.mjs';

const clean=value=>String(value??'').trim();
const posix=value=>clean(value).replaceAll('\\','/').replace(/^\.\//,'').replace(/\/+$/,'');
const unique=values=>[...new Set((values||[]).map(clean).filter(Boolean))];
const safeId=value=>clean(value).replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80)||'task';
const MAX_CONTEXT_FILES=12;
const MAX_CONTEXT_BYTES=96000;
const MAX_CHANGED_FILES=4;
const MAX_NEW_FILES=2;
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
const DEFAULT_MAX_PREDICT=Math.max(256,Math.min(2048,Number(process.env.VIBE2_MODEL_MAX_PREDICT||1536)));
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
const JSON_RETRY_MAX_PREDICT=1536;
const FOCUSED_WEB_REPAIR_MAX_PREDICT=1024;
const FOCUSED_WEB_REPAIR_CONTEXT_FILES=2;
const FOCUSED_WEB_REPAIR_CONTEXT_BYTES=28000;
const FOCUSED_WEB_REPAIR_CONTEXT_WINDOW=12288;
const JSON_FINAL_RETRY_TIMEOUT_MS=150000;
const JSON_FINAL_RETRY_MAX_PREDICT=768;
const JSON_FOCUSED_REPLACE_MAX_PREDICT=384;
const JSON_FOCUSED_REPLACE_TIMEOUT_MS=90000;
const JSON_CONTEXT_WINDOW=32768;
const JSON_FINAL_CONTEXT_WINDOW=16384;
const JSON_FOCUSED_REPLACE_CONTEXT_WINDOW=8192;
const FULL_WEB_CONTEXT_WINDOW=32768;
const MAX_GENERATION_ATTEMPTS=3;
const SPECULATIVE_FULL_WEB_MAX_GENERATION_ATTEMPTS=3;
const SPECULATIVE_JSON_MAX_GENERATION_ATTEMPTS=2;
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
  godot:new Set(['.gd','.tscn','.tres','.godot','.cfg','.json'])
});
const BINARY_EXTENSIONS=new Set(['.rbxl','.rbxlx','.uasset','.umap','.controller','.anim','.avatar','.fbx','.blend','.png','.jpg','.jpeg','.webp','.wav','.mp3','.ogg']);
const PLACEHOLDER_PATHS=new Set(['relative/to/source/root','relative/path','path/to/file','relative/to/file','exact allowed path','allowed edit path']);

function readJson(file,fallback=null){if(!file||!fs.existsSync(file))return fallback;return JSON.parse(fs.readFileSync(file,'utf8'));}
function writeJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,`${JSON.stringify(value,null,2)}\n`,'utf8');}
function parseArgs(argv=process.argv.slice(2)){const args={};for(const raw of argv){if(!raw.startsWith('--'))continue;const body=raw.slice(2),at=body.indexOf('=');if(at<0)args[body]=true;else args[body.slice(0,at)]=body.slice(at+1);}return args;}
function targetExtensions(target){const x=TARGET_EXTENSIONS[clean(target).toLowerCase()];if(!x)throw new Error(`지원하지 않는 Vibe2 source target: ${target}`);return x;}
function sourcePrefix(target){if(target==='roblox')return'roblox-games/';if(target==='web')return'web-games/';if(target==='unity')return'unity-games/';if(target==='unreal')return'unreal-games/';if(target==='godot')return'godot-games/';return'';}
function assertSourceRoot(root,target){const normalized=posix(root),prefix=sourcePrefix(target);if(!prefix||!normalized.startsWith(prefix)||normalized.includes('..'))throw new Error(`허용되지 않은 source root: ${root}`);if(target==='web'&&normalized.split('/').length!==2)throw new Error(`기존 웹게임 루트만 허용: ${root}`);return normalized;}
function assertRelativeSourcePath(relative,target){const normalized=posix(relative);if(!normalized||normalized.startsWith('/')||normalized.split('/').includes('..'))throw new Error(`잘못된 상대 경로: ${relative}`);const ext=path.extname(normalized).toLowerCase();if(BINARY_EXTENSIONS.has(ext))throw new Error(`엔진 에디터 필요 바이너리 파일: ${relative}`);if(!targetExtensions(target).has(ext))throw new Error(`텍스트 worker 허용 확장자 아님: ${relative}`);return normalized;}
function normalizeResponsibleFiles(order,root,target){return(order?.source?.responsibleFiles||[]).map(value=>{const normalized=posix(value);const relative=normalized.startsWith(`${root}/`)?normalized.slice(root.length+1):normalized;return assertRelativeSourcePath(relative,target);}).filter(Boolean);}
function sourceRootBootstrapAllowed(order,target,root,responsibleFiles){
  const evidence=new Set((order?.selectedTask?.evidence||[]).map(clean));
  return target==='web'
    &&order?.workerPolicy?.sourceRootBootstrapAllowed===true
    &&evidence.has('source-root-bootstrap-required')
    &&responsibleFiles.length===1
    &&responsibleFiles[0]==='index.html'
    &&/^web-games\/[a-zA-Z0-9._-]+$/.test(root);
}
function normalizeModelPath(value,{target,responsibleFiles=[],sourceRootRelative=''}={}){let normalized=posix(value);if(normalized.startsWith(`${sourceRootRelative}/`))normalized=normalized.slice(sourceRootRelative.length+1);if(PLACEHOLDER_PATHS.has(normalized.toLowerCase())){if(responsibleFiles.length!==1)throw new Error(`모델 예시 경로를 실제 파일로 결정할 수 없음: ${value}`);normalized=responsibleFiles[0];}normalized=assertRelativeSourcePath(normalized,target);if(responsibleFiles.length&&!responsibleFiles.includes(normalized))throw new Error(`책임 파일 범위 밖 수정 금지: ${normalized}`);return normalized;}
function listContextFiles(root,target,ignored=[]){const ignore=ignored.map(posix).filter(Boolean),rows=[];const walk=current=>{if(rows.length>=MAX_CONTEXT_FILES)return;for(const entry of fs.readdirSync(current,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){if(rows.length>=MAX_CONTEXT_FILES)return;if(['.git','node_modules','Library','Temp','Logs','Binaries','Intermediate','Saved','DerivedDataCache'].includes(entry.name))continue;const full=path.join(current,entry.name),relative=posix(path.relative(root,full));if(ignore.some(v=>relative===v||relative.startsWith(`${v}/`)))continue;if(entry.isDirectory())walk(full);else{const ext=path.extname(entry.name).toLowerCase();if(targetExtensions(target).has(ext)&&!BINARY_EXTENSIONS.has(ext))rows.push({full,relative});}}};walk(root);return rows;}
function readContext(root,target,responsibleFiles=[],ignored=[],explorationFiles=[],{maxFiles=MAX_CONTEXT_FILES,maxBytes=MAX_CONTEXT_BYTES}={}){
  const fileLimit=Math.max(1,Math.min(MAX_CONTEXT_FILES,Number(maxFiles)||MAX_CONTEXT_FILES));
  const byteLimit=Math.max(12000,Math.min(MAX_CONTEXT_BYTES,Number(maxBytes)||MAX_CONTEXT_BYTES));
  const preferred=unique([...responsibleFiles,...explorationFiles]).slice(0,fileLimit);
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
function normalizeCandidate(raw,{target,responsibleFiles,sourceRootRelative,allowFullRewrite=false,minFullRewriteBytes=MIN_FULL_REWRITE_BYTES}){const envelope=typeof raw==='string'&&allowFullRewrite?parseFullFileEnvelope(raw):null;const directHtml=typeof raw==='string'&&allowFullRewrite&&!envelope?parseDirectFullHtml(raw,{responsibleFiles}):null;const parsed=envelope||directHtml||(typeof raw==='string'?extractJson(raw):raw);if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error('모델 후보는 JSON 객체 또는 허용된 전체 파일 응답이어야 함');const edits=(Array.isArray(parsed.edits)?parsed.edits:[]).map(item=>({path:normalizeModelPath(item?.path,{target,responsibleFiles,sourceRootRelative}),find:String(item?.find??''),replace:String(item?.replace??'')}));for(const edit of edits){if(!edit.find)throw new Error(`edit find 비어 있음: ${edit.path}`);if(edit.find===edit.replace)throw new Error(`변경 없는 edit: ${edit.path}`);}const newFiles=(Array.isArray(parsed.newFiles)?parsed.newFiles:[]).map(item=>{if(responsibleFiles.length)throw new Error('책임 파일이 지정된 작업은 새 파일 자동 생성 금지');const relative=normalizeModelPath(item?.path,{target,responsibleFiles:[],sourceRootRelative}),content=String(item?.content??'');if(!content||Buffer.byteLength(content,'utf8')>MAX_FILE_BYTES)throw new Error(`새 파일 크기 오류: ${relative}`);return{path:relative,content};});if(newFiles.length>MAX_NEW_FILES)throw new Error(`새 파일은 최대 ${MAX_NEW_FILES}개`);const requiredFullRewriteBytes=Math.max(MIN_FULL_REWRITE_BYTES,Math.min(MAX_FILE_BYTES,Number(minFullRewriteBytes)||MIN_FULL_REWRITE_BYTES));const replaceFiles=(Array.isArray(parsed.replaceFiles)?parsed.replaceFiles:[]).map(item=>{if(!allowFullRewrite)throw new Error('전체 파일 교체는 명시된 Web 재구축 작업에서만 허용');const relative=normalizeModelPath(item?.path,{target,responsibleFiles,sourceRootRelative}),content=String(item?.content??''),bytes=Buffer.byteLength(content,'utf8');if(!content||bytes<requiredFullRewriteBytes||bytes>MAX_FILE_BYTES)throw new Error(`전체 교체 파일 크기 오류: ${relative}:bytes=${bytes}:min=${requiredFullRewriteBytes}:max=${MAX_FILE_BYTES}`);return{path:relative,content};});const touched=[...edits.map(x=>x.path),...newFiles.map(x=>x.path),...replaceFiles.map(x=>x.path)];const touchedCount=new Set(touched).size;if(!touched.length)throw new Error('후보가 실제 source 변경을 생성하지 않음');if(touchedCount>MAX_CHANGED_FILES)throw new Error(`변경 파일 수가 최대 ${MAX_CHANGED_FILES}개를 초과함`);if(touchedCount!==touched.length)throw new Error('같은 파일에 edit/new/replace 중복 작업 금지');return{summary:clean(parsed.summary)||'Vibe2 source candidate',expectedEffect:clean(parsed.expectedEffect),edits,newFiles,replaceFiles,tests:(Array.isArray(parsed.tests)?parsed.tests:[]).map(clean).filter(Boolean).slice(0,8)};}
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
    'Web 오디오는 첫 사용자 입력 이후 활성화하고 mute/volume과 resume 중복재생 방지를 유지한다.',
    '모션·VFX·카메라는 모바일 터치와 위험 가독성을 방해하지 않는다.'
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
`Allowed edit paths: ${allowed}`,
context.exactSourceWindows?'CONTEXT MODE: exact responsibility windows. Each FILE window contains exact source text but separate windows are not contiguous. Any edits[].find MUST be copied wholly from one exact window; never span two windows or invent omitted text.':'',
allowFullRewrite?(sourceRootBootstrap?'OWNER AUTHORIZATION: create the first complete playable Web baseline at the exact responsible index.html path. This is an approved missing-source bootstrap. Build actual mobile gameplay with direct player input, real game-state progression, failure/success or escalating progression, restart, responsive layout, save compatibility scaffolding where required, and no external network dependency.':'OWNER AUTHORIZATION: this existing Web prototype must be rebuilt into a real playable game. Replace the responsible existing file completely. Do not return a validation dashboard, fake state buttons, or a thin prototype. Build actual mobile gameplay with direct player input, real game-state progression, failure/success or escalating progression, restart, responsive layout, and no external network dependency.'):'Preserve gameplay values, save meaning and existing behavior unless the work order explicitly authorizes a protected change.',
allowFullRewrite?'The PATH line MUST be one exact path from Allowed edit paths. Everything between the content and end markers is written verbatim as the replacement file. The end marker is mandatory; never omit it.':'Every edits[].path and replaceFiles[].path MUST be one exact path from Allowed edit paths.',
allowFullRewrite?`INITIAL SEED STRATEGY: on this first response, prioritize a COMPLETE CLOSED playable seed of about ${FULL_WEB_INITIAL_SEED_TARGET_MIN_BYTES}-${FULL_WEB_INITIAL_SEED_TARGET_MAX_BYTES} UTF-8 bytes and finish </html> plus VIBE2_FILE_END early. Do not chase the final size in one pass; the worker will automatically expand a valid seed. The seed must already contain real input, mutable state, an update/state-transition loop, basic progression, reachable result state, restart/reset, responsive mobile controls, and persistent-capable state.`:'',
allowFullRewrite?`Full Web generation target after automatic expansion: ${fullWebTarget.minBytes}-${fullWebTarget.maxBytes} UTF-8 bytes. The parser hard safety gate remains ${MIN_FULL_REWRITE_BYTES}-${MAX_FILE_BYTES} bytes, but final acceptance still requires at least ${fullWebTarget.minBytes} bytes. Use substantial executable JavaScript and do not pad with filler text. Do not return a tiny shell, placeholder dashboard, validation buttons, or static mock UI.`:'Do not expand unrelated code.',
allowFullRewrite?'Required output format:\nVIBE2_FULL_FILE\nPATH:index.html\nSUMMARY:short summary\nEXPECTED_EFFECT:short expected effect\nTEST:mobile gameplay\nTEST:restart\nTEST:runtime\n---VIBE2_FILE_CONTENT---\n<!doctype html>\n...complete playable HTML...\n</html>\n---VIBE2_FILE_END---':'Every edits[].find MUST be copied character-for-character from the matching FILE block and occur exactly once.',
'Do not output binary assets. Do not use wrapper/monkey patches. Do not change homepage/company files.',
'For web target, stay inside the existing web-games/<game> root.',
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
  const violations=[];
  if(hardGate&&budget.unrelatedSystemMutationForbidden===true&&unexpectedSystems.length)violations.push('UNRELATED_SYSTEM:'+unexpectedSystems.join(','));
  if(hardGate&&unprovenEdits.length)violations.push('UNPROVEN_EDIT_SCOPE:'+unprovenEdits.map(row=>row.path).join(','));
  if(hardGate&&saveKeyViolations.length)violations.push('SAVE_KEY_COMPATIBILITY:'+saveKeyViolations.join(','));
  return{
    version:1,mode:hardGate?'HARD_ENFORCE':'OBSERVE_ONLY',hardGate,pass:violations.length===0,confidence,developmentMode:developmentMode||null,
    markerCount:markers.length,editCount:edits.length,touchedSystems,allowedSystems:[...allowedSystems],unexpectedSystems,
    unprovenEditPaths:unprovenEdits.map(row=>row.path),protectedSaveKeyCount:protectedSaveKeys.length,saveKeyViolations,violations,
    ambiguousClassificationObserved:!hardGate,writableScopeExpansionAllowed:false,authorityExpanded:false
  };
}
export function generationFailureClass(error){
  const message=clean(error?.message||error);
  if(/실제 source 변경|변경 없는 edit/i.test(message))return'NO_OP';
  if(/시간 초과|timeout|prediction aborted|token repeat limit/i.test(message))return'TIMEOUT';
  if(/SEMANTIC_DIFF_BUDGET_VIOLATION/i.test(message))return'SEMANTIC_DIFF_BUDGET';
  if(/책임 파일 범위 밖 수정 금지|허용 확장자 아님|허용 경로|exact allowed path/i.test(message))return'INVALID_PATH';
  if(/전체 교체 파일 크기 오류/i.test(message))return'FULL_REWRITE_SIZE';
  if(/JSON|파싱|시작을 찾지 못함|잘렸거나 종료 마커|응답 비어 있음|전체 파일 응답|Web expansion(?:은| 종료 마커| 내용)|FULL_WEB_EXPANSION_(?:NO_GROWTH|TOO_SMALL)|같은 파일에 edit\/new\/replace 중복 작업 금지/i.test(message))return'MALFORMED_OUTPUT';
  if(/edit find/i.test(message))return'EDIT_MATCH';
  return'OTHER';
}
function focusedFinalRetryAllowed(error){return['NO_OP','TIMEOUT','INVALID_PATH','EDIT_MATCH','MALFORMED_OUTPUT','SEMANTIC_DIFF_BUDGET'].includes(generationFailureClass(error));}
function fullWebFinalRetryAllowed(error){return['FULL_REWRITE_SIZE','TIMEOUT','MALFORMED_OUTPUT'].includes(generationFailureClass(error));}
export function shouldRetryGenerationError(error){
  const message=clean(error?.message||error);
  return /시간 초과|timeout|JSON|파싱|시작을 찾지 못함|잘렸거나 종료 마커|응답 비어 있음|전체 파일 응답|Web expansion(?:은| 종료 마커| 내용)|FULL_WEB_EXPANSION_(?:NO_GROWTH|TOO_SMALL)|전체 교체 파일 크기 오류|실제 source 변경|변경 없는 edit|변경 파일 수|edit find|책임 파일 범위 밖 수정 금지|허용 확장자 아님|허용 경로|exact allowed path|같은 파일에 edit\/new\/replace 중복 작업 금지|SEMANTIC_DIFF_BUDGET_VIOLATION|prediction aborted|token repeat limit/i.test(message);
}
export function exactRetryAnchorSuggestions(prompt,{max=3,sourceRoot='',responsibleFiles=[]}={}){
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

export function focusedReplaceOnlySpec(prompt,{responsibleFiles=[],sourceRoot='',anchorIndex=0}={}){
  const raw=String(prompt??'');
  const allowedLine=raw.split('\n').find(line=>line.trimStart().startsWith('Allowed edit paths:'))||'';
  const allowedPaths=allowedLine
    ?allowedLine.slice(allowedLine.indexOf(':')+1).split(',').map(clean).filter(Boolean)
    :[];
  const exactResponsible=unique(responsibleFiles.length?responsibleFiles:allowedPaths);
  if(exactResponsible.length!==1)return null;
  const anchors=exactRetryAnchorSuggestions(raw,{max:5,sourceRoot,responsibleFiles:exactResponsible});
  const index=Math.max(0,Math.min(anchors.length-1,Number(anchorIndex)||0));
  const find=anchors[index]||'';
  if(!find)return null;
  let context=find;
  if(clean(sourceRoot)){
    try{
      const root=path.resolve(sourceRoot),relative=posix(exactResponsible[0]),file=path.resolve(root,relative);
      if(file.startsWith(root+path.sep)&&fs.existsSync(file)&&fs.statSync(file).isFile()){
        const source=fs.readFileSync(file,'utf8'),at=source.indexOf(find);
        if(at>=0){
          const radius=1400;
          const before=source.slice(Math.max(0,at-radius),at);
          const after=source.slice(at+find.length,Math.min(source.length,at+find.length+radius));
          context=(before+find+after).trim();
        }
      }
    }catch{}
  }
  return{path:exactResponsible[0],find,context};
}
export function buildFocusedReplaceOnlyPrompt(prompt,{error=null,responsibleFiles=[],sourceRoot='',anchorIndex=0}={}){
  const spec=focusedReplaceOnlySpec(prompt,{responsibleFiles,sourceRoot,anchorIndex});
  if(!spec)return null;
  const raw=String(prompt??''),goal=raw.split('\n').find(line=>line.startsWith('Goal:'))||'Goal: make the smallest real implementation change required by the work order';
  const reason=clean(error?.message||error).replace(/\s+/g,' ').slice(0,240);
  return{
    spec,
    prompt:[
      'You are the Vibe2 focused source repair worker. Return JSON only.',
      goal,
      reason?'Previous failure: '+reason:'',
      'Exact writable path: '+JSON.stringify(spec.path),
      'Exact find anchor already fixed by the worker: '+JSON.stringify(spec.find),
      'Do NOT return path or find. The worker will apply them exactly.',
      'Return exactly one JSON object with one key: {"replace":"COMPLETE_REPLACEMENT_SOURCE_SNIPPET"}',
      'replace MUST be materially different from the exact find anchor, syntactically valid in the shown source context, and the smallest coherent behavior change that advances the Goal.',
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
export function buildGenerationRetryPrompt(prompt,{allowFullRewrite=false,error=null,responsibleFiles=[],attempt=2,previousOutput='',sourceRoot=''}={}){
  const rawPrompt=String(prompt??'');
  const allowedLine=rawPrompt.split('\n').find(line=>line.trimStart().startsWith('Allowed edit paths:'))||'';
  const allowedPaths=allowedLine
    ? allowedLine.slice(allowedLine.indexOf(':')+1).split(',').map(clean).filter(Boolean)
    : [];
  const exactResponsible=unique(responsibleFiles.length?responsibleFiles:allowedPaths);
  const exactPath=exactResponsible.length===1?exactResponsible[0]:'';
  const reason=clean(error?.message||error).slice(0,240)||'malformed candidate';
  const zeroChange=/실제 source 변경/i.test(reason);
  const noChangeEdit=/변경 없는 edit/i.test(reason);
  const timeoutFailure=/시간 초과|timeout|prediction aborted|token repeat limit/i.test(reason);
  const invalidPath=/허용 확장자 아님|책임 파일 범위 밖 수정 금지|허용 경로|exact allowed path/i.test(reason);
  const editMatchFailure=/edit find/i.test(reason);
  const semanticDiffViolation=/SEMANTIC_DIFF_BUDGET_VIOLATION/i.test(reason);
  const retryAnchorSuggestions=!allowFullRewrite?exactRetryAnchorSuggestions(rawPrompt,{max:3,sourceRoot,responsibleFiles:exactResponsible}):[];
  const retryAnchorInstruction=retryAnchorSuggestions.length
    ?['EXACT FIND ANCHOR OPTIONS (copy one entire line verbatim as edits[0].find; do not alter whitespace or punctuation):',...retryAnchorSuggestions.map((value,index)=>`ANCHOR_${index+1}: ${JSON.stringify(value)}`)].join('\n')
    :'';
  const safeReason=invalidPath?'candidate attempted a path outside Allowed edit paths':semanticDiffViolation?'candidate crossed the compiled semantic edit budget; keep only primary responsibility and required direct dependencies':reason;
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
  if(!allowFullRewrite&&(zeroChange||noChangeEdit||invalidPath||editMatchFailure||semanticDiffViolation||(attempt>=2&&timeoutFailure))){
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
          if(attempt>=3||timeoutFailure){
            const body=section.split('\n').slice(1).join('\n');
            const excerpt=boundedLargeExcerpt(body,5000);
            section=header+'\n'+excerpt.content;
          }
          editable.push(section);
        }
      }
      if(editable.length){
        const compactTimeoutPrefix=timeoutFailure?[
          'You are the Vibe2 game source worker. Return JSON only.',
          rawPrompt.split('\n').find(line=>line.startsWith('Engine:'))||'',
          rawPrompt.split('\n').find(line=>line.startsWith('Goal:'))||'',
          allowedLine,
          'Preserve gameplay values, save meaning and existing behavior unless the work order explicitly authorizes a protected change.',
          'Every edits[].path MUST be one exact path from Allowed edit paths.',
          'Every edits[].find MUST be copied character-for-character from the matching EDITABLE FILE block and occur exactly once.',
          'Do not expand unrelated code.'
        ].filter(Boolean).join('\n'):prefix;
        retryBase=[compactTimeoutPrefix,...editable].join('\n\n');
      }
    }
  }
  const correction=allowFullRewrite
    ? [
        'RECOVERY RETRY: the previous generation did not finish or violated the full-file envelope.',
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
        zeroChange?'RECOVERY RETRY: the previous candidate contained zero actual source changes.':noChangeEdit?'RECOVERY RETRY: the previous edit copied the same text without changing source.':editMatchFailure?'RECOVERY RETRY: the previous edits[].find text did not match the writable source.':semanticDiffViolation?'RECOVERY RETRY: the previous candidate crossed the compiled semantic edit budget.':timeoutFailure?'RECOVERY RETRY: the previous model response exceeded the time budget.':invalidPath?'RECOVERY RETRY: the previous candidate used an invalid edit path.':'RECOVERY RETRY: the previous candidate was not strict valid JSON.',
        `Previous failure: ${safeReason}`,
        (attempt>=3||(attempt>=2&&timeoutFailure))?'Return exactly one minimal JSON object with only an edits array: {"edits":[{"path":"EXACT_ALLOWED_PATH","find":"EXACT_UNIQUE_SOURCE_TEXT","replace":"MINIMAL_REAL_REPLACEMENT"}]}. Do not include summary, expectedEffect, tests, newFiles, replaceFiles, markdown, comments, or extra keys.':'Return one strict JSON object only. Use double quotes for every key and string. Escape newlines and quotes inside replacement text. No markdown, comments, trailing commas, or JavaScript object syntax.',
        exactPath?`The ONLY writable path is "${exactPath}". Every edits[].path MUST equal exactly "${exactPath}".`:'',
        retryAnchorInstruction,
        zeroChange?'You MUST produce at least one edits[] entry. Use one EXACT FIND ANCHOR OPTION above when available, then make replace materially different. Do not return empty edits/newFiles/replaceFiles.':noChangeEdit?'Return at least one edits[] entry whose replace is materially different from find. Use one EXACT FIND ANCHOR OPTION above when available, then make the smallest real implementation change required by the work order.':editMatchFailure?'Use exactly one EXACT FIND ANCHOR OPTION above when available. Copy the entire anchor value character-for-character, including whitespace and punctuation. Do not paraphrase, normalize, reconstruct, or guess source text.':semanticDiffViolation?'Keep the patch inside the COMPILED EDIT CONTRACT. Touch the primary responsibility and only directly required dependencies. Remove any unrelated economy, combat, progression, save, input, placement, AI, world, interaction, or goal-state mutation not listed in the semantic budget.':invalidPath?'Use only the exact writable path copied exactly from Allowed edit paths. Never output placeholders, labels, globs, guessed filenames, or any READ-ONLY path.':'Prefer the smallest responsible edit that satisfies the work order.',
        zeroChange||noChangeEdit||invalidPath||editMatchFailure||semanticDiffViolation||timeoutFailure?'Recovery context intentionally contains only writable FILE blocks; do not bypass responsible-file boundaries, widen scope, invent a new file, or expose READ-ONLY paths.':'',
        timeoutFailure?'Start immediately with {"edits":[ and close the single edit object and array before generating anything else. Keep find to the shortest unique exact source text and keep replace to the smallest coherent implementation that fixes the requested behavior.':''
      ].filter(Boolean).join('\n');
  const focusedFinal=!allowFullRewrite&&(attempt>=3||(attempt>=2&&timeoutFailure));
  const fullWebFinal=attempt>=3&&allowFullRewrite;
  const finalInstruction=focusedFinal
    ?'FINAL FOCUSED RETRY: output only {"edits":[{"path":"EXACT_ALLOWED_PATH","find":"EXACT_UNIQUE_SOURCE_TEXT","replace":"MINIMAL_REAL_REPLACEMENT"}]}. When EXACT FIND ANCHOR OPTIONS are present, use one entire anchor value verbatim as find. Keep replace minimal but behaviorally complete. No other keys or prose.'
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
async function generateCandidateWithRecovery({prompt,model,responseFile='',responseFiles=[],allowFullRewrite,target,responsibleFiles,sourceRootRelative,sourceRoot='',focusedWebRepair=false,minFullRewriteBytes=MIN_FULL_REWRITE_BYTES,candidateValidator=null,candidateVariant='primary'}={}){
  let lastError=null;
  let lastRaw='';
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
  let fullWebProgressCreditCount=0;
  const baseMaxAttempts=generationAttemptBudget({allowFullRewrite,variant:candidateVariant});
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
    const priorFailureClass=generationFailureClass(lastError);
    const timeoutFastEscalation=!allowFullRewrite&&attempt>=2&&priorFailureClass==='TIMEOUT';
    const editMatchFastEscalation=!allowFullRewrite&&attempt>=2&&priorFailureClass==='EDIT_MATCH';
    const focusedFinal=!allowFullRewrite&&(attempt>=3||timeoutFastEscalation||editMatchFastEscalation||(speculativeVariant&&attempt>=2));
    const expansionMode=allowFullRewrite&&Boolean(accumulatedFullWeb)&&attempt>1;
    const focusedReplaceOnly=focusedFinal
      ?buildFocusedReplaceOnlyPrompt(prompt,{error:lastError,responsibleFiles,sourceRoot,anchorIndex:focusedReplaceAnchorCursor})
      :null;
    const remainingStages=Math.max(1,maxAttempts-attempt);
    const retryPreviousOutput=allowFullRewrite&&accumulatedFullWeb&&!expansionMode
      ?accumulatedFullWeb.content
      :(allowFullRewrite&&bestFullWebFallbackRaw?bestFullWebFallbackRaw:lastRaw);
    const attemptPrompt=expansionMode
      ?buildFullWebExpansionPrompt(prompt,accumulatedFullWeb,{stage:expansionStages+1,minBytes:minFullRewriteBytes,maxBytes:Math.max(FULL_WEB_GENERATION_TARGET_MAX_BYTES,minFullRewriteBytes*2),remainingStages,previousFailure:lastError?.message||'',capabilityTarget:fullWebExpansionStageTarget(accumulatedFullWeb.content,expansionStages+1)})
      :(focusedReplaceOnly?.prompt||(retry?buildGenerationRetryPrompt(prompt,{allowFullRewrite,error:lastError,responsibleFiles,attempt,previousOutput:retryPreviousOutput,sourceRoot}):prompt));
    const maxPredict=expansionMode
      ?FULL_WEB_EXPANSION_MAX_PREDICT
      :(allowFullRewrite
        ?(attempt>=maxAttempts?FULL_WEB_FINAL_RETRY_MAX_PREDICT:(retry?FULL_WEB_RETRY_MAX_PREDICT:FULL_WEB_MAX_PREDICT))
        :(focusedReplaceOnly?JSON_FOCUSED_REPLACE_MAX_PREDICT:(focusedFinal?JSON_FINAL_RETRY_MAX_PREDICT:(focusedWebRepair?FOCUSED_WEB_REPAIR_MAX_PREDICT:(retry?JSON_RETRY_MAX_PREDICT:DEFAULT_MAX_PREDICT)))));
    const timeoutMs=expansionMode
      ?FULL_WEB_EXPANSION_TIMEOUT_MS
      :(allowFullRewrite
        ?(attempt>=maxAttempts?FULL_WEB_FINAL_RETRY_TIMEOUT_MS:(retry?FULL_WEB_RETRY_TIMEOUT_MS:FULL_WEB_TIMEOUT_MS))
        :(focusedReplaceOnly?JSON_FOCUSED_REPLACE_TIMEOUT_MS:(focusedFinal?JSON_FINAL_RETRY_TIMEOUT_MS:(retry?JSON_RETRY_TIMEOUT_MS:DEFAULT_TIMEOUT_MS))));
    const contextWindow=expansionMode
      ?FULL_WEB_EXPANSION_CONTEXT_WINDOW
      :(allowFullRewrite?FULL_WEB_CONTEXT_WINDOW:(focusedReplaceOnly?JSON_FOCUSED_REPLACE_CONTEXT_WINDOW:(focusedFinal?JSON_FINAL_CONTEXT_WINDOW:(focusedWebRepair?FOCUSED_WEB_REPAIR_CONTEXT_WINDOW:JSON_CONTEXT_WINDOW))));
    const fake=responseFileForAttempt(responseFile,responseFiles,attempt);
    const attemptPromptBytes=Buffer.byteLength(attemptPrompt,'utf8');
    if(allowFullRewrite&&retry)console.log(`VIBE2_FULL_WEB_RETRY_PROMPT_BYTES=${attempt}:${attemptPromptBytes}`);
    const temperature=focusedReplaceOnly?0.26:(expansionMode?Math.min(0.26,0.18+expansionStages*0.04):(retry?(attempt>=3?0.22:0.16):0.08));
    const focusedFirstEditEarlyStop=focusedWebRepair&&!retry&&!allowFullRewrite&&!focusedReplaceOnly;
    const completionMode=focusedReplaceOnly?'JSON_REPLACE_ONLY':(expansionMode?'FULL_WEB_EXPANSION':(allowFullRewrite?'FULL_WEB':((timeoutFastEscalation||focusedFirstEditEarlyStop)?'JSON_EDIT_PARTIAL':'JSON_EDIT')));
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
        const focusedRaw=focusedReplaceOnly?normalizeFocusedReplaceOnly(raw,focusedReplaceOnly.spec):(streamedPartialEdit||raw);
        candidate=normalizeCandidate(focusedRaw,{target,responsibleFiles,sourceRootRelative,allowFullRewrite,minFullRewriteBytes});
      }
      if(candidate.edits.length&&sourceRoot&&fs.existsSync(sourceRoot))applyExactEdits(sourceRoot,candidate.edits,{dryRun:true});
      lastCandidateValidation=typeof candidateValidator==='function'?candidateValidator(candidate):null;
      return {candidate,candidateValidation:lastCandidateValidation,generation:{attempts:attempt,recoveryUsed:retry,partialTimeoutRecovery:Boolean(streamedPartialEdit)&&!focusedFirstEditEarlyStop,streamedPartialEditRecovery:Boolean(streamedPartialEdit),focusedFirstEditEarlyStop:Boolean(streamedPartialEdit)&&focusedFirstEditEarlyStop,focusedFinalRetry:focusedFinal,focusedReplaceOnly:focusedReplaceOnly!=null,focusedFirstAttemptFastPath:focusedWebRepair&&attempt===1&&focusedReplaceOnly!=null,focusedReplaceAnchorRotations,focusedReplaceNoOpCreditUsed,focusedWebRepair,fullWebClosedHtmlEarlyStop,fullWebFinalAdditiveExpansion:expansionMode&&attempt===maxAttempts,fullWebAdditiveAttemptCreditUsed:additiveAttemptCreditUsed,fullWebProgressCreditCount,fullWebProgressCreditUsed:fullWebProgressCreditCount>0,baseAttemptBudget:baseMaxAttempts,effectiveAttemptBudget:maxAttempts,fullWebRetryPromptCompacted:allowFullRewrite&&retry,fullWebRetryPromptBytes:allowFullRewrite&&retry?attemptPromptBytes:0,fullWebExpansionStages:expansionStages,fullWebExpansionDocumentSeedRecoveries:expansionDocumentSeedRecoveries,fullWebFallbackBestPartialBytes:Buffer.byteLength(bestFullWebFallbackRaw,'utf8'),intermediateGrowthBytes:[...intermediateGrowthBytes],repeatedIntermediateOutputs,expansionStageTargets:[...expansionStageTargets],mode:allowFullRewrite?'FULL_WEB':'JSON_EDIT',maxPredict,timeoutMs,contextWindow,temperature,completionMode}};
    }catch(error){
      lastError=error;
      const partialOutput=String(error?.vibe2PartialOutput??'');
      if(partialOutput.trim())lastRaw=partialOutput;
      const failureClass=generationFailureClass(error);
      if(allowFullRewrite&&lastRaw.trim()&&Buffer.byteLength(lastRaw,'utf8')>Buffer.byteLength(bestFullWebFallbackRaw,'utf8')){
        bestFullWebFallbackRaw=lastRaw;
      }
      if(focusedReplaceOnly&&['TIMEOUT','MALFORMED_OUTPUT'].includes(failureClass)){
        const focusedPartial=partialOutput.trim()?partialOutput:lastRaw;
        if(focusedPartial.trim()&&modelResponseComplete(focusedPartial,'JSON_REPLACE_ONLY')){
          try{
            const focusedCandidate=normalizeCandidate(normalizeFocusedReplaceOnly(focusedPartial,focusedReplaceOnly.spec),{target,responsibleFiles,sourceRootRelative,allowFullRewrite:false,minFullRewriteBytes});
            if(focusedCandidate.edits.length&&sourceRoot&&fs.existsSync(sourceRoot))applyExactEdits(sourceRoot,focusedCandidate.edits,{dryRun:true});
            lastCandidateValidation=typeof candidateValidator==='function'?candidateValidator(focusedCandidate):null;
            console.log('VIBE2_FOCUSED_REPLACE_PARTIAL_RECOVERED='+attempt+':'+focusedReplaceOnly.spec.path);
            return{candidate:focusedCandidate,candidateValidation:lastCandidateValidation,generation:{attempts:attempt,recoveryUsed:true,partialTimeoutRecovery:failureClass==='TIMEOUT',partialMalformedRecovery:failureClass==='MALFORMED_OUTPUT',streamedPartialEditRecovery:false,focusedFinalRetry:focusedFinal,focusedReplaceOnly:true,focusedFirstAttemptFastPath:focusedWebRepair&&attempt===1,focusedReplaceAnchorRotations,focusedReplaceNoOpCreditUsed,focusedWebRepair,fullWebExpansionStages:expansionStages,intermediateGrowthBytes:[...intermediateGrowthBytes],repeatedIntermediateOutputs,expansionStageTargets:[...expansionStageTargets],mode:'JSON_EDIT',maxPredict,timeoutMs,contextWindow,temperature,completionMode}};
          }catch(recoveryError){
            console.log('VIBE2_FOCUSED_REPLACE_PARTIAL_REJECTED='+attempt+':'+generationFailureClass(recoveryError)+':'+clean(recoveryError?.message||recoveryError).replace(/\s+/g,' ').slice(0,240));
          }
        }
      }
      let focusedNoOpCreditRetry=false;
      if(focusedReplaceOnly&&failureClass==='NO_OP'){
        focusedReplaceAnchorCursor+=1;
        focusedReplaceAnchorRotations+=1;
        if(speculativeVariant&&attempt>=maxAttempts&&!focusedReplaceNoOpCreditUsed){
          const alternate=focusedReplaceOnlySpec(prompt,{responsibleFiles,sourceRoot,anchorIndex:focusedReplaceAnchorCursor});
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
      const hasAnother=ordinaryRetry||focusedRetry||focusedNoOpCreditRetry||progressiveFullWebCreditRetry||fullWebAccumulationRetry||fullWebFallbackRetry;
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
async function requestLocalModel(prompt,{model=DEFAULT_MODEL,responseFile='',maxPredict=DEFAULT_MAX_PREDICT,timeoutMs=DEFAULT_TIMEOUT_MS,contextWindow=0,temperature=.08,completionMode='JSON_EDIT'}={}){const fake=clean(responseFile||process.env.VIBE2_MODEL_RESPONSE_FILE);if(fake)return fs.readFileSync(path.resolve(fake),'utf8');const options={num_predict:maxPredict,temperature:Math.max(.02,Math.min(.4,Number(temperature)||.08))};if(contextWindow>0)options.num_ctx=contextWindow;const body=JSON.stringify({model,prompt,stream:true,think:false,options});return await new Promise((resolve,reject)=>{let settled=false,request=null,pending='',output='';const finish=(error,value='')=>{if(settled)return;settled=true;clearTimeout(timer);if(request&&!request.destroyed)request.destroy();if(error)reject(error);else resolve(value);};const timer=setTimeout(()=>{const error=new Error(`Ollama 응답 시간 초과: ${timeoutMs}ms`);error.vibe2PartialOutput=output;finish(error);},timeoutMs);request=http.request({hostname:'127.0.0.1',port:11434,path:'/api/generate',method:'POST',headers:{'content-type':'application/json','content-length':Buffer.byteLength(body)}},response=>{if((response.statusCode||0)<200||(response.statusCode||0)>=300){response.resume();finish(new Error(`Ollama HTTP ${response.statusCode}`));return;}response.setEncoding('utf8');const consume=line=>{const text=line.trim();if(!text)return;let payload;try{payload=JSON.parse(text);}catch(error){throw new Error(`Ollama 스트림 JSON 파싱 실패: ${error.message}`);}if(payload?.error)throw new Error(`Ollama 오류: ${payload.error}`);if(typeof payload?.response==='string'){output+=payload.response;if(modelResponseComplete(output,completionMode))finish(null,output);}};response.on('data',chunk=>{if(settled)return;try{pending+=chunk;let at;while((at=pending.indexOf('\n'))>=0){const line=pending.slice(0,at);pending=pending.slice(at+1);consume(line);if(settled)return;}}catch(error){finish(error);}});response.on('end',()=>{if(settled)return;try{if(pending.trim())consume(pending);if(settled)return;if(!output.trim())throw new Error('Ollama 응답 비어 있음');finish(null,output);}catch(error){finish(error);}});response.on('error',finish);});request.on('error',finish);request.end(body);});}
function currentBranch(cwd){try{return clean(execFileSync('git',['rev-parse','--abbrev-ref','HEAD'],{cwd,encoding:'utf8'}));}catch{return'';}}
function assertCandidateBranch(cwd){const branch=currentBranch(cwd);if(!branch||branch==='main'||branch==='master'||!branch.startsWith('vibe2/candidate/'))throw new Error(`source 적용은 vibe2/candidate/* 브랜치에서만 허용: ${branch||'unknown'}`);return branch;}
function applyNewFiles(root,newFiles){const changed=[];for(const file of newFiles){const target=path.join(root,file.path);if(fs.existsSync(target))throw new Error(`newFiles 대상이 이미 존재함: ${file.path}`);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,file.content,'utf8');changed.push(file.path);}return changed;}
function applyReplaceFiles(root,replaceFiles,{allowCreate=false}={}){const changed=[];for(const file of replaceFiles){const target=path.join(root,file.path);const exists=fs.existsSync(target)&&fs.statSync(target).isFile();if(!exists&&!allowCreate)throw new Error(`replaceFiles 대상 없음: ${file.path}`);if(!exists)fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,file.content.endsWith('\n')?file.content:`${file.content}\n`,'utf8');changed.push(file.path);}return changed;}
function createCandidateSnapshot(sourceRoot,candidateRoot,candidate){const changed=[];const filesRoot=path.join(candidateRoot,'files');for(const relative of unique(candidate.edits.map(edit=>edit.path))){const source=path.join(sourceRoot,relative),target=path.join(filesRoot,relative);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(source,target);}if(candidate.edits.length)changed.push(...applyExactEdits(filesRoot,candidate.edits));for(const file of candidate.newFiles){const target=path.join(filesRoot,file.path);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,file.content,'utf8');changed.push(file.path);}for(const file of candidate.replaceFiles){const target=path.join(filesRoot,file.path);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,file.content.endsWith('\n')?file.content:`${file.content}\n`,'utf8');changed.push(file.path);}return[...new Set(changed)];}
function designManifestContract(order={}){const design=order?.designIntelligence||{};return{required:design.required===true,version:Number(design.version||0)||null,pipeline:Array.isArray(design.pipeline)?design.pipeline.map(clean).filter(Boolean):[],implementationGate:{allowed:design?.implementationGate?.allowed===true,blockers:Array.isArray(design?.implementationGate?.blockers)?design.implementationGate.blockers.map(clean).filter(Boolean):[]},evidenceRequirements:{autoPlayer:'verified-runtime-play-evidence-required',telemetry:'verified-observed-metrics-required',designReview:'verified-pass-required-before-experience-memory',qa:'verified-qa-evidence-required'},authorityExpanded:false};}
function waitingDesignEvidence(){return{autoPlayer:{status:'WAITING_EVIDENCE',verified:false},telemetry:{status:'WAITING_EVIDENCE',verified:false},designReview:{status:'WAITING_EVIDENCE',verified:false,decision:null},qa:{status:'WAITING_EVIDENCE',verified:false}};}

export async function runVibe2SourceWorker({cwd=process.cwd(),workOrderFile='.vibe2/work-order.json',outputRoot='.vibe2/candidates',model=DEFAULT_MODEL,responseFile='',responseFiles=[],applySource=false}={}){
  const order=readJson(path.resolve(cwd,workOrderFile));
  if(!order?.run||order?.workMode!=='source-change-candidate')throw new Error('실행 가능한 source-change work order 필요');
  if(order?.workerPolicy?.directMainWrite!==false)throw new Error('directMainWrite 정책 위반');
  const developmentAuthority=assertGameDevelopmentAuthority();
  const target=clean(order.target).toLowerCase();
  const sourceRootRelative=assertSourceRoot(order?.source?.root,target);
  const sourceRoot=path.resolve(cwd,sourceRootRelative);
  const responsibleFiles=normalizeResponsibleFiles(order,sourceRootRelative,target);
  const bootstrap=sourceRootBootstrapAllowed(order,target,sourceRootRelative,responsibleFiles);
  const sourceRootExists=fs.existsSync(sourceRoot)&&fs.statSync(sourceRoot).isDirectory();
  if(!sourceRootExists&&!bootstrap)throw new Error(`source root 없음: ${sourceRootRelative}`);
  const exploration=exploreVibe2WorkOrder({cwd,order});
  const allowFullRewrite=fullWebRewriteAllowed(order,target,exploration);
  const focusedWebRepair=isFocusedWebRepair(order,target,responsibleFiles,allowFullRewrite);
  const preferredContextMode=clean(order?.codingStrategyPreference?.preferredContextMode).toUpperCase();
  const preferBoundedContext=sourceRootExists&&focusedWebRepair&&preferredContextMode==='BOUNDED_FILE_EXCERPT_FALLBACK';
  const bootstrapHtml='<!doctype html><html><head><meta charset="utf-8"><title>Approved Web Bootstrap</title></head><body><main id="game"></main><script></script></body></html>';
  const focusedContext=sourceRootExists&&focusedWebRepair&&!preferBoundedContext?focusedSymbolContext(sourceRoot,target,responsibleFiles,exploration):null;
  const context=!sourceRootExists&&bootstrap
    ?{files:[{path:'index.html',content:bootstrapHtml,truncated:false,editable:true}],bytes:Buffer.byteLength(bootstrapHtml,'utf8'),mode:'BOOTSTRAP_SHELL',focusedSymbolCount:0,exactSourceWindows:false,fullFileFallback:false}
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
  const candidateValidator=candidate=>{
    const result=evaluateSemanticDiffBudget({candidate,editContract,allowFullRewrite,bootstrap,sourceRoot});
    if(!result.pass)throw new Error('SEMANTIC_DIFF_BUDGET_VIOLATION:'+result.violations.join('|'));
    return result;
  };
  const candidateVariant=clean(order?.candidateStrategyRole?.variant)||clean(process.env.VIBE2_SPECULATIVE_VARIANT)||'primary';
  const generated=await generateCandidateWithRecovery({prompt,model,responseFile,responseFiles,allowFullRewrite,target,responsibleFiles,sourceRootRelative,sourceRoot,focusedWebRepair,minFullRewriteBytes:fullWebTarget?.minBytes||MIN_FULL_REWRITE_BYTES,candidateValidator,candidateVariant});
  const candidate=generated.candidate;
  const semanticDiffEnforcement=generated.candidateValidation||candidateValidator(candidate);
  const generation={...generated.generation,candidateVariant,attemptBudget:generationAttemptBudget({allowFullRewrite,variant:candidateVariant}),speculativeAttemptBudgetApplied:/^speculative-/i.test(candidateVariant),fullWebInitialSeedStrategy:allowFullRewrite,fullWebInitialSeedTargetBytes:allowFullRewrite?[FULL_WEB_INITIAL_SEED_TARGET_MIN_BYTES,FULL_WEB_INITIAL_SEED_TARGET_MAX_BYTES]:[],contextFiles:context.files.length,contextBytes:context.bytes,contextMode:context.mode||'STANDARD_CONTEXT',focusedSymbolCount:Number(context.focusedSymbolCount||0),exactSourceWindows:context.exactSourceWindows===true,fullFileContextFallback:context.fullFileFallback===true,contextPreferenceRequested:preferredContextMode||null,contextPreferenceApplied:Boolean(preferredContextMode&&preferredContextMode===(context.mode||'STANDARD_CONTEXT'))};
  if(bootstrap&&(candidate.edits.length||candidate.newFiles.length||candidate.replaceFiles.length!==1||candidate.replaceFiles[0]?.path!=='index.html')){
    throw new Error('Web source bootstrap는 index.html 전체 파일 생성 1건만 허용');
  }
  const taskId=safeId(order.taskId);
  const candidateRoot=path.resolve(cwd,outputRoot,taskId);
  const candidateManifestPath=posix(path.relative(cwd,path.join(candidateRoot,'manifest.json')));
  fs.rmSync(candidateRoot,{recursive:true,force:true});
  fs.mkdirSync(candidateRoot,{recursive:true});
  let changedFiles,branch=null;
  if(applySource){branch=assertCandidateBranch(cwd);changedFiles=[...applyExactEdits(sourceRoot,candidate.edits),...applyNewFiles(sourceRoot,candidate.newFiles),...applyReplaceFiles(sourceRoot,candidate.replaceFiles,{allowCreate:bootstrap})];}
  else changedFiles=createCandidateSnapshot(sourceRoot,candidateRoot,candidate);
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
    focusedFirstEditEarlyStop:generation.focusedFirstEditEarlyStop===true,
    focusedFinalRetry:generation.focusedFinalRetry===true,
    focusedReplaceOnly:generation.focusedReplaceOnly===true,
    focusedFirstAttemptFastPath:generation.focusedFirstAttemptFastPath===true,
    focusedReplaceAnchorRotations:Number(generation.focusedReplaceAnchorRotations||0),
    focusedReplaceNoOpCreditUsed:generation.focusedReplaceNoOpCreditUsed===true,
    focusedMinimalJsonContract:generation.focusedFinalRetry===true&&!allowFullRewrite,
    candidateProducedFirstAttempt:Number(generation.attempts||0)===1&&generation.recoveryUsed!==true,
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
    roleResults:{exploration:'PASS',implementation:'PASS',test:'WAITING_INCREMENTAL_QA',performance:'WAITING_SANITY',regression:'WAITING_FAN_IN',review:'WAITING_FAN_IN'},
    designIntelligence:designManifestContract(order),
    designEvidence:waitingDesignEvidence(),
    presentationQuality:order?.presentationQuality&&typeof order.presentationQuality==='object'?order.presentationQuality:{required:false,pass:null,authorityExpanded:false},
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
