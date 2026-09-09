// 파일명: tools/autonomous-development-worker.mjs
// 역할: 무료 로컬 AI 또는 검증된 규칙 패치가 안정판을 읽고 별도 후보 디렉터리에만 작은 개발 후보를 생성한다.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { applyExactEdits, boundedLargeExcerpt, normalizeExactEdits, MAX_EDIT_OPS } from './autonomous-safe-edit.mjs';
import { buildRuleCandidate } from './autonomous-rule-patcher.mjs';

const DEFAULT_MODEL=process.env.AUTONOMOUS_LOCAL_MODEL||'qwen3:1.7b';
const MAX_CONTEXT_FILES=8;
const MAX_CONTEXT_BYTES=48_000;
const MAX_FULL_CONTEXT_FILE_BYTES=24_000;
const FEEDBACK_DIR='.autonomous/browser-failures';
const MAX_OUTPUT_FILES=4;
const MAX_CHANGED_FILES=4;
const MAX_FILE_BYTES=240000;
const MAX_TOTAL_OUTPUT_BYTES=600000;
const MODEL_TIMEOUT_MS=Number(process.env.AUTONOMOUS_MODEL_TIMEOUT_MS||360000);
const MODEL_MAX_PREDICT=Math.max(2048,Math.min(8192,Number(process.env.AUTONOMOUS_MODEL_MAX_PREDICT||6144)));
const MODEL_CONTEXT_TOKENS=Math.max(8192,Math.min(32768,Number(process.env.AUTONOMOUS_MODEL_CONTEXT_TOKENS||16384)));
const MAX_MODEL_ATTEMPTS=Math.max(1,Math.min(2,Number(process.env.AUTONOMOUS_MODEL_MAX_ATTEMPTS||2)));
const ALLOWED_EXTENSIONS=new Set(['.html','.js','.mjs','.cjs','.css','.json','.md','.txt','.svg']);
const FORBIDDEN_OUTPUT_NAMES=new Set(['.git','.github','package-lock.json']);
const SAVE_PATTERNS=[/localStorage\.(?:getItem|setItem|removeItem)\(\s*['"]([^'"]+)['"]/g,/sessionStorage\.(?:getItem|setItem|removeItem)\(\s*['"]([^'"]+)['"]/g];
const WRAPPER_KEYS=['candidate','result','output','proposal'];
const ROLE_GUIDANCE={
  development:'게임 로직·상태·이벤트 흐름의 실제 원인을 고친다. UI/밸런스 값을 불필요하게 바꾸지 않는다.',
  graphics:'화면·UI·스타일·렌더링·에셋 연결만 고친다. 전투 수치와 저장 의미는 바꾸지 않는다.',
  qa:'재현 실패를 막는 검증 가능 코드 또는 테스트 범위만 고친다. 신규 기능을 추가하지 않는다.',
  balance:'기존 기획 근거가 있는 밸런스/경제/웨이브 책임 코드만 고친다. 근거 없는 수치 변경은 금지한다.',
};
const CANDIDATE_SCHEMA={
  type:'object',required:['summary','expectedEffect','tests'],additionalProperties:false,
  properties:{
    summary:{type:'string'},expectedEffect:{type:'string'},tests:{type:'array',items:{type:'string'},maxItems:6},
    files:{type:'array',maxItems:MAX_OUTPUT_FILES,items:{type:'object',required:['path','content'],additionalProperties:false,properties:{path:{type:'string'},content:{type:'string'}}}},
    edits:{type:'array',maxItems:MAX_EDIT_OPS,items:{type:'object',required:['path','find','replace'],additionalProperties:false,properties:{path:{type:'string'},find:{type:'string'},replace:{type:'string'}}}}
  }
};

const clean=v=>String(v??'').trim();
const posix=v=>String(v??'').replaceAll('\\','/').replace(/^\.\//,'').replace(/\/+$/,'');
const safeId=v=>clean(v).replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80);
const exists=file=>{try{return fs.statSync(file),true;}catch{return false;}};
const ensureDir=file=>fs.mkdirSync(path.dirname(file),{recursive:true});
const run=(command,args,cwd=process.cwd())=>spawnSync(command,args,{cwd,encoding:'utf8'});
const uniq=values=>[...new Set(values)];
const isObject=v=>Boolean(v&&typeof v==='object'&&!Array.isArray(v));
const hasOwn=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const readJson=(file,fallback={})=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};

export function browserFailureFeedback(gameId){
  const file=path.join(FEEDBACK_DIR,`${safeId(gameId)}.json`),report=readJson(file,null);
  if(!report||report.pass!==false)return '';
  const rows=[...(report.errors||[]),...(report.consoleErrors||[]).map(x=>`console:${x}`),...(report.pageErrors||[]).map(x=>`page:${x}`),...(report.failedRequests||[]).map(x=>`request:${x}`)].map(clean).filter(Boolean).slice(0,10);
  const metrics=report.metrics?`mobile=${report.metrics.viewportWidth||390}px body=${report.metrics.width||0}x${report.metrics.height||0} interactive=${report.metrics.visibleInteractive||0}`:'';
  return clean(`직전 후보 모바일 브라우저 QA 실패. 같은 실패를 반복하지 말고 원인을 직접 고쳐라. ${rows.join(' | ')} ${metrics} screenshot=${report.screenshot||'artifact-only'}`);
}

function assertSourcePath(sourcePath){
  const normalized=posix(sourcePath);
  if(!normalized.startsWith('web-games/')||normalized.includes('..')||normalized.includes('/.autonomous-candidates/'))throw new Error(`허용되지 않은 sourcePath: ${sourcePath}`);
  if(!exists(normalized)||!fs.statSync(normalized).isDirectory())throw new Error(`sourcePath 없음: ${normalized}`);
  return normalized;
}
export function assertRelativeOutputPath(relative){
  const normalized=posix(relative);
  if(!normalized||normalized.startsWith('/')||normalized.split('/').includes('..'))throw new Error(`후보 파일 경로 오류: ${relative}`);
  if(normalized.split('/').some(part=>FORBIDDEN_OUTPUT_NAMES.has(part)))throw new Error(`후보 파일 금지 경로: ${relative}`);
  const ext=path.extname(normalized).toLowerCase();
  if(!ALLOWED_EXTENSIONS.has(ext))throw new Error(`후보 파일 확장자 금지: ${relative}`);
  return normalized;
}
function listTextFiles(root){
  const rows=[];
  const walk=current=>{
    const entries=fs.readdirSync(current,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name));
    for(const entry of entries){
      if(rows.length>=80)return;
      if(entry.name.startsWith('.git')||entry.name==='node_modules')continue;
      const full=path.join(current,entry.name);
      if(entry.isDirectory())walk(full);
      else if(ALLOWED_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))rows.push({full,relative:posix(path.relative(root,full)),size:fs.statSync(full).size});
    }
  };
  walk(root);return rows;
}
function truncateUtf8(text,maxBytes){
  const buf=Buffer.from(String(text??''),'utf8');if(buf.length<=maxBytes)return buf.toString('utf8');
  let end=Math.max(0,maxBytes);while(end>0&&(buf[end]&0b11000000)===0b10000000)end--;return buf.subarray(0,end).toString('utf8');
}
function focusedExcerpt(text,{needle='',line=null,maxBytes=MAX_FULL_CONTEXT_FILE_BYTES}={}){
  const source=String(text??'');
  let index=-1;
  if(clean(needle))index=source.indexOf(String(needle));
  if(index<0&&Number.isFinite(Number(line))&&Number(line)>0){
    const lines=source.split(/\r?\n/),upto=Math.max(0,Math.min(lines.length-1,Number(line)-1));
    index=lines.slice(0,upto).join('\n').length;
  }
  if(index<0)return null;
  const half=Math.floor(maxBytes/2),start=Math.max(0,index-half),end=Math.min(source.length,index+half);
  return truncateUtf8(source.slice(start,end),maxBytes);
}
function roleFromCandidateId(candidateId){
  const id=String(candidateId||'').toLowerCase();
  for(const role of Object.keys(ROLE_GUIDANCE))if(id.endsWith(`-${role}`))return role;
  return 'development';
}
export function readContext(sourcePath,{preferredFiles=[],diagnostic=null}={}){
  let used=0;const files=[];const preferred=new Set(preferredFiles.map(posix)),diagnosticFile=posix(diagnostic?.file||diagnostic?.path||'');
  const rows=listTextFiles(sourcePath).sort((a,b)=>Number(preferred.has(b.relative))-Number(preferred.has(a.relative))||Number(b.relative===diagnosticFile)-Number(a.relative===diagnosticFile)||a.relative.localeCompare(b.relative));
  for(const row of rows){
    if(files.length>=MAX_CONTEXT_FILES||used>=MAX_CONTEXT_BYTES)break;
    const full=fs.readFileSync(row.full,'utf8'),focused=row.relative===diagnosticFile?focusedExcerpt(full,{needle:diagnostic?.needle,line:diagnostic?.line}):null;
    const base=focused??(row.size<=MAX_FULL_CONTEXT_FILE_BYTES?full:boundedLargeExcerpt(full).content);
    const perFileLimit=preferred.has(row.relative)||row.relative===diagnosticFile?MAX_FULL_CONTEXT_FILE_BYTES:12_000;
    const remaining=MAX_CONTEXT_BYTES-used,content=truncateUtf8(base,Math.min(remaining,perFileLimit)),consumed=Buffer.byteLength(content);if(consumed<1)continue;
    files.push({path:row.relative,content,truncated:consumed<Buffer.byteLength(full),originalBytes:row.size,preferred:preferred.has(row.relative),focused:Boolean(focused)});used+=consumed;
  }
  return {files,bytes:used};
}
function narrowedContext(context,preferredFiles=[]){
  const preferred=new Set(preferredFiles.map(posix));
  const rows=context.files.filter(x=>preferred.has(x.path)||x.focused);
  const chosen=(rows.length?rows:context.files).slice(0,Math.max(1,rows.length?3:2));
  return {files:chosen,bytes:chosen.reduce((n,x)=>n+Buffer.byteLength(x.content),0)};
}
export function selectRetryResponsibilityFile({context={files:[]},responsibilityFiles=[],diagnostic=null}={}){
  const normalized=uniq(responsibilityFiles.map(posix).filter(Boolean)),diagnosticFile=posix(diagnostic?.file||diagnostic?.path||'');
  if(diagnosticFile&&normalized.includes(diagnosticFile)&&context.files.some(file=>file.path===diagnosticFile))return diagnosticFile;
  const rows=context.files.filter(file=>normalized.includes(file.path)).sort((a,b)=>Number(Boolean(b.focused))-Number(Boolean(a.focused))||Number(b.originalBytes||Buffer.byteLength(b.content||''))-Number(a.originalBytes||Buffer.byteLength(a.content||''))||a.path.localeCompare(b.path));
  if(rows.length)return rows[0].path;
  if(diagnosticFile&&context.files.some(file=>file.path===diagnosticFile))return diagnosticFile;
  return context.files[0]?.path||normalized[0]||'';
}
export function buildRetryAttempt({context={files:[]},responsibilityFiles=[],diagnostic=null,failureType=''}={}){
  const original=responsibilityFiles.map(posix).filter(Boolean),strict=['NO_CHANGE','OUTPUT_FORMAT'].includes(clean(failureType).toUpperCase());
  if(!strict)return {context:narrowedContext(context,original),responsibilityFiles:original,strict:false,target:null};
  const target=selectRetryResponsibilityFile({context,responsibilityFiles:original,diagnostic}),chosen=target?context.files.filter(file=>file.path===target).slice(0,1):context.files.slice(0,1),active=chosen.length?chosen:context.files.slice(0,1),activeTarget=active[0]?.path||target||original[0]||'';
  return {context:{files:active,bytes:active.reduce((n,file)=>n+Buffer.byteLength(file.content||''),0)},responsibilityFiles:activeTarget?[activeTarget]:[],strict:true,target:activeTarget||null};
}
export function extractStorageKeys(text){
  const keys=new Set();for(const pattern of SAVE_PATTERNS){pattern.lastIndex=0;let match;while((match=pattern.exec(String(text||''))))keys.add(match[1]);}return [...keys].sort();
}
function stripFence(raw){const text=clean(raw);return text.startsWith('```')?text.replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'').trim():text;}
function extractBalancedJson(text){
  const value=stripFence(text);try{return {value:JSON.parse(value),repair:null};}catch{}
  let start=-1;for(let i=0;i<value.length;i++){if(value[i]==='{'||value[i]==='['){start=i;break;}}if(start<0)throw new Error('모델 응답 JSON을 찾을 수 없음');
  const stack=[];let inString=false,escape=false;
  for(let i=start;i<value.length;i++){
    const ch=value[i];if(inString){if(escape){escape=false;continue;}if(ch==='\\'){escape=true;continue;}if(ch==='"')inString=false;continue;}if(ch==='"'){inString=true;continue;}
    if(ch==='{'||ch==='[')stack.push(ch);else if(ch==='}'||ch===']'){const open=stack.pop();if((open==='{'&&ch!=='}')||(open==='['&&ch!==']'))break;if(stack.length===0){const slice=value.slice(start,i+1);try{return {value:JSON.parse(slice),repair:'EXTRACTED_BALANCED_JSON'};}catch{break;}}}
  }
  throw new Error('모델 응답 JSON 파싱 실패');
}
function pathValue(item){return clean(item?.path??item?.file??item?.filename);}
function fileItem(item){if(!isObject(item))return null;const p=pathValue(item);const content=hasOwn(item,'content')?item.content:hasOwn(item,'code')?item.code:undefined;if(!p||typeof content!=='string')return null;return {path:p,content};}
function editItem(item){if(!isObject(item))return null;const p=pathValue(item);const find=hasOwn(item,'find')?item.find:hasOwn(item,'search')?item.search:hasOwn(item,'before')?item.before:undefined;const replace=hasOwn(item,'replace')?item.replace:hasOwn(item,'replacement')?item.replacement:hasOwn(item,'after')?item.after:undefined;if(!p||typeof find!=='string'||typeof replace!=='string')return null;return {path:p,find,replace};}
function collection(value){return Array.isArray(value)?value:isObject(value)?[value]:[];}
function classifyCollection(items,label,repairs){
  if(!items.length)return null;const fileRows=items.map(fileItem),editRows=items.map(editItem),allFiles=fileRows.every(Boolean),allEdits=editRows.every(Boolean);if(allFiles===allEdits)throw new Error(`${label} 형식이 모호하거나 지원되지 않음`);repairs.push(`NORMALIZED_${label.toUpperCase()}_${allFiles?'FILES':'EDITS'}`);return allFiles?{files:fileRows}:{edits:editRows};
}
export function normalizeModelCandidateShape(input){
  const repairs=[];let outer=isObject(input)?input:{},parsed=input;
  if(Array.isArray(parsed)){const classified=classifyCollection(parsed,'root-array',repairs);return {normalized:{summary:'',expectedEffect:'',tests:[],...classified},repairs};}
  if(!isObject(parsed))throw new Error('모델 응답은 JSON 객체 또는 변경 배열이어야 함');
  const directKeys=['files','file','edits','edit','changes','patches'],hasDirect=directKeys.some(k=>hasOwn(parsed,k));
  if(!hasDirect){const wrappers=WRAPPER_KEYS.filter(k=>isObject(parsed[k])||Array.isArray(parsed[k]));if(wrappers.length===1){outer=parsed;parsed=parsed[wrappers[0]];repairs.push(`UNWRAPPED_${wrappers[0].toUpperCase()}`);if(Array.isArray(parsed)){const classified=classifyCollection(parsed,wrappers[0],repairs);return {normalized:{summary:clean(outer.summary),expectedEffect:clean(outer.expectedEffect),tests:Array.isArray(outer.tests)?outer.tests:[],...classified},repairs};}if(!isObject(parsed))throw new Error('중첩 후보 형식 오류');}else if(wrappers.length>1)throw new Error('후보 래퍼가 여러 개라 모호함');}
  const meta={summary:clean(parsed.summary??outer.summary),expectedEffect:clean(parsed.expectedEffect??outer.expectedEffect),tests:Array.isArray(parsed.tests)?parsed.tests:Array.isArray(outer.tests)?outer.tests:[]};
  const fileSources=[],editSources=[];if(hasOwn(parsed,'files'))fileSources.push(...collection(parsed.files).map(fileItem).filter(Boolean));if(hasOwn(parsed,'file'))fileSources.push(...collection(parsed.file).map(fileItem).filter(Boolean));if(hasOwn(parsed,'edits'))editSources.push(...collection(parsed.edits).map(editItem).filter(Boolean));if(hasOwn(parsed,'edit'))editSources.push(...collection(parsed.edit).map(editItem).filter(Boolean));if(hasOwn(parsed,'patches'))editSources.push(...collection(parsed.patches).map(editItem).filter(Boolean));
  if((hasOwn(parsed,'files')&&collection(parsed.files).length&&!fileSources.length)||(hasOwn(parsed,'file')&&collection(parsed.file).length&&!fileSources.length))throw new Error('files/file 항목 형식 오류');
  if((hasOwn(parsed,'edits')&&collection(parsed.edits).length&&!editSources.length)||(hasOwn(parsed,'edit')&&collection(parsed.edit).length&&!editSources.length)||(hasOwn(parsed,'patches')&&collection(parsed.patches).length&&!editSources.length))throw new Error('edits/edit/patches 항목 형식 오류');
  if(!fileSources.length&&!editSources.length&&hasOwn(parsed,'changes')){const classified=classifyCollection(collection(parsed.changes),'changes',repairs);return {normalized:{...meta,...classified},repairs};}
  if(!fileSources.length&&!editSources.length){const directFile=fileItem(parsed),directEdit=editItem(parsed);if(Boolean(directFile)===Boolean(directEdit))throw new Error('후보는 files 또는 edits 중 명확한 변경 하나가 필요함');repairs.push(directFile?'WRAPPED_DIRECT_FILE':'WRAPPED_DIRECT_EDIT');return {normalized:{...meta,...(directFile?{files:[directFile]}:{edits:[directEdit]})},repairs};}
  if(fileSources.length&&editSources.length)throw new Error('후보는 files 또는 edits 중 정확히 하나를 사용해야 함');if(hasOwn(parsed,'file')&&!hasOwn(parsed,'files'))repairs.push('SINGULAR_FILE_TO_FILES');if(hasOwn(parsed,'edit')&&!hasOwn(parsed,'edits'))repairs.push('SINGULAR_EDIT_TO_EDITS');if(hasOwn(parsed,'patches'))repairs.push('PATCHES_TO_EDITS');return {normalized:{...meta,...(fileSources.length?{files:fileSources}:{edits:editSources})},repairs};
}
export function parseModelCandidate(raw){
  const extracted=extractBalancedJson(raw),shaped=normalizeModelCandidateShape(extracted.value),parsed=shaped.normalized,repairs=[...(extracted.repair?[extracted.repair]:[]),...shaped.repairs];const rawFiles=Array.isArray(parsed.files)?parsed.files:[],rawEdits=Array.isArray(parsed.edits)?parsed.edits:[];if((rawFiles.length?1:0)+(rawEdits.length?1:0)!==1)throw new Error('후보는 files 또는 edits 중 정확히 하나를 사용해야 함');
  const files=[];let total=0;const seen=new Set();if(rawFiles.length){if(rawFiles.length>MAX_OUTPUT_FILES)throw new Error(`후보 files는 최대 ${MAX_OUTPUT_FILES}개여야 함`);for(const item of rawFiles){const relative=assertRelativeOutputPath(item?.path);if(seen.has(relative))throw new Error(`후보 파일 중복: ${relative}`);seen.add(relative);const content=String(item?.content??''),fileBytes=Buffer.byteLength(content);if(fileBytes===0||fileBytes>MAX_FILE_BYTES)throw new Error(`후보 파일 크기 오류: ${relative}`);total+=fileBytes;if(total>MAX_TOTAL_OUTPUT_BYTES)throw new Error('후보 총 출력 크기 초과');files.push({path:relative,content,bytes:fileBytes});}}
  const edits=rawEdits.length?normalizeExactEdits(rawEdits,assertRelativeOutputPath):[];return {summary:clean(parsed.summary)||'local-ai candidate',expectedEffect:clean(parsed.expectedEffect),tests:Array.isArray(parsed.tests)?parsed.tests.map(clean).filter(Boolean).slice(0,8):[],files,edits,mode:files.length?'FULL_FILES':'EXACT_EDITS',normalization:{applied:repairs.length>0,repairs}};
}
export function validateCandidateAgainstSource(sourcePath,candidate,{allowSaveKeyChange=false}={}){const violations=[];for(const file of candidate.files||[]){const sourceFile=path.join(sourcePath,file.path);if(exists(sourceFile)&&fs.statSync(sourceFile).isFile()&&!allowSaveKeyChange){const before=extractStorageKeys(fs.readFileSync(sourceFile,'utf8')),after=extractStorageKeys(file.content);if(JSON.stringify(before)!==JSON.stringify(after))violations.push({path:file.path,reason:'SAVE_KEY_CHANGE',before,after});}}return {pass:violations.length===0,violations};}
function validateChangedTree(sourcePath,candidatePath,changedPaths,{allowSaveKeyChange=false}={}){if(allowSaveKeyChange)return {pass:true,violations:[]};const violations=[];for(const relative of changedPaths){const sourceFile=path.join(sourcePath,relative),candidateFile=path.join(candidatePath,relative),before=exists(sourceFile)&&fs.statSync(sourceFile).isFile()?extractStorageKeys(fs.readFileSync(sourceFile,'utf8')):[],after=exists(candidateFile)&&fs.statSync(candidateFile).isFile()?extractStorageKeys(fs.readFileSync(candidateFile,'utf8')):[];if(JSON.stringify(before)!==JSON.stringify(after))violations.push({path:relative,reason:'SAVE_KEY_CHANGE',before,after});}return {pass:violations.length===0,violations};}
function copySource(sourcePath,candidatePath){if(exists(candidatePath))fs.rmSync(candidatePath,{recursive:true,force:true});fs.mkdirSync(candidatePath,{recursive:true});fs.cpSync(sourcePath,candidatePath,{recursive:true,filter:(src)=>!src.includes(`${path.sep}.git`)&&!src.includes(`${path.sep}node_modules`)});}

export function buildPrompt({gameId,sourcePath,goal,context,protectedValues=[],responsibilityFiles=[],attempt=1,failureReason='',diagnostic=null,role='development',browserFeedback=''}){
  const evidence=context.files.map(file=>`\n### FILE ${file.path}${file.preferred?' [RESPONSIBILITY]':''}${file.focused?' [FOCUSED]':''}${file.truncated?` [TRUNCATED originalBytes=${file.originalBytes}]`:''}\n${file.content}`).join('\n');
  const diagnosis=diagnostic?JSON.stringify({type:diagnostic.type,severity:diagnostic.severity,file:diagnostic.file,line:diagnostic.line??null,needle:diagnostic.needle??null,message:diagnostic.message,reference:diagnostic.reference??null,relatedFiles:diagnostic.relatedFiles??[]},null,2):'없음';
  const strictRetry=attempt>1&&/^(?:NO_CHANGE|OUTPUT_FORMAT):/.test(failureReason),retryTarget=responsibilityFiles[0]||context.files[0]?.path||'제공된 책임 파일';
  const retryContract=strictRetry?`\n재시도 강제계약:\n- 이번 시도는 책임 파일 ${retryTarget} 1개만 수정한다.\n- files 또는 edits 중 정확히 하나를 사용하고 해당 배열을 비우지 않는다.\n- summary/expectedEffect/tests만 쓰고 실제 변경을 생략하는 응답은 금지한다.\n- 제공된 코드에서 정확히 한 번 일치하는 가장 작은 exact edit 1개를 우선한다.`:'';
  return `/no_think\n너는 재운컴퍼니 Autonomous Development Worker다. 안정판 원본은 읽기 전용이며 별도 후보 복사본에 적용할 변경만 제안한다.\n게임: ${gameId}\n원본경로: ${sourcePath}\n부서 역할: ${role}\n부서 책임: ${ROLE_GUIDANCE[role]||ROLE_GUIDANCE.development}\n작은 목표: ${goal}${browserFeedback?`\n직전 브라우저 실패 근거: ${browserFeedback}`:''}\n책임 파일: ${responsibilityFiles.join(', ')||'근거에서 가장 직접적인 파일 1개'}\n정확한 진단 근거:\n${diagnosis}\n시도: ${attempt}/${MAX_MODEL_ATTEMPTS}${failureReason?`\n직전 실패: ${failureReason}`:''}${retryContract}\n보호값: ${protectedValues.join(', ')||'save key / 진행 의미 / 공개 안정판'}\n규칙:\n1. JSON Schema에 맞는 객체만 출력한다.\n2. 한 번에 문제 1개만 해결한다. 책임 파일이 지정되면 그 범위 밖은 수정하지 않는다.\n3. 작은 일반 파일은 files, 큰 파일/[TRUNCATED] 파일은 edits를 사용한다. files와 edits를 동시에 쓰지 않는다.\n4. edit find는 제공된 근거에서 그대로 복사하고 정확히 한 번만 일치하는 문맥을 포함한다.\n5. 원본 저장키·핵심 규칙·세이브 의미를 변경하지 않는다.\n6. .github, 권한, 배포, 결제, 비밀정보 파일을 만들지 않는다.\n7. 전면 재작성 금지. 목표 해결에 필요한 최소 변경만 한다.\n8. 수정 파일 0개 출력 금지. 완료/PASS/출시 승인이라고 주장하지 않는다.\n9. 직전 실패가 있으면 같은 답을 반복하지 말고 진단 line/needle 주변의 더 좁은 exact edit로 고친다.\n10. 근거가 부족하면 추측으로 기능을 만들지 말고 제공된 책임 코드 안의 재현 가능한 원인만 수정한다.\n\n읽기 전용 근거:${evidence}`;
}
function appendOllamaLine(line,state){const text=String(line||'').trim();if(!text)return;const event=JSON.parse(text);if(event.error)throw new Error(`Ollama 실패: ${event.error}`);if(typeof event.response==='string')state.response+=event.response;if(event.done===true)state.done=true;}
async function callOllama(prompt,model=DEFAULT_MODEL){
  const host=process.env.OLLAMA_HOST?`http://${process.env.OLLAMA_HOST}`:'http://127.0.0.1:11434';const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(new Error('LOCAL_MODEL_TIMEOUT')),MODEL_TIMEOUT_MS);
  try{const response=await fetch(`${host}/api/generate`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({model,prompt,stream:true,think:false,format:CANDIDATE_SCHEMA,options:{temperature:0.08,num_ctx:MODEL_CONTEXT_TOKENS,num_predict:MODEL_MAX_PREDICT}}),signal:controller.signal});if(!response.ok)throw new Error(`Ollama 실패: ${response.status}`);if(!response.body)throw new Error('Ollama stream 없음');const decoder=new TextDecoder(),state={response:'',done:false};let pending='';for await(const chunk of response.body){pending+=decoder.decode(chunk,{stream:true});const lines=pending.split(/\r?\n/);pending=lines.pop()??'';for(const line of lines)appendOllamaLine(line,state);}pending+=decoder.decode();if(pending.trim())appendOllamaLine(pending,state);if(!clean(state.response))throw new Error('Ollama 응답 비어 있음');return state.response;}catch(error){if(error?.name==='AbortError'||controller.signal.aborted)throw new Error(`Ollama 생성 제한시간 초과: ${MODEL_TIMEOUT_MS}ms`);throw error;}finally{clearTimeout(timeout);}
}
function syntaxCheck(candidatePath,changedPaths){const checks=[];for(const relative of changedPaths){if(!/\.(?:js|mjs|cjs)$/i.test(relative))continue;const target=path.join(candidatePath,relative),result=run('node',['--check',target]);checks.push({name:`syntax:${relative}`,status:result.status===0?'PASS':'FAIL',detail:(result.status===0?'node --check':result.stderr).trim().slice(0,600)});}return checks;}
export function classifyGenerationFailure(error){const msg=clean(error?.message||error);if(/명확한 변경|변경 파일 수|변경 없음|비어 있음/.test(msg))return 'NO_CHANGE';if(/JSON|형식|정확히 하나/.test(msg))return 'OUTPUT_FORMAT';if(/저장키|보호검증/.test(msg))return 'PROTECTED_VALUE';if(/find|대상 없음/.test(msg))return 'EDIT_APPLY';if(/문법검증/.test(msg))return 'SYNTAX';if(/시간 초과|Ollama/.test(msg))return 'MODEL_RUNTIME';return 'OTHER';}
function materializeCandidate({sourcePath,candidatePath,raw,allowSaveKeyChange=false}){
  const candidate=parseModelCandidate(raw),preValidation=validateCandidateAgainstSource(sourcePath,candidate,{allowSaveKeyChange});if(!preValidation.pass)throw new Error(`후보 보호검증 실패: ${preValidation.violations.map(v=>`${v.path}:${v.reason}`).join(',')}`);
  copySource(sourcePath,candidatePath);for(const file of candidate.files){const target=path.join(candidatePath,file.path);ensureDir(target);fs.writeFileSync(target,file.content,'utf8');}const editPaths=candidate.edits.length?applyExactEdits(candidatePath,candidate.edits):[],changedPaths=uniq([...candidate.files.map(x=>x.path),...editPaths]);if(changedPaths.length<1||changedPaths.length>MAX_CHANGED_FILES)throw new Error(`변경 파일 수는 1~${MAX_CHANGED_FILES}개여야 함`);
  const postValidation=validateChangedTree(sourcePath,candidatePath,changedPaths,{allowSaveKeyChange});if(!postValidation.pass)throw new Error(`후보 저장키 검증 실패: ${postValidation.violations.map(v=>`${v.path}:${v.reason}`).join(',')}`);const syntax=syntaxCheck(candidatePath,changedPaths);if(syntax.some(check=>check.status!=='PASS'))throw new Error(`후보 문법검증 실패: ${syntax.filter(x=>x.status!=='PASS').map(x=>x.name).join(',')}`);return {candidate,changedPaths,syntax};
}

export async function generateAutonomousCandidate(options={}){
  const gameId=safeId(options.gameId);if(!gameId)throw new Error('gameId 필요');const sourcePath=assertSourcePath(options.sourcePath),goal=clean(options.goal);if(!goal)throw new Error('goal 필요');
  const candidateId=safeId(options.candidateId)||`${gameId}-${Date.now()}`,candidatePath=posix(options.candidatePath||`web-games/.autonomous-candidates/${gameId}/${candidateId}`);if(!candidatePath.startsWith('web-games/.autonomous-candidates/'))throw new Error('candidatePath는 autonomous 후보 영역이어야 함');
  const responsibilityFiles=(options.responsibilityFiles||[]).map(posix).filter(Boolean),diagnostic=options.diagnostic||null,role=clean(options.role)||roleFromCandidateId(candidateId),browserFeedback=clean(options.browserFeedback),context=readContext(sourcePath,{preferredFiles:responsibilityFiles,diagnostic});if(!context.files.length)throw new Error('읽을 수 있는 소스 파일 없음');
  const repairMode=clean(options.repairMode||'MODEL').toUpperCase(),failures=[];let materialized=null,attempts=0,rulePatchId=null;
  if(repairMode==='RULE_PATCH'){
    const rule=buildRuleCandidate(sourcePath,diagnostic||{});rulePatchId=rule.ruleId;materialized=materializeCandidate({sourcePath,candidatePath,raw:JSON.stringify(rule),allowSaveKeyChange:options.allowSaveKeyChange===true});
  }else if(options.modelResponse!==undefined){
    attempts=1;materialized=materializeCandidate({sourcePath,candidatePath,raw:options.modelResponse,allowSaveKeyChange:options.allowSaveKeyChange===true});
  }else{
    let last=null;
    for(let attempt=1;attempt<=MAX_MODEL_ATTEMPTS;attempt++){
      attempts=attempt;
      const failureType=last?classifyGenerationFailure(last):'',retry=attempt===1?{context,responsibilityFiles,strict:false,target:null}:buildRetryAttempt({context,responsibilityFiles,diagnostic,failureType}),activeContext=retry.context,activeResponsibilityFiles=retry.responsibilityFiles;
      const failureReason=last?`${failureType}: ${clean(last.message).slice(0,240)}`:'';
      try{const raw=await callOllama(buildPrompt({gameId,sourcePath,goal,context:activeContext,protectedValues:options.protectedValues??[],responsibilityFiles:activeResponsibilityFiles,attempt,failureReason,diagnostic,role,browserFeedback}),options.model??DEFAULT_MODEL);materialized=materializeCandidate({sourcePath,candidatePath,raw,allowSaveKeyChange:options.allowSaveKeyChange===true});break;}catch(error){last=error;failures.push({attempt,type:classifyGenerationFailure(error),message:clean(error.message).slice(0,500)});if(attempt>=MAX_MODEL_ATTEMPTS)throw error;}
    }
  }
  if(!materialized)throw new Error('후보 생성 결과 없음');
  const {candidate,changedPaths,syntax}=materialized,git=run('git',['rev-parse','HEAD']),sourceCommit=clean(options.sourceCommit||process.env.AUTONOMOUS_RESERVED_SOURCE_COMMIT)||(git.status===0?git.stdout.trim():null);
  const evidence={version:4,candidateOnly:true,selfPromote:false,publicStableModified:false,paidApi:false,model:repairMode==='RULE_PATCH'?null:(options.model??DEFAULT_MODEL),modelTransport:repairMode==='RULE_PATCH'?'NONE':'NDJSON_STREAM_STRUCTURED_SCHEMA',modelTimeoutMs:MODEL_TIMEOUT_MS,modelMaxPredict:MODEL_MAX_PREDICT,modelContextTokens:MODEL_CONTEXT_TOKENS,modelAttempts:attempts,maxModelAttempts:repairMode==='RULE_PATCH'?0:MAX_MODEL_ATTEMPTS,generationFailures:failures,repairMode,rulePatchId,role,browserFailureFeedbackUsed:Boolean(browserFeedback),gameId,sourcePath,candidateId,candidatePath,sourceCommit,goal,responsibilityFiles,diagnosticFocus:diagnostic?{type:diagnostic.type??null,file:diagnostic.file??null,line:diagnostic.line??null,needle:diagnostic.needle??null,relatedFiles:diagnostic.relatedFiles??[]}:null,contextFiles:context.files.map(({path,truncated,originalBytes,preferred,focused})=>({path,truncated,originalBytes,preferred,focused})),contextBytes:context.bytes,changedFiles:changedPaths,summary:candidate.summary,expectedEffect:candidate.expectedEffect,proposedTests:candidate.tests,changeMode:candidate.mode,fileCount:candidate.files.length,editCount:candidate.edits.length,modelNormalization:candidate.normalization,saveKeyValidation:'PASS',syntaxChecks:syntax,generatedAt:new Date().toISOString(),completionAuthority:'INDEPENDENT_QA_AND_JAY'};
  const evidencePath=posix(options.evidencePath||`.autonomous/evidence/${candidateId}.json`);ensureDir(evidencePath);fs.writeFileSync(evidencePath,`${JSON.stringify(evidence,null,2)}\n`,'utf8');return evidence;
}

async function main(){
  const protectedValues=clean(process.env.AUTONOMOUS_PROTECTED_VALUES).split(',').map(clean).filter(Boolean),order=readJson('.autonomous/work-order.json',{}),gameId=process.env.AUTONOMOUS_GAME_ID,feedback=browserFailureFeedback(gameId);
  const evidence=await generateAutonomousCandidate({gameId,sourcePath:process.env.AUTONOMOUS_SOURCE_PATH,goal:process.env.AUTONOMOUS_GOAL,candidateId:process.env.AUTONOMOUS_CANDIDATE_ID,protectedValues,model:process.env.AUTONOMOUS_LOCAL_MODEL||DEFAULT_MODEL,repairMode:process.env.AUTONOMOUS_REPAIR_MODE||order.repairMode||'MODEL',responsibilityFiles:order.responsibilityFiles||[],diagnostic:order.diagnosticTopIssue||null,role:process.env.AUTONOMOUS_DEPARTMENT_ROLE||'',browserFeedback:feedback});console.log(JSON.stringify(evidence,null,2));
}
if(import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(error=>{console.error(error.message);process.exitCode=1;});

export { ALLOWED_EXTENSIONS, MAX_OUTPUT_FILES, MODEL_TIMEOUT_MS, MODEL_MAX_PREDICT, MODEL_CONTEXT_TOKENS, MAX_MODEL_ATTEMPTS, CANDIDATE_SCHEMA };