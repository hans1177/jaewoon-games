// 파일명: tools/vibe2-source-worker.mjs
// 역할: Vibe2 작업주문의 텍스트 소스 변경 후보를 생성하고, 코드 인텔리전스로 사전 검증/수리한 뒤 격리 후보에 반영한다.
// 원칙: 책임 파일과 승인 범위를 넘지 않으며, 보호된 게임 규칙/수치/세이브 의미를 자동 변경하지 않는다.

import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { applyExactEdits, boundedLargeExcerpt } from './autonomous-safe-edit.mjs';
import { exploreVibe2WorkOrder, explorationGuidance } from './vibe2-exploration-worker.mjs';
import {
  buildSmartCodeContext,
  validateCandidatePreview,
  classifyVibe2Failure,
  repairGuidance
} from './vibe2-code-intelligence.mjs';

const clean=value=>String(value??'').trim();
const posix=value=>clean(value).replaceAll('\\','/').replace(/^\.\//,'').replace(/\/+$/,'');
const unique=values=>[...new Set((values||[]).map(clean).filter(Boolean))];
const safeId=value=>clean(value).replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80)||'task';
const MAX_CONTEXT_FILES=12;
const MAX_CONTEXT_BYTES=360000;
const MAX_CHANGED_FILES=4;
const MAX_NEW_FILES=2;
const MAX_FILE_BYTES=260000;
const MAX_REPAIR_ATTEMPTS=3;
const DEFAULT_MODEL=process.env.VIBE2_LOCAL_MODEL||'qwen3:1.7b';
const DEFAULT_TIMEOUT_MS=Math.max(10000,Math.min(300000,Number(process.env.VIBE2_MODEL_TIMEOUT_MS||240000)));
const DEFAULT_MAX_PREDICT=Math.max(256,Math.min(2048,Number(process.env.VIBE2_MODEL_MAX_PREDICT||1536)));
const FULL_REWRITE_TIMEOUT_MS=540000;
const FULL_REWRITE_MAX_PREDICT=8192;
const FULL_REWRITE_RETRY_TIMEOUT_MS=360000;
const FULL_REWRITE_RETRY_MAX_PREDICT=6144;
const FULL_REWRITE_CONTEXT_WINDOW=32768;
const FULL_FILE_PREFIX='VIBE2_FULL_FILE';
const FULL_FILE_CONTENT_MARKER='---VIBE2_FILE_CONTENT---';
const FULL_FILE_END_MARKER='---VIBE2_FILE_END---';

const TARGET_EXTENSIONS=Object.freeze({
  roblox:new Set(['.luau','.lua','.json']),
  web:new Set(['.html','.htm','.css','.js','.mjs','.cjs','.json','.svg']),
  unity:new Set(['.cs','.asmdef','.json','.uxml','.uss','.unity','.prefab','.asset']),
  unreal:new Set(['.h','.hpp','.cpp','.cc','.cxx','.cs','.ini','.uproject','.uplugin','.json']),
  godot:new Set(['.gd','.tscn','.tres','.godot','.cfg','.json'])
});
const BINARY_EXTENSIONS=new Set(['.rbxl','.rbxlx','.uasset','.umap','.controller','.anim','.avatar','.fbx','.blend','.png','.jpg','.jpeg','.webp','.wav','.mp3','.ogg']);
const PLACEHOLDER_PATHS=new Set(['relative/to/source/root','relative/path','path/to/file','relative/to/file']);

function readJson(file,fallback=null){if(!file||!fs.existsSync(file))return fallback;return JSON.parse(fs.readFileSync(file,'utf8'));}
function writeJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,`${JSON.stringify(value,null,2)}\n`,'utf8');}
function parseArgs(argv=process.argv.slice(2)){const args={};for(const raw of argv){if(!raw.startsWith('--'))continue;const body=raw.slice(2),at=body.indexOf('=');if(at<0)args[body]=true;else args[body.slice(0,at)]=body.slice(at+1);}return args;}
function targetExtensions(target){const x=TARGET_EXTENSIONS[clean(target).toLowerCase()];if(!x)throw new Error(`지원하지 않는 Vibe2 source target: ${target}`);return x;}
function sourcePrefix(target){if(target==='roblox')return'roblox-games/';if(target==='web')return'web-games/';if(target==='unity')return'unity-games/';if(target==='unreal')return'unreal-games/';if(target==='godot')return'godot-games/';return'';}
function assertSourceRoot(root,target){const normalized=posix(root),prefix=sourcePrefix(target);if(!prefix||!normalized.startsWith(prefix)||normalized.includes('..'))throw new Error(`허용되지 않은 source root: ${root}`);if(target==='web'&&normalized.split('/').length!==2)throw new Error(`기존 웹게임 루트만 허용: ${root}`);return normalized;}
function assertRelativeSourcePath(relative,target){const normalized=posix(relative);if(!normalized||normalized.startsWith('/')||normalized.split('/').includes('..'))throw new Error(`잘못된 상대 경로: ${relative}`);const ext=path.extname(normalized).toLowerCase();if(BINARY_EXTENSIONS.has(ext))throw new Error(`엔진 에디터 필요 바이너리 파일: ${relative}`);if(!targetExtensions(target).has(ext))throw new Error(`텍스트 worker 허용 확장자 아님: ${relative}`);return normalized;}
function normalizeResponsibleFiles(order,root,target){return(order?.source?.responsibleFiles||[]).map(value=>{const normalized=posix(value);const relative=normalized.startsWith(`${root}/`)?normalized.slice(root.length+1):normalized;return assertRelativeSourcePath(relative,target);}).filter(Boolean);}
function normalizeModelPath(value,{target,responsibleFiles=[],sourceRootRelative=''}={}){let normalized=posix(value);if(normalized.startsWith(`${sourceRootRelative}/`))normalized=normalized.slice(sourceRootRelative.length+1);if(PLACEHOLDER_PATHS.has(normalized.toLowerCase())){if(responsibleFiles.length!==1)throw new Error(`모델 예시 경로를 실제 파일로 결정할 수 없음: ${value}`);normalized=responsibleFiles[0];}normalized=assertRelativeSourcePath(normalized,target);if(responsibleFiles.length&&!responsibleFiles.includes(normalized))throw new Error(`책임 파일 범위 밖 수정 금지: ${normalized}`);return normalized;}
function listContextFiles(root,target,ignored=[]){const ignore=ignored.map(posix).filter(Boolean),rows=[];const walk=current=>{if(rows.length>=MAX_CONTEXT_FILES)return;for(const entry of fs.readdirSync(current,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){if(rows.length>=MAX_CONTEXT_FILES)return;if(['.git','node_modules','Library','Temp','Logs','Binaries','Intermediate','Saved','DerivedDataCache'].includes(entry.name))continue;const full=path.join(current,entry.name),relative=posix(path.relative(root,full));if(ignore.some(v=>relative===v||relative.startsWith(`${v}/`)))continue;if(entry.isDirectory())walk(full);else{const ext=path.extname(entry.name).toLowerCase();if(targetExtensions(target).has(ext)&&!BINARY_EXTENSIONS.has(ext))rows.push({full,relative});}}};walk(root);return rows;}
function readContext(root,target,responsibleFiles=[],ignored=[],smartFiles=[]){const preferred=unique([...responsibleFiles,...smartFiles]).slice(0,MAX_CONTEXT_FILES);const rows=preferred.length?preferred.map(relative=>({full:path.join(root,relative),relative})):listContextFiles(root,target,ignored);const files=[];let total=0;for(const row of rows.slice(0,MAX_CONTEXT_FILES)){const relative=assertRelativeSourcePath(row.relative,target);if(!fs.existsSync(row.full)||!fs.statSync(row.full).isFile())continue;const excerpt=boundedLargeExcerpt(fs.readFileSync(row.full,'utf8'));let content=excerpt.content,remaining=MAX_CONTEXT_BYTES-total;while(Buffer.byteLength(content,'utf8')>remaining&&content.length>100)content=content.slice(0,Math.floor(content.length*.8));if(!content||remaining<=0)break;files.push({path:relative,content,truncated:excerpt.truncated||content.length<excerpt.content.length,editable:responsibleFiles.length===0||responsibleFiles.includes(relative)});total+=Buffer.byteLength(content,'utf8');}return{files,bytes:total};}

function extractJson(raw){const text=clean(raw).replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/i,'').trim();try{return JSON.parse(text);}catch{}const starts=['{','['].map(c=>text.indexOf(c)).filter(i=>i>=0);if(!starts.length)throw new Error('모델 JSON 시작을 찾지 못함');const start=Math.min(...starts),opening=text[start],closing=opening==='{'?'}':']';let depth=0,quoted=false,escape=false;for(let i=start;i<text.length;i++){const ch=text[i];if(quoted){if(escape)escape=false;else if(ch==='\\')escape=true;else if(ch==='"')quoted=false;continue;}if(ch==='"'){quoted=true;continue;}if(ch===opening)depth++;else if(ch===closing&&--depth===0)return JSON.parse(text.slice(start,i+1));}throw new Error('모델 JSON 파싱 실패');}

function fullSourceRewriteAllowed(order,target,responsibleFiles=[],exploration={}){
  const goal=clean(order?.goal);
  const policyAllowed=order?.workerPolicy?.fullFileRewriteAllowed===true;
  const webStrategy=clean(exploration?.existingWebAssessment?.strategy).toUpperCase();
  if(target==='web'){if(webStrategy)return webStrategy==='FULL_REBUILD';return policyAllowed||/FULL_WEB_GAME_REBUILD|실제 웹게임|프로토타입.*웹게임/i.test(goal);}
  if(target!=='roblox')return false;
  const task=order?.selectedTask&&typeof order.selectedTask==='object'?order.selectedTask:{};
  const ownerAuthorized=task.ownerDirective===true||order?.ownerDirective===true;
  const rebuildMode=clean(task.rebuildMode||order?.rebuildMode).toUpperCase();
  const evidence=unique([...(Array.isArray(task.evidence)?task.evidence:[]),...(Array.isArray(order?.evidence)?order.evidence:[])]);
  const directiveEvidence=evidence.includes('owner-directive:full-roblox-game-rebuild');
  const goalAuthorized=/FULL_ROBLOX_GAME_REBUILD|FULL_REBUILD/i.test(goal);
  if(!ownerAuthorized||!(rebuildMode==='FULL_REBUILD'||directiveEvidence||goalAuthorized||policyAllowed))return false;
  if(!responsibleFiles.length||responsibleFiles.length>MAX_CHANGED_FILES)return false;
  return responsibleFiles.every(file=>targetExtensions('roblox').has(path.extname(file).toLowerCase()));
}
function ownerBootstrapAllowed(order,target,responsibleFiles=[]){const goal=clean(order?.goal);return target==='web'&&order?.selectedTask?.ownerDirective===true&&fullSourceRewriteAllowed(order,target,responsibleFiles)&&/SOURCE_ROOT_BOOTSTRAP_ALLOWED/i.test(goal)&&responsibleFiles.length===1&&responsibleFiles[0]==='index.html';}
function parseFullFileEnvelope(raw){const text=String(raw??'').replaceAll('\r\n','\n'),trimmed=text.trimStart();if(!trimmed.startsWith(FULL_FILE_PREFIX))return null;const prefixOffset=text.indexOf(FULL_FILE_PREFIX),contentAt=text.indexOf(FULL_FILE_CONTENT_MARKER,prefixOffset+FULL_FILE_PREFIX.length);let endAt=text.indexOf(FULL_FILE_END_MARKER,contentAt+FULL_FILE_CONTENT_MARKER.length),recoveredHtmlEnd=false;if(contentAt>=0&&endAt<0){const htmlEnd=text.toLowerCase().lastIndexOf('</html>');if(htmlEnd>=contentAt&&!text.slice(htmlEnd+7).trim()){endAt=htmlEnd+7;recoveredHtmlEnd=true;}}if(contentAt<0||endAt<0)throw new Error('전체 파일 응답이 잘렸거나 종료 마커가 없음');const trailing=recoveredHtmlEnd?'':text.slice(endAt+FULL_FILE_END_MARKER.length).trim();if(trailing)throw new Error('전체 파일 종료 마커 뒤에 허용되지 않은 출력이 있음');const header=text.slice(prefixOffset,contentAt).trim().split('\n').map(line=>line.trim()).filter(Boolean);if(header.shift()!==FULL_FILE_PREFIX)throw new Error('전체 파일 응답 헤더 오류');const valueOf=key=>{const line=header.find(row=>row.startsWith(`${key}:`));return line?line.slice(key.length+1).trim():'';};const tests=header.filter(row=>row.startsWith('TEST:')).map(row=>row.slice(5).trim()).filter(Boolean);let content=text.slice(contentAt+FULL_FILE_CONTENT_MARKER.length,endAt);if(content.startsWith('\n'))content=content.slice(1);if(content.endsWith('\n'))content=content.slice(0,-1);if(!content.trim())throw new Error('전체 파일 응답 내용이 비어 있음');return{summary:valueOf('SUMMARY')||'Vibe2 full source candidate',expectedEffect:valueOf('EXPECTED_EFFECT'),edits:[],newFiles:[],replaceFiles:[{path:valueOf('PATH'),content}],tests};}

function normalizeEdit(item,{target,responsibleFiles,sourceRootRelative,symbol=''}){return{path:normalizeModelPath(item?.path,{target,responsibleFiles,sourceRootRelative}),find:String(item?.find??''),replace:String(item?.replace??''),symbol:clean(symbol||item?.symbol)||null};}
function minimumReplacementBytes(target,relative){if(target!=='roblox')return 1800;return path.extname(relative).toLowerCase()==='.json'?120:600;}
function normalizeCandidate(raw,{target,responsibleFiles,sourceRootRelative,allowFullRewrite=false}){
  const rawFullFile=allowFullRewrite&&(target==='web'||(target==='roblox'&&responsibleFiles.length===1));
  const envelope=typeof raw==='string'&&rawFullFile?parseFullFileEnvelope(raw):null;
  const parsed=envelope||(typeof raw==='string'?extractJson(raw):raw);
  if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error('모델 후보는 JSON 객체 또는 허용된 전체 파일 응답이어야 함');
  const promotedReplaceFiles=[];
  const edits=[
    ...(Array.isArray(parsed.edits)?parsed.edits:[]).map(item=>{
      const edit=normalizeEdit(item,{target,responsibleFiles,sourceRootRelative});
      const fullContent=String(item?.replace??item?.content??'');
      if(target==='roblox'&&allowFullRewrite&&!edit.find&&fullContent){
        promotedReplaceFiles.push({path:edit.path,content:fullContent});
        return null;
      }
      return edit;
    }).filter(Boolean),
    ...(Array.isArray(parsed.symbolEdits)?parsed.symbolEdits:[]).map(item=>normalizeEdit(item,{target,responsibleFiles,sourceRootRelative,symbol:item?.symbol}))
  ];
  for(const edit of edits){if(!edit.find)throw new Error(`edit find 비어 있음: ${edit.path}`);if(edit.find===edit.replace)throw new Error(`변경 없는 edit: ${edit.path}`);}
  const newFiles=(Array.isArray(parsed.newFiles)?parsed.newFiles:[]).map(item=>{if(responsibleFiles.length)throw new Error('책임 파일이 지정된 작업은 새 파일 자동 생성 금지');const relative=normalizeModelPath(item?.path,{target,responsibleFiles:[],sourceRootRelative}),content=String(item?.content??'');if(!content||Buffer.byteLength(content,'utf8')>MAX_FILE_BYTES)throw new Error(`새 파일 크기 오류: ${relative}`);return{path:relative,content};});
  if(newFiles.length>MAX_NEW_FILES)throw new Error(`새 파일은 최대 ${MAX_NEW_FILES}개`);
  const replaceFiles=[...(Array.isArray(parsed.replaceFiles)?parsed.replaceFiles:[]),...promotedReplaceFiles].map(item=>{if(!allowFullRewrite)throw new Error('전체 파일 교체는 명시적으로 승인된 FULL_REBUILD 작업에서만 허용');const relative=normalizeModelPath(item?.path,{target,responsibleFiles,sourceRootRelative}),content=String(item?.content??''),bytes=Buffer.byteLength(content,'utf8');if(!content||bytes<minimumReplacementBytes(target,relative)||bytes>MAX_FILE_BYTES)throw new Error(`전체 교체 파일 크기 오류: ${relative}`);return{path:relative,content};});
  const touched=[...edits.map(x=>x.path),...newFiles.map(x=>x.path),...replaceFiles.map(x=>x.path)];
  if(!touched.length||new Set(touched).size>MAX_CHANGED_FILES)throw new Error(`변경 파일 수는 1~${MAX_CHANGED_FILES}개여야 함`);
  if(new Set(touched).size!==touched.length)throw new Error('같은 파일에 edit/new/replace 중복 작업 금지');
  return{summary:clean(parsed.summary)||'Vibe2 source candidate',expectedEffect:clean(parsed.expectedEffect),edits,newFiles,replaceFiles,tests:(Array.isArray(parsed.tests)?parsed.tests:[]).map(clean).filter(Boolean).slice(0,8)};
}

function impactGuidance(smartContext={}){
  const impact=smartContext.changeImpact||{};
  return [
    '[CHANGE IMPACT - read only]',
    `risk=${impact.risk||'low'}`,
    `categories=${(impact.categories||[]).join(', ')||'none'}`,
    `impactedFiles=${(impact.impactedFiles||[]).join(', ')||'none'}`,
    '영향 분석은 수정 권한을 확대하지 않는다. Allowed edit paths 밖 파일은 참고만 한다.'
  ].join('\n');
}
function buildPrompt(order,context,responsibleFiles,{allowFullRewrite=false,exploration=null,smartContext=null,repairText=''}={}){
  const sourceText=context.files.map(file=>`\n=== FILE ${file.path}${file.editable?' [EDITABLE]':' [READ-ONLY IMPACT CONTEXT]'}${file.truncated?' [TRUNCATED]':''} ===\n${file.content}`).join('\n');
  const allowed=responsibleFiles.length?responsibleFiles.join(', '):context.files.filter(file=>file.editable!==false).map(file=>file.path).join(', ');
  const target=clean(order.target).toLowerCase();
  const fullWeb=allowFullRewrite&&target==='web';
  const fullRoblox=allowFullRewrite&&target==='roblox';
  const rawRoblox=fullRoblox&&responsibleFiles.length===1;
  const rawFullFile=fullWeb||rawRoblox;
  const rawPath=rawRoblox?responsibleFiles[0]:'index.html';
  return[
    rawFullFile?'You are the Vibe2 game source worker. Return exactly one raw VIBE2_FULL_FILE envelope. Do not return JSON. Do not use markdown fences.':'You are the Vibe2 game source worker. Return JSON only.',
    `Engine: ${order.target}`,
    `Goal: ${order.goal}`,
    `Department: ${order.department||'development'}`,
    explorationGuidance(exploration),
    smartContext?`[SMART CONTEXT ${smartContext.strategy}]\nfiles=${(smartContext.files||[]).join(', ')}\nreferences=${(smartContext.references||[]).join(', ')||'none'}\nseedSymbols=${(smartContext.seedSymbols||[]).join(', ')||'none'}`:'',
    smartContext?impactGuidance(smartContext):'',
    repairText,
    `Allowed edit paths: ${allowed}`,
    fullWeb?'OWNER AUTHORIZATION: this existing Web prototype must be rebuilt into a real playable game. Replace the responsible existing file completely. Do not return a validation dashboard, fake state buttons, or a thin prototype. Build actual mobile gameplay with direct player input, real game-state progression, failure/success or escalating progression, restart, responsive layout, and no external network dependency.':fullRoblox?'OWNER AUTHORIZATION: this existing Roblox prototype is in FULL_REBUILD. Replace the responsible Lua/Luau/JSON source files needed by the goal instead of preserving the old button/status shell. Build real spatial Roblox gameplay: physical world interaction, server-authoritative progression, touch-compatible controls, visible checkpoint/hazard feedback, failure/recovery, and a real finish condition. Do not use leaderboard/status numbers as a proxy for play.':'Preserve gameplay values, save meaning and existing behavior unless the work order explicitly authorizes a protected change.',
    rawFullFile?'The PATH line MUST be one exact path from Allowed edit paths. Everything between the content and end markers is written verbatim as the replacement file. The end marker is mandatory; never omit it.':fullRoblox?'Each replaceFiles path MUST be one exact path from Allowed edit paths. You may replace multiple responsible files in one candidate; do not touch files outside the list.':'Every edit path MUST be one exact path from Allowed edit paths.',
    fullWeb?'Keep the complete replacement concise and finish it comfortably before the output limit. Prefer compact CSS and JavaScript, preserve the actual gameplay loop, and reserve the final output for </html> followed by VIBE2_FILE_END.':rawRoblox?'Return the complete substantive replacement source, not a stub. Lua/Luau replacement content must be at least 600 UTF-8 bytes and JSON replacement content at least 120 bytes. Implement the requested world/progression logic directly and finish comfortably before the output limit.':fullRoblox?'Keep replacements concise enough to fit the output budget. Prefer server/shared world and progression logic first; update client UI/input only when required by the goal. Keep all config fields internally consistent.':'For code inside an identifiable function/method, prefer symbolEdits with the exact symbol name. Keep each task focused on the smallest responsible symbol.',
    fullWeb?'Required output format:\nVIBE2_FULL_FILE\nPATH:index.html\nSUMMARY:short summary\nEXPECTED_EFFECT:short expected effect\nTEST:mobile gameplay\nTEST:restart\nTEST:runtime\n---VIBE2_FILE_CONTENT---\n<!doctype html>\n...complete playable HTML...\n</html>\n---VIBE2_FILE_END---':rawRoblox?`Required output format:\nVIBE2_FULL_FILE\nPATH:${rawPath}\nSUMMARY:short summary\nEXPECTED_EFFECT:short expected effect\nTEST:Luau syntax\nTEST:12 sequential checkpoints\nTEST:hazard death and checkpoint respawn\nTEST:server-authoritative finish and multiplayer isolation\n---VIBE2_FILE_CONTENT---\n...complete replacement Roblox source...\n---VIBE2_FILE_END---`:fullRoblox?'JSON schema: {"summary":"...","expectedEffect":"...","edits":[],"symbolEdits":[],"newFiles":[],"replaceFiles":[{"path":"exact allowed .luau/.lua/.json path","content":"complete replacement source"}],"tests":["checkpoint progression","hazard recovery","mobile/runtime"]}. Use replaceFiles for the files you rebuild.':'Every find string MUST be copied character-for-character from an EDITABLE FILE block and occur exactly once.',
    'Do not output binary assets. Do not use wrapper/monkey patches. Do not change homepage/company files.',
    'For web target, stay inside the existing web-games/<game> root.',
    'For roblox target, stay inside the existing roblox-games/<game> root and do not edit .rbxl/.rbxlx binaries.',
    'Read-only impact context may explain dependencies but MUST NOT be edited unless it is also listed in Allowed edit paths.',
    fullWeb?'The replacement must be self-contained enough to run from the existing game root and must finish before the VIBE2_FILE_END marker.':rawRoblox?'The replacement must be a complete Roblox source file that directly implements the requested physical gameplay and must finish before the VIBE2_FILE_END marker. Do not return planning prose, a validation-only shell, or button-driven progression.':fullRoblox?'The candidate must implement the requested physical gameplay directly in Roblox source; do not return planning prose or a validation-only shell.':'JSON schema: {"summary":"...","expectedEffect":"...","symbolEdits":[{"path":"exact allowed path","symbol":"exact function or method name","find":"exact unique old text","replace":"new text"}],"edits":[],"newFiles":[],"replaceFiles":[],"tests":["..."]}. Legacy edits remain accepted for top-level or non-symbol changes.',
    `Required QA: ${(order.qa||[]).join(', ')}`,
    sourceText
  ].filter(Boolean).join('\n');
}

const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function requestLocalModel(prompt,{model=DEFAULT_MODEL,responseFile='',maxPredict=DEFAULT_MAX_PREDICT,timeoutMs=DEFAULT_TIMEOUT_MS,contextWindow=0}={}){
  const fake=clean(responseFile||process.env.VIBE2_MODEL_RESPONSE_FILE);
  if(fake)return fs.readFileSync(path.resolve(fake),'utf8');
  const options={num_predict:maxPredict,temperature:.08};
  if(contextWindow>0)options.num_ctx=contextWindow;
  const body=JSON.stringify({model,prompt,stream:true,think:false,keep_alive:'15m',options});
  const requestOnce=()=>new Promise((resolve,reject)=>{
    let settled=false,request=null;
    const finish=(error,value='')=>{if(settled)return;settled=true;clearTimeout(timer);if(request&&!request.destroyed)request.destroy();if(error)reject(error);else resolve(value);};
    const timer=setTimeout(()=>finish(new Error(`Ollama 응답 시간 초과: ${timeoutMs}ms`)),timeoutMs);
    request=http.request({hostname:'127.0.0.1',port:11434,path:'/api/generate',method:'POST',headers:{'content-type':'application/json','content-length':Buffer.byteLength(body)}},response=>{
      const status=response.statusCode||0;
      response.setEncoding('utf8');
      if(status<200||status>=300){
        let detail='';
        response.on('data',chunk=>{if(detail.length<4000)detail+=chunk;});
        response.on('end',()=>finish(new Error(`Ollama HTTP ${status}${clean(detail)?`: ${clean(detail).slice(0,1200)}`:''}`)));
        response.on('error',finish);
        return;
      }
      let pending='',output='';
      const consume=line=>{const text=line.trim();if(!text)return;let payload;try{payload=JSON.parse(text);}catch(error){throw new Error(`Ollama 스트림 JSON 파싱 실패: ${error.message}`);}if(payload?.error)throw new Error(`Ollama 오류: ${payload.error}`);if(typeof payload?.response==='string')output+=payload.response;};
      response.on('data',chunk=>{if(settled)return;try{pending+=chunk;let at;while((at=pending.indexOf('\n'))>=0){const line=pending.slice(0,at);pending=pending.slice(at+1);consume(line);}}catch(error){finish(error);}});
      response.on('end',()=>{if(settled)return;try{if(pending.trim())consume(pending);if(!output.trim())throw new Error('Ollama 응답 비어 있음');finish(null,output);}catch(error){finish(error);}});
      response.on('error',finish);
    });
    request.on('error',finish);
    request.end(body);
  });
  let lastError=null;
  for(let attempt=1;attempt<=3;attempt+=1){
    try{return await requestOnce();}
    catch(error){
      lastError=error;
      const message=clean(error?.message);
      const transient=/Ollama HTTP 5\d\d|ECONNRESET|ECONNREFUSED|socket hang up|EPIPE/i.test(message);
      if(!transient||attempt===3)throw error;
      console.warn(`VIBE2_LOCAL_MODEL_TRANSIENT_RETRY=${attempt}/3 ${message.slice(0,500)}`);
      await wait(attempt*1500);
    }
  }
  throw lastError||new Error('Ollama 요청 실패');
}

function currentBranch(cwd){try{return clean(execFileSync('git',['rev-parse','--abbrev-ref','HEAD'],{cwd,encoding:'utf8'}));}catch{return'';}}
function assertCandidateBranch(cwd){const branch=currentBranch(cwd);if(!branch||branch==='main'||branch==='master'||!branch.startsWith('vibe2/candidate/'))throw new Error(`source 적용은 vibe2/candidate/* 브랜치에서만 허용: ${branch||'unknown'}`);return branch;}
function applyNewFiles(root,newFiles){const changed=[];for(const file of newFiles){const target=path.join(root,file.path);if(fs.existsSync(target))throw new Error(`newFiles 대상이 이미 존재함: ${file.path}`);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,file.content,'utf8');changed.push(file.path);}return changed;}
function applyReplaceFiles(root,replaceFiles){const changed=[];for(const file of replaceFiles){const target=path.join(root,file.path);if(!fs.existsSync(target)||!fs.statSync(target).isFile())throw new Error(`replaceFiles 대상 없음: ${file.path}`);fs.writeFileSync(target,file.content.endsWith('\n')?file.content:`${file.content}\n`,'utf8');changed.push(file.path);}return changed;}
function createCandidateSnapshot(sourceRoot,candidateRoot,candidate){const changed=[];for(const edit of candidate.edits){const source=path.join(sourceRoot,edit.path),target=path.join(candidateRoot,'files',edit.path),before=fs.readFileSync(source,'utf8'),first=before.indexOf(edit.find);if(first<0||before.indexOf(edit.find,first+edit.find.length)>=0)throw new Error(`edit find 고유 일치 실패: ${edit.path}`);const after=before.slice(0,first)+edit.replace+before.slice(first+edit.find.length);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,after,'utf8');changed.push(edit.path);}for(const file of candidate.newFiles){const target=path.join(candidateRoot,'files',file.path);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,file.content,'utf8');changed.push(file.path);}for(const file of candidate.replaceFiles){const target=path.join(candidateRoot,'files',file.path);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,file.content.endsWith('\n')?file.content:`${file.content}\n`,'utf8');changed.push(file.path);}return[...new Set(changed)];}
function designManifestContract(order={}){const design=order?.designIntelligence||{};return{required:design.required===true,version:Number(design.version||0)||null,pipeline:Array.isArray(design.pipeline)?design.pipeline.map(clean).filter(Boolean):[],implementationGate:{allowed:design?.implementationGate?.allowed===true,blockers:Array.isArray(design?.implementationGate?.blockers)?design.implementationGate.blockers.map(clean).filter(Boolean):[]},evidenceRequirements:{autoPlayer:'verified-runtime-play-evidence-required',telemetry:'verified-observed-metrics-required',designReview:'verified-pass-required-before-experience-memory',qa:'verified-qa-evidence-required'},authorityExpanded:false};}
function waitingDesignEvidence(){return{autoPlayer:{status:'WAITING_EVIDENCE',verified:false},telemetry:{status:'WAITING_EVIDENCE',verified:false},designReview:{status:'WAITING_EVIDENCE',verified:false,decision:null},qa:{status:'WAITING_EVIDENCE',verified:false}};}
function responseForAttempt(responseFile,repairResponseFiles,attempt){if(attempt===1)return responseFile;return clean(repairResponseFiles?.[attempt-2])||responseFile;}

export async function runVibe2SourceWorker({
  cwd=process.cwd(),
  workOrderFile='.vibe2/work-order.json',
  outputRoot='.vibe2/candidates',
  model=DEFAULT_MODEL,
  responseFile='',
  repairResponseFiles=[],
  applySource=false
}={}){
  const order=readJson(path.resolve(cwd,workOrderFile));
  if(!order?.run||order?.workMode!=='source-change-candidate')throw new Error('실행 가능한 source-change work order 필요');
  if(order?.workerPolicy?.directMainWrite!==false)throw new Error('directMainWrite 정책 위반');
  const target=clean(order.target).toLowerCase();
  const sourceRootRelative=assertSourceRoot(order?.source?.root,target);
  const sourceRoot=path.resolve(cwd,sourceRootRelative);
  const responsibleFiles=normalizeResponsibleFiles(order,sourceRootRelative,target);
  let sourceRootBootstrapped=false;
  if(!fs.existsSync(sourceRoot)||!fs.statSync(sourceRoot).isDirectory()){
    if(!applySource||!ownerBootstrapAllowed(order,target,responsibleFiles))throw new Error(`source root 없음: ${sourceRootRelative}`);
    assertCandidateBranch(cwd);
    fs.mkdirSync(sourceRoot,{recursive:true});
    fs.writeFileSync(path.join(sourceRoot,'index.html'),'<!doctype html>\n<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Vibe2 bootstrap</title></head><body><main id="game"></main></body></html>\n','utf8');
    sourceRootBootstrapped=true;
  }
  const exploration=exploreVibe2WorkOrder({cwd,order});
  const smartContext=buildSmartCodeContext({
    root:sourceRoot,
    target,
    responsibleFiles,
    existingContextFiles:exploration.contextFiles||[],
    goal:order.goal,
    ignored:order?.source?.ignoredPaths||[]
  });
  const context=readContext(sourceRoot,target,responsibleFiles,order?.source?.ignoredPaths||[],smartContext.files||[]);
  if(!context.files.length)throw new Error('worker context 파일 없음');
  const allowFullRewrite=fullSourceRewriteAllowed(order,target,responsibleFiles,exploration);

  let candidate=null,preview=null,attemptsUsed=0,lastFailure=null;
  const repairHistory=[];
  for(let attempt=1;attempt<=MAX_REPAIR_ATTEMPTS;attempt+=1){
    attemptsUsed=attempt;
    const repairText=lastFailure?repairGuidance(lastFailure,attempt,MAX_REPAIR_ATTEMPTS):'';
    const retrying=attempt>1;
    try{
      const raw=await requestLocalModel(
        buildPrompt(order,context,responsibleFiles,{allowFullRewrite,exploration,smartContext,repairText}),
        {
          model,
          responseFile:responseForAttempt(responseFile,repairResponseFiles,attempt),
          maxPredict:allowFullRewrite?(retrying?FULL_REWRITE_RETRY_MAX_PREDICT:FULL_REWRITE_MAX_PREDICT):DEFAULT_MAX_PREDICT,
          timeoutMs:allowFullRewrite?(retrying?FULL_REWRITE_RETRY_TIMEOUT_MS:FULL_REWRITE_TIMEOUT_MS):DEFAULT_TIMEOUT_MS,
          contextWindow:allowFullRewrite?FULL_REWRITE_CONTEXT_WINDOW:0
        }
      );
      candidate=normalizeCandidate(raw,{target,responsibleFiles,sourceRootRelative,allowFullRewrite});
      preview=validateCandidatePreview({sourceRoot,candidate});
      lastFailure=null;
      break;
    }catch(error){
      lastFailure=classifyVibe2Failure({error,goal:order.goal,target});
      repairHistory.push({attempt,route:lastFailure.route,error:lastFailure.message});
      const retryable=/시간 초과|timeout|JSON|파싱|시작을 찾지 못함|잘렸거나 종료 마커|응답 비어 있음|전체 파일 응답|전체 교체 파일 크기 오류|preview|검증/i.test(clean(error?.message||error));
      if(attempt===MAX_REPAIR_ATTEMPTS||!retryable)throw error;
      console.warn(`VIBE2_GENERATION_RECOVERY_RETRY=${attempt}/${MAX_REPAIR_ATTEMPTS} ${clean(error?.message||error).slice(0,500)}`);
    }
  }
  if(!candidate||!preview?.valid)throw new Error('Vibe2 source candidate preview verification failed');

  const taskId=safeId(order.taskId),candidateRoot=path.resolve(cwd,outputRoot,taskId);
  fs.rmSync(candidateRoot,{recursive:true,force:true});
  fs.mkdirSync(candidateRoot,{recursive:true});
  let changedFiles,branch=null;
  if(applySource){branch=assertCandidateBranch(cwd);changedFiles=[...applyExactEdits(sourceRoot,candidate.edits),...applyNewFiles(sourceRoot,candidate.newFiles),...applyReplaceFiles(sourceRoot,candidate.replaceFiles)];}
  else changedFiles=createCandidateSnapshot(sourceRoot,candidateRoot,candidate);

  const manifest={
    version:5,
    taskId:order.taskId,
    gameId:order.gameId||null,
    target,
    sourceRoot:sourceRootRelative,
    releaseState:clean(order.releaseState)||'other',
    priority:clean(order.priority)||'normal',
    baseMainSha:clean(process.env.VIBE2_BASE_MAIN_SHA)||null,
    goal:order.goal,
    generatedAt:new Date().toISOString(),
    mode:applySource?'isolated-candidate-branch-source-write':'candidate-snapshot-only',
    branch,
    model,
    changedFiles,
    summary:candidate.summary,
    expectedEffect:candidate.expectedEffect,
    tests:candidate.tests,
    exploration,
    codeIntelligence:{
      version:1,
      smartContext:{
        strategy:smartContext.strategy,
        files:smartContext.files,
        reasons:smartContext.reasons,
        references:smartContext.references,
        seedSymbols:smartContext.seedSymbols,
        readOnlyOutsideResponsible:smartContext.readOnlyOutsideResponsible
      },
      changeImpact:smartContext.changeImpact,
      symbolPatching:{enabled:true,verifiedEdits:preview.symbols},
      repairLoop:{enabled:true,maxAttempts:MAX_REPAIR_ATTEMPTS,attemptsUsed,repaired:attemptsUsed>1,history:repairHistory},
      failureRouter:{enabled:true,routes:unique(repairHistory.map(row=>row.route))}
    },
    roleResults:{exploration:'PASS',implementation:'PASS',test:'WAITING_INCREMENTAL_QA',performance:'WAITING_SANITY',regression:'WAITING_FAN_IN',review:'WAITING_FAN_IN'},
    designIntelligence:designManifestContract(order),
    designEvidence:waitingDesignEvidence(),
    fullFileRewriteAllowed:allowFullRewrite,
    sourceRootBootstrapped,
    sourceRootBootstrapOwnerAuthorized:sourceRootBootstrapped,
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
  const result=await runVibe2SourceWorker({
    workOrderFile:clean(args.order)||'.vibe2/work-order.json',
    outputRoot:clean(args.output)||'.vibe2/candidates',
    model:clean(args.model)||DEFAULT_MODEL,
    responseFile:clean(args.response),
    repairResponseFiles:clean(args['repair-responses']).split(',').map(clean).filter(Boolean),
    applySource:String(args['apply-source']||'').toLowerCase()==='true'
  });
  console.log('VIBE2_SOURCE_WORKER=PASS');
  console.log(`VIBE2_TASK_ID=${result.taskId}`);
  console.log(`VIBE2_TARGET=${result.target}`);
  console.log(`VIBE2_CHANGED_FILES=${result.changedFiles.join(',')}`);
  console.log(`VIBE2_EXPLORATION_REUSE_KEY=${result.exploration?.reuseKey||'NONE'}`);
  console.log(`VIBE2_REPAIR_ATTEMPTS=${result.codeIntelligence?.repairLoop?.attemptsUsed||1}`);
}
