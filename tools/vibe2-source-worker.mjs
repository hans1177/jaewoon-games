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
const FULL_WEB_TIMEOUT_MS=540000;
const FULL_WEB_MAX_PREDICT=8192;
const FULL_WEB_RETRY_TIMEOUT_MS=360000;
const FULL_WEB_RETRY_MAX_PREDICT=6144;
const FULL_WEB_FINAL_RETRY_TIMEOUT_MS=360000;
const FULL_WEB_FINAL_RETRY_MAX_PREDICT=6144;
const FULL_WEB_EXPANSION_TIMEOUT_MS=300000;
const FULL_WEB_EXPANSION_MAX_PREDICT=4096;
const FULL_WEB_EXPANSION_CONTEXT_WINDOW=24576;
const FULL_WEB_MAX_GENERATION_ATTEMPTS=4;
const JSON_RETRY_TIMEOUT_MS=240000;
const JSON_RETRY_MAX_PREDICT=1536;
const FOCUSED_WEB_REPAIR_MAX_PREDICT=1024;
const FOCUSED_WEB_REPAIR_CONTEXT_FILES=3;
const FOCUSED_WEB_REPAIR_CONTEXT_BYTES=48000;
const FOCUSED_WEB_REPAIR_CONTEXT_WINDOW=16384;
const JSON_FINAL_RETRY_TIMEOUT_MS=150000;
const JSON_FINAL_RETRY_MAX_PREDICT=768;
const JSON_CONTEXT_WINDOW=32768;
const JSON_FINAL_CONTEXT_WINDOW=16384;
const FULL_WEB_CONTEXT_WINDOW=32768;
const MAX_GENERATION_ATTEMPTS=3;
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
function recoverFullWebSeed(raw,{target,responsibleFiles=[],sourceRootRelative=''}={}){
  try{
    const envelope=parseFullFileEnvelope(raw),direct=!envelope?parseDirectFullHtml(raw,{responsibleFiles}):null,parsed=envelope||direct;
    if(!parsed||!Array.isArray(parsed.replaceFiles)||parsed.replaceFiles.length!==1)return null;
    const file=parsed.replaceFiles[0],relative=normalizeModelPath(file?.path||responsibleFiles[0],{target,responsibleFiles,sourceRootRelative}),content=String(file?.content??'').trim();
    if(!content||!/<\/html>\s*$/i.test(content))return null;
    return{path:relative,content,summary:clean(parsed.summary)||'Vibe2 full Web seed',expectedEffect:clean(parsed.expectedEffect),tests:(parsed.tests||[]).map(clean).filter(Boolean).slice(0,8)};
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
function buildFullWebExpansionPrompt(basePrompt,seed,{stage=1,minBytes=FULL_WEB_GENERATION_TARGET_MIN_BYTES,maxBytes=FULL_WEB_GENERATION_TARGET_MAX_BYTES,remainingStages=1}={}){
  const content=String(seed?.content??''),currentBytes=Buffer.byteLength(content,'utf8'),gap=Math.max(0,minBytes-currentBytes),stageTarget=Math.min(7000,Math.max(3200,Math.ceil(gap/Math.max(1,remainingStages))+800));
  const prefix=String(basePrompt??'').split('\n=== FILE ')[0].trimEnd();
  return[
    prefix,
    '',
    'FULL WEB ADDITIVE EXPANSION MODE.',
    `Expansion stage: ${stage}. Current playable HTML: ${currentBytes} bytes. Final acceptance minimum: ${minBytes} bytes; preferred maximum: ${maxBytes} bytes.`,
    `Generate roughly ${stageTarget} bytes of NEW coherent gameplay source. This fragment will be inserted immediately before </body>.`,
    'Return only one VIBE2_WEB_EXPANSION envelope. Do not return a complete HTML document or JSON.',
    'The fragment must add real gameplay systems, mechanics, state transitions, mobile pointer/touch interaction, progression, outcomes, save-compatible state, or game-specific spatial behavior required by the work order.',
    'Do not add filler text, validator-only labels, fake counters, test harness controls, monkey patches, function overrides, or duplicated whole-document markup.',
    'Do not emit <html>, </html>, <body>, or </body>. Prefer unique data attributes/classes. Any script must be directly integrated source and should use a scoped IIFE or unique names instead of overwriting existing functions.',
    'Required output format:',
    'VIBE2_WEB_EXPANSION',
    '---VIBE2_EXPANSION_CONTENT---',
    '<section class="game-specific-system">...</section>',
    '<script>(()=>{ /* real additive gameplay implementation */ })();</script>',
    '---VIBE2_EXPANSION_END---',
    '',
    'CURRENT PLAYABLE HTML TO EXTEND:',
    content
  ].join('\n');
}
function normalizeCandidate(raw,{target,responsibleFiles,sourceRootRelative,allowFullRewrite=false,minFullRewriteBytes=MIN_FULL_REWRITE_BYTES}){const envelope=typeof raw==='string'&&allowFullRewrite?parseFullFileEnvelope(raw):null;const directHtml=typeof raw==='string'&&allowFullRewrite&&!envelope?parseDirectFullHtml(raw,{responsibleFiles}):null;const parsed=envelope||directHtml||(typeof raw==='string'?extractJson(raw):raw);if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error('모델 후보는 JSON 객체 또는 허용된 전체 파일 응답이어야 함');const edits=(Array.isArray(parsed.edits)?parsed.edits:[]).map(item=>({path:normalizeModelPath(item?.path,{target,responsibleFiles,sourceRootRelative}),find:String(item?.find??''),replace:String(item?.replace??'')}));for(const edit of edits){if(!edit.find)throw new Error(`edit find 비어 있음: ${edit.path}`);if(edit.find===edit.replace)throw new Error(`변경 없는 edit: ${edit.path}`);}const newFiles=(Array.isArray(parsed.newFiles)?parsed.newFiles:[]).map(item=>{if(responsibleFiles.length)throw new Error('책임 파일이 지정된 작업은 새 파일 자동 생성 금지');const relative=normalizeModelPath(item?.path,{target,responsibleFiles:[],sourceRootRelative}),content=String(item?.content??'');if(!content||Buffer.byteLength(content,'utf8')>MAX_FILE_BYTES)throw new Error(`새 파일 크기 오류: ${relative}`);return{path:relative,content};});if(newFiles.length>MAX_NEW_FILES)throw new Error(`새 파일은 최대 ${MAX_NEW_FILES}개`);const requiredFullRewriteBytes=Math.max(MIN_FULL_REWRITE_BYTES,Math.min(MAX_FILE_BYTES,Number(minFullRewriteBytes)||MIN_FULL_REWRITE_BYTES));const replaceFiles=(Array.isArray(parsed.replaceFiles)?parsed.replaceFiles:[]).map(item=>{if(!allowFullRewrite)throw new Error('전체 파일 교체는 명시된 Web 재구축 작업에서만 허용');const relative=normalizeModelPath(item?.path,{target,responsibleFiles,sourceRootRelative}),content=String(item?.content??''),bytes=Buffer.byteLength(content,'utf8');if(!content||bytes<requiredFullRewriteBytes||bytes>MAX_FILE_BYTES)throw new Error(`전체 교체 파일 크기 오류: ${relative}:bytes=${bytes}:min=${requiredFullRewriteBytes}:max=${MAX_FILE_BYTES}`);return{path:relative,content};});const touched=[...edits.map(x=>x.path),...newFiles.map(x=>x.path),...replaceFiles.map(x=>x.path)];const touchedCount=new Set(touched).size;if(!touched.length)throw new Error('후보가 실제 source 변경을 생성하지 않음');if(touchedCount>MAX_CHANGED_FILES)throw new Error(`변경 파일 수가 최대 ${MAX_CHANGED_FILES}개를 초과함`);if(touchedCount!==touched.length)throw new Error('같은 파일에 edit/new/replace 중복 작업 금지');return{summary:clean(parsed.summary)||'Vibe2 source candidate',expectedEffect:clean(parsed.expectedEffect),edits,newFiles,replaceFiles,tests:(Array.isArray(parsed.tests)?parsed.tests:[]).map(clean).filter(Boolean).slice(0,8)};}
function fullWebGenerationTarget(order={}){const requirements=[...clean(order?.goal).matchAll(/REAL_GAME_FOOTPRINT_TOO_SMALL:\\d+:(\\d+)/gi)].map(match=>Number(match[1])).filter(Number.isFinite);const minBytes=Math.min(MAX_FILE_BYTES,Math.max(FULL_WEB_GENERATION_TARGET_MIN_BYTES,...requirements));const maxBytes=Math.min(MAX_FILE_BYTES,Math.max(FULL_WEB_GENERATION_TARGET_MAX_BYTES,minBytes*2));return{minBytes,maxBytes};}
function buildPrompt(order,context,responsibleFiles,{allowFullRewrite=false,exploration=null,sourceRootBootstrap=false}={}){const sourceText=context.files.map(file=>`\n=== FILE ${file.path}${file.editable?' [EDITABLE]':' [READ-ONLY IMPACT CONTEXT]'}${file.truncated?' [TRUNCATED]':''} ===\n${file.content}`).join('\n');const allowed=responsibleFiles.length?responsibleFiles.join(', '):context.files.filter(file=>file.editable!==false).map(file=>file.path).join(', ');const fullWebTarget=fullWebGenerationTarget(order);return[
allowFullRewrite?'You are the Vibe2 game source worker. Return exactly one raw VIBE2_FULL_FILE envelope. Do not return JSON. Do not use markdown fences.':'You are the Vibe2 game source worker. Return JSON only.',
`Engine: ${order.target}`,
`Goal: ${order.goal}`,
`Department: ${order.department||'development'}`,
explorationGuidance(exploration),
`Allowed edit paths: ${allowed}`,
allowFullRewrite?(sourceRootBootstrap?'OWNER AUTHORIZATION: create the first complete playable Web baseline at the exact responsible index.html path. This is an approved missing-source bootstrap. Build actual mobile gameplay with direct player input, real game-state progression, failure/success or escalating progression, restart, responsive layout, save compatibility scaffolding where required, and no external network dependency.':'OWNER AUTHORIZATION: this existing Web prototype must be rebuilt into a real playable game. Replace the responsible existing file completely. Do not return a validation dashboard, fake state buttons, or a thin prototype. Build actual mobile gameplay with direct player input, real game-state progression, failure/success or escalating progression, restart, responsive layout, and no external network dependency.'):'Preserve gameplay values, save meaning and existing behavior unless the work order explicitly authorizes a protected change.',
allowFullRewrite?'The PATH line MUST be one exact path from Allowed edit paths. Everything between the content and end markers is written verbatim as the replacement file. The end marker is mandatory; never omit it.':'Every edits[].path and replaceFiles[].path MUST be one exact path from Allowed edit paths.',
allowFullRewrite?`Full Web generation target: ${fullWebTarget.minBytes}-${fullWebTarget.maxBytes} UTF-8 bytes. The parser hard safety gate remains ${MIN_FULL_REWRITE_BYTES}-${MAX_FILE_BYTES} bytes, but do not target that floor. Before finishing, implement all of these as real runtime behavior: direct pointer/touch input, mutable persistent-capable game state, a repeating update/render or equivalent state-transition loop, at least one progression or resource system, an explicit win/loss/result condition, restart/reset, and responsive mobile layout. Use substantial executable JavaScript and do not pad with filler text. Do not return a tiny shell, placeholder dashboard, validation buttons, or static mock UI. Reserve the final output for </html> followed by VIBE2_FILE_END.`:'Do not expand unrelated code.',
allowFullRewrite?'Required output format:\nVIBE2_FULL_FILE\nPATH:index.html\nSUMMARY:short summary\nEXPECTED_EFFECT:short expected effect\nTEST:mobile gameplay\nTEST:restart\nTEST:runtime\n---VIBE2_FILE_CONTENT---\n<!doctype html>\n...complete playable HTML...\n</html>\n---VIBE2_FILE_END---':'Every edits[].find MUST be copied character-for-character from the matching FILE block and occur exactly once.',
'Do not output binary assets. Do not use wrapper/monkey patches. Do not change homepage/company files.',
'For web target, stay inside the existing web-games/<game> root.',
'Read-only impact context may explain dependencies but MUST NOT be edited unless it is also listed in Allowed edit paths.',
allowFullRewrite?'':'This is an implementation candidate. You MUST produce at least one real source change. Never return empty edits/newFiles/replaceFiles. When responsible files are listed, use an edits[] entry on an exact allowed path; copy find text exactly from the FILE block and make replace materially different.',
allowFullRewrite?'The replacement must be self-contained enough to run from the existing game root and must finish before the VIBE2_FILE_END marker.':'JSON schema: {"summary":"...","expectedEffect":"...","edits":[{"path":"exact allowed path","find":"exact unique old text","replace":"new text"}],"newFiles":[],"replaceFiles":[],"tests":["..."]}',
`Required QA: ${(order.qa||[]).join(', ')}`,
sourceText
].filter(Boolean).join('\n');}
export function generationFailureClass(error){
  const message=clean(error?.message||error);
  if(/실제 source 변경|변경 없는 edit/i.test(message))return'NO_OP';
  if(/시간 초과|timeout|prediction aborted|token repeat limit/i.test(message))return'TIMEOUT';
  if(/책임 파일 범위 밖 수정 금지|허용 확장자 아님|허용 경로|exact allowed path/i.test(message))return'INVALID_PATH';
  if(/전체 교체 파일 크기 오류/i.test(message))return'FULL_REWRITE_SIZE';
  if(/JSON|파싱|시작을 찾지 못함|잘렸거나 종료 마커|응답 비어 있음|전체 파일 응답/i.test(message))return'MALFORMED_OUTPUT';
  if(/edit find/i.test(message))return'EDIT_MATCH';
  return'OTHER';
}
function focusedFinalRetryAllowed(error){return['NO_OP','TIMEOUT','INVALID_PATH','EDIT_MATCH'].includes(generationFailureClass(error));}
function fullWebFinalRetryAllowed(error){return generationFailureClass(error)==='FULL_REWRITE_SIZE';}
export function shouldRetryGenerationError(error){
  const message=clean(error?.message||error);
  return /시간 초과|timeout|JSON|파싱|시작을 찾지 못함|잘렸거나 종료 마커|응답 비어 있음|전체 파일 응답|전체 교체 파일 크기 오류|실제 source 변경|변경 없는 edit|변경 파일 수|edit find|책임 파일 범위 밖 수정 금지|허용 확장자 아님|허용 경로|exact allowed path|prediction aborted|token repeat limit/i.test(message);
}
export function buildGenerationRetryPrompt(prompt,{allowFullRewrite=false,error=null,responsibleFiles=[],attempt=2,previousOutput=''}={}){
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
  const safeReason=invalidPath?'candidate attempted a path outside Allowed edit paths':reason;
  const fullWebTargetLine=rawPrompt.split('\n').find(line=>line.trimStart().startsWith('Full Web generation target:'))||`Full Web generation target: ${FULL_WEB_GENERATION_TARGET_MIN_BYTES}-${FULL_WEB_GENERATION_TARGET_MAX_BYTES} UTF-8 bytes.`;
  const fullWebTargetMatch=fullWebTargetLine.match(/(\d+)-(\d+)\s+UTF-8 bytes/i);
  const fullWebTargetMin=Math.max(MIN_FULL_REWRITE_BYTES,Number(fullWebTargetMatch?.[1]||FULL_WEB_GENERATION_TARGET_MIN_BYTES));
  const fullWebTargetMax=Math.min(MAX_FILE_BYTES,Number(fullWebTargetMatch?.[2]||FULL_WEB_GENERATION_TARGET_MAX_BYTES));
  const previousFullWeb=allowFullRewrite&&String(previousOutput||'').trim()?String(previousOutput):'';
  const previousFullWebBytes=previousFullWeb?Buffer.byteLength(previousFullWeb,'utf8'):0;
  const previousFullWebExcerpt=previousFullWeb?boundedLargeExcerpt(previousFullWeb,4000).content:'';
  let retryBase=rawPrompt;
  if(!allowFullRewrite&&(zeroChange||noChangeEdit||invalidPath||(attempt>=3&&timeoutFailure))){
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
          if(attempt>=3){
            const body=section.split('\n').slice(1).join('\n');
            const excerpt=boundedLargeExcerpt(body,5000);
            section=header+'\n'+excerpt.content;
          }
          editable.push(section);
        }
      }
      if(editable.length)retryBase=[prefix,...editable].join('\n\n');
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
        zeroChange?'RECOVERY RETRY: the previous candidate contained zero actual source changes.':noChangeEdit?'RECOVERY RETRY: the previous edit copied the same text without changing source.':timeoutFailure?'RECOVERY RETRY: the previous model response exceeded the time budget.':invalidPath?'RECOVERY RETRY: the previous candidate used an invalid edit path.':'RECOVERY RETRY: the previous candidate was not strict valid JSON.',
        `Previous failure: ${safeReason}`,
        'Return one strict JSON object only. Use double quotes for every key and string. Escape newlines and quotes inside replacement text. No markdown, comments, trailing commas, or JavaScript object syntax.',
        exactPath?`The ONLY writable path is "${exactPath}". Every edits[].path MUST equal exactly "${exactPath}".`:'',
        zeroChange?'You MUST produce at least one edits[] entry. Use the exact Allowed edit path above. Copy find character-for-character from the EDITABLE FILE block, make replace materially different, and do not return empty edits/newFiles/replaceFiles.':noChangeEdit?'Return at least one edits[] entry whose replace is materially different from find. Use the exact Allowed edit path above, copy find exactly from the EDITABLE FILE block, then make the smallest real implementation change required by the work order.':invalidPath?'Use only the exact writable path copied exactly from Allowed edit paths. Never output placeholders, labels, globs, guessed filenames, or any READ-ONLY path.':'Prefer the smallest responsible edit that satisfies the work order.',
        zeroChange||noChangeEdit||invalidPath?'Recovery context intentionally contains only writable FILE blocks; do not bypass responsible-file boundaries, widen scope, invent a new file, or expose READ-ONLY paths.':''
      ].filter(Boolean).join('\n');
  const focusedFinal=attempt>=3&&!allowFullRewrite;
  const fullWebFinal=attempt>=3&&allowFullRewrite;
  const finalInstruction=focusedFinal
    ?'FINAL FOCUSED RETRY: return exactly one edits[] entry on the exact writable path. Use the shortest unique find text visible in the compact EDITABLE excerpt, and make replace materially different. Do not return empty arrays or repeat the original text.'
    :fullWebFinal
      ?`FINAL FULL-WEB RETRY: produce one complete playable index.html replacement of at least ${fullWebTargetMin} UTF-8 bytes and no more than ${fullWebTargetMax} bytes. Include direct mobile input, substantial executable game logic, a real update/render or equivalent state-transition loop, progression, explicit win/loss/result state, restart, responsive layout, and persistent-capable state. Do not stop early. Finish with </html> and the required end marker.`
      :'';
  return retryBase+'\n\n'+correction+(finalInstruction?'\n'+finalInstruction:'');
}
function responseFileForAttempt(responseFile,responseFiles=[],attempt=1){
  const rows=Array.isArray(responseFiles)?responseFiles.map(clean).filter(Boolean):[];
  return rows[attempt-1]||clean(responseFile);
}
async function generateCandidateWithRecovery({prompt,model,responseFile='',responseFiles=[],allowFullRewrite,target,responsibleFiles,sourceRootRelative,sourceRoot='',focusedWebRepair=false,minFullRewriteBytes=MIN_FULL_REWRITE_BYTES}={}){
  let lastError=null;
  let lastRaw='';
  let accumulatedFullWeb=null;
  let expansionStages=0;
  const maxAttempts=allowFullRewrite?FULL_WEB_MAX_GENERATION_ATTEMPTS:MAX_GENERATION_ATTEMPTS;
  for(let attempt=1;attempt<=maxAttempts;attempt++){
    const retry=attempt>1;
    const focusedFinal=!allowFullRewrite&&attempt>=3;
    const expansionMode=allowFullRewrite&&Boolean(accumulatedFullWeb)&&attempt>1;
    const remainingStages=Math.max(1,maxAttempts-attempt+1);
    const attemptPrompt=expansionMode
      ?buildFullWebExpansionPrompt(prompt,accumulatedFullWeb,{stage:expansionStages+1,minBytes:minFullRewriteBytes,maxBytes:Math.max(FULL_WEB_GENERATION_TARGET_MAX_BYTES,minFullRewriteBytes*2),remainingStages})
      :(retry?buildGenerationRetryPrompt(prompt,{allowFullRewrite,error:lastError,responsibleFiles,attempt,previousOutput:lastRaw}):prompt);
    const maxPredict=expansionMode
      ?FULL_WEB_EXPANSION_MAX_PREDICT
      :(allowFullRewrite
        ?(attempt>=maxAttempts?FULL_WEB_FINAL_RETRY_MAX_PREDICT:(retry?FULL_WEB_RETRY_MAX_PREDICT:FULL_WEB_MAX_PREDICT))
        :(focusedFinal?JSON_FINAL_RETRY_MAX_PREDICT:(focusedWebRepair?FOCUSED_WEB_REPAIR_MAX_PREDICT:(retry?JSON_RETRY_MAX_PREDICT:DEFAULT_MAX_PREDICT))));
    const timeoutMs=expansionMode
      ?FULL_WEB_EXPANSION_TIMEOUT_MS
      :(allowFullRewrite
        ?(attempt>=maxAttempts?FULL_WEB_FINAL_RETRY_TIMEOUT_MS:(retry?FULL_WEB_RETRY_TIMEOUT_MS:FULL_WEB_TIMEOUT_MS))
        :(focusedFinal?JSON_FINAL_RETRY_TIMEOUT_MS:(retry?JSON_RETRY_TIMEOUT_MS:DEFAULT_TIMEOUT_MS)));
    const contextWindow=expansionMode
      ?FULL_WEB_EXPANSION_CONTEXT_WINDOW
      :(allowFullRewrite?FULL_WEB_CONTEXT_WINDOW:(focusedFinal?JSON_FINAL_CONTEXT_WINDOW:(focusedWebRepair?FOCUSED_WEB_REPAIR_CONTEXT_WINDOW:JSON_CONTEXT_WINDOW)));
    const fake=responseFileForAttempt(responseFile,responseFiles,attempt);
    const temperature=expansionMode?Math.min(0.26,0.18+expansionStages*0.04):(retry?(attempt>=3?0.22:0.16):0.08);
    try{
      const raw=await requestLocalModel(attemptPrompt,{model,responseFile:fake,maxPredict,timeoutMs,contextWindow,temperature});
      lastRaw=raw;
      let candidate;
      if(expansionMode){
        const fragment=parseFullWebExpansion(raw);
        if(fragment){
          const composed=insertFullWebExpansion(accumulatedFullWeb.content,fragment);
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
        candidate=normalizeCandidate(raw,{target,responsibleFiles,sourceRootRelative,allowFullRewrite,minFullRewriteBytes});
      }
      if(candidate.edits.length&&sourceRoot&&fs.existsSync(sourceRoot))applyExactEdits(sourceRoot,candidate.edits,{dryRun:true});
      return {candidate,generation:{attempts:attempt,recoveryUsed:retry,focusedFinalRetry:focusedFinal,focusedWebRepair,fullWebExpansionStages:expansionStages,mode:allowFullRewrite?'FULL_WEB':'JSON_EDIT',maxPredict,timeoutMs,contextWindow,temperature}};
    }catch(error){
      lastError=error;
      const failureClass=generationFailureClass(error);
      if(allowFullRewrite&&failureClass==='FULL_REWRITE_SIZE'){
        const recovered=recoverFullWebSeed(lastRaw,{target,responsibleFiles,sourceRootRelative});
        if(recovered){
          const recoveredBytes=Buffer.byteLength(recovered.content,'utf8'),currentBytes=accumulatedFullWeb?Buffer.byteLength(accumulatedFullWeb.content,'utf8'):0;
          if(recoveredBytes>currentBytes)accumulatedFullWeb=recovered;
        }
      }
      const attemptOutputBytes=lastRaw?Buffer.byteLength(String(lastRaw),'utf8'):0;
      console.log(`VIBE2_GENERATION_ATTEMPT_FAILURE=${attempt}:${failureClass}:${clean(error?.message||error).replace(/\s+/g,' ').slice(0,360)}`);
      console.log(`VIBE2_GENERATION_ATTEMPT_OUTPUT_BYTES=${attempt}:${attemptOutputBytes}`);
      if(accumulatedFullWeb)console.log(`VIBE2_FULL_WEB_ACCUMULATED_BYTES=${attempt}:${Buffer.byteLength(accumulatedFullWeb.content,'utf8')}`);
      const ordinaryRetry=attempt===1&&shouldRetryGenerationError(error);
      const focusedRetry=attempt===2&&!allowFullRewrite&&focusedFinalRetryAllowed(error);
      const fullWebAccumulationRetry=allowFullRewrite&&Boolean(accumulatedFullWeb)&&attempt<maxAttempts&&['FULL_REWRITE_SIZE','MALFORMED_OUTPUT','TIMEOUT'].includes(failureClass);
      const fullWebFallbackRetry=allowFullRewrite&&!accumulatedFullWeb&&attempt===2&&fullWebFinalRetryAllowed(error)&&attempt<maxAttempts;
      const hasAnother=ordinaryRetry||focusedRetry||fullWebAccumulationRetry||fullWebFallbackRetry;
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
async function requestLocalModel(prompt,{model=DEFAULT_MODEL,responseFile='',maxPredict=DEFAULT_MAX_PREDICT,timeoutMs=DEFAULT_TIMEOUT_MS,contextWindow=0,temperature=.08}={}){const fake=clean(responseFile||process.env.VIBE2_MODEL_RESPONSE_FILE);if(fake)return fs.readFileSync(path.resolve(fake),'utf8');const options={num_predict:maxPredict,temperature:Math.max(.02,Math.min(.4,Number(temperature)||.08))};if(contextWindow>0)options.num_ctx=contextWindow;const body=JSON.stringify({model,prompt,stream:true,think:false,options});return await new Promise((resolve,reject)=>{let settled=false,request=null;const finish=(error,value='')=>{if(settled)return;settled=true;clearTimeout(timer);if(request&&!request.destroyed)request.destroy();if(error)reject(error);else resolve(value);};const timer=setTimeout(()=>finish(new Error(`Ollama 응답 시간 초과: ${timeoutMs}ms`)),timeoutMs);request=http.request({hostname:'127.0.0.1',port:11434,path:'/api/generate',method:'POST',headers:{'content-type':'application/json','content-length':Buffer.byteLength(body)}},response=>{if((response.statusCode||0)<200||(response.statusCode||0)>=300){response.resume();finish(new Error(`Ollama HTTP ${response.statusCode}`));return;}response.setEncoding('utf8');let pending='',output='';const consume=line=>{const text=line.trim();if(!text)return;let payload;try{payload=JSON.parse(text);}catch(error){throw new Error(`Ollama 스트림 JSON 파싱 실패: ${error.message}`);}if(payload?.error)throw new Error(`Ollama 오류: ${payload.error}`);if(typeof payload?.response==='string')output+=payload.response;};response.on('data',chunk=>{if(settled)return;try{pending+=chunk;let at;while((at=pending.indexOf('\n'))>=0){const line=pending.slice(0,at);pending=pending.slice(at+1);consume(line);}}catch(error){finish(error);}});response.on('end',()=>{if(settled)return;try{if(pending.trim())consume(pending);if(!output.trim())throw new Error('Ollama 응답 비어 있음');finish(null,output);}catch(error){finish(error);}});response.on('error',finish);});request.on('error',finish);request.end(body);});}
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
  const bootstrapHtml='<!doctype html><html><head><meta charset="utf-8"><title>Approved Web Bootstrap</title></head><body><main id="game"></main><script></script></body></html>';
  const context=!sourceRootExists&&bootstrap
    ?{files:[{path:'index.html',content:bootstrapHtml,truncated:false,editable:true}],bytes:Buffer.byteLength(bootstrapHtml,'utf8')}
    :readContext(
        sourceRoot,
        target,
        responsibleFiles,
        order?.source?.ignoredPaths||[],
        focusedWebRepair?(exploration.contextFiles||[]).slice(0,FOCUSED_WEB_REPAIR_CONTEXT_FILES):(exploration.contextFiles||[]),
        focusedWebRepair?{maxFiles:FOCUSED_WEB_REPAIR_CONTEXT_FILES,maxBytes:FOCUSED_WEB_REPAIR_CONTEXT_BYTES}:{}
      );
  if(!context.files.length)throw new Error('worker context 파일 없음');
  const fullWebTarget=allowFullRewrite?fullWebGenerationTarget(order):null;
  const prompt=buildPrompt(order,context,responsibleFiles,{allowFullRewrite,exploration,sourceRootBootstrap:bootstrap});
  const generated=await generateCandidateWithRecovery({prompt,model,responseFile,responseFiles,allowFullRewrite,target,responsibleFiles,sourceRootRelative,sourceRoot,focusedWebRepair,minFullRewriteBytes:fullWebTarget?.minBytes||MIN_FULL_REWRITE_BYTES});
  const candidate=generated.candidate;
  const generation={...generated.generation,contextFiles:context.files.length,contextBytes:context.bytes};
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
  const manifest={
    version:5,
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
    roleResults:{exploration:'PASS',implementation:'PASS',test:'WAITING_INCREMENTAL_QA',performance:'WAITING_SANITY',regression:'WAITING_FAN_IN',review:'WAITING_FAN_IN'},
    designIntelligence:designManifestContract(order),
    designEvidence:waitingDesignEvidence(),
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
