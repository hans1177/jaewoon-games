// 파일명: assets/vibe-web-runtime-runner.js
// 역할: Vibe Maker가 Web 게임 후보를 로컬 리소스까지 묶어 격리 실행하고 실제 런타임 관측 증거를 수집
// 원칙: 소스 수정 없음, 게임 규칙 권한 없음, 브라우저 관측 사실만 반환. Godot 원본 실행을 가장하지 않는다.
const freeze=v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.freeze(v);for(const x of Object.values(v))freeze(x)}return v},text=v=>String(v??'').trim(),token=()=>`vibe-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
// [경로] 작업 공간 밖으로 벗어나는 참조는 조용히 변경하지 않고 거부한다.
const cleanPath=v=>text(v).replace(/\\/g,'/').replace(/^\.\//,'').replace(/\/+/g,'/').replace(/^\//,'');
const dir=p=>{const x=cleanPath(p),i=x.lastIndexOf('/');return i<0?'':x.slice(0,i+1)};
const external=v=>/^(?:[a-z]+:|\/\/|#|data:|blob:)/i.test(text(v));
const resolve=(base,ref)=>{
 const raw=text(ref).split(/[?#]/)[0].replace(/\\/g,'/');
 const parts=raw.startsWith('/')?[]:dir(base).split('/').filter(Boolean);
 for(const part of raw.split('/')){
  if(!part||part==='.')continue;
  if(part==='..'){if(!parts.length)throw new Error('web runtime asset outside workspace: '+ref);parts.pop()}
  else parts.push(part);
 }
 return parts.join('/');
};
const mime=p=>p.endsWith('.css')?'text/css':p.endsWith('.js')||p.endsWith('.mjs')?'text/javascript':p.endsWith('.json')?'application/json':p.endsWith('.svg')?'image/svg+xml':p.endsWith('.png')?'image/png':p.endsWith('.jpg')||p.endsWith('.jpeg')?'image/jpeg':p.endsWith('.webp')?'image/webp':p.endsWith('.gif')?'image/gif':p.endsWith('.woff2')?'font/woff2':p.endsWith('.woff')?'font/woff':p.endsWith('.ttf')?'font/ttf':p.endsWith('.otf')?'font/otf':p.endsWith('.wav')?'audio/wav':p.endsWith('.mp3')?'audio/mpeg':p.endsWith('.ogg')?'audio/ogg':p.endsWith('.mp4')?'video/mp4':'application/octet-stream';
const isTextAsset=p=>/\.(?:css|js|mjs|json|svg|txt)$/i.test(p);

export async function createVibeWebRuntimeBundle(workspace,{entry='index.html'}={}){
 if(!workspace?.read||!workspace?.summary)throw new Error('workspace required');
 const summary=workspace.summary(),files=new Set((summary.files||[]).map(x=>cleanPath(x.path)));
 const entryPath=cleanPath(entry);
 if(!files.has(entryPath))throw new Error('web runtime entry missing: '+entryPath);
 let html=await workspace.read(entryPath);
 const urls=[],cache=new Map(),unsupported=[];
 // [지원 범위] 모듈의 상대 import, srcset, 외부 CSS @import는 확실히 처리하기 전에는 차단한다.
 for(const m of html.matchAll(/<script\b[^>]*\bsrc\s*=\s*(["'])(.*?)\1[^>]*><\/script>/gi)){
  if(!external(m[2])&&/\btype\s*=\s*["']module["']/i.test(m[0]))unsupported.push('module-script:'+m[2]);
 }
 for(const m of html.matchAll(/\bsrcset\s*=\s*(["'])(.*?)\1/gi)){
  if(m[2].split(',').some(row=>!external(row.trim().split(/\s+/)[0])))unsupported.push('srcset:'+m[2]);
 }
 const cssLinks=[...html.matchAll(/<link\b[^>]*>/gi)].filter(m=>/\brel\s*=\s*["']?stylesheet/i.test(m[0]) && /\bhref\s*=\s*(["'])(.*?)\1/i.test(m[0]));
 const makeUrl=async(path)=>{
  const p=cleanPath(path);
  if(cache.has(p))return cache.get(p);
  if(!files.has(p))throw new Error('web runtime resource missing: '+p);
  const source=isTextAsset(p)?await workspace.read(p):await workspace.readBinary?.(p);
  if(source===undefined)throw new Error('web runtime binary reader required: '+p);
  const url=URL.createObjectURL(new Blob([source],{type:mime(p)}));
  urls.push(url);cache.set(p,url);return url;
 };
 try {
  // [CSS] 로컬 폰트/이미지를 먼저 바인딩한 후 스타일시트를 만든다.
  for(const tag of cssLinks){
   const match=tag[0].match(/\bhref\s*=\s*(["'])(.*?)\1/i);
   const ref=match?.[2];
   if(!ref||external(ref))continue;
   const p=resolve(entryPath,ref);
   if(!files.has(p))throw new Error('web runtime stylesheet missing: '+p);
   let css=await workspace.read(p);
   if(/@import\s+(?:url\(\s*)?["']?(?!https?:|data:|\/\/)[^\s"')]/i.test(css))unsupported.push('css-import:'+p);
   for(const item of [...css.matchAll(/url\(\s*(["']?)(.*?)\1\s*\)/gi)]){
    if(external(item[2]))continue;
    const assetUrl=await makeUrl(resolve(p,item[2]));
    css=css.replace(item[0],'url("'+assetUrl+'")');
   }
   const cssUrl=URL.createObjectURL(new Blob([css],{type:'text/css'}));
   urls.push(cssUrl);cache.set(p,cssUrl);
   html=html.replace(tag[0],tag[0].replace(match[0],match[0].replace(ref,cssUrl)));
  }
  // [미디어] 원본 바이너리를 읽기만 하며 게임 에셋을 생성하거나 변경하지 않는다.
  for(const tag of [...html.matchAll(/<(?:img|audio|video|source)\b[^>]*>/gi)]){
   const match=tag[0].match(/\bsrc\s*=\s*(["'])(.*?)\1/i);
   const ref=match?.[2];
   if(!ref||external(ref))continue;
   const url=await makeUrl(resolve(entryPath,ref));
   html=html.replace(tag[0],tag[0].replace(match[0],match[0].replace(ref,url)));
  }
  for(const tag of [...html.matchAll(/<script\b[^>]*\bsrc\s*=\s*(["'])(.*?)\1[^>]*><\/script>/gi)]){
   const match=tag[0].match(/\bsrc\s*=\s*(["'])(.*?)\1/i);
   const ref=match?.[2];
   if(!ref||external(ref))continue;
   const url=await makeUrl(resolve(entryPath,ref));
   html=html.replace(tag[0],tag[0].replace(match[0],match[0].replace(ref,url)));
  }
  // [부가 링크] favicon 등의 로컬 파일 경로도 격리 실행 경로로 전환한다.
  for(const tag of [...html.matchAll(/<link\b[^>]*>/gi)]){
   if(/\brel\s*=\s*["']?stylesheet/i.test(tag[0]))continue;
   const match=tag[0].match(/\bhref\s*=\s*(["'])(.*?)\1/i);
   const ref=match?.[2];
   if(!ref||external(ref))continue;
   unsupported.push('link:'+ref);
  }
  if(unsupported.length)throw new Error('web runtime unsupported local resources: '+[...new Set(unsupported)].join(', '));
  let revoked=false;
  return freeze({version:2,entry:entryPath,html,resourceCount:urls.length,authority:'workspace-web-runtime-bundle',revoke(){
   if(revoked)return;revoked=true;
   for(const url of urls)URL.revokeObjectURL(url);
  }});
 }catch(error){
  for(const url of urls)URL.revokeObjectURL(url);
  throw error;
 }
}

export function createVibeWebRuntimeDocument(html,{runId='',revision=''}={}){const id=text(runId)||token(),rev=text(revision),probe=`<script>(function(){const RUN=${JSON.stringify(id)},REV=${JSON.stringify(rev)},send=(type,detail={})=>parent.postMessage({__vibeRuntime:true,runId:RUN,revision:REV,type,detail},'*');window.addEventListener('error',e=>send('error',{message:String(e.message||'runtime error'),source:String(e.filename||''),line:Number(e.lineno||0),column:Number(e.colno||0)}),true);window.addEventListener('unhandledrejection',e=>send('unhandledrejection',{message:String(e.reason?.message||e.reason||'unhandled rejection')}));document.addEventListener('DOMContentLoaded',()=>send('domcontentloaded',{title:document.title||''}),{once:true});window.addEventListener('load',()=>requestAnimationFrame(()=>requestAnimationFrame(()=>send('stable-frame',{readyState:document.readyState,canvasCount:document.querySelectorAll('canvas').length,bodyChildren:document.body?.children.length||0}))),{once:true});send('boot',{readyState:document.readyState});})();<\/script>`;const source=String(html??'');return /<head[^>]*>/i.test(source)?source.replace(/<head([^>]*)>/i,`<head$1>${probe}`):`<!doctype html><html><head>${probe}</head><body>${source}</body></html>`}
export function runVibeWebRuntime({html='',revision='',timeoutMs=5000,mount=null}={}){if(typeof document==='undefined'||typeof window==='undefined')throw new Error('browser runtime required');if(!text(revision))throw new Error('runtime revision required');if(!String(html).trim())throw new Error('runtime html required');const runId=token(),host=mount||document.body,frame=document.createElement('iframe');frame.setAttribute('sandbox','allow-scripts allow-pointer-lock');frame.setAttribute('aria-hidden','true');frame.style.cssText='position:fixed;width:1px;height:1px;left:-10000px;top:-10000px;border:0;opacity:0;pointer-events:none';const events=[],errors=[];let settled=false,timer=null;return new Promise(resolvePromise=>{const finish=reason=>{if(settled)return;settled=true;clearTimeout(timer);window.removeEventListener('message',onMessage);frame.remove();const stable=events.some(x=>x.type==='stable-frame'),loaded=events.some(x=>x.type==='domcontentloaded'),runtimeObserved=stable&&loaded&&errors.length===0;resolvePromise(freeze({version:1,runId,revision:text(revision),runtimeObserved,loaded,stable,errors:[...errors],events:[...events],reason,runner:'deterministic-vibe-runner',authority:'web-runtime-observation'}))},onMessage=e=>{const d=e.data;if(!d||d.__vibeRuntime!==true||d.runId!==runId||d.revision!==revision)return;const item={type:text(d.type),detail:d.detail||{}};events.push(item);if(item.type==='error'||item.type==='unhandledrejection')errors.push(item);if(item.type==='stable-frame')finish(errors.length?'runtime-error':'stable-frame')};window.addEventListener('message',onMessage);timer=setTimeout(()=>finish('timeout'),Math.max(250,Number(timeoutMs)||5000));frame.srcdoc=createVibeWebRuntimeDocument(html,{runId,revision});host.appendChild(frame)})}
export async function runVibeWorkspaceWebRuntime(workspace,{revision='',entry='index.html',timeoutMs=5000,mount=null}={}){const bundle=await createVibeWebRuntimeBundle(workspace,{entry});try{const observation=await runVibeWebRuntime({html:bundle.html,revision,timeoutMs,mount});return freeze({...observation,entry:bundle.entry,resourceCount:bundle.resourceCount,bundleAuthority:bundle.authority})}finally{bundle.revoke()}}
export function validateVibeWebRuntimeObservation(observation,{revision=''}={}){const exact=observation?.authority==='web-runtime-observation'&&observation?.runner==='deterministic-vibe-runner'&&text(observation.revision)===text(revision)&&Boolean(text(revision));return freeze({valid:exact&&observation.runtimeObserved===true&&Array.isArray(observation.errors)&&observation.errors.length===0,exactRevision:exact,runtimeObserved:exact&&observation.runtimeObserved===true,errorFree:exact&&Array.isArray(observation.errors)&&observation.errors.length===0,runner:exact?observation.runner:'',authority:'web-runtime-observation-validation'})}
if(typeof window!=='undefined')Object.assign(window,{createJaewoonVibeWebRuntimeBundle:createVibeWebRuntimeBundle,createJaewoonVibeWebRuntimeDocument:createVibeWebRuntimeDocument,runJaewoonVibeWebRuntime:runVibeWebRuntime,runJaewoonVibeWorkspaceWebRuntime:runVibeWorkspaceWebRuntime,validateJaewoonVibeWebRuntimeObservation:validateVibeWebRuntimeObservation});
