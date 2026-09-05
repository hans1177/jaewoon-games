// 파일명: assets/vibe-web-runtime-runner.js
// 역할: Vibe Maker가 Web 게임 후보를 격리 실행하고 실제 load/error/runtime 관측 증거를 수집
// 원칙: 소스 수정 없음, 게임 규칙 권한 없음, 브라우저 관측 사실만 반환. Godot 원본 실행을 가장하지 않는다.
const freeze=v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.freeze(v);for(const x of Object.values(v))freeze(x)}return v};
const text=v=>String(v??'').trim();
const token=()=>`vibe-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
const escapeScript=s=>String(s).replace(/<\/script/gi,'<\\/script');

export function createVibeWebRuntimeDocument(html,{runId='',revision=''}={}){
 const id=text(runId)||token(),rev=text(revision),probe=`<script>(function(){const RUN=${JSON.stringify(id)},REV=${JSON.stringify(rev)},send=(type,detail={})=>parent.postMessage({__vibeRuntime:true,runId:RUN,revision:REV,type,detail},'*');window.addEventListener('error',e=>send('error',{message:String(e.message||'runtime error'),source:String(e.filename||''),line:Number(e.lineno||0),column:Number(e.colno||0)}));window.addEventListener('unhandledrejection',e=>send('unhandledrejection',{message:String(e.reason?.message||e.reason||'unhandled rejection')}));document.addEventListener('DOMContentLoaded',()=>send('domcontentloaded',{title:document.title||''}),{once:true});window.addEventListener('load',()=>{requestAnimationFrame(()=>requestAnimationFrame(()=>send('stable-frame',{readyState:document.readyState,canvasCount:document.querySelectorAll('canvas').length,bodyChildren:document.body?.children.length||0})))},{once:true});send('boot',{readyState:document.readyState});})();<\/script>`;
 const source=String(html??'');if(/<head[^>]*>/i.test(source))return source.replace(/<head([^>]*)>/i,`<head$1>${probe}`);return `<!doctype html><html><head>${probe}</head><body>${escapeScript(source)}</body></html>`;
}

export function runVibeWebRuntime({html='',revision='',timeoutMs=5000,mount=null}={}){
 if(typeof document==='undefined'||typeof window==='undefined')throw new Error('browser runtime required');if(!text(revision))throw new Error('runtime revision required');if(!String(html).trim())throw new Error('runtime html required');
 const runId=token(),host=mount||document.body,frame=document.createElement('iframe');frame.setAttribute('sandbox','allow-scripts allow-pointer-lock');frame.setAttribute('aria-hidden','true');frame.style.cssText='position:fixed;width:1px;height:1px;left:-10000px;top:-10000px;border:0;opacity:0;pointer-events:none';
 const events=[],errors=[];let settled=false,timer=null;
 return new Promise(resolve=>{const finish=(reason)=>{if(settled)return;settled=true;clearTimeout(timer);window.removeEventListener('message',onMessage);frame.remove();const stable=events.some(x=>x.type==='stable-frame'),loaded=events.some(x=>x.type==='domcontentloaded'),runtimeObserved=stable&&loaded&&errors.length===0;resolve(freeze({version:1,runId,revision:text(revision),runtimeObserved,loaded,stable,errors:[...errors],events:[...events],reason,runner:'deterministic-vibe-runner',authority:'web-runtime-observation'}))};const onMessage=e=>{const d=e.data;if(!d||d.__vibeRuntime!==true||d.runId!==runId||d.revision!==revision)return;const item={type:text(d.type),detail:d.detail||{}};events.push(item);if(item.type==='error'||item.type==='unhandledrejection')errors.push(item);if(item.type==='stable-frame')finish(errors.length?'runtime-error':'stable-frame')};window.addEventListener('message',onMessage);timer=setTimeout(()=>finish('timeout'),Math.max(250,Number(timeoutMs)||5000));frame.srcdoc=createVibeWebRuntimeDocument(html,{runId,revision});host.appendChild(frame)});
}

export function validateVibeWebRuntimeObservation(observation,{revision=''}={}){
 const exact=observation?.authority==='web-runtime-observation'&&observation?.runner==='deterministic-vibe-runner'&&text(observation.revision)===text(revision)&&Boolean(text(revision));return freeze({valid:exact&&observation.runtimeObserved===true&&Array.isArray(observation.errors)&&observation.errors.length===0,exactRevision:exact,runtimeObserved:exact&&observation.runtimeObserved===true,errorFree:exact&&Array.isArray(observation.errors)&&observation.errors.length===0,runner:exact?observation.runner:'',authority:'web-runtime-observation-validation'});
}

if(typeof window!=='undefined')Object.assign(window,{createJaewoonVibeWebRuntimeDocument:createVibeWebRuntimeDocument,runJaewoonVibeWebRuntime:runVibeWebRuntime,validateJaewoonVibeWebRuntimeObservation:validateVibeWebRuntimeObservation});
