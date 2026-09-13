// 파일명: emergency-ai.js
// 역할: 재운컴퍼니 PWA 비상 AI가 원격 연결 단절을 버티고, 연결 중에는 company-runtime 최신 상태를 Gemini 개발 대화와 오프라인 캐시에 계속 동기화한다.
(()=>{
'use strict';
const CHAT_API='https://njpexgqvituaxrjpnqsi.supabase.co/functions/v1/company-ai-chat';
const API_KEY='sb_publishable_ybAF71npJQz6PJVpnwsQ4g_rsyzlkFQ';
const TOKEN_KEY='jaewoon_command_device_v1';
const GAME_KEY='jaewoon_ai_chat_game_v1';
const QUEUE_KEY='jaewoon_emergency_queue_v1';
const HISTORY_KEY='jaewoon_emergency_history_v1';
const CONTEXT_KEY='jaewoon_emergency_context_v1';
const SYNC_INTERVAL_MS=5000;
const RAW_MAIN_BASE='https://raw.githubusercontent.com/hans1177/jaewoon-games/main';
const RAW_RUNTIME_BASE='https://raw.githubusercontent.com/hans1177/jaewoon-games/company-runtime';
const EXEC_RE=/(진행|수정해|고쳐|만들어|적용해|반영해|개발해|추가해|삭제해|작업해|테스트해|바꿔|넣어|빼줘|해줘|처리해)/;
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let remoteState=navigator.onLine?'checking':'emergency';
let probing=false,replaying=false,contextSyncing=false,lastProbe=0,brandObserver=null;
function readJson(key,fallback){try{const v=JSON.parse(localStorage.getItem(key)||'');return v??fallback;}catch{return fallback;}}
function writeJson(key,value){try{localStorage.setItem(key,JSON.stringify(value));}catch{}}
function queue(){const q=readJson(QUEUE_KEY,[]);return Array.isArray(q)?q:[];}
function history(){const h=readJson(HISTORY_KEY,[]);return Array.isArray(h)?h:[];}
function saveHistory(rows){writeJson(HISTORY_KEY,rows.slice(-80));}
function rowTime(row){const t=Date.parse(row?.createdAt||row?.created_at||'');return Number.isFinite(t)?t:0;}
function isAutomaticModeNotice(row){if(row?.sender==='owner')return false;const body=String(row?.body??'').trim();return row?.kind==='system'||row?.sender==='system'||/^(?:원격 연결이|재연결(?:이|을| 중| 완료)|응[.! ]*비상\s*AI)/.test(body)||/(?:비상\s*AI|비상\s*모드).*(?:연결|전환|복구|작동|저장|전송대기|대기)/.test(body);}
function visibleHistory(){return history().filter(r=>r&&!isAutomaticModeNotice(r)).sort((a,b)=>rowTime(a)-rowTime(b));}
function cleanHistory(){const cleaned=history().filter(r=>r&&!isAutomaticModeNotice(r));if(cleaned.length!==history().length)saveHistory(cleaned);}
function modeLabel(){const n=queue().length;if(remoteState==='online')return `기본 모드${n?` · 대기 ${n}`:''}`;if(remoteState==='checking')return '재연결 중';return `비상 AI 모드${n?` · 대기 ${n}`:''}`;}
function scrollLatest(){if(typeof window.scrollBottom==='function'){window.scrollBottom();return;}const chat=$('chat');if(chat)requestAnimationFrame(()=>{chat.scrollTop=chat.scrollHeight;});}
function ensureUi(){
  $('networkMode')?.remove();
  $('scrollToBottomBtn')?.remove();
  $('gptEmergencyStyle')?.remove();
  if(!$('emergencyHistory')){const box=document.createElement('div');box.id='emergencyHistory';$('chat')?.appendChild(box);}
  const brand=$('brand');if(brand&&!brandObserver){brandObserver=new MutationObserver(()=>{const wanted=modeLabel();if(brand.textContent!==wanted)brand.textContent=wanted;});brandObserver.observe(brand,{childList:true,characterData:true,subtree:true});}
  cleanHistory();renderEmergencyHistory();updateModeUi();
}
function updateModeUi(){const brand=$('brand');if(!brand)return;const wanted=modeLabel();if(brand.textContent!==wanted)brand.textContent=wanted;brand.dataset.mode=remoteState;}
function currentGame(){return localStorage.getItem(GAME_KEY)||'';}
function currentGameName(){const id=currentGame();if(!id)return'회사 공통';const btn=document.querySelector(`.gameItem[data-game="${CSS.escape(id)}"] .gameName`);return btn?.textContent?.trim()||id;}
function addLocal(sender,body,kind='chat'){const rows=history();rows.push({id:crypto.randomUUID(),sender,body:String(body).slice(0,3000),kind,gameId:currentGame(),gameName:currentGameName(),createdAt:new Date().toISOString()});saveHistory(rows);renderEmergencyHistory();}
function renderEmergencyHistory(){const box=$('emergencyHistory');if(!box)return;const rows=visibleHistory();if(!rows.length){box.innerHTML='';return;}box.innerHTML='<div class="group">'+rows.map(r=>`<div class="${r.sender==='owner'?'bubble owner':'bubble company ai'}">${esc(r.body)}</div>`).join('')+'</div>';scrollLatest();}
function clearLocalHistory(){saveHistory([]);const box=$('emergencyHistory');if(box)box.innerHTML='';}
function cachedContext(){return readJson(CONTEXT_KEY,{catalog:null,status:null,companyContext:null,savedAt:''});}
function compactCurrentStatus(){const ctx=cachedContext(),id=currentGame();const games=Array.isArray(ctx?.catalog?.games)?ctx.catalog.games:[];const g=id?games.find(x=>x?.id===id):null;if(g)return `${g.name||id} · ${g.homepageStage||g.productionTarget||'상태 정보 있음'}`;const focus=ctx?.status?.operations?.autonomousFocus?.games;const f=Array.isArray(focus)&&focus.length?focus[0]:null;if(f)return `현재 집중개발: ${f.name||f.slug||f.gameId}${f.lane?` · ${f.lane}`:''}`;return id?`${currentGameName()} 선택됨`:'마지막 온라인 게임 상태 캐시가 아직 없어.';}
function localReply(text){const qn=queue().length;if(EXEC_RE.test(text))return `지시 저장했어. 연결되면 Vibe2로 자동 전달할게.${qn?` 대기 ${qn}건.`:''}`;if(/(차단|공격|연결|인터넷|네트워크|왜.*안|먹통)/.test(text))return '원격 서버 연결이 안 돼 있어. 여기서 계속 말하면 이 기기에 저장하고 연결되면 이어서 전달할게.';if(/(현재|지금|개발.*게임|게임.*상태|뭐.*개발|어떤.*게임)/.test(text))return `${compactCurrentStatus()} 마지막 온라인 상태 기준이야.`;if(/(대기|큐|보낸.*지시|저장)/.test(text))return qn?`Vibe2 전송 대기 ${qn}건 있어.`:'전송 대기 지시는 없어.';if(/^(안녕|야|뭐해|있어|대답|응답)/.test(text.trim()))return '응. 말해줘.';return '계속 말해줘. 필요한 개발 지시는 이 기기에 저장해둘게.';}
function enqueueDirective(text){const q=queue();q.push({id:crypto.randomUUID(),text:String(text).slice(0,3000),gameId:currentGame(),priority:$('priority')?.value||'normal',createdAt:new Date().toISOString()});writeJson(QUEUE_KEY,q.slice(-30));updateModeUi();}
function emergencySend(event){if(remoteState==='online')return;const body=$('body');if(!body)return;const text=body.value.trim();if(!text)return;event?.preventDefault?.();event?.stopImmediatePropagation?.();body.value='';body.dispatchEvent(new Event('input',{bubbles:true}));addLocal('owner',text);if(EXEC_RE.test(text))enqueueDirective(text);addLocal('ai',localReply(text));scrollLatest();}
async function fetchFreshJson(path){const stamp=Date.now();const urls=[`${RAW_RUNTIME_BASE}${path}`,`${RAW_MAIN_BASE}${path}`,path];for(const base of urls){try{const join=base.includes('?')?'&':'?';const response=await fetch(`${base}${join}sync=${stamp}`,{cache:'no-store'});if(response.ok)return await response.json();}catch{}}return null;}
function buildCompanyContext(catalog,status){const games=Array.isArray(catalog?.games)?catalog.games:[];const compact=games.map(g=>({id:String(g?.id||''),name:String(g?.name||''),category:String(g?.homepageCategory||''),stage:String(g?.homepageStage||''),target:String(g?.productionTarget||''),recent:String(g?.homepageRecentWork||'')}));const focus=Array.isArray(status?.operations?.autonomousFocus?.games)?status.operations.autonomousFocus.games.map(g=>({id:String(g.slug||g.gameId||''),name:String(g.name||''),stage:String(g.lane||''),role:String(g.slotRole||'')})):[];return{updatedAt:String(status?.updatedAt||catalog?.updatedAt||''),focused:focus,releaseConfirmed:compact.filter(g=>g.category==='release-confirmed'),developmentConfirmed:compact.filter(g=>g.category==='development-confirmed'),projects:Array.isArray(status?.projects)?status.projects.slice(0,8).map(p=>({id:String(p.gameId||''),name:String(p.name||''),stage:String(p.stageLabel||p.stage||''),progress:Number(p.progress||0),target:String(p.target||'')})):[],games:compact};}
function applyCompanyContext(next){try{if(typeof companyContext!=='undefined')companyContext=next;}catch{}}
async function cacheContext(){if(remoteState!=='online'||contextSyncing)return;contextSyncing=true;try{const [catalog,status]=await Promise.all([fetchFreshJson('/game-catalog.json'),fetchFreshJson('/company-status.json')]);if(!catalog||!status)return;const next=buildCompanyContext(catalog,status);applyCompanyContext(next);writeJson(CONTEXT_KEY,{catalog,status,companyContext:next,savedAt:new Date().toISOString()});}catch{}finally{contextSyncing=false;}}
async function probe(force=false){const now=Date.now();if(probing||(!force&&now-lastProbe<8000))return;lastProbe=now;if(!navigator.onLine){setState('emergency');return;}const token=localStorage.getItem(TOKEN_KEY)||'';if(!token){setState('online');cacheContext();return;}probing=true;const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),3500);if(remoteState!=='emergency'){remoteState='checking';updateModeUi();}try{const res=await fetch(CHAT_API,{method:'POST',headers:{'Content-Type':'application/json','apikey':API_KEY,'x-jaewoon-device':token},body:'{"action":"status"}',cache:'no-store',signal:controller.signal});const contentType=res.headers.get('content-type')||'';const data=res.ok&&contentType.includes('application/json')?await res.json().catch(()=>null):null;if(!res.ok||!data||data.ok!==true){setState('emergency');return;}setState('online');cacheContext();}catch{setState('emergency');}finally{clearTimeout(timer);probing=false;}}
function setState(next){remoteState=next;updateModeUi();if(next==='online'){cacheContext();if(queue().length)flushQueue();else clearLocalHistory();}}
async function waitOriginalSend(){const started=Date.now();while(Date.now()-started<15000){await new Promise(r=>setTimeout(r,350));const pending=document.querySelector('.pendingAi');const err=$('runtimeError');if(!pending){if(err&&!err.hidden&&err.textContent.trim())return false;return true;}}return false;}
async function flushQueue(){if(replaying||remoteState!=='online'||!queue().length||document.hidden)return;const body=$('body');if(!body||body.value.trim()||document.querySelector('.pendingAi')||document.querySelector('#attachTray')?.children.length)return;replaying=true;updateModeUi();try{while(remoteState==='online'){const q=queue();if(!q.length)break;await cacheContext();const item=q[0];if(item.gameId){const game=document.querySelector(`.gameItem[data-game="${CSS.escape(item.gameId)}"]`);game?.click();}const priority=$('priority');if(priority)priority.value=item.priority||'normal';body.value=item.text;body.dispatchEvent(new Event('input',{bubbles:true}));$('sendBtn')?.click();const ok=await waitOriginalSend();if(!ok){setState('emergency');break;}const latest=queue();if(latest[0]?.id===item.id){latest.shift();writeJson(QUEUE_KEY,latest);}updateModeUi();await new Promise(r=>setTimeout(r,500));}if(remoteState==='online'&&!queue().length)clearLocalHistory();}finally{replaying=false;updateModeUi();}}
function installCapture(){$('sendBtn')?.addEventListener('pointerdown',()=>{if(remoteState==='online')cacheContext();},{passive:true,capture:true});$('sendBtn')?.addEventListener('click',e=>emergencySend(e),true);$('body')?.addEventListener('focus',()=>{if(remoteState==='online')cacheContext();},{passive:true,capture:true});$('body')?.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&remoteState!=='online')emergencySend(e);},true);}
function boot(){ensureUi();installCapture();probe(true);setInterval(()=>probe(false),10000);setInterval(()=>{if(remoteState==='online'){cacheContext();flushQueue();}},SYNC_INTERVAL_MS);window.addEventListener('online',()=>probe(true));window.addEventListener('focus',()=>{if(remoteState==='online')cacheContext();});window.addEventListener('offline',()=>setState('emergency'));document.addEventListener('visibilitychange',()=>{if(!document.hidden){probe(true);if(remoteState==='online')cacheContext();}});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
