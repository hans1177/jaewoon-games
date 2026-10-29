// 파일명: tools/vibe2-game-source-index.mjs
// 임포트
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {inspectSourceFunctions,executableText} from './company-vibe2-expert-development.mjs';
export const sourceDigest=text=>crypto.createHash('sha256').update(text).digest('hex');
const fail=code=>{throw Error('VIBE2_SOURCE_INDEX_'+code)};
const ident=/^[A-Za-z_$][\w$]*$/;
export function sourceScopeAt(code,offset,target='web'){
 const stack=[];
 if(target==='web'){
  for(let i=0;i<offset;i++){if(code[i]==='{')stack.push(i);else if(code[i]==='}')stack.pop()}
 }else{
  let pendingDo=0;
  for(const m of code.slice(0,offset).matchAll(/\b(function|if|elseif|for|while|do|repeat|until|end)\b/g)){
   if(m[1]==='elseif')continue;
   if(m[1]==='for'||m[1]==='while'){stack.push(m.index);pendingDo++}
   else if(m[1]==='do'){if(pendingDo)pendingDo--;else stack.push(m.index)}
   else if(m[1]==='end'||m[1]==='until')stack.pop();else stack.push(m.index);
  }
 }
 return stack;
}

// 유틸: 제한된 정적 분석이며 실행·에셋 승인 증거를 만들지 않는다.
export function safeSourceFile(root,relative){
 if(typeof relative!=='string'||!relative||path.isAbsolute(relative)||relative.includes('\\')||
  relative.split('/').some(x=>!x||x==='.'||x==='..'))fail('PATH');
 const base=fs.realpathSync(root),file=path.resolve(base,relative);
 let current=base;
 for(const part of relative.split('/')){
  current=path.join(current,part);if(fs.lstatSync(current).isSymbolicLink())fail('SYMLINK');
 }
 if(!file.startsWith(base+path.sep)||!fs.statSync(file).isFile())fail('PATH');
 if(fs.statSync(file).size>260000)fail('SOURCE_SIZE');
 return file;
}
export function resolveGameSourceScope({repositoryRoot,sourceRoot,gameId,target,catalog}={}){
 const repo=fs.realpathSync(repositoryRoot),game=catalog?.games?.find(g=>g.id===gameId);
 if(!game||catalog.ownerStoppedGameIds?.includes(gameId)||game.ownerDevelopmentStopped||game.lifecycleState==='OWNER_STOPPED')fail('GAME_BLOCKED');
 const relative=target==='web'?game.webPath:target==='roblox'?game.robloxProjectPath:null;
 if(!relative)fail('CATALOG_MAPPING');
 const canonical=String(relative).replace(/^\/+|\/+$/g,'');
 if(!canonical.startsWith(target==='web'?'web-games/':'roblox-games/')||canonical.split('/').includes('..'))fail('CATALOG_MAPPING');
 const approved=path.resolve(repo,canonical),actual=fs.realpathSync(sourceRoot);
 if(!approved.startsWith(repo+path.sep)||actual!==approved||fs.realpathSync(approved)!==approved)fail('ROOT_MISMATCH');
 return {gameId,target,root:actual,relativeRoot:canonical,game};
}

function scriptText(source,html){
 if(!html)return source;
 // HTML inert regions and malformed tags cannot ground edits.
 if(/<(?:template|textarea|noscript|plaintext|xmp)\b/i.test(source))fail('INERT_HTML');
 const withoutComments=source.replace(/<!--[\s\S]*?-->/g,m=>m.replace(/[^\r\n]/g,' '));
 const code=source.split('').map(c=>/[\r\n]/.test(c)?c:' ');
 for(const m of withoutComments.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)){
  const attrs=m[1];
  if(/\bsrc\s*=|\btype\s*=\s*["']?(?!module\b|text\/javascript\b)/i.test(attrs))continue;
  const prefix=withoutComments.slice(0,m.index);
  if(prefix.replace(/<(?:[^<>"']|"[^"]*"|'[^']*')*>/g,'').includes('<'))fail('HTML_TAG');
  const at=m.index+m[0].indexOf('>')+1;
  for(let i=0;i<m[2].length;i++)code[at+i]=source[at+i];
 }
 return code.join('');
}
function lex(source,language){
 const masked=executableText(source,language).split(''),unsupported=[];
 // The reused lexer excludes literals/comments. Mask regex literals as well;
 // interpolated strings remain opaque and are not accepted as edit owners.
 if(language==='javascript'){
  let previous='';
  for(let i=0;i<masked.length;i++){
   const c=masked[i];if(/\s/.test(c))continue;
   if(c==='/'&&(!previous||/[=(:,!&|?;{\[]/.test(previous)||/\b(?:return|throw)\s*$/.test(masked.slice(Math.max(0,i-15),i).join('')))){
    let end=i+1,bracket=false,closed=false;
    for(;end<source.length&&source[end]!=='\n';end++){
     if(source[end]==='\\'){end++;continue}
     if(source[end]==='[')bracket=true;if(source[end]===']')bracket=false;
     if(source[end]==='/'&&!bracket){closed=true;end++;break}
    }
    if(!closed)fail('UNSUPPORTED_REGEX');
    unsupported.push({start:i,end,kind:'regex'});
    for(let j=i;j<end;j++)masked[j]=' ';i=end-1;previous='v';continue;
   }
   previous=c;
  }
 }
 for(const m of source.matchAll(/`(?:\\[\s\S]|[^`])*`/g))unsupported.push({start:m.index,end:m.index+m[0].length,kind:'template'});
 return {code:masked.join(''),unsupported};
}
function closeBrace(code,start){let depth=0;for(let i=start;i<code.length;i++){if(code[i]==='{')depth++;if(code[i]==='}'&&!--depth)return i}return -1}
function evidence(source,file,sha,start,end){
 const head=source.slice(0,start),line=head.split('\n').length,column=start-(head.lastIndexOf('\n')+1)+1;
 return {path:file,sourceSha256:sha,start,end,line,column,parserConfidence:'BOUNDED_LEXICAL'};
}

// 메인: 파일·함수·호출·상태·이벤트·저장 참조를 같은 소스 해시에 연결한다.
export function buildGameSourceIndex({sourceRoot,responsibleFiles=[],target='web',baseRevisionSha=''}={}){
 if(!['web','roblox'].includes(target)||!Array.isArray(responsibleFiles)||!responsibleFiles.length||responsibleFiles.length>32)fail('SCOPE');
 const files=[],symbols=[],edges=[],unresolved=[];
 for(const relative of new Set(responsibleFiles)){
  if(!(target==='web'?/\.(?:html?|[cm]?js)$/i:/\.lua[u]?$/i).test(relative))fail('LANGUAGE');
  const source=fs.readFileSync(safeSourceFile(sourceRoot,relative),'utf8'),sha=sourceDigest(source);
  const language=target==='web'?'javascript':'luau',raw=scriptText(source,/\.html?$/i.test(relative));
  const {code,unsupported}=lex(raw,language);
  // Pass the masked code to the existing block inspector, preserving exact offsets.
  const inspected=inspectSourceFunctions(code,{language,maxFunctions:4096});
  const counts=new Map();
  for(const m of code.matchAll(/\bfunction\s+([A-Za-z_$][\w$]*(?:[.:][A-Za-z_$][\w$]*)*)\s*\(/g))counts.set(m[1],(counts.get(m[1])||0)+1);
  for(const m of code.matchAll(/\b(?:let|const|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>\s*\{/g))counts.set(m[1],(counts.get(m[1])||0)+1);
  for(const fn of inspected){
   const text=code.slice(fn.start,fn.end),header=/\(([^)]*)\)/.exec(text);
   const parameters=(header?.[1]||'').split(',').map(x=>x.trim().split(/[=:]/)[0].trim()).filter(x=>ident.test(x));
   const bodyStart=target==='web'?fn.start+text.indexOf('{')+1:fn.start+header.index+header[0].length;
   const bodyEnd=target==='web'?fn.end-1:fn.end-3;
   const ev=evidence(source,relative,sha,fn.start,fn.end),id=relative+':'+fn.name+':'+fn.start;
   const row={id,name:fn.name,kind:'function',parameters,bodyStart,bodyEnd,...ev,lexicalScope:sourceScopeAt(code,fn.start,target),
    ambiguous:(counts.get(fn.name)||0)>1,
    unsupported:unsupported.filter(r=>r.start>=fn.start&&r.end<=fn.end),
    locals:[...code.slice(bodyStart,bodyEnd).matchAll(/\b(?:let|const|var|local)\s+([A-Za-z_$][\w$]*)/g)].map(m=>m[1])};
   symbols.push(row);
   for(const m of code.slice(bodyStart,bodyEnd).matchAll(/\b([A-Za-z_$][\w$]*(?:[.:][A-Za-z_$][\w$]*)*)\s*\(/g)){
    if(['if','for','while','switch','function'].includes(m[1]))continue;
    const at=bodyStart+m.index+m[0].length,args=/^([^()]*)\)/.exec(code.slice(at));
    const argumentsList=args?args[1].split(',').map(x=>x.trim()).filter(Boolean):[];
    edges.push({kind:'call',from:id,toName:m[1],arguments:argumentsList.every(x=>/^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*$/.test(x))?argumentsList:null,
     ...evidence(source,relative,sha,bodyStart+m.index,bodyStart+m.index+m[0].length)});
   }
   if(target==='web')for(const m of code.slice(bodyStart,bodyEnd).matchAll(/\b([A-Za-z_$][\w$]*)\.forEach\(\s*([A-Za-z_$][\w$]*)\s*=>\s*\{/g)){
    const at=bodyStart+m.index,open=at+m[0].lastIndexOf('{'),end=closeBrace(code,open);
    if(end<0||end>=bodyEnd)continue;
    symbols.push({id:relative+':'+fn.name+'::'+m[2]+':'+at,name:fn.name+'::'+m[2],kind:'callback',
     parent:id,parameters:[m[2]],locals:[],bodyStart:open+1,bodyEnd:end,ambiguous:row.ambiguous,unsupported:[],...evidence(source,relative,sha,at,end+1)});
   }
  }
  const states=[...code.matchAll(/\b([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)+)\s*(?:[+*/%-]?=(?!=)|\+\+|--)/g)].map(m=>({name:m[1],kind:'write',...evidence(source,relative,sha,m.index,m.index+m[1].length)}));
  const fields=[...code.matchAll(/\b([A-Za-z_$][\w$]*)\s*(?::|=)|\.([A-Za-z_$][\w$]*)/g)].map(m=>m[1]||m[2]);
  const storage=[];
  for(const m of raw.matchAll(/(?:localStorage|sessionStorage)\.(?:getItem|setItem|removeItem)\s*\(\s*(['"])([^'"\n]+)\1|GetDataStore\s*\(\s*(['"])([^'"\n]+)\3/g)){
   if(code.slice(m.index,m.index+8).trim())storage.push({key:m[2]||m[4],...evidence(source,relative,sha,m.index,m.index+m[0].length)});
  }
  // [원본 근거] 기존 ReplicatedStorage의 정적 RemoteEvent 참조만 파일·SHA에 연결한다.
  const remotes=[];
  if(target==='roblox'){
   const service=[...raw.matchAll(/\blocal\s+ReplicatedStorage\s*=\s*game:GetService\(\s*(['"])ReplicatedStorage\1\s*\)/g)]
    .filter(m=>code.slice(m.index,m.index+5).trim()==='local'&&sourceScopeAt(code,m.index,'roblox').length===0);
   if(service.length===1){
    for(const m of raw.matchAll(/\blocal\s+([A-Za-z_][\w]*)\s*=\s*ReplicatedStorage:WaitForChild\(\s*(['"])([A-Za-z0-9_-]{1,64})\2\s*\)/g)){
     if(code.slice(m.index,m.index+5).trim()!=='local'||sourceScopeAt(code,m.index,'roblox').length!==0)continue;
     remotes.push({variable:m[1],eventName:m[3],...evidence(source,relative,sha,m.index,m.index+m[0].length)});
    }
   }
  }
  const events=[];
  for(const m of raw.matchAll(/(?:localStorage|sessionStorage)\.(?:getItem|setItem|removeItem)\s*\(\s*([A-Za-z_$][\w$]*)\b/g)){
   if(!code.slice(m.index,m.index+8).trim())continue;
   const keyRef=m[1],definitions=[...raw.matchAll(new RegExp('\\b'+keyRef+'\\s*=\\s*([\x22\x27])([^\x22\x27\\n]+)\\1','g'))]
    .filter(d=>code.slice(d.index,d.index+keyRef.length).trim());
   storage.push({key:definitions.length===1?definitions[0][2]:null,keyRef,
    status:definitions.length===1?'CONSTANT_BOUND':'UNRESOLVED_DYNAMIC_KEY',
    ...evidence(source,relative,sha,m.index,m.index+m[0].length)});
  }
  for(const m of raw.matchAll(/\.addEventListener\(\s*(['"])([^'"\n]+)\1\s*,\s*([A-Za-z_$][\w$]*)\s*\)|\b([A-Za-z_][\w.]*)\.(OnServerEvent|OnClientEvent)\s*:\s*Connect\(\s*([A-Za-z_][\w]*)\s*\)/g)){
   if(code.slice(m.index,m.index+8).trim())events.push({event:m[2]||m[5],handler:m[3]||m[6],...evidence(source,relative,sha,m.index,m.index+m[0].length)});
  }
  files.push({path:relative,sourceSha256:sha,source,code,language,states,fields:[...new Set(fields)],storage,events,remotes});
 }
 for(const symbol of symbols){
  const parents=symbols.filter(s=>s!==symbol&&s.path===symbol.path&&s.start<symbol.start&&s.end>symbol.end).sort((a,b)=>(a.end-a.start)-(b.end-b.start));
  if(parents.length)symbol.parent=parents[0].id;
 }
 for(const edge of edges){const targets=symbols.filter(s=>s.name===edge.toName&&s.path===edge.path);if(targets.length===1&&!targets[0].ambiguous)edge.to=targets[0].id;else edge.unresolved=true}
 for(const symbol of symbols)if(symbol.ambiguous)unresolved.push({code:'AMBIGUOUS_SYMBOL',symbol:symbol.name,path:symbol.path});
 return {schemaVersion:'vibe2-source-index-v1',baseRevisionSha,files,symbols,edges,unresolved,
  digest:sourceDigest(JSON.stringify(files.map(f=>[f.path,f.sourceSha256]))),sourceWrite:false,runtimeVerified:false};
}

// 메인: 기존 이벤트 연결기의 공개 계약도 같은 렉서와 소스 근거에서 직접 작성한다.
export function indexVibe2GameSource({sourceRoot='',gameId='',target='',responsibleFiles=[]}={}){
 if(!['web','roblox'].includes(target)||!Array.isArray(responsibleFiles)||!responsibleFiles.length||responsibleFiles.length>12)fail('SCOPE');
 const root=fs.realpathSync(path.resolve(sourceRoot));if(path.basename(root)!==gameId)fail('GAME_ID');
 for(const relative of responsibleFiles){
  if(typeof relative!=='string'||path.isAbsolute(relative)||relative.includes('\\')||relative.split('/').some(s=>!s||s==='.'||s==='..'))fail('PATH');
  try{safeSourceFile(root,relative)}catch(error){throw Error('VIBE2_SOURCE_INDEX_ESCAPE:'+error.message)}
 }
 const index=buildGameSourceIndex({sourceRoot:root,responsibleFiles,target}),functions=[],unsupported=[];
 const protectedPattern=/\b(?:localStorage|sessionStorage|DataStoreService|GetDataStore|SetAsync|UpdateAsync|RemoveAsync|require\s*\(|eval\s*\()/i;
 for(const file of index.files){
  if(/\.html?$/i.test(file.path)){
   const blocks=[...file.source.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)];
   if(blocks.length!==1||blocks[0][1].trim()){unsupported.push({path:file.path,reason:'HTML_SCRIPT_SCOPE'});continue}
  }
  for(const symbol of index.symbols.filter(s=>s.path===file.path&&s.kind==='function'&&!s.parent)){
   const header=file.code.slice(symbol.start,symbol.bodyStart);
   if(!/^(?:async\s+)?(?:local\s+)?function\b/.test(header))continue;
   const params=/\(([^()]*)\)/.exec(header)?.[1]?.trim();if(params===undefined)continue;
   const bodyCode=file.code.slice(symbol.bodyStart,symbol.bodyEnd),body=file.source.slice(symbol.bodyStart,symbol.bodyEnd);
   // Luau의 구조화된 조건·반복은 기존 중첩 블록 검사기에서 닫는 end를 확인한다.
   // 로컬/익명 중첩 함수는 실행 시점과 스코프를 증명할 수 없으므로 여전히 제외한다.
   if(target==='roblox'&&/\bfunction\b/.test(bodyCode))continue;
   functions.push({name:symbol.name,path:file.path,sourceSha256:file.sourceSha256,
    start:symbol.start,end:symbol.end,bodyStart:symbol.bodyStart,insertOffset:symbol.bodyEnd,
    params,bodyCode,locals:symbol.locals,calls:[...new Set(index.edges.filter(e=>e.from===symbol.id&&e.toName!==symbol.name).map(e=>e.toName))],
    parserConfidence:target==='web'?'BOUNDED_DECLARATION_JS':
      /\b(?:if|for|while|repeat|until|do)\b/.test(bodyCode)?'BOUNDED_NESTED_LUAU':'BOUNDED_LINEAR_LUAU',
    target,lexicalScope:symbol.lexicalScope,
    protectedState:protectedPattern.test(body),
    unsafeControl:/\b(?:return|throw|yield|await|break|continue)\b/.test(bodyCode),
    dynamicScope:/\b(?:eval|with)\s*\(/.test(bodyCode)});
  }
 }
 const counts=new Map();for(const fn of functions)counts.set(fn.name,(counts.get(fn.name)||0)+1);
 const duplicateNames=[...new Set([...index.symbols.filter(s=>s.ambiguous).map(s=>s.name),...[...counts].filter(([,n])=>n>1).map(([n])=>n)])];
 return {gameId,target,sourceRoot:root,files:index.files.map(f=>({path:f.path,sourceSha256:f.sourceSha256,bytes:Buffer.byteLength(f.source)})),
  functions,duplicateNames,edges:functions.flatMap(row=>row.calls.filter(name=>counts.get(name)===1&&!duplicateNames.includes(name))
   .map(name=>({from:row.name,to:name,path:row.path,evidence:'DIRECT_LEXICAL_CALL'}))),unsupported,sourceWrite:false,runtimeVerified:false};
}
